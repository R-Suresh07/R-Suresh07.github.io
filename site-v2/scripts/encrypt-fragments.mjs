import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { collectFragmentData } from './fragment-data.mjs';
import { packVault, promptPassword } from './encrypt-traces.mjs';

export function packFragments(source, destination, password) {
  return packVault(source, destination, password, { collection: collectFragmentData(source) });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--generate-password', '--use-local-password'].includes(arg))) throw new Error('Usage: npm run fragments:encrypt [-- --generate-password | --use-local-password]');
  const project = fileURLToPath(new URL('../', import.meta.url));
  const source = resolve(project, '../tasks');
  const collection = collectFragmentData(source);
  const passwordFile = join(project, 'private/fragments-password.txt');
  mkdirSync(join(project, 'private'), { recursive: true });
  let password;
  if (args.includes('--generate-password')) {
    password = randomBytes(32).toString('base64url');
    writeFileSync(passwordFile, password + '\n', { flag: 'wx', mode: 0o600 });
  } else if (args.includes('--use-local-password')) password = readFileSync(passwordFile, 'utf8').replace(/\r?\n$/, '');
  else {
    password = await promptPassword('Fragment vault password (hidden, at least 20 characters): ');
    if (password !== await promptPassword('Confirm password: ')) throw new Error('Passwords do not match.');
  }
  const result = packVault(source, join(project, 'public/fragment-vault'), password, { collection });
  if (!args.length && existsSync(passwordFile)) writeFileSync(passwordFile, password + '\n', { mode: 0o600 });
  console.log(`Encrypted ${result.traces} fragment traces and ${result.files} essential files (${Math.round(result.encryptedBytes / 1024 / 1024)} MiB) into public/fragment-vault/.`);
  if (args.includes('--generate-password')) console.log('Password saved to private/fragments-password.txt (Git-ignored).');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
