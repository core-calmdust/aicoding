// node tools/gen_content.js [pool.jsonl] [maxPositions]   → lessons.json, puzzles.json (claude/breakthrough-spec.md「レッスン」「パズル」)
// Every answer is worked out by the engine's exact solver (core.c winIn / lossAfter: the side to move forces a win within k of
// its moves against every defence) or, for the capture lesson, by searches at two depths that agree. Positions come from
// self-play games (tools/gen_pool.js). For each problem the words after every wrong move are board facts stored with it
// (P.ng[move] = { k, r, n }: the opponent's answer r and what follows), so the page never explains with an evaluation number.
// Selection: candidates are scored by tools/fun.js; at least three times as many candidates as needed, the best taken;
// no two problems (lessons, ramps, puzzles) the same position up to the left–right mirror and the colour swap, nor within
// 4 squares of each other; each lesson / theme ordered from easy to hard. Checked again by tools/verify_content.js.
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), FUN = require('./fun.js'), TX = require('./bt_text.js');
E.setRule('s8');
const POOL = process.argv[2] || '/tmp/bt-pool.jsonl', MAXP = +(process.argv[3] || 30000);
const N = 8, P1 = 1, P2 = 2;
let seed = 1234; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // mulberry32
// ---------------------------------------------------------------------------------------------- symmetry
const mirrorB = b => { let o = ''; for (let r = 0; r < N; r++) for (let c = N - 1; c >= 0; c--) o += b[r * N + c]; return o; };
const swapB = b => { let o = ''; for (let i = N * N - 1; i >= 0; i--) o += b[i] === 'w' ? 'b' : b[i] === 'b' ? 'w' : '.'; return o; };   // rotate 180° + swap the colours
function canon(sp) {   // as seen by the side to move = White
  let b = sp.b; if (sp.side === P2) b = swapB(b);
  const m = mirrorB(b); return m < b ? m : b;
}
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
// ---------------------------------------------------------------------------------------------- the pool
const lines = fs.readFileSync(POOL, 'utf8').trim().split('\n');
const seen = new Set(), pool = [];
for (const ln of lines) {
  const s = JSON.parse(ln); const sp = { b: s.b, side: s.side };
  const k = canon(sp); if (seen.has(k)) continue; seen.add(k); pool.push(sp);
}
for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
console.log('pool', lines.length, 'unique', pool.length);
// ---------------------------------------------------------------------------------------------- facts
const posOf = sp => E.Pos.from(sp);
const attackersOf = (pos, i, p) => { const [r, c] = E.RC[i], dr = p === P1 ? -1 : 1; let n = 0; for (const dc of [-1, 1]) { const q = E.sqAt(r + dr, c + dc); if (q >= 0 && pos.owner(q) === 3 - p) n++; } return n; };
const nearEnemy = (pos, i, p) => { const [r, c] = E.RC[i]; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const q = E.sqAt(r + dr, c + dc); if (q >= 0 && pos.owner(q) === 3 - p) return true; } return false; };
// the defender's most stubborn reply to a wrong attacking move and what it leads to
function attackNg(sp, x, k) {
  const pos = posOf(sp), me = pos.turn, q = pos.clone().play(x);
  const st = E.judge(q); if (st.over) return { k: 'gen' };
  const reps = E.duelReplies(sp, [x], k);   // the defender's moves, need = my fastest win after it (0: none within k)
  // a defender's move that wins at once / gets out / lasts longest
  let best = null;
  for (const e of reps) {
    const q2 = q.clone().play(e.m), j = E.judge(q2);
    const sc = j.over && j.winner !== me ? 1000 : e.need === 0 ? 500 : e.need;
    if (!best || sc > best.sc) best = Object.assign({ sc }, e);
  }
  if (!best) return { k: 'gen' };
  const q2 = q.clone().play(best.m), j = E.judge(q2);
  if (j.over) return { k: 'lost', r: best.m };
  // fastest forced win of the defender now (it turns the tables)
  const dm = E.duelMin(q2.spec(), [], 3);
  if (best.need === 0 && dm) return { k: 'turn', r: best.m, n: dm };
  if (best.need === 0) return { k: E.isCap(q, best.m) ? 'escT' : 'esc', r: best.m, n: k };
  return { k: 'slow', r: best.m, n: best.need + 1 };
}
function defenceNg(sp, x, need) {
  const r = E.duelGood(sp, [x], need)[0];
  return { k: 'lose', r, n: need };
}
// ---------------------------------------------------------------------------------------------- classify the pool
const C = { win: [], def: [], cap: [] };
const t0 = Date.now();
let done = 0;
for (const sp of process.env.CANDS ? [] : pool.slice(0, MAXP)) {
  done++;
  if (done % 2000 === 0) console.log('scanned', done, ((Date.now() - t0) / 1000).toFixed(0) + 's', 'win', C.win.length, 'def', C.def.length, 'cap', C.cap.length);
  const pos = posOf(sp); if (E.judge(pos).over) continue;
  const legal = pos.moves(); if (legal.length < 6) continue;
  const me = pos.turn, op = 3 - me;
  if (pos.lead(me) <= 1 || pos.lead(op) <= 1) continue;   // a win in one / a forced capture: not a problem
  const k = E.duelMin(sp, [], 5);
  if (k >= 2) {
    const good = E.duelGood(sp, [], k);
    if (good.length === 1) C.win.push({ sp, k, ans: good[0], legal: legal.length });
    continue;
  }
  if (k === 1) continue;
  // defence: the opponent comes close; exactly one move holds for 3 of its moves
  if (pos.lead(op) <= 3) {
    const reps = E.duelReplies(sp, [], 3), safe = reps.filter(e => e.need === 0);
    if (safe.length === 1 && reps.length >= 6) {
      // and it really holds: no forced win within 5 after it either
      const after = posOf(sp).play(safe[0].m);
      if (!E.duelMin(after.spec(), [], 5)) C.def.push({ sp, K: 3, ans: safe[0].m, needs: reps, legal: legal.length });
    }
    continue;
  }
  // a free capture among captures that are taken back (the capture lesson)
  const caps = legal.filter(m => E.isCap(pos, m));
  if (caps.length >= 2) {
    const free = caps.filter(m => attackersOf(pos.clone().play(m), E.mTo(m), me) === 0);
    if (free.length === 1) {
      const a = E.rootValues(pos, 4, 0), b = E.rootValues(pos, 6, 0);
      if (a[0].m === free[0] && b[0].m === free[0] && b[0].v - b[1].v >= 50 && a[0].v - a[1].v >= 50 && Math.abs(b[0].v) < 2000)
        C.cap.push({ sp, ans: free[0], gap: b[0].v - b[1].v, legal: legal.length, caps: caps.length });
    }
  }
}
if (process.env.CANDS) {   // CANDS=<file>:<src>,… candidates of earlier scans (src pool = self-play, end = composed endgames, zz = zugzwang search)
  const have = new Set();
  for (const part of process.env.CANDS.split(',')) {
    const [f, src] = part.split(':'), prev = JSON.parse(fs.readFileSync(f, 'utf8'));
    const add = (key, x) => { const c = canon(x.sp); if (have.has(c)) return; const ps = posOf(x.sp); if (ps.moves().length < 6 || ps.lead(ps.turn) <= 1 || ps.lead(3 - ps.turn) <= 1) return; x.legal = ps.moves().length; have.add(c); x.src = src; C[key].push(x); };
    if (Array.isArray(prev)) prev.forEach(x => add('win', x)); else for (const key of ['win', 'def', 'cap']) prev[key].forEach(x => add(key, x));
  }
}
if (process.env.MERGE) {   // add the candidates of an earlier run (MERGE=<its /tmp/bt-cands.json>), dropping repeats
  const prev = JSON.parse(fs.readFileSync(process.env.MERGE, 'utf8')), have = new Set();
  for (const key of ['win', 'def', 'cap']) { for (const x of C[key]) have.add(canon(x.sp)); for (const x of prev[key]) if (!have.has(canon(x.sp))) { have.add(canon(x.sp)); C[key].push(x); } }
}
console.log('candidates', { win: C.win.length, def: C.def.length, cap: C.cap.length, by_k: [2, 3, 4, 5].map(k => C.win.filter(x => x.k === k).length) });
fs.writeFileSync(process.env.CANDS_OUT || '/tmp/bt-cands.json', JSON.stringify(C));
// ---------------------------------------------------------------------------------------------- themes of a winning first move
function kindOfWin(x) {
  const pos = posOf(x.sp), me = pos.turn, q = pos.clone().play(x.ans), to = E.mTo(x.ans);
  if (E.isCap(pos, x.ans)) return attackersOf(q, to, me) > 0 ? 'trade' : 'take';
  if (isZugzwang(x, q, me)) return 'tempo';
  const runs = [me, 3 - me].every(p => { for (let i = 0; i < 64; i++) if (pos.owner(i) === p && window_isRunner(pos, i, p)) return true; return false; });
  if (runs) return 'race';
  return 'push';
}
// a real waiting move: after it, if the opponent could pass, the mover would have no forced win within k — the win comes
// only from the opponent having to move (zugzwang)
function isZugzwang(x, q, me) {
  const flip = { b: q.spec().b, side: me }; if (E.judge(posOf(flip)).over) return false;
  return !E.duelMin(flip, [], x.k);
}
function window_isRunner(pos, i, p) {
  const [r, c] = E.RC[i], dr = p === P1 ? -1 : 1;
  for (let k = 1; k < N; k++) { const rr = r + dr * k; if (rr < 0 || rr >= N) break; for (let cc = c - k; cc <= c + k; cc++) { const q = E.sqAt(rr, cc); if (q >= 0 && pos.owner(q) === 3 - p) return false; } }
  return true;
}
const SRC = x => x.src === 'pool' || !x.src ? 12 : 0;   // self-play positions first (they look like real games)
for (const x of C.win) { x.kind = kindOfWin(x); x.fun = FUN.win(x) + SRC(x); }
for (const x of C.def) { x.kind = E.isCap(posOf(x.sp), x.ans) ? 'stopcap' : 'wall'; x.fun = FUN.def(x) + SRC(x); }
for (const x of C.cap) x.fun = FUN.cap(x) + SRC(x);
// ---------------------------------------------------------------------------------------------- picking (no near-duplicates)
const used = [];
function free(sp) { const c = canon(sp); for (const u of used) if (diff(u, c) <= 4) return false; return true; }
function take(list, n, flt, need) {
  const L = list.filter(flt).filter(x => x.fun >= (need || 70)).sort((a, b) => b.fun - a.fun);
  const out = [];
  for (const x of L) { if (out.length >= n) break; if (!free(x.sp)) continue; used.push(canon(x.sp)); out.push(x); }
  return { out, pool: L.length };
}
const report = {};
function pick(name, list, n, flt, need) { const r = take(list, n, flt, need); report[name] = `${r.out.length}/${n} from ${r.pool} (×${(r.pool / n).toFixed(1)})`; return r.out; }
// a theme with few candidates gets a third of what is left (at least three candidates per problem, puzzle-fun-score)
function pick3(name, list, nMax, flt, need) { const left = list.filter(flt).filter(x => x.fun >= (need || 70) && free(x.sp)).length; return pick(name, list, Math.min(nMax, Math.floor(left / 3)), flt, need); }
// lessons (5 problems + 2 for the warm-up of each)
const LS = {
  b_cap: pick('b_cap', C.cap, 7, () => true, 60),
  b_stop: pick('b_stop', C.def, 7, x => x.kind === 'stopcap', 60),
  b_win2: pick('b_win2', C.win, 7, x => x.k === 2 && x.kind !== 'trade', 60),
  s_break: pick('s_break', C.win, 7, x => x.k === 3 && x.kind === 'push'),
  s_wall: pick('s_wall', C.def, 7, x => x.kind === 'wall'),
  s_trade: pick('s_trade', C.win, 7, x => x.kind === 'trade' && x.k >= 2),
  s_tempo: pick('s_tempo', C.win, 7, x => x.kind === 'tempo' && x.k >= 2),
  s_race: pick('s_race', C.win, 7, x => x.kind === 'race' && x.k >= 2),
};
// puzzles
const PZ = [
  ['w2', 'Win', pick('pz w2', C.win, 30, x => x.k === 2)],
  ['w3', 'Win', pick('pz w3', C.win, 30, x => x.k === 3)],
  ['w4', 'Win', pick('pz w4', C.win, 30, x => x.k === 4)],
  ['w5', 'Win', pick('pz w5', C.win, 30, x => x.k === 5)],
  ['def', 'Def', pick('pz def', C.def, 30, () => true)],
  ['trade', 'Tac', pick3('pz trade', C.win, 20, x => x.kind === 'trade')],
  ['tempo', 'Tac', pick3('pz tempo', C.win, 20, x => x.kind === 'tempo')],
  ['race', 'Tac', pick3('pz race', C.win, 20, x => x.kind === 'race')],
];
console.log(report);
// ---------------------------------------------------------------------------------------------- building
const diffOf = x => (x.k || x.K || 1) * 10 + x.legal * 0.3 - (x.fun || 0) * 0.05;
const lookOf = (sp, ans, kind) => {   // the squares a hint lights: the answer's piece and two more of yours near the action (or the enemy pieces to deal with)
  const pos = posOf(sp), me = pos.turn, f = E.mFrom(ans);
  if (kind === 'def') { const L = []; for (let i = 0; i < 64; i++) if (pos.owner(i) === 3 - me && E.distOf(i, 3 - me) <= 3) L.push(i); return L.slice(0, 3); }
  const mine = []; for (let i = 0; i < 64; i++) if (pos.owner(i) === me && i !== f) mine.push(i);
  mine.sort((a, b) => E.distOf(a, me) - E.distOf(b, me));
  return [f].concat(mine.slice(0, 2)).sort((a, b) => a - b);
};
function problemOf(x, type) {
  const pos = posOf(x.sp), legal = pos.moves(), ng = {};
  for (const m of legal) {
    if (m === x.ans) continue;
    if (type === 'win') ng[m] = attackNg(x.sp, m, x.k);
    else if (type === 'def') { const e = x.needs.find(z => z.m === m); ng[m] = defenceNg(x.sp, m, e.need); }
    else {   // the capture lesson
      if (E.isCap(pos, m)) { const q = pos.clone().play(m); const rc = q.moves().find(z => E.mTo(z) === E.mTo(m)); ng[m] = rc != null ? { k: 'recap', r: rc } : { k: 'less' }; }
      else ng[m] = { k: 'nocap' };
    }
  }
  return { s: x.sp, ok: [x.ans], best: x.ans, k: x.k || x.K, ng, look: lookOf(x.sp, x.ans, type === 'def' ? 'def' : 'att') };
}
const typeOf = id => id === 'b_cap' ? 'cap' : id === 'b_stop' || id === 's_wall' ? 'def' : 'win';
const course = id => id.startsWith('b_') ? 'basics' : 'strategy';
const pvLine = (x, type) => {   // the solution line as names (for the warm-up's arrows): first move, the reply, the next…
  const out = []; let pos = posOf(x.sp); const line = [];
  if (type === 'win') {
    let left = x.k;
    for (let s = 0; s < 3 && left > 0; s++) {
      const g = E.duelGood(x.sp, line, left); if (!g.length) break;
      out.push(E.name(pos, g[0])); line.push(g[0]); pos = pos.clone().play(g[0]); if (E.judge(pos).over) break;
      const r = E.duelReply(x.sp, line, left - 1); if (r.move == null) break;
      out.push(E.name(pos, r.move)); line.push(r.move); pos = pos.clone().play(r.move); left--;
    }
  } else out.push(E.name(pos, x.ans));
  return out;
};
const steps = [];
for (const id of ['b_cap', 'b_stop', 'b_win2', 's_break', 's_wall', 's_trade', 's_tempo', 's_race']) {
  const L = LS[id].slice().sort((a, b) => diffOf(a) - diffOf(b)), type = typeOf(id);
  if (L.length < 7) { console.log('NOT ENOUGH for', id, L.length); }
  const warm = L.slice(0, 2), probs = L.slice(2, 7);
  const ramp = [];
  if (warm[0]) { const x = warm[0], pos = posOf(x.sp); ramp.push({ k: 'explain', s: x.sp, seq: pvLine(x, type), marks: [[E.mTo(x.ans) + 1, 'ok']], t: TX.rampT(id), body: TX.rampBody(id, { m: E.name(pos, x.ans), n: x.k || x.K }) }); }
  if (warm[1]) { const x = warm[1], pos = posOf(x.sp); ramp.push({ k: 'try', s: x.sp, ok: [E.name(pos, x.ans)], g: TX.rampG(id, { n: x.k || x.K }), h: TX.rampH(id), look: lookOf(x.sp, x.ans, type === 'def' ? 'def' : 'att').map(q => q + 1), y: TX.rampY(id, { m: E.name(pos, x.ans), n: x.k || x.K }) }); }
  steps.push({ id, course: course(id), ramp, problems: probs.map(x => problemOf(x, type)) });
}
fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps, rampUi: TX.rampUi() }));
const themes = PZ.filter(([, , L]) => L.length >= 5).map(([id, grp, L]) => ({ id, grp, puzzles: L.slice().sort((a, b) => diffOf(a) - diffOf(b)).map(x => Object.assign({ s: x.sp, n: x.k ? x.k : 1 }, x.K ? { def: x.K } : {}, { look: lookOf(x.sp, x.ans, x.K ? 'def' : 'att'), f: Math.round(x.fun) })) }));
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify({ version: 1, rule: 's8', daily: ['w2', 'def', 'w3', 'trade', 'w2', 'w4', 'tempo'], themes }));
console.log('lessons', steps.map(s => s.id + ':' + s.problems.length + '+' + s.ramp.length).join(' '));
console.log('puzzles', themes.map(t => t.id + ':' + t.puzzles.length).join(' '), 'total', themes.reduce((a, t) => a + t.puzzles.length, 0));
