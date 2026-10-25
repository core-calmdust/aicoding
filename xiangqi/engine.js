// Xiangqi — rules (for the page) and the AI worker (WebAssembly search from engine.c).
// Works as a Web Worker (postMessage API), as a plain <script> (window.XiangqiEngine) and as a Node module.
//
// Board: 90 points, sq = row * 9 + col. Row 0 = Black's back rank (top), row 9 = Red's back rank (bottom); col 0 = the
// left file seen from Red. Pieces: 1 K (帥/將) 2 A (仕/士) 3 E (相/象) 4 H (傌/馬) 5 R (俥/車) 6 C (炮/砲) 7 P (兵/卒), +8 = Black.
// Red (P1) moves first. Moves are plain numbers: m = from + 90 * to.
// Game end (judge): a side without a legal move loses (checkmate or stalemate); a position seen for the third time:
// perpetual check loses, otherwise perpetual chase loses (Asian / WXF rules, simplified: a move "chases" when it newly
// attacks an unprotected enemy piece, or a rook with a horse / cannon — king and pawns may chase), otherwise a draw;
// 120 plies without a capture (the 60-move rule) and positions where neither side has an attacking piece are drawn.
(function () {
'use strict';
const P1 = 1, P2 = 2;                       // P1 = Red (side 0), P2 = Black (side 1)
const WIN = 30000, WINT = 29000, DRAW_PLIES = 120;
const KING = 1, ADVISOR = 2, ELEPHANT = 3, HORSE = 4, ROOK = 5, CANNON = 6, PAWN = 7;
const START = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
const RC = []; for (let s = 0; s < 90; s++) RC.push([Math.floor(s / 9), s % 9]);
const sqAt = (r, c) => r < 0 || r > 9 || c < 0 || c > 8 ? -1 : r * 9 + c;
const onb = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
const palace = (r, c) => c >= 3 && c <= 5 && (r <= 2 || r >= 7);
const colorOf = p => p >> 3, typeOf = p => p & 7;
// ---------------------------------------------------------------- geometry tables (as in engine.c)
const RAYS = [], NMOV = [], NATT = [], EMOV = [], AMOV = [], KMOV = [], PMOV = [[], []];
for (let s = 0; s < 90; s++) {
  const [r, c] = RC[s];
  RAYS.push([[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dr, dc]) => { const o = []; let rr = r + dr, cc = c + dc; while (onb(rr, cc)) { o.push(rr * 9 + cc); rr += dr; cc += dc; } return o; }));
  NMOV.push([[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]].filter(([a, b]) => onb(r + a, c + b)).map(([a, b, x, y]) => [(r + a) * 9 + c + b, (r + x) * 9 + c + y]));
  const em = []; for (const dr of [-2, 2]) for (const dc of [-2, 2]) { const tr = r + dr, tc = c + dc; if (onb(tr, tc) && (r <= 4) === (tr <= 4)) em.push([tr * 9 + tc, (r + dr / 2) * 9 + c + dc / 2]); }
  EMOV.push(em);
  const am = []; for (const dr of [-1, 1]) for (const dc of [-1, 1]) { const tr = r + dr, tc = c + dc; if (onb(tr, tc) && palace(tr, tc) && palace(r, c) && (r <= 2) === (tr <= 2)) am.push(tr * 9 + tc); }
  AMOV.push(am);
  KMOV.push([[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([a, b]) => onb(r + a, c + b) && palace(r + a, c + b) && palace(r, c) && (r <= 2) === (r + a <= 2)).map(([a, b]) => (r + a) * 9 + c + b));
  for (const col of [0, 1]) { const o = [], fr = col ? r + 1 : r - 1, crossed = col ? r >= 5 : r <= 4; if (onb(fr, c)) o.push(fr * 9 + c); if (crossed) { if (c > 0) o.push(s - 1); if (c < 8) o.push(s + 1); } PMOV[col].push(o); }
}
for (let s = 0; s < 90; s++) NATT.push([]);
for (let h = 0; h < 90; h++) for (const [t, leg] of NMOV[h]) NATT[t].push([h, leg]);
const mv = (f, t) => f + 90 * t;
const mFrom = m => m % 90, mTo = m => Math.floor(m / 90);
// zobrist (two 32-bit halves)
let zs = 0x2545F491;
const zr = () => { zs ^= zs << 13; zs >>>= 0; zs ^= zs >>> 17; zs ^= zs << 5; zs >>>= 0; return zs; };
const Z1 = [], Z2 = []; for (let p = 0; p < 16; p++) { Z1.push([]); Z2.push([]); for (let s = 0; s < 90; s++) { Z1[p].push(zr()); Z2[p].push(zr()); } }
const ZS1 = zr(), ZS2 = zr();
const FEN_CH = '.kabnrcp';
function pieceOfChar(ch) { const col = ch >= 'a' && ch <= 'z' ? 1 : 0; let l = ch.toLowerCase(); if (l === 'e') l = 'b'; if (l === 'h') l = 'n'; const t = 'kabnrcp'.indexOf(l); return t < 0 ? -1 : (t + 1) | (col << 3); }

class Pos {
  constructor() { this.b = new Int8Array(90); this.side = 0; this.quiet = 0; this.k = [-1, -1]; this.h1 = 0; this.h2 = 0; }
  // spec: null (the starting position), a FEN string ("rnbakabnr/9/... w") or { fen }
  static from(spec) {
    const p = new Pos(), fen = spec == null ? START : typeof spec === 'string' ? spec : spec.fen || START;
    const [board, sd] = String(fen).trim().split(/\s+/);
    let r = 0, c = 0;
    for (const ch of board) {
      if (ch === '/') { r++; c = 0; continue; }
      if (ch >= '1' && ch <= '9') { c += +ch; continue; }
      const pc = pieceOfChar(ch); if (pc < 0 || r > 9 || c > 8) throw new Error('bad fen');
      p.b[r * 9 + c] = pc; c++;
    }
    p.side = sd === 'b' ? 1 : 0;
    p.findKings(); p.rehash();
    return p;
  }
  clone() { const q = Object.create(Pos.prototype); q.b = this.b.slice(); q.side = this.side; q.quiet = this.quiet; q.k = this.k.slice(); q.h1 = this.h1; q.h2 = this.h2; return q; }
  findKings() { this.k = [-1, -1]; for (let s = 0; s < 90; s++) if (typeOf(this.b[s]) === KING) this.k[colorOf(this.b[s])] = s; }
  rehash() { let a = 0, c = 0; for (let s = 0; s < 90; s++) { const x = this.b[s]; if (x) { a ^= Z1[x][s]; c ^= Z2[x][s]; } } if (this.side) { a ^= ZS1; c ^= ZS2; } this.h1 = a >>> 0; this.h2 = c >>> 0; }
  get key() { return this.h1 + ':' + this.h2; }
  at(s) { return this.b[s]; }
  get turn() { return this.side ? P2 : P1; }
  count(p) { const c = p === P1 ? 0 : 1; let n = 0; for (let s = 0; s < 90; s++) if (this.b[s] && colorOf(this.b[s]) === c) n++; return n; }
  // is the king of colour c (0 red, 1 black) attacked (kings facing each other included)?
  attacked(c) {
    const k = this.k[c]; if (k < 0) return true;
    const o = c ^ 1, b = this.b, oR = ROOK | (o << 3), oC = CANNON | (o << 3), oK = KING | (o << 3), oN = HORSE | (o << 3), oP = PAWN | (o << 3);
    for (let d = 0; d < 4; d++) {
      const ray = RAYS[k][d]; let i = 0;
      while (i < ray.length && !b[ray[i]]) i++;
      if (i >= ray.length) continue;
      const p = b[ray[i]];
      if (p === oR || (d < 2 && p === oK)) return true;
      i++; while (i < ray.length && !b[ray[i]]) i++;
      if (i < ray.length && b[ray[i]] === oC) return true;
    }
    for (const [h, leg] of NATT[k]) if (b[h] === oN && !b[leg]) return true;
    const fw = c ? k + 9 : k - 9; if (fw >= 0 && fw < 90 && b[fw] === oP) return true;
    const col = k % 9; if (col > 0 && b[k - 1] === oP) return true; if (col < 8 && b[k + 1] === oP) return true;
    return false;
  }
  inCheck() { return this.attacked(this.side); }
  // pseudo-legal moves of colour c from the point s (or all pieces); capsOnly: captures only
  pseudo(c, capsOnly, only) {
    const b = this.b, out = [];
    const add = (s, t) => { const q = b[t]; if (q ? colorOf(q) !== c : !capsOnly) out.push(mv(s, t)); };
    for (let s = only == null ? 0 : only; s < (only == null ? 90 : only + 1); s++) {
      const p = b[s]; if (!p || colorOf(p) !== c) continue;
      switch (typeOf(p)) {
        case KING: for (const t of KMOV[s]) add(s, t); break;
        case ADVISOR: for (const t of AMOV[s]) add(s, t); break;
        case ELEPHANT: for (const [t, eye] of EMOV[s]) if (!b[eye]) add(s, t); break;
        case HORSE: for (const [t, leg] of NMOV[s]) if (!b[leg]) add(s, t); break;
        case PAWN: for (const t of PMOV[c][s]) add(s, t); break;
        case ROOK: for (const ray of RAYS[s]) for (const t of ray) { if (!b[t]) { if (!capsOnly) out.push(mv(s, t)); continue; } if (colorOf(b[t]) !== c) out.push(mv(s, t)); break; } break;
        case CANNON:
          for (const ray of RAYS[s]) {
            let i = 0; for (; i < ray.length; i++) { if (b[ray[i]]) break; if (!capsOnly) out.push(mv(s, ray[i])); }
            for (i++; i < ray.length; i++) { const q = b[ray[i]]; if (!q) continue; if (colorOf(q) !== c) out.push(mv(s, ray[i])); break; }
          }
          break;
      }
    }
    return out;
  }
  // a move by colour c from this position (side to move ignored) does not leave c's king attacked
  safe(m, c) { const f = mFrom(m), t = mTo(m), b = this.b, p = b[f], q = b[t]; b[t] = p; b[f] = 0; const ks = this.k[c]; if (typeOf(p) === KING) this.k[c] = t; const bad = this.attacked(c); b[f] = p; b[t] = q; this.k[c] = ks; return !bad; }
  moves() { const c = this.side; return this.pseudo(c, false).filter(m => this.safe(m, c)); }
  movesFrom(s) { const c = this.side; return this.pseudo(c, false, s).filter(m => this.safe(m, c)); }
  hasCaps() { return this.moves().some(m => this.b[mTo(m)]); }
  status() { return this.moves().length ? 0 : -1; }
  isCapture(m) { return !!this.b[mTo(m)]; }
  play(m) {
    const f = mFrom(m), t = mTo(m), b = this.b, p = b[f], q = b[t];
    let h1 = this.h1 ^ Z1[p][f] ^ Z1[p][t] ^ ZS1, h2 = this.h2 ^ Z2[p][f] ^ Z2[p][t] ^ ZS2;
    if (q) { h1 ^= Z1[q][t]; h2 ^= Z2[q][t]; if (typeOf(q) === KING) this.k[colorOf(q)] = -1; }
    b[t] = p; b[f] = 0; if (typeOf(p) === KING) this.k[colorOf(p)] = t;
    this.side ^= 1; this.h1 = h1 >>> 0; this.h2 = h2 >>> 0; this.quiet = q ? 0 : this.quiet + 1;
    return this;
  }
  fen() {
    let s = '';
    for (let r = 0; r < 10; r++) {
      let e = 0;
      for (let c = 0; c < 9; c++) { const p = this.b[r * 9 + c]; if (!p) { e++; continue; } if (e) { s += e; e = 0; } const ch = FEN_CH[typeOf(p)]; s += colorOf(p) ? ch : ch.toUpperCase(); }
      if (e) s += e; if (r < 9) s += '/';
    }
    return s + ' ' + (this.side ? 'b' : 'w');
  }
  spec() { return this.fen(); }
  // material (rough points) of colour c
  material(c) { const V = [0, 0, 2, 2, 4, 9, 4.5, 1]; let v = 0; for (let s = 0; s < 90; s++) { const p = this.b[s]; if (p && colorOf(p) === c) v += V[typeOf(p)] + (typeOf(p) === PAWN && (c ? s >= 45 : s < 45) ? 1 : 0); } return v; }
  noAttackers() { for (let s = 0; s < 90; s++) if (typeOf(this.b[s]) >= HORSE) return false; return true; }
}

// ---------------------------------------------------------------- notation
// style 'wxf' (C2=5, H8+7, R1+1, +C=4) · 'zh' (炮二平五 / 马8进7, simplified) · 'ja' (炮二平五 / 馬8進7) · 'iccs' (h2e2)
const WXF_L = ' KAEHRCP';
const ZH = { r: ' 帅仕相马车炮兵', b: ' 将士象马车炮卒', go: ['进', '退', '平'], fr: ['前', '后', '中'] };
const JA = { r: ' 帥仕相馬車炮兵', b: ' 将士象馬車砲卒', go: ['進', '退', '平'], fr: ['前', '後', '中'] };
const CN_NUM = ' 一二三四五六七八九';
const fileNo = (c, col) => col ? c + 1 : 9 - c;    // Red counts files from its right, Black from its right
const sqName = s => 'abcdefghi'[s % 9] + (9 - Math.floor(s / 9));
function name(pos, m, style) {
  const f = mFrom(m), t = mTo(m), p = pos.b[f]; if (!p) return '?';
  if (style === 'iccs') return sqName(f) + sqName(t);
  const col = colorOf(p), tp = typeOf(p), [fr, fc] = RC[f], [tr, tc] = RC[t];
  const fwd = col ? tr > fr : tr < fr, dir = tr === fr ? 2 : fwd ? 0 : 1;
  // same pieces on the same file: front / rear (from the mover's view)
  const same = []; for (let r = 0; r < 10; r++) { const s = r * 9 + fc; if (pos.b[s] === p) same.push(s); }
  if (col === 0) same.sort((a, b) => a - b); else same.sort((a, b) => b - a);   // front first (closest to the enemy)
  const straight = tp === KING || tp === ROOK || tp === CANNON || tp === PAWN;
  const destV = dir === 2 || !straight ? fileNo(tc, col) : Math.abs(tr - fr);
  if (style === 'zh' || style === 'ja') {
    const S = style === 'ja' ? JA : ZH, ch = S[col ? 'b' : 'r'][tp], num = n => col ? String(n) : CN_NUM[n];
    let head;
    if (same.length >= 2 && tp !== KING && tp !== ADVISOR && tp !== ELEPHANT) {
      const i = same.indexOf(f), k = same.length === 2 ? [S.fr[0], S.fr[1]][i] : same.length === 3 ? [S.fr[0], S.fr[2], S.fr[1]][i] : num(i + 1);
      head = k + ch;
    } else head = ch + num(fileNo(fc, col));
    return head + S.go[dir] + num(destV);
  }
  const L = WXF_L[tp];
  let head = L + fileNo(fc, col);
  if (same.length >= 2 && tp !== KING && tp !== ADVISOR && tp !== ELEPHANT) {
    const i = same.indexOf(f);
    head = L + (same.length === 2 ? (i ? '-' : '+') : same.length === 3 ? ['+', '.', '-'][i] : String(i + 1));
  }
  return head + ['+', '-', '='][dir] + destV;
}
function parse(pos, s) {
  s = String(s || '').trim(); if (!s) return null;
  const L = pos.moves();
  const icc = s.toLowerCase().replace(/[-\s]/g, '').match(/^([a-i])([0-9])([a-i])([0-9])$/);
  if (icc) { const f = (9 - +icc[2]) * 9 + 'abcdefghi'.indexOf(icc[1]), t = (9 - +icc[4]) * 9 + 'abcdefghi'.indexOf(icc[3]); return L.includes(mv(f, t)) ? mv(f, t) : null; }
  const norm = x => x.replace(/[．.]/g, '=').replace(/\s/g, '').replace(/[Ｂ]/g, 'E').toUpperCase().replace(/^([KAEHRCPBN])/, (_, l) => ({ B: 'E', N: 'H' }[l] || l))
    .replace(/[帥帅將将]/g, 'K').replace(/[仕士]/g, 'A').replace(/[相象]/g, 'E').replace(/[傌馬马]/g, 'H').replace(/[俥車车]/g, 'R').replace(/[炮砲]/g, 'C').replace(/[兵卒]/g, 'P')
    .replace(/[進进]/g, '+').replace(/退/g, '-').replace(/平/g, '=').replace(/[一二三四五六七八九]/g, d => CN_NUM.indexOf(d)).replace(/[１-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0))
    .replace(/前/g, 'F').replace(/[后後]/g, 'B').replace(/中/g, 'M');
  const want = norm(s);
  for (const m of L) {
    for (const st of ['wxf', 'zh', 'ja']) {
      let n = norm(name(pos, m, st));
      // tandem forms: "+C=5" / "C+=5" / "前炮平五"
      if (n === want) return m;
      const alt = n.replace(/^([KAEHRCP])([+\-.])/, '$2$1');
      if (alt === want) return m;
      if (st !== 'wxf' && n.replace(/^F/, '+').replace(/^B/, '-') === want) return m;
    }
  }
  return null;
}
function replay(start, moves) {
  const pos = Pos.from(start), hashes = [pos.key], checks = [pos.inCheck()];
  for (const m of moves || []) { pos.play(m); hashes.push(pos.key); checks.push(pos.inCheck()); }
  return { pos, hashes, checks };
}
// ---------------------------------------------------------------- chase detection (for perpetual chase)
const VAL = [0, 0, 2, 2, 4, 9, 4.5, 1];
function pieceVal(pos, s) { const p = pos.b[s], t = typeOf(p); return t === PAWN ? (colorOf(p) ? s >= 45 : s < 45) ? 2 : 1 : VAL[t]; }
// enemy points that colour c (not necessarily to move) "chases" in this position: attacked by one of c's A / E / H / R / C,
// the capture is legal, and the piece is unprotected or worth more than the attacker (kings and uncrossed pawns excluded)
function threats(pos, c) {
  const out = new Set();
  for (const m of pos.pseudo(c, true)) {
    const f = mFrom(m), t = mTo(m), a = pos.b[f], v = pos.b[t];
    if (typeOf(a) === KING || typeOf(a) === PAWN || typeOf(v) === KING) continue;
    if (typeOf(v) === PAWN && !(colorOf(v) ? t >= 45 : t < 45)) continue;
    if (!pos.safe(m, c)) continue;
    const q = pos.clone(); q.b[t] = a; q.b[f] = 0;
    const prot = q.pseudo(c ^ 1, true).some(x => mTo(x) === t && q.safe(x, c ^ 1));
    if (!prot || pieceVal(pos, f) < pieceVal(pos, t)) out.add(t);
  }
  return out;
}
function isChase(before, m) {
  const c = before.side, after = before.clone().play(m);
  const A = threats(after, c); if (!A.size) return false;
  const B0 = threats(before, c), t = mTo(m), f = mFrom(m);
  for (const x of A) if (!B0.has(x) && x !== f) return true;
  return false;
}
// game status after the moves: { over, winner (1 / 2 / 0), draw, why: mate | stale | pcheck | pchase | rep | sixty | material }
function judge(pos, hashes, start, moves) {
  if (pos.status() === -1) return { over: true, winner: pos.side ? P1 : P2, why: pos.inCheck() ? 'mate' : 'stale' };
  if (pos.noAttackers()) return { over: true, winner: 0, draw: true, why: 'material' };
  const n = hashes.length - 1, h = hashes[n];
  let cnt = 0, first = -1;
  for (let i = n; i >= Math.max(0, n - pos.quiet); i--) if (hashes[i] === h) { cnt++; first = i; if (cnt >= 3) break; }
  if (cnt >= 3 && moves) {
    // moves first+1 .. n (move j leads from position j-1 to j)
    const r = replay(start, moves.slice(0, first)), p = r.pos, chk = [0, 0], chase = [0, 0], cnt2 = [0, 0];
    for (let j = first; j < n; j++) {
      const m = moves[j], c = p.side, gives = p.clone().play(m).inCheck();
      cnt2[c]++;
      if (gives) chk[c]++; else if (isChase(p, m)) chase[c]++;
      p.play(m);
    }
    const allChk = c => cnt2[c] > 0 && chk[c] === cnt2[c], forb = c => cnt2[c] > 0 && chk[c] + chase[c] === cnt2[c] && chase[c] > 0;
    if (allChk(0) && !allChk(1)) return { over: true, winner: P2, why: 'pcheck' };
    if (allChk(1) && !allChk(0)) return { over: true, winner: P1, why: 'pcheck' };
    if (!allChk(0) && !allChk(1)) {
      if (forb(0) && !forb(1)) return { over: true, winner: P2, why: 'pchase' };
      if (forb(1) && !forb(0)) return { over: true, winner: P1, why: 'pchase' };
    }
    return { over: true, winner: 0, draw: true, why: 'rep' };
  }
  if (pos.quiet >= DRAW_PLIES) return { over: true, winner: 0, draw: true, why: 'sixty' };
  return { over: false };
}
// moves of the side to move that would end the game at once as its loss by the repetition rules
function losingRepMoves(start, moves, pos, hashes) {
  const out = [];
  for (const m of pos.moves()) {
    const q = pos.clone().play(m), k = q.key; let c = 0;
    for (let i = hashes.length - 1; i >= Math.max(0, hashes.length - 1 - pos.quiet - 1); i--) if (hashes[i] === k) c++;
    if (c < 2 || pos.isCapture(m)) continue;
    const st = judge(q, hashes.concat([k]), start, moves.concat([m]));
    if (st.over && st.winner && st.winner !== pos.turn) out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------- AI levels (20 steps: 15級 … 1級, 初段 … 五段)
// values: fixed-depth values of all moves + gaussian noise (points) / an occasional random move (weak levels);
// search: normal best-move search by nodes (k) or time (ms). Mirrored in tools/native.c (initLevels) for the calibration matches.
const LEVELS = [null,
  { d: 1, noise: 300, blunder: 0.38 },    // 15級
  { d: 1, noise: 230, blunder: 0.28 },    // 14級
  { d: 1.3, noise: 200, blunder: 0.22 },  // 13級  (d: depth; a fraction = the chance of searching one ply deeper)
  { d: 1.7, noise: 170, blunder: 0.16 },  // 12級
  { d: 2.1, noise: 135, blunder: 0.11 },  // 11級
  { d: 2.5, noise: 100, blunder: 0.075 }, // 10級
  { d: 2.8, noise: 80, blunder: 0.055 },  // 9級
  { d: 3, noise: 60, blunder: 0.04 },     // 8級
  { d: 3, noise: 42, blunder: 0.022 },    // 7級
  { d: 3.5, noise: 35, blunder: 0.015 },  // 6級
  { d: 4, noise: 30, blunder: 0.012 },    // 5級
  { d: 4, noise: 20 },                    // 4級
  { s: 1, nk: 10 },                       // 3級  (about 10,000 positions per move)
  { s: 1, nk: 25 },                       // 2級
  { s: 1, nk: 60 },                       // 1級
  { s: 1, nk: 150 },                      // 初段
  { s: 1, nk: 400 },                      // 二段
  { s: 1, nk: 1000 },                     // 三段
  { s: 1, nk: 2500, book: 1 },            // 四段
  { s: 1, nk: 6000, ms: 8000, book: 1 },  // 五段  (6 million positions, at most 8 s)
];
function gauss(rand) { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ---------------------------------------------------------------- tiny JS search (fallback when WebAssembly is not available)
const JV = [0, 0, 120, 120, 400, 900, 450, 80];
function jsEval(p) { let v = 0; for (let s = 0; s < 90; s++) { const x = p.b[s]; if (!x) continue; const c = colorOf(x), t = typeOf(x); let a = JV[t]; if (t === PAWN && (c ? s >= 45 : s < 45)) a += 80; v += c === p.side ? a : -a; } return v; }
function jsSearch(p, d, a, b, ply, tEnd) {
  const L = p.moves();
  if (!L.length) return -(WIN - ply);
  if (d <= 0 || Date.now() > tEnd) return jsEval(p);
  L.sort((x, y) => (p.b[mTo(y)] ? JV[typeOf(p.b[mTo(y)])] : 0) - (p.b[mTo(x)] ? JV[typeOf(p.b[mTo(x)])] : 0));
  let best = -Infinity;
  for (const m of L) { const v = -jsSearch(p.clone().play(m), d - 1, -b, -a, ply + 1, tEnd); if (v > best) { best = v; if (v > a) { a = v; if (a >= b) break; } } }
  return best;
}
function jsValues(p, depth, ms) { const tEnd = Date.now() + (ms || 2000); return p.moves().map(m => ({ m, v: -jsSearch(p.clone().play(m), depth - 1, -Infinity, Infinity, 1, tEnd) })).sort((a, b) => b.v - a.v); }

// ---------------------------------------------------------------- WebAssembly side
let WX = null;
const wIO = () => new Int32Array(WX.memory.buffer, WX.io_ptr(), 8192);
const toC = m => mFrom(m) | (mTo(m) << 7), fromC = x => mv(x & 127, (x >> 7) & 127);
function wSetup(start, moves, excl) {
  const p = Pos.from(start), a = Array.from(p.b); a.push(p.side, moves.length);
  for (const m of moves) a.push(toC(m));
  a.push((excl || []).length); for (const m of excl || []) a.push(toC(m));
  wIO().set(a); return WX.setup();
}
function wList() { const r = wIO(), L = []; for (let i = 0; i < r[0]; i++) L.push({ m: fromC(r[2 + 2 * i]), v: r[3 + 2 * i] }); return L; }
const kindOf = v => Math.abs(v) > WINT ? 'exact' : 'heur';

function think(start, moves, level, rand) {
  rand = rand || Math.random;
  const L = LEVELS[level] || LEVELS[10];
  const { pos, hashes } = replay(start, moves);
  const all = pos.moves();
  if (!all.length) return { move: -1 };
  if (all.length === 1) return { move: all[0] };
  const excl = losingRepMoves(start, moves, pos, hashes);
  if (!WX) {
    const vals = jsValues(pos, Math.min(Math.round(L.d || 3), 3), 1500).filter(e => !excl.includes(e.m) || excl.length === all.length);
    if (L.blunder && rand() < L.blunder) return { move: vals[Math.floor(rand() * vals.length)].m };
    let best = vals[0].m, bv = -Infinity; for (const e of vals) { const x = e.v + gauss(rand) * (L.noise || 0); if (x > bv) { bv = x; best = e.m; } } return { move: best, v: vals[0].v };
  }
  if (!wSetup(start, moves, excl)) return { move: all[0] };
  if (!L.s) {
    WX.values(Math.floor(L.d) + (rand() < L.d % 1 ? 1 : 0));
    const vals = wList();
    if (L.blunder && rand() < L.blunder) {   // a slip: a random move among the not-hopeless ones
      const ok = vals.filter(e => e.v > vals[0].v - 400 && e.v > -WINT); const pool = ok.length > 1 ? ok : vals;
      return { move: pool[Math.floor(rand() * pool.length)].m, v: vals[0].v };
    }
    let best = vals[0].m, bv = -Infinity;
    for (const e of vals) { const x = e.v + (Math.abs(e.v) > WINT - 1000 ? 0 : gauss(rand) * L.noise); if (x > bv) { bv = x; best = e.m; } }
    return { move: best, v: vals[0].v };
  }
  // opening variety for the top levels: in the first plies pick among moves within a few points of the best
  if (L.book && moves.length < 10 && !start) {
    WX.analyze(Math.max(800, (L.ms || 1000) * 0.4), 40);
    const vals = wList(), good = vals.filter(e => e.v >= vals[0].v - 12);
    return { move: good[Math.floor(rand() * good.length)].m, v: vals[0].v };
  }
  WX.best(99, L.ms || 0, L.nk || 0);
  const r = wIO();
  if (r[0] < 0) return { move: all[0] };
  return { move: fromC(r[0]), v: r[1], depth: r[2] };
}
function analyze(start, moves, ms, onProgress) {
  const { pos, hashes } = replay(start, moves);
  if (!WX) { const L = jsValues(pos, 3, ms).map(e => ({ ...e, kind: kindOf(e.v) })); return { list: L, depth: 3 }; }
  if (!wSetup(start, moves, [])) return { list: [], depth: 0 };
  void hashes;
  progressCb = onProgress ? (d => onProgress(wList().map(e => ({ ...e, kind: kindOf(e.v) })), d)) : null;
  WX.analyze(ms, 60); progressCb = null;
  return { list: wList().map(e => ({ ...e, kind: kindOf(e.v) })), depth: wIO()[1] };
}
// puzzles: mate within n own moves (checks: every attacking move must give check). See engine.c puzzle().
function puzzle(start, moves, n, defend, checks) {
  if (!WX) return null;
  if (!wSetup(start, moves, [])) return null;
  WX.mate_clear();
  WX.puzzle(n, defend ? 1 : 0, checks ? 1 : 0, 4000);
  const r = wIO(), out = [];
  for (let i = 0; i < r[0]; i++) out.push({ m: fromC(r[1 + 2 * i]), need: r[2 + 2 * i] });
  return out;
}
let progressCb = null;

const API = { P1, P2, WIN, WINT, DRAW_PLIES, KING, ADVISOR, ELEPHANT, HORSE, ROOK, CANNON, PAWN, START, RC, sqAt, colorOf, typeOf, mv, mFrom, mTo, Pos, name, parse, sqName, replay, judge, isChase, threats, losingRepMoves, LEVELS, think, analyze, puzzle, kindOf, NMOV, RAYS, setWasm: x => { WX = x; }, toC, fromC };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else if (typeof window !== 'undefined') window.XiangqiEngine = API;
else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
  const V = 'v=20261025a';
  let readyP = null;
  if (typeof WebAssembly === 'object' && typeof fetch === 'function') {
    const imp = { env: { now: () => Date.now(), progress: d => { if (progressCb) progressCb(d); } } };
    const url = new URL('engine.wasm?' + V, self.location.href);
    readyP = (WebAssembly.instantiateStreaming ? WebAssembly.instantiateStreaming(fetch(url), imp).catch(() => fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp))) : fetch(url).then(r => r.arrayBuffer()).then(b => WebAssembly.instantiate(b, imp)))
      .then(r => { WX = r.instance.exports; }).catch(() => { WX = null; });
  }
  let queue = Promise.resolve();
  self.onmessage = e => {
    const m = e.data;
    queue = queue.then(() => readyP).catch(() => {}).then(() => {
      try {
        if (m.type === 'think') self.postMessage({ id: m.id, type: 'result', ...think(m.start, m.moves, m.level) });
        else if (m.type === 'analyze') {
          const r = analyze(m.start, m.moves, m.time || 1000, (list, depth) => self.postMessage({ id: m.id, type: 'progress', list, depth }));
          self.postMessage({ id: m.id, type: 'result', ...r });
        } else if (m.type === 'puzzle') self.postMessage({ id: m.id, type: 'result', list: puzzle(m.start, m.moves, m.n, m.defend, m.checks) });
        else if (m.type === 'newgame') { if (WX) WX.new_game(); self.postMessage({ id: m.id, type: 'result' }); }
      } catch (err) { self.postMessage({ id: m.id, type: 'result', error: String(err && err.stack || err) }); }
    });
  };
}
})();
