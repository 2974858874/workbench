#!/usr/bin/env python3
"""
sync_to_github.py — 将 workbench 目录下的文件同步到 GitHub Pages 仓库。
使用 Git Data API (Trees + Commits) 创建单次提交，避免多 commit 导致 Pages 构建冲突。

用法:
  python sync_to_github.py [文件1 文件2 ...]  # 只同步指定文件
  python sync_to_github.py                     # 同步全部文件

环境变量:
  GH_TOKEN  — GitHub fine-grained PAT（读 .github-token 作为 fallback）
"""
import base64, json, os, sys, urllib.request, urllib.error, pathlib

# 强制 IPv4：本机 IPv6 到 api.github.com 的 TLS 握手会被中断（SSL EOF）
import socket as _sock
_orig_gai = _sock.getaddrinfo
def _ipv4_only_gai(host, *a, **k):
    return [r for r in _orig_gai(host, *a, **k) if r[0] == _sock.AF_INET]
_sock.getaddrinfo = _ipv4_only_gai

REPO = "2974858874/workbench"
API = f"https://api.github.com/repos/{REPO}"
WORKBENCH_DIR = pathlib.Path(__file__).parent

# 获取 token
token = os.environ.get("GH_TOKEN", "").strip()
if not token:
    token_file = WORKBENCH_DIR / ".github-token"
    if token_file.exists():
        token = token_file.read_text().strip()
if not token:
    print("ERROR: No token found. Set GH_TOKEN env or create .github-token")
    sys.exit(1)

SKIP = {".git", ".github-token", "__pycache__"}

def api_call(method, path, data=None):
    """调用 GitHub API"""
    url = f"{API}/{path}" if not path.startswith("http") else path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read()) if resp.status != 204 else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:300]
        print(f"  API ERROR {e.code}: {body}")
        raise

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
        dirs[:] = [d for d in dirs if d not in SKIP]
        for fname in filenames:
            if fname in SKIP:
                continue
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, WORKBENCH_DIR).replace("\\", "/")
            files.append((full, rel))
    return files

def sync_batch(files):
    """使用 Git Trees API 创建单次提交，包含所有文件变更"""
    # 1. 获取 main 分支当前 commit SHA
    ref = api_call("GET", "git/refs/heads/main")
    commit_sha = ref["object"]["sha"]
    print(f"  当前 main: {commit_sha[:7]}")

    # 2. 获取当前 commit 的 tree SHA
    commit_data = api_call("GET", f"git/commits/{commit_sha}")
    base_tree = commit_data["tree"]["sha"]

    # 3. 构建 tree items（每个文件一个 blob）
    tree_items = []
    for local_path, repo_path in files:
        with open(local_path, "rb") as f:
            content = base64.b64encode(f.read()).decode()
        # 创建 blob
        blob = api_call("POST", "git/blobs", {"content": content, "encoding": "base64"})
        tree_items.append({
            "path": repo_path,
            "mode": "100644",
            "type": "blob",
            "sha": blob["sha"],
        })
        print(f"  blob: {repo_path}")

    # 4. 创建新 tree（基于 base_tree）
    new_tree = api_call("POST", "git/trees", {
        "base_tree": base_tree,
        "tree": tree_items,
    })

    # 5. 创建 commit
    new_commit = api_call("POST", "git/commits", {
        "message": f"sync {len(files)} file(s): {', '.join(f for _, f in files[:5])}{'...' if len(files) > 5 else ''}",
        "tree": new_tree["sha"],
        "parents": [commit_sha],
    })

    # 6. 更新 main 分支引用
    api_call("PATCH", "git/refs/heads/main", {
        "sha": new_commit["sha"],
        "force": False,
    })

    print(f"  commit: {new_commit['sha'][:7]} ({len(files)} files)")

def main():
    specific = sys.argv[1:] if len(sys.argv) > 1 else None
    files = collect_files(specific)
    if not files:
        print("No files to sync.")
        return

    print(f"Syncing {len(files)} file(s) to {REPO} (single commit)...")
    try:
        sync_batch(files)
        print(f"\nDone: {len(files)} files synced in 1 commit")
    except Exception as e:
        print(f"\nFAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
