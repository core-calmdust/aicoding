// Pick up to 5 practice positions per set from go/tools/data/op-cand*.json (go/tools/op-curate.mjs): both reads pass ①②③,
// ⑤ 3 stones or more from every other go problem (other sets' problems, lessons, warm-ups, tsumego; 8 symmetries and colours swapped)
// and from each other, then in move order. --write puts them into go/openings.json (verified) and their reads into openings-reads.json.
//   node go/tools/op-pick.js --sets id,id [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), R = require(path.join(ROOT, 'go/rules.js'));
const args = process.argv.slice(2), SETS = (args[args.indexOf('--sets') + 1] || '').split(','), WRITE = args.includes('--write');
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const C = {}; for (const f of fs.readdirSync(path.join(ROOT, 'go/tools/data'))) if (/^op-cand.*\.json$/.test(f)) Object.assign(C, J('go/tools/data/' + f));
const O = J('go/openings.json');
function specFrom(o) { const n = o.n || 19, a = Array(n * n).fill('.'); for (const s of o.ab || []) a[R.parseCoord(s, n)] = 'b'; for (const s of o.aw || []) a[R.parseCoord(s, n)] = 'w'; return { n, stones: a.join(''), turn: o.turn || 1 }; }
function startOf(g) { const n = g.n || 19; if (g.start) return specFrom(Object.assign({ n }, g.start)); if (g.handi) { const a = Array(n * n).fill('.'); R.handicapPoints(n, g.handi).forEach(i => { a[i] = 'b'; }); return { n, stones: a.join(''), turn: 2 }; } return { n, stones: '.'.repeat(n * n), turn: 1 }; }
function play(g, mv) { let p = R.Pos.from(startOf(g)); for (const m of mv) { const r = p.tryPlay(R.parseCoord(m, g.n || 19)); if (!r) return null; p = r.pos; } return p; }
const stonesOf = p => { const s = [], n = p.n; for (let i = 0; i < n * n; i++) if (p.b[i]) s.push([p.b[i], i % n, Math.floor(i / n)]); return s; };
function dist(A, nA, B, nB) { if (nA !== nB || Math.abs(A.length - B.length) > 2) return 99; const m = nA - 1;
  const SY = [(x, y) => [x, y], (x, y) => [m - x, y], (x, y) => [x, m - y], (x, y) => [m - x, m - y], (x, y) => [y, x], (x, y) => [m - y, x], (x, y) => [y, m - x], (x, y) => [m - y, m - x]];
  const Bs = new Set(B.map(([c, x, y]) => c + ',' + x + ',' + y)); let best = 99;
  for (const f of SY) for (const sw of [0, 1]) { let hit = 0; for (const [c, x, y] of A) { const [u, v] = f(x, y); if (Bs.has((sw ? 3 - c : c) + ',' + u + ',' + v)) hit++; } best = Math.min(best, A.length + B.length - 2 * hit); }
  return best; }
const passes = (rd, ok) => { const top = rd.top, best = top[0]; if (!best || (ok && best[0] !== ok)) return false; const bl = best[2];
  const sec = top.filter(e => e[1] >= 10 && e[0] !== best[0]).sort((a, b) => b[2] - a[2])[0]; if (sec && sec[2] > bl - 1.0) return false;
  const vs = top.reduce((a, e) => a + e[1], 0); if (best[1] < 0.6 * vs) return false;
  const pa = (rd.pol.find(e => e[0] === best[0]) || [0, 0])[1], alt = rd.pol.filter(e => e[0] !== best[0] && e[1] >= 0.03).length; return pa <= 0.9 && alt >= 2; };
const pool = [];
O.sets.forEach(g => { if (SETS.includes(g.id)) return; (g.problems || []).forEach((P, j) => { const p = play(g, P.mv || g.line.slice(0, P.at)); if (p) pool.push({ who: g.id + ' q' + (j + 1), n: g.n || 19, S: stonesOf(p) }); }); });
const L = J('go/lessons.json'); L.steps.forEach(st => { (st.problems || []).forEach((P, j) => pool.push({ who: 'lesson ' + st.id, n: P.s.n, S: stonesOf(R.Pos.from(P.s)) })); (st.ramp || []).forEach(r => { if (r.s) pool.push({ who: 'warm-up ' + st.id, n: r.s.n, S: stonesOf(R.Pos.from(r.s)) }); }); });
J('go/puzzles.json').themes.forEach(t => (t.puzzles || []).forEach(P => { if (P.s) pool.push({ who: 'tsumego ' + t.id, n: P.s.n, S: stonesOf(R.Pos.from(P.s)) }); }));
const RD = J('go/tools/data/openings-reads.json'), PICKED = [];   // (the positions taken by the sets before: 5 each, kept apart too)
for (const id of SETS) { const g = O.sets.find(x => x.id === id), N = g.n || 19, side = g.side || 1;
  const cand = Object.entries(C).filter(([k, c]) => c.id === id && c.deep && passes(c) && passes(c.deep, c.top[0][0]) && c.turn === side)
    .map(([k, c]) => { const p = play(g, c.mv); return { k, c, p, S: stonesOf(p) }; }).sort((a, b) => a.c.mv.length - b.c.mv.length);
  const pick = [];
  for (const x of cand) { const near = pool.find(o => dist(x.S, N, o.S, o.n) <= 2), mine = pick.concat(PICKED).find(o => dist(x.S, N, o.S, o.N || N) <= 2);
    console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], near ? '⑤ ' + near.who : mine ? '⑤ 同じ本 ' + mine.c.mv.join(' ') : 'ok'); if (!near && !mine && pick.length < 5) pick.push(x); }
  console.log(id, '選んだ', pick.length); if (pick.length === 5) pick.forEach(x => PICKED.push(Object.assign(x, { N })));
  if (WRITE && pick.length === 5) { g.problems = pick.map(x => { const on = g.line.slice(0, x.c.mv.length).join(' ') === x.c.mv.join(' ');
      if (on) RD.pos[id + '@' + x.c.mv.length] = { turn: x.c.turn, pol: x.c.pol, top: x.c.top, deep: { pol: x.c.deep.pol, top: x.c.deep.top } };
      else RD.pos[id + '@' + x.c.mv.join(' ')] = { turn: x.c.turn, pol: x.c.pol, top: x.c.top, deep: { pol: x.c.deep.pol, top: x.c.deep.top } };
      const dv = x.c.dev; for (let k = dv + 1; k < x.c.mv.length; k++) { const kk = id + ':' + x.c.mv.slice(0, k).join(' '); if (C[kk] && C[kk].top[0][0] === x.c.mv[k]) RD.pos[id + '@' + x.c.mv.slice(0, k).join(' ')] = { turn: C[kk].turn, pol: C[kk].pol, top: C[kk].top }; }
      return on ? { at: x.c.mv.length, ok: [x.c.top[0][0]] } : { at: x.c.mv.length, mv: x.c.mv, ok: [x.c.top[0][0]] }; });
    g.verified = true; }
}
if (WRITE) { fs.writeFileSync(path.join(ROOT, 'go/openings.json'), JSON.stringify(O)); fs.writeFileSync(path.join(ROOT, 'go/tools/data/openings-reads.json'), JSON.stringify(RD)); }
