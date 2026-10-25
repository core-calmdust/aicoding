// node tools/gen_lessons.js dump.txt pz_all.json [ms]  → lessons.json
// Lesson problems are picked automatically and checked by the engine:
//   * middlegame steps: positions of engine self-play games (`xq dump`, tools/native.c) whose best move is clearly better
//     than every other move (≥ 1.5 pawns) and is of the step's kind (a rook capture, a fork, a defence …);
//   * mate steps: verified mates from tools/build_puzzles.js that the puzzle collection does not use;
//   * endgame steps: random endgame positions in which exactly one move mates by force.
// Each problem stores the engine value of every legal move (sc), so near-best answers earn partial points.
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
const VAL = [0, 0, 200, 200, 400, 900, 450, 100];
let rs = 12345; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
(async () => {
  const W = await load(), E = W.E;
  const [dumpF, pzF, msA] = process.argv.slice(2), ms = +(msA || 400);
  const T = E.typeOf, C = E.colorOf;
  // ---- candidate positions from self-play
  const games = []; let lastPly = 1e9;
  for (const ln of fs.readFileSync(dumpF, 'utf8').split('\n')) {
    const a = ln.split(' '); if (a[0] !== 'F') continue;
    const ply = +a[1]; if (ply < lastPly) games.push([]); lastPly = ply;
    games[games.length - 1].push(a[2] + ' ' + a[3]);
  }
  const free = (after, to, opp) => !after.pseudo(opp, true).some(x => E.mTo(x) === to && after.safe(x, opp));   // nobody can take back
  const attacked = (pos, s, by) => pos.pseudo(by, true).some(x => E.mTo(x) === s && pos.safe(x, by));
  function kindOf(pos, m) {
    const me = pos.side, op = 1 - me, f = E.mFrom(m), to = E.mTo(m), p = pos.at(f), q = pos.at(to), tp = T(p);
    const after = pos.clone().play(m);
    const out = [];
    if (q) {
      if (free(after, to, op) && VAL[T(q)] >= 200) out.push({ 5: 'b_rook', 4: 'b_horse', 6: 'b_cannon', 7: 'b_pawn' }[tp]);
      else if (VAL[T(q)] > VAL[tp] + 150) out.push('t_capture');
      return out.filter(Boolean);
    }
    if (after.inCheck()) { out.push('t_check'); return out; }
    if (attacked(pos, f, op) && VAL[tp] >= 400 && !attacked(after, to, op)) out.push('b_escape');
    // double attack: the moved piece attacks two enemy pieces worth a horse or more that are free to take
    const tg = after.pseudo(me, true, to).map(x => E.mTo(x)).filter(s => VAL[T(after.at(s))] >= 400 || T(after.at(s)) === E.KING);
    if (tg.length >= 2 && !attacked(after, to, op)) out.push('t_fork');
    // defence: before the move the opponent could take a piece of ours for free; afterwards no longer
    const hang = s => { const x = pos.at(s); return x && C(x) === me && T(x) !== E.KING && VAL[T(x)] >= 400; };
    const thr = []; for (let s = 0; s < 90; s++) if (hang(s) && s !== f) { const pass = pos.clone(); if (attacked(pass, s, op)) thr.push(s); }
    if (thr.length && !out.includes('b_escape') && thr.every(s => !attacked(after, s, op) || !free(after.clone(), s, op))) out.push('t_defend');
    return out;
  }
  const want = { b_rook: 5, b_horse: 5, b_cannon: 5, b_pawn: 5, b_escape: 5, t_capture: 5, t_fork: 5, t_check: 5, t_defend: 5 };
  const got = {}; for (const k in want) got[k] = [];
  let analysed = 0;
  const cache = process.env.LS_CACHE && fs.existsSync(process.env.LS_CACHE) ? JSON.parse(fs.readFileSync(process.env.LS_CACHE, 'utf8')) : null;
  if (cache) Object.assign(got, cache);
  else for (const g of games) {
    const usedHere = new Set();
    for (let i = 0; i < g.length; i += 1) {
      const fen = g[i], pos = E.Pos.from(fen); if (pos.status() !== 0 || pos.inCheck()) continue;
      // cheap pre-filter: does some move have a wanted kind?
      const ks = new Set(); for (const m of pos.moves()) for (const k of kindOf(pos, m)) if (got[k] && got[k].length < want[k] * 3 && !usedHere.has(k)) ks.add(k);
      if (!ks.size) continue;
      const r = E.analyze(fen, [], ms); analysed++; const L = r.list.slice().sort((a, b) => b.v - a.v);
      if (L.length < 4 || L[0].v > E.WINT || L[0].v < -150 || L[0].v > 1500 || L[0].v - L[1].v < 150) continue;
      const k = kindOf(pos, L[0].m).find(x => ks.has(x)); if (!k) continue;
      got[k].push({ s: fen, best: L[0].m, sc: L.map(e => [e.m, e.v]), n: (fen.split(' ')[0].match(/[a-z]/gi) || []).length });
      usedHere.add(k);
      if (Object.keys(want).every(x => got[x].length >= want[x] * 3)) break;
    }
    if (Object.keys(want).every(x => got[x].length >= want[x] * 3)) break;
  }
  if (process.env.LS_CACHE && !cache) fs.writeFileSync(process.env.LS_CACHE, JSON.stringify(got));
  process.stderr.write('analysed ' + analysed + ' ' + Object.entries(got).map(([k, v]) => k + ':' + v.length).join(' ') + '\n');
  // easier problems (fewer pieces) first; pick spread over the candidates
  const pick = (arr, n) => { arr.sort((a, b) => a.n - b.n); if (arr.length <= n) return arr; const o = []; for (let i = 0; i < n; i++) o.push(arr[Math.floor(i * arr.length / n)]); return o; };
  // ---- mates (verified by build_puzzles.js, not used in the puzzle collection)
  if (pzF === '-') { console.log('middlegame candidates cached'); return; }
  const PZ = JSON.parse(fs.readFileSync(pzF, 'utf8')).filter(p => !p.used);
  const mateSet = (f, n) => pick(PZ.filter(f).map(p => ({ s: p.s, ok: p.firsts || [p.a], best: p.a, n: (p.s.split(' ')[0].match(/[a-z]/gi) || []).length })), n);
  const mates = {
    b_mate1: mateSet(p => p.n === 1 && !p.ck, 5), m_mate2: mateSet(p => p.n === 2 && !p.ck, 5),
    m_hc: mateSet(p => p.pat === 'hc' && !p.ck, 5), m_dc: mateSet(p => p.pat === 'dc' && !p.ck, 5), m_face: mateSet(p => p.pat === 'face' && !p.ck, 5),
  };
  // ---- endgames: random positions, exactly one move mates by force (or wins clearly)
  function randEnd(spec) {
    for (let tries = 0; tries < 200; tries++) {
      const b = Array(90).fill('');
      const put = (ch, pool) => { const free = pool.filter(s => !b[s]); if (!free.length) return false; b[free[rnd(free.length)]] = ch; return true; };
      const pal = (r0) => [0, 1, 2].flatMap(r => [3, 4, 5].map(c => (r0 + r) * 9 + c));
      const advB = [3, 5, 13, 21, 23], all = Array.from({ length: 90 }, (_, i) => i);
      put('K', pal(7)); put('k', pal(0));
      for (const ch of spec) {
        if (ch === 'R') put('R', all); else if (ch === 'P') put('P', all.filter(s => Math.floor(s / 9) <= 4 && Math.floor(s / 9) >= 1)); else if (ch === 'a') put('a', advB);
        else if (ch === 'H') put('H', all); else if (ch === 'C') put('C', all);
      }
      const fen = b.reduce((rows, x, s) => { if (s % 9 === 0) rows.push([]); rows[rows.length - 1].push(x); return rows; }, []).map(r => { let o = '', e = 0; for (const x of r) { if (!x) { e++; continue; } if (e) o += e; e = 0; o += x; } return o + (e ? e : ''); }).join('/') + ' w';
      const pos = E.Pos.from(fen);
      if (pos.status() !== 0 || pos.inCheck()) continue;
      const q = pos.clone(); q.side = 1; if (q.inCheck()) continue;   // black not in check either (and generals not facing)
      return fen;
    }
    return null;
  }
  function endSet(spec, n, loose) {
    const o = []; let t = 0;
    while (o.length < n * 2 && t++ < 400) {
      const fen = randEnd(spec); if (!fen) continue;
      const r = E.analyze(fen, [], ms * 2), L = r.list.slice().sort((a, b) => b.v - a.v);
      if (L.length < 4 || L[0].v < E.WINT) continue;
      // exactly one mating move; or (loose) at most two equally fast ones while some other moves throw the win away
      if (!loose ? L[1].v >= E.WINT : L.filter(e => e.v >= L[0].v - 10).length > 2 || !L.some(e => e.v < E.WINT)) continue;
      const mateIn = Math.ceil((E.WIN - L[0].v) / 2); if (mateIn < 2 || mateIn > 7) continue;
      o.push({ s: fen, best: L[0].m, sc: L.map(e => [e.m, e.v]), n: mateIn });
    }
    return pick(o, n);
  }
  const ends = { e_rook: endSet('Raa', 5), e_pawn: endSet('PPa', 5, true) };
  process.stderr.write('mates ' + Object.entries(mates).map(([k, v]) => k + ':' + v.length).join(' ') + ' ends ' + Object.entries(ends).map(([k, v]) => k + ':' + v.length).join(' ') + '\n');
  const COURSE = { b_rook: 'basics', b_horse: 'basics', b_cannon: 'basics', b_pawn: 'basics', b_escape: 'basics', b_mate1: 'basics',
    t_capture: 'tactics', t_fork: 'tactics', t_check: 'tactics', t_defend: 'tactics', m_mate2: 'mates', m_hc: 'mates', m_dc: 'mates', m_face: 'mates', e_rook: 'endgame', e_pawn: 'endgame' };
  const all = Object.assign({}, Object.fromEntries(Object.entries(got).map(([k, v]) => [k, pick(v, want[k])])), mates, ends);
  const steps = Object.keys(COURSE).filter(id => all[id] && all[id].length >= 3).map(id => ({ id, course: COURSE[id], problems: all[id].map(p => { const o = { s: p.s }; if (p.ok) o.ok = p.ok; o.best = p.best; if (p.sc) o.sc = p.sc; return o; }) }));
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps }));
  console.log('lessons.json', steps.length, 'steps', steps.reduce((a, s) => a + s.problems.length, 0), 'problems');
})();
