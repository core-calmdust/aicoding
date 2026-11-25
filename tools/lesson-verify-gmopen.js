// 五目並べ（連珠）の定跡＝珠型の練習問題（gomoku/open）の厳しい検証（2026-11-24 第2期・担当B、claude/lesson-quality.md）。
// openings.json の verified の本（5問、gomoku/tools/op-curate.js で作る）について、全問：
//   ① 保存した2つの読み（sc＝JavaScript の探索 深さ8、sc2＝深さ6）と、学習した評価（コア＋連珠の net、深さ6）の最善（nb）が
//      同じ1手で、それが答え（sc の首位）。--deep で sc・sc2・nb を読み直して照合（追26）
//   ② ほかの候補はすべて12点以下（2D の problemPoints＝gomoku/app.js の sOfV、3D の GOMOKU.points、sc・sc2 の両方で）
//   ③ 答えのほかに候補が3つ以上・黒の禁手でない合法手
//   ④ P.mv が初形から珠型の3手で始まり（白2手目・黒3手目がその珠型の点）、盤の石・手番・最後の手と合う。3手目より後のどこかで
//      本の手順（study）を外れている・決着していない（|値| < WINT、5の点がない）
//   ⑤ ほかの五目並べの局面（レッスン・準備・パズル（旧版も）・全珠型の手順の局面（追1）・ほかの verified の問題）と、8つの対称と
//      平行移動込みで4石以上違う。同じ本で同じ答えは1回まで・同じ種類の答え（kind）は2回まで
//   ⑥ 易→難（diff：4点以上のほかの候補の数×100＋石の数）の順に並び、2D・3D とも並び順のまま出す（lessons3d.js・app.js の verified）
//   ⑦⑧ ゴイシペンの文（atlas/lessons3d.js GOMOKU_OP_JA.prob を vm で実行）を全合法手で作り、盤の事実と照合：
//      「5つ並べられて負け」＝その手のあと相手に5の点があり自分にない／「{how}を打たれて、もう止められない」＝相手のその手が
//      本当に勝ち（エンジンの VCF・その点の形）／「三が残る」＝相手に達四の点が残る／「悪くない・戦える・すぐには負けない」は
//      その手が10点以上で、相手に四追いの勝ちがないときだけ（追53）／見出しの「いい線いってた！」「あと少し！」「あと一歩！」は
//      10点以上のときだけ（追39）／ほめ言葉の「同じくらい良い一手」は出ない（②）／問いかけ・ヒントの前提（「四が作れる」など）が盤と合う
//   追90 外れた手ごとに、声が選びうる理由の文すべて（選び方の条件つき）とヒントの文すべてを盤の事実と照合：「2つの役目」「じゃまと自分の形」
//      「次の三」＝緑の点の働き／「つながらない」「離れたまま」＝自分の石がとなりにない／「となりに置いても」＝となりにある／「{f}の<向き>の…」＝緑の点が
//      ふさぎ、きみの手がふさがない向き（ナナメは2本とも同じ名前なので、どちらかをふさいでいれば言わない）
//   ⑨ 2D の点（problemPoints）と 3D の点（GOMOKU.points）が全合法手で同じ
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
let E0 = null; const Eng = () => E0 || (E0 = require(path.join(ROOT, 'gomoku/engine.js')));
const sOfV = (v, W) => v > W ? 0.95 : v < -W ? -0.95 : Math.tanh(v / 900) * 0.85;   // = gomoku/app.js sOfV
function pts(sc, u, W) {   // = gomoku/app.js problemPoints (P._sc)
  const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(u) ? val.get(u) : Math.min(...sc.map(e => e[1])) - 200;
  if (best > W) return mine > W ? 20 : 0;
  if (mine >= best - 25) return 20;
  return Math.max(0, Math.round(20 * (1 - (sOfV(best, W) - sOfV(mine, W)) / 0.4)));
}
// the 3D scoring (atlas/lessons3d.js GOMOKU.points), run as written
let P3 = null;
function pts3(sc, u) {
  if (!P3) { const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('    points(P, u) {   // = gomoku/app.js problemPoints'), b = src.indexOf('\n    },', a);
    P3 = vm.runInNewContext('({' + src.slice(a, b) + '\n    }})', { GOP: words().GOP }).points; }
  return P3({ sc }, u);
}
const SY = [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y], (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]];
const st2 = (b, w) => { const E = Eng(), s = []; b.forEach(m => s.push([1, m % 15, Math.floor(m / 15)])); w.forEach(m => s.push([2, m % 15, Math.floor(m / 15)])); return s; };
const cells = a => String(a || '').split(/\s+/).filter(Boolean).map(q => Eng().sqOf(q));
function distS(A, B) {   // stones that differ, the best of the 8 symmetries and any shift (= lesson-verify.js gomoku)
  if (Math.abs(A.length - B.length) > 3) return 99; const Bs = new Set(B.map(([c, x, y]) => c + ',' + x + ',' + y)); let best = 99;
  for (const f of SY) { const A2 = A.map(([c, x, y]) => [c, ...f(x, y)]), tr = new Set(); for (const a of A2) for (const b of B) if (a[0] === b[0]) tr.add((b[1] - a[1]) + ',' + (b[2] - a[2]));
    for (const t of tr) { const [dx, dy] = t.split(',').map(Number); let hit = 0; for (const a of A2) if (Bs.has(a[0] + ',' + (a[1] + dx) + ',' + (a[2] + dy))) hit++; best = Math.min(best, A.length + B.length - 2 * hit); } }
  return best;
}
const stonesOf = P => st2(cells(P.b), cells(P.w));
// every other gomoku position: lessons, warm-ups, puzzles (old ones too), every opening's study line (each prefix), verified problems
let POOL = null;
function pool() {
  if (POOL) return POOL; POOL = [];
  const L = J('gomoku/lessons.json'), PZ = J('gomoku/puzzles.json'), O = J('gomoku/openings.json');
  L.steps.forEach(st => { st.problems.forEach((P, j) => POOL.push({ who: `${st.id} q${j + 1}`, S: stonesOf(P) })); (st.ramp || []).forEach((r, j) => { if (r.b || r.w) POOL.push({ who: `${st.id} warm-up ${j + 1}`, S: stonesOf(r) }); }); });
  const walk = (o, pre) => { if (Array.isArray(o)) o.forEach((x, i) => walk(x, pre + '/' + i)); else if (o && typeof o === 'object') { if (typeof o.b === 'string' && typeof o.w === 'string' && o.side) POOL.push({ who: 'puzzle' + pre, S: stonesOf(o) }); else for (const k in o) walk(o[k], pre + '/' + k); } };
  walk(PZ.cats, ''); walk(PZ.old || {}, '/old');
  O.sets.forEach(g => { const b = [], w = []; g.study.forEach((x, i) => { (i % 2 ? w : b).push(Eng().sqOf(x[0])); if (i >= 2) POOL.push({ who: `${g.id} study ${i + 1}`, set: g.id, study: true, S: st2(b, w) }); }); });
  return POOL;
}
const DIR = [1, 16, 17, 15];   // (unused: kinds from the engine's classes)
function kindOf(P) {   // the kind of the answer: five / block four / four-three / four / block three (+ three) / three / quiet
  const E = Eng(), C = E.C, pos = E.setup('renju', { b: cells(P.b), w: cells(P.w), side: P.side }), s = P.side, o = 3 - s, i = E.M2I[E.sqOf(P.sc[0][0])];
  const k = pos.cls[s][i], ko = pos.cls[o][i];
  if (k === C.FIVE) return 'win'; if (ko === C.FIVE) return 'b4'; if (k === C.F43 || k === C.F4) return 'ft'; if (k === C.B4) return 'four';
  if (ko >= C.F3) return k >= C.F3 ? 'b3t' : 'b3'; if (k >= C.F3) return 'three'; if (ko >= C.F2) return 'blk'; return 'quiet';
}
const diff = P => P.sc.slice(1).filter(e => Math.max(pts(P.sc, e[0], Eng().WINT), pts(P.sc2 || P.sc, e[0], Eng().WINT)) >= 4).length * 100 + cells(P.b).length + cells(P.w).length;
function probOf(mv) {   // a problem from a move list
  const E = Eng(), b = [], w = []; mv.forEach((m, i) => (i % 2 ? w : b).push(m));
  return { b: b.map(E.sqName).join(' '), w: w.map(E.sqName).join(' '), side: mv.length % 2 ? 2 : 1, last: E.sqName(mv[mv.length - 1]), mv: mv.map(E.sqName).join(' ') };
}
// the board / reads checks of one problem (①〜⑤ but the set-wide parts); opt.noNet: skip nb, opt.skipOwn: not against the own set's problems
function check(g, P, opt) {
  opt = opt || {}; const E = Eng(), W = E.WINT, out = [], add = m => out.push(m);
  const mv = String(P.mv || '').split(/\s+/).filter(Boolean).map(E.sqOf), line = g.study.map(x => E.sqOf(x[0]));
  // ④
  if (mv.length < 4 || mv.slice(0, 3).join() !== line.slice(0, 3).join()) add('④ the moves do not start with the opening\'s 3 moves');
  let pos; try { pos = E.replay('renju', mv); } catch (e) { add('④ the moves do not replay: ' + e.message); return out; }
  const pb = probOf(mv); if (pb.b.split(' ').sort().join() !== cells(P.b).map(E.sqName).sort().join() || pb.w.split(' ').sort().join() !== cells(P.w).map(E.sqName).sort().join() || pb.side !== P.side || pb.last !== P.last) add('④ the stones / side / last move are not the moves\' position');
  if (mv.every((m, i) => m === line[i]) && mv.length <= line.length) add('④⑤ the position is on the study line (追1)');
  if (pos.status().over) add('④ the game is over');
  if (pos.fives(1).length || pos.fives(2).length) add('④ a five point on the board (a four to make or to stop: too plain)');
  // ⑤
  const S = stonesOf(P);
  for (const Q of pool()) { const d = distS(S, Q.S); if (d < 4) add(`⑤ ${d} stones from ${Q.who}`); }
  if (!opt.skipOwn) J('gomoku/openings.json').sets.forEach(h => { if (!h.verified) return; h.problems.forEach((Q, j) => { if (h.id === g.id && Q.mv === P.mv) return; if (h.id === g.id && Q === P) return; const d = distS(S, stonesOf(Q)); if (d < 4) add(`⑤ ${d} stones from ${h.id} q${j + 1}`); }); });
  if (!P.sc) return out;
  // ①②③
  const sc = P.sc.slice().sort((a, b) => b[1] - a[1]), sc2 = (P.sc2 || []).slice().sort((a, b) => b[1] - a[1]);
  if (sc[0][0] !== P.sc[0][0]) add('① sc is not stored best first');
  if (!sc2.length || sc2[0][0] !== sc[0][0]) add(`① the two reads disagree (${sc[0][0]} / ${sc2.length ? sc2[0][0] : '-'})`);
  if (Math.abs(sc[0][1]) >= W) add('④ decided (|value| ≥ WINT)');
  if (!pos.isLegal(E.sqOf(sc[0][0]))) add('① the answer is not legal');
  for (const [u] of sc.slice(1)) { const p = Math.max(pts(sc, u, W), pts3(sc, u), sc2.length ? pts(sc2, u, W) : 0); if (p > 12) add(`② ${u} scores ${p} (more than 12)`); }
  if (sc.length < 4) add(`③ only ${sc.length - 1} other candidates`);
  if (!opt.noNet && P.nb !== sc[0][0]) add(`① the net's best ${P.nb} is not the answer ${sc[0][0]}`);
  return out;
}
// ゴイシペンの文（lessons3d.js の GMA〜GML を vm で）
let W3 = null;
function words() {
  if (W3) return W3;
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  const GMA = (() => {'), b = src.indexOf("  // (2026-11-23 lesson loop) ゴイシペン's voice for one lesson");
  const f = src.slice(src.indexOf('  const fill = '), src.indexOf('\n', src.indexOf('  const fill = ')));
  return (W3 = vm.runInNewContext(f + '\n' + src.slice(a, b) + '\n;({ GOP, GOMOKU_OP_JA, GML })', {}));
}
// --deep (追26): read every problem again — the JavaScript search at depth 8 and 6 (sc, sc2) and the core with the net at depth 6 (nb)
let NET = null;
function deepRead(P) {
  const E = Eng(); if (!NET) { const k = require.resolve(path.join(ROOT, 'gomoku/engine.js')), saved = require.cache[k]; delete require.cache[k]; NET = require(path.join(ROOT, 'gomoku/tools/op-engine.js')); require.cache[k] = saved; }
  const mv = String(P.mv).split(/\s+/).map(E.sqOf), rd = d => new E.Engine().rootList(E.replay('renju', mv), 1e9, null, 24, d).list.map(e => [E.sqName(e.m), e.v]).sort((a, b) => b[1] - a[1]);
  const nl = NET.read(mv, 6, 40).list.sort((a, b) => b.v - a.v);
  return { sc: rd(8), sc2: rd(6), nb: nl.length ? E.sqName(nl[0].m) : null };
}
// the set: every problem's checks, the set-wide ⑤⑥, the words ⑦⑧ on every legal move, the 2D / 3D points ⑨
function verifySet(g, opt) {
  opt = opt || {}; const E = Eng(), W = E.WINT, X = words(), out = [], add = (q, m) => out.push({ step: g.id, q, msg: m });
  const O = J('gomoku/openings.json'), si = O.sets.findIndex(x => x.id === g.id);
  if (!g.problems || g.problems.length !== 5) add(0, `the pool has ${g.problems ? g.problems.length : 0} problems (5 wanted)`);
  let prevD = -1; const ans = new Map(), kinds = new Map();
  g.problems.forEach((P, j) => { const q = j + 1;
    if (opt.deep) { const R = deepRead(P); ['sc', 'sc2', 'nb'].forEach(k => { if (JSON.stringify(R[k]) !== JSON.stringify(P[k])) add(q, `① the stored ${k} is not the engine's read again (追26)`); }); }
    check(g, P).forEach(m => add(q, m));
    const d = diff(P); if (d < prevD) add(q, `⑥ easier than the problem before (diff ${d} after ${prevD})`); prevD = Math.max(prevD, d);
    const a = P.side + P.sc[0][0]; if (ans.has(a)) add(q, `⑤ the same answer as q${ans.get(a)}`); ans.set(a, q);
    const k = kindOf(P); kinds.set(k, (kinds.get(k) || 0) + 1); if (kinds.get(k) > 2) add(q, `⑤ a third answer of the kind ${k}`);
    for (let j2 = 0; j2 < j; j2++) { const d2 = distS(stonesOf(P), stonesOf(g.problems[j2])); if (d2 < 4) add(q, `⑤ ${d2} stones from q${j2 + 1}`); }
    // ⑦⑧ the words
    const GSQ = x => E.sqOf(x), sc = P.sc.map(([u, v]) => [GSQ(u), v]), b = sc.slice().sort((x, y) => y[1] - x[1])[0];
    const o = { pos: { start: { b: cells(P.b), w: cells(P.w), side: P.side } }, P: { sc } }, PJ = X.GOP.mk(si), keys = [];
    const PJw = Object.assign({}, PJ, { pk: (arr, key, ok, ok2) => { keys.push(key); keys.arr = arr; keys.ok = ok && ok2 ? x => ok(x) || ok2(x) : ok; return PJ.pk(arr, key, ok, ok2); } });
    const T = X.GOMOKU_OP_JA.prob(g, o, sc, b, j, PJw);
    const pos = E.setup('renju', { b: cells(P.b), w: cells(P.w), side: P.side }), s = P.side, oo = 3 - s;
    const plain = t => String(t).replace(/<[^>]+>/g, '');
    if (/\{\w+\}/.test(T.ask + T.hintTx)) add(q, '⑧ a placeholder left in the question / hint');
    const kb = kindOf(P); if (/四が作れる|四を作って/.test(T.hintTx) && !/^(four|ft)$/.test(kb)) add(q, '⑧ the hint says a four can be made, the answer makes none');
    const gt = plain(T.good(b[0])); if (/同じくらい良い/.test(gt)) add(q, '⑧ the praise of the answer says 「同じくらい良い」');
    const winAfter = u => { pos.make(u); let w = false; if (pos.fives(oo).length && !pos.fives(s).length) w = true; else { const R = new E.Engine().rootList(pos, 1e9, null, 24, 6).list; w = R.some(e => e.v > W); } pos.unmake(); return w; };
    const MK = [];
    for (const u of pos.legal()) { if (u === b[0]) continue;
      keys.length = 0; const t = plain(T.ng(u)), p2 = pts(P.sc, E.sqName(u), W), p3 = pts3(sc, u);
      if (p2 !== p3) add(q, `⑨ ${E.sqName(u)}: 2D ${p2} points, 3D ${p3}`);
      if (/\{\w+\}|undefined|NaN/.test(t)) add(q, `⑧ ${E.sqName(u)}: a placeholder: ${t.slice(0, 60)}`);
      if (/^(あと少し|あと一歩|いい線)/.test(t) && p2 < 10) add(q, `⑦ ${E.sqName(u)} (${p2} points) opens with 「${t.slice(0, 6)}」 (追39)`);
      const mk = keys.filter(k => /^m/.test(k)).pop() || ''; { const ar = /^m/.test(keys[keys.length - 1] || '') ? keys.arr : [], ok2 = ar.filter(x => !keys.ok || keys.ok(x)); MK.push([u, mk, ok2.length ? ok2 : ar]); }
      if (mk === 'mlose5') { pos.make(u); const ok = pos.fives(oo).length && !pos.fives(s).length; pos.unmake(); if (!ok) add(q, `⑦ ${E.sqName(u)}: 「5つ並べられて負け」 but the opponent has no five point`); }
      if (mk === 'mloseW' && !winAfter(u)) add(q, `⑦ ${E.sqName(u)}: 「もう止められない」 but the engine finds no win for the opponent`);
      if (mk === 'mleft3') { pos.make(u); const C = E.C; let f4 = false; for (let m = 0; m < 225; m++) { const i = E.M2I[m]; if (pos.b[i] === 0 && pos.cls[oo][i] === C.F4 && (oo !== 1 || pos.isLegal(m))) f4 = true; } pos.unmake(); if (!f4) add(q, `⑦ ${E.sqName(u)}: 「三が残る（達四を作られる）」 but the opponent has no open-four point`); }
      if (mk === 'mclose' && (p2 < 10 || winAfter(u))) add(q, `⑦ ${E.sqName(u)} (${p2} points): 「悪くない・すぐには負けない」 (追53)`);
    }
    // 追90: every wording the voice can pick for a move (the rotation picks one of the reason's sentences by the order the moves are
    // asked), not only the one the stored order picks — every sentence of the reason each wrong move gets, and every hint sentence of the
    // answer's kind, checked against the board: the green point's role (「2つの役目」「じゃまと自分の形」「次の三」), the player's stone
    // (「つながらない」「離れたまま」 = no own stone next to it), the opponent's line named in 「{f}の<向き>の…」 (one the green point blocks and
    // the player's move leaves open), the hint's 「四」
    { const G = X.GML.mk({ b: cells(P.b), w: cells(P.w), side: s }, 'renju'), FB = X.GOP.fx(G, b[0], s), KB = X.GOP.kind(FB), D = i => X.GOP.DN[i];
      const hkey = X.GOP.hint[KB] ? KB : KB === 'two2' || KB === 'own' ? 'two' : KB === 'foe' ? 'blk' : 'shape';
      X.GOP.hint[hkey].forEach(h => { if (/四が作れる|四を作って|四が作れそう/.test(h) && !/^(four|ft|f4)$/.test(KB)) add(q, `⑧ 追90 the hint 「${h.slice(0, 20)}」 says a four, the answer (${KB}) makes none`); });
      const V0 = Object.assign(X.GOP.vars(FB, s), { s: X.GOP.side(s), r: '' }), fillT = (t, v) => t.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);
      for (const [u, mk, arr] of MK) { const FU = X.GOP.fx(G, u, s);   // arr: the sentences the voice can pick for this move (its filter, if any)
        arr.forEach(t0 => { const t = fillT(t0, V0), tag = `⑦ 追90 ${E.sqName(u)} (${mk}): 「${t.slice(0, 36)}」`;
          if (/2つの役目/.test(t) && !/^(b3t|twob|two2|ft)$/.test(KB)) add(q, `${tag} — the green point (${KB}) has no two roles`);
          if (/相手のじゃまと自分の形/.test(t) && !/^(b3t|twob)$/.test(KB)) add(q, `${tag} — the green point (${KB}) does not block and build at once`);
          if (/次の三が作りにくい/.test(t) && !/^(two|two2|twob|own|three|b3t)$/.test(KB)) add(q, `${tag} — the green point (${KB}) builds no next three`);
          if (/自分の石とつながらない|石どうしが離れたまま/.test(t) && FU.adjS.length) add(q, `${tag} — the stone touches its own (${FU.adjS.map(D).join('・')})`);
          if (/となりに置いても/.test(t) && !FU.adjS.length) add(q, `${tag} — the stone touches none of its own`);
          const m = t.match(/(?:黒|白)の(ヨコ|タテ|ナナメ)の(?:並び|線|石)|(ヨコ|タテ|ナナメ)の線を空けた/);
          if (m && mk === 'mfree') { const dn = m[1] || m[2];
            if (!FB.blk.some(i => D(i) === dn) || FU.blk.some(i => D(i) === dn)) add(q, `${tag} — the ${dn} line is not one the green point blocks and the move leaves open`); } }); } }
  });
  return out;
}
function verify(opt) { const O = J('gomoku/openings.json'), out = []; O.sets.filter(g => g.verified).forEach(g => out.push(...verifySet(g, opt))); return out; }
verify.DONE = () => J('gomoku/openings.json').sets.filter(g => g.verified).map(g => g.id);
module.exports = verify; Object.assign(module.exports, { verifySet, words, pts, pts3, distS, stonesOf, pool, kindOf, diff, probOf, check, cells, sOfV });
