// tools/lesson-verify-ur.js — ウルのレッスン（ur/lessons.json）の厳しい検証（2026-11-24、担当C、3D対応）。tools/lesson-verify.js ur から呼ぶ。
// 完全解析表（RoyalUr.net finkel.rgu / blitz.rgu。リポジトリには入れない）が UR_LUT_DIR（既定 /tmp/urlut）にあれば、全合法手の勝率を
// 引き直して保存値 ev と照合する（①②）。なくても ev の形・③④⑤⑥⑦⑧・選択問題の答え・追16 は表なしで確かめる。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
module.exports = function ur(opt = {}) {
  const E = require(path.join(ROOT, 'ur/engine.js')), UF = require(path.join(ROOT, 'ur/tools/ur_lessfacts.js')), F = require(path.join(ROOT, 'ur/tools/ur_facts.js'));
  const X = require(path.join(ROOT, 'ur/tools/learn_text.js'));
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'ur/lessons.json'), 'utf8'));
  const out = [], add = (step, q, msg) => out.push({ step, q, msg });
  const dir = process.env.UR_LUT_DIR || '/tmp/urlut', LUT = {};
  if (!opt.noLut) for (const r of ['finkel', 'blitz']) { const f = path.join(dir, r + '.rgu'); if (fs.existsSync(f)) LUT[r] = require(path.join(ROOT, 'ur/tools/lut.js')).open(r, f); }
  if (!opt.noLut && !LUT.finkel) console.log('(ur: 完全解析表がないので①②の勝率の引き直しは省略。UR_LUT_DIR に finkel.rgu・blitz.rgu を置くと照合する)');
  // 追16：文言に勝率・評価値を書かない（14言語）
  const BAD = /勝率|勝つ見込み|評価値|[Ww]in chance|胜率|勝算|승률|Probabilidad de ganar|Chances de gain|Chance de vitória|Gewinnchance|जीत की संभावना|فرصة الفوز|Шанс победы|Peluang menang|Kazanma şansı|\{a\}%|\{x\}%/;
  const walk = (o, where) => { if (typeof o === 'string') { if (BAD.test(o)) add(where, 0, `追16 勝率の文: ${o.slice(0, 50)}`); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], where); };
  walk(D.msg, 'msg'); walk(D.ui, 'ui'); D.steps.forEach(s => walk({ t: s.title, b: s.body, tip: s.tip, h: s.hints, r: (s.ramp || []).map(r => [r.t, r.body, r.g, r.h]) }, s.id));
  const has14 = (o, where) => { for (const l of X.LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) { add(where, 0, `14言語 ${l} がない`); return; } };
  for (const k in D.msg) has14(D.msg[k], 'msg.' + k);
  const refOk = (r, where) => { if (!r || !D.msg[r[0]]) { add(where, 0, `理由のキー ${r && r[0]} が msg にない`); return; } for (const l of X.LANGS) { const t = D.msg[r[0]][l].replace(/\{(\w+)\}/g, (_, k) => r[1] && r[1][k] != null ? '' : '§'); if (t.includes('§')) { add(where, 0, `理由 ${r[0]} の値が足りない`); return; } } };
  if (D.steps.length !== 12) add('steps', 0, `レッスン数 ${D.steps.length}`);
  const S = s => Object.assign({ winner: -1 }, s, { turn: 0 });
  // ⑤ 全局面（問題・準備・見本・ルール説明）を集める
  const items = [];
  D.steps.forEach(L => { (L.problems || []).forEach((q, i) => q.s && items.push({ s: q.s, where: L.id + '#' + (i + 1) })); (L.ramp || []).forEach((r, i) => r.s && items.push({ s: r.s, where: L.id + '/ramp' + i })); });
  UF.tourStates(ROOT).forEach((s, i) => items.push({ s, where: 'tour:' + s.src + ':' + i }));
  const THEME = { rosette: ['rosette'], center: ['center'], hold: ['hold'], enter: ['enter', 'advance'], danger: ['safe'], escape: ['escape'], capture: ['capture'], choose: ['nocap', 'capture'], goal: ['goal'], blitz: ['blitz'] };
  // 1つの手の問題（①〜④⑦⑧）
  function move(L, q, where, minMoves) {
    const s = S(q.s), ms = E.legalMoves(s, q.n);
    if (s.rule !== L.rule) add(L.id, where, `ルール ${s.rule} ≠ ${L.rule}`);
    if (ms.length < minMoves) add(L.id, where, `③合法手 ${ms.length}`);
    const ev = q.ev || [];
    if (ev.length !== ms.length || !ms.every(m => ev.some(e => e[0] === m.from && e[1] === m.to))) { add(L.id, where, '①保存値 ev が合法手と合わない'); return null; }
    for (let i = 1; i < ev.length; i++) if (ev[i][2] > ev[i - 1][2]) add(L.id, where, '①保存値 ev が勝率の順でない');
    if (LUT[s.rule]) for (const e of ev) { const v = LUT[s.rule].after(s, ms.find(m => m.from === e[0])); if (Math.abs(v - e[2]) > 6e-4) { add(L.id, where, `①保存値 ${e[0]}→${e[1]} ${e[2]} ≠ 完全解析 ${v.toFixed(4)}`); break; } }
    const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
    if (gap < UF.MIN_GAP - 1e-9) add(L.id, where, `②2番目との差 ${gap.toFixed(3)}`);
    const best = ms.find(m => m.from === ev[0][0]), ok = q.ok || (q.seq || []);
    if (ok.length !== 1 || ok[0][0] !== best.from || ok[0][1] !== best.to) add(L.id, where, `①正解 ${JSON.stringify(ok)} が最善 ${best.from}→${best.to} でない（正解は1つだけ：追3）`);
    if (q.best && (q.best[0] !== best.from || q.best[1] !== best.to)) add(L.id, where, '①best が最善でない');
    const ths = THEME[L.id] || [], th = ths.find(t => UF.themeOk(s, q.n, best, ms, t));
    if (!th) add(L.id, where, `④主題（${ths.join('/')}）の手でない`);
    if (q.why) { const w = UF.whyOf(s, q.n, best, th || ths[0]); if (q.why[0] !== w[0] || JSON.stringify(q.why[1]) !== JSON.stringify(w[1])) add(L.id, where, `⑧正解の理由 ${JSON.stringify(q.why)} ≠ 盤の事実 ${JSON.stringify(w)}`); refOk(q.why, L.id); }
    if (q.ng || q.k === 'try' || q.kind === 'move') {
      for (const m of ms) { if (m.from === best.from) continue; const k = UF.ngKey(s, q.n, best, m, th || ths[0]), got = q.ng && q.ng[m.from];
        if (!k) add(L.id, where, `⑦不正解 ${m.from}→${m.to} の理由を盤の事実で言えない`);
        else if (!got || got[0] !== k[0] || JSON.stringify(got[1]) !== JSON.stringify(k[1])) add(L.id, where, `⑦不正解 ${m.from}→${m.to} の理由 ${JSON.stringify(got)} ≠ ${JSON.stringify(k)}`);
        else refOk(got, L.id); }
    }
    // 追7：ヒントの印（にげる＝ねらわれた駒に赤い印、取る＝取る駒に赤い輪）
    const look = q.look || q.marks || [], at = (i, type) => { const c = UF.rc(s.rule, 0, i); return c && look.some(x => x.type === type && x.r === c.r && x.c === c.c); };
    if (L.id === 'escape' && !at(best.from, 'danger')) add(L.id, where, '追7 ヒントの赤い印がねらわれた駒にない');
    if (L.id === 'danger' && !look.some(x => x.type === 'danger')) add(L.id, where, '追7 ヒントの「赤い印（危険な駒）」が盤にない');
    if (L.id === 'center' && look.some(x => x.type === 'glow' && !at(8, 'glow'))) add(L.id, where, '追7 ヒントは「光る中央のマス」なのに中央以外も光る');
    if (L.id === 'center' && look.filter(x => x.type === 'glow').length !== 1) add(L.id, where, '追7 光るのは中央のロゼットだけ');
    if (best.capture && (L.id === 'capture' || L.id === 'blitz') && !at(best.to, 'ring')) add(L.id, where, '追7 ヒントの赤い輪が取る駒にない');
    return gap;
  }
  // 選択問題の答えと誤答の説明
  function choice(L, q, where) {
    const o = q.opts || [];
    if (o.length < 3 || new Set(o.map(x => JSON.stringify(x))).size !== o.length) add(L.id, where, `③選択肢 ${o.length}（重複なし3つ以上）`);
    if (!(q.ans >= 0 && q.ans < o.length)) { add(L.id, where, 'ans'); return 0; }
    const k = q.why && q.why[0], s = q.s && S(q.s);
    let right = null, cnt = 1;
    if (k === 'c.roll') { right = [1, 4, 6, 4, 1][q.why[1].n] + '/16'; }
    if (k === 'c.risk') { const t = E.clone(s); t.turn = 1; right = Math.round(Math.max(...E.hitRisk(t, 0)) * 16) + '/16'; cnt = String(q.why[1].list).split('+').length; }
    if (k === 'c.pips' || k === 'c.rpips') { const sd = k === 'c.pips' ? 0 : 1; right = String(E.raceCount(s).pips[sd]); cnt = s.pos[sd].filter(x => x >= 1 && x <= 14).length; }
    if (k === 'c.lead2y' || k === 'c.lead2r') { const r = E.raceCount(s).pips, d = r[1] - r[0]; right = (d > 0 ? 'you' : 'rival') + Math.abs(d); if ((k === 'c.lead2y') !== (d > 0)) add(L.id, where, `⑧理由 ${k} のリードの側が違う`); if (q.why[1].d !== Math.abs(d) || q.why[1].a !== r[0] || q.why[1].b !== r[1]) add(L.id, where, '⑧理由の歩数が違う'); cnt = s.pos[0].filter(x => x >= 1 && x <= 14).length + 1;
      const a = o[q.ans]; const got = (a.ja.startsWith(X.Q.you.ja) ? 'you' : 'rival') + a.ja.split('+')[1]; if (got !== right) add(L.id, where, `⑧答え ${got} ≠ ${right}`); }
    else if (right == null) add(L.id, where, `理由 ${k} の答えを確かめられない`);
    else if (String(o[q.ans]) !== right) add(L.id, where, `⑧答え ${o[q.ans]} ≠ ${right}`);
    if (q.why) refOk(q.why, L.id);
    // ⑦ 誤答それぞれに説明（数の大小が合っている）
    const ngo = q.ngo || [];
    o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i]; if (!g) { add(L.id, where, `⑦誤答 ${JSON.stringify(x)} の説明がない`); return; } refOk(g, L.id);
      if (g[0] === 'c.lowNg' || g[0] === 'c.highNg') { const v = parseInt(String(typeof x === 'object' ? x.ja.split('+')[1] : x), 10), a = parseInt(String(typeof o[q.ans] === 'object' ? o[q.ans].ja.split('+')[1] : o[q.ans]), 10); if ((g[0] === 'c.lowNg') !== (v < a)) add(L.id, where, `⑦誤答 ${v} の説明 ${g[0]} が逆`); }
      if (g[0] === 'c.rollNg' && !String(g[1].v).split(' / ').every(v => [1, 4, 6, 4, 1][+v] + '/16' === x)) add(L.id, where, `⑦誤答 ${x} の出目 ${g[1].v} が違う`); });
    return cnt;
  }
  for (const L of D.steps) {
    has14(L.title, L.id + '.title'); has14(L.body, L.id + '.body'); (L.hints || []).forEach((h, i) => has14(h, L.id + '.hint' + i));
    if ((L.problems || []).length !== 5) add(L.id, 0, `問題数 ${(L.problems || []).length}`);
    let prev = null;
    L.problems.forEach((q, i) => {
      const w = i + 1;
      if (q.kind === 'move') { const g = move(L, q, w, 3); if (g != null && prev != null && g > prev + 1e-9) add(L.id, w, `⑥易→難でない（差 ${g.toFixed(3)} が前の問題 ${prev.toFixed(3)} より大きい）`); if (g != null) prev = g; }
      else if (q.kind === 'choice') { const c = choice(L, q, w); if (prev != null && c < prev) add(L.id, w, `⑥数える数 ${c} が前の問題 ${prev} より少ない`); prev = c; }
      else add(L.id, w, 'kind');
    });
    (L.ramp || []).forEach((r, i) => { if (r.k === 'try' && r.kind !== 'choice') move(L, r, 'ramp' + i, 2); if (r.k === 'explain' && r.seq && r.seq.length) move(L, Object.assign({}, r, { ok: r.seq }), 'ramp' + i, 2); });
  }
  // ⑤ 問題どうし：駒の並び（降順）を1つずつくらべて4つ以上ちがう（出目の違いも1つ。3D の重なりの見方と同じ）
  const PS = []; D.steps.forEach(L => L.problems.forEach((q, i) => { if (q.kind === 'move') PS.push({ s: q.s, n: q.n, where: L.id + '#' + (i + 1) }); }));
  for (let i = 0; i < PS.length; i++) for (let j = i + 1; j < PS.length; j++) { const t = UF.tokDiff(PS[i].s, PS[j].s, PS[i].n, PS[j].n); if (t < UF.MIN_TOK) add(PS[i].where.split('#')[0], 0, `⑤ ${PS[i].where} と ${PS[j].where} の駒の並びが${t}か所しかちがわない`); }
  // ⑤ 重なり（駒3つ以上ちがう。見本の盤＝準備の explain は同じでよい）
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.where.startsWith('tour:') && b.where.startsWith('tour:')) continue;
    const d = F.dist(a.s, b.s); if (d < UF.MIN_DIST) add(a.where.split(/[#/]/)[0], 0, `⑤ ${a.where} と ${b.where} が駒${d}つ違いの局面`);
  }
  // 追32（2026-11-24）：「相手の次の1振りで取られる確率」は、手のあと相手が振るときだけ（ロゼット・ブリッツの取りでもう一度振るなら言えない）
  for (const L of D.steps) for (const [i, q] of (L.problems || []).concat(L.ramp || []).entries()) {
    if (q.kind === 'choice' || !q.s || q.n == null) continue;
    const s = S(q.s), ms = E.legalMoves(s, q.n), ag = m => !m || (r => r.again || r.state.turn === 0)(E.apply(s, m)), b = ms.find(m => m.from === (q.best || (q.ok || [[]])[0])[0]);
    if (q.why && ['w.safe', 'w.escape'].includes(q.why[0]) && ag(b)) add(L.id, i + 1, '追32 もう一度振る手なのに相手の次の1振りの確率を言う');
    for (const f in q.ng || {}) if (['n.risk', 'n.capRisk'].includes(q.ng[f][0]) && (ag(ms.find(x => x.from === +f)) || ag(b))) add(L.id, i + 1, `追32 ${f} はもう一度振る手なのに相手の次の1振りの確率を言う`);
  }
  return out;
};
