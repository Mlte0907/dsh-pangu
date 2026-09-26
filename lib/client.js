/**
 * pangu-dashboard DSH 客户端 v5.1。
 * 注册:
 *  - sidebar.footer.action:  侧边栏指标卡(宽/窄双形态,独占一行)
 *  - conversation.view:      顶部标签页(概览 / 3D 星系图谱 / 知识卡片 / 知识库 / 管理)
 *  - settings.section:       设置页(真实读写 ~/.pangu/config.json)
 * v5.1: 设置页单栏重排(2026-09-24)—— 顶部四格状态总览取代两颗状态标签
 *       (服务连通 / 记忆总量 / 接入平台 / 版本,取不到显示「—」而不编 0);
 *       提供商由三列卡片组改为单选下拉(单栏版面里卡片组占两行,且与同区其它
 *       字段的读法不一致);新增真「放弃」按钮(此前只写「Esc 放弃更改」而页面
 *       并无 Esc 处理,用户按了没反应);三个开关补 aria-label(透明 input +
 *       文字在 label 之外,读屏只剩「复选框」);00 区并为「服务与凭据」;
 *       删掉从未被渲染的 rooms 拉取。
 * v5.0: 架构 v2.1 重构——平台Token管理、知识库浏览、记忆快照、来源分布。
 *       管理页拆分为 体检/平台/钥匙/快照 四个子区。
 * v4.3: 星系图 Obsidian 式搜索 dim 高亮(过滤不再移除节点);事件驱动刷新
 *       (/ws 事件缓冲,有变化才拉全量)。
 * v4.2: 知识图谱改 3D 星系视图——Canvas2D 手写透视投影(盘面分布/自转/拖拽视角/
 *       发光星点/星尘视差),不引入第三方依赖;侧边栏卡利用 wide 列状态重排。
 *       结构色沿用 DSH --dsw-alias-* 设计令牌,盘古紫仅作点缀。
 */
window.__ModuleLoader__.load({
  id: 'dsh-pangu',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const inject = ['slots', 'timer', 'remote']
    const h = React.createElement

    let ctx = null
    let timer = null

    /* ════════════════ Typert Remote 清单(客户端面) ════════════════
     * 与 lib/typert.host.js 的 invocations 对应;浏览器端用轻量 {parse} codec。
     * 必须 remote.$mount 之后 ctx.get('remote.<namespace>') 才可用。 */
    function codec(parse) { return { parse } }
    function assertObject(v, name) {
      if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new TypeError(name + ' 必须是对象')
      return v
    }
    const okEnvelope = codec((v) => { assertObject(v, 'result'); return v })
    const patchCodec = codec((v) => assertObject(v, 'patch'))
    const DESCRIPTORS = {
      package: 'dsh-pangu',
      descriptors: [
        { id: 'dsh-pangu#panguDashboard/data', service: 'panguDashboard', namespace: 'panguDashboard', method: 'data', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#DashboardData', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/ping', service: 'panguDashboard', namespace: 'panguDashboard', method: 'ping', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#Ping', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/deepHealth', service: 'panguDashboard', namespace: 'panguDashboard', method: 'deepHealth', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#DeepHealth', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/backup', service: 'panguDashboard', namespace: 'panguDashboard', method: 'backup', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#BackupResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/events', service: 'panguDashboard', namespace: 'panguDashboard', method: 'events', invocation: { kind: 'direct' }, parameters: [{ name: 'since', wire: 'since', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#Since', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#Events', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/add', service: 'panguDashboard', namespace: 'panguDashboard', method: 'add', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#AddArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#AddResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguKG/graph', service: 'panguKG', namespace: 'panguKG', method: 'graph', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KGData', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguConfig/get', service: 'panguConfig', namespace: 'panguConfig', method: 'get', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#ConfigData', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguConfig/save', service: 'panguConfig', namespace: 'panguConfig', method: 'save', invocation: { kind: 'direct' }, parameters: [{ name: 'patch', wire: 'patch', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#SavePatch', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#SaveResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguConfig/testLlm', service: 'panguConfig', namespace: 'panguConfig', method: 'testLlm', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#TestLlmResult', create: () => okEnvelope } },
        // ── 阶段 5A 钥匙与房间管理 ──
        // 这 6 个此前只在宿主清单（lib/typert.host.js）里声明，客户端清单漏了，
        // 于是 callRemote('panguAdminKeys', …) 在客户端就找不到服务（"远程服务
        // panguAdminKeys 未就绪"），而调用处是 Promise.allSettled + catch(_){} ——
        // 错误被静默吞掉，表现为钥匙列表 / 房间卡片 / 星系 / 公共区整片空白。
        // 无参方法必须零参展开，带参方法统一传单个对象（见 callRemote 的注释）。
        { id: 'dsh-pangu#panguAdminKeys/listKeys', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'listKeys', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KeyList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/listRooms', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'listRooms', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#RoomList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/listPublicMemories', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'listPublicMemories', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#PublicMemories', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/listRecentMemories', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'listRecentMemories', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#RecentMemories', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/createKey', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'createKey', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#KeyCreateArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KeyCreate', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/revokeKey', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'revokeKey', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#KeyRevokeArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KeyRevoke', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguAdminKeys/rekeyRoom', service: 'panguAdminKeys', namespace: 'panguAdminKeys', method: 'rekeyRoom', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#RekeyArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#RekeyResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguDashboard/checkUpdate', service: 'panguDashboard', namespace: 'panguDashboard', method: 'checkUpdate', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#CheckUpdateResult', create: () => okEnvelope } },
        // ── 平台管理 ──
        { id: 'dsh-pangu#panguPlatforms/listPlatforms', service: 'panguPlatforms', namespace: 'panguPlatforms', method: 'listPlatforms', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#PlatformList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguPlatforms/listPending', service: 'panguPlatforms', namespace: 'panguPlatforms', method: 'listPending', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#PendingList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguPlatforms/approve', service: 'panguPlatforms', namespace: 'panguPlatforms', method: 'approve', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#ApproveArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#ApproveResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguPlatforms/reject', service: 'panguPlatforms', namespace: 'panguPlatforms', method: 'reject', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#RejectArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#RejectResult', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguPlatforms/revoke', service: 'panguPlatforms', namespace: 'panguPlatforms', method: 'revoke', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#RevokePlatformArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#RevokePlatformResult', create: () => okEnvelope } },
        // ── 知识库 ──
        { id: 'dsh-pangu#panguKnowledge/list', service: 'panguKnowledge', namespace: 'panguKnowledge', method: 'list', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#KnowledgeListArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KnowledgeList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguKnowledge/search', service: 'panguKnowledge', namespace: 'panguKnowledge', method: 'search', invocation: { kind: 'direct' }, parameters: [{ name: 'args', wire: 'args', source: 'json', codec: { mode: 'strict', typeSymbol: 'dsh-pangu#KnowledgeSearchArgs', create: () => patchCodec } }], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KnowledgeList', create: () => okEnvelope } },
        { id: 'dsh-pangu#panguKnowledge/stats', service: 'panguKnowledge', namespace: 'panguKnowledge', method: 'stats', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'strict', typeSymbol: 'dsh-pangu#KnowledgeStats', create: () => okEnvelope } },
      ],
    }

    /* ════════════════ 设计令牌 ════════════════ */
    const ACCENT = '#33705d'
    const ACCENT_DEEP = '#255648'
    const V = (name, fallback) => `var(${name}, ${fallback})`
    const css = {
      bg1: V('--dsw-alias-bg-layer-1', '#fff'),
      bg2: V('--dsw-alias-bg-layer-2', '#f7f8fa'),
      bg3: V('--dsw-alias-bg-layer-3', '#f2f3f5'),
      skeleton: V('--dsw-alias-bg-skeleton', 'rgba(0,0,0,.06)'),
      border: V('--dsw-alias-border-l2', 'rgba(0,0,0,.1)'),
      borderSoft: V('--dsw-alias-border-l1', 'rgba(0,0,0,.05)'),
      t1: V('--dsw-alias-label-primary', '#171a23'),
      t2: V('--dsw-alias-label-secondary', '#4b5563'),
      t3: V('--dsw-alias-label-tertiary', '#6b7280'),
      ok: V('--dsw-alias-state-success-primary', '#22c55e'),
      warn: V('--dsw-alias-state-warn-primary', '#f59e0b'),
      err: V('--dsw-alias-state-error-primary', '#dc2626'),
      info: V('--dsw-alias-state-business-primary', '#4d6bfe'),
      hover: V('--dsw-alias-interactive-bg-hover', 'rgba(38,49,72,.06)'),
      shadow: '0 4px 16px rgba(0,0,0,.10)',
    }

    const STYLE_ID = 'dsh-pangu-style'
    function ensureStyles() {
      let el = document.getElementById(STYLE_ID)
      if (el) return
      el = document.createElement('style')
      el.id = STYLE_ID
      el.setAttribute('data-plugin', 'dsh-pangu')
      el.textContent = `
@keyframes panguBlink{0%,100%{opacity:.4}50%{opacity:1}}
@keyframes panguFade{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
@keyframes panguRing{0%{transform:scale(1);opacity:.55}70%,100%{transform:scale(2.1);opacity:0}}
@keyframes panguPulse{0%,100%{opacity:1}50%{opacity:.35}}
.pangu-tab:hover{color:var(--dsw-alias-label-primary,#171a23)}
.pangu-input:focus{border-color:${ACCENT}80 !important;box-shadow:0 0 0 2px ${ACCENT}1f}
.pangu-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06))}
.pangu-card{transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
.pangu-card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.09);border-color:var(--dsw-alias-border-l4,rgba(0,0,0,.2))}
.pangu-vital+.pangu-vital{border-left:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05))}
.pangu-stampline{display:inline-flex;align-items:center;gap:4px;border:1px dashed ${ACCENT};color:${ACCENT};border-radius:4px;padding:0 5px;font-size:9.5px;vertical-align:1px}
/* ══════════════════════════════════════════════════════════════════════
   盘古仪表盘 · V3 设计系统（移植自 盘古仪表盘-V3.html）
   ──────────────────────────────────────────────────────────────────────
   三条纪律（随 V3 一并落地，改动时必须遵守）：
   ① 零毛玻璃：全站 backdrop-filter = 0。层次由不透明面 + 内高光 + 三层阴影承担。
      理由：开销 ≈ 模糊半径 × 覆盖面积 × 背后内容变化频率。
   ② 中性面必须纯色：面板 / 顶栏 / 卡片一律单层纯色，不加渐变。
      理由：底色跟随 DSH 主题，一套中性渐变要同时在浅色和深色底上成立，
      结果两头都不干净。唯一允许的渐变是主按钮的橙→紫。
   ③ 形状是第二编码通道：实体类型除颜色外另有形状/色点，色觉障碍亦可辨。
   色值取自 V3 令牌表（橙 #f2600c / 青 #0e8fae / 紫 #7c3aed / 黄 #d99400），
   刻意不再沿用宿主 --dsw-alias-*：V3 的外观是逐值比对通过的，换成宿主令牌
   就不是 V3 了。宿主变量只用于仪表盘之外（侧边栏指标卡仍走 --dsw-alias-*）。
   ══════════════════════════════════════════════════════════════════════ */
/* 宿主布局配合：盘古工作台是全屏看板，不需要 DSH 的对话输入框。
   挂载期间由 PanguTab 在 body 上打 data-pangu-view="1"，卸载即摘掉。
   两条规则都走 [data-slot=…] 结构钩子，不依赖宿主那些 eT0sUa_/CC14_ 随机类名：
     ① 藏掉 composer 的座位容器 —— 否则它和 1533px 高的面板重叠（实测输入框 y=870 落在面板内）
     ② 把 viewArea 从 flex:1 0 auto 改成可收缩，面板才能真正填满剩余高度 */
body[data-pangu-view="1"] div:has(> [data-slot="conversation.composer"]){display:none!important}
body[data-pangu-view="1"] div:has(> [data-slot="conversation.view"]){flex:1 1 0!important;min-height:0!important;overflow:hidden!important}
.pangu-dashboard{
  /* 中性阶 */
  --v3-canvas:#eef0f3;   --v3-surface:#f7f8fa;
  --v3-line:rgba(18,20,24,.085);  --v3-line-2:rgba(18,20,24,.14);
  --v3-well:rgba(18,20,24,.038);
  --v3-ink-1:#111318;    --v3-ink-2:#474d57;    --v3-ink-3:#7d848f;
  --v3-hi:rgba(255,255,255,.92);
  --v3-shadow:rgba(18,20,24,.10); --v3-shadow-2:rgba(18,20,24,.055);
  /* 点缀色：填充用 / 文字用分开，保证两套主题下都达标 */
  --v3-o:#f2600c;  --v3-o-ink:#a5400a;  --v3-o-soft:rgba(242,96,12,.13);
  --v3-c:#0e8fae;  --v3-c-ink:#0b6b83;  --v3-c-soft:rgba(14,143,174,.13);
  --v3-p:#7c3aed;  --v3-p-ink:#5a24b8;
  --v3-y:#d99400;  --v3-y-ink:#8a6100;  --v3-y-soft:rgba(217,148,0,.15);
  --v3-ok:#1a9e57; --v3-ok-ink:#12703d; --v3-bad:#e0323c; --v3-bad-ink:#ab1f28;
  /* 7 类实体色（DOM 侧用；canvas 侧走 JS 表 TYPE_COLORS_*，两套必须同值） */
  --t-person:#e0663a; --t-org:#c07a12; --t-tech:#0e8fae; --t-concept:#7c3aed;
  --t-event:#d6323c; --t-location:#1a8f6a; --t-memory:#5b6ad0; --t-other:#6b7280;
  /* 圆角与阴影 */
  --v3-r-xl:26px; --v3-r-lg:20px; --v3-r-md:14px; --v3-r-sm:10px; --v3-r-pill:999px;
  --v3-card-shadow:0 1px 0 var(--v3-hi) inset, 0 18px 40px -22px var(--v3-shadow), 0 3px 10px -6px var(--v3-shadow-2);
  --v3-ease:cubic-bezier(.22,.61,.36,1);
  min-height:0!important;overflow:hidden!important;
  background:var(--v3-canvas)!important;
  color:var(--v3-ink-1);
  font-size:13.5px;line-height:1.55;
  -webkit-font-smoothing:antialiased;
  font-feature-settings:"cv05" 1,"ss03" 1;
}
/* 深色：宿主两种信号都认 —— 手动切深色走 data-ds-dark-theme，跟随系统走媒体查询 */
body[data-ds-dark-theme] .pangu-dashboard{
  --v3-canvas:#0a0b0d;   --v3-surface:#15171b;
  --v3-line:rgba(255,255,255,.085);  --v3-line-2:rgba(255,255,255,.15);
  --v3-well:rgba(255,255,255,.035);
  --v3-ink-1:#f1f3f5;    --v3-ink-2:#a6adb6;    --v3-ink-3:#6d747d;
  --v3-hi:rgba(255,255,255,.085);
  --v3-shadow:rgba(0,0,0,.55); --v3-shadow-2:rgba(0,0,0,.30);
  --v3-o:#ff8c42; --v3-o-ink:#ffa066; --v3-o-soft:rgba(255,140,66,.15);
  --v3-c:#22d3ee; --v3-c-ink:#67e8f9; --v3-c-soft:rgba(34,211,238,.15);
  --v3-p:#a78bfa; --v3-p-ink:#c4b5fd;
  --v3-y:#facc15; --v3-y-ink:#fde047; --v3-y-soft:rgba(250,204,21,.15);
  --v3-ok:#34d399; --v3-ok-ink:#6ee7b7; --v3-bad:#fb7185; --v3-bad-ink:#fda4af;
    --t-person:#ff8c42; --t-org:#f0b429; --t-tech:#22d3ee; --t-concept:#a78bfa;
    --t-event:#fb7185; --t-location:#34d399; --t-memory:#818cf8; --t-other:#8b929c;
}
@media (prefers-color-scheme:dark){
  .pangu-dashboard:not([data-theme="light"]){
    --v3-canvas:#0a0b0d;   --v3-surface:#15171b;
    --v3-line:rgba(255,255,255,.085);  --v3-line-2:rgba(255,255,255,.15);
    --v3-well:rgba(255,255,255,.035);
    --v3-ink-1:#f1f3f5;    --v3-ink-2:#a6adb6;    --v3-ink-3:#6d747d;
    --v3-hi:rgba(255,255,255,.085);
    --v3-shadow:rgba(0,0,0,.55); --v3-shadow-2:rgba(0,0,0,.30);
    --v3-o:#ff8c42; --v3-o-ink:#ffa066; --v3-o-soft:rgba(255,140,66,.15);
    --v3-c:#22d3ee; --v3-c-ink:#67e8f9; --v3-c-soft:rgba(34,211,238,.15);
    --v3-p:#a78bfa; --v3-p-ink:#c4b5fd;
    --v3-y:#facc15; --v3-y-ink:#fde047; --v3-y-soft:rgba(250,204,21,.15);
    --v3-ok:#34d399; --v3-ok-ink:#6ee7b7; --v3-bad:#fb7185; --v3-bad-ink:#fda4af;
    --t-person:#ff8c42; --t-org:#f0b429; --t-tech:#22d3ee; --t-concept:#a78bfa;
    --t-event:#fb7185; --t-location:#34d399; --t-memory:#818cf8; --t-other:#8b929c;
  }
}
/* 顶栏 = V3 .nav */
.pangu-dashboard-topbar{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:66px!important;padding:0 clamp(14px,3.2vw,26px)!important;border-bottom:1px solid var(--v3-line)!important;background:var(--v3-surface)!important;flex-shrink:0!important}
.pangu-dashboard-brand{display:flex;align-items:center;gap:10px;min-width:0;color:var(--v3-ink-2);white-space:nowrap}
/* 品牌标识 = V3 .brand-mark：中性实色容器 + 单色笔画。
   为什么不用「单色容器 + 白色图标」：--v3-surface 浅色下接近 #f7f8fa，
   白图形对亮底只有 1.06:1，图标直接消失。实心路径必须显式 fill:currentColor，
   否则深色主题下黑上加黑。 */
.pangu-dashboard-brand i{display:grid;width:32px;height:32px;flex:0 0 auto;place-items:center;border:1px solid var(--v3-line-2);border-radius:11px;background:var(--v3-surface)}
.pangu-dashboard-brand i svg{width:17px;height:17px;color:var(--v3-o-ink);overflow:visible}
.pangu-dashboard-brand-copy{display:flex;min-width:0;flex-direction:column;gap:2px}
.pangu-dashboard-brand-copy small{overflow:hidden;color:var(--v3-ink-3);font-size:10px;font-weight:600;letter-spacing:.07em;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-brand-copy strong{overflow:hidden;color:var(--v3-ink-1);font-size:13.5px;font-weight:680;letter-spacing:-.015em;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-brand em{color:var(--v3-o-ink);font-style:normal}
.pangu-dashboard-brand span{overflow:hidden;text-overflow:ellipsis}
.pangu-dashboard-topmeta{display:flex;align-items:center;gap:8px;min-width:0}
.pangu-dashboard-live{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:1px solid var(--v3-line);border-radius:var(--v3-r-pill);background:var(--v3-well);color:var(--v3-ok-ink);font-size:11.5px;font-weight:600;white-space:nowrap}
.pangu-dashboard-live::before{width:6px;height:6px;border-radius:50%;background:var(--v3-ok);content:""}
/* 视图标签 = V3 .tab：胶囊 + 选中态底色 + 底部短横 */
.pangu-dashboard-tabs{display:flex;align-items:center;gap:2px;min-height:44px!important;padding:0 clamp(14px,3.2vw,26px);border-bottom:1px solid var(--v3-line)!important;background:var(--v3-surface)!important;flex-shrink:0!important;overflow-x:auto;scrollbar-width:none}
.pangu-dashboard-tabs::-webkit-scrollbar{display:none}
.pangu-dashboard-tab{position:relative;display:flex;align-items:center;gap:7px;min-height:38px;padding:0 14px;border:0;border-radius:var(--v3-r-pill);background:transparent;color:var(--v3-ink-2);font-size:13px;font-weight:560;white-space:nowrap;cursor:pointer;transition:color .2s var(--v3-ease),background .2s var(--v3-ease)}
.pangu-dashboard-tab:hover{color:var(--v3-ink-1);background:var(--v3-well)}
.pangu-dashboard-tab[data-active="true"]{color:var(--v3-ink-1);font-weight:640;background:var(--v3-well);box-shadow:0 1px 0 var(--v3-hi) inset,0 4px 12px -6px var(--v3-shadow)}
.pangu-dashboard-tab[data-active="true"]::after{content:"";position:absolute;left:50%;bottom:-3px;width:18px;height:2px;border-radius:2px;background:var(--v3-o);transform:translateX(-50%)}
.pangu-dashboard-tab-icon{font-size:13px;line-height:1}
.pangu-dashboard-body{display:flex!important;min-height:0!important;flex:1!important;overflow:hidden!important}
/* 内部高度链必须是「可解析」的：滚动容器的 height:100% 参照的是父级，
   父级若是自动高度，百分比会解析失败并退化成内容高度 —— 结果就是内容被
   overflow:hidden 裁掉、整页滚不动。宿主把 viewArea 压到剩余高度后，
   滚动责任就落在我们自己的这一条链上，所以每一级都要显式 flex + min-height:0。 */
.pangu-dashboard-main-wrap{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.pangu-dashboard button:focus-visible,.pangu-dashboard input:focus-visible,.pangu-dashboard select:focus-visible{outline:2px solid var(--v3-c);outline-offset:2px;border-radius:6px}
.pangu-dashboard-grid{min-width:0}
.pangu-dashboard-grid>*{min-width:0}
.pangu-dashboard-scroll{flex:1 1 auto;min-height:0;overflow:auto!important;height:auto!important;box-sizing:border-box;scrollbar-gutter:stable}
/* 页面级滚动容器才用 contain：不让它把滚动传给宿主会话区。
   列表那一级必须保持默认 auto —— 见下面 .pangu-dashboard-list-col 那条注释。 */
.pangu-dashboard-scroll:not(.pangu-dashboard-listbox){overscroll-behavior:contain}
.pangu-dashboard-main{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden;padding:22px clamp(14px,3.2vw,26px) 42px;background:var(--v3-canvas)}
.pangu-dashboard-view{width:100%;max-width:1240px;margin:0 auto;animation:panguFade .3s var(--v3-ease)}
/* 星系：面板吃掉剩余高度，页面本身就不该溢出。
   之前面板写死 min(64vh,610px)，内容固定超出一截，于是只能靠滚动露出底部；
   而 canvas 上的 wheel 缩放会 preventDefault() 吃掉滚轮，用户在画布上永远滚不动。
   让它刚好铺满就没有溢出，也就没有这个冲突。 */
.pangu-dashboard-view--fill{display:flex;flex-direction:column;min-height:100%}
.pangu-dashboard-view--fill > .pangu-dashboard-panel:last-of-type{flex:1 1 0;min-height:240px}
/* 面板 = V3 .card：实色面 + 发丝边 + 26px 大圆角 + 内高光与三层阴影 */
.pangu-dashboard-panel{border:1px solid var(--v3-line);border-radius:var(--v3-r-xl);background:var(--v3-surface);box-shadow:var(--v3-card-shadow);overflow:hidden;min-width:0}
.pangu-dashboard-panel-head{display:flex;align-items:baseline;gap:8px;padding:18px 22px 12px;border-bottom:1px solid var(--v3-line)}
.pangu-dashboard-panel-head h3{font-size:14.5px;font-weight:650;letter-spacing:-.012em;color:var(--v3-ink-1)}
.pangu-dashboard-panel-head span{font-size:11.5px;font-weight:450;color:var(--v3-ink-3)}
.pangu-dashboard-panel-body{padding:18px 22px 20px}
.pangu-dashboard-chip{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 12px;border:1px solid transparent;border-radius:var(--v3-r-pill);background:transparent;color:var(--v3-ink-2);font-size:12px;font-weight:560;cursor:pointer;transition:color .2s var(--v3-ease),background .2s var(--v3-ease)}
.pangu-dashboard-chip:hover{background:var(--v3-well);color:var(--v3-ink-1)}
.pangu-dashboard-chip[data-active="true"]{color:var(--v3-ink-1);font-weight:640;background:var(--v3-hi);border-color:var(--v3-line-2);box-shadow:0 4px 12px -7px var(--v3-shadow)}
.pangu-dashboard-row{width:100%;border:0;border-bottom:1px solid var(--v3-line);background:transparent;color:var(--v3-ink-1);text-align:left;cursor:pointer;transition:background .16s var(--v3-ease)}
.pangu-dashboard-row:hover,.pangu-dashboard-row[data-selected="true"]{background:var(--v3-well)}
.pangu-dashboard-row:last-child{border-bottom:0}
.pangu-dashboard-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:33px;padding:0 13px;border:1px solid var(--v3-line);border-radius:var(--v3-r-sm);background:var(--v3-surface);color:var(--v3-ink-2);font-size:11.5px;cursor:pointer;white-space:nowrap;transition:color .18s,background .18s}
.pangu-dashboard-button:hover{border-color:var(--v3-line-2);background:var(--v3-hi);color:var(--v3-ink-1)}
.pangu-dashboard-button:disabled{cursor:default;opacity:.55}
.pangu-dashboard-button[data-primary="true"]{border-color:transparent;background:linear-gradient(135deg,var(--v3-o),var(--v3-p));color:#fff;font-weight:650;box-shadow:0 1px 0 var(--v3-hi) inset,0 8px 18px -10px var(--v3-shadow)}
.pangu-dashboard-button[data-primary="true"]:hover{filter:brightness(1.04);color:#fff}
.pangu-dashboard-button[data-danger="true"]{color:var(--v3-bad-ink)}
.pangu-dashboard-empty{display:flex;min-height:170px;flex-direction:column;align-items:center;justify-content:center;padding:28px 18px;text-align:center;color:var(--v3-ink-3)}
.pangu-dashboard-empty strong{display:block;margin-top:7px;font-size:12.5px;color:var(--v3-ink-2);font-weight:600}
.pangu-dashboard-empty span{display:block;margin-top:4px;font-size:11px;line-height:1.5}
/* 4 格指标 = V3 .kpi：圆环 + 文字 */
.pangu-dashboard-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid var(--v3-line);border-radius:var(--v3-r-lg);background:var(--v3-line)}
.pangu-dashboard-kv>div{min-width:0;padding:12px 14px;background:var(--v3-surface)}
.pangu-dashboard-kv small{display:block;color:var(--v3-ink-3);font-size:10.5px}
.pangu-dashboard-kv b{display:block;margin-top:2px;overflow:hidden;color:var(--v3-ink-1);font-size:14px;font-weight:650;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--v3-r-md)}
.pangu-dashboard-metric{display:flex;align-items:center;gap:14px;min-width:0;padding:16px;border:1px solid var(--v3-line);border-radius:var(--v3-r-xl);background:var(--v3-surface);box-shadow:var(--v3-card-shadow)}
.pangu-dashboard-metric small{display:block;color:var(--v3-ink-3);font-size:10.5px;font-weight:650;letter-spacing:.09em;text-transform:uppercase}
.pangu-dashboard-metric strong{display:block;margin-top:5px;overflow:hidden;color:var(--v3-ink-1);font-size:clamp(22px,2.4vw,30px);font-weight:720;letter-spacing:-.042em;line-height:1;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}
.pangu-dashboard-metric em{display:block;margin-top:5px;overflow:hidden;color:var(--v3-ink-3);font-size:11px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}
/* 圆环进度（V3 .ring）：SVG 描边，数字与弧同色 */
.pangu-dashboard-ring{position:relative;width:88px;height:88px;flex:0 0 auto}
.pangu-dashboard-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.pangu-dashboard-ring circle{fill:none;stroke-linecap:round;stroke-width:9}
.pangu-dashboard-ring .bg{stroke:var(--v3-well)}
.pangu-dashboard-ring .fg{transition:stroke-dashoffset .9s var(--v3-ease)}
.pangu-dashboard-ring-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.pangu-dashboard-ring-c b{display:block;font-size:22px;font-weight:700;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums}
.pangu-dashboard-ring-c i{display:block;margin-top:1px;font-size:9.5px;font-style:normal;font-weight:650;letter-spacing:.07em;color:var(--v3-ink-3)}
.pangu-dashboard-t-o{color:var(--v3-o-ink)}.pangu-dashboard-t-c{color:var(--v3-c-ink)}
.pangu-dashboard-t-p{color:var(--v3-p-ink)}.pangu-dashboard-t-y{color:var(--v3-y-ink)}
.pangu-dashboard-t-ok{color:var(--v3-ok-ink)}.pangu-dashboard-t-bad{color:var(--v3-bad-ink)}
.pangu-dashboard-status-list{display:flex;flex-direction:column}
.pangu-dashboard-status-row{display:flex;align-items:center;gap:8px;min-height:38px;border-bottom:1px solid var(--v3-line);color:var(--v3-ink-2);font-size:11.5px}
.pangu-dashboard-status-row:last-child{border-bottom:0}
.pangu-dashboard-status-row .status-label{flex:1}
.pangu-dashboard-status-row .status-value{color:var(--v3-ink-1);font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.pangu-dashboard-status-row .status-state{display:inline-flex;align-items:center;gap:5px;font-size:11px}
.pangu-dashboard-status-row .status-state::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.pangu-dashboard-two{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:16px}
.pangu-dashboard-lower{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:16px}
.pangu-dashboard-distribution{display:flex;flex-direction:column;gap:11px}
.pangu-dashboard-dist-row{display:grid;grid-template-columns:88px minmax(0,1fr) 44px;align-items:center;gap:10px}
.pangu-dashboard-dist-row span:first-child{overflow:hidden;color:var(--v3-ink-2);font-size:11.5px;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-dist-row span:last-child{color:var(--v3-ink-3);font:11px ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums;text-align:right}
.pangu-dashboard-dist-track{height:7px;overflow:hidden;border-radius:4px;background:var(--v3-well)}
.pangu-dashboard-dist-track i{display:block;height:100%;border-radius:inherit;background:var(--v3-o)}
.pangu-dashboard-pipeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.pangu-dashboard-pipeline>div{position:relative;min-width:0;padding:14px 16px;border:1px solid var(--v3-line);border-radius:var(--v3-r-lg);background:var(--v3-surface);box-shadow:var(--v3-card-shadow)}
.pangu-dashboard-pipeline>div:not(:last-child):after{content:"→";position:absolute;right:-13px;top:50%;z-index:2;display:grid;width:18px;height:18px;place-items:center;transform:translateY(-50%);border:1px solid var(--v3-line);border-radius:50%;background:var(--v3-canvas);color:var(--v3-ink-3);font-size:10px}
.pangu-dashboard-pipeline small{display:block;color:var(--v3-ink-3);font-size:10.5px}
.pangu-dashboard-pipeline strong{display:block;margin-top:4px;overflow:hidden;color:var(--v3-ink-1);font-size:24px;font-weight:720;letter-spacing:-.035em;line-height:1;font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-pipeline em{display:block;margin-top:4px;color:var(--v3-ink-3);font-size:11px;font-style:normal}
.pangu-dashboard-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.pangu-dashboard-search{display:flex;flex:1 1 220px;align-items:center;gap:8px;min-width:180px;height:34px;padding:0 12px;border:1px solid var(--v3-line);border-radius:var(--v3-r-pill);background:var(--v3-surface);transition:border-color .18s,box-shadow .18s}
.pangu-dashboard-search:focus-within{border-color:var(--v3-c);box-shadow:0 0 0 3px var(--v3-c-soft)}
.pangu-dashboard-search input{width:100%;border:0;outline:0;background:transparent;color:var(--v3-ink-1);font-size:12px}
.pangu-dashboard-select{height:34px;padding:0 10px;border:1px solid var(--v3-line);border-radius:var(--v3-r-pill);background:var(--v3-surface);color:var(--v3-ink-2);font-size:11.5px}
/* 知识主从布局 = V3 .kb-split：左栏 380px 独立滚动，页面高度与总量解耦 */
.pangu-dashboard-split{display:grid;grid-template-columns:380px minmax(0,1fr);gap:16px;align-items:start}
/* 知识页：抽屉式主从。关闭时列表占满整宽；点行后列表压到 400px 但始终可见，
   详情从右侧滑出。grid-template-columns 可过渡，所以压窄与滑出是同一条动画。 */
.pangu-dashboard-master{display:grid;grid-template-columns:minmax(0,1fr);gap:0;align-items:start;transition:grid-template-columns .3s var(--v3-ease)}
.pangu-dashboard-master[data-drawer="open"]{grid-template-columns:minmax(0,400px) minmax(0,1fr);gap:16px}
.pangu-dashboard-drawer{min-width:0;opacity:0;transform:translateX(20px);pointer-events:none;transition:opacity .2s var(--v3-ease),transform .3s var(--v3-ease)}
.pangu-dashboard-master[data-drawer="open"] .pangu-dashboard-drawer{opacity:1;transform:none;pointer-events:auto}
.pangu-dashboard-listbox:focus-visible{outline:2px solid var(--v3-c);outline-offset:2px;border-radius:var(--v3-r-xl)}
/* 当前行高亮：沿用本站「形状是第二编码通道」——左侧色条 + 底色 + 描边 */
.pangu-dashboard-row[data-current="true"]{background:var(--v3-well);box-shadow:inset 3px 0 0 var(--v3-o);border-color:var(--v3-line-2)}
.pangu-dashboard-drawer-hd{display:flex;align-items:center;gap:8px;padding:13px 16px 10px;border-bottom:1px solid var(--v3-line)}
.pangu-dashboard-list-col{position:sticky;top:0;align-self:start;max-height:72vh;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--v3-line);border-radius:var(--v3-r-xl);background:var(--v3-surface);box-shadow:var(--v3-card-shadow)}
.pangu-dashboard-list-col .pangu-dashboard-scroll{max-height:none!important;flex:1 1 auto;min-height:0}
/* 这里原来是 overscroll-behavior:contain，本意是不让列表把滚动传给页面。
   但抽屉关闭时列表占满整宽，整页没有「列表之外」可放指针的地方；
   列表滚到底后事件被 contain 吃掉，页面再也滚不动 —— 用户卡在列表末尾、
   够不到页脚。默认的 auto 才是想要的行为：列表到头后继续滚，事件传给页面。 */
.pangu-dashboard-detail{min-width:0}
.pangu-dashboard-detail h3{margin:0 0 8px;font-size:20px;font-weight:700;letter-spacing:-.028em;line-height:1.28;color:var(--v3-ink-1)}
.pangu-dashboard-detail p{margin:0 0 14px;color:var(--v3-ink-2);font-size:13px;line-height:1.72}
.pangu-dashboard-tip{margin-top:14px;padding:12px 14px;border-radius:var(--v3-r-md);background:var(--v3-well);border:1px solid var(--v3-line);color:var(--v3-ink-2);font-size:11.5px;line-height:1.6}
.pangu-dashboard-entity-head,.pangu-dashboard-entity-row{display:grid;grid-template-columns:minmax(0,1.4fr) 84px 76px minmax(105px,.7fr);align-items:center;gap:10px}
.pangu-dashboard-entity-head{padding:10px 16px;background:var(--v3-well);color:var(--v3-ink-3);font-size:10.5px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}
.pangu-dashboard-entity-row{min-height:50px;padding:10px 16px}
.pangu-dashboard-entity-row span{color:var(--v3-ink-3);font-size:11px}
.pangu-dashboard-entity-row b{overflow:hidden;color:var(--v3-ink-1);font-size:12.5px;font-weight:560;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-entity-name{display:flex;align-items:center;gap:8px;min-width:0}
.pangu-dashboard-entity-name i{width:8px;height:8px;border-radius:2px;flex:0 0 auto}
.pangu-dashboard-pager{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--v3-line)}
.pangu-dashboard-pager-info{font-size:11.5px;color:var(--v3-ink-3)}
.pangu-dashboard-pager-info b{color:var(--v3-ink-1);font-weight:640;font-variant-numeric:tabular-nums}
.pangu-dashboard-pager-nums{display:flex;gap:4px;margin-left:auto}
.pangu-dashboard-pager .pangu-dashboard-button{min-width:32px;padding:0 10px}
.pangu-dashboard-pager .pangu-dashboard-button[data-active="true"]{background:var(--v3-well);border-color:var(--v3-line-2);color:var(--v3-ink-1);font-weight:640}
.pangu-dashboard-list-head,.pangu-dashboard-list-row{display:grid;grid-template-columns:28px minmax(0,1fr) 18px;align-items:start;gap:10px}
.pangu-dashboard-list-head{padding:10px 14px;background:var(--v3-well);color:var(--v3-ink-3);font-size:10.5px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}
.pangu-dashboard-list-row{padding:12px 14px}
.pangu-dashboard-list-index{color:var(--v3-ink-3);font:11px ui-monospace,SFMono-Regular,Menlo,monospace}
.pangu-dashboard-list-title{display:flex;align-items:center;gap:7px;min-width:0;color:var(--v3-ink-1);font-size:13px;font-weight:640;letter-spacing:-.014em}
.pangu-dashboard-list-title b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-list-summary{display:-webkit-box;margin:5px 0 7px;overflow:hidden;color:var(--v3-ink-2);font-size:11.5px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.pangu-dashboard-list-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--v3-ink-3);font-size:10.5px}
.pangu-dashboard-list-arrow{align-self:center;color:var(--v3-ink-3);font-size:15px}
.pangu-dashboard-admin{display:grid;grid-template-columns:200px minmax(0,1fr);gap:16px}
.pangu-dashboard-admin-nav{display:flex;flex-direction:column;gap:4px}
.pangu-dashboard-admin-nav .pangu-dashboard-chip{justify-content:flex-start;min-height:36px}
.pangu-dashboard-table-wrap{overflow-x:auto}
.pangu-dashboard-table{width:100%;border-collapse:separate;border-spacing:0;font-size:11.5px}
.pangu-dashboard-table th{padding:9px 11px;border-bottom:1px solid var(--v3-line);color:var(--v3-ink-3);font-size:10.5px;font-weight:650;letter-spacing:.08em;text-transform:uppercase;text-align:left;white-space:nowrap}
.pangu-dashboard-table td{padding:11px;border-bottom:1px solid var(--v3-line);color:var(--v3-ink-2);vertical-align:top}
.pangu-dashboard-table tr:last-child td{border-bottom:0}
.pangu-dashboard-table tbody tr:hover td{background:var(--v3-well)}
.pangu-dashboard-code{overflow:auto;padding:14px 16px;border-radius:var(--v3-r-md);background:var(--v3-well);border:1px solid var(--v3-line);color:var(--v3-ink-2);font:11.5px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;user-select:all}
.pangu-dashboard-foot{margin-top:14px;color:var(--v3-ink-3);font-size:11px;line-height:1.6}
/* 抽屉的响应式分三档（实测：390px 下等分两栏各 168px，标题只剩 90px 宽，正文没法读）：
     ≥1041px 列表 400px + 抽屉自适应 —— 桌面，即「列表压窄保持可见」的本意
     821–1040px 列表收到 300px，抽屉吃剩余
     ≤820px 抽屉**覆盖**列表（inset:0 铺满），列表保持在原位不卸载，收起即恢复。
       手机上宽度不允许两者并存，与其两栏都读不了，不如一次只显示一个。 */
@media (min-width:821px) and (max-width:1040px){
  .pangu-dashboard-master[data-drawer="open"]{grid-template-columns:minmax(0,300px) minmax(0,1fr)}
}
@media (max-width:820px){
  .pangu-dashboard-master{position:relative}
  .pangu-dashboard-master[data-drawer="open"]{grid-template-columns:minmax(0,1fr);gap:0}
  .pangu-dashboard-master[data-drawer="open"] .pangu-dashboard-drawer{position:absolute;inset:0;z-index:3}
  .pangu-dashboard-detail h3{font-size:17px;line-height:1.35}
}
@media (max-width:1040px){.pangu-dashboard-two,.pangu-dashboard-lower{grid-template-columns:1fr}.pangu-dashboard-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.pangu-dashboard-split{grid-template-columns:1fr}.pangu-dashboard-list-col{position:static;max-height:46vh}.pangu-dashboard-admin{grid-template-columns:1fr}.pangu-dashboard-admin-nav{flex-direction:row;overflow-x:auto}}
@media (max-width:720px){.pangu-dashboard-topbar{padding:0 12px!important}.pangu-dashboard-topmeta .pangu-dashboard-live{display:none}.pangu-dashboard-tabs{padding:0 8px!important}.pangu-dashboard-tab{padding:0 9px}.pangu-dashboard-body{display:flex!important;flex-direction:column!important;overflow:hidden!important}/* 移动端保留「自己的滚动容器」，不要退回让页面外层滚。
   这里原来把 main-wrap / main / scroll 三级都设成 overflow:visible，是从旧版抄来的
   「让页面自己滚」写法；但宿主滚动已被 data-pangu-view 那两条规则关掉，
   .pangu-dashboard-scroll 是链上唯一的滚动容器 —— 一旦 visible，内容只是溢出，
   然后被上层 overflow:hidden 裁掉，用户彻底滚不动。
   受控对照（同 2200px 内容、仅视口不同）：1280px 滚后 scrollTop=400；700px scrollTop=0。 */
   .pangu-dashboard-main-wrap{overflow:hidden}
   .pangu-dashboard-main{overflow:hidden!important;padding:18px 12px 32px}
   .pangu-dashboard-scroll{flex:1 1 auto;min-height:0;height:auto!important;overflow:auto!important}.pangu-dashboard-metrics{grid-template-columns:1fr}.pangu-dashboard-pipeline{grid-template-columns:1fr}.pangu-dashboard-pipeline>div:not(:last-child):after{content:"↓";right:auto;left:50%;top:auto;bottom:-14px;transform:translateX(-50%)}.pangu-dashboard-entity-head{display:none}.pangu-dashboard-entity-row{grid-template-columns:minmax(0,1fr) auto}.pangu-dashboard-entity-row span:nth-child(2),.pangu-dashboard-entity-row span:nth-child(4){grid-column:2;text-align:right}.pangu-dashboard-entity-row span:nth-child(3){grid-column:1;grid-row:2}.pangu-dashboard-list-col{max-height:42vh}}
@media (prefers-reduced-motion:reduce){.pangu-dashboard *{animation:none!important;transition:none!important}}
`
      document.head.appendChild(el)
    }
    /* ════════════════ 图标(内联 SVG) ════════════════ */
    const ICONS = {
      database: 'M12 3c4.97 0 9 1.34 9 3s-4.03 3-9 3-9-1.34-9-3 4.03-3 9-3Z M3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6 M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3',
      pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
      gauge: 'M12 14l3.5-3.5 M3.34 19a10 10 0 1 1 17.32 0',
      layers: 'M12 2 21 7l-9 5-9-5 9-5Z M2 12l10 5 10-5 M2 17l10 5 10-5',
      graph: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M8.6 10.5l6.8-4 M8.6 13.5l6.8 4',
      network: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M8.4 7.8l7.2 2.4 M8.4 16.2l7.2-2.4',
      overview: 'M3 3h7v9H3Z M14 3h7v5h-7Z M14 12h7v9h-7Z M3 16h7v5H3Z',
      grid: 'M3 3h7v7H3Z M14 3h7v7h-7Z M3 14h7v7H3Z M14 14h7v7h-7Z',
      search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.35-4.35',
      refresh: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5',
      alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4 M12 17h.01',
      check: 'M20 6 9 17l-5-5',
      save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z M17 21v-8H7v8 M7 3v5h8',
      clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3.5 2',
      cpu: 'M5 5h14v14H5Z M9 9h6v6H9Z M9 2v3 M15 2v3 M9 19v3 M15 19v3 M2 9h3 M2 15h3 M19 9h3 M19 15h3',
      box: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z M3.3 7 12 12l8.7-5 M12 22V12',
      orbit: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M18.6 13.4c.6 2.9-1.3 6-4.6 7.4-3.4 1.5-7.2.6-8.9-1.9 M5.4 10.6C4.8 7.7 6.7 4.6 10 3.2c3.4-1.5 7.2-.6 8.9 1.9',
    }
    function Icon({ name, size, color, style }) {
      return h('svg', {
        width: size || 14, height: size || 14, viewBox: '0 0 24 24', fill: 'none',
        stroke: color || 'currentColor', strokeWidth: 1.7,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        style: { flexShrink: 0, ...style },
      }, h('path', { d: ICONS[name] || ICONS.box }))
    }

    /* ════════════════ 工具 ════════════════ */
    /* V3 实体类型色（7 类，浅/深各一套）。canvas 侧不能读 CSS 变量，
       所以两套都写在这里，绘制时按当前主题挑（见 typeColor 的 dark 参数）。
       形状是第二编码通道，色觉障碍用户不靠颜色也能分辨。 */
    const TYPE_COLORS_LIGHT = {
      person: '#e0663a', org: '#c07a12', tech: '#0e8fae', concept: '#7c3aed',
      event: '#d6323c', location: '#1a8f6a', memory: '#5b6ad0', room: '#c07a12',
    }
    const TYPE_COLORS_DARK = {
      person: '#ff8c42', org: '#f0b429', tech: '#22d3ee', concept: '#a78bfa',
      event: '#fb7185', location: '#34d399', memory: '#818cf8', room: '#f0b429',
    }
    // 2026-09-20：房间（room）概念已取消，从类型标签里移除
    const TYPE_LABELS = { person: '人物', org: '组织', tech: '技术', concept: '概念', event: '事件', location: '地点', memory: '记忆' }
    const WING_LABELS = {
      default: '通用', tech: '技术', daily: '日常', preferences: '偏好',
      self_improvement: '自我提升', system: '系统', project: '项目', work: '工作',
    }
    function wingLabel(w) { return WING_LABELS[w] || w }
    function typeColor(type, dark) {
      const table = dark ? TYPE_COLORS_DARK : TYPE_COLORS_LIGHT
      if (table[type]) return table[type]
      // 未知类型不再用 hash 随机出 360 色 —— 那会让星图变成调色盘，
      // 破坏 V3「7 类固定色 + 形状第二编码」的读法。统一落到中性灰。
      return dark ? '#8b929c' : '#6b7280'
    }
    // DOM 侧类型色：直接吐 CSS 变量，深浅两套由令牌自动切（canvas 不能用变量，故另走 typeColor）
    const TYPE_VAR = {
      person: 'var(--t-person)', org: 'var(--t-org)', tech: 'var(--t-tech)',
      concept: 'var(--t-concept)', event: 'var(--t-event)',
      location: 'var(--t-location)', memory: 'var(--t-memory)', room: 'var(--t-org)',
    }
    function typeColorCss(type) {
      return TYPE_VAR[type] || 'var(--t-other)'
    }
    function withAlpha(color, hexSuffix) {
      if (color.startsWith('#')) return color + hexSuffix
      if (color.startsWith('hsl(')) {
        const inner = color.slice(4, -1)
        const [h, s, l] = inner.split(/\s+/)
        const a = parseInt(hexSuffix, 16) / 255
        return `hsla(${h},${s},${l},${a.toFixed(2)})`
      }
      // CSS 变量（var(...)）无法在 JS 侧拆解，用 color-mix 在浏览器端混合透明度
      if (color.startsWith('var(')) {
        const a = (parseInt(hexSuffix, 16) / 255 * 100).toFixed(0)
        return `color-mix(in srgb, ${color} ${a}%, transparent)`
      }
      return color
    }
    function typeLabel(type) { return TYPE_LABELS[type] || type || '其他' }

    function fmtNum(n) {
      n = Number(n) || 0
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
      if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'
      return String(n)
    }
    function fmtUptime(s) {
      s = Number(s) || 0
      const d = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
      if (d > 0) return `${d}天${hh}小时`
      if (hh > 0) return `${hh}小时${m}分`
      return `${m}分钟`
    }
    function fmtSize(bytes) {
      bytes = Number(bytes) || 0
      if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + 'MB'
      if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + 'KB'
      return bytes + 'B'
    }
    function fmtAgo(ts) {
      const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
      if (s < 5) return '刚刚'
      if (s < 60) return `${s}秒前`
      if (s < 3600) return `${Math.floor(s / 60)}分前`
      return `${Math.floor(s / 3600)}时前`
    }

    async function callRemote(name, method, args) {
      const remote = (ctx.get && ctx.get('remote.' + name)) || (ctx.remote && ctx.remote[name])
      if (!remote || typeof remote[method] !== 'function') throw new Error('远程服务 ' + name + ' 未就绪')
      // typert 网关按声明参数个数严格校验,无参调用必须零参展开
      return args === undefined ? remote[method]() : remote[method](args)
    }
    /** 把远程错误（字符串 / RemoteFailure 对象）转成可读文案 */
    function describeRemoteError(err) {
      if (typeof err === 'string' && err) return err
      if (err && typeof err.message === 'string' && err.message) return err.message
      try { return JSON.stringify(err) } catch (_) { return '远程调用失败' }
    }

    /**
     * 解开返回值，失败一律抛错（调用方统一用错误态呈现）。
     *
     * ⚠ 有两层信封，别只解一层：
     *  ① 外层是 Typert 协议信封 {ok:true, value} / {ok:false, error}
     *     （dsh 的 packages/typert/protocol/src/types.ts:68-77：
     *      "carrier failures into the error branch" —— 失败走 ok:false，不 reject）
     *  ② 内层是**宿主服务自己的** {ok:false, error}：index.js 的 adminFetch
     *     在「未配置管理密钥」等情况下就是这么返回的。
     * 此前只解外层，于是内层错误被当成正常载荷：取 platforms 得到 undefined
     * → 平台区静默空白，用户完全看不出要填管理密钥（2026-09-21 修）。
     */
    function unwrap(r) {
      if (r === null || r === undefined) throw new Error('远程调用失败：返回为空')
      if (r.ok === false) throw new Error(describeRemoteError(r.error))
      const value = r.ok === true && 'value' in r ? r.value : r
      if (value && typeof value === 'object' && value.ok === false) {
        throw new Error(describeRemoteError(value.error))
      }
      return value
    }

    /* ── canvas 用:从 body 读取令牌实际色值,明暗切换时重读 ── */
    function readPalette() {
      const s = getComputedStyle(document.body)
      const g = (n, f) => { const v = s.getPropertyValue(n).trim(); return v || f }
      return {
        label: g('--dsw-alias-label-secondary', '#8e8e93'),
        edge: g('--dsw-alias-border-l3', 'rgba(128,128,128,.25)'),
        accent: ACCENT,
        isDark: document.body.hasAttribute('data-ds-dark-theme'),
      }
    }
    function useCanvasPalette() {
      const [pal, setPal] = React.useState(readPalette)
      React.useEffect(() => {
        const obs = new MutationObserver(() => setPal(readPalette()))
        obs.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'class'] })
        return () => obs.disconnect()
      }, [])
      return pal
    }

    /* ── 通用小件 ── */
    function Skeleton({ w, h: hh, r, style }) {
      return h('div', { style: { width: w, height: hh, borderRadius: r || 4, background: css.skeleton, animation: 'panguBlink 1.4s ease-in-out infinite', ...style } })
    }
    function ErrorState({ text, onRetry }) {
      return h('div', { style: { height: '100%', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: css.t3, animation: 'panguFade .25s ease' } },
        h(Icon, { name: 'alert', size: 22, color: css.err }),
        h('div', { style: { fontSize: 12.5, color: css.t2 } }, text || '加载失败'),
        onRetry && h('button', { className: 'pangu-btn', onClick: onRetry, style: { padding: '5px 14px', fontSize: 12, borderRadius: 7, border: `1px solid ${css.border}`, background: 'transparent', color: css.t1, cursor: 'pointer' } }, '重试'),
      )
    }
    function StatusDot({ state }) {
      const color = state === 'ok' ? css.ok : state === 'error' ? css.err : css.t3
      return h('span', { style: { position: 'relative', width: 8, height: 8, display: 'inline-block', flexShrink: 0 } },
        state === 'ok' && h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: color, animation: 'panguRing 2.2s ease-out infinite' } }),
        h('span', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: color } }),
      )
    }
    function TypeChip({ type }) {
      const c = typeColor(type)
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', borderRadius: 999, background: c + '1c', color: c, fontSize: 10, fontWeight: 600, lineHeight: '16px', flexShrink: 0 } },
        h('span', { style: { width: 5, height: 5, borderRadius: '50%', background: c } }),
        typeLabel(type),
      )
    }
    function SectionTitle({ children, style }) {
      return h('div', { style: { fontSize: 11, fontWeight: 600, color: css.t3, margin: '18px 0 4px', textTransform: 'uppercase', letterSpacing: '0.6px', ...(style || {}) } }, children)
    }
    function InfoRow({ label, value }) {
      return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: `1px solid ${css.borderSoft}` } },
        h('span', { style: { fontSize: 12, color: css.t3, flexShrink: 0 } }, label),
        h('span', { style: { fontSize: 12, color: css.t1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, value || '—'),
      )
    }

    /* ════════════════════════════════════════════
     * 1. 侧边栏内联指标卡(宽/窄双形态,独占一行)
     * ════════════════════════════════════════════ */
    function Metric({ icon, tint, label, value, pct, danger }) {
      const c = danger === 'err' ? css.err : danger === 'warn' ? css.warn : tint
      return h('div', { style: { marginBottom: 9 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
          h(Icon, { name: icon, size: 12, color: c }),
          h('span', { style: { fontSize: 11, color: css.t2, flex: 1 } }, label),
          h('span', { style: { fontSize: 11, fontWeight: 600, color: css.t1, fontVariantNumeric: 'tabular-nums' } }, value),
        ),
        h('div', { style: { height: 4, background: css.bg3, borderRadius: 2, overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.min(100, Math.max(0, pct)) + '%', background: `linear-gradient(90deg, ${c}b3, ${c})`, borderRadius: 2, transition: 'width .6s cubic-bezier(.22,1,.36,1)' } }),
        ),
      )
    }


    /* ════════════════════════════════════════════
     * 1. 侧边栏体征帧(v6.1:状态点 + 总量健康 + 7日脉搏 + 四格体征
     *    [实体/知识/来源/平台];已移除「快速记一条」入口与下方管线跳转行)
     * ════════════════════════════════════════════ */

    // 7 日记忆脉搏 sparkline（内联 SVG，供侧边栏使用）
    // v6.1：制图语法对齐 V3 仪表盘脉搏图（index-v3.html renderPulse）：
    //   柱=中性钢灰、唯一峰值柱换强调色并在柱顶标数值；召回折线同色系 +
    //   面积浅填 + 数据点圆点；3 条水平网格含零基线。
    // 色值不抄 V3 的 hex（会破坏宿主主题），全部映射到宿主令牌：
    //   柱(钢灰)→css.t3 · 峰值→css.warn · 折线/点/面积→css.info · 网格/基线→css.borderSoft
    // 与 V3 的三点有意偏离：
    //   ① 不画 X 轴日期文字 —— 下方文字行已承担说明职责；
    //   ② 0 值柱给 2px 矮桩（V3 是完全不可见）—— 7 格需要能看出"有这一格但为 0"；
    //   ③ 柱与召回线各自归一（V3 共用一把 Y 标尺）—— 真实数据里召回是累计量级
    //      （约 1510）而创建是日增量（约 169），共用标尺会把所有柱子压成 2px 桩、
    //      图表彻底不可读。V3 能共用是因为它那组样例数据两路同量级。
    function Sparkline7({ created, recalled, data, height, showLabel }) {
      // 兼容旧调用（data 即 created）
      const days = ((created || data || []).slice(-7))
      const rcs = (recalled || []).slice(-7)
      if (!days || days.length < 2) return null
      const wrapRef = React.useRef(null)
      const [W, setW] = React.useState(190)
      React.useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver((entries) => {
          const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0
          if (w) setW(Math.max(120, Math.round(w)))
        })
        ro.observe(el)
        return () => ro.disconnect()
      }, [])
      const H = height || 42, TOP = 12, BOTTOM = H - 6
      const n = days.length
      const step = W / n
      const maxC = Math.max(1, ...days.map((d) => Number(d.count) || 0))
      const maxR = Math.max(1, ...rcs.map((d) => Number(d.count) || 0))
      // 柱宽按 V3 比例 step*0.42，窄容器下收窄防重叠
      const barW = Math.max(5, Math.min(14, Math.round(step * 0.42)))
      const barR = Math.min(6, barW / 2)
      const xC = (i) => Math.round(step * i + step / 2)
      const barH = (c) => ((BOTTOM - TOP) * (Number(c) || 0)) / maxC
      const yR = (c) => Math.round(BOTTOM - ((BOTTOM - TOP) * (Number(c) || 0)) / maxR)
      const hasRecall = rcs.some((d) => (Number(d.count) || 0) > 0)
      const peak = Math.max(...days.map((d) => Number(d.count) || 0))
      const peakIdx = days.findIndex((d) => (Number(d.count) || 0) === peak)
      const total = days.reduce((a, d) => a + (Number(d.count) || 0), 0)
      const rTotal = rcs.reduce((a, d) => a + (Number(d.count) || 0), 0)
      const today = Number(days[n - 1]?.count) || 0
      const yesterday = Number(days[n - 2]?.count) || 0
      const delta = today - yesterday
      return h('div', { ref: wrapRef, style: { marginTop: 8 } },
        h('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', style: { width: '100%', height: H, display: 'block' }, role: 'img', 'aria-label': `近 7 日创建 ${total} 条` + (hasRecall ? `，召回 ${rTotal} 次` : '') },
          // 网格 3 条（含零基线）
          h('g', { stroke: 'var(--v3-line)', strokeWidth: 1 },
            [TOP, Math.round((TOP + BOTTOM) / 2), BOTTOM].map((y, i) => h('line', { key: i, x1: 0, y1: y, x2: W, y2: y })),
          ),
          // 召回折线 + 浅面积填充（V3 语法：填充 alpha 约 .1，线宽 2.2，圆点 r 3.1）
          hasRecall && h('polygon', {
            points: rcs.map((d, i) => xC(i) + ',' + yR(d.count)).join(' ') + ' ' + xC(n - 1) + ',' + BOTTOM + ' ' + xC(0) + ',' + BOTTOM,
            fill: css.info, fillOpacity: 0.1, stroke: 'none',
          }),
          hasRecall && h('polyline', { points: rcs.map((d, i) => xC(i) + ',' + yR(d.count)).join(' '), fill: 'none', stroke: css.info, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          hasRecall && h('g', { fill: 'var(--v3-c)' }, rcs.map((d, i) => (Number(d.count) || 0) > 0
            ? h('circle', { key: i, cx: xC(i), cy: yR(d.count), r: 3.1 }) : null)),
          // 创建柱：中性钢灰，唯一峰值柱换强调色
          h('g', null, days.map((d, i) => {
            const v = Number(d.count) || 0
            const isPeak = peak > 0 && v === peak
            const hh = v > 0 ? Math.max(2, barH(v)) : 2
            return h('rect', {
              key: i, x: xC(i) - barW / 2, y: BOTTOM - hh, width: barW, height: hh, rx: barR,
              fill: isPeak ? css.warn : css.t3, opacity: v > 0 ? 1 : 0.25,
            })
          })),
          // 峰值标注（V3：柱顶上方，650 字重等宽）
          peak > 0 && h('text', {
            x: xC(peakIdx), y: BOTTOM - barH(peak) - 3,
            fill: css.warn, fontSize: 8.5, fontWeight: 650, textAnchor: 'middle',
            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
          }, String(peak)),
        ),
        showLabel !== false && h('div', { style: { fontSize: 9.5, color: css.t3, marginTop: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
          h('span', null, '7日 ', h('b', { style: { color: css.t2 } }, total), ' 条',
            hasRecall ? h('span', null, ' · 召回 ', h('b', { style: { color: css.t2 } }, rTotal)) : null),
          h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: delta > 0 ? css.ok : delta < 0 ? css.warn : css.t3 } },
            '今日 ' + today, delta !== 0 ? (delta > 0 ? ' ↑' + delta : ' ↓' + Math.abs(delta)) : ''),
        ),
      )
    }
    function SidebarCard({ wide }) {
      const [state, setState] = React.useState({ status: 'loading', data: null, at: 0 })
      const rootRef = React.useRef(null)
      const lastTsRef = React.useRef(0)
      const load = React.useCallback(async () => {
        try {
          const value = unwrap(await callRemote('panguDashboard', 'data'))
          setState({ status: 'ok', data: value, at: Date.now() })
        } catch (e) {
          console.warn('[pangu-dashboard] 侧边栏数据加载失败:', String((e && e.message) || e))
          setState((p) => ({ status: p.data ? 'ok' : 'error', data: p.data, at: p.at || Date.now() }))
        }
      }, [])

      React.useEffect(() => {
        load()
        const tick = () => { if (!document.hidden) load() }
        const stop = timer && timer.interval
          ? timer.interval(tick, 30000)
          : (() => { const id = setInterval(tick, 30000); return () => clearInterval(id) })()
        const evTick = async () => {
          try {
            const v = unwrap(await callRemote('panguDashboard', 'events', { since: lastTsRef.current }))
            lastTsRef.current = v?.lastTs || lastTsRef.current
            if (v?.count > 0 && !document.hidden) load()
          } catch (_) {}
        }
        const stop2 = timer && timer.interval
          ? timer.interval(evTick, 12000)
          : (() => { const id = setInterval(evTick, 12000); return () => clearInterval(id) })()
        const offReset = ctx && ctx.on ? ctx.on('connection/reset', load) : null
        return () => { if (stop) stop(); if (stop2) stop(); if (offReset) offReset() }
      }, [])

      React.useEffect(() => {
        let el = rootRef.current
        for (let i = 0; i < 3 && el; i++) {
          el = el.parentElement
          if (!el) break
          const cs = getComputedStyle(el)
          if (cs.display === 'flex' && cs.flexDirection === 'row') {
            el.style.flexWrap = 'wrap'
            break
          }
        }
      }, [])

      const s = state.data?.stats
      const total = s?.total || 0
      const health = s?.health || '?'
      const degraded = health === 'degraded' || health === 'unreachable'
      const loading = state.status === 'loading'

      if (!wide) {
        // v6.2：窄形态徽标改用正式品牌标识（问号造型实心单路径），
        // 并把原来的「白图标 + 橙紫渐变方块」扁平化为「中性底 + 描边 + 单色笔画」。
        // 原因与 V3 品牌角标一致：实心图形压在彩色容器上，浅色主题下白对亮底
        // 对比不足；且渐变与「中性面必须纯色」的设计纪律冲突。
        return h('div', { ref: rootRef, title: '盘古记忆系统' + (state.status === 'error' ? '(离线)' : ''), style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 28, margin: '2px auto 6px', borderRadius: 8, background: css.bg2, border: `1px solid ${css.borderSoft}` } },
          loading
            ? h(Skeleton, { w: 12, h: 12, r: 4 })
            : h('span', { style: { width: 14, height: 14, borderRadius: 5, background: css.bg1, border: `1px solid ${css.border}`, color: css.t1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: state.status === 'error' ? 0.35 : 1 } },
                h('svg', { width: 10, height: 10, viewBox: '0 0 628 628', fill: 'currentColor', 'aria-hidden': 'true' },
                  h('path', { d: 'M359.108.585c-29.775 2.249-72.938 12.317-150.48 35.13-52.053 15.316-53.874 15.851-68.547 23.134C61.895 97.3 36.19 198.62 86.85 268.987c26.562 37.058 74.009 55.48 118.564 46.162 10.282-2.142 26.348-7.711 73.902-25.598 22.385-8.354 51.731-19.278 65.333-24.205 26.562-9.64 30.953-12.21 36.63-20.671 4.605-6.748 5.998-12.424 5.355-20.993-1.071-15.744-12.317-28.275-27.954-31.167-8.783-1.606-13.817-.214-47.768 12.638-82.042 31.168-114.816 43.163-121.456 44.234-24.099 3.856-47.983-11.888-57.087-37.593-4.07-11.353-4.712-30.096-1.5-42.627 5.891-23.563 20.993-42.2 42.414-52.16 17.78-8.247 136.879-41.02 169.117-46.483 34.273-5.784 61.585-4.713 85.898 3.641 47.554 16.173 78.828 62.87 73.259 109.568-3.428 28.06-14.78 50.446-36.523 71.652-13.388 12.96-31.81 25.384-58.8 39.95-39.95 21.314-58.264 32.345-73.366 43.913-9.64 7.283-29.882 27.311-37.487 37.058-24.74 31.488-39.2 72.08-37.807 105.711.321 9.211.857 11.889 3.213 16.494 11.674 22.385 43.377 24.848 57.086 4.392 3.963-5.891 5.141-10.497 6.855-26.562 4.391-40.593 29.24-74.866 74.544-102.927 5.356-3.213 20.778-11.782 34.274-19.065 38.878-20.778 52.588-29.56 71.973-46.376 18.958-16.172 33.524-34.916 43.806-55.908 27.097-55.801 23.349-121.563-9.746-170.724C504.769 29.396 444.47-.915 377.637.05c-7.497.107-15.851.322-18.529.536M280.173 547.565c-23.67 7.711-35.559 34.595-25.063 56.98 4.284 9.103 10.71 15.744 19.28 20.028 6.532 3.213 7.818 3.427 17.778 3.427 9.64 0 11.246-.321 16.816-3.106 15.958-8.033 26.026-26.24 23.884-43.163-.964-7.818-6.962-19.493-12.96-24.955-7.711-7.069-15.316-10.068-26.133-10.39-5.57-.213-10.925.322-13.602 1.179' }),
              ),
            ),
        )
      }

      return h('div', { ref: rootRef, style: { width: '100%', flexShrink: 0, boxSizing: 'border-box', margin: '14px 0 8px', padding: '11px 13px 9px', background: css.bg2, border: `1px solid ${css.borderSoft}`, borderRadius: 10, animation: 'panguFade .25s ease' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: degraded ? css.warn : ACCENT, flexShrink: 0, animation: 'panguPulse 2.6s ease-in-out infinite' } }),
          h('span', { style: { fontSize: 12, fontWeight: 600, color: css.t1 } }, '盘古 · ' + (state.status === 'error' ? '离线' : '在线')),
          h('span', { style: { marginLeft: 'auto', fontSize: 9.5, color: css.t3, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' } }, fmtAgo(state.at)),
        ),
        loading
          ? h('div', { style: { marginTop: 9 } }, [0, 1, 2].map((i) => h(Skeleton, { key: i, w: '100%', h: 10, r: 3, style: { marginBottom: 6 } })))
          : [
              h('div', { key: 'vol', style: { marginTop: 7, fontSize: 11.5, color: css.t2 } },
                h('b', { style: { color: css.t1, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' } }, fmtNum(total)),
                ' 条记忆', h('span', { style: { color: css.border, margin: '0 5px' } }, '·'),
                '健康 ', h('b', { style: { color: degraded ? css.warn : css.t1, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' } }, health),
              ),
              h(Sparkline7, { key: 'pulse', created: s?.dailyCounts, recalled: s?.dailyRecalls, height: 42 }),
              // v6.1：指标区由 3 格扩为 4 格，平台接入从下方独立行并入此处。
              // 单行 4 列而非 2×2 —— 2×2 会让第 3 格多出一条 .pangu-vital 分隔线（该规则
              // 是相邻兄弟选择器，见 .pangu-vital+.pangu-vital）。侧栏内容宽约 200px，
              // 4 格每格 ~50px，故数值/标签字号与内边距同步收窄。
              h('div', { key: 'mini', style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', marginTop: 8, borderTop: `1px solid ${css.borderSoft}`, borderBottom: `1px solid ${css.borderSoft}` } },
                // 2026-09-20：knowledge/platformsCount 挂在 wire 的 stats 下（网关把
                // host 扁平返回包一层 stats），顶层读不到 → 双路径兜底
                [['实体', s?.kgEntities != null ? fmtNum(s.kgEntities) : '—'],
                 ['知识', (state.data?.knowledge ?? s?.knowledge)?.total != null ? fmtNum((state.data?.knowledge ?? s?.knowledge).total) : '—'],
                 ['来源', Object.keys(state.data?.bySource || s?.bySource || {}).length || '—'],
                 // 待审核数只有 panguPlatforms/listPending 才有（wire 不带），侧边栏
                 // 为此多发一次远程调用不划算，故只显示已接入数，取不到显示「—」。
                 ['平台', (state.data?.platformsCount ?? s?.platformsCount) != null ? fmtNum(state.data?.platformsCount ?? s?.platformsCount) : '—']].map(([l, v]) =>
                  h('div', { key: l, className: 'pangu-vital', style: { padding: '6px 1px 5px', textAlign: 'center' } },
                    h('div', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12.5, fontWeight: 600, color: css.t1, lineHeight: 1.15 } }, v),
                    h('div', { style: { fontSize: 8.5, color: css.t3, letterSpacing: '.02em', marginTop: 1 } }, l),
                  )),
              ),
            ],
      )
    }

    /* ════════════════════════════════════════════
     * 2. 顶部标签页 — 概览 / 星系 / 结晶 / 管理 (v5)
     * ════════════════════════════════════════════ */
    function StatusPill({ status }) {
      const color = status === 'ok' ? css.ok : status === 'fail' || status === 'degraded' ? css.err : css.t3
      return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: css.t1 } },
        h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 } }),
        status === 'ok' ? '正常' : status === 'fail' ? '异常' : status || '—',
      )
    }

    function Vital({ v, l, d, danger }) {
      return h('div', { className: 'pangu-vital', style: { flex: 1, padding: '11px 6px 10px', textAlign: 'center' } },
        h('div', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 20, fontWeight: 600, color: danger ? css.warn : css.t1, letterSpacing: '-.015em', lineHeight: 1.1 } }, v),
        h('div', { style: { fontSize: 9.5, color: css.t3, letterSpacing: '.07em', marginTop: 3 } }, l),
        d && h('div', { style: { fontSize: 9.5, color: css.t3, marginTop: 3 } }, d),
      )
    }

    function SecHead({ num, title, hint }) {
      return h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '2px 0 7px', borderBottom: `1px solid ${css.borderSoft}`, margin: '20px 0 0' } },
        h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, num),
        h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, title),
        hint && h('span', { style: { fontSize: 10.5, color: css.t3 } }, hint),
      )
    }

    function PipelineBox({ st, v, small, d, warn, off, arrow }) {
      return h('div', { style: { flex: 1, minWidth: 0, padding: '10px 12px', position: 'relative' } },
        h('div', { style: { fontSize: 9.5, color: css.t3, letterSpacing: '.08em' } }, st),
        h('div', { style: { fontSize: 15, fontWeight: 600, marginTop: 2, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: warn ? css.warn : off ? css.t3 : css.t1 } }, v, small && h('span', { style: { fontSize: 10, color: css.t3, fontWeight: 400, marginLeft: 3 } }, small)),
        d && h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 3, lineHeight: 1.5 } }, d),
        arrow && h('span', { style: { position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, border: `1px solid ${css.borderSoft}`, background: css.bg1, borderRadius: '50%', display: 'grid', placeItems: 'center', color: css.t3, fontSize: 9, zIndex: 2 } }, '→'),
      )
    }

    function DashboardPanel({ title, hint, action, children, bodyStyle, className, style }) {
      return h('div', { className: 'pangu-dashboard-panel ' + (className || ''), style },
        (title || hint || action) && h('div', { className: 'pangu-dashboard-panel-head' },
          title && h('h3', null, title),
          hint && h('span', null, hint),
          action && h('div', { style: { marginLeft: 'auto' } }, action),
        ),
        h('div', { className: bodyStyle === false ? '' : 'pangu-dashboard-panel-body', style: bodyStyle === false ? undefined : bodyStyle }, children),
      )
    }

    /* V3 .vhead：h1 700 / -0.028em，副标题 12.5px ink-3，kicker 走橙色微标签 */
    function ViewHeader({ kicker, title, description, meta }) {
      return h('header', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 20, flexWrap: 'wrap' } },
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { color: 'var(--v3-o-ink)', fontSize: 10.5, fontWeight: 650, letterSpacing: '.09em', textTransform: 'uppercase' } }, kicker),
          h('h1', { style: { margin: '5px 0 3px', color: 'var(--v3-ink-1)', fontSize: 27, fontWeight: 700, letterSpacing: '-.028em', lineHeight: 1.15 } }, title),
          description && h('p', { style: { margin: 0, color: 'var(--v3-ink-3)', fontSize: 12.5, lineHeight: 1.5 } }, description),
        ),
        meta && h('div', { style: { flexShrink: 0, color: 'var(--v3-ink-3)', fontSize: 11, lineHeight: 1.55, textAlign: 'right' } }, meta),
      )
    }


    function Distribution({ items, total, labeler, palette }) {
      const rows = (items || []).slice(0, 8)
      const sum = Number(total) || rows.reduce((acc, x) => acc + (Number(x.count) || 0), 0) || 1
      const colors = palette || [ACCENT, css.info, css.ok, css.warn, css.err, css.t3]
      return h('div', { className: 'pangu-dashboard-distribution' }, rows.length ? rows.map((item, i) => {
        const name = labeler ? labeler(item.name) : item.name
        const count = Number(item.count) || 0
        return h('div', { className: 'pangu-dashboard-dist-row', key: String(item.name) },
          h('span', { title: name }, name),
          h('span', { className: 'pangu-dashboard-dist-track' }, h('i', { style: { width: Math.max(2, count / sum * 100) + '%', background: colors[i % colors.length] } })),
          h('span', null, fmtNum(count)),
        )
      }) : h('div', { style: { padding: '18px 0', color: css.t3, fontSize: 10.5, textAlign: 'center' } }, '暂无数据'));
    }

    function DashboardButton({ children, icon, primary, danger, disabled, onClick, title, style }) {
      return h('button', {
        type: 'button', className: 'pangu-dashboard-button', onClick, disabled, title,
        'data-primary': primary ? 'true' : undefined,
        'data-danger': danger ? 'true' : undefined,
        style,
      }, icon && h(Icon, { name: icon, size: 12 }), children)
    }

    function MemRow({ m }) {
      // 点击整行展开/收起：摘要默认 2 行截断（line-clamp），此前行是死的 —— 截断后
      // 没有任何办法看到全文（用户报"底部无法点击"）。
      const [open, setOpen] = React.useState(false)
      // 优先用后端给的 encrypted 字段（后端已解密并给出 summary）
      const enc = m.encrypted === true || (typeof m.content === 'string' && m.content.startsWith('gAAAAA'))
      const imp = Number(m.importance || 0)
      return h('div', {
        onClick: () => setOpen((v) => !v),
        title: open ? '点击收起' : '点击展开全文',
        style: { display: 'flex', gap: 10, padding: '9px 2px', borderBottom: `1px solid ${css.borderSoft}`, alignItems: 'flex-start', cursor: 'pointer' },
      },
        h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, color: css.t3, width: 34, flexShrink: 0, paddingTop: 2 } }, (m.graduated_at || m.created_at || '').slice(5, 10)),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center', fontSize: 10, color: css.t3 } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: css.t2 } }, (m.source_wing || m.wing || '?') + ' / ' + (m.source_room || m.room || '?')),
            (m.tags || []).slice(0, 3).map((t) => h('span', { key: t, style: { border: `1px solid ${css.borderSoft}`, borderRadius: 4, padding: '0 5px', fontSize: 9.5 } }, t)),
            enc && h('span', { className: 'pangu-stampline' }, '已加密'),
          ),
          h('div', { style: { fontSize: 11.5, color: (enc && !m.summary) ? css.t3 : css.t1, marginTop: 3, lineHeight: 1.55, fontStyle: (enc && !m.summary) ? 'italic' : 'normal', display: '-webkit-box', WebkitLineClamp: open ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: open ? 'visible' : 'hidden' } },
            // 2026-09-20 修复：展开时显示全文 —— 原来无条件 slice(0,120)，
            // 行截断已由 line-clamp 承担，slice 导致展开后也只有 120 字。
            m.summary || (enc ? '（加密内容 · 摘要不可用）' : (open ? (m.content || '') : (m.content || '').slice(0, 120)))),
          open && h('div', { style: { fontSize: 9.5, color: css.t3, marginTop: 3 } }, '点击收起'),
        ),
        h('div', { style: { flexShrink: 0, textAlign: 'right' } },
          h('div', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 11.5, fontWeight: 600 } }, imp ? imp.toFixed(1) : '—'),
          h('div', { style: { fontSize: 9, color: css.t3 } }, '印象'),
        ),
      )
    }
    // 7 日记忆脉搏：创建柱（accent）+ 召回折线（info），照重设计稿样品实现。
    // created 来自后端按 created_at 现算；recalled 来自插件侧按天采集的 /ws memory_recall
    // （盘古没有按日召回历史，采集从本版本开始，前几日为 0 属预期）。
    function PulseChart({ created, recalled }) {
      const days = (created || []).slice(-7)
      const recalls = (recalled || []).slice(-7)
      const n = Math.max(1, days.length)
      // 宽度跟随容器：viewBox 与实际像素 1:1，柱宽/字号/圆都按设计值固定。
      // 此前 viewBox 固定 620 + preserveAspectRatio:'none'，容器一宽（宽屏实测 1248px）
      // 整个图被横向拉 2.01 倍 —— 字变胖、柱变宽、圆变椭圆（用户报"宽屏拉长变形"）。
      const wrapRef = React.useRef(null)
      const [W, setW] = React.useState(620)
      React.useEffect(() => {
        const el = wrapRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver((entries) => {
          const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0
          if (w) setW(Math.max(320, Math.round(w)))
        })
        ro.observe(el)
        return () => ro.disconnect()
      }, [])
      const H = 132, TOP = 26, BOTTOM = 102
      const maxC = Math.max(1, ...days.map((d) => Number(d.count) || 0))
      const maxR = Math.max(1, ...recalls.map((d) => Number(d.count) || 0))
      const step = W / n
      // 柱宽取设计值 22，但容器很窄时收窄到 step 的 60% 防重叠（宽屏下不再被拉宽）
      const barW = Math.max(8, Math.min(22, Math.round(step * 0.6)))
      const xC = (i) => Math.round(step * i + step / 2)
      const barH = (c) => Math.round(((BOTTOM - TOP) * (Number(c) || 0)) / maxC)
      const yR = (c) => Math.round(BOTTOM - ((BOTTOM - TOP) * (Number(c) || 0)) / maxR)
      const hasRecall = recalls.some((d) => (Number(d.count) || 0) > 0)
      const peakDay = Math.max(0, ...days.map((d) => Number(d.count) || 0))
      return h('div', { ref: wrapRef },
        // preserveAspectRatio 用 meet（非 none）：首帧测量未回来时宁可两侧留白也不拉伸
        h('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', style: { width: '100%', height: H, display: 'block' }, 'aria-hidden': 'true' },
          h('g', { stroke: css.borderSoft, strokeWidth: 1 },
            [TOP, Math.round((TOP + BOTTOM) / 2), BOTTOM].map((y, i) => h('line', { key: i, x1: 0, y1: y, x2: W, y2: y })),
          ),
          hasRecall && h('polyline', {
            points: recalls.map((d, i) => xC(i) + ',' + yR(d.count)).join(' '),
            fill: 'none', stroke: 'var(--v3-c)', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round',
          }),
          hasRecall && h('g', { fill: css.info },
            recalls.map((d, i) => h('circle', { key: i, cx: xC(i), cy: yR(d.count), r: 2.5 })),
          ),
          h('g', null, days.map((d, i) => {
            const hh = Math.max(2, barH(d.count))
            const isPeakDay = peakDay > 0 && Number(d.count) === peakDay
            return h('rect', {
              key: i, x: xC(i) - barW / 2, y: BOTTOM - hh, width: barW, height: hh, rx: 2.5,
              fill: isPeakDay ? 'var(--v3-o)' : 'var(--v3-ink-3)', opacity: isPeakDay ? 1 : 0.9,
            })
          })),
          h('g', { fontSize: 9, fill: 'var(--v3-ink-3)', textAnchor: 'middle', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' },
            days.map((d, i) => h('text', { key: i, x: xC(i), y: H - 8 }, i === n - 1 ? '今日' : String((d.date || '').slice(5)))),
          ),
        ),
        h('div', { style: { display: 'flex', gap: 14, marginTop: 3, fontSize: 10.5, color: css.t3 } },
          h('span', null,
            h('i', { style: { display: 'inline-block', width: 9, height: 9, borderRadius: 2, marginRight: 4, verticalAlign: -1, background: ACCENT } }),
            '摄入（条）'),
          h('span', null,
            h('i', { style: { display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 4, verticalAlign: -1, background: css.info } }),
            hasRecall ? '召回（次）' : '召回（本版起采集）'),
          h('span', { style: { marginLeft: 'auto' } },
            '夜间巩固窗口 ', h('b', { style: { color: css.t2 } }, '03:00–05:00')),
        ),
      )
    }

    /* ── V3 圆环 KPI ──────────────────────────────────────────────
       环的数值必须来自真实数据，算不出就显示 '—' 并把环画成空环，
       不拿装饰性数字充数（V3 样品的 86/92/68/94 是演示值，这里不能照抄）。 */
    const RING_R = 38
    const RING_C = 2 * Math.PI * RING_R
    function Ring({ pct, color, value, label }) {
      const known = pct != null && Number.isFinite(pct)
      const clamped = known ? Math.max(0, Math.min(100, pct)) : 0
      return h('div', { className: 'pangu-dashboard-ring' },
        h('svg', { viewBox: '0 0 96 96', 'aria-hidden': 'true' },
          h('circle', { className: 'bg', cx: 48, cy: 48, r: RING_R }),
          h('circle', {
            className: 'fg', cx: 48, cy: 48, r: RING_R,
            stroke: color, strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - clamped / 100),
          }),
        ),
        h('div', { className: 'pangu-dashboard-ring-c' },
          h('b', { className: color, style: color ? null : { color: 'var(--v3-ink-3)' } }, value),
          h('i', null, label),
        ),
      )
    }
    function V3Kpi({ ring, ringColor, ringValue, ringLabel, label, value, unit, foot, valueClass }) {
      return h('div', { className: 'pangu-dashboard-metric' },
        h(Ring, { pct: ring, color: ringColor, value: ringValue, label: ringLabel }),
        h('div', { style: { minWidth: 0 } },
          h('small', null, label),
          h('strong', { className: valueClass || null }, value, unit ? h('em', { style: { fontSize: '.42em', fontWeight: 600, color: 'var(--v3-ink-3)', marginLeft: 3, fontStyle: 'normal' } }, unit) : null),
          foot ? h('em', null, foot) : null,
        ),
      )
    }

    function OverviewPane({ dash, dashErr, loading, onRetry }) {
      const [pubMems, setPubMems] = React.useState([])
      React.useEffect(() => {
        let alive = true
        callRemote('panguAdminKeys', 'listRecentMemories')
          .then(unwrap)
          .then((v) => { if (alive) setPubMems(v?.memories || []) })
          .catch(() => {})
        return () => { alive = false }
      }, [])

      if (dashErr && !dash) return h(ErrorState, { text: '无法连接盘古服务(' + dashErr + ')', onRetry })
      if (loading && !dash) {
        return h('div', { className: 'pangu-dashboard-scroll', style: { padding: 22 } },
          h(Skeleton, { w: '100%', h: 70, r: 12 }),
          h(Skeleton, { w: '100%', h: 190, r: 12, style: { marginTop: 14 } }),
          h(Skeleton, { w: '100%', h: 105, r: 12, style: { marginTop: 14 } }),
        )
      }

      const s = dash?.stats
      const degraded = s?.health === 'degraded' || s?.health === 'unreachable' || s?.health === 'unreachable'
      const pipe = s?.pipeline
      const cons = pipe?.consolidation
      const knowledge = dash?.knowledge ?? s?.knowledge
      const snapshots = dash?.snapshots ?? s?.snapshots
      const relTime = (iso) => {
        const t = Date.parse(iso)
        if (!t) return '—'
        const sec = Math.max(0, (Date.now() - t) / 1000)
        if (sec < 3600) return Math.max(1, Math.floor(sec / 60)) + ' 分钟前'
        if (sec < 86400) return Math.floor(sec / 3600) + ' 小时前'
        return Math.floor(sec / 86400) + ' 天前'
      }
      const consLabel = cons?.last_run ? relTime(cons.last_run) : cons ? '从未运行' : '—'
      const sources = Object.entries(dash?.bySource || s?.bySource || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
      /* ── 四个圆环的真实取值 ──
         口径全部写在这里，不留演示数字；缺数据一律 '—' + 空环。 */
      const pct = (num, den) => (Number.isFinite(Number(num)) && Number.isFinite(Number(den)) && Number(den) > 0
        ? Math.round((Number(num) / Number(den)) * 100) : null)
      const ringText = (v) => (v == null ? '—' : String(v))

      // ① 健康：ok=100 / degraded=55 / unreachable=0，其余不算
      const healthPct = s?.health === 'ok' ? 100 : (degraded ? 55 : (s?.health === 'unreachable' ? 0 : null))
      const healthRingText = s?.health ? (s.health === 'ok' ? '100' : degraded ? '55' : '0') : '—'

      // ② 今日摄入：今日条数 / 近 7 日峰值（峰值 0 时不算，避免除零造数）
      const days7 = (s?.dailyCounts || []).slice(-7)
      const todayIntake = days7.length ? fmtNum(days7[days7.length - 1]?.count || 0) : '—'
      const peak7 = days7.length ? Math.max(0, ...days7.map((d) => Number(d.count) || 0)) : 0
      const intakePct = peak7 > 0 ? Math.round(((Number(days7[days7.length - 1]?.count) || 0) / peak7) * 100) : null
      const intakeRingText = intakePct == null ? '—' : String(intakePct)
      const recallsToday = (s?.dailyRecalls || []).slice(-1)[0]?.count
      const recallText = recallsToday != null ? '召回 ' + fmtNum(recallsToday) + ' 次' : '召回未采集'

      // ③ 巩固：已毕业 /（已毕业 + 待验证）—— 即待验证区的毕业率
      const graduated = pipe?.graduated, pending = pipe?.pending_review
      const graduatePct = pct(graduated, (Number(graduated) || 0) + (Number(pending) || 0))
      const graduateRingText = graduatePct == null ? '—' : String(graduatePct)
      const knowledgeFoot = knowledge?.total != null
        ? '知识 ' + fmtNum(knowledge.total) + ' 条' + (knowledge.categories ? ' · ' + Object.keys(knowledge.categories).length + ' 类' : '')
        : (s?.kgRelations != null ? '关系 ' + fmtNum(s.kgRelations) + ' 条' : '实体索引')

      // ④ 快照：有质量分取平均质量 ×100，否则只给份数、不编比例
      const snapList = Array.isArray(snapshots) ? snapshots : []
      const scores = snapList.map((x) => Number(x?.quality_score ?? x?.quality)).filter((x) => Number.isFinite(x))
      const snapshotCount = snapList.length ? fmtNum(snapList.length) : (snapshots?.total != null ? fmtNum(snapshots.total) : '—')
      const snapshotPct = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) : null
      const snapshotRingText = snapshotPct == null ? '—' : String(snapshotPct)
      const wingsText = s?.wings != null ? '分布于 ' + s.wings + ' 翼' : '宫殿结构'

      const statusRow = (label, value, state) => h('div', { className: 'pangu-dashboard-status-row' },
        h('span', { className: 'status-label' }, label),
        state
          ? h('span', { className: 'status-state', style: { color: state === 'warn' ? css.warn : css.ok } }, value)
          : h('span', { className: 'status-value' }, value),
      )

      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 42px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / CONTROL ROOM', title: '概览',
            description: '先看系统是否健康，再看记忆如何流动。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, degraded ? '服务需关注' : '真实服务 · 在线'), h('br'), s?.ts ? '更新于 ' + fmtAgo(s.ts) : '等待下一次刷新'),
          }),
          h('div', { className: 'pangu-dashboard-metrics', style: { marginBottom: 16 } },
            h(V3Kpi, {
              ring: healthPct, ringColor: 'var(--v3-o)', ringValue: healthRingText, ringLabel: '健康',
              label: '记忆总量', value: s?.total != null ? fmtNum(s.total) : '—', unit: '条',
              foot: wingsText,
            }),
            h(V3Kpi, {
              ring: intakePct, ringColor: 'var(--v3-c)', ringValue: intakeRingText, ringLabel: '摄入',
              label: '今日摄入', value: todayIntake, valueClass: 'pangu-dashboard-t-c',
              foot: recallText,
            }),
            h(V3Kpi, {
              ring: graduatePct, ringColor: 'var(--v3-p)', ringValue: graduateRingText, ringLabel: '巩固',
              label: '知识实体', value: s?.kgEntities != null ? fmtNum(s.kgEntities) : '—', unit: '个',
              foot: knowledgeFoot, valueClass: 'pangu-dashboard-t-p',
            }),
            h(V3Kpi, {
              ring: snapshotPct, ringColor: 'var(--v3-y)', ringValue: snapshotRingText, ringLabel: '快照',
              label: '快照质量', value: snapshotCount, unit: '份', valueClass: 'pangu-dashboard-t-y',
              foot: consLabel === '从未运行' ? '尚未运行夜间巩固' : '上次巩固 ' + consLabel,
            }),
          ),
          h('div', { className: 'pangu-dashboard-two' },
            h(DashboardPanel, { title: '记忆脉搏', hint: '7 日 · 摄入与召回' },
              h(PulseChart, { created: s?.dailyCounts, recalled: s?.dailyRecalls }),
            ),
            h(DashboardPanel, { title: '系统状态', hint: '当前运行态' },
              h('div', { className: 'pangu-dashboard-status-list' },
                statusRow('盘古服务', dashErr ? '服务离线' : '已连接', degraded ? 'warn' : 'ok'),
                statusRow('嵌入后端', 'ONNX'),
                statusRow('知识翼', s?.wings != null ? s.wings + ' 个' : '—'),
                statusRow('接入平台', s?.platformsCount != null ? s.platformsCount + ' 个' : '—'),
                statusRow('上次巩固', consLabel),
              ),
              degraded && h('div', { style: { marginTop: 10, border: `1px solid ${css.warn}`, borderRadius: 8, padding: '9px 11px', color: css.t2, background: withAlpha(css.warn, '0d'), fontSize: 10.5, lineHeight: 1.5 } }, '健康状态 ', h('b', null, s?.health), '，请前往管理页检查服务链路。'),
            ),
          ),
          h('div', { style: { marginTop: 14 } },
            h(DashboardPanel, { title: '记忆管线', hint: '准入验证 → 记忆毕业 → 夜间巩固' },
              h('div', { className: 'pangu-dashboard-pipeline' },
                h('div', null, h('small', null, '准入验证'), h('strong', { style: { color: pipe?.pending_review ? css.warn : css.t1 } }, pipe ? fmtNum(pipe.pending_review) : '—'), h('em', null, pipe && pipe.pending_review > 0 ? '召回成功后自动毕业' : '当前无待验证记忆')),
                h('div', null, h('small', null, '记忆毕业'), h('strong', null, pipe ? fmtNum(pipe.graduated) : '—'), h('em', null, '已进入公共只读区')),
                h('div', null, h('small', null, '夜间巩固'), h('strong', { style: { fontSize: 15 } }, consLabel), h('em', null, '窗口 03:00–05:00 · 24h')),
              ),
            ),
          ),
          h('div', { className: 'pangu-dashboard-lower', style: { marginTop: 14 } },
            h(DashboardPanel, {
              title: '最近入库', hint: pubMems.length ? '全库最新 ' + Math.min(5, pubMems.length) + ' 条 · 点击展开全文' : '全库最新记忆',
              bodyStyle: { padding: '3px 15px 5px' },
            }, pubMems.length
              ? pubMems.slice(0, 5).map((m) => h(MemRow, { key: m.id, m }))
              : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'clock', size: 24, color: css.t3 }), h('strong', null, '暂无最近记忆'), h('span', null, '管理凭据可用后，这里会显示真实入库记录。')),
            ),
            h(DashboardPanel, { title: '来源分布', hint: '按平台聚合' }, h(Distribution, { items: sources, total: s?.total || 0, palette: ['var(--v3-o)', 'var(--v3-c)', 'var(--v3-p)', 'var(--v3-y)', 'var(--v3-ok)', 'var(--v3-bad)', 'var(--v3-ink-3)'] })),
            h(DashboardPanel, { title: 'LLM 用量', hint: '当日 token 消耗' },
              (() => {
                const d = s?.llm_daily
                const t = s?.llm_total
                if (!d && !t) return h('div', { className: 'pangu-dashboard-empty' }, h('span', null, '暂无 LLM 使用数据'))
                const tok = (n) => n != null ? (Number(n) >= 1000000 ? (Number(n) / 1000000).toFixed(2) + 'M' : Number(n) >= 1000 ? (Number(n) / 1000).toFixed(1) + 'K' : fmtNum(Number(n))) : '—'
                return h('div', { className: 'pangu-dashboard-status-list' },
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '今日调用'), h('span', { className: 'status-value' }, d?.call_count != null ? fmtNum(d.call_count) : '—')),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '今日 Token'), h('span', { className: 'status-value' }, tok(d?.total_tokens || 0))),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '输入'), h('span', { className: 'status-value' }, tok(d?.prompt_tokens || 0))),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '输出'), h('span', { className: 'status-value' }, tok(d?.completion_tokens || 0))),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '累计 Token'), h('span', { className: 'status-value' }, tok(t?.total_tokens || 0))),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '缓存命中'), h('span', { className: 'status-value' }, t?.cache_hit_rate != null ? Number(t.cache_hit_rate).toFixed(1) + '%' : '—')),
                  h('div', { className: 'pangu-dashboard-status-row' }, h('span', { className: 'status-label' }, '预估成本'), h('span', { className: 'status-value' }, t?.estimated_cost_usd != null ? '$' + Number(t.estimated_cost_usd).toFixed(4) : '—')),
                )
              })(),
            ),
          ),
          h('div', { className: 'pangu-dashboard-foot' }, '数据来自当前盘古远程服务；图表、分布与最近活动不使用静态样例。'),
        ),
      )
    }
    /* ── 3D 星系图谱:Canvas2D 手写透视投影,无第三方依赖 ── */
    /* V3 品牌标识（盘古.svg）：问号造型，实心单路径。
       实心图形没有 fill 时默认纯黑，深色主题下会黑上加黑 —— 必须显式 fill:currentColor。
       容器走中性实色（--v3-surface 随 DSH 深浅切换），实测对比度 浅 5.92:1 / 深 8.95:1。 */
    const BRAND_VIEWBOX = '0 0 628 628'
    const BRAND_PATH = 'M359.108.585c-29.775 2.249-72.938 12.317-150.48 35.13-52.053 15.316-53.874 15.851-68.547 23.134C61.895 97.3 36.19 198.62 86.85 268.987c26.562 37.058 74.009 55.48 118.564 46.162 10.282-2.142 26.348-7.711 73.902-25.598 22.385-8.354 51.731-19.278 65.333-24.205 26.562-9.64 30.953-12.21 36.63-20.671 4.605-6.748 5.998-12.424 5.355-20.993-1.071-15.744-12.317-28.275-27.954-31.167-8.783-1.606-13.817-.214-47.768 12.638-82.042 31.168-114.816 43.163-121.456 44.234-24.099 3.856-47.983-11.888-57.087-37.593-4.07-11.353-4.712-30.096-1.5-42.627 5.891-23.563 20.993-42.2 42.414-52.16 17.78-8.247 136.879-41.02 169.117-46.483 34.273-5.784 61.585-4.713 85.898 3.641 47.554 16.173 78.828 62.87 73.259 109.568-3.428 28.06-14.78 50.446-36.523 71.652-13.388 12.96-31.81 25.384-58.8 39.95-39.95 21.314-58.264 32.345-73.366 43.913-9.64 7.283-29.882 27.311-37.487 37.058-24.74 31.488-39.2 72.08-37.807 105.711.321 9.211.857 11.889 3.213 16.494 11.674 22.385 43.377 24.848 57.086 4.392 3.963-5.891 5.141-10.497 6.855-26.562 4.391-40.593 29.24-74.866 74.544-102.927 5.356-3.213 20.778-11.782 34.274-19.065 38.878-20.778 52.588-29.56 71.973-46.376 18.958-16.172 33.524-34.916 43.806-55.908 27.097-55.801 23.349-121.563-9.746-170.724C504.769 29.396 444.47-.915 377.637.05c-7.497.107-15.851.322-18.529.536M280.173 547.565c-23.67 7.711-35.559 34.595-25.063 56.98 4.284 9.103 10.71 15.744 19.28 20.028 6.532 3.213 7.818 3.427 17.778 3.427 9.64 0 11.246-.321 16.816-3.106 15.958-8.033 26.026-26.24 23.884-43.163-.964-7.818-6.962-19.493-12.96-24.955-7.711-7.069-15.316-10.068-26.133-10.39-5.57-.213-10.925.322-13.602 1.179'

    const GALAXY = {
      R: 260,          // 盘面半径(世界坐标)
      FOV: 900,        // 透视焦距
      SPIN: 0.0022,    // 默认自转角速度(弧度/帧)
    }

    /* 动效策略(补齐 :242 的 CSS 媒体查询在 canvas 侧缺的另一半):
       1) prefers-reduced-motion → 不自转、不逐帧重绘;只在有变化时画一帧。
          此前 reduced-motion 用户看到的仍是一颗持续自转+跑物理的星系,属无障碍缺陷。
       2) 正常模式 → 空闲时节流到 15fps。自转 0.0022 rad/帧 ≈ 7.6°/s,60fps 下
          每帧只转 0.13°,远低于视觉分辨阈,降到 15fps 无可见差异。
       改前无论有没有事都 60fps 重绘:实测用户完全不动时,30 帧仍耗 94–118ms 脚本时间。 */
    const REDUCED_MOTION = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
    const IDLE_FRAME_MS = 1000 / 15

    function galaxyLayout(nCount) {
      // 盘面螺旋分布:y 随半径微降,z 高斯薄盘,旋臂感由随机角+内密外疏产生
      const pts = []
      for (let i = 0; i < nCount; i++) {
        const t = (i + 0.5) / nCount
        const ang = t * Math.PI * 6 + Math.random() * 0.5
        const rad = GALAXY.R * (0.18 + 0.82 * Math.sqrt(Math.random()))
        pts.push({
          x: Math.cos(ang) * rad,
          y: (Math.random() - 0.5) * 34,
          z: Math.sin(ang) * rad,
        })
      }
      return pts
    }

    function GalaxyCanvas({ nodes, edges, matchSet, palette }) {
      const wrapRef = React.useRef(null)
      const canvasRef = React.useRef(null)
      const st = React.useRef({
        nodes: [], edges: [], nm: new Map(), adj: new Map(), dust: [],
        yaw: 0.5, pitch: -0.42, spin: GALAXY.SPIN, zoom: 1,
        dragView: false, dragNode: null, _lx: 0, _ly: 0,
        hover: null, lastHoverId: null, af: 0, dpr: 1, w: 0, h: 0,
        proj: [], pal: null, alpha: 1,
        // dirty=1 表示「这一帧必须画」:物理未收敛,或刚刚发生了交互/尺寸变化。
        // reduced-motion 下它是唯一的重绘开关;正常模式下它让空闲走节流分支。
        dirty: 1, lastPaint: 0, lastT: 0,
      })
      const [tooltip, setTooltip] = React.useState(null)
      const [zoomLabel, setZoomLabel] = React.useState(100)
      const palRef = React.useRef(palette)
      palRef.current = palette
      // Obsidian 式搜索高亮:Set 为命中 id;非命中降暗而非移除
      const matchRef = React.useRef(matchSet)
      matchRef.current = matchSet

      // 数据初始化:盘面布局 + 邻接表 + 星尘
      React.useEffect(() => {
        const s = st.current
        const pts = galaxyLayout(nodes.length)
        s.nodes = (nodes || []).map((n, i) => ({
          ...n,
          x: pts[i].x, y: pts[i].y, z: pts[i].z,
          vx: 0, vy: 0, vz: 0,
          r: Math.min(15, 4.5 + Math.sqrt(n.memory_count || 1) * 1.6),
        }))
        s.nm = new Map(s.nodes.map((n) => [n.id, n]))
        s.edges = edges || []
        s.adj = new Map()
        s.edges.forEach((e) => {
          if (!s.adj.has(e.source)) s.adj.set(e.source, [])
          if (!s.adj.has(e.target)) s.adj.set(e.target, [])
          s.adj.get(e.source).push({ other: e.target, edge: e })
          s.adj.get(e.target).push({ other: e.source, edge: e })
        })
        s.dust = []
        for (let i = 0; i < 260; i++) {
          const ang = Math.random() * Math.PI * 2
          const rad = GALAXY.R * (0.15 + 0.95 * Math.random())
          s.dust.push({
            x: Math.cos(ang) * rad,
            y: (Math.random() - 0.5) * 90,
            z: Math.sin(ang) * rad,
            s: 0.5 + Math.random() * 0.9,
            o: 0.08 + Math.random() * 0.2,
          })
        }
        s.hover = null; s.lastHoverId = null
        setTooltip(null)
        s.alpha = 1
        s.dirty = 1
      }, [nodes, edges])

      React.useEffect(() => {
        const s = st.current, wrap = wrapRef.current, c = canvasRef.current
        if (!wrap || !c) return
        const ctx2 = c.getContext('2d')

        const resize = () => {
          const w = wrap.clientWidth, hh = wrap.clientHeight
          if (!w || !hh) return
          const dpr = Math.min(2, window.devicePixelRatio || 1)
          c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr)
          s.dpr = dpr; s.w = w; s.h = hh
          s.dirty = 1
        }
        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(wrap)

        function project(x, y, z) {
          const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw)
          const x1 = x * cy - z * sy, z1 = x * sy + z * cy
          const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch)
          const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp
          const persp = GALAXY.FOV / (GALAXY.FOV + z2)
          return { sx: s.w / 2 + x1 * persp * s.zoom, sy: s.h / 2 + y2 * persp * s.zoom, persp, depth: z2 }
        }
        // 屏幕位移 → 世界位移(保持相机平面,逆 pitch → 逆 yaw)
        function unprojectDelta(dx, dy) {
          const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw)
          const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch)
          const y1 = dy * cp, z1 = -dy * sp
          return { dx: dx * cy + z1 * sy, dy: y1, dz: -dx * sy + z1 * cy }
        }

        function tick(now) {
          s.af = requestAnimationFrame(tick)
          if (document.hidden || !s.w) return
          // 物理未收敛就必须继续画,否则星团会停在半路上
          if (s.alpha >= 0.015) s.dirty = 1
          if (REDUCED_MOTION) {
            if (!s.dirty) return          // 静止:一帧都不画
          } else {
            const busy = s.dirty || s.dragView || s.dragNode || s.hover
            if (!busy) {
              if (!s.lastPaint) s.lastPaint = now
              if (now - s.lastPaint < IDLE_FRAME_MS) return
            }
          }
          // dirty 是「粘性」标志:画完才清。绝不能在这里用 alpha 把它重算覆盖掉 ——
          // 那样交互(缩放/拖拽/hover)置的 dirty 会在下一帧被 alpha 冲掉,
          // reduced-motion 下表现为「画面冻死、滚轮缩放没反应」。
          s.dirty = 0
          s.lastPaint = now
          const pal = palRef.current
          s.pal = pal

          // 自转按真实时间推进,而不是按帧数:空闲节流到 15fps 后若仍按帧累加,
          // 自转会被悄悄降到 1/4 速度(0.0022×60 ≈ 7.6°/s → 1.9°/s),那是改产品不是省电。
          // dt 上限 0.2s:标签页切回来时不会因为长时间间隔而猛转一圈。
          const dt = s.lastT ? Math.min(0.2, (now - s.lastT) / 1000) : 1 / 60
          s.lastT = now
          // 自转(拖视角时暂停,松手渐复;reduced-motion 下完全不转)
          if (REDUCED_MOTION) s.spin = 0
          else if (!s.dragView && !s.dragNode) s.spin += (GALAXY.SPIN - s.spin) * Math.min(1, dt * 1.2)
          else s.spin = 0
          s.yaw += s.spin * dt * 60

          // 3D 轻力:斥力 + 弹簧 + 向盘心,聚出星团感
          const a = s.alpha
          if (a >= 0.015) {
            const ns = s.nodes
            for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
              const dx = ns[j].x - ns[i].x, dy = ns[j].y - ns[i].y, dz = ns[j].z - ns[i].z
              const d2 = dx * dx + dy * dy + dz * dz || 1
              const d = Math.sqrt(d2)
              const f = (150 / d2) * a
              const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f
              ns[i].vx -= fx; ns[i].vy -= fy; ns[i].vz -= fz
              ns[j].vx += fx; ns[j].vy += fy; ns[j].vz += fz
            }
            s.edges.forEach((e) => {
              const a2 = s.nm.get(e.source), b = s.nm.get(e.target)
              if (!a2 || !b) return
              const dx = b.x - a2.x, dy = b.y - a2.y, dz = b.z - a2.z
              const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
              const f = (d - 70) * 0.005 * a
              a2.vx += (dx / d) * f; a2.vy += (dy / d) * f; a2.vz += (dz / d) * f
              b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; b.vz -= (dz / d) * f
            })
            ns.forEach((n) => {
              n.vx -= n.x * 0.0012 * a; n.vy -= n.y * 0.0012 * a; n.vz -= n.z * 0.0012 * a
              if (n !== s.dragNode) { n.x += n.vx; n.y += n.vy; n.z += n.vz }
              const rad = Math.sqrt(n.x * n.x + n.z * n.z)
              if (rad > GALAXY.R * 1.5) { n.x *= GALAXY.R * 1.5 / rad; n.z *= GALAXY.R * 1.5 / rad }
              n.y = Math.max(-140, Math.min(140, n.y))
              n.vx *= 0.85; n.vy *= 0.85; n.vz *= 0.85
            })
            s.alpha = a * 0.96
          }

          // ── 绘制 ──
          ctx2.setTransform(1, 0, 0, 1, 0, 0)
          ctx2.clearRect(0, 0, c.width, c.height)
          ctx2.setTransform(s.dpr, 0, 0, s.dpr, 0, 0)

          // 星尘(视差背景)
          for (const d0 of s.dust) {
            const p = project(d0.x, d0.y, d0.z)
            if (p.persp <= 0) continue
            ctx2.globalAlpha = d0.o * Math.max(0.2, Math.min(1, 1 - p.depth / (GALAXY.R * 2.2)))
            ctx2.fillStyle = pal.label
            ctx2.beginPath()
            ctx2.arc(p.sx, p.sy, d0.s * p.persp * s.zoom, 0, Math.PI * 2)
            ctx2.fill()
          }
          ctx2.globalAlpha = 1

          // 投影全部节点,按深度从远到近
          const proj = s.nodes.map((n) => ({ n, p: project(n.x, n.y, n.z) }))
          s.proj = proj
          proj.sort((A, B) => B.p.depth - A.p.depth)

          const hover = s.hover
          const neighbors = hover ? new Set(s.adj.get(hover.id)?.map((x) => x.other)) : null
          const isNb = (id) => neighbors && neighbors.has(id)
          const ms = matchRef.current
          const dimmed = (id) => ms && !ms.has(id)
          const depthFade = (d) => Math.max(0.18, Math.min(1, 1 - d / (GALAXY.R * 2.4)))

          if (pal.isDark) ctx2.globalCompositeOperation = 'lighter'

          // 边(id→投影索引,避免逐边线性查找)
          const pmap = new Map(proj.map((P) => [P.n.id, P]))
          s.edges.forEach((e) => {
            const ea = pmap.get(e.source)
            const eb = pmap.get(e.target)
            if (!ea || !eb) return
            const active = hover && (e.source === hover.id || e.target === hover.id)
            const fade = Math.min(depthFade(ea.p.depth), depthFade(eb.p.depth))
            const dim = dimmed(e.source) || dimmed(e.target)
            ctx2.beginPath()
            ctx2.moveTo(ea.p.sx, ea.p.sy)
            ctx2.lineTo(eb.p.sx, eb.p.sy)
            ctx2.strokeStyle = active ? pal.accent : pal.edge
            ctx2.globalAlpha = active ? Math.min(1, fade + 0.35) : fade * 0.55 * (dim ? 0.15 : 1)
            ctx2.lineWidth = active ? 1.6 : 1
            ctx2.stroke()
          })

          // 星点(发光)
          for (const { n, p } of proj) {
            if (p.persp <= 0) continue
            const color = typeColor(n.type, pal.isDark)
            const fade = depthFade(p.depth)
            const dim = dimmed(n.id) ? 0.12 : 1
            const rr = Math.max(1.2, n.r * p.persp * s.zoom)
            const active = hover && (hover.id === n.id || isNb(n.id))
            const glow = rr * (pal.isDark ? 3 : 2.2)
            const g = ctx2.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, glow)
            g.addColorStop(0, color)
            g.addColorStop(0.35, withAlpha(color, pal.isDark ? '66' : '55'))
            g.addColorStop(1, withAlpha(color, '00'))
            ctx2.globalAlpha = (active ? 1 : 0.85) * fade * dim
            ctx2.fillStyle = g
            ctx2.beginPath()
            ctx2.arc(p.sx, p.sy, glow, 0, Math.PI * 2)
            ctx2.fill()
            ctx2.globalAlpha = fade * dim
            ctx2.fillStyle = pal.isDark ? '#ffffff' : color
            ctx2.beginPath()
            ctx2.arc(p.sx, p.sy, Math.max(1, rr * 0.45), 0, Math.PI * 2)
            ctx2.fill()
            if (hover && hover.id === n.id) {
              ctx2.globalAlpha = 1
              ctx2.strokeStyle = pal.accent
              ctx2.lineWidth = 1.6
              ctx2.beginPath()
              ctx2.arc(p.sx, p.sy, rr + 4, 0, Math.PI * 2)
              ctx2.stroke()
            }
          }
          ctx2.globalCompositeOperation = 'source-over'
          ctx2.globalAlpha = 1

          // 标签(hover 邻接或少量节点)
          const showLabels = s.nodes.length <= 46 || hover
          if (showLabels) {
            ctx2.font = '10px system-ui'
            ctx2.textAlign = 'center'
            for (const { n, p } of proj) {
              const active = hover && (hover.id === n.id || isNb(n.id))
              if (dimmed(n.id) && !active) continue
              if (!active && !showLabels) continue
              if (!active && p.depth > GALAXY.R * 1.4) continue
              ctx2.globalAlpha = active ? 0.95 : depthFade(p.depth) * 0.8
              ctx2.fillStyle = pal.label
              const name = String(n.name || n.id)
              ctx2.fillText(name.length > 10 ? name.slice(0, 10) + '…' : name, p.sx, p.sy + Math.max(6, n.r * p.persp * s.zoom) + 11)
            }
            ctx2.globalAlpha = 1
          }
        }
        if (!s.af) s.af = requestAnimationFrame(tick)

        const hit = (mx, my) => {
          let best = null, bestD = 1e9
          for (const { n, p } of s.proj) {
            const d2 = (mx - p.sx) ** 2 + (my - p.sy) ** 2
            const hitR = (n.r * p.persp * s.zoom + 5) ** 2
            if (d2 <= hitR && d2 < bestD) { best = n; bestD = d2 }
          }
          return best
        }

        const dn = (e) => {
          const n = hit(e.offsetX, e.offsetY)
          s.dirty = 1
          if (n) { s.dragNode = n; s._lx = e.offsetX; s._ly = e.offsetY }
          else { s.dragView = true; s._lx = e.offsetX; s._ly = e.offsetY }
        }
        const up = () => { s.dragView = false; s.dragNode = null; s.dirty = 1 }
        // 指针离开画布必须同时清 hover:此前 mouseleave 复用 up() 只清拖拽态,
        // 高亮与浮层会留在原地。更要紧的是 hover 非空会把渲染循环钉在满帧
        // (见 tick 的 busy 判据),指针移开后星系就再也不会回到节流态。
        const leave = () => {
          s.dragView = false; s.dragNode = null
          s.hover = null; s.lastHoverId = null
          s.dirty = 1
          c.style.cursor = 'grab'
          setTooltip(null)
        }
        const mv = (e) => {
          const dx = e.offsetX - s._lx, dy = e.offsetY - s._ly
          if (s.dragNode) {
            const wv = unprojectDelta(dx / s.zoom, dy / s.zoom)
            s.dragNode.x += wv.dx; s.dragNode.y += wv.dy; s.dragNode.z += wv.dz
            s.dragNode.vx = s.dragNode.vy = s.dragNode.vz = 0
            s._lx = e.offsetX; s._ly = e.offsetY
            s.dirty = 1
            const p = project(s.dragNode.x, s.dragNode.y, s.dragNode.z)
            setTooltip((tp) => (tp ? { ...tp, x: p.sx, y: p.sy } : tp))
          } else if (s.dragView) {
            s.yaw += dx * 0.005
            s.pitch = Math.max(-1.35, Math.min(1.35, s.pitch + dy * 0.004))
            s._lx = e.offsetX; s._ly = e.offsetY
            s.dirty = 1
          } else {
            const n = hit(e.offsetX, e.offsetY)
            if ((n && n.id) !== s.lastHoverId) {
              s.lastHoverId = n ? n.id : null
              s.hover = n
              s.dirty = 1                 // hover 高亮要立刻重绘(reduced-motion 下唯一的重绘来源)
              c.style.cursor = n ? 'pointer' : 'grab'
              setTooltip(n ? { x: e.offsetX, y: e.offsetY, node: n } : null)
            } else if (n) {
              setTooltip((tp) => (tp ? { ...tp, x: e.offsetX, y: e.offsetY } : tp))
            }
          }
        }
        const wh = (e) => {
          e.preventDefault()
          s.zoom = Math.min(2.6, Math.max(0.35, s.zoom * (e.deltaY > 0 ? 0.9 : 1.1)))
          s.dirty = 1
          setZoomLabel(Math.round(s.zoom * 100))
        }
        const reset = () => {
          s.yaw = 0.5; s.pitch = -0.42; s.zoom = 1; s.alpha = 1
          s.dirty = 1
          setZoomLabel(100)
        }
        st.current._reset = reset

        c.addEventListener('mousedown', dn)
        c.addEventListener('mouseup', up)
        c.addEventListener('mouseleave', leave)
        c.addEventListener('mousemove', mv)
        c.addEventListener('wheel', wh, { passive: false })
        c.addEventListener('dblclick', reset)
        c.style.cursor = 'grab'
        return () => {
          ro.disconnect()
          if (s.af) cancelAnimationFrame(s.af); s.af = 0
          c.removeEventListener('mousedown', dn)
          c.removeEventListener('mouseup', up)
          c.removeEventListener('mouseleave', leave)
          c.removeEventListener('mousemove', mv)
          c.removeEventListener('wheel', wh)
          c.removeEventListener('dblclick', reset)
        }
      }, [])

      const tp = tooltip
      const connCount = tp ? (st.current.adj.get(tp.node.id)?.length || 0) : 0
      return h('div', { ref: wrapRef, style: { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: palRef.current && palRef.current.isDark ? 'transparent' : 'transparent' } },
        h('canvas', { ref: canvasRef, style: { width: '100%', height: '100%', display: 'block' } }),
        tp && h('div', { style: { position: 'absolute', left: Math.max(6, Math.min(tp.x + 14, (st.current.w || 300) - 244)), top: Math.max(6, Math.min(tp.y + 14, (st.current.h || 200) - 130)), width: 230, background: css.bg1, border: `1px solid ${css.border}`, borderRadius: 10, boxShadow: css.shadow, padding: '10px 12px', pointerEvents: 'none', animation: 'panguFade .15s ease', zIndex: 5 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 } },
            h('span', { style: { fontSize: 12.5, fontWeight: 600, color: css.t1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tp.node.name || tp.node.id),
            h(TypeChip, { type: tp.node.type }),
          ),
          tp.node.description && h('div', { style: { fontSize: 11, color: css.t2, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 5 } }, tp.node.description),
          h('div', { style: { fontSize: 10.5, color: css.t3 } },
            [tp.node.memory_count ? '关联记忆 ' + tp.node.memory_count + ' 条' : null, '连接 ' + connCount + ' 条'].filter(Boolean).join(' · '),
          ),
        ),
        h('div', { style: { position: 'absolute', right: 12, bottom: 10, display: 'flex', alignItems: 'center', gap: 6, zIndex: 4 } },
          h('span', { style: { fontSize: 10.5, color: css.t3, fontVariantNumeric: 'tabular-nums', background: css.bg1, border: `1px solid ${css.borderSoft}`, borderRadius: 6, padding: '3px 7px' } }, zoomLabel + '%'),
          h('button', { className: 'pangu-btn', onClick: () => st.current._reset && st.current._reset(), title: '重置视角(双击画布同效)', style: { fontSize: 10.5, color: css.t2, background: css.bg1, border: `1px solid ${css.borderSoft}`, borderRadius: 6, padding: '3px 8px', cursor: 'pointer' } }, '重置'),
        ),
        h('div', { style: { position: 'absolute', left: 12, bottom: 10, fontSize: 10, color: css.t3, background: css.bg1, border: `1px solid ${css.borderSoft}`, borderRadius: 6, padding: '3px 8px', zIndex: 4, display: 'inline-flex', alignItems: 'center', gap: 5 } },
          h('span', { style: { width: 6, height: 6, borderRadius: 2, background: 'var(--v3-o)' } }),
          '拖拽旋转 · 滚轮缩放 · 双击重置',
        ),
      )
    }

    function GraphPane({ nodes, edges, matchSet, search, onSearch, typeFilter, onTypeFilter, totalCount, kgErr, loading, onRetry }) {
      const palette = useCanvasPalette()
      const types = [...new Set(nodes.map((n) => n.type || 'default'))].slice(0, 8)
      if (kgErr && !nodes.length) return h(ErrorState, { text: '图谱加载失败(' + kgErr + ')', onRetry })
      if (loading && !nodes.length) return h('div', { className: 'pangu-dashboard-scroll', style: { padding: 22 } }, h(Skeleton, { w: '100%', h: '92%', r: 12 }))
      if (!nodes.length) return h(ErrorState, { text: '暂无图谱数据' })
      const matchCount = matchSet ? matchSet.size : nodes.length
      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 36px' } },
        h('section', { className: 'pangu-dashboard-view pangu-dashboard-view--fill' },
          h(ViewHeader, {
            kicker: 'PANGU / GALAXY', title: '星系',
            description: '把实体和关系当作一张可探索的地图。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, fmtNum(nodes.length) + ' 实体 · ' + fmtNum(edges.length) + ' 关系'), h('br'), '搜索会降暗未命中节点，不移除图谱'),
          }),
          h('div', { className: 'pangu-dashboard-controls' },
            h('label', { className: 'pangu-dashboard-search' }, h(Icon, { name: 'search', size: 13, color: css.t3 }), h('input', { value: search, onChange: (e) => onSearch(e.target.value), placeholder: '搜索实体、类型或描述…', 'aria-label': '搜索图谱实体' })),
            h('select', { className: 'pangu-dashboard-select', value: typeFilter, onChange: (e) => onTypeFilter(e.target.value), 'aria-label': '筛选图谱实体类型' },
              h('option', { value: '' }, '全部类型'),
              types.map((tp) => h('option', { key: tp, value: tp }, typeLabel(tp))),
            ),
            (search || typeFilter) && h(DashboardButton, { onClick: () => { onSearch(''); onTypeFilter('') } }, '重置筛选'),
            h('span', { style: { marginLeft: 'auto', color: css.t3, fontSize: 10 } }, '命中 ' + matchCount + ' / ' + totalCount),
          ),
          h('div', { className: 'pangu-dashboard-panel', style: { position: 'relative', flex: '1 1 0', minHeight: 240, background: 'var(--v3-surface)' } },
            h(GalaxyCanvas, { nodes, edges, matchSet, palette }),
            h('div', { style: { position: 'absolute', left: 12, top: 10, zIndex: 4, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', maxWidth: '68%', border: `1px solid ${css.borderSoft}`, borderRadius: 8, padding: '6px 9px', background: css.bg1 } },
              types.map((tp) => h('span', { key: tp, style: { display: 'inline-flex', alignItems: 'center', gap: 4, color: css.t3, fontSize: 9.5 } },
                h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: typeColor(tp), boxShadow: `0 0 5px ${withAlpha(typeColor(tp), '88')}` } }),
                typeLabel(tp),
              )),
            ),
          ),
          h('div', { className: 'pangu-dashboard-foot' }, '交互沿用真实 GalaxyCanvas：拖拽节点或视角、滚轮缩放、双击或按钮重置。'),
        ),
      )
    }

    // rawCount 已随客户端去重一起移除（2026-09-26）：原用于「本次返回 N 条 / 去重后 M 条」，
    // 但 nodes 是筛选后的结果，那句话在搜索时会把筛选说成去重。
    function CrystalPane({ nodes, edges, search, onSearch, typeFilter, onTypeFilter, kgErr, loading, onRetry }) {
      const [selectedId, setSelectedId] = React.useState(null)
      const types = React.useMemo(() => {
        const counts = new Map()
        for (const n of nodes) { const type = n.type || 'default'; counts.set(type, (counts.get(type) || 0) + 1) }
        return [...counts.entries()].sort((a, b) => b[1] - a[1])
      }, [nodes])
      const relationCounts = React.useMemo(() => {
        const counts = new Map()
        for (const edge of edges) { const relation = edge.relation || edge.predicate || edge.type || '关联'; counts.set(relation, (counts.get(relation) || 0) + 1) }
        return [...counts.entries()].sort((a, b) => b[1] - a[1])
      }, [edges])
      /* 分页：33 个实体一次铺开是 2248px 长列表，视口才 1000px，用户要滚很久。
         每页 12 条，搜索/类型筛选变化时回到第 1 页（否则会停在空白页上）。 */
      const PAGE_SIZE = 12
      const [page, setPage] = React.useState(0)
      const pageCount = Math.max(1, Math.ceil(nodes.length / PAGE_SIZE))
      const pageSafe = Math.min(page, pageCount - 1)
      const pageNodes = nodes.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE)
      React.useEffect(() => { setPage(0) }, [search, typeFilter, nodes.length])

      const selected = nodes.find((node) => node.id === selectedId) || nodes[0]
      const selectedRelations = selected ? edges.filter((edge) => (edge.subject_id || edge.source) === selected.id || (edge.object_id || edge.target) === selected.id) : []
      React.useEffect(() => {
        if (selected && selectedId !== selected.id && nodes.length) setSelectedId(selected.id)
      }, [selectedId, selected, nodes.length])

      if (kgErr && !nodes.length) return h(ErrorState, { text: '图谱加载失败(' + kgErr + ')', onRetry })
      if (loading && !nodes.length) return h('div', { className: 'pangu-dashboard-scroll', style: { padding: 22 } }, h(Skeleton, { w: '100%', h: '78%', r: 12 }))

      const relationLabel = (edge) => {
        const source = (edge.subject_id || edge.source) === selected.id ? (edge.object_id || edge.target) : (edge.subject_id || edge.source)
        const name = nodes.find((node) => node.id === source)?.name || source
        return (edge.relation || edge.predicate || edge.type || '关联') + ' · ' + name
      }

      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 36px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / CRYSTAL', title: '结晶',
            description: '把图谱实体变成可检索、可解释的知识索引。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, fmtNum(nodes.length) + ' 实体 · ' + fmtNum(edges.length) + ' 关系'), h('br'), '每页 ' + PAGE_SIZE + ' 条 · 完整描述放进右侧详情'),
          }),
          h('div', { className: 'pangu-dashboard-controls' },
            h('label', { className: 'pangu-dashboard-search' }, h(Icon, { name: 'search', size: 13, color: css.t3 }), h('input', { value: search, onChange: (e) => onSearch(e.target.value), placeholder: '搜索实体、类型或描述…', 'aria-label': '搜索知识结晶实体' })),
            h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
              h('button', { className: 'pangu-dashboard-chip', 'data-active': !typeFilter ? 'true' : undefined, onClick: () => onTypeFilter('') }, '全部'),
              types.map(([type, count]) => h('button', { key: type, className: 'pangu-dashboard-chip', 'data-active': typeFilter === type ? 'true' : undefined, onClick: () => onTypeFilter(typeFilter === type ? '' : type) }, typeLabel(type), ' ', String(count))),
            ),
            (search || typeFilter) && h(DashboardButton, { onClick: () => { onSearch(''); onTypeFilter('') } }, '重置'),
          ),
          nodes.length
            ? h('div', { className: 'pangu-dashboard-list-detail' },
                h('div', { className: 'pangu-dashboard-panel' },
                  h('div', { className: 'pangu-dashboard-entity-head' }, h('span', null, '实体'), h('span', null, '类型'), h('span', null, '记忆'), h('span', null, '连接')),
                  pageNodes.map((node) => {
                    const color = typeColorCss(node.type)
                    const relationCount = edges.filter((edge) => (edge.subject_id || edge.source) === node.id || (edge.object_id || edge.target) === node.id).length
                    return h('button', {
                      key: node.id, className: 'pangu-dashboard-row pangu-dashboard-entity-row', 'data-selected': selected?.id === node.id ? 'true' : undefined,
                      onClick: () => setSelectedId(node.id), type: 'button',
                    },
                      h('span', { className: 'pangu-dashboard-entity-name' }, h('i', { style: { background: color } }), h('b', null, node.name || node.id)),
                      h('span', null, typeLabel(node.type)),
                      h('span', null, fmtNum(node.memory_count || 0) + ' 条'),
                      h('span', null, relationCount + ' 条关系'),
                    )
                  }),
                  pageCount > 1 && h('div', { className: 'pangu-dashboard-pager' },
                    h('button', {
                      className: 'pangu-dashboard-button', disabled: pageSafe === 0,
                      onClick: () => setPage(Math.max(0, pageSafe - 1)), type: 'button',
                    }, '上一页'),
                    h('span', { className: 'pangu-dashboard-pager-info' },
                      '第 ', h('b', null, String(pageSafe + 1)), ' / ', String(pageCount), ' 页 · 共 ', String(nodes.length), ' 个实体'),
                    h('div', { className: 'pangu-dashboard-pager-nums' },
                      Array.from({ length: pageCount }, (_, i) => h('button', {
                        key: i, className: 'pangu-dashboard-button', 'data-active': i === pageSafe ? 'true' : undefined,
                        onClick: () => setPage(i), type: 'button',
                        'aria-label': '第 ' + (i + 1) + ' 页', 'aria-current': i === pageSafe ? 'page' : undefined,
                      }, String(i + 1))),
                    ),
                    h('button', {
                      className: 'pangu-dashboard-button', disabled: pageSafe >= pageCount - 1,
                      onClick: () => setPage(Math.min(pageCount - 1, pageSafe + 1)), type: 'button',
                    }, '下一页'),
                  ),
                ),
                h(DashboardPanel, { className: 'pangu-dashboard-detail' },
                  selected && h(React.Fragment, null,
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: css.t3, fontSize: 10 } }, h('span', { style: { width: 8, height: 8, borderRadius: 2, background: typeColorCss(selected.type) } }), typeLabel(selected.type), ' · 实体详情'),
                    h('h3', null, selected.name || selected.id),
                    h('p', null, selected.description || '该实体暂无描述；可回到星系视图查看它在关系图中的位置。'),
                    h('div', { className: 'pangu-dashboard-kv' },
                      h('div', null, h('small', null, '关联记忆'), h('b', null, fmtNum(selected.memory_count || 0))),
                      h('div', null, h('small', null, '连接关系'), h('b', null, String(selectedRelations.length))),
                    ),
                    h('div', { style: { marginTop: 13, marginBottom: 7, color: css.t3, fontSize: 9.5, letterSpacing: '.08em' } }, '关系摘要'),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, selectedRelations.length ? selectedRelations.slice(0, 8).map((edge, i) => h('div', { key: i, style: { padding: '6px 8px', border: '1px solid var(--v3-line)', borderRadius: 'var(--v3-r-sm)', color: 'var(--v3-ink-2)', fontSize: 10.5 } }, h('b', { style: { color: 'var(--v3-o-ink)' } }, edge.relation || edge.predicate || edge.type || '关联'), ' · ', relationLabel(edge).split(' · ').slice(1).join(' · '))) : h('div', { style: { color: css.t3, fontSize: 10.5 } }, '暂无关系')),
                    h('div', { className: 'pangu-dashboard-tip' }, h('b', null, '索引与图谱同源'), h('br'), '类型色沿用星系视图；筛选不会生成或删除实体。')),
                ),
              )
            : h(DashboardPanel, {}, h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'search', size: 26, color: css.t3 }), h('strong', null, '没有匹配的实体'), h('span', null, '换个关键词或类型；重置后恢复完整索引。'))),
          h('div', { className: 'pangu-dashboard-foot' },
            // 2026-09-26：原先这里有一句「本次返回 N 条实体，按 id 去重后为 M 条」。
            // 它有两个问题，随客户端去重一起停用：① 客户端已不再去重，这句话会变成谎话；
            // ② nodes 传进来的是**筛选后**的 filteredNodes，用户一搜索或选类型，
            //    N≠M 就会触发，于是把「筛选掉了几个」报成「去重合并了几个」。
            // 服务端的合并结果现在由 /api/v2/graph 保证，这里不再复述计数。
            '关系类型：' + (relationCounts.length ? relationCounts.slice(0, 5).map(([name, count]) => name + ' ×' + count).join(' · ') : '暂无关系数据'),
          ),
        ),
      )
    }

    /* ── 知识库页 KnowledgePane：知识浏览 / 搜索 / 分类 ── */
    /* 知识分类：提到模块作用域，memo 化的行组件才能自包含 ——
       若留在 KnowledgePane 里，每次 render 都产出新对象引用，React.memo 会全部失效。 */
    const CAT_LABELS = { best_practice: '最佳实践', solution: '解决方案', guide: '使用指南', insight: '洞察发现', other: '其他' }
    const CAT_COLORS = { best_practice: 'var(--v3-o)', solution: 'var(--v3-c)', guide: 'var(--v3-p)', insight: 'var(--v3-y)', other: 'var(--v3-ink-3)' }
    const kbDate = (entry) => String(entry.updated_at || entry.created_at || '').slice(0, 10) || '—'

    /* 知识行：React.memo + 稳定回调 → 上下键换选中时，只有「原当前行 / 新当前行」
       两行会重渲染，列表 DOM 不重建，动的只是右侧面板内容。
       传内联箭头函数会让 memo 永久失效，所以这里只传稳定的 onPick(id)。 */
    const KnowledgeRow = React.memo(function KnowledgeRow({ entry, current, onPick }) {
      const color = CAT_COLORS[entry.category] || 'var(--v3-ink-3)'
      return h('button', {
        className: 'pangu-dashboard-row',
        role: 'option', 'aria-selected': current ? 'true' : 'false',
        'data-current': current ? 'true' : undefined,
        onClick: () => onPick(entry.id), type: 'button',
        style: { display: 'block', width: '100%', padding: '11px 12px', borderBottom: 0, borderRadius: 'var(--v3-r-md)' },
      },
        h('span', {
          style: { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 13.5, fontWeight: 640, letterSpacing: '-.014em', lineHeight: 1.35, color: 'var(--v3-ink-1)', textAlign: 'left', marginBottom: 5 },
        }, entry.title),
        h('span', { style: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--v3-ink-3)' } },
          h('i', { style: { width: 6, height: 6, borderRadius: 2, background: color, flex: '0 0 auto' } }),
          h('b', { style: { color, fontWeight: 600 } }, CAT_LABELS[entry.category] || entry.category),
          h('span', { style: { color: 'var(--v3-line-2)' } }, '·'),
          h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, '置信 ' + Number(entry.confidence || 0).toFixed(0)),
          h('span', { style: { color: 'var(--v3-line-2)' } }, '·'),
          kbDate(entry),
        ),
      )
    })

    function KnowledgePane() {
      const [entries, setEntries] = React.useState([])
      const [stats, setStats] = React.useState(null)
      const [category, setCategory] = React.useState('')
      const [query, setQuery] = React.useState('')
      const [loading, setLoading] = React.useState(true)
      const [selectedId, setSelectedId] = React.useState(null)
      const [error, setError] = React.useState('')
      const listRef = React.useRef(null)
      // onPick 必须稳定引用，否则 KnowledgeRow 的 memo 全部失效
      const pick = React.useCallback((id) => setSelectedId(id), [])

      const load = React.useCallback(async () => {
        setLoading(true)
        setError('')
        const [listResult, statsResult] = await Promise.allSettled([
          callRemote('panguKnowledge', 'list', { category }).then(unwrap),
          callRemote('panguKnowledge', 'stats').then(unwrap),
        ])
        if (listResult.status === 'fulfilled') setEntries(listResult.value?.knowledge || [])
        if (statsResult.status === 'fulfilled') setStats(statsResult.value)
        const failed = [listResult, statsResult].find((result) => result.status === 'rejected')
        if (failed) setError(String(failed.reason?.message || failed.reason || '知识库加载失败'))
        setLoading(false)
      }, [category])
      React.useEffect(() => { load() }, [load])

      const doSearch = async () => {
        if (!query.trim()) { load(); return }
        setLoading(true)
        setError('')
        try {
          const result = unwrap(await callRemote('panguKnowledge', 'search', { query: query.trim() }))
          setEntries(result?.knowledge || [])
        } catch (e) {
          setError(String(e?.message || e || '知识搜索失败'))
        }
        setLoading(false)
      }

      const categories = stats?.categories || {}
      const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1])
      const selected = entries.find((entry) => entry.id === selectedId) || null
      // 不再截断：V3 的主从布局让左栏自己滚，截断反而让用户以为只有 6 条
      const shown = entries
      /* 键盘上下切换：只改 selectedId，列表 DOM 不重建，动的只有右侧面板。
         键位与 listbox 惯例一致：↑↓ 移动、Home/End 跳首尾、Esc 收起抽屉。 */
      const onListKeyDown = (e) => {
        if (e.key === 'Escape') { setSelectedId(null); return }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
        e.preventDefault()
        if (!shown.length) return
        const i = shown.findIndex((x) => x.id === selectedId)
        let next
        if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = shown.length - 1
        else if (i < 0) next = 0
        else next = Math.min(shown.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))
        setSelectedId(shown[next].id)
      }
      // 当前行滚进可视区（键盘连续下移时不能跑出视野）
      React.useEffect(() => {
        if (!selectedId || !listRef.current) return
        const el = listRef.current.querySelector('[data-current="true"]')
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
      }, [selectedId, shown.length])

      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 36px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / KNOWLEDGE', title: '知识',
            description: '先找到值得复用的结论，再展开完整背景。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, '真实知识库 ' + fmtNum(stats?.total || 0) + ' 条'), h('br'), query.trim() ? '搜索结果 ' + entries.length + ' 条' : (category ? '当前分类 ' + catEntries.find(([c]) => c === category)?.[1] + ' 条' : '全部 ' + fmtNum(stats?.total || 0) + ' 条')),
          }),
          h('div', { className: 'pangu-dashboard-controls' },
            h('label', { className: 'pangu-dashboard-search' }, h(Icon, { name: 'search', size: 13, color: css.t3 }), h('input', { value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') doSearch() }, placeholder: '搜索标题、摘要或标签…', 'aria-label': '搜索知识库' })),
            h(DashboardButton, { icon: 'search', primary: true, onClick: doSearch, disabled: loading }, '搜索'),
            query.trim() && h(DashboardButton, { onClick: () => { setQuery(''); setSelectedId(null); load() } }, '清除搜索'),
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8, marginBottom: 14 } },
            h('button', {
              className: 'pangu-dashboard-metric', 'aria-pressed': category === '' ? 'true' : undefined,
              onClick: () => { setCategory(''); setSelectedId(null); setQuery('') }, type: 'button',
              style: { padding: '11px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: 0, borderRadius: 'var(--v3-r-md)', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' },
            },
              h('span', { style: { display: 'flex', alignItems: 'baseline', gap: 7 } },
                h('b', { style: { fontSize: 19, fontWeight: 700, letterSpacing: '-.032em', lineHeight: 1 } }, String(stats?.total || 0)),
                h('span', { style: { fontSize: 11.5, color: 'var(--v3-ink-2)' } }, '全部'),
              ),
            ),
            catEntries.map(([cat, count]) => h('button', {
              key: cat, className: 'pangu-dashboard-metric', 'aria-pressed': category === cat ? 'true' : undefined,
              onClick: () => { setCategory(category === cat ? '' : cat); setSelectedId(null); setQuery('') }, type: 'button',
              style: { padding: '11px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: 0, borderRadius: 'var(--v3-r-md)', textAlign: 'left', cursor: 'pointer', font: 'inherit', color: 'inherit' },
            },
              h('span', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
                h('i', { style: { width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[cat] || 'var(--v3-ink-3)' } }),
                h('b', { style: { fontSize: 19, fontWeight: 700, letterSpacing: '-.032em', lineHeight: 1, color: CAT_COLORS[cat] || 'var(--v3-ink-1)' } }, String(count)),
                h('span', { style: { fontSize: 11.5, color: 'var(--v3-ink-2)' } }, CAT_LABELS[cat] || cat),
              ),
            )),
          ),
          error && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, border: `1px solid ${css.warn}`, borderRadius: 8, padding: '8px 11px', background: withAlpha(css.warn, '0d'), color: css.t2, fontSize: 10.5 } }, h(Icon, { name: 'alert', size: 13, color: css.warn }), h('span', { style: { flex: 1 } }, error), h(DashboardButton, { onClick: load }, '重试')),
          loading
            ? h('div', { className: 'pangu-dashboard-panel' }, [0, 1, 2, 3, 4, 5].map((i) => h(Skeleton, { key: i, w: '100%', h: 58, r: 0, style: { marginBottom: 1 } })))
            : shown.length
              ? h('div', { className: 'pangu-dashboard-master', 'data-drawer': selected ? 'open' : 'closed' },
                  h('div', { className: 'pangu-dashboard-list-col' },
                    h('div', { className: 'pangu-dashboard-list-head' },
                      h('span', null, '知识条目'),
                      h('span', { style: { marginLeft: 'auto' } }, String(shown.length) + ' 条 · ↑↓ 切换'),
                    ),
                    h('div', {
                      className: 'pangu-dashboard-scroll pangu-dashboard-listbox',
                      ref: listRef, role: 'listbox', tabIndex: 0,
                      'aria-label': '知识条目列表，上下方向键切换',
                      onKeyDown: onListKeyDown,
                    },
                      shown.map((entry) => h(KnowledgeRow, {
                        key: entry.id, entry,
                        current: entry.id === selectedId,
                        onPick: pick,
                      })),
                    ),
                  ),
                  h('div', { className: 'pangu-dashboard-drawer' },
                    h(DashboardPanel, { className: 'pangu-dashboard-detail', bodyStyle: { padding: '18px 20px 20px' } },
                    selected
                      ? h(React.Fragment, null,
                          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 } },
                            h('div', { style: { flex: 1, minWidth: 0 } },
                              h('h3', { style: { marginBottom: 0 } }, selected.title),
                            ),
                            h('span', {
                              style: { display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none', height: 26, padding: '0 10px', border: '1px solid var(--v3-line-2)', borderRadius: 'var(--v3-r-pill)', background: 'var(--v3-hi)', color: 'var(--v3-ink-2)', fontSize: 11, fontWeight: 620, whiteSpace: 'nowrap' },
                            },
                              h('i', { style: { width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[selected.category] || 'var(--v3-ink-3)' } }),
                              CAT_LABELS[selected.category] || selected.category,
                            ),
                            h('button', {
                              onClick: () => setSelectedId(null), type: 'button',
                              'aria-label': '关闭详情',
                              title: '关闭（Esc）',
                              style: { flex: 'none', display: 'grid', placeItems: 'center', width: 28, height: 28, border: '1px solid var(--v3-line)', borderRadius: 'var(--v3-r-sm)', background: 'var(--v3-surface)', color: 'var(--v3-ink-2)', fontSize: 15, lineHeight: 1, cursor: 'pointer' },
                            }, '×'),
                          ),
                          selected.summary && h('div', {
                            style: { padding: '14px 16px', borderRadius: 'var(--v3-r-lg)', background: 'var(--v3-well)', marginBottom: 16, fontSize: 14, lineHeight: 1.66, color: 'var(--v3-ink-1)' },
                          }, selected.summary),
                          h('p', { style: { whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.78, color: 'var(--v3-ink-2)' } }, selected.content || '暂无正文'),
                          h('div', { className: 'pangu-dashboard-kv', style: { marginTop: 16 } },
                            h('div', null, h('small', null, '生成置信度'), h('b', null, Number(selected.confidence || 0).toFixed(0) + '%')),
                            h('div', null, h('small', null, '来源记忆'), h('b', null, String((selected.source_memories || []).length))),
                            h('div', null, h('small', null, '使用次数'), h('b', null, String(selected.usage_count || 0))),
                          ),
                          (selected.tags || []).length > 0 && h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 16 } }, selected.tags.map((tag) => h('span', {
                            key: tag, style: { fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--v3-r-pill)', background: 'var(--v3-well)', color: 'var(--v3-ink-3)', border: '1px solid var(--v3-line)' },
                          }, tag))),
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 16, fontSize: 12, color: 'var(--v3-ink-3)' } },
                            h('span', null, '更新于 ', h('b', { style: { color: 'var(--v3-ink-1)', fontWeight: 640 } }, kbDate(selected))),
                          ),
                          h('div', { className: 'pangu-dashboard-tip' }, h('b', null, '来源与版本'), h('br'), '当前详情完全来自远程知识库返回字段，不补写或生成额外内容。'),
                        )
                      : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'layers', size: 26 }), h('strong', null, '选择一条知识'), h('span', null, '点左侧任意条目，详情会从右侧滑出。')),
                  ),
                    ),
                  )
              : h(DashboardPanel, {}, h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'search', size: 28, color: css.t3 }), h('strong', null, query.trim() ? '没有匹配的知识' : '知识库暂无内容'), h('span', null, query.trim() ? '换个关键词，或清除搜索恢复分类列表。' : '盘古会从记忆中自动提取知识。'))),
          h('div', { className: 'pangu-dashboard-foot' }, '分类计数与条目正文均来自 panguKnowledge.stats / list / search；点行后详情从右侧滑出，列表压窄但保持可见，↑↓ 可切换当前条目。'),
        ),
      )
    }

    /* ── 管理页 AdminPane：体检 / 平台 / 快照 ── */
    function AdminPane({ initialSection, config }) {
      const [deep, setDeep] = React.useState(null)
      const [backup, setBackup] = React.useState({ status: 'idle', message: '' })
      const [platforms, setPlatforms] = React.useState([])
      const [pending, setPending] = React.useState([])
      const [snapshots, setSnapshots] = React.useState([])
      const [snapshotTotal, setSnapshotTotal] = React.useState(null)
      const [loading, setLoading] = React.useState(true)
      const [adminError, setAdminError] = React.useState('')
      const [activeSection, setActiveSection] = React.useState(initialSection || 'health')

      React.useEffect(() => { if (initialSection) setActiveSection(initialSection) }, [initialSection])

      const load = React.useCallback(async () => {
        setLoading(true)
        const [healthResult, platformResult, pendingResult, dashboardResult] = await Promise.allSettled([
          callRemote('panguDashboard', 'deepHealth').then(unwrap),
          callRemote('panguPlatforms', 'listPlatforms').then(unwrap),
          callRemote('panguPlatforms', 'listPending').then(unwrap),
          callRemote('panguDashboard', 'data').then(unwrap),
        ])
        if (healthResult.status === 'fulfilled') setDeep(healthResult.value)
        if (platformResult.status === 'fulfilled') setPlatforms(platformResult.value?.platforms || [])
        if (pendingResult.status === 'fulfilled') setPending(pendingResult.value?.platforms || [])
        if (dashboardResult.status === 'fulfilled') {
          const stats = dashboardResult.value?.stats || {}
          const snapshotData = stats.snapshots || {}
          const items = Array.isArray(snapshotData) ? snapshotData : (snapshotData.items || snapshotData.records || [])
          setSnapshots(items)
          setSnapshotTotal(Array.isArray(snapshotData) ? snapshotData.length : (snapshotData.total != null ? snapshotData.total : null))
        } else {
          setSnapshots([])
          setSnapshotTotal(null)
        }
        const failed = [platformResult, pendingResult].find((result) => result.status === 'rejected')
        setAdminError(failed ? String(failed.reason?.message || failed.reason || '管理接口调用失败') : '')
        if (platformResult.status === 'rejected') setPlatforms([])
        if (pendingResult.status === 'rejected') setPending([])
        setLoading(false)
      }, [])
      React.useEffect(() => { load() }, [load])

      const doBackup = async () => {
        setBackup({ status: 'saving', message: '' })
        try {
          const value = unwrap(await callRemote('panguDashboard', 'backup'))
          if (!value?.ok) throw new Error(value?.error || '备份失败')
          setBackup({ status: 'done', message: fmtNum(value.memories) + ' 条 · ' + fmtSize(value.size) })
          setTimeout(() => setBackup({ status: 'idle', message: '' }), 4000)
        } catch (e) {
          setBackup({ status: 'error', message: String(e?.message || e) })
        }
      }

      const runPlatformAction = async (method, tokenId, confirmText) => {
        if (!window.confirm(confirmText)) return
        try {
          const value = unwrap(await callRemote('panguPlatforms', method, { token_id: tokenId }))
          if (!value?.ok) throw new Error(value?.error || '平台操作失败')
          load()
        } catch (e) {
          setAdminError(String(e?.message || e || '平台操作失败'))
        }
      }

      const check = (name) => deep?.checks?.find((item) => item.name === name)
      const checkCell = (name, label) => {
        const result = check(name)
        const ok = result?.status === 'ok' || result?.status === 'pass'
        const failed = result?.status === 'fail' || result?.status === 'error'
        return h('div', null,
          h('small', null, label),
          h('b', { style: { display: 'flex', alignItems: 'center', gap: 6, color: ok ? css.ok : failed ? css.err : css.t2 } }, h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: ok ? css.ok : failed ? css.err : css.t3 } }), result?.status || (deep ? 'unknown' : '…')),
        )
      }
      const baseUrl = config?.pangu_base_url || 'http://127.0.0.1:19529'
      const onboarding = `请接入盘古记忆系统：\n1) 执行 curl -X POST ${baseUrl}/api/v2/platforms/request -H "Content-Type: application/json" -d '{"platform":"<你的平台ID>","platform_name":"<显示名>"}'\n2) 保存返回的 token（pgp_ 开头，只显示一次），等管理员在后台审核通过\n3) 通过后用它调 REST API：写记忆 POST ${baseUrl}/api/v2/memories（头 Authorization: Bearer <token>，body 的 text 必填，wing/room/importance/tags 可选）；搜索 GET ${baseUrl}/api/v2/memories/search?q=<关键词>`
      const sectionButton = (key, icon, label, count) => h('button', {
        className: 'pangu-dashboard-chip', 'data-active': activeSection === key ? 'true' : undefined,
        onClick: () => setActiveSection(key), type: 'button',
      }, h(Icon, { name: icon, size: 12 }), label, count != null ? h('span', { style: { marginLeft: 'auto', color: css.t3, fontSize: 9.5 } }, String(count)) : null)

      const healthContent = h(React.Fragment, null,
        h(DashboardPanel, { title: '深度体检', hint: deep ? '服务状态 · ' + (deep.status || '?') : '正在读取' },
          h('div', { className: 'pangu-dashboard-kv' }, checkCell('structure', '结构检查'), checkCell('memory', '记忆检查'), checkCell('embedding', '嵌入检查')),
          h('div', { className: 'pangu-dashboard-tip' }, h('b', null, deep?.status === 'ok' ? '服务状态稳定' : '需要关注体检结果'), h('br'), '体检读取盘古服务端的结构、记忆和嵌入检查；失败时可直接重试，不会写入数据。'),
        ),
        h(DashboardPanel, { title: '维护动作', hint: '明确确认后执行', style: { marginTop: 14 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '2px 0 10px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { flex: 1 } }, h('b', { style: { display: 'block', color: css.t1, fontSize: 11.5 } }, '创建手动备份'), h('span', { style: { display: 'block', marginTop: 2, color: css.t3, fontSize: 9.5 } }, '全量记忆 + 宫殿结构 + FTS 索引')),
            h(DashboardButton, { icon: backup.status === 'done' ? 'check' : 'database', primary: true, onClick: doBackup, disabled: backup.status === 'saving' }, backup.status === 'saving' ? '备份中…' : '立即备份'),
          ),
          backup.status === 'done' && h('div', { style: { marginTop: 9, color: css.ok, fontSize: 10.5 } }, '✓ 已创建备份 · ' + backup.message),
          backup.status === 'error' && h('div', { style: { marginTop: 9, color: css.err, fontSize: 10.5 } }, backup.message),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0 2px' } },
            h('div', { style: { flex: 1 } }, h('b', { style: { display: 'block', color: css.t1, fontSize: 11.5 } }, '夜间巩固窗口'), h('span', { style: { display: 'block', marginTop: 2, color: css.t3, fontSize: 9.5 } }, '自动合并相关记忆、衰减低价值记忆')),
            h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, color: css.ok, fontSize: 9.5 } }, h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: css.ok } }), '03:00–05:00'),
          ),
        ),
      )

      const platformContent = h(React.Fragment, null,
        h(DashboardPanel, { title: '平台接入', hint: platforms.length + ' 个活跃 · ' + pending.length + ' 个待审核' },
          h('div', { style: { color: css.t2, fontSize: 10.5, lineHeight: 1.55, marginBottom: 8 } }, '把下面这段话原样发给目标平台的 Agent；等它执行完后在这里审核。'),
          h('pre', { className: 'pangu-dashboard-code' }, onboarding),
          h('div', { style: { marginTop: 8, color: css.t3, fontSize: 9.5, lineHeight: 1.5 } }, '审核前平台没有有效权限；通过后获得读、写、改、删、搜权限。token 丢失时可撤销后重新申请。'),
        ),
        h(DashboardPanel, { title: '已接入平台', hint: platforms.length + ' 个', style: { marginTop: 14 }, bodyStyle: { padding: 0 } },
          loading ? h(Skeleton, { w: '100%', h: 100, r: 0 }) : platforms.length ? h('div', { className: 'pangu-dashboard-table-wrap' }, h('table', { className: 'pangu-dashboard-table' },
            h('thead', null, h('tr', null, ['平台', '权限', '状态', '最后使用', ''].map((label, index) => h('th', { key: index }, label)))),
            h('tbody', null, platforms.map((platform) => h('tr', { key: platform.token_id },
              h('td', null, h('b', { style: { color: css.t1 } }, platform.platform_name || platform.platform), h('div', { style: { marginTop: 2, color: css.t3, fontSize: 9, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' } }, platform.platform)),
              h('td', null, (platform.permissions || []).join(', ')),
              h('td', null, h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, color: platform.status === 'active' ? css.ok : platform.status === 'revoked' ? css.err : css.t3, fontSize: 9.5 } }, h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: 'currentColor' } }), platform.status === 'active' ? '活跃' : platform.status === 'revoked' ? '已撤销' : platform.status)),
              h('td', null, platform.last_used_at && Date.parse(platform.last_used_at) ? fmtAgo(Date.parse(platform.last_used_at)) : '未使用'),
              h('td', { style: { textAlign: 'right' } }, platform.status === 'active' && h(DashboardButton, { danger: true, onClick: () => runPlatformAction('revoke', platform.token_id, '撤销该平台接入？') }, '撤销')),
            ))),
          )) : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'box', size: 26, color: css.t3 }), h('strong', null, '暂无已接入平台'), h('span', null, '把上方接入说明发给目标平台 Agent。')),
        ),
        pending.length > 0 && h(DashboardPanel, { title: '待审核平台', hint: pending.length + ' 个', style: { marginTop: 14 } },
          pending.map((platform) => h('div', { key: platform.token_id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { flex: 1, minWidth: 0 } }, h('b', { style: { display: 'block', color: css.t1, fontSize: 11.5 } }, platform.platform_name || platform.platform), h('span', { style: { display: 'block', marginTop: 2, color: css.t3, fontSize: 9.5 } }, platform.platform, ' · ', (platform.permissions || []).join(', '), platform.request_ip ? ' · IP: ' + platform.request_ip : '')),
            h(DashboardButton, { primary: true, onClick: () => runPlatformAction('approve', platform.token_id, '审核通过该平台接入？') }, '通过'),
            h(DashboardButton, { danger: true, onClick: () => runPlatformAction('reject', platform.token_id, '拒绝该平台接入？') }, '拒绝'),
          )),
        ),
      )

      const snapshotCount = snapshotTotal != null ? snapshotTotal : snapshots.length
      const snapshotContent = h(React.Fragment, null,
        h(DashboardPanel, { title: '记忆快照', hint: snapshotCount + ' 个自动快照' },
          loading ? h(Skeleton, { w: '100%', h: 90, r: 8 }) : snapshots.length ? snapshots.slice(0, 20).map((snapshot, index) => h('div', { key: snapshot.id || snapshot.created_at || index, style: { display: 'grid', gridTemplateColumns: '70px minmax(0,1fr)', gap: 10, padding: '9px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { color: css.t3, fontSize: 9.5, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' } }, (snapshot.created_at || '').slice(5, 10) || '—'),
            h('div', { style: { minWidth: 0 } }, h('b', { style: { display: 'block', color: css.t1, fontSize: 11, lineHeight: 1.5 } }, snapshot.reason || '快照'), h('span', { style: { display: 'block', marginTop: 2, color: css.t3, fontSize: 9.5 } }, snapshot.replaced_by ? '替换 ' + String(snapshot.replaced_by).slice(0, 8) + '…' : '未记录替换对象', snapshot.quality_score ? ' · 质量 ' + Number(snapshot.quality_score).toFixed(2) : '')),
          )) : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'clock', size: 28, color: css.t3 }), h('strong', null, snapshotCount ? '快照统计可用' : '还没有自动快照'), h('span', null, '当记忆发生进化或替换时，盘古会保留可回溯的版本记录。'), h(DashboardButton, { primary: true, onClick: doBackup, disabled: backup.status === 'saving', style: { marginTop: 12 } }, backup.status === 'saving' ? '备份中…' : '创建手动备份')),
        ),
        h(DashboardPanel, { title: '版本策略', hint: '只读说明', style: { marginTop: 14 } }, h('div', { className: 'pangu-dashboard-tip', style: { marginTop: 0 } }, h('b', null, '保留可回溯链'), h('br'), '自动快照由记忆进化流程生成；手动备份调用真实 pangu_backup 服务。')),
      )

      const content = activeSection === 'health' ? healthContent : activeSection === 'platforms' ? platformContent : snapshotContent
      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 36px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / ADMIN', title: '管理',
            description: '把体检、平台和维护动作放在同一条操作路径上。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, '真实远程操作'), h('br'), '审核、撤销与备份会写入盘古服务'),
          }),
          adminError && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, border: `1px solid ${css.warn}`, borderRadius: 8, padding: '8px 11px', background: withAlpha(css.warn, '0d'), color: css.t2, fontSize: 10.5 } }, h(Icon, { name: 'alert', size: 13, color: css.warn }), h('span', { style: { flex: 1 } }, adminError), h(DashboardButton, { onClick: load }, '重试')),
          h('div', { className: 'pangu-dashboard-admin' },
            h('nav', { className: 'pangu-dashboard-admin-nav', 'aria-label': '管理分区' }, sectionButton('health', 'pulse', '体检'), sectionButton('platforms', 'box', '平台', platforms.length + pending.length), sectionButton('snapshots', 'clock', '快照')),
            h('div', { style: { minWidth: 0 } }, content),
          ),
        ),
      )
    }

    /* ════════════════════════════════════════════
     * 3. 仪表盘壳层 — 概览 / 星系 / 结晶 / 知识 / 管理
     * ════════════════════════════════════════════ */
    function PanguTab() {
      const [tab, setTab] = React.useState('overview')
      const [dash, setDash] = React.useState(null)
      const [kg, setKg] = React.useState(null)
      const [config, setConfig] = React.useState(null)
      const [dashError, setDashError] = React.useState(null)
      const [kgError, setKgError] = React.useState(null)
      const [loading, setLoading] = React.useState(true)
      const [refreshing, setRefreshing] = React.useState(false)
      const [search, setSearch] = React.useState('')
      const [typeFilter, setTypeFilter] = React.useState('')
      const [adminSection, setAdminSection] = React.useState('health')

      const load = React.useCallback(async (silent) => {
        if (!silent) setLoading(true)
        setRefreshing(true)
        const [dashboardResult, graphResult, configResult] = await Promise.allSettled([
          callRemote('panguDashboard', 'data').then(unwrap),
          callRemote('panguKG', 'graph').then(unwrap),
          callRemote('panguConfig', 'get').then(unwrap),
        ])
        if (dashboardResult.status === 'fulfilled') {
          setDash(dashboardResult.value)
          setDashError(null)
        } else {
          setDashError(String(dashboardResult.reason?.message || dashboardResult.reason))
        }
        if (graphResult.status === 'fulfilled') {
          if (graphResult.value?.ok) {
            setKg(graphResult.value)
            setKgError(null)
          } else {
            setKgError(String(graphResult.value?.error || '图谱数据为空'))
          }
        } else {
          setKgError(String(graphResult.reason?.message || graphResult.reason))
        }
        if (configResult.status === 'fulfilled') setConfig(configResult.value?.config || null)
        setLoading(false)
        setRefreshing(false)
      }, [])

      // 盘古工作台占满会话区：挂载期间给 body 打标记，让 CSS 藏掉 DSH 输入框并
      // 把 viewArea 压到可用高度。卸载必须摘掉，否则切回 Chat 标签页输入框就没了。
      React.useEffect(() => {
        document.body.setAttribute('data-pangu-view', '1')
        return () => { document.body.removeAttribute('data-pangu-view') }
      }, [])

      React.useEffect(() => {
        load()
        const id = setInterval(() => { if (!document.hidden) load(true) }, 60000)
        const offReset = ctx && ctx.on ? ctx.on('connection/reset', () => load(true)) : null
        const onGoto = (event) => {
          const nextTab = event.detail?.tab || 'overview'
          setTab(nextTab)
          if (nextTab === 'admin' && event.detail?.section) setAdminSection(event.detail.section)
        }
        window.addEventListener('pangu:goto', onGoto)
        return () => { clearInterval(id); if (offReset) offReset(); window.removeEventListener('pangu:goto', onGoto) }
      }, [load])

      /* 图谱实体去重：**已按用户决定注释停用**（2026-09-26），代码原样保留在下方。
         停用理由：服务端已修（pangu/api/server.py 的 graph_data 先按 id 合并再截断，
         边按「源|目标|谓词」去重），线上实测 19 节点/19 唯一 id、5 边/5 唯一边，
         插件这段逻辑**永不触发**。插件与服务端是各自独立升级的两端，且插件没有任何
         手段感知服务端是否已修（版本号也没跟着 bump，仍是 0.4.1；插件里唯一的版本
         逻辑是设置页显示「服务端落后」，不参与行为分支）——所以这段无法被验证还有没有用。

         ⚠ 恢复条件：若发现图谱界面又把同一实体画了两遍（节点计数对不上、或 React 报
           列表 key 冲突），先查服务端 /api/v2/graph 返回的 nodes 是否已按 id 合并；
           确认服务端已合并却仍重复，再把下面这段取消注释，并在服务端也留一份同样的合并。

         停用前实测过的事实（免得后来人重新怀疑这个判断）：
           - 服务端修复前：nodes 33 条 / 唯一 id 19 个，14 个 id 各 2 次，两行逐字节相同；
             边 3 个 key 各 4 次（2 实体行 × 2 关系行）。
           - 服务端修复后：nodes 19 / 唯一 19，edges 5 / 唯一 5，重复 0。
           - 重复的真实成因不是「HTTP/MCP/REST 成对出现」（插件只发一次 REST，
             MCP 也没有图谱工具，tools/list 实测 31 个工具里 graph/kg 为 0）；
             而是 entities_all 主键 (id, tenant_id) + 一次把记忆归属整体改写成按平台分，
             下一轮抽取对同一 id 换了属主 → INSERT OR REPLACE 退化成 INSERT。
         用 useMemo 包一层只为保持数组引用稳定：下面 matchSet / filteredNodes 两个
         useMemo 都以 allNodes 为依赖，每次 render 新建数组会让它们整条链重算。 */
      const allNodes = React.useMemo(() => kg?.nodes || [], [kg])
      const graphEdges = React.useMemo(() => kg?.edges || [], [kg])
      /*
      const { nodes: rawNodes, edges: rawEdges } = React.useMemo(() => {
        const seen = new Map()
        for (const n of (kg?.nodes || [])) {
          const prev = seen.get(n.id)
          if (!prev || (Number(n.memory_count) || 0) > (Number(prev.memory_count) || 0)) seen.set(n.id, n)
        }
        const eSeen = new Set()
        const edges = []
        for (const e of (kg?.edges || [])) {
          const k = (e.source || e.subject_id) + '|' + (e.target || e.object_id) + '|' + (e.relation || e.predicate || e.type || '')
          if (eSeen.has(k)) continue
          eSeen.add(k)
          edges.push(e)
        }
        return { nodes: [...seen.values()], edges }
      }, [kg])
      const allNodes = rawNodes
      const graphEdges = rawEdges
      */
      const matchSet = React.useMemo(() => {
        if (!search && !typeFilter) return null
        const query = search.toLowerCase()
        const set = new Set()
        for (const node of allNodes) {
          const matchesSearch = !search || [node.name, node.type, node.description].some((value) => String(value || '').toLowerCase().includes(query))
          const matchesType = !typeFilter || (node.type || 'default') === typeFilter
          if (matchesSearch && matchesType) set.add(node.id)
        }
        return set
      }, [allNodes, search, typeFilter])
      const filteredNodes = React.useMemo(() => matchSet ? allNodes.filter((node) => matchSet.has(node.id)) : allNodes, [allNodes, matchSet])

      const views = [
        { key: 'overview', icon: '◈', name: '概览', description: '状态与记忆脉搏' },
        { key: 'graph', icon: '✦', name: '星系', description: '实体关系图谱' },
        { key: 'crystal', icon: '◇', name: '结晶', description: '知识实体索引' },
        { key: 'knowledge', icon: '▤', name: '知识', description: '可复用结论' },
        { key: 'admin', icon: '⌘', name: '管理', description: '体检与平台' },
      ]
      const stats = dash?.stats
      const health = stats?.health
      const healthOk = health === 'ok'

      const pane = tab === 'overview'
        ? h(OverviewPane, { dash, dashErr: dashError, loading, onRetry: () => load() })
        : tab === 'graph'
          ? h(GraphPane, { nodes: allNodes, edges: graphEdges, matchSet, search, onSearch: setSearch, typeFilter, onTypeFilter: setTypeFilter, totalCount: allNodes.length, kgErr: kgError, loading, onRetry: () => load() })
          : tab === 'crystal'
            ? h(CrystalPane, { nodes: filteredNodes, edges: graphEdges, search, onSearch: setSearch, typeFilter, onTypeFilter: setTypeFilter, kgErr: kgError, loading, onRetry: () => load() })
            : tab === 'knowledge'
              ? h(KnowledgePane, null)
              : h(AdminPane, { initialSection: adminSection, config })

      return h('div', { className: 'pangu-dashboard', style: { height: '100%', display: 'flex', flexDirection: 'column' } },
        h('header', { className: 'pangu-dashboard-topbar' },
          h('div', { className: 'pangu-dashboard-brand' },
            h('i', { 'aria-hidden': 'true' },
              React.createElement('svg', { viewBox: BRAND_VIEWBOX, fill: 'currentColor' },
                React.createElement('path', { d: BRAND_PATH })),
            ),
            h('span', { className: 'pangu-dashboard-brand-copy' },
              h('small', null, '盘古 / 记忆系统'),
              h('strong', null, '盘古工作台'),
            ),
          ),
          h('div', { className: 'pangu-dashboard-topmeta' },
            h('span', { className: 'pangu-dashboard-live', style: health && !healthOk ? { color: css.warn, background: withAlpha(css.warn, '0d') } : undefined }, dashError ? '服务离线' : '服务已连接'),
            h(DashboardButton, { icon: 'refresh', onClick: () => load(), disabled: refreshing, title: '刷新仪表盘真实数据' }, refreshing ? '刷新中' : '刷新'),
          ),
        ),
        h('nav', { className: 'pangu-dashboard-tabs', 'aria-label': '盘古仪表盘视图' }, views.map((view) => h('button', {
          key: view.key, className: 'pangu-dashboard-tab', 'data-active': tab === view.key ? 'true' : undefined,
          'aria-current': tab === view.key ? 'page' : undefined, title: view.description,
          onClick: () => setTab(view.key), type: 'button',
        },
          h('span', { className: 'pangu-dashboard-tab-icon', 'aria-hidden': 'true' }, view.icon),
          h('span', null, view.name),
        ))),
        h('div', { className: 'pangu-dashboard-body' },
          h('main', { className: 'pangu-dashboard-main-wrap' }, h('div', { className: 'pangu-dashboard-main' }, pane)),
        ),
      )
    }
    /** 从服务端配置排一份草稿。加载与「放弃」共用这一条路径，两处逻辑不许各写一份。 */
    function draftFromConfig(cfg) {
      return {
        ce: cfg.consolidation_enabled !== false,
        ci: Number(cfg.consolidation_interval_hours) || 24,
        pb: cfg.pangu_base_url || '',
        pk: '',
        provider: cfg.llm_provider || 'openai',
        model: cfg.llm_model || '',
        baseUrl: cfg.llm_base_url || '',
        apiKey: '',
        // 默认关闭：只有显式写了 true 才算开启（与服务端默认值保持一致）
        whisperEnabled: cfg.whisper_enabled === true,
        whisperModel: cfg.whisper_model || 'base',
        // 多模态内容提取总开关，同样默认关闭
        multimodal: cfg.multimodal_enabled === true,
      }
    }

    /**
     * 顶部四格状态总览。
     *
     * 取代此前那两颗小圆角标签：用户要回答的是「服务活着吗 / 库里有多少 /
     * 谁在用 / 什么版本」，四格一屏给全，不必往下翻。
     * 每格带 data-state，测试与读屏按状态取值，不靠文案匹配（2026-09-24）。
     */
    function StatusCard({ cells }) {
      return h('div', {
        style: {
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))', gap: 1,
          background: css.borderSoft, border: `1px solid ${css.borderSoft}`, borderRadius: 10,
          overflow: 'hidden', margin: '2px 0 6px',
        },
      }, cells.filter(Boolean).map((c) => h('div', {
        key: c.label, 'data-pg-cell': c.label, 'data-state': c.state || undefined,
        style: { background: css.bg1, padding: '9px 12px 8px', minWidth: 0 },
      },
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600,
            color: css.t1, lineHeight: 1.25,
            fontFamily: c.text ? 'inherit' : 'ui-monospace,SFMono-Regular,Menlo,monospace',
          },
        },
          c.dot && h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 } }),
          c.value,
        ),
        h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 2 } }, c.label),
        h('div', {
          title: c.detail,
          style: {
            fontSize: 10, color: css.t3, marginTop: 1, opacity: .9, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          },
        }, c.detail),
      )))
    }

    function Toggle({ checked, onChange, label }) {
      // label 必传：这个 <input> 视觉上被藏起来了（只剩开关图形），而可见文字在
      // SettingRow 里、不在 <label> 内 —— 不给可及名，读屏只会念出一个「复选框」
      // 且不告诉用户是哪个设置（2026-09-24）。
      return h('label', { style: { position: 'relative', display: 'inline-block', width: 38, height: 22, cursor: 'pointer', flexShrink: 0 } },
        h('input', { type: 'checkbox', checked, onChange, 'aria-label': label, style: { opacity: 0, width: 0, height: 0 } }),
        h('span', { style: { position: 'absolute', inset: 0, borderRadius: 11, background: checked ? ACCENT : css.bg3, border: checked ? 'none' : `1px solid ${css.border}`, transition: 'background .2s', boxSizing: 'border-box' } },
          h('span', { style: { position: 'absolute', width: 16, height: 16, left: checked ? '19px' : '3px', bottom: '2.5px', background: '#fff', borderRadius: '50%', transition: 'left .2s cubic-bezier(.22,1,.36,1)', boxShadow: '0 1px 3px rgba(0,0,0,.2)' } }),
        ),
      )
    }

    function SettingRow({ label, desc, children }) {
      return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '11px 0', borderBottom: `1px solid ${css.borderSoft}` } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 13, fontWeight: 500, color: css.t1 } }, label),
          desc && h('div', { style: { fontSize: 11, color: css.t3, marginTop: 2 } }, desc),
        ),
        children,
      )
    }

    // 提供商预设：与 pangu/core/llm.py 的 PROVIDER_URLS 保持一致
    const LLM_PROVIDERS = [
      { id: 'openai', label: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
      { id: 'deepseek', label: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
      { id: 'zhipu', label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
      { id: 'qwen', label: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
      { id: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o' },
      { id: 'ollama', label: 'Ollama (本地)', url: 'http://localhost:11434/v1', model: 'llama3.1' },
    ]

    /** 受控文本输入框，风格与设置页一致 */
    function TextField({ label, desc, value, onChange, placeholder, password, disabled, mono }) {
      const [reveal, setReveal] = React.useState(false)
      return h('div', { style: { padding: '10px 0', borderBottom: `1px solid ${css.borderSoft}` } },
        h('div', { style: { fontSize: 13, fontWeight: 500, color: css.t1, marginBottom: 5 } }, label),
        desc && h('div', { style: { fontSize: 11, color: css.t3, marginBottom: 6, lineHeight: 1.5 } }, desc),
        h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
          h('input', {
            type: password && !reveal ? 'password' : 'text',
            value: value ?? '',
            placeholder: placeholder || '',
            disabled,
            spellCheck: false,
            autoComplete: 'off',
            onChange: (e) => onChange(e.target.value),
            style: {
              flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 7, fontSize: 12.5,
              border: `1px solid ${css.border}`, background: disabled ? css.bg3 : css.bg2,
              color: css.t1, outline: 'none', boxSizing: 'border-box',
              fontFamily: mono ? 'ui-monospace,SFMono-Regular,Menlo,monospace' : 'inherit',
            },
          }),
          // 只在**有内容可显示**时才给这个按钮（2026-09-21）。
          // 此前恒显示：输入框为空时框内只有脱敏占位符（如 pgk_J_*****zkQA），
          // 点「显示」看不出任何变化 —— 用户直接判定"按钮坏了"。它本来的意义
          // 只是"把你刚输入的内容明文显示出来"，那就只在输过内容时出现。
          password && String(value || '').length > 0 && h('button', {
            onClick: () => setReveal((v) => !v),
            title: reveal ? '隐藏' : '显示',
            type: 'button',
            style: { flexShrink: 0, padding: '6px 9px', borderRadius: 7, border: `1px solid ${css.border}`, background: css.bg2, color: css.t2, fontSize: 11, cursor: 'pointer' },
          }, reveal ? '隐藏' : '显示'),
        ),
      )
    }


    /* ════════════════════════════════════════════
     * 4. 设置页 — 真实读写 ~/.pangu/config.json (v5)
     * ════════════════════════════════════════════ */
    /** 一行可复制的命令 —— 升级命令长且全是符号，让人手抄必然抄错 */
    function CmdLine({ cmd }) {
      const [copied, setCopied] = React.useState(false)
      const copy = () => {
        try {
          navigator.clipboard.writeText(cmd)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch (_) {}
      }
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 } },
        h('code', { style: { flex: 1, minWidth: 0, background: css.bg3, padding: '4px 7px', borderRadius: 4, fontSize: 10, color: css.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cmd),
        h('button', { onClick: copy, style: { flexShrink: 0, padding: '3px 9px', borderRadius: 5, border: `1px solid ${css.border}`, background: css.bg2, color: css.t2, fontSize: 10, cursor: 'pointer' } },
          copied ? '已复制' : '复制'),
      )
    }

    function PanguSettings() {
      const [config, setConfig] = React.useState(null)
      const [draft, setDraft] = React.useState(null)
      const [loadErr, setLoadErr] = React.useState(null)
      const [saveState, setSaveState] = React.useState({ s: 'idle', msg: '' })
      const [testState, setTestState] = React.useState({ s: 'idle', msg: '', ok: false })
      const [keyDirty, setKeyDirty] = React.useState(false)
      // 「盘古凭据」框的明文显示开关，与 LLM API Key 的规则一致：
      // 只在**框里有内容**时才出现按钮（空框里只有掩码占位符，点了没变化）
      const [credReveal, setCredReveal] = React.useState(false)
      // 顶部状态总览的计数（记忆总量 / 接入平台）。取不到就留 null，
      // 状态卡显示「—」而不是编一个 0 —— 服务没起和真的是 0 必须分得开。
      const [stats, setStats] = React.useState(null)
      const [updateInfo, setUpdateInfo] = React.useState(null)
      const [updateLoading, setUpdateLoading] = React.useState(false)
      const [versions, setVersions] = React.useState(null)

      const load = React.useCallback(async () => {
        try {
          const value = unwrap(await callRemote('panguConfig', 'get'))
          const cfg = value?.config || {}
          setConfig(cfg)
          setVersions(value?.versions || null)
          setDraft(draftFromConfig(cfg))
          setKeyDirty(false)
          setLoadErr(null)
          // 状态总览的计数。与 checkUpdate 一样取不到就算了，不阻塞设置页本身。
          // 网关把宿主的扁平返回包了一层 { data: { stats } }（与 SidebarCard 同一
          // 事实），三条路径兜底后统一按扁平字段读，别再各处自己猜层级。
          callRemote('panguDashboard', 'data').then(unwrap).then((v) => {
            const s = v?.data?.stats || v?.stats || v
            setStats(s && typeof s === 'object' ? s : null)
          }).catch(() => {})
          // auto-check update on load
          callRemote('panguDashboard', 'checkUpdate').then(unwrap).then((v) => setUpdateInfo(v)).catch(() => {})
        } catch (e) {
          setLoadErr(String(e.message || e))
        }
      }, [])

      React.useEffect(() => { load() }, [])

      const dirty = config && draft && (
        draft.ce !== (config.consolidation_enabled !== false) ||
        draft.ci !== (Number(config.consolidation_interval_hours) || 24) ||
        draft.pb !== (config.pangu_base_url || '') ||
        draft.provider !== (config.llm_provider || 'openai') ||
        draft.model !== (config.llm_model || '') ||
        draft.baseUrl !== (config.llm_base_url || '') ||
        draft.whisperEnabled !== (config.whisper_enabled === true) ||
        draft.whisperModel !== (config.whisper_model || 'base') ||
        draft.multimodal !== (config.multimodal_enabled === true) ||
        // 密码类输入框不回填原值，非空即视为「有改动」——否则只填凭据时
        // 保存按钮一直是灰的，等于存不下去（2026-09-21 修）。
        draft.pk !== '' ||
        keyDirty
      )

      const save = async () => {
        setSaveState({ s: 'saving', msg: '' })
        try {
          const patch = {
            pangu_base_url: draft.pb,
            consolidation_enabled: draft.ce,
            consolidation_interval_hours: draft.ci,
            llm_provider: draft.provider,
            llm_model: draft.model,
            llm_base_url: draft.baseUrl,
            whisper_enabled: draft.whisperEnabled,
            whisper_model: draft.whisperModel,
          }
          // ── 多模态开关：行为开关 + 工具暴露面，两者都要动 ──
          // `pangu_ingest_file` 等属 optional 层，默认不在暴露面内。只改
          // multimodal_enabled 的话，用户打开了开关却**没有任何入口**能把文件
          // 送进记忆（默认白名单里的 pangu_collect_file 只采集文本文件）。2026-09-21。
          const mmChanged = draft.multimodal !== (config?.multimodal_enabled === true)
          let mmNote = ''
          if (mmChanged) {
            patch.multimodal_enabled = draft.multimodal
            const cur = config?.exposure
            if (cur && typeof cur === 'object') {
              const optional = new Set(cur.enabled_optional_modules || [])
              if (draft.multimodal) optional.add('multimodal')
              else optional.delete('multimodal')
              // 基于**服务端现值**整体回写，只动 multimodal 一项 —— 避免把
              // 已有的 analytics / knowledge 冲掉
              patch.exposure = { ...cur, enabled_optional_modules: [...optional].sort() }
            } else if (draft.multimodal) {
              // 取不到现值就**不动**暴露面：宁可少改，也不能凭空构造一份覆盖上去
              mmNote = '未读到服务端 exposure，pangu_multimodal_* 工具未启用（请在服务端确认该配置）'
            }
          }
          if (keyDirty && draft.apiKey) patch.llm_api_key = draft.apiKey
          if (draft.pk) patch.api_key = draft.pk
          const value = unwrap(await callRemote('panguConfig', 'save', patch))
          if (!value?.ok) throw new Error(value?.error || '写入失败')
          const rl = value.reload
          const notes = []
          if (rl && rl.ok === false) notes.push('服务端热加载失败：' + (rl.error || '未知原因'))
          if (mmNote) notes.push(mmNote)
          setSaveState({ s: 'saved', msg: notes.length ? '已保存，但' + notes.join('；') : '' })
          await load()
          setTimeout(() => setSaveState({ s: 'idle', msg: '' }), 3500)
        } catch (e) {
          setSaveState({ s: 'error', msg: String(e.message || e) })
        }
      }

      const runTest = async () => {
        setTestState({ s: 'testing', msg: '', ok: false })
        try {
          const value = unwrap(await callRemote('panguConfig', 'testLlm'))
          if (value?.ok) {
            setTestState({ s: 'done', ok: true, msg: `连接成功 · ${value.model} · ${value.ms}ms${value.sample ? ' · 返回「' + value.sample.trim() + '」' : ''}` })
          } else {
            setTestState({ s: 'done', ok: false, msg: value?.error || '连接失败' })
          }
        } catch (e) {
          setTestState({ s: 'done', ok: false, msg: String(e.message || e) })
        }
      }

      const checkUpdate = async () => {
        setUpdateLoading(true)
        try {
          const v = unwrap(await callRemote('panguDashboard', 'checkUpdate'))
          setUpdateInfo(v)
        } catch (_) {}
        setUpdateLoading(false)
      }

      const pickProvider = (id) => {
        const p = LLM_PROVIDERS.find((x) => x.id === id)
        setDraft((prev) => ({
          ...prev,
          provider: id,
          baseUrl: p && (!prev.baseUrl || LLM_PROVIDERS.some((x) => x.url === prev.baseUrl)) ? p.url : prev.baseUrl,
          // 模型同理：空值或仍是某个**预设**模型才跟着换。用户手打的模型名
          // （如 "glm-4-plus-0611"）留着不动，否则每换一次提供商就丢一次输入。
          model: p && (!prev.model || LLM_PROVIDERS.some((x) => x.model === prev.model)) ? p.model : prev.model,
        }))
      }

      /** 「放弃」：按已保存配置重排草稿。刻意不重新拉取 —— 拉取会把版本检查、
       * 统计一起重跑，而失败时反而把可恢复的现场也弄丢。 */
      const discard = () => {
        if (!config) return
        setDraft(draftFromConfig(config))
        setKeyDirty(false)
        setTestState({ s: 'idle', msg: '', ok: false })
        setSaveState({ s: 'discarded', msg: '' })
        setTimeout(() => setSaveState({ s: 'idle', msg: '' }), 2400)
      }

      if (loadErr) return h('div', { style: { padding: 20, maxWidth: 560 } }, h('div', { style: { height: 220 } }, h(ErrorState, { text: '配置读取失败(' + loadErr + ')', onRetry: load })))

      const keySet = config?.llm_api_key_set
      const keyHint = config?.llm_api_key_hint
      const credSet = config?.api_key_set
      const credHint = config?.api_key_hint
      // 多模态工具是否已在服务端暴露（决定开关之外要不要动 exposure）
      const mmToolsExposed = (config?.exposure?.enabled_optional_modules || []).includes('multimodal')
      // 服务端连通性**由宿主真实探测后回报**（index.js 的 server_online：
      // 对服务端发一次 pangu_config_get，失败=false）。非 true 一律按"未连接"显示
      // —— 未知时宁可说未连接，也不要谎报就绪（2026-09-22 用户实测踩到）。
      const serverOnline = config?.server_online === true
      const provider = LLM_PROVIDERS.find((p) => p.id === draft?.provider) || {}

      return h('div', { style: { padding: '18px 20px 20px', color: css.t1, maxWidth: 720, animation: 'panguFade .25s ease' } },
        h('div', { style: { fontSize: 15, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 } },
          // v6.2：同窄形态徽标，扁平化 + 正式品牌标识
          h('span', { style: { width: 16, height: 16, borderRadius: 5, background: css.bg1, border: `1px solid ${css.border}`, color: css.t1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } },
            h('svg', { width: 11, height: 11, viewBox: '0 0 628 628', fill: 'currentColor', 'aria-hidden': 'true' },
              h('path', { d: 'M359.108.585c-29.775 2.249-72.938 12.317-150.48 35.13-52.053 15.316-53.874 15.851-68.547 23.134C61.895 97.3 36.19 198.62 86.85 268.987c26.562 37.058 74.009 55.48 118.564 46.162 10.282-2.142 26.348-7.711 73.902-25.598 22.385-8.354 51.731-19.278 65.333-24.205 26.562-9.64 30.953-12.21 36.63-20.671 4.605-6.748 5.998-12.424 5.355-20.993-1.071-15.744-12.317-28.275-27.954-31.167-8.783-1.606-13.817-.214-47.768 12.638-82.042 31.168-114.816 43.163-121.456 44.234-24.099 3.856-47.983-11.888-57.087-37.593-4.07-11.353-4.712-30.096-1.5-42.627 5.891-23.563 20.993-42.2 42.414-52.16 17.78-8.247 136.879-41.02 169.117-46.483 34.273-5.784 61.585-4.713 85.898 3.641 47.554 16.173 78.828 62.87 73.259 109.568-3.428 28.06-14.78 50.446-36.523 71.652-13.388 12.96-31.81 25.384-58.8 39.95-39.95 21.314-58.264 32.345-73.366 43.913-9.64 7.283-29.882 27.311-37.487 37.058-24.74 31.488-39.2 72.08-37.807 105.711.321 9.211.857 11.889 3.213 16.494 11.674 22.385 43.377 24.848 57.086 4.392 3.963-5.891 5.141-10.497 6.855-26.562 4.391-40.593 29.24-74.866 74.544-102.927 5.356-3.213 20.778-11.782 34.274-19.065 38.878-20.778 52.588-29.56 71.973-46.376 18.958-16.172 33.524-34.916 43.806-55.908 27.097-55.801 23.349-121.563-9.746-170.724C504.769 29.396 444.47-.915 377.637.05c-7.497.107-15.851.322-18.529.536M280.173 547.565c-23.67 7.711-35.559 34.595-25.063 56.98 4.284 9.103 10.71 15.744 19.28 20.028 6.532 3.213 7.818 3.427 17.778 3.427 9.64 0 11.246-.321 16.816-3.106 15.958-8.033 26.026-26.24 23.884-43.163-.964-7.818-6.962-19.493-12.96-24.955-7.711-7.069-15.316-10.068-26.133-10.39-5.57-.213-10.925.322-13.602 1.179' }),
            ),
          ),
          '盘古记忆系统',
        ),
        h('div', { style: { fontSize: 11.5, color: css.t3, margin: '0 0 10px', lineHeight: 1.6 } },
          '以下设置直接读写 ', h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10.5 } }, '~/.pangu/config.json'),
          '，保存后自动热加载生效。凭据只写入本机（权限 600），永不回传界面。'),
        config && h(StatusCard, { cells: [
          {
            label: '盘古服务', text: true, state: serverOnline ? 'online' : 'offline',
            dot: serverOnline ? css.ok : css.err,
            value: serverOnline ? '已连接' : '未连接',
            detail: config.pangu_base_url || config.server_url || '默认本地 127.0.0.1:19529',
          },
          {
            label: '记忆总量', state: stats && stats.total != null ? 'known' : 'unknown',
            value: stats && stats.total != null ? String(stats.total) : '—',
            detail: stats && stats.wings != null
              ? stats.wings + ' 翼 · ' + (stats.rooms != null ? stats.rooms : '—') + ' 房间'
              : '未取到统计',
          },
          {
            label: '接入平台', state: stats && stats.platformsCount != null ? 'known' : 'unknown',
            value: stats && stats.platformsCount != null ? String(stats.platformsCount) : '—',
            detail: keySet ? 'LLM 已配置' : 'LLM 未配置',
          },
          {
            label: '盘古版本', state: versions?.server ? 'known' : 'unknown',
            value: versions?.server || '—',
            detail: '插件 v' + (versions?.plugin || '—'),
          },
        ] }),
        // 连不上时给一句能照做的话 —— 否则用户只会看到红灯，不知道下一步做什么
        config && !serverOnline && h('div', { style: { fontSize: 10.5, color: css.t3, marginBottom: 4, lineHeight: 1.6 } },
          '连不上 ',
          h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10 } }, config?.server_url || '盘古服务'),
          ' —— 盘古本体可能还没启动，或下面「服务与凭据」里的地址填错了。'),
        draft ? [
          h('div', { key: 's0-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '14px 0 7px', borderBottom: `1px solid ${css.borderSoft}`, marginTop: 12 } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '00'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '服务与凭据'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '本机 / 云端同一个配置源'),
          ),
          h('div', { key: 's0', style: { padding: '12px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 } },
              h('div', { style: { fontSize: 12.5, fontWeight: 500 } }, '盘古 MCP / API 地址'),
              h('div', { style: { fontSize: 10.5, color: css.t3 } }, '本机部署填 http://IP:19529 · 云端填 https://域名'),
            ),
            h('input', {
              className: 'pangu-input', value: draft.pb, placeholder: 'https://你的域名',
              onChange: (e) => setDraft((prev) => ({ ...prev, pb: e.target.value })),
              style: { width: '100%', boxSizing: 'border-box', padding: '7px 12px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.bg2, color: css.t1, fontSize: 12, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', outline: 'none' },
            }),
            h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 6, lineHeight: 1.6 } },
              '保存即对插件的 REST/WS 生效；DSH 的 MCP 客户端共用此地址，重启 DSH 后重新挂载。仅允许 http/https，留空回退默认本地。'),
          ),
          // 只保留**一个**凭据字段（2026-09-21）。
          // 服务端本来有两个密钥（config.api_key / ~/.pangu/.admin_secret），
          // 而安装脚本已让两者取同一个值，插件在管理面直接复用本字段即可 ——
          // 再摆一个"可留空的管理密钥"只会让人疑惑"到底要不要填"。
          // 老部署若两把确实不同，见管理面板的错误提示（改服务端文件或重跑安装）。
          h('div', { key: 's0-cred', style: { padding: '12px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 } },
              h('div', { style: { fontSize: 12.5, fontWeight: 500 } }, '盘古凭据'),
              h('div', { style: { fontSize: 10.5, color: css.t3 } },
                credSet ? '已配置 · 留空保持不变' : '必须填写 · 记忆与「管理」页都用它'),
            ),
            h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
              h('input', {
                className: 'pangu-input', type: credReveal ? 'text' : 'password', value: draft.pk,
                // 已配置时**框内直接显示脱敏值**（用户要求）：一眼看到"当前生效的是哪一把"，
                // 而不只是一句无从核对的「已配置」。这正是"填了没反馈"的解药。
                // 用 placeholder 而非 value：一开始输入就自动消失，保存只读 draft.pk，
                // 因此不存在"把掩码当凭据存进去"的风险。
                placeholder: credSet
                  ? (credHint || '已配置（明文不回显）')
                  : '粘贴安装时打印的盘古凭据',
                onChange: (e) => setDraft((prev) => ({ ...prev, pk: e.target.value })),
                style: { flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '7px 12px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.bg2, color: css.t1, fontSize: 12, fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', outline: 'none' },
              }),
              // 与 LLM API Key 同一规则：**输过内容才有**「显示/隐藏」
              draft.pk ? h('button', {
                type: 'button',
                onClick: () => setCredReveal((v) => !v),
                title: credReveal ? '隐藏' : '显示',
                style: { flexShrink: 0, padding: '6px 9px', borderRadius: 7, border: `1px solid ${css.border}`, background: css.bg2, color: css.t2, fontSize: 11, cursor: 'pointer' },
              }, credReveal ? '隐藏' : '显示') : null,
            ),
            h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 6, lineHeight: 1.6 } },
              credSet
                ? '灰字即当前生效的凭据（掩码，明文不回显）。留空保持原值，填入新值则覆盖 —— 记忆读写/搜索、管理页都用它。'
                : '尚未配置 —— 上面「盘古服务地址」那台机器安装时打印的凭据（安装横幅的「DSH 填写卡」里有）。记忆读写/搜索、管理页都用它。',
            ),
          ),
          h('div', { key: 's1-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '14px 0 7px', borderBottom: `1px solid ${css.borderSoft}`, marginTop: 12 } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '01'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, 'LLM 配置'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '结晶 / 蒸馏 / 摘要用 · 未配置时静默跳过'),
          ),
          h('div', { key: 'prov', style: { padding: '12px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 8 } },
              h('div', { style: { fontSize: 12.5, fontWeight: 500 } }, '提供商'),
              h('div', { style: { fontSize: 10.5, color: css.t3 } }, '选择后自动带出默认端点与模型；手改过的值不会被覆盖'),
            ),
            // 单栏下拉取代此前的三列卡片组：卡片组把六个提供商挤成两行网格，
            // 在单栏版面里既占高又与其它字段的读法不一致（2026-09-24）。
            h('select', {
              className: 'pangu-input', value: draft.provider,
              onChange: (e) => pickProvider(e.target.value),
              style: { width: '100%', boxSizing: 'border-box', padding: '7px 12px', borderRadius: 8, border: `1px solid ${css.border}`, background: css.bg2, color: css.t1, fontSize: 12, outline: 'none' },
            }, LLM_PROVIDERS.map((p) => h('option', { key: p.id, value: p.id }, p.label))),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 10.5, color: css.t3, lineHeight: 1.5 } },
              h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 } }),
              '默认端点 ',
              h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10 } }, provider.url || '(自定义)'),
              ' · 默认模型 ',
              h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10 } }, provider.model || '(自动)'),
            ),
          ),
          h(TextField, {
            key: 'model', label: '模型名', value: draft.model,
            desc: '可选：不填则自动从端点发现最佳模型（结晶/蒸馏时用）',
            placeholder: '(不填则自动选择最佳可用模型)',
            onChange: (v) => setDraft((p) => ({ ...p, model: v })), mono: true,
          }),
          h(TextField, {
            key: 'base', label: 'Base URL', value: draft.baseUrl,
            desc: '自建 / 代理端点填此处，OpenAI 兼容即可。留空使用默认端点。',
            placeholder: provider.url || '',
            onChange: (v) => setDraft((p) => ({ ...p, baseUrl: v })), mono: true,
          }),
          h(TextField, {
            key: 'key', label: 'API Key', value: draft.apiKey, password: true, mono: true,
            // 与「盘古凭据」同一约定：已配置时**框内显示脱敏值**（placeholder，
            // 输入即消失，保存只读 draft.apiKey），一眼可核对生效的是哪一把 Key。
            desc: keySet
              ? '灰字即当前生效的 Key（掩码，明文不回显）。留空即保持原 Key 不变；填入新值则覆盖。'
              : '尚未配置。Key 仅写入本机（权限 600），不会回传到界面。',
            placeholder: keySet ? (keyHint || '已配置（明文不回显）') : '粘贴 API Key（Ollama 可留空）',
            onChange: (v) => { setKeyDirty(true); setDraft((p) => ({ ...p, apiKey: v })) },
          }),
          h('div', { key: 'test', style: { padding: '11px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 500, color: css.t1 } }, '连接验证'),
                h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 2 } }, '使用「已保存」的配置测试；刚改过请先保存'),
              ),
              h('button', {
                onClick: runTest, type: 'button', disabled: testState.s === 'testing',
                style: { flexShrink: 0, padding: '6px 14px', borderRadius: 7, border: `1px solid ${css.border}`, background: css.bg2, color: css.t2, fontSize: 12, fontWeight: 500, cursor: testState.s === 'testing' ? 'default' : 'pointer' },
              }, testState.s === 'testing' ? '测试中…' : '测试连接'),
            ),
            testState.s === 'done' && h('div', {
              style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, border: `1px solid ${testState.ok ? css.ok : css.err}`, borderRadius: 8, padding: '7px 11px', fontSize: 11.5, background: testState.ok ? withAlpha(css.ok, '0d') : withAlpha(css.err, '0d') },
            },
              h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: testState.ok ? css.ok : css.err, flexShrink: 0 } }),
              h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', color: css.t2, lineHeight: 1.5 } }, testState.msg),
              h('button', { onClick: () => setTestState({ s: 'idle', msg: '', ok: false }), type: 'button', style: { marginLeft: 'auto', padding: '2px 7px', border: 'none', background: 'transparent', color: css.t3, fontSize: 10.5, cursor: 'pointer', flexShrink: 0 } }, '清除'),
            ),
          ),
          h('div', { key: 's2-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '02'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '记忆维护'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '巩固动力学 · 与「盘古」标签页管线联动'),
          ),
          h(SettingRow, { key: 'ce', label: '自动巩固', desc: '定期合并相关记忆片段、衰减低价值记忆（03:00–05:00 窗口加权）' },
            h(Toggle, { checked: draft.ce, onChange: () => setDraft((p) => ({ ...p, ce: !p.ce })), label: '自动巩固' }),
          ),
          h('div', { key: 'ci', style: { padding: '11px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 500, color: css.t1 } }, '巩固间隔'),
                h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 2 } }, '两次自动巩固之间的间隔小时数'),
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
                h('input', { type: 'range', min: 1, max: 72, step: 1, value: draft.ci, onChange: (e) => setDraft((p) => ({ ...p, ci: Number(e.target.value) })), style: { width: 110, accentColor: ACCENT } }),
                h('span', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, draft.ci + 'h'),
              ),
            ),
          ),
          // ── 语音转写 (Whisper) ──
          h('div', { key: 'whisper-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '02B'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '语音转写'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, 'Whisper 模型 · 关闭可节省 140-800MB 内存'),
          ),
          h(SettingRow, { key: 'whisper-toggle', label: '启用 Whisper', desc: '默认关闭（可选依赖）；启用后可将音频转为文字。音频入库还需打开下方「多模态内容提取」' },
            h(Toggle, { checked: draft.whisperEnabled, onChange: () => setDraft((p) => ({ ...p, whisperEnabled: !p.whisperEnabled })), label: '启用 Whisper 语音转写' }),
          ),
          draft.whisperEnabled && h('div', { key: 'whisper-model', style: { padding: '11px 0', borderBottom: `1px solid ${css.borderSoft}` } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 } },
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 500, color: css.t1 } }, '模型大小'),
                h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 2 } }, '越大精度越高，内存占用也越大'),
              ),
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 } },
                h('select', {
                  value: draft.whisperModel,
                  onChange: (e) => setDraft((p) => ({ ...p, whisperModel: e.target.value })),
                  style: { padding: '6px 12px', borderRadius: 6, border: `1px solid ${css.borderSoft}`, background: css.bg1, color: css.t1, fontSize: 12 }
                },
                  h('option', { value: 'tiny' }, 'Tiny (75MB)'),
                  h('option', { value: 'base' }, 'Base (140MB)'),
                  h('option', { value: 'small' }, 'Small (460MB)'),
                  h('option', { value: 'medium' }, 'Medium (1.5GB)'),
                ),
              ),
            ),
          ),
          // ── 多模态内容提取（默认关闭）──
          // 此前这套能力「装了但没真的用过」：图片只取尺寸、音频**根本没调
          // whisper**、且 pangu_ingest_file 等属 optional 层默认不暴露 ——
          // 既没有抽内容，也没有入口。这里给一个总开关，默认关闭（2026-09-21）。
          h('div', { key: 'mm-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '02C'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '多模态内容提取'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '默认关闭 · 开启会一并暴露 pangu_multimodal_* 工具'),
          ),
          h(SettingRow, {
            key: 'mm-toggle', label: '启用多模态内容提取',
            desc: '默认关闭（可选依赖）。开启后 PDF 正文（pypdf）与音频转写（whisper，需上方开关）才会抽进记忆；图片只记录尺寸，无 OCR。',
          },
            h(Toggle, { checked: draft.multimodal, onChange: () => setDraft((p) => ({ ...p, multimodal: !p.multimodal })), label: '启用多模态内容提取' }),
          ),
          h('div', { key: 'mm-hint', style: { padding: '0 0 11px', fontSize: 10.5, color: css.t3, lineHeight: 1.6 } },
            mmToolsExposed
              ? '工具当前已暴露（pangu_ingest_file / pangu_audio_ingest / pangu_image_embed …）。改完需让 DSH 重新挂载 MCP，工具列表才会刷新。'
              : '工具当前未暴露：默认白名单里的采集工具只处理文本文件。开启上面的开关即会自动打开这一层。',
          ),
          h('div', { key: 's3-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '03'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '只读信息'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '运行时快照 · 不可编辑'),
          ),
          h('div', { key: 's3-body', style: { paddingTop: 2 } },
            h(InfoRow, { label: '端点', value: config?.llm_base_url || '(未配置)' }),
            h(InfoRow, { label: 'API Key', value: keySet ? (keyHint || '已配置') : '未配置' }),
            h(InfoRow, { label: '指定模型', value: config?.llm_model || '(自动选择)' }),
            h(InfoRow, { label: '可用模型', value: (config?.llm_fallback_models || []).join(', ') || '(由端点动态发现)' }),
            h(InfoRow, { label: '嵌入模型', value: config?.embedding_model }),
            h(InfoRow, { label: '记忆库', value: config?.palace_path }),
            h(InfoRow, { label: '盘古服务地址', value: config?.pangu_base_url || '默认本地 127.0.0.1:19529' }),
            h(InfoRow, { label: '记忆总量', value: stats && stats.total != null ? stats.total + ' 条' : '(未取到)' }),
            h(InfoRow, { label: '盘古版本', value: versions?.server || '(未识别)' }),
          ),
          // ── 04 平台接入与审核 ──
          h('div', { key: 's4-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '04'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '平台接入'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, 'pgp_* Token · 审核管理'),
          ),
          h('div', { key: 's4-body', style: { marginTop: 6, lineHeight: 1.7 } },
            h('div', { style: { fontSize: 11.5, color: css.t2 } },
              h('b', null, '接入流程'),
              h('ol', { style: { margin: '6px 0 0 16px', padding: 0, fontSize: 11, color: css.t2 } },
                h('li', null, '新平台调用 ', h('code', { style: { background: css.bg3, padding: '1px 4px', borderRadius: 3, fontSize: 10.5 } }, 'POST /api/v2/platforms/request'), '，提供平台名和名称'),
                h('li', null, '平台获得临时 Token（状态 pending）'),
                h('li', null, '管理员在', h('b', null, '「盘古」标签页 → 管理 → 平台'), ' 中审核'),
                h('li', null, '审核通过后平台获得正式 Token（pgp_* 前缀，状态 active）'),
              ),
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 10 } },
              h('button', { onClick: () => window.dispatchEvent(new CustomEvent('pangu:goto', { detail: { tab: 'admin', section: 'platforms' } })), style: { padding: '6px 14px', borderRadius: 7, border: 'none', background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 } },
                h(Icon, { name: 'box', size: 12, color: '#fff' }), '前往管理平台'),
            ),
          ),
          // ── 05 关于与更新 ──
          h('div', { key: 's5-head', style: { display: 'flex', alignItems: 'baseline', gap: 9, padding: '16px 0 7px', borderBottom: `1px solid ${css.borderSoft}` } },
            h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10, fontWeight: 600, color: ACCENT } }, '05'),
            h('span', { style: { fontSize: 12.5, fontWeight: 600 } }, '关于与更新'),
            h('span', { style: { fontSize: 10.5, color: css.t3 } }, '版本信息 · 在线更新'),
          ),
          h('div', { key: 's5-body', style: { marginTop: 6 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${css.borderSoft}`, borderRadius: 10, padding: '12px 14px', background: css.bg1 } },
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 600 } },
                  'dsh-pangu v' + (versions?.plugin || '…'),
                  h('span', { style: { fontSize: 10.5, fontWeight: 400, color: css.t3, marginLeft: 8 } },
                    '盘古服务 v' + (versions?.server || '未识别')),
                ),
                h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 3 } },
                  '架构 v2.1 · 平台Token · 记忆进化 · 知识生成'),
                // 关键改动（2026-09-22）：原来只写"上游发布 vX，仅供参考" ——
                // 用户看了也不知道**自己这台**落后没有。现在直接比对并给结论。
                h('div', { style: { fontSize: 10.5, color: css.t3, marginTop: 3, lineHeight: 1.7 } },
                  !updateInfo
                    ? h('span', null, updateLoading ? '检查中…' : '点右侧按钮：比对本机与上游版本')
                    : !updateInfo.ok
                      ? h('span', { style: { color: css.warn } }, '检查失败：' + (updateInfo.error || ''))
                      : h(React.Fragment, null,
                          h('div', null,
                            '上游最新：盘古 ', h('b', { style: { color: css.t1 } }, updateInfo.tag || '?'),
                            updateInfo.pluginLatest ? ' · 插件 v' + updateInfo.pluginLatest : null,
                            updateInfo.publishedAt ? ' · 发布于 ' + updateInfo.publishedAt.slice(0, 10) : null),
                          updateInfo.serverBehind
                            ? h('div', { style: { color: css.warn } },
                                '⚠ 服务端落后（本机 ' + (updateInfo.serverVersion || '未知') + '）→ 建议升级，常含安全修复')
                            : updateInfo.serverVersion
                              ? h('div', { style: { color: css.ok } }, '✓ 服务端已是最新（' + updateInfo.serverVersion + '）')
                              : h('div', null, '服务端版本未取到（服务没起，或地址不对）'),
                          updateInfo.pluginBehind
                            ? h('div', { style: { color: css.warn } }, '⚠ 插件落后（本机 v' + updateInfo.pluginVersion + '），升级命令见下')
                            : null,
                        ),
                ),
                updateInfo?.ok && updateInfo.body && h('div', { style: { fontSize: 10, color: css.t3, marginTop: 5, lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' } }, updateInfo.body),
              ),
              h('button', { onClick: checkUpdate, disabled: updateLoading, style: { flexShrink: 0, padding: '6px 14px', borderRadius: 7, border: `1px solid ${css.border}`, background: css.bg2, color: css.t2, fontSize: 12, fontWeight: 500, cursor: updateLoading ? 'default' : 'pointer' } },
                updateLoading ? '检查中…' : '检查更新'),
            ),
            // 升级命令：只在真的落后时才铺开，且**不依赖 git**（云端最小镜像常没有 git）
            updateInfo?.ok && (updateInfo.serverBehind || updateInfo.pluginBehind) && h('div', { style: { fontSize: 10, color: css.t3, marginTop: 6, lineHeight: 1.6 } },
              updateInfo.serverBehind && h(React.Fragment, null,
                h('div', { style: { color: css.t2 } }, '服务端升级 —— 在**运行盘古的那台机器**上执行（无需 git，命令自带取码）：'),
                h(CmdLine, { cmd: updateInfo.serverUpgradeCmd }),
              ),
              updateInfo.pluginBehind && h(React.Fragment, null,
                h('div', { style: { color: css.t2, marginTop: 5 } }, '插件升级 —— 在**运行 DSH 的那台机器**上执行，之后重启 DSH：'),
                h(CmdLine, { cmd: updateInfo.pluginUpgradeCmd }),
              ),
            ),
          ),
          h('div', { key: 'save', style: { position: 'sticky', bottom: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, padding: '10px 14px', border: `1px solid ${css.borderSoft}`, borderRadius: 10, background: css.bg2 } },
            h('button', { onClick: save, disabled: !dirty || saveState.s === 'saving', style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 17px', borderRadius: 7, border: 'none', background: dirty ? ACCENT : css.bg3, color: dirty ? '#fff' : css.t3, fontSize: 12.5, fontWeight: 600, cursor: dirty ? 'pointer' : 'default', transition: 'background .2s' } },
              h(Icon, { name: saveState.s === 'saved' ? 'check' : 'save', size: 13, color: dirty ? '#fff' : undefined }),
              saveState.s === 'saving' ? '保存中…' : '保存',
            ),
            dirty && saveState.s !== 'saving' && h('span', { style: { fontSize: 11.5, color: css.warn, display: 'inline-flex', alignItems: 'center', gap: 5 } }, '● 有未保存的更改'),
            saveState.s === 'saved' && h('span', { style: { fontSize: 11.5, color: css.ok, display: 'inline-flex', alignItems: 'center', gap: 4 } }, saveState.msg || '已保存并生效'),
            saveState.s === 'discarded' && h('span', { style: { fontSize: 11.5, color: css.t2 } }, '已放弃未保存的更改'),
            saveState.s === 'error' && h('span', { style: { fontSize: 11.5, color: css.err, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, saveState.msg),
            // 「放弃」是唯一能把草稿拉回已保存值的入口。此处此前只写着
            // 「Esc 放弃更改」—— 但页面里根本没有 Esc 处理，用户按了没反应，
            // 改过的值只能一条条手改回去（2026-09-24）。
            h('button', {
              onClick: discard, type: 'button', disabled: !dirty || saveState.s === 'saving',
              style: {
                marginLeft: 'auto', flexShrink: 0, padding: '6px 13px', borderRadius: 7,
                border: `1px solid ${css.border}`, background: css.bg2, color: css.t2,
                fontSize: 12, cursor: dirty && saveState.s !== 'saving' ? 'pointer' : 'default',
                opacity: dirty ? 1 : .45,
              },
            }, '放弃'),
          ),
        ] : h('div', { style: { marginTop: 12 } }, [0, 1, 2, 3].map((i) => h(Skeleton, { key: i, w: '100%', h: 40, r: 8, style: { marginBottom: 8 } }))),
      )
    }
    async function apply(ctxRef) {
      try {
      ctx = ctxRef
      const slots = ctxRef.get('slots')
      timer = ctxRef.get('timer')
      if (slots === undefined) return
      ensureStyles()

      // 先挂载 Typert Remote 贡献,之后 ctx.get('remote.<ns>') 才可用
      const remoteHub = ((ctxRef.get && ctxRef.get('remote')) || ctxRef.remote)
      if (remoteHub && typeof remoteHub.$mount === 'function') {
        const disposeRemote = await remoteHub.$mount(DESCRIPTORS)
        ctxRef.effect(() => () => disposeRemote(), 'pangu-dashboard: remote contribution')
      } else {
        console.error('[pangu-dashboard] remote hub 不可用:', typeof remoteHub, '; remote 面板数据将不可用')
      }

      slots.inject('sidebar.footer.action', () =>
        slots.register({ name: 'sidebar.footer.action', id: 'pangu-card', order: 99 }, SidebarCard),
      )
      slots.inject('conversation.view', () =>
        slots.register({ name: 'conversation.view', id: 'pangu-kg-tab', order: 20, label: '盘古' }, () => h(PanguTab, null)),
      )
      slots.inject('settings.section', () =>
        slots.register({ name: 'settings.section', id: 'pangu-settings', order: 40, label: () => '盘古记忆系统' }, PanguSettings),
      )
      } catch (e) { console.error('[dsh-pangu] apply error:', e) }
    }

    module.exports = { apply, inject }
    return module.exports
  },
})
