/* =====================================================================
   Checkers — portal skin (checkers/?skin=atlas)
   The full checkers page keeps every feature (AI in 20 levels, rated games,
   online play with the 2D version, lessons, openings, puzzles, review /
   analysis, the coach…). This file:
     • draws the luxury board (atlas/models/checkers.js: lacquer field, clear
       black lacquer frame) with the 3D table; the camera is aligned to the DOM board,
       which stays on top (transparent) for taps, selection, destinations, marks,
       hints and labels. The DOM frame becomes the 3D board's outer edge
       (9.84 × 9.84 squares); the captured pieces sit on its frame band
     • mirrors the page's pieces (syncPieces / animateMove) into gold (Black) and
       silver (White) turned-metal checkers: a move lifts, glides and sets down,
       a capture hops over each jumped piece (which is knocked off as it passes),
       a man reaching the far row is crowned (a second checker and the crown
       come down onto it); the selected piece is lifted
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.CheckersEngine;
  if (!THREE || !T3 || !T3.checkers || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-checkers');
  let root = T3.MODELS.checkers(true), U = root.userData, Y = U.top;   // (rebuilt when the look changes: build())
  const S = U.S, OUT = U.outer, FR = (OUT * S - S) / 2;   // FR: the board's margin round the field (squares) — the same for every look
  const C3 = T3.checkers, pc3 = () => C3.pcSet();
  // the page's little discs in the chosen set's two colours (CSS variables on <html>)
  function setPcVars() { const d = document.documentElement.style; d.setProperty('--ckG', C3.swatch(1)); d.setProperty('--ckW', C3.swatch(2)); const g = C3.tone(1), w = C3.tone(2); d.setProperty('--ckGbar', `linear-gradient(90deg,${g[1]},${g[2]})`); d.setProperty('--ckWbar', `linear-gradient(90deg,${w[1]},${w[0]})`); }
  setPcVars();

  /* ---------- page layout: the DOM frame = the 3D board's outer edge ---------- */
  const st = document.createElement('style');
  const K = (OUT * S).toFixed(3), C = (v) => `calc(var(--cell) * ${v})`;
  st.textContent = `
html.atlas-checkers,html.atlas-checkers body{--cell:min((var(--vh) - var(--padt) - var(--pad) - 8px - var(--ttop)) / ${K}, (100vw - var(--padx) * 2 - var(--gap) - var(--sidew)) / ${K}, 128px)!important;--fw:${C(K)}!important;--fh:${C(K)}!important}
/* (the page's PC rule html.dock-fit body:not(.no-online) — the online dock open — is more specific and makes the frame 8.5 × 9.5:
   the square 3D board then ran under the info column; the board stays square here too) */
html.atlas-checkers:not(#_),html.atlas-checkers:not(#_) body{--fw:${C(K)}!important;--fh:${C(K)}!important}
@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-checkers:not(#_),html.atlas-checkers:not(#_) body{--cell:min((var(--vh) - var(--pad) * 2 - var(--rbx, 0px)) / ${K}, (100vw - var(--rw, 360px) - var(--gap) - var(--padx) * 2) / ${K}, 128px)!important}}   /* PC: sized for the fixed 360px column (a width-limited board never pushes it off the edge) */
@media not all and (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){
@media not all and (pointer: coarse) and (min-aspect-ratio: 1/1) and (max-height: 560px){
@media not all and (pointer: coarse) and (min-aspect-ratio: 1/1) and (max-width: 900px){
  html.atlas-checkers,html.atlas-checkers body{--cell:min((100vw - 20px) / ${K}, (var(--vh) - 250px) / ${K}, 100px)!important}
}}}
@media (pointer: coarse) and (max-aspect-ratio: 1/1) and (max-width: 600px){html.atlas-checkers,html.atlas-checkers body{--cell:min((100vw - 20px) / ${K}, 100px)!important}}
@media (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px){html.atlas-checkers,html.atlas-checkers body{--cell:min((var(--vh) - 20px) / ${K}, (100vw - 300px) / ${K}, 120px)!important}}
html.atlas-checkers .frame{width:var(--fw)!important;height:var(--fh)!important;padding:${C(FR.toFixed(3))}!important;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important}
html.atlas-checkers .frame::before,html.atlas-checkers .frame::after,html.atlas-checkers .board::after{display:none!important}
html.atlas-checkers .board{background:none!important;box-shadow:none!important;border-radius:0!important}
html.atlas-checkers .lines rect{fill:transparent!important}
html.atlas-checkers .lines .num{fill:rgba(255,248,230,.5)!important}
html.atlas-checkers .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important}
html.atlas-checkers .pieces .pc:not(.hov)::before{box-shadow:none!important;animation:none!important}
html.atlas-checkers .pieces .pc .crown{inset:27%!important;opacity:.95;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))!important}   /* seen from straight above the 3D stack is hard to read: the crown mark stays */
html.atlas-checkers .pieces .pc:not(.king) .crown{display:none!important}
html.atlas-checkers .pieces .pc.sel{box-shadow:0 0 0 3px rgba(80,232,150,.95),0 0 18px rgba(80,232,150,.75)!important}
html.atlas-checkers .pieces .pc.mustjump{animation:ckMJ 1.1s ease-in-out infinite!important}
@keyframes ckMJ{0%,100%{box-shadow:0 0 0 2px rgba(255,180,40,.75),0 0 10px rgba(255,180,40,.45)}50%{box-shadow:0 0 0 4px rgba(255,180,40,.95),0 0 22px rgba(255,180,40,.85)}}
html.atlas-checkers .pieces .pc.threat{box-shadow:0 0 0 2.5px rgba(255,90,70,.9),0 0 12px rgba(255,90,70,.6)!important}
html.atlas-checkers .pieces .hov{opacity:.35}
html.atlas-checkers .pieces .hov.p1{background:var(--ckG)!important}
html.atlas-checkers .pieces .hov.p2{background:var(--ckW)!important}
html.atlas-checkers .reserve{height:${C(FR.toFixed(3))}!important;padding-inline-start:${C(.45)}!important}
html.atlas-checkers .reserve .rv{width:${C(.36)}!important;height:${C(.36)}!important;box-shadow:0 2px 3px rgba(0,0,0,.45)!important}
html.atlas-checkers .reserve .rv.p1{background:var(--ckG)!important}
html.atlas-checkers .reserve .rv.p2{background:var(--ckW)!important}
html.atlas-checkers .pdisc.p1,html.atlas-checkers .kifu button i.p1,html.atlas-checkers .rv-list .mv i.p1{background:var(--ckG)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-checkers .pdisc.p2,html.atlas-checkers .kifu button i.p2,html.atlas-checkers .rv-list .mv i.p2{background:var(--ckW)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-checkers .evalbar{background:var(--ckWbar)!important}
html.atlas-checkers .evalbar .fill{background:var(--ckGbar)!important}
html.atlas-checkers .reserve .rv::before{box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)!important}
html.atlas-checkers .reserve .lbl{color:rgba(255,250,240,.92)!important;text-shadow:0 1px 2px rgba(0,0,0,.6)}
html.atlas-checkers .sqfx.last{background:rgba(255,206,90,.32)!important;box-shadow:inset 0 0 0 2px rgba(255,206,90,.55)!important}
html.atlas-checkers .sqfx.lastf{background:rgba(255,206,90,.16)!important}
html.atlas-checkers .dest{background:rgba(60,214,130,.9)!important;box-shadow:0 0 10px rgba(60,214,130,.8)!important}
html.atlas-checkers .dest.mid{background:rgba(60,214,130,.55)!important}
html.atlas-checkers .sqfx.trail{background:rgba(60,214,130,.18)!important}
html.atlas-checkers #fPieces{display:none!important}
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f6f1e4;border:2px solid #e2cf9e}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#7a5a1c;margin:0 0 8px}
html.atlas-skin #f3D > label.pc3l{margin-top:12px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow.pc3 button img{aspect-ratio:3/2;background:radial-gradient(80% 80% at 50% 40%,#6a5e52,#2a231d);padding:4%;box-sizing:border-box}
@media (max-width: 760px){html.atlas-checkers .frame{margin-top:${C(.1)}!important}}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    pc: { vars: ['--cell'] },   // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit)
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // frame edge to frame edge
    guide: '../images/atlas/g-crab.webp', guideFallback: '../images/atlas/checkers.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|crown',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      // the portal's card: straight to the puzzles / the lessons / the online match search (checkers/app.js AtlasDeep, 2026-11-14)
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
  T3.show('checkers', root, { still: true });
  skin.alignTo(S, Y);
  let built = U.look;
  function build() {   // a new look: a new board (the checkers on it are made again by mirror())
    const look = T3.BOARDS.checkers.get(); if (look === built) return false;
    built = look; tok++;
    for (const [, o] of P3) drop(o.g); P3.clear();
    root = T3.MODELS.checkers(true, look); U = root.userData; Y = U.top;
    T3.show('checkers', root, { still: true }); skin.alignTo(S, Y);
    dispatchEvent(new Event('resize')); T3.kick(600);
    return true;
  }
  // デザイン: 「3D盤」 (six boards) and 「3D駒」 (six sets) under the game's own 2D boards (picking a 2D board shows the plain 2D page)
  const V = skin.view && skin.view({ key: 'atlas-checkers-view', cls: ['atlas-checkers'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: 「3D盤」 (boards) and 「3D駒」 (sets) under the 2D boards (as amazons, 2026-11-14) ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const P3L = { ja: '3D駒', en: '3D pieces', zh: '3D棋子', ko: '3D 말', es: 'Piezas 3D', fr: 'Pièces 3D', pt: 'Peças 3D', de: '3D-Steine', hi: '3D गोटियाँ', ar: 'قطع ثلاثية الأبعاد', ru: '3D-шашки', 'zh-TW': '3D棋子', id: 'Bidak 3D', tr: '3D taşlar' };
  const lng = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja'));
  const is3 = () => !V || V.is3d();
  const relabel = () => { const ls = document.getElementById('langSel'); if (ls) try { ls.dispatchEvent(new Event('change')); } catch (e) {} };   // the page redraws its words (as on a language change): they follow the set's colours
  function setLook(k) {
    if (T3.setBoard) T3.setBoard('checkers', k); else T3.BOARDS.checkers.set(k);
    if (V && !V.is3d()) { V.set(true); relabel(); }
    if (build()) { try { mirror(); } catch (e) {} }
    paint3();
  }
  function setSet(k) {
    if (T3.setPieces) T3.setPieces('checkers', k); else T3.PIECES.checkers.set(k);
    if (V && !V.is3d()) V.set(true);
    setPcVars(); tok++; for (const [, o] of P3) drop(o.g); P3.clear();
    try { mirror(); } catch (e) {}
    relabel(); paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS.checkers, P = T3.PIECES.checkers; if (!f3 || !B || !P) return;
    const l = lng(), cur = B.get(), on = is3(), cs = pc3();
    const [lb, lp] = f3.querySelectorAll('label'); lb.textContent = T3L[l] || T3L.en; lp.textContent = P3L[l] || P3L.en;
    const [row, prow] = f3.querySelectorAll('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('checkers', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    if (!prow.children.length) P.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.set = k;
      const im = document.createElement('img'); im.src = P.thumb(k); im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setSet(k); prow.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l, 'checkers') : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    prow.querySelectorAll('button').forEach(bt => { const k = bt.dataset.set, sel = on && cs === k; bt.querySelector('span').textContent = T3.pieceName ? T3.pieceName('checkers', k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D';
    f3.innerHTML = '<label></label><div class="bdrow"></div><label class="pc3l"></label><div class="bdrow pc3"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(() => { paint3(); relabel(); }, 0); } }, true);
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-checkers-look' || e.key === 'atlas-checkers-pc3') { setPcVars(); tok++; for (const [, o] of P3) drop(o.g); P3.clear(); build(); try { mirror(); } catch (x) {} relabel(); paint3(); } });

  /* ---------- words and pictures: 黒 / 白 become the 3D set's colours (金 / 銀 …) while the 3D board is shown (2026-11-14) ---------- */
  // the page's texts all come through t() (the rules tour, lessons, puzzles, turn labels); its small boards through miniSVG()
  if (typeof window.t === 'function') { const ot = window.t; window.t = function (k, v) { const x = ot.apply(this, arguments); return is3() && typeof x === 'string' && !/^(meta\.|lang|pcs?\.|bd\.)/.test(k) ? C3.recolor(x, typeof LANG !== 'undefined' ? LANG : 'ja') : x; }; }
  if (typeof window.miniSVG === 'function' && typeof PC_PAL === 'object') {   // (PC_PAL / BD_PAL: the page's own palettes; '__a3' = the 3D set / look)
    const om = window.miniSVG;
    window.miniSVG = function (spec, o) {
      if (!is3() || (o && (o.pcs || o.bd))) return om.apply(this, arguments);   // (the デザイン tab's 2D previews keep their own colours)
      const g = C3.tone(1), w = C3.tone(2); PC_PAL.__a3 = [[g[1], g[2]], [w[1], w[2]]];
      if (typeof BD_PAL === 'object' && C3.mini) BD_PAL.__a3 = C3.mini();
      return om.call(this, spec, Object.assign({}, o || {}, { pcs: '__a3' }, typeof BD_PAL === 'object' && BD_PAL.__a3 ? { bd: '__a3' } : {}));
    };
  }
  if (is3() && pc3() !== 'stone') setTimeout(relabel, 0);

  /* ---------- 3D pieces mirrored from the page's pieces ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const P3 = new Map();   // square → { g, k }
  let tok = 0;            // a full re-sync cancels running animations
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const colOf = k => k <= 2 ? 1 : 2, isKing = k => k === 2 || k === 4;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, sq) {
    const g = U.piece(colOf(k) === 1 ? 'g' : 'w', isKing(k), { reflect: U.mirror });
    const sh = T3.contact(.36, .55); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    g.userData.rf = g.children.find(o => o.userData && o.userData.reflection) || null;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .55 / (1 + h * 1.4); }
    if (g.userData.rf) g.userData.rf.position.y = -2 * h;
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.userData.mats) g.userData.mats.forEach(m => m.dispose()); root.remove(g); }
  function land(g, my) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }
  function knockOff(g, dx, dz, my) {
    if (g.userData.dying) return; g.userData.dying = true;
    const mats = []; g.userData.mats = mats;
    g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
    if (g.userData.rf) g.userData.rf.visible = false;
    const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, x0 = g.position.x, z0 = g.position.z;
    const axis = new THREE.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new THREE.Quaternion(), sh = g.userData.sh;
    anim(520, k => {
      qt.setFromAxisAngle(axis, 2.4 * k); g.quaternion.copy(qt).multiply(q0);
      g.position.x = x0 + ux * .5 * k; g.position.z = z0 + uz * .5 * k; g.position.y = Y + Math.sin(k * Math.PI) * .8;
      const f = k < .4 ? 1 : 1 - (k - .4) / .6; mats.forEach(m => { m.opacity = Math.max(0, f); }); if (sh) sh.material.opacity = .55 * Math.max(0, 1 - k * 2);
    }, () => drop(g), my);
  }
  function crownUp(sq, k, my) {   // a second checker and the crown come down onto the man
    const o = P3.get(sq); if (!o) return;
    const old = o.g, g = mk(k, sq); o.g = g; o.k = k; drop(old);
    const tops = g.children.filter(x => x.isMesh && !x.userData.contact).slice(1);
    tops.forEach(x => { x.userData.y0 = x.position.y; x.position.y += 1.6; });
    anim(420, q => { const e = q < .7 ? (q / .7) * (q / .7) : 1, b = q < .7 ? 0 : Math.sin((q - .7) / .3 * Math.PI) * .12; tops.forEach(x => { x.position.y = x.userData.y0 + 1.6 * (1 - e) + b; }); },
      () => { tops.forEach(x => { x.position.y = x.userData.y0; }); land(g, my); }, my);
  }
  // the selected piece is lifted (the page marks it with .sel)
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      const el = els.get(i), on = !!(el && el.classList.contains('sel')), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .26 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
  }
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    tok++;
    root.children.filter(o => o.userData && o.userData.dying).forEach(drop);
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: mk(k, i), k }); continue; }
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z; g.scale.set(1, 1, 1); g.quaternion.identity(); g.userData.moving = false; g.userData.up = false; lift(g, 0);
      const tops = g.children.filter(c => c.userData && c.userData.y0 !== undefined); tops.forEach(c => { c.position.y = c.userData.y0; });
    }
    applySel(); T3.kick(300);
  }
  // a move as the page animates it (HOP / SLIDE in checkers/app.js): lift, glide or hop, set down
  function travel(m, before) {
    const f = E.mFrom(m), to = E.mTo(m), cap = E.mCap(m), path = E.path(before, m), promo = before.promotes(m);
    const o = P3.get(f); if (!o) return false;
    const my = tok, g = o.g, k1 = promo ? o.k + 1 : o.k;
    P3.delete(f);
    const vict = {}; E.bitsOf(cap).forEach(i => { const v = P3.get(i); if (v) { vict[i] = v.g; P3.delete(i); } });
    P3.set(to, { g, k: o.k });   // still a man until it is crowned
    g.userData.moving = true; g.userData.up = false;
    const pts = path.map(xz), H = .3, h0 = hOf(g);
    const legT = cap ? path.slice(1).map(() => 260) : [300], dur = legT.reduce((a, b) => a + b, 0);
    const victims = []; if (cap) for (let i = 1; i < path.length; i++) { const [ra, ca] = E.RC[path[i - 1]], [rb, cb] = E.RC[path[i]]; victims.push(E.sqAt((ra + rb) / 2, (ca + cb) / 2)); }
    const hit = victims.map(() => false);
    anim(dur, k => {
      let r = k * dur, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
      const q = Math.min(1, r / legT[i]), e = cap ? q : io(q), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
      // a slide lifts off, glides and sets down; a jump arcs over the jumped piece
      const hh = cap ? Math.sin(q * Math.PI) * .62 + (i === 0 ? h0 * (1 - q) : 0) : (h0 + (H - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1);
      lift(g, Math.max(0, hh));
      if (cap && !hit[i] && q > .5) { hit[i] = true; const vg = vict[victims[i]]; if (vg) knockOff(vg, x1 - x0, z1 - z0, my); }
    }, () => {
      g.userData.moving = false; lift(g, 0); land(g, my);
      Object.values(vict).forEach(v => { if (!v.userData.dying) knockOff(v, 0, 1, my); });
      if (promo) setTimeout(() => { if (my === tok && P3.get(to) && P3.get(to).g === g) crownUp(to, k1, my); }, 40);
    }, my);
    return true;
  }
  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oAnim = window.animateMove;
  window.animateMove = function (m, before) {
    const ok = oAnim.apply(this, arguments);
    if (ok) { try { if (!animOk() || !travel(m, before)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  // selection / forced-capture marks come with renderFx; the selected piece lifts
  if (piecesDom) new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
  // (renderFx only redraws DOM marks: no 3D frames needed — piece changes kick from mirror() / the animations themselves)
  // the page may have drawn its pieces before we hooked in
  try { mirror(); } catch (e) {}

  // test hooks (Playwright)
  window.__ckSkin = { pieces: () => P3.size, meshes: () => root.children.filter(o => o.userData && o.userData.col && !o.userData.dying).length, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
