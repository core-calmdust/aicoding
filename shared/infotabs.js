// InfoTabs — phones: the info boxes under the board (形勢 / 棋譜 …) become tabs in the bottom bar (common spec).
//
// The board games already have a bottom bar on phones (#mtabs: 対局 | オンライン). On a narrow touch screen the
// 対局 button is replaced by one button per info box (e.g. 形勢 | 棋譜 | オンライン): tapping one shows the board with
// only that box under it, so the page no longer runs on below the board. The online tab works as before.
// Without online (body.no-online) the bar is still shown, with the info buttons only.
// Labels come from the boxes' own headings (so they follow the game language).
//
// Usage: <script src="../shared/infotabs.js?v=1" defer></script> — no setup. Boxes: #evalCard (or #progCard) and .kifu-card.
(function () {
'use strict';
const MQ = '(pointer: coarse) and (max-width: 760px) and (orientation: portrait)';
const KEY = 'atlas-infotab';
const CSS = `
.mtabs [data-it]{display:none}
@media ${MQ}{
  body.it-on .mtabs [data-t=game]:not([data-it]){display:none}
  body.it-on .mtabs [data-it]{display:block}
  body.it-on.no-online .mtabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:45;height:calc(50px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom);background:var(--bg,#111);border-top:1px solid var(--line,rgba(255,255,255,.1))}
  body.it-on.no-online .mtabs [data-t=online]{display:none}
  body.it-on.no-online .app{padding-bottom:calc(62px + env(safe-area-inset-bottom))}
  body.it-on:not(.mtab-online)[data-it=eval] [data-itc=kifu],
  body.it-on:not(.mtab-online)[data-it=kifu] [data-itc=eval]{display:none!important}
  body.it-on [data-itc]{scroll-margin-bottom:calc(64px + env(safe-area-inset-bottom));scroll-margin-top:8px}
}`;
let cur = 'eval';
try { const v = localStorage.getItem(KEY); if (v === 'eval' || v === 'kifu') cur = v; } catch (e) {}

function init(tries) {
  if (window.__ROTWRAP || window.__EMBED) return;   // the rotated (landscape) board and embedded copies keep their own layout
  const bar = document.getElementById('mtabs'), game = bar && bar.querySelector('[data-t=game]:not([data-it])');
  const ev = document.getElementById('evalCard') || document.getElementById('progCard'), kf = document.querySelector('.kifu-card');
  if (!bar || !game || !ev || !kf) { if (tries < 40) setTimeout(() => init(tries + 1), 150); return; }
  if (bar.querySelector('[data-it]')) return;
  const st = document.createElement('style'); st.id = 'infoTabsCss'; st.textContent = CSS; document.head.appendChild(st);
  ev.dataset.itc = 'eval'; kf.dataset.itc = 'kifu';
  const mk = it => { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'game'; b.dataset.it = it; return b; };
  const bE = mk('eval'), bK = mk('kifu');
  game.after(bE, bK);
  const labOf = el => { const l = el.querySelector('.evalrow .label, .progrow .label, .kifu-head .label [data-i18n], .kifu-head .label'); return l ? l.textContent.trim() : ''; };
  const relabel = () => { const a = labOf(ev), b = labOf(kf); if (bE.textContent !== a) bE.textContent = a; if (bK.textContent !== b) bK.textContent = b; };
  relabel();
  new MutationObserver(relabel).observe(ev, { subtree: true, childList: true, characterData: true });
  new MutationObserver(relabel).observe(kf, { subtree: true, childList: true, characterData: true });
  // selection: the game's mtab() marks every data-t=game button; keep only the chosen info tab marked
  const fix = () => {
    const onGame = !document.body.classList.contains('mtab-online');
    [bE, bK].forEach(b => { const want = onGame && b.dataset.it === cur; if (b.classList.contains('sel') !== want) b.classList.toggle('sel', want); });
  };
  new MutationObserver(fix).observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(fix).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  bar.addEventListener('click', e => {
    const b = e.target.closest('[data-it]'); if (!b) return;
    const again = cur === b.dataset.it && !document.body.classList.contains('mtab-online');
    cur = b.dataset.it; document.body.dataset.it = cur; try { localStorage.setItem(KEY, cur); } catch (x) {}
    // the game's own handler then runs mtab('game') (board view); bring the box into view
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const box = cur === 'eval' ? ev : kf, r = box.getBoundingClientRect();
      if (again && r.top < innerHeight * .5) window.scrollTo({ top: 0, behavior: 'smooth' });   // tap again: back to the board
      else if (r.bottom > innerHeight - 60 || r.top < 0) box.scrollIntoView({ block: 'end', behavior: 'smooth' });
      fix();
    }));
  }, true);
  document.body.dataset.it = cur; document.body.classList.add('it-on'); fix();
}
/* strips (opt-in: <script … data-strips>): games whose two sides sit at the top and bottom of the board (checkers, xiangqi,
   tafl, morris…) — on phones the players card is split: the opponent's cell goes above the board, yours below it,
   so the board itself shows who plays which side and the card above the board disappears. Clocks / online stay in the cells. */
const STRIPS = !!(document.currentScript && document.currentScript.hasAttribute('data-strips'));
const YOU = /あなた|\bYou\b|你|당신|\bTú\b|\bVous\b|\bVocê\b|\bDu\b|आप|أنت/;
const SCSS = `
@media ${MQ}{
  body.ps-on .card.players{display:contents!important}
  html body.ps-on .card.players > .player{order:-2!important;display:flex!important;width:var(--ps-w,100%);max-width:100%;flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:0;padding:6px 12px;border-radius:12px;background:var(--panel,rgba(0,0,0,.25));border:1px solid var(--line,rgba(255,255,255,.1));box-sizing:border-box}
  html body.ps-on .card.players > .player[data-ps=bot]{order:-1!important}
  html body.ps-on .card.players > .player .top{margin:0;min-width:0}
  html body.ps-on .card.players > .player .count{margin:0 0 0 auto!important;flex:none!important;width:auto!important;text-align:right!important;font-size:22px;line-height:1;order:2}
  html body.ps-on .card.players > .player .top{order:1;flex:1 1 auto!important}
  html body.ps-on .card.players > .player .status{order:3}
  html body.ps-on .card.players > .player .status{position:static;margin:0 0 0 auto;font-size:11.5px}
  body.ps-on .card.players > :not(.player){display:none}
}`;
function strips(tries) {
  if (window.__ROTWRAP || window.__EMBED) return;
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
