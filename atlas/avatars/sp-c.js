/* Avatar species — worker C: table-toy creatures (blocks, Hanoi, cube puzzle, maze, origami, ayatori,
   taketombo, kaleidoscope, yo-yo, teddy). Built with Icons3D.KIT in the MONS plush style. */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const K = Icons3D.KIT, T = K.T, V3 = K.V3, soft = K.soft, blob = K.blob, sq = K.sq, ell = K.ell, face = K.face, alive = K.alive,
    mesh = K.mesh, stick = K.stick, hugDecal = K.hugDecal, puck = K.puck, INK = K.INK, noShadow = K.noShadow, decal = K.decal;
  const D = Avatars3D.define;

  /* ---------- small local helpers ---------- */
  const inkSoft = () => soft(INK, { rough: .45, rim: .05 });
  // a soft rod between two points (rounded ends)
  function seg(g, mat, a, b, r) {
    const A = V3(...a), B = V3(...b), m = mesh(new T.CylinderGeometry(r, r, A.distanceTo(B), 12), mat);
    m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize()); g.add(m);
    blob(g, mat, a, r); blob(g, mat, b, r); return m;
  }
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  // UVs of a (Shape|Extrude)Geometry mapped to the shape's bounds b = [x0, y0, x1, y1] (mirror: u flipped)
  function shapeUV(geo, b, mirror) {
    const P = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) { const x = mirror ? -P.getX(i) : P.getX(i); uv.setXY(i, (x - b[0]) / (b[2] - b[0]), (P.getY(i) - b[1]) / (b[3] - b[1])); }
    return geo;
  }
  // a flat plush panel (soft extruded shape) with a decal laid over its front face
  function panel(pts, mat, dec, b, mirror, depth = .06, bev = .05) {
    const sh = new T.Shape(); pts(sh, mirror ? -1 : 1);
    const g = new T.Group();
    g.add(mesh(new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 24 }), mat));
    if (dec) { const d = mesh(shapeUV(new T.ShapeGeometry(sh, 24), b, mirror), dec); d.position.z = depth + bev + .004; noShadow(d); g.add(d); }
    return g;
  }
  // a toy block: marshmallow cube with a letter on its front
  function block(s, hex, under, ch, ink) {
    const g = new T.Group(); sq(g, soft(hex, { under, uk: .45 }), [0, 0, 0], [s, s, s], .3);
    if (ch) {
      const p = mesh(new T.PlaneGeometry(s * .66, s * .66), decal('c-blk-' + ch + ink, 128, 128, (c, W) => {
        c.clearRect(0, 0, W, W); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 8; rr(c, 8, 8, W - 16, W - 16, 22); c.stroke();
        c.fillStyle = ink; c.font = '700 84px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, W / 2, W / 2 + 5);
      }));
      p.position.z = s / 2 + .004; noShadow(p); g.add(p);
    }
    return g;
  }

  /* 1. つみきビーバー — beaver stacking wooden toy blocks */
  D('beaver', {
    name: { ja: 'ツミキビーバー', en: 'Blockbeaver' },
    desc: { ja: 'つみきを高く積むのが大好き。しっぽでトントン整える。', en: 'Loves stacking toy blocks and pats them neat with its tail.' },
    build() {
      const g = new T.Group(), F = soft(0xdda06c, { under: 0xff9a9a, uk: .45 }), cr = soft(0xffeedb, { under: 0xffd0c8, uk: .4 }), tailM = soft(0xa9785c, { under: 0x8a72d0, uk: .5 }), pink = soft(0xffb3c0);
      blob(g, F, [0, .55, 0], [.55, .52, .48]);
      blob(g, cr, [0, .5, .24], [.36, .36, .28]);
      const hc = V3(0, 1.42, .02), HR = [.84, .72, .74]; blob(g, F, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.2, .5), MR = [.42, .28, .3]; blob(g, cr, [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .3, v: .16, mouth: 'w', msurf: ell(mc, MR), mv: .0, mw: .12, by: .08, bx: .2 });
      nose(g, ell(mc, MR)(0, .13));
      [-1, 1].forEach(s => { const p = ell(mc, MR)(s * .045, -.11); sq(g, soft(0xffffff, { rim: .1 }), [p.p.x, p.p.y, p.p.z + .01], [.075, .1, .05], .5); });   // buck teeth
      [-1, 1].forEach(s => { blob(g, F, [s * .62, 1.98, -.06], .17); blob(g, pink, [s * .62, 1.98, .1], [.1, .1, .04]); });
      const tl = new T.Group(), tg = soft(0x8f6248, { under: 0x7a62c0 });                       // flat paddle tail, waving up on its right
      blob(tl, tailM, [0, 0, 0], [.32, .5, .08]);
      [-1, 0, 1].forEach(i => { blob(tl, tg, [i * .13, .02, .07], [.022, .4 - Math.abs(i) * .08, .02]); blob(tl, tg, [0, i * .16, .07], [.26 - Math.abs(i) * .05, .022, .02]); });
      tl.position.set(.8, .72, -.28); tl.rotation.set(0, -.5, -.42); tl.scale.setScalar(1.1); g.add(tl);
      blob(g, tailM, [.55, .45, -.3], [.16, .12, .14]);
      // a block hugged in its arms + a little tower beside it
      const b0 = block(.42, 0xff8f8f, 0xff6fa0, 'A', '#ffffff'); b0.position.set(.02, .62, .6); b0.rotation.set(.12, -.25, .05); g.add(b0);
      [-1, 1].forEach(s => blob(g, F, [s * .36, .7, .55], [.13, .15, .13], [0, 0, s * .4]));
      const b1 = block(.42, 0x7cc4ff, 0x8a76ff, 'B', '#ffffff'); b1.position.set(-.86, .21, .32); b1.rotation.y = .35; g.add(b1);
      const b2 = block(.36, 0xffd864, 0xffa040, 'C', '#ff8a5a'); b2.position.set(-.84, .6, .3); b2.rotation.y = -.15; g.add(b2);
      const roof = new T.Shape(); roof.moveTo(-.2, 0); roof.lineTo(.2, 0); roof.lineTo(0, .26); roof.closePath();
      const rg = new T.ExtrudeGeometry(roof, { depth: .2, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 4 }); rg.translate(0, 0, -.1);
      const rm = mesh(rg, soft(0x8fe0a0, { under: 0x6fb8ff, uk: .45 })); rm.position.set(-.84, .84, .3); rm.rotation.y = .2; g.add(rm);
      [-1, 1].forEach(s => blob(g, F, [s * .26, .08, .3], [.16, .09, .2]));
      g.userData.head = [1.42, .84, .02]; g.userData.top = [0, 2.12, -.02, 0]; g.userData.neck = [0, .84, .02, .44];
      return alive(g, eyes);
    },
    v: [{}, { hue: [195, .8, .04], acc: ['bow'] }, { hue: [-40, 1, .04], acc: [['scarf', 0x6fb8ff, 0x8a76ff]] }, { finish: 'mint', acc: ['crown'] }],
  });
  function nose(g, s) { blob(g, inkSoft(), [s.p.x, s.p.y, s.p.z], [.085, .06, .05]); }

  /* 2. タワーカタツムリ — snail with a Tower-of-Hanoi shell (UR) */
  D('snail', {
    name: { ja: 'タワーカタツムリ', en: 'Towersnail' },
    desc: { ja: 'せなかの輪っかを一枚ずつ、小さい順に積みかえる。', en: 'Moves the rings on its back one by one, never big on small.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group(), S = soft(0xffdca8, { under: 0xffa0b8, uk: .45 }), wood = soft(0xd9a865, { under: 0xb07a60, uk: .4, sheen: 0xffe0b0 });
      blob(g, S, [0, .2, -.05], [.5, .22, 1.02]);                                                  // foot
      blob(g, S, [0, .62, .5], [.36, .46, .34]);                                                    // neck
      const hc = V3(0, 1.24, .55), HR = [.6, .54, .52]; blob(g, S, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .24, v: .04, mouth: 'open', mw: .08, my: .25, bx: .12 });
      [-1, 1].forEach(s => { seg(g, S, [s * .24, 1.55, .5], [s * .4, 1.98, .44], .04); blob(g, soft(0xff8fb1, { under: 0xff6f9a }), [s * .4, 1.98, .44], .09); });
      // Tower of Hanoi on its back
      const z0 = -.6;
      const peg = mesh(new T.CylinderGeometry(.07, .08, 1.7, 16), wood); peg.position.set(0, 1.22, z0); g.add(peg); blob(g, wood, [0, 2.08, z0], .12);
      [[.56, .17, 0xff8fb0, 0xff6fa0], [.45, .16, 0xffcf5a, 0xffa040], [.35, .15, 0x7fd8a8, 0x6fb8ff], [.26, .14, 0x8fb8ff, 0xb08aff]].reduce((y, [R, t, c, u]) => {
        const rm = soft(c, { under: u, uk: .5 }); if (tier === 3) rm.userData.soft = false;
        const r = mesh(new T.TorusGeometry(R, t, 18, 44), rm); r.rotation.x = Math.PI / 2; r.position.set(0, y + t, z0); g.add(r); return y + t * 1.86;
      }, .4);
      g.userData.head = [1.24, .6, .55]; g.userData.top = [0, 1.76, .55, 0]; g.userData.neck = [0, .6, .5, .34];
      return alive(g, eyes);
    },
    v: [{}, { hue: [140, .9, 0], acc: ['bow'] }, { hue: [-90, 1, .02], acc: ['bell'] }, { acc: ['crown'] }],
  });

  /* 3. キューブカバ — baby hippo with a 3×3 colour-cube puzzle */
  function stickerMat(key, cols) {
    return decal('c-cube-' + key, 192, 192, (c, W) => {
      c.clearRect(0, 0, W, W); const s = W / 3;
      cols.forEach((col, i) => { c.fillStyle = col; rr(c, (i % 3) * s + 7, (i / 3 | 0) * s + 7, s - 14, s - 14, 14); c.fill(); });
    });
  }
  D('hippo', {
    name: { ja: 'キューブカバ', en: 'Cubehippo' },
    desc: { ja: 'フェルトの六面パズルをくるくる。そろうとにっこり。', en: 'Twists its felt colour cube round and round, all smiles when it lines up.' },
    build() {
      const g = new T.Group(), F = soft(0xc6b4f2, { under: 0xff9fcf, uk: .45 }), muz = soft(0xffd6e4, { under: 0xffaec8, uk: .4 }), felt = soft(0xfff6ea, { under: 0xd6dcff, uk: .45 });
      blob(g, F, [0, .55, 0], [.55, .5, .48]);
      const hc = V3(0, 1.45, 0), HR = [.8, .68, .7]; blob(g, F, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.2, .42), MR = [.62, .38, .42]; blob(g, muz, [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .3, v: .3, mouth: 'smile', msurf: ell(mc, MR), mv: -.1, mw: .15, by: .02, bx: .22 });
      [-1, 1].forEach(s => { const p = ell(mc, MR)(s * .17, .2); blob(g, soft(0xb67aa8, { rough: .6 }), [p.p.x, p.p.y, p.p.z], [.05, .035, .03]); });   // nostrils
      [-1, 1].forEach(s => { blob(g, F, [s * .5, 2.0, -.1], [.14, .12, .1]); blob(g, soft(0xffb3c6), [s * .5, 2.0, -.02], [.07, .07, .04]); });
      // the cube puzzle
      const cb = new T.Group(), S = .62; sq(cb, felt, [0, 0, 0], [S, S, S], .2);
      const faces = [
        [[0, 0, S / 2 + .004], [0, 0, 0], ['#ff7f8e', '#ffd34f', '#ff7f8e', '#6cb8ff', '#ff7f8e', '#8fe0a0', '#ff7f8e', '#ff7f8e', '#b79cff']],
        [[0, S / 2 + .004, 0], [-Math.PI / 2, 0, 0], ['#8fe0a0', '#8fe0a0', '#ffd34f', '#8fe0a0', '#8fe0a0', '#8fe0a0', '#6cb8ff', '#8fe0a0', '#8fe0a0']],
        [[-S / 2 - .004, 0, 0], [0, -Math.PI / 2, 0], ['#6cb8ff', '#6cb8ff', '#ff7f8e', '#6cb8ff', '#6cb8ff', '#6cb8ff', '#6cb8ff', '#ffb36a', '#6cb8ff']],
      ];
      faces.forEach(([p, r, cols], i) => { const m = mesh(new T.PlaneGeometry(S * .86, S * .86), stickerMat('f' + i, cols)); m.position.set(...p); m.rotation.set(...r); noShadow(m); cb.add(m); });
      cb.position.set(0, .66, .66); cb.rotation.set(.32, -.15, .04); g.add(cb);
      [-1, 1].forEach(s => blob(g, F, [s * .38, .68, .62], [.14, .16, .14]));
      [-1, 1].forEach(s => blob(g, F, [s * .26, .08, .3], [.16, .09, .2]));
      blob(g, F, [0, .45, -.48], [.08, .08, .12]);
      g.userData.head = [1.45, .8, .05]; g.userData.top = [0, 2.1, -.04, 0]; g.userData.neck = [0, .86, .02, .44];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-130, 1.1, .02], acc: [['flower', 0xffffff]] }, { hue: [100, 1.3, 0], acc: [['beret', 0x6fb8ff, 0x8a76ff]] }, { finish: 'sky', acc: ['tiara'] }],
  });

  /* 4. メイロモグラ — mole with digging paws and a maze board */
  D('mole', {
    name: { ja: 'メイロモグラ', en: 'Mazemole' },
    desc: { ja: '地下トンネルで鍛えた迷路名人。ゴールまで一直線。', en: 'A maze master trained in its tunnels — straight to the goal.' },
    build() {
      const g = new T.Group(), F = soft(0x9d90d4, { under: 0xff9fc8, uk: .45 }), pk = soft(0xffb3c6, { under: 0xff8aa8, uk: .45 }), claw = soft(0xfff3e4, { under: 0xffd6c8 }), wood = soft(0xf0cf98, { under: 0xd8a070, uk: .4 });
      blob(g, F, [0, .6, 0], [.58, .56, .5]);
      const hc = V3(0, 1.48, .02), HR = [.8, .68, .68]; blob(g, F, [hc.x, hc.y, hc.z], HR);
      const sc = V3(0, 1.3, .62), SR = [.24, .19, .22]; blob(g, pk, [sc.x, sc.y, sc.z], SR);
      blob(g, soft(0xff6f9a, { under: 0xff4f8a, rim: .2 }), [0, 1.34, .84], .095);                  // pink nose
      const eyes = face(g, ell(hc, HR), { er: .09, gap: .3, v: .2, eyes: 'happy', mouth: 'smile', msurf: ell(sc, SR), mv: -.12, mw: .06, by: .06, bx: .18 });
      [-1, 1].forEach(s => blob(g, F, [s * .7, 1.62, -.02], [.1, .12, .08]));
      // maze board held up
      const bd = new T.Group(); sq(bd, wood, [0, 0, 0], [.86, .78, .12], .3);
      const mz = mesh(new T.PlaneGeometry(.74, .66), decal('c-maze', 256, 228, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.fillStyle = '#fff7e8'; rr(c, 4, 4, W - 8, H - 8, 26); c.fill();
        const x0 = 28, y0 = 26, s = (W - 56) / 5, t = (H - 52) / 4, P = (i, j) => [x0 + i * s, y0 + j * t];
        c.strokeStyle = '#6a58b8'; c.lineWidth = 9; c.lineCap = 'round';
        const L = (a, b, x, y) => { c.beginPath(); c.moveTo(...P(a, b)); c.lineTo(...P(x, y)); c.stroke(); };
        L(1, 0, 5, 0); L(0, 0, 0, 4); L(0, 4, 4, 4); L(5, 0, 5, 4);
        L(1, 0, 1, 2); L(1, 3, 3, 3); L(2, 1, 4, 1); L(2, 1, 2, 2); L(3, 2, 5, 2); L(4, 3, 4, 4); L(0, 2, 1, 2);
        c.strokeStyle = '#ff7f9e'; c.lineWidth = 6; c.setLineDash([2, 12]);
        c.beginPath(); [[.5, -.3], [.5, 2.5], [1.5, 2.5], [1.5, 1.5], [3.5, 1.5], [4.5, 1.5], [4.5, 3.5], [5.3, 3.5]].forEach(([i, j], k) => { const [x, y] = P(i, j); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); c.setLineDash([]);
        c.fillStyle = '#5fcf8a'; c.beginPath(); c.arc(...P(.5, .5), 11, 0, 7); c.fill();
        c.fillStyle = '#ffb02e'; const [gx, gy] = P(4.5, 3.5); c.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 7 : 16; c.lineTo(gx + Math.cos(a) * r, gy + Math.sin(a) * r); } c.fill();
      }));
      mz.position.z = .064; noShadow(mz); bd.add(mz);
      bd.position.set(0, .72, .66); bd.rotation.set(-.22, -.12, 0); g.add(bd);
      [-1, 1].forEach(s => {                                                                       // big digging paws gripping the board
        blob(g, pk, [s * .46, .78, .7], [.17, .22, .1], [0, 0, -s * .2]);
        [-1, 0, 1].forEach(i => blob(g, claw, [s * .44 + i * .07, 1.0 - Math.abs(i) * .03, .72], [.035, .07, .035], [0, 0, -i * .25]));
        blob(g, F, [s * .5, .7, .45], [.14, .18, .16], [0, 0, s * .3]);
      });
      [-1, 1].forEach(s => blob(g, pk, [s * .26, .08, .3], [.17, .09, .21]));
      g.userData.head = [1.48, .8, .02]; g.userData.top = [0, 2.13, -.02, 0]; g.userData.neck = [0, .9, .02, .45];
      return alive(g, eyes);
    },
    v: [{}, { hue: [150, 1.3, 0], acc: [['star', 0xffd34f]] }, { hue: [-130, .9, .06], acc: ['pawnhat'] }, { finish: 'night', acc: ['crown'] }],
  });

  /* 5. オリガミツル — a plush folded-paper crane */
  const craneWing = (sh, k) => { sh.moveTo(0, .06); sh.lineTo(k * .9, .82); sh.quadraticCurveTo(k * 1.04, .92, k * .98, .74); sh.lineTo(k * .44, -.12); sh.quadraticCurveTo(k * .2, -.22, 0, -.08); sh.closePath(); };
  const craneDecal = () => decal('c-crane2', 256, 256, (c, W) => {
    c.clearRect(0, 0, W, W); const P = (x, y) => [x / 1.04 * W, (1 - (y + .22) / 1.14) * W];
    const tri = (pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...P(...p)) : c.moveTo(...P(...p)))); c.closePath(); c.fill(); };
    tri([[0, .06], [.94, .82], [.44, -.12]], 'rgba(255,255,255,.38)');                       // folded facets (light / shade)
    tri([[.44, -.12], [.94, .82], [.98, .74]], 'rgba(190,60,110,.16)');
    tri([[0, -.08], [.44, -.12], [.2, .2]], 'rgba(190,60,110,.12)');
    c.strokeStyle = 'rgba(200,70,120,.55)'; c.lineWidth = 4; c.lineCap = 'round';
    [[[0, .06], [.94, .82]], [[.2, .2], [.44, -.12]], [[.47, .45], [.7, .2]]].forEach(([a, b]) => { c.beginPath(); c.moveTo(...P(...a)); c.lineTo(...P(...b)); c.stroke(); });
    c.fillStyle = 'rgba(255,255,255,.9)';                                                       // chiyogami dots
    [[.36, .14], [.56, .34], [.74, .52], [.5, .08], [.66, .24]].forEach(([x, y]) => { const [px, py] = P(x, y); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 5.5, 0, 7); c.fill(); } c.fillStyle = 'rgba(255,200,90,.95)'; c.beginPath(); c.arc(px, py, 3.5, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; });
  });
  D('crane', {
    name: { ja: 'オリガミツル', en: 'Origrane' },
    desc: { ja: '紙から生まれたやわらかい鶴。千羽そろうと願いがかなう。', en: 'A soft crane born from paper. A thousand together grant a wish.' },
    build() {
      const g = new T.Group(), P = soft(0xffb6c9, { under: 0xffcf9a, uk: .45 }), Wt = soft(0xfffaf4, { under: 0xffd6e4, uk: .4 }), Y = soft(0xffd27a, { under: 0xffa060 }), red = soft(0xff6670, { under: 0xff4f8a });
      sq(g, P, [0, .58, 0], [.96, .9, .9], .62);                                                   // folded-paper body (soft diamond)
      blob(g, Wt, [0, .5, .3], [.3, .32, .2]);
      const hc = V3(0, 1.38, .12), HR = [.66, .6, .6]; blob(g, P, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .26, v: .1, mouth: 'none', by: .14, bx: .14 });
      const bk = mesh(new T.ConeGeometry(.1, .3, 24), Y); bk.rotation.x = Math.PI / 2; bk.scale.x = 1.3; bk.position.set(0, 1.25, .78); g.add(bk);   // little beak
      blob(g, red, [0, 1.96, .06], [.17, .07, .17]);                                                // red crest
      const dec = craneDecal(), b = [0, -.22, 1.04, .92];
      [-1, 1].forEach(s => { const w = panel(craneWing, P, dec, b, s < 0); w.position.set(s * .32, .86, -.08); w.rotation.set(0, -s * .3, s * .05); w.scale.setScalar(1.05); g.add(w); });
      const tl = mesh(new T.ConeGeometry(.17, .62, 4), P); tl.rotation.set(-1.0, Math.PI / 4, 0); tl.position.set(0, .82, -.62); g.add(tl);   // folded tail point
      [-1, 1].forEach(s => blob(g, Y, [s * .2, .07, .25], [.13, .07, .18]));
      g.userData.head = [1.38, .66, .12]; g.userData.top = [0, 1.98, .1, 0]; g.userData.neck = [0, .86, .1, .42];
      return alive(g, eyes);
    },
    v: [{}, { hue: [170, .8, .02], acc: [['flower', 0xffffff]] }, { hue: [-150, .8, .04], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'pearl', acc: ['tiara'] }],
  });

  /* 6. アヤトリヤギ — goat kid making a cat's cradle */
  D('goat', {
    name: { ja: 'アヤトリヤギ', en: 'Cradlegoat' },
    desc: { ja: 'ひづめで器用にあやとり。ほうき、はしご、なんでも作る。', en: 'Makes string figures with nimble hooves — brooms, ladders, anything.' },
    build() {
      const g = new T.Group(), W = soft(0xfff6ec, { under: 0xd8c8ff, uk: .5 }), horn = soft(0xf2c98a, { under: 0xffa080, uk: .4 }), hoof = soft(0xa892d6, { under: 0xff9fcf, uk: .4 }), muz = soft(0xffe6ea, { under: 0xffc4d6, uk: .4 }), yarn = soft(0xff6b8a, { under: 0xd85a9a, uk: .3, rough: .7, glow: .05 });
      blob(g, W, [0, .55, 0], [.5, .48, .44]);
      const hc = V3(0, 1.48, 0), HR = [.76, .66, .66]; blob(g, W, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.24, .46), MR = [.34, .26, .28]; blob(g, muz, [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .29, v: .2, mouth: 'w', msurf: ell(mc, MR), mv: -.04, mw: .12, by: .1, bx: .18 });
      blob(g, soft(0xd88aa8, { rough: .6 }), [0, ell(mc, MR)(0, .1).p.y, ell(mc, MR)(0, .1).p.z], [.06, .04, .03]);
      [-1, 1].forEach(s => blob(g, W, [s * .8, 1.46, -.04], [.3, .12, .15], [0, -s * .2, s * .4]));    // floppy ears
      [-1, 1].forEach(s => { const h = mesh(new T.ConeGeometry(.1, .38, 20), horn); h.position.set(s * .34, 2.08, -.2); h.rotation.set(-.55, 0, -s * .3); g.add(h); });
      blob(g, W, [0, 1.0, .6], [.08, .11, .07]);                                                    // chin tuft
      // arms up, a cat's cradle between the hooves
      const zs = .74, L = [-.38, .74], R = [.38, .74];
      [-1, 1].forEach(s => { blob(g, W, [s * .44, .72, .5], [.12, .17, .14], [.4, 0, 0]); blob(g, hoof, [s * .42, .74, .66], [.1, .1, .08]); });
      const pts = { lt: [-.37, .86], lb: [-.37, .62], rt: [.37, .86], rb: [.37, .62] };
      [[pts.lt, pts.rt], [pts.lb, pts.rb], [pts.lt, [0, .66]], [[0, .66], pts.rt], [pts.lb, [0, .82]], [[0, .82], pts.rb]].forEach(([a, b], i) => seg(g, yarn, [a[0], a[1], zs + (i > 1) * .01], [b[0], b[1], zs + (i > 1) * .01], .02));
      [L, R].forEach(([x, y]) => { const t = mesh(new T.TorusGeometry(.13, .02, 8, 28), yarn); t.position.set(x * 1.08, y, .68); t.rotation.y = Math.PI / 2; t.scale.set(1, 1, .6); g.add(t); });
      [-1, 1].forEach(s => blob(g, hoof, [s * .25, .08, .28], [.15, .09, .19]));
      blob(g, W, [0, .62, -.46], [.1, .12, .1]);
      g.userData.head = [1.48, .74, 0]; g.userData.top = [0, 2.12, .06, 0]; g.userData.neck = [0, .86, .02, .42];
      return alive(g, eyes);
    },
    v: [{}, { map: { 0xfff6ec: 0xffd2b0 }, hue: [40, 1, 0], acc: ['bow'] }, { map: { 0xfff6ec: 0xc6dcff, 0xd8c8ff: 0x9ab8ff }, hue: [140, 1, 0], acc: ['beret'] }, { finish: 'mint', acc: ['crown'] }],
  });

  /* 7. タケトンボ — chibi dragonfly with a bamboo-copter on its head */
  D('dragonfly', {
    name: { ja: 'タケトンボ', en: 'Coptrafly' },
    desc: { ja: '頭の竹とんぼをくるっと回して、ふわりと飛びたつ。', en: 'Spins the bamboo-copter on its head and floats off.' },
    build() {
      const g = new T.Group(), G = soft(0x8fe0c4, { under: 0x7cb8ff, uk: .5 }), St = soft(0x7fb6ff, { under: 0x8a76ff, uk: .45 }), wing = soft(0xe2f4ff, { under: 0xc8c8ff, uk: .4, glow: .1, rim: .35, sheen: 0xffffff, sheenK: .6 }), bam = soft(0xe6cf86, { under: 0xa8c070, uk: .4, sheen: 0xfff3c0 });
      blob(g, G, [0, .62, 0], [.42, .44, .38]);
      [[0, .4, -.42, .2], [0, .32, -.7, .17], [0, .36, -.95, .145], [0, .48, -1.14, .12], [0, .66, -1.24, .1]].forEach(([x, y, z, r], i) => blob(g, i % 2 ? St : G, [x, y, z], r));
      const hc = V3(0, 1.4, .08), HR = [.72, .62, .62]; blob(g, G, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .14, gap: .3, v: .06, mouth: 'smile', mw: .09, my: .3, bx: .16 });
      [[1, 1.02, -.18, .62, .2, .35], [1, .74, -.24, .52, .17, -.1]].forEach(([_, y, z, L, w, tz]) => [-1, 1].forEach(s => blob(g, wing, [s * (L + .12), y, z], [L, .045, w], [0, s * .25, s * tz])));
      [-1, 1].forEach(s => blob(g, G, [s * .22, .08, .2], [.12, .08, .15]));
      // bamboo-copter
      const tc = new T.Group(), stk = mesh(new T.CylinderGeometry(.045, .045, .62, 12), bam); stk.position.y = .31; tc.add(stk);
      [-1, 1].forEach(s => sq(tc, bam, [s * .38, .64, 0], [.76, .09, .24], .45, [s * .32, 0, 0]));
      blob(tc, soft(0xff8fa8, { under: 0xff6f9a }), [0, .66, 0], .075);
      tc.position.set(0, 1.92, .08); tc.rotation.y = .55; g.add(tc);
      g.userData.head = [1.4, .72, .08]; g.userData.top = [0, 2.0, .08, 0];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-150, .9, .04], acc: [['flower', 0xfff4c0]] }, { hue: [130, .9, .04], acc: [['beret', 0xffd34f, 0xff9a4a]] }, { finish: 'night', acc: ['crown'] }],
  });

  /* 8. マンゲキョウチョウ — butterfly with kaleidoscope wings (UR) */
  const bfWing = (sh, k) => {
    sh.moveTo(0, .1); sh.bezierCurveTo(k * .15, .95, k * 1.12, 1.18, k * 1.04, .58); sh.bezierCurveTo(k * 1.0, .3, k * .7, .14, k * .4, .04);
    sh.bezierCurveTo(k * .82, -.1, k * .82, -.68, k * .46, -.72); sh.bezierCurveTo(k * .16, -.74, 0, -.4, 0, .1);
  };
  const KAL = [
    ['#ff8fb8', '#7cc8ff', '#ffd36a', '#8fe0b0', '#b79cff', '#fff4fa'],
    ['#7cc8ff', '#b79cff', '#8fe0e0', '#ffb3d0', '#6f8aff', '#f2f6ff'],
    ['#ff9a6a', '#ffd36a', '#ff7f9e', '#9fe08a', '#ffb36a', '#fff8ea'],
    ['#ffcf4a', '#ff8fb8', '#ffffff', '#ffb84a', '#7cc8ff', '#fff3c8'],
  ];
  function kalDecal(t) {
    const pal = KAL[t] || KAL[0];
    return decal('c-kal' + t, 512, 512, (c, W) => {
      const b = [0, -.76, 1.12, 1.06], P = (x, y) => [(x - b[0]) / (b[2] - b[0]) * W, (1 - (y - b[1]) / (b[3] - b[1])) * W];
      c.clearRect(0, 0, W, W); const sh = new Path2D(); const pt = (x, y) => P(x, y);
      sh.moveTo(...pt(0, .1)); sh.bezierCurveTo(...pt(.15, .95), ...pt(1.12, 1.18), ...pt(1.04, .58)); sh.bezierCurveTo(...pt(1.0, .3), ...pt(.7, .14), ...pt(.4, .04));
      sh.bezierCurveTo(...pt(.82, -.1), ...pt(.82, -.68), ...pt(.46, -.72)); sh.bezierCurveTo(...pt(.16, -.74), ...pt(0, -.4), ...pt(0, .1));
      c.save(); c.fillStyle = pal[5]; c.fill(sh); c.clip(sh);
      const mandala = (x, y, R) => {
        [[12, 1, 0], [8, .76, 1], [8, .54, 2], [6, .34, 3]].forEach(([n, f, k]) => {
          const r = R * f; c.fillStyle = pal[k];
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + k * .2; c.save(); c.translate(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); c.rotate(a); c.beginPath(); c.ellipse(0, 0, r * .45, r * .2, 0, 0, 7); c.fill(); c.restore(); }
        });
        c.fillStyle = pal[4]; c.beginPath(); c.arc(x, y, R * .16, 0, 7); c.fill();
        c.fillStyle = pal[5]; c.beginPath(); c.arc(x, y, R * .07, 0, 7); c.fill();
        c.fillStyle = pal[4]; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * R * 1.02, y + Math.sin(a) * R * 1.02, R * .05, 0, 7); c.fill(); }
      };
      mandala(...P(.66, .6), W * .2); mandala(...P(.46, -.36), W * .13);
      c.restore(); c.strokeStyle = pal[4]; c.lineWidth = 16; c.stroke(sh);
    });
  }
  D('butterfly', {
    name: { ja: 'マンゲキョウチョウ', en: 'Kaleidofly' },
    desc: { ja: 'はばたくたびに羽の模様がくるくる変わる、まぼろしの蝶。', en: 'A rare butterfly whose wing patterns turn with every flap.' },
    ur: true,
    build(opt, tier) {
      const g = new T.Group(), B = soft(0xcdb8ff, { under: 0xff9fd0, uk: .5 }), Wb = soft(0xb79cff, { under: 0xff8fc8, uk: .45 }), pk = soft(0xff8fb1, { under: 0xff6f9a });
      blob(g, B, [0, .6, 0], [.38, .48, .36]);
      [.42, .66].forEach(y => { const r = mesh(new T.TorusGeometry(.35, .045, 10, 36), Wb); r.rotation.x = Math.PI / 2; r.position.y = y; r.scale.set(1.04, 1, .98); g.add(r); });
      const hc = V3(0, 1.4, .1), HR = [.68, .6, .58]; blob(g, B, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .26, v: .06, mouth: 'open', mw: .08, my: .27, bx: .13 });
      [-1, 1].forEach(s => { seg(g, Wb, [s * .22, 1.8, .06], [s * .38, 2.18, -.02], .032); blob(g, pk, [s * .4, 2.22, -.03], .09); });
      const dec = kalDecal(tier), bb = [0, -.76, 1.12, 1.06];
      [-1, 1].forEach(s => { const w = panel(bfWing, Wb, dec, bb, s < 0, .05, .05); w.position.set(s * .12, .98, -.3); w.rotation.set(0, -s * .32, 0); w.scale.setScalar(1.12); g.add(w); });
      [-1, 1].forEach(s => blob(g, B, [s * .2, .08, .2], [.12, .08, .15]));
      [-1, 1].forEach(s => blob(g, B, [s * .36, .66, .24], [.1, .14, .1], [0, 0, s * .4]));
      g.userData.head = [1.4, .68, .1]; g.userData.top = [0, 1.98, .08, 0]; g.userData.neck = [0, .98, .06, .36];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-120, .9, .04], acc: ['bow'] }, { hue: [150, .9, .04], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { acc: ['crown'] }],
  });

  /* 9. ヨーヨーサル — little monkey with a yo-yo */
  D('monkey', {
    name: { ja: 'ヨーヨーサル', en: 'Yoyomonk' },
    desc: { ja: 'ヨーヨーの技は百八つ。いちばん得意なのは犬のさんぽ。', en: 'Knows a hundred yo-yo tricks; walking the dog is its favourite.' },
    build() {
      const g = new T.Group(), F = soft(0xe8a878, { under: 0xff9fb8, uk: .45 }), cr = soft(0xfff0dc, { under: 0xffd0c8, uk: .4 }), pk = soft(0xffb3c0);
      blob(g, F, [0, .55, 0], [.48, .48, .44]);
      blob(g, cr, [0, .5, .22], [.3, .32, .24]);
      const hc = V3(0, 1.45, 0), HR = [.78, .68, .68]; blob(g, F, [hc.x, hc.y, hc.z], HR);
      const fe = s => V3(s * .2, 1.56, .4), FR = [.29, .29, .3];
      [-1, 1].forEach(s => { const c = fe(s); blob(g, cr, [c.x, c.y, c.z], FR); });
      const mc = V3(0, 1.25, .46), MR = [.42, .28, .3]; blob(g, cr, [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, (u, v) => { const s = Math.sign(u) || 1; return ell(fe(s), FR)(u - s * .2, v - .0); }, { er: .1, gap: .22, v: .02, mouth: 'open', msurf: ell(mc, MR), mv: -.02, mw: .1, by: .2, bx: .06 });
      [-1, 1].forEach(s => { const p = ell(mc, MR)(s * .06, .14); blob(g, soft(0xc98a6a, { rough: .6 }), [p.p.x, p.p.y, p.p.z], [.035, .025, .02]); });
      [-1, 1].forEach(s => { blob(g, F, [s * .8, 1.48, -.04], [.12, .24, .22]); blob(g, pk, [s * .86, 1.48, .0], [.06, .15, .14]); });
      blob(g, F, [0, 2.08, .1], [.08, .1, .06], [0, 0, .3]);                                        // hair tuft
      // tail curling up behind
      [[-.2, .4, -.4], [-.48, .5, -.52], [-.62, .78, -.5], [-.56, 1.04, -.42], [-.4, 1.1, -.36]].reduce((a, b) => { seg(g, F, a, b, .065); return b; });
      // one arm up holding the yo-yo string, the other on the hip
      seg(g, F, [-.38, .78, .1], [-.7, 1.02, .3], .11); blob(g, cr, [-.72, 1.04, .32], .12);
      blob(g, F, [.44, .62, .16], [.13, .2, .14], [0, 0, -.6]);
      const yz = .38, yx = -.8, yy = .36;
      seg(g, soft(0xfffaf4, { rim: .1 }), [-.73, .96, .36], [yx, yy, yz + .06], .012);
      const yo = new T.Group(), ym = soft(0xff6f8a, { under: 0xd85a9a, uk: .4 }), yb = soft(0xffd34f, { under: 0xffa040 });
      [-1, 1].forEach(s => { const p = puck(.2, .09, ym, .5); p.rotation.x = Math.PI / 2; p.position.z = s > 0 ? .1 : -.01; yo.add(p); });
      const ax = mesh(new T.CylinderGeometry(.05, .05, .1, 12), yb); ax.rotation.x = Math.PI / 2; ax.position.z = .045; yo.add(ax);
      blob(yo, yb, [0, 0, .105], [.08, .08, .02]);
      yo.position.set(yx, yy, yz); yo.rotation.y = -.3; g.add(yo);
      [-1, 1].forEach(s => blob(g, F, [s * .25, .08, .28], [.15, .09, .19]));
      g.userData.head = [1.45, .78, 0]; g.userData.top = [0, 2.1, -.06, -.05]; g.userData.neck = [0, .86, .02, .42];
      return alive(g, eyes);
    },
    v: [{}, { hue: [170, .8, .04], acc: [['star', 0xffd34f]] }, { hue: [75, .9, .04], acc: ['dicehat'] }, { finish: 'sakura', acc: ['halo'] }],
  });

  /* 10. テディクマ — the classic plush teddy (UR) */
  D('teddy', {
    name: { ja: 'テディクマ', en: 'Teddybear' },
    desc: { ja: 'おもちゃ箱のリーダー。つぎあてとボタンは冒険のしるし。', en: 'Leader of the toy box. Its patch and button are badges of adventure.' },
    ur: true,
    build() {
      const g = new T.Group(), F = soft(0xe8b47a, { under: 0xff9f9f, uk: .45 }), cr = soft(0xfff0dc, { under: 0xffd6c8, uk: .4 }), pad = soft(0xffd8c4, { under: 0xffb0b0, uk: .4 });
      const bc = V3(0, .66, 0), BR = [.58, .56, .5]; blob(g, F, [bc.x, bc.y, bc.z], BR);
      const hc = V3(0, 1.55, 0), HR = [.86, .74, .74]; blob(g, F, [hc.x, hc.y, hc.z], HR);
      const mc = V3(0, 1.3, .56), MR = [.36, .26, .28]; blob(g, cr, [mc.x, mc.y, mc.z], MR);
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .32, v: .16, mouth: 'w', msurf: ell(mc, MR), mv: -.06, mw: .12, by: .1, bx: .22 });
      nose(g, ell(mc, MR)(0, .1));
      [-1, 1].forEach(s => { blob(g, F, [s * .64, 2.12, -.06], [.24, .24, .16]); blob(g, pad, [s * .64, 2.1, .06], [.13, .13, .06]); });
      // legs out front with paw pads
      [-1, 1].forEach(s => { blob(g, F, [s * .32, .22, .36], [.22, .2, .32]); blob(g, pad, [s * .32, .24, .67], [.14, .14, .04]); });
      [-1, 1].forEach(s => { blob(g, F, [s * .6, .72, .2], [.16, .3, .17], [.3, 0, s * .55]); blob(g, pad, [s * .74, .5, .36], [.09, .09, .05], [0, 0, s * .5]); });
      // stitched seam, gingham patch and a button on the tummy
      const bs = ell(bc, BR);
      const seam = hugDecal(bs, 0, -.05, .06, .5, decal('c-seam', 16, 128, (c, W, H) => { c.clearRect(0, 0, W, H); c.fillStyle = '#9a5a3a'; for (let y = 4; y < H; y += 18) c.fillRect(5, y, 6, 11); })); stick(g, seam.m, seam.s, seam.lift);
      const patch = hugDecal(bs, -.24, .02, .3, .28, decal('c-patch', 128, 128, (c, W) => {
        c.clearRect(0, 0, W, W); c.fillStyle = '#bfe2ff'; rr(c, 6, 6, W - 12, W - 12, 14); c.fill();
        c.fillStyle = 'rgba(110,160,240,.45)'; for (let i = 0; i < 4; i++) { c.fillRect(14 + i * 28, 6, 14, W - 12); c.fillRect(6, 14 + i * 28, W - 12, 14); }
        c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.setLineDash([9, 7]); rr(c, 16, 16, W - 32, W - 32, 8); c.stroke();
      }), .006); stick(g, patch.m, patch.s, patch.lift);
      const bt = new T.Group(), bm = soft(0xff7f9e, { under: 0xd85a9a, uk: .3, rough: .5 }), bp = puck(.085, .04, bm, .5); bp.rotation.x = Math.PI / 2; bt.add(bp);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => blob(bt, soft(0xb04a6a, { rough: .6 }), [a * .022, b * .022, .041], [.013, .013, .006]));
      stick(g, bt, bs(.2, .14), -.005);
      blob(g, F, [0, .5, -.5], [.11, .11, .1]);
      g.userData.head = [1.55, .86, 0]; g.userData.top = [0, 2.28, -.02, 0]; g.userData.neck = [0, .94, .02, .48];
      return alive(g, eyes);
    },
    v: [{}, { hue: [-160, .7, .06], acc: [['bow', 0x6fb8ff, 0x8a76ff]] }, { map: { 0xe8b47a: 0xf2f0f6, 0xff9f9f: 0xc8d0ff }, acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { acc: ['crown'] }],
  });
})();
