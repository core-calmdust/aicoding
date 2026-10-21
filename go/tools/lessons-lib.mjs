// Helpers for go/lessons.json authoring: ASCII positions + a small exhaustive capture / life-and-death reader.
//   rows: ['.XO..', ...]  X = black, O = white, . = empty   (top row first)
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
export const R = require(path.join(DIR, '..', 'rules.js'));

export function specFromRows(rows, turn, swap) {
  const n = rows.length; let s = '';
  const B = swap ? 'w' : 'b', W = swap ? 'b' : 'w';
  for (const r of rows) {
    const t = r.replace(/\s+/g, '');
    if (t.length !== n) throw new Error('row length ' + t.length + ' != ' + n + ': ' + r);
    for (const ch of t) s += ch === 'X' ? B : ch === 'O' ? W : '.';
  }
  return { n, stones: s, turn: swap ? 3 - turn : turn };
}
export function specFromLists(n, ab, aw, turn) {
  const a = new Array(n * n).fill('.');
  for (const m of ab) a[pt(m, n)] = 'b';
  for (const m of aw) a[pt(m, n)] = 'w';
  return { n, stones: a.join(''), turn };
}
export const pt = (s, n) => { const i = R.parseCoord(s, n); if (i === null || i === undefined) throw new Error('bad coord ' + s); return i; };
export const co = (i, n) => R.coord(i, n);

// every stone must have a liberty
export function legalSetup(spec) {
  const p = R.Pos.from(spec), bad = [];
  for (let i = 0; i < p.b.length; i++) if (p.b[i] && p.group(i).libs === 0) bad.push(co(i, p.n));
  return bad;
}

export function show(spec, marks = {}) {
  const p = R.Pos.from(spec), n = p.n;
  let s = '   ' + R.COLS.slice(0, n).split('').join(' ') + '\n';
  for (let y = 0; y < n; y++) {
    s += String(n - y).padStart(2) + ' ';
    for (let x = 0; x < n; x++) { const i = y * n + x, v = p.b[i]; s += (marks[i] || (v === 1 ? 'X' : v === 2 ? 'O' : '.')) + ' '; }
    s += '\n';
  }
  return s;
}

// ---- capture reader
// att: attacker colour, tgt: target points (defender stones). Attacker wins as soon as any target point is not the defender's.
// opt.region: array of points (both sides only play there, defender may pass) — life & death mode.
// otherwise dynamic candidates (liberties, 2nd liberties, captures), and the attacker gives up when the target has > opt.maxLibs liberties.
export function makeReader(n, att, tgt, opt = {}) {
  const def = 3 - att, nb = R.nbrs(n), memo = new Map();
  const region = opt.region || null, maxLibs = opt.maxLibs || 2;
  let nodes = 0;
  const captured = p => tgt.some(i => p.b[i] !== def);
  // libs: union of the liberties of the target chains; min: the fewest liberties of any one target chain
  const tgtInfo = p => { const libs = new Set(), chains = new Set(); let min = 99; for (const t of tgt) { if (chains.has(t)) continue; const g = p.group(t); min = Math.min(min, g.libs); for (const s of g.stones) chains.add(s); } for (const s of chains) for (let k = 0; k < 4; k++) { const r = nb[s * 4 + k]; if (r >= 0 && p.b[r] === 0) libs.add(r); } return { libs, chains, min }; };
  function attMoves(p) {
    if (region) return region.filter(i => p.b[i] === 0).concat(opt.attPass ? [-1] : []);
    const { libs } = tgtInfo(p), out = new Set(libs);
    if (opt.libsOnly) return [...out];
    for (const l of libs) for (let k = 0; k < 4; k++) { const r = nb[l * 4 + k]; if (r >= 0 && p.b[r] === 0) out.add(r); }
    // diagonal of liberties too (nets)
    for (const l of libs) { const x = l % n, y = (l / n) | 0; for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < n && Y < n && p.b[Y * n + X] === 0) out.add(Y * n + X); } }
    return [...out];
  }
  function defMoves(p) {
    if (region) return region.filter(i => p.b[i] === 0).concat([-1]);
    const { libs, chains } = tgtInfo(p), out = new Set(libs), seen = new Set();
    for (const s of chains) for (let k = 0; k < 4; k++) { const r = nb[s * 4 + k]; if (r >= 0 && p.b[r] === att && !seen.has(r)) { const g = p.group(r); for (const q of g.stones) seen.add(q); if (g.libs <= 2) for (const q of g.stones) for (let j = 0; j < 4; j++) { const u = nb[q * 4 + j]; if (u >= 0 && p.b[u] === 0) out.add(u); } } }
    return [...out];
  }
  // can the attacker capture within d attacker moves? (p.turn to move)
  function win(p, d) {
    nodes++;
    if (captured(p)) return true;
    const key = p.key() + p.turn + ':' + p.ko + ':' + d;
    if (memo.has(key)) return memo.get(key);
    let res;
    if (p.turn === att) {
      res = false;
      if (d > 0 && (region || tgtInfo(p).min <= maxLibs)) {
        for (const m of attMoves(p)) { const r = p.tryPlay(m, 0, true); if (!r) continue; if (captured(r.pos) || win(r.pos, d - 1)) { res = true; break; } }
      }
    } else {
      res = true;
      for (const m of defMoves(p)) { const r = p.tryPlay(m, 0, true); if (!r) continue; if (!win(r.pos, d)) { res = false; break; } }
    }
    memo.set(key, res);
    return res;
  }
  return { win, nodes: () => nodes, captured };
}

// Evaluate every first move for the side to move.
// goal: 'capture' | 'kill' (mover attacks tgt) or 'escape' | 'live' (mover defends tgt).  depth = attacker moves.
export function solveFirst(spec, goal, tgtS, opt = {}) {
  if (goal === 'connect' || goal === 'cut') return solveConnect(spec, goal, tgtS, opt);
  const n = spec.n, p0 = R.Pos.from(spec), tgt = tgtS.map(s => pt(s, n));
  const mover = p0.turn, attacking = goal === 'capture' || goal === 'kill';
  const att = attacking ? mover : 3 - mover;
  const region = opt.region ? opt.region.map(s => pt(s, n)) : null;
  const depth = opt.depth || 8;
  const cands = opt.cands ? opt.cands.map(s => pt(s, n)) : region ? region.slice() : [...Array(n * n).keys()];
  const out = [];
  const rd = makeReader(n, att, tgt, { region, maxLibs: opt.maxLibs });
  for (const m of cands) {
    if (p0.b[m]) continue;
    const r = p0.tryPlay(m, 0, true); if (!r) continue;
    let ok;
    if (opt.now) ok = attacking ? rd.captured(r.pos) : null;
    else if (attacking) ok = rd.captured(r.pos) || rd.win(r.pos, depth - 1);
    else ok = !rd.win(r.pos, depth);
    out.push({ m: co(m, n), ok });
  }
  if (region) { const r = p0.tryPlay(-1, 0, true); out.push({ m: 'pass', ok: attacking ? rd.win(r.pos, depth - 1) : !rd.win(r.pos, depth) }); }
  return { list: out, wins: out.filter(e => e.ok).map(e => e.m), nodes: rd.nodes() };
}

// connection reader (region mode). connector = colour of tgt stones. Success: all tgt in one chain with >= 2 liberties.
// conn(p, d): can the connector force success using at most d more connector moves?
export function solveConnect(spec, goal, tgtS, opt) {
  const n = spec.n, p0 = R.Pos.from(spec), tgt = tgtS.map(s => pt(s, n)), memo = new Map();
  const region = opt.region.map(s => pt(s, n)), depth = opt.depth || 4;
  const con = p0.b[tgt[0]]; let nodes = 0;
  const ok = p => { if (tgt.some(i => p.b[i] !== con)) return false; const g = p.group(tgt[0]); if (g.libs < 2) return false; const set = new Set(g.stones); return tgt.every(i => set.has(i)); };
  function conn(p, d) {
    nodes++;
    if (tgt.some(i => p.b[i] !== con)) return false;
    if (ok(p) && p.turn !== con) return true;
    const key = p.key() + p.turn + ':' + p.ko + ':' + d; if (memo.has(key)) return memo.get(key);
    let res; const ms = region.filter(i => p.b[i] === 0).concat([-1]);
    if (p.turn === con) { res = ok(p); if (!res && d > 0) for (const m of ms) { const r = p.tryPlay(m, 0, true); if (!r) continue; if (conn(r.pos, d - 1)) { res = true; break; } } }
    else { res = true; for (const m of ms) { const r = p.tryPlay(m, 0, true); if (!r) continue; if (!conn(r.pos, d)) { res = false; break; } } }
    memo.set(key, res); return res;
  }
  const mover = p0.turn, out = [];
  for (const m of region.concat([-1])) {
    if (m >= 0 && p0.b[m]) continue;
    const r = p0.tryPlay(m, 0, true); if (!r) continue;
    const c = mover === con ? conn(r.pos, depth - 1) : conn(r.pos, depth);
    out.push({ m: m < 0 ? 'pass' : co(m, n), ok: goal === 'connect' ? c : !c });
  }
  return { list: out, wins: out.filter(e => e.ok).map(e => e.m), nodes };
}

// play a line and return the spec after it
export function after(spec, line) {
  const n = spec.n; let p = R.Pos.from(spec);
  for (const m of line) { const r = p.tryPlay(m === 'pass' ? -1 : pt(m, n), 0, true); if (!r) throw new Error('illegal line move ' + m); p = r.pos; }
  return p.spec();
}

// row transforms for building variants of a position
export const T = {
  flipV: rows => rows.slice().reverse(),
  flipH: rows => rows.map(r => r.split('').reverse().join('')),
  transpose: rows => rows[0].split('').map((_, x) => rows.map(r => r[x]).join('')),
  swap: rows => rows.map(r => r.replace(/X/g, 'x').replace(/O/g, 'X').replace(/x/g, 'O')),
};

// principal variation for capture/kill problems: attacker plays the quickest win, defender the longest resistance.
export function pv(spec, goal, tgtS, opt = {}, first) {
  const n = spec.n, tgt = tgtS.map(s => pt(s, n));
  let p = R.Pos.from(spec);
  const att = goal === 'capture' || goal === 'kill' ? p.turn : 3 - p.turn;
  const region = opt.region ? opt.region.map(s => pt(s, n)) : null;
  const rd = makeReader(n, att, tgt, { region, maxLibs: opt.maxLibs, libsOnly: opt.libsOnly });
  const maxD = opt.depth || 8, line = [];
  const need = (q, cap) => { for (let d = 0; d <= cap; d++) if (rd.win(q, d)) return d; return 99; };
  for (let ply = 0; ply < 20 && !rd.captured(p); ply++) {
    let best = null, bv = p.turn === att ? 99 : -1;
    const cand = region ? region.filter(i => p.b[i] === 0) : [...Array(n * n).keys()].filter(i => p.b[i] === 0);
    if (ply === 0 && first) { best = pt(first, n); }
    else for (const m of cand) {
      const r = p.tryPlay(m, 0, true); if (!r) continue;
      if (p.turn === att) { const v = rd.captured(r.pos) ? 0 : need(r.pos, maxD); if (v < bv) { bv = v; best = m; } }
      else { const v = need(r.pos, maxD); if (v > bv) { bv = v; best = m; } }
    }
    if (best === null) break;
    if (p.turn !== att && bv >= 99) { line.push(co(best, n)); break; }
    p = p.tryPlay(best, 0, true).pos; line.push(co(best, n));
  }
  return line;
}
