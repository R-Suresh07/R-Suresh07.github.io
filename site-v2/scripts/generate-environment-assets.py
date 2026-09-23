"""Generate Figure 1 molecular SVGs and cropped, public receptor structures.

Run with RDKit and numpy: python scripts/generate-environment-assets.py <SMDD repo>
No predicted conformations are invented when an archived pose is unavailable.
"""
import json
from pathlib import Path
import sys

import numpy as np
from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor, rdFMCS

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1])
ASSETS = ROOT / 'src/assets/figures/environment-explorer'
PUBLIC = ROOT / 'public/data/smdd/environment-explorer'
ASSETS.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

smiles = {
    'lo-reference': 'CCc1sc2nc(N)[nH]c(=O)c2c1Sc1ccccc1',
    'lo-f': 'CCc1sc2nc(N)[nH]c(=O)c2c1Sc1c(F)cccc1',
    'lo-cl': 'CCc1sc2nc(N)[nH]c(=O)c2c1Sc1c(Cl)cccc1',
    'lo-me': 'CCc1sc2nc(N)[nH]c(=O)c2c1Sc1c(C)cccc1',
    'sh-reference': 'CC1(C)OC[C@H](NC(=O)Nc2cc(Cl)ccc2Cl)[C@H](c2ccccc2)O1',
    'sh-c1': 'CN1C=C(C(=O)Nc2cc(Cl)ccc2Cl)C1c2ccccc2C(C)(C)O',
    'sh-c2': 'c1ccccc1C2CN(C2C(=O)Nc1cc(Cl)ccc1Cl)C(C)(C)c1ccccc1',
}
molecules = {key: Chem.MolFromSmiles(smi) for key, smi in smiles.items()}
assert all(mol is not None for mol in molecules.values())
for mol in molecules.values():
    rdDepictor.Compute2DCoords(mol)
for key, mol in molecules.items():
    reference = molecules[key[:2] + '-reference']
    if key.startswith('lo-') and key != 'lo-reference':
        rdDepictor.GenerateDepictionMatching2DStructure(mol, reference)
        shared = set(mol.GetSubstructMatch(reference))
    elif key.startswith('sh-') and key != 'sh-reference':
        common = rdFMCS.FindMCS([mol, reference], ringMatchesRingOnly=True,
                               completeRingsOnly=True, timeout=10)
        shared = set(mol.GetSubstructMatch(Chem.MolFromSmarts(common.smartsString)))
    else:
        shared = set(range(mol.GetNumAtoms()))
    changed = [a.GetIdx() for a in mol.GetAtoms() if a.GetIdx() not in shared]
    bonds = [b.GetIdx() for b in mol.GetBonds() if b.GetBeginAtomIdx() in changed or b.GetEndAtomIdx() in changed]
    drawer = Draw.MolDraw2DSVG(460, 340)
    options = drawer.drawOptions()
    options.clearBackground = False
    options.useBWAtomPalette()
    options.bondLineWidth = 1.7
    options.padding = .085
    options.fixedBondLength = 32
    options.minFontSize = 17
    options.maxFontSize = 22
    options.highlightRadius = .28
    options.setHighlightColour((.68, .85, .80))
    Draw.PrepareAndDrawMolecule(drawer, mol, highlightAtoms=changed, highlightBonds=bonds)
    drawer.FinishDrawing()
    (ASSETS / (key + '.svg')).write_text(drawer.GetDrawingText(), encoding='utf-8')
    print(key, 'atoms:', mol.GetNumAtoms(), 'changed:', len(changed))


def crop_pdb(source, center, radius, dest):
    lines = source.read_text().splitlines()
    atoms = []
    for line in lines:
        if not line.startswith('ATOM  ') or line[16] not in ' A':
            continue
        element = line[76:78].strip() or line[12:16].strip()[0]
        if element == 'H':
            continue
        xyz = np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])])
        atoms.append((line, xyz, element))
    residues = {line[21:27] for line, xyz, _ in atoms if np.linalg.norm(xyz - center) <= radius}
    selected = [(line, xyz, element) for line, xyz, element in atoms if line[21:27] in residues]
    (PUBLIC / dest).write_text('\n'.join(line for line, _, _ in selected) + '\nEND\n')
    return selected


def fallback_svg(atoms, center, name):
    """An actual coordinate projection provides a useful no-WebGL fallback."""
    points = np.array([xyz for _, xyz, _ in atoms]) - center
    # Fixed oblique camera for the static projection (not a second structure).
    rx, ry = np.deg2rad([24, -32])
    rot_x = np.array([[1,0,0],[0,np.cos(rx),-np.sin(rx)],[0,np.sin(rx),np.cos(rx)]])
    rot_y = np.array([[np.cos(ry),0,np.sin(ry)],[0,1,0],[-np.sin(ry),0,np.cos(ry)]])
    projected = points @ rot_x @ rot_y
    paths = []
    for i, xyz in enumerate(points):
        for j in range(i):
            d = np.linalg.norm(xyz - points[j])
            if 0.65 < d < 1.85:
                a, b = projected[i], projected[j]
                paths.append(f'M{360+a[0]*14:.1f},{225-a[1]*14:.1f}L{360+b[0]*14:.1f},{225-b[1]*14:.1f}')
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 450">'
    svg += '<g fill="none" stroke="#aeb9ae" stroke-width="1.5" opacity=".55">'
    svg += ''.join('<path d="' + p + '"/>' for p in paths) + '</g></svg>'
    (ASSETS / (name + '.svg')).write_text(svg)


config = {}
for key, task, center in [
    ('receptor', 'smdd_002_P14061_0', [16.836435, -4.977917, 1.407834]),
    ('probes', 'smdd_002_Q92769_0', [66.429176, 29.645226, 1.318500]),
]:
    source = SOURCE / 'smdd-harbor/tasks' / task / 'environment/receptor.pdb'
    atoms = crop_pdb(source, np.array(center), 12, key + '.pdb')
    fallback_svg(atoms, np.array(center), key + '-pocket')
    config[key] = {'center': dict(zip(['x','y','z'], center)), 'radius': 12,
                   'source': str(source.relative_to(SOURCE)).replace('\\', '/'),
                   'atoms': len(atoms), 'file': key + '.pdb'}

reference_path = SOURCE / 'smdd-harbor/tasks/smdd_003_4S0V_0/environment/reference.sdf'
reference = Chem.SDMolSupplier(str(reference_path), removeHs=True)[0]
assert reference is not None
center = np.array(reference.GetConformer().GetPositions()).mean(axis=0)
complex_path = reference_path.with_name('complex.pdb')
atoms = crop_pdb(complex_path, center, 7, 'sh-pocket.pdb')
fallback_svg(atoms, center, 'sh-pocket')
(PUBLIC / 'sh-reference.sdf').write_text(Chem.MolToMolBlock(reference) + '\n$$$$\n')
config['sh'] = {'center': dict(zip(['x','y','z'], center.tolist())), 'radius': 7,
                'source': str(complex_path.relative_to(SOURCE)).replace('\\', '/'),
                'atoms': len(atoms), 'file': 'sh-pocket.pdb'}
(ROOT / 'src/components/figures/data/environmentScenes.json').write_text(json.dumps(config, indent=2) + '\n')
print('Pocket atoms:', {k:v['atoms'] for k,v in config.items()})
