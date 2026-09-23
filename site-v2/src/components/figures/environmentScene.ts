import scenes from './data/environmentScenes.json';
import { observations, predictions } from './data/environmentTraces';
import type { GLViewer } from '3dmol';

export const featureColors: Record<string, string> = {
  Acceptor: '#087c83', Donor: '#bb7549', Hydrophobic: '#809065', Aromatic: '#86779c', Anion: '#769ca6',
};
type SceneKey = keyof typeof scenes;
const hypotheses = [
  { type: 'Donor', x: 18.8, y: -4, z: 1 },
  { type: 'Aromatic', x: 15.6, y: .8, z: 0 },
  { type: 'Hydrophobic', x: 17.2, y: -8, z: 3 },
];

/** A lazy pocket viewer. Coordinates come only from archived, public evidence. */
export class EnvironmentScene {
  private viewer?: GLViewer;
  private pending?: Promise<void>;
  private turn = 0;
  private disposed = false;
  private controller = new AbortController();
  private resize: ResizeObserver;
  private camera?: number[];
  private baseUrl: string;
  private frame = 0;
  private highlight: string | null = null;

  constructor(private host: HTMLElement, private key: SceneKey) {
    this.baseUrl = `${import.meta.env.BASE_URL}data/smdd/environment-explorer/`;
    this.resize = new ResizeObserver(() => {
      if (this.viewer && this.host.clientWidth && this.host.clientHeight) {
        this.viewer.resize(); this.fit(); this.viewer.render();
      }
    });
    this.resize.observe(host);
  }

  async activate(turn: number) {
    this.turn = turn;
    if (this.disposed) return;
    if (!this.pending) this.pending = this.load();
    await this.pending;
    if (!this.disposed) this.draw();
  }

  update(turn: number) { this.turn = turn; this.draw(); }
  focusProbe(probe: string | null) { this.highlight = probe; this.draw(); }
  reset() { if (this.viewer && this.camera) { this.viewer.setView(this.camera); this.viewer.render(); } }

  private fit() {
    if (!this.viewer) return;
    this.viewer.zoomTo({ model: this.key === 'sh' ? 1 : 0 });
    // Orthographic framing is width-based; keep the pocket legible on phones.
    const aspect = this.host.clientWidth / this.host.clientHeight;
    const pocketZoom = aspect < 1.5 ? 2.4 : 2.9;
    this.viewer.zoom((this.key === 'sh' ? 1.22 : pocketZoom) / Math.max(1, aspect));
    if (this.camera) this.camera[3] = this.viewer.getView()[3];
  }

  private async load() {
    const shell = this.host.closest<HTMLElement>('.pocket-stage')!;
    const status = shell.querySelector<HTMLElement>('.viewer-status')!;
    status.textContent = 'Loading pocket…';
    try {
      const get = async (file: string) => {
        const response = await fetch(this.baseUrl + file, { signal: this.controller.signal });
        if (!response.ok) throw new Error(`Structure request failed: ${response.status}`);
        return response.text();
      };
      const [mol, pdb, ligand] = await Promise.all([
        import('3dmol'), get(scenes[this.key].file),
        this.key === 'sh' ? get('sh-reference.sdf') : Promise.resolve(null),
      ]);
      if (this.disposed) return;
      const viewer = mol.createViewer(this.host, {
        backgroundColor: getComputedStyle(this.host).getPropertyValue('--color-paper').trim() || '#f8f7f3',
        backgroundAlpha: 1, antialias: true,
      });
      this.viewer = viewer;
      viewer.setProjection('orthographic');
      const protein = viewer.addModel(pdb, 'pdb');
      protein.setStyle({}, { stick: { color: '#c7cec0', radius: .10 } });
      if (ligand) {
        viewer.addModel(ligand, 'sdf').setStyle({}, { stick: { color: '#63766c', radius: .23 } });
      }
      this.fit();
      viewer.rotate(24, 'x'); viewer.rotate(-32, 'y');
      this.camera = [...viewer.getView()];
      this.host.dataset.atomCount = String(protein.selectedAtoms({}).length);
      // Only cropped pocket atoms enter the surface calculation.
      void viewer.addSurface(mol.SurfaceType.SAS, { color: '#a5b9a5', opacity: this.key === 'sh' ? .1 : .075 }, { model: 0 })
        .then(() => { if (!this.disposed) viewer.render(); }).catch(() => {});
      shell.dataset.ready = 'true';
      status.textContent = '';
      this.draw();
    } catch (error) {
      if (this.disposed) return;
      shell.dataset.ready = 'false';
      status.textContent = '3D unavailable · showing a coordinate projection';
      // Keep the real-coordinate SVG fallback and the rest of the figure usable.
      console.warn('Figure 1 pocket viewer:', error);
    }
  }

  private draw() {
    const viewer = this.viewer;
    if (!viewer || this.disposed) return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      if (this.disposed) return;
      viewer.removeAllShapes(); viewer.removeAllLabels();
      if (this.key === 'sh') { viewer.render(); return; }
      const { center, radius } = scenes[this.key];
      viewer.addSphere({ center, radius, color: '#92aa96', opacity: .045 });
      const visible = this.key === 'probes' ? observations.probes.features.filter(f => f.turn <= this.turn) : [];
      for (const f of visible) {
        const support = new Set(visible.filter(other => other.type === f.type && Math.hypot(other.x-f.x, other.y-f.y, other.z-f.z) <= 1.5).map(other => other.probe)).size;
        const emphasized = !this.highlight || f.probe === this.highlight;
        viewer.addSphere({
          center: f, radius: .14 + Math.min(support, 3) * .09,
          color: emphasized ? featureColors[f.type] : '#d9ddd3', opacity: 1,
          hoverable: true, clickable: true,
          hover_callback: () => {
            viewer.removeAllLabels();
            viewer.addLabel(`${f.probe} · ${f.type}`, { position: f, fontSize: 12, fontColor: '#20392e', backgroundColor: '#f8f7f3', backgroundOpacity: .9, borderThickness: 0, inFront: true });
            viewer.render();
          },
          unhover_callback: () => { viewer.removeAllLabels(); viewer.render(); },
        });
      }
      const chosen = this.key === 'receptor' && this.turn >= 39 ? hypotheses : this.key === 'probes' && this.turn >= 20 ? predictions : [];
      for (const p of chosen) {
        viewer.addSphere({ center: p, radius: .72, color: featureColors[p.type], opacity: 1 });
        viewer.addSphere({ center: p, radius: .91, color: featureColors[p.type], opacity: .09 });
      }
      viewer.render();
    });
  }

  dispose() {
    this.disposed = true; this.controller.abort(); this.resize.disconnect();
    cancelAnimationFrame(this.frame);
    if (this.viewer) {
      this.viewer.removeAllModels(); this.viewer.removeAllShapes(); this.viewer.removeAllSurfaces(); this.viewer.removeAllLabels();
      // Release the WebGL context on navigation; no background animation remains.
      const canvas = this.host.querySelector('canvas');
      const context = canvas?.getContext('webgl') || canvas?.getContext('experimental-webgl') as WebGLRenderingContext | null;
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.host.replaceChildren();
  }
}
