#!/usr/bin/env python3
"""生成「文件职责索引」→ docs/FILE_INDEX.md。

**为什么自动生成**：手写索引一定腐烂，而索引腐烂比没有索引更糟（它会误导人）。
所以索引由本脚本从真实目录树 + 每个文件的 docstring 首句生成，
`tests/test_file_index.py` 负责保鲜。

用法：
    node scripts/gen_file_index.mjs            # 写入 docs/FILE_INDEX.md
    node scripts/gen_file_index.mjs --check    # 只校验是否最新
    node scripts/gen_file_index.mjs --stdout   # 打到标准输出
"""

import argparse
import ast
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "FILE_INDEX.md"

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".pytest_cache", ".ruff_cache", ".DS_Store"}


def skipped(rel) -> str | None:
    """返回跳过原因，None 表示不跳过。

    点开头的目录一律跳过（2026-09-26 定的）：备份目录 / 编辑器临时目录里的文件
    不是「这个仓库现在是什么」，数进索引只会让索引开始撒谎。
    """
    for part in rel.parts[:-1]:
        if part in SKIP_DIRS or part.startswith("."):
            return part
    return None

SUBSYSTEMS = {
    "lib": "插件主体：宿主面服务、浏览器端面板、Typert 契约、MCP 配置注入",
    "lib/proactive": "主动记忆注入管线：14 个小模块，宿主进程内每轮对话跑一次",
    "test": "测试（node --test）",
    "scripts": "运维/验证脚本",
    "docs": "文档",
}

HEADER = """<!-- 本文件由 scripts/gen_file_index.py 自动生成，**不要手改**。 -->
<!-- 改动生成器后重新运行；tests/test_file_index.py 会校验它与真实目录树一致。 -->

# dsh-pangu 文件职责索引

> 全仓库源文件的逐文件职责。**行数**用于判断体量，**首句 docstring** 是职责摘要。
> 想了解「插件是什么 / 怎么跑 / 架构与边界」→ 读 [`MAINTAINERS.md`](../MAINTAINERS.md)，
> 本文件只回答「哪个文件干什么」。

"""

FOOTER = """
---

## 怎么读这个索引

- **改动前**：先在 `MAINTAINERS.md` 找相关子系统，再到这里定位文件。
- **改动后**：`tests/test_file_index.py` 会校验索引与真实目录树一致。
- docstring 缺失的文件会标 `(无 docstring)` —— 那本身是个信号。
"""


def first_docstring(path: Path) -> str:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8", errors="replace"))
    except (SyntaxError, ValueError) as e:
        return f"(解析失败: {type(e).__name__})"
    doc = ast.get_docstring(tree)
    if not doc:
        return "(无 docstring)"
    line = doc.strip().split("\n")[0].strip()
    return line or "(空 docstring)"


def count_lines(path: Path) -> int:
    try:
        with path.open("rb") as f:
            return sum(1 for _ in f)
    except OSError:
        return 0


def group_key(rel: Path) -> str:
    parts = rel.parts
    if len(parts) > 2 and parts[0] == "lib":
        return "/".join(parts[:2])
    return parts[0] if len(parts) > 1 else "(仓库根)"


def display_path(rel: Path, group: str) -> str:
    try:
        return str(rel.relative_to(Path(group)))
    except ValueError:
        return str(rel)


def collect() -> dict:
    groups: dict = {}
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file() or p.suffix not in (".js", ".mjs", ".cjs", ".py"):
            continue
        rel = p.relative_to(ROOT)
        if skipped(rel) is not None:
            continue
        key = group_key(rel)
        groups.setdefault(key, []).append((display_path(rel, key), count_lines(p), first_docstring(p)))
    return groups


def render() -> str:
    groups = collect()
    out = [HEADER]
    total_files = sum(len(v) for v in groups.values())
    total_lines = sum(l for v in groups.values() for _, l, _ in v)
    out.append(f"共 **{total_files}** 个源文件 / **{total_lines:,}** 行。\n\n")
    for top in sorted(groups, key=lambda k: -sum(l for _, l, _ in groups[k])):
        files = sorted(groups[top], key=lambda t: t[0])
        sub = sum(l for _, l, _ in files)
        desc = SUBSYSTEMS.get(top, "")
        out.append(f"\n## `{top}/` — {len(files)} 文件 / {sub:,} 行\n")
        if desc:
            out.append(f"\n{desc}\n")
        out.append("\n| 文件 | 行 | 职责（首句 docstring） |\n")
        out.append("| --- | ---: | --- |\n")
        for rel, lines, doc in files:
            out.append(f"| `{rel}` | {lines} | {doc} |\n")
    out.append(FOOTER)
    return "".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--stdout", action="store_true")
    args = ap.parse_args()

    content = render()
    if args.stdout:
        sys.stdout.write(content)
        return 0
    if args.check:
        if not OUT.exists():
            print(f"{OUT} 不存在，请运行 scripts/gen_file_index.py", file=sys.stderr)
            return 1
        if OUT.read_text(encoding="utf-8") != content:
            print(
                f"{OUT.relative_to(ROOT)} 已过期（目录树或 docstring 变了）。"
                f"请运行: python3 scripts/gen_file_index.py",
                file=sys.stderr,
            )
            return 1
        print("文件索引是最新的。")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(content, encoding="utf-8")
    n = sum(1 for line in content.splitlines() if line.startswith("| `"))
    print(f"已写入 {OUT.relative_to(ROOT)}（{n} 个文件条目）。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
