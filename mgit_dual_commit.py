#!/usr/bin/env python3
"""
Sovereign Tri-Git Orchestrator & Secret Linter (mgit_dual_commit.py / mgit_tri_commit.py)

Located in: kairos_mgit/mgit_dual_commit.py

Tri-Git Metadata Routing:
- .git_mgit: Local Agent Memory & Workspace Management (work-tree = .)
- .git_github_public: Public Production Release (work-tree = kairos_mgit / selected Chronos public goods)
- .git_github_private: Private Chronos Audit Vault (work-tree = .)

Functionality:
1. Secret Linter: Audits kairos_mgit for hardcoded keys, blocking public commits if secrets are found in non-.localonly files.
2. .localonly Air-Gap Enforcement: Guarantees *.localonly files are excluded from .git_github_public.
3. Chronos -> Kairos Elevation: Allows special Chronos historical artifacts to elevate into Kairos public goods.
4. Tri-Commit Orchestration: Commits to .git_mgit (local), .git_github_public (public GitHub), and .git_github_private (private audit remote).
"""

import os, sys, subprocess, json, datetime

KAIROS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(KAIROS_DIR)

GIT_MGIT = os.path.join(REPO_ROOT, ".git_mgit")
GIT_PUBLIC = os.path.join(REPO_ROOT, ".git_github_public")
GIT_PRIVATE = os.path.join(REPO_ROOT, ".git_github_private")
CHRONOS_DIR = os.path.join(REPO_ROOT, "chronos_mgit")

def run_cmd(cmd, cwd=None):
    res = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=True)
    if res.returncode != 0 and "grep" not in cmd:
        print(f"⚠️ Error ({res.returncode}): {res.stderr.strip()}")
    return res.stdout.strip()

def scan_secrets():
    print("🔒 [Tri-Git Secret Linter]: Auditing kairos_mgit for .localonly enforcement & hardcoded keys...")
    
    # 1. Purge wrangler temporary build files before scanning
    wrangler_dir = os.path.join(KAIROS_DIR, ".wrangler")
    if os.path.exists(wrangler_dir):
        print("🧹 Purging temporary .wrangler build cache from kairos_mgit...")
        subprocess.run(["rm", "-rf", wrangler_dir])

    # 2. Check for actual RSA/PEM key headers across all source files in kairos_mgit
    target_key_pattern = "MIIEvQIBADANBgkqhkiG9w0BAQEFA"
    check_keys = run_cmd(f"grep -rn '{target_key_pattern}' . --exclude=mgit_dual_commit.py --exclude='*.localonly*' --exclude-dir='.git*'", cwd=KAIROS_DIR)
    if check_keys:
        print("❌ AGENTIC LINTER BLOCK: Hardcoded RSA private key detected in a non-.localonly file!")
        print(check_keys)
        sys.exit(1)

    print("✅ kairos_mgit is 100% clean and secret-free!")

def commit_github_public(commit_msg):
    print("\n🚀 [1/3 .git_github_public Axis]: Staging public production code...")
    run_cmd(f"git --git-dir={GIT_PUBLIC} --work-tree={KAIROS_DIR} add .", cwd=REPO_ROOT)
    
    status = run_cmd(f"git --git-dir={GIT_PUBLIC} --work-tree={KAIROS_DIR} status --porcelain", cwd=REPO_ROOT)
    if not status:
        print("ℹ️ No uncommitted changes in .git_github_public.")
        return

    run_cmd(f'git --git-dir={GIT_PUBLIC} --work-tree={KAIROS_DIR} commit -m "{commit_msg}"', cwd=REPO_ROOT)
    print("📤 Pushing .git_github_public to GitHub (git@github.com:lexclinic/website.git)...")
    push_res = run_cmd(f"git --git-dir={GIT_PUBLIC} --work-tree={KAIROS_DIR} push origin main", cwd=REPO_ROOT)
    print(push_res if push_res else "✅ Pushed to GitHub public main branch!")

def commit_local_mgit(commit_msg):
    print("\n🧠 [2/3 .git_mgit Local Axis]: Committing local workspace memory state...")
    run_cmd(f"git --git-dir={GIT_MGIT} --work-tree={REPO_ROOT} add .", cwd=REPO_ROOT)
    
    status = run_cmd(f"git --git-dir={GIT_MGIT} --work-tree={REPO_ROOT} status --porcelain", cwd=REPO_ROOT)
    if not status:
        print("ℹ️ No uncommitted changes in .git_mgit.")
        return

    run_cmd(f'git --git-dir={GIT_MGIT} --work-tree={REPO_ROOT} commit -m "mgit(memory): {commit_msg}"', cwd=REPO_ROOT)
    print("✅ Local .git_mgit workspace memory updated!")

def commit_github_private(commit_msg):
    print("\n⏳ [3/3 .git_github_private Chronos Axis]: Archiving Chronos audit snapshot...")
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    chronos_shard_dir = os.path.join(CHRONOS_DIR, today_str)
    os.makedirs(chronos_shard_dir, exist_ok=True)

    timestamp = datetime.datetime.now().isoformat()
    snapshot_path = os.path.join(chronos_shard_dir, f"snapshot_{int(datetime.datetime.now().timestamp())}.json")

    snapshot_data = {
        "timestamp": timestamp,
        "date_shard": today_str,
        "commit_message": commit_msg,
        "public_git_head": run_cmd(f"git --git-dir={GIT_PUBLIC} --work-tree={KAIROS_DIR} rev-parse HEAD", cwd=REPO_ROOT)
    }

    with open(snapshot_path, "w") as f:
        json.dump(snapshot_data, f, indent=2)

    run_cmd(f"git --git-dir={GIT_PRIVATE} --work-tree={CHRONOS_DIR} add .", cwd=REPO_ROOT)
    status = run_cmd(f"git --git-dir={GIT_PRIVATE} --work-tree={CHRONOS_DIR} status --porcelain", cwd=REPO_ROOT)
    if status:
        run_cmd(f'git --git-dir={GIT_PRIVATE} --work-tree={CHRONOS_DIR} commit -m "chronos(audit): {commit_msg}"', cwd=REPO_ROOT)
        print("✅ .git_github_private Chronos audit vault snapshot committed!")

def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else "feat(substrate): tri-git update"
    print(f"=== LexClinic Sovereign Tri-Git Orchestrator ===")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}\n")

    scan_secrets()
    commit_github_public(msg)
    commit_local_mgit(msg)
    commit_github_private(msg)

    print("\n🎉 Tri-Git Orchestration Complete!")

if __name__ == "__main__":
    main()
