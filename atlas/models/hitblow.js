/* =====================================================================
   ヒット＆ブロー on the 3D table (2026-11-16, user: 3Dのゲームとして実装、2Dは廃止 · ミッドナイトベース).
   Six boards (SKINS, Table3D.BOARDS.hitblow): "Midnight" (the default) — a slab of deep-blue lacquer with a neon glass rim, the rows of round sockets drilled in it,
   the row numbers and the 2×2 answer pins beside each row; at the far end a jewel case holds the hidden code under a lid
   marked ？ (it opens when the game ends).
   Pieces: glass cabochons with a picture inside (炎 · 稲妻 · 葉 · しずく · 月 · ハート · 星 · 結晶) — or a digit for the
   ナンバー 種目. Answer pins: ヒット = yellow-green, ブロー = white.
   Registers into Table3D:
     Table3D.MODELS.hitblow(live)   the showcase board (a race half played) unless live
     Table3D.hitblow = { board(cfg) → Group, gem(kind, v) → Group, pin(hit) → Mesh, ICONS, COLORS, DIGIT, R, TOP }
   board(cfg) userData: { cfg, rows, slot(row, k) → [x, z] (row 0 = the first row, under the case), pinPos(row, k) → [x, z],
     caseSlot(k) → [x, y, z], lid (the lid's hinge Group), rowZ(row), rowMark(row, who) (who 0 / 1 / 2 = ghost), active(row),
     W, L, top, pitch, sock (the socket radius) }
   Units: one socket pitch is 1.0; the board's top is at y = TOP.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const TOP = .42, R = .36, PITCH = 1, ROWP = .92, PIN = .1;
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const geos = {}, geo = (k, f) => geos[k + (LO() ? 'l' : 'h')] || (geos[k + (LO() ? 'l' : 'h')] = (g => { if (X.share) X.share(g); return g; })(f()));

  // the pictures inside the colour gems (24×24, also drawn in the page's palette — atlas/games/hitblow.js)
  const ICONS = [
    'M12 2.6c.7 3.4 4.4 5.1 4.4 9.6a4.4 4.4 0 0 1-8.8 0c0-2 .9-3.3 2.1-4.4-.1 1.8.6 2.9 1.8 3.2-.6-2.8-.2-5.7.5-8.4z',   // 0 炎
    'M13.6 2 5 13.4h6.1L10 22l9-12.6h-6.2z',                                                                                   // 1 稲妻
    'M19.5 4.5C10 4.6 4.6 9.8 4.6 18.6c.1.5.4.8.9.9C14.2 19.5 19.4 14 19.5 4.5zM5.6 18.4c3-4.4 6.4-7.6 10.2-9.6',            // 2 葉
    'M12 2.4c3.6 4.7 6.6 8.4 6.6 12.1a6.6 6.6 0 0 1-13.2 0c0-3.7 3-7.4 6.6-12.1z',                                          // 3 しずく
    'M15.2 2.8a9 9 0 1 0 6 15.4 7.4 7.4 0 0 1-6-15.4z',                                                                      // 4 月
    'M12 20.6 4.3 13a4.7 4.7 0 0 1 6.6-6.6L12 7.5l1.1-1.1a4.7 4.7 0 0 1 6.6 6.6z',                                          // 5 ハート
    'M12 2.6l2.8 5.8 6.3.8-4.6 4.3 1.2 6.3L12 16.8l-5.7 3 1.2-6.3-4.6-4.3 6.3-.8z',                                         // 6 星
    'M12 2.4 19.6 9 12 21.6 4.4 9zM4.4 9h15.2M9 9l3 12.6L15 9M8.6 2.9 9 9M15.4 2.9 15 9',                                    // 7 結晶
  ];
  const STROKE = [false, false, true, false, false, false, false, true];   // (leaf, crystal: their veins / facets are lines)
  const COLORS = ['#ff4f5e', '#ffcc33', '#3fd97a', '#3ea0ff', '#a97cff', '#ff76c4', '#ff9940', '#38e0e6'];
  // the ナンバー gems: clear glass tinted per digit, the digit inside
  const DIGIT = ['#9fb3ff', '#ff6b7a', '#ffb347', '#ffe066', '#7ee08a', '#4fd6c8', '#58a8ff', '#a48bff', '#ff8fd8', '#e8edf7'];
  const HIT = '#ff5aa8', BLOW = '#f4f7ff';   // (hit: pink — 2026-11-17 user: 今の色だと見づらいのでピンクと白で)

  /* ---------- the gem's face: a planar picture seen from above (colour, depth, the picture, a soft inner light) ---------- */
  function gemTex(kind, v) {
    const key = 'hbGem' + kind + v;
    return X.canvasTex(key, 256, 256, (c, W) => {
      const col = kind === 'num' ? DIGIT[v] : COLORS[v];
      const g = c.createRadialGradient(W * .42, W * .38, W * .04, W * .5, W * .5, W * .52);
      g.addColorStop(0, mix(col, '#ffffff', .55)); g.addColorStop(.38, col); g.addColorStop(.86, mix(col, '#050817', .55)); g.addColorStop(1, mix(col, '#050817', .75));
      c.fillStyle = g; c.fillRect(0, 0, W, W);
      // an inner ring of light (the glass's edge seen through it)
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = W * .02; c.beginPath(); c.arc(W / 2, W / 2, W * .46, 0, 7); c.stroke();
      c.save(); c.translate(W / 2, W / 2);
      if (kind === 'num') {
        c.font = `800 ${W * .66}px "Outfit", "Zen Kaku Gothic New", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineJoin = 'round'; c.strokeStyle = 'rgba(10,8,30,.55)'; c.lineWidth = W * .07; c.strokeText(String(v), 0, W * .03);   // (a dark edge: the digit reads under any light, 2026-11-16)
        c.shadowColor = 'rgba(255,255,255,.6)'; c.shadowBlur = W * .03; c.fillStyle = '#ffffff'; c.fillText(String(v), 0, W * .03);
        c.shadowBlur = 0;
      } else {
        const s = W * .64 / 24; c.scale(s, s); c.translate(-12, -12.2);   // (2026-11-16 user: 柄は大きめに)
        const p = new Path2D(ICONS[v]);
        c.lineJoin = c.lineCap = 'round'; c.strokeStyle = 'rgba(10,8,30,.35)'; c.lineWidth = 2.6; c.stroke(p);   // (a soft dark edge: the picture reads on every colour)
        c.shadowColor = 'rgba(255,255,255,.95)'; c.shadowBlur = 9;
        if (STROKE[v]) { c.strokeStyle = 'rgba(255,255,255,.96)'; c.lineWidth = 1.9; c.lineJoin = c.lineCap = 'round'; c.fillStyle = 'rgba(255,255,255,.32)'; c.fill(p); c.stroke(p); }
        else { c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(p); }
      }
      c.restore();
    });
  }
  function mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, '0')).join(''); }
  const gemMat = (kind, v) => mat('gem' + kind + v, () => {
    const tx = gemTex(kind, v);
    const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .78, roughness: .34, clearcoat: .35, clearcoatRoughness: .35, bump: false, envMapIntensity: .35 });   // (2026-11-16 user: the same in every room)
    m.emissive.set(0xffffff); return m;
  });
  // the cabochon: a low dome (lathe) whose UVs are projected from above — the picture sits flat on its face
  function domeGeo() {
    return geo('hbDome', () => {
      const TT = T(), pts = [], n = LO() ? 5 : 6, H = R * .82;
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new TT.Vector2(Math.cos(a) * R, Math.sin(a) * H)); }
      pts.unshift(new TT.Vector2(R * .9, -R * .14)); pts.unshift(new TT.Vector2(0.001, -R * .14));   // (bottom → top: the faces look outward)
      const gl = new TT.LatheGeometry(pts, LO() ? 16 : 20), P = gl.attributes.position, uv = gl.attributes.uv;
      for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (2 * R) * .98, .5 - P.getZ(i) / (2 * R) * .98);
      uv.needsUpdate = true; gl.computeVertexNormals(); return gl;
    });
  }
  /* ---------- the pieces of each board (2026-11-17 user: 駒もそれぞれに合ったものを) — the colours and the pictures stay
     (they are the code), the thing they are made of changes: midnight · glass cabochons; casino · poker chips; doodle · matte
     clay buttons with a felt-pen picture; fruit · a fruit for each colour with a sticker on it; cipher · typewriter keys with
     a brass rim; vault · anodised metal knobs on a chrome collar. All sit in the same holes (base at y = −0.14 R). */
  const colOf = (kind, v) => kind === 'num' ? DIGIT[v] : COLORS[v];
  function icon(c, W, kind, v, o) {   // the picture (or the digit) at the face's centre: o = { fill, edge, ew, glow, k (size), dx, dy }
    c.save(); c.translate(W / 2 + (o.dx || 0) * W, W / 2 + (o.dy || 0) * W);
    if (kind === 'num') {
      o = Object.assign({}, o, { k: o.kn || Math.min(1.05, (o.k || 1) * 1.35) });   // (the digits larger than the pictures: they were too small to read, 2026-11-17 user)
      c.font = o.font ? o.font(W * .62 * (o.k || 1)) : `800 ${W * .62 * (o.k || 1)}px "Outfit", "Zen Kaku Gothic New", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      if (o.edge) { c.strokeStyle = o.edge; c.lineWidth = W * (o.ew || .07); c.strokeText(String(v), 0, W * .03 * (o.k || 1)); }
      if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = W * .03; } c.fillStyle = o.fill; c.fillText(String(v), 0, W * .03 * (o.k || 1));
    } else {
      const sc = W * .6 * (o.k || 1) / 24; c.scale(sc, sc); c.translate(-12, -12.2); const p = new Path2D(ICONS[v]); c.lineJoin = c.lineCap = 'round';
      if (o.edge) { c.strokeStyle = o.edge; c.lineWidth = (o.ew || .1) * 26; c.stroke(p); }
      if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = 8; }
      if (STROKE[v]) { c.strokeStyle = o.fill; c.lineWidth = 2; c.globalAlpha = .35; c.fillStyle = o.fill; c.fill(p); c.globalAlpha = 1; c.stroke(p); } else { c.fillStyle = o.fill; c.fill(p); }
    }
    c.restore();
  }
  const FACE = {
    casino(c, W, kind, v) { const col = colOf(kind, v); c.fillStyle = mix(col, '#000000', .12); c.fillRect(0, 0, W, W);
      c.fillStyle = '#fbf6ea'; for (let i = 0; i < 8; i++) { c.save(); c.translate(W / 2, W / 2); c.rotate(i / 8 * Math.PI * 2); c.fillRect(W * .38, -W * .055, W * .12, W * .11); c.restore(); }
      c.fillStyle = mix(col, '#000000', .05); c.beginPath(); c.arc(W / 2, W / 2, W * .33, 0, 7); c.fill();
      c.strokeStyle = '#fbf6ea'; c.lineWidth = W * .022; c.setLineDash([W * .05, W * .035]); c.beginPath(); c.arc(W / 2, W / 2, W * .33, 0, 7); c.stroke(); c.setLineDash([]);
      icon(c, W, kind, v, { fill: '#ffffff', edge: 'rgba(0,0,0,.5)', ew: .12, k: .72, kn: .85 }); },
    // 落書き: a coin of card with white paper glued on — a felt-pen blob of the colour, the picture on it (2026-11-17 user: コイン状で段ボールに白い紙を貼ったような)
    doodle(c, W, kind, v) { const col = colOf(kind, v), R2 = rnd(41 + v * 7); c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, W, W);
      for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(120,100,60,.06)'; c.fillRect(R2() * W, R2() * W, 2, 2); }
      c.fillStyle = col; c.beginPath(); for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, r = W * (.41 + (R2() - .5) * .035); i ? c.lineTo(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r) : c.moveTo(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r); } c.closePath(); c.fill();
      c.strokeStyle = mix(col, '#000000', .2); c.lineWidth = W * .016; c.globalAlpha = .55; for (let i = 0; i < 9; i++) { const y = W * (.22 + i * .07); c.beginPath(); c.moveTo(W * .2 + R2() * 8, y + R2() * 4); c.lineTo(W * .8 - R2() * 8, y + W * .03 + R2() * 4); c.stroke(); } c.globalAlpha = 1;
      pencilCircle(c, W / 2, W / 2, W * .43, R2, 'rgba(25,25,30,.9)', W * .028, 1.1);
      icon(c, W, kind, v, { fill: '#ffffff', edge: 'rgba(20,20,25,.95)', ew: .13, k: .7, font: px => `700 ${px * 1.05}px "Comic Sans MS","Chalkboard SE","Marker Felt",cursive` }); },   // (digits by hand too, 2026-11-17 user)
    // くだもの: the fruit's skin seen from above (its own pattern), a small sticker with the picture in front
    // くだもの: a token with the fruit drawn flat (2026-11-17 user: 上から見たら何かわからない → 2D風で), its picture or digit on a badge
    fruit(c, W, kind, v) { const col = colOf(kind, v), F = FRUIT_OF(kind, v);
      const bg = c.createRadialGradient(W * .45, W * .4, W * .05, W * .5, W * .5, W * .55); bg.addColorStop(0, '#fffaf0'); bg.addColorStop(1, mix(col, '#fff3dc', .78)); c.fillStyle = bg; c.fillRect(0, 0, W, W);
      c.strokeStyle = col; c.lineWidth = W * .035; c.beginPath(); c.arc(W / 2, W / 2, W * .455, 0, 7); c.stroke();
      c.save(); c.translate(W * .5, W * .47); FRUIT2D[F](c, W * .62, col); c.restore();
      const big = kind === 'num', bx = W * (big ? .7 : .72), by = W * (big ? .7 : .72), br = W * (big ? .22 : .14); c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.arc(bx + 2, by + 3, br, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill(); c.strokeStyle = col; c.lineWidth = W * .018; c.stroke();
      icon(c, W, kind, v, { fill: mix(col, '#000000', .25), k: .3, kn: .6, dx: .2, dy: .2 }); },
    // 暗号機: an old typewriter key — a printed paper label under a glass, in a nickel ring with a dark bezel; aged and a bit sepia
    cipher(c, W, kind, v) { const col = mix(colOf(kind, v), '#8a6a3a', .16), R2 = rnd(61 + v);
      const g = c.createRadialGradient(W * .45, W * .42, W * .02, W * .5, W * .5, W * .44); g.addColorStop(0, mix(col, '#f4e6c4', .25)); g.addColorStop(1, mix(col, '#3a2a14', .35)); c.fillStyle = g; c.fillRect(0, 0, W, W);
      for (let i = 0; i < 900; i++) { c.fillStyle = R2() < .5 ? 'rgba(60,40,10,.07)' : 'rgba(255,245,220,.06)'; c.fillRect(R2() * W, R2() * W, 1.5, 1.5); }
      c.strokeStyle = 'rgba(240,226,190,.75)'; c.lineWidth = W * .012; c.beginPath(); c.arc(W / 2, W / 2, W * .36, 0, 7); c.stroke();
      icon(c, W, kind, v, { fill: '#f6ecd2', edge: 'rgba(40,25,8,.7)', ew: .12, k: .68, kn: .85 });
      const v2 = c.createRadialGradient(W / 2, W / 2, W * .25, W / 2, W / 2, W * .45); v2.addColorStop(0, 'rgba(60,40,10,0)'); v2.addColorStop(1, 'rgba(60,40,10,.35)'); c.fillStyle = v2; c.fillRect(0, 0, W, W);
      c.fillStyle = '#121110'; c.beginPath(); c.arc(W / 2, W / 2, W * .5, 0, 7); c.arc(W / 2, W / 2, W * .43, 0, 7, true); c.fill(); },
    // 金庫: the table of a cut jewel — the colour deep in the stone, the picture etched light
    vault(c, W, kind, v) { const col = colOf(kind, v), g = c.createRadialGradient(W * .45, W * .4, W * .02, W * .5, W * .5, W * .55); g.addColorStop(0, mix(col, '#ffffff', .55)); g.addColorStop(.5, col); g.addColorStop(1, mix(col, '#000000', .45)); c.fillStyle = g; c.fillRect(0, 0, W, W);
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = W * .01; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(W / 2 + Math.cos(a) * W * .6, W / 2 + Math.sin(a) * W * .6); c.stroke(); }
      icon(c, W, kind, v, { fill: 'rgba(255,255,255,.95)', edge: mix(col, '#000000', .6), ew: .12, k: .7, kn: 1.0, glow: 'rgba(255,255,255,.7)' }); },
  };
  const shade = (col, k) => mix(col, k > 0 ? '#ffffff' : '#200808', Math.abs(k));
  const blob = (c, s, col, path) => { const g = c.createRadialGradient(-s * .15, -s * .18, s * .04, 0, 0, s * .6); g.addColorStop(0, shade(col, .5)); g.addColorStop(.55, col); g.addColorStop(1, shade(col, -.35)); c.fillStyle = g; path(); c.fill(); c.strokeStyle = shade(col, -.5); c.lineWidth = s * .03; c.stroke(); };
  const leaf2 = (c, x, y, s, a) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#5bb547'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * .25, -s * .2, s * .5, 0); c.quadraticCurveTo(s * .25, s * .2, 0, 0); c.fill(); c.strokeStyle = '#2f7a2a'; c.lineWidth = s * .03; c.stroke(); c.beginPath(); c.moveTo(0, 0); c.lineTo(s * .45, 0); c.stroke(); c.restore(); };
  const stem2 = (c, x0, y0, x1, y1, s) => { c.strokeStyle = '#6b4524'; c.lineWidth = s * .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + s * .05, (y0 + y1) / 2, x1, y1); c.stroke(); };
  const shine = (c, x, y, w, h) => { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x, y, w, h, -.5, 0, 7); c.fill(); };
  const FRUIT2D = {
    apple(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.moveTo(0, -s * .3); c.bezierCurveTo(s * .25, -s * .48, s * .56, -s * .35, s * .5, s * .05); c.bezierCurveTo(s * .45, s * .4, s * .2, s * .52, 0, s * .42); c.bezierCurveTo(-s * .2, s * .52, -s * .45, s * .4, -s * .5, s * .05); c.bezierCurveTo(-s * .56, -s * .35, -s * .25, -s * .48, 0, -s * .3); c.closePath(); }); stem2(c, 0, -s * .28, s * .05, -s * .52, s); leaf2(c, s * .04, -s * .45, s * .5, -.4); shine(c, -s * .25, -s * .1, s * .08, s * .14); },
    lemon(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.moveTo(-s * .55, 0); c.quadraticCurveTo(-s * .48, -s * .4, 0, -s * .36); c.quadraticCurveTo(s * .48, -s * .4, s * .55, 0); c.quadraticCurveTo(s * .48, s * .4, 0, s * .36); c.quadraticCurveTo(-s * .48, s * .4, -s * .55, 0); c.closePath(); }); leaf2(c, -s * .1, -s * .33, s * .45, -2.6); shine(c, -s * .2, -s * .14, s * .14, s * .06); },
    melon(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.arc(0, s * .03, s * .46, 0, 7); }); c.save(); c.beginPath(); c.arc(0, s * .03, s * .44, 0, 7); c.clip(); c.strokeStyle = 'rgba(255,255,235,.7)'; c.lineWidth = s * .025; const R2 = rnd(77); for (let i = 0; i < 16; i++) { c.beginPath(); let x = (R2() - .5) * s, y = (R2() - .5) * s; c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R2() - .5) * s * .3; y += (R2() - .5) * s * .3; c.lineTo(x, y); } c.stroke(); } c.restore(); c.strokeStyle = '#6b4524'; c.lineWidth = s * .06; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -s * .42); c.lineTo(0, -s * .56); c.moveTo(-s * .12, -s * .56); c.lineTo(s * .12, -s * .56); c.stroke(); },
    blueberry(c, s, col) { [[-.2, .12], [.22, .14], [0, -.16]].forEach(([x, y]) => { c.save(); c.translate(x * s, y * s); blob(c, s * .62, col, () => { c.beginPath(); c.arc(0, 0, s * .25, 0, 7); }); c.fillStyle = shade(col, -.55); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * s * .08, Math.sin(a) * s * .08); c.lineTo(Math.cos(a + .6) * s * .03, Math.sin(a + .6) * s * .03); c.fill(); } shine(c, -s * .1, -s * .1, s * .05, s * .03); c.restore(); }); leaf2(c, s * .05, -s * .38, s * .4, -.6); },
    grape(c, s, col) { stem2(c, 0, -s * .38, s * .06, -s * .56, s); leaf2(c, s * .05, -s * .45, s * .45, -.3); [[0, -.28], [-.18, -.28], [.18, -.28], [-.27, -.06], [-.09, -.06], [.09, -.06], [.27, -.06], [-.18, .16], [0, .16], [.18, .16], [-.09, .36], [.09, .36]].forEach(([x, y]) => { c.save(); c.translate(x * s, y * s); blob(c, s * .5, col, () => { c.beginPath(); c.arc(0, 0, s * .11, 0, 7); }); shine(c, -s * .04, -s * .04, s * .03, s * .02); c.restore(); }); },
    peach(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.moveTo(0, -s * .32); c.bezierCurveTo(s * .55, -s * .5, s * .62, s * .2, 0, s * .45); c.bezierCurveTo(-s * .62, s * .2, -s * .55, -s * .5, 0, -s * .32); c.closePath(); }); c.strokeStyle = shade(col, -.35); c.lineWidth = s * .03; c.beginPath(); c.moveTo(0, -s * .3); c.quadraticCurveTo(-s * .12, s * .05, 0, s * .42); c.stroke(); const f = c.createRadialGradient(s * .2, -s * .1, 0, s * .2, -s * .1, s * .35); f.addColorStop(0, 'rgba(255,230,120,.45)'); f.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = f; c.fillRect(-s * .5, -s * .5, s, s); leaf2(c, s * .02, -s * .32, s * .42, -.5); leaf2(c, -s * .02, -s * .32, s * .4, -2.7); },
    orange(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.arc(0, s * .02, s * .46, 0, 7); }); const R2 = rnd(91); c.fillStyle = shade(col, -.25); for (let i = 0; i < 60; i++) { const a = R2() * 7, r = Math.sqrt(R2()) * s * .42; c.beginPath(); c.arc(Math.cos(a) * r, s * .02 + Math.sin(a) * r, s * .012, 0, 7); c.fill(); } c.fillStyle = '#4c9a36'; c.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k / 5 * Math.PI * 2; c.lineTo(Math.cos(a) * s * .08, -s * .4 + Math.sin(a) * s * .05); c.lineTo(Math.cos(a + .6) * s * .03, -s * .4 + Math.sin(a + .6) * s * .02); } c.fill(); leaf2(c, s * .04, -s * .42, s * .42, -.4); shine(c, -s * .2, -s * .12, s * .1, s * .06); },
    pear(c, s, col) { blob(c, s, col, () => { c.beginPath(); c.moveTo(0, -s * .42); c.bezierCurveTo(s * .16, -s * .42, s * .18, -s * .18, s * .28, -s * .02); c.bezierCurveTo(s * .5, s * .22, s * .38, s * .5, 0, s * .5); c.bezierCurveTo(-s * .38, s * .5, -s * .5, s * .22, -s * .28, -s * .02); c.bezierCurveTo(-s * .18, -s * .18, -s * .16, -s * .42, 0, -s * .42); c.closePath(); }); stem2(c, 0, -s * .4, s * .06, -s * .58, s); leaf2(c, s * .04, -s * .5, s * .4, -.3); shine(c, -s * .14, s * .1, s * .06, s * .12); },
  };
  const FRUITS_BY = ['apple', 'lemon', 'melon', 'blueberry', 'grape', 'peach', 'orange', 'pear'];   // by colour: 赤・黄・緑・青・紫・ピンク・橙・水色
  const FRUITS_NUM = ['blueberry', 'apple', 'orange', 'lemon', 'melon', 'pear', 'blueberry', 'grape', 'peach', 'peach'];   // the digits' tints: 0 藤 · 1 赤 · 2 橙 · 3 黄 · 4 緑 · 5 青緑 · 6 青 · 7 紫 · 8 ピンク · 9 白（白桃）
  const FRUIT_OF = (kind, v) => kind === 'num' ? FRUITS_NUM[v] : FRUITS_BY[v % 8];
  const faceMat = (look, kind, v, o) => mat('gem' + look + kind + v, () => {
    const tx = X.canvasTex('hbGem' + look + kind + v, 256, 256, (c, W) => FACE[look](c, W, kind, v));
    const m = X.M(Object.assign({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .6, roughness: .5, bump: false, envMapIntensity: .3 }, o)); m.emissive.set(0xffffff); return m;
  });
  const cardSideTex = () => X.canvasTex('hbCardSideT', 256, 32, (c, W, H) => { H = H || 32; c.fillStyle = '#c69a5c'; c.fillRect(0, 0, W, H); c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, W, H * .2); c.strokeStyle = '#8a6430'; c.lineWidth = 1.5; c.beginPath(); for (let x = 0; x <= W; x += 2) c.lineTo(x, H * .58 + Math.sin(x * .35) * H * .2); c.stroke(); c.fillStyle = '#b8894a'; c.fillRect(0, H * .22, W, 1.5); c.fillRect(0, H * .92, W, 2); });
  const sparkTex = () => X.canvasTex('hbSparkT', 128, 128, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,255,255,.75)'); g.addColorStop(.35, 'rgba(200,230,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W);
    c.save(); c.translate(W / 2, W / 2); [[0, 1, .5], [Math.PI / 2, 1, .5], [Math.PI / 4, .55, .25], [-Math.PI / 4, .55, .25]].forEach(([a, l, w]) => { c.save(); c.rotate(a); const gl = c.createLinearGradient(-W / 2 * l, 0, W / 2 * l, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.5, 'rgba(255,255,255,1)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gl; c.beginPath(); c.ellipse(0, 0, W / 2 * l, W * .02 * w * 2, 0, 0, 7); c.fill(); c.restore(); }); c.restore(); });
  const fireTex = () => X.canvasTex('hbFireT', 64, 64, (c, W) => { const R2 = rnd(97); for (let y = 0; y < W; y += 4) for (let x = 0; x < W; x += 4) { const h = Math.floor(R2() * 360), on = R2() < .35; c.fillStyle = on ? `hsla(${h},100%,65%,${(.4 + R2() * .6).toFixed(2)})` : 'rgba(0,0,0,0)'; c.fillRect(x, y, 4, 4); } });
  const PIECE_GEO = {
    chipSide: () => geo('hbChipS', () => { const c = new (T().CylinderGeometry)(R * .96, R * .96, R * .5, LO() ? 16 : 22, 1, true); c.translate(0, -R * .14 + R * .25, 0); return c; }),
    disc: (r, y, k) => geo('hbDisc' + k, () => { const c = new (T().CircleGeometry)(r, LO() ? 16 : 22); c.rotateX(-Math.PI / 2); c.translate(0, y, 0); return c; }),
    round: () => geo('hbRound', () => { const q = new (T().SphereGeometry)(R * .66, LO() ? 10 : 14, LO() ? 7 : 9); q.translate(0, R * .66 - R * .14, 0); const P = q.attributes.position, uv = q.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (2 * R * .66) * .98, .5 - P.getZ(i) / (2 * R * .66) * .98); uv.needsUpdate = true; return q; }),
    pear: () => geo('hbPear', () => { const TT = T(), pts = [[.001, 0], [.42, .03], [.64, .17], [.69, .36], [.62, .55], [.47, .72], [.37, .9], [.31, 1.05], [.23, 1.19], [.09, 1.29], [.001, 1.31]].map(([x, y]) => new TT.Vector2(x * R, -R * .14 + y * R)); const gl = new TT.LatheGeometry(pts, LO() ? 12 : 16), P = gl.attributes.position, uv = gl.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (1.4 * R) * .98, .5 - P.getZ(i) / (1.4 * R) * .98); uv.needsUpdate = true; gl.computeVertexNormals(); return gl; }),
    // a round brilliant (2026-11-17 user: ブリリアントカットの宝石っぽく): table · 8 star facets · 8 bezels · 16 upper girdle facets · girdle ·
    // 16 lower girdle and 8 pavilion mains to the culet — flat triangles, so each facet catches the light on its own
    // a diamond's round brilliant (2026-11-17 user: カットをダイアモンドっぽく), in its usual proportions (table 56% of the width, crown
    // ~16%, a thin girdle, a deep pavilion): an octagonal table; 8 star facets; 8 kite bezels; 16 upper girdle facets on a girdle round
    // to 32 points; the pavilion's 8 mains and 16 lower girdle facets down to the culet. Each facet is flat and tilted its own way —
    // the stars shallower, the upper girdles steeper — so the light breaks up across the crown as a diamond's does.
    jewel: () => geo('hbDiamond2', () => {
      const TT = T(), N = 8, d = Math.PI / N, P = [], tri = (a, b, c) => P.push(...a, ...b, ...c), at = (r, y, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
      const rG = R * .97, yG = R * .14, yGb = R * .08, rT = R * .55, yT = R * .47, rS = R * .76, yS = R * .37, yC = -R * .14, rL = R * .52, yL = -R * .02;
      const G = k => at(rG, yG, k * d / 2), Gb = k => at(rG, yGb, k * d / 2);   // girdle: 32 points (k = 0..31), main facets at k = 4i
      for (let i = 0; i < N; i++) {
        const a = i * 2 * d, T0 = at(rT, yT, a), T1 = at(rT, yT, a + 2 * d), S = at(rS, yS, a + d), Sp = at(rS, yS, a - d), cT = [0, yT, 0], k0 = i * 4;
        tri(cT, T1, T0);                                           // the table
        tri(T0, T1, S);                                            // star facet
        tri(T0, S, G(k0)); tri(T0, G(k0), Sp);                     // the bezel kite (T0 · S · girdle main · previous star)
        tri(S, G(k0 + 1), G(k0)); tri(S, G(k0 + 2), G(k0 + 1));    // upper girdle facets, two per side of the star, the girdle round
        tri(S, G(k0 + 3), G(k0 + 2)); tri(S, G(k0 + 4), G(k0 + 3));
        for (let k = k0; k < k0 + 4; k++) { const A = G(k), B = G(k + 1), C = Gb(k), D = Gb(k + 1); tri(A, B, D); tri(A, D, C); }   // the girdle band
        const L = at(rL, yL, a + d), cul = [0, yC, 0];            // pavilion: lower girdle facets to a point half way, the mains to the culet
        tri(Gb(k0), Gb(k0 + 1), L); tri(Gb(k0 + 1), Gb(k0 + 2), L); tri(Gb(k0 + 2), Gb(k0 + 3), L); tri(Gb(k0 + 3), Gb(k0 + 4), L);
        tri(L, Gb(k0 + 4), cul); tri(Gb(k0), L, cul);
      }
      const gl = new TT.BufferGeometry(); gl.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); const U = [], h = rnd(131); for (let t = 0; t < P.length / 9; t++) { const u = h(), v = h(); U.push(u, v, u, v, u, v); }   /* (one texel per facet: the fire tints whole facets, not streaks) */ gl.setAttribute('uv', new TT.Float32BufferAttribute(U, 2)); gl.computeVertexNormals(); return gl; }),
    coinSide: (r, h) => geo('hbCoinSide' + r.toFixed(3), () => { const c = new (T().CylinderGeometry)(r, r, h, LO() ? 16 : 22, 1, true); c.translate(0, -R * .14 + h / 2, 0); return c; }),
    fruit: () => geo('hbFruit', () => {   // a squat sphere with a dimple at the stem; UVs from above (the face's picture)
      const TT = T(), Rf = R * .92, k = .78, pts = [], n = LO() ? 6 : 8;
      for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI, x = Math.max(.001, Math.cos(a) * Rf), y = -R * .14 + (Math.sin(a) + 1) * Rf * k; pts.push(new TT.Vector2(x, i === n ? y - Rf * .05 : y)); }
      const gl = new TT.LatheGeometry(pts, LO() ? 14 : 18), P = gl.attributes.position, uv = gl.attributes.uv;
      for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (2 * Rf) * .98, .5 - P.getZ(i) / (2 * Rf) * .98);
      uv.needsUpdate = true; gl.computeVertexNormals(); return gl; }),
  };
  function gem(kind, v, look) {
    const TT = T(), g = new TT.Group(); look = lookNow(look);
    let h = R * .82;
    if (look === 'casino') {   // a poker chip: edge stripes on the side, the picture on the face
      const side = X.mesh(PIECE_GEO.chipSide(), mat('hbChipSM' + kind + v, () => { const tx = X.canvasTex('hbChipSide' + kind + v, 256, 32, (c, W, H) => { H = H || 32; c.fillStyle = mix(colOf(kind, v), '#000000', .12); c.fillRect(0, 0, W, H); c.fillStyle = '#fbf6ea'; for (let i = 0; i < 8; i++) c.fillRect(i * W / 8 + W / 32, 0, W / 16, H); }); const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .3, roughness: .55, bump: false }); m.emissive.set(0xffffff); return m; }));
      const top = X.mesh(PIECE_GEO.disc(R * .96, -R * .14 + R * .5, 'chip'), faceMat('casino', kind, v, { roughness: .45, emissiveIntensity: .34 }));
      side.castShadow = top.castShadow = true; g.add(side, top); h = R * .36;
    } else if (look === 'fruit') {   // a round wooden token with the fruit drawn on it (2026-11-17 user: 2D風の表示で)
      const col = colOf(kind, v);
      const side = X.mesh(PIECE_GEO.coinSide(R * .93, R * .36), mat('hbFruitSide' + kind + v, () => X.M({ color: mix(col, '#ffffff', .25), roughness: .55, bump: false })));
      const lip = X.mesh(geo('hbFruitLip', () => { const c = new TT.TorusGeometry(R * .9, R * .04, 4, LO() ? 16 : 22); c.rotateX(Math.PI / 2); c.translate(0, -R * .14 + R * .36, 0); return c; }), mat('hbFruitLipM' + kind + v, () => X.M({ color: mix(col, '#ffffff', .4), roughness: .45, bump: false })));
      const top = X.mesh(PIECE_GEO.disc(R * .93, -R * .14 + R * .36 + .002, 'fruitT'), faceMat('fruit', kind, v, { roughness: .5, emissiveIntensity: .45 }));
      side.castShadow = top.castShadow = true; g.add(side, lip, top); h = R * .22;
    } else if (look === 'cipher') {   // an old typewriter key (2026-11-17 user: もっとレトロ感): a nickel ring round a paper label under a glass dome, on a bent lever stem
      const nickel = mat('hbNickelM', () => X.M({ color: '#d8d2c2', metalness: 1, roughness: .12, envMapIntensity: 1.7, bump: false }));   // (glossy, 2026-11-17 user: 金属の部分を金属っぽく光沢)
      const stem = X.mesh(geo('hbKeyStem3', () => { const c = new TT.CylinderGeometry(R * .12, R * .12, R * .36, 6); c.translate(0, -R * .14 + R * .18, 0); return c; }), nickel);
      const rim = X.mesh(geo('hbKeyRim2', () => { const c = new TT.CylinderGeometry(R * .9, R * .94, R * .24, LO() ? 16 : 22, 1, true); c.translate(0, R * .1 + R * .12, 0); return c; }), nickel);
      const lip = X.mesh(geo('hbKeyLip', () => { const c = new TT.TorusGeometry(R * .9, R * .045, 4, LO() ? 16 : 22); c.rotateX(Math.PI / 2); c.translate(0, R * .34, 0); return c; }), nickel);
      const face = X.mesh(PIECE_GEO.disc(R * .9, R * .32, 'key2'), faceMat('cipher', kind, v, { roughness: .6, emissiveIntensity: .55 }));
      const glass = new TT.Mesh(geo('hbKeyGlass', () => { const q = new TT.SphereGeometry(R * .9, LO() ? 14 : 18, 4, 0, Math.PI * 2, 0, .45); q.scale(1, .5, 1); q.translate(0, R * .32 - R * .9 * .5 * Math.cos(.45), 0); return q; }), mat('hbKeyGlassM2', () => X.M({ color: '#ffffff', roughness: .08, metalness: 0, transparent: true, opacity: .07, envMapIntensity: .5, bump: false, depthWrite: false })));
      stem.castShadow = rim.castShadow = face.castShadow = true; g.add(stem, rim, lip, face, glass); h = R * .42;
    } else if (look === 'vault') {   // a cut jewel (2026-11-17 user: 駒は宝石をモチーフに): eight crown facets round the table, the pavilion under the girdle
      const jm = mat('hbJewel2' + kind + v, () => { const c = colOf(kind, v), m = X.M({ color: c, roughness: 0, metalness: .45, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 4.2, emissive: c, emissiveIntensity: .3, flatShading: true, side: T().DoubleSide, bump: false }); m.emissive.convertSRGBToLinear(); if ('ior' in m) m.ior = 2.4; if ('specularIntensity' in m) m.specularIntensity = 1; return m; });
      const body = X.mesh(PIECE_GEO.jewel(), jm); body.castShadow = true; g.add(body);
      const table = X.mesh(geo('hbDiamondT', () => { const c = new TT.CircleGeometry(R * .55, 8); c.rotateX(-Math.PI / 2); c.translate(0, R * .47 + .004, 0); return c; }), faceMat('vault', kind, v, { roughness: .02, clearcoat: 1, emissiveIntensity: .55, envMapIntensity: 2.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); g.add(table);
      // fire (2026-11-17 user: 煌めきがまだ全然弱い): a thin skin over the crown facets that adds rainbow light, and star flashes that
      // light up and die as the viewing angle sweeps across each facet (computed per frame from the camera, plus a slow twinkle)
      const fire = new TT.Mesh(PIECE_GEO.jewel(), mat('hbFire', () => new TT.MeshBasicMaterial({ map: fireTex(), transparent: true, opacity: .55, blending: TT.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
      fire.scale.setScalar(1.002); fire.renderOrder = 2; g.add(fire);
      const fx = new TT.Group(); fx.userData.keep = true; g.add(fx);   // (kept apart from the static merge: it moves)
      const sm = new TT.SpriteMaterial({ map: sparkTex(), color: 0xffffff, transparent: true, depthWrite: false, depthTest: true, blending: TT.AdditiveBlending, toneMapped: false });
      const wp = new TT.Vector3(), cp = new TT.Vector3();
      // each jewel its own rhythm (2026-11-18 ユーザー：金庫の宝石のキラキラが全部同じタイミング): a phase and a pace of its own
      const gp = Math.random() * Math.PI * 2, gs = .75 + Math.random() * .55;
      [[.62, .3, -.28, 0], [-.42, .36, .5, 2.1], [.15, .49, .38, 4.2], [-.55, .28, -.4, 1.1], [.32, .5, .02, 3.3], [.05, .32, -.72, 5.1]].forEach(([x, y, z, ph], i) => {
        const st = new TT.Sprite(sm.clone()); st.position.set(x * R, y * R + .01, z * R); st.renderOrder = 3; fx.add(st);
        st.onBeforeRender = (rn, sc, cam) => { st.getWorldPosition(wp); cp.copy(cam.position).sub(wp).normalize(); const a = Math.atan2(cp.x, cp.z) * 3 + cp.y * 7 + ph + gp, t = performance.now() / 1000;
          const k = Math.pow(Math.max(0, Math.cos(a)), 6) * .85 + Math.pow(Math.max(0, Math.sin(t * (1.3 + i * .37) * gs + ph * 2 + gp)), 12) * .7;
          st.material.opacity = Math.min(1, k); const sz = R * (.35 + k * .75) * (st.parent && st.parent.parent ? 1 : 1); st.scale.set(sz, sz, 1); };
      });
      h = R * .47;
    } else if (look === 'doodle') {   // a coin of corrugated card with white paper on top
      const side = X.mesh(PIECE_GEO.coinSide(R * .92, R * .34), mat('hbCardSide', () => X.M({ map: cardSideTex(), roughness: .95, bump: false })));
      const top = X.mesh(PIECE_GEO.disc(R * .92, -R * .14 + R * .34, 'card'), faceMat('doodle', kind, v, { roughness: .95, emissiveIntensity: .42, envMapIntensity: .05 }));
      side.castShadow = top.castShadow = true; g.add(side, top); h = R * .2;
    } else {
      const d = X.mesh(domeGeo(), gemMat(kind, v)); d.castShadow = true; d.receiveShadow = false; g.add(d);
      // a sharp highlight (a small bright cap off the top)
      const hl = new TT.Mesh(geo('hbHl', () => { const s = new TT.SphereGeometry(R * .2, 6, 4); s.scale(1, .45, .8); return s; }), mat('hbHlM', () => new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })));
      hl.position.set(-R * .34, R * .66, -R * .3); g.add(hl);
    }
    g.userData = { kind, v, h, look };
    return g;
  }
  function pin(hit, look) {
    const TT = T(); look = lookNow(look);
    if (look === 'doodle') {   // the answer pins as little card coins too: white paper, the hit one with a pink felt-pen dot (2026-11-17 user: B＆Hも)
      const g = new TT.Group();
      const side = X.mesh(geo('hbPinCardS', () => { const c = new TT.CylinderGeometry(PIN * .95, PIN * .95, PIN * 1.1, 10, 1, true); c.translate(0, -PIN * .8 + PIN * .55, 0); return c; }), mat('hbCardSide', () => X.M({ map: cardSideTex(), roughness: .95, bump: false })));
      const top = X.mesh(geo('hbPinCardT', () => { const c = new TT.CircleGeometry(PIN * .95, 10); c.rotateX(-Math.PI / 2); c.translate(0, PIN * .3, 0); return c; }), mat('hbPinCard' + (hit ? 'h' : 'b'), () => { const tx = X.canvasTex('hbPinCardT' + (hit ? 'h' : 'b'), 64, 64, (c, W) => { c.fillStyle = '#fbfaf4'; c.fillRect(0, 0, W, W); if (hit) { c.fillStyle = HIT; c.beginPath(); c.arc(W / 2, W / 2, W * .34, 0, 7); c.fill(); } pencilCircle(c, W / 2, W / 2, W * .4, rnd(hit ? 3 : 4), 'rgba(30,30,35,.8)', W * .05); }); const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .45, roughness: .95, bump: false }); m.emissive.set(0xffffff); return m; }));
      g.add(side, top); return g;
    }
    const m = X.mesh(geo('hbPin', () => { const s = new TT.SphereGeometry(PIN, LO() ? 8 : 10, LO() ? 5 : 6); s.scale(1, .8, 1); return s; }),
      mat('hbPin' + (hit ? 'h' : 'b'), () => { const c = hit ? HIT : BLOW, m = X.M({ color: c, roughness: .4, envMapIntensity: .3, emissive: c, emissiveIntensity: hit ? .75 : .32 }); m.emissive.convertSRGBToLinear(); return m; }));
    m.castShadow = false; return m;
  }

  /* ---------- the board ---------- */
  function layout(cfg) {
    const n = cfg.n, rows = cfg.rows;
    const lab = .95, gap = .3, fbw = 1.0, side = .42;
    const W = side + lab + n * PITCH + gap + fbw + side;
    const caseD = 1.55, top0 = .45, L = top0 + caseD + .35 + rows * ROWP + .45;
    const x0 = -W / 2 + side + lab, z0 = -L / 2 + top0 + caseD + .35;
    const slot = (r, k) => [x0 + (k + .5) * PITCH, z0 + (r + .5) * ROWP];
    const fbx = x0 + n * PITCH + gap + fbw / 2;
    // the answer pins: as many holes as gems in the row (2026-11-16 user) — 3: 2 over 1 · 4: 2 × 2 · 5: 3 over 2
    const PP = { 3: [[-.19, -.17], [.19, -.17], [0, .19]], 4: [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]], 5: [[-.25, -.17], [0, -.17], [.25, -.17], [-.13, .19], [.13, .19]] }[n] || [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]];
    const pinPos = (r, k) => { const q = PP[Math.min(k, PP.length - 1)]; return [fbx + q[0], z0 + (r + .5) * ROWP + q[1]]; };
    const labX = x0 - lab / 2, caseZ = -L / 2 + top0 + caseD / 2, caseW = n * PITCH + .5, caseX = x0 + n * PITCH / 2;
    return { n, rows, W, L, x0, z0, slot, pinPos, fbx, labX, caseZ, caseW, caseD, caseX };
  }
  function topTex(cfg, Lt, look) {
    const S = SKINS[look], PX = LO() ? 56 : 84, cw = Math.round(Lt.W * PX), ch = Math.round(Lt.L * PX);
    return X.canvasTex('hbTop' + look + cfg.n + 'x' + cfg.rows + (LO() ? 'l' : ''), cw, ch, (c, W, H) => {
      H = H || ch;
      const px = x => (x + Lt.W / 2) * PX, pz = z => (z + Lt.L / 2) * PX;
      S.bg(c, W, H, PX);
      // the play field
      const fx0 = px(Lt.x0 - .95 + .08), fx1 = px(Lt.fbx + .5 + .02), fz0 = pz(Lt.z0 - .12), fz1 = pz(Lt.z0 + Lt.rows * ROWP + .12);
      S.field(c, fx0, fz0, fx1 - fx0, fz1 - fz0, PX);
      // the rows
      for (let r = 0; r < Lt.rows; r++) {
        const zc = pz(Lt.z0 + (r + .5) * ROWP);
        if (r && S.rowLine) { c.strokeStyle = S.rowLine; c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx0 + PX * .15, pz(Lt.z0 + r * ROWP)); c.lineTo(fx1 - PX * .15, pz(Lt.z0 + r * ROWP)); c.stroke(); }
        S.num(c, px(Lt.labX + .12), zc, String(r + 1), PX, r, Lt.rows);   // (each draws the digits' own box on the row's centre line, as the gems and the who-lights, 2026-11-17 user)
        for (let k = 0; k < Lt.n; k++) S.sock(c, px(Lt.slot(r, k)[0]), zc, PX * (R + .03), k, r);
        S.plate(c, px(Lt.fbx - .42), zc - PX * .42, PX * .84, PX * .84, PX);
        for (let k = 0; k < Lt.n; k++) { const [x, z] = Lt.pinPos(r, k); S.pin(c, px(x), pz(z), PX * (Lt.n > 4 ? .1 : .11)); }
      }
      // the case's bed (the case stands here), the name in the bottom margin, the extras round the case
      S.bed(c, px(Lt.caseX - Lt.caseW / 2 - .1), pz(Lt.caseZ - Lt.caseD / 2 - .05), PX * (Lt.caseW + .2), PX * (Lt.caseD + .1), PX);
      if (S.title) { c.save(); c.translate(W / 2, pz(Lt.z0 + Lt.rows * ROWP + .245)); c.scale(.7, .7); S.title(c, 0, 0, PX); c.restore(); }   // (the bottom margin is narrow: the name smaller, clear of the edge)
      const lx = (-Lt.W / 2 + .15 + Lt.caseX - Lt.caseW / 2 - .1) / 2, rx = (Lt.caseX + Lt.caseW / 2 + .1 + Lt.W / 2 - .15) / 2, by = Lt.z0 + Lt.rows * ROWP + .245;
      if (S.deco) S.deco(c, W, H, PX, [[px(lx), pz(Lt.caseZ)], [px(rx), pz(Lt.caseZ - .38)], [px(rx), pz(Lt.caseZ + .38)], [px(-Lt.W / 2 + .55), pz(by)], [px(Lt.W / 2 - .55), pz(by)]]);
    });
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  // the holes are real (2026-11-17 user: 穴っぽく → ブラックホールみたいで不自然・角度で被る → ボールが収まる程度の深さで、どの角度からも綺麗に):
  // the board's top is a slab of its own (HOLE deep) with the sockets and the pin holes cut through it, standing on the body,
  // so each hole is a short lacquered wall down to the body's top (the floor) — ordinary geometry, right from every angle.
  // The printed top goes on the slab's face (its UVs set as the old flat top's); the walls and the floor are the lacquer.
  const HOLE = .1;
  // a rounded rectangle with true quarter-circle corners (2026-11-17 user: 四隅を綺麗な角丸に — the quadratic corners were flattened and coarse)
  function rrPath(p, x, z, w, d, r) { const A = (cx, cz, a0) => { const n = 10; for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; p.lineTo(cx + Math.cos(a) * r, cz + Math.sin(a) * r); } };
    p.moveTo(x + r, z); p.lineTo(x + w - r, z); A(x + w - r, z + r, -Math.PI / 2); p.lineTo(x + w, z + d - r); A(x + w - r, z + d - r, 0); p.lineTo(x + r, z + d); A(x + r, z + d - r, Math.PI / 2); p.lineTo(x, z + r); A(x + r, z + r, Math.PI); return p; }
  // the holes' floor: the same rounded shape (a plain rectangle's corners had stuck out past the rounded top)
  function rplane(w, d, r, m) { const TT = T(), s = rrPath(new TT.Shape(), -w / 2, -d / 2, w, d, r), g = new TT.ShapeGeometry(s); g.rotateX(-Math.PI / 2); return new TT.Mesh(g, m); }
  function plate(w, d, r, holes, key, uw = w, ud = d) {   // (uw × ud: the area the face's picture covers, centred)
    return geo('hbPlate' + key, () => {
      const TT = T(), s = new TT.Shape(), x = -w / 2, z = -d / 2;
      rrPath(s, x, z, w, d, r);
      holes.forEach(([hx, hz, hr, n]) => { const p = new TT.Path(); for (let i = 0; i < n; i++) { const a = -i / n * Math.PI * 2; p[i ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * hr, -hz + Math.sin(a) * hr); } p.closePath(); s.holes.push(p); });   // (shape y = −world z)
      const ex = new TT.ExtrudeGeometry(s, { depth: HOLE, bevelEnabled: false, curveSegments: LO() ? 3 : 5 });
      const P = ex.attributes.position, uv = ex.attributes.uv, cap = ex.groups[0];
      for (let i = cap.start; i < cap.start + cap.count; i++) uv.setXY(i, (P.getX(i) + uw / 2) / uw, (P.getY(i) + ud / 2) / ud);
      uv.needsUpdate = true;
      // the slab's underside is never seen (it lies on the body): keep only its face and walls
      const keep = [], walls = ex.groups[1];
      for (let i = cap.start; i < cap.start + cap.count; i += 3) if (P.getZ(i) > HOLE / 2 || P.getZ(i + 1) > HOLE / 2 || P.getZ(i + 2) > HOLE / 2) keep.push(i, i + 1, i + 2);
      const nc = keep.length; for (let i = walls.start; i < walls.start + walls.count; i++) keep.push(i);
      ex.setIndex(keep); ex.clearGroups(); ex.addGroup(0, nc, 0); ex.addGroup(nc, keep.length - nc, 1);
      ex.rotateX(-Math.PI / 2); return ex;
    });
  }

  const lacquer = () => mat('hbLacq', () => X.M({ color: '#10173c', roughness: .7, envMapIntensity: .2, bump: false }));
  const neonMat = (c, k) => mat('hbNeon' + c, () => { const m = new (T().MeshBasicMaterial)({ color: c, toneMapped: false }); m.color.convertSRGBToLinear(); if (k) m.color.multiplyScalar(k); return m; });
  // a rounded rectangle extruded (the board, the case, the lid)
  function rbox(w, d, h, r, bev) {
    const TT = T(), s = new TT.Shape(), x = -w / 2, z = -d / 2;
    rrPath(s, x, z, w, d, r);
    const b = bev == null ? Math.min(.06, h * .3) : bev;
    const ex = new TT.ExtrudeGeometry(s, { depth: Math.max(.001, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: LO() ? 4 : 6 });
    ex.rotateX(-Math.PI / 2); ex.translate(0, b, 0);   // (no mirroring: a mirrored solid turns its faces inside out — the sides flickered with self-shadow, 2026-11-16)
    return ex;
  }
  // a rounded-rect ring (the lid's skirt): outer w × d, wall t, height h, standing on y = 0
  function rframe(w, d, h, r, t) {
    const TT = T(), rr2 = (x, z, w, d, r, s) => { rrPath(s, x, z, w, d, r); return s; };
    const s = rr2(-w / 2, -d / 2, w, d, r, new TT.Shape()), hole = rr2(-w / 2 + t, -d / 2 + t, w - 2 * t, d - 2 * t, Math.max(.02, r - t), new TT.Path());
    s.holes.push(hole);
    const ex = new TT.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: LO() ? 4 : 6 }); ex.rotateX(-Math.PI / 2); return ex;
  }
  function planeTop(w, d, map) {
    const TT = T(), p = new TT.PlaneGeometry(w, d); p.rotateX(-Math.PI / 2);
    return new TT.Mesh(p, map);
  }

  /* ---------- the boards (2026-11-17 user: 盤を他に5種類 — カジノ・落書き・くだもの、ほかは今までにないタイプ) ----------
     Table3D.BOARDS.hitblow ('atlas-hitblow-look'): midnight (the default) · casino · doodle · fruit · cipher · vault.
     A skin paints the printed tops (board, tray, lid) and gives the materials; the geometry is the same for all.
       bg(c, W, H, PX)                the face under everything
       field(c, x, y, w, h, PX)       the line round the play field (and the tray's row)
       rowLine                        the thin line between rows (null: none)
       num(c, x, y, s, PX, r)         the row number at (x, y), s = its text
       sock(c, x, y, r, k, row)       the ring round a socket (r: the hole's radius on the face; drawn out to ~1.3 r)
       plate(c, x, y, w, h, PX)       the answer pins' plate · pin(c, x, y, r) the ring round a pin hole
       bed(c, x, y, w, h, PX)         the case's bed and the tray's palette bed
       deco(c, W, H, PX, A)           the extras (A: the free areas — the margins), title(c, x, y, PX) the name in the bottom margin
       lid(c, W, H, n, PX)            the lid's face
       body / wall / caseC / lidC / velvet / trim / rim: the materials ({ c, r, m } colour, roughness, metalness; rim.k: neon · metal · matte · none)
       glow: the faces' self-light (the rooms are dim) · okOff: [bg, text] of the OK key when the row is not full */
  const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const wob = (c, pts, R, amp) => { c.beginPath(); pts.forEach(([x, y], i) => { const j = (R() - .5) * amp, k = (R() - .5) * amp; i ? c.lineTo(x + j, y + k) : c.moveTo(x + j, y + k); }); };
  const pencilCircle = (c, x, y, r, R, col, lw, turns = 1.08) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); const n = 40, a0 = R() * 7, dr = (R() - .5) * r * .08; for (let i = 0; i <= n * turns; i++) { const a = a0 + i / n * Math.PI * 2, rr2 = r + dr * i / n + (R() - .5) * r * .03; i ? c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : c.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.stroke(); };
  const pencilRect = (c, x, y, w, h, R, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = c.lineJoin = 'round'; const seg = (x0, y0, x1, y1) => { const n = 12, pts = []; for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); wob(c, pts, R, lw * 1.4); c.stroke(); }; seg(x - 3, y, x + w + 4, y + 2); seg(x + w, y - 3, x + w - 1, y + h + 3); seg(x + w + 3, y + h, x - 2, y + h - 1); seg(x, y + h + 3, x + 1, y - 4); };
  const brass = (c, x, y, r0, r1) => { const g = c.createLinearGradient(x - r1, y - r1, x + r1, y + r1); g.addColorStop(0, '#fff3c4'); g.addColorStop(.18, '#f0c868'); g.addColorStop(.42, '#a87a30'); g.addColorStop(.62, '#5e4012'); g.addColorStop(.8, '#d9ad55'); g.addColorStop(.9, '#fff0b8'); g.addColorStop(1, '#c08f3c'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r1, 0, 7); c.arc(x, y, r0, 0, 7, true); c.fill(); };
  const chrome = (c, x, y, r0, r1) => { const g = c.createLinearGradient(x, y - r1, x, y + r1); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#b9c1c9'); g.addColorStop(.55, '#5e666f'); g.addColorStop(.8, '#cfd6dd'); g.addColorStop(1, '#8c949c'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r1, 0, 7); c.arc(x, y, r0, 0, 7, true); c.fill(); };
  const screw = (c, x, y, r) => { const g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r); g.addColorStop(0, '#fff4c8'); g.addColorStop(.6, '#b88a3a'); g.addColorStop(1, '#5a3e14'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(40,25,5,.8)'; c.lineWidth = r * .25; c.beginPath(); c.moveTo(x - r * .65, y - r * .2); c.lineTo(x + r * .65, y + r * .2); c.stroke(); };
  const rivet = (c, x, y, r) => { const g = c.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#aab2ba'); g.addColorStop(1, '#4a525a'); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(x + r * .2, y + r * .3, r, 0, 7); c.fill(); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); };
  const numText = (c, s, x, y, font, fill) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; const tm = c.measureText(s); c.fillStyle = fill; c.fillText(s, x, y + (tm.actualBoundingBoxAscent - tm.actualBoundingBoxDescent) / 2); };
  const qmark = (c, x, u, col, glow) => { c.save(); c.translate(x, 0); if (glow) { c.shadowColor = glow; c.shadowBlur = u * 1.2; } c.strokeStyle = col; c.fillStyle = col; c.lineWidth = u * .5; c.lineCap = 'round'; c.beginPath(); c.arc(0, -u * 1.05, u * 1.05, Math.PI * 1.05, Math.PI * 2.35); c.quadraticCurveTo(0, -u * .2, 0, u * .55); c.stroke(); c.beginPath(); c.arc(0, u * 1.55, u * .5, 0, 7); c.fill(); c.restore(); };
  // small fruit drawings (the fruit board's margins and lid)
  const FRUIT = {
    cherry(c, x, y, s) { c.strokeStyle = '#3f8a2e'; c.lineWidth = s * .08; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s * .3, y + s * .1); c.quadraticCurveTo(x - s * .1, y - s * .5, x + s * .15, y - s * .6); c.moveTo(x + s * .3, y + s * .15); c.quadraticCurveTo(x + s * .2, y - s * .3, x + s * .15, y - s * .6); c.stroke(); c.fillStyle = '#5bb547'; c.beginPath(); c.ellipse(x + s * .32, y - s * .62, s * .2, s * .09, -.4, 0, 7); c.fill(); [[-.3, .3], [.3, .35]].forEach(([dx, dy]) => { c.fillStyle = '#e0283c'; c.beginPath(); c.arc(x + dx * s, y + dy * s, s * .26, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x + dx * s - s * .09, y + dy * s - s * .09, s * .06, 0, 7); c.fill(); }); },
    berry(c, x, y, s) { c.fillStyle = '#ef3d4f'; c.beginPath(); c.moveTo(x, y + s * .55); c.bezierCurveTo(x - s * .55, y + s * .1, x - s * .45, y - s * .4, x, y - s * .3); c.bezierCurveTo(x + s * .45, y - s * .4, x + s * .55, y + s * .1, x, y + s * .55); c.fill(); c.fillStyle = '#ffe9a8'; for (let i = 0; i < 7; i++) { const a = i * 2.3, rr2 = s * (.12 + (i % 3) * .1); c.beginPath(); c.ellipse(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2 * .9 + s * .05, s * .03, s * .045, 0, 0, 7); c.fill(); } c.fillStyle = '#4fae3a'; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .55; c.beginPath(); c.ellipse(x + Math.cos(a) * s * .17, y - s * .32 + Math.sin(a) * s * .08, s * .14, s * .06, a, 0, 7); c.fill(); } },
    lemon(c, x, y, s) { c.fillStyle = '#ffd83a'; c.beginPath(); c.ellipse(x, y, s * .5, s * .36, -.3, 0, 7); c.fill(); c.fillStyle = '#ffd83a'; c.beginPath(); c.ellipse(x + s * .46, y - s * .16, s * .1, s * .07, -.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - s * .15, y - s * .12, s * .16, s * .06, -.3, 0, 7); c.fill(); c.fillStyle = '#5bb547'; c.beginPath(); c.ellipse(x - s * .42, y - s * .3, s * .16, s * .07, .6, 0, 7); c.fill(); },
    slice(c, x, y, s, rind = '#ff9a1e', pulp = '#ffc861') { c.fillStyle = rind; c.beginPath(); c.arc(x, y, s * .5, 0, 7); c.fill(); c.fillStyle = '#fff6df'; c.beginPath(); c.arc(x, y, s * .43, 0, 7); c.fill(); c.fillStyle = pulp; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a + .08) * s * .05, y + Math.sin(a + .08) * s * .05); c.arc(x, y, s * .39, a + .08, a + Math.PI / 4 - .08); c.closePath(); c.fill(); } },
    leaf(c, x, y, s, a = 0, col = '#6cc04a', vein = '#3f8a2e') { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(-s * .5, 0); c.quadraticCurveTo(0, -s * .38, s * .5, 0); c.quadraticCurveTo(0, s * .38, -s * .5, 0); c.fill(); c.strokeStyle = vein; c.lineWidth = s * .05; c.beginPath(); c.moveTo(-s * .45, 0); c.lineTo(s * .45, 0); c.stroke(); c.restore(); },
  };
  const FRUITS = [['#ff9a1e', '#ffc861'], ['#56b33a', '#b8e86a'], ['#ec3f6a', '#ff8ea4'], ['#8a5a2a', '#9fd24e'], ['#f2c400', '#ffe982']];   // orange · lime · grapefruit · kiwi · lemon (by column)
  // doodles for the notebook board
  const DOODLE = [
    (c, x, y, s) => { c.beginPath(); for (let i = 0; i < 11; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? s * .22 : s * .5; i ? c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : c.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.stroke(); },   // star
    (c, x, y, s) => { c.beginPath(); for (let i = 0; i < 60; i++) { const a = i * .35, rr2 = s * .03 + i * s * .008; i ? c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : c.moveTo(x, y); } c.stroke(); },   // spiral
    (c, x, y, s) => { c.beginPath(); c.arc(x, y, s * .45, 0, 7); c.stroke(); c.beginPath(); c.arc(x - s * .16, y - s * .1, s * .04, 0, 7); c.arc(x + s * .16, y - s * .1, s * .04, 0, 7); c.stroke(); c.beginPath(); c.arc(x, y + s * .02, s * .24, .3, Math.PI - .3); c.stroke(); },   // smiley
    (c, x, y, s) => { c.beginPath(); c.moveTo(x - s * .5, y + s * .1); c.quadraticCurveTo(x - s * .1, y - s * .4, x + s * .45, y - s * .05); c.moveTo(x + s * .45, y - s * .05); c.lineTo(x + s * .22, y - s * .2); c.moveTo(x + s * .45, y - s * .05); c.lineTo(x + s * .25, y + s * .14); c.stroke(); },   // arrow
    (c, x, y, s) => { c.beginPath(); c.moveTo(x, y + s * .4); c.bezierCurveTo(x - s * .6, y, x - s * .35, y - s * .5, x, y - s * .2); c.bezierCurveTo(x + s * .35, y - s * .5, x + s * .6, y, x, y + s * .4); c.stroke(); },   // heart
    (c, x, y, s) => { c.beginPath(); for (let i = 0; i < 6; i++) { c.moveTo(x - s * .45, y - s * .3 + i * s * .12); c.lineTo(x + s * .45, y - s * .4 + i * s * .12); } c.stroke(); },   // hatching
    (c, x, y, s) => { c.font = `700 ${s * .9}px "Comic Sans MS","Chalkboard SE","Marker Felt",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(x, y); c.rotate(-.2); c.fillStyle = c.strokeStyle; c.fillText('?', 0, 0); c.restore(); },   // ?
    (c, x, y, s) => { c.beginPath(); for (let i = 0; i <= 24; i++) { const xx = x - s * .5 + i * s / 24; i ? c.lineTo(xx, y + Math.sin(i * .9) * s * .12) : c.moveTo(xx, y); } c.stroke(); },   // wave
    (c, x, y, s) => { c.beginPath(); c.moveTo(x - s * .1, y - s * .5); c.lineTo(x - s * .3, y + s * .05); c.lineTo(x, y + s * .02); c.lineTo(x - s * .15, y + s * .5); c.lineTo(x + s * .32, y - s * .12); c.lineTo(x + s * .03, y - s * .1); c.lineTo(x + s * .15, y - s * .5); c.closePath(); c.stroke(); },   // bolt
  ];
  const DOODLE_INK = ['#2b4fa8', '#d6453f', '#2f9a55', '#7a4fc0', '#e08a1e', '#444444'];
  const SKINS = {
    midnight: {
      bg(c, W, H, PX) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2a66'); g.addColorStop(.45, '#121a45'); g.addColorStop(1, '#0a0f2c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const rg = c.createRadialGradient(W * .5, H * .12, 10, W * .5, H * .3, H * .8); rg.addColorStop(0, 'rgba(120,150,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(130,160,255,.06)'; c.lineWidth = 1; for (let x = 0; x < W; x += PX * .25) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += PX * .25) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } },
      field(c, x, y, w, h, PX, fill) { rr(c, x, y, w, h, PX * .25); if (fill) { c.fillStyle = 'rgba(2,4,18,.55)'; c.fill(); } c.strokeStyle = 'rgba(120,170,255,.55)'; c.lineWidth = PX * .03; c.shadowColor = '#6f8cff'; c.shadowBlur = PX * .18; c.stroke(); c.shadowBlur = 0; },
      rowLine: 'rgba(140,170,255,.13)',
      num(c, x, y, s, PX) { numText(c, s, x, y, `700 ${PX * .32}px "Outfit", system-ui, sans-serif`, 'rgba(200,214,255,.6)'); },
      sock(c, x, y, r) { const R2 = r * 1.18, g = c.createRadialGradient(x, y + R2 * .25, R2 * .1, x, y, R2); g.addColorStop(0, '#02030c'); g.addColorStop(.62, '#060a22'); g.addColorStop(.86, '#1a2560'); g.addColorStop(1, 'rgba(120,150,255,.0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, R2, 0, 7); c.fill();
        c.strokeStyle = 'rgba(150,180,255,.35)'; c.lineWidth = R2 * .07; c.beginPath(); c.arc(x, y, R2 * .9, Math.PI * .1, Math.PI * .9); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(x, y, R2 * .9, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); },
      plate(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .16); c.fillStyle = 'rgba(4,7,26,.55)'; c.fill(); c.strokeStyle = 'rgba(140,170,255,.22)'; c.lineWidth = 1.2; c.stroke(); },
      pin(c, x, y, r) { const g = c.createRadialGradient(x, y + r * .3, 0, x, y, r * 1.1); g.addColorStop(0, '#000'); g.addColorStop(.75, '#0b1030'); g.addColorStop(1, 'rgba(150,180,255,.35)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.1, 0, 7); c.fill(); },
      bed(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .25); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill(); },
      lid(c, W, H, n, PX) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2b3683'); g.addColorStop(1, '#161c4c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (let x = -H; x < W; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); }
        c.save(); c.translate(0, H / 2); for (let k = 0; k < n; k++) qmark(c, (k + .5) / n * W, PX * .12, 'rgba(232,220,255,.95)', '#b48cff'); c.restore();
        c.strokeStyle = 'rgba(200,170,255,.5)'; c.lineWidth = 2; rr(c, 6, 6, W - 12, H - 12, PX * .16); c.stroke(); },
      body: { c: '#10173c', r: .7 }, caseC: { c: '#1a2150', r: .65, m: .1 }, lidC: { c: '#2a3478', r: .65, m: .1 }, velvet: { c: '#2a0f3a', sheen: '#a070ff' },
      trim: { k: 'neon', c: '#c38bff' }, rim: { k: 'neon', c: '#7fa2ff' }, glow: .55, okOff: ['#2c3672', '#1e2756', 'rgba(180,195,255,.55)'],
    },
    // カジノ: green baize with gold lines, the row numbers on poker chips, a mahogany rail with a brass edge; a black-and-gold case
    casino: {
      bg(c, W, H, PX) { const g = c.createRadialGradient(W * .5, H * .45, PX, W * .5, H * .5, Math.max(W, H) * .7); g.addColorStop(0, '#187a41'); g.addColorStop(.7, '#0f5e33'); g.addColorStop(1, '#0a4526'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        // the felt (2026-11-17 user: フェルトっぽく): soft cloudy patches, then a dense nap of short fibres in every direction
        const R = rnd(7);
        for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * H, r = PX * (.4 + R() * 1.2), gg = c.createRadialGradient(x, y, 0, x, y, r); gg.addColorStop(0, R() < .6 ? 'rgba(0,0,0,.1)' : 'rgba(120,230,160,.04)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2); }
        c.lineCap = 'round'; for (let i = 0; i < W * H / 9; i++) { const x = R() * W, y = R() * H, a = R() * Math.PI * 2, l = 1.5 + R() * 3.5, v = R(); c.strokeStyle = v < .55 ? 'rgba(0,25,8,.22)' : v < .93 ? 'rgba(110,200,140,.08)' : 'rgba(180,240,200,.1)'; c.lineWidth = .7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } },
      field(c, x, y, w, h, PX, fill) { rr(c, x, y, w, h, PX * .3); if (fill) { c.fillStyle = 'rgba(0,40,18,.25)'; c.fill(); } c.strokeStyle = '#e9c76a'; c.lineWidth = PX * .028; c.stroke(); rr(c, x + PX * .07, y + PX * .07, w - PX * .14, h - PX * .14, PX * .24); c.lineWidth = PX * .012; c.strokeStyle = 'rgba(233,199,106,.7)'; c.stroke(); },
      rowLine: 'rgba(233,199,106,.22)',
      num(c, x, y, s, PX) { const rad = PX * .27, g = c.createRadialGradient(x + 3, y + 4, rad * .6, x + 3, y + 4, rad * 1.25); g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x + 3, y + 4, rad * 1.25, 0, 7); c.fill(); },   // (the chip is a real one standing here — board(): S.chips)
      sock(c, x, y, r) { const g = c.createRadialGradient(x, y, r * .9, x, y, r * 1.3); g.addColorStop(0, 'rgba(0,30,12,.75)'); g.addColorStop(1, 'rgba(0,30,12,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.3, 0, 7); c.fill(); c.strokeStyle = '#e9c76a'; c.lineWidth = r * .06; c.beginPath(); c.arc(x, y, r * 1.12, 0, 7); c.stroke(); },
      plate(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .16); c.fillStyle = 'rgba(0,30,12,.35)'; c.fill(); c.strokeStyle = 'rgba(233,199,106,.8)'; c.lineWidth = PX * .015; c.stroke(); },
      pin(c, x, y, r) { c.fillStyle = 'rgba(0,25,10,.7)'; c.beginPath(); c.arc(x, y, r * 1.12, 0, 7); c.fill(); c.strokeStyle = 'rgba(233,199,106,.75)'; c.lineWidth = r * .1; c.beginPath(); c.arc(x, y, r * 1.12, 0, 7); c.stroke(); },
      bed(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .25); c.fillStyle = 'rgba(0,30,12,.4)'; c.fill(); c.strokeStyle = 'rgba(233,199,106,.5)'; c.lineWidth = PX * .015; c.stroke(); },
      title(c, x, y, PX) { c.font = `italic 700 ${PX * .3}px "Cormorant Garamond", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e9c76a'; c.fillText('♠  HIT  ♦  BLOW  ♣', x, y); },
      deco(c, W, H, PX, A) { c.fillStyle = 'rgba(233,199,106,.3)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${PX * .4}px Georgia, "Segoe UI Symbol", "Noto Sans Symbols", serif`;   // (all four suits round the case — the ♣ had gone to a corner, 2026-11-17 user)
        [[A[0][0], A[0][1] - PX * .3, '♠'], [A[0][0], A[0][1] + PX * .3, '♣'], [A[1][0], A[0][1] - PX * .3, '♥'], [A[1][0], A[0][1] + PX * .3, '♦']].forEach(([x, y, ch]) => c.fillText(ch, x, y)); },
      lid(c, W, H, n, PX) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f1f1f'); g.addColorStop(1, '#0d0d0d'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = '#e9c76a'; c.lineWidth = 3; rr(c, 7, 7, W - 14, H - 14, PX * .14); c.stroke(); c.lineWidth = 1.2; rr(c, 14, 14, W - 28, H - 28, PX * .1); c.stroke();
        // the hidden code as playing cards (2026-11-17 user: ？をもっとカジノっぽく): a cream card, a red-and-gold double border, a suit and ？ in the
        // corners as a card's index, and a big serif ？ in gold-edged red in the middle
        c.save(); c.translate(0, H / 2); for (let k = 0; k < n; k++) { const x = (k + .5) / n * W, w2 = PX * .32, h2 = PX * .46, suit = '♠♥♦♣'[k % 4], red = suit === '♥' || suit === '♦', ink = red ? '#c3202b' : '#1c1c1c';
          c.fillStyle = 'rgba(0,0,0,.4)'; rr(c, x - w2 + 3, -h2 + 4, w2 * 2, h2 * 2, PX * .06); c.fill(); c.fillStyle = '#f7f1e3'; rr(c, x - w2, -h2, w2 * 2, h2 * 2, PX * .06); c.fill();
          c.strokeStyle = '#c9a24e'; c.lineWidth = 2; rr(c, x - w2 + 4, -h2 + 4, w2 * 2 - 8, h2 * 2 - 8, PX * .04); c.stroke(); c.strokeStyle = ink; c.lineWidth = 1; rr(c, x - w2 + 7, -h2 + 7, w2 * 2 - 14, h2 * 2 - 14, PX * .03); c.stroke();
          c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${PX * .12}px Georgia, serif`; c.fillText('?', x - w2 + PX * .09, -h2 + PX * .1); c.fillText(suit, x - w2 + PX * .09, -h2 + PX * .21);
          c.save(); c.translate(x + w2 - PX * .09, h2 - PX * .1); c.rotate(Math.PI); c.fillText('?', 0, 0); c.fillText(suit, 0, PX * .11); c.restore();
          c.font = `700 ${PX * .5}px "Cormorant Garamond", Georgia, serif`; c.lineWidth = PX * .025;   /* (upright: the italic looked tilted, 2026-11-17 user) */ c.strokeStyle = '#c9a24e'; c.strokeText('?', x, PX * .02); c.fillStyle = ink; c.fillText('?', x, PX * .02); } c.restore(); },
      topM: { roughness: 1, envMapIntensity: .03, sheen: .35, sheenColor: '#2f8f55', sheenRoughness: 1 }, body: { c: '#5c1e12', r: .38, cc: .5 }, wall: { c: '#0a3a1f', r: .95 }, caseC: { c: '#161616', r: .4, m: .1 }, lidC: { c: '#1c1c1c', r: .35, m: .15 }, velvet: { c: '#5a0f18', sheen: '#ff6070' },
      trim: { k: 'metal', c: '#e3bd62' }, rim: { k: 'metal', c: '#e0b85a' }, glow: .24, chips: true, okOff: ['#14472a', '#0d331e', 'rgba(233,199,106,.75)'],
    },
    // 落書き: a page of a school notebook — ruled lines, the red margin, pencil rings, doodles in coloured pens; a cardboard body
    doodle: {
      bg(c, W, H, PX) { c.fillStyle = '#fbf9f1'; c.fillRect(0, 0, W, H); const R = rnd(3); for (let i = 0; i < W * H / 60; i++) { c.fillStyle = 'rgba(120,100,60,.05)'; c.fillRect(R() * W, R() * H, 1.5, 1.5); }
        c.strokeStyle = 'rgba(90,140,220,.32)'; c.lineWidth = Math.max(1, PX * .012); for (let y = PX * .5; y < H; y += PX * .3) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.strokeStyle = 'rgba(230,80,80,.55)'; c.lineWidth = PX * .018; c.beginPath(); c.moveTo(PX * .3, 0); c.lineTo(PX * .3, H); c.stroke(); },
      field(c, x, y, w, h, PX) { pencilRect(c, x, y, w, h, rnd(Math.round(x + y * 3)), 'rgba(60,60,70,.75)', PX * .022); },
      rowLine: null,
      num(c, x, y, s, PX, r) { c.save(); c.translate(x, y); c.rotate((r % 3 - 1) * .08); numText(c, s, 0, 0, `700 ${PX * .38}px "Comic Sans MS","Chalkboard SE","Marker Felt",cursive`, '#2b4fa8'); c.restore(); },
      sock(c, x, y, r, k, row) { const R = rnd(101 + k * 17 + row * 131); pencilCircle(c, x, y, r * 1.14, R, 'rgba(70,70,80,.7)', r * .06, 1.12); if (R() < .35) pencilCircle(c, x, y, r * 1.24, R, DOODLE_INK[Math.floor(R() * DOODLE_INK.length)], r * .05, .9); },
      plate(c, x, y, w, h, PX) { pencilRect(c, x, y, w, h, rnd(Math.round(y)), 'rgba(70,70,80,.55)', PX * .016); },
      pin(c, x, y, r) { pencilCircle(c, x, y, r * 1.15, rnd(Math.round(x * 7 + y)), 'rgba(70,70,80,.7)', r * .12); },
      bed(c, x, y, w, h, PX) { pencilRect(c, x, y, w, h, rnd(Math.round(x + h)), 'rgba(70,70,80,.6)', PX * .02); c.save(); rr(c, x, y, w, h, 6); c.clip(); c.strokeStyle = 'rgba(70,70,80,.08)'; c.lineWidth = 2; for (let i = -h; i < w; i += PX * .14) { c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + h, y); c.stroke(); } c.restore(); },
      title(c, x, y, PX) { c.save(); c.translate(x, y); c.rotate(-.04); c.fillStyle = 'rgba(255,236,60,.55)'; c.fillRect(-PX * 1.55, -PX * .2, PX * 3.1, PX * .4); c.font = `700 ${PX * .34}px "Comic Sans MS","Chalkboard SE","Marker Felt",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#d6453f'; c.fillText('Hit & Blow!!', 0, 0); c.restore(); },
      deco(c, W, H, PX, A) { const R = rnd(11); A.forEach(([x, y], i) => { c.strokeStyle = DOODLE_INK[i % DOODLE_INK.length]; c.lineWidth = PX * .025; c.lineCap = c.lineJoin = 'round'; DOODLE[Math.floor(R() * DOODLE.length)](c, x, y, PX * (.32 + R() * .18)); }); },
      lid(c, W, H, n, PX) { c.fillStyle = '#fbf9f1'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(90,140,220,.3)'; c.lineWidth = 1.5; for (let y = PX * .18; y < H; y += PX * .22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        const R = rnd(5); c.save(); c.translate(0, H / 2); for (let k = 0; k < n; k++) { const x = (k + .5) / n * W; c.strokeStyle = DOODLE_INK[k % 4]; c.lineWidth = PX * .03; DOODLE[2](c, x, 0, PX * .62); } c.restore();
        pencilRect(c, 8, 8, W - 16, H - 16, R, 'rgba(60,60,70,.6)', 2.5); },
      body: { c: '#c9a46c', r: .95 }, wall: { c: '#a8865a', r: .95 }, caseC: { c: '#e2483f', r: .7 }, lidC: { c: '#f2efe4', r: .85 }, velvet: { c: '#d9d4c4' },
      trim: { k: 'matte', c: '#2b4fa8' }, rim: { k: 'none' }, okFont: '700 62px "Comic Sans MS","Chalkboard SE","Marker Felt",cursive', glow: .32, okOff: ['#f3eee0', '#e2dccb', '#2b4fa8'],
    },
    // くだもの: a fruit-stand crate — pale wood, a cream face with citrus slices round the sockets, berries and leaves in the margins
    fruit: {
      bg(c, W, H, PX) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff3d6'); g.addColorStop(1, '#ffe7c2'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,170,120,.12)'; for (let y = 0; y < H; y += PX * .5) for (let x = (y / (PX * .5)) % 2 ? PX * .25 : 0; x < W; x += PX * .5) { c.beginPath(); c.arc(x, y, PX * .05, 0, 7); c.fill(); } },
      field(c, x, y, w, h, PX, fill) { rr(c, x, y, w, h, PX * .3); if (fill) { c.fillStyle = 'rgba(255,255,255,.45)'; c.fill(); } c.strokeStyle = '#7cc35a'; c.lineWidth = PX * .03; c.setLineDash([PX * .1, PX * .07]); c.stroke(); c.setLineDash([]); },
      rowLine: 'rgba(124,195,90,.22)',
      num(c, x, y, s, PX, r, n) { const LEAF = ['#9be15a', '#6cc04a', '#3f9a3a', '#b8c934', '#f2c12e', '#f2922a', '#e2552f', '#b8322e'], t = (n > 1 ? r / (n - 1) : 0) * (LEAF.length - 1), i0 = Math.floor(t), col = mix(LEAF[i0], LEAF[Math.min(LEAF.length - 1, i0 + 1)], t - i0);   // (the leaves turn as the rows go by — fresh green to autumn red, 2026-11-18 user)
        FRUIT.leaf(c, x - PX * .02, y, PX * .78, -.25, col, mix(col, '#1c3a10', .45)); numText(c, s, x - PX * .02, y, `800 ${PX * .26}px "Outfit", system-ui, sans-serif`, '#ffffff'); },
      sock(c, x, y, r, k) { const [rind, pulp] = FRUITS[k % FRUITS.length]; c.fillStyle = rind; c.beginPath(); c.arc(x, y, r * 1.14, 0, 7); c.fill(); c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(x, y, r * 1.09, 0, 7); c.fill(); c.fillStyle = pulp; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.beginPath(); c.arc(x, y, r * 1.06, a + .05, a + Math.PI / 5 - .05); c.arc(x, y, r * .95, a + Math.PI / 5 - .05, a + .05, true); c.closePath(); c.fill(); } },   // (thin: the rings ran into each other, 2026-11-17 user)
      plate(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .2); c.fillStyle = '#ffd9c8'; c.fill(); c.strokeStyle = '#ff9f87'; c.lineWidth = PX * .02; c.stroke(); },
      pin(c, x, y, r) { c.fillStyle = '#b2513a'; c.beginPath(); c.arc(x, y, r * 1.15, 0, 7); c.fill(); },
      bed(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .3); c.fillStyle = 'rgba(124,195,90,.16)'; c.fill(); c.strokeStyle = '#7cc35a'; c.lineWidth = PX * .02; c.setLineDash([PX * .1, PX * .07]); c.stroke(); c.setLineDash([]); },
      title(c, x, y, PX) { c.font = `900 ${PX * .32}px "Outfit", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const s = 'HIT & BLOW', cols = ['#ff8a1e', '#ec3f6a', '#56b33a', '#f2b400', '#9a5ad8']; let w = c.measureText(s).width, xx = x - w / 2; c.textAlign = 'left'; [...s].forEach((ch, i) => { c.fillStyle = cols[i % cols.length]; c.fillText(ch, xx, y); xx += c.measureText(ch).width; }); },
      deco(c, W, H, PX, A) { const R = rnd(19), F = ['cherry', 'berry', 'lemon', 'slice', 'leaf']; A.forEach(([x, y], i) => { const f = F[i % F.length]; if (f === 'slice') FRUIT.slice(c, x, y, PX * .5); else if (f === 'leaf') FRUIT.leaf(c, x, y, PX * .45, R() * 3); else FRUIT[f](c, x, y, PX * .52); }); },
      lid(c, W, H, n, PX) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe16a'); g.addColorStop(1, '#ffc93a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.save(); c.translate(0, H / 2); for (let k = 0; k < n; k++) { const x = (k + .5) / n * W; FRUIT.slice(c, x, 0, PX * .78, ...FRUITS[k % FRUITS.length]); qmark(c, x, PX * .09, '#ffffff'); } c.restore();
        c.strokeStyle = '#ff8a1e'; c.lineWidth = 3; c.setLineDash([10, 7]); rr(c, 8, 8, W - 16, H - 16, PX * .14); c.stroke(); c.setLineDash([]); },
      body: { c: '#e2bf86', r: .7 }, wall: { c: '#c79a5e', r: .8 }, caseC: { c: '#c98f4a', r: .75 }, lidC: { c: '#ffd34a', r: .6 }, velvet: { c: '#7cc35a', sheen: '#d8ff9a' },
      trim: { k: 'matte', c: '#ec3f6a' }, rim: { k: 'matte', c: '#7cc35a' }, glow: .3, okOff: ['#fff1cf', '#ffe2a6', '#c06a1e'], okBody: { c: '#7cc35a', r: .6 },
      // the OK key as the board (2026-11-17 user: OKのボタンとフォントを盤のイメージと合わせて): a cream face with a stitched green edge, an
      // orange slice behind the letters, O in orange and K in green with a white edge; when the row is full it ripens — the face turns
      // to orange juice and the letters go white
      okDraw(c, W, H, on) { const g = c.createLinearGradient(0, 0, 0, H); if (on) { g.addColorStop(0, '#ffc25a'); g.addColorStop(1, '#ff8a1e'); } else { g.addColorStop(0, '#fff6df'); g.addColorStop(1, '#ffe7c2'); } c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.strokeStyle = on ? '#fff3d6' : '#7cc35a'; c.lineWidth = 5; c.setLineDash([12, 8]); rr(c, 9, 9, W - 18, H - 18, 18); c.stroke(); c.setLineDash([]);
        c.save(); c.globalAlpha = on ? .35 : .5; FRUIT.slice(c, W / 2, H / 2, H * .82, on ? '#ffffff' : '#ff9a1e', on ? '#ffe7a0' : '#ffd27a'); c.restore();
        FRUIT.leaf(c, W * .82, H * .2, H * .3, -.6);
        c.font = '900 62px "Outfit", system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.lineJoin = 'round'; const wO = c.measureText('O').width, wK = c.measureText('K').width, x0 = W / 2 - (wO + wK) / 2;
        [['O', x0, on ? '#ffffff' : '#ff8a1e'], ['K', x0 + wO, on ? '#ffffff' : '#56b33a']].forEach(([ch, x, col]) => { c.strokeStyle = on ? '#e0661a' : '#ffffff'; c.lineWidth = 10; c.strokeText(ch, x, H / 2 + 4); c.fillStyle = col; c.fillText(ch, x, H / 2 + 4); }); },
    },
    // 暗号機: a 1920s cipher machine — an oak box, a black crackle-paint face, brass-ringed sockets and brass number plates,
    // screws in the corners; the lid shows three rotor windows
    cipher: {
      bg(c, W, H, PX) { c.fillStyle = '#1b1a17'; c.fillRect(0, 0, W, H); const R = rnd(23); for (let i = 0; i < W * H / 14; i++) { const v = R(); c.fillStyle = v < .5 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,240,.05)'; c.fillRect(R() * W, R() * H, 2, 2); }
        [[PX * .22, PX * .22], [W - PX * .22, PX * .22], [PX * .22, H - PX * .22], [W - PX * .22, H - PX * .22]].forEach(([x, y]) => screw(c, x, y, PX * .07)); },
      field(c, x, y, w, h, PX, fill) { rr(c, x, y, w, h, PX * .12); if (fill) { c.fillStyle = 'rgba(0,0,0,.3)'; c.fill(); } c.strokeStyle = '#b8914a'; c.lineWidth = PX * .018; c.stroke(); },
      rowLine: 'rgba(184,145,74,.18)',
      num(c, x, y, s, PX) { const w = PX * .46, h = PX * .36; c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, x - w / 2 + 2, y - h / 2 + 3, w, h, PX * .04); c.fill(); },   // (the plate itself is real brass — board(): S.plates3d)
      sock(c, x, y, r) { c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(x + r * .05, y + r * .08, r * 1.24, 0, 7); c.fill(); brass(c, x, y, r * .99, r * 1.2); c.strokeStyle = 'rgba(60,40,10,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r * 1.2, 0, 7); c.stroke(); },
      plate(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .06); c.fillStyle = '#0f0f0d'; c.fill(); c.strokeStyle = '#8a6a34'; c.lineWidth = PX * .014; c.stroke(); [[x + PX * .07, y + PX * .07], [x + w - PX * .07, y + PX * .07], [x + PX * .07, y + h - PX * .07], [x + w - PX * .07, y + h - PX * .07]].forEach(([a, b]) => screw(c, a, b, PX * .035)); },
      pin(c, x, y, r) { brass(c, x, y, r * .98, r * 1.3); },
      bed(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .12); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill(); c.strokeStyle = 'rgba(184,145,74,.6)'; c.lineWidth = PX * .014; c.stroke(); },
      title(c, x, y, PX) { const w = PX * 2.6, h = PX * .34; c.fillStyle = 'rgba(0,0,0,.45)'; rr(c, x - w / 2 + 2, y - h / 2 + 3, w, h, PX * .05); c.fill(); },
      deco(c, W, H, PX, A) { A.forEach(([x, y], i) => { c.font = `700 ${PX * .2}px "Courier New", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(184,145,74,.32)'; c.fillText('QWERTZUIOASDFGHJKPYXCVBNML'.substr((i * 5) % 22, 4).split('').join(' '), x, y); }); },
      lid(c, W, H, n, PX) { c.fillStyle = '#1b1a17'; c.fillRect(0, 0, W, H); const R = rnd(29); for (let i = 0; i < W * H / 14; i++) { c.fillStyle = R() < .5 ? 'rgba(0,0,0,.35)' : 'rgba(255,255,240,.05)'; c.fillRect(R() * W, R() * H, 2, 2); }
        c.save(); c.translate(0, H / 2); for (let k = 0; k < n; k++) { const x = (k + .5) / n * W, w2 = PX * .3, h2 = PX * .4; brass(c, x, 0, 0, 0); const g = c.createLinearGradient(0, -h2, 0, h2); g.addColorStop(0, '#6b5a3a'); g.addColorStop(.25, '#efe4c8'); g.addColorStop(.75, '#efe4c8'); g.addColorStop(1, '#6b5a3a'); c.fillStyle = '#b8863c'; rr(c, x - w2 - 4, -h2 - 4, w2 * 2 + 8, h2 * 2 + 8, 6); c.fill(); c.fillStyle = g; c.fillRect(x - w2, -h2, w2 * 2, h2 * 2); qmark(c, x, PX * .09, '#2a1d0e'); } c.restore();
        screw(c, 14, 14, 6); screw(c, W - 14, 14, 6); screw(c, 14, H - 14, 6); screw(c, W - 14, H - 14, 6); },
      body: { c: '#6e4524', r: .5, cc: .35 }, wall: { c: '#121110', r: .8 }, caseC: { c: '#5a381c', r: .5, cc: .3 }, lidC: { c: '#1c1b18', r: .7 }, velvet: { c: '#1d2a1f', sheen: '#6f9a70' },
      trim: { k: 'metal', c: '#c9a24e' }, rim: { k: 'metal', c: '#c9a24e' }, rings: { c: '#d8ae58' }, plates3d: true, glow: .42, okOff: ['#2a2723', '#151412', 'rgba(232,200,130,.8)'],
    },
    // 金庫: a bank vault — brushed steel, rivets round the edge, chrome-ringed sockets, engraved numbers; the lid is the safe's dial
    vault: {
      // duralumin (2026-11-18 user: 盤面の質感をより金属（ジュラルミン）っぽく): a cool pale aluminium, rolled lengthwise — long fine
      // streaks and a soft sheen band; the material itself is metal, so the room's light slides across it. The screws are 3D (board(): S.screws3d)
      bg(c, W, H, PX) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#c9d0d6'); g.addColorStop(.35, '#eef1f3'); g.addColorStop(.55, '#d3d9de'); g.addColorStop(.8, '#f2f4f5'); g.addColorStop(1, '#bfc6cd'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = rnd(31); for (let i = 0; i < W * 1.2; i++) { const x = R() * W, a = R() * .1; c.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '60,70,82'},${a.toFixed(3)})`; c.fillRect(x, 0, 1 + R() * 1.5, H); }
        for (let y = 0; y < H; y += 3) { c.fillStyle = `rgba(255,255,255,${(R() * .05).toFixed(3)})`; c.fillRect(0, y, W, 1); }
        for (let x = PX * .3; x < W - PX * .2; x += PX * .6) { [[x, PX * .2], [x, H - PX * .2]].forEach(([a, b]) => { c.fillStyle = 'rgba(30,36,42,.28)'; c.beginPath(); c.arc(a + 1.5, b + 2, PX * .07, 0, 7); c.fill(); }); }
        for (let y = PX * .8; y < H - PX * .5; y += PX * .6) { [[PX * .2, y], [W - PX * .2, y]].forEach(([a, b]) => { c.fillStyle = 'rgba(30,36,42,.28)'; c.beginPath(); c.arc(a + 1.5, b + 2, PX * .07, 0, 7); c.fill(); }); } },
      field(c, x, y, w, h, PX, fill) { rr(c, x, y, w, h, PX * .1); if (fill) { c.fillStyle = 'rgba(40,48,56,.12)'; c.fill(); } c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = PX * .02; c.save(); c.translate(1.5, 1.5); c.stroke(); c.restore(); c.strokeStyle = 'rgba(30,36,42,.55)'; c.stroke(); },
      rowLine: 'rgba(30,36,42,.18)',
      num(c, x, y, s, PX) { const f = `800 ${PX * .3}px "Outfit", system-ui, sans-serif`; numText(c, s, x + 1.2, y + 1.6, f, 'rgba(255,255,255,.85)'); numText(c, s, x, y, f, 'rgba(36,42,50,.8)'); },
      sock(c, x, y, r) { c.fillStyle = 'rgba(20,24,30,.3)'; c.beginPath(); c.arc(x + r * .04, y + r * .06, r * 1.13, 0, 7); c.fill(); chrome(c, x, y, r * .99, r * 1.11); },   // (thin: the rings ran into each other, 2026-11-17 user)
      plate(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .08); c.fillStyle = 'rgba(40,48,56,.32)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; c.stroke(); },
      pin(c, x, y, r) { chrome(c, x, y, r * .98, r * 1.18); },
      bed(c, x, y, w, h, PX) { rr(c, x, y, w, h, PX * .12); c.fillStyle = 'rgba(40,48,56,.2)'; c.fill(); c.strokeStyle = 'rgba(30,36,42,.45)'; c.lineWidth = PX * .015; c.stroke(); },
      deco() {},
      lid(c, W, H, n, PX) { const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#5a636d'); g.addColorStop(.5, '#7c858f'); g.addColorStop(1, '#4b535c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
        const R = rnd(37); for (let y = 0; y < H; y += 1.5) { c.fillStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${(R() * .08).toFixed(3)})`; c.fillRect(0, y, W, 1); }
        const cx = W / 2, cy = H / 2, rd = Math.min(H * .4, W * .2); { const sg = c.createRadialGradient(cx + 4, cy + 6, rd * .8, cx + 4, cy + 6, rd * 1.2); sg.addColorStop(0, 'rgba(0,0,0,.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.beginPath(); c.arc(cx + 4, cy + 6, rd * 1.2, 0, 7); c.fill(); }   /* (the dial itself stands on the lid in 3D — board(): S.dial3d) */
        c.save(); c.translate(0, cy); [-1, 1].forEach(s => { for (let k = 0; k < Math.ceil(n / 2); k++) { const x = cx + s * (rd + PX * .35 + k * PX * .62); if (x < PX * .3 || x > W - PX * .3) continue; c.fillStyle = '#20262c'; rr(c, x - PX * .22, -PX * .26, PX * .44, PX * .52, 5); c.fill(); qmark(c, x, PX * .07, '#9fe3ff', '#59c8ff'); } }); c.restore();
        [[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]].forEach(([x, y]) => rivet(c, x, y, 5)); },
      topM: { metalness: .55, roughness: .3, envMapIntensity: 1.3 }, screws3d: true, dial3d: true, body: { c: '#8f979f', r: .3, m: .85 }, wall: { c: '#3a4047', r: .5, m: .5 }, caseC: { c: '#2c3137', r: .4, m: .6 }, lidC: { c: '#4a525b', r: .35, m: .7 }, velvet: { c: '#1b2a4a', sheen: '#6f8cff' },
      trim: { k: 'metal', c: '#d9dee3' }, rim: { k: 'metal', c: '#d9dee3' }, glow: .36, okOff: ['#59616a', '#3c434a', 'rgba(235,240,245,.8)'],
    },
  };
  // a cross-head screw: a low chrome dome with the slot cut in (2026-11-18 user: ビスを本物っぽく立体的に)
  function screws(g, w, d, zc, PX, y) {
    const TT = T(), W = Math.round(w * PX), H = Math.round(d * PX), m = mat('hbScrewM', () => { const tx = X.canvasTex('hbScrewT', 64, 64, (c, S) => { const gr = c.createRadialGradient(S * .38, S * .34, S * .04, S / 2, S / 2, S / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#c3cad1'); gr.addColorStop(1, '#6d757e'); c.fillStyle = gr; c.fillRect(0, 0, S, S); c.strokeStyle = '#2a3036'; c.lineWidth = S * .1; c.lineCap = 'round'; c.beginPath(); c.moveTo(S * .3, S / 2); c.lineTo(S * .7, S / 2); c.moveTo(S / 2, S * .3); c.lineTo(S / 2, S * .7); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = S * .03; c.beginPath(); c.moveTo(S * .32, S / 2 + S * .05); c.lineTo(S * .68, S / 2 + S * .05); c.stroke(); }); return X.M({ map: tx, metalness: .9, roughness: .22, envMapIntensity: 1.8, bump: false }); });
    const geoS = geo('hbScrew', () => { const q = new TT.SphereGeometry(.06, LO() ? 8 : 12, 4, 0, Math.PI * 2, 0, Math.PI / 2); q.scale(1, .45, 1); const P = q.attributes.position, uv = q.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / .12, .5 - P.getZ(i) / .12); uv.needsUpdate = true; return q; });
    const at = (px, py) => { const o = new TT.Mesh(geoS, m); o.position.set(px / PX - w / 2, y, zc + py / PX - d / 2); o.rotation.y = (px * 7 + py * 3) % 6.28; o.castShadow = true; g.add(o); };
    for (let x = PX * .3; x < W - PX * .2; x += PX * .6) { at(x, PX * .2); at(x, H - PX * .2); }
    for (let yy = PX * .8; yy < H - PX * .5; yy += PX * .6) { at(PX * .2, yy); at(W - PX * .2, yy); }
  }
  const topOpts = (S, o) => { const t = S.topM; if (!t) return o; const r = Object.assign(o, t); if (t.sheenColor) r.sheenColor = new (T().Color)(t.sheenColor); return r; };
  const LOOKS = ['midnight', 'casino', 'doodle', 'fruit', 'cipher', 'vault'];
  const lookNow = k => LOOKS.includes(k) ? k : (X.BOARDS && X.BOARDS.hitblow ? X.BOARDS.hitblow.get() : 'midnight');
  const skinMat = (k, o) => mat('hbS' + k, () => X.M({ color: o.c, roughness: o.r == null ? .7 : o.r, metalness: o.m || 0, clearcoat: o.cc || 0, clearcoatRoughness: .3, envMapIntensity: o.m ? .8 : .2, bump: false }));
  const rimMat = (key, o) => o.k === 'neon' ? neonMat(o.c, 1.5) : o.k === 'metal' ? mat('hbRimM' + o.c, () => X.M({ color: o.c, metalness: 1, roughness: .14, envMapIntensity: 1.7, bump: false })) : mat('hbRimMt' + o.c, () => X.M({ color: o.c, roughness: .6, bump: false }));

  function board(cfg, look) {
    const TT = T(), Lt = layout(cfg), g = new TT.Group(), BH = TOP; look = lookNow(look); const S = SKINS[look];
    const bodyM = skinMat('body' + look, S.body), wallM = S.wall ? skinMat('wall' + look, S.wall) : bodyM;
    // the slab: lacquered body, the printed top, a neon tube round the top edge
    const body = X.mesh(geo('hbBody' + cfg.n + 'x' + cfg.rows, () => rbox(Lt.W, Lt.L, BH - HOLE, .38, .08)), bodyM); body.receiveShadow = true; g.add(body);
    const pr = Lt.n > 4 ? .1 : .11, holes = [];
    for (let r = 0; r < Lt.rows; r++) for (let k = 0; k < Lt.n; k++) { const [x, z] = Lt.slot(r, k); holes.push([x, z, R + .03, LO() ? 16 : 20]); const [px, pz] = Lt.pinPos(r, k); holes.push([px, pz, pr, LO() ? 8 : 10]); }
    const top = new TT.Mesh(plate(Lt.W - .16, Lt.L - .16, .3, holes, 'B' + cfg.n + 'x' + cfg.rows, Lt.W, Lt.L), [mat('hbTopM' + look + cfg.n + 'x' + cfg.rows, () => (() => { const tt = topTex(cfg, Lt, look), m = X.M(topOpts(S, { map: tt, emissiveMap: tt, emissive: '#ffffff', emissiveIntensity: S.glow, roughness: .9, envMapIntensity: .12, bump: false })); m.emissive.set(0xffffff); return m; })()), wallM]);   // (matte: the room's lamp glared on the glossy top, 2026-11-16)
    top.position.y = BH - HOLE; top.receiveShadow = true; g.add(top);
    const floor = rplane(Lt.W - .2, Lt.L - .2, .28, wallM); floor.position.y = BH - HOLE + .002; floor.receiveShadow = true; g.add(floor);   // (the holes' floor: the skin's own, not the body's)
    const rim = (() => {
      const w = Lt.W / 2 - .07, d = Lt.L / 2 - .07, r = .31, pts = [];
      rimPts(pts, w, d, r);
      const t = new TT.Mesh(geo('hbRim2' + cfg.n + 'x' + cfg.rows, () => rimTube(pts)), rimMat(look, S.rim));
      t.visible = S.rim.k !== 'none';
      t.position.y = BH + .01; return t;
    })();
    g.add(rim);
    if (S.screws3d) screws(g, Lt.W, Lt.L, 0, LO() ? 56 : 84, BH + .002);
    // cipher: the brass round each socket and pin hole is real metal (a flat torus), so it glints as the view moves
    if (S.rings) { const rm = mat('hbRingM' + look, () => X.M({ color: S.rings.c, metalness: 1, roughness: .16, envMapIntensity: 2, bump: false }));
      const big = geo('hbRingB', () => { const q = new TT.TorusGeometry(R + .075, .042, 4, LO() ? 18 : 26); q.rotateX(Math.PI / 2); q.scale(1, .45, 1); return q; }), small = geo('hbRingS' + pr, () => { const q = new TT.TorusGeometry(pr + .03, .02, 3, LO() ? 10 : 14); q.rotateX(Math.PI / 2); q.scale(1, .5, 1); return q; });
      for (let r = 0; r < Lt.rows; r++) for (let k = 0; k < Lt.n; k++) { const [x, z] = Lt.slot(r, k); const o = new TT.Mesh(big, rm); o.position.set(x, BH + .006, z); g.add(o); const [px, pz] = Lt.pinPos(r, k); const q = new TT.Mesh(small, rm); q.position.set(px, BH + .004, pz); g.add(q); } }
    // cipher: the number plates and the name plate are real brass (2026-11-17 user: HIT BLOW〜の部分や左のナンバーも金属光沢), the lettering
    // stamped dark into them — the metal catches the light as the view turns
    if (S.plates3d) {
      const plate = (key, w, d, draw) => { const m = mat('hbPlate' + key, () => { const tx = X.canvasTex('hbPlateT' + key, Math.round(w * 200), Math.round(d * 200), (c, W, H) => { H = H || Math.round(d * 200); const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffe7a8'); g.addColorStop(.5, '#e2b860'); g.addColorStop(1, '#f6d690'); c.fillStyle = g; c.fillRect(0, 0, W, H); draw(c, W, H); }); return X.M({ map: tx, metalness: 1, roughness: .2, envMapIntensity: 2.2, bump: false }); });
        const bm = mat('hbPlateBody', () => X.M({ color: '#d6a94e', metalness: 1, roughness: .22, envMapIntensity: 2.2, bump: false }));
        const o = new TT.Group(), b = X.mesh(geo('hbPlateG' + w + 'x' + d, () => rbox(w, d, .03, .04, .008)), bm); b.castShadow = true; o.add(b);
        const f = planeTop(w - .03, d - .03, m); f.position.y = .0315; o.add(f); return o; };   // (the face as a plane of its own: the extruded box's UVs are in metres, the lettering had gone off it)
      const etch = (c, s, W, H, k) => { c.font = `700 ${H * k}px "Courier New", ui-monospace, monospace`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; const tm = c.measureText(s), y = H / 2 + (tm.actualBoundingBoxAscent - tm.actualBoundingBoxDescent) / 2; c.fillStyle = 'rgba(255,250,220,.7)'; c.fillText(s, W / 2 + 1, y + 1.5); c.fillStyle = '#2a1d0e'; c.fillText(s, W / 2, y); };
      const screwAt = (c, x, y, r) => screw(c, x, y, r);
      for (let r = 0; r < Lt.rows; r++) { const p = plate('n' + r, .46, .36, (c, W, H) => etch(c, String(r + 1), W, H, .62)); p.position.set(Lt.labX + .12, BH, Lt.z0 + (r + .5) * ROWP); g.add(p); }
      const tw = 2.6 * .7, td = .34 * .7, tp = plate('title', tw, td, (c, W, H) => { etch(c, 'HIT · BLOW  CHIFFRIER', W, H, .5); screwAt(c, H * .5, H / 2, H * .16); screwAt(c, W - H * .5, H / 2, H * .16); }); tp.position.set(0, BH, Lt.z0 + Lt.rows * ROWP + .245); g.add(tp);
    }
    // casino: the row numbers are real poker chips, two stacked (2026-11-17 user: 左側のカジノチップが立体感ある方がいい)
    if (S.chips) for (let r = 0; r < Lt.rows; r++) {
      const red = !(r % 2), side = mat('hbRowChipS' + (red ? 'r' : 'k'), () => { const tx = X.canvasTex('hbRowChipSide' + (red ? 'r' : 'k'), 128, 16, (c, W, H) => { H = H || 16; c.fillStyle = red ? '#b81d28' : '#1b1b1b'; c.fillRect(0, 0, W, H); c.fillStyle = '#f4efe2'; for (let i = 0; i < 6; i++) c.fillRect(i * W / 6 + W / 24, 0, W / 12, H); }); return X.M({ map: tx, roughness: .5, bump: false }); });
      const face = mat('hbRowChipF' + r, () => { const tx = X.canvasTex('hbRowChipFace' + r, 128, 128, (c, W) => { const col = red ? '#c3202b' : '#1c1c1c'; c.fillStyle = col; c.fillRect(0, 0, W, W); c.fillStyle = '#f4efe2'; for (let i = 0; i < 8; i++) { c.save(); c.translate(W / 2, W / 2); c.rotate(i / 8 * Math.PI * 2); c.fillRect(W * .38, -W * .06, W * .12, W * .12); c.restore(); } c.strokeStyle = '#f4efe2'; c.lineWidth = W * .025; c.setLineDash([W * .05, W * .035]); c.beginPath(); c.arc(W / 2, W / 2, W * .3, 0, 7); c.stroke(); c.setLineDash([]); numText(c, String(r + 1), W / 2, W / 2, `800 ${W * (r >= 9 ? .3 : .36)}px "Outfit", system-ui, sans-serif`, '#f4efe2'); }); const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .25, roughness: .45, bump: false }); m.emissive.set(0xffffff); return m; });
      const z = Lt.z0 + (r + .5) * ROWP, x = Lt.labX + .12;
      [0, 1].forEach(k => { const y = BH + .045 + k * .062, dx = k ? 0 : .025, dz = k ? 0 : .02;
        const sd = X.mesh(geo('hbRowChipG', () => new TT.CylinderGeometry(.26, .26, .06, LO() ? 14 : 20, 1, true)), side); sd.position.set(x + dx, y - .03 + .001, z + dz); sd.castShadow = true; g.add(sd);
        const tp = X.mesh(geo('hbRowChipT', () => { const c = new TT.CircleGeometry(.26, LO() ? 14 : 20); c.rotateX(-Math.PI / 2); return c; }), k ? face : side); tp.position.set(x + dx, y + .001, z + dz); g.add(tp); });
    }
    // the case: a tray with the code's sockets, a lid on a hinge at its far edge
    const cw = Lt.caseW, cd = Lt.caseD - .2, ch = .34;
    const tray = new TT.Group(); tray.position.set(Lt.caseX, BH, Lt.caseZ); g.add(tray);
    const shell = X.mesh(geo('hbCase' + cfg.n, () => rbox(cw, cd, ch, .22, .05)), skinMat('case' + look, S.caseC));
    tray.add(shell);
    const velvet = planeTop(cw - .2, cd - .22, mat('hbVelvet' + look, () => X.M(Object.assign({ color: S.velvet.c, roughness: .95, bump: false }, S.velvet.sheen ? { sheen: 1, sheenColor: new (T().Color)(S.velvet.sheen) } : {}))));
    velvet.position.y = ch + .003; tray.add(velvet);
    const caseSlots = [];
    for (let k = 0; k < cfg.n; k++) {
      const x = (k + .5 - cfg.n / 2) * PITCH;
      const cup = X.mesh(geo('hbCup', () => { const c = new TT.CircleGeometry(R + .06, 20); c.rotateX(-Math.PI / 2); return c; }), mat('hbCupM', () => new TT.MeshBasicMaterial({ color: 0x07040e, transparent: true, opacity: .75, depthWrite: false })));
      cup.position.set(x, ch + .006, 0); cup.renderOrder = 1; tray.add(cup);
      // each piece stands on the velvet, but no higher than fits under the closed lid (2026-11-17 user: 答えの中身が入ってない — the flat
      // pieces (fruit tokens, card coins, chips) had been sunk under the velvet, where nothing showed when the lid opened)
      const topH = { midnight: .82, casino: .36, doodle: .2, fruit: .22, cipher: .44, vault: .5 }[look] * R;
      caseSlots.push([Lt.caseX + x, Math.min(BH + ch + R * .14 + .004, BH + ch + .2 - topH), Lt.caseZ]);   // (low enough to stay inside the closed lid — the fruit stands taller: it sits down in the velvet)
    }
    const trim = new TT.Mesh(geo('hbTrim' + cfg.n, () => { const b = new TT.BoxGeometry(cw - .1, .03, .03); return b; }), rimMat(look, S.trim)); trim.position.set(0, ch * .55, cd / 2 + .005); tray.add(trim);
    // the lid (pivot on the far edge of the case)
    const hinge = new TT.Group(); hinge.position.set(Lt.caseX, BH + ch, Lt.caseZ - cd / 2); g.add(hinge);
    const lidG = new TT.Group(); lidG.position.set(0, 0, cd / 2); hinge.add(lidG);
    const lidM = skinMat('lid' + look, S.lidC);
    const lid = X.mesh(geo('hbLid' + cfg.n, () => rbox(cw + .14, cd + .14, .22, .26, .06)), lidM); lidG.add(lid);
    // the skirt: the lid comes down over the case like a cap (2026-11-16 user: ケースで覆い被さるように — no gap to see into from the side)
    const skirt = X.mesh(geo('hbSkirt' + cfg.n, () => rframe(cw + .14, cd + .14, .17, .26, .06)), lidM); skirt.position.y = -.16; lidG.add(skirt);
    const lidFace = planeTop(cw - .16, cd - .16, mat('hbLidFace' + look + cfg.n, () => X.M({ map: lidTex(cfg.n, cw - .16, cd - .16, look), emissiveMap: lidTex(cfg.n, cw - .16, cd - .16, look), emissive: '#ffffff', emissiveIntensity: S.glow + .05, roughness: .85, envMapIntensity: .12, bump: false, transparent: false })));
    lidFace.material.emissive.set(0xffffff); lidFace.position.y = .224; lidG.add(lidFace);
    // vault: the combination dial stands on the lid (2026-11-18 user: 中央の金庫のダイアルを立体に) — a chrome bezel, the dark dial with its
    // 0–9 numbers and 40 ticks, a ribbed knob on top and the index mark above it; it turns a little when the lid opens (userData.dial)
    if (S.dial3d) {
      const fw = cw - .16, fd = cd - .16, rd = Math.min(fd * .4, fw * .2), chromeM = mat('hbChromeM', () => X.M({ color: '#e6eaee', metalness: 1, roughness: .12, envMapIntensity: 2, bump: false }));
      const dial = new TT.Group(); dial.position.set(0, .224, 0); lidG.add(dial);
      const bez = X.mesh(geo('hbDialBez' + rd.toFixed(3), () => { const q = new TT.CylinderGeometry(rd, rd * 1.06, .05, LO() ? 24 : 40); q.translate(0, .025, 0); return q; }), chromeM); dial.add(bez);
      const ring = X.mesh(geo('hbDialRing' + rd.toFixed(3), () => { const q = new TT.TorusGeometry(rd * .97, rd * .05, 6, LO() ? 24 : 40); q.rotateX(Math.PI / 2); q.translate(0, .05, 0); return q; }), chromeM); dial.add(ring);
      const turn = new TT.Group(); turn.position.y = .052; dial.add(turn);
      const face = X.mesh(geo('hbDialFace' + rd.toFixed(3), () => { const q = new TT.CylinderGeometry(rd * .86, rd * .86, .03, LO() ? 24 : 40); q.translate(0, .015, 0); return q; }), [mat('hbDialSide', () => X.M({ color: '#30363c', metalness: .6, roughness: .35, bump: false })), mat('hbDialTop', () => { const tx = X.canvasTex('hbDialT', 256, 256, (c, W) => { const cx = W / 2, r = W / 2; c.fillStyle = '#262b30'; c.fillRect(0, 0, W, W); const g = c.createRadialGradient(cx * .8, cx * .7, 4, cx, cx, r); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); c.fillStyle = g; c.fillRect(0, 0, W, W);
          c.strokeStyle = '#eef1f4'; c.fillStyle = '#eef1f4'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${r * .2}px "Outfit", system-ui, sans-serif`;
          for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 - Math.PI / 2, l = i % 4 ? .1 : .18; c.lineWidth = i % 4 ? 2 : 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * .96, cx + Math.sin(a) * r * .96); c.lineTo(cx + Math.cos(a) * r * (.96 - l), cx + Math.sin(a) * r * (.96 - l)); c.stroke(); if (!(i % 4)) c.fillText(String(i / 4), cx + Math.cos(a) * r * .62, cx + Math.sin(a) * r * .62); } }); const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .35, metalness: .5, roughness: .3, envMapIntensity: 1.2, bump: false }); m.emissive.set(0xffffff); return m; }), mat('hbDialSide', () => X.M({ color: '#30363c', metalness: .6, roughness: .35, bump: false }))]);
      turn.add(face);
      const knob = X.mesh(geo('hbDialKnob' + rd.toFixed(3), () => { const q = new TT.CylinderGeometry(rd * .3, rd * .36, .07, LO() ? 16 : 28); q.translate(0, .03 + .035, 0); const P = q.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > rd * .25) { const k = 1 + .06 * Math.cos(a * 14); P.setX(i, x * k); P.setZ(i, z * k); } } q.computeVertexNormals(); return q; }), chromeM); turn.add(knob);
      const cap = X.mesh(geo('hbDialCap' + rd.toFixed(3), () => { const q = new TT.SphereGeometry(rd * .3, LO() ? 12 : 18, 4, 0, Math.PI * 2, 0, Math.PI / 2); q.scale(1, .3, 1); q.translate(0, .1, 0); return q; }), chromeM); turn.add(cap);
      const mark = X.mesh(geo('hbDialMark', () => { const q = new TT.ConeGeometry(rd * .07, rd * .14, 3); q.rotateX(Math.PI / 2); q.rotateY(Math.PI); return q; }), mat('hbDialMarkM', () => X.M({ color: '#ff5a5a', roughness: .4, emissive: '#ff3030', emissiveIntensity: .4, bump: false }))); mark.position.set(0, .055, -rd * 1.0); dial.add(mark);
      turn.rotation.y = .7; dial.userData.turn = turn; lidG.userData.dial = turn;
    }
    // the active row's glow (a soft bar under the row being filled) and the who-guessed lights
    const act = new TT.Mesh(geo('hbAct' + cfg.n, () => { const p = new TT.PlaneGeometry(cfg.n * PITCH + .2, ROWP - .1); p.rotateX(-Math.PI / 2); return p; }), mat('hbActM', () => new TT.MeshBasicMaterial({ color: 0x7df3d2, transparent: true, opacity: .14, depthWrite: false, toneMapped: false })));
    act.renderOrder = 1; act.visible = false; act.position.set(Lt.x0 + cfg.n * PITCH / 2, BH + .006, 0); g.add(act);
    const marks = [];
    const rowMark = (r, who) => {
      if (marks[r]) { g.remove(marks[r]); marks[r] = null; }
      if (who == null) return;
      const c = who === 0 ? '#7df3d2' : who === 1 ? '#ff7ac8' : '#8f98c8';
      const m = new TT.Mesh(geo('hbMark', () => new TT.CylinderGeometry(.07, .07, .03, 12)), neonMat(c, 1.2));
      m.position.set(Lt.labX - .26, BH + .02, Lt.z0 + (r + .5) * ROWP); g.add(m); marks[r] = m;
    };
    g.userData = { cfg, rows: cfg.rows, slot: Lt.slot, pinPos: Lt.pinPos, caseSlot: k => caseSlots[k], lid: hinge, rowZ: r => Lt.z0 + (r + .5) * ROWP, rowMark,
      active: r => { act.visible = r != null && r >= 0; if (act.visible) act.position.z = Lt.z0 + (r + .5) * ROWP; }, W: Lt.W, L: Lt.L, top: BH, pitch: PITCH, look, sock: R + .06, _s: Math.max(Lt.W, Lt.L) / 2, _rb: Math.max(Lt.W, Lt.L) / 2 };
    return g;
  }
  // the input tray (2026-11-16 user: ゲーム盤と入力ボックスを同じ3Dに): a slab joined to the board's near edge, only while playing —
  // the row being made (sockets under the board's columns, the cursor ring), OK on the pins' column, and the palette (bigger gems).
  // Coordinates are the board's. userData: D (depth), z0, sock(k) → [x, z], pal(v) → [x, z], ok → [x, z, w, d], gemS (palette scale),
  // put(k, v|null), cursor(k|-1), okOn(bool), used(v, bool), off(bool)
  // the neon line round a rounded slab (2026-11-17 user: 青いラインをボードの形状と同様に角丸に): the corners are true quarter circles
  // (24 steps each) and the straight sides are sampled densely too, so the spline neither cuts the corners nor bulges on the sides
  function rimPts(pts, w, d, r) {
    const V = (x, z) => pts.push(new (T().Vector3)(x, 0, z)), side = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / .6)); for (let i = 1; i < n; i++) V(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); };
    const arc = (cx, cz, a0) => { for (let i = 0; i <= 12; i++) { const a = a0 + i / 12 * Math.PI / 2; V(cx + Math.cos(a) * r, cz + Math.sin(a) * r); } };
    arc(w - r, d - r, 0); side(w - r, d, -w + r, d); arc(-w + r, d - r, Math.PI / 2); side(-w, d - r, -w, -d + r);
    arc(-w + r, -d + r, Math.PI); side(-w + r, -d, w - r, -d); arc(w - r, -d + r, Math.PI * 1.5); side(w, -d + r, w, d - r);
  }
  // the rim tube follows the points by their index, not by length: each corner's 12 steps get 12 segments (by length the long sides took
  // nearly all of them and the corners came out as cut-off chamfers — 2026-11-18 user: 四隅のフレームを綺麗な角丸に)
  function rimTube(pts) {
    const TT = T(), n = pts.length, C = new TT.Curve();
    C.getPoint = (t, o) => { const f = ((t % 1) + 1) % 1 * n, i = Math.floor(f) % n, j = (i + 1) % n, k = f - Math.floor(f); return (o || new TT.Vector3()).copy(pts[i]).lerp(pts[j], k); };
    C.getPointAt = C.getPoint; C.getTangentAt = (t, o) => C.getTangent(t, o);
    return new TT.TubeGeometry(C, n * (LO() ? 1 : 2), .028, 4, true);
  }
  function tray(cfg, Lt0, look) {
    const TT = T(), Lt = Lt0 || layout(cfg), g = new TT.Group(), BH = TOP, n = cfg.n, C = cfg.c; look = lookNow(look); const S = SKINS[look];
    const bodyM = skinMat('body' + look, S.body), wallM = S.wall ? skinMat('wall' + look, S.wall) : bodyM;
    const per = C > 8 ? Math.ceil(C / 2) : C, prow = Math.ceil(C / per);
    const pp = Math.min(1.2, (Lt.W - .7) / per), gemS = Math.min(1.3, pp / (2 * R) * .86);
    const rowH = 1.25, palH = pp * .98, D = .3 + rowH + prow * palH + .3, z0 = Lt.L / 2 + .14, zc = z0 + D / 2;
    const sz = z0 + .3 + rowH / 2, sock = k => [Lt.slot(0, k)[0], sz];
    const pal = v => { const r = Math.floor(v / per), q = v % per, m = Math.min(per, C - r * per); return [(q - (m - 1) / 2) * pp, z0 + .3 + rowH + (r + .5) * palH]; };
    const okW = .98, okD = .82, ok = [Lt.fbx, sz, okW, okD];
    const PX = 80, tex = X.canvasTex('hbTray' + look + n + 'c' + C, Math.round((Lt.W - .16) * PX), Math.round((D - .16) * PX), (c, W, H) => {
      const px = x => (x + (Lt.W - .16) / 2) * PX, pz = z => (z - (zc - (D - .16) / 2)) * PX;
      S.bg(c, W, H, PX);
      // the row's well: as the board's play field
      const fx0 = px(Lt.x0 - .3), fx1 = px(Lt.x0 + n * PITCH + .3), f0 = pz(sz - rowH / 2 + .08), f1 = pz(sz + rowH / 2 - .08);
      S.field(c, fx0, f0, fx1 - fx0, f1 - f0, PX, true);
      for (let k = 0; k < n; k++) { const [x, z] = sock(k); S.sock(c, px(x), pz(z), PX * (R + .03), k, 0); }
      // the palette's bed
      const b0 = pz(z0 + .3 + rowH - .02), b1 = pz(z0 + D - .2);
      S.bed(c, px(-Lt.W / 2 + .3), b0, PX * (Lt.W - .6), b1 - b0, PX);
      for (let v = 0; v < C; v++) { const [x, z] = pal(v); const r = PX * R * gemS * 1.02, gg = c.createRadialGradient(px(x), pz(z) + r * .2, r * .2, px(x), pz(z), r * 1.1); gg.addColorStop(0, 'rgba(0,0,0,.45)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.beginPath(); c.arc(px(x), pz(z), r * 1.1, 0, 7); c.fill(); }
    });
    const body = X.mesh(geo('hbTrayB' + n + 'c' + C, () => rbox(Lt.W, D, BH - HOLE, .38, .08)), bodyM); body.position.z = zc; body.receiveShadow = true; g.add(body);
    const top = new TT.Mesh(plate(Lt.W - .16, D - .16, .3, Array.from({ length: n }, (_, k) => [sock(k)[0], sock(k)[1] - zc, R + .03, LO() ? 16 : 20]), 'T' + n + 'c' + C), [mat('hbTrayT' + look + n + 'c' + C, () => { const m = X.M(topOpts(S, { map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: S.glow, roughness: .9, envMapIntensity: .12, bump: false })); m.emissive.set(0xffffff); return m; }), wallM]);
    top.position.set(0, BH - HOLE, zc); top.receiveShadow = true; g.add(top);
    if (S.rings) { const rm = mat('hbRingM' + look, () => X.M({ color: S.rings.c, metalness: 1, roughness: .16, envMapIntensity: 2, bump: false })), big = geo('hbRingB', () => { const q = new TT.TorusGeometry(R + .075, .042, 4, LO() ? 18 : 26); q.rotateX(Math.PI / 2); q.scale(1, .45, 1); return q; }); for (let k = 0; k < n; k++) { const [x, z] = sock(k), o = new TT.Mesh(big, rm); o.position.set(x, BH + .006, z); g.add(o); } }
    const floor = rplane(Lt.W - .2, D - .2, .28, wallM); floor.position.set(0, BH - HOLE + .002, zc); floor.receiveShadow = true; g.add(floor);
    if (S.screws3d) screws(g, Lt.W - .16, D - .16, zc, 80, BH + .002);
    const rim = (() => { const w = Lt.W / 2 - .07, d = D / 2 - .07, r = .31, pts = [];
      rimPts(pts, w, d, r);
      const t = new TT.Mesh(geo('hbTrayRim2' + n + 'c' + C, () => rimTube(pts)), rimMat(look, S.rim)); t.position.set(0, BH + .01, zc); t.visible = S.rim.k !== 'none'; return t; })();
    g.add(rim);
    // OK: a raised key with its label (lit mint when the row is full)
    const okOwn = S.okFont || S.okDraw, okTex = on => X.canvasTex('hbOk' + (on ? (okOwn ? look + 1 : 1) : look), 160, 134, (c, W, H) => {
      if (S.okDraw) { S.okDraw(c, W, H || 134, on); return; }
      const gr = c.createLinearGradient(0, 0, 0, H); if (on) { gr.addColorStop(0, '#a8ffe6'); gr.addColorStop(1, '#4fd6b0'); } else { gr.addColorStop(0, S.okOff[0]); gr.addColorStop(1, S.okOff[1]); }
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.font = S.okFont || '900 64px "Outfit", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = on ? '#0d3a33' : S.okOff[2]; c.fillText('OK', W / 2, H / 2 + 3);
    });
    const okM = on => mat('hbOkM' + (on ? (okOwn ? look + 1 : 1) : look), () => { const t = okTex(on), m = X.M({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: on ? .75 : .45, roughness: .6, envMapIntensity: .15, bump: false }); m.emissive.set(0xffffff); return m; });
    const okG = new TT.Group(); okG.position.set(ok[0], BH, ok[1]); g.add(okG);
    const okBody = X.mesh(geo('hbOkB', () => rbox(okW, okD, .16, .16, .04)), skinMat(S.okBody ? 'okb' + look : 'case' + look, S.okBody || S.caseC)); okG.add(okBody);
    const okFace = planeTop(okW - .1, okD - .1, okM(false)); okFace.position.y = .165; okG.add(okFace);
    const okGlow = new TT.Mesh(geo('hbOkGl', () => { const p = new TT.PlaneGeometry(okW + .3, okD + .3); p.rotateX(-Math.PI / 2); return p; }), mat('hbOkGlM', () => new TT.MeshBasicMaterial({ color: 0x7df3d2, transparent: true, opacity: .22, depthWrite: false, toneMapped: false })));
    okGlow.position.y = .004; okGlow.visible = false; okGlow.renderOrder = 1; okG.add(okGlow);
    // the cursor: a mint ring round the socket a gem goes into
    const ring = new TT.Mesh(geo('hbCur', () => { const r = new TT.RingGeometry(R + .08, R + .15, 32); r.rotateX(-Math.PI / 2); return r; }), neonMat('#7df3d2', 1.6)); ring.position.y = BH + .012; ring.visible = false; g.add(ring);
    // the palette gems (their own materials: a used colour dims)
    const pgs = [];
    for (let v = 0; v < C; v++) { const m = gem(cfg.kind, v, look), [x, z] = pal(v); m.position.set(x, BH + .02, z); m.scale.setScalar(gemS); m.userData.pv = v;
      m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.userData.e0 = o.material.emissiveIntensity; } }); g.add(m); pgs.push(m); }
    const dim = (m, k) => m.traverse(o => { if (o.material && o.material.color) { if (o.userData.c0 == null) o.userData.c0 = o.material.color.clone(); o.material.color.copy(o.userData.c0).multiplyScalar(k); if (o.userData.e0 != null) o.material.emissiveIntensity = o.userData.e0 * k; } });
    const usedS = new Set(); let isOff = false;
    const paint = () => pgs.forEach((m, v) => { const u = usedS.has(v); dim(m, isOff ? .4 : u ? .3 : 1); m.position.y = BH + (u ? -.06 : .02); });
    const placed = [];
    g.userData = { D, z0, zc, W: Lt.W, sock, pal, ok, gemS, pp,
      put(k, v) { if (placed[k]) { g.remove(placed[k]); placed[k] = null; } if (v == null) return; const m = gem(cfg.kind, v, look), [x, z] = sock(k); m.position.set(x, BH - R * .12, z); g.add(m); placed[k] = m; },
      cursor(k) { ring.visible = k >= 0; if (k >= 0) { const [x, z] = sock(k); ring.position.x = x; ring.position.z = z; } },
      okOn(on) { okFace.material = okM(!!on); okGlow.visible = !!on; okG.position.y = BH + (on ? .03 : 0); },
      used(v, u) { if (u) usedS.add(v); else usedS.delete(v); paint(); }, usedAll(set) { usedS.clear(); set.forEach(v => usedS.add(v)); paint(); },
      off(o) { isOff = !!o; paint(); }, palGem: v => pgs[v] };
    return g;
  }
  function lidTex(n, w, d, look) {
    const PX = 96;
    return X.canvasTex('hbLidT' + look + n, Math.round(w * PX), Math.round(d * PX), (c, W, H) => { H = H || Math.round(d * PX); SKINS[look].lid(c, W, H, n, PX); });
  }


  // the showcase: a race in progress on the カラー board
  X.MODELS.hitblow = function (live) {
    const E = window.HitBlowEngine, cfg = E ? Object.assign({}, E.rule(1)) : { n: 4, c: 6, rep: false, kind: 'color', rows: 10 };
    const g = board(cfg, live ? undefined : lookNow()), U = g.userData; if (live || !E) return g;
    const secret = [3, 0, 5, 1], rows = [[0, 1, 2, 3], [4, 3, 0, 5], [3, 5, 1, 0]];
    rows.forEach((code, r) => {
      code.forEach((v, k) => { const m = gem('color', v, U.look), [x, z] = U.slot(r, k); m.position.set(x, U.top - R * .12, z); g.add(m); });
      const f = E.feedback(secret, code); let k = 0;
      for (let i = 0; i < f.h; i++, k++) { const p = pin(true), [x, z] = U.pinPos(r, k); p.position.set(x, U.top - .02, z); g.add(p); }
      for (let i = 0; i < f.b; i++, k++) { const p = pin(false), [x, z] = U.pinPos(r, k); p.position.set(x, U.top - .02, z); g.add(p); }
      U.rowMark(r, r % 2);
    });
    return g;   // (no lit row on the showcase: only while playing, 2026-11-16 user)
  };
  X.hitblow = { board, tray, LOOKS, SKINS, gem, pin, layout, ICONS, STROKE, COLORS, DIGIT, HIT, BLOW, R, TOP, mix };
})();
