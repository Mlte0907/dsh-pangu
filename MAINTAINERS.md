# dsh-pangu 维护说明书（MAINTAINERS.md）

> **给下一个维护这个插件的 agent / 人。** 目标是让你不必靠翻 5000 行代码和试错来了解它。

## 🔴 维护流程（硬性，不是建议）

```
1. 动手之前  →  读完本文件（尤其 §0 四条认知错误 与 §7 已知坑）
2. 定位根因  →  别信注释/docstring，它们会说谎（§11）
3. 改 + 验证 →  node --test（跑测试的方式有坑，见 §9）
4. 写日志    →  在 §10 的「维护日志」追加一条：日期 / 改了什么 / 为什么 / 怎么验证
5. 收尾自检  →  node --test test/file_index_check.mjs 必须绿
```

**第 4 步为什么硬**：`test/file_index_check.mjs` 核对「日志最新日期 ≥ 源码最新 mtime」，
改了代码不写日志即失败。**第 1 步为什么硬**：下面每条结论都是踩坑换来的。

---

## 0. 四条最容易踩的认知错误

| 你可能以为 | 实际是 |
| --- | --- |
| 跑 `node test/xxx.mjs` 就能验证 | **渲染类测试会静默跳过**并 `exit 0`。必须显式 `PANGU_TEST_MODULES=<repo>/node_modules` |
| `lib/client.js` 里的去重逻辑是修复 | **是兜底，且已被注释停用**。真正的修复在云端盘古 |
| 服务端返回的 `total` 是「命中总数」 | 契约是 `total == len(results)`。改动它会污染 `pangu_search_stats` |
| 改了 `lib/` 刷新浏览器就生效 | `client.js` 是浏览器按需拉取（刷新即可），但 **`lib/index.js` / `typert.host.js` 是宿主进程里跑的，必须 `dsh-restart`** |

这四条我今天全部踩过。

---

## 1. 这个插件是什么

DSH（DeepSeek Harness）侧的**盘古记忆接入层**。三件事：

1. **把云端盘古接进 DSH 的 MCP**（`@deepseek-ai/dsh-mcp-client` 能调盘古的 31 个工具）
2. **给 DSH 做一个盘古仪表盘**（原对话区里的「盘古」标签页，纯前端，浏览器里跑）
3. **主动记忆注入**（每轮对话把相关记忆自动注入上下文，省得 agent 自己去搜）

它**不含**记忆引擎本体。引擎在云端盘古（`/root/pangu`）。**这里的一切都只是接入层。**

---

## 2. 运行形态（三个进程位置，别搞混）

| 位置 | 文件 | 何时生效 | 说明 |
| --- | --- | --- | --- |
| **浏览器** | `lib/client.js`（2892 行） | 刷新页面 | 仪表盘 UI。React + 纯 JS，**没有构建步骤**（浏览器直接吃源码） |
| **DSH 宿主进程** | `lib/index.js`（1116 行）、`lib/typert.host.js`（510 行） | `dsh-restart` | 宿主面服务（`remote.*`）、主动注入、MCP 配置重注 |
| **构建期注入** | `lib/mcp-inject.js`（155 行） | 宿主启动时 | 往 MCP 行注入凭据，**根治了「MCP 恒 disconnected」** |

### 铁律

- 改 `lib/client.js` → 刷新浏览器
- 改 `lib/index.js` / `lib/typert.host.js` / `lib/mcp-inject.js` / `cordis.patch.yml` → **`dsh-restart`**
- **绝不要** `pkill`/`kill` 宿主进程。用 `dsh-restart`（它会停旧实例、起新实例、写带时间戳横幅、等端口就绪、并打印轮换后的新 token）。

---

## 3. 仪表盘的 5 个视图 + 设置页

`client.js` 里 `PanguTab` 组件，标签导航在 `views` 数组（`lib/client.js:2118-2124` 附近）：

| 视图 | key | 作用 | 关键实现 |
| --- | --- | --- | --- |
| 概览 | `overview` | 状态与记忆脉搏 | KPI 环从 `dash.stats` 实算，取不到显示 `—` 不编数 |
| 星系 | `graph` | 3D 实体关系图 | Canvas，`nm = new Map(nodes.map(n => [n.id, n]))` 建索引；空闲节流 15fps，尊重 `prefers-reduced-motion` |
| 结晶 | `crystal` | 知识实体索引（列表） | 筛选走 `matchSet`/`filteredNodes` |
| 知识 | `knowledge` | 可复用结论 | 380px 主从布局 |
| 管理 | `admin` | 体检与平台/钥匙 | 独立校验 admin 凭据 |

设置页在 DSH 的设置区（`settings.section`），负责 `~/.pangu/config.json` 的真实读写。

---

## 4. 宿主面服务（`lib/index.js`）

`ctx.provide(serviceName, ...)` 逐个挂载，客户端通过 `remote.<service>.<method>` 调用：

| service | 职责 |
| --- | --- |
| `panguDashboard` | 仪表盘数据、深度健康、检查更新、备份 |
| `panguKG` | **只有一个 `graph()`**：`GET ${PANGU_BASE}/api/v2/graph?limit=400`，原样透传 |
| `panguConfig` | 读配置，**密钥脱敏**（`_set` / `_hint` 标记，明文绝不出宿主） |
| `panguAdminKeys` | 钥匙/房间管理 |
| `panguPlatforms` | 平台列表与待审 |

### 凭据注入

`fetchJson()` 对**所有 `PANGU_BASE` 前缀**的请求加 `x-api-key`（`lib/index.js:169-188`）。
按前缀判定而不是无差别加头 —— `fetchJson` 也被 `/v1/usage` 复用，那是外部 LLM 端点，
无差别加头等于把 `pgk_*` 钥匙泄漏出去。**改这段时别把这个判断简化掉。**

---

## 5. 主动记忆注入（`lib/proactive/`，14 个模块）

每轮对话在**宿主进程内**跑一次，把相关记忆注入上下文：

```
message-cache → sensitive-filter → dedup-tracker → circuit-breaker
      → memory-fetcher(MCP 调云端) → score-ranker → budget-allocator
      → context-formatter → injection-pipeline → stats-collector
```

每个模块都很小（18~103 行），职责单一。改注入行为先看 `injection-pipeline.js`（编排）。

`consolidation-detector.js` / `consolidation-writer.js` 负责「该沉淀时自动写一条记忆」。

---

## 6. 与云端盘古的契约

**插件是消费者，引擎在云端。** 契约点：

| 契约 | 约定 | 违约后果 |
| --- | --- | --- |
| `GET /api/v2/graph` | 返回 `code/data.nodes/data.edges`，**`total == len(nodes)`** | 破坏即插件显示错乱 |
| `nodes[].id` | **必须存在且唯一** | 星系图按 id 建索引，缺失即塌缩 |
| `nodes[].memory_count` | 整数 | 缺失显示 0（服务端已改为现算） |
| 凭据 | 请求带 `x-api-key` | 401 |
| 工具暴露面 | 默认 31 个 | 调未暴露工具得 `code=1002` |

**图谱接口现在需要凭据了**（2026-09-26 从服务端豁免名单摘除）。匿名可读全库图谱是已修的漏洞。
所以 `fetchKG` 拿不到 key 就会失败 —— 这是**预期行为**，不是回归。

---

## 7. 已知坑（都是实测踩出来的）

1. **渲染测试会静默跳过**。默认从 `/tmp/pangu-render-test/node_modules` 取 jsdom/react，
   该目录不存在 → 打印「﹣ 跳过」并 `exit 0`。**`test/admin/admin-pane.mjs` 长期处于这个状态**
   而没人发现。正确跑法：
   ```sh
   PANGU_TEST_MODULES=<repo>/node_modules node test/admin/admin-pane.mjs
   ```
   `test/file_index_check.mjs` 会校验这个环境变量写法存在。
2. **加载真实 `client.js` 的办法**是 `eval` 整个文件 + `window.__ModuleLoader__` 桩
   （见 `test/admin/admin-pane.mjs:125`）。不要试图 `require` 它 —— 它是浏览器脚本。
3. **React 的 act 弃用提示走 `console.error`**，会被「收集渲染错误」的钩子误判为失败。
   要按消息过滤。
4. **实体计数必须限定在 `.pangu-dashboard-entity-row` 内**。数整页文本会假阳性 ——
   「盘古」这个实体名同时出现在品牌区和标签名里，整页数出 4 次。
5. **改 `cordis.patch.yml` 后必须 `dsh-restart`**。cordis 的 HMR 在 web 实例不生效。
6. **不能 `pkill` DSH 宿主进程**。用 `dsh-restart`（见 §2 铁律）。
7. **`total` 契约**：服务端为分档会超额取，若把引擎给的 total 直接透传，会报出池子大小
   （`limit=30` → `total=90` 而实际返回 30）。契约是 `total == len(results)`。

---

## 8. 测试怎么跑

```sh
# 全部（node --test，会自动发现 test/ 下的 *.test.js / *.mjs）
node --test

# 渲染类必须显式指定依赖，否则静默跳过
PANGU_TEST_MODULES=<repo>/node_modules node test/graph/crystal-pane.mjs
PANGU_TEST_MODULES=<repo>/node_modules node test/admin/admin-pane.mjs
```

| 目录 | 测什么 |
| --- | --- |
| `test/graph/` | 结晶页渲染、客户端与服务端的分工（原样透传） |
| `test/admin/` | 管理页渲染、admin 凭据 |
| `test/settings/` | 设置页读写语义、LLM 表单 |
| `test/proactive/` | 注入管线各环节 |
| `test/version/` | 版本比较、更新检查 |
| `test/dfx/` | 注入性能（P95） |
| `test/integration/` | 注入集成 |

---

## 9. 常用脚本

| 脚本 | 用途 |
| --- | --- |
| `scripts/gen_file_index.py` | 生成 `docs/FILE_INDEX.md`（改完文件职责跑一次） |
| `scripts/verify-galaxy.cjs` | `pnpm run test:browser`，星系图浏览器验证 |

`docs/FILE_INDEX.md` 是自动生成的，**不要手改**。

---

## 10. 维护日志

> 格式：`- **YYYY-MM-DD** — 改了什么 / 为什么 / 怎么验证的`。最新在最上面。
> 由 `test/file_index_check.mjs` 核对最新日期。

- **2026-09-26** — 知识页从静态 380px 主从列改为抽屉式主从：点行右侧滑出详情、列表压窄保持可见、↑↓ 切换且只刷新面板。
  - **改**（用户要求）：`.pangu-dashboard-split` 换成 `.pangu-dashboard-master` +
    `.pangu-dashboard-drawer`。关闭时列表占满整宽（实测 1044px）；`data-drawer="open"` 时
    列表压到 400px **但仍可见**、详情从右侧 translateX 滑入。用
    `transition:grid-template-columns` 让「压窄」与「滑出」是同一条动画。
  - **改**：行组件抽成模块级 `KnowledgeRow`（`React.memo`），`CAT_LABELS`/`CAT_COLORS`/`kbDate`
    一并提到模块作用域 —— 留在 KnowledgePane 里的话每次 render 都产出新对象引用，memo 全废。
    `onPick` 用 `useCallback` 固定引用（同理）。
  - **改**：列表容器 `role="listbox" tabIndex=0`，行 `role="option" aria-selected`；
    键盘 ↑↓ 移动、Home/End 跳首尾、Esc 收起，另有 × 按钮。当前行沿用本站三编码：
    左侧色条 + 底色 + 描边。
  - **验证**（「只刷新面板内容」用 DOM 身份证明，不靠感觉）：给 59 行 DOM 各打一个戳，
    连按三次 ↓ 后 **59/59 个节点身份全部存活**、`listDomUnchanged=true`，只有详情标题变了。
    另外实测：未选中列表 1044px / 抽屉 opacity 0；点行后 400px 且 `offsetParent` 非空、
    opacity 1；`data-current` 始终恰好 1 个；Esc 收回 1044px。零 JS 异常。
  - **连带修**（抽屉带来的回归，回归测试抓到的）：`.pangu-dashboard-scroll` 原带
    `overscroll-behavior:contain`。抽屉关闭时列表占满整宽（实测 1044px），整页没有
    「列表之外」可放指针的地方；列表滚到底后事件被 contain 吃掉，**用户卡在列表末尾、
    够不到页脚**。改为只在页面级滚动容器用 contain，列表那一级保持默认 auto：
    列表到头后继续滚，事件传给页面。实测滚到底 page=533/533。
  - **顺带修了回归测试本身**：`scrollverify` 原来只滚一次、且假设指针下方就是页面滚动容器，
    在知识页永远判「滚不动」——而实际是滚轮落在列表上、滚的是列表。
    已改成「反复滚到触底，页面或内层任一到达即算成功」。长期红的测试比没有测试更糟。
  - **踩**（自己埋的）：替换 `const updateDate = …` 那几行时把函数定义换没了，详情里的
    `updateDate(selected)` 调用点没跟着改 → **点第一行就 ReferenceError，主从块整块消失**。
    `node --check` 查不出未定义引用，只有真点一次才会暴露。顺带发现
    `__check` 层面的教训：改函数定义时必须同时 `grep` 该函数名的所有调用点。
  - **验证**：`PANGU_TEST_MODULES=<repo>/node_modules node --test` → 117/117。

- **2026-09-26** — 修移动端（≤720px）盘古工作台完全滚不动：720px 断点把唯一的滚动容器设成了 `overflow:visible`。
  - **现象**：窄视口下概览/结晶/知识等内容超出视口，滚轮与触摸都滚不动，底部完全够不着。
  - **根因**：`client.js` 的 `@media (max-width:720px)` 把 `main-wrap` / `main` /
    `scroll` 三级一起设成 `overflow:visible`，本意是「移动端让页面自己滚」——
    这是从 V3 移植前的旧版抄来的写法。但 V3 移植后宿主滚动已被
    `body[data-pangu-view]` 的两条规则关掉（见「藏掉 DSH composer」那条），
    `.pangu-dashboard-scroll` 成了整条链上**唯一**的滚动容器；一旦设成 visible，
    内容只是溢出，再被上层 `overflow:hidden` 裁掉，于是彻底不可达。
  - **修**：720px 断点里改为 `main-wrap/main` 保持 `overflow:hidden`，
    `.pangu-dashboard-scroll` 保持 `flex:1 1 auto;min-height:0;overflow:auto`。
  - **验证**（受控对照，避免只测桌面）：把 `client.js` 里真实的仪表盘 CSS 抽出来，
    放进一个 `overflow:hidden` 的宿主模拟里，内容固定 2200px，只改视口宽度 ——
    修前 1280px `scrollTop=400` / 700px `scrollTop=0`；修后两者都 `scrollTop=400`。
    真实应用五视图复验：概览 609、结晶 508、知识 267 可滚，星系与管理刚好铺满，零报错。
  - **坑**：本 profile 里 ≤720px 会被 **dsh-remote-x 接管**（`body.rm-x-mobile`，
    按视口宽度触发，与 UA 无关），盘古标签页压根不存在，**无法在真实宿主里端到端复现**。
    分界线实测：≤720 接管、768–900 侧栏收起、≥1024 才有完整 UI。
    所以窄屏只能靠上面的受控对照验证 —— 这一点必须记下来，别让下一个人以为窄屏已实测过。
  - **纪律**：本条是违反仓库硬规则后的补救 —— 动 `lib/**` 前应当先读本文件与 `AGENTS.md`；
    改完要写本日志、跑 `scripts/gen_file_index.py`、并带
    `PANGU_TEST_MODULES=<repo>/node_modules` 跑 `node --test`（否则渲染测试静默跳过）。

- **2026-09-26** — 新建精简版 `AGENTS.md`（本仓原先没有），把说明书顶成索引。
  - **为什么**：`AGENTS.md` 由 DSH **自动注入每个进入本项目的会话**，本仓原先没有这个文件，
    等于插件侧完全没硬规则。做成「只留两条硬规则 + 环境速查 + 章节索引 + 三条最贵教训」，
    细节留在说明书。测试焊死 4KB 预算，防止它长回去。
  - **修**（自己踩的）：索引表里 §2 写「浏览器侧 vs 宿主侧」、§5 写「主动记忆注入管线」，
    而说明书 §2 实为「运行形态」、§5 实为「主动记忆注入」—— **索引张冠李戴，比没索引更糟**。
    已把索引每行改成 `§N + 节标题文字`，并加测试逐行校验号与标题对得上。
    故意把 `§7 已知坑` 改成 `§10 已知坑` 验过确实会红（报「§10 索引写「已知坑」，实际是「维护日志」」）。
  - **修**：`test/file_index_check.mjs` 原用 `require`，但本仓 `package.json` 是
    `"type": "commonjs"` 而 `.mjs` 恒为 ESM → 整个文件起不来。已改为 `import`。
  - **修**：解析维护日志用 `indexOf('## 10. 维护日志')`，会命中正文流程块里那句
    「在「## 10. 维护日志」追加一条」的**引用**而不是真标题，导致日志被判成空的。
    已改成行首锚定正则取最后一个匹配，并把流程块里的引用改写为「§10」。
  - **验证**：`node --test` → 117 pass / 0 fail。`AGENTS.md` 2598 字节。
  - **修**：`scripts/gen_file_index.py` 会把 `.bak-*` / 编辑器临时目录索引进去。
    改成跳过一切点开头目录（与盘古仓同一修法，那边是实测到云端 4 个
    `.bak-decrypt-fix/*.py` 被算进索引才改的）。

- **2026-09-26** — 建这份说明书 + 自动文件索引 + 索引保鲜测试；停用客户端图谱去重。
  - **改**：客户端按 id 去重**整块注释停用**（`lib/client.js` 的 `allNodes/graphEdges`）。
    服务端已修（先按 id 合并再截断、边去重），线上实测 19 节点/19 唯一、5 边/5 唯一，
    这段永不触发。**代码原样保留在注释里**，附恢复条件：若界面又把同一实体画两遍，
    先查服务端是否已按 id 合并，确认已合并仍重复再取消注释。
  - **改**：删掉页脚「本次返回 N 条实体，按 id 去重后为 M 条」与 `rawCount` prop。
    它本来就在说假话 —— `nodes` 传进来是**筛选后**的 `filteredNodes`，用户一搜索就触发，
    把「筛选掉了几个」报成「去重合并了几个」。这是被去重文案掩盖的既有 bug。
  - **加**：`test/graph/crystal-pane.mjs`（8 项）。用真实 `client.js` + jsdom 挂载、喂真实 wire
    形状；**反向验证过** —— 临时恢复去重后场景 B 三项全红。
  - **修**：`client.js` 里那段错误注释（「HTTP / MCP / REST 等成对出现」—— 插件只发一次 REST，
    且 MCP 根本没有图谱工具，`tools/list` 实测 31 个工具里 graph/kg 为 0）。
  - **验证**：`node --test` → **102 pass / 0 fail**。
  - **坑**：渲染测试依赖默认路径不存在，`test/admin/admin-pane.mjs` 一直在静默跳过。
    配好 `PANGU_TEST_MODULES` 后它恢复可跑并通过 —— 之前有个渲染回归测试是白躺着的。

---

## 11. 维护规矩

1. 改了 `lib/**` → **同步更新本文件 + 重新生成 `docs/FILE_INDEX.md`**，并跑 `node --test`。
2. 查清「为什么这样设计」比「它现在坏没坏」重要。
3. **注释和 docstring 会说谎**。今天就遇到服务端 `graph_data` 的 docstring 声称
   「已从豁免前缀中移除」，而代码里一直还在。只有代码不会。
4. 区分**宿主侧**与**浏览器侧**改动（§2 铁律），改错地方会以为「没生效」。
5. 本地改动**未经用户确认不要 `git push`**（仓库规则）。
