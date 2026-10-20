// Transcribed from Suresh_Raghu_CV.pdf. Keep the web CV aligned with the download.
export const cvPdfUrl = '/cv/Suresh_Raghu_CV.pdf';

export const cvContact = {
  location: 'New Delhi, India',
  phone: '+91-7904210795',
  email: 'sureshraghu0706@gmail.com',
  profiles: [
    { label: 'Website', url: 'https://r-suresh07.github.io/' },
    { label: 'Scholar', url: 'https://scholar.google.com/citations?user=gPMRZWsAAAAJ' },
    { label: 'GitHub', url: 'https://github.com/R-Suresh07' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/suresh-raghu' },
    { label: 'arXiv', url: 'https://arxiv.org/a/raghu_s_1.html' },
  ],
} as const;

export interface CvExperience {
  organization: string;
  organizationUrl: string;
  location: string;
  role: string;
  dates: string;
  advisors?: string;
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
  venue: string;
  code?: string;
}

export interface CvProject {
  title: string;
  context: string;
  url: string;
  linkLabel: string;
  highlights: string[];
}

export const cvResearchInterests = [
  'Long-horizon LLM agents',
  'RL with partially verifiable rewards',
  'Evaluation & UQ',
  'Open-ended problem solving',
] as const;

export const cvEducation: CvEducation[] = [
  {
    institution: 'Indian Institute of Technology Madras',
    institutionUrl: 'https://study.iitm.ac.in/ds/',
    location: 'Tamil Nadu, India',
    degree: 'B.Sc. in Programming & Data Science',
    dates: 'Oct. 2020 – Jun. 2026',
  },
  {
    institution: 'Vellore Institute of Technology Bhopal',
    institutionUrl: 'https://vitbhopal.ac.in/',
    location: 'Madhya Pradesh, India',
    degree: 'B.Tech. in Computer Science and Engineering',
    dates: 'Oct. 2020 – Jun. 2024',
  },
];

export const cvPublicationDetails: CvPublicationDetail[] = [
  { eprint: '2605.24756', venue: 'NeurIPS 2026 · ICML 2026 Workshops' },
  { eprint: '2604.06389', venue: 'ICML 2026 Workshop', code: 'https://github.com/satwik2711/SelfDoubt' },
  { eprint: '2604.04207', venue: 'COLM 2026 Workshops', code: 'https://github.com/R-Suresh07/Dont-Blink' },
  { eprint: '2608.23663', venue: 'NeurIPS 2026 Workshop' },
];

export const cvExperience: CvExperience[] = [
  {
    organization: 'Looni Lab, Carnegie Mellon University',
    organizationUrl: 'https://mireshghallah.github.io/looni-lab.html',
    location: 'Remote',
    role: 'Research Collaborator',
    dates: 'Jul. 2026 – Present',
    advisors: 'Prof. Niloofar Mireshghallah, Prof. Aviral Kumar',
    highlights: [
      'Work toward training language-model agents for molecular discovery with supervised fine-tuning and RL, focusing on iterative experimentation, scientific tool use, and learning from computational feedback.',
      'Develop containerized molecular-design environments with verifiable rewards and trajectory logging to support agent training and evaluation on SMDD-Bench.',
      'Investigate how agent representations, persistent memory, and evaluation budgets influence multi-step scientific search, informing the design of training tasks and feedback.',
    ],
  },
  {
    organization: 'VFS Global',
    organizationUrl: 'https://www.vfsglobal.com',
    location: 'New Delhi, India',
    role: 'Senior Manager, AI (since Aug. 2026)',
    dates: 'May 2024 – Present',
    highlights: [
      'Founding lead of AI engineering (team of 8+), building LLM and VLM systems for document understanding and fraud detection across 30K+ visa applications per day in multiple countries. Our document-processing platform won the Aegis Graham Bell Award (2026, Innovation in Gen AI).',
      'Built a case-review agent with a sandboxed code interpreter that cross-checks 25+ documents per application, runs calculations and conversions across them, and writes a review report flagging gaps, cutting per-case review time 6× (30+ to under 5 minutes).',
      'Built uncertainty-gated document extraction: a token-logit signal triggers semantic-entropy estimation on suspect fields, and low-confidence outputs escalate to a larger model or human review. Cut critical extraction errors by 87%.',
      'Trained Qwen2.5-VL-7B online on streaming passport data (never stored, for PII compliance) with weekly checkpoint gating; it matched Gemini 2.5 Pro across 110+ nationalities and replaced it in production.',
    ],
  },
  {
    organization: 'Adani Digital Labs',
    organizationUrl: 'https://www.adanidigitallabs.com/',
    location: 'Gurugram, India',
    role: 'Applied Machine Learning Intern',
    dates: 'Jun. 2023 – Apr. 2024',
    highlights: [
      'Built a few-shot image classifier from frozen DINOv2 embeddings and an SVM, trained with limited labels; reached 93% precision on 500+ held-out images and deployed it to auto-tag untagged hotel imagery across ~150K properties.',
      'Built multimodal product search over Adani’s airport retail inventory (~20K SKUs), using CLIP for text and image retrieval and GPT-4 Vision for attribute extraction.',
    ],
  },
];

export const cvProjects: CvProject[] = [
  {
    title: 'Harness Engineering for Scientific Agents',
    context: 'with K. Han, A. Kumar, N. Mireshghallah',
    url: '/writing/is-human-taste-overrated-in-harness-engineering/',
    linkLabel: 'Blog',
    highlights: [
      'Asked whether changing only the harness (tools, state, observations) can fix scientific-agent failures; diagnosed failure modes of frontier models and Qwen3.5-9B on SMDD-Bench across lead optimization, interaction-point discovery, and scaffold hopping.',
      'Redesigned harnesses around those diagnoses (an authoritative candidate ledger with cached oracle calls; ligand-side probe molecules), improving lead optimization from 13 to 33/68 tasks and interaction-point recovery from 10 to 30/75 without retraining.',
      'Compared manual design against automated harness search (Meta-Harness, 2,640 trajectories): manual design won where gains needed new representations or evidence (lead optimization, p = 5 × 10⁻⁴), while automated search found the best scaffold-hopping harness (2 → 5/52).',
    ],
  },
  {
    title: 'Proper Scoring Rules for Agentic Uncertainty',
    context: 'NeurIPS 2026',
    url: 'https://arxiv.org/abs/2605.24756',
    linkLabel: 'Paper',
    highlights: [
      'Asked whether an agent’s per-step uncertainty means what it says, not just whether it ranks well; showed that AUROC, Trajectory ECE (resolution-blind), and scalarized Trajectory Brier do not strictly elicit the success-probability trace.',
      'Introduced the Trajectory Proper Score (TPS), strictly proper trajectory-level scoring rules built from any strictly proper binary score; proved strict elicitation and extended it to step-budget censored runs by projecting onto the observed prefix.',
      'Across four benchmarks, evaluator choice changes conclusions: on Tau2-Bench, AUROC barely separates raw and recalibrated confidence (0.3 SE) while TPS shows the raw stream is worse than a base-rate guess (43 SE); on WebShop, complete-only evaluation drops the 47% of runs that hit the step budget, and censored-aware scoring shifts the verdict (95% CI excludes zero).',
    ],
  },
  {
    title: 'SELFDOUBT: Uncertainty from Reasoning Traces',
    context: 'ICML 2026 Workshop',
    url: 'https://arxiv.org/abs/2604.06389',
    linkLabel: 'Paper',
    highlights: [
      'Asked whether one reasoning trace can signal uncertainty when APIs expose no logits.',
      'Proposed the Hedge-to-Verify Ratio (doubt expressed vs. doubt checked), with model-specific markers discovered from 90 unlabeled traces, fused with verbalized confidence; needs no training or model internals.',
      'Across 7 models and 3 benchmarks, zero-hedge traces are correct 96% of the time at 25% coverage; the full score beats semantic entropy on AUROC (p = 0.001) at 10× lower cost, and a deferral cascade reaches 89.7% accuracy at 71% coverage.',
    ],
  },
  {
    title: 'Evidence Collapse in Multimodal Reasoning',
    context: 'COLM 2026 Workshops',
    url: 'https://arxiv.org/abs/2604.04207',
    linkLabel: 'Paper',
    highlights: [
      'Found that reasoning VLMs lose grounding as they think: evidence attention falls 53–91% in all nine model–dataset settings, invisible to text-only entropy.',
      'Showed the risk is task-conditional: confident-but-blind predictions are hazardous on visual-reference tasks but benign on symbolic ones; a targeted vision veto cuts selective risk by up to 1.9 pp at 90% coverage, helping exactly where predicted.',
    ],
  },
];

export const cvSkills = [
  { category: 'Languages & Frameworks', items: ['Python', 'C++', 'PyTorch', 'Transformers'] },
  { category: 'Training & Inference', items: ['FSDP2', 'tensor parallelism (DTensor)', 'QLoRA', 'vLLM', 'Ray'] },
  { category: 'Environments & Tools', items: ['Harbor', 'Prime Env', 'Docker', 'Redis'] },
] as const;
