// candidate generator: random realistic games -> classified positions with exact values of every legal move.
// usage: node gen.js <n> <minutes> ; resumable (state in CK/gen_state_<n>.json, output CK/cand_<n>.jsonl)
'use strict';
const L = require('./lib.js'), { E } = L;
const fs = require('fs');
const n = +process.argv[2], minutes = +process.argv[3] || 10;
const OUT = `${L.CK}/cand_${n}.jsonl`, STATE = `${L.CK}/gen_state_${n}.json`;
const QUOTA = +process.env.QUOTA || 500;
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { seed: 1000 * n + 1, games: 0 };
const have = {}, seen = new Set();
for (const c of L.readJsonl(OUT)) { for (const k of c.kinds) have[k] = (have[k] || 0) + 1; seen.add(c.edges.join(',')); }
const native = new L.Native(n);
const G = E.geom(n, n);

function randomGame(r) {
  const p = new E.Pos(G), owners = new Int8Array(G.B).fill(-1), snaps = [], moves = [];
  let turn = 0;
  const sacP = 0.06 + r() * 0.08, declP = 0.35;
  while (p.undrawn > 0) {
    snaps.push({ edges: p.edges(), owners: Array.from(owners), turn, ply: moves.length });
    const legal = p.legal();
    let e;
    const caps = legal.filter(x => p.completes(x) > 0);
    if (caps.length) {
      const cm = E.captureMoves(p);
      if (cm.forced === undefined && cm.declines.length && r() < declP) e = L.pick(cm.declines, r);
      else e = L.pick(caps, r);
    } else {
      const safe = legal.filter(x => p.gives(x) === 0);
      if (safe.length && r() > sacP) e = L.pick(safe, r);
      else if (safe.length) { const s1 = legal.filter(x => p.gives(x) === 1); e = L.pick(s1.length ? s1 : legal, r); }
      else e = L.pick(legal, r);
    }
    const k = p.play(e); moves.push(e);
    if (k) { for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4 && owners[b] < 0) owners[b] = turn; }
    else turn ^= 1;
  }
  return snaps;
}
// structural pre-classification -> list of kinds worth solving
function preKinds(f, ply) {
  const out = [], { safe, caps, legal } = f;
  if (!legal.length || legal.length < 3) return out;
  if (caps.length) {
    const cm = E.captureMoves(f.p);
    if (cm.forced !== undefined) { if (legal.length > caps.length) out.push('take'); }
    else out.push('decide');
    return out;
  }
  if (!safe.length) { if (f.comps.length >= 2) out.push('loony'); return out; }
  out.push('pre');
  return out;
}
function loopRun(p) {   // a capturable run of 4 with both ends capturable (opened loop, all-but-four point)
  const G = p.G;
  for (let b = 0; b < G.B; b++) {
    if (p.cnt[b] !== 3) continue;
    const e = p.missing(b, -1); let cur = p.other(e, b), prev = e, len = 1;
    if (cur < 0 || p.cnt[cur] !== 2) continue;
    len = 2;
    for (;;) { const f = p.missing(cur, prev), nx = p.other(f, cur); if (nx < 0 || p.cnt[nx] <= 1) break; len++; if (p.cnt[nx] === 3) { if (len === 4) return true; break; } prev = f; cur = nx; if (len > 60) break; }
  }
  return false;
}
const isHard = (p, e) => { const G = p.G, a = G.eb0[e], b = G.eb1[e]; return a >= 0 && b >= 0 && p.cnt[a] === 2 && p.cnt[b] === 2 && E.components(p, true).some(c => c.n === 2 && !c.loop && c.simple && c.boxes.includes(a) && c.boxes.includes(b)); };
function classify(f, sol, ply) {
  const { p, safe, caps, legal, comps } = f, vals = sol.vals, best = L.bestSet(vals), bs = new Set(best);
  const eq = (a, b) => a.length === b.length && a.every(x => b.includes(x));
  const kinds = [];
  const vOf = new Map(vals);
  if (caps.length) {
    const cm = E.captureMoves(p);
    if (cm.forced !== undefined) { if (eq(best, caps) || (best.every(e => caps.includes(e)))) kinds.push('take'); return kinds; }
    // decision point: take vs decline. loop if two boxes are capturable inside the same component (both ends)
    const c3 = []; for (let b = 0; b < p.G.B; b++) if (p.cnt[b] === 3) c3.push(b);
    const cand = cm.moves.concat(cm.declines), cv = cand.map(e => vOf.get(e));
    const top = Math.max(...cv);
    if (cv.filter(x => x === top).length !== 1 || !best.every(e => cand.includes(e))) return kinds;
    const declineBest = cm.declines.includes(best[0]);
    const loop = loopRun(p);
    if (loop) kinds.push('loopdec'); else if (declineBest) kinds.push('double');
    kinds.push(declineBest ? 'ctl_decline' : 'ctl_take');
    return kinds;
  }
  if (!safe.length) {   // loony start: which component to open, and how
    const compOf = e => comps.findIndex(c => { const a = p.G.eb0[e], b = p.G.eb1[e]; return c.boxes.includes(a) || c.boxes.includes(b); });
    const ci = new Set(best.map(compOf));
    if (ci.size !== 1) return kinds;
    const C = comps[[...ci][0]];
    const sizes = comps.map(c => c.n), minN = Math.min(...sizes), strictMin = sizes.filter(x => x === minN).length === 1;
    if (best.length === 1 && isHard(p, best[0])) kinds.push('hard');
    else if (C.simple && !C.loop && C.n === minN && strictMin && C.n !== 2) kinds.push('chain');
    if (comps.some(c => c.loop) && C.loop) kinds.push('loopopen');
    if (comps.length >= 3 && !(C.n === minN && strictMin && !C.loop)) kinds.push('count');
    else if (comps.length >= 3) kinds.push('count_easy');
    return kinds;
  }
  // safe moves remain
  if (eq(best, safe) && legal.length > safe.length) kinds.push(n === 3 ? 'safe' : 'third');
  const worseSafe = safe.filter(e => !bs.has(e));
  if (best.every(e => safe.includes(e)) && worseSafe.length && best.length <= Math.max(1, Math.floor(safe.length / 3))) kinds.push('parity');
  if (best.every(e => p.gives(e) > 0) && best.length <= 2) kinds.push('sacrifice');
  if (best.length <= 3 && vals.filter(x => !bs.has(x[0])).length >= legal.length / 2) {
    if (n === 3 && ply <= 12) kinds.push('open3');
    if (n >= 4) kinds.push('mid' + n);
  }
  return kinds;
}
const t0 = Date.now();
async function main() {
  let solved = 0;
  while (Date.now() - t0 < minutes * 60000) {
    const r = L.rng(st.seed++); st.games++;
    const snaps = randomGame(r);
    // look at a few snapshots per game
    for (const s of snaps) {
      if (r() > (n === 3 ? 0.5 : 0.35)) continue;
      const key = s.edges.join(','); if (seen.has(key)) continue;
      const f = L.feats(n, s.edges), pk = preKinds(f, s.ply);
      if (!pk.length) continue;
      // budget: skip when every kind this could become is already full
      if (n === 5 && f.safe.length > 13) continue;
      if (n === 4 && f.safe.length > 16) continue;
      let sol;
      if (native) sol = await native.solve(s.edges);
      else { sol = L.jsSolve(n, s.edges, 6000); if (!sol) continue; }
      solved++;
      const kinds = classify(f, sol, s.ply).filter(k => (have[k] || 0) < QUOTA);
      if (!kinds.length) continue;
      seen.add(key);
      // relabel: the player to move is player 0
      const owners = s.owners.map(o => o < 0 ? -1 : (o === s.turn ? 0 : 1));
      L.appendLine(OUT, { n, edges: s.edges, owners, ply: s.ply, kinds, v: sol.v, vals: sol.vals });
      for (const k of kinds) have[k] = (have[k] || 0) + 1;
    }
    if (st.games % 20 === 0) L.atomicWrite(STATE, JSON.stringify(st));
  }
  L.atomicWrite(STATE, JSON.stringify(st));
  console.log(`n=${n} games=${st.games} solved=${solved}`, JSON.stringify(have));
  if (native) native.close();
}
main();
