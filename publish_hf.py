# -*- coding: utf-8 -*-
"""
OmniWatch -- HuggingFace Space Publisher

Run:
  python publish_hf.py --check   # preflight only; exits 0 when safe, 1 when secrets would leak
  python publish_hf.py           # preflight + upload

Never uploads .env or .env.* files (templates/examples are allowed). The preflight refuses to
run if any non-template .env file would be included in the upload, so a public Space can never
receive live API keys through this script.
"""
import os
import re
import sys
import io
import fnmatch
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

SPACE_ID = "masood1996/omniwatch"
SPACE_DIR = Path(__file__).parent

IGNORE_DIRS = {
    ".git", "node_modules", ".next", "out", "dist", "__pycache__", "runs", "data",
    ".venv", "venv", ".pytest_cache", ".mypy_cache", ".turbo",
}
IGNORE_FILE_PATTERNS = [
    "*.log", "*.pyc", "*.pyo", "*.tsbuildinfo",
    "publish_hf.py", "*.db", "*.db-wal", "*.db-shm", "*.sqlite", "*.sqlite3",
]
ENV_TEMPLATE_SUFFIXES = (".template", ".example", ".sample")


def is_env_file(name: str) -> bool:
    return name == ".env" or name.startswith(".env.")


def is_env_template(name: str) -> bool:
    return is_env_file(name) and name.endswith(ENV_TEMPLATE_SUFFIXES)


def walk_upload_candidates(root: Path):
    for current, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for filename in filenames:
            path = Path(current) / filename
            relative = path.relative_to(root).as_posix()
            if any(fnmatch.fnmatch(filename, pattern) for pattern in IGNORE_FILE_PATTERNS):
                continue
            yield relative, filename


SECRET_SCAN_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".yml", ".yaml",
    ".sh", ".toml", ".ini", ".cfg", ".env", ".env.local",
}
SECRET_ASSIGNMENT = re.compile(
    r"(API_KEY|API_TOKEN|API_SECRET|ACCESS_TOKEN|SECRET_KEY|WEBHOOK_URL|PASSWORD)"
    r"\s*[:=]\s*[\"']([^\"']{16,})[\"']"
)
PLACEHOLDER_HINTS = ("placeholder", "example", "your-", "changeme", "xxxx", "<", "redacted")


def scan_for_hardcoded_secrets(root: Path, candidates):
    findings = []
    for relative in candidates:
        name = Path(relative).name
        if name.endswith(ENV_TEMPLATE_SUFFIXES) or relative.startswith("docs/"):
            continue
        if Path(relative).suffix.lower() not in SECRET_SCAN_EXTENSIONS:
            continue
        try:
            text = (root / relative).read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for match in SECRET_ASSIGNMENT.finditer(text):
            value = match.group(2)
            if any(hint in value.lower() for hint in PLACEHOLDER_HINTS):
                continue
            findings.append(relative)
            break
    return findings


def preflight(root: Path):
    excluded = []
    candidates = []
    for relative, filename in walk_upload_candidates(root):
        if is_env_file(filename) and not is_env_template(filename):
            excluded.append(relative)
        else:
            candidates.append(relative)
    return excluded, candidates


def build_ignore_patterns(excluded_env_files):
    patterns = [
        "**/.git/**", ".git/**",
        "**/node_modules/**", "**/.next/**", "**/out/**", "**/dist/**",
        "**/__pycache__/**", "**/runs/**", "**/data/**",
        "**/.env", "**/.env.*",
        "*.log", "**/*.log", "*.db", "**/*.db",
    ]
    patterns.extend(excluded_env_files)
    return sorted(set(patterns))


def main():
    check_only = "--check" in sys.argv
    excluded_env_files, candidates = preflight(SPACE_DIR)
    hardcoded = scan_for_hardcoded_secrets(SPACE_DIR, candidates)

    print("[PREFLIGHT] File scan complete")
    print(f"  candidate files: {len(candidates)}")
    print(f"  excluded non-template .env files: {len(excluded_env_files)}")
    for relative in excluded_env_files:
        print(f"    - EXCLUDED (never uploaded): {relative}")

    if hardcoded:
        print("\n[REFUSED] Potential hardcoded secrets found in files that would be uploaded:")
        for relative in sorted(set(hardcoded)):
            print(f"    - {relative}")
        print("  Remove the values or move them to Space secrets, then re-run.")
        return 1

    if excluded_env_files:
        print("  ignore patterns cover every .env file found; none will be uploaded")
    if check_only:
        print("[CHECK] Safe to upload (check-only mode; nothing was uploaded).")
        return 0

    try:
        from huggingface_hub import HfApi, login, create_repo
    except ImportError:
        print("Installing huggingface_hub...")
        os.system(f"{sys.executable} -m pip install huggingface_hub")
        from huggingface_hub import HfApi, login, create_repo

    print("\n[LOGIN] Logging in to HuggingFace...")
    api = HfApi()
    try:
        user = api.whoami()
        print(f"[OK] Already logged in as: {user['name']}")
    except Exception:
        login()
        user = api.whoami()
        print(f"[OK] Logged in as: {user['name']}")

    print(f"\n[SPACE] Creating Space: {SPACE_ID}...")
    try:
        create_repo(repo_id=SPACE_ID, repo_type="space", space_sdk="docker", exist_ok=True, private=False)
        print(f"[OK] Space created: https://huggingface.co/spaces/{SPACE_ID}")
    except Exception as e:
        print(f"[WARN] Space creation note: {e}")

    print(f"\n[UPLOAD] Uploading files from {SPACE_DIR}...")
    api.upload_folder(
        folder_path=str(SPACE_DIR),
        repo_id=SPACE_ID,
        repo_type="space",
        ignore_patterns=build_ignore_patterns(excluded_env_files),
        commit_message="feat: Deploy OmniWatch server & client via Docker",
    )
    print("\n[DONE] Upload complete.")
    print("[LIVE] https://huggingface.co/spaces/" + SPACE_ID)
    print("Configure secrets in Space Settings -> Variables and secrets (never in files).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
