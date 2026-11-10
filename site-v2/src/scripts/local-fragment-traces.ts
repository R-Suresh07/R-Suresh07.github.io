import { unlockVault, type TraceArchive } from '../lib/trace-vault';
import { element as node, renderEvaluation, vaultLink } from './trace-dom';
import { initTraceViewer } from './trace-viewer';
const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const status = get('archive-status');
let stopViewer = () => {};
let generation = 0;
function start(archive: TraceArchive) {
  const manifest = archive.manifest;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const search = get<HTMLInputElement>('trace-search'), outcome = get<HTMLSelectElement>('outcome-filter'), run = get<HTMLSelectElement>('run-filter');
  const viewer = get('trace-viewer'), collection = get('trace-collection');
  const url = new URL(location.href); run.value = url.searchParams.get('run') || 'all';
  function filter() {
    let count = 0;
    get('trace-grid').querySelectorAll<HTMLElement>('[data-search]').forEach(card => {
      card.hidden = !card.dataset.search!.includes(search.value.toLowerCase().trim()) || (outcome.value !== 'all' && card.dataset.outcome !== outcome.value) || (run.value !== 'all' && card.dataset.run !== run.value);
      if (!card.hidden) count++;
    });
    get('trace-count').textContent = `${count} investigations`; get('trace-empty').hidden = count > 0;
  }
  async function route() {
    const token = ++generation; stopViewer(); stopViewer = () => {}; viewer.hidden = true; collection.hidden = true;
    const handle = new URL(location.href).searchParams.get('trace');
    if (!handle) { collection.hidden = false; filter(); status.textContent = ''; return; }
    const trace = manifest.traces.find((t: any) => t.handle === handle);
    if (!trace) { collection.hidden = false; status.textContent = 'Investigation not found.'; return; }
    status.textContent = 'Loading investigation…';
    try {
      const events = await archive.trace(trace.entry); if (token !== generation) return;
      viewer.dataset.task = trace.path; viewer.dataset.taskType = 'fragment';
      get('trace-accession').textContent = trace.accession; get('trace-id').textContent = trace.id; get('trace-status').textContent = trace.status;
      get('trace-model').textContent = `Fragment assembly · ${trace.label} · ${trace.model}`;
      document.title = `${trace.accession} · ${trace.label} · Fragment traces`;
      const metadata = get('trace-metadata'); metadata.replaceChildren(node('span', `${trace.turns_used} turns`), node('span', `${trace.boltz_calls} Boltz calls`), vaultLink(archive, `${trace.path}/trajectory.jsonl`, 'Original JSONL ↓'), vaultLink(archive, trace.submittedPath, 'Submitted file ↓'));
      const other = manifest.traces.find((t: any) => t.id === trace.id && t.variant !== trace.variant);
      if (other) { const link = node('a', `Compare: ${other.label}`) as HTMLAnchorElement; link.href = `?trace=${encodeURIComponent(other.handle)}`; link.addEventListener('click', event => { event.preventDefault(); navigate(link.href); }); metadata.append(link); }
      get('trace-evaluation').replaceChildren(renderEvaluation(trace.evaluation, trace.id, trace.run, archive));
      get<HTMLInputElement>('step-search').value = ''; get<HTMLSelectElement>('step-filter').value = 'all';
      viewer.hidden = false; stopViewer = initTraceViewer(viewer, events, archive); status.textContent = '';
    } catch (error) { if (token === generation) { collection.hidden = false; status.textContent = String(error); } }
  }
  function navigate(url: string) { history.pushState(null, '', url); void route(); }
  const summary = get('collection-summary'); summary.replaceChildren(); get('trace-grid').replaceChildren();
  for (const variant of ['noimages', 'images']) {
    const traces = manifest.traces.filter((t: any) => t.variant === variant), passed = traces.filter((t: any) => t.evaluation?.status === 'passed').length;
    const stat = node('div'); stat.append(node('strong', `${passed} / ${traces.length}`), node('span', variant === 'images' ? 'Images enabled · tasks passed' : 'Images withheld · tasks passed')); summary.append(stat);
  }
  for (const trace of manifest.traces) {
    const card = node('a', '', 'trace-card') as HTMLAnchorElement; card.href = `?trace=${encodeURIComponent(trace.handle)}`; card.dataset.search = `${trace.id} ${trace.label}`.toLowerCase(); card.dataset.run = trace.variant; card.dataset.outcome = trace.evaluation?.tone || 'unknown';
    const top = node('div', '', 'card-top'); top.append(node('span', trace.label), node('span', trace.evaluation?.status || 'Not evaluated', 'evaluation-badge'));
    const stats = node('div', '', 'card-stats'); stats.append(node('span', `${trace.turns_used} turns`), node('span', `${trace.boltz_calls} Boltz calls`));
    card.append(top, node('h2', trace.accession), node('p', trace.id), stats);
    card.addEventListener('click', event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(card.href); }); get('trace-grid').append(card);
  }
  search.addEventListener('input', filter, options); outcome.addEventListener('change', filter, options); run.addEventListener('change', () => { const url = new URL(location.href); url.searchParams.set('run', run.value); history.replaceState(null, '', url); filter(); }, options);
  get('all-traces').addEventListener('click', event => { event.preventDefault(); navigate(`/traces/fragments/?run=${run.value}`); }, options);
  window.addEventListener('popstate', () => { void route(); }, options);
  void route();
  return () => { generation++; listeners.abort(); stopViewer(); stopViewer = () => {}; archive.dispose(); };
}
let closeArchive = () => {};
const defaultTitle = document.title;
let unlockGeneration = 0;
function lock() {
  unlockGeneration++; closeArchive(); closeArchive = () => {};
  get('unlocked-archive').hidden = true; get('vault-lock').hidden = false;
  for (const id of ['trace-grid', 'collection-summary', 'trace-count', 'trace-model', 'trace-accession', 'trace-id', 'trace-status', 'trace-metadata', 'trace-evaluation', 'trace-context', 'step-count', 'turn-list', 'turn-content', 'turn-position', 'archive-status']) get(id).replaceChildren();
  get('trace-viewer').removeAttribute('data-task');
  get<HTMLInputElement>('vault-password').value = ''; get<HTMLInputElement>('vault-password').type = 'password';
  get('toggle-password').textContent = 'Show'; get('toggle-password').setAttribute('aria-pressed', 'false'); get('toggle-password').setAttribute('aria-label', 'Show password');
  get<HTMLInputElement>('trace-search').value = ''; get<HTMLSelectElement>('outcome-filter').value = 'all';
  get('unlock-status').textContent = ''; get<HTMLButtonElement>('unlock-button').disabled = false;
  document.title = defaultTitle;
}
get('unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = get<HTMLButtonElement>('unlock-button'); if (button.disabled) return;
  const token = ++unlockGeneration; button.disabled = true; get('unlock-status').textContent = 'Unlocking archive...';
  const input = get<HTMLInputElement>('vault-password'); const pending = unlockVault(input.value, '/fragment-vault'); input.value = '';
  let archive: TraceArchive | undefined;
  try {
    archive = await pending;
    if (token !== unlockGeneration) { archive.dispose(); return; }
    get('vault-lock').hidden = true; get('unlocked-archive').hidden = false;
    closeArchive = start(archive);
  } catch (error) {
    archive?.dispose();
    if (token === unlockGeneration) { get('vault-lock').hidden = false; get('unlocked-archive').hidden = true; get('unlock-status').textContent = error instanceof Error ? error.message : 'Could not unlock archive.'; }
  } finally { if (token === unlockGeneration) button.disabled = false; }
});
get('toggle-password').addEventListener('click', () => {
  const input = get<HTMLInputElement>('vault-password'), show = input.type === 'password'; input.type = show ? 'text' : 'password';
  get('toggle-password').textContent = show ? 'Hide' : 'Show'; get('toggle-password').setAttribute('aria-pressed', String(show)); get('toggle-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});
get('lock-archive').addEventListener('click', lock);
window.addEventListener('pagehide', lock);
