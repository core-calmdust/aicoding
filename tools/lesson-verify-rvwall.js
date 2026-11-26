'use strict';
// (2026-11-26 第2期・担当A) リバーシ「壁と余裕手」（reversi/lessons.json wall）の問題の検証。
// node tools/lesson-verify-rvwall.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手6つ以上
//  ④ 主題：答えは打ったあとの外がわの石（空きマスに接する自分の石）がいちばん少ない手（ただ1つ）、いちばん多く返す手ではない、余裕手ではない。
//     壁の手 P.wall＝外がわの石が答えより3個以上多く、置いた石か返した石を通って外がわの石が3つ以上一列に並び、相手の打てる場所が答えより多い手（ルールで数え直して一致・1つ以上）。
//     例外（trap）＝余裕手（自分だけが打てる手）があって、そのどれかが答えと外がわの石が1個差以内か2番目の手。余裕手はすべて深さ14と10で答えより3石以上悪く、答えのあとも相手は打てない（貯金が残る）。
//     どちらも隅に打てない、答えは隅を渡さずX・Cでもない。不正解の手はどれも、壁・隅を渡す・X/C・（例外の）余裕手か、相手の打てる場所と外がわの石が答えより多い（盤で理由が言える）。保存した f の数は盤の事実
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、wall どうしと8対称で4マス以上違う
//  ⑥ P.d（ふつう＝外がわの石が次に少ない手と答えの差 3以上→1・2→2・1→3／例外＝1＋合法手10以上＋余裕手が2番目の手）を保存、2D・3D とも P.d 順・例外は最後、プールに d 1・2・3 と例外3問以上
//  ⑦⑧ リバガメの問い・ヒント（ふつう＝壁だけ、例外＝余裕手）・ほめ言葉（外がわの石の数・相手の打てる場所／余裕手）・全不正解手の文（5つの出題位置）：外がわの石・相手の打てる場所・壁・余裕手・隅・X/C が盤のとおり、評価値の言葉なし
//  追14 準備（c1・g・p1・p2・c2・g2）：答えがエンジンで最善（3石以上の差）、外がわの石・余裕手・隅の文が盤のとおり（3D・2D 日本語・warm3d.json）
// (2026-11-26 第2期・担当A) リバーシ「中割りと開放度」（reversi/lessons.json quiet）の問題の検証。
// node tools/lesson-verify-rvquiet.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手6つ以上
//  ④ 主題：ふつう＝答えは開放度（返す石のまわりの空きマス）がいちばん小さい手（ただ1つ）、いちばん多く返す手ではない。
//     例外（trap）＝開放度がいちばん小さい手はただ1つで答えではなく、深さ14と10の両方で答えより3石以上悪い。その手のあと相手の打てる場所は答えより多い。
//     答えより静かな（開放度が同じか小さい）ほかの手も、隅を渡す・X/C か、相手の打てる場所が答えより多い（盤で理由が言える）。
//     どちらも隅に打てない、答えは隅を渡さずX・Cでもない。保存した f の数（返る枚数・開放度・相手の手数・隅を渡す・空きの塊・パス）は盤の事実
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、quiet どうしと8対称で4マス以上違う
//  ⑥ P.d（1＋合法手10以上＋開放度が答えと1以内の手がある）を保存、2D・3D とも P.d 順・例外は最後、プールに d 1・2・3 と例外
//  ⑦⑧ リバガメの問い・ヒント・ほめ言葉・全不正解手の文（5つの出題位置）：開放度・相手の打てる場所（赤い枠・緑の枠）・隅・X/C が盤のとおり、評価値の言葉なし。
//     2D：例外の問題で答えより静かな手を選ぶと、相手の打てる場所をくらべる（r.mob）
//  追14 準備（c1・g・p1・p2）：答えがエンジンで最善（3石以上の差）・開放度がいちばん小さい、3D と 2D（日本語）の文の数が盤のとおり
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], CN = [0, 7, 56, 63];
const XS = { 9: 0, 14: 7, 49: 56, 54: 63 }, CS = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
const flips = (c, sq, me) => { if (c[sq]) return []; const o = 3 - me, out = []; for (const [dr, dc] of DIRS) { let r = (sq >> 3) + dr, k = (sq & 7) + dc; const t = []; while (r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === o) { t.push(r * 8 + k); r += dr; k += dc; } if (t.length && r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === me) out.push(...t); } return out; };
const legal = (c, me) => { const o = []; for (let q = 0; q < 64; q++) if (flips(c, q, me).length) o.push(q); return o; };
const play = (c, m, me) => { const n = c.slice(); n[m] = me; flips(c, m, me).forEach(q => { n[q] = me; }); return n; };
const nbr = q => { const r = q >> 3, k = q & 7, o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = r + a, cc = k + b; if ((a || b) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
const region = (c, m) => { const seen = new Set([m]), q = [m]; for (let i = 0; i < q.length; i++) for (const y of nbr(q[i])) if (!c[y] && !seen.has(y)) { seen.add(y); q.push(y); } return q.length; };
const xcOf = (c, m) => XS[m] != null && !c[XS[m]] ? 'X' : CS[m] != null && !c[CS[m]] ? 'C' : '';
const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
const dist = (a, b) => { let best = 99; for (const m of SY) { let n = 0; for (let q = 0; q < 64 && n < best; q++) if (a[q] !== b[m[q]]) n++; best = Math.min(best, n); } return best; };
const nm = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
let E = null;
function eng() { if (E) return E; E = require(path.join(ROOT, 'reversi/engine.js')); const raw = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'reversi/weights.bin.gz'))); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30); return E; }
function read(c, me, depth) { const e = eng(), out = {}; for (const m of legal(c, me)) { e.clearTT(); out[m] = Math.round(e.searchMove(c, me, m, depth, -1e9, 1e9, 'mid') / e.SCALE * 10) / 10; } return out; }
function boardF(c, me) { const F = {}; for (const m of legal(c, me)) { const fl = flips(c, m, me), n = play(c, m, me), seen = new Set(); fl.forEach(q => nbr(q).forEach(y => { if (!n[y]) seen.add(y); })); const ol = legal(n, 3 - me); F[m] = [fl.length, seen.size, ol.length, ol.some(q => CN.includes(q)) ? 1 : 0, region(c, m), ol.length ? 0 : 1]; } return F; }
const GIVE = /隅を取れるようになっ|隅への道が開いちゃう|隅に打てるようになる|隅をプレゼント|隅を取られちゃう/, EVAL = /石ほど|差は小さい|ほんの少し|わずか|AI|評価|形勢|かも[？?]/;


// front: my discs next to an empty square after the move. wallLine: a line of 3+ such discs through the placed or a flipped disc
const front = (n, me) => { let f = 0; for (let q = 0; q < 64; q++) if (n[q] === me && nbr(q).some(y => !n[y])) f++; return f; };
const LN = [[0, 1], [1, 0], [1, 1], [1, -1]];
function wallLine(n, me, m, fl) { const fr = q => n[q] === me && nbr(q).some(y => !n[y]);
  for (const q of [m, ...fl]) { if (!fr(q)) continue; for (const [dr, dc] of LN) { let k = 1; for (const s of [1, -1]) { let r = (q >> 3) + dr * s, cc = (q & 7) + dc * s; while (r >= 0 && r < 8 && cc >= 0 && cc < 8 && fr(r * 8 + cc)) { k++; r += dr * s; cc += dc * s; } } if (k >= 3) return true; } }
  return false; }
// the board's facts of a wall problem: the wall moves, the reserve moves, the exception (a reserve move that tempts), d
function wallFacts(c, me, r14) {
  const lg = legal(c, me), ol = legal(c, 3 - me), fa = {}, ln = {}; lg.forEach(m => { const n = play(c, m, me); fa[m] = front(n, me); ln[m] = wallLine(n, me, m, flips(c, m, me)); });
  const mn = Math.min(...lg.map(q => fa[q])), mins = lg.filter(q => fa[q] === mn), a = mins.length === 1 ? mins[0] : -1, B = boardF(c, me);
  const res = lg.filter(q => !ol.includes(q)), s = lg.slice().sort((x, y) => r14[y] - r14[x]);
  const wall = a < 0 ? [] : lg.filter(q => q !== a && fa[q] >= mn + 3 && B[q][2] > B[a][2] && ln[q]);
  const trap = a >= 0 && res.some(r => fa[r] <= mn + 1 || r === s[1]);
  const f2 = a < 0 ? 0 : Math.min(...lg.filter(q => q !== a).map(q => fa[q])) - mn;   // (how close the next-fewest outer discs come)
  const d = a < 0 ? 0 : trap ? 1 + (lg.length >= 10 ? 1 : 0) + (res.includes(s[1]) ? 1 : 0) : f2 >= 3 ? 1 : f2 === 2 ? 2 : 3;
  return { lg, ol, fa, mn, mins, a, B, res, wall, trap, d };
}
function wallChk(opt) {
  opt = opt || {};
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = opt.src || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const out = [], id = 'wall', add = (j, m) => out.push({ step: id, q: j + 1, msg: m });
  const l = L.lessons.find(x => x.id === id), li = L.lessons.indexOf(l); if (!l) { add(-1, 'no wall lesson'); return out; }
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, RVJ_LS, RV_AWS, RV_AWT, RV_HWS, RV_HWT })', {});
  // ②⑥⑨ the code both versions run (shared with corner, mobility, quiet)
  if (!/if \(pr && pr\.type === 'eval' && pr\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(n - 1 - r\) \/ \(n - 1\)\)\);/.test(app)) add(-1, '②⑨ reversi/index.html problemPoints gives a verified eval problem\'s 2nd move 16+ points');
  if (!/if \(P\.type === 'eval' && P\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(all\.length - 1 - all\.filter\(v => v > mine \+ 1e-9\)\.length\) \/ \(all\.length - 1\)\)\);/.test(src)) add(-1, '②⑨ the 3D REVERSI.points gives a verified eval problem\'s 2nd move 16+ points');
  const SORT = /probs\.every\(p => p\.type === 'eval' && p\.d != null\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| a\.d - b\.d\)/;
  if (!SORT.test(app)) add(-1, '⑥⑨ reversi/index.html startLesson does not sort by P.d');
  if (!SORT.test(src)) add(-1, '⑥ the 3D REVERSI.lesson does not sort by P.d');
  if (!/case 'wall':\n\s+if \(!pr\.trap && !ok && pr\.wall && pr\.wall\.includes\(sq\)\) out\.push\(t\('r\.wall'\)\);\n\s+out\.push\(t\('r\.mob'\) \+ cmp\(3, 'u\.place'\)\);/.test(app)) add(-1, '⑦⑨ 2D lessonReason: wall does not say the wall / compare the opponent\'s moves');
  // ⑤ the pool to compare with
  const others = []; L.lessons.forEach(x => { if (x.id !== id) x.problems.forEach((p, j) => others.push([`${x.id} q${j + 1}`, String(p.cells)])); (x.warm || []).forEach((w, j) => others.push([`${x.id} warm ${w.k || j + 1}`, String(w.cells)])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => others.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8'));
  for (const st of OP.sets) for (const ln of st.lines) { let b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; let s = 1;
    for (const m of ln.moves.match(/../g) || []) { const q = (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8; let f = flips(b, q, s); if (!f.length) { s = 3 - s; f = flips(b, q, s); } if (!f.length) break; b = play(b, q, s); s = 3 - s; others.push([`opening ${ln.moves.slice(0, 20)}…`, b.join('')]); } }
  try { const opp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')); for (const k in opp) (opp[k] || []).forEach((p, j) => others.push([`opening practice ${k} ${j + 1}`, String(p.pos).split(':')[0]])); } catch (e) { /* none */ }
  (l.warm || []).forEach(w => others.push([`wall warm ${w.k}`, String(w.cells)]));
  const P0 = l.problems, ds = []; let nTrap = 0;
  if (P0.filter(p => !p.trap).length < 16) add(-1, `⑤ only ${P0.filter(p => !p.trap).length} standard problems`);
  P0.forEach((P, j) => { const a = m => add(j, m), c = String(P.cells).split('').map(Number), me = P.toMove, F = P.f || {};
    if (P.type !== 'eval') { a('① not an eval problem'); return; }
    const lg = legal(c, me), ks = Object.keys(F).map(Number).sort((x, y) => x - y);
    if (lg.join() !== ks.join()) { a(`① the stored moves ${ks} are not the legal moves ${lg}`); return; }
    if (lg.length < 6) a(`③ only ${lg.length} legal moves`);
    const r14 = opt.reads ? opt.reads[j][0] : read(c, me, 14), r10 = opt.reads ? opt.reads[j][1] : read(c, me, 10);
    lg.forEach(m => { if (Math.abs(F[m][0] - r14[m]) > 0.05) a(`① move ${m}: stored ${F[m][0]}, the engine (depth 14) ${r14[m]}`); });
    const v = q => F[q][0], srt = lg.slice().sort((x, y) => v(y) - v(x)), best = srt[0];
    for (const [n, r] of [['depth 14', r14], ['depth 10', r10]]) { const s = lg.slice().sort((x, y) => r[y] - r[x]);
      if (s[0] !== best) a(`① ${n}: the best is ${s[0]}, not the answer ${best}`); else if (r[s[0]] - r[s[1]] < 3) a(`② ${n}: the 2nd move is only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    const pt = q => { const n = lg.length, mine = v(q); if (mine >= v(best) - 1e-9) return 20; const rk = lg.filter(z => v(z) > mine + 1e-9).length; return Math.round(12 * (n - 1 - rk) / (n - 1)); };
    lg.forEach(q => { if (q !== best && pt(q) >= 16) a(`② move ${q} would score ${pt(q)}`); });
    if (v(best) - v(srt[1]) <= (P.tol || 0)) a(`② the 2nd move is within tol ${P.tol} (2D: 「近い」)`);
    // ④ the theme, and the stored numbers
    const W = wallFacts(c, me, r14), B = W.B, mob = q => B[q][2], fa = q => W.fa[q];
    lg.forEach(m => { const s = F[m].slice(1, 7).join(), t = B[m].join(); if (s !== t) a(`④ move ${m}: stored [${s}], the board [${t}]`); });
    if (W.a < 0) a(`④ the fewest outer discs after the move (${W.mn}) at ${W.mins.length} moves`);
    else if (W.a !== best) a(`④ the fewest outer discs (${W.mn}) at ${W.a}, the answer is ${best}`);
    if (B[best][0] >= Math.max(...lg.map(q => B[q][0]))) a(`④ the answer flips the most (${B[best][0]}): the inner move is not the many-flip one`);
    if (W.res.includes(best)) a('④ the answer is a reserve move: the lesson keeps it');
    const sw = (P.wall || []).slice().sort((x, y) => x - y).join(); if (sw !== W.wall.slice().sort((x, y) => x - y).join()) a(`④ the stored wall moves [${sw}], the board [${W.wall}] (3+ more outer discs in a line, more opponent moves)`);
    if (!W.wall.length) a('④ no wall move: the red frames of the hint (rfWall) would mark nothing or the corner moves');
    if (!!P.trap !== W.trap) a(`④ stored trap ${!!P.trap}, the board ${W.trap} (a reserve move as quiet as the answer +1 or 2nd best)`);
    if (P.trap) { nTrap++; const n = play(c, best, me), om = legal(n, 3 - me);
      W.res.forEach(r => { for (const [nn, rr] of [['depth 14', r14], ['depth 10', r10]]) if (rr[best] - rr[r] < 3) a(`④ ${nn}: the reserve move ${r} is only ${(rr[best] - rr[r]).toFixed(1)} below the answer`);
        if (om.includes(r)) a(`⑦ the reserve move ${r} can be played by the opponent after the answer: not kept`); }); }
    lg.forEach(u => { if (u === best || W.wall.includes(u) || B[u][3] || xcOf(c, u) || (P.trap && W.res.includes(u))) return;
      if (!(mob(u) > mob(best) && fa(u) > fa(best))) a(`⑦ move ${u}: no wall, corner, X/C${P.trap ? ', reserve' : ''}, and the opponent's moves ${mob(u)} ≤ ${mob(best)} or outer discs ${fa(u)} ≤ ${fa(best)}: no board reason`); });
    if (lg.some(q => CN.includes(q))) a('④ a corner to take: the corner lesson\'s point, not this one');
    if (legal(c, 3 - me).some(q => CN.includes(q))) a('④ the opponent can already take a corner');
    if (B[best][3] || xcOf(c, best)) a(`④ the answer ${best} opens a corner or is an ${xcOf(c, best) || 'opening'} square`);
    // ⑥
    if (P.d !== W.d) a(`⑥ stored d ${P.d}, the board ${W.d}`); if (!P.trap) ds.push(W.d);
    // ⑤
    for (const [n, c2] of others) { const dd = dist(String(P.cells), c2); if (dd <= 3) a(`⑤ ${dd} square(s) from ${n}`); }
    P0.forEach((Q, k) => { if (k > j) { const dd = dist(String(P.cells), String(Q.cells)); if (dd <= 3) a(`⑤ ${dd} square(s) from wall q${k + 1}`); } });
    // ⑦⑧ リバガメ's words at each place of a draw
    const marks = W.wall.length > 0;
    for (let i = 0; i < 5; i++) { const T = X.rvLsJa(id, P, i, li, marks);
      for (const t of [T.ask, T.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ #${i + 1}: the question / hint 「${t}」`);
      const HL = P.trap ? X.RV_HWT : X.RV_HWS; if (!HL.some(h => T.hintTx.startsWith(h))) a(`⑧ #${i + 1}: the hint 「${T.hintTx}」 is not the ${P.trap ? 'reserve' : 'wall'} kind`);
      if (!(P.trap ? X.RV_AWT : X.RV_AWS).includes(T.ask)) a(`⑧ #${i + 1}: the question 「${T.ask}」 is not the ${P.trap ? 'reserve' : 'wall'} kind`);
      if (!P.trap && /余裕|貯金|きみだけが打て/.test(T.ask + T.hintTx)) a(`⑧ #${i + 1}: a standard problem's question / hint speaks of the reserve`);
      if (EVAL.test(T.hintTx) || EVAL.test(T.ask)) a(`⑧ #${i + 1}: the question / hint guesses`);
      const g = String(T.good(best));
      if (!g.includes(`${fa(best)}個`)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say ${fa(best)} outer discs`);
      if (P.trap ? !/余裕手|貯金|きみだけが打てる/.test(g) : !g.includes(`${mob(best)}か所`)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say ${P.trap ? 'the reserve move' : mob(best) + ' opponent moves'}`);
      if (EVAL.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 leans on the engine's value`);
      for (const q of lg) { if (q === best) continue; const t = String(T.ng(q)), xc = xcOf(c, q);
        if (!t || /\{|undefined|NaN/.test(t)) { a(`⑧ move ${q} (#${i + 1}): 「${t}」`); continue; }
        if (EVAL.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 — the engine's value, not the board`);
        if (W.wall.includes(q)) { if (!/壁/.test(t) || !t.includes(`${fa(q)}個`) || !t.includes(`${fa(best)}個`) || !t.includes(`${mob(q)}か所`)) a(`⑦ move ${q} (#${i + 1}): a wall move, 「${t}」 does not say the wall with ${fa(q)} / ${fa(best)} outer discs and ${mob(q)} moves`); continue; }
        if (/壁を作っちゃう|壁ができ/.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says a wall, the move is not one`);
        if (P.trap && W.res.includes(q)) { if (!/余裕手|貯金|相手が打てない|きみだけ/.test(t)) a(`⑦ move ${q} (#${i + 1}): a reserve move, 「${t}」 does not say so`); continue; }
        if (B[q][3] && !GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): opens a corner, 「${t}」 does not say so`);
        if (!B[q][3] && GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says it opens a corner, it does not`);
        if (!B[q][3] && xc && !t.includes(xc)) a(`⑦ move ${q} (#${i + 1}): an ${xc} square, 「${t}」 does not say so`);
        if (!B[q][3] && !xc && (!t.includes(`${mob(q)}か所`) || !t.includes(`${mob(best)}か所`) || !t.includes(`${fa(q)}個`))) a(`⑦ move ${q} (#${i + 1}): 「${t}」 does not compare ${mob(q)} with ${mob(best)} moves and ${fa(q)} outer discs`);
        for (const m of t.matchAll(/(\d+)個/g)) if (![fa(q), fa(best)].includes(+m[1])) a(`⑧ move ${q} (#${i + 1}): says ${m[0]} outer discs`);
        for (const m of t.matchAll(/(\d+)か所/g)) if (![mob(q), mob(best)].includes(+m[1])) a(`⑧ move ${q} (#${i + 1}): says ${m[0]}`); } } });
  const hs = new Set(ds); if (![1, 2, 3].every(x => hs.has(x))) add(-1, `⑥ the difficulties ${[...hs]} cannot make a rising draw`);
  if (nTrap < 3) add(-1, `④ only ${nTrap} exception problems (the trap note)`);
  // 追14 the warm-up: the numbers in the 3D and the 2D (ja) texts
  const RJ = X.RVJ_LS.ramp.wall || {}, WJ = (l.text && l.text.ja && l.text.ja.warm) || {}, W3 = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/warm3d.json'), 'utf8')); } catch (e) { return {}; } })();
  (l.warm || []).forEach(w => { const a = m => add(-1, `追14 warm ${w.k}: ${m}`), c = String(w.cells).split('').map(Number), me = w.toMove, lg = legal(c, me), ol = legal(c, 3 - me), B = boardF(c, me);
    const fa = {}; lg.forEach(m => { fa[m] = front(play(c, m, me), me); }); const mn = Math.min(...lg.map(q => fa[q]));
    if (lg.length < 3) a(`only ${lg.length} legal moves`);
    if (ol.some(q => CN.includes(q))) a('the opponent can already take a corner: "gives a corner" says nothing');
    const texts = k => [['3D', RJ[k]], ['2D', WJ[k]], ['3D(json)', W3['wall/' + k] && W3['wall/' + k].ja]].filter(x => x[1]);
    const nums = t => [...String(t).matchAll(/(\d+)個/g)].map(x => +x[1]);
    if (w.t === 'concept') { const mk = w.marks || {}, focus = +Object.keys(mk).find(k => mk[k] === 'focus'), danger = Object.keys(mk).filter(k => mk[k] === 'danger').map(Number);
      if (w.aid === 'wallc') { if (!lg.includes(focus) || fa[focus] !== mn || lg.filter(q => fa[q] === mn).length !== 1) a(`the gold frame ${nm(focus)} is not the one move with the fewest outer discs`);
        if (fa[focus] >= front(c, me)) a(`the gold frame ${nm(focus)} does not lower the outer discs (${front(c, me)} → ${fa[focus]})`);
        danger.forEach(q => { if (!(fa[q] > front(c, me))) a(`the red move ${nm(q)} does not add outer discs (${front(c, me)} → ${fa[q]})`); });
        for (const ar of w.arrows || []) { if (!danger.includes(ar[0])) a('the arrow does not start at the red move'); const dr = Math.sign((ar[1] >> 3) - (ar[0] >> 3)), dc = Math.sign((ar[1] & 7) - (ar[0] & 7)), fl = flips(c, ar[0], me); if (!fl.includes(ar[0] + dr * 8 + dc)) a(`the arrow ${nm(ar[0])}→${nm(ar[1])} is not a flipping direction`); } }
      if (w.aid === 'reserve') { const rs = lg.filter(q => !ol.includes(q)); if (!rs.length) a('no reserve move on the board');
        if (lg.includes(focus) && !ol.includes(focus)) a(`the gold frame ${nm(focus)} is a reserve move: the text says the opponent can play it`);
        if (!lg.includes(focus)) a(`the gold frame ${nm(focus)} is not a legal move`); }
      return; }
    if (!lg.includes(w.ans)) { a(`the answer ${w.ans} is not a legal move`); return; }
    const r = opt.reads ? null : read(c, me, 12); if (r) { const s = lg.slice().sort((x, y) => r[y] - r[x]); if (s[0] !== w.ans) a(`the engine's best is ${nm(s[0])}, not ${nm(w.ans)}`); else if (r[s[0]] - r[s[1]] < 3) a(`the 2nd move only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    if (B[w.ans][3] || xcOf(c, w.ans)) a(`the answer ${nm(w.ans)} opens a corner or is an X/C`);
    if (w.aid === 'front') { if (lg.filter(q => fa[q] === mn).join() !== String(w.ans)) a(`the fewest outer discs at ${lg.filter(q => fa[q] === mn).map(nm)}, not ${nm(w.ans)}`);
      for (const [k0, t] of texts(w.k + 'ok')) { const ns = nums(t); if (ns.length && ns[0] !== fa[w.ans]) a(`${k0}「${t.slice(0, 40)}…」 says ${ns[0]} outer discs, the answer ${fa[w.ans]}`);
        ns.slice(1).forEach(x => { if (!lg.some(q => q !== w.ans && fa[q] === x)) a(`${k0}「${t.slice(0, 40)}…」 says ${x}, no other move`); });
        if (/ほかの手（(\d+)個）/.test(t) && !lg.every(q => q === w.ans || fa[q] === +t.match(/ほかの手（(\d+)個）/)[1])) a(`${k0}「${t}」: the others are ${lg.filter(q => q !== w.ans).map(q => fa[q])}`);
        if (/割り?こむ|割り込む/.test(t)) { const rr = w.ans >> 3, cc = w.ans & 7, ed = rr === 0 || rr === 7 ? [w.ans - 1, w.ans + 1] : cc === 0 || cc === 7 ? [w.ans - 8, w.ans + 8] : null; if (!ed || !ed.every(x => c[x] === 3 - me)) a(`${k0}「${t}」: ${nm(w.ans)} is not between two opposing edge discs`); }
        for (const m of String(t).matchAll(/([a-h][1-8])(?:・([a-h][1-8]))? は外へ壁/g)) [m[1], m[2]].filter(Boolean).forEach(x => { const q = (x.charCodeAt(0) - 97) + (+x[1] - 1) * 8; if (!(fa[q] > fa[w.ans])) a(`${k0}「${t}」: ${x} does not add outer discs`); }); } }
    if (w.aid === 'reserve') { const rs = lg.filter(q => !ol.includes(q)); if (!rs.length) a('no reserve move');
      if (rs.includes(w.ans)) a(`the answer ${nm(w.ans)} is the reserve move`);
      const om = legal(play(c, w.ans, me), 3 - me); rs.forEach(q => { if (om.includes(q)) a(`the reserve move ${nm(q)} is not kept after the answer`); });
      for (const [k0, t] of texts('g2').concat(texts('g2ok'))) if (/隅を渡す/.test(t) && !lg.some(q => q !== w.ans && B[q][3])) a(`${k0}「${t.slice(0, 40)}…」 says a move gives a corner, none does`); } });
  return out;
}
module.exports = wallChk;
module.exports.wallFacts = wallFacts;
if (require.main === module) { const f = wallChk(); f.forEach(x => console.log(`NG reversi ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK reversi wall'); process.exit(f.length ? 1 : 0); }
