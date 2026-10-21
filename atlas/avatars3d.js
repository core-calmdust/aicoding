/* =====================================================================
   World Board Game Atlas — collectible 3D avatars (200 = 50 species × 4 tiers).
   Pre-rendered by atlas/tools/icons.html?kind=av&id=<species>-<tier> → images/atlas/av/<species>-<tier>.webp
   The portal never loads three.js for these; it only shows the images.

   Species register with Avatars3D.define(id, def):
     def.name   { ja, en, ... }          species name
     def.build(opt, tier) → THREE.Group  facing +z, feet at y = 0, made with Icons3D.KIT (soft plush look)
                                          set g.userData.head = [centreY, radius, z]  (always)
                                          set g.userData.top  = [x, y, z, tiltZ]       where a hat sits (top of the head)
                                          set g.userData.neck = [x, y, z, radius]      where a scarf / bell sits (optional)
     def.v      [t0, t1, t2, t3] per tier: { map:{hex:hex}, hue:[deg, satMul, lightAdd], finish:'gold'|'pearl'|'night'|'rainbow'|'sakura'|'mint',
                                             acc:['bow', …], opt:{…} }   (all optional)
     def.ur     true → tier 3 is UR (gold-class) instead of SSR
   Tiers: 0 N (natural colours, no accessory) · 1 R (other colours + small accessory)
          2 SR (other colours + a hat / scarf) · 3 SSR (special finish + crown/tiara + sparkles) or UR (gold + crown + star aura)
   ===================================================================== */
(function () {
  'use strict';
  if (!window.Icons3D || !Icons3D.KIT) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M;
  const SPECIES = {}, ORDER = [];
  function define(id, def) { if (!SPECIES[id]) ORDER.push(id); SPECIES[id] = def; }

  /* ---------------- colour tools (act on the soft plush materials only; eyes / ink / decals stay) ---------------- */
  function softMats(g) {
    const set = new Set();
    g.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m && m.userData && m.userData.soft) set.add(m); }); });
    return [...set];
  }
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  function setTone(m, hex, under) {
    m.color.copy(lin(hex)); m.userData.hex = hex;
    if (under != null && m.userData.u) { m.userData.u.uUnder.value = lin(under); m.userData.underHex = under; if (!m.userData.u.uUK.value) m.userData.u.uUK.value = .45; }
  }
  // exact remap: { 0xff9a4a: 0x8ab4ff, … } — matches a material's base colour and/or its underside tint
  function recolor(g, map) {
    softMats(g).forEach(m => {
      const h = m.userData.hex, u = m.userData.underHex;
      if (h in map) { m.color.copy(lin(map[h])); m.userData.hex = map[h]; }
      if (u != null && u in map && m.userData.u) { m.userData.u.uUnder.value = lin(map[u]); m.userData.underHex = map[u]; }
    });
  }
  const shift = (hex, deg, sm, la) => { const c = new T.Color(hex), hsl = {}; c.getHSL(hsl); c.setHSL((hsl.h + deg / 360 + 1) % 1, Math.min(1, hsl.s * sm), Math.max(0, Math.min(1, hsl.l + la))); return c.getHex(); };
  // hue turn for every plush colour except near-whites / near-blacks (cream bellies, ink stay)
  function hue(g, deg, sm = 1, la = 0, keep = []) {
    softMats(g).forEach(m => {
      const h = m.userData.hex; if (keep.includes(h)) return;
      const c = new T.Color(h), hsl = {}; c.getHSL(hsl);
      if (hsl.s < .12 || hsl.l > .93 || hsl.l < .12) return;
      setTone(m, shift(h, deg, sm, la), m.userData.underHex != null ? shift(m.userData.underHex, deg, sm, la) : null);
    });
  }
  // special finishes for SSR / UR
  const FIN = {
    gold:    (l) => [new T.Color().setHSL(.12 - l * .03, .92, .38 + l * .3).getHex(), 0xff8a3a, { sheen: 0xfff0a0, k: .8, glow: .05, metal: .18 }],
    pearl:   (l) => [new T.Color().setHSL(.78, .62, .76 + l * .1).getHex(), 0x7fd8ff, { sheen: 0xffd6ff, k: .9, glow: .06 }],
    night:   (l) => [new T.Color().setHSL(.69, .34, .34 + l * .3).getHex(), 0xc89cff, { sheen: 0x9ab4ff, k: .7, glow: .04 }],
    sakura:  (l) => [new T.Color().setHSL(.95, .75, .72 + l * .18).getHex(), 0xffd2a8, { sheen: 0xffffff, k: .5, glow: .04 }],
    mint:    (l) => [new T.Color().setHSL(.43, .55, .64 + l * .2).getHex(), 0x8ab8ff, { sheen: 0xe0fff4, k: .5, glow: .04 }],
    sky:     (l) => [new T.Color().setHSL(.56, .7, .62 + l * .22).getHex(), 0xb8a0ff, { sheen: 0xffffff, k: .5, glow: .04 }],
    rainbow: null,
  };
  function finish(g, kind) {
    const ms = softMats(g);
    if (kind === 'rainbow') {
      ms.forEach((m, i) => { const c = new T.Color(m.userData.hex), hsl = {}; c.getHSL(hsl); if (hsl.l < .12) return; setTone(m, new T.Color().setHSL((i * .17 + .02) % 1, .75, .66 + hsl.l * .12).getHex(), new T.Color().setHSL((i * .17 + .2) % 1, .8, .7).getHex()); m.userData.u && (m.userData.u.uGlow.value = .05); });
      return;
    }
    const f = FIN[kind]; if (!f) return;
    ms.forEach(m => {
      const c = new T.Color(m.userData.hex), hsl = {}; c.getHSL(hsl);
      if (hsl.l < .1) return;                       // keep near-black details (pupils of plush parts, ink)
      const [hex, under, o] = f(hsl.l);
      setTone(m, hex, under);
      if (m.sheen && m.sheen.isColor) m.sheen.copy(new T.Color(o.sheen).multiplyScalar(o.k * .4));
      if (m.userData.u) m.userData.u.uGlow.value = o.glow;
      if (o.metal) m.metalness = o.metal;
    });
  }

  /* ---------------- accessories (soft felt + bead look, same as the creatures) ---------------- */
  const felt = (hex, under, o = {}) => soft(hex, Object.assign({ under, uk: .45 }, o));
  const goldFelt = () => soft(0xffd65a, { under: 0xffa040, uk: .4, sheen: 0xfff3c0, sheenK: .6, glow: .1, rough: .6 });
  const gem = hex => soft(hex, { rough: .3, rim: .35, glow: .12 });
  function tiara(s) {
    const g = new T.Group(), gm = goldFelt();
    const band = mesh(new T.TorusGeometry(.42, .055, 10, 40, Math.PI), gm); band.rotation.set(Math.PI / 2 - .25, 0, 0); g.add(band);
    [-.7, 0, .7].forEach((a, i) => { const p = [Math.sin(a) * .42, .12 + (i === 1) * .08, Math.cos(a) * .42 * .92]; blob(g, gm, p, [.08, .16 + (i === 1) * .06, .05], [-.25, a, 0]); blob(g, gem(i === 1 ? 0xff6fa8 : 0x6fc8ff), [p[0], p[1] + .13 + (i === 1) * .06, p[2] + .02], .065); });
    g.scale.setScalar(s); return g;
  }
  function halo(s) { const g = new T.Group(), r = mesh(new T.TorusGeometry(.42, .075, 14, 48), M({ color: 0xfff2a8, emissive: 0xffe680, emissiveIntensity: .9, roughness: .5 })); r.rotation.x = Math.PI / 2 - .62; g.add(r); g.position.y = .26; K.noShadow(g); const w = new T.Group(); w.add(g); w.scale.setScalar(s); return w; }
  function bow(s, hex = 0xff7f9e, under = 0xff5f8a) {
    const g = new T.Group(), m = felt(hex, under);
    [-1, 1].forEach(k => blob(g, m, [k * .2, .02, 0], [.2, .14, .09], [0, 0, k * .35]));
    blob(g, m, [0, 0, .02], [.08, .08, .07]);
    [-1, 1].forEach(k => blob(g, m, [k * .09, -.15, -.01], [.05, .13, .04], [0, 0, k * .4]));
    g.scale.setScalar(s); return g;
  }
  function flower(s, hex = 0xffffff, mid = 0xffd34f) {
    const g = new T.Group(), pm = felt(hex, 0xffc4d6);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; blob(g, pm, [Math.cos(a) * .14, Math.sin(a) * .14, 0], [.11, .11, .05]); }
    blob(g, felt(mid, 0xffa040), [0, 0, .03], [.08, .08, .05]);
    g.scale.setScalar(s); return g;
  }
  function sprout(s) {
    const g = new T.Group(), lf = soft(0x6ad37a, { under: 0x3fb0a0, uk: .4 });
    const st = mesh(new T.CylinderGeometry(.025, .035, .2, 8), soft(0x4fb062)); st.position.y = .1; g.add(st);
    blob(g, lf, [-.12, .22, 0], [.15, .055, .08], [0, 0, .5]); blob(g, lf, [.12, .25, 0], [.15, .055, .08], [0, 0, -.5]);
    g.scale.setScalar(s); return g;
  }
  function beret(s, hex = 0xff6b7a, under = 0xd85a9a) {
    const g = new T.Group(), m = felt(hex, under);
    blob(g, m, [0, .06, 0], [.5, .17, .48]); blob(g, m, [0, .22, 0], .06);
    g.rotation.z = -.22; g.scale.setScalar(s); return g;
  }
  function pawnhat(s, hex = 0x5a6aa8) {      // a tiny chess pawn worn like a hat
    const g = new T.Group(), m = soft(hex, { under: 0x8a76ff, uk: .45, rough: .7 });
    g.add(K.puck(.28, .1, m, .5)); blob(g, m, [0, .2, 0], [.13, .14, .13]); blob(g, m, [0, .43, 0], .14);
    g.scale.setScalar(s); return g;
  }
  function dicehat(s) {
    const g = new T.Group(), m = soft(0xfffcf6, { under: 0xc9d6ff, uk: .5 }), pip = soft(0xff6f78, { rough: .6, rim: .1 });
    K.sq(g, m, [0, .2, 0], [.4, .4, .4], .34);
    blob(g, pip, [0, .405, 0], [.06, .02, .06]); [[-.1, .1], [.1, -.1]].forEach(([x, y]) => blob(g, pip, [x, .2 + y, .203], [.045, .045, .015]));
    g.rotation.set(.1, .5, -.18); g.scale.setScalar(s); return g;
  }
  function star(s, hex = 0xffd34f) {           // a star hair clip
    const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .1 : .22; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const geo = new T.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .035, bevelSize: .035, bevelSegments: 4 }); geo.center();
    const g = new T.Group(); g.add(mesh(geo, soft(hex, { under: 0xffa040, uk: .4, glow: .06 }))); g.scale.setScalar(s); return g;
  }
  function scarf(r, hex = 0x6fb8ff, under = 0x8a76ff) {
    const g = new T.Group(), m = felt(hex, under);
    const ring = mesh(new T.TorusGeometry(r, r * .3, 16, 44), m); ring.rotation.x = Math.PI / 2 - .12; g.add(ring);
    blob(g, m, [r * .45, -r * .32, r * .82], [r * .2, r * .38, r * .1], [0, 0, .25]);
    [0, 1].forEach(i => blob(g, felt(0xffffff, 0xd6e0ff), [r * .45 + i * .001, -r * (.12 + i * .4), r * .9], [r * .21, r * .05, r * .08], [0, 0, .25]));
    return g;
  }
  function bell(r) {
    const g = new T.Group(), m = felt(0xff6b7a, 0xd85a9a);
    const ring = mesh(new T.TorusGeometry(r, r * .12, 12, 40), m); ring.rotation.x = Math.PI / 2; g.add(ring);
    blob(g, soft(0xffd65a, { rough: .5, sheenK: .5, glow: .06 }), [0, -r * .2, r * 1.02], r * .22);
    return g;
  }
  function crownAcc(s, ur) { return K.crown(goldFelt(), soft(ur ? 0xff5a8a : 0x5ec8ff, { rough: .35, rim: .05 }), s); }
  function aura(g, R, y) {        // UR: a ring of little stars circling the creature
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; K.sparkle(g, [Math.cos(a) * R, y + Math.sin(a * 2) * R * .12, Math.sin(a) * R * .6 - R * .1], .07 + (i % 3) * .025); }
  }
  // put an accessory on the creature; anchors from userData (fallback: top of the bounding box)
  function anchors(g) {
    const box = new T.Box3().setFromObject(g), c = box.getCenter(V3());
    const hd = g.userData.head || [c.y, (box.max.y - box.min.y) * .3, c.z];
    return { box, c, hr: hd[1], top: g.userData.top || [c.x, box.max.y - hd[1] * .05, hd[2] || c.z, 0], neck: g.userData.neck || null };
  }
  const ACC = {
    sprout: (g, A) => at(g, sprout(A.hr * 1.1), A.top, 0, -.02),
    bow: (g, A, o) => at(g, bow(A.hr * .95, o.c, o.u), [A.top[0] + A.hr * .42, A.top[1] - A.hr * .12, A.top[2] + A.hr * .1, A.top[3]], -.4, 0),
    flower: (g, A, o) => at(g, flower(A.hr * .9, o.c, o.m), [A.top[0] - A.hr * .45, A.top[1] - A.hr * .14, A.top[2] + A.hr * .18, A.top[3]], .45, 0),
    star: (g, A, o) => at(g, star(A.hr * .85, o.c), [A.top[0] + A.hr * .5, A.top[1] - A.hr * .16, A.top[2] + A.hr * .2, A.top[3]], -.35, 0),
    beret: (g, A, o) => at(g, beret(A.hr * .82, o.c, o.u), A.top, 0, -A.hr * .06),
    pawnhat: (g, A, o) => at(g, pawnhat(A.hr * .9, o.c), A.top, -.15, -A.hr * .04),
    dicehat: (g, A) => at(g, dicehat(A.hr * 1.0), A.top, 0, -A.hr * .03),
    crown: (g, A, o) => at(g, crownAcc(A.hr * .82, o.ur), A.top, -.12, -A.hr * .06),
    tiara: (g, A) => at(g, tiara(A.hr * 1.05), A.top, 0, -A.hr * .1),
    halo: (g, A) => at(g, halo(A.hr * 1.0), A.top, 0, A.hr * .16),
    scarf: (g, A, o) => { if (!A.neck) return ACC.bow(g, A, o); const s = scarf(A.neck[3], o.c, o.u); s.position.set(A.neck[0], A.neck[1], A.neck[2]); g.add(s); },
    bell: (g, A) => { if (!A.neck) return ACC.star(g, A, {}); const s = bell(A.neck[3]); s.position.set(A.neck[0], A.neck[1], A.neck[2]); g.add(s); },
  };
  function at(g, o, p, tilt = 0, lift = 0) { o.position.set(p[0], p[1] + lift, p[2]); o.rotation.z += (p[3] || 0) + tilt; g.add(o); return o; }
  const DEFAULT_ACC = [[], ['sprout'], ['beret'], ['crown']];

  /* ---------------- build one tier ---------------- */
  function rarity(id, t) { const s = SPECIES[id]; return t < 3 ? t : (s && s.ur ? 4 : 3); }
  function make(id, t) {
    const S = SPECIES[id]; if (!S) throw new Error('no species ' + id);
    const v = (S.v && S.v[t]) || {};
    const g = S.build(v.opt || {}, t);
    if (v.hue) hue(g, ...v.hue);
    if (v.map) recolor(g, v.map);
    if (v.finish || (t === 3 && S.ur)) finish(g, v.finish || 'gold');
    const A = anchors(g), ur = t === 3 && S.ur;
    (v.acc || DEFAULT_ACC[t]).forEach(a => { const [name, c, u, m] = Array.isArray(a) ? a : [a]; ACC[name] && ACC[name](g, A, { c, u, m, ur }); });
    const n0 = g.children.length;
    if (t === 3) {                                  // sparkles around SSR / UR
      const R = Math.max(A.box.max.x - A.box.min.x, A.box.max.y - A.box.min.y) * .5;
      K.sparkle(g, [A.c.x + R * .95, A.box.max.y - R * .15, A.c.z + R * .3], .12); K.sparkle(g, [A.c.x - R * 1.0, A.c.y + R * .1, A.c.z + R * .3], .09); K.sparkle(g, [A.c.x + R * .85, A.box.min.y + R * .35, A.c.z + R * .4], .075);
      if (ur) aura(g, R * 1.05, A.c.y + R * .15);
    }
    g.children.forEach((c, i) => { if (i >= n0) c.userData.fx = true; });   // sparkles don't count when the camera frames the creature
    return g;
  }
  function list() { const out = []; ORDER.forEach(id => { for (let t = 0; t < 4; t++) out.push({ id: id + '-' + t, sp: id, t, rar: rarity(id, t) }); }); return out; }

  window.Avatars3D = { SPECIES, ORDER, define, make, rarity, list, recolor, hue, finish, ACC, anchors };
})();
