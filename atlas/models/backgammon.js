/* =====================================================================
   Backgammon on the 3D table — a museum-piece folding board in two looks,
   modelled on the game's own skins:
     • 'marq'    walnut case with mitred rails and brass hinges; each field is a
                 sunburst of concentric marquetry rings (segmented veneers, holly /
                 ebony stringing); points inlaid in curly maple and macassar ebony
     • 'scarlet' black pebble-grain leather case, stitched rails, gold piping,
                 gold corners and hinges; scarlet and ivory leather points
   Checkers: a polished metal ring (gold / platinum / silver) with an inset leather
   face (ivory, black, white, scarlet) — like the classic leather & walnut sets.
   Units = the game's board units (backgammon/app.js G): the case is 15.85 × H
   (H = 12, or shorter in the game's flat PC / phone-landscape geometry); x = ux − W/2,
   z = uy − H/2, so the DOM board and the 3D field line up exactly.
   Registers into Table3D:
     Table3D.MODELS.backgammon(live, o)   board (+ the starting position, dice and cube unless live)
     Table3D.backgammon = { board(look, H), checker(id), die(id), cube(), sprites(px), geom(H), … }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { makeNoise, RB } = X;
  const STD = { W: 15.85, H: 12, LX: .5, BX: 6.5, B: 1.2, RX: 7.7, RE: 13.7, TX: 14.05, TW: 1.3, TOP: .5, C: .94 };
  const geom = (H = 12) => { const g = Object.assign({}, STD, { H }); g.BOT = H - .5; g.MID = H / 2; g.PL = (g.MID - g.TOP) * .836; return g; };
  const FY = .3, RH = .17;   // field level, rail height above it
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const cv = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

  /* ---------- small procedural swatches (canvases, cached) ---------- */
  const SW = {};
  // a veneer leaf: fibres along x; o.curl = fiddleback shimmer across, o.stripe = macassar streaks, o.ring = growth-ring frequency
  function veneer(key, base, dark, o = {}) {
    if (SW[key]) return SW[key];
    const N0 = 256, c = cv(N0, N0), g = c.getContext('2d'), img = g.createImageData(N0, N0), d = img.data;
    const N = makeNoise(o.seed || key.length * 13 + 7), A = hexRGB(base), B = hexRGB(dark);
    const val = (u, v) => {
      const warp = N(u * 1.6 + 7, v * 3 + 7, 3);
      const ring = Math.sin((v * (o.ring || 5) + warp * 2.2) * Math.PI * 2) * .5 + .5;
      const fib = N(u * 6 + 7, v * 120 + 7, 2);
      let t = .15 + Math.pow(ring, 3) * .35 + (fib - .5) * .45 + (N(u * 2 + 7, v * 2 + 7, 2) - .5) * .25;
      if (o.curl) t += Math.pow(Math.sin((u * 34 + N(u * 3 + 7, v * 2 + 7, 2) * 4) * Math.PI) * .5 + .5, 4) * o.curl;
      if (o.stripe) t += Math.pow(Math.sin((v * 6 + warp * 3.4) * Math.PI) * .5 + .5, 10) * o.stripe;
      if (N(u * 90 + 7, v * 400 + 7, 1) > .84) t += .12;   // pores
      return t;
    };
    // seamless: each texel blends the pattern with its copies one tile to the left / above
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) {
      const u = x / N0, v = y / N0;
      let t = val(u, v) * (1 - u) * (1 - v) + val(u - 1, v) * u * (1 - v) + val(u, v - 1) * (1 - u) * v + val(u - 1, v - 1) * u * v;
      t = Math.max(0, Math.min(1, t));
      const i = (y * N0 + x) * 4;
      d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (SW[key] = c);
  }
  // leather: a grey height tile (128 = flat) — pebbles with creases between, fine pores; drawn in 'overlay' over a colour
  function leatherTile(key = 'lth', seed = 3) {
    if (SW[key]) return SW[key];
    // pebble grain: cellular noise on a wrapping grid (seamless) — domed pebbles, fine creases between them, tiny pores
    const N0 = 512, GN = 44, c = cv(N0, N0), g = c.getContext('2d'), img = g.createImageData(N0, N0), d = img.data, N = makeNoise(seed);
    let r = seed * 7919 + 17; const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const P = new Float32Array(GN * GN * 2); for (let i = 0; i < GN * GN; i++) { P[i * 2] = .15 + rnd() * .7; P[i * 2 + 1] = .15 + rnd() * .7; }
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) {
      const gx = x / N0 * GN, gy = y / N0 * GN, cx = Math.floor(gx), cy = Math.floor(gy);
      let f1 = 9, f2 = 9;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const X0 = cx + i, Y0 = cy + j, ci = ((Y0 % GN + GN) % GN) * GN + ((X0 % GN + GN) % GN);
        const dx = X0 + P[ci * 2] - gx, dy = Y0 + P[ci * 2 + 1] - gy, dd = dx * dx + dy * dy;
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1), dome = 1 - Math.min(1, Math.sqrt(f1) * 1.3);
      let h = 120 + dome * 46 + (N(x / 40, y / 40, 2) - .5) * 30;
      if (e < .12) h -= (1 - e / .12) * 80;
      if (N(x * .9, y * .9, 1) > .86) h -= 18;
      const i = (y * N0 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, h)); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (SW[key] = c);
  }
  // suede / felt lining of the bear-off trays
  function suede(key, base) {
    if (SW[key]) return SW[key];
    const N0 = 256, c = cv(N0, N0), g = c.getContext('2d'), img = g.createImageData(N0, N0), d = img.data, N = makeNoise(41), A = hexRGB(base);
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) { const k = (Math.random() - .5) * 18 + (N(x / 2, y / 2, 2) - .5) * 16 + (N(x / 30, y / 30, 2) - .5) * 14, i = (y * N0 + x) * 4; d[i] = A[0] + k; d[i + 1] = A[1] + k; d[i + 2] = A[2] + k; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (SW[key] = c);
  }
  const W_ = {   // the veneers of the marquetry
    pointL: () => veneer('vMapP', '#f0dfb6', '#c8a676', { curl: .3, ring: 2, seed: 31 }),
    walnut: () => veneer('vWal', '#8a5631', '#3b2010', { ring: 4, seed: 11 }),
    walnutR: () => veneer('vWalR', '#7a4a28', '#2e180a', { ring: 3, seed: 12 }),
    maple: () => veneer('vMap', '#e6cc98', '#b98f58', { curl: .28, ring: 2, seed: 21 }),
    holly: () => veneer('vHol', '#f6efdf', '#d9cdb2', { ring: 1.5, seed: 22 }),
    ebony: () => veneer('vEbo', '#2a1d16', '#070504', { stripe: .2, ring: 6, seed: 23 }),
    macassar: () => veneer('vMac', '#6a3f22', '#120a06', { stripe: .9, ring: 3, seed: 24 }),
    padauk: () => veneer('vPad', '#9a4a2c', '#521c0e', { ring: 5, seed: 25 }),
    rosewood: () => veneer('vRos', '#6a2c22', '#2a0c08', { stripe: .35, ring: 7, seed: 26 }),
    olive: () => veneer('vOli', '#c9aa6a', '#5e4422', { stripe: .55, ring: 4, seed: 27 }),
    cherry: () => veneer('vChe', '#b8693e', '#7a3a1c', { ring: 4, seed: 28 }),
    teal: () => veneer('vTea', '#56705a', '#26362a', { ring: 3, seed: 29 }),     // dyed sycamore
    navy: () => veneer('vNav', '#3f4a5e', '#1a1f2c', { ring: 3, seed: 30 }),
    // dyed veneers of the colourful 2D marquetry board (the same palette, still with their wood figure)
    dRed: () => veneer('vdRed', '#e2475a', '#a8243a', { ring: 2, seed: 41 }),
    dGold: () => veneer('vdGold', '#f0c46a', '#c8923a', { ring: 2, seed: 42 }),
    dCream: () => veneer('vdCre', '#f6ead0', '#dccaa4', { ring: 1.5, seed: 43 }),
    dCyan: () => veneer('vdCya', '#3fa7c4', '#22758e', { ring: 2, seed: 44 }),
    dNavy: () => veneer('vdNav', '#1d3f9e', '#10246a', { ring: 2, seed: 45 }),
    dGreen: () => veneer('vdGre', '#1d6b4f', '#0e4230', { ring: 2, seed: 46 }),
    dBlue: () => veneer('vdBlu', '#2c6ad8', '#1a4596', { ring: 2, seed: 47 }),
    dOrange: () => veneer('vdOra', '#e8a24a', '#b46c22', { ring: 2, seed: 48 }),
    dBrown: () => veneer('vdBro', '#6a4024', '#3a2010', { ring: 3, seed: 49 }),
    dBlack: () => veneer('vdBlk', '#1e1a18', '#0a0808', { ring: 3, seed: 50 }),
  };

  /* ---------- the top of the case (field level): fields, points, trays ---------- */
  const PX = () => matchMedia('(pointer: coarse)').matches ? 2048 : 2560;
  function fieldCanvas(look, g) {
    const k = PX() / g.W, Wc = Math.round(g.W * k), Hc = Math.round(g.H * k), c = cv(Wc, Hc), x = c.getContext('2d');
    const U = v => v * k;
    const fields = [g.LX, g.RX];
    const triN = (x0, i, top) => { const cx = U(x0 + i + .5), y0 = U(top ? g.TOP : g.BOT), y1 = U(top ? g.TOP + g.PL : g.BOT - g.PL), hw = U(.31); x.beginPath(); x.moveTo(cx - hw, y0); x.lineTo(cx + hw, y0); x.lineTo(cx, y1); x.closePath(); };   // the marquetry board's slimmer points
    const tri = (x0, i, top) => { const cx = U(x0 + i + .5), y0 = U(top ? g.TOP : g.BOT), y1 = U(top ? g.TOP + g.PL : g.BOT - g.PL), hw = U(.455); x.beginPath(); x.moveTo(cx - hw, y0); x.lineTo(cx + hw, y0); x.lineTo(cx, y1); x.closePath(); };
    // a swatch laid along a direction (angle) to fill the current clip
    const lay = (sw, ang, cx, cy, sc = 1) => { x.save(); x.translate(cx, cy); x.rotate(ang); const s = Math.max(Wc, Hc) * 1.5; x.scale(sc, sc); const p = x.createPattern(sw, 'repeat'); x.fillStyle = p; x.fillRect(-s, -s, 2 * s, 2 * s); x.restore(); };
    if (look === 'scarlet') {
      const L = leatherTile();
      const leather = (col, op, sc = .3, lift = 0) => { x.fillStyle = col; x.fill(); x.save(); x.clip(); const p = x.createPattern(L, 'repeat'); p.setTransform && p.setTransform(new DOMMatrix().scale(sc * k / 160)); x.fillStyle = p; x.globalCompositeOperation = 'overlay'; x.globalAlpha = op; x.fillRect(0, 0, Wc, Hc); if (lift) { x.globalCompositeOperation = 'screen'; x.globalAlpha = lift; x.fillRect(0, 0, Wc, Hc); } x.restore(); };
      x.beginPath(); x.rect(0, 0, Wc, Hc); leather('#18181a', .9, .3, .07);
      for (const x0 of fields) {
        for (let i = 0; i < 6; i++) for (const top of [true, false]) {
          const a = (i % 2 === 0) === top;   // same alternation as the game's drawing
          // the cut edge of the inlaid leather: a soft dark rim offset away from the light, then the piece
          x.save(); x.shadowColor = 'rgba(0,0,0,.65)'; x.shadowBlur = U(.03); x.shadowOffsetX = U(.012); x.shadowOffsetY = U(.016); tri(x0, i, top); x.fillStyle = '#000'; x.fill(); x.restore();
          tri(x0, i, top); leather(a ? '#a0101a' : '#e6dcc6', a ? .8 : .6, .3, a ? .04 : 0);
          tri(x0, i, top); x.save(); x.clip(); const gr = x.createLinearGradient(0, U(top ? g.TOP : g.BOT), 0, U(top ? g.TOP + g.PL : g.BOT - g.PL)); gr.addColorStop(0, 'rgba(0,0,0,.12)'); gr.addColorStop(.25, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,255,255,.06)'); x.fillStyle = gr; x.fill(); x.restore();
          tri(x0, i, top); x.strokeStyle = a ? 'rgba(70,0,6,.55)' : 'rgba(120,100,70,.5)'; x.lineWidth = U(.008); x.stroke();
        }
        // a fine stitched seam round the field, inside the gold piping
        x.save(); x.setLineDash([U(.07), U(.05)]); x.lineCap = 'round'; x.strokeStyle = 'rgba(236,226,206,.32)'; x.lineWidth = U(.016);
        x.strokeRect(U(x0 + .1), U(g.TOP + .1), U(5.8), U(g.H - 1.2)); x.restore();
      }
      x.beginPath(); x.rect(U(g.TX), U(g.TOP), U(g.TW), U(g.H - 1)); x.save(); x.clip(); lay(suede('sdBlk', '#141416'), 0, 0, 0); x.restore();
    } else {
      // walnut ground (only seen at the edges), then the two marquetry fields
      x.save(); lay(W_.walnut(), 0, 0, 0, 1.4); x.restore();
      // colourful and off-centre like the 2D marquetry board: the same ring colours, one centre low on the left field, one high on the right
      const RC = ['dBrown', 'dRed', 'dGold', 'dCream', 'dCyan', 'dNavy', 'dGreen', 'dBlack', 'dBlue', 'dOrange', 'dBrown', 'dCyan', 'dRed', 'dGold', 'dGreen', 'dNavy', 'walnutR', 'dRed'];
      const RING = []; RC.forEach((c, i) => { RING.push(c); if (i % 4 === 1) RING.push('E'); });
      const WID = { S: .022, E: .03 };
      const CEN = [[3.6, g.BOT - 1.2, 0], [2.2, g.TOP + 2.4, 5]];
      fields.forEach((x0, fi) => {
        const [ox, oy, n0] = CEN[fi], cx = U(x0 + ox), cy = U(oy);
        const R0 = Math.max(...[[x0, g.TOP], [x0 + 6, g.TOP], [x0, g.BOT], [x0 + 6, g.BOT]].map(([px, py]) => Math.hypot(px - x0 - ox, py - oy))) + .1;
        x.save(); x.beginPath(); x.rect(U(x0), U(g.TOP), U(6), U(g.H - 1)); x.clip();
        // rings from the outside in: each a ring of veneer segments, the grain running round the circle
        const rings = []; let r = .2, n = n0;
        while (r < R0) { const sp = RING[n % RING.length]; const w = WID[sp] || (.24 + (n % 3) * .05); rings.push([r, r + w, sp]); r += w; n++; }
        for (let j = rings.length - 1; j >= 0; j--) {
          const [r0, r1, sp] = rings[j];
          if (sp === 'S' || sp === 'E') { x.beginPath(); x.arc(cx, cy, U(r1), 0, Math.PI * 2); x.arc(cx, cy, U(r0), 0, Math.PI * 2, true); x.fillStyle = sp === 'S' ? '#efe6d0' : '#140c08'; x.fill('evenodd'); continue; }
          const segs = Math.max(8, Math.round(r1 * 9)), sw = W_[sp]();
          for (let s = 0; s < segs; s++) {
            const a0 = s / segs * Math.PI * 2, a1 = (s + 1) / segs * Math.PI * 2, am = (a0 + a1) / 2;
            x.save(); x.beginPath(); x.arc(cx, cy, U(r1), a0, a1); x.arc(cx, cy, U(r0), a1, a0, true); x.closePath(); x.clip();
            const off = (s * 37 + j * 11) % 200;
            x.translate(cx + Math.cos(am) * U(r0), cy + Math.sin(am) * U(r0)); x.rotate(am + Math.PI / 2);
            x.drawImage(sw, off * .3, (j * 23) % 120, 120, 120, -U(r1) * 1.2, -U(r1 - r0) * 1.6, U(r1) * 2.4, U(r1 - r0) * 3.2);
            x.restore();
          }
          // hairline joints between the segments and a whisper of shading on the inner edge (cut veneers never match perfectly)
          x.strokeStyle = 'rgba(30,14,6,.28)'; x.lineWidth = Math.max(1, U(.006)); x.beginPath();
          for (let s = 0; s < segs; s++) { const a = s / segs * Math.PI * 2; x.moveTo(cx + Math.cos(a) * U(r0), cy + Math.sin(a) * U(r0)); x.lineTo(cx + Math.cos(a) * U(r1), cy + Math.sin(a) * U(r1)); } x.stroke();
          x.beginPath(); x.arc(cx, cy, U(r0) + .5, 0, Math.PI * 2); x.strokeStyle = 'rgba(20,10,4,.35)'; x.stroke();
        }
        // the centre: a holly disc with an ebony dot (as on the 2D board)
        x.beginPath(); x.arc(cx, cy, U(.2), 0, Math.PI * 2); x.save(); x.clip(); lay(W_.dCream(), .4, cx, cy, .6); x.restore();
        x.beginPath(); x.arc(cx, cy, U(.085), 0, Math.PI * 2); x.fillStyle = '#3a2416'; x.fill();
        x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(236,206,160,.16)'; x.fillRect(U(x0), U(g.TOP), U(6), U(g.H - 1)); x.globalCompositeOperation = 'source-over';   // a light varnish warmth only
        // the points: slim holly and curly-maple spikes laid over the rings (both light, as on the 2D board), with an ebony hairline
        for (let i = 0; i < 6; i++) for (const top of [true, false]) {
          const a = (i % 2 === 0) === top;
          x.save(); x.shadowColor = 'rgba(10,4,0,.45)'; x.shadowBlur = U(.05); x.shadowOffsetY = U(.01); triN(x0, i, top); x.fillStyle = '#1a0e08'; x.fill(); x.restore();
          triN(x0, i, top); x.save(); x.clip(); lay(a ? W_.holly() : W_.pointL(), Math.PI / 2 + (top ? .015 : -.015), U(x0 + i + .5), U(g.MID), .9); x.restore();
          triN(x0, i, top); x.strokeStyle = 'rgba(40,20,10,.7)'; x.lineWidth = U(.022); x.lineJoin = 'miter'; x.stroke();
        }
        // stringing band round the field: ebony · holly · ebony
        const band = (ins, w, col) => { x.strokeStyle = col; x.lineWidth = U(w); x.strokeRect(U(x0 + ins), U(g.TOP + ins), U(6 - 2 * ins), U(g.H - 1 - 2 * ins)); };
        band(.03, .06, '#120a06'); band(.035, .025, '#f0e6cc'); band(.09, .018, '#120a06');
        x.restore();
      });
      // trays: black suede lining
      x.beginPath(); x.rect(U(g.TX), U(g.TOP), U(g.TW), U(g.H - 1)); x.save(); x.clip(); lay(suede('sdTray', '#16120f'), 0, 0, 0); x.restore();
    }
    // soft shadow of the rails on every opening (ambient occlusion), and a faint varnish glow
    const ao = (x0, y0, w, h) => {
      const s = U(.22);
      x.save(); x.beginPath(); x.rect(U(x0), U(y0), U(w), U(h)); x.clip();
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = s; x.lineWidth = s; x.strokeStyle = '#000';
      x.strokeRect(U(x0) - s / 2, U(y0) - s / 2, U(w) + s, U(h) + s); x.restore();
    };
    ao(g.LX, g.TOP, 6, g.H - 1); ao(g.RX, g.TOP, 6, g.H - 1); ao(g.TX, g.TOP, g.TW, g.H - 1);
    return c;
  }
  /* ---------- the rails (frame, bar, tray divider), seen from above ---------- */
  function frameCanvas(look, g) {
    const k = 2048 / g.W, Wc = 2048, Hc = Math.round(g.H * k), c = cv(Wc, Hc), x = c.getContext('2d'), U = v => v * k;
    const IN = [[g.LX, g.TOP], [g.W - .5, g.TOP], [g.W - .5, g.BOT], [g.LX, g.BOT]], OUT = [[0, 0], [g.W, 0], [g.W, g.H], [0, g.H]];
    const strip = (draw) => { for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; x.save(); x.beginPath(); x.moveTo(U(OUT[i][0]), U(OUT[i][1])); x.lineTo(U(OUT[j][0]), U(OUT[j][1])); x.lineTo(U(IN[j][0]), U(IN[j][1])); x.lineTo(U(IN[i][0]), U(IN[i][1])); x.closePath(); x.clip(); draw(i % 2 === 0); x.restore(); } };
    const lay = (sw, vert, sc) => { const p = x.createPattern(sw, 'repeat'); p.setTransform && p.setTransform(new DOMMatrix().rotate(vert ? 90 : 0).scale(sc)); x.fillStyle = p; x.fillRect(0, 0, Wc, Hc); };
    const inner = [[g.BX, g.B], [g.RE, g.TX - g.RE]];
    if (look === 'scarlet') {
      const L = leatherTile();
      x.fillStyle = '#161618'; x.fillRect(0, 0, Wc, Hc);
      x.globalCompositeOperation = 'overlay'; x.globalAlpha = .95; lay(L, false, .3 * k / 160); x.globalCompositeOperation = 'screen'; x.globalAlpha = .07; lay(L, false, .3 * k / 160); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      // stitching: cream thread along both edges of every rail
      x.setLineDash([U(.075), U(.05)]); x.lineCap = 'round';
      const st = (x0, y0, w, h) => { x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = U(.03); x.strokeRect(U(x0), U(y0), U(w), U(h)); x.strokeStyle = 'rgba(240,232,214,.78)'; x.lineWidth = U(.017); x.strokeRect(U(x0), U(y0), U(w), U(h)); };
      st(.12, .12, g.W - .24, g.H - .24);
      st(g.LX - .13, g.TOP - .13, g.RE - g.LX + .26, g.H - 1 + .26); st(g.TX - .13, g.TOP - .13, g.TW + .26, g.H - 1 + .26);
      st(g.BX + .12, g.TOP + .05, g.B / 2 - .2, g.H - 1.1); st(g.BX + g.B / 2 + .08, g.TOP + .05, g.B / 2 - .2, g.H - 1.1);
      x.setLineDash([]);
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(U(g.BX + g.B / 2) - 1, U(g.TOP), 2, U(g.H - 1));   // the fold of the case
    } else {
      // walnut: four mitred strips (grain along each), the bar and the divider with the grain running lengthwise
      strip(hz => lay(W_.walnutR(), !hz, k / 150));
      x.strokeStyle = 'rgba(20,8,2,.55)'; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i < 4; i++) { x.moveTo(U(OUT[i][0]), U(OUT[i][1])); x.lineTo(U(IN[i][0]), U(IN[i][1])); } x.stroke();
      for (const [x0, w] of inner) { x.save(); x.beginPath(); x.rect(U(x0), U(g.TOP), U(w), U(g.H - 1)); x.clip(); lay(W_.walnut(), true, k / 140); x.restore(); }
      // a fine holly line inlaid round the outer rail, and the seam where the two halves meet
      x.strokeStyle = 'rgba(240,226,196,.75)'; x.lineWidth = U(.018); x.strokeRect(U(.2), U(.2), U(g.W - .4), U(g.H - .4));
      x.fillStyle = 'rgba(10,4,0,.7)'; x.fillRect(U(g.BX + g.B / 2) - 1.5, U(g.TOP), 3, U(g.H - 1));
    }
    return c;
  }

  /* ---------- materials ---------- */
  const MAT = {};
  const tex = (c, aniso = 8) => { const t = new (T().CanvasTexture)(c); t.encoding = T().sRGBEncoding; t.anisotropy = aniso; return t; };
  function mats(look) {
    if (MAT[look]) return MAT[look];
    const TT = T(), C = h => new TT.Color(h).convertSRGBToLinear();
    const o = {};
    if (look === 'scarlet') {
      const lt = tex(leatherTile()); lt.wrapS = lt.wrapT = TT.RepeatWrapping; lt.repeat.set(3.5, 3.5);
      o.side = new TT.MeshPhysicalMaterial({ color: C(0x1a1a1c), map: lt, bumpMap: lt, bumpScale: .004, roughness: .55, sheen: C(0x2a2a2e), clearcoat: .15, clearcoatRoughness: .5 });
      o.metal = new TT.MeshPhysicalMaterial({ color: C(0xf0c873), metalness: 1, roughness: .17, clearcoat: .5, clearcoatRoughness: .1 });
      o.metalDark = new TT.MeshStandardMaterial({ color: C(0x5a4210), metalness: 1, roughness: .4 });
      o.top = { roughness: .5, clearcoat: .18, clearcoatRoughness: .45, bump: .0035 };
      o.field = { roughness: .52, clearcoat: .12, clearcoatRoughness: .5, bump: .003 };
    } else {
      const wt = tex(veneer('vWalSide', '#7a4a28', '#2a1508', { ring: 6, seed: 14 })); wt.wrapS = wt.wrapT = TT.RepeatWrapping; wt.repeat.set(.18, 1.4);
      o.side = new TT.MeshPhysicalMaterial({ map: wt, roughness: .38, clearcoat: .75, clearcoatRoughness: .2 });
      o.metal = new TT.MeshPhysicalMaterial({ color: C(0xd2ab62), metalness: 1, roughness: .3, clearcoat: .3, clearcoatRoughness: .25 });
      o.metalDark = new TT.MeshStandardMaterial({ color: C(0x4a3410), metalness: 1, roughness: .45 });
      o.top = { roughness: .34, clearcoat: .8, clearcoatRoughness: .14, bump: .0015 };
      o.field = { roughness: .3, clearcoat: .85, clearcoatRoughness: .1, bump: .0012 };
    }
    return (MAT[look] = o);
  }
  // per-geometry top textures (rebuilt only when the look or the board height changes; the last few are kept)
  const TOPS = [];
  function topMats(look, g) {
    const key = look + ':' + g.H.toFixed(2);
    let e = TOPS.find(t => t.key === key);
    if (!e) {
      const m = mats(look), TT = T();
      const ft = tex(fieldCanvas(look, g), 8), rt = tex(frameCanvas(look, g), 8);
      const mk = (map, p) => { const mt = new TT.MeshPhysicalMaterial({ map, roughness: p.roughness, clearcoat: p.clearcoat, clearcoatRoughness: p.clearcoatRoughness }); mt.bumpMap = map; mt.bumpScale = p.bump; return mt; };
      e = { key, field: mk(ft, m.field), rail: mk(rt, m.top) };
      TOPS.unshift(e);
      while (TOPS.length > 3) { const old = TOPS.pop(); [old.field, old.rail].forEach(mt => { mt.map.dispose(); mt.dispose(); }); }
    }
    return e;
  }

  /* ---------- geometry pieces ---------- */
  const TAU = Math.PI * 2;
  // a rail cut from a polygon (top view, board units), extruded up to the rail height with rounded edges;
  // top-face UVs are planar over the whole case so the frame picture lands where it was drawn
  function rail(pts, g, top, side) {
    const TT = T(), sh = new TT.Shape(), cx = g.W / 2, cz = g.H / 2;
    pts.forEach(([ux, uy], i) => { const px = ux - cx, py = -(uy - cz); i ? sh.lineTo(px, py) : sh.moveTo(px, py); });
    sh.closePath();
    const bt = .045, bs = .04, H = FY + RH - .02;
    const geo = new TT.ExtrudeGeometry(sh, { depth: H - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelOffset: -bs, bevelSegments: 4, curveSegments: 4 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, .02 + bt, 0);
    // caps (group 0) get the planar top picture; sides keep the extruder's UVs (grain along the rail)
    const P = geo.attributes.position, UV = geo.attributes.uv, g0 = geo.groups[0];
    for (let i = g0.start; i < g0.start + g0.count; i++) UV.setXY(i, (P.getX(i) + cx) / g.W, 1 - (P.getZ(i) + cz) / g.H);
    geo.computeVertexNormals();
    const m = new TT.Mesh(geo, [top, side]); m.castShadow = m.receiveShadow = true; return m;
  }
  // a hinge across the fold of the bar: two leaves, the knuckle, four screws
  function hinge(m, x, z, len) {
    const TT = T(), g = new TT.Group(), y = FY + RH;
    const leaf = new TT.Mesh(RB(.92, .014, len, .006, 2), m.metal); leaf.position.set(0, y + .005, 0); leaf.castShadow = leaf.receiveShadow = true; g.add(leaf);
    const kn = new TT.Mesh(new TT.CylinderGeometry(.04, .04, len + .02, 18), m.metal); kn.rotation.x = Math.PI / 2; kn.position.set(0, y + .02, 0); kn.castShadow = true; g.add(kn);
    for (let k = 1; k < 4; k++) { const r = new TT.Mesh(new TT.CylinderGeometry(.0415, .0415, .006, 18), m.metalDark); r.rotation.x = Math.PI / 2; r.position.set(0, y + .02, -len / 2 + len * k / 4); g.add(r); }
    const sg = new TT.CylinderGeometry(.03, .032, .012, 16), slot = new TT.BoxGeometry(.045, .004, .007);
    for (const sx of [-.3, .3]) for (const sz of [-len * .32, len * .32]) {
      const s = new TT.Mesh(sg, m.metal); s.position.set(sx, y + .018, sz); g.add(s);
      const sl = new TT.Mesh(slot, m.metalDark); sl.position.set(sx, y + .025, sz); sl.rotation.y = (sx * sz > 0 ? .6 : -.4); g.add(sl);
    }
    g.position.set(x, 0, z); return g;
  }
  // gold piping: a fine round cord along the inner edge of an opening
  function piping(m, g, x0, y0, w, h) {
    const TT = T(), cx = g.W / 2, cz = g.H / 2, y = FY + RH - .012, r = .06;
    const P = [[x0 + r, y0], [x0 + w - r, y0], [x0 + w, y0 + r], [x0 + w, y0 + h - r], [x0 + w - r, y0 + h], [x0 + r, y0 + h], [x0, y0 + h - r], [x0, y0 + r]];
    const path = new TT.CurvePath();
    const V = (ux, uy) => new TT.Vector3(ux - cx, y, uy - cz);
    for (let i = 0; i < 8; i += 2) {
      const a = P[i], b = P[i + 1], c2 = P[(i + 2) % 8], corner = [[x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]][i / 2];
      path.add(new TT.LineCurve3(V(...a), V(...b)));
      path.add(new TT.QuadraticBezierCurve3(V(...b), V(...corner), V(...c2)));
    }
    const geo = new TT.TubeGeometry(path, 260, .03, 10, true), t = new TT.Mesh(geo, m.metal); t.castShadow = true; return t;
  }
  // scarlet: gold corner guards (an L over the top + flaps down the sides) and case clasps
  function corner(m, g, sx, sz) {
    const TT = T(), grp = new TT.Group(), L = .62, Tk = .2, y = FY + RH;
    const s = new TT.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, Tk); s.lineTo(Tk, Tk); s.lineTo(Tk, L); s.lineTo(0, L); s.closePath();
    const top = new TT.Mesh(new TT.ExtrudeGeometry(s, { depth: .012, bevelEnabled: true, bevelThickness: .006, bevelSize: .012, bevelSegments: 3 }), m.metal);
    top.rotation.x = Math.PI / 2; top.position.y = y + .018; grp.add(top);
    const fl1 = new TT.Mesh(RB(L, y * .55, .016, .006, 2), m.metal); fl1.position.set(L / 2, y * .7, -.006); grp.add(fl1);
    const fl2 = new TT.Mesh(RB(.016, y * .55, L, .006, 2), m.metal); fl2.position.set(-.006, y * .7, L / 2); grp.add(fl2);
    const sg = new TT.CylinderGeometry(.026, .028, .012, 14);
    [[.42, .1], [.1, .42]].forEach(([a, b]) => { const sc = new TT.Mesh(sg, m.metalDark); sc.position.set(a, y + .03, b); grp.add(sc); });
    grp.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    grp.scale.set(sx, 1, sz); grp.position.set(sx * -g.W / 2, 0, sz * -g.H / 2);
    return grp;
  }
  function clasp(m, g, side, z) {
    const TT = T(), grp = new TT.Group(), x = side * (g.W / 2 + .012);
    const plate = new TT.Mesh(RB(.03, .26, .62, .01, 2), m.metal); plate.position.set(x, FY * .75, z); grp.add(plate);
    const lock = new TT.Mesh(RB(.05, .12, .2, .02, 2), m.metal); lock.position.set(x + side * .02, FY * .75, z); grp.add(lock);
    const key = new TT.Mesh(new TT.BoxGeometry(.06, .05, .02), m.metalDark); key.position.set(x + side * .025, FY * .75, z); grp.add(key);
    return grp;
  }

  /* ---------- the board ---------- */
  function board(look = 'marq', H = 12) {
    look = look === 'scarlet' ? 'scarlet' : 'marq';
    const TT = T(), g = geom(H), grp = new TT.Group(), m = mats(look), tm = topMats(look, g);
    const bottom = new TT.MeshStandardMaterial({ color: look === 'scarlet' ? 0x111112 : 0x2a1608, roughness: .9 });
    const base = new TT.Mesh(new TT.BoxGeometry(g.W - .02, FY, g.H - .02), [m.side, m.side, tm.field, bottom, m.side, m.side]);
    base.position.y = FY / 2; base.receiveShadow = true; base.castShadow = true; grp.add(base);
    // outer rails (mitred), the bar (two rails meeting at the fold), the divider between field and tray
    const W = g.W, I = .5;
    [[[0, 0], [W, 0], [W - I, I], [I, I]], [[W, 0], [W, g.H], [W - I, g.H - I], [W - I, I]], [[W, g.H], [0, g.H], [I, g.H - I], [W - I, g.H - I]], [[0, g.H], [0, 0], [I, I], [I, g.H - I]]]
      .forEach(p => grp.add(rail(p, g, tm.rail, m.side)));
    const half = g.B / 2;
    grp.add(rail([[g.BX, g.TOP], [g.BX + half - .004, g.TOP], [g.BX + half - .004, g.BOT], [g.BX, g.BOT]], g, tm.rail, m.side));
    grp.add(rail([[g.BX + half + .004, g.TOP], [g.RX, g.TOP], [g.RX, g.BOT], [g.BX + half + .004, g.BOT]], g, tm.rail, m.side));
    grp.add(rail([[g.RE, g.TOP], [g.TX, g.TOP], [g.TX, g.BOT], [g.RE, g.BOT]], g, tm.rail, m.side));
    // hinges across the fold
    const bx = g.BX + half - W / 2, hl = Math.min(1.1, (g.H - 1) * .16);
    for (const uy of [g.TOP + 1.25, g.BOT - 1.25]) grp.add(hinge(m, bx, uy - g.H / 2, hl));
    if (look === 'scarlet') {
      grp.add(piping(m, g, g.LX, g.TOP, 6, g.H - 1)); grp.add(piping(m, g, g.RX, g.TOP, 6, g.H - 1)); grp.add(piping(m, g, g.TX, g.TOP, g.TW, g.H - 1));
      for (const sx of [1, -1]) for (const sz of [1, -1]) grp.add(corner(m, g, sx, sz));
      for (const s of [-1, 1]) for (const z of [-.3, .3]) grp.add(clasp(m, g, s, z * g.H));
    }
    grp.userData = { look, H: g.H, W: g.W, g, top: FY + .001, rail: FY + RH };
    return grp;
  }

  /* ---------- checkers, dice, cube ---------- */
  // id → rim metal + face leather (the light colours get light faces)
  const CKL = { gold: ['gold', 'ivory'], black: ['plat', 'black'], white: ['silver', 'white'], red: ['gold', 'scarlet'] };
  const RIM = { gold: [0xe2bf72, .26], plat: [0xd6d8dc, .2], silver: [0xdfe2e7, .14] };
  const FACE = { ivory: '#e9dfc8', black: '#1c1c1f', white: '#f5f2ea', scarlet: '#a8141d' };
  const CK_R = .47, CK_H = .2;
  const ckMats = {};
  function checkerMats(id) {
    if (ckMats[id]) return ckMats[id];
    const TT = T(), [rim, face] = CKL[id] || CKL.gold, [col, rough] = RIM[rim];
    const metal = new TT.MeshPhysicalMaterial({ color: new TT.Color(col).convertSRGBToLinear(), metalness: 1, roughness: rough, clearcoat: .4, clearcoatRoughness: .2, envMapIntensity: 1.2 });
    // the inset face: leather grain, a slightly darker edge where it meets the ring
    const c = cv(256, 256), x = c.getContext('2d');
    x.fillStyle = FACE[face]; x.fillRect(0, 0, 256, 256);
    x.globalCompositeOperation = 'overlay'; x.globalAlpha = face === 'black' ? 1 : face === 'white' ? .12 : .7; const p = x.createPattern(leatherTile(), 'repeat'); p.setTransform && p.setTransform(new DOMMatrix().scale(.45)); x.fillStyle = p; x.fillRect(0, 0, 256, 256);
    if (face === 'black') { x.globalCompositeOperation = 'screen'; x.globalAlpha = .05; x.fillRect(0, 0, 256, 256); }
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    const gr = x.createRadialGradient(128, 128, 90, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, face === 'black' ? 'rgba(0,0,0,.5)' : 'rgba(60,40,10,.28)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const ft = tex(c, 4);
    const en = face === 'white';   // white = glossy enamel, the others leather
    const faceM = new TT.MeshPhysicalMaterial({ map: ft, bumpMap: ft, bumpScale: en ? .0012 : .006, roughness: en ? .18 : face === 'black' ? .42 : .5, sheen: new TT.Color(face === 'black' ? 0x303036 : en ? 0x000000 : 0x6a6050), clearcoat: en ? 1 : .1, clearcoatRoughness: en ? .05 : .5 });
    return (ckMats[id] = { metal, face: faceM });
  }
  let ckGeo = null;
  function checker(id = 'gold') {
    const TT = T(), m = checkerMats(id);
    if (!ckGeo) {
      const R = CK_R, Hh = CK_H, pts = [[0, 0], [R - .02, 0], [R - .004, .006], [R, .022], [R, Hh - .022], [R - .004, Hh - .006], [R - .02, Hh], [R - .062, Hh], [R - .072, Hh - .008], [R - .076, Hh - .026], [0, Hh - .026]];
      ckGeo = { rim: new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), 64), face: new TT.CircleGeometry(R - .075, 48) };
      ckGeo.face.rotateX(-Math.PI / 2); ckGeo.face.translate(0, Hh - .025, 0);
    }
    const g = new TT.Group();
    const a = new TT.Mesh(ckGeo.rim, m.metal); a.castShadow = a.receiveShadow = true; g.add(a);
    const b = new TT.Mesh(ckGeo.face, m.face); b.receiveShadow = true; g.add(b);
    g.userData.ck = id; return g;
  }
  // dice: rounded ivory / ebony / scarlet cubes with drilled, painted pips; faces +y 1, −y 6, +x 3, −x 4, +z 2, −z 5
  const DIE = { gold: ['#efe6d2', '#2a0e0b', 0], black: ['#1c1c1f', '#e0be6e', 1], white: ['#f8f6f0', '#141418', 0], red: ['#ab1822', '#f6eedc', 0] };
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const dieMats = {};
  function dieMat(id) {
    if (dieMats[id]) return dieMats[id];
    const TT = T(), [f, p, gold] = DIE[id] || DIE.gold;
    return (dieMats[id] = { body: new TT.MeshPhysicalMaterial({ color: new TT.Color(f).convertSRGBToLinear(), roughness: .28, clearcoat: .9, clearcoatRoughness: .08 }),
      pip: gold ? new TT.MeshStandardMaterial({ color: new TT.Color(p).convertSRGBToLinear(), metalness: 1, roughness: .25 }) : new TT.MeshStandardMaterial({ color: new TT.Color(p).convertSRGBToLinear(), roughness: .45 }) });
  }
  function die(id = 'gold', size = .8) {
    const TT = T(), m = dieMat(id), g = new TT.Group(), h = size / 2;
    const body = new TT.Mesh(RB(size, size, size, size * .16, 4), m.body); body.castShadow = body.receiveShadow = true; g.add(body);
    const pg = new TT.SphereGeometry(size * .085, 14, 10), sp = size * .27;
    // face → (normal axis, u axis, v axis): the pip grid i → col (i % 3), row (i / 3 | 0) as seen from outside, top row towards −z (screen up) on the top face
    const F = { 1: [[0, 1, 0], [1, 0, 0], [0, 0, 1]], 6: [[0, -1, 0], [1, 0, 0], [0, 0, -1]], 3: [[1, 0, 0], [0, 0, -1], [0, -1, 0]], 4: [[-1, 0, 0], [0, 0, 1], [0, -1, 0]], 2: [[0, 0, 1], [1, 0, 0], [0, -1, 0]], 5: [[0, 0, -1], [-1, 0, 0], [0, -1, 0]] };
    for (const v in F) {
      const [n, u, w] = F[v];
      for (const i of PIPS[v]) {
        const cu = (i % 3 - 1) * sp, cw = ((i / 3 | 0) - 1) * sp, d = h - size * .035;
        const s = new TT.Mesh(pg, m.pip); s.position.set(n[0] * d + u[0] * cu + w[0] * cw, n[1] * d + u[1] * cu + w[1] * cw, n[2] * d + u[2] * cu + w[2] * cw);
        s.scale.set(n[0] ? .55 : 1, n[1] ? .55 : 1, n[2] ? .55 : 1); g.add(s);
      }
    }
    g.userData.die = id; return g;
  }
  // rotation that brings value v to the top, then a turn (yaw) about the vertical
  function dieRot(g, v, yaw = 0) {
    const R = { 1: [0, 0], 6: [Math.PI, 0], 2: [-Math.PI / 2, 0], 5: [Math.PI / 2, 0], 3: [0, Math.PI / 2], 4: [0, -Math.PI / 2] }[v] || [0, 0];
    g.rotation.set(R[0], yaw, R[1], 'YXZ');
  }
  // the game's own die layout (backgammon/dice3d.js FACES, its frame x right · y down the screen · z up → here x · z · y):
  // used for the rolling dice of the skin (they follow Dice3D's physics) and for the resting-dice renders, so both match
  const GF = [[1, [0, 0, 1], [1, 0, 0], [0, 1, 0]], [6, [0, 0, -1], [1, 0, 0], [0, -1, 0]], [2, [1, 0, 0], [0, 1, 0], [0, 0, 1]], [5, [-1, 0, 0], [0, -1, 0], [0, 0, 1]], [3, [0, -1, 0], [1, 0, 0], [0, 0, 1]], [4, [0, 1, 0], [0, 0, 1], [1, 0, 0]]]
    .map(([v, n, u, w]) => ({ v, n: [n[0], n[2], n[1]], u: [u[0], u[2], u[1]], w: [w[0], w[2], w[1]] }));
  function dieG(id = 'gold', size = .82) {
    const TT = T(), m = dieMat(id), g = new TT.Group(), h = size / 2;
    const body = new TT.Mesh(RB(size, size, size, size * .16, 4), m.body); body.castShadow = body.receiveShadow = true; g.add(body);
    const pg = new TT.SphereGeometry(size * .085, 14, 10), sp = size * .76 / 3;
    for (const F of GF) for (const i of PIPS[F.v]) {
      const cu = (i % 3 - 1) * sp, cw = ((i / 3 | 0) - 1) * sp, d = h - size * .035, s = new TT.Mesh(pg, m.pip);
      s.position.set(F.n[0] * d + F.u[0] * cu + F.w[0] * cw, F.n[1] * d + F.u[1] * cu + F.w[1] * cw, F.n[2] * d + F.u[2] * cu + F.w[2] * cw);
      s.scale.set(F.n[0] ? .55 : 1, F.n[1] ? .55 : 1, F.n[2] ? .55 : 1); g.add(s);
    }
    g.userData.die = id; return g;
  }
  // value v on top, its pip columns along +x and rows along +z (= down the screen): the resting die before the page turns it by its yaw
  function dieGTop(g, v) { const F = GF.find(f => f.v === v), M = new (T().Matrix4)().makeBasis(new (T().Vector3)(...F.u), new (T().Vector3)(...F.n), new (T().Vector3)(...F.w)).transpose(); g.quaternion.setFromRotationMatrix(M); }
  // a Dice3D pose (3×3 row-major rotation in the game frame) → this die's rotation
  const SW3 = [0, 2, 1];
  function dieGPose(g, m) { const e = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) e[i * 3 + j] = m[SW3[i] * 3 + SW3[j]]; g.quaternion.setFromRotationMatrix(new (T().Matrix4)().set(e[0], e[1], e[2], 0, e[3], e[4], e[5], 0, e[6], e[7], e[8], 0, 0, 0, 0, 1)); }
  let cubeTex = {};
  function cube(v = 64, size = .86) {
    const TT = T(), key = String(v);
    if (!cubeTex[key]) {
      const c = cv(256, 256), x = c.getContext('2d');
      x.fillStyle = '#2a1a12'; x.fillRect(0, 0, 256, 256);
      x.globalAlpha = .35; x.drawImage(W_.rosewood(), 0, 0, 256, 256); x.globalAlpha = 1;
      x.strokeStyle = '#d9b468'; x.lineWidth = 7; x.beginPath(); x.arc(128, 128, 92, 0, TAU); x.stroke();
      x.fillStyle = '#ecd39a'; x.font = '700 96px Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(key, 128, 136);
      cubeTex[key] = tex(c, 4);
    }
    const side = new TT.MeshPhysicalMaterial({ color: new TT.Color(0x2a1a12).convertSRGBToLinear(), map: tex(W_.rosewood(), 4), roughness: .3, clearcoat: .8, clearcoatRoughness: .1 });
    const top = new TT.MeshPhysicalMaterial({ map: cubeTex[key], roughness: .3, clearcoat: .8, clearcoatRoughness: .1 });
    const m = new TT.Mesh(RB(size, size, size, size * .14, 4), [side, side, top, side, side, side]); m.castShadow = m.receiveShadow = true;
    return m;
  }

  /* ---------- game geometry helpers (standard board, view side 0 at the bottom) ---------- */
  function slotX(vp, g = geom()) { if (vp <= 6) return g.RX + (6 - vp) + .5; if (vp <= 12) return g.LX + (12 - vp) + .5; if (vp <= 18) return g.LX + (vp - 13) + .5; return g.RX + (vp - 19) + .5; }
  // centre of the k-th checker of a stack of n on view point vp → world [x, z]
  function stackXZ(vp, k, n, g = geom()) {
    const st = n <= 1 ? g.C : Math.min(g.C, (5 * g.C - g.C) / (n - 1));
    const ux = slotX(vp, g), uy = vp >= 13 ? g.TOP + g.C / 2 + k * st : g.BOT - g.C / 2 - k * st;
    return [ux - g.W / 2, uy - g.H / 2];
  }
  const toWorld = (ux, uy, g = geom()) => [ux - g.W / 2, uy - g.H / 2];

  X.MODELS.backgammon = function (live, o) {
    const g = board((o && o.look) || 'marq', (o && o.H) || 12), Y = g.userData.top;
    if (live) return g;
    let ck = ['gold', 'black']; try { const c = JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}').settings.ck; if (c && CKL[c[0]] && CKL[c[1]] && c[0] !== c[1]) ck = c; } catch (e) {}
    const put = (id, vp, n) => { for (let k = 0; k < n; k++) { const c = checker(id), [x, z] = stackXZ(vp, k, n); c.position.set(x, Y, z); g.add(c); const sh = X.contact(.47, .45); sh.position.set(x, Y + .002, z); g.add(sh); } };
    put(ck[0], 24, 2); put(ck[0], 13, 5); put(ck[0], 8, 3); put(ck[0], 6, 5);
    put(ck[1], 1, 2); put(ck[1], 12, 5); put(ck[1], 17, 3); put(ck[1], 19, 5);
    const gm = geom(), d1 = die(ck[0]), d2 = die(ck[0]);
    dieRot(d1, 5, .35); dieRot(d2, 3, -.5);
    const [ax, az] = toWorld(gm.RX + 2.4, gm.MID - .2), [bx, bz] = toWorld(gm.RX + 3.6, gm.MID + .25);
    d1.position.set(ax, Y + .4, az); d2.position.set(bx, Y + .4, bz); g.add(d1, d2);
    const cb = cube(64), [cx, cz] = toWorld(gm.BX + gm.B / 2, gm.MID); cb.position.set(cx, FY + RH + .43, cz); cb.rotation.y = .12; g.add(cb);
    g.scale.setScalar(.7);   // about the other boards' size on the chabudai
    return g;
  };

  /* ---------- top-down renders for the DOM (checkers, slabs in the tray, dice faces, the cube) ---------- */
  function studio(R) {
    const TT = T(), env = new TT.Scene();
    const sky = new TT.Mesh(new TT.SphereGeometry(20, 32, 16), new TT.MeshBasicMaterial({ side: TT.BackSide, vertexColors: true }));
    const col = [], P = sky.geometry.attributes.position, c = new TT.Color();
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 20; const k = y > 0 ? .2 + y * .3 : .06 + (y + 1) * .07; c.setRGB(k, k * .97, k * .92); col.push(c.r, c.g, c.b); }
    sky.geometry.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); env.add(sky);
    [[-8, 12, -6, 10, 6, 2.6], [9, 7, 4, 6, 9, 1.3], [0, 16, 6, 14, 3, 1.2], [-10, 3, 8, 5, 10, .9], [10, 4, -8, 6, 6, .7]].forEach(([x, y, z, w, h, k]) => {
      const p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: new TT.Color(k, k * .97, k * .92), side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
    });
    const pm = new TT.PMREMGenerator(R), t = pm.fromScene(env, .02).texture; pm.dispose(); return t;
  }
  // short blob: URLs (a page full of data: URLs in CSS variables is slow to style and paint)
  function blobURL(d) { try { const b = atob(d.split(',')[1]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return URL.createObjectURL(new Blob([a], { type: 'image/png' })); } catch (e) { return d; } }
  let spriteP = null;
  function sprites(px = 192) {
    if (spriteP) return spriteP;
    return (spriteP = new Promise(res => setTimeout(res, 0)).then(() => {
      const TT = T(), R = new TT.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setPixelRatio(1); R.outputEncoding = TT.sRGBEncoding; R.toneMapping = TT.ACESFilmicToneMapping; R.toneMappingExposure = 1.0; R.setClearColor(0, 0);
      const scene = new TT.Scene(); try { scene.environment = studio(R); } catch (e) {}
      scene.add(new TT.HemisphereLight(0xfff8ee, 0x3a3228, .4));
      const key = new TT.DirectionalLight(0xffffff, .85); key.position.set(-4, 9, -3); scene.add(key);
      const fill = new TT.DirectionalLight(0xfff0dc, .25); fill.position.set(5, 6, 6); scene.add(fill);
      const shot = (obj, hw, hh, w, h) => {
        const cam = new TT.OrthographicCamera(-hw, hw, hh, -hh, .1, 40); cam.position.set(0, 10, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
        R.setSize(w, h, false); scene.add(obj); R.render(scene, cam); const u = blobURL(R.domElement.toDataURL('image/png')); scene.remove(obj); return u;
      };
      const out = { ck: {}, slab: {}, die: {}, cube: '' };
      for (const id of Object.keys(CKL)) {
        out.ck[id] = shot(checker(id), CK_R, CK_R, px, px);
        const s = checker(id); s.rotation.x = Math.PI / 2; s.position.z = -CK_H / 2;   // on its edge: the rim band shows
        const wrap = new TT.Group(); wrap.add(s); out.slab[id] = shot(wrap, .5, .125, px, Math.round(px / 4));
        out.die[id] = [];
        for (let v = 1; v <= 6; v++) { const d = dieG(id, .82); dieGTop(d, v); out.die[id][v] = shot(d, .41, .41, Math.round(px * .9), Math.round(px * .9)); }
      }
      const cb = cube(' ', .86); out.cube = shot(cb, .43, .43, Math.round(px * .9), Math.round(px * .9));
      R.dispose(); R.forceContextLoss && R.forceContextLoss();
      return out;
    }));
  }

  /* ---------- table framing: on a portrait screen the view is a landscape one turned 90° (clockwise, like the
     game's own landscape mode: hold the phone sideways, your side at the bottom) so the long case fills the screen ---------- */
  // o = { SC (board scale), Y (board top, board units), g (geom), rotate (default true), legacy (the tour's framing), band (px of the HUD at the bottom of a landscape view), onChange(mode) } → { rot, toBoard(pick) → {x,z} board units, toCur(x, y, z) for T3.project, stop() }
  function frameOn(board, T3, o) {
    const TT = T(), g = o.g, SC = o.SC;
    let rot = null;
    const aspect = () => { const c = T3.renderer && T3.renderer() && T3.renderer().domElement; return c && c.clientHeight ? c.clientWidth / c.clientHeight : innerWidth / innerHeight; };   // the whole canvas (the play view has no inset; the showcase inset is still easing out at start)
    function apply() {
      const a = aspect(), r = o.rotate !== false && a < .8, cv = T3.renderer && T3.renderer() && T3.renderer().domElement, cs = cv && cv.clientWidth ? Math.min(cv.clientWidth, cv.clientHeight) : Math.min(innerWidth, innerHeight), short = cs;
      // 'turn': portrait screen held sideways · 'wide': a short landscape screen (phone) · 'norm'
      const mode = r ? 'turn' : o.band && a > 1.3 && short < 560 ? 'wide' : 'norm', key = mode + ':' + a.toFixed(3);
      if (key === rot) return; rot = key;
      if (o.legacy) { if (T3.fit) T3.fit({ w: (g.W + 1) * SC, d: (g.H + .6) * SC, y: o.Y * SC, pitch: 1.18 }); }
      else if (mode === 'norm') {   // as large as the screen allows; a band at the top is kept for the HUD
        const bw = g.W + 1.1, bd = g.H + .9, top = .05, dT = bd * SC / (1 - top);   // the case incl. its rails (+ perspective)
        board.position.set(0, 0, top / 2 * dT);
        if (T3.fit) T3.fit({ w: bw * SC, d: dT, y: o.Y * SC, pitch: 1.2 });
      } else {   // a landscape view (turn: the camera rolls 90°, a true landscape on the portrait screen): the case centred, as large
        // as the landscape height allows after the HUD's own thickness (o.band px) at the landscape bottom
        const bw = g.W + 1.2, bd = g.H + .6, top = .015, bot = Math.min(.3, o.band / short), wT = bw * SC, dT = bd * SC / (1 - top - bot);   // the case incl. its rails (+ perspective)
        board.position.set(0, 0, (top - bot) / 2 * dT);
        if (T3.fit) T3.fit(r ? { w: dT, d: wT, y: o.Y * SC, pitch: 1.25, roll: 1 } : { w: wT, d: dT, y: o.Y * SC, pitch: 1.25 });
      }
      board.updateMatrix(); board.updateMatrixWorld(true);
      T3.kick(600); if (o.onChange) o.onChange(mode);
    }
    apply();
    const onR = () => { apply(); setTimeout(apply, 350); };
    addEventListener('resize', onR); if (window.visualViewport) visualViewport.addEventListener('resize', onR);
    const ts = [300, 800, 1600].map(ms => setTimeout(apply, ms));   // the canvas aspect settles after the play / rules layout
    const inv = new TT.Matrix4();
    return {
      get mode() { return String(rot).split(':')[0]; },
      check: apply,
      toBoard(p) { board.updateMatrix(); inv.copy(board.matrix).invert(); const v = new TT.Vector3(p.x, o.Y * SC, p.z).applyMatrix4(inv); return { x: v.x, z: v.z }; },
      toCur(x, y, z) { board.updateMatrix(); return new TT.Vector3(x, y, z).applyMatrix4(board.matrix); },
      stop() { removeEventListener('resize', onR); if (window.visualViewport) visualViewport.removeEventListener('resize', onR); ts.forEach(clearTimeout); },
    };
  }

  X.backgammon = { board, frameOn, checker, die, dieRot, dieG, dieGTop, dieGPose, cube, sprites, geom, slotX, stackXZ, toWorld, FY, RH, CKL, DIE, CK_R, CK_H };
})();
