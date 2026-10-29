/* =====================================================================
   Mancala — portal skin (mancala/?skin=atlas)
   The full Luxe Mancala page keeps every feature (AI, two players, AI vs AI,
   four rule sets, lessons, puzzles, review / analysis, online play…).
   This file:
     • draws the piano-black 3D board (atlas/models/mancala.js) with the 3D
       table, the camera aligned to the DOM board (#board: 9.2 × 3.7 units =
       the 3D board's 11 world units across); the DOM board stays on top,
       see-through, for taps, the gems, the counts and every effect
     • moves the page's cups onto the 3D hollows (slotUV / inside are the
       game's own functions: the rows, the stores and the gem area follow the
       carved board), pit numbers go to the outer edge
     • turns with the page: phone portrait stands the board up (the game's
       .vert layout) — the 3D board is turned a quarter with it
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   PC keeps the game's own layout (board on top, the info cards below).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.mancala || !window.AtlasSkin || typeof window.slotUV !== 'function' || typeof window.layout !== 'function') return;
  const MC = T3.mancala, G = MC.G, de = document.documentElement, boardEl = document.getElementById('board');
  de.classList.add('atlas-mancala');
  const BWU = 9.2, BHU = 3.7, S = BWU / G.W;   // page units per world unit (the 3D board's width = the DOM board's width)
  const isVert = () => document.getElementById('frame').classList.contains('vert');

  const skin = AtlasSkin.init({
    board: boardEl,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-gem.webp', guideFallback: '../images/atlas/mancala.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'seed|slot|badge|pitno|hand|splash|ring|slabel|turn|frame|pdisc|banner',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (lv >= 1 && lv <= 10) draft.level = lv;
      if (side === 1 || side === 2) draft.color = side - 1;
      const sz = +new URLSearchParams(location.search).get('size'); if (sz === 4 || sz === 6) draft.seeds = sz;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  // the game's 「横画面でも遊べます」 tip would come on every visit: not in the portal skin
  try { rotTipDone = true; const ro = document.getElementById('rotTipOverlay'); if (ro) ro.classList.remove('show'); } catch (e) {}

  /* ---------- the page's cups on the carved hollows ---------- */
  window.slotUV = function (i) {
    const B = bottomSide(), own = ownerOf(i), bottom = own === B, cx = BWU / 2, cy = BHU / 2;
    if (isStore(i)) return { x: cx + (bottom ? 1 : -1) * G.SX * S, y: cy, bottom };
    const k = own ? i - 7 : i, px = (-2.5 + k) * G.PX * S;
    return bottom ? { x: cx + px, y: cy + G.PZ * S, bottom } : { x: cx - px, y: cy - G.PZ * S, bottom };
  };
  // where a gem may rest in a cup (offsets from its centre, page units): a round pit, or the stadium of a store
  const PRu = G.PR * S - .13, SRu = G.SR * S - .12, SLu = G.SL * S;
  window.inside = function (i, x, y) {
    if (isStore(i)) { x = Math.max(-SRu, Math.min(SRu, x)); const ym = SLu + Math.sqrt(Math.max(0, SRu * SRu - x * x)); return [x, Math.max(-ym, Math.min(ym, y))]; }
    const r = Math.hypot(x, y); return r > PRu ? [x / r * PRu, y / r * PRu] : [x, y];
  };
  const oLayout = window.layout;
  window.layout = function () {
    const r = oLayout.apply(this, arguments);
    try {
      const v = isVert(), sw = 2 * G.SR * S * U, sh = 2 * (G.SL + G.SR) * S * U, pw = 2 * G.PR * S * U;
      for (let i = 0; i < 14; i++) {
        const el = slotEls[i]; if (!el) continue;
        if (isStore(i)) { el.style.width = (v ? sh : sw) + 'px'; el.style.height = (v ? sw : sh) + 'px'; } else { el.style.width = el.style.height = pw + 'px'; }
        // the count: a small gold label on the board beside the hollow (pits: on the outer edge; stores: below their near end), never over the gems
        const p = slotUV(i), b = badgeEls[i];
        const [bx, by] = isStore(i) ? toPx(p.x, p.y + (G.SL + G.SR) * S + .3) : toPx(p.x, p.y + (p.bottom ? 1 : -1) * (G.PR * S + .2));
        if (b) { b.style.left = bx + 'px'; b.style.top = by + 'px'; }
        const n = pitNoEls[i]; if (n) n.style.display = 'none';   // (the pit numbers: the count takes their place)
      }
      orient();
    } catch (e) {}
    return r;
  };

  /* ---------- the 3D board (turned a quarter when the page stands the board up) ---------- */
  const holder = new THREE.Group(), board = MC.board(); holder.add(board);
  T3.show('mancala', holder, { still: true });
  let alignFn = null, vertNow = null; const oAlign = T3.align;
  T3.align = function (fn, size, top) { alignFn = fn; return oAlign.call(this, fn, size, top); };
  function orient() {
    const v = isVert(); if (v === vertNow || !alignFn) return; vertNow = v;
    holder.rotation.y = v ? Math.PI / 2 : 0;
    oAlign(alignFn, v ? G.W : BHU / S, board.userData.top);
    T3.kick(600);
  }
  skin.alignTo(BHU / S, board.userData.top);
  orient();
  try { layout(); } catch (e) {}
  new MutationObserver(() => { orient(); }).observe(document.getElementById('frame'), { attributes: true, attributeFilter: ['class'] });
  // the board's size changes after the skin CSS arrives / on rotation: the still scene must be drawn again
  if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(() => T3.kick(600))).observe(boardEl);
  addEventListener('resize', () => setTimeout(() => T3.kick(600), 60));

})();
