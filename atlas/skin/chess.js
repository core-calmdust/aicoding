/* =====================================================================
   Chess — portal skin (chess/?skin=atlas)
   The full chess page keeps every feature (AI, rated, lessons, puzzles,
   openings, review, online play with the 2D version, chat…). This file:
     • draws the luxury lacquered board with the 3D table; the camera is aligned
       to the DOM board, which stays on top (transparent) for clicks, drags, marks
     • swaps the page's SVG pieces for 3/4 renders of the 3D Staunton pieces
       (silver / gold) — on the board, captured pieces, promotion, while dragging.
       The game's own board & piece skins stay selectable ("Luxury 3D" is the default)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.chess || !window.AtlasSkin || typeof window.pieceSVG !== 'function') return;
  const CH = T3.chess, boardDom = document.getElementById('board');
  const board = T3.MODELS.chess(true), S = board.userData.S, Y = board.userData.top, OUT = board.userData.outer;
  document.documentElement.classList.add('atlas-chess');

  const skin = AtlasSkin.init({
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    upright: '.pc',   // 盤面反転: the standing piece renders stay upright while the table turns
    pc: { vars: ['--cell'] },   // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit)
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-knight.webp', guideFallback: '../images/atlas/chess.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'squares|\\.pc|\\.hl|\\.dot|fxsvg|hintlbl|reserve|\\.cp|promo|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      // the portal's card / 「あそぶ」 sheet: straight to the puzzles / lessons / openings / a rated game (chess/app.js AtlasDeep)
      if (/^(puzzle|lesson|online)$/.test(mode)) { if (!window.AtlasDeep) return null; const q = new URLSearchParams(location.search); return AtlasDeep(mode, q.get('sub'), q.get('tc')); }
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('chess', board, { still: true });
  skin.alignTo(S, Y);

  /* ---------- pieces: renders of the 3D pieces ---------- */
  // 3D boards (six, Table3D.BOARDS.chess 'atlas-chess-look') and 3D piece sets (six, Table3D.PIECES.chess 'atlas-chess-pc3'), picked in
  // the デザイン tab's 「3D盤」 / 「3D駒」 rows (as checkers, 2026-11-15). The game's own 2D pieces can stand on the 3D board too
  // ('atlas-chess-pc' = '0'); a 2D board shows the plain 2D page (AtlasSkin.view 'atlas-chess-view').
  const IMGS = {}; let IMG = null;
  const PCK = 'atlas-chess-pc', B3 = T3.BOARDS.chess, P3 = T3.PIECES.chess;
  let mine = P3.get(); try { if (localStorage.getItem(PCK) === '0') mine = ''; } catch (e) {}
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || 'ja');
  let V = null; const is3 = () => !V || V.is3d();   // the 3D board, or the game's own 2D board (AtlasSkin.view)
  function look() {
    const mine3 = is3() ? mine : '', lk = B3.get();
    if (board.userData.setSet) board.userData.setSet(lk);
    document.documentElement.classList.toggle('atlas-chess-matt', !CH.mirrors(lk));   // (the sprites' mirror image only on the glossy boards)
    IMG = mine3 ? IMGS[mine3] || null : null; if (mine3 && !IMGS[mine3]) loadSet(mine3);
    document.documentElement.classList.toggle('atlas-svgpc', !mine3);
    try { designNow(); } catch (e) {}
    paint3(); T3.kick(400);
  }
  function redraw() {
    try { for (const [, el] of pcEls) el.innerHTML = pieceSVG(+el.dataset.p); } catch (e) {}
    try { renderReserves(posAt(cur).pos); } catch (e) {}
  }
  /* the new-game dialog: 「3D盤」 (boards) and 「3D駒」 (sets) — common.js splitDesign puts them under 3D | 2D switches */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Figuren', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фигуры', 'zh-TW': '3D棋子', id: 'Buah 3D', tr: '3D taşlar' };
  let f3 = null;
  function setLook(k) {
    T3.setBoard ? T3.setBoard('chess', k) : B3.set(k);
    if (V && !V.is3d()) V.set(true);
    setTimeout(() => { look(); redraw(); }, 0);
  }
  function setSet(k) {
    T3.setPieces ? T3.setPieces('chess', k) : P3.set(k);
    mine = k; try { localStorage.setItem(PCK, '1'); } catch (e) {}
    if (V && !V.is3d()) V.set(true);   // 3D pieces stand on the 3D board
    setTimeout(() => { look(); redraw(); }, 0);
  }
  function paint3() {
    if (!f3) return;
    const l = lng(), cur = B3.get(), on = is3();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    const tile = (k, src, on) => { const bt = document.createElement('button'); bt.type = 'button'; bt.innerHTML = `<span class="th a3i"><img src="${src}" alt="" draggable="false"></span><span class="nm"></span>`; bt.onclick = on; return bt; };
    if (!row.children.length) B3.list.forEach(k => { const bt = tile(k, T3.boardIcon('chess', k), () => setLook(k)); bt.dataset.look = k; row.appendChild(bt); });
    if (!prow.children.length) P3.list.forEach(k => { const bt = tile(k, P3.thumb(k), () => setSet(k)); bt.dataset.set = k; prow.appendChild(bt); });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('.nm').textContent = T3.boardName(k, l, 'chess'); bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = on && mine === k; bt.querySelector('.nm').textContent = T3.pieceName('chess', k, l); bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    // the game's own rows: nothing chosen there while a 3D board / 3D set is (the game keeps its choice for the 2D page)
    const clr = r => r && r.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
    if (on) clr(document.getElementById('segSkin'));
    if (on && mine) clr(document.getElementById('segPcs'));
  }
  const fd = document.getElementById('fBoard');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D'; f3.dataset.pcown = '1';
    f3.innerHTML = '<label></label><div class="dsg dsg-bd bdrow"></div><label class="pc3l"></label><div class="dsg dsg-pc bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const sk = document.getElementById('segSkin'), sp = document.getElementById('segPcs');
    if (sk) sk.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(() => { look(); redraw(); }, 0); } }, true);   // a 2D board: the plain 2D page
    if (sp) sp.addEventListener('click', e => { if (!e.target.closest('button')) return; mine = ''; try { localStorage.setItem(PCK, '0'); } catch (x) {} setTimeout(() => { look(); redraw(); }, 0); }, true);   // 2D pieces (also on the 3D board)
    if (typeof window.applySkin === 'function') { const oa = window.applySkin; window.applySkin = function () { const r = oa.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-chess-look' || e.key === 'atlas-chess-pc3' || e.key === PCK) { mine = P3.get(); try { if (localStorage.getItem(PCK) === '0') mine = ''; } catch (x) {} look(); redraw(); } });
  V = skin.view({ key: 'atlas-chess-view', cls: ['atlas-chess'], on() { setTimeout(() => { try { look(); } catch (e) {} redraw(); }, 0); } });
  { const st = document.createElement('style'); st.textContent = `
html.atlas-skin #segSkin > [data-v=lux3d],html.atlas-skin #segSkin > [data-v=wood3d],html.atlas-skin #segPcs > [data-v=lux3d],html.atlas-skin #segPcs > [data-v=wood3d]{display:none!important}
html.atlas-skin #f3D .th.a3i{display:block;background:none!important;box-shadow:none!important;padding:0}
html.atlas-skin #f3D .th.a3i img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 .th.a3i img{aspect-ratio:3/2;background:radial-gradient(80% 80% at 50% 40%,#6a5e52,#2a231d);padding:4%;box-sizing:border-box}
html.atlas-chess-matt .pc img.a3d.rf{display:none!important}`; document.head.appendChild(st); }
  setTimeout(look, 0);
  const orig = window.pieceSVG;
  window.pieceSVG = function (p) {
    if (!IMG || !mine || !is3()) return orig(p);
    const src = IMG[(p & 8 ? 'b' : 'w') + ' PNBRQK'[p & 7]];
    return src ? `<img class="a3d rf" src="${src}" alt="" draggable="false"><img class="a3d" src="${src}" alt="" draggable="false">` : orig(p);   // + its reflection in the lacquer
  };
  // sprites stand up out of their square: rows nearer the player are drawn over the ones behind
  const oPlace = window.placeAt;
  if (typeof oPlace === 'function') window.placeAt = function (el, s) { oPlace(el, s); try { if (el.classList.contains('pc')) el.style.zIndex = 1 + sqY(s); } catch (e) {} };
  try { for (const [s, el] of pcEls) el.style.zIndex = 1 + sqY(s); } catch (e) {}

  // pre-rendered sheets of the 3D pieces (images/atlas/chess-pieces[-<set>].png, made with Table3D.chess.images); live render as fallback
  const SW = 256, SH = Math.round(256 * CH.SPR_H);
  const SRC = set => '../images/atlas/chess-pieces' + (set === 'lux' ? '' : '-' + set) + '.png?v=' + (set === 'lux' || set === 'wood' ? 1 : set === 'jewel' ? 3 : 2);
  const sheet = set => new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    if (im.naturalWidth !== SW * 6) return rej();
    const out = {};
    CH.SHEET_KEYS.forEach((k, i) => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; c.getContext('2d').drawImage(im, (i % 6) * SW, (i / 6 | 0) * SH, SW, SH, 0, 0, SW, SH); out[k] = c.toDataURL('image/png'); });
    res(out); }; im.onerror = rej; im.src = SRC(set); });
  const loading = {};
  function loadSet(set) {
    if (loading[set]) return; loading[set] = 1;
    sheet(set).catch(() => CH.images(SW, set)).then(o => { IMGS[set] = o; if (mine === set) { IMG = o; redraw(); } });
  }
  if (mine) loadSet(mine);

  /* ---------- moves: the piece is lifted off the board and set down (on top of the game's slide) ---------- */
  const oFlip = window.flipFrom;
  if (typeof oFlip === 'function') window.flipFrom = function (el, from, dur) {
    const to = el.getBoundingClientRect();   // before the game's slide starts (its transform moves the box back to `from`)
    dur = Math.max(dur || 260, 340); oFlip(el, from, dur);
    try {
      if (!IMG || !el.animate) return;
      const d = Math.hypot(from.left - to.left, from.top - to.top); if (d < 2) return;
      const cw = to.width, lift = Math.min(cw * .55, d * .22 + cw * .12), T = dur || 260;
      const im = el.querySelector('img.a3d:not(.rf)'), rf = el.querySelector('img.a3d.rf');
      const sh0 = `drop-shadow(0 ${cw * .05}px ${cw * .04}px rgba(0,0,0,.5))`, sh1 = `drop-shadow(0 ${cw * .05 + lift * .8}px ${cw * .1}px rgba(0,0,0,.3))`;
      if (im) im.animate([{ transform: 'none', filter: sh0 }, { transform: `translateY(${-lift}px) scale(1.04)`, filter: sh1, offset: .45 }, { transform: 'none', filter: sh0 }], { duration: T, easing: 'ease-in-out' });
      if (rf) rf.animate([{ opacity: .42 }, { opacity: 0, offset: .2 }, { opacity: 0, offset: .8 }, { opacity: .42 }], { duration: T });
      // (no Table3D.kick: the pieces are DOM sprites, the 3D board under them doesn't change during a move → no frames drawn)
    } catch (e) {}
  };
})();
