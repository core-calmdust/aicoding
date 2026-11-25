// 囲碁の定石・布石の練習問題（go/open、go/openings.json の problems）の厳しい検証（2026-11-24 第2期・担当B、claude/lesson-quality.md）。
// 読み（強いネット＋探索 300 訪問、go/tools/openings-read.mjs で作る go/tools/data/openings-reads.json。--deep で読み直し＝追26）で、全問：
//   ① 読みの首位（訪問数）が正解（ok）に入り、正解の手はすべて首位から 0.5 目以内（読んだ手であること）
//   ② 正解のほかに同じくらい良い手がない：正解以外で読んだ手（10訪問以上）はすべて首位より 1.0 目以上悪い・正解に訪問数の6割以上。
//      16点の手（good）は置かない（12点を超える「惜しい」は正解か不正解かはっきりしない＝追3）
//   ③ 簡単すぎない：正解のほかに方策の確率 3% 以上の候補が2つ以上・正解の方策は 0.9 以下
//   ④ 手番が本の側（set.side）・手順の手（line[at]）が正解・手順（本筋・変化）が最後まで合法
//   ⑤ ほかの囲碁の問題（定石・布石の全問題、レッスン・準備、詰碁）と、8つの対称と色の入れかえ込みで3石以上違う（同じ本の問題どうしも）
//   ⑥ 出題の順：2D（learn.js startPractice）・3D（lessons3d.js GO.opening）とも、5問を超える本からランダムに5問を引かない（追9）・
//      手順の順（at の昇順）＝読みの難しさ（正解の方策の低い順ではなくても、at が進むほど石が増える）で出す
//   ⑦⑧ ゴイシペンの文（3D の goOpJa）を全合法手で盤の事実と照合（tools/lesson-verify-goopja.js、2026-11-26）
//   手順の外の問題（P.mv：初手からの手、2026-11-26）：P.mv は本筋か変化の手順をそのまま進み、最後の1手だけ相手（本の反対の側）が
//   手順を外れた手（手順の手と違う）。答えはそのあとの本の側の手。読みは openings-reads.json の id + '@' + P.mv.join(' ')。
//   verified の本は読みを2つ（300訪問 top と 1000訪問 deep）持ち、①②③を両方で当てる（追4・追84）
//   ⑨ 2D（learn.js problemPoints）と 3D（lessons3d.js GO.points）の点が全合法手で同じ
//   追67 同じ局面（8対称・色の入れかえ込み）で、ほかの本の手順（本筋・変化＝見本）が打つ手を、この問題が不正解・16点・10点にしていない
//   追4 手順のメモの評価（evals、黒から見た目数）が読みと 1.0 目以内
// 本（set）に verified: true がない本は pending（作り直し前）。--all で全本の全問を検査して不合格の内訳を出す。
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const R = require(path.join(ROOT, 'go/rules.js'));
const EPS = 0.5, GAP = 1.0, MINV = 10;

function specFrom(o) { const n = o.n || 19, a = Array(n * n).fill('.');
  for (const s of o.ab || []) a[R.parseCoord(s, n)] = 'b'; for (const s of o.aw || []) a[R.parseCoord(s, n)] = 'w';
  return { n, stones: a.join(''), turn: o.turn || 1 }; }
function startOf(g) { const n = g.n || 19; if (g.start) return specFrom(Object.assign({ n }, g.start));
  if (g.handi) { const a = Array(n * n).fill('.'); R.handicapPoints(n, g.handi).forEach(i => { a[i] = 'b'; }); return { n, stones: a.join(''), turn: 2 }; }
  return { n, stones: '.'.repeat(n * n), turn: 1 }; }
const mvOf = (g, P) => P.mv || g.line.slice(0, P.at);   // the problem's moves from the start (P.mv: off the line, 2026-11-26)
function play(g, moves) { let p = R.Pos.from(startOf(g)); for (let k = 0; k < moves.length; k++) { const r = p.tryPlay(R.parseCoord(moves[k], g.n || 19)); if (!r) return { bad: k }; p = r.pos; } return { pos: p }; }
const stonesOf = p => { const s = [], n = p.n; for (let i = 0; i < n * n; i++) if (p.b[i]) s.push([p.b[i], i % n, Math.floor(i / n)]); return s; };
const specStones = sp => stonesOf(R.Pos.from(sp));
function dist(A, nA, B, nB) {   // stones that differ (8 symmetries of the board, and the colours swapped); different boards never match
  if (nA !== nB || Math.abs(A.length - B.length) > 2) return 99; const n = nA, m = n - 1;
  const SY = [(x, y) => [x, y], (x, y) => [m - x, y], (x, y) => [x, m - y], (x, y) => [m - x, m - y], (x, y) => [y, x], (x, y) => [m - y, x], (x, y) => [y, m - x], (x, y) => [m - y, m - x]];
  const Bs = new Set(B.map(([c, x, y]) => c + ',' + x + ',' + y)); let best = 99;
  for (const f of SY) for (const sw of [0, 1]) { let hit = 0; for (const [c, x, y] of A) { const [u, v] = f(x, y); if (Bs.has((sw ? 3 - c : c) + ',' + u + ',' + v)) hit++; } best = Math.min(best, A.length + B.length - 2 * hit); }
  return best;
}
// the canonical form of a position (the smallest of the 8 symmetries, colours swapped so that the side to move is 'b'), with the
// map of a point into that form and back
function canon(p) {
  const n = p.n, m = n - 1, SY = [(x, y) => [x, y], (x, y) => [m - x, y], (x, y) => [x, m - y], (x, y) => [m - x, m - y], (x, y) => [y, x], (x, y) => [m - y, x], (x, y) => [y, m - x], (x, y) => [m - y, m - x]];
  let best = null, bi = 0;
  SY.forEach((f, k) => { const a = Array(n * n).fill('.'); for (let i = 0; i < n * n; i++) if (p.b[i]) { const [u, v] = f(i % n, Math.floor(i / n)); a[v * n + u] = p.b[i] === p.turn ? 'b' : 'w'; } const s = a.join(''); if (best == null || s < best) { best = s; bi = k; } });
  const f = SY[bi], inv = {}; for (let i = 0; i < n * n; i++) { const [u, v] = f(i % n, Math.floor(i / n)); inv[v * n + u] = i; }
  return { key: n + ':' + best, map: i => i < 0 ? i : (([u, v]) => v * n + u)(f(i % n, Math.floor(i / n))), unmap: j => j < 0 ? j : inv[j] };
}
// the 3D scoring as written (atlas/lessons3d.js GO.points) and the 2D one (go/learn.js problemPoints)
function scorers() {
  const s3 = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), m3 = s3.match(/\n\s+points: (\(P, u\) => \(P\.ok \|\| \[\]\)\.includes\(u\) \? 20 [^\n]*?),\s+\/\/ = go\/learn\.js problemPoints/);
  const s2 = fs.readFileSync(path.join(ROOT, 'go/learn.js'), 'utf8'), a = s2.indexOf('function problemPoints(P, m, n) {'), b = s2.indexOf('\n}', a);
  if (!m3 || a < 0) return null;
  const p3 = vm.runInNewContext(m3[1]), p2 = vm.runInNewContext('(' + s2.slice(a, b + 2) + ')', { gtps: (a, n) => (a || []).map(q => R.parseCoord(q, n)) });
  return { p3, p2 };
}
function reads() { try { return J('go/tools/data/openings-reads.json'); } catch (e) { return null; } }
// the order the problems are given in: 2D and 3D must not draw 5 at random from a longer pool (追9)
function drawsAtRandom() {
  const s3 = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), s2 = fs.readFileSync(path.join(ROOT, 'go/learn.js'), 'utf8');
  const out = [];
  if (/probs = shuffle\(g\.problems \|\| \[\]\)\.slice\(0, 5\)/.test(s3)) out.push('3D（lessons3d.js GO.opening）が problems から shuffle で5問を引く');
  const a = s2.indexOf('function startPractice(gi)'), body = s2.slice(a, s2.indexOf('\n}', a));
  if (/Math\.random\(\)/.test(body)) out.push('2D（learn.js startPractice）が problems から Math.random で5問を引く');
  return out;
}

function verify(opt = {}) {
  const O = opt.O || J('go/openings.json'), RD = opt.reads || reads(), F = [], all = !!opt.all, sc = scorers();
  const sets = O.sets.filter(g => all || g.verified);
  // the pool for ⑤: every go/open problem, the lessons and warm-ups, the tsumego
  const pool = [];
  O.sets.forEach(g => (g.problems || []).forEach((P, j) => { const r = play(g, mvOf(g, P)); if (r.pos) pool.push({ who: `${g.id} q${j + 1}`, id: g.id, j, n: g.n || 19, S: stonesOf(r.pos) }); }));
  const L = J('go/lessons.json'); L.steps.forEach(st => { (st.problems || []).forEach((P, j) => pool.push({ who: `lesson ${st.id} q${j + 1}`, n: P.s.n, S: specStones(P.s) })); (st.ramp || []).forEach((r, j) => { if (r.s) pool.push({ who: `lesson ${st.id} warm-up ${j + 1}`, n: r.s.n, S: specStones(r.s) }); }); });
  J('go/puzzles.json').themes.forEach(t => (t.puzzles || []).forEach((P, j) => { if (P.s) pool.push({ who: `tsumego ${t.id} ${j + 1}`, n: P.s.n, S: specStones(P.s) }); }));
  const rnd = drawsAtRandom();
  // 追67: every move some set's study line (main line or variation) plays from each position, keyed by the canonical position
  // (8 symmetries, colours swapped with the side to move) — a problem at the same position must not score a taught move below 20
  const taught = new Map();
  O.sets.forEach(g => { const N = g.n || 19, walk = (moves, from, tag) => { let p = R.Pos.from(startOf(g));
      for (let k = 0; k < moves.length; k++) { const m = R.parseCoord(moves[k], N); if (k >= from) { const c = canon(p), key = c.key, mm = c.map(m);
          if (!taught.has(key)) taught.set(key, new Map()); const t = taught.get(key); if (!t.has(mm)) t.set(mm, tag + `（${k + 1}手目 ${moves[k]}）`); }
        const r = p.tryPlay(m); if (!r) return; p = r.pos; } };
    walk(g.line, 0, g.id + ' の本筋'); (g.vars || []).forEach((v, i) => walk(g.line.slice(0, v.at).concat(v.line), v.at, g.id + ` の変化${i + 1}`)); });
  for (const g of sets) {
    const N = g.n || 19, st = startOf(g), side = g.side || 1, bad = (q, msg) => F.push({ step: 'go/open ' + g.id, q, msg });
    { const r = play(g, g.line); if (r.bad != null) bad(0, `④ 本筋の ${r.bad + 1} 手目 ${g.line[r.bad]} が合法でない`); }
    (g.vars || []).forEach((v, k) => { const r = play(g, g.line.slice(0, v.at).concat(v.line)); if (r.bad != null) bad(0, `④ 変化${k + 1}（${v.at}手目から）の手が合法でない`); });
    if ((g.problems || []).length > 5 && rnd.length) bad(0, `追9 ${g.problems.length}問から5問をランダムに引く：${rnd.join('・')}`);
    const prev = [];
    (g.problems || []).forEach((P, j) => {
      const q = j + 1, mv = mvOf(g, P), mover = mv.length % 2 ? 3 - st.turn : st.turn, ok = P.ok || [], ans = P.mv ? null : g.line[P.at];
      if (P.mv) { if (P.at !== P.mv.length) bad(q, `④ at（${P.at}）が P.mv の手数（${P.mv.length}）と違う`);
        const Ls = [g.line].concat((g.vars || []).map(v => g.line.slice(0, v.at).concat(v.line)));
        const dv = Math.max(...Ls.map(L => { let k = 0; while (k < L.length && k < P.mv.length && L[k] === P.mv[k]) k++; return k; }));   // where it leaves the line
        if (dv >= P.mv.length) bad(q, '④ P.mv が手順の上の局面（手順の外でない）');
        else if ((dv % 2 ? 3 - st.turn : st.turn) === side) bad(q, '④ 手順を外れた手が本の側の手（相手が外れた局面でない）');
        // after the other side left the line: the side's moves are the reading's first move there (its stored reading), the other side's are any
        for (let k = dv + 1; k < P.mv.length; k++) if ((k % 2 ? 3 - st.turn : st.turn) === side) { const r0 = RD && RD.pos && RD.pos[g.id + '@' + P.mv.slice(0, k).join(' ')];
          if (!r0 || !r0.top.length || r0.top[0][0] !== P.mv[k]) bad(q, `④ 手順を外れたあとの本の側の手 ${P.mv[k]}（${k + 1}手目）が読みの首位でない（${r0 && r0.top.length ? r0.top[0][0] : '読みなし'}）`); } }
      if (mover !== side) bad(q, `④ 手番が本の側でない（${mover === 1 ? '黒' : '白'}の手を当てさせる、本は${side === 1 ? '黒' : '白'}）`);
      if (ans != null && !ok.includes(ans)) bad(q, `④ 手順の手 ${ans} が正解に入っていない（正解 ${ok.join(' ')}）`);
      if ((P.good || []).length) bad(q, `② 16点の手（good）${P.good.join(' ')}：正解か不正解かはっきりしない（12点を超える）`);
      const r = play(g, mv); if (!r.pos) { bad(q, '④ 問題の局面まで手順が合法でない'); return; }
      const pos = r.pos, legal = []; for (let i = 0; i < N * N; i++) if (pos.tryPlay(i)) legal.push(i);
      { const c = canon(pos), t = taught.get(c.key), okc = new Set(ok.map(m => c.map(R.parseCoord(m, N))));
        if (t) for (const [mm, who] of t) if (!okc.has(mm) && !who.startsWith(g.id + ' の本筋')) { bad(q, `追67 同じ局面で ${who} が打つ手 ${R.coord(c.unmap(mm), N)} をこの問題は ${(P.good || []).includes(R.coord(c.unmap(mm), N)) ? '16点' : (P.half || []).includes(R.coord(c.unmap(mm), N)) ? '10点' : '不正解'} にしている（本によって正解が食い違う）`); break; } }
      // ⑨ 2D and 3D give the same points to every legal move
      if (!sc) bad(q, '⑨ 2D／3D の採点の式が見つからない'); else {
        const P3 = { ok: ok.map(m => R.parseCoord(m, N)), good: (P.good || []).map(m => R.parseCoord(m, N)), half: (P.half || []).map(m => R.parseCoord(m, N)) };
        const d = legal.find(u => sc.p3(P3, u) !== sc.p2(P, u, N)); if (d != null) bad(q, `⑨ ${R.coord(d, N)} の点が 2D ${sc.p2(P, d, N)}・3D ${sc.p3(P3, d)} で違う`); }
      // ⑤ no other go problem within 2 stones
      const S = stonesOf(pos); for (const o of pool) { if (o.id === g.id && o.j === j) continue; const d = dist(S, N, o.S, o.n); if (d <= 2) { bad(q, `⑤ ${o.who} と ${d} 石違い（${d === 0 ? '同じ局面' : '1〜2手違い'}）`); break; } }
      prev.push(P.at);
      // ①②③ from the stored reading (no reading = NG, 追26)
      const Rd0 = RD && RD.pos && RD.pos[g.id + '@' + (P.mv ? P.mv.join(' ') : P.at)];
      if (!Rd0) { bad(q, '①②③ 読みがない（go/tools/openings-read.mjs で go/tools/data/openings-reads.json を作る）'); return; }
      if (g.verified && !(Rd0.deep && Rd0.deep.top && Rd0.deep.top.length)) bad(q, '追84 2つ目の読み（deep：1000訪問）がない');
      for (const [Rd, tag] of [[Rd0, ''], [g.verified && Rd0.deep, '（deep）']]) { if (!Rd || !Rd.top) continue; const bad0 = bad; { const bad = (q, m) => bad0(q, m.replace(/^([①-⑨]+)/, '$1' + tag));
      const top = Rd.top.filter(e => e[1] >= MINV), best = Rd.top[0], bl = best[2], val = new Map(Rd.top.map(e => [e[0], e]));
      if (!ok.includes(best[0])) bad(q, `① 読みの首位 ${best[0]}（${best[1]}訪問・${bl}目）が正解に入っていない（正解 ${ok.join(' ')}）`);
      ok.forEach(m => { const e = val.get(m); if (!e) bad(q, `① 正解 ${m} を読みが調べていない（訪問0）`); else if (e[2] < bl - EPS) bad(q, `① 正解 ${m} が首位より ${(bl - e[2]).toFixed(2)} 目悪い`); });
      const sec = top.filter(e => !ok.includes(e[0])).sort((a, b) => b[2] - a[2])[0];
      if (sec && sec[2] > bl - GAP) bad(q, `② 正解以外の ${sec[0]}（${sec[1]}訪問）が首位と ${(bl - sec[2]).toFixed(2)} 目差（${GAP}目未満＝同じくらい良い）`);
      const vs = Rd.top.reduce((a, e) => a + e[1], 0), vok = Rd.top.filter(e => ok.includes(e[0])).reduce((a, e) => a + e[1], 0);
      if (vok < 0.6 * vs) bad(q, `② 正解への訪問が ${Math.round(100 * vok / vs)}%（6割未満）`);
      const pa = (Rd.pol.find(e => ok.includes(e[0])) || [0, 0])[1], alt = Rd.pol.filter(e => !ok.includes(e[0]) && e[1] >= 0.03).length;
      if (pa > 0.9 || alt < 2) bad(q, `③ 簡単すぎる（正解の方策 ${pa}、ほかの候補 ${alt}）`); } }
    });
    // ⑦⑧ ゴイシペンの文を全合法手で盤の事実と照合（verified の本）
    if (g.verified) { const JA = require('./lesson-verify-goopja.js');
      try { JA.verifySet(g, O.sets.indexOf(g), P => play(g, mvOf(g, P)).pos, P => mvOf(g, P)).forEach(f => bad(f.q, f.msg)); } catch (e) { bad(0, '⑦⑧ ゴイシペンの文を作れない：' + e.message); } }
    // 追4 the notes' evaluations (Black's lead after each line move) against the reading of the next position
    (g.evals || []).forEach((v, i) => { const Rd = RD && RD.pos && RD.pos[g.id + '@' + (i + 1)]; if (!Rd || !Rd.top.length) return;
      const b = Rd.turn === 1 ? Rd.top[0][2] : -Rd.top[0][2]; if (Math.abs(b - v) > 1.0) bad(0, `追4 ${i + 1}手目のあとの評価 ${v} が読み（黒から ${b.toFixed(2)}）と 1.0 目以上ずれる`); });
  }
  return F;
}
module.exports = verify;
module.exports.DONE = () => J('go/openings.json').sets.filter(g => g.verified).map(g => g.id);
if (require.main === module) {
  const all = process.argv.includes('--all'), F = verify({ all });
  if (all) { const by = {}, probs = new Set(), cnt = {}; F.forEach(f => { const k = (f.msg.match(/^(追\d+|[①-⑨]+)/) || ['?'])[0]; by[k] = (by[k] || 0) + 1; if (f.q) { probs.add(f.step + ' ' + f.q); (cnt[f.step + ' ' + f.q] = cnt[f.step + ' ' + f.q] || []).push(k); } });
    const O = J('go/openings.json'), tot = O.sets.reduce((a, g) => a + g.problems.length, 0);
    console.log(`go/open 全${O.sets.length}本 ${tot}問：不合格 ${probs.size}問、合格 ${tot - probs.size}問`); console.log('項目ごとの指摘数：' + Object.entries(by).map(([k, v]) => k + ' ' + v).join('・'));
    if (process.argv.includes('-v')) F.forEach(f => console.log(`NG ${f.step} q${f.q}: ${f.msg}`)); }
  else { F.forEach(f => console.log(`NG ${f.step} q${f.q}: ${f.msg}`)); console.log(F.length ? `NG ${F.length}` : `OK goOpen（verified: ${module.exports.DONE().join('・') || 'なし'}）`); }
  process.exit(F.length && !all ? 1 : 0);
}
