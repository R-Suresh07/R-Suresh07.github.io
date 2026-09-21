"""Aligned, chemically exact Fig. 10 depictions from the supplied V2.2 SMILES.

Run in site-v2: uv run --with rdkit python scripts/generate-lo-contract-structures.py
"""
import json
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor, rdFMCS

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src/components/figures/data/loTaskContract.json'
OUTPUT = ROOT / 'src/assets/figures/lo-task-contract'


def main():
    states = json.loads(DATA.read_text(encoding='utf-8'))['states']
    molecules = [Chem.MolFromSmiles(s['smiles']) for s in states]
    if any(m is None for m in molecules):
        raise ValueError('Invalid candidate SMILES')
    reference = molecules[0]
    rdDepictor.Compute2DCoords(reference)
    for molecule in molecules[1:]:
        common = rdFMCS.FindMCS([reference, molecule], ringMatchesRingOnly=True,
                               completeRingsOnly=True, timeout=10)
        core = Chem.MolFromSmarts(common.smartsString)
        rdDepictor.GenerateDepictionMatching2DStructure(molecule, reference, refPatt=core)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for state, molecule in zip(states, molecules):
        highlights = []
        if state['id'] == 'C002':
            # Highlight both shortened ethyl arms, including their attachment bonds.
            for atom in molecule.GetAtoms():
                if atom.GetSymbol() == 'C' and not atom.GetIsAromatic() and atom.GetDegree() == 1:
                    neighbor = atom.GetNeighbors()[0]
                    if not neighbor.GetIsAromatic():
                        highlights.extend([atom.GetIdx(), neighbor.GetIdx()])
        if state['id'] == 'C004':
            highlights = [a.GetIdx() for a in molecule.GetAtoms() if a.GetSymbol() == 'F']
        bonds = [b.GetIdx() for b in molecule.GetBonds()
                 if b.GetBeginAtomIdx() in highlights or b.GetEndAtomIdx() in highlights]
        drawer = Draw.MolDraw2DSVG(520, 330)
        options = drawer.drawOptions()
        options.clearBackground = False
        options.useBWAtomPalette()
        options.bondLineWidth = 1.8
        options.padding = .12
        options.fixedBondLength = 27
        options.highlightRadius = .28
        options.setHighlightColour((.72, .88, .86))
        Draw.PrepareAndDrawMolecule(drawer, molecule, highlightAtoms=highlights, highlightBonds=bonds)
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText()
        (OUTPUT / f"{state['id'].lower()}.svg").write_text(svg, encoding='utf-8')
        print(f"{state['id']}: {molecule.GetNumAtoms()} atoms, highlighted {len(highlights)} edited atoms")


if __name__ == '__main__':
    main()
