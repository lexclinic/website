# 🏛️ LexClinic Web Substrate Protocol (PROTOCOL.md)

**Entity**: LexClinic Education, Inc. (501(c)(3) Non-Profit)  
**Repository**: `lex_clinic_website_mgit`  
**Domain**: `lex.clinic`  
**Platform**: Cloudflare Pages (`lex-clinic`)  

---

## 1. Dual-Axis Metagit Architecture

This repository conforms strictly to the **Sovereign Metagit Interface Specification**:

* **`repo_mgit/kairos_mgit/`**: Active web source code (`index.html`, `styles.css`, `script.js`, `wrangler.json`).
* **`repo_mgit/chronos_mgit/`**: Time-series git revision history, commit logs, and release snapshots.
* **`blob_mgit/`**: Binary web assets, media artifacts, and design resources.
* **`chronos_mgit/`**: Session transcripts and governance audit trails.

---

## 2. Cloudflare Pages Continuous Deployment

* **Project Name**: `lex-clinic`
* **Production Domain**: `lex.clinic` / `www.lex.clinic`
* **Pages Preview URL**: `lex-clinic.pages.dev`
* **Build Command**: Direct static upload via Wrangler (`npx wrangler pages deploy . --project-name=lex-clinic`).

---

## 3. License & Attribution

All web code, design templates, and educational materials are published as open public goods under the **AGPL-3.0 / Creative Commons Attribution-ShareAlike 4.0** license suite.
