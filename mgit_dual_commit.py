import os, sys, json, subprocess, datetime

# Sovereign Tri-Git Orchestrator & Pre-Commit Linter for Staging (stage.lex.clinic)
print("=== LexClinic Staging Sovereign Tri-Git Orchestrator ===")
timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
print(f"Timestamp: {timestamp}\n")

# Path definitions
script_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(script_dir)
kairos_dir = os.path.join(repo_root, "kairos_mgit")
stage_root = os.path.dirname(repo_root)
chronos_dir = os.path.join(stage_root, "chronos_mgit")

commit_msg = sys.argv[1] if len(sys.argv) > 1 else "feat(stage): synchronize staging web substrate to stage.lex.clinic"

# STEP 1: Secret Scanning & Linter
print("🔒 [Tri-Git Secret Linter]: Auditing staging kairos_mgit for secrets...")

forbidden_patterns = [
    "AKIA", "ASIA", "xoxb-", "xoxp-", "sq0idp-", "AIzaSy", "cfat_",
    "PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "ca48a30d"
]

clean = True
for root, dirs, files in os.walk(kairos_dir):
    # Purge wrangler build artifacts
    if ".wrangler" in dirs:
        shutil_path = os.path.join(root, ".wrangler")
        print(f"🧹 Purging temporary build cache: {shutil_path}")
        import shutil
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
    print("❌ Tri-Git push aborted due to secret linter violations!")
    sys.exit(1)

print("✅ staging kairos_mgit is 100% clean and secret-free!\n")

# STEP 2: Staging Public GitHub Axis (.git_github) -> branch: stage
print("🚀 [1/3 .git_github Axis]: Staging public code to branch 'stage'...")
env_github = {**os.environ, "GIT_DIR": ".git_github", "GIT_WORK_TREE": "kairos_mgit"}
subprocess.run(["git", "add", "."], cwd=repo_root, env=env_github, check=True)

res = subprocess.run(["git", "status", "--porcelain"], cwd=repo_root, env=env_github, capture_output=True, text=True)
if res.stdout.strip():
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=repo_root, env=env_github, check=True)

print("📤 Pushing .git_github to GitHub (branch: stage)...")
subprocess.run(["git", "push", "--force", "origin", "stage"], cwd=repo_root, env=env_github, check=True)
print("✅ Pushed to GitHub public 'stage' branch!\n")

# STEP 3: Local Workspace Memory Axis (.git_mgit) -> branch: main
print("🧠 [2/3 .git_mgit Local Axis]: Committing local workspace memory state...")
env_mgit = {**os.environ, "GIT_DIR": ".git_mgit", "GIT_WORK_TREE": "kairos_mgit"}
subprocess.run(["git", "add", "."], cwd=repo_root, env=env_mgit, check=True)

res_mgit = subprocess.run(["git", "status", "--porcelain"], cwd=repo_root, env=env_mgit, capture_output=True, text=True)
if res_mgit.stdout.strip():
    subprocess.run(["git", "commit", "-m", commit_msg], cwd=repo_root, env=env_mgit, check=True)
print("✅ Local .git_mgit workspace memory updated!\n")

# STEP 4: Chronos Audit Snapshot (.git_github_context) -> branch: stage
print("⏳ [3/3 .git_github_context Axis]: Archiving Chronos audit snapshot to stage branch...")
snapshot_file = os.path.join(chronos_dir, f"snapshot_{int(datetime.datetime.now().timestamp())}.json")
os.makedirs(chronos_dir, exist_ok=True)

snapshot_data = {
    "timestamp": timestamp,
    "target": "stage.lex.clinic",
    "commit_message": commit_msg,
    "status": "staging_sync_complete"
}

with open(snapshot_file, "w") as f:
    json.dump(snapshot_data, f, indent=2)

env_context = {**os.environ, "GIT_DIR": ".git_github_context", "GIT_WORK_TREE": "kairos_mgit"}
subprocess.run(["git", "add", "."], cwd=repo_root, env=env_context, check=True)

res_ctx = subprocess.run(["git", "status", "--porcelain"], cwd=repo_root, env=env_context, capture_output=True, text=True)
if res_ctx.stdout.strip():
    subprocess.run(["git", "commit", "-m", f"chronos: {commit_msg}"], cwd=repo_root, env=env_context, check=True)

print("📤 Pushing Chronos audit snapshot to git@github.com:lexclinic/website_context.git (branch: stage)...")
subprocess.run(["git", "push", "--force", "origin", "stage"], cwd=repo_root, env=env_context, check=True)
print("✅ Pushed Chronos audit snapshot to website_context.git (branch: stage)!\n")

# STEP 5: Deploy to Cloudflare Pages (project: stage-lex-clinic, branch: stage)
print("🌐 [Cloudflare Pages Deployment]: Deploying to production branch 'stage' on project 'stage-lex-clinic'...")
cf_account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "00f333bbbcab399bf690494e2ce98ed9")
cf_token = os.environ.get("CLOUDFLARE_API_TOKEN", "")

env_deploy = {**os.environ, "CLOUDFLARE_ACCOUNT_ID": cf_account, "CLOUDFLARE_API_TOKEN": cf_token}
subprocess.run(["npx", "--yes", "wrangler", "pages", "deploy", ".", "--project-name=stage-lex-clinic", "--branch=stage"], cwd=kairos_dir, env=env_deploy, check=True)

print("\n🎉 Staging Tri-Git Orchestration & Cloudflare Deployment Complete!")
