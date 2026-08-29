# Sovereign Tri-Repository Metagit Architecture

## 1. Architectural Philosophy & Inclusion Hierarchy

The **Sovereign Tri-Repository Metagit Architecture** is designed primarily for **Agents and Humans entering from the Git / CLI (Command Line Interface) environment**.

The architecture enforces a strict **Inclusion Hierarchy (Sub-set / Super-set Relationship)** across three Git metadata directories located at the project root (`repo_mgit/`):

$$\large \text{.git\_github} \;\subset\; \text{.git\_github\_context} \;\subset\; \text{.git\_mgit}$$

```text
       ┌─────────────────────────────────────────────────────────────────┐
       │                3. .git_mgit (Local Workspace)                   │
       │  Includes EVERYTHING below + local .localonly files & secrets   │
       │ ┌────────────────────────────────────────────────────────────┐  │
       │ │            2. .git_github_context (Private Audit)         │  │
       │ │  Includes EVERYTHING below + chronos_mgit/ memory shards   │  │
       │ │ ┌────────────────────────────────────────────────────────┐ │  │
       │ │ │            1. .git_github (Public Release)            │ │  │
       │ │ │  Clean production web code (kairos_mgit/), 101/     │ │  │
       │ │ │  courseware & elevated Chronos public goods.           │ │  │
       │ │ └────────────────────────────────────────────────────────┘ │  │
       │ └────────────────────────────────────────────────────────────┘  │
       └─────────────────────────────────────────────────────────────────┘
```

GitHub (`github.com/lexclinic/website`) is used **strictly for Git code sharing, version control, and specification documentation**. There is **NO web hosting on GitHub**—live web hosting is handled exclusively by Cloudflare Pages on `https://lex.clinic`.

---

## 2. The Inclusion Hierarchy Specifications

### **Level 1: `.git_github` — Public Production Release (Sub-Set)**
* **Metadata Directory**: **`.git_github/`**
* **Work Tree**: `kairos_mgit/` (plus selected elevated Chronos public goods)
* **Remote**: **`git@github.com-website:lexclinic/website.git`**
* **Contents**: Clean, data-compressed public production web application (`kairos_mgit/`), 101 courseware, Edge API Functions, and public event routes.
* **Security Mandate**: **100% Secret-Free**. Uses `.localonly` pre-commit secret linting to prevent credential leakage.

### **Level 2: `.git_github_context` — Private Audit Vault (Super-Set of `.git_github`)**
* **Metadata Directory**: **`.git_github_context/`**
* **Work Tree**: Entire workspace (`repo_mgit/`)
* **Remote**: **`git@github.com-website-context:lexclinic/website_context.git`**
* **Contents**: **Includes EVERYTHING in `.git_github`** (`kairos_mgit/`) **PLUS** `chronos_mgit/` time-sharded memory snapshots, execution audit logs, WeDo manifests, and raw transcripts.

### **Level 3: `.git_mgit` — Complete Local Workspace Super-Set**
* **Metadata Directory**: **`.git_mgit/`**
* **Work Tree**: Entire workspace (`repo_mgit/`)
* **Remote**: **None** (Strictly local to the engineering workstation).
* **Contents**: **Includes EVERYTHING in `.git_github_context`** **PLUS** local `.localonly` configuration files, local EVM wallets, staging logs, and internal workspace state.

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
  * **Chronos Elevation into Kairos**: Special Chronos historical artifacts (such as event session explainers or milestone manifests) elevate into Kairos public goods inside `.git_github`.

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

1. **Inclusion Hierarchy Enforcement**: Ensure changes respect the mathematical sub-set rule: `.git_github ⊂ .git_github_context ⊂ .git_mgit`.
2. **Secret Air-Gap**: Never commit secrets to `.git_github`. Any local credential file must use the `.localonly` extension.
3. **Automated Orchestration**: Execute `mgit_dual_commit.py` to audit secrets, enforce `.localonly` air-gaps, stage Kairos code for public GitHub push, and push Chronos memory snapshots to `website_context`.
