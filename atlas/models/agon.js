/* =====================================================================
   Agon (Queen's Guard, London 1842) on the 3D table — two boards from the 2D page's own art
   (agon/tools/gen_art.py writes agon/img/3d-<look>-c|n|r.webp: the unlit colours, a normal map of
   its height field, roughness / metalness):
     'folk'       an American folk-art panel: milk paint on one thick pine board, a hundred years of
                  hands on it — craquelure, paint worn to the gesso and to the wood, a split along the
                  grain, chipped corners and a ragged, knocked edge; the sides bare, grimy pine with
                  drips of the teal ground. Pieces: milk-painted turned discs (cream with red rings,
                  black with mustard) and hexagonal queens with a painted crown.
     'victorian'  the 1842 London parlour board: a lithographed field of oxblood and ivory rings under
                  old varnish, laid in a polished mahogany board with a moulded edge, gilt rules,
                  corner fleurons and the gilt hexagram on the green throne. Pieces: turned bone and
                  ebony discs with lathe rings, hexagonal queens with a carved crown (bone inlay on ebony).
   Registers into Table3D:
     Table3D.MODELS.agon(live)   the Victorian board (+ a game in progress unless live)
     Table3D.agon = { board(look), piece(look, kind), B, R }
     userData: { look, B, top, pt(x, y) → [x, z] (hex units: x right, y down, 0,0 = the throne), piece(kind) }
   Units: one hex step (centre to centre) is 1.0; the board is 12.8 square (the 2D picture, 80 px a step).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const B = 12.8, R = .42, QR = .46, GH = .15, QH = .19;
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../agon/img/', s).href; } catch (e) {} return '../agon/img/'; })();
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  // a seeded random and value noise (the knocked edge, the side textures)
  const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const NZ = X.makeNoise ? X.makeNoise(1842) : ((x, y) => .5 + .25 * Math.sin(x * 3.1 + y * 1.7) * Math.cos(y * 2.3 - x));

  /* ---------- the maps from gen_art.py ---------- */
  const maps = {};
  function topMaps(look) {
    if (maps[look]) return maps[look];
    const TT = T(), L = new TT.TextureLoader(), done = () => { if (X.kick) X.kick(300); };
    const ld = (k, srgb) => { const t = L.load(IMG + `3d-${look}-${k}.webp`, done); if (srgb) t.encoding = TT.sRGBEncoding; t.anisotropy = 8; return t; };
    return (maps[look] = { c: ld('c', true), n: ld('n'), r: ld('r') });
  }

  /* ---------- side textures (canvas): grimy bare pine with teal drips / polished mahogany ---------- */
  function sideTex(look) {
    return X.canvasTex('agSide-' + look, SZ(1024), SZ(128), (g, W, H) => {
      const img = g.createImageData(W, H), d = img.data, folk = look === 'folk';
      const A = folk ? [176, 134, 86] : [112, 48, 30], Bc = folk ? [118, 84, 48] : [62, 24, 14];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, w = NZ(u * 6, v * 2.5, 3) * 1.4;
        const ring = Math.pow(.5 + .5 * Math.sin((v * (folk ? 2.2 : 11) + w + NZ(u * 40, v * 1.5, 2) * .3) * Math.PI * 2), folk ? 4 : 5);
        const fib = NZ(u * 140, v * 9, 2), streak = NZ(u * 4, v * 30, 3);
        let k = Math.min(1, Math.max(0, (folk ? .35 + .12 * ring + .45 * (streak - .5) : .35 + .45 * ring) + .25 * (fib - .5)));
        let r = A[0] + (Bc[0] - A[0]) * k, gg = A[1] + (Bc[1] - A[1]) * k, b = A[2] + (Bc[2] - A[2]) * k;
        if (folk) {
          // the teal ground ran over the top edge and was knocked off in patches; grime and handling near the top
          const drip = (1 - v) * 1.3 + (NZ(u * 30, 3.1, 3) - .5) * 1.2 - (NZ(u * 9, 7.7, 2) - .5) * 1.2 - 1.0, pd = Math.min(1, Math.max(0, drip * 3));
          const keep = NZ(u * 55, v * 9 + 5, 3) > .42 ? 1 : .15;
          r += (48 - r) * pd * keep * .85; gg += (76 - gg) * pd * keep * .85; b += (68 - b) * pd * keep * .85;
          const gr = .8 + .25 * NZ(u * 12, v * 4 + 9, 3) - .25 * Math.max(0, .25 - v) * 4; r *= gr; gg *= gr; b *= gr * .95;
          if (NZ(u * 300, v * 30, 1) > .93) { r *= .55; gg *= .5; b *= .45; }   // dents, nail holes, dirt
        } else {
          const sh = .9 + .2 * NZ(u * 3, v * .7, 2); r *= sh; gg *= sh; b *= sh;
        }
        const i = (y * W + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      if (!folk) {   // a gilt line along the top of the moulding
        g.fillStyle = 'rgba(214,176,98,.9)'; g.fillRect(0, H * .06, W, Math.max(1, H * .02));
      }
    });
  }

  /* ---------- the board ---------- */
  // the outline: the Victorian board a clean rounded square; the folk panel knocked about — a ragged edge, chips, a rounded-off corner
  function outline(look) {
    const TT = T(), sh = new TT.Shape(), h = B / 2;
    if (look !== 'folk') {
      const a = h - .18; sh.moveTo(-a, -h); sh.lineTo(a, -h); sh.absarc(a, -a, .18, -Math.PI / 2, 0, false); sh.lineTo(h, a); sh.absarc(a, a, .18, 0, Math.PI / 2, false);
      sh.lineTo(-a, h); sh.absarc(-a, a, .18, Math.PI / 2, Math.PI, false); sh.lineTo(-h, -a); sh.absarc(-a, -a, .18, Math.PI, Math.PI * 1.5, false);
      return sh;
    }
    const rr = rnd(77), step = LO() ? .14 : .07, pts = [];
    // chips: [side (0 bottom, 1 right, 2 top, 3 left), position −1..1, half-width, depth]
    const chips = [[0, .55, .35, .16], [1, .72, .25, .1], [1, -.3, .5, .07], [2, -.6, .22, .12], [3, .1, .4, .06], [0, -.8, .18, .09], [2, .35, .6, .05]];
    const cornerR = [.22, .62, .3, .16];   // rounded-off corners (bottom-left, bottom-right, top-right, top-left) — the bottom right one most handled
    // walk the square anticlockwise in plan (x right, shape y = −z: shape y up = far edge)
    const corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = corners[s], [x1, y1] = corners[(s + 1) % 4], L = B, n = Math.ceil(L / step);
      const nx = (y1 - y0) / L, ny = -(x1 - x0) / L;   // outward normal
      const sideIdx = s === 0 ? 0 : s === 1 ? 1 : s === 2 ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, p = t * 2 - 1;
        let dent = .012 + .03 * NZ(t * 40 + s * 13, 1.3, 3) + (rr() < .05 ? rr() * .05 : 0);
        for (const [cs, cp, cw, cd] of chips) if (cs === sideIdx && Math.abs(p - cp) < cw) { const q = 1 - Math.abs(p - cp) / cw; dent += cd * Math.pow(q, .6) * (.8 + .4 * NZ(t * 90, s, 2)); }
        // corner rounding: within cornerR of either end
        const ce = [cornerR[s], cornerR[(s + 1) % 4]], dA = t * L, dB = (1 - t) * L;
        if (dA < ce[0]) dent += ce[0] - Math.sqrt(Math.max(0, ce[0] * ce[0] - (ce[0] - dA) * (ce[0] - dA)));
        if (dB < ce[1]) dent += ce[1] - Math.sqrt(Math.max(0, ce[1] * ce[1] - (ce[1] - dB) * (ce[1] - dB)));
        pts.push([x - nx * dent, y - ny * dent]);
      }
    }
    sh.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
    return sh;
  }
  // the slab, split in two meshes: the top (the flat face and the upper, rounded part of the edge: the 2D picture) and the sides
  function slabGeos(look) {
    const TT = T(), folk = look === 'folk', TH = folk ? .6 : .5, bv = folk ? .05 : .11;
    const g0 = new TT.ExtrudeGeometry(outline(look), { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .004, bevelSegments: folk ? (LO() ? 2 : 3) : (LO() ? 3 : 6), curveSegments: LO() ? 4 : 8, steps: 1 });
    g0.rotateX(-Math.PI / 2); g0.translate(0, bv, 0);
    const k = (B - .004) / (B + 2 * (bv - .004)); g0.scale(k, 1, k);
    const g = g0.index ? g0.toNonIndexed() : g0; g.computeVertexNormals(); smoothN(g, .5);
    const P = g.attributes.position, N = g.attributes.normal, n = P.count / 3, top = [], side = [];
    for (let t = 0; t < n; t++) {
      let ny = 0, yy = 0; for (let j = 0; j < 3; j++) { ny += N.getY(t * 3 + j); yy += P.getY(t * 3 + j); }
      (ny / 3 > .5 && yy / 3 > TH * .5 ? top : side).push(t);
    }
    const build = (tris, uvf) => {
      const gg = new TT.BufferGeometry(), p = new Float32Array(tris.length * 9), nn = new Float32Array(tris.length * 9), uv = new Float32Array(tris.length * 6);
      tris.forEach((t, i) => { for (let j = 0; j < 3; j++) { const s = t * 3 + j, o = (i * 3 + j); p.set([P.getX(s), P.getY(s), P.getZ(s)], o * 3); nn.set([N.getX(s), N.getY(s), N.getZ(s)], o * 3); const [u, v] = uvf(P.getX(s), P.getY(s), P.getZ(s), N.getX(s), N.getZ(s)); uv[o * 2] = u; uv[o * 2 + 1] = v; } });
      gg.setAttribute('position', new TT.BufferAttribute(p, 3)); gg.setAttribute('normal', new TT.BufferAttribute(nn, 3)); gg.setAttribute('uv', new TT.BufferAttribute(uv, 2));
      gg.computeBoundingSphere(); return gg;
    };
    const topG = build(top, (x, y, z) => [x / B + .5, .5 - z / B]);
    // the sides: u runs round the board (the grain along each edge), v up the edge
    const sideG = build(side, (x, y, z, nx, nz) => { const along = Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? -z : z) + (nx > 0 ? B : 3 * B) : (nz > 0 ? x : -x) + (nz > 0 ? 0 : 2 * B); return [along / (B * 1.4), y / TH]; });
    g0.dispose(); if (g !== g0) g.dispose();
    return { topG, sideG, TH };
  }
  // smooth the normals across faces that meet at less than a crease angle (the extrusion is non-indexed: flat bands otherwise)
  function smoothN(g, cosMin) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, n = P.length / 3, map = new Map(), key = i => Math.round(P[i * 3] * 2e3) + ',' + Math.round(P[i * 3 + 1] * 2e3) + ',' + Math.round(P[i * 3 + 2] * 2e3);
    for (let i = 0; i < n; i++) { const k = key(i); let a = map.get(k); if (!a) map.set(k, a = []); a.push(i); }
    const out = new Float32Array(N.length);
    for (let i = 0; i < n; i++) {
      const a = map.get(key(i)), nx = N[i * 3], ny = N[i * 3 + 1], nz = N[i * 3 + 2]; let sx = 0, sy = 0, sz = 0;
      for (const j of a) { const mx = N[j * 3], my = N[j * 3 + 1], mz = N[j * 3 + 2]; if (mx * nx + my * ny + mz * nz >= cosMin) { sx += mx; sy += my; sz += mz; } }
      const l = Math.hypot(sx, sy, sz) || 1; out[i * 3] = sx / l; out[i * 3 + 1] = sy / l; out[i * 3 + 2] = sz / l;
    }
    N.set(out); g.attributes.normal.needsUpdate = true;
  }
  function board(look) {
    look = look === 'folk' ? 'folk' : 'victorian';
    const TT = T(), g = new TT.Group(), m = topMaps(look), folk = look === 'folk';
    const { topG, sideG, TH } = slabGeos(look);
    const topM = mat('top-' + look, () => phys(Object.assign({ map: m.c, normalMap: m.n, normalScale: new TT.Vector2(folk ? 1.1 : .9, folk ? 1.1 : .9), roughnessMap: m.r, metalnessMap: m.r, roughness: 1, metalness: 1, color: 0xffffff, envMapIntensity: folk ? .7 : 1.15 },
      folk ? {} : { clearcoat: .55, clearcoatRoughness: .22 })));
    const sideM = mat('side-' + look, () => phys(folk ? { map: sideTex(look), roughness: .86, metalness: 0, color: 0xffffff, envMapIntensity: .6 } : { map: sideTex(look), roughness: .3, metalness: 0, clearcoat: .7, clearcoatRoughness: .12, color: 0xffffff, envMapIntensity: 1.1 }));
    const top = new TT.Mesh(topG, topM), side = new TT.Mesh(sideG, sideM);
    top.castShadow = top.receiveShadow = side.castShadow = side.receiveShadow = true;
    g.add(top, side);
    g.userData = { look, B, top: TH + .002, pt: (x, y) => [x, y], piece: kind => piece(look, kind) };
    return g;
  }

  /* ---------- the pieces ---------- */
  const geos = {};
  const gkey = k => k + (LO() ? '-lo' : '');
  // a turned guard: a disc with a softly rounded edge; the bone / ebony ones with lathe rings on the face, the folk ones flat (painted)
  function guardGeo(turned) {
    const key = gkey('g' + (turned ? 't' : 'f')); if (geos[key]) return geos[key];
    const TT = T(), p = [[0, 0], [R - .04, 0], [R - .01, .012], [R, .04], [R + .004, GH * .5], [R - .002, GH - .04]];
    const st = LO() ? 3 : 5; for (let i = 1; i <= st; i++) { const a = i / st * Math.PI / 2; p.push([R - .035 + Math.cos(a) * .033, GH - .04 + Math.sin(a) * .04]); }
    if (turned) {   // the face: a raised rim, two V rings, a dished centre and a small boss
      p.push([R * .86, GH], [R * .8, GH - .012], [R * .74, GH], [R * .56, GH], [R * .5, GH - .014], [R * .44, GH], [R * .3, GH - .004], [R * .16, GH - .016], [R * .1, GH - .006], [R * .06, GH + .004], [0, GH + .006]);
    } else p.push([R * .9, GH + .002], [R * .5, GH + .004], [0, GH + .004]);
    const g = new TT.LatheGeometry((X.lp || (a => a))(p, .003).map(([a, b]) => new TT.Vector2(a, b)), LO() ? 20 : 28); if (X.share) X.share(g); return (geos[key] = g);
  }
  // the queen: a hexagonal block (pointy-top, as the cells) with a bevelled top
  function queenGeo() {
    const key = gkey('q'); if (geos[key]) return geos[key];
    const TT = T(), sh = new TT.Shape(), bv = .035;
    for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3, x = Math.cos(a) * (QR - bv), y = Math.sin(a) * (QR - bv); k ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    const g = new TT.ExtrudeGeometry(sh, { depth: QH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: LO() ? 2 : 4, steps: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    const P = g.attributes.position, UV = g.attributes.uv;   // planar top UVs (the painted / grained face)
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (QR * 2) + .5, .5 - P.getZ(i) / (QR * 2));
    if (X.share) X.share(g); return (geos[key] = g);
  }
  // the crown: a five-pointed coronet with pearls, lying on the queen's face, its top towards the far edge
  function crownGeo() {
    const key = gkey('cr'); if (geos[key]) return geos[key];
    const TT = T(), s = 1.22, sh = new TT.Shape(), P = [[-.17, -.1], [.17, -.1], [.17, -.055], [.2, .085], [.11, -.005], [.085, .1], [.03, .005], [0, .13], [-.03, .005], [-.085, .1], [-.11, -.005], [-.2, .085], [-.17, -.055]];
    P.forEach(([x, y], i) => i ? sh.lineTo(x * s, y * s) : sh.moveTo(x * s, y * s));
    const g = new TT.ExtrudeGeometry(sh, { depth: .018, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: LO() ? 1 : 2, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); g.translate(0, .008, .01);
    const ps = [[.2, .085], [.085, .1], [0, .13], [-.085, .1], [-.2, .085]].map(([x, y]) => { const b = new TT.SphereGeometry(.019, 8, 6); b.translate(x * s, .03, -y * s + .01); return b; });
    const m = mergeGeos([g, ...ps]); if (X.share) X.share(m); return (geos[key] = m);
  }
  function mergeGeos(list) {   // (r128 core has no mergeBufferGeometries: positions + normals only)
    const TT = T(), parts = list.map(x => x.index ? x.toNonIndexed() : x);
    let n = 0; parts.forEach(x => n += x.attributes.position.count);
    const p = new Float32Array(n * 3), nn = new Float32Array(n * 3); let o = 0;
    parts.forEach(x => { p.set(x.attributes.position.array, o * 3); nn.set(x.attributes.normal.array, o * 3); o += x.attributes.position.count; });
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.BufferAttribute(p, 3)); g.setAttribute('normal', new TT.BufferAttribute(nn, 3)); g.computeBoundingSphere();
    list.forEach(x => x.dispose()); return g;
  }
  function faceGeo() { const key = gkey('face'); if (geos[key]) return geos[key]; const g = new (T().CircleGeometry)(R * .9, LO() ? 28 : 48); g.rotateX(-Math.PI / 2); if (X.share) X.share(g); return (geos[key] = g); }

  // bone / ebony: fine streaks along the grain
  function grainTex(key, base, streak, k) {
    return X.canvasTex(key, SZ(256), SZ(256), (g, W, H) => {
      const img = g.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, s = NZ(u * 3, v * 60, 3), s2 = NZ(u * 20 + 4, v * 200, 2), t = Math.min(1, Math.max(0, (s - .35) * k + (s2 - .5) * .4));
        const i = (y * W + x) * 4; for (let c = 0; c < 3; c++) d[i + c] = base[c] + (streak[c] - base[c]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // the folk pieces' painted faces: cream with red rings and a red dot / black with mustard; worn, crazed, wood showing at the edge
  function folkFace(side, queen) {
    return X.canvasTex('agFolk' + side + (queen ? 'q' : 'g'), SZ(512), SZ(512), (g, W) => {
      const c = W / 2, bg = side === 1 ? '#e2d4ae' : '#1f1c18', ink = side === 1 ? '#a8302a' : '#c99228';
      const gr = g.createRadialGradient(c * .8, c * .75, 0, c, c, c); gr.addColorStop(0, side === 1 ? '#ece0bf' : '#2b2722'); gr.addColorStop(1, bg); g.fillStyle = gr; g.fillRect(0, 0, W, W);
      g.strokeStyle = ink; g.fillStyle = ink;
      if (!queen) {
        g.lineWidth = W * .07; g.beginPath(); g.arc(c, c, W * .36, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(c, c, W * .12, 0, Math.PI * 2); g.fill();
      } else {   // the painted crown (upright on the face), a thin line round the hexagon
        const s = W * 1.1; g.beginPath();
        [[-.17, -.1], [.17, -.1], [.17, -.055], [.2, .085], [.11, -.005], [.085, .1], [.03, .005], [0, .13], [-.03, .005], [-.085, .1], [-.11, -.005], [-.2, .085], [-.17, -.055]].forEach(([x, y], i) => { const px = c + x * s, py = c - y * s + W * .02; i ? g.lineTo(px, py) : g.moveTo(px, py); });
        g.closePath(); g.fill();
        [[.2, .085], [.085, .1], [0, .13], [-.085, .1], [-.2, .085]].forEach(([x, y]) => { g.beginPath(); g.arc(c + x * s, c - y * s + W * .02 - W * .025, W * .025, 0, Math.PI * 2); g.fill(); });
        g.lineWidth = W * .02; g.beginPath(); for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3, x = c + Math.cos(a) * W * .41, y = c + Math.sin(a) * W * .41; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      }
      // wear: craquelure, chips through to the pine, a rubbed rim
      const r = rnd(side * 7 + (queen ? 3 : 1));
      g.strokeStyle = side === 1 ? 'rgba(70,50,30,.45)' : 'rgba(150,130,100,.28)'; g.lineWidth = W * .003;
      for (let k = 0; k < 160; k++) { let x = r() * W, y = r() * W; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - .5) * W * .08; y += (r() - .5) * W * .08; g.lineTo(x, y); } g.stroke(); }
      for (let k = 0; k < 26; k++) { const a = r() * Math.PI * 2, rr = W * (.25 + r() * .25), x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr; g.fillStyle = `rgba(${170 + r() * 30 | 0},${125 + r() * 25 | 0},${78 + r() * 20 | 0},${.6 + r() * .4})`; g.beginPath(); g.ellipse(x, y, W * (.006 + r() * .022), W * (.004 + r() * .014), r() * 3, 0, Math.PI * 2); g.fill(); }
      const rim = g.createRadialGradient(c, c, W * .38, c, c, W * .5); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, side === 1 ? 'rgba(120,85,45,.55)' : 'rgba(150,110,60,.4)'); g.fillStyle = rim; g.fillRect(0, 0, W, W);
    });
  }
  function pieceMats(look, side) {
    const TT = T();
    if (look === 'folk') {
      const body = mat('fb' + side, () => phys({ color: side === 1 ? '#d9c9a2' : '#221e1a', roughness: .82, metalness: 0, envMapIntensity: .6 }));
      return { body, face: q => mat('ff' + side + q, () => { const m = phys({ map: folkFace(side, q), color: 0xffffff, roughness: .8, metalness: 0, envMapIntensity: .6 }); m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6; return m; }), crown: null };   // (painted faces drawn in front: no flicker from afar)
    }
    const bone = () => phys({ map: grainTex('agBone', [233, 222, 196], [204, 188, 156], 2.2), color: 0xffffff, roughness: .36, metalness: 0, clearcoat: .35, clearcoatRoughness: .3, envMapIntensity: 1.05 });
    const ebony = () => phys({ map: grainTex('agEbony', [30, 25, 22], [58, 44, 34], 1.6), color: 0xffffff, roughness: .26, metalness: 0, clearcoat: .7, clearcoatRoughness: .12, envMapIntensity: 1.1 });
    const body = side === 1 ? mat('bone', bone) : mat('ebony', ebony);
    // the crown: an ebony inlay on the bone queen, a bone inlay on the ebony one
    const crown = mat('crown' + side, () => phys(side === 1 ? { map: grainTex('agEbony', [30, 25, 22], [58, 44, 34], 1.6), color: 0xffffff, roughness: .26, metalness: 0, clearcoat: .7, clearcoatRoughness: .12, envMapIntensity: 1.1 } : { color: '#efe3c4', roughness: .3, metalness: 0, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.1 }));
    return { body, face: null, crown };
  }
  // kind: 1 White guard, 2 White queen, 3 Black guard, 4 Black queen (agon/app.js)
  function piece(look, kind) {
    look = look === 'folk' ? 'folk' : 'victorian';
    const TT = T(), g = new TT.Group(), side = kind <= 2 ? 1 : 2, queen = kind === 2 || kind === 4, M = pieceMats(look, side), folk = look === 'folk';
    const h = queen ? QH : GH;
    if (queen) {
      const body = new TT.Mesh(queenGeo(), folk ? [M.face(true), M.body] : M.body); body.castShadow = body.receiveShadow = true; g.add(body);
      if (!folk) { const cr = new TT.Mesh(crownGeo(), M.crown); cr.position.y = QH; cr.castShadow = true; g.add(cr); }
    } else {
      const body = new TT.Mesh(guardGeo(!folk), M.body); body.castShadow = body.receiveShadow = true; g.add(body);
      if (folk) { const f = new TT.Mesh(faceGeo(), M.face(false)); f.position.y = GH + .009; f.receiveShadow = true; g.add(f); }
    }
    g.userData = { kind, side, queen, h };
    return g;
  }

  X.MODELS.agon = function (live) {
    const look = !live && X.BOARDS && X.BOARDS.agon ? X.BOARDS.agon.get() : 'victorian';   // the showcase: the chosen 3D board
    const g = board(look), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress: White's queen near the throne with guards gathering, Black closing in
    const XC = (q, r) => [q + r / 2, r * Math.sqrt(3) / 2];
    const put = (q, r, kind) => { const p = piece(look, kind), [x, z] = XC(q, r); p.position.set(x, Y, z); g.add(p); const sh = X.contact(R * .95, .5); sh.position.set(x, Y + .001, z); g.add(sh); };
    put(1, -1, 2); put(0, -1, 1); put(2, -1, 1); put(1, 0, 1); put(-2, 3, 1); put(4, -5, 1); put(-5, 2, 1);
    put(-1, 0, 4); put(0, 1, 3); put(2, -2, 3); put(-2, 1, 3); put(3, 1, 3); put(-4, 0, 3); put(1, 3, 3);
    g.scale.setScalar(.74);
    return g;
  };
  X.agon = { board, piece, B, R, QR, GH, QH };
})();
