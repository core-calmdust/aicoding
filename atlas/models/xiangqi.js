/* =====================================================================
   Xiangqi on the 3D table — six boards and six sets of pieces (2026-11-14).
   Boards (Table3D.BOARDS.xiangqi, 'atlas-xiangqi-board3'), in the menus' order; the first is the default:
     kaya     本榧            the shogi board's golden kaya (images/atlas/shogi-kaya.webp), black ink lines and brushed 楚河 漢界 —
                             the classic board on a solid block
     walnut   ウォルナットと真鍮  planked American walnut, the lines carved as V grooves, a brass inlay round the field (as the modern
                             walnut sets with brass-rimmed discs)
     hongmu   紅木と金線       deep red rosewood under a clear finish, gold lines, gold 楚河 汉界 (the classic Chinese gift board)
     raden    黒檀と螺鈿        striped ebony, the lines and the river words inlaid in mother-of-pearl
     lacquer  朱漆と雷文        the vermilion lacquer field with gold lines in a black lacquer frame painted with a gold Greek key and
                             white peonies, brass corners (the first 3D board)
     jade     翡翠と金          green jade with gold lines and gold words on a white-jade block
   Pieces (Table3D.PIECES.xiangqi, 'atlas-xiangqi-pc3'), the first the default: boxwood (engraved red / black on boxwood) ·
     brass (brass-rimmed discs: cream face with a red character / dark walnut face with a cream one) · ebony (ebony discs, a
     carved ring, gold / silver characters) · urushi (vermilion / black lacquer, gold characters) · jade (white / green jade) ·
     porcelain (white porcelain, copper-red / cobalt-blue characters).
   Registers into Table3D:
     Table3D.MODELS.xiangqi(live, look)   board (+ an opening position unless live)
     Table3D.xiangqi = { board(look), piece(code, o, set), LOOKS, SETS, pcSet(), swatch(col, set), u, W, D }
     userData: { top, u, W, D, look, pt(i, j) → [x, z], piece(code) → Group (the chosen set) }
     piece: children[0] = body, children[1] = the face (games turn it with rotation.z)
   Units: one point step u = 0.9; the lines span 8u × 9u.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex, makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const u = .9, MG = .45, FR = .72, H = .42, REC = .045;   // point step, margin round the lines, frame width, board height, field recess
  const RW = 8 * u + 2 * MG, RD = 9 * u + 2 * MG, W = RW + 2 * FR, D = RD + 2 * FR, HF = H - REC;
  const KAI = '"STKaiti","KaiTi","Kaiti SC","Kaiti TC","BiauKai","AR PL UKai CN","Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP","Shippori Mincho B1","Songti SC",serif';
  const MIN = '"Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP","Shippori Mincho B1","Songti SC","STKaiti","KaiTi",serif';
  const SANS = '"Noto Sans SC","Noto Sans CJK SC","Noto Sans CJK JP","PingFang SC","Hiragino Sans","Microsoft YaHei",sans-serif';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
  const LOOKS = ['kaya', 'walnut', 'hongmu', 'raden', 'lacquer', 'jade'];
  const SETS = ['boxwood', 'brass', 'ebony', 'urushi', 'jade', 'porcelain'];
  const lookOf = k => LOOKS.includes(k) ? k : (X.BOARDS && X.BOARDS.xiangqi ? X.BOARDS.xiangqi.get() : (LOOKS.includes(ls.get('atlas-xiangqi-board3')) ? ls.get('atlas-xiangqi-board3') : 'kaya'));
  const pcSet = () => { const v = ls.get('atlas-xiangqi-pc3'); return SETS.includes(v) ? v : 'boxwood'; };
  const setOf = s => SETS.includes(s) ? s : pcSet();

  /* ---------- materials ---------- */
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {};
  const mat = (k, f) => mats[k] || (mats[k] = f());

  /* ---------- a profile swept round the rectangle (sharp mitred corners, smooth along the profile) ----------
     prof: [[d, y], …] d = distance in from the outer edge; walk from the outer bottom, over the top, down the inside.
     uvMode 'plan': u, v from the top view of the whole board (for the painted top) */
  function sweep(A, B, prof, uvMode) {
    const TT = T(), P = [], N = [], UV = [], idx = [];
    const nrm = [];
    for (let i = 0; i < prof.length; i++) {   // vertex normals in (d, y): the mean of the neighbouring segments
      let nd = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
        if (a < 0 || b >= prof.length) continue;
        const dd = prof[b][0] - prof[a][0], dy = prof[b][1] - prof[a][1], L = Math.hypot(dd, dy); if (L < 1e-6) continue;
        nd += -dy / L; ny += dd / L;
      }
      const L = Math.hypot(nd, ny) || 1; nrm.push([nd / L, ny / L]);
    }
    const arc = [0]; for (let i = 1; i < prof.length; i++) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    const sides = [[[0, 0, -1], [1, 0, 0], A, B], [[1, 0, 0], [0, 0, 1], B, A], [[0, 0, 1], [-1, 0, 0], A, B], [[-1, 0, 0], [0, 0, -1], B, A]];
    sides.forEach(([o, e, hal, hac], si) => {
      const base = P.length / 3;
      prof.forEach(([d, y], i) => {
        const L = hal - d, [nd, ny] = nrm[i];
        for (const s of [-L, L]) {
          const x = o[0] * (hac - d) + e[0] * s, z = o[2] * (hac - d) + e[2] * s;
          P.push(x, y, z); N.push(-o[0] * nd, ny, -o[2] * nd);
          if (uvMode === 'plan') UV.push((x + A) / (2 * A), 1 - (z + B) / (2 * B));
          else UV.push((s + hal) / (2 * Math.max(A, B)) * .9 + si * .23, arc[i] * .35 + si * .19);
        }
      });
      for (let i = 0; i < prof.length - 1; i++) {
        const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2;
        if (Math.hypot(prof[i + 1][0] - prof[i][0], prof[i + 1][1] - prof[i][1]) < 1e-6) continue;
        idx.push(a, c, b, a, d, c);
      }
    });
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(UV, 2));
    g.setIndex(idx); g.computeBoundingSphere(); return g;
  }

  /* ---------- the painted top: black lacquer frame with the gold key band and peonies, the vermilion field ---------- */
  const raw = {};
  function noiseCanvas(key, Wd, Ht, f) {
    if (raw[key]) return raw[key];
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; const g = c.getContext('2d'), img = g.createImageData(Wd, Ht), d = img.data;
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { const v = f(x / Wd, y / Ht), i = (y * Wd + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v * 255)); d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (raw[key] = c);
  }
  // Greek key (雷文) unit: two square spirals, the right one the left one turned half round, sharing the stem
  // between them (they meet at the bottom on one side and at the top on the other). Grid g: the unit is 15g wide, 7g high.
  const KEY_L = [[7.5, 6.5], [7.5, .5], [.5, .5], [.5, 6.5], [5.5, 6.5], [5.5, 2.5], [2.5, 2.5], [2.5, 4.5], [3.7, 4.5]];
  const KEY_R = KEY_L.map(([x, y]) => [15 - x, 7 - y]);
  function keyBlock(c, x0, y0, g, lw) {
    const path = () => { c.beginPath(); [KEY_L, KEY_R].forEach(P => P.forEach(([x, y], i) => (i ? c.lineTo : c.moveTo).call(c, x0 + x * g, y0 + y * g))); };
    c.lineCap = 'butt'; c.lineJoin = 'miter';
    c.save(); c.translate(lw * .3, lw * .4); path(); c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = lw * 1.1; c.stroke(); c.restore();
    path(); const gr = c.createLinearGradient(x0, y0, x0 + 15 * g, y0 + 7 * g); gr.addColorStop(0, '#f1d27e'); gr.addColorStop(.5, '#c9a04a'); gr.addColorStop(1, '#e8c56c');
    c.strokeStyle = gr; c.lineWidth = lw; c.stroke();
  }
  // a small white peony with leaves and gold tendrils
  function peony(c, x, y, r, seed) {
    const N = makeNoise(seed), rot = N(1.3, 2.1, 1) * 6.28;
    c.save(); c.translate(x, y);
    // tendrils
    c.strokeStyle = 'rgba(214,176,86,.85)'; c.lineWidth = r * .06; c.lineCap = 'round';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .6, r * .2); c.bezierCurveTo(s * r * 1.3, r * .7, s * r * 1.9, -r * .2, s * r * 1.5, -r * .55); c.stroke(); c.beginPath(); c.arc(s * r * 1.38, -r * .38, r * .18, 0, 5); c.stroke(); }
    // leaves
    for (let k = 0; k < 4; k++) {
      const a = rot + k * 1.57 + .5, L = r * (1.25 + .25 * (k % 2)), w = r * .42;
      c.save(); c.rotate(a);
      const gr = c.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, '#244a2c'); gr.addColorStop(1, '#5d8f4a');
      c.beginPath(); c.moveTo(r * .2, 0); c.quadraticCurveTo(L * .55, -w, L, 0); c.quadraticCurveTo(L * .55, w, r * .2, 0); c.fillStyle = gr; c.fill();
      c.strokeStyle = 'rgba(220,190,110,.7)'; c.lineWidth = r * .04; c.beginPath(); c.moveTo(r * .3, 0); c.lineTo(L * .9, 0); c.stroke();
      c.restore();
    }
    // petals: an outer ring of six, an inner ring of five
    const petal = (a, d, rx, ry, k) => {
      c.save(); c.rotate(a); c.translate(d, 0);
      const gr = c.createRadialGradient(-rx * .5, 0, rx * .1, 0, 0, rx * 1.1); gr.addColorStop(0, k ? '#ffffff' : '#f6f8f6'); gr.addColorStop(.7, k ? '#eef2f1' : '#dfe7e8'); gr.addColorStop(1, '#a9bcc4');
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fillStyle = gr; c.fill();
      c.strokeStyle = 'rgba(70,90,100,.55)'; c.lineWidth = r * .035; c.stroke();
      c.restore();
    };
    for (let k = 0; k < 6; k++) petal(rot + k * 1.047, r * .5, r * .5, r * .38, 0);
    for (let k = 0; k < 5; k++) petal(rot + .4 + k * 1.257, r * .25, r * .32, r * .25, 1);
    c.fillStyle = '#e2b84a'; for (let k = 0; k < 7; k++) { const a = k * .9 + rot; c.beginPath(); c.arc(Math.cos(a) * r * .1, Math.sin(a) * r * .1, r * .06, 0, 7); c.fill(); }
    c.restore();
  }
  function topCanvas() {
    return canvasTex('xqLacquer2', SZ(2048), SZ(Math.round(2048 * D / W)), (c, CW, CH) => {
      const k = CW / W; c.save(); c.scale(k, CH / D);
      // black lacquer: warm black, a faint cloudy depth and fine brush texture
      c.fillStyle = '#16110e'; c.fillRect(0, 0, W, D);
      const nb = noiseCanvas('xqNB', SZ(512), SZ(512), (() => { const N = makeNoise(41); return (x, y) => .5 + (N(x * 5, y * 5, 4) - .5) * .9 + (N(x * 90, y * 6, 2) - .5) * .25; })());
      c.globalAlpha = .13; c.globalCompositeOperation = 'screen'; c.drawImage(nb, 0, 0, W, D); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      // frame band: gold border lines, key blocks alternating with peonies
      const gl = (o, lw, col) => { c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(o, o, W - 2 * o, D - 2 * o); };
      gl(.06, .018, '#caa04e'); gl(FR - .07, .022, '#d4ac55');
      const side = (L, seed) => {   // drawn in strip space: x along the side, y from the outer edge (0) in
        const g = .062, hb = 7 * g, y0 = (FR - hb) / 2, nb2 = Math.max(2, Math.round((L - .7) / 1.66)), fl = (L - nb2 * 15 * g) / (nb2 + 1);
        let x = 0;
        for (let i = 0; i <= nb2; i++) {
          peony(c, x + fl / 2, FR / 2, .15, seed + i * 7);
          x += fl; if (i < nb2) { keyBlock(c, x, y0, g, g * .78); x += 15 * g; }
        }
      };
      const L1 = W - 2 * FR, L2 = D - 2 * FR;
      [[FR, 0, 0, L1], [W, FR, Math.PI / 2, L2], [W - FR, D, Math.PI, L1], [0, D - FR, -Math.PI / 2, L2]].forEach(([tx, ty, a, L], i) => { c.save(); c.translate(tx, ty); c.rotate(a); side(L, 11 + i * 31); c.restore(); });
      [[FR / 2, FR / 2], [W - FR / 2, FR / 2], [W - FR / 2, D - FR / 2], [FR / 2, D - FR / 2]].forEach(([x, y], i) => peony(c, x, y, .17, 90 + i));
      // the vermilion field
      const fx = FR, fy = FR;
      const rg = c.createRadialGradient(W / 2, D * .45, .5, W / 2, D / 2, RD * .75); rg.addColorStop(0, '#d63a20'); rg.addColorStop(.65, '#c22a17'); rg.addColorStop(1, '#951d10');
      c.fillStyle = rg; c.fillRect(fx, fy, RW, RD);
      const nr = noiseCanvas('xqNR', SZ(512), SZ(512), (() => { const N = makeNoise(7); return (x, y) => .5 + (N(x * 4, y * 4, 4) - .5) * .7 + (N(x * 3, y * 120, 2) - .5) * .35 + (N(x * 40, y * 40, 2) > .78 ? -.25 : 0); })());
      c.globalAlpha = .22; c.globalCompositeOperation = 'overlay'; c.drawImage(nr, fx, fy, RW, RD); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      // a thin dark lacquer line round the field, then the gold lines
      c.strokeStyle = 'rgba(40,6,2,.7)'; c.lineWidth = .05; c.strokeRect(fx + .025, fy + .025, RW - .05, RD - .05);
      const ox = fx + MG, oy = fy + MG, X0 = i => ox + i * u, Y0 = j => oy + j * u;
      const gold = (draw, lw) => {
        c.save(); c.translate(.012, .018); c.strokeStyle = 'rgba(60,8,0,.55)'; c.lineWidth = lw * 1.25; draw(); c.restore();
        c.strokeStyle = '#e2b955'; c.lineWidth = lw; draw();
      };
      const lines = () => {
        c.beginPath();
        for (let j = 0; j < 10; j++) { c.moveTo(X0(0), Y0(j)); c.lineTo(X0(8), Y0(j)); }
        for (let i = 0; i < 9; i++) { if (i === 0 || i === 8) { c.moveTo(X0(i), Y0(0)); c.lineTo(X0(i), Y0(9)); } else { c.moveTo(X0(i), Y0(0)); c.lineTo(X0(i), Y0(4)); c.moveTo(X0(i), Y0(5)); c.lineTo(X0(i), Y0(9)); } }
        c.moveTo(X0(3), Y0(0)); c.lineTo(X0(5), Y0(2)); c.moveTo(X0(5), Y0(0)); c.lineTo(X0(3), Y0(2)); c.moveTo(X0(3), Y0(7)); c.lineTo(X0(5), Y0(9)); c.moveTo(X0(5), Y0(7)); c.lineTo(X0(3), Y0(9));
        const a = u * .08, b = u * .24;
        [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]].forEach(([i, j]) => {
          for (const dx of [-1, 1]) { if ((dx < 0 && i === 0) || (dx > 0 && i === 8)) continue; for (const dy of [-1, 1]) { c.moveTo(X0(i) + dx * a, Y0(j) + dy * b); c.lineTo(X0(i) + dx * a, Y0(j) + dy * a); c.lineTo(X0(i) + dx * b, Y0(j) + dy * a); } }
        });
        c.stroke();
      };
      c.lineCap = 'square'; gold(lines, .026);
      gold(() => { c.beginPath(); c.rect(X0(0) - .13, Y0(0) - .13, 8 * u + .26, 9 * u + .26); c.stroke(); }, .05);
      gold(() => { c.beginPath(); c.rect(X0(0) - .2, Y0(0) - .2, 8 * u + .4, 9 * u + .4); c.stroke(); }, .014);
      // the river: four characters in gold, painted with a brush (a dark under-stroke gives them body)
      c.restore();   // (text in pixels: tiny font sizes under a large scale rasterise badly)
      const ky = CH / D;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${Math.round(u * .62 * k)}px ${KAI}`;
      [['楚', 1.4], ['河', 2.6], ['漢', 5.4], ['界', 6.6]].forEach(([ch, i]) => {
        const x = X0(i) * k, y = (Y0(4.5) + u * .03) * ky, s = u * k;
        c.fillStyle = 'rgba(60,8,0,.6)'; c.fillText(ch, x + s * .022, y + s * .03);
        const gr = c.createLinearGradient(x - s * .3, y - s * .3, x + s * .3, y + s * .3); gr.addColorStop(0, '#f6dc8c'); gr.addColorStop(.55, '#d6a947'); gr.addColorStop(1, '#efcd73');
        c.fillStyle = gr; c.fillText(ch, x, y);
      });
    });
  }

  /* ---------- the board ---------- */
  function lacquerBoard() {
    const TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const tex = topCanvas(); tex.anisotropy = 8;
    const top = mat('top', () => phys({ map: tex, color: 0xffffff, roughness: .34, metalness: 0, clearcoat: .9, clearcoatRoughness: .1 }));
    const black = mat('black', () => phys({ color: 0x17120f, roughness: .3, clearcoat: 1, clearcoatRoughness: .08 }));
    const goldLip = mat('lip', () => phys({ color: 0xc89a48, roughness: .32, metalness: .85 }));
    const brass = mat('brass', () => phys({ color: 0xc7a05a, roughness: .36, metalness: 1 }));
    const add = (geo, m, cast = true) => { const x = new TT.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; base.add(x); return x; };
    const A = W / 2, B = D / 2, e = .045;
    // outer wall with a rounded top edge (black), the flat painted top, the gold lip down into the field
    const wall = [[0, 0], [0, H - e]]; for (let i = 1; i <= 3; i++) { const a = i / 3 * Math.PI / 2; wall.push([e - Math.cos(a) * e, H - e + Math.sin(a) * e]); }
    add(sweep(A, B, wall), black);
    add(sweep(A, B, [[e, H], [FR - .03, H]], 'plan'), top);
    add(sweep(A, B, [[FR - .03, H], [FR - .012, H - .006], [FR, H - .025], [FR, HF]]), goldLip);
    // the field: a plane in the hole, its UVs cut from the same painted top
    const fg = new TT.PlaneGeometry(RW, RD); fg.rotateX(-Math.PI / 2);
    { const P = fg.attributes.position, UV = fg.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + A) / W, 1 - (P.getZ(i) + B) / D); }
    const field = add(fg, top, false); field.position.y = HF;
    // brass corner fittings: a shaped plate on the top, two plates bent down the sides, three domed nails
    const a = .78, t = .016, sh = new TT.Shape();
    sh.moveTo(0, 0); sh.lineTo(a, 0); sh.lineTo(a, .14); sh.quadraticCurveTo(a * .55, .16, a * .42, .3); sh.quadraticCurveTo(.3, .3, .3, a * .42); sh.quadraticCurveTo(.16, a * .55, .14, a); sh.lineTo(0, a); sh.closePath();
    const pg = new TT.ExtrudeGeometry(sh, { depth: t, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 1, curveSegments: LO() ? 4 : 8 }); pg.rotateX(Math.PI / 2);   // shape x → +x, shape y → +z (into the board from the corner)
    const sideG = new TT.BoxGeometry(a, H * .62, t), nail = new TT.SphereGeometry(.035, LO() ? 6 : 8, 4, 0, 6.29, 0, Math.PI / 2);
    [[-1, -1, 0], [1, -1, -Math.PI / 2], [1, 1, Math.PI], [-1, 1, Math.PI / 2]].forEach(([sx, sz, ry]) => {
      const c = new TT.Group(); c.position.set(sx * A, 0, sz * B); c.rotation.y = ry; base.add(c);   // local +x / +z point into the board (turned, not mirrored: merging keeps the winding)
      const p = new TT.Mesh(pg, brass); p.position.y = H + t + .006; p.castShadow = true; p.receiveShadow = true; c.add(p);
      const s1 = new TT.Mesh(sideG, brass); s1.position.set(a / 2, H * .62 / 2 + H * .3, -t / 2); c.add(s1);
      const s2 = new TT.Mesh(sideG, brass); s2.rotation.y = Math.PI / 2; s2.position.set(-t / 2, H * .62 / 2 + H * .3, a / 2); c.add(s2);
      [[.1, .1], [a * .62, .07], [.07, a * .62]].forEach(([x, z]) => { const n = new TT.Mesh(nail, brass); n.position.set(x, H + t + .012, z); c.add(n); });
      c.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    });
    if (X.mergeStatic) { try { X.mergeStatic(base); } catch (err) {} }   // the board: a handful of draw calls
    // the board is built of open shells (a ring, walls, a plane): they barely reach the shadow map, so the pieces' shadows fell
    // through it onto the floor. An unseen closed slab just under the field casts the board's shadow (the field still receives).
    { const sc = new TT.Mesh(new TT.BoxGeometry(W - .06, HF - .03, D - .06), new TT.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      sc.position.y = (HF - .03) / 2; sc.castShadow = true; sc.receiveShadow = false; sc.userData.noInst = true; sc.material.userData.noMerge = true; g.add(sc); }
    g.userData.top = HF + .001; g.userData.u = u; g.userData.W = W; g.userData.D = D;
    g.userData.pt = (i, j) => [(i - 4) * u, (j - 4.5) * u];   // i: file 0..8 left → right, j: rank 0..9 far → near
    return g;
  }


  /* ---------- the woods and stones: pixel loops (self-contained: on the portal they run in a worker, atlas/texgen.js) ---------- */
  function KL(X) {
    const makeNoise = X.makeNoise;
    const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    const cl = v => Math.max(0, Math.min(1, v));
    const pix = (d, Wd, Ht, f) => { for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { const v = f(x / Wd, y / Ht), i = (y * Wd + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; } };
    return {
      // wood: grain along y (planks: p.planks strips across x, each its own tone and grain), growth rings, pores, an optional stripe
      wood(d, W, H, p) {
        const N = makeNoise(p.seed || 3), A = hexRGB(p.a), B = hexRGB(p.b), TAU = Math.PI * 2, np = p.planks || 1;
        pix(d, W, H, (x, y) => {
          const k = Math.floor(x * np), sh = np > 1 ? (N(k * 3.7 + 1, 2.3, 1) - .5) * (p.plankVar || .3) : 0, xs = x + k * 1.37;
          const w = N(xs * 2 + 5, y * .35, 3) * (p.warp || 1.6), ring = Math.sin((xs * (p.rings || 26) + w * 3) * TAU) * .5 + .5;
          let t = .45 + sh + (ring - .5) * (p.ringAmt || .35) + (N(xs * 90 + w * 4, y * 2.2, 2) - .5) * .5 + (N(xs * 3, y * 1.2, 3) - .5) * .35;
          if (p.stripe) { const st = N(xs * 7 + 1, y * .25 + 3, 3); t += Math.pow(cl((st - .48) * 4.2), 1.4) * p.stripe - .1; }
          let c = mix(A, B, cl(t));
          const pore = N(xs * 260, y * 9, 1); if (pore > .78) { const q = 1 - (pore - .78) * (p.pore || 1.2); c = [c[0] * q, c[1] * q, c[2] * q]; }
          if (np > 1) { const e = Math.abs(x * np - Math.round(x * np)); if (e < .004 * np) c = [c[0] * .6, c[1] * .6, c[2] * .6]; }   // (the joints between the planks)
          return c;
        });
      },
      // jade: deep green with milky clouds, darker veins and tiny bright crystals
      jade(d, W, H, p) {
        const N = makeNoise(p.seed || 41), A = hexRGB(p.a || '#1f6a46'), B = hexRGB(p.b || '#0b3a24'), Cc = hexRGB(p.c || '#8fc4a4');
        pix(d, W, H, (x, y) => {
          const q = N(x * 3 + 1, y * 3 + 2, 4), r = N(x * 7 + q * 2, y * 7 - q * 2, 4);
          let c = mix(A, B, cl((r - .35) * 1.6));
          c = mix(c, Cc, cl((N(x * 2.6 + 9, y * 2.6 + q, 4) - .6) * 3) * .55);
          const v = Math.abs(Math.sin((x * 3 + y * 5 + q * 4) * Math.PI)); if (v < .03) c = mix(c, B, .5);
          const sp = N(x * 200, y * 200, 1); if (sp > .9) c = mix(c, Cc, (sp - .9) * 4);
          return c;
        });
      },
    };
  }
  function paint(c, name, p, after, c2) {
    const TG = window.AtlasTexGen; if (TG) return TG.paint(c, KL, name, p, after, c2);
    const g = c.getContext('2d'), a = g.createImageData(c.width, c.height);
    (KL.L || (KL.L = KL(X)))[name](a.data, c.width, c.height, p || {});
    g.putImageData(a, 0, 0); if (after) after(g, c.width, c.height); return c;
  }
  const later = (deps, c, fn) => window.AtlasTexGen ? AtlasTexGen.later(deps, c, fn) : (fn(c.getContext('2d'), c.width, c.height), c);
  const sheets = {};
  function sheet(key, Wd, Ht, name, p) { if (sheets[key]) return sheets[key]; const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; paint(c, name, p || {}); return (sheets[key] = c); }
  const TX = {
    walnut: ['wood', { a: '#6e4a30', b: '#3e2616', seed: 11, rings: 9, ringAmt: .22, warp: 2.6, pore: 1.2, planks: 5, plankVar: .28 }],
    hongmu: ['wood', { a: '#6e2416', b: '#3e0f08', seed: 15, rings: 20, ringAmt: .2, warp: 1.8, pore: 1.0 }],
    ebony: ['wood', { a: '#3a2c24', b: '#0c0806', seed: 19, rings: 14, ringAmt: .2, warp: 1.2, stripe: 1.0, pore: .6 }],
    jade: ['jade', { seed: 41 }],
    wjade: ['jade', { seed: 43, a: '#eef0e4', b: '#cfd8c8', c: '#ffffff' }],
    kayaS: ['wood', { a: '#e7c88a', b: '#b98a46', seed: 7, rings: 22, ringAmt: .3, warp: 1.2, pore: .7 }],
  };
  const tile = (k, Wd, Ht) => sheet('xq-' + k + Wd + 'x' + (Ht || Wd), Wd, Ht || Wd, TX[k][0], TX[k][1]);
  // the shogi board's kaya (a same-origin picture, redrawn into the top once it has loaded)
  let kayaImg = null;
  const KAYA_SRC = (() => { try { return new URL('../../images/atlas/shogi-kaya.webp?v=3', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/shogi-kaya.webp?v=3'; } })();
  function withKaya(fn) {
    if (kayaImg && kayaImg.complete && kayaImg.naturalWidth) { fn(kayaImg); return; }
    if (!kayaImg) { kayaImg = new Image(); kayaImg.src = KAYA_SRC; }
    kayaImg.addEventListener('load', () => fn(kayaImg), { once: true });
  }

  /* ---------- the block boards: the whole top painted (wood / stone, the lines, the river words, the border) ---------- */
  const LK = {
    kaya: { line: '#170e07', lw: .032, ink: true, words: ['楚', '河', '漢', '界'], wordCol: '#1e140c', border: [[.13, .06], [.21, .018]], gloss: { roughness: .42, clearcoat: .3, clearcoatRoughness: .3 }, side: 'kayaS', bottom: 0x8a6232 },
    walnut: { groove: true, lw: .06, inlay: '#d6b062', words: null, gloss: { roughness: .5, clearcoat: .2, clearcoatRoughness: .4 }, side: 'walnut', base: 'walnut', bottom: 0x2a1a0e },
    hongmu: { line: '#e3bd62', lw: .022, gold: true, words: ['楚', '河', '汉', '界'], wordCol: 'gold', border: [[.13, .045], [.2, .014]], gloss: { roughness: .14, clearcoat: 1, clearcoatRoughness: .05 }, side: 'hongmu', base: 'hongmu', bottom: 0x2a0806 },
    raden: { line: 'nacre', lw: .03, words: ['楚', '河', '漢', '界'], wordCol: 'nacre', border: [[.13, .05], [.22, .02]], gloss: { roughness: .16, clearcoat: 1, clearcoatRoughness: .04 }, side: 'ebony', base: 'ebony', bottom: 0x0a0706 },
    jade: { line: '#e9c76a', lw: .024, gold: true, words: ['楚', '河', '漢', '界'], wordCol: 'gold', border: [[.13, .05], [.2, .016]], gloss: { roughness: .08, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.5 }, side: 'wjade', base: 'jade', bottom: 0xcfd8c8 },
  };
  const GOLDG = (c, x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#f7dc8a'); g.addColorStop(.5, '#c99a3e'); g.addColorStop(1, '#efcd72'); return g; };
  const NACRE = (c, x0, y0, x1, y1) => { const g = c.createLinearGradient(x0, y0, x1, y1); ['#f4f0ff', '#d8f0ec', '#fbe6f0', '#e8f4ff', '#f6efe0', '#dff2e6'].forEach((s, i, a) => g.addColorStop(i / (a.length - 1), s)); return g; };
  function blockTop(look) {
    const L = LK[look], CW = SZ(2048), CH = SZ(Math.round(2048 * D / W));
    const c0 = document.createElement('canvas'); c0.width = CW; c0.height = CH;
    const TT = T(), tex = new TT.CanvasTexture(c0); tex.encoding = TT.sRGBEncoding; tex.anisotropy = 8;
    const draw = (c, img) => {
      const k = CW / W, ky = CH / D;
      // the ground
      if (look === 'kaya') { c.fillStyle = '#ddb877'; c.fillRect(0, 0, CW, CH); if (img) c.drawImage(img, 0, 0, CW, CH); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(236,196,128,.55)'; c.fillRect(0, 0, CW, CH); c.globalCompositeOperation = 'source-over'; }   // (a warmer gold than the picture alone under the table's light)
      else { const s = tile(L.base, SZ(1024), SZ(1024)); c.drawImage(s, 0, 0, CW, CH); }
      c.save(); c.scale(k, ky);
      const ox = FR + MG, oy = FR + MG, X0 = i => ox + i * u, Y0 = j => oy + j * u;
      const path = () => {
        c.beginPath();
        for (let j = 0; j < 10; j++) { c.moveTo(X0(0), Y0(j)); c.lineTo(X0(8), Y0(j)); }
        for (let i = 0; i < 9; i++) { if (i === 0 || i === 8) { c.moveTo(X0(i), Y0(0)); c.lineTo(X0(i), Y0(9)); } else { c.moveTo(X0(i), Y0(0)); c.lineTo(X0(i), Y0(4)); c.moveTo(X0(i), Y0(5)); c.lineTo(X0(i), Y0(9)); } }
        c.moveTo(X0(3), Y0(0)); c.lineTo(X0(5), Y0(2)); c.moveTo(X0(5), Y0(0)); c.lineTo(X0(3), Y0(2)); c.moveTo(X0(3), Y0(7)); c.lineTo(X0(5), Y0(9)); c.moveTo(X0(5), Y0(7)); c.lineTo(X0(3), Y0(9));
        const a = u * .08, b = u * .22;
        [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]].forEach(([i, j]) => {
          for (const dx of [-1, 1]) { if ((dx < 0 && i === 0) || (dx > 0 && i === 8)) continue; for (const dy of [-1, 1]) { c.moveTo(X0(i) + dx * a, Y0(j) + dy * b); c.lineTo(X0(i) + dx * a, Y0(j) + dy * a); c.lineTo(X0(i) + dx * b, Y0(j) + dy * a); } }
        });
      };
      const rect = (pad) => { c.beginPath(); c.rect(X0(0) - pad, Y0(0) - pad, 8 * u + 2 * pad, 9 * u + 2 * pad); };
      const stroke = (shape, lw, style) => {
        c.lineCap = 'square'; c.lineJoin = 'miter';
        if (L.groove) {   // a V groove: a dark floor, a lit lower edge
          shape(); c.strokeStyle = 'rgba(255,226,180,.22)'; c.lineWidth = lw * 1.5; c.save(); c.translate(.006, .009); c.stroke(); c.restore();
          shape(); c.strokeStyle = 'rgba(14,7,2,.9)'; c.lineWidth = lw; c.stroke(); shape(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = lw * .45; c.stroke(); return;
        }
        if (style === 'nacre') { shape(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = lw * 1.35; c.stroke(); shape(); c.strokeStyle = NACRE(c, 0, 0, W, D); c.lineWidth = lw; c.stroke(); return; }
        if (L.gold) { c.save(); c.translate(.01, .014); shape(); c.strokeStyle = 'rgba(30,6,0,.5)'; c.lineWidth = lw * 1.25; c.stroke(); c.restore(); shape(); c.strokeStyle = GOLDG(c, 0, 0, W, D); c.lineWidth = lw; c.stroke(); return; }
        shape(); c.strokeStyle = style; c.lineWidth = lw; c.globalAlpha = .9; c.stroke(); c.globalAlpha = 1;
      };
      stroke(path, L.lw, L.line);
      (L.border || []).forEach(([pad, lw]) => stroke(() => rect(pad), lw, L.line));
      if (L.inlay) {   // the brass inlay round the field (photos: a bright strip set into the walnut)
        const pad = .42; c.save(); c.translate(.008, .012); rect(pad); c.strokeStyle = 'rgba(20,10,4,.5)'; c.lineWidth = .075; c.stroke(); c.restore();
        rect(pad); c.strokeStyle = GOLDG(c, 0, 0, W, D); c.lineWidth = .06; c.stroke();
      }
      c.restore();
      // the river words (in pixels: tiny font sizes under a large scale rasterise badly)
      if (L.words) {
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${Math.round(u * .7 * k)}px ${KAI}`;
        L.words.forEach((ch, n) => {
          const i = [1.4, 2.6, 5.4, 6.6][n], x = X0(i) * k, y = (Y0(4.5) + u * .03) * ky, s = u * k;
          if (L.wordCol === 'gold') { c.fillStyle = 'rgba(30,6,0,.5)'; c.fillText(ch, x + s * .02, y + s * .028); c.fillStyle = GOLDG(c, x - s * .3, y - s * .3, x + s * .3, y + s * .3); }
          else if (L.wordCol === 'nacre') { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(ch, x + s * .015, y + s * .02); c.fillStyle = NACRE(c, x - s * .3, y - s * .3, x + s * .3, y + s * .3); }
          else { c.fillStyle = L.wordCol; c.globalAlpha = .9; }
          c.fillText(ch, x, y); c.globalAlpha = 1;
        });
      }
      const vg = c.createRadialGradient(CW / 2, CH / 2, CW * .3, CW / 2, CH / 2, CW * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = vg; c.fillRect(0, 0, CW, CH);
    };
    if (look === 'kaya') { draw(c0.getContext('2d'), null); withKaya(img => { draw(c0.getContext('2d'), img); tex.needsUpdate = true; if (X.kick) X.kick(300); }); }
    else later([tile(L.base, SZ(1024), SZ(1024))], c0, c => draw(c));
    return tex;
  }
  function sideMat(look) {
    const L = LK[look];
    return mat('side-' + look, () => { const TT = T(), t = new TT.CanvasTexture(tile(L.side, SZ(512), SZ(512))); t.encoding = TT.sRGBEncoding; t.anisotropy = 4; t.wrapS = t.wrapT = TT.RepeatWrapping; return phys(Object.assign({ map: t, color: 0xffffff }, L.gloss)); });
  }
  function blockBoard(look) {
    const L = LK[look], TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const A = W / 2, B = D / 2, e = .06, HB = H + .04;
    const top = mat('top-' + look, () => phys(Object.assign({ map: blockTop(look), color: 0xffffff }, L.gloss)));
    const side = sideMat(look);
    const add = (geo, m, cast = true) => { const x = new TT.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; base.add(x); return x; };
    // the block: straight sides, a small round over into the top
    const prof = [[0, 0], [0, HB - e]]; for (let i = 1; i <= (LO() ? 2 : 4); i++) { const a = i / (LO() ? 2 : 4) * Math.PI / 2; prof.push([e - Math.cos(a) * e, HB - e + Math.sin(a) * e]); }
    add(sweep(A, B, prof), side);
    const fg = new TT.PlaneGeometry(W - 2 * e, D - 2 * e); fg.rotateX(-Math.PI / 2);
    { const P = fg.attributes.position, UV = fg.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + A) / W, 1 - (P.getZ(i) + B) / D); }
    const fm = add(fg, top, false); fm.position.y = HB;
    if (X.mergeStatic) { try { X.mergeStatic(base); } catch (err) {} }
    { const sc = new TT.Mesh(new TT.BoxGeometry(W - .06, HB - .03, D - .06), new TT.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
      sc.position.y = (HB - .03) / 2; sc.castShadow = true; sc.receiveShadow = false; sc.userData.noInst = true; sc.material.userData.noMerge = true; g.add(sc); }
    g.userData.top = HB + .001;
    return g;
  }
  function board(lk) {
    const look = lookOf(lk), g = look === 'lacquer' ? lacquerBoard() : blockBoard(look);
    g.userData.u = u; g.userData.W = W; g.userData.D = D; g.userData.look = look;
    g.userData.pt = (i, j) => [(i - 4) * u, (j - 4.5) * u];   // i: file 0..8 left → right, j: rank 0..9 far → near
    g.userData.piece = (code, o) => piece(code, o);
    return g;
  }

  /* ---------- pieces: thick turned discs, the character on the face ---------- */
  const PR = u * .43, PH = u * .27, FACE = PR * .84, TYPE = ' KAEHRCP';
  const GL = { r: ' 帥仕相傌俥炮兵', b: ' 將士象馬車砲卒' };
  const geos = {};
  function bodyGeo(kind) {
    const key = kind + (LO() ? 'lo' : 'hi'); if (geos[key]) return geos[key];
    const TT = T(), seg = LO() ? 2 : 3;
    let pts;
    if (kind === 'brass') {   // a straight brass rim, crisp edges, the face set a little down inside it
      const r = PR, h = PH * .92, e = .012, f = FACE * 1.02;
      pts = [[0, 0], [r - e, 0], [r, e], [r, h - e], [r - e, h], [f + .012, h], [f + .004, h - .01], [f, h - .014], [0, h - .014]];
    } else {
      const e = PH * (kind === 'jade' || kind === 'porcelain' ? .32 : .22); pts = [[0, 0], [PR - e * 1.2, 0]];
      for (let k = 1; k <= seg; k++) { const a = -Math.PI / 2 + Math.PI / 2 * k / seg; pts.push([PR - e + Math.cos(a) * e, e + Math.sin(a) * e]); }
      pts.push([PR + .006, PH * .5]);
      for (let k = 0; k <= seg; k++) { const a = Math.PI / 2 * k / seg; pts.push([PR - e + Math.cos(a) * e, PH - e + Math.sin(a) * e]); }
      pts.push([FACE + .02, PH], [FACE + .008, PH - .012], [FACE, PH - .004], [0, PH - .004]);
    }
    const g = new TT.LatheGeometry(pts.map(([a, b]) => new TT.Vector2(a, b)), LO() ? 18 : 24); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function faceGeo() {
    if (geos.face) return geos.face;
    const g = new (T().CircleGeometry)(FACE, LO() ? 18 : 24); if (X.share) X.share(g); return (geos.face = g);
  }
  // each set: the face (ground, ink, style), the body's material
  const PS = {
    boxwood: { face: ['#fbecc9', '#ecd2a0', '#d6b27a'], ink: ['#b5221a', '#1d1916'], font: MIN, engrave: true, ring: true, grain: true },
    brass: { face: [['#f6ead2', '#ead8b4', '#d8c296'], ['#3a2a20', '#2a1d16', '#1c130e']], ink: ['#a61e16', '#f2e6cc'], font: SANS, weight: 700 },
    ebony: { face: ['#2a201b', '#1a1310', '#100b09'], ink: ['gold', 'silver'], font: KAI, carved: true },
    urushi: { face: [['#b8302a', '#9a2219', '#6e140e'], ['#2a2628', '#161315', '#0a0809']], ink: ['gold', 'gold'], font: KAI, goldRing: true },
    jade: { face: [['#f6f7ee', '#e6ebdc', '#cfd8c4'], ['#3f8a60', '#22663f', '#0f3e25']], ink: ['#b02018', 'gold'], font: KAI, ring: true },
    porcelain: { face: ['#ffffff', '#f4f6f8', '#dfe4ea'], ink: ['#a8261c', '#1f3f8f'], font: KAI, blueRings: true },
  };
  function faceTex(code, set) {
    const black = code >= 8, ch = GL[black ? 'b' : 'r'][code & 7], S = PS[set], col = black ? 1 : 0;
    return canvasTex('xqF3_' + set + '_' + code, 256, 256, (c, Wd) => {
      const r = Wd / 2, F = Array.isArray(S.face[0]) ? S.face[col] : S.face;
      const gr = c.createRadialGradient(r * .75, r * .65, r * .05, r, r, r * 1.05); gr.addColorStop(0, F[0]); gr.addColorStop(.7, F[1]); gr.addColorStop(1, F[2]);
      c.fillStyle = gr; c.fillRect(0, 0, Wd, Wd);
      if (S.grain && X.wood) { const wd = X.wood('xqPw', '#efd6a6', '#caa067', 256, 256, 1.4); if (wd && wd.image && wd.image.width > 8) { c.globalAlpha = .35; c.globalCompositeOperation = 'multiply'; c.drawImage(wd.image, 0, 0, Wd, Wd); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; } }
      if (set === 'ebony') { const N = makeNoise(5); c.globalAlpha = .25; for (let y = 0; y < Wd; y += 2) { c.fillStyle = N(3, y / Wd * 40, 2) > .55 ? '#4a3a30' : '#050302'; c.fillRect(0, y, Wd, 2); } c.globalAlpha = 1; }
      if (set === 'jade') { const N = makeNoise(black ? 9 : 13); for (let i = 0; i < 400; i++) { const x = N(i * .3, 1, 1) * Wd, y = N(2, i * .37, 1) * Wd; c.fillStyle = black ? 'rgba(160,220,180,.08)' : 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(x, y, Wd * .03, 0, 7); c.fill(); } }
      const inkOf = k => k === 'gold' ? (() => { const g = c.createLinearGradient(r * .5, r * .4, r * 1.5, r * 1.6); g.addColorStop(0, '#fbe4a0'); g.addColorStop(.5, '#cf9e3e'); g.addColorStop(1, '#f2d27a'); return g; })()
        : k === 'silver' ? (() => { const g = c.createLinearGradient(r * .5, r * .4, r * 1.5, r * 1.6); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#b9bec6'); g.addColorStop(1, '#eef1f4'); return g; })() : k;
      const ink = inkOf(S.ink[col]);
      const engrave = draw => {   // an engraved line: a lit lower edge, a dark upper edge, the colour inside
        if (S.engrave || S.carved) { c.save(); c.translate(Wd * .006, Wd * .008); draw(S.carved ? 'rgba(120,100,80,.5)' : 'rgba(255,246,222,.9)'); c.restore(); c.save(); c.translate(-Wd * .005, -Wd * .006); draw(S.carved ? 'rgba(0,0,0,.8)' : 'rgba(70,40,15,.55)'); c.restore(); }
        else { c.save(); c.translate(Wd * .004, Wd * .006); draw('rgba(0,0,0,.25)'); c.restore(); }
        draw(ink);
      };
      if (S.ring) engrave(cl => { c.strokeStyle = cl; c.lineWidth = Wd * .022; c.beginPath(); c.arc(r, r, r * .83, 0, 7); c.stroke(); });
      if (S.goldRing) engrave(cl => { c.strokeStyle = cl; c.lineWidth = Wd * .016; c.beginPath(); c.arc(r, r, r * .86, 0, 7); c.stroke(); c.beginPath(); c.arc(r, r, r * .79, 0, 7); c.stroke(); });
      if (S.blueRings) { c.strokeStyle = '#2a4ea0'; c.lineWidth = Wd * .02; c.beginPath(); c.arc(r, r, r * .88, 0, 7); c.stroke(); c.lineWidth = Wd * .008; c.beginPath(); c.arc(r, r, r * .8, 0, 7); c.stroke(); }
      if (S.carved) {   // ebony: a carved band of small beads round the face
        engrave(cl => { c.strokeStyle = cl; c.lineWidth = Wd * .012; c.beginPath(); c.arc(r, r, r * .9, 0, 7); c.stroke(); c.beginPath(); c.arc(r, r, r * .72, 0, 7); c.stroke(); });
        engrave(cl => { c.fillStyle = cl; for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; c.beginPath(); c.arc(r + Math.cos(a) * r * .81, r + Math.sin(a) * r * .81, Wd * .018, 0, 7); c.fill(); } });
      }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${S.weight || 900} ${Math.round(Wd * (S.carved ? .46 : .54))}px ${S.font}`;
      engrave(cl => { c.fillStyle = cl; c.fillText(ch, r, r + Wd * .025); });
    });
  }
  // the disc's turned side: close boxwood / old ivory, fine fibres running up the edge (v), a soft cloud (u wraps round)
  function bodyTex() {
    return canvasTex('xqBody1', 256, 128, (c, Wd, Ht) => {
      const N = makeNoise(23), img = c.createImageData(Wd, Ht), d = img.data, TAU = Math.PI * 2;
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        const a = x / Wd * TAU, cx = Math.cos(a) * 1.5 + 4, cz = Math.sin(a) * 1.5 + 4, v = y / Ht;
        const t = (N(cx * 9, cz * 9 + v * 3, 2) - .5) * .5 + (N(cx * 1.4, cz * 1.4 + v, 3) - .5) * .7, i = (y * Wd + x) * 4;
        d[i] = 236 - t * 22; d[i + 1] = 214 - t * 30; d[i + 2] = 168 - t * 40; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
  }
  function bodyMat(set, black) {
    return mat('pb' + set + (black ? 'b' : 'r'), () => {
      if (set === 'boxwood') return phys({ map: bodyTex(), color: 0xffffff, roughness: .4, clearcoat: .45, clearcoatRoughness: .3 });
      if (set === 'brass') return phys({ color: 0xe0b866, metalness: 1, roughness: .22, envMapIntensity: 1.4 });
      if (set === 'ebony') return phys({ color: 0x1c1512, roughness: .3, clearcoat: .7, clearcoatRoughness: .12 });
      if (set === 'urushi') return phys({ color: black ? 0x121012 : 0x9e231a, roughness: .16, clearcoat: 1, clearcoatRoughness: .03 });
      if (set === 'jade') return phys({ color: black ? 0x23683f : 0xe6ebdc, roughness: .14, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 });
      return phys({ color: 0xf6f7f9, roughness: .1, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.3 });   // porcelain
    });
  }
  const GEOK = { brass: 'brass', jade: 'jade', porcelain: 'porcelain' };
  function piece(code, o = {}, set0) {
    const TT = T(), black = code >= 8, tp = code & 7, set = setOf(set0 || o.set);
    const fm = mat('pf' + set + code, () => phys(Object.assign({ map: faceTex(code, set), color: 0xffffff },
      set === 'brass' ? { roughness: .55, clearcoat: .2, clearcoatRoughness: .4 } : set === 'urushi' || set === 'porcelain' || set === 'jade' ? { roughness: .12, clearcoat: 1, clearcoatRoughness: .04 } : set === 'ebony' ? { roughness: .32, clearcoat: .6, clearcoatRoughness: .12 } : { roughness: .45, clearcoat: .35, clearcoatRoughness: .35 })));
    const kind = GEOK[set] || 'disc', body = new TT.Mesh(bodyGeo(kind), bodyMat(set, black)); body.castShadow = true; body.receiveShadow = true;
    const cap = new TT.Mesh(faceGeo(), fm); cap.rotation.x = -Math.PI / 2; cap.position.y = (kind === 'brass' ? PH * .92 - .014 : PH - .004) + .001; cap.castShadow = false; cap.receiveShadow = true;
    const p = new TT.Group(); p.add(body, cap); p.userData = { code, type: TYPE[tp], black, h: PH, r: PR, set };
    return p;
  }
  // the page's small discs (the HUD): the two sides' faces in CSS
  const SW = { boxwood: ['#fbecc9,#ecd2a0 60%,#c9a46a', '#fbecc9,#ecd2a0 60%,#c9a46a'], brass: ['#f6ead2,#ead8b4 55%,#c89a4c', '#3a2a20,#1c130e 55%,#c89a4c'], ebony: ['#3a2c24,#1a1310 60%,#0c0806', '#3a2c24,#1a1310 60%,#0c0806'],
    urushi: ['#d0453a,#9a2219 60%,#5a0d08', '#3a3436,#121012 60%,#000'], jade: ['#ffffff,#e6ebdc 60%,#b8c4ae', '#5fae80,#22663f 60%,#0b3a24'], porcelain: ['#ffffff,#f1f4f7 60%,#c9d2dc', '#ffffff,#f1f4f7 60%,#c9d2dc'] };
  const INK = { boxwood: ['#b5221a', '#1d1916'], brass: ['#a61e16', '#f2e6cc'], ebony: ['#e0b048', '#d6dbe2'], urushi: ['#f0c860', '#f0c860'], jade: ['#b02018', '#f0c860'], porcelain: ['#a8261c', '#1f3f8f'] };
  const swatch = (col, set) => `radial-gradient(circle at 35% 30%,${SW[setOf(set)][col === 1 || col === 'b' ? 1 : 0]})`;
  const ink = (col, set) => INK[setOf(set)][col === 1 || col === 'b' ? 1 : 0];

  X.MODELS.xiangqi = function (live, look) {
    const g = board(look), Y0 = g.userData.top;
    if (live) return g;
    const start = ['rnbakabnr', '.........', '.c.....c.', 'p.p.p.p.p', '.........', '.........', 'P.P.P.P.P', '.C..C....', '.........', 'RNBAKABNR'];   // a central cannon already played
    start.forEach((row, j) => [...row].forEach((chx, i) => {
      if (chx === '.') return; const blk = chx === chx.toLowerCase(), t = ' kabnrcp'.indexOf(chx.toLowerCase());
      const p = piece(t | (blk ? 8 : 0)), [x, z] = g.userData.pt(i, j); p.position.set(x, Y0, z); g.add(p);
      const sh = X.contact(PR, .5); sh.position.set(x, Y0 + .001, z); g.add(sh);
    }));
    g.scale.setScalar(.94);   // about the other boards' size on the chabudai
    return g;
  };
  X.xiangqi = { board, piece, u, W, D, LOOKS, SETS, pcSet, swatch, ink, R: PR };
})();
