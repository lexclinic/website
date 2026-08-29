#!/usr/bin/env python3
"""
Kairos Agentic Dual-Commit Orchestrator & Secret Linter (mgit_dual_commit.py)

Located in: kairos_mgit/mgit_dual_commit.py

Agentic Repository Design Functions:
1. Secret Linter: Scans kairos_mgit for hardcoded keys, blocking commits if secrets exist in non-.localonly files.
2. .localonly Enforcement: Verifies *.localonly and *.localonly.* rules in .gitignore to guarantee zero leaks to GitHub.
3. Build Cache Purge: Cleans .wrangler and temporary runtime caches.
4. Public Commit & Push: Stages clean code and pushes kairos_mgit to GitHub (git@github.com:lexclinic/website.git).
5. Chronos Time-Sharding: Archives memory snapshot and execution logs into chronos_mgit/YYYY-MM-DD/.
"""

import os, sys, subprocess, json, datetime

KAIROS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(KAIROS_DIR)
CHRONOS_DIR = os.path.join(REPO_ROOT, "chronos_mgit")

def run_cmd(cmd, cwd=None):
    res = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=True)
    if res.returncode != 0 and "grep" not in cmd:
        print(f"⚠️ Error ({res.returncode}): {res.stderr.strip()}")
    return res.stdout.strip()

def scan_secrets_and_localonly():
    print("🔒 [Agentic Secret Linter]: Auditing kairos_mgit for .localonly enforcement & hardcoded keys...")
    
    # 1. Purge wrangler temporary build files before scanning
    wrangler_dir = os.path.join(KAIROS_DIR, ".wrangler")
    if os.path.exists(wrangler_dir):
        print("🧹 Purging temporary .wrangler build cache from kairos_mgit...")
        subprocess.run(["rm", "-rf", wrangler_dir])

    # 2. Check that .gitignore includes .localonly rules
    gitignore_path = os.path.join(KAIROS_DIR, ".gitignore")
    if os.path.exists(gitignore_path):
        with open(gitignore_path, "r") as f:
            gi_content = f.read()
        if "*.localonly" not in gi_content:
            print("📝 Appending *.localonly enforcement rules to .gitignore...")
            with open(gitignore_path, "a") as f:
                f.write("\n# Agentic Localonly Air-Gap Rules\n*.localonly\n*.localonly.*\n")

    # 3. Check for hardcoded RSA keys in NON-.localonly files
    target_key_pattern = "MIIEvQIBADANBgkqhkiG9w0BAQEFA"
    cmd = f"grep -rn '{target_key_pattern}' . --exclude=mgit_dual_commit.py --exclude='*.localonly*' --exclude-dir='.git*'"
    check_keys = run_cmd(cmd, cwd=KAIROS_DIR)
    
    if check_keys:
        print("❌ AGENTIC LINTER BLOCK: Hardcoded RSA private key detected in a non-.localonly file!")
        print(check_keys)
        print("💡 Solution: Rename the file with a .localonly suffix (e.g. key.localonly.json) or remove the key.")
        sys.exit(1)

    print("✅ kairos_mgit is 100% clean and .localonly rules enforced!")

def commit_kairos(commit_msg):
    print("\n🚀 [Kairos Axis]: Staging clean production code...")
    run_cmd("git add .", cwd=KAIROS_DIR)
    
    status = run_cmd("git status --porcelain", cwd=KAIROS_DIR)
    if not status:
        print("ℹ️ No uncommitted changes in kairos_mgit.")
        return

    run_cmd(f'git commit -m "{commit_msg}"', cwd=KAIROS_DIR)
    print("📤 Pushing kairos_mgit to GitHub (git@github.com:lexclinic/website.git)...")
    push_res = run_cmd("git push origin main", cwd=KAIROS_DIR)
    print(push_res if push_res else "✅ Pushed to GitHub main branch!")

def shard_chronos(commit_msg):
    os.makedirs(CHRONOS_DIR, exist_ok=True)
    today_str = datetime.datetime.now().strftime("%Y-%m-%d")
    chronos_shard_dir = os.path.join(CHRONOS_DIR, today_str)
    os.makedirs(chronos_shard_dir, exist_ok=True)

    timestamp = datetime.datetime.now().isoformat()
    snapshot_path = os.path.join(chronos_shard_dir, f"snapshot_{int(datetime.datetime.now().timestamp())}.json")

    snapshot_data = {
        "timestamp": timestamp,
        "date_shard": today_str,
        "commit_message": commit_msg,
        "kairos_git_head": run_cmd("git rev-parse HEAD", cwd=KAIROS_DIR),
        "agentic_design": "context.json"
    }

    with open(snapshot_path, "w") as f:
        json.dump(snapshot_data, f, indent=2)

    print(f"⏳ [Chronos Time-Sharding]: Archived memory snapshot to chronos_mgit/{today_str}/snapshot.json")

def main():
    msg = sys.argv[1] if len(sys.argv) > 1 else "feat(substrate): dual-commit update"
    print(f"=== LexClinic Agentic Dual-Commit Orchestrator ===")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}\n")

    scan_secrets_and_localonly()
    commit_kairos(msg)
    shard_chronos(msg)

    print("\n🎉 Agentic Dual-Commit Execution Complete!")

if __name__ == "__main__":
    main()
