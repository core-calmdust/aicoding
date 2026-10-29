/* =====================================================================
   Hex — portal skin (hex/?skin=atlas)
   The full hex page keeps every feature (AI, swap rule, 7 / 9 / 11 / 13 boards,
   lessons, puzzles, review / analysis, the review box, online play with the 2D
   version …). This file:
     • draws the presentation board (atlas/models/hex.js: marquetry hex tiles, black
       lacquer frame, enamel edges, brass corners) with the 3D table. The camera is aligned
       to the DOM board (#bd), which stays on top (transparent) for clicks, the hover ghost,
       the last-move dot, the winning chain, hints, threats and lesson marks.
       The 3D board takes the DOM board's orientation: flat, transposed (phones held upright)
       or turned 30° (the PC's wide diamond); the DOM board's view box is widened so the
       3D frame fits inside the page's own layout
     • mirrors the page's stones (syncStones) into the model's glass stones: a played
       stone is set down with a little slide, a swap turns the stone over
     • rebuilds the board when the size or the orientation changes
     • adds "3D" to the board and stone design rows of the new-game dialog (the game's own
       2D boards / stone sets stay selectable: a 2D board shows its 2D stones)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.MODELS.hex || !window.AtlasSkin || typeof window.syncStones !== 'function' || typeof window.geom !== 'function') return;
  const boardDom = document.getElementById('board'), bdSvg = document.getElementById('bd'), de = document.documentElement;
  if (!boardDom || !bdSvg) return;
  de.classList.add('atlas-hex');

  /* ---------- looks: 3D board (+ 3D or 2D stones) or the game's own 2D board and stones ---------- */
  const LK = 'atlas-hex-look';
  let bd3 = true, pc3 = true;
  try { const v = localStorage.getItem(LK); if (v === '2d') bd3 = pc3 = false; else if (v === '3d2') pc3 = false; } catch (e) {}

  /* ---------- the board: built for (size, orientation); its outline widens the DOM view box ---------- */
  let root = null, U = null, n = 0, rot = null, ext = null;
  const group = new THREE.Group();
  const st3 = new Map();   // cell → { g, c }
  const ROTM = r => { const m = new THREE.Matrix4(); if (r === 2) m.makeRotationY(Math.PI / 6); else if (r) m.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1); return m; };   // transposed: x ↔ z (a mirror, like the DOM board)
  function build(size, r) {
    if (root && size === n && r === rot) return;
    n = size; rot = r;
    for (const [, o] of st3) group.remove(o.g); st3.clear();
    root = T3.MODELS.hex(true, { n }); U = root.userData;
    root.matrixAutoUpdate = false; root.matrix.copy(ROTM(r)); root.updateMatrixWorld(true);
    // the whole board, turned like the DOM board, in cell units round its centre (vertex by vertex: a turned bounding box would be too large)
    const b = new THREE.Box3(), v = new THREE.Vector3(), c = U.cell;
    root.traverse(o => { const p = o.isMesh && o.geometry && o.geometry.attributes.position; if (!p) return; for (let i = 0; i < p.count; i++) b.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)); });
    ext = { x0: b.min.x / c, x1: b.max.x / c, y0: b.min.z / c, y1: b.max.z / c };
    root.add(group);
    if (shown) { T3.show('hex', root, { still: true }); look(true); }
  }
  // the DOM board's view box with room for the 3D frame (the cells keep their coordinates, so marks and clicks still match)
  const oGeom = window.geom;
  window.geom = function (size) {
    const g = oGeom.apply(this, arguments);
    if (!bd3) return g;
    try {
      build(size, g.rot);
      let cx = 0, cy = 0; for (let i = 0; i < g.X.length; i++) { cx += g.X[i]; cy += g.Y[i]; } cx /= g.X.length; cy /= g.Y.length;
      const m = .12, [vx, vy, vw, vh] = g.vb;
      const x0 = Math.min(vx, cx + ext.x0 - m), x1 = Math.max(vx + vw, cx + ext.x1 + m), y0 = Math.min(vy, cy + ext.y0 - m), y1 = Math.max(vy + vh, cy + ext.y1 + m);
      const hw = Math.max(cx - x0, x1 - cx), hh = Math.max(cy - y0, y1 - cy);   // centred on the board (the camera looks at its middle)
      g.vb = [cx - hw, cy - hh, hw * 2, hh * 2]; g.c3 = [cx, cy];
    } catch (e) { console.warn(e); }
    return g;
  };
  const curG = () => { try { return G; } catch (e) { return null; } };
  let shown = false;
  try { G = null; } catch (e) {}
  try { update(false); } catch (e) {}   // redraw with the widened view box (builds the board)
  if (!root) { const g0 = curG(); build(g0 ? g0.n : 11, g0 ? g0.rot : false); }

  // skin styles (after AtlasSkin's light-theme conversion, so they stay as written)
  const css = document.createElement('style');
  css.textContent = `
html.atlas-hex .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-hex .frame::before,html.atlas-hex .frame::after{display:none!important}
html.atlas-hex.pc2{--vh:calc(100vh - 64px)!important}
html.atlas-hex.pc2.ol-dock{--vh:calc(100vh - 64px - 108px)!important}
html.atlas-hex.pc2 .board{left:calc(50% - var(--fw) / 2)!important;transform:none!important}
html.atlas-hx3db .bd .plate,html.atlas-hx3db .bd .cell,html.atlas-hx3db .bd .rim,html.atlas-hx3db .bd .rimsh{display:none}
html.atlas-hx3db .bd .co{fill:#fff4dc!important;stroke:rgba(40,18,4,.75);stroke-width:.07px;paint-order:stroke;opacity:1}
html.atlas-hx3dp .bd .st:not(.ghost) .body,html.atlas-hx3dp .bd .st:not(.ghost) .sh,html.atlas-hx3dp .bd .st:not(.ghost) .hi{display:none}
html.atlas-hx3dp .bd .st.drop{animation:none!important}
html.atlas-hx3dp .bd .st.dim{opacity:1}
html.atlas-hx3dp .bd .st.dim .body{display:inline;fill:rgba(20,12,6,.45)!important;stroke:none}
html.atlas-hx3dp .bd .st.win .body{display:inline;fill:none!important;stroke:#fff1b8;stroke-width:.06}
html.atlas-hx3dp .bd .ghost{opacity:.5}
html.atlas-hex .bdrow{grid-template-columns:repeat(6,minmax(0,1fr))!important}
html.atlas-hex .bdrow.pcrow{grid-template-columns:repeat(5,minmax(0,1fr))!important}
html.atlas-hex .bdrow button:disabled{opacity:.4;cursor:default}
@media (max-width: 520px){html.atlas-hex .bdrow{gap:3px!important}html.atlas-hex .bdrow button{font-size:9.5px!important}}`;
  document.head.appendChild(css);

  const skin = AtlasSkin.init({
    margin: 0.14,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-stone.webp', guideFallback: '../images/atlas/hex.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: '\\.bd|\\.st\\b|\\.co\\b|lastdot|winline|\\.thr|\\.mark|hintlbl|ghost|plate|rim|frame|swap',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      const sz = +new URLSearchParams(location.search).get('size'); if ([7, 9, 11, 13].includes(sz)) draft.n = sz;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('hex', root, { still: true }); shown = true;
  const holder = boardDom.parentElement, host = document.getElementById('atlasGL');
  // the camera: centred on the middle of the cells, the DOM board's height = the view box height
  const box = () => {
    const g = curG(); let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    const w = boardDom.offsetWidth, h = boardDom.offsetHeight; if (!g || !w) return { x: x - host.offsetLeft, y: y - host.offsetTop, w, h };
    const [vx, vy, vw, vh] = g.vb, k = Math.min(w / vw, h / vh), c3 = g.c3 || [vx + vw / 2, vy + vh / 2];
    const px = x + w / 2 + (c3[0] - vx - vw / 2) * k, py = y + h / 2 + (c3[1] - vy - vh / 2) * k;
    return { x: px - host.offsetLeft - 50, y: py - host.offsetTop - vh * k / 2, w: 100, h: vh * k };
  };
  skin.alignTo(10, U.top);   // (AtlasSkin places the canvas round the board; the framing is ours)
  const align = () => T3.align(() => { const b = box(), g = curG(); return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 0, persp: b.h * 2.6 }; }, curG() ? curG().vb[3] * U.cell : 10, U.top);
  align(); T3.kick(800);
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- 3D stones mirrored from the page's position ---------- */
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done) => { const t0 = performance.now(); (function s(now) { const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function make(i, col) {
    const c = U.cell, g = new THREE.Group(), s = U.stone(col), sh = T3.contact(c * .44, .5);
    sh.position.y = .002; g.add(sh, s); g.userData.s = s; g.userData.sh = sh;
    const [x, z] = U.pt(i); g.position.set(x, U.top, z); group.add(g); return g;
  }
  function drop(g) {   // set down: it comes in low from the player's side, touches, slides a hair and settles
    const c = U.cell, s = g.userData.s, sh = g.userData.sh, h0 = c * .6, z0 = c * .3;
    // "towards the player" on screen, in the board's own (turned / mirrored) coordinates
    const inv = ROTM(rot).invert(), v = new THREE.Vector3(0, 0, z0).applyMatrix4(inv), x0 = v.x, zz = v.z;
    s.position.set(x0, h0, zz); sh.material.opacity = 0;
    anim(260, k => {
      const e = 1 - Math.pow(1 - k, 3), hh = k < .7 ? h0 * (1 - Math.pow(k / .7, 2)) : 0;
      s.position.y = hh; s.position.x = x0 * (1 - e); s.position.z = zz * (1 - e);
      sh.material.opacity = .5 * Math.min(1, k * 1.4);
      if (k > .7) { const q = (k - .7) / .3, sq = Math.sin(q * Math.PI) * .07; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); }
    }, () => { s.position.set(0, 0, 0); s.scale.set(1, 1, 1); sh.material.opacity = .5; });
  }
  function flipIn(g) {   // the swap: the stone turns over into the other colour
    const s = g.userData.s, c = U.cell;
    anim(360, k => { s.position.y = Math.sin(k * Math.PI) * c * .5; s.rotation.x = (1 - k) * Math.PI; }, () => { s.position.y = 0; s.rotation.x = 0; });
  }
  function remove(o) { group.remove(o.g); o.g.userData.sh.material.dispose(); }
  function mirror(pos, animCell) {
    const g = curG(); if (!pos || !pos.b || !g) return;
    build(pos.n, g.rot);
    const ok = animOk(), fresh = ok && animCell >= 0 ? animCell : -1;
    let swapped = false;
    for (const [i, o] of st3) if (pos.at(i) !== o.c) { st3.delete(i); remove(o); swapped = true; }
    for (let i = 0; i < pos.b.length; i++) {
      const col = pos.at(i); if (!col || st3.has(i)) continue;
      const gg = make(i, col); st3.set(i, { g: gg, c: col });
      if (i === fresh) (swapped && st3.size === 1 ? flipIn : drop)(gg);
    }
    T3.kick(300);
  }
  const oSync = window.syncStones;
  window.syncStones = function (pos, animCell) { const r = oSync.apply(this, arguments); try { mirror(pos, animCell); } catch (e) { console.warn(e); } return r; };
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); T3.kick(200); return r; }; }
  // a new view box (size / orientation): re-frame
  if (typeof window.drawBoardSVG === 'function') { const od = window.drawBoardSVG; window.drawBoardSVG = function () { const r = od.apply(this, arguments); try { align(); T3.kick(600); setTimeout(() => dispatchEvent(new Event('resize')), 30); } catch (e) {} return r; }; }
  try { G = null; update(false); } catch (e) {}

  /* ---------- the design rows: "3D" for the board and for the stones + the game's own 2D designs ---------- */
  const LBL = {
    bd: { ja: '寄木3D', en: 'Marquetry 3D', zh: '拼木3D', ko: '쪽매 3D', es: 'Marquetería 3D', fr: 'Marqueterie 3D', pt: 'Marchetaria 3D', de: 'Intarsie 3D', hi: 'जड़ाऊ 3D', ar: 'تطعيم ثلاثي' },
    pc: { ja: 'ガラス3D', en: 'Glass 3D', zh: '玻璃3D', ko: '유리 3D', es: 'Vidrio 3D', fr: 'Verre 3D', pt: 'Vidro 3D', de: 'Glas 3D', hi: 'काँच 3D', ar: 'زجاج ثلاثي' },
  };
  const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
  const vbOf = row => { const s = row && row.querySelector('button svg'); return (s && s.getAttribute('viewBox')) || '0 0 6 4'; };
  function thumb(kind, vb) {
    const [x, y, w, h] = vb.split(/[ ,]+/).map(Number), R = Math.min(w, h) / 7.2, S3 = Math.sqrt(3), cx = x + w / 2, cy = y + h / 2;
    const hex = (px, py, f) => { let d = ''; for (let j = 0; j < 6; j++) { const a = (60 * j - 90) * Math.PI / 180; d += (j ? 'L' : 'M') + (px + Math.cos(a) * R * .98).toFixed(3) + ',' + (py + Math.sin(a) * R * .98).toFixed(3); } return `<path d="${d}Z" fill="${f}" stroke="#7a5a32" stroke-width="${R * .06}"/>`; };
    const WOODS = ['#e8cf9e', '#d9b77c', '#cdbf8e'];
    let s = '';
    for (let r = -2; r <= 2; r++) for (let c = -4; c <= 4; c++) { const px = cx + (c + r / 2) * R * S3, py = cy + r * R * 1.5; if (px < x - R || px > x + w + R) continue; s += hex(px, py, kind === 'pc' ? '#5d4630' : WOODS[((r + 9) + 2 * (c + 9)) % 3]); }
    const st = (px, py, red) => `<circle cx="${px}" cy="${py}" r="${R * .78}" fill="${red ? '#c8261c' : '#1f4fae'}"/><ellipse cx="${px - R * .25}" cy="${py - R * .3}" rx="${R * .32}" ry="${R * .2}" fill="rgba(255,255,255,.7)"/>`;
    s += st(cx - R * S3 / 2, cy - R * 1.5, true) + st(cx + R * S3 / 2, cy, false) + st(cx - R * S3 / 2, cy + R * 1.5, true);
    return `<svg viewBox="${vb}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${kind === 'pc' ? '#3a2a1c' : '#120d0a'}"/>${s}</svg>`;
  }
  function paintRows() {
    [[document.getElementById('bdRow'), 'bd'], [document.getElementById('pcRow'), 'pc']].forEach(([row, k]) => {
      if (!row) return;
      let b = row.querySelector('button[data-a3]');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.dataset.a3 = k; row.prepend(b); }
      const on = k === 'bd' ? bd3 : bd3 && pc3, L = LBL[k];
      b.innerHTML = thumb(k, vbOf(row)) + '<span></span>'; b.querySelector('span').textContent = L[lang()] || L.en;
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on);
      if (k === 'pc') b.disabled = !bd3;   // 3D stones only on the 3D board (the DOM board would cover them)
      if (on) row.querySelectorAll('button:not([data-a3])').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    });
  }
  let lastBd = bd3;
  function look(quiet) {
    if (root) root.visible = bd3;
    group.visible = bd3 && pc3;
    de.classList.toggle('atlas-hx3db', bd3); de.classList.toggle('atlas-hx3dp', bd3 && pc3);
    try { localStorage.setItem(LK, !bd3 ? '2d' : pc3 ? '3d' : '3d2'); } catch (e) {}
    if (quiet) return;
    paintRows();
    if (lastBd !== bd3) { lastBd = bd3; try { G = null; update(false); } catch (e) {} }   // the view box follows (room for the 3D frame or not)
    T3.kick(400);
  }
  const onRow = k => e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.a3) { e.stopImmediatePropagation(); if (k === 'bd') { if (!bd3) pc3 = true; bd3 = true; } else pc3 = true; look(); return; }   // the game's own 2D setting stays as it is
    if (k === 'bd') { bd3 = false; pc3 = false; } else pc3 = false;   // a 2D board brings its 2D stones
    setTimeout(look, 0);
  };
  const r1 = document.getElementById('bdRow'), r2 = document.getElementById('pcRow');
  if (r1) r1.addEventListener('click', onRow('bd'), true);
  if (r2) r2.addEventListener('click', onRow('pc'), true);
  if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paintRows(); } catch (e) {} return r; }; }
  const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintRows, 30));
  look(true); paintRows();

  // test hooks (Playwright)
  window.__hxSkin = { stones: () => st3.size, n: () => n, rot: () => rot, look: () => (bd3 ? (pc3 ? '3d' : '3d2') : '2d'), at: i => { const [x, z] = U.pt(i), v = new THREE.Vector3(x, 0, z).applyMatrix4(ROTM(rot)); return T3.project(v.x, v.z, U.top + U.cell * .26); } };
})();
