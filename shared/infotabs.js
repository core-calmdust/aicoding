// InfoTabs — phones: the info boxes under the board (形勢 / 棋譜 …) become tabs in the bottom bar (common spec).
//
// The board games already have a bottom bar on phones (#mtabs: 対局 | オンライン). On a narrow touch screen the
// 対局 button is replaced by one button per info box (e.g. 形勢 | 棋譜 | オンライン): tapping one shows the board with
// only that box under it, so the page no longer runs on below the board. The online tab works as before.
// Without online (body.no-online) the bar is still shown, with the info buttons only.
// Labels come from the boxes' own headings (so they follow the game language).
//
// Usage: <script src="../shared/infotabs.js?v=1" defer></script> — no setup. Boxes: #evalCard (or #progCard) and .kifu-card,
// plus the coach (#coachCard, shared/coachkit.js) when the game has one: its tab is shown while body.ck-tab is set.
// Every tab shows an icon above its label (also the online tab).
(function () {
'use strict';
const MQ = '(pointer: coarse) and (max-width: 760px) and (orientation: portrait)';
const KEY = 'atlas-infotab';
// icons (common spec: the bottom tabs show an icon above a short label, like poker)
// (ONL: short label of the online tab)
const IC = {
  coach: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
  eval: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/></svg>',
  kifu: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  online: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
};
const ONL = { ja: 'オンライン', en: 'Online', zh: '在线', ko: '온라인', es: 'En línea', fr: 'En ligne', pt: 'Online', de: 'Online', hi: 'ऑनलाइन', ar: 'أونلاين' };
const CSS = `
.mtabs [data-it]{display:none}
.mtabs .it-ic{display:none}
.mtabs .it-sh{display:none}
@media ${MQ}{
  body.it-on .mtabs [data-t=game]:not([data-it]){display:none}
  body.it-on .mtabs [data-it]{display:flex}
  body.it-on .mtabs [data-it][hidden]{display:none}
  body.it-on .mtabs button{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:5px 0 3px;font-size:10.5px;letter-spacing:.02em;line-height:1.2;box-shadow:none!important;position:relative;-webkit-tap-highlight-color:transparent}
  body.it-on .mtabs button .it-ic{display:block;width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
  body.it-on .mtabs button .it-lb{display:block;max-width:100%;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  body.it-on .mtabs button .it-lb em{font-size:10px;margin-left:3px}
  body.it-on .mtabs .it-lb > span{display:none}
  body.it-on .mtabs .it-sh{font-weight:inherit}
  body.it-on .mtabs .it-sh{display:inline}
  body.it-on .mtabs button.sel .it-ic{stroke:var(--accent,#d8b56a)}
  body.it-on .mtabs button.sel::before{content:'';position:absolute;top:0;left:28%;right:28%;height:2px;border-radius:2px;background:var(--accent,#d8b56a)}
  body.it-on.no-online .mtabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;height:calc(50px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:var(--bg,#111);border-top:1px solid var(--line,rgba(255,255,255,.1))}
  body.it-on.no-online .mtabs [data-t=online]{display:none}
  body.it-on.no-online .app{padding-bottom:calc(62px + env(safe-area-inset-bottom))}
  body.it-on:not(.mtab-online) [data-itc].it-off{display:none!important}
  #itNav{display:none}
  body.it-on.it-nav #itNav{display:flex;justify-content:center;position:fixed;left:0;right:0;bottom:calc(50px + env(safe-area-inset-bottom));z-index:44;padding:6px 10px;background:var(--bg,#111);border-top:1px solid var(--line,rgba(255,255,255,.1))}
  body.it-on.it-nav #itNav .navbar{margin:0;width:100%;max-width:420px}
  body.it-on.it-nav .app{padding-bottom:calc(150px + env(safe-area-inset-bottom))!important}
  /* app shell like poker: the page itself never scrolls; .app (between the top and the bar) is the scroller,
     the bar sits below it → no jumping bar, no scrolling past the content (iOS toolbar / rubber band) */
  html.it-on,html.it-on body.it-on{height:100%!important;overflow:hidden!important;overscroll-behavior:none}
  html.it-on body.it-on .app{position:fixed!important;left:0!important;right:0!important;top:0!important;bottom:var(--it-b,calc(50px + env(safe-area-inset-bottom)))!important;height:auto!important;min-height:0!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:12px!important;margin:0!important}
  body.it-on .mtabs{position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:45}
  body.it-on [data-itc]{scroll-margin-bottom:calc(64px + env(safe-area-inset-bottom));scroll-margin-top:8px}
}`;
let cur = 'eval', saved = false;
try { const v = localStorage.getItem(KEY); if (v === 'eval' || v === 'kifu' || v === 'coach') { cur = v; saved = true; } } catch (e) {}

// tabs: coach (optional: #coachCard, shown while body.ck-tab — the game sets it), eval (#evalCard / #progCard), kifu (.kifu-card).
// Other boxes that belong to a tab carry data-itc="<tab>" themselves (e.g. the review card under the coach tab).
function init(tries) {
  if (window.__ROTWRAP || window.__EMBED) return;   // the rotated (landscape) board and embedded copies keep their own layout
  const bar = document.getElementById('mtabs'), game = bar && bar.querySelector('[data-t=game]:not([data-it])');
  const ev = document.getElementById('evalCard') || document.getElementById('progCard'), kf = document.querySelector('.kifu-card');
  const ck = document.getElementById('coachCard');
  if (!bar || !game || !ev || !kf) { if (tries < 40) setTimeout(() => init(tries + 1), 150); return; }
  if (bar.querySelector('[data-it]')) return;
  const st = document.createElement('style'); st.id = 'infoTabsCss'; st.textContent = CSS; document.head.appendChild(st);
  ev.dataset.itc = 'eval'; kf.dataset.itc = 'kifu'; if (ck) ck.dataset.itc = 'coach';
  const box = { coach: ck, eval: ev, kifu: kf };
  const mk = it => { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'game'; b.dataset.it = it; b.innerHTML = IC[it].replace('<svg', '<svg class="it-ic"') + '<span class="it-lb"></span>'; return b; };
  const btn = { coach: ck ? mk('coach') : null, eval: mk('eval'), kifu: mk('kifu') };
  const order = ['coach', 'eval', 'kifu'].filter(k => btn[k]);
  game.after(...order.map(k => btn[k]));
  // the online button: icon + its label (counts stay inside the label)
  const ol = bar.querySelector('[data-t=online]');
  if (ol && !ol.querySelector('.it-ic')) { const lb = document.createElement('span'); lb.className = 'it-lb'; while (ol.firstChild) lb.appendChild(ol.firstChild); ol.innerHTML = IC.online.replace('<svg', '<svg class="it-ic"'); ol.appendChild(lb); }
  // the tab says only "online" (the games' own label says "online play"); the counts stay
  const sh = ol && document.createElement('b');
  if (sh) { sh.className = 'it-sh'; ol.querySelector('.it-lb').prepend(sh); }
  const shLab = () => { if (!sh) return; const l = (document.documentElement.lang || 'ja').slice(0, 2), v = ONL[l] || ONL.en; if (sh.textContent !== v) sh.textContent = v; };
  shLab(); new MutationObserver(shLab).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // (in priority order: the kifu heading's own word, not the opening name shown beside it)
  const labOf = el => { for (const q of ['.ck-h > span', '.evalrow .label', '.progrow .label', '.kifu-head .label [data-i18n]', '.kifu-head .label']) { const l = el.querySelector(q); if (l) return l.textContent.trim(); } return ''; };
  const relabel = () => order.forEach(k => { const a = labOf(box[k]), s = btn[k].querySelector('.it-lb'); if (a && s.textContent !== a) s.textContent = a; });
  relabel();
  order.forEach(k => new MutationObserver(relabel).observe(box[k], { subtree: true, childList: true, characterData: true }));
  const avail = k => k !== 'coach' || document.body.classList.contains('ck-tab');
  const apply = () => {
    if (!avail(cur)) cur = 'eval';
    if (btn.coach) { const h = !avail('coach'); if (btn.coach.hidden !== h) btn.coach.hidden = h; }
    if (document.body.dataset.it !== cur) document.body.dataset.it = cur;
    document.querySelectorAll('[data-itc]').forEach(el => { const off = el.dataset.itc !== cur; if (el.classList.contains('it-off') !== off) el.classList.toggle('it-off', off); });
    placeNav();
  };
  // the move navigation (|< < ▶ > >|) lives in the 形勢 box; on phones it sits in a fixed strip right above the bottom tabs
  // whenever there are moves to step through (any tab; not on the online screen)
  const nav = document.getElementById('navBar'), navHome = nav && nav.parentElement, navNext = nav && nav.nextSibling;
  const navMq = matchMedia(MQ), kifuEl = document.getElementById('kifu');
  let strip = null;
  function placeNav() {
    if (!nav) return;
    const phone = navMq.matches;
    if (phone && !strip) { strip = document.createElement('div'); strip.id = 'itNav'; document.body.appendChild(strip); }
    if (phone) { if (nav.parentElement !== strip) strip.appendChild(nav); }
    else if (nav.parentElement !== navHome) navHome.insertBefore(nav, navNext && navNext.parentNode === navHome ? navNext : null);
    const has = !!kifuEl && kifuEl.children.length > 0 && !kifuEl.querySelector(':scope > .empty');
    const on = phone && has && !document.body.classList.contains('mtab-online');
    if (document.body.classList.contains('it-nav') !== on) document.body.classList.toggle('it-nav', on);
    // the strip sits right above the tab bar; the game's online chat strip (if any) moves up above it
    const chats = document.querySelectorAll('.mt-strip');
    if (on) {
      const t = bar.getBoundingClientRect().top;
      if (t > 0) {
        const b = Math.round(innerHeight - t); if (strip.style.bottom !== b + 'px') strip.style.bottom = b + 'px';
        const cb = (b + strip.offsetHeight) + 'px'; chats.forEach(m => { if (m.style.bottom !== cb) m.style.setProperty('bottom', cb, 'important'); });
      }
    } else chats.forEach(m => { if (m.style.bottom) m.style.removeProperty('bottom'); });
  }
  if (navMq.addEventListener) navMq.addEventListener('change', () => placeNav());
  if (kifuEl) new MutationObserver(() => placeNav()).observe(kifuEl, { childList: true });
  addEventListener('resize', () => placeNav());
  // selection: the game's mtab() marks every data-t=game button; keep only the chosen info tab marked
  const fix = () => {
    apply();
    const onGame = !document.body.classList.contains('mtab-online');
    order.forEach(k => { const b = btn[k], want = onGame && k === cur; if (b.classList.contains('sel') !== want) b.classList.toggle('sel', want); });
  };
  // the coach tab appears: open it once if the player never chose a tab
  let ckWas = avail('coach');
  new MutationObserver(fix).observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => { const a = avail('coach'); if (a && !ckWas && !saved) cur = 'coach'; ckWas = a; fix(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (ck && avail('coach') && !saved) cur = 'coach';
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-it]'); if (!b) return;
    const again = cur === b.dataset.it && !document.body.classList.contains('mtab-online');
    cur = b.dataset.it; saved = true; try { localStorage.setItem(KEY, cur); } catch (x) {}
    apply();
    const sc = scroller(), H = sc.clientHeight, top0 = sc.getBoundingClientRect().top;
    // a shorter box: keep the view inside its new length in the same frame
    { const max = sc.scrollHeight - H; if (sc.scrollTop > max) sc.scrollTop = Math.max(0, max); }
    // the game's own handler then runs mtab('game') (board view); bring the box into view
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = box[cur], y = el.getBoundingClientRect().top - top0;
      if (again && y < H * .5) sc.scrollTo({ top: 0, behavior: 'smooth' });   // tap again: back to the board
      else if (y > H * .85) sc.scrollTo({ top: Math.min(sc.scrollHeight - H, sc.scrollTop + y - H * .55), behavior: 'smooth' });
      else if (y < 0) sc.scrollTo({ top: sc.scrollTop + y - 8, behavior: 'smooth' });
      fix();
    }));
  }, true);
  document.body.classList.add('it-on'); document.documentElement.classList.add('it-on'); fix();
  // the scroller ends at the top of the bar (or of the move strip above it)
  const setB = () => {
    if (!navMq.matches) return;
    const t = bar.getBoundingClientRect().top, st = document.body.classList.contains('it-nav') && strip ? strip.offsetHeight : 0;
    const v = t > 0 ? Math.round(innerHeight - t + st) + 'px' : '';
    if (document.documentElement.style.getPropertyValue('--it-b') !== v) v ? document.documentElement.style.setProperty('--it-b', v) : document.documentElement.style.removeProperty('--it-b');
  };
  setB(); addEventListener('resize', setB); new MutationObserver(setB).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(setB).observe(bar);
}
// the phone scroller (.app when the shell is on, else the page)
function scroller() { const a = document.querySelector('.app'); return a && document.documentElement.classList.contains('it-on') && getComputedStyle(a).position === 'fixed' ? a : (document.scrollingElement || document.documentElement); }
window.InfoTabs = Object.assign(window.InfoTabs || {}, { scroller });
// the page can't scroll while the shell is on: the games' own window.scrollTo / scrollBy (e.g. "back to the board") go to .app
{ const fwd = name => { const orig = window[name]; window[name] = function (a, b) { const sc = scroller();
    if (sc === document.scrollingElement || sc === document.documentElement) return orig.apply(window, arguments);
    return typeof a === 'object' && a ? sc[name](a) : sc[name](0, +b || 0); }; };
  fwd('scrollTo'); fwd('scrollBy'); }
/* (not in the portal's 3D skin: its board has its own spacing, so the strips would float away from it)
   strips (opt-in: <script … data-strips>): games whose two sides sit at the top and bottom of the board (checkers, xiangqi,
   tafl, morris…) — on phones the players card is split: the opponent's cell goes above the board, yours below it,
   so the board itself shows who plays which side and the card above the board disappears. Clocks / online stay in the cells. */
const STRIPS = !!(document.currentScript && document.currentScript.hasAttribute('data-strips'));
const YOU = /あなた|\bYou\b|你|당신|\bTú\b|\bVous\b|\bVocê\b|\bDu\b|आप|أنت/;
const SCSS = `
@media ${MQ}{
  body.ps-on .card.players{display:contents!important}
  html:not(.atlas-skin) body.ps-on .card.players > .player{order:-2!important;display:flex!important;width:var(--ps-w,100%);max-width:100%;flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:0;padding:6px 12px;border-radius:12px;background:var(--panel,rgba(0,0,0,.25));border:1px solid var(--line,rgba(255,255,255,.1));box-sizing:border-box}
  html:not(.atlas-skin) body.ps-on .card.players > .player[data-ps=bot]{order:-1!important}
  html:not(.atlas-skin) body.ps-on .card.players > .player .top{margin:0;min-width:0}
  html:not(.atlas-skin) body.ps-on .card.players > .player .count{margin:0 0 0 auto!important;flex:none!important;width:auto!important;text-align:right!important;font-size:22px;line-height:1;order:2}
  html:not(.atlas-skin) body.ps-on .card.players > .player .top{order:1;flex:1 1 auto!important}
  html:not(.atlas-skin) body.ps-on .card.players > .player .status{order:3}
  html:not(.atlas-skin) body.ps-on .card.players > .player .status{position:static;margin:0 0 0 auto;font-size:11.5px}
  body.ps-on .card.players > :not(.player){display:none}
}`;
function strips(tries) {
  if (window.__ROTWRAP || window.__EMBED || document.documentElement.classList.contains('atlas-skin')) return;
  const card = document.querySelector('.card.players'), ps = card ? [...card.querySelectorAll(':scope > .player')] : [], board = document.querySelector('.board-area');
  if (ps.length !== 2 || !board) { if (tries < 40) setTimeout(() => strips(tries + 1), 150); return; }
  const st = document.createElement('style'); st.id = 'infoStripsCss'; st.textContent = SCSS; document.head.appendChild(st);
  const place = () => {
    const you = ps.map(p => YOU.test((p.querySelector('.name') || p).textContent));
    const bot = you[1] && !you[0] ? 1 : 0;   // you at the bottom; otherwise the first player (as on a board that is not flipped)
    ps.forEach((p, i) => { const v = i === bot ? 'bot' : 'top'; if (p.dataset.ps !== v) p.dataset.ps = v; });
  };
  const fit = () => { const w = board.getBoundingClientRect().width; if (w) document.body.style.setProperty('--ps-w', Math.round(w) + 'px'); };
  place(); fit();
  ps.forEach(p => new MutationObserver(place).observe(p, { subtree: true, childList: true, characterData: true }));
  if (window.ResizeObserver) new ResizeObserver(fit).observe(board);
  document.body.classList.add('ps-on');
}
/* online chat strip on the game screen (phones): only while the chat is lively — a post in the last 30 minutes.
   Otherwise the strip is hidden there (the chat is still on the online screen). Reads the games' own `chat` (global binding). */
const FRESH = 30 * 60000;
function chatFresh() {
  const st = document.createElement('style'); st.textContent = 'body:not(.chat-fresh) .mt-strip{display:none!important}'; document.head.appendChild(st);
  const upd = () => {
    let last = 0;
    try { if (typeof chat !== 'undefined' && chat && chat.list && chat.list.length) { const m = chat.list[chat.list.length - 1]; last = typeof m.t === 'number' ? m.t : 0; } } catch (e) {}
    const on = last > 0 && Date.now() - last < FRESH;
    if (document.body.classList.contains('chat-fresh') !== on) document.body.classList.toggle('chat-fresh', on);
  };
  const strip = document.getElementById('mtStrip'); if (strip) new MutationObserver(upd).observe(strip, { childList: true, subtree: true, characterData: true });
  setInterval(upd, 30000); upd();
}
const start = () => { chatFresh(); init(0); if (STRIPS) strips(0); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
