# dsh-pangu MCP 断连根因报告（供盘古管理员排查）

> ## ✅ 状态：已修复（2026-09-23 当天）
>
> 根治方式是**去掉 `require('fs')`**，改为 `lib/mcp-inject.js` 在**宿主启动时**往 MCP 行注入
> 凭据（见 `cordis.patch.yml` 的 `mcp-pangu` 行注释、`MAINTAINERS.md` §2 构建期注入一行）。
> 现在取值来自设置页共用的 `~/.pangu/config.json`，且**解析失败会响亮失败，不再静默回退**
> 到 `127.0.0.1:19529` + 空 `X-API-Key`。
>
> **本报告保留作 postmortem** —— `lib/index.js:11`、`lib/mcp-inject.js:7`、
> `cordis.patch.yml:14` 三处源码注释都引用它，所以它必须和代码放在同一个仓库里。
> 本文其余内容是事发当天的原始记录，**状态一节已过时，看下面的症状/时间线即可**。


- 日期：2026-09-23 · 结论：**dsh-pangu 插件缺陷，非 DSH 缺陷，非服务端故障**
- 一句话：dsh-pangu 在 `cordis.patch.yml` 的 `!!js` 配置表达式里用 `require('fs')` 读取 `~/.pangu/config.json`，但 DSH Loader 求值 `!!js` 的作用域中不存在 `require`，IIFE 的 `catch` 把异常静默吞掉并回退到 `http://127.0.0.1:19529/mcp` + 空 `X-API-Key`，于是 MCP 客户端永远拨向一台本机上不存在的服务。
- 影响面：仅 MCP 通道。REST API（Bearer `pgp_…`）读写全程正常；盘古服务端自身健康（见 E7/E8）。

## 1. 症状与时间线

| 项 | 观测 |
|---|---|
| 会话内 MCP 探测 | `list_mcp_resources(server: pangu)` → `Error: mcp-client(pangu): server is disconnected` |
| 复现稳定性 | 今日多次重启均复现：03:22、04:05、04:20、06:11（web.log 内 `dsh-restart` 标记） |
| 错误来源 | DSH 侧 `packages/mcp/mcp-client/src/connection.ts:369`：连接对象存在但从未连上（`client === undefined \|\| connectedAt === undefined`）时抛此错 |
| 配置文件时序 | `~/.pangu/config.json` mtime 2026-09-22 21:27:20，早于今日全部重启——排除"配置没写/没来得及写" |

## 2. 根因链条（每环均有实证，见第 3 节）

```
[dsh-pangu cordis.patch.yml:12,20]
  url / X-API-Key = !!js IIFE，内部 require('fs') 读 ~/.pangu/config.json
        ↓
[DSH Loader 求值语义 vendor/loader/src/config/utils.ts:5]
  evaluate = new Function('ctx','expr', `with (ctx) { return eval(expr) }`)
  作用域 = fiber 的 cordis Context + JS 全局；二者都没有 require（进程为 ESM）
        ↓
[IIFE 的 catch(e) 吞掉 ReferenceError/TypeError]
  url  → 'http://127.0.0.1:19529/mcp'   ← 回退默认值
  key  → ''                              ← 回退默认值
        ↓
[MCP 客户端拨号 127.0.0.1:19529]
  curl: (7) Failed to connect —— 本机无任何进程监听 19529
        ↓
[重连退避 10 次后放弃 connection.ts:233；资源请求恒抛 "server is disconnected"]
```

关键点：**`catch` 静默回退使 misconfig 完全不可见**——这违反 DSH 仓库既定原则 "Misconfiguration fails loud … never silently skip"（AGENTS.md:142）。若没有这个 catch，激活期就会带原始异常失败并在启动诊断里暴露。

## 3. 证据清单（管理员可逐条复跑）

### E1 · 真实 Loader 求值器跑插件原样 IIFE（决定性）

```bash
cd <deepseek-harness 仓库> && node --import tsx/esm --input-type=module -e "
import { evaluate } from './vendor/loader/src/config/utils.ts'
const urlExpr = \"(function(){ try { const c = JSON.parse(require('fs').readFileSync(require('path').join(require('os').homedir(),'.pangu','config.json'),'utf8')); return String(c.pangu_base_url || 'http://127.0.0.1:19529').replace(/\\\\/+\$/, '') + '/mcp' } catch(e) { return 'http://127.0.0.1:19529/mcp' } })()\"
const keyExpr = \"(function(){ try { const c = JSON.parse(require('fs').readFileSync(require('path').join(require('os').homedir(),'.pangu','config.json'),'utf8')); return String(c.api_key || '').trim() } catch(e) { return '' } })()\"
console.log('[url] =>', JSON.stringify(evaluate({}, urlExpr)))
console.log('[key] =>', JSON.stringify(evaluate({}, keyExpr)))
"
```

实测输出：

```
[url] => "http://127.0.0.1:19529/mcp"
[key] => ""
```

即：`require('fs')` 抛 `require is not defined` → 被 `catch` 捕获 → 返回回退值。配置文件内容正确也读不到，因为**读取动作本身不可执行**。

### E2 · 求值域没有 require（源码证据）

- 求值器实现：`vendor/loader/src/config/utils.ts:5-10`——`new Function('ctx','expr', …with(ctx){return eval(expr)}`；调用点 `vendor/loader/src/index.ts:112` 传入 `this.ctx`（fiber 的 cordis Context）。
- `new Function` 体内可见 = 函数参数 + 全局对象；**模块作用域的 `require` 天然不可见**（CJS 亦然，何况本进程是 ESM）。
- 进程启动方式（web.log 第 2 行）：`node --import tsx/esm apps/cli/src/bin.ts web`。
- 全仓检索无补救注入：`grep -rn "globalThis.require|global\.require" vendor/loader vendor/include packages/boot` → 0 命中；`grep -rn "provide('require'" vendor/ packages/` → 0 命中。
- ctx 上唯一的文件路径辅助是 `dshHomePath`（`packages/boot/app-boot/src/index.ts:35-36, 977`），它只给路径、不给 `fs`。

补充说明：上表用空对象模拟 ctx。真实 fiber Context 是属性代理，未知键要么回落全局（同样 ReferenceError）、要么解析为 undefined（TypeError "require is not a function"），两条路径都落进同一个 `catch` → 同一组回退值；且 E7/E8 的运行态证据独立封闭了这一环。

### E3 · dsh-pangu 的问题代码（插件源）

文件：`~/.dsh/profiles/web/node_modules/dsh-pangu/cordis.patch.yml`（dsh-pangu 0.5.1，pnpm 钉住 sha `34f10c7b767faffc431eb7af35080ca49f4fd478`）

```yaml
# 第 12 行
url: !!js (function(){ try { const c = JSON.parse(require('fs').readFileSync(require('path').join(require('os').homedir(),'.pangu','config.json'),'utf8')); return String(c.pangu_base_url || 'http://127.0.0.1:19529').replace(/\/+$/, '') + '/mcp' } catch(e) { return 'http://127.0.0.1:19529/mcp' } })()
# 第 16 行（注释，假设错误）
# X-API-Key 与上面的 url 共用同一个来源：…（!!js IIFE 在 Loader 挂载时求值）。
# 第 20 行
X-API-Key: !!js (function(){ try { const c = JSON.parse(require('fs').readFileSync(…),'utf8')); return String(c.api_key || '').trim() } catch(e) { return '' } })()
```

注释对"何时求值"的判断是对的，对"求值域能用什么"的判断是错的：`!!js` 作用域里没有 `fs` 世界的任何东西。

### E4 · DSH 官方对 `!!js` 作用域的约定（本应遵守的规范）

- 官方示例只用环境变量：`packages/mcp/mcp-client/README.md:52`——`` Authorization: !!js `Bearer ${process.env.MCP_TOKEN}` ``。
- app-boot 文档明示范围：`packages/boot/app-boot/src/index.ts:254`——user patch layers "may reference `process.env`"。
- 诊断陷阱：`dsh --dump-config` 打印 `!!js` 时**原样不求值**（`app-boot/src/index.ts:394` "print verbatim, unevaluated"）。管理员若用 dump-config 核对，会看到 IIFE 源码而非解析结果——静态检查发现不了本问题，必须用 E1 的运行时求值或 E7/E8 的端点探测。

### E5 · 回退目标：本机 19529 无服务

```text
$ curl -m3 http://127.0.0.1:19529/mcp
curl: (7) Failed to connect to 127.0.0.1 port 19529 after 0 ms: Could not connect to server
```

`ss -ltn | grep 19529` 同样无监听。回退值把客户端指向一个必然拒连的地址。

### E6 · 配置文件本身正确（排除"配置错"）

`~/.pangu/config.json`（mtime 2026-09-22 21:27:20）：

```json
{ "pangu_base_url": "http://113.45.134.86:19529", "api_key": "QTFxYi_…d9f9Gc", … }
```

值没有问题——问题是 E1 证明的"读不到"。

### E7 · 服务端健康：带正确密钥即 200

```text
$ curl -X POST http://113.45.134.86:19529/mcp -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' -H "X-API-Key: <config.json 的 api_key>" -d '<initialize>'
event: message
data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26",
       "serverInfo":{"name":"pangu","version":"0.4.1"},"capabilities":{"tools":{}}}}
# HTTP 200
```

2026-09-23 06:11 重启后复测仍 200。**服务端、鉴权模式（`mcp_require_auth`）、密钥三者全部有效。**

### E8 · 无凭据即 401（解释空密钥为什么致命）

```text
$ curl … -d '<initialize>'   # 不带 X-API-Key
{"jsonrpc":"2.0","id":1,"error":{"code":401,
 "message":"无凭据，mcp_require_auth=true 时需要 X-API-Key"}} 
```

回退后的空 `X-API-Key` 即使连上也会被 401 拒绝——双重必败。

### E9 · 运行态闭环（排除"也许 require 碰巧可用"）

逻辑链：若 `require` 在真实求值中可用 → url 必为 `http://113.45.134.86:19529/mcp`（E6 值正确）+ key 非空 → E7 证明该组合 200 → 客户端应已连上。而实测四次重启后恒为 `server is disconnected`（第 1 节）。运行态与回退解释一致，与"require 可用"解释矛盾。

### E10 · 为什么日志里看不到报错

- `grep -c "mcp-client|connection attempt|giving up" ~/.dsh/web.log` → **0**。
- 连接失败日志走 cordis `ctx.logger`（文案见 `connection.ts:238` 退避告警、`:233` 放弃错误），其输出路由不进 `web.log`（该文件只捕获进程 stdout 中插件直接 `console` 输出）。建议管理员在 **GUI 日志面板**里搜 `mcp-client(pangu)` 观察"attempt failed → giving up"序列。
- 更上游：配置求值阶段的异常被插件自己的 `catch` 吞掉（E1），那一层连 logger 都不会经过——这是"全程静默"的第一因。

## 4. 责任定界

| 候选 | 判定 | 依据 |
|---|---|---|
| 盘古服务端 | 无责 | E7 带正确密钥 200；E8 鉴权按设计工作 |
| `~/.pangu/config.json` | 无责 | E6 值正确、时序早于全部重启 |
| DSH（Loader/`!!js` 语义） | 无责 | 求值域定义与文档一致（E2/E4）；官方示例只承诺 `process.env`；`dump-config` 不求值是文档明载行为 |
| **dsh-pangu 0.5.1** | **有责，两点** | ① 在 `!!js` 中使用作用域外的 `require('fs')`（E1/E2/E3）；② `catch → fallback` 把配置错误静默化，违反 fail-loud 原则（AGENTS.md:142），是"全程无报错"的直接原因（E10） |

补充：本问题在当前 DSH 版本（0.1.7-alpha.2-0010283-dirty）上是**确定性**的，不依赖网络、时序或并发。历史版本是否恰好暴露过 `require` 无法从当前 checkout 证实；即使曾工作，也属旧实现巧合，当前语义明确不含 `require`。

## 5. 修复建议

### 5.1 止血（立即，DSH 侧已备好，管理员执行）

```bash
python3 /home/xiaoxin/deepseek-harness/.dsh-patches/apply-mcp-pangu-fix.py   # 支持 --dry-run 先看
# 然后重启 dsh（脚本会幂等拒绝重复追加）
```

- 机制：向 profile 的 `cordis.patch.yml` 追加 `id: mcp-pangu` 定向覆盖条目，把 `url` / `X-API-Key` 换成字面量；profile patch 层的应用顺序在 bundle patch 之后（该文件头部注释明载），覆盖必然生效。
- 值在执行时从 `~/.pangu/config.json` 现读——与插件设置页保持同一配置源；**仓库内模板用占位符，不落凭据**。
- 验证：重启后会话内 `list_mcp_resources(server: pangu)` 不再抛 disconnected；或工具列表出现 `mcp__pangu__*`；GUI 日志可见 `mcp-client(pangu)` 连接成功/`reconnected and re-synced tools`。

### 5.2 根治（上游 dsh-pangu，三选一，推荐 A）

| 方案 | 做法 | 评注 |
|---|---|---|
| A（推荐） | 配置解析移到插件 Node 侧代码（`lib/` 内 `require`/`fs` 可用），设置页保存时把解析结果**以字面量**写入 patch，或运行时通过 entry update 注入 mcp-pangu 配置 | 消除对 `!!js` 作用域的错误假设；保留"设置页 = 配置源"设计 |
| B | 保留 `!!js` 但只用作用域内能力：设置页保存时把 url/key 写进环境或直接改写 patch 字面量 | 次优，涉及写文件/环境注入的取舍 |
| C（底线） | 删除 `catch → fallback`，让异常在激活期直接抛出 | 单点即可让今后的 misconfig 当场暴露（fail-loud），但不解决"读不到配置"本身 |

同时应修正 `cordis.patch.yml:16` 的注释（当前注释固化了错误假设，会误导后续维护者）。

### 5.3 服务端

无需任何改动。

## 6. 环境快照（复现基线）

| 项 | 值 |
|---|---|
| DSH | 0.1.7-alpha.2-0010283-dirty（2026-09-23 02:04 全新 clone） |
| 启动 | `node --import tsx/esm apps/cli/src/bin.ts web`（Node v24.21.0，ESM） |
| dsh-pangu | 0.5.1 @ `34f10c7b767faffc431eb7af35080ca49f4fd478`（profile node_modules） |
| 盘古 MCP 端点 | `http://113.45.134.86:19529/mcp`，serverInfo `pangu 0.4.1`，protocol `2025-03-26`，`mcp_require_auth=true` |
| 凭据（脱敏） | config.json `api_key=QTFxYi_…d9f9Gc`；平台 Token `pgp_J-Us8…ZFc`（REST 用，MCP 用前者） |
| 今日重启 | 03:22 / 04:05 / 04:20 / 06:11，断连恒定复现 |

## 7. 附：关键引用索引

| 证据 | 位置 |
|---|---|
| 问题代码（url/key IIFE） | `~/.dsh/profiles/web/node_modules/dsh-pangu/cordis.patch.yml:12,16,20` |
| Loader 求值器 | `vendor/loader/src/config/utils.ts:5`（evaluate）、`:12`（interpolate） |
| 求值调用点（传 fiber ctx） | `vendor/loader/src/index.ts:112` |
| `!!js` 作用域文档 | `packages/boot/app-boot/src/index.ts:254`；官方示例 `packages/mcp/mcp-client/README.md:52` |
| dump-config 不求值 | `packages/boot/app-boot/src/index.ts:394` |
| disconnected 抛错 | `packages/mcp/mcp-client/src/connection.ts:369` |
| 重连放弃 | `packages/mcp/mcp-client/src/connection.ts:233` |
| fail-loud 原则 | `AGENTS.md:142` |
| 止血补丁/生成脚本 | `.dsh-patches/mcp-pangu-fix.patch.yml`、`.dsh-patches/apply-mcp-pangu-fix.py` |
