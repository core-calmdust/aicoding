// search small variations of a base position for problems with a unique solver answer.
//   node lessons-search.mjs <config.mjs>   config: { n, turn, ab, aw, goal, tgt, extraB, extraW, kB, kW, depth, region, filter(win, spec) }
import { specFromLists, solveFirst, legalSetup, show, R } from './lessons-lib.mjs';
const C = (await import(process.argv[2])).default;
const n = C.n, out = [];
const combos = (arr, k) => k === 0 ? [[]] : arr.flatMap((x, i) => combos(arr.slice(i + 1), k - 1).map(c => [x, ...c]));
const setsB = [], setsW = [];
for (let k = 0; k <= (C.kB || 0); k++) setsB.push(...combos(C.extraB || [], k));
for (let k = 0; k <= (C.kW || 0); k++) setsW.push(...combos(C.extraW || [], k));
const t0 = Date.now();
for (const eb of setsB) for (const ew of setsW) {
  if (Date.now() - t0 > (C.time || 100000)) break;
  const spec = specFromLists(n, C.ab.concat(eb), C.aw.concat(ew), C.turn);
  if (legalSetup(spec).length) continue;
  if (C.pre && !C.pre(spec)) continue;
  const r = solveFirst(spec, C.goal, C.tgt, { depth: C.depth, region: C.region, maxLibs: C.maxLibs });
  if (r.wins.length >= 1 && r.wins.length <= (C.maxWins || 1) && (!C.filter || C.filter(r.wins, spec))) out.push({ eb, ew, wins: r.wins, spec });
}
for (const o of out.slice(0, C.show || 8)) { console.log(JSON.stringify({ eb: o.eb, ew: o.ew, wins: o.wins })); console.log(show(o.spec)); }
console.log('found', out.length);
