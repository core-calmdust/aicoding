/* =====================================================================
   Kōnane — portal skin (konane/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, lessons,
   puzzles, the daily puzzle, review / analysis, the coach, the 6×6 / 8×8 / 10×10 boards…).
   This file:
     • draws the 3D board (atlas/models/konane.js: 'quilt' — a koa tray holding the Hawaiian quilt, or
       'papamu' — a rough basalt slab with pecked cups; chosen under the 3D tile of the design tab, the
       same key as the portal's 盤 row) with the 3D table, rebuilt when the board size or the look
       changes; the camera is aligned to the DOM board, which stays on top
       (transparent) for taps, the destinations, arrows, hints and labels; the count plates sit
       on the far / near bands of the slab
     • mirrors the page's stones (syncPieces / animateMove) into coral and basalt pebbles: an
       opening removal lifts the stone off; a jump hops square by square, each stone it jumps
       pops up and vanishes as it is passed; the selected stone is lifted
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.KonaneEngine, K3 = T3 && T3.konane;
  if (!THREE || !T3 || !K3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateMove !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-konane');

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-konane .frame{background:transparent!important;box-shadow:none!important;border:0!important}
html.atlas-konane .frame::before,html.atlas-konane .frame::after,html.atlas-konane .board::after,html.atlas-konane .board::before{display:none!important}
html.atlas-konane .board{background:none!important;box-shadow:none!important}
html.atlas-konane .lines :is(.puka,.puka-hl,.puka-rim){fill:transparent!important;stroke:none!important}
html.atlas-konane{--pcB:url(img/pc-stone-b.webp)!important;--pcW:url(img/pc-stone-w.webp)!important}   /* the 3D boards' stones (basalt / coral pebbles) everywhere on the page: plates, players, record */
html.atlas-konane .lines{overflow:visible!important}
html.atlas-konane .lines .num{fill:rgba(255,236,200,.78)!important;font-weight:700}
html.atlas-konane .lines .num:not([text-anchor]){transform:translate(-.36px,0)}   /* ranks: out on the side band, clear of the pebbles */
html.atlas-konane .lines .num[text-anchor]{transform:translate(0,.26px)}   /* files: just below the last row */
html.atlas-konane .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important}
html.atlas-konane .pieces .pc:not(.hov)::before,html.atlas-konane .pieces .pc:not(.hov)::after,html.atlas-konane .pieces .pc:not(.hov) .orn{display:none!important}
html.atlas-konane .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,214,100,.95),0 0 18px rgba(255,200,80,.75)!important}
html.atlas-konane .pieces .pc.mov:not(.sel){box-shadow:0 0 0 2.5px rgba(120,236,214,.85),0 0 12px rgba(120,236,214,.5)!important}
html.atlas-konane .pieces .pc.rmable:not(.sel){box-shadow:0 0 0 3px rgba(255,170,90,.95),0 0 16px rgba(255,140,60,.7)!important;animation:knRm 1.4s ease-in-out infinite!important}
@keyframes knRm{50%{box-shadow:0 0 0 5px rgba(255,170,90,.5),0 0 22px rgba(255,140,60,.45)}}
html.atlas-konane .pieces .pc.dim{opacity:1!important}
html.atlas-konane .pieces .hov{opacity:.45!important;box-shadow:none!important}
html.atlas-konane .pieces .hov::before,html.atlas-konane .pieces .hov::after,html.atlas-konane .pieces .hov .orn{display:none!important}
html.atlas-konane .pieces .hov.p1{background:radial-gradient(circle at 40% 35%,#5a5856,#1d1c1b 60%,#0b0b0b)!important}
html.atlas-konane .pieces .hov.p2{background:radial-gradient(circle at 40% 35%,#fff,#efe8da 60%,#c9bfae)!important}
html.atlas-konane .reserve .rsv-plate{background:rgba(24,18,14,.82)!important;box-shadow:0 0 0 1px rgba(120,236,214,.4),0 2px 6px rgba(0,0,0,.35)!important;color:#f0d9bd!important}
html.atlas-konane .reserve .rsv-plate .rsv-l b,html.atlas-konane .reserve .rsv-plate .rsv-w:not(.hot) b{color:#fff2dc!important}
html.atlas-konane .reserve .rsv-plate .rsv-w:not(.hot){color:#f0d9bd!important;background:transparent!important}
html.atlas-konane #fPieces{display:none!important}
html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#eef8f5;border:2px solid #bfe3da}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:13px;color:#0f6f66;margin:0 0 8px}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:8px}
`;
  document.head.appendChild(st);

  const NS = () => { try { return E.N; } catch (e) { return 8; } };
  const skin = AtlasSkin.init({
    margin: .16,
    persp: 10,   // a long lens: the pebbles sit in their cups (the DOM rings stay round them)
    board: boardDom,
    pc: { vars: ['--cell'], extras: '.frame > .reserve' },   // PC: board + info column laid out from the 3D slab (AtlasSkin pcFit)
    outer: r => { const S = NS(), H = r.height * K3.H(S) / S; return { top: r.top + r.height / 2 - H / 2, height: H }; },   // slab edge to slab edge
    guide: '../images/atlas/g-crab.webp', guideFallback: '../images/atlas/konane.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|rsv|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt|orn',
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

  /* ---------- the board (rebuilt for another size: 6×6 / 8×8 / 10×10) ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, Y = 0, built = '';
  const P3 = new Map();   // square → { g, k }
  let tok = 0;            // a full re-sync cancels running animations
  function build() {
    const n = NS(), look = T3.BOARDS && T3.BOARDS.konane ? T3.BOARDS.konane.get() : 'papamu';
    if (n + look === built && root) return false;
    built = n + look; tok++;
    if (root) holder.remove(root);
    P3.clear();
    root = K3.board(n, look); U = root.userData; Y = U.top - U.sink; holder.add(root);
    T3.show('konane', holder, { still: true });
    skin.alignTo(n, U.top);
    dispatchEvent(new Event('resize'));
    T3.kick(600);
    return true;
  }
  build();
  const V = skin.view && skin.view({ key: 'atlas-konane-view', cls: ['atlas-konane'] });   // (no 3D tile in the 盤面 row: the 3D boards have their own 「3D盤」 row)
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: the 3D set replaces the 2D board / stone designs ---------- */
  // the new-game dialog's design tab: a 「3D盤」 box inside the 盤面 box, under the 2D boards (the standard for every game with 3D boards, 2026-11-06).
  // A 3D board picked: the 3D view with that board; a 2D board picked: the 2D page. Exactly one tile of the two rows is selected.
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد' };
  const lng = () => ((document.getElementById('langSel') || {}).value || (typeof LANG !== 'undefined' ? LANG : 'ja')).slice(0, 2);
  const is3 = () => !V || V.is3d();
  function setLook(k) {
    if (!T3.BOARDS || !T3.BOARDS.konane) return;
    if (T3.setBoard) T3.setBoard('konane', k); else T3.BOARDS.konane.set(k);
    if (V && !V.is3d()) V.set(true);
    try { mirror(); } catch (e) {}
    paint3();
  }
  let f3 = null;
  function paint3() {
    const B = T3.BOARDS && T3.BOARDS.konane; if (!f3 || !B) return;
    const l = lng(), cur = B.get(), on = is3();
    f3.querySelector('label').textContent = T3L[l] || T3L.en;
    const row = f3.querySelector('.bdrow');
    if (!row.children.length) B.list.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardThumb ? T3.boardThumb('konane', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); row.appendChild(bt);
    });
    row.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = on && cur === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l) : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    const r2 = document.getElementById('bdRow');   // 3D chosen: no 2D board shows as selected
    if (r2 && on) r2.querySelectorAll('button').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
  }
  const fd = document.getElementById('fDesign');
  if (fd) {
    f3 = document.createElement('div'); f3.id = 'f3D';   // inside the 盤面 box, under the 2D boards
    f3.innerHTML = '<label></label><div class="bdrow"></div>'; fd.appendChild(f3);
    paint3(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    const r2 = document.getElementById('bdRow');
    if (r2) r2.addEventListener('click', e => { if (e.target.closest('button') && V) { V.set(false); setTimeout(paint3, 0); } }, true);   // a 2D board: the 2D page
    if (typeof window.designPickers === 'function') { const od = window.designPickers; window.designPickers = function () { const r = od.apply(this, arguments); try { paint3(); } catch (e) {} return r; }; }
  }
  addEventListener('storage', e => { if (e.key === 'atlas-konane-look') { try { mirror(); } catch (x) {} paint3(); } });

  /* ---------- 3D stones mirrored from the page's stones ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const colOf = k => k <= 2 ? 1 : 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const anim = (dur, f, done, my) => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
  function mk(k, sq) {
    const g = U.piece(colOf(k));
    const sh = T3.contact(K3.R * .9, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    const [x, z] = xz(sq); g.position.set(x, Y, z); root.add(g); return g;
  }
  function lift(g, h) {
    g.position.y = Y + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); }
  }
  const hOf = g => g.userData.h0 || 0;
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function land(g, my) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1), my); }
  // a stone leaving the board (captured, or lifted off in the opening): up, a little turn, shrinking away
  function vanish(g, delay, my) {
    setTimeout(() => {
      if (my !== tok) { drop(g); return; }
      const x0 = g.position.x, z0 = g.position.z;
      anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g));
    }, delay);
  }
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
    build();
    tok++;
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: mk(k, i), k }); continue; }
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z; g.scale.set(1, 1, 1); g.rotation.z = 0; g.userData.moving = false; g.userData.up = false; lift(g, 0);
    }
    applySel(); T3.kick(300);
  }
  // a move as the page animates it (the same timing: HOP per jump, the captured stone leaves halfway through its hop)
  const HOP = 260;
  function travel(m, before) {
    const f = E.mFrom(m), o = P3.get(f); if (!o) return false;
    const my = tok;
    if (E.isRemove(m)) { P3.delete(f); vanish(o.g, 0, my); return true; }
    const to = E.mTo(m), path = E.path(before, m), caps = E.captured(before, m), g = o.g;
    P3.delete(f); P3.set(to, o);
    caps.forEach((q, k) => { const c = P3.get(q); if (c) { P3.delete(q); vanish(c.g, k * HOP + HOP * .45, my); } });
    g.userData.moving = true; g.userData.up = false;
    const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1, dur = legs * HOP;
    anim(dur, k => {
      const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q = r - i, [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
      g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
      lift(g, Math.max(0, Math.sin(q * Math.PI) * .6 + (i === 0 ? h0 * (1 - q) : 0)));
    }, () => { g.userData.moving = false; lift(g, 0); land(g, my); }, my);
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

  window.__knSkin = { pieces: () => P3.size, size: () => built, at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); } };
})();
