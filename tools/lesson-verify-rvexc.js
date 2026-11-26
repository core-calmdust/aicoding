'use strict';
// (2026-11-27 第2期・担当A) リバーシ「隅は絶対ではない」（reversi/lessons.json exception）の問題の検証。
// node tools/lesson-verify-rvexc.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手6つ以上
//  ④ 主題：相手は今どの隅にも打てない。答えは相手に新しく隅を渡さない。
//     ふつう（隅を後回し）＝自分は隅に打てる・答えは隅でも X・C でもない・答えのあとも相手はその隅を取れない・隅に打つ手はどれも
//       相手の打てる場所が答えより多い（「隅を取っても相手に N か所残る」が盤の事実）。
//     例外（trap＝X打ち）＝自分は隅に打てない・答えは空いた隅のななめ隣（X）・答えのあとも相手はその隅に打てない。
//     不正解の手はどれも、隅を渡す（ふつうでは X/C も）か、相手の打てる場所が答えより多い（盤で理由が言える）。保存した f の数は盤の事実
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、exception どうしと8対称で4マス以上違う
//  ⑥ P.d＝ふつう 1＋（合法手10以上）＋（隅が2つ以上か2番目の手が隅）／例外 1＋（合法手10以上）＋（Xの手が2つ以上）を保存、2D・3D とも P.d 順・例外は最後、
//     ふつうのプールに d 1・2・3、例外は3問以上
//  ⑦⑧ リバガメの問い・ヒント（ふつう RV_AES・RV_HES／例外 RV_AET・RV_HET）・ほめ言葉・全不正解手の文（5つの出題位置）：相手の打てる場所の数・隅・X が盤のとおり、評価値の言葉なし
//     2D：不正解で隅を渡さない手（ふつうは X/C でもない手）は、相手の打てる場所をくらべる（r.mob）、隅の手は r.cornerTrap＋r.mob
//  追14 準備（c1・g・p1・c2・g2・p2）：答えがエンジン（深さ12）で最善（3石以上の差）、文が名指すマス・色・隅（取れない／渡す）が盤のとおり（3D・2D 日本語・warm3d.json）
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const E0 = require('./lesson-verify-rvedge.js'), boardF = E0.boardF;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], CN = [0, 7, 56, 63];
const XS = { 9: 0, 14: 7, 49: 56, 54: 63 }, CS = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
const flips = (c, sq, me) => { if (c[sq]) return []; const o = 3 - me, out = []; for (const [dr, dc] of DIRS) { let r = (sq >> 3) + dr, k = (sq & 7) + dc; const t = []; while (r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === o) { t.push(r * 8 + k); r += dr; k += dc; } if (t.length && r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === me) out.push(...t); } return out; };
const legal = (c, me) => { const o = []; for (let q = 0; q < 64; q++) if (flips(c, q, me).length) o.push(q); return o; };
const play = (c, m, me) => { const n = c.slice(); n[m] = me; flips(c, m, me).forEach(q => { n[q] = me; }); return n; };
const xcOf = (c, m) => XS[m] != null && !c[XS[m]] ? 'X' : CS[m] != null && !c[CS[m]] ? 'C' : '';
const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
const dist = (a, b) => { let best = 99; for (const m of SY) { let n = 0; for (let q = 0; q < 64 && n < best; q++) if (a[q] !== b[m[q]]) n++; best = Math.min(best, n); } return best; };
const nm = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
let E = null;
function eng() { if (E) return E; const zlib = require('zlib'); E = require(path.join(ROOT, 'reversi/engine.js')); const raw = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'reversi/weights.bin.gz'))); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30); return E; }
function read(c, me, depth) { const e = eng(), out = {}; for (const m of legal(c, me)) { e.clearTT(); out[m] = Math.round(e.searchMove(c, me, m, depth, -1e9, 1e9, 'mid') / e.SCALE * 10) / 10; } return out; }
const GIVE = /隅を取れるようになっ|隅への道が開いちゃう|隅に打てるようになる|隅をプレゼント|隅を取られちゃう/, EVAL = /石ほど|差は小さい|ほんの少し|わずか|AI|評価|形勢|かも[？?]/;
// the board's facts of an exception problem
function excFacts(c, me, P, r14) {
  const lg = legal(c, me), B = boardF(c, me), corners = lg.filter(q => CN.includes(q)), xs = lg.filter(q => xcOf(c, q) === 'X');
  const s = lg.slice().sort((x, y) => r14[y] - r14[x]);
  const d = P.trap ? 1 + (lg.length >= 10 ? 1 : 0) + (xs.length >= 2 ? 1 : 0) : 1 + (lg.length >= 10 ? 1 : 0) + (corners.length >= 2 || CN.includes(s[1]) ? 1 : 0);
  return { lg, B, corners, xs, d };
}
function excChk(opt) {
  opt = opt || {};
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = opt.src || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const out = [], id = 'exception', add = (j, m) => out.push({ step: id, q: j + 1, msg: m });
  const l = L.lessons.find(x => x.id === id), li = L.lessons.indexOf(l); if (!l) { add(-1, 'no exception lesson'); return out; }
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, RVJ_LS, RV_AES, RV_AET, RV_HES, RV_HET })', {});
  // ②⑥⑦⑨ the code both versions run
  if (!/if \(pr && pr\.type === 'eval' && pr\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(n - 1 - r\) \/ \(n - 1\)\)\);/.test(app)) add(-1, '②⑨ reversi/index.html problemPoints gives a verified eval problem\'s 2nd move 16+ points');
  if (!/if \(P\.type === 'eval' && P\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(all\.length - 1 - all\.filter\(v => v > mine \+ 1e-9\)\.length\) \/ \(all\.length - 1\)\)\);/.test(src)) add(-1, '②⑨ the 3D REVERSI.points gives a verified eval problem\'s 2nd move 16+ points');
  const SORT = /probs\.every\(p => p\.type === 'eval' && p\.d != null\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| a\.d - b\.d\)/;
  if (!SORT.test(app)) add(-1, '⑥⑨ reversi/index.html startLesson does not sort by P.d');
  if (!SORT.test(src)) add(-1, '⑥ the 3D REVERSI.lesson does not sort by P.d');
  if (!/if \(pr\.d != null && !ok && !me\[4\] && !\[0, 7, 56, 63\]\.includes\(sq\) && \(pr\.trap \|\| !xc\)\) out\.push\(t\('r\.mob'\) \+ cmp\(3, 'u\.place'\)\);/.test(app)) add(-1, '⑦⑨ 2D lessonReason: exception does not compare the opponent\'s moves after a wrong move');
  if (!/else if \(!ok && xc && !\(kind === 'exception' && pr\.trap && pr\.d != null\)\)/.test(app)) add(-1, '⑦⑨ 2D lessonReason: the X exception still calls a wrong X/C dangerous by itself');
  // ⑤ the pool to compare with
  const others = []; L.lessons.forEach(x => { if (x.id !== id) x.problems.forEach((p, j) => others.push([`${x.id} q${j + 1}`, String(p.cells)])); (x.warm || []).forEach((w, j) => others.push([`${x.id} warm ${w.k || j + 1}`, String(w.cells)])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => others.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8'));
  for (const st of OP.sets) for (const ln of st.lines) { let b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; let s = 1;
    for (const m of ln.moves.match(/../g) || []) { const q = (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8; let f = flips(b, q, s); if (!f.length) { s = 3 - s; f = flips(b, q, s); } if (!f.length) break; b = play(b, q, s); s = 3 - s; others.push([`opening ${ln.moves.slice(0, 20)}…`, b.join('')]); } }
  try { const opp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')); for (const k in opp) (opp[k] || []).forEach((p, j) => others.push([`opening practice ${k} ${j + 1}`, String(p.pos).split(':')[0]])); } catch (e) { /* none */ }
  (l.warm || []).forEach(w => others.push([`exception warm ${w.k}`, String(w.cells)]));
  const P0 = l.problems, ds = [];
  if (P0.filter(p => !p.trap).length < 12) add(-1, `⑤ only ${P0.filter(p => !p.trap).length} standard problems`);
  if (P0.filter(p => p.trap).length < 3) add(-1, `⑤ only ${P0.filter(p => p.trap).length} exception (X) problems`);
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
    const W = excFacts(c, me, P, r14), B = W.B, mob = q => B[q][2];
    lg.forEach(m => { const s = F[m].slice(1, 7).join(), t = B[m].join(); if (s !== t) a(`④ move ${m}: stored [${s}], the board [${t}]`); });
    if (legal(c, 3 - me).some(q => CN.includes(q))) a('④ the opponent can already take a corner');
    if (B[best][3]) a(`④ the answer ${nm(best)} gives the opponent a corner`);
    if (!P.trap) {
      if (!W.corners.length) a('④ a standard problem with no corner to postpone');
      if (CN.includes(best) || xcOf(c, best)) a(`④ the answer ${nm(best)} is a corner or an ${xcOf(c, best) || 'corner'} square`);
      W.corners.forEach(q => { if (!(mob(q) > mob(best))) a(`⑦ the corner ${nm(q)} leaves the opponent ${mob(q)} moves, the answer ${mob(best)}: 「隅を取っても相手に N か所残る」 is no reason`); });
    } else {
      if (W.corners.length) a('④ the X exception has a corner to take');
      if (xcOf(c, best) !== 'X') a(`④ the answer ${nm(best)} is not an X square`);
      else if (legal(play(c, best, me), 3 - me).includes(XS[best])) a(`⑧ after the X ${nm(best)} the opponent can take its corner`);
    }
    lg.forEach(u => { if (u === best || CN.includes(u) || B[u][3] || (!P.trap && xcOf(c, u))) return; if (!(mob(u) > mob(best))) a(`⑦ move ${nm(u)}: gives no corner${P.trap ? '' : ', no X/C'}, and the opponent's moves ${mob(u)} ≤ ${mob(best)}: no board reason`); });
    // ⑥
    if (P.d !== W.d) a(`⑥ stored d ${P.d}, the board ${W.d}`); if (!P.trap) ds.push(W.d);
    // ⑤
    for (const [n, c2] of others) { const dd = dist(String(P.cells), c2); if (dd <= 3) a(`⑤ ${dd} square(s) from ${n}`); }
    P0.forEach((Q, k) => { if (k > j) { const dd = dist(String(P.cells), String(Q.cells)); if (dd <= 3) a(`⑤ ${dd} square(s) from exception q${k + 1}`); } });
    // ⑦⑧ リバガメ's words at each place of a draw
    const marks = lg.some(q => B[q][3]), mc = W.corners.length ? Math.min(...W.corners.map(mob)) : null;
    for (let i = 0; i < 5; i++) { const T = X.rvLsJa(id, P, i, li, marks);
      for (const t of [T.ask, T.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ #${i + 1}: the question / hint 「${t}」`);
      if (EVAL.test(T.hintTx) || EVAL.test(T.ask)) a(`⑧ #${i + 1}: the question / hint guesses`);
      if (!(P.trap ? X.RV_AET : X.RV_AES).includes(T.ask)) a(`⑧ #${i + 1}: the question 「${T.ask}」 is not the ${P.trap ? 'X' : 'corner'} set`);
      if (!T.hintTx.startsWith((P.trap ? X.RV_HET : X.RV_HES)[i % 5])) a(`⑧ #${i + 1}: the hint 「${T.hintTx}」 is not the ${P.trap ? 'X' : 'corner'} set`);
      if (marks !== /赤い枠/.test(T.hintTx)) a(`⑧ #${i + 1}: the hint 「${T.hintTx}」 and the red frames (moves that give a corner: ${marks})`);
      const g = String(T.good(best));
      if (EVAL.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 leans on the engine's value`);
      if (P.trap && !/X/.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say the X`);
      if (!P.trap && !(g.includes(`${mob(best)}か所`) && g.includes(`${mc}か所`))) a(`⑧ #${i + 1}: the praise 「${g}」 does not compare ${mc} (a corner) with ${mob(best)} moves`);
      for (const m of g.matchAll(/(\d+)か所/g)) if (![mob(best), mc].includes(+m[1])) a(`⑧ #${i + 1}: the praise says ${m[0]}`);
      for (const q of lg) { if (q === best) continue; const t = String(T.ng(q)), xc = xcOf(c, q);
        if (!t || /\{|undefined|NaN/.test(t)) { a(`⑧ move ${q} (#${i + 1}): 「${t}」`); continue; }
        if (EVAL.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 — the engine's value, not the board`);
        if (B[q][3] && !GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): opens a corner, 「${t}」 does not say so`);
        if (!B[q][3] && GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says it opens a corner, it does not`);
        if (P.trap && !/X/.test(t)) a(`⑧ move ${q} (#${i + 1}): 「${t}」 does not point at the X`);
        if (CN.includes(q) && !/隅/.test(t)) a(`⑦ move ${q} (#${i + 1}): a corner, 「${t}」 does not say so`);
        if (!B[q][3] && !P.trap && !CN.includes(q) && xc && !t.includes(xc)) a(`⑦ move ${q} (#${i + 1}): an ${xc} square, 「${t}」 does not say so`);
        if (!B[q][3] && (CN.includes(q) || P.trap || !xc) && (!t.includes(`${mob(q)}か所`) || !t.includes(`${mob(best)}か所`))) a(`⑦ move ${q} (#${i + 1}): 「${t}」 does not compare ${mob(q)} with ${mob(best)} moves`);
        for (const m of t.matchAll(/(\d+)か所/g)) if (![mob(q), mob(best)].includes(+m[1])) a(`⑧ move ${q} (#${i + 1}): says ${m[0]}`); } } });
  const hs = new Set(ds); if (![1, 2, 3].every(x => hs.has(x))) add(-1, `⑥ the difficulties ${[...hs]} cannot make a rising draw`);
  // 追14 the warm-up: the engine's best, and the squares, colours and corners the texts name
  const RJ = X.RVJ_LS.ramp.exception || {}, WJ = (l.text && l.text.ja && l.text.ja.warm) || {}, W3 = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/warm3d.json'), 'utf8')); } catch (e) { return {}; } })();
  const sq = x => (x.charCodeAt(0) - 97) + (+x[1] - 1) * 8, CNAME = { 0: '左上', 7: '右上', 56: '左下', 63: '右下' };
  (l.warm || []).forEach(w => { const a = m => add(-1, `追14 warm ${w.k}: ${m}`), c = String(w.cells).split('').map(Number), me = w.toMove, lg = legal(c, me), ol = legal(c, 3 - me), B = boardF(c, me);
    const opc = me === 1 ? '白' : '黒', myc = me === 1 ? '黒' : '白';
    const texts = k => [['3D', RJ[k]], ['2D', WJ[k]], ['3D(json)', W3['exception/' + k] && W3['exception/' + k].ja]].filter(x => x[1]);
    if (lg.length < 3) a(`only ${lg.length} legal moves`);
    const ans = w.t === 'concept' ? +Object.keys(w.marks || {}).find(k => w.marks[k] === 'focus') : w.ans, after = legal(play(c, ans, me), 3 - me);
    const gives = q => legal(play(c, q, me), 3 - me).filter(z => CN.includes(z) && !ol.includes(z));
    const tx = w.t === 'concept' ? texts(w.k) : texts(w.k + 'ok').concat(w.t === 'guided' ? texts(w.k) : []);
    if (!lg.includes(ans)) { a(`the answer ${ans} is not a legal move`); return; }
    for (const [k0, t] of tx) { const s = String(t);
      for (const m of s.matchAll(/(白|黒)(?:には|は)(?:この後 |このあと)?(?:[a-h][1-8] ?(?:の隅)?|(?:左上|右上|左下|右下)の隅|隅)(?:は|を)?(?:、)?(?:すぐには)?取れ/g)) if (m[1] !== opc) a(`${k0}「${s.slice(0, 50)}…」: says ${m[1]} cannot take a corner, the opponent is ${opc}`);
      if (/(?:^|[^上下右左の\w])隅は(?:白|黒)には取れない/.test(s) && (ol.concat(after)).some(q => CN.includes(q))) a(`${k0}「${s.slice(0, 50)}…」: 「隅は取れない」 without naming it, the opponent can take ${[...new Set(ol.concat(after).filter(q => CN.includes(q)))].map(nm)}`);
      for (const m of s.matchAll(/([a-h][1-8]) の隅は、?(白|黒)には取れ/g)) { const q = sq(m[1]); if (m[2] !== opc || ol.includes(q) || after.includes(q)) a(`${k0}: ${m[1]} — ${m[2]} can take it, or ${m[2]} is not the opponent`); }
      for (const m of s.matchAll(/(左上|右上|左下|右下)の隅/g)) { const q = +Object.keys(CNAME).find(k => CNAME[k] === m[1]); if (c[q] || after.includes(q)) a(`${k0}: the ${m[1]} corner (${nm(q)}) is taken or the opponent can take it after the answer`); }
      for (const m of s.matchAll(/([a-h][1-8]) を取れません/g)) { const q = sq(m[1]); if (after.includes(q) || c[q]) a(`${k0}: after ${nm(ans)} the opponent can take ${m[1]}`); }
      for (const m of s.matchAll(/([a-h][1-8])（C）は ([a-h][1-8]) の隅を渡/g)) { if (!gives(sq(m[1])).includes(sq(m[2]))) a(`${k0}: ${m[1]} does not give ${m[2]}`); }
      for (const m of s.matchAll(/([a-h][1-8])（C）は白に ([a-h][1-8]) を取らせ/g)) { if (!gives(sq(m[1])).includes(sq(m[2]))) a(`${k0}: ${m[1]} does not give ${m[2]}`); }
      for (const m of s.matchAll(/([a-h][1-8]) や ([a-h][1-8]) に打つと、(白|黒)が ([a-h][1-8]) を取れる/g)) { [m[1], m[2]].forEach(x => { if (!gives(sq(x)).includes(sq(m[4]))) a(`${k0}: ${x} does not give ${m[4]}`); }); }
      if (/ほかの手だと、(白|黒)が隅を取れるようになって/.test(s) && lg.some(q => q !== ans && !gives(q).length)) a(`${k0}: 「ほかの手だと隅を取れるようになる」, but ${lg.filter(q => q !== ans && !gives(q).length).map(nm)} give none`);
      for (const m of s.matchAll(/(\d+)(?:から|→)(\d+)(?:か所)?に減らす/g)) { if (+m[1] !== ol.length || +m[2] !== legal(play(c, ans, me), 3 - me).length) a(`${k0}: 「${m[0]}」, the board ${ol.length}→${legal(play(c, ans, me), 3 - me).length}`); }
      for (const m of s.matchAll(/([a-h][1-8]) (?:が正解|の X 打ちは安全)/g)) { if (sq(m[1]) !== ans) a(`${k0}: names ${m[1]}, the answer is ${nm(ans)}`); } }
    const r = opt.reads ? null : read(c, me, 12); if (r) { const s = lg.slice().sort((x, y) => r[y] - r[x]); if (s[0] !== ans) a(`the engine's best is ${nm(s[0])} (${r[s[0]]}), not ${nm(ans)} (${r[ans]})`); else if (r[s[0]] - r[s[1]] < 3) a(`the 2nd move only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    if (gives(ans).length) a(`the answer ${nm(ans)} gives a corner`);
    if (xcOf(c, ans) === 'X' && after.includes(XS[ans])) a(`after the X ${nm(ans)} the opponent can take its corner`); });
  return out;
}
module.exports = excChk;
module.exports.excFacts = excFacts;
module.exports.read = read;
if (require.main === module) { const f = excChk(); f.forEach(x => console.log(`NG reversi ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK reversi exception'); process.exit(f.length ? 1 : 0); }
