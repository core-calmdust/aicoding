/* =====================================================================
   Crokinole on the 3D table — six boards (Table3D.BOARDS.crokinole, chosen in the portal's 盤 row):
   · 'classic' (the default) the Ontario parlour board: a honey maple veneer, flat-sawn (soft cathedral arches, latewood lines,
              fibres, a few pores), lacquered; the 5 / 10 / 15 lines and the quadrant lines in black, a red ring round the 20 hole;
              eight brass pegs with black rubber sleeves on the 15 line; a green felt ditch and a round walnut rail. Discs of
              red- and black-stained maple with turned rings.
   · 'marq'    marquetry (寄木細工): sixteen radial wedges of maple and cherry between the 15 and 5 lines, a field of small
              triangles of maple, cherry and walnut inside the 15 and in a band outside the 5; walnut lines, maple pegs, a walnut
              rail with a maple stringer, a brown suede ditch. Discs of cherry and ebony with a maple inlay ring.
   · 'winter'  Canadian winter: a pale ice surface with frost and hairline cracks, faint snowflakes, a red maple leaf under
              the hole, the lines in aurora colours (teal → green → violet); a white birch rail, a navy felt ditch, chrome pegs
              with red sleeves. Glossy red and navy-black discs with a white ring.
   · 'mcm'     mid-century: a teak surface in satin oil, cream lines, atomic starbursts, boomerangs and rings in turquoise,
              mustard and orange; a teak rail with a brass ring, a turquoise felt ditch. Discs of orange and charcoal.
   · 'modern'  modern art: warm paper printed with colour fields (terracotta, saffron, teal, ink) in the four quarters, a ring
              of arcs and a flower of circles round the hole, risograph grain; ink lines; a matte ink-blue rail with a brass ring,
              a terracotta ditch. Matte coral and ink discs with a brass pip.
   · 'neon'      the night board of carrom carried over: black lacquer with the lines glowing in a flowing rainbow (gaming RGB),
              the rail's top edge and the pegs lit, discs of acrylic with an RGB ring that flash when they knock.
   Real proportions (NCA): a 26-inch playing surface, lines at 8 / 16 / 24 inches, a 1⅜-inch hole, a 2-inch ditch, 1¼-inch discs.
   Registers into Table3D:
     Table3D.MODELS.crokinole(live)   board (+ a few discs in play unless live)
     Table3D.crokinole = { board(look), LOOKS, K }
     userData: { top, K, look, RO (outer radius, world), RDITCH (the ditch's middle, world), DITCHY (its floor), xz(x, y),
                 piece(c 0|1) → Group, dot(c) → css colour }
   Units: K world units per cm (the 80 cm board ≈ 10 world units across).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const IN = 2.54, K = 10 / 80;
  const RB = 13 * IN, R5 = 12 * IN, R10 = 8 * IN, R15 = 4 * IN, RH = 1.375 * IN / 2, RD = 1.25 * IN / 2, RP = .55;
  const DW = 2 * IN, RR = RB + DW, RO = RR + 2.2;   // the ditch (2 in), the rail (2.2 cm thick)
  const TOP = .26, DY = TOP - 1.3 * K, RAIL_H = TOP + 2.4 * K, HD = .9 * K, PEG_H = 1.6 * K;
  const LOOKS = ['classic', 'neon', 'marq', 'winter', 'mcm', 'modern'];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const lookNow = () => X.BOARDS && X.BOARDS.crokinole ? X.BOARDS.crokinole.get() : 'classic';

  /* ---------- gaming RGB (the neon board): the glow's hue flows with the clock (as carrom's night board) ---------- */
  const RGB = { uT: { value: 0 } };
  const HUE = 'vec3 ckHue(float h){return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);}\n';
  function rgbify(m, mode) {
    m.customProgramCacheKey = () => 'ckRGB' + mode;
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = RGB.uT;
      if (mode !== 'uv') sh.vertexShader = 'varying vec3 vCkP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCkP = position;');
      sh.fragmentShader = 'uniform float uT;\n' + (mode !== 'uv' ? 'varying vec3 vCkP;\n' : '') + HUE + sh.fragmentShader;
      const hue = mode === 'uv' ? 'vec2 ckp = vUv - 0.5; float ckh = atan(ckp.y, ckp.x) / 6.2831853 - length(ckp) * 1.2 - uT * 0.16;'
        : mode === 'halo' ? 'float ckh = atan(vCkP.z, vCkP.x) / 6.2831853 + uT * 1.4;'
        : 'float ckh = atan(vCkP.z, vCkP.x) / 6.2831853 - uT * 0.5;';
      if (mode === 'halo') sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', '{ ' + hue + ' outgoingLight = ckHue(fract(ckh)) * 1.15; }\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
      else sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ ' + hue + ' float ckL = max(max(totalEmissiveRadiance.r, totalEmissiveRadiance.g), totalEmissiveRadiance.b); totalEmissiveRadiance = ckHue(fract(ckh)) * ckL * 1.2; }');
    };
    return m;
  }

  /* ---------- the playing surface: a canvas in board centimetres (the square round the circle) ---------- */
  const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  // flat-sawn wood in centimetres: a across the grain, b along it (cathedral arches round (cx, by), latewood lines, fibres, pores)
  function woodT(N, a, b, o) {
    const ox = o.off || 0;
    const wob = (N(a * .06 + ox, b * .022, 3) - .5) * o.wp + (N(a * .45 + ox, b * .1, 2) - .5) * o.wp * .18;
    const r = Math.sqrt((a - o.cx) * (a - o.cx) + (b - o.by) * (b - o.by) * o.asp * o.asp) + wob;
    const f = ((r / o.sp) % 1 + 1) % 1;
    const late = Math.exp(-Math.pow((f - .8) / .05, 2)) + .4 * Math.exp(-Math.pow((f - .8) / .17, 2));
    const fib = N(a * 2.4 + ox, b * .05, 2), fine = N(a * 16 + ox, b * .3, 1);
    let t = late * o.ring + (fib - .5) * o.fib + (fine - .5) * o.fib * .45 + (N(a * .045 + ox, b * .045, 2) - .5) * o.drift;
    if (late > .5 && N(a * 42 + ox, b * .7, 1) > .8) t += o.ring * .3;
    return Math.max(-.3, Math.min(1, t));
  }
  const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  const WOOD = { maple: [hx('#ecd3a2'), hx('#c39663')], cherry: [hx('#c98a5c'), hx('#8c4a2a')], walnut: [hx('#7a5134'), hx('#3e2514')], teak: [hx('#c27d48'), hx('#7a4220')] };
  const hash = (i, j, k) => { const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453; return v - Math.floor(v); };
  // a triangle tiling (寄木): which tile, its wood, its grain direction and how close to its edge
  function triTile(x, y, s) {
    const b = y / (s * .8660254), a = x / s - b * .5, ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib, up = fa + fb < 1 ? 1 : 0;
    const e = up ? Math.min(fa, fb, 1 - fa - fb) : Math.min(1 - fa, 1 - fb, fa + fb - 1);
    return { h: hash(ia, ib, up), up, e, dir: (Math.floor(hash(ib, ia, up + 3) * 3)) * Math.PI / 3 + Math.PI / 6 };
  }
  const SURF = {
    classic: (N) => { const O = { cx: 4, by: -46, asp: .11, sp: .62, wp: 2.2, ring: .55, fib: .34, drift: .32 }, A = hx('#ebd09d'), B = hx('#b8864f');
      return (x, y) => mix(A, B, .14 + woodT(N, x, y, O) * .66); },
    marq: (N) => {
      const W3 = [WOOD.maple, WOOD.cherry, WOOD.walnut], O = { cx: 0, by: -40, asp: .08, sp: .45, wp: 1.4, ring: .5, fib: .4, drift: .25 };
      return (x, y) => {
        const r = Math.hypot(x, y);
        if (r < R15 - .35 || r > R5 + .45) {
          const T = triTile(x, y, r < R15 ? 1.7 : 1.25), w = W3[T.h < .42 ? 0 : T.h < .76 ? 1 : 2], c = Math.cos(T.dir), sn = Math.sin(T.dir);
          const t = woodT(N, x * c + y * sn, -x * sn + y * c, Object.assign({}, O, { off: T.h * 40 })), col = mix(w[0], w[1], .15 + t * .5);
          return T.e < .035 ? mix(col, [40, 24, 14], .55) : col;
        }
        const n = 16, th = Math.atan2(y, x), k = Math.floor((th + Math.PI) / (2 * Math.PI / n)), thc = -Math.PI + (k + .5) * 2 * Math.PI / n;
        const tan = r * Math.sin(th - thc), w = k % 2 ? WOOD.cherry : WOOD.maple;
        const col = mix(w[0], w[1], .12 + woodT(N, tan, r, Object.assign({}, O, { off: k * 9.7, by: -30 })) * .5);
        const seam = Math.abs(r * Math.sin(th - (-Math.PI + k * 2 * Math.PI / n)));
        return seam < .05 || Math.abs(r * Math.sin(th - (-Math.PI + (k + 1) * 2 * Math.PI / n))) < .05 ? mix(col, [40, 24, 14], .5) : col;
      };
    },
    winter: (N) => { const A = hx('#eef6fb'), B = hx('#b9d2e4');
      return (x, y) => {
        const fr = N(x * .22, y * .22, 4), fine = N(x * 2.5, y * 2.5, 2);
        let t = fr * .55 + (fine - .5) * .25;
        const cr = Math.abs(N(x * .09 + 3, y * .09 - 7, 4) - .5), cr2 = Math.abs(N(x * .21 - 5, y * .21 + 2, 3) - .5);
        let col = mix(A, B, Math.max(0, Math.min(1, t)));
        if (cr < .006) col = mix(col, [255, 255, 255], .75); else if (cr < .014) col = mix(col, [150, 185, 210], .25);
        if (cr2 < .004) col = mix(col, [255, 255, 255], .5);
        if (hash(Math.floor(x * 6), Math.floor(y * 6), 1) > .985) col = mix(col, [255, 255, 255], .6);   // pebble
        return col;
      };
    },
    mcm: (N) => { const O = { cx: 60, by: -10, asp: .03, sp: .5, wp: 3, ring: .55, fib: .45, drift: .35 }, w = WOOD.teak;
      return (x, y) => mix(w[0], w[1], .18 + woodT(N, y, x, O) * .55); },
    modern: (N) => (x, y) => { const n = N(x * .6, y * .6, 2); return [239 - n * 14, 228 - n * 14, 208 - n * 14]; },
  };
  // the ink of the lines, the red of the hole's ring, and what each look paints over its field
  const INK = { classic: ['#17110c', '#b8241c'], neon: ['#3ce6ff', '#ff3fb4'], marq: ['#2b1a0f', '#7c2a19'], winter: ['aurora', '#c8202a'], mcm: ['#f5e8cc', '#e0602c'], modern: ['#1d2340', '#d0563c'] };
  function decorate(g, look, u, X0) {
    const at = (x, y) => [X0(x), X0(y)];
    if (look === 'marq') {   // maple and walnut stringers round the triangle fields
      for (const [r, c, w] of [[R15 - .35, '#e9cf9c', .22], [R15 - .6, '#3a2414', .1], [R5 + .45, '#e9cf9c', .22], [R5 + .7, '#3a2414', .1]]) { g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.arc(X0(0), X0(0), r * u, 0, Math.PI * 2); g.stroke(); }
    } else if (look === 'winter') {
      // a soft aurora veil, a red maple leaf under the hole, snowflakes
      g.save(); g.globalCompositeOperation = 'multiply';
      for (const [y0, c] of [[-15, 'rgba(90,210,180,.32)'], [-7, 'rgba(150,120,240,.24)'], [12, 'rgba(110,200,230,.18)']]) { g.fillStyle = c; g.beginPath(); g.moveTo(X0(-RB), X0(y0)); for (let x = -RB; x <= RB; x += 2) g.lineTo(X0(x), X0(y0 + Math.sin(x * .13) * 3 - 4)); for (let x = RB; x >= -RB; x -= 2) g.lineTo(X0(x), X0(y0 + Math.sin(x * .13 + 1) * 3 + 4)); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      const L = [[0, -1], [.06, -.5], [.52, -.6], [.44, -.42], [.88, -.06], [.72, -.02], [.84, .3], [.56, .18], [.5, .36], [.3, .14], [.36, .7], [.18, .6], [0, .98]];
      g.fillStyle = 'rgba(200,32,42,.3)'; g.beginPath(); const S = 6.2;
      L.forEach(([a, b], i) => { const [px, py] = at(a * S, -b * S + .6); i ? g.lineTo(px, py) : g.moveTo(px, py); });
      for (let i = L.length - 2; i >= 0; i--) { const [a, b] = L[i]; const [px, py] = at(-a * S, -b * S + .6); g.lineTo(px, py); }
      g.fill();
      const flake = (x, y, s, a) => { g.save(); g.translate(X0(x), X0(y)); g.rotate(a); g.strokeStyle = 'rgba(96,140,190,.5)'; g.lineWidth = .14 * u; g.lineCap = 'round';
        for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * u); for (const q of [.45, .7]) { g.moveTo(0, -s * q * u); g.lineTo(s * .22 * u, -s * (q + .17) * u); g.moveTo(0, -s * q * u); g.lineTo(-s * .22 * u, -s * (q + .17) * u); } g.stroke(); }
        g.restore(); };
      [[14, -18, 2.2, .2], [-19, -12, 1.6, .5], [-15, 18, 2.4, .1], [20, 14, 1.7, .7], [3, 24, 1.3, .3], [-3, -25, 1.4, .9], [25, -4, 1.2, .4], [-25, 3, 1.3, .6]].forEach(f => flake(...f));
      g.restore();
    } else if (look === 'mcm') {
      const TQ = '#2fa39a', MU = '#e3aa2e', OR = '#e0602c', CR = '#f5e8cc';
      const star = (x, y, s, c) => { g.strokeStyle = c; g.lineWidth = .16 * u; g.lineCap = 'round'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, l = k % 2 ? s * .55 : s; g.beginPath(); g.moveTo(X0(x + Math.cos(a) * s * .18), X0(y + Math.sin(a) * s * .18)); g.lineTo(X0(x + Math.cos(a) * l), X0(y + Math.sin(a) * l)); g.stroke(); } g.fillStyle = c; g.beginPath(); g.arc(X0(x), X0(y), s * .14 * u, 0, 7); g.fill(); };
      const boom = (x, y, s, a, c) => { g.save(); g.translate(X0(x), X0(y)); g.rotate(a); g.scale(s * u, s * u); g.fillStyle = c; g.beginPath(); g.moveTo(-1, .2); g.quadraticCurveTo(-.2, -.9, 1, .1); g.quadraticCurveTo(1.15, .35, .9, .4); g.quadraticCurveTo(-.1, -.35, -.8, .55); g.quadraticCurveTo(-1.15, .5, -1, .2); g.fill(); g.restore(); };
      const ring = (x, y, r, c, w) => { g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.arc(X0(x), X0(y), r * u, 0, 7); g.stroke(); };
      g.globalAlpha = .9;
      for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2, R = (R10 + R5) / 2, c = Math.cos(a), s = Math.sin(a), p = (dx, dy) => [c * dx - s * dy, s * dx + c * dy];
        const [x1, y1] = p(R, -5), [x2, y2] = p(R - 3.5, 6.5), [x3, y3] = p(R + 2, 7.5);
        star(x1, y1, 2.6, [MU, TQ, OR, CR][q]); boom(x2, y2, 2.4, a + .6, [TQ, OR, MU, TQ][q]); ring(x3, y3, 1.3, [OR, MU, TQ, OR][q], .35); }
      for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4 + Math.PI / 8, R = (R15 + R10) / 2; g.fillStyle = [TQ, MU, OR, CR][k % 4]; g.beginPath(); g.arc(X0(Math.cos(a) * R), X0(Math.sin(a) * R), .55 * u, 0, 7); g.fill(); }
      g.globalAlpha = 1;
    } else if (look === 'modern') {
      g.save(); g.globalCompositeOperation = 'multiply';
      const COL = ['#c8643f', '#e0a43a', '#2f8a83', '#2c3a6b'];
      const sector = (r0, r1, a0, a1, c, al) => { g.globalAlpha = al; g.fillStyle = c; g.beginPath(); g.arc(X0(0), X0(0), r1 * u, a0, a1); g.arc(X0(0), X0(0), r0 * u, a1, a0, true); g.closePath(); g.fill(); };
      for (let q = 0; q < 4; q++) { const a0 = Math.PI / 4 + q * Math.PI / 2, a1 = a0 + Math.PI / 2;
        sector(R10, R5, a0, a1, COL[q], .86);
        sector(R10 + 2.5, R10 + 6.5, a0 + .25, a1 - .25, COL[(q + 1) % 4], .5);
        const m = (a0 + a1) / 2; g.globalCompositeOperation = 'source-over'; g.globalAlpha = .9; g.fillStyle = '#f3e7cf'; g.beginPath(); g.arc(X0(Math.cos(m) * (R5 - 3.4)), X0(Math.sin(m) * (R5 - 3.4)), 1.2 * u, 0, 7); g.fill(); g.globalCompositeOperation = 'multiply'; }
      for (let k = 0; k < 8; k++) { const a0 = k * Math.PI / 4 + .06, a1 = (k + 1) * Math.PI / 4 - .06; sector(R15 + .6, R10 - .6, a0, a1, COL[k % 4], k % 2 ? .3 : .5); }
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.globalAlpha = .26; g.fillStyle = COL[k % 4]; g.beginPath(); g.arc(X0(Math.cos(a) * 3.6), X0(Math.sin(a) * 3.6), 3.6 * u, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.restore();
    }
  }
  function surfaceTex(look) {
    const W = SZ(2048);
    return X.canvasTex('ckSurf' + look + W, W, W, (g) => {
      const u = W / (2 * RB), X0 = cm => (cm + RB) * u, N = X.makeNoise({ neon: 7, classic: 23, marq: 31, winter: 43, mcm: 59, modern: 67 }[look] || 23), img = g.createImageData(W, W), d = img.data;
      if (look === 'neon') {
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 30, y / W * 30, 2), i = (y * W + x) * 4; d[i] = 11 - n * 6; d[i + 1] = 12 - n * 6; d[i + 2] = 24 - n * 8; d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = 'rgba(70,90,200,.14)'; g.lineWidth = .06 * u;
        for (let r = 2; r < RB; r += 2) { g.beginPath(); g.arc(X0(0), X0(0), r * u, 0, Math.PI * 2); g.stroke(); }
      } else {
        const px = SURF[look](N);
        for (let y = 0; y < W; y++) { const cy = y / u - RB; for (let x = 0; x < W; x++) { const c = px(x / u - RB, cy), i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } }
        g.putImageData(img, 0, 0);
        decorate(g, look, u, X0);
        if (look === 'modern') { const im = g.getImageData(0, 0, W, W), q = im.data; for (let i = 0; i < q.length; i += 4) { const r = (Math.random() - .5) * 14; q[i] += r; q[i + 1] += r; q[i + 2] += r; } g.putImageData(im, 0, 0); }
      }
      const neon = look === 'neon', [inkC, red] = INK[look] || INK.classic;
      let ink = inkC;
      if (inkC === 'aurora') { const lg = g.createLinearGradient(0, 0, W, W); lg.addColorStop(0, '#0b7088'); lg.addColorStop(.5, '#16804a'); lg.addColorStop(1, '#4d2fa0'); ink = lg; }
      const glow = c => { if (neon) { g.shadowColor = c; g.shadowBlur = 1.1 * u; } };
      const circ = (r, w, c) => { glow(c); g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.arc(X0(0), X0(0), r * u, 0, Math.PI * 2); g.stroke(); };
      const lw = look === 'marq' ? 1.25 : look === 'winter' ? 1.15 : 1;
      circ(R5, .32 * lw, ink); circ(R10, .26 * lw, ink); circ(R15, .26 * lw, ink);
      // the quadrant lines: on the diagonals, from the 10 line out to the 5 line
      glow(inkC); g.strokeStyle = ink; g.lineWidth = .26 * lw * u;
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); g.beginPath(); g.moveTo(X0(c * R10), X0(s * R10)); g.lineTo(X0(c * R5), X0(s * R5)); g.stroke(); }
      // the ring round the 20 hole and a fine inner ring (decoration)
      g.fillStyle = red; glow(red); g.beginPath(); g.arc(X0(0), X0(0), (RH + .9) * u, 0, Math.PI * 2); g.arc(X0(0), X0(0), RH * u, Math.PI * 2, 0, true); g.fill();
      circ(R15 - 1.1, .1, neon ? '#b47bff' : look === 'modern' ? '#b8893a' : look === 'mcm' ? 'rgba(245,232,204,.6)' : look === 'winter' ? 'rgba(80,120,170,.4)' : 'rgba(23,17,12,.55)');
      g.shadowBlur = 0;
    });
  }

  /* ---------- the discs' faces: [colour, style] per look (wood = turned rings, inlay = a maple ring, ice = a white ring, pip = a brass pip) ---------- */
  const FACES = { classic: [['#b3312a', 'wood'], ['#211c19', 'wood']], marq: [['#9c3324', 'inlay'], ['#1c1512', 'inlay']], winter: [['#c62a30', 'ice'], ['#1d2433', 'ice']],
    mcm: [['#d4552a', 'wood'], ['#2b2826', 'wood']], modern: [['#cf5a40', 'pip'], ['#272a35', 'pip']] };
  const NEONF = { n0: '#d8f6ff', n1: '#2a1f48' };
  function faceTex(look, c) {
    const kind = look === 'neon' ? 'n' + c : look + c;
    return X.canvasTex('ckFace' + kind, SZ(256), SZ(256), (g, W) => {
      const cc = W / 2;
      const ring = (r, w, col, blur) => { g.save(); if (blur) { g.shadowColor = col; g.shadowBlur = W * blur; } g.strokeStyle = col; g.lineWidth = W * w; g.beginPath(); g.arc(cc, cc, cc * r, 0, 7); g.stroke(); g.restore(); };
      if (look === 'neon') { g.fillStyle = NEONF[kind]; g.fillRect(0, 0, W, W); ring(.8, .05, c === 0 ? '#3ce6ff' : '#ff3fb4', .06); ring(.5, .025, c === 0 ? 'rgba(60,230,255,.6)' : 'rgba(255,63,180,.6)', .04); return; }
      const [col, st] = (FACES[look] || FACES.classic)[c];
      g.fillStyle = col; g.fillRect(0, 0, W, W);
      if (st === 'wood' || st === 'inlay') {
        const N = X.makeNoise(c === 0 ? 3 : 5), img = g.getImageData(0, 0, W, W), d = img.data;
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 2, y / W * 9, 2), i = (y * W + x) * 4, k = (n - .5) * 14; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
        g.putImageData(img, 0, 0);
      }
      if (st === 'wood') { const rc = c === 0 ? 'rgba(60,10,5,.35)' : 'rgba(255,230,200,.16)'; for (const r of [.86, .58]) ring(r, .02, rc); }
      else if (st === 'inlay') { ring(.66, .07, '#e6c793'); ring(.66, .012, 'rgba(60,30,10,.5)'); }
      else if (st === 'ice') { ring(.74, .05, 'rgba(255,255,255,.92)'); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(cc, cc, cc * .14, 0, 7); g.fill(); }
      else if (st === 'pip') { g.fillStyle = '#c99a45'; g.beginPath(); g.arc(cc, cc, cc * .2, 0, 7); g.fill(); ring(.2, .015, 'rgba(90,60,20,.6)');
        const im = g.getImageData(0, 0, W, W), q = im.data; for (let i = 0; i < q.length; i += 4) { const r = (Math.random() - .5) * 12; q[i] += r; q[i + 1] += r; q[i + 2] += r; } g.putImageData(im, 0, 0); }
    });
  }

  /* ---------- geometry ---------- */
  const geos = {};
  const share = g => { if (X.share) X.share(g); return g; };
  function discGeo() {
    if (geos.disc) return geos.disc;
    const TT = T(), r = RD * K, h = HD, b = h * .3, st = LO() ? 3 : 4, pts = [new TT.Vector2(.001, 0)];
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new TT.Vector2(.001, h));
    const g = new TT.LatheGeometry(pts, LO() ? 20 : 30), P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * r) + .5, P.getZ(i) / (2 * r) + .5);
    g.computeVertexNormals(); return (geos.disc = share(g));
  }
  function surfaceGeo() {
    if (geos.surf) return geos.surf;
    const TT = T(), sh = new TT.Shape(); sh.absarc(0, 0, RB * K, 0, Math.PI * 2, false);
    const h = new TT.Path(); h.absarc(0, 0, RH * K, 0, Math.PI * 2, true); sh.holes.push(h);
    const g = new TT.ShapeGeometry(sh, LO() ? 48 : 96); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * RB * K) + .5, 1 - (P.getZ(i) / (2 * RB * K) + .5));
    return (geos.surf = share(g));
  }
  // the rail: a ring with a rounded top (lathe of its cross-section)
  function railGeo() {
    if (geos.rail) return geos.rail;
    const TT = T(), V = TT.Vector2, ri = RR * K, ro = RO * K, h = RAIL_H, b = .08, st = LO() ? 3 : 5, pts = [new V(ro, 0)];
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new V(ro - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new V(ri + b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new V(ri, DY - .02));
    const g = new TT.LatheGeometry(pts, LO() ? 48 : 96); g.computeVertexNormals();
    const P = g.attributes.position, UV = g.attributes.uv;   // the grain runs round the rail
    for (let i = 0; i < UV.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)); UV.setXY(i, (a / (Math.PI * 2) + .5) * 6, P.getY(i) * 2 + Math.hypot(P.getX(i), P.getZ(i)) * .6); }
    return (geos.rail = share(g));
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    const TT = T();
    if (look === 'neon') return mat('bm' + look, () => {
      const st = surfaceTex(look), surf = phys({ map: st, color: '#4a4a4a', roughness: .25, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .5 });
      surf.emissiveMap = st; surf.emissive = new TT.Color(.95, .95, .95); rgbify(surf, 'uv');
      const glowM = () => { const m = phys({ color: '#000000', roughness: .4, metalness: 0 }); m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = 1.6; return rgbify(m, 'ring'); };
      return { surf, edge: phys({ color: '#0b0c14', roughness: .25, metalness: 0 }), rail: phys({ color: '#0b0c14', roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 }),
        ditch: phys({ color: '#07070d', roughness: .95 }), glow: glowM(), peg: phys({ color: '#15151f', roughness: .3, metalness: .4 }), sleeve: glowM(), cup: phys({ color: '#05050a', roughness: 1 }), base: phys({ color: '#0b0c14', roughness: .5 }) };
    });
    return mat('bm' + look, () => {
      const wood = (k, a, b) => { const t = X.wood(k, a, b, SZ(1024), SZ(256), 1.2); t.wrapS = t.wrapT = TT.RepeatWrapping; return t; };
      const brassM = () => { const m = phys({ color: '#d4a64e', roughness: .25, metalness: 1, envMapIntensity: 1.2 }); m.emissive = new TT.Color(0x2a1a06); return m; };
      const M = { cup: phys({ color: '#0f0d0c', roughness: 1 }), glow: null, trim: null };
      if (look === 'marq') {
        const rw = wood('ckWalnutM', '#5d3a20', '#24140a');
        Object.assign(M, { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .22, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: .85 }), edge: phys({ color: '#6a4328', roughness: .4 }),
          rail: phys({ map: rw, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .18 }), ditch: phys({ color: '#3a2618', roughness: 1 }),
          peg: phys({ color: '#e1c08a', roughness: .45 }), sleeve: phys({ color: '#111111', roughness: .85 }), base: phys({ map: rw, color: '#d8c8b8', roughness: .5 }), trim: phys({ color: '#ecd09a', roughness: .35, clearcoat: .8 }) });
      } else if (look === 'winter') {
        const rw = wood('ckBirchW', '#f1f3f2', '#cfd6d8');
        Object.assign(M, { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .1, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.1 }), edge: phys({ color: '#dbe7ef', roughness: .3 }),
          rail: phys({ map: rw, color: '#ffffff', roughness: .3, clearcoat: .9, clearcoatRoughness: .12 }), ditch: phys({ color: '#1b2b4a', roughness: 1 }),
          peg: phys({ color: '#e8edf2', roughness: .14, metalness: 1, envMapIntensity: 1.3 }), sleeve: phys({ color: '#b3202a', roughness: .7 }), base: phys({ map: rw, color: '#e6ebee', roughness: .5 }), trim: phys({ color: '#c8202a', roughness: .4, clearcoat: .8 }) });
      } else if (look === 'mcm') {
        const rw = wood('ckTeakR', '#8a5028', '#3d200c');
        Object.assign(M, { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .38, clearcoat: .35, clearcoatRoughness: .4, envMapIntensity: .7 }), edge: phys({ color: '#8a4f26', roughness: .5 }),
          rail: phys({ map: rw, color: '#ffffff', roughness: .45, clearcoat: .3, clearcoatRoughness: .4 }), ditch: phys({ color: '#2a8c86', roughness: 1 }),
          peg: brassM(), sleeve: phys({ color: '#1a1a1a', roughness: .85 }), base: phys({ map: rw, color: '#d8c8b8', roughness: .5 }), trim: brassM() });
      } else if (look === 'modern') {
        Object.assign(M, { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .78, metalness: 0, envMapIntensity: .5 }), edge: phys({ color: '#1d2340', roughness: .6 }),
          rail: phys({ color: '#1d2340', roughness: .55, clearcoat: .3, clearcoatRoughness: .5 }), ditch: phys({ color: '#b4553a', roughness: 1 }),
          peg: brassM(), sleeve: phys({ color: '#1d2340', roughness: .8 }), base: phys({ color: '#1d2340', roughness: .6 }), trim: brassM() });
      } else {
        const rw = wood('ckWalnut', '#6b4426', '#2a170b');
        Object.assign(M, { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .2, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .85 }),
          edge: phys({ color: '#c9a576', roughness: .4 }), rail: phys({ map: rw, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: 1 }),
          ditch: phys({ color: '#1f4a34', roughness: 1 }), peg: brassM(), sleeve: phys({ color: '#111111', roughness: .85 }), base: phys({ map: rw, color: '#d8c8b8', roughness: .5 }) });
      }
      return M;
    });
  }
  function pieceMat(look, c) {
    const neon = look === 'neon', st = neon ? 'neon' : ((FACES[look] || FACES.classic)[c][1]);
    return mat('pc' + look + c, () => {
      const t = faceTex(look, c);
      const P = st === 'ice' ? { roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.1 } : st === 'pip' ? { roughness: .72, envMapIntensity: .5 } : { roughness: .36, clearcoat: .4, clearcoatRoughness: .3, envMapIntensity: .85 };
      const m = phys(Object.assign({ map: t, color: '#ffffff' }, P));
      if (neon) { m.emissiveMap = t; m.emissive = new (T().Color)(.55, .55, .55); }
      return m;
    });
  }
  function pieceGroup(look, c) {
    const TT = T(), neon = look === 'neon', base = pieceMat(look, c), top = neon ? base.clone() : base, r = RD * K;
    const g = new TT.Group(), body = new TT.Mesh(discGeo(), top); body.castShadow = true; body.receiveShadow = false; g.add(body);
    g.userData = { c, r, h: HD };
    if (neon) {   // an RGB ring round the rim, a rainbow halo and shock ring when it knocks (as carrom's night board)
      const lm = rgbify(phys({ color: '#000000', roughness: .4, metalness: 0 }), 'ring'); lm.emissive = new TT.Color(1, 1, 1); lm.emissiveIntensity = .55;
      const led = new TT.Mesh(geos.led || (geos.led = share((() => { const q = new TT.TorusGeometry(r + .002, .007, 6, LO() ? 28 : 44); q.rotateX(Math.PI / 2); return q; })())), lm); led.position.y = HD * .5; g.add(led);
      const hm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const wm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const hg = geos.halo || (geos.halo = share((() => { const q = new TT.RingGeometry(.5, 1, LO() ? 24 : 40); q.rotateX(-Math.PI / 2); return q; })()));
      const halo = new TT.Mesh(hg, hm); halo.position.y = HD + .002; halo.visible = false; halo.renderOrder = 3; g.add(halo);
      const wave = new TT.Mesh(hg, wm); wave.position.y = .006; wave.visible = false; wave.renderOrder = 3; g.add(wave);
      const e0 = top.emissive.clone();
      g.userData.flash = k => {
        k = Math.max(0, Math.min(1, k)); top.emissive.copy(e0).multiplyScalar(1 + 1.8 * k); lm.emissiveIntensity = .55 + 2.2 * k;
        halo.visible = wave.visible = k > .01; hm.opacity = .55 * k; wm.opacity = .3 * k * k;
        const sc = r * (1.2 + (1 - k) * .9), sw = r * (1.3 + (1 - k) * 2.2); halo.scale.set(sc, 1, sc); wave.scale.set(sw, 1, sw);
      };
    }
    return g;
  }

  /* ---------- the board ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look);
    // the body under it all (a low drum the size of the rail)
    const body = new TT.Mesh(geos.body || (geos.body = share(new TT.CylinderGeometry(RO * K, RO * K, DY - .02, LO() ? 48 : 96))), BM.base); body.position.y = (DY - .02) / 2; body.receiveShadow = true; g.add(body);
    // the ditch's floor
    const df = new TT.Mesh(geos.ditch || (geos.ditch = share((() => { const q = new TT.RingGeometry(RB * K - .01, RR * K + .01, LO() ? 48 : 96, 1); q.rotateX(-Math.PI / 2); return q; })())), BM.ditch); df.position.y = DY; df.receiveShadow = true; g.add(df);
    // the playing surface and its edge (it stands up out of the ditch)
    const surf = new TT.Mesh(surfaceGeo(), BM.surf); surf.position.y = TOP; surf.receiveShadow = true; g.add(surf);
    const edge = new TT.Mesh(geos.edge || (geos.edge = share(new TT.CylinderGeometry(RB * K, RB * K, TOP - DY, LO() ? 48 : 96, 1, true))), BM.edge); edge.position.y = (TOP + DY) / 2; g.add(edge);
    // the 20 hole: a shallow cup
    const cup = new TT.Mesh(geos.cup || (geos.cup = share(new TT.CylinderGeometry(RH * K, RH * K, .1, 24, 1, true))), new TT.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, side: TT.BackSide })); cup.position.y = TOP - .05; g.add(cup);
    const cb = new TT.Mesh(geos.cupb || (geos.cupb = share((() => { const q = new TT.CircleGeometry(RH * K, 24); q.rotateX(-Math.PI / 2); return q; })())), BM.cup); cb.position.y = TOP - .095; g.add(cb);
    // the rail
    const rail = new TT.Mesh(railGeo(), BM.rail); rail.castShadow = rail.receiveShadow = true; g.add(rail);
    if (BM.trim) { const tr = new TT.Mesh(geos.trim || (geos.trim = share((() => { const q = new TT.TorusGeometry((RR + (RO - RR) * .5) * K, .016, 6, LO() ? 64 : 128); q.rotateX(Math.PI / 2); return q; })())), BM.trim); tr.position.y = RAIL_H - .004; g.add(tr); }
    if (BM.glow) { const tube = new TT.Mesh(geos.tube || (geos.tube = share((() => { const q = new TT.TorusGeometry(RR * K + .03, .014, 6, LO() ? 64 : 128); q.rotateX(Math.PI / 2); return q; })())), BM.glow); tube.position.y = RAIL_H - .01; g.add(tube); }
    // the pegs on the 15 line: a post and a rubber sleeve
    const post = geos.post || (geos.post = share(new TT.CylinderGeometry(RP * K * .62, RP * K * .62, PEG_H, 16)));
    const sleeve = geos.sleeve || (geos.sleeve = share(new TT.CylinderGeometry(RP * K, RP * K, PEG_H * .55, 20)));
    for (let k = 0; k < 8; k++) {
      const a = (k + .5) * Math.PI / 4, x = Math.cos(a) * R15 * K, z = Math.sin(a) * R15 * K;
      const p = new TT.Mesh(post, BM.peg); p.position.set(x, TOP + PEG_H / 2, z); p.castShadow = true; g.add(p);
      const sl = new TT.Mesh(sleeve, BM.sleeve); sl.position.set(x, TOP + PEG_H * .32, z); sl.castShadow = true; g.add(sl);
    }
    if (look === 'neon') { surf.userData.keep = true; surf.onBeforeRender = () => { RGB.uT.value = performance.now() / 1000; }; }
    const U = g.userData;
    U.top = TOP; U.K = K; U.look = look; U.RO = RO * K; U.RDITCH = (RB + DW / 2) * K; U.DITCHY = DY; U.R = RD * K;
    U.xz = (x, y) => [x * K, y * K];
    U.piece = c => pieceGroup(look, c);
    U.dot = c => look === 'neon' ? (c === 0 ? '#bff0ff' : '#ff3fb4') : (FACES[look] || FACES.classic)[c][0];
    return g;
  }

  X.MODELS.crokinole = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: a round in play — discs on the 15, 10 and 5, one behind a peg, two in the ditch
    const U = g.userData;
    const at = [[0, 3.2, 6.6], [1, -4.8, -5.4], [0, 12.6, 3.4], [1, -2.6, 13.8], [0, -14.4, 7.2], [1, 9.6, -11.2], [0, 5.3, 12.6], [1, 22.4, -6.4], [0, -21, -9.2], [1, 5.1, -12.3]]   // clear of the pegs (a peg + disc = 2.14 cm);
    at.forEach(([c, x, y]) => { const m = U.piece(c), [a, b] = U.xz(x, y); m.position.set(a, TOP, b); g.add(m); const sh = X.contact(RD * K * 1.15, .4); sh.position.set(a, TOP + .004, b); g.add(sh); });
    for (const [c, a] of [[1, 2.2], [0, 4.1]]) { const m = U.piece(c), r = U.RDITCH; m.position.set(Math.cos(a) * r, DY, Math.sin(a) * r); g.add(m); }
    return g;
  };
  X.crokinole = { board, LOOKS, K };
})();
