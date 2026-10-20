/* =====================================================================
   Shogi — portal skin (shogi/?skin=atlas)
   The full shogi page keeps every feature (AI, rated, lessons, tsume, openings,
   rank test, review, online play with the 2D version, chat…). This file:
     • draws the kaya board with the 3D table; the camera is aligned to the DOM
       board, which stays on top (transparent) for clicks, drags and marks
     • swaps the page's pieces for renders of the 3D boxwood pieces with raised
       lacquer (盛り上げ駒, two characters) — on the board, in the hands, while dragging
     • lesson / tsume text → the guide's speech bubble (shared AtlasSkin)
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.shogi || !window.AtlasSkin || typeof window.pieceEl !== 'function') return;
  const SG = T3.shogi, boardDom = document.getElementById('board');
  const board = T3.MODELS.shogi(true), FH = board.userData.S, Y = board.userData.top, OUT = board.userData.outer;

  const skin = AtlasSkin.init({
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-shogi.webp', guideFallback: '../images/atlas/shogi.webp',
    bubbles: [['lsPrompt', 'lsFb']],
    skip: 'sq|\\.pc|hslot|hand|coords|arrows|\\.mark|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof dlg !== 'object' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      dlg.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) dlg.color = side - 1;
      const rng = document.getElementById('rngLevel'); if (rng && lv >= 1) rng.value = Math.min(18, lv - 1);
      updDialog(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('shogi', board, { still: true });
  T3.align(() => { const r = boardDom.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, FH, Y);

  /* ---------- pieces: renders of the 3D pieces ---------- */
  document.documentElement.classList.add('atlas-shogi');
  const orig = window.pieceEl;
  let IMG = null;
  window.pieceEl = function (code, promoted) {
    const el = orig(code, promoted);
    if (!IMG) return el;
    try {
      const tp = E.typeOf(code), col = E.colorOf(code), up = (col === 1) !== flip;
      const src = IMG['k' + tp + (tp === 8 && col === 1 ? 'o' : '')]; if (!src) return el;
      el.classList.add('img', 'atlas3d'); el.classList.remove('g', 'has-intl');
      const k = el.querySelector('.k'); k.innerHTML = `<img src="${src}" alt="" draggable="false"${up ? ' class="up"' : ''}>`;
    } catch (e) {}
    return el;
  };
  // pre-rendered sheet of the 3D pieces (images/atlas/shogi-pieces.png, made with Table3D.shogi.images); live render as fallback
  const sheet = () => new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    const out = {}, keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k8o'];
    keys.forEach((k, i) => { const c = document.createElement('canvas'); c.width = 256; c.height = 282; c.getContext('2d').drawImage(im, (i % 5) * 256, (i / 5 | 0) * 282, 256, 282, 0, 0, 256, 282); out[k] = c.toDataURL('image/png'); });
    res(out); }; im.onerror = rej; im.src = '../images/atlas/shogi-pieces.png?v=1'; });
  sheet().catch(() => SG.images(256)).then(o => {
    IMG = o;
    try { renderBoard(false); renderHands(); } catch (e) {}
  });
})();
