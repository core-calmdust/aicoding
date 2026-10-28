/* =====================================================================
   Dots and Boxes — portal skin (dots/?skin=atlas)
   The full Dots & Boxes page keeps every feature (AI, rated games, two
   players, AI vs AI, lessons, openings, puzzles, review box, online play…).
   This file:
     • lays the spiral notebook (atlas/models/dots.js) under the page: the DOM
       frame is the lower square of the notebook page (the spiral and the page
       head stand above it, so the frame keeps that room free — dots.css), the
       camera aligned to the DOM board (which stays on top, see-through, for
       taps, previews, hints, lesson marks and the review overlays)
     • draws the game on the page (a canvas texture) whenever the page draws
       its board (renderBoard): hand-inked dots, red / blue ballpoint lines,
       closed boxes hatched and initialled in the closer's ink, the running
       tally in the head; a new line is drawn with an animated stroke
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.dots || !window.AtlasSkin || typeof window.renderBoard !== 'function') return;
  const D = T3.dots, de = document.documentElement, boardEl = document.getElementById('board');
  de.classList.add('atlas-dots');
  const PW = D.PW, PD = D.PD, PY = D.PY;
  // the DOM frame (1.07 × the board) = the page's full width; its bottom = the page's bottom
  const SQ = PW / 1.07, BX0 = (PW - SQ) / 2, BZ0 = PD - BX0 - SQ, BAND = BZ0 - BX0 + .2;   // board square on the page; the band above the frame (spiral + head)
  de.style.setProperty('--dtband', (BAND / SQ).toFixed(4));
  const INK = [D.RED, D.BLUE], NEUTRAL = '#3c3f48';

  const skin = AtlasSkin.init({
    board: boardEl,
    outer: r => { const k = r.height / SQ; return { top: r.top - (BZ0 + .2) * k, height: (PD + .2) * k }; },   // the whole notebook
    guide: '../images/atlas/g-dot.webp', guideFallback: '../images/atlas/dots.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'edge|dot\\b|box|guide|coord|preview|hintline|badline|ripple|cap3|frame|swatch|boxbar',
    start(lv, side, mode) {
      if (typeof openNew !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNew();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (lv >= 1 && lv <= 10) draft.level = lv;
      if (side === 1 || side === 2) draft.order = side - 1;
      const sz = +new URLSearchParams(location.search).get('size'); if ([3, 4, 5].includes(sz)) draft.size = sz;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  // cream paper: soft clouds painted small and scaled up, plus a tiled fine grain (fast: no per-pixel work at full size)
  function paperFill(c, CW, CH, T3) {
    const sw = Math.ceil(CW / 6), sh = Math.ceil(CH / 6), sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
    const sc = sm.getContext('2d'), Nz = T3.makeNoise(3), img = sc.createImageData(sw, sh), d = img.data;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const v = (Nz(x / 12, y / 12, 3) - .5) * 9, i = (y * sw + x) * 4; d[i] = 251 + v; d[i + 1] = 247 + v; d[i + 2] = 236 + v * .9; d[i + 3] = 255; }
    sc.putImageData(img, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(sm, 0, 0, CW, CH);
    const gs = 256, g = document.createElement('canvas'); g.width = g.height = gs;
    const gc = g.getContext('2d'), gi = gc.createImageData(gs, gs), gd = gi.data;
    for (let i = 0; i < gs * gs; i++) { const v = Math.random() < .5 ? 0 : 255; gd[i * 4] = gd[i * 4 + 1] = gd[i * 4 + 2] = v; gd[i * 4 + 3] = 5 + Math.random() * 9; }
    gc.putImageData(gi, 0, 0); c.fillStyle = c.createPattern(g, 'repeat'); c.fillRect(0, 0, CW, CH);
  }

  /* ---------- the notebook: the board square's centre at the origin ---------- */
  const root = new THREE.Group(), nb = D.notebook(false); root.add(nb);
  nb.position.set(PW / 2 - (BX0 + SQ / 2), 0, PD / 2 - (BZ0 + SQ / 2));
  const page = nb.userData.page;
  T3.show('dots', root, { still: true });
  skin.alignTo(SQ, PY);

  /* ---------- the page: cached paper + the ink of the shown position ---------- */
  // (a square power-of-two canvas, drawn with a vertical squash: WebGL would otherwise resize every upload)
  const s = T3.texScale(), CW = Math.round(2048 * s), CH = Math.round(CW * PD / PW), PH = CW, K = CW / PW, Uu = v => v * K;
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = PH;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  page.material = page.material.clone(); page.material.map = tex; page.material.needsUpdate = true;
  let paper = null, paperN = 0;
  const geo = () => { const n = game.n, W = n * U + 2 * M; return { n, W, dot: (r, c) => [BX0 + (M + c * U) / W * SQ, BZ0 + (M + r * U) / W * SQ], sp: U / W * SQ }; };
  function makePaper(gm) {
    const c = (paper = paper || document.createElement('canvas')).getContext('2d'); paper.width = CW; paper.height = PH; paperN = gm.n; c.setTransform(1, 0, 0, PH / CH, 0, 0);
    paperFill(c, CW, CH, T3);
    c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(255,236,205,1)'; c.fillRect(0, 0, CW, CH); c.globalCompositeOperation = 'source-over';   // a warmer cream under the page's cooler light
    const z0 = gm.dot(0, 0)[1], h = gm.sp / 2;
    c.strokeStyle = 'rgba(80,130,200,.3)'; c.lineWidth = Math.max(1, Uu(.014));
    for (let z = z0 - Math.ceil((z0 - 1.1) / h) * h; z < PD - .2; z += h) { c.beginPath(); c.moveTo(0, Uu(z)); c.lineTo(CW, Uu(z)); c.stroke(); }
    c.strokeStyle = 'rgba(214,80,90,.4)'; c.lineWidth = Uu(.016); c.beginPath(); c.moveTo(Uu(.75), Uu(.75)); c.lineTo(Uu(.75), CH); c.stroke();
    c.fillStyle = 'rgba(70,110,170,.55)'; c.font = `600 ${Uu(.17)}px "Helvetica Neue",Arial,sans-serif`;
    c.fillText('No.', Uu(4.3), Uu(.98)); c.fillText('Date', Uu(5.6), Uu(.98));
    c.strokeStyle = 'rgba(70,110,170,.5)'; c.lineWidth = Uu(.01); c.beginPath(); c.moveTo(Uu(4.62), Uu(1)); c.lineTo(Uu(5.45), Uu(1)); c.moveTo(Uu(6.05), Uu(1)); c.lineTo(Uu(7.2), Uu(1)); c.stroke();
    for (let i = 0; i < D.HOLES; i++) { const x = D.holeX(i) + PW / 2; c.beginPath(); c.arc(Uu(x), Uu(.32), Uu(.085), 0, 7); c.fillStyle = '#2a2c33'; c.fill(); }
    let q = 99; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let r = 0; r <= gm.n; r++) for (let cc = 0; cc <= gm.n; cc++) {
      const [px, pz] = gm.dot(r, cc), x = Uu(px) + (rr() - .5) * Uu(.02), y = Uu(pz) + (rr() - .5) * Uu(.02);
      c.fillStyle = 'rgba(35,37,44,.3)'; c.beginPath(); c.arc(x, y, Uu(.095), 0, 7); c.fill();
      c.fillStyle = '#23252c'; c.beginPath(); c.ellipse(x, y, Uu(.072), Uu(.066), rr() * 3, 0, 7); c.fill();
    }
  }
  function strokeOf(gm, e) {   // the same hand-drawn line every time (seeded by the edge)
    let q = 7919 * (e + 1) + gm.n * 31; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const G = DotsEngine.geom(gm.n, gm.n), [r1, c1, r2, c2] = G.ed[e], a = .12, h = r1 === r2;
    let [x1, z1] = gm.dot(r1, c1), [x2, z2] = gm.dot(r2, c2);
    if (h) { x1 += a; x2 -= a; } else { z1 += a; z2 -= a; }
    if (rr() < .5) [x1, z1, x2, z2] = [x2, z2, x1, z1];
    const L = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / L, nz = (x2 - x1) / L, bow = (rr() - .5) * L * .06;
    return { x1, z1, x2, z2, cx: (x1 + x2) / 2 + nx * bow, cz: (z1 + z2) / 2 + nz * bow, w: .05, j: [(rr() - .5) * .03, (rr() - .5) * .03] };
  }
  const qpt = (st, k) => { const u = 1 - k; return [u * u * st.x1 + 2 * u * k * st.cx + k * k * st.x2, u * u * st.z1 + 2 * u * k * st.cz + k * k * st.z2]; };
  function inkStroke(c, st, col) {
    c.strokeStyle = col; c.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      c.globalAlpha = p ? .5 : .92; c.lineWidth = Uu(st.w) * (p ? .55 : 1);
      const ox = p ? Uu(st.j[0]) : 0, oz = p ? Uu(st.j[1]) : 0;
      c.beginPath(); c.moveTo(Uu(st.x1) + ox, Uu(st.z1) + oz); c.quadraticCurveTo(Uu(st.cx) + ox, Uu(st.cz) + oz, Uu(st.x2) - ox, Uu(st.z2) - oz); c.stroke();
    }
    c.globalAlpha = .8; c.fillStyle = col; c.beginPath(); c.arc(Uu(st.x1), Uu(st.z1), Uu(st.w) * .62, 0, 7); c.fill(); c.globalAlpha = 1;
  }
  function boxInk(c, gm, bx, o) {
    const r = Math.floor(bx / gm.n), cc = bx % gm.n, [px, pz] = gm.dot(r, cc), x0 = Uu(px), y0 = Uu(pz), sz = Uu(gm.sp), col = o === 2 ? NEUTRAL : INK[o];
    let q = 131 * (bx + 3); const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    c.save(); c.beginPath(); c.rect(x0 + Uu(.08), y0 + Uu(.08), sz - Uu(.16), sz - Uu(.16)); c.clip();
    c.strokeStyle = col; c.globalAlpha = o === 2 ? .12 : .24; c.lineWidth = Uu(.022);
    const gap = Uu(Math.max(.11, gm.sp * .11));
    for (let tt = -sz; tt < sz * 2; tt += gap) { c.beginPath(); c.moveTo(x0 + tt + (rr() - .5) * Uu(.03), y0); c.lineTo(x0 + tt - sz + (rr() - .5) * Uu(.03), y0 + sz); c.stroke(); }
    c.restore();
    if (o === 2) return;
    let ch = 'RB'[o]; try { ch = initial(o) || ch; } catch (e) {}
    c.save(); c.translate(x0 + sz / 2, y0 + sz / 2 + Uu(.04)); c.rotate((rr() - .5) * .3); c.globalAlpha = .9; c.fillStyle = col;
    c.font = `italic 700 ${Uu(Math.min(.95, gm.sp * (ch.length > 1 ? .36 : .5)))}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, 0, 0); c.restore();
  }
  function paint(skipE) {
    if (!S) return;
    const gm = geo(); if (!paper || paperN !== gm.n) makePaper(gm);
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(paper, 0, 0); c.setTransform(1, 0, 0, PH / CH, 0, 0);
    for (let b = 0; b < S.G.B; b++) if (S.owner[b] >= 0 && !(skipE >= 0 && S.log.length && S.log[S.log.length - 1].boxes.includes(b))) boxInk(c, gm, b, S.owner[b]);
    for (let e = 0; e < S.G.E; e++) if (S.p.drawn[e] && e !== skipE) inkStroke(c, strokeOf(gm, e), S.by[e] === 2 ? NEUTRAL : INK[S.by[e]]);
    const tally = k => k > 0 ? '  ' + 'I'.repeat(k).replace(/(IIIII)/g, '$1 ') : '';
    c.font = `italic 700 ${Uu(.32)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const ty = Math.min(1.62, BZ0 - .12);
    c.fillStyle = INK[0]; c.fillText('R' + tally(S.scores[0]), Uu(1.1), Uu(ty)); c.fillStyle = INK[1]; c.fillText('B' + tally(S.scores[1]), Uu(4.1), Uu(ty));
    tex.needsUpdate = true; T3.kick(200);
  }

  /* ---------- the running stroke: a ribbon along the same curve, revealed over ~0.3 s ---------- */
  const RSEG = 24, rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RSEG + 1) * 6), 3));
  { const I = []; for (let i = 0; i < RSEG; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } rg.setIndex(I); }
  const rm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const ribbon = new THREE.Mesh(rg, rm); ribbon.visible = false; ribbon.renderOrder = 3; nb.add(ribbon);
  function shape(st) {
    const P = rg.attributes.position;
    for (let i = 0; i <= RSEG; i++) {
      const k = i / RSEG, [x, z] = qpt(st, k), [x2, z2] = qpt(st, Math.min(1, k + .01)), [x0, z0] = qpt(st, Math.max(0, k - .01));
      const dx = x2 - x0, dz = z2 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * st.w / 2, nz = dx / l * st.w / 2;
      P.setXYZ(i * 2, x - PW / 2 + nx, PY + .002, z - PD / 2 + nz); P.setXYZ(i * 2 + 1, x - PW / 2 - nx, PY + .002, z - PD / 2 - nz);
    }
    P.needsUpdate = true; rg.computeBoundingSphere();
  }
  let anTok = 0;
  function animateLast() {
    const last = S.log[S.log.length - 1], e = last.e, pl = last.pl, my = ++anTok;
    paint(e);
    const st = strokeOf(geo(), e); shape(st); rm.color.set(INK[pl] || NEUTRAL); rg.setDrawRange(0, 0); ribbon.visible = true;
    const t0 = performance.now(), dur = 260;
    (function f(now) {
      if (my !== anTok) return;
      const k = Math.min(1, (now - t0) / dur); rg.setDrawRange(0, Math.ceil(k * RSEG) * 6); T3.kick(120);
      if (k < 1) return requestAnimationFrame(f);
      ribbon.visible = false; paint();
    })(t0);
  }
  /* ---------- hook: every board drawing of the page ---------- */
  const oRender = window.renderBoard;
  let lastKey = '';
  window.renderBoard = function (anim) {
    const r = oRender.apply(this, arguments);
    try {
      const key = S ? game.n + ':' + S.p.drawn.join('') + ':' + Array.from(S.by).join(',') + ':' + Array.from(S.owner).join(',') : '';
      if (anim && S && S.log.length && settings.anim) { lastKey = key; animateLast(); }
      else if (key !== lastKey) { lastKey = key; anTok++; ribbon.visible = false; paint(); }
    } catch (e) {}
    return r;
  };
  try { paint(); } catch (e) {}
})();
