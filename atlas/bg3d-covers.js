/* atlas/bg3d-covers.js — 512×512 soft-3D "cover" dioramas for the profile backgrounds (b086 … b099).
   window.BG3D_COVERS[pattern](colourName, COL) → { scene, camera, size: 512, mode: 'cover' }
   Same plush look as the two original skies in bg3d.js (b024 / b028). Composition rule: the centre (character circle)
   and the bottom-centre (name text) stay calm; decoration lives along the left/right edges, the top and the ground. */
(function () {
  'use strict';
  if (!window.THREE || !window.BG3D || !window.Icons3D) return;
  const K = BG3D.KIT, IK = Icons3D.KIT, T = IK.T, blob = K.blob, mesh = K.mesh;
  const soft = (hex, o = {}) => K.soft(hex, Object.assign({ wrap: .7, rim: .16 }, o));

  /* ---------------- shared stage ---------------- */
  function stage(key, stops, L = {}) {
    const scene = new T.Scene();
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 50); cam.position.set(0, 0, 20); cam.lookAt(0, 0, 0);
    const back = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), new T.MeshBasicMaterial({ map: K.gradTex(key, stops), toneMapped: false }));
    back.position.z = -10; scene.add(back);
    scene.add(new T.HemisphereLight(L.sky ?? 0xffffff, L.ground ?? 0xd8d0e0, L.hemi ?? .66));
    const kl = new T.DirectionalLight(L.key ?? 0xfff4e0, L.keyI ?? .44); kl.position.set(-6, 9, 12); scene.add(kl);
    let s = L.seed || 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const glow = (tex, x, y, z, w, h = w, op = 1) => {
      const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op, blending: T.AdditiveBlending, toneMapped: false }));
      p.position.set(x, y, z); scene.add(p); return p;
    };
    const flatGrad = (k, st, x, y, z, w, h) => { const p = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: K.gradTex(k, st), toneMapped: false })); p.position.set(x, y, z); scene.add(p); return p; };
    const out = () => ({ scene, camera: cam, size: 512, mode: 'cover' });
    return { scene, glow, flatGrad, rnd, out };
  }
  const glowC = (key, r, g, b, k = 1) => K.glowTex(key, a => `rgba(${r},${g},${b},${a * k})`);
  const noSh = m => { m.castShadow = m.receiveShadow = false; return m; };
  // a puffy extruded 2D shape (sails, roofs, fins)
  function puffy(mat, pts, depth, bev) {
    const sh = new T.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 6, curveSegments: 8 });
    geo.translate(0, 0, -depth / 2); geo.computeVertexNormals(); return noSh(mesh(geo, mat));
  }
  const at = (o, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.multiplyScalar(s); return o; };
  const star = (sc, mat, x, y, z, r, rot = 0) => { const s = K.puffyStar(mat, r, r * .25); s.position.set(x, y, z); s.rotation.z = rot; sc.add(s); return s; };
  const spark = (sc, list, z = 1.2) => list.forEach(([x, y, r]) => IK.sparkle(sc, [x, y, z], r));

  /* ---------------- props ---------------- */
  function flower(petal, centre, s, n = 5) {
    const g = new T.Group(), pm = soft(petal, { under: centre === 0xffe07a ? 0xffb3c8 : 0xffd0a0, uk: .3, glow: .04 }), cm = soft(centre, { glow: .06 });
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3; blob(g, pm, [Math.cos(a) * .55, Math.sin(a) * .55, 0], [.42, .42, .22]); }
    blob(g, cm, [0, 0, .12], [.36, .36, .26]); g.scale.setScalar(s); return g;
  }
  function tree(leaf, under, trunk, s, snowy) {
    const g = new T.Group();
    IK.sq(g, soft(trunk, { under: 0x8a5a3a, uk: .4 }), [0, -.62, -.05], [.2, .5, .2], .5);
    const lm = soft(leaf, { under, uk: .55, glow: .03 });
    if (snowy) {   // stacked puffy tiers dusted with snow
      const sm = soft(0xffffff, { under: 0xc6d6f0, uk: .6, glow: .05 });
      [[-.35, .62, .44], [.02, .5, .36], [.34, .36, .27]].forEach(([y, w, d]) => { blob(g, lm, [0, y, 0], [w, d * .62, w * .55]); blob(g, sm, [0, y + d * .32, .08], [w * .86, d * .42, w * .5]); });
      blob(g, sm, [0, .58, .02], [.13, .13, .12]);
    } else {
      blob(g, lm, [0, .05, 0], [.5, .52, .4]); blob(g, lm, [-.28, -.12, .12], [.3, .3, .26]); blob(g, lm, [.3, -.08, .1], [.3, .3, .26]);
    }
    g.scale.setScalar(s); return g;
  }
  function hill(sc, hex, under, x, y, z, rx, ry) { blob(sc, soft(hex, { under, uk: .5, glow: .02, rim: .12 }), [x, y, z], [rx, ry, .3]); }
  function snowflake(sc, x, y, z, r, rot = 0) {
    const g = new T.Group(), m = soft(0xffffff, { under: 0xcfe0ff, uk: .4, glow: .25, rim: .3 });
    for (let i = 0; i < 3; i++) blob(g, m, [0, 0, 0], [r, r * .13, r * .13], [0, 0, i * Math.PI / 3]);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; blob(g, m, [Math.cos(a) * r * .62, Math.sin(a) * r * .62, 0], [r * .28, r * .1, r * .1], [0, 0, a + Math.PI / 2]); }
    blob(g, m, [0, 0, 0], [r * .22, r * .22, r * .16]);
    g.position.set(x, y, z); g.rotation.z = rot; sc.add(g);
  }
  // a row of puffy wave humps across the sea with foam caps
  function waveRow(sc, y, z, r, hex, under, foam, rnd, phase = 0, foamHex = 0xffffff) {
    const wm = soft(hex, { under, uk: .55, glow: .03, rim: .2 }), fm = soft(foamHex, { under: hex, uk: .35, glow: .14, rim: .3 });
    for (let x = -1.2 + phase; x < 1.25; x += r * (1.25 + rnd() * .5)) {
      const k = .8 + rnd() * .4, yy = y + (rnd() - .5) * r * .25, zz = z + rnd() * .2;
      blob(sc, wm, [x, yy, zz], [r * k * 1.05, r * k * .5, r * .5]);
      if (foam && rnd() > .3) blob(sc, fm, [x - r * k * .25, yy + r * k * .4, zz + r * .32], [r * k * .32, r * k * .09, r * .12], [0, 0, .32]);
    }
  }
  function boat(hull, sail, s) {
    const g = new T.Group();
    blob(g, soft(hull, { under: 0x9a5a5a, uk: .5 }), [0, 0, 0], [.42, .13, .16]);
    IK.sq(g, soft(hull, { under: 0x9a5a5a, uk: .5 }), [0, .03, 0], [.86, .14, .3], .4);
    IK.sq(g, soft(0xc9935e, {}), [.02, .38, 0], [.035, .66, .035], .5);
    const sm = soft(sail, { under: 0xd8c8ff, uk: .35, glow: .08 });
    g.add(at(puffy(sm, [[.06, .68], [.06, .16], [.42, .16]], .03, .03), 0, 0, 0));
    g.add(at(puffy(sm, [[-.02, .62], [-.02, .18], [-.3, .18]], .03, .03), 0, 0, 0));
    blob(g, soft(0xff8fa8, {}), [.08, .74, 0], [.07, .035, .02]);
    g.scale.setScalar(s); return g;
  }
  function island(s) {
    const g = new T.Group();
    blob(g, soft(0xffe2a8, { under: 0xe0a86a, uk: .5 }), [0, 0, 0], [.55, .2, .3]);
    blob(g, soft(0x9fe0a0, { under: 0x5fae7a, uk: .5 }), [-.18, .12, .05], [.24, .14, .2]);
    const tm = soft(0xc89a6a, { under: 0x8a5a3a, uk: .4 });
    [[.12, .2], [.16, .36], [.19, .52], [.2, .66]].forEach(([x, y], i) => blob(g, tm, [x, y, .05], [.065 - i * .006, .09, .06]));
    const lm = soft(0x7fd48a, { under: 0x3f9a6a, uk: .5, glow: .03 });
    [[-.55, .25], [-.15, .55], [.25, .45], [.6, .05], [.95, .35]].forEach(([a, tilt]) => blob(g, lm, [.2 + Math.cos(a + 1.6) * .17, .74 + Math.sin(a + 1.6) * .05 - tilt * .1, .08], [.2, .055, .05], [0, 0, a + 1.6 + (a > .3 ? -.4 : .4)]));
    blob(g, soft(0x9a6a40, {}), [.17, .68, .12], [.04, .04, .04]);
    g.scale.setScalar(s); return g;
  }
  // toy building: marshmallow cube body + puffy prism roof + windows
  function house(o, night) {
    const g = new T.Group(), w = o.w, h = o.h;
    IK.sq(g, soft(o.body, { under: o.under, uk: .5, glow: night ? .0 : .02 }), [0, h / 2, 0], [w, h, w * .9], .28);
    const rm = soft(o.roof, { under: o.roofU, uk: .5, glow: .02 });
    if (o.tower) {
      const c = noSh(mesh(new T.ConeGeometry(w * .68, w * .95, 28, 1), rm)); c.position.set(0, h + w * .45, 0); g.add(c);
      blob(g, rm, [0, h + .02, 0], [w * .66, w * .1, w * .6]);
      IK.sq(g, soft(0xffffff, {}), [0, h + w * .98, 0], [.012, .14, .012], .5);
      g.add(at(puffy(soft(o.flag || 0xff8fa8, { glow: .05 }), [[0, 0], [.12, -.035], [0, -.07]], .006, .008), .006, h + w * 1.04, 0));
    } else g.add(at(puffy(rm, [[-w * .62, 0], [w * .62, 0], [0, w * .55]], w * .8, .03), 0, h - .01, 0));
    const winM = night ? IK.M({ color: 0xffe6a0, emissive: 0xffc860, emissiveIntensity: .95 }) : soft(0xdff3ff, { under: 0x9cc9ee, uk: .4, glow: .1 });
    const fz = w * .45;
    (o.win || [[0, .62]]).forEach(([fx, fy]) => { IK.sq(g, winM, [fx * w, fy * h, fz], [w * .26, w * .26, .03], .35); });
    if (o.door) IK.sq(g, soft(o.door, { under: 0x8a5a3a, uk: .4 }), [o.doorX ? o.doorX * w : 0, w * .17, fz], [w * .26, w * .36, .03], .35);
    g.userData.wins = (o.win || [[0, .62]]).map(([fx, fy]) => [fx * w, fy * h, fz]);
    g.position.set(o.x, o.y, o.z); g.rotation.set(.12, o.ry || 0, 0); g.scale.setScalar(o.s || 1); return g;
  }
  function die(s, body, pip) {
    const g = new T.Group(), bm = soft(body, { under: 0xd8c8e8, uk: .45, glow: .03 }), pm = soft(pip, { rough: .7 });
    IK.sq(g, bm, [0, 0, 0], [.2, .2, .2], .28);
    const P = (p, R) => blob(g, pm, p, R);
    [[-.05, .05], [0, 0], [.05, -.05]].forEach(([x, y]) => P([x, y, .099], [.018, .018, .006]));   // front: 3
    [[-.05, -.05], [.05, .05]].forEach(([x, z]) => P([x, .099, z], [.018, .006, .018]));          // top: 2
    [[-.05, -.05], [-.05, .05], [.05, -.05], [.05, .05]].forEach(([y, z]) => P([.099, y, z], [.006, .018, .018]));   // side: 4
    g.rotation.set(.45, -.55, 0); g.scale.setScalar(s); return g;
  }
  function pawn(hex, under, s) {
    const g = new T.Group(), m = soft(hex, { under, uk: .5, glow: .03, rim: .22 });
    g.add(at(IK.puck(.16, .08, m, .5), 0, 0, 0)); blob(g, m, [0, .2, 0], [.1, .18, .1]); g.add(at(IK.puck(.1, .04, m, .5), 0, .3, 0)); blob(g, m, [0, .43, 0], [.1, .1, .1]);
    g.children.forEach(noSh); g.rotation.x = .15; g.scale.setScalar(s); return g;
  }
  function moon(sc, x, y, r, glow) {
    glow(glowC('bgc-moonglow', 255, 236, 170, .55), x, y, -6, r * 5.6);
    const mm = soft(0xfff0bf, { under: 0xffd27a, uk: .35, wrap: .8, glow: .32, rim: .25 }), cm = soft(0xf5dc9a, { wrap: .8, glow: .25 });
    const g = new T.Group(); blob(g, mm, [0, 0, 0], r); blob(g, cm, [-.3 * r, .25 * r, .85 * r], [.22 * r, .22 * r, .15 * r]); blob(g, cm, [.35 * r, -.3 * r, .87 * r], [.15 * r, .15 * r, .1 * r]);
    g.position.set(x, y, 0); sc.add(g);
  }
  function planet(sc, x, y, z, r, hex, under, band, ring) {
    const g = new T.Group(); blob(g, soft(hex, { under, uk: .55, glow: .04, rim: .3 }), [0, 0, 0], r);
    if (band) blob(g, soft(band, { under, uk: .4, glow: .04, rim: .3 }), [0, r * .12, 0], [r * 1.005, r * .2, r * 1.005]);
    if (ring) { const t = noSh(mesh(new T.TorusGeometry(r * 1.55, r * .13, 16, 72), soft(ring, { under: 0xb07ad0, uk: .3, glow: .1, rim: .3 }))); t.scale.z = .35; t.rotation.set(1.25, .15, -.35); g.add(t); }
    g.position.set(x, y, z); sc.add(g); return g;
  }
  function rocket(s) {
    const g = new T.Group(), bm = soft(0xfffaf2, { under: 0xc9c4e8, uk: .5, glow: .04, rim: .25 }), rm = soft(0xff8fa8, { under: 0xc85a7a, uk: .5, glow: .04 });
    blob(g, bm, [0, 0, 0], [.17, .34, .17]);
    const nose = noSh(mesh(new T.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), rm)); nose.scale.set(.155, .2, .155); nose.position.y = .19; g.add(nose);
    blob(g, soft(0x8fd4ff, { glow: .3, rim: .4 }), [0, .06, .14], [.07, .07, .04]); blob(g, soft(0xffffff, { glow: .2 }), [0, .06, .128], [.085, .085, .03]);
    [-1, 1].forEach(sx => blob(g, rm, [sx * .16, -.22, 0], [.09, .14, .05], [0, 0, -sx * .45]));
    blob(g, rm, [0, -.3, 0], [.1, .05, .1]);
    const fm = IK.M({ color: 0xffd27a, emissive: 0xffa040, emissiveIntensity: .8 }); blob(g, fm, [0, -.42, 0], [.07, .12, .07]); blob(g, IK.M({ color: 0xfff4c0, emissive: 0xffe080, emissiveIntensity: .9 }), [0, -.38, .02], [.04, .07, .04]);
    g.scale.setScalar(s); return g;
  }

  /* ---------------- covers ---------------- */
  function meadow(cn) {
    const mint = cn === 'mint';
    const st = stage('bgc-meadow-' + cn, mint ? [[0, '#bfe9ff'], [.5, '#def7f0'], [1, '#effff7']] : [[0, '#ffe58a'], [.45, '#fff4bc'], [1, '#fffbe2']], { seed: mint ? 11 : 9, ground: mint ? 0xbfe8d0 : 0xe8e0a0 });
    const sc = st.scene, F = mint ? 1 : -1;   // mint is mirrored
    // sun in the upper corner
    const sx = -.7 * F, sy = .74;
    st.glow(glowC('bgc-sunglow-' + cn, 255, mint ? 250 : 238, mint ? 210 : 150, mint ? .55 : .8), sx, sy, -7, 1.4);
    const sun = new T.Group(); blob(sun, soft(mint ? 0xfff6c8 : 0xffe48a, { under: 0xffb24a, uk: .45, wrap: .8, glow: .25, rim: .25 }), [0, 0, 0], .15); at(sun, sx, sy, -5); sc.add(sun);
    const cm = soft(0xffffff, { under: mint ? 0xb8dcf0 : 0xffe0a0, uk: .55, glow: .03, rim: .2 });
    sc.add(K.cloud(cm, .66 * F, .74, -3, .3), K.cloud(cm, -.3 * F, .9, -3.5, .2), K.cloud(cm, .92 * F, .3, -3.5, .15));
    // rolling hills (back → front)
    const H = mint ? [[0xcdf3dc, 0x8fd2b0], [0xa8e8c4, 0x6cc49c], [0x8ddcb1, 0x52b088], [0x78d2a0, 0x3f9f78]] : [[0xd9efa0, 0xa8c870], [0xb9e48a, 0x86c264], [0x9cd876, 0x68b056], [0x86cc66, 0x52a048]];
    hill(sc, ...H[0], -.78 * F, -.86, -4, .78, .58); hill(sc, ...H[0], .82 * F, -.92, -4.2, .9, .56);
    hill(sc, ...H[1], .05, -1.22, -3, 1.3, .62);
    hill(sc, ...H[2], -1.0 * F, -1.1, -2, .62, .44); hill(sc, ...H[2], 1.0 * F, -1.18, -2, .7, .44);
    hill(sc, ...H[3], 0, -1.45, -1, 1.3, .52);
    // puffy trees on the back hills at the edges
    const tl = mint ? [0x9fe6b8, 0x4fae80] : [0x8fd47a, 0x4f9a50];
    sc.add(at(tree(tl[0], tl[1], 0xc89a6a, .2), -.82 * F, -.24, -3.6), at(tree(tl[0] + 0x080808, tl[1], 0xc89a6a, .14), -.58 * F, -.33, -3.65));
    sc.add(at(tree(tl[0], tl[1], 0xc89a6a, .16), .86 * F, -.33, -3.8));
    // flowers on the slopes (edges + foreground corners)
    const P = mint ? [[0xffffff, 0xffe07a], [0xffd0e0, 0xfff0a0], [0xd8c8ff, 0xfff0a0], [0xffffff, 0xffe07a]] : [[0xffffff, 0xffe07a], [0xffb3c8, 0xfff0a0], [0xffc98a, 0xfff6c0], [0xc8b4ff, 0xfff0a0]];
    const fl = [[-.9, -.52, -3.5, .05], [-.66, -.6, -3.5, .04], [.7, -.62, -3.6, .045], [.92, -.52, -3.6, .035], [-.88, -.8, -1.7, .065], [-.66, -.9, -1.7, .055], [.92, -.86, -1.7, .065], [.7, -.94, -1.7, .05], [-.42, -1.0, -.6, .06], [.44, -.98, -.6, .065], [-.96, -.97, -.6, .07], [.98, -.98, -.6, .06], [-.25, -.74, -2.6, .04], [.3, -.72, -2.6, .045]];
    fl.forEach(([x, y, z, s], i) => { const p = P[i % P.length]; sc.add(at(flower(p[0], p[1], s), x * F, y, z)); });
    // grass tufts / clover dots
    const gm = soft(H[3][0], { under: H[3][1], uk: .5 });
    [[-.55, -.94], [.6, -.9], [-.1, -.97], [.18, -.95]].forEach(([x, y]) => { [-1, 0, 1].forEach(k => blob(sc, gm, [x * F + k * .025, y + (k ? 0 : .015), -.55], [.018, .05, .015], [0, 0, k * .4])); });
    if (mint) spark(sc, [[-.45, .55, .02], [.2, .8, .018], [-.9, .05, .016], [.55, .45, .015]]); else spark(sc, [[.4, .6, .02], [-.2, .82, .018], [.9, .02, .016]]);
    // tiny butterflies
    const bm = soft(mint ? 0xffd0e0 : 0xffffff, { glow: .1, rim: .3 });
    [[.62 * F, .1, .5], [-.86 * F, .42, -.4]].forEach(([x, y, a]) => { const g = new T.Group(); blob(g, bm, [-.03, 0, 0], [.03, .022, .006], [0, 0, .4]); blob(g, bm, [.03, 0, 0], [.03, .022, .006], [0, 0, -.4]); blob(g, soft(0x8a6a5a, {}), [0, 0, .005], [.006, .018, .006]); at(g, x, y, 1); g.rotation.z = a; sc.add(g); });
    return st.out();
  }

  function sea(cn) {
    const sunset = cn === 'sunset';
    const st = stage('bgc-sea-' + cn, sunset ? [[0, '#7c69c8'], [.32, '#d98cc0'], [.55, '#ff9fae'], [.7, '#ffc48a'], [.78, '#ffe0a0'], [1, '#ffe0a0']] : [[0, '#86c8ff'], [.5, '#c8e8ff'], [.75, '#e6f5ff'], [1, '#e6f5ff']], { seed: sunset ? 21 : 17, ground: sunset ? 0xff9fb0 : 0xbfe0ff, sky: sunset ? 0xffe8d0 : 0xffffff, key: sunset ? 0xffd8b0 : 0xfff4e0 });
    const sc = st.scene, hz = -.36, rnd = st.rnd;
    if (sunset) {
      // big sun sitting on the horizon (off-centre), long glittering path towards the viewer
      const sx = .44;
      st.glow(glowC('bgc-sunsetglow', 255, 210, 140, .9), sx, hz + .05, -8, 2.0, 1.4);
      st.glow(glowC('bgc-sunsetglow2', 255, 160, 170, .5), 0, hz + .1, -8.5, 2.6, 1.0);
      const sun = new T.Group(); blob(sun, soft(0xffe48a, { under: 0xff9a5a, uk: .55, wrap: .8, glow: .32, rim: .3 }), [0, 0, 0], .25); at(sun, sx, hz + .02, -7); sc.add(sun);
      st.flatGrad('bgc-seasun', [[0, '#ffb08f'], [.25, '#e889a8'], [.7, '#8a74c8'], [1, '#5c58a8']], 0, hz - .74, -6, 2.2, 1.48);
      const pm = soft(0xc59ae0, { under: 0x9a7ac8, uk: .4, glow: .05 });
      [[-.85, .62, .22], [-.4, .8, .15], [.88, .78, .17]].forEach(([x, y, s]) => sc.add(K.cloud(soft(0xffd0d8, { under: 0xc890d0, uk: .6, glow: .04, rim: .25 }), x, y, -4, s)));
      sc.add(K.cloud(pm, -.75, .28, -4.5, .13));
      // glitter path: bright flat streaks + sparkles under the sun
      const gm = IK.M({ color: 0xfff0c0, emissive: 0xffd890, emissiveIntensity: .9 });
      for (let i = 0; i < 26; i++) { const t = i / 26, y = hz - .05 - t * .62, w = .03 + t * .12, x = sx + (rnd() - .5) * (.08 + t * .45); blob(sc, gm, [x, y, -5.5 + t], [w * (.4 + rnd() * .6), .008 + t * .008, .005]); }
      waveRow(sc, hz - .2, -5, .09, 0xc890c8, 0x8a6ab0, true, rnd, 0, 0xffe0d0);
      waveRow(sc, hz - .42, -4, .13, 0xa47ac8, 0x6a58a8, true, rnd, .07, 0xffd8c8);
      waveRow(sc, -.98, -3, .2, 0x8a6abf, 0x5a4a98, true, rnd, -.05, 0xffd0c0);
      spark(sc, [[sx - .1, hz - .14, .024], [sx + .14, hz - .3, .03], [sx - .2, hz - .45, .026], [sx + .05, hz - .58, .034], [sx + .3, hz - .1, .018], [-.62, .5, .022], [.05, .86, .02], [-.9, .9, .018], [.64, .5, .016]], 0);
      // first evening stars + a sailboat silhouette on the left
      const sm = soft(0xfff0b0, { under: 0xffc860, uk: .3, wrap: .8, glow: .4, rim: .2 });
      star(sc, sm, -.55, .92, 1, .035, .2); star(sc, sm, .25, .94, 1, .028, -.2); star(sc, sm, .66, .6, 1, .022, .1);
      sc.add(at(boat(0x9a6ab0, 0xffd8e0, .32), -.72, hz - .02, -5.2));
      // seagulls
      const bw = soft(0xfff4f0, { glow: .1 });
      [[-.3, .55, .7], [-.18, .6, .5]].forEach(([x, y, s]) => { const g = new T.Group(); blob(g, bw, [-.045, 0, 0], [.05, .012, .01], [0, 0, .35]); blob(g, bw, [.045, 0, 0], [.05, .012, .01], [0, 0, -.35]); at(g, x, y, 0, s); sc.add(g); });
    } else {
      st.glow(glowC('bgc-seasunglow', 255, 246, 200, .7), .72, .72, -8, 1.2);
      const sun = new T.Group(); blob(sun, soft(0xfff2a8, { under: 0xffc860, uk: .45, wrap: .8, glow: .28, rim: .25 }), [0, 0, 0], .13); at(sun, .72, .72, -7); sc.add(sun);
      st.flatGrad('bgc-seaday', [[0, '#9ad8f5'], [.4, '#6cbfe8'], [1, '#4aa0d8']], 0, hz - .74, -6, 2.2, 1.48);
      const cm = soft(0xffffff, { under: 0xb8d8f5, uk: .55, glow: .03, rim: .2 });
      sc.add(K.cloud(cm, -.66, .72, -4, .32), K.cloud(cm, .3, .9, -4.2, .2), K.cloud(cm, -.92, .26, -4.5, .16), K.cloud(cm, .9, .36, -4.5, .14));
      sc.add(K.cloud(soft(0xffffff, { under: 0xc8e4f8, uk: .5 }), .55, hz + .04, -5.8, .17));   // cloud bank on the horizon
      sc.add(at(island(.42), -.72, hz + .02, -5.3));
      sc.add(at(boat(0xff9fb0, 0xffffff, .34), .74, hz - .1, -4.6));
      waveRow(sc, hz - .16, -5, .08, 0x8ad2f2, 0x5aaee0, true, rnd);
      waveRow(sc, hz - .4, -4, .12, 0x72c4ee, 0x4a9ed8, true, rnd, .06);
      waveRow(sc, -.97, -3, .2, 0x5eb4e8, 0x3a8cd0, true, rnd, -.05);
      spark(sc, [[-.3, hz - .25, .02], [.32, hz - .5, .022], [-.5, -.7, .018], [.1, .62, .018], [-.9, .9, .016]], 0);
      const bw = soft(0xffffff, { glow: .1 });
      [[-.25, .52, .7], [-.12, .58, .5]].forEach(([x, y, s]) => { const g = new T.Group(); blob(g, bw, [-.045, 0, 0], [.05, .012, .01], [0, 0, .35]); blob(g, bw, [.045, 0, 0], [.05, .012, .01], [0, 0, -.35]); at(g, x, y, 0, s); sc.add(g); });
    }
    return st.out();
  }

  function snowscape() {
    const st = stage('bgc-snow', [[0, '#bcd6f2'], [.55, '#e6eefa'], [1, '#f7f9fc']], { seed: 31, ground: 0xc8d6ee, sky: 0xf4f8ff, keyI: .4, hemi: .7 });
    const sc = st.scene, rnd = st.rnd;
    st.glow(glowC('bgc-snowsun', 255, 248, 220, .55), .66, .7, -8, 1.2);
    const cm = soft(0xffffff, { under: 0xc0d2ee, uk: .55, glow: .03, rim: .2 });
    sc.add(K.cloud(cm, -.68, .74, -4, .3), K.cloud(cm, .7, .82, -4.2, .22));
    const W = [0xffffff, 0xb8cae8];
    hill(sc, 0xf0f5fc, 0xb0c4e4, -.78, -.86, -4, .78, .58); hill(sc, 0xf0f5fc, 0xb0c4e4, .84, -.9, -4.2, .88, .56);
    hill(sc, 0xf8fbff, 0xb8cae8, .05, -1.22, -3, 1.3, .62);
    hill(sc, ...W, -1.0, -1.12, -2, .62, .44); hill(sc, ...W, 1.0, -1.16, -2, .7, .44);
    hill(sc, ...W, 0, -1.46, -1, 1.3, .52);
    const tg = [0x8ad0b0, 0x4a9a88];
    sc.add(at(tree(tg[0], tg[1], 0xb08a6a, .26, true), -.82, -.2, -3.6), at(tree(0x7cc4a8, tg[1], 0xb08a6a, .18, true), -.6, -.3, -3.65), at(tree(0x9adcbc, tg[1], 0xb08a6a, .14, true), -.98, -.4, -3.7));
    sc.add(at(tree(tg[0], tg[1], 0xb08a6a, .22, true), .84, -.28, -3.8), at(tree(0x7cc4a8, tg[1], 0xb08a6a, .15, true), .64, -.38, -3.85));
    sc.add(at(tree(tg[0], tg[1], 0xb08a6a, .2, true), -.94, -.66, -1.6));
    // snowman on the right slope
    const sn = new T.Group(), wm = soft(0xffffff, { under: 0xb8cae8, uk: .55, glow: .05, rim: .25 });
    blob(sn, wm, [0, 0, 0], .15); blob(sn, wm, [0, .19, .01], .11);
    blob(sn, soft(0x3a3f5a, {}), [-.035, .22, .1], .013); blob(sn, soft(0x3a3f5a, {}), [.035, .22, .1], .013);
    blob(sn, soft(0xffa25a, { glow: .05 }), [0, .19, .12], [.014, .014, .05]);
    blob(sn, soft(0xff8fa8, { under: 0xc85a7a, uk: .4 }), [0, .1, .02], [.115, .035, .11]); blob(sn, soft(0xff8fa8, {}), [.06, .03, .1], [.025, .06, .02], [0, 0, .2]);
    blob(sn, soft(0xffd0e0, {}), [-.05, .2, .08], [.02, .012, .01]); blob(sn, soft(0xffd0e0, {}), [.05, .2, .08], [.02, .012, .01]);
    sc.add(at(sn, .78, -.7, -1.5, .9));
    // falling snow: puffy dots + a few big flakes at the edges
    const dm = soft(0xffffff, { under: 0xd0dcf0, uk: .3, glow: .25, rim: .3 });
    for (let i = 0; i < 46; i++) { let x = rnd() * 2 - 1, y = rnd() * 1.6 - .5; if (Math.abs(x) < .42 && y > -.5 && y < .5) x = x < 0 ? x - .45 : x + .45; blob(sc, dm, [x, y, .5], .008 + rnd() * .012); }
    snowflake(sc, -.86, .48, 1, .06, .2); snowflake(sc, .82, .14, 1, .05, .5); snowflake(sc, -.3, .86, 1, .045, .1); snowflake(sc, .4, .66, 1, .035, .3); snowflake(sc, -.68, .02, 1, .035, .4);
    spark(sc, [[.2, .9, .018], [-.92, .82, .016], [.95, .55, .016]]);
    return st.out();
  }

  function toytown(cn) {
    const night = cn === 'night';
    const st = stage('bgc-toy-' + cn, night ? [[0, '#161d38'], [.5, '#26304f'], [1, '#43517f']] : [[0, '#a9dcff'], [.55, '#e2f4ff'], [1, '#fff6df']], night ? { seed: 41, sky: 0xc8d0ff, ground: 0x3a3060, hemi: .5, key: 0xd8dcff, keyI: .3 } : { seed: 43, ground: 0xf0e0c0 });
    const sc = st.scene, rnd = st.rnd;
    const dk = (h, k = .5) => { if (!night) return h; const c = new T.Color(h).lerp(new T.Color(0x3a4270), k); return c.getHex(); };
    if (night) {
      moon(sc, .62, .66, .14, st.glow);
      const sm = soft(0xffe7a0, { under: 0xffc860, uk: .3, wrap: .8, glow: .4, rim: .2 });
      [[-.74, .76, .06], [-.36, .88, .04], [-.06, .7, .03], [.2, .88, .045], [.9, .3, .035], [-.9, .36, .04], [.88, .9, .03], [-.55, .52, .025], [.36, .5, .025]].forEach(([x, y, r]) => star(sc, sm, x, y, 1, r, (rnd() - .5) * .6));
      spark(sc, [[-.86, .94, .03], [.05, .95, .022], [-.6, .62, .018], [.7, .3, .018], [.45, .82, .02]]);
      const cm = soft(0x6f7bb0, { under: 0x3c4677, uk: .6, rim: .22 });
      sc.add(K.cloud(cm, -.68, .2, -5, .18), K.cloud(cm, .86, .52, -5, .14));
    } else {
      st.glow(glowC('bgc-toysun', 255, 246, 200, .7), -.72, .74, -8, 1.2);
      const sun = new T.Group(); blob(sun, soft(0xffe48a, { under: 0xffb24a, uk: .45, wrap: .8, glow: .25, rim: .25 }), [0, 0, 0], .13); at(sun, -.72, .74, -7); sc.add(sun);
      const cm = soft(0xffffff, { under: 0xb8d8f5, uk: .55, glow: .03, rim: .2 });
      sc.add(K.cloud(cm, .62, .76, -4, .28), K.cloud(cm, -.25, .9, -4.2, .18), K.cloud(cm, .92, .3, -4.5, .13));
    }
    // ground: a soft felt board with a pale path
    hill(sc, dk(0xbfe8a8), dk(0x86c27a), 0, -1.32, -6, 1.6, .9);
    hill(sc, dk(0xb0e09a, .55), dk(0x7ab86c), -.95, -1.05, -6.5, .7, .5); hill(sc, dk(0xb0e09a, .55), dk(0x7ab86c), .95, -1.05, -6.5, .7, .5);
    blob(sc, soft(dk(0xfff0d0), { under: dk(0xe0c8a0), uk: .4 }), [0, -1.02, -5.2], [.5, .16, .2]);
    // buildings along the left and right edges
    const B = night
      ? { a: 0x8a7ac0, b: 0x6a8ac0, c: 0xb07aa8, d: 0x7aa89a, roofA: 0xd85a7a, roofB: 0x5a6ab8, roofC: 0x6a5aa8, under: 0x2a2f55 }
      : { a: 0xffd8e6, b: 0xd6ecff, c: 0xfff0b8, d: 0xd8f5e4, roofA: 0xff8fa8, roofB: 0x7ab8ff, roofC: 0xb79cff, under: 0xc0a8c8 };
    const hs = [
      house({ x: -.8, y: -.6, z: -4.5, w: .26, h: .36, body: B.b, under: B.under, roof: B.roofB, roofU: B.under, tower: true, win: [[0, .78], [0, .45]], door: dk(0xd8a070), ry: .35, flag: 0xffd27a }, night),
      house({ x: -.58, y: -.66, z: -4, w: .28, h: .22, body: B.a, under: B.under, roof: B.roofA, roofU: B.under, win: [[-.22, .6], [.22, .6]], ry: .3 }, night),
      house({ x: -.88, y: -.84, z: -3, w: .3, h: .22, body: B.c, under: B.under, roof: B.roofC, roofU: B.under, win: [[.2, .6]], door: dk(0xc8906a), doorX: -.2, ry: .4 }, night),
      house({ x: .84, y: -.62, z: -4.5, w: .3, h: .3, body: B.d, under: B.under, roof: B.roofA, roofU: B.under, win: [[-.2, .7], [.2, .7]], door: dk(0xd8a070), ry: -.35 }, night),
      house({ x: .56, y: -.66, z: -4, w: .2, h: .5, body: B.c, under: B.under, roof: B.roofC, roofU: B.under, tower: true, win: [[0, .82], [0, .55], [0, .28]], ry: -.3, flag: 0xff8fa8 }, night),
    ];
    hs.forEach(h => sc.add(h));
    if (night) { // warm window glows
      sc.updateMatrixWorld(true);
      const wg = glowC('bgc-winglow', 255, 200, 110, .8);
      hs.forEach(h => h.userData.wins.forEach(p => { const v = new T.Vector3(...p).applyMatrix4(h.matrixWorld); st.glow(wg, v.x, v.y, 2, .16); }));
    }
    // round toy trees
    sc.add(at(tree(dk(0x9fe0a0), dk(0x4fae80), dk(0xc89a6a), .12), -.36, -.74, -4.2), at(tree(dk(0x8ad48a), dk(0x4f9a70), dk(0xc89a6a), .1), .34, -.78, -4.2));
    // board-game hints in the foreground corners
    sc.add(at(die(1.5, night ? 0xe8e4ff : 0xfffcf6, night ? 0x3a3060 : 0xff6f8f), -.6, -.86, -1));
    sc.add(at(pawn(night ? 0xff9fb8 : 0xff9fb0, night ? 0x8a3f74 : 0xd06080, .44), .62, -1.0, -1));
    sc.add(at(pawn(night ? 0x8fc8ff : 0x8fd0ff, night ? 0x2f5a8f : 0x5a8ad0, .34), .84, -.96, -1.2));
    if (!night) spark(sc, [[.3, .62, .018], [-.4, .55, .016], [.92, .05, .016]]);
    return st.out();
  }

  function space() {
    const st = stage('bgc-space', [[0, '#121733'], [.45, '#1f2648'], [.8, '#2c2a5c'], [1, '#3a2f63']], { seed: 51, sky: 0xd8dcff, ground: 0x3a2f63, hemi: .58, key: 0xfff2e0, keyI: .42 });
    const sc = st.scene, rnd = st.rnd;
    // nebula haze
    st.glow(glowC('bgc-neb1', 200, 120, 255, .28), -.6, .5, -9, 1.6, 1.2);
    st.glow(glowC('bgc-neb2', 255, 130, 190, .22), .7, -.2, -9, 1.5, 1.2);
    st.glow(glowC('bgc-neb3', 110, 190, 255, .2), .1, .9, -9, 1.6, .8);
    // tiny background dots
    const dm = IK.M({ color: 0xffffff, emissive: 0xfff4d0, emissiveIntensity: .7 });
    for (let i = 0; i < 70; i++) { const x = rnd() * 2 - 1, y = rnd() * 2 - 1; blob(sc, dm, [x, y, -8], .003 + rnd() * .004); }
    // plush planets
    planet(sc, -.64, .58, -3, .21, 0xffc4a0, 0xd0708a, 0xffe2c4, 0xe8c8ff);
    planet(sc, .78, -.42, -3, .12, 0x9ee6c8, 0x3f8a8a, 0xc8f5e0);
    planet(sc, .62, .82, -3.5, .055, 0xd9c4ff, 0x7a5ab0);
    st.glow(glowC('bgc-plglow', 255, 200, 170, .25), -.64, .58, -4, .9);
    // a big lilac planet surface along the bottom (keeps the name area dark and calm)
    const gm = soft(0x5a4f94, { under: 0x2c2556, uk: .5, glow: .03, rim: .35 });
    blob(sc, gm, [0, -1.72, -2], [1.6, .9, .4]);
    const crm = soft(0x4a4282, { rim: .2 });
    [[-.7, -.9, .06], [.55, -.92, .045], [-.25, -.95, .035], [.85, -.95, .03]].forEach(([x, y, r]) => blob(sc, crm, [x, y, -1.55], [r * 1.4, r * .45, r * .3]));
    st.glow(glowC('bgc-rim', 190, 170, 255, .35), 0, -.84, -2.5, 2.4, .22);
    // tiny rocket on the right
    const rk = at(rocket(.38), .76, .2, 0); rk.rotation.z = -.55; sc.add(rk);
    st.glow(glowC('bgc-flame', 255, 190, 110, .7), .76 - .12, .2 - .18, -.5, .3);
    [[.6, -.02, .022], [.54, -.1, .016], [.49, -.17, .012]].forEach(([x, y, r]) => blob(sc, soft(0xe8e4ff, { glow: .2, rim: .3 }), [x, y, -.2], r));
    // puffy stars + sparkles (edges)
    const sm = soft(0xffe7a0, { under: 0xffc860, uk: .3, wrap: .8, glow: .4, rim: .2 });
    [[-.9, .9, .05], [-.2, .9, .04], [.24, .74, .035], [.92, .62, .04], [-.92, .2, .045], [-.62, .14, .028], [.95, -.05, .03], [-.36, .72, .025], [.42, .96, .025]].forEach(([x, y, r]) => star(sc, sm, x, y, 1, r, (rnd() - .5) * .7));
    spark(sc, [[-.5, .92, .03], [.08, .6, .02], [-.86, -.3, .026], [.4, -.6, .02], [-.4, -.62, .018], [.92, .3, .022], [-.1, .98, .02]]);
    return st.out();
  }

  function sky(cn) {
    const sc0 = {
      peach: [[0, '#ffaccb'], [.35, '#ffcadb'], [.68, '#ffdcc8'], [1, '#ffb894']],
      rainbow: [[0, '#a8d8ff'], [.5, '#dff0ff'], [.85, '#fff0f6'], [1, '#ffe1ef']],
    }[cn] || [[0, '#a9dcff'], [1, '#e2f4ff']];
    const st = stage('bgc-sky-' + cn, sc0, { seed: cn === 'rainbow' ? 61 : 63, ground: cn === 'peach' ? 0xffc0b0 : 0xd8d0f0 });
    const sc = st.scene, rnd = st.rnd;
    if (cn === 'rainbow') {
      st.glow(glowC('bgc-rbglow', 255, 255, 240, .22), 0, .1, -9, 2.2, 1.4);
      const cols = [0xffaabd, 0xffcf9a, 0xfff09a, 0xb8f0c0, 0xa8d8ff, 0xcdb8ff];
      cols.forEach((c, i) => { const t = noSh(mesh(new T.TorusGeometry(1.5 - i * .088, .052, 20, 120, Math.PI), soft(c, { under: c, glow: .1, rim: .22, wrap: .8 }))); t.position.set(0, -1.02, -5 + i * .01); t.scale.z = .6; sc.add(t); });
      const cm = soft(0xffffff, { under: 0xd8c8ff, uk: .5, glow: .05, rim: .22 }), cm2 = soft(0xffeef6, { under: 0xffa8c8, uk: .6, glow: .03, rim: .2 });
      // clouds hide the rainbow's feet + a cloud bed along the bottom
      sc.add(K.cloud(cm, -.98, -.42, -3, .4), K.cloud(cm, .98, -.4, -3, .4));
      sc.add(K.cloud(cm2, -.56, -.9, -2, .6), K.cloud(cm2, .56, -.94, -2, .66), K.cloud(cm, -.95, -.78, -1, .42), K.cloud(cm, .02, -1.02, -1, .5), K.cloud(cm, .95, -.76, -1, .4));
      sc.add(K.cloud(cm, -.66, .86, -4, .2), K.cloud(cm2, .74, .88, -4, .17));
      const sm = soft(0xfff0b0, { under: 0xffc860, uk: .3, wrap: .8, glow: .4, rim: .2 }), pm = soft(0xffc8e0, { under: 0xff8fb8, uk: .3, wrap: .8, glow: .35, rim: .2 });
      star(sc, sm, -.88, .2, 1, .04, .2); star(sc, pm, .86, .16, 1, .035, -.2); star(sc, sm, .32, .9, 1, .03, .1); star(sc, pm, -.3, .92, 1, .026, -.1);
      spark(sc, [[-.5, .62, .03], [.52, .6, .028], [-.15, .74, .02], [.2, .7, .02], [-.86, .52, .022], [.9, .5, .022], [-.7, .02, .018], [.72, -.02, .018], [0, .96, .02]]);
    } else {   // peach dawn
      st.glow(glowC('bgc-dawnglow', 255, 214, 160, .55), .5, -.36, -8, 1.2);
      st.glow(glowC('bgc-dawnglow2', 255, 170, 190, .16), -.4, -.3, -8.5, 1.6, 1.1);
      const sun = new T.Group(); blob(sun, soft(0xffe0a0, { under: 0xffa070, uk: .55, wrap: .8, glow: .26, rim: .28 }), [0, 0, 0], .22); at(sun, .5, -.4, -6); sc.add(sun);
      const cm = soft(0xfff0ee, { under: 0xff9fb8, uk: .65, glow: .02, rim: .2 }), cm2 = soft(0xffd8d8, { under: 0xff9fb0, uk: .6, rim: .16 }), cm3 = soft(0xffd8c8, { under: 0xffa090, uk: .6, rim: .16 });
      sc.add(K.cloud(cm2, -.5, -.9, -2, .68), K.cloud(cm3, .58, -.88, -2, .6), K.cloud(cm, -.96, -.72, -1, .44), K.cloud(cm, .1, -1.0, -1, .5), K.cloud(cm, .96, -.76, -1, .4));
      sc.add(K.cloud(cm, .7, .66, -3, .3), K.cloud(cm, -.72, .8, -3, .24), K.cloud(cm2, -.9, .3, -3.5, .16), K.cloud(cm3, .9, .16, -3.5, .14), K.cloud(cm2, .1, .94, -3.5, .14));
      spark(sc, [[-.3, .7, .02], [.38, .4, .018], [-.62, .5, .016], [.24, .86, .016]]);
      const bw = soft(0xffffff, { glow: .1 });
      [[-.55, .1, .7], [-.42, .16, .5], [-.66, .2, .45]].forEach(([x, y, s]) => { const g = new T.Group(); blob(g, bw, [-.045, 0, 0], [.05, .012, .01], [0, 0, .35]); blob(g, bw, [.045, 0, 0], [.05, .012, .01], [0, 0, -.35]); at(g, x, y, 0, s); sc.add(g); });
    }
    return st.out();
  }

  window.BG3D_COVERS = { sky, meadow, sea, snowscape, toytown, space };
})();
