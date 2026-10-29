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
  const root = T3.MODELS.checkers(true), U = root.userData, S = U.S, Y = U.top, OUT = U.outer, FR = (OUT * S - S) / 2;   // FR: the board's margin round the field (squares)

  /* ---------- page layout: the DOM frame = the 3D board's outer edge ---------- */
  const st = document.createElement('style');
  const K = (OUT * S).toFixed(3), C = (v) => `calc(var(--cell) * ${v})`;
  st.textContent = `
html.atlas-checkers,html.atlas-checkers body{--cell:min((var(--vh) - var(--padt) - var(--pad) - 8px - var(--ttop)) / ${K}, (100vw - var(--padx) * 2 - var(--gap) - var(--sidew)) / ${K}, 128px)!important;--fw:${C(K)}!important;--fh:${C(K)}!important}
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
html.atlas-checkers .pieces .hov.p1{background:radial-gradient(circle at 35% 30%,#fff1c2,#e8b64e 45%,#8a6418)!important}
html.atlas-checkers .pieces .hov.p2{background:radial-gradient(circle at 35% 30%,#fff,#d6d9de 45%,#7c8189)!important}
html.atlas-checkers .reserve{height:${C(FR.toFixed(3))}!important;padding-inline-start:${C(.45)}!important}
html.atlas-checkers .reserve .rv{width:${C(.36)}!important;height:${C(.36)}!important;box-shadow:0 2px 3px rgba(0,0,0,.45)!important}
html.atlas-checkers .reserve .rv.p1{background:radial-gradient(circle at 35% 30%,#fff1c2,#e8b64e 45%,#8a6418)!important}
html.atlas-checkers .reserve .rv.p2{background:radial-gradient(circle at 35% 30%,#fff,#d6d9de 45%,#7c8189)!important}
html.atlas-checkers .pdisc.p1,html.atlas-checkers .kifu button i.p1,html.atlas-checkers .rv-list .mv i.p1{background:radial-gradient(circle at 35% 30%,#fff1c2,#e8b64e 45%,#8a6418)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-checkers .pdisc.p2,html.atlas-checkers .kifu button i.p2,html.atlas-checkers .rv-list .mv i.p2{background:radial-gradient(circle at 35% 30%,#fff,#d6d9de 45%,#7c8189)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-checkers .evalbar{background:linear-gradient(90deg,#d6d9de,#f4f5f7)!important}
html.atlas-checkers .evalbar .fill{background:linear-gradient(90deg,#f0c25e,#b8862a)!important}
html.atlas-checkers .reserve .rv::before{box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)!important}
html.atlas-checkers .reserve .lbl{color:rgba(255,250,240,.92)!important;text-shadow:0 1px 2px rgba(0,0,0,.6)}
html.atlas-checkers .sqfx.last{background:rgba(255,206,90,.32)!important;box-shadow:inset 0 0 0 2px rgba(255,206,90,.55)!important}
html.atlas-checkers .sqfx.lastf{background:rgba(255,206,90,.16)!important}
html.atlas-checkers .dest{background:rgba(60,214,130,.9)!important;box-shadow:0 0 10px rgba(60,214,130,.8)!important}
html.atlas-checkers .dest.mid{background:rgba(60,214,130,.55)!important}
html.atlas-checkers .sqfx.trail{background:rgba(60,214,130,.18)!important}
html.atlas-checkers #bdRow,html.atlas-checkers #fPieces{display:none!important}
html.atlas-checkers .ck3dnote{margin:0;padding:12px 14px;border-radius:14px;background:#f8f0e0;border:2px solid #ead9b6;font-size:13px;line-height:1.6;color:#4a4f66}
html.atlas-checkers .ck3dnote b{display:block;font-size:14px;color:#2b3044;margin-bottom:2px}
@media (max-width: 760px){html.atlas-checkers .frame{margin-top:${C(.1)}!important}}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: boardDom,
    outer: r => { const H = r.height * OUT; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // frame edge to frame edge
    guide: '../images/atlas/g-crab.webp', guideFallback: '../images/atlas/checkers.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|crown',
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
  T3.show('checkers', root, { still: true });
  skin.alignTo(S, Y);
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: the 3D set replaces the 2D board / piece designs ---------- */
  const NOTE = {
    ja: ['3D高級盤', '漆塗りの盤面と黒漆の枠、金（黒）と銀（白）の金属駒で表示しています。'],
    en: ['Luxury 3D board', 'Lacquered field in a black lacquer frame, with gold (Black) and silver (White) metal checkers.'],
    zh: ['3D豪华棋盘', '漆面棋盘配黑漆边框，金色（黑方）与银色（白方）金属棋子。'],
    ko: ['3D 고급 판', '옻칠 판면과 검은 옻칠 테두리, 금(흑)·은(백) 금속 말로 표시합니다.'],
    es: ['Tablero 3D de lujo', 'Campo lacado en marco de laca negra, con piezas metálicas doradas (negras) y plateadas (blancas).'],
    fr: ['Damier 3D de luxe', 'Champ laqué dans un cadre en laque noire, pions métalliques or (Noirs) et argent (Blancs).'],
    pt: ['Tabuleiro 3D de luxo', 'Campo laqueado em moldura de laca preta, com peças de metal douradas (pretas) e prateadas (brancas).'],
    de: ['Luxus-3D-Brett', 'Lackiertes Spielfeld im schwarzen Lackrahmen, mit goldenen (Schwarz) und silbernen (Weiß) Metallsteinen.'],
    hi: ['3D लक्ज़री बोर्ड', 'लाख वाला बोर्ड, काले लाख का फ़्रेम, और सुनहरी (काला) व चाँदी (सफ़ेद) धातु की गोटियाँ।'],
    ar: ['رقعة فاخرة ثلاثية الأبعاد', 'سطح مطلي بالورنيش داخل إطار من الورنيش الأسود، مع قطع معدنية ذهبية (الأسود) وفضية (الأبيض).'],
  };
  const fd = document.getElementById('fDesign');
  if (fd) {
    const p = document.createElement('p'); p.className = 'ck3dnote'; fd.appendChild(p);
    const paint = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', n = NOTE[l] || NOTE.en; p.innerHTML = ''; const b = document.createElement('b'); b.textContent = n[0]; p.append(b, n[1]); };
    paint(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint, 30));
  }

  /* ---------- 3D pieces mirrored from the page's pieces ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const P3 = new Map();   // square → { g, k }
  let tok = 0;            // a full re-sync cancels running animations
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const colOf = k => k <= 2 ? 1 : 2, isKing = k => k === 2 || k === 4;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, sq) {
    const g = U.piece(colOf(k) === 1 ? 'g' : 'w', isKing(k), { reflect: true });
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
  if (typeof window.renderFx === 'function') { const oFx = window.renderFx; window.renderFx = function () { const r = oFx.apply(this, arguments); T3.kick(200); return r; }; }
  // the page may have drawn its pieces before we hooked in
  try { mirror(); } catch (e) {}

  // test hooks (Playwright)
  window.__ckSkin = { pieces: () => P3.size, meshes: () => root.children.filter(o => o.userData && o.userData.col && !o.userData.dying).length, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
