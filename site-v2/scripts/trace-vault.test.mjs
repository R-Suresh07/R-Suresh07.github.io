import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import ts from 'typescript';
import { packVault } from './encrypt-traces.mjs';
import { packFragments } from './encrypt-fragments.mjs';
import { RUNS } from './local-fragment-traces.mjs';
import { checkTracePrivacy } from './check-trace-privacy.mjs';

const compiled = ts.transpileModule(readFileSync(new URL('../src/lib/trace-vault.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { deriveVaultKey, decryptVaultBytes, unlockVault } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const buffer = bytes => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

test('encrypted archive interoperates with Web Crypto and rejects invalid access', async t => {
  const temporary = mkdtempSync(join(tmpdir(), 'trace-vault-test-'));
  const source = join(temporary, 'source'), output = join(temporary, 'published/trace-vault');
  const password = 'a randomly generated test password 123456789';
  const run = 'fixture-run', id = 'smdd_002_TEST_0';
  const write = (path, value) => { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, value); };
  const rows = events => events.map(e => JSON.stringify(e)).join('\n');
  write(join(source, 'agent_summary.json'), JSON.stringify({ run_name: run }));
  write(join(source, id, 'agent_result.json'), JSON.stringify({ model: 'test model', status: 'submitted', turns_used: 1, boltz_calls: 0, runtime_seconds: 1 }));
  write(join(source, id, 'trajectory.jsonl'), rows([{ event: 'llm_call', turn: 1, assistant_text: 'Private model content' }, { event: 'tool_call', turn: 1, call_id: 'T001', tool: 'python', output_truncated: 'short' }, { event: 'submit', turn: 1, content: '1,2,3,Donor' }]));
  write(join(source, id, '.harness/tool_history.jsonl'), rows([{ call_id: 'T001', status: 'success', raw_result: 'full private output', artifacts: [{ artifact_id: 'A001', export_path: 'image.png' }] }]));
  write(join(source, id, 'image.png'), Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]));
  write(join(source, id, 'same-image.png'), Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]));
  write(join(source, id, 'large-prediction.npz'), Buffer.from([0, 1, 2]));
  write(join(source, `${run}-eval`, id, 'result.json'), JSON.stringify({ task_id: id, status: 'passed', steps: [{ name: '3D Pharmacophore Match', result: 1, condition: { eq: 1 }, status: 'passed', duration_s: .1 }] }));
  try {
    const result = packVault(source, output, password);
    const descriptor = result.descriptor;
    assert.equal(result.traces, 1);
    assert(readdirSync(output).every(name => name === 'vault.json' || /^[a-f0-9]{32}\.enc$/.test(name)));
    const key = await deriveVaultKey(password, descriptor);
    assert.equal(key.extractable, false);
    const cipher = readFileSync(join(output, descriptor.manifest));
    const manifest = JSON.parse(new TextDecoder().decode(await decryptVaultBytes(buffer(cipher), key, descriptor.manifest)));
    assert.equal(manifest.traces[0].evaluation.matched, 3);
    assert.equal(result.localOnlyFiles, 1);
    assert.equal(manifest.files[`${id}/large-prediction.npz`], undefined);
    assert.match(manifest.omitted[`${id}/large-prediction.npz`], /Local only/);
    assert.equal(manifest.files[`${id}/image.png`].file, manifest.files[`${id}/same-image.png`].file);
    const events = JSON.parse(new TextDecoder().decode(await decryptVaultBytes(buffer(readFileSync(join(output, manifest.traces[0].entry))), key, manifest.traces[0].entry)));
    assert.equal(events.find(e => e.event === 'tool_call').output, 'full private output');
    assert.equal(events.find(e => e.event === 'evaluation').status, 'passed');
    const wrong = await deriveVaultKey('a completely different password 987654321', descriptor);
    await assert.rejects(decryptVaultBytes(buffer(cipher), wrong, descriptor.manifest));
    for (const index of [0, 14, cipher.length - 1]) {
      const changed = Buffer.from(cipher); changed[index] ^= 1;
      await assert.rejects(decryptVaultBytes(buffer(changed), key, descriptor.manifest));
    }
    await assert.rejects(decryptVaultBytes(buffer(cipher), key, 'a'.repeat(32) + '.enc'));
    await assert.rejects(decryptVaultBytes(buffer(cipher), key, '../escape.enc'));
    await assert.rejects(deriveVaultKey(password, { ...descriptor, iterations: 1 }));
    await assert.rejects(deriveVaultKey(password, { ...descriptor, iterations: 2_000_001 }));
    let imageFetches = 0;
    const imageName = manifest.files[`${id}/image.png`].file;
    t.mock.method(globalThis, 'fetch', async url => {
      const name = String(url).split('/').pop();
      if (name === imageName) imageFetches++;
      return new Response(readFileSync(join(output, name)), { status: 200 });
    });
    const vault = await unlockVault(password, '/encrypted');
    assert.equal(imageFetches, 0, 'unlock must not fetch image assets');
    const url = await vault.fileUrl(`${id}/image.png`);
    assert(url.startsWith('blob:')); assert.equal(imageFetches, 1);
    assert.equal(await vault.fileUrl(`${id}/image.png`), url); assert.equal(imageFetches, 1);
    assert.deepEqual(Buffer.from(await (await fetchBlob(url)).arrayBuffer()), Buffer.from([137, 80, 78, 71, 0, 1, 2, 3]));
    vault.dispose(); assert.equal(vault.manifest.traces.length, 0);
    await assert.rejects(vault.fileUrl(`${id}/image.png`));
    await assert.rejects(vault.bytes(descriptor.manifest));
    await assert.rejects(fetchBlob(url));
    await assert.rejects(unlockVault('wrong password that is long enough', '/encrypted'), /incorrect/);
    t.mock.restoreAll();
    checkTracePrivacy(join(temporary, 'published'));
    write(join(temporary, 'published/data/smdd', run, 'trajectory.jsonl'), '{}');
    assert.throws(() => checkTracePrivacy(join(temporary, 'published')), /Plaintext/);
    const again = packVault(source, output, password);
    assert.notEqual(again.descriptor.salt, descriptor.salt);
    assert.notEqual(again.descriptor.manifest, descriptor.manifest);
    assert.equal(readdirSync(output).includes(descriptor.manifest), false, 'repack replaces old public ciphertext');
  } finally {
    t.mock.restoreAll();
    if (!resolve(temporary).startsWith(resolve(tmpdir()) + sep) || !temporary.split(sep).pop().startsWith('trace-vault-test-')) throw new Error('Unsafe temporary cleanup');
    rmSync(temporary, { recursive: true, force: true });
  }
});
// Retain the native blob fetch implementation before mocking network requests.
const fetchBlob = globalThis.fetch.bind(globalThis);

test('fragment vault preserves both runs, images, full observations and evaluations while excluding prediction files', async () => {
  const temporary = mkdtempSync(join(tmpdir(), 'trace-vault-test-'));
  const source = join(temporary, 'tasks'), output = join(temporary, 'public/fragment-vault');
  const password = 'a random fragment test password 123456789';
  const write = (path, value) => { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, value); };
  try {
    for (const config of RUNS) {
      const tasks = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`smdd_005_TEST_${index}`, {}]));
      write(join(source, config.run, 'agent_summary.json'), JSON.stringify({ tasks }));
      for (const id of Object.keys(tasks)) {
        const folder = join(source, config.run, id);
        write(join(folder, 'agent_result.json'), JSON.stringify({ status: 'submitted', submitted_file: 'solution.smi' }));
        write(join(folder, 'trajectory.jsonl'), [{ event: 'tool_call', call_id: 'T001', output_truncated: 'short' }, { event: 'submit' }].map(e => JSON.stringify(e)).join('\n'));
        write(join(folder, '.harness/tool_history.jsonl'), JSON.stringify({ call_id: 'T001', raw_result: 'complete observation with affinity score', artifacts: [{ export_path: 'render.png' }, { export_path: 'prediction.cif' }, { export_path: 'affinity.json' }, { export_path: '../outside.png' }] }));
        write(join(folder, 'solution.smi'), 'CCO');
        write(join(folder, 'render.png'), Buffer.from([137, 80, 78, 71]));
        write(join(folder, 'prediction.cif'), 'unused structure');
        write(join(folder, 'affinity.json'), '{"unused":true}');
        write(join(source, `eval-${config.run}`, id, 'result.json'), JSON.stringify({ status: 'passed', steps: [] }));
      }
    }
    const result = packFragments(source, output, password);
    assert.equal(result.traces, 120);
    const key = await deriveVaultKey(password, result.descriptor);
    const decrypt = async name => JSON.parse(new TextDecoder().decode(await decryptVaultBytes(buffer(readFileSync(join(output, name))), key, name)));
    const manifest = await decrypt(result.descriptor.manifest);
    assert.equal(new Set(manifest.traces.map(t => t.handle)).size, 120);
    assert.deepEqual(new Set(manifest.traces.map(t => t.variant)), new Set(['images', 'noimages']));
    assert(Object.keys(manifest.files).every(path => !/\.(cif|npz)$|affinity\.json$/.test(path)));
    for (const trace of manifest.traces) {
      const events = await decrypt(trace.entry);
      assert.equal(events[0].output, 'complete observation with affinity score');
      assert.deepEqual(events[0].artifacts.map(a => a.available), [true, false, false, false]);
      assert.equal(events[1].content, 'CCO');
      assert.equal(events[2].event, 'evaluation');
      assert(manifest.files[`${trace.path}/render.png`]);
      assert(manifest.files[trace.submittedPath]);
    }
    checkTracePrivacy(join(temporary, 'public'));
    write(join(output, 'leaked.txt'), 'plaintext');
    assert.throws(() => checkTracePrivacy(join(temporary, 'public')), /Unexpected file/);
  } finally {
    if (!resolve(temporary).startsWith(resolve(tmpdir()) + sep) || !temporary.split(sep).pop().startsWith('trace-vault-test-')) throw new Error('Unsafe temporary cleanup');
    rmSync(temporary, { recursive: true, force: true });
  }
});
