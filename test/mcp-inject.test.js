'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { resolveMcpConfig, buildRowConfig, injectMcpConfig, installMcpConfigReloadHook, DEFAULT_URL } = require('../lib/mcp-inject')

function tmpCfg(value) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pangu-mcp-'))
  const p = path.join(dir, 'config.json')
  fs.writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value))
  return p
}

test('有效配置:去尾斜杠并补 /mcp,key 原样', () => {
  const p = tmpCfg({ pangu_base_url: 'http://113.45.134.86:19529/', api_key: ' k123 ' })
  const r = resolveMcpConfig(p)
  assert.deepEqual(r, { ok: true, url: 'http://113.45.134.86:19529/mcp', key: 'k123' })
})

test('缺 api_key → ok:false(不再静默给空 key 连)', () => {
  const r = resolveMcpConfig(tmpCfg({ pangu_base_url: 'http://127.0.0.1:19529', api_key: '  ' }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /api_key/)
})

test('缺 pangu_base_url → ok:false', () => {
  const r = resolveMcpConfig(tmpCfg({ pangu_base_url: '', api_key: 'k' }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /pangu_base_url/)
})

test('非法 scheme → ok:false(仅 http/https)', () => {
  const r = resolveMcpConfig(tmpCfg({ pangu_base_url: 'ftp://x.y', api_key: 'k' }))
  assert.equal(r.ok, false)
  assert.match(r.reason, /invalid/)
})

test('坏 JSON → ok:false(旧 IIFE 在这里静默回退,现在必须暴露)', () => {
  const r = resolveMcpConfig(tmpCfg('{ not json'))
  assert.equal(r.ok, false)
  assert.match(r.reason, /read\/parse/)
})

test('文件不存在 → ok:false', () => {
  const r = resolveMcpConfig(path.join(os.tmpdir(), 'definitely-missing-pangu.json'))
  assert.equal(r.ok, false)
})

test('buildRowConfig: 可用 → 真值 + failOnStartupError:false', () => {
  const c = buildRowConfig({ ok: true, url: 'http://h:1/mcp', key: 'kk' })
  assert.equal(c.url, 'http://h:1/mcp')
  assert.equal(c.headers['X-API-Key'], 'kk')
  assert.equal(c.failOnStartupError, false)
  assert.equal(c.reconnect && c.reconnect.maxAttempts, 1000000)
  assert.equal(c.transport, 'streamable-http')
  assert.equal(c.serverName, 'pangu')
})

test('buildRowConfig: 不可用 → fail-loud(默认地址+空 key+启动即失败)', () => {
  const c = buildRowConfig({ ok: false, reason: 'x' })
  assert.equal(c.url, DEFAULT_URL)
  assert.equal(c.headers['X-API-Key'], '')
  assert.equal(c.failOnStartupError, true)
})

test('injectMcpConfig: 注入完整 config 到 mcp-pangu 行', async () => {
  const p = tmpCfg({ pangu_base_url: 'http://1.2.3.4:19529', api_key: 'k' })
  let got = null
  const ctx = { loader: { entries: function * () { yield { options: { id: 'mcp-pangu' }, update: async (opts) => { got = opts } } } } }
  const r = await injectMcpConfig(ctx, { error() {} }, p)
  assert.equal(r.ok, true)
  assert.equal(got.config.url, 'http://1.2.3.4:19529/mcp')
  assert.equal(got.config.failOnStartupError, false)
})

test('app-boot/config-reload 完成后重新注回真实 MCP 配置', async () => {
  const p = tmpCfg({ pangu_base_url: 'http://1.2.3.4:19529', api_key: 'k' })
  let reload
  let got = null
  const ctx = {
    loader: {
      entries: function * () {
        yield {
          options: { id: 'mcp-pangu', config: { url: 'http://127.0.0.1:19529/mcp' } },
          update: async (opts) => { got = opts },
        }
      },
    },
    on(event, callback) {
      assert.equal(event, 'app-boot/config-reload')
      reload = callback
      return () => {}
    },
  }
  installMcpConfigReloadHook(ctx, { error() {} }, p)
  assert.equal(typeof reload, 'function')
  await reload()
  assert.equal(got.config.url, 'http://1.2.3.4:19529/mcp')
  assert.equal(got.config.headers['X-API-Key'], 'k')
})

test('injectMcpConfig: 找不到行只报错不抛(仪表盘不能被打死)', async () => {
  const p = tmpCfg({ pangu_base_url: 'http://1.2.3.4:19529', api_key: 'k' })
  const errs = []
  const r = await injectMcpConfig({ loader: { entries: function * () {} } }, { error: (m) => errs.push(m) }, p)
  assert.equal(r.ok, true)
  assert.equal(errs.length, 1)
  assert.match(errs[0], /mcp-pangu/)
})
