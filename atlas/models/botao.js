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
   · 'neon'     8-bit (2026-11-16 ユーザー：ネオン台＆駒を8bitのレトロゲームをモチーフに; the id stays 'neon' for saved choices):
                the pitch of an old home-console football game — chunky pixels (1 px = 1 cm, drawn without smoothing), two greens
                in stripes, white pixel lines, a pixel crowd in the stands round it, a brick rail; octagonal buttons in the
                console palette (red / blue) with pixel numbers, a blocky ball, square trails (atlas/games/botao.js).
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
  const RB = 3, RBALL = 1.3, KHW = 4, KHD = 1.75, KH = 1.6, BH = .85;   // (the engine's sizes: 2.4 / .8 at first)
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
    neon: [['#f83800', '#fcfcfc', '#a81000'], ['#0078f8', '#fcfcfc', '#0040b0']],
  };
  const DOT = { classic: ['#d4352a', '#e9e6dc'], retro: ['#e3d3b0', '#5b3a22'], night: ['#f5c518', '#2350c4'], praia: ['#ff7442', '#15a3a6'], madeira: ['#9c3b26', '#22262c'], neon: ['#f83800', '#0078f8'] };

  /* ---------- 8-bit (the 'neon' look): pixel textures, shown without smoothing ---------- */
  const NES = { k: '#000000', w: '#fcfcfc', g1: '#00a800', g2: '#00b800', red: '#f83800', red2: '#a81000', blue: '#0078f8', blue2: '#0040b0', y: '#f8b800', o: '#fca044', br: '#c84c0c', gr: '#7c7c7c', sk: '#fcbcb0', p: '#d800cc' };
  const PIX = t => { const TT = T(); t.magFilter = TT.NearestFilter; t.minFilter = TT.NearestMipmapLinearFilter; t.needsUpdate = true; return t; };
  const FONT = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];   // 3×5 digits
  function pixNum(g, n, x, y, s, c) { g.fillStyle = c; String(n).split('').forEach((ch, j) => { const b = FONT[+ch] || ''; for (let k = 0; k < 15; k++) if (b[k] === '1') g.fillRect(x + (j * 4 + k % 3) * s, y + Math.floor(k / 3) * s, s, s); }); }
  const TW = 2 * TX, TL = 2 * TY;
  function pixTop() {   // 1 px = 1 cm: the stands (a pixel crowd) round two greens in stripes, white pixel lines
    const S = Math.round(TW), Hh = Math.round(TL);
    return PIX(X.canvasTex('bt8Top', S, Hh, (g) => {
      g.imageSmoothingEnabled = false;
      const ox = TX, oy = TY, rnd = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(4242);
      const P = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x + ox), Math.round(y + oy), 1, 1); };
      // the stands: rows of fans (a head and a shirt) on dark steps
      g.fillStyle = '#20202c'; g.fillRect(0, 0, S, Hh);
      const shirts = [NES.red, NES.blue, NES.y, NES.w, NES.o, NES.p, NES.red, NES.blue];
      for (let y = 0; y < Hh; y += 3) for (let x = (y / 3) % 2; x < S; x += 2) { if (rnd() < .18) continue; g.fillStyle = NES.sk; g.fillRect(x, y, 1, 1); g.fillStyle = shirts[(rnd() * shirts.length) | 0]; g.fillRect(x, y + 1, 1, 1); }
      // the pitch: stripes of two greens across, 12 cm each
      for (let y = -H; y < H; y++) { g.fillStyle = Math.floor((y + H) / 12) % 2 ? NES.g1 : NES.g2; g.fillRect(ox - HW, y + oy, FW, 1); }
      // a one-pixel black line between the stands and the pitch (the sprite outline)
      g.fillStyle = NES.k; g.fillRect(ox - HW - 2, oy - H - 2, FW + 4, 1); g.fillRect(ox - HW - 2, oy + H + 1, FW + 4, 1); g.fillRect(ox - HW - 2, oy - H - 2, 1, FL + 4); g.fillRect(ox + HW + 1, oy - H - 2, 1, FL + 4);
      // the markings: one pixel wide, white
      const W = NES.w, hl = (x0, x1, y) => { for (let x = Math.round(x0); x <= Math.round(x1); x++) P(x, y, W); }, vl = (x, y0, y1) => { const a = Math.min(y0, y1), b = Math.max(y0, y1); for (let y = Math.round(a); y <= Math.round(b); y++) P(x, y, W); };
      const circ = (cx, cy, r, keep) => { for (let a = 0; a < 720; a++) { const t = a / 720 * Math.PI * 2, x = cx + Math.cos(t) * r, y = cy + Math.sin(t) * r; if (!keep || keep(x, y)) P(Math.round(x), Math.round(y), W); } };
      hl(-HW, HW - 1, -H); hl(-HW, HW - 1, H - 1); vl(-HW, -H, H - 1); vl(HW - 1, -H, H - 1); hl(-HW, HW - 1, 0);
      circ(0, 0, 16); for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) P(dx, dy, W);
      for (const sg of [1, -1]) {
        const ey = sg > 0 ? H - 1 : -H, by = sg * (H - 30), sy = sg * (H - 11), py = sg * (H - 20.5);
        vl(-30, ey, by); vl(29, ey, by); hl(-30, 29, Math.round(by));
        vl(-15, ey, sy); vl(14, ey, sy); hl(-15, 14, Math.round(sy));
        P(0, Math.round(py), W); P(-1, Math.round(py), W);
        circ(0, py, 16, (x, y) => sg > 0 ? y < by - .5 : y > by + .5);
      }
      // a scoreboard in each end stand: 1P 0 - 0 2P in the console's pixel digits
      for (const sg of [1, -1]) { const y = sg > 0 ? Hh - 8 : 3, x0 = ox + sg * 30 - 12; g.fillStyle = NES.k; g.fillRect(x0 - 2, y - 1, 29, 7); pixNum(g, 1, x0, y, 1, NES.red); pixNum(g, 0, x0 + 6, y, 1, NES.w); g.fillStyle = NES.w; g.fillRect(x0 + 11, y + 2, 2, 1); pixNum(g, 0, x0 + 15, y, 1, NES.w); pixNum(g, 2, x0 + 22, y, 1, NES.blue); }   // (beside the goal)
    }));
  }
  function topTex(look) {
    if (look === 'neon') return pixTop();
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
        if (look === 'madeira') {   // (2026-11-17 ユーザー：継ぎ目なし → 木目がきつすぎ → 化粧板っぽく) a sliced veneer sheet: fine, mostly
          // straight grain running the length, low contrast, a soft sheen of figure; no strong rings or pores
          const uu = y / Hh, vv = x / S - .5, A = inF ? [222, 192, 146] : [132, 88, 52], Bc = inF ? [196, 158, 108] : [104, 66, 36];
          const wob = (N(uu * 1.2, vv * 3, 3) - .5) * .05, f = ((vv + wob) * 70) % 1;
          const line = Math.exp(-Math.pow((((f % 1) + 1) % 1 - .5) / .12, 2));
          let tt = .3 + line * .22 + (N(uu * 3, x * .35, 2) - .5) * .22 + (N(uu * 30, x * 1.6, 1) - .5) * .08 + (N(uu * 1.1, vv * 1.4, 4) - .5) * .25;
          tt = Math.max(0, Math.min(1, tt)); const i = (y * S + x) * 4;
          d[i] = A[0] + (Bc[0] - A[0]) * tt; d[i + 1] = A[1] + (Bc[1] - A[1]) * tt; d[i + 2] = A[2] + (Bc[2] - A[2]) * tt; d[i + 3] = 255; continue;
        }
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
      const top = phys({ map: topTex(look), color: '#ffffff', roughness: look === 'madeira' ? .42 : look === 'praia' ? .95 : neon ? 1 : .88, metalness: 0, clearcoat: look === 'madeira' ? .6 : undefined, clearcoatRoughness: look === 'madeira' ? .35 : undefined });
      if (neon) { top.color = new TT.Color(.8, .8, .8); top.emissiveMap = top.map; top.emissive = new TT.Color(.12, .12, .12); }   // (2026-11-17 ユーザー：少し明るすぎ → 抑えめ)   // (8-bit: the screen's own light)
      let rail;
      if (look === 'classic') { const w = X.wood('btImbuia', '#7a4a26', '#3e2412', SZ(1024), SZ(256), .9); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .38, clearcoat: .8, clearcoatRoughness: .25 }); }
      else if (look === 'retro') { const w = X.wood('btPine', '#d8b47c', '#a87a44', SZ(1024), SZ(256), .7); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .6 }); }
      else if (look === 'madeira') { const w = X.wood('btWalnut', '#5c3a22', '#2e1a0e', SZ(1024), SZ(256), .85); w.wrapS = w.wrapT = TT.RepeatWrapping; rail = phys({ map: w, color: '#ffffff', roughness: .35, clearcoat: .9, clearcoatRoughness: .2 }); }
      else if (look === 'night') rail = phys({ color: '#141518', roughness: .3, clearcoat: 1, clearcoatRoughness: .15 });
      else if (look === 'praia') rail = phys({ color: '#f4efe4', roughness: .45, clearcoat: .6 });
      else {   // 8-bit: a brick rail
        const bt = PIX(X.canvasTex('bt8Brick', 16, 8, (g) => { g.fillStyle = NES.k; g.fillRect(0, 0, 16, 8); for (const [y, o] of [[0, 0], [4, 4]]) for (let x = -8; x < 16; x += 8) { g.fillStyle = NES.br; g.fillRect(x + o, y, 7, 3); g.fillStyle = NES.o; g.fillRect(x + o, y, 7, 1); } }));
        bt.wrapS = bt.wrapT = TT.RepeatWrapping; bt.repeat.set(1, 24); rail = phys({ map: bt, color: '#ffffff', roughness: 1 }); rail.emissiveMap = bt; rail.emissive = new TT.Color(.25, .25, .25);
      }
      const edge = look === 'night' ? phys({ color: '#f4f4f4', roughness: .4 }) : look === 'praia' ? phys({ color: '#1f5fae', roughness: .4 }) : neon ? (() => { const m = phys({ color: '#000000', roughness: 1 }); m.emissive = lin(NES.w); m.emissiveIntensity = 1; return m; })() : null;
      const post = phys({ color: neon ? '#e8f8ff' : look === 'madeira' ? '#efe2c4' : '#f8f8f6', roughness: .3, metalness: look === 'madeira' ? 0 : .1, clearcoat: .6 });
      if (neon) { post.color = lin(NES.w); post.roughness = 1; post.emissive = lin(NES.w); post.emissiveIntensity = .2; }
      const netTex = X.canvasTex('btNet' + (neon ? 'n' : ''), 128, 128, (g, S) => { g.clearRect(0, 0, S, S); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = neon ? 16 : 6; for (let k = 0; k <= 4; k++) { const p = k * S / 4; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke(); } });
      netTex.wrapS = netTex.wrapT = TT.RepeatWrapping; netTex.repeat.set(5, 2); if (neon) PIX(netTex);
      const net = new TT.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: .3, side: TT.DoubleSide, roughness: .9, depthWrite: true });
      const under = phys({ color: { classic: '#3e2412', retro: '#a87a44', night: '#101114', praia: '#d9d2c2', madeira: '#2e1a0e', neon: '#000000' }[look], roughness: .7 });
      return { top, rail, edge, post, net, under };
    });
  }

  /* ---------- the pieces ---------- */
  // a button: a bevelled disc, a shallow dish on top with the crest sticker (number), the rim in the side's colour
  function crestTex(look, side, n) {
    const tx = X.canvasTex((look === 'neon' ? 'bt8Crest' : 'btCrest' + look) + side + '_' + n, 128, 128, (g, S) => {
      const [body, gr, ink] = TEAM[look][side], c = S / 2;
      g.clearRect(0, 0, S, S);
      if (look === 'neon') {   // 8-bit: a 16 × 16 sprite — an octagon in the side's colour, a white ring, the number in pixel digits
        const u = S / 16, oct = [[5, 1, 6], [3, 2, 10], [2, 3, 12], [1, 5, 14], [1, 6, 14], [1, 7, 14], [1, 8, 14], [1, 9, 14], [1, 10, 14], [2, 12, 12], [3, 13, 10], [5, 14, 6], [2, 4, 12], [1, 11, 14]];
        g.fillStyle = gr; oct.forEach(([x, y, w]) => g.fillRect(x * u, y * u, w * u, u));
        g.fillStyle = body; [[6, 3, 4], [4, 4, 8], [3, 5, 10], [3, 6, 10], [3, 7, 10], [3, 8, 10], [3, 9, 10], [3, 10, 10], [4, 11, 8], [6, 12, 4]].forEach(([x, y, w]) => g.fillRect(x * u, y * u, w * u, u));
        const t = String(n), w = t.length * 4 - 1; pixNum(g, n, (16 - w) / 2 * u, 5.5 * u, u, NES.w);
        return;
      }
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
    return look === 'neon' ? PIX(tx) : tx;
  }
  function buttonGeo(look) {
    if (look === 'neon') return geo('bt8Btn', () => {   // 8-bit: an octagonal block with a stepped top (no curves)
      const TT = T(), r = RB * K, h = BH * K, pts = [[0, h], [r * .82, h], [r * .82, h * .82], [r, h * .82], [r, 0], [0, 0]].reverse().map(([a, b]) => new TT.Vector2(a, b));
      const q = new TT.LatheGeometry(pts, 8); q.rotateY(Math.PI / 8); return q;
    });
    return geo('btBtn' + (LO() ? 'l' : ''), () => {
      const TT = T(), r = RB * K, h = BH * K, pts = [[0, h * .72], [r * .78, h * .82], [r * .9, h], [r * .97, h * .96], [r, h * .78], [r, h * .2], [r * .96, 0], [0, 0]].reverse().map(([a, b]) => new TT.Vector2(a, b));
      return new TT.LatheGeometry(pts, LO() ? 22 : 34);
    });
  }
  function button(look, side, n) {
    const TT = T(), g = new TT.Group(), neon = look === 'neon', [body] = TEAM[look][side];
    const bm = mat('btBody' + look + side, () => { if (neon) { const m = phys({ color: body, roughness: 1, metalness: 0 }); m.flatShading = true; m.emissive = lin(body); m.emissiveIntensity = .12; return m; } return phys({ color: body, roughness: look === 'retro' ? .5 : look === 'madeira' ? .3 : .16, clearcoat: look === 'retro' ? .3 : 1, clearcoatRoughness: .12 }); });
    const b = new TT.Mesh(buttonGeo(look), bm); b.castShadow = true; g.add(b);
    const cm = mat('btCrestM' + look + side + '_' + n, () => { const m = new TT.MeshStandardMaterial({ map: crestTex(look, side, n), transparent: true, roughness: .35 }); if (neon) { m.roughness = 1; m.emissiveMap = m.map; m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = .4; } return m; });
    const cr = neon ? new TT.Mesh(geo('bt8CrestG', () => { const q = new TT.PlaneGeometry(RB * K * 1.62, RB * K * 1.62); q.rotateX(-Math.PI / 2); return q; }), cm) : new TT.Mesh(geo('btCrestG', () => { const q = new TT.CircleGeometry(RB * K * .74, 30); q.rotateX(-Math.PI / 2); return q; }), cm);
    cr.position.y = (neon ? BH * K : BH * K * .74) + .0015; g.add(cr);
    g.userData = { side, n, r: RB, body: b, mat: bm };
    return g;
  }
  function ball(look) {
    const TT = T(), g = new TT.Group();
    // a football (2026-11-15 ユーザー：ボールもサッカーボールに): black pentagons at the 12 corners of an icosahedron, painted
    // texel by texel on an equirectangular map (the base keeps each look's colour: cream at night, yellow on the beach)
    const m = mat('btBall' + look, () => {
      if (look === 'neon') {   // 8-bit: a blocky ball, white with black pixel patches
        const tex = PIX(X.canvasTex('bt8Ball', 16, 8, (g) => { g.fillStyle = NES.w; g.fillRect(0, 0, 16, 8); g.fillStyle = NES.k; [[1, 1], [5, 3], [9, 1], [13, 3], [3, 5], [7, 6], [11, 5], [15, 6]].forEach(([x, y]) => g.fillRect(x, y, 2, 2)); }));
        const q = phys({ map: tex, color: '#ffffff', roughness: 1 }); q.flatShading = true; q.emissiveMap = tex; q.emissive = lin('#ffffff'); q.emissiveIntensity = .15; return q;
      }
      const base = look === 'night' ? '#fff8d8' : look === 'praia' ? '#ffe14a' : look === 'neon' ? '#ffffff' : '#f6f3ea';
      const tex = X.canvasTex('btBallT' + look, 256, 128, (g, S) => {
        const W = 256, H = 128, im = g.createImageData(W, H), ph = (1 + Math.sqrt(5)) / 2, V = [];
        [[0, 1, ph], [0, -1, ph], [0, 1, -ph], [0, -1, -ph], [1, ph, 0], [-1, ph, 0], [1, -ph, 0], [-1, -ph, 0], [ph, 0, 1], [-ph, 0, 1], [ph, 0, -1], [-ph, 0, -1]].forEach(v => { const l = Math.hypot(...v); V.push(v.map(c => c / l)); });
        const bc = new (T().Color)(base), dark = look === 'neon' ? [255, 63, 180] : [26, 28, 34];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const lon = x / W * 2 * Math.PI, lat = (y / H - .5) * Math.PI, d = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
          let best = -1; for (const v of V) best = Math.max(best, d[0] * v[0] + d[1] * v[1] + d[2] * v[2]);
          const a = Math.acos(Math.min(1, best)), k = (y * W + x) * 4, blk = a < .3, seam = !blk && Math.abs(a - .55) < .025;
          const c = blk ? dark : seam ? [150, 150, 150] : [bc.r * 255, bc.g * 255, bc.b * 255];
          im.data[k] = c[0]; im.data[k + 1] = c[1]; im.data[k + 2] = c[2]; im.data[k + 3] = 255;
        }
        g.putImageData(im, 0, 0);
      });
      const q = phys({ map: tex, color: '#ffffff', roughness: .55, clearcoat: .4 }); if (look === 'neon') { q.emissiveMap = tex; q.emissive = lin('#ffffff'); q.emissiveIntensity = .35; } return q;
    });
    const s = new TT.Mesh(look === 'neon' ? geo('bt8BallG', () => new TT.SphereGeometry(RBALL * K, 8, 6)) : geo('btBallG', () => new TT.SphereGeometry(RBALL * K, LO() ? 12 : 18, LO() ? 9 : 14)), m); s.position.y = RBALL * K; s.castShadow = true; g.add(s);
    g.userData = { r: RBALL };
    return g;
  }
  // the goalkeeper: a block 8 × 3.5 × 1.6 cm in the side's colour, the number 1 on its back
  function keeper(look, side) {
    const TT = T(), g = new TT.Group(), [body, gr, ink] = TEAM[look][side], neon = look === 'neon';
    const bm = mat('btKeep' + look + side, () => { if (neon) { const m = phys({ color: body, roughness: 1 }); m.emissive = lin(body); m.emissiveIntensity = .12; return m; } return phys({ color: body, roughness: look === 'retro' ? .55 : .22, clearcoat: look === 'retro' ? .2 : .9, clearcoatRoughness: .15 }); });
    const box = new TT.Mesh(geo('btKeepG', () => { const q = new TT.BoxGeometry(2 * KHW * K, KH * K, 2 * KHD * K, 1, 1, 1); return q; }), bm); box.position.y = KH * K / 2; box.castShadow = true; g.add(box);
    const lab = mat('btKeepL' + look + side, () => { if (neon) { const tx = PIX(X.canvasTex('bt8Keep' + side, 16, 7, (c) => { c.fillStyle = gr; c.fillRect(0, 0, 16, 7); c.fillStyle = body; c.fillRect(1, 1, 14, 5); pixNum(c, 1, 6.5, 1, 1, NES.w); })); const m = new TT.MeshStandardMaterial({ map: tx, roughness: 1 }); m.emissiveMap = tx; m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = .4; return m; }
      const m = new TT.MeshStandardMaterial({ map: X.canvasTex('btKeepT' + look + side, 256, 112, (c, S) => { c.fillStyle = gr; c.fillRect(0, 0, S, 112); c.strokeStyle = ink; c.lineWidth = 10; c.strokeRect(5, 5, S - 10, 102); c.fillStyle = ink; c.font = '900 84px "Fredoka", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('1', S / 2, 60); }), roughness: .4 }); if (neon) { m.emissiveMap = m.map; m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = .8; } return m; });
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
      for (const sx of [-1, 1]) { const p = new TT.Mesh(geo('btPost', () => new TT.CylinderGeometry(.35 * K, .35 * K, GH * K, 12)), BM.post); p.position.set(sx * GHW * K, TOP + GH * K / 2, gy * K); p.castShadow = true; p.userData.gx = sx; g.add(p); }
      const bar = new TT.Mesh(geo('btBar', () => { const q = new TT.CylinderGeometry(.35 * K, .35 * K, GW * K, 12); q.rotateZ(Math.PI / 2); return q; }), BM.post); bar.position.set(0, TOP + GH * K, gy * K); bar.castShadow = true; bar.userData.gs = 1; g.add(bar);
      const back = new TT.Mesh(geo('btNetB', () => new TT.PlaneGeometry(GW * K, GH * K)), BM.net); back.position.set(0, TOP + GH * K / 2, (gy + sg * GD) * K); back.userData.gs = 1; g.add(back);
      const roof = new TT.Mesh(geo('btNetR', () => { const q = new TT.PlaneGeometry(GW * K, GD * K); q.rotateX(Math.PI / 2); return q; }), BM.net); roof.position.set(0, TOP + GH * K, (gy + sg * GD / 2) * K); roof.userData.gs = 1; g.add(roof);
      for (const sx of [-1, 1]) { const sd = new TT.Mesh(geo('btNetS', () => { const q = new TT.PlaneGeometry(GD * K, GH * K); q.rotateY(Math.PI / 2); return q; }), BM.net); sd.position.set(sx * GHW * K, TOP + GH * K / 2, (gy + sg * GD / 2) * K); sd.userData.gx = sx; g.add(sd); }
      // the frame on the table behind the net
      for (const sx of [-1, 1]) { const f = new TT.Mesh(geo('btGFs', () => new TT.BoxGeometry(.5 * K, .5 * K, GD * K)), BM.post); f.position.set(sx * GHW * K, TOP + .25 * K, (gy + sg * GD / 2) * K); f.userData.gx = sx; g.add(f); }
      const fb = new TT.Mesh(geo('btGFb', () => new TT.BoxGeometry(GW * K, .5 * K, .5 * K)), BM.post); fb.position.set(0, TOP + .25 * K, (gy + sg * GD) * K); fb.userData.gs = 1; g.add(fb);
      // the PK shoot-out's own mark, further out (2026-11-15 ユーザー：PKはもっとゴールまでの距離があるほうが良い、盤面のデザインも変える):
      // a spot, a ring round it and a lane of dashes towards the goal, shown only while the shoot-out is on
      { const lineM = new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85, depthWrite: false }), py = sg * (H - 40);
        const pkG = new TT.Group(); pkG.userData.pkm = 1; pkG.visible = false;
        const spot = new TT.Mesh(new TT.CircleGeometry(1.1 * K, 24), lineM); spot.rotation.x = -Math.PI / 2; spot.position.set(0, TOP + .02 * K, py * K); pkG.add(spot);
        const ring = new TT.Mesh(new TT.RingGeometry(9.4 * K, 10 * K, 64), lineM); ring.rotation.x = -Math.PI / 2; ring.position.set(0, TOP + .02 * K, py * K); pkG.add(ring);
        for (let q = 13; q < 38; q += 4) { const dsh = new TT.Mesh(new TT.PlaneGeometry(.45 * K, 1.8 * K), lineM); dsh.rotation.x = -Math.PI / 2; dsh.position.set(0, TOP + .02 * K, (py + sg * q) * K); pkG.add(dsh); }
        g.add(pkG); }
    }
    if (look === 'neon') top.userData.keep = true;
    const U = g.userData;
    U.top = TOP; U.K = K; U.look = look; U.mats = BM; U.W = OW * K; U.L = OL * K;
    U.xz = (x, y) => [x * K, y * K];
    // the 8-bit stands' scoreboards (2026-11-17 ユーザー：得点をスコア表にも): where they are on the table (cm) and how one is drawn
    // (29×7 px) — the game lays a small live copy over each
    if (look === 'neon') {
      const Hh = Math.round(TL);
      U.scoreBoards = [1, -1].map(sg => { const y = sg > 0 ? Hh - 8 : 3, x0 = TX + sg * 30 - 12; return { x: x0 - 2 - TX, y: y - 1 - TY, w: 29, h: 7 }; });
      U.drawScore = (g, a, b) => { g.imageSmoothingEnabled = false; g.fillStyle = NES.k; g.fillRect(0, 0, 29, 7); const d = (n, x, c) => pixNum(g, n, x, 1, 1, c);
        d(1, 2, NES.red); d(a % 10, 8, NES.w); g.fillStyle = NES.w; g.fillRect(13, 3, 2, 1); d(b % 10, 17, NES.w); d(2, 24, NES.blue); };
    }
    U.button = (side, n) => button(look, side, n); U.ball = () => ball(look); U.keeper = side => keeper(look, side);
    U.dot = side => DOT[look][side];
    // the goal's inside width (cm): the PK shoot-out widens it (the posts and side nets move out, the bar and nets stretch)
    const GM = g.children.filter(m => m.userData.gx || m.userData.gs || m.userData.pkm);
    U.goalWidth = w => { w = w || GW; GM.forEach(m => { if (m.userData.pkm) { m.visible = w > GW; return; } const d = m.userData; if (d.gx) m.position.x = d.gx * w / 2 * K; else if (d.gs) m.scale.x = w / GW; }); };
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
    return g;
  };
  X.botao = { board, LOOKS, K, TEAM, NES };
})();
