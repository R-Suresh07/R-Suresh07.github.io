import { unlockVault, type TraceVault } from '../lib/trace-vault';
import { element as node, renderEvaluation, vaultLink } from './trace-dom';
import { initTraceViewer } from './trace-viewer';

const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const password = get<HTMLInputElement>('vault-password');
const button = get<HTMLButtonElement>('unlock-button');
const search = get<HTMLInputElement>('trace-search');
const outcome = get<HTMLSelectElement>('outcome-filter');
const viewer = get('trace-viewer');
const defaultTitle = document.title;
let vault: TraceVault | null = null;
let stopViewer = () => {};
let generation = 0;
const dynamicIds = ['trace-grid', 'collection-summary', 'trace-count', 'trace-model', 'trace-accession', 'trace-id', 'trace-status', 'trace-metadata', 'trace-evaluation', 'trace-context', 'step-count', 'turn-list', 'turn-content', 'turn-position', 'archive-status'];

function lock(focus = true) {
  generation++; stopViewer(); stopViewer = () => {};
  vault?.dispose(); vault = null;
  get('unlocked-archive').hidden = true; get('vault-lock').hidden = false;
  for (const id of dynamicIds) get(id).replaceChildren();
  viewer.removeAttribute('data-task'); password.value = ''; password.type = 'password';
  get('toggle-password').textContent = 'Show'; get('toggle-password').setAttribute('aria-pressed', 'false'); get('toggle-password').setAttribute('aria-label', 'Show password');
  search.value = ''; outcome.value = 'all'; get<HTMLInputElement>('step-search').value = ''; get<HTMLSelectElement>('step-filter').value = 'all';
  document.title = defaultTitle; get('unlock-status').textContent = ''; button.disabled = false;
  if (focus) password.focus();
}
function navigate(url: string) { history.pushState(null, '', url); void route(); }
function filterCollection() {
  let count = 0;
  get('trace-grid').querySelectorAll<HTMLElement>('[data-search]').forEach(card => {
    card.hidden = !card.dataset.search!.includes(search.value.trim().toLowerCase()) || (outcome.value !== 'all' && card.dataset.outcome !== outcome.value);
    if (!card.hidden) count++;
  });
  get('trace-count').textContent = `${count} investigations`; get('trace-empty').hidden = count > 0;
}
function renderCollection(current: TraceVault) {
  const traces = current.manifest.traces;
  const evaluated = traces.filter(t => t.evaluation).length;
  const passed = traces.filter(t => t.evaluation?.status === 'passed').length;
  const matched = traces.reduce((sum, t) => sum + (t.evaluation?.matched ?? 0), 0);
  const summary = get('collection-summary'); summary.replaceChildren();
  for (const [value, total, label] of [[passed, ` / ${evaluated}`, 'tasks passed'], [matched, ` / ${evaluated * 3}`, 'interaction points matched'], [evaluated ? Math.round(passed / evaluated * 100) : 0, '%', 'task pass rate']]) {
    const stat = node('div'), strong = node('strong', String(value)); strong.append(node('small', String(total))); stat.append(strong, node('span', String(label))); summary.append(stat);
  }
  const run = current.manifest.run!;
  if (current.manifest.files[`${run}-eval/summary.json`]) summary.append(vaultLink(current, `${run}-eval/summary.json`, 'Evaluation summary ↓'));
  const grid = get('trace-grid'); grid.replaceChildren();
  traces.forEach((trace, index) => {
    const card = document.createElement('a'); card.className = 'trace-card'; card.href = `/traces/ipd/?trace=${trace.handle}`; card.dataset.search = trace.id.toLowerCase(); card.dataset.outcome = trace.evaluation?.tone ?? 'unknown';
    const top = node('div', '', 'card-top'); top.append(node('span', `INVESTIGATION ${String(index + 1).padStart(2, '0')}`), node('span', trace.evaluation ? `Task ${trace.evaluation.status}` : 'Not evaluated', 'evaluation-badge'));
    const title = node('h2', trace.accession); title.append(node('span', '↗')); card.append(top, title, node('p', 'Three ligand-side interaction points'));
    if (trace.evaluation) { const result = node('div', '', 'card-evaluation'); result.append(node('strong', `${trace.evaluation.matched}/3`), node('span', 'points matched'), node('span', trace.evaluation.tone === 'passed' ? 'Full recovery' : trace.evaluation.tone === 'partial' ? 'Partial recovery' : 'No recovery', 'match-description')); card.append(result); }
    const stats = node('div', '', 'card-stats');
    for (const [value, label] of [[trace.turns_used, 'turns'], [trace.boltz_calls, 'Boltz calls'], [Math.round(trace.runtime_seconds / 60), 'min']]) { const item = node('span'); item.append(node('b', String(value)), node('span', ` ${label}`)); stats.append(item); }
    card.append(stats); card.addEventListener('click', event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(card.href); }); grid.append(card);
  });
  filterCollection();
}
async function route() {
  const current = vault; if (!current) return;
  const token = ++generation; stopViewer(); stopViewer = () => {};
  viewer.hidden = true; get('trace-collection').hidden = true; get('archive-status').textContent = '';
  const handle = new URL(location.href).searchParams.get('trace');
  if (!handle) { get('trace-collection').hidden = false; document.title = defaultTitle; return; }
  const trace = current.manifest.traces.find(t => t.handle === handle);
  if (!trace) { get('trace-collection').hidden = false; get('archive-status').textContent = 'This trace link is unavailable. Choose an investigation below.'; return; }
  get('archive-status').textContent = 'Decrypting investigation…';
  try {
    const events = await current.trace(trace.entry);
    if (generation !== token || vault !== current) return;
    viewer.dataset.task = trace.id; get('trace-accession').textContent = trace.accession; get('trace-id').textContent = trace.id; get('trace-status').textContent = trace.status;
    get('trace-model').textContent = `IPD · ${trace.model} · Python + ChimeraX`; document.title = `${trace.accession} · Private trace archive`;
    const metadata = get('trace-metadata'); metadata.replaceChildren(node('span', `${trace.turns_used} model turns`), node('span', `${trace.boltz_calls} Boltz calls`), node('span', `${Math.round(trace.runtime_seconds / 60)} min elapsed`), vaultLink(current, `${trace.id}/trajectory.jsonl`, 'Original JSONL ↓'), vaultLink(current, `${trace.id}/solution.csv`, 'Submitted CSV ↓'));
    get('trace-evaluation').replaceChildren(renderEvaluation(trace.evaluation, trace.id, current.manifest.run!, current));
    get<HTMLInputElement>('step-search').value = ''; get<HTMLSelectElement>('step-filter').value = 'all';
    viewer.hidden = false; stopViewer = initTraceViewer(viewer, events, current); get('archive-status').textContent = '';
  } catch {
    if (generation !== token) return;
    get('trace-collection').hidden = false; get('archive-status').textContent = 'The investigation could not be decrypted. Select it again to retry.';
  }
}
get('unlock-form').addEventListener('submit', async event => {
  event.preventDefault(); if (button.disabled) return;
  const token = ++generation; button.disabled = true; get('unlock-status').textContent = 'Unlocking archive…';
  const pending = unlockVault(password.value); password.value = '';
  try {
    const unlocked = await pending;
    if (token !== generation) { unlocked.dispose(); return; }
    vault = unlocked; get('vault-lock').hidden = true; get('unlocked-archive').hidden = false;
    renderCollection(unlocked); await route();
  } catch (error) {
    if (token === generation) { get('unlock-status').textContent = error instanceof Error ? error.message : 'Could not unlock archive.'; password.focus(); }
  } finally { if (vault || token === generation) button.disabled = false; }
});
get('toggle-password').addEventListener('click', () => {
  const show = password.type === 'password'; password.type = show ? 'text' : 'password';
  get('toggle-password').textContent = show ? 'Hide' : 'Show'; get('toggle-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password'); get('toggle-password').setAttribute('aria-pressed', String(show));
});
get('lock-archive').addEventListener('click', () => lock());
get('all-traces').addEventListener('click', event => { event.preventDefault(); navigate('/traces/ipd/'); });
search.addEventListener('input', filterCollection); outcome.addEventListener('change', filterCollection);
window.addEventListener('popstate', () => { void route(); });
window.addEventListener('pagehide', () => lock(false));
