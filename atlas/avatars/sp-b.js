/* Avatar species — set B: playing cards & table toys (joker, card suits, mahjong, hanafuda, menko, domino, coin, letter tiles). */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M, sq = K.sq, sph = K.sph, ell = K.ell,
    face = K.face, alive = K.alive, stick = K.stick, decal = K.decal, hugDecal = K.hugDecal, puck = K.puck, noShadow = K.noShadow, INK = K.INK;
  const D = Avatars3D.define;

  /* ---------- local helpers ---------- */
  const inkSoft = () => soft(INK, { rough: .45, rim: .05 });
  const fixed = m => { m.userData.soft = false; return m; };   // plush look, but kept out of tier recolouring (motif colours)
  function ext(shape, depth, mat, bev = .04) {
    const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 5, curveSegments: 20 });
    geo.center(); return mesh(geo, mat);
  }
  function heartShape(s) {
    const h = new T.Shape(); h.moveTo(0, -.5 * s);
    h.bezierCurveTo(.16 * s, -.3 * s, .52 * s, -.1 * s, .5 * s, .16 * s);
    h.bezierCurveTo(.48 * s, .44 * s, .16 * s, .52 * s, 0, .26 * s);
    h.bezierCurveTo(-.16 * s, .52 * s, -.48 * s, .44 * s, -.5 * s, .16 * s);
    h.bezierCurveTo(-.52 * s, -.1 * s, -.16 * s, -.3 * s, 0, -.5 * s);
    return h;
  }
  function spadeShape(s) {            // an upside-down heart with a flared stem
    const h = new T.Shape(); h.moveTo(0, .55 * s);
    h.bezierCurveTo(.16 * s, .34 * s, .52 * s, .14 * s, .5 * s, -.12 * s);
    h.bezierCurveTo(.48 * s, -.38 * s, .2 * s, -.42 * s, .06 * s, -.24 * s);
    h.quadraticCurveTo(.1 * s, -.48 * s, .24 * s, -.58 * s); h.lineTo(-.24 * s, -.58 * s);
    h.quadraticCurveTo(-.1 * s, -.48 * s, -.06 * s, -.24 * s);
    h.bezierCurveTo(-.2 * s, -.42 * s, -.48 * s, -.38 * s, -.5 * s, -.12 * s);
    h.bezierCurveTo(-.52 * s, .14 * s, -.16 * s, .34 * s, 0, .55 * s);
    return h;
  }
  function starShape(ro, ri, n = 5) {
    const h = new T.Shape();
    for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? ri : ro; i ? h.lineTo(Math.cos(a) * r, Math.sin(a) * r) : h.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    h.closePath(); return h;
  }
  function mapleShape(s) {            // a 5-lobed momiji leaf
    const h = new T.Shape(), out = [[-35, .46], [30, .52], [90, .6], [150, .52], [215, .46]], pts = [];
    out.forEach(([a, r], i) => {
      pts.push([a, r]);
      const nx = out[i + 1]; if (nx) pts.push([(a + nx[0]) / 2, .2]);
    });
    pts.push([270 - 18, .12], [270, .05], [270 + 18, .12]);
    pts.forEach(([a, r], i) => { const x = Math.cos(a * Math.PI / 180) * r * s, y = Math.sin(a * Math.PI / 180) * r * s; i ? h.lineTo(x, y) : h.moveTo(x, y); });
    h.closePath(); return h;
  }
  function clover(g, mat, p, r, rotZ, inner) {   // club / clover trefoil in the xy plane at p
    const c = new T.Group();
    [90, 210, 330].forEach(a => { const x = Math.cos(a * Math.PI / 180) * r * .78, y = Math.sin(a * Math.PI / 180) * r * .78; blob(c, mat, [x, y, 0], [r * .62, r * .62, r * .3]); if (inner) blob(c, inner, [x * 1.02, y * 1.02, r * .14], [r * .38, r * .38, r * .2]); });
    blob(c, mat, [0, 0, 0], [r * .4, r * .4, r * .3]);
    c.position.set(...p); c.rotation.z = rotZ || 0; g.add(c); return c;
  }
  function roundCone(r, h, tip) {     // a soft cone with a rounded tip, axis along +z
    const pts = [new T.Vector2(0, 0), new T.Vector2(r, 0), new T.Vector2(r * .98, h * .12)];
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2; pts.push(new T.Vector2(tip * Math.cos(a), h - tip + tip * Math.sin(a))); }
    const geo = new T.LatheGeometry(pts, 22); geo.rotateX(Math.PI / 2); return geo;
  }
  const plane = (w, h, mat) => noShadow(mesh(new T.PlaneGeometry(w, h), mat));
  const cnv = (fn) => (c, W, H) => { c.clearRect(0, 0, W, H); fn(c, W, H); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function drawStar(c, x, y, ro, ri) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? ri : ro; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); }
  function drawHeart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + .5 * s); c.bezierCurveTo(x + .16 * s, y + .3 * s, x + .52 * s, y + .1 * s, x + .5 * s, y - .16 * s); c.bezierCurveTo(x + .48 * s, y - .44 * s, x + .16 * s, y - .52 * s, x, y - .26 * s); c.bezierCurveTo(x - .16 * s, y - .52 * s, x - .48 * s, y - .44 * s, x - .5 * s, y - .16 * s); c.bezierCurveTo(x - .52 * s, y + .1 * s, x - .16 * s, y + .3 * s, x, y + .5 * s); c.closePath(); }
  const feet = (g, mat, x, z, r = [.15, .09, .19], y = .08) => [-1, 1].forEach(s => blob(g, mat, [s * x, y, z], r));

  /* 1. ジョーカーネコ — a kitten jester: three-pointed soft hat with bells, a pleated ruff, harlequin diamonds */
  D('joker', {
    name: { ja: 'ジョーカーネコ', en: 'Jesterkit' },
    desc: { ja: '鈴つき道化ぼうしの子ねこ。切り札はいつもこの子。', en: 'A jester kitten with jingling bells — always the trump card.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group();
      const F = soft(0xfff0dc, { under: 0xffc4d8, uk: .45 }), P = soft(0xb08cff, { under: 0xff8fc8, uk: .5 }), Y = soft(0xffd65a, { under: 0xff9a6a, uk: .45 }),
        R = soft(0xff7a98, { under: 0xd85aa8, uk: .45 }), Wt = soft(0xfffaf3, { under: 0xd6d0ff, uk: .4 }), pink = soft(0xffb3c6), bellM = soft(0xffe48a, { under: 0xffa040, uk: .4, sheen: 0xfff3c0, sheenK: .6, glow: .08, rough: .6 });
      const bc = V3(0, .5, 0), BR = [.5, .48, .44];
      blob(g, F, [bc.x, bc.y, bc.z], BR);
      const bellyM = decal('spb-harl', 128, 128, cnv((c, W) => {
        const cols = ['#b08cff', '#ff7a98', '#ffd65a', '#7cc8ff'];
        [[W / 2, W * .28, 0], [W * .28, W / 2, 1], [W * .72, W / 2, 2], [W / 2, W * .72, 3]].forEach(([x, y, i]) => { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(x, y - 30); c.lineTo(x + 22, y); c.lineTo(x, y + 30); c.lineTo(x - 22, y); c.closePath(); c.fill(); });
      }));
      const bd = hugDecal(ell(bc, BR), 0, -.04, .44, .44, bellyM); stick(g, bd.m, bd.s, .006);
      const hc = V3(0, 1.42, .02), HR = [.86, .74, .76];
      blob(g, F, [hc.x, hc.y, hc.z], HR);
      // ruff collar: pleats around the neck
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; blob(g, i % 2 ? Wt : R, [Math.sin(a) * .56, .86, Math.cos(a) * .52 + .02], [.19, .085, .12], [0, a, 0]); }
      // jester hat: cap + band + three floppy points with bells
      blob(g, P, [0, 1.84, -.06], [.8, .42, .74]);
      const band = mesh(new T.TorusGeometry(.79, .1, 14, 48), Y); band.rotation.x = Math.PI / 2 - .1; band.position.set(0, 1.74, .0); g.add(band);
      [[-1, Y], [1, R]].forEach(([s, m]) => {
        [[.42, 2.04, -.08, .27], [.72, 2.24, -.08, .21], [.98, 2.2, -.05, .16], [1.1, 1.99, -.02, .12]].forEach(([x, y, z, r]) => blob(g, m, [s * x, y, z], r));
        blob(g, bellM, [s * 1.1, 1.82, .0], .11);
      });
      [[0, 2.14, -.42, .26], [.04, 2.38, -.54, .2], [.14, 2.56, -.62, .15], [.27, 2.66, -.66, .11]].forEach(([x, y, z, r]) => blob(g, P, [x, y, z], r));
      blob(g, bellM, [.4, 2.68, -.66], .11);
      // little cat ears peeking out under the band
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.17, .34, 24), F); e.position.set(s * .7, 1.78, .3); e.rotation.set(.35, 0, -s * 1.05); e.scale.z = .55; g.add(e); const ei = mesh(new T.ConeGeometry(.09, .22, 18), pink); ei.position.set(s * .71, 1.78, .33); ei.rotation.set(.35, 0, -s * 1.05); ei.scale.z = .4; g.add(ei); });
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .28, v: .02, mouth: 'w', mw: .12, my: .3, by: .1, bx: .14 });
      blob(g, soft(0xff8aa8, { rough: .5 }), [0, 1.32, .77], [.06, .045, .04]);   // pink nose
      // tail with a curl
      [[.34, .34, -.38, .1], [.52, .5, -.46, .09], [.6, .72, -.44, .085], [.54, .9, -.38, .08]].forEach(([x, y, z, r]) => blob(g, F, [x, y, z], r));
      blob(g, R, [.46, .98, -.34], .085);
      [-1, 1].forEach(s => blob(g, F, [s * .42, .6, .24], [.12, .16, .12], [0, 0, s * .4]));
      feet(g, F, .24, .26);
      if (tier === 3) [[-.95, .2, .35, .4], [.95, .25, .35, -.4]].forEach(([x, y, z, r]) => { const cd = ext(heartShape(.22), .05, soft(0xff7a98, { under: 0xff5f8a })); cd.position.set(x, y + .2, z); cd.rotation.z = r; g.add(cd); });
      if (tier === 2) {          // SR: a big jingle bell hanging from the ruff
        const bl = soft(0xffd65a, { under: 0xff9a4a, uk: .45, sheen: 0xfff3c0, sheenK: .6, glow: .06, rough: .55 });
        blob(g, bl, [0, .66, .66], [.17, .16, .15]); blob(g, R, [0, .82, .62], [.07, .05, .05]); blob(g, soft(INK, { rough: .5 }), [0, .6, .8], [.05, .02, .02]);
      }
      g.userData.head = [1.5, .95, .05]; g.userData.top = [-.02, 2.26, .3, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, .9, 0], acc: [['flower', 0xffffff]] }, { hue: [-70, 1, 0], acc: [] }, {}],
  });

  /* 2. ハートハリネズミ — a hedgehog with soft rounded spikes and a heart on its forehead */
  D('hedgehog', {
    name: { ja: 'ハートハリネズミ', en: 'Hearthog' },
    desc: { ja: 'おでこにハートのハリネズミ。トゲはぜんぶふわふわ。', en: 'A hedgehog with a heart on its forehead and squishy spikes.' },
    build() {
      const g = new T.Group();
      const B = soft(0xf6a6bc, { under: 0xc89cff, uk: .45 }), S1 = soft(0xff9ab6, { under: 0xb48cff, uk: .55 }), S2 = soft(0xffc2d2, { under: 0xd0a8ff, uk: .55 }),
        cr = soft(0xfff1e2, { under: 0xffd0c8, uk: .4 }), H = fixed(soft(0xff5f7e, { under: 0xff3f8a, uk: .4, glow: .04 }));
      const bc = V3(0, .92, -.05), BR = [.92, .86, .86];
      blob(g, B, [bc.x, bc.y, bc.z], BR);
      const fc = V3(0, .9, .28), FR = [.7, .66, .58];
      blob(g, cr, [fc.x, fc.y, fc.z], FR);
      const sp = roundCone(.15, .4, .07);
      for (let row = 0; row < 5; row++) {
        const pitch = -.3 + row * .34, n = 9 - (row > 2) * 2;
        for (let i = 0; i < n; i++) {
          const yaw = Math.PI * (.42 + 1.16 * (i + (row % 2) * .5) / (n - .5)) + (row >= 3 ? 0 : 0);
          if (row === 4 && Math.cos(yaw) > -.2) continue;
          const s = sph(bc, BR, yaw, pitch), m = mesh(sp, (i + row) % 2 ? S1 : S2); stick(g, m, s, -.06);
        }
      }
      [[-.32, 1.04], [-.12, 1.32], [.12, 1.32], [.32, 1.04], [0, 1.72]].forEach(([a, p]) => { stick(g, mesh(sp, S1), sph(bc, BR, Math.PI + a * 1.6, p), -.06); });
      const eyes = face(g, ell(fc, FR), { er: .11, gap: .25, v: .04, mouth: 'smile', mw: .08, my: .3, by: .16, bx: .11 });
      blob(g, inkSoft(), [0, .82, .86], [.07, .055, .05]);
      const ht = ext(heartShape(.28), .06, H); stick(g, ht, ell(fc, FR)(0, .36), .02); ht.rotation.z += 0;
      const bh = ext(heartShape(.42), .08, H); stick(g, bh, sph(bc, BR, Math.PI, .25), .12);   // a heart on its back among the spikes
      [-1, 1].forEach(s => blob(g, B, [s * .62, .58, .48], [.13, .17, .13], [0, 0, s * .5]));
      feet(g, cr, .3, .45, [.16, .08, .2]);
      g.userData.head = [1.0, .92, .2]; g.userData.top = [0, 1.74, .12, 0]; g.userData.neck = [0, .72, .18, .66];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, .85, 0], acc: ['bow'] }, { hue: [-90, .95, .02], acc: ['beret'] }, { finish: 'pearl', acc: ['tiara'] }],
  });

  /* 3. スペードモモンガ — a flying squirrel gliding with its arms out, spade-suit tail */
  D('momonga', {
    name: { ja: 'スペードモモンガ', en: 'Spadeglider' },
    desc: { ja: 'スペードのしっぽでかじを取る、ふわりと飛ぶモモンガ。', en: 'A flying squirrel that steers with its spade-shaped tail.' },
    build() {
      const g = new T.Group();
      const Gm = soft(0xb3a4f2, { under: 0x8ac4ff, uk: .5 }), cr = soft(0xfff6ea, { under: 0xffd2dc, uk: .4 }), Sp = soft(0x7f72d8, { under: 0xff8fcf, uk: .5 }), pink = soft(0xffb8cc);
      blob(g, Gm, [0, .6, 0], [.48, .48, .4]);
      blob(g, cr, [0, .56, .2], [.3, .32, .24]);
      const hc = V3(0, 1.42, .04), HR = [.84, .7, .7];
      blob(g, Gm, [hc.x, hc.y, hc.z], HR);
      blob(g, cr, [0, 1.2, .3], [.6, .36, .46]);
      [-1, 1].forEach(s => { blob(g, Gm, [s * .52, 2.0, -.08], [.22, .24, .12], [0, 0, -s * .3]); blob(g, pink, [s * .52, 1.99, .02], [.13, .15, .05], [0, 0, -s * .3]); });
      const eyes = face(g, ell(hc, HR), { er: .13, gap: .3, v: .06, mouth: 'open', mw: .08, my: .32, by: .12, bx: .12 });
      blob(g, soft(0xff8aa8, { rough: .5 }), [0, 1.3, .74], [.06, .045, .04]);
      // gliding membranes + arms/legs spread out
      [-1, 1].forEach(s => {
        blob(g, Gm, [s * .62, .66, -.04], [.46, .36, .07], [0, 0, s * .12]);
        blob(g, cr, [s * .66, .62, .0], [.36, .26, .05], [0, 0, s * .12]);
        blob(g, Gm, [s * 1.0, .96, -.02], [.13, .13, .13]);
        blob(g, Gm, [s * .92, .3, -.02], [.13, .12, .13]);
      });
      // spade tail rising behind
      [[-.3, .4, -.42, .12], [-.52, .58, -.5, .1], [-.7, .8, -.5, .09]].forEach(([x, y, z, r]) => blob(g, Gm, [x, y, z], r));
      const tl = ext(spadeShape(.8), .14, Sp, .06); tl.position.set(-.84, 1.24, -.5); tl.rotation.set(0, -.15, .32); g.add(tl);
      feet(g, cr, .22, .28, [.14, .08, .17]);
      g.userData.head = [1.5, .92, .05]; g.userData.top = [0, 2.1, .02, 0]; g.userData.neck = [0, .98, .04, .42];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-150, 1.3, 0], acc: [['star', 0xffd34f]] }, { hue: [120, 1.3, -.02], acc: ['beret'] }, { finish: 'night', acc: ['crown'] }],
  });

  /* 4. クローバーコアラ — a koala whose ears are club-suit clovers, big soft nose */
  D('koala', {
    name: { ja: 'クローバーコアラ', en: 'Clubkoala' },
    desc: { ja: 'クローバーの耳をもつコアラ。四つ葉をさがしてうとうと。', en: 'A koala with clover-club ears, dozing while it looks for luck.' },
    build() {
      const g = new T.Group();
      const Gk = soft(0xb6c2de, { under: 0xc8a8ff, uk: .45 }), cr = soft(0xfff6ea, { under: 0xd6e0ff, uk: .4 }), Gr = soft(0x86d896, { under: 0x5ec0b8, uk: .45 }), Gl = soft(0xc8f0b8, { under: 0x9ad8c0, uk: .4 }),
        nose = fixed(soft(0x50566e, { under: 0x6a5aa0, uk: .4, rough: .5, rim: .2, sheen: 0xc0c8ff, sheenK: .3 }));
      blob(g, Gk, [0, .55, 0], [.52, .5, .45]);
      blob(g, cr, [0, .52, .22], [.32, .32, .25]);
      const hc = V3(0, 1.42, .02), HR = [.9, .74, .74];
      blob(g, Gk, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => clover(g, Gr, [s * .82, 1.98, -.08], .3, -s * .35, Gl));
      [-1, 1].forEach(s => { const st = mesh(new T.CylinderGeometry(.04, .05, .2, 10), Gr); st.position.set(s * .7, 1.74, -.08); st.rotation.z = s * .5; g.add(st); });
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .38, v: .14, eyes: 'happy', mouth: 'smile', mw: .07, my: .5, by: .16, bx: .12 });
      blob(g, nose, [0, 1.36, .74], [.17, .22, .13]);
      clover(g, Gr, [0, .58, .48], .1, 0);
      [-1, 1].forEach(s => blob(g, Gk, [s * .4, .66, .3], [.13, .16, .13], [0, 0, s * .5]));
      feet(g, Gk, .25, .28);
      g.userData.head = [1.5, .95, .05]; g.userData.top = [0, 2.14, .02, 0]; g.userData.neck = [0, .96, .02, .44];
      return alive(g, eyes);
    },
    v: [{}, { hue: [140, 1, 0], acc: [['star', 0xffd34f]] }, { hue: [-70, 1.1, .02], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { finish: 'mint', acc: ['tiara'] }],
  });

  /* 5. ラッコパイ — a sea otter floating on its back, a mahjong tile propped on its tummy */
  D('otter', {
    name: { ja: 'ラッコパイ', en: 'Tileotter' },
    desc: { ja: 'おなかに麻雀牌をのせてぷかぷか。いい牌がくるまで待つ。', en: 'Floats with a mahjong tile on its tummy, waiting for a good draw.' },
    build() {
      const g = new T.Group();
      const Br = soft(0xd9ad86, { under: 0xff9fa8, uk: .45 }), cr = soft(0xfff3e2, { under: 0xffd0c0, uk: .4 }), Wa = soft(0x9fdcff, { under: 0x8aa8ff, uk: .4, rough: .6, sheen: 0xffffff, sheenK: .4 }),
        foam = soft(0xffffff, { under: 0xc8e4ff, uk: .4 }), tw = soft(0xfffdf4, { under: 0xe8e4d8, uk: .3, rough: .6 }), tg = soft(0x6ccf9a, { under: 0x4fb0a8, uk: .4, rough: .6 });
      const pool = puck(.98, .14, Wa, .5); pool.position.y = -.02; g.add(pool);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; blob(g, foam, [Math.sin(a) * .94, .13, Math.cos(a) * .9], [.12, .07, .1]); }
      const rot = [-1.0, 0, 0], bc = V3(0, .5, -.05);
      blob(g, Br, [bc.x, bc.y, bc.z], [.58, .82, .48], rot);
      blob(g, cr, [0, .62, .02], [.46, .66, .4], rot);
      const hc = V3(0, 1.26, -.5), HR = [.66, .58, .56];
      blob(g, Br, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.12, -.12), MR = [.34, .22, .2];
      blob(g, cr, [mc.x, mc.y, mc.z], MR);
      [-1, 1].forEach(s => blob(g, Br, [s * .48, 1.66, -.58], [.12, .1, .07]));
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .26, v: .14, mouth: 'w', msurf: ell(mc, MR), mv: -.07, mw: .1, by: .12, bx: .14 });
      blob(g, inkSoft(), [0, 1.2, .07], [.07, .05, .045]);
      // mahjong tile: ivory face, green back, a circle-dots face
      const tile = new T.Group();
      sq(tile, tw, [0, 0, .04], [.5, .66, .16], .26); sq(tile, tg, [0, 0, -.07], [.5, .66, .1], .26);
      const tm = decal('spb-pin', 160, 212, cnv((c, W, H) => {
        const ring = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = '#fffdf4'; c.beginPath(); c.arc(x, y, r * .55, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(x, y, r * .25, 0, 7); c.fill(); };
        [[44, 50, '#3f7fe0'], [116, 50, '#2aa86a'], [80, 106, '#ff4f6a'], [44, 162, '#2aa86a'], [116, 162, '#3f7fe0']].forEach(([x, y, col]) => ring(x, y, 27, col));
      }));
      const tp = plane(.42, .56, tm); tp.position.z = .121; tile.add(tp);
      tile.position.set(0, .82, .38); tile.rotation.set(-.42, 0, .06); g.add(tile);
      [-1, 1].forEach(s => blob(g, Br, [s * .3, .9, .46], [.11, .13, .11]));
      [-1, 1].forEach(s => blob(g, Br, [s * .24, .3, .74], [.13, .1, .2], [-.4, 0, 0]));
      blob(g, Br, [0, .16, .92], [.1, .05, .26]);
      g.userData.head = [1.1, .95, -.2]; g.userData.top = [0, 1.84, -.5, 0]; g.userData.neck = [0, .86, -.42, .4];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-160, .7, .04], acc: ['bow'] }, { hue: [70, .9, 0], acc: ['beret'] }, { finish: 'sky', acc: ['crown'] }],
  });

  /* 6. ハナフダシカ — a spotted fawn on a hanafuda card, a red momiji leaf by its antler nubs */
  D('deer', {
    name: { ja: 'ハナフダシカ', en: 'Fudafawn' },
    desc: { ja: '花札の上でおすまし。角にもみじを一枚かざった小鹿。', en: 'A fawn posing on a hanafuda card, a maple leaf by its tiny antlers.' },
    build() {
      const g = new T.Group();
      const Tn = soft(0xf2b47e, { under: 0xff9aa0, uk: .45 }), cr = soft(0xfff4e6, { under: 0xffd6c8, uk: .4 }), Wt = soft(0xffffff, { under: 0xffe6e0, uk: .3 }), hoof = soft(0x8a5a4a, { rough: .6 }),
        nub = soft(0xe8c49a, { under: 0xc89a7a, uk: .4 }), red = fixed(soft(0xff4f4f, { under: 0xff2f6a, uk: .4, glow: .05 })), pink = soft(0xffb3c0), card = soft(0x3a2f3c, { under: 0x5a4a7a, uk: .4, rough: .7 });
      const cb = K.rbox(1.24, .1, 1.66, .1, card); cb.rotation.y = .25; g.add(cb);
      const cm = decal('spb-fuda', 192, 256, (c, W, H) => {
        c.fillStyle = '#c8202a'; rr(c, 0, 0, W, H, 18); c.fill();
        c.fillStyle = '#f6e7c8'; rr(c, 12, 12, W - 24, H - 24, 10); c.fill();
        c.fillStyle = '#f2c14a'; c.fillRect(12, 12, W - 24, 52);
        const leaf = (x, y, s, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * .4 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); };
        [[50, 110, 26, '#e8402a'], [140, 96, 22, '#ff7a2a'], [96, 160, 30, '#d8202a'], [44, 210, 20, '#ff7a2a'], [150, 200, 24, '#e8402a']].forEach(a => leaf(...a));
      });
      const cp = plane(1.12, 1.52, cm); cp.rotation.set(-Math.PI / 2, 0, .25); cp.position.y = .102; g.add(cp);
      const y0 = .1;
      blob(g, Tn, [0, y0 + .66, -.05], [.44, .4, .5]);
      blob(g, cr, [0, y0 + .6, .22], [.28, .28, .24]);
      [[-.22, .26], [.22, .26], [-.22, -.3], [.22, -.3]].forEach(([x, z]) => { blob(g, Tn, [x, y0 + .3, z], [.1, .26, .1]); blob(g, hoof, [x, y0 + .06, z + .02], [.1, .06, .11]); });
      [[-.3, .9, -.1], [.32, .86, -.24], [-.16, .98, -.36], [.12, 1.0, -.1], [-.36, .7, -.32]].forEach(([x, y, z]) => blob(g, Wt, [x, y0 + y - .04, z], [.07, .05, .07]));
      blob(g, Wt, [0, y0 + .82, -.54], [.12, .14, .1]);   // fluffy tail
      const hc = V3(0, y0 + 1.48, .12), HR = [.74, .64, .62];
      blob(g, Tn, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, y0 + 1.24, .52), MR = [.32, .22, .24];
      blob(g, cr, [mc.x, mc.y, mc.z], MR);
      [[-1, .3, .4], [1, .45, .45], [-1, .5, .62], [1, .2, .7]].forEach(([s, a, p]) => { const sp = mesh(new T.SphereGeometry(1, 20, 14), Wt); sp.scale.set(.065, .065, .02); stick(g, sp, sph(hc, HR, s * a + (s < 0 ? -0 : 0) + Math.PI * (s < 0 ? 0 : 0), p), -.004); });
      [-1, 1].forEach(s => { blob(g, Tn, [s * .76, y0 + 1.66, -.02], [.32, .14, .12], [0, 0, s * .3]); blob(g, pink, [s * .76, y0 + 1.66, .06], [.22, .08, .04], [0, 0, s * .3]); });
      [-1, 1].forEach(s => { const st = mesh(new T.CylinderGeometry(.06, .08, .22, 12), nub); st.position.set(s * .26, y0 + 2.08, -.02); st.rotation.z = -s * .25; g.add(st); blob(g, nub, [s * .29, y0 + 2.2, -.02], .085); });
      const lf = ext(mapleShape(.6), .05, red, .025); lf.position.set(.5, y0 + 2.18, .1); lf.rotation.set(-.15, -.2, -.5); g.add(lf);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .28, v: .1, mouth: 'smile', msurf: ell(mc, MR), mv: -.08, mw: .07, by: .14, bx: .1 });
      blob(g, inkSoft(), [0, y0 + 1.3, .76], [.07, .05, .045]);
      g.userData.head = [1.55, .95, .1]; g.userData.top = [-.05, y0 + 2.12, .05, 0]; g.userData.neck = [0, y0 + .98, .1, .36];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-40, 1, .06], acc: [['flower', 0xffffff]] }, { hue: [160, .7, .04], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'sakura', acc: ['halo'] }],
  });

  /* 7. メンコアザラシ — a round seal pup holding a star-pattern menko card */
  D('seal', {
    name: { ja: 'メンコアザラシ', en: 'Menkoseal' },
    desc: { ja: 'ほしもようのメンコが宝物。ぺちんと返すのが得意。', en: 'Its star menko card is its treasure — great at flipping them.' },
    build() {
      const g = new T.Group();
      const Wb = soft(0xf4f6ff, { under: 0xb8c8ff, uk: .5 }), G2 = soft(0xd8e0f6, { under: 0xb0b8f0, uk: .45 }), mk = soft(0xff7f9e, { under: 0xff5f8a, uk: .4 }), rim = soft(0xffd65a, { under: 0xffa040, uk: .4 });
      blob(g, Wb, [0, .62, -.08], [.82, .62, .8]);
      const hc = V3(0, 1.36, .1), HR = [.76, .66, .64];
      blob(g, Wb, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => { blob(g, Wb, [s * .13, 1.2, .64], [.15, .12, .1]); [0, 1, 2].forEach(i => blob(g, soft(0x8a90b0, { rough: .6 }), [s * (.1 + i * .05), 1.2 - (i % 2) * .03 + .02, .735 - i * .01], .016)); });
      const eyes = face(g, ell(hc, HR), { er: .13, gap: .27, v: .08, mouth: 'none', by: .14, bx: .14 });
      blob(g, inkSoft(), [0, 1.28, .74], [.07, .05, .045]);
      const m = K.arc(.04, .016, K.inkM(), Math.PI * .8); stick(g, m, ell(hc, HR)(0, -.2), 0); m.rotateZ(Math.PI);
      // the menko
      const mg = new T.Group(), pk = puck(.4, .08, mk, .5); pk.rotation.x = Math.PI / 2; mg.add(pk);
      const rg = mesh(new T.TorusGeometry(.37, .035, 10, 40), rim); rg.position.z = .085; mg.add(rg);
      const mm = decal('spb-menko', 192, 192, cnv((c, W) => {
        c.fillStyle = '#5a8cff'; c.beginPath(); c.arc(W / 2, W / 2, W * .44, 0, 7); c.fill();
        c.fillStyle = '#ffe07a'; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(W / 2, W / 2); c.arc(W / 2, W / 2, W * .44, a, a + Math.PI / 8); c.closePath(); c.fill(); }
        c.fillStyle = '#ff5f7a'; drawStar(c, W / 2, W / 2 + 4, 52, 22); c.fill();
        c.fillStyle = '#ffffff'; [[30, 52], [158, 60], [44, 150], [150, 146]].forEach(([x, y]) => { drawStar(c, x, y, 13, 5.5); c.fill(); });
      }));
      const mp = plane(.66, .66, mm); mp.position.z = .084; mg.add(mp);
      mg.position.set(0, .68, .78); mg.rotation.set(-.25, 0, .12); g.add(mg);
      [-1, 1].forEach(s => blob(g, G2, [s * .42, .74, .76], [.12, .1, .2], [0, -s * .5, s * .5]));
      [-1, 1].forEach(s => blob(g, G2, [s * .2, .08, -.86], [.22, .06, .14], [0, s * .5, 0]));
      g.userData.head = [1.3, .95, .2]; g.userData.top = [0, 1.98, .1, 0];
      return alive(g, eyes);
    },
    v: [{}, { map: { 0xf4f6ff: 0xffe2ea, 0xd8e0f6: 0xffc0d2 }, acc: ['bow'] }, { map: { 0xf4f6ff: 0xc4d8f6, 0xd8e0f6: 0x98b4e8 }, hue: [-120, 1, 0], acc: ['beret'] }, { finish: 'pearl', acc: ['tiara'] }],
  });

  /* 8. ドミノダック — a duckling with domino wings, standing on a domino tile */
  D('duck', {
    name: { ja: 'ドミノダック', en: 'Dominoduck' },
    desc: { ja: 'ドミノの羽をもつアヒルの子。ならべて倒すのが大好き。', en: 'A duckling with domino wings. Loves lining them up and toppling them.' },
    build() {
      const g = new T.Group();
      const Y = soft(0xffe27a, { under: 0xffa98a, uk: .45, sheen: 0xfff6d0, sheenK: .3 }), O = fixed(soft(0xffa140, { under: 0xff7a6a, uk: .4 })), Wt = soft(0xfffcf6, { under: 0xc9d6ff, uk: .5 }), pip = soft(0x434a72, { rough: .6, rim: .1 });
      // the domino tile underfoot
      const dt = 0.22;
      sq(g, Wt, [0, dt / 2, .02], [1.7, dt, .82], .28);
      blob(g, pip, [0, dt + .002, .02], [.02, .012, .3]);
      [[-.6, -.22], [-.6, .26], [-.6, .02], [-.28, -.22], [-.28, .26], [-.28, .02], [.6, .26], [.28, -.22]].forEach(([x, z]) => blob(g, pip, [x, dt - .002, z], [.06, .02, .06]));
      const y0 = dt - .02;
      blob(g, Y, [0, y0 + .58, 0], [.56, .5, .5]);
      const hc = V3(0, y0 + 1.4, .06), HR = [.7, .62, .62];
      blob(g, Y, [hc.x, hc.y, hc.z], HR);
      [[0, 2.04, .04, .1], [-.12, 2.0, .0, .08], [.1, 2.06, -.06, .08]].forEach(([x, y, z, r]) => blob(g, Y, [x, y0 + y, z], [r, r * 1.6, r], [0, 0, x * 3]));
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .26, v: .1, mouth: 'none', by: .2, bx: .12 });
      blob(g, O, [0, y0 + 1.26, .64], [.22, .07, .16]); blob(g, O, [0, y0 + 1.18, .6], [.17, .05, .12]);
      // domino wings
      [-1, 1].forEach(s => {
        const w = new T.Group(); sq(w, Wt, [0, 0, 0], [.16, .5, .62], .4);
        blob(w, pip, [s * .081, 0, 0], [.01, .012, .22]);
        (s > 0 ? [[.13, 0]] : [[.13, -.13], [.13, .13]]).forEach(([y, z]) => blob(w, pip, [s * .08, y, z], [.015, .045, .045]));
        [[-.13, -.13], [-.13, .13]].forEach(([y, z]) => blob(w, pip, [s * .08, y, z], [.015, .045, .045]));
        w.position.set(s * .56, y0 + .64, 0); w.rotation.set(0, 0, s * .22); g.add(w);
      });
      feet(g, O, .22, .26, [.16, .06, .2], y0 + .05);
      blob(g, Y, [0, y0 + .66, -.5], [.14, .1, .16], [-.5, 0, 0]);
      g.userData.head = [y0 + 1.4, .9, .1]; g.userData.top = [.04, y0 + 1.98, -.02, 0]; g.userData.neck = [0, y0 + .92, .04, .44];
      return alive(g, eyes);
    },
    v: [{}, { hue: [140, .8, .02], acc: ['bow'] }, { hue: [-40, 1, 0], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'rainbow', acc: ['crown'] }],
  });

  /* 9. コインハム — a hamster with stuffed cheeks hugging a big star-stamped gold coin */
  const COIN = [0xf7b52c, 0xffe486];
  D('hamster', {
    name: { ja: 'コインハム', en: 'Coinhammy' },
    desc: { ja: 'ほっぺもうでも金貨でいっぱい。ためこむのが生きがい。', en: 'Cheeks and arms full of gold coins — hoarding is its life.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group();
      const Or = soft(0xffb46a, { under: 0xff8fa0, uk: .45 }), Wt = soft(0xfffaf2, { under: 0xffd6c8, uk: .4 }), pink = soft(0xffb3c6),
        Gd = soft(COIN[0], { under: 0xff8a2a, uk: .45, sheen: 0xfff3c0, sheenK: .6, glow: .02, rough: .6 }), Gl = soft(COIN[1], { under: 0xffb050, uk: .35, sheen: 0xffffff, sheenK: .6, glow: .08, rough: .55 });
      blob(g, Or, [0, .56, -.02], [.6, .55, .52]);
      blob(g, Wt, [0, .52, .2], [.42, .4, .34]);
      const hc = V3(0, 1.36, .04), HR = [.84, .7, .7];
      blob(g, Or, [hc.x, hc.y, hc.z], HR);
      blob(g, Wt, [0, 1.16, .3], [.56, .38, .46]);
      [-1, 1].forEach(s => blob(g, Wt, [s * .5, 1.14, .3], [.36, .32, .34]));   // stuffed cheeks
      [-1, 1].forEach(s => { blob(g, Or, [s * .5, 1.94, -.08], [.2, .2, .1]); blob(g, pink, [s * .5, 1.94, .0], [.12, .12, .04]); });
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .1, mouth: 'w', mw: .1, my: .3, by: .22, bx: .2 });
      blob(g, soft(0xff8aa8, { rough: .5 }), [0, 1.3, .74], [.06, .045, .04]);
      // the big gold coin
      const cg = new T.Group(), pk = puck(.5, .14, Gd, .5); pk.rotation.x = Math.PI / 2; cg.add(pk);
      const rg = mesh(new T.TorusGeometry(.43, .04, 10, 48), Gl); rg.position.z = .14; cg.add(rg);
      const st = ext(starShape(.26, .11), .04, Gl, .03); st.position.z = .16; cg.add(st);
      cg.position.set(0, .66, .52); cg.rotation.set(-.18, 0, -.1); g.add(cg);
      [-1, 1].forEach(s => blob(g, Or, [s * .44, .76, .62], [.12, .14, .12], [0, 0, s * .5]));
      feet(g, Wt, .26, .32, [.15, .08, .17]);
      if (tier === 3) {            // UR: a little stack of coins at its feet
        [0, 1, 2].forEach(i => { const c = puck(.2, .07, Gd, .5); c.position.set(.78 + (i % 2) * .02, i * .075, .32); g.add(c); });
        const c = puck(.2, .07, Gd, .5); c.position.set(-.8, 0, .2); g.add(c);
      }
      g.userData.head = [1.4, .95, .1]; g.userData.top = [0, 2.04, 0, 0]; g.userData.neck = [0, 1.0, .02, .5];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-25, .6, .12, COIN], acc: [['flower', 0xffffff]] }, { hue: [200, .7, .04, COIN], acc: ['beret'] }, {}],
  });

  /* 10. もじブタ — a piglet with wooden letter tiles (A and B) — a word-game fan */
  const WOOD = [0xf3d39a];
  D('piglet', {
    name: { ja: 'もじブタ', en: 'Wordpig' },
    desc: { ja: '文字タイルをならべてことばを作る子ブタ。まだABだけ。', en: 'A piglet who builds words from letter tiles — so far just A and B.' },
    build() {
      const g = new T.Group();
      const Pk = soft(0xffb6c8, { under: 0xff8fb8, uk: .45 }), sn = soft(0xff98b2, { under: 0xff7aa0, uk: .4 }), Wd = soft(WOOD[0], { under: 0xd9a066, uk: .45, rough: .78 }), nos = soft(0xc0507a, { rough: .6 });
      blob(g, Pk, [0, .55, 0], [.55, .5, .48]);
      const hc = V3(0, 1.4, .03), HR = [.86, .74, .74];
      blob(g, Pk, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.24, .42, 24), Pk); e.position.set(s * .56, 2.0, .02); e.rotation.set(.5, 0, -s * .5); e.scale.z = .5; g.add(e); });
      const sc = V3(0, 1.22, .72);
      const snout = puck(.2, .16, sn, .55); snout.rotation.x = Math.PI / 2; snout.scale.set(1.15, 1, .9); snout.position.set(sc.x, sc.y, sc.z - .1); g.add(snout);
      [-1, 1].forEach(s => blob(g, nos, [s * .07, 1.22, .79], [.035, .05, .02]));
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .3, v: .14, mouth: 'smile', mw: .07, my: .54, by: .18, bx: .16 });
      const tileM = (ch, n) => decal('spb-ltr' + ch, 128, 128, cnv((c, W) => {
        c.fillStyle = '#6a3f1e'; c.font = '700 92px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, W / 2, W / 2 + 6);
        // (no point values — keep it a generic letter block)
      }));
      const tile = (ch, n) => { const t = new T.Group(); sq(t, Wd, [0, 0, 0], [.46, .46, .14], .28); const p = plane(.42, .42, tileM(ch, n)); p.position.z = .071; t.add(p); return t; };
      const a = tile('A', 1); a.position.set(-.04, .7, .56); a.rotation.set(-.12, 0, .12); g.add(a);
      const b = tile('B', 3); b.position.set(.74, .23, .32); b.rotation.set(-.1, -.5, -.08); g.add(b);
      [-1, 1].forEach(s => blob(g, Pk, [s * .3, .78, .64], [.11, .12, .11]));
      const tl = mesh(new T.TorusGeometry(.08, .03, 10, 24, Math.PI * 1.6), Pk); tl.position.set(0, .6, -.52); tl.rotation.y = .4; g.add(tl);
      feet(g, sn, .24, .28);
      g.userData.head = [1.45, .95, .05]; g.userData.top = [0, 2.12, .02, 0]; g.userData.neck = [0, .98, .03, .46];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, .8, .02, WOOD], acc: [['bow', 0x6fb8ff, 0x8a76ff]] }, { hue: [-150, 1, -.02, WOOD], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { finish: 'pearl', acc: ['crown'] }],
  });
})();
