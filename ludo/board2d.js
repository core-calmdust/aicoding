/* =====================================================================
   Ludo / Pachisi — 2D boards (SVG), pieces, die and cowrie shells.  window.LudoBoard2D
   · geometry(rule) → { n: grid size, cellXY(seat, p) → [x, y] in grid units (cell centres), yard(seat, k) → [x, y] }
   · drawBoard(rule, design) → SVG markup of the board (viewBox 0 0 n n, 1 unit = 1 cell)
   · pieceSVG(rule, seat, design) → a piece drawn round (0, 0), radius about .42
   · dieSVG(v) / cowriesSVG(shells) → the throw
   Seats: 0 bottom, then on round the board (ludo: clockwise; pachisi: anticlockwise).
   Ludo colours: 0 red, 1 green, 2 yellow, 3 blue. Pachisi: 0 yellow, 1 red, 2 black, 3 green (yellow+black vs red+green).
   ===================================================================== */
(function () {
  'use strict';
  const E = () => window.LudoEngine;
  const COL = {
    ludo: [['#e2403a', '#a3241f', '#ffd9d4'], ['#2fa65a', '#1b6e39', '#d7f3df'], ['#f2c12e', '#b48a0e', '#fff3c9'], ['#2f7ad8', '#1b4f98', '#d6e6fb']],
    pachisi: [['#f0c02c', '#a8820c', '#fff2c4'], ['#d63a2c', '#8f2017', '#ffd8d0'], ['#2b2b31', '#0d0d10', '#cfcfd6'], ['#3a9a5a', '#21653a', '#d3efdc']],
  };
  /* ---------- ludo: 15 × 15 ---------- */
  const LUDO_TRACK = (() => {
    const t = [];
    for (let y = 13; y >= 9; y--) t.push([6, y]);
    for (let x = 5; x >= 0; x--) t.push([x, 8]);
    t.push([0, 7]);
    for (let x = 0; x <= 5; x++) t.push([x, 6]);
    for (let y = 5; y >= 0; y--) t.push([6, y]);
    t.push([7, 0]);
    for (let y = 0; y <= 5; y++) t.push([8, y]);
    for (let x = 9; x <= 14; x++) t.push([x, 6]);
    t.push([14, 7]);
    for (let x = 14; x >= 9; x--) t.push([x, 8]);
    for (let y = 9; y <= 14; y++) t.push([8, y]);
    t.push([7, 14]); t.push([6, 14]);
    return t;   // 52 squares, track[0] = seat 0's start square
  })();
  const LUDO_HOME = [p => [7, 13 - p], p => [1 + p, 7], p => [7, 1 + p], p => [13 - p, 7]];   // home column step p (0..4)
  const LUDO_YARD = [[0, 9], [0, 0], [9, 0], [9, 9]];   // top-left cell of each 6×6 yard
  const LUDO_CENTRE = [[7, 8.05], [6, 7], [7, 6], [8.05, 7]];   // where finished pieces gather (the seat's triangle)
  /* ---------- pachisi: 19 × 19 cross ---------- */
  const PD = [[0, 1], [1, 0], [0, -1], [-1, 0]];   // outward direction of each arm (bottom, right, top, left)
  function pachisiXY(cell) {
    if (cell === 999) return [9, 9];
    const a = Math.floor(cell / 100), lane = Math.floor(cell % 100 / 10), row = cell % 10, [dx, dy] = PD[a];
    const lat = lane === 0 ? 1 : lane === 2 ? -1 : 0;   // A lane: (−dy, dx); B lane: the other side
    return [9 + dx * (row + 1) + lat * -dy, 9 + dy * (row + 1) + lat * dx];
  }
  function geometry(rule) {
    if (rule === 'pachisi') return {
      n: 19,
      cellXY: (seat, p) => { const [x, y] = pachisiXY(E().cellOf('pachisi', seat, Math.min(p, 82))); return [x + .5, y + .5]; },
      yard: (seat, k) => { const [dx, dy] = PD[seat], lx = -dy, ly = dx, o = [-.66, -.22, .22, .66][k]; return [9.5 + dx * 1.05 + lx * o, 9.5 + dy * 1.05 + ly * o]; },
      home: (seat, k) => { const [dx, dy] = PD[seat], lx = -dy, ly = dx, o = [-.33, -.11, .11, .33][k]; return [9.5 + dx * .42 + lx * o, 9.5 + dy * .42 + ly * o]; },
    };
    return {
      n: 15,
      cellXY: (seat, p) => { const [x, y] = p >= 56 ? LUDO_CENTRE[seat] : p >= 51 ? LUDO_HOME[seat](p - 51) : LUDO_TRACK[(seat * 13 + p) % 52]; return [x + .5, y + .5]; },
      yard: (seat, k) => { const [x0, y0] = LUDO_YARD[seat]; return [x0 + [1.9, 3.9, 1.9, 3.9][k] + .1, y0 + [1.9, 1.9, 3.9, 3.9][k] + .1]; },
      home: (seat, k) => { const [cx, cy] = LUDO_CENTRE[seat], o = [-.33, -.11, .11, .33][k]; return seat % 2 ? [cx + .5, cy + .5 + o] : [cx + .5 + o, cy + .5]; },
    };
  }
  const cx = v => v + .5;   // cell index → centre coordinate

  /* ---------- 木目: a real wood texture (2026-11-09 v3) ----------
     ludo/img/wood-board.webp (a light maple-like board, the grain across) and wood-frame.webp (walnut), made by
     ludo/tools/gen_wood.py (after fanorona's: long streaks, heartwood bands, fibres, pores, an oiled sheen). The board's
     colours are painted ON the wood: not quite opaque, the grain still showing through (the same image again, multiplied),
     the lines burnt in. The file is used at once; a data: copy is made as it loads, for the pages that draw this SVG as an
     image (the 3D board's texture — an SVG image may not load files). */
  const BASE = (() => { try { const c = document.currentScript; return c && c.src ? c.src.replace(/[^/]*$/, '') : ''; } catch (e) { return ''; } })();
  const WOOD = {};
  function woodTex(kind) {
    if (WOOD[kind]) return WOOD[kind];
    const url = BASE + 'img/wood-' + kind + '.webp?v=1';
    if (!WOOD['_' + kind] && typeof Image !== 'undefined') {
      WOOD['_' + kind] = 1; const im = new Image();
      im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); WOOD[kind] = c.toDataURL('image/jpeg', .9); } catch (e) {} };
      im.src = url;
    }
    return url;
  }

  /* ---------- designs ---------- */
  const DESIGN = {
    classic: { bg: '#fbf7ec', line: '#3b3326', frame: '#2a2218' },
    wood: { bg: '#e0b47a', line: '#4f3015', frame: '#5a3313' },
  };
  function drawLudo(dz) {
    const D = DESIGN[dz] || DESIGN.classic, C = COL.ludo, o = [];
    const W = dz === 'wood', bg = W ? 'none' : D.bg, PO = W ? ' fill-opacity=".93"' : '';   // (wood: the squares are the bare wood; the colours paint, a little thin)
    if (W) {
      const fr = woodTex('frame'), bd = woodTex('board');
      o.push(`<clipPath id="ldFrC"><rect x="-.3" y="-.3" width="15.6" height="15.6" rx=".5"/></clipPath>`);
      o.push(`<image href="${fr}" x="-.3" y="-.3" width="15.6" height="15.6" preserveAspectRatio="none" clip-path="url(#ldFrC)"/>`);
      o.push(`<rect x="-.3" y="-.3" width="15.6" height="15.6" rx=".5" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".06"/>`);
      o.push(`<image href="${bd}" x="0" y="0" width="15" height="15" preserveAspectRatio="none"/>`);
      o.push(`<rect x="0" y="0" width="15" height="15" fill="none" stroke="rgba(30,14,4,.55)" stroke-width=".05"/>`);
    } else {
      o.push(`<rect x="-.3" y="-.3" width="15.6" height="15.6" rx=".5" fill="${D.frame}"/>`);
      o.push(`<rect x="0" y="0" width="15" height="15" fill="${D.bg}"/>`);
    }
    // yards
    LUDO_YARD.forEach(([x, y], s) => {
      if (W) {   // a painted frame round a bare-wood yard (the colour as a band, the inside the wood)
        o.push(`<path d="M${x + .4} ${y + .05}h5.1a.35 .35 0 0 1 .35 .35v5.1a.35 .35 0 0 1-.35 .35h-5.1a.35 .35 0 0 1-.35-.35v-5.1a.35 .35 0 0 1 .35-.35zM${x + 1.35} ${y + .8}h3.3a.55 .55 0 0 1 .55 .55v3.3a.55 .55 0 0 1-.55 .55h-3.3a.55 .55 0 0 1-.55-.55v-3.3a.55 .55 0 0 1 .55-.55z" fill-rule="evenodd" fill="${C[s][0]}"${PO}/>`);
        o.push(`<rect x="${x + .8}" y="${y + .8}" width="4.4" height="4.4" rx=".55" fill="none" stroke="${C[s][1]}" stroke-width=".08" stroke-opacity=".8"/>`);
        // the four slots: shallow turned recesses in the wood, ringed in the colour
        for (let k = 0; k < 4; k++) { const [px, py] = geometry('ludo').yard(s, k);
          o.push(`<circle cx="${px}" cy="${py}" r=".62" fill="url(#ldSlot)" stroke="${C[s][0]}" stroke-width=".12" stroke-opacity=".9"/>`); }
      } else {
        o.push(`<rect x="${x + .05}" y="${y + .05}" width="5.9" height="5.9" rx=".35" fill="${C[s][0]}"/>`);
        o.push(`<rect x="${x + .8}" y="${y + .8}" width="4.4" height="4.4" rx=".55" fill="${D.bg}" stroke="${C[s][1]}" stroke-width=".08"/>`);
        for (let k = 0; k < 4; k++) { const [px, py] = geometry('ludo').yard(s, k); o.push(`<circle cx="${px}" cy="${py}" r=".62" fill="${C[s][2]}" stroke="${C[s][0]}" stroke-width=".12"/>`); }
      }
    });
    // track squares
    LUDO_TRACK.forEach(([x, y], i) => {
      const start = i % 13 === 0 ? i / 13 : -1;
      const fill = start >= 0 ? C[start][0] : bg;
      o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"${start >= 0 ? PO : ''} stroke="${D.line}" stroke-width=".035"${W ? ' stroke-opacity=".75"' : ''}/>`);
      if (i % 13 === 8) o.push(star(cx(x), cx(y), .36, W ? '#5a3417' : '#9a8f78'));
      if (start >= 0) o.push(arrowIn(cx(x), cx(y), start));
    });
    // home columns
    for (let s = 0; s < 4; s++) for (let p = 0; p < 5; p++) { const [x, y] = LUDO_HOME[s](p); o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${C[s][0]}"${PO} stroke="${D.line}" stroke-width=".035"${W ? ' stroke-opacity=".75"' : ''}/>`); }
    // centre: four triangles
    const tri = [[[6, 9], [9, 9]], [[6, 6], [6, 9]], [[9, 6], [6, 6]], [[9, 9], [9, 6]]];
    tri.forEach(([[ax, ay], [bx, by]], s) => o.push(`<path d="M${ax} ${ay}L${bx} ${by}L7.5 7.5z" fill="${C[s][0]}"${PO} stroke="${D.line}" stroke-width=".035"/>`));
    // the grain through the paint (the same wood, multiplied — the paint is thin), and a soft sheen of the varnish
    if (W) {
      o.push(`<image href="${woodTex('board')}" x="0" y="0" width="15" height="15" preserveAspectRatio="none" style="mix-blend-mode:multiply" opacity=".28" pointer-events="none"/>`);
      o.push(`<rect x="0" y="0" width="15" height="15" fill="url(#ldVarnish)" pointer-events="none"/>`);
    }
    return o.join('');
  }
  const star = (x, y, r, c) => { let d = ''; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; d += (k ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(3) + ' ' + (y + Math.sin(a) * rr).toFixed(3); } return `<path d="${d}z" fill="none" stroke="${c}" stroke-width=".06" stroke-linejoin="round"/>`; };
  const arrowIn = (x, y, s) => { const a = [0, 90, 180, 270][s]; return `<path transform="translate(${x} ${y}) rotate(${a})" d="M-.22 .14 0 -.16 .22 .14" fill="none" stroke="#fff" stroke-width=".09" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`; };
  function drawPachisi(dz) {
    const C = COL.pachisi, o = [], cloth = dz === 'wood' ? ['#7a1f1f', '#e8c36a', '#5c1414'] : ['#b3261e', '#f2d27a', '#7e1712'];
    o.push(`<rect x="-.3" y="-.3" width="19.6" height="19.6" rx=".6" fill="#120c08" opacity=".0"/>`);
    // the cloth: a cross
    o.push(`<path d="M7.6 -.2H11.4V7.6H19.2V11.4H11.4V19.2H7.6V11.4H-.2V7.6H7.6z" fill="${cloth[2]}"/>`);
    o.push(`<path d="M8 0H11V8H19V11H11V19H8V11H0V8H8z" fill="${cloth[0]}"/>`);
    const castle = new Set([...E().PACHISI_CASTLE]);
    for (let a = 0; a < 4; a++) for (let lane = 0; lane < 3; lane++) for (let r = 1; r <= 8; r++) {
      const cell = a * 100 + lane * 10 + r, [x, y] = pachisiXY(cell);
      o.push(`<rect x="${x + .06}" y="${y + .06}" width=".88" height=".88" rx=".08" fill="none" stroke="${cloth[1]}" stroke-width=".055"/>`);
      if (castle.has(cell)) o.push(`<path d="M${x + .2} ${y + .2}L${x + .8} ${y + .8}M${x + .8} ${y + .2}L${x + .2} ${y + .8}" stroke="${cloth[1]}" stroke-width=".08" stroke-linecap="round"/>`);
      else if ((r + lane) % 2 === 0) o.push(`<circle cx="${x + .5}" cy="${y + .5}" r=".06" fill="${cloth[1]}" opacity=".55"/>`);
    }
    // the Charkoni with a flower
    o.push(`<rect x="8.05" y="8.05" width="2.9" height="2.9" rx=".15" fill="${cloth[2]}" stroke="${cloth[1]}" stroke-width=".07"/>`);
    for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4; o.push(`<ellipse cx="${9.5 + Math.cos(ang) * .55}" cy="${9.5 + Math.sin(ang) * .55}" rx=".42" ry=".16" transform="rotate(${k * 45} ${9.5 + Math.cos(ang) * .55} ${9.5 + Math.sin(ang) * .55})" fill="${cloth[1]}" opacity=".85"/>`); }
    o.push(`<circle cx="9.5" cy="9.5" r=".22" fill="${cloth[0]}" stroke="${cloth[1]}" stroke-width=".06"/>`);
    // each player's arm: a thin coloured edge at the entry
    for (let s = 0; s < 4; s++) { const [x, y] = pachisiXY(s * 100 + 11); o.push(`<rect x="${x + .2}" y="${y + .2}" width=".6" height=".6" rx=".3" fill="${C[s][0]}" opacity=".55"/>`); }
    return o.join('');
  }
  function drawBoard(rule, design) {
    const n = rule === 'pachisi' ? 19 : 15;
    const defs = `<defs><radialGradient id="ldSlot" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#5a3010" stop-opacity=".08"/><stop offset=".75" stop-color="#4a250a" stop-opacity=".22"/><stop offset="1" stop-color="#2e1504" stop-opacity=".42"/></radialGradient>`
      + `<linearGradient id="ldVarnish" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".08"/></linearGradient></defs>`;
    return { n, svg: defs + (rule === 'pachisi' ? drawPachisi(design) : drawLudo(design)) };
  }
  /* ---------- pieces ---------- */
  function pieceSVG(rule, seat, opts = {}) {
    const [f, s, l] = COL[rule === 'pachisi' ? 'pachisi' : 'ludo'][seat];
    if (rule === 'pachisi') {   // a turned wooden beehive, seen from above
      return `<g class="pcg"><ellipse cx=".03" cy=".1" rx=".42" ry=".4" fill="rgba(0,0,0,.35)"/><circle r=".4" fill="${s}"/><circle r=".33" fill="${f}"/><circle r=".22" fill="none" stroke="${s}" stroke-width=".05"/><circle r=".1" fill="${s}"/><circle cx="-.12" cy="-.13" r=".09" fill="#fff" opacity=".35"/></g>`;
    }
    return `<g class="pcg"><ellipse cx=".03" cy=".1" rx=".4" ry=".38" fill="rgba(0,0,0,.35)"/><circle r=".38" fill="${s}"/><circle r=".32" fill="${f}"/><circle r=".17" fill="${l}" opacity=".9"/><circle r=".09" fill="${f}"/><circle cx="-.12" cy="-.12" r=".08" fill="#fff" opacity=".45"/></g>`;
  }
  /* ---------- the throw ---------- */
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  function dieSVG(v, color = '#fbf7ee') {
    const pip = (PIPS[v] || []).map(([x, y]) => `<circle cx="${50 + x * 22}" cy="${50 + y * 22}" r="8.5" fill="${v === 1 ? '#d7302a' : '#22201c'}"/>`).join('');
    return `<svg viewBox="0 0 100 100"><rect x="6" y="9" width="88" height="88" rx="20" fill="rgba(0,0,0,.35)"/><rect x="4" y="4" width="88" height="88" rx="20" fill="${color}" stroke="#c9bfa8" stroke-width="2"/>${pip}</svg>`;
  }
  // six cowries: mouth up = the toothed slit shows (counts), mouth down = the smooth humped back
  function cowriesSVG(shells, seed = 1) {
    let r = seed, rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    const spots = [[30, 32], [72, 28], [112, 36], [40, 74], [84, 72], [124, 76]];
    return `<svg viewBox="0 0 156 104">` + (shells || [0, 0, 0, 0, 0, 0]).map((up, i) => {
      const [x, y] = spots[i], a = Math.round(rnd() * 180 - 90);
      const body = up
        ? `<ellipse rx="17" ry="12" fill="#f4ead2" stroke="#b9a37a" stroke-width="1.6"/><path d="M-12 0C-6 -2 6 -2 12 0" stroke="#5a4528" stroke-width="3" fill="none" stroke-linecap="round"/>${[-8, -4, 0, 4, 8].map(t => `<path d="M${t} -2V2" stroke="#fff" stroke-width="1.2"/>`).join('')}`
        : `<ellipse rx="17" ry="12" fill="#e8d2a6" stroke="#a8875a" stroke-width="1.6"/><ellipse cx="-2" cy="-2" rx="11" ry="7" fill="#f6e7c4"/><circle cx="-6" cy="-5" r="2.4" fill="#fff" opacity=".7"/>`;
      return `<g transform="translate(${x} ${y}) rotate(${a})"><ellipse cx="2" cy="4" rx="17" ry="11" fill="rgba(0,0,0,.3)"/>${body}</g>`;
    }).join('') + `</svg>`;
  }
  window.LudoBoard2D = { COL, geometry, drawBoard, pieceSVG, dieSVG, cowriesSVG, LUDO_TRACK, pachisiXY };
})();
