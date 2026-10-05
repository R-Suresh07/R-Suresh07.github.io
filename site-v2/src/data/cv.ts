export interface CvExperience {
  organization: string;
  organizationUrl: string;
  location: string;
  role: string;
  dates: string;
  highlights: string[];
}

export interface CvEducation {
  institution: string;
  institutionUrl: string;
  location: string;
  degree: string;
  dates: string;
}

export interface CvPublicationDetail {
  eprint: string;
  reviewStatus?: string;
  venue: string;
  summary: string;
}

export const cvExperience: CvExperience[] = [
  {
    organization: 'Looni Lab, Language Technologies Institute, Carnegie Mellon University',
    organizationUrl: 'https://mireshghallah.github.io/looni-lab.html',
    location: 'Remote',
    role: 'Independent Research Collaborator – Scientific Agents',
    dates: 'July 2026 – Present',
    highlights: [
      'Agent Failure Analysis: Audited long-horizon drug-design agents on SMDD-Bench; in 100 recoverable lead-optimization failures, 93% were primarily agent-control failures and 89% had already generated a passing molecule or were one local edit away, motivating a systematic study of how agent interfaces and state representations shape scientific-agent behavior.',
      'Scientific Agent Harnesses: Designed structured environments with immutable task specifications, canonical candidate state, evaluator-aligned verification, and task-bound RDKit, ADMET-AI, and Boltz2 tools; improved Qwen3.5-9B lead-optimization success from 16.3% to 51.0% on a matched 49-task evaluation.',
      'Harness Engineering Study: Led the manual harness-engineering investigation across SMDD-Bench and authored the accompanying technical article, Is Human Taste Overrated in Harness Engineering?; built reproducible Harbor / Prime Env infrastructure for budgeted scientific-agent rollouts, evaluator-backed rewards, trajectory logging, and distributed Boltz2 evaluation.',
    ],
  },
  {
    organization: 'VFS Global',
    organizationUrl: 'https://www.vfsglobal.com',
    location: 'New Delhi, India',
    role: 'Senior Manager – AI (Founding Lead, AI Engineering)',
    dates: 'May 2024 – Present',
    highlights: [
      'Adaptive Query Routing: Architected the document-extraction pipeline around an adaptive router that sends deterministic documents to lightweight parsers and ambiguous ones to reasoning VLMs, reaching 99.1% field-level extraction accuracy.',
      'Uncertainty-Gated Extraction Cascade: Used a cheap token-logit trigger to run Semantic Entropy only on suspect outputs, escalating flagged cases to a larger LLM and cutting critical extraction errors by 87%.',
      'Biometric Compliance Pipeline: Proposed and built a two-stage visa photo-verification system consisting of a cheap image-quality gate followed by a VLM stage for pose and occlusion checks, reducing cases requiring manual intervention by 78%.',
    ],
  },
];

export const cvPublicationDetails: CvPublicationDetail[] = [
  {
    eprint: '2605.24756',
    reviewStatus: 'NeurIPS 2026',
    venue: 'Accepted (poster) at NeurIPS 2026',
    summary: 'Developed strictly proper scoring rules for uncertainty over LM-agent trajectories, including a censored formulation for incomplete executions; showed that standard trajectory-level ECE and Brier score adaptations can reward miscalibrated forecasts, and demonstrated the resulting evaluation gap on long-horizon agent benchmarks with substantial trajectory censoring.',
  },
  {
    eprint: '2604.06389',
    reviewStatus: 'ICML 2026 Workshop',
    venue: 'Accepted (poster) at FAGEN Workshop @ ICML 2026',
    summary: 'Proposed the Hedge-to-Verify Ratio (HVR), a single-pass O(1) uncertainty signal that scores a reasoning trace by how much it hedges versus self-verifies. Traces with no hedging language are correct 96.1% of the time (at 25.4% coverage), and fusing HVR with the model’s verbalized confidence beats sampling-based Semantic Entropy on discrimination (p = 0.001) at 10× lower inference cost, across 7 models and 3 benchmarks.',
  },
  {
    eprint: '2604.04207',
    reviewStatus: 'COLM 2026 Workshops',
    venue: 'Accepted (poster) at Sci-FM & Actionable Interpretability Workshops @ COLM 2026',
    summary: 'Identified “evidence collapse”, a universal (9/9 model×dataset cells) decay of visual grounding during VLM reasoning that text-only entropy cannot detect, and designed a task-conditional vision veto that cuts selective risk by up to 1.9 pp at 90% coverage on MathVista, HallusionBench, and MMMU Pro.',
  },
  {
    eprint: '2608.23663',
    reviewStatus: 'NeurIPS 2026 Workshop',
    venue: 'Accepted at the On-Device Intelligence (ODI) Workshop @ NeurIPS 2026',
    summary: 'Audited a deployed on-device language model, finding confident failures that user-visible signals cannot reliably detect, and showed that a black-box consistency wrapper substantially improves reliability.',
  },
];

export const cvEducation: CvEducation[] = [
  {
    institution: 'Indian Institute of Technology, Madras',
    institutionUrl: 'https://study.iitm.ac.in/ds/',
    location: 'Tamil Nadu, India',
    degree: 'B.Sc. in Programming & Data Science',
    dates: 'Oct. 2020 – Jun. 2026',
  },
  {
    institution: 'Vellore Institute of Technology, Bhopal',
    institutionUrl: 'https://vitbhopal.ac.in/',
    location: 'Madhya Pradesh, India',
    degree: 'B.Tech in Computer Science and Engineering',
    dates: 'Oct. 2020 – Jun. 2024',
  },
];

export const cvResearchInterests = [
  'LLM Agents & Scientific Agents',
  'Reinforcement Learning & Tool Use',
  'Uncertainty Quantification',
  'Multimodal Reasoning',
] as const;
