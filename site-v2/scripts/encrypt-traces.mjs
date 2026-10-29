import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

export const ITERATIONS = 600_000;
const project = fileURLToPath(new URL('../', import.meta.url));
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const jsonl = path => readFileSync(path, 'utf8').split(/\r?\n/).filter(x => x.trim()).map(x => JSON.parse(x));
const mime = path => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.jsonl': 'application/x-ndjson', '.csv': 'text/csv', '.md': 'text/plain', '.py': 'text/plain' }[path.slice(path.lastIndexOf('.'))] ?? 'application/octet-stream');

export function encryptBytes(bytes, key, filename) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(`trace-vault:v1:${filename}`));
  return Buffer.concat([nonce, cipher.update(gzipSync(bytes)), cipher.final(), cipher.getAuthTag()]);
}

export function packVault(source, destination, password, { progress = () => {} } = {}) {
  source = resolve(source); destination = resolve(destination);
  const run = json(join(source, 'agent_summary.json')).run_name;
  if (typeof run !== 'string' || !/^[A-Za-z0-9_-]+$/.test(run)) throw new Error('Source run_name must be a safe directory name.');
  if (password.length < 20) throw new Error('Use a password of at least 20 characters.');
  if (destination === source || destination.startsWith(source + sep) || source.startsWith(destination + sep)) throw new Error('Source and output must be separate directories.');
  const stage = join(dirname(destination), `.vault-stage-${randomBytes(12).toString('hex')}`);
  const backup = join(dirname(destination), `.vault-backup-${randomBytes(12).toString('hex')}`);
  // Only these fresh, explicitly resolved output directories may be removed.
  const discard = path => {
    if (![stage, backup].includes(path) || !resolve(path).startsWith(dirname(destination) + sep)) throw new Error('Unsafe cleanup path');
    rmSync(path, { recursive: true, force: true });
  };
  if (existsSync(destination) && readdirSync(destination).some(name => name !== 'vault.json' && !/^[a-f0-9]{32}\.enc$/.test(name))) throw new Error('Output directory contains files not owned by the encryption script.');
  mkdirSync(stage, { recursive: true });
  const salt = randomBytes(16);
  const key = pbkdf2Sync(password.normalize('NFC'), salt, ITERATIONS, 32, 'sha256');
  const files = {}, omitted = {}, dedup = new Map();
  let count = 0, plaintextBytes = 0, encryptedBytes = 0;
  function store(bytes) {
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (dedup.has(digest)) return dedup.get(digest);
    const filename = `${randomBytes(16).toString('hex')}.enc`;
    const encrypted = encryptBytes(bytes, key, filename);
    writeFileSync(join(stage, filename), encrypted);
    dedup.set(digest, filename); encryptedBytes += encrypted.length;
    return filename;
  }
  function walk(directory) {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error('Plaintext source must not contain symbolic links.');
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) {
        const logical = relative(source, path).split(sep).join('/');
        // Boltz's already-compressed numeric arrays exceed Pages' storage budget.
        // Preserve the source locally and report the omission inside the vault.
        if (logical.endsWith('.npz')) { omitted[logical] = 'Local only: binary prediction array excluded from the GitHub Pages package.'; continue; }
        const bytes = readFileSync(path);
        files[logical] = { file: store(bytes), mime: mime(logical) };
        plaintextBytes += bytes.length; count++;
        if (count % 1000 === 0) progress(`Encrypted ${count} source files…`);
      }
    }
  }
  try {
    walk(source);
    const traces = [];
    for (const id of readdirSync(source).filter(id => existsSync(join(source, id, 'trajectory.jsonl')))) {
      const path = join(source, id);
      const evaluationPath = join(source, `${run}-eval`, id, 'result.json');
      let evaluation = null;
      if (existsSync(evaluationPath)) {
        const result = json(evaluationPath);
        const match = result.steps.find(step => step.name === '3D Pharmacophore Match');
        const matched = typeof match?.result === 'number' ? Math.round(match.result * 3) : null;
        evaluation = { ...result, matched, tone: result.status === 'passed' ? 'passed' : matched && matched > 0 ? 'partial' : 'failed' };
      }
      const history = new Map(jsonl(join(path, '.harness/tool_history.jsonl')).map(call => [call.call_id, call]));
      const events = jsonl(join(path, 'trajectory.jsonl')).map(event => {
        if (event.event !== 'tool_call') return event;
        const full = history.get(event.call_id);
        return { ...event, status: full?.status, output: full?.raw_result ?? full?.result ?? event.output_truncated,
          output_bounded: full ? full.raw_result_bounded : true,
          artifacts: (full?.artifacts ?? []).filter(a => a.export_path && !a.export_path.split('/').includes('..')).map(a => ({ ...a, available: Boolean(files[`${id}/${a.export_path}`]), unavailable_reason: omitted[`${id}/${a.export_path}`] })),
        };
      });
      if (evaluation) events.push({ ...evaluation, event: 'evaluation' });
      traces.push({ id, accession: id.split('_')[2], ...json(join(path, 'agent_result.json')), evaluation,
        handle: randomBytes(16).toString('hex'), entry: store(Buffer.from(JSON.stringify(events))) });
    }
    const manifest = store(Buffer.from(JSON.stringify({ version: 1, run, files, omitted, traces })));
    const descriptor = { version: 1, cipher: 'AES-GCM', compression: 'gzip', kdf: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt: salt.toString('base64'), manifest };
    writeFileSync(join(stage, 'vault.json'), JSON.stringify(descriptor));
    if (encryptedBytes > 800 * 1024 * 1024) throw new Error('Encrypted vault exceeds the 800 MiB budget reserved for traces on GitHub Pages.');
    if (existsSync(destination)) renameSync(destination, backup);
    try { renameSync(stage, destination); } catch (error) { if (existsSync(backup)) renameSync(backup, destination); throw error; }
    discard(backup);
    return { descriptor, files: count, localOnlyFiles: Object.keys(omitted).length, traces: traces.length, plaintextBytes, encryptedBytes, uniqueFiles: dedup.size };
  } finally { key.fill(0); discard(stage); }
}

async function promptPassword(label) {
  if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal, or use --generate-password for the initial package.');
  const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const prompt = createInterface({ input: process.stdin, output: silent, terminal: true });
  process.stdout.write(label);
  try { return await prompt.question(''); } finally { prompt.close(); process.stdout.write('\n'); }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--generate-password', '--use-local-password'].includes(arg)) || args.length > 1) throw new Error('Usage: npm run traces:encrypt [-- --generate-password | --use-local-password]');
  const source = join(project, 'private/traces'), destination = join(project, 'public/trace-vault');
  const passwordFile = join(project, 'private/traces-password.txt');
  if (!existsSync(source)) throw new Error('Plaintext source is missing. Restore the run folder contents under private/traces/ first.');
  let password;
  if (args.includes('--generate-password')) {
    password = randomBytes(32).toString('base64url');
    writeFileSync(passwordFile, password + '\n', { flag: 'wx', mode: 0o600 });
  } else if (args.includes('--use-local-password')) password = readFileSync(passwordFile, 'utf8').replace(/\r?\n$/, '');
  else {
    password = await promptPassword('New vault password (hidden, at least 20 characters): ');
    if (password !== await promptPassword('Confirm password: ')) throw new Error('Passwords do not match.');
  }
  const result = packVault(source, destination, password, { progress: console.log });
  console.log(`Encrypted ${result.traces} traces and ${result.files} files into ${result.uniqueFiles} opaque files (${Math.round(result.encryptedBytes / 1024 / 1024)} MiB).`);
  if (result.localOnlyFiles) console.log(`Retained ${result.localOnlyFiles} binary prediction arrays locally; their links are marked local-only in the viewer.`);
  if (args.includes('--generate-password')) console.log('Initial password saved locally to private/traces-password.txt (Git-ignored).');
  else if (!args.includes('--use-local-password') && existsSync(passwordFile)) {
    writeFileSync(passwordFile, password + '\n', { mode: 0o600 });
    console.log('Updated the ignored local password file.');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
