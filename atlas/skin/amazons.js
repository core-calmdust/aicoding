/* =====================================================================
   Amazons — portal skin (amazons/?skin=atlas)
   The full page keeps every feature (AI in 23 levels, rated games, two players, lessons, puzzles, the daily puzzle,
   review / analysis, the coach…). This file:
     • draws the 3D board (atlas/models/amazons.js) with the 3D table, leaning back (tilt 26°); the camera is aligned to the DOM
       board, which stays on top (transparent, tilted the same way) for taps, destinations, arrows, hints and labels. The page's
       layout is never changed (the same positions as the 2D page, in 2D and in 3D): the 3D frame may go under the cards
     • the amazons are sculpted figures (statue / archer / bronze), chosen in a 「3D駒」 row under the 3D boards
       ('atlas-amazons-pc3'); the page's piece pictures (plates, players, record) follow the chosen figures
     • mirrors the page's moves: the amazon glides to its square (lifted a little), then a fire arrow flies from her in an arc
       — a flame at its head, sparks shed along the way — strikes with a flash and a burst of sparks; the square stays
       scorched with the arrow stuck in it, its edge glows and cools, a thin smoke rises for a few seconds
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.AmazonsEngine, A3 = T3 && T3.amazons;
  if (!THREE || !T3 || !A3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-amazons');
  const pc3 = () => A3.pcSet();
  const setPc3Attr = () => { de.dataset.pc3 = pc3(); };
  setPc3Attr();

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
/* the page's layout exactly as with the 2D board (html.atlas-2d in skin.css): the same height for the page under the portal bar */
html.atlas-amazons.hb-atlas{--ttop:0px;--vh:calc(100vh - 64px)}
html.atlas-amazons.hb-atlas,html.atlas-amazons.hb-atlas body{--hb-h:64px}
html.atlas-amazons.hb-atlas body{padding-top:64px}
@media not all and (pointer: coarse){
  html.atlas-amazons.hb-atlas.ol-dock{--vh:calc(100vh - 108px - 64px)}
  @supports (height:100dvh){html.atlas-amazons.hb-atlas.ol-dock{--vh:calc(100dvh - 108px - 64px)}}
  html.atlas-amazons.hb-atlas.ol-dock.ol-soon{--vh:calc(100vh - 46px - 64px)}
  @supports (height:100dvh){html.atlas-amazons.hb-atlas.ol-dock.ol-soon{--vh:calc(100dvh - 46px - 64px)}}
}
html.atlas-2d #board{transform:none!important;translate:none!important;scale:none!important}   /* (the 2D board: flat; the tilt is the 3D board's) */
html.atlas-amazons .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-amazons .frame::before,html.atlas-amazons .frame::after,html.atlas-amazons .board::after,html.atlas-amazons .board::before{display:none!important}
html.atlas-amazons .board{background:none!important;box-shadow:none!important}
html.atlas-amazons[data-pc3=statue]{--pcW:url(img/pc3-statue-w.webp)!important;--pcB:url(img/pc3-statue-b.webp)!important}
html.atlas-amazons[data-pc3=archer]{--pcW:url(img/pc3-archer-w.webp)!important;--pcB:url(img/pc3-archer-b.webp)!important}
html.atlas-amazons[data-pc3=bronze]{--pcW:url(img/pc3-bronze-w.webp)!important;--pcB:url(img/pc3-bronze-b.webp)!important}
html.atlas-amazons .lines{overflow:visible!important}
html.atlas-amazons .lines .num{fill:rgba(255,246,226,.85)!important;stroke:rgba(0,0,0,.55)!important;font-weight:700}
html.atlas-amazons .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important}
html.atlas-amazons .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,214,100,.95),0 0 18px rgba(255,200,80,.75)!important;border-radius:50%!important}
html.atlas-amazons .pieces .pc.mov:not(.sel){box-shadow:0 0 0 2.5px rgba(190,232,140,.85),0 0 12px rgba(190,232,140,.5)!important;border-radius:50%!important}
html.atlas-amazons .pieces .pc.dim{opacity:1!important}
html.atlas-amazons .pieces .arw:not(.hov){background:none!important;box-shadow:none!important}
html.atlas-amazons .pieces .arw:not(.hov)::before,html.atlas-amazons .pieces .arw:not(.hov)::after,html.atlas-amazons .pieces .arw:not(.hov) :is(svg,.ai){display:none!important}
html.atlas-amazons .pieces :is(.spark,.flare){display:none!important}
html.atlas-amazons .pieces .pc.hov{opacity:.5!important}
html.atlas-amazons .reserve.turn::after{display:none}   /* (the 2D page's turn mark: a line floating under the plate with no frame behind it) */
html.atlas-amazons .reserve .rsv-plate{background:rgba(20,16,12,.82)!important;box-shadow:0 0 0 1px rgba(226,182,96,.45),0 2px 6px rgba(0,0,0,.35)!important;color:#f0e2c4!important}
html.atlas-amazons #fPieces{display:none!important}
html.atlas-amazons:not(.atlas-2d) .app > .side{z-index:3}   /* (zoomed in, the canvas covers the window: the cards stay above it) */
/* lesson / puzzle cards: no guide picture (the four tool tiles with labels and the primary button need the whole row) */
html.atlas-skin .cb-foot .pic{display:none!important}
html.atlas-skin .atlas-guide .bub::before,html.atlas-skin .atlas-guide .bub::after{display:none!important}
html.atlas-skin .cb-foot .cb-bar{flex:1 1 auto;min-width:0}
html.atlas-skin .cb-bar .cb-tools{flex:1 1 auto;min-width:0;display:flex;gap:6px}
html.atlas-skin .cb-bar .cb-tools > .cb-ic{flex:1 1 0;min-width:0;width:auto!important}
html.atlas-skin .cb-bar .cb-t{flex:none;white-space:nowrap}
/* (2026-11-11 the user: the tiles' insides were cramped — more room round the icon and the label) */
/* (2026-11-11 later, the user: the sizes looked off — four equal tiles, a gap before the next button, the next button the same
   height and a rounded box like the tiles, not a pill pressed against them) */
html.atlas-skin .cb-cmp .cb-bar{gap:8px!important}
html.atlas-skin .puzzle-card .pz-goal{font-size:min(14px,3.7vw)!important;line-height:1.35!important}   /* (the goal on one line, 2026-11-11 the user) */
html.atlas-skin .cb-cmp .cb-bar > .cb-main{width:auto!important;min-width:0!important;max-width:none!important}
html.atlas-skin .cb-cmp .cb-tools{gap:6px!important;flex:0 0 auto!important;min-width:0}
html.atlas-skin .cb-cmp .cb-bar .cb-tools > .cb-ic[data-cap]{flex:0 0 49px!important;min-width:0!important;width:49px!important;height:48px!important;padding:4px 2px!important;gap:3px!important;box-sizing:border-box;border-radius:14px!important}   /* (the size of the menu bar's buttons — 対局 · 待った …, 2026-11-11 the user) */
html.atlas-skin .cb-cmp .cb-bar .cb-ic[data-cap]::after{font-size:10px}
html.atlas-skin .cb-cmp .cb-bar > .cb-main{flex:1 1 auto!important}
html.atlas-skin .cb-cmp .cb-bar .cb-t{flex:1 1 auto!important;width:100%;height:48px!important;padding:0 12px!important;min-width:0!important;border-radius:14px!important;font-size:13px!important;box-sizing:border-box}
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f6f1e4;border:2px solid #e2cf9e}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#7a5a1c;margin:0 0 8px}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 button img{background:radial-gradient(80% 80% at 50% 40%,#5a6a5c,#26302a);padding:6%;box-sizing:border-box}
`;
  document.head.appendChild(st);
  // the portal skin's 3D rule that moves the page down inside .app (html.atlas-skin:not(.atlas-2d) .app{padding-top: … + 64px}) is
  // dropped on this page: the body takes the bar's 64px as with the 2D board, so every card keeps exactly the 2D page's place
  const dropRule = () => { let hit = false; for (const sh of document.styleSheets) { let R; try { R = sh.cssRules; } catch (e) { continue; } for (let i = R.length - 1; i >= 0; i--) if (R[i].selectorText === 'html.atlas-skin:not(.atlas-2d) .app') { sh.deleteRule(i); hit = true; } } return hit; };
  if (!dropRule()) { let n = 0; const t = setInterval(() => { if (dropRule() || ++n > 40) { clearInterval(t); dispatchEvent(new Event('resize')); } }, 100); }

  const skin = AtlasSkin.init({
    margin: .3,
    tilt: 26, persp: 2.6,   // leaning back a little: the sculpted amazons are seen from the front
    board: boardDom,
    // (no pc / outer: the page keeps exactly the 2D page's layout in 2D and in 3D — user rule 2026-11-10; the 3D board follows
    //  the DOM board and its frame may go under the cards around it)
    guide: '../images/atlas/amazons.webp', guideFallback: '../images/atlas/amazons.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.arw|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|spark|flare',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 23) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the tilt's lens: the leaning board is drawn a little lower and larger at the near side; the board (3D and the DOM
     board over it, together) is moved up by the same amount so it sits centred between the count plates (the page's layout itself
     is not touched) ---------- */
  const SC = .8;   // the leaning board is drawn smaller than the DOM board's place, so its near edge (wider in perspective) and
  // the frame round it stay inside the page's board area (the cards beside never cover it)
  let liftK = .05;  // of the drawn height: set by centre() so the drawn board (far edge to near edge, base included) is centred in the frame
  // zoom (wheel / pinch) and pan (drag on the empty area round the board): the 3D board and the DOM board over it move together
  const view = { z: 1, x: 0, y: 0 };
  const ZMAX = 3;
  let hostFull = false;
  function lift3d() {
    const holder = boardDom.parentElement;
    const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
    const host = document.getElementById('atlasGL');
    T3.align(() => {
      const b = box(), on = !de.classList.contains('atlas-2d'), z = on ? view.z : 1, px = on ? view.x : 0, py = on ? view.y : 0;
      const s = (on ? SC : 1) * z, w = b.w * s, h = b.h * s, d = on ? h * liftK : 0;
      boardDom.style.translate = d || px || py ? `${px}px ${py - d}px` : ''; boardDom.style.scale = s !== 1 ? String(s) : '';
      // zoomed in or moved: the canvas covers the whole window (the board may reach anywhere); at rest it hugs the board (fewer pixels)
      const full = on && (z > 1.001 || Math.abs(px) > .5 || Math.abs(py) > .5);
      if (host && (full || hostFull)) {
        // (every time: the skin's own placement on a resize may have put the canvas back round the board meanwhile)
        // (from the board's place down only: on phones the cards above it show the table through, so the canvas stays under them)
        if (full) { const r = holder.getBoundingClientRect(), fr = document.getElementById('frame'), ft = Math.max(0, fr ? fr.getBoundingClientRect().top : 0), L = Math.round(-r.left) + 'px', Tp = Math.round(ft - r.top) + 'px', W = innerWidth + 'px', H = Math.round(innerHeight - ft) + 'px'; const st = host.style; if (st.left !== L || st.top !== Tp || st.width !== W || st.height !== H) Object.assign(st, { left: L, top: Tp, width: W, height: H }); }
        else dispatchEvent(new Event('resize'));   // (back at rest: the skin's own placement of the canvas)
        hostFull = full;
      }
      return { x: b.x + (b.w - w) / 2 + px - (host ? host.offsetLeft : 0), y: b.y + (b.h - h) / 2 - d + py - (host ? host.offsetTop : 0), w, h, tilt: 26, persp: h * 2.6 };
    }, 10, U.top);
  }
  function setView(z, x, y) {
    const b = boardDom.offsetWidth * SC;
    view.z = Math.max(1, Math.min(ZMAX, z));
    const lim = b * (view.z * .55 + .2) + Math.max(innerWidth, innerHeight) * .3;   // keep a good part of the board on the screen (the puzzle close-up may need to bring a corner up past the cards)
    view.x = Math.max(-lim, Math.min(lim, x)); view.y = Math.max(-lim, Math.min(lim, y));
    if (view.z === 1 && Math.abs(view.x) < 2 && Math.abs(view.y) < 2) { view.x = 0; view.y = 0; }
    lift3d(); T3.kick(200);
  }
  // the board's centre on the screen now (zoom keeps the point under the pointer / the pinch where it is)
  function centreNow() { const holder = boardDom.parentElement, r = holder.getBoundingClientRect(); let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return [r.left + x + boardDom.offsetWidth / 2 + view.x, r.top + y + boardDom.offsetHeight / 2 + view.y]; }
  function zoomAt(f, cx, cy) {
    const z1 = Math.max(1, Math.min(ZMAX, view.z * f)), k = z1 / view.z; if (k === 1) return;
    const [ox, oy] = centreNow();
    setView(z1, view.x + (cx - ox) * (1 - k), view.y + (cy - oy) * (1 - k));
  }
  // the page's puzzle close-up (amazons/app.js pzzApply): w = { r0, c0, n } on the shown board, null = the whole board — the view
  // glides there (0.4 s)
  let zT = 0;
  let zw = null, zR = 0, zD = 0;
  // (the page's layout may still move after a puzzle opens — the cards fill in: the close-up is aimed again once it settles)
  let zAt = 0;   // (re-aimed when the board's place moves — but not just after a tap: a card's text changing must not move the board under the finger)
  let zPtr = 0; addEventListener('pointerdown', () => { zPtr = performance.now(); }, true);
  // (re-aimed only when the window itself changes size — a phone turned round; never because the cards moved: one move per
  //  puzzle, 2026-11-11 the user: it still went in steps)
  { let iw = innerWidth; const re = () => { if (innerWidth === iw) return; iw = innerWidth; if (!zw) return; clearTimeout(zR); zR = setTimeout(() => zw && window.__amzZoom(zw, true), 200); };
    addEventListener('resize', re); }   // (the width only: a phone's address bar showing / hiding changes the height while scrolling)
  window.__amzZoom = (w, again) => { zw = w || null; if (again && !w) return; clearTimeout(zD); cancelAnimationFrame(zT); if (!w) return zoom0(null); T3.kick(400); if (!again) zAt = performance.now();
    // (one move, straight to the right size, 2026-11-11 the user: it went there in several steps — wait until the page has stopped
    //  moving: the board's place and the cards the same for two looks in a row, 1.5 s at most)
    const t0 = performance.now(); let last = '', same = 0;
    const look = () => { const f = document.getElementById('frame'), r = f ? f.getBoundingClientRect() : { top: 0, height: 0 }, k = Math.round(r.top) + ',' + Math.round(r.height) + ',' + innerHeight;
      same = k === last ? same + 1 : 0; last = k; if ((same >= 2 && performance.now() - t0 > 250) || performance.now() - t0 > 1500) { zAt = performance.now(); zoom0(w); } else zD = setTimeout(look, 90); };
    zD = setTimeout(look, 90); };
  // w = { r0, c0, nr, nc }: the squares that matter (both sides' amazons in play, the target's room), tight — on the shown board
  const ZM = 0;   // (the page's window already has one square of margin all round)
  // (the board's place as laid out — not the part that happens to be on the screen: the page may be scrolled, or the cards above
  //  cover it while the puzzle opens, and the close-up must be right once the board is in view, 2026-11-11 the user)
  const strip = () => { const fr = (document.getElementById('frame') || boardDom).getBoundingClientRect();
    return { x0: Math.max(fr.left, 0), x1: Math.min(fr.right, innerWidth), y0: fr.top, y1: fr.bottom, fr }; };
  // (the region's box as drawn: its floor corners, and the top of a standing figure on its far row — a piece there stands up
  //  into the rows behind it, so its head must not be cut by the cards above)
  const drawn = w => { const q = (c, r, h) => T3.project(c - 5, r - 5, Y + (h || 0)), c0 = w.c0 - ZM, c1 = w.c0 + w.nc + ZM, r0 = w.r0 - ZM, r1 = w.r0 + w.nr + ZM;
    const A = q(c0, r0), B = q(c1, r1), C = q(c1, r0), D = q(c0, r1), H = q((c0 + c1) / 2, w.r0 + .5, 2.4);
    return { L: Math.min(A.x, D.x), R: Math.max(B.x, C.x), T: Math.min(A.y, C.y), B: Math.max(B.y, D.y) }; };
  // (the amazons' own box as drawn: their squares, half a square more, and the heads of the far row's figures)
  const piecesBox = w => { const p = w.p; if (!p) return null; const q = (c, r, h) => T3.project(c - 5, r - 5, Y + (h || 0)), c0 = p.c0 - .5, c1 = p.c1 + 1.5, r0 = p.r0 - .5, r1 = p.r1 + 1.5;
    const A = q(c0, r0), B = q(c1, r1), C = q(c1, r0), D = q(c0, r1), H = q((c0 + c1) / 2, p.r0 + .5, 3.2);
    return { T: Math.min(A.y, C.y, H.y) - 14, B: Math.max(B.y, D.y), L: Math.min(A.x, D.x), R: Math.max(B.x, C.x) }; };   // (14px of air above the tallest head)
  const zoom0 = w => {
    const b = boardDom.offsetWidth * SC, cell = b / 10;
    // (2026-11-11 the user: not a fixed amount — the size each puzzle needs: the region, as drawn, fitted into the part of the board's
    //  place that is on the screen (phones: below the cards, above the tabs), as close as that allows (1–2.6×))
    let z = 1;
    const S = strip();
    if (w) { const d = drawn(w), rw = (d.R - d.L) / view.z, rh = (d.B - d.T) / view.z;
      // (the square window filled across the board's place, as 詰将棋 does — the strip's height may cut its far / near edge a little)
      // (but never so close that an amazon (with its head) leaves the strip: every piece stays on the screen)
      const pb = piecesBox(w), ph = pb ? (pb.B - pb.T) / view.z : 0;
      z = Math.max(1, Math.min(2.6, ZMAX, rw > 0 ? (S.x1 - S.x0) * .99 / rw : 9, ph > 0 ? (S.y1 - S.y0) * .96 / ph : 9)); }
    // (the region's centre to the strip's centre. The drawn board is the same picture scaled about the aligned box's centre (the
    //  camera's distance follows the box): where it is drawn now, from the box's centre and over the zoom, gives where it will be)
    let tx = 0, ty = 0;
    if (w) {
      const [cx, cy] = centreNow(), bx = cx - view.x, by = cy - view.y, bh = boardDom.offsetHeight * SC, d = drawn(w);
      const pb = piecesBox(w), P = { x: (d.L + d.R) / 2, y: pb ? (pb.T + pb.B) / 2 : (d.T + d.B) / 2 };   // (across: the window's centre; up and down: the amazons')
      const relX = (P.x - (bx + view.x)) / view.z, relY = (P.y - (by + view.y - liftK * bh * view.z)) / view.z;
      const dx = (S.x0 + S.x1) / 2, dy = S.y1 > S.y0 ? (S.y0 + S.y1) / 2 : by;
      if (isFinite(relX) && isFinite(relY)) { tx = dx - bx - relX * z; ty = dy - by + liftK * bh * z - relY * z; }
      else { tx = dx - bx - ((w.c0 + w.nc / 2) - 5) * cell * z; ty = dy - by - ((w.r0 + w.nr / 2) - 5) * cell * z; }
    }
    const a = { z: view.z, x: view.x, y: view.y }, t0 = performance.now(); cancelAnimationFrame(zT); clearTimeout(zT);
    // (then a few passes on what is actually drawn — the lean and the perspective make the first aim approximate: the zoom and the
    //  position corrected until the region sits in the strip. Each pass waits for the camera to be drawn where the last one put it)
    const fix = (n = 0) => { if (!w || n > 7) return; requestAnimationFrame(() => requestAnimationFrame(() => { zT = setTimeout(() => {
      const S = strip(), d = drawn(w);
      const pb = piecesBox(w), k = Math.min((S.x1 - S.x0) * .99 / (d.R - d.L), pb ? (S.y1 - S.y0) * .96 / (pb.B - pb.T) : 9);
      const ex = (S.x0 + S.x1) / 2 - (d.L + d.R) / 2, ey = (S.y0 + S.y1) / 2 - (pb ? (pb.T + pb.B) / 2 : (d.T + d.B) / 2);
      if (!isFinite(ex) || !isFinite(ey) || !isFinite(k)) return;
      const z1 = Math.max(1, Math.min(2.6, ZMAX, view.z * k)), f = z1 / view.z;
      if (Math.hypot(ex, ey) < 3 && Math.abs(f - 1) < .03) return;
      // (zoom about the region's centre, then move it to the strip's centre)
      const [ox, oy] = centreNow(), mx = (d.L + d.R) / 2, my = pb ? (pb.T + pb.B) / 2 : (d.T + d.B) / 2;
      setView(z1, view.x + (mx - ox) * (1 - f) + ex, view.y + (my - oy) * (1 - f) + ey);
      fix(n + 1);
    }, 60); })); };
    const step = () => { const k = Math.min(1, (performance.now() - t0) / 400), e = 1 - Math.pow(1 - k, 3); setView(a.z + (z - a.z) * e, a.x + (tx - a.x) * e, a.y + (ty - a.y) * e); if (k < 1) zT = requestAnimationFrame(step); else if (!w) centre(0); else fix(0); };
    zT = requestAnimationFrame(step);
  };
  {
    const area = document.querySelector('.board-area') || boardDom.parentElement;
    const on3 = () => !de.classList.contains('atlas-2d');
    const ui = t => t.closest && t.closest('button, a, input, select, .reserve, .rsv-plate, .prompt, .side, .overlay, .modal');
    area.addEventListener('wheel', e => { if (!on3() || ui(e.target)) return; e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? .04 : .0012)), e.clientX, e.clientY); }, { passive: false });
    const pts = new Map(); let drag = null, pinch = null, noClick = false;
    area.addEventListener('click', e => { if (noClick) { noClick = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);   // (the click that ends a drag or a pinch is not a move)
    area.addEventListener('pointerdown', e => {
      if (!on3() || ui(e.target)) return;
      // (phones, 2026-11-11 the user: a slide moves the board only when it starts on the board itself — an empty square or an
      //  arrow; the empty space round it is left alone. A second finger joins a gesture already started on the board)
      if (e.pointerType !== 'mouse' && !pts.size && !(typeof window.amzTouchPan === 'function' && window.amzTouchPan(e.clientX, e.clientY))) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { noClick = true; const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.z, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2, x: view.x, y: view.y }; drag = null; return; }
      // a drag anywhere (on the board too: a tap that does not move is still a move on the board, a drag moves the view)
      drag = { x0: e.clientX, y0: e.clientY, x: view.x, y: view.y, moved: false };
    });
    addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        view.x = pinch.x + (mx - pinch.mx); view.y = pinch.y + (my - pinch.my);
        zoomAt(pinch.z * d / pinch.d / view.z, mx, my); e.preventDefault(); return;
      }
      if (drag) { const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; if (!drag.moved && Math.hypot(dx, dy) < 4) return; drag.moved = true; noClick = true; setView(view.z, drag.x + dx, drag.y + dy); }
    }, { passive: false });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { drag = null; setTimeout(() => { noClick = false; }, 0); } };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    area.addEventListener('dblclick', e => { if (!on3() || ui(e.target) || boardDom.contains(e.target)) return; setView(1, 0, 0); });   // back to the whole board
    const st2 = document.createElement('style');
    st2.textContent = '@media (pointer:fine){html.atlas-amazons:not(.atlas-2d) .board-area{touch-action:none}} html.atlas-amazons:not(.atlas-2d) #board{touch-action:none}';
    document.head.appendChild(st2);
  }
  // centre the board as drawn: the 3D board's corners (the slab and its base, not the pieces) projected on the screen, their top
  // and bottom set round the centre of the page's board area (#frame); a few passes (the camera follows the new lift)
  let bbox = null, cT = 0;
  function centre(n) {
    clearTimeout(cT); if (!root || de.classList.contains('atlas-2d') || view.z !== 1 || view.x || view.y) return;   // (zoomed / moved: the lift stays)
    cT = setTimeout(() => {
      const fr = document.getElementById('frame'); if (!fr || !bbox) return;
      let y0 = 1e9, y1 = -1e9;
      for (const x of [bbox.min.x, bbox.max.x]) for (const y of [bbox.min.y, bbox.max.y]) for (const z of [bbox.min.z, bbox.max.z]) { const p = T3.project(x, z, y); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const r = fr.getBoundingClientRect(), want = r.top + r.height / 2, err = (y0 + y1) / 2 - want, h = boardDom.offsetHeight * SC;
      if (!h || !isFinite(err)) return;
      if (Math.abs(err) > .5) { liftK += err / h; lift3d(); T3.kick(300); }
      if ((n || 0) < 4 && Math.abs(err) > .5) centre((n || 0) + 1);
    }, n ? 60 : 200);
  }
  addEventListener('resize', () => centre(0));
  // (zoomed: the common skin's placement — on a resize or a change of the board's box — put the canvas back round the board: full
  //  window again, after it)
  { const again = () => requestAnimationFrame(() => requestAnimationFrame(() => { if (hostFull) { const h = document.getElementById('atlasGL'); if (h && (h.style.width !== innerWidth + 'px' || h.offsetHeight > innerHeight)) { lift3d(); T3.kick(200); } } }));
    addEventListener('resize', again); if (window.ResizeObserver) new ResizeObserver(again).observe(boardDom);
    const gl = document.getElementById('atlasGL'); if (gl) new MutationObserver(again).observe(gl, { attributes: true, attributeFilter: ['style'] }); }
  // the page's clicks: the square under the pointer, read from the 3D view (the DOM board's box is distorted by the lean)
  window.boardPick = (x, y) => {
    if (de.classList.contains('atlas-2d') || !root) return null;
    const p = T3.pick({ clientX: x, clientY: y }, U.top); if (!p) return null;
    return [Math.floor(p.z + 5), Math.floor(p.x + 5)];
  };
  /* ---------- the board ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, Y = 0, built = '';
  const P3 = new Map();   // square → { g, k }
  let tok = 0;
  function build() {
    const look = T3.BOARDS && T3.BOARDS.amazons ? T3.BOARDS.amazons.get() : 'temple', key = look + pc3();
    if (key === built && root) return false;
    built = key; tok++;
    if (root) holder.remove(root);
    P3.clear();
    root = A3.board(look); U = root.userData; Y = U.top; bbox = new THREE.Box3().setFromObject(root); holder.add(root);   // (the box before it is added: in the holder's own units, as T3.project takes them)
    T3.show('amazons', holder, { still: true });
    skin.alignTo(10, U.top); lift3d(); centre(0);
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  build();
  const V = skin.view && skin.view({ key: 'atlas-amazons-view', cls: ['atlas-amazons'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: 「3D盤」 (boards) and 「3D駒」 (figures) under the 2D boards ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Figuren', hi: '3D मोहरे', ar: 'قطع ثلاثية الأبعاد', ru: '3D-фигуры', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  const PN = {
    statue: { ja: '大理石の女戦士像', en: 'Marble warriors', zh: '大理石女战士像', 'zh-TW': '大理石女戰士像', ko: '대리석 여전사상', es: 'Guerreras de mármol', fr: 'Guerrières de marbre', pt: 'Guerreiras de mármore', de: 'Marmorkriegerinnen', ru: 'Мраморные воительницы', tr: 'Mermer savaşçılar', id: 'Prajurit marmer', hi: 'संगमरमर की योद्धा', ar: 'محاربات من الرخام' },
    archer: { ja: '象牙と黒檀の弓兵', en: 'Ivory & ebony archers', zh: '象牙与乌木弓手', 'zh-TW': '象牙與烏木弓手', ko: '상아와 흑단 궁수', es: 'Arqueras de marfil y ébano', fr: 'Archères ivoire et ébène', pt: 'Arqueiras de marfim e ébano', de: 'Bogenschützinnen aus Elfenbein & Ebenholz', ru: 'Лучницы из слоновой кости и эбена', tr: 'Fildişi ve abanoz okçular', id: 'Pemanah gading & eboni', hi: 'हाथीदाँत और आबनूस की धनुर्धर', ar: 'رامياتٌ من العاج والأبنوس' },
    bronze: { ja: 'ブロンズと鉄のクイーン', en: 'Bronze & iron queens', zh: '青铜与铁女王', 'zh-TW': '青銅與鐵女王', ko: '청동과 철의 여왕', es: 'Reinas de bronce y hierro', fr: 'Reines de bronze et de fer', pt: 'Rainhas de bronze e ferro', de: 'Königinnen aus Bronze & Eisen', ru: 'Королевы из бронзы и железа', tr: 'Bronz ve demir kraliçeler', id: 'Ratu perunggu & besi', hi: 'काँसे और लोहे की रानियाँ', ar: 'ملكاتٌ من البرونز والحديد' },
  };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja'));
  const is3 = () => !V || V.is3d();
  function setLook(k) {
    if (!T3.BOARDS || !T3.BOARDS.amazons) return;
    if (T3.setBoard) T3.setBoard('amazons', k); else T3.BOARDS.amazons.set(k);
    if (V && !V.is3d()) V.set(true);
    try { mirror(); } catch (e) {}
    paint3();
  }
  function setSet(k) {
    try { localStorage.setItem('atlas-amazons-pc3', k); } catch (e) {}
    setPc3Attr();
    if (V && !V.is3d()) V.set(true);
    try { mirror(); } catch (e) {}
    paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS && T3.BOARDS.amazons; if (!f3 || !B) return;
    const l = lng(), cur = B.get(), on = is3(), cs = pc3();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('amazons', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    if (!prow.children.length) A3.SETS.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.set = k;
      const im = document.createElement('img'); im.src = 'img/pc3-' + k + '-w.webp'; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setSet(k); prow.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = cs === k; bt.querySelector('span').textContent = (PN[k] || {})[l] || PN[k].en; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D';
    f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-amazons-look' || e.key === 'atlas-amazons-pc3') { setPc3Attr(); try { mirror(); } catch (x) {} paint3(); } });

  /* ---------- 3D amazons and arrows mirrored from the page ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  const later = (ms, f, my) => setTimeout(() => { if (my === undefined || my === tok) f(); }, ms);
  function mkAmazon(k, sq) {
    const g = A3.piece(k <= 2 ? 1 : 2, pc3());
    const sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function mkArrow(sq, seed) {
    const g = new THREE.Group(), s = A3.scorch(), a = A3.arrow();
    s.position.y = .003; g.add(s);
    a.rotation.y = (seed * 2.399) % (Math.PI * 2); g.add(a); g.userData.arrow = a;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); A3.ignite(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (!g) return; A3.douse(g); if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      if (o.k === 5) continue;
      const el = els.get(i), on = !!(el && el.classList.contains('sel')), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .22 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
  }
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    build();
    tok++;
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: k === 5 ? mkArrow(i, i) : mkAmazon(k, i), k }); continue; }
      if (!o.g) { o.g = mkArrow(i, i); continue; }   // (an arrow still in the air when the page re-synced)
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z;
      if (k !== 5) { g.scale.set(1, 1, 1); g.userData.moving = false; g.userData.up = false; lift(g, 0); }
    }
    applySel(); T3.kick(300);
  }
  function travel(m, before) {
    const f = E.mFrom(m), tq = E.mTo(m), a = E.mArrow(m), o = P3.get(f); if (!o) return false;
    const my = tok, g = o.g;
    const qd = typeof qDur === 'function' ? qDur(m) : 400, ad = typeof aDur === 'function' ? aDur(m) : 300, gap = typeof SHOOT_GAP === 'number' ? SHOOT_GAP : 70;
    P3.delete(f); P3.set(tq, o);
    g.userData.moving = true; g.userData.up = false;
    const [x0, z0] = xz(f), [x1, z1] = xz(tq), h0 = hOf(g);
    anim(qd, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * .18 + h0 * (1 - k)); },
      () => { g.userData.moving = false; lift(g, 0); anim(140, k => { const s = 1 + Math.sin(k * Math.PI) * .04; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }, my);
    // the arrow: it flies after the amazon has landed, then sticks (the stuck arrow and the scorch appear at the strike)
    const old = P3.get(a); if (old) { drop(old.g); P3.delete(a); }
    const slot = { g: null, k: 5 }; P3.set(a, slot);
    later(qd + gap, () => A3.fly(root, Y, xz(tq), xz(a), ad, (d, f, done) => anim(d, f, done, my)), my);
    later(qd + gap + ad - 10, () => { if (P3.get(a) !== slot) return; slot.g = mkArrow(a, a); const st = slot.g.userData.arrow; st.position.y = .22; anim(90, k => { st.position.y = .22 * (1 - k) - .03 * k; }, null, my); A3.strike(slot.g, (d, f, done) => anim(d, f, done)); T3.kick(600); }, my);
    return true;
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oAnim = window.animateMove;
  window.animateMove = function (m, before) {
    const ok = oAnim.apply(this, arguments);
    if (ok && !(typeof isPass === 'function' && isPass(m))) { try { if (build() || !animOk() || !travel(m, before)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  if (piecesDom) new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
  try { mirror(); } catch (e) {}

  window.__amSkin = { look: () => built, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); }, lift: () => liftK };
})();
