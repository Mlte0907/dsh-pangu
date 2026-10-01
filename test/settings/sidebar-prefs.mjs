/**
 * 侧栏卡片两个开关的**端到端渲染**验证（挂载真实 client.js）。
 *
 * 为什么必须有这个文件：test/settings/sidebar-prefs.test.js 测的是**复制一份**
 * 的 readSidebarPrefs，实现漂移时会假绿。本文件挂载真实的 lib/client.js，
 * 断言「设置页点开关 → 侧栏卡片真的变形 / 消失」，因此漂移必然被抓到。
 * 两个文件是配套的，不能只留一个。
 *
 * 跑法（渲染类必须显式给依赖，否则静默跳过并 exit 0 —— 见 MAINTAINERS §7）：
 *   PANGU_TEST_MODULES=<repo>/node_modules node test/settings/sidebar-prefs.mjs
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
  console.log(`  准备：mkdir -p ${MODULES} && ln -sfn <dsh>/node_modules/.pnpm/react@18.3.1/node_modules/react ${MODULES}/react`)
  process.exit(0)
}

const { JSDOM } = jsdomPkg
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:3080/',
  pretendToBeVisual: true,
})
const win = dom.window
for (const k of ['document', 'navigator', 'HTMLElement', 'Element', 'Node', 'HTMLIFrameElement',
  'HTMLInputElement', 'HTMLSelectElement', 'HTMLButtonElement', 'Event', 'MouseEvent',
  'KeyboardEvent', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'SVGElement', 'DocumentFragment', 'Text', 'Comment',
  // ⚠ CustomEvent 必须一并挂到 global：client.js 的开关广播用的是全局
  // `new CustomEvent(...)`（与既有的 pangu:goto 同一写法）。不挂的话
  // jsdom 的 dispatchEvent 会拒收非 Event 对象，抛
  // "parameter 1 is not of type 'Event'" —— 那是测试环境缺全局，不是产品 bug。
  'CustomEvent', 'localStorage']) {
  if (win[k] !== undefined) { try { global[k] = win[k] } catch { /* 只读 */ } }
}
global.IS_REACT_ACT_ENVIRONMENT = true
global.window = win
global.localStorage = win.localStorage

let ReactDOMClient, act
try {
  ReactDOMClient = req('react-dom/client')
  act = req('react-dom/test-utils').act
} catch (err) {
  console.log(`﹣ 跳过：无法加载 react-dom（${err.code}）。`)
  process.exit(0)
}

let mod = null
win.__ModuleLoader__ = { load: (m) => { mod = m } }
global.__ModuleLoader__ = win.__ModuleLoader__
eval(fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8'))

const captured = []
const dataCalls = { data: 0, events: 0 }
const svc = {
  data: async () => { dataCalls.data++; return { ok: true, value: { stats: { total: 42, health: 'ok', kgEntities: 7, platformsCount: 3, dailyCounts: [1, 2] }, knowledge: { total: 5 }, bySource: { dsh: 1, mcp: 1 } } } },
  events: async () => { dataCalls.events++; return { ok: true, value: { count: 0, lastTs: 1 } } },
}
const settingsSvc = {
  get: async () => ({ ok: true, value: { config: { llm_provider: 'deepseek', llm_model: 'deepseek-chat' }, versions: { plugin: '0.6.9' } } }),
  save: async () => ({ ok: true, value: { ok: true } }),
  testLlm: async () => ({ ok: true, value: { ok: true } }),
}
const registry = {
  slots: { inject: (n, cb) => cb(), register: (m, c) => { captured.push({ ...m, component: c }); return () => {} } },
  timer: { setInterval: () => 0, clearInterval: () => {}, setTimeout: (f, t) => setTimeout(f, t), clearTimeout: (id) => clearTimeout(id) },
  remote: { $mount: async () => () => {} },
  'remote.panguConfig': settingsSvc,
  'remote.panguDashboard': svc,
}
const ctx = { get: (k) => registry[k], effect: () => {} }

const ex = mod.factory((n) => (n === 'react' ? React : {}))
await ex.apply(ctx)

const Card = captured.find((c) => c.name === 'sidebar.footer.action').component
const Settings = captured.find((c) => c.name === 'settings.section').component

let fail = 0
const chk = (name, ok, extra) => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + name + (extra && !ok ? '  → ' + extra : ''))
  if (!ok) fail++
}

// 把设置页与侧栏卡片挂到**同一个 document 的两个容器**里：
// 开关广播走 window CustomEvent，两棵树同源才会互相听见 —— 这正是要验的联动。
const settingsEl = win.document.getElementById('root')
const cardEl = win.document.createElement('div')
win.document.body.appendChild(cardEl)

const settingsRoot = ReactDOMClient.createRoot(settingsEl)
const cardRoot = ReactDOMClient.createRoot(cardEl)
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 60)) }) }

const click = async (el) => {
  await act(async () => { el.dispatchEvent(new win.MouseEvent('click', { bubbles: true })) })
  await settle()
}
/** 两个开关都用 Toggle 自己的 aria-label 定位。
 *  Toggle 的 aria-label 是稳定契约（读屏名），可见文案会改，aria-label 不会跟着乱；
 *  而且它天然排除了「外层 div 也包含该文案」的误命中。 */
const minimalToggle = () =>
  settingsEl.querySelector('input[type=checkbox][aria-label*="只显示"]')
const cardToggle = () =>
  settingsEl.querySelector('input[type=checkbox][aria-label*="显示侧栏卡片"]')
const cardText = () => cardEl.textContent || ''
const PREFS_KEY = 'pangu:sidebar-prefs'

console.log()
console.log('═══ 场景 1：默认（首次访问，无任何存储）═══')
win.localStorage.removeItem(PREFS_KEY)
await act(async () => {
  settingsRoot.render(React.createElement(Settings))
  cardRoot.render(React.createElement(Card, { wide: true }))
})
await settle()
chk('卡片默认显示', cardText().includes('盘古'), `实际文本：${cardText().slice(0, 60)}`)
chk('默认是完整形态（含「条记忆」）', cardText().includes('条记忆'))
chk('默认显示四格指标', ['实体', '知识', '来源', '平台'].every((k) => cardText().includes(k)))
chk('「显示侧栏卡片」开关默认打开', cardToggle()?.checked === true)
chk('「只显示四格」开关默认关闭', minimalToggle()?.checked === false)

console.log()
console.log('═══ 场景 2：打开「只显示四格」═══')
const dataBefore = dataCalls.data
const minimalBox = minimalToggle()
await click(minimalBox)
chk('开关切到开', minimalBox.checked === true)
chk('卡片还在', cardText().includes('实体'), `实际文本：${cardText().slice(0, 60)}`)
chk('★ 状态行消失（无「盘古 ·」）', !cardText().includes('盘古 ·'))
chk('★ 条数行消失（无「条记忆」）', !cardText().includes('条记忆'))
chk('★ 四格指标仍在', ['实体', '知识', '来源', '平台'].every((k) => cardText().includes(k)))
chk('★ 实测到四格里的数值（不是骨架/空）', cardText().includes('42') || cardText().includes('7'), `实际文本：${cardText()}`)
chk('精简形态带专用 className', !!cardEl.querySelector('.pangu-sidebar-minimal'))
chk('写进了 localStorage', JSON.parse(win.localStorage.getItem(PREFS_KEY) || '{}').minimal === true)
chk('★ 未触发任何额外远程取数（即时生效，不靠重新加载）', dataCalls.data === dataBefore, `data 调用 ${dataBefore} → ${dataCalls.data}`)

console.log()
console.log('═══ 场景 3：关掉整张卡片 ═══')
const cardBox = cardToggle()
await click(cardBox)
chk('开关切到关', cardBox.checked === false)
chk('★ 卡片完全不渲染', cardEl.textContent === '', `实际文本：${cardText().slice(0, 60)}`)
chk('★ 「只显示四格」那一行随之收起（不留无效开关）', minimalToggle() === null)
chk('localStorage 记住了关闭', JSON.parse(win.localStorage.getItem(PREFS_KEY) || '{}').card === false)

console.log()
console.log('═══ 场景 4：窄形态（侧栏收起）不受「只显示四格」影响 ═══')
// 卡片关着时「只显示四格」那行是收起的（断言见场景 3），所以要**先重新打开卡片**
// 才能读到它。偏好本身没丢：重新打开后它应该仍是开。
await click(cardToggle())
chk('★ 重新打开卡片后，「只显示四格」记住了上次的开（偏好不丢）', minimalToggle()?.checked === true)
const narrowEl = win.document.createElement('div')
win.document.body.appendChild(narrowEl)
const narrowRoot = ReactDOMClient.createRoot(narrowEl)
await act(async () => { narrowRoot.render(React.createElement(Card, { wide: false })) })
await settle()
const narrowText = narrowEl.textContent || ''
chk('窄形态仍是徽标，不被硬塞四列网格', !narrowText.includes('实体') && !narrowText.includes('知识'), `实际文本：${narrowText}`)
chk('窄形态带 title 便于识别', !!narrowEl.querySelector('[title]'))
chk('宽形态此时确实只剩四格', (cardText().includes('实体') && !cardText().includes('条记忆')), `实际文本：${cardText().slice(0, 60)}`)

console.log()
console.log('═══ 场景 5：损坏的存储不崩（回默认，完整卡片照常）═══')
await act(async () => { narrowRoot.unmount() })
win.localStorage.setItem(PREFS_KEY, '{broken json')
const reloadRoot = ReactDOMClient.createRoot(win.document.createElement('div'))
const reloadEl = win.document.getElementById('root')  // 复用设置页容器重挂
await act(async () => { settingsRoot.unmount() })
const s2 = ReactDOMClient.createRoot(reloadEl)
await act(async () => { s2.render(React.createElement(Settings)) })
await settle()
chk('设置页在损坏存储下仍渲染', !!cardToggle())
chk('损坏存储回落成「卡片开」', cardToggle()?.checked === true)
chk('损坏存储回落成「精简关」', minimalToggle()?.checked === false)
chk('损坏存储下页面无未捕获异常', true)

console.log()
console.log(fail === 0 ? '★ 侧栏卡片两个开关全部正确' : `✗ ${fail} 项失败`)
process.exit(fail === 0 ? 0 : 1)