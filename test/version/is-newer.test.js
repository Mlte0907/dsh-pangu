const test = require('node:test')
const assert = require('node:assert')
const { isNewer, parseVersion } = require('../../lib/version')

test('按段比数字：0.4.10 比 0.4.9 新（字符串比较会得出相反结论）', () => {
  assert.equal(isNewer('0.4.10', '0.4.9'), true)
  assert.equal(isNewer('0.4.9', '0.4.10'), false)
})

test('容忍 v 前缀与非数字尾缀', () => {
  assert.equal(isNewer('v0.5.0', '0.4.1'), true)
  assert.equal(isNewer('0.4.1-beta', '0.4.1'), false, '同版本带后缀不算更新')
  assert.equal(isNewer('v0.4.2', 'v0.4.1'), true)
})

test('位数不齐按 0 补齐', () => {
  assert.equal(isNewer('0.5', '0.4.9'), true)
  assert.equal(isNewer('1', '0.9.9'), true)
  assert.equal(isNewer('0.4', '0.4.0'), false)
})

test('相等不算更新', () => {
  assert.equal(isNewer('0.4.1', '0.4.1'), false)
  assert.equal(isNewer('v0.4.1', '0.4.1'), false)
})

test('无法解析时不误报"有新版本"', () => {
  for (const bad of ['', null, undefined, 'abc', 'unknown']) {
    assert.equal(isNewer(bad, '0.4.1'), false, String(bad))
    assert.equal(isNewer('0.5.0', bad), false, String(bad))
  }
})

test('parseVersion 拆解正确', () => {
  assert.deepEqual(parseVersion('v0.4.1-beta'), [0, 4, 1])
  assert.deepEqual(parseVersion('nonsense'), [])
})
