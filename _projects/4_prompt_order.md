---
layout: page
title: Prompt Order Analysis in VLMs
description: Investigating how prompt ordering affects vision-language model performance across tasks and providers
img: assets/img/prompt_order.png
importance: 4
category: document processing
related_publications: false
date: 2026-01-11
---

Research investigating whether image-before-text or text-before-image prompt ordering affects VLM performance across different model providers and task types.

## Problem

Vision-language models accept both text and images as input, but there's limited empirical guidance on optimal prompt ordering. Do VLMs perform better when images are placed before text queries, or vice versa? This question has practical implications for API usage, prompt engineering best practices, and understanding model architectural biases.

## Methodology

Systematic experiments using a 100-sample subset of OCRBenchv2 dataset covering:
- **20 distinct task types**: Text recognition, VQA, formula recognition, table parsing
- **69 unique datasets**: Diverse document types and visual challenges
- **Two prompt formats**: Image-first vs. text-first configurations
- **Multiple VLM providers**: Testing across different model architectures and sizes

Experiments conducted via self-hosted models through llama.cpp with results aggregated across tasks and model families.

## Key Findings

The research reveals systematic differences in VLM performance based on prompt ordering, challenging common assumptions about prompt construction. Findings suggest that optimal ordering may depend on task type, model architecture, and complexity of visual reasoning required.

## Resources

**Code**: [GitHub Repository](https://github.com/R-Suresh07/Prompt-Order-Analysis)
**Article**: [Medium Post - Why Your VLM Prompts Are Backwards (And How to Fix It)](https://medium.com/@sureshraghu0706/why-your-vlm-prompts-are-backwards-and-how-to-fix-it-4ad0c8fad429)
