# Sovereign Tri-Repository Metagit Architecture

## 1. Architectural Philosophy

The **Sovereign Tri-Repository Metagit Architecture** is designed primarily for **Agents and Humans entering from the Git / CLI (Command Line Interface) environment**.

GitHub (`github.com/lexclinic/website`) is used **strictly for Git code sharing, version control, and specification documentation**. There is **NO web hosting on GitHub**—live web hosting is handled exclusively by Cloudflare Pages on `https://lex.clinic`.

The architecture enforces a strict **Tri-Git Separation** between local agent memory management, public production code sharing, and private remote audit backups.

```text
                        ┌──────────────────────────────────────────────┐
                        │       GitHub Repository Root                 │
                        │   (git@github.com:lexclinic/website.git)     │
                        └──────────────────────┬───────────────────────┘
                                               │
                         ┌─────────────────────┴─────────────────────┐
                         ▼                                           ▼
       ┌───────────────────────────────────┐       ┌───────────────────────────────────┐
       │     Public Production Git Repo    │       │     Private Audit Git Repo        │
       │    (github.com/lexclinic/website) │       │   (github.com/lexclinic/...-audit)│
       ├───────────────────────────────────┤       ├───────────────────────────────────┤
       │ • Public Git Code Sharing         │       │ • Private Remote Backup           │
       │ • Deploys to Cloudflare Pages     │       │ • Full Chronological Audit Trail  │
       │ • Root: ARCHITECTURE.md, 101/,    │       │ • Sharded Memory Snapshots        │
       │   functions/api/, index.html      │       │ • WeDo-JSON Task Manifests        │
       │ • 0 Secrets / Clean Kairos Sub    │       │ • Private Memory & State Vaults   │
       └───────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. GitHub Repository Structure (`github.com/lexclinic/website`)

The GitHub repository contains the clean, public source code published directly at its root:

* **Repository Root**: **[https://github.com/lexclinic/website](https://github.com/lexclinic/website)**
* **Architecture Specification Document**: **[https://github.com/lexclinic/website/blob/main/ARCHITECTURE.md](https://github.com/lexclinic/website/blob/main/ARCHITECTURE.md)**
* **Agentic Design Manifest**: **[https://github.com/lexclinic/website/blob/main/context.json](https://github.com/lexclinic/website/blob/main/context.json)**
* **101 Curriculum Axis**: **[https://github.com/lexclinic/website/tree/main/101](https://github.com/lexclinic/website/tree/main/101)**
* **Serverless Edge Functions**: **[https://github.com/lexclinic/website/tree/main/functions/api](https://github.com/lexclinic/website/tree/main/functions/api)**

---

## 3. The Tri-Git Specifications

### **1. `_mgit` — Local Agent Memory & Workspace Management**
* **Role**: Used exclusively by the AI agent to manage local memory, track file changes across turns, and maintain workspace cohesion.
* **Remote**: **None** (Strictly local to the engineering workstation).
* **Scope**: Tracks the entire workspace, including local configurations and staging data.

### **2. `_github_public` — Kairos Production Release Axis**
* **Role**: Public Git repository holding the clean, data-compressed source code.
* **Remote**: **`git@github.com:lexclinic/website.git`**
* **Live Web Deployment**: Cloudflare Pages (`https://lex.clinic`).
* **Security Mandate**: **100% Secret-Free**. Uses `.localonly` pre-commit secret linting to prevent credential leakage.

### **3. `_github_private` — Chronos Time-Sharded Audit Vault**
* **Role**: Serves as the private remote cloud backup for complete chronological audit trails, time-sharded memory snapshots (`chronos_mgit/YYYY-MM-DD/`), and execution logs.
* **Remote**: Designated private GitHub audit remote (e.g. `git@github.com:lexclinic/website-private-audit.git`).
* **Security Policy**: Restricted access / Private repository.

---

## 4. The Temporal Dichotomy: Kairos vs. Chronos

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

## 5. Workspace Filesystem Hierarchy

```text
/home/bestape/mgit/
├── lex_clinic_website_mgit/            <-- Web Application Package
│   ├── repo_mgit/                      <-- [LOCAL _mgit GIT REPOSITORY ROOT]
│   │   ├── kairos_mgit/                <-- [GITHUB_PUBLIC REPOSITORY ROOT (github.com/lexclinic/website)]
│   │   │   ├── mgit_dual_commit.py     <-- [COMMIT & SECRET-SCAN ORCHESTRATOR]
│   │   │   ├── 101/                    <-- Condensed Curriculum Modules (1.1, 1.2, 2.1, 2.2)
│   │   │   ├── event/                  <-- Unfolding Event Route Namespace (/event/YYYY-MM-DD/)
│   │   │   ├── functions/api/          <-- Serverless Edge API Functions
│   │   │   ├── index.html              <-- Main Landing Substrate
│   │   │   ├── styles.css              <-- Global Stylesheet
│   │   │   ├── script.js              <-- Universal Auth & Cross-Tab Sync
│   │   │   ├── context.json            <-- [AGENTIC REPOSITORY SPECIFICATION]
│   │   │   └── ARCHITECTURE.md         <-- [THIS DEFINITION SPECIFICATION]
│   │   └── chronos_mgit/               <-- Chronos Axis (Local Memory Vault)
│   │       └── YYYY-MM-DD/             <-- Daily Memory Snapshots & Execution Audits
│   └── blob_mgit/                      <-- Uncompiled Media & Video Assets
├── data_room_mgit/                     <-- Intake Manifests & Master WeDo JSON Files
├── blob_mgit/                          <-- Shared Binary & Document Storage
├── trash_mgit/                         <-- Non-Destructive Quarantine Vault (No 'rm -rf')
└── dynamic/                            <-- Runtime Environment Configurations & Wallets
```

---

## 6. Operational Rules for Agents & Human Engineers

1. **Git Code Sharing Only**: GitHub is used strictly for Git version control and code sharing. Live website hosting is handled exclusively by Cloudflare Pages (`https://lex.clinic`).
2. **Tri-Git Boundary Enforcement**:
   * Local workspace edits are committed locally to **`_mgit`**.
   * Secret-scanned production releases in `kairos_mgit/` are pushed to **`_github_public`** (`git@github.com:lexclinic/website.git`).
   * Chronos memory snapshots and execution logs are archived in **`_github_private`**.
3. **Automated Orchestration**: Execute `mgit_dual_commit.py` to audit secrets, enforce `.localonly` air-gaps, stage Kairos code for public GitHub push, and archive the Chronos memory shard.
