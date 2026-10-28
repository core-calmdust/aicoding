/* =====================================================================
   Xiangqi on the 3D table — an antique lacquer board: a vermilion
   playing field with gold lines and gold calligraphy in the river
   (楚 河 漢 界), a black lacquer frame painted with a gold Greek-key
   (雷文) band and small white peonies, brass corner fittings;
   thick boxwood / ivory-like discs with engraved red / black characters.
   Registers into Table3D (replaces the simple builder in table3d.js):
     Table3D.MODELS.xiangqi(live)   board (+ the opening position unless live)
     userData: { top, u, W, D, pt(i, j) → [x, z], piece(code) → Group }
     piece: children[0] = body, children[1] = the engraved face (games turn it with rotation.z)
   Units: one point step u = 0.9; the lines span 8u × 9u.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex, makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const u = .9, MG = .45, FR = .72, H = .42, REC = .045;   // point step, red margin round the lines, frame width, frame height, field recess
  const RW = 8 * u + 2 * MG, RD = 9 * u + 2 * MG, W = RW + 2 * FR, D = RD + 2 * FR, HF = H - REC;
  const KAI = '"STKaiti","KaiTi","Kaiti SC","Kaiti TC","BiauKai","AR PL UKai CN","Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP","Shippori Mincho B1","Songti SC",serif';
  const MIN = '"Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP","Shippori Mincho B1","Songti SC","STKaiti","KaiTi",serif';

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
  // Greek key band: units of a square spiral hung from a base line (grid g, one unit 4g wide, the band 4g high)
  function keyBlock(c, x0, y0, g, n, lw) {
    const path = () => {
      c.beginPath();
      c.moveTo(x0, y0); c.lineTo(x0 + n * 4 * g, y0); c.moveTo(x0, y0 + 4 * g); c.lineTo(x0 + n * 4 * g, y0 + 4 * g);   // the framing lines
      for (let k = 0; k < n; k++) {
        const x = x0 + k * 4 * g + g * .5, y = y0 + g * .5;
        c.moveTo(x, y + 3 * g); c.lineTo(x, y); c.lineTo(x + 3 * g, y); c.lineTo(x + 3 * g, y + 3 * g); c.lineTo(x + g, y + 3 * g); c.lineTo(x + g, y + g); c.lineTo(x + 2 * g, y + g); c.lineTo(x + 2 * g, y + 2 * g);
      }
      c.moveTo(x0, y0); c.lineTo(x0, y0 + 4 * g); c.moveTo(x0 + n * 4 * g, y0); c.lineTo(x0 + n * 4 * g, y0 + 4 * g);
    };
    c.lineCap = 'square'; c.lineJoin = 'miter';
    c.save(); c.translate(lw * .35, lw * .45); path(); c.strokeStyle = 'rgba(0,0,0,.65)'; c.lineWidth = lw * 1.15; c.stroke(); c.restore();
    path(); const gr = c.createLinearGradient(x0, y0, x0 + n * 4 * g, y0 + 4 * g); gr.addColorStop(0, '#f1d27e'); gr.addColorStop(.5, '#c9a04a'); gr.addColorStop(1, '#e8c56c');
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
    return canvasTex('xqLacquer1', SZ(2048), SZ(Math.round(2048 * D / W)), (c, CW, CH) => {
      const k = CW / W; c.save(); c.scale(k, CH / D);
      // black lacquer: warm black, a faint cloudy depth and fine brush texture
      c.fillStyle = '#16110e'; c.fillRect(0, 0, W, D);
      const nb = noiseCanvas('xqNB', SZ(512), SZ(512), (() => { const N = makeNoise(41); return (x, y) => .5 + (N(x * 5, y * 5, 4) - .5) * .9 + (N(x * 90, y * 6, 2) - .5) * .25; })());
      c.globalAlpha = .13; c.globalCompositeOperation = 'screen'; c.drawImage(nb, 0, 0, W, D); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      // frame band: gold border lines, key blocks alternating with peonies
      const gl = (o, lw, col) => { c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(o, o, W - 2 * o, D - 2 * o); };
      gl(.06, .018, '#caa04e'); gl(FR - .07, .022, '#d4ac55');
      const side = (L, seed) => {   // drawn in strip space: x along the side, y from the outer edge (0) in
        const g = .108, hb = 4 * g, y0 = (FR - hb) / 2, nb2 = Math.max(2, Math.round((L - .7) / 1.66)), fl = (L - nb2 * 8 * g) / (nb2 + 1);
        let x = 0;
        for (let i = 0; i <= nb2; i++) {
          peony(c, x + fl / 2, FR / 2, .15, seed + i * 7);
          x += fl; if (i < nb2) { keyBlock(c, x, y0, g, 2, g * .3); x += 8 * g; }
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
  function board() {
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
    g.userData.top = HF + .001; g.userData.u = u; g.userData.W = W; g.userData.D = D;
    g.userData.pt = (i, j) => [(i - 4) * u, (j - 4.5) * u];   // i: file 0..8 left → right, j: rank 0..9 far → near
    g.userData.piece = piece;
    return g;
  }

  /* ---------- pieces: thick turned discs, the character engraved and filled with colour ---------- */
  const PR = u * .43, PH = u * .27, FACE = PR * .84, TYPE = ' KAEHRCP';
  const GL = { r: ' 帥仕相傌俥炮兵', b: ' 將士象馬車砲卒' };
  const geos = {};
  function bodyGeo() {
    const key = LO() ? 'lo' : 'hi'; if (geos[key]) return geos[key];
    const TT = T(), e = PH * .22, pts = [new TT.Vector2(0, 0), new TT.Vector2(PR - e * 1.2, 0)];
    const seg = LO() ? 2 : 3;
    for (let k = 1; k <= seg; k++) { const a = -Math.PI / 2 + Math.PI / 2 * k / seg; pts.push(new TT.Vector2(PR - e + Math.cos(a) * e, e + Math.sin(a) * e)); }
    pts.push(new TT.Vector2(PR + .006, PH * .5));   // a slight barrel
    for (let k = 0; k <= seg; k++) { const a = Math.PI / 2 * k / seg; pts.push(new TT.Vector2(PR - e + Math.cos(a) * e, PH - e + Math.sin(a) * e)); }
    pts.push(new TT.Vector2(FACE + .02, PH), new TT.Vector2(FACE + .008, PH - .012), new TT.Vector2(FACE, PH - .004), new TT.Vector2(0, PH - .004));   // a fine groove round the face
    const g = new TT.LatheGeometry(pts, LO() ? 20 : 30); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function faceGeo() {
    if (geos.face) return geos.face;
    const g = new (T().CircleGeometry)(FACE, LO() ? 20 : 30); if (X.share) X.share(g); return (geos.face = g);
  }
  function faceTex(code) {
    const black = code >= 8, ch = GL[black ? 'b' : 'r'][code & 7];
    return canvasTex('xqFace2_' + code, 256, 256, (c, Wd) => {
      const r = Wd / 2;
      const gr = c.createRadialGradient(r * .75, r * .65, r * .05, r, r, r * 1.05); gr.addColorStop(0, '#fbecc9'); gr.addColorStop(.7, '#ecd2a0'); gr.addColorStop(1, '#d6b27a');
      c.fillStyle = gr; c.fillRect(0, 0, Wd, Wd);
      const wd = X.wood ? X.wood('xqPw', '#efd6a6', '#caa067', 256, 256, 1.4) : null;
      if (wd) { c.globalAlpha = .35; c.globalCompositeOperation = 'multiply'; c.drawImage(wd.image, 0, 0, Wd, Wd); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      const ink = black ? '#1d1916' : '#b5221a';
      // engraved ring and character: a light lower edge, a dark upper edge, the colour inside
      const engrave = (draw) => {
        c.save(); c.translate(Wd * .006, Wd * .008); c.globalAlpha = .9; draw('rgba(255,246,222,.9)'); c.restore();
        c.save(); c.translate(-Wd * .005, -Wd * .006); draw('rgba(70,40,15,.55)'); c.restore();
        draw(ink);
      };
      engrave(col => { c.strokeStyle = col; c.lineWidth = Wd * .022; c.beginPath(); c.arc(r, r, r * .83, 0, 7); c.stroke(); });
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${Math.round(Wd * .54)}px ${MIN}`;
      engrave(col => { c.fillStyle = col; c.fillText(ch, r, r + Wd * .025); });
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
  function piece(code, o = {}) {
    const TT = T(), black = code >= 8, tp = code & 7;
    const wood = mat('pw', () => phys({ map: bodyTex(), color: 0xffffff, roughness: .4, clearcoat: .45, clearcoatRoughness: .3 }));
    const fm = mat('pf' + code, () => phys({ map: faceTex(code), color: 0xffffff, roughness: .45, clearcoat: .35, clearcoatRoughness: .35 }));
    const body = new TT.Mesh(bodyGeo(), wood); body.castShadow = true; body.receiveShadow = true;
    const cap = new TT.Mesh(faceGeo(), fm); cap.rotation.x = -Math.PI / 2; cap.position.y = PH - .003; cap.castShadow = false; cap.receiveShadow = true;
    const p = new TT.Group(); p.add(body, cap); p.userData = { code, type: TYPE[tp], black, h: PH, r: PR };
    return p;
  }

  X.MODELS.xiangqi = function (live) {
    const g = board(), Y0 = g.userData.top;
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
  X.xiangqi = { board, piece, u, W, D };
})();
