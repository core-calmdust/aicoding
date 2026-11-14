/* Avatar species — worker F (2026-11-14): 上海のコースの仲間たち。シーンのコース（森・おかし・海・お城・お祭り・秋・雪・砂漠・おもちゃ・宇宙）に
   1種ずつ。コースを進めるともらえる（ShanghaiReward.COURSE in atlas/games/shanghai.js — むずかしいコースほど早くいいランクがもらえる）。
   Built with Icons3D.KIT in the same plush style. Rendered by icons.html?kind=av&id=<sp>-<0..3> → images/atlas/av/<sp>-<0..3>.webp. */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, ell = K.ell, sph = K.sph,
    face = K.face, alive = K.alive, stick = K.stick, puck = K.puck, rbox = K.rbox, noShadow = K.noShadow, INK = K.INK;
  const D = Avatars3D.define;
  const cone = (r, h, mat, seg = 24) => mesh(new T.ConeGeometry(r, h, seg), mat);
  const cyl = (r1, r2, h, mat, seg = 20) => mesh(new T.CylinderGeometry(r1, r2, h, seg), mat);

  /* ---------- 森: キノコッコ ---------- */
  const KR = 0xff6a5a, KC = 0xfff4e2;
  D('kinoko', {
    name: { ja: 'キノコッコ', en: 'Shroomlet' },
    desc: { ja: '森のおさんぽ道で生まれたきのこの子。水玉のかさが自慢。', en: 'A mushroom tot born on the forest path, proud of its polka-dot cap.' },
    build() {
      const g = new T.Group(), cap = soft(KR, { under: 0xff9a7a, uk: .45 }), st = soft(KC, { under: 0xffd8c0, uk: .4 }), dot = soft(0xffffff, { rough: .6 });
      blob(g, st, [0, .6, 0], [.5, .58, .46]);
      const hc = V3(0, 1.08, .04), HR = [.5, .42, .46];
      blob(g, st, [hc.x, hc.y, hc.z], HR);
      const cc = V3(0, 1.72, -.04), CR = [.84, .44, .78];
      blob(g, cap, [cc.x, cc.y, cc.z], CR);
      blob(g, st, [0, 1.5, -.04], [.72, .12, .66]);                                                       // the gills under the cap
      [[0, .9], [-.6, .5], [.6, .45], [-.3, .2], [.35, .15], [0, .55]].forEach(([yaw, p], i) => {
        const s = sph(cc, CR, yaw + (i > 3 ? 2.6 : 0), p * .9); blob(g, dot, [s.p.x, s.p.y, s.p.z], [.14, .1, .14]);
      });
      const eyes = face(g, ell(hc, HR), { er: .085, gap: .2, v: -.02, mouth: 'smile', mw: .07, my: .17, bx: .14, by: .1 });
      [-1, 1].forEach(s => { blob(g, st, [s * .5, .66, .1], [.1, .16, .1], [0, 0, s * .5]); blob(g, st, [s * .2, .06, .14], [.15, .07, .18]); });
      const lf = blob(g, soft(0x7ccf6a, { under: 0x9ae08a, uk: .4 }), [.3, 2.14, .0], [.14, .05, .24], [.4, .2, .5]);
      g.userData.head = [1.1, .9, 0]; g.userData.top = [0, 2.16, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [40, 1, .02, [KC, 0xffffff]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-150, 1, .02, [KC, 0xffffff]], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'sky', acc: ['crown'] }],
  });

  /* ---------- おかし: マカロンちゃん ---------- */
  const MP = 0xffa8c8;
  D('macaron', {
    name: { ja: 'マカロンちゃん', en: 'Macarbun' },
    desc: { ja: 'おかしの国のマカロンの子。クリームをはさんでいつもごきげん。', en: 'A macaron from the land of sweets — always cheerful with its cream filling.' },
    build() {
      const g = new T.Group(), sh = soft(MP, { under: 0xffc8e0, uk: .4, rough: .7 }), cr = soft(0xfff6ee, { under: 0xffe0d0, uk: .35 }), ft = soft(0xf090b0, { rough: .9 });
      const hc = V3(0, .6, 0), HR = [.9, .44, .86];
      blob(g, sh, [hc.x, hc.y, hc.z], HR);                                                               // the lower shell (with the face)
      const fl = puck(.86, .1, ft, .3); fl.position.y = 1.02; g.add(fl);                                  // the frilly foot
      const mid = puck(.84, .2, cr, .6); mid.position.y = 1.14; g.add(mid);                               // the cream
      blob(g, sh, [0, 1.42, 0], [.9, .3, .86]);                                                            // the top shell
      const eyes = face(g, ell(hc, HR), { er: .09, gap: .26, v: .06, mouth: 'smile', mw: .09, my: .17, bx: .2, by: .08 });
      [-1, 1].forEach(s => { blob(g, sh, [s * .9, .6, .1], [.12, .16, .12], [0, 0, s * .6]); blob(g, sh, [s * .32, .1, .3], [.16, .08, .18]); });
      blob(g, soft(0xff4f6a, { under: 0xff8a8a, uk: .3 }), [0, 1.8, 0], .14);                             // a cherry on top
      const stem = cyl(.016, .02, .24, soft(0x6aa04a)); stem.position.set(.05, 1.98, 0); stem.rotation.z = -.3; g.add(stem);
      g.userData.head = [1.1, 1.0, 0]; g.userData.top = [0, 1.92, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-60, 1, .02, [0xfff6ee, 0xff4f6a]], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { hue: [130, 1, .02, [0xfff6ee, 0xff4f6a]], acc: [['beret', 0x8a76ff, 0x6fb8ff]] }, { finish: 'sakura', acc: ['tiara'] }],
  });

  /* ---------- 海: タコマル ---------- */
  const TO = 0xff8a7a;
  D('tako', {
    name: { ja: 'タコマル', en: 'Octopip' },
    desc: { ja: '港町の桟橋で遊ぶたこの子。8本の足でじょうずに牌をならべる。', en: 'A little octopus who plays on the harbor pier — lines up tiles with all eight arms.' },
    build() {
      const g = new T.Group(), O = soft(TO, { under: 0xffb0a0, uk: .45 }), su = soft(0xffe0d8, { rough: .7 });
      const hc = V3(0, 1.14, 0), HR = [.78, .82, .74];
      blob(g, O, [hc.x, hc.y, hc.z], HR);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + .2, x = Math.sin(a), z = Math.cos(a);
        blob(g, O, [x * .5, .32, z * .46], [.16, .3, .16], [z * .5, 0, -x * .5]);
        blob(g, O, [x * .78, .08, z * .72], [.16, .08, .2], [0, a, 0]);
        if (z > .3) blob(g, su, [x * .82, .12, z * .8 + .04], .04);
      }
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .3, v: -.12, mouth: 'open', mw: .08, my: .24, bx: .16, by: .16 });
      // a sailor's hat
      const hat = new T.Group(), hw = soft(0xffffff, { under: 0xd8e8ff, uk: .4 }), hb = soft(0x3a6ec8);
      const crown = cyl(.36, .4, .2, hw, 28); crown.position.y = .1; hat.add(crown);
      const brim = mesh(new T.TorusGeometry(.4, .07, 10, 32), hw); brim.rotation.x = Math.PI / 2; hat.add(brim);
      const band = cyl(.405, .405, .05, hb, 28); band.position.y = .06; hat.add(band);
      hat.position.set(.1, 1.86, -.04); hat.rotation.set(-.15, 0, -.2); g.add(hat);
      g.userData.head = [1.14, .8, 0]; g.userData.top = [0, 2.08, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-80, 1, .02, [0xffffff, 0x3a6ec8]], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { hue: [-160, 1, .02, [0xffffff, 0x3a6ec8]], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'pearl', acc: ['halo'] }],
  });

  /* ---------- お城: ユニポニー ---------- */
  const UW = 0xfffaff, UM = 0xffa8d8;
  D('unipony', {
    name: { ja: 'ユニポニー', en: 'Unipony' },
    desc: { ja: 'お城に仕えるちいさなユニコーン。にじ色のたてがみをなびかせる。', en: 'A tiny unicorn in service at the castle, with a rainbow mane.' },
    build() {
      const g = new T.Group(), W = soft(UW, { under: 0xd8d0ff, uk: .45 }), mn = soft(UM, { under: 0xa8d8ff, uk: .5 }), hf = soft(0xc8b0e0, { rough: .6 }), gold = soft(0xffd65a, { under: 0xffa84a, uk: .35, glow: .05 });
      blob(g, W, [0, .66, -.1], [.52, .46, .62]);
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([s, f]) => { blob(g, W, [s * .26, .28, f * .32 - .08], [.13, .28, .13]); blob(g, hf, [s * .26, .04, f * .32 - .06], [.13, .06, .14]); });
      const hc = V3(0, 1.36, .22), HR = [.56, .52, .52];
      blob(g, W, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.18, .58), MR = [.3, .22, .22];
      blob(g, soft(0xfff0f8, { under: 0xffd0e8, uk: .4 }), [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .23, v: .1, mouth: 'smile', msurf: ell(mc, MR), mv: -.06, mw: .07, bx: .2, by: .02 });
      const horn = cone(.08, .42, gold, 16); horn.position.set(0, 1.98, .34); horn.rotation.x = .3; g.add(horn);
      [-1, 1].forEach(s => { const e = cone(.08, .2, W, 12); e.position.set(s * .28, 1.86, .1); e.rotation.z = -s * .3; g.add(e); });
      [0xff9ac8, 0xffd36a, 0x8ad8ff, 0xb89aff].forEach((c, i) => blob(g, soft(c, { uk: .4, under: 0xffffff }), [0, 1.8 - i * .22, -.12 - i * .06], [.14, .16, .14]));   // the mane
      blob(g, mn, [0, .78, -.74], [.12, .3, .12], [-.8, 0, 0]);                                           // the tail
      g.userData.head = [1.36, .58, .22]; g.userData.top = [0, 1.9, .12, -.2];
      return alive(g, eyes);
    },
    v: [{}, { map: { [UW]: 0xfff0d8, [UM]: 0xffc86a }, acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { map: { [UW]: 0xe8f0ff, [UM]: 0x8ab8ff }, acc: [['scarf', 0xb89aff, 0x8a76ff]] }, { finish: 'night', acc: ['crown'] }],
  });

  /* ---------- お祭り: キンギョン ---------- */
  const GF = 0xff7040;
  D('kingyo', {
    name: { ja: 'キンギョン', en: 'Goldfinny' },
    desc: { ja: 'お祭りの金魚すくいからやってきた金魚の子。ひらひらの尾びれでおどる。', en: 'A goldfish from the festival scooping pool — dances with its frilly tail.' },
    build() {
      const g = new T.Group(), F = soft(GF, { under: 0xffb060, uk: .5 }), fin = soft(0xffb090, { under: 0xfff0d0, uk: .5, glow: .03 }), bl = soft(0xfff4ea, { under: 0xffe0c8, uk: .4 });
      const hc = V3(0, 1.0, 0), HR = [.72, .74, .7];
      blob(g, F, [hc.x, hc.y, hc.z], HR);
      blob(g, bl, [0, .8, .4], [.4, .34, .26]);
      const eyes = face(g, ell(hc, HR), { er: .12, gap: .32, v: .14, mouth: 'open', mw: .08, my: .26, bx: .18, by: .12 });
      [-1, 1].forEach(s => { blob(g, fin, [s * .72, .82, .1], [.08, .22, .26], [0, s * .4, s * .7]); blob(g, fin, [s * .3, .14, -.5], [.4, .1, .4], [0, s * .7, 0]); });   // side fins, the tail spread on the ground
      blob(g, fin, [0, 1.68, -.12], [.06, .24, .3], [.3, 0, 0]);                                         // the dorsal fin
      // a little water balloon (yo-yo) on a string
      const yo = blob(g, soft(0x8ad0ff, { under: 0xffffff, uk: .4, glow: .03 }), [.82, .6, .46], .2);
      const str = cyl(.008, .008, .5, soft(0xffffff), 6); str.position.set(.78, .96, .44); g.add(str);
      g.userData.head = [1.0, .72, 0]; g.userData.top = [0, 1.92, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-30, 1, .02, [0xfff4ea, 0x8ad0ff]], acc: [['bow', 0xffffff, 0xff9ab8]] }, { hue: [-200, .9, .02, [0xfff4ea, 0x8ad0ff]], acc: [['flower', 0xffd34f]] }, { finish: 'sakura', acc: ['tiara'] }],
  });

  /* ---------- 秋: モミジギツネ ---------- */
  const FX = 0xf0a050;
  D('momiji', {
    name: { ja: 'モミジギツネ', en: 'Maplefox' },
    desc: { ja: '紅葉の山道に住むきつねの子。いつももみじを一枚持ち歩く。', en: 'A fox kit from the autumn mountain path — never without its maple leaf.' },
    build() {
      const g = new T.Group(), Fx = soft(FX, { under: 0xffc070, uk: .45 }), W = soft(0xfff6ea, { under: 0xffe0c8, uk: .4 }), dk = soft(0x8a4a3a, { rough: .6 });
      blob(g, Fx, [0, .56, -.04], [.5, .52, .46]);
      blob(g, W, [0, .5, .22], [.32, .36, .24]);
      const hc = V3(0, 1.36, .04), HR = [.66, .56, .58];
      blob(g, Fx, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.2, .42), MR = [.3, .2, .24];
      blob(g, W, [mc.x, mc.y, mc.z], MR);
      blob(g, soft(INK, { rough: .45 }), [0, 1.26, .66], [.06, .045, .045]);
      const eyes = face(g, ell(hc, HR), { er: .095, gap: .26, v: .16, mouth: 'smile', msurf: ell(mc, MR), mv: -.08, mw: .06, bx: .17, by: .08 });
      [-1, 1].forEach(s => {
        const e = cone(.2, .44, Fx, 16); e.position.set(s * .38, 1.92, -.04); e.rotation.z = -s * .35; g.add(e);
        const ei = cone(.11, .26, W, 12); ei.position.set(s * .38, 1.88, .06); ei.rotation.z = -s * .35; g.add(ei);
        blob(g, dk, [s * .22, .06, .16], [.13, .07, .16]);
      });
      blob(g, Fx, [.5, .5, -.5], [.24, .44, .24], [-.6, 0, -.6]);                                       // the bushy tail
      blob(g, W, [.68, .82, -.72], [.15, .18, .15]);
      // a maple leaf in its paw
      const lf = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .1 : .26; i ? lf.lineTo(Math.cos(a) * r, Math.sin(a) * r) : lf.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const leaf = mesh(new T.ExtrudeGeometry(lf, { depth: .03, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }), soft(0xe84a2a, { under: 0xff8a4a, uk: .4 }));
      leaf.position.set(-.5, .86, .38); leaf.rotation.set(0, .3, .3); g.add(leaf);
      blob(g, Fx, [-.42, .76, .34], [.11, .12, .11]);
      g.userData.head = [1.36, .66, .04]; g.userData.top = [0, 1.92, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-25, 1, .02, [0xfff6ea, 0xe84a2a]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [170, .6, .08, [0xfff6ea, 0xe84a2a]], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'night', acc: ['halo'] }],
  });

  /* ---------- 雪: ユキダルン ---------- */
  D('yukidaru', {
    name: { ja: 'ユキダルン', en: 'Snowpal' },
    desc: { ja: '雪の村でつくられた雪だるまの子。あったかいマフラーがお気に入り。', en: 'A snowman kid made in the snowy village — loves its warm scarf.' },
    build() {
      const g = new T.Group(), S = soft(0xfafcff, { under: 0xc8dcff, uk: .5 }), sc = soft(0xff6a7a, { under: 0xff9a9a, uk: .4, rough: .85 }), bk = soft(0x5a7ac8, { rough: .6 });
      blob(g, S, [0, .56, 0], [.64, .56, .6]);
      const hc = V3(0, 1.36, .02), HR = [.52, .48, .5];
      blob(g, S, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .08, gap: .2, v: .08, mouth: 'smile', mw: .07, my: .17, bx: .14, by: .06 });
      const nose = cone(.06, .26, soft(0xff9a3a, { under: 0xffc06a, uk: .3 }), 12); stick(g, nose, ell(hc, HR)(0, -.02), .1); nose.rotateX(Math.PI / 2);
      const sf = mesh(new T.TorusGeometry(.4, .1, 10, 28), sc); sf.rotation.x = Math.PI / 2; sf.position.y = .98; g.add(sf);
      blob(g, sc, [.24, .74, .5], [.1, .22, .06], [.1, 0, -.2]);
      [[0, .76], [0, .5], [0, .26]].forEach(([u, v]) => { const s = ell(V3(0, .56, 0), [.64, .56, .6])(u, v - .56); blob(g, soft(0x5a5a7a, { rough: .5 }), [s.p.x, s.p.y, s.p.z], .05); });
      const bucket = cyl(.26, .32, .32, bk, 24); bucket.position.set(0, 1.86, -.02); bucket.rotation.z = .15; g.add(bucket);
      [-1, 1].forEach(s => { const arm = cyl(.025, .03, .5, soft(0x8a5a3a, { rough: .8 }), 8); arm.position.set(s * .72, .8, 0); arm.rotation.z = s * 1.0; g.add(arm); });
      g.userData.head = [1.36, .56, 0]; g.userData.top = [0, 2.02, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-120, 1, .02, [0xfafcff, 0xff9a3a]], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { hue: [100, 1, .02, [0xfafcff, 0xff9a3a]], acc: [['flower', 0xff7f9e]] }, { finish: 'sky', acc: ['crown'] }],
  });

  /* ---------- 砂漠: サボテンくん ---------- */
  const CG = 0x6ac87a;
  D('saboten', {
    name: { ja: 'サボテンくん', en: 'Cactot' },
    desc: { ja: '砂漠のオアシスで育ったサボテンの子。頭の花がチャームポイント。', en: 'A cactus kid raised at the desert oasis, with a flower on its head.' },
    build() {
      const g = new T.Group(), C = soft(CG, { under: 0xa8e08a, uk: .45 }), pot = soft(0xe8885a, { under: 0xffb08a, uk: .4, rough: .8 }), sp = soft(0xfff6d8, { rough: .5 });
      const p = cyl(.56, .44, .5, pot, 28); p.position.y = .25; g.add(p);
      const rim = mesh(new T.TorusGeometry(.56, .07, 10, 32), pot); rim.rotation.x = Math.PI / 2; rim.position.y = .5; g.add(rim);
      const hc = V3(0, 1.2, 0), HR = [.5, .72, .48];
      blob(g, C, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .085, gap: .2, v: .06, mouth: 'smile', mw: .07, my: .18, bx: .14, by: .1 });
      [-1, 1].forEach(s => { blob(g, C, [s * .56, 1.14, 0], [.16, .12, .14]); blob(g, C, [s * .66, 1.36, 0], [.13, .24, .13]); });
      for (let i = 0; i < 12; i++) { const s = sph(hc, HR, (i / 12) * Math.PI * 2, (i % 3 - 1) * .5); if (s.n.z < -.2) continue; blob(g, sp, [s.p.x, s.p.y, s.p.z], .025); }
      [0, 1, 2, 3, 4].forEach(i => { const a = i / 5 * Math.PI * 2; blob(g, soft(0xff7ab0, { under: 0xffb0d0, uk: .4 }), [Math.sin(a) * .13, 1.94, Math.cos(a) * .13], [.1, .05, .1]); });
      blob(g, soft(0xffe06a), [0, 1.97, 0], .06);
      g.userData.head = [1.2, .6, 0]; g.userData.top = [0, 1.98, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-70, .9, .02, [0xe8885a, 0xfff6d8]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [60, .9, .02, [0xe8885a, 0xfff6d8]], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { finish: 'pearl', acc: ['tiara'] }],
  });

  /* ---------- おもちゃ: ブリキロボ ---------- */
  const RB = 0x8ab8e8;
  D('buriki', {
    name: { ja: 'ブリキロボ', en: 'Tinbot' },
    desc: { ja: 'おもちゃ箱から出てきたブリキのロボット。背中のネジで元気いっぱい。', en: 'A tin robot out of the toy box — wind the key on its back and off it goes.' },
    build() {
      const g = new T.Group(), B = soft(RB, { under: 0xc8d8ff, uk: .4, rough: .35 }), Rd = soft(0xff6a6a, { under: 0xffa08a, uk: .35 }), Y = soft(0xffd65a, { under: 0xffa84a, uk: .35, glow: .05 }), sv = soft(0xdde4f0, { rough: .3 });
      const body = rbox(.9, .7, .64, .14, B); body.position.y = .28; g.add(body);
      const hd = rbox(.86, .64, .66, .2, B); hd.position.y = 1.0; g.add(hd);
      const vis = rbox(.66, .36, .06, .12, soft(0x2a3048, { rough: .3 })); vis.position.set(0, 1.12, .33); g.add(vis);
      const eyes = [];
      [-1, 1].forEach(s => { const e = blob(g, soft(0x8af0ff, { glow: .5 }), [s * .15, 1.3, .37], [.07, .07, .03]); eyes.push(e);
        const leg = rbox(.24, .26, .3, .08, sv); leg.position.set(s * .24, 0, .02); g.add(leg);
        const arm = cyl(.07, .07, .4, sv, 12); arm.position.set(s * .56, .66, 0); arm.rotation.z = s * .4; g.add(arm);
        blob(g, Rd, [s * .66, .44, 0], .1);
        blob(g, Rd, [s * .45, 1.3, 0], [.06, .12, .12]); });
      blob(g, soft(0xffb0c0), [0, 1.2, .37], [.1, .025, .02]);
      const pan = rbox(.42, .24, .04, .06, Y); pan.position.set(0, .5, .33); g.add(pan);
      [-.1, 0, .1].forEach((x, i) => blob(g, [Rd, B, Rd][i], [x, .62, .36], .035));
      const ant = cyl(.02, .02, .24, sv, 8); ant.position.set(0, 1.74, 0); g.add(ant);
      blob(g, Rd, [0, 1.88, 0], .07);
      const key = new T.Group(), ks = cyl(.03, .03, .22, Y, 8); ks.rotation.x = Math.PI / 2; key.add(ks);
      [-1, 1].forEach(s => { const r = mesh(new T.TorusGeometry(.1, .03, 8, 18), Y); r.position.set(s * .12, 0, -.12); key.add(r); });
      key.position.set(0, .64, -.42); g.add(key);
      g.userData.head = [1.32, .6, 0]; g.userData.top = [0, 1.66, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [130, 1, .02, [0x2a3048, 0x8af0ff, 0xffd65a]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-150, .9, .02, [0x2a3048, 0x8af0ff, 0xffd65a]], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'night', acc: ['crown'] }],
  });

  /* ---------- 宇宙: ホシッピ ---------- */
  const SY = 0xffd65a;
  D('hoshippi', {
    name: { ja: 'ホシッピ', en: 'Twinkpip' },
    desc: { ja: '星の宮殿からおりてきた星の子。きらきらしながら宇宙をおさんぽ。', en: 'A star child down from the Star Palace, twinkling on a stroll through space.' },
    build() {
      const g = new T.Group(), S = soft(SY, { under: 0xffa84a, uk: .45, glow: .08 }), rg = soft(0xb89aff, { under: 0x8ad0ff, uk: .4, glow: .05 });
      const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? .44 : 1.0; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const geo = new T.ExtrudeGeometry(sh, { depth: .34, bevelEnabled: true, bevelThickness: .2, bevelSize: .18, bevelSegments: 6, curveSegments: 4 }); geo.center();
      const st = mesh(geo, S); st.position.y = 1.0; g.add(st);
      const eyes = face(g, (u, v) => ({ p: V3(u, 1.0 + v, .375), n: V3(0, 0, 1) }), { er: .09, gap: .22, v: .04, mouth: 'smile', mw: .08, my: .18, bx: .16, by: .1 });
      [-1, 1].forEach(s => blob(g, S, [s * .26, .08, 0], [.14, .08, .16]));
      const ring = mesh(new T.TorusGeometry(1.1, .04, 8, 48), rg); ring.rotation.set(1.45, 0, .25); ring.position.y = .62; g.add(ring);
      [[-.9, 1.9, .2], [.95, .5, .3], [.8, 1.95, -.2]].forEach(p => blob(g, soft(0xffffff, { glow: .4 }), p, .05));
      g.userData.head = [1.0, .8, 0]; g.userData.top = [0, 2.0, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-40, 1, .02, [0xffffff]], acc: [['bow', 0x8ab8ff, 0x6f9aff]] }, { hue: [120, .9, .03, [0xffffff]], acc: [['flower', 0xff7f9e]] }, { finish: 'sky', acc: ['halo'] }],
  });
})();
