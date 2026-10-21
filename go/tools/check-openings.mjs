// Engine check for openings data files (joseki / fuseki studies).
//   node go/tools/check-openings.mjs [data/openings-joseki.json] [--visits 80] [--set id] [--write]
//   node go/tools/check-openings.mjs --line "Q16 R14 O16" [--start "D4:b D16:w Q4:w"] [--turn 1]
// For every move of every main line and side line: policy rank, engine best move, points lost by the mover,
// and Black's lead after the move. Results are cached per position in go/tools/data/.engine-cache.json,
// so re-runs are cheap. --write stores `evals` (main line) back into the data file.
import fs from 'fs';
import path from 'path';
import { load, policy, analyze, R } from './golib.mjs';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const VISITS = +opt('--visits', 80), KOMI = +opt('--komi', 6.5);
const CACHE_FILE = path.join(DIR, 'data', '.engine-cache.json');
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { }
let dirty = 0;
const saveCache = () => { if (dirty) { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); dirty = 0; } };

let E = null;
async function engine() { return E || (E = await load('strong')); }

function specKey(spec) {
  const p = R.Pos.from(spec);
  return spec.n + ':' + p.spec().stones.replace(/\.+$/, '') + ':' + p.turn;
}
// cached analysis of the position spec + moves: { lead (Black's view), turn, top: [[mv, visits, leadMover]], pol: [[mv, prior]] }
export async function evalPos(spec, moves, visits = VISITS) {
  const key = specKey(spec) + '|' + moves.join(' ') + '|' + visits + '|' + KOMI;
  if (cache[key]) return cache[key];
  const E = await engine(), n = spec.n, mv = moves.map(m => R.parseCoord(m, n));
  const pol = policy(E, spec, mv, KOMI, 8);
  const a = analyze(E, spec, mv, KOMI, visits);
  const sg = pol.turn === 1 ? 1 : -1;
  const r = {
    turn: pol.turn, lead: Math.round(a.lead * sg * 100) / 100,
    top: a.list.slice(0, 8).map(e => [R.coord(e.m, n), e.n, Math.round(e.lead * 100) / 100]),
    pol: pol.list.slice(0, 12).map(e => [R.coord(e.m, n), Math.round(e.p * 1000) / 1000]),
  };
  cache[key] = r; dirty++;
  if (dirty >= 10) saveCache();
  return r;
}
// check one line: rows {k, mv, rank, prior, best, loss, lead}
export async function checkLine(spec, moves, visits = VISITS) {
  const rows = [];
  let pre = await evalPos(spec, [], visits);
  for (let k = 0; k < moves.length; k++) {
    const post = await evalPos(spec, moves.slice(0, k + 1), visits);
    const sg = pre.turn === 1 ? 1 : -1;
    const bestLead = pre.top.length ? pre.top[0][2] : pre.lead * sg;   // mover's view
    // value of the played move: if it was searched with enough visits, average with its own search value
    const own = pre.top.find(e => e[0] === moves[k]);
    let val = post.lead * sg;
    if (own && own[1] >= 8) val = (val + own[2]) / 2;
    const loss = Math.max(0, Math.round((bestLead - val) * 10) / 10);
    const ri = pre.pol.findIndex(e => e[0] === moves[k]);
    rows.push({ k: k + 1, mv: moves[k], rank: ri + 1, prior: ri >= 0 ? pre.pol[ri][1] : 0, best: pre.top.length ? pre.top[0][0] : '', loss, lead: Math.round(post.lead * 10) / 10, pre });
    pre = post;
  }
  return rows;
}
export function startSpec(set) {
  const n = set.n || 19;
  if (set.start && set.start.stones) return set.start;
  const p = new R.Pos(n);
  if (set.start) {
    for (const s of set.start.ab || []) p.put(R.parseCoord(s, n), 1);
    for (const s of set.start.aw || []) p.put(R.parseCoord(s, n), 2);
    if (set.start.turn) p.turn = set.start.turn;
  }
  return p.spec();
}
const fmt = r => `${String(r.k).padStart(3)} ${r.mv.padEnd(4)} rank ${String(r.rank || '-').padStart(2)} p ${(r.prior * 100).toFixed(0).padStart(3)}%  best ${r.best.padEnd(4)} loss ${r.loss.toFixed(1).padStart(4)}  lead(B) ${r.lead.toFixed(1).padStart(5)}`;

async function main() {
  if (args.includes('--line')) {
    const st = opt('--start', 'D4:b D16:w Q4:w');
    const n = +opt('--n', 19), p = new R.Pos(n);
    for (const t of st.split(/\s+/).filter(Boolean)) { const [s, c] = t.split(':'); p.put(R.parseCoord(s, n), c === 'b' ? 1 : 2); }
    p.turn = +opt('--turn', 1);
    const moves = opt('--line').split(/\s+/).filter(Boolean);
    const rows = await checkLine(p.spec(), moves);
    for (const r of rows) console.log(fmt(r) + '   top ' + r.pre.top.slice(0, 4).map(e => e[0] + ':' + e[1] + ':' + e[2].toFixed(1)).join(' '));
    const last = await evalPos(p.spec(), moves);
    console.log('next: ' + last.top.slice(0, 6).map(e => e[0] + ':' + e[1] + ':' + e[2].toFixed(1)).join(' '));
    saveCache(); return;
  }
  const file = path.resolve(args.find(a => a.endsWith('.json')) || path.join(DIR, 'data', 'openings-joseki.json'));
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const only = opt('--set', null), MAXM = +opt('--max-main', 1.5), MAXV = +opt('--max-var', 2.5);
  const summary = [];
  for (const set of data.sets) {
    if (only && set.id !== only) continue;
    const spec = startSpec(set);
    const rows = await checkLine(spec, set.line);
    console.log(`\n== ${set.id}  (${set.title.ja})  ${set.line.length} moves`);
    for (const r of rows) console.log(fmt(r) + (r.loss > MAXM ? '   <-- LOSS' : ''));
    let maxv = 0;
    for (const v of set.vars || []) {
      const vr = await checkLine(spec, set.line.slice(0, v.at).concat(v.line));
      const tail = vr.slice(v.at);
      console.log(`  -- var at ${v.at}: ${v.line.join(' ')}`);
      for (const r of tail) { console.log('  ' + fmt(r) + (r.loss > MAXV ? '   <-- LOSS' : '')); maxv = Math.max(maxv, r.loss); }
    }
    // problems: ok must be the line move
    for (const pr of set.problems || []) {
      if (!pr.ok.includes(set.line[pr.at]) && !pr.note) console.log(`  !! problem at ${pr.at}: ok ${pr.ok} != line ${set.line[pr.at]}`);
      if (pr.at >= set.line.length) console.log(`  !! problem at ${pr.at}: beyond the line`);
      const turn = rows[pr.at] ? rows[pr.at].pre.turn : 0;
      if (turn !== set.side) console.log(`  .. problem at ${pr.at}: asks the opponent's move (colour ${turn})`);
    }
    const maxm = Math.max(...rows.map(r => r.loss));
    summary.push({ id: set.id, ja: set.title.ja, moves: set.line.length, maxMain: maxm, maxVar: maxv, probs: (set.problems || []).length });
    if (args.includes('--write')) set.evals = rows.map(r => r.lead);
    saveCache();
  }
  console.log('\n id                         moves  maxLoss(main)  maxLoss(vars)  problems  title');
  for (const s of summary) console.log(` ${s.id.padEnd(26)} ${String(s.moves).padStart(5)}  ${s.maxMain.toFixed(1).padStart(13)}  ${s.maxVar.toFixed(1).padStart(13)}  ${String(s.probs).padStart(8)}  ${s.ja}`);
  if (args.includes('--write')) fs.writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
  saveCache();
}
if (process.argv[1] && process.argv[1].endsWith('check-openings.mjs')) main();
