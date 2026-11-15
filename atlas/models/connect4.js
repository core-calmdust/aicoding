/* =====================================================================
   Connect Four on the 3D table — a leather & walnut "tile tower":
     • a soft-cornered tray of deep teal pebble leather with cream saddle
       stitching round the rim and the walls; suede floor
     • a walnut spine across the tray; eight dark-bronze rails rise from brass
       ferrules, open at the top (small brass tips) so tiles drop in from above;
       seven brass column studs on the spine's front — the 7 × 6 grid reads at a glance
     • the counters are rounded-square tiles: a walnut frame with a leather
       inlay on both faces, saffron gold or pearl white (the game's gold /
       silver), stacking between the rails; spare tiles rest in the tray
   Everything is procedural (canvas textures, extrusions, rounded boxes).
   Registers into Table3D:
     Table3D.MODELS.connect4(live)   the stand (+ a mid-game position and spare tiles unless live)
        userData: { viewY, cell(c, r) → [x, y] (c 0…6 left → right, r 0…5 bottom → top), tile(color 'gold'|'pearl') → Mesh }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

  /* ---------- dimensions (board units; scaled to the chabudai at the end) ---------- */
  const PX = 1.0, PY = .89, TW = .86, TD = .26;      // column pitch, row pitch, tile size and thickness
  const TW_ = 9.6, TDp = 4.6, TR = 1.15, WALL = .22, TH = .78, FL = .14;   // tray: width, depth, corner radius, wall, height, floor
  const SP_H = .58, SP_D = .62;                       // spine top, depth
  const Y0 = SP_H + .012;                             // bottom of the first row
  const RAIL = .13, YTOP = Y0 + 6 * PY + .3;          // rail section, rail top
  const SCALE = .95;
  const colX = c => (c - 3) * PX, rowY = r => Y0 + r * PY + TW / 2;

  /* ---------- textures ---------- */
  const TX = {};
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(key, c, o = {}) {
    if (TX[key]) return TX[key];
    const TT = T(), t = new TT.CanvasTexture(c); t.anisotropy = 8; t.encoding = TT.sRGBEncoding;
    if (o.wrap) t.wrapS = t.wrapT = TT.RepeatWrapping;
    if (o.rep) t.repeat.set(o.rep[0], o.rep[1]); if (o.off) t.offset.set(o.off[0], o.off[1]);
    return (TX[key] = t);
  }
  // pebble grain height tile (seamless cellular noise, 128 = flat)
  let pebC = null;
  function pebble() {
    if (pebC) return pebC;
    const N0 = 256, GN = 22, c = cv(N0, N0), g = c.getContext('2d'), img = g.createImageData(N0, N0), d = img.data, N = makeNoise(13);
    let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const P = new Float32Array(GN * GN * 2); for (let i = 0; i < GN * GN * 2; i++) P[i] = .15 + rnd() * .7;
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) {
      const gx = x / N0 * GN, gy = y / N0 * GN, cx = Math.floor(gx), cy = Math.floor(gy);
      let f1 = 9, f2 = 9;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const X0 = cx + i, Y0_ = cy + j, ci = ((Y0_ % GN + GN) % GN) * GN + ((X0 % GN + GN) % GN);
        const dx = X0 + P[ci * 2] - gx, dy = Y0_ + P[ci * 2 + 1] - gy, dd = dx * dx + dy * dy;
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1);
      let h = 122 + (1 - Math.min(1, Math.sqrt(f1) * 1.3)) * 40 + (N(x / 30, y / 30, 2) - .5) * 26;
      if (e < .12) h -= (1 - e / .12) * 70;
      const i = (y * N0 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, h)); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (pebC = c);
  }
  // fill a canvas (or the current clip) with a leather colour and the pebble grain over it
  function leatherFill(g, w, h, col, amt, sc) {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    const p = g.createPattern(pebble(), 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(sc));
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = amt; g.fillStyle = p; g.fillRect(0, 0, w, h); g.restore();
  }
  const stitch = (g, lw, dash, gap, col = 'rgba(238,226,200,.92)') => { g.setLineDash([dash, gap]); g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = col; };
  function rrPath(g, x0, y0, x1, y1, r) { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); }
  const LEATHER = '#1e4e4a', SUEDE = '#143936';
  // tray rim (the extrusion's caps carry world x / y as UVs → one canvas over the whole footprint)
  function trayTop() {
    const k = SZ(200), w = Math.round(TW_ * k), h = Math.round(TDp * k), c = cv(w, h), g = c.getContext('2d');
    leatherFill(g, w, h, LEATHER, .55, k / 256 * .9);
    const ins = (WALL / 2) * k; rrPath(g, ins, ins, w - ins, h - ins, (TR - WALL / 2) * k); stitch(g, .022 * k, .07 * k, .05 * k); g.stroke();
    return tex('c4TrayTop' + k, c, { rep: [1 / TW_, 1 / TDp], off: [.5, .5] });
  }
  // tray walls (side UVs: u = world x or y, v = 1 − extrusion depth) → a 1 × 1 unit tile with stitch rows near the top and the bottom
  function traySide() {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d');
    leatherFill(g, k, k, LEATHER, .55, k / 256 * .9);
    const row = z => { const t = (((1 - z) % 1) + 1) % 1, y = (1 - t) * k; g.beginPath(); g.moveTo(-k * .1, y); g.lineTo(k * 1.1, y); g.stroke(); };
    stitch(g, .022 * k, .07 * k, .05 * k); row(TH - .1); row(.09);
    return tex('c4TraySide' + k, c, { wrap: true });
  }
  function suede() {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d'), img = g.createImageData(k, k), d = img.data, N = makeNoise(3), A = hexRGB(SUEDE);
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) { const n = (Math.random() - .5) * 16 + (N(x / 2, y / 2, 2) - .5) * 14 + (N(x / 30, y / 30, 2) - .5) * 12, i = (y * k + x) * 4; d[i] = A[0] + n; d[i + 1] = A[1] + n; d[i + 2] = A[2] + n; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return tex('c4Suede' + k, c, { wrap: true, rep: [.5, .5] });
  }
  // walnut: warm brown with darker streaks, fibres along x, seamless
  function KL(X) {
    const makeNoise = X.makeNoise;
    const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    return {
      // walnut: warm brown with darker streaks, fibres along x, seamless
      walnut(d, k) {
        const N = makeNoise(17), A = hexRGB('#8a5a34'), B = hexRGB('#3a2112');
        const val = (u, v) => {
          const warp = N(u * 1.5 + 3, v * 3 + 3, 3) * 2.4, ring = Math.sin((v * 5 + warp) * Math.PI * 2) * .5 + .5, fib = N(u * 5 + 3, v * 140 + 3, 2);
          return .2 + Math.pow(ring, 3) * .45 + (fib - .5) * .45 + (N(u * 80, v * 420, 1) > .84 ? .14 : 0);
        };
        for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) {
          const u = x / k, v = y / k, t = Math.max(0, Math.min(1, val(u, v) * (1 - u) + val(u - 1, v) * u)), i = (y * k + x) * 4;
          d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
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
  function walnut(key, rep) {
    const k = SZ(512), name = 'c4Wal' + key + k; if (TX[name]) return TX[name];
    const base = 'c4WalC' + k;
    if (!TX[base + 'c']) {
      const c = cv(k, k); paint(c, 'walnut'); TX[base + 'c'] = c;
    }
    return tex(name, TX[base + 'c'], { wrap: true, rep });
  }
  function inlayTex(col) {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d');
    leatherFill(g, k, k, col, col === 'gold' ? .5 : .42, k / 256 * 1.6);
    return tex('c4Inlay' + col + k, c, { wrap: true, rep: [1.4, 1.4] });
  }

  /* ---------- the six stands and six tile sets (2026-11-15): the tower's shape kept, each look its own world ----------
     leather 革と胡桃 (default, procedural) · steam 銅と真鍮 (riveted copper, iron spine, copper-pipe rails) · ice 氷と水晶 (frosted ice, snow,
     icicle-clear rails) · tansu 欅と黒鉄 (zelkova chest, black iron fittings, tatami) · pueblo 砂岩とトルコ石 (layered sandstone, turquoise,
     silver) · diner 50年代ダイナー (tufted red vinyl, a check floor, chrome).  Pictures: atlas/tools/c4-tex.py → images/atlas/c43d/.
     Tiles: inlay 革の象嵌 (default) · coin 金貨と銀貨 · crystal シトリンと水晶 · lacquer 金箔と螺鈿 · chip ダイナーのチップ · sun 太陽と月. */
  const LOOKS = ['leather', 'steam', 'ice', 'tansu', 'pueblo', 'diner'], SETS = ['inlay', 'coin', 'crystal', 'lacquer', 'chip', 'sun'];
  const lsg = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const curLook = () => { const v = lsg('atlas-connect4-look'); return LOOKS.includes(v) ? v : 'leather'; };
  const curSet = () => { const v = lsg('atlas-connect4-pc3'); return SETS.includes(v) ? v : 'inlay'; };
  const C3 = (() => { try { return new URL('../../images/atlas/c43d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/c43d/'; } })(), C3V = '?v=1', c3img = {};
  function c3(name, rep, srgb = true) { const key = name + (rep ? rep.join(',') : ''); if (c3img[key]) return c3img[key];
    const TT = T(), t = new TT.TextureLoader().load(C3 + name + (X.coarse || X.lite ? '-h' : '') + '.webp' + C3V, () => { if (X.kick) X.kick(300); });
    if (srgb) t.encoding = TT.sRGBEncoding; t.anisotropy = 8; t.wrapS = t.wrapT = TT.RepeatWrapping; if (rep) t.repeat.set(rep[0], rep[1]); return (c3img[key] = t); }
  const LSPEC = {
    steam: { tray: { roughness: 1, metalness: 1, bump: .004 }, floor: { roughness: 1, metalness: 1, bump: .003 }, spine: { roughness: 1, metalness: .55, bump: .002 },
      rail: [0xc4703c, .28], fit: [0xd8a850, .2] },
    ice: { tray: { roughness: 1, bump: .004, clearcoat: 1, glow: .12 }, floor: { roughness: 1, bump: .006 }, spine: { roughness: 1, clearcoat: 1, glow: .1 },
      rail: [0xd8eef8, .08, true], fit: [0xbfe4f4, .12] },
    tansu: { tray: { roughness: 1, bump: .003, clearcoat: .4 }, floor: { roughness: 1, bump: .004 }, spine: { roughness: 1, metalness: .4, bump: .003 },
      rail: [0x4a3a2a, .35], fit: [0x2a2826, .4] },
    pueblo: { tray: { roughness: 1, bump: .006 }, floor: { roughness: 1, bump: .005 }, spine: { roughness: 1, bump: .005 },
      rail: [0xd8dce0, .22], fit: [0x3ab4aa, .3, false, true] },
    diner: { tray: { roughness: 1, bump: .008, clearcoat: .7 }, floor: { roughness: 1, bump: .002, clearcoat: .5 }, spine: { roughness: 1, metalness: 1 },
      rail: [0xe8ecf0, .1], fit: [0xf2f4f6, .08] },
  };
  const LM = {};
  function lookMats(look, base) {
    if (look === 'leather' || !LSPEC[look]) return base;
    if (LM[look]) return LM[look];
    const TT = T(), L = LSPEC[look], C = c => new TT.Color(c).convertSRGBToLinear();
    const pic = (kind, o, rep) => { const m = X.M({ map: c3(kind + '-' + look, rep), bump: false, roughness: o.roughness, metalness: o.metalness || 0, color: 0xffffff });
      const mm = c3(kind + '-' + look + '-m', rep, false); m.roughnessMap = mm; if (o.metalness) m.metalnessMap = mm; if (o.bump) { m.bumpMap = mm; m.bumpScale = o.bump; }
      if (o.clearcoat) { m.clearcoat = o.clearcoat; m.clearcoatRoughness = .12; } if (o.glow) { m.emissive = new TT.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = o.glow; } return m; };
    const metal = ([c, r, glass, stone]) => { if (glass) { const m = X.M({ color: c, roughness: r, metalness: 0, clearcoat: 1, clearcoatRoughness: .04, bump: false }); m.transparent = true; m.opacity = .78; return m; }
      if (stone) return X.M({ color: c, roughness: r, metalness: 0, clearcoat: .6, clearcoatRoughness: .2, bump: false });
      const m = X.lite ? new TT.MeshStandardMaterial({ color: C(c), metalness: 1, roughness: r + .04 }) : new TT.MeshPhysicalMaterial({ color: C(c), metalness: 1, roughness: r, clearcoat: .3, clearcoatRoughness: .2 }); return m; };
    const tray = pic('tray', L.tray, [.42, .42]);
    return (LM[look] = Object.assign({}, base, { top: tray, side: pic('tray', L.tray, [.42, .42]), suede: pic('floor', L.floor, [.36, .36]), walnut: pic('spine', L.spine, [.6, .6]), bronze: metal(L.rail), brass: metal(L.fit) }));
  }
  // the tile sets: frame + face materials, or a shape of their own (coin / chip: round)
  const SM = {};
  function canvasTex(key, w, h, draw) { if (TX[key]) return TX[key]; const c = cv(w, h); draw(c.getContext('2d'), w, h); return tex(key, c); }
  function setMats(set, base) {
    if (set === 'inlay' || !SETS.includes(set)) return { frame: base.walnutT, gold: base.gold, pearl: base.pearl };
    if (SM[set]) return SM[set];
    const TT = T(), C = c => new TT.Color(c).convertSRGBToLinear(), lite = X.lite;
    const phys = o => lite ? new TT.MeshStandardMaterial(o) : new TT.MeshPhysicalMaterial(o);
    let o;
    if (set === 'coin') {
      const face = (col, a, b) => canvasTex('c4coin' + col, 256, 256, (g, w) => { const gr = g.createRadialGradient(w * .4, w * .38, 4, w / 2, w / 2, w * .5); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w * .4, 0, 7); g.stroke(); g.font = `bold ${w * .34}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(0,0,0,.22)'; g.fillText('4', w / 2 + 3, w / 2 + 4); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('4', w / 2, w / 2); });
      o = { gold: phys({ map: face('g', '#ffe39a', '#c08a2a'), metalness: 1, roughness: .26 }), pearl: phys({ map: face('s', '#ffffff', '#a8b0b8'), metalness: 1, roughness: .24 }) };
      o.goldE = phys({ color: C(0xc89a3a), metalness: 1, roughness: .32 }); o.pearlE = phys({ color: C(0xb8c0c8), metalness: 1, roughness: .3 });
    } else if (set === 'crystal') {
      o = { gold: phys({ color: C(0xf2b030), roughness: .04, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .86, emissive: C(0x5a3204) }),
        pearl: phys({ color: C(0xe8f2ff), roughness: .04, metalness: 0, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .72, emissive: C(0x203040) }) };
      if (!lite) { o.gold.sheen = 1; o.pearl.sheen = 1; o.pearl.sheenColor = C(0xbfe8ff); }
    } else if (set === 'lacquer') {
      const leaf = canvasTex('c4leaf', 256, 256, (g, w) => { g.fillStyle = '#d8a83a'; g.fillRect(0, 0, w, w); for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = `rgba(${255 - (i * 7 + j * 13) % 40},${210 - (i * 11 + j * 5) % 50},${90 + (i + j) % 30},.5)`; g.fillRect(i * w / 6 + 1, j * w / 6 + 1, w / 6 - 2, w / 6 - 2); } });
      const raden = canvasTex('c4raden', 256, 256, (g, w) => { const gr = g.createLinearGradient(0, 0, w, w); ['#f6f2ff', '#bfe6f0', '#f0d0f4', '#d8f4e0', '#f8f0d8'].forEach((c, i) => gr.addColorStop(i / 4, c)); g.fillStyle = gr; g.fillRect(0, 0, w, w);
        g.strokeStyle = 'rgba(80,90,140,.25)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); g.moveTo(Math.random() * w, Math.random() * w); g.lineTo(Math.random() * w, Math.random() * w); g.stroke(); } });
      o = { frame: phys({ color: C(0x120a08), roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .04 }), gold: phys({ map: leaf, metalness: 1, roughness: .2 }), pearl: phys({ map: raden, metalness: .3, roughness: .18, clearcoat: 1, clearcoatRoughness: .05 }) };
    } else if (set === 'chip') {
      const chip = (key, c1, c2) => canvasTex('c4chip' + key, 256, 256, (g, w) => { g.fillStyle = c1; g.fillRect(0, 0, w, w); g.fillStyle = c2; for (let k = 0; k < 8; k++) { g.save(); g.translate(w / 2, w / 2); g.rotate(k * Math.PI / 4); g.fillRect(-w * .07, -w * .5, w * .14, w * .16); g.restore(); }
        g.strokeStyle = c2; g.lineWidth = w * .03; g.setLineDash([w * .05, w * .04]); g.beginPath(); g.arc(w / 2, w / 2, w * .3, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = c2; g.font = `bold ${w * .2}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', w / 2, w / 2 + 2); });
      o = { gold: phys({ map: chip('g', '#f2b81e', '#ffffff'), roughness: .35, clearcoat: .5 }), pearl: phys({ map: chip('s', '#f6f6f2', '#d8202a'), roughness: .35, clearcoat: .5 }) };
      o.goldE = phys({ map: chip('ge', '#f2b81e', '#ffffff'), roughness: .4 }); o.pearlE = phys({ map: chip('se', '#f6f6f2', '#d8202a'), roughness: .4 });
    } else if (set === 'sun') {
      const relief = (key, sun) => canvasTex('c4rel' + key, 256, 256, (g, w) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2); g.fillStyle = '#e8e8e8'; g.strokeStyle = '#e8e8e8';
        if (sun) { g.beginPath(); g.arc(0, 0, w * .17, 0, 7); g.fill(); g.lineWidth = w * .035; for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * Math.PI / 6); g.beginPath(); g.moveTo(0, w * .23); g.lineTo(0, w * .36); g.stroke(); g.restore(); } }
        else { g.beginPath(); g.arc(0, 0, w * .3, 0, 7); g.fill(); g.fillStyle = '#808080'; g.beginPath(); g.arc(w * .12, -w * .08, w * .27, 0, 7); g.fill(); g.fillStyle = '#e8e8e8'; [[-.2, -.3], [.28, .2], [-.3, .26]].forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * w, w * .02, 0, 7); g.fill(); }); } });
      const tint = (key, sun, a, b) => canvasTex('c4tint' + key, 256, 256, (g, w) => { g.fillStyle = a; g.fillRect(0, 0, w, w); g.globalCompositeOperation = 'overlay'; g.drawImage(relief(key, sun).image, 0, 0, w, w); });
      const mk = (col, key, sun, a, b) => { const m = phys({ map: tint(key, sun, a, b), metalness: 1, roughness: .28 }); m.bumpMap = relief(key, sun); m.bumpScale = .25; return m; };
      o = { gold: mk(0xe0b048, 'sun', true, '#f0c050', '#3a2004'), pearl: mk(0xcfd6de, 'moon', false, '#d8dee6', '#20242c'), frame: phys({ color: C(0x2c2a30), metalness: 1, roughness: .35 }) };
    }
    o.frame = o.frame || base.walnutT;
    return (SM[set] = o);
  }

  /* ---------- materials ---------- */
  function mats() {
    const TT = T(), C = c => new TT.Color(c).convertSRGBToLinear(), lite = X.lite;
    const metal = (c, r, cc) => lite ? new TT.MeshStandardMaterial({ color: C(c), metalness: 1, roughness: r + .04 }) : new TT.MeshPhysicalMaterial({ color: C(c), metalness: 1, roughness: r, clearcoat: cc, clearcoatRoughness: .15, envMapIntensity: 1.2 });
    const inl = (col, hex) => { const m = X.M({ map: inlayTex(hex), bumpScale: .004, roughness: .62, sheen: lite ? undefined : C(0x404040), color: 0xffffff }); return m; };
    return {
      top: X.M({ map: trayTop(), bumpScale: .004, roughness: .58, clearcoat: .15, clearcoatRoughness: .5, color: 0xffffff }),
      side: X.M({ map: traySide(), bumpScale: .004, roughness: .58, clearcoat: .15, clearcoatRoughness: .5, color: 0xffffff }),
      suede: X.M({ map: suede(), bumpScale: .006, roughness: .95, color: 0xffffff }),
      walnut: X.M({ map: walnut('w', [.25, .25]), bumpScale: .004, roughness: .34, clearcoat: .6, clearcoatRoughness: .2, color: 0xffffff }),
      walnutT: X.M({ map: walnut('t', [2.2, 2.2]), bumpScale: .003, roughness: .3, clearcoat: .7, clearcoatRoughness: .16, color: 0xffffff }),
      bronze: metal(0xb89460, .36, .3),
      brass: metal(0xd8b064, .22, .4),
      gold: inl('gold', '#d39a34'),
      pearl: inl('pearl', '#e8e3d8'),
    };
  }

  /* ---------- geometry ---------- */
  // rounded rectangle as a polyline without a repeated closing point
  // (a duplicate start/end vertex made the bevelled extrusion tear at the corner)
  function rrShape(path, hw, hh, r, seg = 5) {
    const q = new (T().Path)();
    q.moveTo(-hw + r, -hh); q.lineTo(hw - r, -hh); q.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
    q.lineTo(hw, hh - r); q.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
    q.lineTo(-hw + r, hh); q.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
    q.lineTo(-hw, -hh + r); q.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
    const pts = q.getPoints(seg).filter((v, i, a) => i === 0 || v.distanceTo(a[i - 1]) > 1e-6);
    while (pts.length > 2 && pts[pts.length - 1].distanceTo(pts[0]) < 1e-6) pts.pop();
    path.setFromPoints(pts);
    return path;
  }
  const mesh = (geo, mat, cast = true) => { const m = new (T().Mesh)(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  const GEO = {};
  function tileGeo() {
    const k = 'c4tile' + (X.coarse ? 'c' : ''); if (GEO[k]) return GEO[k];
    const TT = T(), bv = .035, hw = TW / 2 - bv, cs = X.coarse ? 3 : 5;
    const sh = rrShape(new TT.Shape(), hw, hw, .2, cs); sh.holes.push(rrShape(new TT.Path(), .335 + bv, .335 + bv, .14 + bv, cs));
    const dep = TD - 2 * bv, frame = new TT.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: cs });
    frame.translate(0, 0, -dep / 2);
    const inlay = new TT.ShapeGeometry(rrShape(new TT.Shape(), .34, .34, .145, cs), cs);
    X.share && (X.share(frame), X.share(inlay));
    return (GEO[k] = { frame, inlay, face: TD / 2 - .045 });
  }
  function roundGeo(set) {
    const k = 'c4round' + set + (X.coarse ? 'c' : ''); if (GEO[k]) return GEO[k];
    const TT = T(), seg = X.coarse ? 24 : 40, R = TW / 2 - .01, body = new TT.CylinderGeometry(R, R, TD, seg, 1, true); body.rotateX(Math.PI / 2);
    const face = new TT.CircleGeometry(R - (set === 'coin' ? .025 : .0), seg);
    let rim = null; if (set === 'coin') { rim = new TT.TorusGeometry(R - .02, .022, 6, seg); }
    return (GEO[k] = { body, face, rim, R });
  }
  function gemGeo() {   // a cut stone: a square step cut with wide flat facets
    const k = 'c4gem'; if (GEO[k]) return GEO[k];
    const TT = T(), bv = .11, hw = TW / 2 - bv, sh = rrShape(new TT.Shape(), hw, hw, .06, 1);
    let g = new TT.ExtrudeGeometry(sh, { depth: TD - 2 * bv * .8, bevelEnabled: true, bevelThickness: bv * .8, bevelSize: bv, bevelSegments: 1, curveSegments: 1 }); g.translate(0, 0, -(TD - 2 * bv * .8) / 2);
    g = g.toNonIndexed(); g.computeVertexNormals(); return (GEO[k] = g);
  }
  function slabGeo() {   // a solid rounded square (sun & moon)
    const k = 'c4slab' + (X.coarse ? 'c' : ''); if (GEO[k]) return GEO[k];
    const TT = T(), bv = .05, hw = TW / 2 - bv, cs = X.coarse ? 3 : 5, sh = rrShape(new TT.Shape(), hw, hw, .18, cs);
    const g = new TT.ExtrudeGeometry(sh, { depth: TD - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: X.coarse ? 2 : 4, curveSegments: cs }); g.translate(0, 0, -(TD - 2 * bv) / 2);
    // planar UVs on the faces: x, y → 0..1 (the relief maps)
    const P = g.attributes.position, UV = g.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / TW + .5, P.getY(i) / TW + .5);
    return (GEO[k] = g);
  }
  // a tile standing up, facing +z (centre at the origin)
  function tile(color, m, set) {
    const TT = T(), g = new TT.Group(); set = set || curSet();
    if (set !== 'inlay' && m.sets) {
      const S = setMats(set, m), F = color === 'pearl' ? S.pearl : S.gold;
      if (set === 'coin' || set === 'chip') {
        const G = roundGeo(set), E = color === 'pearl' ? S.pearlE : S.goldE;
        g.add(mesh(G.body, E)); const a = mesh(G.face, F, false); a.position.z = TD / 2; g.add(a); const b = mesh(G.face, F, false); b.position.z = -TD / 2; b.rotation.y = Math.PI; g.add(b);
        if (G.rim) [TD / 2 - .01, -TD / 2 + .01].forEach(z => { const r = mesh(G.rim, E, false); r.position.z = z; g.add(r); });
      } else if (set === 'crystal') { g.add(mesh(gemGeo(), F)); }
      else if (set === 'sun') { g.add(mesh(slabGeo(), F)); }
      else { const G = tileGeo(); g.add(mesh(G.frame, S.frame)); const a = mesh(G.inlay, F, false); a.position.z = G.face; g.add(a); const b = mesh(G.inlay, F, false); b.position.z = -G.face; b.rotation.y = Math.PI; g.add(b); }
      g.userData.color = color; return g;
    }
    const G = tileGeo();
    g.add(mesh(G.frame, m.walnutT));
    const inl = color === 'pearl' ? m.pearl : m.gold;
    const a = mesh(G.inlay, inl, false); a.position.z = G.face; g.add(a);
    const b = mesh(G.inlay, inl, false); b.position.z = -G.face; b.rotation.y = Math.PI; g.add(b);
    g.userData.color = color; return g;
  }

  function stand(m) {
    const TT = T(), g = new TT.Group();
    // tray: a stitched leather ring (rim + walls) and a suede floor
    const bv = .05, sh = rrShape(new TT.Shape(), TW_ / 2 - bv, TDp / 2 - bv, TR - bv, X.coarse ? 8 : 12);
    sh.holes.push(rrShape(new TT.Path(), TW_ / 2 - WALL + bv, TDp / 2 - WALL + bv, TR - WALL + bv, X.coarse ? 8 : 12));
    const ring = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: X.coarse ? 2 : 3, curveSegments: X.coarse ? 8 : 12 });
    const tr = mesh(ring, [m.top, m.side]); tr.rotation.x = -Math.PI / 2; tr.position.y = bv; g.add(tr);
    const fl = mesh(new TT.ShapeGeometry(rrShape(new TT.Shape(), TW_ / 2 - WALL + .01, TDp / 2 - WALL + .01, TR - WALL, X.coarse ? 8 : 12), X.coarse ? 8 : 12), m.suede, false);
    fl.rotation.x = -Math.PI / 2; fl.position.y = FL; g.add(fl);
    const baseM = m.side.clone(); baseM.shadowSide = TT.DoubleSide;   // (the bottom casts the tray's shadow: one-sided planes cast nothing, so the tiles' shadows fell through the tray)
    const base = mesh(new TT.ShapeGeometry(rrShape(new TT.Shape(), TW_ / 2 - .02, TDp / 2 - .02, TR - .02, 6), 6), baseM, true); base.rotation.x = Math.PI / 2; base.position.y = .002; base.receiveShadow = false; g.add(base);
    // walnut spine across the tray
    const spL = TW_ - 2 * WALL - .02, sp = mesh(X.RB(spL, SP_H - FL + .02, SP_D, .07, 3), m.walnut); sp.position.y = (SP_H + FL) / 2 - .01; g.add(sp);
    // eight bronze rails in brass ferrules
    const railG = X.RB(RAIL, YTOP - SP_H + .1, RAIL, .025, 1), ferG = X.RB(.19, .07, .19, .025, 2);
    for (let k = 0; k < 8; k++) {
      const x = (k - 3.5) * PX;
      const r = mesh(railG, m.bronze); r.position.set(x, (YTOP + SP_H - .1) / 2, 0); g.add(r);
      const f = mesh(ferG, m.brass, false); f.position.set(x, SP_H + .03, 0); g.add(f);
    }
    // the rails stay open at the top (tiles drop in from above): small brass tips; column studs on the spine's front
    const tipG = X.RB(RAIL + .035, .07, RAIL + .035, .03, 2);
    for (let k = 0; k < 8; k++) { const t = mesh(tipG, m.brass, false); t.position.set((k - 3.5) * PX, YTOP + .035, 0); g.add(t); }
    const stud = new TT.CylinderGeometry(.06, .07, .03, X.coarse ? 12 : 18);
    for (let c = 0; c < 7; c++) { const s = mesh(stud, m.brass, false); s.rotation.x = Math.PI / 2; s.position.set(colX(c), (SP_H + FL) / 2 + .03, SP_D / 2 + .012); g.add(s); }
    return g;
  }

  X.c4 = { LOOKS, SETS, tile: (c, set) => tile(c, Object.assign(lookMats('leather', mats()), { sets: true }), set) };   // (the tile pictures: atlas/tools/c4piece.html)
  /* ---------- MODELS.connect4 ---------- */
  // a mid-game position: [column, colours bottom → top] (gold moved first)
  const SHOW = [[1, 'p'], [2, 'pgp'], [3, 'gpgg'], [4, 'gpg'], [5, 'pg'], [6, 'p']];
  X.MODELS.connect4 = function (live, o = {}) {
    const TT = T(), outer = new TT.Group(), g = new TT.Group(), m = lookMats(o.look || curLook(), mats()); m.sets = true;
    g.add(stand(m)); outer.add(g); g.scale.setScalar(SCALE);
    Object.assign(outer.userData, { viewY: 2.3, cell: (c, r) => [colX(c) * SCALE, rowY(r) * SCALE], tile: (c, set) => tile(c, m, set) });
    if (live) return outer;
    SHOW.forEach(([c, s]) => [...s].forEach((ch, r) => { const t = tile(ch === 'g' ? 'gold' : 'pearl', m); t.position.set(colX(c), rowY(r), 0); g.add(t); }));
    // spare tiles resting in the tray: small stacks in the front well, a few in the back
    const flat = (col, x, z, n, ry) => {
      for (let k = 0; k < n; k++) {
        const t = tile(col, m); t.rotation.set(-Math.PI / 2, 0, ry + (k % 2 ? .05 : -.04)); t.position.set(x + (k % 2 ? .03 : 0), FL + TD / 2 + k * (TD + .004), z); g.add(t);
      }
      const s = X.contact(.5, .45); s.position.set(x, FL + .003, z); g.add(s);
    };
    const zf = (SP_D / 2 + TDp / 2 - WALL) / 2 + .02, zb = -zf;
    flat('gold', -3.3, zf, 3, .08); flat('gold', -2.2, zf + .05, 2, -.12); flat('gold', -1.15, zf - .02, 1, .2);
    flat('pearl', 1.2, zf, 1, -.15); flat('pearl', 2.25, zf + .04, 2, .1); flat('pearl', 3.3, zf, 3, -.06);
    flat('gold', -2.7, zb, 2, -.1); flat('pearl', 2.7, zb, 2, .12);
    return outer;
  };
})();
