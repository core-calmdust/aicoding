// senet/tools/count_facts.js — 追54（2026-11-24 担当C）：数える問題の答えの内訳と「よくある数え方の誤り」の値を、盤から数える。
// fix_count_choice.js（データを作る）と tools/lesson-verify-senet.js（数え直す）が同じものを使う。
'use strict';
const E = require('../engine.js');
const W16 = [0, 4, 6, 4, 1, 1];
const S = (pos, turn = 0) => ({ rule: 'std', pos: pos.map(a => a.slice()), turn, winner: -1 });
const sq = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return { r, c: r === 1 ? 9 - k : k }; };
// 赤い印の駒（あなたの駒）が相手の次の投げで入れ替えられる：届く相手の駒の距離と通り数。前にいる相手の駒（1〜5マス先）も返す
function risk(pos, target) {
  const t = S(pos, 1), hit = [];
  for (let n = 1; n <= 5; n++) for (const m of E.legalMoves(t, n)) if (m.capture && m.to === target) hit.push({ d: n, f: m.from, w: W16[n] });
  hit.sort((a, b) => a.d - b.d);
  const m = hit.reduce((x, h) => x + h.w, 0);
  const ahead = pos[1].filter(p => p > target && p - target <= 5).map(f => ({ f, d: f - target, w: W16[f - target] }));
  return { hit, m, ahead };
}
function targetOf(q) { const mk = (q.marks || []).find(x => x.type === 'danger'); return mk ? q.s.pos[0].find(p => p <= 30 && sq(p).r === mk.r && sq(p).c === mk.c) : null; }
// 出目1：水の家に落ちない手・入れ替える手・前がふさがった駒
function wcnt(pos) {
  const ms = E.legalMoves(S(pos), 1), ok = ms.filter(m => !m.water), water = ms.find(m => m.water);
  const on = pos[0].filter(p => p <= 30), mv = new Set(ms.map(m => m.from));
  const blocked = on.filter(p => !mv.has(p)), own = new Set(pos[0]), opp = new Set(pos[1]);
  const why = p => own.has(p + 1) ? 'own' : opp.has(p + 1) && opp.has(p + 2) ? 'pair' : 'other';
  return { ok, m: ok.length, water: !!water, swaps: ok.filter(m => m.capture), blocked, blockWhy: blocked.map(why), on: on.length,
    list: ok.map(m => `${m.from}→${m.to}`).join(' · ') };
}
// 上がりまでのマス
function pips(a) {
  const on = a.filter(p => p < 31), list = on.map(p => 31 - p), m = list.reduce((x, y) => x + y, 0);
  const near = on.filter(p => p >= 26).sort((x, y) => y - x);
  return { list, m, g: a.length - on.length, k: on.length, near, minus1: m - on.length, plus1: m + on.length, zero: m - near.reduce((x, p) => x + 31 - p, 0) };
}
function lead(pos) {
  const a = pips(pos[0]).m, b = pips(pos[1]).m, on = s => pos[s].filter(p => p < 31);
  const fr = Math.max(...on(0)) - Math.max(...on(1)), bk = Math.min(...on(0)) - Math.min(...on(1));   // (>0: あなたが前)
  return { a, b, d: b - a, front: fr, back: bk };
}
// 追54・追61：その問題の「よくある数え方の誤り」をすべて並べる（key・誤った答え x・説明の値 p）。
// 選択肢の誤答は、x が答えとも、ほかの誤りとも重ならないものだけを使う（重なると、説明がもう片方の誤りの子に合わない）。
function errors(q) {
  const k = q.why[0], out = [], E1 = (key, x, p) => out.push({ key, x: String(x), p: Object.assign({ x: String(x) }, p || {}) }), fr = v => v + '/16';
  if (k === 'c.roll') { const n = q.why[1].n, m = W16[n];
    for (const w of [...new Set([1, 2, 3, 4, 5].filter(x => x !== n).map(x => W16[x]))]) E1('c.rollNg', fr(w), { v: [1, 2, 3, 4, 5].filter(x => x !== n && W16[x] === w).join(' / ') });
    if (m > 1) E1('c.oneWayNg', fr(1), { n, m });
    E1('c.halfNg', fr(8)); E1('c.notNg', fr(16 - m), { n, m }); }
  if (k === 'c.again') { E1('c.againOneNg', fr(3)); E1('c.againNo5Ng', fr(5)); E1('c.again1Ng', fr(4)); }
  if (k === 'c.risk') { const R = risk(q.s.pos, targetOf(q)), m = R.m;
    E1('c.riskSafeNg', fr(16 - m), { m });
    if (R.hit.length >= 2) { const far = R.hit[R.hit.length - 1]; E1('c.riskNearNg', fr(R.hit[0].w), { f: far.f, d: far.d }); E1('c.riskFarNg', fr(far.w)); }
    for (const a of R.ahead) E1('c.riskAheadNg', fr(m + a.w), { f: a.f });
    E1('c.riskDistNg', fr(R.hit.reduce((x, h) => x + h.d, 0)), { list: R.hit.map(h => h.d).join(' + ') });
    if (R.hit.length === 1) { const h = R.hit[0]; if (h.w > 1) E1('c.oneWayNg', fr(1), { n: h.d, m: h.w }); for (const w of [h.d - 1, h.d + 1]) if (w >= 1 && w <= 5) E1('c.riskLookNg', fr(W16[w]), { w, d: h.d }); } }
  if (k === 'c.wcnt') { const F = wcnt(q.s.pos), m = F.m;
    if (F.water) E1('c.wWaterNg', m + 1);
    if (F.blocked.length) E1('c.wBlockNg', m + F.blocked.length, { list: F.blocked.join(' · ') });
    if (F.swaps.length) E1('c.wSwapNg', m - F.swaps.length, { list: F.swaps.map(x => `${x.from}→${x.to}`).join(' · ') });
    E1('c.wAllNg', F.on); }
  if (/^c\.r?pipsG?$/.test(k)) { const sd = /^c\.rpips/.test(k) ? 1 : 0, P = pips(q.s.pos[sd]), O = pips(q.s.pos[1 - sd]);
    E1(sd ? 'c.ownSumNg' : 'c.oppSumNg', O.m);
    if (P.near.length) E1('c.zeroNg', P.zero, { sq: P.near.join(' · ') });
    E1('c.minus1Ng', P.minus1); E1('c.plus1Ng', P.plus1);
    E1('c.posNg', q.s.pos[sd].filter(p => p < 31).reduce((x, p) => x + p, 0)); }
  if (/^c\.lead2/.test(k)) { const F = lead(q.s.pos), lab = v => (v > 0 ? 'y' : 'r') + Math.abs(v);
    E1('c.sideNg', lab(-F.d), { a: F.a, b: F.b });
    if (F.front) E1('c.frontNg', lab(F.front), { a: F.a, b: F.b });
    if (F.back) E1('c.backNg', lab(F.back), { a: F.a, b: F.b }); }
  return out;
}
// 答え（誤りと同じ形の文字列）
function answerOf(q) {
  const k = q.why[0];
  if (k === 'c.roll') return W16[q.why[1].n] + '/16';
  if (k === 'c.again') return (W16[1] + W16[4] + W16[5]) + '/16';
  if (k === 'c.risk') return risk(q.s.pos, targetOf(q)).m + '/16';
  if (k === 'c.wcnt') return String(wcnt(q.s.pos).m);
  if (/^c\.r?pipsG?$/.test(k)) return String(pips(q.s.pos[/^c\.rpips/.test(k) ? 1 : 0]).m);
  if (/^c\.lead2/.test(k)) { const d = lead(q.s.pos).d; return (d > 0 ? 'y' : 'r') + Math.abs(d); }
  return null;
}
// 誤答に使える誤り：答えとも、ほかの誤りとも値が重ならない
function usable(q) { const all = errors(q), a = answerOf(q), n = x => all.filter(e => e.x === x).length; return all.filter(e => e.x !== a && n(e.x) === 1); }
module.exports = { W16, S, sq, risk, targetOf, wcnt, pips, lead, errors, answerOf, usable };
