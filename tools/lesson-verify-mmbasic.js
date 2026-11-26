// (2026-11-26 第2期 担当A) nine men's morris「はじめてのモリス」b_place（交差点に置く）・b_mill（ミルを作る）:
// every problem against the rules (morris/engine.js) and the site's engine (morris/engine_simd.wasm with evalnet.bin, root_values at two
// fixed depths 9 and 10 = deterministic, 追4). Called from tools/lesson-verify.js morrisBasic (and lesson-facts.js morris).
//  b_place ① ok = the set of placements on an empty junction (4 neighbours); every one of them scores 20 at both depths
//          ② every other move scores under 16 (2D problemPoints = 3D MORRIS.points on the engine's values) at both depths
//          ④ placing phase, neither side has a mill point (the step is about the point alone)
//  b_mill  ① ok = the set of mill-making placements (every removal); all score 20 at both depths ② every other move under 16
//          ④ placing phase (「置いて」), the opponent has no mill point (no block / take mixed in)
//  both    ③ 3 legal moves or more, 追72 right ≤ 1/3 of the legal moves ⑤ not the same board nor 1〜2 moves from any other nine board
//          (lessons, warm-ups, diagrams, puzzles; the 16 symmetries of the board, both colours): 4 points or more differ
//          ⑥ d = legal moves / right moves never goes down, the last more than the first
//          ⑦⑧ モリフク's words (atlas/lessons3d.js mrLsJa) for the answer and every wrong move: b_place's wrong move is named by its
//          neighbours (角 2・辺のまん中 3), less than the answer's 4; b_mill's wrong move makes no mill; the hint's gold rings = the ok points
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DONE = new Set(['b_place', 'b_mill']);
let ENG = null;
function engine() {
  if (ENG) return ENG;
  const W = path.join(ROOT, 'morris'), E = require(path.join(W, 'engine.js'));
  const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(W, 'engine_simd.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports, mem = X.memory;
  const b = fs.readFileSync(path.join(W, 'evalnet.bin')), dv = new DataView(b.buffer, b.byteOffset), H = dv.getUint32(4, true);
  const f = new Float32Array(b.buffer.slice(b.byteOffset + 8, b.byteOffset + 8 + 4 * (71 * H + 2 * H + 1)));
  new Float32Array(mem.buffer, X.net_ptr(), f.length).set(f); X.net_on(H);
  const G = E.geom('nine'), a = [G.n, G.pieces, G.fly ? 1 : 0, G.mills.length]; for (const m of G.mills) a.push(...m); a.push(0);
  const io = () => new Int32Array(mem.buffer, X.io_ptr(), 8192); io().set(a); X.set_geometry();
  const rv = (spec, D) => { X.new_game(); io().set(E.setupIO('nine', spec, [])); X.setup(); X.set_limit(0, 0); if (!X.root_values(D)) return null; const q = io(), M = new Map(); for (let k = 0; k < q[0]; k++) M.set(q[1 + 2 * k], q[2 + 2 * k]); return M; };
  return (ENG = { E, G, rv });
}
// = morris/index.html problemPoints on a full value map (P.sc form)
function ptsOf(E, V, m) {
  const WIN = E.WIN, WINT = E.WINT, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : Math.tanh(v / 320) * 0.82;
  const best = Math.max(...V.values()), mine = V.has(m) ? V.get(m) : -WIN;
  if (mine >= best - 6 && !(best > WINT && mine < best)) return 20; if (best > WINT && mine > WINT) return 16; if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0;
  if (mine < -WINT && best >= -WINT) return 0; return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5)));
}
// the 16 symmetries of the nine board (the square's 8 × outer ring ↔ inner ring)
function syms(G) {
  const at = {}; G.pts.forEach(([x, y], i) => (at[x + ',' + y] = i));
  const T = [];
  for (let r = 0; r < 4; r++) for (const fl of [0, 1]) for (const sw of [0, 1]) T.push(G.pts.map(([x, y]) => {
    let u = x - 3, v = y - 3; if (fl) u = -u; for (let k = 0; k < r; k++) [u, v] = [-v, u];
    if (sw) { const ring = Math.max(Math.abs(u), Math.abs(v)); if (ring === 3) { u /= 3; v /= 3; } else if (ring === 1) { u *= 3; v *= 3; } }
    return at[(u + 3) + ',' + (v + 3)]; }));
  return T;
}
function words3d() {
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const a = src.indexOf('  const MRJ_LS = {'), b = src.indexOf('  const MORRIS = {');
  if (a < 0 || b < a) throw new Error('mrLsJa not found in atlas/lessons3d.js');
  return vm.runInNewContext(src.slice(a, b) + '\n;({ mrLsJa, MRJ_LS })', { console });
}
function verify(opt) {
  const { E, G, rv } = engine(), NO = E.NONE, out = [], add = (sid, q, m) => out.push({ step: sid, q, msg: m });
  const L = (opt && opt.nine) || JSON.parse(fs.readFileSync(path.join(ROOT, 'morris/lessons.json'), 'utf8'));
  const W = words3d(), SY = syms(G);
  // every other nine board (lessons / warm-ups / diagrams / puzzles)
  const others = [];
  L.steps.forEach(st => { (st.problems || []).forEach((P, j) => others.push({ w: `${st.id} q${j + 1}`, b: P.s.b }));
    (st.ramp || []).forEach((R, j) => R.s && others.push({ w: `${st.id} warm-up ${j + 1}`, b: R.s.b })); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'morris/puzzles.json'), 'utf8'));
  (PZ.themes || []).forEach(t => (t.puzzles || []).forEach((p, j) => p.s && others.push({ w: `puzzle ${t.id} ${j + 1}`, b: p.s.b })));
  const dist = (a, b) => { let best = 99; for (const T of SY) for (const sw of [0, 1]) { let d = 0; for (let i = 0; i < G.n; i++) { let v = +b[T[i]]; if (sw && v) v = 3 - v; if (+a[i] !== v) d++; } if (d < best) best = d; } return best; };
  const millPts = (pos, side) => { const c = pos.clone(); c.side = side; const S = new Set(); for (const x of c.moves()) if (E.mRm(x) !== NO) S.add(E.mTo(x)); return S; };
  let key = 0;
  L.steps.forEach(st => { if (!(st.problems && st.problems.length)) return; const K = key++; if (!DONE.has(st.id)) return; const id = st.id; let dPrev = 0, d0 = 0;
    st.problems.forEach((P, j) => { const q = j + 1, pos = E.Pos.from(G, P.s), ms = pos.moves(), me = pos.side, o = 3 - me, ok = P.ok || [];
      const okS = new Set(ok), my = millPts(pos, me), op = millPts(pos, o);
      ok.forEach(m => { if (!ms.includes(m)) add(id, q, `① a right move is not legal`); });
      // ① the goal set, ④ the theme
      if (!(pos.hand[me] > 0)) add(id, q, '④ not the placing phase');
      const goal = id === 'b_place' ? ms.filter(m => E.mFrom(m) === NO && G.adj[E.mTo(m)].length === 4) : ms.filter(m => E.mFrom(m) === NO && E.mRm(m) !== NO);
      if (goal.length !== okS.size || goal.some(m => !okS.has(m))) add(id, q, `① ok (${ok.map(m => pos.name(m)).join(' ')}) is not the goal set (${goal.map(m => pos.name(m)).join(' ')})`);
      if (id === 'b_place' && (my.size || op.size)) add(id, q, `④ a mill point on the board (yours ${my.size}, the opponent's ${op.size}): not the point alone`);
      if (id === 'b_mill' && (!my.size || op.size)) add(id, q, `④ yours ${my.size} mill point(s), the opponent's ${op.size} (want 1+ and 0)`);
      // ③ 追72
      if (ms.length < 3) add(id, q, `③ only ${ms.length} legal moves`);
      if (ok.length * 3 > ms.length) add(id, q, `追72 ${ok.length} of the ${ms.length} legal moves are right`);
      // ①② the engine at two depths (追4)
      for (const D of [9, 10]) { const V = rv(P.s, D); if (!V) { add(id, q, `① the engine gave no values (depth ${D})`); continue; }
        ok.forEach(m => { const p = ptsOf(E, V, m); if (p < 20) add(id, q, `① ${pos.name(m)} scores ${p} at depth ${D} (best ${Math.max(...V.values())}, it ${V.get(m)})`); });
        ms.filter(m => !okS.has(m)).forEach(m => { const p = ptsOf(E, V, m); if (p >= 16) add(id, q, `② ${pos.name(m)} scores ${p} at depth ${D} (as good as the answer)`); }); }
      // ⑤
      others.forEach(x => { if (x.w === `${id} q${q}`) return; const d = dist(P.s.b, x.b); if (d < 4) add(id, q, `⑤ ${d} points from ${x.w}`); });
      // ⑥
      const d = ms.length / Math.max(1, ok.length); if (j === 0) d0 = d; else if (d < dPrev) add(id, q, `⑥ d ${d.toFixed(1)} below the previous ${dPrev.toFixed(1)}`); dPrev = d;
      if (j === st.problems.length - 1 && !(d > d0)) add(id, q, `⑥ the last d ${d.toFixed(1)} is not above the first ${d0.toFixed(1)}`);
      // ⑦⑧ モリフク's words
      const s = Object.assign({ v: 'nine' }, st), Wd = W.mrLsJa(E, s, P, j, k => k === 'ok' ? '緑の手' : '赤の手', K);
      if (!Wd) { add(id, q, '⑧ no 3D words'); return; }
      const deg = m => G.adj[E.mTo(m)].length, dn = n => n >= 4 ? '交差点' : n === 3 ? '辺のまん中' : '角';
      ok.forEach(m => { const t = Wd.good(m); if (id === 'b_place' && !/交差点|となりが4つ|4方向/.test(t)) add(id, q, `⑧ the praise does not name the junction: ${t}`); if (id === 'b_mill' && !/ミル|そろ|3つ目/.test(t)) add(id, q, `⑧ the praise names no mill: ${t}`); });
      ms.filter(m => !okS.has(m)).forEach(m => { const t = Wd.ng(m);
        if (id === 'b_place') { const n = deg(m); const k = (t.match(/赤の手(?:は|の)(角|辺のまん中|交差点)/) || [])[1]; if ((k && k !== dn(n)) || !t.includes(`${n}`) || !/4/.test(t)) add(id, q, `⑦ ${pos.name(m)} (${dn(n)}, ${n}) is not named by its neighbours: ${t}`); }
        if (id === 'b_mill') { if (E.mRm(m) !== NO) add(id, q, `⑦ ${pos.name(m)} makes a mill but is wrong`); else if (!/ミルにならない|そろわない|並ばない|並ばず/.test(t)) add(id, q, `⑦ ${pos.name(m)}: the words do not say it makes no mill: ${t}`); } });
      const hint = W.MRJ_LS.hint[id][(j + K) % W.MRJ_LS.hint[id].length];
      if (id === 'b_place' && /四隅の角/.test(hint) && ms.every(m => deg(m) !== 2)) add(id, q, `⑧ the hint speaks of the corners but none is empty: ${hint}`);
      if (Wd.hintTx !== hint) add(id, q, '⑧ the hint is not the step\'s own');
    });
  });
  return out;
}
module.exports = { verify, DONE, engine, ptsOf, syms };
if (require.main === module) { const f = verify(); f.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK morris basics ' + [...DONE].join('・')); process.exit(f.length ? 1 : 0); }
