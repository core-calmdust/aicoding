/* =====================================================================
   Go — portal skin (go/?skin=atlas)
   The full go page keeps every feature (AI, rated games, online play with the 2D
   version, lessons, joseki, tsumego, review / analysis, counting …). This file:
     • draws the legged go board (atlas/models/goban.js, 5 … 19 lines) with the 3D table.
       The camera is aligned to the DOM board (#goban), which stays on top (transparent)
       for taps, the hover ghost, territory / ko / hint / lesson marks and coordinates.
       In skin mode the DOM board always shows the whole board with a 1-cell margin
       (vbox) so the grid lands exactly on the 3D grid; a shift lens (camera towards
       the player, still looking straight down) shows the near side and the legs
     • mirrors the page's stones (syncStones) into 3D slate / shell stones: a played
       stone is set down with a little slide, captured stones are lifted away (only when
       the game's animation setting is on), the last move gets a red dot on the stone,
       dead stones (counting) turn translucent
     • rebuilds the board when the game changes size
     • adds the two 3D looks (natural kaya / lacquer & gold 沈金) to the board-design row
       of the new-game dialog; picking one of the game's own 2D boards shows its 2D stones
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.goban || !T3.MODELS.go || !window.AtlasSkin || typeof window.syncStones !== 'function') return;
  const GB = T3.goban, boardDom = document.getElementById('goban'), de = document.documentElement;
  if (!boardDom) return;
  de.classList.add('atlas-go');
  const NN = () => { try { return N(); } catch (e) { return 19; } };

  // the DOM board: always the whole board, a 1-cell margin on every side (coordinates fit in it) → n + 1 cells across
  window.vbox = function () { const n = NN(); return [-1, -1, n + 1, n + 1]; };
  try { drawnKey = ''; } catch (e) {}

  /* ---------- look: 'kaya' | 'lacquer' | '' (the game's own 2D stones on the kaya board) ---------- */
  const LK = 'atlas-go-look';
  let mine = 'kaya'; try { const v = localStorage.getItem(LK); mine = v === '0' ? '' : v === 'lacquer' ? 'lacquer' : 'kaya'; } catch (e) {}

  /* ---------- the board (rebuilt when the size changes) ---------- */
  const PERSP = 2.6;
  let root = null, U = null, n = 0, S = 0, Y = 0, c = 0, SHIFT = 0, below = 0, RIM = 0;
  const group = new THREE.Group();
  const st3 = new Map();   // point → { g, c }
  let lastMesh = null, lastMark = -2;   // the last-move dot (see marks())
  function build(size) {
    n = size;
    root = T3.MODELS.go(true, { n, look: mine || 'kaya' }); U = root.userData;
    S = U.S; Y = U.top; c = U.cell; SHIFT = S * 1.3;
    const D = S * PERSP, zE = U.W / 2;
    below = (SHIFT - zE) * (1 - D / (D + U.thick + U.legH)) / c;   // cells below the 3D board's near top edge (shift lens)
    RIM = (U.W - S) / 2 / c;                                         // the 3D board's margin around the DOM board (cells)
    const span = n + 1;   // the DOM board in cells; the frame is shrunk so the band under it (near side + legs) fits the page
    de.style.setProperty('--goband', ((below + .35) / span).toFixed(4));
    // about the 2D board's size: only part of the near side / legs band has to fit inside the 2D frame's height (the rest may hang below)
    de.style.setProperty('--gok', (1 / (1 + (0.3 * (below + .35) + RIM) / span)).toFixed(4));
    for (const [, o] of st3) group.remove(o.g); st3.clear(); lastMark = -2;
    root.add(group);
  }
  build(NN());

  const outerFn = r => { const u = r.height / (n + 1); return { top: r.top - RIM * u, height: (n + 1 + 2 * RIM + below) * u }; };
  const skin = AtlasSkin.init({
    board: boardDom, persp: PERSP,
    outer: r => outerFn(r),
    guide: '../images/atlas/g-stone.webp', guideFallback: '../images/atlas/go.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'pdisc|p[12]\\b|st\\b|gstar|gl\\b|gco|lm\\b|ko\\b|mnum|terr|own\\b|mk-|arrow|goban|bsvg|frame|hc\\b',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 26) draft.level = lv;
      const sz = +new URLSearchParams(location.search).get('size'); if (sz >= 5 && sz <= 19) { draft.size = sz; if (sz < 7) draft.ha = 0; }
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  // skin styles (injected after AtlasSkin's light-theme conversion, so they stay as written)
  const css = document.createElement('style');
  css.textContent = `
html.atlas-go #frame{width:calc(var(--bs) * var(--gok, .86))!important;height:calc(var(--bs) * var(--gok, .86))!important;margin:0 0 calc(var(--bs) * var(--gok, .86) * var(--goband, .13))!important;background:transparent!important;box-shadow:none!important}
html.atlas-go .goban{background:transparent!important;box-shadow:none!important;border-radius:0!important}
html.atlas-go .bsvg .gl,html.atlas-go .bsvg .gstar{display:none}
html.atlas-go .bsvg .gco{fill:rgba(70,40,10,.55)!important}
html.atlas-go.atlas-go3d #gStones{display:none}
html.atlas-go.atlas-go3d .bsvg .lm{display:none}
html.atlas-go .bsvg .ghost{opacity:.55}
html.atlas-go .side{align-self:start!important}
html.atlas-go body.counting #evalCard .graph{display:none}
@media (max-aspect-ratio: 1/1) and (pointer: coarse){html.atlas-go .side-in > *{width:min(var(--bs), 100%)}}`;
  document.head.appendChild(css);

  T3.show('go', root, { still: true });
  skin.alignTo(S, Y);
  // the shift lens: AtlasSkin's framing, with the camera standing towards the player
  const host = document.getElementById('atlasGL'), holder = boardDom.parentElement;
  const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
  const align = () => T3.align(() => { const b = box(); return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 0, persp: b.h * PERSP, shift: SHIFT }; }, S, Y);
  align(); T3.kick(800);
  // the room left under the board moves it without resizing it: re-fit the side column and the canvas once the layout settles
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // later the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }
  function resize(size) {   // a new board size: a new 3D board, the same framing
    build(size); T3.show('go', root, { still: true }); align(); look(true);
    T3.kick(600); setTimeout(() => dispatchEvent(new Event('resize')), 30);
  }

  /* ---------- 3D stones mirrored from the page's position ---------- */
  const xz = i => U.pt(i % n, Math.floor(i / n));
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done) => { const t0 = performance.now(); (function s(now) { const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  const ghostMat = {};
  const deadMat = col => ghostMat[col] || (ghostMat[col] = Object.assign(GB.stoneMat(col).clone(), { transparent: true, opacity: .42, depthWrite: false }));
  function make(i, col) {
    const g = new THREE.Group(), s = GB.stone(col, c, i * 7 + col), sh = T3.contact(c * .47, .5);
    sh.position.y = .002; g.add(sh, s); g.userData.sh = sh; g.userData.s = s; g.userData.col = col;
    const [x, z] = xz(i); g.position.set(x, Y, z); group.add(g); return g;
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
  function gone(g, delay) {   // a captured stone is picked up and taken off the board
    const s = g.userData.s, sh = g.userData.sh;
    setTimeout(() => anim(280, k => { s.position.y = c * .6 * k; s.scale.setScalar(Math.max(.01, 1 - k)); sh.material.opacity = .5 * (1 - k); }, () => { group.remove(g); sh.material.dispose(); }), delay);
  }
  function remove(o) { group.remove(o.g); o.g.userData.sh.material.dispose(); }
  function mirror(pos, animate, captured) {
    if (!pos || !pos.b) return;
    if (pos.n !== n) resize(pos.n);
    let fresh = -1; try { fresh = animate && cur > 0 && moves[cur - 1] >= 0 && pos.b[moves[cur - 1]] ? moves[cur - 1] : -1; } catch (e) {}
    const ok = animOk(), caps = new Set(animate && captured ? captured : []);
    let k = 0;
    for (const [i, o] of st3) if (pos.b[i] !== o.c) { st3.delete(i); if (ok && caps.has(i)) gone(o.g, 220 + (k++) * 35); else remove(o); }
    for (let i = 0; i < n * n; i++) {
      const col = pos.b[i]; if (!col || st3.has(i)) continue;
      const g = make(i, col); st3.set(i, { g, c: col });
      if (i === fresh && ok) drop(g);
    }
    T3.kick(300);
  }
  /* ---------- marks: the last move (a red dot on the stone), dead stones while counting ---------- */
  const H = () => c * .47 * GB.SH * 2;   // stone height
  const lastMat = new THREE.MeshBasicMaterial({ color: 0xff3b2b, transparent: true, opacity: .95, toneMapped: false, depthWrite: false });
  function marks() {
    const pos = (() => { try { return posAt(cur); } catch (e) { return null; } })(); if (!pos) return;
    // last move: the page draws its ring (.lm) only when its "last move" setting is on — follow it
    let lm = -1; try { const m = cur > 0 ? moves[cur - 1] : -1; if (m >= 0 && pos.b[m] && document.querySelector('#gMarks .lm')) lm = m; } catch (e) {}
    if (lm !== lastMark || !lastMesh || lastMesh.parent !== root) {
      lastMark = lm;
      if (lastMesh) { lastMesh.parent && lastMesh.parent.remove(lastMesh); lastMesh.geometry.dispose(); lastMesh = null; }
      if (lm >= 0) { lastMesh = new THREE.Mesh(new THREE.CylinderGeometry(c * .12, c * .12, .01, 24), lastMat); const [x, z] = xz(lm); lastMesh.position.set(x, Y + H() + .004, z); lastMesh.renderOrder = 3; root.add(lastMesh); }
    }
    // dead stones (the page marks them .dead while counting)
    const dead = new Set(); try { if (count && count.key === keyOf(cur)) count.dead.forEach(i => dead.add(i)); } catch (e) {}
    for (const [i, o] of st3) { const want = dead.has(i) ? deadMat(o.c) : GB.stoneMat(o.c); if (o.g.userData.s.material !== want) o.g.userData.s.material = want; }
    T3.kick(200);
  }
  const oSync = window.syncStones;
  window.syncStones = function (pos, animate, captured) { const r = oSync.apply(this, arguments); try { mirror(pos, animate, captured); } catch (e) { console.warn(e); } return r; };
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); try { marks(); } catch (e) {} return r; }; }
  // the page has drawn its board before we hooked in: redraw with the full-board view box and mirror it
  try { drawnKey = ''; if (typeof renderBoard === 'function') renderBoard(false); } catch (e) {}
  try { mirror(posAt(cur), false, null); marks(); } catch (e) {}

  /* ---------- the board-design row: two 3D looks + the game's own 2D boards ---------- */
  const LBLS = {
    kaya: { ja: '榧3D', en: 'Kaya 3D', zh: '榧木3D', ko: '비자 3D', es: 'Kaya 3D', fr: 'Kaya 3D', pt: 'Kaya 3D', de: 'Kaya 3D', hi: 'काया 3D', ar: 'كايا ثلاثي' },
    lacquer: { ja: '漆・沈金3D', en: 'Lacquer 3D', zh: '漆金3D', ko: '옻칠 3D', es: 'Laca 3D', fr: 'Laque 3D', pt: 'Laca 3D', de: 'Lack 3D', hi: 'लाख 3D', ar: 'ورنيش ثلاثي' },
  };
  // thumbnails: the game's own kaya thumbnail (a real little board), the lacquer one with a black urushi side and a gold line
  const thumb = k => { let s = ''; try { s = designThumb('kaya', 'classic'); } catch (e) {} if (!s) return '<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#e1b469"/></svg>';
    if (k !== 'lacquer') return s; const W = +(s.match(/viewBox="0 0 ([\d.]+)/) || [0, 74])[1];
    return s.replace('</svg>', `<rect x="0" y="${W * .8}" width="${W}" height="${W * .2}" fill="#120d0a"/><path d="M${W * .08} ${W * .9}H${W * .92}" stroke="#efcd72" stroke-width="${W * .02}"/></svg>`); };
  const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
  function look(quiet) {
    U.setLook(mine || 'kaya');
    group.visible = !!mine; if (lastMesh) lastMesh.visible = !!mine;
    de.classList.toggle('atlas-go3d', !!mine);
    try { localStorage.setItem(LK, mine || '0'); } catch (e) {}
    paintRow();
    if (!quiet) T3.kick(400);
  }
  function paintRow() {
    const row = document.getElementById('bdRow'); if (!row) return;
    let bs = [...row.querySelectorAll('button[data-look]')];
    if (!bs.length) bs = ['lacquer', 'kaya'].map(k => { const b = document.createElement('button'); b.type = 'button'; b.dataset.look = k; row.prepend(b); return b; });
    bs.forEach(b => { const k = b.dataset.look, L = LBLS[k]; b.innerHTML = thumb(k) + '<span></span>'; b.querySelector('span').textContent = L[lang()] || L.en; b.classList.toggle('sel', mine === k); b.setAttribute('aria-pressed', mine === k); });
    if (mine) row.querySelectorAll('button[data-bd]').forEach(b => { b.classList.remove('sel'); b.setAttribute('aria-pressed', 'false'); });
  }
  const bdRow = document.getElementById('bdRow');
  if (bdRow) bdRow.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.look) { e.stopImmediatePropagation(); mine = t.dataset.look; look(); return; }   // a 3D look: the game's own 2D board setting stays as it is
    if (t.dataset.bd) { mine = ''; setTimeout(() => look(), 0); }                                   // a 2D board: its 2D stones on the kaya board
  }, true);
  if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paintRow(); } catch (e) {} return r; }; }
  const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintRow, 30));
  look(true);

  // test hooks (Playwright)
  window.__goSkin = { stones: () => st3.size, n: () => n, look: () => mine, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); }, last: () => lastMark, dead: () => [...st3].filter(([, o]) => o.g.userData.s.material.transparent).length };
})();
