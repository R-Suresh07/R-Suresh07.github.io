# V2 figure-panel examples

These files are renamed, byte-for-byte copies of V2 lead-optimization
artifacts selected as concrete examples for the five proposed figure panels.

| Panel | File | Evidence to highlight |
|---|---|---|
| Task specification | `task_specification__v2__gpt54__ABL1_3.jsonl` | The trajectory receives an authoritative structured requirement specification. |
| Task specification | `task_specification__v2__gpt54__ABL1_3__compiled_task_spec.json` | Lines 228-233 compile solubility once as baseline `-5.237`, comparator `>=`, threshold `-5.737`, direction `decrease`, and tolerance `0.5`. This is an analogous V2 case; no V2 rollout of the exact Fig. 13 `Cathepsin_K_20` task was found. |
| Candidate identity | `candidate_identity__v2__gpt54__ABL1_11.jsonl` | Turn 17 registers distinct related candidates as C007 and C008, while rejecting a new alias/lineage claim for the canonical graph already stored as C003: `Candidate C003 already has immutable parent C000`. |
| Evidence | `evidence_borderline_boltz__v2__gpt54__Cathepsin_K_13.jsonl` | Turn 28 attaches to C016: affinity `-1.6753426`, comparator `<=`, threshold `-1.6725892`, signed margin `+0.0027533`, replicate 1, and seven Boltz calls remaining. |
| Decision state | `decision_state__v2_0_1__gpt54__BACE1_11.jsonl` | Turn 20 compares C003, C004, and C009 with evidence stage, lineage, failed/missing gates, signed margins, complementary gates, and within-set dominance. This is V2.0.1, where the explicit decision view and `compare_candidates` tool were available. |
| Submission | `submission_gate__v2__gpt54__A2A_Adenosine_0.jsonl` | Turn 8 rejects forced submission of BBB-failing, Boltz-incomplete C003 while actionable evaluations remain; turn 16 accepts normal submission of fully passing C001. |

The harness organizes and gates recorded evidence. These examples do not show
that it removes stochasticity or makes the scientific decision for the model.
