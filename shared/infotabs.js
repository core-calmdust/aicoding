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
const MQ = '(pointer: coarse) and (max-width: 760px)';
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
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(0)); else init(0);
})();
