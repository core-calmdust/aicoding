/* Avatar species — worker E: the solitaire table's own creatures (2026-11-14).
   クジャクパイ (Peacotile): the guide of 上海 (Shanghai). A round plush peacock whose tail is a fan of little mahjong tiles,
   each with an eye-spot like a peacock feather (a nod to the 一索 bird). Earned in Shanghai (not in the gacha or the shop):
   N = the rules course, R = the first constellation (10 stages), SR = six constellations (60), SSR = all 120 stages.
   Rendered by atlas/tools/icons.html?kind=av&id=peacock-<0..3> → images/atlas/av/peacock-<0..3>.webp (256 px). */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, sq = K.sq, ell = K.ell,
    face = K.face, alive = K.alive, decal = K.decal, noShadow = K.noShadow, sqs = K.sqs;
  const D = Avatars3D.define;
  const plane = (w, h, mat) => noShadow(mesh(new T.PlaneGeometry(w, h), mat));

  // the eye-spot on a tail tile: a feather's eye (deep blue in teal in gold) on the white tile face
  const eyeM = () => decal('spe-peye', 128, 168, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    const x = W / 2, y = H * .52, el = (rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); };
    el(W * .4, H * .36, '#e8b53c'); el(W * .31, H * .28, '#1f9a86'); el(W * .2, H * .19, '#2c55b8'); el(W * .09, H * .085, '#13204a');
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(x - W * .05, y - H * .06, W * .035, 0, 7); c.fill();
  });

  const KEEP = [0xffc85a, 0x2f8a64, 0xfffefa];   // (the beak, feet, crest stalks and the tiles keep their colours in every tier)
  D('peacock', {
    name: { ja: 'クジャクパイ', en: 'Peacotile' },
    desc: { ja: '尾羽は小さな牌の扇。一枚ずつに羽の目玉もようがある、上海の案内役。', en: 'Its tail is a fan of little tiles, each with a feather’s eye — the guide of Shanghai.' },
    build(opt) {
      const g = new T.Group();
      const B = soft(0x3f7fe0, { under: 0x5ad0c8, uk: .5 }), Bl = soft(0x66b8ff, { under: 0x8ae0d0, uk: .45 }),
        Cr = soft(0xeaf6ff, { under: 0xc8e6ff, uk: .4 }), Gd = soft(0xffc85a, { under: 0xff9a4a, uk: .4 }),
        Tw = soft(0xfffefa, { under: 0xe6ecf0, uk: .3, rough: .55 }), Tg = soft(0x2f8a64, { under: 0x3fb0a0, uk: .4, rough: .6 });
      /* the tail: seven tiles fanned out behind, a second smaller row in front of them */
      const tc = V3(0, .98, -.42);
      const fan = (n, R, sz, z, spread, y0) => {
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - .5) * spread, tile = new T.Group();
          sq(tile, Tw, [0, 0, .035], [sz, sz * 1.32, .1], .3); sq(tile, Tg, [0, 0, -.045], [sz, sz * 1.32, .07], .3);
          const ep = plane(sz * .82, sz * 1.1, eyeM()); ep.position.z = .088; tile.add(ep);
          tile.position.set(tc.x + Math.sin(a) * R, y0 + Math.cos(a) * R, tc.z + z); tile.rotation.set(-.14, 0, -a); g.add(tile);
        }
      };
      fan(7, 1.12, .44, -.16, 2.5, tc.y);
      if (!opt.short) fan(5, .74, .36, .02, 1.9, tc.y + .02);
      /* the round body, the cream breast, wings, feet */
      blob(g, B, [0, .62, 0], [.62, .6, .56]);
      blob(g, Cr, [0, .56, .3], [.4, .4, .3]);
      [-1, 1].forEach(s => blob(g, Bl, [s * .58, .66, -.02], [.16, .34, .3], [0, 0, s * .32]));
      [-1, 1].forEach(s => { blob(g, Gd, [s * .2, .06, .26], [.13, .06, .17]); blob(g, Gd, [s * .2, .16, .2], [.05, .1, .05]); });
      /* the head on a short neck, a golden beak, the crest (three stalks with beads) */
      blob(g, B, [0, 1.08, .06], [.26, .3, .26]);
      const hc = V3(0, 1.46, .08), HR = [.5, .46, .46];
      blob(g, B, [hc.x, hc.y, hc.z], HR);
      const bk = mesh(new T.ConeGeometry(.085, .22, 16), Gd); bk.rotation.x = Math.PI / 2; bk.position.set(0, 1.38, .6); g.add(bk);
      [-.42, 0, .42].forEach((a, i) => {
        const st = mesh(new T.CylinderGeometry(.018, .024, .32, 8), Gd); st.position.set(Math.sin(a) * .16, 1.98, hc.z - .04); st.rotation.z = -a; g.add(st);
        blob(g, i === 1 ? Bl : Tg, [Math.sin(a) * .3, 2.13 + (i === 1) * .02, hc.z - .04], .075);
      });
      const eyes = face(g, ell(hc, HR), { er: .085, gap: .2, v: .06, mouth: 'none', by: .1, bx: .1 });
      g.userData.head = [1.46, .5, .08]; g.userData.top = [0, 1.86, .22, 0]; g.userData.neck = [0, 1.1, .06, .3];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-40, .95, .04, KEEP], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { hue: [70, .9, .02, KEEP], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'pearl', acc: ['tiara'] }],
  });

  /* 牌の子たち (2026-11-14): 上海のフリーの相棒。ふっくらした麻雀牌そのもの（白い牌に図柄、背に色）に、小さな手足と顔。三元牌の三兄弟 —
     チュンパイ（中・背は緑）、ハクパイ（白・背は青）、ハツパイ（發・背は橙）。上海のフリーで盤ごとのルール（難易度・タイム）を満たすともらえる
     （ShanghaiReward.BOARD in atlas/games/shanghai.js）。Rendered by icons.html?kind=av&id=<chun|haku|hatsu>-<0..3> → images/atlas/av/. */
  const glyph = (id, draw) => () => decal('spe-' + id, 160, 200, (c, W, H) => { c.clearRect(0, 0, W, H); draw(c, W, H); });
  const serif = H => `900 ${Math.round(H * .62)}px "Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif`;
  const kanji = (ch, col) => (c, W, H) => { c.fillStyle = col; c.font = serif(H); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, W / 2, H * .54); };
  const hakuFrame = (c, W, H) => {   // 白板: a blue double frame
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    c.strokeStyle = '#2f6fd0'; c.lineWidth = W * .07; rr(W * .14, H * .14, W * .72, H * .72, W * .1); c.stroke();
    c.lineWidth = W * .03; rr(W * .27, H * .25, W * .46, H * .5, W * .05); c.stroke();
  };
  function tileAv(id, o) {
    const M = glyph(id, o.draw), KEEP = [0xfffefa].concat(o.keep || []);
    D(id, {
      name: o.name, desc: o.desc,
      build() {
        const g = new T.Group();
        const Tw = soft(0xfffefa, { under: 0xe8eef0, uk: .35, rough: .5 }), Tb = soft(o.back, { under: o.backU, uk: .4, rough: .6 });
        const c = V3(0, 1.0, 0), S = [1.16, 1.6, .56];
        sq(g, Tw, [c.x, c.y, c.z + .06], S, .34);
        sq(g, Tb, [c.x, c.y, c.z - .3], [1.12, 1.56, .34], .34);
        // the tile's face on the lower front, a face (eyes, mouth) on the upper front
        const front = sqs(c, S, .34), ch = noShadow(mesh(new T.PlaneGeometry(.62, .78), M())); ch.position.set(0, c.y - .26, c.z + S[2] / 2 + .066); g.add(ch);
        // little arms and feet (the colour of the tile's back)
        [-1, 1].forEach(s => { blob(g, Tb, [s * .66, 1.0, .04], [.13, .2, .13], [0, 0, s * .5]); blob(g, Tb, [s * .28, .1, .06], [.17, .1, .2]); });
        // a sprout on top (a little bead on a stalk)
        const st = mesh(new T.CylinderGeometry(.02, .025, .22, 8), Tb); st.position.set(.18, 1.9, .02); st.rotation.z = -.3; g.add(st);
        blob(g, soft(o.bead, { under: o.beadU, uk: .4 }), [.22, 2.02, .02], .07);
        const eyes = face(g, (u, v) => { const r = front(u, v + .3); r.p.z += .06; return r; }, { er: .085, gap: .22, v: .06, mouth: 'smile', mw: .1, by: .12, bx: .16 });
        g.userData.head = [1.3, .6, .1]; g.userData.top = [0, 1.84, .1, 0]; g.userData.neck = [0, 1.0, .1, .4];
        return alive(g, eyes);
      },
      v: [{}, { hue: [o.h1, .95, .02, KEEP], acc: [['bow', 0xff6a8a, 0xffb0c0]] }, { hue: [o.h2, 1, .03, KEEP], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { finish: 'pearl', acc: ['tiara'] }],
    });
  }
  tileAv('chun', { name: { ja: 'チュンパイ', en: 'Chuntile' }, desc: { ja: 'ふっくらした「中」の牌。三兄弟のまんなか、元気な赤。', en: 'A plump little 中 tile — the lively red one of three.' },
    draw: kanji('中', '#d8262c'), keep: [0xd8262c], back: 0x2f8a64, backU: 0x3fb0a0, bead: 0xff5a5a, beadU: 0xff8a6a, h1: -75, h2: -130 });
  tileAv('haku', { name: { ja: 'ハクパイ', en: 'Hakutile' }, desc: { ja: 'まっ白な「白」の牌。青いふちどりがおしゃれな、おっとり屋。', en: 'A snow-white 白 tile with a smart blue frame — the easygoing one.' },
    draw: hakuFrame, keep: [0x2f6fd0], back: 0x3a72c8, backU: 0x6aa0e8, bead: 0x8ad0ff, beadU: 0xbfe6ff, h1: 120, h2: 60 });
  tileAv('hatsu', { name: { ja: 'ハツパイ', en: 'Hatsutile' }, desc: { ja: '緑の「發」の牌。いつも前向きな、がんばり屋。', en: 'A green 發 tile — always looking forward, the hard worker.' },
    draw: kanji('發', '#1f8a4a'), keep: [0x1f8a4a], back: 0xf0a030, backU: 0xffc870, bead: 0x6ad07a, beadU: 0xa8eab0, h1: -40, h2: 150 });
})();
