// HeaderBar — PC header bar for the 世界のボドゲ大全 games (common spec).
//
// On a PC browser the title, the menu buttons and the icon set move into one bar at the very top of the page:
//   [ title ]  [ info (analysis, turn, …) ················ ]  [ menu: 対局 待った ヒント ルール レッスン パズル ]  [ icons ]
// On phones / tablets nothing moves (the mobile rule — menu just under the title, above the board — stays).
// The menu order is the same in every game (also on mobile): new > undo > hint > rules > lessons > puzzles > the rest.
//
// Usage (after the DOM is built):
//   const hb = HeaderBar.init({
//     brand: '.brand',                 // element holding .brand-l (title) and .brand-r (icon set)
//     controls: '.controls',           // the menu buttons
//     order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'],
//     rules: () => openRules(),        // only for games without a rules button: a button is added (id btnRules)
//     lang: () => LANG,                // label of the added rules button follows the game language
//   });
//   hb.info.innerHTML = '…';           // the free space: show analysis / turn / score there (PC only, hidden on mobile)
//   hb.on                              // true while the PC bar is active: html.hb-on + body.hb-on (portal: .hb-atlas),
//                                      // --hb-h is the bar height (set on html, so :root sizes can subtract it)
//   hb.onChange(fn)                    // called with true/false when switching between PC bar and mobile layout
//   hb.relabel()                       // re-translate the added rules button after a language change
(function () {
'use strict';
// PC layout (common spec): mouse + wide enough for left panel + board + right panel, and not a tall window; otherwise the phone layout
const MQ = '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 11/10)';
const H = 56;
const RULES = { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' };
const RULES_T = { ja: '動かしながら覚えるルール', en: 'Learn the rules by playing', zh: '边玩边学规则', ko: '직접 해 보며 배우는 규칙', es: 'Aprende las reglas jugando', fr: 'Apprendre les règles en jouant', pt: 'Aprenda as regras jogando', de: 'Regeln beim Spielen lernen', hi: 'खेलते हुए नियम सीखें', ar: 'تعلّم القواعد باللعب' };
const ICON_RULES = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>';
const CSS = `
/* player cards (common spec: whenever the info column stands beside the board — html.side-col): the side / count label is information, not a headline — keep it modest */
html.side-col .side .players .count, html.side-col .side .players .count > span:first-child, html.side-col .side .players [id^=pip]{font-size:clamp(20px, 1.6vw, 26px)!important;line-height:1.15!important}
html.side-col .side .players .side-l{font-size:clamp(15px, 1.15vw, 18px)!important;line-height:1.3!important}
/* …and the card itself compact: name on the left, the count / side on the right of the same line, the status line under it
   (not while a game clock is shown — those cards keep their own clock layout) */
html.side-col body:not(.has-clk):not(.in-online) .side .players .player{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:10px;row-gap:1px;padding:8px 12px!important;min-height:0!important}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .top{grid-column:1;grid-row:1;min-width:0}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .count, html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .side-l, html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .row{grid-column:2;grid-row:1;margin:0!important;text-align:end}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .status{grid-column:1 / -1;grid-row:2}
html.side-col body:not(.has-clk):not(.in-online) .side .players .player > .status:empty{display:none}
html.side-col .side .card.players{padding-top:10px!important;padding-bottom:10px!important}
:root{--hb-h:0px}
html.hb-on,body.hb-on{--hb-h:${H}px}
.hb{position:fixed;z-index:60;top:0;left:0;right:0;height:${H}px;display:none;align-items:center;gap:14px;padding:0 max(18px, env(safe-area-inset-right)) 0 max(18px, env(safe-area-inset-left));
  background:color-mix(in srgb, var(--panel, #141a20) 92%, transparent);border-bottom:1px solid var(--line, rgba(255,255,255,.1));
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 4px 18px rgba(0,0,0,.18);box-sizing:border-box}
body.hb-on .hb{display:flex}
body.hb-on{padding-top:${H}px}
.brand.hb-moved{display:none!important}
.hb .hb-title{flex:none;display:flex;align-items:center;min-width:0}
.hb .hb-title,.hb .hb-icons{order:0;height:auto!important;width:auto!important;position:static!important;margin:0!important;padding:0!important;border:0!important;background:none!important}
.hb .hb-title .brand-l{display:flex!important;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;white-space:nowrap;margin:0!important}
.hb .hb-title .brand-l h1{margin:0!important;font-size:22px!important;line-height:1.05!important}
.hb .hb-title .brand-l .series{font-size:11px!important;line-height:1.2}
.hb .hb-info{flex:1;min-width:0;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--muted, #9aa);overflow:hidden;white-space:nowrap}
.hb .hb-info:empty{visibility:hidden}
.hb .hb-info b{color:var(--text, #eee);font-weight:700}
.hb .hb-info .hb-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);overflow:hidden;text-overflow:ellipsis}
.hb .hb-menu{flex:none;display:flex!important;flex-direction:row!important;align-items:center;gap:6px!important;margin:0!important;padding:0 14px 0 0!important;border:0!important;border-right:1px solid var(--line, rgba(255,255,255,.12))!important;background:none!important;box-shadow:none!important;border-radius:0!important;width:auto!important;height:auto!important;max-width:none!important;grid-template-columns:none!important;order:0!important;position:static!important}
.hb .hb-menu > *{flex:none!important;display:inline-flex;flex-direction:row!important;align-items:center;justify-content:center;width:auto!important;min-width:0!important;height:36px!important;margin:0!important;padding:0 11px!important;font-size:13px!important;line-height:1!important;gap:6px!important;border-radius:10px!important;white-space:nowrap}
.hb .hb-menu > * svg{width:16px!important;height:16px!important;margin:0!important;flex:none}
.hb .hb-menu > * span{font-size:13px!important;margin:0!important}
.hb .hb-menu > .hidden,.hb .hb-menu > [hidden]{display:none}
.hb .hb-icons{flex:none;display:flex;align-items:center;gap:6px}
.hb .hb-icons .brand-r{display:flex;align-items:center;gap:6px;margin:0}
/* portal version: the portal's own top bar hosts title, info and menu */
.atlas-top .hb-title h1{margin:0;font-family:'RocknRoll One','Zen Maru Gothic',sans-serif;font-weight:400;font-size:20px;line-height:1.1;color:#111;letter-spacing:.03em;white-space:nowrap;text-shadow:none}
.atlas-top .hb-title h1 small{display:none}
.atlas-top .hb-title{flex:none;display:flex;align-items:center;align-self:center;height:30px;padding-left:12px;margin-left:2px;border-left:2px solid #e3d3ad}
.atlas-top .hb-info{flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;white-space:nowrap;font:700 13px 'Zen Maru Gothic',sans-serif;color:#6a7088}
.atlas-top .hb-info b{color:#2b3044}
.atlas-top .hb-info .hb-chip{display:inline-flex;align-items:center;gap:6px;padding:4px 11px;border-radius:99px;background:#fff;border:2px solid #efe3c8}
html.atlas-skin .atlas-top .hb-menu{flex:none;display:flex!important;align-items:center;gap:6px;margin:0 6px 0 0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;width:auto!important;height:auto!important}
html.atlas-skin .atlas-top .hb-menu > *{flex:none!important;display:inline-flex;flex-direction:row!important;align-items:center;justify-content:center;min-width:0!important;line-height:1!important;width:auto!important;height:40px!important;margin:0!important;padding:0 13px!important;border-radius:99px!important;font-size:13.5px!important;gap:6px;white-space:nowrap}
html.atlas-skin .atlas-top .hb-menu > * svg{width:17px!important;height:17px!important;margin:0!important}
html.atlas-skin .atlas-top .hb-menu > * span{margin:0!important}
@media (max-width: 1280px){html.atlas-skin .atlas-top .hb-menu > * span{display:none}html.atlas-skin .atlas-top .hb-menu > *{padding:0 11px!important}}
body.hb-atlas .atlas-top .hb-info{display:none!important}   /* portal: title only, no game info */
body.hb-atlas .atlas-top .sp{display:block!important;flex:1}
html[dir=rtl] .hb, html[lang=ar] .hb{direction:rtl}
html[lang=ar] .hb .hb-menu{padding:0 0 0 14px;border-right:0;border-left:1px solid var(--line, rgba(255,255,255,.12))}
@media (max-width: 1180px){.hb .hb-menu > * span{display:none}.hb .hb-menu > *{padding:0 10px!important}}
@media (max-width: 960px){.hb .hb-title .brand-l .series{display:none}}
/* PC: the game-over dialog is wide enough for its buttons on one line each (all games) */
@media ${MQ}{#resultOverlay .modal{width:min(640px, calc(100vw - 64px))}#resultOverlay .modal-actions .mbtn,#resultOverlay .modal-actions button{white-space:nowrap}}
`;
const $ = s => typeof s === 'string' ? document.querySelector(s) : s;
function init(o) {
  o = o || {};
  if (!document.getElementById('hbCss')) { const st = document.createElement('style'); st.id = 'hbCss'; st.textContent = CSS; document.head.appendChild(st); }
  const brand = $(o.brand || '.brand'), controls = $(o.controls || '.controls');
  const brandL = brand && brand.querySelector('.brand-l'), brandR = brand && brand.querySelector('.brand-r');
  const L = () => (o.lang ? o.lang() : document.documentElement.lang) || 'ja';
  // rules button for games that have none
  let rulesBtn = null;
  if (controls && o.rules && !controls.querySelector('#btnRules')) {
    const ref = controls.querySelector('button');
    rulesBtn = document.createElement('button');
    rulesBtn.id = 'btnRules'; rulesBtn.type = 'button';
    rulesBtn.className = ref ? ref.className.replace(/\bprimary\b/, '').trim() || 'btn' : 'btn';
    rulesBtn.innerHTML = ICON_RULES + '<span></span>';
    rulesBtn.addEventListener('click', () => o.rules());
    controls.appendChild(rulesBtn);
  }
  function relabel() {
    if (!rulesBtn) return; const l = L();
    rulesBtn.querySelector('span').textContent = RULES[l] || RULES.en; rulesBtn.title = RULES_T[l] || RULES_T.en;
  }
  relabel();
  // the game may set its language after init (URL / saved setting): follow <html lang> and re-check once loaded
  new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  setTimeout(relabel, 0); window.addEventListener('load', relabel);
  // common menu order
  if (controls && o.order) {
    const list = o.order.map(x => $(x)).filter(x => x && x.parentNode === controls);
    list.forEach(el => controls.appendChild(el));
    // keep the others (in their own order) after the common ones
    [...controls.children].filter(el => !list.includes(el)).forEach(el => controls.appendChild(el));
  }
  // the bar
  const bar = document.createElement('header'); bar.className = 'hb'; bar.setAttribute('role', 'banner');
  bar.innerHTML = '<div class="hb-title"></div><div class="hb-info" aria-live="polite"></div><nav class="hb-menu-slot"></nav><div class="hb-icons"></div>';
  document.body.prepend(bar);
  const slotT = bar.querySelector('.hb-title'), info = bar.querySelector('.hb-info'), slotM = bar.querySelector('.hb-menu-slot'), slotI = bar.querySelector('.hb-icons');
  slotM.style.display = 'contents';
  // placeholders remember where things live in the mobile layout
  const home = new Map();
  const park = el => { if (!el || home.has(el)) return; const ph = document.createComment('hb'); el.parentNode.insertBefore(ph, el); home.set(el, ph); };
  [brandL, brandR, controls].forEach(park);
  const fns = [];
  const mq = window.matchMedia(o.media || MQ);
  const portal = document.documentElement.classList.contains('atlas-skin');   // portal version: use the portal's top bar
  let on = null, host = null;
  function portalHost() {
    if (host && host.isConnected) return host;
    host = document.querySelector('.atlas-top'); if (!host) return null;
    const sp = host.querySelector('.sp'), ab = host.querySelector('.atlas-brand'), coin = host.querySelector('.atlas-coin') || sp;
    if (ab) ab.after(slotT); else host.prepend(slotT);
    if (sp) sp.before(info); else host.appendChild(info);
    coin.before(slotM);
    return host;
  }
  function apply() {
    let want = mq.matches && !document.body.classList.contains('hb-off');
    if (want && portal && !portalHost()) {   // the portal bar is made a little later: wait for it
      const mo = new MutationObserver(() => { if (document.querySelector('.atlas-top')) { mo.disconnect(); on = null; apply(); } });
      mo.observe(document.body, { childList: true }); want = false;
    }
    if (want === on) return; on = want;
    if (on) {
      if (portal) { const h1 = brandL && brandL.querySelector('h1'); if (h1) { park(h1); slotT.appendChild(h1); } }
      else if (brandL) { slotT.classList.add('brand'); slotT.appendChild(brandL); }
      if (controls) { slotM.appendChild(controls); controls.classList.add('hb-menu'); }
      if (brandR && !portal) { slotI.classList.add('brand'); slotI.appendChild(brandR); }
    } else {
      for (const [el, ph] of home) if (ph.parentNode) ph.parentNode.insertBefore(el, ph.nextSibling);
      if (controls) controls.classList.remove('hb-menu');
    }
    for (const el of [document.documentElement, document.body]) { el.classList.toggle('hb-on', on && !portal); el.classList.toggle('hb-atlas', on && portal); }
    if (brand) brand.classList.toggle('hb-moved', on && !portal);
    api.on = on;
    fns.forEach(f => { try { f(on); } catch (e) { console.error(e); } });
    window.dispatchEvent(new Event('resize'));
  }
  const api = { bar, info, on: false, relabel, rulesBtn, onChange(f) { fns.push(f); }, refresh: apply,
    setInfo(html) { info.innerHTML = html || ''; } };
  if (mq.addEventListener) mq.addEventListener('change', apply); else mq.addListener(apply);
  apply();
  return api;
}
// Online dock (common spec): when the dock at the bottom is opened on PC, the page content (.app: board + info) scrolls up
// smoothly so that it sits centred between the header bar and the top of the opened dock; closing scrolls it back.
// If it is taller than that space, the game is laid out smaller first (its --vh, which every game sizes the board and the
// info column from) so nothing hides under the header or the dock. position:relative + top (not transform), so the board's
// pointer maths and fixed dialogs keep working.
function dockCenter() {
  const app = document.querySelector('.app'), dock = document.getElementById('dock') || document.querySelector('.dock');
  if (!app || !dock) { if (!dockCenter.tried) { dockCenter.tried = 1; setTimeout(dockCenter, 1500); } return; }
  const root = document.documentElement, M = 10;   // M: breathing room above / below the content
  if (getComputedStyle(app).position === 'static') app.style.position = 'relative';
  app.style.top = '0px';   // a length (not auto), so the change of top can transition
  app.style.transition = 'top .45s cubic-bezier(.25,.8,.3,1)';
  let raf = 0, cur = 0, own = 0, fitted = false;
  const isOpen = () => { const ds = getComputedStyle(dock); return document.body.classList.contains('dock-open') && ds.display !== 'none' && ds.position === 'fixed'; };
  const shift = () => -(parseFloat(getComputedStyle(app).top) || 0);   // the shift right now (mid-transition too)
  const bounds = () => {   // the visible content of .app (its children), as if not shifted
    let t = Infinity, b = -Infinity;
    for (const c of app.children) { const cs = getComputedStyle(c); if (cs.display === 'none' || cs.position === 'fixed' || cs.visibility === 'hidden') continue; const r = c.getBoundingClientRect(); if (r.height < 2) continue; t = Math.min(t, r.top); b = Math.max(b, r.bottom); }
    const now = shift(); return t === Infinity ? null : [t + now, b + now];
  };
  const region = () => {
    const bar = document.querySelector('header.hb, .atlas-top'), br = bar && bar.getClientRects().length ? bar.getBoundingClientRect() : null;   // (fixed: no offsetParent)
    return [br && br.height ? br.bottom : 0, dock.getBoundingClientRect().top];
  };
  const vhPx = () => { const pr = document.createElement('div'); pr.style.cssText = 'position:absolute;visibility:hidden;height:var(--vh)'; app.appendChild(pr); const h = pr.getBoundingClientRect().height; pr.remove(); return h; };
  const relayout = () => { own++; window.dispatchEvent(new Event('resize')); setTimeout(() => own--, 0); };
  // the reduction R is applied as --vh (an !important rule on <html> and <body>: some games re-declare --vh on body or rewrite
  // the inline value on resize) and as DockFit.extra for games that size the board in JS (backgammon: olDockH)
  let R = 0, base = 0, lastStep = 0;
  const css = document.createElement('style'); css.id = 'dockFitCss'; document.head.appendChild(css);
  const cmp = document.createElement('style'); cmp.id = 'dockCompactCss';
  cmp.textContent = `html.dock-compact .side .kifu-card, html.dock-compact .side .info-line, html.dock-compact .side #graph, html.dock-compact .side .pl-info{display:none!important}
html.dock-compact .side, html.dock-compact .side .side-in{height:auto!important;max-height:none!important}
html.dock-compact .side .card{padding-top:9px!important;padding-bottom:9px!important}
html.dock-compact .side .players .player{padding-top:8px!important;padding-bottom:8px!important}
html.dock-compact .side .players .count, html.dock-compact .side .players .count > span:first-child, html.dock-compact .side .players [id^=pip]{font-size:20px!important;line-height:1.1!important}
html.dock-compact .side .players .status:not(.low){display:none!important}
html.dock-compact .side .players .count{margin-top:2px!important}
html.dock-compact .side #evalCard{min-height:0!important;height:auto!important;flex:none!important}
html.dock-compact .side #evalCard .evalbar{margin-top:6px!important}
html.dock-compact .side #evalCard .navbar{margin-top:8px!important}`;
  document.head.appendChild(cmp);
  const apply = () => { css.textContent = R ? `html.dock-fit, html.dock-fit body{--vh:${Math.max(240, Math.floor(base - R))}px !important}` : ''; window.DockFit.extra = R; root.classList.toggle('dock-fit', R > 0); relayout(); };
  window.DockFit = { extra: 0 };
  const unfit = () => { const c = root.classList.contains('dock-compact'); root.classList.remove('dock-compact'); if (!fitted) { if (c) relayout(); return; } fitted = false; R = 0; apply(); };
  // too tall for the space between the header and the dock: lay the game out smaller (a few passes: not everything scales with --vh)
  // (games may redraw their board a moment after a resize, so each pass waits before measuring again)
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fit = async my => {
    let prev = Infinity;
    for (let k = 0; k < 6; k++) {
      const [top, bot] = region(), room = bot - top - 2 * M, u = bounds(); if (!u || my !== gen) return;
      const over = (u[1] - u[0]) - room; if (over <= 1) return;
      if (u[1] - u[0] >= prev - 1) { R = Math.max(0, R - lastStep); apply(); await wait(120); return; }   // no longer shrinking: undo the last step and stop
      prev = u[1] - u[0];
      if (!fitted) { base = vhPx(); if (!base) return; }
      if (R > base) return;   // (--vh itself never goes below 240px; DockFit.extra may keep growing for JS-sized boards)
      fitted = true; lastStep = Math.ceil(over) + 1; R += lastStep; apply();
      await wait(180);
    }
  };
  let gen = 0;
  const settle = async () => {
    const my = ++gen;
    if (!isOpen()) { cur = 0; app.style.top = '0px'; setTimeout(() => { if (!isOpen() && my === gen) unfit(); }, 460); return; }   // size back once it has scrolled back
    await fit(my); if (my !== gen || !isOpen()) return;
    // the info column too short for its cards: compact it (players smaller, graph / record / info line hidden — the
    // evaluation bar and the ◀ ▶ navigation stay), like the phone layout
    const sd = document.querySelector('.app .side');
    const ub = bounds(), rg = region(), still = ub && (ub[1] - ub[0]) > rg[1] - rg[0] - 2 * M + 2;   // still too tall after fitting
    if (sd && !root.classList.contains('dock-compact') && (still || sd.scrollHeight > sd.clientHeight + 4 || [...(sd.querySelector('.side-in') || sd).children].some(c => c.getClientRects().length && c.getBoundingClientRect().bottom > sd.getBoundingClientRect().bottom + 4))) { root.classList.add('dock-compact'); R = 0; apply(); await wait(150); if (my !== gen || !isOpen()) return; await fit(my); if (my !== gen || !isOpen()) return; }   // compact first, then fit again from the full size
    const [top, bot] = region(), u = bounds(); if (!u) return;
    const d = Math.round((u[0] + u[1]) / 2 - (top + bot) / 2);   // (may be negative: a smaller layout is moved down to the middle)
    if (d !== cur) { cur = d; app.style.top = -d + 'px'; }
  };
  // wait for the dock to finish opening / closing (its height animates), then settle
  const follow = () => {
    cancelAnimationFrame(raf); let last = null, still = 0, n = 0;
    const step = () => { const y = Math.round(dock.getBoundingClientRect().top); still = y === last ? still + 1 : 0; last = y; if (still >= 2 || ++n > 90) { settle(); return; } raf = requestAnimationFrame(step); };
    if (!isOpen()) { settle(); return; }
    raf = requestAnimationFrame(step);
  };
  let wasOpen = isOpen();
  new MutationObserver(() => { const o = isOpen(); if (o !== wasOpen) { wasOpen = o; follow(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  let rt = 0, ws = innerWidth + 'x' + innerHeight;
  window.addEventListener('resize', () => { const w = innerWidth + 'x' + innerHeight; if (own || w === ws) return; ws = w; clearTimeout(rt);   // only real window resizes (games also dispatch resize themselves)
    rt = setTimeout(() => { if (isOpen()) { unfit(); follow(); } }, 150); });
}
// a draw-offer button in the header menu leaves no room: the puzzle button is left out of the header then (common spec)
function drawNoPuzzle() {
  const upd = () => {
    const menu = document.querySelector('header.hb .hb-menu'); if (!menu) return;
    const d = menu.querySelector('#btnDraw'), p = menu.querySelector('#btnPuzzle, #btnTsume');
    if (!p) return;
    const on = !!(d && getComputedStyle(d).display !== 'none' && !d.classList.contains('hidden'));
    p.classList.toggle('hb-skip', on);
  };
  if (!document.getElementById('hbSkipCss')) { const st = document.createElement('style'); st.id = 'hbSkipCss'; st.textContent = 'header.hb .hb-menu .hb-skip{display:none!important}'; document.head.appendChild(st); }
  let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; upd(); }); };
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
  window.addEventListener('resize', later); upd();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(drawNoPuzzle, 0)); else setTimeout(drawNoPuzzle, 0);
// html.side-col: the info column (.side) stands beside the board (not stacked under it) — the compact player cards use it
function sideCol() {
  const side = document.querySelector('.app .side'), app = document.querySelector('.app'); if (!side || !app) return;
  const upd = () => {
    const sr = side.getBoundingClientRect(), others = [...app.children].filter(c => c !== side && c.getClientRects().length && getComputedStyle(c).position !== 'fixed');
    const beside = sr.width > 0 && others.some(c => { const r = c.getBoundingClientRect(); return r.width > 40 && (sr.left >= r.right - 4 || sr.right <= r.left + 4) && sr.top < r.bottom && sr.bottom > r.top; });
    document.documentElement.classList.toggle('side-col', beside);
  };
  upd(); setTimeout(upd, 300); setTimeout(upd, 1500);
  let t = 0; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(upd, 80); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(sideCol, 0)); else setTimeout(sideCol, 0);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(dockCenter, 0)); else setTimeout(dockCenter, 0);
window.HeaderBar = { init, MEDIA: MQ, HEIGHT: H, ICON_RULES };
})();
