"""Generate aligned SVG depictions for the Cathepsin K candidate story.

Run from site-v2 with:
    uv run --with rdkit python scripts/generate-cathepsin-k-structures.py
"""

from __future__ import annotations

from pathlib import Path

from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor, rdFMCS


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "src/assets/figures/cathepsin-k"
IDS = ("C000", "C005", "C009", "C033")
SMILES = {
    "C000": "Cn1cnc2c(C#N)nc(-c3ccc(OCCC4CCNCC4)c(C(F)(F)F)c3)cc21",
    "C005": "CN(C)c1nc(-c2ccc(OCCC3CCNCC3)c(C(F)(F)F)c2)cc2c1ncn2C",
    "C009": "Cn1cnc2c(CO)nc(-c3ccc(OCCC4CCNCC4)c(C(F)(F)F)c3)cc21",
    "C033": "Cn1cnc2c(CCO)nc(-c3ccc(OCCC4CCNCC4)c(C(F)(F)F)c3)cc21",
}
# Match the pale edit highlight used by Fig. 10 (#B7E0DB at full SVG opacity).
TEAL = (0.72, 0.88, 0.86)
RUST = (0.73, 0.47, 0.40)


def main() -> None:
    molecules = [Chem.MolFromSmiles(SMILES[candidate_id]) for candidate_id in IDS]
    if any(molecule is None for molecule in molecules):
        raise ValueError("A selected candidate contains an invalid SMILES string")

    mcs = rdFMCS.FindMCS(
        molecules,
        ringMatchesRingOnly=True,
        completeRingsOnly=True,
        atomCompare=rdFMCS.AtomCompare.CompareElements,
        bondCompare=rdFMCS.BondCompare.CompareOrder,
    )
    core = Chem.MolFromSmarts(mcs.smartsString)
    if core is None:
        raise ValueError("Could not determine the shared scaffold")

    reference = molecules[0]
    rdDepictor.Compute2DCoords(reference)
    for molecule in molecules[1:]:
        rdDepictor.GenerateDepictionMatching2DStructure(molecule, reference, refPatt=core)

    OUTPUT.mkdir(parents=True, exist_ok=True)
    for candidate_id, molecule in zip(IDS, molecules, strict=True):
        accent = RUST if candidate_id == "C000" else TEAL
        core_atoms = set(molecule.GetSubstructMatch(core))
        changed_atoms = [atom.GetIdx() for atom in molecule.GetAtoms() if atom.GetIdx() not in core_atoms]
        changed_bonds = [
            bond.GetIdx()
            for bond in molecule.GetBonds()
            if bond.GetBeginAtomIdx() in changed_atoms or bond.GetEndAtomIdx() in changed_atoms
        ]

        drawer = Draw.MolDraw2DSVG(420, 270)
        options = drawer.drawOptions()
        options.clearBackground = False
        options.padding = 0.025
        options.bondLineWidth = 1.45
        options.fixedFontSize = 15
        options.minFontSize = 12
        options.maxFontSize = 17
        options.useBWAtomPalette()
        drawer.DrawMolecule(
            molecule,
            highlightAtoms=changed_atoms,
            highlightBonds=changed_bonds,
            highlightAtomColors={atom: accent for atom in changed_atoms},
            highlightBondColors={bond: accent for bond in changed_bonds},
            highlightAtomRadii={atom: 0.22 for atom in changed_atoms},
        )
        drawer.FinishDrawing()
        svg = drawer.GetDrawingText().replace("svg:", "")
        (OUTPUT / f"{candidate_id.lower()}.svg").write_text(svg, encoding="utf-8")

    print(f"Generated {len(molecules)} aligned structures in {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
