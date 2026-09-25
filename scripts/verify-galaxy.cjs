#!/usr/bin/env node
/**
 * 星系图浏览器验收 —— 盘古插件 (lib/client.js) 真实运行态
 *
 * 为什么需要它:仓库里的 101 个 node --test 全是纯逻辑/配置测试,没有一条真正
 * 打开过 canvas。星系图的绘制、命中检测、动效策略只能在浏览器里验。
 *
 * 设计约束(直接对应上一版交付包验证脚本的失败模式,逐条反着做):
 *  1. 不写死被测文件名 —— 用 realpath 解析 web profile 实际链接到的 client.js,
 *     并断言它就是插件仓库里那一份,防止「验的不是线上那份」。
 *  2. 环境缺失一律 process.exit(2) 报错退出,绝不静默跳过然后打印「通过」。
 *  3. 判据量的是「被修的那件事」本身,不用会被别的代码污染的代理指标:
 *     · 命中检测 → 量「指针移到真节点上能否出提示」,不拿画布像素簇当节点
 *       (画布上有 260 粒星尘 + 连线,像素簇绝大多数不是节点,按簇统计必然误判)。
 *     · 空闲开销 → 量「静止时每秒实际重绘几帧」,不用主线程毫秒数
 *       (ScriptDuration 含整页脚本,DSH 本体就能吃掉几十毫秒,换机器就飘)。
 *  4. 每条断言都打印实测值,失败时能直接看出差多少。
 *
 * 用法:
 *   node test/browser/galaxy.spec.cjs
 *   DSH_URL=http://127.0.0.1:3080/ PANGU_CHROME=/usr/bin/chromium node test/browser/galaxy.spec.cjs
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

// ── 1 · 解析被测文件:必须是插件仓库这一份,且与 web profile 链接的同一份 ──
if (!fs.existsSync(CLIENT)) fail(`找不到 ${CLIENT}`);
const realClient = fs.realpathSync(CLIENT);
const src = fs.readFileSync(realClient, 'utf8');
console.log('被测 client.js: ' + realClient + `  (${fs.statSync(realClient).size} 字节)`);

const linked = path.join(process.env.HOME || '/root', '.dsh/profiles/web/node_modules/dsh-pangu/lib/client.js');
if (fs.existsSync(linked)) {
  const realLinked = fs.realpathSync(linked);
  const same = realLinked === realClient;
  console.log('web profile 链接: ' + realLinked + (same ? '  ✓ 同一份' : '  ✗ 不是同一份!'));
  if (!same) fail('web profile 加载的不是本仓库的 client.js,测了等于没测');
} else {
  console.log('web profile 链接: 未找到 ' + linked + ' —— 跳过链接一致性检查');
}

let pw;
try {
  pw = require('playwright');
} catch (e) {
  fail('找不到 playwright: ' + e.message + '\n装一个即可: npm i -D playwright(或设 NODE_PATH 指向已有安装)');
}
const CHROME = process.env.PANGU_CHROME || '/usr/bin/chromium';
if (!fs.existsSync(CHROME)) fail(`找不到浏览器 ${CHROME}(可用 PANGU_CHROME 覆盖)`);
const BASE = process.env.DSH_URL || 'http://127.0.0.1:3080/';

function token() {
  const log = fs.readFileSync(path.join(process.env.HOME || '/root', '.dsh/web.log'), 'utf8');
  const all = [...log.matchAll(/\/\?token=([A-Za-z0-9_-]{20,})/g)].map(m => m[1]);
  if (!all.length) fail('~/.dsh/web.log 里没有 token —— DSH web 没起来?');
  return all[all.length - 1];
}

const results = [];
const t = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

async function openApp(browser, opts) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1440, height: 1000 } }, opts));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}?token=${token()}`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const items = page.locator('[role="treeitem"]');   // 顶部标签页只在会话打开后存在
  for (let i = 0, n = await items.count(); i < n; i++) {
    const txt = (await items.nth(i).innerText()).trim();
    if (txt.length > 4 && !/^(New Session|deepseek-harness|xiaoxin)$/.test(txt.split('\n')[0])) {
      await items.nth(i).click(); await page.waitForTimeout(3000); break;
    }
  }
  const tab = page.locator('[role="tab"]', { hasText: '盘古' }).first();
  if (!(await tab.count())) { await ctx.close(); fail('没找到盘古标签页 —— 插件没加载?'); }
  await tab.click();
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
const view = (page, label) => page
  .locator('nav[aria-label="盘古仪表盘视图"] button', { hasText: label }).first().click()
  .then(() => page.waitForTimeout(1500));

/**
 * 直接数「每秒真正重绘了几帧」。
 *
 * 不要用 getImageData 采样:它是同步回读,密采样会把被测的渲染管线本身压慢;
 * 而稀疏采样又会漏帧 —— 上一版就是这么把「12fps」误测成「0fps」的:
 * 只读左上角 256x64,那块正好是空场,星系在画布中央,永远采样不到变化。
 *
 * 改成数 clearRect 调用次数:draw 每帧恰好清一次画布,这是「真正画了」的
 * 唯一无歧义信号,而且挂的是原型方法,开销可忽略。
 */
const measureFps = (page, ms) => page.evaluate(async (dur) => {
  const c = document.querySelector('canvas');
  if (!c) return -1;
  const g = c.getContext('2d');
  const ctxProto = Object.getPrototypeOf(g);
  if (!ctxProto.__panguPaintHook) {
    const orig = ctxProto.clearRect;
    ctxProto.clearRect = function (...a) { window.__panguPaints = (window.__panguPaints || 0) + 1; return orig.apply(this, a); };
    ctxProto.__panguPaintHook = true;
  }
  window.__panguPaints = 0;
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, dur));
  return +((window.__panguPaints / ((performance.now() - t0) / 1000))).toFixed(1);
}, ms);

/** 画布签名:用来判断「画面有没有变」,比逐像素 diff 稳且便宜。 */
const signature = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return -1;
  const d = c.getContext('2d').getImageData(0, 0, c.width, Math.min(240, c.height)).data;
  let s = 0; for (let i = 0; i < d.length; i += 997) s += d[i]; return s;
});

/** 画布上有没有真的画出东西(不能是一块空白就「通过」)。 */
const litPixels = (page) => page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { lit: 0, px: 0, w: 0, h: 0 };
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) lit++;
  return { lit, px: c.width * c.height, w: c.clientWidth, h: c.clientHeight };
});

(async () => {
  const browser = await pw.chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  console.log('\n── 0 · 静态:命中检测必须复用绘制用的投影坐标 ──');
  {
    // 这正是独立交付版仪表盘的病根:绘制走 yaw/缩放/透视,命中却用原始 n.x/n.y。
    const hitFn = (src.match(/const hit = \(mx, my\) => \{[\s\S]*?\n {8}\}/) || [''])[0];
    t('找到 hit() 实现', hitFn.length > 0, hitFn.length ? hitFn.split('\n')[0].trim() : '未找到');
    t('hit() 遍历的是投影表 s.proj', /s\.proj/.test(hitFn));
    t('hit() 用投影后的屏幕坐标 p.sx / p.sy', /p\.sx/.test(hitFn) && /p\.sy/.test(hitFn));
    t('hit() 没用未经投影的原始 n.x / n.y 定位',
      !/[-+]\s*n\.x\b/.test(hitFn) && !/[-+]\s*n\.y\b/.test(hitFn));
  }

  console.log('\n── A · 正常动效 ──');
  {
    const { ctx, page, errors } = await openApp(browser, {});
    await view(page, '星系');
    await new Promise(r => setTimeout(r, 4000));   // 等物理收敛

    const d = await litPixels(page);
    t('星系画布有实际绘制内容', d.lit > 2000, `${d.lit} 个非空像素 / ${d.px} (${d.w}x${d.h})`);

    // 用 cursor:pointer 找真节点(宿主命中时把光标置为 pointer),再验浮层内容
    const box = await page.locator('canvas').first().boundingBox();
    // 扫到 cursor:pointer 就在同一轮里立刻取浮层内容。
    // 别「先扫完再回头验」:星系以 7.6°/s 自转,7px 细步长命中的多半是节点命中半径的
    // 边缘,等回头时节点已漂走 —— 那是坐标系自洽的正常现象,不是回归。
    // 步长取 14px 落点更靠节点中心,hover 能稳住。
    const readTip = () => page.evaluate(() => {
      const list = [...document.querySelectorAll('div')].filter(x =>
        x.style.position === 'absolute' && x.style.pointerEvents === 'none' && x.offsetWidth > 120);
      const el = list[list.length - 1];
      return el ? el.innerText.replace(/\s+/g, ' ').trim() : '';
    });
    let node = null, tip = '';
    search:
    for (let y = 14; y < box.height - 14 && !node; y += 14) {
      for (let x = 14; x < box.width - 14; x += 14) {
        await page.mouse.move(box.x + x, box.y + y);
        const cur = await page.evaluate(() => document.querySelector('canvas').style.cursor);
        if (cur === 'pointer') { node = { x, y }; tip = await readTip(); break search; }
      }
    }
    t('画布上存在可命中的节点', !!node, node ? `(${node.x}, ${node.y})` : '扫遍全画布没有任何位置命中');
    t('命中节点后浮层给出该节点内容', tip.length > 2, tip ? tip.slice(0, 60) : '没有浮层内容');

    // 空闲帧率:把指针挪开(触发 mouseleave 清 hover),避免 hover 把循环钉在满帧
    await page.mouse.move(4, 4);
    await new Promise(r => setTimeout(r, 700));
    const idleFps = await measureFps(page, 2000);
    t('空闲时不再逐帧满速重绘(≤20fps)', idleFps <= 20, `${idleFps} fps`);

    // 悬停必须仍然活着:判据是「有持续重绘」,不是「达到 60fps」。
    // 下界取 3fps 是为了和「被节流冻住(0~1fps)」明确区分开,同时容忍节点缓慢漂移。
    if (node) {
      let found = null;
      outer:
      for (let y = 14; y < box.height - 14; y += 14) {
        for (let x = 14; x < box.width - 14; x += 14) {
          await page.mouse.move(box.x + x, box.y + y);
          const cur = await page.evaluate(() => document.querySelector('canvas').style.cursor);
          if (cur === 'pointer') { found = { x, y }; break outer; }
        }
      }
      let hoverFps = 0;
      if (found) { await new Promise(r => setTimeout(r, 200)); hoverFps = await measureFps(page, 1500); }
      t('悬停节点时画面保持活动(≥3fps,不能被空闲节流冻住)', hoverFps >= 3, `${hoverFps} fps`);
    }

    // 滚轮缩放:空闲节流不能把交互一起节流掉
    const before = await signature(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(800);
    const after = await signature(page);
    t('空闲状态下滚轮缩放仍生效(节流没有误伤交互)', before !== after,
      before === after ? '缩放前后画面完全相同' : '画面随缩放改变');

    t('星系视图无 JS 异常', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  console.log('\n── B · prefers-reduced-motion ──');
  {
    const { ctx, page, errors } = await openApp(browser, { reducedMotion: 'reduce' });
    await view(page, '星系');
    await new Promise(r => setTimeout(r, 3000));
    const idleFps = await measureFps(page, 2000);
    t('reduced-motion 下静止时完全停止重绘(≤1fps)', idleFps <= 1, `${idleFps} fps`);

    const d = await litPixels(page);
    t('reduced-motion 下仍画出完整静态星图(不是白屏)', d.lit > 2000, `${d.lit} 个非空像素`);

    const box = await page.locator('canvas').first().boundingBox();
    const s0 = await signature(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(900);
    const s1 = await signature(page);
    t('reduced-motion 下滚轮缩放会重绘(画布没冻死)', s0 !== s1, s0 === s1 ? '缩放后画面完全相同' : '缩放后画面改变');

    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
    const s2 = await signature(page);
    t('reduced-motion 下拖动视角会重绘', s1 !== s2, s1 === s2 ? '拖动后画面完全相同' : '拖动后画面改变');

    t('reduced-motion 下无 JS 异常', errors.length === 0, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }

  await browser.close();
  const bad = results.filter(r => !r.pass);
  console.log(`\n统计: ${results.length - bad.length}/${results.length}`);
  if (bad.length) { console.log('失败: ' + bad.map(b => b.name).join('; ')); process.exit(1); }
  console.log('PASS · 星系图浏览器验收全部通过');
  process.exit(0);
})().catch(e => { console.error('运行器异常: ' + ((e && e.stack) || e)); process.exit(2); });
