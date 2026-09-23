import { traces, observations, presentation, loMolecules, type TraceKey } from './data/environmentTraces';
import { activityWindow, postHoc } from './data/environmentActivity';
import { EnvironmentScene } from './environmentScene';

class ScientificEnvironmentExplorer extends HTMLElement {
  cleanup?: () => void;
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = 'true';
    const controller = new AbortController();
    const { signal } = controller;
    const panels = [...this.querySelectorAll<HTMLElement>('.trace-panel')];
    const positions = new Map<TraceKey, number>(traces.map(t => [t.key, presentation[t.key].initial]));
    const viewers = new Map<string, EnvironmentScene>();
    const inspector = this.querySelector<HTMLElement>('.molecule-inspector')!;
    const live = this.querySelector<HTMLElement>('.live-status')!;
    let active: TraceKey = 'lo';
    let lastProbeIndex = 9;
    let timer: ReturnType<typeof setInterval> | undefined;
    let inViewport = false;
    let inspecting: Element | null = null;
    let pinned = false;

    const hideInspector = () => { inspector.hidden = true; inspecting = null; pinned = false; };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      this.querySelectorAll<HTMLButtonElement>('.play').forEach(b => {
        b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', 'Play trace'); b.querySelector('span')!.textContent = '▷';
      });
    };
    const activateScene = (panel: HTMLElement, turn: number) => {
      const host = panel.querySelector<HTMLElement>('[data-scene]');
      if (!host || !inViewport) return;
      const key = host.dataset.scene as 'sh' | 'receptor' | 'probes';
      let scene = viewers.get(key);
      if (!scene) { scene = new EnvironmentScene(host, key); viewers.set(key, scene); }
      void scene.activate(turn);
    };
    const render = (key: TraceKey, index: number, announce = false, follow = false) => {
      const trace = traces.find(t => t.key === key)!;
      index = Math.max(0, Math.min(index, trace.moments.length - 1));
      positions.set(key, index);
      const panel = panels.find(p => p.dataset.trace === key)!;
      panel.dataset.index = String(index);
      const m = trace.moments[index];
      panel.querySelectorAll<HTMLElement | SVGElement>('[data-at],[data-until]').forEach(node => {
        const visible = m.turn >= Number(node.dataset.at ?? 0) && m.turn < Number(node.dataset.until ?? Infinity);
        if (node instanceof SVGElement) node.dataset.hidden = String(!visible); else node.hidden = !visible;
      });
      panel.querySelectorAll<HTMLElement | SVGElement>('[data-created-at]').forEach(n => n.dataset.created = String(m.turn >= Number(n.dataset.createdAt)));
      const buttons = [...panel.querySelectorAll<HTMLButtonElement>('.event')];
      buttons.forEach((b, i) => {
        b.classList.toggle('active', i === index); b.classList.toggle('future', i > index);
        b.setAttribute('aria-pressed', String(i === index)); b.tabIndex = i === index ? 0 : -1;
      });
      panel.querySelector<HTMLElement>('.ribbon-track')!.style.setProperty('--position', `${(index + .5) / trace.moments.length * 100}%`);
      const activity = activityWindow(key, index);
      panel.querySelectorAll<HTMLElement>('.activity-item').forEach((row, i) => {
        const entry = activity[i];
        row.hidden = !entry;
        if (!entry) return;
        const changed = row.dataset.entry !== entry.id;
        row.dataset.entry = entry.id; row.dataset.actor = entry.actor; row.dataset.status = entry.status;
        row.classList.toggle('is-current', entry.current);
        row.querySelector('.activity-actor')!.textContent = entry.actor === 'Agent' ? '>_ Agent' : entry.actor;
        row.querySelector('.activity-subject')!.textContent = entry.subject;
        row.querySelector('.activity-text')!.textContent = entry.text;
        const turn = row.querySelector('.activity-turn')!;
        turn.textContent = String(entry.turn); turn.setAttribute('aria-label', `Turn ${entry.turn}`);
        if (changed) {
          row.getAnimations().forEach(animation => animation.cancel());
          if (entry.current && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            row.animate([{ opacity: .35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160 });
          }
        }
      });
      panel.querySelector<HTMLButtonElement>('.next')!.disabled = index === trace.moments.length - 1;
      if (key === 'probes') {
        if (index > 0) lastProbeIndex = index;
        const features = observations.probes.features.filter(f => f.turn <= m.turn);
        panel.querySelector('.feature-count')!.textContent = String(features.length);
        panel.querySelector('.feature-count-label')!.textContent = features.length ? 'ligand-side features' : 'ligand observations';
        const count = panel.querySelector<HTMLElement>('.probe-count')!;
        const probes = new Set(features.map(f => f.probe)).size;
        count.hidden = probes === 0;
        count.textContent = `${probes} ${probes === 1 ? 'probe' : 'probes'} with usable features`;
        panel.querySelectorAll<HTMLButtonElement>('[data-evidence]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.evidence === 'probes') === (index > 0))));
        panel.querySelector('.evidence-track')!.classList.toggle('enriched', index > 0);
      }
      panel.querySelectorAll<HTMLButtonElement>('[data-probe]').forEach(b => { b.disabled = m.turn < Number(b.dataset.availableAt); });
      hideInspector();
      if (follow) {
        const scroll = panel.querySelector<HTMLElement>('.ribbon-scroll')!;
        scroll.scrollLeft = buttons[index].offsetLeft - scroll.clientWidth / 2 + buttons[index].offsetWidth / 2;
      }
      activateScene(panel, m.turn);
      if (announce) live.textContent = `${trace.task}, ${trace.id}. Turn ${m.turn}. ${activity.filter(e => e.current).map(e => `${e.actor}${e.subject ? `, ${e.subject}` : ''}: ${e.text}`).join(' ')}${index === trace.moments.length - 1 ? ` Post-hoc evaluator: ${postHoc[key]}` : ''}`;
    };
    const switchTrace = (key: TraceKey) => {
      stop(); hideInspector(); active = key;
      panels.forEach(p => p.hidden = p.dataset.trace !== key);
      const isIpd = key === 'probes';
      this.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.task === (isIpd ? 'ipd' : key))));
      render(key, positions.get(key)!, true, true);
    };
    const inspect = (node: Element, event?: PointerEvent) => {
      const panel = node.closest<HTMLElement>('.trace-panel')!;
      const key = panel.dataset.trace as TraceKey;
      const turn = traces.find(t => t.key === key)!.moments[positions.get(key)!].turn;
      const id = (node as HTMLElement).dataset.molecule!;
      let fields: [string, string][] = [], name = '', note = '';
      if (key === 'lo') {
        const c = loMolecules.find(c => c.id === id)!;
        name = c.name;
        fields = [['similarity', turn >= c.created ? c.sim : '—'], ['clearance', turn >= c.measured ? c.clearance : '—'], ['binding', turn >= c.boltz ? c.binding : '—'], ['affinity', id === 'reference' || turn >= c.boltz ? c.affinity : '—']];
        note = turn < c.created ? 'Not yet proposed at this trace moment.' : turn < c.measured ? 'Awaiting ADMET measurements.' : id === 'reference' ? 'Baseline: clearance 82.67, affinity −0.6165.' : `Held-constant properties: ${c.held}.`;
      } else {
        name = id === 'sh-reference' ? 'Reference' : id === 'sh-c1' ? 'Candidate 1' : 'Candidate 2';
        const measured = turn >= (id === 'sh-c1' ? 26 : 27);
        fields = [['Tanimoto', id === 'sh-reference' ? '1.000' : turn >= 19 ? (id === 'sh-c1' ? '0.352' : '0.433') : '—'], ['scaffold overlap', id === 'sh-reference' ? '1.000' : turn >= 19 ? (id === 'sh-c1' ? '0.500' : '0.423') : '—'], ['binding', id === 'sh-reference' ? '—' : measured ? (id === 'sh-c1' ? '0.647' : '0.722') : '—']];
        note = 'Local novelty and rollout binding scores. Interaction preservation is evaluated separately.';
      }
      inspector.querySelector('.inspector-name')!.textContent = name;
      const dl = inspector.querySelector('dl')!; dl.replaceChildren();
      fields.forEach(([label, value]) => {
        const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
        dt.textContent = label; dd.textContent = value; row.append(dt, dd); dl.append(row);
      });
      inspector.querySelector('.inspector-note')!.textContent = note;
      inspector.hidden = false; inspecting = node;
      const origin = this.getBoundingClientRect(), bounds = node.getBoundingClientRect();
      const x = event ? event.clientX : bounds.left + bounds.width / 2;
      const y = event ? event.clientY : bounds.top + Math.min(bounds.height, 100);
      inspector.style.left = `${Math.max(0, Math.min(x - origin.left + 12, origin.width - inspector.offsetWidth))}px`;
      inspector.style.top = `${y - origin.top + 16}px`;
    };

    this.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(b => b.addEventListener('click', () => switchTrace(b.dataset.task === 'ipd' ? 'probes' : b.dataset.task as TraceKey), { signal }));
    this.querySelectorAll<HTMLButtonElement>('[data-evidence]').forEach(b => b.addEventListener('click', () => {
      stop();
      render('probes', b.dataset.evidence === 'receptor' ? 0 : lastProbeIndex, true, true);
    }, { signal }));
    panels.forEach(panel => {
      const key = panel.dataset.trace as TraceKey;
      const nodes = [...panel.querySelectorAll<HTMLButtonElement>('.event')];
      nodes.forEach((node, i) => {
        node.addEventListener('pointerenter', event => {
          if (event.pointerType === 'mouse' && timer === undefined) render(key, i);
        }, { signal });
        node.addEventListener('click', () => { stop(); render(key, i, true); }, { signal });
        node.addEventListener('focus', () => { stop(); render(key, i, true); }, { signal });
        node.addEventListener('keydown', event => {
          const last = nodes.length - 1;
          const target = event.key === 'ArrowRight' ? Math.min(last, i + 1) : event.key === 'ArrowLeft' ? Math.max(0, i - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? last : i;
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); stop(); render(key, target, true, true); nodes[target].focus(); }
        }, { signal });
      });
      panel.querySelector('.next')!.addEventListener('click', () => { stop(); render(key, positions.get(key)! + 1, true, true); }, { signal });
      panel.querySelector('.play')!.addEventListener('click', () => {
        if (timer !== undefined) { stop(); return; }
        if (positions.get(key)! >= nodes.length - 2) render(key, 0, true, true);
        const play = panel.querySelector('.play')!;
        play.setAttribute('aria-pressed', 'true'); play.setAttribute('aria-label', 'Pause trace'); play.querySelector('span')!.textContent = 'Ⅱ';
        timer = setInterval(() => {
          const next = positions.get(key)! + 1;
          if (next >= nodes.length) { stop(); return; }
          render(key, next, true, true); if (next === nodes.length - 1) stop();
        }, 1600);
      }, { signal });
      panel.querySelector('.reset-camera')?.addEventListener('click', () => viewers.get(key)?.reset(), { signal });
      panel.querySelectorAll<HTMLElement | SVGElement>('[data-molecule]').forEach(node => {
        node.addEventListener('pointerenter', event => { if (event instanceof PointerEvent && event.pointerType === 'mouse' && !pinned) inspect(node, event); }, { signal });
        node.addEventListener('pointerleave', () => { if (!pinned) hideInspector(); }, { signal });
        node.addEventListener('focus', () => inspect(node), { signal });
        node.addEventListener('blur', hideInspector, { signal });
        node.addEventListener('click', () => { if (pinned && inspecting === node) hideInspector(); else { inspect(node); pinned = true; } }, { signal });
        node.addEventListener('keydown', event => {
          if (!(event instanceof KeyboardEvent)) return;
          if (event.key === 'Escape') hideInspector();
          if (node instanceof SVGElement && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inspect(node); pinned = true; }
        }, { signal });
      });
      panel.querySelectorAll<HTMLButtonElement>('[data-probe]').forEach(b => {
        const focus = () => { if (!b.disabled) viewers.get('probes')?.focusProbe(b.dataset.probe!); };
        b.addEventListener('pointerenter', focus, { signal }); b.addEventListener('focus', focus, { signal }); b.addEventListener('click', focus, { signal });
        b.addEventListener('pointerleave', () => viewers.get('probes')?.focusProbe(null), { signal }); b.addEventListener('blur', () => viewers.get('probes')?.focusProbe(null), { signal });
      });
    });
    window.addEventListener('scroll', hideInspector, { passive: true, signal });
    window.addEventListener('resize', hideInspector, { signal });
    document.addEventListener('pointerdown', event => { if (inspecting && !inspecting.contains(event.target as Node) && !inspector.contains(event.target as Node)) hideInspector(); }, { signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });
    const observer = new IntersectionObserver(entries => {
      inViewport = entries[0].isIntersecting;
      if (!inViewport) stop();
      else {
        const panel = panels.find(p => p.dataset.trace === active)!;
        activateScene(panel, traces.find(t => t.key === active)!.moments[positions.get(active)!].turn);
      }
    }, { rootMargin: '100px' });
    observer.observe(this);
    render('lo', presentation.lo.initial);
    this.cleanup = () => { stop(); controller.abort(); observer.disconnect(); viewers.forEach(v => v.dispose()); };
  }
  disconnectedCallback() { this.cleanup?.(); delete this.dataset.ready; }
}

if (!customElements.get('scientific-environment-explorer')) customElements.define('scientific-environment-explorer', ScientificEnvironmentExplorer);
