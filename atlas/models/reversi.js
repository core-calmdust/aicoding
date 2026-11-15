/* =====================================================================
   Reversi 3D — six boards, six disc sets (2026-11-15)
   Boards ('atlas-reversi-look' = Table3D.BOARDS.reversi): classic クラシック (the default: green felt, walnut bezel — table3d.js) ·
   toy 昭和のおもちゃ · ink 墨と和紙 · moon 月と夜空 · chocolate チョコレート · pixel ピクセル. The new boards keep the classic
   board's shape and wear pictures made by atlas/tools/reversi-tex.py (images/atlas/reversi3d/: field-<look> on the 8 × 8 field,
   frame-<look> on the bezel, each with a "-m" map: R height (bump), G roughness, B metalness).
   Discs ('atlas-reversi-pc3' = Table3D.PIECES.reversi): classic つや消し · toy プラスチック · ink 漆と胡粉 · moon 満月と新月 ·
   chocolate ホワイトとビター · pixel ボクセル (built from little blocks).
     Table3D.rvMats(set?)   → { W, B, build? } (set: the chosen set when left out)
     Table3D.rvDisc(mats)   → a disc, white face up (+y), centred; .R / .H as before
     Table3D.MODELS.reversi(live, look?) — the board; userData.setLook(look) switches it in place
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X || !X.MODELS || !X.MODELS.reversi || X.MODELS.reversi.six) return;
  const T = () => window.THREE;
  const LOOKS = ['classic', 'toy', 'ink', 'moon', 'chocolate', 'pixel'];
  const SETS = ['classic', 'toy', 'ink', 'moon', 'chocolate', 'pixel'];
  const base = X.MODELS.reversi, oMats = X.rvMats, oDisc = X.rvDisc, R = oDisc.R, H = oDisc.H;
  const lin = c => new (T().Color)(c).convertSRGBToLinear();

  /* ---------- pictures ---------- */
  const DIR = (() => { try { return new URL('../../images/atlas/reversi3d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/reversi3d/'; } })();
  const V = '?v=1', LO = () => !!(X.coarse || X.lite), texs = {};
  function img(name, srgb = true, near = false) {
    if (texs[name]) return texs[name];
    const TT = T(), t = new TT.TextureLoader().load(DIR + name + (LO() ? '-h' : '') + '.webp' + V, () => { if (X.kick) X.kick(300); });
    if (srgb) t.encoding = TT.sRGBEncoding; t.anisotropy = 8;
    if (near) { t.magFilter = TT.NearestFilter; t.generateMipmaps = true; }
    return (texs[name] = t);
  }
  // per board: the field's and the bezel's finish (on top of their pictures); emis: the picture also lights itself a little
  const LK = {
    toy: { f: { clearcoat: .9, clearcoatRoughness: .08, bump: .012 }, r: { clearcoat: .7, clearcoatRoughness: .12, bump: .004 } },
    ink: { f: { bump: .004 }, r: { clearcoat: 1, clearcoatRoughness: .06, bump: .002 } },
    moon: { f: { bump: .003, emis: .55 }, r: { bump: .003 } },
    chocolate: { f: { clearcoat: .25, clearcoatRoughness: .35, bump: .03 }, r: { bump: .006, emis: .3 } },
    pixel: { f: { bump: .006, near: true, emis: .15 }, r: { near: true, bump: .002 } },
  };
  const fmats = {};
  function pmat(look, part) {
    const k = part + '-' + look; if (fmats[k]) return fmats[k];
    const TT = T(), L = LK[look][part === 'field' ? 'f' : 'r'], m = img(k + '-m', false, L.near);
    const o = { map: img(k, true, L.near), roughnessMap: m, metalnessMap: m, metalness: 1, roughness: 1, bumpMap: m, bumpScale: L.bump };
    if (L.clearcoat && !X.lite) Object.assign(o, { clearcoat: L.clearcoat, clearcoatRoughness: L.clearcoatRoughness });
    if (L.emis) Object.assign(o, { emissiveMap: o.map, emissive: new TT.Color(0xffffff), emissiveIntensity: L.emis });
    return (fmats[k] = new TT[o.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](o));
  }

  /* ---------- the board ---------- */
  function board(live, look) {
    const g = base(true), kids = g.children.slice(0, 3);   // table3d.js: [bezel, base slab, field]
    const keep = kids.map(c => c.material);
    g.userData.setLook = lk => {
      if (!LOOKS.includes(lk)) lk = 'classic';
      if (lk === 'classic') kids.forEach((c, i) => { c.material = keep[i]; });
      else { kids[0].material = pmat(lk, 'frame'); kids[1].material = pmat(lk, 'frame'); kids[2].material = pmat(lk, 'field'); }
      g.userData.look = lk; if (X.kick) X.kick(300);
    };
    g.userData.setLook(look || (X.BOARDS && X.BOARDS.reversi ? X.BOARDS.reversi.get() : 'classic'));
    if (live) return g;
    // the showcase: the opening discs of the chosen set
    const S = g.userData.S, RM = mats(), pos = { 27: 0, 28: 1, 35: 1, 36: 0, 19: 1, 26: 1, 37: 0, 44: 1, 20: 0, 29: 1 };
    for (const k in pos) {
      const i = +k, x = -S / 2 + S / 8 * (i % 8 + .5), z = -S / 2 + S / 8 * ((i / 8 | 0) + .5);
      const d = disc(RM); if (!pos[k]) d.rotation.x = Math.PI;
      d.position.set(x, .425 + H / 2, z); g.add(d);
      const sh = X.contact(R); sh.position.set(x, .424, z); g.add(sh);
    }
    return g;
  }

  /* ---------- disc faces: small canvas pictures (planar on the face, as table3d.js's rvHalf UVs) ---------- */
  const cv = {};
  function face(key, W, draw, srgb = true) {
    if (cv[key]) return cv[key];
    const TT = T(), c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d'); draw(g, W);
    const t = new TT.CanvasTexture(c); if (srgb) t.encoding = TT.sRGBEncoding; t.anisotropy = 4; return (cv[key] = t);
  }
  const rnd = s => { let a = s | 0; return () => { a = (a * 1664525 + 1013904223) | 0; return ((a >>> 0) / 4294967296); }; };
  // moulded plastic: a ring step near the rim and a dimple in the middle (bump: light = raised)
  const toyBump = () => face('rvToyB', 256, (g, W) => { g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
    const c = W / 2; g.lineWidth = W * .035; g.strokeStyle = '#3a3a3a'; g.beginPath(); g.arc(c, c, W * .36, 0, 7); g.stroke();
    g.lineWidth = W * .02; g.strokeStyle = '#b8b8b8'; g.beginPath(); g.arc(c, c, W * .395, 0, 7); g.stroke();
    const r = g.createRadialGradient(c, c, 0, c, c, W * .08); r.addColorStop(0, '#5a5a5a'); r.addColorStop(1, '#808080'); g.fillStyle = r; g.beginPath(); g.arc(c, c, W * .08, 0, 7); g.fill(); }, false);
  // washi-like gofun white: paper fibres; urushi black: a ring of gold dust (maki-e) near the rim
  const gofun = () => face('rvGofun', 256, (g, W) => { g.fillStyle = '#f4efe4'; g.fillRect(0, 0, W, W); const r = rnd(5);
    g.strokeStyle = 'rgba(160,150,130,.18)'; g.lineWidth = 1; for (let i = 0; i < 260; i++) { let x = r() * W, y = r() * W, a = r() * 6.3; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { a += (r() - .5) * .6; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); } g.stroke(); } });
  const urushi = () => face('rvUrushi', 256, (g, W) => { g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, W, W); const r = rnd(9), c = W / 2;
    for (let i = 0; i < 900; i++) { const a = r() * 6.283, rr = W * (.34 + Math.pow(r(), 2) * .1) * (r() < .5 ? 1 : .98); const s = .6 + r() * 1.4; g.fillStyle = `rgba(${210 + r() * 40},${160 + r() * 40},${70 + r() * 30},${.5 + r() * .5})`; g.fillRect(c + Math.cos(a) * rr, c + Math.sin(a) * rr, s, s); } });
  // the moon: maria, craters (a dark floor, a lit rim); the new moon: the same face very dark, its rim lit by earthshine
  function moonFace(dark) {
    return face(dark ? 'rvMoonD' : 'rvMoonL', 512, (g, W) => {
      const r = rnd(dark ? 31 : 17), c = W / 2;
      g.fillStyle = dark ? '#1c2028' : '#e8e6de'; g.fillRect(0, 0, W, W);
      for (let i = 0; i < 9; i++) { const x = c + (r() - .5) * W * .6, y = c + (r() - .5) * W * .6, rr = W * (.08 + r() * .14); const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, dark ? 'rgba(10,12,18,.5)' : 'rgba(140,140,140,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
      for (let i = 0; i < 70; i++) { const x = c + (r() - .5) * W * .8, y = c + (r() - .5) * W * .8, rr = W * (.008 + Math.pow(r(), 3) * .05);
        g.fillStyle = dark ? 'rgba(8,10,14,.6)' : 'rgba(120,118,112,.55)'; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
        g.strokeStyle = dark ? 'rgba(70,80,100,.35)' : 'rgba(255,255,250,.7)'; g.lineWidth = Math.max(1, rr * .25); g.beginPath(); g.arc(x - rr * .15, y - rr * .15, rr, 3.4, 5.6); g.stroke(); }
      if (dark) { const gr = g.createRadialGradient(c, c, W * .36, c, c, W * .44); gr.addColorStop(0, 'rgba(120,150,210,0)'); gr.addColorStop(.75, 'rgba(150,180,240,.55)'); gr.addColorStop(1, 'rgba(150,180,240,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W); }
    });
  }
  // chocolate coins: a raised rim and an embossed eight-petal flower (bump)
  const chocBump = () => face('rvChocB', 256, (g, W) => { g.fillStyle = '#707070'; g.fillRect(0, 0, W, W); const c = W / 2;
    g.lineWidth = W * .05; g.strokeStyle = '#d0d0d0'; g.beginPath(); g.arc(c, c, W * .38, 0, 7); g.stroke();
    g.fillStyle = '#b0b0b0'; for (let k = 0; k < 8; k++) { g.save(); g.translate(c, c); g.rotate(k * Math.PI / 4); g.beginPath(); g.ellipse(0, -W * .15, W * .05, W * .12, 0, 0, 7); g.fill(); g.restore(); }
    g.fillStyle = '#d0d0d0'; g.beginPath(); g.arc(c, c, W * .045, 0, 7); g.fill(); }, false);

  /* ---------- voxel discs ---------- */
  function merge(list) {
    const TT = T(), pos = [], nor = [], uv = [], idx = []; let off = 0;
    for (const q of list) { const P = q.attributes.position, N = q.attributes.normal, U = q.attributes.uv, I = q.index;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U.getX(i), U.getY(i)); }
      for (let i = 0; i < I.count; i++) idx.push(I.getX(i) + off); off += P.count; q.dispose(); }
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  const vox = {};
  function voxHalf(up) {
    const k = up ? 'u' : 'd'; if (vox[k]) return vox[k];
    const TT = T(), n = 9, c = 2 * R / n, h = H / 2, list = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = -R + c * (i + .5), z = -R + c * (j + .5); if (Math.hypot(x, z) > R - c * .2) continue;
      const b = new TT.BoxGeometry(c * .96, h * .96, c * .96); b.translate(x, up ? h / 2 : -h / 2, z); list.push(b);
    }
    return (vox[k] = merge(list));
  }

  /* ---------- disc sets ---------- */
  const setCache = {};
  function mats(set) {
    if (!set) set = X.PIECES && X.PIECES.reversi ? X.PIECES.reversi.get() : 'classic';
    if (!SETS.includes(set)) set = 'classic';
    if (setCache[set]) return setCache[set];
    const TT = T(), P = (o, c) => new TT.MeshPhysicalMaterial(Object.assign({ color: lin(c), metalness: 0 }, o));
    let m;
    if (set === 'classic') m = oMats();
    else if (set === 'toy') { const b = toyBump(); m = { W: P({ roughness: .22, clearcoat: 1, clearcoatRoughness: .06, bumpMap: b, bumpScale: .004 }, 0xf6f3ea), B: P({ roughness: .2, clearcoat: 1, clearcoatRoughness: .06, bumpMap: b, bumpScale: .004 }, 0x121316) }; }
    else if (set === 'ink') m = { W: P({ map: gofun(), roughness: .92, bumpMap: gofun(), bumpScale: .0015 }, 0xffffff), B: P({ map: urushi(), roughness: .1, clearcoat: 1, clearcoatRoughness: .03 }, 0xffffff) };
    else if (set === 'moon') { const l = moonFace(false), d = moonFace(true);
      m = { W: P({ map: l, roughness: .9, bumpMap: l, bumpScale: .002, emissiveMap: l, emissive: new TT.Color(0xfff6e0), emissiveIntensity: .28 }, 0xffffff),
        B: P({ map: d, roughness: .8, bumpMap: d, bumpScale: .002, emissiveMap: d, emissive: new TT.Color(0xffffff), emissiveIntensity: .45 }, 0xffffff) }; }
    else if (set === 'chocolate') { const b = chocBump(); m = { W: P({ roughness: .38, bumpMap: b, bumpScale: .006, sheen: .4, sheenColor: lin(0xfff4dc) }, 0xf1e1bd), B: P({ roughness: .3, bumpMap: b, bumpScale: .006, clearcoat: .3, clearcoatRoughness: .3 }, 0x3b1f13) }; }
    else { m = { W: P({ roughness: .55 }, 0xf2f0ea), B: P({ roughness: .5 }, 0x1d1e24) }; m.build = () => { const g = new (T().Group)(), w = new TT.Mesh(voxHalf(true), m.W), b = new TT.Mesh(voxHalf(false), m.B); [w, b].forEach(x => { x.castShadow = x.receiveShadow = true; }); g.add(w, b); return g; }; }
    m.set = set;
    return (setCache[set] = m);
  }
  function disc(m) { return m && m.build ? m.build() : oDisc(m || mats()); }
  disc.R = R; disc.H = H;

  X.rvMats = mats; X.rvDisc = disc;
  X.MODELS.reversi = board; board.six = true;
  X.reversi = { LOOKS, SETS, board, mats, disc };
})();
