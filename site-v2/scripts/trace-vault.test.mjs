import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import ts from 'typescript';
import { packVault } from './encrypt-traces.mjs';
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
