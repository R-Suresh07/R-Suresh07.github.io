import type { TraceArchive } from '../lib/trace-vault';
import { vaultLink } from './trace-dom';
type Event = Record<string, any>;
type Turn = { number: number; model: Event; calls: Event[]; submission?: Event };
export function initTraceViewer(viewer: HTMLElement, events: Event[], vault: TraceArchive) {
  const lifecycle = new AbortController();
  const signal = lifecycle.signal;
  const pendingImages = new Map<Element, () => void>();
  const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { pendingImages.get(entry.target)?.(); pendingImages.delete(entry.target); observer?.unobserve(entry.target); }
  }, { rootMargin: '200px' }) : null;
  const get = <T extends HTMLElement>(id: string) => viewer.querySelector<T>(`#${id}`)!;
  const content = get('turn-content');
  const list = get('turn-list');
  const search = get<HTMLInputElement>('step-search');
  const filter = get<HTMLSelectElement>('step-filter');
  const previous = get<HTMLButtonElement>('previous-turn');
  const next = get<HTMLButtonElement>('next-turn');
  const node = (tag: string, text = '', className = '') => {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  };
  const printable = (value: any) => typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '';
  const toolInfo = (tool: string) => {
    if (tool === 'python') return { kind: 'python', label: 'Python', icon: 'Py' };
    if (tool === 'chimerax') return { kind: 'visual', label: 'ChimeraX', icon: '3D' };
    if (tool.startsWith('predict_')) return { kind: 'prediction', label: tool === 'predict_boltz' ? 'Boltz prediction' : 'ADMET prediction', icon: '↗' };
    if (tool.startsWith('submit')) return { kind: 'submission', label: 'Submission', icon: '✓' };
    return { kind: 'context', label: tool.replaceAll('_', ' '), icon: '≡' };
  };
  const usesChimeraX = (call: Event) => {
    if (call.tool === 'chimerax' || Number(call.chimerax_call_count) > 0) return true;
    if (call.tool !== 'python') return false;
    const code = call.input?.code ?? '';
    if (/\bchimerax\s*\(/i.test(code)) return true;
    const alias = code.match(/\bfrom\s+smdd_chimerax\s+import\s+chimerax\s+as\s+([A-Za-z_]\w*)/);
    return Boolean(alias && new RegExp(`\\b${alias[1]}\\s*\\(`).test(code));
  };
  // Build highlighted text with DOM nodes, keeping exported source inert.
  function highlight(text: string, language: string) {
    const code = node('code');
    const pattern = language === 'python'
      ? /(?:[rubf]{0,2})(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*")|#[^\n]*|\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b[A-Za-z_]\w*(?=\s*\()/g
      : /"(?:\\.|[^"\\])*"\s*(?=:)|"(?:\\.|[^"\\])*"|\b(?:true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g;
    let end = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index! > end) code.append(node('span', text.slice(end, match.index)));
      const value = match[0];
      const kind = value.startsWith('#') ? 'comment' : /^(?:[rubf]{0,2})['"]/.test(value) ? (language === 'json' && /:\s*$/.test(text.slice(match.index! + value.length, match.index! + value.length + 3)) ? 'key' : 'string') : /^-?\d/.test(value) ? 'number' : /^[A-Za-z_]\w*$/.test(value) && /^\s*\(/.test(text.slice(match.index! + value.length)) ? 'function' : 'keyword';
      code.append(node('span', value, `syntax-${kind}`));
      end = match.index! + value.length;
    }
    if (end < text.length) code.append(node('span', text.slice(end)));
    return code;
  }
  const prettyOutput = (value: any) => {
    if (typeof value !== 'string') return printable(value);
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  };
  function disclosure(title: string, text: string, open = false, language = '') {
    const details = document.createElement('details');
    details.open = open;
    details.className = `trace-disclosure ${language ? 'has-code' : ''}`;
    const pre = node('pre');
    if (language) pre.append(highlight(text, language));
    else pre.textContent = text;
    const body = node('div', '', 'disclosure-body');
    const bar = node('div', '', 'code-toolbar');
    bar.append(node('span', language || 'text'));
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copy';
    copy.setAttribute('aria-label', `Copy ${title.toLowerCase()}`);
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied ✓'; }
      catch { copy.textContent = 'Copy unavailable'; }
      setTimeout(() => { copy.textContent = 'Copy'; }, 1800);
    });
    bar.append(copy); body.append(bar, pre);
    details.append(node('summary', title), body);
    return details;
  }
  try {
    const context = get('trace-context');
    context.replaceChildren();
    for (const e of events.filter(e => ['user_message', 'system_prompt'].includes(e.event))) {
      context.append(disclosure(e.event === 'user_message' ? 'Task instructions' : 'System prompt & available tools', e.content, e.event === 'user_message'));
    }
    const turns: Turn[] = events.filter(e => e.event === 'llm_call').map(model => ({
      number: model.turn, model, calls: events.filter(e => e.event === 'tool_call' && e.turn === model.turn),
      submission: events.find(e => e.event === 'submit' && e.turn === model.turn),
    }));
    const evaluation = events.find(e => e.event === 'evaluation');
    const lastSubmission = turns.findLast(t => t.submission);
    const jump = get<HTMLAnchorElement>('jump-submission');
    if (jump && lastSubmission) jump.href = `#turn-${lastSubmission.number}`;
    let visible = turns;
    let selected = Number(location.hash.match(/^#turn-(\d+)$/)?.[1]) || turns[0]?.number;
    const callReason = (call: Event) => call.input?.reasoning || '';
    function renderDetail() {
      observer?.disconnect(); pendingImages.clear();
      const turn = visible.find(t => t.number === selected);
      content.replaceChildren();
      const index = visible.findIndex(t => t.number === selected);
      previous.disabled = index <= 0;
      next.disabled = index < 0 || index >= visible.length - 1;
      get('turn-position').textContent = turn ? `${index + 1} / ${visible.length}` : '0 matches';
      list.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.turn) === selected)));
      if (!turn) { content.append(node('p', 'No turns match. Try a different search or filter.')); return; }
      content.append(node('p', `TURN ${String(turn.number).padStart(2, '0')}`, 'eyebrow'));
      const intent = turn.calls.map(callReason).find(Boolean);
      content.append(node('h2', turn.submission ? (viewer.dataset.taskType === 'fragment' ? 'Submitting the molecule' : 'Submitting the interaction points') : intent ? intent.split(/(?<=[.!?])\s/)[0] : 'Model commentary & actions'));
      const date = new Date(turn.model.timestamp);
      content.append(node('p', `${date.toISOString().replace('T', ' ').slice(0, 19)} UTC · ${Number(turn.model.input_tokens).toLocaleString()} input / ${Number(turn.model.output_tokens).toLocaleString()} output tokens`, 'trace-muted'));
      if (turn.model.assistant_text) {
        const commentary = node('section', '', 'model-commentary');
        commentary.append(node('div', 'MODEL COMMENTARY', 'section-label'), node('div', turn.model.assistant_text)); content.append(commentary);
      } else content.append(node('p', 'This turn records intent in the tool inputs below.', 'commentary-note'));
      for (const call of turn.calls) {
        const info = toolInfo(call.tool);
        const article = node('article', '', 'tool-entry');
        article.dataset.kind = info.kind;
        const header = node('header', '', 'tool-heading');
        header.append(node('span', info.icon, 'tool-icon'), node('h3', info.label));
        if (call.tool === 'python' && usesChimeraX(call)) { const tag = node('span', 'ChimeraX', 'tool-chip'); tag.dataset.kind = 'visual'; header.append(tag); }
        header.append(node('span', call.call_id || '', 'call-id'));
        article.append(header);
        const failed = call.status && call.status !== 'success';
        const meta = node('div', '', 'tool-meta');
        meta.append(node('span', `${failed ? '!' : '✓'} ${call.status ?? 'Recorded'}`, failed ? 'result-badge result-failed' : 'result-badge'), node('span', `${Number(call.duration_s ?? 0).toFixed(2)} s`), node('span', call.tool, 'tool-raw-name')); article.append(meta);
        if (callReason(call)) { const purpose = node('div', '', 'tool-purpose'); purpose.append(node('span', 'INTENT', 'section-label'), node('p', callReason(call))); article.append(purpose); }
        const input = call.input ?? {};
        if (input.code) {
          article.append(disclosure('Code · what the model ran', input.code, true, 'python'));
          const rest = Object.fromEntries(Object.entries(input).filter(([key]) => key !== 'code' && key !== 'reasoning'));
          if (Object.keys(rest).length) article.append(disclosure('Other arguments', printable(rest), false, 'json'));
        } else article.append(disclosure('Input · what the model sent', printable(input), true, 'json'));
        const output = prettyOutput(call.output);
        article.append(disclosure(call.output_bounded ? 'Observation · output bounded in source' : 'Observation · what the tool returned', output, true, /^[\s]*[\[{]/.test(output) ? 'json' : ''));
        const attachments = document.createElement('details'); attachments.className = 'trace-disclosure';
        const files = (call.artifacts ?? []).filter((a: Event) => !/\.png$/i.test(a.export_path));
        if (files.length) { attachments.append(node('summary', `Files & artifacts · ${files.length} records`)); article.append(attachments); }
        for (const artifact of call.artifacts ?? []) {
          if (!artifact.available) {
            attachments.append(node('p', `${artifact.artifact_id} · ${artifact.export_path.split('/').pop()} · ${artifact.unavailable_reason || 'File unavailable in this export'}`, 'trace-muted'));
            continue;
          }
          const path = `${viewer.dataset.task}/${artifact.export_path}`;
          const name = artifact.export_path.split('/').pop();
          if (/\.png$/i.test(name)) {
            const link = document.createElement('a'); link.href = '#'; link.download = name;
            link.addEventListener('click', event => { if (!link.getAttribute('href')?.startsWith('blob:')) event.preventDefault(); });
            const figure = node('figure', '', 'trace-render');
            const image = document.createElement('img'); image.alt = `Recorded ${artifact.created_by_tool} render, ${artifact.artifact_id}, ${name}`; image.loading = 'lazy';
            const status = node('figcaption', `${artifact.artifact_id} · ${name} · Image loads as you scroll`);
            const load = () => { vault.fileUrl(path).then(url => {
              if (signal.aborted || !image.isConnected) return;
              image.src = url; link.href = url; status.textContent = `${artifact.artifact_id} · ${name} · Click to download image`;
            }).catch(() => { if (!signal.aborted) status.textContent = 'Image could not be loaded. Select this turn again to retry.'; }); };
            link.append(image); figure.append(link, status); article.append(figure);
            if (observer) { pendingImages.set(figure, load); observer.observe(figure); } else load();
          } else { const link = vaultLink(vault, path, `${artifact.artifact_id} · ${name} ↗`); link.className = 'artifact-link'; attachments.append(link); }
        }
        content.append(article);
      }
      if (turn.submission) {
        const section = node('section', '', 'submission-record');
        section.append(node('h3', 'Recorded submission'), node('p', viewer.dataset.taskType === 'fragment' ? `Submitted artifact: ${turn.submission.file || 'solution.smi'}` : 'Three ligand-side points, as written to solution.csv.'), node('pre', turn.submission.content));
        if (evaluation) {
          const result = node('div', '', 'submission-evaluation'); result.dataset.outcome = evaluation.tone;
          result.append(node('span', `Task ${evaluation.status}`, 'evaluation-badge'), node('strong', evaluation.matched == null ? `${evaluation.steps.filter((step: Event) => step.status === 'passed').length}/${evaluation.steps.length} checks passed` : `${evaluation.matched}/3 interaction points matched`));
          const link = document.createElement('a'); link.href = '#evaluation'; link.textContent = 'Inspect evaluation ↑'; result.append(link); section.append(result);
        }
        content.append(section);
      }
      if (!turn.calls.length && !turn.submission) content.append(node('p', 'No tool calls recorded in this turn.', 'trace-muted'));
    }
    function choose(number: number, updateHash = true) {
      selected = number;
      if (updateHash) history.replaceState(null, '', `#turn-${number}`);
      renderDetail();
    }
    function refresh() {
      const query = search.value.trim().toLowerCase();
      visible = turns.filter(turn => {
        const category = filter.value;
        const matchesCategory = category === 'all' || turn.calls.some(call => category === 'error' ? call.status && call.status !== 'success' : category === 'chimerax' ? usesChimeraX(call) : call.tool === category);
        return matchesCategory && (!query || [turn.model.assistant_text, ...turn.calls.map(call => `${call.tool} ${printable(call.input)} ${printable(call.output)}`), turn.submission?.content].join('\n').toLowerCase().includes(query));
      });
      get('step-count').textContent = `${visible.length} of ${turns.length} turns`;
      list.replaceChildren();
      for (const turn of visible) {
        const button = document.createElement('button'); button.dataset.turn = String(turn.number);
        button.append(node('span', `Turn ${String(turn.number).padStart(2, '0')}`, 'turn-number'));
        if (turn.submission && evaluation) {
          const result = node('span', evaluation.matched == null ? `Eval: ${evaluation.status}` : `Eval: ${evaluation.matched}/3 · ${evaluation.status}`, 'evaluation-badge'); result.dataset.outcome = evaluation.tone; button.append(result);
        }
        const chips = node('span', '', 'turn-tools');
        const tools = new Set(turn.calls.map(c => c.tool));
        if (turn.calls.some(usesChimeraX)) tools.add('chimerax');
        for (const tool of tools) {
          const info = toolInfo(tool); const chip = node('span', info.label, 'tool-chip'); chip.dataset.kind = info.kind; chips.append(chip);
        }
        if (!turn.calls.length) chips.append(node('span', 'Model response', 'tool-chip'));
        button.append(chips);
        const preview = turn.model.assistant_text || turn.calls.map(callReason).find(Boolean) || 'Inspect recorded actions';
        button.append(node('span', preview.slice(0, 130), 'turn-preview'));
        button.addEventListener('click', () => choose(turn.number)); list.append(button);
      }
      if (!visible.some(t => t.number === selected)) selected = visible[0]?.number;
      renderDetail();
    }
    previous.addEventListener('click', () => choose(visible[visible.findIndex(t => t.number === selected) - 1].number), { signal });
    next.addEventListener('click', () => choose(visible[visible.findIndex(t => t.number === selected) + 1].number), { signal });
    search.addEventListener('input', refresh, { signal }); filter.addEventListener('change', refresh, { signal });
    window.addEventListener('hashchange', () => {
      const number = Number(location.hash.match(/^#turn-(\d+)$/)?.[1]);
      if (turns.some(t => t.number === number)) { search.value = ''; filter.value = 'all'; selected = number; refresh(); }
    }, { signal });
    refresh();
  } catch (error) {
    content.replaceChildren(node('p', 'The trace could not be displayed. Return to all investigations and try again.', 'tool-error'));
    get('step-count').textContent = 'Trace unavailable';
    get('trace-context').textContent = 'Task unavailable.';
    console.error(error);
  } finally { viewer.querySelector('.turn-detail')?.setAttribute('aria-busy', 'false'); }
  return () => { lifecycle.abort(); observer?.disconnect(); pendingImages.clear(); };
}
