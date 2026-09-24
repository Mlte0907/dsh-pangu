/**
 * pangu-dashboard DSH 客户端 v5.1。
 * 注册:
 *  - sidebar.footer.action:  侧边栏指标卡 + 快捷记忆(宽/窄双形态,独占一行)
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
 * v4.3: 星系图 Obsidian 式搜索 dim 高亮(过滤不再移除节点);侧边栏「快速记一条」
 *       直接入库;事件驱动刷新(/ws 事件缓冲,有变化才拉全量)。
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
.pangu-dashboard{min-height:0!important;overflow:hidden!important;background:${css.bg2}!important}
.pangu-dashboard-topbar{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;min-height:46px!important;padding:0 18px!important;border-bottom:1px solid ${css.borderSoft}!important;background:${css.bg2}!important;flex-shrink:0!important}
.pangu-dashboard-brand{display:flex;align-items:center;gap:8px;min-width:0;color:${css.t2};font-size:11.5px;font-weight:650;white-space:nowrap}
.pangu-dashboard-brand i{width:9px;height:9px;border-radius:50%;background:${ACCENT};box-shadow:0 0 0 4px ${ACCENT}1f;flex:0 0 auto}
.pangu-dashboard-brand em{color:${ACCENT};font-style:normal}
.pangu-dashboard-brand span{overflow:hidden;text-overflow:ellipsis}
.pangu-dashboard-topmeta{display:flex;align-items:center;gap:8px;min-width:0}
.pangu-dashboard-live{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:${ACCENT}12;color:${ACCENT};font-size:9.5px;white-space:nowrap}
.pangu-dashboard-live::before{width:6px;height:6px;border-radius:50%;background:currentColor;content:""}
.pangu-dashboard-body{display:flex!important;min-height:0!important;flex:1!important;overflow:hidden!important}
.pangu-dashboard-main-wrap{flex:1 1 auto;min-width:0;min-height:0;overflow:hidden}
.pangu-dashboard button:focus-visible,.pangu-dashboard input:focus-visible,.pangu-dashboard select:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}
.pangu-dashboard-grid{min-width:0}
.pangu-dashboard-grid>*{min-width:0}
.pangu-dashboard-scroll{overflow:auto!important;height:100%!important;box-sizing:border-box;scrollbar-gutter:stable}
.pangu-dashboard-main{min-width:0;min-height:0;overflow:hidden;padding:22px 26px 42px;background:${css.bg2}}
.pangu-dashboard-view{width:100%;max-width:1180px;margin:0 auto;animation:panguFade .22s ease}
.pangu-dashboard-panel{border:1px solid ${css.border};border-radius:12px;background:${css.bg1};overflow:hidden;min-width:0}
.pangu-dashboard-panel-head{display:flex;align-items:baseline;gap:8px;padding:13px 15px 10px;border-bottom:1px solid ${css.borderSoft}}
.pangu-dashboard-panel-head h3{font-size:12.5px;font-weight:650;color:${css.t1}}
.pangu-dashboard-panel-head span{font-size:10px;color:${css.t3}}
.pangu-dashboard-panel-body{padding:13px 15px 15px}
.pangu-dashboard-chip{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 10px;border:1px solid transparent;border-radius:7px;background:transparent;color:${css.t2};font-size:10.5px;cursor:pointer}
.pangu-dashboard-chip:hover{background:${css.hover};color:${css.t1}}
.pangu-dashboard-chip[data-active="true"]{border-color:${ACCENT};background:${ACCENT}1f;color:${ACCENT};font-weight:650}
.pangu-dashboard-row{width:100%;border:0;border-bottom:1px solid ${css.borderSoft};background:${css.bg1};color:${css.t1};text-align:left;cursor:pointer}
.pangu-dashboard-row:hover,.pangu-dashboard-row[data-selected="true"]{background:${css.hover}}
.pangu-dashboard-row:last-child{border-bottom:0}
.pangu-dashboard-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:31px;padding:0 12px;border:1px solid ${css.border};border-radius:7px;background:${css.bg1};color:${css.t2};font-size:11px;cursor:pointer;white-space:nowrap}
.pangu-dashboard-button:hover{border-color:${ACCENT};background:${ACCENT}12;color:${ACCENT}}
.pangu-dashboard-button:disabled{cursor:default;opacity:.55}
.pangu-dashboard-button[data-primary="true"]{border-color:${ACCENT};background:${ACCENT};color:#fff;font-weight:650}
.pangu-dashboard-button[data-primary="true"]:hover{background:${ACCENT_DEEP};color:#fff}
.pangu-dashboard-button[data-danger="true"]{color:${css.err}}
.pangu-dashboard-empty{display:flex;min-height:170px;flex-direction:column;align-items:center;justify-content:center;padding:28px 18px;text-align:center;color:${css.t3}}
.pangu-dashboard-empty strong{display:block;margin-top:7px;font-size:12px;color:${css.t2}}
.pangu-dashboard-empty span{display:block;margin-top:4px;font-size:10.5px;line-height:1.5}
.pangu-dashboard-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid ${css.borderSoft};border-radius:8px;background:${css.borderSoft}}
.pangu-dashboard-kv>div{min-width:0;padding:9px 11px;background:${css.bg1}}
.pangu-dashboard-kv small{display:block;color:${css.t3};font-size:9.5px}
.pangu-dashboard-kv b{display:block;margin-top:2px;overflow:hidden;color:${css.t1};font-size:13px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-metrics{display:grid;grid-template-columns:1.25fr repeat(4,minmax(0,1fr));gap:1px;overflow:hidden;border:1px solid ${css.border};border-radius:12px;background:${css.borderSoft}}
.pangu-dashboard-metric{min-width:0;padding:11px 13px;background:${css.bg1}}
.pangu-dashboard-metric[data-primary="true"]{background:linear-gradient(135deg,${ACCENT}14,${css.bg1})}
.pangu-dashboard-metric small{display:block;color:${css.t3};font-size:10px}
.pangu-dashboard-metric strong{display:block;margin-top:2px;overflow:hidden;color:${css.t1};font:650 20px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-metric[data-primary="true"] strong{color:${ACCENT}}
.pangu-dashboard-metric em{display:block;margin-top:2px;overflow:hidden;color:${css.t3};font-size:9.5px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-two{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(250px,.8fr);gap:14px}
.pangu-dashboard-distribution{display:flex;flex-direction:column;gap:9px}
.pangu-dashboard-dist-row{display:grid;grid-template-columns:72px minmax(0,1fr) 32px;align-items:center;gap:8px}
.pangu-dashboard-dist-row span:first-child{overflow:hidden;color:${css.t2};font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-dist-row span:last-child{color:${css.t3};font:10px ui-monospace,SFMono-Regular,Menlo,monospace;text-align:right}
.pangu-dashboard-dist-track{height:7px;overflow:hidden;border-radius:4px;background:${css.borderSoft}}
.pangu-dashboard-dist-track i{display:block;height:100%;border-radius:inherit;background:${ACCENT}}
.pangu-dashboard-pipeline{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));overflow:hidden;border:1px solid ${css.borderSoft};border-radius:10px}
.pangu-dashboard-pipeline>div{position:relative;min-width:0;padding:12px 14px;background:${css.bg1}}
.pangu-dashboard-pipeline>div+div{border-left:1px solid ${css.borderSoft}}
.pangu-dashboard-pipeline>div:not(:last-child):after{content:"→";position:absolute;right:-8px;top:50%;z-index:2;display:grid;width:16px;height:16px;place-items:center;transform:translateY(-50%);border:1px solid ${css.border};border-radius:50%;background:${css.bg1};color:${css.t3};font-size:9px}
.pangu-dashboard-pipeline small{display:block;color:${css.t3};font-size:9.5px}
.pangu-dashboard-pipeline strong{display:block;margin-top:3px;overflow:hidden;color:${css.t1};font:650 19px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-pipeline em{display:block;margin-top:3px;color:${css.t3};font-size:9.5px;font-style:normal}
.pangu-dashboard-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:13px}
.pangu-dashboard-search{display:flex;flex:1 1 220px;align-items:center;gap:7px;min-width:180px;height:33px;padding:0 10px;border:1px solid ${css.border};border-radius:8px;background:${css.bg1}}
.pangu-dashboard-search:focus-within{border-color:${ACCENT};box-shadow:0 0 0 2px ${ACCENT}1f}
.pangu-dashboard-search input{width:100%;border:0;outline:0;background:transparent;color:${css.t1};font-size:11.5px}
.pangu-dashboard-select{height:33px;padding:0 9px;border:1px solid ${css.border};border-radius:8px;background:${css.bg1};color:${css.t2};font-size:11px}
.pangu-dashboard-list-detail{display:grid;grid-template-columns:minmax(0,1fr) 270px;gap:14px}
.pangu-dashboard-list-detail>div{min-width:0}
.pangu-dashboard-detail{position:sticky;top:0;align-self:start}
.pangu-dashboard-detail h3{margin:0 0 6px;font-size:14px}
.pangu-dashboard-detail p{margin:0 0 12px;color:${css.t2};font-size:11px;line-height:1.6}
.pangu-dashboard-tip{margin-top:12px;padding:10px 11px;border-radius:8px;background:${ACCENT}0d;color:${css.t2};font-size:10.5px;line-height:1.55}
.pangu-dashboard-entity-head,.pangu-dashboard-entity-row{display:grid;grid-template-columns:minmax(0,1.4fr) 84px 76px minmax(105px,.7fr);align-items:center;gap:10px}
.pangu-dashboard-entity-head{padding:8px 13px;background:${css.bg2};color:${css.t3};font-size:9.5px}
.pangu-dashboard-entity-row{min-height:48px;padding:9px 13px}
.pangu-dashboard-entity-row span{color:${css.t3};font-size:10px}
.pangu-dashboard-entity-row b{overflow:hidden;color:${css.t1};font-size:11.5px;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-entity-name{display:flex;align-items:center;gap:8px;min-width:0}
.pangu-dashboard-entity-name i{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
.pangu-dashboard-list-head,.pangu-dashboard-list-row{display:grid;grid-template-columns:28px minmax(0,1fr) 18px;align-items:start;gap:9px}
.pangu-dashboard-list-head{padding:9px 13px;background:${css.bg2};color:${css.t3};font-size:9.5px}
.pangu-dashboard-list-row{padding:12px 13px}
.pangu-dashboard-list-index{color:${css.t3};font:10px ui-monospace,SFMono-Regular,Menlo,monospace}
.pangu-dashboard-list-title{display:flex;align-items:center;gap:6px;min-width:0;color:${css.t1};font-size:11.5px;font-weight:650}
.pangu-dashboard-list-title b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pangu-dashboard-list-summary{display:-webkit-box;margin:4px 0 6px;overflow:hidden;color:${css.t2};font-size:10.5px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.pangu-dashboard-list-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:${css.t3};font-size:9.5px}
.pangu-dashboard-list-arrow{align-self:center;color:${css.t3};font-size:15px}
.pangu-dashboard-admin{display:grid;grid-template-columns:180px minmax(0,1fr);gap:14px}
.pangu-dashboard-admin-nav{display:flex;flex-direction:column;gap:4px}
.pangu-dashboard-admin-nav .pangu-dashboard-chip{justify-content:flex-start;min-height:34px}
.pangu-dashboard-table-wrap{overflow-x:auto}
.pangu-dashboard-table{width:100%;border-collapse:collapse;font-size:10.5px}
.pangu-dashboard-table th{padding:8px 9px;border-bottom:1px solid ${css.borderSoft};color:${css.t3};font-size:9.5px;font-weight:600;text-align:left}
.pangu-dashboard-table td{padding:9px;border-bottom:1px solid ${css.borderSoft};color:${css.t2};vertical-align:top}
.pangu-dashboard-table tr:last-child td{border-bottom:0}
.pangu-dashboard-code{overflow:auto;padding:10px 11px;border-radius:8px;background:${css.bg2};color:${css.t2};font:10px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;user-select:all}
.pangu-dashboard-foot{margin-top:13px;color:${css.t3};font-size:9.5px;line-height:1.6}
@media (max-width:1040px){.pangu-dashboard-two,.pangu-dashboard-list-detail{grid-template-columns:1fr}.pangu-dashboard-detail{position:static}.pangu-dashboard-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.pangu-dashboard-metric[data-primary="true"]{grid-column:span 2}.pangu-dashboard-admin{grid-template-columns:1fr}.pangu-dashboard-admin-nav{flex-direction:row;overflow-x:auto}}
@media (max-width:720px){.pangu-dashboard-topbar{padding:0 12px!important}.pangu-dashboard-topmeta .pangu-dashboard-live{display:none}.pangu-dashboard-body{display:flex!important;flex-direction:column!important;overflow:hidden!important}.pangu-dashboard-main-wrap{overflow:visible}.pangu-dashboard-main{overflow:visible!important;padding:18px 12px 32px}.pangu-dashboard-scroll{height:auto!important;overflow:visible!important}.pangu-dashboard-metrics{grid-template-columns:1fr 1fr}.pangu-dashboard-metric[data-primary="true"]{grid-column:span 2}.pangu-dashboard-pipeline,.pangu-dashboard-kv{grid-template-columns:1fr}.pangu-dashboard-pipeline>div+div{border-top:1px solid ${css.borderSoft};border-left:0}.pangu-dashboard-pipeline>div:not(:last-child):after{content:"↓";right:auto;left:50%;top:auto;bottom:-8px;transform:translateX(-50%)}.pangu-dashboard-entity-head{display:none}.pangu-dashboard-entity-row{grid-template-columns:minmax(0,1fr) auto}.pangu-dashboard-entity-row span:nth-child(2),.pangu-dashboard-entity-row span:nth-child(4){grid-column:2;text-align:right}.pangu-dashboard-entity-row span:nth-child(3){grid-column:1;grid-row:2}.pangu-dashboard-list-detail{grid-template-columns:minmax(0,1fr)}}
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
    const TYPE_COLORS = {
      person: '#58a6ff', org: '#3fb950', tech: '#d29922', concept: '#bc8cff',
      event: '#f85149', location: '#79c0ff', memory: '#56d364', room: '#f0883e',
    }
    // 2026-09-20：房间（room）概念已取消，从类型标签里移除
    const TYPE_LABELS = { person: '人物', org: '组织', tech: '技术', concept: '概念', event: '事件', location: '地点', memory: '记忆' }
    const WING_LABELS = {
      default: '通用', tech: '技术', daily: '日常', preferences: '偏好',
      self_improvement: '自我提升', system: '系统', project: '项目', work: '工作',
    }
    function wingLabel(w) { return WING_LABELS[w] || w }
    function typeColor(type) {
      if (TYPE_COLORS[type]) return TYPE_COLORS[type]
      let hash = 0
      const s = String(type || 'default')
      for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
      return `hsl(${hash % 360} 60% 58%)`
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
     * 1. 侧边栏体征帧(v5:方向 A——状态点+三格体征+管线行+快速入库)
     * ════════════════════════════════════════════ */

    // 7 日记忆脉搏 sparkline（内联 SVG，供侧栏和概览页共用）
    // 侧栏迷你脉搏（v6 改进）：柱=创建 + 线=召回，与概览页 PulseChart 同一视觉语言。
    // 此前是一条 140×22 的裸折线：无填充/端点/标签，宽度写死（226px 的侧栏里偏窄），
    // 且只有创建没有召回。
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
      const H = height || 30, TOP = 4, BOTTOM = H - 4
      const n = days.length
      const step = W / n
      const maxC = Math.max(1, ...days.map((d) => Number(d.count) || 0))
      const maxR = Math.max(1, ...rcs.map((d) => Number(d.count) || 0))
      const barW = Math.max(6, Math.min(16, Math.round(step * 0.5)))
      const xC = (i) => Math.round(step * i + step / 2)
      const barH = (c) => Math.round(((BOTTOM - TOP) * (Number(c) || 0)) / maxC)
      const yR = (c) => Math.round(BOTTOM - ((BOTTOM - TOP) * (Number(c) || 0)) / maxR)
      const hasRecall = rcs.some((d) => (Number(d.count) || 0) > 0)
      const total = days.reduce((a, d) => a + (Number(d.count) || 0), 0)
      const rTotal = rcs.reduce((a, d) => a + (Number(d.count) || 0), 0)
      const today = Number(days[n - 1]?.count) || 0
      const yesterday = Number(days[n - 2]?.count) || 0
      const delta = today - yesterday
      return h('div', { ref: wrapRef, style: { marginTop: 8 } },
        h('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', style: { width: '100%', height: H, display: 'block' }, 'aria-hidden': 'true' },
          // 基线
          h('line', { x1: 0, y1: BOTTOM, x2: W, y2: BOTTOM, stroke: css.borderSoft, strokeWidth: 1 }),
          // 创建柱（accent，随高度加深）
          h('g', null, days.map((d, i) => {
            const hh = Math.max(2, barH(d.count))
            return h('rect', { key: i, x: xC(i) - barW / 2, y: BOTTOM - hh, width: barW, height: hh, rx: 2, fill: ACCENT, opacity: (0.35 + (0.45 * hh) / (BOTTOM - TOP)).toFixed(2) })
          })),
          // 召回折线（info；没采集到时不出）
          hasRecall && h('polyline', { points: rcs.map((d, i) => xC(i) + ',' + yR(d.count)).join(' '), fill: 'none', stroke: css.info, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.9 }),
          // 今日端点
          h('circle', { cx: xC(n - 1), cy: BOTTOM - Math.max(2, barH(today)), r: 2.5, fill: ACCENT }),
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
      const [addState, setAddState] = React.useState({ s: 'idle', msg: '' })
      const [draft, setDraft] = React.useState('')
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

      const doAdd = async () => {
        const content = draft.trim()
        if (!content || addState.s === 'saving') return
        setAddState({ s: 'saving', msg: '' })
        try {
          const v = unwrap(await callRemote('panguDashboard', 'add', { content }))
          if (!v?.ok) throw new Error(v?.error || '添加失败')
          setDraft('')
          setAddState({ s: 'ok', msg: '已入库' })
          load()
          setTimeout(() => setAddState({ s: 'idle', msg: '' }), 2500)
        } catch (e) {
          setAddState({ s: 'error', msg: String(e.message || e).slice(0, 60) })
          setTimeout(() => setAddState({ s: 'idle', msg: '' }), 3500)
        }
      }

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
        return h('div', { ref: rootRef, title: '盘古记忆系统' + (state.status === 'error' ? '(离线)' : ''), style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 28, margin: '2px auto 6px', borderRadius: 8, background: css.bg2, border: `1px solid ${css.borderSoft}` } },
          loading
            ? h(Skeleton, { w: 12, h: 12, r: 4 })
            : h('span', { style: { width: 14, height: 14, borderRadius: 5, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: state.status === 'error' ? 0.35 : 1 } },
                h(Icon, { name: 'box', size: 9, color: '#fff' }),
              ),
        )
      }

      const pipeRow = (dotColor, label, value, onClick) =>
        h('button', {
          onClick, style: { display: 'flex', alignItems: 'center', gap: 6, width: '100%', border: 'none', background: 'transparent', padding: '3px 4px', borderRadius: 6, cursor: onClick ? 'pointer' : 'default', color: css.t2, fontSize: 10.5, textAlign: 'left', transition: 'background .15s' },
        },
          h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 } }),
          h('span', { style: { flex: 1 } }, label),
          h('span', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 10.5, fontWeight: 600, color: css.t1 } }, value),
        )

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
              h(Sparkline7, { key: 'pulse', created: s?.dailyCounts, recalled: s?.dailyRecalls, height: 30 }),
              h('div', { key: 'mini', style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8, borderTop: `1px solid ${css.borderSoft}`, borderBottom: `1px solid ${css.borderSoft}` } },
                // 2026-09-20：knowledge/platformsCount 挂在 wire 的 stats 下（网关把
                // host 扁平返回包一层 stats），顶层读不到 → 双路径兜底
                [['实体', s?.kgEntities != null ? fmtNum(s.kgEntities) : '—'],
                 ['知识', (state.data?.knowledge ?? s?.knowledge)?.total != null ? fmtNum((state.data?.knowledge ?? s?.knowledge).total) : '—'],
                 ['来源', Object.keys(state.data?.bySource || s?.bySource || {}).length || '—']].map(([l, v]) =>
                  h('div', { key: l, className: 'pangu-vital', style: { padding: '7px 2px 6px', textAlign: 'center' } },
                    h('div', { style: { fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 14, fontWeight: 600, color: css.t1, lineHeight: 1.15 } }, v),
                    h('div', { style: { fontSize: 9, color: css.t3, letterSpacing: '.05em', marginTop: 1 } }, l),
                  )),
              ),
              h('div', { key: 'pipe', style: { marginTop: 7, paddingTop: 7, borderTop: `1px dashed ${css.borderSoft}`, display: 'flex', flexDirection: 'column', gap: 2 } },
                pipeRow(css.ok, '知识库', (state.data?.knowledge ?? s?.knowledge)?.total != null ? fmtNum((state.data?.knowledge ?? s?.knowledge).total) + ' 条' : '—', () => window.dispatchEvent(new CustomEvent('pangu:goto', { detail: { tab: 'knowledge' } }))),
                // 2026-09-20 修复：平台接入数此前错用 bySource 键数（记忆来源类型）；
                // 且 platformsCount 与 knowledge 一样挂在 wire 的 stats 下，需双路径兜底。
                pipeRow(css.info, '平台接入', (state.data?.platformsCount ?? s?.platformsCount) != null ? (state.data?.platformsCount ?? s?.platformsCount) + ' 个' : '—', () => window.dispatchEvent(new CustomEvent('pangu:goto', { detail: { tab: 'admin' } }))),
              ),
            ],
        h('div', { key: 'quickadd', style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 } },
          h('input', {
            className: 'pangu-input', value: draft,
            placeholder: addState.s === 'ok' ? '已入库 ✓' : '快速记一条…(回车入库)',
            onChange: (e) => setDraft(e.target.value),
            onKeyDown: (e) => { if (e.key === 'Enter') doAdd() },
            style: { flex: 1, minWidth: 0, padding: '5px 9px', borderRadius: 7, border: `1px solid ${css.border}`, background: css.bg1, color: addState.s === 'ok' ? css.ok : css.t1, fontSize: 11, outline: 'none', boxSizing: 'border-box' },
          }),
          h('button', {
            className: 'pangu-btn', onClick: doAdd,
            disabled: addState.s === 'saving' || !draft.trim(),
            title: '添加到盘古记忆',
            style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 25, height: 25, borderRadius: 7, border: 'none', background: draft.trim() ? ACCENT : css.bg3, color: draft.trim() ? '#fff' : css.t3, fontSize: 13, fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0, transition: 'background .15s' },
          }, addState.s === 'saving' ? '…' : '+'),
        ),
        addState.s === 'error' && h('div', { style: { fontSize: 10, color: css.err, marginTop: 3 } }, addState.msg),
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

    function ViewHeader({ kicker, title, description, meta }) {
      return h('header', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 16 } },
        h('div', { style: { minWidth: 0 } },
          h('div', { style: { color: ACCENT, fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' } }, kicker),
          h('h1', { style: { margin: '4px 0 3px', color: css.t1, fontSize: 25, fontWeight: 650, letterSpacing: '-.025em', lineHeight: 1.15 } }, title),
          description && h('p', { style: { margin: 0, color: css.t2, fontSize: 11.5, lineHeight: 1.5 } }, description),
        ),
        meta && h('div', { style: { flexShrink: 0, color: css.t3, fontSize: 10, lineHeight: 1.55, textAlign: 'right' } }, meta),
      )
    }

    function DashboardMetric({ label, value, detail, primary }) {
      return h('div', { className: 'pangu-dashboard-metric', 'data-primary': primary ? 'true' : undefined },
        h('small', null, label),
        h('strong', null, value),
        detail && h('em', null, detail),
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
      return h('div', { ref: wrapRef },
        // preserveAspectRatio 用 meet（非 none）：首帧测量未回来时宁可两侧留白也不拉伸
        h('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', style: { width: '100%', height: H, display: 'block' }, 'aria-hidden': 'true' },
          h('g', { stroke: css.borderSoft, strokeWidth: 1 },
            [TOP, Math.round((TOP + BOTTOM) / 2), BOTTOM].map((y, i) => h('line', { key: i, x1: 0, y1: y, x2: W, y2: y })),
          ),
          hasRecall && h('polyline', {
            points: recalls.map((d, i) => xC(i) + ',' + yR(d.count)).join(' '),
            fill: 'none', stroke: css.info, strokeWidth: 1.7, opacity: 0.9,
          }),
          hasRecall && h('g', { fill: css.info },
            recalls.map((d, i) => h('circle', { key: i, cx: xC(i), cy: yR(d.count), r: 2.5 })),
          ),
          h('g', null, days.map((d, i) => {
            const hh = Math.max(2, barH(d.count))
            return h('rect', {
              key: i, x: xC(i) - barW / 2, y: BOTTOM - hh, width: barW, height: hh, rx: 2.5,
              fill: ACCENT, opacity: (0.45 + (0.5 * hh) / (BOTTOM - TOP)).toFixed(2),
            })
          })),
          h('g', { fontSize: 9, fill: css.t3, textAnchor: 'middle', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' },
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
      const wings = Object.entries(s?.byWing || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
      const sources = Object.entries(dash?.bySource || s?.bySource || {}).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 42px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / OVERVIEW', title: '概览',
            description: '先看系统是否健康，再看记忆如何流动。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, degraded ? '服务需关注' : '真实服务 · 在线'), h('br'), s?.ts ? '更新于 ' + fmtAgo(s.ts) : '等待下一次刷新'),
          }),
          h('div', { className: 'pangu-dashboard-metrics', style: { marginBottom: 14 } },
            h(DashboardMetric, { label: '服务健康', value: s?.health || '—', detail: s?.version ? '盘古 v' + s.version : '实时数据', primary: true }),
            h(DashboardMetric, { label: '记忆总量', value: s?.total != null ? fmtNum(s.total) : '—', detail: s?.wings != null ? s.wings + ' 个知识翼' : '宫殿结构' }),
            h(DashboardMetric, { label: '知识库', value: knowledge?.total != null ? fmtNum(knowledge.total) : (s?.kgEntities != null ? fmtNum(s.kgEntities) : '—'), detail: knowledge?.categories ? Object.keys(knowledge.categories).length + ' 个分类' : '知识结晶' }),
            h(DashboardMetric, { label: '进化快照', value: snapshots?.total != null ? fmtNum(snapshots.total) : '—', detail: '记忆替换记录' }),
            h(DashboardMetric, { label: '接入平台', value: s?.platformsCount != null ? fmtNum(s.platformsCount) : '—', detail: '当前活跃平台' }),
          ),
          h('div', { className: 'pangu-dashboard-two' },
            h(DashboardPanel, { title: '记忆脉搏', hint: '7 日 · 摄入与召回' },
              h(PulseChart, { created: s?.dailyCounts, recalled: s?.dailyRecalls }),
            ),
            h(DashboardPanel, { title: '需要关注', hint: degraded ? '服务状态异常' : '当前状态' },
              h('div', { className: 'pangu-dashboard-tip', style: { marginTop: 0 } }, h('b', null, '待验证 ', fmtNum(pipe?.pending_review), ' 条'), h('br'), '召回成功且带来源指针的记忆会自动毕业。'),
              h('div', { className: 'pangu-dashboard-tip', style: { background: withAlpha(css.info, '0d') } }, h('b', null, '上次巩固 · ', consLabel), h('br'), '窗口 03:00–05:00 · 24 小时周期。'),
              h('div', { className: 'pangu-dashboard-tip', style: { background: withAlpha(css.warn, '0d') } }, h('b', null, '图谱 ', fmtNum(s?.kgEntities || 0), ' 实体 · ', fmtNum(s?.kgRelations || 0), ' 关系'), h('br'), '去「结晶」查看实体索引，或去「星系」探索关系。'),
              degraded && h('div', { style: { marginTop: 10, border: `1px solid ${css.warn}`, borderRadius: 8, padding: '9px 11px', color: css.t2, background: withAlpha(css.warn, '0d'), fontSize: 10.5, lineHeight: 1.5 } }, '健康状态 ', h('b', null, s?.health), '，请前往「管理 → 体检」检查服务链路。'),
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
          h('div', { className: 'pangu-dashboard-two', style: { marginTop: 14 } },
            h(DashboardPanel, { title: '宫殿分布', hint: '按 wing 聚合' }, h(Distribution, { items: wings, total: s?.total || 0, labeler: wingLabel })),
            h(DashboardPanel, { title: '来源分布', hint: '按平台聚合' }, h(Distribution, { items: sources, total: s?.total || 0, palette: [ACCENT, css.info, '#bc8cff', css.warn, '#79c0ff', css.ok, css.err, css.t3] })),
          ),
          h('div', { style: { marginTop: 14 } },
            h(DashboardPanel, {
              title: '最近活动', hint: pubMems.length ? '全库最新 ' + Math.min(5, pubMems.length) + ' 条 · 点击展开全文' : '全库最新记忆',
              bodyStyle: { padding: '3px 15px 5px' },
            }, pubMems.length
              ? pubMems.slice(0, 5).map((m) => h(MemRow, { key: m.id, m }))
              : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'clock', size: 24, color: css.t3 }), h('strong', null, '暂无最近记忆'), h('span', null, '管理凭据可用后，这里会显示真实入库记录。')),
            ),
          ),
          h('div', { className: 'pangu-dashboard-foot' }, '数据来自当前盘古远程服务；图表、分布与最近活动不使用静态样例。'),
        ),
      )
    }
    /* ── 3D 星系图谱:Canvas2D 手写透视投影,无第三方依赖 ── */
    const GALAXY = {
      R: 260,          // 盘面半径(世界坐标)
      FOV: 900,        // 透视焦距
      SPIN: 0.0022,    // 默认自转角速度(弧度/帧)
    }

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

        function tick() {
          s.af = requestAnimationFrame(tick)
          if (document.hidden || !s.w) return
          const pal = palRef.current
          s.pal = pal

          // 自转(拖视角时暂停,松手渐复)
          if (!s.dragView && !s.dragNode) s.spin += (GALAXY.SPIN - s.spin) * 0.02
          else s.spin = 0
          s.yaw += s.spin

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
            const color = typeColor(n.type)
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
          if (n) { s.dragNode = n; s._lx = e.offsetX; s._ly = e.offsetY }
          else { s.dragView = true; s._lx = e.offsetX; s._ly = e.offsetY }
        }
        const up = () => { s.dragView = false; s.dragNode = null }
        const mv = (e) => {
          const dx = e.offsetX - s._lx, dy = e.offsetY - s._ly
          if (s.dragNode) {
            const wv = unprojectDelta(dx / s.zoom, dy / s.zoom)
            s.dragNode.x += wv.dx; s.dragNode.y += wv.dy; s.dragNode.z += wv.dz
            s.dragNode.vx = s.dragNode.vy = s.dragNode.vz = 0
            s._lx = e.offsetX; s._ly = e.offsetY
            const p = project(s.dragNode.x, s.dragNode.y, s.dragNode.z)
            setTooltip((tp) => (tp ? { ...tp, x: p.sx, y: p.sy } : tp))
          } else if (s.dragView) {
            s.yaw += dx * 0.005
            s.pitch = Math.max(-1.35, Math.min(1.35, s.pitch + dy * 0.004))
            s._lx = e.offsetX; s._ly = e.offsetY
          } else {
            const n = hit(e.offsetX, e.offsetY)
            if ((n && n.id) !== s.lastHoverId) {
              s.lastHoverId = n ? n.id : null
              s.hover = n
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
          setZoomLabel(Math.round(s.zoom * 100))
        }
        const reset = () => {
          s.yaw = 0.5; s.pitch = -0.42; s.zoom = 1; s.alpha = 1
          setZoomLabel(100)
        }
        st.current._reset = reset

        c.addEventListener('mousedown', dn)
        c.addEventListener('mouseup', up)
        c.addEventListener('mouseleave', up)
        c.addEventListener('mousemove', mv)
        c.addEventListener('wheel', wh, { passive: false })
        c.addEventListener('dblclick', reset)
        c.style.cursor = 'grab'
        return () => {
          ro.disconnect()
          if (s.af) cancelAnimationFrame(s.af); s.af = 0
          c.removeEventListener('mousedown', dn)
          c.removeEventListener('mouseup', up)
          c.removeEventListener('mouseleave', up)
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
          h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 6px ${ACCENT}` } }),
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
        h('section', { className: 'pangu-dashboard-view' },
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
          h('div', { className: 'pangu-dashboard-panel', style: { position: 'relative', minHeight: 500, height: 'min(64vh, 610px)', background: `radial-gradient(circle at 50% 42%, ${ACCENT}12, ${css.bg1} 58%)` } },
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
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, fmtNum(nodes.length) + ' 实体 · ' + fmtNum(edges.length) + ' 关系'), h('br'), '列表只保留高信号字段，完整描述放进详情'),
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
                  nodes.map((node) => {
                    const color = typeColor(node.type)
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
                ),
                h(DashboardPanel, { className: 'pangu-dashboard-detail' },
                  selected && h(React.Fragment, null,
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, color: css.t3, fontSize: 10 } }, h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: typeColor(selected.type) } }), typeLabel(selected.type), ' · 实体详情'),
                    h('h3', null, selected.name || selected.id),
                    h('p', null, selected.description || '该实体暂无描述；可回到星系视图查看它在关系图中的位置。'),
                    h('div', { className: 'pangu-dashboard-kv' },
                      h('div', null, h('small', null, '关联记忆'), h('b', null, fmtNum(selected.memory_count || 0))),
                      h('div', null, h('small', null, '连接关系'), h('b', null, String(selectedRelations.length))),
                    ),
                    h('div', { style: { marginTop: 13, marginBottom: 7, color: css.t3, fontSize: 9.5, letterSpacing: '.08em' } }, '关系摘要'),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 5 } }, selectedRelations.length ? selectedRelations.slice(0, 8).map((edge, i) => h('div', { key: i, style: { padding: '6px 8px', border: `1px solid ${css.borderSoft}`, borderRadius: 6, color: css.t2, fontSize: 10 } }, h('b', { style: { color: ACCENT } }, edge.relation || edge.predicate || edge.type || '关联'), ' · ', relationLabel(edge).split(' · ').slice(1).join(' · '))) : h('div', { style: { color: css.t3, fontSize: 10.5 } }, '暂无关系')),
                    h('div', { className: 'pangu-dashboard-tip' }, h('b', null, '索引与图谱同源'), h('br'), '类型色沿用星系视图；筛选不会生成或删除实体。')),
                ),
              )
            : h(DashboardPanel, {}, h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'search', size: 26, color: css.t3 }), h('strong', null, '没有匹配的实体'), h('span', null, '换个关键词或类型；重置后恢复完整索引。'))),
          h('div', { className: 'pangu-dashboard-foot' }, '关系类型：' + (relationCounts.length ? relationCounts.slice(0, 5).map(([name, count]) => name + ' ×' + count).join(' · ') : '暂无关系数据')),
        ),
      )
    }

    /* ── 知识库页 KnowledgePane：知识浏览 / 搜索 / 分类 ── */
    function KnowledgePane() {
      const [entries, setEntries] = React.useState([])
      const [stats, setStats] = React.useState(null)
      const [category, setCategory] = React.useState('')
      const [query, setQuery] = React.useState('')
      const [loading, setLoading] = React.useState(true)
      const [selectedId, setSelectedId] = React.useState(null)
      const [error, setError] = React.useState('')

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

      const CAT_LABELS = { best_practice: '最佳实践', solution: '解决方案', guide: '使用指南', insight: '洞察发现', other: '其他' }
      const CAT_COLORS = { best_practice: css.ok, solution: css.info, guide: ACCENT, insight: css.warn, other: css.t3 }
      const categories = stats?.categories || {}
      const catEntries = Object.entries(categories).sort((a, b) => b[1] - a[1])
      const selected = entries.find((entry) => entry.id === selectedId) || null
      const shown = query.trim() ? entries : entries.slice(0, 6)
      const updateDate = (entry) => String(entry.updated_at || entry.created_at || '').slice(0, 10) || '—'

      return h('div', { className: 'pangu-dashboard-scroll', style: { padding: '22px 26px 36px' } },
        h('section', { className: 'pangu-dashboard-view' },
          h(ViewHeader, {
            kicker: 'PANGU / KNOWLEDGE', title: '知识',
            description: '先找到值得复用的结论，再展开完整背景。',
            meta: h(React.Fragment, null, h('b', { style: { color: css.t2 } }, '真实知识库 ' + fmtNum(stats?.total || 0) + ' 条'), h('br'), query.trim() ? '搜索结果 ' + entries.length + ' 条' : '默认展示当前分类前 6 条'),
          }),
          h('div', { className: 'pangu-dashboard-controls' },
            h('label', { className: 'pangu-dashboard-search' }, h(Icon, { name: 'search', size: 13, color: css.t3 }), h('input', { value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') doSearch() }, placeholder: '搜索标题、摘要或标签…', 'aria-label': '搜索知识库' })),
            h(DashboardButton, { icon: 'search', primary: true, onClick: doSearch, disabled: loading }, '搜索'),
            query.trim() && h(DashboardButton, { onClick: () => { setQuery(''); setSelectedId(null); load() } }, '清除搜索'),
          ),
          h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 13 } },
            h('button', { className: 'pangu-dashboard-chip', 'data-active': category === '' ? 'true' : undefined, onClick: () => { setCategory(''); setSelectedId(null); setQuery('') } }, '全部 ', String(stats?.total || 0)),
            catEntries.map(([cat, count]) => h('button', {
              key: cat, className: 'pangu-dashboard-chip', 'data-active': category === cat ? 'true' : undefined,
              onClick: () => { setCategory(category === cat ? '' : cat); setSelectedId(null); setQuery('') },
            }, (CAT_LABELS[cat] || cat) + ' ' + String(count))),
          ),
          error && h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13, border: `1px solid ${css.warn}`, borderRadius: 8, padding: '8px 11px', background: withAlpha(css.warn, '0d'), color: css.t2, fontSize: 10.5 } }, h(Icon, { name: 'alert', size: 13, color: css.warn }), h('span', { style: { flex: 1 } }, error), h(DashboardButton, { onClick: load }, '重试')),
          loading
            ? h('div', { className: 'pangu-dashboard-panel' }, [0, 1, 2, 3, 4, 5].map((i) => h(Skeleton, { key: i, w: '100%', h: 58, r: 0, style: { marginBottom: 1 } })))
            : shown.length
              ? h('div', { className: 'pangu-dashboard-list-detail' },
                  h('div', { className: 'pangu-dashboard-panel' },
                    h('div', { className: 'pangu-dashboard-list-head' }, h('span', null, '#'), h('span', null, '知识条目'), h('span', null, '')),
                    shown.map((entry, index) => {
                      const color = CAT_COLORS[entry.category] || css.t3
                      return h('button', {
                        key: entry.id, className: 'pangu-dashboard-row pangu-dashboard-list-row', 'data-selected': selectedId === entry.id ? 'true' : undefined,
                        onClick: () => setSelectedId(selectedId === entry.id ? null : entry.id), type: 'button',
                      },
                        h('span', { className: 'pangu-dashboard-list-index' }, String(index + 1).padStart(2, '0')),
                        h('span', null,
                          h('span', { className: 'pangu-dashboard-list-title' }, h('span', { style: { width: 6, height: 6, borderRadius: '50%', background: color, flex: '0 0 auto' } }), h('b', null, entry.title)),
                          h('span', { className: 'pangu-dashboard-list-summary' }, entry.summary || entry.content),
                          h('span', { className: 'pangu-dashboard-list-meta' },
                            h('b', { style: { color } }, CAT_LABELS[entry.category] || entry.category),
                            '·', '置信 ' + Number(entry.confidence || 0).toFixed(0) + '%',
                            '·', '来源 ' + (entry.source_memories || []).length + ' 条',
                            '·', updateDate(entry),
                          ),
                        ),
                        h('span', { className: 'pangu-dashboard-list-arrow' }, '›'),
                      )
                    }),
                    !query.trim() && entries.length > 6 && h('div', { style: { padding: '9px 13px', borderTop: `1px solid ${css.borderSoft}`, color: css.t3, fontSize: 9.5, textAlign: 'center' } }, '为减少拥挤，仅显示前 6 条；选择分类或搜索可定位其它 ' + (entries.length - 6) + ' 条。'),
                  ),
                  h(DashboardPanel, { className: 'pangu-dashboard-detail' },
                    selected
                      ? h(React.Fragment, null,
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, color: CAT_COLORS[selected.category] || css.t3, fontSize: 10 } }, h('span', { style: { width: 7, height: 7, borderRadius: '50%', background: CAT_COLORS[selected.category] || css.t3 } }), CAT_LABELS[selected.category] || selected.category),
                          h('h3', null, selected.title),
                          h('p', { style: { whiteSpace: 'pre-wrap' } }, selected.content || selected.summary || '暂无正文'),
                          h('div', { className: 'pangu-dashboard-kv' },
                            h('div', null, h('small', null, '生成置信度'), h('b', null, Number(selected.confidence || 0).toFixed(0) + '%')),
                            h('div', null, h('small', null, '来源记忆'), h('b', null, String((selected.source_memories || []).length))),
                            h('div', null, h('small', null, '使用次数'), h('b', null, String(selected.usage_count || 0))),
                          ),
                          (selected.tags || []).length > 0 && h('div', { style: { marginTop: 13 } }, h('div', { style: { marginBottom: 7, color: css.t3, fontSize: 9.5 } }, '标签'), h('div', { style: { display: 'flex', gap: 5, flexWrap: 'wrap' } }, selected.tags.map((tag) => h('span', { key: tag, style: { padding: '2px 7px', border: `1px solid ${css.borderSoft}`, borderRadius: 6, color: css.t2, fontSize: 9.5 } }, tag)))),
                          h('div', { className: 'pangu-dashboard-tip' }, h('b', null, '来源与版本'), h('br'), '当前详情完全来自远程知识库返回字段，不补写或生成额外内容。'),
                          h(DashboardButton, { onClick: () => setSelectedId(null), style: { marginTop: 12 } }, '关闭详情'),
                        )
                      : h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'layers', size: 26, color: css.t3 }), h('strong', null, '选择一条知识'), h('span', null, '点击左侧条目查看正文、来源数量、标签和使用次数。')),
                  ),
                )
              : h(DashboardPanel, {}, h('div', { className: 'pangu-dashboard-empty' }, h(Icon, { name: 'search', size: 28, color: css.t3 }), h('strong', null, query.trim() ? '没有匹配的知识' : '知识库暂无内容'), h('span', null, query.trim() ? '换个关键词，或清除搜索恢复分类列表。' : '盘古会从记忆中自动提取知识。'))),
          h('div', { className: 'pangu-dashboard-foot' }, '分类计数与条目正文均来自 panguKnowledge.stats / list / search；默认只展开 6 条，所有条目仍可通过分类与搜索访问。'),
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

      const allNodes = React.useMemo(() => kg?.nodes || [], [kg])
      const graphEdges = React.useMemo(() => kg?.edges || [], [kg])
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

      return h('div', { className: 'pangu-dashboard', style: { height: '100%', display: 'flex', flexDirection: 'column', color: css.t1 } },
        h('header', { className: 'pangu-dashboard-topbar' },
          h('div', { className: 'pangu-dashboard-brand' }, h('i'), h('span', null, '盘古 ', h('em', null, '· 仪表盘'), ' / 记忆系统控制台')),
          h('div', { className: 'pangu-dashboard-topmeta' },
            h('span', { className: 'pangu-dashboard-live', style: health && !healthOk ? { color: css.warn, background: withAlpha(css.warn, '0d') } : undefined }, dashError ? '服务离线' : '服务在线 · ' + (health || '加载中')),
            h(DashboardButton, { icon: 'refresh', onClick: () => load(), disabled: refreshing, title: '刷新仪表盘真实数据' }, refreshing ? '刷新中' : '刷新'),
          ),
        ),
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
          h('span', { style: { width: 16, height: 16, borderRadius: 5, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DEEP})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } },
            h(Icon, { name: 'box', size: 9, color: '#fff' })),
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
