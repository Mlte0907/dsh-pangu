/**
 * 设置页「检查更新」的宿主侧集成测试。
 *
 * 为什么值得测：这个按钮的意义是"让没有 AI 提醒的用户也能发现自己落后了"。
 * 如果它只报"上游 vX"而不比对**本机实际版本**，就等于没用（2026-09-22 之前
 * 正是如此）。这里断言的正是"落后要能被算出来，且给出真正跑得通的命令"。
 *
 * 运行：node test/version/check-update.mjs
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const PLUGIN = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..')

let fail = 0
const chk = (name, ok, extra) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (extra && !ok ? '  → ' + extra : ''))
  if (!ok) fail++
}

/** 挂载插件宿主，用 stub 的 fetch 模拟：GitHub 上游 + 服务端 /health + 插件上游 */
async function checkUpdateWith({ serverVersion, upstreamTag = 'v0.9.0', pluginLatest = '0.9.0' }) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pangu-upd-'))
  fs.mkdirSync(path.join(home, '.pangu'), { recursive: true })
  fs.writeFileSync(
    path.join(home, '.pangu', 'config.json'),
    JSON.stringify({ pangu_base_url: 'http://pangu.test:19529', api_key: 'K' }),
  )
  const realHome = process.env.HOME
  const realFetch = global.fetch
  process.env.HOME = home

  global.fetch = async (url, options = {}) => {
    const u = String(url)
    if (u.includes('/releases/latest')) {
      return { ok: true, status: 200, json: async () => ({ tag_name: upstreamTag, published_at: '2026-09-22T00:00:00Z', body: 'release notes', assets: [] }) }
    }
    if (u.includes('/health')) {
      return { ok: true, status: 200, json: async () => ({ code: 0, data: { status: 'ok', version: serverVersion } }) }
    }
    if (u.includes('dsh-pangu') && u.includes('package.json')) {
      return { ok: true, status: 200, json: async () => ({ version: pluginLatest }) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }

  try {
    const entry = require.resolve(path.join(PLUGIN, 'lib', 'index.js'))
    delete require.cache[entry]
    const ex = require(entry)
    const provided = {}
    const noop = () => {}
    const ctx = {
      get: () => undefined,
      provide: (n, s) => { provided[n] = s },
      on: noop, effect: noop, emit: noop, emitAsync: async () => [],
      logger: { info: noop, warn: noop, error: noop, debug: noop },
      slots: { inject: (n, cb) => cb(), register: () => () => {} },
      timer: { setInterval: () => 0, clearInterval: noop, setTimeout: (f, t) => setTimeout(f, t), clearTimeout: setTimeout },
      remote: { $mount: async () => () => {} },
    }
    await ex.apply(ctx)
    return await provided.panguDashboard.checkUpdate()
  } finally {
    global.fetch = realFetch
    process.env.HOME = realHome
    fs.rmSync(home, { recursive: true, force: true })
  }
}

console.log()
console.log('═══ 1) 服务端落后 ⇒ 必须被算出来，且给出能跑通的命令 ═══')
{
  const r = await checkUpdateWith({ serverVersion: '0.4.1' })
  chk('检查成功', r.ok === true, JSON.stringify(r))
  chk('读到服务端实际版本', r.serverVersion === '0.4.1', String(r.serverVersion))
  chk('判定服务端落后', r.serverBehind === true)
  chk('判定插件落后', r.pluginBehind === true, '插件最新=' + r.pluginLatest)
  chk('服务端升级命令不依赖 git', !!r.serverUpgradeCmd && r.serverUpgradeCmd.includes('install.sh') && !r.serverUpgradeCmd.includes('git pull'), r.serverUpgradeCmd)
  chk('插件升级命令存在', !!r.pluginUpgradeCmd && r.pluginUpgradeCmd.includes('install.sh'), r.pluginUpgradeCmd)
  chk('上游版本号带出', r.tag === 'v0.9.0', String(r.tag))
}

console.log()
console.log('═══ 2) 已是最新 ⇒ 不该报落后（不能制造假警报）═══')
{
  const r = await checkUpdateWith({ serverVersion: '0.9.0', upstreamTag: 'v0.9.0', pluginLatest: '0.5.0' })
  chk('服务端不落后', r.serverBehind === false)
  chk('插件不落后', r.pluginBehind === false, '插件本机=' + r.pluginVersion + ' 上游=' + r.pluginLatest)
}

console.log()
console.log('═══ 3) 取不到服务端版本 ⇒ 不能谎称"已是最新" ═══')
{
  const r = await checkUpdateWith({ serverVersion: '' })
  chk('serverVersion 为空', r.serverVersion === '')
  chk('不报落后（无从判断就不吓人）', r.serverBehind === false)
}

console.log()
console.log(fail === 0 ? '★ 全部通过' : `✗ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)
