# dsh-pangu

给 [DSH](https://github.com/deepseek-ai) 会话装上[盘古](https://github.com/Mlte0907/pangu)长期记忆：
打开对话就带着你的记忆，侧栏多一个「盘古记忆系统」面板。

> **这是可选项。** 盘古本体是个独立服务（MCP / REST / Web UI 三种接入都有），
> 不用 DSH 也完全能用。只有你想在 DSH 会话里直接读写记忆时，才需要装它。

---

## 前置条件

| 需要什么 | 说明 |
|---|---|
| **盘古本体** | 已安装并跑起来。没装的话：`curl -fsSL https://raw.githubusercontent.com/Mlte0907/pangu/master/install.sh \| bash` |
| **DSH** | DeepSeek Harness，且 `dsh` 在 PATH 里（或设 `DSH_DIR` 指向源码目录） |
| **pnpm** | `npm i -g pnpm` |

## 安装

```sh
curl -fsSL https://raw.githubusercontent.com/Mlte0907/dsh-pangu/main/install.sh | bash
```

或者克隆后本地跑：

```sh
git clone --depth 1 https://github.com/Mlte0907/dsh-pangu
cd dsh-pangu && ./install.sh          # 默认装到 web profile
./install.sh tui                      # 换 profile：./install.sh <profile>
```

装完 **重启 DSH**（`cordis.patch.yml` 的热更新在 web 实例不生效，必须重启才加载）。
之后改地址/凭据**无需再重启**：设置页保存即由插件热重注到 MCP 客户端（`lib/mcp-inject.js` → `entry.update`）。DSH profile/Include 重组完成后也会自动重新注入，避免 MCP 行恢复为占位地址。

## 装完只填两个字段

DSH → 设置 →「**盘古记忆系统**」：

| 字段 | 填什么 |
|---|---|
| 盘古服务地址 | 盘古安装脚本最后打印的那个地址（本机就是 `http://127.0.0.1:19529`） |
| 盘古凭据 | 盘古安装脚本打印的那串凭据（记忆读写、搜索、管理页都用它） |

> 两个字段都可以在盘古安装横幅的「DSH 填写卡」里直接复制。
> 凭据是密码框，已配置时框内会显示脱敏值（如 `pgk_J_*****zkQA`），
> 用于你核对"当前生效的是哪一把"。留空 = 保持不变。

## 它带来什么

**会话里**：`pangu_*` 系列 MCP 工具（记忆读写、混合检索、知识图谱…）直接可用，
自动注入相关记忆、会话结束自动沉淀。

**界面上**（3 个位置）：
- 侧栏底部记忆卡片
- 对话区「盘古」标签页（知识图谱 / 记忆进化）
- 设置页「盘古记忆系统」（服务地址、凭据、LLM 配置、多模态、平台接入）

**宿主侧 6 个服务**：`panguDashboard` / `panguConfig` / `panguKG` / `panguKnowledge` /
`panguAdminKeys` / `panguPlatforms`。

## 常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 面板空白、日志 401 | 设置页「盘古凭据」没填或填错 —— 复制安装时打印的那串 |
| 记忆/搜索不通 | 「盘古服务地址」不对；本机填 `http://127.0.0.1:19529` |
| **管理页** 401 | 服务端 `~/.pangu/.admin_secret` 与「盘古凭据」不是同一把（早期部署）。装上跑一遍盘古的 `install.sh` 会打印统一命令；新装默认同值，不会遇到 |
| 工具列表没刷新 | 服务端 exposure 改动后重启 DSH；仅改地址/凭据则保存设置即热重注 |
| MCP 行启动失败 | `~/.pangu/config.json` 缺 `pangu_base_url` 或 `api_key` —— 设置页填好保存即自动重注（fail-loud，不再静默连 127.0.0.1） |
| DSH 启动报 `ERR_MODULE_NOT_FOUND: zod` | 插件依赖没装：`cd <插件目录> && pnpm install --prod` |

## 开发

```sh
pnpm install --prod     # 运行时依赖（zod，宿主提供 react）
npm install             # 含测试依赖（react / react-dom / jsdom）
npm test                # 渲染测试 + 保存语义 + 管理页/凭据回归
```

测试说明：`test/settings/llm-form.test.js` 用 jsdom 真实渲染设置页；
`test/settings/save-semantics.mjs` 等独立脚本验证保存语义与管理面错误上报。
缺少 jsdom / react 时渲染测试会**自动跳过**（不让 CI 因缺依赖而红）。

## 版本

与盘古本体分开版本：本插件自 `0.5.0` 起独立发版（此前跟盘古仓库同号）。

## 许可

MIT
