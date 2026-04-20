# -*- coding: utf-8 -*-
"""
OmniWatch -- HuggingFace Space Publisher
Creates the Space and uploads all files.
Run: python publish_hf.py
"""
import os
import sys
import io
from pathlib import Path

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from huggingface_hub import HfApi, login, create_repo
except ImportError:
    print("Installing huggingface_hub...")
    os.system(f"{sys.executable} -m pip install huggingface_hub")
    from huggingface_hub import HfApi, login, create_repo

SPACE_ID = "masood1996/omniwatch"
SPACE_DIR = Path(__file__).parent

def main():
    print("")
    print("[LOGIN] Logging in to HuggingFace...")
    print("  If a browser opens, authorize the login there.")
    print("  Or paste a token from: https://huggingface.co/settings/tokens")
    print("")
    
    api = HfApi()
    
    try:
        user = api.whoami()
        print(f"[OK] Already logged in as: {user['name']}")
    except Exception:
        login()
        user = api.whoami()
        print(f"[OK] Logged in as: {user['name']}")
    
    # Create Space
    print(f"\n[SPACE] Creating Space: {SPACE_ID}...")
    try:
        create_repo(
            repo_id=SPACE_ID,
            repo_type="space",
            space_sdk="docker",
            exist_ok=True,
            private=False,
        )
        print(f"[OK] Space created: https://huggingface.co/spaces/{SPACE_ID}")
    except Exception as e:
        print(f"[WARN] Space creation note: {e}")

    # Upload all files
    print(f"\n[UPLOAD] Uploading files from {SPACE_DIR}...")
    
    api.upload_folder(
        folder_path=str(SPACE_DIR),
        repo_id=SPACE_ID,
        repo_type="space",
        ignore_patterns=["publish_hf.py", ".git/*", "omniwatch-server/node_modules/*", "omniwatch-client/node_modules/*", "omniwatch-client/.next/*", "__pycache__/*"],
        commit_message="feat: Initial deployment of OmniWatch Server & Next.js Client via Docker",
    )
    
    print(f"\n[DONE] Upload complete!")
    print(f"[LIVE] https://huggingface.co/spaces/{SPACE_ID}")
    print(f"  (Docker build takes a few minutes)")

if __name__ == "__main__":
    main()
