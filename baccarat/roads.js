/* バカラ — scoreboards / roads (baccarat/roads.js)
   Input: the shoe's results [{ w:'P'|'B'|'T', pp, bp, pt, bt, nat }].
   - Bead Plate (珠盤路): every coup in order, 6 rows, top→bottom then the next column.
   - Big Road (大路): Banker / Player in columns; a new column when the side changes; ties are marked on the last cell (slash + count).
     A column longer than 6 (or blocked) turns right along the bottom row ("dragon tail").
   - Derived roads (下三路) from the Big Road's logical columns: Big Eye Boy (大眼仔, k=1), Small Road (小路, k=2), Cockroach Pig (曱甴路, k=3).
     New column (row 0): compare the lengths of columns c-1 and c-1-k → equal = red, else blue.
     Same column (row r>0): look at column c-k: a cell at row r → red; no cell at r and none at r-1 → red; no cell at r but one at r-1 → blue.
     (red = "regular", blue = "choppy"; the colours say nothing about Banker / Player — and nothing about the next coup.)
   - Ask road (問路): what each derived road would show if the next coup were Banker / Player. */
(function (G) {
'use strict';
const ROWS = 6;
// logical columns of the Big Road (ties excluded): [['B','B'],['P'],…] plus tie counts on the cells
function bigCols(res) {
  const cols = []; let lead = 0;   // ties before the first B/P
  for (const r of res) {
    if (r.w === 'T') { if (cols.length) { const c = cols[cols.length - 1]; c[c.length - 1].t++; } else lead++; continue; }
    const last = cols[cols.length - 1];
    const cell = { w: r.w, t: 0, pp: r.pp, bp: r.bp, nat: r.nat };
    if (last && last[0].w === r.w) last.push(cell); else cols.push([cell]);
  }
  return { cols, lead };
}
// place logical columns on a 6-row grid with dragon tails → [{x, y, cell}]
function layoutFix(cols) {
  const occ = new Set(), out = [], key = (x, y) => x + ',' + y;
  let startX = 0;
  for (const col of cols) {
    let x = startX; while (occ.has(key(x, 0))) x++; startX = x;
    let y = 0, turned = false;
    col.forEach((cell, i) => {
      if (i > 0) { if (!turned && y + 1 < ROWS && !occ.has(key(x, y + 1))) y++; else { x++; turned = true; } }
      occ.add(key(x, y)); out.push({ x, y, cell });
    });
    startX++;
  }
  return out;
}
// one derived road (k = 1, 2, 3) as a list of 'R' / 'U' (red / blue) in Big-Road order
function derived(cols, k) {
  const out = [];
  cols.forEach((col, c) => col.forEach((_, r) => {
    if (r === 0) { if (c - 1 - k < 0) return; out.push(cols[c - 1].length === cols[c - 1 - k].length ? 'R' : 'U'); }
    else { if (c - k < 0) return; const ref = cols[c - k]; out.push(ref.length > r ? 'R' : ref.length > r - 1 ? 'U' : 'R'); }
  }));
  return out;
}
// a run list (R/U or B/P) → columns, for drawing the derived roads like the Big Road
const runs = list => { const cols = []; for (const v of list) { const l = cols[cols.length - 1]; if (l && l[0].w === v) l.push({ w: v }); else cols.push([{ w: v }]); } return cols; };
function build(res) {
  const { cols, lead } = bigCols(res);
  const d = [1, 2, 3].map(k => derived(cols, k));
  const ask = {};
  ['B', 'P'].forEach(w => {
    const nx = bigCols(res.concat([{ w }])).cols;
    ask[w] = [1, 2, 3].map(k => { const a = derived(nx, k), b = derived(cols, k); return a.length > b.length ? a[a.length - 1] : null; });
  });
  return { bead: res, big: layoutFix(cols), cols, lead, eye: layoutFix(runs(d[0])), small: layoutFix(runs(d[1])), roach: layoutFix(runs(d[2])), d, ask };
}
// streak facts for the coach
function streaks(res) {
  const nt = res.filter(r => r.w !== 'T');
  let cur = 0, side = null, best = { n: 0, w: null };
  for (const r of nt) { if (r.w === side) cur++; else { side = r.w; cur = 1; } if (cur > best.n) best = { n: cur, w: side }; }
  return { cur, side, best };
}

/* ---------- SVG ---------- */
const COL = { B: '#e0384f', P: '#2f7fe0', T: '#2fae5e', R: '#e0384f', U: '#2f7fe0' };
function svgGrid(w, h, cell) {
  let g = ''; for (let x = 0; x <= w; x++) g += `<line x1="${x * cell}" y1="0" x2="${x * cell}" y2="${h * cell}"/>`;
  for (let y = 0; y <= h; y++) g += `<line x1="0" y1="${y * cell}" x2="${w * cell}" y2="${y * cell}"/>`;
  return `<g class="rd-g">${g}</g>`;
}
// lang-specific letters for the bead plate (庄/闲/和 in Chinese, B/P/T otherwise; Japanese uses B/P/T too as in Japanese casinos' apps)
function beadSvg(res, cols, letters) {
  const cell = 20, w = Math.max(cols, Math.ceil(res.length / ROWS) + 1);
  const first = Math.max(0, Math.ceil(res.length / ROWS) - cols + 1) * ROWS;
  const show = res.slice(first);
  let s = svgGrid(cols, ROWS, cell);
  show.forEach((r, i) => {
    const x = Math.floor(i / ROWS), y = i % ROWS, cx = x * cell + cell / 2, cy = y * cell + cell / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="8.2" fill="${COL[r.w]}"/><text x="${cx}" y="${cy + 3.6}" class="rd-t">${r.w}</text>`;
    if (r.bp) s += `<circle cx="${cx - 6}" cy="${cy - 6}" r="2.4" fill="${COL.B}" stroke="#fff" stroke-width=".8"/>`;
    if (r.pp) s += `<circle cx="${cx + 6}" cy="${cy + 6}" r="2.4" fill="${COL.P}" stroke="#fff" stroke-width=".8"/>`;
  });
  void w;
  return `<svg class="rd-svg" viewBox="0 0 ${cols * cell} ${ROWS * cell}">${s}</svg>`;
}
// big road: hollow rings; derived: big eye = hollow small rings, small = dots, roach = slashes
function bigSvg(cells, cols, kind, lead) {
  const cell = kind === 'big' ? 14 : 8;
  const maxX = cells.reduce((m, c) => Math.max(m, c.x), -1);
  const off = Math.max(0, maxX - cols + 3);
  let s = svgGrid(cols, ROWS, cell);
  cells.forEach(({ x, y, cell: c }) => {
    x -= off; if (x < 0) return;
    const cx = x * cell + cell / 2, cy = y * cell + cell / 2, col = COL[c.w];
    if (kind === 'big' || kind === 'eye') s += `<circle cx="${cx}" cy="${cy}" r="${cell * .36}" fill="none" stroke="${col}" stroke-width="${kind === 'big' ? 2.2 : 1.4}"/>`;
    else if (kind === 'small') s += `<circle cx="${cx}" cy="${cy}" r="${cell * .34}" fill="${col}"/>`;
    else s += `<line x1="${cx - cell * .32}" y1="${cy + cell * .32}" x2="${cx + cell * .32}" y2="${cy - cell * .32}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`;
    if (kind === 'big') {
      if (c.t) s += `<line x1="${cx - 4.5}" y1="${cy + 4.5}" x2="${cx + 4.5}" y2="${cy - 4.5}" stroke="${COL.T}" stroke-width="1.8"/>` + (c.t > 1 ? `<text x="${cx}" y="${cy + 3}" class="rd-n">${c.t}</text>` : '');
      if (c.bp) s += `<circle cx="${cx - 4.6}" cy="${cy - 4.6}" r="1.8" fill="${COL.B}"/>`;
      if (c.pp) s += `<circle cx="${cx + 4.6}" cy="${cy + 4.6}" r="1.8" fill="${COL.P}"/>`;
    }
  });
  if (kind === 'big' && lead && !cells.length) s += `<line x1="${cell * .5 - 4.5}" y1="${cell * .5 + 4.5}" x2="${cell * .5 + 4.5}" y2="${cell * .5 - 4.5}" stroke="${COL.T}" stroke-width="1.8"/>` + (lead > 1 ? `<text x="${cell * .5}" y="${cell * .5 + 3}" class="rd-n">${lead}</text>` : '');
  return `<svg class="rd-svg rd-${kind}" viewBox="0 0 ${cols * cell} ${ROWS * cell}">${s}</svg>`;
}
// the three ask-road symbols for one side
function askSvg(sym) {
  const k = ['eye', 'small', 'roach'];
  return sym.map((v, i) => { if (!v) return `<i class="ask-x"></i>`; const c = COL[v];
    return `<svg viewBox="0 0 12 12" class="ask-s">${k[i] === 'eye' ? `<circle cx="6" cy="6" r="4" fill="none" stroke="${c}" stroke-width="1.6"/>` : k[i] === 'small' ? `<circle cx="6" cy="6" r="4" fill="${c}"/>` : `<line x1="2.5" y1="9.5" x2="9.5" y2="2.5" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`}</svg>`; }).join('');
}
G.BCRoads = { build, streaks, beadSvg, bigSvg, askSvg, bigCols, derived, ROWS, COL };
})(typeof self !== 'undefined' ? self : this);
