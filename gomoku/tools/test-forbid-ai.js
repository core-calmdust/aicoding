// The AI as Black (renju) must never play a forbidden point (3-3 / 4-4 / overline), also when it is lost.
// node tools/test-forbid-ai.js [games=40] [seed]
// 1) self-play games over all 20 levels (black AI vs white AI, random 珠型), every black move checked
// 2) constructed lost positions: White has a four whose only blocking point is forbidden for Black,
//    or an open three whose straight-four points are forbidden — the "natural" defence is illegal
'use strict';
const E = require('../engine.js');
const fs = require('fs'), zlib = require('zlib'), path = require('path');
try {   // the renju net (as in the browser worker)
  const d = path.join(__dirname, '..');
  E.setNN('renju', fs.readFileSync(path.join(d, 'nn48.wasm')), zlib.gunzipSync(fs.readFileSync(path.join(d, 'nn_renju.bin.gz'))));
} catch (e) { console.log('(no NN: ' + e.message + ')'); }
const G = +process.argv[2] || 40;
let seed = (+process.argv[3] || 12345) >>> 0;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
for (const L of E.LEVELS) if (L) { if (L.ms) L.ms = Math.min(L.ms, 120); if (L.nodes) L.nodes = Math.min(L.nodes, 20000); if (L.vctNodes) L.vctNodes = 60000; }
let fails = 0, checked = 0, lostChecked = 0, resisted = 0;
const fail = (msg) => { fails++; console.log('FAIL', msg); };
function check(rule, moves, start, lv, tag) {
  const pos = E.replay(rule, moves, start);
  const r = E.think(rule, moves, lv, start, rnd);
  checked++;
  if (r.move < 0) { if (pos.legal().length) fail(tag + ' lv' + lv + ': no move although legal moves exist'); return r; }
  if (!pos.isLegal(r.move)) fail(tag + ' lv' + lv + ': illegal ' + E.sqName(r.move) + (pos.forbidden(r.move) ? ' (forbidden ' + pos.forbidden(r.move) + ')' : ''));
  return r;
}
// 1) self-play
for (let g = 0; g < G; g++) {
  const lb = 1 + (g % 20), lw = 1 + ((g * 7 + 3) % 20);
  const pos = new E.Pos('renju'), moves = [];
  moves.push(E.CENTER); pos.make(E.CENTER);
  for (let k = 0; k < 2; k++) { const lg = pos.legal(), m = lg[Math.floor(rnd() * lg.length)]; moves.push(m); pos.make(m); }
  while (!pos.status().over && pos.ply < 160) {
    if (pos.side === 1 && !pos.legal().length) break;
    const r = pos.side === 1 ? check('renju', moves, null, lb, 'game' + g) : E.think('renju', moves, lw, null, rnd);
    if (r.move < 0 || !pos.isLegal(r.move)) break;
    moves.push(r.move); pos.make(r.move);
  }
  process.stdout.write('.');
}
console.log('\nself-play: ' + checked + ' black moves checked');
// 2) constructed positions from random middle-games
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const inB = (c, r) => c >= 0 && c < 15 && r >= 0 && r < 15;
function stonesOf(pos) { const b = [], w = []; for (let m = 0; m < 225; m++) { const x = pos.at(m); if (x === 1) b.push(m); else if (x === 2) w.push(m); } return { b, w }; }
function build() {
  // random-ish middle game (weak levels), stop at a black turn with a forbidden point
  const pos = new E.Pos('renju'), moves = [E.CENTER]; pos.make(E.CENTER);
  for (let k = 0; k < 2; k++) { const lg = pos.legal(), m = lg[Math.floor(rnd() * lg.length)]; moves.push(m); pos.make(m); }
  for (let n = 0; n < 60 && !pos.status().over; n++) {
    if (pos.side === 1 && pos.forbiddenList().length && rnd() < 0.5) break;
    const r = E.think('renju', moves, 1 + Math.floor(rnd() * 3), null, rnd);
    if (r.move < 0 || !pos.isLegal(r.move)) return null;
    moves.push(r.move); pos.make(r.move);
  }
  if (pos.status().over || pos.side !== 1) return null;
  const fl = pos.forbiddenList(); if (!fl.length) return null;
  const X = fl[Math.floor(rnd() * fl.length)].m, xc = X % 15, xr = (X / 15) | 0;
  const st = stonesOf(pos), kind = rnd() < 0.6 ? 4 : 3;
  // add white stones in a line through X: a four needing X, or an open three whose four points are X (and another forbidden point)
  for (const [dc, dr] of DIRS.sort(() => rnd() - 0.5)) for (let off = -4; off <= 0; off++) {
    const cells = []; let ok = true;
    for (let k = 0; k < 5; k++) { const c = xc + (off + k) * dc, r = xr + (off + k) * dr; if (!inB(c, r)) { ok = false; break; } cells.push(r * 15 + c); }
    if (!ok) continue;
    const others = cells.filter(m => m !== X);
    if (others.some(m => pos.at(m) === 1)) continue;
    const add = others.filter(m => !pos.at(m));
    const wAdd = kind === 4 ? add : add.slice(0, add.length);   // kind 3: drop one stone later
    let ws = st.w.concat(wAdd);
    if (kind === 3) { if (!wAdd.length) continue; ws = st.w.concat(wAdd.slice(0, -1)); }
    const start = { b: st.b, w: ws, side: 1 };
    let p2; try { p2 = E.setup('renju', start); } catch (e) { continue; }
    if (p2.status().over || p2.lastFive() || p2.fives(1).length || !p2.legal().length) continue;
    if (!p2.forbidden(X)) continue;
    if (kind === 4) { const f = p2.fives(2); if (f.length !== 1 || E.I2M[f[0]] !== X) continue; }
    else { if (p2.fives(2).length) continue; const t = p2.threatCells(2).filter(x => x.k === E.C.F4); if (!t.length || t.some(x => !p2.forbidden(x.m))) continue; }
    return { start, X, kind };
  }
  return null;
}
let built = 0;
for (let tries = 0; built < Math.max(12, G) && tries < 3000; tries++) {
  const c = build(); if (!c) continue;
  built++;
  for (const lv of [1, 3, 5, 8, 10, 13, 16, 20]) {
    const r = check('renju', [], c.start, lv, 'lost' + c.kind + '@' + E.sqName(c.X));
    lostChecked++;
    // natural resistance: with a forbidden four-point the AI should at least make its own four (if it has one) or block what it can
    const p = E.setup('renju', c.start);
    if (r.move >= 0 && c.kind === 4) { const own4 = p.threatCells(1).some(x => (x.k === E.C.B4 || x.k === E.C.F43 || x.k === E.C.F4) && !p.forbidden(x.m)); const k = p.cls[1][E.M2I[r.move]]; if (!own4 || k === E.C.B4 || k === E.C.F43 || k === E.C.F4 || k === E.C.FIVE) resisted++; }
  }
  process.stdout.write('+');
}
// 3) a hand-made case: black's only block of White's four is a 3-3 point
{
  // black h8 i9 (diag) + h10 j8 -> i9-? ... use the diagram from test-engine (4-3-3 point A) and give White a four through A
  const fromRows = (rows, ox, oy) => { const b = [], w = [], pts = {}; rows.forEach((row, r) => [...row].forEach((ch, c) => { const m = (14 - (r + oy)) * 15 + (c + ox); if (ch === '●') b.push(m); else if (ch === '○') w.push(m); else if (/[A-Z]/.test(ch)) pts[ch] = m; })); return { b, w, pts }; };
  const { b, w, pts } = fromRows(['.......', '...●●A.', '....●●.', '...●.●.', '..●..B.', '.○.....', '.......'], 4, 4);
  // White four through A vertically (A is at row 1 col 5 of the diagram): stones above and below
  const A = pts.A, ac = A % 15, ar = (A / 15) | 0; let start = null, p = null;
  for (const [dc, dr] of DIRS) for (let off = -4; off <= 0 && !start; off++) {   // a white four through A on empty cells
    const cs = []; for (let k = 0; k < 5; k++) { const c = ac + (off + k) * dc, r = ar + (off + k) * dr; if (inB(c, r)) cs.push(r * 15 + c); }
    if (cs.length < 5 || cs.some(m => m !== A && (b.includes(m) || w.includes(m)))) continue;
    const s = { b, w: w.concat(cs.filter(m => m !== A)), side: 1 }, q = E.setup('renju', s);
    if (q.forbidden(A) && q.fives(2).length === 1 && E.I2M[q.fives(2)[0]] === A) { start = s; p = q; }
  }
  if (!start) fail('hand-made position not built');
  console.log('\nhand-made: A forbidden=' + p.forbidden(A) + ' white fives=' + p.fives(2).map(i => E.sqName(E.I2M[i])).join(','));
  if (start) for (let lv = 1; lv <= 20; lv++) check('renju', [], start, lv, 'hand');
}
console.log('constructed lost positions: ' + built + ' (' + lostChecked + ' AI moves), resisted(own four when available) ' + resisted);
console.log('total AI moves checked: ' + checked);
console.log(fails ? fails + ' FAILED' : 'all ok');
process.exit(fails ? 1 : 0);
