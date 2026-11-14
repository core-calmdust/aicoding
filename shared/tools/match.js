// A common strength match (claude/praline-spec.md §10 ①, 2026-11-14): setting A against setting B of one game, by node
// budgets (the 2-core work machine's speed does not matter), on seeded openings, each played twice with the colours swapped;
// prints W/D/L of B, the score, the Elo difference with its 95% interval and a line to paste into a MODEL_CARD / spec.
//
//   node shared/tools/match.js <game> --a <nk>[@<dir>] --b <nk>[@<dir>] [--pairs 50] [--workers 2] [--seed 1] [--rule r]
//     nk:   the budget in thousands of positions (nodes) per move
//     dir:  the game's folder for that side (default: <repo>/<game>) — e.g. a `git worktree` of an older commit, to measure a
//           change of the engine (evaluation, search) at the same budget: --a 50@/tmp/old/<game> --b 50
//   games: ugolki agon konane (engine.js, the strong steps' ladder: iterative deepening stopped at the budget), fanorona
//          alquerque (fanorona/engine.js + engine.wasm; alquerque = rule 'alq' with its endgame tables), mancala (engine.wasm:
//          iterative deepening of mc_rootbest with mc_nodelimit; --rule kalah | oware | mangala | bohnen | ayo | …)
//   A game is added with an adapter below: load(dir) → { think(state, nk) → move }, and the game's rules: open(rnd), over(state),
//   play(state, move). Every side has engines of its own (its own table), loaded from its own folder.
// Openings: 4–8 plies of a weak level with the seeded random (the same pair of games for A and B).
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------- adapters
// a game whose engine.js keeps a list of moves (replay / judge / think(start, moves, level, rand)) and has the strong
// steps' LEVELS entries { s: 1, nk } (nodes in thousands)
const moveList = (rule, prep) => ({
  rule,
  async load(dir, rules) {
    const E = await prep(dir, rules);
    return { E, think: (st, nk) => { E.LEVELS[90] = { s: 1, d: 99, nk, ms: 600000 }; const r = E.think(null, st.moves, 90, Math.random, rules); return r.move; } };
  },
  open(R, rnd) { const st = { moves: [] }, k = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < k; i++) { if (this.over(R, st)) break; const r = R.think(null, st.moves, 9, rnd, R.rules); if (r.move == null || r.move < 0) break; st.moves.push(r.move); }
    return st; },
  turn(R, st) { return R.replay(null, st.moves).pos.turn; },
  over(R, st) { const { pos, hashes } = R.replay(null, st.moves), j = R.judge(pos, hashes); return j.over ? { winner: j.draw ? 0 : j.winner || 0 } : null; },
  play(R, st, m) { return { moves: st.moves.concat([m]) }; },
});
// engine.js required afresh (ugolki, agon, konane: engine.js loads its core-wasm.js itself; a fresh copy = its own table)
const fresh = dir => { for (const k of Object.keys(require.cache)) if (k.startsWith(dir + path.sep)) delete require.cache[k]; };
const required = () => async (dir, rules) => { fresh(dir); const E = require(path.join(dir, 'engine.js')); if (rules) E.setRule(rules); return E; };
// fanorona / alquerque: tools/lib.js (engine.js + engine.wasm and the tables), a fresh copy for every side
const fanoronaLike = (alq) => async (dir) => {
  const lib = path.join(dir, 'tools', 'lib.js');
  fresh(dir);
  if (alq) { process.env.NO_EG = '1'; process.env.NO_NET = '1'; }
  const L = require(lib), E = await L.init(); E.setRule(alq ? 'alq' : 'sivy'); return E;
};
const ADAPT = {
  ugolki: moveList('c33', required()),
  agon: moveList('std', required()),
  konane: moveList('s8', required()),
  fanorona: moveList('sivy', fanoronaLike(false)),
  alquerque: Object.assign(moveList('alq', fanoronaLike(true)), { dir: 'fanorona' }),
  mancala: {
    rule: 'kalah',
    async load(dir, rules) {
      fresh(dir); const E = require(path.join(dir, 'engine.js'));
      const X = (await WebAssembly.instantiate(fs.readFileSync(path.join(dir, 'engine.wasm')), { env: { now: () => performance.now() } })).instance.exports;
      const B = new Uint8Array(X.memory.buffer, X.mc_board(), 14), M = new Int32Array(X.memory.buffer, X.mc_outm(), 8), XX = new Int32Array(X.memory.buffer, X.mc_outx(), 8);
      X.mc_ttfix(1);
      return { E, think: (st, nk) => {
        B.set(st.b); X.mc_setup(E.RULE_IDS.indexOf(rules)); X.mc_begin(0); X.mc_nodelimit(nk * 1000);
        let best = E.legal(st.b, st.side, rules)[0];
        for (let d = 1; d <= 80; d++) { if (X.mc_rootbest(st.side, d, best, 0) < 0) break; best = M[0]; if (XX[0]) break; }
        X.mc_nodelimit(0); return best;
      } };
    },
    open(R, rnd) { R.setRandom(rnd); let st = { b: Array.from(R.initial(4)), side: 0, over: false }; const k = 4 + Math.floor(rnd() * 5);
      for (let i = 0; i < k && !st.over; i++) { const r = R.chooseMove(Int8Array.from(st.b), st.side, R.rules, 4); if (r.move < 0) break; st = this.play(R, st, r.move); }
      R.setRandom(Math.random); return st; },
    turn(R, st) { return st.side + 1; },
    over(R, st) { if (!st.over && st.n < 400) return null; const d = st.b[6] - st.b[13]; return { winner: !st.over || d === 0 ? 0 : d > 0 ? 1 : 2 }; },
    play(R, st, m) { const c = Int8Array.from(st.b), x = R.play(c, st.side, m, R.RULES[R.rules]); return { b: Array.from(c), side: x.extra ? st.side : 1 - st.side, over: !!x.over, n: (st.n || 0) + 1 }; },
  },
};

// ---------------------------------------------------------------- the match
const argOf = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const side = s => { const [nk, dir] = String(s).split('@'); return { nk: +nk, dir: dir ? path.resolve(dir) : null }; };
if (isMainThread) {
  const game = process.argv[2], AD = ADAPT[game];
  if (!AD || !argOf('a') || !argOf('b')) { console.log('usage: node shared/tools/match.js <game> --a <nk>[@dir] --b <nk>[@dir] [--pairs 50] [--workers 2] [--seed 1] [--rule r]\ngames: ' + Object.keys(ADAPT).join(' ')); process.exit(1); }
  const A = side(argOf('a')), B = side(argOf('b')), pairs = +argOf('pairs', 50), NW = +argOf('workers', 2), seed0 = +argOf('seed', 1), rule = argOf('rule', AD.rule);
  const def = path.join(ROOT, AD.dir || game);
  let next = 0, w = 0, d = 0, l = 0, done = 0, plies = 0; const t0 = Date.now();
  const e = x => -400 * Math.log10(1 / Math.min(0.999, Math.max(0.001, x)) - 1);
  const finish = () => {
    const n = w + d + l, s = (w + d / 2) / n, sd = Math.sqrt((w * (1 - s) ** 2 + l * s * s + d * (0.5 - s) ** 2) / n / n);
    const name = x => `${x.nk}k${x.dir ? '@' + path.relative(process.cwd(), x.dir) : ''}`;
    console.log(`${game} (${rule}) B ${name(B)} vs A ${name(A)}: +${w} =${d} -${l} (${n} games, ${(plies / n).toFixed(0)} plies avg, ${((Date.now() - t0) / 60000).toFixed(1)} min)`);
    console.log(`score ${(s * 100).toFixed(1)}%  Elo ${e(s) >= 0 ? '+' : ''}${e(s).toFixed(0)}  [${e(s - 1.96 * sd).toFixed(0)}, ${e(s + 1.96 * sd).toFixed(0)}]`);
    console.log(`| ${game} ${rule} | B ${name(B)} 対 A ${name(A)} | ${n}局 | +${w} =${d} -${l} | ${(s * 100).toFixed(1)}% | ${e(s) >= 0 ? '+' : ''}${e(s).toFixed(0)} Elo（95%: ${e(s - 1.96 * sd).toFixed(0)}〜${e(s + 1.96 * sd).toFixed(0)}） |`);
    process.exit(0);
  };
  for (let i = 0; i < NW; i++) {
    const wk = new Worker(__filename, { workerData: { game, rule, A: { nk: A.nk, dir: A.dir || def }, B: { nk: B.nk, dir: B.dir || def }, def } });
    const feed = () => { if (next < pairs) wk.postMessage(seed0 * 100000 + next++); };
    wk.on('message', r => { if (r.ready) { feed(); return; } for (const x of r) { if (x.res > 0) w++; else if (x.res < 0) l++; else d++; plies += x.plies; } if (++done === pairs) finish(); feed(); });
    wk.on('error', err => { console.error(err); process.exit(1); });
  }
} else {
  const { game, rule, A, B, def } = workerData, AD = ADAPT[game];
  (async () => {
    const R = AD === ADAPT.mancala ? require(path.join(def, 'engine.js')) : await AD.load(def, rule).then(x => x.E);   // the referee: rules, openings
    R.rules = rule;
    const EA = await AD.load(A.dir, rule), EB = await AD.load(B.dir, rule);
    const game1 = (st, bFirst) => {   // → +1 B won, −1 A won, 0 draw
      for (let ply = 0; ply < 600; ply++) {
        const o = AD.over(R, st); if (o) return { res: !o.winner ? 0 : (o.winner === 1) === bFirst ? 1 : -1, plies: ply };
        const toB = (AD.turn(R, st) === 1) === bFirst, S = toB ? B : A, Eng = toB ? EB : EA;
        const m = Eng.think(st, S.nk); if (m == null || m < 0) return { res: 0, plies: ply };
        st = AD.play(R, st, m);
      }
      return { res: 0, plies: 600 };
    };
    parentPort.on('message', seed => {
      let s = seed % 2147483646 + 1; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      const op = AD.open(R, rnd);
      parentPort.postMessage([game1(op, true), game1(op, false)]);
    });
    parentPort.postMessage({ ready: true });
  })().catch(err => { console.error(err); process.exit(1); });
}
