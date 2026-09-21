"""Export Figure 5's two CYP3A4 pocket treatments and screen coordinates.

Run from site-v2: uv run --with playwright python scripts/render-ipd-plausibility.py
Requires npm dependencies and a Playwright Chromium installation (or Chrome).
The blog uses the resulting static image, not a live WebGL viewer.
"""
from pathlib import Path
import base64
import json
import math
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/content/writing/data/smdd-tasks/smdd_002_P08684_0"
OUTPUT = ROOT / "src/assets/figures/ipd-plausibility"
SITE = [-17.180, -21.660, -11.470]
PROBES = [[-17.335, -22.389, -11.742], [-17.207, -20.980, -11.473]]
TARGETS = json.loads((SOURCE / "ground_truth.json").read_text())["points"]
HOTSPOT = TARGETS[4]["coords"]
CAMERA_TARGET = [(a + b) / 2 for a, b in zip(SITE, HOTSPOT)]
pdb = (SOURCE / "receptor.pdb").read_text()
atoms = [[float(line[30:38]), float(line[38:46]), float(line[46:54])]
         for line in pdb.splitlines() if line.startswith("ATOM  ")]
nearest = min(math.dist(SITE, atom) for atom in atoms)
mismatch = math.dist(SITE, TARGETS[4]["coords"])
assert round(nearest, 2) == 4.09, nearest
assert round(mismatch, 2) == 4.53, mismatch
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    try:
        browser = p.chromium.launch(headless=True)
    except Exception:
        browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width": 480, "height": 360}, device_scale_factor=3)
    page.set_content('<style>body{margin:0}#pocket{width:480px;height:360px;position:relative}</style><div id="pocket"></div>')
    page.add_script_tag(path=str(ROOT / "node_modules/3dmol/build/3Dmol-min.js"))
    scene = page.evaluate("""async ({pdb, points, target}) => {
      $3Dmol.setSyncSurface(true);
      const render = async (surfaceOpacity, cartoonOpacity) => {
        const host = document.getElementById('pocket');
        host.replaceChildren();
        const viewer = $3Dmol.createViewer(host, {
          backgroundColor: '#f8f7f3', antialias: true, disableFog: true,
          cartoonQuality: 14
        });
        const model = viewer.addModel(pdb, 'pdb');
        model.setStyle({}, {cartoon:{color:'#aeb5b0', opacity:cartoonOpacity}});
        const center = {x:target[0], y:target[1], z:target[2]};
        const local = {predicate: a => Math.hypot(a.x-center.x,a.y-center.y,a.z-center.z)<7};
        // Calculate against the complete receptor but reveal only a seven-
        // angstrom patch, so the boundary is a crop rather than fake chemistry.
        await viewer.addSurface('SES', {
          color:'#c9cdc8', opacity:surfaceOpacity
        }, local, {});
        viewer.setViewStyle({style:'ambientOcclusion', strength:0.7, radius:4});
        viewer.setProjection('orthographic');
        viewer.zoomTo(local);
        const view = viewer.getView();
        view[0] = -center.x; view[1] = -center.y; view[2] = -center.z;
        // This orientation puts the orange-to-teal displacement primarily in
        // the screen plane, then opens the pocket with a modest additional yaw.
        view.splice(4, 4, 0.5, 0.5, -0.5, 0.5);
        viewer.setView(view);
        viewer.rotate(34, 'y');
        viewer.rotate(10, 'x');
        viewer.zoom(1.75);
        viewer.setSlab(-4, 18);
        viewer.render();
        return {
          image:viewer.pngURI(),
          projected:viewer.modelToScreen(points.map(p=>({x:p[0],y:p[1],z:p[2]}))),
          view:viewer.getView(), slab:viewer.getSlab()
        };
      };
      const quiet = await render(0.30, 0.10);
      const ensemble = await render(0.39, 0.14);
      return {quiet, ensemble};
    }""", {"pdb": pdb, "points": [SITE, *PROBES, *[t["coords"] for t in TARGETS]], "target": CAMERA_TARGET})
    browser.close()

for name in ("quiet", "ensemble"):
    image = scene[name].pop("image")
    (OUTPUT / f"pocket-{name}.png").write_bytes(base64.b64decode(image.split(",")[1]))
assert scene["quiet"]["projected"] == scene["ensemble"]["projected"]
(OUTPUT / "projection.json").write_text(json.dumps({
    "source": "smdd_002_P08684_0/receptor.pdb",
    "renderer": "3Dmol local SES surface plus faint cartoon; shared orthographic camera",
    "width":480, "height":360,
    "cameraTarget": CAMERA_TARGET, "surfaceRadius": 7,
    "site":SITE, "probes":PROBES, "targets":TARGETS,
    "nearestReceptorAtom":nearest, "mismatch":mismatch,
    "projected": scene["quiet"]["projected"],
    "view": scene["quiet"]["view"], "slab": scene["quiet"]["slab"],
    "panelOpacity": {"quiet": {"surface": 0.30, "cartoon": 0.10},
                     "ensemble": {"surface": 0.39, "cartoon": 0.14}}
}, indent=2) + "\n")
print(f"Exported pocket; nearest atom {nearest:.2f} A; mismatch {mismatch:.2f} A")
