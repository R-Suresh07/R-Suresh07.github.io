import { lstatSync, readdirSync, realpathSync, rmdirSync, unlinkSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectFragmentData } from './fragment-data.mjs';

const root = realpathSync(fileURLToPath(new URL('../../tasks', import.meta.url)));
const apply = process.argv.includes('--apply');
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/prune-fragments.mjs [--apply]');
const { keep } = collectFragmentData(root);
let retainedBytes = 0, removedBytes = 0, removedFiles = 0;
// Validate all targets before deleting any files. Never follow links outside tasks/.
const files = [], directories = [];
function inspect(directory) {
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    if (!path.startsWith(root + sep)) throw new Error('Unsafe cleanup target.');
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Remove symbolic links from tasks/ before pruning.');
    if (stat.isDirectory()) { inspect(path); directories.push(path); }
    else if (stat.isFile()) {
      const logical = path.slice(root.length + 1).split(sep).join('/');
      if (keep.has(logical)) retainedBytes += stat.size;
      else { files.push(path); removedBytes += stat.size; removedFiles++; }
    }
  }
}
inspect(root);
if (apply) {
  for (const path of files) unlinkSync(path);
  for (const path of directories) if (readdirSync(path).length === 0) rmdirSync(path);
}
console.log(JSON.stringify({ applied: apply, retainedFiles: keep.size, removedFiles, retainedBytes, removedBytes }, null, 2));
