// (2026-11-26 第2期 担当A) nine men's morris「はじめてのモリス」b_place（交差点に置く）・b_mill（ミルを作る）・b_take（取る駒を選ぶ）・b_block（ふさぐ）:
// every problem against the rules (morris/engine.js) and the site's engine (morris/engine_simd.wasm with evalnet.bin, root_values at two
// fixed depths 9 and 10 = deterministic, 追4). Called from tools/lesson-verify.js morrisBasic (and lesson-facts.js morris).
//  b_place ① ok = the set of placements on an empty junction (4 neighbours); every one of them scores 20 at both depths
//          ② every other move scores under 16 (2D problemPoints = 3D MORRIS.points on the engine's values) at both depths
//          ④ placing phase, neither side has a mill point (the step is about the point alone)
//  b_mill  ① ok = the set of mill-making placements (every removal); all score 20 at both depths ② every other move under 16
//          ④ placing phase (「置いて」), the opponent has no mill point (no block / take mixed in)
//  b_take  (2026-11-28) ① ok = the mill-making placements whose removal is a piece of the opponent's pair (two in a line, the third empty)
//          and leave the opponent no mill point ④ you have 1 mill point, the opponent 1 (not the same point: the placement does not block),
//          ③ 3+ wrong removals ⑦ a non-mill move is named as no mill, a wrong removal as leaving the pair (the opponent still has a mill point)
//  b_block (2026-11-28) ① ok = the placement on the opponent's only mill point ④ you have no mill point ⑦ every wrong move leaves the
//          opponent's mill point and the words say so; the hint「まだミルを作れない」is true
//  b_move  (2026-11-28 09:18) ① ok = every step that makes a mill (every removal), all 20 at both depths ② every other move under 16
//          ④ the moving phase (both hands empty, 4+ pieces each: no flying), one mill step (one piece to one point), the opponent has no mill point
//          ⑦⑧ a wrong move makes no mill and the words say so; the praise names the mill
//  b_reopen (2026-11-28 09:18) ① ok = the steps of a piece of your closed mill out of it (no new mill) after which the opponent can step into
//          no vacated point and has no mill point ④ the moving phase, neither side has a mill step now ⑦ every wrong move is an opening the
//          opponent can step into, or leaves the opponent a mill point (= 2D ls.b_reopen.ng), and モリフク's words name which
//          追45 the hint's tip (a mill piece whose vacated point has no opponent's neighbour) is the answer in some move
//  追14    the intro diagrams of b_move (the arrow is a step that makes the mill) and b_reopen (the arrow opens your mill, no opponent's piece
//          next to the vacated point)
//  all     ③ 3 legal moves or more, 追72 right ≤ 1/3 of the legal moves ⑤ not the same board nor 1〜2 moves from any other nine board
//          (lessons, warm-ups, diagrams, puzzles; the 16 symmetries of the board, both colours): 4 points or more differ
//          ⑥ d = legal moves / right moves never goes down, the last more than the first
//          ⑦⑧ モリフク's words (atlas/lessons3d.js mrLsJa) for the answer and every wrong move: b_place's wrong move is named by its
//          neighbours (角 2・辺のまん中 3), less than the answer's 4; b_mill's wrong move makes no mill; the hint's gold rings = the ok points
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DONE = new Set(['b_place', 'b_mill', 'b_take', 'b_block', 'b_move', 'b_reopen']);
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
  // 追14 the intro diagrams of b_take / b_block (2D) say what the board shows: the marked piece to take is one of the opponent's only pair,
  // the dash / ring is that pair's empty third point (= the opponent's only mill point), and b_block's side has no mill point
  const at = {}; G.pts.forEach(([x, y], i) => (at['abcdefg'[x] + (7 - y)] = i));
  L.steps.filter(st => (st.id === 'b_take' || st.id === 'b_block') && st.diagram).forEach(st => { const d = st.diagram, b = Array(G.n).fill(0);
    (d.p1 || []).forEach(n => (b[at[n]] = 1)); (d.p2 || []).forEach(n => (b[at[n]] = 2));
    const pts = who => G.mills.filter(ml => ml.filter(i => b[i] === who).length === 2 && ml.some(i => !b[i])).map(ml => ({ ml, gap: ml.find(i => !b[i]) }));
    const P2 = pts(2), mk = k => (d.marks || []).filter(x => x[1] === k).map(x => at[x[0]]);
    if (P2.length !== 1 || new Set(P2.map(x => x.gap)).size !== 1) add(st.id, 0, `追14 the diagram: the opponent has ${P2.length} pairs (want 1)`);
    const gapM = mk(st.id === 'b_take' ? 'dash' : 'ring');
    if (!gapM.length || gapM.some(g => !P2.some(x => x.gap === g))) add(st.id, 0, '追14 the diagram: the marked point is not the opponent\'s mill point');
    if (st.id === 'b_take' && mk('x').some(g => !P2.some(x => x.ml.includes(g) && b[g] === 2))) add(st.id, 0, '追14 the diagram: the piece marked to take is not in the opponent\'s pair');
    if (st.id === 'b_take' && !(d.mills || []).length) add(st.id, 0, '追14 the diagram shows no mill');
    if (st.id === 'b_block' && pts(1).length) add(st.id, 0, '追14 the diagram: your side has a mill point (the intro says you cannot make one)'); });
  L.steps.filter(st => (st.id === 'b_move' || st.id === 'b_reopen') && st.diagram).forEach(st => { const d = st.diagram, b = Array(G.n).fill(0);
    (d.p1 || []).forEach(n => (b[at[n]] = 1)); (d.p2 || []).forEach(n => (b[at[n]] = 2));
    const [fr, to] = (d.arrows || [])[0] || [], f = at[fr], t = at[to];
    if (f == null || t == null || b[f] !== 1 || b[t] || !G.adj[f].includes(t)) { add(st.id, 0, '追14 the diagram: the arrow is not a step of your piece to an empty neighbour'); return; }
    const full = (bb, ml) => ml.every(i => bb[i] === 1), b2 = b.slice(); b2[f] = 0; b2[t] = 1;
    if (st.id === 'b_move' && !G.mills.some(ml => ml.includes(t) && full(b2, ml))) add(st.id, 0, '追14 the diagram: the arrow makes no mill');
    if (st.id === 'b_reopen') { if (!G.mills.some(ml => ml.includes(f) && full(b, ml))) add(st.id, 0, '追14 the diagram: the arrow does not open a mill');
      if (G.adj[f].some(j => b2[j] === 2)) add(st.id, 0, '追14 the diagram: an opponent\'s piece is next to the vacated point');
      const ms = (d.mills || []).map(x => x.map(n => at[n])); if (!ms.length || !ms.some(x => x.every(i => b[i] === 1))) add(st.id, 0, '追14 the diagram shows no mill of yours'); } });
  let key = 0;
  L.steps.forEach(st => { if (!(st.problems && st.problems.length)) return; const K = key++; if (!DONE.has(st.id)) return; const id = st.id; let dPrev = 0, d0 = 0;
    st.problems.forEach((P, j) => { const q = j + 1, pos = E.Pos.from(G, P.s), ms = pos.moves(), me = pos.side, o = 3 - me, ok = P.ok || [];
      const okS = new Set(ok), my = millPts(pos, me), op = millPts(pos, o);
      const after = m => { const c = pos.clone(); c.play(m); return c; };
      ok.forEach(m => { if (!ms.includes(m)) add(id, q, `① a right move is not legal`); });
      // ① the goal set, ④ the theme
      const moving = id === 'b_move' || id === 'b_reopen', cnt = w => pos.b.filter(x => x === w).length;
      if (!moving && !(pos.hand[me] > 0)) add(id, q, '④ not the placing phase');
      if (moving && (pos.hand[me] || pos.hand[o] || cnt(me) < 4 || cnt(o) < 4)) add(id, q, '④ not the moving phase (hands empty, 4+ pieces each)');
      const inM = i => G.mills.some(ml => ml.includes(i) && ml.every(k => pos.b[k] === me));
      const enterF = m => { const f = E.mFrom(m); if (f === NO) return false; const c = after(m); return c.moves().some(x => E.mTo(x) === f); };
      const opening = m => E.mFrom(m) !== NO && inM(E.mFrom(m)) && E.mRm(m) === NO;
      const line2 = (at, who) => G.mills.some(ml => ml.includes(at) && ml.filter(i => i !== at).filter(i => pos.b[i] === who).length === 1 && ml.filter(i => i !== at).some(i => !pos.b[i]));
      const oppAfter = m => millPts(after(m), o).size;
      const goal = id === 'b_place' ? ms.filter(m => E.mFrom(m) === NO && G.adj[E.mTo(m)].length === 4)
        : id === 'b_mill' ? ms.filter(m => E.mFrom(m) === NO && E.mRm(m) !== NO)
        : id === 'b_take' ? ms.filter(m => E.mFrom(m) === NO && E.mRm(m) !== NO && line2(E.mRm(m), o) && oppAfter(m) === 0)
        : id === 'b_block' ? ms.filter(m => E.mFrom(m) === NO && op.has(E.mTo(m)) && oppAfter(m) === 0)
        : id === 'b_move' ? ms.filter(m => E.mFrom(m) !== NO && E.mRm(m) !== NO)
        : ms.filter(m => opening(m) && !enterF(m) && oppAfter(m) === 0);
      if (goal.length !== okS.size || goal.some(m => !okS.has(m))) add(id, q, `① ok (${ok.map(m => pos.name(m)).join(' ')}) is not the goal set (${goal.map(m => pos.name(m)).join(' ')})`);
      if (id === 'b_place' && (my.size || op.size)) add(id, q, `④ a mill point on the board (yours ${my.size}, the opponent's ${op.size}): not the point alone`);
      if (id === 'b_mill' && (!my.size || op.size)) add(id, q, `④ yours ${my.size} mill point(s), the opponent's ${op.size} (want 1+ and 0)`);
      if (id === 'b_take') { // ④ you can make a mill, the opponent has a mill point your placement does not fill, and the removal decides it
        if (my.size !== 1 || op.size !== 1) add(id, q, `④ yours ${my.size} mill point(s), the opponent's ${op.size} (want 1 and 1: one mill, one pair to break)`);
        if (ms.some(m => E.mRm(m) !== NO && op.has(E.mTo(m)))) add(id, q, '④ a mill point of yours is the opponent\'s mill point too (the placement blocks: the removal does not matter)');
        const wm = ms.filter(m => E.mRm(m) !== NO && !okS.has(m)); if (wm.length < 3) add(id, q, `③ only ${wm.length} wrong removals (want 3+: the choice of the piece is the theme)`);
        ms.filter(m => !okS.has(m) && E.mRm(m) !== NO).forEach(m => { if (oppAfter(m) === 0) add(id, q, `① ${pos.name(m)} makes a mill and leaves the opponent no mill point, but is wrong`); }); }
      if (id === 'b_block') { // ④ you have no mill, the opponent has exactly one mill point
        if (my.size || op.size !== 1) add(id, q, `④ yours ${my.size} mill point(s), the opponent's ${op.size} (want 0 and 1)`);
        ms.filter(m => !okS.has(m)).forEach(m => { if (oppAfter(m) === 0) add(id, q, `① ${pos.name(m)} is wrong but leaves the opponent no mill point`); }); }
      if (id === 'b_move') { const ft = new Set(goal.map(m => E.mFrom(m) + '-' + E.mTo(m)));
        if (ft.size !== 1 || op.size) add(id, q, `④ ${ft.size} mill step(s) (want 1: one piece to one point), the opponent's mill points ${op.size} (want 0)`); }
      if (id === 'b_reopen') { if (my.size || op.size) add(id, q, `④ yours ${my.size} mill step(s), the opponent's ${op.size} (want 0 and 0: opening is the theme)`);
        if (!ms.some(opening)) add(id, q, '④ no mill of yours to open');
        ms.filter(m => !okS.has(m)).forEach(m => { if (!((opening(m) && enterF(m)) || oppAfter(m) > 0 || (!opening(m) && !millPts(after(m), me).size))) add(id, q, `⑦ ${pos.name(m)} is wrong, but it lets the opponent into no vacated point, leaves them no mill point, and is an opening or leaves you a mill step (2D ls.b_reopen.ng)`); }); }
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
      ok.forEach(m => { const t = Wd.good(m); if (id === 'b_take' && !/2つ並び|ねらい|作りかけ|材料|次のミル/.test(t)) add(id, q, `⑧ the praise does not name the opponent's pair: ${t}`); if (id === 'b_block' && !/ミル|3つ目|2つ並び|ねらい|取られ/.test(t)) add(id, q, `⑧ the praise does not name the block: ${t}`); if (id === 'b_place' && !/交差点|となりが4つ|4方向/.test(t)) add(id, q, `⑧ the praise does not name the junction: ${t}`); if ((id === 'b_mill' || id === 'b_move') && !/ミル|そろ|3つ目/.test(t)) add(id, q, `⑧ the praise names no mill: ${t}`); if (id === 'b_reopen' && !/届かない|割りこめない|入れない|いない|戻|また|何度でも/.test(t)) add(id, q, `⑧ the praise does not name the safe opening: ${t}`); });
      ms.filter(m => !okS.has(m)).forEach(m => { const t = Wd.ng(m);
        if (id === 'b_place') { const n = deg(m); const k = (t.match(/赤の手(?:は|の)(角|辺のまん中|交差点)/) || [])[1]; if ((k && k !== dn(n)) || !t.includes(`${n}`) || !/4/.test(t)) add(id, q, `⑦ ${pos.name(m)} (${dn(n)}, ${n}) is not named by its neighbours: ${t}`); }
        if (id === 'b_take') { if (E.mRm(m) === NO) { if (!/ミルにならない|そろわない|取れない|チャンスがない/.test(t)) add(id, q, `⑦ ${pos.name(m)} makes no mill: the words do not say so: ${t}`); }
          else { if (!/2つ並び|ねらい|ミルの点|作りかけ/.test(t)) add(id, q, `⑦ ${pos.name(m)}: the words do not say the opponent's pair stays: ${t}`); if (!oppAfter(m)) add(id, q, `⑦ ${pos.name(m)}: the words say the pair stays, but the opponent has no mill point`); if (line2(E.mRm(m), o) && /関係ない|ねらいのない/.test(t)) add(id, q, `⑦ ${pos.name(m)} takes a piece of a pair, but the words say it has no aim: ${t}`); } }
        if (id === 'b_block') { if (!oppAfter(m)) add(id, q, `⑦ ${pos.name(m)}: the words say the mill comes, but the opponent has no mill point`); if (!/空いたまま|ミルにされ|ミル。|ねらいが残る|間に合わない/.test(t)) add(id, q, `⑦ ${pos.name(m)}: the words do not say the opponent's mill point stays: ${t}`); }
        if (id === 'b_reopen') { const oa = oppAfter(m) > 0, en = opening(m) && enterF(m);
          if (oa && !/ミルの点|ミルを作られ|ミルをそろえ|ミル。|ねらい/.test(t)) add(id, q, `⑦ ${pos.name(m)} leaves the opponent a mill point: the words do not say so: ${t}`);
          if (!oa && en && !/入れる|入って|すべりこ|ふさ|うめ|ふた|となりに相手/.test(t)) add(id, q, `⑦ ${pos.name(m)} lets the opponent into the vacated point: the words do not say so: ${t}`);
          if (!oa && /ミルの点|ミルを作られ|ミルをそろえ/.test(t)) add(id, q, `⑦ ${pos.name(m)}: the words speak of the opponent's mill, but they have no mill point: ${t}`);
          if (!oa && !opening(m) && (!/閉じなおせない|ミルを作る形にならない|使いなおせない/.test(t) || /入れる|すべりこ|となりに相手|開き方|開くと/.test(t))) add(id, q, `⑦ ${pos.name(m)} opens no mill: the words do not say it cannot close a mill again next move: ${t}`); }
        if (id === 'b_mill' || id === 'b_move') { if (E.mRm(m) !== NO) add(id, q, `⑦ ${pos.name(m)} makes a mill but is wrong`); else if (!/ミルにならない|そろわない|並ばない|並ばず/.test(t)) add(id, q, `⑦ ${pos.name(m)}: the words do not say it makes no mill: ${t}`); } });
      const hint = W.MRJ_LS.hint[id][(j + K) % W.MRJ_LS.hint[id].length];
      if (id === 'b_place' && /四隅の角/.test(hint) && ms.every(m => deg(m) !== 2)) add(id, q, `⑧ the hint speaks of the corners but none is empty: ${hint}`);
      if (id === 'b_block' && /まだミルを作れない/.test(hint) && my.size) add(id, q, `⑧ the hint says you cannot make a mill: ${hint}`);
      if (id === 'b_reopen' && /空けた点のとなりに相手の駒がいない/.test(hint) && !ok.some(m => !G.adj[E.mFrom(m)].some(k => pos.b[k] === o))) add(id, q, `追45 the hint's tip is no right move: ${hint}`);
      if (Wd.hintTx !== hint) add(id, q, '⑧ the hint is not the step\'s own');
    });
  });
  return out;
}
module.exports = { verify, DONE, engine, ptsOf, syms };
if (require.main === module) { const f = verify(); f.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK morris basics ' + [...DONE].join('・')); process.exit(f.length ? 1 : 0); }
