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
  let board = T3.MODELS.shogi(true), FH = board.userData.S, Y = board.userData.top, OUT = board.userData.outer;

  const skin = AtlasSkin.init({
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-shogi.webp', guideFallback: '../images/atlas/shogi.webp',
    bubbles: [['lsPrompt', 'lsFb']], floor: 'tatami',
    skip: 'sq|\\.pc|hslot|hand|coords|arrows|\\.mark|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof dlg !== 'object' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      dlg.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      { const vq = new URLSearchParams(location.search).get('variant'); if (vq && 'variant' in dlg && dlg.mode !== 'rated') dlg.variant = vq === 'mini' || vq === 'hasami' ? vq : ''; }
      if (side === 1 || side === 2) dlg.color = side - 1;
      const rng = document.getElementById('rngLevel'); if (rng && lv >= 1) rng.value = Math.min(18, lv - 1);
      updDialog(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('shogi', board, { still: true });
  skin.alignTo(FH, Y);
  // 5五将棋 (shogi/variants/): the page switches its board to 5×5 → a 5×5 kaya board, the camera fitted to it again
  let boardN = 9;
  function setBoard(n) {
    if (n === boardN) return; boardN = n;
    board = T3.MODELS.shogi(true, { n }); FH = board.userData.S; Y = board.userData.top; OUT = board.userData.outer;
    T3.show('shogi', board, { still: true }); skin.alignTo(FH, Y);
    try { look(); } catch (e) {}
    if (T3.kick) T3.kick(600);
  }
  document.addEventListener('shogi-geom', e => { try { setBoard(e.detail && e.detail.n === 5 ? 5 : 9); } catch (x) { console.warn(x); } });
  { const b0 = document.getElementById('board'); if (b0 && b0.classList.contains('v5')) setBoard(5); }

  /* ---------- pieces: renders of the 3D pieces ---------- */
  document.documentElement.classList.add('atlas-shogi');
  const orig = window.pieceEl;
  let IMG = null;
  // the portal's raised-lacquer pieces are the default; the game's own piece sets stay selectable
  const PCK = 'atlas-shogi-pc';
  let mine = true; try { mine = localStorage.getItem(PCK) !== '0'; } catch (e) {}
  const LBL = { ja: '盛り上げ（立体）', en: 'Raised lacquer 3D', zh: '漆雕（立体）', ko: '옻칠 입체', es: 'Laca en relieve 3D', fr: 'Laque en relief 3D', pt: 'Laca em relevo 3D', de: 'Lack-Relief 3D', hi: 'उभरी लाह 3D', ar: 'ورنيش بارز ثلاثي' };
  const seg = document.getElementById('segPieces');
  if (seg) {
    const b = document.createElement('button'); b.dataset.v = 'atlas3d'; seg.prepend(b);
    const paintLbl = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', nm = b.querySelector('.nm'); (nm || b).textContent = LBL[l] || LBL.en; };   // (.nm: the tile with its picture, shogi/index.html designThumbs)
    paintLbl(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintLbl, 30));
    seg.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      mine = t.dataset.v === 'atlas3d'; try { localStorage.setItem(PCK, mine ? '1' : '0'); } catch (x) {}
      if (mine) { e.stopImmediatePropagation(); look(); try { renderBoard(false); renderHands(); } catch (x) {} }
    }, true);
  }
  function look() {   // selection mark, board tone and piece tone follow the game's skin setting
    if (seg) seg.querySelectorAll('button').forEach(x => { if (mine) x.classList.toggle('sel', x.dataset.v === 'atlas3d'); else if (x.dataset.v === 'atlas3d') x.classList.remove('sel'); });
    let sk = 'classic'; try { sk = settings.skin || 'classic'; } catch (e) {}
    if (board.userData.setTone) board.userData.setTone(sk);
    if (T3.kick) T3.kick(400);
    ['metal', 'ink', 'grain'].forEach(k => document.documentElement.classList.toggle('atlas-sk-' + k, sk === k));
  }
  if (typeof window.applyLook === 'function') { const oa = window.applyLook; window.applyLook = function () { const r = oa.apply(this, arguments); try { look(); } catch (e) {} return r; }; }
  setTimeout(look, 0);
  window.pieceEl = function (code, promoted) {
    const el = orig(code, promoted);
    if (!IMG || !mine) return el;
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
