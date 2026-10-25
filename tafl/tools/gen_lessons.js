// Builds tafl/lessons.json: 16 steps × 5 problems (+ one example diagram per step).
// Positions are synthesized at random (or taken from engine self-play for the strategy steps, tools/native.c selfplay)
// and every problem is checked with the rules (engine.js) and the WebAssembly engine (exact puzzle search / analysis).
// node tools/gen_lessons.js [selfplay-positions.txt]
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
const P1 = 1, P2 = 2;
let seed = 20261025; const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % n; };
function setup(sp) { const p = E.Pos.from(sp), a = [E.VID[p.v], p.turn === 2 ? 1 : 0]; for (const x of p.b) a.push(x); a.push(0); io().set(a); return X.setup(); }
function pzNeed(sp, n, defend) { setup(sp); X.puzzle(n, defend ? 1 : 0, 3000); const r = io(), out = new Map(); for (let i = 0; i < r[0]; i++) { const x = r[1 + 2 * i]; out.set((x & 255) + 256 * ((x >> 8) & 255), r[2 + 2 * i]); } return out; }
function analyze(sp, ms) { setup(sp); X.analyze(ms, 30); const r = io(), out = []; for (let i = 0; i < r[0]; i++) { const x = r[2 + 2 * i]; out.push([(x & 255) + 256 * ((x >> 8) & 255), r[3 + 2 * i]]); } return out; }
const N = v => E.RULES[v].n;
const F = v => E.geo(v).F;
// a random sparse position
function randPos(v, na, nd, side, o) {
  o = o || {}; const n = N(v), f = F(v), b = Array(n * n).fill('.');
  const free = () => { for (let t = 0; t < 400; t++) { const i = rnd(n * n); if (b[i] === '.' && !(f[i] & 16)) return i; } return -1; };
  let k = o.king != null ? o.king : -1;
  if (k < 0) for (let t = 0; t < 200; t++) { const i = rnd(n * n); if (f[i] & 8) continue; if (o.kingInterior && (f[i] & 1)) continue; if (o.kingEdge && !(f[i] & 1)) continue; k = i; break; }
  b[k] = 'k';
  for (const [i, ch] of o.fixed || []) b[i] = ch;
  for (let i = 0; i < na; i++) { const q = free(); if (q >= 0) b[q] = 'a'; }
  for (let i = 0; i < nd; i++) { const q = free(); if (q >= 0) b[q] = 'd'; }
  return { v, b: b.join(''), side };
}
const pos = sp => E.Pos.from(sp);
const okBasic = sp => { const p = pos(sp); if (p.res || !p.moves().length) return false; const q = p.clone(); q.turn = 3 - q.turn; return q.moves().length > 0; };
const after = (sp, m) => pos(sp).play(m);
const kingLinesAfter = (sp, m) => after(sp, m).kingLines().length;
const oppCanWinNext = q => !q.res && q.moves().some(x => { const r = q.clone().play(x); return !!r.res; });
const capsSet = (p, side) => { const q = p.clone(); q.turn = side === P1 ? P2 : P1; q.res = 0; const s = new Set(); for (const m of q.moves()) for (const i of q.capsOf(m)) s.add(i); return s; };
// ------------------------------------------------------------------------------------------------ steps
const used = new Set();
function make(id, course, v, gen, check, opts) {
  opts = opts || {};
  const out = []; let tries = 0;
  while (out.length < 6 && tries < (opts.tries || 200000)) {
    tries++;
    const sp = gen(); if (!sp || !okBasic(sp) || used.has(sp.b + sp.side)) continue;
    const r = check(sp); if (!r) continue;
    used.add(sp.b + sp.side); out.push(Object.assign({ s: sp }, r));
  }
  if (out.length < 6) console.error('!! step', id, 'only', out.length, 'after', tries);
  else console.error('step', id, 'ok after', tries);
  const ex = out.shift();
  const step = { id, course, v, problems: out };
  if (ex) { const m = ex.best; step.diagram = { s: ex.s, arrows: [[E.sqName(m % 256, N(v)), E.sqName(Math.floor(m / 256), N(v))]], marks: ex.marks || [] }; }
  return step;
}
// problems with a list of correct moves: ok must be a proper, small subset of the legal moves
const okList = (sp, pred, maxOk) => { const p = pos(sp), L = p.moves(), ok = L.filter(m => pred(p, m)); if (!ok.length || ok.length > (maxOk || 3) || ok.length >= L.length) return null; return { ok, best: ok[0] }; };
const C = 'copenhagen', B = 'brandubh', T = 'tablut';
const steps = [];
// 1. moving: the king slides to the edge in one move (no escape yet)
steps.push(make('b_move', 'basics', C, () => randPos(C, 6 + rnd(6), 1 + rnd(3), P2, { kingInterior: true }), sp => {
  const p = pos(sp); if (p.kingLines().length) return null;
  const r = okList(sp, (p, m) => p.at(m % 256) === 3 && (F(C)[Math.floor(m / 256)] & 1) && !(F(C)[Math.floor(m / 256)] & 8), 2);
  if (!r) return null;
  if (r.ok.some(m => after(sp, m).kingLines().length === 0 && false)) return null;
  return r;
}));
// 2. capture by sandwiching (both sides)
steps.push(make('b_cap', 'basics', C, () => randPos(C, 5 + rnd(6), 2 + rnd(4), rnd(2) ? P1 : P2, {}), sp => {
  const p = pos(sp); if (p.kingLines().length && p.turn === P2) return null;
  const r = okList(sp, (p, m) => { const q = p.clone().play(m); return q.lastCaps.length > 0 && !q.res; }, 2);
  if (!r) return null;
  // a capture next to a corner / the throne belongs to the next step
  if (r.ok.some(m => pos(sp).capsOf(m).some(i => E.geo(C).F[i] & 0) )) return null;
  return r;
}));
// 3. corners and the empty throne are hostile
const nearRestr = (v, i) => { const n = N(v), f = F(v), r = Math.floor(i / n), c = i % n; return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && (f[a * n + b] & 6)); };
steps.push(make('b_hostile', 'basics', C, () => {
  const n = 11, corner = [0, 10, 110, 120][rnd(4)], th = 60, useThrone = rnd(3) === 0;
  const sp = randPos(C, 3 + rnd(5), 2 + rnd(3), useThrone ? P1 : rnd(2) ? P1 : P2, { kingInterior: true });
  const b = sp.b.split(''), tgt = useThrone ? th : corner, rr = Math.floor(tgt / n), cc = tgt % n;
  const nb = [[rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]].filter(([a, c]) => a >= 0 && c >= 0 && a < n && c < n);
  const [a, c] = nb[rnd(nb.length)]; if (b[a * n + c] !== '.') return null;
  b[a * n + c] = sp.side === P1 ? 'd' : 'a';
  if (useThrone) { const ki = b.indexOf('k'); if (ki === th) return null; }
  sp.b = b.join(''); return sp;
}, sp => {
  const p = pos(sp);
  const r = okList(sp, (p, m) => { const q = p.clone().play(m); return !q.res && q.lastCaps.length > 0 && q.lastCaps.every(i => nearRestr(C, i)) && q.lastCaps.some(i => { const t = Math.floor(m / 256), n = 11, d = i - t, far = i + d; return far >= 0 && far < 121 && (E.geo(C).F[far] & 6) && p.at(far) === 0; }); }, 2);
  if (!r) return null;
  // no ordinary captures elsewhere
  if (p.moves().some(m => { const q = p.clone().play(m); return q.lastCaps.length && !r.ok.includes(m); })) return null;
  return r;
}));
// 4. the king escapes to a corner in one move
steps.push(make('b_escape', 'basics', C, () => randPos(C, 7 + rnd(6), 1 + rnd(4), P2, { kingEdge: true }), sp => {
  const r = okList(sp, (p, m) => p.clone().play(m).res === P2, 1); if (!r) return null;
  const p = pos(sp); if (p.moves().filter(m => p.at(m % 256) === 3).length < 4) return null;
  return r;
}));
// 5. capture the king (four sides, or three and the throne)
steps.push(make('b_kingcap', 'basics', C, () => {
  const n = 11, f = F(C); let k = -1;
  for (let t = 0; t < 50; t++) { const i = rnd(121); if (f[i] & 1 || f[i] & 16) continue; k = i; break; }
  if (rnd(3) === 0) k = [49, 59, 61, 71][rnd(4)];
  const fixed = []; const nbs = [k - n, k + n, k - 1, k + 1].filter(q => q !== 60); nbs.sort(() => rnd(3) - 1);
  for (let i = 0; i < nbs.length - 1; i++) fixed.push([nbs[i], 'a']);
  return randPos(C, 3 + rnd(5), 1 + rnd(3), P1, { king: k, fixed });
}, sp => okList(sp, (p, m) => p.clone().play(m).res === P1, 1)));
// 6. a safe move: do not let the opponent capture one of your pieces
steps.push(make('b_safe', 'basics', C, () => randPos(C, 5 + rnd(5), 3 + rnd(3), rnd(2) ? P1 : P2, { kingInterior: true }), sp => {
  const p = pos(sp); if (p.kingLines().length) return null;
  const me = p.turn, L = p.moves();
  if (capsSet(p, me).size === 0) return null;   // something of mine is attacked now
  const good = L.filter(m => { const q = p.clone().play(m); return !q.res && capsSet(q, me).size === 0 && !oppCanWinNext(q) && q.lastCaps.length === 0; });
  if (!good.length || good.length > 6 || good.length > L.length / 4) return null;
  return { ok: good, best: good[0] };
}));
// 7. shieldwall
steps.push(make('t_shield', 'tactics', C, () => {
  const n = 11, side = rnd(4), len = 2 + rnd(2), start = 1 + rnd(n - len - 2);
  const at = (i, j) => side === 0 ? [0, i] : side === 1 ? [n - 1, i] : side === 2 ? [i, 0] : [i, n - 1];
  const inn = (i, j) => side === 0 ? [1, i] : side === 1 ? [n - 2, i] : side === 2 ? [i, 1] : [i, n - 2];
  const fixed = [], idx = (r, c) => r * n + c;
  for (let k = 0; k < len; k++) { const [r, c] = at(start + k); fixed.push([idx(r, c), 'd']); const [r2, c2] = inn(start + k); fixed.push([idx(r2, c2), 'a']); }
  const lo = start - 1, hi = start + len; const useLo = rnd(2);
  const [br, bc] = at(useLo ? lo : hi); if (br >= 0 && bc >= 0 && !(F(C)[idx(br, bc)] & 2)) fixed.push([idx(br, bc), 'a']);
  return randPos(C, 3 + rnd(5), 1 + rnd(3), P1, { kingInterior: true, fixed });
}, sp => {
  const r = okList(sp, (p, m) => { const q = p.clone().play(m); return !q.res && q.lastCaps.length >= 2; }, 2);
  return r;
}));
// 8. tuichi: two escape paths at once (escape in 2, exact)
steps.push(make('t_tuichi', 'tactics', C, () => randPos(C, 7 + rnd(7), 1 + rnd(4), P2, {}), sp => {
  const p = pos(sp); if (p.kingLines().length) return null;
  const need = pzNeed(sp, 2, false), ok = [...need].filter(([m, k]) => k === 2).map(x => x[0]);
  if (!ok.length || ok.length > 2 || !ok.every(m => p.at(m % 256) === 3 && after(sp, m).kingLines().length >= 2)) return null;
  return { ok, best: ok[0] };
}, { tries: 60000 }));
// 9. block the king's path (attackers): after the move the defenders cannot win within 2 moves
steps.push(make('t_block', 'tactics', C, () => randPos(C, 7 + rnd(7), 1 + rnd(4), P1, { kingEdge: rnd(2) === 0 }), sp => {
  const p = pos(sp); if (p.kingLines().length !== 1) return null;
  const need = pzNeed(sp, 2, true), ok = [...need].filter(([m, k]) => k === 0).map(x => x[0]);
  if (!ok.length || ok.length > 3) return null;
  return { ok, best: ok[0] };
}, { tries: 60000 }));
// 10. edge fort
steps.push(make('t_fort', 'tactics', C, () => {
  // a fort shape on a random edge: king on the edge, an empty square next to it, walls; one wall square left open for a defender to fill
  const n = 11, s = rnd(4), at = (i, j) => s === 0 ? [j, i] : s === 1 ? [n - 1 - j, i] : s === 2 ? [i, j] : [i, n - 1 - j];   // i along the edge, j inward
  const i0 = 3 + rnd(5), idx = ([r, c]) => r * n + c;
  const king = idx(at(i0, 0)), room = idx(at(i0 + 1, 0));
  const walls = [at(i0 - 1, 0), at(i0, 1), at(i0 + 1, 1), at(i0 + 2, 0)].map(idx);
  const open = walls[rnd(walls.length)];
  const fixed = [[room, '.']]; for (const w of walls) if (w !== open) fixed.push([w, 'd']);
  const sp = randPos(C, 5 + rnd(6), 1 + rnd(2), P2, { king, fixed });
  const b = sp.b.split(''); b[room] = '.'; b[open] = '.'; sp.b = b.join('');
  return sp;
}, sp => okList(sp, (p, m) => { const q = p.clone().play(m); return q.res === P2 && q.why === 'fort'; }, 2)));
// 11. encirclement
steps.push(make('t_encircle', 'tactics', C, () => {
  const n = 11, cr = 3 + rnd(5), cc = 3 + rnd(5), k = cr * n + cc;
  if (k === 60) return null;
  const ring = [[-2, 0], [-1, -1], [-1, 1], [0, -2], [0, 2], [1, -1], [1, 1], [2, 0]].map(([a, b]) => (cr + a) * n + cc + b);
  const def = [[-1, 0], [0, -1], [0, 1], [1, 0]].map(([a, b]) => (cr + a) * n + cc + b);
  const gap = ring[rnd(ring.length)];
  const fixed = []; for (const q of ring) if (q !== gap) fixed.push([q, 'a']); for (const q of def) if (rnd(4)) fixed.push([q, 'd']);
  if (fixed.some(([q]) => F(C)[q] & 16)) return null;
  return randPos(C, 2 + rnd(4), 0, P1, { king: k, fixed });
}, sp => okList(sp, (p, m) => { const q = p.clone().play(m); return q.res === P1 && q.why === 'encircle'; }, 2)));
// 12-13. strategy (scored by the engine) from self-play positions
const SP = process.argv[2] && fs.existsSync(process.argv[2]) ? fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean).map(l => l.split(' ')) : [];
const spPos = (vid, side, minPly, maxPly) => () => { if (!SP.length) return null; for (let t = 0; t < 50; t++) { const r = SP[rnd(SP.length)]; if (+r[0] !== vid || +r[2] !== side - 1 || +r[3] < minPly || +r[3] > maxPly) continue; return { v: E.VARIANTS[vid], b: r[1], side }; } return null; };
const block = new Set([2, 12, 22, 8, 20, 32, 88, 100, 112, 98, 108, 118]);   // the corner-blockade squares (Copenhagen)
function scored(sp, pred) {
  const p = pos(sp); if (p.kingLines().length) return null;
  const sc = analyze(sp, 1500); if (!sc.length) return null;
  sc.sort((a, b) => b[1] - a[1]);
  const best = sc[0], second = sc[1];
  if (Math.abs(best[1]) > 2500 || !second || best[1] - second[1] < 25 || !pred(p, best[0])) return null;
  const med = sc[Math.floor(sc.length / 2)][1]; if (best[1] - med < 120) return null;
  return { sc, best: best[0] };
}
steps.push(make('s_corner', 'strategy', C, spPos(0, P1, 6, 40), sp => scored(sp, (p, m) => block.has(Math.floor(m / 256)) && !p.capsOf(m).length), { tries: 4000 }));
steps.push(make('s_breakout', 'strategy', C, spPos(0, P2, 6, 50), sp => scored(sp, (p, m) => !p.capsOf(m).length && (p.at(m % 256) === 3 || p.clone().play(m).kingLines().length === 0)), { tries: 4000 }));
steps.push(make('s_squeeze', 'strategy', C, spPos(0, P1, 30, 120), sp => scored(sp, (p, m) => { const k = p.king, t = Math.floor(m / 256), n = 11; return Math.abs(Math.floor(t / n) - Math.floor(k / n)) + Math.abs(t % n - k % n) <= 3; }), { tries: 4000 }));
// 15. Brandubh: the king is captured by two
steps.push(make('v_brandubh', 'variants', B, () => {
  const n = 7, f = F(B); let k = -1; for (let t = 0; t < 50; t++) { const i = rnd(49); if (f[i] & 24) continue; if ([17, 23, 25, 31, 24].includes(i)) continue; k = i; break; }
  const nb = [k - n, k + n, k - 1, k + 1].filter(q => q >= 0 && q < 49 && Math.abs(q % n - k % n) <= 1); const fixed = [[nb[rnd(nb.length)], 'a']];
  return randPos(B, 2 + rnd(3), 1 + rnd(2), P1, { king: k, fixed });
}, sp => okList(sp, (p, m) => p.clone().play(m).res === P1, 2)));
// 16. Tablut: the king escapes on any edge
steps.push(make('v_tablut', 'variants', T, () => randPos(T, 6 + rnd(6), 1 + rnd(3), P2, { kingInterior: true }), sp => {
  const p = pos(sp); if (p.kingLines().length) return null;
  const need = pzNeed(sp, 2, false), ok = [...need].filter(([m, k]) => k === 2).map(x => x[0]);
  if (!ok.length || ok.length > 2) return null;
  return { ok, best: ok[0] };
}, { tries: 60000 }));
const ss = steps.filter(s => s.problems.length === 5);
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps: ss }));
console.error('lessons.json:', ss.length, 'steps,', ss.reduce((a, s) => a + s.problems.length, 0), 'problems');
