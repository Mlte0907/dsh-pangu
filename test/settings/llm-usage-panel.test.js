/**
 * 「LLM 用量」面板的数据源（2026-10-10）。
 *
 * 为什么要有这个文件：这个面板曾经**显示一切正常的假数字** ——
 * 读盘古进程内的计数器（`llm_daily` / `llm_total`），而那个口径有三个盲区
 * （同进程多引擎各记各的、知识结晶走直连路径不计数、Anthropic 路径不记 token）。
 * 连续 8.7 天显示「今日 0 / 累计 3」，同期供应商账单是 18 次 / 27732 token。
 *
 * 面板本身没有 bug —— 它忠实显示了一个被低估的量。所以这里测的不是
 * "渲染出某个像素"，而是**它读的是哪一份数据**：
 *
 *   1. 主数据必须是**供应商账单**（usage.usage.today / all_time）。
 *   2. 没有账单时退回盘古计数，并说清这是次要口径（不许静默）。
 *   3. 账单缺字段时显示「—」，**不许编 0**。
 *
 * 附带把 typert schema 的一个真 bug 钉住：原 schema 声明的是
 * `{rolling, weekly, monthly}`，与任何真实端点都不匹配，而 zod 默认
 * **静默剥掉**未声明的键 ⇒ AMD 的用量被剥成 `{}`，面板恒空且无报错。
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const ROOT = path.join(__dirname, '..', '..')

// ── 从真实源码里取出面板的取值逻辑 ──
// 直接 require client.js 不可行（它是浏览器脚本，见 MAINTAINERS §7），
// 而挂载整个仪表盘来测一个面板又太重。这里的取舍：抽取那一段表达式做等价
// 复刻，并由下面的「源码一致性」测试保证复刻没跑偏。

/** 与 client.js:1421 起的 IIFE 同构的取值逻辑 */
function pickUsage(dash) {
  const u = dash?.usage?.usage
  const srvDaily = dash?.stats?.llm_daily
  const srvTotal = dash?.stats?.llm_total
  if (!u && !srvTotal) return { kind: 'empty', rows: [] }
  const rows = [
    ['今日请求', u?.today?.requests ?? '—'],
    ['今日 Token', u?.today?.total_tokens ?? '—'],
    ['累计 Token', u?.all_time?.total_tokens ?? '—'],
    ['累计花费', u?.all_time?.cost ?? '—'],
  ]
  return { kind: u ? 'bill' : 'server', rows, srvDaily, srvTotal }
}

test('主数据源是供应商账单，不是盘古进程内计数', () => {
  const dash = {
    usage: { usage: { today: { requests: 18, total_tokens: 27732 }, all_time: { total_tokens: 12427146, cost: 0.9458 } } },
    // 盘古自己的计数器同时存在且**故意给得很难看**（0）——
    // 如果面板还读它，这里就会拿到 0 而不是账单数字
    stats: { llm_daily: { call_count: 0, total_tokens: 0 }, llm_total: { call_count: 3, total_tokens: 37 } },
  }
  const r = pickUsage(dash)
  assert.equal(r.kind, 'bill')
  assert.deepEqual(Object.fromEntries(r.rows), {
    今日请求: 18, '今日 Token': 27732, '累计 Token': 12427146, '累计花费': 0.9458,
  })
})

test('★ 没有账单时退回盘古计数，而不是空白', () => {
  const dash = { usage: null, stats: { llm_daily: { call_count: 5 }, llm_total: { call_count: 9, total_tokens: 120 } } }
  const r = pickUsage(dash)
  assert.equal(r.kind, 'server')
  assert.equal(r.srvTotal.total_tokens, 120)
})

test('两套数据都没有才算空', () => {
  assert.equal(pickUsage({ usage: null, stats: {} }).kind, 'empty')
  assert.equal(pickUsage(null).kind, 'empty')
  assert.equal(pickUsage(undefined).kind, 'empty')
})

test('账单缺字段显示「—」，绝不编 0', () => {
  const r = pickUsage({ usage: { usage: { today: { requests: 0 } } }, stats: {} })
  const m = Object.fromEntries(r.rows)
  assert.equal(m['今日请求'], 0, '真实上报的 0 必须显示 0')
  assert.equal(m['累计 Token'], '—', '缺失不是 0')
  assert.equal(m['累计花费'], '—')
})

test('盘古计数字段缺失时不炸', () => {
  const r = pickUsage({ usage: null, stats: { llm_total: {} } })
  assert.equal(r.kind, 'server')
})

// ── typert schema：那个静默剥空的真 bug ──

test('schema 声明的 usage 字段必须覆盖 AMD 实际返回的键', async () => {
  let z
  try {
    z = require(require('node:path').join(ROOT, 'node_modules', 'zod'))
  } catch {
    z = require('zod')
  }

  // 从 typert.host.js 实际声明里抠出 usage 子 schema 所需的字段集合
  const src = require('node:fs').readFileSync(path.join(ROOT, 'lib', 'typert.host.js'), 'utf8')
  const start = src.indexOf('usage: z.object({')
  assert.ok(start > 0, 'typert.host.js 里找不到 usage schema')
  const end = src.indexOf('  llm_daily: z.object({', start)
  const block = src.slice(start, end)

  // AMD /v1/usage 的实测响应（2026-10-10 抓的真实数据）
  const amdUsage = {
    organization_id: 'oneclick-org-68353', project_id: 'oneclick-project-68353',
    rpm_limit: 20, daily_cost_limit_usd: 1, daily_cost_used_usd: 0.0034266,
    daily_cost_remaining_usd: 0.9965733, daily_reset_timezone: 'Asia/Shanghai',
    daily_reset_at: '2026-10-10T16:00:00.000Z',
    today: { requests: 18, errors: 0, total_tokens: 27732, prompt_tokens: 27097, completion_tokens: 635, cost: 0.0001 },
    all_time: { requests: 2189, total_tokens: 12427146, kv_cache_hit_rate: 0.7878, cost: 0.9458, last_request_at: '2026-10-10 04:10:43' },
  }

  // 每个出现在真实响应里的顶层键都必须在 schema 里声明过，
  // 否则 zod 会静默剥掉它 —— 那正是用量恒空的原因。
  const missing = []
  for (const key of ['today', 'all_time', 'daily_cost_limit_usd', 'daily_cost_used_usd', 'daily_cost_remaining_usd', 'rpm_limit']) {
    if (!block.includes(key)) missing.push(key)
  }
  assert.deepEqual(missing, [], `typert.host.js 的 usage schema 未声明这些真实字段：${missing.join(', ')}`)

  // 反向检查：旧 schema 的 {rolling, weekly, monthly} **声明**不该再出现。
  // ⚠ 必须匹配 `rolling: z.object` 而不是裸词 'rolling' ——
  // 我自己写的说明注释里就提到了这三个词名，用裸词会误报。
  for (const old of ['rolling: z.object', 'weekly: z.object', 'monthly: z.object']) {
    assert.ok(!block.includes(old), `旧的 ${old} 声明已确认是错的，不该回来`)
  }

  // 真的过一遍 zod，确认关键字段存活下来
  const Usage = z.object({
    today: z.object({ requests: z.number().optional(), total_tokens: z.number().optional() }).optional(),
    all_time: z.object({ requests: z.number().optional(), total_tokens: z.number().optional(), cost: z.number().optional(), kv_cache_hit_rate: z.number().optional() }).optional(),
    daily_cost_limit_usd: z.number().optional(),
    daily_cost_used_usd: z.number().optional(),
    daily_cost_remaining_usd: z.number().optional(),
    rpm_limit: z.number().optional(),
  })
  const parsed = Usage.parse(amdUsage)
  assert.equal(parsed.today.requests, 18, 'today 被剥空了')
  assert.equal(parsed.all_time.total_tokens, 12427146, 'all_time 被剥空了')
  assert.ok(parsed.daily_cost_limit_usd != null, '预算额度被剥空了')
})

// ── 防漂移：复刻必须跟真实源码保持一致 ──

test('★ 取值逻辑与 lib/client.js 源码保持一致（否则本文件会假绿）', () => {
  const src = require('node:fs').readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')
  const start = src.indexOf("h(DashboardPanel, { title: 'LLM 用量'")
  assert.ok(start > 0, 'client.js 里找不到「LLM 用量」面板')
  // 切片要够长以覆盖整个面板（含末尾「两者不等」那段解释，实测约 3.6K 字符）。
  // 切片太短会让本测试**假绿** —— 断言全落在窗口内，看不到后面的改动。
  const block = src.slice(start, start + 4200)

  // 面板必须读 usage.usage（供应商账单），而不是只有 llm_daily / llm_total
  assert.ok(block.includes('dash?.usage?.usage'), '面板没有读 usage.usage —— 换数据源的改动被回退了')
  // 账单的两个分桶必须都被解构出来并使用
  assert.ok(block.includes('u?.today'), '缺少账单今日分桶 today')
  assert.ok(block.includes('u?.all_time'), '缺少账单累计分桶 all_time')
  // 主指标里的数值必须取自账单分桶（而非盘古计数）：
  // today.requests / today.total_tokens / all.total_tokens / all.cost
  for (const field of ['today?.requests', 'today?.total_tokens', 'all?.total_tokens', 'all?.cost']) {
    assert.ok(block.includes(field), `面板缺少账单字段 ${field}`)
  }
  // 次要口径必须保留（两套对照才有诊断价值）
  assert.ok(block.includes('srvTotal'), '盘古自身计数这一栏被删了 —— 二者对照才有诊断价值')
  assert.ok(block.includes('两者不等'), '缺少「两者不等」的解释 —— 数字不一致会让人以为是 bug')
  // 不许退回读盘古计数当主数据源
  assert.ok(!/h\('div', \{ className: 'pangu-dashboard-empty' \}, h\('span', null, '暂无 LLM 使用数据'\)\)\)\s*\n\s*\}/.test(block),
    '面板的主数据源退回了盘古计数')
})