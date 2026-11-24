// tools/lesson-verify-patolli.js — パトリのレッスン（patolli/lessons.json、ベルの復元の v2）の厳しい検証（2026-11-24、担当C、3D対応）。tools/lesson-verify.js patolli から呼ぶ。
// ①② 手の問題は、その局面から到達できる全局面（全出目・全応手・腕の先のもう一度）を patolli/tools/patolli_exact.c（gcc でその場でコンパイル）で
//    解き直し、全合法手の勝率を保存値 ev と照合。C の手の生成が patolli/engine.js と同じことも、小さい局面で JavaScript 版（solver）と照合する。
// ③④⑤⑥⑦⑧・選択問題の答えと誤答の説明（追22）・32通りの数え上げ（追23）・ヒントの印（追7）・勝率の文なし（追16）・14言語・
// 追33（もう一度投げる手のあとに相手の次の投げの確率を言わない：パトリの理由は確率を相手の投げに使わない＝n.home の通り数は自分の目）。
// opt.noExact：①の解き直しを省く（壊したデータの検出テスト用）
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
module.exports = function patolli(opt = {}) {
  const E = require(path.join(ROOT, 'patolli/engine.js')), F = require(path.join(ROOT, 'patolli/tools/patolli_lessfacts.js'));
  const X = require(path.join(ROOT, 'patolli/tools/patolli_exact.js')), LANGS = require(path.join(ROOT, 'patolli/tools/learn_text_v2.js')).LANGS;
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'patolli/lessons.json'), 'utf8'));
  const out = [], add = (step, q, msg) => out.push({ step, q, msg });
  // 追16：文言に勝率・評価値を書かない（14言語）
  const BAD = /勝率|勝つ見込み|評価値|[Ww]in chance|[Ww]in \{|胜率|勝算|승률|\{a\}\s?%|\{x\}\s?%|%\{a\}|%\{x\}/;
  const walk = (o, where) => { if (typeof o === 'string') { if (BAD.test(o)) add(where, 0, `追16 勝率・%の文: ${o.slice(0, 50)}`); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], where); };
  const V2 = D.steps.filter(s => s.v2), OLDS = D.steps.filter(s => !s.v2).map(s => s.id);
  if (OLDS.length) console.log(`(patolli: 作り直し前のレッスン ${OLDS.join('・')} は3Dの一覧に出さず、この検証の対象外＝進み具合表で「一部」)`);
  const ORDER = ['prob', 'again', 'enter', 'goal', 'mix', 'pen', 'cap', 'safe', 'pmix'];
  if (D.steps.map(s => s.id).join() !== ORDER.join()) add('steps', 0, `レッスンの並び ${D.steps.map(s => s.id).join()}`);
  if (D.steps.filter(s => s.cat === 'basic' && s.v2).some((s, i, a) => i && ORDER.indexOf(s.id) < ORDER.indexOf(a[i - 1].id))) add('steps', 0, '⑥並び');
  const refd = new Set(); const ref = r => r && refd.add(r[0]);
  V2.forEach(L => [...L.problems, ...L.ramp].forEach(q => { ref(q.why); for (const f in q.ng || {}) ref(q.ng[f]); (q.ngo || []).forEach(ref); }));
  const has14 = (o, where) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) { add(where, 0, `14言語 ${l} がない`); return; } };
  for (const k of refd) { has14(D.msg[k], 'msg.' + k); walk(D.msg[k], 'msg.' + k); }
  V2.forEach(s => walk({ t: s.title, b: s.body, tip: s.tip, h: s.hints, r: (s.ramp || []).map(r => [r.t, r.body, r.g, r.h, r.opts]), q: s.problems.map(q => [q.q, q.opts]) }, s.id));
  const refOk = (r, where) => { if (!r || !D.msg[r[0]]) { add(where, 0, `理由のキー ${r && r[0]} が msg にない`); return; } for (const l of LANGS) { const t = (D.msg[r[0]][l] || '').replace(/\{(\w+)\}/g, (_, k) => r[1] && r[1][k] != null ? '' : '§'); if (t.includes('§')) { add(where, 0, `理由 ${r[0]} の値が足りない（${l}）`); return; } } };
  const S = s => F.st(s);
  // ① 厳密な勝率の解き直し（全部の手の問題を1回の C の実行で）
  const exact = new Map();
  const moveItems = [];
  V2.forEach(L => [...(L.problems || []), ...(L.ramp || [])].forEach(q => { if (q.s && q.n && (q.kind === 'move' || q.k === 'try' && q.kind !== 'choice' || q.k === 'explain' && q.seq && q.seq.length)) moveItems.push(q); }));
  if (!opt.noExact) {
    const qs = moveItems.map(q => ({ s: { rule: 'bell', pos: q.s.pos, turn: 0 }, n: q.n, q }));
    X.run(qs, 12000000); qs.forEach(j => exact.set(JSON.stringify([j.q.s.pos, j.q.n]), j.r));
    // C と patolli/engine.js の一致：小さい局面を JavaScript でも解いて全合法手の勝率をくらべる
    let checked = 0;
    for (const j of qs.slice().sort((a, b) => (a.r ? a.r.size : 9e9) - (b.r ? b.r.size : 9e9))) { if (!j.r || j.r.size > 250000 || checked >= 3) continue; const J = X.solver(); checked++;
      for (const e of J.moves(S(j.q.s), j.q.n)) { const b = j.r.mv[e.m.from + '-' + e.m.to]; if (b == null || Math.abs(e.v - b) > 1e-6) add('exact', 0, `C と JS の勝率がちがう ${e.v} ≠ ${b}`); } }
    if (!checked) add('exact', 0, 'C と JS の照合に使える小さい局面がない');
  }
  const THEME = { again: 'again', goal: 'goal', enter: 'enter', mix: 'mix' };
  function move(L, q, where, minMoves) {
    const s = S(q.s), ms = E.legalMoves(s, q.n), th = THEME[L.id];
    if (ms.length < minMoves) add(L.id, where, `③合法手 ${ms.length}`);
    const ev = q.ev || [];
    if (ev.length !== ms.length || !ms.every(m => ev.some(e => e[0] === m.from && e[1] === m.to))) { add(L.id, where, '①保存値 ev が合法手と合わない'); return null; }
    for (let i = 1; i < ev.length; i++) if (ev[i][2] > ev[i - 1][2]) add(L.id, where, '①保存値 ev が勝率の順でない');
    const r = exact.get(JSON.stringify([q.s.pos, q.n]));
    if (!opt.noExact) { if (!r) add(L.id, where, '①厳密な勝率を解けない'); else for (const e of ev) { const v = r.mv[e[0] + '-' + e[1]]; if (v == null || Math.abs(v - e[2]) > 6e-4) { add(L.id, where, `①保存値 ${e[0]}→${e[1]} ${e[2]} ≠ 厳密 ${v}`); break; } } }
    const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
    if (gap < F.MIN_GAP - 1e-9) add(L.id, where, `②2番目との差 ${gap.toFixed(3)}`);
    if (ev[0][2] < 0.05 || ev[0][2] > 0.95) add(L.id, where, '②もう決着している局面');
    const best = ms.find(m => m.from === ev[0][0] && m.to === ev[0][1]), ok = q.ok || q.seq || [];
    if (!best) { add(L.id, where, '①最善手が合法手にない'); return null; }
    if (ok.length !== 1 || ok[0][0] !== best.from || ok[0][1] !== best.to) add(L.id, where, `①正解 ${JSON.stringify(ok)} が最善 ${best.from}→${best.to} でない（正解は1つだけ：追3）`);
    if (q.best && (q.best[0] !== best.from || q.best[1] !== best.to)) add(L.id, where, '①best が最善でない');
    if (!F.themeOk(q.s, q.n, best, ms, th)) add(L.id, where, `④主題（${th}）の手でない`);
    if (q.why) { const w = F.whyOf(q.s, q.n, best); if (!w || q.why[0] !== w[0] || JSON.stringify(q.why[1]) !== JSON.stringify(w[1])) add(L.id, where, `⑧正解の理由 ${JSON.stringify(q.why)} ≠ 盤の事実 ${JSON.stringify(w)}`); refOk(q.why, L.id); }
    else add(L.id, where, '⑧正解の理由がない');
    if (q.kind === 'move' || q.k === 'try') for (const m of ms) { if (m.from === best.from) continue; const k = F.ngKey(q.s, q.n, best, m), got = q.ng && q.ng[m.from];
      if (!k) add(L.id, where, `⑦不正解 ${m.from}→${m.to} の理由を盤の事実で言えない`);
      else if (!got || got[0] !== k[0] || JSON.stringify(got[1]) !== JSON.stringify(k[1])) add(L.id, where, `⑦不正解 ${m.from}→${m.to} の理由 ${JSON.stringify(got)} ≠ ${JSON.stringify(k)}`);
      else refOk(got, L.id); }
    // ⑧ 本文の数（上がりの目の通り数＝32通り中）が盤と合う
    if (q.why && q.why[1].k != null && q.why[1].k !== F.ways(q.why[1].n)) add(L.id, where, `⑧理由の通り数 ${q.why[1].k} ≠ ${F.ways(q.why[1].n)}`);
    // 追7 ヒントの印
    if (q.kind === 'move' || q.k === 'try') { const want = JSON.stringify(F.lookMarks(q.s, q.n, best, th)); if (JSON.stringify(q.look || []) !== want) add(L.id, where, '追7 ヒントの印が盤の事実と合わない'); }
    return gap;
  }
  // 選ぶ問題：答えを32通りの数え上げで出し直す（追23）・誤答の説明（追22）
  const W = F.ways, O = m => m + '/32';
  function choice(L, q, where) {
    const o = q.opts || [];
    if (o.length < 3 || new Set(o.map(x => JSON.stringify(x))).size !== o.length) add(L.id, where, `③選択肢 ${o.length}（重複なし3つ以上）`);
    if (!(q.ans >= 0 && q.ans < o.length)) { add(L.id, where, 'ans'); return 0; }
    const k = q.why && q.why[0], v = (q.why && q.why[1]) || {};
    let right = null, cnt = 1, rolls = null;
    if (k === 'c.roll') { right = O(W(v.n)); if (E.STEPS[v.b] !== v.n || W(v.n) !== v.m) add(L.id, where, '⑧印の数・通り数が目と合わない'); }
    else if (k === 'c.ge3') { rolls = [3, 4, 10]; right = O(rolls.reduce((a, n) => a + W(n), 0)); cnt = 3; if (v.m !== +right.split('/')[0]) add(L.id, where, '追23 理由の通り数'); }
    else if (k === 'c.arm') { const mk = (q.marks || []).find(x => x.type === 'ring'); const i = mk && q.s.pos[0].find(p => { const c = F.rc(0, p); return c && c.r === mk.r && c.c === mk.c; });
      if (!i) add(L.id, where, '輪の駒がない'); else { rolls = F.againRolls(q.s, i); right = O(rolls.reduce((a, n) => a + W(n), 0)); cnt = rolls.length; } }
    else if (k === 'c.home') { rolls = F.goalRolls(q.s); right = O(rolls.reduce((a, n) => a + W(n), 0)); cnt = rolls.length; }
    else if (k === 'c.most') { right = null; const x = o[q.ans]; if (!x || !/2.*3/.test(x.ja || x)) add(L.id, where, '⑧答えが2と3でない'); }
    else add(L.id, where, `理由 ${k} の答えを確かめられない`);
    if (right != null && String(o[q.ans]) !== right) add(L.id, where, `⑧答え ${o[q.ans]} ≠ ${right}`);
    if (rolls) { const want = rolls.map(n => `${n}（${W(n)}）`).join(' + '); if (k !== 'c.ge3' && v.list !== want) add(L.id, where, `追23 数え上げの文 ${v.list} ≠ ${want}`); if (k !== 'c.ge3' && v.m !== +right.split('/')[0]) add(L.id, where, '追23 理由の通り数'); }
    if (q.why) refOk(q.why, L.id);
    const ngo = q.ngo || [], num = y => parseInt(String(typeof y === 'object' ? y.ja : y), 10);
    o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i]; if (!g) { add(L.id, where, `⑦誤答 ${JSON.stringify(x)} の説明がない（追22）`); return; } refOk([g[0], Object.assign({ x: 1 }, g[1])], L.id);   // (x: the choice itself, put in when shown)
      if (k === 'c.most') return;
      if (g[0] === 'c.lowNg' || g[0] === 'c.highNg') { if ((g[0] === 'c.lowNg') !== (num(x) < num(o[q.ans]))) add(L.id, where, `⑦誤答 ${num(x)} の説明 ${g[0]} が逆`); }
      if (g[0] === 'c.rollNg' && !String(g[1].v).split(' / ').every(r => O(W(+r)) === x)) add(L.id, where, `⑦誤答 ${x} の出目 ${g[1].v} が違う`);
      if (g[0] === 'c.noneNg' && [0, 1, 2, 3, 4, 10].some(n => O(W(n)) === x)) add(L.id, where, `⑦誤答 ${x} になる目がある`); });
    return cnt;
  }
  for (const L of V2) {
    has14(L.title, L.id + '.title'); has14(L.body, L.id + '.body'); (L.hints || []).forEach((h, i) => has14(h, L.id + '.hint' + i));
    if ((L.problems || []).length !== 5) add(L.id, 0, `問題数 ${(L.problems || []).length}`);
    let prev = null;
    L.problems.forEach((q, i) => {
      const w = i + 1;
      if (q.kind === 'move') { const g = move(L, q, w, 3); if (g != null && prev != null && g > prev + 1e-9) add(L.id, w, `⑥易→難でない（差 ${g.toFixed(3)} が前の問題 ${prev.toFixed(3)} より大きい）`); if (g != null) prev = g; }
      else if (q.kind === 'choice') { has14(q.q, L.id + '#' + w + '.q'); const c = choice(L, q, w); if (prev != null && c < prev) add(L.id, w, `⑥数える数 ${c} が前の問題 ${prev} より少ない`); prev = c; }
      else add(L.id, w, 'kind');
    });
    // 追34 選ぶ問題の答えの位置がかたよらない（同じレッスンの3問以上がすべて同じ位置なら、位置で当てられる）
    { const a = L.problems.filter(q => q.kind === 'choice').map(q => q.ans); if (a.length >= 3 && new Set(a).size === 1) add(L.id, 0, `追34 選ぶ問題の答えがすべて ${a[0] + 1} 番目`); }
    (L.ramp || []).forEach((r, i) => { if (r.k === 'try' && r.kind !== 'choice') move(L, r, 'ramp' + i, 3); if (r.k === 'try' && r.kind === 'choice') choice(L, r, 'ramp' + i); if (r.k === 'explain' && r.seq && r.seq.length) move(L, Object.assign({}, r, { ok: r.seq }), 'ramp' + i, 3); });
  }
  // 追22（2D）：patolli/app-learn.js が選ぶ問題の誤答で説明（ngo）を出す
  { const src = fs.readFileSync(path.join(ROOT, 'patolli/app-learn.js'), 'utf8'); if (!/it\.ngo/.test(src)) add('2D', 0, '追22 patolli/app-learn.js が誤答の説明（ngo）を出さない'); }
  // ⑤ 全局面（問題・準備・見本・ルール説明）：駒の位置を1つずつくらべて4つ以上ちがう（出目の違いも1つ）
  const items = [];
  V2.forEach(L => { (L.problems || []).forEach((q, i) => q.s && items.push({ s: q.s, n: q.n || 0, where: L.id + '#' + (i + 1) })); (L.ramp || []).forEach((r, i) => r.s && r.kind !== 'choice' && !(r.k === 'explain' && !(r.seq && r.seq.length)) && items.push({ s: r.s, n: r.n || 0, where: L.id + '/ramp' + i })); });
  F.tourStates(ROOT).forEach((s, i) => items.push({ s, n: 0, where: 'tour:' + s.src + ':' + i }));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.where.startsWith('tour:') && b.where.startsWith('tour:')) continue;
    const t = F.tokDiff(a.s, b.s, a.n, b.n); if (t < F.MIN_TOK) add(a.where.split(/[#/]/)[0], 0, `⑤ ${a.where} と ${b.where} の駒の並びが${t}か所しかちがわない`);
  }
  return out;
};
