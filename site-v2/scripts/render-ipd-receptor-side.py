"""Render the AChE close-up for Figure 5, with exact vector-overlay positions.

Run from site-v2:
    uv run --with playwright python scripts/render-ipd-receptor-side.py

Uses the installed 3Dmol renderer and Playwright Chromium (or local Chrome).
The submission coordinate and 50/73 support count come from the figure brief;
atom positions, target positions and conservation are checked against task data.
"""
from pathlib import Path
import base64
import json
import math
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/content/writing/data/smdd-tasks/smdd_002_P22303_0"
OUTPUT = ROOT / "src/assets/figures/ipd-receptor-side"
SUBMISSION = [122.255, 102.668, -113.899]
pdb = (SOURCE / "receptor.pdb").read_text()
atoms = {}
for line in pdb.splitlines():
    if line.startswith("ATOM  ") and line[21] == "A" and int(line[22:26]) in (350, 347):
        atoms[f"{int(line[22:26])}:{line[12:16].strip()}"] = [
            float(line[30:38]), float(line[38:46]), float(line[46:54])]
targets = json.loads((SOURCE / "ground_truth.json").read_text())["points"]
target = min((p for p in targets if p["types"] == ["Acceptor"]),
             key=lambda p: math.dist(p["coords"], SUBMISSION))
nd2 = atoms["350:ND2"]
distance = math.dist(nd2, target["coords"])
donor_distance = min(math.dist(nd2, p["coords"]) for p in targets if "Donor" in p["types"])
assert SUBMISSION == nd2
assert round(distance, 2) == 2.55
assert round(donor_distance, 2) == 3.10
assert math.isclose(target["conservation"], 50 / 73)

def dot(a, b):
    return sum(x * y for x, y in zip(a, b))

def unit(v):
    length = math.sqrt(dot(v, v))
    return [x / length for x in v]

# Put the complete ND2-to-target vector in the screen plane. Use the side-chain
# amide plane to keep CG, OD1 and ND2 separated, then roll 25 degrees diagonally.
d = unit([b - a for a, b in zip(nd2, target["coords"])])
amide = [a - b for a, b in zip(atoms["350:OD1"], nd2)]
vertical = unit([a - dot(amide, d) * b for a, b in zip(amide, d)])
angle = math.radians(25)
right = [math.cos(angle) * a - math.sin(angle) * b for a, b in zip(d, vertical)]
up = [math.sin(angle) * a + math.cos(angle) * b for a, b in zip(d, vertical)]
normal = [right[1]*up[2]-right[2]*up[1], right[2]*up[0]-right[0]*up[2], right[0]*up[1]-right[1]*up[0]]
matrix = [right, up, normal]
# Stable rotation-matrix to quaternion conversion, including 180-degree views.
trace = sum(matrix[i][i] for i in range(3))
if trace > 0:
    scale = math.sqrt(trace + 1) * 2
    quaternion = [(matrix[2][1]-matrix[1][2])/scale,
                  (matrix[0][2]-matrix[2][0])/scale,
                  (matrix[1][0]-matrix[0][1])/scale, scale/4]
else:
    i = max(range(3), key=lambda n: matrix[n][n])
    j, k = (i + 1) % 3, (i + 2) % 3
    scale = math.sqrt(1 + matrix[i][i] - matrix[j][j] - matrix[k][k]) * 2
    quaternion = [0, 0, 0, (matrix[k][j]-matrix[j][k])/scale]
    quaternion[i] = scale / 4
    quaternion[j] = (matrix[j][i]+matrix[i][j])/scale
    quaternion[k] = (matrix[k][i]+matrix[i][k])/scale

center = [(a + b)/2 for a, b in zip(nd2, target["coords"])]
points = {**atoms, "target": target["coords"]}
with sync_playwright() as p:
    try:
        browser = p.chromium.launch(headless=True)
    except Exception:
        browser = p.chromium.launch(channel="chrome", headless=True)
    page = browser.new_page(viewport={"width":480, "height":380}, device_scale_factor=3)
    page.set_content('<style>body{margin:0}#residue{width:480px;height:380px;position:relative}</style><div id="residue"></div>')
    page.add_script_tag(path=str(ROOT / "node_modules/3dmol/build/3Dmol-min.js"))
    scene = page.evaluate(r"""({pdb, points, center, quaternion}) => {
      const viewer = $3Dmol.createViewer(document.getElementById('residue'), {
        backgroundColor:'#f8f7f3', antialias:true, disableFog:true
      });
      const model = viewer.addModel(pdb, 'pdb');
      model.setStyle({}, {});
      model.setStyle({chain:'A',resi:350}, {
        stick:{color:'#bfc1bd',radius:0.12}, sphere:{color:'#c9cbc6',radius:0.18}
      });
      model.setStyle({chain:'A',resi:350,atom:'ND2'}, {
        stick:{color:'#bfc1bd',radius:0.12}, sphere:{color:'#e6862e',radius:0.19}
      });
      viewer.setProjection('orthographic');
      viewer.zoomTo({chain:'A',resi:350});
      const view = viewer.getView();
      view.splice(0,3,...center.map(v=>-v));
      view.splice(4,4,...quaternion);
      viewer.setView(view);
      viewer.setSlab(-20,20);
      viewer.render();
      const xyz = p=>({x:p[0],y:p[1],z:p[2]});
      const pair = viewer.modelToScreen([xyz(points['350:ND2']), xyz(points.target)]);
      viewer.zoom(112 / Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y));
      viewer.render();
      return {image:viewer.pngURI(), view:viewer.getView(),
        projected:Object.fromEntries(Object.entries(points).map(([key,p])=>[key,viewer.modelToScreen(xyz(p))]))};
    }""", {"pdb":pdb,"points":points,"center":center,"quaternion":quaternion})
    browser.close()

OUTPUT.mkdir(parents=True, exist_ok=True)
(OUTPUT / "residue.png").write_bytes(base64.b64decode(scene.pop("image").split(",")[1]))
(OUTPUT / "projection.json").write_text(json.dumps({
    "source":"smdd_002_P22303_0/receptor.pdb",
    "renderer":"3Dmol orthographic sticks; same raster in both panels",
    "width":480,"height":380,"cameraTarget":center,
    "submission":SUBMISSION,"target":target,"atoms":atoms,
    "distance":distance,"nearestDonorCompatibleDistance":donor_distance,
    "support":{"structures":50,"total":73},**scene
},indent=2)+"\n")
print(f"AChE: exact ND2 submission; acceptor {distance:.2f} A away; donor-compatible target {donor_distance:.2f} A away; support 50/73")
