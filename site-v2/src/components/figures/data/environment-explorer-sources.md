# Figure 1 sources and conventions

`environmentObservations.json` contains tool names, turn numbers, returned oracle
measurements, and extracted ligand features from four archived SMDD-Bench traces.
Each source has a relative path and SHA-256 digest. It contains no model reasoning.
Regenerate from `site-v2` with:

```sh
python scripts/extract-environment-explorer.py /path/to/SMDD-Bench-main
```

`environmentTraces.ts` supplies editorial summaries of selected moments, not
verbatim quotations. Ribbon spacing denotes order, not elapsed time. Measurements
appear beneath the molecules as they arrive in the trace; this presentation is
an editorial reconstruction, not a ledger available to the original agent.

`environmentActivity.ts` supplies the compact working trace. It shows at most
three recent entries through the selected ribbon moment, distinguishing agent
actions, tool results and submission. Evaluator feedback is stored separately
and displayed in a dashed post-hoc block outside the working trace. These are editorial
summaries, not verbatim assistant messages or internal reasoning. The failed
Scaffold Hopping request at turn 24 expects `[chain_id, residue_number]` pairs;
its repair appears with the subsequent C1 evaluation. Evaluator results never
appear before the final submission moment.

`generate-environment-assets.py` generates transparent RDKit SVGs from the actual
reference and candidate SMILES, with aligned LO depictions. Teal highlights the
added substituent in LO and atoms outside a ring-complete MCS in Scaffold Hopping.
That depiction-only MCS does not recalculate the displayed novelty measurements.

The pocket viewers use cropped public receptor coordinates from the corresponding
`smdd-harbor/tasks/*/environment` directories. `environmentScenes.json` records
the source paths and pocket centers. Cropping retains whole residues with atoms
within 12 Å of the IPD center (7 Å for the scaffold-hop reference inset). The
static fallback SVGs are oblique projections of those same coordinates. Probe
features and final hypotheses use their recorded 3D coordinates, and recurrence
counts use typed features and 3D distances. No predicted ligand conformations
are synthesized: the full Boltz pose files were not archived locally. The small
Scaffold Hopping inset therefore shows only the real reference complex.

Regenerate molecular assets with RDKit and numpy installed:

```sh
python scripts/generate-environment-assets.py /path/to/SMDD-Bench-main
```

Verified outcomes, relative to the SMDD-Bench repository:

| Trace | Outcome source |
| --- | --- |
| DHFR_11, LO V1 | `evaluator/results/qwen35_9b_lite_leadopt_eval/smdd_004_DHFR_11/result.json`: all five checks passed |
| 4S0V_0, Scaffold Hopping V1 | `results/blog/scaffold_hopping/v1/smdd_003_4S0V_0__CdLrCm6/verifier/reward.json`: reward 1, interaction similarity 0.833333, binding probability 0.883957 |
| P14061_0, IPD V1 | `results/blog/ipd/v1/selection_manifest.json`: 2/3 points, reward 0; none of the 25 V1 tasks succeeded |
| Q92769_0, IPD V2.2 | `results/blog/ipd/v2/smdd_002_Q92769_0/result.json`: passed, pharmacophore match 1.0 |

The scaffold-hop rollout score (0.721915) and later verifier score (0.883957)
are distinct measurements. Verifier outcomes appear only after submission.
Novelty figures beneath the molecules and in the hover inspector are local trace
calculations. Structures are ordered Reference, C1, C2; their screen positions
do not encode measurements. Binding values appear only after each recorded call.

The IPD evidence toggle now uses Q92769 throughout, moving between the beginning
of that run and its accumulated probe evidence. Both modes use the same live
viewer, receptor, camera and coordinate frame. No V1/V2 comparison is implied;
the archived P14061 V1 example remains in the source data but is no longer
displayed in Figure 1. Contrary to the initial design notes, Q92769's raw
transcript contains six predicted poses but only five successful feature
extractions: P005 fails bond-order assignment at turn 13. The 33 returned features
support the final Acceptor, Hydrophobic and Donor points with respectively 3, 3
and 2 distinct probes within 1.5 Å in 3D. This is checked at build time.

LO's ADMET count includes the failed request at turn 14, consistent with the
transcript's five-call summary. Boltz counts include successful predictions;
malformed requests rejected before prediction do not increment the count.
