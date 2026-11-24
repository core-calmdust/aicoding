// node tools/op_curate.js [id,id…] [--walks N] [--out file]   (2026-11-24 第2期・担当B)
// The openings' practice problems, chosen again to the strict rules of claude/lesson-quality.md 「第2期」:
// positions of the opening itself (reached from its named moves, both sides then playing moves within 25 of the engine's best (and the slips 60+ below the best that the opening's traps punish: the reply is the problem)),
// where one move is clearly the best — the second best move scores 12 points or less in the 2D / 3D scoring (sOfV gap ≥ 0.2,
// checked again with a longer search and a shorter one), the answer drops no piece, the side to move is not already winning or losing (|best| ≤ 250), 3+ legal moves and,
// besides the answer, 2+ moves that do not drop a piece at once (so the answer is not just "the only move that does not hang a
// piece"); 5+ squares (more than two moves) from every other checkers problem (lessons, warm-ups, puzzles, the other openings; colour-swapped too) and
// from the problems already chosen; an answer at most twice. Up to 9 per opening, easy → hard (d: the moves worth 4+ points,
// then the legal moves). Writes { id: [problems] } (each with its path from the start) for tools/op_apply.js.
const fs = require('fs'), path = require('path');
const W = require('./wasm.js').loadSync(), E = W.E;
const ROOT = path.join(__dirname, '..', '..');
const OP = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'openings.json'), 'utf8'));
const WIN = 30000, WINT = 29000;
const sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 260) * 0.82;
const pts = (sc, m) => { const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;   // = checkers/app.js problemPoints
  if (mine >= best - 6 && !(best > WINT && mine < best)) return 20; if (best > WINT && mine > WINT) return 16;
  if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0; if (mine < -WINT && best >= -WINT) return 0;
  return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5))); };
const qs = (p, d) => { const c = p.caps(); if (!c.length || d > 10) return 0; let b = -99; for (const x of c) b = Math.max(b, E.popc(E.mCap(x)) - qs(p.clone().play(x), d + 1)); return b; };
const net = (p, m) => E.popc(E.mCap(m)) - qs(p.clone().play(m), 0);
const flip = b => [...b].reverse().map(c => ({ b: 'w', w: 'b', B: 'W', W: 'B' })[c] || c).join('');
const dist = (a, b) => { const d = (x, y) => { let n = 0; for (let i = 0; i < 32; i++) if (x[i] !== y[i]) n++; return n; }; return Math.min(d(a, b), d(a, flip(b))); };
// チェッカニ's words (atlas/lessons3d.js ckOpJa): every other move must get a reason from the board, never only the vague
// 「先に良い場所を取られる」 kind of line (CKJ_OP.gap)
const SRC = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), cut = (a, b) => SRC.slice(SRC.indexOf(a), SRC.indexOf(b)), line = a => SRC.slice(SRC.indexOf(a), SRC.indexOf('\n', SRC.indexOf(a)) + 1);
const X = require('vm').runInNewContext(line('  const shSeed = ') + line('  const shPerm = ') + cut('  const xqSn = ', '  const XQ_TAIL = ') + cut('  const xqJoin = ', '  function xqOpJa(') + cut('  const CKM = ', '  const CK_EG = ') + '\n;({ ckOpJa, ckOpVoice, CKJ_OP })', {});
const vague = (spec, sc) => { const P = { s: spec, best: sc[0][0], sc }, Q = X.ckOpJa(E, P, 'x', 0, k => k === 'ok' ? '{M}' : '{X}', X.ckOpVoice('x'), 0);
  return sc.slice(1).some(([u]) => { const w = Q.ng(u); return X.CKJ_OP.gap.some(g => w.includes(g.replace('{x}', '{X}'))); }); };
function judge(spec, sc) {   // the rules a problem must meet (sc: every legal move's value, best first)
  const p = E.Pos.from(spec), ms = p.moves(); if (ms.length < 3 || sc.length !== ms.length) return null;
  const A = sc[0][0], best = sc[0][1]; if (Math.abs(best) > 250) return null;
  if (sc.slice(1).some(([m]) => pts(sc, m) > 10)) return null;   // (12 in the check: 2 points of room for a search that differs a little)
  if (net(p, A) < 0) return null;   // (a sacrifice whose pay-back lies beyond the captures: not one the words can explain from the board)
  const safe = ms.filter(m => m !== A && net(p, m) >= 0).length; if (safe < 2) return null;
  if (vague(spec, sc)) return null;
  const d = sc.filter(([m]) => pts(sc, m) >= 4).length - 1 + safe / 10 + ms.length / 100;
  return { A, d };
}
function pool(skip) {   // every other checkers board: lessons, warm-ups, puzzles, the openings not being redone
  const out = [], L = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'lessons.json'), 'utf8'));
  L.steps.forEach(s => { s.problems.forEach((p, j) => out.push([`${s.id} q${j + 1}`, p.s.b])); (s.ramp || []).forEach((r, j) => r.s && out.push([`${s.id} warm-up ${j + 1}`, r.s.b])); });
  const walk = (o, n) => { if (!o || typeof o !== 'object') return; if (o.s && typeof o.s.b === 'string') out.push([n, o.s.b]); for (const k in o) if (k !== 's') walk(o[k], n + '/' + k); };
  walk(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8')), 'puzzle');
  OP.sets.forEach(s => { if (!skip.has(s.id)) (s.problems || []).forEach((p, j) => out.push([`${s.id} ${j + 1}`, p.s.b])); });
  return out;
}
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ids = (args.find(a => !a.startsWith('--') && !/^\d+$/.test(a) && a !== opt('--out')) || OP.sets.map(s => s.id).join(',')).split(',');
const WALKS = +(opt('--walks') || 40), OUT = opt('--out') || '/tmp/ck-curated.json';
const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const others = pool(new Set(OP.sets.map(s => s.id)));
for (const id of ids) {
  const s = OP.sets.find(x => x.id === id); seed = [...id].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) & 0x7fffffff;
  let p0 = E.Pos.from(null); const named = []; for (const t of s.moves.split(' ')) { const m = E.parse(p0, t); named.push(m); p0.play(m); }
  const cand = new Map();
  for (let w = 0; w < WALKS; w++) {
    let p = p0.clone(); const pathM = named.slice();
    for (let ply = 0; ply < 18; ply++) {
      const ms = p.moves(); if (!ms.length) break;
      const r = W.analyze(p.spec(), [], 120), sc = r.list.map(e => [e.m, e.v]);
      const key = p.spec().b + p.side;
      if (!cand.has(key) && judge(p.spec(), sc)) cand.set(key, { spec: p.spec(), path: pathM.slice() });
      // the opening's traps: a slip here (60+ below the best), and the reply that punishes it
      for (const [m, v] of sc) { if (v > sc[0][1] - 60) continue; const c = p.clone().play(m), k2 = c.spec().b + c.side; if (cand.has(k2) || c.moves().length < 3) continue;
        const s2 = W.analyze(c.spec(), [], 100).list.map(e => [e.m, e.v]); if (judge(c.spec(), s2)) cand.set(k2, { spec: c.spec(), path: pathM.concat([m]) }); }
      const ok = sc.filter(e => e[1] >= sc[0][1] - 25), m = ok[Math.floor(rnd() * ok.length)][0];
      pathM.push(m); p = p.clone().play(m);
    }
  }
  // the longer search, then the choice
  const conf = [];
  for (const c of cand.values()) { const r = W.analyze(c.spec, [], 1500), sc = r.list.map(e => [e.m, e.v]), J = judge(c.spec, sc); if (!J) continue;
    let ok = true; for (const ms of [400, 700, 1000, 2500]) { const r2 = W.analyze(c.spec, [], ms).list.map(e => [e.m, e.v]), J2 = judge(c.spec, r2); if (!J2 || J2.A !== J.A) { ok = false; break; } }
    for (const dp of [14, 16]) { const r2 = W.analyzeDepth(c.spec, dp).list.map(e => [e.m, e.v]), J2 = judge(c.spec, r2); if (!J2 || J2.A !== J.A) ok = false; }
    if (!ok) continue;   // (the same with shorter and longer searches, and at the fixed depth tools/lesson-verify.js checks with)
    conf.push({ s: c.spec, best: J.A, sc, path: c.path, d: J.d }); }
  const taken = Object.entries(res).filter(([k]) => k !== id).flatMap(([, v]) => v.map(P => P.s.b)), pick = [], ans = new Map();
  conf.sort((a, b) => a.path.length - b.path.length);
  for (const P of conf) { if (pick.length >= 9) break;
    if ((ans.get(P.best) || 0) >= 2) continue;
    if (others.some(([, b]) => dist(b, P.s.b) < 5) || taken.some(b => dist(b, P.s.b) < 5) || pick.some(Q => dist(Q.s.b, P.s.b) < 5)) continue;
    pick.push(P); ans.set(P.best, (ans.get(P.best) || 0) + 1); }
  pick.sort((a, b) => a.d - b.d);
  res[id] = pick; fs.writeFileSync(OUT, JSON.stringify(res)); fs.writeFileSync(OUT.replace(/\.json$/, '') + '-conf-' + id + '.json', JSON.stringify(conf));
  console.error(id, 'candidates', cand.size, 'confirmed', conf.length, 'chosen', pick.length, pick.map(P => P.d.toFixed(2)).join(' '));
}
