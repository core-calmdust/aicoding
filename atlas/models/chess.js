/* =====================================================================
   Chess on the 3D table — a luxury lacquered board: wide high-gloss grey
   burl frame, a cream inlay line, squares in cream maple and grey burl;
   Staunton pieces with polished metal: White = chrome / silver on grey
   marbled resin, Black = gold plate on black marbled resin.
   Registers into Table3D:
     Table3D.MODELS.chess(live, o)   board (+ the starting position unless live)
     Table3D.chess.piece(type, color) one piece (type 'P','N','B','R','Q','K' or 1..6; color 'w'|'b' or 0|1)
     Table3D.chess.images(px, set)    Promise → { wK, wQ, …, bP: dataURL } 3/4 renders for the DOM (sprite 1 × 1.6 squares)
   Six boards (2026-11-15 v2, 'atlas-chess-look' = Table3D.BOARDS.chess): lux 高級ラッカー (the default) · wood バール ·
   ceramic 陶器と金継ぎ · jewel ジュエリー · brass 真鍮彫り · neon ネオン — the last four are pictures made by atlas/tools/chess-tex.py
   (images/atlas/chess3d/). Six piece sets ('atlas-chess-pc3' = Table3D.PIECES.chess): lux 銀と金 · wood ツゲと紫檀 · ceramic 陶器と金彩 ·
   jewel パヴェ · brass 真鍮彫り (slender) · neon ネオン (acrylic shapes of their own).
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
      paint(g.canvas, 'burl', { seed, A: hexRGB(light), B: hexRGB(dark), sc });
    });
  }
  // cream maple: fine straight fibres with a soft curly (fiddleback) shimmer
  function maple(key, W = 512, tint = [246, 234, 206, 34, 42, 52]) {
    W = SZ(W);
    return canvas(key, W, W, (g) => {
      paint(g.canvas, 'maple', { tint });
    });
  }
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  function KL(X) {
    const makeNoise = X.makeNoise;
    return {
      burl(d, W, H, p) {
          const N = makeNoise(p.seed), A = p.A, B = p.B, sc = p.sc;
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
      },
      maple(d, W, H, p) {
          const N = makeNoise(61), tint = p.tint;
          for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
            const u = x / W, v = y / W;
            const fib = N(u * 4, v * 140, 2), curl = Math.sin((u * 26 + N(u * 2, v * 3, 3) * 3) * Math.PI) * .5 + .5;
            const t = .25 + (fib - .5) * .35 + Math.pow(curl, 3) * .18 + (N(u * 2, v * 2, 2) - .5) * .25, i = (y * W + x) * 4;
            d[i] = tint[0] - t * tint[3]; d[i + 1] = tint[1] - t * tint[4]; d[i + 2] = tint[2] - t * tint[5]; d[i + 3] = 255;
          }
      },
      marble(d, W, H, p) {
          const N = makeNoise(p.seed), A = p.A, B = p.B, TAU = Math.PI * 2;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const a = x / W * TAU, px = Math.cos(a) * 1.2 + 4, py = Math.sin(a) * 1.2 + y / H * 3.2 + 4;
            const w = N(px * 1.3, py * 1.3, 4);
            const v1 = Math.pow(1 - Math.abs(Math.sin((py * 1.8 + px * .9 + w * 3.4) * Math.PI)), 14);
            const v2 = Math.pow(1 - Math.abs(Math.sin((px * 3.1 - py * 1.2 + w * 5) * Math.PI)), 26) * .6;
            const cloud = (N(px * 3, py * 3, 3) - .5) * .25;
            const t = Math.max(0, Math.min(1, v1 * .75 + v2 + cloud + .05)), i = (y * W + x) * 4;
            d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
          }
      },
      // pavé round the lathe (x wraps): hex-set stones, each with a table and eight facets of its own brightness; p.dark: black spinels
      pave(d, W, H, p) {
          const N = makeNoise(p.seed || 3), cs = W / 34, rt3 = Math.sqrt(3);
          const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const row = Math.round(y / (cs * rt3 / 2)), off = (row & 1) ? cs / 2 : 0, col = Math.round((x - off) / cs);
            const cx = col * cs + off, cy = row * cs * rt3 / 2, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) / (cs * .47);
            const i = (y * W + x) * 4; let v;
            if (r < 1) {
              const sec = Math.floor((Math.atan2(dy, dx) + Math.PI) / (Math.PI / 4)), tb = r < .42;
              const f = tb ? .55 + hash(col, row, 99) * .45 : .18 + hash(col, row, sec) * .95, g = r > .86 ? 1 - (r - .86) / .14 * .75 : 1;
              v = Math.min(1.3, f) * g;
              if (p.dark) { const k = 8 + Math.pow(v, 2.4) * 160; d[i] = k; d[i + 1] = k; d[i + 2] = k + 6; }
              else { const hue = hash(col, row, 7) * 6.283, fire = v > .95 ? 22 : 0, k = 105 + v * 140; d[i] = k + Math.cos(hue) * fire; d[i + 1] = k + Math.cos(hue - 2.1) * fire; d[i + 2] = k + 4 + Math.cos(hue - 4.2) * fire; }
            } else { const k = p.dark ? 60 : 214; d[i] = k; d[i + 1] = k; d[i + 2] = k + 4; }   // the setting between the stones
            d[i + 3] = 255;
          }
      },
      // engraved turned bands (y runs up the profile): enamel or metal ground, rings of short strokes and fine lines cut in (p.A ground, p.B the cuts)
      bands(d, W, H, p) {
          const A = p.A, B = p.B, N = makeNoise(p.seed || 5);
          for (let y = 0; y < H; y++) {
            const v = y / H, k = v * 9 % 1, ln = (k < .04 || (k > .1 && k < .13)), hatch = k > .2 && k < .42, dot = k > .55 && k < .6;
            for (let x = 0; x < W; x++) {
              const u = x / W, gx = u * 72, cl = Math.floor(gx / 4.4), inCl = (gx % 4.4) < 2.6 && ((gx % 4.4) % .62) < .26;
              const cut = ln || (hatch && inCl) || (dot && ((u * 120) % 1) < .3);
              const n = (N(u * 40, v * 40, 2) - .5) * 18, i = (y * W + x) * 4, C = cut ? B : A;
              d[i] = C[0] + n; d[i + 1] = C[1] + n; d[i + 2] = C[2] + n; d[i + 3] = 255;
            }
          }
      },
      grain(d, W, H, p) {
          const N = makeNoise(p.seed), A = p.A, B = p.B, C = p.C, TAU = Math.PI * 2;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const a = x / W * TAU, cx = Math.cos(a) * 1.3 + 5, cz = Math.sin(a) * 1.3 + 5, v = y / H;
            const ring = N(cx * .9, cz * .9 + v * .6, 3) * 7 + v * 1.5, band = Math.pow(Math.sin(ring * TAU) * .5 + .5, 2.2);
            const fib = N(cx * 14, cz * 14 + v * 60, 2), fl = N(cx * 3, cz * 3 + v * 5, 2);
            let t = band * .45 + (fib - .5) * .3 + (fl - .5) * .35; t = Math.max(-1, Math.min(1, t));
            const i = (y * W + x) * 4, P = t >= 0 ? B : C, k = Math.abs(t) * (t >= 0 ? 1 : .8);
            d[i] = A[0] + (P[0] - A[0]) * k; d[i + 1] = A[1] + (P[1] - A[1]) * k; d[i + 2] = A[2] + (P[2] - A[2]) * k; d[i + 3] = 255;
          }
      },
    };
  }
  // the heavy pixel loops live in KL() (self-contained): on the portal they run in a worker (atlas/texgen.js) and the
  // canvas fills a moment later; on the game pages (no texgen) right here, as before
  function paint(c, name, p, after, c2) {
    const TG = window.AtlasTexGen; if (TG) return TG.paint(c, KL, name, p, after, c2);
    const g = c.getContext('2d'), a = g.createImageData(c.width, c.height), b = c2 ? c2.getContext('2d').createImageData(c2.width, c2.height) : null;
    (KL.L || (KL.L = KL(X)))[name](a.data, c.width, c.height, p || {}, b && b.data, (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k.getContext('2d'); });
    g.putImageData(a, 0, 0); if (b) c2.getContext('2d').putImageData(b, 0, 0); if (after) after(g, c.width, c.height); return c;
  }
  const later = (deps, c, fn) => window.AtlasTexGen ? AtlasTexGen.later(deps, c, fn) : (fn(c.getContext('2d'), c.width, c.height), c);
  // two sets: 'lux' = grey burl + silver/gold Staunton; 'wood' = amboyna/elm burl + boxwood/padauk
  const SETS = {
    lux: { frame: () => burl('chBurlF', '#c4bfb7', '#4a4642', 31, 1024, 2.4), sq: () => burl('chBurlS', '#97938c', '#33302d', 47), light: () => maple('chMaple'), inlay: 'cream', side: 0x23201c },
    wood: { frame: () => burl('chBurlFw2', '#cf8c48', '#3f1806', 37, 1024, 1.5), sq: () => burl('chBurlSw2', '#c7843f', '#3a1605', 53, 768, .8), light: () => maple('chMapleW', 512, [248, 241, 226, 20, 26, 34]), inlay: 'line', side: 0x2a160b },
  };
  const FRAME_BURL = (set = 'lux') => SETS[set].frame();
  // the whole lacquered top in one picture: burl frame, inlay, the 64 squares
  function boardTop(set = 'lux') {
    const ST = SETS[set], F = ST.frame(), SB = ST.sq(), MP = ST.light();
    return canvasTex(set === 'lux' ? 'chessTop4' : 'chessTop4' + set, SZ(2048), SZ(2048), (c0) => later([F, SB, MP], c0.canvas, (c, W) => {
      const k = W / OW;
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
    }));
  }
  function sideTex(set = 'lux') {
    const key = 'chessSide2' + set; if (raw[key + 't']) return raw[key + 't'];
    const t = new (T().CanvasTexture)(FRAME_BURL(set)); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(1, THICK / OW); t.anisotropy = 4;
    return (raw[key + 't'] = t);
  }
  // marbled resin of the piece bodies; x wraps round the lathe (seamless), y runs up the profile
  function marble(key, base, vein, seed) {
    return canvasTex(key, SZ(512), SZ(512), (g) => {
      paint(g.canvas, 'marble', { seed, A: hexRGB(base), B: hexRGB(vein) });
    });
  }

  // turned wood: fibres run up the piece (y), with soft growth bands; x wraps round the lathe
  function grain(key, base, dark, hi, seed) {
    return canvasTex(key, SZ(512), SZ(512), (g) => {
      paint(g.canvas, 'grain', { seed, A: hexRGB(base), B: hexRGB(dark), C: hexRGB(hi) });
    });
  }

  /* ---------- materials ---------- */
  // the piece sets (2026-11-15 v2): 'lux' and 'wood' as before; each new set belongs to a board of its own world —
  // ceramic (glazed, gold), jewel (pavé), brass (slender engraved Indian turnings), neon (lit acrylic, a shape of its own)
  const PSETS = ['lux', 'wood', 'ceramic', 'jewel', 'brass', 'neon'];
  const CARVED = { wood: true };   // carved mane locks on the knight
  function texMat(key, kern, p) { return canvasTex(key, SZ(512), SZ(512), g => { paint(g.canvas, kern, p); }); }
  const mats = {};
  // the reflection in the lacquer: the same materials drawn additively, only where the board is in front (see reflect())
  // mixed in with alpha blending, still in the opaque pass (custom blending), before the real pieces, only on the glossy top (stencil 2), one layer per pixel
  function refMat(x, c, op) {
    const TT = T();
    return new TT.MeshBasicMaterial({ map: (x && x.map) || null, color: new TT.Color(c).convertSRGBToLinear(), opacity: op, blending: TT.CustomBlending, blendSrc: TT.SrcAlphaFactor, blendDst: TT.OneMinusSrcAlphaFactor, blendSrcAlpha: TT.ZeroFactor, blendDstAlpha: TT.OneFactor,
      depthWrite: false, depthFunc: TT.GreaterDepth, stencilWrite: true, stencilRef: 2, stencilFunc: TT.EqualStencilFunc, stencilZPass: TT.IncrementStencilOp, stencilFail: TT.KeepStencilOp, stencilZFail: TT.KeepStencilOp });
  }
  const feltMat = c => { const TT = T(); return new TT.MeshStandardMaterial({ color: new TT.Color(c).convertSRGBToLinear(), roughness: 1 }); };
  function matsOf(col, set = 'lux') {
    if (!PSETS.includes(set)) set = 'lux';
    const key = set + col; if (mats[key]) return mats[key];
    const TT = T(), w = col === 'w', lin = c => new TT.Color(c).convertSRGBToLinear();
    let metal, resin, felt, rMetal, rResin;
    if (set === 'lux') {
      metal = new TT.MeshPhysicalMaterial({ color: lin(w ? 0xeef0f3 : 0xf2c464), metalness: 1, roughness: w ? .1 : .16, clearcoat: .6, clearcoatRoughness: .08, envMapIntensity: 1.25 });
      resin = new TT.MeshPhysicalMaterial({ map: w ? marble('chMarbW', '#4d5056', '#b9bcc2', 7) : marble('chMarbB', '#121214', '#5b564f', 13), roughness: .24, metalness: .05, clearcoat: 1, clearcoatRoughness: .05 });
      felt = feltMat(0x1d3b26); rMetal = refMat(metal, w ? 0xc8ccd2 : 0xd8a645, .34); rResin = refMat(resin, 0x9a9a9a, .3);
    } else if (set === 'wood') {
      const map = w ? grain('chBox2', '#e6c48e', '#c49a62', '#f3dcae', 9) : grain('chPad2', '#7c1610', '#470806', '#a02c1d', 17);
      resin = metal = new TT.MeshPhysicalMaterial({ map, roughness: w ? .38 : .3, metalness: 0, clearcoat: .7, clearcoatRoughness: .2, sheen: 0 });
      felt = feltMat(0x1d3b26); rMetal = rResin = refMat(resin, 0xa8a8a8, .3);
    } else if (set === 'ceramic') {   // a thick, glossy glaze — milk white or ink black — with gold lustre on the rings and crowns
      resin = new TT.MeshPhysicalMaterial({ color: lin(w ? 0xf4f0e6 : 0x16161b), roughness: w ? .14 : .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, sheen: w ? .25 : 0, sheenColor: lin(0xffffff) });
      metal = new TT.MeshPhysicalMaterial({ color: lin(0xf0c46a), metalness: 1, roughness: .2, clearcoat: .6, clearcoatRoughness: .1, envMapIntensity: 1.3 });
      felt = feltMat(0xc9b597); rMetal = refMat(null, 0xd8a645, .32); rResin = refMat(null, w ? 0xc0bdb4 : 0x202024, .3);
    } else if (set === 'jewel') {   // pavé: diamonds (White) or black spinels (Black) all over, the rings and crowns polished platinum
      const map = w ? texMat('chPaveW', 'pave', { seed: 3 }) : texMat('chPaveB', 'pave', { seed: 7, dark: true });
      resin = new TT.MeshPhysicalMaterial({ map, bumpMap: map, bumpScale: .0025, roughness: .05, metalness: .25, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.6 });
      metal = new TT.MeshPhysicalMaterial({ color: lin(w ? 0xe8eaee : 0x8a8c92), metalness: 1, roughness: .08, envMapIntensity: 1.4 });
      felt = feltMat(0x2a2a2e); rMetal = refMat(null, 0xc8ccd4, .32); rResin = refMat(map, w ? 0xd0d0d4 : 0x505058, .3);
    } else if (set === 'brass') {   // engraved Indian turnings: black enamel cut through to brass (Black), nickel silver cut and darkened (White)
      const map = w ? texMat('chBandW', 'bands', { A: [200, 200, 194], B: [58, 54, 50], seed: 3 }) : texMat('chBandB', 'bands', { A: [16, 15, 14], B: [226, 182, 96], seed: 5 });
      resin = new TT.MeshPhysicalMaterial({ map, roughness: w ? .26 : .3, metalness: w ? .9 : .35, clearcoat: w ? 0 : .5, clearcoatRoughness: .2 });
      metal = new TT.MeshPhysicalMaterial({ color: lin(w ? 0xdcdcd6 : 0xe2b660), metalness: 1, roughness: .2, envMapIntensity: 1.25 });
      felt = feltMat(0x1d3b26); rMetal = refMat(null, w ? 0xc8ccd2 : 0xd8a645, .32); rResin = refMat(map, 0x9a9a9a, .3);
    } else {   // neon: cast acrylic lit from inside — magenta (White, the near side) and cyan (Black)
      const c = w ? 0xff5cc8 : 0x4fd9ff;
      resin = metal = new TT.MeshPhysicalMaterial({ color: lin(c), emissive: lin(c), emissiveIntensity: 1.05, roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .82 });
      felt = feltMat(0x000000); felt.visible = false; rMetal = rResin = refMat(null, c, .4);
    }
    return (mats[key] = { metal, resin, felt, rMetal, rResin });
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
  // Douglas–Peucker on a lathe profile ([r, y] points): keeps the ends and every point that bends the outline by more than tol
  function simplify(pts, tol) {
    if (pts.length < 4) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const rec = (a, b) => { const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9; let m = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - x1) * dy - (pts[i][1] - y1) * dx) / L; if (d > m) { m = d; mi = i; } }
      if (m > tol) { keep[mi] = 1; rec(a, mi); rec(mi, b); } };
    rec(0, pts.length - 1); return pts.filter((p, i) => keep[i]);
  }
  function lathe(key, pts, seg) {   // phones: fewer segments round the lathe
    const sm = small();
    seg = Math.min(seg || 99, LOW ? (sm ? 8 : 12) : sm ? 12 : X.coarse ? 20 : 24); key += '@' + seg + (sm || LOW ? 'd' : '');
    if (geoCache[key]) return geoCache[key];
    pts = simplify(pts, LOW ? .008 : sm ? .0035 : X.coarse ? .0035 : .003);   // drop profile points that sit on the line of their neighbours (small / mirror pieces: a looser outline; was every other point)   // the fine pieces: drop profile points that sit on the line of their neighbours (the outline stays within ~2 mm at a piece's scale)
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
    const g = new TT.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: .045, bevelSegments: lo ? 1 : 2, curveSegments: lo ? 2 : 4 });   // (curveSegments is per spline span: 6 keeps the profile smooth at ~40% of the triangles)
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
    const set = PSETS.includes(o && o.set) ? o.set : 'lux', wd = set === 'wood', carved = !!CARVED[set];
    if (set === 'neon') return neonPiece(tp, col, o);
    const pr = PROFILES[tp](), m = matsOf(col, set), g = new TT.Group();
    const add = (geo, mat, o = {}) => { const x = new TT.Mesh(geo, mat); x.castShadow = true; x.receiveShadow = true; if (o.p) x.position.set(...o.p); if (o.r) x.rotation.set(...o.r); if (o.s) x.scale.set(...o.s); g.add(x); return x; };
    pr.resin.forEach((p, i) => add(lathe(tp + 'r' + i, p), m.resin));
    pr.metal.forEach((p, i) => add(lathe(tp + 'm' + i, p), m.metal));
    pr.felt.forEach((p, i) => add(lathe(tp + 'f' + i, p, 24), m.felt).castShadow = false);
    if (pr.merlons) {   // rook: crenellated metal top
      const q = pr.merlons, key = 'merlon';
      const key2 = key + (small() || LOW ? 'S' : ''); let geo = geoCache[key2];
      if (!geo) {
        const s = new TT.Shape(), a = TAU / q.n * .56;
        s.absarc(0, 0, q.r1, -a / 2, a / 2, false); s.absarc(0, 0, q.r0, a / 2, -a / 2, true);
        geo = geoCache[key2] = new TT.ExtrudeGeometry(s, { depth: q.y1 - q.y0 - .016, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: small() || LOW ? 1 : 2, curveSegments: small() || LOW ? 3 : 4 });
        geo.rotateX(-Math.PI / 2);
      }
      for (let i = 0; i < q.n; i++) add(geo, m.metal, { p: [0, q.y0 + .008, 0], r: [0, i * TAU / q.n + TAU / q.n / 2, 0] });
    }
    if (pr.coronet) { const q = pr.coronet, ck = small() ? 'corS' : 'cor', geo = geoCache[ck] || (geoCache[ck] = small() ? new TT.SphereGeometry(q.s, 6, 4) : new TT.SphereGeometry(q.s, 8, 5)); for (let i = 0; i < q.n; i++) { const a = i / q.n * TAU; add(geo, m.metal, { p: [Math.cos(a) * q.r, q.y, Math.sin(a) * q.r] }); } }
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
      const eg = geoCache.eye || (geoCache.eye = new TT.SphereGeometry(.026, 6, 4));
      [1, -1].forEach(s => { const e = new TT.Mesh(eg, m.metal); e.position.set(.2, .655, s * .118); hd.add(e); });
      const nos = geoCache.nos || (geoCache.nos = new TT.TorusGeometry(.13, .018, 8, 24, Math.PI * .9));   // a metal noseband
      const nb = new TT.Mesh(nos, m.metal); nb.position.set(.3, .52, 0); nb.rotation.set(Math.PI / 2, 0, -.55); nb.scale.set(.9, .72, 1); nb.visible = false; hd.add(nb);
      if (carved) [1, -1].forEach(s => { [0, 1].forEach(j => { const r = new TT.Mesh(maneGeo, m.resin); r.castShadow = true; r.position.set(.02 + j * .035, 0, s * (.05 + j * .028)); r.scale.set(.93 - j * .07, .97 - j * .05, .8); hd.add(r); }); });   // carved mane locks
    }
    if (set === 'brass') { g.children.forEach(c => { c.scale.x *= .8; c.scale.z *= .8; c.scale.y *= 1.06; c.position.y *= 1.06; }); }   // the slender Indian turnings
    g.userData.type = tp; g.userData.color = col; g.userData.h = pr.h * (set === 'brass' ? 1.06 : 1); g.userData.set = set;
    if (X.mergeStatic) { try { X.mergeStatic(g); } catch (e) {} }   // one mesh per material (resin / metal / felt) instead of ~8 parts: far fewer draw calls
    if (o && o.reflect && !X.coarse) reflect(g);   // phones: no mirror images in the lacquer (they double every piece)
    return g;
  }
  // mirror image under a piece standing on the glossy board (follows the piece when it moves)
  // neon (2026-11-15): cut acrylic — a round foot, then a shape per piece: pawn a short rod with a ball, rook a hexagonal prism,
  // knight a slanted slab, bishop a rod with a cone, queen a tall rod with a gem, king the tallest with a cross
  function neonPiece(tp, col, o) {
    const TT = T(), m = matsOf(col, 'neon'), g = new TT.Group(), lo = small() || LOW, seg = lo ? 16 : 32;
    const add = (geo, p, r) => { const x = new TT.Mesh(geo, m.resin); x.castShadow = true; x.receiveShadow = true; if (p) x.position.set(...p); if (r) x.rotation.set(...r); g.add(x); return x; };
    const k = 'neon' + tp + (lo ? 'l' : ''), C = geoCache[k] || (geoCache[k] = (() => {
      const out = [], cyl = (r0, r1, h, y, n = seg) => { const q = new TT.CylinderGeometry(r1, r0, h, n); q.translate(0, y + h / 2, 0); out.push(q); };
      cyl(.31, .29, .07, 0);   // the foot
      if (tp === 'P') { cyl(.15, .15, .4, .07); const s = new TT.SphereGeometry(.14, seg, seg / 2); s.translate(0, .6, 0); out.push(s); }
      else if (tp === 'R') { cyl(.26, .26, .56, .07, 6); cyl(.22, .26, .06, .63, 6); }
      else if (tp === 'N') { const b = new TT.BoxGeometry(.2, .72, .44); b.rotateZ(.32); b.translate(.07, .46, 0); out.push(b); cyl(.17, .17, .12, .07); }
      else if (tp === 'B') { cyl(.18, .16, .58, .07); const c = new TT.ConeGeometry(.17, .34, seg); c.translate(0, .82, 0); out.push(c); }
      else if (tp === 'Q') { cyl(.21, .18, .78, .07); const s = new TT.OctahedronGeometry(.16); s.translate(0, 1.0, 0); out.push(s); }
      else { cyl(.23, .2, .9, .07); const a = new TT.BoxGeometry(.07, .28, .07), b = new TT.BoxGeometry(.24, .07, .07); a.translate(0, 1.11, 0); b.translate(0, 1.12, 0); out.push(a, b); }
      return out; })());
    C.forEach(q => add(q));
    g.userData.type = tp; g.userData.color = col; g.userData.h = { P: .74, R: .69, N: .85, B: .99, Q: 1.16, K: 1.25 }[tp]; g.userData.set = 'neon';
    if (X.mergeStatic) { try { X.mergeStatic(g); } catch (e) {} }
    if (o && o.reflect && !X.coarse) reflect(g);
    return g;
  }
  // the mirror images show only on the glossy boards (the lacquer, ceramic, jewel, neon) — the satin brass hides them (2026-11-15)
  let mirrorOn = true; const REFS = new Set();
  function setMirror(on) { mirrorOn = on; for (const w of REFS) { const r = w.deref ? w.deref() : w; if (!r) REFS.delete(w); else r.visible = on; } }
  function reflect(g) {
    const m = matsOf(g.userData.color, g.userData.set), r = new (T().Group)(); r.scale.y = -1; r.userData.reflection = true;
    r.visible = mirrorOn; REFS.add(window.WeakRef ? new WeakRef(r) : r);
    let lo; LOW = true; try { lo = piece(g.userData.type, g.userData.color, { set: g.userData.set }); } finally { LOW = false; }   // same piece, coarser (it is seen dimmed and upside down)
    lo.children.slice().forEach(ch => { const c = ch.clone(); c.traverse(o => { if (o.isMesh) { o.material = o.material === m.metal ? m.rMetal : o.material === m.resin ? m.rResin : null; o.castShadow = o.receiveShadow = false; o.renderOrder = -1; if (!o.material) o.visible = false; } }); r.add(c); });
    g.add(r); return g;
  }

  /* ---------- the board ---------- */
  const LOOKS = ['lux', 'wood', 'ceramic', 'jewel', 'brass', 'neon'];
  let topMat = null;
  function lacquerBlock() {   // the lacquered burl boards ('lux' / 'wood'): one top picture drawn here, the burl round the sides
    const TT = T(), g = new TT.Group();
    topMat = topMat || new TT.MeshPhysicalMaterial({ map: boardTop(), roughness: .1, metalness: 0, clearcoat: 1, clearcoatRoughness: .28, envMapIntensity: 1.6 });   // (2026-11-08: a softer lacquer — the near-mirror coat (.02) burnt a lamp's point into the board's middle, e.g. in the study)
    topMat.map.anisotropy = 8;
    Object.assign(topMat, { stencilWrite: true, stencilRef: 2, stencilFunc: T().AlwaysStencilFunc, stencilZPass: T().ReplaceStencilOp });   // marks where reflections may show
    const side = new TT.MeshPhysicalMaterial({ map: sideTex(), roughness: .16, clearcoat: 1, clearcoatRoughness: .04 });
    const topMaps = { lux: boardTop('lux') };
    const bottom = new TT.MeshStandardMaterial({ color: new TT.Color(0x23201c).convertSRGBToLinear(), roughness: .9 });
    const block = new TT.Mesh(RB(OW, THICK, OW, .09, 3), [side, side, topMat, bottom, side, side]);
    block.position.y = THICK / 2; block.castShadow = block.receiveShadow = true; block.renderOrder = -2; g.add(block);   // drawn first: the reflections test against it
    let curSet = 'lux';
    g.userData.setSet = name => {
      if (!SETS[name] || (name === curSet && topMat.map === topMaps[name])) return; curSet = name;   // topMat is shared by every board: another board may have left a different set on it
      if (!topMaps[name]) { topMaps[name] = boardTop(name); topMaps[name].anisotropy = 8; }
      topMat.map = topMaps[name]; side.map = sideTex(name); bottom.color.set(SETS[name].side).convertSRGBToLinear();
      topMat.needsUpdate = side.needsUpdate = true;
    };
    return g;
  }

  /* the picture boards (2026-11-15): images/atlas/chess3d/top-<look> and side-<look> (the four faces stacked: far, right, near,
     left), each with a "-m" map: R height (bump), G roughness, B metalness — brass and gold set flush, joints and tooling in the bump */
  const C3 = (() => { try { return new URL('../../images/atlas/chess3d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/chess3d/'; } })();
  const C3V = '?v=3';
  const LO = () => !!(X.coarse || X.lite);
  const texs = {};
  function imgTex(name, srgb = true, aniso = 8) {
    if (texs[name]) return texs[name];
    const TT = T(), t = new TT.TextureLoader().load(C3 + name + (LO() ? '-h' : '') + '.webp' + C3V, () => { if (X.kick) X.kick(300); });   // (phones: the half-size copy, atlas/tools/mobile-tex.py)
    if (srgb) t.encoding = TT.sRGBEncoding; t.anisotropy = aniso;
    return (texs[name] = t);
  }
  // mirror: the pieces' reflections show in the top (stencil) · bump: the top's relief
  const LK = {
    ceramic: { gloss: { roughness: 1, clearcoat: 1, clearcoatRoughness: .03 }, bump: .004, bottom: 0x141418, mirror: true },
    jewel: { gloss: { roughness: 1, clearcoat: .6, clearcoatRoughness: .05, envMapIntensity: 1.5 }, bump: .004, bottom: 0x303034, mirror: true },
    brass: { gloss: { roughness: 1, clearcoat: .4, clearcoatRoughness: .2 }, bump: .006, bottom: 0x141312 },
    neon: { gloss: { roughness: 1, clearcoat: 1, clearcoatRoughness: .02 }, bump: .003, bottom: 0x08090e, mirror: true, glow: .85 },   // glow: the picture lights itself (emissive)
  };
  const pmats = {};
  function faceMat(look, part) {
    const k = part + '-' + look; if (pmats[k]) return pmats[k];
    const TT = T(), L = LK[look], mm = imgTex(k + '-m', false, 4), o = Object.assign({ map: imgTex(k), color: 0xffffff, roughnessMap: mm, metalnessMap: mm, metalness: 1, bumpMap: mm, bumpScale: part === 'top' ? L.bump : .003 }, L.gloss);
    if (L.glow) Object.assign(o, { emissiveMap: o.map, emissive: new TT.Color(0xffffff), emissiveIntensity: L.glow });
    if (X.lite) { delete o.clearcoat; delete o.clearcoatRoughness; }
    const m = new TT[o.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](o);
    if (part === 'top' && L.mirror) Object.assign(m, { stencilWrite: true, stencilRef: 2, stencilFunc: TT.AlwaysStencilFunc, stencilZPass: TT.ReplaceStencilOp });
    return (pmats[k] = m);
  }
  const SIDE_H = .52, E_RO = .06;   // the side pictures' height (world units, from the top edge down) and the round-over (atlas/tools/chess-tex.py)
  // a profile swept round the square (mitred corners); the four faces read one picture, stacked (far, right, near, left)
  function sweep(A, prof) {
    const TT = T(), Pp = [], N = [], UV = [], idx = [], nrm = [];
    for (let i = 0; i < prof.length; i++) {
      let nd = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= prof.length) continue;
        const dd = prof[b][0] - prof[a][0], dy = prof[b][1] - prof[a][1], L = Math.hypot(dd, dy); if (L < 1e-6) continue;
        nd += -dy / L; ny += dd / L;
      }
      const L = Math.hypot(nd, ny) || 1; nrm.push([nd / L, ny / L]);
    }
    const arc = [0]; for (let i = 1; i < prof.length; i++) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    const sides = [[[0, 0, -1], [1, 0, 0]], [[1, 0, 0], [0, 0, 1]], [[0, 0, 1], [-1, 0, 0]], [[-1, 0, 0], [0, 0, -1]]];
    sides.forEach(([o, e], si) => {
      const base = Pp.length / 3;
      prof.forEach(([d, y], i) => {
        const L = A - d, [nd, ny] = nrm[i];
        for (const s of [-L, L]) {
          Pp.push(o[0] * (A - d) + e[0] * s, y, o[2] * (A - d) + e[2] * s); N.push(-o[0] * nd, ny, -o[2] * nd);
          UV.push((s + A) / (2 * A), 1 - (si + Math.min(1, (arc[arc.length - 1] - arc[i]) / SIDE_H)) / 4);
        }
      });
      for (let i = 0; i < prof.length - 1; i++) {
        const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2;
        if (Math.hypot(prof[i + 1][0] - prof[i][0], prof[i + 1][1] - prof[i][1]) < 1e-6) continue;
        idx.push(a, c, b, a, d, c);
      }
    });
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(Pp, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(UV, 2));
    g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  function pictureBlock(look) {
    const L = LK[look], TT = T(), g = new TT.Group(), A = OW / 2, e = E_RO, n = LO() ? 2 : 4;
    const prof = [[0, 0], [0, THICK - e]]; for (let i = 1; i <= n; i++) { const a = i / n * Math.PI / 2; prof.push([e - Math.cos(a) * e, THICK - e + Math.sin(a) * e]); }
    const add = (geo, m, cast = true) => { const x = new TT.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; g.add(x); return x; };
    add(sweep(A, prof), faceMat(look, 'side'));
    const fg = new TT.PlaneGeometry(OW - 2 * e, OW - 2 * e); fg.rotateX(-Math.PI / 2);
    { const P = fg.attributes.position, UV = fg.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + A) / OW, 1 - (P.getZ(i) + A) / OW); }
    const top = add(fg, faceMat(look, 'top'), false); top.position.y = THICK; top.renderOrder = -2;   // drawn first: the reflections test against it
    const bg = new TT.PlaneGeometry(OW, OW); bg.rotateX(Math.PI / 2); add(bg, new TT.MeshStandardMaterial({ color: new TT.Color(L.bottom).convertSRGBToLinear(), roughness: .9 }), false);
    { const sc = new TT.Mesh(new TT.BoxGeometry(OW - .06, THICK - .03, OW - .06), new TT.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));   // the shadow caster (the swept sides alone leak light)
      sc.position.y = (THICK - .03) / 2; sc.castShadow = true; sc.receiveShadow = false; sc.userData.noInst = true; sc.material.userData.noMerge = true; g.add(sc); }
    return g;
  }
  function board(lk) {
    const TT = T(), g = new TT.Group(), parts = {};
    let cur = null;
    const show = look => {
      if (!LOOKS.includes(look)) look = 'lux';
      const k = SETS[look] ? 'lacquer' : look;
      if (!parts[k]) { parts[k] = SETS[look] ? lacquerBlock() : pictureBlock(look); g.add(parts[k]); }
      for (const q in parts) parts[q].visible = q === k;
      if (SETS[look]) parts[k].userData.setSet(look);
      cur = look; g.userData.look = look; g.userData.mirror = !!(SETS[look] || LK[look].mirror); setMirror(g.userData.mirror); if (X.kick) X.kick(300);
    };
    g.userData.setSet = name => { if (name !== cur || SETS[name]) show(name); };   // (the lacquer's top is shared: setSet re-applies its picture)
    g.userData.setTone = () => {};   // (2026-11-15: the 2D boards are picked as 2D boards — the 3D boards keep their own colours)
    g.userData.S = S; g.userData.top = THICK + .001; g.userData.outer = OW / S;
    show(LOOKS.includes(lk) ? lk : (X.BOARDS && X.BOARDS.chess ? X.BOARDS.chess.get() : 'lux'));
    return g;
  }
  const cell = (f, r) => [-S / 2 + f + .5, -S / 2 + r + .5];   // f: 0 = left column on screen, r: 0 = top row

  X.MODELS.chess = function (live, o) {
    const g = board(o && o.look), Y = g.userData.top;
    if (live) return g;
    // the showcase: the board and the piece set chosen (the portal's 盤 / 駒 rows, the full game's design tab: Table3D.BOARDS / PIECES.chess)
    const set = (o && o.set) || (X.PIECES && X.PIECES.chess ? X.PIECES.chess.get() : 'lux');
    const back = 'RNBQKBNR';
    const put = (t, f, r, col) => {
      const p = piece(t, col, { reflect: true, set }), [x, z] = cell(f, r); p.position.set(x, Y, z);
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
      // portal: the textures are drawn in a worker — build the pieces once and wait for them (their materials are cached)
      if (!window.AtlasTexGen) return;
      for (const col of ['w', 'b']) for (const tp of 'KQRBNP') piece(tp, col, { set });
      return AtlasTexGen.settle();
    }).then(() => {
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

  X.chess = { piece, board, cell, images, S, MARGIN, OW, SPR_H, SHEET_KEYS, LOOKS, PSETS, mirrors: look => !!(SETS[look] || (LK[look] && LK[look].mirror)) };
})();
