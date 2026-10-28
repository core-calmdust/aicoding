/* =====================================================================
   Hnefatafl — portal skin (tafl/?skin=atlas)
   The full tafl page keeps every feature (AI, rated games, the three rule sets
   Copenhagen 11 × 11 / Tablut 9 × 9 / Brandubh 7 × 7, lessons, puzzles, openings,
   review / analysis, the review box, online play with the 2D version …). This file:
     • draws the viking oak board (table3d.js MODELS.tafl: carved grid, knotwork corners
       and throne, rune-carved walnut frame) with the 3D table. The camera is aligned to
       the DOM board (#board, n × n cells), which stays on top (transparent) for clicks,
       the selection glow, move dots, hints, threats and lesson marks
     • mirrors the page's pieces (pcEls) into the turned walnut / bone pieces and the
       crowned king: a move slides the piece over the board with a little lift, a taken
       piece is lifted off and fades; the selected piece rises a hair
     • rebuilds the board when the rule set (board size) changes
     • inside the frame the board is drawn a little smaller (frame-local --cell), so the
       3D frame and the captured pieces fit the page's own layout
     • adds "3D" to the board and piece design rows of the new-game dialog (the game's own
       2D boards / piece sets stay selectable: a 2D board shows its 2D pieces)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.MODELS.tafl || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.drawLines !== 'function') return;
  const boardDom = document.getElementById('board'), de = document.documentElement;
  if (!boardDom) return;
  de.classList.add('atlas-tafl');

  /* ---------- looks: 3D board (+ 3D or 2D pieces) or the game's own 2D board and pieces ---------- */
  const LK = 'atlas-tafl-look';
  let bd3 = true, pc3 = true;
  try { const v = localStorage.getItem(LK); if (v === '2d') bd3 = pc3 = false; else if (v === '3d2') pc3 = false; } catch (e) {}

  const curN = () => { try { return N; } catch (e) { return 11; } };
  let root = null, U = null, n = 0;
  const group = new THREE.Group();
  const map = new Map();   // DOM piece element → { g, code, i, n }
  function build(size) {
    if (root && size === n) return false;
    n = size;
    for (const [, o] of map) drop(o); map.clear();
    root = T3.MODELS.tafl(true, { n }); U = root.userData;
    root.add(group);
    return true;
  }
  build(curN());
  const S = U.S, Y = U.top, OUT = (S + 1.1) / S;   // the field = the DOM board (n × n cells, the same size for every n); the whole board is OUT times its width

  // skin styles (after AtlasSkin's light-theme conversion, so they stay as written)
  const BAND = (.55 / S).toFixed(4);   // the frame band, in board widths
  const css = document.createElement('style');
  css.textContent = `
html.atlas-tafl .frame{--cell:min(calc(var(--fh) / (var(--S) * ${OUT.toFixed(4)} + 1.36)), calc(var(--fw) / (var(--S) * ${OUT.toFixed(4)} + .14)))!important;padding:calc((var(--fh) - var(--cell) * var(--S)) / 2) calc((var(--fw) - var(--cell) * var(--S)) / 2)!important;background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-tafl .frame::before,html.atlas-tafl .frame::after{display:none!important}
html.atlas-tafl .reserve{left:calc((var(--fw) - var(--cell) * var(--S)) / 2)!important;right:calc((var(--fw) - var(--cell) * var(--S)) / 2)!important;height:calc(var(--cell) * .6)!important}
html.atlas-tafl .reserve.top{top:calc((var(--fh) - var(--cell) * var(--S)) / 2 - var(--cell) * var(--S) * ${BAND} - var(--cell) * .64)!important}
html.atlas-tafl .reserve.bot{bottom:calc((var(--fh) - var(--cell) * var(--S)) / 2 - var(--cell) * var(--S) * ${BAND} - var(--cell) * .64)!important}
html.atlas-tafl .reserve .rv{box-shadow:0 0 0 1px rgba(110,70,30,.6),0 2px 3px rgba(60,30,0,.35)!important}
html.atlas-tafl .reserve .lbl{color:rgba(70,38,12,.8)!important}
html.atlas-tf3db .board{background:transparent!important;box-shadow:none!important}
html.atlas-tf3db .board::after,html.atlas-tf3db .lines .wd,html.atlas-tf3db .lines .sp,html.atlas-tf3db .lines .knot,html.atlas-tf3db .lines .gl{display:none!important}
html.atlas-tf3db .lines .num{fill:rgba(52,26,8,.72)!important}
html.atlas-tf3dp .pc:not(.hov){background:none!important;box-shadow:none!important;animation:none!important}
html.atlas-tf3dp .pc:not(.hov) .em,html.atlas-tf3dp .pc:not(.hov)::after{display:none!important}
html.atlas-tf3dp .pc:not(.hov)::before{box-shadow:none!important}
html.atlas-tf3dp .pc.threat::before{inset:2%!important;box-shadow:0 0 0 3px rgba(255,80,60,.9)!important}
html.atlas-tf3dp .pc.kdanger::before{inset:-4%!important;box-shadow:0 0 0 3px rgba(255,60,40,.95),0 0 18px rgba(255,60,40,.8)!important}
html.atlas-tf3dp .pc.sel{box-shadow:0 0 0 3px rgba(255,214,110,.95),0 0 18px rgba(255,200,80,.75)!important}
html.atlas-tf3dp .pc.dim{filter:none!important}
html.atlas-tf3dp .hov{opacity:.5}
html.atlas-tf3dp .sqfx.last{background:transparent!important;box-shadow:inset 0 0 0 3px rgba(255,214,110,.85)!important}
html.atlas-tafl .bdrow{grid-template-columns:repeat(6,minmax(0,1fr))!important}
html.atlas-tafl .bdrow.pcrow{grid-template-columns:repeat(5,minmax(0,1fr))!important}
html.atlas-tafl .bdrow button:disabled{opacity:.4;cursor:default}
html.atlas-tafl .side{align-self:start!important}
/* PC: the portal bar is the header (html.hb-atlas): the page is sized below it, like the 2D page under its own header bar */
html.atlas-tafl.hb-atlas{--vh:calc(100vh - 64px)}
html.atlas-tafl.hb-atlas.ol-dock{--vh:calc(100vh - 64px - 108px)}
html.atlas-tafl.hb-atlas.ol-dock.ol-soon{--vh:calc(100vh - 64px - 46px)}
html.atlas-tafl.hb-atlas,html.atlas-tafl.hb-atlas body{--hb-h:64px;--top:0px}
html.atlas-tafl.hb-atlas body{padding-top:64px}
html.atlas-tafl.hb-atlas .app{padding-top:var(--pad)!important}
@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-tafl .app > .side,html.atlas-tafl.dock-compact .app > .side{height:calc(min(var(--fh) / (var(--S) * ${OUT.toFixed(4)} + 1.36), var(--fw) / (var(--S) * ${OUT.toFixed(4)} + .14)) * var(--S) * ${OUT.toFixed(4)})!important}html.atlas-tafl.dock-compact .app > .side > .side-in{height:100%!important}}
@media (max-width: 520px){html.atlas-tafl .bdrow{gap:3px!important}html.atlas-tafl .bdrow button{font-size:9.5px!important}}
/* new-game dialog without scrolling: PC = the display options under the designs; phone = compact rows */
html.atlas-tafl #newOverlay .rules-offer{margin:-6px 0 10px;padding:7px 10px}
@media (max-width: 520px){
html.atlas-tafl #newOverlay .modal{padding:14px 14px 12px!important}
html.atlas-tafl #newOverlay .modal h2{font-size:18px!important;margin-bottom:8px!important}
html.atlas-tafl #newOverlay .rules-offer{font-size:11.5px;line-height:1.35;padding:6px 8px;margin:-2px 0 8px;gap:8px}
html.atlas-tafl #newOverlay .rules-offer button{padding:6px 9px;font-size:11.5px}
html.atlas-tafl #newOverlay .field{margin-bottom:7px!important}
html.atlas-tafl #newOverlay .field > label{margin-bottom:4px!important;font-size:11px}
html.atlas-tafl #newOverlay #segMode{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:2px}html.atlas-tafl #newOverlay #segMode button[data-v=online]{grid-column:span 2!important}
html.atlas-tafl #newOverlay .seg button{padding:6px 2px!important;font-size:12px!important}
html.atlas-tafl #newOverlay .rulecards{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
html.atlas-tafl #newOverlay .rulecard{display:flex!important;flex-direction:column;align-items:center;gap:3px;padding:6px 4px!important;text-align:center}
html.atlas-tafl #newOverlay .rulecard svg{width:34px!important;height:34px!important;margin:0!important}
html.atlas-tafl #newOverlay .rulecard b{font-size:13px!important}
html.atlas-tafl #newOverlay .rulecard small{display:none!important}
html.atlas-tafl #newOverlay .level-name small{font-size:10.5px}
html.atlas-tafl #newOverlay input[type=range]{margin:2px 0!important}
html.atlas-tafl #newOverlay .checks{grid-template-columns:1fr 1fr 1fr!important;gap:5px 8px!important}
html.atlas-tafl #newOverlay .checks label{font-size:11px!important;gap:5px!important;line-height:1.2}
html.atlas-tafl #newOverlay .checks input{width:14px;height:14px;flex:none}
html.atlas-tafl #newOverlay .bdrow button{padding:3px 2px 3px!important;gap:2px!important}
html.atlas-tafl #newOverlay .bdrow button span{min-height:0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block!important}
html.atlas-tafl #newOverlay :is(#fRatedInfo,#fInfo) p{font-size:11.5px!important;line-height:1.5!important}
html.atlas-tafl #newOverlay #rtStats > *{padding-top:8px!important;padding-bottom:8px!important;margin-top:6px!important}
html.atlas-tafl #newOverlay .modal-actions{margin-top:10px!important}
html.atlas-tafl #newOverlay .modal-actions .mbtn{padding-top:10px!important;padding-bottom:10px!important}
}`;
  document.head.appendChild(css);

  { const d = document.getElementById('fDisplay'), col = document.querySelector('#newOverlay .ng-play'); if (d && col) col.appendChild(d); }   // (PC: the right column has room, the left one is long)
  const RULE_OF = { 7: 'brandubh', 9: 'tablut', 11: 'copenhagen' };
  const skin = AtlasSkin.init({
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },
    guide: '../images/atlas/g-puffin.webp', guideFallback: '../images/atlas/tafl.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: '\\.pc|\\.em|lines|reserve|\\.rv|sqfx|dest|\\.hov|\\.mark|fxsvg|hintlbl|frame|\\.num',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      const sz = +new URLSearchParams(location.search).get('size'); if (RULE_OF[sz]) draft.rule = RULE_OF[sz];
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  T3.show('tafl', root, { still: true });
  skin.alignTo(S, Y);
  const holder = boardDom.parentElement, host = document.getElementById('atlasGL');
  const realign = () => T3.align(() => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: boardDom.offsetWidth, h: boardDom.offsetHeight, tilt: 0, persp: boardDom.offsetHeight * 2.6 }; }, S, Y);
  const reshow = () => { T3.show('tafl', root, { still: true }); realign(); look(true); };   // (show() puts the camera back to the showcase view)
  T3.kick(800);
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- 3D pieces mirrored from the page's piece elements ---------- */
  const xz = i => U.cell(i % n, Math.floor(i / n));
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, delay) => { const go = () => { const t0 = performance.now(); (function s(now) { const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }; delay ? setTimeout(go, delay) : go(); };
  const DIM = new Map();   // material → its darkened copy (the losing side after a game)
  const dimOf = m => { let d = DIM.get(m); if (!d) { d = m.clone(); d.color = (m.color ? m.color.clone() : new THREE.Color(1, 1, 1)).multiplyScalar(.42); DIM.set(m, d); } return d; };
  function make(code, i) {
    const g = new THREE.Group(), p = U.piece(code), sh = T3.contact(U.cs * .4, .5);
    sh.position.y = .002; g.add(sh, p); g.userData.p = p; g.userData.sh = sh;
    p.traverse(m => { if (m.isMesh) m.userData.m0 = m.material; });
    const [x, z] = xz(i); g.position.set(x, Y, z); group.add(g); return g;
  }
  function drop(o) { group.remove(o.g); o.g.userData.sh.material.dispose(); }
  function slide(o, from, to, dur) {   // the piece is pushed over the board, lifted a little
    const [x0, z0] = from, [x1, z1] = to, p = o.g.userData.p, sh = o.g.userData.sh, c = U.cs, d = Math.hypot(x1 - x0, z1 - z0);
    const lift = Math.min(c * .45, d * .07 + c * .14);
    o.anim = (o.anim || 0) + 1; o.sliding = true; const id = o.anim;
    anim(dur, k => {
      if (o.anim !== id) return;
      const q = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // ease in-out
      o.g.position.x = x0 + (x1 - x0) * q; o.g.position.z = z0 + (z1 - z0) * q;
      const h = Math.sin(Math.PI * Math.min(1, k * 1.08)) * lift; p.position.y = Math.max(0, h) + (o.up || 0);
      sh.scale.setScalar(1 + h / c * .8); sh.material.opacity = .5 * (1 - Math.min(.6, h / c));
    }, () => { if (o.anim !== id) return; o.sliding = false; o.g.position.set(x1, Y, z1); p.position.y = o.up || 0; sh.scale.setScalar(1); sh.material.opacity = .5; });
  }
  function vanish(o, delay) {   // a taken piece: lifted off the board, tipping a little, and fading away
    const p = o.g.userData.p, sh = o.g.userData.sh, ms = [], c = U.cs;
    p.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; ms.push(m.material); } });
    anim(340, k => {
      p.position.y = c * 1.1 * k * k; p.rotation.z = .55 * k; p.rotation.x = -.3 * k;
      ms.forEach(m => { m.opacity = 1 - k; }); sh.material.opacity = .5 * (1 - k);
    }, () => { ms.forEach(m => m.dispose()); drop(o); }, delay);
  }
  let moving = false;
  const durOf = (a, b) => { const d = Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n)); return 220 + d * 32; };   // = the page's own slide (app.js animateMove)
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    if (build(curN())) reshow();
    const live = new Set(), ok = animOk() && moving;
    let dur = 0;
    for (const [i, el] of els) {
      live.add(el);
      const code = +el.dataset.k; let o = map.get(el);
      if (o && o.code !== code) { drop(o); map.delete(el); o = null; }
      if (!o) { o = { g: make(code, i), code, i }; map.set(el, o); continue; }
      if (o.i !== i) {
        const from = [o.g.position.x, o.g.position.z], to = xz(i);
        if (ok) { dur = durOf(o.i, i); slide(o, from, to, dur); } else { o.anim = (o.anim || 0) + 1; o.sliding = false; o.g.position.set(to[0], Y, to[1]); o.g.userData.p.position.y = o.up || 0; }
        o.i = i;
      }
    }
    for (const [el, o] of map) if (!live.has(el)) { map.delete(el); if (ok) vanish(o, Math.max(0, dur - 40)); else drop(o); }
    marks();
    T3.kick(400);
  }
  // the selected piece rises a hair; the losing side darkens; pieces hide with the 2D ones
  function marks() {
    for (const [el, o] of map) {
      const up = el.classList.contains('sel') ? U.cs * .14 : 0;
      if (up !== (o.up || 0)) {
        const a = o.up || 0, p = o.g.userData.p; o.up = up;
        if (!o.sliding) anim(120, k => { if (!o.sliding) p.position.y = a + (up - a) * k; });
      }
      const dim = el.classList.contains('dim');
      if (dim !== !!o.dim) { o.dim = dim; o.g.userData.p.traverse(m => { if (m.isMesh && m.userData.m0) m.material = dim ? dimOf(m.userData.m0) : m.userData.m0; }); }
      o.g.visible = el.style.opacity !== '0' && el.isConnected;
    }
    T3.kick(200);
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) { console.warn(e); } return r; };
  const oMove = window.animateMove;
  if (typeof oMove === 'function') window.animateMove = function () { const r = oMove.apply(this, arguments); moving = true; try { mirror(); } catch (e) { console.warn(e); } moving = false; return r; };
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); try { marks(); } catch (e) {} return r; }; }
  // a new rule set (board size): a new board
  const oLines = window.drawLines;
  window.drawLines = function () { const r = oLines.apply(this, arguments); try { if (build(curN())) { reshow(); mirror(); } T3.kick(600); setTimeout(() => dispatchEvent(new Event('resize')), 30); } catch (e) { console.warn(e); } return r; };
  try { mirror(); } catch (e) {}

  /* ---------- the design rows: "3D" for the board and for the pieces + the game's own 2D designs ---------- */
  const LBL = {
    bd: { ja: 'ヴァイキング3D', en: 'Viking 3D', zh: '维京3D', ko: '바이킹 3D', es: 'Vikingo 3D', fr: 'Viking 3D', pt: 'Viking 3D', de: 'Wikinger 3D', hi: 'वाइकिंग 3D', ar: 'فايكنغ ثلاثي' },
    pc: { ja: '木彫り3D', en: 'Carved 3D', zh: '木雕3D', ko: '목각 3D', es: 'Tallado 3D', fr: 'Sculpté 3D', pt: 'Entalhado 3D', de: 'Geschnitzt 3D', hi: 'नक्काशी 3D', ar: 'منحوت ثلاثي' },
  };
  const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
  const vbOf = row => { const s = row && row.querySelector('button svg'); return (s && s.getAttribute('viewBox')) || '0 0 100 100'; };
  function thumb(kind, vb) {
    const [x, y, w, h] = vb.split(/[ ,]+/).map(Number), s = Math.min(w, h), cx = x + w / 2, cy = y + h / 2;
    const fr = s * .075, k = 7, cs = (s - 2 * fr) / k, x0 = cx - cs * k / 2, y0 = cy - cs * k / 2;
    let ln = '';
    for (let i = 0; i <= k; i++) ln += `<path d="M${x0 + i * cs} ${y0}V${y0 + k * cs}M${x0} ${y0 + i * cs}H${x0 + k * cs}"/>`;
    const sq = (c, r) => `<rect x="${x0 + c * cs + cs * .1}" y="${y0 + r * cs + cs * .1}" width="${cs * .8}" height="${cs * .8}" fill="rgba(60,30,10,.45)"/><circle cx="${x0 + (c + .5) * cs}" cy="${y0 + (r + .5) * cs}" r="${cs * .27}" fill="none" stroke="rgba(236,206,150,.85)" stroke-width="${cs * .06}"/>`;
    const special = sq(0, 0) + sq(k - 1, 0) + sq(0, k - 1) + sq(k - 1, k - 1) + sq(3, 3);
    // a turned pawn seen from above and a little in front: a base disc, a waist and a round head
    const pawn = (c, r, dark, king) => {
      const px = x0 + (c + .5) * cs, py = y0 + (r + .5) * cs, R = cs * .4, top = dark ? '#5a3826' : '#f6ecd6', body = dark ? '#2c180c' : '#cdb488', hi = dark ? 'rgba(255,220,180,.35)' : 'rgba(255,255,255,.85)';
      return `<ellipse cx="${px}" cy="${py + R * .25}" rx="${R}" ry="${R * .8}" fill="rgba(0,0,0,.28)"/><circle cx="${px}" cy="${py}" r="${R}" fill="${body}"/><circle cx="${px}" cy="${py - R * .12}" r="${R * .62}" fill="${top}"/><ellipse cx="${px - R * .2}" cy="${py - R * .35}" rx="${R * .22}" ry="${R * .14}" fill="${hi}"/>`
        + (king ? `<circle cx="${px}" cy="${py - R * .12}" r="${R * .4}" fill="none" stroke="#e8b840" stroke-width="${R * .2}"/>` : '');
    };
    const pcs = pawn(3, 3, false, true) + pawn(3, 2, false) + pawn(2, 3, false) + pawn(3, 0, true) + pawn(0, 3, true) + pawn(5, 3, true) + pawn(3, 5, true) + pawn(4, 1, true);
    if (kind === 'pc') return `<svg viewBox="${vb}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#6b4a2c"/><g stroke="rgba(30,14,4,.55)" stroke-width="${cs * .05}">${ln}</g>${pcs}</svg>`;
    return `<svg viewBox="${vb}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3a2414"/><rect x="${x + fr * .3}" y="${y + fr * .3}" width="${w - fr * .6}" height="${h - fr * .6}" fill="none" stroke="rgba(232,196,128,.6)" stroke-width="${fr * .12}"/><rect x="${x0}" y="${y0}" width="${cs * k}" height="${cs * k}" fill="#c39762"/>${special}<g stroke="rgba(42,22,8,.85)" stroke-width="${cs * .05}">${ln}</g>${pcs}</svg>`;
  }
  function paintRows() {
    [[document.getElementById('bdRow'), 'bd'], [document.getElementById('pcRow'), 'pc']].forEach(([row, k]) => {
      if (!row) return;
      let b = row.querySelector('button[data-a3]');
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.dataset.a3 = k; row.prepend(b); }
      const on = k === 'bd' ? bd3 : bd3 && pc3, L = LBL[k];
      b.innerHTML = thumb(k, vbOf(row)) + '<span></span>'; b.querySelector('span').textContent = L[lang()] || L.en;
      b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on);
      if (k === 'pc') b.disabled = !bd3;   // 3D pieces only on the 3D board (the DOM board would cover them)
      if (on) row.querySelectorAll('button:not([data-a3])').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); });
    });
  }
  function look(quiet) {
    if (root) { root.children.forEach(c => { if (c !== group) c.visible = bd3; }); }
    group.visible = bd3 && pc3;
    de.classList.toggle('atlas-tf3db', bd3); de.classList.toggle('atlas-tf3dp', bd3 && pc3);
    try { localStorage.setItem(LK, !bd3 ? '2d' : pc3 ? '3d' : '3d2'); } catch (e) {}
    if (quiet) return;
    paintRows(); T3.kick(400);
  }
  const onRow = k => e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.a3) { e.stopImmediatePropagation(); if (k === 'bd') { if (!bd3) pc3 = true; bd3 = true; } else pc3 = true; look(); return; }   // the game's own 2D setting stays as it is
    if (k === 'bd') { bd3 = false; pc3 = false; } else pc3 = false;   // a 2D board brings its 2D pieces
    setTimeout(look, 0);
  };
  const r1 = document.getElementById('bdRow'), r2 = document.getElementById('pcRow');
  if (r1) r1.addEventListener('click', onRow('bd'), true);
  if (r2) r2.addEventListener('click', onRow('pc'), true);
  if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paintRows(); } catch (e) {} return r; }; }
  const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paintRows, 30));
  look();

  // test hooks (Playwright)
  window.__tfSkin = { pieces: () => map.size, n: () => n, look: () => (bd3 ? (pc3 ? '3d' : '3d2') : '2d'), at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
