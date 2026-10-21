/* Avatar species — set A: chess / shogi / reversi / go / timer / puzzle-ring creatures.
   Built with Icons3D.KIT in the same soft-plush idiom as Icons3D.MONS. */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M, ell = K.ell, face = K.face, alive = K.alive, puck = K.puck, stick = K.stick, noShadow = K.noShadow, INK = K.INK;
  const D = Avatars3D.define;
  // a plush material the colour tools leave alone (black / white game pieces keep their meaning in every tier)
  const fixed = (hex, o) => { const m = soft(hex, o); m.userData.soft = false; m.userData.fixed = true; return m; };
  const done = (g, eyes) => { alive(g, eyes); g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.fixed) o.receiveShadow = false; }); return g; };
  const nose = (g, p, r = [.07, .05, .045]) => blob(g, soft(INK, { rough: .45, rim: .05 }), p, r);
  const blackStone = () => fixed(0x17181e, { under: 0x3a3f66, uk: .5, rough: .55, rim: .4, sheen: 0xaab4ff, sheenK: .35 });
  const whiteStone = () => fixed(0xfbfaf4, { under: 0xd6dcf0, uk: .4, rough: .6 });
  // sub-part surface for eyes on patches: one ellipsoid per side, centred on the eye spot
  const patchSurf = (pc, PR, gap, v) => (u, vv) => { const s = Math.sign(u) || 1; return ell(V3(s * pc[0], pc[1], pc[2]), PR)(u - s * gap, vv - v); };

  /* 1. ルークゾウ — baby elephant with a soft rook tower on its back */
  D('rook', {
    name: { ja: 'ルークゾウ', en: 'Rookephant' },
    desc: { ja: '背中にルークの塔をのせた子ゾウ。まっすぐ進むのが得意。', en: 'A baby elephant carrying a rook tower. Loves going straight.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group(), G = soft(0xb9c4f2, { under: 0xf0a8d8, uk: .45 }), pink = soft(0xffb6cc, { under: 0xff8fb0 }), cream = soft(0xfff6ea, { under: 0xffd6c8, uk: .4 });
      const blanket = soft(0xff8f9e, { under: 0xd86aa8, uk: .4 }), trim = soft(0xffd65a, { under: 0xffa040, uk: .4 });
      blob(g, G, [0, .58, -.12], [.6, .54, .62]);                                                      // body
      [[-.32, .18, .26], [.32, .18, .26], [-.3, .18, -.46], [.3, .18, -.46]].forEach(p => { blob(g, G, p, [.18, .2, .18]); blob(g, cream, [p[0], .05, p[2] + .05], [.15, .06, .14]); });
      blob(g, G, [0, .66, -.74], [.07, .14, .07], [.6, 0, 0]);                                        // tail
      // howdah: blanket + rook tower
      const bl = puck(.56, .1, blanket, .5); bl.position.set(0, .98, -.28); bl.rotation.x = -.12; g.add(bl);
      const tw = new T.Group(), stone = soft(0xbcb1a8, { under: 0x8c7ad8, uk: .65, rough: .7, rim: .2 }), slot = soft(0x8f82c0, { rough: .9, rim: .05 });
      tw.add(puck(.46, .16, stone, .5));                                                                  // foot
      const band = puck(.43, .1, trim, .5); band.position.y = .15; tw.add(band);
      const body = mesh(new T.CylinderGeometry(.33, .4, .72, 40), stone); body.position.y = .58; tw.add(body);
      const lip = puck(.44, .12, stone, .4); lip.position.y = .9; tw.add(lip);
      const crownRing = mesh(new T.CylinderGeometry(.44, .44, .16, 40), stone); crownRing.position.y = 1.08; tw.add(crownRing);
      blob(tw, slot, [0, 1.16, 0], [.32, .02, .32]);                                                      // dark hollow top
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; K.sq(tw, stone, [Math.cos(a) * .34, 1.27, Math.sin(a) * .34], [.24, .24, .16], .3, [0, -a + Math.PI / 2, 0]); }   // 4 crisp merlons
      blob(tw, slot, [0, .64, .34], [.06, .12, .03]);                                                     // arrow slit
      tw.position.set(-.34, 1.0, -.42); tw.rotation.set(-.05, .1, .08); tw.scale.setScalar(1.05); g.add(tw);
      // head
      const hc = V3(0, 1.3, .32), HR = [.76, .66, .66];
      blob(g, G, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => {                                                                            // big floppy ears
        blob(g, G, [s * .76, 1.28, .16], [.14, .44, .38], [0, s * .5, s * .18]);
        blob(g, pink, [s * .74, 1.28, .25], [.08, .33, .28], [0, s * .5, s * .18]);
      });
      const eyes = face(g, ell(hc, HR), { er: .105, gap: .3, v: .14, mouth: 'none', by: .12, bx: .16 });
      // trunk curled up
      [[0, 1.12, .9, .16], [0, .97, 1.0, .14], [0, .87, 1.12, .12], [0, .87, 1.24, .105], [0, .95, 1.33, .095], [0, 1.05, 1.36, .085]].forEach(([x, y, z, r]) => blob(g, G, [x, y, z], r));
      blob(g, pink, [0, 1.12, 1.37], [.07, .05, .06]);
      const sm = K.arc(.07, .022, K.inkM(), Math.PI * .8); stick(g, sm, ell(hc, HR)(.2, -.3), 0); sm.rotateZ(Math.PI);
      g.userData.head = [1.4, .95, .3]; g.userData.top = [.22, 1.92, .36, -.15]; g.userData.neck = [0, .94, .26, .46];
      return done(g, eyes);
    },
    v: [{}, { hue: [150, .9, .02], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-75, 1, .02], acc: [['beret', 0x6fb8ff, 0x8a76ff]] }, { acc: ['crown'] }],
  });

  /* 2. ビショップアルパカ — alpaca whose wool is a bishop's mitre */
  D('bishop', {
    name: { ja: 'ビショップアルパカ', en: 'Bishpaca' },
    desc: { ja: 'ビショップ形のもこもこ頭のアルパカ。ななめ歩きが好き。', en: 'An alpaca with bishop-shaped wool. Prefers walking diagonally.' },
    build(opt, tier) {
      const g = new T.Group(), Wl = soft(0xfff4e8, { under: 0xd8c4ff, uk: .5 }), skin = soft(0xffe2c4, { under: 0xffb8b0, uk: .4 }), mitre = soft(0xc8b4ff, { under: 0xff9fcf, uk: .5 }), dark = soft(0x7e66c8, { rough: .9 });
      blob(g, Wl, [0, .5, -.05], [.5, .46, .5]);                                                        // fluffy body
      [[-.36, .66, .1], [.36, .66, .1], [0, .78, -.3], [-.3, .42, -.35], [.3, .42, -.35], [0, .5, .34]].forEach(p => blob(g, Wl, p, .24));
      [[-.24, .14, .22], [.24, .14, .22], [-.22, .14, -.3], [.22, .14, -.3]].forEach(p => { blob(g, Wl, [p[0], .22, p[2]], [.14, .16, .14]); blob(g, skin, [p[0], .06, p[2] + .03], [.12, .06, .13]); });
      blob(g, Wl, [0, .6, -.58], .16);                                                                   // tail puff
      blob(g, Wl, [0, .98, .04], [.36, .28, .34]);                                                       // short chibi neck
      const hc = V3(0, 1.48, .1), HR = [.66, .6, .6];
      blob(g, skin, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 2.06, -.04), MR = [.56, .62, .52];                                                // mitre wool
      const mt = blob(g, mitre, [mc.x, mc.y, mc.z], MR);
      const tip = mesh(new T.ConeGeometry(.34, .44, 36), mitre); tip.position.set(0, 2.62, -.04); g.add(tip);
      blob(g, mitre, [0, 2.84, -.04], [.08, .08, .08]);
      blob(g, Wl, [0, 2.98, -.04], .12);                                                                 // the bishop's ball
      // diagonal slit
      const ms = ell(mc, MR), sp = ms(.12, .3); const slit = new T.Group(); blob(slit, dark, [0, 0, 0], [.2, .045, .03]);
      stick(g, slit, sp, -.004); slit.rotateZ(.75);
      [[-.42, 1.82, .36], [-.18, 1.76, .5], [.08, 1.76, .52], [.32, 1.8, .42], [.5, 1.88, .22]].forEach(p => blob(g, Wl, p, .16));   // wool fringe under the mitre
      [-1, 1].forEach(s => { blob(g, skin, [s * .58, 1.86, -.02], [.09, .22, .09], [0, 0, -s * .6]); blob(g, soft(0xffb6c8), [s * .6, 1.86, .04], [.04, .14, .03], [0, 0, -s * .6]); });
      const sc = V3(0, 1.3, .55), SR = [.3, .22, .2];
      blob(g, Wl, [sc.x, sc.y, sc.z], SR);                                                               // muzzle
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .24, v: .08, mouth: 'w', msurf: ell(sc, SR), mv: -.06, mw: .1, by: .12, bx: .12 });
      blob(g, soft(0x9a7a8a, { rough: .6 }), [0, 1.37, .74], [.06, .035, .03]);
      g.userData.head = [1.75, .95, .05]; g.userData.top = [0, 2.86, -.04, 0]; g.userData.neck = [0, 1.0, .06, .4];
      return done(g, eyes);
    },
    v: [{}, { hue: [120, 1, 0], acc: [['star', 0xffd34f]] }, { hue: [-110, 1.1, .02], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'pearl', acc: ['crown'] }],
  });

  /* 3. ポーンひつじ — a lamb that is a chess pawn */
  D('pawn', {
    name: { ja: 'ポーンひつじ', en: 'Pawnlamb' },
    desc: { ja: 'ポーンの形のふわふわ羊。一歩ずつ前へ、いつかは女王に。', en: 'A pawn-shaped woolly lamb. One step at a time, someday a queen.' },
    build(opt, tier) {
      const g = new T.Group(), Wl = soft(0xffe6b8, { under: 0xc8b8ff, uk: .5 }), skin = soft(0xffd8c8, { under: 0xffa8b8, uk: .4 }), col = soft(0x8ab0ff, { under: 0xa88aff, uk: .45 }), hoof = soft(0x8a7a9a, { rough: .7 });
      // wide woolly base
      blob(g, Wl, [0, .34, 0], [.82, .34, .78]);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob(g, Wl, [Math.cos(a) * .7, .26, Math.sin(a) * .66], .22); }
      blob(g, Wl, [0, .7, 0], [.5, .3, .48]);                                                            // tapering middle
      [-1, 1].forEach(s => blob(g, hoof, [s * .26, .06, .74], [.1, .06, .08]));
      const cr = mesh(new T.TorusGeometry(.4, .1, 14, 44), col); cr.rotation.x = Math.PI / 2; cr.position.y = .98; g.add(cr);   // pawn collar
      blob(g, col, [0, .98, 0], [.42, .08, .42]);
      const hc = V3(0, 1.5, 0), HR = [.62, .6, .6];
      blob(g, Wl, [hc.x, hc.y, hc.z], HR);
      [[0, 2.06, -.05], [-.3, 1.98, -.05], [.3, 1.98, -.05], [-.16, 2.02, .2], [.16, 2.02, .2], [-.48, 1.78, .02], [.48, 1.78, .02]].forEach(p => blob(g, Wl, p, .2));   // curly top
      const fc = V3(0, 1.42, .26), FR = [.44, .4, .38];
      blob(g, skin, [fc.x, fc.y, fc.z], FR);                                                             // face patch
      const eyes = face(g, ell(fc, FR), { er: .09, gap: .17, v: .06, mouth: 'smile', mw: .07, my: .2, by: .1, bx: .08 });
      blob(g, soft(0xff9fb4, { rough: .6 }), [0, 1.36, .64], [.05, .035, .03]);
      [-1, 1].forEach(s => { blob(g, skin, [s * .6, 1.5, .1], [.22, .09, .12], [0, s * .3, -s * .35]); });
      g.userData.head = [1.5, .8, .05]; g.userData.top = [0, 2.12, 0, 0]; g.userData.neck = [0, .99, 0, .4];
      return done(g, eyes);
    },
    v: [{}, { map: { 0xffe6b8: 0xffb0cc, 0x8ab0ff: 0xffd34f, 0xa88aff: 0xff9a4a }, acc: [['flower', 0xffffff]] }, { map: { 0xffe6b8: 0xa4e8c0, 0xc8c0ff: 0x8ac8ff, 0x8ab0ff: 0xff8fb0, 0xa88aff: 0xd85a9a }, acc: ['bell'] }, { finish: 'sky', acc: ['tiara'] }],
  });

  /* 4. リュウオウ — a baby dragon holding the 竜 promoted rook */
  D('ryuou', {
    name: { ja: 'リュウオウ', en: 'Ryuoh' },
    desc: { ja: '竜の駒をだいじに抱えるちびドラゴン。成るのが夢。', en: 'A baby dragon hugging its dragon piece. Dreams of promotion.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group(), Gm = soft(0x8fe0b0, { under: 0x7cb8ff, uk: .5 }), belly = soft(0xfff3d6, { under: 0xffd0b0, uk: .4 }), horn = soft(0xffe4a8, { under: 0xffb080, uk: .4 }), wing = soft(0xff9fc0, { under: 0xb48aff, uk: .5 }), spike = soft(0xffb36b, { under: 0xff7f9e, uk: .4 });
      blob(g, Gm, [0, .56, 0], [.54, .52, .48]);
      blob(g, belly, [0, .54, .24], [.36, .38, .3]);                                                    // belly plate
      [.38, .56, .72].forEach(y => { const r = mesh(new T.TorusGeometry(.3 - Math.abs(y - .55) * .5, .016, 8, 32, Math.PI * .8), soft(0xf0d8b0)); r.rotation.set(Math.PI / 2 - .1, 0, Math.PI * .1); r.position.set(0, y, .12); g.add(r); });
      [-1, 1].forEach(s => blob(g, Gm, [s * .26, .1, .2], [.16, .1, .2]));
      // tail
      [[.3, .32, -.42, .2], [.52, .26, -.62, .15], [.7, .3, -.74, .11]].forEach(([x, y, z, r]) => blob(g, Gm, [x, y, z], r));
      blob(g, spike, [.82, .38, -.8], [.08, .12, .05], [0, .5, -.6]);
      // wings
      [-1, 1].forEach(s => { blob(g, wing, [s * .46, 1.0, -.4], [.08, .3, .22], [.3, s * -.6, -s * .5]); blob(g, wing, [s * .62, 1.14, -.5], [.06, .2, .14], [.3, s * -.6, -s * .9]); });
      // head
      const hc = V3(0, 1.5, .05), HR = [.84, .72, .74];
      blob(g, Gm, [hc.x, hc.y, hc.z], HR);
      const sc = V3(0, 1.24, .62), SR = [.36, .24, .2];
      blob(g, Gm, [sc.x, sc.y, sc.z], SR);                                                              // little snout
      [-1, 1].forEach(s => blob(g, soft(0x4f9a7a, { rough: .6 }), [s * .1, 1.3, .8], [.025, .02, .015]));
      const eyes = face(g, ell(hc, HR), { er: .115, gap: .3, v: .14, mouth: 'open', msurf: ell(sc, SR), mv: -.08, mw: .08, by: .14, bx: .16 });
      [-1, 1].forEach(s => { const h = mesh(new T.ConeGeometry(.13, .38, 24), horn); h.position.set(s * .36, 2.24, -.04); h.rotation.set(-.2, 0, -s * .3); g.add(h); blob(g, horn, [s * .34, 2.04, -.05], .12); });
      [[0, 2.2, -.2, .1], [0, 2.08, -.48, .09], [0, 1.82, -.68, .08]].forEach(([x, y, z, r]) => blob(g, spike, [x, y, z], [r * .6, r, r]));
      [-1, 1].forEach(s => blob(g, Gm, [s * .8, 1.6, -.05], [.06, .14, .1], [0, 0, s * .5]));          // ear fins
      // the 竜 piece, held in front
      const pc = K.shogiPiece('竜', .46); pc.position.set(0, .4, .62); pc.rotation.set(-.22, 0, .05); g.add(pc);
      [-1, 1].forEach(s => blob(g, Gm, [s * .3, .62, .72], [.12, .12, .13]));                          // paws on the piece
      g.userData.head = [1.55, .98, .1]; g.userData.top = [0, 2.2, .1, 0]; g.userData.neck = [0, .98, .05, .44];
      return done(g, eyes);
    },
    v: [{}, { hue: [150, 1, 0], acc: [['flower', 0xffffff]] }, { hue: [65, 1, .02], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { acc: ['crown'] }],
  });

  /* 5. ケイマウス — a hopping mouse carrying a 桂 piece */
  D('keima', {
    name: { ja: 'ケイマウス', en: 'Keimouse' },
    desc: { ja: '桂馬を背負ってぴょんと跳ねるねずみ。前の駒も跳びこえる。', en: 'A mouse that hops with a knight piece on its back — even over others.' },
    build(opt, tier) {
      const g = new T.Group(), Gr = soft(0xc4b8ea, { under: 0xff9fc0, uk: .45 }), pink = soft(0xffaac2, { under: 0xff8fb0 }), cream = soft(0xfff6ee, { under: 0xffd6e4, uk: .4 }), strap = soft(0xff8a6a, { under: 0xd86a8a, uk: .4 });
      blob(g, Gr, [0, .6, -.04], [.46, .5, .42], [.25, 0, 0]);                                         // body leaning into the hop
      blob(g, cream, [0, .58, .2], [.3, .32, .24], [.25, 0, 0]);
      blob(g, Gr, [-.22, .12, .14], [.15, .11, .22]); blob(g, pink, [-.22, .05, .3], [.1, .05, .08]);   // planted foot
      blob(g, Gr, [.26, .3, -.36], [.14, .11, .22], [-.7, 0, 0]);                                      // kicked-back foot
      [-1, 1].forEach(s => blob(g, Gr, [s * .42, .9, .3], [.11, .18, .11], [-.9, 0, s * .4]));           // arms up
      [[.0, .5, -.5, .07], [.1, .62, -.76, .06], [.3, .8, -.88, .055], [.48, .98, -.82, .05], [.56, 1.12, -.64, .045]].forEach(([x, y, z, r]) => blob(g, pink, [x, y, z], r));   // curly tail
      // strap + 桂 piece on its back
      const st = mesh(new T.TorusGeometry(.42, .04, 10, 40), strap); st.rotation.set(Math.PI / 2 + .25, 0, 0); st.position.set(0, .72, -.04); g.add(st);
      const pc = K.shogiPiece('桂', .44); pc.position.set(-.52, .92, -.32); pc.rotation.set(-.1, -.75, .3); g.add(pc);
      const hc = V3(0, 1.42, .08), HR = [.74, .64, .64];
      blob(g, Gr, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => {                                                                             // big round ears
        blob(g, Gr, [s * .6, 2.0, -.08], [.38, .38, .12], [0, s * .25, 0]);
        blob(g, pink, [s * .6, 2.0, -.02], [.27, .27, .06], [0, s * .25, 0]);
      });
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .08, eyes: 'happy', mouth: 'open', mw: .085, my: .28, by: .12, bx: .14 });
      blob(g, pink, [0, 1.36, .72], [.07, .055, .05]);
      g.userData.head = [1.55, .95, .1]; g.userData.top = [0, 2.0, .2, 0]; g.userData.neck = [0, .98, .08, .38];
      return done(g, eyes);
    },
    v: [{}, { map: { 0xc4b8ea: 0xffbe96, 0xff9fc0: 0xff8fa8 }, acc: [['star', 0xffd34f]] }, { map: { 0xc4b8ea: 0x9fd2ff, 0xff9fc0: 0xb49aff }, acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'sakura', acc: ['tiara'] }],
  });

  /* 6. ウラオモテパンダ — a panda hugging a big reversi disc */
  D('flippanda', {
    name: { ja: 'ウラオモテパンダ', en: 'Flipanda' },
    desc: { ja: 'リバーシの石にすわるパンダ。白黒どちらの味方でもある。', en: 'A panda on a reversi disc — happily on both sides.' },
    build(opt, tier) {
      const g = new T.Group(), Wt = soft(0xfbf9f4, { under: 0xd6dcff, uk: .45 }), Bk = soft(0x353849, { under: 0x6a70b0, uk: .5, rim: .3, sheen: 0xaab4ff, sheenK: .3 }), pink = soft(0xffb3c6);
      const dW = fixed(0xfbfaf4, { under: 0xd6dcf0, uk: .3, rough: .7 }), dB = fixed(0x17181e, { under: 0x3a3f66, uk: .5, rough: .7, rim: .35, sheen: 0xaab4ff, sheenK: .3 });
      const lo = puck(1.0, .2, dB, .5), hi = puck(1.0, .2, dW, .5); hi.position.y = .19; g.add(lo, hi);   // the disc (black under, white up)
      const y0 = .38;
      blob(g, Wt, [0, y0 + .46, -.05], [.56, .5, .5]);                                                  // body
      blob(g, Bk, [0, y0 + .66, -.05], [.58, .2, .52]);                                                 // black shoulder band
      [-1, 1].forEach(s => { blob(g, Bk, [s * .3, y0 + .14, .42], [.17, .15, .24], [-.3, 0, 0]); blob(g, pink, [s * .3, y0 + .12, .62], [.08, .07, .03], [-.3, 0, 0]); });   // feet
      [-1, 1].forEach(s => blob(g, Bk, [s * .52, y0 + .4, .38], [.14, .26, .14], [.9, 0, s * .5]));    // arms reaching down to hug the disc
      blob(g, Wt, [0, y0 + .3, -.58], .12);
      const hc = V3(0, y0 + 1.22, .04), HR = [.82, .7, .7];
      blob(g, Wt, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => blob(g, Bk, [s * .56, y0 + 1.8, -.06], [.22, .22, .14]));                    // ears
      // eye patches = little disc-black ovals; eyes sit on them
      const gap = .27, ev = .08, pc = [], PR = [.16, .2, .1];
      [-1, 1].forEach(s => { const sp = ell(hc, HR)(s * gap, ev); const c = sp.p.clone().addScaledVector(sp.n, -.05); pc.push(c); const p = blob(g, Bk, [c.x, c.y, c.z], PR); p.lookAt(c.clone().add(sp.n)); p.rotateZ(s * .5); });
      const surf = (u, v) => { const s = Math.sign(u) || 1, c = pc[s < 0 ? 0 : 1]; return ell(c, [.15, .19, .1])(u - s * gap, v - ev); };
      const eyes = face(g, surf, { er: .1, gap, v: ev, mouth: 'none', blush: false });
      face(g, ell(hc, HR), { eyes: 'none', er: .1, gap, v: ev, mouth: 'smile', mw: .08, my: .34, bx: .2, by: .2 });
      K.blob(g, soft(INK, { rough: .45, rim: .05 }), [0, y0 + 1.06, .73], [.08, .055, .045]);
      g.userData.head = [y0 + 1.25, .95, .05]; g.userData.top = [0, y0 + 1.9, .05, 0]; g.userData.neck = [0, y0 + .84, -.02, .46];
      return done(g, eyes);
    },
    v: [{}, { map: { 0x353849: 0x9a6ad0, 0x6a70b0: 0xff8fc8 }, acc: [['bow', 0x6fb8ff, 0x8a76ff]] }, { map: { 0x353849: 0x3f7fb8, 0x6a70b0: 0x6ad0c0, 0xfbf9f4: 0xfff3dc }, acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'sakura', acc: ['crown'] }],
  });

  /* 7. ゴケタヌキ — a tanuki peeking out of a go-stone bowl, lid for a hat */
  D('goke', {
    name: { ja: 'ゴケタヌキ', en: 'Gokenuki' },
    desc: { ja: '碁笥にかくれてふたをかぶるたぬき。石をこっそり数えている。', en: 'A tanuki hiding in a go bowl, wearing the lid. Secretly counting stones.' },
    build(opt, tier) {
      const g = new T.Group(), wood = soft(0xe2a868, { under: 0xc07a6a, uk: .45, sheen: 0xffe0b0 }), inner = soft(0x9a6048, { rough: .95, rim: .05 }), ring = soft(0xc8854e, { under: 0xa86a5a, uk: .4 });
      const Br = soft(0xc79a78, { under: 0xff9f9a, uk: .45 }), mask = soft(0x7a5a52, { under: 0x8a6aa0, uk: .4 }), cream = soft(0xfff3e4, { under: 0xffd6d0, uk: .4 });
      // bowl (open at the top) + rim
      const bc = V3(0, .6, 0), BR = [.92, .62, .92], th = .95;
      const out = mesh(new T.SphereGeometry(1, 48, 32, 0, Math.PI * 2, th, Math.PI - th), wood); out.scale.set(...BR); out.position.copy(bc); g.add(out);
      const inn = mesh(new T.SphereGeometry(.97, 48, 32, 0, Math.PI * 2, th, Math.PI - th), inner); inn.material.side = T.BackSide; inn.scale.set(...BR); inn.position.copy(bc); g.add(inn);
      const ry = bc.y + BR[1] * Math.cos(th), rr = BR[0] * Math.sin(th);
      const rim = mesh(new T.TorusGeometry(rr, .07, 14, 56), wood); rim.rotation.x = Math.PI / 2; rim.position.y = ry; g.add(rim);
      const grain = mesh(new T.TorusGeometry(BR[0] * .985, .022, 8, 56), ring); grain.rotation.x = Math.PI / 2; grain.position.y = .52; g.add(grain);
      // tanuki
      const hc = V3(0, 1.36, .06), HR = [.72, .6, .62];
      blob(g, Br, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => { blob(g, Br, [s * .5, 1.86, -.04], [.17, .15, .11], [0, 0, -s * .3]); blob(g, mask, [s * .5, 1.86, .02], [.1, .08, .06], [0, 0, -s * .3]); });
      const gap = .25, ev = .06, pc = [];
      [-1, 1].forEach(s => { const sp = ell(hc, HR)(s * gap, ev); const c = sp.p.clone().addScaledVector(sp.n, -.05); pc.push(c); const p = blob(g, mask, [c.x, c.y, c.z], [.19, .14, .1]); p.lookAt(c.clone().add(sp.n)); p.rotateZ(-s * .35); });
      const sc = V3(0, 1.2, .52), SR = [.3, .2, .2];
      blob(g, cream, [sc.x, sc.y, sc.z], SR);
      const surf = (u, v) => { const s = Math.sign(u) || 1, c = pc[s < 0 ? 0 : 1]; return ell(c, [.18, .13, .1])(u - s * gap, v - ev); };
      const eyes = face(g, surf, { er: .095, gap, v: ev, mouth: 'none', blush: false });
      face(g, ell(hc, HR), { eyes: 'none', er: .1, gap, v: ev, mouth: 'none', bx: .22, by: .16 });
      face(g, ell(sc, SR), { eyes: 'none', blush: false, mouth: 'w', gap: .1, v: 0, mw: .1, my: .08 });
      nose(g, [0, 1.3, .7], [.065, .045, .04]);
      [-1, 1].forEach(s => blob(g, Br, [s * .34, ry + .04, .62], [.14, .1, .15]));                     // paws on the rim
      // lid worn as a hat
      const lid = new T.Group();
      blob(lid, wood, [0, .06, 0], [.6, .2, .6]);
      const lr = mesh(new T.TorusGeometry(.56, .05, 12, 48), ring); lr.rotation.x = Math.PI / 2; lr.position.y = .0; lid.add(lr);
      lid.position.set(.06, 1.92, -.04); lid.rotation.set(-.12, 0, -.2); g.add(lid);
      // stones beside the bowl
      blob(g, whiteStone(), [.98, .1, .5], [.2, .1, .2]);
      blob(g, blackStone(), [1.12, .09, .06], [.19, .09, .19]);
      blob(g, blackStone(), [-.96, .09, .58], [.19, .09, .19]);
      g.userData.head = [1.4, .95, .1]; g.userData.top = [.12, 2.12, -.04, -.2];
      return done(g, eyes);
    },
    v: [{}, { hue: [-30, 1, .04], acc: [['flower', 0xffffff]] }, { hue: [170, .8, .06], acc: [['star', 0xffd34f]] }, { finish: 'mint', acc: ['crown'] }],
  });

  /* 8. レンジュリス — a squirrel with five go stones in a row along its tail */
  D('renju', {
    name: { ja: 'レンジュリス', en: 'Renjirrel' },
    desc: { ja: 'しっぽに碁石を五つ並べたリス。五連ができると胸をはる。', en: 'A squirrel with five stones in a row on its tail. Proud of its five.' },
    build(opt, tier) {
      const g = new T.Group(), O = soft(0xffa978, { under: 0xff8fb0, uk: .45 }), cream = soft(0xfff3e4, { under: 0xffd2c8, uk: .4 }), tail = soft(0xffbf8a, { under: 0xff9fc0, uk: .5 }), tip = soft(0xfff0dc, { under: 0xffc8d8, uk: .4 });
      blob(g, O, [0, .55, 0], [.46, .48, .42]);
      blob(g, cream, [0, .52, .22], [.3, .34, .24]);
      [-1, 1].forEach(s => { blob(g, O, [s * .26, .1, .24], [.15, .1, .2]); blob(g, O, [s * .3, .68, .36], [.11, .15, .11], [0, 0, -s * .5]); });
      blob(g, soft(0xd99a6a, { under: 0xb07a5a }), [0, .74, .48], [.12, .14, .1]);                     // acorn in its paws
      blob(g, soft(0x9a6a4a), [0, .86, .48], [.12, .05, .1]);
      // huge tail sweeping up on its left side, five stones in a row on it
      const pts = [[-.3, .36, -.42, .26], [-.62, .56, -.5, .33], [-.82, .9, -.48, .38], [-.88, 1.32, -.42, .4], [-.8, 1.74, -.34, .38], [-.6, 2.06, -.3, .32], [-.36, 2.22, -.3, .24]];
      pts.forEach(([x, y, z, r], i) => blob(g, i > 4 ? tip : tail, [x, y, z], r));
      const sM = blackStone();
      [1, 2, 3, 4, 5].forEach(i => {
        const [x, y, z, r] = pts[i], c = V3(x, y, z), d = V3(-.55, .1, .83).normalize();
        const st = mesh(new T.SphereGeometry(1, 32, 20), sM); st.scale.set(.1, .1, .045);
        stick(g, st, { p: c.clone().addScaledVector(d, r * .98), n: d }, 0);
      });
      const hc = V3(0, 1.42, .06), HR = [.76, .66, .66];
      blob(g, O, [hc.x, hc.y, hc.z], HR);
      const sc = V3(0, 1.2, .5), SR = [.36, .24, .2];
      blob(g, cream, [sc.x, sc.y, sc.z], SR);
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.17, .38, 24), O); e.position.set(s * .44, 2.0, -.06); e.rotation.set(-.1, 0, -s * .3); e.scale.z = .6; g.add(e); blob(g, O, [s * .5, 2.2, -.06], [.05, .1, .05], [0, 0, -s * .3]); });
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .12, mouth: 'w', msurf: ell(sc, SR), mv: -.04, mw: .1, by: .2, bx: .14 });
      nose(g, [0, 1.28, .7], [.06, .045, .04]);
      g.userData.head = [1.5, .95, .1]; g.userData.top = [.06, 2.04, .1, 0]; g.userData.neck = [0, .94, .04, .38];
      return done(g, eyes);
    },
    v: [{}, { hue: [140, .9, .02], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-90, .9, .04], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'night', acc: ['tiara'] }],
  });

  /* 9. スナドケイラクダ — a baby camel whose humps are an hourglass */
  D('camel', {
    name: { ja: 'スナドケイラクダ', en: 'Sandglass Camel' },
    desc: { ja: 'こぶが砂時計の子ラクダ。持ち時間はいつもぴったり。', en: 'A baby camel whose humps are an hourglass. Never runs out of time.' },
    build(opt, tier) {
      const g = new T.Group(), C = soft(0xf6cf98, { under: 0xff9fae, uk: .45 }), cream = soft(0xfff4e2, { under: 0xffd6c8, uk: .4 }), wood = fixed(0xc98452, { under: 0xa86a7a, uk: .4, rough: .7 }), hoof = soft(0xb0806a);
      const sand = fixed(0xffa52a, { under: 0xff7a3a, uk: .4, glow: .02, rough: .9 });
      const glass = soft(0xc8eaff, { under: 0xa8b8ff, uk: .4, rough: .35, glow: .02, rim: .6, mat: { transparent: true, opacity: .5, depthWrite: false } });
      // chibi body: short and round
      blob(g, C, [-.14, .6, -.26], [.6, .46, .6]);
      [[-.28, .18, .14], [.28, .18, .14], [-.28, .18, -.48], [.28, .18, -.48]].forEach(p => { blob(g, C, p, [.14, .18, .14]); blob(g, hoof, [p[0], .05, p[2] + .03], [.13, .06, .14]); });
      blob(g, C, [0, .66, -.78], [.06, .14, .06], [.7, 0, 0]);
      // one upright hourglass standing on the back as its humps: lathe glass, wooden caps + 3 posts, sand in both bulbs
      const hg = new T.Group(), H = 1.1, rr = y => .07 + .25 * Math.pow(Math.abs(Math.sin(Math.PI * 2 * y / H)), .62);
      const prof = (y0, y1, k) => { const P = [new T.Vector2(0, y0)]; for (let i = 0; i <= 24; i++) { const y = y0 + (y1 - y0) * i / 24; P.push(new T.Vector2(rr(y) * k, y)); } P.push(new T.Vector2(0, y1)); return P; };
      const gl = mesh(new T.LatheGeometry(prof(0, H, 1).slice(1, -1), 48), glass); gl.renderOrder = 2; noShadow(gl); hg.add(gl);
      hg.add(mesh(new T.LatheGeometry(prof(.02, H * .3, .9), 40), sand));                                  // bottom bulb: sand pile
      const heap = mesh(new T.ConeGeometry(.17, .14, 32), sand); heap.position.y = H * .3 + .06; hg.add(heap);
      hg.add(mesh(new T.LatheGeometry(prof(H * .5, H * .64, .9), 40), sand));                              // a little left in the top bulb
      const st = mesh(new T.CylinderGeometry(.018, .018, H * .2, 8), sand); st.position.y = H * .42; hg.add(st);   // falling thread
      [0, H].forEach(y => { const c = puck(.42, .12, wood, .5); c.position.y = y - .06; hg.add(c); });
      blob(hg, wood, [0, H + .1, 0], .07);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5, p = mesh(new T.CylinderGeometry(.04, .04, H, 12), wood); p.position.set(Math.cos(a) * .36, H / 2, Math.sin(a) * .36); hg.add(p); }
      hg.position.set(-.5, .98, -.52); hg.rotation.set(-.08, 0, .14); hg.scale.setScalar(1.18); g.add(hg);
      blob(g, C, [-.36, .96, -.44], [.46, .12, .44]);                                                       // saddle pad
      // big head, short neck
      blob(g, C, [0, .96, .3], [.24, .26, .24]);
      const hc = V3(.02, 1.4, .42), HR = [.7, .6, .6];
      blob(g, C, [hc.x, hc.y, hc.z], HR);
      const sc = V3(.02, 1.18, .86), SR = [.36, .24, .24];
      blob(g, cream, [sc.x, sc.y, sc.z], SR);
      [-1, 1].forEach(s => blob(g, soft(0xb08a7a), [.02 + s * .11, 1.24, 1.09], [.026, .036, .015]));
      [-1, 1].forEach(s => blob(g, C, [.02 + s * .62, 1.7, .32], [.09, .18, .09], [0, 0, -s * .9]));   // ears
      blob(g, soft(0xe8b07a, { under: 0xff9fae }), [.02, 1.98, .38], [.2, .1, .17]);                   // tuft
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .08, eyes: 'happy', mouth: 'smile', msurf: ell(sc, SR), mv: -.08, mw: .09, by: .12, bx: .14 });
      g.userData.head = [1.4, .9, .4]; g.userData.top = [.3, 1.98, .42, -.25]; g.userData.neck = [0, .98, .3, .27];
      return done(g, eyes);
    },
    v: [{}, { hue: [170, .7, .04], acc: [['flower', 0xffffff]] }, { hue: [-60, .9, .02], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'pearl', acc: ['crown'] }],
  });

  /* 10. チエノワヘビ — a snake threaded through two linked felt puzzle rings */
  D('ringsnake', {
    name: { ja: 'チエノワヘビ', en: 'Puzzlesnake' },
    desc: { ja: '知恵の輪にからまったへび。ほどき方は本人も知らない。', en: 'A snake tangled in puzzle rings. Even it does not know the trick.' },
    build(opt, tier) {
      const g = new T.Group(), Sk = soft(0x9ad8ff, { under: 0xb48aff, uk: .5 }), belly = soft(0xfff6e0, { under: 0xffd6c8, uk: .4 }), spot = soft(0x6fb0f0, { under: 0x8a76ff, uk: .4 });
      const rA = soft(0xff8fae, { under: 0xd86aa8, uk: .45 }), rB = soft(0xffd65a, { under: 0xffa040, uk: .45 });
      // coiled body (tube along a rising spiral, ending under the head)
      const P = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24, a = -2.2 + t * Math.PI * 2.3, r = .62 - t * .2; P.push(V3(Math.sin(a) * r, .2 + t * .42, Math.cos(a) * r - .05)); }
      P.push(V3(.12, .82, .2), V3(.06, 1.02, .16));
      const curve = new T.CatmullRomCurve3(P), tube = new T.TubeGeometry(curve, 160, .2, 24, false);
      const body = mesh(tube, Sk); g.add(body);
      blob(g, Sk, [P[0].x, P[0].y, P[0].z], .2);
      const tailTip = curve.getPoint(0).clone(); blob(g, Sk, [tailTip.x, tailTip.y, tailTip.z], .2);
      [.25, .45, .62, .8].forEach(t => { const p = curve.getPoint(t); blob(g, spot, [p.x * 1.02, p.y + .17, p.z * 1.02], [.08, .03, .08]); });
      // two linked felt rings: A around the coil on the left, B hooked through A
      const RR = .44, tA = mesh(new T.TorusGeometry(RR, .075, 16, 56), rA), cA = V3(-.62, .5, .22);
      tA.position.copy(cA); tA.rotation.set(0, -.55, .15); g.add(tA);
      const tB = mesh(new T.TorusGeometry(RR, .075, 16, 56), rB);
      const ax = V3(1, 0, 0).applyEuler(tA.rotation);           // a direction in A's plane
      const dir = V3(-Math.cos(.2), -Math.sin(.2), 0).applyEuler(tA.rotation).normalize();
      tB.position.copy(cA).addScaledVector(dir, RR);
      const nA = V3(0, 0, 1).applyEuler(tA.rotation);           // B's plane contains dir and A's normal
      const nB = new T.Vector3().crossVectors(dir, nA).normalize();
      tB.quaternion.setFromUnitVectors(V3(0, 0, 1), nB); g.add(tB);
      // head
      const hc = V3(0, 1.34, .22), HR = [.62, .5, .56];
      blob(g, Sk, [hc.x, hc.y, hc.z], HR);
      blob(g, belly, [0, 1.0, .38], [.24, .2, .2]);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .26, v: .08, mouth: 'smile', mw: .09, my: .26, by: .14, bx: .14 });
      const tg = new T.Group(), tm = soft(0xff6b8a, { rough: .6 }); blob(tg, tm, [0, 0, .07], [.025, .015, .08]); [-1, 1].forEach(s => blob(tg, tm, [s * .03, 0, .16], [.02, .012, .05], [0, s * .4, 0]));
      tg.position.set(0, 1.06, .74); tg.rotation.x = .3; g.add(tg);
      g.userData.head = [1.3, .8, .2]; g.userData.top = [0, 1.82, .22, 0]; g.userData.neck = [.04, .98, .18, .24];
      return done(g, eyes);
    },
    v: [{}, { hue: [120, 1, 0], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-80, 1, 0], acc: [['beret', 0x6fb8ff, 0x8a76ff]] }, { finish: 'rainbow', acc: ['halo'] }],
  });
})();
