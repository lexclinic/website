# Sovereign Dual-Axis Metagit Architecture (Kairos & Chronos)

## 1. Architectural Philosophy

The **Sovereign Dual-Axis Metagit Architecture** is designed primarily for **Agents and Humans entering from the Git / CLI (Command Line Interface) environment**.

The architecture enforces a fundamental temporal dichotomy between **Kairos** (Eternal, Condensed, Data-Compressed Time) and **Chronos** (Time Unfolding Over Time).

While the Git / CLI workspace is the primary environment for agentic engineering and software development, the **BI (Browser Interface)** at `https://lex.clinic` serves as a projected learning reflection of this underlying repository substrate.

```text
                        ┌──────────────────────────────────────────────┐
                        │       GitHub Repository Root                 │
                        │   (git@github.com:lexclinic/website.git)     │
                        └──────────────────────┬───────────────────────┘
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
       ┌───────────────────────────────────┐       ┌───────────────────────────────────┐
       │         Kairos Axis               │       │            Chronos Axis           │
       │        (kairos_mgit/)             │       │           (chronos_mgit/)         │
       ├───────────────────────────────────┤       ├───────────────────────────────────┤
       │ • Eternal, Condensed Time         │       │ • Time Unfolding Over Time        │
       │ • High Data-Compression Artifacts │       │ • Sequential History & Progression│
       │ • Core 101 Curriculum (/101/1.1/) │       │ • Date-Driven Events (/event/)    │
       │ • Edge Functions & Protocol Rules │       │ • Append-Only Student Logs        │
       │ • mgit_dual_commit.py Orchestrator│       │ • Turn-by-Turn CLI Execution Audits│
       │ • Clean Open-Source GitHub Remote │       │ • WeDo-JSON Task Manifests        │
       │ • 0 Secrets / Config via Env Vars │       │ • Private Memory & State Vaults   │
       └───────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. GitHub Repository URL & Navigation Structure

In the GitHub repository (**`github.com/lexclinic/website`**), the top-level directory reflects this exact Dual-Axis dichotomy:

* **Kairos Production Directory**: **[https://github.com/lexclinic/website/tree/main/kairos_mgit](https://github.com/lexclinic/website/tree/main/kairos_mgit)**
  * Contains public web code, Edge Functions, 101 courseware, and the dual-commit orchestrator script.
* **Chronos Time-Sharded Audit Directory**: **[https://github.com/lexclinic/website/tree/main/chronos_mgit](https://github.com/lexclinic/website/tree/main/chronos_mgit)**
  * Contains time-sharded memory snapshots and execution audit trails.
* **Architecture Specification Document**: **[https://github.com/lexclinic/website/blob/main/kairos_mgit/ARCHITECTURE.md](https://github.com/lexclinic/website/blob/main/kairos_mgit/ARCHITECTURE.md)**
  * *Note on GitHub URL formatting*: GitHub uses `/tree/main/` for viewing folders and `/blob/main/` for displaying single file contents.

---

## 3. The Temporal Dichotomy: Kairos vs. Chronos

### **A. Kairos — Eternal, Condensed (Data-Compressed) Time**
* **Philosophical Meaning**: Kairos is eternal, timeless, and highly condensed. It represents the compression of knowledge, rules, and logic into distilled, reusable artifacts.
* **In the Git / CLI Workspace**:
  * **Core Curriculum Modules**: Permanent courseware artifacts like `/101/1.1/`, `/101/1.2/`, `/101/2.1/`, and `/101/2.2/` contain distilled, data-compressed knowledge that remains timelessly true.
  * **Executable Protocol Logic**: Compiled Edge Functions (`functions/api/`), ERC-7827 personal ledger standards, and core styling rules (`styles.css`).
  * **Commit & Secret Orchestrator**: **`kairos_mgit/mgit_dual_commit.py`**—the condensed automation script that verifies code hygiene, performs secret-scanning, stages clean code, and pushes to public remotes.
* **In the BI (Browser Interface Projection)**:
  * Renders as permanent, instant-loading educational reference modules (`/101/1.1`) where students access condensed legal engineering concepts.

### **B. Chronos — Time Unfolding Over Time**
* **Philosophical Meaning**: Chronos is quantitative time unfolding sequentially step-by-step—the continuous, historical progression of events, logs, and state updates.
* **In the Git / CLI Workspace**:
  * **Time-Sharded Memory Vaults**: `chronos_mgit/YYYY-MM-DD/` contains turn-by-turn agent execution logs, shell output captures, and state context snapshots archived continuously as work unfolds.
  * **WeDo-JSON Task Manifests**: `MISSION-*.wedo.json` tracks the unfolding sequence of engineering strikes, tasks, and milestone completions.
  * **Non-Destructive Hygiene**: Historical artifacts and quarantined code are preserved sequentially in `trash_mgit/` rather than destroyed.
* **In the BI (Browser Interface Projection)**:
  * Renders as date-driven session namespaces (`/event/2026-08-28/lexclinic-session/`), monotonic append-only quiz submission records in Google Drive, and Q Mainnet blockchain block height progression (Block `#27913716`).

---

## 4. Vantage Point: Git / CLI First, BI as Projected Substrate

Agents and human engineers interact with this filesystem primarily through **Git and the Command Line Interface (CLI)**:

```text
[Human / Agent Operator]
       │
       ▼
 💻 Git / CLI Environment (/home/bestape/mgit/lex_clinic_website_mgit/repo_mgit/)
       │
       ├────► [Kairos Axis]: Edits distilled code in kairos_mgit/, runs mgit_dual_commit.py
       │
       ├────► [Chronos Axis]: Logs execution history in chronos_mgit/, updates WeDo-JSON
       │
       ▼
 🌎 Projected BI (Browser Interface) Substrate (https://lex.clinic)
       │
       ├────► Renders Kairos: /101/1.1/ courseware & Edge API functions
       └────► Renders Chronos: /event/2026-08-28/ session logs & quiz stores
```

---

## 5. Workspace Filesystem Hierarchy

```text
/home/bestape/mgit/
├── lex_clinic_website_mgit/            <-- Web Application Package
│   ├── repo_mgit/                      <-- [GIT REPOSITORY ROOT (github.com/lexclinic/website)]
│   │   ├── kairos_mgit/                <-- Kairos Axis (github.com/lexclinic/website/tree/main/kairos_mgit)
│   │   │   ├── mgit_dual_commit.py     <-- [KAIROS COMMIT & SECRET-SCAN ORCHESTRATOR]
│   │   │   ├── 101/                    <-- Condensed Curriculum Modules (1.1, 1.2, 2.1, 2.2)
│   │   │   ├── event/                  <-- Unfolding Event Route Namespace (/event/YYYY-MM-DD/)
│   │   │   ├── functions/api/          <-- Serverless Edge API Functions
│   │   │   ├── index.html              <-- Main Landing Substrate (BI)
│   │   │   ├── styles.css              <-- Global Stylesheet
│   │   │   ├── script.js              <-- Universal Auth & Cross-Tab Sync
│   │   │   └── ARCHITECTURE.md         <-- [THIS DEFINITION SPECIFICATION]
│   │   └── chronos_mgit/               <-- Chronos Axis (github.com/lexclinic/website/tree/main/chronos_mgit)
│   │       └── YYYY-MM-DD/             <-- Daily Memory Snapshots & Execution Audits
│   └── blob_mgit/                      <-- Uncompiled Media & Video Assets
├── data_room_mgit/                     <-- Intake Manifests & Master WeDo JSON Files
├── blob_mgit/                          <-- Shared Binary & Document Storage
├── trash_mgit/                         <-- Non-Destructive Quarantine Vault (No 'rm -rf')
└── dynamic/                            <-- Runtime Environment Configurations & Wallets
```

---

## 6. Operational Rules for Agents & Human Engineers

1. **Git / CLI Primacy**: Always perform engineering, refactoring, and state analysis inside the Git / CLI workspace first before projecting changes to the BI web substrate.
2. **Eternal vs. Unfolding Boundary**: Keep distilled, timeless logic (`/101/`, `functions/api/`, `styles.css`) inside **Kairos**, while streaming unfolding execution logs, task manifests, and snapshots into date-sharded **Chronos** vaults (`chronos_mgit/YYYY-MM-DD/`).
3. **Automated Dual-Commit**: Execute `mgit_dual_commit.py` to audit secrets, stage Kairos code for public GitHub push, and archive the Chronos memory shard.
