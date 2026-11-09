/* =====================================================================
   Ludo & Pachisi — portal skin (ludo/?skin=atlas): the full game (AI, rated games, lessons, the coach, review, house rules …)
   on the 3D board of the World Board Game Atlas.
     • the board model (atlas/models/ludo.js — the same as the 3D table) lies under the page's own SVG board, aligned to it
       (AtlasSkin.alignTo); the SVG stays on top, transparent, for the taps, the move marks and the arrows
     • the page's pieces are mirrored into the turned wooden pieces: every move / hop / capture the page animates on its SVG
       pieces is followed by the 3D piece (the hop's lift comes from data-hy, app.js tween / flyHome); the pieces that can move
       get the orange ring, the hint the pink one
     • the dice cup (ludo): the page's cupDraw modes drive a leather cup in 3D — mouth up with the dice inside, shaken, turned
       over onto the board, lifted away to the yard's corner: the dice lie where it stood (the SVG cup stays as the tap target)
     • pachisi: the cross-shaped cloth board and its pieces; the cowries stay in the page's throw panel
   Rendering is on demand (Table3D.kick).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.MODELS || !T3.MODELS.ludo || !window.AtlasSkin || typeof window.cupDraw !== 'function') return;
  const de = document.documentElement, frame = document.getElementById('frame'), svgEl = document.getElementById('bsvg');
  if (!frame || !svgEl) return;
  de.classList.add('atlas-ludo3d');
  const st = document.createElement('style');
  st.textContent = `
html.atlas-ludo3d #bsvg{filter:none!important}
html.atlas-ludo3d #bsvg > :not(#gMarks):not(#gPrev):not(#gPcs):not(#gCup){opacity:0}
html.atlas-ludo3d #bsvg .pcg{opacity:0}
html.atlas-ludo3d #gCup .cupb,html.atlas-ludo3d #gCup .cupd{opacity:0}
html.atlas-ludo3d #frame{background:none!important;box-shadow:none!important}`;
  document.head.appendChild(st);

  const sizeQ = +new URLSearchParams(location.search).get('size') || 0;   // the portal's ルール choice: 4/3/2 ludo, 14/12 pachisi
  const skin = AtlasSkin.init({
    margin: .22,
    board: frame,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/av/monkey-1.webp', guideFallback: '../images/atlas/ludo.webp',
    bubbles: [],
    skip: 'pcg|\\.pc\\b|gCup|cupb|\\.dest|zbtn|\\.shown|\\.dd\\b',
    start(lv, side, mode) {
      if (typeof openNew !== 'function' || !document.getElementById('btnStart')) return null;
      openNew();
      try {
        draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
        if (sizeQ) { draft.rule = sizeQ > 10 ? 'pachisi' : 'ludo'; draft.players = sizeQ > 10 ? sizeQ - 10 : sizeQ; }
        if (lv >= 1 && lv <= 20) draft.level = lv;
        renderDialog();
      } catch (e) {}
      document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the board ---------- */
  let root = null, U = null, rule = '';
  const pcs = {};   // 'seat,k' → 3D piece
  const ringGeo = {}, MAT = { can: new THREE.MeshBasicMaterial({ color: 0xffa000, toneMapped: false }), hint: new THREE.MeshBasicMaterial({ color: 0xff3d7f, toneMapped: false }) };
  function ensure() {
    const r = (typeof G !== 'undefined' && G && G.state && G.state.rule) || 'ludo';
    if (r === rule && root) return;
    rule = r;
    Object.values(pcs).forEach(g => g.parent && g.parent.remove(g)); for (const k in pcs) delete pcs[k];
    cup.reset();
    root = T3.MODELS.ludo(true, r); U = root.userData;
    T3.show(r === 'pachisi' ? 'pachisi' : 'ludo', root, { still: true });
    skin.alignTo((U.n + .8) * U.u, U.top); alignView();
    T3.kick(600);
  }
  const wx = (gx, gy) => U.xz(gx, gy);
  /* the 2D game's focus zoom (phones: the seat to move, the pieces that can move, the walking piece — app.js Z2) changes the SVG's
     viewBox; the camera follows it: the 3D board is aligned to where the whole board would stand at that zoom (a virtual box
     round the frame), and the canvas is clipped to the frame meanwhile, as the SVG is (#frame.zoomed) */
  const PERSP = 2.6;
  function alignView() {
    const host = document.getElementById('atlasGL'); if (!host || !U) return;
    const full = U.n + .8;
    const bx = () => { let x = 0, y = 0, e = frame; while (e && e !== host.parentElement) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x: x - host.offsetLeft, y: y - host.offsetTop, w: frame.offsetWidth, h: frame.offsetHeight }; };
    T3.align(() => {
      const b = bx(), vb = svgEl.viewBox && svgEl.viewBox.baseVal;
      if (!vb || !vb.width || vb.width >= full - .02) return { x: b.x, y: b.y, w: b.w, h: b.h, tilt: 0, persp: b.h * PERSP };
      const sc = b.w / vb.width;
      return { x: b.x - (vb.x + .4) * sc, y: b.y - (vb.y + .4) * sc, w: full * sc, h: full * sc, tilt: 0, persp: full * sc * PERSP };
    }, full * U.u, U.top);
  }
  function clipView() {
    const host = document.getElementById('atlasGL'); if (!host) return;
    if (!frame.classList.contains('zoomed')) { host.style.clipPath = ''; return; }
    const h = host.getBoundingClientRect(), f = frame.getBoundingClientRect();
    host.style.clipPath = `inset(${Math.round(f.top - h.top)}px ${Math.round(h.right - f.right)}px ${Math.round(h.bottom - f.bottom)}px ${Math.round(f.left - h.left)}px round 12px)`;
  }
  function mkPiece(seat) {
    const g = U.piece(rule, +seat), sh = T3.contact(g.userData.r * 1.1, .45); sh.position.y = .002; g.add(sh);
    const R = g.userData.r || U.u * .3, key = R.toFixed(3);
    if (!ringGeo[key]) { ringGeo[key] = new THREE.TorusGeometry(R * 1.35, U.u * .06, 8, 36); ringGeo[key].rotateX(Math.PI / 2); }
    const ring = new THREE.Mesh(ringGeo[key], MAT.can); ring.position.y = .02; ring.visible = false; ring.renderOrder = 3; g.add(ring); g.userData.ring = ring;
    root.add(g); return g;
  }
  const TR = /translate\(\s*([-\d.e]+)[ ,]+([-\d.e]+)\s*\)\s*scale\(\s*([-\d.e]+)/;
  function mirror() {
    if (typeof G === 'undefined' || !G || !G.state) return;
    ensure();
    let els; try { els = pcEls; } catch (e) { return; }
    const seen = new Set();
    for (const key in els) {
      const el = els[key], m = TR.exec(el.getAttribute('transform') || ''); if (!m) continue;
      seen.add(key);
      const g = pcs[key] || (pcs[key] = mkPiece(key.split(',')[0]));
      const hy = +el.dataset.hy || 0, x = +m[1], y = +m[2] + hy, z = +m[3];
      const [X, Z] = wx(x, y); g.position.set(X, U.top + hy * U.u * 1.1, Z); g.scale.setScalar(z);
      const can = el.classList.contains('can'), hint = el.classList.contains('hint');
      g.userData.ring.visible = can || hint; g.userData.ring.material = hint ? MAT.hint : MAT.can;
    }
    for (const key in pcs) if (!seen.has(key)) { const g = pcs[key]; if (g.parent) g.parent.remove(g); delete pcs[key]; }
    clipView(); T3.kick(120);
  }
  let raf = 0;
  const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; try { mirror(); } catch (e) {} }); };
  new MutationObserver(later).observe(svgEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['transform', 'class', 'data-hy', 'viewBox'] });
  new MutationObserver(() => { clipView(); T3.kick(200); }).observe(frame, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => requestAnimationFrame(clipView));

  /* ---------- the dice cup (ludo) ---------- */
  const FACE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };
  const cup = (function () {
    const CR0 = .58, CR1 = .54, CH = .72;
    let g = null, seatAt = -1, mode = null, shakeT = 0, tok = 0;
    const thrown = new THREE.Group();
    // the cup keeps the 2D game's pace: durations follow its speed setting (K), and while modes are waiting in the queue the
    // running move hurries (×3) so the 3D never lags behind the 2D throw panel
    let pending = 0;
    const anim = (dur, f) => new Promise(res => { const my = ++tok; let t = 0, last = performance.now(); (function s(now) { if (my !== tok) return res(); t += (now - last) * (pending ? 3 : 1); last = now; const k = Math.min(1, Math.max(0, t / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else res(); })(last); });   // (2026-11-09: was (t0) — undefined, so every glide / scoop / flip / lift threw and the cup stayed where it was)
    function mk() {
      g = new THREE.Group();
      // (2026-11-09 v3) a black leather cup lined with red felt: a rolled rim with a stitch line, a stitched band at the base
      const leather = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: .52, metalness: 0 });
      const inside = new THREE.MeshStandardMaterial({ color: 0xa8141d, roughness: 1, metalness: 0, side: THREE.BackSide });
      const felt = new THREE.MeshStandardMaterial({ color: 0x8e1018, roughness: 1, metalness: 0 });
      const seam = new THREE.MeshStandardMaterial({ color: 0x4a4a50, roughness: .7, metalness: 0 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(CR1, CR0, CH, 40, 1, true), leather); body.position.y = CH / 2; body.castShadow = true;
      const lin = new THREE.Mesh(new THREE.CylinderGeometry(CR1 - .03, CR0 - .03, CH - .01, 40, 1, true), inside); lin.position.y = CH / 2;
      const top = new THREE.Mesh(new THREE.CircleGeometry(CR1, 40), leather); top.rotation.x = -Math.PI / 2; top.position.y = CH;   // the base, outside
      const floor = new THREE.Mesh(new THREE.CircleGeometry(CR1 - .03, 40), felt); floor.rotation.x = Math.PI / 2; floor.position.y = CH - .012;   // the base, inside (felt)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(CR0 - .015, .032, 10, 48), leather); rim.rotation.x = Math.PI / 2; rim.position.y = .012;   // the rolled rim (the mouth)
      const s1 = new THREE.Mesh(new THREE.TorusGeometry(CR0 - .004, .006, 4, 64), seam); s1.rotation.x = Math.PI / 2; s1.position.y = .1;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(CR1 + .022, CR1 + .026, .13, 40, 1, true), leather); band.position.y = CH - .065;   // the band at the base
      const s2 = new THREE.Mesh(new THREE.TorusGeometry(CR1 + .025, .006, 4, 64), seam); s2.rotation.x = Math.PI / 2; s2.position.y = CH - .13;
      const sh = T3.contact(CR0 * 1.35, .45); sh.position.y = .002;
      const dice = new THREE.Group(), inner = new THREE.Group(); inner.add(body, lin, top, floor, rim, s1, band, s2, dice); g.add(sh, inner);
      g.userData = { inner, sh, dice };
      root.add(g); root.add(thrown);
    }
    const spot = s => { const [gx, gy] = cupSpot(s); return wx(gx, gy); };
    const park = s => { const [gx, gy] = cupSpot(s), ox = gx < 7.5 ? -2.05 : 2.05; return wx(gx + ox, gy - 2.05); };
    let upNow = 1;
    function pose(up, lift, rz) { upNow = up; const I = g.userData.inner; I.rotation.set(Math.PI * up, 0, rz || 0); I.position.set(0, CH * up + (lift || 0), 0); g.userData.sh.scale.setScalar(Math.max(.4, 1 - (lift || 0) * .5)); }
    // a move across the board in one arc (2026-11-09 v2: up-across-down read as separate steps): the cup rises fast and stays above
    // the pawns (.87 × .66 ≈ .57) while it is over the yard's pieces — it is wider than the gap between two yard slots.
    // Returns [x, z, lift] at k ∈ [0, 1].
    const HOP = .92;
    function hop(x0, z0, x1, z1, k) {
      const e = k * k * (3 - 2 * k), l = HOP * Math.pow(Math.max(0, Math.sin(Math.PI * k)), .4);
      return [x0 + (x1 - x0) * e, z0 + (z1 - z0) * e, l];
    }
    // (2026-11-09) the dice run round the inside of the cup while it shakes (not tumbling on one spot): rev = revolutions so far,
    // m = how far into the swirl (from where they lay); two dice keep to opposite sides
    function swirl(d, i, rev, m) {
      const u = d.userData, a = i * Math.PI + .7 + rev * Math.PI * 2, r = .19 + .03 * Math.sin(rev * Math.PI * 5 + i * 2);
      d.position.x = u.x0 + (Math.cos(a) * r - u.x0) * m; d.position.z = u.z0 + (Math.sin(a) * r - u.z0) * m;
    }
    function fill(show) {   // the dice inside (seen while it stands mouth up): two with the two-dice house rule
      const D = g.userData.dice; while (D.children.length) D.remove(D.children[0]);
      D.visible = !!show; if (!show) return;
      const h = G.state.opt && G.state.opt.h, n = h && h.dd && h.dd !== 'none' ? 2 : 1, sc = .7;
      for (let i = 0; i < n; i++) {
        const d = U.die(), hh = d.userData.size / 2 * sc; d.scale.setScalar(sc);
        d.children[0].rotation.set(...FACE[1 + Math.floor(Math.random() * 6)]);
        d.position.set(n > 1 ? (i ? .19 : -.19) : 0, CH - hh - .012, n > 1 ? (i ? .06 : -.06) : 0); d.rotation.set(Math.PI, Math.random() * 6.28, 0);
        d.userData.y0 = d.position.y; d.userData.x0 = d.position.x; d.userData.z0 = d.position.z; D.add(d);
      }
    }
    function clearDice() { while (thrown.children.length) thrown.remove(thrown.children[0]); }
    function putDice(s, thr) {
      clearDice(); const [cx, cz] = spot(s), fs = thr.dice ? (thr.three6 ? [6, 6] : thr.dice) : [thr.v];
      fs.forEach((v, i) => { const d = U.die(), h = d.userData.size / 2, sh = T3.contact(h * 1.4, .4), ox = fs.length > 1 ? (i ? .27 : -.27) : 0, oz = fs.length > 1 ? (i ? .05 : -.05) : 0;
        d.children[0].rotation.set(...FACE[v]); d.position.set(cx + ox, U.top + h + .003, cz + oz); d.rotation.y = ((v * 37 + i * 53) % 30 - 15) / 30; sh.position.set(cx + ox, U.top + .002, cz + oz); thrown.add(sh, d); });
    }
    const K = () => { try { return Math.max(.6, Math.sqrt(SPD())); } catch (e) { return 1; } };   // (the 2D game's speed: app.js SPD)
    // the modes come one after another (a queue): a glide or a scoop finishes before the shake that follows it
    let q = Promise.resolve();
    function set(s, m, thr) {
      if (!root || rule !== 'ludo' || m == null || s < 0) { tok++; q = Promise.resolve(); cancelAnimationFrame(shakeT); shakeT = 0; if (g) g.visible = false; clearDice(); mode = null; return; }
      pending++; q = q.then(() => { pending--; return run(s, m, thr); }).catch(() => {});
    }
    async function scoop() {   // the cup comes beside the last dice, turns mouth up, and they hop in
      const ds = thrown.children.filter(o => o.userData && o.userData.size);
      if (!ds.length) return;
      thrown.children.filter(o => !ds.includes(o)).forEach(o => thrown.remove(o));
      let cx = 0, cz = 0; ds.forEach(d => { cx += d.position.x / ds.length; cz += d.position.z / ds.length; });
      // (2026-11-09) the cup turns mouth up where it lies (the yard's corner, clear of the pieces) and the dice hop over into it —
      // moving it beside the dice put it on top of a piece in the yard
      const tx = g.position.x, tz = g.position.z, u0 = upNow;
      await anim(240 * K(), k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; pose(u0 + (1 - u0) * e, Math.sin(k * Math.PI) * .5); });
      const from = ds.map(d => [d.position.x, d.position.y, d.position.z, d.rotation.x, d.rotation.z]);
      // (2026-11-09) a soft hollow knock as each die drops into the cup (the 2D game's tone(), so its sound setting applies)
      ds.forEach((d, i) => setTimeout(() => { try { if (typeof tone === 'function') { tone(240, .08, 'triangle', .07); tone(480, .03, 'square', .012); } } catch (e) {} }, 320 * K() * (1 + i * .25) / 1.25 / (pending ? 3 : 1)));
      await anim(320 * K(), k => ds.forEach((d, i) => { const qq = Math.min(1, Math.max(0, k * 1.25 - i * .25)), e = qq * qq * (3 - 2 * qq), f = from[i];
        d.position.set(f[0] + (tx - f[0]) * e, f[1] + (U.top + CH * .35 - f[1]) * e + Math.sin(qq * Math.PI) * 1.1, f[2] + (tz - f[2]) * e);
        d.rotation.x = f[3] + qq * 4; d.rotation.z = f[4] + qq * 2.5; d.scale.setScalar(1 - .3 * e); }));
      clearDice(); fill(true);
    }
    async function run(s, m, thr) {
      if (!g) mk();
      g.visible = true;
      const k = K(), prev = mode; mode = m; cancelAnimationFrame(shakeT); shakeT = 0;
      if (m === 'ready' || m === 'idle') {
        if ((prev === 'ready' || prev === 'idle') && seatAt === s) return;
        const [x, z] = spot(s);
        if (seatAt < 0) { clearDice(); fill(true); tok++; g.position.set(x, U.top, z); pose(1, 0); seatAt = s; T3.kick(200); return; }
        await scoop();
        if (!g.userData.dice.children.length) fill(true);
        const x0 = g.position.x, z0 = g.position.z, u0 = upNow; seatAt = s;
        if (Math.hypot(x - x0, z - z0) < .01) { pose(1, 0); T3.kick(120); return; }
        await anim(440 * K(), qq => { const [hx, hz, hl] = hop(x0, z0, x, z, qq); g.position.set(hx, U.top, hz); pose(u0 + (1 - u0) * Math.min(1, qq * 2), hl); });
        return;
      }
      const [cx, cz] = spot(s);
      if (m === 'shake') {
        tok++; if (!g.userData.dice.children.length) fill(true); g.position.set(cx, U.top, cz); seatAt = s;
        const DD = g.userData.dice.children, t0 = performance.now();
        const f = now => { const t = (now - t0) / 1000, k4 = Math.min(1, t * 6), w = Math.sin(t * 30 / k) * k4;
          pose(1, k4 * .35, w * .22); g.position.x = cx + w * .06;
          DD.forEach((d, i) => { const j = Math.abs(Math.sin(t * 34 / k + i * 1.7)) * k4; d.position.y = d.userData.y0 - j * .12; swirl(d, i, t * 4.9 / k, k4); d.rotation.x = Math.PI + t * Math.PI * (4 + i) / k * (i ? -1 : 1) * k4; d.rotation.z = t * Math.PI * (3 - i) / k; d.rotation.y += .25; });   // (tumbling)
          T3.kick(80); shakeT = requestAnimationFrame(f); };
        shakeT = requestAnimationFrame(f); return;
      }
      if (m === 'flip') { g.position.set(cx, U.top, cz); await anim(260 * k, qq => { const e = qq * qq; pose(1 - e, .35 * (1 - e) + Math.sin(qq * Math.PI) * .45); }); return; }
      if (m === 'down') { tok++; g.position.set(cx, U.top, cz); pose(0, 0); fill(false); T3.kick(200); return; }
      if (m === 'lift' || m === 'dice') {
        if (thr) putDice(s, thr);
        fill(false);
        const [px, pz] = park(s);
        if (m === 'dice' || prev !== 'down') { tok++; g.position.set(px, U.top, pz); pose(0, 0); T3.kick(200); return; }
        await anim(520 * k, qq => { const [hx, hz, hl] = hop(cx, cz, px, pz, qq); g.position.set(hx, U.top, hz); pose(0, hl); });
      }
    }
    function reset() { q = Promise.resolve(); tok++; cancelAnimationFrame(shakeT); shakeT = 0; g = null; seatAt = -1; mode = null; clearDice(); }
    return { set, reset };
  })();
  const oCup = window.cupDraw;
  window.cupDraw = function (seat, mode, thr) { const r = oCup.apply(this, arguments); try { ensure(); cup.set(seat, mode, thr); } catch (e) {} return r; };
  // lessons / puzzles (SP): the page draws no cup and sets the throw itself — show that throw's dice in the yard, the cup put
  // aside (2026-11-09: the cup stayed mouth up with the last game's die in it, not the lesson's number)
  const oShow = window.showThrow;
  if (typeof oShow === 'function') window.showThrow = function (thr) {
    const r = oShow.apply(this, arguments);
    try { if (typeof SP !== 'undefined' && SP && G && G.state) { ensure(); if (G.state.rule === 'ludo' && thr) cup.set(G.state.turn, 'dice', thr); else cup.set(-1, null); } } catch (e) {}
    return r;
  };

  ensure(); mirror();
  // the 2D game redraws its board for a new rule (drawBoard): the 3D board follows
  const oDraw = window.drawBoard;
  if (typeof oDraw === 'function') window.drawBoard = function () { const r = oDraw.apply(this, arguments); try { ensure(); mirror(); } catch (e) {} return r; };
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));

  // test hooks (Playwright)
  window.__ludoSkin = { rule: () => rule, pieces: () => Object.keys(pcs).length, at: (gx, gy) => { const [x, z] = wx(gx, gy); return T3.project(x, z, U.top); } };
})();
