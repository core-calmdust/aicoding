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
  let look = D.curLook ? D.curLook() : 'notebook', set = D.curSet ? D.curSet() : 'ballpoint';
  const INK = D.inkOf ? D.inkOf(set, look).slice() : [D.RED, D.BLUE], NEUTRAL0 = '#3c3f48';
  let NEUTRAL = D.dark && D.dark(look) ? '#c9ced6' : NEUTRAL0;

  const skin = AtlasSkin.init({
    board: boardEl,
    turn: false,   // 盤面反転: the notebook (spiral on top) isn't turned round — the ink on its page follows the turned 2D board
    pc: { vars: ['--board'] },   // PC: board + info column laid out from the 3D frame (AtlasSkin pcFit)
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

  /* ---------- the notebook: the board square's centre at the origin ---------- */
  const root = new THREE.Group(); let nb = D.board ? D.board(look, false) : D.notebook(false); root.add(nb);
  nb.position.set(PW / 2 - (BX0 + SQ / 2), 0, PD / 2 - (BZ0 + SQ / 2));
  let page = nb.userData.page;
  T3.show('dots', root, { still: true });
  skin.alignTo(SQ, PY);

  /* ---------- the page: cached paper + the ink of the shown position ---------- */
  // (a square power-of-two canvas, drawn with a vertical squash: WebGL would otherwise resize every upload)
  const s = T3.texScale(), CW = Math.round(2048 * s), CH = Math.round(CW * PD / PW), PH = CW, K = CW / PW, Uu = v => v * K;
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = PH;
  const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
  page.material = page.material.clone(); page.material.map = tex; page.material.needsUpdate = true;
  let paper = null, paperN = 0;
  // 盤面反転 (shared/flipbtn.js): the page draws its board turned round — the ink on the notebook follows it (the dots are symmetric)
  const flipOn3 = () => { try { return typeof flipOn === 'function' && !!flipOn(); } catch (e) { return false; } };
  const geo = () => { const n = game.n, W = n * U + 2 * M, F = flipOn3(); return { n, W, F, dot: (r, c) => { if (F) { r = n - r; c = n - c; } return [BX0 + (M + c * U) / W * SQ, BZ0 + (M + r * U) / W * SQ]; }, sp: U / W * SQ }; };
  function makePaper(gm) {
    const c = (paper = paper || document.createElement('canvas')).getContext('2d'); paper.width = CW; paper.height = PH; paperN = gm.n; c.setTransform(1, 0, 0, PH / CH, 0, 0);
    const dots = []; for (let r = 0; r <= gm.n; r++) for (let cc = 0; cc <= gm.n; cc++) dots.push(gm.dot(r, cc));
    D.surface(look, c, Uu, { dots, sp: gm.sp, z0: gm.dot(0, 0)[1], warm: true });
  }
  function strokeOf(gm, e) {   // the same hand-drawn line every time (seeded by the edge)
    let q = 7919 * (e + 1) + gm.n * 31; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const G = DotsEngine.geom(gm.n, gm.n), [r1, c1, r2, c2] = G.ed[e], a = .12, h = r1 === r2;
    let [x1, z1] = gm.dot(r1, c1), [x2, z2] = gm.dot(r2, c2);
    if (h) { x1 += a; x2 -= a; } else { z1 += a; z2 -= a; }
    if (rr() < .5) [x1, z1, x2, z2] = [x2, z2, x1, z1];
    const L = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / L, nz = (x2 - x1) / L, bow = (rr() - .5) * L * .06;
    return { x1, z1, x2, z2, cx: (x1 + x2) / 2 + nx * bow, cz: (z1 + z2) / 2 + nz * bow, w: D.strokeW ? D.strokeW(set) : .05, j: [(rr() - .5) * .03, (rr() - .5) * .03] };
  }
  const qpt = (st, k) => { const u = 1 - k; return [u * u * st.x1 + 2 * u * k * st.cx + k * k * st.x2, u * u * st.z1 + 2 * u * k * st.cz + k * k * st.z2]; };
  const inkStroke = (c, st, col) => D.stroke(set, c, st, col, Uu);   // (the chosen tool's line: atlas/models/dots.js)
  /* handwriting: the marker hand of the Latin marks, then handwritten webfonts for every other script
     (Kalam: Latin + Devanagari, Zen Kurenaido: kana/kanji, Nanum Pen Script: Hangul, Long Cang: hanzi, Aref Ruqaa: Arabic),
     so 「あ」「山」「나」「आ」「أ」 are scribbled like "AI" instead of falling back to a bold UI font */
  const HAND = '"Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE","Kalam","Zen Kurenaido","Nanum Pen Script","Long Cang","Aref Ruqaa",cursive';
  const LATIN = /^[\x20-\x7e -ɏ]*$/;
  const handFont = (txt, px) => LATIN.test(txt) ? `italic 700 ${px}px ${HAND}` : `400 ${px}px ${HAND}`;
  const fontWait = new Set();
  function needFont(f, txt) {   // a webfont not loaded yet: load it, then repaint once
    try { if (!document.fonts || document.fonts.check(f, txt)) return; } catch (e) { return; }
    const k = f + '|' + txt; if (fontWait.has(k)) return; fontWait.add(k);
    document.fonts.load(f, txt).then(() => { lastKey = ''; try { paint(); } catch (e) {} }, () => {});
  }
  // a non-Latin initial as a quick marker scrawl, like the "AI" marks: a round marker line dragged a little
  // along a chisel angle (uneven weight), an italic-like slant, a squash or stretch, uneven ink;
  // drawn on its own small canvas, then dropped into the box with a little turn / shift / size change (all seeded by the box)
  function scribble(c, ch, px, col, rr) {
    const S = Math.ceil(px * 2.4), o = document.createElement('canvas'); o.width = o.height = S; const g = o.getContext('2d');
    const sx = .88 + rr() * .22, sk = -.16 - rr() * .1, tip = px * (.018 + rr() * .012), ang = -.8 + (rr() - .5) * .5;
    g.translate(S / 2, S / 2); g.transform(sx, 0, sk, 1, 0, 0);
    const f = handFont(ch, px); needFont(f, ch);
    g.font = f; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = g.strokeStyle = col; g.lineJoin = g.lineCap = 'round'; g.lineWidth = px * .06;
    const dx = Math.cos(ang) * tip, dy = Math.sin(ang) * tip;
    for (let i = -2; i <= 2; i++) { const k = i / 2; g.strokeText(ch, dx * k, dy * k); g.fillText(ch, dx * k, dy * k); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in';   // ink: soft uneven density (about the .9 of the Latin marks)
    const n = 8, m = document.createElement('canvas'); m.width = m.height = n; const mg = m.getContext('2d'), id = mg.createImageData(n, n);
    for (let i = 0; i < n * n; i++) id.data[i * 4 + 3] = 255 * (.86 + rr() * .14);
    mg.putImageData(id, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(m, 0, 0, S, S);
    c.globalAlpha = 1; c.translate((rr() - .5) * px * .12, (rr() - .5) * px * .1); c.rotate((rr() - .5) * .3);
    const sc = .93 + rr() * .14; c.scale(sc, sc); c.drawImage(o, -S / 2, -S / 2);
  }
  function boxInk(c, gm, bx, o) {
    const r = Math.floor(bx / gm.n), cc = bx % gm.n, [px, pz] = gm.F ? gm.dot(r + 1, cc + 1) : gm.dot(r, cc), x0 = Uu(px), y0 = Uu(pz), sz = Uu(gm.sp), col = o === 2 ? NEUTRAL : INK[o];
    let q = 131 * (bx + 3); const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    D.boxMark(set, c, x0, y0, sz, col, rr, Uu, o === 2);
    if (o === 2) return;
    let ch = 'RB'[o]; try { ch = initial(o) || ch; } catch (e) {}
    const lat = LATIN.test(ch), hang = /[\u1100-\u11ff\uac00-\ud7af]/.test(ch), wide = !lat && /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(ch);   // kana / kanji fill the em: a little smaller (the pen Hangul is drawn small: larger)
    c.save(); c.translate(x0 + sz / 2, y0 + sz / 2 + Uu(.04));
    const fpx = Uu(Math.min(.95, gm.sp * (ch.length > 1 ? .36 : hang ? .62 : wide ? .46 : /[\u0900-\u097f]/.test(ch) ? .42 : .5)));
    if (!lat) { scribble(c, ch, fpx, col, rr); c.restore(); return; }
    c.rotate((rr() - .5) * .3); c.globalAlpha = .9; c.fillStyle = col;
    const f = handFont(ch, fpx); needFont(f, ch); c.font = f; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ch, 0, 0); c.restore();
  }
  function paint(skipE) {
    if (!S) return;
    const gm = geo(); if (!paper || paperN !== gm.n) makePaper(gm);
    const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(paper, 0, 0); c.setTransform(1, 0, 0, PH / CH, 0, 0);
    for (let b = 0; b < S.G.B; b++) if (S.owner[b] >= 0 && !(skipE >= 0 && S.log.length && S.log[S.log.length - 1].boxes.includes(b))) boxInk(c, gm, b, S.owner[b]);
    for (let e = 0; e < S.G.E; e++) if (S.p.drawn[e] && e !== skipE) inkStroke(c, strokeOf(gm, e), S.by[e] === 2 ? NEUTRAL : INK[S.by[e]]);
    const tally = k => k > 0 ? '  ' + 'I'.repeat(k).replace(/(IIIII)/g, '$1 ') : '';
    c.font = handFont('R', Uu(.32)); needFont(c.font, 'RBI'); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
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
      let ini = ''; try { ini = initial(0) + '|' + initial(1); } catch (e) {}   // (the initials too: a language switch rewrites them)
      const key = S ? ini + ':' + game.n + (flipOn3() ? 'f' : '') + ':' + S.p.drawn.join('') + ':' + Array.from(S.by).join(',') + ':' + Array.from(S.owner).join(',') : '';
      if (anim && S && S.log.length && settings.anim) { lastKey = key; animateLast(); }
      else if (key !== lastKey) { lastKey = key; anTok++; ribbon.visible = false; paint(); }
    } catch (e) {}
    return r;
  };
  try { paint(); } catch (e) {}
  // デザイン: "3D board" first in the board row, or one of the game's own 2D boards (shown as the plain 2D page)
  // 3D の盤・駒 (2026-11-15): another surface → a new board in the same place (the page re-painted); other tools → the ink re-drawn
  function swapBoard() {
    look = D.curLook(); const ink = D.inkOf(set, look); INK[0] = ink[0]; INK[1] = ink[1]; NEUTRAL = D.dark(look) ? '#c9ced6' : NEUTRAL0;
    const pos = nb.position.clone(); nb.remove(ribbon); root.remove(nb); nb = D.board(look, false); nb.position.copy(pos); root.add(nb); nb.add(ribbon);
    page = nb.userData.page; page.material = page.material.clone(); page.material.map = tex; page.material.needsUpdate = true;
    paper = null; lastKey = ''; try { paint(); } catch (e) {} T3.kick(800);
  }
  function swapTools() { set = D.curSet(); const ink = D.inkOf(set, look); INK[0] = ink[0]; INK[1] = ink[1]; lastKey = ''; try { paint(); } catch (e) {} }
  const V = skin.view ? skin.view({ key: 'atlas-dots-view', row: document.getElementById('skRow'), img: '../images/atlas/dots.webp', cls: ['atlas-dots'] }) : null;
  { const r1 = document.getElementById('skRow'), h = r1 && (r1.closest('.field') || r1.parentNode), is3 = () => (V && V.is3d ? V.is3d() : true), on3 = () => { if (V && V.set && !is3()) V.set(true); };
    const R3 = AtlasSkin.rows3d && h && D.board ? AtlasSkin.rows3d({ id: 'dots', host: h, is3, p3: { ja: '3D筆記具', en: '3D pens', zh: '3D笔', 'zh-TW': '3D筆', ko: '3D 필기구', es: 'Útiles 3D', fr: 'Stylos 3D', pt: 'Canetas 3D', de: '3D-Stifte', hi: '3D पेन', ar: 'أقلام ثلاثية الأبعاد', ru: '3D-ручки', id: 'Alat tulis 3D', tr: '3D kalemler' }, board: () => { on3(); swapBoard(); }, piece: () => { on3(); swapTools(); } }) : null;
    if (R3 && r1) r1.addEventListener('click', () => setTimeout(() => R3.paint(), 0)); }
})();
