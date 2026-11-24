// senet/tools/fix_count_choice.js — 追54・追59（2026-11-24 担当C）：数える問題（投げ棒の確率・水の家・残りのマス）の
// 誤答を「よくある数え方の誤り」から作り直し、誤答の説明でその誤りを名指す（少なすぎ／多すぎの決まり文句・「その目はない」をやめる）。
// 答えの説明（why）は盤にある内訳だけを言い、ヒントは問題ごと（その問題の種類と盤にあることだけ）にする。
//  出目：別の目の確率（c.rollNg）・組み合わせを1通りと数える（c.oneWayNg）・棒1本の確率＝半分（c.halfNg）。
//  もう一度：どれも1通り（c.againOneNg）・5 を忘れる（c.againNo5Ng）・1 だけ（c.again1Ng）。
//  出目が出ない確率（c.notNg）。入れ替えられる確率：入れ替えられない確率（c.riskSafeNg）・近い駒だけ（c.riskNearNg）・前の相手の駒まで（c.riskAheadNg）・
//  となりの距離の目（c.riskLookNg）・距離の数字をそのまま足す（c.riskDistNg）。残りのマス：マスの番号をそのまま足す（c.posNg）も。
//  追61：誤答の値は、答えとも、ほかの誤りとも重ならないものだけ（重なると、説明がもう片方の誤りをした子に合わない）。誤りの一覧は count_facts.errors()。
//  水に落ちない手：26→27 まで（c.wWaterNg）・ふさがった駒まで（c.wBlockNg）・盤の駒全部（c.wAllNg）・入れ替えを忘れる（c.wSwapNg）。
//  残りのマス：30−位置（c.minus1Ng）・32−位置（c.plus1Ng）・もう片方の合計（c.oppSumNg / c.ownSumNg）・ゴール近くの駒を0（c.zeroNg）。
//  リード：向きが逆（c.sideNg）・先頭の駒だけ（c.frontNg）・いちばん後ろの駒だけ（c.backNg）。
// 何度流しても同じ結果（選択肢は盤から作り直す）。tools/lesson-verify.js senet が count_facts.js で数え直す。
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./count_facts.js'), T = require('./learn_text_count.js'), LANGS = require('./learn_text_exact.js').LANGS;
const FILE = path.join(__dirname, '..', 'lessons.json');
const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : `{${k}}`);
// ヒントの文（14言語）：部品をつないで1つの文にする。値は言語ごとの並べ方
const hint = (...parts) => { const o = {}; for (const l of LANGS) o[l] = parts.filter(Boolean).map(([h, v]) => fill(T.H[h][l], typeof v === 'function' ? v(l) : v || {})).join(l === 'ja' || l === 'zh' || l === 'zh-TW' ? '' : ' '); return o; };
const frac = m => m + '/16';
// 誤答：使える誤り（答えともほかの誤りとも重ならない：追61）を、並べた順に3つまで。選択肢は小さい順（リードは きみ→相手、差の小さい順）
function setOpts(q, lab) {
  const a = C.answerOf(q), errs = C.usable(q).slice(0, 3);
  if (errs.length < 2) throw new Error('fix_count_choice: too few distractors ' + JSON.stringify(q.why));
  const num = x => /^[yr]/.test(x) ? (x[0] === 'y' ? 0 : 100) + +x.slice(1) : parseInt(x, 10);
  const all = [{ x: a, g: null }, ...errs.map(e => ({ x: e.x, g: [e.key, e.key === 'c.frontNg' || e.key === 'c.backNg' || e.key === 'c.sideNg' ? { a: e.p.a, b: e.p.b } : e.p] }))].sort((u, v) => num(u.x) - num(v.x));
  q.opts = all.map(e => lab ? lab(e.x) : e.x); q.ans = all.findIndex(e => e.g === null); q.ngo = all.map(e => e.g);
}
function apply(D) {
  Object.assign(D.msg, T.MSG);
  const step = id => D.steps.find(s => s.id === id);
  // ---------- 投げ棒の確率 ----------
  for (const q of step('prob').problems) {
    const k = q.why[0];
    setOpts(q);
    if (k === 'c.roll') { const n = q.why[1].n; q.hints = [n === 5 ? hint(['roll5']) : hint(['roll1', { n }]), hint(['table'])]; }
    else if (k === 'c.again') q.hints = [hint(['again1']), hint(['table'])];
    else if (k === 'c.risk') { const R = C.risk(q.s.pos, C.targetOf(q));
      q.hints = [hint(['risk1']), hint(['risk2', l => ({ list: T.join(l, R.hit.map(h => h.d)) })], R.ahead.length ? ['ahead', { f: T.join('ja', R.ahead.map(a => a.f)) }] : null)]; }
  }
  // ---------- 水の家 ----------
  for (const q of step('water').problems) {
    if (q.why[0] === 'c.wcnt') { const W = C.wcnt(q.s.pos); setOpts(q);
      q.hints = [hint(['wcnt1']), hint(W.blockWhy.includes('own') ? ['wOwn'] : null, W.blockWhy.includes('pair') ? ['wPair'] : null, W.swaps.length ? ['wSwap'] : null)]; }
    else q.hints = [step('water').hints[0], hint(['wdest2'])];
  }
  // ---------- 残りのマス ----------
  const R = step('race');
  const pipsQ = (q, sd) => {
    const P = C.pips(q.s.pos[sd]);
    q.why = [sd ? (P.g ? 'c.rpipsG' : 'c.rpips') : (P.g ? 'c.pipsG' : 'c.pips'), Object.assign({ list: P.list.join(' + '), m: P.m }, P.g ? { g: P.g } : {})];
    setOpts(q);
    const numbered = (q.marks || []).filter(x => x.type === 'text').length === P.k;
    const nearH = P.near.length ? ['near', l => ({ sq: T.join(l, P.near), vals: T.join(l, P.near.map(p => 31 - p)) })] : null;
    return [hint([sd ? 'pipsR' : 'pipsY'], P.g ? ['off'] : null), hint(numbered ? ['marks'] : [sd ? 'pipsR' : 'pipsY'], nearH)];
  };
  const labs = R.problems.find(q => /^c\.lead2/.test(q.why[0])).opts;
  const lab = x => { const o = {}; for (const l of LANGS) o[l] = (x[0] === 'y' ? labs.find(v => v.ja.startsWith('あなた'))[l] : labs.find(v => v.ja.startsWith('相手'))[l]).replace(/\+\d+/, '+' + x.slice(1)); return o; };
  for (const q of R.problems) {
    if (/^c\.r?pips/.test(q.why[0])) { q.hints = pipsQ(q, /^c\.rpips/.test(q.why[0]) ? 1 : 0); continue; }
    const F = C.lead(q.s.pos);
    q.why = [F.d > 0 ? 'c.lead2y' : 'c.lead2r', { a: F.a, b: F.b, d: Math.abs(F.d) }];
    setOpts(q, lab);
    const anyOff = q.s.pos.some(a => a.includes(31)), near = [...new Set(q.s.pos.flat().filter(p => p >= 26 && p <= 30))].sort((a, b) => b - a);
    q.hints = [hint(['lead1'], anyOff ? ['off'] : null), hint(['lead2'], near.length ? ['near', l => ({ sq: T.join(l, near), vals: T.join(l, near.map(p => 31 - p)) })] : null)];
  }
  // 準備の「合計はいくつ？」も同じ作り（準備は1つのヒント h：盤にあることだけ）
  const rr = R.ramp.find(r => r.kind === 'choice'); pipsQ(rr, 0);
  rr.g = Object.fromEntries(LANGS.map(l => [l, fill(D.msg[rr.why[0]][l], rr.why[1])]));
  rr.h = hint(['marks'], C.pips(rr.s.pos[0]).g ? ['off'] : null);
  return D;
}
if (require.main === module) { const D = apply(JSON.parse(fs.readFileSync(FILE, 'utf8'))); fs.writeFileSync(FILE, JSON.stringify(D)); console.log('senet: 数える問題の誤答・内訳・ヒントを盤から作り直した'); }
module.exports = { apply };
