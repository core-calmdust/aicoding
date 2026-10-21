// Node library over the WebAssembly Go engine, for content tools (openings / lessons / puzzles checks).
//   import { load, analyze, policy, ownership, verifyLine, gtp } from './golib.mjs'
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
export const R = require(path.join(DIR, '..', 'rules.js'));
export const PASS = -1;
const cache = {};
export async function load(name = 'strong') {
  if (cache[name]) return cache[name];
  const wasm = fs.readFileSync(path.join(DIR, '..', 'engine_simd.wasm'));
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const E = instance.exports;
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, '..', name === 'light' ? 'net_light.bin.gz' : 'net_strong.bin.gz')));
  const p = E.galloc(raw.length); new Uint8Array(E.memory.buffer).set(raw, p);
  if (E.net_load(p, raw.length) < 0) throw new Error('net');
  E.set_seed(12345);
  return (cache[name] = E);
}
const ePos = (i, n) => i === PASS ? 361 : Math.floor(i / n) * 19 + (i % n);
const iPos = (p, n) => p === 361 ? PASS : Math.floor(p / 19) * n + (p % 19);
export const coord = (i, n) => R.coord(i, n);
export const parse = (s, n) => R.parseCoord(s, n);
// moves given as GTP strings ("D4") or indices
export function norm(moves, n) { return moves.map(m => typeof m === 'number' ? m : R.parseCoord(m, n)); }
function setPos(E, spec, moves, komi) {
  const n = spec.n;
  E.pos_reset(n, komi);
  const sp = R.Pos.from(spec);
  for (let i = 0; i < n * n; i++) if (sp.b[i]) E.pos_put(ePos(i, n), sp.b[i]);
  E.pos_tomove(sp.turn);
  for (const m of moves) if (!E.pos_play(ePos(m, n))) throw new Error('illegal ' + R.coord(m, n));
}
// raw net: policy (sorted), lead / winrate for the side to move, ownership (black view)
export function policy(E, spec, moves, komi = 7.5, nsym = 8) {
  const n = spec.n; setPos(E, spec, moves, komi);
  const ptr = E.eval_root(nsym), f = new Float32Array(E.memory.buffer, ptr, 727);
  const out = [];
  for (let i = 0; i < n * n; i++) { const p = f[ePos(i, n)]; if (p > 0) out.push({ m: i, p }); }
  out.push({ m: PASS, p: f[361] });
  out.sort((a, b) => b.p - a.p);
  const turn = R.replay(spec, moves).pos.turn, sg = turn === 1 ? 1 : -1;
  const own = []; for (let i = 0; i < n * n; i++) own.push(f[366 + ePos(i, n)] * sg);
  return { list: out, lead: f[365], wr: (f[362] - f[363] + 1) / 2, own, turn };
}
// search: [{m, n, p, lead, wr}] mover's view, best first
export function analyze(E, spec, moves, komi = 7.5, visits = 200) {
  const n = spec.n; setPos(E, spec, moves, komi);
  E.set_param(5, 0);
  E.search_init(600000);
  E.search_run(visits);
  const ptr = E.search_result(362), f = new Float32Array(E.memory.buffer, ptr, 4 + 7 * 362);
  const out = [];
  for (let j = 0; j < f[0]; j++) { const o = 4 + j * 7; if (f[o + 1] > 0) out.push({ m: iPos(f[o], n), n: f[o + 1], p: f[o + 2], lead: f[o + 5], wr: (f[o + 4] + 1) / 2 }); }
  return { lead: f[3], wr: (f[2] + 1) / 2, list: out };
}
// check a move sequence: for every move, its policy prior / rank and the points it loses against the engine's best
export function verifyLine(E, spec, moves, komi = 7.5, visits = 120) {
  const n = spec.n, rows = [];
  for (let k = 0; k < moves.length; k++) {
    const pre = moves.slice(0, k), pol = policy(E, spec, pre, komi, 8);
    const rank = pol.list.findIndex(e => e.m === moves[k]);
    const a = analyze(E, spec, pre, komi, visits);
    const best = a.list[0];
    const after = analyze(E, spec, moves.slice(0, k + 1), komi, Math.max(40, visits >> 1));
    const loss = best ? best.lead - (-after.lead) : 0;   // points lost by the mover with this move
    rows.push({ k: k + 1, mv: R.coord(moves[k], n), prior: rank >= 0 ? pol.list[rank].p : 0, rank: rank + 1, best: best ? R.coord(best.m, n) : '', loss: Math.round(loss * 10) / 10, lead: Math.round(-after.lead * 10) / 10 });
  }
  return rows;
}
// ownership-based dead stones / territory estimate (black view)
export function ownership(E, spec, moves, komi = 7.5) { return policy(E, spec, moves, komi, 8).own; }
export function board(spec, moves) { return R.replay(spec, moves).pos; }
export function show(pos) {
  const n = pos.n; let s = '   ' + R.COLS.slice(0, n).split('').join(' ') + '\n';
  for (let y = 0; y < n; y++) { s += String(n - y).padStart(2) + ' '; for (let x = 0; x < n; x++) { const v = pos.b[y * n + x]; s += (v === 1 ? 'X' : v === 2 ? 'O' : '.') + ' '; } s += '\n'; }
  return s;
}
