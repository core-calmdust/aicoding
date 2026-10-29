/* =====================================================================
   Nine Men's Morris — portal skin (morris/?skin=atlas)
   The full morris page keeps every feature (AI, rated games, online play with the
   2D version, lessons, puzzles, the review box, analysis …). This file:
     • draws the jeweller's board (atlas/models/morris.js) with the 3D table. The camera
       is aligned to the DOM board, which stays on top (transparent) for taps, the move
       marks, hint labels, arrows and the mill line; a shift lens shows the board's near
       edge while the 24 points stay exactly on the DOM lattice
     • mirrors the page's pieces into the 3D gold / platinum pieces (atlas/games/morris-pieces.js):
       placing comes out of the felt channels (gold right, platinum left), moves slide or
       fly, a taken piece flies into the taker's channel; the selected piece lifts, the pieces
       that may be taken glow red, a fresh mill gets a gold ring under each piece
     • the twelve / six men's variants (other boards) fall back to the game's own 2D board
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.MODELS.morris || !T3.morrisSet || !window.AtlasSkin || typeof window.renderFx !== 'function') return;
  const boardDom = document.getElementById('board'), de = document.documentElement;
  de.classList.add('atlas-morris', 'atlas-mm3d');
  const st = document.createElement('style');
  st.textContent = `
html.atlas-morris{--cv:min((var(--vh) - var(--pad) * 2 - 8px - var(--ttop)) / 8.9, 150px);--sidew:clamp(260px, 100vw - var(--padx) * 2 - var(--gap) - var(--cv) * 10.2, 520px);--cell:min(var(--cv), (100vw - var(--padx) * 2 - var(--gap) - var(--sidew)) / 10.2);--fw:calc(var(--cell) * 10.2);--fh:calc(var(--cell) * 8.9)}
@media (pointer: coarse) and (max-width: 900px) and (max-aspect-ratio: 1/1){html.atlas-morris,html.atlas-morris body{--cell:min((100vw - 12px) / 10, 64px)!important}}
@media (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px){html.atlas-morris{--cell:min((var(--vh) - 20px) / 8.9, (100vw - 300px) / 10.2, 120px)}}
html.atlas-morris .frame{padding:calc(var(--cell) * .95) calc(var(--cell) * 1.6)!important;border:0!important}
html.atlas-mm3d .lines{opacity:0}
html.atlas-mm3d .pc{opacity:0!important}
html.atlas-mm3d .reserve{visibility:hidden}
html.atlas-mm3d .coords-x{top:calc(var(--cell) * 8.15 + 6px)!important;left:calc(var(--cell) * 1.6)!important}
html.atlas-mm3d .coords-y{display:none!important}
html.atlas-mm3d .coords-x,html.atlas-mm3d .coords-y{color:rgba(255,246,226,.8)!important;text-shadow:0 1px 2px rgba(0,0,0,.6)}
html.atlas-morris .board{box-shadow:none!important;background:transparent!important}
html.atlas-morris .board::after{display:none!important}
html.atlas-mm3d .mark.from{border-color:rgba(255,255,255,.75)}
html.atlas-mm3d .dest{background:rgba(255,226,122,.9);box-shadow:0 0 12px rgba(255,226,122,.95)}`;
  document.head.appendChild(st);

  const root = T3.MODELS.morris(true), U = root.userData, SC = root.children[0].scale.x;
  const LAT = 6.8 / 6 * SC;                 // one lattice unit (world)
  const S = 7 * LAT, Y = U.top;              // the DOM board spans 7 lattice units
  const SHIFT = S * .9, PERSP = 2.6;
  const HALF_D = 4.7 * SC;                   // the frame's half depth (world)

  const skin = AtlasSkin.init({
    margin: .28,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom, persp: PERSP,
    outer: r => { const k = r.height / S; return { top: r.top + r.height / 2 - HALF_D * k, height: (2 * HALF_D + .35) * k }; },
    guide: '../images/atlas/g-owl.webp', guideFallback: '../images/atlas/morris.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'pc\\b|\\.pc|\\.rv|reserve|\\.mark|\\.dest|hintlbl|fxsvg|millfx|lines|rbh',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (draft.mode !== 'rated') draft.rule = 'nine';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 10) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('morris', root, { still: true });
  skin.alignTo(S, Y);
  const host = document.getElementById('atlasGL'), holder = boardDom.parentElement;
  const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
  T3.align(() => { const b = box(); return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 0, persp: b.h * PERSP, shift: SHIFT }; }, S, Y);
  T3.kick(800);
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the page's pieces → 3D ---------- */
  const set = T3.morrisSet(root, { sfx: false });   // (the page plays its own sounds)
  const NONE = 31;
  let lifted = -1, millKey = '', variant = '';
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  function mirror() {
    let G_, pos, els, s, tent, shownMv, n;
    try { G_ = G; pos = posAt(cur).pos; els = pcEls; s = sel; tent = tentEl; shownMv = lastShown(); n = G_.n; } catch (e) { return; }
    // the 3D board is the nine men's lattice: the other variants show the game's 2D board
    const v = G_.name || (n === 24 && G_.diag ? 'twelve' : n === 24 ? 'nine' : 'six');
    if (v !== variant) { variant = v; const on = v === 'nine'; root.visible = on; de.classList.toggle('atlas-mm3d', on); T3.kick(300); }
    if (v !== 'nine') return;
    const b = new Array(24).fill(0);
    for (const [i, el] of els) b[i] = el.classList.contains('p2') ? 2 : 1;
    const hand = [0, pos.hand[1], pos.hand[2]];
    if (tent && s && s.stage === 'remove' && s.from === NONE) { b[s.to] = pos.side; hand[pos.side] = Math.max(0, hand[pos.side] - 1); }
    const caps = [0, Math.max(0, G_.pieces - pos.cnt[2] - pos.hand[2]), Math.max(0, G_.pieces - pos.cnt[1] - pos.hand[1])];
    let fly = false; try { const pv = cur > 0 ? posAt(cur - 1).pos : null; fly = !!(pv && !pv.placing() && pv.flying(pv.side)); if (s && s.stage === 'remove' && s.from !== NONE) fly = pos.flying(pos.side); } catch (e) {}
    set.sync({ b, hand, caps, fly }, animOk() ? undefined : false);
    // the selected piece lifts; the pieces that may be taken glow
    const want = s && s.stage === 'pick' && s.from !== NONE ? s.from : -1;
    if (want !== lifted) { if (lifted >= 0) set.lift(lifted, false); if (want >= 0) set.lift(want, true); lifted = want; }
    const o = {};
    let showLast = true; try { showLast = settings.last; } catch (e) {}
    if (shownMv >= 0 && !s && showLast) o.last = [-1, shownMv >> 5 & 31];
    if (want >= 0) o.sel = want;
    if (s && s.stage === 'remove') o.rm = [...new Set(s.cands.map(m => m >> 10 & 31))];
    set.marks(o);
    // a fresh mill (the last move took a piece, or the one just made while choosing the piece to take)
    let ml = [];
    try {
      if (s && s.stage === 'remove') ml = millsAt(b, s.to).flat();
      else if (shownMv >= 0 && (shownMv >> 10 & 31) !== NONE) ml = millsAt(pos.b, shownMv >> 5 & 31).flat();
    } catch (e) {}
    const k = ml.join(',') + '|' + cur;
    if (k !== millKey) { millKey = k; set.mill(ml.length ? [...new Set(ml)] : null, true); }
  }
  const oFx = window.renderFx;
  window.renderFx = function () { const r = oFx.apply(this, arguments); try { mirror(); } catch (e) {} T3.kick(200); return r; };
  try { mirror(); } catch (e) {}

  // test hooks (Playwright)
  window.__mmSkin = { dump: () => set._dump(), pieces: () => set.count(), at: i => { const [x, z] = set.xz(i); return T3.project(x, z, Y); }, variant: () => variant };
})();
