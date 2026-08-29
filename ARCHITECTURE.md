# Sovereign Tri-Repository Metagit Architecture

## 1. Architectural Philosophy

The **Sovereign Tri-Repository Metagit Architecture** is designed primarily for **Agents and Humans entering from the Git / CLI (Command Line Interface) environment**.

The architecture enforces a strict **Tri-Git Separation** between local agent memory management (`_mgit`), public production web releases (`_github`), and private remote audit backups (`_github_context`).

While the Git / CLI workspace is the primary environment for agentic engineering and memory management, the **BI (Browser Interface)** at `https://lex.clinic` serves as a projected learning reflection of the public production substrate.

```text
                               ┌────────────────────────────────────────┐
                               │       Sovereign Workspace Root         │
                               │        (/home/bestape/mgit/)           │
                               └───────────────────┬────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
         ▼                                         ▼                                         ▼
┌───────────────────────────────────┐    ┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│        1. _mgit (Local)           │    │       2. _github (Kairos)         │     │    3. _github_context (Chronos)   │
├───────────────────────────────────┤    ├───────────────────────────────────┤     ├───────────────────────────────────┤
│ • Local Memory & Workspace Mgmt   │    │ • Public Production Source Code   │     │ • Private Remote Audit Backup     │
│ • Metadata Dir: .git_mgit         │    │ • Metadata Dir: .git_github       │     │ • Metadata Dir: .git_github_cntxt │
│ • No Public Remote Push           │    │ • Deploys to Cloudflare Pages     │     │ • Remote: website_context.git     │
│ • Local-Only Workspace State      │    │ • 0 Secrets / Clean Kairos Sub    │     │ • Full Chronological Audit Trail  │
└───────────────────────────────────┘    └───────────────────────────────────┘     └───────────────────────────────────┘
```

---

## 2. The Tri-Git Specifications

### **1. `_mgit` — Local Agent Memory & Workspace Management**
* **Metadata Directory**: **`.git_mgit/`**
* **Role**: Used exclusively by the AI agent to manage local memory, track file changes across turns, and maintain workspace cohesion.
* **Remote**: **None** (Strictly local to the engineering workstation).

### **2. `_github` — Kairos Production Release Axis**
* **Metadata Directory**: **`.git_github/`**
* **Role**: Holds the clean, data-compressed public production web application (`kairos_mgit/`).
* **Live Web Deployment**: Cloudflare Pages (`https://lex.clinic`).
* **Security Mandate**: **100% Secret-Free**. Uses `.localonly` pre-commit secret linting to prevent credential leakage.

### **3. `_github_context` — Chronos Time-Sharded Audit Vault**
* **Metadata Directory**: **`.git_github_context/`**
* **Role**: Serves as the private remote cloud backup for complete chronological audit trails, time-sharded memory snapshots (`chronos_mgit/YYYY-MM-DD/`), and execution logs.
* **Remote**: **`git@github.com:lexclinic/website_context.git`**
* **Security Policy**: Restricted access / Private audit repository.

---

## 3. The Temporal Dichotomy: Kairos vs. Chronos

### **A. Kairos — Eternal, Condensed (Data-Compressed) Time**
* **Meaning**: Kairos is eternal, timeless, and highly condensed. It represents the compression of knowledge, rules, and logic into distilled, reusable artifacts.
* **In Git Code Sharing**:
  * **Core Curriculum Modules**: Permanent courseware artifacts (`/101/1.1/`, `/101/1.2/`, `/101/2.1/`, `/101/2.2/`) containing distilled knowledge.
  * **Executable Protocol Logic**: Compiled Edge Functions (`functions/api/`), ERC-7827 personal ledger standards, and core styling rules (`styles.css`).
  * **Commit & Secret Orchestrator**: **`mgit_dual_commit.py`**—the automation script that verifies code hygiene, performs secret-scanning, stages clean code, and pushes to GitHub.

### **B. Chronos — Time Unfolding Over Time**
* **Meaning**: Chronos is quantitative time unfolding sequentially step-by-step—the continuous, historical progression of events, logs, and state updates.
* **In Git Code Sharing**:
  * **Time-Sharded Memory Vaults**: `chronos_mgit/YYYY-MM-DD/` contains turn-by-turn agent execution logs, shell output captures, and state context snapshots archived continuously as work unfolds.
  * **WeDo-JSON Task Manifests**: `MISSION-*.wedo.json` tracks the unfolding sequence of engineering strikes, tasks, and milestone completions.
  * **Non-Destructive Hygiene**: Historical artifacts and quarantined code are preserved sequentially in `trash_mgit/` rather than destroyed.

---

## 4. Workspace Filesystem Hierarchy

```text
/home/bestape/mgit/
├── lex_clinic_website_mgit/            <-- Web Application Package
│   ├── repo_mgit/                      <-- [ROOT FOR .git_mgit, .git_github, .git_github_context]
│   │   ├── kairos_mgit/                <-- [PUBLIC PRODUCTION SOURCE CODE]
│   │   │   ├── mgit_dual_commit.py     <-- [COMMIT & SECRET-SCAN ORCHESTRATOR]
│   │   │   ├── 101/                    <-- Condensed Curriculum Modules (1.1, 1.2, 2.1, 2.2)
│   │   │   ├── event/                  <-- Unfolding Event Route Namespace (/event/YYYY-MM-DD/)
│   │   │   ├── functions/api/          <-- Serverless Edge API Functions
│   │   │   ├── index.html              <-- Main Landing Substrate
│   │   │   ├── styles.css              <-- Global Stylesheet
│   │   │   ├── script.js              <-- Universal Auth & Cross-Tab Sync
│   │   │   ├── context.json            <-- [AGENTIC REPOSITORY SPECIFICATION]
│   │   │   └── ARCHITECTURE.md         <-- [THIS DEFINITION SPECIFICATION]
│   │   └── chronos_mgit/               <-- Chronos Axis (Pushed to github.com/lexclinic/website_context)
│   │       └── YYYY-MM-DD/             <-- Daily Memory Snapshots & Execution Audits
│   └── blob_mgit/                      <-- Uncompiled Media & Video Assets
├── data_room_mgit/                     <-- Intake Manifests & Master WeDo JSON Files
├── blob_mgit/                          <-- Shared Binary & Document Storage
├── trash_mgit/                         <-- Non-Destructive Quarantine Vault (No 'rm -rf')
└── dynamic/                            <-- Runtime Environment Configurations & Wallets
```

---

## 5. Operational Rules for Agents & Human Engineers

1. **Git Code Sharing Only**: GitHub is used strictly for Git version control and code sharing. Live website hosting is handled exclusively by Cloudflare Pages (`https://lex.clinic`).
2. **Tri-Git Boundary Enforcement**:
   * Local workspace edits are committed locally to **`_mgit`** (`.git_mgit`).
   * Secret-scanned production releases in `kairos_mgit/` are pushed to **`_github`** (`.git_github`).
   * Chronos memory snapshots and execution logs in `chronos_mgit/` are pushed to **`_github_context`** (`git@github.com:lexclinic/website_context.git`).
3. **Automated Orchestration**: Execute `mgit_dual_commit.py` to audit secrets, enforce `.localonly` air-gaps, stage Kairos code for public GitHub push, and push Chronos memory snapshots to `website_context`.
