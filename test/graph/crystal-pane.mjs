/**
 * 结晶（实体索引）页渲染回归测试 —— 锁定「客户端原样渲染服务端载荷」。
 *
 * 背景（2026-09-26）：服务端已修好图谱重复（pangu/api/server.py 的 graph_data 先按 id
 * 合并再截断），于是插件里那段客户端去重**永不触发**，已按用户决定注释停用
 * （代码原样保留在 lib/client.js 的注释块里，附恢复条件）。
 *
 * 那段去重一旦被后人「顺手恢复」而服务端其实已经修好，它就成了静默的第二真相源：
 * 界面显示的条数与 /api/v2/graph 返回的不一致，且没人发现得了。本测试从两侧钉住：
 *   1) 服务端给什么就渲染什么（不合并、不改写）—— 恢复客户端去重会让这条失败；
 *   2) 概览/页脚不再出现「按 id 去重后 N 条」这类计数复述。
 *
 * 另外覆盖一个此前被去重文案掩盖的真 bug：nodes 传进 CrystalPane 的是**筛选后**的
 * filteredNodes，所以用户一搜索，rawCount !== nodes.length 就会触发，文案把
 * 「筛选掉了几个」报成「去重合并了几个」。该文案与 rawCount 已一并移除。
 *
 * 运行：node test/graph/crystal-pane.mjs
 * 依赖：jsdom / react / react-dom 由宿主提供（同 test/admin/admin-pane.mjs）。
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')
const MODULES = process.env.PANGU_TEST_MODULES || '/tmp/pangu-render-test/node_modules'

const req = createRequire(path.join(MODULES, 'noop.js'))
let React, jsdomPkg
try {
  jsdomPkg = req('jsdom')
  React = req('react')
} catch (err) {
  console.log(`﹣ 跳过：无法从 ${MODULES} 加载 jsdom/react（${err.code}）。`)
  console.log('  准备依赖：见 test/admin/admin-pane.mjs 顶部的注释命令。')
  process.exit(0)
}
const { JSDOM } = jsdomPkg

/** 服务端修复后的真实载荷形状（字段与 /api/v2/graph 的 data 一致）。 */
const NODES = [
  { id: 'entity-e0cabcdae645', name: '盘古', type: 'system', memory_count: 111, description: '从记忆 9336e783 提取' },
  { id: 'entity-2781ca31aa47', name: 'HTTP', type: 'protocol', memory_count: 59, description: '从记忆 9ac0c5bc 提取' },
  { id: 'entity-a6275e07edee', name: 'MCP', type: 'protocol', memory_count: 67, description: '从记忆 9336e783 提取' },
  { id: 'entity-0ec32ce6ac05', name: 'REST', type: 'protocol', memory_count: 81, description: '从记忆 25175474 提取' },
]
/** 服务端修复**前**的载荷：同 id 两行、逐字节相同。用来证明客户端不再私自合并。 */
const NODES_DUP = [
  ...NODES,
  { id: 'entity-2781ca31aa47', name: 'HTTP', type: 'protocol', memory_count: 59, description: '从记忆 9ac0c5bc 提取' },
]

const EDGES = [
  { source: 'entity-2781ca31aa47', target: 'entity-a6275e07edee', predicate: 'depends_on', confidence: 1 },
]

/** 宿主 → 前端经过 Typert 网关后的信封形状。 */
const env = (v) => ({ ok: true, value: v })

function makeRemotes(nodes, edges) {
  return {
    panguDashboard: {
      data: async () => env({ stats: { total: 272 }, usage: null }),
      deepHealth: async () => env({ ok: true, status: 'ok', checks: [] }),
      stats: async () => env({ snapshots: [] }),
      checkUpdate: async () => env({ hasUpdate: false }),
      backup: async () => env({ ok: true, memories: 272, size: 1024 }),
    },
    panguKG: { graph: async () => env({ ok: true, nodes, edges }) },
    panguConfig: {
      get: async () => env({
        ok: true, versions: null,
        config: { pangu_base_url: 'http://127.0.0.1:19529', api_key_set: true, admin_secret_set: true },
      }),
    },
    panguAdminKeys: { listRooms: async () => env({ ok: true, rooms: [] }) },
  }
}

/** 挂载 PanguTab、切到指定标签，返回页面文本与控制台错误。 */
async function renderTab(nodes, edges, tab) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'http://127.0.0.1:3080/', pretendToBeVisual: true,
  })
  const win = dom.window
  for (const k of ['document', 'navigator', 'HTMLElement', 'Element', 'Node', 'HTMLIFrameElement',
    'HTMLInputElement', 'HTMLSelectElement', 'HTMLButtonElement', 'Event', 'MouseEvent',
    'KeyboardEvent', 'CustomEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
    'SVGElement', 'DocumentFragment', 'Text', 'Comment']) {
    if (win[k] !== undefined) { try { global[k] = win[k] } catch { /* 只读 */ } }
  }
  global.IS_REACT_ACT_ENVIRONMENT = true
  global.window = win
  win.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => '{}' })
  win.WebSocket = class { constructor() {} close() {} addEventListener() {} removeEventListener() {} }
  win.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
  win.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
  global.WebSocket = win.WebSocket
  global.fetch = win.fetch
  global.ResizeObserver = win.ResizeObserver
  global.IntersectionObserver = win.IntersectionObserver

  const errors = []
  const origError = console.error
  // 只收真正的错误。React 的 act 弃用提示也走 console.error，那是噪声
  // （与 test/admin/admin-pane.mjs 同源，react-dom/test-utils 在 React 18.3 已弃用）。
  console.error = (...a) => {
    const line = a.map(String).join(' ')
    if (/ReactDOMTestUtils\.act` is deprecated/.test(line)) return
    errors.push(line)
  }

  let mod = null
  win.__ModuleLoader__ = { load: (m) => { mod = m } }
  global.__ModuleLoader__ = win.__ModuleLoader__
  try {
    eval(fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8'))

    const ReactDOMClient = req('react-dom/client')
    const { act } = req('react-dom/test-utils')

    const captured = []
    const registry = {
      slots: { inject: (n, cb) => cb(), register: (m, c) => { captured.push({ ...m, component: c }); return () => {} } },
      timer: { setInterval: () => 0, clearInterval: () => {}, setTimeout: (f, t) => setTimeout(f, t), clearTimeout: (id) => clearTimeout(id) },
      remote: { $mount: async () => () => {} },
    }
    for (const [k, v] of Object.entries(makeRemotes(nodes, edges))) registry['remote.' + k] = v
    const ctx = { get: (k) => registry[k], effect: () => {}, on: () => null }

    const ex = mod.factory((n) => (n === 'react' ? React : {}))
    await ex.apply(ctx)
    const Comp = captured.find((c) => c.name === 'conversation.view').component

    const container = win.document.getElementById('root')
    const root = ReactDOMClient.createRoot(container)
    await act(async () => { root.render(React.createElement(Comp)) })
    await act(async () => { await new Promise((r) => setTimeout(r, 150)) })
    await act(async () => { win.dispatchEvent(new win.CustomEvent('pangu:goto', { detail: { tab } })) })
    await act(async () => { await new Promise((r) => setTimeout(r, 200)) })
    // 实体计数必须限定在实体列表内：像「盘古」这种名字同时出现在品牌区/标签名里
    // （「盘古工作台」「盘古 / 记忆系统」），数整页文本会得到 4 次那种假阳性。
    const rowText = [...container.querySelectorAll('.pangu-dashboard-entity-row')]
      .map((el) => el.textContent.replace(/\s+/g, ' ')).join('  ')
    return { text: container.textContent.replace(/\s+/g, ' '), rowText, rowCount: container.querySelectorAll('.pangu-dashboard-entity-row').length, errors }
  } finally {
    console.error = origError
  }
}

let fail = 0
const chk = (name, ok, extra) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (extra && !ok ? '  → ' + extra : ''))
  if (!ok) fail++
}
const countOf = (text, needle) => text.split(needle).length - 1

console.log()
console.log('═══ 场景 A：服务端已去重（线上现状）—— 每个实体只出现一次 ═══')
const a = await renderTab(NODES, EDGES, 'crystal')
chk('页面无渲染错误', a.errors.length === 0, a.errors.join(' | ').slice(0, 200))
chk('实体行数 = 服务端给的条数', a.rowCount === NODES.length, `${a.rowCount} 行 / 给了 ${NODES.length}`)
chk('每个实体在列表里恰好一次', ['盘古', 'HTTP', 'MCP', 'REST'].every((n) => countOf(a.rowText, n) === 1),
  ['盘古', 'HTTP', 'MCP', 'REST'].map((n) => `${n}×${countOf(a.rowText, n)}`).join(' '))
chk('页脚不再复述「去重后 N 条」', !a.text.includes('去重后'), a.text.slice(-220))
chk('页脚不再出现「本次返回 N 条实体」', !a.text.includes('本次返回'), a.text.slice(-220))

console.log()
console.log('═══ 场景 B：服务端若返回重复行，客户端【不得】私自合并 ═══')
const b = await renderTab(NODES_DUP, EDGES, 'crystal')
// 服务端给 5 行（含 1 组同 id 两行）。客户端若仍有去重，列表只会剩 4 行。
chk('实体行数 = 服务端给的条数（未私自合并）', b.rowCount === NODES_DUP.length,
  `${b.rowCount} 行 / 给了 ${NODES_DUP.length}（若为 4，说明客户端去重被恢复了）`)
chk('重复的 HTTP 在列表里出现两次', countOf(b.rowText, 'HTTP') === 2, `HTTP×${countOf(b.rowText, 'HTTP')}`)
// 这条不是断言「应该报错」，而是把停用去重的已知代价钉下来：服务端一旦退回未修复状态，
// 客户端会报 React 重复 key（原先那段去重正是为了压住它）。该警告即 lib/client.js 里
// 写明的「恢复条件」信号。
chk('重复 key 的警告被如实暴露（= 恢复条件的信号）',
  b.errors.some((e) => /same key/.test(e)) || b.rowCount === NODES_DUP.length,
  b.errors.join(' | ').slice(0, 160))

console.log()
console.log(fail === 0 ? '全部通过。' : `${fail} 项失败。`)
process.exit(fail === 0 ? 0 : 1)
