import observations from './environmentObservations.json';

export type TraceKey = keyof typeof observations;
export type Moment = { turn: number; lane: number; tag: string; title: string; detail: string };
export type Trace = {
  key: TraceKey; task: string; id: string; version: string; objective: string;
  state: string; note: string; outcome: string; takeaway: string; moments: Moment[];
};
export const lanes = ['Agent', 'Python', 'ADMET', 'Boltz'];
export const traces: Trace[] = [
  {
    key: 'lo', task: 'Lead Optimization', id: 'DHFR_11', version: 'Original harness',
    objective: 'Improve two properties. Keep the rest within range.', state: 'Which molecule passes every gate?',
    note: 'Selected measurements reconstructed from the trace; V1 had no candidate ledger. — = not yet measured here.',
    outcome: 'Passed · all five evaluator checks',
    takeaway: 'Every measurement has to stay attached to the molecule it actually tested.',
    moments: [
      { turn: 1, lane: 1, tag: 'inspect', title: 'Start with a bound reference molecule', detail: 'Read the ligand and protein files. The task requires lower clearance and stronger predicted affinity, while preserving other properties.' },
      { turn: 16, lane: 2, tag: 'reference', title: 'Measure the reference', detail: 'ADMET returns clearance 82.67. The candidate must reach 77.67 or lower; hERG, BBB, CYP3A4 and Caco2 must stay within their specified ranges.' },
      { turn: 40, lane: 1, tag: 'screen', title: 'Carry three analogues forward', detail: 'F, Cl and methyl substitutions pass the local structural checks. Their similarities to the reference are 0.725, 0.725 and 0.740.' },
      { turn: 41, lane: 2, tag: 'F', title: 'Fluorine misses the clearance target', detail: 'Clearance falls to 79.53, but the required threshold is 77.67. A chemically reasonable edit is not yet a passing molecule.' },
      { turn: 42, lane: 2, tag: 'Cl', title: 'Chlorine clears the property target', detail: 'Clearance reaches 76.52 and all four held-constant properties stay in range. Binding and affinity still need to be measured for this exact molecule.' },
      { turn: 43, lane: 2, tag: 'Me', title: 'Methyl introduces another failure', detail: 'Clearance is 79.10 and CYP3A4 is 0.780, outside its allowed range. Those results belong to the methyl analogue, not its close chemical neighbours.' },
      { turn: 49, lane: 3, tag: 'F', title: 'Good binding does not fix failed clearance', detail: 'The F analogue returns binding probability 0.954 and affinity −1.144. Its earlier clearance failure still rules it out.' },
      { turn: 50, lane: 3, tag: 'Cl', title: 'The Cl analogue preserves binding', detail: 'Boltz returns binding probability 0.921 and affinity −0.961. Both meet the task’s requirements.' },
      { turn: 57, lane: 1, tag: 'verify', title: 'Reconstruct the full conjunction', detail: 'The agent manually brings the Cl molecule’s structural checks, ADMET results and Boltz results back together before submission.' },
      { turn: 59, lane: 0, tag: 'submit', title: 'Submit the Cl analogue', detail: 'The 59-turn run reports five ADMET calls and two charged Boltz calls. The separate evaluator passes all five checks.' },
    ],
  },
  {
    key: 'sh', task: 'Scaffold Hopping', id: '4S0V_0', version: 'Original harness',
    objective: 'Change the scaffold. Preserve its interactions in the pocket.', state: 'Novel enough, but does it still bind?',
    note: 'Local novelty calculations and rollout Boltz scores. Binding probability alone does not measure interaction preservation.',
    outcome: 'Passed · interaction similarity 0.833 · binding 0.884',
    takeaway: 'Moving away from the reference is easy to measure. Preserving its interactions is a different question.',
    moments: [
      { turn: 1, lane: 1, tag: 'inspect', title: 'Read the reference complex', detail: 'The new molecule must have Tanimoto similarity below 0.5 and scaffold overlap below 0.65, while preserving the reference interaction pattern.' },
      { turn: 19, lane: 1, tag: 'propose', title: 'Find structurally distinct candidates', detail: 'The agent explores replacement scaffolds. Two candidates later sent to Boltz have local Tanimoto scores of 0.352 and 0.433.' },
      { turn: 23, lane: 1, tag: 'prepare', title: 'Prepare the protein for prediction', detail: 'The model reconstructs the protein sequence and pocket configuration needed to run Boltz.' },
      { turn: 24, lane: 3, tag: 'retry', title: 'A malformed request needs repair', detail: 'The first Boltz request fails. The agent fixes the input before obtaining a binding measurement.' },
      { turn: 26, lane: 3, tag: 'C1', title: 'The first candidate falls short', detail: 'Candidate 1 is locally novel, but its binding probability is 0.647, below the required 0.7.' },
      { turn: 27, lane: 3, tag: 'C2', title: 'The second candidate clears binding', detail: 'Candidate 2 returns binding probability 0.722. Its local scaffold overlap is 0.423 and Tanimoto similarity is 0.433.' },
      { turn: 40, lane: 1, tag: 'inspect', title: 'Interaction evidence remains difficult to obtain', detail: 'The agent continues trying to inspect structures and contacts. The scalar binding score does not itself establish preservation of the reference interactions.' },
      { turn: 43, lane: 1, tag: 'verify', title: 'Recheck the visible numerical gates', detail: 'The agent recomputes novelty and recalls the rollout binding probability. No benchmark interaction-preservation score is returned during the trace.' },
      { turn: 45, lane: 0, tag: 'submit', title: 'Submit candidate 2', detail: 'The later verifier reports interaction similarity 0.833 and binding probability 0.884. These are separate evaluation results, not the 0.722 score used during search.' },
    ],
  },
  {
    key: 'receptor', task: 'Interaction Points', id: 'P14061_0', version: 'Receptor only · original harness',
    objective: 'Predict three ligand-side hotspots from one receptor.', state: 'Three hypotheses, no ligand observations',
    note: 'The public receptor is cropped around the binding pocket. Final coordinates are from the submitted CSV; no hidden targets are shown.',
    outcome: 'Failed · 2 / 3 points matched',
    takeaway: 'Receptor chemistry suggests plausible interactions. It does not reveal which ones recur across binders.',
    moments: [
      { turn: 1, lane: 1, tag: 'inspect', title: 'One receptor is the starting evidence', detail: 'The model receives receptor.pdb, a pocket centre and a 12 Å search radius. The conserved ligand ensemble remains hidden.' },
      { turn: 11, lane: 1, tag: 'residues', title: 'Inspect the pocket chemistry', detail: 'Python identifies nearby polar, charged, aromatic and hydrophobic residues. These are receptor observations, not observed ligand features.' },
      { turn: 17, lane: 1, tag: 'sites', title: 'Propose chemically plausible regions', detail: 'The model searches for accessible points near pocket residues, reasoning about receptor–ligand complementarity.' },
      { turn: 28, lane: 1, tag: 'geometry', title: 'Check empty space around the receptor', detail: 'Distance calculations help avoid receptor atoms. They do not measure conservation across different bound ligands.' },
      { turn: 35, lane: 1, tag: 'check', title: 'Check distances and file format', detail: 'The agent checks the proposed points against the pocket and receptor geometry, then continues revising their feature types.' },
      { turn: 39, lane: 1, tag: 'revise', title: 'Commit to three ligand-side hypotheses', detail: 'The final CSV contains a Donor, an Aromatic point and a Hydrophobic point. No Boltz or ADMET call has been made.' },
      { turn: 40, lane: 0, tag: 'submit', title: 'Plausibility is not full recovery', detail: 'Two of the three points match in evaluation. This is the closest original-harness IPD trace, not a successful task.' },
    ],
  },
  {
    key: 'probes', task: 'Interaction Points', id: 'Q92769_0', version: 'Ligand probes · redesigned harness',
    objective: 'Predict three hotspots with evidence from predicted ligands.', state: 'Ligand features accumulate across probes',
    note: 'Analysis includes Python and harness feature extraction. Recorded 3D features accumulate around the public receptor; larger spheres mark final predictions, not hidden targets. Support uses 3D distances.',
    outcome: 'Passed · 3 / 3 points matched',
    takeaway: 'The harness turns predicted poses into ligand-side observations that the model can compare.',
    moments: [
      { turn: 1, lane: 1, tag: 'inspect', title: 'Bind the tools to the task', detail: 'The harness provides the public task requirements and a task-bound probe interface. The agent still inspects the receptor.' },
      { turn: 8, lane: 3, tag: 'P1', title: 'Run a first molecular probe', detail: 'Boltz predicts the bound pose of P001. A predicted pose is supporting evidence, not a conserved hotspot.' },
      { turn: 9, lane: 1, tag: 'read', title: 'Return ligand-side features', detail: 'The harness extracts four typed features from P001 and aligns their coordinates to the receptor. One pose alone cannot establish recurrence.' },
      { turn: 10, lane: 3, tag: 'P2–3', title: 'Try two different probes', detail: 'Two more molecules are evaluated. Stable probe IDs let the model associate each pose with the molecule that produced it.' },
      { turn: 11, lane: 1, tag: 'read', title: 'Compare observations across molecules', detail: 'P002 and P003 add fourteen features. The model now has ligand-derived evidence from three different predicted poses.' },
      { turn: 12, lane: 3, tag: 'P4–5', title: 'Expand the predicted ensemble', detail: 'P004 and P005 produce two more predicted poses. Their feature extraction is a separate operation.' },
      { turn: 13, lane: 1, tag: 'extract', title: 'One extraction succeeds; one fails', detail: 'P004 adds seven features. P005 fails during bond-order assignment, so it contributes no extracted features in this walkthrough.' },
      { turn: 14, lane: 3, tag: 'P6', title: 'Use a sixth Boltz call', detail: 'The model predicts P006. Six poses have now been generated, but a pose and usable feature observations are not the same thing.' },
      { turn: 15, lane: 1, tag: 'read', title: 'Thirty-three features from five probes', detail: 'P006 adds eight features. The raw transcript contains 33 returned ligand-side features across five successfully extracted probes.' },
      { turn: 20, lane: 1, tag: 'compare', title: 'Choose regions supported across probes', detail: 'The model compares feature clusters. Around the final Acceptor, Hydrophobic and Donor predictions, 3, 3 and 2 distinct probes support the same type within 1.5 Å.' },
      { turn: 21, lane: 0, tag: 'submit', title: 'Submit three structured predictions', detail: 'The harness writes the three typed points to CSV. The separate evaluator matches all three. This is a different task from the receptor-only example.' },
    ],
  },
];

export const predictions = [
  { type: 'Acceptor', x: 66.5, y: 31.0, z: -1.0 },
  { type: 'Hydrophobic', x: 65.8, y: 29.2, z: 1.0 },
  { type: 'Donor', x: 67.7, y: 29.6, z: 0.3 },
];
export const support = predictions.map(p => new Set(observations.probes.features.filter(f =>
  f.type === p.type && Math.hypot(f.x - p.x, f.y - p.y, f.z - p.z) <= 1.5,
).map(f => f.probe)).size);
if (support.join(',') !== '3,3,2') throw new Error('Figure 1: probe support changed.');

export { observations };

// Short labels stay on the canvas. Full, trace-grounded explanations are tooltips.
export const presentation: Record<TraceKey, { initial: number; subtitle: string; labels: string[]; summaries: string[] }> = {
  lo: {
    initial: 0, subtitle: 'Improve clearance + affinity · preserve four properties',
    labels: ['inspect', 'reference', 'propose', 'ADMET · F', 'ADMET · Cl', 'ADMET · Me', 'Boltz · F', 'Boltz · Cl', 'verify', 'submit'],
    summaries: ['Inspect the bound reference.', 'Measure the reference properties.', 'Three small edits pass the local structural checks.', 'F misses the clearance target.', 'Cl clears the property target; binding is still untested.', 'Me misses clearance and CYP3A4.', 'F binds, but its clearance still fails.', 'Cl now has passing binding and affinity measurements.', 'Bring the Cl analogue’s measurements together.', 'The Cl analogue passes all five evaluator checks.'],
  },
  sh: {
    initial: 0, subtitle: 'Change structure · preserve binding interactions',
    labels: ['inspect', 'propose', 'prepare', 'retry', 'Boltz · C1', 'Boltz · C2', 'contacts', 'verify', 'submit'],
    summaries: ['Inspect the bound reference.', 'Two novel scaffolds enter the shortlist.', 'Prepare the protein and pocket inputs.', 'Repair the malformed Boltz request.', 'C1 is novel, but binding falls below 0.7.', 'C2 clears binding. Preserved interactions remain a separate question.', 'Inspect structures for evidence of preserved contacts.', 'Recheck the visible novelty and binding gates.', 'C2 passes the later evaluator, including interaction preservation.'],
  },
  receptor: {
    initial: 5, subtitle: 'Three conserved ligand-side hotspots',
    labels: ['inspect', 'residues', 'propose', 'geometry', 'check', 'revise', 'submit'],
    summaries: ['One receptor, with a 12 Å search region.', 'Inspect the pocket’s chemical groups.', 'Propose plausible ligand-side regions.', 'Check distances from receptor atoms.', 'Check the proposed points and output format.', 'Three receptor-derived hypotheses; no ligand observations.', 'Two points match. The complete task still fails.'],
  },
  probes: {
    initial: 0, subtitle: 'Three conserved ligand-side hotspots',
    labels: ['inspect', 'probe 1', 'features', 'probes 2–3', 'features', 'probes 4–5', 'extract', 'probe 6', 'features', 'compare', 'submit'],
    summaries: ['Inspect the receptor and public task requirements.', 'Predict the first probe pose.', 'Four ligand-side features become visible.', 'Predict two more probes.', 'Features from three probes can now be compared.', 'Predict P004 and P005.', 'P004 adds features; P005 extraction fails.', 'Predict a sixth probe.', 'Five successful extractions yield 33 features.', 'The three chosen regions have support from 3, 3 and 2 probes.', 'All three submitted points match in evaluation.'],
  },
};

export const loMolecules = [
  { id: 'reference', name: 'Reference', created: 1, sim: '1.000', clearance: '82.67', measured: 1, binding: '—', affinity: '−0.6165', boltz: 999, held: 'baseline', passed: false },
  { id: 'f', name: 'F analogue', created: 40, sim: '0.725', clearance: '79.53', measured: 41, binding: '0.954', affinity: '−1.144', boltz: 49, held: 'pass', passed: false },
  { id: 'cl', name: 'Cl analogue', created: 40, sim: '0.725', clearance: '76.52', measured: 42, binding: '0.921', affinity: '−0.961', boltz: 50, held: 'pass', passed: true },
  { id: 'me', name: 'Me analogue', created: 40, sim: '0.740', clearance: '79.10', measured: 43, binding: '—', affinity: '—', boltz: 999, held: 'fail', passed: false },
];
