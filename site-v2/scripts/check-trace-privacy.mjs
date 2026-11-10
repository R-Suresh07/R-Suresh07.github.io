import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function checkTracePrivacy(root) {
  for (const name of ['trace-vault', 'fragment-vault']) {
    const vault = join(root, name);
    if (existsSync(vault)) {
      for (const name of readdirSync(vault)) if (name !== 'vault.json' && !/^[a-f0-9]{32}\.enc$/.test(name)) throw new Error('Unexpected file in public trace vault.');
      const config = JSON.parse(readFileSync(join(vault, 'vault.json'), 'utf8'));
      if (config.version !== 1 || config.cipher !== 'AES-GCM' || config.kdf !== 'PBKDF2' || config.iterations < 600000 || !/^[a-f0-9]{32}\.enc$/.test(config.manifest) || !existsSync(join(vault, config.manifest))) throw new Error('Invalid trace vault descriptor.');
    }
  }
  const routes = join(root, 'traces/ipd');
  if (existsSync(routes) && readdirSync(routes).some(name => name !== 'index.html')) throw new Error('Unexpected plaintext trace route in build output.');
  function scan(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path);
      else if (/\.jsonl$/i.test(entry.name) || ['agent_summary.json', 'agent_result.json', 'transcript.md', 'scratchpad.md', 'traces-password.txt', 'fragments-password.txt'].includes(entry.name)) throw new Error('Plaintext trace file is in the publishing directory. Move it to private/ before building.');
      else if (/\.(html|json|js|mjs|jsonl|csv|md|txt)$/i.test(entry.name) && !entry.name.endsWith('.map')) {
        const text = readFileSync(path, 'utf8');
        if (/"event"\s*:\s*"(?:llm_call|tool_call|system_prompt)"/.test(text)) throw new Error('Private trace content found in published text.');
      }
    }
  }
  // Other essays contain public task examples; reject raw execution payloads.
  scan(root);
}
if (process.argv[1] && resolve(process.argv[1]).endsWith('check-trace-privacy.mjs')) {
  try { checkTracePrivacy(resolve(process.argv.includes('--dist') ? 'dist' : 'public')); console.log('Trace privacy check passed.'); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
