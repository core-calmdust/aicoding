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
  };
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
    // a shorter box: keep the page inside its new length in the same frame (iOS otherwise shows empty space / loses the fixed bar)
    { const se = document.scrollingElement || document.documentElement, max = se.scrollHeight - innerHeight; if (scrollY > max) scrollTo(0, Math.max(0, max)); }
    // the game's own handler then runs mtab('game') (board view); bring the box into view
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const el = box[cur], r = el.getBoundingClientRect();
      if (again && r.top < innerHeight * .5) window.scrollTo({ top: 0, behavior: 'smooth' });   // tap again: back to the board
      else if (r.top > innerHeight - 140) window.scrollTo({ top: scrollY + r.top - innerHeight * .45, behavior: 'smooth' });
      else if (r.top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      fix();
    }));
  }, true);
  document.body.classList.add('it-on'); fix();
}
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
const start = () => { init(0); if (STRIPS) strips(0); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
