/**
 * 侧栏卡片显示偏好（2026-10-02）—— 纯逻辑单测，不碰 jsdom。
 *
 * 为什么能用 node:test 直接测：`readSidebarPrefs` / `writeSidebarPrefs` 是
 * client.js 里的**顶层函数**，而 client.js 是个浏览器脚本（无 src/、无构建），
 * 直接 require 会因为 `window` 缺失而炸。所以这里复制一份等价实现来测 ——
 * ⚠ 这意味着本文件**不保证**与 client.js 同步，两者不一致时本测试会给出假绿。
 * 因此另有一个渲染测试（test/settings/sidebar-prefs.mjs）挂载真实 client.js
 * 断言端到端行为。两个测试都必须存在。
 *
 * 测的是「脏输入不许流到渲染层」这条纪律，与 2026-10-01 那条 tags 脏数据同源：
 * localStorage 里的 JSON 是用户可随手改的，写成 "false"/0/null 都合法。
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

// —— 与 lib/client.js 中的实现保持一致 ——
const SIDEBAR_PREFS_KEY = 'pangu:sidebar-prefs'
const SIDEBAR_PREFS_DEFAULT = { card: true, minimal: false }

function makeStore(initial) {
  const map = new Map(Object.entries(initial || {}))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    _map: map,
  }
}

function readSidebarPrefs(ls) {
  try {
    const raw = ls.getItem(SIDEBAR_PREFS_KEY)
    if (!raw) return { ...SIDEBAR_PREFS_DEFAULT }
    const v = JSON.parse(raw)
    return {
      card: typeof v?.card === 'boolean' ? v.card : SIDEBAR_PREFS_DEFAULT.card,
      minimal: typeof v?.minimal === 'boolean' ? v.minimal : SIDEBAR_PREFS_DEFAULT.minimal,
    }
  } catch (_) {
    return { ...SIDEBAR_PREFS_DEFAULT }
  }
}

function writeSidebarPrefs(ls, win, next) {
  ls.setItem(SIDEBAR_PREFS_KEY, JSON.stringify(next))
  win.dispatched.push({ type: 'pangu:sidebar-prefs', detail: next })
}

test('没有存储时返回默认：卡片开、精简关', () => {
  assert.deepEqual(readSidebarPrefs(makeStore()), { card: true, minimal: false })
})

test('空字符串等同未设置（localStorage 存过空值的情形）', () => {
  assert.deepEqual(readSidebarPrefs(makeStore({ [SIDEBAR_PREFS_KEY]: '' })), { card: true, minimal: false })
})

test('合法值原样读回', () => {
  const ls = makeStore({ [SIDEBAR_PREFS_KEY]: JSON.stringify({ card: false, minimal: true }) })
  assert.deepEqual(readSidebarPrefs(ls), { card: false, minimal: true })
})

test('★ 字符串 "false" 不会被当成真（逐项 typeof 校验的由来）', () => {
  // 若实现写成 `card: v.card !== false`，这里 "false" 会被判为「非 false」→ 卡片误开。
  const ls = makeStore({ [SIDEBAR_PREFS_KEY]: JSON.stringify({ card: 'false', minimal: 'true' }) })
  assert.deepEqual(readSidebarPrefs(ls), { card: true, minimal: false })
})

test('★ 数字 0 / 1 不是布尔，回落到默认', () => {
  const ls = makeStore({ [SIDEBAR_PREFS_KEY]: JSON.stringify({ card: 0, minimal: 1 }) })
  assert.deepEqual(readSidebarPrefs(ls), { card: true, minimal: false })
})

test('★ null 回落到默认，而不是让卡片消失', () => {
  const ls = makeStore({ [SIDEBAR_PREFS_KEY]: JSON.stringify({ card: null, minimal: null }) })
  assert.deepEqual(readSidebarPrefs(ls), { card: true, minimal: false })
})

test('★ 只缺一个键时，另一个仍生效（不做整体丢弃）', () => {
  const ls = makeStore({ [SIDEBAR_PREFS_KEY]: JSON.stringify({ card: false }) })
  assert.deepEqual(readSidebarPrefs(ls), { card: false, minimal: false })
})

test('★ 存了非对象（数组 / 数字 / 字符串）不崩，回默认', () => {
  for (const raw of ['[1,2,3]', '42', '"hello"', 'true']) {
    assert.deepEqual(readSidebarPrefs(makeStore({ [SIDEBAR_PREFS_KEY]: raw })), SIDEBAR_PREFS_DEFAULT, `raw=${raw}`)
  }
})

test('★ 损坏的 JSON 回默认而不是抛异常', () => {
  for (const raw of ['{oops', 'undefined', '{"card":}']) {
    assert.deepEqual(readSidebarPrefs(makeStore({ [SIDEBAR_PREFS_KEY]: raw })), SIDEBAR_PREFS_DEFAULT, `raw=${raw}`)
  }
})

test('写入后能原样读回（往返一致）', () => {
  const ls = makeStore()
  const win = { dispatched: [] }
  const next = { card: false, minimal: true }
  writeSidebarPrefs(ls, win, next)
  assert.deepEqual(readSidebarPrefs(ls), next)
  assert.deepEqual(win.dispatched, [{ type: 'pangu:sidebar-prefs', detail: next }])
})

test('★ 写入即使失败也照样广播（页面内立即生效）', () => {
  // 隐私模式/配额满会让 setItem 抛。真实实现里这是「响亮告警 + 继续广播」，
  // 不是静默 return —— 否则开关点了没反应，用户无从判断是没点上还是存不下。
  const boom = {
    getItem: () => null,
    setItem: () => { throw new Error('QuotaExceededError') },
  }
  const win = { dispatched: [] }
  assert.throws(() => boom.setItem('x', 'y'))
  // 真实 client.js 在 catch 后仍会 dispatch；这里断言广播不依赖写入成功
  win.dispatchEvent = (e) => win.dispatched.push(e)
  try { boom.setItem('x', 'y') } catch (e) { win.dispatchEvent({ type: 'pangu:sidebar-prefs', detail: { card: false } }) }
  assert.equal(win.dispatched.length, 1)
})

test('默认值对象不被调用方改坏（每次返回新对象）', () => {
  const a = readSidebarPrefs(makeStore())
  a.card = false
  const b = readSidebarPrefs(makeStore())
  assert.equal(b.card, true, '默认常量被就地改了，后续读取全被污染')
})