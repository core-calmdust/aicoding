/* 狼影灯 — 背景（影絵の書き割り）。場所ごとに 遠景 far・中景 mid・近景 near の三層。
   mid は場所の顔になる建物を中央寄りに（薄い墨なので人形を隠さない）、near は左右の小道具（濃い墨）。
   舞台の中央下（人形の立つところ）は近景を空けておく。紙の切り抜き（.cut）で細部を出す。
   採点は tools/scene-quality.js。合格した場面だけが scenes-pass.js に載り、ゲームで使われる。 */
(function (root) {
  'use strict';
  const f = n => Math.round(n * 10) / 10;
  const rect = (x, y, w, h) => `M${f(x)},${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  const poly = pts => 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  const circ = (cx, cy, r) => `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0Z`;
  const ell = (cx, cy, rx, ry) => `M${f(cx - rx)},${f(cy)}a${f(rx)},${f(ry)} 0 1,0 ${f(2 * rx)},0a${f(rx)},${f(ry)} 0 1,0 ${f(-2 * rx)},0Z`;
  // a thick straight stroke as a filled shape
  function bar(x1, y1, x2, y2, w) { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2; return poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]]); }
  // a pointed (gothic) arch window: bottom-left x,y, width w, height h
  const gothic = (x, y, w, h) => `M${f(x)},${f(y)}V${f(y - h + w * .62)}Q${f(x)},${f(y - h + w * .08)} ${f(x + w / 2)},${f(y - h)}Q${f(x + w)},${f(y - h + w * .08)} ${f(x + w)},${f(y - h + w * .62)}V${f(y)}Z`;
  const roundArch = (x, y, w, h) => `M${f(x)},${f(y)}V${f(y - h + w / 2)}A${f(w / 2)},${f(w / 2)} 0 0,1 ${f(x + w)},${f(y - h + w / 2)}V${f(y)}Z`;
  // icicles hanging under a line
  function icicles(r, x1, x2, y, len) { let d = ''; for (let x = x1; x < x2; x += 7 + r() * 9) { const l = len * (.3 + r() * .9); d += poly([[x, y], [x + 3.2, y + l], [x + 6.4, y]]); } return d; }
  // a snow cap along a polyline (drawn as paper)
  function snowcap(r, pts, th) { const top = pts.map(p => [p[0], p[1] - 1]); const bot = pts.slice().reverse().map((p, i) => [p[0], p[1] + th * (.5 + r() * .7)]); return poly(top.concat(bot)); }
  function pine(x, y, h, r) { const w = h * .34; let d = ''; for (let i = 0; i < 5; i++) { const t = y - h * (i / 5.3), ww = w * (1 - i / 6); d += poly([[x - ww, t], [x - ww * .35, t - h * .08], [x, t - h * .3], [x + ww * .35, t - h * .08], [x + ww, t]]); } return d + rect(x - 3, y, 6, h * .1); }
  function bareTree(x, y, h, r, lean) {
    lean = lean || 0; let d = poly([[x - h * .035, y], [x - h * .012 + lean, y - h * .7], [x + h * .012 + lean, y - h * .7], [x + h * .035, y]]);
    const branch = (bx, by, ang, len, w, depth) => { if (depth > 3 || len < 8) return; const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len; d += bar(bx, by, ex, ey, w); branch(ex, ey, ang - .45 - r() * .3, len * .62, w * .62, depth + 1); branch(ex, ey, ang + .35 + r() * .3, len * .55, w * .6, depth + 1); };
    for (let i = 0; i < 7; i++) { const t = .32 + i * .1, bx = x + lean * t / .7, by = y - h * t; branch(bx, by, i % 2 ? -Math.PI / 2 + .55 + r() * .4 : -Math.PI / 2 - .55 - r() * .4, h * (.32 - i * .025), h * .022, 0); }
    return d;
  }
  // a crow on a branch
  const crow = (x, y, s) => `M${f(x)},${f(y)}c${f(4 * s)},${f(-9 * s)} ${f(14 * s)},${f(-11 * s)} ${f(20 * s)},${f(-6 * s)}l${f(7 * s)},${f(-3 * s)}l${f(-3 * s)},${f(5 * s)}c${f(2 * s)},${f(6 * s)} ${f(-6 * s)},${f(10 * s)} ${f(-14 * s)},${f(8 * s)}l${f(-12 * s)},${f(4 * s)}z`;
  function planks(x, y, w, h, step) { let d = ''; for (let yy = y + step; yy < y + h - 2; yy += step) d += rect(x + 2, yy, w - 4, 1.6); return d; }
  function bricks(x, y, w, h, bw, bh) { let d = ''; let row = 0; for (let yy = y + bh; yy < y + h; yy += bh, row++) { d += rect(x, yy, w, 1.6); for (let xx = x + (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) d += rect(xx, yy - bh + 1.6, 1.6, bh - 1.6); } return d; }
  function lattice(x, y, w, h, nx, ny, t) { let d = ''; for (let i = 1; i < nx; i++) d += rect(x + w * i / nx - t / 2, y, t, h); for (let j = 1; j < ny; j++) d += rect(x, y + h * j / ny - t / 2, w, t); return d; }
  function lantern(x, y, s) { return rect(x - 1.5 * s, y - 40 * s, 3 * s, 14 * s) + poly([[x - 10 * s, y - 26 * s], [x + 10 * s, y - 26 * s], [x + 13 * s, y - 20 * s], [x - 13 * s, y - 20 * s]]) + rect(x - 10 * s, y - 20 * s, 20 * s, 22 * s) + poly([[x - 12 * s, y + 2 * s], [x + 12 * s, y + 2 * s], [x + 8 * s, y + 7 * s], [x - 8 * s, y + 7 * s]]); }
  const lanternGlow = (x, y, s) => rect(x - 7 * s, y - 17 * s, 14 * s, 16 * s);
  function smoke(x, y, h) { let d = `M${x},${y}`; for (let i = 1; i <= 6; i++) d += ` Q${f(x + (i % 2 ? 26 : -18) + i * 4)},${f(y - h * (i - .5) / 6)} ${f(x + i * 9)},${f(y - h * i / 6)}`; return d; }
  function wheelSpoked(cx, cy, R, n, t) { let d = circ(cx, cy, R) ; const cut = circ(cx, cy, R - t); let sp = ''; for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; sp += bar(cx, cy, cx + Math.cos(a) * (R - t / 2), cy + Math.sin(a) * (R - t / 2), t * .55); } return { rim: d, hole: cut, spokes: sp + circ(cx, cy, t * 1.2) }; }
  function ridge(r, y0, amp, step, w) { let d = `M0,900 L0,${y0}`; for (let x = 0; x <= w; x += step) d += ` L${x},${f(y0 - amp * (r() * .9 + .1) * (Math.sin(x / 260) * .5 + .7))}`; return d + ` L${w},900 Z`; }
  function waves(y, amp, len, w) { let d = ''; for (let x = -len; x < w + len; x += len) d += `M${x},${y} q${len / 4},${-amp} ${len / 2},0 q${len / 4},${amp} ${len / 2},0 `; return d; }
  // a filled path; any stroked paths (from S) mixed into d are lifted out and kept as they are
  function fore(r, kind) {
    let d = '';
    for (const x0 of [350, 1170]) {
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * 28 + r() * 12;
        if (kind === 'alps') d += `M${x},760c0,-36 22,-48 34,-30c10,-18 28,-8 28,30z` + rect(x + 4, 690, 7, 70) + (i < 2 ? rect(x + 4, 704, 36, 5) + rect(x + 4, 728, 36, 5) : '');
        else if (kind === 'isle') d += `M${x},760c-2,-20 18,-30 34,-22c14,-6 24,6 22,22z` + bar(x + 20, 760, x + 26 + r() * 10, 716, 3) + bar(x + 34, 760, x + 30, 724, 3);
        else d += i === 1 ? rect(x - 4, 700, 56, 60) + rect(x - 8, 692, 64, 10) + rect(x + 16, 678, 14, 16) : rect(x, 724, 34, 36) + rect(x + 4, 716, 26, 8);
      }
    }
    return P(d);
  }
  const P = (d, cls) => { const tags = []; d = String(d).replace(/<path[^>]*\/>/g, m => { tags.push(m); return ''; }); return (d.trim() ? `<path${cls ? ` class="${cls}"` : ''} d="${d}"/>` : '') + tags.join(''); };
  const S = (d, w, cls) => `<path${cls ? ` class="${cls}"` : ''} d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;

  /* ================= 霧鐘村（雪の山村） ================= */
  const alpsFar = r => P('M0,900L0,420L90,380L160,300L210,330L260,290L330,350L420,200L470,240L520,230L560,320L640,280L700,240L760,300L860,370L940,300L1000,230L1060,280L1140,310L1220,250L1300,170L1350,215L1400,240L1460,320L1540,290L1600,300L1600,900Z')
    + P(snowcap(r, [[380, 236], [420, 200], [470, 240], [520, 230], [545, 262]], 22) + snowcap(r, [[1250, 222], [1300, 170], [1350, 215], [1400, 240]], 24) + snowcap(r, [[960, 262], [1000, 230], [1060, 280]], 18) + snowcap(r, [[130, 318], [160, 300], [210, 330]], 14), 'snow')
    + P(circ(1250, 90, 34), 'moonc');
  function alpsVillage(r, x0, x1, y) {   // a row of steep roofs, chimneys and pines behind the place
    let d = '', s = '';
    for (let x = x0; x < x1;) { const w = 70 + r() * 60, h = 50 + r() * 40, roof = 46 + r() * 30; d += poly([[x, y], [x, y - h], [x + w / 2, y - h - roof], [x + w, y - h], [x + w, y]]); if (r() < .6) d += rect(x + w * .7, y - h - roof * .7, 10, 34); s += snowcap(r, [[x - 4, y - h + 2], [x + w / 2, y - h - roof - 1], [x + w + 4, y - h + 2]], 8); if (r() < .5) d += pine(x + w + 22, y, 70 + r() * 40, r); x += w + 30 + r() * 50; }
    return P(d) + P(s, 'snow');
  }
  const alpsGround = r => P('M0,900L0,756C300,746 500,766 800,758C1100,750 1300,764 1600,754L1600,900Z') + P(snowcap(r, [[0, 757], [400, 752], [800, 759], [1200, 751], [1600, 755]], 7), 'snow');

  const ALPS = {
    tower: {
      props: ['鐘楼と鐘', '尖頭窓のトレサリー', '鐘の綱', '十字の墓標', '枯れ木と鴉', '街灯', 'つらら'],
      far: alpsFar,
      mid(r) {   // the chapel and its bell tower, a little right of centre
        let d = '', c = '', g = '';
        const X = 860;
        d += rect(X, 380, 380, 380) + poly([[X - 20, 384], [X + 190, 250], [X + 400, 384]]);
        d += rect(X + 380, 160, 130, 600) + poly([[X + 370, 166], [X + 445, 10], [X + 520, 166]]) + rect(X + 441, -40, 8, 52) + rect(X + 427, -22, 36, 7);
        for (let i = 0; i < 4; i++) d += poly([[X + 30 + i * 90, 760], [X + 30 + i * 90, 470], [X + 46 + i * 90, 440], [X + 52 + i * 90, 760]]);
        for (let i = 0; i < 3; i++) { c += gothic(X + 62 + i * 110, 690, 56, 190); g += gothic(X + 66 + i * 110, 686, 48, 182); }
        c += gothic(X + 410, 330, 70, 120);
        g += rect(X + 418, 290, 54, 34);
        d += 'M' + (X + 445) + ',232c-22,0 -30,26 -30,52l60,0c0,-26 -8,-52 -30,-52z';   // the bell
        d += rect(X + 443, 284, 4, 300);    // the rope
        c += circ(X + 190, 330, 34) + lattice(X + 156, 296, 68, 68, 4, 4, 3);
        c += bricks(X + 380, 420, 130, 330, 34, 22);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 22, 386], [X + 190, 251], [X + 402, 386]], 14) + snowcap(r, [[X + 368, 168], [X + 445, 11], [X + 522, 168]], 10), 'snow') + alpsVillage(r, 0, 820, 690);
      },
      near(r) {
        let d = '', c = '';
        // left: a crooked graveyard cross, a bare tree with crows, a street lamp
        d += bareTree(120, 760, 520, r, 30) + crow(150, 352, 1.3) + crow(232, 300, 1.1);
        d += rect(300, 560, 14, 200) + rect(268, 600, 78, 13) + circ(307, 606, 22);
        c += circ(307, 606, 14);
        d += rect(398, 520, 6, 240) + lantern(401, 520, 1.3);
        // right: the churchyard wall with a gate post and icicles
        d += rect(1300, 650, 300, 110) + rect(1290, 640, 320, 14) + rect(1290, 560, 40, 200) + poly([[1284, 560], [1310, 528], [1336, 560]]);
        c += bricks(1340, 660, 260, 96, 40, 24);
        d += icicles(r, 1292, 1600, 654, 22);
        return P(d) + P(lanternGlow(401, 520, 1.3), 'glow') + P(c, 'cut') + P(snowcap(r, [[1286, 641], [1450, 638], [1610, 641]], 10) + snowcap(r, [[262, 601], [307, 596], [350, 601]], 6), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
    inn: {
      props: ['木組みの宿', '白樺の吊り看板', '灯る窓と格子', '煙突の煙', '積んだ薪', '白樺の木', 'そり'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 760, W = 560;
        d += rect(X, 470, W, 290) + poly([[X - 30, 474], [X + W / 2, 300], [X + W + 30, 474]]) + rect(X + 390, 300, 46, 120);
        for (let i = 0; i < 5; i++) { g += rect(X + 40 + i * 104, 520, 58, 70); c += lattice(X + 40 + i * 104, 520, 58, 70, 2, 2, 4); }
        g += rect(X + 230, 640, 100, 120);
        // half-timbering cut into the plaster
        for (let i = 0; i <= 6; i++) c += rect(X + i * W / 6 - 2, 610, 4, 26);
        for (let i = 0; i < 6; i++) c += bar(X + i * W / 6, 636, X + (i + 1) * W / 6, 610, 4);
        c += rect(X, 606, W, 4) + rect(X, 636, W, 4);
        c += poly([[X + 200, 470], [X + W / 2, 370], [X + 360, 470]]);
        return P(d) + S(smoke(X + 413, 296, 210), 9, 'smoke') + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 32, 476], [X + W / 2, 299], [X + W + 32, 476]], 16), 'snow') + alpsVillage(r, 0, 700, 690);
      },
      near(r) {
        let d = '', c = '';
        // left: birches with their papery marks, a sled
        for (const [x, h] of [[70, 560], [170, 470], [250, 380]]) { d += bareTree(x, 760, h, r); for (let y = 760 - h * .7; y < 750; y += 30 + r() * 26) c += rect(x - 6, y, 9 + r() * 4, 3); }
        d += poly([[300, 744], [430, 744], [446, 728], [452, 734], [436, 756], [300, 756]]) + rect(318, 728, 96, 10) + rect(326, 738, 6, 8) + rect(400, 738, 6, 8);
        // right: the hanging sign and a stack of firewood
        d += rect(1330, 430, 10, 330) + rect(1330, 440, 120, 8) + rect(1356, 448, 3, 30) + rect(1420, 448, 3, 30) + rect(1346, 478, 90, 64);
        c += rect(1388, 488, 6, 44) + bar(1391, 500, 1374, 486, 3) + bar(1391, 512, 1410, 496, 3);
        for (let row = 0; row < 4; row++) for (let i = 0; i < 7 - row; i++) d += circ(1460 + i * 22 + row * 11, 744 - row * 20, 10);
        for (let row = 0; row < 4; row++) for (let i = 0; i < 7 - row; i++) c += circ(1460 + i * 22 + row * 11, 744 - row * 20, 3.4);
        return P(d) + P(c, 'cut') + P(snowcap(r, [[1340, 476], [1392, 474], [1440, 476]], 6), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
    forge: {
      props: ['鍛冶場の小屋', '炉の火', '金床とハンマー', 'ふいご', '吊るした蹄鉄と火ばさみ', '荷車の車輪', '樽'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 780;
        d += rect(X, 470, 620, 290) + poly([[X - 30, 474], [X + 310, 380], [X + 650, 474]]) + rect(X + 470, 230, 70, 230);
        c += rect(X + 60, 540, 300, 220);        // the open front
        g += P(roundArch(X + 120, 760, 160, 150), 'glow fire');
        d += rect(X + 40, 530, 340, 12);
        c += bricks(X + 470, 250, 70, 210, 35, 20);
        for (let i = 0; i < 6; i++) d += rect(X + 80 + i * 46, 542, 4, 22 + (i % 3) * 8) + circ(X + 82 + i * 46, 572 + (i % 3) * 8, 9);
        return P(d) + P(c, 'cut') + g + P(snowcap(r, [[X - 32, 476], [X + 310, 379], [X + 652, 476]], 14), 'snow') + S(smoke(X + 505, 226, 220), 10, 'smoke') + alpsVillage(r, 0, 720, 690);
      },
      near(r) {
        let d = '', c = '';
        // left: the anvil on its stump, a hammer, the bellows
        d += poly([[230, 760], [244, 690], [316, 690], [330, 760]]) + poly([[200, 664], [372, 664], [356, 690], [214, 690]]) + poly([[180, 664], [200, 650], [380, 650], [400, 664]]);
        d += bar(360, 646, 420, 596, 8) + rect(404, 580, 34, 22);
        d += poly([[40, 760], [60, 620], [180, 600], [200, 640], [150, 760]]) + bar(180, 610, 250, 560, 10);
        c += bar(70, 700, 160, 640, 3) + bar(80, 730, 170, 670, 3);
        // right: a cart wheel leaning, a barrel, horseshoes on a post
        const w = wheelSpoked(1380, 660, 96, 10, 14); d += w.rim; c += w.hole; d += '';
        const spokes = w.spokes;
        d += poly([[1490, 760], [1484, 640], [1580, 640], [1574, 760]]); c += rect(1484, 670, 96, 5) + rect(1484, 730, 96, 5);
        return P(d) + P(c, 'cut') + P(spokes) + alpsGround(r) + fore(r, 'alps');
      },
    },
    mill: {
      props: ['水車小屋', '大きな水車と羽根板', '凍った川', '粉袋の山', '木の欄干', '葦', 'つらら'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 880;
        d += rect(X, 440, 440, 320) + poly([[X - 30, 444], [X + 220, 300], [X + 470, 444]]);
        c += bricks(X, 640, 440, 120, 44, 26);
        g += rect(X + 260, 500, 70, 80); c += lattice(X + 260, 500, 70, 80, 2, 2, 4);
        d += icicles(r, X - 28, X + 468, 446, 30);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 32, 446], [X + 220, 299], [X + 472, 446]], 16), 'snow') + alpsVillage(r, 0, 700, 690);
      },
      near(r) {
        let d = '', c = '';
        // the great wheel on the left of the house (partly in the side margin)
        const w = wheelSpoked(380, 560, 190, 12, 16); d += w.rim; c += w.hole;
        let pad = ''; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; const x = 380 + Math.cos(a) * 190, y = 560 + Math.sin(a) * 190; pad += poly([[x - 16 * Math.sin(a) - 8 * Math.cos(a), y + 16 * Math.cos(a) - 8 * Math.sin(a)], [x + 16 * Math.sin(a) - 8 * Math.cos(a), y - 16 * Math.cos(a) - 8 * Math.sin(a)], [x + 16 * Math.sin(a) + 18 * Math.cos(a), y - 16 * Math.cos(a) + 18 * Math.sin(a)], [x - 16 * Math.sin(a) + 18 * Math.cos(a), y + 16 * Math.cos(a) + 18 * Math.sin(a)]]); }
        d += icicles(r, 250, 520, 744, 18);
        // the frozen race and reeds
        let reeds = ''; for (let i = 0; i < 18; i++) { const x = 20 + i * 14 + r() * 8; reeds += bar(x, 760, x + (r() - .5) * 20, 690 - r() * 50, 3); }
        // right: sacks and a footbridge rail
        for (let i = 0; i < 5; i++) { const x = 1300 + (i % 3) * 70 + (i > 2 ? 35 : 0), y = i > 2 ? 690 : 746; d += `M${x},${y}c-6,-40 6,-58 30,-62c24,4 36,22 30,62z`; }
        d += rect(1470, 560, 12, 200) + rect(1580, 560, 12, 200) + rect(1460, 572, 140, 10) + rect(1460, 640, 140, 8);
        for (let x = 1490; x < 1580; x += 22) d += rect(x, 582, 5, 58);
        return P(d) + P(c, 'cut') + P(pad) + P(w.spokes) + P(reeds) + alpsGround(r) + P(rect(0, 752, 600, 8), 'ice') + fore(r, 'alps');
      },
    },
    grave: {
      props: ['形の違う墓標', '鉄柵と槍先', 'ねじれた枯れ木', '鴉', '墓守小屋', '突き立てたシャベル', '花輪'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        // the dark wood beyond and the gravedigger's hut
        for (let i = 0; i < 22; i++) d += pine(500 + i * 52 + r() * 20, 700, 160 + r() * 120, r);
        d += rect(1180, 560, 220, 200) + poly([[1160, 564], [1290, 470], [1420, 564]]);
        g += rect(1220, 620, 50, 60); c += lattice(1220, 620, 50, 60, 2, 2, 4);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[1158, 566], [1290, 469], [1422, 566]], 12), 'snow');
      },
      near(r) {
        let d = '', c = '';
        d += bareTree(90, 760, 600, r, 40) + crow(120, 300, 1.4) + crow(210, 250, 1.1) + crow(60, 380, 1.2);
        // stones: arched, celtic cross, obelisk, sunk
        d += roundArch(270, 760, 60, 110) + roundArch(1250, 760, 54, 96);
        c += rect(292, 690, 16, 3) + rect(298, 676, 4, 30);
        d += rect(392, 640, 14, 120) + rect(362, 668, 74, 14); d += circ(399, 675, 26); c += circ(399, 675, 18); d += rect(392, 640, 14, 120) + rect(362, 668, 74, 14);
        d += poly([[1380, 760], [1386, 610], [1396, 590], [1406, 610], [1412, 760]]);
        d += poly([[1490, 760], [1482, 700], [1540, 690], [1552, 760]]);
        // the iron fence with spear tips
        for (let x = 1120; x <= 1600; x += 24) d += rect(x, 680, 4, 80) + poly([[x - 4, 682], [x + 2, 666], [x + 8, 682]]);
        d += rect(1116, 700, 490, 5) + rect(1116, 740, 490, 5);
        // a shovel and a wreath
        d += rect(470, 640, 6, 120) + poly([[458, 640], [488, 640], [484, 600], [462, 600]]) + rect(462, 600, 22, 6);
        d += circ(1250, 700, 18); c += circ(1250, 700, 11);
        for (let i = 0; i < 4; i++) c += rect(282, 716 + i * 9, 36, 2.4) + rect(1232, 724 + i * 8, 36, 2.4);
        for (let x = 1132; x < 1600; x += 48) c += circ(x, 720, 5);
        return P(d) + P(c, 'cut') + P(snowcap(r, [[268, 652], [300, 646], [332, 652]], 7) + snowcap(r, [[1116, 700], [1360, 698], [1606, 700]], 5), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
  };

  /* ================= 北辰号（夜行列車） ================= */
  function snowPlain(r) {   // what the windows look out on
    let d = ridge(r, 430, 60, 50, 1600), p = '';
    for (let i = 0; i < 30; i++) p += pine(r() * 1600, 480 + r() * 20, 40 + r() * 50, r);
    for (let x = 60; x < 1600; x += 260) p += rect(x, 330, 5, 160) + rect(x - 18, 344, 41, 4);
    return P(d, 'snowland') + P(p) + S('M0,342 Q130,362 260,344 Q390,362 520,344 Q650,362 780,344 Q910,362 1040,344 Q1170,362 1300,344 Q1430,362 1560,344', 1.6) + P(circ(380, 110, 30), 'moonc');
  }
  // the inside of a carriage, drawn in the middle layer: ceiling ribs, the window band with curtains, the luggage rack
  function carriage(r, o) {
    o = o || {};
    let d = '', c = '', g = '', pn = '';
    d += 'M0,-120H1600V96Q800,30 0,96Z';                       // the vaulted ceiling
    for (let x = 0; x <= 1600; x += 160) d += bar(x, 96 - Math.abs(x - 800) * 0, x, 40, 6);
    c += S('M0,96Q800,30 1600,96', 3, 'cut');
    d += rect(0, 150, 1600, 22);                                  // the rack rail
    for (let x = 20; x < 1600; x += 46) d += rect(x, 172, 3, 26);
    d += rect(0, 196, 1600, 6);
    // windows: the dark frames with rounded corners, curtains gathered at each side
    for (let x = 60; x < 1600; x += 300) {
      pn += `M${x},250h220v210h-220Z`;
      d += rect(x + 242, 232, 58, 250) + (x === 60 ? rect(0, 232, 38, 250) : '');
      d += `M${x - 22},232h264v24h-264Z M${x - 22},456h264v26h-264Z` + rect(x + 106, 250, 8, 210);
      d += `M${x - 8},236c26,40 18,120 34,224l-28,0z M${x + 228},236c-26,40 -18,120 -34,224l28,0z`;
      c += rect(x - 16, 470, 252, 3);
    }
    d += rect(0, 482, 1600, 278);                                 // the panelled wall below
    for (let x = 30; x < 1600; x += 150) c += rect(x, 512, 120, 4) + rect(x, 512, 4, 200) + rect(x + 116, 512, 4, 200) + rect(x, 708, 120, 4);
    if (o.lamps !== false) for (let x = 210; x < 1600; x += 600) { d += rect(x - 2, 96, 4, 40) + `M${x - 26},160c4,-18 48,-18 52,0z`; g += ell(x, 166, 20, 8); }
    return `${P(pn, 'pane')}<clipPath id="wl-win"><path d="${pn}"/></clipPath><g clip-path="url(#wl-win)">${snowPlain(r)}</g>${P(d)}${P(c, 'cut')}${P(g, 'glow')}`;
  }
  const trainGround = r => P(rect(0, 760, 1600, 140)) + P(rect(0, 768, 1600, 3) + rect(0, 790, 1600, 3), 'cut');

  const TRAIN = {
    dining: {
      props: ['白い卓布の食卓', '彫りのある椅子', '燭台と灯', 'ワイングラスとティーポット', 'カーテンを留めた窓', '真鍮のランプ', '給仕のワゴン'],
      far: r => '', mid: r => carriage(r),
      near(r) {
        let d = '', c = '', g = '';
        const table = (x, flip) => {
          d += rect(x, 650, 280, 14) + `M${x - 6},664h292l-14,40h-264z` + rect(x + 24, 700, 10, 60) + rect(x + 246, 700, 10, 60);
          c += `M${x + 4},666h272l-10,30h-252z`;                                      // the white cloth
          c += Array.from({ length: 6 }, (_, i) => rect(x + 30 + i * 40, 670, 18, 22).replace('Z', '') + 'Z').join('');
          d += rect(x + 130, 590, 6, 60) + rect(x + 104, 602, 58, 5) + rect(x + 104, 586, 5, 18) + rect(x + 130, 576, 6, 14) + rect(x + 157, 586, 5, 18);
          g += ell(x + 106, 582, 4, 7) + ell(x + 133, 572, 4, 7) + ell(x + 160, 582, 4, 7);
          d += `M${x + 40},650v-10c-10,-2 -12,-22 -8,-30h16c4,8 2,28 -8,30v10z M${x + 220},650v-10c-10,-2 -12,-22 -8,-30h16c4,8 2,28 -8,30v10z`;
          d += `M${x + 186},650c-14,-2 -18,-24 -6,-32h26c10,8 6,30 -8,32z M${x + 206},628l14,-10l4,4l-12,10z`;
          const cx = flip ? x + 300 : x - 40;   // a chair with a carved back
          d += rect(cx, 660, 60, 10) + rect(cx + 4, 670, 6, 90) + rect(cx + 50, 670, 6, 90) + rect(flip ? cx + 50 : cx + 4, 520, 8, 140) + `M${flip ? cx + 30 : cx},540c0,-30 34,-30 34,0v60h-34z`;
          c += circ(flip ? cx + 47 : cx + 17, 556, 9) + rect(flip ? cx + 43 : cx + 13, 570, 8, 22);
        };
        table(60, true); table(1250, false);
        d += poly([[0, 760], [6, 700], [44, 700], [50, 760]]); for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .32; d += bar(25, 700, 25 + Math.cos(a) * 120, 700 + Math.sin(a) * 120, 8) + poly([[25 + Math.cos(a) * 120, 700 + Math.sin(a) * 120], [25 + Math.cos(a) * 70 + 14, 700 + Math.sin(a) * 70], [25 + Math.cos(a) * 70 - 14, 700 + Math.sin(a) * 70]]); }
        d += rect(1592, 380, 8, 380) + rect(1560, 752, 40, 8) + bar(1596, 400, 1566, 380, 5) + `M1556,420c0,-30 40,-30 40,0v80h-40z`;
        // a waiter's trolley with a teapot at the right edge
        d += rect(1460, 610, 120, 8) + rect(1460, 690, 120, 8) + rect(1466, 618, 5, 140) + rect(1570, 618, 5, 140) + circ(1478, 752, 8) + circ(1566, 752, 8);
        d += `M1496,610c-10,-30 40,-40 50,0z M1544,596l18,-10l3,5l-16,10z M1514,578h14v-8h-14z`;
        return P(d) + P(c, 'cut') + P(g, 'glow') + trainGround(r) + fore(r, 'train');
      },
    },
    sleeper: {
      props: ['個室の扉と真鍮の番号札', '壁の灯', '寝台の上下段とはしご', 'たぐった寝台のカーテン', '霜の窓とブラインド', 'トランク'],
      far: r => '',
      mid(r) {   // the corridor: panelled doors with numbers, wall lamps
        let d = '', c = '', g = '';
        d += 'M0,-120H1600V110H0Z' + rect(0, 110, 1600, 650);
        for (let i = 0; i < 6; i++) {
          const x = 70 + i * 250;
          c += rect(x, 230, 170, 4) + rect(x, 230, 4, 520) + rect(x + 166, 230, 4, 520);
          c += rect(x + 28, 262, 114, 3) + rect(x + 28, 262, 3, 170) + rect(x + 139, 262, 3, 170) + rect(x + 28, 429, 114, 3);
          c += rect(x + 28, 458, 114, 3) + rect(x + 28, 458, 3, 250) + rect(x + 139, 458, 3, 250) + rect(x + 28, 705, 114, 3);
          c += rect(x + 40, 274, 90, 146);
          g += rect(x + 66, 236, 38, 18);
          d += rect(x + 140, 480, 14, 6);
          if (i < 5) { d += rect(x + 205, 280, 8, 30); g += `M${x + 192},270c0,-26 34,-26 34,0z`; }
        }
        c += rect(0, 150, 1600, 4) + rect(0, 750, 1600, 4);
        for (let x = 0; x < 1600; x += 36) c += rect(x, 116, 18, 18);
        return P(d) + P(c, 'cut') + P(g, 'glow');
      },
      near(r) {
        let d = '', c = '', pn = '';
        // left: an open compartment — two berths, a ladder, a drawn curtain
        d += rect(0, 300, 360, 16) + rect(0, 500, 360, 18) + rect(340, 300, 20, 460);
        d += `M0,316h330v14c-110,10 -220,10 -330,0z M0,518h330v14c-110,10 -220,10 -330,0z`;
        c += rect(10, 270, 300, 26) + rect(10, 470, 300, 26);
        for (let y = 340; y < 740; y += 44) d += rect(364, y, 40, 6);
        d += rect(362, 330, 6, 430) + rect(400, 330, 6, 430);
        d += `M300,330c30,60 10,200 34,430h-24c-16,-200 6,-360 -10,-430z`;
        // right: the corridor window with frost and a pull-down blind, a trunk
        pn += rect(1300, 230, 240, 240);
        d += rect(1286, 216, 268, 16) + rect(1286, 468, 268, 18) + rect(1286, 216, 16, 270) + rect(1538, 216, 16, 270) + rect(1302, 232, 236, 76) + rect(1410, 308, 16, 10);
        c += rect(1302, 300, 236, 3); for (let y = 244; y < 300; y += 12) c += rect(1306, y, 228, 2.4);
        let fr = ''; for (let i = 0; i < 14; i++) { const x = 1310 + r() * 220, y = 330 + r() * 130; fr += bar(x, y, x + (r() - .5) * 30, y - 10 - r() * 20, 2); }
        d += rect(1360, 650, 200, 110) + rect(1360, 640, 200, 14) + rect(1440, 624, 40, 16);
        c += rect(1360, 690, 200, 4) + rect(1400, 650, 6, 110) + rect(1514, 650, 6, 110) + rect(1440, 700, 40, 26); for (let x = 1368; x < 1556; x += 12) c += rect(x, 742, 6, 2.4);
        let out = P(rect(1302, 380, 236, 88) + 'M1302,380Q1360,350 1420,372Q1480,346 1538,366V380Z', 'snowland'); for (let i = 0; i < 6; i++) out += P(pine(1320 + i * 40, 392 + (i % 2) * 6, 34 + (i % 3) * 8, r));
        return P(pn, 'pane') + out + P(fr, 'cut') + P(d) + P(c, 'cut') + trainGround(r) + fore(r, 'train');
      },
    },
    third: {
      props: ['木の長椅子', '鉄のストーブと煙突', '湯気の出る薬缶', '網棚と荷物', '吊りランプ', '籠と袋'],
      far: r => '', mid: r => carriage(r),
      near(r) {
        let d = '', c = '', g = '';
        // left: the iron stove with its pipe and kettle
        d += rect(150, 600, 150, 150) + rect(140, 590, 170, 14) + rect(160, 750, 14, 10) + rect(276, 750, 14, 10) + rect(206, 120, 36, 470) + rect(198, 120, 52, 10);
        g += rect(180, 640, 90, 60);
        c += lattice(180, 640, 90, 60, 4, 1, 4);
        d += `M240,590c-40,0 -52,-46 -6,-52h18c46,6 34,52 -12,52z M266,556l26,-16l4,6l-24,16z`;
        c += S('M250,530q-14,-26 6,-46q18,-20 0,-44', 4, 'cut');
        // wooden benches facing each other on both sides
        const bench = x => { d += rect(x, 640, 140, 16) + rect(x + 6, 656, 10, 104) + rect(x + 124, 656, 10, 104) + rect(x + 122, 500, 18, 156); c += rect(x + 126, 520, 10, 3) + rect(x + 126, 560, 10, 3) + rect(x + 126, 600, 10, 3); };
        bench(10); bench(1280);
        d += rect(1440, 500, 18, 260) + rect(1440, 640, 150, 16) + rect(1576, 656, 10, 104);
        // a basket and a sack on the bench, a hanging lamp
        d += `M1310,640c-4,-40 80,-40 76,0z M1320,612c10,-30 56,-30 66,0` + `M1470,640c-10,-46 10,-66 40,-70c30,4 50,24 40,70z`;
        c += rect(1320, 620, 60, 3) + rect(1324, 630, 52, 3);
        d += rect(796, 0, 4, 110) + lantern(798, 150, 1.6);
        g += lanternGlow(798, 150, 1.6);
        return P(d) + P(g, 'glow fire') + P(c, 'cut') + trainGround(r) + fore(r, 'train');
      },
    },
    baggage: {
      props: ['積んだ木箱と刷りこみ文字', '革ベルトのトランク', '郵便袋', '鳥かご', '吊りランプ', '帽子箱'],
      far: r => '',
      mid(r) {   // the bare wooden car: planks, ribs, a sliding door with a barred window
        let d = '', c = '', pn = '';
        d += 'M0,-120H1600V760H0Z';
        for (let x = 0; x < 1600; x += 46) c += rect(x, 0, 2.4, 760);
        for (let x = 80; x < 1600; x += 320) d += rect(x, 0, 20, 760);
        pn += rect(700, 240, 200, 150);
        c += lattice(700, 240, 200, 150, 6, 1, 6);
        c += rect(640, 200, 320, 6) + rect(640, 200, 6, 560) + rect(954, 200, 6, 560);
        return P(d) + P(c, 'cut') + P(pn, 'pane');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: crates stacked, stencilled
        const crate = (x, y, w, h) => { d += rect(x, y, w, h); c += rect(x + 6, y + 6, w - 12, 3) + rect(x + 6, y + h - 9, w - 12, 3) + bar(x + 10, y + h - 10, x + w - 10, y + 10, 3); };
        crate(10, 600, 170, 160); crate(190, 640, 130, 120); crate(30, 470, 140, 130); crate(200, 540, 100, 100);
        c += rect(60, 650, 70, 5) + rect(80, 666, 30, 5);
        // a birdcage on top
        d += rect(84, 470, 4, -20) ; d += `M60,470v-50c0,-40 60,-40 60,0v50z`; c += lattice(66, 430, 48, 36, 5, 1, 3) + `M84,404c-10,0 -10,10 0,10z`;
        // right: trunks with straps, mail sacks, a hat box
        d += rect(1300, 660, 260, 100) + rect(1290, 650, 280, 16) + rect(1320, 560, 210, 92) + rect(1312, 552, 226, 12);
        c += rect(1350, 650, 10, 110) + rect(1500, 650, 10, 110) + rect(1370, 552, 10, 100) + rect(1470, 552, 10, 100) + rect(1418, 690, 24, 18);
        d += `M1180,760c-30,-90 10,-150 60,-150c40,0 60,40 50,150z M1240,610l-10,-30h30z`;
        c += S('M1200,700q40,-20 80,0', 3, 'cut');
        d += ell(1440, 530, 50, 12) + rect(1390, 500, 100, 30) + ell(1440, 500, 50, 12);
        d += rect(796, 0, 4, 90) + lantern(798, 130, 1.6); g += lanternGlow(798, 130, 1.6);
        return P(d) + P(c, 'cut') + P(g, 'glow') + trainGround(r) + fore(r, 'train');
      },
    },
    engine: {
      props: ['機関車のボイラーと煙突', '運転室の灯る窓', 'スポークの動輪と連結棒', '前照灯', '排障器', '蒸気の雲', '電信柱'],
      far(r) { return P(ridge(r, 470, 90, 60, 1600)) + P(circ(1300, 100, 36), 'moonc') + P(snowcap(r, [[0, 470], [400, 440], [800, 470], [1200, 440], [1600, 470]], 10), 'snow'); },
      mid(r) {
        let d = '', p = '';
        for (let x = 40; x < 1600; x += 220) d += rect(x, 420, 6, 240) + rect(x - 24, 436, 54, 5) + rect(x - 18, 452, 42, 4);
        d += S('M0,430Q110,452 220,436Q330,452 440,436Q550,452 660,436Q770,452 880,436Q990,452 1100,436Q1210,452 1320,436Q1430,452 1540,436', 2);
        for (let i = 0; i < 26; i++) p += pine(r() * 1600, 660, 50 + r() * 70, r);
        return d + P(p) + P(rect(0, 660, 1600, 100));
      },
      near(r) {
        let d = '', c = '', g = '';
        // the locomotive, facing left, on the right side of the stage
        const X = 1090;
        d += `M${X},620h480v-210h-150v-40h-330z`;                         // boiler and cab
        d += `M${X - 30},620h40v-150h-40z` + ell(X - 10, 545, 20, 75);       // smokebox door
        d += `M${X + 60},470v-110h-14l-6,-20h80l-6,20h-14v110z`;              // smokestack
        d += `M${X + 170},470c0,-50 60,-50 60,0z M${X + 270},470c0,-40 46,-40 46,0z`;  // domes
        c += rect(X + 400, 430, 60, 60) + rect(X + 470, 430, 50, 60);
        g += rect(X + 404, 434, 52, 52) + rect(X + 474, 434, 42, 52);
        for (let i = 0; i < 4; i++) c += rect(X + 30 + i * 80, 474, 3, 140);
        d += `M${X - 60},700l50,-80h20v80z`;                                // cowcatcher
        for (let i = 0; i < 4; i++) c += bar(X - 52 + i * 14, 698, X - 14 + i * 4, 630, 3);
        d += rect(X - 52, 480, 34, 30); g += circ(X - 46, 495, 12);          // headlamp
        let wh = '', wc = '', ws = ''; [X + 80, X + 230, X + 380].forEach(cx => { const w = wheelSpoked(cx, 680, 78, 12, 12); wh += w.rim; wc += w.hole; ws += w.spokes; });
        d += bar(X + 80, 700, X + 380, 700, 12) + rect(X - 40, 618, 600, 16);
        c += S(`M${X + 90},380q-40,-40 0,-80q50,-40 10,-100q-40,-50 40,-90`, 22, 'smokecut');
        // left: a telegraph pole and drifted snow fence
        d += rect(150, 300, 12, 460) + rect(110, 330, 92, 8) + rect(120, 356, 72, 7);
        for (let x = 240; x < 440; x += 26) d += rect(x, 680, 8, 80) ;
        d += rect(234, 700, 210, 6);
        return P(d) + P(c, 'cut') + P(wh) + P(wc, 'cut') + P(ws) + P(bar(X + 80, 700, X + 380, 700, 12)) + P(g, 'glow') + P(snowcap(r, [[230, 701], [340, 696], [446, 701]], 6), 'snow') + trainGround(r) + fore(r, 'train');
      },
    },
  };

  /* ================= ともしび島（灯台の島） ================= */
  const seaFar = r => P('M0,900L0,600C200,592 400,604 600,598C800,592 1000,604 1200,596C1400,590 1500,600 1600,594L1600,900Z') + P('M40,600L150,540L230,556L300,520L420,600Z M1240,596L1330,520L1400,540L1470,500L1590,594Z') + P(circ(1180, 120, 34), 'moonc') + S('M200,140q60,-20 120,0q50,-16 90,4 M900,90q50,-16 100,0q40,-12 80,4', 3);
  const seaMid = r => S(waves(640, 10, 80, 1600), 3) + S(waves(680, 8, 60, 1600), 2.4) + S(waves(712, 6, 46, 1600), 2);
  const isleGround = r => P('M0,900L0,758C300,752 600,762 900,756C1200,750 1400,760 1600,754L1600,900Z') + P(Array.from({ length: 40 }, (_, i) => { const x = i * 41 + r() * 10; return poly([[x, 760], [x + 4, 746 - r() * 10], [x + 8, 760]]); }).join(''));

  const ISLAND = {
    light: {
      props: ['白い灯台と回廊の手すり', '灯室の光と光の束', '灯台守の小屋', '岩と石段', '風に曲がった松', '波頭'],
      far: seaFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 1080;
        d += `M${X - 120},760C${X - 100},660 ${X - 40},620 ${X + 30},600L${X + 260},590C${X + 330},610 ${X + 380},680 ${X + 400},760Z`;   // the headland
        d += poly([[X + 60, 600], [X + 84, 210], [X + 196, 210], [X + 220, 600]]);       // the tower
        c += rect(X + 70, 300, 140, 14) + rect(X + 66, 420, 148, 14) + rect(X + 62, 520, 156, 14);
        d += rect(X + 50, 196, 180, 16) + rect(X + 80, 120, 120, 76) + poly([[X + 70, 122], [X + 140, 70], [X + 210, 122]]) + rect(X + 136, 44, 8, 28);
        for (let x = X + 54; x <= X + 226; x += 14) d += rect(x, 176, 3, 20);
        d += rect(X + 50, 174, 180, 4);
        g += rect(X + 92, 130, 96, 56); c += lattice(X + 92, 130, 96, 56, 4, 1, 4);
        g += poly([[X + 92, 140], [X - 520, 40], [X - 560, 180], [X + 92, 176]]);
        d += rect(X + 250, 600, 150, 100) + poly([[X + 236, 604], [X + 325, 550], [X + 414, 604]]);
        g += rect(X + 280, 630, 36, 40);
        for (let i = 0; i < 8; i++) d += rect(X + 30 - i * 18, 600 + i * 20, 24, 8);
        return P(d) + P(c, 'cut') + `<g class="beam">${P(g, 'glow')}</g>` + seaMid(r);
      },
      near(r) {
        let d = '', c = '';
        // left: a wind-bent pine on the rocks
        d += `M0,760C40,700 90,690 150,700C220,690 300,720 360,760Z`;
        d += bar(150, 700, 200, 520, 22) + bar(200, 520, 300, 440, 16) + bar(200, 520, 90, 470, 12);
        for (const [x, y, w] of [[300, 430, 140], [90, 460, 110], [220, 490, 120], [330, 470, 90]]) d += ell(x, y, w / 2, 18) + ell(x + 10, y - 14, w / 2.6, 12);
        c += bar(180, 640, 196, 560, 3) + bar(176, 700, 186, 650, 3);
        for (let i = 0; i < 8; i++) c += bar(30 + i * 40, 752 - r() * 10, 50 + i * 40, 728 - r() * 20, 2.6);
        for (let i = 0; i < 4; i++) c += bar(1440 + i * 36, 756, 1458 + i * 36, 716 + r() * 10, 2.6);
        // right: rocks and spray
        d += `M1400,760C1430,700 1490,680 1540,690C1580,700 1600,720 1600,760Z`;
        c += S('M1420,700q20,-30 50,-20 M1480,690q20,-24 44,-12', 4, 'cut');
        return P(d) + P(c, 'cut') + isleGround(r) + fore(r, 'isle');
      },
    },
    harbor: {
      props: ['石積みの防波堤', '係船柱と舫い綱', '帆柱と索具のある漁船', '吊るしたカンテラ', '杭と網', '鴎'],
      far: seaFar,
      mid(r) {
        let d = '', c = '';
        // a fishing boat at anchor, mast and rigging
        d += `M780,700C860,736 1100,736 1200,700L1180,744C1100,762 880,762 800,744Z`;
        d += rect(986, 420, 8, 290) + rect(930, 470, 120, 6);
        d += S('M990,424L800,700 M990,424L1190,700 M990,470L860,700', 2.4);
        d += poly([[996, 440], [1100, 680], [996, 680]]);
        c += rect(1000, 520, 70, 3) + rect(1000, 580, 80, 3);
        d += rect(1120, 680, 40, 22) + rect(820, 690, 60, 12);
        d += rect(480, 480, 300, 220) + poly([[460, 484], [630, 400], [800, 484]]); c += rect(560, 560, 140, 140) + lattice(560, 560, 140, 140, 3, 4, 4) + planks(480, 480, 300, 70, 14);
        d += rect(1260, 400, 12, 300) + bar(1266, 410, 1420, 470, 8) + S('M1410,470L1410,600', 2) + rect(1396, 600, 28, 22);
        for (let i = 0; i < 3; i++) d += rect(1300 + i * 42, 640 - (i === 1 ? 40 : 0), 40, 40 + (i === 1 ? 40 : 0));
        d += S('M520,200q14,-10 28,0q14,-10 28,0 M620,160q12,-8 24,0q12,-8 24,0 M1300,240q12,-8 24,0q12,-8 24,0', 3);
        return P(d) + P(c, 'cut') + seaMid(r);
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: the stone breakwater with bollards and a coiled rope
        d += rect(0, 640, 470, 120) + rect(0, 630, 480, 14);
        c += bricks(0, 646, 470, 112, 58, 28);
        for (const x of [90, 250, 400]) d += rect(x - 12, 590, 24, 44) + ell(x, 590, 20, 8);
        d += S('M90,600C140,640 210,640 250,600', 4) + ell(300, 626, 30, 8) + ell(300, 618, 22, 6);
        c += ell(300, 626, 20, 4);
        d += rect(440, 420, 8, 210) + rect(420, 430, 50, 6) + lantern(452, 480, 1.2); g += lanternGlow(452, 480, 1.2);
        // right: pier posts with a drying net
        for (const x of [1300, 1420, 1540]) d += rect(x, 520, 14, 240) + poly([[x - 2, 522], [x + 7, 506], [x + 16, 522]]);
        d += S('M1307,540C1350,600 1390,600 1427,540C1470,600 1510,600 1547,540', 3);
        for (let x = 1316; x < 1540; x += 18) d += S(`M${x},${556 + Math.sin(x / 20) * 10}L${x + 4},740`, 1.4);
        return P(d) + P(c, 'cut') + P(g, 'glow') + isleGround(r) + fore(r, 'isle');
      },
    },
    net: {
      props: ['瓦屋根の網小屋', '干した網の目', 'ガラスの浮き玉', '干し魚の竿', '樽', '格子戸'],
      far: seaFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 820;
        d += rect(X, 500, 480, 260) + `M${X - 40},506C${X + 60},470 ${X + 160},420 ${X + 240},400C${X + 320},420 ${X + 420},470 ${X + 520},506Z`;
        for (let i = 0; i < 9; i++) c += S(`M${X - 30 + i * 6},${500 - i * 11.5}L${X + 510 - i * 6},${500 - i * 11.5}`, 2, 'cut');
        g += rect(X + 60, 560, 110, 90); c += lattice(X + 60, 560, 110, 90, 5, 3, 4);
        c += rect(X + 260, 560, 160, 200) + lattice(X + 260, 560, 160, 200, 4, 1, 6);
        d += rect(X + 200, 330, 14, 90);
        return P(d) + P(g, 'glow') + P(c, 'cut') + seaMid(r);
      },
      near(r) {
        let d = '', c = '';
        // left: poles with a hanging net and glass floats
        d += rect(40, 420, 14, 340) + rect(420, 420, 14, 340) + rect(30, 420, 414, 10);
        let net = ''; for (let i = 0; i < 18; i++) net += S(`M${60 + i * 20},430Q${66 + i * 20},600 ${56 + i * 20},740`, 1.4); for (let y = 460; y < 740; y += 24) net += S(`M54,${y}Q240,${y + 20} 420,${y}`, 1.4);
        for (const [x, y] of [[90, 500], [200, 560], [330, 520], [140, 650], [380, 640]]) { d += circ(x, y, 20); c += circ(x - 6, y - 6, 6); }
        // right: a fish-drying rack and barrels
        d += rect(1280, 480, 10, 280) + rect(1560, 480, 10, 280) + rect(1270, 480, 310, 8) + rect(1270, 560, 310, 6);
        for (let i = 0; i < 9; i++) { const x = 1300 + i * 30; d += `M${x},488v10c-8,4 -8,40 0,48c8,-8 8,-44 0,-48z`; d += `M${x},566v8c-8,4 -8,36 0,44c8,-8 8,-40 0,-44z`; }
        d += `M1310,760c-8,-30 -8,-70 0,-100h80c8,30 8,70 0,100z M1420,760c-6,-24 -6,-56 0,-80h64c6,24 6,56 0,80z`;
        c += rect(1306, 688, 88, 4) + rect(1306, 730, 88, 4) + rect(1418, 706, 68, 4);
        return net + P(d) + P(c, 'cut') + isleGround(r) + fore(r, 'isle');
      },
    },
    clinic: {
      props: ['木造の診療所', '赤十字の看板', '障子の窓', '鉢植え', '自転車', '街灯'],
      far: seaFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 800;
        d += rect(X, 420, 520, 340) + poly([[X - 40, 424], [X + 260, 300], [X + 560, 424]]) + rect(X, 560, 520, 14);
        for (let i = 0; i < 3; i++) { g += rect(X + 50 + i * 160, 450, 110, 90); c += lattice(X + 50 + i * 160, 450, 110, 90, 4, 3, 3); }
        for (let i = 0; i < 2; i++) { g += rect(X + 50 + i * 300, 610, 110, 100); c += lattice(X + 50 + i * 300, 610, 110, 100, 4, 3, 3); }
        c += rect(X + 210, 600, 100, 160);
        d += rect(X + 220, 330, 80, 60); c += rect(X + 254, 340, 12, 40) + rect(X + 240, 354, 40, 12);
        c += planks(X, 420, 520, 140, 18);
        return P(d) + P(g, 'glow') + P(c, 'cut') + seaMid(r);
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a street lamp and a bicycle leaning
        d += rect(120, 380, 10, 380) + rect(96, 380, 58, 8) + poly([[100, 388], [150, 388], [140, 420], [110, 420]]); g += rect(112, 392, 26, 24);
        const b1 = wheelSpoked(220, 712, 44, 12, 5), b2 = wheelSpoked(360, 712, 44, 12, 5);
        const brim = b1.rim + b2.rim, bhole = b1.hole + b2.hole;
        d += bar(220, 712, 280, 640, 6) + bar(280, 640, 360, 712, 6) + bar(280, 640, 340, 640, 6) + bar(290, 712, 280, 640, 6) + bar(220, 712, 290, 712, 6) + bar(340, 640, 346, 620, 5) + rect(268, 628, 30, 6);
        d += rect(30, 690, 70, 10) + rect(36, 700, 8, 60) + rect(86, 700, 8, 60) + rect(30, 660, 6, 40);
        for (let x = 0; x < 420; x += 22) d += rect(x, 716, 12, 44) + poly([[x, 716], [x + 6, 706], [x + 12, 716]]); d += rect(0, 728, 420, 6) + rect(0, 748, 420, 6);
        d += rect(1240, 640, 44, 70) + `M1240,640c0,-26 44,-26 44,0z` + rect(1256, 710, 12, 50); c += rect(1250, 652, 24, 4);
        // right: potted plants on the step
        for (const [x, h] of [[1360, 90], [1450, 130], [1530, 70]]) { d += poly([[x - 26, 760], [x - 32, 712], [x + 32, 712], [x + 26, 760]]); for (let i = 0; i < 7; i++) d += bar(x, 712, x + (i - 3) * 14, 712 - h * (.6 + r() * .4), 5); }
        return P(d) + P(c, 'cut') + P(brim) + P(bhole, 'cut') + P(b1.spokes + b2.spokes) + P(g, 'glow') + isleGround(r) + fore(r, 'isle');
      },
    },
    shrine: {
      props: ['鳥居（笠木と貫）', '石灯籠', '石の狼', '注連縄と紙垂', '社殿の反った屋根', '石段'],
      far: seaFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 900;
        // the hall with its curved roof
        d += rect(X, 520, 380, 240) + `M${X - 70},528C${X + 40},520 ${X + 120},470 ${X + 190},400C${X + 260},470 ${X + 340},520 ${X + 450},528L${X + 430},548L${X - 50},548Z`;
        d += poly([[X + 150, 420], [X + 190, 380], [X + 230, 420]]) + rect(X + 170, 360, 40, 14);
        c += lattice(X + 40, 580, 300, 140, 6, 3, 4);
        g += rect(X + 150, 600, 80, 100);
        for (let i = 0; i < 6; i++) d += rect(X + 40 - i * 10, 760 - i * 8 - 8, 300 + i * 20, 8);
        return P(d) + P(g, 'glow') + P(c, 'cut') + seaMid(r);
      },
      near(r) {
        let d = '', c = '', g = '';
        // the torii spanning the stage, posts at the sides
        d += `M330,760L344,300H376L390,760Z M1210,760L1224,300H1256L1270,760Z`;
        d += `M270,240C600,220 1000,220 1330,240L1340,206C1000,190 600,190 260,206Z` + rect(300, 268, 1000, 22) + rect(786, 240, 28, 34);
        // the sacred rope with paper streamers under the beam
        d += S('M360,300C600,350 1000,350 1240,300', 9);
        let shide = ''; for (let i = 0; i < 5; i++) { const x = 480 + i * 160, y = 322 + Math.sin((i + .5) / 5 * Math.PI) * 30; shide += poly([[x, y], [x + 12, y], [x + 12, y + 14], [x + 4, y + 14], [x + 4, y + 28], [x + 14, y + 28], [x + 14, y + 44], [x, y + 44]]); }
        // stone lanterns
        const toro = x => { d += rect(x - 14, 600, 28, 160) + rect(x - 34, 740, 68, 20) + rect(x - 30, 580, 60, 20) + rect(x - 26, 530, 52, 50) + poly([[x - 44, 532], [x, 500], [x + 44, 532]]) + circ(x, 494, 9); c += rect(x - 14, 542, 28, 28); g += rect(x - 12, 544, 24, 24); };
        toro(150); toro(1450);
        // the stone wolves on their plinths, facing the stage
        const wolfS = (x, flip) => { const s = flip ? -1 : 1; d += rect(x - 50, 700, 100, 60) + `M${x - 40 * s},700l${10 * s},-60l${-6 * s},-20l${16 * s},-6l${10 * s},-20l${8 * s},18l${30 * s},6l${-10 * s},16l${30 * s},10l${-10 * s},56z`; c += rect(x - 40, 716, 80, 4); };
        wolfS(250, false); wolfS(1350, true);
        return P(d) + P(shide, 'cut') + P(c, 'cut') + P(g, 'glow') + isleGround(r) + fore(r, 'isle');
      },
    },
  };


  /* ================= 猫鳴き湯（雪の湯治場） ================= */
  // a sitting cat, facing right (s: scale)
  const catSit = (x, y, s, flip) => { const k = flip ? -1 : 1; return `M${f(x)},${f(y)}c0,${f(-20 * s)} ${f(4 * s * k)},${f(-34 * s)} ${f(12 * s * k)},${f(-40 * s)}l${f(-2 * s * k)},${f(-12 * s)}l${f(6 * s * k)},${f(6 * s)}l${f(6 * s * k)},0l${f(5 * s * k)},${f(-6 * s)}l${f(-1 * s * k)},${f(13 * s)}c${f(6 * s * k)},${f(8 * s)} ${f(6 * s * k)},${f(30 * s)} ${f(2 * s * k)},${f(41 * s)}c${f(8 * s * k)},${f(-2 * s)} ${f(16 * s * k)},${f(-10 * s)} ${f(14 * s * k)},${f(-20 * s)}l${f(4 * s * k)},${f(2 * s)}c${f(2 * s * k)},${f(14 * s)} ${f(-8 * s * k)},${f(22 * s)} ${f(-20 * s * k)},${f(22 * s)}z`; };
  const steam = (x, y, h, w) => S(`M${x},${y}c${-w},${-h * .2} ${w},${-h * .35} 0,${-h * .5}c${-w},${-h * .15} ${w * .8},${-h * .35} ${w * .2},${-h * .5}`, 10, 'smoke');
  const onsenGround = r => alpsGround(r);
  function gableRoof(x, y, w, h, ov) { return poly([[x - ov, y], [x + w / 2, y - h], [x + w + ov, y]]) + poly([[x + w / 2 - 30, y - h + 18], [x + w / 2, y - h - 14], [x + w / 2 + 30, y - h + 18]]); }
  function jizo(x, y, s) { return ell(x, y - 46 * s, 11 * s, 12 * s) + `M${f(x - 15 * s)},${f(y)}c0,${f(-22 * s)} ${f(4 * s)},${f(-34 * s)} ${f(15 * s)},${f(-34 * s)}c${f(11 * s)},0 ${f(15 * s)},${f(12 * s)} ${f(15 * s)},${f(34 * s)}z`; }
  const ONSEN = {
    bath: {
      props: ['破風屋根の共同湯', '湯けむり', '暖簾', '積み上げた湯桶', '竹の樋', '薪の山', '雪の屋根'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 820, W = 520;
        d += rect(X, 500, W, 260) + gableRoof(X, 504, W, 150, 40) + rect(X + 60, 380, 70, 60) + poly([[X + 50, 384], [X + 95, 350], [X + 140, 384]]);
        for (let i = 0; i < 4; i++) { g += rect(X + 40 + i * 120, 540, 70, 56); c += lattice(X + 40 + i * 120, 540, 70, 56, 4, 2, 3); }
        // the noren over the door, split in three
        g += rect(X + 200, 640, 120, 120);
        for (let i = 0; i < 3; i++) c += rect(X + 202 + i * 40, 636, 36, 50);
        c += planks(X, 600, W, 36, 9);
        c += poly([[X + 220, 500], [X + W / 2, 420], [X + 300, 500]]);
        return P(d) + steam(X + 95, 350, 260, 28) + steam(X + 380, 360, 220, 22) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 42, 506], [X + W / 2, 353], [X + W + 42, 506]], 16), 'snow') + alpsVillage(r, 0, 760, 690);
      },
      near(r) {
        let d = '', c = '';
        // left: a pyramid of wooden buckets and a bamboo pipe
        for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) { const x = 70 + i * 62 + row * 31, y = 760 - row * 44; d += poly([[x, y], [x + 4, y - 40], [x + 52, y - 40], [x + 56, y]]); c += rect(x + 6, y - 30, 44, 3) + rect(x + 8, y - 14, 40, 3); }
        d += bar(0, 470, 430, 520, 16) + rect(410, 516, 14, 244);
        c += bar(0, 470, 430, 520, 4);
        d += S('M424,528q10,30 2,60', 5, 'cut');
        // right: a stack of firewood under a little roof, an axe in the block
        d += rect(1240, 560, 340, 10) + poly([[1220, 562], [1410, 520], [1600, 562]]) + rect(1250, 570, 10, 190) + rect(1570, 570, 10, 190);
        for (let row = 0; row < 7; row++) for (let i = 0; i < 12; i++) { d += circ(1280 + i * 25 + (row % 2) * 12, 748 - row * 25, 11); c += circ(1280 + i * 25 + (row % 2) * 12, 748 - row * 25, 3.6); }
        return P(d) + P(c, 'cut') + P(snowcap(r, [[1218, 563], [1410, 519], [1602, 563]], 9), 'snow') + onsenGround(r) + fore(r, 'alps');
      },
    },
    ryokan: {
      props: ['二階建ての旅籠', '格子の窓明かり', '二階の欄干', '吊り看板', '石灯籠', '招き猫', '座る猫'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 760, W = 620;
        d += rect(X, 560, W, 200) + rect(X + 20, 410, W - 40, 150) + poly([[X - 40, 564], [X + 20, 530], [X + W - 20, 530], [X + W + 40, 564]]) + poly([[X - 20, 414], [X + 60, 340], [X + W - 60, 340], [X + W + 20, 414]]);
        for (let i = 0; i < 5; i++) { g += rect(X + 50 + i * 110, 440, 80, 70); c += lattice(X + 50 + i * 110, 440, 80, 70, 4, 3, 3); }
        c += rect(X + 20, 518, W - 40, 6); for (let x = X + 30; x < X + W - 30; x += 18) c += rect(x, 522, 4, 22);
        for (let i = 0; i < 4; i++) { g += rect(X + 60 + i * 140, 600, 100, 90); c += lattice(X + 60 + i * 140, 600, 100, 90, 5, 1, 3); }
        d += rect(X + W - 10, 300, 10, 120) + rect(X + W - 10, 300, 110, 8) + rect(X + W + 20, 310, 70, 90);
        c += rect(X + W + 50, 320, 6, 70) + rect(X + W + 34, 340, 38, 4) + rect(X + W + 34, 364, 38, 4);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 22, 416], [X + 60, 339], [X + W - 60, 339], [X + W + 22, 416]], 14) + snowcap(r, [[X - 42, 566], [X + 20, 529], [X + W - 20, 529], [X + W + 42, 566]], 10), 'snow') + alpsVillage(r, 0, 700, 690);
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a stone lantern and a cat on the step
        d += rect(150, 720, 120, 40) + rect(186, 600, 48, 120) + poly([[140, 604], [210, 560], [280, 604]]) + rect(170, 520, 80, 44) + poly([[150, 524], [210, 470], [270, 524]]) + rect(202, 450, 16, 22);
        g += rect(184, 530, 52, 26); c += rect(208, 530, 4, 26);
        d += catSit(330, 760, 1.6);
        c += circ(352, 702, 2.4);
        // a potted pine on either side of the step, an umbrella stand
        d += poly([[386, 760], [392, 714], [436, 714], [442, 760]]) + rect(410, 640, 8, 76) + ell(414, 640, 30, 14) + ell(404, 666, 24, 10) + ell(426, 690, 20, 9);
        c += rect(392, 730, 44, 3);
        d += poly([[1170, 760], [1176, 690], [1236, 690], [1242, 760]]);
        for (let i = 0; i < 4; i++) d += bar(1186 + i * 12, 690, 1176 + i * 18, 600 + i * 6, 5) + circ(1176 + i * 18, 598 + i * 6, 6);
        c += rect(1178, 706, 56, 3) + rect(1176, 730, 60, 3);
        // right: the beckoning cat on its stand, one eye gone
        d += rect(1330, 700, 160, 60) + rect(1350, 690, 120, 14);
        d += ell(1410, 600, 70, 92) + ell(1410, 500, 58, 50) + poly([[1360, 470], [1366, 430], [1392, 456]]) + poly([[1460, 470], [1454, 430], [1428, 456]]);
        d += ell(1468, 520, 16, 40);
        c += circ(1390, 498, 7) + S('M1418,500q12,-8 24,0', 4, 'cut') + ell(1410, 530, 10, 5) + ell(1410, 620, 34, 30) + bar(1360, 548, 1460, 548, 5);
        c += S('M1400,610q10,-10 20,0', 3, 'cut');
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[148, 526], [210, 469], [272, 526]], 7) + snowcap(r, [[138, 606], [210, 559], [282, 606]], 7), 'snow') + onsenGround(r) + fore(r, 'alps');
      },
    },
    toji: {
      props: ['湯治の長屋', '並んだ戸口', '干し大根', '七輪と鍋', '物干し竿', '戸口の薬袋', '七輪の煙'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 700, W = 760;
        d += rect(X, 540, W, 220) + poly([[X - 30, 544], [X + 40, 470], [X + W - 40, 470], [X + W + 30, 544]]);
        for (let i = 0; i < 5; i++) {
          const x = X + 40 + i * 146;
          c += rect(x, 600, 60, 160) + rect(x + 68, 590, 56, 50);
          c += lattice(x + 68, 590, 56, 50, 3, 2, 3);
          if (i % 2) g += rect(x + 72, 594, 48, 42);
          for (let k = 0; k < 4; k++) d += rect(x + 6 + k * 12, 556, 5, 34 + (k % 2) * 8) + ell(x + 8 + k * 12, 594 + (k % 2) * 8, 4, 6);
        }
        c += planks(X, 544, W, 46, 11);
        for (let i = 0; i < 4; i++) d += rect(X + 110 + i * 180, 420, 14, 52);
        return P(d) + S(smoke(X + 117, 420, 160), 8, 'smoke') + S(smoke(X + 477, 420, 140), 8, 'smoke') + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 32, 546], [X + 40, 469], [X + W - 40, 469], [X + W + 32, 546]], 14), 'snow') + alpsVillage(r, 0, 660, 690);
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a charcoal brazier with a pot, its smoke, a stool
        d += poly([[150, 760], [160, 690], [260, 690], [270, 760]]) + rect(146, 680, 128, 12) + poly([[170, 680], [176, 640], [244, 640], [250, 680]]) + rect(196, 626, 28, 14);
        g += rect(176, 700, 68, 12); c += rect(166, 720, 88, 4);
        d += rect(320, 720, 90, 12) + rect(330, 732, 10, 28) + rect(390, 732, 10, 28);
        // a water tub and a ladle, a stack of straw bales at the edge of the stage
        d += poly([[20, 760], [28, 650], [132, 650], [140, 760]]); c += rect(30, 676, 100, 4) + rect(28, 720, 104, 4);
        d += poly([[360, 720], [366, 640], [434, 640], [440, 720]]) + bar(400, 640, 430, 560, 5) + ell(432, 556, 12, 7);
        c += rect(368, 660, 64, 3) + rect(366, 694, 68, 3);
        for (let i = 0; i < 3; i++) { d += rect(1160 + i * 4, 700 - i * 44, 86 - i * 8, 44); c += rect(1166 + i * 4, 716 - i * 44, 74 - i * 8, 2) + rect(1166 + i * 4, 730 - i * 44, 74 - i * 8, 2); }
        d += catSit(1214, 568, 1.1, true);
        // right: a drying pole with radishes and a paper medicine bag
        d += rect(1260, 470, 12, 290) + rect(1540, 470, 12, 290) + rect(1250, 470, 312, 10);
        for (let i = 0; i < 9; i++) { const x = 1284 + i * 30; d += rect(x, 480, 3, 14) + ell(x + 1, 530 + (i % 3) * 8, 7, 38); c += rect(x - 3, 520 + (i % 3) * 8, 8, 2); }
        d += rect(1440, 600, 60, 80) + poly([[1440, 600], [1470, 580], [1500, 600]]);
        c += rect(1452, 620, 36, 3) + rect(1452, 636, 36, 3) + rect(1452, 652, 24, 3);
        return P(d) + S(smoke(210, 620, 180), 8, 'smoke') + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[1248, 471], [1400, 468], [1564, 471]], 7), 'snow') + onsenGround(r) + fore(r, 'alps');
      },
    },
    mound: {
      props: ['地蔵堂', '地蔵と赤い前掛け', '猫塚の小さな塚', '卒塔婆', '枯れ木と鴉', '鈴の緒'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 900, W = 360;
        d += rect(X, 540, W, 220) + poly([[X - 70, 548], [X + 10, 470], [X + W - 10, 470], [X + W + 70, 548]]) + poly([[X + 60, 474], [X + W / 2, 410], [X + W - 60, 474]]);
        d += rect(X - 50, 740, W + 100, 20) + rect(X - 30, 720, W + 60, 20);
        g += rect(X + 110, 600, 140, 120); c += lattice(X + 110, 600, 140, 120, 6, 3, 4);
        d += rect(X + W / 2 - 3, 548, 6, 60) + circ(X + W / 2, 616, 12);
        c += planks(X, 548, W, 40, 10);
        // the small cat mounds and wooden grave tablets behind
        for (let i = 0; i < 9; i++) { const x = 560 + i * 34; d += ell(x, 716, 16, 12) + rect(x - 3, 650 + (i % 3) * 10, 6, 60 - (i % 3) * 10); }
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 72, 550], [X + 10, 469], [X + W - 10, 469], [X + W + 72, 550]], 14) + snowcap(r, [[X + 58, 476], [X + W / 2, 409], [X + W - 58, 476]], 8), 'snow') + alpsVillage(r, 0, 520, 690);
      },
      near(r) {
        let d = '', c = '', bibs = '';
        // left: a row of jizo with red bibs
        for (let i = 0; i < 5; i++) { const x = 70 + i * 66, s = 1.35 - i * .05; d += jizo(x, 760, s) + rect(x - 22, 756, 44, 6); bibs += poly([[x - 12 * s, 760 - 34 * s], [x + 12 * s, 760 - 34 * s], [x, 760 - 18 * s]]); }
        // right: a bare tree with crows, wooden tablets
        d += bareTree(1420, 760, 520, r, -24) + crow(1390, 352, 1.2) + crow(1300, 420, 1);
        for (let i = 0; i < 4; i++) { const x = 1240 + i * 28; d += poly([[x, 760], [x, 600 + i * 12], [x + 8, 592 + i * 12], [x + 16, 600 + i * 12], [x + 16, 760]]); c += rect(x + 6, 640 + i * 12, 4, 60); }
        return P(d) + P(bibs, 'cut') + P(c, 'cut') + P(snowcap(r, [[40, 708], [70, 700], [100, 708]], 5) + snowcap(r, [[106, 712], [136, 704], [166, 712]], 5), 'snow') + onsenGround(r) + fore(r, 'alps');
      },
    },
    spring: {
      props: ['湯滝', '岩の裂け目', '湯けむり', '湯守小屋', '竹の樋', '湯の花の岩', 'つらら'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        // the rock face with the hot fall pouring down, a little right of centre
        d += 'M760,760L760,520C780,460 820,420 880,400L940,330C980,300 1040,290 1080,320L1160,300C1220,290 1280,330 1300,390L1340,460C1380,520 1400,600 1400,760Z';
        for (let i = 0; i < 6; i++) c += S(`M${1030 + i * 14},330C${1026 + i * 14},430 ${1040 + i * 14},560 ${1030 + i * 14},700`, 4, 'cut');
        c += ell(1070, 712, 120, 22);
        c += S('M820,520l40,-20 M860,600l60,-18 M1260,500l40,10 M1240,620l60,8', 5, 'cut');
        // strata in the rock and the yellow bloom where the water splashes
        c += S('M790,560q60,-14 140,-6 M800,660q70,-20 160,-8 M1180,560q60,-10 150,6 M1190,680q70,-14 180,4 M900,450q40,-20 90,-16 M1150,430q50,-10 110,10', 3, 'cut');
        for (let i = 0; i < 18; i++) c += circ(960 + r() * 230, 640 + r() * 60, 2 + r() * 4);
        // the keeper's hut on the shoulder of the rock
        d += rect(1290, 390, 120, 90) + poly([[1276, 394], [1350, 340], [1424, 394]]); g += rect(1320, 420, 30, 34);
        d += icicles(r, 1280, 1420, 396, 18);
        return P(d) + steam(1070, 700, 380, 40) + steam(980, 690, 300, 30) + steam(1160, 690, 280, 28) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[870, 402], [940, 331], [1000, 300], [1080, 321]], 14) + snowcap(r, [[1274, 396], [1350, 339], [1426, 396]], 10), 'snow');
      },
      near(r) {
        let d = '', c = '';
        // left: rocks crusted with yellow bloom, a bamboo pipe dripping
        d += 'M0,760L0,600C40,560 110,560 160,590C210,560 290,570 330,620C380,640 420,700 430,760Z';
        for (let i = 0; i < 14; i++) c += circ(30 + r() * 360, 640 + r() * 100, 3 + r() * 5);
        d += bar(60, 520, 420, 560, 14) + rect(60, 520, 10, 100);
        c += bar(60, 520, 420, 560, 3);
        d += S('M420,566q4,30 -2,60 M424,566q10,40 0,80', 3, 'cut');
        // right: the steaming pool's stone rim and a hanging ladle
        d += 'M1180,760C1200,710 1260,690 1340,700C1420,690 1520,700 1600,720L1600,760Z';
        c += ell(1390, 736, 160, 14);
        d += rect(1500, 480, 10, 230) + rect(1460, 480, 90, 8) + ell(1470, 560, 22, 12) + bar(1470, 488, 1470, 556, 4);
        return P(d) + steam(1380, 720, 220, 26) + P(c, 'cut') + onsenGround(r) + fore(r, 'alps');
      },
    },
  };


  /* ================= 白嶺修道院（雪の峰の修道院） ================= */
  function barrel(x, y, w, h) { return ell(x + w / 2, y + h / 2, w / 2, h / 2) + rect(x + w * .08, y + h * .2, w * .84, h * .6); }
  const ABBEY = {
    chapel: {
      props: ['尖塔の礼拝堂', 'ばら窓', '尖頭窓の列', '狼を抱く聖人像の影', '燭台', '十字の墓標', 'つらら'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 800, W = 480;
        d += rect(X, 420, W, 340) + poly([[X - 20, 424], [X + W / 2, 250], [X + W + 20, 424]]);
        d += rect(X + W / 2 - 50, 120, 100, 310) + poly([[X + W / 2 - 60, 126], [X + W / 2, -20], [X + W / 2 + 60, 126]]) + rect(X + W / 2 - 3, -60, 6, 46) + rect(X + W / 2 - 16, -46, 32, 6);
        c += circ(X + W / 2, 340, 52); c += lattice(X + W / 2 - 52, 288, 104, 104, 4, 4, 4); g += circ(X + W / 2, 340, 30);
        for (let i = 0; i < 4; i++) { const x = X + 28 + i * (i < 2 ? 70 : 70) + (i >= 2 ? 210 : 0); g += gothic(x, 640, 44, 160); c += rect(x + 20, 486, 4, 154); }
        g += gothic(X + W / 2 - 50, 760, 100, 170);
        c += gothic(X + W / 2 - 40, 760, 80, 156);
        c += gothic(X + W / 2 - 22, 200, 44, 60);
        d += icicles(r, X - 10, X + W + 10, 426, 22);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 22, 426], [X + W / 2, 249], [X + W + 22, 426]], 14) + snowcap(r, [[X + W / 2 - 62, 128], [X + W / 2, -21], [X + W / 2 + 62, 128]], 8), 'snow') + alpsVillage(r, 0, 760, 700);
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: the statue of the saint holding a wolf, on its plinth
        d += rect(150, 680, 170, 80) + rect(166, 664, 138, 18);
        d += `M200,664C196,600 206,520 230,480C222,460 226,430 246,422C266,414 284,430 282,452C298,470 300,530 296,664Z`;
        d += `M222,560c16,-28 52,-36 76,-26l14,-14l4,16c10,6 12,18 6,26l-20,6c-18,16 -52,20 -76,10z`;
        c += S('M244,446q10,6 20,0', 3, 'cut') + rect(176, 700, 118, 4) + rect(176, 724, 118, 4);
        // a tall candlestick with its flame
        d += rect(380, 600, 10, 160) + rect(366, 750, 38, 10) + rect(372, 596, 26, 8) + rect(381, 560, 8, 36);
        g += ell(385, 548, 7, 14);
        // right: grave crosses in the snow and a bare tree with a crow
        for (const [x, h] of [[1260, 110], [1350, 140], [1450, 100], [1540, 124]]) { d += rect(x, 760 - h, 12, h) + rect(x - 22, 760 - h + 26, 56, 11); }
        d += bareTree(1520, 760, 420, r, -18) + crow(1470, 420, 1.1);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[148, 682], [235, 678], [322, 682]], 6), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
    scriptorium: {
      props: ['高い尖頭窓', '書見台と写本', '巻物の棚', 'インク壺と鵞ペン', '燭台', '石の柱'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 720, W = 720;
        d += rect(X, 360, W, 400) + poly([[X - 20, 364], [X + 60, 300], [X + W - 60, 300], [X + W + 20, 364]]);
        for (let i = 0; i < 5; i++) { const x = X + 50 + i * 140; g += gothic(x, 620, 80, 220); c += rect(x + 38, 420, 4, 200) + rect(x, 520, 80, 4); }
        // shelves of books and scrolls under the windows
        for (let i = 0; i < 5; i++) { const x = X + 40 + i * 140; d += rect(x, 650, 100, 6); for (let k = 0; k < 7; k++) c += rect(x + 6 + k * 13, 660 + (k % 3) * 4, 9, 30 - (k % 3) * 4); for (let k = 0; k < 3; k++) c += circ(x + 20 + k * 30, 724, 9); }
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 22, 366], [X + 60, 299], [X + W - 60, 299], [X + W + 22, 366]], 12), 'snow');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a slanted lectern with an open codex, quill and ink
        d += rect(190, 560, 14, 200) + rect(150, 750, 94, 10) + poly([[110, 560], [300, 520], [304, 536], [114, 576]]);
        d += poly([[130, 548], [205, 532], [205, 520], [134, 536]]) + poly([[208, 530], [286, 514], [282, 502], [208, 518]]);
        c += S('M140,544l56,-12 M146,552l50,-10 M216,526l56,-12 M220,534l50,-10', 2, 'cut');
        d += ell(330, 742, 22, 16) + rect(318, 720, 24, 10) + bar(330, 720, 360, 640, 4);
        c += bar(338, 704, 352, 670, 2);
        // a pile of bound books on the floor, a stool
        for (let i = 0; i < 5; i++) { d += rect(370 + (i % 2) * 6, 744 - i * 18, 70 - i * 4, 16); c += rect(374 + (i % 2) * 6, 750 - i * 18, 60 - i * 4, 2); }
        d += rect(1170, 690, 90, 12) + rect(1180, 702, 10, 58) + rect(1240, 702, 10, 58);
        for (let i = 0; i < 3; i++) d += rect(1178 + i * 26, 650, 20, 40) + poly([[1178 + i * 26, 650], [1188 + i * 26, 640], [1198 + i * 26, 650]]);
        // right: a heavy column and a candlestick
        d += rect(1300, 300, 70, 460) + rect(1286, 290, 98, 18) + rect(1290, 740, 90, 20);
        c += rect(1316, 320, 4, 420) + rect(1346, 320, 4, 420);
        d += rect(1460, 610, 10, 150) + rect(1446, 750, 38, 10) + rect(1452, 606, 26, 8) + rect(1461, 572, 8, 34);
        g += ell(1465, 560, 7, 14);
        return P(d) + P(g, 'glow') + P(c, 'cut') + alpsGround(r) + fore(r, 'alps');
      },
    },
    cloister: {
      props: ['回廊の半円アーチ', '中庭の井戸と釣瓶', '雪の薬草園の畝', '石の柱', '吊り灯籠', '雀'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 640, W = 900;
        d += rect(X, 420, W, 340) + rect(X - 10, 400, W + 20, 24);
        for (let i = 0; i < 7; i++) { const x = X + 30 + i * 124; c += roundArch(x, 760, 96, 260); c += rect(x + 104, 520, 12, 240); }
        c += planks(X, 424, W, 60, 12);
        // the well in the courtyard and the herb beds
        d += rect(960, 690, 140, 70) + rect(954, 682, 152, 12) + rect(970, 560, 10, 124) + rect(1080, 560, 10, 124) + rect(962, 552, 136, 10) + rect(1026, 562, 4, 70) + rect(1016, 630, 24, 22);
        c += bricks(966, 696, 128, 60, 32, 15);
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 12, 401], [X + W / 2, 398], [X + W + 12, 401]], 10) + snowcap(r, [[958, 553], [1030, 550], [1102, 553]], 7), 'snow');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a stone column with a hanging lantern, snowy herb beds
        d += rect(170, 320, 60, 440) + rect(156, 310, 88, 16) + rect(160, 744, 80, 16);
        c += rect(186, 340, 4, 400) + rect(210, 340, 4, 400);
        d += rect(230, 360, 120, 6) + rect(338, 366, 3, 30) + lantern(340, 440, 1.2); g += lanternGlow(340, 440, 1.2);
        for (let i = 0; i < 3; i++) { d += `M${20 + i * 120},760c10,-30 90,-30 100,0z`; c += S(`M${40 + i * 120},748l10,-14 M${60 + i * 120},746l6,-18 M${80 + i * 120},748l10,-14`, 2.4, 'cut'); }
        // right: a column, a bench and a sparrow
        d += rect(1380, 320, 60, 440) + rect(1366, 310, 88, 16) + rect(1370, 744, 80, 16);
        c += rect(1396, 340, 4, 400) + rect(1420, 340, 4, 400);
        d += rect(1200, 700, 160, 12) + rect(1210, 712, 10, 48) + rect(1340, 712, 10, 48);
        // a basket of herbs on the bench, a watering can by the beds
        d += poly([[1220, 700], [1226, 666], [1274, 666], [1280, 700]]) + S('M1226,666q24,-34 48,0', 4) ;
        for (let i = 0; i < 5; i++) d += bar(1236 + i * 8, 668, 1230 + i * 10, 640 - (i % 2) * 8, 3);
        d += poly([[370, 760], [376, 700], [436, 700], [440, 760]]) + bar(436, 712, 470, 690, 6) + S('M380,700q24,-30 52,0', 4);
        d += 'M1290,700c4,-14 20,-18 28,-8l8,-4l-2,8c4,8 -4,14 -14,12z';
        return P(d) + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[1198, 701], [1280, 698], [1362, 701]], 5), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
    cellar: {
      props: ['石の穹窿', '並んだ樽', '竈と鍋', '石段', '吊るしたハムと香草', '燭台'],
      far: r => P('M0,900L0,0L1600,0L1600,900Z'),
      mid(r) {
        let d = '', c = '', g = '';
        // the vaulted ceiling: a row of round arches seen from inside
        for (let i = 0; i < 5; i++) { const x = 40 + i * 320; d += rect(x, 120, 40, 640); c += roundArch(x + 50, 470, 260, 300); }
        d += rect(0, 100, 1600, 30);
        // barrels stacked under the arches in the middle
        for (let i = 0; i < 4; i++) { d += barrel(700 + i * 110, 640, 100, 120); c += rect(708 + i * 110, 672, 84, 4) + rect(708 + i * 110, 728, 84, 4) + circ(750 + i * 110, 700, 6); }
        for (let i = 0; i < 3; i++) { d += barrel(755 + i * 110, 530, 100, 110); c += rect(763 + i * 110, 560, 84, 4) + rect(763 + i * 110, 610, 84, 4); }
        return P(d) + P(c, 'cut') + P(g, 'glow');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: the hearth with its fire and a pot on a chain
        d += rect(60, 480, 300, 280) + rect(40, 466, 340, 20);
        c += roundArch(110, 760, 200, 210); g += roundArch(130, 760, 160, 120);
        d += rect(208, 486, 4, 120) + ell(210, 640, 46, 30) + rect(170, 616, 80, 10);
        d += S('M190,600q-10,-40 6,-70 M226,600q12,-36 -4,-66', 6, 'smoke');
        // right: stone steps going up, hams and herbs hanging, a candle
        for (let i = 0; i < 7; i++) d += rect(1240 + i * 50, 760 - i * 44, 360 - i * 50, 44);
        c += S('M1240,716h360 M1290,672h310 M1340,628h260 M1390,584h210 M1440,540h160 M1490,496h110', 2, 'cut');
        d += rect(1180, 300, 300, 8);
        for (let i = 0; i < 4; i++) { const x = 1200 + i * 70; d += rect(x + 10, 308, 3, 30) + ell(x + 12, 372, 18, 36); c += ell(x + 12, 372, 6, 14); }
        d += rect(1140, 690, 10, 70) + rect(1128, 752, 34, 8); g += ell(1145, 680, 6, 12);
        return P(d) + P(g, 'glow fire') + P(c, 'cut') + P('M0,900L0,760L1600,760L1600,900Z') + fore(r, 'alps');
      },
    },
    hospice: {
      props: ['門と門番の詰所', '石の塀', '宿坊の灯る窓', '煙突の煙', '積んだ薪', '巡礼の杖と帽子'],
      far: alpsFar,
      mid(r) {
        let d = '', c = '', g = '';
        const X = 820, W = 520;
        d += rect(X, 500, W, 260) + poly([[X - 30, 504], [X + W / 2, 360], [X + W + 30, 504]]) + rect(X + 380, 380, 50, 110);
        for (let i = 0; i < 4; i++) { g += rect(X + 40 + i * 120, 560, 64, 70); c += lattice(X + 40 + i * 120, 560, 64, 70, 2, 3, 4); }
        g += roundArch(X + 210, 760, 100, 120);
        c += roundArch(X + 220, 760, 80, 104);
        // the wall and the gate to the left of the guesthouse
        d += rect(380, 600, 420, 160) + rect(372, 590, 436, 14) + rect(540, 470, 120, 290) + poly([[530, 474], [600, 420], [670, 474]]);
        c += bricks(380, 610, 160, 146, 40, 22) + bricks(660, 610, 140, 146, 40, 22) + roundArch(560, 760, 80, 190) + lattice(560, 590, 80, 170, 4, 6, 4);
        return P(d) + S(smoke(X + 405, 378, 220), 9, 'smoke') + P(g, 'glow') + P(c, 'cut') + P(snowcap(r, [[X - 32, 506], [X + W / 2, 359], [X + W + 32, 506]], 16) + snowcap(r, [[370, 591], [590, 588], [810, 591]], 8) + snowcap(r, [[528, 476], [600, 419], [672, 476]], 8), 'snow');
      },
      near(r) {
        let d = '', c = '';
        // left: a pilgrim's staff with a hat and a gourd, leaning on a post
        d += rect(140, 400, 14, 360) + bar(240, 760, 300, 420, 7) + ell(296, 418, 38, 10) + ell(296, 408, 20, 12) + ell(266, 520, 14, 20) + ell(266, 496, 8, 8);
        c += S('M286,416q10,-6 20,0', 2, 'cut');
        // right: a stack of firewood and an axe in the block
        for (let row = 0; row < 6; row++) for (let i = 0; i < 9; i++) { d += circ(1320 + i * 26 + (row % 2) * 13, 748 - row * 26, 12); c += circ(1320 + i * 26 + (row % 2) * 13, 748 - row * 26, 4); }
        d += rect(1200, 710, 80, 50) + bar(1240, 712, 1270, 640, 6) + poly([[1258, 646], [1296, 630], [1290, 664]]);
        // a low wall with a bench and a lantern post at the left, a hand cart at the right edge
        d += rect(0, 660, 130, 100) + rect(-4, 650, 138, 14); c += bricks(0, 668, 130, 90, 32, 18);
        d += rect(330, 520, 10, 240) + lantern(335, 560, 1.3);
        d += rect(1160, 700, 120, 10) + circ(1180, 740, 20) + circ(1260, 740, 20) + bar(1270, 704, 1310, 660, 5);
        c += circ(1180, 740, 8) + circ(1260, 740, 8);
        return P(d) + P(lanternGlow(335, 560, 1.3), 'glow') + P(c, 'cut') + P(snowcap(r, [[1306, 620], [1430, 616], [1556, 620]], 8) + snowcap(r, [[-4, 651], [65, 648], [134, 651]], 6), 'snow') + alpsGround(r) + fore(r, 'alps');
      },
    },
  };


  /* ================= 霧笛座（霧の港の劇場） ================= */
  const fogFar = r => P('M0,900L0,560C260,552 520,566 800,558C1080,550 1340,564 1600,556L1600,900Z') + P('M120,560L120,380L128,380L128,560Z M100,420L150,420L150,426L100,426Z M1380,556L1380,330L1388,330L1388,556Z M1350,380L1420,380L1420,386L1350,386Z M1460,556L1460,400L1466,400L1466,556Z') + P(circ(1240, 110, 30), 'moonc') + S('M180,160q70,-18 140,0q60,-14 110,6 M860,120q60,-16 120,0q50,-12 90,6', 3);
  const hallFar = r => P('M0,900L0,0L1600,0L1600,900Z');
  const boards = r => P('M0,900L0,756L1600,756L1600,900Z') + P(planks(0, 756, 1600, 140, 16) + (() => { let c = ''; for (let x = 60; x < 1600; x += 140 + r() * 60) c += rect(x, 760, 2, 120); return c; })(), 'cut');
  const cobbles = r => { let c = ''; for (let y = 770; y < 900; y += 22) for (let x = (y / 22 % 2) * 30; x < 1600; x += 60) c += ell(x + 26, y + 8, 24, 8); return P('M0,900L0,756C400,750 800,762 1200,754C1400,750 1500,758 1600,754L1600,900Z') + P(c, 'cut'); };
  // a gas lamp on a post: a glass globe and a cross-bar
  function gasLamp(x, y, h) { return rect(x - 5, y - h, 10, h) + rect(x - 16, y - 10, 32, 10) + rect(x - 22, y - h - 6, 44, 6) + poly([[x - 14, y - h - 6], [x - 18, y - h - 44], [x + 18, y - h - 44], [x + 14, y - h - 6]]) + poly([[x - 22, y - h - 44], [x, y - h - 62], [x + 22, y - h - 44]]); }
  const gasGlow = (x, y, h) => poly([[x - 10, y - h - 10], [x - 13, y - h - 40], [x + 13, y - h - 40], [x + 10, y - h - 10]]);
  // a swag of curtain: gathered folds falling from a top bar
  function drape(x, w, y0, y1, side) { let d = '', c = ''; d += `M${x},${y0}L${x + w},${y0}C${x + w - side * 10},${(y0 + y1) / 2} ${x + w - side * 40},${y1 - 80} ${x + (side > 0 ? w * .55 : w * .45)},${y1}L${x + (side > 0 ? 0 : w)},${y1}Z`; for (let i = 1; i < 5; i++) c += S(`M${x + w * i / 5},${y0 + 10}q${side * 6},${(y1 - y0) * .4} ${-side * 4},${(y1 - y0) * .8}`, 3, 'cut'); return { d, c }; }

  const THEATER = {
    stage: {
      props: ['額縁の舞台口', '緞帳の袖幕', 'フットライトのガス灯', '書き割りの支え', '重りの砂袋と綱', 'プロンプターの箱'],
      far: hallFar,
      mid(r) {
        let d = '', c = '', g = '';
        // the proscenium: a wide arch frame with a crest, the curtain drawn up into swags
        d += rect(380, 120, 60, 640) + rect(1160, 120, 60, 640) + rect(380, 90, 840, 70) + poly([[740, 90], [800, 30], [860, 90]]);
        c += circ(800, 70, 18) + rect(396, 180, 6, 560) + rect(418, 180, 6, 560) + rect(1176, 180, 6, 560) + rect(1198, 180, 6, 560) + rect(400, 110, 800, 5);
        const L = drape(440, 200, 160, 520, 1), R = drape(960, 200, 160, 520, -1);
        d += L.d + R.d; c += L.c + R.c;
        d += 'M440,160L1160,160L1160,200C1040,230 900,190 800,214C700,190 560,230 440,200Z';
        // the prompter's box at the front edge, the footlights glowing in a row
        d += 'M740,760L740,724Q800,690 860,724L860,760Z'; c += rect(770, 730, 60, 8);
        for (let x = 470; x < 1150; x += 60) { d += rect(x, 748, 30, 12); g += ell(x + 15, 744, 12, 6); }
        return P(d) + P(g, 'glow') + P(c, 'cut');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a scenery flat leaning on its brace, a sandbag counterweight on a rope
        d += poly([[60, 760], [90, 300], [280, 300], [300, 760]]) + bar(300, 760, 220, 420, 8) + rect(200, 740, 60, 20);
        c += rect(110, 330, 150, 4) + rect(104, 470, 166, 4) + rect(98, 610, 180, 4) + bar(120, 340, 250, 600, 3);
        d += rect(360, 0, 4, 560) + ell(362, 590, 24, 34) + rect(350, 556, 24, 6);
        c += S('M346,600q16,8 32,0', 3, 'cut');
        // right: a gas footlight stand and a coil of rope by a ladder
        d += gasLamp(1270, 760, 200); g += gasGlow(1270, 760, 200);
        for (let i = 0; i < 9; i++) d += rect(1420, 300 + i * 50, 120, 7);
        d += rect(1414, 280, 10, 480) + rect(1536, 280, 10, 480);
        d += ell(1360, 744, 46, 16); c += ell(1360, 744, 34, 10) + ell(1360, 744, 20, 5);
        return P(d) + P(g, 'glow') + P(c, 'cut') + boards(r);
      },
    },
    trap: {
      props: ['頭上の梁と根太', '大きな滑車と綱', 'せり台の枠', '小道具の箱の山', '吊るした狐の面', 'はしごとカンテラ'],
      far: r => P('M0,900L0,0L1600,0L1600,900Z'),
      mid(r) {
        let d = '', c = '', g = '';
        // the joists of the stage floor overhead, the posts that hold them
        d += rect(0, 90, 1600, 40); for (let x = 20; x < 1600; x += 110) { d += rect(x, 130, 26, 36); c += rect(x + 4, 96, 18, 4); }
        for (const x of [520, 1060]) { d += rect(x, 130, 34, 630); c += rect(x + 8, 160, 4, 580); }
        // the lift: a frame with its platform, ropes up to a big spoked pulley
        d += rect(620, 260, 16, 500) + rect(964, 260, 16, 500) + rect(610, 250, 380, 18) + rect(636, 600, 328, 22);
        c += lattice(640, 620, 320, 140, 8, 1, 3) + bar(640, 270, 960, 600, 3) + bar(960, 270, 640, 600, 3);
        const w = wheelSpoked(800, 200, 70, 8, 12); d += w.rim + w.spokes; c += w.hole;
        d += rect(728, 200, 4, 400) + rect(868, 200, 4, 400);
        return P(d) + P(g, 'glow') + P(c, 'cut');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: crates of old props stacked, a fox mask hanging from a nail
        for (const [x, y, w, h] of [[40, 640, 160, 120], [210, 670, 120, 90], [70, 540, 120, 100], [220, 590, 90, 80]]) { d += rect(x, y, w, h); c += bar(x + 8, y + 8, x + w - 8, y + h - 8, 3) + rect(x + 6, y + h / 2, w - 12, 3); }
        d += rect(150, 300, 3, 140) + 'M120,440L186,440L196,470Q154,540 112,470Z M120,440L110,410L136,432Z M186,440L196,410L170,432Z';
        c += ell(138, 462, 7, 4) + ell(170, 462, 7, 4) + 'M150,490L158,490L154,498Z';
        // right: a ladder going up, a lantern, a coil of rope on the floor
        d += rect(1300, 120, 10, 640) + rect(1390, 120, 10, 640); for (let y = 160; y < 760; y += 56) d += rect(1300, y, 100, 8);
        d += rect(1470, 330, 120, 6) + rect(1520, 336, 3, 40) + lantern(1522, 420, 1.2); g += lanternGlow(1522, 420, 1.2);
        d += ell(1490, 744, 50, 16); c += ell(1490, 744, 36, 10) + ell(1490, 744, 20, 5);
        return P(d) + P(g, 'glow') + P(c, 'cut') + boards(r);
      },
    },
    green: {
      props: ['電球に囲まれた鏡の列', '衣装の掛かった竿', '鏡台と白粉の壺', 'かつらの台', '衣装箱', '外套と帽子の掛け具'],
      far: hallFar,
      mid(r) {
        let d = '', c = '', g = '';
        // a long wall of mirrors ringed with bulbs, a shelf under them
        d += rect(380, 200, 840, 300) + rect(370, 500, 860, 16);
        for (let i = 0; i < 4; i++) { const x = 410 + i * 205; c += rect(x, 240, 160, 220); for (let k = 0; k < 6; k++) { g += circ(x - 10, 250 + k * 40, 7) + circ(x + 170, 250 + k * 40, 7); } }
        // a rail of costumes hanging below the mirrors
        d += rect(420, 560, 760, 8) + rect(420, 568, 8, 192) + rect(1172, 568, 8, 192);
        for (let i = 0; i < 9; i++) { const x = 450 + i * 80; d += S(`M${x + 20},568l0,16`, 3) + poly([[x, 584], [x + 40, 584], [x + 50, 700 - (i % 3) * 30], [x - 10, 700 - (i % 3) * 30]]); c += rect(x + 18, 600, 4, 70 - (i % 3) * 30); }
        return P(d) + P(g, 'glow') + P(c, 'cut');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: a dressing table with a round mirror, jars of powder, a wig on its stand
        d += rect(60, 600, 260, 20) + rect(70, 620, 14, 140) + rect(296, 620, 14, 140) + rect(120, 620, 150, 60);
        d += circ(190, 470, 90) + rect(182, 556, 16, 46); c += circ(190, 470, 74);
        for (let i = 0; i < 3; i++) { d += rect(100 + i * 50, 570, 30, 30) + rect(96 + i * 50, 562, 38, 10); c += rect(104 + i * 50, 582, 22, 4); }
        d += rect(350, 560, 8, 200) + rect(330, 750, 48, 10) + 'M320,560C320,500 390,500 390,560L384,600C372,580 336,580 326,600Z';
        c += S('M334,540q20,-14 40,0 M330,560q24,-12 50,0', 2.4, 'cut');
        // right: a coat stand with a cloak and a top hat, a costume trunk
        d += rect(1340, 260, 10, 500) + rect(1310, 750, 70, 10) + rect(1300, 260, 90, 8);
        d += 'M1310,268L1380,268L1400,520L1290,520Z' + rect(1386, 230, 40, 30) + rect(1376, 258, 60, 6);
        c += rect(1340, 290, 10, 220) + bar(1300, 500, 1390, 500, 3);
        d += rect(1440, 640, 150, 120) + 'M1440,640Q1515,590 1590,640Z';
        c += rect(1450, 690, 130, 4) + rect(1508, 650, 14, 20) + rect(1460, 650, 4, 100) + rect(1566, 650, 4, 100);
        return P(d) + P(g, 'glow') + P(c, 'cut') + boards(r);
      },
    },
    quay: {
      props: ['劇場の裏の煉瓦の壁', '楽屋口とガス灯', '霧の中の帆柱', '係船柱と綱', '霧笛のラッパ', '樽と木箱'],
      far: fogFar,
      mid(r) {
        let d = '', c = '', g = '';
        // the back of the theater: brick wall, a row of high windows, the stage door with its lamp and sign
        const X = 560, W = 600;
        d += rect(X, 240, W, 520) + poly([[X - 20, 244], [X + W / 2, 170], [X + W + 20, 244]]);
        c += bricks(X, 250, W, 500, 40, 20);
        for (let i = 0; i < 5; i++) { const x = X + 40 + i * 115; g += roundArch(x, 400, 60, 100); c += rect(x + 28, 300, 4, 100); }
        g += rect(X + W / 2 - 50, 560, 100, 200); c += rect(X + W / 2 - 4, 560, 8, 200) + rect(X + W / 2 - 50, 640, 100, 6);
        d += rect(X + W / 2 - 90, 500, 180, 40); c += rect(X + W / 2 - 80, 508, 160, 4) + rect(X + W / 2 - 80, 524, 160, 4);
        d += rect(X + W / 2 + 80, 520, 6, 60) + lantern(X + W / 2 + 120, 600, 1); g += lanternGlow(X + W / 2 + 120, 600, 1);
        return P(d) + P(g, 'glow') + P(c, 'cut');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: an iron bollard with a rope, crates and a barrel, a gas street lamp
        d += 'M140,760L150,690Q150,670 170,670L210,670Q230,670 230,690L240,760Z' + rect(134, 664, 112, 14);
        c += S('M152,700q40,20 80,0 M150,720q42,20 84,0', 4, 'cut');
        d += S('M240,700Q320,740 400,720', 8);
        for (const [x, y, w, h] of [[20, 650, 100, 110], [40, 560, 80, 90]]) { d += rect(x, y, w, h); c += bar(x + 6, y + 6, x + w - 6, y + h - 6, 3) + rect(x + 6, y + h / 2, w - 12, 3); }
        d += barrel(300, 650, 80, 110); c += rect(306, 680, 68, 4) + rect(306, 726, 68, 4);
        d += gasLamp(450, 760, 300); g += gasGlow(450, 760, 300);
        // right: the foghorn hut on piles, its great horn pointing out to sea
        d += rect(1300, 500, 220, 180) + poly([[1280, 504], [1410, 420], [1540, 504]]) + rect(1310, 680, 14, 80) + rect(1496, 680, 14, 80);
        c += planks(1300, 500, 220, 180, 18) + rect(1360, 560, 50, 70);
        d += 'M1520,560L1600,520L1600,640L1520,600Z' + rect(1500, 556, 24, 48);
        return P(d) + P(g, 'glow') + P(c, 'cut') + cobbles(r);
      },
    },
    box: {
      props: ['向かいの桟敷の列', '大きなシャンデリア', 'ビロードの幕', '手すりと椅子', 'オペラグラス', '天井の円い装飾'],
      far: hallFar,
      mid(r) {
        let d = '', c = '', g = '';
        // the tiers of boxes across the hall, balustrades and pillars, a chandelier in the middle
        for (const y of [300, 470]) { d += rect(260, y, 1080, 26) + rect(260, y + 90, 1080, 14); for (let x = 260; x <= 1340; x += 120) d += rect(x, y + 26, 10, 64); for (let x = 280; x < 1340; x += 30) c += rect(x, y + 34, 10, 48); }
        d += rect(796, 0, 8, 120); d += 'M700,170Q800,260 900,170L880,150Q800,210 720,150Z' + rect(760, 120, 80, 30);
        for (let i = 0; i < 7; i++) { const x = 712 + i * 30; d += rect(x, 150, 4, 40); g += ell(x + 2, 140, 6, 10); }
        c += circ(800, 135, 12);
        d += 'M260,640L1340,640L1340,660C1100,700 500,700 260,660Z';
        return P(d) + P(g, 'glow') + P(c, 'cut');
      },
      near(r) {
        let d = '', c = '', g = '';
        // left: the velvet curtain of our own box, tied back, a gilt chair
        d += 'M0,0L240,0C200,180 230,320 150,420C200,460 220,620 200,760L0,760Z';
        c += S('M40,20q20,300 -10,700 M90,20q30,260 0,700 M140,20q24,200 -10,380', 3, 'cut') + ell(172, 430, 30, 12);
        d += rect(290, 560, 90, 14) + rect(296, 420, 12, 140) + rect(362, 420, 12, 140) + rect(296, 574, 10, 186) + rect(364, 574, 10, 186) + rect(290, 410, 90, 14);
        c += rect(312, 440, 46, 100);
        // right: the box rail with its balusters, opera glasses on the velvet, a second chair
        d += rect(1180, 620, 420, 24) + rect(1180, 740, 420, 20); for (let x = 1190; x < 1600; x += 34) d += rect(x, 644, 14, 96) + ell(x + 7, 690, 10, 14);
        d += rect(1300, 600, 30, 20) + rect(1340, 600, 30, 20) + rect(1326, 606, 18, 6);
        c += circ(1315, 610, 6) + circ(1355, 610, 6);
        d += rect(1440, 440, 90, 14) + rect(1446, 300, 12, 140) + rect(1512, 300, 12, 140);
        c += rect(1462, 320, 46, 100);
        return P(d) + P(g, 'glow') + P(c, 'cut') + boards(r);
      },
    },
  };

  root.WLScenes = { alps: ALPS, train: TRAIN, island: ISLAND, onsen: ONSEN, abbey: ABBEY, theater: THEATER };
})(typeof window !== 'undefined' ? window : globalThis);
