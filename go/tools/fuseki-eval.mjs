// cached engine analysis of positions for the fuseki studies.
// node fuseki-eval.mjs <n> <komi> <hc> "moves" [visits]  -> per-move table (loss, best, top moves)
import fs from 'fs';
import path from 'path';
import { load, analyze, policy, norm, R } from './golib.mjs';
const DIR = path.dirname(new URL(import.meta.url).pathname);
export { R };
export const CACHE_FILE = path.join(DIR, 'data', 'fuseki-cache.json');
let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
let dirty = 0, E = null;
export function save() { if (dirty) { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); dirty = 0; } }
export function mkspec(n, hc) { const s = { n, turn: hc ? 2 : 1 }; if (hc) s.stones = R.handicapPoints(n, hc).map(i => [i, 1]); return s; }
// root analysis of a position: { lead (Black view), top: [[gtp, leadBlackView, visits, prior]], turn }
export async function node(n, komi, hc, moves, visits = 160) {
  const key = `${n}|${komi}|${hc}|${moves.join(' ')}`;
  const c = cache[key];
  if (c && c.v >= visits) return c;
  if (!E) E = await load('strong');
  const spec = mkspec(n, hc), mv = norm(moves, n);
  const a = analyze(E, spec, mv, komi, visits);
  const turn = R.replay(spec, mv).pos.turn, sg = turn === 1 ? 1 : -1;
  const pr = {}; a.list.slice().sort((x, y) => y.p - x.p).slice(0, 12).forEach((e, i) => pr[R.coord(e.m, n)] = [i + 1, Math.round(e.p * 100)]);
  const r = { v: visits, turn, lead: Math.round(a.lead * sg * 100) / 100,
    top: a.list.slice(0, 10).map(e => [R.coord(e.m, n), Math.round(e.lead * sg * 100) / 100, e.n]), pol: pr };
  cache[key] = r; dirty++; if (dirty >= 5) save();
  return r;
}
// evaluate a line: rows {k, mv, color, lead (B view after move), best, bestLead, loss, rank}
export async function line(n, komi, hc, moves, visits = 160) {
  const rows = [];
  let prev = await node(n, komi, hc, [], visits);
  for (let k = 0; k < moves.length; k++) {
    const cur = await node(n, komi, hc, moves.slice(0, k + 1), visits);
    const sg = prev.turn === 1 ? 1 : -1;
    const best = prev.top[0];
    // value of the played move: mover view; use the deeper of (child root lead) and the parent's child stat when visited a lot
    const ch = prev.top.find(t => t[0] === moves[k]);
    let val = cur.lead; if (ch && ch[2] >= 30) val = (val + ch[1]) / 2;
    const bestV = Math.max(...prev.top.filter(t => t[2] >= 10).map(t => t[1] * sg), best[1] * sg) * sg;
    const loss = Math.max(0, Math.round((bestV - val) * sg * 10) / 10);
    rows.push({ k: k + 1, mv: moves[k], c: sg > 0 ? 'B' : 'W', lead: Math.round(cur.lead * 10) / 10, best: best[0], loss, pol: prev.pol[moves[k]] ? prev.pol[moves[k]][0] : 99,
      alts: prev.top.filter(t => t[2] >= 8).slice(0, 5).map(t => t[0] + ':' + t[1].toFixed(1)).join(' ') });
    prev = cur;
  }
  save();
  return rows;
}
if (process.argv[1] && process.argv[1].endsWith('fuseki-eval.mjs')) {
  const [n, komi, hc] = [+process.argv[2], +process.argv[3], +process.argv[4]];
  const moves = (process.argv[5] || '').split(/\s+/).filter(Boolean);
  const rows = await line(n, komi, hc, moves, +(process.argv[6] || 160));
  for (const r of rows) console.log(`${String(r.k).padStart(2)}${r.c} ${r.mv.padEnd(4)} lead ${r.lead.toFixed(1).padStart(5)} loss ${r.loss.toFixed(1)} pol#${r.pol} best ${r.best.padEnd(4)} | ${r.alts}`);
}
