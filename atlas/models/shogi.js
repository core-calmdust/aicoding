/* =====================================================================
   Shogi on the 3D table — a legged kaya board (足付き盤) and boxwood
   pieces with raised black-lacquer, two-character inscriptions (盛り上げ駒).
   Registers into Table3D:
     Table3D.MODELS.shogi(live, o)   board (+ the opening position unless live)
     Table3D.shogi.piece(type, gote)  one piece (type = page/engine code 1..14, 8 = king)
     Table3D.shogi.images(px)         Promise → { 'k<type>[g]': dataURL } top-down renders for the DOM
   Units: one square is 1.0 wide and 1.1 deep (like a real board).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, canvasTex, makeNoise, RB, mesh } = X;
  const CW = 1, CH = 1.1, FW = 9 * CW, FH = 9 * CH, MARGIN = .5;
  const BW = FW + MARGIN * 2, BD = FH + MARGIN * 2, THICK = 2.6, LEG = 1.15;

  /* ---------- the brush font for the inscriptions ---------- */
  const FONT = '"Yuji Boku","Yuji Syuku","Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
  let fontOK = false;
  const fontReady = (document.fonts && document.fonts.load) ? Promise.all(['900 120px "Yuji Boku"', '120px "Yuji Boku"'].map(f => document.fonts.load(f, '王将飛車角行金銀桂馬香歩兵龍成と'))).then(() => { fontOK = document.fonts.check('120px "Yuji Boku"'); }).catch(() => {}) : Promise.resolve();
  (function addFont() {
    if (document.querySelector('link[data-yuji]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.yuji = 1;
    l.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap'; document.head.appendChild(l);
  })();

  /* ---------- inscriptions from the game's "本格（立体）" piece set (2kanji_3d, Little-Mage & orangain, CC BY-SA 3.0) ----------
     The SVGs draw each character as stacked grey (or red) layers, light → dark: that stack is used as the
     height of the raised lacquer (bump) and its outline as the lacquer itself. */
  const PCODE = ['', 'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY'];
  const GLYPH_BASE = (() => { try { return new URL('../../shogi/pieces/2kanji_3d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../shogi/pieces/2kanji_3d/'; } })();
  const GLYPHS = {};   // 'k<type>[o]' → canvas (RGBA: rgb = colour, a = coverage; height in the red channel of .h)
  function loadGlyph(type, ou) {
    const code = type === 8 && ou ? 'OU' : PCODE[type];
    return fetch(GLYPH_BASE + '0' + code + '.svg').then(r => r.ok ? r.text() : Promise.reject()).then(svg => {
      // bounding box of the piece body in the drawing (the light yellow path) → crop to it
      const body = svg.match(/<path fill="#e7d5b8"[^>]*\sd="([^"]+)"/);
      const noBody = svg.replace(/<path fill="#e7d5b8"[^>]*\/>/g, '').replace(/<path fill="#ab865e"[^>]*\/>/g, '').replace(/filter="url\([^)]*\)"/g, '');
      const bodyOnly = svg.replace(/<path fill="(?!#e7d5b8)[^"]*"[^>]*\/>/g, '').replace(/filter="url\([^)]*\)"/g, '');
      const S = 600, draw = txt => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(im, 0, 0, S, S); res(c); }; im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt); });
      return Promise.all([draw(bodyOnly), draw(noBody)]).then(([b, g]) => {
        const bd = b.getContext('2d').getImageData(0, 0, S, S).data; let x0 = S, y0 = S, x1 = 0, y1 = 0;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (bd[(y * S + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0) throw 0;
        const W = 256, H = 296, out = document.createElement('canvas'); out.width = W; out.height = H;
        out.getContext('2d').drawImage(g, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
        GLYPHS['k' + type + (ou ? 'o' : '')] = out;
      });
    }).catch(() => {});
  }
  // baked once from those SVGs into one sheet (images/atlas/shogi-glyphs.png, same licence) — fast to load and slice
  const ME_SRC = (document.currentScript && document.currentScript.src) || location.href;
  const SHEET = (() => { try { return new URL('../../images/atlas/shogi-glyphs.png?v=1', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/shogi-glyphs.png?v=1'; } })();
  const SHEET_KEYS = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k8o'];
  /* ---------- the six 3D piece sets (2026-11-11, Table3D.PIECES.shogi, key 'atlas-shogi-pc3'): the same raised-lacquer boxwood pieces with
     the inscriptions of the 2D sets — 盛り上げ (2kanji_3d, the original) · 一字書き (1kanji_3d) · 錦旗 · 水無瀬 · 菱湖 (LuffyKudo) · 浮木 (sunfish-shogi's two-character pieces, CC0, atlas/tools/shogi-glyphs-futamoji.py).
     Sheets: images/atlas/shogi-glyphs-<set>.png (atlas/tools/shogi-glyphs-faithful.py; licences in shogi/pieces/README.md) ---------- */
  const PSETS = ['moriage', 'ichiji', 'kinki', 'minase', 'ryoko', 'futofude'];
  const GLY = { moriage: GLYPHS };
  const curSet = () => { try { const v = X.PIECES && X.PIECES.shogi ? X.PIECES.shogi.get() : 'ryoko'; return PSETS.includes(v) ? v : 'ryoko'; } catch (e) { return 'ryoko'; } };
  const SHEETS = {};
  function glyphsOf(set) {
    if (set === 'moriage') return glyphsReady;
    if (SHEETS[set]) return SHEETS[set];
    const G = GLY[set] = {};
    const url = (() => { try { return new URL('../../images/atlas/shogi-glyphs-' + set + '.png?v=27', ME_SRC).href; } catch (e) { return '../images/atlas/shogi-glyphs-' + set + '.png?v=27'; } })();
    return (SHEETS[set] = new Promise(res => { const im = new Image(); im.onload = () => { SHEET_KEYS.forEach((k, i) => { const c = document.createElement('canvas'); c.width = 256; c.height = 296; c.getContext('2d', { willReadFrequently: true }).drawImage(im, (i % 5) * 256, (i / 5 | 0) * 296, 256, 296, 0, 0, 256, 296); G[k] = c; }); res(); upgrade(set); }; im.onerror = () => res(); im.src = url; }));
  }
  const glyphsReady = new Promise(res => {
    const slice = im => { SHEET_KEYS.forEach((k, i) => { const c = document.createElement('canvas'); c.width = 256; c.height = 296; c.getContext('2d', { willReadFrequently: true }).drawImage(im, (i % 5) * 256, (i / 5 | 0) * 296, 256, 296, 0, 0, 256, 296); GLYPHS[k] = c; }); res(); };
    const svgs = () => Promise.all([...Array(14).keys()].map(i => loadGlyph(i + 1, false)).concat([loadGlyph(8, true)])).then(res);   // fall back to the SVGs
    const viaImg = () => { const im = new Image(); im.onload = () => slice(im); im.onerror = svgs; im.src = SHEET; };
    // decoded off the main thread where possible (a big PNG decoded on first draw stalls the page for a moment)
    if (typeof createImageBitmap === 'function' && typeof fetch === 'function') fetch(SHEET).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => createImageBitmap(b)).then(bm => { slice(bm); bm.close && bm.close(); }).catch(viaImg);
    else viaImg();
  });
  /* ---------- textures ---------- */
  // boxwood (柘植) face of a piece: pale honey with very fine straight grain and a few silky flecks
  function tsuge(c, W, H, seed, after) { paint(c.canvas, 'tsuge', { seed }, after); }
  function KL(X) {
    const makeNoise = X.makeNoise;
    const tsuge = (d, W, H, seed) => {
      const N = makeNoise(seed);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const g = N(u * 60, v * 3, 2) * .5 + N(u * 9 + N(v * 2, u, 2) * 2, v * .8, 3) * .5;
        const fleck = N(u * 30, v * 90, 1) > .8 ? .06 : 0;
        const t = .18 + g * .32 - fleck, i = (y * W + x) * 4;
        d[i] = 218 - t * 64; d[i + 1] = 190 - t * 78; d[i + 2] = 160 - t * 88; d[i + 3] = 255;
      }
    };
    return {
      tsuge(d, W, H, p) { tsuge(d, W, H, p.seed); },
      // a face from the inscription sheet: gd = the glyph's RGBA (alpha = lacquer, the grey layers = its height)
      glyphFace(d, W, H, p) {
        const gd = p.gd, type = p.type, kind = p.kind, red = type > 8;
        if (kind === 'map') tsuge(d, W, H, 11 + type); else for (let i = 3; i < d.length; i += 4) d[i] = 255;   // (else: opaque black)
        // a soft shadow under the raised lacquer (map only)
        if (kind === 'map') for (let y = H - 1; y >= 3; y--) for (let x = W - 1; x >= 2; x--) { const j = ((y - 3) * W + (x - 2)) * 4 + 3, a = gd[j] / 255 * .28, i = (y * W + x) * 4; if (a) { d[i] *= 1 - a; d[i + 1] *= 1 - a; d[i + 2] *= 1 - a; } }
        for (let i = 0; i < W * H; i++) {
          const a = gd[i * 4 + 3] / 255; if (!a) { if (kind === 'rough') { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 150; } continue; }
          const hgt = 1 - (red ? gd[i * 4 + 1] : gd[i * 4]) / 255;    // dark layer = top of the stroke
          if (kind === 'map') { const L = red ? [150, 22, 14] : [16, 9, 5], hi = Math.pow(hgt, 3) * 26; for (let k = 0; k < 3; k++) d[i * 4 + k] = d[i * 4 + k] * (1 - a) + (L[k] + hi) * a; }
          else if (kind === 'rough') { const v = 150 * (1 - a) + 28 * a; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
          else { const v = 255 * a * (.35 + .65 * hgt); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
        }
      },
      // board top: 本榧 (天地柾, 2026-11-10) — golden kaya; thin growth lines running from top to bottom, unevenly spaced and of
      // uneven strength, broadly warped (no repeating pattern), with fine fibres; kept light so the board stays bright
      top(d, W, H) {
        const N = makeNoise(5), hs = k => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const u = x / W, v = y / H;
          // the ring coordinate: slow warp + uneven spacing (each ring's width from a hash)
          const ph = u * 40 + (N(u * 1.4, v * .9, 3) - .5) * 3 + (N(u * 6, v * 3.2, 2) - .5) * .35;
          const k = Math.floor(ph), f = ph - k, w0 = .5 + hs(k) * .9;
          const pos = Math.min(.98, .55 + hs(k + 7) * .35), str = .35 + hs(k + 13) * .65;
          const line = Math.exp(-Math.pow((f - pos) / (.022 * w0), 2)) * str + Math.exp(-Math.pow((f - pos) / (.09 * w0), 2)) * str * .22;
          const fib = (N(u * 9, v * 420, 1) - .5) * .07 + (N(u * 160, v * 6, 1) - .5) * .04;
          const tone = (N(u * 1.6, v * 1.3, 2) - .5) * .16;
          const t = .12 + line * .62 + fib * 1.4 + tone, i = (y * W + x) * 4;
          d[i] = 218 - t * 73; d[i + 1] = 182 - t * 83; d[i + 2] = 142 - t * 87; d[i + 3] = 255;
        }
      },
      endGrain(d, W, H, p) {
        const N = makeNoise(p.seed), cx = p.cx, cy = p.cy, k = p.k;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const u = x / W, v = y / H, dx = (u - cx) * k, dy = (v - cy);
          const r = Math.sqrt(dx * dx + dy * dy) * 60 + N(u * 4, v * 4, 3) * 3 + N(u * 40, v * 40, 1) * .2;
          const f = r % 1, late = Math.exp(-Math.pow((f - .8) / .08, 2));
          const t = .2 + late * .35 + (N(u * 2, v * 2, 2) - .5) * .2, i = (y * W + x) * 4;
          d[i] = 191 - t * 69; d[i + 1] = 149 - t * 69; d[i + 2] = 107 - t * 68; d[i + 3] = 255;
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

  const FRONT = ['', '歩兵', '香車', '桂馬', '銀将', '角行', '飛車', '金将', '玉将', 'と金', '成香', '成桂', '成銀', '龍馬', '龍王'];
  // face: wood + lacquer characters; rough: glossy where lacquered; bump: raised, rounded strokes
  function faceTex(type, kingOu, kind, set = 'moriage') {
    const G = (GLY[set] || GLYPHS)['k' + type + (kingOu ? 'o' : '')];
    const key = `shf-${set === 'moriage' ? '' : set + '-'}${type}${kingOu ? 'o' : ''}-${kind}-${G ? 'g' : fontOK ? 1 : 0}`;
    if (G) return canvasTex(key, 256, 296, (c, W, H) => { paint(c.canvas, 'glyphFace', { gd: G.__gd || (G.__gd = G.getContext('2d').getImageData(0, 0, W, H).data), type, kind }); });   // (read once per glyph)
    return canvasTex(key, 256, 296, (c0, W, H) => {
      const txt = type === 8 && kingOu ? '王将' : FRONT[type], red = type > 8;
      const ink = c => {
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const fs = W * (txt.length > 1 ? .4 : .62);
      c.font = `${fontOK ? '' : '700 '}${fs}px ${FONT}`;
      const ys = txt.length > 1 ? [H * .4, H * .7] : [H * .58];
      const draw = (fill, blur, grow = 0) => { c.save(); c.fillStyle = fill; c.strokeStyle = fill; c.lineJoin = 'round'; c.lineWidth = fs * (.05 + grow); if (blur) { c.shadowColor = fill; c.shadowBlur = blur; }
        [...txt].forEach((ch, i) => { c.save(); c.translate(W / 2, ys[i]); c.scale(1, txt.length > 1 ? .92 : 1); c.fillText(ch, 0, 0); c.strokeText(ch, 0, 0); c.restore(); }); c.restore(); };
      if (kind === 'map') {
        // the face darkens a little towards the edges (a hand-rubbed finish), then the lacquer
        const vg = c.createRadialGradient(W / 2, H * .55, W * .2, W / 2, H * .55, W * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(96,60,24,.22)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
        c.save(); c.translate(1.5, 2.5); draw('rgba(70,40,16,.35)', 4, .02); c.restore();             // soft shadow under the raised strokes
        draw(red ? '#9c1f16' : '#120804', 0);
        c.save(); c.translate(-1.2, -1.6); c.globalCompositeOperation = 'lighter'; draw(red ? 'rgba(120,40,20,.25)' : 'rgba(79,70,61,.22)', 0, -.03); c.restore();   // highlight on the crown of the lacquer
      }
      if (kind === 'rough') draw('#1a1a1a', 2);
      if (kind === 'bump') { draw('#606060', 8, .03); draw('#c0c0c0', 4); draw('#ffffff', 1, -.02); }
      };
      if (kind === 'map') tsuge(c0, W, H, 11 + type, ink);
      else { c0.fillStyle = kind === 'rough' ? '#888' : '#000'; c0.fillRect(0, 0, W, H); ink(c0); }
    });
  }
  // board top: straight-grained kaya with the black lacquer lines (太刀盛り) and four stars
  // n: squares per side (9; 5 for 5五将棋 — no stars)
  // 本榧 (2026-11-10): the same grain as the 2D board (shogi/index.html body.skin-kaya), pre-rendered to images/atlas/shogi-kaya.webp
  // (a same-origin picture: an SVG filter drawn into the canvas would taint it for WebGL); the top is redrawn once it has loaded
  let kayaImg = null;
  const KAYA_SRC = (() => { try { return new URL('../../images/atlas/shogi-kaya.webp?v=3', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/shogi-kaya.webp?v=3'; } })();   // (from this file: the tool pages too)
  function withKaya(fn) {
    if (kayaImg && kayaImg.complete && kayaImg.naturalWidth) { fn(kayaImg); return; }
    if (!kayaImg) { kayaImg = new Image(); kayaImg.src = KAYA_SRC; }
    kayaImg.addEventListener('load', () => fn(kayaImg), { once: true });
  }
  /* ---------- the six 3D boards (2026-11-11, Table3D.BOARDS.shogi, key 'atlas-shogi-look') ----------
     kaya 本榧 (the default, unchanged) · makie 蒔絵 (black roiro lacquer with gold maki-e round a 本榧 top) ·
     grain 新榧 (the 2D 木目: pale spruce) · ink 漆黒 (the 2D 漆黒: dark top, gold lines, striped ebony) ·
     yosegi 箱根寄木細工 (麻の葉・矢羽根・市松 of natural woods) · sakura 山桜 (cherry top with mother-of-pearl blossoms, 樺細工 bark sides).
     The pictures: images/atlas/shogi3d/ (atlas/tools/shogi-tex.html). */
  const LOOKS = ['kaya', 'makie', 'grain', 'ink', 'yosegi', 'sakura'];
  const LOOK = {
    kaya: {},
    makie: { side: 'makie', lacq: true, line: 'rgba(33,19,11,.92)', bottom: 0x120c0a },
    grain: { top: 'top-grain', side: 'grain', stand: 'grain', leg: ['#dcc192', '#a97e48'], bottom: 0x9c7646, line: 'rgba(52,32,12,.9)', satin: true },
    ink: { top: 'top-ink', side: 'ink', stand: 'ink', leg: ['#3a2a20', '#120c09'], bottom: 0x16100c, line: 'rgba(214,180,110,.85)', star: '#d6b46e', gloss: true },
    yosegi: { top: 'top-yosegi', side: 'yosegi', stand: 'yosegi', leg: ['#c99a68', '#8a5a34'], bottom: 0x7a5232, line: 'rgba(40,26,14,.9)' },
    sakura: { top: 'top-sakura', side: 'sakura', stand: 'sakura', leg: ['#8a3a26', '#4a1c12'], bottom: 0x2a0806, line: 'rgba(48,20,10,.92)', raden: true },   // (v3: 朱溜 lacquer with 螺鈿 cherry blossoms and a 鶯)
  };
  const SH3 = (() => { try { return new URL('../../images/atlas/shogi3d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/shogi3d/'; } })();
  const SH3V = '?v=11';
  const lookOf = o => { const k = (o && o.look) || (X.BOARDS && X.BOARDS.shogi ? X.BOARDS.shogi.get() : 'kaya'); return LOOK[k] ? k : 'kaya'; };
  const imgs = {};
  function withImg(name, fn) {
    let im = imgs[name];
    if (im && im.complete && im.naturalWidth) { fn(im); return; }
    if (!im) { im = imgs[name] = new Image(); im.src = SH3 + name + '.webp' + SH3V; }
    im.addEventListener('load', () => fn(im), { once: true });
  }
  const texs = {};
  function imgTex(name, srgb = true, aniso = 8) {
    if (texs[name]) return texs[name];
    const t = new (T().TextureLoader)().load(SH3 + name + '.webp' + SH3V, () => { if (X.kick) X.kick(300); });
    if (srgb) t.encoding = T().sRGBEncoding; t.anisotropy = aniso;
    return (texs[name] = t);
  }
  // the board's faces and legs for a look (shared between boards of the same look)
  // 螺鈿 (2026-11-11): the shell's colour slides through the spectrum with the angle you look at it from — the shell pixels are those
  // whose map's R (height) is about 52/255 (cracks 40); the shift follows the normal against the view and the shell's own pattern
  function nacre(m) {
    m.onBeforeCompile = sh => {
      sh.fragmentShader = (T().__uvDefs || '') + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      #ifdef USE_ROUGHNESSMAP
      { vec4 nmr = texture2D( roughnessMap, vUv ); float shl = smoothstep( .13, .17, nmr.r ) * ( 1. - smoothstep( .23, .27, nmr.r ) );
        if ( shl > 0. ) { float vd = dot( normal, normalize( -vViewPosition ) ); float lum = dot( diffuseColor.rgb, vec3( .3, .5, .2 ) );
          float ph = fract( vd * 2.6 + lum * 2.6 + vUv.x * 4. + vUv.y * 2. );
          vec3 rb = .55 + .45 * cos( 6.2832 * ( ph + vec3( 0., .33, .67 ) ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * .5 + rb * lum * .85, shl * .8 ); } }
      #endif`);
    };
    m.customProgramCacheKey = () => 'nacre';
    return m;
  }
  const lookMats = {};
  function faceMats(look) {
    if (lookMats[look]) return lookMats[look];
    const L = LOOK[look], TT = T();
    if (look === 'kaya') return null;
    let side, end, leg;
    if (L.lacq) {   // 蒔絵: the colour + (R height, G roughness, B metalness); a deep clear lacquer over all
      const lq = (c, mm) => M({ map: imgTex(c), roughnessMap: imgTex(mm, false), metalnessMap: imgTex(mm, false), bumpMap: imgTex(mm, false), bumpScale: .0035, roughness: 1, metalness: .5, clearcoat: .8, clearcoatRoughness: .08, envMapIntensity: 1.5 });   // (2026-11-13: metalness ×.5 — as pure metal the solid gold of the fans' paper only mirrored the room, and in a dim room (the study) it went black: only the ribs showed. Half metal keeps the gold's own colour under any light)
      side = lq('side-makie', 'side-makie-m'); end = lq('end-makie', 'end-makie-m');
      leg = M({ map: imgTex('leg-makie'), bumpScale: .0005, roughness: .14, clearcoat: .9, clearcoatRoughness: .06 });
    } else if (L.raden) {   // 螺鈿: 朱溜 lacquer, shell pieces (the same maps as 蒔絵)
      const lq = (c, mm) => nacre(M({ map: imgTex(c), roughnessMap: imgTex(mm, false), metalnessMap: imgTex(mm, false), bumpMap: imgTex(mm, false), bumpScale: .002, roughness: 1, metalness: 1, clearcoat: .9, clearcoatRoughness: .06, envMapIntensity: 1.4 }));
      side = lq('side-sakura', 'side-sakura-m'); end = lq('end-sakura', 'end-sakura-m');
      leg = M({ color: 0x4a0d0b, roughness: .16, clearcoat: .9, clearcoatRoughness: .06 });
    } else {
      const fin = L.gloss ? { roughness: .2, clearcoat: .8, clearcoatRoughness: .1 } : L.bark ? { roughness: .26, clearcoat: .65, clearcoatRoughness: .14 } : L.satin ? { roughness: .5 } : { roughness: .42, clearcoat: .3, clearcoatRoughness: .3 };
      side = M(Object.assign({ map: imgTex('side-' + L.side), bumpScale: .002 }, fin));
      end = M(Object.assign({ map: imgTex('end-' + L.side), bumpScale: .002 }, fin));
      leg = L.bark ? M(Object.assign({ map: imgTex('side-sakura', true, 4), bumpScale: .002 }, fin)) : M(Object.assign({ map: X.wood('shLeg-' + look, L.leg[0], L.leg[1], 256, 256, 2), bumpScale: .002 }, fin));
    }
    return (lookMats[look] = { side, end, leg, bottom: M({ color: L.bottom, roughness: .7 }) });
  }
  // a plain kaya surface (the komadai): the same golden tone with a part of the board's grain, drawn fainter
  function kayaPlain(key) {
    let tex = null;
    tex = X.canvasTex(key, 512, 512, (c, W, H) => {
      c.fillStyle = '#dfbf99'; c.fillRect(0, 0, W, H);
      withKaya(img => { c.drawImage(img, img.width * .05, img.height * .05, img.width * .35, img.height * .35, 0, 0, W, H); c.fillStyle = 'rgba(227,195,157,.18)'; c.fillRect(0, 0, W, H); if (tex) tex.needsUpdate = true; });
    });
    return tex;
  }
  // the 駒台 material: the board's own kaya picture and the board's tone (2026-11-10: the stands matched to the board)
  const STAND_TONE = 0xebe4db;   // = TONES.classic below
  const standMs = {};
  function standMat(look) {
    look = LOOK[look] ? look : lookOf();
    if (standMs[look]) return standMs[look];
    const L = LOOK[look];
    let m;
    if (L.lacq) m = M({ map: imgTex('stand-makie'), roughnessMap: imgTex('stand-makie-m', false), metalnessMap: imgTex('stand-makie-m', false), bumpMap: imgTex('stand-makie-m', false), bumpScale: .003, roughness: 1, metalness: 1, clearcoat: .8, clearcoatRoughness: .08 });
    else if (L.raden) m = nacre(M({ map: imgTex('stand-sakura'), roughnessMap: imgTex('stand-sakura-m', false), metalnessMap: imgTex('stand-sakura-m', false), bumpMap: imgTex('stand-sakura-m', false), bumpScale: .002, roughness: 1, metalness: 1, clearcoat: .9, clearcoatRoughness: .06 }));
    else if (L.stand) m = M({ map: imgTex('stand-' + L.stand), roughness: L.gloss ? .5 : .9, bumpScale: .001 });
    else m = M({ map: kayaPlain('kayaStand'), roughness: .92, bumpScale: .001 });   // (matte like the board top, 2026-11-12)
    m.color.multiply(new (T().Color)(STAND_TONE).convertSRGBToLinear());
    // 蒔絵 / 螺鈿 (2026-11-12, the user): the picture on the plate's top only — its thin edges, the base and the column plain lacquer
    // (the picture squeezed onto them read as stray thin inlays)
    if (L.lacq || L.raden) m.userData.plain = M({ color: L.raden ? 0x4a0d0b : 0x120d0a, roughness: .16, clearcoat: .9, clearcoatRoughness: .06 });
    return (standMs[look] = m);
  }
  // cr {c0, r0} (詰将棋's close-up, shogi/index.html tzWindow): an n×n window of the 9×9 board — the stars where they fall inside it
  // and that part of the board's grain, so it reads as the same board seen closer (2026-11-10)
  const crStars = (n, cr) => !cr ? (n === 9 ? [[3, 3], [6, 3], [3, 6], [6, 6]] : []) : [[3, 3], [6, 3], [3, 6], [6, 6]].map(([i, j]) => [i - cr.c0, j - cr.r0]).filter(([i, j]) => i > 0 && i < n && j > 0 && j < n);
  const crKey = (n, cr, nh = n) => cr ? `-${n}c${cr.c0}r${cr.r0}` : n === 9 && nh === 9 ? '' : '-' + n + (nh !== n ? 'x' + nh : '');
  // ext: the block made that much deeper at the top and the bottom (world units) — the komadai bars of the PC layout lie on it (2026-11-11)
  // nh: the number of ranks when it differs from the files (the variants' W × H boards: 平安将棋 9×8, ゴロゴロ 5×6, マイクロ 4×5 …, 2026-11-12)
  // the rim round the grid, the same for the block and its top / bump pictures (they drifted apart once: the lines were drawn a rim's
  // difference away from the squares, 2026-11-12): 詰将棋's close-up scales it with the window (the same board seen closer); a variant's
  // W×H board keeps the 9×9 board's rim, so its coordinates stay on the wood
  const mgOf = (n, nh, cr) => cr ? MARGIN * Math.max(n, nh) / 9 : MARGIN;
  function boardTop(n = 9, cr = null, ext = 0, look = 'kaya', nh = n) {
    const L = LOOK[look] || {}, withTop = L.top ? fn => withImg(L.top, fn) : withKaya;
    const MG = mgOf(n, nh, cr);
    const PX = 100, BW = n * CW + MG * 2, BD = nh * CH + MG * 2 + ext * 2;
    const grid = (c) => {
      const ox = MG * PX, oy = (MG + ext) * PX, cw = CW * PX, ch = CH * PX;
      c.strokeStyle = L.line || 'rgba(33,19,11,.92)'; c.lineCap = 'square';
      for (let i = 0; i <= Math.max(n, nh); i++) {
        c.lineWidth = i === 0 || i === n ? 3.4 : 2.2;
        if (i <= n) { c.beginPath(); c.moveTo(ox + i * cw, oy); c.lineTo(ox + i * cw, oy + nh * ch); c.stroke(); }
        c.lineWidth = i === 0 || i === nh ? 3.4 : 2.2;
        if (i <= nh) { c.beginPath(); c.moveTo(ox, oy + i * ch); c.lineTo(ox + n * cw, oy + i * ch); c.stroke(); }
      }
      c.fillStyle = L.star || 'rgba(33,19,11,.95)';
      (nh === n ? crStars(n, cr) : []).forEach(([i, j]) => { c.beginPath(); c.arc(ox + i * cw, oy + j * ch, 5.5, 0, 7); c.fill(); });
    };
    let tex = null;
    tex = canvasTex('shogiTop5' + crKey(n, cr, nh) + (ext ? 'e' + ext : '') + (look === 'kaya' || look === 'makie' ? '' : '-' + look), BW * PX | 0, BD * PX | 0, (c0, W, H) => {
      const base = (c) => { const g = c.createLinearGradient(0, 0, W * .14, H); g.addColorStop(0, '#e9cda7'); g.addColorStop(.4, '#e1c197'); g.addColorStop(.75, '#d7b385'); g.addColorStop(1, '#cca476'); c.fillStyle = g; c.fillRect(0, 0, W, H); };
      base(c0); grid(c0);
      withTop(img => {
        const c = c0;
        if (cr) {   // that window's part of the whole board's grain (the 9×9 board with its rim = the whole picture)
          const B9 = 9 * CW + MARGIN * 2, D9 = 9 * CH + MARGIN * 2, sx = (MARGIN + cr.c0 * CW - MG) / B9, sh = Math.min(1, BD / D9), sy = Math.max(0, Math.min(1 - sh, (MARGIN + cr.r0 * CH - MG - ext) / D9));
          c.drawImage(img, sx * img.width, sy * img.height, BW / B9 * img.width, sh * img.height, 0, 0, W, H);
        } else c.drawImage(img, 0, 0, W, H);
        grid(c);
        if (tex) tex.needsUpdate = true;
      });
    });
    return tex;
  }
  // the lines are raised lacquer too: a bump map with the grid
  function boardBump(n = 9, cr = null, ext = 0, nh = n) {
    const MG = mgOf(n, nh, cr);
    const PX = 100, BW = n * CW + MG * 2, BD = nh * CH + MG * 2 + ext * 2;
    return canvasTex('shogiTopB' + crKey(n, cr, nh) + (ext ? 'e' + ext : ''), BW * PX | 0, BD * PX | 0, (c, W, H) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const ox = MG * PX, oy = (MG + ext) * PX, cw = CW * PX, ch = CH * PX;
      c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 2;
      for (let i = 0; i <= Math.max(n, nh); i++) { c.lineWidth = i === 0 || i === n ? 3.4 : 2.2; if (i <= n) { c.beginPath(); c.moveTo(ox + i * cw, oy); c.lineTo(ox + i * cw, oy + nh * ch); c.stroke(); } c.lineWidth = i === 0 || i === nh ? 3.4 : 2.2; if (i <= nh) { c.beginPath(); c.moveTo(ox, oy + i * ch); c.lineTo(ox + n * cw, oy + i * ch); c.stroke(); } }
    });
  }
  // (2026-11-13) the block's sides: a real 柾目 (straight grain) — long horizontal growth lines of uneven spacing and strength that drift
  // gently, a warm tone that shifts slowly along the board, fine fibres; no noise speckle
  function sideGrain(key, w, h, seed) {
    return canvasTex(key, w, h, c => {
      let sd = seed * 9301 + 49297; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const g0 = c.createLinearGradient(0, 0, w, 0); g0.addColorStop(0, '#c99c6c'); g0.addColorStop(.35, '#d3a878'); g0.addColorStop(.7, '#c49464'); g0.addColorStop(1, '#cfa272');
      c.fillStyle = g0; c.fillRect(0, 0, w, h);
      const waves = [r() * 6, r() * 6, r() * 6];
      let y = 0;
      while (y < h) {   // the growth lines: late wood (darker, thin) after early wood (paler, wider)
        y += 2.5 + r() * 9; const th = .6 + r() * 1.6, a = .1 + r() * .28;
        c.strokeStyle = `rgba(${110 + r() * 20 | 0},${66 + r() * 16 | 0},${30 + r() * 10 | 0},${a})`; c.lineWidth = th; c.beginPath();
        for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x / w * 6.28 * 1.3 + waves[0] + y * .02) * 1.6 + Math.sin(x / w * 6.28 * 3.1 + waves[1]) * .6; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
        c.stroke();
        if (r() < .35) { c.strokeStyle = `rgba(255,236,200,${.06 + r() * .08})`; c.lineWidth = 1 + r() * 2; c.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + 2 + Math.sin(x / w * 6.28 * 1.3 + waves[0] + y * .02) * 1.6; x ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); }
      }
      for (let k = 0; k < 260; k++) {   // fine fibres along the grain
        const fy = r() * h, fx = r() * w, L = 30 + r() * 140; c.strokeStyle = `rgba(90,52,22,${.03 + r() * .05})`; c.lineWidth = .5; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx + L, fy + (r() - .5)); c.stroke();
      }
      const sh = c.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,240,215,.08)'); sh.addColorStop(1, 'rgba(60,30,10,.1)'); c.fillStyle = sh; c.fillRect(0, 0, w, h);
    });
  }
  // the sides of the block show end grain: tight growth rings arching across the face (like the photo of a real 榧 board)
  function endGrain(key, w, h, cx, cy, k) {
    return canvasTex(key, w, h, (c) => { paint(c.canvas, 'endGrain', { seed: key.length * 7, cx, cy, k }); });
  }

  /* ---------- a piece ---------- */
  const SIZE = ['', 1, 2, 2, 3, 4, 4, 3, 5, 1, 2, 2, 3, 4, 4];
  const geoCache = {};
  function pieceGeo(sz) {
    if (geoCache[sz]) return geoCache[sz];
    // (2026-11-11) the shape of real pieces (the user's reference drawing and measured outlines of 歩 … 王将): sides at about 81° to
    // the base, the shoulders 2/3 of the base's width, a flat roof (11% of the height, an apex of about 144°), the tip itself a little
    // rounded; the larger pieces a little wider for their height (歩 41% → 王将 45%)
    const TT = T(), s = .8 + sz * .045, bw = (.385 + .009 * (sz - 1)) * s, sw = .67 * bw, sy = .367 * s, tip = .47 * s, bot = -.47 * s, rx = .05 * s, ry = rx * (tip - sy) / sw;
    const sh = new TT.Shape(); sh.moveTo(sw, sy); sh.lineTo(bw, bot); sh.lineTo(-bw, bot); sh.lineTo(-sw, sy); sh.lineTo(-rx, tip - ry); sh.quadraticCurveTo(0, tip + ry * .15, rx, tip - ry); sh.closePath();
    const bev = .045 * s;
    const geo = new TT.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 5 });
    // taper: thick at the bottom, thinner towards the tip (as real pieces are)
    const P = geo.attributes.position, UV = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), z = P.getZ(i), th = (.26 - (y - bot) / (tip - bot) * .085) * s;   // (a little thinner, closer to real pieces: 2026-11-10)
      P.setZ(i, z < 0 ? z : z > 1 ? th + (z - 1) : z * th);
    }
    for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + bw) / (2 * bw), (P.getY(i) - bot) / (tip - bot));
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);                 // face up (+y), tip towards -z (the far side / top of the screen)
    geo.computeBoundingBox(); geo.translate(0, -geo.boundingBox.min.y, 0);
    // (2026-11-11) seated as on a real board: the piece's base on the near line of its square (its owner's side), not centred — for
    // the other side the group is turned, so the base sits on the far line. The top-down pictures (images()) show the same.
    geo.translate(0, 0, CH / 2 - .085 - geo.boundingBox.max.z);   // (a small gap above the line, 2026-11-12)
    return (geoCache[sz] = geo);
  }
  const matCache = {};
  let sideM = null;
  function pieceMats(type, ou, set = 'moriage') {
    const key = set + ':' + type + (ou ? 'o' : '');
    if (matCache[key]) return matCache[key];
    if (set !== 'moriage') glyphsOf(set);
    const TT = T();
    const face = new TT.MeshPhysicalMaterial({ map: faceTex(type, ou, 'map', set), roughnessMap: faceTex(type, ou, 'rough', set), bumpMap: faceTex(type, ou, 'bump', set), bumpScale: .032, roughness: 1, clearcoat: .55, clearcoatRoughness: .28 });
    const side = sideM || (sideM = M({ map: X.canvasTex('tsugeSide', 128, 128, (c, W, H) => tsuge(c, W, H, 3)), roughness: .5, bumpScale: .002 }));
    return (matCache[key] = [face, side]);
  }
  function upgrade(set) {   // the faces made before the set's glyphs arrived
    for (const key in matCache) { const [st, rest] = key.split(':'); if (st !== set) continue; const ou = rest.endsWith('o'), type = parseInt(rest, 10), f = matCache[key][0];
      if (!(GLY[set] || {})['k' + type + (ou ? 'o' : '')]) continue;
      f.map = faceTex(type, ou, 'map', set); f.roughnessMap = faceTex(type, ou, 'rough', set); f.bumpMap = faceTex(type, ou, 'bump', set); f.needsUpdate = true; }
    if (X.kick) X.kick(300);
  }
  glyphsReady.then(() => upgrade('moriage'));
  function piece(type, gote, ou, set = curSet()) {
    const m = new (T().Mesh)(pieceGeo(SIZE[type] || 1), pieceMats(type, ou, set));
    m.castShadow = true; m.receiveShadow = true;
    const g = new (T().Group)(); g.add(m); if (gote) g.rotation.y = Math.PI;
    g.userData.type = type; return g;
  }

  /* ---------- the legged board ---------- */
  function leg(mat) {   // kuchinashi (gardenia fruit) foot: a carved, eight-lobed bulb
    const TT = T(), pts = [[0, 0], [.34, 0], [.42, .08], [.6, .32], [.62, .45], [.55, .62], [.36, .78], [.26, .86], [.28, .93], [.42, .98], [.44, 1.04], [.36, 1.1], [.36, LEG], [0, LEG]];
    const geo = new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), 40);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), y = P.getY(i), a = Math.atan2(z, x), lobe = y < .9 ? 1 + .1 * Math.pow(Math.abs(Math.cos(a * 4)), .6) - .05 : 1;
      P.setX(i, x * lobe); P.setZ(i, z * lobe);
    }
    geo.computeVertexNormals();
    return mesh(geo, mat);
  }
  function board(o = {}) {
    const g = new (T().Group)(), TT = T();
    // o.n = 5: the 5五将棋 board — same squares, a smaller block (thickness and legs scaled with it)
    // o.crop {c0, r0} with o.n 4…8: 詰将棋's close-up — n×n squares of the 9×9 board; block and legs scaled by n/9, so fitted to the
    // screen it is the same board seen closer
    const cr = o.crop && o.n >= 3 && o.n < 9 ? o.crop : null;
    // o.w × o.h (2026-11-12): a variant's board (W files × H ranks, the same squares; the block scaled with its size)
    const n = cr ? o.n : o.w ? o.w : o.n === 5 ? 5 : 9, nh = !cr && o.h ? o.h : n, big = Math.max(n, nh), MG = mgOf(n, nh, cr), k = big === 9 ? 1 : cr ? n / 9 : Math.max(.62, big / 9 * .9), FW = n * CW, FH = nh * CH, EXT = Math.max(0, +o.ext || 0), BW = FW + MG * 2, BD = FH + MG * 2 + EXT * 2, THICK = 4.4 * k;   // (a 足付き盤 of about 6 寸 — the block half its width, the user's photo, 2026-11-12; was 2.6)
    const look = lookOf(o), LM = faceMats(look);
    const kaya = LM ? LM.leg : M({ map: X.wood('kayaSide2', '#caa075', '#9c6c3c', 512, 512, 2.4), roughness: .5, bumpScale: .003 });
    const endF = LM ? LM.side : M({ map: sideGrain('kayaSideF3', 1024, 256, 3), roughness: .5, bumpScale: .002 });
    const endS = LM ? LM.end : M({ map: endGrain('kayaEndS2', 512, 256, -1.4, .5, .5), roughness: .5, bumpScale: .003 });   // (the left / right sides: the end grain as before; only the faces toward the players are 柾目)
    const top = new TT.MeshPhysicalMaterial({ map: boardTop(n, cr, EXT, look, nh), bumpMap: boardBump(n, cr, EXT, nh), bumpScale: .006, roughness: .95, clearcoat: 0, reflectivity: 0, envMapIntensity: .6 });   // matte: no glare from the room's lights on the playing field, in any room (2026-11-12)
    top.map.anisotropy = 8;
    const bottom = LM ? LM.bottom : M({ color: 0x8c643c, roughness: .7 });
    const LEGH = 1.9, base = o.legs === false ? 0 : LEGH * k;   // (the feet taller with it: the carved profile stretched)
    const block = new TT.Mesh(RB(BW, THICK, BD, .05, 2), [endS, endS, top, bottom, endF, endF]);
    block.position.y = base + THICK / 2; block.castShadow = block.receiveShadow = true; g.add(block);
    if (o.legs !== false) {
      const lm = LM ? LM.leg : M({ map: X.wood('kayaLeg', '#d6af88', '#a87747', 256, 256, 2), roughness: .5, bumpScale: .002 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const l = leg(lm); l.scale.set(k, k * LEGH / LEG, k); l.position.set(sx * (BW / 2 - 1.15 * k), 0, sz * (BD / 2 - 1.2 * k)); g.add(l); });
    }
    // board colour (the game's "board & piece skin"): a tint over the kaya
    const tinted = [top, kaya, endF, endS, bottom]; g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && !tinted.includes(o.material)) tinted.push(o.material); });
    const base0 = tinted.map(m => m.color.clone());
    const TONES = { classic: 0xebe4db, grain: 0xd1b59a, kaya: 0xefeae2, metal: 0xb4bcc6, ink: 0x5e5046 };   // kaya: 本榧 (the default). 2026-11-10: near-neutral tints — the kaya picture itself carries the colour (less yellow)
    g.userData.setTone = name => { g.userData.tone = name; const c = new TT.Color(TONES[name] || 0xffffff).convertSRGBToLinear(); tinted.forEach((m, i) => { m.color.copy(base0[i]).multiply(c); }); };
    g.userData.setTone('classic');
    g.userData.look = look; g.userData.S = FH; g.userData.W = FW; g.userData.top = base + THICK + .001; g.userData.outer = BD / FH; g.userData.n = n; g.userData.nh = nh; g.userData.mg = MG; g.userData.ext = EXT;
    return g;
  }
  const cell = (c, r) => [-FW / 2 + CW * (c + .5), -FH / 2 + CH * (r + .5)];   // c: 0 = left column on screen, r: 0 = top row

  /* ---------- 駒台: one pedestal — square top plate, waisted column, stepped square base on the floor ---------- */
  let colMat = null;
  function komadai(mat, KH) {
    const TT = T(), g = new TT.Group(), pm = (mat && mat.userData && mat.userData.plain) || mat;
    g.add(mesh(RB(2.9, .26, 3.55, .05, 2), pm === mat ? mat : [pm, pm, mat, pm, pm, pm], 0, KH - .13, 0));                                  // top plate (larger with the larger pieces in hand, 2026-11-11)
    g.add(mesh(RB(2.3, .32, 2.7, .08, 2), pm, 0, .16, 0));                                        // base
    g.add(mesh(RB(1.5, .24, 1.8, .06, 2), pm, 0, .32 + .12, 0));                                   // step
    const H = KH - .26 - .56, pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, w = .26 + .16 * Math.pow(Math.abs(t - .55) / .55, 2); pts.push(new TT.Vector2(w, t * H)); }
    const col = new TT.LatheGeometry(pts, 4); col.rotateY(Math.PI / 4);                             // square, waisted
    // the lathe wraps the texture round the column: use a soft, low-contrast grain there so it doesn't band
    const cm = pm;
    const c = mesh(col, cm, 0, .56, 0); c.scale.set(1, 1, 1.15); g.add(c);
    return g;
  }
  /* ---------- MODELS.shogi: board + the opening position ---------- */
  X.MODELS.shogi = function (live, o) {
    const g = board(o), Y = g.userData.top;
    if (live) return g;
    const back = [2, 3, 4, 7, 8, 7, 4, 3, 2];
    const put = (type, c, r, gote) => { const p = piece(type, gote, gote && type === 8); const [x, z] = cell(c, r); p.position.set(x, Y, z); g.add(p); };
    back.forEach((t, c) => { put(t, c, 0, true); put(t, c, 8, false); });
    for (let c = 0; c < 9; c++) { put(1, c, 2, true); put(1, c, 6, false); }
    put(6, 1, 1, true); put(5, 7, 1, true); put(6, 7, 7, false); put(5, 1, 7, false);
    // 駒台 (piece stands): yours at the bottom right, the opponent's at the top left — same as the rules tour
    const KH = g.userData.top, sw = standMat(g.userData.look);   // the board's own wood and tone (2026-11-10; per look 2026-11-11)
    [{ x: FW / 2 + 2.15, z: 3.7 }, { x: -FW / 2 - 2.15, z: -3.7 }].forEach(st => { const k = komadai(sw, KH); k.position.set(st.x, 0, st.z); g.add(k); });
    // in the toy room the tall board would hide the room: a little smaller than life
    g.scale.setScalar(.72);   // board + stands about the reversi board's size on the chabudai
    g.userData.viewY = g.userData.top * .72 * 1.05;   // the chabudai camera looks at the (scaled) playing surface of the legged board, like the goban
    return g;
  };

  /* ---------- top-down renders of each piece for the DOM (hands, dragging, the board itself in the skin) ---------- */
  const imgCaches = {};
  function images(px = 220, set = curSet()) {
    if (imgCaches[set]) return imgCaches[set];
    return (imgCaches[set] = Promise.all([Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]), glyphsOf(set)]).then(() => {
      // portal: the faces are drawn in a worker — build them first and wait (they are cached for the renders below)
      if (!window.AtlasTexGen) return;
      for (let type = 1; type <= 14; type++) for (const ou of type === 8 ? [false, true] : [false]) pieceMats(type, ou, set);
      return AtlasTexGen.settle();
    }).then(() => {
      const TT = T(), W = px, H = Math.round(px * CH / CW);
      const R = new TT.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setSize(W, H, false); R.setPixelRatio(1); R.outputEncoding = TT.sRGBEncoding; R.toneMapping = TT.ACESFilmicToneMapping; R.toneMappingExposure = .95;
      R.setClearColor(0x000000, 0);
      const scene = new TT.Scene();
      try {   // a soft studio for the lacquer gloss
        const env = new TT.Scene(); env.add(new TT.Mesh(new TT.SphereGeometry(20, 16, 8), new TT.MeshBasicMaterial({ color: 0x3a3226, side: TT.BackSide })));
        const p = new TT.Mesh(new TT.PlaneGeometry(14, 8), new TT.MeshBasicMaterial({ color: 0xffffff, side: TT.DoubleSide })); p.position.set(-6, 12, 8); p.lookAt(0, 0, 0); env.add(p);
        const pm = new TT.PMREMGenerator(R); scene.environment = pm.fromScene(env, .04).texture; pm.dispose();
      } catch (e) {}
      scene.add(new TT.HemisphereLight(0xfff4e0, 0x6a5038, .55));
      const key = new TT.DirectionalLight(0xffffff, 1.05); key.position.set(-3, 10, 4); scene.add(key);
      const cam = new TT.OrthographicCamera(-CW / 2, CW / 2, CH / 2, -CH / 2, .1, 20); cam.position.set(0, 8, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
      const out = {};
      for (let type = 1; type <= 14; type++) for (const ou of type === 8 ? [false, true] : [false]) {
        const p = piece(type, false, ou, set); scene.add(p);
        R.render(scene, cam); out['k' + type + (ou ? 'o' : '')] = R.domElement.toDataURL('image/png');
        scene.remove(p);
      }
      R.dispose(); R.forceContextLoss && R.forceContextLoss();
      return out;
    }));
  }

  X.shogi = { komadai, standMat, piece, board, cell, images, fontReady, GLYPHS, CW, CH, FW, FH, LOOKS, PSETS, curSet, standImg: look => LOOK[look] && LOOK[look].stand ? SH3 + 'stand-' + LOOK[look].stand + '.webp' + SH3V : LOOK[look] && LOOK[look].lacq ? SH3 + 'stand-makie.webp' + SH3V : null };
})();
