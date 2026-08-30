import type { ImageMetadata } from 'astro';
import trajectoryScorePreview from '../assets/images/research/TPS_visualisation.png';
import selfDoubtPreview from '../assets/images/research/sd.png';
import evidenceCollapsePreview from '../assets/images/research/db.png';
import confidentlyWrongPreview from '../assets/images/research/cwso.png';

export interface Publication {
  key: string;
  title: string;
  authors: string[];
  year: number;
  eprint: string;
  archivePrefix: string;
  primaryClass: string;
  note?: string;
  url: string;
  preview: ImageMetadata;
  selected: boolean;
  equalContribution?: string[];
}

export const publications: Publication[] = [
  {
    key: 'raghu2026properscoringrulesagentic',
    title: 'Proper Scoring Rules for Agentic Uncertainty Quantification',
    authors: ['Suresh Raghu', 'Satwik Pandey', 'Shashwat Pandey'],
    year: 2026,
    eprint: '2605.24756',
    archivePrefix: 'arXiv',
    primaryClass: 'cs.AI',
    note: 'Accepted as a poster at the CTB and FAGEN Workshops at ICML 2026',
    url: 'https://arxiv.org/abs/2605.24756',
    preview: trajectoryScorePreview,
    selected: true,
    equalContribution: ['Suresh Raghu', 'Satwik Pandey'],
  },
  {
    key: 'pandey2026selfdoubtuncertaintyquantificationreasoning',
    title: 'SELFDOUBT: Uncertainty Quantification for Reasoning LLMs via the Hedge-to-Verify Ratio',
    authors: ['Satwik Pandey', 'Suresh Raghu', 'Shashwat Pandey'],
    year: 2026,
    eprint: '2604.06389',
    archivePrefix: 'arXiv',
    primaryClass: 'cs.AI',
    note: 'Accepted as a poster at the FAGEN Workshop at ICML 2026',
    url: 'https://arxiv.org/abs/2604.06389',
    preview: selfDoubtPreview,
    selected: true,
    equalContribution: ['Suresh Raghu', 'Satwik Pandey'],
  },
  {
    key: 'raghu2026dontblinkevidencecollapse',
    title: "Don't Blink: Evidence Collapse during Multimodal Reasoning",
    authors: ['Suresh Raghu', 'Satwik Pandey'],
    year: 2026,
    eprint: '2604.04207',
    archivePrefix: 'arXiv',
    primaryClass: 'cs.AI',
    note: 'Accepted at the Actionable Interpretability and Scientific Understanding of Foundation Models Workshops at COLM 2026',
    url: 'https://arxiv.org/abs/2604.04207',
    preview: evidenceCollapsePreview,
    selected: true,
    equalContribution: ['Suresh Raghu', 'Satwik Pandey'],
  },
  {
    key: 'pandey2026confidentlywrongsilentlyso',
    title: 'Confidently Wrong, Silently So: Auditing Undetectable Failures of a Deployed On-Device Language Model',
    authors: ['Shashwat Pandey', 'Satwik Pandey', 'Suresh Raghu'],
    year: 2026,
    eprint: '2608.23663',
    archivePrefix: 'arXiv',
    primaryClass: 'cs.SE',
    note: 'Preprint. Under review.',
    url: 'https://arxiv.org/abs/2608.23663',
    preview: confidentlyWrongPreview,
    selected: false,
  },
];
