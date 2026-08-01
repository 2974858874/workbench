#!/usr/bin/env python3
"""
sync_to_github.py — 将 workbench 目录下的所有文件同步到 GitHub Pages 仓库。
用于初始部署 + 自动化每日同步。

用法:
  python sync_to_github.py [文件1 文件2 ...]  # 只同步指定文件
  python sync_to_github.py                     # 同步全部文件

环境变量:
  GH_TOKEN  — GitHub fine-grained PAT（读 .github-token 作为 fallback）
"""
import base64, json, os, sys, urllib.request, urllib.error, pathlib

REPO = "2974858874/workbench"
API_BASE = f"https://api.github.com/repos/{REPO}/contents"
WORKBENCH_DIR = pathlib.Path(__file__).parent

# 获取 token：优先环境变量，其次 .github-token 文件
token = os.environ.get("GH_TOKEN", "").strip()
if not token:
    token_file = WORKBENCH_DIR / ".github-token"
    if token_file.exists():
        token = token_file.read_text().strip()

if not token:
    print("ERROR: No token found. Set GH_TOKEN env or create .github-token")
    sys.exit(1)

# 跳过列表
SKIP = {".git", ".github-token", ".gitignore", "sync_to_github.py", "__pycache__"}

def get_existing_sha(path):
    """获取 GitHub 上已有文件的 SHA（更新时必须提供）"""
    url = f"{API_BASE}/{path}"
    req = urllib.request.Request(url, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return data.get("sha")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # 文件不存在，是新建
        raise

def upload_file(local_path, repo_path):
    """上传单个文件到 GitHub"""
    with open(local_path, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    sha = get_existing_sha(repo_path)
    payload = {
        "message": f"sync {repo_path}" + (f" (update)" if sha else " (new)"),
        "content": content,
    }
    if sha:
        payload["sha"] = sha

    data = json.dumps(payload).encode()
    url = f"{API_BASE}/{repo_path}"
    req = urllib.request.Request(url, data=data, method="PUT", headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    })

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            result = json.loads(resp.read())
            action = "updated" if sha else "created"
            print(f"  {action}: {repo_path}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:200]
        print(f"  FAILED: {repo_path} ({e.code}) {body}")
        return False

def collect_files(specific_files=None):
    """收集要上传的文件列表"""
    files = []
    if specific_files:
        for f in specific_files:
            p = WORKBENCH_DIR / f
            if p.exists() and p.is_file():
                files.append((str(p), f))
        return files

    for root, dirs, filenames in os.walk(WORKBENCH_DIR):
        # 过滤跳过目录
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fname in filenames:
            if fname in SKIP:
                continue
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, WORKBENCH_DIR).replace("\\", "/")
            files.append((full, rel))

    return files

def main():
    specific = sys.argv[1:] if len(sys.argv) > 1 else None
    files = collect_files(specific)

    if not files:
        print("No files to sync.")
        return

    print(f"Syncing {len(files)} file(s) to {REPO}...")
    ok, fail = 0, 0
    for local, repo in files:
        if upload_file(local, repo):
            ok += 1
        else:
            fail += 1

    print(f"\nDone: {ok} ok, {fail} failed")

if __name__ == "__main__":
    main()
