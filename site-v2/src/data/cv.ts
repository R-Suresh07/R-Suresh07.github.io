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
    organization: 'Carnegie Mellon University – Language Technologies Institute – Looni Lab',
    organizationUrl: 'https://mireshghallah.github.io/looni-lab.html',
    location: 'Remote',
    role: 'Independent Research Collaborator – LLM Agents for Scientific Discovery',
    dates: 'July 2026 – Present',
    highlights: [
      'Scientific Agent Harnesses: Audited and redesigned SMDD-Bench agents for long-horizon drug design, adding structured state, evaluator-aligned checks, and task-bound RDKit, ADMET-AI, and Boltz2 tools; improved Qwen3.5-9B lead-optimization success from 16.3% to 51.0%.',
      'RL Environment for Scientific Agents: Building a Harbor + Prime Env environment for reproducible agent rollouts with budgeted scientific tools, evaluator-backed rewards, and trajectory logging for training open-source LLM agents.',
    ],
  },
  {
    organization: 'VFS Global',
    organizationUrl: 'https://www.vfsglobal.com',
    location: 'New Delhi, India',
    role: 'Senior Manager – AI (Founding Lead, AI Research Engineering)',
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
    reviewStatus: 'Under Review',
    venue: 'Accepted (poster) at CTB & FAGEN Workshops @ ICML 2026',
    summary: 'Developed strictly proper scoring rules for uncertainty over LM-agent trajectories, including a censored-trace formulation for incomplete executions; showed that standard trajectory-level adaptations of ECE and Brier score need not remain strictly proper in agentic settings.',
  },
  {
    eprint: '2604.06389',
    reviewStatus: 'Under Review',
    venue: 'Accepted (poster) at FAGEN Workshop @ ICML 2026',
    summary: 'Proposed the Hedge-to-Verify Ratio (HVR), a single-pass O(1) uncertainty signal that scores a reasoning trace by how much it hedges versus self-verifies. Traces with no hedging language are correct 96.1% of the time (at 25.4% coverage), and fusing HVR with the model’s verbalized confidence beats sampling-based Semantic Entropy on discrimination (p = 0.001) at 10× lower inference cost, across 7 models and 3 benchmarks.',
  },
  {
    eprint: '2604.04207',
    venue: 'Accepted (poster) at Sci-FM & Actionable Interpretability Workshops @ COLM 2026',
    summary: 'Identified “evidence collapse”, a universal (9/9 model×dataset cells) decay of visual grounding during VLM reasoning that text-only entropy cannot detect, and designed a task-conditional vision veto that cuts selective risk by up to 1.9 pp at 90% coverage on MathVista, HallusionBench, and MMMU Pro.',
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
