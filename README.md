# ⚖️ LexClinic Educational Legal Engineering Runtimes & Platform

> **Milestone Status**: 🌟 **VERIFIED STABLE RELEASE COMMIT** (`7d3ee06` / `0a8b89e`)  
> **Built for Multi-Community Adoption**: This repository provides open-source public goods published under **AGPL-3.0** and **Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)**. It is explicitly architected and documented so that **educational communities, legal clinics, universities, DAOs, and open research institutions beyond `lex.clinic`** can clone, deploy, and customize this platform for their own legal engineering and computational legal education programs.

---

## 🚀 Key Features

* **Modular Media Tracking System**: Decoupled, single-responsibility ES6 modules (`js/modules/media-tracker-core.js`, `youtube-adapter.js`, `media-comments-approval.js`, `semantic-anchors.js`, `auth-core.js`, `auth-magic-link-modal.js`) managing watch progress, Screen Wake Lock API, playback speed controls (`1.0x` - `2.0x`), and full-screen expansion.
* **Google Cloud Gmail API Magic Link Authentication**: Instant 1-click passwordless sign-in via Google Cloud OAuth 2.0 REST API (`/api/auth/magic-link`), delivering rich HTML email dispatches with subject: `"Your Magic Link Login to LexClinic Education"`.
* **Universal 960px Centered Media Card Layout**: Pristine 2px solid cyan and gold-bordered container boxes (`max-width: 960px`) across 20 canonical media hubs in `/101/`, `/event/`, and `/interview/`.
* **Shared Community Discussion Feed & 2-Step Approval Ledger**: Logged-in member discussion threads and 2-step review scope/rating submissions synced to `/api/media-notes` and `media-comments-feed.json`.
* **501(c)(3) Non-Partisan & UBIT Compliance**: Designed to enforce IRC § 513 UBIT boundaries for non-profit educational research and non-partisan public goods.

---

## 🏛️ Repository Structure

```text
kairos_repsl/
├── index.html                           # Main Platform Homepage & Hero
├── styles.css                           # Universal CSS with 960px Card Bounds & Gold/Cyan Borders
├── events.js                            # Dynamic Events Grid Renderer
├── script.js                            # Core Navigation, Mobile Toggle & Modal Injection
├── 101/                                 # Legal Engineering 101 Curriculum (1.1 - 5.2)
│   ├── 1.1/ ... 5.2/                    # 10 Class Hubs with Video & Audio Players
├── event/                               # Socratic Session Hubs & Archives
│   ├── 2026-08-13/ ... 2026-10-15/       # Clean 2-Level Date Directory Routes
├── interview/                           # Socratic Interview Hubs
│   ├── james-wigginton/                 # Real Estate Tokenization & Delaware LLCs
│   └── lucas-kung/                      # LexDAO & On-Chain Legal Runtimes
├── functions/                           # Cloudflare Worker Serverless Edge Functions
│   └── api/
│       ├── auth/magic-link.js           # Google Cloud Gmail API Email Dispatcher
│       └── media-notes.js               # Community Comments & Approval API
└── js/
    ├── auth.js                          # Lightweight Auth Orchestrator
    ├── watch-tracker.js                 # Watch Progress Orchestrator
    └── modules/                         # Isolated Modular Subsystems
        ├── auth-core.js                 # Session State & Navbar [ 👤 User ] Badges
        ├── auth-magic-link-modal.js     # On-Demand Sign-In Modal & Dispatch
        ├── media-tracker-core.js        # Playback Progress Meters & LocalStorage
        ├── youtube-adapter.js           # YouTube IFrame API Ready-State Polling
        ├── media-comments-approval.js   # 2-Step Approval Modal & Discussion Thread
        └── semantic-anchors.js          # Hash Deep-Linking (#slug) & Gold Flash Highlights
```

---

## 🌍 Open-Source & Multi-Community Adoption

This repository is designed as a **turnkey, white-labelable educational framework**. Any educational institution, law school, technology clinic, or decentralized community can clone this repository to host their own interactive media courses, watch trackers, and socratic session hubs:

1. **Clone the Repository**:
   ```bash
   git clone git@github.com:lexclinic/website.git
   ```
2. **Deploy to Cloudflare Pages or Static Hosting**:
   ```bash
   npx wrangler pages deploy . --project-name=your-community-clinic
   ```
3. **Configure Google Cloud OAuth Secrets**:
   Set `CLIENT_ID`, `CLIENT_SECRET`, and `REFRESH_TOKEN` in `functions/api/auth/magic-link.js` to enable 1-click magic link sign-ins for your organization's domain.

---

## 📜 Legal & License Notices

* **Codebase & Runtimes**: Published under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
* **Educational Courseware & Transcripts**: Published under **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.
* **Disclaimer**: LexClinic Education, Inc. is a Delaware non-profit corporation applying for 501(c)(3) tax-exempt status. Software runtimes, APIs, and transcripts are for educational research and do not constitute formal legal advice or an attorney-client relationship.
