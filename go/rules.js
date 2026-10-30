/*
 * Go (囲碁) rules for the page, the engine worker, online play and the tools.
 * Boards 5x5 … 19x19. A point is an index i = y*n + x (x = column from the left, y = row from the top); PASS = -1.
 * Captures, suicide is illegal, simple ko + positional superko (a move may not repeat an earlier whole-board position).
 * Scoring: Japanese (territory + prisoners) or Chinese (area), dead stones given by the caller.
 * Copyright 2026 core-calmdust
 */
(function (root) {
'use strict';
const EMPTY = 0, BLACK = 1, WHITE = 2, PASS = -1;
const COLS = 'ABCDEFGHJKLMNOPQRST';           // GTP / board letters skip I
const SGFC = 'abcdefghijklmnopqrs';

const NBR = {};                                // n -> Int16Array neighbours (4 per point, -1 = none)
function nbrs(n) {
  if (NBR[n]) return NBR[n];
  const a = new Int16Array(n * n * 4).fill(-1);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, k = i * 4;
    if (x > 0) a[k] = i - 1; if (x < n - 1) a[k + 1] = i + 1; if (y > 0) a[k + 2] = i - n; if (y < n - 1) a[k + 3] = i + n;
  }
  return (NBR[n] = a);
}
// Zobrist hashing (two 32-bit halves) for superko
const ZB = [], ZW = [];
(function () { let s = 0x9e3779b9; const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s >>> 0; }; for (let i = 0; i < 361 * 2; i++) { ZB.push(r()); ZW.push(r()); } })();

class Pos {
  constructor(n) {
    this.n = n; this.b = new Uint8Array(n * n); this.turn = BLACK; this.ko = -1;
    this.caps = [0, 0, 0];      // stones captured BY each colour
    this.h1 = 0; this.h2 = 0;   // position hash
    this.passes = 0;            // consecutive passes
    this.seen = null;           // Set of hashes of earlier positions (superko), shared copy-on-write
  }
  clone() {
    const p = new Pos(this.n); p.b.set(this.b); p.turn = this.turn; p.ko = this.ko; p.caps = this.caps.slice();
    p.h1 = this.h1; p.h2 = this.h2; p.passes = this.passes; p.seen = this.seen; return p;
  }
  at(i) { return this.b[i]; }
  key() { return this.h1.toString(36) + '.' + this.h2.toString(36); }
  _flip(i, c) { const k = i * 2 + (c - 1); this.h1 ^= ZB[k]; this.h2 ^= ZW[k]; }
  put(i, c) { if (this.b[i]) this._flip(i, this.b[i]); this.b[i] = c; if (c) this._flip(i, c); }
  // flood fill: { stones: [...], libs: n, lib: first liberty }
  group(i) {
    const n = this.n, nb = nbrs(n), c = this.b[i], st = [i], seen = new Uint8Array(n * n), out = []; seen[i] = 1;
    let libs = 0, lib = -1; const ls = new Uint8Array(n * n);
    while (st.length) {
      const q = st.pop(); out.push(q);
      for (let k = 0; k < 4; k++) { const r = nb[q * 4 + k]; if (r < 0) continue; const v = this.b[r]; if (v === EMPTY) { if (!ls[r]) { ls[r] = 1; libs++; if (lib < 0) lib = r; } } else if (v === c && !seen[r]) { seen[r] = 1; st.push(r); } }
    }
    return { stones: out, libs, lib };
  }
  libsOf(i) { return this.group(i).libs; }
  // try move: returns null if illegal, else { pos, captured: [points] }
  tryPlay(i, color, light) {
    const c = color || this.turn;
    if (i === PASS) { const p = this.clone(); p.ko = -1; p.turn = 3 - c; p.passes++; return { pos: p, captured: [] }; }
    if (i < 0 || i >= this.n * this.n || this.b[i] !== EMPTY || i === this.ko) return null;
    const p = this.clone(), nb = nbrs(this.n), o = 3 - c, cap = [];
    p.put(i, c);
    for (let k = 0; k < 4; k++) {
      const r = nb[i * 4 + k]; if (r < 0 || p.b[r] !== o) continue;
      const g = p.group(r); if (g.libs === 0) for (const s of g.stones) { p.put(s, EMPTY); cap.push(s); }
    }
    if (!cap.length && p.group(i).libs === 0) return null;               // suicide
    p.ko = -1;
    if (cap.length === 1) { const g = p.group(i); if (g.stones.length === 1 && g.libs === 1) p.ko = cap[0]; }
    // positional superko: the new position may not repeat an earlier one
    const key = p.key();
    if (this.seen && this.seen.has(key)) return null;
    if (!light) { const s = new Set(this.seen || []); s.add(this.key()); p.seen = s; }
    p.caps[c] += cap.length; p.turn = o; p.passes = 0;
    return { pos: p, captured: cap };
  }
  legal(i) {
    if (i === PASS) return true;
    if (i < 0 || i >= this.b.length || this.b[i] !== EMPTY || i === this.ko) return false;
    const nb = nbrs(this.n), o = 3 - this.turn;   // fast path: a free neighbour and no capture
    let free = false, adjOpp = false;
    for (let k = 0; k < 4; k++) { const r = nb[i * 4 + k]; if (r < 0) continue; if (this.b[r] === EMPTY) free = true; else if (this.b[r] === o) adjOpp = true; }
    if (free && !adjOpp) return true;
    return this.tryPlay(i, 0, true) !== null;
  }
  play(i) { const r = this.tryPlay(i); if (!r) throw new Error('illegal move ' + i); Object.assign(this, r.pos); return r.captured; }
  moves() { const out = []; for (let i = 0; i < this.n * this.n; i++) if (this.legal(i)) out.push(i); return out; }
  count(c) { let k = 0; for (let i = 0; i < this.b.length; i++) if (this.b[i] === c) k++; return k; }
  // ---- spec: { n, stones: 'b..w...' (n*n chars) or [[i,c],...], turn, komi }
  static from(spec) {
    const n = (spec && spec.n) || 19, p = new Pos(n);
    if (spec && spec.stones) {
      if (typeof spec.stones === 'string') { for (let i = 0; i < n * n; i++) { const ch = spec.stones[i]; if (ch === 'b' || ch === 'x' || ch === 'X') p.put(i, BLACK); else if (ch === 'w' || ch === 'o' || ch === 'O') p.put(i, WHITE); } }
      else for (const [i, c] of spec.stones) p.put(i, c);
    }
    if (spec && spec.turn) p.turn = spec.turn;
    return p;
  }
  spec() { let s = ''; for (let i = 0; i < this.b.length; i++) s += this.b[i] === BLACK ? 'b' : this.b[i] === WHITE ? 'w' : '.'; return { n: this.n, stones: s, turn: this.turn }; }
}

// replay a game: spec (start position) + moves → { pos, positions? }
function replay(spec, moves) {
  let p = Pos.from(spec);
  for (const m of moves) { const r = p.tryPlay(m); if (!r) return { pos: p, bad: true }; p = r.pos; }
  return { pos: p };
}

// ---- handicap stones (Japanese placement, 2–9 stones) for 9 / 13 / 19 (and any size >= 7)
function handicapPoints(n, k) {
  if (k < 2) return [];
  const e = n >= 13 ? 3 : 2, a = e, b = n - 1 - e, m = (n - 1) >> 1;
  const P = (x, y) => y * n + x;
  const corners = [P(b, a), P(a, b), P(b, b), P(a, a)];     // upper-right, lower-left, lower-right, upper-left
  const sides = [P(a, m), P(b, m), P(m, a), P(m, b)];
  const odd = n % 2 === 1;
  if (k <= 4) return corners.slice(0, k);
  if (k === 5) return odd ? corners.concat([P(m, m)]) : corners;
  if (k === 6) return corners.concat(sides.slice(0, 2));
  if (k === 7) return odd ? corners.concat(sides.slice(0, 2), [P(m, m)]) : corners.concat(sides.slice(0, 2));
  if (k === 8) return corners.concat(sides);
  return odd ? corners.concat(sides, [P(m, m)]) : corners.concat(sides);
}
function starPoints(n) {
  if (n < 7) return n === 5 ? [12] : [];
  const e = n >= 13 ? 3 : 2, a = e, b = n - 1 - e, m = (n - 1) >> 1, P = (x, y) => y * n + x;
  const s = [P(a, a), P(b, a), P(a, b), P(b, b)];
  if (n % 2 === 1) { s.push(P(m, m)); if (n >= 15) s.push(P(a, m), P(b, m), P(m, a), P(m, b)); }
  return s;
}

// ---- scoring. dead: Set/array of dead stone points. rule 'jp' (territory) | 'cn' (area). Returns black - white incl. komi.
function score(pos, dead, rule, komi) {
  const n = pos.n, nb = nbrs(n), D = new Set(dead || []), b = pos.b;
  const board = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) board[i] = D.has(i) ? EMPTY : b[i];
  const own = new Int8Array(b.length);          // 1 black territory, 2 white territory, 3 dame (neutral)
  const seen = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) {
    if (board[i] !== EMPTY || seen[i]) continue;
    const st = [i], reg = []; seen[i] = 1; let tb = false, tw = false;
    while (st.length) {
      const q = st.pop(); reg.push(q);
      for (let k = 0; k < 4; k++) { const r = nb[q * 4 + k]; if (r < 0) continue; const v = board[r]; if (v === EMPTY) { if (!seen[r]) { seen[r] = 1; st.push(r); } } else if (v === BLACK) tb = true; else tw = true; }
    }
    const o = tb && !tw ? BLACK : tw && !tb ? WHITE : 3;
    for (const q of reg) own[q] = o;
  }
  let terrB = 0, terrW = 0, stB = 0, stW = 0, deadB = 0, deadW = 0;
  for (let i = 0; i < b.length; i++) {
    if (own[i] === BLACK) terrB++; else if (own[i] === WHITE) terrW++;
    if (board[i] === BLACK) stB++; else if (board[i] === WHITE) stW++;
    if (D.has(i)) { if (b[i] === BLACK) deadB++; else if (b[i] === WHITE) deadW++; }
  }
  let sb, sw;
  if (rule === 'cn') { sb = terrB + stB; sw = terrW + stW; }
  else { sb = terrB + pos.caps[BLACK] + deadW; sw = terrW + pos.caps[WHITE] + deadB; }
  sw += komi;
  return { b: sb, w: sw, diff: sb - sw, own, terrB, terrW, stB, stW, capB: pos.caps[BLACK] + deadW, capW: pos.caps[WHITE] + deadB };
}

// ---- coordinates
const coord = (i, n) => i === PASS ? 'pass' : COLS[i % n] + (n - Math.floor(i / n));
function parseCoord(s, n) {
  s = String(s).trim().toUpperCase(); if (s === 'PASS' || s === 'PA') return PASS;
  const x = COLS.indexOf(s[0]), y = n - parseInt(s.slice(1), 10);
  if (x < 0 || x >= n || !(y >= 0 && y < n)) return null;
  return y * n + x;
}

// ---- SGF (FF[4]): write / read a simple main line (setup stones, komi, size, moves)
function sgfWrite(g) {
  const n = g.n, pt = i => SGFC[i % n] + SGFC[Math.floor(i / n)];
  let s = `(;GM[1]FF[4]CA[UTF-8]AP[World Board Game Atlas]SZ[${n}]KM[${g.komi}]RU[${g.rule === 'cn' ? 'Chinese' : 'Japanese'}]`;
  if (g.pb) s += `PB[${esc(g.pb)}]`; if (g.pw) s += `PW[${esc(g.pw)}]`;
  if (g.ha) s += `HA[${g.ha}]`;
  if (g.result) s += `RE[${esc(g.result)}]`;
  if (g.date) s += `DT[${g.date}]`;
  const ab = [], aw = [];
  if (g.start && g.start.stones) { const sp = Pos.from(g.start); for (let i = 0; i < n * n; i++) { if (sp.b[i] === BLACK) ab.push(i); else if (sp.b[i] === WHITE) aw.push(i); } }
  if (ab.length) s += 'AB' + ab.map(i => `[${pt(i)}]`).join('');
  if (aw.length) s += 'AW' + aw.map(i => `[${pt(i)}]`).join('');
  if (g.start && g.start.turn === WHITE && (ab.length || aw.length)) s += 'PL[W]';
  let c = g.start && g.start.turn === WHITE ? WHITE : BLACK;
  for (const m of g.moves) { s += `;${c === BLACK ? 'B' : 'W'}[${m === PASS ? '' : pt(m)}]`; c = 3 - c; }
  return s + ')';
}
function esc(v) { return String(v).replace(/[\]\\]/g, '\\$&'); }
function sgfRead(text) {
  text = String(text || '');
  const i0 = text.indexOf('(;'); if (i0 < 0) return null;
  const props = []; let i = i0 + 1, depth = 0, node = null;
  // main line only: skip variations after the first one closes
  while (i < text.length) {
    const ch = text[i];
    if (ch === '(') { depth++; i++; continue; }
    if (ch === ')') { if (depth === 0) break; depth--; i++; if (depth >= 0) { /* end of a variation: ignore the rest of siblings */ let d = 0; while (i < text.length && !(text[i] === ')' && d === 0)) { if (text[i] === '(') d++; else if (text[i] === ')') d--; i++; } } continue; }
    if (ch === ';') { node = {}; props.push(node); i++; continue; }
    if (/[A-Z]/.test(ch)) {
      let id = ''; while (i < text.length && /[A-Za-z]/.test(text[i])) { if (/[A-Z]/.test(text[i])) id += text[i]; i++; }
      const vals = [];
      while (true) {
        while (i < text.length && /\s/.test(text[i])) i++;
        if (text[i] !== '[') break;
        i++; let v = '';
        while (i < text.length && text[i] !== ']') { if (text[i] === '\\') i++; v += text[i]; i++; }
        i++; vals.push(v);
      }
      if (node) node[id] = (node[id] || []).concat(vals);
      continue;
    }
    i++;
  }
  if (!props.length) return null;
  const r = props[0], n = parseInt((r.SZ || ['19'])[0], 10) || 19;
  if (n < 5 || n > 19) return { bad: 'size' };
  const P = v => { if (!v || v.length < 2 || (v === 'tt' && n <= 19)) return PASS; const x = SGFC.indexOf(v[0]), y = SGFC.indexOf(v[1]); return x < 0 || y < 0 || x >= n || y >= n ? null : y * n + x; };
  const stones = [];
  for (const v of r.AB || []) { const q = P(v); if (q !== null && q !== PASS) stones.push([q, BLACK]); }
  for (const v of r.AW || []) { const q = P(v); if (q !== null && q !== PASS) stones.push([q, WHITE]); }
  const komi = parseFloat((r.KM || ['6.5'])[0]);
  const rule = /chin|aga|area/i.test((r.RU || [''])[0]) ? 'cn' : 'jp';
  let turn = (r.PL || [''])[0] === 'W' ? WHITE : stones.length && stones.every(s => s[1] === BLACK) && stones.length >= 2 ? WHITE : BLACK;
  const moves = [];
  for (let k = 0; k < props.length; k++) {
    const nd = props[k];
    if (k === 0 && !nd.B && !nd.W) continue;
    if (nd.B || nd.W) {
      const c = nd.B ? BLACK : WHITE, q = P((nd.B || nd.W)[0]);
      if (q === null) return { bad: 'move', at: moves.length + 1 };
      if (!moves.length && c !== turn) turn = c;
      moves.push(q);
    }
  }
  const start = { n, stones: stones.length ? stones : undefined, turn };
  const rp = replay(start, moves);
  if (rp.bad) return { bad: 'illegal' };
  return { n, komi: isFinite(komi) ? komi : 6.5, rule, start, moves, ha: parseInt((r.HA || ['0'])[0], 10) || 0, pb: (r.PB || [''])[0], pw: (r.PW || [''])[0], result: (r.RE || [''])[0] };
}

// ---- defaults: komi for each size (Japanese rules, about even; small boards favour Black a lot)
function defaultKomi(n, rule) {
  const cn = rule === 'cn';
  if (n >= 13) return cn ? 7.5 : 6.5;
  if (n >= 9) return cn ? 7.5 : 6.5;
  // tiny boards: the solved / best-known result + 0.5 so that perfect play gives Black a half-point win.
  // Area (Chinese) scoring: 5x5 B+25, 6x6 B+4, 7x7 B+9, 8x8 about B+10. Territory (Japanese) scoring comes out one point lower
  // (White may simply pass instead of adding stones, e.g. 7x7 B+8 per KataGo), so Japanese komi = area komi - 1.
  const A = { 5: 24.5, 6: 3.5, 7: 8.5, 8: 9.5 };
  const k = A[n] !== undefined ? A[n] : 6.5;
  return cn ? k : k - 1;
}

const api = { EMPTY, BLACK, WHITE, PASS, COLS, Pos, replay, nbrs, handicapPoints, starPoints, score, coord, parseCoord, sgfWrite, sgfRead, defaultKomi };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.GoRules = api;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
