/* =====================================================================
   Chess on the 3D table — a luxury lacquered board: wide high-gloss grey
   burl frame, a cream inlay line, squares in cream maple and grey burl;
   Staunton pieces with polished metal: White = chrome / silver on grey
   marbled resin, Black = gold plate on black marbled resin.
   Registers into Table3D:
     Table3D.MODELS.chess(live, o)   board (+ the starting position unless live)
     Table3D.chess.piece(type, color) one piece (type 'P','N','B','R','Q','K' or 1..6; color 'w'|'b' or 0|1)
     Table3D.chess.images(px)         Promise → { wK, wQ, …, bP: dataURL } 3/4 renders for the DOM (sprite 1 × 1.6 squares)
   Units: one square is 1.0; the field is 8 × 8, the frame 0.85 wide (outer 9.7 = the page's board frame).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, canvasTex, makeNoise, RB, mesh } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const S = 8, MARGIN = .85, OW = S + 2 * MARGIN, THICK = .5;

  /* ---------- textures ---------- */
  const raw = {};   // plain canvases (composited into the board top)
  function canvas(key, W, H, draw) {
    if (raw[key]) return raw[key];
    const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), W, H); return (raw[key] = c);
  }
  // grey burl: domain-warped noise → wavy, swirling figure with little dark "eyes"
  function burl(key, light, dark, seed, W = 768, sc = 1) {
    W = SZ(W);
    return canvas(key, W, W, (g) => {
      const N = makeNoise(seed), A = hexRGB(light), B = hexRGB(dark), img = g.createImageData(W, W), d = img.data;
      const TAU = Math.PI * 2;
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          const px = x / W * 4.2 * sc + 3, py = y / W * 4.2 * sc + 3;
          const q = N(px * 1.4, py * 1.4, 3), r = N(px * 1.6 + q * 3.2 + 1.7, py * 1.6 + q * 3.2 + 9.2, 3);
          const f = N(px * 2.6 + r * 4.2, py * 2.6 + r * 4.2, 4);
          const band = Math.sin((f * 9 + r * 5) * TAU) * .5 + .5;              // the wavy figure
          const fine = N(px * 22 + r * 6, py * 22 + r * 6, 2);
          let t = .3 + Math.pow(band, 1.8) * .38 + (fine - .5) * .3 + (q - .5) * .4;
          const eye = N(px * 30, py * 30, 1), cl = N(px * 3.3 + 7, py * 3.3 + 1, 2);  // clusters of tiny knots
          if (cl > .58 && eye > .74) t += (eye - .74) * 3.2;
          t = Math.max(0, Math.min(1, t));
          const i = (y * W + x) * 4, w = (r - .5) * 14;
          d[i] = A[0] + (B[0] - A[0]) * t + w; d[i + 1] = A[1] + (B[1] - A[1]) * t + w * .7; d[i + 2] = A[2] + (B[2] - A[2]) * t + w * .4; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
  }
  // cream maple: fine straight fibres with a soft curly (fiddleback) shimmer
  function maple(key, W = 512, tint = [246, 234, 206, 34, 42, 52]) {
    W = SZ(W);
    return canvas(key, W, W, (g) => {
      const N = makeNoise(61), img = g.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / W;
        const fib = N(u * 4, v * 140, 2), curl = Math.sin((u * 26 + N(u * 2, v * 3, 3) * 3) * Math.PI) * .5 + .5;
        const t = .25 + (fib - .5) * .35 + Math.pow(curl, 3) * .18 + (N(u * 2, v * 2, 2) - .5) * .25, i = (y * W + x) * 4;
        d[i] = tint[0] - t * tint[3]; d[i + 1] = tint[1] - t * tint[4]; d[i + 2] = tint[2] - t * tint[5]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  // two sets: 'lux' = grey burl + silver/gold Staunton; 'wood' = amboyna/elm burl + boxwood/padauk
  const SETS = {
    lux: { frame: () => burl('chBurlF', '#c4bfb7', '#4a4642', 31, 1024, 2.4), sq: () => burl('chBurlS', '#97938c', '#33302d', 47), light: () => maple('chMaple'), inlay: 'cream', side: 0x23201c },
    wood: { frame: () => burl('chBurlFw2', '#cf8c48', '#3f1806', 37, 1024, 1.5), sq: () => burl('chBurlSw2', '#c7843f', '#3a1605', 53, 768, .8), light: () => maple('chMapleW', 512, [248, 241, 226, 20, 26, 34]), inlay: 'line', side: 0x2a160b },
  };
  const FRAME_BURL = (set = 'lux') => SETS[set].frame();
  // the whole lacquered top in one picture: burl frame, inlay, the 64 squares
  function boardTop(set = 'lux') {
    return canvasTex(set === 'lux' ? 'chessTop4' : 'chessTop4' + set, SZ(2048), SZ(2048), (c, W) => {
      const k = W / OW, ST = SETS[set], F = ST.frame(), SB = ST.sq(), MP = ST.light();
      // frame: the burl sheet, drawn twice as large (its figure is bold on a real board)
      // frame: four mitred veneer strips cut from the burl sheet (each turned its own way)
      const o0 = MARGIN * k, E = [[0, 0], [W, 0], [W, W], [0, W]], I = [[o0, o0], [W - o0, o0], [W - o0, W - o0], [o0, W - o0]];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4; c.save(); c.beginPath(); c.moveTo(...E[i]); c.lineTo(...E[j]); c.lineTo(...I[j]); c.lineTo(...I[i]); c.closePath(); c.clip();
        c.translate(W / 2, W / 2); c.rotate(i * Math.PI / 2); c.translate(-W / 2, -W / 2);
        c.drawImage(F, (i % 2) * F.width * .25, (i >> 1) * F.width * .3, F.width * .7, F.width * .7 * .2, 0, 0, W, W * .2);   // the strip along the top edge (rotated into place)
        c.restore();
      }
      c.strokeStyle = 'rgba(30,24,18,.4)'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(...E[i]); c.lineTo(...I[i]); } c.stroke();   // mitre joints
      const o = MARGIN * k, s = k, rnd = makeNoise(5);
      // inlay round the field: dark line, cream maple stripe, dark line
      const band = (a, b, col) => { c.fillStyle = col; c.fillRect(o - b * k, o - b * k, S * k + 2 * b * k, S * k + 2 * b * k); };
      if (ST.inlay === 'cream') {
        band(0, .16, 'rgba(24,20,16,.92)'); band(0, .145, '#efe1c0'); band(0, .1, 'rgba(24,20,16,.92)');
        c.drawImage(SB, 0, 0, SB.width, SB.width, o - .085 * k, o - .085 * k, S * k + .17 * k, S * k + .17 * k);   // burl again between inlay and squares
        band(0, .02, 'rgba(24,20,16,.9)');
      } else band(0, .05, 'rgba(26,14,8,.95)');   // one thin ebony line
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const x = o + f * s, y = o + r * s, light = (r + f) % 2 === 0;
        const src = light ? MP : SB, sw = src.width * (light ? .5 : .36), ox = rnd(f * 3.1, r * 2.7, 1) * (src.width - sw), oy = rnd(r * 1.9 + 4, f * 2.3, 1) * (src.height - sw);
        c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip();
        if (light && (f + r) % 4 === 0) { c.translate(x + s / 2, y + s / 2); c.rotate(Math.PI); c.translate(-x - s / 2, -y - s / 2); }
        c.drawImage(src, ox, oy, sw, sw, x, y, s, s);
        c.restore();
      }
      c.strokeStyle = 'rgba(30,24,18,.35)'; c.lineWidth = 1.2;   // hairline joints between the veneers
      for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(o + i * s, o); c.lineTo(o + i * s, o + S * k); c.moveTo(o, o + i * s); c.lineTo(o + S * k, o + i * s); c.stroke(); }
      // a soft darkening towards the outer edge of the frame (deep lacquer)
      const g = c.createRadialGradient(W / 2, W / 2, W * .42, W / 2, W / 2, W * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,8,6,.28)');
      c.fillStyle = g; c.beginPath(); c.rect(0, 0, W, W); c.rect(o - .16 * k, o - .16 * k, S * k + .32 * k, S * k + .32 * k); c.fill('evenodd');
    });
  }
  function sideTex(set = 'lux') {
    const key = 'chessSide2' + set; if (raw[key + 't']) return raw[key + 't'];
    const t = new (T().CanvasTexture)(FRAME_BURL(set)); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(1, THICK / OW); t.anisotropy = 4;
    return (raw[key + 't'] = t);
  }
  // marbled resin of the piece bodies; x wraps round the lathe (seamless), y runs up the profile
  function marble(key, base, vein, seed) {
    return canvasTex(key, SZ(512), SZ(512), (g, W, H) => {
      const N = makeNoise(seed), A = hexRGB(base), B = hexRGB(vein), img = g.createImageData(W, H), d = img.data, TAU = Math.PI * 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = x / W * TAU, px = Math.cos(a) * 1.2 + 4, py = Math.sin(a) * 1.2 + y / H * 3.2 + 4;
        const w = N(px * 1.3, py * 1.3, 4);
        const v1 = Math.pow(1 - Math.abs(Math.sin((py * 1.8 + px * .9 + w * 3.4) * Math.PI)), 14);
        const v2 = Math.pow(1 - Math.abs(Math.sin((px * 3.1 - py * 1.2 + w * 5) * Math.PI)), 26) * .6;
        const cloud = (N(px * 3, py * 3, 3) - .5) * .25;
        const t = Math.max(0, Math.min(1, v1 * .75 + v2 + cloud + .05)), i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }

  // turned wood: fibres run up the piece (y), with soft growth bands; x wraps round the lathe
  function grain(key, base, dark, hi, seed) {
    return canvasTex(key, SZ(512), SZ(512), (g, W, H) => {
      const N = makeNoise(seed), A = hexRGB(base), B = hexRGB(dark), C = hexRGB(hi), img = g.createImageData(W, H), d = img.data, TAU = Math.PI * 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const a = x / W * TAU, cx = Math.cos(a) * 1.3 + 5, cz = Math.sin(a) * 1.3 + 5, v = y / H;
        const ring = N(cx * .9, cz * .9 + v * .6, 3) * 7 + v * 1.5, band = Math.pow(Math.sin(ring * TAU) * .5 + .5, 2.2);
        const fib = N(cx * 14, cz * 14 + v * 60, 2), fl = N(cx * 3, cz * 3 + v * 5, 2);
        let t = band * .45 + (fib - .5) * .3 + (fl - .5) * .35; t = Math.max(-1, Math.min(1, t));
        const i = (y * W + x) * 4, P = t >= 0 ? B : C, k = Math.abs(t) * (t >= 0 ? 1 : .8);
        d[i] = A[0] + (P[0] - A[0]) * k; d[i + 1] = A[1] + (P[1] - A[1]) * k; d[i + 2] = A[2] + (P[2] - A[2]) * k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }

  /* ---------- materials ---------- */
  const mats = {};
  function matsOf(col, set = 'lux') {
    if (set === 'wood') return woodMats(col);
    if (mats[col]) return mats[col];
    const TT = T(), w = col === 'w';
    const metal = new TT.MeshPhysicalMaterial({ color: new TT.Color(w ? 0xeef0f3 : 0xf2c464).convertSRGBToLinear(), metalness: 1, roughness: w ? .1 : .16, clearcoat: .6, clearcoatRoughness: .08, envMapIntensity: 1.25 });
    const resin = new TT.MeshPhysicalMaterial({ map: w ? marble('chMarbW', '#4d5056', '#b9bcc2', 7) : marble('chMarbB', '#121214', '#5b564f', 13), roughness: .24, metalness: .05, clearcoat: 1, clearcoatRoughness: .05 });
    const felt = new TT.MeshStandardMaterial({ color: new TT.Color(0x1d3b26).convertSRGBToLinear(), roughness: 1 });
    // the reflection in the lacquer: the same materials drawn additively, only where the board is in front (see reflect())
    // mixed in with alpha blending, still in the opaque pass (custom blending), before the real pieces, only on the lacquered top (stencil 2), one layer per pixel
    const ref = (x, c, op) => new TT.MeshBasicMaterial({ map: x.map || null, color: new TT.Color(c).convertSRGBToLinear(), opacity: op, blending: TT.CustomBlending, blendSrc: TT.SrcAlphaFactor, blendDst: TT.OneMinusSrcAlphaFactor, blendSrcAlpha: TT.ZeroFactor, blendDstAlpha: TT.OneFactor,
      depthWrite: false, depthFunc: TT.GreaterDepth, stencilWrite: true, stencilRef: 2, stencilFunc: TT.EqualStencilFunc, stencilZPass: TT.IncrementStencilOp, stencilFail: TT.KeepStencilOp, stencilZFail: TT.KeepStencilOp });
    const rMetal = ref(metal, w ? 0xc8ccd2 : 0xd8a645, .34), rResin = ref(resin, 0x9a9a9a, .3);
    return (mats[col] = { metal, resin, felt, rMetal, rResin });
  }

  function woodMats(col) {
    const key = 'wood' + col; if (mats[key]) return mats[key];
    const TT = T(), w = col === 'w';
    const map = w ? grain('chBox2', '#e6c48e', '#c49a62', '#f3dcae', 9) : grain('chPad2', '#7c1610', '#470806', '#a02c1d', 17);
    const wood = new TT.MeshPhysicalMaterial({ map, roughness: w ? .38 : .3, metalness: 0, clearcoat: .7, clearcoatRoughness: .18, sheen: 0 });
    const felt = new TT.MeshStandardMaterial({ color: new TT.Color(0x1d3b26).convertSRGBToLinear(), roughness: 1 });
    const TTb = TT, rw = new TTb.MeshBasicMaterial({ map, color: new TT.Color(0xa8a8a8).convertSRGBToLinear(), opacity: .3, blending: TT.CustomBlending, blendSrc: TT.SrcAlphaFactor, blendDst: TT.OneMinusSrcAlphaFactor, blendSrcAlpha: TT.ZeroFactor, blendDstAlpha: TT.OneFactor,
      depthWrite: false, depthFunc: TT.GreaterDepth, stencilWrite: true, stencilRef: 2, stencilFunc: TT.EqualStencilFunc, stencilZPass: TT.IncrementStencilOp, stencilFail: TT.KeepStencilOp, stencilZFail: TT.KeepStencilOp });
    return (mats[key] = { metal: wood, resin: wood, felt, rMetal: rw, rResin: rw });
  }

  /* ---------- pieces: lathe parts, each in resin or metal ---------- */
  const TAU = Math.PI * 2;
  // profile helpers (r, y)
  const arc = (cr, cy, rad, a0, a1, n = 8) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cr + Math.sin(a) * rad, cy - Math.cos(a) * rad]); } return o; };
  const bead = (r, y0, y1, out) => arc(r, (y0 + y1) / 2, (y1 - y0) / 2, 0, Math.PI, 10).map(([x, y]) => [r + (x - r) * out / ((y1 - y0) / 2), y]);
  const concave = (r0, y0, r1, y1, p = 2, n = 14) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push([r1 + (r0 - r1) * Math.pow(1 - t, p), y0 + (y1 - y0) * t]); } return o; };
  const ball = (cy, rad, n = 16) => arc(0, cy, rad, 0, Math.PI, n);
  const closed = (pts) => { const a = pts[0], b = pts[pts.length - 1]; return [[0, a[1]], ...pts, [0, b[1]]]; };
  const geoCache = {};
  // the portal (atlas/) shows the pieces small on the chabudai — showcase and table play — so it always builds the light versions;
  // the full 3D chess page keeps the fine ones
  const PORTAL = /\/atlas\//.test(location.pathname), small = () => MID || PORTAL;
  let LOW = false, MID = false;   // LOW: building the faint mirror image in the lacquer: a coarser lathe is enough · MID: the small showcase pieces on the chabudai
  function lathe(key, pts, seg) {   // phones: fewer segments round the lathe
    const sm = small();
    seg = Math.min(seg || 99, LOW ? (sm ? 8 : 14) : sm ? 14 : X.coarse ? 24 : 36); key += '@' + seg + (sm || LOW ? 'd' : '');
    if (geoCache[key]) return geoCache[key];
    if (sm || LOW) pts = pts.filter((p, i) => i < 2 || i > pts.length - 3 || i % 2 === 0);   // small pieces: every other profile point (the turned shape stays, at half the rings)
    const TT = T(), g = new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(Math.max(0, r), y)), seg);
    return (geoCache[key] = g);
  }
  // shared base: a felt pad, the stepped resin plinth with a cove, a metal bead
  function baseParts(R, H) {   // R base radius, H plinth height → returns top y of the bead
    const b = H * .3;
    return {
      felt: closed([[R * .94, -.004], [R * .94, .004]]),
      plinth: closed([[R, 0], [R * 1.015, H * .15], [R * 1.015, H * .5], [R * .96, H * .66], ...concave(R * .93, H * .7, R * .84, H, 1.6, 6)]),
      bead: closed(bead(R * .84, H - .004, H + b, R * .07)),
      top: H + b,
    };
  }
  const PROFILES = {
    P() {
      const B = baseParts(.29, .12), y = B.top;
      return {
        resin: [B.plinth, closed([[.245, y - .01], [.24, y + .02], ...concave(.23, y + .03, .105, .47, 2.2), [.1, .48]]), closed([[.09, .535], [.075, .58]])],
        metal: [B.bead, closed([[.12, .46], [.18, .475], ...bead(.19, .48, .525, .02).slice(1), [.13, .54]]), closed(ball(.705, .148, 18))],
        felt: [B.felt], h: .86,
      };
    },
    R() {
      const B = baseParts(.335, .13), y = B.top;
      return {
        resin: [B.plinth, closed([[.285, y - .01], [.28, y + .02], ...concave(.27, y + .04, .215, .63, 1.4), [.215, .645]]), closed([[.235, .715], [.255, .735], [.258, .775]]), closed([[.18, .79], [.18, .8]])],
        metal: [B.bead, closed([[.22, .64], [.26, .655], ...bead(.27, .66, .715, .02).slice(1), [.235, .72]]), [[.17, .77], [.262, .77], [.272, .79], [.262, .812], [.17, .812], [.17, .77]]],
        felt: [B.felt], merlons: { r0: .17, r1: .268, y0: .808, y1: .93, n: 6 }, h: .93,
      };
    },
    N() {
      const B = baseParts(.335, .13), y = B.top;
      return {
        resin: [B.plinth, closed([[.28, y - .01], [.27, y + .02], ...concave(.26, y + .03, .23, .3, 1.2, 6)])],
        metal: [B.bead, closed([[.22, .29], [.27, .305], ...bead(.28, .31, .36, .022).slice(1), [.24, .365]])],
        felt: [B.felt], head: .36, h: 1.12,
      };
    },
    B() {
      const B = baseParts(.32, .12), y = B.top;
      return {
        resin: [B.plinth, closed([[.26, y - .01], [.255, y + .02], ...concave(.245, y + .03, .108, .64, 2.3), [.105, .65]]), closed([[.085, .73], [.075, .77]])],
        metal: [B.bead, closed([[.13, .635], [.2, .65], ...bead(.21, .655, .695, .018).slice(1), [.15, .7], [.165, .705], ...bead(.165, .705, .735, .012).slice(1), [.1, .74]]),
          closed((() => { const o = []; for (let i = 0; i <= 22; i++) { const a = i / 22 * Math.PI, up = Math.max(0, -Math.cos(a)); o.push([Math.sin(a) * .148 * (1 - .22 * Math.pow(up, 1.5)), .945 - Math.cos(a) * (a > Math.PI / 2 ? .2 : .175)]); } return o; })()),
          closed(ball(1.18, .042, 10))],
        felt: [B.felt], slit: { y: .985, r: .15 }, h: 1.22,
      };
    },
    Q() {
      const B = baseParts(.355, .13), y = B.top;
      return {
        resin: [B.plinth, closed([[.29, y - .01], [.285, y + .02], ...concave(.275, y + .03, .118, .8, 2.3), [.115, .81]]), closed([[.12, .9], ...concave(.12, .9, .215, 1.12, .55, 10).slice(1), [.22, 1.13]])],
        metal: [B.bead, closed([[.14, .79], [.215, .805], ...bead(.225, .81, .855, .02).slice(1), [.16, .86], [.175, .865], ...bead(.175, .865, .9, .014).slice(1), [.115, .905]]),
          closed([[.2, 1.12], [.232, 1.125], ...bead(.236, 1.13, 1.17, .015).slice(1), [.2, 1.175], ...concave(.19, 1.175, .07, 1.255, .6, 8)]), closed(ball(1.3, .055, 12))],
        felt: [B.felt], coronet: { r: .222, y: 1.19, n: 10, s: .034 }, h: 1.36,
      };
    },
    K() {
      const B = baseParts(.37, .14), y = B.top;
      return {
        resin: [B.plinth, closed([[.3, y - .01], [.295, y + .02], ...concave(.285, y + .03, .128, .85, 2.3), [.125, .86]]), closed([[.13, .95], ...concave(.13, .95, .228, 1.17, .55, 10).slice(1), [.232, 1.18]])],
        metal: [B.bead, closed([[.15, .84], [.23, .855], ...bead(.24, .86, .91, .022).slice(1), [.17, .915], [.185, .92], ...bead(.185, .92, .955, .014).slice(1), [.125, .96]]),
          closed([[.21, 1.17], [.246, 1.175], ...bead(.25, 1.18, 1.235, .016).slice(1), [.215, 1.24], ...concave(.2, 1.24, .05, 1.33, .55, 8)])],
        felt: [B.felt], cross: { y: 1.33 }, h: 1.5,
      };
    },
  };
  // knight head: a modelled side profile (facing +x), extruded and tapered towards the muzzle
  let headGeo = null, maneGeo = null; const headLo = {};
  function knightHead() {
    const lo = small() || LOW;
    if (lo && headLo.headGeo) return headLo;
    if (!lo && headGeo) return { headGeo, maneGeo };
    const TT = T(), V = (x, y) => new TT.Vector2(x, y);
    const sh = new TT.Shape();
    sh.moveTo(-.2, .02); sh.lineTo(.17, .02);
    sh.splineThru([V(.22, .12), V(.19, .26), V(.15, .35), V(.25, .4), V(.37, .43), V(.43, .48), V(.44, .54)]);
    sh.splineThru([V(.4, .59), V(.29, .64), V(.19, .71), V(.13, .78)]);
    sh.splineThru([V(.11, .86), V(.085, .92)]);      // front ear
    sh.splineThru([V(.045, .86), V(.01, .83)]);
    sh.splineThru([V(-.025, .87), V(-.06, .8)]);     // back ear
    sh.splineThru([V(-.14, .7), V(-.21, .56), V(-.25, .38), V(-.255, .2), V(-.23, .08), V(-.2, .02)]);
    const D = .1, BT = .075;
    const g = new TT.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: .045, bevelSegments: lo ? 2 : 3, curveSegments: lo ? 3 : 6 });   // (curveSegments is per spline span: 6 keeps the profile smooth at ~40% of the triangles)
    g.translate(0, 0, -D / 2);
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {   // narrower muzzle and ears, a fuller jaw and neck
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      let k = 1.1;
      if (x > .12) k *= 1 - Math.min(1, (x - .12) / .32) * .42;
      if (y > .78) k *= 1 - Math.min(1, (y - .78) / .14) * .45;
      if (y < .3) k *= 1 + (.3 - y) * .9;
      P.setZ(i, z * k);
      UV.setXY(i, x * 1.3 + .5 + z * .4, y * 1.3);   // planar marble, no stretched stripes on the sides
    }
    g.computeVertexNormals();
    if (lo) headLo.headGeo = g; else headGeo = g;
    // mane: a metal crest along the back of the neck
    const curve = new TT.CatmullRomCurve3([[-.04, .83], [-.13, .73], [-.215, .59], [-.265, .42], [-.278, .25], [-.262, .1]].map(([x, y]) => new TT.Vector3(x, y, 0)));
    const mg = new TT.TubeGeometry(curve, lo ? 14 : 32, .042, lo ? 5 : 8, false);
    if (lo) { headLo.maneGeo = mg; return headLo; }
    maneGeo = mg; return { headGeo, maneGeo };
  }
  const TYPES = ' PNBRQK';
  function piece(type, color, o) {
    const TT = T(), tp = typeof type === 'number' ? TYPES[type] : String(type).toUpperCase(), col = color === 1 || color === 'b' ? 'b' : 'w';
    const set = (o && o.set) || 'lux', wd = set === 'wood';
    const pr = PROFILES[tp](), m = matsOf(col, set), g = new TT.Group();
    const add = (geo, mat, o = {}) => { const x = new TT.Mesh(geo, mat); x.castShadow = true; x.receiveShadow = true; if (o.p) x.position.set(...o.p); if (o.r) x.rotation.set(...o.r); if (o.s) x.scale.set(...o.s); g.add(x); return x; };
    pr.resin.forEach((p, i) => add(lathe(tp + 'r' + i, p), m.resin));
    pr.metal.forEach((p, i) => add(lathe(tp + 'm' + i, p), m.metal));
    pr.felt.forEach((p, i) => add(lathe(tp + 'f' + i, p, 32), m.felt).castShadow = false);
    if (pr.merlons) {   // rook: crenellated metal top
      const q = pr.merlons, key = 'merlon';
      let geo = geoCache[key];
      if (!geo) {
        const s = new TT.Shape(), a = TAU / q.n * .56;
        s.absarc(0, 0, q.r1, -a / 2, a / 2, false); s.absarc(0, 0, q.r0, a / 2, -a / 2, true);
        geo = geoCache[key] = new TT.ExtrudeGeometry(s, { depth: q.y1 - q.y0 - .016, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2, curveSegments: 6 });
        geo.rotateX(-Math.PI / 2);
      }
      for (let i = 0; i < q.n; i++) add(geo, m.metal, { p: [0, q.y0 + .008, 0], r: [0, i * TAU / q.n + TAU / q.n / 2, 0] });
    }
    if (pr.coronet) { const q = pr.coronet, ck = small() ? 'corS' : 'cor', geo = geoCache[ck] || (geoCache[ck] = small() ? new TT.SphereGeometry(q.s, 6, 4) : new TT.SphereGeometry(q.s, 10, 7)); for (let i = 0; i < q.n; i++) { const a = i / q.n * TAU; add(geo, m.metal, { p: [Math.cos(a) * q.r, q.y, Math.sin(a) * q.r] }); } }
    if (pr.cross && wd) {   // wood king: a turned bud finial instead of the cross
      const y = pr.cross.y, geo = geoCache.bud || (geoCache.bud = lathe('kbud', closed([[.05, y - .005], [.07, y + .03], [.085, y + .08], [.08, y + .13], [.06, y + .18], [.035, y + .22], [.012, y + .26], [0, y + .275]]), 40));
      add(geo, m.resin);
    } else if (pr.cross) {
      const y = pr.cross.y, v = geoCache.cv || (geoCache.cv = RB(.06, .22, .06, .015, 2)), h = geoCache.ch || (geoCache.ch = RB(.17, .06, .06, .015, 2));
      add(v, m.metal, { p: [0, y + .11, 0] }); add(h, m.metal, { p: [0, y + .15, 0] });
    }
    if (pr.slit) { const geo = geoCache.slit || (geoCache.slit = new TT.BoxGeometry(.2, .022, .288)); add(geo, m.resin, { p: [0, pr.slit.y, 0], r: [0, 0, .62] }); }   // the mitre's slit
    if (pr.head) {
      const { headGeo, maneGeo } = knightHead();
      const hd = new TT.Group(); hd.position.y = pr.head; g.add(hd);
      const h = new TT.Mesh(headGeo, m.resin); h.castShadow = h.receiveShadow = true; hd.add(h);
      const mn = new TT.Mesh(maneGeo, m.metal); mn.castShadow = true; hd.add(mn);
      const eg = geoCache.eye || (geoCache.eye = new TT.SphereGeometry(.026, 10, 8));
      [1, -1].forEach(s => { const e = new TT.Mesh(eg, m.metal); e.position.set(.2, .655, s * .118); hd.add(e); });
      const nos = geoCache.nos || (geoCache.nos = new TT.TorusGeometry(.13, .018, 8, 24, Math.PI * .9));   // a metal noseband
      const nb = new TT.Mesh(nos, m.metal); nb.position.set(.3, .52, 0); nb.rotation.set(Math.PI / 2, 0, -.55); nb.scale.set(.9, .72, 1); nb.visible = false; hd.add(nb);
      if (wd) [1, -1].forEach(s => { [0, 1].forEach(j => { const r = new TT.Mesh(maneGeo, m.resin); r.castShadow = true; r.position.set(.02 + j * .035, 0, s * (.05 + j * .028)); r.scale.set(.93 - j * .07, .97 - j * .05, .8); hd.add(r); }); });   // carved mane locks
    }
    g.userData.type = tp; g.userData.color = col; g.userData.h = pr.h; g.userData.set = set;
    if (X.mergeStatic) { try { X.mergeStatic(g); } catch (e) {} }   // one mesh per material (resin / metal / felt) instead of ~8 parts: far fewer draw calls
    if (o && o.reflect && !X.coarse) reflect(g);   // phones: no mirror images in the lacquer (they double every piece)
    return g;
  }
  // mirror image under a piece standing on the glossy board (follows the piece when it moves)
  function reflect(g) {
    const m = matsOf(g.userData.color, g.userData.set), r = new (T().Group)(); r.scale.y = -1; r.userData.reflection = true;
    let lo; LOW = true; try { lo = piece(g.userData.type, g.userData.color, { set: g.userData.set }); } finally { LOW = false; }   // same piece, coarser (it is seen dimmed and upside down)
    lo.children.slice().forEach(ch => { const c = ch.clone(); c.traverse(o => { if (o.isMesh) { o.material = o.material === m.metal ? m.rMetal : o.material === m.resin ? m.rResin : null; o.castShadow = o.receiveShadow = false; o.renderOrder = -1; if (!o.material) o.visible = false; } }); r.add(c); });
    g.add(r); return g;
  }

  /* ---------- the board ---------- */
  let topMat = null;
  function board() {
    const TT = T(), g = new TT.Group();
    topMat = topMat || new TT.MeshPhysicalMaterial({ map: boardTop(), roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6 });
    topMat.map.anisotropy = 8;
    Object.assign(topMat, { stencilWrite: true, stencilRef: 2, stencilFunc: T().AlwaysStencilFunc, stencilZPass: T().ReplaceStencilOp });   // marks where reflections may show
    const side = new TT.MeshPhysicalMaterial({ map: sideTex(), roughness: .16, clearcoat: 1, clearcoatRoughness: .04 });
    const topMaps = { lux: boardTop('lux') };
    const bottom = new TT.MeshStandardMaterial({ color: new TT.Color(0x23201c).convertSRGBToLinear(), roughness: .9 });
    const block = new TT.Mesh(RB(OW, THICK, OW, .09, 3), [side, side, topMat, bottom, side, side]);
    block.position.y = THICK / 2; block.castShadow = block.receiveShadow = true; block.renderOrder = -2; g.add(block);   // drawn first: the reflections test against it
    // the game's board skins tint the lacquer a little
    const tinted = [topMat, side], base0 = tinted.map(m => m.color.clone());
    const TONES = { classic: 0xffffff, grain: 0xf2dcc0, metal: 0xd8e2ec, ink: 0x6a6460 };
    let curSet = 'lux';
    g.userData.setSet = name => {
      if (!SETS[name] || (name === curSet && topMat.map === topMaps[name])) return; curSet = name;   // topMat is shared by every board: another board may have left a different set on it
      if (!topMaps[name]) { topMaps[name] = boardTop(name); topMaps[name].anisotropy = 8; }
      topMat.map = topMaps[name]; side.map = sideTex(name); bottom.color.set(SETS[name].side).convertSRGBToLinear();
      topMat.needsUpdate = side.needsUpdate = true;
    };
    g.userData.setTone = name => { const c = new TT.Color(TONES[name] || 0xffffff).convertSRGBToLinear(); tinted.forEach((m, i) => m.color.copy(base0[i]).multiply(c)); };
    g.userData.S = S; g.userData.top = THICK + .001; g.userData.outer = OW / S;
    return g;
  }
  const cell = (f, r) => [-S / 2 + f + .5, -S / 2 + r + .5];   // f: 0 = left column on screen, r: 0 = top row

  X.MODELS.chess = function (live, o) {
    const g = board(), Y = g.userData.top;
    if (live) return g;
    const back = 'RNBQKBNR';
    const put = (t, f, r, col) => {
      const p = piece(t, col, { reflect: true }), [x, z] = cell(f, r); p.position.set(x, Y, z);
      if (t === 'N') p.rotation.y = col === 'w' ? Math.PI / 2 + (f < 4 ? -.35 : .35) : -Math.PI / 2 + (f < 4 ? .35 : -.35);   // knights look at the opponent, a little outward
      g.add(p); const sh = X.contact(.34, .5); sh.position.set(x, Y + .002, z); g.add(sh);
    };
    MID = true; try { [...back].forEach((t, f) => { put(t, f, 0, 'b'); put(t, f, 7, 'w'); put('P', f, 1, 'b'); put('P', f, 6, 'w'); }); } finally { MID = false; }   // (showcase: 32 small pieces + their mirror images → coarser lathes)
    g.scale.setScalar(.98);   // about the reversi board's size on the chabudai
    return g;
  };

  /* ---------- 3/4 renders of each piece for the DOM (board, captured pieces, promotion, dragging) ----------
     sprite = 1 square wide × 1.6 tall; the centre of the piece's base sits 0.5 above the bottom edge */
  const SPR_H = 1.6, ELEV = 50 * Math.PI / 180;
  const imgCache = {};
  function studio(R) {
    const TT = T(), env = new TT.Scene();
    const sky = new TT.Mesh(new TT.SphereGeometry(20, 32, 16), new TT.MeshBasicMaterial({ side: TT.BackSide, vertexColors: true }));
    const col = [], P = sky.geometry.attributes.position, c = new TT.Color();
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 20; const k = y > 0 ? .16 + y * .22 : .05 + (y + 1) * .06; c.setRGB(k, k * .97, k * .92); col.push(c.r, c.g, c.b); }
    sky.geometry.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); env.add(sky);
    [[-8, 12, 6, 10, 6, 2.4], [9, 7, 4, 6, 9, 1.4], [0, 16, -6, 14, 3, 1.1], [0, -6, 12, 18, 3, .5], [-10, 2, -6, 4, 10, .9]].forEach(([x, y, z, w, h, k]) => {
      const p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: new TT.Color(k, k * .97, k * .92), side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
    });
    const pm = new TT.PMREMGenerator(R), tex = pm.fromScene(env, .02).texture; pm.dispose(); return tex;
  }
  function images(px = 256, set = 'lux') {
    if (imgCache[set]) return imgCache[set];
    return (imgCache[set] = new Promise(res => setTimeout(res, 0)).then(() => {
      const TT = T(), W = px, H = Math.round(px * SPR_H);
      const R = new TT.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setSize(W, H, false); R.setPixelRatio(1); R.outputEncoding = TT.sRGBEncoding; R.toneMapping = TT.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
      R.setClearColor(0x000000, 0);
      const scene = new TT.Scene();
      try { scene.environment = studio(R); } catch (e) {}
      scene.add(new TT.HemisphereLight(0xfff6ea, 0x40382c, .35));
      const key = new TT.DirectionalLight(0xffffff, .9); key.position.set(-3, 8, 5); scene.add(key);
      const rim = new TT.DirectionalLight(0xffffff, .5); rim.position.set(4, 3, -5); scene.add(rim);
      const cam = new TT.OrthographicCamera(-.5, .5, SPR_H - .5, -.5, .1, 40);
      cam.position.set(0, Math.sin(ELEV) * 10, Math.cos(ELEV) * 10); cam.lookAt(0, 0, 0);
      const out = {};
      for (const col of ['w', 'b']) for (const tp of 'KQRBNP') {
        const p = piece(tp, col, { set });
        if (tp === 'N') p.rotation.y = col === 'w' ? Math.PI * 1.1 : -Math.PI * .1;   // white looks left, black right (3/4)
        scene.add(p); R.render(scene, cam); out[col + tp] = R.domElement.toDataURL('image/png'); scene.remove(p);
      }
      R.dispose(); R.forceContextLoss && R.forceContextLoss();
      return out;
    }));
  }
  const SHEET_KEYS = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

  X.chess = { piece, board, cell, images, S, MARGIN, OW, SPR_H, SHEET_KEYS };
})();
