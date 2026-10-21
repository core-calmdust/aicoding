/* さめが〜め POP! — engine (rules, solver, generator). Works in the browser and in node.
   Board = array of columns; each column is an array of cells from the bottom up.
   Cell = color (0..5) | type << 4
     type 0 normal, 1 rock (いわ: no color, removed when a neighbour group is cleared),
     2 ice (こおり: frozen color, thaws when a neighbour group is cleared),
     3 bomb (ボム: clears the 3×3 around it), 4 wild (にじ: joins any color, can't be tapped),
     5 paint (ペンキ: recolors the 3×3 around it to the group's color) */
(function (root) {
'use strict';
const T = { N: 0, ROCK: 1, ICE: 2, BOMB: 3, WILD: 4, PAINT: 5, PEARL: 6 };   // PEARL: DIVE mode treasure (never tapped, joined or blasted)
const col = v => v & 15, typ = v => v >> 4, mk = (c, t) => c | (t << 4);
const clone = b => b.map(c => c.slice());
const W = b => b.length;
const at = (b, x, y) => (x >= 0 && x < b.length && y >= 0 && y < b[x].length) ? b[x][y] : -1;
const tappable = v => { const t = typ(v); return v >= 0 && (t === T.N || t === T.BOMB || t === T.PAINT); };
const joins = (v, c) => { if (v < 0) return false; const t = typ(v); return t === T.WILD || ((t === T.N || t === T.BOMB || t === T.PAINT) && col(v) === c); };
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// connected group from (x,y); [] if not tappable
function group(b, x, y) {
  const v = at(b, x, y); if (!tappable(v)) return [];
  const c = col(v), seen = new Set([x * 64 + y]), out = [[x, y]], st = [[x, y]];
  while (st.length) {
    const [px, py] = st.pop();
    for (const [dx, dy] of D4) {
      const nx = px + dx, ny = py + dy, k = nx * 64 + ny;
      if (seen.has(k)) continue;
      if (joins(at(b, nx, ny), c)) { seen.add(k); out.push([nx, ny]); st.push([nx, ny]); }
    }
  }
  return out;
}
// all distinct tappable groups of size >= min: [{cells, color}]
function groups(b, min) {
  const seen = new Set(), res = [];
  for (let x = 0; x < b.length; x++) for (let y = 0; y < b[x].length; y++) {
    const k = x * 64 + y; if (seen.has(k) || !tappable(b[x][y])) continue;
    const g = group(b, x, y);
    for (const [gx, gy] of g) if (tappable(b[gx][gy])) seen.add(gx * 64 + gy);
    if (g.length >= min) res.push({ cells: g, color: col(b[x][y]) });
  }
  return res;
}
// remove a group: returns { board, removed:[[x,y,v,why]], thawed, painted, n, score, moves:[{from:[x,y],to:[x,y]}] }
// why: 'g' group, 'b' bomb, 'r' rock
function remove(b, cells, opt = {}) {
  const c0 = col(b[cells[0][0]][cells[0][1]]);
  const mark = new Map(); // key -> why
  const key = (x, y) => x * 64 + y;
  cells.forEach(([x, y]) => mark.set(key(x, y), 'g'));
  // bombs (chain)
  const bq = cells.filter(([x, y]) => typ(b[x][y]) === T.BOMB);
  while (bq.length) {
    const [bx, by] = bq.pop();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const nx = bx + dx, ny = by + dy, v = at(b, nx, ny); if (v < 0 || mark.has(key(nx, ny)) || typ(v) === T.PEARL) continue;
      mark.set(key(nx, ny), 'b'); if (typ(v) === T.BOMB) bq.push([nx, ny]);
    }
  }
  const nb = clone(b), thawed = [], painted = [];
  // neighbours of everything removed: rocks go, ice thaws
  const inSet = [...mark.keys()];
  for (const k of inSet) {
    const x = (k / 64) | 0, y = k % 64;
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy, v = at(b, nx, ny), kk = key(nx, ny);
      if (v < 0 || mark.has(kk)) continue;
      if (typ(v) === T.ROCK) mark.set(kk, 'r');
      else if (typ(v) === T.ICE && typ(nb[nx][ny]) === T.ICE) { nb[nx][ny] = mk(col(v), T.N); thawed.push([nx, ny]); }
    }
  }
  // paint: recolor the 3×3 around each paint cell in the group
  for (const [x, y] of cells) if (typ(b[x][y]) === T.PAINT) {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const nx = x + dx, ny = y + dy, v = at(nb, nx, ny); if (v < 0 || mark.has(key(nx, ny))) continue;
      const t = typ(v); if (t === T.ROCK || t === T.WILD || t === T.PEARL) continue;
      if (col(v) !== c0) { nb[nx][ny] = mk(c0, t); painted.push([nx, ny]); }
    }
  }
  const removed = [];
  for (const [k, why] of mark) { const x = (k / 64) | 0, y = k % 64; removed.push([x, y, b[x][y], why]); }
  // gravity + column collapse; track moves of surviving cells
  const out = [], moves = [];
  for (let x = 0; x < nb.length; x++) {
    const nc = [];
    for (let y = 0; y < nb[x].length; y++) if (!mark.has(key(x, y))) { moves.push({ from: [x, y], to: [out.length, nc.length] }); nc.push(nb[x][y]); }
    if (nc.length || opt.keep) out.push(nc);
  }
  const n = removed.length, nG = cells.length;
  return { board: out, removed, thawed, painted, n, nG, color: c0, score: points(n, opt.min || 2), moves };
}
const points = (n, min) => Math.max(0, n - (min === 3 ? 2 : 2)) ** 2 + (n >= 2 ? 0 : 0);
const count = b => b.reduce((s, c) => s + c.length, 0);
const dead = (b, min) => groups(b, min).length === 0;
const keyOf = b => b.map(c => c.map(v => v.toString(36)).join('')).join('|');

// cheap dead-end test: a color that can never be cleared
function hopeless(b, min) {
  let special = false; const cnt = [0, 0, 0, 0, 0, 0];
  for (const c of b) for (const v of c) {
    const t = typ(v);
    if (t === T.WILD || t === T.PAINT || t === T.BOMB) special = true;
    else if (t !== T.ROCK) cnt[col(v)]++;
  }
  if (special) return false;
  for (const k of cnt) if (k > 0 && k < min) return true;
  return false;
}
// DFS for a full clear. returns list of [x,y] taps or null. limit = node budget
function solve(b, min, limit = 200000) {
  const memo = new Set(); let nodes = 0;
  const path = [];
  function rec(bd) {
    if (bd.length === 0) return true;
    if (++nodes > limit) return false;
    const k = keyOf(bd); if (memo.has(k)) return false; memo.add(k);
    if (hopeless(bd, min)) return false;
    const gs = groups(bd, min);
    // try smaller groups first often keeps structure; mix: sort by size asc
    gs.sort((a, c) => a.cells.length - c.cells.length);
    for (const g of gs) {
      path.push(g.cells[0]);
      if (rec(remove(bd, g.cells, { min }).board)) return true;
      path.pop();
    }
    return false;
  }
  const ok = rec(b);
  return ok ? path.slice() : (nodes > limit ? undefined : null); // undefined = gave up
}
// random playouts: fraction that end with a full clear
function playRate(b, min, n, rnd) {
  let ok = 0;
  for (let i = 0; i < n; i++) {
    let bd = b;
    for (;;) {
      if (!bd.length) { ok++; break; }
      const gs = groups(bd, min); if (!gs.length) break;
      bd = remove(bd, gs[(rnd() * gs.length) | 0].cells, { min }).board;
    }
  }
  return ok / n;
}
// best score by greedy (largest group first) — a quick par for score modes
function greedyScore(b, min) {
  let bd = b, s = 0;
  for (;;) {
    const gs = groups(bd, min); if (!gs.length) break;
    gs.sort((a, c) => c.cells.length - a.cells.length);
    const r = remove(bd, gs[0].cells, { min }); s += r.score; bd = r.board;
  }
  return { score: s + (bd.length ? 0 : 1000), left: count(bd) };
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
// random board: w columns × h rows, k colors; sp = { rock, ice, bomb, wild, paint } counts
function randomBoard(w, h, k, rnd, sp = {}) {
  const b = [];
  for (let x = 0; x < w; x++) { const c = []; for (let y = 0; y < h; y++) c.push((rnd() * k) | 0); b.push(c); }
  const put = (n, f) => { for (let i = 0, g = 0; i < n && g < 500; g++) { const x = (rnd() * w) | 0, y = (rnd() * h) | 0; if (typ(b[x][y]) !== T.N) continue; b[x][y] = f(b[x][y]); i++; } };
  put(sp.rock || 0, () => mk(0, T.ROCK));
  put(sp.ice || 0, v => mk(col(v), T.ICE));
  put(sp.bomb || 0, v => mk(col(v), T.BOMB));
  put(sp.wild || 0, () => mk(0, T.WILD));
  put(sp.paint || 0, v => mk(col(v), T.PAINT));
  return b;
}
// compact text form for json: rows top→bottom are not used; we store columns bottom-up, cell as base36 char pair? keep one char: 0-5 colors, a-f ice, g-l bomb, m-r paint, R rock, W wild
function enc(b) {
  return b.map(c => c.map(v => { const t = typ(v), k = col(v); return t === T.ROCK ? 'R' : t === T.WILD ? 'W' : t === T.ICE ? 'abcdef'[k] : t === T.BOMB ? 'ghijkl'[k] : t === T.PAINT ? 'mnopqr'[k] : String(k); }).join('')).join('.');
}
function dec(s) {
  return s.split('.').map(c => [...c].map(ch => {
    if (ch === 'R') return mk(0, T.ROCK); if (ch === 'W') return mk(0, T.WILD);
    let i = 'abcdef'.indexOf(ch); if (i >= 0) return mk(i, T.ICE);
    i = 'ghijkl'.indexOf(ch); if (i >= 0) return mk(i, T.BOMB);
    i = 'mnopqr'.indexOf(ch); if (i >= 0) return mk(i, T.PAINT);
    return +ch;
  }));
}
const api = { T, col, typ, mk, clone, at, tappable, group, groups, remove, points, count, dead, solve, playRate, greedyScore, rng, hashStr, randomBoard, enc, dec, hopeless };
if (typeof module !== 'undefined') module.exports = api; else root.SameEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
