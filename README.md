# LexClinic Legal Engineering Platform (lex.clinic)

An open-source, public-goods educational platform for Legal Engineering, Computational Jurisprudence, and Algorithmic Law, developed by **LexClinic Education Inc.** (Delaware Non-Profit / 501(c)(3) Candidate).

---

## 🚀 Core Platform Subsystems & Architectural Features

### 1. 🔐 **Passwordless Magic-Link Authentication System**
* **Google Cloud Gmail API REST Dispatcher**: Cloudflare Pages Worker (`/api/auth/magic-link`) exchanging OAuth credentials to dispatch authentic HTML magic-link emails via Gmail REST API.
* **Instant Session ReadyState Engine**: DOM-independent `auth-core.js` and `auth-magic-link-modal.js` modules evaluating active sessions instantly on load, updating navbar badges (`[ 👤 User ]`).
* **Role-Based CSS/JS Auth Hiding**: Strict `body.auth-logged-in` class toggles revealing private student notes and approval controls upon login while maintaining a clean default UI for unlogged visitors.

---

### 2. 📺 **Universal Multi-Player Media Tracker Suite**
* **Unified Multi-Engine Sync**: Dual playback engine driving both YouTube IFrame API embeds and native HTML5 `<audio>` streams simultaneously.
* **Real-Time Watch Progress Meter**: `MediaTrackerMeter` module recording exact viewing timestamps, LocalStorage session persistence, and Screen Wake Lock API integration.
* **Interactive Controls**: Precision click-to-seek timestamp jumping (`seekPlayerToTime`), title-based semantic hash anchors (`#slug`), and variable playback speed controllers (`0.75x` – `2.0x`).

---

### 3. 📝 **Student Learning Ledger, Notes & 2-Step Approval Workflows**
* **2-Step Approval Modal**: Quality assessment workflow allowing logged-in members to rate media cards (`Thorough` vs. `Cursory` reviews with 1–5 star ratings).
* **Private Notes Ledger**: Append-only student note-taking modal equipped with a **🤖 Copy Note for Agent** 1-click clipboard dispatch tool.
* **Shared Team Discussion Feed**: Live community comment thread feed (`media-comments-feed.json`) connected to the `/api/media-notes` serverless Cloudflare Worker.

---

### 4. 📚 **Socratic Legal Engineering Curriculum (`101/`)**
* **10 Published Modules (Classes 1.1 through 5.2)**: Socratic courseware covering Code as Law, Corporate Internet History, Smart Contracts & Blockchain Law, Computational Jurisprudence, and Typing Domains.
* **Automated Assessment Quizzes**: Interactive 20-question socratic exams with automated score processing endpoints (`/api/submit-quiz`).

---

### 5. 🎙️ **Weekly Socratic Session & Interview Archives (`event/` & `interview/`)**
* **Socratic Masterclass Hubs**: Archive of recorded masterclasses (Oct 15, Oct 8, Oct 1, Sept 24, Sept 17, Sept 4, Aug 20, Aug 13) featuring native high-fidelity audio streams and embedded YouTube clips.
* **Industry Expert Socratic Interviews**: Dedicated interview hubs for guest lecturers (James Wigginton, Lucas Kung) with transcript groundings and quizzes.

---

### 6. 🤖 **Programmatic AI Agent Infrastructure & Remote MCP**
* **Remote Model Context Protocol (MCP) Server**: Server-Sent Events (SSE) streaming endpoint (`/functions/mcp/sse.js`) enabling AI CLI agents to programmatically query platform resources.
* **Transcript Search API**: Programmatically accessible 1.02 MB transcript database (`transcripts.json`) via `/api/transcripts` for grounded AI RAG lookups.
* **Machine-Readable Specifications**: Formal OpenAPI 3.0 specification (`openapi.json`), ERC-7827 attestation schema (`erc7827_schema.json`), and LESA legal data specs (`lesa_spec.json`).

---

### 7. ⚖️ **Legal Governance & Attestation Standards**
* **ERC-7827 Cryptographic Attestations**: On-chain and off-chain student proof-of-learning attestation standard (`/attest/` & `/api/user-attest`).
* **IRC § 513 UBIT Non-Profit Compliance**: Delaware Form 1023 501(c)(3) boundary mapping and direct space feed integration enforcing non-commercial educational compliance.

---

## 🛠️ Repository Architecture (`RepSL Dual-Axis Protocol`)

```text
https://github.com/lexclinic/website
│
├── 📄 README.md                            <-- Master Core Feature Documentation
├── 📄 wrangler.json                        <-- Cloudflare Pages Deployment Configuration
├── 📄 .gitignore                           <-- Git Exclusions File
│
├── 🌐 kairos_repsl/                        <-- PRESENT PUBLIC GOODS SUBSTRATE
│   ├── 🌐 website/                         (Web App: index.html, styles.css, 101/, event/, interview/, js/, functions/)
│   ├── 🤖 mcp/                             (Remote MCP Server Schemas)
│   ├── 📜 erc7827/                         (ERC-7827 Attestation Schemas)
│   ├── ⚖️ lesa/                            (Legal Engineering Data Specifications)
│   └── 💻 cli/                             (Agentic CLI Tools)
│
└── ⏳ chronos_repsl/                       <-- TIME-SERIES AUDIT VAULT
    ├── 📁 docs/                            (ARCHITECTURE.md, PROTOCOL.md, CALENDAR_AUTOMATION_MEMO.md)
    ├── 📁 scripts/                         (Open-source repsl_dual_commit.py)
    └── 📁 wedo/                            (Public task manifests: *.wedo.json)
```

---

## 📄 License & Public Goods Adoption

Developed as open public goods by **LexClinic Education Inc.** Released under the **AGPL-3.0 License**. Legal clinics, universities, and DAOs are encouraged to clone and adopt this software framework.
