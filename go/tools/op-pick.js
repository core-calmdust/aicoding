// Pick up to 5 practice positions per set from go/tools/data/op-cand*.json (go/tools/op-curate.mjs): both reads pass ①②③,
// ⑤ 3 stones or more from every other go problem (other sets' problems, lessons, warm-ups, tsumego; 8 symmetries and colours swapped)
// and from each other, then in move order. --write puts them into go/openings.json (verified) and their reads into openings-reads.json.
//   node go/tools/op-pick.js --sets id,id [--write]
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), R = require(path.join(ROOT, 'go/rules.js'));
const args = process.argv.slice(2), SETS = (args[args.indexOf('--sets') + 1] || '').split(','), WRITE = args.includes('--write');
// --skip 'id:手,手;…'（2026-11-26 担当B）：同じ形の答え（同じ手筋）が2問にならないよう、候補を外して選ぶ
const SKIP = new Set((args.includes('--skip') ? args[args.indexOf('--skip') + 1] : '').split(';').filter(Boolean));
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const C = {}, ALL = []; for (const f of fs.readdirSync(path.join(ROOT, 'go/tools/data'))) if (/^op-cand.*\.json$/.test(f)) { const o = J('go/tools/data/' + f); ALL.push(o); Object.assign(C, o); }
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
function farOf(g, a) { const N = g.n || 19; if (/^fuseki_/.test(g.id) || N < 19) return false; const i = R.parseCoord(a, N);
  const pts = [].concat(...[g.line].concat((g.vars || []).map(v => v.line))).map(m => R.parseCoord(m, N)).filter(j => j >= 0);
  return !pts.some(j => Math.max(Math.abs(j % N - i % N), Math.abs(Math.floor(j / N) - Math.floor(i / N))) <= 4); }
function lineTwin(g, p, S, ans) { const N = g.n || 19, Ls = [g.line].concat((g.vars || []).map(v => g.line.slice(0, v.at).concat(v.line)));
  for (const [li, L] of Ls.entries()) for (let at = 0; at < L.length; at++) { if (L[at] !== ans) continue; const q = play(g, L.slice(0, at)); if (!q || q.turn !== p.turn) continue;
    const d = dist(S, N, stonesOf(q), N); if (d <= 2) return (li ? '変化' + li : '本筋') + ' ' + (at + 1) + '手目 ' + ans + '・' + d + '石違い'; }
  return null; }
const RD = J('go/tools/data/openings-reads.json'), PICKED = [];   // (the positions taken by the sets before: 5 each, kept apart too)
for (const id of SETS) { const g = O.sets.find(x => x.id === id), N = g.n || 19, side = g.side || 1;
  const cand = Object.entries(C).filter(([k, c]) => c.id === id && c.deep && passes(c) && passes(c.deep, c.top[0][0]) && c.turn === side)
    .map(([k, c]) => { const p = play(g, c.mv); return { k, c, p, S: stonesOf(p) }; }).sort((a, b) => a.c.mv.length - b.c.mv.length);
  const pick = [];
  for (const x of cand) { const near = pool.find(o => dist(x.S, N, o.S, o.n) <= 2), mine = pick.concat(PICKED).find(o => dist(x.S, N, o.S, o.N || N) <= 2);
    const onVar = (g.vars || []).some(v => { const L = g.line.slice(0, v.at).concat(v.line); return x.c.mv.length <= L.length && L.slice(0, x.c.mv.length).join(' ') === x.c.mv.join(' '); });   // ④ 変化の手順の上（見本で見せた局面）は手順の外でない（2026-11-26 担当B）
    if (SKIP.has(x.k)) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '--skip'); continue; }
    if (onVar) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '④ 変化の手順の上'); continue; }
    // ⑤・追1 見本（本筋・変化の手順）の局面と1〜2石違いで、答えが見本のその局面の手と同じ（相手の手抜き1手だけ違う＝見せた答えをもう一度、2026-11-27 担当B）
    { const lm = lineTwin(g, x.p, x.S, x.c.top[0][0]); if (lm) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '⑤ 見本の局面（' + lm + '）と同じ答え'); continue; } }
    // ④ 外れたあとの本の側の手がすべて読みの首位（lesson-verify-goopen.js と同じ。同じ局面の読みがファイルによって食い違う＝ゆれる手も落とす、2026-11-27 担当B）
    const chain = (() => { if (x.c.dev == null) return null; for (let k = x.c.dev + 1; k < x.c.mv.length; k += 2) { const kk = id + ':' + x.c.mv.slice(0, k).join(' ');
      const rs = ALL.filter(o => o[kk]).map(o => o[kk].top[0][0]); if (!rs.length) return (k + 1) + '手目 読みなし'; if (rs.some(t => t !== x.c.mv[k])) return (k + 1) + '手目 ' + x.c.mv[k] + ' が首位でない（' + rs.join('/') + '）'; } return null; })();
    // ④ 手順（本筋・変化のどれか）を最初に外れた手が相手の手（lesson-verify-goopen.js と同じ。変化の上で本の側が別の手を選んだ道は落とす、2026-11-27 担当B）
    { const st0 = startOf(g), Ls = [g.line].concat((g.vars || []).map(v => g.line.slice(0, v.at).concat(v.line)));
      const dv = Math.max(...Ls.map(L => { let k = 0; while (k < L.length && k < x.c.mv.length && L[k] === x.c.mv[k]) k++; return k; }));
      if (dv < x.c.mv.length && (dv % 2 ? 3 - st0.turn : st0.turn) === side) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '④ 手順を外れた手が本の側の手（' + (dv + 1) + '手目）'); continue; } }
    if (chain) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '④ ' + chain); continue; }
    if (g.cat === 'basic' && N >= 19) { const miss = (g.shape || ['?']).filter(m => x.p.b[R.parseCoord(m, N)] !== side); if (miss.length) { console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], '④ 布石の形がない（' + miss.join(' ') + '）'); continue; } }   // ④ 19路の布石：形（g.shape）がそろった局面だけ（2026-11-27 担当B）
    const far = farOf(g, x.c.top[0][0]);   // ④ 19路の定石：答えが定石の隅（本筋・変化の石から4路以内）
    const d0 = x.c.dev === 0 && !/^fuseki_/.test(g.id) && (g.n || 19) >= 19;   // ④ 19路の定石：相手が1手目から外れると定石が始まっていない（2026-11-26 担当B）
    console.log(id, x.c.mv.join(' '), '→', x.c.top[0][0], d0 ? '④ 相手が1手目から外れている' : far ? '④ 定石の隅から離れている' : near ? '⑤ ' + near.who : mine ? '⑤ 同じ本 ' + mine.c.mv.join(' ') : 'ok'); if (!d0 && !far && !near && !mine && pick.length < 5) pick.push(x); }
  console.log(id, '選んだ', pick.length); if (pick.length === 5) pick.forEach(x => PICKED.push(Object.assign(x, { N })));
  if (WRITE && pick.length === 5) { g.problems = pick.map(x => { const on = g.line.slice(0, x.c.mv.length).join(' ') === x.c.mv.join(' ');
      if (on) RD.pos[id + '@' + x.c.mv.length] = { turn: x.c.turn, pol: x.c.pol, top: x.c.top, deep: { pol: x.c.deep.pol, top: x.c.deep.top } };
      else RD.pos[id + '@' + x.c.mv.join(' ')] = { turn: x.c.turn, pol: x.c.pol, top: x.c.top, deep: { pol: x.c.deep.pol, top: x.c.deep.top } };
      const dv = x.c.dev;   // 途中の局面の読みで、先に入れた問題の2つの読み（deep）を上書きしない（2026-11-26 19路）
      for (let k = dv + 1; k < x.c.mv.length; k++) { const kk = id + ':' + x.c.mv.slice(0, k).join(' '); const rk = id + '@' + x.c.mv.slice(0, k).join(' '); if (C[kk] && C[kk].top[0][0] === x.c.mv[k] && !(RD.pos[rk] && RD.pos[rk].deep)) RD.pos[rk] = { turn: C[kk].turn, pol: C[kk].pol, top: C[kk].top }; }
      return on ? { at: x.c.mv.length, ok: [x.c.top[0][0]] } : { at: x.c.mv.length, mv: x.c.mv, ok: [x.c.top[0][0]] }; });
    g.verified = true; }
}
if (WRITE) { fs.writeFileSync(path.join(ROOT, 'go/openings.json'), JSON.stringify(O)); fs.writeFileSync(path.join(ROOT, 'go/tools/data/openings-reads.json'), JSON.stringify(RD)); }
