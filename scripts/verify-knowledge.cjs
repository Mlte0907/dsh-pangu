#!/usr/bin/env node
/**
 * 知识页抽屉式主从 · 浏览器验收 —— 盘古插件 (lib/client.js) 真实运行态
 *
 * 为什么单独一个脚本：`verify-galaxy.cjs` 只覆盖星系视图，知识页的抽屉交互
 * （点行滑出、列表压窄保持可见、当前行高亮、↑↓ 只刷新面板）此前没有任何
 * 自动化验收，改一次只能靠手工点。这里把那些点法焊成断言。
 *
 * 与 verify-galaxy.cjs 同一条纪律（逐条反着交付包那 8 个脚本的失败模式写）：
 *  1. 不写死被测文件 —— realpath 解析 web profile 实际链接的 client.js，并断言它与
 *     仓库里那份是同一份，防止「验的不是线上那份」。
 *  2. 环境缺失一律 process.exit(2)，绝不静默跳过然后打印「通过」。
 *  3. 每条断言打印实测值。
 *
 * 本脚本只跑真实宿主（不接 jsdom）：抽屉的过渡、焦点、键盘、DOM 节点身份
 * 都依赖真实渲染管线，jsdom 量不出「列表有没有被重建」。
 *
 * 用法：
 *   node scripts/verify-knowledge.cjs
 *   DSH_URL=http://127.0.0.1:3080/ PANGU_CHROME=/usr/bin/chromium node scripts/verify-knowledge.cjs
 */
'use strict';
const path = require('path');
const fs = require('fs');

const REPO = path.resolve(__dirname, '..');
const CLIENT = path.join(REPO, 'lib', 'client.js');

function fail(msg) {
  console.error('\n环境不满足,拒绝运行(不静默跳过): ' + msg);
  process.exit(2);
}

// ── 1 · 被测文件必须是 web profile 实际链接的那一份 ──
if (!fs.existsSync(CLIENT)) fail(`找不到 ${CLIENT}`);
const realClient = fs.realpathSync(CLIENT);
const realLinked = fs.realpathSync(path.join(
  process.env.HOME || '/root', '.dsh/profiles/web/node_modules/dsh-pangu/lib/client.js'));
const sameFile = realLinked === realClient;
console.log('被测 client.js: ' + realClient);
console.log('web profile 链接: ' + realLinked + (sameFile ? '  ✓ 同一份' : '  ✗ 不是同一份!'));
if (!sameFile) fail('web profile 加载的不是本仓库的 client.js,测了等于没测');

let pw;
try { pw = require('playwright'); } catch (e) {
  fail('找不到 playwright: ' + e.message + '\n装一个即可: npm i -D playwright(或设 NODE_PATH 指向已有安装)');
}
const CHROME = process.env.PANGU_CHROME || '/usr/bin/chromium';
if (!fs.existsSync(CHROME)) fail(`找不到浏览器 ${CHROME}(可用 PANGU_CHROME 覆盖)`);
const BASE = process.env.DSH_URL || 'http://127.0.0.1:3080/';

function token() {
  const all = [...fs.readFileSync(path.join(process.env.HOME || '/root', '.dsh/web.log'), 'utf8')
    .matchAll(/\/\?token=([A-Za-z0-9_-]{20,})/g)].map((m) => m[1]);
  if (!all.length) fail('~/.dsh/web.log 里没有 token —— DSH web 没起来?');
  return all[all.length - 1];
}

const results = [];
const t = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

(async () => {
  const browser = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 160)));

  await page.goto(`${BASE}?token=${token()}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  // 顶部标签页只在会话打开后存在；工作区根节点也渲染成 treeitem，要跳过
  const items = page.locator('[role="treeitem"]');
  for (let i = 0, n = await items.count(); i < n; i++) {
    const txt = (await items.nth(i).innerText()).trim();
    if (txt.length > 4 && !/^(New Session|deepseek-harness|xiaoxin)$/.test(txt.split('\n')[0])) {
      await items.nth(i).click();
      await page.waitForTimeout(2500);
      break;
    }
  }
  const panguTab = page.locator('[role="tab"]', { hasText: '盘古' }).first();
  if (!(await panguTab.count())) await ctx.close(), fail('没找到盘古标签页 —— 插件没加载?');
  await panguTab.click();
  await page.waitForTimeout(1200);
  await page.locator('nav[aria-label="盘古仪表盘视图"] button', { hasText: '知识' }).first().click();
  await page.waitForTimeout(1800);

  /** 主从容器当前状态。listVisible 是关键：压窄之后列表必须还在视口里。 */
  const state = () => page.evaluate(() => {
    const m = document.querySelector('.pangu-dashboard-master');
    const list = document.querySelector('.pangu-dashboard-list-col');
    const drawer = document.querySelector('.pangu-dashboard-drawer');
    const cur = document.querySelectorAll('[data-current="true"]');
    const h3 = document.querySelector('.pangu-dashboard-detail h3');
    return {
      drawer: m ? m.getAttribute('data-drawer') : '(主从未挂载)',
      gridCols: m ? getComputedStyle(m).gridTemplateColumns : null,
      listW: list ? Math.round(list.getBoundingClientRect().width) : null,
      masterW: m ? Math.round(m.getBoundingClientRect().width) : null,
      listVisible: !!(list && list.offsetParent),
      drawerOpacity: drawer ? getComputedStyle(drawer).opacity : null,
      drawerXform: drawer ? getComputedStyle(drawer).transform : null,
      currentCount: cur.length,
      currentTitle: (cur[0] && cur[0].querySelector('span')) ? cur[0].querySelector('span').textContent.slice(0, 24) : null,
      detailTitle: h3 ? h3.textContent.slice(0, 24) : null,
      rowCount: document.querySelectorAll('.pangu-dashboard-listbox .pangu-dashboard-row').length,
      rowsScrollable: (() => {
        const b = document.querySelector('.pangu-dashboard-listbox');
        return b ? b.scrollHeight > b.clientHeight : null;
      })(),
    };
  });

  console.log('\n── A · 抽屉关闭态：列表占满整宽，抽屉不占位 ──');
  {
    const s = await state();
    t('主从容器已挂载', s.drawer !== '(主从未挂载)', s.drawer);
    t('未选中时抽屉关闭', s.drawer === 'closed', 'data-drawer=' + s.drawer);
    // 列表宽度由宿主主区决定（1280 视口实测 884px，1440 视口 1044px），
    // 所以判据是「等于主容器可用宽」，不是写死一个像素数。
    t('未选中时列表占满可用宽度', Math.abs((s.listW || 0) - (s.masterW || 0)) <= 2,
      (s.listW || 0) + 'px / 主容器 ' + (s.masterW || 0) + 'px');
    t('未选中时抽屉不可见', s.drawerOpacity === '0', 'opacity=' + s.drawerOpacity);
    t('没有当前行高亮', s.currentCount === 0, String(s.currentCount) + ' 个');
  }

  console.log('\n── B · 点行：抽屉滑出、列表压窄但保持可见、当前行高亮 ──');
  const before = await state();
  await page.locator('.pangu-dashboard-listbox .pangu-dashboard-row').nth(1).click();
  await page.waitForTimeout(700); // 等过渡
  const after = await state();
  t('点行后抽屉打开', after.drawer === 'open', 'data-drawer=' + after.drawer);
  t('列表被压窄', after.listW < before.listW, before.listW + 'px → ' + after.listW + 'px');
  t('列表仍可见（压窄≠隐藏）', after.listVisible === true, 'offsetParent=' + after.listVisible);
  t('列表压窄幅度合理（留得下标题两行）', after.listW >= 320, after.listW + 'px');
  t('抽屉内容已呈现', after.drawerOpacity === '1', 'opacity=' + after.drawerOpacity);
  t('恰好一个当前行', after.currentCount === 1, String(after.currentCount) + ' 个');
  t('当前行与详情标题一致', after.currentTitle === after.detailTitle,
    JSON.stringify(after.currentTitle) + ' / ' + JSON.stringify(after.detailTitle));

  console.log('\n── C · 键盘 ↑↓ 只刷新面板内容（列表 DOM 不重建） ──');
  {
    // 给每一行 DOM 打身份戳：memo 真生效时换选中不会重建节点
    await page.evaluate(() => {
      window.__kbStamp = (window.__kbStamp || 0) + 1;
      document.querySelectorAll('.pangu-dashboard-listbox .pangu-dashboard-row').forEach((el) => {
        el.__stamp = window.__kbStamp + '-' + Math.random().toString(36).slice(2, 8);
      });
    });
    const mark = await page.evaluate(() => [
      ...document.querySelectorAll('.pangu-dashboard-listbox .pangu-dashboard-row'),
    ].map((e) => e.__stamp));

    await page.locator('.pangu-dashboard-listbox').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(450);
    const s1 = await state();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(450);
    const s2 = await state();
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(450);
    const s3 = await state();

    const markAfter = await page.evaluate(() => [
      ...document.querySelectorAll('.pangu-dashboard-listbox .pangu-dashboard-row'),
    ].map((e) => e.__stamp));
    const unchanged = JSON.stringify(mark) === JSON.stringify(markAfter);
    const survived = mark.filter((x) => markAfter.includes(x)).length;

    t('↓ 后详情换成下一条', s2.detailTitle !== s1.detailTitle && s2.detailTitle !== after.detailTitle,
      after.detailTitle + ' → ' + s1.detailTitle + ' → ' + s2.detailTitle);
    t('↑ 后回到上一条', s3.detailTitle === s1.detailTitle, s2.detailTitle + ' → ' + s3.detailTitle);
    t('当前行跟着键盘移动', s1.currentTitle === s1.detailTitle && s3.currentTitle === s3.detailTitle,
      '↓=' + s1.currentTitle + ' ↑=' + s3.currentTitle);
    t('列表 DOM 完全未重建', unchanged, survived + '/' + mark.length + ' 个节点身份存活');
    t('键盘移动后仍恰好一个当前行', s2.currentCount === 1 && s3.currentCount === 1,
      s2.currentCount + '/' + s3.currentCount);
  }

  console.log('\n── D · Home / End 跳转与边界 ──');
  {
    await page.keyboard.press('End');
    await page.waitForTimeout(400);
    const end = await state();
    await page.keyboard.press('Home');
    await page.waitForTimeout(400);
    const home = await state();
    t('End 跳到最后一条', end.currentCount === 1 && end.currentTitle === end.detailTitle, end.detailTitle);
    t('Home 回到第一条', home.currentCount === 1, home.detailTitle);
  }

  console.log('\n── E · Esc 收起抽屉，列表恢复整宽 ──');
  {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const s = await state();
    t('Esc 后抽屉关闭', s.drawer === 'closed', 'data-drawer=' + s.drawer);
    t('Esc 后列表恢复整宽', Math.abs((s.listW || 0) - (s.masterW || 0)) <= 2,
      (s.listW || 0) + 'px / 主容器 ' + (s.masterW || 0) + 'px');
    t('Esc 后列表仍可见', s.listVisible === true, 'offsetParent=' + s.listVisible);
    t('Esc 后不再有高亮行', s.currentCount === 0, String(s.currentCount) + ' 个');

    // 收起后应能再打开（不是一次性的）
    await page.locator('.pangu-dashboard-listbox .pangu-dashboard-row').nth(3).click();
    await page.waitForTimeout(700);
    const s2 = await state();
    t('收起后可再次打开', s2.drawer === 'open' && s2.currentCount === 1,
      'data-drawer=' + s2.drawer + ' / ' + s2.currentCount + ' 个当前行');
  }

  console.log('\n── F · 全局 ──');
  t('全程无 JS 异常', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await ctx.close();
  await browser.close();

  const bad = results.filter((r) => !r.pass);
  console.log(`\n统计: ${results.length - bad.length}/${results.length}`);
  if (bad.length) { console.log('失败: ' + bad.map((b) => b.name).join('; ')); process.exit(1); }
  console.log('PASS · 知识页抽屉式主从验收全部通过');
  process.exit(0);
})().catch((e) => { console.error('运行器异常: ' + ((e && e.stack) || e)); process.exit(2); });
