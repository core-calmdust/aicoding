'use strict';
// (2026-11-25 第2期・担当A) リバーシ「石の数より『打てる場所の数』」（reversi/lessons.json mobility）の問題の検証。
// node tools/lesson-verify-rvmob.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手6つ以上
//  ④ 主題：答え＝打ったあと相手の打てる場所がいちばん少ない手（ただ1つ）。答えはいちばん多く返す手ではない（ほかにもっと返す手がある）、
//     どちらも隅に打てない（隅の話にしない）、答えは隅を渡さずX・Cでもない。保存した f の数（返る枚数・開放度・相手の手数・隅を渡す・空きの塊・パス）は盤の事実
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、mobility どうしと8対称で4マス以上違う
//  ⑥ P.d（1＋合法手10以上＋相手の手数が答えと1か所差以内の手がある）を保存、2D・3D とも P.d 順、プールに d 1・2・3
//  ⑦⑧ リバガメの問い・ヒント・ほめ言葉・全不正解手の文（5つの出題位置）：相手の手数（赤い枠・緑の枠）・返す枚数・隅・X/C が盤のとおり、評価値の言葉なし
//  追14 準備（c1・g・p1・p2）：答えがエンジンで最善（3石以上の差）・相手の手数がいちばん少ない、3D と 2D（日本語）の文の数が盤のとおり
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
const diff = (B, lg, a) => { const others = lg.filter(q => q !== a).map(q => B[q][2]); return 1 + (lg.length >= 10 ? 1 : 0) + (Math.min(...others) - B[a][2] <= 1 ? 1 : 0); };

function mobility(opt) {
  opt = opt || {};
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = opt.src || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const out = [], id = 'mobility', add = (j, m) => out.push({ step: id, q: j + 1, msg: m });
  const l = L.lessons.find(x => x.id === id), li = L.lessons.indexOf(l); if (!l) { add(-1, 'no mobility lesson'); return out; }
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, RVJ_LS })', {});
  // ②⑥⑨ the code both versions run (shared with corner)
  if (!/if \(pr && pr\.type === 'eval' && pr\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(n - 1 - r\) \/ \(n - 1\)\)\);/.test(app)) add(-1, '②⑨ reversi/index.html problemPoints gives a verified eval problem\'s 2nd move 16+ points');
  if (!/if \(P\.type === 'eval' && P\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(all\.length - 1 - all\.filter\(v => v > mine \+ 1e-9\)\.length\) \/ \(all\.length - 1\)\)\);/.test(src)) add(-1, '②⑨ the 3D REVERSI.points gives a verified eval problem\'s 2nd move 16+ points');
  const SORT = /probs\.every\(p => p\.type === 'eval' && p\.d != null\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| a\.d - b\.d\)/;
  if (!SORT.test(app)) add(-1, '⑥⑨ reversi/index.html startLesson does not sort by P.d');
  if (!SORT.test(src)) add(-1, '⑥ the 3D REVERSI.lesson does not sort by P.d');
  if (!/case 'mobility':\n\s+out\.push\(t\('r\.mob'\) \+ cmp\(3, 'u\.place'\)/.test(app)) add(-1, '⑦⑨ 2D lessonReason: mobility does not compare the opponent\'s moves');
  // ⑤ the pool to compare with
  const others = []; L.lessons.forEach(x => { if (x.id !== id) x.problems.forEach((p, j) => others.push([`${x.id} q${j + 1}`, String(p.cells)])); (x.warm || []).forEach((w, j) => others.push([`${x.id} warm ${w.k || j + 1}`, String(w.cells)])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => others.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8'));
  for (const st of OP.sets) for (const ln of st.lines) { let b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; let s = 1;
    for (const m of ln.moves.match(/../g) || []) { const q = (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8; let f = flips(b, q, s); if (!f.length) { s = 3 - s; f = flips(b, q, s); } if (!f.length) break; b = play(b, q, s); s = 3 - s; others.push([`opening ${ln.moves.slice(0, 20)}…`, b.join('')]); } }
  try { const opp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')); for (const k in opp) (opp[k] || []).forEach((p, j) => others.push([`opening practice ${k} ${j + 1}`, String(p.pos).split(':')[0]])); } catch (e) { /* none */ }
  (l.warm || []).forEach(w => others.push([`mobility warm ${w.k}`, String(w.cells)]));
  const P0 = l.problems, ds = [];
  if (P0.length < 16) add(-1, `⑤ only ${P0.length} problems`);
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
    const B = boardF(c, me); lg.forEach(m => { const s = F[m].slice(1, 7).join(), t = B[m].join(); if (s !== t) a(`④ move ${m}: stored [${s}], the board [${t}]`); });
    const mob = q => B[q][2], mn = Math.min(...lg.map(mob)), mins = lg.filter(q => mob(q) === mn);
    if (mins.length !== 1 || mins[0] !== best) a(`④ the fewest opponent moves (${mn}) are after ${mins}, the answer is ${best}`);
    if (B[best][0] >= Math.max(...lg.map(q => B[q][0]))) a(`④ the answer flips the most (${B[best][0]}): 「いちばん多く返す手は要注意」 has no move to warn of`);
    if (lg.some(q => CN.includes(q))) a('④ a corner to take: the corner lesson\'s point, not this one');
    if (legal(c, 3 - me).some(q => CN.includes(q))) a('④ the opponent can already take a corner');
    if (B[best][3] || xcOf(c, best)) a(`④ the answer ${best} opens a corner or is an ${xcOf(c, best) || 'opening'} square`);
    // ⑥
    const d = diff(B, lg, best); if (P.d !== d) a(`⑥ stored d ${P.d}, the board ${d}`); ds.push(d);
    // ⑤
    for (const [n, c2] of others) { const dd = dist(String(P.cells), c2); if (dd <= 3) a(`⑤ ${dd} square(s) from ${n}`); }
    P0.forEach((Q, k) => { if (k > j) { const dd = dist(String(P.cells), String(Q.cells)); if (dd <= 3) a(`⑤ ${dd} square(s) from mobility q${k + 1}`); } });
    // ⑦⑧ リバガメ's words at each place of a draw
    const marks = lg.some(q => B[q][3]), mf = Math.max(...lg.map(q => B[q][0]));
    for (let i = 0; i < 5; i++) { const W = X.rvLsJa(id, P, i, li, marks);
      for (const t of [W.ask, W.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ #${i + 1}: the question / hint 「${t}」`);
      if (!X.RVJ_LS.hint.mobility.some(h => W.hintTx.startsWith(h))) a(`⑧ #${i + 1}: the hint 「${W.hintTx}」 is not the mobility kind`);
      if (EVAL.test(W.hintTx)) a(`⑧ #${i + 1}: the hint 「${W.hintTx}」 guesses`);
      const g = String(W.good(best));
      if (!g.includes(`${mob(best)}か所`)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say the ${mob(best)} moves left`);
      for (const m of g.matchAll(/(\d+)か所(?:にふえ|も打て|になる|に打て)/g)) { const n = +m[1], q = lg.find(z => B[z][0] === mf && mob(z) === n); if (!q) a(`⑧ #${i + 1}: the praise says the move flipping the most leaves ${n}, the board ${lg.filter(z => B[z][0] === mf).map(mob)}`); }
      if (EVAL.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 leans on the engine's value`);
      for (const q of lg) { if (q === best) continue; const t = String(W.ng(q)), xc = xcOf(c, q);
        if (!t || /\{|undefined|NaN/.test(t)) { a(`⑧ move ${q} (#${i + 1}): 「${t}」`); continue; }
        if (EVAL.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 — the engine's value, not the board`);
        if (!t.includes(`${mob(q)}か所`) || !t.includes(`${mob(best)}か所`)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 does not compare ${mob(q)} with ${mob(best)} moves`);
        if (B[q][3] && !GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): opens a corner, 「${t}」 does not say so`);
        if (!B[q][3] && GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says it opens a corner, it does not`);
        if (!B[q][3] && xc && !t.includes(xc)) a(`⑦ move ${q} (#${i + 1}): an ${xc} square, 「${t}」 does not say so`);
        for (const m of t.matchAll(/(\d+)枚/g)) if (+m[1] !== B[q][0]) a(`⑧ move ${q} (#${i + 1}): says ${m[1]} discs, it flips ${B[q][0]}`);
        if (/枚も返す|返しすぎ|多めに返し/.test(t) && B[q][0] <= B[best][0]) a(`⑧ move ${q} (#${i + 1}): 「${t}」 — it flips ${B[q][0]}, the answer ${B[best][0]}`); } } });
  const hs = new Set(ds); if (![1, 2, 3].every(x => hs.has(x))) add(-1, `⑥ the difficulties ${[...hs]} cannot make a rising draw`);
  // 追14 the warm-up: the numbers in the 3D and the 2D (ja) texts
  const RJ = X.RVJ_LS.ramp.mobility || {}, WJ = (l.text && l.text.ja && l.text.ja.warm) || {};
  (l.warm || []).forEach(w => { const a = m => add(-1, `追14 warm ${w.k}: ${m}`), c = String(w.cells).split('').map(Number), me = w.toMove, lg = legal(c, me), B = boardF(c, me);
    const now = legal(c, 3 - me).length, mob = q => B[q][2], mn = Math.min(...lg.map(mob));
    if (lg.length < 3) a(`only ${lg.length} legal moves`);
    if (w.t === 'concept') { const focus = +Object.keys(w.marks || {}).find(k => w.marks[k] === 'focus'), danger = +Object.keys(w.marks || {}).find(k => w.marks[k] === 'danger');
      for (const t of [RJ.c1, WJ.c1]) { if (!t) continue; const ns = [...t.matchAll(/(\d+)か所/g)].map(x => +x[1]);
        if (ns.join() !== [now, mob(focus), mob(danger)].join()) a(`「${t.slice(0, 40)}…」 says ${ns}, the board ${now}, ${mob(focus)}, ${mob(danger)}`); }
      if (mob(focus) !== mn) a('the gold frame is not the fewest'); return; }
    const r = opt.reads ? null : read(c, me, 12); if (r) { const s = lg.slice().sort((x, y) => r[y] - r[x]); if (s[0] !== w.ans) a(`the engine's best is ${s[0]}, not ${w.ans}`); else if (r[s[0]] - r[s[1]] < 3) a(`the 2nd move only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    if (lg.filter(q => mob(q) === mn).join() !== String(w.ans)) a(`the fewest opponent moves are after ${lg.filter(q => mob(q) === mn).map(nm)}, not ${nm(w.ans)}`);
    const rest = lg.filter(q => q !== w.ans).map(mob);
    if (w.k === 'g') { for (const t of [RJ.gok, WJ.gok]) { if (!t) continue; const ns = [...t.matchAll(/(\d+)(?:か所)?(?:から|→)(\d+)/g)][0]; if (!ns || +ns[1] !== now || +ns[2] !== mob(w.ans)) a(`「${t.slice(0, 40)}…」: the board ${now}→${mob(w.ans)}`); }
      if (/内がわの石|内側の石/.test(RJ.gok + WJ.gok) && B[w.ans][1] > Math.min(...lg.map(q => B[q][1]))) a('「内がわの石」: another move flips discs with fewer empty neighbours'); }
    if (w.k === 'p1') { for (const t of [RJ.p1ok, WJ.p1ok]) { if (!t) continue; const m1 = t.match(/(\d+)か所/); if (!m1 || +m1[1] !== mob(w.ans)) a(`「${t}」: the board ${mob(w.ans)}`); const m2 = t.match(/（(\d+)〜(\d+)か所）/); if (m2 && (+m2[1] !== Math.min(...rest) || +m2[2] !== Math.max(...rest))) a(`「${t}」: the others ${Math.min(...rest)}〜${Math.max(...rest)}`); } }
    if (w.k === 'p2') { for (const t of [RJ.p2ok, WJ.p2ok]) { if (!t) continue; const m1 = t.match(/打てる場所は(\d+)か所/); if (m1 && +m1[1] !== mob(w.ans)) a(`「${t}」: the board ${mob(w.ans)}`);
        for (const m of t.matchAll(/([a-h][1-8])・([a-h][1-8])などは(\d+)〜(\d+)か所/g)) { const xs = [m[1], m[2]].map(s => (s.charCodeAt(0) - 97) + (+s[1] - 1) * 8).map(mob); if (Math.min(...xs) !== +m[3] || Math.max(...xs) !== +m[4]) a(`「${t}」: the board ${xs}`); } } } });
  return out;
}
module.exports = mobility;
if (require.main === module) { const f = mobility(); f.forEach(x => console.log(`NG reversi ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK reversi mobility'); process.exit(f.length ? 1 : 0); }
