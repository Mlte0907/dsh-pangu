/**
 * MCP mcp-pangu 行配置注入(A2 根治方案)。
 *
 * 背景:cordis.patch.yml 曾用 `!!js` IIFE + require('fs') 读 ~/.pangu/config.json,
 * 但 Loader 求值域是 with(fiberCtx)+eval、进程为 ESM —— 没有 require;catch 把
 * 异常静默吞掉并回退 http://127.0.0.1:19529 + 空 X-API-Key,MCP 恒 disconnected
 * (根因报告 dsh-pangu-mcp-disconnect-report.md,E1 已用真 evaluate 复跑证实)。
 *
 * 现在:配置读取移到插件 Node 侧(本文件,require/fs 可用),经 ctx.loader 按 id
 * 找到 mcp-pangu 行并 entry.update({ config }) —— 普通 config 变更触发 remount
 * 热生效;配置不可用时注入 fail-loud 形态(启动即失败),绝不静默回退。
 */
'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

const MCP_ROW_ID = 'mcp-pangu'
const DEFAULT_URL = 'http://127.0.0.1:19529/mcp'
const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.pangu', 'config.json')

/**
 * 读取并校验 MCP 所需的两项配置。任何不可用都返回 ok:false + reason,
 * 不返回半对的值、不回退默认 —— 让调用方决定如何响亮地暴露。
 * @param {string} configPath 配置文件路径(测试可注入)。
 * @returns {{ok: true, url: string, key: string} | {ok: false, reason: string}}
 */
function resolveMcpConfig(configPath = DEFAULT_CONFIG_PATH) {
  let raw
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  } catch (e) {
    return { ok: false, reason: `read/parse ${configPath} failed: ${e.message}` }
  }
  const base = String((raw && raw.pangu_base_url) || '').trim()
  const key = String((raw && raw.api_key) || '').trim()
  if (!base) return { ok: false, reason: 'pangu_base_url is empty' }
  if (!key) return { ok: false, reason: 'api_key is empty (MCP needs X-API-Key; fill 盘古凭据 in settings)' }
  try {
    const u = new URL(base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('only http/https allowed')
  } catch (e) {
    return { ok: false, reason: `pangu_base_url invalid (${base}): ${e.message}` }
  }
  return { ok: true, url: base.replace(/\/+$/, '') + '/mcp', key }
}

/**
 * 把解析结果映射成 mcp-client(streamable-http)config。
 * 可用 → 真值 + failOnStartupError:false(网络抖动靠重连,不打死行);
 * 不可用 → fail-loud 形态:默认地址 + 空 key + failOnStartupError:true,
 * 启动即失败把错误摆出来(仪表盘/设置页保持可用,那是修复入口)。
 * @param {{ok: boolean, url?: string, key?: string}} resolved resolveMcpConfig 的结果。
 * @returns {object} mcp-pangu 行的完整 config。
 */
function buildRowConfig(resolved) {
  if (resolved.ok) {
    return {
      serverName: 'pangu',
      transport: 'streamable-http',
      url: resolved.url,
      toolCallTimeoutMs: 60000,
      headers: { 'X-API-Key': resolved.key },
      failOnStartupError: false,
    }
  }
  return {
    serverName: 'pangu',
    transport: 'streamable-http',
    url: DEFAULT_URL,
    toolCallTimeoutMs: 60000,
    headers: { 'X-API-Key': '' },
    failOnStartupError: true,
  }
}

/**
 * 激活/保存时把配置注进 mcp-pangu 行(存在即 update,普通 config 变更热挂载)。
 * 用 console 而非 ctx.logger —— cordis logger 不进 web.log,console 直达 stdout。
 * @param {object} ctx 插件上下文(需 ctx.loader.entries)。
 * @param {{error: Function}} log 日志对象。
 * @param {string} [configPath] 配置文件路径(测试可注入)。
 * @returns {Promise<object>} resolveMcpConfig 的结果。
 */
async function injectMcpConfig(ctx, log = console, configPath = DEFAULT_CONFIG_PATH) {
  const resolved = resolveMcpConfig(configPath)
  if (!resolved.ok) {
    log.error(`[dsh-pangu] MCP config unavailable — ${resolved.reason}; mcp-pangu stays fail-loud (failOnStartupError=true) until settings save re-injects`)
  }
  // store[]/resolve(纯 id)只查本层树;bundle patch 行挂在 Include 子树里,
  // 必须走 entries()(文档:this tree and any nested subtrees)递归查找。
  let entry
  if (ctx && ctx.loader && typeof ctx.loader.entries === 'function') {
    for (const e of ctx.loader.entries()) {
      if (e && e.options && e.options.id === MCP_ROW_ID) { entry = e; break }
    }
  }
  if (!entry) {
    log.error(`[dsh-pangu] row ${MCP_ROW_ID} not found (bundle patch not mounted?), MCP injection skipped`)
    return resolved
  }
  await entry.update({ config: buildRowConfig(resolved) })
  return resolved
}

module.exports = { MCP_ROW_ID, DEFAULT_URL, DEFAULT_CONFIG_PATH, resolveMcpConfig, buildRowConfig, injectMcpConfig }
