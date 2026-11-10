import { createLocalTraceStore } from './local-fragment-traces.mjs';

// Resolve every trace before pruning: this also validates JSONL and discovers
// exactly the images used by the turn viewer, without walking prediction trees.
export function collectFragmentData(root) {
  const store = createLocalTraceStore(root);
  const events = new Map();
  const keep = new Set();
  for (const trace of store.manifest().traces) {
    events.set(trace.entry, store.trace(trace.entry).events);
    keep.add(`${trace.path}/agent_result.json`);
    keep.add(`${trace.path}/.harness/tool_history.jsonl`);
  }
  const manifest = store.manifest();
  if (manifest.traces.length !== 120 || manifest.runs.length !== 2 || manifest.runs.some(run => manifest.traces.filter(trace => trace.run === run.run).length !== 60)) throw new Error('Expected both complete 60-task fragment runs; refusing an incomplete export.');
  for (const path of Object.keys(manifest.files)) keep.add(path);
  return { manifest, events, keep };
}
