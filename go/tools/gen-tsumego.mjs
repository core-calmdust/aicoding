// Tsumego (詰碁) generator for go/puzzles.json.
//
//   node tools/gen-tsumego.mjs ld     <count> <seed>   life & death candidates (19x19 corners / edges, eye-space-first shapes)
//   node tools/gen-tsumego.mjs semeai <count> <seed>   capturing races (19x19 corners: inner group vs the ring around it)
//   node tools/gen-tsumego.mjs tac    <games> <seed>   capture / ladder / net / snapback / tesuji / connect puzzles
//                                                       harvested from light-net self-play games on 9x9 and 13x13
//   node tools/gen-tsumego.mjs syn    <count> <seed>   dense tactical shapes near an edge of 9x9 (snapback / under the
//                                                       stones / shortage of liberties; also capture / net / tesuji)
//   node tools/gen-tsumego.mjs build                    fun score (tools/fun.js + the net) -> select -> go/puzzles.json
//
// Candidates go to tools/data/tsumego/<family>-<seed>.jsonl (one puzzle per line, puzzle JSON format + "th" theme guess).
// Every candidate is classified by the runtime solver (go/tsumego.js): exactly one first move reaches the goal in the
// fewest moves n, the status depends on who moves first (the opponent moving first defends), the main line is legal,
// has no pass and no ko, and reaches the goal. LD shapes are minimised (stones that do not matter are removed).
// Copyright 2026 core-calmdust — Apache License 2.0
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { rng, R, T, PASS, ldShape, semeaiShape, finish, legal, chains, posOf, transform, viewFor, classify, unsettled, lineOf } from './tsumego-shapes.mjs';
const require = createRequire(import.meta.url);
const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, 'data', 'tsumego');
fs.mkdirSync(OUT, { recursive: true });
const co = (i, n) => R.coord(i, n);
T.nodeLimit = 4e5;   // candidates whose exact reading needs more are dropped (keeps the puzzles fast on phones too)

// shape colours: 2 = the side that is "outside" (attacker / racing player), 1 = the defender; player = shape colour of G
function specOf(b, n, player) { let s = ''; for (let i = 0; i < n * n; i++) s += b[i] === 0 ? '.' : b[i] === player ? 'b' : 'w'; return { n, stones: s, turn: 1 }; }
function emit(file, P, extra) {
  const n = P.s.n;
  const o = { s: P.s, goal: P.goal, target: P.target.map(i => co(i, n)), region: P.region.map(i => co(i, n)), n: P.n, answer: co(P.answer, n), line: P.line.map(i => co(i, n)), ...extra };
  fs.appendFileSync(file, JSON.stringify(o) + '\n');
}
// full check of a candidate; returns P with n / answer / line or null
function check(P, maxN, ld) {
  const c = classify(P, maxN); if (!c.n) return null;
  P.n = c.n; P.answer = c.answer;
  if (!unsettled(P, c.n)) return null;
  const line = lineOf(Object.assign({}, P), c.n); if (!line || line[0] !== c.answer) return null;
  P.line = line;
  return P;
}
const themeLD = (goal, n) => n === 1 ? goal + '1' : n === 2 ? goal + '3' : 'ld5';

// ---- life & death
function genLD(count, seed) {
  const quota = {}, QUOTA = Math.ceil(count / 5);
  const rand = rng(seed * 7919 + 13), n = 19, file = path.join(OUT, `ld-${seed}.jsonl`), seen = new Set();
  let made = 0, tries = 0; const t0 = Date.now();
  while (made < count) {
    tries++;
    const sh = ldShape(rand, n);
    if (!sh || !legal(sh.b, n) || sh.region.length < 3 || sh.region.length > 15) continue;
    const big = chains(sh.b, n, 1).sort((a, b) => b.stones.length - a.stones.length)[0];
    if (!big || big.stones.length < 3) continue;
    let done = false;
    for (const goal of rand() < 0.5 ? ['kill', 'live'] : ['live', 'kill']) {
      if (done) break;
      const player = goal === 'kill' ? 2 : 1;
      const key = goal + Array.from(sh.b).join('');
      if (seen.has(key)) continue; seen.add(key);
      let P = { s: specOf(sh.b, n, player), goal, target: big.stones.slice().sort((a, b) => a - b), region: sh.region };
      try {
        P = check(P, 4, true); if (!P) continue;
        done = true;
        const th = themeLD(goal, P.n);
        if ((quota[th] || 0) >= QUOTA) continue;
        P = minimize(P, sh.b, player, rand);
        if (themeLD(goal, P.n) !== th) continue;
        quota[th] = (quota[th] || 0) + 1;
      } catch (e) { if (e.abort) continue; throw e; }
      emit(file, P, { th: themeLD(goal, P.n), fam: 'ld' });
      made++;
      if (made % 10 === 0) console.log(`ld seed ${seed}: ${made}/${count} ${JSON.stringify(quota)} (${tries} shapes, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }
}
// remove stones that do not matter (same answer, same n, still sound); LD / semeai shapes on 19x19
function minimize(P, b0, player, rand) {
  const n = P.s.n, b = b0.slice(), tg = new Set(P.target);
  const order = []; for (let i = 0; i < n * n; i++) if (b[i] && !tg.has(i)) order.push(i);
  for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(rand() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
  let cur = P, tries = 0;
  for (const q of order) {
    if (tries++ > 10) break;
    const v = b[q]; b[q] = 0;
    let ok = false;
    if (legal(b, n)) {
      const sh = finish(b, n, new Set([...cur.region, q]));
      if (sh && sh.region.length <= 15) {
        const Q = { s: specOf(b, n, player), goal: cur.goal, target: cur.target, region: sh.region };
        if (cur.goal === 'semeai') Q.s = specOf(b, n, player);
        try { const r = check(Q, cur.n, true); if (r && r.n === cur.n && r.answer === cur.answer) { cur = r; ok = true; } } catch (e) { if (!e.abort) throw e; }
      }
    }
    if (!ok) b[q] = v;
  }
  return cur;
}

// ---- semeai
function genSemeai(count, seed) {
  const rand = rng(seed * 104729 + 7), n = 19, file = path.join(OUT, `semeai-${seed}.jsonl`), seen = new Set();
  let made = 0, tries = 0; const t0 = Date.now();
  while (made < count) {
    tries++;
    const sh = semeaiShape(rand, n);
    if (!sh || !legal(sh.b, n) || sh.region.length < 3 || sh.region.length > 15) continue;
    const big = chains(sh.b, n, 1).sort((a, b) => b.stones.length - a.stones.length)[0];
    if (!big || big.stones.length < 3 || big.libs < 2) continue;
    const key = Array.from(sh.b).join(''); if (seen.has(key)) continue; seen.add(key);
    let P = { s: specOf(sh.b, n, 2), goal: 'semeai', target: big.stones.slice().sort((a, b) => a - b), region: sh.region };
    const C = T._ctx(P); if (!C.own.length) continue;
    try {
      P = check(P, 5, false); if (!P || P.n < 2) continue;
      P = minimize(P, sh.b, 2, rand);
    } catch (e) { if (e.abort) continue; throw e; }
    emit(file, P, { th: 'semeai', fam: 'semeai' });
    made++;
    if (made % 10 === 0) console.log(`semeai seed ${seed}: ${made}/${count} (${tries} shapes, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}

// ---- tactical puzzles from self-play games
function regionAround(pos, stones, d) {
  const n = pos.n, out = [];
  for (let q = 0; q < n * n; q++) { if (pos.b[q]) continue; const x = q % n, y = Math.floor(q / n); for (const s of stones) if (Math.max(Math.abs(s % n - x), Math.abs(Math.floor(s / n) - y)) <= d) { out.push(q); break; } }
  return out;
}
// classic ladder reader: G ataris, O extends; does the ladder work? returns the number of G moves or 0
function ladderLen(pos, tgt, G, depth = 14) {
  const O = 3 - G;
  const go = (p, d) => {
    if (d <= 0) return 0;
    const g = p.group(tgt); if (p.b[tgt] !== O) return 0;
    if (g.libs !== 2) return 0;
    const libs = []; for (const s of g.stones) for (const r of [s - 1, s + 1, s - p.n, s + p.n]) { if (r < 0 || r >= p.n * p.n) continue; if ((r === s - 1 && s % p.n === 0) || (r === s + 1 && s % p.n === p.n - 1)) continue; if (!p.b[r] && !libs.includes(r)) libs.push(r); }
    for (const a of libs) {
      const r1 = p.tryPlay(a, G, true); if (!r1) continue;
      const q = r1.pos; if (q.group(a).libs < 2) continue;
      const g2 = q.group(tgt); if (g2.libs !== 1) continue;
      const e = g2.lib;   // O extends (or captures an attacker chain in atari: then the ladder fails)
      let capt = false; for (const s of g2.stones) for (const r of [s - 1, s + 1, s - p.n, s + p.n]) if (r >= 0 && r < p.n * p.n && q.b[r] === G && q.group(r).libs === 1) capt = true;
      if (capt) continue;
      const r2 = q.tryPlay(e, O, true); if (!r2) return 1;
      const q2 = r2.pos, l2 = q2.group(tgt).libs;
      if (l2 === 1) return 2;
      if (l2 !== 2) continue;
      const k = go(q2, d - 1); if (k) return k + 1;
    }
    return 0;
  };
  return go(pos, depth);
}
async function genTac(games, seed) {
  const { load, policy } = await import('./golib.mjs');
  const E = await load('light');
  const rand = rng(seed * 15485863 + 3), file = path.join(OUT, `tac-${seed}.jsonl`), seen = new Set();
  let made = 0; const t0 = Date.now(); const stat = {};
  for (let g = 0; g < games; g++) {
    const n = rand() < 0.72 ? 9 : 13;
    const spec = { n, stones: '.'.repeat(n * n), turn: 1 }, moves = [];
    const len = n === 9 ? 18 + Math.floor(rand() * 40) : 30 + Math.floor(rand() * 60);
    let prevKeys = new Set(); const used = new Set(); let perGame = 0, connGame = 0;
    for (let k = 0; k < len; k++) {
      const pol = policy(E, spec, moves, 7, 1);
      const temp = k < 6 ? 1.2 : 0.7; let tot = 0;
      const L = pol.list.filter(e => e.m >= 0).slice(0, 10).map(e => ({ m: e.m, w: Math.pow(e.p, 1 / temp) }));
      if (!L.length) break;
      L.forEach(e => tot += e.w); let r = rand() * tot, m = L[0].m; for (const e of L) { r -= e.w; if (r <= 0) { m = e.m; break; } }
      moves.push(m);
      if (k < (n === 9 ? 10 : 18)) continue;
      const pos = R.replay(spec, moves).pos, G = pos.turn, O = 3 - G;
      const spec0 = pos.spec(); spec0.turn = G;
      const sn = new Set();
      const keys = new Set();
      // capture targets: opponent chains with 2-3 liberties, up to 6 stones
      for (let i = 0; i < n * n; i++) {
        if (pos.b[i] !== O || sn.has(i)) continue;
        const gr = pos.group(i); gr.stones.forEach(s => sn.add(s));
        if (gr.libs < 2 || gr.libs > 3 || gr.stones.length > 6) continue;
        const tg = gr.stones.slice().sort((a, b) => a - b), key = 'c' + tg.join(',');
        keys.add(key); if (prevKeys.has(key) || used.has(tg[0]) || perGame >= 5) continue;   // tried in the previous position / already used in this game
        const lad = gr.libs === 2 ? ladderLen(pos, i, G) : 0;
        const region = lad >= 3 ? (() => { const a = []; for (let q = 0; q < n * n; q++) if (!pos.b[q]) a.push(q); return a; })() : regionAround(pos, gr.stones, 3);
        const P0 = { s: spec0, goal: 'capture', target: tg, region };
        const sk = spec0.stones + key; if (seen.has(sk)) continue; seen.add(sk);
        let P;
        try { const C = T._ctx(P0); C.lim = 4e5; C.nodes = 0; P = check(P0, lad >= 3 ? Math.min(9, lad) : 4, false); C.lim = Infinity; }
        catch (e) { if (!e.abort) throw e; stat.abort = (stat.abort || 0) + 1; T._ctx(P0).lim = Infinity; continue; }
        if (!P) continue;
        const th = tacTheme(P, pos, G);
        for (const s of tg) used.add(s); perGame++;
        stat[th] = (stat[th] || 0) + 1;
        emit(file, P, { th, fam: 'tac', view: n > 9 ? viewFor([...tg, ...P.line, ...P.region.filter((_, j) => j % 3 === 0)], n, 9) : undefined });
        made++;
      }
      // connect: two own chains close to each other, separated by an opponent cutting point
      const own = []; const so = new Set();
      for (let i = 0; i < n * n; i++) if (pos.b[i] === G && !so.has(i)) { const gr = pos.group(i); gr.stones.forEach(s => so.add(s)); if (gr.stones.length <= 8) own.push(gr); }
      for (let a = 0; a < own.length; a++) for (let b2 = a + 1; b2 < own.length; b2++) {
        const A = own[a], B = own[b2];
        let dmin = 9; for (const s of A.stones) for (const t of B.stones) dmin = Math.min(dmin, Math.abs(s % n - t % n) + Math.abs(Math.floor(s / n) - Math.floor(t / n)));
        if (dmin < 2 || dmin > 3 || A.libs > 4 || B.libs > 4) continue;
        const tg = [...A.stones, ...B.stones].sort((x, y) => x - y), key = 'k' + tg.join(',');
        keys.add(key); if (prevKeys.has(key) || used.has(tg[0]) || used.has(B.stones[0]) || perGame >= 5 || connGame >= 1 || (stat.connect || 0) >= 220) continue;
        const region = regionAround(pos, tg, 2), P0 = { s: spec0, goal: 'connect', target: tg, region };
        const sk = spec0.stones + key; if (seen.has(sk)) continue; seen.add(sk);
        let P;
        try { const C = T._ctx(P0); C.lim = 3e5; C.nodes = 0; P = check(P0, 3, false); C.lim = Infinity; }
        catch (e) { if (!e.abort) throw e; T._ctx(P0).lim = Infinity; continue; }
        if (!P) continue;
        stat.connect = (stat.connect || 0) + 1; for (const s of tg) used.add(s); perGame++; connGame++;
        emit(file, P, { th: 'tesuji', fam: 'conn', view: n > 9 ? viewFor([...tg, ...P.line], n, 9) : undefined });
        made++;
      }
      prevKeys = keys;
    }
    console.log(`tac seed ${seed}: game ${g + 1}/${games} n=${n}, puzzles ${made} ${JSON.stringify(stat)} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}
// theme of a capture puzzle from its main line
function tacTheme(P, pos0, G) {
  const n = P.s.n; let p = R.Pos.from(P.s);
  const steps = [];
  for (let k = 0; k < P.line.length; k++) {
    const m = P.line[k], before = p; const r = p.tryPlay(m); p = r.pos;
    const t = P.target.find(s => p.b[s]) ;
    steps.push({ m, att: k % 2 === 0, caps: r.captured.length, tlibs: t !== undefined && p.b[t] ? p.group(t).libs : 0, selfLibs: p.b[m] ? p.group(m).libs : 0, capturedG: k % 2 === 1 && r.captured.length > 0 });
  }
  const first = steps[0];
  const sac = first.selfLibs === 1 && steps.length > 1 && steps[1].capturedG;
  const underStones = steps.some((s, k) => s.capturedG && k > 0 && steps[k].caps >= 2);
  if (sac || underStones) return 'snapback';
  const atk = steps.filter(s => s.att);
  const allAtari = atk.slice(0, -1).every(s => s.tlibs === 1);
  if (P.n >= 3 && allAtari) return 'ladder';
  if (P.n >= 2 && first.tlibs >= 2) return 'ladder';   // a net (geta) or a loose ladder
  if (P.n <= 2) return 'capture';
  return 'tesuji';
}

// ---- synthetic tactical shapes near an edge / corner of a 9x9 board (snapback, under the stones, shortage of liberties)
function synShape(rand, n = 9) {
  const b = new Uint8Array(n * n), I = (x, y) => y * n + x, nb = R.nbrs(n);
  const x0 = rand() < 0.4 ? 0 : 1 + Math.floor(rand() * 3), W = 6, H = 4;
  const inBox = q => { const x = q % n, y = Math.floor(q / n); return x >= x0 && x < x0 + W && y < H; };
  // target: 2-4 stones on the first / second line
  const ts = [I(x0 + 1 + Math.floor(rand() * (W - 2)), Math.floor(rand() * 2))];
  const tl = 2 + Math.floor(rand() * 3);
  for (let k = 1; k < tl; k++) { const q = ts[Math.floor(rand() * ts.length)], c = [0, 1, 2, 3].map(d => nb[q * 4 + d]).filter(r => r >= 0 && inBox(r) && Math.floor(r / n) < 3 && !ts.includes(r)); if (c.length) ts.push(c[Math.floor(rand() * c.length)]); }
  for (const q of ts) b[q] = 1;
  const libs = () => { const s = new Set(); for (const q of ts) for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && !b[r]) s.add(r); } return [...s]; };
  const want = rand() < 0.7 ? 2 : 3;
  let lb = libs(), guard = 0;
  while (lb.length > want && guard++ < 30) { b[lb[Math.floor(rand() * lb.length)]] = 2; lb = libs(); }
  // supporting stones of both colours next to existing stones inside the box
  const extra = 3 + Math.floor(rand() * 7);
  for (let k = 0; k < extra; k++) {
    const st = []; for (let q = 0; q < n * n; q++) if (b[q] && inBox(q)) st.push(q);
    const s = st[Math.floor(rand() * st.length)], c = [0, 1, 2, 3].map(d => nb[s * 4 + d]).filter(r => r >= 0 && inBox(r) && !b[r] && !libs().includes(r));
    if (!c.length) continue;
    b[c[Math.floor(rand() * c.length)]] = rand() < 0.55 ? 2 : 1;
  }
  const region = []; for (let q = 0; q < n * n; q++) { if (b[q]) continue; const x = q % n, y = Math.floor(q / n); if (x >= x0 - 1 && x <= x0 + W && y <= H) region.push(q); }
  return { n, b, region, tgt: ts.slice().sort((a, c) => a - c) };
}
function genSyn(count, seed) {
  const rand = rng(seed * 2654435761 + 11), n = 9, file = path.join(OUT, `syn-${seed}.jsonl`), seen = new Set();
  const quota = {}, Q = { snapback: count, tesuji: Math.ceil(count / 2), capture: Math.ceil(count / 3), ladder: Math.ceil(count / 4) };
  let made = 0, tries = 0; const t0 = Date.now();
  while (made < count) {
    tries++;
    const sh = synShape(rand, n);
    if (!legal(sh.b, n)) continue;
    // natural look: every stone has a friend within 2, no own stones in atari at the start except the target's side
    const pos = posOf(sh.b, n); let ok = true;
    for (let i = 0; i < n * n && ok; i++) if (sh.b[i]) { let f = false; for (let j = 0; j < n * n; j++) if (j !== i && sh.b[j] === sh.b[i] && Math.max(Math.abs(i % n - j % n), Math.abs(Math.floor(i / n) - Math.floor(j / n))) <= 2) { f = true; break; } if (!f) ok = false; }
    if (!ok) continue;
    const key = Array.from(sh.b).join(''); if (seen.has(key)) continue; seen.add(key);
    let P = { s: specOf(sh.b, n, 2), goal: 'capture', target: sh.tgt, region: sh.region };
    try { P = check(P, 4, false); } catch (e) { if (e.abort) continue; throw e; }
    if (!P) continue;
    const th = tacTheme(P, pos, 1);
    if ((quota[th] || 0) >= (Q[th] || 0)) continue;
    quota[th] = (quota[th] || 0) + 1;
    emit(file, P, { th, fam: 'syn' });
    if (th === 'snapback') made++;
    if (tries % 200 === 0 || th === 'snapback') console.log(`syn seed ${seed}: snapback ${made}/${count} ${JSON.stringify(quota)} (${tries} shapes, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
}

// ---- main
const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'ld') genLD(+a1 || 50, +a2 || 1);
else if (cmd === 'syn') genSyn(+a1 || 50, +a2 || 1);
else if (cmd === 'semeai') genSemeai(+a1 || 50, +a2 || 1);
else if (cmd === 'tac') await genTac(+a1 || 20, +a2 || 1);
else if (cmd === 'build') { const { build } = await import('./build-tsumego.mjs'); await build(); }
else console.log('usage: node tools/gen-tsumego.mjs ld|semeai|tac <count> <seed> | build');
