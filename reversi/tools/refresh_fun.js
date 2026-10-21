// One-off (2026-10-21): replace puzzles whose fun score (fun.js) is below MIN with new, more enjoyable puzzles of the
// same category (level: same empties range; theme / unique: the theme tag holds), the same goal type, about the same
// number of empties and a difficulty D between the neighbouring puzzles (so each set still goes easy -> hard).
// Candidates come from harvest.js (self-play positions, exact analysis by feat.js); slots never move (ids "<level>:<i>").
// The replaced content is kept in P.old["<level>:<i>"]: the app keeps showing it to players who already have a record for
// that slot, and the daily puzzle keeps it for dates <= P.cut.
// usage: node refresh_fun.js score <harvest.jsonl> <out.jsonl>        (fun-score candidates; resumable; shard with SHARD=n/i)
//        node refresh_fun.js apply <current-fun.jsonl> <scored.jsonl>... (fun.js output for the current set, then candidates)
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '..');
const { funScore, funFrom } = require('./fun.js');
const { canon } = require('./feat.js');
const CUT = '2026-10-21', MIN = 60, TARGET = 70;

// themes.py (objective theme criteria on feat.js features), ported
function themes(F, g) {
  const t = g.type, e = F.e, nm = F.nm, o = {};
  o.parityOk = F.regSol % 2 === 1 && F.evenRegMoves > 0 && F.failEven > 0 && F.nReg >= 2;
  o.parity = F.regSol % 2 === 0 && F.oddRegMoves > 0 && F.failOdd > 0;
  o.pass = F.passes > 0;
  o.greedy = F.nMaxF === 1 && F.fsol < F.maxF && F.maxFFail && nm >= 3;
  o.corner = F.cornerMoves > 0 && F.cornerFail === F.cornerMoves && !F.solCorner;
  o.xc = F.solX || F.solC;
  o.quiet = F.fsol === F.minF && F.nMinF === 1 && nm >= 3 && F.maxF - F.minF >= 3;
  o.edge = F.solEdge && F.nonEdgeMoves > 0 && nm >= 3;
  o.block = F.oppMob === F.minOppMob && F.nMinOpp === 1 && F.maxOppMob - F.oppMob >= 2;
  o.draw = t === 'draw';
  o.margin = t === 'margin' && F.nWin >= 2;
  o.surprise = nm >= 4 && F.shRank >= Math.max(2, Math.floor(nm / 2));
  o.only = t === 'win' && nm >= 6 && F.nLose === nm - 1;
  o.comeback = ['win', 'margin', 'wipe'].includes(t) && F.mine * 10 <= (F.mine + F.theirs) * 3;
  o.wipe = t === 'wipe' && e >= 3;
  o.sym = F.emptySym !== 0 && e >= 4;
  o.close = t === 'win' && F.best === 2 && nm >= 3;
  return Object.keys(o).filter(k => o[k]);
}
// build.py's difficulty estimate
const Dof = (F, g) => Math.round((-5.87 + 1.89 * F.e + 9.16 * Math.log(F.nm) + 0.5 * F.shRank / Math.max(1, F.nm - 1) + 0.38 * F.passes
  + 1.86 * (g.type === 'margin') + 3.6 * F.nLose / F.nm + 1.25 * (F.fsol === F.minF) + 0.25 * F.oppMob) * 10) / 10;
const lines = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];

const [mode, ...args] = process.argv.slice(2);
if (mode === 'score') {
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
  const E = require(path.join(DIR, 'engine.js')); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
  const [inp, out] = args, [mod, rem] = (process.env.SHARD || '1/0').split('/').map(Number);
  const done = new Set(lines(out).map(r => r.key));
  lines(inp).forEach((r, i) => {
    if (i % mod !== rem || done.has(r.key)) return;
    const A = { goal: r.goal, sol: r.sol, F: r.F, scores: r.scores };
    // optimistic bound (best possible depth part) before the costly main-line analysis
    if (funFrom(A, { traps: 9, free: 0, forced: 0 }).fun < TARGET) { fs.appendFileSync(out, JSON.stringify({ key: r.key, fun: 0 }) + '\n'); return; }
    const f = funScore(E, r.cells.split('').map(Number), r.toMove, r.goal);
    fs.appendFileSync(out, JSON.stringify({ key: r.key, fun: f.fun, parts: f.parts, cells: r.cells, toMove: r.toMove, goal: r.goal, F: r.F, T: themes(r.F, r.goal), D: Dof(r.F, r.goal) }) + '\n');
  });
} else if (mode === 'apply') {
  const file = path.join(DIR, 'puzzles.json'), P = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (P.old) { console.error('already refreshed'); process.exit(1); }
  const texts = JSON.parse(fs.readFileSync(path.join(__dirname, 'texts.json'), 'utf8'));
  const cur = new Map(lines(args[0]).map(r => [r.id, r.fun]));
  const used = new Set(); P.levels.forEach(L => L.puzzles.forEach(p => used.add(canon(p.cells.split('').map(Number), p.toMove))));
  const seen = new Set(), C = [];
  for (const f of args.slice(1)) for (const r of lines(f)) if (r.fun >= TARGET && !used.has(r.key) && !seen.has(r.key)) { seen.add(r.key); C.push(r); }
  console.log('fun candidates', C.length);
  const range = {}; P.levels.forEach(L => { const es = L.puzzles.map(p => p.e); range[L.id] = [Math.min(...es), Math.max(...es)]; });
  const fits = (L, p, c) => {
    if (c.goal.type !== p.goal.type || Math.abs(c.F.e - p.e) > 1) return false;
    const [lo, hi] = range[L.id]; if (c.F.e < lo || c.F.e > hi) return false;
    if (L.id === 'p6') return c.fun >= 80 && c.T.includes('greedy') && c.T.length >= 3;   // "masterpieces": the best only
    const tag = texts[L.id] && texts[L.id].tag;
    if (L.cat !== 'level' && tag && !c.T.includes(tag)) return false;
    return true;
  };
  // worst slots first, so the scarce candidates go where they help most
  const jobs = [];
  P.levels.forEach(L => L.puzzles.forEach((p, i) => { const id = L.id + ':' + i, f = cur.get(id); if (f != null && f < MIN) jobs.push({ L, i, id, f }); }));
  jobs.sort((a, b) => a.f - b.f || (a.id < b.id ? -1 : 1));
  P.old = {}; P.cut = CUT;
  const got = {}, miss = {};
  for (const j of jobs) {
    const ps = j.L.puzzles, p = ps[j.i];
    const lo = Math.min(p.D, j.i > 0 ? ps[j.i - 1].D : p.D) - 1.5, hi = Math.max(p.D, j.i + 1 < ps.length ? ps[j.i + 1].D : p.D) + 1.5;
    let best = -1, bs = 1e9;
    C.forEach((c, k) => {
      if (c.taken || c.D < lo || c.D > hi || !fits(j.L, p, c)) return;
      const s = Math.abs(c.D - p.D) + Math.abs(c.F.e - p.e) * 2 - c.fun * 0.1;
      if (s < bs) { bs = s; best = k; }
    });
    const k = j.L.id; got[k] = got[k] || 0; miss[k] = miss[k] || 0;
    if (best < 0) { miss[k]++; continue; }
    const c = C[best]; c.taken = true; got[k]++;
    const own = texts[k] && texts[k].tag;
    let tags = c.T.slice(); if (own && tags.includes(own)) { tags.splice(tags.indexOf(own), 1); tags.unshift(own); }
    tags = tags.filter(t => t !== 'margin' || own === 'margin').slice(0, 4);
    P.old[j.id] = p;
    ps[j.i] = { cells: c.cells, toMove: c.toMove, goal: c.goal, e: c.F.e, tags, D: c.D, fun: c.fun };
  }
  fs.writeFileSync(file, JSON.stringify(P));
  const tot = {}; P.levels.forEach(L => tot[L.id] = L.puzzles.length);
  for (const k in got) console.log(k.padEnd(11), 'replaced', got[k], '/ below', got[k] + miss[k], '/ total', tot[k]);
  console.log('replaced', Object.values(got).reduce((a, b) => a + b, 0), 'of', jobs.length);
}
