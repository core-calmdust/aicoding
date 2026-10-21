/* Avatar species — worker D: table-toy creatures (hex tiles, marbles, ohajiki, kendama, sugoroku, fukuwarai,
   daruma-otoshi, bingo, game box). Built with Icons3D.KIT in the same plush style as the Atlas Mons. */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M, sq = K.sq, ell = K.ell, sph = K.sph,
    face = K.face, alive = K.alive, bead = K.bead, stick = K.stick, decal = K.decal, puck = K.puck, rbox = K.rbox, noShadow = K.noShadow, INK = K.INK;
  const D = Avatars3D.define;

  /* ---------- little props ---------- */
  function rr(c, x, y, w, h, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  // a flat-topped hexagon tile, face towards +z
  function hexTile(r, dep, side, top) {
    const sh = new T.Shape();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const bt = dep * .4, geo = new T.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 4 }); geo.center();
    const g = new T.Group(); g.add(mesh(geo, side));
    const f = mesh(new T.CircleGeometry(r * .97, 6), top); f.position.z = dep / 2 + bt + .004; noShadow(f); g.add(f);
    return g;
  }
  const honeyM = () => decal('spd-honey', 256, 256, (c, W) => {
    c.fillStyle = '#ffd25a'; c.fillRect(0, 0, W, W);
    const s = 25, hw = 1.5 * s, hh = Math.sqrt(3) * s, hex = (x, y, rad) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); };
    const fills = { '0,0': '#ff6b7a', '1,0': '#5a9cff', '-1,-1': '#ff6b7a', '0,1': '#5a9cff', '-2,0': '#ffffff', '2,-1': '#ff6b7a' };
    for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) {
      const x = W / 2 + i * hw, y = W / 2 + j * hh + (i & 1 ? hh / 2 : 0);
      hex(x, y, s - 3); c.fillStyle = '#ffe48a'; c.fill(); c.strokeStyle = '#e8962a'; c.lineWidth = 5; c.stroke();
      const f = fills[i + ',' + j]; if (f) { c.fillStyle = f; c.beginPath(); c.arc(x, y, s * .55, 0, 7); c.fill(); }
    }
  });
  // glass marble with a coloured swirl
  const marbleM = () => M({ roughness: .14, clearcoat: 1, clearcoatRoughness: .08, map: K.X.canvasTex('spd-marble', 256, 128, (c, W, H) => {
    c.fillStyle = '#e4f6ff'; c.fillRect(0, 0, W, H); c.lineCap = 'round';
    [['#ff6b8a', 0, 18], ['#ffc83a', 2.1, 14], ['#4aa0ff', 4.2, 16]].forEach(([col, ph, lw]) => {
      c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
      for (let x = -10; x <= W + 10; x += 4) { const y = H / 2 + Math.sin(x / W * Math.PI * 4 + ph) * H * .28; x < -5 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
    });
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 5; c.beginPath(); for (let x = 0; x <= W; x += 4) c.lineTo(x, H / 2 + Math.sin(x / W * Math.PI * 4 + 1) * H * .2); c.stroke();
  }) });
  function die(s, body, pip, red) {
    const d = new T.Group(); sq(d, body, [0, 0, 0], [s, s, s], .34);
    [[-.24, .24], [0, 0], [.24, -.24]].forEach(([a, b]) => blob(d, pip, [a * s, b * s, s * .5], [s * .08, s * .08, s * .03]));
    blob(d, red, [0, s * .5, 0], [s * .13, s * .03, s * .13]);
    [[-.22, .22], [.22, -.22]].forEach(([a, b]) => blob(d, pip, [s * .5, a * s, b * s], [s * .03, s * .08, s * .08]));
    return d;
  }

  /* ---------- 1. ヘックスビー ---------- */
  const TILE = 0xffb83a;
  D('bee', {
    name: { ja: 'ヘックスビー', en: 'Hexbee' },
    desc: { ja: '六角盤のタイルを運ぶまんまるハチ。巣も盤もぜんぶ六角形。', en: 'A round bumblebee hauling a hex board tile — hives and boards, all hexagons.' },
    build() {
      const g = new T.Group(), Y = soft(0xffd65a, { under: 0xffa07a, uk: .45, sheen: 0xfff3c0, sheenK: .3 }), Br = soft(0x7a5644, { under: 0x9a5a8a, uk: .4 }),
        Wg = soft(0xeef8ff, { under: 0xb8d0ff, uk: .45, glow: .08, rim: .3 }), Tm = soft(TILE, { under: 0xff8a5a, uk: .4 });
      const bc = V3(0, .55, -.02), BR = [.54, .52, .48];
      blob(g, Y, [bc.x, bc.y, bc.z], BR);
      [.15, -.14].forEach(dy => { const k = Math.sqrt(1 - (dy / BR[1]) ** 2) * 1.03; blob(g, Br, [0, bc.y + dy, bc.z], [BR[0] * k, .075, BR[2] * k]); });
      const st = mesh(new T.ConeGeometry(.07, .18, 16), Br); st.position.set(0, .45, -.55); st.rotation.x = -Math.PI / 2 - .3; g.add(st);
      const hc = V3(0, 1.45, .02), HR = [.86, .74, .74];
      blob(g, Y, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .28, v: .06, mouth: 'open', mw: .09, my: .28, bx: .13 });
      [-1, 1].forEach(s => {                                                                         // antennae
        const a = mesh(new T.CylinderGeometry(.028, .034, .42, 8), Br); a.position.set(s * .36, 2.27, -.02); a.rotation.z = -s * .4; g.add(a);
        blob(g, Br, [s * .45, 2.47, -.02], .1);
        blob(g, Wg, [s * .62, 1.02, -.38], [.36, .24, .06], [0, -s * .55, s * .55]);                  // wings
        blob(g, Br, [s * .22, .08, .24], [.14, .09, .17]);                                           // feet
      });
      blob(g, Y, [-.5, .62, .2], [.12, .17, .12], [0, 0, -.4]);
      blob(g, Y, [.5, .8, .26], [.12, .18, .12], [0, 0, 1.0]);                                      // arm up, holding the tile
      const t = hexTile(.36, .1, Tm, honeyM()); t.position.set(.78, .98, .4); t.rotation.set(-.12, -.3, -.12); g.add(t);
      blob(g, Y, [.6, .88, .48], .1);
      g.userData.head = [1.45, .86, .02]; g.userData.top = [0, 2.16, -.02, 0]; g.userData.neck = [0, .86, .02, .5];
      return alive(g, eyes);
    },
    v: [{}, { hue: [165, .85, .04, [TILE]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-50, 1, .05, [TILE]], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'rainbow', acc: ['crown'] }],
  });

  /* ---------- 2. ビーだまスライム (UR) ---------- */
  D('marble', {
    name: { ja: 'ビーだまスライム', en: 'Marblob' },
    desc: { ja: 'うずまき模様のビー玉をだいじに抱えるぷるぷるスライム。', en: 'A wobbly slime drop cuddling its favourite swirly glass marble.' },
    ur: true,
    build(opt) {
      const g = new T.Group(), S = soft(0x8fe6d6, { under: 0x9ab0ff, uk: .5, glow: .05, rim: .25 });
      const hc = V3(0, .9, 0), HR = [.95, .84, .84];
      blob(g, S, [hc.x, hc.y, hc.z], HR);
      blob(g, S, [0, .26, 0], [1.08, .26, .98]);                                                     // puddle skirt
      [[-.96, .4], [.9, .5], [-.5, -.85]].forEach(([x, z]) => blob(g, S, [x, .1, z], [.24, .1, .22]));
      if (!opt.notip) { blob(g, S, [0, 1.74, -.05], [.24, .26, .24]); blob(g, S, [.13, 1.96, -.07], [.12, .13, .12], [0, 0, -.5]); }
      const eyes = face(g, ell(hc, HR), { er: .12, gap: .3, v: .24, mouth: 'open', mw: .1, my: .3, bx: .14 });
      const mb = mesh(new T.SphereGeometry(.3, 40, 24), marbleM()); mb.position.set(0, .52, .86); mb.rotation.set(.3, -.2, .2); g.add(mb);
      [-1, 1].forEach(s => blob(g, S, [s * .32, .5, .84], [.13, .11, .13]));                        // little nubs hugging it
      if (opt.ur) [[-.95, .2, .72, .14], [.98, .18, .6, .12]].forEach(([x, y, z, r]) => { const m = mesh(new T.SphereGeometry(r, 28, 18), marbleM()); m.position.set(x, y, z); m.rotation.y = x * 2; g.add(m); });
      g.userData.head = [.95, .9, 0]; g.userData.top = [0, 1.72, -.03, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, 1.1, .02], acc: [['star', 0xffd34f]] }, { hue: [70, .9, .02], opt: { notip: true }, acc: [['beret', 0xffd34f, 0xff9a4a]] }, { opt: { ur: true } }],
  });

  /* ---------- 3. オハジキクラゲ ---------- */
  D('jelly', {
    name: { ja: 'オハジキクラゲ', en: 'Chiplyfish' },
    desc: { ja: '触手の先がパステルのおはじき。はじくとチリンと鳴る。', en: 'Its tentacles end in pastel ohajiki chips that clink when flicked.' },
    build() {
      const g = new T.Group(), P = soft(0xff9cc8, { under: 0xb8a8ff, uk: .5, glow: .05, rim: .25 }), Pl = soft(0xffe0ee, { under: 0xd8c8ff, uk: .4, glow: .05 });
      const hc = V3(0, 1.44, 0), HR = [.86, .7, .8];
      blob(g, P, [hc.x, hc.y, hc.z], HR);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob(g, P, [Math.sin(a) * .74, 1.0, Math.cos(a) * .68], .17); }   // scalloped rim
      blob(g, Pl, [0, .98, 0], [.7, .14, .64]);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .02, mouth: 'smile', mw: .08, my: .24, bx: .12 });
      const chips = [0xff9ec0, 0x8fd0ff, 0xffe07a, 0x9fe8b0, 0xc8a8ff, 0xffb88a, 0x8fd0ff];
      [-1.5, -.75, 0, .75, 1.5, 2.4, -2.4].forEach((a, i) => {
        const x = Math.sin(a) * .5, z = Math.cos(a) * .46, low = i % 2 ? .38 : .26;
        blob(g, Pl, [x, .78, z], [.08, .2, .08], [0, 0, (i % 2 ? .15 : -.15)]);
        blob(g, Pl, [x * 1.04, low + .26, z * 1.04], [.07, .16, .07], [0, 0, (i % 2 ? -.15 : .15)]);
        const ch = new T.Group(), pk = puck(.19, .07, M({ color: chips[i], roughness: .3, clearcoat: .6, clearcoatRoughness: .2 }), .5);
        pk.rotation.x = Math.PI / 2; pk.position.z = -.035; ch.add(pk);
        ch.position.set(x * 1.06, low, z * 1.06); ch.rotation.set(-.15, a * .7, (i % 2 ? .25 : -.2)); g.add(ch);
      });
      g.userData.head = [1.44, .86, 0]; g.userData.top = [0, 2.1, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [170, 1.2, -.04], acc: [['bow', 0xffd34f, 0xff9a4a]] }, { hue: [-90, 1.2, -.04], acc: [['beret', 0x6fb8ff, 0x8a76ff]] }, { finish: 'night', acc: ['tiara'] }],
  });

  /* ---------- 4. ケンダマレッサー ---------- */
  const WOOD = 0xf0c890, KBALL = 0xff6670;
  D('redpanda', {
    name: { ja: 'ケンダマレッサー', en: 'Kendamapanda' },
    desc: { ja: 'けん玉名人のレッサーパンダ。とめけんが決まるとしっぽを振る。', en: 'A red panda kendama ace — its ringed tail wags when the ball lands.' },
    build() {
      const g = new T.Group(), O = soft(0xf38d55, { under: 0xff7a8a, uk: .45 }), Od = soft(0xd8704a, { under: 0xb85a7a, uk: .4 }), dk = soft(0x9a5848, { under: 0x7a4a8a, uk: .4 }),
        cr = soft(0xfff6ea, { under: 0xffd6e4, uk: .4 }), wood = soft(WOOD, { under: 0xe0a07a, uk: .4, rough: .75 }), kb = soft(KBALL, { under: 0xff4f8a, uk: .4 });
      blob(g, O, [0, .52, 0], [.52, .5, .46]);
      blob(g, dk, [0, .46, .2], [.34, .32, .28]);                                                      // dark belly
      const hc = V3(0, 1.45, .02), HR = [.9, .74, .76];
      blob(g, O, [hc.x, hc.y, hc.z], HR);
      blob(g, cr, [0, 1.2, .38], [.4, .27, .38]);                                                      // white muzzle
      [-1, 1].forEach(s => {
        blob(g, cr, [s * .6, 1.3, .36], [.22, .2, .22]);                                                // white cheeks
        const p = ell(hc, HR)(s * .3, .3).p; blob(g, cr, [p.x, p.y, p.z - .03], [.12, .07, .06], [-.4, 0, s * .2]);   // brow spots
        blob(g, O, [s * .6, 2.04, -.1], [.27, .27, .15], [0, 0, -s * .3]);                              // round ears
        blob(g, cr, [s * .6, 2.03, -.02], [.17, .17, .08], [0, 0, -s * .3]);
        blob(g, dk, [s * .24, .1, .26], [.15, .1, .18]);
      });
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .28, v: .08, mouth: 'smile', mw: .08, my: .36, by: .12, bx: .14 });
      blob(g, soft(INK, { rough: .45, rim: .05 }), [0, 1.34, .76], [.075, .055, .05]);
      [[.55, .45, -.42, .27, O], [.78, .68, -.5, .25, Od], [.92, .95, -.52, .23, O], [.98, 1.18, -.5, .19, Od]].forEach(([x, y, z, r, m]) => blob(g, m, [x, y, z], r));   // ringed tail
      blob(g, dk, [-.44, .62, .24], [.12, .17, .12], [0, 0, -.4]);
      blob(g, dk, [.6, .78, .32], [.11, .2, .11], [0, 0, 1.15]);                                        // arm out with the kendama
      const kd = new T.Group();
      const h = mesh(new T.CylinderGeometry(.05, .055, .5, 14), wood); h.position.y = 0; kd.add(h);
      const cp = mesh(new T.CylinderGeometry(.08, .08, .44, 16), wood); cp.rotation.z = Math.PI / 2; cp.position.y = .2; kd.add(cp);
      [-1, 1].forEach(s => { const cup = mesh(new T.CylinderGeometry(.12, .07, .1, 20), wood); cup.rotation.z = -s * Math.PI / 2; cup.position.set(s * .25, .2, 0); kd.add(cup); });
      const sp = mesh(new T.CylinderGeometry(.025, .04, .2, 10), wood); sp.position.y = .34; kd.add(sp);
      blob(kd, kb, [0, .56, 0], .19);
      const band = mesh(new T.TorusGeometry(.19, .025, 8, 32), cr); band.position.y = .56; band.rotation.set(Math.PI / 2 - .3, 0, 0); kd.add(band);
      kd.position.set(.92, 1.0, .34); kd.rotation.z = -.12; g.add(kd);
      blob(g, dk, [.88, .86, .36], .11);
      g.userData.head = [1.45, .9, .02]; g.userData.top = [0, 2.17, -.04, 0]; g.userData.neck = [0, .86, .02, .5];
      return alive(g, eyes);
    },
    v: [{}, { hue: [190, .8, .02, [WOOD, KBALL]], acc: [['flower', 0xffffff]] }, { hue: [-95, .85, .05, [WOOD, KBALL]], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'mint', acc: ['tiara'] }],
  });

  /* ---------- 5. スゴロクカエル ---------- */
  const SQ = 0xfff0d2;
  D('frog', {
    name: { ja: 'スゴロクカエル', en: 'Sugorofrog' },
    desc: { ja: 'すごろくのマスにちょこんと座るカエル。サイコロをふればぴょんと進む。', en: 'A frog perched on a sugoroku square — roll the die and it hops ahead.' },
    build() {
      const g = new T.Group(), G = soft(0x92dc7c, { under: 0x6fc8d8, uk: .45 }), cr = soft(0xfffadc, { under: 0xd8f0a0, uk: .4 }), Wt = soft(0xffffff, { under: 0xc8d8ff, uk: .4 }),
        sqm = soft(SQ, { under: 0xffb8a0, uk: .4, rough: .8 });
      g.add(rbox(1.8, .22, 1.6, .18, sqm));
      const top = mesh(new T.PlaneGeometry(1.62, 1.42), decal('spd-sugo', 256, 224, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.strokeStyle = '#ff8a7a'; c.lineWidth = 14; rr(c, 10, 10, W - 20, H - 20, 26); c.stroke();
        c.fillStyle = '#5aa0ff'; c.beginPath(); c.moveTo(64, 172); c.lineTo(160, 172); c.lineTo(160, 152); c.lineTo(200, 182); c.lineTo(160, 212); c.lineTo(160, 192); c.lineTo(64, 192); c.closePath(); c.fill();
        c.fillStyle = '#ffc83a'; [[40, 40], [216, 40]].forEach(([x, y]) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 16; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); });
      }));
      top.rotation.x = -Math.PI / 2; top.position.y = .225; noShadow(top); g.add(top);
      const y0 = .22;
      blob(g, G, [0, y0 + .42, -.12], [.6, .45, .5]);
      blob(g, cr, [0, y0 + .4, .14], [.42, .34, .28]);
      const hc = V3(0, 1.38, -.02), HR = [.92, .62, .72];
      blob(g, G, [hc.x, hc.y, hc.z], HR);
      const eyes = [];
      [-1, 1].forEach(s => {
        const ec = V3(s * .36, 1.95, .1); blob(g, G, [ec.x, ec.y, ec.z], .25);
        eyes.push(stick(g, bead(.12), sph(ec, .25, s * .22, -.02), -.014));
        blob(g, G, [s * .58, y0 + .14, -.05], [.26, .16, .36]);                                       // folded legs
        blob(g, G, [s * .3, y0 + .06, .38], [.15, .06, .14]);
        blob(g, G, [s * .27, .74, .5], [.1, .1, .11]);                                                // hands on the die
      });
      face(g, ell(hc, HR), { eyes: 'none', gap: .3, er: .11, v: .06, mouth: 'smile', mw: .2, my: .22, by: .02, bx: .26 });
      const d = die(.42, Wt, soft(0x434a72, { rough: .6, rim: .1 }), soft(0xff6f78, { rough: .6, rim: .1 })); d.position.set(0, .66, .52); d.rotation.set(.35, .55, .08); g.add(d);
      g.userData.head = [1.38, .92, 0]; g.userData.top = [0, 2.0, -.22, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-55, 1, .02, [SQ]], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-115, 1, .06, [SQ]], acc: [['beret', 0x6fb8ff, 0x8a76ff]] }, { finish: 'sky', acc: ['crown'] }],
  });

  /* ---------- 6. フクワライおばけ ---------- */
  const GW = 0xfffbff, GU = 0xc8c0ff;
  D('ghost', {
    name: { ja: 'フクワライおばけ', en: 'Fukuboo' },
    desc: { ja: '福笑いのパーツをばらまくおばけ。自分の顔はいつもきちんと。', en: 'A ghost that scatters fukuwarai face parts — its own face stays neat.' },
    build() {
      const g = new T.Group(), Wm = soft(GW, { under: GU, uk: .5, glow: .04 }), paper = soft(0xfff8ec, { under: 0xffd8c8, uk: .35, rough: .85 });
      const hc = V3(0, 1.32, 0), HR = [.82, .84, .78];
      blob(g, Wm, [hc.x, hc.y, hc.z], HR);
      blob(g, Wm, [0, .66, 0], [.78, .5, .74]);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + .2; blob(g, Wm, [Math.sin(a) * .62, .2, Math.cos(a) * .58], [.22, .2, .22]); }   // soft wavy hem
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .1, mouth: 'open', mw: .09, my: .28, bx: .13 });
      blob(g, Wm, [-.8, 1.0, .22], [.14, .22, .14], [0, 0, -.9]);
      blob(g, Wm, [.66, .78, .5], [.13, .2, .13], [0, 0, 1.1]);
      // the fukuwarai card it holds (parts placed all wrong)
      const card = new T.Group(), body = rbox(.64, .04, .8, .07, paper); body.rotation.x = Math.PI / 2; card.add(body);
      const pic = mesh(new T.PlaneGeometry(.58, .74), decal('spd-fuku', 200, 256, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.strokeStyle = '#ff9a8a'; c.lineWidth = 8; rr(c, 6, 6, W - 12, H - 12, 18); c.stroke();
        c.fillStyle = '#ffe2cc'; c.strokeStyle = '#e8a07a'; c.lineWidth = 5; c.beginPath(); c.ellipse(W / 2, H / 2 + 6, 70, 92, 0, 0, 7); c.fill(); c.stroke();
        c.strokeStyle = '#2a2233'; c.lineWidth = 9; c.lineCap = 'round';
        c.beginPath(); c.arc(66, 82, 20, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.save(); c.translate(140, 118); c.rotate(.9); c.beginPath(); c.arc(0, 0, 20, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.restore();
        c.fillStyle = '#2a2233'; c.beginPath(); c.ellipse(70, 112, 9, 12, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(126, 150, 9, 12, .6, 0, 7); c.fill();
        c.fillStyle = '#ffa08a'; c.beginPath(); c.ellipse(86, 160, 9, 15, .5, 0, 7); c.fill();
        c.fillStyle = '#ff5a6e'; c.beginPath(); c.ellipse(120, 204, 26, 10, -.45, 0, 7); c.fill();
      }));
      pic.position.z = .045; noShadow(pic); card.add(pic);
      card.position.set(.72, .92, .62); card.rotation.set(-.12, -.35, -.14); g.add(card);
      // loose parts drifting around
      const piece = (key, draw, p, rot) => { const m = mesh(new T.PlaneGeometry(.34, .2), decal(key, 128, 76, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#fffaf2'; c.strokeStyle = '#ffc0b0'; c.lineWidth = 4; rr(c, 4, 4, W - 8, H - 8, 16); c.fill(); c.stroke(); draw(c, W, H); })); m.material.side = T.DoubleSide; m.position.set(...p); m.rotation.set(...rot); noShadow(m); g.add(m); };
      piece('spd-fk-brow', (c, W, H) => { c.strokeStyle = '#2a2233'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.arc(W / 2, H * .95, 34, Math.PI * 1.2, Math.PI * 1.8); c.stroke(); }, [-.92, 1.62, .4], [0, .4, .45]);
      piece('spd-fk-lips', (c, W, H) => { c.fillStyle = '#ff5a6e'; c.beginPath(); c.ellipse(W / 2, H / 2, 36, 15, 0, 0, 7); c.fill(); c.strokeStyle = '#c83a50'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2 - 30, H / 2); c.lineTo(W / 2 + 30, H / 2); c.stroke(); }, [-1.02, .78, .5], [0, .5, -.35]);
      g.userData.head = [1.32, .84, 0]; g.userData.top = [0, 2.13, 0, 0];
      return alive(g, eyes);
    },
    v: [{}, { map: { [GW]: 0xffd2b4, [GU]: 0xff9ec0 }, acc: [['star', 0xffd34f]] }, { map: { [GW]: 0xbcefd4, [GU]: 0x8ab8ff }, acc: [['beret', 0xff6b7a, 0xd85a9a]] }, { finish: 'night', acc: ['halo'] }],
  });

  /* ---------- 7. ダルマオトシ (UR) ---------- */
  D('daruma', {
    name: { ja: 'ダルマオトシ', en: 'Darumadrop' },
    desc: { ja: 'たたかれても落ちないだるまの子。コーンと抜けてもすまし顔。', en: 'A daruma-otoshi tot — knock a block out and it just lands with a calm smile.' },
    ur: true,
    build(opt) {
      const g = new T.Group(), R = soft(0xff6f6f, { under: 0xffa07a, uk: .45 }), cr = soft(0xfff6ea, { under: 0xffd6c8, uk: .35 }),
        cols = [[0xffd65a, 0xffa06a], [0x7cc8ff, 0x9a8aff], [0x8fe0a8, 0x6fc8d8]], wood = soft(0xecc28c, { under: 0xd8906a, uk: .4, rough: .75 });
      cols.forEach(([c, u], i) => { const p = puck(.64, .3, soft(c, { under: u, uk: .45 }), .45); p.position.set(i === 1 ? .12 : 0, i * .3, 0); g.add(p); });
      const hc = V3(0, 1.42, 0), HR = [.66, .6, .62];
      blob(g, R, [hc.x, hc.y, hc.z], HR);
      const fc = V3(0, 1.4, .24), FR = [.46, .4, .42];
      blob(g, cr, [fc.x, fc.y, fc.z], FR);
      const eyes = face(g, ell(fc, FR), { er: .1, gap: .19, v: .06, mouth: 'smile', mw: .07, my: .22, bx: .07, by: .13 });
      [-1, 1].forEach(s => {
        const p = ell(fc, FR)(s * .19, .22); const br = K.arc(.07, .022, K.inkM(), Math.PI * .7); stick(g, br, p, 0);   // little daruma brows
        blob(g, R, [s * .66, 1.02, .12], [.11, .11, .11]);                                             // tiny hands
        blob(g, R, [s * .26, .04, .6], [.13, .07, .13]);
      });
      const ml = new T.Group(), hd = mesh(new T.CylinderGeometry(.14, .14, .36, 24), wood); hd.rotation.z = Math.PI / 2; hd.position.y = .74; ml.add(hd);
      const hl = mesh(new T.CylinderGeometry(.045, .05, .72, 12), wood); hl.position.y = .36; ml.add(hl);
      [-1, 1].forEach(s => { const b = mesh(new T.TorusGeometry(.14, .02, 8, 24), soft(0xff7f9e)); b.rotation.y = Math.PI / 2; b.position.set(s * .13, .74, 0); ml.add(b); });
      ml.position.set(1.02, 0, .3); ml.rotation.z = .32; g.add(ml);
      if (opt.ur) { const f = mesh(new T.TorusGeometry(.66, .03, 8, 48), soft(0xfff0a0, { glow: .2 })); f.rotation.x = Math.PI / 2; f.position.y = .15; g.add(f); }
      g.userData.head = [1.42, .72, 0]; g.userData.top = [0, 1.99, 0, 0]; g.userData.neck = [0, .96, 0, .46];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, .9, .04], acc: [['flower', 0xffffff]] }, { hue: [-120, .9, .04], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { opt: { ur: true } }],
  });

  /* ---------- 8. ボールアシカ ---------- */
  const bingoM = () => M({ roughness: .3, clearcoat: .5, clearcoatRoughness: .2, map: K.X.canvasTex('spd-bingo', 256, 128, (c, W, H) => {
    c.fillStyle = '#ff8fa8'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffffff'; c.fillRect(0, H * .44, W, H * .12);
    [W * .25, W * .75].forEach(x => { c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, H / 2, 34, 0, 7); c.fill(); c.fillStyle = '#2a2233'; c.font = '900 46px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', x, H / 2 + 3); });
  }) });
  D('sealion', {
    name: { ja: 'ボールアシカ', en: 'Bingopup' },
    desc: { ja: 'ビンゴの玉を鼻にのせるアシカの子。数字が出るとひれで拍手。', en: 'A sea lion pup balancing a bingo ball on its nose — claps when its number is called.' },
    build() {
      const g = new T.Group(), S = soft(0xa8c2ea, { under: 0xc8a8ff, uk: .45 }), cr = soft(0xfff4ea, { under: 0xd8d8ff, uk: .4 }), Sd = soft(0x8aa8dc, { under: 0xb89aff, uk: .4 });
      blob(g, S, [0, .62, -.05], [.58, .6, .52]);
      blob(g, cr, [0, .58, .2], [.4, .42, .3]);
      const hc = V3(0, 1.52, .02), HR = [.8, .72, .66];
      blob(g, S, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.22, .54), MR = [.3, .2, .24];
      blob(g, cr, [mc.x, mc.y, mc.z], MR);
      blob(g, soft(INK, { rough: .45, rim: .05 }), [0, 1.33, .76], [.08, .05, .05]);
      [-1, 1].forEach(s => [0, 1].forEach(i => blob(g, soft(0xc8b0c8, { rough: .6 }), [s * (.12 + i * .08), 1.2 - i * .04, .76 - i * .03], [.018, .018, .01])));
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .31, v: .3, mouth: 'smile', msurf: ell(mc, MR), mv: -.08, mw: .07, bx: .15, by: .2 });
      const ball = mesh(new T.SphereGeometry(.17, 40, 24), bingoM()); ball.position.set(0, 1.56, .84); ball.rotation.set(-.3, 0, -.08); g.add(ball);
      [-1, 1].forEach(s => {
        blob(g, Sd, [s * .4, .13, .3], [.28, .09, .16], [0, s * .5, 0]);                               // front flippers
        blob(g, Sd, [s * .26, .07, -.6], [.22, .06, .13], [0, -s * .6, 0]);                            // tail flippers
      });
      blob(g, Sd, [.58, .74, .2], [.11, .24, .1], [0, 0, -1.0]);                                       // one flipper up, clapping
      g.userData.head = [1.52, .8, .02]; g.userData.top = [-.05, 2.2, -.12, .05]; g.userData.neck = [0, .92, .02, .46];
      return alive(g, eyes);
    },
    v: [{}, { hue: [50, 1, .02], acc: [['bow', 0xff7f9e, 0xff5f8a]] }, { hue: [-65, 1, .02], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'sakura', acc: ['crown'] }],
  });

  /* ---------- 9. ハコヤドカリ ---------- */
  D('hermit', {
    name: { ja: 'ハコヤドカリ', en: 'Boxhermit' },
    desc: { ja: 'ボードゲームの箱をおうちにするヤドカリ。ふたのすき間からサイコロがのぞく。', en: 'A hermit crab living in a board-game box — a die peeks out under the lid.' },
    build() {
      const g = new T.Group(), C = soft(0xff9a7a, { under: 0xff7aa8, uk: .45 }), Cd = soft(0xf2826e, { under: 0xd860a0, uk: .4 }), Wt = soft(0xfffaf3, { under: 0xffd0dc }),
        bx = soft(0x8ec8ff, { under: 0x9a8aff, uk: .4 }), lid = soft(0xff9ec0, { under: 0xffc07a, uk: .4 });
      const base = rbox(1.36, .64, 1.08, .14, bx); base.position.set(0, .36, -.32); g.add(base);
      const dark = mesh(new T.PlaneGeometry(1.1, .82), M({ color: 0x4a3e5a, roughness: .9 })); dark.rotation.x = -Math.PI / 2; dark.position.set(0, 1.005, -.32); noShadow(dark); g.add(dark);
      const dd = die(.3, Wt, soft(0x434a72, { rough: .6, rim: .1 }), soft(0xff6f78, { rough: .6, rim: .1 })); dd.position.set(.2, 1.08, -.05); dd.rotation.set(.2, .5, .3); g.add(dd);
      const lg = new T.Group(); lg.position.set(0, 1.0, -.88);
      const lb = rbox(1.46, .24, 1.16, .15, lid); lb.position.set(0, -.04, .58); lg.add(lb);
      const art = mesh(new T.PlaneGeometry(1.3, 1.0), decal('spd-boxart', 256, 200, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.lineCap = 'round'; c.strokeStyle = '#ffd08a'; c.lineWidth = 30; c.beginPath(); c.moveTo(30, 160); c.bezierCurveTo(70, 40, 150, 200, 226, 50); c.stroke();
        ['#ff6b7a', '#5a9cff', '#6edc9e', '#ffc83a', '#b39cff', '#ff6b7a'].forEach((col, i) => { const t = i / 5, x = 30 + t * 196, y = 160 - t * 110 + Math.sin(t * Math.PI * 2) * 36; c.fillStyle = col; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill(); });
        c.fillStyle = '#ff8fb1'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 12 : 26; c.lineTo(205 + Math.cos(a) * r, 150 + Math.sin(a) * r); } c.fill();
        c.strokeStyle = '#8ec8ff'; c.lineWidth = 8; rr(c, 6, 6, W - 12, H - 12, 22); c.stroke();
      }));
      art.rotation.x = -Math.PI / 2; art.position.set(0, .205, .58); noShadow(art); lg.add(art);
      lg.rotation.x = -.26; g.add(lg);
      const hc = V3(0, .62, .44), HR = [.62, .5, .48];
      blob(g, C, [hc.x, hc.y, hc.z], HR);
      const eyes = [];
      [-1, 1].forEach(s => {
        const st = mesh(new T.CylinderGeometry(.06, .08, .34, 12), C); st.position.set(s * .24, 1.1, .6); st.rotation.z = -s * .18; g.add(st);
        const ec = V3(s * .28, 1.32, .64); blob(g, Wt, [ec.x, ec.y, ec.z], .19);
        eyes.push(stick(g, bead(.09), sph(ec, .19, 0, .02), -.012));
        for (let i = 0; i < 3; i++) blob(g, Cd, [s * .74, .1, .2 - i * .3], [.2, .07, .08], [0, s * (.2 + i * .25), 0]);
      });
      face(g, ell(hc, HR), { eyes: 'none', gap: .28, er: .1, v: .12, mouth: 'smile', mw: .08, my: .16, by: .08, bx: .1 });
      [[1, 1.0], [-1, .75]].forEach(([s, k]) => {                                                     // claws (right one bigger)
        blob(g, Cd, [s * .62, .5, .58], [.1, .1, .16], [0, s * .5, 0]);
        const cl = new T.Group(); blob(cl, C, [0, 0, 0], [.24, .26, .2]); blob(cl, C, [s * .08, .26, 0], [.11, .16, .13], [0, 0, -s * .5]);
        cl.position.set(s * .78, .62, .74); cl.rotation.z = -s * .3; cl.scale.setScalar(k); g.add(cl);
      });
      g.userData.head = [.7, .8, .4]; g.userData.top = [-.05, 1.37, -.32, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [120, .9, .02], acc: [['star', 0xffd34f]] }, { hue: [190, 1, .02], acc: [['pawnhat', 0xff7f9e]] }, { finish: 'sakura', acc: ['crown'] }],
  });
})();
