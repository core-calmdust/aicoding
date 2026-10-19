// Cross-check the pattern tables and the VCF solver against brute force on random positions.
'use strict';
const E = require('../engine.js');
const N = 15;
let seed = 12345; const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
function grid(pos) { const g = []; for (let m = 0; m < 225; m++) g.push(pos.at(m)); return g; }
const at = (g, c, r) => (c < 0 || r < 0 || c >= N || r >= N) ? 3 : g[r * N + c];
const DIR = [[1, 0], [0, 1], [1, 1], [-1, 1]];
function runAt(g, m, dx, dy, col) { const c0 = m % N, r0 = (m / N) | 0; let n = 1; let c = c0 + dx, r = r0 + dy; while (at(g, c, r) === col) { n++; c += dx; r += dy; } c = c0 - dx; r = r0 - dy; while (at(g, c, r) === col) { n++; c -= dx; r -= dy; } return n; }
const isFive = (len, exact) => exact ? len === 5 : len >= 5;
// brute-force: with col on m (already placed), the five-completion points in direction k
function compl(g, m, k, col, exact) {
  const [dx, dy] = DIR[k], c0 = m % N, r0 = (m / N) | 0, out = [];
  for (let s = -4; s <= 4; s++) { if (!s) continue; const c = c0 + s * dx, r = r0 + s * dy; if (at(g, c, r) !== 0) continue; const q = r * N + c; g[q] = col; if (isFive(runAt(g, m, dx, dy, col), exact)) out.push(q); g[q] = 0; }
  return out;
}
function bruteClass(g, m, col, exact) {
  g[m] = col;
  let five = false, f4 = false, n4 = 0;
  for (let k = 0; k < 4; k++) {
    if (isFive(runAt(g, m, DIR[k][0], DIR[k][1], col), exact)) five = true;
    const C = compl(g, m, k, col, exact);
    if (C.length >= 2) {
      const [dx, dy] = DIR[k];
      const a = C[0], b = C[1];
      const ac = a % N, ar = (a / N) | 0, bc = b % N, br = (b / N) | 0;
      let straight = C.length === 2 && Math.max(Math.abs(bc - ac), Math.abs(br - ar)) === 5;
      if (straight) for (let s = 1; s < 5; s++) if (at(g, ac + s * dx * Math.sign(bc - ac || dx), ar + s * dy * Math.sign(br - ar || dy)) !== col) straight = false;
      if (straight) { f4 = true; n4++; } else n4 += 2;
    } else if (C.length === 1) n4++;
  }
  g[m] = 0;
  return five ? 'five' : (f4 || n4 >= 2) ? 'f4' : n4 === 1 ? 'b4' : 'none';
}
let bad = 0, checked = 0;
for (const rule of ['renju', 'standard', 'free']) {
  for (let t = 0; t < 300; t++) {
    const pos = new E.Pos(rule); pos.fresh = false;
    const n = 8 + Math.floor(rnd() * 40);
    for (let k = 0; k < n; k++) {
      const m = Math.floor(rnd() * 225); if (pos.at(m)) continue;
      pos.side = rnd() < 0.5 ? 1 : 2; pos.make(m);
    }
    // random unmake / remake to exercise incremental updates
    for (let k = 0; k < 5 && pos.ply; k++) pos.unmake();
    const g = grid(pos);
    for (let m = 0; m < 225; m++) {
      if (g[m]) continue;
      for (const col of [1, 2]) {
        const exact = col === 1 ? rule !== 'free' : rule === 'standard';
        const want = bruteClass(g, m, col, exact);
        const k = pos.cls[col][E.M2I[m]];
        let got = k === E.C.FIVE ? 'five' : k === E.C.F4 ? 'f4' : (k === E.C.B4 || k === E.C.F43) ? 'b4' : 'none';
        // renju black: table marks overline / 4-4 cells as forbidden (class none)
        if (rule === 'renju' && col === 1 && pos.fb[E.M2I[m]] === 1) got = want === 'f4' || want === 'none' ? want : got;
        checked++;
        if (got !== want) { if (bad < 10) console.log('mismatch', rule, col, E.sqName(m), 'want', want, 'got', got, k); bad++; }
      }
    }
  }
}
console.log('pattern check:', checked, 'cells,', bad, 'mismatches');

// brute VCF
function legal(pos, m, col) { if (pos.at(m)) return false; if (col === 1 && pos.renju) return !E.exactForbid(pos.b, E.M2I[m]); return true; }
function bruteVcf(pos, depth) {
  const col = pos.side, op = 3 - col, g = grid(pos), exact = col === 1 ? pos.rule !== 'free' : pos.rule === 'standard', oexact = op === 1 ? pos.rule !== 'free' : pos.rule === 'standard';
  for (let m = 0; m < 225; m++) if (!g[m] && bruteClass(g, m, col, exact) === 'five') return true;
  if (depth <= 0) return false;
  const oppFive = []; for (let m = 0; m < 225; m++) if (!g[m] && bruteClass(g, m, op, oexact) === 'five') oppFive.push(m);
  if (oppFive.length >= 2) return false;
  for (let m = 0; m < 225; m++) {
    if (g[m]) continue;
    if (oppFive.length && m !== oppFive[0]) continue;
    const bc = bruteClass(g, m, col, exact);
    if (bc !== 'b4' && bc !== 'f4') continue;
    if (!legal(pos, m, col)) continue;
    pos.make(m);
    const g2 = grid(pos), F = []; for (let q = 0; q < 225; q++) if (!g2[q] && bruteClass(g2, q, col, exact) === 'five') F.push(q);
    let win = false;
    if (F.length >= 2) win = true;
    else if (F.length === 1) {
      let ofive = false; for (let q = 0; q < 225; q++) if (!g2[q] && bruteClass(g2, q, op, oexact) === 'five') ofive = true;
      if (!ofive) {
        if (!legal(pos, F[0], op)) win = true;
        else { pos.make(F[0]); win = bruteVcf(pos, depth - 1); pos.unmake(); }
      }
    }
    pos.unmake();
    if (win) return true;
  }
  return false;
}
let vb = 0, vn = 0, found = 0;
for (let t = 0; t < 400; t++) {
  const rule = ['renju', 'standard', 'free'][t % 3];
  const pos = new E.Pos(rule); pos.fresh = false;
  const n = 14 + Math.floor(rnd() * 20);
  for (let k = 0; k < n; k++) {
    const r = 4 + Math.floor(rnd() * 7), c = 4 + Math.floor(rnd() * 7), m = r * 15 + c;
    if (pos.at(m)) continue; pos.side = k & 1 ? 2 : 1; if (pos.side === 1 && pos.forbidden(m)) continue; pos.make(m);
  }
  if (pos.status().over) continue;
  pos.side = 1 + (t & 1);
  if (E.Pos.prototype.lastFive.call(pos)) continue;
  const S = new E.Solver();
  const a = S.vcf(pos, 4, null) >= 0, b = bruteVcf(pos, 4);
  vn++; if (b) found++;
  if (a !== b) { vb++; if (vb < 6) console.log('vcf mismatch', rule, 'side', pos.side, pos.moves().map(E.sqName).join(' '), 'solver', a, 'brute', b); }
}
console.log('vcf check:', vn, 'positions,', found, 'wins,', vb, 'mismatches');
process.exit(bad || vb ? 1 : 0);
