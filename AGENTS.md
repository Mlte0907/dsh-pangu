# 项目指令：dsh-pangu（DSH ↔ 盘古接入插件）

> 本文件由 DSH agent-instructions 机制**自动注入每个进入本项目的会话**，刻意保持精简。
> **细节全在 [`MAINTAINERS.md`](./MAINTAINERS.md)，按需查。**

## 🔴 两条硬规则

1. **动这个插件之前先读 [`MAINTAINERS.md`](./MAINTAINERS.md)**（尤其 §0 四条认知错误、§7 已知坑）。
2. **维护完成后必须写维护日志**：在 `MAINTAINERS.md` 的「§10 维护日志」追加一条
   （日期 / 改了什么 / 为什么 / 怎么验证）。收尾跑 `node --test` 必须绿，
   其中 `test/file_index_check.mjs` 会核对日志日期是否落后于源码修改时间。

## 环境速查

| 项 | 值 |
| --- | --- |
| 安装 | `link:` 进 DSH profile（`~/.dsh/profiles/web/node_modules/dsh-pangu`） |
| 构建 | **无构建步骤**。`lib/client.js` 浏览器直接吃源码 |
| 装依赖 | `lib/typert.host.js` 需要 `zod`，缺了会导致 DSH 启动失败 |
| 渲染测试依赖 | 仓库自带 `node_modules`（jsdom/react/react-dom） |

## 说明书索引（`MAINTAINERS.md`）

| 你要知道的 | 看哪节 |
| --- | --- |
| 容易误判的地方（测试静默跳过、去重是兜底、`total` 契约、改哪边生效） | §0 四条最容易踩的认知错误 |
| 这个插件是什么、**不含什么** | §1 这个插件是什么 |
| **浏览器侧 vs 宿主侧：改哪边要做什么才生效** | §2 运行形态 |
| 仪表盘 5 个视图 + 设置页 | §3 仪表盘的 5 个视图 |
| 宿主面服务与凭据注入 | §4 宿主面服务 |
| 主动记忆注入管线（14 个模块） | §5 主动记忆注入 |
| 与云端盘古的契约（`total` 语义、字段、鉴权） | §6 与云端盘古的契约 |
| 已知坑（都是实测踩出来的） | §7 已知坑 |
| 测试怎么跑（渲染测试要显式传 `PANGU_TEST_MODULES`） | §8 测试怎么跑 |
| 常用脚本 | §9 常用脚本 |
| **维护日志**（硬性要求，改完必写） | §10 维护日志 |
| 维护规矩 | §11 维护规矩 |
| 每个文件干什么（37 个） | [`docs/FILE_INDEX.md`](./docs/FILE_INDEX.md)（自动生成） |

## 三条最贵的教训

- **改 `lib/index.js` / `typert.host.js` / `mcp-inject.js` / `cordis.patch.yml` 必须 `dsh-restart`**；
  只有 `lib/client.js` 刷新浏览器就行。改错地方会以为「没生效」。
- **绝不要 `pkill`/`kill` DSH 宿主进程**，用 `dsh-restart`。
- **渲染测试会静默 `exit 0`**。必须显式
  `PANGU_TEST_MODULES=<repo>/node_modules node test/xxx.mjs`，否则你测了个空气。
