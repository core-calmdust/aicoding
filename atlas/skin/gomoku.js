/* =====================================================================
   Gomoku & Renju — portal skin (gomoku/?skin=atlas)
   The full gomoku page keeps every feature (AI, rated games, online play with
   the 2D version, lessons, openings, renju puzzles, review / analysis,
   forbidden-move marks…). This file:
     • draws the legged go board (atlas/models/goban.js) with the 3D table. The camera
       is aligned to the DOM board, which stays on top (transparent) for taps, marks,
       numbers, hints and the win line. A shift lens (camera towards the player, still
       looking straight down) keeps the field exactly on the DOM grid while the near
       side of the thick board — lacquer and gold 沈金, or kaya — and its legs show
     • mirrors the page's stones (syncStones) into 3D slate / shell stones; a played
       stone is set down with a little slide (the game plays its own click)
     • adds the two 3D looks to the board-design row of the new-game dialog
       (the game's own 2D boards stay selectable: then its 2D stones are drawn)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.goban || !window.AtlasSkin || typeof window.syncStones !== 'function') return;
  const GB = T3.goban, boardDom = document.getElementById('board'), de = document.documentElement;
  de.classList.add('atlas-gomoku');

  /* ---------- look: 'lacquer' | 'kaya' | '' (the game's own 2D stones on the kaya board) ---------- */
  const LK = 'atlas-gomoku-look';
  let mine = 'lacquer'; try { const v = localStorage.getItem(LK); mine = v === '0' ? '' : v === 'kaya' ? 'kaya' : 'lacquer'; } catch (e) {}
  const root = T3.MODELS.gomoku(true, { look: mine || 'kaya' }), U = root.userData, S = U.S, Y = U.top, c = U.cell;
  // how far the near side and the legs reach below the field (in DOM cells), for the shift lens
  const SHIFT = S * 1.3, PERSP = 2.6, D = S * PERSP, zE = U.W / 2;
  const below = (SHIFT - zE) * (1 - D / (D + U.thick + U.legH)) / c;   // cells below the 3D board's near top edge
  const RIM = (U.W - S) / 2 / c;                                         // the 3D board's margin around the DOM board (cells)
  de.style.setProperty('--gmband', (below + .35).toFixed(2));
  de.style.setProperty('--gmrim', RIM.toFixed(3));

  const skin = AtlasSkin.init({
    margin: 0.18,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom, persp: PERSP,
    outer: r => { const u = r.height / 16; return { top: r.top - RIM * u, height: (16 + 2 * RIM + below) * u }; },
    guide: '../images/atlas/g-stone.webp', guideFallback: '../images/atlas/gomoku.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'st\\b|\\.st|\\.mk|winline|hintlbl|grid|frame|coach',
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
  T3.show('gomoku', root, { still: true });
  skin.alignTo(S, Y);
  // the shift lens: AtlasSkin's framing, with the camera standing towards the player
  // (the canvas already reaches 30 % of the board beyond it on every side: room for the near side and the legs)
  const host = document.getElementById('atlasGL'), holder = boardDom.parentElement;
  const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
  T3.align(() => { const b = box(); return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 0, persp: b.h * PERSP, shift: SHIFT }; }, S, Y);
  T3.kick(800);
  // the room left under the board moves it without resizing it: re-fit the side column and the canvas once the layout settles
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // later the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- 3D stones mirrored from the page's stones ---------- */
  const group = new THREE.Group(); root.add(group);
  const st3 = new Map();   // cell → { g, c }
  const xz = m => U.pt(m % 15, 14 - Math.floor(m / 15));
  const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function make(m, col) {
    const g = new THREE.Group(), s = GB.stone(col, c, m * 7 + col), sh = T3.contact(c * .47, .5);
    sh.position.y = .002; g.add(sh, s); g.userData.sh = sh; g.userData.s = s;
    const [x, z] = xz(m); g.position.set(x, Y, z); group.add(g); return g;
  }
  function drop(g) {   // fingers set the stone down: it comes in low from the player's side, touches, slides a hair and settles
    const s = g.userData.s, sh = g.userData.sh, z0 = c * .32, h0 = c * .55;
    s.position.set(0, h0, z0); s.rotation.x = -.35; sh.material.opacity = 0;
    anim(240, k => {
      const e = 1 - Math.pow(1 - k, 3), hh = k < .7 ? h0 * (1 - Math.pow(k / .7, 2)) : 0;
      s.position.y = hh; s.position.z = z0 * (1 - e); s.rotation.x = -.35 * (1 - Math.min(1, k / .7));
      sh.material.opacity = .5 * Math.min(1, k * 1.4);
      if (k > .7) { const q = (k - .7) / .3, sq = Math.sin(q * Math.PI) * .06; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); }
    }, () => { s.position.set(0, 0, 0); s.rotation.x = 0; s.scale.set(1, 1, 1); sh.material.opacity = .5; });
  }
  function lift(g) {   // undo: the stone is picked up
    const s = g.userData.s, sh = g.userData.sh;
    anim(160, k => { s.position.y = c * .5 * k; s.position.z = c * .25 * k; sh.material.opacity = .5 * (1 - k); s.scale.setScalar(1 - k * .3); }, () => { group.remove(g); sh.material.dispose(); });
  }
  function mirror(fresh) {
    let els; try { els = stEls; } catch (e) { return; }
    const want = new Map(); for (const [m, el] of els) want.set(m, +el.dataset.c);
    for (const [m, o] of st3) { if (want.get(m) !== o.c) { if (want.has(m) || !animOk()) { group.remove(o.g); o.g.userData.sh.material.dispose(); } else lift(o.g); st3.delete(m); } }
    for (const [m, col] of want) {
      if (st3.has(m)) continue;
      const g = make(m, col); st3.set(m, { g, c: col });
      if (m === fresh && animOk()) drop(g);
    }
    T3.kick(300);
  }
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const oSync = window.syncStones;
  window.syncStones = function (i, fresh) { const r = oSync.apply(this, arguments); try { mirror(fresh); } catch (e) {} return r; };
  // the page may have drawn its stones before we hooked in
  try { mirror(-1); } catch (e) {}
  // every redraw of the marks (last move, hints, forbidden points, win line …) asks for a frame too
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); T3.kick(200); return r; }; }

  /* ---------- the board-design row: two 3D looks + the game's own 2D boards ---------- */
  const LBLS = {
    lacquer: { ja: '漆・沈金3D', en: 'Lacquer 3D', zh: '漆金3D', ko: '옻칠 3D', es: 'Laca 3D', fr: 'Laque 3D', pt: 'Laca 3D', de: 'Lack 3D', hi: 'लाख 3D', ar: 'ورنيش ثلاثي' },
    kaya: { ja: '榧3D', en: 'Kaya 3D', zh: '榧木3D', ko: '비자 3D', es: 'Kaya 3D', fr: 'Kaya 3D', pt: 'Kaya 3D', de: 'Kaya 3D', hi: 'काया 3D', ar: 'كايا ثلاثي' },
  };
  const BTN = { lacquer: 'atlaslacq', kaya: 'atlaskaya' };
  const seg = document.getElementById('segSkin');
  const skinNow = () => { try { return settings.skin || 'classic'; } catch (e) { return 'classic'; } };
  function look() {
    if (seg) seg.querySelectorAll('button').forEach(x => { if (mine) x.classList.toggle('sel', x.dataset.v === BTN[mine]); else if (x.dataset.set) x.classList.remove('sel'); });
    U.setLook(mine || 'kaya'); U.setTone(mine ? 'classic' : skinNow());
    group.visible = !!mine; de.classList.toggle('atlas-gm3d', !!mine);
    try { localStorage.setItem('atlas-gomoku-look', mine === 'kaya' ? 'kaya' : mine ? 'lacquer' : '0'); } catch (e) {}
    T3.kick(400);
  }
  if (seg) {
    const bs = ['kaya', 'lacquer'].map(k => { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = BTN[k]; b.dataset.set = k; seg.prepend(b); return b; });
    const paintLbl = () => { const l = (document.getElementById('langSel') || {}).value || 'ja'; bs.forEach(b => { const L = LBLS[b.dataset.set]; b.textContent = L[l] || L.en; }); };
    paintLbl(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintLbl, 30));
    seg.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      mine = t.dataset.set || '';
      if (mine) e.stopImmediatePropagation();   // a 3D look: the game's own 2D setting stays as it is
      setTimeout(look, 0);
    }, true);
  }
  if (typeof window.applySkin === 'function') { const oa = window.applySkin; window.applySkin = function () { const r = oa.apply(this, arguments); try { look(); } catch (e) {} return r; }; }
  setTimeout(look, 0);

  // test hooks (Playwright)
  window.__gmSkin = { stones: () => st3.size, look: () => mine, at: m => { const [x, z] = xz(m); return T3.project(x, z, Y); } };
})();
