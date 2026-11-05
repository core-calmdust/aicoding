/* =====================================================================
   Reversi — portal skin (reversi/?skin=atlas)
   The full Reversi V4 page keeps all of its features (AI, lessons, openings,
   puzzles, daily, rated, review, online play with the 2D version, chat…).
   This file only:
     • draws the board with the 3D table, the camera aligned to the DOM board
       (the DOM board stays on top, transparent, for clicks / hints / marks)
     • mirrors every disc change (setDisc) into 3D discs with real flips
     • turns lesson / puzzle text into the guide character's speech bubbles
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !window.AtlasSkin || typeof window.setDisc !== 'function') return;
  document.documentElement.classList.add('atlas-reversi');
  const boardDom = document.getElementById('board');
  const board = T3.MODELS.reversi(true), S = board.userData.S, Y = board.userData.top;
  const skin = AtlasSkin.init({
    hold: true,   // 盤面反転: the 3D stones keep the board's own places — the table stays turned round while flipped
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    pc: { vars: ['--board'] },   // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit)
    outer: r => { const H = r.height * (S + 1.1) / S; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // bezel to bezel
    guide: '../images/atlas/g-disc.webp', guideFallback: '../images/atlas/reversi.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    start(lv, side, mode) {
      if (typeof openNew !== 'function' || typeof draft !== 'object' || !document.getElementById('btnStart')) return null;
      openNew(); draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (lv >= 1 && lv <= 20) draft.level = lv;
      if (side === 1 || side === 2) draft.color = side;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('reversi', board, { still: true });
  skin.alignTo(S, Y);
  // デザイン: "3D board" first in the board row, or one of the game's own 2D boards (shown as the plain 2D page)
  if (skin.view) skin.view({ key: 'atlas-reversi-view', row: document.getElementById('bdRow'), img: '../images/atlas/reversi.webp' });

  /* ---------- 3D discs mirrored from the page's setDisc() ---------- */
  const RM = T3.rvMats(), DH = T3.rvDisc.H / 2;   // flat, matte Othello discs (centre DH above the felt)
  const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
  const discs = {};
  const anim = (dur, f, done) => { T3.kick(dur + 200); const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) { T3.kick(150); requestAnimationFrame(s); } else { T3.kick(150); if (done) done(); } })(t0); };
  function make(sq, color) {
    const inner = new THREE.Group(); inner.add(T3.rvDisc(RM)); const outer = new THREE.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -DH + .002; outer.add(ao);
    const [x, z] = pos(sq); outer.position.set(x, Y + DH, z); inner.rotation.x = color === 1 ? Math.PI : 0;
    board.add(outer); return (discs[sq] = { outer, inner, color });
  }
  function mirror(s, color, a) {
    const d = discs[s];
    if (!color) { if (d) { board.remove(d.outer); delete discs[s]; T3.kick(200); } return; }
    if (!d) { T3.kick(400); const n = make(s, color); if (a === 'drop') anim(260, k => { n.outer.position.y = Y + DH + (1 - k) * (1 - k) * 2.2; }); return; }
    if (d.color === color) return;
    d.color = color;
    const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
    if (typeof a === 'number' && a >= 0) setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + DH + Math.sin(k * Math.PI) * .7; }), a);
    else d.inner.rotation.x = to;
    T3.kick(300);
  }
  const orig = window.setDisc;
  window.setDisc = function (s, color, a) { orig(s, color, a); try { mirror(s, color, a); } catch (e) {} };
  try { const c = window.positions && window.positions[window.cur] && window.positions[window.cur].cells; if (c) for (let s = 0; s < 64; s++) if (c[s]) mirror(s, c[s], false); } catch (e) {}
  // the page script may have drawn discs before we hooked in: sync from the DOM too
  document.querySelectorAll('#board .cell').forEach((cell, s) => { const w = cell.querySelector('.disc'); if (w && !discs[s]) mirror(s, w.classList.contains('white') ? 2 : 1, false); });
})();
