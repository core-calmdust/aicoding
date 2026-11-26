'use strict';
// (2026-11-27 第2期・担当A) リバーシ「辺の攻め：付け手」（reversi/lessons.json edge）の問題の検証。
// node tools/lesson-verify-rvedge.js（tools/lesson-verify.js reversi から呼ぶ）
//  ① 保存した手＝ルールの合法手、保存値＝エンジン（reversi/engine.js、毎回 TT を消して深さ14）の読み、答え＝深さ14と深さ10の両方で最善
//  ② 2番目との差が両方の深さで3石以上（tol より大きい）、2D・3D の点で答え以外は16点未満（12点まで）
//  ③ 合法手6つ以上、付け手のほかに辺の手が1つ以上
//  ④ 主題：盤の付け手（隅でない辺の空きで、辺にそって両どなりが相手の石）はただ1つで答え、P.wedge＝盤の付け手。付け手のあとも両どなりは相手の石のまま
//     （「横から返されない」が盤の事実）。隅に打てない・相手も隅に打てない、答えは隅を渡さずX・Cでもない。
//     不正解の手はどれも、隅を渡す・X/C か、相手の打てる場所が答えより多い（盤で理由が言える）。保存した f の数は盤の事実。わな（trap）の問題はない
//  ⑤ リバーシの全レッスン（準備も）・パズル・定跡の手順と練習問題、edge どうしと8対称で4マス以上違う
//  ⑥ P.d＝1＋（付け手でない辺の手が3つ以上）＋（2番目の手が辺の手）を保存、2D・3D とも P.d 順、プールに d 1・2・3
//  ⑦⑧ リバガメの問い・ヒント（赤い枠＝隅を渡す手があるときだけ）・ほめ言葉（付け手）・全不正解手の文（5つの出題位置）：付け手を指し、隅・X/C・相手の打てる場所が盤のとおり、評価値の言葉なし
//     2D：不正解で隅を渡さず X/C でもない手は、相手の打てる場所をくらべる（r.mob）
//  追14 準備（c1・g・p1・p2）：金の枠・答えは盤でただ1つの付け手、答えがエンジン（深さ12）で最善（3石以上の差）、文が名指すマスの色・隅を渡す手（新しく開く隅）・答えは新しく隅を開かず X/C でない・片方だけが打てるマス・答えのマスが盤のとおり（3D・2D 日本語・warm3d.json）
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

// the edge line through an edge square (not a corner): its two neighbours along the edge
const edgeNb = q => { const r = q >> 3, k = q & 7; if (CN.includes(q)) return null; if (r === 0 || r === 7) return [q - 1, q + 1]; if (k === 0 || k === 7) return [q - 8, q + 8]; return null; };
const isWedge = (c, q, me) => { const e = edgeNb(q); return !!e && e.every(x => c[x] === 3 - me); };
// the board's facts of an edge problem: the wedges, the other edge moves, the wedge kept after it (both edge neighbours stay the opponent's), d
function edgeFacts(c, me, r14) {
  const lg = legal(c, me), B = boardF(c, me), wedges = lg.filter(q => isWedge(c, q, me)), edges = lg.filter(q => edgeNb(q) && !isWedge(c, q, me));
  const a = wedges.length === 1 ? wedges[0] : -1, kept = a >= 0 && edgeNb(a).every(x => play(c, a, me)[x] === 3 - me);
  const s = lg.slice().sort((x, y) => r14[y] - r14[x]);
  const d = a < 0 ? 0 : 1 + (edges.length >= 3 ? 1 : 0) + (edges.includes(s[1]) ? 1 : 0);   // (more edge moves to tell apart, and the 2nd best on an edge: harder)
  return { lg, B, wedges, edges, a, kept, d };
}
function edgeChk(opt) {
  opt = opt || {};
  const L = opt.lessons || JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8'));
  const src = opt.src || fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), app = opt.app || fs.readFileSync(path.join(ROOT, 'reversi/index.html'), 'utf8');
  const out = [], id = 'edge', add = (j, m) => out.push({ step: id, q: j + 1, msg: m });
  const l = L.lessons.find(x => x.id === id), li = L.lessons.indexOf(l); if (!l) { add(-1, 'no edge lesson'); return out; }
  const pre = ['  const fill = ', '  const L = (o, lang)'].map(k => { const i = src.indexOf(k); return src.slice(i, src.indexOf('\n', i)); }).join('\n');
  const X = vm.runInNewContext(pre + '\n' + src.slice(src.indexOf('  const RV_TABS = '), src.indexOf('  const rvNC = ')) + '\n;({ rvLsJa, RVJ_LS })', {});
  // ②⑥⑦⑨ the code both versions run
  if (!/if \(pr && pr\.type === 'eval' && pr\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(n - 1 - r\) \/ \(n - 1\)\)\);/.test(app)) add(-1, '②⑨ reversi/index.html problemPoints gives a verified eval problem\'s 2nd move 16+ points');
  if (!/if \(P\.type === 'eval' && P\.d != null\) return Math\.max\(0, Math\.round\(12 \* \(all\.length - 1 - all\.filter\(v => v > mine \+ 1e-9\)\.length\) \/ \(all\.length - 1\)\)\);/.test(src)) add(-1, '②⑨ the 3D REVERSI.points gives a verified eval problem\'s 2nd move 16+ points');
  const SORT = /probs\.every\(p => p\.type === 'eval' && p\.d != null\)\) probs\.sort\(\(a, b\) => \(a\.trap \? 1 : 0\) - \(b\.trap \? 1 : 0\) \|\| a\.d - b\.d\)/;
  if (!SORT.test(app)) add(-1, '⑥⑨ reversi/index.html startLesson does not sort by P.d');
  if (!SORT.test(src)) add(-1, '⑥ the 3D REVERSI.lesson does not sort by P.d');
  if (!/case 'edge':\n\s+if \(pr\.wedge && pr\.wedge\.includes\(bm\)\) out\.push\(t\('r\.wedge', \{ m: nm\(bm\) \}\)\);\n\s+if \(!ok && !me\[4\] && !xc\) out\.push\(t\('r\.mob'\) \+ cmp\(3, 'u\.place'\)\);/.test(app)) add(-1, '⑦⑨ 2D lessonReason: edge does not compare the opponent\'s moves after a wrong move');
  // ⑤ the pool to compare with
  const others = []; L.lessons.forEach(x => { if (x.id !== id) x.problems.forEach((p, j) => others.push([`${x.id} q${j + 1}`, String(p.cells)])); (x.warm || []).forEach((w, j) => others.push([`${x.id} warm ${w.k || j + 1}`, String(w.cells)])); });
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8')); (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => others.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8'));
  for (const st of OP.sets) for (const ln of st.lines) { let b = new Array(64).fill(0); b[27] = 2; b[28] = 1; b[35] = 1; b[36] = 2; let s = 1;
    for (const m of ln.moves.match(/../g) || []) { const q = (m.charCodeAt(0) - 97) + (+m[1] - 1) * 8; let f = flips(b, q, s); if (!f.length) { s = 3 - s; f = flips(b, q, s); } if (!f.length) break; b = play(b, q, s); s = 3 - s; others.push([`opening ${ln.moves.slice(0, 20)}…`, b.join('')]); } }
  try { const opp = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')); for (const k in opp) (opp[k] || []).forEach((p, j) => others.push([`opening practice ${k} ${j + 1}`, String(p.pos).split(':')[0]])); } catch (e) { /* none */ }
  (l.warm || []).forEach(w => others.push([`edge warm ${w.k}`, String(w.cells)]));
  const P0 = l.problems, ds = [];
  if (P0.length < 16) add(-1, `⑤ only ${P0.length} problems`);
  P0.forEach((P, j) => { const a = m => add(j, m), c = String(P.cells).split('').map(Number), me = P.toMove, F = P.f || {};
    if (P.type !== 'eval') { a('① not an eval problem'); return; }
    if (P.trap) a('④ an exception problem: the edge lesson has none');
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
    const W = edgeFacts(c, me, r14), B = W.B, mob = q => B[q][2];
    lg.forEach(m => { const s = F[m].slice(1, 7).join(), t = B[m].join(); if (s !== t) a(`④ move ${m}: stored [${s}], the board [${t}]`); });
    if (W.a < 0) a(`④ ${W.wedges.length} wedges (moves between two opposing edge discs) on the board: the lesson asks for the one`);
    else if (W.a !== best) a(`④ the wedge is ${W.a}, the answer is ${best}`);
    const sw = (P.wedge || []).slice().sort((x, y) => x - y).join(); if (sw !== W.wedges.slice().sort((x, y) => x - y).join()) a(`④ the stored wedges [${sw}], the board [${W.wedges}]`);
    if (W.a >= 0 && !W.kept) a(`⑧ after the wedge ${W.a} an edge neighbour is flipped: 「両側が相手の石だから、横から返されない」 is not the board`);
    if (!W.edges.length) a('③ no other edge move: the wedge is the only edge square to look at');
    if (lg.some(q => CN.includes(q))) a('④ a corner to take: the corner lesson\'s point, not this one');
    if (legal(c, 3 - me).some(q => CN.includes(q))) a('④ the opponent can already take a corner');
    if (B[best][3] || xcOf(c, best)) a(`④ the answer ${best} opens a corner or is an ${xcOf(c, best) || 'opening'} square`);
    lg.forEach(u => { if (u === best || B[u][3] || xcOf(c, u)) return; if (!(mob(u) > mob(best))) a(`⑦ move ${u}: no corner, no X/C, and the opponent's moves ${mob(u)} ≤ ${mob(best)}: no board reason`); });
    // ⑥
    if (P.d !== W.d) a(`⑥ stored d ${P.d}, the board ${W.d}`); ds.push(W.d);
    // ⑤
    for (const [n, c2] of others) { const dd = dist(String(P.cells), c2); if (dd <= 3) a(`⑤ ${dd} square(s) from ${n}`); }
    P0.forEach((Q, k) => { if (k > j) { const dd = dist(String(P.cells), String(Q.cells)); if (dd <= 3) a(`⑤ ${dd} square(s) from edge q${k + 1}`); } });
    // ⑦⑧ リバガメ's words at each place of a draw
    const marks = lg.some(q => B[q][3]);
    for (let i = 0; i < 5; i++) { const T = X.rvLsJa(id, P, i, li, marks);
      for (const t of [T.ask, T.hintTx]) if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ #${i + 1}: the question / hint 「${t}」`);
      if (EVAL.test(T.hintTx) || EVAL.test(T.ask)) a(`⑧ #${i + 1}: the question / hint guesses`);
      if (marks !== /赤い枠/.test(T.hintTx)) a(`⑧ #${i + 1}: the hint 「${T.hintTx}」 and the red frames (moves that give a corner: ${marks})`);
      const g = String(T.good(best));
      if (!/付け手|くさび|すき間/.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 does not say the wedge`);
      if (EVAL.test(g)) a(`⑧ #${i + 1}: the praise 「${g}」 leans on the engine's value`);
      for (const q of lg) { if (q === best) continue; const t = String(T.ng(q)), xc = xcOf(c, q);
        if (!t || /\{|undefined|NaN/.test(t)) { a(`⑧ move ${q} (#${i + 1}): 「${t}」`); continue; }
        if (EVAL.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 — the engine's value, not the board`);
        if (!/付け手|すき間/.test(t)) a(`⑧ move ${q} (#${i + 1}): 「${t}」 does not point at the wedge`);
        if (B[q][3] && !GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): opens a corner, 「${t}」 does not say so`);
        if (!B[q][3] && GIVE.test(t)) a(`⑦ move ${q} (#${i + 1}): 「${t}」 says it opens a corner, it does not`);
        if (!B[q][3] && xc && !t.includes(xc)) a(`⑦ move ${q} (#${i + 1}): an ${xc} square, 「${t}」 does not say so`);
        if (!B[q][3] && !xc && (!t.includes(`${mob(q)}か所`) || !t.includes(`${mob(best)}か所`))) a(`⑦ move ${q} (#${i + 1}): 「${t}」 does not compare ${mob(q)} with ${mob(best)} moves`);
        for (const m of t.matchAll(/(\d+)か所/g)) if (![mob(q), mob(best)].includes(+m[1])) a(`⑧ move ${q} (#${i + 1}): says ${m[0]}`); } } });
  const hs = new Set(ds); if (![1, 2, 3].every(x => hs.has(x))) add(-1, `⑥ the difficulties ${[...hs]} cannot make a rising draw`);
  // 追14 the warm-up: the engine's best, the wedge, and the squares the texts name
  const RJ = X.RVJ_LS.ramp.edge || {}, WJ = (l.text && l.text.ja && l.text.ja.warm) || {}, W3 = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/warm3d.json'), 'utf8')); } catch (e) { return {}; } })();
  const sq = x => (x.charCodeAt(0) - 97) + (+x[1] - 1) * 8;
  (l.warm || []).forEach(w => { const a = m => add(-1, `追14 warm ${w.k}: ${m}`), c = String(w.cells).split('').map(Number), me = w.toMove, lg = legal(c, me), ol = legal(c, 3 - me), B = boardF(c, me);
    const texts = k => [['3D', RJ[k]], ['2D', WJ[k]], ['3D(json)', W3['edge/' + k] && W3['edge/' + k].ja]].filter(x => x[1]);
    if (lg.length < 3) a(`only ${lg.length} legal moves`);
    const gives = q => legal(play(c, q, me), 3 - me).filter(z => CN.includes(z) && !ol.includes(z));   // (a corner the move newly opens)
    const tx = w.t === 'concept' ? texts(w.k) : texts(w.k + 'ok').concat(w.t === 'guided' ? texts(w.k) : []);
    for (const [k0, t] of tx) { const s = String(t);
      for (const m of s.matchAll(/([a-h][1-8]) と ([a-h][1-8]) (?:に|の)(黒|白)石/g)) { const col = m[3] === '黒' ? 1 : 2; [m[1], m[2]].forEach(x => { if (c[sq(x)] !== col) a(`${k0}「${s.slice(0, 40)}…」: ${x} is not ${m[3]}`); }); }
      for (const m of s.matchAll(/([a-h][1-8]) は相手に ([a-h][1-8]) の隅を渡す/g)) { const q = sq(m[1]); if (!lg.includes(q) || !gives(q).includes(sq(m[2]))) a(`${k0}: ${m[1]} does not give the ${m[2]} corner (newly)`); }
      for (const m of s.matchAll(/([a-h][1-8]) は(白|黒)だけが打てる/g)) { const q = sq(m[1]), col = m[2] === '黒' ? 1 : 2; if (!(legal(c, col).includes(q) && !legal(c, 3 - col).includes(q))) a(`${k0}: ${m[1]} is not a square only ${m[2]} can play`); }
      for (const m of s.matchAll(/([a-h][1-8]) (?:が正解|の付け手)/g)) { const q = sq(m[1]); if (w.t !== 'concept' && q !== w.ans) a(`${k0}: names ${m[1]}, the answer is ${nm(w.ans)}`); } }
    if (w.t === 'concept') { const mk = w.marks || {}, focus = +Object.keys(mk).find(k => mk[k] === 'focus');
      if (!lg.includes(focus) || !isWedge(c, focus, me)) a(`the gold frame ${nm(focus)} is not a legal wedge`);
      else if (!edgeNb(focus).every(x => play(c, focus, me)[x] === 3 - me)) a(`after ${nm(focus)} an edge neighbour is flipped: 「横から返されない」`);
      Object.keys(mk).filter(k => mk[k] === 'front').map(Number).forEach(q => { if (c[q] !== 3 - me || !edgeNb(focus) || !edgeNb(focus).includes(q)) a(`the green frame ${nm(q)} is not an opposing disc beside the wedge`); });
      return; }
    if (!lg.includes(w.ans)) { a(`the answer ${w.ans} is not a legal move`); return; }
    if (!isWedge(c, w.ans, me)) a(`the answer ${nm(w.ans)} is not a wedge`);
    if (lg.filter(q => isWedge(c, q, me)).length !== 1) a(`${lg.filter(q => isWedge(c, q, me)).length} wedges on the board`);
    if (!edgeNb(w.ans).every(x => play(c, w.ans, me)[x] === 3 - me)) a(`after ${nm(w.ans)} an edge neighbour is flipped`);
    const r = opt.reads ? null : read(c, me, 12); if (r) { const s = lg.slice().sort((x, y) => r[y] - r[x]); if (s[0] !== w.ans) a(`the engine's best is ${nm(s[0])} (${r[s[0]]}), not ${nm(w.ans)} (${r[w.ans]})`); else if (r[s[0]] - r[s[1]] < 3) a(`the 2nd move only ${(r[s[0]] - r[s[1]]).toFixed(1)} below`); }
    if (gives(w.ans).length || xcOf(c, w.ans)) a(`the answer ${nm(w.ans)} opens a corner or is an X/C`); });
  return out;
}
module.exports = edgeChk;
module.exports.edgeFacts = edgeFacts;
module.exports.isWedge = isWedge;
module.exports.boardF = boardF;
if (require.main === module) { const f = edgeChk(); f.forEach(x => console.log(`NG reversi ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK reversi edge'); process.exit(f.length ? 1 : 0); }
