'use strict';
// (2026-11-25 第2期・担当A) リバーシ「隅と確定石、X・Cの危険」（reversi/lessons.json corner）の問題の検証。
// node tools/lesson-verify-rvcorner.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol 2 より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手3つ以上
//  ④ ふつうの問題：相手は隅に打てない・自分が打てる隅はただ1つ・答えはその隅。
//     例外（trap）：どちらも隅に打てない・答えは隅を渡さずX・Cでもない・ほかの手はすべて隅を渡すか空いた隅の隣（X・C）・隅を渡す手が2つ以上
//     保存した f の数（返る枚数・開放度・相手の手数・隅を渡す・空きの塊・パス）は盤の事実
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、corner どうしと8対称で4マス以上違う
//  ⑥ P.d（ふつう：1＋合法手10以上＋隅がいちばん多く返す手でない、例外：3＋合法手10以上）を保存、2D・3D とも P.d 順・例外は最後、
//     プールに易（d 1）・中（d 2）・難（d 3）と例外4問以上
//  ⑦⑧ リバガメの問い・ヒント・ほめ言葉・全不正解手の文（5つの出題位置）が盤と合う。2D：隅を渡さずX・Cでもない不正解手には r.cornerMiss
//  追14 準備（p1・p2・やってみよう）：答えがエンジンで最善（3石以上の差）、3D の文（X・C・赤い枠・外がわの石）が盤のとおり
const fs = require('fs'), path = require('path'), zlib = require('zlib'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], CN = [0, 7, 56, 63];
const XS = { 9: 0, 14: 7, 49: 56, 54: 63 }, CS = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
const flips = (c, sq, me) => { if (c[sq]) return []; const o = 3 - me, out = []; for (const [dr, dc] of DIRS) { let r = (sq >> 3) + dr, k = (sq & 7) + dc; const t = []; while (r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === o) { t.push(r * 8 + k); r += dr; k += dc; } if (t.length && r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === me) out.push(...t); } return out; };
const legal = (c, me) => { const o = []; for (let q = 0; q < 64; q++) if (flips(c, q, me).length) o.push(q); return o; };
const play = (c, m, me) => { const n = c.slice(); n[m] = me; flips(c, m, me).forEach(q => { n[q] = me; }); return n; };
const nbr = q => { const r = q >> 3, k = q & 7, o = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const rr = r + a, cc = k + b; if ((a || b) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
const front = (b, s) => { let n = 0; for (let q = 0; q < 64; q++) if (b[q] === s && nbr(q).some(y => !b[y])) n++; return n; };
const region = (c, m) => { const seen = new Set([m]), q = [m]; for (let i = 0; i < q.length; i++) for (const y of nbr(q[i])) if (!c[y] && !seen.has(y)) { seen.add(y); q.push(y); } return q.length; };
const xcOf = (c, m) => XS[m] != null && !c[XS[m]] ? 'X' : CS[m] != null && !c[CS[m]] ? 'C' : '';
const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
const dist = (a, b) => { let best = 99; for (const m of SY) { let n = 0; for (let q = 0; q < 64 && n < best; q++) if (a[q] !== b[m[q]]) n++; best = Math.min(best, n); } return best; };
let E = null;
function eng() { if (E) return E; E = require(path.join(ROOT, 'reversi/engine.js')); const raw = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'reversi/weights.bin.gz'))); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30); return E; }
function read(c, me, depth) { const e = eng(), out = {}; for (const m of legal(c, me)) { e.clearTT(); out[m] = Math.round(e.searchMove(c, me, m, depth, -1e9, 1e9, 'mid') / e.SCALE * 10) / 10; } return out; }
function boardF(c, me) { const F = {}; for (const m of legal(c, me)) { const fl = flips(c, m, me), n = play(c, m, me), seen = new Set(); fl.forEach(q => nbr(q).forEach(y => { if (!n[y]) seen.add(y); })); const ol = legal(n, 3 - me); F[m] = [fl.length, seen.size, ol.length, ol.some(q => CN.includes(q)) ? 1 : 0, region(c, m), ol.length ? 0 : 1]; } return F; }
const GIVE = /隅を取れるようになっ|隅への道が開いちゃう|隅に打てるようになる|隅をプレゼント|隅を取られちゃう/, MISS = /取れる隅があった|隅が空いてた|角に打てるチャンス|隅を取れば|隅に打てたのに/, EVAL = /石ほど|差は小さい|ほんの少し|わずか|AI|評価|形勢/;

function corner(opt) {
  opt = opt || {};
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = opt.src || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const i18 = opt.i18n || fs.readFileSync(path.join(ROOT, 'reversi/i18n.js'), 'utf8');
  const out = [], id = 'corner', add = (j, m) => out.push({ step: id, q: j + 1, msg: m });
  const l = L.lessons.find(x => x.id === id), li = L.lessons.indexOf(l); if (!l) { add(-1, 'no corner lesson'); return out; }
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, RVJ_LS, RV_HCS, RV_HCT })', {});
  // ②⑥⑨ the code both versions run
  if (!/if \(pr && pr\.type === 'eval' && pr\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(n - 1 - r\) \/ \(n - 1\)\)\);/.test(app)) add(-1, '②⑨ reversi/index.html problemPoints gives a verified eval problem\'s 2nd move 16+ points');
  if (!/if \(P\.type === 'eval' && P\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(all\.length - 1 - all\.filter\(v => v > mine \+ 1e-9\)\.length\) \/ \(all\.length - 1\)\)\);/.test(src)) add(-1, '②⑨ the 3D REVERSI.points gives a verified eval problem\'s 2nd move 16+ points');
  const SORT = /probs\.every\(p => p\.type === 'eval' && p\.d != null\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| a\.d - b\.d\)/;
  if (!SORT.test(app)) add(-1, '⑥⑨ reversi/index.html startLesson does not sort corner by P.d (the exception last)');
  if (!SORT.test(src)) add(-1, '⑥ the 3D REVERSI.lesson does not sort corner by P.d (the exception last)');
  if (!/else if \(!me\[4\] && !xc && \[0, 7, 56, 63\]\.includes\(bm\)\) out\.push\(t\('r\.cornerMiss', \{ b: nm\(bm\) \}\)\);/.test(app)) add(-1, '⑦⑨ 2D lessonReason: a wrong move that misses the corner says nothing of the board');
  { const n = (i18.match(/['"]r\.cornerMiss['"]: ['"][^'"]*\{b\}/g) || []).length; if (n < 14) add(-1, `⑨ r.cornerMiss with {b} in ${n} of 14 languages`); }
  // ⑤ the pool to compare with
  const others = []; L.lessons.forEach(x => { if (x.id !== id) x.problems.forEach((p, j) => others.push([`${x.id} q${j + 1}`, String(p.cells)])); (x.warm || []).forEach((w, j) => others.push([`${x.id} warm ${j + 1}`, String(w.cells)])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => others.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8'));
  for (const st of OP.sets) for (const ln of st.lines) { let b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; let s = 1;
    for (const m of ln.moves.match(/../g) || []) { const q = (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8; let f = flips(b, q, s); if (!f.length) { s = 3 - s; f = flips(b, q, s); } if (!f.length) break; b = play(b, q, s); s = 3 - s; others.push([`opening ${ln.moves.slice(0, 20)}…`, b.join('')]); } }
  try { const opp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')); for (const k in opp) (opp[k] || []).forEach((p, j) => others.push([`opening practice ${k} ${j + 1}`, String(p.pos).split(':')[0]])); } catch (e) { /* none */ }
  const P0 = l.problems, ds = []; let nTrap = 0;
  if (P0.length < 16) add(-1, `⑤ only ${P0.length} problems`);
  P0.forEach((P, j) => { const a = m => add(j, m), c = String(P.cells).split('').map(Number), me = P.toMove, F = P.f || {};
    if (P.type !== 'eval') { a('① not an eval problem'); return; }
    const lg = legal(c, me), ks = Object.keys(F).map(Number).sort((x, y) => x - y);
    if (lg.join() !== ks.join()) { a(`① the stored moves ${ks} are not the legal moves ${lg}`); return; }
    if (lg.length < 3) a(`③ only ${lg.length} legal moves`);
    // ① ② two deterministic reads
    const r14 = opt.reads ? opt.reads[j][0] : read(c, me, 14), r10 = opt.reads ? opt.reads[j][1] : read(c, me, 10);
    lg.forEach(m => { if (Math.abs(F[m][0] - r14[m]) > 0.05) a(`① move ${m}: stored ${F[m][0]}, the engine (depth 14) ${r14[m]}`); });
    const v = q => F[q][0], srt = lg.slice().sort((x, y) => v(y) - v(x)), best = srt[0];
    for (const [nm, r] of [['depth 14', r14], ['depth 10', r10]]) { const s = lg.slice().sort((x, y) => r[y] - r[x]);
      if (s[0] !== best) a(`① ${nm}: the best is ${s[0]}, not the answer ${best}`); else if (r[s[0]] - r[s[1]] < 3) a(`② ${nm}: the 2nd move is only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    const pt = q => { const n = lg.length, mine = v(q); if (mine >= v(best) - 1e-9) return 20; const rk = lg.filter(z => v(z) > mine + 1e-9).length; return Math.round(12 * (n - 1 - rk) / (n - 1)); };
    lg.forEach(q => { if (q !== best && pt(q) >= 16) a(`② move ${q} would score ${pt(q)}`); });
    if (v(best) - v(srt[1]) <= (P.tol || 0)) a(`② the 2nd move is within tol ${P.tol} (2D: 「近い」)`);
    // ④ the shape, and the stored numbers
    const B = boardF(c, me); lg.forEach(m => { const s = F[m].slice(1, 7).join(), t = B[m].join(); if (s !== t) a(`④ move ${m}: stored [${s}], the board [${t}]`); });
    const myC = lg.filter(q => CN.includes(q)), opC = legal(c, 3 - me).filter(q => CN.includes(q)), give = q => B[q][3] === 1;
    if (opC.length) a(`④ the opponent can already take a corner (${opC}): 「隅を渡す」 is not the move's doing`);
    if (P.trap) { nTrap++;
      if (myC.length) a(`④ the exception has a corner to take (${myC})`);
      if (give(best) || xcOf(c, best)) a(`④ the exception's answer ${best} opens a corner or is an ${xcOf(c, best) || 'opening'} square`);
      lg.forEach(q => { if (q !== best && !give(q) && !xcOf(c, q)) a(`④⑦ the exception's wrong move ${q} neither opens a corner nor sits by one: nothing on the board says why`); });
      if (lg.filter(give).length < 2) a(`④ only ${lg.filter(give).length} move(s) open a corner`);
    } else {
      if (myC.length !== 1) a(`④ ${myC.length} corners to take`); else if (best !== myC[0]) a(`④ the answer ${best} is not the corner ${myC[0]}`);
    }
    // ⑥ the difficulty
    const maxF = Math.max(...lg.map(q => B[q][0])), d = P.trap ? 3 + (lg.length >= 10 ? 1 : 0) : 1 + (lg.length >= 10 ? 1 : 0) + (B[best][0] < maxF ? 1 : 0);
    if (P.d !== d) a(`⑥ stored d ${P.d}, the board ${d}`); if (!P.trap) ds.push(d);
    // ⑤
    for (const [nm, c2] of others) { const dd = dist(String(P.cells), c2); if (dd <= 3) a(`⑤ ${dd} square(s) from ${nm}`); }
    P0.forEach((Q, k) => { if (k > j) { const dd = dist(String(P.cells), String(Q.cells)); if (dd <= 3) a(`⑤ ${dd} square(s) from corner q${k + 1}`); } });
    // ⑦⑧ リバガメ's words at each place of a draw
    const marks = lg.some(give);
    for (let i = 0; i < 5; i++) { const W = X.rvLsJa(id, P, i, li, marks);
      for (const t of [W.ask, W.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ #${i + 1}: the question / hint 「${t}」`);
      const H = P.trap ? X.RV_HCT : X.RV_HCS; if (!H.some(h => W.hintTx.startsWith(h))) a(`⑧ #${i + 1}: the hint 「${W.hintTx}」 is not the ${P.trap ? 'exception' : 'corner'} kind`);
      if (marks && !/赤い枠/.test(W.hintTx)) a(`⑧ #${i + 1}: the hint does not point at the red frames`);
      const g = String(W.good(best));
      if (P.trap ? !/隅が取れない|取れる隅がない|隅がないなら|隅に打てない/.test(g) : !/隅を取った|隅をしっかり|角の石|隅、ゲット|取れる隅を/.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say the board's case`);
      if (/赤い枠/.test(g) && !lg.some(q => q !== best && give(q))) a(`⑧ #${i + 1}: the praise speaks of red frames, no move opens a corner`);
      if (EVAL.test(g)) a(`⑧ #${i + 1}: the praise leans on the engine's value`);
      for (const q of lg) { if (q === best) continue; const t = String(W.ng(q)), xc = xcOf(c, q);
        if (!t || /\{|undefined|NaN/.test(t)) { a(`⑧ move ${q} (#${i + 1}): 「${t}」`); continue; }
        if (EVAL.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 — the engine's value, not the board`);
        if (give(q)) { if (!GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): opens a corner, 「${t}」 does not say so`); }
        else { if (GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says it opens a corner, it does not`);
          if (xc) { if (!t.includes(xc)) a(`⑦ move ${q} (#${i + 1}): an ${xc} square, 「${t}」 does not say so`); }
          else if (!P.trap && !MISS.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 does not say the corner was there`); }
        for (const m of t.matchAll(/(?:となりの|は|に打つと、空いた隅を|隅が空いているうちは)(X|C)/g)) if (m[1] !== xc) a(`⑧ move ${q} (#${i + 1}): says ${m[1]}, the board ${xc || 'neither'}`); } } });
  const hs = new Set(ds); if (![1, 2, 3].every(x => hs.has(x))) add(-1, `⑥ the corner problems' difficulties ${[...hs]} cannot make a rising draw`);
  if (nTrap < 4) add(-1, `⑤⑥ only ${nTrap} exception problems`);
  // 追14 the warm-up
  const RJ = X.RVJ_LS.ramp.corner || {};
  (l.warm || []).forEach((w, j) => { const a = m => add(-1, `追14 warm ${w.k}: ${m}`), c = String(w.cells).split('').map(Number), me = w.toMove, lg = legal(c, me);
    if (w.t === 'concept') return;
    if (lg.length < 3) a(`only ${lg.length} legal moves`);
    const r = opt.reads ? null : read(c, me, 12); if (r) { const s = lg.slice().sort((x, y) => r[y] - r[x]); if (s[0] !== w.ans) a(`the engine's best is ${s[0]}, not ${w.ans}`); else if (r[s[0]] - r[s[1]] < 3) a(`the 2nd move only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    const B = boardF(c, me), opC = legal(c, 3 - me).filter(q => CN.includes(q)), giveN = q => legal(play(c, q, me), 3 - me).filter(y => CN.includes(y) && !opC.includes(y)).length > 0;
    if (w.k === 'g') { const myC = lg.filter(q => CN.includes(q)); if (myC.length !== 1 || myC[0] !== w.ans) a('「白が打てる隅はひとつだけ」 is not the board');
      if (/赤い枠のX/.test(RJ.gok || '') && !lg.some(q => XS[q] != null && !c[XS[q]] && giveN(q))) a('「赤い枠のXに打っていたら、相手に隅を渡す」: no X move opens a corner'); }
    if (w.k === 'p1' && /XとC/.test(RJ.p1ok || '')) { const o = lg.filter(q => q !== w.ans).map(q => xcOf(c, q)).sort().join(''); if (o !== 'CX') a(`「ほかの2手は…XとC」: the board has ${o}`); }
    if (w.k === 'p2' && /赤い枠/.test(RJ.p2ok || '')) { const rest = lg.filter(q => q !== w.ans && !giveN(q)), f0 = front(play(c, w.ans, me), me);
      if (!lg.some(q => q !== w.ans && giveN(q))) a('「赤い枠は相手に隅を渡す手」: none opens a corner');
      rest.forEach(q => { if (front(play(c, q, me), me) - f0 < 3) a(`「ほかの手は外がわの石を大きくふやす」: move ${q} adds ${front(play(c, q, me), me) - f0}`); }); } });
  return out;
}
module.exports = corner;
if (require.main === module) { const f = corner(); f.forEach(x => console.log(`NG reversi ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK reversi corner'); process.exit(f.length ? 1 : 0); }
