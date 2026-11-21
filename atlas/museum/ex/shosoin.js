/* 所蔵品：木画紫檀棊局（正倉院 北倉36） — units: 1 = 1 cm; 49.0 × 48.8 cm, 12.7 cm high (the Shōsōin's record).
   Rebuilt after the Shōsōin's photographs (CO0000000418–436, 2026-11-21): a go board of shitan veneer, ruled 19 × 19 in ivory,
   with 17 flower points — every third line round a square on the 4th lines from the edge, and the centre — framed by a band of
   small ivory lozenges; a shallow body whose sides are divided into four panels by bands of lozenges, each panel with figures in
   dyed ivory (birds, deer, a lion, camels, horsemen, flowers); two drawers, at diagonally opposite ends of two opposite sides,
   with a beaded gilt ring pull, holding turtle-shaped trays; the body on a 床脚: on each side two openings with cusped tops,
   a post between them and the corner legs set with small birds and deer, all standing on a floor rail faced on top with 華角
   (horn over red, with dark flowers). Heights measured on the photographs: body 4.6, base 8.1 (rail included) — estimates;
   the figures are drawn after the photographs, not traced. */
(function () {
  'use strict';
  // the figures of the sixteen side panels, taken off the Shōsōin's detail photographs CO0000000428–436 (4 rows = the sides A, C, B, D,
  // 4 panels each, 512 × 150): alpha = the ivory figure, green / blue = where it is dyed green / red. Outlines and dye only.
  const HERE = (document.currentScript && document.currentScript.src) || location.href; let FIG = null;
  (window.AtlasEx = window.AtlasEx || {}).shosoin = {
    ready: () => new Promise(res => { const im = new Image(); im.onload = () => { FIG = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/shosoin-figures.webp', HERE).href; setTimeout(res, 8000); }),
    build(TT, X, K) {
      const G = new TT.Group();
      const S = 48.9, H = 12.7, RAIL = 1.0, BASE = 7.4,   // (measured on the Shōsōin's oblique photograph: body 5.3, openings 5.4, floor frame 1.0)
        BODY = H - BASE, TOP = .15;
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#331b14', b: '#20100b', seed: 21, sx: .5, sy: 9, warp: .35, pores: .003 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 22, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .4, clearcoatRoughness: .35 });
      const ivory = K.mat({ color: '#e9dcbc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      const C = { iv: '#e6d2a4', box: '#d9b46a', grn: '#7d9468', red: '#b98a62', dk: '#3a1a10', tan: '#c49a5c', pink: '#d99a86' };
      // dyed, engraved ivory (撥鏤風): the piece stays ivory, washed with colour in places and pricked with fine dots (the Shōsōin's detail photographs)
      let dq = 5; const dr = () => ((dq = (dq * 16807) % 2147483647) / 2147483647);
      const dye = (g, col) => { g.save(); g.clip('evenodd'); g.fillStyle = '#eadfc4'; g.fillRect(-45, -45, 90, 80);
        const w1 = col === C.grn ? '#7fa07c' : col === C.iv ? '#e6c9a0' : '#e09a70', w2 = col === C.grn ? '#d07a5c' : '#86a89a';
        let gr = g.createRadialGradient(-6 + dr() * 12, -6, 2, 0, 0, 30); gr.addColorStop(0, w1); gr.addColorStop(.55, w1); gr.addColorStop(1, 'rgba(234,223,196,0)'); g.globalAlpha = .9; g.fillStyle = gr; g.fillRect(-45, -45, 90, 80);
        gr = g.createRadialGradient(18 - dr() * 40, 6, 1, 10, 4, 16); gr.addColorStop(0, w2); gr.addColorStop(1, 'rgba(234,223,196,0)'); g.globalAlpha = .7; g.fillStyle = gr; g.fillRect(-45, -45, 90, 80);
        g.globalAlpha = .7; g.fillStyle = '#8a3a22'; for (let i = 0; i < 46; i++) { g.beginPath(); g.arc(-30 + dr() * 60, -24 + dr() * 44, .5, 0, 6.29); g.fill(); }
        g.restore(); };
      const sil = (g, kind, x, y, k, col) => {   // a figure in silhouette with a few engraved lines (the 撥鏤-like detail)
        g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = col; g.strokeStyle = 'rgba(60,26,12,.7)'; g.lineWidth = .7; g.beginPath();
        if (kind === 'camel') { g.moveTo(-26, 4); g.quadraticCurveTo(-24, -14, -10, -16); g.quadraticCurveTo(-4, -26, 2, -16); g.quadraticCurveTo(8, -24, 14, -14); g.quadraticCurveTo(20, -12, 22, -22); g.lineTo(30, -26); g.lineTo(31, -21); g.lineTo(26, -18); g.quadraticCurveTo(24, -4, 18, 2);
          g.lineTo(18, 22); g.lineTo(14, 22); g.lineTo(13, 4); g.lineTo(-14, 4); g.lineTo(-15, 22); g.lineTo(-19, 22); g.lineTo(-20, 4); g.closePath(); }
        else if (kind === 'elephant') { g.moveTo(-28, -2); g.quadraticCurveTo(-26, -24, 0, -24); g.quadraticCurveTo(18, -24, 22, -10); g.quadraticCurveTo(30, -6, 30, 8); g.quadraticCurveTo(30, 20, 34, 22); g.lineTo(28, 22); g.quadraticCurveTo(24, 10, 22, 4);
          g.lineTo(18, 22); g.lineTo(12, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-14, 22); g.lineTo(-20, 22); g.lineTo(-20, 4); g.quadraticCurveTo(-28, 6, -28, -2); g.closePath(); }
        else if (kind === 'bird') { g.moveTo(-14, 2); g.quadraticCurveTo(-2, -10, 10, -6); g.lineTo(16, -10); g.lineTo(14, -4); g.quadraticCurveTo(10, 6, -4, 6); g.lineTo(-18, 12); g.lineTo(-12, 4); g.closePath(); g.moveTo(0, -2); g.quadraticCurveTo(-8, -18, -20, -16); g.quadraticCurveTo(-10, -8, 0, -2); }
        else if (kind === 'man') {   // a foreigner in a peaked cap and boots, leading with a rope
          g.arc(0, -19, 3.6, 0, 6.29); g.moveTo(-3.4, -21); g.lineTo(0, -29); g.lineTo(3.4, -21); g.closePath();
          g.moveTo(-4.5, -15); g.lineTo(4.5, -15); g.lineTo(6, 6); g.lineTo(3, 6); g.lineTo(2.6, 22); g.lineTo(-.4, 22); g.lineTo(0, 7); g.lineTo(-1.6, 22); g.lineTo(-4.6, 22); g.lineTo(-3.6, 6); g.lineTo(-6, 6); g.closePath();
          g.moveTo(4, -12); g.lineTo(13, -8); g.lineTo(12.4, -6.6); g.lineTo(3.6, -10); g.closePath(); }
        else if (kind === 'deer') { g.moveTo(-20, -2); g.quadraticCurveTo(-18, -12, -4, -12); g.lineTo(10, -12); g.quadraticCurveTo(14, -14, 15, -22); g.lineTo(21, -24); g.lineTo(22, -20); g.lineTo(18, -18); g.quadraticCurveTo(16, -6, 12, -2);
          g.lineTo(13, 22); g.lineTo(10, 22); g.lineTo(8, 0); g.lineTo(-12, 0); g.lineTo(-13, 22); g.lineTo(-16, 22); g.lineTo(-16, 0); g.closePath();
          g.moveTo(16, -22); g.lineTo(12, -32); g.lineTo(13, -32.5); g.lineTo(16.5, -25); g.lineTo(19, -34); g.lineTo(20, -33.5); g.lineTo(18, -23); g.closePath(); }
        else if (kind === 'rider') {   // a mounted archer turning in the saddle to shoot back (the "Parthian shot")
          g.moveTo(-24, 6); g.quadraticCurveTo(-22, -8, -6, -8); g.lineTo(12, -10); g.lineTo(20, -20); g.lineTo(24, -16); g.lineTo(18, -6); g.quadraticCurveTo(20, 4, 14, 6); g.lineTo(18, 22); g.lineTo(14, 22); g.lineTo(9, 7); g.lineTo(-14, 7); g.lineTo(-20, 22); g.lineTo(-24, 22); g.closePath();
          g.moveTo(-4, -8); g.lineTo(-2, -22); g.arc(-2, -25, 3.2, 0, 6.29); g.moveTo(-2, -18); g.lineTo(-14, -22); g.lineTo(-14, -20); g.lineTo(-2, -16); g.closePath();
          g.moveTo(-16, -30); g.quadraticCurveTo(-22, -21, -16, -12); g.lineTo(-15.4, -12.4); g.quadraticCurveTo(-20.6, -21, -15.4, -29.6); g.closePath(); }
        else if (kind === 'rider0') { g.moveTo(-24, 6); g.quadraticCurveTo(-22, -8, -6, -8); g.lineTo(12, -10); g.lineTo(20, -20); g.lineTo(24, -16); g.lineTo(18, -6); g.quadraticCurveTo(20, 4, 14, 6); g.lineTo(16, 22); g.lineTo(12, 22); g.lineTo(9, 7); g.lineTo(-14, 7); g.lineTo(-18, 22); g.lineTo(-22, 22); g.closePath();
          g.moveTo(-6, -8); g.lineTo(-4, -22); g.arc(-3, -25, 3.2, 0, 6.29); g.moveTo(-2, -18); g.lineTo(8, -26); }
        else if (kind === 'runner' || kind === 'hound' || kind === 'hunter' || kind === 'hare') {   // the flying gallop of the hunting scenes on the sides
          const hd = kind === 'hound' ? [[18, -6], [24, -14], [30, -11], [33, -10], [27, -6], [20, 0]] : [[16, -7], [20, -18], [26, -17], [30, -14], [24, -12], [19, -1]];
          g.moveTo(-20, -4); g.quadraticCurveTo(-8, -12, 10, -10); g.lineTo(hd[0][0], hd[0][1]); hd.slice(1).forEach(([a, b]) => g.lineTo(a, b));
          g.lineTo(34, 3); g.lineTo(35, 5.5); g.lineTo(28, 4); g.lineTo(18, 3);              // forelegs stretched forward
          g.quadraticCurveTo(0, 6, -12, 3); g.lineTo(-32, 10); g.lineTo(-33, 7.5); g.lineTo(-27, 5); g.lineTo(-18, 1);   // hind legs stretched back
          g.quadraticCurveTo(-23, -1, -20, -4); g.closePath();
          if (kind === 'hound') { g.moveTo(-20, -3); g.quadraticCurveTo(-30, -6, -32, -16); g.quadraticCurveTo(-27, -8, -19, -5.5); g.closePath(); g.moveTo(24, -13); g.lineTo(21, -20); g.lineTo(26, -14); g.closePath(); }
          else { g.moveTo(-20, -4); g.lineTo(-25, -9); g.lineTo(-21, -6); g.closePath(); }
          if (kind === 'runner') { g.moveTo(22, -18); g.lineTo(18, -30); g.lineTo(13, -33); g.lineTo(18.6, -31); g.lineTo(20, -36); g.lineTo(20.4, -30); g.lineTo(23.6, -19); g.closePath();
            g.moveTo(24, -18); g.lineTo(27, -28); g.lineTo(32, -31); g.lineTo(28, -27); g.lineTo(25.4, -18); g.closePath(); }
          if (kind === 'hare') { g.moveTo(22, -17); g.quadraticCurveTo(14, -30, 10, -31); g.quadraticCurveTo(15, -24, 19, -16); g.closePath(); g.moveTo(25, -17); g.quadraticCurveTo(21, -31, 18, -33); g.quadraticCurveTo(20, -24, 22, -17); g.closePath(); }
          if (kind === 'hunter') {   // the rider turns in the saddle and draws the bow backwards
            g.moveTo(-4, -10); g.lineTo(-7, -24); g.lineTo(-1, -24); g.lineTo(2, -10); g.closePath(); g.moveTo(-1, -28); g.arc(-4, -28, 3.4, 0, 6.29);
            g.moveTo(-5, -21); g.lineTo(-17, -23); g.lineTo(-17, -21); g.lineTo(-5, -19); g.closePath();
            g.moveTo(-17, -33); g.quadraticCurveTo(-24, -22, -17, -11); g.lineTo(-16.2, -11.4); g.quadraticCurveTo(-22.4, -22, -16.2, -32.6); g.closePath(); }
          g.fill('evenodd'); dye(g, col); g.stroke(); g.beginPath(); g.moveTo(-8, -6); g.quadraticCurveTo(2, -3, 12, -6); g.moveTo(14, -4); g.lineTo(17, -12); g.stroke();   // engraved lines
          g.fillStyle = 'rgba(40,14,6,.75)'; g.beginPath(); g.arc(kind === 'hound' ? 26 : 23.5, kind === 'hound' ? -11 : -15, 1, 0, 6.29); g.fill(); g.restore(); return; }
        else if (kind === 'parrot') {   // a long-tailed parrot perched on a bunch of grapes with its leaves (the drawer's front, detail photograph 428)
          g.moveTo(-6, -12); g.quadraticCurveTo(4, -22, 14, -15); g.lineTo(19, -12); g.lineTo(14, -10); g.quadraticCurveTo(11, -1, -1, 1); g.lineTo(-31, 8); g.lineTo(-29, 4); g.lineTo(-9, -5); g.closePath();
          g.moveTo(3, -10); g.quadraticCurveTo(-8, -26, -25, -20); g.quadraticCurveTo(-10, -9, 3, -10); g.closePath();
          for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) { const gx = 2 + i * 5 + r * 2.5, gy = 7 + r * 4.5; g.moveTo(gx + 2.4, gy); g.arc(gx, gy, 2.4, 0, 6.29); }
          g.moveTo(-4, 16); g.quadraticCurveTo(-14, 10, -18, 18); g.quadraticCurveTo(-10, 24, -4, 16); g.closePath(); g.moveTo(16, 16); g.quadraticCurveTo(24, 10, 30, 17); g.quadraticCurveTo(22, 24, 16, 16); g.closePath(); }
        else if (kind === 'plant') {   // a flowering plant: a straight stem, a flower at its head, two pairs of leaves
          g.moveTo(-.8, 22); g.lineTo(-.8, -8); g.lineTo(.8, -8); g.lineTo(.8, 22); g.closePath();
          for (let q = 0; q < 5; q++) { const a = q / 5 * 6.283 - 1.57, ex = Math.cos(a) * 5.4, ey = -15 + Math.sin(a) * 5.4; g.moveTo(ex + 4.2, ey); g.ellipse(ex, ey, 4.2, 2.6, a, 0, 6.29); }
          [[4, 1], [14, .8]].forEach(([yy, k]) => [-1, 1].forEach(d => { g.moveTo(0, yy); g.quadraticCurveTo(d * 9 * k, yy - 9 * k, d * 13 * k, yy - 2); g.quadraticCurveTo(d * 8 * k, yy + 3, 0, yy); g.closePath(); })); }
        else if (kind === 'hill') {   // little layered hills (on the legs, detail photographs)
          [[-12, 6, 14, 9], [6, 8, 16, 11], [-2, 0, 13, 12]].forEach(([cx, by, hw, hh]) => { g.moveTo(cx - hw, by); g.quadraticCurveTo(cx - hw * .3, by - hh * 1.6, cx, by - hh); g.quadraticCurveTo(cx + hw * .5, by - hh * .9, cx + hw, by); g.closePath(); }); }
        else if (kind === 'tree') { g.moveTo(-1.6, 24); g.lineTo(-1.2, -2); g.lineTo(1.2, -2); g.lineTo(1.6, 24); g.closePath(); for (let i = 0; i < 5; i++) { const yy = -4 - i * 6, ww = 14 - i * 2.2; g.moveTo(0, yy - 6); g.quadraticCurveTo(ww, yy, 0, yy + 2); g.quadraticCurveTo(-ww, yy, 0, yy - 6); } }
        else if (kind === 'flower') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(0, 0); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 3, a, 0, 6.29); } }
        else if (kind === 'lion') { g.moveTo(-24, 4); g.quadraticCurveTo(-22, -12, -4, -12); g.quadraticCurveTo(8, -24, 20, -14); g.quadraticCurveTo(26, -8, 22, 0); g.lineTo(18, 22); g.lineTo(13, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-17, 22); g.lineTo(-21, 22); g.lineTo(-22, 6);
          g.quadraticCurveTo(-34, 0, -30, -12); g.quadraticCurveTo(-28, -2, -24, 4); g.closePath(); }
        g.fill('evenodd'); if (kind !== 'flower' && kind !== 'tree') dye(g, col); g.stroke(); g.restore();
      };

      // a band of small ivory lozenges (the "diamond chain" round every edge in the photographs)
      const chain = (g, x0, y0, len, wd, vert) => { g.save(); g.translate(x0, y0); if (vert) g.rotate(Math.PI / 2);
        g.fillStyle = 'rgba(14,6,4,.35)'; g.fillRect(0, 0, len, wd); g.fillStyle = '#d8bb7c'; g.fillRect(0, 0, len, wd * .07); g.fillRect(0, wd * .93, len, wd * .07);
        // each motif is a lozenge of four small ivory squares (as on the photographed sides), a dark dot in the middle
        const n = Math.max(1, Math.round(len / (wd * .95))), q = wd * .13;
        for (let i = 0; i < n; i++) { const cx = (i + .5) * len / n, cy = wd / 2; g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = '#e4d2a2';
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => g.fillRect(u * q * 1.15 - q / 2, v * q * 1.15 - q / 2, q, q)); g.restore(); }
        g.restore(); };
      /* ---------- the playing face ---------- */
      const N = 19, BAND = .7, M = 1.15, P = (S - 2 * M) / (N - 1);
      const faceT = K.tex(2048, 2048, (g, w) => {
        g.drawImage(shT.image, 0, 0, w, w); const s = w / S;
        // the veneer is laid in strips running across the board, each a little different in tone (as in the top photograph)
        let sx0 = 0, sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        while (sx0 < w) { const sw = s * (1.6 + rnd() * 2.2), t = rnd(); g.fillStyle = t < .5 ? `rgba(10,3,2,${.1 + t * .35})` : `rgba(120,40,30,${(t - .5) * .22})`; g.fillRect(sx0, 0, sw, w); sx0 += sw; }
        chain(g, 0, 0, w, BAND * s, false); chain(g, 0, w - BAND * s, w, BAND * s, false); chain(g, BAND * s, 0, w, BAND * s, true); chain(g, w, 0, w, BAND * s, true);
        for (let i = 0; i < N; i++) { const p = (M + i * P) * s, lw = s * .055;
          g.fillStyle = 'rgba(20,8,4,.5)'; g.fillRect(M * s - lw, p - lw / 2 - s * .02, (S - 2 * M) * s + 2 * lw, lw + s * .04); g.fillRect(p - lw / 2 - s * .02, M * s - lw, lw + s * .04, (S - 2 * M) * s + 2 * lw);
          g.fillStyle = '#d6bd88'; g.fillRect(M * s - lw / 2, p - lw / 2, (S - 2 * M) * s + lw, lw); g.fillRect(p - lw / 2, M * s - lw / 2, lw, (S - 2 * M) * s + lw); }
        // 17 flower points (from the top photograph): lines 4, 7, 10, 13, 16 round a square on the 4th lines, and the centre
        const pts = [[9, 9]]; [3, 6, 9, 12, 15].forEach(k => { pts.push([3, k], [15, k]); if (k !== 3 && k !== 15) pts.push([k, 3], [k, 15]); });
        pts.forEach(([a, b]) => { const cx = (M + a * P) * s, cy = (M + b * P) * s, R = s * .42; g.save(); g.translate(cx, cy);
          g.beginPath(); g.arc(0, 0, R, 0, 6.29); g.fillStyle = '#2a140c'; g.fill();
          g.beginPath(); g.arc(0, 0, R * .82, 0, 6.29); g.strokeStyle = '#e2cf9e'; g.lineWidth = R * .22; g.stroke();   // an ivory ring (the flower's rim)
          for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(R * .4, 0, R * .26, R * .1, 0, 0, 6.29); g.fillStyle = '#c9a56c'; g.fill(); }
          g.beginPath(); g.arc(0, 0, R * .16, 0, 6.29); g.fillStyle = '#ecdcb4'; g.fill(); g.restore(); });
      });
      const faceMat = K.mat({ map: faceT, color: '#ffffff', roughness: .55, clearcoat: .12, clearcoatRoughness: .4 });
      /* ---------- the body's sides: lozenge bands, four panels of figures in dyed ivory ---------- */
      const VIGN = [   // all sixteen panels after the Shōsōin's detail photographs (CO0000000428–436), four to a side
        // side A (a drawer): parrots on grapes · a man leading camels, a plant · a stag and a winged beast · a deer, a hound, a rider
        [['parrot', 2], ['parrot', 2]], [['man', 0], ['camel', 1], ['camel', 2], ['plant', 2]], [['runner', 1], ['lion', 2]], [['runner', 1], ['hound', 0], ['hunter', 2]],
        // side C (the other drawer): camels · mounted hunters · long-tailed birds about a plant · pheasants among leaves
        [['camel', 1], ['camel', 2]], [['hunter', 0], ['hound', 1], ['hunter', 0]], [['parrot', 2], ['plant', 2], ['parrot', 0]], [['parrot', 1], ['plant', 2], ['parrot', 1]],
        // side B: riders hunting · a hare, a plant, deer · camels and a seated man · geese and a plant
        [['hunter', 1], ['hound', 0], ['hunter', 2]], [['hare', 0], ['plant', 2], ['deer', 1], ['deer', 3]], [['camel', 1], ['man', 0], ['camel', 2]], [['bird', 2], ['plant', 2], ['bird', 1]],
        // side D: a winged beast and two deer · long-tailed birds facing over a plant · men and camels · a plant and two running beasts
        [['lion', 1], ['runner', 2], ['runner', 1]], [['parrot', 2], ['plant', 2], ['parrot', 2]], [['camel', 2], ['man', 0], ['camel', 1], ['man', 1]], [['plant', 2], ['hound', 0], ['hound', 2]],
      ];
      const PAL = [C.iv, C.red, C.grn, '#d8b878'];
      // the figures in ivory with their dyes, and a dark outline round each (the joint of the inlay)
      let figC = null; if (FIG) { figC = document.createElement('canvas'); figC.width = FIG.width; figC.height = FIG.height; const q = figC.getContext('2d'); q.drawImage(FIG, 0, 0); const im = q.getImageData(0, 0, figC.width, figC.height), d = im.data;
        for (let i = 0; i < d.length; i += 4) { const gr = Math.min(1, d[i + 1] / 255 * 1.5), rd = Math.min(1, d[i + 2] / 255 * 1.4); let c = [222, 206, 168]; c = c.map((v, k) => v + ([96, 140, 108][k] - v) * gr); c = c.map((v, k) => v + ([206, 112, 78][k] - v) * rd); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; } q.putImageData(im, 0, 0); }
      const panelFig = (g, row, col, x, y, w2, h2) => { g.save(); g.shadowColor = 'rgba(14,6,3,.9)'; g.shadowBlur = 2.5; g.drawImage(figC, col * 512, row * 150, 512, 150, x, y, w2, h2); g.restore(); };
      const sideTex = (seed, drawerAt) => K.tex(2048, Math.round(2048 * (BODY - TOP) / S), (g, w, h) => {
        g.drawImage(shT.image, 0, 0, w, h); const s = w / S, cb = s * .85;
        chain(g, 0, 0, w, cb, false); chain(g, 0, h - cb, w, cb, false);
        const pw = w / 4;
        for (let i = 0; i < 4; i++) { const x0 = i * pw;
          chain(g, x0 + s * .75, cb, h - 2 * cb, s * .75, true);
          g.strokeStyle = C.iv; g.lineWidth = s * .05; g.strokeRect(x0 + s * .85, cb + s * .1, pw - s * .95, h - 2 * cb - s * .2);
          if (figC) { panelFig(g, seed, i, x0 + s * 1.0, cb + s * .22, pw - s * 1.25, h - 2 * cb - s * .44); continue; }
          const v = VIGN[(seed * 4 + i) % VIGN.length], cy = h * .54;
          v.forEach(([kd, c], n) => { const x = x0 + s * .6 + (n + .5) * (pw - s * .7) / v.length; sil(g, kd, x, cy, s * (v.length > 3 ? .034 : .04), kd === 'plant' ? C.grn : PAL[c % 4]); });
        }
        chain(g, w, cb, h - 2 * cb, s * .75, true);
      });
      const sides = [0, 1, 2, 3].map(i => K.mat({ map: sideTex(i), color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .35 }));
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); G.add(o); return o; };
      add(new TT.BoxGeometry(S, BODY - TOP, S), [sides[0], sides[1], shitan, shitan, sides[2], sides[3]], 0, BASE + (BODY - TOP) / 2, 0);
      const edgeT = K.tex(1024, 64, (g, w, h) => { g.fillStyle = '#c9a564'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(50,24,8,.5)'; for (let x = 0; x < w; x += 8) g.fillRect(x, h * .35, 3, h * .3); });
      const edgeM = K.mat({ map: edgeT, color: '#ffffff', roughness: .45, clearcoat: .35 });
      add(new TT.BoxGeometry(S + .1, TOP, S + .1), [edgeM, edgeM, faceMat, shitan, edgeM, edgeM], 0, H - TOP / 2, 0);
      /* ---------- the 床脚: corner legs, a post in the middle of each side, openings with cusped tops, the floor rail ---------- */
      const LEG = 1.45, POST = 1.9, OH = BASE - RAIL - .05;   // leg / post width; the openings' height (the cusps hang right under the body)
      const skirt = new TT.Shape(); skirt.moveTo(-S / 2, 0); skirt.lineTo(S / 2, 0); skirt.lineTo(S / 2, BASE - RAIL); skirt.lineTo(-S / 2, BASE - RAIL); skirt.closePath();
      const open = (x0, x1) => { const p = new TT.Path(), top = OH, E = 1.55, B = 1.9, nC = 7, xa0 = x0 + E, xa1 = x1 - E, cw = (xa1 - xa0) / nC, dip = 1.45, at = .5;
        // (the Shōsōin's detail photographs CO0000000428–430) each end a full round bulge — the leg narrowest two-thirds of the way up and
        // spreading to its foot — and across the top seven arches, their points hanging down between them
        p.moveTo(x0 + B, 0); p.lineTo(x1 - B, 0); p.bezierCurveTo(x1 + .35, .15, x1 + .45, top - 1.3, xa1, top - dip);
        for (let i = nC; i > 0; i--) { const xa = xa0 + i * cw, xb = xa - cw; p.bezierCurveTo(xa - cw * .1, top - at + .15, xb + cw * .1, top - at + .15, xb, top - dip); }
        p.bezierCurveTo(x0 - .45, top - 1.3, x0 - .35, .15, x0 + B, 0); return p; };
      const half = (S - 2 * LEG - POST) / 2;
      skirt.holes.push(open(-S / 2 + LEG, -S / 2 + LEG + half), open(S / 2 - LEG - half, S / 2 - LEG));
      const skG = new TT.ExtrudeGeometry(skirt, { depth: 1.2, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 10 });
      // the legs' faces: dark shitan edged in ivory, little birds and deer set into the legs and the post
      const legT = K.tex(2048, Math.round(2048 * (BASE - RAIL) / S), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); const s = w / S;
        g.strokeStyle = C.iv; g.lineWidth = s * .08; g.strokeRect(s * .15, s * .1, w - s * .3, h - s * .2);
        g.strokeStyle = '#e4cf9a'; g.lineWidth = s * .1; skirt.holes.forEach(hp => { g.beginPath(); hp.getPoints(24).forEach((p, i) => { const X = (p.x + S / 2) * s, Y = h - p.y * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); });
        // each leg and the post: a bird in flight at the top, hills in the middle, a deer at the foot; an ivory line down the post (detail photographs)
        g.fillStyle = C.iv; g.fillRect(S / 2 * s - s * .05, s * .9, s * .1, h - s * 1.0);
        [[LEG * .62, 1], [S / 2 - POST * .28, 1], [S / 2 + POST * .28, -1], [S - LEG * .62, -1]].forEach(([x, d], i) => { [['bird', .9, .022, C.box], ['hill', .56, .02, C.grn], ['deer', .13, .022, i % 2 ? C.grn : C.red]].forEach(([kd, fy, k, col]) => { g.save(); g.translate(x * s, h * (1 - fy)); g.scale(d, 1); sil(g, kd, 0, 0, s * k, col); g.restore(); }); }); });
      legT.repeat.set(1 / S, 1 / (BASE - RAIL)); legT.offset.set(.5, 0);
      const legM = K.mat({ map: legT, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      for (let i = 0; i < 4; i++) { const m = new TT.Mesh(skG, [legM, shitan]), a = i * Math.PI / 2; m.position.set(Math.sin(a) * (S / 2 - 1.2), RAIL, Math.cos(a) * (S / 2 - 1.2)); m.rotation.y = a; m.scale.x = .995; G.add(m); }   // (each panel a hair short: its end face lay in the same plane as the next panel's front and the two fought at the corner legs — a flicker)
      add(new TT.BoxGeometry(S - 2.4, .5, S - 2.4), shitan, 0, BASE - .25, 0);   // the floor of the body
      // the floor rail: horn over red (華角), dark flowers; its outer faces with the lozenge band
      // (the floor frame's top: painting under a translucent sheet — a deep red ground clouded with black and specks of green and gold; the photographs)
      const kakT = K.tex(1024, 128, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 26, y / 18, 3), b = n(x / 7 + 9, y / 7, 2), k = Math.max(0, Math.min(1, (a - .42) * 4)), gsp = b > .78 ? 1 : 0, i = (y * w + x) * 4;
          d[i] = gsp ? 150 : 150 - k * 118 + b * 20; d[i + 1] = gsp ? 130 : 52 - k * 36 + b * 10; d[i + 2] = gsp ? 60 : 30 - k * 18; d[i + 3] = 255; } g.putImageData(img, 0, 0); });
      const kak = K.mat({ map: kakT, color: '#ffffff', roughness: .28, clearcoat: .85, clearcoatRoughness: .18 });
      const railSide = K.tex(2048, Math.round(2048 * RAIL / S), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); chain(g, 0, 0, w, h, false); });
      const rsM = K.mat({ map: railSide, color: '#ffffff', roughness: .45, clearcoat: .35 });
      const RW = 3.0;
      const rsEnd = rsM.clone(); rsEnd.map = railSide.clone(); rsEnd.map.repeat.set(RW / S, 1); rsEnd.map.needsUpdate = true;   // the frame's short end faces: the same band at the same scale (it was the whole length squeezed into 3 cm)
      [[S + .3, RW, 0, S / 2 - RW / 2 + .15], [S + .3, RW, 0, -S / 2 + RW / 2 - .15]].forEach(([w, d, x, z]) => add(new TT.BoxGeometry(w, RAIL, d), [rsEnd, rsEnd, kak, shitan, z > 0 ? rsM : shitan, z > 0 ? shitan : rsM], x, RAIL / 2, z));
      [[RW, S - 2 * RW + .3, S / 2 - RW / 2 + .15, 0], [RW, S - 2 * RW + .3, -S / 2 + RW / 2 - .15, 0]].forEach(([w, d, x, z]) => { const k2 = kak.clone(); k2.map = kakT.clone(); k2.map.center.set(.5, .5); k2.map.rotation = Math.PI / 2; k2.map.needsUpdate = true; add(new TT.BoxGeometry(w, RAIL, d), [x > 0 ? rsM : shitan, x > 0 ? shitan : rsM, k2, shitan, shitan, shitan], x, RAIL / 2, z); });
      /* ---------- the drawers: at diagonally opposite ends of the two side faces (±x); the near one pulled out ---------- */
      const DW = S / 4 - .95, DH = BODY - TOP - 1.75, OUT = 6.4, gilt = K.mat({ color: '#d6a84c', roughness: .3, metalness: 1 });
      const dark = K.mat({ color: '#2a1810', roughness: .6 });
      const DG = new TT.Group(); DG.rotation.y = 0; G.add(DG);
      const drawer = (sx, z, out) => { const g2 = new TT.Group(); g2.position.set(sx * (S / 2 + out), BASE + (BODY - TOP) / 2, z); g2.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; DG.add(g2);
        // the drawer front is one of the side's panels: birds and flowers in dyed ivory, a large beaded gilt ring in the middle (side A)
        const dfT = K.tex(1024, Math.round(1024 * DH / DW), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); const s2 = w / DW;
          g.strokeStyle = C.iv; g.lineWidth = s2 * .05; g.strokeRect(s2 * .1, s2 * .1, w - s2 * .2, h - s2 * .2);
          if (figC) { panelFig(g, sx > 0 ? 0 : 1, 0, s2 * .25, s2 * .2, w - s2 * .5, h - s2 * .4); return; }
          const kd = sx > 0 ? 'parrot' : 'camel';   // (one drawer carries the parrots, the other two camels)
          sil(g, kd, w * .2, h * .48, s2 * .05, sx > 0 ? C.grn : C.red); g.save(); g.translate(w, 0); g.scale(-1, 1); sil(g, kd, w * .2, h * .48, s2 * .05, C.grn); g.restore(); });
        const f = new TT.Mesh(new TT.BoxGeometry(DW, DH, .45), [dark, dark, dark, dark, K.mat({ map: dfT, color: '#ffffff', roughness: .5, clearcoat: .35 }), dark]); g2.add(f);
        const RR = .78, ring = new TT.Mesh(new TT.TorusGeometry(RR, .16, 10, 32), gilt); ring.position.set(0, -.15, .55); g2.add(ring);
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, b = new TT.Mesh(new TT.SphereGeometry(.17, 10, 8), gilt); b.position.set(Math.cos(a) * RR, -.15 + Math.sin(a) * RR, .62); g2.add(b); }   // the beaded ring
        const knob = new TT.Mesh(new TT.CylinderGeometry(.2, .2, .4, 12), gilt); knob.rotation.x = Math.PI / 2; knob.position.set(0, -.15 + RR + .1, .45); g2.add(knob);
        if (out > .1) { const sd = new TT.BoxGeometry(.35, DH - .3, out + 1); [-DW / 2 + .2, DW / 2 - .2].forEach(x => { const m = new TT.Mesh(sd, dark); m.position.set(x, -.15, -(out + 1) / 2); g2.add(m); });
          const bt = new TT.Mesh(new TT.BoxGeometry(DW, .3, out + 1), dark); bt.position.set(0, -DH / 2 + .15, -(out + 1) / 2); g2.add(bt);
          // the turtle-shaped holder for the stones (photographs CO0000000424 / 427: a shallow oval bowl, its wide rim the edge of the
          // shell with the plates drawn in silver lines on dark lacquer, the inside red-brown with a stippled floor, a red-brown head
          // flecked with gold reaching to the drawer's front, the feet showing under the rim)
          const RX = 4.3, RZ = 4.45, tr = new TT.Group(); tr.position.set(0, -DH / 2 + .3, -.45 - 2.0 - RZ); g2.add(tr);
          const nz = K.noise(77), bowlT = K.tex(1024, 448, (g, w, h) => { const row = h / 7, Y = v => h - v * row;   // v 0…7 along the profile
            g.fillStyle = '#3a2416'; g.fillRect(0, 0, w, h);
            const im = g.getImageData(0, 0, w, h), d = im.data;   // the floor: brown, stippled like shagreen; the wall: red-brown
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (h - y) / row, i = (y * w + x) * 4, n = nz(x * .5, y * .5, 2), m = nz(x * .03, y * .05, 3);
              let c = v < 1 ? [52 + n * 26, 36 + n * 16, 24 + n * 10] : v < 2.05 ? [78 + m * 36, 26 + m * 14, 16 + m * 8] : v < 4.1 ? [30 + m * 16, 29 + m * 15, 28 + m * 14] : [44 + m * 16, 26 + m * 10, 16 + m * 6];
              d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
            g.putImageData(im, 0, 0);
            g.strokeStyle = 'rgba(176,174,166,.8)'; g.lineWidth = 1.8; g.lineJoin = 'round';   // the plates of the shell's edge, silver lines
            const N = 22, pw = w / N, y0 = Y(3.05), y1 = Y(3.95), ym = Y(3.42);
            g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0); g.moveTo(0, y1); g.lineTo(w, y1); g.stroke();
            for (let k = 0; k < N; k++) { const x = k * pw; g.beginPath(); g.moveTo(x, y1); g.lineTo(x, ym + 4); g.lineTo(x + pw / 2, ym - 5); g.lineTo(x + pw, ym + 4); g.stroke();
              g.beginPath(); g.moveTo(x + pw / 2, ym - 5); g.lineTo(x + pw / 2, y0); g.stroke(); }
          });
          const prof = [[0, .3], [2.95, .3], [3.3, 1.5], [3.42, 1.62], [4.3, 1.02], [4.24, .84], [3.2, .12], [0, .12]].map(([r, y]) => new TT.Vector2(r / 4.3, y));
          const bowl = new TT.Mesh(new TT.LatheGeometry(prof, 44), K.mat({ map: bowlT, color: '#ffffff', roughness: .5, clearcoat: .25, clearcoatRoughness: .4, side: TT.DoubleSide })); bowl.scale.set(RX, 1, RZ); bowl.castShadow = bowl.receiveShadow = true; tr.add(bowl);
          const skinT = K.tex(256, 256, (g, w, h) => { const im = g.createImageData(w, h), d = im.data, n2 = K.noise(78);
            for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, m = n2(x * .04, y * .04, 3), f = n2(x * .9, y * .9, 1), gold = f > .8 ? 1 : 0;
              d[i] = gold ? 170 : 84 + m * 44; d[i + 1] = gold ? 120 : 34 + m * 20; d[i + 2] = gold ? 52 : 20 + m * 10; d[i + 3] = 255; } g.putImageData(im, 0, 0); });
          const skin = K.mat({ map: skinT, color: '#ffffff', roughness: .5, clearcoat: .2, clearcoatRoughness: .5 }), eyeM = K.mat({ color: '#15100c', roughness: .3 });
          const hp = [[.001, 2.2], [.2, 2.12], [.42, 1.75], [.6, 1.25], [.66, .85], [.56, .45], [.44, .1], [.46, -.5]].map(([r, y]) => new TT.Vector2(r, y));
          const hd = new TT.Mesh(new TT.LatheGeometry(hp, 20), skin); hd.rotation.x = Math.PI / 2 - .12; hd.scale.set(1, 1, .8); hd.position.set(0, .95, RZ - .25); hd.castShadow = true; tr.add(hd);
          [-1, 1].forEach(sx => { const e = new TT.Mesh(new TT.SphereGeometry(.1, 10, 8), eyeM); e.position.set(sx * .47, 1.12, RZ + .95); tr.add(e); });
          const fs = new TT.Shape(); fs.moveTo(-.42, 0); fs.lineTo(-.6, .95); for (let k = 0; k < 4; k++) fs.quadraticCurveTo(-.6 + (k + .5) * .3, 1.5, -.6 + (k + 1) * .3, 1.0); fs.lineTo(.42, 0); fs.closePath();
          const fg = new TT.ExtrudeGeometry(fs, { depth: .22, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 5 }); fg.rotateX(Math.PI / 2);   // lying flat, the toes toward +z
          [[.82, .8], [-.82, .8], [2.45, .7], [-2.45, .7]].forEach(([a, sc]) => { const ft = new TT.Mesh(fg, skin); ft.rotation.y = a; ft.scale.setScalar(sc); ft.position.set(Math.sin(a) * RX * .9, .3, Math.cos(a) * RZ * .9); ft.castShadow = true; tr.add(ft); });
        }
      };
      drawer(1, S / 2 - (.75 + S / 4) / 2, OUT); drawer(-1, -S / 2 + (.75 + S / 4) / 2, .3);
      return G;
    },
  };
})();
