// Candidate practice positions for the go/open sets (2026-11-26 第2期・担当B, claude/lesson-quality.md「go/open」):
//   node go/tools/op-curate.mjs --sets id,id [--part 0 --of 2] [--visits 300] [--deep 1000]
// The positions: every main-line / variation position with the set's side to move, and the positions after the other side leaves
// the line (its policy moves >= 5% that are not the line move, up to 3) — the side to move then answers. Each is read like
// go/tools/openings-read.mjs (strong net: policy over 8 symmetries + a 300-visit search, komi as the 2D / 3D practice); the ones
// that pass ①②③ of tools/lesson-verify-goopen.js are read again with --deep visits (追4 / 追84: both reads must agree).
// Written to go/tools/data/op-cand.json ({ key: { id, mv, turn, pol, top, deep } }, key = id + ':' + moves).
import fs from 'fs';
import path from 'path';
import { load, analyze, policy, R } from './golib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname), OUT = path.join(DIR, 'data', 'op-cand' + (process.env.OC_TAG || '') + '.json');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VIS = +opt('--visits', 300), DEEP = +opt('--deep', 1000), PART = +opt('--part', 0), OF = +opt('--of', 1), SETS = (opt('--sets', '') || '').split(',').filter(Boolean);
// --wide (2026-11-26 13路)：外れ方を方策3%以上・5つまでに広げる。--stage2 --depth D：外れたあと D 組先まで（D=2 は --stage2 で読んだ局面からもう1組）
const WIDE = args.includes('--wide'), DEPTH = +opt('--depth', 1);
// --pmin P --pn K（2026-11-26 19路）：外れ方を方策 P 以上・K 個までに（19路の定石は外れた直後の局面がほぼ「手抜きと同じ」か「一本道」で、
// 唯一の最善が出るのは相手が少し悪い手で外れたとき。読みの合否（①②③・2つの読み）は変えない）
const PMIN = +opt('--pmin', WIDE ? 0.03 : 0.05), PN = +opt('--pn', WIDE ? 5 : 3);
// --low（2026-11-26 19路の定石）：外れ方を方策1%以上3%未満の手（相手のはっきりした悪手寄り）から5つまで。19路の定石は外れ方が自然な手だと手抜きなど同じくらいの手が並ぶため
const LOW = args.includes('--low');
const O = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'openings.json'), 'utf8'));
function specFrom(o) { const n = o.n || 19, a = Array(n * n).fill('.'); for (const s of o.ab || []) a[R.parseCoord(s, n)] = 'b'; for (const s of o.aw || []) a[R.parseCoord(s, n)] = 'w'; return { n, stones: a.join(''), turn: o.turn || 1 }; }
function startOf(g) { const n = g.n || 19; if (g.start) return specFrom(Object.assign({ n }, g.start));
  if (g.handi) { const a = Array(n * n).fill('.'); R.handicapPoints(n, g.handi).forEach(i => { a[i] = 'b'; }); return { n, stones: a.join(''), turn: 2 }; }
  return { n, stones: '.'.repeat(n * n), turn: 1 }; }
const komiOf = g => g.komi != null ? g.komi : g.handi ? 0.5 : R.defaultKomi(g.n || 19, 'jp');
export function passes(rd, ok) {   // ①②③ as tools/lesson-verify-goopen.js (one answer: the reading's first move)
  const top = rd.top, best = top[0]; if (!best || (ok && best[0] !== ok)) return false; const bl = best[2];
  const sec = top.filter(e => e[1] >= 10 && e[0] !== best[0]).sort((a, b) => b[2] - a[2])[0]; if (sec && sec[2] > bl - 1.0) return false;
  const vs = top.reduce((a, e) => a + e[1], 0); if (best[1] < 0.6 * vs) return false;
  const pa = (rd.pol.find(e => e[0] === best[0]) || [0, 0])[1], alt = rd.pol.filter(e => e[0] !== best[0] && e[1] >= 0.03).length;
  return pa <= 0.9 && alt >= 2;
}
const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const save = () => fs.writeFileSync(OUT, JSON.stringify(res));
const E = await load('strong');
const read = (g, mv, v) => { const n = g.n || 19, sp = startOf(g), m = mv.map(s => R.parseCoord(s, n)), komi = komiOf(g);
  const pol = policy(E, sp, m, komi, 8), a = analyze(E, sp, m, komi, v);
  return { turn: pol.turn, pol: pol.list.slice(0, 10).map(e => [R.coord(e.m, n), +e.p.toFixed(3)]), top: a.list.slice(0, 10).map(e => [R.coord(e.m, n), e.n, +e.lead.toFixed(2)]) }; };
const jobs = [];
for (const g of O.sets) { if (SETS.length && !SETS.includes(g.id)) continue; const n = g.n || 19, st = startOf(g), side = g.side || 1;
  const lines = [g.line].concat((g.vars || []).map(v => g.line.slice(0, v.at).concat(v.line)));
  const seen = new Set();
  for (const L of lines) for (let at = 0; at < L.length; at++) { const mover = at % 2 ? 3 - st.turn : st.turn, pre = L.slice(0, at);
    if (mover === side) { const k = g.id + ':' + pre.join(' '); if (!seen.has(k)) { seen.add(k); jobs.push({ g, mv: pre, k }); } continue; }
    // the other side leaves the line here: its likely moves (policy >= 5%) that are not the line's
    const pol = policy(E, st, pre.map(s => R.parseCoord(s, n)), komiOf(g), 8);
    pol.list.filter(e => e.m >= 0 && (LOW ? e.p >= 0.01 && e.p < 0.03 : e.p >= PMIN) && R.coord(e.m, n) !== L[at]).slice(0, LOW ? 5 : PN).forEach(e => { const mv = pre.concat([R.coord(e.m, n)]), k = g.id + ':' + mv.join(' ');
      if (!seen.has(k)) { seen.add(k); jobs.push({ g, mv, k, dev: at }); } }); } }
// --stage2: one more pair off the line — after each position where the other side left it, the side's best reply (the reading's first
// move) and the other side's likely answers (policy >= 5%, up to 2): the side to move again
if (args.includes('--stage2')) { jobs.length = 0; const all = {}; for (const f of fs.readdirSync(path.join(DIR, 'data'))) if (/^op-cand.*\.json$/.test(f)) Object.assign(all, JSON.parse(fs.readFileSync(path.join(DIR, 'data', f), 'utf8')));
  const seen = new Set(Object.keys(all));
  for (const [k, c] of Object.entries(all)) { if (c.dev == null || c.mv.length !== c.dev + 2 * DEPTH - 1) continue; const g = O.sets.find(x => x.id === c.id); if (!g || (SETS.length && !SETS.includes(g.id))) continue;
    const n = g.n || 19, mv1 = c.mv.concat([c.top[0][0]]), pol = policy(E, startOf(g), mv1.map(s => R.parseCoord(s, n)), komiOf(g), 8);
    pol.list.filter(e => e.m >= 0 && e.p >= 0.05).slice(0, 2).forEach(e => { const mv = mv1.concat([R.coord(e.m, n)]), kk = g.id + ':' + mv.join(' '); if (!seen.has(kk)) { seen.add(kk); jobs.push({ g, mv, k: kk, dev: c.dev }); } }); } }
console.log('jobs', jobs.length);
let c = 0;
for (let j = 0; j < jobs.length; j++) { if (j % OF !== PART) continue; const { g, mv, k, dev } = jobs[j];
  if (!res[k]) { res[k] = Object.assign({ id: g.id, mv, dev: dev != null ? dev : null }, read(g, mv, VIS)); if (++c % 5 === 0) save(); }
  if (passes(res[k]) && !res[k].deep) { res[k].deep = read(g, mv, DEEP); save(); console.log('pass', k, res[k].top[0], 'deep', passes(res[k].deep, res[k].top[0][0]), res[k].deep.top[0]); } }
save(); console.log('done', PART);
