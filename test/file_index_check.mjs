/**
 * 维护保障：文件索引保鲜 + 维护日志强制 + 说明书必备内容。
 *
 * 为什么要这个文件：说明书不核对就会腐烂。2026-09-26 实际踩到服务端 `graph_data` 的
 * docstring 声称「已从豁免前缀中移除」，而代码里一直还在 —— 注释/文档会说自己想说的话，
 * 只有代码不会。说明书同理。
 *
 * 三件事：
 *   1. docs/FILE_INDEX.md 与真实目录树一致（调 scripts/gen_file_index.py 重新生成）
 *   2. 改了 lib/** 就必须写维护日志（比对文件 mtime）
 *   3. 说明书包含维护者必需的章节
 *
 * 刻意没做：校验「同一 commit 是否同时改了 lib/** 和 MAINTAINERS.md」。那依赖 git，
 * 而宿主侧是 link 安装、发布走 tarball，git 假设在真实形态下会给出假安全感。
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DOC = path.join(ROOT, 'MAINTAINERS.md')
const INDEX = path.join(ROOT, 'docs', 'FILE_INDEX.md')

const readDoc = () => fs.readFileSync(DOC, 'utf8')

// ── 1. 文件索引保鲜 ──

test('文件索引与真实目录树一致', () => {
  const out = execFileSync('python3', [path.join(ROOT, 'scripts', 'gen_file_index.py'), '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.match(out, /最新/)
})

test('文件索引覆盖全部源文件', () => {
  const idx = fs.readFileSync(INDEX, 'utf8')
  const count = idx.split('\n').filter((l) => l.startsWith('| `')).length
  assert.ok(count >= 30, `索引只有 ${count} 条条目，看起来没生成全`)
  for (const must of ['client.js', 'index.js', 'typert.host.js', 'mcp-inject.js', 'injection-pipeline.js']) {
    assert.ok(idx.includes(must), `索引里找不到 ${must}`)
  }
})

// ── 2. 维护日志强制 ──

const logEntries = (doc) =>
  [...doc.matchAll(/^- \*\*(\d{4}-\d{2}-\d{2})\*\* — (.+)$/gm)].map((m) => ({ date: m[1], body: m[2] }))

const logSection = (doc) => {
  // 必须**行首锚定**并取最后一个匹配：正文里（流程块/索引表）会出现「§10 维护日志」
  // 这类**引用**，用 indexOf 会命中引用而不是真标题，把日志判成空的。
  const hits = [...doc.matchAll(/^## 10\. 维护日志\s*$/gm)]
  assert.ok(hits.length > 0, '说明书缺「## 10. 维护日志」这一节 —— 维护日志是硬性要求')
  const rest = doc.slice(hits[hits.length - 1].index)
  const nxt = rest.indexOf('\n## ', 10)
  return nxt > 0 ? rest.slice(0, nxt) : rest
}

test('维护日志存在且有条目', () => {
  const e = logEntries(logSection(readDoc()))
  assert.ok(e.length > 0, '维护日志是空的。改了 lib/** 就必须追加一条')
})

test('每条维护日志有实质内容', () => {
  for (const { date, body } of logEntries(logSection(readDoc()))) {
    assert.ok(body.length >= 30, `${date} 这条日志太短，看不出改了什么：${body}`)
  }
})

test('维护日志按日期倒序（最新在最上面）', () => {
  const dates = logEntries(logSection(readDoc())).map((e) => e.date)
  assert.deepEqual(dates, [...dates].sort().reverse(), `日志没有倒序：${dates}`)
})

test('改了 lib/** 必须写维护日志', () => {
  const entries = logEntries(logSection(readDoc()))
  const newestLog = entries.reduce((a, e) => (e.date > a ? e.date : a), entries[0].date)
  let newestSrc = ''
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const p = path.join(dir, name)
      const st = fs.statSync(p)
      if (st.isDirectory()) walk(p)
      else if (/\.(js|mjs|cjs)$/.test(name)) {
        const d = new Date(st.mtimeMs).toISOString().slice(0, 10)
        if (d > newestSrc) newestSrc = d
      }
    }
  }
  walk(path.join(ROOT, 'lib'))
  if (!newestSrc) return // lib 下没有可解析日期的文件（刚 clone 场景）
  assert.ok(
    newestSrc <= newestLog,
    `lib/** 里有文件是 ${newestSrc} 改的，但维护日志最新只到 ${newestLog}。` +
      `请到 MAINTAINERS.md 的「## 10. 维护日志」追加一条。`,
  )
})

// ── 3. 说明书必备内容 ──

test('说明书有维护者必需的章节', () => {
  const doc = readDoc()
  for (const s of ['认知错误', '运行形态', '已知坑', '测试怎么跑', '维护日志']) {
    assert.ok(doc.includes(s), `说明书缺「${s}」相关章节`)
  }
})

test('维护流程写在最前面且含「先读」与「写日志」', () => {
  const doc = readDoc()
  assert.ok(doc.includes('维护流程'), '缺维护流程块')
  assert.ok(doc.indexOf('维护流程') < doc.indexOf('## 1.'), '维护流程应在正文最前')
  assert.ok(doc.includes('动手之前'), '流程里要写明「动手之前先读本文件」')
  assert.ok(doc.includes('写日志'), '流程里要写明「维护后写日志」')
})

test('四条认知错误与 §7 已知坑都在（防误判）', () => {
  const doc = readDoc()
  for (const k of ['静默跳过', '兜底', 'total == len(results)', 'dsh-restart']) {
    assert.ok(doc.includes(k), `说明书没写「${k}」这条关键认知`)
  }
})

test('记录了宿主侧与浏览器侧的区别（改错地方会以为没生效）', () => {
  const doc = readDoc()
  assert.ok(doc.includes('浏览器') && doc.includes('宿主'), '必须区分 browser/host 两侧')
  assert.ok(/绝不要.*pkill|pkill.*禁止|绝不要\s*`?pkill/.test(doc), '必须写明禁止裸杀宿主进程')
})

test('记录了渲染测试静默跳过这个坑与其解法', () => {
  const doc = readDoc()
  assert.ok(doc.includes('PANGU_TEST_MODULES'), '必须给出渲染测试的正确跑法')
  assert.ok(doc.includes('node --test'), '必须给出常规测试跑法')
})

test('维护日志里记了客户端去重已停用这件事', () => {
  const doc = readDoc()
  assert.ok(/去重/.test(logSection(doc)), '日志应记录去重停用')
  assert.ok(/恢复条件/.test(readDoc()), '保留的代码必须写明恢复条件')
})

test('AGENTS.md 的节索引指向真实节（不能张冠李戴）', () => {
  // 2026-09-26 实际踩到：AGENTS.md 索引表里 §2 写「浏览器侧 vs 宿主侧」，
  // 而说明书 §2 实为「运行形态」—— 索引错了比没有索引更糟。
  // 索引写在表格里，每行形如 `| 说明…… | §N 标题文字 |`；只认表格行，
  // 正文里的散文引用（如「§0 四条认知错误、§10 已知坑）。」）不是索引。
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
  const real = new Map()
  for (const m of readDoc().matchAll(/^## (\d+)\.\s*(.+)$/gm)) real.set(Number(m[1]), m[2].trim())
  assert.ok(real.size > 0, '说明书里连一个 `## N. 标题` 都没有，索引无从谈起')

  const table = agents.split('\n').filter((l) => l.trimStart().startsWith('|')).join('\n')
  const pairs = [...table.matchAll(/§(\d+)\s+([^|｜\n]+)/g)]
  assert.ok(pairs.length >= 8, `表格里只解析出 ${pairs.length} 条「§N 标题」索引，格式可能坏了`)

  const bad = []
  for (const [, num, rawTitle] of pairs) {
    const n = Number(num)
    const want = rawTitle.trim()
    if (!real.has(n)) bad.push(`§${n} 不存在（现有 ${[...real.keys()].sort((a, b) => a - b)}）`)
    else {
      const have = real.get(n)
      // 允许索引用短标题、说明书带括号后缀；但不能张冠李戴（§10 ≠ 维护日志）
      if (!have.startsWith(want) && !want.startsWith(have)) bad.push(`§${n} 索引写「${want}」，实际是「${have}」`)
    }
  }
  assert.strictEqual(bad.length, 0, `AGENTS.md 的节索引与说明书标题对不上：\n  ${bad.join('\n  ')}`)
})

// ── AGENTS.md 必须保持精简 ──

test('AGENTS.md 保持精简（它会被自动注入每个会话）', () => {
  const agents = path.join(ROOT, 'AGENTS.md')
  assert.ok(fs.existsSync(agents), 'AGENTS.md 不见了')
  const size = fs.statSync(agents).size
  assert.ok(size <= 4096, `AGENTS.md ${size} 字节，超过 4KB 预算。细节搬进 MAINTAINERS.md，AGENTS.md 只留索引。`)
})

test('AGENTS.md 是索引而不是手册', () => {
  const text = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8')
  assert.ok(text.includes('MAINTAINERS.md'), 'AGENTS.md 必须引用 MAINTAINERS.md')
  assert.ok(text.includes('FILE_INDEX.md'), 'AGENTS.md 应指向自动生成的文件索引')
  for (const moved of ['injection-pipeline', 'createDedupTracker', 'audit_analytics']) {
    assert.ok(!text.includes(moved), `「${moved}」属于说明书细节，不该留在被逐会话注入的 AGENTS.md`)
  }
  assert.ok(/pkill/.test(text), '「禁止裸杀宿主进程」必须留在 AGENTS.md（代价太大，不能埋在深处）')
})
