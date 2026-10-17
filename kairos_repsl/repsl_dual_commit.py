#!/usr/bin/env python3
"""
  RepSL Dual-Commit Synchronization Script
  Delaware Non-Profit Open Public Goods Protocol (AGPL-3.0)

  This script synchronizes commits across the Master Private Repository
  (repo_repsl) and the Public Sub-Repository (repo_public_repsl).

  Usage:
    python3 repsl_dual_commit.py "feat: release verified stable milestone"
"""

import os, sys, subprocess

def run_cmd(cmd_list, cwd=None, env=None, check=True):
    res = subprocess.run(cmd_list, cwd=cwd, env=env, capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"❌ Command failed: {' '.join(cmd_list)}")
        print("STDERR:", res.stderr)
        sys.exit(res.returncode)
    return res

def main():
    commit_msg = sys.argv[1] if len(sys.argv) > 1 else "refactor: synchronized dual-repository commit"

    base_dir = os.path.dirname(os.path.abspath(__file__))
    master_repo = os.path.abspath(os.path.join(base_dir, ".."))
    public_repo = os.path.abspath(os.path.join(base_dir, "repo_public_repsl"))

    print("=== 1. COMMITTING PUBLIC SUB-REPOSITORY (repo_public_repsl) ===")
    env_public = {
        **os.environ,
        "GIT_DIR": os.path.join(public_repo, ".git_repsl"),
        "GIT_WORK_TREE": public_repo,
        "GIT_AUTHOR_NAME": "repsl-agent",
        "GIT_AUTHOR_EMAIL": "agent@repsl.clinic",
        "GIT_COMMITTER_NAME": "repsl-agent",
        "GIT_COMMITTER_EMAIL": "agent@repsl.clinic",
        "GIT_SSH_COMMAND": "ssh -o StrictHostKeyChecking=no"
    }

    if os.path.exists(env_public["GIT_DIR"]):
        run_cmd(["git", "add", "-A"], cwd=public_repo, env=env_public)
        status_pub = run_cmd(["git", "status", "--short"], cwd=public_repo, env=env_public, check=False).stdout.strip()
        if status_pub:
            run_cmd(["git", "commit", "-m", commit_msg], cwd=public_repo, env=env_public)
            print(f" ✅ Committed public sub-repository: '{commit_msg}'")
        else:
            print(" ℹ️ Public sub-repository working tree clean.")

        res_push_main = run_cmd(["git", "push", "origin", "HEAD:main"], cwd=public_repo, env=env_public, check=False)
        res_push_stage = run_cmd(["git", "push", "origin", "HEAD:stage"], cwd=public_repo, env=env_public, check=False)
        print(" 🚀 Pushed public tree to GitHub (main & stage branches).")

    print("\n=== 2. COMMITTING MASTER PRIVATE REPOSITORY (repo_repsl) ===")
    env_master = {
        **os.environ,
        "GIT_DIR": os.path.join(master_repo, ".git_repsl"),
        "GIT_WORK_TREE": master_repo,
        "GIT_AUTHOR_NAME": "repsl-agent",
        "GIT_AUTHOR_EMAIL": "agent@repsl.clinic",
        "GIT_COMMITTER_NAME": "repsl-agent",
        "GIT_COMMITTER_EMAIL": "agent@repsl.clinic",
        "GIT_SSH_COMMAND": "ssh -o StrictHostKeyChecking=no"
    }

    if os.path.exists(env_master["GIT_DIR"]):
        run_cmd(["git", "add", "-A"], cwd=master_repo, env=env_master)
        status_mas = run_cmd(["git", "status", "--short"], cwd=master_repo, env=env_master, check=False).stdout.strip()
        if status_mas:
            run_cmd(["git", "commit", "-m", commit_msg], cwd=master_repo, env=env_master)
            print(f" ✅ Committed master private repository: '{commit_msg}'")
        else:
            print(" ℹ️ Master private repository working tree clean.")

    print("\n🎉 DUAL-COMMIT SYNCHRONIZATION COMPLETE!")

if __name__ == "__main__":
    main()
