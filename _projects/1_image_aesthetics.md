---
layout: page
title: Image Aesthetics Quantification
description: CLIP-based aesthetics scoring system for hotel media ranking with domain adaptation
img: assets/img/image_aesthetics.png 
importance: 1
category: computer vision
related_publications: false
date: 2023-10-20
---

Built a CLIP-based aesthetics scorer for automated hotel image ranking, reducing manual curation effort while improving user experience through intelligent media prioritization.

## Problem

Hotel booking platforms need to display thousands of images per property, but manually curating and ranking images by aesthetic quality doesn't scale. Existing aesthetic scoring models are trained on generic datasets and fail to capture domain-specific preferences for hospitality imagery.

## Approach

Developed a multi-strategy scoring system using OpenAI's CLIP:
- **Fixed scoring**: Universal aesthetic reference vectors
- **Context-aware scoring**: Domain-specific aesthetic alignment  
- **Prompt ensembling**: Averaged predictions across multiple aesthetic descriptors

Key optimization: Precomputed positive/negative aesthetic centroids, reducing per-image comparisons from ~2,000 to 2 for low-latency production deployment.

## Results

- Successfully deployed for hotel media ranking across Adani's travel platform
- Domain adaptation improved correlation with human aesthetic judgments
- Integrated into content curation pipeline with sub-second inference times

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/Aesthetic-comparison.png" title="aesthetic scoring (Higher is better)" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

**Code**: [GitHub Repository](https://github.com/R-Suresh07/Image-Aesthetics-using-CLIP)  
**Write-up**: [Medium Article](https://medium.com/@sureshraghu0706/image-aesthetics-quantification-using-openai-clip-7bbb45e00147)