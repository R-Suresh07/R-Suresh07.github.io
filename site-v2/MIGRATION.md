# al-folio to Astro migration plan

Status: Phase 1 architecture and Phase 2 content port implemented inside `site-v2`. No existing al-folio files, deployment configuration, or GitHub Actions workflows have been changed.

## Phase 2 migration record

Phase 2 is a mechanical content port. Existing wording is retained; conflicting sources have not been reconciled.

### Implemented source-to-destination mapping

| Existing source | Astro destination | Migration treatment |
| --- | --- | --- |
| `_pages/about.md` | `src/data/site.ts`, `src/pages/index.astro` | Existing subtitle, availability, location, and biography copied without rewriting; HTML middle-dot entity normalized to Unicode |
| `_config.yml` identity/contact fields | `src/data/site.ts`, shared layout/header/footer | Existing name, description, and contact note copied |
| `_data/socials.yml` | `src/data/socials.ts` | Email, GitHub, LinkedIn, Scholar, ORCID, arXiv, and Medium values converted to typed links |
| `assets/img/profile.jpeg` | `src/assets/images/profile/profile.jpeg` | Byte-preserving copy |
| `_bibliography/papers.bib` | `src/data/publications.bib` | Byte-preserving canonical copy |
| `_bibliography/papers.bib` display fields | `src/data/publications.ts` | Titles, authors, year, eprint, archive, class, notes, URL, preview, and selection flags transcribed without new summaries |
| `_news/announcement_2.md` through `announcement_8.md` | `src/data/news.ts` | All seven dated entries copied; Markdown links/emphasis converted mechanically to trusted HTML |
| `_projects/1_image_aesthetics.md` | `src/content/projects/image-aesthetics.mdx` | Full frontmatter and body preserved; Liquid figure converted to `Figure.astro` |
| `_projects/2_data_extraction.md` | `src/content/projects/data-extraction.mdx` | Full frontmatter and body preserved as MDX |
| `_projects/3_multimodal_search.md` | `src/content/projects/multimodal-search.mdx` | Full frontmatter and body preserved as MDX |
| `_projects/4_prompt_order.md` | `src/content/projects/prompt-order.mdx` | Full frontmatter and body preserved as MDX |
| Medium links in `_projects`, `_news`, and `_config.yml` | `src/data/external-writing.ts`, `/writing` | Four explicit external records; no scraping or first-party copies |
| `assets/pdf/Suresh_Raghu_Resume.pdf` | `public/cv/Suresh_Raghu_Resume.pdf` | Byte-preserving copy linked from `/cv` |
| `assets/json/resume.json` | `src/data/resume.source.json` | Byte-preserving migration source; not rendered or rewritten |
| Personalized publication/project images | `src/assets/images/research/`, `src/assets/images/projects/` | Byte-preserving copies imported through Astro's image pipeline |

### Assets copied in Phase 2

- Profile: `profile.jpeg`.
- Publication previews: `TPS_visualisation.png`, `sd.png`, `db.png`.
- Projects: `image_aesthetics.png`, `Aesthetic-comparison.png`, `data_extraction.png`, `analyses.png`, `prompt_order.png`.
- Stable/source assets: `Suresh_Raghu_Resume.pdf`, `publications.bib`, `resume.source.json`.

No other personalized asset references occur in the migrated About, BibTeX, news, or project sources.

### Intentionally not migrated in Phase 2

- `_data/cv.yml`, `_pages/about_einstein.md`, `_pages/profiles.md`, `_pages/teaching.md`, and `_data/repositories.yml`: al-folio demo/template data, including Albert Einstein and unrelated repository records.
- `_books/the_godfather.md`, `_pages/books.md`, and its cover: demo bookshelf content.
- `_pages/blog.md`, `_pages/publications.md`, `_pages/projects.md`, and `_pages/news.md`: Jekyll/Liquid presentation templates replaced by Astro routes; authored data behind them was migrated.
- `assets/bibliography/2018-12-22-distill.bib` and the empty `assets/bibliography/papers.bib`: demo/empty assets rather than the active bibliography.
- Unreferenced gallery/template images, tutorial videos/audio, notebooks, Plotly/HTML examples, al-folio CSS/JavaScript, Bootstrap, Font Awesome, and bundled webfonts: not referenced by personalized authored content.
- The external Medium RSS response: remote content was not scraped. Only article URLs represented locally were ported.

### Unresolved source conflicts

- `_pages/about.md` says “AI Lead at VFS Global” and “over a million documents daily”; `assets/json/resume.json` uses “Manager -- AI (Founding Lead, AI Research Engineering)” and `180K+ documents daily`. The homepage retains the currently rendered About wording; the resume JSON remains unrendered source data.
- The current CV sources include a Carnegie Mellon LTI independent research collaboration that is absent from the About biography. It was not added to the homepage.
- `_bibliography/papers.bib` contains no acceptance note for **Don't Blink**; the resume JSON/PDF lists Sci-FM and Actionable Interpretability workshops at COLM 2026. The research display follows the active BibTeX and adds no note.

### Mechanical representation differences

- The Image Aesthetics Liquid include was replaced with `Figure.astro`; its existing caption is preserved and required alt text was added for accessibility.
- Jekyll Markdown links/emphasis in news are stored as equivalent HTML so the visible wording and formatting remain intact.
- Three older project files label their Medium links generically as “Medium Article.” Their writing-index titles are mechanically taken from the existing URL slugs; no descriptions were invented. The prompt-order article title was already explicit in local project/news content.
- The Phase 1 fixture essay remains unchanged. No Harness Engineering article or new first-party essay was created.

## Goals and route map

| Route | Purpose | Primary source |
| --- | --- | --- |
| `/` | Minimal personal/research homepage | `_pages/about.md`, `_config.yml`, `_data/socials.yml`, selected news and research records |
| `/research` | Selected research, publications, and selected projects | `_bibliography/papers.bib`, `_projects/*.md`, publication/project images |
| `/writing` | Native essays plus clearly marked external writing links | Future Astro MDX collection; existing Medium links/feed as migration inputs |
| `/writing/[slug]` | Long-form technical essay | `src/content/writing/<slug>.mdx` |
| `/cv` | Concise CV landing page with PDF download/view link | `assets/pdf/Suresh_Raghu_Resume.pdf`; optionally selected fields from `assets/json/resume.json` |

The old `/publications`, `/projects`, `/news`, and `/blog` concepts should not become separate top-level sections in the new information architecture. Publications and selected projects belong on `/research`; selected updates can appear on `/`; authored essays and external articles belong on `/writing`.

## Existing content inventory and destination

### Identity and about/profile

Current sources:

- `_config.yml`: Suresh Raghu; site URL `https://R-Suresh07.github.io`; short description, keywords, language, and contact note.
- `_pages/about.md`: title line "Independent ML Researcher · AI Lead at VFS Global", Fall 2027 PhD availability, New Delhi location, three-paragraph biography, profile image, selected-publication/news/post settings.
- `assets/img/profile.jpeg`: the profile image actually referenced by the live about page (867 × 1025).

Proposed destination:

- Stable identity, location, availability, and short biography in `src/data/site.ts`.
- Homepage composition in `src/pages/index.astro`.
- Optimized profile image in `src/assets/images/profile/profile.jpeg`, imported through Astro's image pipeline.
- Keep the homepage compact: introduction, current focus, a short selected-research list, a short updates list, and text links to Research, Writing, and CV.

Content requiring reconciliation before implementation:

- The about page says "AI Lead" and "over a million documents daily"; the current resume data says "Manager — AI (Founding Lead, AI Research Engineering)" and `180K+ documents daily`.
- The about page describes only VFS Global as the current role; the current CV also lists a Carnegie Mellon LTI independent research collaboration beginning July 2026.
- Some terminal output displays mojibake for typographic characters, although the source files contain Unicode. New content files should be UTF-8 and normalized during migration.

### Social and contact links

Canonical current source: `_data/socials.yml`.

| Link | Current value | Proposed destination |
| --- | --- | --- |
| Email | `sureshraghu0706@gmail.com` | `src/data/socials.ts`; homepage/footer mail link |
| GitHub | `R-Suresh07` | `src/data/socials.ts` |
| LinkedIn | `suresh-raghu` | `src/data/socials.ts` |
| Google Scholar | `gPMRZWsAAAAJ` | `src/data/socials.ts`; research page |
| ORCID | `0009-0006-3307-4403` | `src/data/socials.ts`; research page |
| arXiv author | `raghu_s_1` | `src/data/socials.ts`; research page |
| Medium | `sureshraghu0706` | `src/data/socials.ts`; writing page |
| CV PDF | `/assets/pdf/Suresh_Raghu_Resume.pdf` | `/cv/Suresh_Raghu_Resume.pdf`; linked from `/cv` |

The phone number present in the PDF and resume JSON should remain CV-only unless explicitly approved for the public homepage. The new presentation should use restrained text links rather than a dense icon bar.

### Publications

Canonical bibliography: `_bibliography/papers.bib`. It contains three selected 2026 preprints:

1. **Proper Scoring Rules for Agentic Uncertainty Quantification** — Suresh Raghu, Satwik Pandey, Shashwat Pandey; arXiv `2605.24756`; accepted at CTB and FAGEN workshops at ICML 2026; preview `TPS_visualisation.png`.
2. **SELFDOUBT: Uncertainty Quantification for Reasoning LLMs via the Hedge-to-Verify Ratio** — Satwik Pandey, Suresh Raghu, Shashwat Pandey; arXiv `2604.06389`; accepted at FAGEN at ICML 2026; preview `sd.png`.
3. **Don't Blink: Evidence Collapse during Multimodal Reasoning** — Suresh Raghu, Satwik Pandey; arXiv `2604.04207`; preview `db.png`.

Proposed destination:

- Preserve BibTeX as the scholarly source in `src/data/publications.bib`.
- Add any display-only metadata that BibTeX cannot express cleanly (selection, short summary, links, preview import, venue status) in `src/data/publications.ts`, keyed by BibTeX citation key.
- Render a quiet chronological list on `/research`, not a card grid. Each item can include authors, venue/status, short abstract or contribution sentence, and text links for paper/code/project.
- Use `src/assets/images/research/` for the three preview figures. The `db.png` and `sd.png` files at `assets/img/` are byte-for-byte duplicates of their files under `assets/img/publication_preview/`; migrate one copy only.

Publication metadata conflicts to resolve:

- The BibTeX entry for **Don't Blink** has no acceptance note. `assets/json/resume.json` and the PDF say it was accepted at the Sci-FM and Actionable Interpretability workshops at COLM 2026.
- The resume JSON/PDF contain substantially richer contribution summaries than the BibTeX entries. These are good candidates for the `/research` descriptions after fact-checking.

`assets/bibliography/papers.bib` is empty and should not be migrated. `assets/bibliography/2018-12-22-distill.bib` is demo content and should not be migrated.

### Projects

There are four authored project entries in `_projects/`:

| Project | Date | Existing media | Existing external links | Proposed destination |
| --- | --- | --- | --- | --- |
| Image Aesthetics Quantification | 2023-10-20 | `image_aesthetics.png`, `Aesthetic-comparison.png` | GitHub, Medium | Selected project/research entry on `/research`; retain full text as source material |
| Multimodal Image Search with GPT-4 Vision | 2023-10-28 | `analyses.png` | GitHub, Medium | Selected project entry on `/research` |
| 3-Tiered Data Extraction from Images | 2023-11-17 | `data_extraction.png` | GitHub, Medium | Selected project entry on `/research` |
| Prompt Order Analysis in VLMs | 2026-01-11 | `prompt_order.png` | GitHub, Medium | Research/project entry on `/research`; external article also listed on `/writing` |

Store structured project metadata in `src/data/projects.ts` and its media in `src/assets/images/projects/`. The existing Markdown bodies contain useful problem/approach/results prose, but the Liquid figure include in `1_image_aesthetics.md` must be converted to a native Astro/MDX `Figure` component if that longer project narrative is retained. The new IA does not currently call for separate project detail routes.

### News and updates

There are seven inline entries in `_news/`:

| Date | Update | Proposed use |
| --- | --- | --- |
| 2024-05-02 | Joined VFS as lead AI engineer | Optional homepage timeline item |
| 2026-01-11 | Published the VLM prompt-ordering article | Writing metadata; optional homepage update |
| 2026-04-05 | **Don't Blink** preprint | Consolidate into the publication record rather than repeating it |
| 2026-04-07 | **SELFDOUBT** preprint | Consolidate into the publication record |
| 2026-05-06 | **Proper Scoring Rules** preprint | Consolidate into the publication record |
| 2026-05-22 | **Proper Scoring Rules** accepted at CTB/ICML 2026 | Consolidate into publication status; optional homepage update |
| 2026-05-25 | **SELFDOUBT** and **Proper Scoring Rules** accepted at FAGEN/ICML 2026 | Consolidate into publication status; optional homepage update |

If a visible update stream is retained, store only selected, non-duplicative entries in `src/data/news.ts` and show a short list on `/`. There is no `/news` route in the requested IA.

### Blog posts and writing

- There is no `_posts/` directory and therefore no native Jekyll post content to convert.
- `_pages/blog.md` is an al-folio index/template, not authored prose.
- `_config.yml` imports `https://medium.com/feed/@sureshraghu0706`, so the current blog can change based on an external RSS feed and is not fully captured in the repository.
- Four external Medium articles are explicitly referenced by local project/news content:
  - *Image Aesthetics Quantification using OpenAI CLIP*
  - *From Images to Insights: 3-Tiered Data Extraction from Images with OCR and Large Language Models*
  - *Revolutionizing Image Search with GPT-4 Vision*
  - *Why Your VLM Prompts Are Backwards (And How to Fix It)*

Proposed destination:

- Native essays go in `src/content/writing/*.mdx` and render at `/writing/[slug]`.
- Existing Medium pieces should initially be explicit external records in `src/data/external-writing.ts`, displayed with an "External" label on `/writing`. Do not depend on a live RSS feed at build time.
- Importing full Medium article bodies into MDX is a separate editorial/copyright migration task and is not assumed here.
- Keep the old title "The Scratchpad" and description "Notes from the build" only if they still fit the desired editorial voice; the requested route label is `Writing`.

### CV

Current sources:

- `assets/pdf/Suresh_Raghu_Resume.pdf`: personalized, one-page, letter-size PDF created 2026-08-23.
- `assets/json/resume.json`: personalized structured data covering identity, education, research interests, three publications, CMU/VFS/Adani experience, and skills.
- `_data/cv.yml`: untouched Albert Einstein/demo data; do not migrate.
- `_pages/cv.md`: only an al-folio wrapper pointing to the PDF.

Proposed destination:

- Copy the PDF to `public/cv/Suresh_Raghu_Resume.pdf` so it has a stable public URL and can be downloaded directly.
- Build `src/pages/cv.astro` as a minimal landing page with a download/open link. A short HTML summary may be generated from a curated `src/data/cv.ts` later; embedding the full PDF is optional and should not be the only mobile experience.
- Treat `assets/json/resume.json` as migration input, not as automatically trusted display data. Reconcile it with the PDF before generating an HTML CV.

### Images and other assets

Assets that are directly referenced by personalized content and should be considered for migration:

| Group | Files | Destination |
| --- | --- | --- |
| Profile | `profile.jpeg` | `src/assets/images/profile/` |
| Projects | `image_aesthetics.png`, `Aesthetic-comparison.png`, `data_extraction.png`, `analyses.png`, `prompt_order.png` | `src/assets/images/projects/` |
| Publications | `publication_preview/TPS_visualisation.png`, `publication_preview/sd.png`, `publication_preview/db.png` | `src/assets/images/research/` |
| CV | `pdf/Suresh_Raghu_Resume.pdf` | `public/cv/` |
| Structured CV source | `json/resume.json` | Curate into `src/data/cv.ts` only if an HTML CV is approved |

Assets that appear to be template/demo or are currently unreferenced and should remain in the old site until explicitly reviewed, not copied automatically:

- `assets/img/1.jpg` through `12.jpg`, `prof_pic.jpg`, `prof_pic_color.png`, `rhino.png`, `template_error.png`.
- `assets/img/book_covers/the_godfather.jpg`, `_books/the_godfather.md`, and the bookshelf page (demo prose/content).
- `assets/img/publication_preview/brownian-motion.gif` and `wave-mechanics.gif`.
- `assets/video/tutorial_al_folio.mp4`, `pexels-engin-akyurt-6069112-960x540-30fps.mp4`, and `assets/audio/epicaly-short-113909.mp3`.
- Demo notebook/HTML/JSON artifacts: `assets/jupyter/blog.ipynb`, `assets/html/relativity.html`, `assets/plotly/demo.html`, `assets/json/table_data.json`.
- al-folio implementation assets under `assets/css`, `assets/js`, `assets/fonts`, and `assets/webfonts`. Astro should not carry Bootstrap, Font Awesome, Jekyll helpers, or template JavaScript forward by default.

There are currently no authored WebM files or project SVG figures to migrate. Astro's `public/` directory should be reserved for files that need stable URLs (PDF, favicon, robots files, video); images used by Astro/MDX should normally live under `src/assets/` for optimization and hashed output.

## Proposed Astro file structure

```text
site-v2/
├── public/
│   ├── cv/
│   │   └── Suresh_Raghu_Resume.pdf
│   ├── media/
│   │   └── video/                 # future WebM/MP4 files needing stable URLs
│   ├── favicon.ico
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   │   └── images/
│   │       ├── profile/
│   │       ├── projects/
│   │       ├── research/
│   │       └── writing/           # essay-local/shared figures
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Figure.astro           # supports wide/full-bleed prose figures
│   │   ├── ResponsiveVideo.astro  # WebM with MP4 fallback, caption/transcript hooks
│   │   ├── PublicationList.astro
│   │   ├── ProjectList.astro
│   │   └── interactive/           # future React islands only when needed
│   ├── content/
│   │   └── writing/
│   │       └── <slug>.mdx
│   ├── data/
│   │   ├── site.ts
│   │   ├── socials.ts
│   │   ├── publications.bib
│   │   ├── publications.ts
│   │   ├── projects.ts
│   │   ├── news.ts
│   │   └── external-writing.ts
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── EssayLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── research.astro
│   │   ├── writing/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── cv.astro
│   │   └── 404.astro
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   └── prose.css
│   └── content.config.ts
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── MIGRATION.md
```

### Content schemas

`src/content.config.ts` should define a `writing` collection with a strict schema along these lines:

```ts
{
  title: string,
  description: string,
  published: Date,
  updated?: Date,
  draft: boolean,
  topics: string[],
  featured?: boolean,
  image?: ImageMetadata,
  bibliography?: string
}
```

Publication, project, news, and social records are small, site-wide datasets rather than prose documents, so typed TypeScript data is simpler than forcing each into its own content collection. The BibTeX file remains the canonical citation-oriented publication source.

## Rendering and design architecture

- **MDX and future interactivity:** `@astrojs/mdx` and `@astrojs/react` are already installed. MDX essays can import Astro components and opt-in React islands with explicit `client:*` directives; ordinary pages should ship no React JavaScript.
- **Equations:** add `remark-math` and `rehype-katex`, with locally bundled KaTeX CSS/fonts. Support inline and display math without client-side MathJax.
- **Code:** use Astro's build-time Shiki highlighting. Define one restrained light theme (and a matching dark theme only if dark mode is intentionally included), plus accessible overflow behavior on mobile.
- **Citations:** use a build-time remark/rehype citation pipeline backed by BibTeX/CSL, with stable citation keys and an automatically generated references section. Select and test the exact plugin before content migration; do not reproduce al-folio's Jekyll Scholar/Liquid runtime.
- **Images and figures:** use Astro image imports for raster assets. `Figure.astro` should support `prose`, `wide`, and `full` widths, captions, alt text, and optional source/credit. The essay grid should keep prose near 65–72 characters per line while allowing figures to break into a wider column.
- **SVG:** import optimized authored SVGs through Astro when they participate in layout; use `public/` only when an untouched stable URL is required. Never inject untrusted SVG markup.
- **Video:** `ResponsiveVideo.astro` should use a semantic `<video>` element with WebM plus MP4 fallback, `aspect-ratio`, `preload="metadata"`, controls, poster support, captions, and no autoplay by default. External video embeds should use a separate responsive wrapper.
- **Responsive layout:** mobile-first CSS, fluid type/spacing with `clamp()`, no horizontal page overflow, touch-sized navigation, and wide figures capped to the viewport.
- **Visual system:** one neutral background/text palette, one restrained accent color used for links and small rules, generous vertical rhythm, near-zero decoration, no card grid, and no animation beyond native interaction feedback/reduced-motion-safe transitions.

## Suggested implementation sequence after approval

1. Establish tokens, typography, base/essay layouts, header/footer, and the four requested routes with placeholder data.
2. Add the writing content schema, MDX route, math, code, figures, video, and citation pipeline; verify these with one representative fixture essay.
3. Migrate curated profile/social/publication/project/news data and only the referenced assets.
4. Add `/cv` and copy the approved PDF; optionally build the curated HTML summary.
5. Run local type/content validation, `astro check`, production build, preview, responsive checks, and link/accessibility checks.
6. Only after local review and sign-off, plan deployment changes in a separate step. Do not change the existing GitHub Actions workflow as part of the site implementation.

## Review decisions before implementation

1. Confirm the preferred current title, VFS document-volume claim, and whether the CMU collaboration belongs in the homepage introduction.
2. Confirm the **Don't Blink** workshop status and choose BibTeX/resume wording as the canonical publication metadata.
3. Decide whether `/cv` is link-only or also includes a short HTML CV, and whether the phone number should remain PDF-only.
4. Choose which of the four older projects deserve space on the deliberately minimal `/research` page.
5. Decide whether the four known Medium pieces remain external links or whether any will be rewritten/ported as first-party MDX essays.
6. Confirm whether a dark mode is desired; it should not be inherited automatically from al-folio.
