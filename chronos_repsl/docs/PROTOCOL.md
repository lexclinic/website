# 🏛️ LexClinic Web Substrate Protocol (PROTOCOL.md)

**Entity**: LexClinic Education, Inc. (501(c)(3) Non-Profit)  
**Repository**: `lex_clinic_website_repsl`  
**Domain**: `lex.clinic`  
**Platform**: Cloudflare Pages (`lex-clinic`)  

---

## 1. Dual-Axis Metagit Architecture

This repository conforms strictly to the **Sovereign Metagit Interface Specification**:

* **`repo_repsl/kairos_repsl/`**: Active web source code (`index.html`, `styles.css`, `script.js`, `wrangler.json`).
* **`repo_repsl/chronos_repsl/`**: Time-series git revision history, commit logs, and release snapshots.
* **`blob_repsl/`**: Binary web assets, media artifacts, and design resources.
* **`chronos_repsl/`**: Session transcripts and governance audit trails.

---

## 2. Cloudflare Pages Continuous Deployment

* **Project Name**: `lex-clinic`
* **Production Domain**: `lex.clinic` / `www.lex.clinic`
* **Pages Preview URL**: `lex-clinic.pages.dev`
* **Build Command**: Direct static upload via Wrangler (`npx wrangler pages deploy . --project-name=lex-clinic`).

---

## 3. License & Attribution

All web code, design templates, and educational materials are published as open public goods under the **AGPL-3.0 / Creative Commons Attribution-ShareAlike 4.0** license suite.

---

## 4. Low-Token Hybrid HTML + JSON Weekly Sync Standard (`weekly_sync_scaffold.py`)

To prevent `O(N²)` session context bloat and template drift while preserving rich LLM semantic HTML authoring, all weekly `/event/` and `/101/` syncs MUST follow `kairos_repsl/json/boilerplates/weekly_socratic_101_sync.wedo.json` and compile pages via `chronos_repsl/scripts/weekly_sync_scaffold.py`:

1. **Separation of Semantic HTML Slots vs. Boilerplate Shell:**
   - **LLM-Authored Semantic HTML Slots (inside `chronos_repsl/specs/*.json` or external HTML fragment files):**
     - `hero_subtitle_html`: Hero subtitle with inline `<code>` and `<strong>` highlights.
     - `overview_html` / `overview_html_file`: Bespoke narrative synthesis paragraphs (`<p>`, `<ul>`, `<code>`).
     - `takeaways` / `takeaways_html`: 4-tile Socratic Takeaway Grid cards (`heading_html`, `body_html`).
     - `custom_sections_html` / `custom_sections_html_file`: Optional custom HTML callout cards, tables (wrapped in `.idea-table-wrap` + `.idea-table`), or diagrams inserted between the Overview card and Media Player cards.
     - `questions`: Single 20-question array (`q1`–`q20`) grounded strictly in the target class's Whisper transcript.
   - **Deterministic Compiler Shell (`weekly_sync_scaffold.py`):**
     - Automatically wraps the LLM's HTML slots into the canonical `<head>`, fixed navbar, watch-progress meters, `1.0x–2.0x` speed controls, fullscreen handlers, `window.copyCardDirectLink(slug, this)`, green `#1ed760` audio player card, Spotify embed card, and all 3 Dual-Route Quiz files (`quiz-learned/index.html`, `quiz-expert/index.html`, `quiz.html`).
     - Pre-validates all authored HTML fragments against Rule 07 (progressive quiz gating), Rule 08 (no inline `min-width > 340px`), and class-number copypasta before writing files.

2. **Standard Commands:**
   ```bash
   # Compile a Socratic Event page from spec:
   python3 chronos_repsl/scripts/weekly_sync_scaffold.py --compile-event chronos_repsl/specs/event_YYYY-MM-DD.json

   # Compile a 101 Module (landing page + 5-Q learned + 20-Q expert + smart quiz.html) & upsert /101/index.html card:
   python3 chronos_repsl/scripts/weekly_sync_scaffold.py --compile-101 chronos_repsl/specs/module_101_X.Y.json --update-hub
   ```

