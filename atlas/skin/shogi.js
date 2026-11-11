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
  const tsSolo = () => document.body.classList.contains('ts-noopp');   // 詰将棋: gote's stand hidden
  let board = T3.MODELS.shogi(true), FH = board.userData.S, Y = board.userData.top, OUT = board.userData.outer;

  // PC windows up to 3:2 (shogi/index.html, 2026-11-11): the komadai as bars above and below the board, as on phones
  const STK = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4) and (max-aspect-ratio: 3/2)');
  const skin = AtlasSkin.init({
    margin: 0.2,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit). The komadai stand against the 3D board's frame with
    // the 2D page's gap (.22 cell — the gote side of the 2D board), both sides the same: gote's top level with the frame's top,
    // sente's bottom level with its bottom
    pc: { vars: ['--cw'], extras: '.board-area > .hand', fit2d: true, k2d: { l: .0506, r: .0511, t: .0502, b: .0516 },   // (the 2D board: laid out exactly as the 3D one)
      place(F) {
        const top = document.getElementById('handTop'), bot = document.getElementById('handBottom'); if (!top || !bot) return;
        if (STK.matches && extW && is3()) {   // the 3D board made deeper for them (setBoard ext): the bars exactly on that wood, see-through
          const r0 = boardDom.getBoundingClientRect(), u = r0.height / FH, mg = board.userData.mg || .5, w = (r0.width + 2 * mg * u).toFixed(1) + 'px', hh = (extW * u).toFixed(1) + 'px';
          [top, bot].forEach(h => { if (h.style.getPropertyValue('width') !== w) h.style.setProperty('width', w, 'important'); if (h.style.getPropertyValue('height') !== hh) h.style.setProperty('height', hh, 'important'); });
          const mv = (h, x, y) => { const cs = getComputedStyle(h), l = parseFloat(cs.left) || 0, t = parseFloat(cs.top) || 0;
            if (Math.abs(x) > .3) h.style.setProperty('left', (l + x) + 'px', 'important'); if (Math.abs(y) > .3) h.style.setProperty('top', (t + y) + 'px', 'important'); };
          const r1 = boardDom.getBoundingClientRect(), L = r1.left - mg * u;
          let r = top.getBoundingClientRect(); if (r.width) mv(top, L - r.left, r1.top - mg * u - r.bottom);
          r = bot.getBoundingClientRect(); mv(bot, L - r.left, r1.bottom + mg * u - r.top);
          return;
        }
        if (STK.matches) {   // a PC window up to 3:2: the bars above and below the frame, its full width, touching it (the 2D board: its plate runs on under them)
          const o = is3() ? 13 : 0, w = (F.r - F.l).toFixed(1) + 'px', de = document.documentElement;
          [top, bot].forEach(h => { if (h.style.getPropertyValue('width') !== w) h.style.setProperty('width', w, 'important'); });
          const mv = (h, x, y) => { const cs = getComputedStyle(h), l = parseFloat(cs.left) || 0, t = parseFloat(cs.top) || 0;
            if (Math.abs(x) > .3) h.style.setProperty('left', (l + x) + 'px', 'important'); if (Math.abs(y) > .3) h.style.setProperty('top', (t + y) + 'px', 'important'); };
          let r = top.getBoundingClientRect(); if (r.width) mv(top, F.l - r.left, F.t + o - r.bottom);
          r = bot.getBoundingClientRect(); mv(bot, F.l - r.left, F.b - o - r.top);
          de.style.setProperty('--kdth', top.offsetHeight + 'px'); de.style.setProperty('--kdbh', bot.offsetHeight + 'px');   // (the 2D designs: the plate runs on under the bars)
          return;
        }
        const G = (top.offsetWidth || bot.offsetWidth) / 1.25 * .22;   // (詰将棋 hides gote's stand: sente's gives the width)
        const put = (h, x, y) => {   // move the box by (x, y) from where it is now (position: relative)
          const cs = getComputedStyle(h), l = parseFloat(cs.left) || 0, t = parseFloat(cs.top) || 0;
          if (Math.abs(x) > .3) h.style.setProperty('left', (l + x) + 'px', 'important');
          if (Math.abs(y) > .3) h.style.setProperty('top', (t + y) + 'px', 'important');
        };
        let r = top.getBoundingClientRect(); put(top, F.l - G - r.right, F.t - r.top);
        if (tsSolo()) return;   // (詰将棋: sente's stand goes under the column — afterSide)
        r = bot.getBoundingClientRect(); put(bot, F.r + G - r.left, F.b - r.bottom);
      },
      // 詰将棋 (gote's stand hidden, body.ts-noopp): sente's stand stands under the column, its left edge on the column's and its
      // bottom on the frame's — the board takes the width the stands had (2026-11-10)
      sideOnExtent: () => STK.matches,
      k2dFix: (m, md) => { const e = md && md.userData && md.userData.ext, S = md && md.userData && md.userData.S; if (!e || !S) return m; return { ...m, t: m.t - e / S, b: m.b - e / S }; },
      extraOff: e => tsSolo() && !STK.matches && e.id === 'handBottom',
      afterSide(F, sr) {
        const bot = document.getElementById('handBottom'); if (!bot || !tsSolo() || STK.matches) return;
        const cs = getComputedStyle(bot), r = bot.getBoundingClientRect(), l = parseFloat(cs.left) || 0, t = parseFloat(cs.top) || 0;
        bot.style.setProperty('left', (l + sr.left - r.left) + 'px', 'important'); bot.style.setProperty('top', (t + F.b - r.bottom) + 'px', 'important');
      },
      unplace() { ['handTop', 'handBottom'].forEach(id => { const h = document.getElementById(id); if (h) { h.style.removeProperty('left'); h.style.removeProperty('top'); h.style.removeProperty('width'); h.style.removeProperty('height'); } }); } },
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-shogi.webp', guideFallback: '../images/atlas/shogi.webp',
    bubbles: [['lsPrompt', 'lsFb']], floor: 'tatami',
    skip: 'sq|\\.pc|hslot|hand|coords|arrows|\\.mark|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof dlg !== 'object' || !document.getElementById('btnStart')) return null;
      // the portal's card / 「あそぶ」 sheet: straight to 詰将棋 / the lessons / a rated game (shogi/index.html AtlasDeep)
      if (/^(puzzle|lesson|online)$/.test(mode) || (mode === 'rated' && new URLSearchParams(location.search).get('tc'))) {
        if (!window.AtlasDeep) return null;
        const q = new URLSearchParams(location.search), r = AtlasDeep(mode, q.get('sub'), q.get('tc'));
        return r;
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
  let boardN = 9, cropK = '', variantN = 9, extW = 0, curCrop = null;
  // crop {n, c0, r0}: 詰将棋's close-up (shogi/index.html tzStyle) — an n×n kaya board cut from the whole one
  // ext: the PC layout up to 3:2 (STK) — the 3D board made deeper at the top and the bottom by the komadai bars' height, so the bars
  // lie on the board's own wood (one block, no joint to see — 2026-11-11)
  const curLook = () => T3.BOARDS && T3.BOARDS.shogi ? T3.BOARDS.shogi.get() : 'kaya';   // the six 3D boards (2026-11-11)
  function setBoard(n, crop, ext = extW) {
    const ck = (crop ? crop.n + ':' + crop.c0 + ':' + crop.r0 : '') + '|' + ext + '|' + curLook();
    if (n === boardN && ck === cropK) return; boardN = n; cropK = ck; curCrop = crop || null; extW = ext;
    board = T3.MODELS.shogi(true, crop ? { n: crop.n, crop, ext } : { n, ext }); FH = board.userData.S; Y = board.userData.top; OUT = board.userData.outer;
    T3.show('shogi', board, { still: true }); skin.alignTo(FH, Y);
    try { look(); } catch (e) {}
    if (T3.kick) T3.kick(600);
  }
  document.addEventListener('shogi-geom', e => { try { variantN = e.detail && e.detail.n === 5 ? 5 : 9; setBoard(variantN); setTimeout(syncExt, 120); } catch (x) { console.warn(x); } });
  document.addEventListener('shogi-crop', e => { try { const c = e.detail; if (c) setBoard(c.n, c); else setBoard(variantN); setTimeout(syncExt, 120); } catch (x) { console.warn(x); } });
  // the depth the bars need, in board units (rounded: the model is not rebuilt for a fraction of a px); 0 = the board as it is
  function wantExt() {
    if (!STK.matches || !is3()) return 0;
    const r = boardDom.getBoundingClientRect(), h = (document.getElementById('handBottom') || {}).offsetHeight || 0;
    if (r.height < 40 || !h) return extW;
    return Math.round(h / (r.height / FH) * 20) / 20;
  }
  function syncExt() { try { const e = wantExt(); if (e !== extW) setBoard(boardN, curCrop, e); } catch (x) { console.warn(x); } }
  STK.addEventListener ? STK.addEventListener('change', () => setTimeout(syncExt, 60)) : STK.addListener(() => setTimeout(syncExt, 60));
  addEventListener('resize', () => setTimeout(syncExt, 200)); [500, 1500, 3500].forEach(ms => setTimeout(syncExt, ms));
  { const b0 = document.getElementById('board'); if (b0 && b0.classList.contains('v5')) setBoard(variantN = 5); if (window.__tzCrop) setBoard(window.__tzCrop.n, window.__tzCrop); }

  /* ---------- komadai: a light kaya wood-grain texture (procedural, drawn once; skin.css uses --kdwood / --kdwoodh) ---------- */
  try {
    const paint = (W, H, along) => {   // along: 'y' = grain runs down the stand (PC, upright stands), 'x' = across (phones, flat bars)
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'), L = along === 'y' ? H : W, A = along === 'y' ? W : H;
      const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#dabda1'); bg.addColorStop(.5, '#cfae8d'); bg.addColorStop(1, '#c4a07b');
      x.fillStyle = bg; x.fillRect(0, 0, W, H);
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      // straight grain with a slow wave, a few darker late-wood lines
      for (let i = 0; i < 70; i++) {
        const a0 = rnd() * A, amp = 2 + rnd() * 5, f = .004 + rnd() * .01, ph = rnd() * 6.28, dark = rnd() < .22;
        x.strokeStyle = dark ? `rgba(151,103,58,${.03 + rnd() * .03})` : `rgba(162,115,69,${.015 + rnd() * .02})`;   // (faint: the stand stays quiet, 2026-11-10)
        x.lineWidth = dark ? 1 + rnd() * 1.6 : .5 + rnd() * .8;
        x.beginPath();
        for (let t = 0; t <= L; t += 8) { const a = a0 + Math.sin(t * f + ph) * amp; const px = along === 'y' ? a : t, py = along === 'y' ? t : a; t ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
      }
      // soft sheen + darker edges, like the lit board
      const sh = along === 'y' ? x.createLinearGradient(0, 0, W, 0) : x.createLinearGradient(0, 0, 0, H);
      sh.addColorStop(0, 'rgba(114,71,31,.18)'); sh.addColorStop(.18, 'rgba(239,231,221,.10)'); sh.addColorStop(.6, 'rgba(239,231,221,0)'); sh.addColorStop(1, 'rgba(114,71,31,.16)');
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

  /* ---------- phones (portrait), the 3D board: the komadai bars exactly on the 3D board's edges (2026-11-11) ----------
     the 3D board is drawn a little past the DOM board (__atlasPcFit.K: overhang per side, in board heights) */
  (function barsOnEdge() {
    const MQ = matchMedia('(pointer: coarse) and (max-aspect-ratio: 1/1) and (max-width: 600px)');
    const fit = () => {
      const top = document.getElementById('handTop'), bot = document.getElementById('handBottom'), bd = document.getElementById('board');
      if (!top || !bot || !bd) return;
      if (STK.matches) return;   // (PC: pcFit's place() lays the bars)
      const on = MQ.matches && !document.documentElement.classList.contains('atlas-land');   // (3D and the 2D designs alike: both are laid out with the same overhang)
      [top, bot].forEach(h => ['margin-left', 'width', 'margin-top', 'margin-bottom', 'transform'].forEach(k => h.style.removeProperty(k)));
      const de = document.documentElement; de.style.removeProperty('--kdth'); de.style.removeProperty('--kdbh');
      if (!on) return;
      let K = null; try { const pf = window.__atlasPcFit; K = pf && pf.K && pf.K(); } catch (e) {}
      if (!K) return;
      const r = bd.getBoundingClientRect(); if (!r.width) return;
      { const de = document.documentElement; ['l', 't', 'r', 'b'].forEach(k => de.style.setProperty('--k2' + k, (K[k] * r.height).toFixed(1) + 'px')); }   // (the 2D designs' plate: the same overhang as the 3D board, on phones too)
      const L = r.left - K.l * r.height, R = r.right + K.r * r.height, T = r.top - K.t * r.height, B = r.bottom + K.b * r.height;
      [top, bot].forEach(h => { const hr = h.getBoundingClientRect(); h.style.setProperty('margin-left', (parseFloat(getComputedStyle(h).marginLeft) + L - hr.left).toFixed(1) + 'px', 'important'); h.style.setProperty('width', (R - L).toFixed(1) + 'px', 'important'); });
      { const rb = bd.getBoundingClientRect(), T = rb.top - K.t * rb.height + (is3() ? 13 : 0), tr = top.getBoundingClientRect(); top.style.setProperty('transform', 'translateY(' + (T - tr.bottom).toFixed(1) + 'px)', 'important'); }   // (a margin would move the board with it)
      de.style.setProperty('--kdth', top.offsetHeight + 'px'); de.style.setProperty('--kdbh', bot.offsetHeight + 'px');   // (the 2D designs paint one slab under bars and board)
      const r2 = bd.getBoundingClientRect(), B2 = r2.bottom + K.b * r2.height - (is3() ? 13 : 0), br = bot.getBoundingClientRect(); bot.style.setProperty('margin-top', (parseFloat(getComputedStyle(bot).marginTop) + B2 - br.top).toFixed(1) + 'px', 'important');
    };
    // (only when the board actually moved / changed size: the phone toolbar sliding in and out must not re-lay the bars every frame)
    let q = 0, last = ''; const later = () => { if (q) return; q = 1; requestAnimationFrame(() => { q = 0; const bd = document.getElementById('board'); if (!bd) return; const r = bd.getBoundingClientRect(), k = [r.width, r.height, r.left, r.top].map(v => Math.round(v)).join(',') + (is3() ? '3' : '2') + document.body.className; if (k === last) return; last = k; fit(); }); };
    addEventListener('resize', later); [300, 900, 2000, 4000].forEach(ms => setTimeout(fit, ms));
    if (window.ResizeObserver) { const ro = new ResizeObserver(later); const bd = document.getElementById('board'); if (bd) ro.observe(bd); }
    window.__kdFit = fit;
  })();

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
  const V = skin.view ? skin.view({ key: 'atlas-shogi-view', img: '../images/atlas/shogi.webp',   // (no 3D tile in the 盤面 row: the 3D boards have their own 「3D盤」 box, 2026-11-11)
    on() { setTimeout(() => { try { look(); renderBoard(false); renderHands(); } catch (e) {} syncExt(); }, 0); [60, 400, 1000].forEach(ms => setTimeout(() => { try { window.__kdFit && window.__kdFit(); } catch (e) {} }, ms)); } }) : null;   // (2D ↔ 3D: the komadai bars re-fitted to the new board)
  const is3 = () => !V || V.is3d();
  function look() {   // selection mark, board tone and piece tone follow the game's skin setting
    if (seg) seg.querySelectorAll('button').forEach(x => { if (mine) x.classList.toggle('sel', x.dataset.v === 'atlas3d'); else if (x.dataset.v === 'atlas3d') x.classList.remove('sel'); });
    // the 3D board is chosen on its own (the 「3D」 tile): it is always 本榧 — a 2D board picked before (漆黒 …) no longer tints it (2026-11-10)
    const sk = 'kaya';
    if (board.userData.setTone) board.userData.setTone('classic');   // (the same tone as the 大百科's 3D view — ちゃぶ台 — 2026-11-10)
    if (T3.kick) T3.kick(400);
    ['metal', 'ink', 'grain'].forEach(k => document.documentElement.classList.toggle('atlas-sk-' + k, sk === k));
    // the page's own board classes (body.skin-*: piece colours / filters of メタル・漆黒…): the 3D board shows the 本榧 pieces whatever
    // 2D board was picked before; the 2D board, the one picked (2026-11-10: メタル → 3D left the pieces grey)
    try { const real = typeof settings === 'object' && settings ? settings.skin : 'kaya', eff = is3() ? 'kaya' : real;
      ['grain', 'kaya', 'metal', 'ink'].forEach(k => document.body.classList.toggle('skin-' + k, eff === k)); } catch (e) {}
  }
  if (typeof window.applyLook === 'function') { const oa = window.applyLook; window.applyLook = function () { const r = oa.apply(this, arguments); try { look(); } catch (e) {} [60, 400].forEach(ms => setTimeout(() => { try { window.__kdFit && window.__kdFit(); } catch (e) {} }, ms)); return r; }; }
  setTimeout(look, 0);

  /* ---------- 3D盤 (2026-11-11): six boards in a 「3D盤」 box under the 2D boards (the standard, atlas/skin/konane.js) ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || 'ja');
  function standLook() {   // the page's stands (DOM) wear the board's own wood / lacquer
    const k = curLook(); ['makie', 'grain', 'ink', 'yosegi', 'sakura'].forEach(x => document.documentElement.classList.toggle('atlas-shbd-' + x, k === x));
    const src = SG.standImg && SG.standImg(k); document.documentElement.style.setProperty('--shstand', src ? `url("${src}")` : 'none');
  }
  function setLook(k) {
    if (!T3.BOARDS || !T3.BOARDS.shogi) return;
    if (T3.setBoard) T3.setBoard('shogi', k); else T3.BOARDS.shogi.set(k);
    if (V && !V.is3d()) V.set(true);
    standLook(); setBoard(boardN, curCrop, extW); paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS && T3.BOARDS.shogi; if (!f3 || !B) return;
    const l = lng(), cur = B.get(), on = is3();
    f3.querySelector('label').textContent = T3L[l] || T3L.en;
    const row = f3.querySelector('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('shogi', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l, 'shogi') : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('segSkin');   // 3D chosen: no 2D board shows as selected
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
    const now = document.getElementById('skNow'); if (now && on && T3.boardName) now.textContent = '3D · ' + T3.boardName(cur, l, 'shogi');
    // 3D駒: the six sets of the raised-lacquer pieces (selected while the page shows the 3D pieces)
    const P = T3.PIECES && T3.PIECES.shogi, pr = f3.querySelector('.bdrow.pc3'), pl = f3.querySelector('label.pc3l');
    if (P && pr) {
      pl.textContent = PCL[l] || PCL.en;
      if (!pr.children.length) P.list.forEach(k => { const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.pc = k; const im = document.createElement('img'); im.src = P.thumb(k); im.alt = ''; im.draggable = false; bt.append(im, document.createElement('span')); bt.onclick = () => setPcSet(k); pr.appendChild(bt); });
      const pc = P.get(); pr.querySelectorAll('button').forEach(bt => { const k = bt.dataset.pc, sel = mine && pc === k; bt.querySelector('span').textContent = T3.pieceName ? T3.pieceName('shogi', k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    }
  }
  const PCL = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Steine', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фигуры', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  function setPcSet(k) {
    if (T3.setPieces) T3.setPieces('shogi', k); else if (T3.PIECES && T3.PIECES.shogi) T3.PIECES.shogi.set(k);
    mine = true; try { localStorage.setItem(PCK, '1'); } catch (e) {}
    if (V && !V.is3d()) V.set(true);
    try { look(); } catch (e) {}
    if (window.__shogiPcSet) window.__shogiPcSet();
    paint3();
  }
  {
    const r2 = document.getElementById('segSkin'), fd = r2 && r2.closest('.field');
    if (fd) {
      const st = document.createElement('style');
      st.textContent = `html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f7efe1;border:2px solid #e3cfa6}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:14px;color:#7a4e1c;margin:0 0 8px}
html.atlas-skin #f3D .bdrow{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:8px}
#newOverlay > .modal.ngl.ngt-pc[data-ngt=design] [data-ng=design] #f3D .bdrow{grid-template-columns:repeat(6,minmax(0,1fr))!important}
@media (max-width:760px){html.atlas-skin #f3D .bdrow{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
html.atlas-skin #f3D .bdrow button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px 7px;border-radius:12px;border:2px solid transparent;background:#fffaf0;cursor:pointer;font:600 13px/1.25 inherit;color:#5a3a16}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow button.sel{border-color:#e09a00;background:#fff3d6;box-shadow:0 0 0 2px rgba(224,154,0,.25)}
html.atlas-skin #f3D .bdrow button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow.pc3 button img{aspect-ratio:3/2;background:radial-gradient(80% 80% at 50% 40%,#5a4636,#2a1f17);padding:4%;box-sizing:border-box}`;
      document.head.appendChild(st);
      f3 = document.createElement('div'); f3.id = 'f3D'; f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>';
      r2.after(f3);
      r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);   // a 2D board: the 2D page
      paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
      if (typeof window.designThumbs === 'function') { const od = window.designThumbs; window.designThumbs = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
      document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#segPieces,#segSkin')) setTimeout(paint3, 80); }, true);
    }
  }
  standLook();
  addEventListener('storage', e => { if (e.key === 'atlas-shogi-look') { standLook(); setBoard(boardN, curCrop, extW); paint3(); } if (e.key === 'atlas-shogi-pc3') { if (window.__shogiPcSet) window.__shogiPcSet(); paint3(); } });

  window.pieceEl = function (code, promoted) {
    const el = orig(code, promoted);
    if (!IMG || !mine || !is3()) return el;
    try {
      const tp = E.typeOf(code), col = E.colorOf(code), up = (col === 1) !== flip;
      const src = IMG['k' + tp + (tp === 8 && col === 1 ? 'o' : '')]; if (!src) return el;
      el.classList.add('img', 'atlas3d'); el.classList.remove('g', 'has-intl');
      const k = el.querySelector('.k'); k.innerHTML = `<img src="${src}" alt="" draggable="false" decoding="sync"${up ? ' class="up"' : ''}>`;   // (sync: painted with the frame, no blank flash)
      // the face's fine wood grain, as on the page's image sets (its own patch per kind and side)
      const gi = tp * 2 + (up ? 1 : 0); k.classList.toggle('up', up);
      k.style.setProperty('--pm', `url("${src}")`); k.style.setProperty('--gp', `${(gi * 37) % 100}% ${(gi * 61) % 100}%`); k.style.setProperty('--gs', `${60 + (gi * 29) % 30}%`);
    } catch (e) {}
    return el;
  };
  // pre-rendered sheet of the 3D pieces (images/atlas/shogi-pieces.png, made with Table3D.shogi.images); live render as fallback
  const pset = () => (SG.curSet ? SG.curSet() : 'moriage');
  const sheetSrc = k => k === 'moriage' ? '../images/atlas/shogi-pieces.png?v=3' : '../images/atlas/shogi-pieces-' + k + '.png?v=3';   // (the six 3D piece sets, 2026-11-11)
  const sheet = (k = pset()) => new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    const out = {}, keys = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k8o'];
    // blob: URLs, not data: URLs (2026-11-11) — every board redraw (each move, 待った) makes ~40 <img>; a long data: URL is parsed and
    // decoded again each time on iPhone (the board flashed as if redrawn, and the phone ran hot); a blob: URL is decoded once and cached
    Promise.all(keys.map((k, i) => new Promise(ok => { const c = document.createElement('canvas'); c.width = 256; c.height = 282; c.getContext('2d').drawImage(im, (i % 5) * 256, (i / 5 | 0) * 282, 256, 282, 0, 0, 256, 282);
      if (c.toBlob) c.toBlob(b => { out[k] = b ? URL.createObjectURL(b) : c.toDataURL('image/png'); ok(); }, 'image/png'); else { out[k] = c.toDataURL('image/png'); ok(); } }))).then(() => res(out)); }; im.onerror = rej; im.src = sheetSrc(k); });
  let imgTok = 0;
  function loadSet() { const k = pset(), t = ++imgTok; sheet(k).catch(() => SG.images(256, k)).then(o => { if (t !== imgTok) return;
    IMG = o;
    window.__shogiAtlasPre = Object.values(o).map(src => { const im = new Image(); im.src = src; if (im.decode) im.decode().catch(() => {}); return im; });   // decoded up front: promotions show at once
    try { renderBoard(false); renderHands(); } catch (e) {}
  }); }
  loadSet();
  window.__shogiPcSet = loadSet;
})();
