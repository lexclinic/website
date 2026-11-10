#!/usr/bin/env python3
import os
import sys
import json
import shutil
import subprocess
import datetime

print("=== LexClinic Staging Sovereign Commit & Push Orchestrator ===")
timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
print(f"Timestamp: {timestamp}")
print()

script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(os.path.dirname(script_dir))
kairos_dir = os.path.join(repo_root, "kairos_repsl")
web_dir = os.path.join(kairos_dir, "website")

commit_msg = (
    " ".join(sys.argv[1:]).strip()
    if len(sys.argv) > 1
    else "feat(stage): synchronize staging web substrate to stage.lex.clinic"
)

# STEP 1: Secret Scanning & Linter
print("🔒 [1/3 Secret & Contract Linter]: Auditing staging substrate...")
forbidden_patterns = [
    "AKIA",
    "ASIA",
    "xoxb-",
    "xoxp-",
    "sq0idp-",
    "AIzaSy",
    "cfat_",
    "PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
    "ca48a30d",
]

clean = True
for root, dirs, files in os.walk(kairos_dir):
    if ".wrangler" in dirs:
        shutil_path = os.path.join(root, ".wrangler")
        print(f"🧹 Purging temporary build cache: {shutil_path}")
        shutil.rmtree(shutil_path, ignore_errors=True)

    for file in files:
        if ".localonly." in file or file.endswith(".localonly") or file == "mgit_dual_commit.py":
            continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                for pattern in forbidden_patterns:
                    if pattern in content:
                        print(f"❌ SECRET LINTER ERROR: Found forbidden pattern '{pattern}' in {file_path}")
                        clean = False
        except Exception:
            pass

if not clean:
    print("❌ Push aborted due to secret linter violations!")
    sys.exit(1)

subprocess.run(["node", os.path.join(web_dir, ".linter", "runner.js")], cwd=repo_root, check=True)
print("✅ Staging substrate is 100% clean, contract-verified, and secret-free!")

# STEP 2: Commit & Push to .git_repsl (origin/stage)
print("🚀 [2/3 .git_repsl Axis]: Committing and pushing to GitHub 'stage' branch...")
ssh_key = os.path.expanduser("~/.ssh/id_ed25519_lexclinic")
ssh_cmd = f"ssh -i {ssh_key} -o StrictHostKeyChecking=no" if os.path.exists(ssh_key) else "ssh"

env_repsl = {
    **os.environ,
    "GIT_DIR": ".git_repsl",
    "GIT_WORK_TREE": ".",
    "GIT_SSH_COMMAND": ssh_cmd,
}

subprocess.run(["git", "add", "-A"], cwd=repo_root, env=env_repsl, check=True)
res_repsl = subprocess.run(
    ["git", "status", "--porcelain"], cwd=repo_root, env=env_repsl, capture_output=True, text=True
)
if res_repsl.stdout.strip():
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=repo_root, env=env_repsl, check=True)
else:
    print("ℹ️ Working tree already clean; nothing new to commit.")

subprocess.run(["git", "push", "origin", "stage"], cwd=repo_root, env=env_repsl, check=True)
print("✅ Pushed cleanly to GitHub public 'stage' branch (triggers Cloudflare Pages stage-lex-clinic)!")

# STEP 3: Optional Direct Wrangler Upload if CLOUDFLARE_API_TOKEN is configured
secrets_path = os.path.expanduser("~/.config/lexclinic_secrets.env")
if os.path.exists(secrets_path):
    with open(secrets_path) as sf:
        for line in sf:
            if line.startswith("export "):
                k, v = line.replace("export ", "").strip().split("=", 1)
                os.environ[k] = v.strip("'\"")

cf_token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if cf_token:
    print("🌐 [3/3 Cloudflare Pages Direct Deploy]: Deploying via Wrangler...")
    cf_account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "00f333bbbcab399bf690494e2ce98ed9")
    env_deploy = {**os.environ, "CLOUDFLARE_ACCOUNT_ID": cf_account, "CLOUDFLARE_API_TOKEN": cf_token}
    subprocess.run(
        ["npx", "--yes", "wrangler", "pages", "deploy", ".", "--project-name=stage-lex-clinic", "--branch=stage"],
        cwd=web_dir,
        env=env_deploy,
        check=True,
    )
else:
    print("🌐 [3/3 Cloudflare Pages]: GitHub 'stage' branch push complete (Cloudflare Git integration active).")

print("🎉 Staging Orchestration Complete!")
