---
layout: page
title: 3-Tiered Data Extraction from Images
description: Hybrid OCR and LLM system for intelligent information extraction
img: assets/img/data_extraction.png
importance: 2
category: document processing
date: 2023-11-17
---

Developed a tiered extraction system combining traditional OCR with large language models to handle diverse document formats with varying complexity and privacy requirements.

## Architecture

Three-tier approach matching extraction complexity to document needs:

**Tier 1**: GPT-4 Vision for complex, unstructured documents requiring reasoning  
**Tier 2**: Azure Cognitive Services for standard structured documents  
**Tier 3**: Local PaddleOCR + Zephyr-7B for privacy-sensitive documents  

## Key Insights

- Different document types have fundamentally different extraction requirements
- Privacy-performance tradeoffs can be optimized through intelligent routing
- Local LLMs achieve competitive accuracy for structured extraction tasks

This work directly informed my later production systems at VFS Global, where intelligent routing between models became critical for balancing accuracy, latency, and cost at scale.

**Code**: [GitHub Repository](https://github.com/R-Suresh07/Information-Extraction-from-Images)  
**Write-up**: [Medium Article](https://medium.com/@sureshraghu0706/from-images-to-insights-3-tiered-data-extraction-from-images-with-ocr-and-large-language-models-0c07754813cc)