import { traces, type TraceKey } from './environmentTraces';

type Actor = 'Agent' | 'Python' | 'ADMET' | 'Boltz' | 'Harness' | 'Submit';
type Entry = readonly [actor: Actor, subject: string, text: string, status?: 'pass' | 'fail'];

// Editorial summaries of observable actions and results, not transcript quotations.
// Each group ends at the corresponding ribbon moment; later results stay hidden.
const activity: Record<TraceKey, Entry[][]> = {
  lo: [
    [['Agent', '', 'Inspect the bound reference and task requirements.'], ['Python', 'reference', 'Read the ligand and protein files.']],
    [['ADMET', 'reference', 'Clearance 82.67 · candidate target ≤ 77.67.']],
    [['Agent', '', 'Propose fluoro, chloro and methyl substitutions.'], ['Python', 'analogues', 'All three pass the local structural checks.']],
    [['Agent', '', 'Measure the F analogue.'], ['ADMET', 'F analogue', 'Clearance 79.53 × · target ≤ 77.67.', 'fail']],
    [['Agent', '', 'Measure the Cl analogue.'], ['ADMET', 'Cl analogue', 'Clearance 76.52 ✓ · four held properties in range.', 'pass']],
    [['Agent', '', 'Measure the Me analogue.'], ['ADMET', 'Me analogue', 'Clearance 79.10 × · CYP3A4 also out of range.', 'fail']],
    [['Agent', '', 'Test the F analogue’s binding.'], ['Boltz', 'F analogue', 'Binding 0.954 ✓ · affinity −1.144 ✓.', 'pass']],
    [['Agent', '', 'Test the Cl analogue’s binding.'], ['Boltz', 'Cl analogue', 'Binding 0.921 ✓ · affinity −0.961 ✓.', 'pass']],
    [['Agent', '', 'Bring the Cl analogue’s measurements together.'], ['Python', 'verify', 'Recheck structure, properties and binding before submission.']],
    [['Submit', 'Cl analogue', 'Write the selected molecule to solution.smi.']],
  ],
  sh: [
    [['Agent', '', 'Inspect the reference ligand in its protein pocket.'], ['Python', 'reference', 'Read the starting structure and chemical scaffold.']],
    [['Agent', '', 'Propose two replacement scaffolds.'], ['Python', 'novelty', 'C1 and C2 pass both local novelty thresholds.']],
    [['Agent', '', 'Prepare the protein inputs for Boltz.'], ['Python', 'pocket', 'Assemble the protein sequence and pocket residues.']],
    [['Agent', '', 'Request a predicted pose for C1.'], ['Boltz', 'request', 'Invalid pocket format: expected [chain, residue] pairs.', 'fail']],
    [['Agent', '', 'Repair the pocket format and retry C1.'], ['Boltz', 'C1', 'Binding 0.647 × · required ≥ 0.700.', 'fail']],
    [['Agent', '', 'Evaluate the second scaffold.'], ['Boltz', 'C2', 'Binding 0.722 ✓ · required ≥ 0.700.', 'pass']],
    [['Agent', '', 'Inspect predicted structures for preserved contacts.'], ['Python', 'contacts', 'No benchmark interaction-preservation score is returned.']],
    [['Agent', '', 'Recheck C2 before submitting.'], ['Python', 'novelty', 'Tanimoto 0.433 ✓ · scaffold MCS 0.423 ✓.', 'pass']],
    [['Submit', 'C2', 'Write the selected scaffold to solution.smi.']],
  ],
  receptor: [
    [['Agent', '', 'Start with the receptor and a 12 Å search region.'], ['Python', 'inputs', 'Read receptor.pdb; no ligand ensemble is supplied.']],
    [['Python', 'pocket', 'Identify nearby polar, aromatic and hydrophobic residues.']],
    [['Agent', '', 'Propose ligand-side regions from receptor complementarity.']],
    [['Python', 'geometry', 'Check empty space and distances from receptor atoms.']],
    [['Python', 'checks', 'Check proposed coordinates and the output format.']],
    [['Agent', '', 'Select Donor, Aromatic and Hydrophobic hypotheses.'], ['Python', 'solution', 'Prepare three typed points; no ligand observations collected.']],
    [['Submit', '', 'Submit the three points in solution.csv.']],
  ],
  probes: [
    [['Agent', '', 'Inspect the receptor and public task requirements.'], ['Harness', 'inputs', 'Expose the task-bound molecular probe interface.']],
    [['Agent', '', 'Run a first molecular probe.'], ['Boltz', 'P001', 'Return a predicted bound pose.']],
    [['Harness', 'P001', 'Extract four ligand-side features in receptor coordinates.']],
    [['Agent', '', 'Try two more probe molecules.'], ['Boltz', 'P002 + P003', 'Return two predicted poses.']],
    [['Harness', 'features', '14 new features · 18 total from three probes.']],
    [['Agent', '', 'Expand the predicted ligand ensemble.'], ['Boltz', 'P004 + P005', 'Return two more predicted poses.']],
    [['Harness', 'P004', 'Extract seven more features · 25 total.'], ['Harness', 'P005', 'Bond-order assignment fails; no features returned.', 'fail']],
    [['Agent', '', 'Try a sixth molecular probe.'], ['Boltz', 'P006', 'Return the sixth predicted pose.']],
    [['Harness', 'P006', 'Extract eight features · 33 total from five probes.']],
    [['Agent', '', 'Compare recurring features across different probes.'], ['Python', 'comparison', 'Compare feature types and coordinates before choosing three points.']],
    [['Submit', '', 'Submit three typed ligand-side points.']],
  ],
};

// Hidden benchmark feedback belongs outside the agent's working evidence.
export const postHoc: Record<TraceKey, string> = {
  lo: 'All five checks pass. ✓',
  sh: 'Interaction similarity 0.833 ✓ · binding probability 0.884 ✓',
  receptor: '2 of 3 points match · complete task fails.',
  probes: 'All three points match. ✓',
};

for (const trace of traces) {
  if (activity[trace.key].length !== trace.moments.length) throw new Error(`Missing Figure 1 activity: ${trace.key}`);
}

export function activityWindow(key: TraceKey, index: number) {
  const trace = traces.find(t => t.key === key)!;
  return activity[key].slice(0, index + 1).flatMap((entries, moment) => entries.map(([actor, subject, text, status], item) => ({
    id: `${key}-${moment}-${item}`, actor, subject, text, status: status ?? '',
    turn: trace.moments[moment].turn, current: moment === index,
  }))).slice(-3);
}
