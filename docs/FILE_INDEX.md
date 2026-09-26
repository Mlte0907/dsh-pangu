<!-- 本文件由 scripts/gen_file_index.py 自动生成，**不要手改**。 -->
<!-- 改动生成器后重新运行；tests/test_file_index.py 会校验它与真实目录树一致。 -->

# dsh-pangu 文件职责索引

> 全仓库源文件的逐文件职责。**行数**用于判断体量，**首句 docstring** 是职责摘要。
> 想了解「插件是什么 / 怎么跑 / 架构与边界」→ 读 [`MAINTAINERS.md`](../MAINTAINERS.md)，
> 本文件只回答「哪个文件干什么」。

共 **38** 个源文件 / **8,601** 行。


## `lib/` — 5 文件 / 4,834 行

插件主体：宿主面服务、浏览器端面板、Typert 契约、MCP 配置注入

| 文件 | 行 | 职责（首句 docstring） |
| --- | ---: | --- |
| `client.js` | 3002 | (解析失败: SyntaxError) |
| `index.js` | 1118 | (解析失败: SyntaxError) |
| `mcp-inject.js` | 155 | (解析失败: SyntaxError) |
| `typert.host.js` | 523 | (解析失败: SyntaxError) |
| `version.js` | 36 | (解析失败: SyntaxError) |

## `test/` — 16 文件 / 2,324 行

测试（node --test）

| 文件 | 行 | 职责（首句 docstring） |
| --- | ---: | --- |
| `admin/admin-credential.mjs` | 137 | (解析失败: SyntaxError) |
| `admin/admin-pane.mjs` | 192 | (解析失败: SyntaxError) |
| `config/ensure-dir.mjs` | 97 | (解析失败: SyntaxError) |
| `dfx/dfx.test.js` | 50 | (解析失败: SyntaxError) |
| `file_index_check.mjs` | 193 | (解析失败: SyntaxError) |
| `graph/crystal-pane.mjs` | 185 | (解析失败: SyntaxError) |
| `integration/injection.test.js` | 101 | (解析失败: SyntaxError) |
| `mcp-inject.test.js` | 112 | (解析失败: SyntaxError) |
| `proactive/cache-algo.test.js` | 101 | (解析失败: SyntaxError) |
| `proactive/config-infra.test.js` | 89 | (解析失败: SyntaxError) |
| `proactive/consolidate-pipeline.test.js` | 127 | (解析失败: SyntaxError) |
| `settings/llm-config.test.js` | 164 | (解析失败: SyntaxError) |
| `settings/llm-form.test.js` | 414 | (解析失败: SyntaxError) |
| `settings/save-semantics.mjs` | 220 | (解析失败: SyntaxError) |
| `version/check-update.mjs` | 105 | (解析失败: SyntaxError) |
| `version/is-newer.test.js` | 37 | (解析失败: SyntaxError) |

## `lib/proactive/` — 14 文件 / 790 行

主动记忆注入管线：14 个小模块，宿主进程内每轮对话跑一次

| 文件 | 行 | 职责（首句 docstring） |
| --- | ---: | --- |
| `budget-allocator.js` | 38 | (解析失败: SyntaxError) |
| `circuit-breaker.js` | 52 | (解析失败: SyntaxError) |
| `config.js` | 93 | (解析失败: SyntaxError) |
| `consolidation-detector.js` | 58 | (解析失败: SyntaxError) |
| `consolidation-writer.js` | 86 | (解析失败: SyntaxError) |
| `context-formatter.js` | 19 | (解析失败: SyntaxError) |
| `dedup-tracker.js` | 46 | (解析失败: SyntaxError) |
| `injection-pipeline.js` | 88 | (解析失败: SyntaxError) |
| `mcp-client.js` | 64 | (解析失败: SyntaxError) |
| `memory-fetcher.js` | 39 | (解析失败: SyntaxError) |
| `message-cache.js` | 45 | (解析失败: SyntaxError) |
| `score-ranker.js` | 36 | (解析失败: SyntaxError) |
| `sensitive-filter.js` | 22 | (解析失败: SyntaxError) |
| `stats-collector.js` | 104 | (解析失败: SyntaxError) |

## `scripts/` — 3 文件 / 653 行

运维/验证脚本

| 文件 | 行 | 职责（首句 docstring） |
| --- | ---: | --- |
| `gen_file_index.py` | 166 | 生成「文件职责索引」→ docs/FILE_INDEX.md。 |
| `verify-galaxy.cjs` | 260 | (解析失败: SyntaxError) |
| `verify-knowledge.cjs` | 227 | (解析失败: SyntaxError) |

---

## 怎么读这个索引

- **改动前**：先在 `MAINTAINERS.md` 找相关子系统，再到这里定位文件。
- **改动后**：`tests/test_file_index.py` 会校验索引与真实目录树一致。
- docstring 缺失的文件会标 `(无 docstring)` —— 那本身是个信号。
