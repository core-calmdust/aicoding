// node janggi/tools/gen_lessons.js dump.txt mates.txt[,mates2.txt…] [ms]  → janggi/lessons.json
// (Forked from xiangqi/tools/gen_lessons.js.) Lesson problems are picked automatically and checked by the engine:
//   * middlegame steps: positions of engine self-play games (`jg dump`, tools/native.c) whose best move is clearly better
//     than every other move and is of the step's kind (a chariot capture, a fork, a defence …);
//   * mate steps: positions harvested by `jg mates` (unique mate in 1 / 2 / 3), re-verified with the page's solver and
//     not used in the puzzle collection (puzzles.json);
//   * endgame steps: random endgame positions in which exactly one move mates by force.
// Each middlegame / endgame problem stores the engine value of every legal move (sc), so near-best answers earn partial points.
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
const { keepLangs } = require(path.join(__dirname, '../../tools', 'keep-langs.js'));
const VAL = [0, 0, 300, 300, 500, 1300, 700, 200];   // guard, elephant, horse, chariot, cannon, soldier (×100 of the scoring points)
let rs = 12345; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
const flipFen = f => {   // rotate 180 degrees and swap the colours: Han to move becomes Cho to move
  const [b, s] = f.split(' ');
  const rows = b.split('/').reverse().map(r => r.split('').reverse().map(c => /[a-z]/.test(c) ? c.toUpperCase() : c.toLowerCase()).join(''));
  return rows.join('/') + ' ' + (s === 'b' ? 'w' : 'b');
};
const nPieces = fen => (fen.split(' ')[0].match(/[a-z]/gi) || []).length;
(async () => {
  const W = await load(), E = W.E;
  const [dumpF, matesF, msA] = process.argv.slice(2), ms = +(msA || 400);
  const T = E.typeOf, C = E.colorOf;
  // ---- candidate positions from self-play (always shown with Cho to move)
  const games = []; let lastPly = 1e9;
  for (const ln of fs.readFileSync(dumpF, 'utf8').split('\n')) {
    const a = ln.split(' '); if (a[0] !== 'F') continue;
    const ply = +a[1]; if (ply < lastPly) games.push([]); lastPly = ply;
    const fen = a[2] + ' ' + a[3]; games[games.length - 1].push(a[3] === 'b' ? flipFen(fen) : fen);
  }
  const free = (after, to, opp) => !after.pseudo(opp, true).some(x => E.mTo(x) === to && after.safe(x, opp));   // nobody can take back
  const attacked = (pos, s, by) => pos.pseudo(by, true).some(x => E.mTo(x) === s && pos.safe(x, by));
  function kindOf(pos, m) {
    const me = pos.side, op = 1 - me, f = E.mFrom(m), to = E.mTo(m);
    if (f === to) return [];
    const p = pos.at(f), q = pos.at(to), tp = T(p);
    const after = pos.clone(); after.play(m);
    const out = [];
    if (q) {
      if (free(after, to, op) && VAL[T(q)] >= 200) out.push({ 5: 'b_rook', 4: 'b_horse', 3: 'b_elephant', 6: 'b_cannon', 7: 'b_pawn' }[tp]);
      else if (VAL[T(q)] > VAL[tp] + 150) out.push('t_capture');
      return out.filter(Boolean);
    }
    if (after.inCheck()) { out.push('t_check'); return out; }
    if (attacked(pos, f, op) && VAL[tp] >= 500 && !attacked(after, to, op)) out.push('b_escape');
    // double attack: the moved piece attacks two enemy pieces worth a horse or more (or the general)
    const tg = after.pseudo(me, true, to).map(x => E.mTo(x)).filter(s => VAL[T(after.at(s))] >= 500 || T(after.at(s)) === E.KING);
    if (tg.length >= 2 && !attacked(after, to, op)) out.push('t_fork');
    // defence: before the move the opponent could take a piece of ours; afterwards no longer for free
    const hang = s => { const x = pos.at(s); return x && C(x) === me && T(x) !== E.KING && VAL[T(x)] >= 500; };
    const thr = []; for (let s = 0; s < 90; s++) if (hang(s) && s !== f && attacked(pos, s, op)) thr.push(s);
    if (thr.length && !out.includes('b_escape') && thr.every(s => !attacked(after, s, op) || !free(after.clone(), s, op))) out.push('t_defend');
    return out;
  }
  const want = { b_rook: 5, b_horse: 5, b_elephant: 5, b_cannon: 5, b_pawn: 5, b_escape: 5, t_capture: 5, t_fork: 5, t_check: 5, t_defend: 5 };
  const got = {}; for (const k in want) got[k] = [];
  let analysed = 0;
  const cache = process.env.LS_CACHE && fs.existsSync(process.env.LS_CACHE) ? JSON.parse(fs.readFileSync(process.env.LS_CACHE, 'utf8')) : null;
  const full = () => Object.keys(want).every(x => got[x].length >= want[x] * 3);
  if (cache) Object.assign(got, cache);
  else for (const g of games) {
    const usedHere = new Set();
    for (const fen of g) {
      const pos = E.Pos.from(fen); if (pos.status() !== 0 || pos.inCheck()) continue;
      const ks = new Set(); for (const m of pos.moves()) for (const k of kindOf(pos, m)) if (got[k] && got[k].length < want[k] * 3 && !usedHere.has(k)) ks.add(k);
      if (!ks.size) continue;
      const r = E.analyze(fen, [], ms); analysed++; const L = r.list.slice().sort((a, b) => b.v - a.v);
      if (L.length < 4 || L[0].v > E.WINT || L[0].v < -300 || L[0].v > 2500 || L[0].v - L[1].v < 250) continue;
      const k = kindOf(pos, L[0].m).find(x => ks.has(x)); if (!k) continue;
      got[k].push({ s: fen, best: L[0].m, sc: L.map(e => [e.m, e.v]), n: nPieces(fen) });
      usedHere.add(k);
      if (full()) break;
    }
    if (full()) break;
  }
  if (process.env.LS_CACHE && !cache) fs.writeFileSync(process.env.LS_CACHE, JSON.stringify(got));
  process.stderr.write('analysed ' + analysed + ' ' + Object.entries(got).map(([k, v]) => k + ':' + v.length).join(' ') + '\n');
  const pick = (arr, n) => { arr.sort((a, b) => a.n - b.n); if (arr.length <= n) return arr; const o = []; for (let i = 0; i < n; i++) o.push(arr[Math.floor(i * arr.length / n)]); return o; };
  // ---- mates: harvested positions, re-verified, not in the puzzle collection
  const used = new Set();
  try { for (const th of JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8')).themes) for (const p of th.puzzles) used.add(p.s.split(' ')[0]); } catch (e) {}
  const mc = { 1: [], 2: [], 3: [] }, seen = new Set();
  for (const f of (matesF || '').split(',').filter(Boolean)) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
    const a = ln.trim().split(/\s+/); if (a.length < 6 || a[0] !== 'G') continue;
    const k = +a[1], fen0 = a[2] + ' ' + a[3], fen = a[3] === 'b' ? flipFen(fen0) : fen0, key = fen.split(' ')[0];
    if (!mc[k] || used.has(key) || seen.has(key)) continue; seen.add(key);
    mc[k].push(fen);
  }
  function mateSet(k, n) {
    const o = [];
    for (const fen of mc[k]) {
      if (o.length >= n * 3) break;
      const P0 = E.Pos.from(fen); if (P0.status() !== 0 || P0.side !== 0) continue;
      const L = E.puzzle(fen, [], k, false, false); if (!L) continue;
      const win = L.filter(e => e.need > 0 && e.need <= k);
      if (win.length !== 1 || win[0].need !== k) continue;
      o.push({ s: fen, ok: [win[0].m], best: win[0].m, n: nPieces(fen) });
    }
    return pick(o, n);
  }
  const mates = { b_mate1: mateSet(1, 5), m_mate2: mateSet(2, 5), m_mate3: mateSet(3, 5) };
  // ---- endgames: random positions, exactly one move mates by force (or, loose: few equally fast ones)
  function randEnd(spec) {
    for (let tries = 0; tries < 200; tries++) {
      const b = Array(90).fill('');
      const put = (ch, pool) => { const fr = pool.filter(s => !b[s]); if (!fr.length) return false; b[fr[rnd(fr.length)]] = ch; return true; };
      const pal = r0 => [0, 1, 2].flatMap(r => [3, 4, 5].map(c => (r0 + r) * 9 + c));
      const all = Array.from({ length: 90 }, (_, i) => i), row = s => Math.floor(s / 9);
      put('K', pal(7)); put('k', pal(0));
      for (const ch of spec) {
        if (ch === 'P') put('P', all.filter(s => row(s) >= 1 && row(s) <= 4));
        else if (ch === 'a') put('a', pal(0)); else if (ch === 'A') put('A', pal(7));
        else put(ch, all);
      }
      const fen = b.reduce((rows, x, s) => { if (s % 9 === 0) rows.push([]); rows[rows.length - 1].push(x); return rows; }, []).map(r => { let o = '', e = 0; for (const x of r) { if (!x) { e++; continue; } if (e) o += e; e = 0; o += x; } return o + (e ? e : ''); }).join('/') + ' w';
      const pos = E.Pos.from(fen);
      if (pos.status() !== 0 || pos.inCheck()) continue;
      const q = pos.clone(); q.side = 1; if (q.inCheck()) continue;   // Han not in check either
      return fen;
    }
    return null;
  }
  function endSet(spec, n, loose) {
    const o = []; let t = 0;
    while (o.length < n * 2 && t++ < 300) {
      const fen = randEnd(spec); if (!fen) continue;
      const r = E.analyze(fen, [], ms * 2), L = r.list.slice().sort((a, b) => b.v - a.v);
      if (L.length < 4 || L[0].v < E.WINT) continue;
      if (!loose ? L[1].v >= E.WINT : L.filter(e => e.v >= L[0].v - 10).length > 2 || !L.some(e => e.v < E.WINT)) continue;
      const mateIn = Math.ceil((E.WIN - L[0].v) / 2); if (mateIn < 2 || mateIn > 7) continue;
      o.push({ s: fen, best: L[0].m, sc: L.map(e => [e.m, e.v]), n: mateIn });
    }
    process.stderr.write('end ' + spec + ' ' + o.length + ' of ' + t + '\n');
    return pick(o, n);
  }
  const ends = { e_rook: endSet('RHa', 5), e_pawn: endSet('PPa', 5, true) };
  process.stderr.write('mates ' + Object.entries(mates).map(([k, v]) => k + ':' + v.length).join(' ') + ' ends ' + Object.entries(ends).map(([k, v]) => k + ':' + v.length).join(' ') + '\n');
  const COURSE = { b_rook: 'basics', b_horse: 'basics', b_elephant: 'basics', b_cannon: 'basics', b_pawn: 'basics', b_escape: 'basics', b_mate1: 'basics',
    t_capture: 'tactics', t_fork: 'tactics', t_check: 'tactics', t_defend: 'tactics', m_mate2: 'mates', m_mate3: 'mates', e_rook: 'endgame', e_pawn: 'endgame' };
  const all = Object.assign({}, Object.fromEntries(Object.entries(got).map(([k, v]) => [k, pick(v, want[k])])), mates, ends);
  const steps = Object.keys(COURSE).filter(id => all[id] && all[id].length >= 3).map(id => ({ id, course: COURSE[id], problems: all[id].map(p => { const o = { s: p.s }; if (p.ok) o.ok = p.ok; o.best = p.best; if (p.sc) o.sc = p.sc; return o; }) }));
  const out = path.join(__dirname, '..', 'lessons.json');
  fs.writeFileSync(out, JSON.stringify(fs.existsSync(out) ? keepLangs({ version: 1, steps }, out) : { version: 1, steps }));
  console.log('lessons.json', steps.map(s => s.id + ':' + s.problems.length).join(' '));
})();
