export interface NewsItem {
  date: string;
  html: string;
}

export const news: NewsItem[] = [
  {
    date: '2024-05-02',
    html: 'Joined AI @ VFS as lead AI engineer',
  },
  {
    date: '2026-01-11',
    html: 'Published an article on prompt ordering in vision-language models: <a href="https://medium.com/@sureshraghu0706/why-your-vlm-prompts-are-backwards-and-how-to-fix-it-4ad0c8fad429">Why Your VLM Prompts Are Backwards (And How to Fix It)</a>',
  },
  {
    date: '2026-04-07',
    html: 'New preprint: <a href="https://arxiv.org/abs/2604.06389">SELFDOUBT: Uncertainty Quantification for Reasoning LLMs via the Hedge-to-Verify Ratio</a>. We introduce the Hedge-to-Verify Ratio (HVR), a single-pass uncertainty signal for reasoning LLMs that outperforms Semantic Entropy at about 10x lower inference cost.',
  },
  {
    date: '2026-04-05',
    html: 'New preprint: <a href="https://arxiv.org/abs/2604.04207">Don\'t Blink: Evidence Collapse during Multimodal Reasoning</a>. We identify evidence collapse, a decay of visual grounding during multimodal reasoning that text-only uncertainty signals cannot detect.',
  },
  {
    date: '2026-05-06',
    html: 'New preprint: <a href="https://arxiv.org/abs/2605.24756">Proper Scoring Rules for Agentic Uncertainty Quantification</a>. We introduce the Trajectory Proper Score (TPS), a predictor-agnostic family of strictly proper, trajectory-level scoring rules for evaluating uncertainty in LLM agents.',
  },
  {
    date: '2026-05-22',
    html: '<a href="https://arxiv.org/abs/2605.24756">Proper Scoring Rules for Agentic Uncertainty Quantification</a> was accepted as a poster at the <strong>Combining Theory and Benchmarks (CTB)</strong> workshop at ICML 2026. See y\'all in Seoul!',
  },
  {
    date: '2026-05-25',
    html: 'Two papers accepted at the <strong>Failure Modes in Agentic AI (FAGEN)</strong> workshop at ICML 2026: <a href="https://arxiv.org/abs/2604.06389">SELFDOUBT</a> and <a href="https://arxiv.org/abs/2605.24756">Proper Scoring Rules for Agentic Uncertainty Quantification</a>!',
  },
  {
    date: '2026-07-28',
    html: 'Happy to share that one of my papers, <a href="https://arxiv.org/abs/2604.04207">Don\'t Blink: Evidence Collapse during Multimodal Reasoning</a>, has been accepted to the <strong>Actionable Interpretability</strong> and <strong>Scientific Understanding of Foundation Models</strong> workshops at the <a href="https://x.com/COLM_conf">Conference on Language Modeling (COLM)</a> 2026!',
  },
  {
    date: '2026-08-26',
    html: 'New preprint: <a href="https://arxiv.org/html/2608.23663v2">Confidently Wrong, Silently So: Auditing Undetectable Failures of a Deployed On-Device Language Model</a>. We audit a deployed on-device language model, finding confident failures that user-visible signals cannot reliably detect while a black-box consistency wrapper substantially recovers reliability.',
  },
];
