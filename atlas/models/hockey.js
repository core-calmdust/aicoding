/* =====================================================================
   Table hockey on the 3D table — boards (Table3D.BOARDS.hockey, chosen in the portal's 盤 row):
   · 'classic' (the default) a tabletop rink: a navy felt field with white markings (the middle line and circle, the goal
              creases, a score track along each end), a birch plywood frame with the goal slots cut in the end walls, the
              tray standing on two U-shaped plywood feet. Mallets: a black stick on a black base with a coloured ball on top
              (red for you, yellow for the far player); a white puck.
   · 'neon'    night arcade: a black field with glowing cyan / magenta markings, a black lacquer frame with a light strip,
              glowing mallet balls and a puck with a light ring.
   · 'air' an air-hockey table (white glossy field with air holes), 'pinball' (purple sunburst, red frame), 'gear'
              (leather and brass gears, walnut frame), 'space' (stars and nebula, violet light) — 2026-11-10: each board has a
              game of its own (hockey/engine.js BOARDS).
   Everything the special modes add (atlas/games/hockey.js shows / hides them): the turning bar (block), monsters,
   item tokens, bumpers, portals, goal shields.
   Units: K world units per cm (the 66 cm tray ≈ 9.2 world units long). Field coordinates as in hockey/engine.js.
   userData: { top, K, look, xz(x, y), mallet(side), puck(), monster(i), item(kind), bar(), bumper(), portal(k), shield(),
               dot(side) → css colour }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const K = 10 / 72, W = 40, L = 62, GW = 13, RP = 2, RM = 3.1, FR = 2.2, WH = 3.2;   // frame thickness, wall height (cm)
  const TOP = .7, LOOKS = ['classic', 'air', 'neon', 'pinball', 'gear', 'space'];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const geos = {}, share = g => { if (X.share) X.share(g); return g; }, geo = (k, f) => geos[k] || (geos[k] = share(f()));
  const lookNow = () => X.BOARDS && X.BOARDS.hockey ? X.BOARDS.hockey.get() : 'classic';
  const COL = { classic: ['#e2402f', '#f2c230'], neon: ['#ff3fb4', '#3ce6ff'], air: ['#e2302a', '#2a64d8'], pinball: ['#ff5a2c', '#ffd23c'], gear: ['#c8402a', '#3a8ad0'], space: ['#ff4fa3', '#4fd8ff'] };
  // (2026-11-10) each board its own field: base colour, grain, markings and a picture of its own
  const FLD = {
    classic: { base: [36, 74, 140], grain: 14, mott: 20, ink: 'rgba(250,250,255,.92)', ink2: 'rgba(250,250,255,.92)' },
    neon: { base: [10, 11, 22], grain: 6, mott: 8, ink: '#3ce6ff', ink2: '#ff3fb4', glow: true, seed: 5 },
    air: { base: [238, 242, 246], grain: 3, mott: 5, ink: '#d8342c', ink2: '#2a64d8', seed: 7 },
    pinball: { base: [44, 22, 92], grain: 8, mott: 22, ink: '#ffd23c', ink2: '#ff5a2c', glow: true, seed: 11 },
    gear: { base: [70, 46, 30], grain: 12, mott: 26, ink: '#e8c27a', ink2: '#e8c27a', seed: 13 },
    space: { base: [8, 8, 26], grain: 5, mott: 10, ink: '#c9b8ff', ink2: '#7fe6ff', glow: true, seed: 17 },
  };

  /* ---------- each board's picture under the markings ---------- */
  function deco(g, look, S, H, u, X0, Y0) {
    const rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(look.length * 977 + 13);
    if (look === 'air') {   // the air holes: a fine grid of small dark dots (the air comes through them)
      g.fillStyle = 'rgba(70,80,96,.55)';
      for (let y = -L / 2 + 1; y < L / 2; y += 1.6) for (let x = -W / 2 + 1; x < W / 2; x += 1.6) { g.beginPath(); g.arc(X0(x), Y0(y), .13 * u, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(42,100,216,.10)'; g.fillRect(0, 0, S, H * .5); g.fillStyle = 'rgba(216,52,44,.08)'; g.fillRect(0, H * .5, S, H * .5);
    } else if (look === 'pinball') {   // sunburst rays and stars, a pinball playfield
      g.save(); g.translate(X0(0), Y0(0));
      for (let k = 0; k < 24; k++) { g.fillStyle = k % 2 ? 'rgba(255,90,44,.16)' : 'rgba(255,210,60,.10)'; g.beginPath(); g.moveTo(0, 0); const a0 = k / 24 * Math.PI * 2, a1 = (k + 1) / 24 * Math.PI * 2, R = S * 2; g.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); g.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); g.fill(); }
      g.restore();
      const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(X0(x) + Math.cos(a) * q * u, Y0(y) + Math.sin(a) * q * u); } g.fill(); };
      for (let k = 0; k < 26; k++) star((rnd() - .5) * (W - 4), (rnd() - .5) * (L - 8), .4 + rnd() * .8, rnd() < .5 ? 'rgba(255,230,120,.55)' : 'rgba(255,255,255,.4)');
    } else if (look === 'gear') {   // brass gears etched in the leather
      const gear = (x, y, r, n) => { g.strokeStyle = 'rgba(232,194,122,.28)'; g.lineWidth = .18 * u; g.beginPath(); for (let k = 0; k <= n * 4; k++) { const a = k / (n * 4) * Math.PI * 2, q = (k % 4 < 2 ? r : r * .86); g.lineTo(X0(x) + Math.cos(a) * q * u, Y0(y) + Math.sin(a) * q * u); } g.stroke(); g.beginPath(); g.arc(X0(x), Y0(y), r * .35 * u, 0, 7); g.stroke(); };
      gear(-12, -18, 6, 12); gear(-3, -11, 3.6, 8); gear(13, 16, 6.5, 13); gear(4, 21, 3.2, 8); gear(14, -24, 4, 9); gear(-14, 22, 4.5, 10);
    } else if (look === 'space') {   // stars and a faint nebula
      for (let k = 0; k < 5; k++) { const x = X0((rnd() - .5) * W), y = Y0((rnd() - .5) * L), r = (6 + rnd() * 10) * u, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, k % 2 ? 'rgba(160,90,255,.22)' : 'rgba(60,170,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (let k = 0; k < 420; k++) { const b = rnd(); g.fillStyle = `rgba(255,255,255,${.25 + b * .7})`; g.beginPath(); g.arc(rnd() * S, rnd() * H, (b > .96 ? .16 : .07) * u, 0, 7); g.fill(); }
    } else if (look === 'neon') {   // a faint grid (a gaming floor)
      g.strokeStyle = 'rgba(60,230,255,.08)'; g.lineWidth = .06 * u;
      for (let x = -W / 2; x <= W / 2; x += 4) { g.beginPath(); g.moveTo(X0(x), 0); g.lineTo(X0(x), H); g.stroke(); }
      for (let y = -L / 2; y <= L / 2; y += 4) { g.beginPath(); g.moveTo(0, Y0(y)); g.lineTo(S, Y0(y)); g.stroke(); }
    }
  }

  /* ---------- the field: felt and markings, in field centimetres (W × L) ---------- */
  function fieldTex(look) {
    const S = SZ(1024), H = Math.round(S * L / W);
    return X.canvasTex('hkField' + look + S, S, H, (g) => {
      const u = S / W, X0 = cm => (cm + W / 2) * u, Y0 = cm => (cm + L / 2) * u, F = FLD[look] || FLD.classic, neon = !!F.glow;
      const N = X.makeNoise(F.seed || 19), img = g.createImageData(S, H), d = img.data;
      const base = F.base;
      for (let y = 0; y < H; y++) for (let x = 0; x < S; x++) { const k = (Math.random() - .5) * F.grain + (N(x / 3, y / 3, 2) - .5) * F.mott + (N(x / 60, y / 60, 3) - .5) * 14, i = (y * S + x) * 4; d[i] = base[0] + k; d[i + 1] = base[1] + k; d[i + 2] = base[2] + k * 1.1; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      deco(g, look, S, H, u, X0, Y0);
      const ink = F.ink, ink2 = F.ink2;
      const glow = c => { if (neon) { g.shadowColor = c; g.shadowBlur = .8 * u; } else g.shadowBlur = 0; };
      const line = (x0, y0, x1, y1, w, c) => { glow(c); g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.moveTo(X0(x0), Y0(y0)); g.lineTo(X0(x1), Y0(y1)); g.stroke(); };
      const arc = (x, y, r, a0, a1, w, c) => { glow(c); g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.arc(X0(x), Y0(y), r * u, a0, a1); g.stroke(); };
      line(-W / 2, 0, W / 2, 0, .3, ink); arc(0, 0, 6, 0, Math.PI * 2, .25, ink); g.fillStyle = ink; g.beginPath(); g.arc(X0(0), Y0(0), .5 * u, 0, 7); g.fill();
      for (const sg of [1, -1]) {
        const c = sg > 0 ? ink2 : ink;
        arc(0, sg * L / 2, 8.5, sg > 0 ? Math.PI : 0, sg > 0 ? Math.PI * 2 : Math.PI, .25, c);
        // a score track along the end: 0…6 ticks (the players can count on it, like the real tabletop games)
        g.font = `700 ${1.5 * u}px "Fredoka", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const ty = sg * (L / 2 - 1.6);
        line(-W / 2 + .8, sg * (L / 2 - 3.2), -GW / 2 - .6, sg * (L / 2 - 3.2), .12, c); line(GW / 2 + .6, sg * (L / 2 - 3.2), W / 2 - .8, sg * (L / 2 - 3.2), .12, c);
        for (let k = 0; k < 6; k++) { for (const sd of [-1, 1]) { const x = sd * (GW / 2 + 3.4 + k * 1.55); glow(c); g.fillStyle = c; g.save(); g.translate(X0(x), Y0(ty)); if (sg < 0) g.rotate(Math.PI); g.fillText(String(sd < 0 ? 6 - k : k + 1), 0, 0); g.restore(); } }
        // dots where the pucks are put down
        g.fillStyle = c; for (const x of [-5, 5]) { g.beginPath(); g.arc(X0(x), Y0(sg * 9), .35 * u, 0, 7); g.fill(); }
      }
      g.shadowBlur = 0;
    });
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    return mat('bm' + look, () => {
      const TT = T(), F = FLD[look] || FLD.classic, glowF = !!F.glow;
      const field = phys({ map: fieldTex(look), color: '#ffffff', roughness: look === 'air' ? .18 : glowF ? .5 : look === 'gear' ? .8 : .95, metalness: 0, clearcoat: look === 'air' ? 1 : undefined, clearcoatRoughness: look === 'air' ? .12 : undefined });
      if (glowF) { field.emissiveMap = field.map; field.emissive = new TT.Color(.75, .75, .75); }
      const glowM = c => { const m = phys({ color: '#000000' }); m.emissive = new TT.Color(c); m.emissiveIntensity = 1.6; return m; };
      let frame, ply, strip = null;
      if (look === 'neon') { frame = phys({ color: '#0d0e18', roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }); strip = glowM(0x3ce6ff); }
      else if (look === 'air') { frame = phys({ color: '#22252c', roughness: .3, metalness: .3, clearcoat: 1, clearcoatRoughness: .15 }); strip = phys({ color: '#d8342c', roughness: .35, clearcoat: .8 }); }
      else if (look === 'pinball') { frame = phys({ color: '#a8182a', roughness: .3, clearcoat: 1, clearcoatRoughness: .1 }); strip = glowM(0xffc83c); }
      else if (look === 'gear') { const w = X.wood('hkWalnut', '#6a4428', '#3c2414', SZ(1024), SZ(256), .8); w.wrapS = w.wrapT = TT.RepeatWrapping; frame = phys({ map: w, color: '#ffffff', roughness: .5, clearcoat: .5 }); strip = phys({ color: '#c9a050', roughness: .25, metalness: 1 }); }
      else if (look === 'space') { frame = phys({ color: '#181530', roughness: .25, metalness: .6, clearcoat: .8 }); strip = glowM(0xa46bff); }
      else { const w = X.wood('hkBirch', '#e8d4b0', '#c9ad80', SZ(1024), SZ(256), .7); w.wrapS = w.wrapT = TT.RepeatWrapping; frame = phys({ map: w, color: '#ffffff', roughness: .55 }); }
      ply = phys({ color: { neon: '#16182a', air: '#2a2d34', pinball: '#5c0f18', gear: '#3a2414', space: '#100e22' }[look] || '#d8bf94', roughness: .7 });
      const hole = new TT.MeshBasicMaterial({ color: 0x050508 });
      const black = phys({ color: look === 'air' ? '#f2f2f4' : '#141416', roughness: .35, clearcoat: .6 });   // (air hockey strikers: white bodies)
      const puckC = { neon: '#e8f8ff', air: '#f2c230', pinball: '#e8e8ee', gear: '#e9d7b0', space: '#f0ecff' }[look] || '#f6f4ee';
      const puck = phys({ color: puckC, roughness: look === 'pinball' ? .08 : .3, metalness: look === 'pinball' ? .9 : 0, clearcoat: .8 });
      const ring = glowF ? (() => { const m = phys({ color: '#000000' }); m.emissive = new TT.Color(0xffffff); m.emissiveIntensity = 1.4; return m; })() : phys({ color: '#d0d0d4', roughness: .3, metalness: .6 });
      return { field, frame, ply, strip, hole, black, puck, ring };
    });
  }
  const ballMat = (look, side) => mat('ball' + look + side, () => { const m = phys({ color: COL[look][side], roughness: .25, clearcoat: 1, clearcoatRoughness: .1 }); if ((FLD[look] || {}).glow) { m.emissive = lin(COL[look][side]); m.emissiveIntensity = .7; } return m; });

  /* ---------- pieces ---------- */
  function mallet(look, side) {
    const TT = T(), BM = boardMats(look), g = new TT.Group(), r = RM * K, seg = LO() ? 20 : 24;
    const base = new TT.Mesh(geo('mbase', () => new TT.CylinderGeometry(r, r * 1.04, .9 * K, seg)), BM.black); base.position.y = .45 * K; base.castShadow = true; g.add(base);
    const felt = new TT.Mesh(geo('mfelt', () => new TT.CylinderGeometry(r * .78, r * .78, .05 * K, seg)), ballMat(look, side)); felt.position.y = .92 * K; g.add(felt);
    const stick = new TT.Mesh(geo('mstick', () => new TT.CylinderGeometry(.42 * K, .55 * K, 5.2 * K, 14)), BM.black); stick.position.y = .9 * K + 2.6 * K; stick.castShadow = true; g.add(stick);
    const ball = new TT.Mesh(geo('mball', () => new TT.SphereGeometry(1.05 * K, 16, 12)), ballMat(look, side)); ball.position.y = 6.3 * K; ball.castShadow = true; g.add(ball);
    g.userData = { side, r: RM };
    return g;
  }
  function puck(look) {
    const TT = T(), BM = boardMats(look), g = new TT.Group(), r = RP * K;
    const b = new TT.Mesh(geo('puck', () => new TT.CylinderGeometry(r, r, .7 * K, LO() ? 18 : 24)), BM.puck); b.position.y = .35 * K; b.castShadow = true; g.add(b);
    const ring = new TT.Mesh(geo('pring', () => { const q = new TT.TorusGeometry(r * .62, .05 * K, 4, 24); q.rotateX(Math.PI / 2); return q; }), BM.ring); ring.position.y = .71 * K; g.add(ring);
    return g;
  }
  // a little round creature: a squashed ball with eyes and feet (the colour per monster)
  const MONC = ['#8a5cd8', '#3fae6a', '#e0743a'];
  function monster(look, i) {
    const TT = T(), g = new TT.Group(), c = MONC[i % MONC.length], r = 2.6 * K;
    const bodyM = mat('mon' + i + look, () => { const m = phys({ color: c, roughness: .55, clearcoat: .3 }); if (look === 'neon') { m.emissive = lin(c); m.emissiveIntensity = .35; } return m; });
    const body = new TT.Mesh(geo('monb', () => new TT.SphereGeometry(r, 22, 16)), bodyM); body.scale.set(1, .8, 1); body.position.y = r * .8; body.castShadow = true; g.add(body);
    const white = mat('monw', () => phys({ color: '#ffffff', roughness: .3 })), pupil = mat('monp', () => phys({ color: '#141418', roughness: .2 }));
    for (const sx of [-1, 1]) {
      const e = new TT.Mesh(geo('mone', () => new TT.SphereGeometry(r * .3, 14, 10)), white); e.position.set(sx * r * .36, r * 1.05, r * .72); g.add(e);
      const p = new TT.Mesh(geo('monpp', () => new TT.SphereGeometry(r * .15, 10, 8)), pupil); p.position.set(sx * r * .36, r * 1.05, r * .98); g.add(p);
      const f = new TT.Mesh(geo('monf', () => new TT.SphereGeometry(r * .28, 12, 8)), bodyM); f.scale.set(1, .5, 1.3); f.position.set(sx * r * .5, r * .12, r * .25); g.add(f);
    }
    const horn = new TT.Mesh(geo('monh', () => new TT.ConeGeometry(r * .18, r * .45, 10)), bodyM); horn.position.set(0, r * 1.55, 0); g.add(horn);
    g.userData = { body, r: 2.6 };
    return g;
  }
  // item tokens: a floating coin with its symbol on both faces
  const ITEMC = { speed: '#ff5a2a', split: '#36b4ff', giant: '#2fbf6a', shield: '#8a5cd8', freeze: '#5ad8ff', worm: '#a46bff' };
  const ITEMS = { speed: '⚡', split: '✦', giant: '⬤', shield: '▮', freeze: '❄', worm: '◎' };
  function itemTex(k) {
    return X.canvasTex('hkItem' + k, 128, 128, (g, S) => {
      g.fillStyle = ITEMC[k]; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = S * .06; g.beginPath(); g.arc(S / 2, S / 2, S * .42, 0, 7); g.stroke();
      g.fillStyle = '#fff'; g.font = `900 ${S * .5}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ITEMS[k], S / 2, S * .53);
    });
  }
  function item(look, k) {
    const TT = T(), g = new TT.Group(), r = 2 * K;
    const m = mat('item' + k, () => { const q = phys({ map: itemTex(k), color: '#ffffff', roughness: .3, clearcoat: .8 }); q.emissive = lin(ITEMC[k]); q.emissiveIntensity = .35; return q; });
    const edge = mat('itemE' + k, () => phys({ color: ITEMC[k], roughness: .3, metalness: .3 }));
    const coin = new TT.Mesh(geo('coin', () => { const q = new TT.CylinderGeometry(r, r, .45 * K, 28); q.rotateX(Math.PI / 2); return q; }), [edge, m, m]); coin.position.y = 2.4 * K; coin.castShadow = true; g.add(coin);
    g.userData = { coin, kind: k };
    return g;
  }
  // (2026-11-10) the clockwork board's bar: a brass beam with a big cog at the hub and a small cog at each end, rivets
  function gearBar() {
    const TT = T(), g = new TT.Group(), BAR = 9, r = 1 * K;
    const brass = mat('gearBrass', () => phys({ color: '#c99a45', roughness: .28, metalness: 1, envMapIntensity: 1.2 }));
    const steel = mat('gearSteel', () => phys({ color: '#6c6a66', roughness: .35, metalness: 1 }));
    const cog = (R, n, h) => { const c = new TT.Group(); const disc = new TT.Mesh(new TT.CylinderGeometry(R * .86, R * .86, h, 28), brass); c.add(disc);
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, t = new TT.Mesh(new TT.BoxGeometry(R * .26, h, R * .32), brass); t.position.set(Math.cos(a) * R * .92, 0, Math.sin(a) * R * .92); t.rotation.y = -a; c.add(t); }
      const hub = new TT.Mesh(new TT.CylinderGeometry(R * .3, R * .3, h * 1.3, 16), steel); c.add(hub);
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, h2 = new TT.Mesh(new TT.CylinderGeometry(R * .12, R * .12, h * 1.1, 10), steel); h2.position.set(Math.cos(a) * R * .58, 0, Math.sin(a) * R * .58); c.add(h2); }
      c.traverse(o => { o.castShadow = true; }); return c; };
    const beam = new TT.Mesh(new TT.BoxGeometry(2 * BAR * K, r * 1.3, r * 1.5), brass); beam.position.y = r * 1.1; beam.castShadow = true; g.add(beam);
    for (let k = -3; k <= 3; k++) { if (!k) continue; const rv = new TT.Mesh(new TT.SphereGeometry(r * .22, 10, 8), steel); rv.position.set(k * BAR / 3.6 * K, r * 1.8, 0); g.add(rv); }
    const big = cog(r * 2.6, 14, r * .9); big.position.y = r * 1.9; g.add(big);
    for (const sx of [-1, 1]) { const sm = cog(r * 1.15, 9, r * 1.3); sm.position.set(sx * BAR * K, r * 1.1, 0); g.add(sm); }
    g.userData.cogs = [big];
    return g;
  }
  // block mode: a chrome bar (capsule) turning round a hub
  function bar(look) {
    if (look === 'gear') return gearBar();
    const TT = T(), g = new TT.Group(), BAR = 9, r = 1 * K, chrome = mat('chrome' + look, () => { const m = phys({ color: look === 'neon' ? '#c8f4ff' : '#dfe3ea', roughness: .12, metalness: 1, envMapIntensity: 1.3 }); if (look === 'neon') { m.emissive = lin('#3ce6ff'); m.emissiveIntensity = .4; } return m; });
    const rod = new TT.Mesh(geo('barRod', () => { const q = new TT.CylinderGeometry(r, r, 2 * BAR * K, 18); q.rotateZ(Math.PI / 2); return q; }), chrome); rod.position.y = r * 1.1; rod.castShadow = true; g.add(rod);
    for (const sx of [-1, 1]) { const e = new TT.Mesh(geo('barEnd', () => new TT.SphereGeometry(r, 16, 12)), chrome); e.position.set(sx * BAR * K, r * 1.1, 0); g.add(e); }
    const hub = new TT.Mesh(geo('barHub', () => new TT.CylinderGeometry(r * 1.8, r * 2.1, r * 2.6, 22)), boardMats(look).black); hub.position.y = r * 1.3; g.add(hub);
    return g;
  }
  function bumper(look) {
    const TT = T(), g = new TT.Group(), r = 2.2 * K;
    const body = new TT.Mesh(geo('bump', () => new TT.CylinderGeometry(r, r * 1.05, 1.6 * K, 26)), mat('bumpM' + look, () => phys({ color: look === 'neon' ? '#1b1d30' : '#c83a4a', roughness: .4, clearcoat: .6 }))); body.position.y = .8 * K; body.castShadow = true; g.add(body);
    const cap = new TT.Mesh(geo('bumpCap', () => new TT.CylinderGeometry(r * .6, r * .7, .4 * K, 22)), mat('bumpCap' + look, () => { const m = phys({ color: '#ffffff', roughness: .3 }); m.emissive = lin(look === 'neon' ? '#ff3fb4' : '#ffd65a'); m.emissiveIntensity = .3; return m; })); cap.position.y = 1.75 * K; g.add(cap);
    g.userData = { cap };
    return g;
  }
  function portal(look, k) {
    const TT = T(), g = new TT.Group(), c = k ? '#ff7a2a' : '#36b4ff', r = 2.8 * K;
    const m = mat('portal' + k, () => { const q = phys({ color: '#000000' }); q.emissive = lin(c); q.emissiveIntensity = 1.6; return q; });
    const ring = new TT.Mesh(geo('portalR', () => { const q = new TT.TorusGeometry(r, .22 * K, 8, 36); q.rotateX(Math.PI / 2); return q; }), m); ring.position.y = .12 * K; g.add(ring);
    const disc = new TT.Mesh(geo('portalD', () => { const q = new TT.CircleGeometry(r * .95, 36); q.rotateX(-Math.PI / 2); return q; }), mat('portalD' + k, () => new TT.MeshBasicMaterial({ color: lin(c), transparent: true, opacity: .35, depthWrite: false }))); disc.position.y = .06 * K; g.add(disc);
    g.userData = { ring };
    return g;
  }
  function shield(look) {
    const TT = T(), g = new TT.Group();
    const m = mat('shield', () => { const q = new TT.MeshBasicMaterial({ color: lin('#8a5cd8'), transparent: true, opacity: .45, depthWrite: false }); return q; });
    const b = new TT.Mesh(geo('shield', () => new TT.BoxGeometry((GW + 1) * K, 2.6 * K, .5 * K)), m); b.position.y = 1.3 * K; g.add(b);
    return g;
  }

  /* ---------- the tray ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look), OW = W + 2 * FR, OL = L + 2 * FR;
    // the field
    const f = new TT.Mesh(geo('field', () => { const q = new TT.PlaneGeometry(W * K, L * K); q.rotateX(-Math.PI / 2); return q; }), BM.field); f.position.y = TOP; f.receiveShadow = true; g.add(f);
    // the tray's floor slab under it
    const slab = new TT.Mesh(geo('slab', () => new TT.BoxGeometry(OW * K - .03, .6 * K, OL * K - .03)), BM.ply);   // (a hair inside the walls' outer faces: the same plane flickered, 2026-11-10) slab.position.y = TOP - .3 * K - .002; slab.castShadow = slab.receiveShadow = true; g.add(slab);
    // walls: the sides whole, the ends split by the goal slot (the slot opens onto a dark pocket box behind)
    const wall = (w, d, x, z) => { const m = new TT.Mesh(new TT.BoxGeometry(w * K, WH * K, d * K), BM.frame); m.position.set(x * K, TOP + WH * K / 2 - .6 * K, z * K); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    wall(FR, OL, -(W / 2 + FR / 2), 0); wall(FR, OL, W / 2 + FR / 2, 0);
    for (const sg of [1, -1]) {
      const seg = (W - GW) / 2; wall(seg, FR, -(GW / 2 + seg / 2), sg * (L / 2 + FR / 2)); wall(seg, FR, GW / 2 + seg / 2, sg * (L / 2 + FR / 2));
      // the goal: an open slot in the end wall, a dark pocket behind it (a box with a black floor) that catches the puck
      const hole = new TT.Mesh(new TT.BoxGeometry(GW * K, .1 * K, (FR + 4) * K), BM.hole); hole.position.set(0, TOP + .004, sg * (L / 2 + FR / 2 + 2) * K); g.add(hole);
      for (const sx of [-1, 1]) { const w = new TT.Mesh(new TT.BoxGeometry(.8 * K, 1.4 * K, 4 * K), BM.frame); w.position.set(sx * (GW / 2 + .4) * K, TOP - .1 * K, sg * (L / 2 + FR + 2) * K); w.castShadow = true; g.add(w); }
      const back = new TT.Mesh(new TT.BoxGeometry((GW + 1.6) * K, 1.4 * K, .8 * K), BM.frame); back.position.set(0, TOP - .1 * K, sg * (L / 2 + FR + 4) * K); back.castShadow = true; g.add(back);
    }
    if (BM.strip) for (const sg of [1, -1]) { const s = new TT.Mesh(new TT.BoxGeometry(.25 * K, .25 * K, OL * K), BM.strip); s.position.set(sg * (W / 2 + FR) * K, TOP + (WH - .6) * K, 0); g.add(s); }
    // (2026-11-10) a solid plinth under the whole tray and under both goal pockets, down to the table: no gap to see through
    const ph = TOP - .6 * K - .004, plinth = new TT.Mesh(new TT.BoxGeometry(OW * K - .03, ph, OL * K - .03), BM.frame); plinth.position.y = ph / 2; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
    for (const sg of [1, -1]) { const pk = TOP - .8 * K - .004, b = new TT.Mesh(new TT.BoxGeometry((GW + 1.6) * K - .03, pk, 4.58 * K), BM.frame); b.position.set(0, pk / 2, sg * (L / 2 + FR + 2.09) * K); b.castShadow = true; g.add(b); }
    const U = g.userData;
    U.top = TOP; U.K = K; U.look = look; U.mats = BM; U.W = W; U.L = L; U.OW = OW; U.OL = OL;
    U.xz = (x, y) => [x * K, y * K];
    U.mallet = side => mallet(look, side); U.puck = () => puck(look); U.monster = i => monster(look, i); U.item = k => item(look, k);
    U.bar = () => bar(look); U.bumper = () => bumper(look); U.portal = k => portal(look, k); U.shield = () => shield(look);
    U.dot = side => COL[look][side];
    return g;
  }

  X.MODELS.hockey = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: both mallets and a puck in play
    const U = g.userData;
    const put = (m, x, y) => { const [a, b] = U.xz(x, y); m.position.set(a, TOP, b); g.add(m); };
    put(U.mallet(0), 4, 20); put(U.mallet(1), -6, -21); put(U.puck(), 7, -4);
    // (2026-11-10) the room view shows the boards' light shows too: neon's colours keep cycling; space twinkles (three layers of
    // stars blinking out of step) and its rim light breathes. Run from the field's onBeforeRender (only while it is drawn).
    if (look === 'neon' || look === 'space') {
      const TT = T(), BM = U.mats, f = g.children[0], stars = [];
      if (look === 'space') {
        const R = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(4242);
        for (let l = 0; l < 3; l++) {
          const pos = []; for (let i = 0; i < 46; i++) { const [a, b] = U.xz((R() - .5) * (W - 2), (R() - .5) * (L - 2)); pos.push(a, TOP + .006 + l * .002, b); }
          const gm = new TT.BufferGeometry(); gm.setAttribute('position', new TT.Float32BufferAttribute(pos, 3));
          const pm = new TT.Points(gm, new TT.PointsMaterial({ color: [0xffffff, 0xc9b8ff, 0x9fe8ff][l], size: [.05, .035, .07][l], transparent: true, opacity: .8, blending: TT.AdditiveBlending, depthWrite: false }));
          g.add(pm); stars.push(pm);
        }
      }
      const c = new TT.Color(), w = new TT.Color();
      f.onBeforeRender = () => {
        const now = performance.now();
        if (look === 'neon') { c.setHSL((now / 2600) % 1, 1, .55); if (BM.strip) BM.strip.emissive.copy(c); w.setRGB(1, 1, 1).lerp(c, .55).multiplyScalar(.8); BM.field.emissive.copy(w); }
        else { stars.forEach((pm, l) => { pm.material.opacity = .25 + .75 * Math.pow(.5 + .5 * Math.sin(now / (380 + l * 170) + l * 2.1), 2); }); if (BM.strip) BM.strip.emissive.setHSL(.72 + Math.sin(now / 1400) * .06, 1, .55); BM.field.emissive.setScalar(.72 + Math.sin(now / 900) * .06); }
        if (X.kick) X.kick(60);   // (keep the frames coming while the board is on view)
      };
    }
    return g;
  };
  X.hockey = { board, LOOKS, K };
})();
