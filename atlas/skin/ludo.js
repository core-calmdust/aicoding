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
html.atlas-ludo3d #bsvg{filter:none!important;overflow:visible!important}
html.atlas-ludo3d #bsvg > :not(#gMarks):not(#gPrev):not(#gPcs):not(#gCup){opacity:0}
html.atlas-ludo3d #bsvg .pcg{opacity:0}
html.atlas-ludo3d #gCup .cupb,html.atlas-ludo3d #gCup .cupd{opacity:0}
html.atlas-ludo3d .zbtn{display:none!important}
html.atlas-ludo3d #frame{background:none!important;box-shadow:none!important}`;
  document.head.appendChild(st);
  // the phone zoom of the SVG board would slide it off the 3D board: the skin shows the whole board
  try { Z2.on = false; } catch (e) {}

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
    skin.alignTo((U.n + .8) * U.u, U.top);
    T3.kick(600);
  }
  const wx = (gx, gy) => U.xz(gx, gy);
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
    T3.kick(120);
  }
  let raf = 0;
  const later = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; try { mirror(); } catch (e) {} }); };
  new MutationObserver(later).observe(svgEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['transform', 'class', 'data-hy'] });

  /* ---------- the dice cup (ludo) ---------- */
  const FACE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };
  const cup = (function () {
    const CR0 = .58, CR1 = .48, CH = .72;
    let g = null, seatAt = -1, mode = null, shakeT = 0, tok = 0;
    const thrown = new THREE.Group();
    const anim = (dur, f) => new Promise(res => { const my = ++tok, t0 = performance.now(); (function s(now) { if (my !== tok) return res(); const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    function mk() {
      g = new THREE.Group();
      const leather = new THREE.MeshStandardMaterial({ color: 0x4a2310, roughness: .58, side: THREE.DoubleSide });
      const inside = new THREE.MeshStandardMaterial({ color: 0x1e0f06, roughness: .9, side: THREE.BackSide });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd2a24c, roughness: .35, metalness: .7 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(CR1, CR0, CH, 40, 1, true), leather); body.position.y = CH / 2; body.castShadow = true;
      const lin = new THREE.Mesh(new THREE.CylinderGeometry(CR1 - .02, CR0 - .02, CH - .01, 40, 1, true), inside); lin.position.y = CH / 2;
      const top = new THREE.Mesh(new THREE.CircleGeometry(CR1, 40), leather); top.rotation.x = -Math.PI / 2; top.position.y = CH;
      const b1 = new THREE.Mesh(new THREE.TorusGeometry(CR0 - .012, .026, 8, 40), gold); b1.rotation.x = Math.PI / 2; b1.position.y = .05;
      const b2 = new THREE.Mesh(new THREE.TorusGeometry(CR1 + .012, .022, 8, 40), gold); b2.rotation.x = Math.PI / 2; b2.position.y = CH - .06;
      const sh = T3.contact(CR0 * 1.35, .45); sh.position.y = .002;
      const dice = new THREE.Group(), inner = new THREE.Group(); inner.add(body, lin, top, b1, b2, dice); g.add(sh, inner);
      g.userData = { inner, sh, dice };
      root.add(g); root.add(thrown);
    }
    const spot = s => { const [gx, gy] = cupSpot(s); return wx(gx, gy); };
    const park = s => { const [gx, gy] = cupSpot(s), ox = gx < 7.5 ? -2.05 : 2.05; return wx(gx + ox, gy - 2.05); };
    let upNow = 1;
    function pose(up, lift, rz) { upNow = up; const I = g.userData.inner; I.rotation.set(Math.PI * up, 0, rz || 0); I.position.set(0, CH * up + (lift || 0), 0); g.userData.sh.scale.setScalar(Math.max(.4, 1 - (lift || 0) * .5)); }
    function fill(show) {   // the dice inside (seen while it stands mouth up): two with the two-dice house rule
      const D = g.userData.dice; while (D.children.length) D.remove(D.children[0]);
      D.visible = !!show; if (!show) return;
      const h = G.state.opt && G.state.opt.h, n = h && h.dd && h.dd !== 'none' ? 2 : 1, sc = .7;
      for (let i = 0; i < n; i++) {
        const d = U.die(), hh = d.userData.size / 2 * sc; d.scale.setScalar(sc);
        d.children[0].rotation.set(...FACE[1 + Math.floor(Math.random() * 6)]);
        d.position.set(n > 1 ? (i ? .19 : -.19) : 0, CH - hh - .012, n > 1 ? (i ? .06 : -.06) : 0); d.rotation.set(Math.PI, Math.random() * 6.28, 0);
        d.userData.y0 = d.position.y; D.add(d);
      }
    }
    function clearDice() { while (thrown.children.length) thrown.remove(thrown.children[0]); }
    function putDice(s, thr) {
      clearDice(); const [cx, cz] = spot(s), fs = thr.dice ? (thr.three6 ? [6, 6] : thr.dice) : [thr.v];
      fs.forEach((v, i) => { const d = U.die(), h = d.userData.size / 2, sh = T3.contact(h * 1.4, .4), ox = fs.length > 1 ? (i ? .27 : -.27) : 0, oz = fs.length > 1 ? (i ? .05 : -.05) : 0;
        d.children[0].rotation.set(...FACE[v]); d.position.set(cx + ox, U.top + h + .003, cz + oz); d.rotation.y = ((v * 37 + i * 53) % 30 - 15) / 30; sh.position.set(cx + ox, U.top + .002, cz + oz); thrown.add(sh, d); });
    }
    const K = () => { const v = parseFloat(svgEl.querySelector('#gCup') && svgEl.querySelector('#gCup').style.getPropertyValue('--k')); return v > 0 ? v : 1; };
    // the modes come one after another (a queue): a glide or a scoop finishes before the shake that follows it
    let q = Promise.resolve();
    function set(s, m, thr) {
      if (!root || rule !== 'ludo' || m == null || s < 0) { tok++; q = Promise.resolve(); cancelAnimationFrame(shakeT); shakeT = 0; if (g) g.visible = false; clearDice(); mode = null; return; }
      q = q.then(() => run(s, m, thr)).catch(() => {});
    }
    async function scoop() {   // the cup comes beside the last dice, turns mouth up, and they hop in
      const ds = thrown.children.filter(o => o.userData && o.userData.size);
      if (!ds.length) return;
      thrown.children.filter(o => !ds.includes(o)).forEach(o => thrown.remove(o));
      let cx = 0, cz = 0; ds.forEach(d => { cx += d.position.x / ds.length; cz += d.position.z / ds.length; });
      const x0 = g.position.x, z0 = g.position.z, dx = x0 - cx, dz = z0 - cz, L = Math.hypot(dx, dz) || 1, tx = cx + dx / L * .8, tz = cz + dz / L * .8, u0 = upNow;
      await anim(320, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; g.position.set(x0 + (tx - x0) * e, U.top, z0 + (tz - z0) * e); pose(u0 + (1 - u0) * e, Math.sin(k * Math.PI) * .5); });
      const from = ds.map(d => [d.position.x, d.position.y, d.position.z, d.rotation.x, d.rotation.z]);
      await anim(340, k => ds.forEach((d, i) => { const qq = Math.min(1, Math.max(0, k * 1.25 - i * .25)), e = qq * qq * (3 - 2 * qq), f = from[i];
        d.position.set(f[0] + (tx - f[0]) * e, f[1] + (U.top + CH * .35 - f[1]) * e + Math.sin(qq * Math.PI) * .75, f[2] + (tz - f[2]) * e);
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
        await anim(440, qq => { const e = qq < .5 ? 2 * qq * qq : 1 - Math.pow(-2 * qq + 2, 2) / 2; g.position.set(x0 + (x - x0) * e, U.top, z0 + (z - z0) * e); pose(u0 + (1 - u0) * e, Math.sin(qq * Math.PI) * .7); });
        return;
      }
      const [cx, cz] = spot(s);
      if (m === 'shake') {
        tok++; if (!g.userData.dice.children.length) fill(true); g.position.set(cx, U.top, cz); seatAt = s;
        const DD = g.userData.dice.children, t0 = performance.now();
        const f = now => { const t = (now - t0) / 1000, k4 = Math.min(1, t * 6), w = Math.sin(t * 30 / k) * k4;
          pose(1, k4 * .35, w * .22); g.position.x = cx + w * .06;
          DD.forEach((d, i) => { const j = Math.abs(Math.sin(t * 34 / k + i * 1.7)) * k4; d.position.y = d.userData.y0 - j * .12; d.rotation.x = Math.PI + t * Math.PI * (4 + i) / k * (i ? -1 : 1) * k4; d.rotation.z = t * Math.PI * (3 - i) / k; d.rotation.y += .25; });   // (tumbling)
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
        await anim(450 * k, qq => { const e = 1 - Math.pow(1 - qq, 3); g.position.set(cx + (px - cx) * e, U.top, cz + (pz - cz) * e); pose(0, Math.sin(e * Math.PI) * .9); });
      }
    }
    function reset() { q = Promise.resolve(); tok++; cancelAnimationFrame(shakeT); shakeT = 0; g = null; seatAt = -1; mode = null; clearDice(); }
    return { set, reset };
  })();
  const oCup = window.cupDraw;
  window.cupDraw = function (seat, mode, thr) { const r = oCup.apply(this, arguments); try { ensure(); cup.set(seat, mode, thr); } catch (e) {} return r; };

  ensure(); mirror();
  // the 2D game redraws its board for a new rule (drawBoard): the 3D board follows
  const oDraw = window.drawBoard;
  if (typeof oDraw === 'function') window.drawBoard = function () { const r = oDraw.apply(this, arguments); try { try { Z2.on = false; } catch (e) {} ensure(); mirror(); } catch (e) {} return r; };
  [700, 1600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));

  // test hooks (Playwright)
  window.__ludoSkin = { rule: () => rule, pieces: () => Object.keys(pcs).length, at: (gx, gy) => { const [x, z] = wx(gx, gy); return T3.project(x, z, U.top); } };
})();
