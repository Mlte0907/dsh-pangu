/**
 * 回归：~/.pangu **不存在**时，设置页点「保存」必须自己把目录建出来。
 *
 * 复现（2026-09-22 实测）：本机卸载盘古后 ~/.pangu 被删，DSH 设置页点保存报
 *   Error: ENOENT: no such file or directory, open '/home/xiaoxin/.pangu/config.json.tmp-1606823'
 * 用户看到的是一串看不懂的路径，且无从知道那个目录是哪来的、该不该自己建。
 * 根因：saveConfig 写"临时文件 + rename"前没有保证目录存在。
 *
 * 为什么是独立脚本（而不是 node:test）：CONFIG_PATH 在**模块加载时**就按
 * os.homedir() 定死了，所以必须改 process.env.HOME 并清 require 缓存 ——
 * 独立进程最干净（与 test/admin/admin-credential.mjs 同一套路）。
 *
 * 另注意：插件**可以只连远程服务端**（服务不在本机），所以缺目录不是
 * "盘古没装"的错误，缺了就该建。
 *
 * 运行：node test/config/ensure-dir.mjs
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

console.log()
console.log('═══ 保存时 ~/.pangu 不存在 ⇒ 应自动创建并写入 ═══')

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'pangu-nodir-'))
const realHome = process.env.HOME
const realFetch = global.fetch
// 关键：**不**创建 .pangu —— 现有测试都会先 mkdirSync，所以从没暴露这个 bug
process.env.HOME = home

global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true, data: {} }), text: async () => '{}' })

let res
let cfgPath
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
  ctx.slots.register = () => () => {}
  await ex.apply(ctx)

  res = await provided.panguConfig.save({
    patch: { pangu_base_url: 'http://203.0.113.9:19529', api_key: 'pgk_test_value_0123456789' },
  })
  cfgPath = path.join(home, '.pangu', 'config.json')
} finally {
  // 先恢复，避免影响后续（本脚本到这里基本结束）
  global.fetch = realFetch
}

chk('保存成功（不再 ENOENT）', res?.ok === true, JSON.stringify(res))
chk('config.json 已生成', fs.existsSync(cfgPath))

if (fs.existsSync(cfgPath)) {
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  chk('地址已写入', cfg.pangu_base_url === 'http://203.0.113.9:19529', String(cfg.pangu_base_url))
  chk('凭据已写入', cfg.api_key === 'pgk_test_value_0123456789', String(cfg.api_key))
  // config.json 里存着数据面凭据，不该被同机其他用户读走
  const mode = fs.statSync(cfgPath).mode & 0o777
  chk('文件权限 0600', mode === 0o600, mode.toString(8))
  const dmode = fs.statSync(path.dirname(cfgPath)).mode & 0o777
  chk('目录权限 0700', dmode === 0o700, dmode.toString(8))
}

const leftovers = fs.existsSync(path.join(home, '.pangu'))
  ? fs.readdirSync(path.join(home, '.pangu')).filter((f) => f.includes('.tmp-'))
  : []
chk('没有残留 .tmp- 临时文件', leftovers.length === 0, leftovers.join(','))

process.env.HOME = realHome
fs.rmSync(home, { recursive: true, force: true })

console.log()
console.log(fail === 0 ? '★ 全部通过' : `✗ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)
