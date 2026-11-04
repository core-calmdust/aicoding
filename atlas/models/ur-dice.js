/* =====================================================================
   The Royal Game of Ur — the tetrahedral dice, shared by the 3D table (atlas/models/ur.js,
   atlas/skin/ur.js) and the 2D page (ur/board2d.js, a small transparent three.js canvas in the notch).
   Needs only window.THREE (r128). Registers window.UrDice3D:
     DR, TV, MARKED                 circumradius, the four tip vectors, which tips are inlaid (white)
     die({look:'bone'|'stone'})     a die (Group with one mesh), resting on a face when y = DR / 3
     dieUp(g, marked, yaw)          turn it so a marked (white) tip — or a plain one — points straight up
     isUp(g)                        → 1 when a marked tip points up
     throwPlan(items, o)            the throw: each die drops in from outside, tumbles, bounces 2–3 times and
                                    settles on its rolled orientation (the 3D skin's motion, unchanged):
                                      items: [{ g, d (the die inside g), sh (its contact shadow, optional),
                                                from:[x,z], to:[x,z], marked, rest }]
                                      o: { dur (ms), yaw?(i) } → { total, frame(tms), end() }
     share(fn)                      a hook to mark geometries as shared (Table3D's instancing)
   ===================================================================== */
(function () {
  'use strict';
  if (window.UrDice3D) return;
  const T = () => window.THREE;
  const DR = .3, DT = .3;   // circumradius, how much of each edge the tips are cut
  const TV = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(a => a * DR / Math.sqrt(3)));
  const MARKED = [true, true, false, false];
  let seed = 77; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let shareFn = null;
  const dieGeos = {};
  function dieGeo(look) {
    if (dieGeos[look]) return dieGeos[look];
    // colours come from a small swatch strip (UVs point into it): vertex colours would be lost when the showcase merges meshes
    const TT = T(), Pa = [], Ca = [];
    const add = (a, b, c, col) => {   // a triangle, turned to face outwards; col = [u, v] in the swatch strip
      const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
      const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) { const t = b; b = c; c = t; }
      Pa.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) Ca.push(col[0], col[1]);
    };
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const cut = (i, j) => lerp(TV[i], TV[j], DT);
    seed = 77;
    const shell = [.6875, .5], lap = [.9375, .5];
    const jit = () => [.0625 + (rnd() * 3 | 0) * .125, .5];   // one of the body tones (columns 0..2 of 8)
    // the four faces (hexagons), each opposite one vertex
    for (let l = 0; l < 4; l++) {
      const [i, j, k] = [0, 1, 2, 3].filter(x => x !== l), hx = [cut(i, j), cut(j, i), cut(j, k), cut(k, j), cut(k, i), cut(i, k)];
      const cen = [0, 1, 2].map(a => (TV[i][a] + TV[j][a] + TV[k][a]) / 3), col = jit();
      for (let s = 0; s < 6; s++) add(cen, hx[s], hx[(s + 1) % 6], col);
    }
    // the tips: plain, or a shell ring with a lapis centre
    for (let i = 0; i < 4; i++) {
      const o = [0, 1, 2, 3].filter(x => x !== i), tri = o.map(j => cut(i, j)), cen = [0, 1, 2].map(a => (tri[0][a] + tri[1][a] + tri[2][a]) / 3);
      const tip = lerp(cen, TV[i], .82);   // nearly the full point: sharp tips
      if (!MARKED[i]) { for (let s = 0; s < 3; s++) add(tip, tri[s], tri[(s + 1) % 3], jit()); continue; }
      const inn = tri.map(p => lerp(tip, p, .5));
      for (let s = 0; s < 3; s++) { const a = tri[s], b = tri[(s + 1) % 3], ia = inn[s], ib = inn[(s + 1) % 3]; add(a, b, ib, shell); add(a, ib, ia, shell); add(tip, ia, ib, lap); }
    }
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(Pa, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(Ca, 2));
    g.computeVertexNormals();
    if (shareFn) shareFn(g); return (dieGeos[look] = g);
  }
  const dieMats = {};
  function dieMat(look) {
    if (dieMats[look]) return dieMats[look];
    const TT = T(), c = document.createElement('canvas'); c.width = 8; c.height = 1;
    const x = c.getContext('2d'), B = look === 'stone' ? ['#a89a84', '#9e8f78', '#b1a48f'] : ['#d6c7a6', '#ccbb98', '#ddd0b2'];
    ['', '', '', '', '', '#fbf8f0', '#fbf8f0', '#1f3290'].forEach((col, i) => { x.fillStyle = col || B[i % 3]; x.fillRect(i, 0, 1, 1); });
    const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.magFilter = t.minFilter = TT.NearestFilter; t.generateMipmaps = false; t.anisotropy = 1;
    return (dieMats[look] = new TT.MeshStandardMaterial({ map: t, roughness: look === 'bone' ? .42 : .6, metalness: 0 }));
  }
  function die(o = {}) {
    const TT = T(), look = o.look === 'stone' ? 'stone' : 'bone';
    const g = new TT.Group(), m = new TT.Mesh(dieGeo(look), dieMat(look)); m.castShadow = true; m.receiveShadow = true; g.add(m);
    g.userData = { die: look, rest: DR / 3 }; return g;
  }
  function dieUp(g, marked, yaw = 0) {
    const TT = T(), v = new TT.Vector3(...TV[marked ? 0 : 2]).normalize();
    const q = new TT.Quaternion().setFromUnitVectors(v, new TT.Vector3(0, 1, 0));
    g.quaternion.copy(new TT.Quaternion().setFromAxisAngle(new TT.Vector3(0, 1, 0), yaw).multiply(q));
    return g;
  }
  function isUp(g) {
    const TT = T(), q = g.quaternion, a = new TT.Vector3(...TV[0]).applyQuaternion(q), b = new TT.Vector3(...TV[1]).applyQuaternion(q);
    return Math.max(a.y, b.y) > DR * .9 ? 1 : 0;
  }
  // the throw (the motion of the 3D skin): fall (0 … .42), hop .22 (… .66), hop .07 (… .82), settle
  function throwPlan(items, o = {}) {
    const TT = T(), dur = o.dur || 980, qt = new TT.Quaternion(), tmp = new TT.Object3D();
    const plan = items.map((it, i) => {
      dieUp(tmp, !!it.marked, o.yaw ? o.yaw(i) : Math.random() * Math.PI * 2); const qf = tmp.quaternion.clone();
      const ax = new TT.Vector3(Math.random() - .5, Math.random() * .4, Math.random() - .5).normalize(), spin = (2.5 + Math.random() * 2) * Math.PI;
      return Object.assign({ qf, ax, spin, h0: (o.h0 || 1.4) + Math.random() * .5, delay: i * 45 + Math.random() * 40, sk: it.shK || .45 }, it);
    });
    const total = dur + 220;
    const hAt = q => q < .42 ? 1 - (q / .42) * (q / .42) : q < .66 ? .22 * Math.sin((q - .42) / .24 * Math.PI) : q < .82 ? .07 * Math.sin((q - .66) / .16 * Math.PI) : 0;
    const place = (p, x, z, hh) => {
      p.g.position.set(x, p.rest + hh, z);
      if (p.sh) { p.sh.position.y = .002 - (p.rest + hh); const s2 = 1 + hh * .5; p.sh.scale.set(s2, s2, s2); p.sh.material.opacity = p.sk / (1 + hh * 1.5); }
    };
    return {
      total, plan,
      frame(tms) {
        for (const p of plan) {
          const q = Math.min(1, Math.max(0, (tms - p.delay) / dur)), e = 1 - Math.pow(1 - q, 2.2);
          const hh = q < .42 ? p.h0 * hAt(q) : hAt(q) * p.h0 * .45;
          place(p, p.from[0] + (p.to[0] - p.from[0]) * e, p.from[1] + (p.to[1] - p.from[1]) * e, hh);
          qt.setFromAxisAngle(p.ax, p.spin * Math.pow(1 - q, 1.6)); p.d.quaternion.copy(qt).multiply(p.qf);
        }
      },
      end() { for (const p of plan) { p.d.quaternion.copy(p.qf); place(p, p.to[0], p.to[1], 0); } },
    };
  }
  window.UrDice3D = { DR, DT, TV, MARKED, die, dieUp, isUp, dieGeo, dieMat, throwPlan, share(fn) { shareFn = fn; } };
})();
