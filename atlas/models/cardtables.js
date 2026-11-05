/* =====================================================================
   The card games on the portal's chabudai — showcase models in the spirit of
   the Solitaire mat (table3d.js MODELS.solitaire: a baize top on a wooden rim, real
   cards with printed faces): each game's 2D table rebuilt as a small 3D table.
     poker      an oval table: teal baize, a padded black leather rail on a walnut edge,
                the printed POKER logo, five community cards (a flop and a turn), two hole
                cards, chip stacks, the dealer button
     blackjack  a half-moon table: the printed arc "BLACKJACK PAYS 3 TO 2", seven betting
                circles, the dealer's hand (one card face down), a player's hand, chips, the
                card shoe and the discard tray
     baccarat   a rounded table: the PLAYER / BANKER boxes, the curved betting layout, both
                hands dealt (a natural 9 for the Banker), chips, the shoe
   Cards: the same printed faces / back as the Solitaire mat (cream face, red lattice back).
   Static showcases: these games are played in 2D (atlas/app.js CARD2D).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, mesh, RB, canvasTex, wood } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const SUIT = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const CW = 1.04, CD = 1.46, CH = .03;

  /* ---------- shared parts ---------- */
  function face(r, s) {   // the Solitaire mat's card face
    return canvasTex('solC' + r + s, 160, 224, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); const red = s === 1 || s === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
      c.font = 'bold 44px Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(RK[r - 1], 12, 10); c.font = '34px serif'; c.fillText(SUIT[s], 14, 56);
      if (r > 10) { c.strokeStyle = '#a8873f'; c.lineWidth = 4; c.strokeRect(40, 36, 80, 152); c.font = 'italic bold 70px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(RK[r - 1], 80, 112); }
      else { c.font = '96px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUIT[s], 84, 128); }
    });
  }
  const backTex = () => canvasTex('solBack', 160, 224, (c, w, h) => { c.fillStyle = '#9b1c2b'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; for (let i = -h; i < w + h; i += 14) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); } c.strokeStyle = '#fbf3e2'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20); });
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function card(g, r, s, up, x, y, z, ry = 0) {
    const edge = mat('edge', () => M({ color: 0xf2ead8, roughness: .6 })), mb = mat('back', () => M({ map: backTex(), roughness: .5, bump: false }));
    const top = up ? mat('f' + r + s, () => M({ map: face(r, s), roughness: .45, bump: false })) : mb;
    const m = mesh(RB(CW, CH, CD, .012, 1), [edge, edge, top, mb, edge, edge], x, y + CH / 2, z); m.rotation.y = ry; g.add(m); return m;
  }
  // a casino chip: a short cylinder with a printed face (rim stripes, a ring and the value)
  const CHIP = { 1: ['#e9e4d8', '#1d1f2a'], 5: ['#c8262f', '#ffffff'], 25: ['#1f7a4c', '#ffffff'], 100: ['#1c1d24', '#ffffff'], 500: ['#6a2b9a', '#ffffff'] };
  function chipTex(v) {
    return canvasTex('chip' + v, SZ(128), SZ(128), (c, w) => {
      const [bg, fg] = CHIP[v], r = w / 2; c.fillStyle = bg; c.beginPath(); c.arc(r, r, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = fg; for (let k = 0; k < 8; k++) { c.save(); c.translate(r, r); c.rotate(k / 8 * Math.PI * 2); c.fillRect(-w * .05, -r, w * .1, r * .26); c.restore(); }
      c.strokeStyle = fg; c.globalAlpha = .7; c.lineWidth = w * .02; c.beginPath(); c.arc(r, r, r * .62, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = fg; c.font = `bold ${Math.round(w * .26)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(v), r, r + w * .02);
    });
  }
  const chipGeo = () => mat('chipGeo', () => new (T().CylinderGeometry)(.3, .3, .07, 28));
  function chips(g, x, y, z, list) {   // list: values bottom → top
    list.forEach((v, k) => {
      const side = mat('cs' + v, () => M({ color: parseInt(CHIP[v][0].slice(1), 16), roughness: .4 })), tp = mat('ct' + v, () => M({ map: chipTex(v), roughness: .35, bump: false }));
      const m = mesh(chipGeo(), [side, tp, tp], x + (k % 3 === 1 ? .015 : 0), y + .035 + k * .07, z + (k % 2 ? .01 : 0)); m.rotation.y = k * .7; g.add(m);
    });
  }
  // the table: a baize top (printed layout on a canvas) inside a padded leather rail on a wooden edge.
  // shape(ctx2d-like path builder for a THREE.Shape, inset) gives the outline
  function table(key, shapeFn, W, D, printFn) {
    const TT = T(), g = new TT.Group();
    // shapeFn draws in plan coordinates (x right, z towards the player); the shape's y is −z (rotateX(−π/2) below turns it back)
    const outline = inset => { const s = new TT.Shape(), q = { moveTo: (x, z) => s.moveTo(x, -z), lineTo: (x, z) => s.lineTo(x, -z), absarc: (x, z, r, a0, a1, cw) => s.absarc(x, -z, r, -a0, -a1, !cw) }; shapeFn(q, inset); return s; };
    // wooden edge (bottom) and leather rail (top), extruded rings
    // (the outline as clean points: no repeated point where a line meets an arc or the path closes — those broke the
    // triangulation of the ring: see-through patches and a notch in the rail)
    const pts = inset => { const out = []; for (const p of outline(inset).getPoints(40)) { const q = out[out.length - 1]; if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-4) out.push(p); } if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) < 1e-4) out.pop(); return out; };
    const ring = (outer, inner, h, bev) => { const s = new TT.Shape(pts(outer)); s.holes.push(new TT.Path(pts(inner)));
      const geo = new TT.ExtrudeGeometry(s, { depth: h, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 1 }); geo.rotateX(-Math.PI / 2); return geo; };
    const woodM = mat('rimWood', () => M({ map: wood('ctWood', '#6a3f22', '#341a0b'), roughness: .38, clearcoat: .5, clearcoatRoughness: .25 }));
    const leather = mat('leather', () => M({ color: 0x1e1814, roughness: .72, metalness: 0, envMapIntensity: .35 }));   // padded leather: satin, not glossy (at a low angle a clear coat mirrored the room's wood: the rail looked see-through)
    g.add(mesh(ring(0, .5, .32, .04), woodM, 0, 0, 0));
    g.add(mesh(ring(.06, .52, .16, .1), leather, 0, .38, 0));
    // the rings' inner walls (round the hole) come out of the extrusion facing away from the baize: seen from across the
    // table they were culled and the far rail looked see-through — both rings are drawn double-sided
    woodM.side = leather.side = T().DoubleSide;
    // the baize: a flat shape with the printed layout (UVs from the plan view)
    const top = new TT.ShapeGeometry(new TT.Shape(pts(.48)), 1); top.rotateX(-Math.PI / 2);
    const P = top.attributes.position, UV = top.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / W + .5, .5 - P.getZ(i) / D);
    const tex = canvasTex(key, SZ(1024), Math.round(SZ(1024) * D / W), (c, w, h) => {
      const gr = c.createRadialGradient(w / 2, h * .45, w * .05, w / 2, h / 2, w * .62); gr.addColorStop(0, '#24806a'); gr.addColorStop(1, '#0e4a3c'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26000; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},.04)`; c.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6); }
      c.save(); c.scale(w / W, h / D); c.translate(W / 2, D / 2); printFn(c); c.restore();
    });
    const baize = mesh(top, M({ map: tex, roughness: .95, bump: false }), 0, .3, 0); baize.receiveShadow = true; g.add(baize);
    // a dark base under the baize (seen through nothing, casts the table's shadow)
    g.add(mesh(new TT.ShapeGeometry(new TT.Shape(pts(.4)), 1).rotateX(-Math.PI / 2), M({ color: 0x0b2a22 }), 0, .02, 0));
    g.userData.top = .31;
    return g;
  }
  const ink = (c, a = .4) => { c.strokeStyle = `rgba(232,228,214,${a})`; c.fillStyle = `rgba(232,228,214,${a})`; };
  const text = (c, s, x, y, size, a = .5, font = 'Georgia, serif', ls = 0) => { ink(c, a); c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; if (ls) { try { c.letterSpacing = ls + 'px'; } catch (e) {} } c.fillText(s, x, y); if (ls) { try { c.letterSpacing = '0px'; } catch (e) {} } };
  const arcText = (c, s, cx, cy, R, a0, a1, size, a = .5) => { ink(c, a); c.font = `${size}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const n = s.length; for (let i = 0; i < n; i++) { const t = a0 + (a1 - a0) * (i + .5) / n; c.save(); c.translate(cx + Math.cos(t) * R, cy + Math.sin(t) * R); c.rotate(t - Math.PI / 2); c.fillText(s[i], 0, 0); c.restore(); } };
  function shoe(g, x, z, ry) {   // a card shoe: a dark wooden box with a slanted front and the deck inside
    const TT = T(), sg = new TT.Group(), box = mat('shoe', () => M({ color: 0x2a1c14, roughness: .35, clearcoat: .5 }));
    sg.add(mesh(RB(1.3, .55, 1.8, .06, 2), box, 0, .275, 0));
    const deck = mesh(new TT.BoxGeometry(1.08, .3, 1.5), [mat('edge', () => M({ color: 0xf2ead8, roughness: .6 })), mat('edge'), mat('back', () => M({ map: backTex(), roughness: .5, bump: false })), mat('edge'), mat('edge'), mat('edge')], 0, .5, .05); sg.add(deck);
    const lip = mesh(RB(1.3, .1, .3, .03, 1), box, 0, .2, .95); lip.rotation.x = -.5; sg.add(lip);
    sg.position.set(x, .31, z); sg.rotation.y = ry; g.add(sg);
  }

  /* ---------- poker: an oval table ---------- */
  X.MODELS.poker = function () {
    const W = 10.4, D = 6.4;
    const oval = (s, k) => { const a = W / 2 - k, b = D / 2 - k, r = b; s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.absarc(a - r, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-a + r, b); s.absarc(-a + r, 0, r, Math.PI / 2, Math.PI * 1.5, false); };
    const g = table('pkFelt', oval, W, D, c => {
      ink(c, .25); c.lineWidth = .04; c.beginPath(); const a = W / 2 - 1.3, b = D / 2 - 1.3; c.moveTo(-a + b, -b); c.lineTo(a - b, -b); c.arc(a - b, 0, b, -Math.PI / 2, Math.PI / 2); c.lineTo(-a + b, b); c.arc(-a + b, 0, b, Math.PI / 2, Math.PI * 1.5); c.stroke();
      for (let i = 0; i < 5; i++) { c.lineWidth = .025; c.strokeRect(-2.9 + i * 1.2 - .52, -.95, 1.04, 1.46); }
      text(c, 'POKER', 0, 1.15, .52, .32, 'Georgia, serif', 3); text(c, 'WORLD BOARD GAME ATLAS', 0, 1.65, .2, .28, 'Georgia, serif', 2);
    });
    const Y = g.userData.top;
    [[12, 0, 1], [7, 1, 1], [7, 3, 1], [2, 2, 1]].forEach(([r, s], i) => card(g, r, s, true, -2.9 + i * 1.2, Y, -.22));   // flop + turn (the river still to come)
    card(g, 1, 0, true, -.35, Y, 1.75, -.12); card(g, 1, 2, true, .45, Y + CH, 1.7, .1);   // your hole cards: aces
    card(g, 1, 0, false, -3.4, Y, -1.6, .5); card(g, 1, 0, false, -3.1, Y + CH, -1.55, .35);   // an opponent's
    card(g, 1, 0, false, 3.2, Y, -1.5, -.4); card(g, 1, 0, false, 3.5, Y + CH, -1.6, -.55);
    chips(g, -1.3, Y, .95, [25, 25, 5, 5, 5]); chips(g, -.7, Y, 1.0, [100, 100, 25]); chips(g, .9, Y, -1.55, [5, 5, 1, 1]);
    chips(g, -3.6, Y, .3, [100, 100, 100, 25, 25, 25, 5]); chips(g, 3.6, Y, .2, [500, 100, 100, 25]);
    const TT = T(), btn = mesh(new TT.CylinderGeometry(.24, .24, .06, 28), [mat('dbs', () => M({ color: 0xf4efe2, roughness: .4 })), mat('dbt', () => M({ map: canvasTex('dealerBtn', 128, 128, (c, w) => { c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, w); c.fillStyle = '#1d1f2a'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DEALER', w / 2, w / 2); }), roughness: .4, bump: false })), mat('dbt')], 1.6, Y + .03, 1.6);
    g.add(btn);
    g.scale.setScalar(.93);
    return g;
  };

  /* ---------- blackjack: a half-moon table ---------- */
  X.MODELS.blackjack = function () {
    const R = 5.4, D0 = 1.1;   // the round side faces the players (near), the straight side the dealer (far)
    // the plan (x, z) spans −R…R and −D0…R − D0
    const W = 2 * R, D = R + D0, cz = (R - D0) / 2;
    const g0 = table('bjFelt', (s, k) => { const r = R - k; s.moveTo(-r, -D0 + k - cz); s.lineTo(r, -D0 + k - cz); s.absarc(0, -D0 + k - cz, r, 0, Math.PI, false); }, W, D, c => {
      const oz = -D0 - cz;
      arcText(c, 'BLACKJACK PAYS 3 TO 2', 0, oz, 3.25, Math.PI * .78, Math.PI * .22, .34, .5);
      arcText(c, 'DEALER MUST STAND ON ALL 17s', 0, oz, 2.75, Math.PI * .72, Math.PI * .28, .18, .38);
      ink(c, .32); c.lineWidth = .05; c.beginPath(); c.arc(0, oz, 2.3, Math.PI * .2, Math.PI * .8); c.stroke(); c.beginPath(); c.arc(0, oz, 1.95, Math.PI * .2, Math.PI * .8); c.stroke();
      arcText(c, 'INSURANCE PAYS 2 TO 1', 0, oz, 2.12, Math.PI * .7, Math.PI * .3, .15, .45);
      for (let i = 0; i < 7; i++) { const a = Math.PI * (.12 + i * .76 / 6); ink(c, .4); c.lineWidth = .045; c.beginPath(); c.arc(Math.cos(a) * 4.15, oz + Math.sin(a) * 4.15, .42, 0, Math.PI * 2); c.stroke(); }
    });
    const g = g0, Y = g.userData.top, oz = -D0 - cz;
    // dealer: a ten up, the hole card down
    card(g, 10, 1, true, -.6, Y, oz + .95); card(g, 1, 0, false, .5, Y, oz + .95);
    // the middle seat: a soft 19 (ace + eight) with a bet
    const a3 = Math.PI * .5, sx = Math.cos(a3) * 4.15, sz = oz + Math.sin(a3) * 4.15;
    card(g, 1, 3, true, sx - .3, Y, sz - 1.3, -.1); card(g, 8, 2, true, sx + .1, Y + CH, sz - 1.15, .12);
    chips(g, sx, Y, sz, [25, 25, 5, 5]);
    [1, 2, 4, 5].forEach(i => { const a = Math.PI * (.12 + i * .76 / 6); chips(g, Math.cos(a) * 4.15, Y, oz + Math.sin(a) * 4.15, i % 2 ? [100, 25] : [5, 5, 5]); });
    // the dealer's chip rack along the straight side
    const TT = T(), rack = mat('rack', () => M({ color: 0x2a1c14, roughness: .35, clearcoat: .5 }));
    g.add(mesh(RB(3.6, .2, .7, .05, 2), rack, 0, Y + .1, oz + .1));
    [100, 25, 5, 1, 500].forEach((v, i) => { for (let k = 0; k < 3; k++) { const m = mesh(chipGeo(), [mat('cs' + v, () => M({ color: parseInt(CHIP[v][0].slice(1), 16), roughness: .4 })), mat('ct' + v, () => M({ map: chipTex(v), roughness: .35, bump: false })), mat('ct' + v)], -1.44 + i * .72, Y + .32, oz + .1 - .12 + k * .12); m.rotation.x = Math.PI / 2; g.add(m); } });
    shoe(g, 3.6, oz + .9, -.5);
    g.scale.setScalar(.9);
    return g;
  };

  /* ---------- baccarat: a rounded table with the PLAYER / BANKER layout ---------- */
  X.MODELS.baccarat = function () {
    const W = 10.4, D = 6.8;
    const rr = (s, k) => { const a = W / 2 - k, b = D / 2 - k, r = 2.6 - k; s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.absarc(a - r, -b + r, r, -Math.PI / 2, 0, false); s.lineTo(a, b - r); s.absarc(a - r, b - r, r, 0, Math.PI / 2, false); s.lineTo(-a + r, b); s.absarc(-a + r, b - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-a, -b + r); s.absarc(-a + r, -b + r, r, Math.PI, Math.PI * 1.5, false); };
    const g = table('bcFelt', rr, W, D, c => {
      ink(c, .38); c.lineWidth = .045; [-1, 1].forEach(s => c.strokeRect(s * 1.55 - 1.25, -2.65, 2.5, 1.7));
      [['PLAYER', -1.55], ['BANKER', 1.55]].forEach(([t, x]) => { ink(c, .45); c.lineWidth = .03; c.strokeRect(x - .75, -2.95, 1.5, .4); text(c, t, x, -2.75, .24, .6, 'Georgia, serif', 2); });
      const oz = -4.6; ['PLAYER 1:1', 'BANKER 0.95:1', 'TIE 8:1'].forEach((t, i) => { const R0 = 7.6 - i * .75; ink(c, .35); c.lineWidth = .04; c.beginPath(); c.arc(0, oz, R0, Math.PI * .3, Math.PI * .7); c.stroke(); arcText(c, t, 0, oz, R0 - .38, Math.PI * .62, Math.PI * .38, .26, .48); });
      ink(c, .35); c.beginPath(); c.arc(0, oz, 5.35, Math.PI * .3, Math.PI * .7); c.stroke();
    });
    const Y = g.userData.top;
    // Player: 4 + 3 = 7; Banker: K + 9 = 9 (a natural)
    card(g, 4, 2, true, -2.0, Y, -1.8, -.05); card(g, 3, 0, true, -1.1, Y, -1.8, .05);
    card(g, 13, 3, true, 1.1, Y, -1.8, -.04); card(g, 9, 1, true, 2.0, Y, -1.8, .06);
    chips(g, -.1, Y, .55, [100, 100, 25]); chips(g, -2.4, Y, 1.6, [25, 5, 5]); chips(g, 2.3, Y, 1.7, [500, 100]); chips(g, .7, Y, 2.1, [5, 5]);
    shoe(g, 4.0, -1.6, -.4);
    g.scale.setScalar(.93);
    return g;
  };
})();
