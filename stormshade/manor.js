/* 嵐影館 — 黒鷺館の書き割り（影絵の背景）。狼影灯と同じ三層：遠景 far・中景 mid（場所の顔）・近景 near（左右の小道具）。
   舞台の中央下（人形の立つところ）は近景を空けておく。 */
(function (root) {
  'use strict';
  const f = n => Math.round(n * 10) / 10;
  const rect = (x, y, w, h) => `M${f(x)},${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
  const poly = p => 'M' + p.map(q => f(q[0]) + ',' + f(q[1])).join('L') + 'Z';
  const circ = (cx, cy, r) => `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0Z`;
  const arch = (x, y, w, h) => `M${f(x)},${f(y)}V${f(y - h + w / 2)}A${f(w / 2)},${f(w / 2)} 0 0,1 ${f(x + w)},${f(y - h + w / 2)}V${f(y)}Z`;
  const R = s => { let x = s; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
  // a wall clock: case, face (cut), pendulum
  function clock(x, y, s, r) {
    const kind = Math.floor(r() * 3);
    let d = '', cut = '';
    if (kind === 0) { d += rect(x - 18 * s, y, 36 * s, 120 * s) + circ(x, y, 26 * s); cut += circ(x, y, 19 * s) + rect(x - 1.5 * s, y + 40 * s, 3 * s, 56 * s) + circ(x, y + 100 * s, 7 * s); }
    else if (kind === 1) { d += circ(x, y, 30 * s); cut += circ(x, y, 23 * s); }
    else { d += poly([[x - 24 * s, y - 30 * s], [x, y - 46 * s], [x + 24 * s, y - 30 * s], [x + 24 * s, y + 30 * s], [x - 24 * s, y + 30 * s]]); cut += circ(x, y - 6 * s, 16 * s); }
    const a = r() * 6.28, b = r() * 6.28;
    const hand = (ang, len, w) => poly([[x - Math.sin(ang) * 2 * s * w, y + Math.cos(ang) * 2 * s * w], [x + Math.cos(ang - 1.5708) * -len * s, y + Math.sin(ang - 1.5708) * len * s], [x + Math.sin(ang) * 2 * s * w, y - Math.cos(ang) * 2 * s * w]]);
    return { d: d + hand(a, 14, 1) + hand(b, 9, 1.4), cut: cut };
  }
  const wainscot = '<path d="M0,620 L1600,620 L1600,632 L0,632 Z"/>';
  function room(kind, r) {
    // the walls of the house: a dark band of wainscot, panels, a cornice
    let s = '<path d="M0,0 L1600,0 L1600,120 L0,120 Z"/><path d="M0,120 L1600,120 L1600,134 L0,134 Z"/>' + wainscot;
    for (let x = 30; x < 1600; x += 200) s += `<path d="${rect(x, 648, 150, 90)}" class="pane"/>`;
    return s;
  }
  const SC = {
    front: {
      far(r) { let d = 'M0,900 L0,560'; for (let x = 0; x <= 1600; x += 80) d += ` L${x},${560 + Math.sin(x / 140) * 12 + r() * 10}`; d += ' L1600,900 Z'; return `<path d="${d}"/>`; },
      mid() { // the house on the cliff: a long roof, the chimneys, the clock tower at the east end
        let s = '<path d="M300,700 L300,430 L520,330 L740,430 L740,700 Z M700,700 L700,450 L1120,450 L1120,700 Z M680,450 L910,360 L1140,450 Z M1180,700 L1180,300 L1200,280 L1200,170 L1250,110 L1300,170 L1300,280 L1320,300 L1320,700 Z M420,350 L420,300 L446,300 L446,340 Z M980,410 L980,350 L1004,350 L1004,420 Z"/>';
        s += '<path d="' + circ(1250, 230, 28) + '" class="glow"/>';
        for (const x of [340, 400, 600, 660, 760, 840, 920, 1000, 1060]) s += `<path d="${rect(x, 520, 26, 46)}" class="glow"/>`;
        return s;
      },
      near(r) { let d = ''; for (let i = 0; i < 9; i++) { const x = i < 4 ? 40 + i * 70 : 1260 + (i - 4) * 70, h = 120 + r() * 120; d += `M${x},780 L${x + 8},${780 - h} L${x + 14},${780 - h * .6} L${x + 26},${780 - h * .9} L${x + 30},780 Z `; } return `<path d="${d}"/><path d="M0,900 L0,770 C400,756 1200,782 1600,764 L1600,900 Z"/>`; },
    },
    pier: {
      far(r) { let d = ''; for (let x = 0; x < 1600; x += 50) d += `M${x},${620 + Math.sin(x / 60) * 6} q25,-12 50,0 `; return `<path d="${d}" fill="none" stroke="currentColor" stroke-width="3"/><path d="M0,900 L0,640 L1600,640 L1600,900 Z" opacity=".25"/>`; },
      mid() { // the island across the water: a cliff, and Kurosagi House with its clock tower on top
        let s = '<path d="M940,640 C990,600 1040,560 1080,520 L1120,500 L1170,505 L1210,480 L1290,486 L1340,470 L1420,476 L1480,500 L1530,530 L1600,560 L1600,640 Z"/>';
        s += '<path d="M1180,486 L1180,430 L1250,400 L1320,430 L1320,476 Z M1300,476 L1300,436 L1420,436 L1420,478 Z M1290,436 L1360,410 L1430,436 Z M1440,480 L1440,380 L1448,372 L1448,340 L1462,322 L1476,340 L1476,372 L1484,380 L1484,486 Z"/>';
        s += '<path d="' + circ(1462, 356, 7) + rect(1200, 446, 10, 14) + rect(1230, 446, 10, 14) + rect(1330, 450, 10, 14) + rect(1380, 450, 10, 14) + '" class="glow"/>';
        return s; },
      near() { let s = '<path d="M0,760 L620,760 L620,742 L0,742 Z"/>'; for (const x of [40, 180, 320, 460, 600]) s += `<path d="${rect(x, 700, 18, 90)}"/>`; s += '<path d="M180,740 C200,700 260,690 300,700 L330,742 Z M196,700 L210,640 L220,700 Z M210,640 L280,680 L214,684 Z"/>'; return s + '<path d="M0,900 L0,780 L1600,780 L1600,900 Z" opacity=".35"/>'; },
    },
    hall: {
      far: room,
      mid(r) { // the hundred clocks on the far wall
        let d = '', cut = '';
        const rr = R(91);
        for (let i = 0; i < 26; i++) { const x = 160 + (i % 13) * 105 + (rr() - .5) * 30, y = 240 + Math.floor(i / 13) * 170 + (rr() - .5) * 40; const c = clock(x, y, .9 + rr() * .4, rr); d += c.d; cut += c.cut; }
        return `<path d="${d}"/><path class="cut" d="${cut}"/>`;
      },
      near() { // a long-case clock either side, a balustrade
        let s = '<path d="M80,780 L80,360 L100,330 L180,330 L200,360 L200,780 Z M1400,780 L1400,360 L1420,330 L1500,330 L1520,360 L1520,780 Z"/>';
        s += `<path class="cut" d="${circ(140, 400, 34)}${circ(1460, 400, 34)}${rect(136, 470, 8, 160)}${rect(1456, 470, 8, 160)}"/>`;
        return s;
      },
    },
    study: {
      far: room,
      mid() { // the safe in the wall, the desk, the shuttered window
        let s = `<path d="${rect(1040, 300, 220, 260)}"/><path class="cut" d="${circ(1150, 420, 50)}${rect(1146, 330, 8, 30)}"/>`;
        s += `<path d="${rect(420, 220, 200, 300)}" class="pane"/><path d="${rect(420, 220, 200, 300)}" fill="none" stroke="currentColor" stroke-width="10"/><path d="M420,370 L620,370 M520,220 L520,520" stroke="currentColor" stroke-width="8"/>`;
        return s;
      },
      near() { return '<path d="M1180,780 L1180,600 L1560,600 L1560,780 L1540,780 L1540,640 L1200,640 L1200,780 Z M1220,600 L1250,560 L1290,600 Z M1440,600 L1440,520 L1470,500 L1500,520 L1500,600 Z"/><path d="M60,780 L60,560 C60,520 200,520 200,560 L200,780 Z"/>'; },
    },
    library: {
      far: room,
      mid(r) { let d = '', cut = ''; const rr = R(17);
        for (const x0 of [200, 980]) { d += rect(x0, 160, 420, 460); for (let y = 190; y < 600; y += 70) { cut += rect(x0 + 16, y, 388, 54); let x = x0 + 18; while (x < x0 + 400) { const w = 8 + rr() * 12; if (rr() < .9) d += rect(x, y + 6 + rr() * 10, w, 48 - rr() * 10); x += w + 2; } } }
        return `<path d="${d}"/><path class="cut" d="${cut}"/>`; },
      near() { return '<path d="M700,780 L700,680 L760,640 L840,640 L900,680 L900,780 Z"/><path d="M60,780 L140,180 L156,180 L80,780 Z M120,780 L200,180 L216,180 L140,780 Z M88,640 L176,640 L174,652 L86,652 Z M104,520 L190,520 L188,532 L102,532 Z M118,400 L204,400 L202,412 L116,412 Z"/>'; },
    },
    dining: {
      far: room,
      mid() { let s = '<path d="M300,560 L1300,560 L1300,590 L300,590 Z M340,590 L360,700 L380,590 Z M1220,590 L1240,700 L1260,590 Z"/>';
        for (let x = 380; x <= 1220; x += 140) s += `<path d="M${x - 6},560 L${x - 6},500 L${x - 18},492 L${x + 18},492 L${x + 6},500 L${x + 6},560 Z M${x - 3},492 L${x},470 L${x + 3},492 Z"/><path d="${circ(x, 462, 8)}" class="glow"/>`;
        s += `<path d="${rect(700, 160, 200, 240)}" class="pane"/>`;
        return s; },
      near() { return '<path d="M60,780 L60,520 L100,480 L100,780 Z M60,640 L180,640 L180,780 L164,780 L164,656 L76,656 Z M1540,780 L1540,520 L1500,480 L1500,780 Z M1540,640 L1420,640 L1420,780 L1436,780 L1436,656 L1524,656 Z"/>'; },
    },
    conserv: {
      far() { let s = '<path d="M0,0 L1600,0 L1600,120 L0,120 Z"/>'; for (let x = 0; x <= 1600; x += 160) s += `<path d="${rect(x, 0, 10, 760)}"/>`; s += '<path d="M0,120 C400,40 1200,40 1600,120" fill="none" stroke="currentColor" stroke-width="12"/><path d="M0,400 L1600,400" stroke="currentColor" stroke-width="6"/>'; return s + '<path d="M980,140 L1060,260 L1010,250 Z" class="glow"/>'; },
      mid(r) { let d = ''; const rr = R(55); for (let i = 0; i < 14; i++) { const x = 120 + i * 105 + rr() * 40, y = 640; for (let k = 0; k < 5; k++) { const a = -1.2 + k * .6, L = 80 + rr() * 90; d += `M${x},${y} Q${x + Math.sin(a) * L * .6},${y - L * .7} ${x + Math.sin(a) * L},${y - L * Math.cos(a) * .9} Q${x + Math.sin(a) * L * .5},${y - L * .5} ${x + 6},${y} Z `; } } return `<path d="${d}"/>`; },
      near() { return '<path d="M60,780 L60,600 L360,600 L360,616 L340,616 L340,780 L324,780 L324,616 L96,616 L96,780 Z"/><path d="M100,600 L110,560 L140,560 L150,600 Z M180,600 L190,550 L230,550 L240,600 Z M270,600 L276,570 L300,570 L306,600 Z"/><path d="M1260,780 L1300,560 L1316,560 L1286,780 Z M1290,560 L1380,520 L1300,580 Z M1300,600 L1220,560 L1306,620 Z"/>'; },
    },
    chapel: {
      far(r) { return '<path d="M0,0 L1600,0 L1600,760 L0,760 Z" opacity=".25"/>' + [300, 640, 960, 1300].map(x => `<path d="${arch(x - 70, 540, 140, 360)}" class="pane"/><path d="M${x},200 L${x},540 M${x - 70},360 L${x + 70},360" stroke="currentColor" stroke-width="6"/>`).join(''); },
      mid() { return `<path d="M660,640 L940,640 L940,560 L660,560 Z M690,560 L690,520 L910,520 L910,560 Z M796,520 L796,330 L804,330 L804,520 Z M760,400 L840,400 L840,410 L760,410 Z"/><path d="M700,520 L706,470 L712,520 Z M888,520 L894,470 L900,520 Z" /><path d="${circ(706, 462, 8)}${circ(894, 462, 8)}" class="glow"/>`; },
      near() { let s = ''; for (const [x, y] of [[60, 690], [220, 700], [1220, 700], [1380, 690]]) s += `<path d="M${x},780 L${x},${y} L${x + 220},${y} L${x + 220},780 L${x + 204},780 L${x + 204},${y + 16} L${x + 16},${y + 16} L${x + 16},780 Z"/>`; return s; },
    },
    cellar: {
      far(r) { let s = '<path d="M0,0 L1600,0 L1600,180 C1200,120 400,120 0,180 Z"/>'; for (let y = 200; y < 760; y += 60) for (let x = (y / 60 % 2) * 60; x < 1600; x += 120) s += `<path d="${rect(x, y, 112, 54)}" opacity=".35"/>`; return s; },
      mid() { let d = ''; for (const x0 of [140, 1080]) for (let k = 0; k < 3; k++) { const cx = x0 + k * 130, cy = 560; d += `M${cx - 60},${cy} Q${cx - 70},${cy - 70} ${cx - 60},${cy - 140} H${cx + 60} Q${cx + 70},${cy - 70} ${cx + 60},${cy} Z `; } d += `M720,620 L720,360 A80,80 0 0,1 880,360 L880,620 Z`; return `<path d="${d}"/><path class="cut" d="${rect(740, 380, 120, 220)}"/><path d="M760,380 L760,600 M800,380 L800,600 M840,380 L840,600" stroke="currentColor" stroke-width="6"/>`; },
      near() { return '<path d="M0,780 L0,520 L60,520 L60,580 L120,580 L120,640 L180,640 L180,700 L240,700 L240,780 Z"/><path d="M1400,780 L1400,700 Q1460,680 1520,700 L1520,780 Z M1420,700 L1430,640 L1450,640 L1460,700 Z"/>'; },
    },
    tower: {
      far() { return '<path d="M0,0 L1600,0 L1600,760 L0,760 Z" opacity=".22"/><path d="M600,0 L620,760 M980,0 L1000,760" stroke="currentColor" stroke-width="14"/>'; },
      mid() { // the great wheels of the clock and the bell
        const gear = (cx, cy, rad, teeth) => { let d = ''; for (let i = 0; i < teeth; i++) { const a = i / teeth * 6.2832, a2 = a + 3.14 / teeth; d += `${i ? 'L' : 'M'}${f(cx + Math.cos(a) * (rad + 14))},${f(cy + Math.sin(a) * (rad + 14))}L${f(cx + Math.cos(a2) * rad)},${f(cy + Math.sin(a2) * rad)}`; } return d + 'Z'; };
        return `<path d="${gear(520, 300, 130, 28)}${gear(760, 420, 80, 18)}${gear(1080, 260, 110, 24)}"/><path class="cut" d="${circ(520, 300, 90)}${circ(760, 420, 50)}${circ(1080, 260, 72)}"/><path d="${circ(520, 300, 20)}${circ(760, 420, 14)}${circ(1080, 260, 18)}"/><path d="M1260,120 L1260,180 M1180,300 C1180,200 1340,200 1340,300 L1360,330 L1160,330 Z" /><path d="M1260,120 L1260,180" stroke="currentColor" stroke-width="8"/>`;
      },
      near() { let d = ''; for (let i = 0; i < 8; i++) { const y = 780 - i * 60; d += rect(60 + i * 30, y - 14, 200, 14); } d += 'M40,780 L40,300 L56,300 L56,780 Z'; return `<path d="${d}"/><path d="M1460,780 C1470,640 1540,600 1560,480" fill="none" stroke="currentColor" stroke-width="6"/>`; },
    },
    rooms: {
      far: room,
      mid() { let s = ''; for (const x of [180, 520, 860, 1200]) s += `<path d="${rect(x, 300, 180, 330)}"/><path class="cut" d="${rect(x + 20, 320, 140, 130)}${rect(x + 20, 470, 140, 140)}"/><path d="${circ(x + 150, 480, 8)}"/>`; for (const x of [430, 770, 1110]) s += `<path d="M${x},240 L${x},200 M${x - 16},260 L${x + 16},260 L${x + 10},240 L${x - 10},240 Z"/><path d="${circ(x, 270, 10)}" class="glow"/>`; return s; },
      near() { return '<path d="M40,780 L40,620 L200,620 L200,780 Z M60,620 L60,580 L180,580 L180,620 Z M1400,780 L1420,520 L1440,780 Z M1380,520 L1460,520 L1450,500 L1390,500 Z"/>'; },
    },
  };
  function scene(loc, seed) {
    const K = SC[loc]; if (!K) return '';
    const r = R((seed || 7) * 7919 + 13);
    return `<svg class="scn" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <g transform="translate(0 112)"><g class="far" fill="currentColor">${K.far(R(31))}</g>
      <g class="mid" fill="currentColor">${K.mid(R(57))}</g>
      <g class="near" fill="currentColor">${K.near(r)}<path d="M0,900 L0,776 L1600,776 L1600,900 Z"/></g></g></svg>`;
  }
  root.SSArt = { scene };
})(typeof window !== 'undefined' ? window : globalThis);
