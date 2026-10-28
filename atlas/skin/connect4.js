/* =====================================================================
   Connect Four — portal skin (connect4/?skin=atlas)
   The full Connect Four page keeps every feature (AI up to perfect play, rated games,
   online play with the 2D version, lessons, puzzles, the review box, analysis …).
   This file:
     • draws the leather & walnut tile tower (atlas/models/connect4.js) with the 3D table,
       seen from the front: the camera looks level at the tower and is aligned to the
       DOM board, which stays on top (transparent) for the column taps, hint labels and marks.
       The tower is stretched a little in height (tiles counter-scaled, so they stay square)
       so its 7 × 6 grid lands exactly on the page's square cells
     • mirrors the page's discs into 3D tiles (atlas/games/connect4-tiles.js): a played tile
       drops in from above the open rail tops and falls between the rails; the winning four
       step forward under a gold bar; the hovered column shows the tile waiting above the rails
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.MODELS.connect4 || !T3.c4Set || !window.AtlasSkin || typeof window.renderBoard !== 'function') return;
  const boardDom = document.getElementById('board'), de = document.documentElement;
  de.classList.add('atlas-c4');
  const st = document.createElement('style');
  st.textContent = `
html.atlas-c4{--top:1.25;--cv:min((var(--vh) - var(--pad) * 2 - 8px - var(--ttop)) / 8.4, 150px);--sidew:clamp(260px, 100vw - var(--padx) * 2 - var(--gap) - var(--cv) * 10.5, 520px);--cell:min(var(--cv), (100vw - var(--padx) * 2 - var(--gap) - var(--sidew)) / 10.5);--fw:calc(var(--cell) * 10.5);--fh:calc(var(--cell) * (7.1 + var(--top)))}
@media (pointer: coarse) and (max-width: 900px) and (max-aspect-ratio: 1/1){html.atlas-c4,html.atlas-c4 body{--top:1.1;--cell:min((100vw - 12px) / 10.6, 70px)!important}}
@media (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px){html.atlas-c4{--top:1.1;--cell:min((var(--vh) - 20px) / 8.1, (100vw - 300px) / 10.5, 120px)}}
html.atlas-c4 .frame{padding:calc(var(--cell) * var(--top)) calc(var(--cell) * 1.75) calc(var(--cell) * 1.1)!important;border:0!important;background:transparent!important;box-shadow:none!important}
html.atlas-c4 .frame::before{display:none!important}
html.atlas-c4 .back,html.atlas-c4 .plate,html.atlas-c4 .rings,html.atlas-c4 .grain{display:none!important}
html.atlas-c4 .disc{opacity:0!important}
html.atlas-c4 .winring,html.atlas-c4 .winline{display:none!important}
html.atlas-c4 .coords{left:calc(var(--cell) * 1.75)!important;height:calc(var(--cell) * .42)!important;bottom:calc(var(--cell) * .02)!important;color:rgba(255,246,226,.85)!important;text-shadow:0 1px 2px rgba(0,0,0,.6)}
html.atlas-c4 .colhl{background:linear-gradient(180deg,rgba(255,226,122,0),rgba(255,226,122,.16) 22%,rgba(255,226,122,.08))!important}
html.atlas-c4 #fDesign{display:none!important}`;
  document.head.appendChild(st);

  const root = T3.MODELS.connect4(true), U = root.userData, g = root.children[0], SC = g.scale.x;
  const PITCH = U.cell(0, 1)[1] - U.cell(0, 0)[1], COLW = U.cell(1, 0)[0] - U.cell(0, 0)[0];   // world row / column pitch
  g.scale.y = SC * COLW / PITCH;            // square cells: the rows get the columns' pitch (tiles are counter-scaled)
  const set = T3.c4Set(root, { sfx: false });   // (the page plays its own sounds)
  const S = 6 * COLW;                       // the DOM board is 6 cells high
  const Y = (set.rowY(0) + set.rowY(5)) / 2 * g.scale.y;   // its centre height (world)
  const PERSP = 4.2;   // a longer lens than the flat boards: the tray (nearer the camera) stays inside the frame

  const skin = AtlasSkin.init({
    board: boardDom, persp: PERSP,
    outer: r => { const u = r.height / 6; return { top: r.top - u * 1.2, height: u * 8.3 }; },   // rail tops to tray
    guide: '../images/atlas/g-plop.webp', guideFallback: '../images/atlas/connect4.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'disc|\\.mark|hintlbl|winring|winline|colhl|plate|rings|grain|\\.back\\b',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 8) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('connect4', root, { still: true });
  skin.alignTo(S, Y);
  // a front view: the camera stands level with the board's centre, looking at the tower (tilt 90°); the DOM board stays flat
  const host = document.getElementById('atlasGL'), holder = boardDom.parentElement;
  const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
  T3.align(() => { const b = box(); return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 90, persp: b.h * PERSP }; }, S, Y);
  T3.kick(800);
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the page's discs → 3D tiles ---------- */
  const animOk = () => { try { return !!settings.anim; } catch (e) { return true; } };
  let winKey = '';
  function state() {
    let shown, g0; try { shown = shownMoves(); g0 = gridOf(shown); } catch (e) { return null; }
    return { shown, g: g0 };
  }
  function marks() {
    const s = state(); if (!s) return;
    const o = {};
    let showLast = true; try { showLast = settings.last; } catch (e) {}
    let stt = {}; try { stt = statusOf(s.shown) || {}; } catch (e) {}
    if (s.shown.length && showLast && !stt.winner) { const c = s.shown.charCodeAt(s.shown.length - 1) - 49; o.last = [c, s.g[c].length - 1]; }
    try { const hl = document.getElementById('colhl'); if (hl && hl.classList.contains('show') && hoverCol >= 0) o.ghost = { c: hoverCol, p: toMoveOf(s.shown) }; } catch (e) {}
    set.marks(o);
    const line = stt.winner && stt.line ? stt.line : null, k = line ? line.join(';') + '|' + s.shown : '';
    if (k !== winKey) { winKey = k; set.win(line); }
  }
  function mirror(anim) {
    const s = state(); if (!s) return;
    let fresh = null;
    if (anim && s.shown.length) { const c = s.shown.charCodeAt(s.shown.length - 1) - 49; fresh = c + ',' + (s.g[c].length - 1); }
    set.sync(s.g, fresh, animOk() ? true : false);
    marks();
  }
  const oRB = window.renderBoard;
  window.renderBoard = function (anim) { const r = oRB.apply(this, arguments); try { mirror(anim); } catch (e) {} T3.kick(200); return r; };
  const oFx = window.renderFx;
  if (typeof oFx === 'function') window.renderFx = function () { const r = oFx.apply(this, arguments); try { marks(); } catch (e) {} T3.kick(200); return r; };
  const oHv = window.setHover;
  if (typeof oHv === 'function') window.setHover = function () { const r = oHv.apply(this, arguments); try { marks(); } catch (e) {} return r; };
  try { mirror(false); } catch (e) {}

  // test hooks (Playwright)
  window.__c4Skin = { tiles: () => set.count(), col: c => { const [x, y] = set.cellXY(c, 3); return T3.project(x, 0, y); } };
})();
