/* =====================================================================
   Checkers (English draughts) on the 3D table — six luxury boards and six sets of checkers (2026-11-14).
   Boards (Table3D.BOARDS.checkers, 'atlas-checkers-look'), in the menus' order; the first is the default:
     marble   赤と黒の大理石    Nero Marquina and Rosso Levanto squares, a double brass fillet, a chamfered Nero frame with a brass bead
     lacquer  黒漆          grey-black burl and ivory squares, a thick rounded black lacquer frame (the first board)
     deco     アールデコ       Macassar ebony and sycamore, gold chevrons and stepped corners in the border, a stepped black
                             lacquer frame with a gilt edge
     lapis    ラピスラズリ      lapis lazuli and white onyx squares (a mirror gloss), gold fillets and rosettes, a gilt-bronze frame
     leather  金箔押しの革     bottle-green and cream calf squares, a wide gold-leaf border tooled with a Greek key, gold fillets, a
                             gilt-wood frame with a mahogany bead
     boulle   ブール象嵌       Boulle marquetry (Louis XIV): red tortoiseshell squares and engraved brass squares (metal), brass
                             scrolls on ebony in the border, a tortoiseshell frame with a gilt bead
   Pieces (Table3D.PIECES.checkers, 'atlas-checkers-pc3'), in order, the first the default; g = Black's side (moves first):
     stone (black / white marble) · rbmarble (black / red marble) · rmarble (red / white marble) · metal (gold / silver,
     turned with ring grooves) · ebony (ebony / ivory with an inlaid ring) · urushi (black / vermilion lacquer, a gold band).
     Kings: two stacked with a little crown.
   The glossy fields mirror the pieces (stencil reflections, PC only).
   Registers into Table3D:
     Table3D.MODELS.checkers(live, look)   board (+ a mid-game position unless live)
     Table3D.checkers = { board(look), piece(col, king, o, set), LOOKS, SETS, pcSet(), side(col, lang, set), swatch(col, set),
                         tone(col, set), recolor(html, lang, set, from 'bw'|'metal'), S, OW }
     userData: { S, top, look, pt(x, y) → [x, z], piece(color 'w'|'g', king, o) → Group (the chosen set) }
   Units: one square is 1.0; the field 8 × 8.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex, makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const S = 8, MG = .36, FR = .56, HF = .3;   // field, border band round the squares, frame width, field height
  const IN = S + 2 * MG, OW = IN + 2 * FR;
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
  const LOOKS = ['marble', 'lacquer', 'deco', 'lapis', 'leather', 'boulle'];
  const SETS = ['stone', 'rbmarble', 'rmarble', 'metal', 'ebony', 'urushi'];
  const lookOf = k => LOOKS.includes(k) ? k : (X.BOARDS && X.BOARDS.checkers ? X.BOARDS.checkers.get() : (LOOKS.includes(ls.get('atlas-checkers-look')) ? ls.get('atlas-checkers-look') : 'marble'));
  const pcSet = () => { const v = ls.get('atlas-checkers-pc3'); return SETS.includes(v) ? v : 'stone'; };

  /* ---------- textures: the pixel loops (self-contained: on the portal they run in a worker, atlas/texgen.js) ---------- */
  const raw = {};
  function KL(X) {
    const makeNoise = X.makeNoise;
    const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    const cl = v => Math.max(0, Math.min(1, v));
    const pix = (d, Wd, Ht, f) => { for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { const v = f(x / Wd, y / Ht), i = (y * Wd + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; } };
    return {
      // grey-black burl: domain-warped noise, swirling figure, clusters of tiny dark knots
      burl(d, W) {
        const N = makeNoise(29), A = hexRGB('#626265'), B = hexRGB('#18181b'), TAU = Math.PI * 2;
        pix(d, W, W, (x, y) => {
          const px = x * 7 + 3, py = y * 7 + 3;
          const q = N(px * 1.4, py * 1.4, 3), r = N(px * 1.6 + q * 3.2 + 1.7, py * 1.6 + q * 3.2 + 9.2, 3);
          const f = N(px * 2.6 + r * 4.2, py * 2.6 + r * 4.2, 4);
          const band = Math.sin((f * 9 + r * 5) * TAU) * .5 + .5, fine = N(px * 22 + r * 6, py * 22 + r * 6, 2);
          let t = .5 + Math.pow(band, 1.8) * .2 + (fine - .5) * .34 + (q - .5) * .3;
          const eye = N(px * 30, py * 30, 1), c = N(px * 3.3 + 7, py * 3.3 + 1, 2); if (c > .58 && eye > .74) t += (eye - .74) * 3;
          return mix(A, B, cl(t));
        });
      },
      // ivory: a warm white with very fine straight fibres and a soft cloud
      ivory(d, W) {
        const N = makeNoise(53);
        pix(d, W, W, (x, y) => { const t = (N(x * 3, y * 160, 2) - .5) * .5 + (N(x * 2.5, y * 2.5, 3) - .5) * .6; return [228 - t * 14, 221 - t * 16, 203 - t * 22]; });
      },
      // marble: a base with soft clouds, warped veins (a bold one and a hairline web)
      marble(d, W, H, p) {
        const N = makeNoise(p.seed || 7), A = hexRGB(p.base), V = hexRGB(p.vein), V2 = hexRGB(p.vein2 || p.vein), C = hexRGB(p.cloud || p.base), s = p.s || 2;
        pix(d, W, H, (x, y) => {
          const px = x * s * 3, py = y * s * 3, q = N(px * .8 + 3, py * .8 + 7, 4), r = N(px * 1.7 + q * 2.2, py * 1.7 - q * 2.2 + 5, 4);
          let c = mix(A, C, cl((N(px * .6 + 11, py * .6, 4) - .35) * 1.6) * .55);
          const v1 = Math.abs(Math.sin((px * .55 + py * .3 + q * 3.4 + r * 1.6) * Math.PI)), w1 = Math.pow(cl(1 - v1 / (p.vw || .05)), 1.6) * (p.amt != null ? p.amt : .8) * cl((N(px * .9 + 21, py * .9, 3) - .32) * 2.4);
          const v2 = Math.abs(Math.sin((px * 1.6 - py * .9 + r * 4.5) * Math.PI)), w2 = Math.pow(cl(1 - v2 / .025), 2) * .45 * cl((N(px * 1.3, py * 1.3 + 31, 3) - .45) * 3);
          c = mix(c, V2, w2); c = mix(c, V, w1);
          const g = (N(px * 40, py * 40, 2) - .5) * (p.grain || 10); return [c[0] + g, c[1] + g, c[2] + g];
        });
      },
      // wood: straight grain (dir 0 along y) with soft growth rings, pores and an optional figure — curl (ripples across the grain)
      // or stripe (Macassar's bold dark streaks)
      wood(d, W, H, p) {
        const N = makeNoise(p.seed || 3), A = hexRGB(p.a), B = hexRGB(p.b), TAU = Math.PI * 2, dir = p.dir || 0;
        pix(d, W, H, (u, v) => {
          const x = dir ? v : u, y = dir ? u : v;
          const w = N(x * 2 + 5, y * .35, 3) * (p.warp || 1.6), ring = Math.sin((x * (p.rings || 26) + w * 3) * TAU) * .5 + .5;
          let t = .45 + (ring - .5) * (p.ringAmt || .35) + (N(x * 90 + w * 4, y * 2.2, 2) - .5) * .5 + (N(x * 3, y * 1.2, 3) - .5) * .35;
          if (p.stripe) { const st = N(x * 7 + 1, y * .25 + 3, 3); t += Math.pow(cl((st - .48) * 4.2), 1.4) * p.stripe - .1; }
          let c = mix(A, B, cl(t));
          if (p.curl) { const rp = Math.sin((y * (p.curlF || 70) + N(x * 6, y * 2, 2) * 3) * TAU) * .5 + .5; const k = (rp - .5) * p.curl; c = [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k * 1.05)]; }
          const pore = N(x * 260, y * 9, 1); if (pore > .78) { const k = 1 - (pore - .78) * (p.pore || 1.2); c = [c[0] * k, c[1] * k, c[2] * k]; }
          return c;
        });
      },
      // leather: a dyed calf with a fine pebble grain and a soft mottling (aniline)
      leather(d, W, H, p) {
        const N = makeNoise(p.seed || 17), A = hexRGB(p.a), B = hexRGB(p.b);
        pix(d, W, H, (x, y) => {
          const m = N(x * 3 + 1, y * 3 + 9, 4), g1 = N(x * 70, y * 70, 2), g2 = N(x * 160 + 5, y * 160, 1);
          const pebble = Math.pow(cl((g1 - .38) * 2.2), 1.2), crease = Math.pow(cl(1 - Math.abs(g1 - .5) * 9), 3);
          const t = cl(.35 + (m - .5) * .9 + pebble * .25 - crease * .35 + (g2 - .5) * .12);
          return mix(A, B, t);
        });
      },
      // lapis lazuli: deep ultramarine clouds, white calcite drifts and sparks of golden pyrite
      lapis(d, W, H, p) {
        const N = makeNoise(p.seed || 41), A = hexRGB('#0b1f6e'), B = hexRGB('#2c4fbf'), Cc = hexRGB('#c9cfdc'), Py = hexRGB('#e4c46a');
        pix(d, W, H, (x, y) => {
          const q = N(x * 4 + 1, y * 4 + 3, 4), r = N(x * 9 + q * 2, y * 9 - q * 2, 4);
          let c = mix(A, B, cl((r - .3) * 1.8));
          const cal = cl((N(x * 3.2 + 13, y * 3.2 + q * 1.5, 4) - .72) * 5) * .5; c = mix(c, Cc, cal);
          const sp = N(x * 220, y * 220, 1), sp2 = N(x * 90 + 7, y * 90, 1); if (sp > .86 && sp2 > .55) c = mix(c, Py, cl((sp - .86) * 9));
          return c;
        });
      },
      // red tortoiseshell (Boulle): warm amber-red with dark mottled blotches and soft translucent depth
      tort(d, W, H, p) {
        const N = makeNoise(p.seed || 71), A = hexRGB('#8a2a10'), B = hexRGB('#240703'), C = hexRGB('#b85424');
        pix(d, W, H, (x, y) => {
          const q = N(x * 3 + 1, y * 3 + 7, 4), b = N(x * 6 + q * 2.5, y * 6 - q * 2.5, 4), dark = cl((b - .36) * 2.6);
          let c = mix(A, B, dark); c = mix(c, C, cl((N(x * 9 + 3, y * 9, 3) - .62) * 3) * .5);
          const f = (N(x * 70, y * 70, 2) - .5) * 12; return [c[0] + f, c[1] + f * .7, c[2] + f * .5];
        });
      },
      // engraved brass: a brushed pale gold with fine engraved scroll lines
      brass(d, W, H, p) {
        const N = makeNoise(p.seed || 83), A = hexRGB('#f6dc94'), B = hexRGB('#d0a650');
        pix(d, W, H, (x, y) => {
          let c = mix(A, B, cl(.4 + (N(x * 2, y * 2, 3) - .5) * .8 + (N(x * 400, y * 3, 1) - .5) * .25));
          const e = Math.abs(Math.sin((x * 9 + Math.sin(y * 18 + N(x * 3, y * 3, 2) * 4) * .6) * Math.PI)); if (e < .05) c = mix(c, hexRGB('#6a4a18'), .55);
          return c;
        });
      },
      // white onyx: a warm translucent white with soft curved bands
      onyx(d, W, H, p) {
        const N = makeNoise(p.seed || 61), A = hexRGB('#f6f1e6'), B = hexRGB('#ded3bf'), Cc = hexRGB('#fffdf8');
        pix(d, W, H, (x, y) => {
          const w = N(x * 2 + 4, y * 2, 4), band = Math.sin((y * 9 + x * 2.5 + w * 4.5) * Math.PI) * .5 + .5;
          let c = mix(A, B, cl(Math.pow(band, 3) * .7 + (N(x * 6, y * 6 + 2, 3) - .5) * .4));
          c = mix(c, Cc, cl((N(x * 3 + 9, y * 3, 3) - .55) * 2.5) * .6);
          return c;
        });
      },
    };
  }
  function paint(c, name, p, after, c2) {
    const TG = window.AtlasTexGen; if (TG) return TG.paint(c, KL, name, p, after, c2);
    const g = c.getContext('2d'), a = g.createImageData(c.width, c.height), b = c2 ? c2.getContext('2d').createImageData(c2.width, c2.height) : null;
    (KL.L || (KL.L = KL(X)))[name](a.data, c.width, c.height, p || {}, b && b.data, (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k.getContext('2d'); });
    g.putImageData(a, 0, 0); if (b) c2.getContext('2d').putImageData(b, 0, 0); if (after) after(g, c.width, c.height); return c;
  }
  const later = (deps, c, fn) => window.AtlasTexGen ? AtlasTexGen.later(deps, c, fn) : (fn(c.getContext('2d'), c.width, c.height), c);
  function sheet(key, Wd, Ht, name, p) {   // a plain canvas filled pixel by pixel (cached)
    if (raw[key]) return raw[key];
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; paint(c, name, p || {}); return (raw[key] = c);
  }
  // the materials of each board: squares (dark, light), the border band, the frame's own sheet
  const TX = {
    burl: [], ivory: [],
    nero: ['marble', { base: '#141416', vein: '#e6e2da', vein2: '#77736c', cloud: '#232326', seed: 7, s: 1.7, vw: .035, amt: .75, grain: 6 }],
    cala: ['marble', { base: '#f1eee8', vein: '#8d877e', vein2: '#bdb6aa', cloud: '#e6e2da', seed: 11, s: 1.4, vw: .028, amt: .62, grain: 5 }],
    rosso: ['marble', { base: '#8a1d17', vein: '#f0e2da', vein2: '#c4675a', cloud: '#5e100c', seed: 13, s: 1.6, vw: .03, amt: .7, grain: 7 }],
    tort: ['tort', { seed: 71 }],
    brass: ['brass', { seed: 83 }],
    // the marble discs' caps: bolder veins (a piece shows only a little of the sheet)
    neroC: ['marble', { base: '#2a2a2e', vein: '#d8d3ca', vein2: '#3a3a3e', cloud: '#38383d', seed: 17, s: .7, vw: .05, amt: .75, grain: 5 }],
    calaC: ['marble', { base: '#f3f0ea', vein: '#8d867c', vein2: '#e8e3da', cloud: '#e4dfd6', seed: 19, s: .7, vw: .05, amt: .8, grain: 4 }],
    rossoC: ['marble', { base: '#9a2219', vein: '#f0ddd4', vein2: '#a32a20', cloud: '#7a1810', seed: 23, s: .7, vw: .05, amt: .8, grain: 5 }],
    mahog: ['wood', { a: '#8e3a22', b: '#4a160c', seed: 19, rings: 22, ringAmt: .35, warp: 1.8, dir: 1, curl: .08, curlF: 30 }],
    green: ['leather', { a: '#1f4a35', b: '#0d2a1d', seed: 17 }],
    cream: ['leather', { a: '#efe3c6', b: '#cbb48a', seed: 23 }],
    macas: ['wood', { a: '#6c4a2e', b: '#160d08', seed: 29, rings: 12, ringAmt: .2, warp: 1.4, stripe: 1.1 }],
    syca: ['wood', { a: '#f4ead6', b: '#dccaa6', seed: 31, rings: 10, ringAmt: .12, warp: .8, curl: .1, curlF: 90, pore: .3 }],
    lapis: ['lapis', { seed: 41 }],
    onyx: ['onyx', { seed: 61 }],
  };
  const tile = (k, W) => k === 'burl' ? sheet('ckBurl', W, W, 'burl') : k === 'ivory' ? sheet('ckIvory', W, W, 'ivory') : sheet('ck-' + k + W, W, W, TX[k][0], TX[k][1]);
  const GOLD = ['#f6dc8c', '#c9962f', '#8a5d14'], BRASS = ['#f2d68a', '#bf9443', '#7c5a1e'];
  const LK = {
    lacquer: { dark: 'burl', light: 'ivory', band: 'burl', rot: true, joint: 'rgba(20,20,22,.35)', inlay: 'rgba(232,226,210,.55)', vig: .25, top: { roughness: .14, clearcoat: 1, clearcoatRoughness: .03 }, frame: 'lacquer' },
    marble: { dark: 'nero', light: 'rosso', band: 'nero', rot: true, joint: 'rgba(30,20,18,.45)', fillet: BRASS, deco: 'double', vig: .12, top: { roughness: .08, clearcoat: 1, clearcoatRoughness: .03 }, frame: 'marble' },
    leather: { dark: 'green', light: 'cream', band: 'green', joint: 'rgba(10,30,20,.55)', fillet: GOLD, deco: 'gilt', vig: .14, top: { roughness: .5, clearcoat: .3, clearcoatRoughness: .4 }, frame: 'gilt' },
    deco: { dark: 'macas', light: 'syca', band: 'macas', grainTurn: true, joint: 'rgba(20,12,6,.5)', fillet: GOLD, deco: 'chevron', vig: .14, top: { roughness: .22, clearcoat: 1, clearcoatRoughness: .06 }, frame: 'step' },
    boulle: { dark: 'tort', light: 'brass', band: 'tort', rot: true, joint: 'rgba(40,14,4,.5)', fillet: BRASS, deco: 'boulle', metalLight: true, vig: .14, top: { roughness: .12, clearcoat: 1, clearcoatRoughness: .03 }, frame: 'tort' },
    lapis: { dark: 'lapis', light: 'onyx', band: 'lapis', rot: true, joint: 'rgba(12,20,60,.45)', fillet: GOLD, deco: 'rosette', vig: .1, top: { roughness: .03, clearcoat: 1, clearcoatRoughness: .008, envMapIntensity: 2.2 }, frame: 'ormolu' },
  };
  function goldGrad(c, x0, y0, x1, y1, G) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, G[0]); g.addColorStop(.45, G[1]); g.addColorStop(.55, G[0]); g.addColorStop(1, G[2]); return g; }
  // the border band's ornaments (never on the squares: nothing to distract from the game)
  function ornament(c, L, k, Wd) {
    const o = MG * k, F = 8 * k, G = L.fillet || GOLD, line = (pad, w) => { c.lineWidth = w; c.strokeRect(o - pad, o - pad, F + 2 * pad, F + 2 * pad); };
    c.save();
    if (L.deco === 'double') { c.strokeStyle = goldGrad(c, 0, 0, Wd, Wd, G); line(k * .07, k * .035); line(k * .27, k * .02); }
    if (L.deco === 'boulle') {   // an ebony band with brass fillets and running brass scrolls (rinceaux), a brass rosette at each corner
      const a = o - k * .32, b = o - k * .05, G2 = goldGrad(c, 0, 0, Wd, Wd, G);
      c.fillStyle = '#140a06'; c.beginPath(); c.rect(a, a, Wd - 2 * a, Wd - 2 * a); c.rect(b, Wd - b, Wd - 2 * b, -(Wd - 2 * b)); c.fill('evenodd');
      c.strokeStyle = G2; c.lineWidth = k * .018; c.strokeRect(a, a, Wd - 2 * a, Wd - 2 * a); c.strokeRect(b, b, Wd - 2 * b, Wd - 2 * b);
      const h = b - a, mid = a + h / 2, st = h * 1.35, r = h * .3;
      c.lineWidth = k * .012; c.lineCap = 'round';
      for (let s = 0; s < 4; s++) { c.save(); c.translate(Wd / 2, Wd / 2); c.rotate(s * Math.PI / 2); c.translate(-Wd / 2, -Wd / 2);
        let up = 1; for (let x = a + h * 1.2; x < Wd - a - h * 1.6; x += st, up = -up) {   // a wave with a curl in each loop
          c.beginPath(); c.moveTo(x, mid); c.bezierCurveTo(x + st * .3, mid - up * r * 1.3, x + st * .7, mid - up * r * 1.3, x + st, mid); c.stroke();
          c.beginPath(); c.arc(x + st * .5, mid - up * r * .35, r * .45, 0, Math.PI * 1.6 * up, up < 0); c.stroke();
          c.fillStyle = G2; c.beginPath(); c.arc(x + st * .5, mid - up * r * .35, r * .14, 0, Math.PI * 2); c.fill(); }
        c.restore(); }
      [[a, a], [Wd - b, a], [a, Wd - b], [Wd - b, Wd - b]].forEach(([x, y]) => { c.save(); c.translate(x + h / 2, y + h / 2); c.fillStyle = G2;
        for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.ellipse(h * .2, 0, h * .18, h * .07, 0, 0, Math.PI * 2); c.fill(); } c.restore(); });
    }
    if (L.deco === 'gilt') {   // a gold-leaf border (the leather shows only in the tooled Greek key), double gold fillets, gold corner squares
      const a = o - k * .34, b = o - k * .035, gl = goldGrad(c, 0, 0, Wd, Wd, ['#fff1b8', '#e2b240', '#9a6a18']);
      c.fillStyle = gl; c.beginPath(); c.rect(a, a, Wd - 2 * a, Wd - 2 * a); c.rect(b, Wd - b, Wd - 2 * b, -(Wd - 2 * b)); c.fill('evenodd');
      const Ng = makeNoise(97); for (let i = 0; i < 900; i++) { const x = Ng(i * .31, 2, 1) * Wd, y = Ng(4, i * .29, 1) * Wd; c.fillStyle = `rgba(255,250,220,${Ng(i, 6, 1) * .18})`; c.fillRect(x, y, k * .02, k * .02); }   // the leaf's sparkle
      c.strokeStyle = '#7a5418'; c.lineWidth = k * .012; c.strokeRect(a, a, Wd - 2 * a, Wd - 2 * a); c.strokeRect(b, b, Wd - 2 * b, Wd - 2 * b);
      const u = k * .04, run = (len) => { c.beginPath(); let x = 0; while (x + 6 * u <= len) { c.moveTo(x, 4 * u); c.lineTo(x, 0); c.lineTo(x + 4 * u, 0); c.lineTo(x + 4 * u, 3 * u); c.lineTo(x + 2 * u, 3 * u); c.lineTo(x + 2 * u, u); c.moveTo(x + 4 * u, 4 * u); c.lineTo(x + 6 * u, 4 * u); x += 6 * u; } c.stroke(); };
      c.strokeStyle = 'rgba(16,52,36,.92)'; c.lineWidth = u * .6; const ka = a + (b - a - 4 * u) / 2;
      for (let s = 0; s < 4; s++) { c.save(); c.translate(Wd / 2, Wd / 2); c.rotate(s * Math.PI / 2); c.translate(-Wd / 2, -Wd / 2); c.translate(a + (b - a) + 2 * u, ka); run(Wd - 2 * (a + (b - a)) - 4 * u); c.restore(); }
      c.fillStyle = 'rgba(16,52,36,.92)'; [[a, a], [Wd - b, a], [a, Wd - b], [Wd - b, Wd - b]].forEach(([x, y]) => { c.save(); c.translate(x + (b - a) / 2, y + (b - a) / 2); c.rotate(Math.PI / 4); c.fillRect(-u * 1.4, -u * 1.4, u * 2.8, u * 2.8); c.restore(); });
      c.strokeStyle = gl; c.lineWidth = k * .02; c.strokeRect(b + k * .03, b + k * .03, Wd - 2 * b - k * .06, Wd - 2 * b - k * .06);
    }
    if (L.deco === 'chevron') {   // gold fillets, a chevron frieze, stepped corners
      c.strokeStyle = goldGrad(c, 0, 0, Wd, Wd, G); line(k * .05, k * .028); line(k * .3, k * .028);
      const a = o - k * .26, b = o - k * .09, h = b - a, st = h * 1.1;
      c.lineWidth = k * .016;
      for (let s = 0; s < 4; s++) { c.save(); c.translate(Wd / 2, Wd / 2); c.rotate(s * Math.PI / 2); c.translate(-Wd / 2, -Wd / 2);
        c.beginPath(); for (let x = a + h * 2; x < Wd - a - h * 2.5; x += st) { c.moveTo(x, b); c.lineTo(x + st / 2, a); c.lineTo(x + st, b); } c.stroke();
        c.fillStyle = goldGrad(c, a, a, a + h * 2, a + h * 2, G); [[0, 0, 2, .45], [0, 0, .45, 2], [.7, .7, 1.1, .3], [.7, .7, .3, 1.1]].forEach(([x, y, w, hh]) => c.fillRect(a + x * h, a + y * h, w * h, hh * h)); c.restore(); }
    }
    if (L.deco === 'rosette') {   // gold fillets and a rosette at each corner and midpoint
      c.strokeStyle = goldGrad(c, 0, 0, Wd, Wd, G); line(k * .06, k * .03); line(k * .3, k * .03);
      const a = o - k * .18, m = Wd / 2, r = k * .085;
      [[a, a], [Wd - a, a], [a, Wd - a], [Wd - a, Wd - a], [m, a], [m, Wd - a], [a, m], [Wd - a, m]].forEach(([x, y]) => {
        c.save(); c.translate(x, y); c.fillStyle = goldGrad(c, -r, -r, r, r, G);
        for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); c.beginPath(); c.ellipse(r * .55, 0, r * .5, r * .2, 0, 0, Math.PI * 2); c.fill(); }
        c.beginPath(); c.arc(0, 0, r * .28, 0, Math.PI * 2); c.fillStyle = '#7a5418'; c.fill(); c.restore(); });
    }
    c.restore();
  }
  function fieldTex(look) {
    const L = LK[look], D = tile(L.dark, SZ(768)), Li = tile(L.light, SZ(512)), Bn = L.band === L.dark ? D : tile(L.band, SZ(768));
    return canvasTex('ckF2-' + look, SZ(2048), SZ(2048), (c0) => later([D, Li, Bn], c0.canvas, (c, Wd) => {
      const k = Wd / IN, rnd = makeNoise(5), o = MG * k, s = k;
      c.drawImage(Bn, 0, 0, Bn.width * .8, Bn.width * .8, 0, 0, Wd, Wd);   // the border (and, for one-sheet boards, the dark squares)
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        const dark = (r + f) % 2 === 1; if (dark && L.dark === L.band && !L.grainTurn && look === 'lacquer') continue;   // (the first board: the dark squares are the burl sheet itself)
        const src = dark ? D : Li, x = o + f * s, y = o + r * s, sw = src.width * (dark ? .32 : .45), ox = rnd(f * 3.1 + (dark ? 9 : 0), r * 2.7, 1) * (src.width - sw), oy = rnd(r * 1.9 + 4, f * 2.3 + (dark ? 5 : 0), 1) * (src.width - sw);
        c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip();
        const turn = L.grainTurn ? (dark ? 0 : 1) : L.rot ? ((f + r) % 4 < 2 ? 1 : 0) : 0;
        if (turn) { c.translate(x + s / 2, y + s / 2); c.rotate(Math.PI / 2); c.translate(-x - s / 2, -y - s / 2); }
        c.drawImage(src, ox, oy, sw, sw, x, y, s, s); c.restore();
      }
      c.strokeStyle = L.joint; c.lineWidth = Math.max(1, k * .008);   // hairline joints
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(o + i * s, o); c.lineTo(o + i * s, o + 8 * s); c.moveTo(o, o + i * s); c.lineTo(o + 8 * s, o + i * s); c.stroke(); }
      if (L.inlay) { c.strokeStyle = L.inlay; c.lineWidth = k * .02; c.strokeRect(o - k * .07, o - k * .07, 8 * s + k * .14, 8 * s + k * .14); }   // a fine pale inlay line
      ornament(c, L, k, Wd);
      const g = c.createRadialGradient(Wd / 2, Wd / 2, Wd * .3, Wd / 2, Wd / 2, Wd * .72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${L.vig})`); c.fillStyle = g; c.fillRect(0, 0, Wd, Wd);
    }));
  }

  /* ---------- the frame: a profile swept round the square (mitred corners) ---------- */
  function sweep(A, prof) {
    const TT = T(), P = [], N = [], UV = [], idx = [], nrm = [], arc = [0];
    for (let i = 0; i < prof.length; i++) {
      let nd = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) { if (a < 0 || b >= prof.length) continue; const dd = prof[b][0] - prof[a][0], dy = prof[b][1] - prof[a][1], L = Math.hypot(dd, dy); if (L < 1e-6) continue; nd += -dy / L; ny += dd / L; }
      const L = Math.hypot(nd, ny) || 1; nrm.push([nd / L, ny / L]);
      if (i) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    }
    const tot = arc[arc.length - 1] || 1;
    [[[0, 0, -1], [1, 0, 0]], [[1, 0, 0], [0, 0, 1]], [[0, 0, 1], [-1, 0, 0]], [[-1, 0, 0], [0, 0, -1]]].forEach(([o, e], si) => {
      const base = P.length / 3;
      prof.forEach(([d, y], i) => {
        const L = A - d, [nd, ny] = nrm[i];
        for (const s of [-L, L]) {
          P.push(o[0] * (A - d) + e[0] * s, y, o[2] * (A - d) + e[2] * s); N.push(-o[0] * nd, ny, -o[2] * nd);
          UV.push((s + A) / (2 * A) * .62 + (si & 1) * .3, arc[i] / tot * .38 + si * .15);   // each side its own part of the sheet
        }
      });
      for (let i = 0; i < prof.length - 1; i++) { if (arc[i + 1] - arc[i] < 1e-6) continue; const a = base + i * 2; idx.push(a, a + 3, a + 1, a, a + 2, a + 3); }
    });
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(UV, 2));
    g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  const H2 = HF + .24, IW = FR - .08;   // the frame's top, its inner wall (from the outside)
  function arcPts(cx, cy, r, a0, a1, n) { const out = []; for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return out; }
  function profileOf(kind) {
    const st = LO() ? 4 : 7;
    if (kind === 'chamfer') return [[0, 0], [0, H2 - .07], [.07, H2], [IW - .05, H2], [IW, H2 - .05], [IW, HF + .002]];
    if (kind === 'ogee') return [[0, 0], [0, H2 - .18], ...arcPts(.07, H2 - .18, .07, Math.PI, Math.PI / 2, st), ...arcPts(.07, H2 - .03, .08, -Math.PI / 2, 0, st), [.17, H2], [IW - .05, H2], ...arcPts(IW - .05, H2 - .05, .05, Math.PI / 2, 0, Math.ceil(st / 2)), [IW, HF + .002]];
    if (kind === 'cushion') return [[0, 0], [0, H2 - .22], ...arcPts(.22, H2 - .22, .22, Math.PI, Math.PI / 2, st + 2), [IW - .06, H2], ...arcPts(IW - .06, H2 - .06, .06, Math.PI / 2, 0, Math.ceil(st / 2)), [IW, HF + .002]];
    if (kind === 'step') return [[0, 0], [0, H2 - .13], [.08, H2 - .13], [.08, H2 - .065], [.16, H2 - .065], [.16, H2], [IW - .03, H2], [IW, H2 - .03], [IW, HF + .002]];
    // round (the first board): a full rounded outer edge, a flat top, a smaller round into the inner wall
    const r1 = .17, r2 = .07, p = [[0, 0], [0, H2 - r1]];
    for (let i = 1; i <= st; i++) { const a = i / st * Math.PI / 2; p.push([r1 - Math.cos(a) * r1, H2 - r1 + Math.sin(a) * r1]); }
    p.push([IW - r2, H2]);
    for (let i = 1; i <= Math.ceil(st / 2); i++) { const a = i / Math.ceil(st / 2) * Math.PI / 2; p.push([IW - r2 + Math.sin(a) * r2, H2 - r2 + Math.cos(a) * r2]); }
    p.push([IW, HF + .002]); return p;
  }
  function sheetMat(key, k, o) {   // a frame material with a texture sheet (wood, marble)
    return mat(key, () => { const TT = T(), t = new TT.CanvasTexture(tile(k, SZ(768))); t.encoding = TT.sRGBEncoding; t.anisotropy = 4; t.wrapS = t.wrapT = TT.RepeatWrapping; return phys(Object.assign({ map: t, color: 0xffffff }, o)); });
  }
  const metalMat = (k, c, r) => mat(k, () => phys({ color: c, metalness: 1, roughness: r, envMapIntensity: 1.4 }));
  const FRAMES = {
    lacquer: () => ({ prof: 'round', m: mat('core', () => phys({ color: 0x0e0e10, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 })) }),
    marble: () => ({ prof: 'chamfer', m: sheetMat('frNero', 'nero', { roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), core: 0x121214, bead: metalMat('brass', 0xd8b064, .22) }),
    tort: () => ({ prof: 'cushion', m: sheetMat('frTort', 'tort', { roughness: .14, clearcoat: 1, clearcoatRoughness: .03 }), core: 0x2a0905, bead: metalMat('gold', 0xe6bd62, .2) }),
    gilt: () => ({ prof: 'ogee', m: metalMat('giltwood', 0xe2b456, .26), core: 0x2a0d06, bead: sheetMat('frMahog', 'mahog', { roughness: .2, clearcoat: 1, clearcoatRoughness: .05 }) }),   // a gilt-wood frame with a mahogany bead
    step: () => ({ prof: 'step', m: mat('core', () => phys({ color: 0x0e0e10, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 })), bead: metalMat('gold', 0xe6bd62, .2) }),
    ormolu: () => ({ prof: 'cushion', m: metalMat('ormolu', 0xd9ae55, .3), core: 0x1a1406, bead: metalMat('gold', 0xe6bd62, .2) }),
  };
  function board(lk) {
    const look = lookOf(lk), L = LK[look], TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const ft = fieldTex(look); ft.anisotropy = 8;
    const top = mat('top-' + look, () => { const m = phys(Object.assign({ map: ft, color: 0xffffff, metalness: 0, envMapIntensity: 1.4 }, L.top));
      if (L.metalLight) {   // the light squares are metal (Boulle's brass): a metalness / roughness map (B: metal, G: roughness)
        const mc = document.createElement('canvas'); mc.width = mc.height = 256; const q = mc.getContext('2d'), k = 256 / IN, o = MG * k;
        q.fillStyle = `rgb(0,${Math.round((L.top.roughness || .12) * 255)},0)`; q.fillRect(0, 0, 256, 256); q.fillStyle = 'rgb(0,60,150)';
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) if ((r + f) % 2 === 0) q.fillRect(o + f * k, o + r * k, k, k);
        const mt = new TT.CanvasTexture(mc); m.metalnessMap = m.roughnessMap = mt; m.metalness = 1; m.roughness = 1;
      }
      Object.assign(m, { stencilWrite: true, stencilRef: 2, stencilFunc: TT.AlwaysStencilFunc, stencilZPass: TT.ReplaceStencilOp }); return m; });   // (no polygon offset: it pushed the far squares in front of the marks drawn just above the field — the glow
                       // was cut off on the far rows, 2026-11-14; the core's top sits a little lower instead)
    const F = FRAMES[L.frame]();
    // the core: a slab under the whole board
    const coreM = F.core != null ? mat('core' + F.core, () => phys({ color: F.core, roughness: .3, clearcoat: .6, clearcoatRoughness: .1 })) : F.m;
    const bt = look === 'lacquer' ? mat('burlTop', () => { const t = new TT.CanvasTexture(tile('burl', SZ(768))); t.encoding = TT.sRGBEncoding; t.anisotropy = 4; return phys({ map: t, color: 0x4a4a50, roughness: .16, clearcoat: 1, clearcoatRoughness: .04 }); }) : coreM;
    const core = new TT.Mesh(new TT.BoxGeometry(OW - .02, HF - .006, OW - .02), [coreM, coreM, bt, coreM, coreM, coreM]); core.position.y = (HF - .006) / 2; core.castShadow = core.receiveShadow = true; base.add(core);
    const A = OW / 2, fr = new TT.Mesh(sweep(A, profileOf(F.prof)), F.m); fr.castShadow = fr.receiveShadow = true; base.add(fr);
    if (F.bead) {   // a fine half-round bead along the frame's inner edge (brass / holly / gilt)
      const n = LO() ? 3 : 5, r = .022, x0 = IW - .045, bp = [[x0 - r, H2 - .001]]; for (let i = 1; i < n; i++) { const a = Math.PI - i / n * Math.PI; bp.push([x0 + Math.cos(a) * r, H2 + Math.sin(a) * r]); } bp.push([x0 + r, H2 - .001]);
      const b = new TT.Mesh(sweep(A, bp), F.bead); b.castShadow = false; b.receiveShadow = true; base.add(b);
    }
    if (F.corners) {   // gilt-bronze corner plates: a small bevelled diamond lying on the flat of the frame's top at each corner
      // (2026-11-14: the L-shaped mounts reached over the cushion's rounded outer edge and looked afloat)
      const d = .32, cg = new TT.CylinderGeometry(.085, .095, .014, 4); cg.rotateY(Math.PI / 4);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const m = new TT.Mesh(cg, F.corners); m.position.set(sx * (A - d), H2 + .007, sz * (A - d)); m.rotation.y = Math.PI / 4; m.castShadow = false; m.receiveShadow = true; base.add(m); });
    }
    const fg = new TT.PlaneGeometry(IN, IN); fg.rotateX(-Math.PI / 2);
    const field = new TT.Mesh(fg, top); field.position.y = HF + .002; field.receiveShadow = true; field.renderOrder = -2; base.add(field);   // drawn first: the reflections test against it
    g.userData.S = S; g.userData.top = HF + .003; g.userData.outer = OW / S; g.userData.look = look;
    g.userData.pt = (x, y) => [-S / 2 + x + .5, -S / 2 + y + .5];   // x: column left → right, y: row far → near
    g.userData.piece = (col, king, o) => piece(col, king, o);
    g.userData.mirror = L.top.clearcoat >= .7;   // (the matt leather does not mirror the pieces)
    return g;
  }

  /* ---------- pieces ---------- */
  const R = .39, PH = .18, geos = {};
  function profile(kind, lo) {
    const base = [[0, 0], [R - .03, 0], [R - .008, .01], [R, .03], [R + .004, PH * .5], [R, PH - .03], [R - .01, PH - .008], [R - .035, PH]];
    if (kind === 'stone') return [[0, 0], [R - .025, 0], [R, .025], [R, PH - .045], [R - .045, PH], [0, PH]];
    if (kind === 'urushi') return [[0, 0], [R - .03, 0], [R - .004, .02], [R, .05], [R, PH - .05], [R - .03, PH - .012], [R * .72, PH + .006], [R * .35, PH + .016], [0, PH + .018]];
    if (kind === 'ebony') return base.concat([[R * .66, PH], [R * .62, PH - .016], [R * .5, PH - .016], [R * .46, PH - .004], [R * .2, PH + .002], [0, PH + .004]]);
    if (lo) return base.concat([[R * .55, PH - .035], [R * .25, PH - .03], [0, PH - .02]]);
    // concentric grooves: ridge, V groove, ridge … each ring a little lower (metal: shallow; catalin: deep carved)
    const p = base.slice(); let r = R - .035, y = PH; const deep = false, n = 4;
    for (let k = 0; k < n; k++) {
      const w = deep ? .075 : .06 - k * .004, dy = deep ? .006 : .012, dd = deep ? .05 : .024;
      p.push([r - w * .35, y - dd * .85], [r - w * .5, y - dd], [r - w * .65, y - dd * .8], [r - w, y - dy]);
      r -= w; y -= dy;
    }
    p.push([r - .015, y - .016], [r * .55, y - .012], [r * .35, y + .012], [r * .12, y + .02], [0, y + .021]);
    return p;
  }
  const GEOK = { metal: 'metal', ebony: 'ebony', stone: 'stone', urushi: 'urushi', rmarble: 'stone', rbmarble: 'stone' };
  function pieceGeo(set, lo) {
    const kind = GEOK[set] || 'metal', key = kind + (lo ? 'lo' : LO() ? 'mid' : 'hi'); if (geos[key]) return geos[key];
    const TT = T(), segs = lo ? 12 : LO() ? 20 : 24;
    let g = new TT.LatheGeometry((X.lp || (a => a))(profile(kind, lo), .002).map(([a, b]) => new TT.Vector2(a, b)), segs);
    if (X.share) X.share(g); return (geos[key] = g);
  }
  function crownGeo() {   // a small open crown: a band with five points
    if (geos.crown) return geos.crown;
    const TT = T(), n = LO() ? 30 : 50, rr = .17, h0 = .055, h1 = .135, P = [], N = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, f = (i / n * 5) % 1, top = h0 + (h1 - h0) * Math.max(0, 1 - Math.abs(f - .5) * 3.2);
      const c = Math.cos(a), s = Math.sin(a);
      P.push(c * rr, 0, s * rr, c * rr, top, s * rr, c * (rr - .02), top, s * (rr - .02), c * (rr - .02), 0, s * (rr - .02));
      N.push(c, 0, s, c, .4, s, -c, .4, -s, -c, 0, -s);
      if (i < n) { const b = i * 4, q = b + 4; idx.push(b, b + 1, q + 1, b, q + 1, q, b + 1, b + 2, q + 2, b + 1, q + 2, q + 1, b + 2, b + 3, q + 3, b + 2, q + 3, q + 2); }
    }
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setIndex(idx);
    if (X.share) X.share(g); return (geos.crown = g);
  }
  function capGeo() { if (geos.cap) return geos.cap; const TT = T(), g = new TT.CircleGeometry(R - .045, LO() ? 16 : 24); g.rotateX(-Math.PI / 2); if (X.share) X.share(g); return (geos.cap = g); }
  function ringGeo() { if (geos.ring) return geos.ring; const TT = T(), g = new TT.RingGeometry(R * .5, R * .62, LO() ? 16 : 24); g.rotateX(-Math.PI / 2); if (X.share) X.share(g); return (geos.ring = g); }
  function rimGeo() { if (geos.rim) return geos.rim; const TT = T(), g = new TT.TorusGeometry(R - .021, .0095, 6, LO() ? 24 : 40); g.rotateX(Math.PI / 2); if (X.share) X.share(g); return (geos.rim = g); }
  function bandGeo() { if (geos.band) return geos.band; const TT = T(), g = new TT.TorusGeometry(R + .002, .011, 5, LO() ? 18 : 26); g.rotateX(Math.PI / 2); if (X.share) X.share(g); return (geos.band = g); }
  // each set: [Black's side, White's side] materials, the crown's metal, the colour of the mirror image
  const PM = {
    metal: { g: () => phys({ color: 0xf0c25e, metalness: 1, roughness: .2, envMapIntensity: 1.4 }), w: () => phys({ color: 0xe6e8ec, metalness: 1, roughness: .16, envMapIntensity: 1.4 }), ref: [0xb88a3a, 0xa9adb3] },
    ebony: { g: () => phys({ color: 0x1c1512, roughness: .32, clearcoat: .7, clearcoatRoughness: .12 }), w: () => phys({ color: 0xeee2c6, roughness: .36, clearcoat: .5, clearcoatRoughness: .15 }), ref: [0x2a201a, 0xcfc2a4], inlay: true, crown: 0xd8b064 },
    stone: { g: () => phys({ color: 0x26262a, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), w: () => phys({ color: 0xece8e1, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), ref: [0x232325, 0xd4d0c8], rim: true, cap: ['neroC', 'calaC'], crown: 0xd8b064 },
    rbmarble: { g: () => phys({ color: 0x26262a, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), w: () => phys({ color: 0x8e1f19, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), ref: [0x232325, 0x6e1a14], rim: true, cap: ['neroC', 'rossoC'], crown: 0xd8b064 },
    urushi: { g: () => phys({ color: 0x121113, roughness: .16, clearcoat: 1, clearcoatRoughness: .03 }), w: () => phys({ color: 0xb2261c, roughness: .18, clearcoat: 1, clearcoatRoughness: .03 }), ref: [0x1a191b, 0x8a2016], band: true, crown: 0xe6bd62 },
    rmarble: { g: () => phys({ color: 0x8e1f19, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), w: () => phys({ color: 0xece8e1, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), ref: [0x6e1a14, 0xd4d0c8], rim: true, cap: ['rossoC', 'calaC'], crown: 0xd8b064 },
  };
  const setOf = s => SETS.includes(s) ? s : pcSet();
  const pMat = (set, col) => mat('p' + set + col, PM[set][col]);
  function capMat(set, col) {
    return mat('cap' + set + col, () => { const TT = T(), t = new TT.CanvasTexture(tile(PM[set].cap[col === 'g' ? 0 : 1], SZ(512))); t.encoding = TT.sRGBEncoding; t.anisotropy = 4; return phys({ map: t, color: 0xffffff, roughness: .1, clearcoat: 1, clearcoatRoughness: .04 }); });
  }
  function refMat(set, col) {   // the mirror image in the glossy field: drawn before the pieces, only behind the field (stencil 2), one layer per pixel
    return mat('r' + set + col, () => { const TT = T(); return new TT.MeshBasicMaterial({ color: lin(PM[set].ref[col === 'g' ? 0 : 1]), opacity: .32, blending: TT.CustomBlending, blendSrc: TT.SrcAlphaFactor, blendDst: TT.OneMinusSrcAlphaFactor, blendSrcAlpha: TT.ZeroFactor, blendDstAlpha: TT.OneFactor,
      depthWrite: false, depthFunc: TT.GreaterDepth, stencilWrite: true, stencilRef: 2, stencilFunc: TT.EqualStencilFunc, stencilZPass: TT.IncrementStencilOp, stencilFail: TT.KeepStencilOp, stencilZFail: TT.KeepStencilOp }); });
  }
  // col 'g' Black's side / 'w' White's side; king: two stacked with a crown; o.reflect: a mirror image under it (PC); set: the chosen one by default
  function piece(col, king, o = {}, set0) {
    const set = setOf(set0 || o.set), TT = T(), g = new TT.Group(), m = pMat(set, col), n = king ? 2 : 1, D = PM[set];
    const add = (geo, mt, y, par = g) => { const x = new TT.Mesh(geo, mt); x.position.y = y; x.castShadow = true; x.receiveShadow = true; par.add(x); return x; };
    for (let k = 0; k < n; k++) {
      const y0 = k * (PH + .004), p = add(pieceGeo(set, false), m, y0); p.rotation.y = k * .7;
      if (D.cap) { const c = add(capGeo(), capMat(set, col), y0 + PH + .001); c.rotation.y = k * 1.3 + (col === 'g' ? .4 : 2.1); c.castShadow = false; }
      if (D.inlay && k === n - 1) { const r = add(ringGeo(), pMat(set, col === 'g' ? 'w' : 'g'), y0 + PH - .0155); r.castShadow = false; }
      if (D.band) { const b = add(bandGeo(), metalMat('gold', 0xe6bd62, .2), y0 + PH * .5); b.castShadow = false; }
      if (D.rim) { const b = add(rimGeo(), metalMat('brass', 0xd8b064, .22), y0 + PH - .021); b.castShadow = false; }   // (a brass ring round the top's edge: the black marble discs read on black squares, 2026-11-14)
    }
    if (king) add(crownGeo(), D.crown ? metalMat('crown' + D.crown, D.crown, .2) : m, n * (PH + .004) - .03 + (set === 'urushi' ? .02 : 0));
    g.userData = { col, king: !!king, h: n * PH, set };
    if (o.reflect && !LO() && o.mirror !== false) {
      const r = new TT.Group(); r.scale.y = -1; r.userData.reflection = true; g.add(r);
      for (let k = 0; k < n; k++) { const x = add(pieceGeo(set, true), refMat(set, col), k * (PH + .004), r); x.castShadow = x.receiveShadow = false; x.renderOrder = -1; }
    }
    return g;
  }

  /* ---------- words: the texts say 黒 / 白 (or, the rules tour, 金 / 銀); recolor() puts the chosen set's colours in their place ---------- */
  // per language and set: [Black's side, White's side]; the shape of each entry follows the language's grammar (see conv below)
  const IV = w => ({ i: w });
  const TG = {
    ja: { metal: ['金', '銀'], ebony: ['黒檀', '象牙'], stone: ['黒', '白'], rbmarble: ['黒', '赤'], urushi: ['黒', '朱'], rmarble: ['赤', '白'] },
    zh: { metal: ['金', '银'], ebony: ['乌木', '象牙'], stone: ['黑', '白'], rbmarble: ['黑', '红'], urushi: ['黑', '朱红'], rmarble: ['红', '白'] },
    'zh-TW': { metal: ['金', '銀'], ebony: ['烏木', '象牙'], stone: ['黑', '白'], rbmarble: ['黑', '紅'], urushi: ['黑', '朱紅'], rmarble: ['紅', '白'] },
    ko: { metal: ['금', '은'], ebony: ['흑단', '상아'], stone: ['흑', '백'], rbmarble: ['흑', '빨강'], urushi: ['흑', '주홍'], rmarble: ['빨강', '백'] },
    en: { metal: ['gold', 'silver'], ebony: ['ebony', 'ivory'], stone: ['black', 'white'], rbmarble: ['black', 'red'], urushi: ['black', 'vermilion'], rmarble: ['red', 'white'] },
    id: { metal: ['emas', 'perak'], ebony: ['eboni', 'gading'], stone: ['hitam', 'putih'], rbmarble: ['hitam', 'merah'], urushi: ['hitam', 'merah kirmizi'], rmarble: ['merah', 'putih'] },
    tr: { metal: ['altın', 'gümüş'], ebony: ['abanoz', 'fildişi'], stone: ['siyah', 'beyaz'], rbmarble: ['siyah', 'kırmızı'], urushi: ['siyah', 'vermilyon'], rmarble: ['kırmızı', 'beyaz'] },
    // es / pt: { s: stem + o|a|os|as } · { e: word ending in -e, + s in the plural } · { i: invariant }
    es: { metal: [{ s: 'dorad' }, { s: 'platead' }], ebony: [IV('de ébano'), IV('de marfil')], stone: [{ s: 'negr' }, { s: 'blanc' }], rbmarble: [{ s: 'negr' }, { s: 'roj' }], urushi: [{ s: 'negr' }, IV('bermellón')], rmarble: [{ s: 'roj' }, { s: 'blanc' }] },
    pt: { metal: [{ s: 'dourad' }, { s: 'pratead' }], ebony: [IV('de ébano'), IV('de marfim')], stone: [{ s: 'pret' }, { s: 'branc' }], rbmarble: [{ s: 'pret' }, { s: 'vermelh' }], urushi: [{ s: 'pret' }, IV('vermelhão')], rmarble: [{ s: 'vermelh' }, { s: 'branc' }] },
    // fr: { m, f } (+ s in the plural) · { i }
    fr: { metal: [{ m: 'doré', f: 'dorée' }, { m: 'argenté', f: 'argentée' }], ebony: [IV('d’ébène'), IV('d’ivoire')], stone: [{ m: 'noir', f: 'noire' }, { m: 'blanc', f: 'blanche' }], rbmarble: [{ m: 'noir', f: 'noire' }, { m: 'rouge', f: 'rouge' }], urushi: [{ m: 'noir', f: 'noire' }, IV('vermillon')], rmarble: [{ m: 'rouge', f: 'rouge' }, { m: 'blanc', f: 'blanche' }] },
    // de: { a: adjective stem (+ the source's ending), n: noun }
    de: { metal: [{ a: 'golden', n: 'Gold' }, { a: 'silbern', n: 'Silber' }], ebony: [{ a: 'ebenholzfarben', n: 'Ebenholz' }, { a: 'elfenbeinfarben', n: 'Elfenbein' }], stone: [{ a: 'schwarz', n: 'Schwarz' }, { a: 'weiß', n: 'Weiß' }], rbmarble: [{ a: 'schwarz', n: 'Schwarz' }, { a: 'rot', n: 'Rot' }], urushi: [{ a: 'schwarz', n: 'Schwarz' }, { a: 'zinnoberrot', n: 'Zinnober' }], rmarble: [{ a: 'rot', n: 'Rot' }, { a: 'weiß', n: 'Weiß' }] },
    // ru: adjective stems (the source's ending is kept: all hard stems)
    ru: { metal: ['золот', 'серебрян'], ebony: ['эбенов', 'костян'], stone: ['чёрн', 'бел'], rbmarble: ['чёрн', 'красн'], urushi: ['чёрн', 'киноварн'], rmarble: ['красн', 'бел'] },
    // ar: { m, f }
    ar: { metal: [{ m: 'ذهبي', f: 'ذهبية' }, { m: 'فضي', f: 'فضية' }], ebony: [{ m: 'أبنوسي', f: 'أبنوسية' }, { m: 'عاجي', f: 'عاجية' }], stone: [{ m: 'أسود', f: 'سوداء' }, { m: 'أبيض', f: 'بيضاء' }], rbmarble: [{ m: 'أسود', f: 'سوداء' }, { m: 'أحمر', f: 'حمراء' }], urushi: [{ m: 'أسود', f: 'سوداء' }, { m: 'قرمزي', f: 'قرمزية' }], rmarble: [{ m: 'أحمر', f: 'حمراء' }, { m: 'أبيض', f: 'بيضاء' }] },
    // hi: a word ending in ा takes the source's ा / ी / े
    hi: { metal: ['सुनहरा', 'चाँदी'], ebony: ['आबनूसी', 'हाथीदाँत'], stone: ['काला', 'सफ़ेद'], rbmarble: ['काला', 'लाल'], urushi: ['काला', 'सिंदूरी'], rmarble: ['लाल', 'सफ़ेद'] },
  };
  const cap = (w, like) => like && like[0] !== like[0].toLowerCase() && !/^(d’|de )/.test(w) ? w.charAt(0).toLocaleUpperCase(like.startsWith('İ') || like.startsWith('I') ? 'tr' : undefined) + w.slice(1) : w;
  const tgOf = (lang, set) => (TG[lang] || TG.en)[setOf(set)];
  const lng = l => TG[l] ? l : /^zh-(tw|hk|mo|hant)/i.test(l || '') ? 'zh-TW' : TG[String(l || '').slice(0, 2)] ? String(l).slice(0, 2) : 'en';
  // the Korean particle after a word with / without a final consonant
  const batchim = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const KP = { 이: '가', 가: '이', 은: '는', 는: '은', 을: '를', 를: '을', 과: '와', 와: '과' };
  const koP = (w, p) => !p || !KP[p] ? p || '' : (batchim(w) ? ({ 가: '이', 는: '은', 를: '을', 와: '과' })[p] || p : ({ 이: '가', 은: '는', 을: '를', 과: '와' })[p] || p);
  // Turkish suffixes follow the new word's vowels
  const trH = (w, suf) => { if (!suf) return ''; if (/[aeıioöuü]$/.test(w) && /^[aeıioöuü]/.test(suf)) suf = (/^[ıiuü]n/.test(suf) ? 'n' : 'y') + suf; let lv = (w.match(/[aeıioöuü](?=[^aeıioöuü]*$)/) || ['e'])[0]; return suf.replace(/[aeıiuü]/g, v => { const back = /[aıou]/.test(lv), rnd = /[oöuü]/.test(lv); const r = /[ae]/.test(v) ? (back ? 'a' : 'e') : back ? (rnd ? 'u' : 'ı') : (rnd ? 'ü' : 'i'); lv = r; return r; }); };
  const L = (re, f) => [re, f];
  // per language: the source words (bw: Black / White, metal: gold / silver) → f(match…) given T = [Black's target, White's target]
  const SRC = {
    ja: { bw: [L(/(?<![面空明告余潔紅])([黒白])(番|い|く)?(?![熱紙])/g, (T, m, c, x) => { const w = T[c === '黒' ? 0 : 1]; return w === c ? m : w + (x === '番' ? 'の番' : x ? 'の' : ''); })], metal: [L(/[金銀]/g, (T, m) => T[m === '金' ? 0 : 1])] },
    zh: { bw: [L(/(?<![明空坦告洁])([黑白])/g, (T, m, c) => T[c === '黑' ? 0 : 1])], metal: [L(/[金银]/g, (T, m) => T[m === '金' ? 0 : 1])] },
    'zh-TW': { bw: [L(/(?<![明空坦告潔])([黑白])/g, (T, m, c) => T[c === '黑' ? 0 : 1])], metal: [L(/[金銀]/g, (T, m) => T[m === '金' ? 0 : 1])] },
    ko: { bw: [L(/(?<![가-힣])([흑백])(이|가|은|는|을|를|과|와)?/g, (T, m, c, p) => { const w = T[c === '흑' ? 0 : 1]; return w + koP(w, p); })], metal: [L(/(금|은)색/g, (T, m, c) => T[c === '금' ? 0 : 1] + '색'), L(/금(?=\()/g, T => T[0])] },
    en: { bw: [L(/\b(Black|White|black|white)\b/g, (T, m) => cap(T[/^b/i.test(m) ? 0 : 1], m))], metal: [L(/\b(Gold|Silver|gold|silver)\b/g, (T, m) => cap(T[/^g/i.test(m) ? 0 : 1], m))] },
    id: { bw: [L(/\b(Hitam|Putih|hitam|putih)\b/g, (T, m) => cap(T[/^h/i.test(m) ? 0 : 1], m))], metal: [L(/\b(Emas|Perak|emas|perak)\b/g, (T, m) => cap(T[/^e/i.test(m) ? 0 : 1], m))] },
    tr: { bw: [L(/(?<![\p{L}])(Siyah|siyah|Beyaz|beyaz)(\p{L}*)/gu, (T, m, c, s) => { const w = T[/^s/i.test(c) ? 0 : 1]; return cap(w, c) + trH(w, s); })], metal: [L(/(?<![\p{L}])(Altın|altın|Gümüş|gümüş)(\p{L}*)/gu, (T, m, c, s) => { const w = T[/^a/i.test(c) ? 0 : 1]; return cap(w, c) + trH(w, s); })] },
    es: { bw: [L(/(?<![\p{L}])([Nn]egr|[Bb]lanc)(o|a|os|as)(?![\p{L}])/gu, (T, m, c, e) => cap(esW(T[/^n/i.test(c) ? 0 : 1], e), c))], metal: [L(/(?<![\p{L}])([Dd]orad|[Pp]latead)(o|a|os|as)(?![\p{L}])/gu, (T, m, c, e) => cap(esW(T[/^d/i.test(c) ? 0 : 1], e), c))] },
    pt: { bw: [L(/(?<![\p{L}])([Pp]ret|[Bb]ranc)(o|a|os|as)(?![\p{L}])/gu, (T, m, c, e) => cap(esW(T[/^p/i.test(c) ? 0 : 1], e), c))], metal: [L(/(?<![\p{L}])([Dd]ourad|[Pp]ratead)(o|a|os|as)(?![\p{L}])/gu, (T, m, c, e) => cap(esW(T[/^d/i.test(c) ? 0 : 1], e), c))] },
    fr: { bw: [L(/(?<![\p{L}])([Nn]oir|[Bb]lanch|[Bb]lanc)(e?)(s?)(?![\p{L}])/gu, (T, m, c, e, pl) => cap(frW(T[/^n/i.test(c) ? 0 : 1], !!e || /h$/.test(c), !!pl), c))],
      metal: [L(/(?<![\p{L}])(l’)?([Dd]or|[Aa]rgent)é(e?)(s?)(?![\p{L}])/gu, (T, m, l, c, e, pl) => { const w = cap(frW(T[/^d/i.test(c) ? 0 : 1], !!e, !!pl), c); return (l ? (/^[aeéèiouyh]/i.test(w) ? 'l’' : e ? 'la ' : 'le ') : '') + w; }), L(/(?<![\p{L}])l’argent(?![\p{L}])/gu, T => 'les ' + frW(T[1], true, true))] },
    de: { bw: [L(/(?<![\p{L}])(schwarz|weiß)(e[mnrs]?)?(?![\p{L}])/gu, (T, m, c, e) => T[c === 'schwarz' ? 0 : 1].a + (e || '')), L(/(?<![\p{L}])(Schwarz|Weiß)(?![\p{L}])/gu, (T, m) => T[m === 'Schwarz' ? 0 : 1].n)],
      metal: [L(/(?<![\p{L}])(golden|silbern)(e[mnrs]?)(?![\p{L}])/gu, (T, m, c, e) => T[c === 'golden' ? 0 : 1].a + e), L(/(?<![\p{L}])(Gold|Silber)(?![\p{L}])/gu, (T, m) => T[m === 'Gold' ? 0 : 1].n)] },
    ru: { bw: [L(/(?<![А-Яа-яЁё])([Чч][её]рн|[Бб]ел)(?=[а-яё])/g, (T, m) => cap(T[/^ч/i.test(m) ? 0 : 1], m))], metal: [L(/(?<![А-Яа-яЁё])([Зз]олот|[Сс]еребрян)(?=[а-яё])/g, (T, m) => cap(T[/^з/i.test(m) ? 0 : 1], m))] },
    ar: { bw: [L(/(ال)?(أسود|سوداء|أبيض|بيضاء)/g, (T, m, al, c) => (al || '') + T[/^(أسود|سوداء)$/.test(c) ? 0 : 1][/ء$/.test(c) ? 'f' : 'm'])],
      metal: [L(/(ال)?(ذهبي|فضي)(ة|ًا)?/g, (T, m, al, c, e) => { const t = T[c === 'ذهبي' ? 0 : 1]; return (al || '') + (e === 'ة' ? t.f : t.m + (e && /ي$/.test(t.m) ? e : '')); })] },
    hi: { bw: [L(/(काल)(ा|ी|े)|(सफ़ेद|सफेद)/g, (T, m, k, e, w) => hiW(T[k ? 0 : 1], e))], metal: [L(/(सुनहर)(ा|ी|े)|(चाँदी|चांदी)/g, (T, m, k, e, w) => hiW(T[k ? 0 : 1], e))] },
  };
  function esW(t, e) { if (t.i) return t.i; if (t.e) return t.e + (/s$/.test(e) ? 's' : ''); return t.s + e; }
  function frW(t, f, pl) { if (t.i) return t.i; const w = f ? t.f : t.m; return pl && !/[sx]$/.test(w) ? w + 's' : w; }
  function hiW(t, e) { return e && /ा$/.test(t) ? t.slice(0, -1) + e : t; }
  // html: tags are left alone (only the text between them changes); from 'bw' (the default) or 'metal'
  function recolor(html, lang, set, from) {
    if (typeof html !== 'string' || !html) return html;
    const l = lng(lang), S = setOf(set), fr = from === 'metal' ? 'metal' : 'bw';
    if ((fr === 'bw' && S === 'stone') || (fr === 'metal' && S === 'metal')) return html;
    const T = tgOf(l, S), R = (SRC[l] || SRC.en)[fr];
    return html.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, tx) => tag || R.reduce((s, [re, f]) => s.replace(re, (...a) => f(T, ...a.slice(0, -2))), tx));
  }
  const side = (col, lang, set) => { const w = tgOf(lng(lang), set)[col === 'g' || col === 1 ? 0 : 1]; return typeof w === 'string' ? w : w.i || w.n || w.m || (w.s ? w.s + 'o' : w.e) || ''; };
  const SW = { metal: ['#fff1c2,#e8b64e 45%,#8a6418', '#fff,#d6d9de 45%,#7c8189'], ebony: ['#6a5446,#2a1d17 45%,#0d0907', '#fffaf0,#efe3c8 45%,#b9a888'],
    stone: ['#8a8a8e,#2a2a2e 45%,#0b0b0c', '#ffffff,#eeebe5 45%,#b4aea4'], rbmarble: ['#8a8a8e,#2a2a2e 45%,#0b0b0c', '#ff9a8a,#b2261e 45%,#5a0d09'],
    urushi: ['#6b6b70,#1a191b 45%,#050505', '#ff9b86,#c8301f 45%,#6e120b'], rmarble: ['#ff9a8a,#b2261e 45%,#5a0d09', '#ffffff,#eeebe5 45%,#b4aea4'] };
  const swatch = (col, set) => `radial-gradient(circle at 35% 30%,${SW[setOf(set)][col === 'g' || col === 1 ? 0 : 1]})`;
  const tone = (col, set) => SW[setOf(set)][col === 'g' || col === 1 ? 0 : 1].split(',').map(x => x.trim().split(' ')[0]);   // [light, mid, dark]

  X.MODELS.checkers = function (live, look) {
    const g = board(look), Y = g.userData.top, mir = g.userData.mirror;
    if (live) return g;
    // a game in progress: White's side from the far side, Black's from the near side, a king each
    const put = (x, y, col, king) => {
      const p = piece(col, king, { reflect: mir }), [px, pz] = g.userData.pt(x, y); p.position.set(px, Y, pz); g.add(p);
      const sh = X.contact(R * .92, .55); sh.position.set(px, Y + .001, pz); g.add(sh);
    };
    [[1, 0], [5, 0], [0, 1], [2, 1], [4, 1], [6, 1], [1, 2], [3, 2], [7, 2], [2, 3]].forEach(([x, y]) => put(x, y, 'w'));
    [[4, 3], [3, 4], [7, 4], [0, 5], [2, 5], [4, 5], [6, 5], [1, 6], [5, 6], [0, 7], [6, 7]].forEach(([x, y]) => put(x, y, 'g'));
    put(7, 0, 'g', true); put(1, 4, 'w', true);
    g.scale.setScalar(.97);   // about the other boards' size on the chabudai
    return g;
  };
  // the squares' colours of each look for flat pictures (the full game's small boards while its 3D board is shown): [dark, light]
  const MINI = { lacquer: ['#3a3a3e', '#e6dfcc'], marble: ['#1e1e20', '#9a2a22'], boulle: ['#5a1a0a', '#d9b25a'], leather: ['#1d4532', '#ece0c2'], deco: ['#3a2616', '#efe3c9'], lapis: ['#1d3a9a', '#f3eee3'] };
  const mini = lk => MINI[lookOf(lk)];
  X.checkers = { board, piece, S, OW, R, LOOKS, SETS, pcSet, side, swatch, tone, recolor, mini };
})();
