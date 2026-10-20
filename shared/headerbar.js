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
const MQ = '(hover: hover) and (pointer: fine) and (min-width: 820px)';
const H = 56;
const RULES = { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' };
const RULES_T = { ja: '動かしながら覚えるルール', en: 'Learn the rules by playing', zh: '边玩边学规则', ko: '직접 해 보며 배우는 규칙', es: 'Aprende las reglas jugando', fr: 'Apprendre les règles en jouant', pt: 'Aprenda as regras jogando', de: 'Regeln beim Spielen lernen', hi: 'खेलते हुए नियम सीखें', ar: 'تعلّم القواعد باللعب' };
const ICON_RULES = '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/></svg>';
const CSS = `
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
window.HeaderBar = { init, MEDIA: MQ, HEIGHT: H, ICON_RULES };
})();
