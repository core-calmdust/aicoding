/* =====================================================================
   Futebol de Botão on the 3D table — six tables (Table3D.BOARDS.botao, chosen in the portal's 盤 row and before a game):
   · 'classic'  (the default) the Brazilian club table: a green Celotex top (the fibreboard the game was first named after —
                "Foot-Ball Celotex", 1930) painted green with white markings, a varnished imbuia rail. Glossy acrylic buttons:
                red with a white crest for you, white with a navy crest for the far side; white goals with a white net.
   · 'retro'    the 1950s home table: a faded olive top with hand-painted cream lines, a cream border with a double line,
                a pine rail. The buttons are real coat buttons — bone and horn, four holes each.
   · 'night'    a night game: a mowed lawn in stripes under floodlights (a soft glow at the corners), bright lines, a black
                rail with a white edge. Canary-yellow and royal-blue buttons.
   · 'praia'    Copacabana: a sand pitch with blue rope lines, the runs round it laid in the black-and-white wave mosaic of
                the Copacabana promenade. Coral and teal buttons.
   · 'madeira'  wood: a pale maple top in long planks with walnut inlay lines, a walnut rail. Rosewood and ebony buttons.
   · 'neon'     the night board of carrom carried over: black with lines glowing in a flowing rainbow, glowing buttons.
   Field coordinates as in botao/engine.js (cm; x across, y along; side 0 defends y = +H, the near end).
   Registers: Table3D.MODELS.botao(live, look), Table3D.botao = { board, LOOKS, K }
   userData: { top, K, look, xz(x, y), button(side, n) → Group, ball() → Group, keeper(side) → Group, dot(side) → css colour,
               W, L (table, world) }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const E = () => window.BotaoEngine;
  const FW = 104, FL = 167, HW = FW / 2, H = FL / 2, PS = 8, PE = 10, TX = HW + PS, TY = H + PE, GW = 15, GHW = GW / 2, GD = 5, GH = 5;
  const RB = 2.4, RBALL = .8, KHW = 4, KHD = 1.75, KH = 1.6, BH = .75;
  const FR = 3, RAILH = 2.2;   // the rail round the table (width, height above the top), cm
  const K = .066, TOP = .3;
  const LOOKS = ['classic', 'retro', 'night', 'praia', 'madeira', 'neon'];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; delete p.sheen; delete p.sheenColor; delete p.sheenRoughness; return new TT.MeshStandardMaterial(p); }
    const phy = p.clearcoat !== undefined || p.sheen !== undefined;
    if (p.sheenColor !== undefined) p.sheenColor = lin(p.sheenColor);
    return new TT[phy ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const geos = {}, share = g => { if (X.share) X.share(g); return g; }, geo = (k, f) => geos[k] || (geos[k] = share(f()));
  const lookNow = () => X.BOARDS && X.BOARDS.botao ? X.BOARDS.botao.get() : 'classic';
  // the two sides' colours per table: [body, crest ground, crest ink]
  const TEAM = {
    classic: [['#d4352a', '#ffffff', '#d4352a'], ['#f3f1ea', '#1d3b78', '#ffffff']],
    retro: [['#eadcc0', '#d9c8a4', '#7a5a38'], ['#5b3a22', '#3e2616', '#d9b98a']],
    night: [['#f5c518', '#1c8a3c', '#f5c518'], ['#2350c4', '#ffffff', '#2350c4']],
    praia: [['#ff7442', '#fff4e0', '#ff7442'], ['#15a3a6', '#fff4e0', '#15a3a6']],
    madeira: [['#9c3b26', '#e8cf9c', '#6a2414'], ['#22262c', '#c9b07a', '#1a1c20']],
    neon: [['#ff3fb4', '#120f1c', '#ff3fb4'], ['#3ce6ff', '#0c1420', '#3ce6ff']],
  };
  const DOT = { classic: ['#d4352a', '#e9e6dc'], retro: ['#e3d3b0', '#5b3a22'], night: ['#f5c518', '#2350c4'], praia: ['#ff7442', '#15a3a6'], madeira: ['#9c3b26', '#22262c'], neon: ['#ff3fb4', '#3ce6ff'] };

  /* ---------- the table top: the field and the runs round it, in table centimetres (2·TX × 2·TY) ---------- */
  const TW = 2 * TX, TL = 2 * TY;
  function topTex(look) {
    const S = SZ(1024), Hh = Math.round(S * TL / TW);
    return X.canvasTex('btTop' + look + S, S, Hh, (g) => {
      const u = S / TW, X0 = cm => (cm + TX) * u, Y0 = cm => (cm + TY) * u;
      const N = X.makeNoise(look.length * 31 + 7), img = g.createImageData(S, Hh), d = img.data;
      const rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(look.length * 977 + 13);
      // the ground: [inside the lines, the runs outside]
      const GR = { classic: [[46, 122, 58], [38, 102, 48]], retro: [[112, 132, 78], [228, 214, 182]], night: [[44, 128, 58], [30, 90, 42]], praia: [[226, 202, 150], [236, 232, 222]], madeira: [[224, 196, 150], [104, 66, 38]], neon: [[10, 11, 20], [6, 6, 12]] }[look];
      for (let y = 0; y < Hh; y++) for (let x = 0; x < S; x++) {
        const cx = x / u - TX, cy = y / u - TY, inF = Math.abs(cx) <= HW && Math.abs(cy) <= H, b = inF ? GR[0] : GR[1];
        let k = (Math.random() - .5) * 8 + (N(x / 3, y / 3, 2) - .5) * 14 + (N(x / 70, y / 70, 3) - .5) * 12;
        if (look === 'night' && inF) k += (Math.floor((cy + H) / 13.9) % 2 ? 9 : -6) + (N(x / 1.5, y / 40, 4) - .5) * 10;   // the mowing stripes
        if (look === 'retro') k += (N(x / 160, y / 160, 6) - .5) * 30 + (N(x / 9, y / 9, 7) > .82 ? -12 : 0);   // old paint, stains
        if (look === 'praia' && inF) k = (Math.random() - .5) * 26 + (N(x / 4, y / 4, 2) - .5) * 18;   // sand grain
        if (look === 'madeira') { const plank = Math.floor((cx + TX) / (inF ? 9.5 : 4)), w = N(plank * 13.1 + x / 900, y / 7, 5); k = (w - .5) * 22 + (N(plank, 0, 9) - .5) * 26 + (Math.random() - .5) * 5; }
        const i = (y * S + x) * 4; d[i] = b[0] + k; d[i + 1] = b[1] + k; d[i + 2] = b[2] + k * (look === 'praia' ? .8 : 1.05); d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      // the Copacabana waves on the runs (black on white)
      if (look === 'praia') {
        g.save(); g.beginPath(); g.rect(0, 0, S, Hh); g.rect(X0(-HW), Y0(-H), FW * u, FL * u); g.clip('evenodd');
        g.fillStyle = '#1b1b1d';
        const per = 9, amp = 2.6;
        for (let band = -TY - 6; band < TY + 6; band += per) {
          g.beginPath();
          for (let x = -TX; x <= TX + .5; x += .5) g.lineTo(X0(x), Y0(band + Math.sin((x + band * .7) / per * Math.PI * 2) * amp));
          for (let x = TX; x >= -TX - .5; x -= .5) g.lineTo(X0(x), Y0(band + per / 2 + Math.sin((x + band * .7) / per * Math.PI * 2) * amp));
          g.closePath(); g.fill();
        }
        // the mosaic's stones: a fine net of grout
        g.strokeStyle = 'rgba(120,118,112,.35)'; g.lineWidth = .06 * u;
        for (let y = -TY; y < TY; y += .9) for (let x = -TX + (Math.round(y / .9) % 2) * .45; x < TX; x += .9) { g.strokeRect(X0(x), Y0(y), .9 * u, .9 * u); }
        g.restore();
      }
      if (look === 'night') {   // the floodlights' pools at the corners
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = X0(sx * HW), y = Y0(sy * H), r = 70 * u, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,235,.16)'); gr.addColorStop(1, 'rgba(255,255,235,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
      }
      if (look === 'neon') {   // a faint grid
        g.strokeStyle = 'rgba(60,230,255,.07)'; g.lineWidth = .1 * u;
        for (let x = -HW; x <= HW; x += 8) { g.beginPath(); g.moveTo(X0(x), Y0(-H)); g.lineTo(X0(x), Y0(H)); g.stroke(); }
        for (let y = -H; y <= H; y += 8) { g.beginPath(); g.moveTo(X0(-HW), Y0(y)); g.lineTo(X0(HW), Y0(y)); g.stroke(); }
      }
      // the markings
      const INK = { classic: 'rgba(250,252,248,.94)', retro: 'rgba(246,236,210,.92)', night: 'rgba(255,255,255,.97)', praia: '#1f5fae', madeira: '#4a2a16', neon: '#3ce6ff' }[look];
      const INK2 = look === 'neon' ? '#ff3fb4' : INK, lw = look === 'praia' ? .55 : look === 'retro' ? .42 : .35;
      const glow = c => { if (look === 'neon') { g.shadowColor = c; g.shadowBlur = 1.1 * u; } else g.shadowBlur = 0; };
      const wob = look === 'retro' ? () => (rnd() - .5) * .12 : () => 0;   // hand-painted lines
      const stroke = (c, w, f) => { glow(c); g.strokeStyle = c; g.lineWidth = (w || lw) * u; g.lineCap = 'round'; g.beginPath(); f(); g.stroke(); };
      const ln = (x0, y0, x1, y1, c, w) => stroke(c || INK, w, () => { const n = look === 'retro' ? 16 : 1; for (let k = 0; k <= n; k++) { const t = k / n; g.lineTo(X0(x0 + (x1 - x0) * t + wob()), Y0(y0 + (y1 - y0) * t + wob())); } });
      const arc = (x, y, r, a0, a1, c, w) => stroke(c || INK, w, () => g.arc(X0(x), Y0(y), r * u, a0, a1));
      const dot = (x, y, r, c) => { glow(c || INK); g.fillStyle = c || INK; g.beginPath(); g.arc(X0(x), Y0(y), r * u, 0, 7); g.fill(); };
      // half by half (neon: each half its own colour)
      for (const sg of [1, -1]) {
        const c = sg > 0 ? INK : INK2;
        ln(-HW, 0, -HW, sg * H, c); ln(HW, 0, HW, sg * H, c); ln(-HW, sg * H, HW, sg * H, c);
        const by = sg * (H - 30), sy = sg * (H - 11);
        ln(-30, sg * H, -30, by, c); ln(30, sg * H, 30, by, c); ln(-30, by, 30, by, c);
        ln(-15, sg * H, -15, sy, c); ln(15, sg * H, 15, sy, c); ln(-15, sy, 15, sy, c);
        dot(0, sg * (H - 20.5), .55, c);
        // the arc outside the big area (16 cm round the penalty mark)
        const py = sg * (H - 20.5), dy = Math.abs(by - py), a = Math.acos(Math.min(1, dy / 16));
        arc(0, py, 16, sg > 0 ? -Math.PI / 2 - a : Math.PI / 2 - a, sg > 0 ? -Math.PI / 2 + a : Math.PI / 2 + a, c);
        for (const sx of [-1, 1]) arc(sx * HW, sg * H, 3, sx > 0 ? (sg > 0 ? Math.PI : Math.PI / 2) : (sg > 0 ? -Math.PI / 2 : 0), sx > 0 ? (sg > 0 ? Math.PI * 1.5 : Math.PI) : (sg > 0 ? 0 : Math.PI / 2), c);
      }
      ln(-HW, 0, HW, 0, INK); arc(0, 0, 16, 0, Math.PI * 2, INK); dot(0, 0, .6, INK);
      if (look === 'retro') {   // the border's double line, a little crest of the maker at the side
        g.shadowBlur = 0; g.strokeStyle = 'rgba(120,96,60,.75)'; g.lineWidth = .3 * u; g.strokeRect(X0(-TX + 1.6), Y0(-TY + 1.6), (TW - 3.2) * u, (TL - 3.2) * u); g.lineWidth = .14 * u; g.strokeRect(X0(-TX + 2.6), Y0(-TY + 2.6), (TW - 5.2) * u, (TL - 5.2) * u);
      }
      if (look === 'madeira') {   // a walnut stringer round the field
        g.shadowBlur = 0; g.strokeStyle = 'rgba(232,206,160,.8)'; g.lineWidth = .25 * u; g.strokeRect(X0(-HW - 2), Y0(-H - 2), (FW + 4) * u, (FL + 4) * u);
      }
      g.shadowBlur = 0;
    });
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    return mat('btm' + look, () => {
      const TT = T(), neon = look === 'neon';
      const top = phys({ map: topTex(look), color: '#ffffff', roughness: look === 'madeira' ? .42 : look === 'praia' ? .95 : neon ? .5 : .88, metalness: 0, clearcoat: look === 'madeira' ? .6 : undefined, clearcoatRoughness: look === 'madeira' ? .35 : undefined });
      if (neon) { top.emissiveMap = top.map; top.emissive = new TT.Color(.8, .8, .8); }
      let rail;
      if (look === 'classic') { const w = X.wood('btImbuia', '#7a4a26', '#3e2412', SZ(1024), SZ(256), .9); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .38, clearcoat: .8, clearcoatRoughness: .25 }); }
      else if (look === 'retro') { const w = X.wood('btPine', '#d8b47c', '#a87a44', SZ(1024), SZ(256), .7); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .6 }); }
      else if (look === 'madeira') { const w = X.wood('btWalnut', '#5c3a22', '#2e1a0e', SZ(1024), SZ(256), .85); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .35, clearcoat: .9, clearcoatRoughness: .2 }); }
      else if (look === 'night') rail = phys({ color: '#141518', roughness: .3, clearcoat: 1, clearcoatRoughness: .15 });
      else if (look === 'praia') rail = phys({ color: '#f4efe4', roughness: .45, clearcoat: .6 });
      else rail = phys({ color: '#0d0e18', roughness: .25, clearcoat: 1, clearcoatRoughness: .1 });
      const edge = look === 'night' ? phys({ color: '#f4f4f4', roughness: .4 }) : look === 'praia' ? phys({ color: '#1f5fae', roughness: .4 }) : neon ? (() => { const m = phys({ color: '#000000' }); m.emissive = new TT.Color(0x3ce6ff); m.emissiveIntensity = 1.5; return m; })() : null;
      const post = phys({ color: neon ? '#e8f8ff' : look === 'madeira' ? '#efe2c4' : '#f8f8f6', roughness: .3, metalness: look === 'madeira' ? 0 : .1, clearcoat: .6 });
      if (neon) { post.emissive = lin('#ff3fb4'); post.emissiveIntensity = .5; }
      const netTex = X.canvasTex('btNet' + (neon ? 'n' : ''), 128, 128, (g, S) => { g.clearRect(0, 0, S, S); g.strokeStyle = neon ? 'rgba(255,120,220,.95)' : 'rgba(255,255,255,.95)'; g.lineWidth = 6; for (let k = 0; k <= 4; k++) { const p = k * S / 4; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); } });
      netTex.wrapS = netTex.wrapT = TT.RepeatWrapping; netTex.repeat.set(5, 2);
      const net = new TT.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: .3, side: TT.DoubleSide, roughness: .9, depthWrite: true });
      const under = phys({ color: { classic: '#3e2412', retro: '#a87a44', night: '#101114', praia: '#d9d2c2', madeira: '#2e1a0e', neon: '#0a0a12' }[look], roughness: .7 });
      return { top, rail, edge, post, net, under };
    });
  }

  /* ---------- the pieces ---------- */
  // a button: a bevelled disc, a shallow dish on top with the crest sticker (number), the rim in the side's colour
  function crestTex(look, side, n) {
    return X.canvasTex('btCrest' + look + side + '_' + n, 128, 128, (g, S) => {
      const [body, gr, ink] = TEAM[look][side], c = S / 2;
      g.clearRect(0, 0, S, S);
      if (look === 'retro') {   // a coat button: four holes and a sewing groove
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * .78, 0, 7); g.stroke();
        g.fillStyle = 'rgba(20,12,6,.75)'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(c + dx * S * .12, c + dy * S * .12, S * .065, 0, 7); g.fill(); }
        g.fillStyle = ink; g.font = `900 ${S * .2}px "Fredoka", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), c, c + S * .33);
        return;
      }
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill();
      g.strokeStyle = ink; g.lineWidth = S * .07; g.beginPath(); g.arc(c, c, c * .86, 0, 7); g.stroke();
      // a little shield behind the number
      g.fillStyle = ink; g.globalAlpha = .16; g.beginPath(); g.moveTo(c - S * .28, c - S * .3); g.lineTo(c + S * .28, c - S * .3); g.lineTo(c + S * .28, c + S * .04); g.quadraticCurveTo(c + S * .26, c + S * .26, c, c + S * .36); g.quadraticCurveTo(c - S * .26, c + S * .26, c - S * .28, c + S * .04); g.closePath(); g.fill(); g.globalAlpha = 1;
      if (look === 'neon') { g.shadowColor = ink; g.shadowBlur = 10; }
      g.fillStyle = ink; g.font = `900 ${S * .46}px "Fredoka", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), c, c + S * .03);
      g.shadowBlur = 0; g.fillStyle = ink; for (const dx of [-.16, 0, .16]) { const x = c + dx * S, y = c - S * .33; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? S * .016 : S * .04; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.fill(); }
    });
  }
  function buttonGeo() {
    return geo('btBtn' + (LO() ? 'l' : ''), () => {
      const TT = T(), r = RB * K, h = BH * K, pts = [[0, h * .72], [r * .78, h * .82], [r * .9, h], [r * .97, h * .96], [r, h * .78], [r, h * .2], [r * .96, 0], [0, 0]].reverse().map(([a, b]) => new TT.Vector2(a, b));
      return new TT.LatheGeometry(pts, LO() ? 22 : 34);
    });
  }
  function button(look, side, n) {
    const TT = T(), g = new TT.Group(), neon = look === 'neon', [body] = TEAM[look][side];
    const bm = mat('btBody' + look + side, () => { const m = phys({ color: body, roughness: look === 'retro' ? .5 : look === 'madeira' ? .3 : .16, clearcoat: look === 'retro' ? .3 : 1, clearcoatRoughness: .12 }); if (neon) { m.emissive = lin(body); m.emissiveIntensity = .55; } return m; });
    const b = new TT.Mesh(buttonGeo(), bm); b.castShadow = true; g.add(b);
    const cm = mat('btCrestM' + look + side + '_' + n, () => { const m = new TT.MeshStandardMaterial({ map: crestTex(look, side, n), transparent: true, roughness: .35 }); if (neon) { m.emissiveMap = m.map; m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = .9; } return m; });
    const cr = new TT.Mesh(geo('btCrestG', () => { const q = new TT.CircleGeometry(RB * K * .74, 30); q.rotateX(-Math.PI / 2); return q; }), cm); cr.position.y = BH * K * .74 + .0015; g.add(cr);
    g.userData = { side, n, r: RB, body: b, mat: bm };
    return g;
  }
  function ball(look) {
    const TT = T(), g = new TT.Group();
    const m = mat('btBall' + look, () => { const q = phys({ color: look === 'night' ? '#fff8d8' : look === 'praia' ? '#ffe14a' : look === 'neon' ? '#ffffff' : '#f6f3ea', roughness: .95 }); if (look === 'neon') { q.emissive = lin('#ffffff'); q.emissiveIntensity = .7; } return q; });
    const s = new TT.Mesh(geo('btBallG', () => new TT.SphereGeometry(RBALL * K, LO() ? 12 : 18, LO() ? 9 : 14)), m); s.position.y = RBALL * K; s.castShadow = true; g.add(s);
    g.userData = { r: RBALL };
    return g;
  }
  // the goalkeeper: a block 8 × 3.5 × 1.6 cm in the side's colour, the number 1 on its back
  function keeper(look, side) {
    const TT = T(), g = new TT.Group(), [body, gr, ink] = TEAM[look][side], neon = look === 'neon';
    const bm = mat('btKeep' + look + side, () => { const m = phys({ color: body, roughness: look === 'retro' ? .55 : .22, clearcoat: look === 'retro' ? .2 : .9, clearcoatRoughness: .15 }); if (neon) { m.emissive = lin(body); m.emissiveIntensity = .5; } return m; });
    const box = new TT.Mesh(geo('btKeepG', () => { const q = new TT.BoxGeometry(2 * KHW * K, KH * K, 2 * KHD * K, 1, 1, 1); return q; }), bm); box.position.y = KH * K / 2; box.castShadow = true; g.add(box);
    const lab = mat('btKeepL' + look + side, () => { const m = new TT.MeshStandardMaterial({ map: X.canvasTex('btKeepT' + look + side, 256, 112, (c, S) => { c.fillStyle = gr; c.fillRect(0, 0, S, 112); c.strokeStyle = ink; c.lineWidth = 10; c.strokeRect(5, 5, S - 10, 102); c.fillStyle = ink; c.font = '900 84px "Fredoka", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', S / 2, 60); }), roughness: .4 }); if (neon) { m.emissiveMap = m.map; m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = .8; } return m; });
    const top = new TT.Mesh(geo('btKeepTop', () => { const q = new TT.PlaneGeometry(2 * KHW * K * .9, 2 * KHD * K * .8); q.rotateX(-Math.PI / 2); return q; }), lab); top.position.y = KH * K + .0015; g.add(top);
    g.userData = { side, box, mat: bm };
    return g;
  }

  /* ---------- the table ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look), OW = TW + 2 * FR, OL = TL + 2 * FR;
    const top = new TT.Mesh(geo('btTopG', () => { const q = new TT.PlaneGeometry(TW * K, TL * K); q.rotateX(-Math.PI / 2); return q; }), BM.top); top.position.y = TOP; top.receiveShadow = true; g.add(top);
    // the body of the table under the top, down to the table it stands on
    const body = new TT.Mesh(geo('btBody', () => new TT.BoxGeometry(OW * K - .02, TOP - .004, OL * K - .02)), BM.under); body.position.y = (TOP - .004) / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    // the rail: four rounded bars
    const railGeo = len => new TT.BoxGeometry(FR * K, (RAILH + 1) * K, len * K);
    const rl = (w, len, x, z, rot) => { const m = new TT.Mesh(geos['btRail' + len] || (geos['btRail' + len] = share(railGeo(len))), BM.rail); m.position.set(x * K, TOP + (RAILH - 1) * K / 2, z * K); if (rot) m.rotation.y = Math.PI / 2; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    rl(FR, OL, -(TX + FR / 2), 0); rl(FR, OL, TX + FR / 2, 0); rl(FR, TW, 0, -(TY + FR / 2), true); rl(FR, TW, 0, TY + FR / 2, true);
    if (BM.edge) { for (const sx of [-1, 1]) { const e = new TT.Mesh(geo('btEdgeL', () => new TT.BoxGeometry(.35 * K, .3 * K, OL * K)), BM.edge); e.position.set(sx * (TX + FR * .5) * K, TOP + (RAILH + .02) * K, 0); g.add(e); } for (const sz of [-1, 1]) { const e = new TT.Mesh(geo('btEdgeW', () => new TT.BoxGeometry(OW * K, .3 * K, .35 * K)), BM.edge); e.position.set(0, TOP + (RAILH + .02) * K, sz * (TY + FR * .5) * K); g.add(e); } }
    // the goals: two posts, a crossbar, the net (back, sides, roof) behind the line
    for (const sg of [1, -1]) {
      const gy = sg * H;
      for (const sx of [-1, 1]) { const p = new TT.Mesh(geo('btPost', () => new TT.CylinderGeometry(.35 * K, .35 * K, GH * K, 12)), BM.post); p.position.set(sx * GHW * K, TOP + GH * K / 2, gy * K); p.castShadow = true; g.add(p); }
      const bar = new TT.Mesh(geo('btBar', () => { const q = new TT.CylinderGeometry(.35 * K, .35 * K, GW * K, 12); q.rotateZ(Math.PI / 2); return q; }), BM.post); bar.position.set(0, TOP + GH * K, gy * K); bar.castShadow = true; g.add(bar);
      const back = new TT.Mesh(geo('btNetB', () => new TT.PlaneGeometry(GW * K, GH * K)), BM.net); back.position.set(0, TOP + GH * K / 2, (gy + sg * GD) * K); g.add(back);
      const roof = new TT.Mesh(geo('btNetR', () => { const q = new TT.PlaneGeometry(GW * K, GD * K); q.rotateX(Math.PI / 2); return q; }), BM.net); roof.position.set(0, TOP + GH * K, (gy + sg * GD / 2) * K); g.add(roof);
      for (const sx of [-1, 1]) { const sd = new TT.Mesh(geo('btNetS', () => { const q = new TT.PlaneGeometry(GD * K, GH * K); q.rotateY(Math.PI / 2); return q; }), BM.net); sd.position.set(sx * GHW * K, TOP + GH * K / 2, (gy + sg * GD / 2) * K); g.add(sd); }
      // the frame on the table behind the net
      for (const sx of [-1, 1]) { const f = new TT.Mesh(geo('btGFs', () => new TT.BoxGeometry(.5 * K, .5 * K, GD * K)), BM.post); f.position.set(sx * GHW * K, TOP + .25 * K, (gy + sg * GD / 2) * K); g.add(f); }
      const fb = new TT.Mesh(geo('btGFb', () => new TT.BoxGeometry(GW * K, .5 * K, .5 * K)), BM.post); fb.position.set(0, TOP + .25 * K, (gy + sg * GD) * K); g.add(fb);
    }
    if (look === 'neon') top.userData.keep = true;
    const U = g.userData;
    U.top = TOP; U.K = K; U.look = look; U.mats = BM; U.W = OW * K; U.L = OL * K;
    U.xz = (x, y) => [x * K, y * K];
    U.button = (side, n) => button(look, side, n); U.ball = () => ball(look); U.keeper = side => keeper(look, side);
    U.dot = side => DOT[look][side];
    return g;
  }

  X.MODELS.botao = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: both sides lined up, the ball at the kick-off spot, the keepers in their goals
    const U = g.userData, En = E();
    let st = null; try { st = En ? En.newMatch({ first: 0 }) : null; } catch (e) { st = null; }
    const put = (m, x, y) => { const [a, b] = U.xz(x, y); m.position.set(a, TOP, b); g.add(m); const sh = X.contact((m.userData.r || 3) * K * 1.2, .38); sh.position.set(a, TOP + .003, b); g.add(sh); };
    if (st) { st.b.forEach((b, i) => put(U.button(i < 10 ? 0 : 1, (i % 10) + 2), b.x, b.y)); put(U.ball(), 0, 0); st.k.forEach((k, t) => put(U.keeper(t), k.x, k.y)); }
    if (look === 'neon') { const BM = U.mats, c = new (T().Color)(); g.children[0].onBeforeRender = () => { c.setHSL((performance.now() / 2600) % 1, 1, .6); BM.top.emissive.setRGB(.8, .8, .8).lerp(c, .4); if (X.kick) X.kick(60); }; }
    return g;
  };
  X.botao = { board, LOOKS, K, TEAM };
})();
