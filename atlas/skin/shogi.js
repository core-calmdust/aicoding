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
    margin: 0.2,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit). The komadai stand against the 3D board's frame with
    // the 2D page's gap (.22 cell — the gote side of the 2D board), both sides the same: gote's top level with the frame's top,
    // sente's bottom level with its bottom
    pc: { vars: ['--cw'], extras: '.board-area > .hand',
      place(F) {
        const top = document.getElementById('handTop'), bot = document.getElementById('handBottom'); if (!top || !bot) return;
        const G = top.offsetWidth / 1.25 * .22;
        const put = (h, x, y) => {   // move the box by (x, y) from where it is now (position: relative)
          const cs = getComputedStyle(h), l = parseFloat(cs.left) || 0, t = parseFloat(cs.top) || 0;
          if (Math.abs(x) > .3) h.style.setProperty('left', (l + x) + 'px', 'important');
          if (Math.abs(y) > .3) h.style.setProperty('top', (t + y) + 'px', 'important');
        };
        let r = top.getBoundingClientRect(); put(top, F.l - G - r.right, F.t - r.top);
        r = bot.getBoundingClientRect(); put(bot, F.r + G - r.left, F.b - r.bottom);
      },
      unplace() { ['handTop', 'handBottom'].forEach(id => { const h = document.getElementById(id); if (h) { h.style.removeProperty('left'); h.style.removeProperty('top'); } }); } },
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-shogi.webp', guideFallback: '../images/atlas/shogi.webp',
    bubbles: [['lsPrompt', 'lsFb']], floor: 'tatami',
    skip: 'sq|\\.pc|hslot|hand|coords|arrows|\\.mark|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof dlg !== 'object' || !document.getElementById('btnStart')) return null;
      if (mode === 'puzzle' || mode === 'lesson') {   // the portal's 「あそぶ」 sheet: straight to 詰将棋 / the lessons (2026-11-09)
        if (typeof openLessons !== 'function') return null;
        lsTab = mode === 'puzzle' ? 'tsume' : 'lesson'; openLessons(); return true;
      }
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

  /* ---------- komadai: a light kaya wood-grain texture (procedural, drawn once; skin.css uses --kdwood / --kdwoodh) ---------- */
  try {
    const paint = (W, H, along) => {   // along: 'y' = grain runs down the stand (PC, upright stands), 'x' = across (phones, flat bars)
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'), L = along === 'y' ? H : W, A = along === 'y' ? W : H;
      const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#ecc98e'); bg.addColorStop(.5, '#e2b877'); bg.addColorStop(1, '#d6a565');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      // straight grain with a slow wave, a few darker late-wood lines
      for (let i = 0; i < 70; i++) {
        const a0 = rnd() * A, amp = 2 + rnd() * 5, f = .004 + rnd() * .01, ph = rnd() * 6.28, dark = rnd() < .22;
        x.strokeStyle = dark ? `rgba(150,92,38,${.03 + rnd() * .03})` : `rgba(170,112,52,${.015 + rnd() * .02})`;   // (faint: the stand stays quiet, 2026-11-10)
        x.lineWidth = dark ? 1 + rnd() * 1.6 : .5 + rnd() * .8;
        x.beginPath();
        for (let t = 0; t <= L; t += 8) { const a = a0 + Math.sin(t * f + ph) * amp; const px = along === 'y' ? a : t, py = along === 'y' ? t : a; t ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
      }
      // soft sheen + darker edges, like the lit board
      const sh = along === 'y' ? x.createLinearGradient(0, 0, W, 0) : x.createLinearGradient(0, 0, 0, H);
      sh.addColorStop(0, 'rgba(110,60,15,.18)'); sh.addColorStop(.18, 'rgba(255,240,210,.10)'); sh.addColorStop(.6, 'rgba(255,240,210,0)'); sh.addColorStop(1, 'rgba(110,60,15,.16)');
      x.fillStyle = sh; x.fillRect(0, 0, W, H);
      return `url(${c.toDataURL('image/jpeg', .85)})`;
    };
    const de = document.documentElement;
    de.style.setProperty('--kdwood', paint(192, 512, 'y'));
    de.style.setProperty('--kdwoodh', paint(640, 96, 'x'));
    // a stand wider than tall (phone layouts) takes the horizontal grain
    const fitKd = () => document.querySelectorAll('.hand').forEach(h => { const r = h.getBoundingClientRect(); h.classList.toggle('kd-wide', r.width > r.height); });
    addEventListener('resize', () => requestAnimationFrame(fitKd)); setTimeout(fitKd, 0); setTimeout(fitKd, 800);
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => requestAnimationFrame(fitKd)); document.querySelectorAll('.hand').forEach(h => ro.observe(h)); }
  } catch (e) {}

  /* ---------- pieces: renders of the 3D pieces ---------- */
  document.documentElement.classList.add('atlas-shogi');
  const orig = window.pieceEl;
  let IMG = null;
  // the portal's raised-lacquer pieces are the default; the game's own piece sets stay selectable
  const PCK = 'atlas-shogi-pc';
  let mine = true; try { mine = localStorage.getItem(PCK) !== '0'; } catch (e) {}
  const LBL = { ja: '盛り上げ（立体）', en: 'Raised lacquer 3D', zh: '漆雕（立体）', ko: '옻칠 입체', es: 'Laca en relieve 3D', fr: 'Laque en relief 3D', pt: 'Laca em relevo 3D', de: 'Lack-Relief 3D', hi: 'उभरी लाह 3D', ar: 'ورنيش بارز ثلاثي', ru: 'Рельефный лак 3D', 'zh-TW': '高蒔繪3D', id: '3D pernis timbul', tr: 'Kabartma lake 3D' };
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
  // 3D / 2D (the standard of the other games, 2026-11-10): a 「3D」 tile first in the board row; a 2D board picked = the 2D page
  const V = skin.view ? skin.view({ key: 'atlas-shogi-view', row: document.getElementById('segSkin'), img: '../images/atlas/shogi.webp',
    on() { setTimeout(() => { try { look(); renderBoard(false); renderHands(); } catch (e) {} }, 0); } }) : null;
  const is3 = () => !V || V.is3d();
  function look() {   // selection mark, board tone and piece tone follow the game's skin setting
    if (seg) seg.querySelectorAll('button').forEach(x => { if (mine) x.classList.toggle('sel', x.dataset.v === 'atlas3d'); else if (x.dataset.v === 'atlas3d') x.classList.remove('sel'); });
    // the 3D board is chosen on its own (the 「3D」 tile): it is always 本榧 — a 2D board picked before (漆黒 …) no longer tints it (2026-11-10)
    const sk = 'kaya';
    if (board.userData.setTone) board.userData.setTone(sk);
    if (T3.kick) T3.kick(400);
    ['metal', 'ink', 'grain'].forEach(k => document.documentElement.classList.toggle('atlas-sk-' + k, sk === k));
  }
  if (typeof window.applyLook === 'function') { const oa = window.applyLook; window.applyLook = function () { const r = oa.apply(this, arguments); try { look(); } catch (e) {} return r; }; }
  setTimeout(look, 0);
  window.pieceEl = function (code, promoted) {
    const el = orig(code, promoted);
    if (!IMG || !mine || !is3()) return el;
    try {
      const tp = E.typeOf(code), col = E.colorOf(code), up = (col === 1) !== flip;
      const src = IMG['k' + tp + (tp === 8 && col === 1 ? 'o' : '')]; if (!src) return el;
      el.classList.add('img', 'atlas3d'); el.classList.remove('g', 'has-intl');
      const k = el.querySelector('.k'); k.innerHTML = `<img src="${src}" alt="" draggable="false"${up ? ' class="up"' : ''}>`;
      // the face's fine wood grain, as on the page's image sets (its own patch per kind and side)
      const gi = tp * 2 + (up ? 1 : 0); k.classList.toggle('up', up);
      k.style.setProperty('--pm', `url("${src}")`); k.style.setProperty('--gp', `${(gi * 37) % 100}% ${(gi * 61) % 100}%`); k.style.setProperty('--gs', `${60 + (gi * 29) % 30}%`);
    } catch (e) {}
    return el;
  };
  // pre-rendered sheet of the 3D pieces (images/atlas/shogi-pieces.png, made with Table3D.shogi.images); live render as fallback
  const sheet = () => new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    const out = {}, keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k8o'];
    keys.forEach((k, i) => { const c = document.createElement('canvas'); c.width = 256; c.height = 282; c.getContext('2d').drawImage(im, (i % 5) * 256, (i / 5 | 0) * 282, 256, 282, 0, 0, 256, 282); out[k] = c.toDataURL('image/png'); });
    res(out); }; im.onerror = rej; im.src = '../images/atlas/shogi-pieces.png?v=2'; });
  sheet().catch(() => SG.images(256)).then(o => {
    IMG = o;
    window.__shogiAtlasPre = Object.values(o).map(src => { const im = new Image(); im.src = src; if (im.decode) im.decode().catch(() => {}); return im; });   // decoded up front: promotions show at once
    try { renderBoard(false); renderHands(); } catch (e) {}
  });
})();
