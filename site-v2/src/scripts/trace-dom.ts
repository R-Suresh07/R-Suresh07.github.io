import type { TraceArchive } from '../lib/trace-vault';
export function element(tag: string, text = '', className = '') {
  const item = document.createElement(tag); item.textContent = text; item.className = className; return item;
}
export function vaultLink(vault: TraceArchive, path: string, label: string) {
  const link = document.createElement('a'); link.href = '#'; link.textContent = label;
  link.download = path.split('/').pop() || 'download';
  let busy = false;
  link.addEventListener('click', async event => {
    if (link.getAttribute('href')?.startsWith('blob:')) return;
    event.preventDefault(); if (busy) return; busy = true; link.textContent = 'Loading…';
    try { link.href = await vault.fileUrl(path); link.textContent = label; link.click(); }
    catch { link.textContent = 'File unavailable · click to retry'; }
    finally { busy = false; }
  });
  return link;
}
export function renderEvaluation(evaluation: Record<string, any> | null, task: string, run: string, vault: TraceArchive) {
  const section = element('section', '', 'evaluation-panel'); section.id = 'evaluation'; section.dataset.outcome = evaluation?.tone ?? 'unknown'; section.setAttribute('aria-label', 'Independent evaluation');
  const fragment = evaluation && evaluation.matched == null;
  const checks = evaluation?.steps?.filter((step: any) => step.status === 'passed').length ?? 0;
  const header = element('header', '', 'evaluation-heading'), heading = element('div');
  heading.append(element('p', 'Independent evaluation · after submission', 'eyebrow'), element('h2', !evaluation ? 'Evaluation unavailable' : fragment ? (evaluation.status === 'passed' ? 'All recorded checks passed.' : 'The submission failed evaluation.') : evaluation.status === 'passed' ? 'All three points matched.' : evaluation.matched === 0 ? 'No interaction points matched.' : `${evaluation.matched} of 3 interaction points matched.`));
  header.append(heading, element('span', evaluation ? `Task ${evaluation.status}` : 'Not evaluated', 'evaluation-badge')); section.append(header);
  if (!evaluation) return section;
  const score = element('div', '', 'evaluation-score'), value = element('strong', `${fragment ? checks : evaluation.matched ?? '—'}`); value.append(element('span', fragment ? ` / ${evaluation.steps.length}` : ' / 3'));
  const explanation = element('div'); explanation.append(element('b', fragment ? 'Evaluation checks passed' : 'Interaction points recovered'), element('p', fragment ? 'Every chemistry and binding/pose check must pass.' : 'A task passes only when all three points match the hidden reference.')); score.append(value, explanation); section.append(score);
  const details = document.createElement('details'); details.className = 'evaluation-details'; details.append(element('summary', 'Inspect evaluator results'));
  const wrap = element('div', '', 'evaluation-table-wrap'), table = document.createElement('table'); table.className = 'evaluation-table'; table.append(element('caption', 'Recorded evaluation steps'));
  const head = document.createElement('thead'), row = document.createElement('tr');
  for (const label of ['Check', 'Result', 'Required', 'Status', 'Time']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = label; row.append(th); } head.append(row); table.append(head);
  const body = document.createElement('tbody');
  for (const step of evaluation.steps) {
    const tr = document.createElement('tr'), name = document.createElement('th'); name.scope = 'row'; name.textContent = step.name; tr.append(name);
    tr.append(element('td', typeof step.result === 'number' ? `${(step.result * 100).toFixed(1)}%` : JSON.stringify(step.result)), element('td', step.condition?.eq === 1 ? '100% (3/3)' : JSON.stringify(step.condition)));
    const td = element('td'), badge = element('span', step.status, 'evaluation-badge'); badge.dataset.outcome = step.status; td.append(badge); tr.append(td, element('td', `${step.duration_s.toFixed(2)} s`)); body.append(tr);
  }
  table.append(body); wrap.append(table); details.append(wrap, element('p', fragment ? 'Binding and pose are reported as a combined gate; this export does not identify which subrequirement failed.' : 'The export reports an aggregate match score. It does not identify which individual submitted points matched. Matching requires compatible feature types and a distance strictly below 2.5 Å, with one-to-one assignment.', 'evaluation-note'));
  const raw = document.createElement('details'); raw.className = 'trace-disclosure'; raw.append(element('summary', 'Raw evaluation JSON'), element('pre', JSON.stringify({ task_id: evaluation.task_id, status: evaluation.status, steps: evaluation.steps }, null, 2))); details.append(raw); section.append(details);
  const links = element('div', '', 'evaluation-links'); links.append(vaultLink(vault, evaluation.path ?? `${run}-eval/${task}/result.json`, 'Download evaluation JSON ↓'));
  const jump = document.createElement('a'); jump.id = 'jump-submission'; jump.href = '#'; jump.textContent = fragment ? 'View the submitted molecule →' : 'View the submitted points →'; links.append(jump); section.append(links); return section;
}
