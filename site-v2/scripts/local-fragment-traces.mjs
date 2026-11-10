import { existsSync, readFileSync, realpathSync, statSync, createReadStream } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RUNS = [
  { variant: 'noimages', label: 'Images withheld', run: 'v3-fragment-gpt61-sol-noimages-modal-20261108-152204' },
  { variant: 'images', label: 'Images enabled', run: 'v3-fragment-gpt61-sol-images-modal-20261108-201046' },
];
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const readRows = path => readFileSync(path, 'utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
const mime = path => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.jsonl': 'application/x-ndjson' }[extname(path).toLowerCase()] ?? 'application/octet-stream');

export function createLocalTraceStore(tasksRoot) {
  const root = realpathSync(tasksRoot);
  const allowed = new Map();
  const entries = new Map();
  function register(logical) {
    if (typeof logical !== 'string' || logical.includes('\\') || logical.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid trace path.');
    const path = resolve(root, logical);
    if (!path.startsWith(root + sep)) throw new Error('Invalid trace path.');
    if (!existsSync(path)) return false;
    const real = realpathSync(path);
    if (!real.startsWith(root + sep) || !statSync(real).isFile()) throw new Error('Invalid trace file.');
    allowed.set(logical, real); return true;
  }
  const traces = [];
  for (const config of RUNS) {
    const source = resolve(root, config.run);
    if (!existsSync(source)) continue;
    const summary = readJSON(resolve(source, 'agent_summary.json'));
    const evalRun = `eval-${config.run}`;
    register(`${config.run}/agent_summary.json`);
    register(`${evalRun}/summary.json`);
    for (const id of Object.keys(summary.tasks).sort()) {
      if (!/^smdd_005_[A-Za-z0-9]+_\d+$/.test(id)) throw new Error('Invalid task identity.');
      const path = `${config.run}/${id}`;
      const result = readJSON(resolve(root, path, 'agent_result.json'));
      const evaluationPath = `${evalRun}/${id}/result.json`;
      const evaluation = register(evaluationPath) ? readJSON(allowed.get(evaluationPath)) : null;
      if (evaluation) { evaluation.tone = evaluation.status === 'passed' ? 'passed' : 'failed'; evaluation.path = evaluationPath; }
      const submitted = result.submitted_file || 'solution.smi';
      const submittedPath = `${path}/${submitted}`;
      register(`${path}/trajectory.jsonl`); register(submittedPath);
      const entry = `${config.variant}:${id}`;
      const trace = { ...result, id, handle: entry, entry, path, submittedPath, evaluation, accession: id.split('_')[2], ...config };
      traces.push(trace); entries.set(entry, trace);
    }
  }
  const manifest = { version: 1, traces, files: {}, runs: RUNS.filter(c => traces.some(t => t.run === c.run)) };
  function fileManifest() { return Object.fromEntries([...allowed.keys()].map(path => [path, { file: path, mime: mime(path) }])); }
  function trace(entry) {
    const info = entries.get(entry);
    if (!info) throw new Error('Unknown investigation.');
    const folder = resolve(root, info.path);
    const history = new Map(readRows(resolve(folder, '.harness/tool_history.jsonl')).map(call => [call.call_id, call]));
    const events = readRows(resolve(folder, 'trajectory.jsonl')).map(event => {
      if (event.event === 'submit') return { ...event, content: allowed.has(info.submittedPath) ? readFileSync(allowed.get(info.submittedPath), 'utf8') : event.content };
      if (event.event !== 'tool_call') return event;
      const full = history.get(event.call_id);
      const artifacts = (full?.artifacts ?? []).filter(a => a.export_path).map(a => {
        let available = false;
        try { available = /\.(png|jpe?g)$/i.test(a.export_path) && register(`${info.path}/${a.export_path}`); }
        catch (error) { if (!String(error.message).startsWith('Invalid trace')) throw error; }
        return { ...a, available, unavailable_reason: available ? undefined : 'Excluded from the visualization export or missing from the source.' };
      });
      return { ...event, status: full?.status ?? (event.returncode === 0 ? 'success' : event.returncode ? 'error' : undefined),
        output: full?.raw_result ?? full?.result ?? event.output_truncated,
        output_bounded: full ? full.raw_result_bounded : true, chimerax_call_count: full?.metadata?.chimerax_call_count, artifacts };
    });
    if (info.evaluation) events.push({ ...info.evaluation, event: 'evaluation' });
    return { events, files: fileManifest() };
  }
  return { manifest: () => ({ ...manifest, files: fileManifest() }), trace,
    file(path) { const file = allowed.get(path); if (!file) throw new Error('Unknown trace file.'); return { path: file, mime: mime(path) }; } };
}

// configureServer is development-only: no trace data enters static output or preview.
export function localFragmentTraces(tasksRoot = fileURLToPath(new URL('../../tasks', import.meta.url))) {
  return { name: 'local-fragment-traces', apply: 'serve', configureServer(server) {
    let store;
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url || '/', 'http://localhost');
      if (!url.pathname.startsWith('/__local_fragment_traces/')) return next();
      const host = (req.headers.host || '').replace(/:\d+$/, '');
      const origin = req.headers.origin;
      if (!['localhost', '127.0.0.1', '[::1]'].includes(host) || (origin && new URL(origin).host !== req.headers.host)) { res.statusCode = 403; res.end('Local access only.'); return; }
      if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end('Read-only endpoint.'); return; }
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
      try {
        store ??= createLocalTraceStore(tasksRoot);
        if (url.pathname.endsWith('/file')) {
          const file = store.file(url.searchParams.get('path'));
          // Only raster images display inline; other source artifacts download inertly.
          res.setHeader('Content-Type', /^image\/(png|jpeg)$/.test(file.mime) ? file.mime : 'application/octet-stream');
          if (!file.mime.startsWith('image/')) res.setHeader('Content-Disposition', 'attachment');
          if (req.method === 'HEAD') res.end(); else createReadStream(file.path).on('error', error => res.destroy(error)).pipe(res);
          return;
        }
        const value = url.pathname.endsWith('/manifest') ? store.manifest() : url.pathname.endsWith('/trace') ? store.trace(url.searchParams.get('entry')) : null;
        if (!value) { res.statusCode = 404; res.end('Not found.'); return; }
        res.setHeader('Content-Type', 'application/json'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(value));
      } catch (error) { console.error('[local traces]', error); res.statusCode = 404; res.end('Local trace unavailable. Check the dev server log.'); }
    });
  } };
}
