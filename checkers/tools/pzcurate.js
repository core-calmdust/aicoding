// Puzzle collection v3 (2026-10-28): rebuild checkers/puzzles.json as 10 courses × 50 that mix themes, ramp in difficulty
// and never put two look-alike puzzles next to each other (v1/v2 were "50 × win in 1", "50 × win in 2", … in a row).
// Every candidate is re-verified with the engine (tools/fun.js: legal, ≥ 2 moves, exactly one first move reaching the goal
// in the minimal number of own moves, the main line really reaches it, score ≥ MINFUN), then tagged from its solution:
//   quick  win in 1 (only a handful, only at the very start of step1)
//   kings  kings-only ending          opp    men-only ending (tempo / opposition, blocks)
//   guard  the opponent threatens a capture right now and the key move is not a capture (defend, then win)
//   combo  the attacker makes a double / triple jump on the way      sac   the key (or a later own) move is a sacrifice
//   crown  a man breaks through and crowns on the way                block the finish leaves the opponent pieces but no move
//   win / gain  everything else
// Courses (group): step1..step4 (Step: mixed, n 1-3 → 4-7), shots / combo / crown / guard (Tac), kings / menend (End).
// Progress: puzzles that already existed keep their stars — "mig" maps the old record key (themeId-j of v2) to the new one;
// the app converts a stored v2 progress object once (and again after a cloud merge brings old keys back).
// usage: node tools/pzcurate.js --stats [file]                      before / after statistics of a puzzles.json
//        node tools/pzcurate.js out.json cand1.jsonl [cand2.jsonl …]   (pzgen output; the current puzzles.json is a candidate source too)
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const { funScore } = require('./fun.js');
const { popc, mCap, mFrom, mTo } = E;
const MINFUN = 62, SLOW = 1500;   // ms for the whole fun.js check in node

// ---------------------------------------------------------------- features of one puzzle
function features(K, P, g) {
  const T = { g: g || 0 };
  const t0 = Date.now(), r = funScore(K, P, T), ms = Date.now() - t0;
  if (!r.sound) return { sound: false, why: r.why };
  if (ms > SLOW) return { sound: false, why: 'slow' };   // the app runs the same searches on a phone (hint / answer / defence)
  const pos0 = E.Pos.from(P.s), me = pos0.side, line = r.info.moves;
  let pos = pos0.clone(), crown = false, maxJump = 0;
  line.forEach((m, i) => { if (i % 2 === 0) { if (pos.promotes(m)) crown = true; maxJump = Math.max(maxJump, popc(mCap(m))); } pos.play(m); });
  const null0 = pos0.clone(); null0.side ^= 1;
  const threat = !pos0.hasCaps() && null0.hasCaps();
  const b = P.s.b, kingsOnly = !/[bw]/.test(b), menOnly = !/[BW]/.test(b);
  const mine = me === 0 ? /[bB]/g : /[wW]/g, myMen = (b.match(me === 0 ? /b/g : /w/g) || []).length;
  const pieces = popc(pos0.b | pos0.w), nMoves = pos0.moves().length;
  const I = r.info;
  const tags = new Set();
  if (P.n === 1) tags.add('quick');
  if (kingsOnly) tags.add('kings');
  if (menOnly && pieces <= 8) tags.add('opp');
  if (threat && !I.capAns) tags.add('guard');
  if (maxJump >= 2) tags.add('combo');
  if (I.sac || I.sacMid) tags.add('sac');
  if (crown && myMen > 0) tags.add('crown');
  if (I.block && !g) tags.add('block');
  // difficulty: length first, then a quiet / sacrificing key, the number of choices, the size of the position
  const diff = P.n * 10 + (I.sac ? 5 : !I.capAns ? 2 : 0) + Math.min(nMoves, 12) * .5 + Math.min(pieces, 16) * .25 + (g === 2 ? 3 : 0)
    + Math.min(I.choices, 4) * .8 + (I.sacMid ? 2 : 0) - (I.capAns && nMoves === 1 ? 3 : 0);
  return { sound: true, fun: r.fun, tags, diff, pieces, nMoves, kingsOnly, menOnly, threat, crown, maxJump, sac: I.sac, capAns: I.capAns, block: I.block, line: line.length };
}
const goalKey = P => (P.g ? 'g' + P.g : 'w') + P.n;
const ham = (a, b) => { let d = 0; for (let i = 0; i < 32; i++) if (a[i] !== b[i]) d++; return d; };
// look-alike: nearly the same board, or the same key move on a similar board
const similar = (x, y) => x.P.s.side === y.P.s.side && (ham(x.P.s.b, y.P.s.b) <= 5 || (mFrom(x.P.answer) === mFrom(y.P.answer) && mTo(x.P.answer) === mTo(y.P.answer) && ham(x.P.s.b, y.P.s.b) <= 9));

// ---------------------------------------------------------------- statistics (before / after)
function stats(K, D, label) {
  const out = { label, total: 0, n: {}, tags: {}, quick: 0, sameRun: 0, maxRun: 0, adjSame: 0, adjSimilar: 0, sound: 0, funMed: 0, longest: 0 };
  const funs = [];
  for (const T of D.themes) {
    let prev = null, prevF = null, run = 0;
    T.puzzles.forEach(P => {
      const g = P.g || T.g || 0, f = features(K, P, g); out.total++;
      out.n[P.n] = (out.n[P.n] || 0) + 1; out.longest = Math.max(out.longest, P.n);
      if (P.n === 1) out.quick++;
      if (f.sound) { out.sound++; funs.push(f.fun); for (const t of f.tags) out.tags[t] = (out.tags[t] || 0) + 1; }
      const k = goalKey({ n: P.n, g });
      const x = { P, f };
      if (prev && prev === k) { run++; out.adjSame++; } else run = 1;
      if (prevF && similar(prevF, x)) out.adjSimilar++;
      out.maxRun = Math.max(out.maxRun, run); prev = k; prevF = x;
    });
  }
  funs.sort((a, b) => a - b); out.funMed = funs[funs.length >> 1]; out.funMean = Math.round(funs.reduce((a, b) => a + b, 0) / funs.length * 10) / 10;
  out.adjPairs = out.total - D.themes.length;
  return out;
}

// ---------------------------------------------------------------- build
const COURSES = [
  // id, group, filter, count of quick (win-in-1) allowed, n range
  { id: 'step1', grp: 'Step', n: [1, 3] },
  { id: 'step2', grp: 'Step', n: [2, 4] },
  { id: 'step3', grp: 'Step', n: [3, 5] },
  { id: 'step4', grp: 'Step', n: [4, 7] },
  { id: 'shots', grp: 'Tac', n: [2, 5], need: f => f.tags.has('sac') && !f.kingsOnly, show: 'sac' },
  { id: 'combo', grp: 'Tac', n: [2, 5], need: f => f.tags.has('combo'), show: 'combo' },
  { id: 'crown', grp: 'Tac', n: [2, 7], need: f => f.tags.has('crown'), show: 'crown' },
  { id: 'guard', grp: 'Tac', n: [2, 7], need: f => f.tags.has('guard'), show: 'guard' },
  { id: 'kings', grp: 'End', n: [2, 7], win: 1, need: f => f.kingsOnly, show: 'kings' },
  { id: 'menend', grp: 'End', n: [2, 7], win: 1, need: f => !f.kingsOnly && f.pieces <= 7 && !f.tags.has('quick') && (f.menOnly || f.tags.has('crown') || f.tags.has('block')) },
];
const TAG_ORDER = ['guard', 'combo', 'sac', 'crown', 'kings', 'opp', 'block'];
function primaryTag(f, P) { if (P.n === 1) return 'quick'; for (const t of TAG_ORDER) if (f.tags.has(t)) return t; return P.g ? 'gain' : 'win'; }

// pick 50 from a pool: 5 stages of 10, stage s from the s-th fifth of the eligible pool by difficulty (overlapping its
// neighbours a little so a stage mixes lengths), most fun first; no look-alikes, at most 3 of one goal and (mixed
// courses) 4 of one theme per stage; every puzzle shows one theme tag (the course's, or its least used one so far)
function pickCourse(C, pool, used) {
  const el = pool.filter(x => !used.has(x.key) && x.P.n >= C.n[0] && x.P.n <= C.n[1] && (!C.need || C.need(x.f)) && (!C.win || !x.P.g) && (x.P.n > 1 || C.id === 'step1'))
    .sort((a, b) => a.f.diff - b.f.diff);
  const res = [], cnt = {};
  const bins = 5, per = 10, bs = el.length / bins;
  const showOf = x => {
    if (C.show) return C.show;
    if (x.P.n === 1) return 'quick';
    const opts = [...x.f.tags].filter(t => t !== 'quick');
    if (!opts.length) return x.P.g ? 'gain' : 'win';
    return opts.sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0) || TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b))[0];
  };
  for (let s = 0; s < bins; s++) {
    const take = [];
    for (let widen = 0; take.length < per && widen < 6; widen++) {
      const a = Math.max(0, Math.floor(bs * (s - .35 - widen * .2))), b = Math.min(el.length, Math.ceil(bs * (s + 1.35 + widen * .2)));
      const cand = el.slice(a, b).filter(x => !used.has(x.key) && !take.includes(x)).sort((p, q) => q.f.fun - p.f.fun);
      for (const x of cand) {
        if (take.length >= per) break;
        if (x.P.n === 1 && (s > 0 || take.filter(y => y.P.n === 1).length >= 2)) continue;   // win-in-1: at most 2, stage 1 of step1 only
        if ([...res, ...take].some(y => similar(x, y))) continue;
        const gk = goalKey(x.P);
        if (take.filter(y => goalKey(y.P) === gk).length >= 3 + widen) continue;              // no stage made of one goal
        const sh = showOf(x);
        if (!C.show && take.filter(y => y.show === sh).length >= 4 + widen) continue;        // mixed courses: mixed themes
        x.show = sh; cnt[sh] = (cnt[sh] || 0) + 1;
        take.push(x); used.add(x.key);
      }
    }
    take.sort((a, b) => a.f.diff - b.f.diff);
    res.push(...order(take, res[res.length - 1]));
  }
  return res;
}
// order a stage: rising difficulty, but the next puzzle is the easiest of the next few that differs from the previous
// one in goal (win / gain, number of moves) and theme, and does not look alike
function order(list, prev) {
  const out = [], rest = list.slice();
  const clash = (x, y) => !y ? 0 : (goalKey(x.P) === goalKey(y.P) ? 2 : 0) + (x.show === y.show ? 1 : 0) + (similar(x, y) ? 4 : 0) + (x.f.kingsOnly && y.f.kingsOnly ? .5 : 0);
  let last = prev;
  while (rest.length) {
    let bi = 0, bc = 1e9;
    for (let i = 0; i < Math.min(6, rest.length); i++) { const c = clash(rest[i], last) * 10 + i; if (c < bc) { bc = c; bi = i; } }
    const [x] = rest.splice(bi, 1); out.push(x); last = x;
  }
  return out;
}

(async () => {
  const K = await require('./wasm.js').load();
  const args = process.argv.slice(2);
  const cur = path.join(__dirname, '..', 'puzzles.json');
  if (args[0] === '--stats') {
    const D = JSON.parse(fs.readFileSync(args[1] || cur, 'utf8'));
    console.log(JSON.stringify(stats(K, D, args[1] || 'puzzles.json')));
    return;
  }
  const out = args[0], files = args.slice(1);
  const OLD = JSON.parse(fs.readFileSync(cur, 'utf8'));
  if (OLD.version >= 3) { console.error('puzzles.json is already v3; run on a v2 copy'); process.exit(1); }
  const pool = [], seen = new Map();
  const add = (P, src, oldKey) => {
    const key = P.s.b + P.s.side;
    if (seen.has(key)) { if (oldKey) seen.get(key).old.push(oldKey); return; }
    const f = features(K, P, P.g || 0);
    const x = { P, key, src, old: oldKey ? [oldKey] : [], f };
    seen.set(key, x);
    if (!f.sound || f.fun < MINFUN) return;
    x.tag = primaryTag(f, P); pool.push(x);
  };
  // the current puzzles (not the ones replaced on 2026-10-21: they scored low)
  for (const T of OLD.themes) T.puzzles.forEach((P, j) => add({ s: P.s, n: P.n, answer: P.answer, ...((P.g || T.g) ? { g: P.g || T.g } : {}) }, 'v2', T.id + '-' + j));
  let nc = 0, t0 = Date.now();
  const okVal = x => (x.va || 0) >= (x.vb || 0) - 25 && (x.va || 0) > -150;
  for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!l.trim()) continue; const x = JSON.parse(l);
    if (!okVal(x) || x.n > 7) continue;
    add({ s: { b: x.b, side: x.side }, n: x.n, answer: x.f + 32 * x.t + 1024 * x.cap, ...(x.g ? { g: x.g } : {}) }, x.src);
    if (++nc % 500 === 0) console.error(nc, pool.length, ((Date.now() - t0) / 1000 | 0) + 's');
  }
  console.error('pool', pool.length, 'of', seen.size);
  const tc = {}; for (const x of pool) for (const t of x.f.tags) tc[t] = (tc[t] || 0) + 1; console.error('tags', JSON.stringify(tc));
  // scarce courses first, the mixed steps take what is left (step4 before step1..3 so the long ones are kept for it)
  const used = new Set(), built = {};
  for (const id of ['guard', 'combo', 'crown', 'menend', 'kings', 'shots', 'step4', 'step3', 'step2', 'step1']) {
    const C = COURSES.find(c => c.id === id);
    built[id] = pickCourse(C, pool, used);
    console.error(id, built[id].length, JSON.stringify(built[id].reduce((o, x) => (o[goalKey(x.P)] = (o[goalKey(x.P)] || 0) + 1, o), {})));
  }
  const themes = COURSES.map(C => ({
    id: C.id, grp: C.grp, goal: 'win', g: 0,
    puzzles: built[C.id].map(x => ({ s: x.P.s, n: x.P.n, answer: x.P.answer, ...(x.P.g ? { g: x.P.g } : {}), t: x.show })),
  }));
  const mig = {};
  for (const T of themes) T.puzzles.forEach((P, j) => { const x = seen.get(P.s.b + P.s.side); for (const k of x.old) mig[k] = (OLD.old && OLD.old[k] ? '~' : '') + T.id + '-' + j; });   // "~": slot replaced on 2026-10-21 (see app.js pzMigrate)
  const D = { version: 3, daily: ['step2', 'shots', 'kings', 'combo', 'step3', 'guard', 'menend'], themes, mig };
  fs.writeFileSync(out, JSON.stringify(D));
  console.log(JSON.stringify(stats(K, D, out)));
  console.error('migrated keys', Object.keys(mig).length);
})();
