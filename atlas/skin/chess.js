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
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-knight.webp', guideFallback: '../images/atlas/chess.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'squares|\\.pc|\\.hl|\\.dot|fxsvg|hintlbl|reserve|\\.cp|promo|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
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
  let IMG = null;
  const PCK = 'atlas-chess-pc';
  let mine = true; try { mine = localStorage.getItem(PCK) !== '0'; } catch (e) {}
  const LBL = { ja: '高級3D', en: 'Luxury 3D', zh: '豪华3D', ko: '고급 3D', es: 'Lujo 3D', fr: 'Luxe 3D', pt: 'Luxo 3D', de: 'Luxus 3D', hi: 'लक्ज़री 3D', ar: 'فاخر ثلاثي' };
  const seg = document.getElementById('segSkin');
  const skinNow = () => { try { return settings.skin || 'classic'; } catch (e) { return 'classic'; } };
  function look() {   // selection mark and board tone follow the game's skin setting
    if (seg) seg.querySelectorAll('button').forEach(x => { if (mine) x.classList.toggle('sel', x.dataset.v === 'atlas3d'); else if (x.dataset.v === 'atlas3d') x.classList.remove('sel'); });
    if (board.userData.setTone) board.userData.setTone(mine ? 'classic' : skinNow());
    document.documentElement.classList.toggle('atlas-svgpc', !mine);
    T3.kick(400);
  }
  function redraw() {
    try { for (const [, el] of pcEls) el.innerHTML = pieceSVG(+el.dataset.p); } catch (e) {}
    try { renderReserves(posAt(cur).pos); } catch (e) {}
  }
  if (seg) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = 'atlas3d'; seg.prepend(b);
    const paintLbl = () => { const l = (document.getElementById('langSel') || {}).value || 'ja'; b.textContent = LBL[l] || LBL.en; };
    paintLbl(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintLbl, 30));
    seg.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      mine = t.dataset.v === 'atlas3d'; try { localStorage.setItem(PCK, mine ? '1' : '0'); } catch (x) {}
      if (mine) e.stopImmediatePropagation();
      setTimeout(() => { look(); redraw(); }, 0);
    }, true);
  }
  if (typeof window.applySkin === 'function') { const oa = window.applySkin; window.applySkin = function () { const r = oa.apply(this, arguments); try { look(); } catch (e) {} return r; }; }
  setTimeout(look, 0);
  const orig = window.pieceSVG;
  window.pieceSVG = function (p) {
    if (!IMG || !mine) return orig(p);
    const src = IMG[(p & 8 ? 'b' : 'w') + ' PNBRQK'[p & 7]];
    return src ? `<img class="a3d rf" src="${src}" alt="" draggable="false"><img class="a3d" src="${src}" alt="" draggable="false">` : orig(p);   // + its reflection in the lacquer
  };
  // sprites stand up out of their square: rows nearer the player are drawn over the ones behind
  const oPlace = window.placeAt;
  if (typeof oPlace === 'function') window.placeAt = function (el, s) { oPlace(el, s); try { if (el.classList.contains('pc')) el.style.zIndex = 1 + sqY(s); } catch (e) {} };
  try { for (const [s, el] of pcEls) el.style.zIndex = 1 + sqY(s); } catch (e) {}

  // pre-rendered sheet of the 3D pieces (images/atlas/chess-pieces.png, made with Table3D.chess.images); live render as fallback
  const SW = 256, SH = Math.round(256 * CH.SPR_H);
  const sheet = () => new Promise((res, rej) => { const im = new Image(); im.onload = () => {
    if (im.naturalWidth !== SW * 6) return rej();
    const out = {};
    CH.SHEET_KEYS.forEach((k, i) => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; c.getContext('2d').drawImage(im, (i % 6) * SW, (i / 6 | 0) * SH, SW, SH, 0, 0, SW, SH); out[k] = c.toDataURL('image/png'); });
    res(out); }; im.onerror = rej; im.src = '../images/atlas/chess-pieces.png?v=1'; });
  sheet().catch(() => CH.images(SW)).then(o => { IMG = o; redraw(); });
})();
