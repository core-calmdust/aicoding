// tools/lesson-verify-senet.js — セネトのレッスン（senet/lessons.json）の厳しい検証（2026-11-24、担当C、3D対応）。tools/lesson-verify.js senet から呼ぶ。
// ①② 手の問題は、その局面から到達できる全局面を senet/tools/senet_exact.c（gcc でその場でコンパイル）で解き直し、全合法手の勝率を保存値 ev と照合。
//    C の手の生成が senet/engine.js と同じことも、小さい局面で JavaScript 版（senet_exact.solveJS）と照合する。
// ③④⑤⑥⑦⑧・選択問題の答えと誤答の説明（追22）・確率の数え上げ（追23）・ヒントの印（追7）・勝率の文なし（追16）・14言語。
// opt.noExact：①の解き直しを省く（壊したデータの検出テスト用。形・順・理由は確かめる）
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
module.exports = function senet(opt = {}) {
  const E = require(path.join(ROOT, 'senet/engine.js')), F = require(path.join(ROOT, 'senet/tools/senet_lessfacts.js'));
  const X = require(path.join(ROOT, 'senet/tools/senet_exact.js')), LANGS = require(path.join(ROOT, 'senet/tools/learn_text_exact.js')).LANGS;
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'senet/lessons.json'), 'utf8'));
  const out = [], add = (step, q, msg) => out.push({ step, q, msg });
  // 追16：文言に勝率・評価値を書かない（14言語）
  const BAD = /勝率|勝つ見込み|評価値|[Ww]in chance|[Ww]in \{|胜率|勝算|승률|Ganas \{|Gain \{|Vitória \{|Sieg \{|जीत \{|الفوز \{|Победа \{|Menang \{|Kazanma %|\{a\}\s?%|\{x\}\s?%|%\{a\}|%\{x\}/;
  const walk = (o, where) => { if (typeof o === 'string') { if (BAD.test(o)) add(where, 0, `追16 勝率の文: ${o.slice(0, 50)}`); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], where); };
  // 作り直したレッスン（v2）だけが3Dの一覧に出る。まだのレッスン（前の版、理由文は 'o.' のキー）は「未」として数だけ言う
  const V2 = D.steps.filter(s => s.v2), OLDS = D.steps.filter(s => !s.v2).map(s => s.id);
  if (OLDS.length) console.log(`(senet: 作り直し前のレッスン ${OLDS.join('・')} は3Dの一覧に出さず、この検証の対象外＝進み具合表で「一部」)`);
  const refd = new Set(); const ref = r => r && refd.add(r[0]);
  V2.forEach(L => [...L.problems, ...L.ramp].forEach(q => { ref(q.why); for (const f in q.ng || {}) ref(q.ng[f]); (q.ngo || []).forEach(ref); }));
  for (const k of Object.keys(D.msg)) if (!k.startsWith('o.') && !refd.has(k) && !/^c\.|^w\.|^n\./.test(k)) add('msg', 0, `使っていないキー ${k}`);
  for (const k of refd) if (k.startsWith('o.')) add('msg', 0, `作り直したレッスンが前の版の理由 ${k} を使っている`);
  walk(Object.fromEntries(Object.entries(D.msg).filter(([k]) => !k.startsWith('o.'))), 'msg'); V2.forEach(s => walk({ t: s.title, b: s.body, tip: s.tip, h: s.hints, r: (s.ramp || []).map(r => [r.t, r.body, r.g, r.h]) }, s.id));
  const has14 = (o, where) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) { add(where, 0, `14言語 ${l} がない`); return; } };
  for (const k in D.msg) if (!k.startsWith('o.')) has14(D.msg[k], 'msg.' + k);
  const refOk = (r, where) => { if (!r || !D.msg[r[0]]) { add(where, 0, `理由のキー ${r && r[0]} が msg にない`); return; } for (const l of LANGS) { const t = D.msg[r[0]][l].replace(/\{(\w+)\}/g, (_, k) => r[1] && r[1][k] != null ? '' : '§'); if (t.includes('§')) { add(where, 0, `理由 ${r[0]} の値が足りない（${l}）`); return; } } };
  const ORDER = ['prob', 'swap', 'pair', 'escape', 'safe', 'beauty', 'water', 'exit', 'race'];
  if (D.steps.map(s => s.id).join() !== ORDER.join()) add('steps', 0, `レッスンの並び ${D.steps.map(s => s.id).join()}`);
  const S = s => ({ rule: 'std', pos: s.pos.map(a => a.slice()), turn: 0, winner: -1 });
  const mvTo = m => m.finish ? 31 : m.water ? m.dest : m.to;
  // ① 厳密な勝率の解き直し（全部の手の問題を1回の C の実行で）
  const exact = new Map();
  if (!opt.noExact) {
    const jobs = [];
    V2.forEach(L => [...(L.problems || []), ...(L.ramp || [])].forEach(q => { if (q.s && q.n && (q.kind === 'move' || q.k === 'try' && q.kind !== 'choice' || q.k === 'explain' && q.seq && q.seq.length)) jobs.push({ seed: S(q.s), qs: [{ s: S(q.s), n: q.n }], q }); }));
    X.run(jobs); jobs.forEach(j => exact.set(JSON.stringify([j.q.s.pos, j.q.n]), j.qs[0].r));
    // C と senet/engine.js の一致：小さい局面を JavaScript でも解いて全合法手の勝率をくらべる
    let checked = 0;
    for (const j of jobs) { if (j.size > 60000 || checked >= 3) continue; const J = X.solveJS(S(j.q.s)); if (!J) continue; checked++;
      for (const m of E.legalMoves(S(j.q.s), j.q.n)) { const a = J.after(S(j.q.s), m, j.q.n), b = j.qs[0].r.mv[m.from]; if (Math.abs(a - b) > 1e-6) add('exact', 0, `C と JS の勝率がちがう ${a} ≠ ${b}`); } }
    if (!checked) console.log('(senet: C と JS の照合に使える小さい局面がない)');
  }
  const THEME = { swap: 'swap', pair: 'pair', escape: 'escape', safe: 'safe', beauty: 'beauty', water: 'water', exit: 'exit' };
  function move(L, q, where, minMoves) {
    const s = S(q.s), ms = E.legalMoves(s, q.n), th = THEME[L.id];
    if (ms.length < minMoves) add(L.id, where, `③合法手 ${ms.length}`);
    const ev = q.ev || [];
    if (ev.length !== ms.length || !ms.every(m => ev.some(e => e[0] === m.from && e[1] === mvTo(m)))) { add(L.id, where, '①保存値 ev が合法手と合わない'); return null; }
    for (let i = 1; i < ev.length; i++) if (ev[i][2] > ev[i - 1][2]) add(L.id, where, '①保存値 ev が勝率の順でない');
    const r = exact.get(JSON.stringify([q.s.pos, q.n]));
    if (!opt.noExact) { if (!r) add(L.id, where, '①厳密な勝率を解けない'); else for (const e of ev) { const v = r.mv[e[0]]; if (v == null || Math.abs(v - e[2]) > 6e-4) { add(L.id, where, `①保存値 ${e[0]}→${e[1]} ${e[2]} ≠ 厳密 ${v}`); break; } } }
    const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
    if (gap < F.MIN_GAP - 1e-9) add(L.id, where, `②2番目との差 ${gap.toFixed(3)}`);
    if (ev[0][2] < 0.03 || ev[0][2] > 0.97) add(L.id, where, '②もう決着している局面');
    const best = ms.find(m => m.from === ev[0][0]), ok = q.ok || q.seq || [];
    if (ok.length !== 1 || ok[0][0] !== best.from || ok[0][1] !== mvTo(best)) add(L.id, where, `①正解 ${JSON.stringify(ok)} が最善 ${best.from}→${mvTo(best)} でない（正解は1つだけ：追3）`);
    if (q.best && (q.best[0] !== best.from || q.best[1] !== mvTo(best))) add(L.id, where, '①best が最善でない');
    if (!F.themeOk(s, q.n, best, ms, th)) add(L.id, where, `④主題（${th}）の手でない`);
    // 追36：正解の理由がそのレッスンの主題の理由（ほかのレッスンの主題＝入れ替え・上がりなどの理由で正解になっていない）
    const WHYK = { swap: ['w.swap'], pair: ['w.pair', 'w.wall'], escape: ['w.escape', 'w.escape0'], safe: ['w.safe', 'w.safe0'], beauty: ['w.beauty'], water: ['w.water'], exit: ['w.home'] };
    if (q.why && WHYK[L.id] && !WHYK[L.id].includes(q.why[0])) add(L.id, where, `追36 正解の理由 ${q.why[0]} がこのレッスン（${L.id}）の主題の理由でない`);
    if (q.why) { const w = F.whyOf(s, q.n, best, th); if (q.why[0] !== w[0] || JSON.stringify(q.why[1]) !== JSON.stringify(w[1])) add(L.id, where, `⑧正解の理由 ${JSON.stringify(q.why)} ≠ 盤の事実 ${JSON.stringify(w)}`); refOk(q.why, L.id); }
    else add(L.id, where, '⑧正解の理由がない');
    if (q.kind === 'move' || q.k === 'try') for (const m of ms) { if (m.from === best.from) continue; const k = F.ngKey(s, q.n, best, m), got = q.ng && q.ng[m.from];
      if (!k) add(L.id, where, `⑦不正解 ${m.from}→${mvTo(m)} の理由を盤の事実で言えない`);
      else if (!got || got[0] !== k[0] || JSON.stringify(got[1]) !== JSON.stringify(k[1])) add(L.id, where, `⑦不正解 ${m.from}→${mvTo(m)} の理由 ${JSON.stringify(got)} ≠ ${JSON.stringify(k)}`);
      else refOk(got, L.id); }
    // 追7・追23：ヒントの印（入れ替えられる駒の赤い印と通り数、美の家・水の家・出口の光、入れ替える相手の駒の輪）
    if (q.kind === 'move' || q.k === 'try') { const want = JSON.stringify(F.lookMarks(s, q.n, best, th)); if (JSON.stringify(q.look || []) !== want) add(L.id, where, `追7 ヒントの印が盤の事実と合わない`); }
    return gap;
  }
  function choice(L, q, where) {
    const o = q.opts || [];
    if (o.length < 3 || new Set(o.map(x => JSON.stringify(x))).size !== o.length) add(L.id, where, `③選択肢 ${o.length}（重複なし3つ以上）`);
    if (!(q.ans >= 0 && q.ans < o.length)) { add(L.id, where, 'ans'); return 0; }
    const k = q.why && q.why[0], s = q.s && S(q.s), W = F.W16;
    let right = null, cnt = 1;
    if (k === 'c.roll') right = W[q.why[1].n] + '/16';
    if (k === 'c.again') right = (W[1] + W[4] + W[5]) + '/16';
    if (k === 'c.risk') { const mk = (q.marks || []).find(x => x.type === 'danger'), i = s.pos[0].findIndex(p => F.sq(p).r === mk.r && F.sq(p).c === mk.c); right = Math.round(E.hitRisk(s, 0)[i] * 16) + '/16'; cnt = 1 + String(q.why[1].list).split('+').length;
      if (+right.split('/')[0] !== q.why[1].m) add(L.id, where, '追23 理由の通り数が数え上げと合わない'); }
    if (k === 'c.pips' || k === 'c.rpips') { const sd = k === 'c.pips' ? 0 : 1; right = String(F.pipsOf(s.pos[sd])); cnt = s.pos[sd].filter(x => x < 31).length; }
    // 水の家（2026-11-24 担当C）：落ちた駒の戻り先（15 から手前の最初の空きマス）と、出目1で水の家に落ちない手の数を engine.js で数え直す
    if (k === 'c.wdest' || k === 'c.wdest1' || k === 'c.wdest15') { const bd = E.board(s), wm = E.legalMoves(Object.assign(S(q.s), { winner: -1 }), 1).find(m => m.water);
      if (!wm) { add(L.id, where, '⑧26の駒が1で水の家に落ちる局面でない'); return 0; }
      const d = wm.dest; right = String(d); cnt = 15 - d + 1;
      if (q.why[1].d !== d || (k === 'c.wdest15') !== (d === 15) || (k === 'c.wdest1') !== (d === 14) || (k === 'c.wdest' && (d > 13 || q.why[1].e !== d + 1))) add(L.id, where, `⑧理由の戻り先 ${JSON.stringify(q.why[1])} ≠ ${d}`);
      for (let x = d + 1; x <= 15; x++) if (bd[x] < 0) add(L.id, where, `⑧${x} が空いているのに戻り先が ${d}`);
      o.forEach((x, i) => { if (i === q.ans) return; const g = (q.ngo || [])[i], v = +x; if (!g) return;
        const want = v === 27 ? 'c.w27Ng' : v > d && v <= 15 && bd[v] >= 0 ? 'c.wOccNg' : v < d ? 'c.wPastNg' : null;
        if (g[0] !== want || (want === 'c.wPastNg' && g[1].d !== d)) add(L.id, where, `⑦誤答 ${x} の説明 ${g[0]} が盤の事実（${want}）と合わない`); }); }
    if (k === 'c.wcnt') { const ms = E.legalMoves(Object.assign(S(q.s), { winner: -1 }), 1), ok = ms.filter(m => !m.water);
      if (!ms.some(m => m.water)) add(L.id, where, '⑧26の駒が1で水の家に落ちる局面でない');
      right = String(ok.length); cnt = s.pos[0].filter(x => x < 31).length;
      if (q.why[1].m !== ok.length || q.why[1].list !== ok.map(m => `${m.from}→${m.to}`).join(' · ')) add(L.id, where, `⑧理由の手 ${q.why[1].list} が盤の事実と合わない`);
      if (s.pos[0].filter(x => x < 26).length - ok.length < 1) add(L.id, where, '④1で動けない駒がない（数えるだけで考えるところがない）'); }
    if (k === 'c.most') { right = String([1, 2, 3, 4, 5].reduce((a, b) => W[b] > W[a] ? b : a)); o.forEach((x, i) => { const g = (q.ngo || [])[i]; if (i !== q.ans && g && (g[0] !== 'c.mostNg' || g[1].m !== W[+x])) add(L.id, where, `⑦誤答 ${x} の通り数 ${g[1] && g[1].m} ≠ ${W[+x]}`); }); }
    if (k === 'c.lead2y' || k === 'c.lead2r') { const a = F.pipsOf(s.pos[0]), b = F.pipsOf(s.pos[1]), d = b - a; right = (d > 0 ? 'you' : 'rival') + Math.abs(d); if ((k === 'c.lead2y') !== (d > 0)) add(L.id, where, `⑧理由 ${k} のリードの側が違う`); if (q.why[1].d !== Math.abs(d) || q.why[1].a !== a || q.why[1].b !== b) add(L.id, where, '⑧理由のマス数が違う'); cnt = s.pos[0].filter(x => x < 31).length + 1;
      const x = o[q.ans], got = (x.ja.startsWith('あなた') ? 'you' : 'rival') + x.ja.split('+')[1]; if (got !== right) add(L.id, where, `⑧答え ${got} ≠ ${right}`); }
    else if (right == null) add(L.id, where, `理由 ${k} の答えを確かめられない`);
    else if (String(o[q.ans]) !== right) add(L.id, where, `⑧答え ${o[q.ans]} ≠ ${right}`);
    if (q.why) refOk(q.why, L.id);
    const ngo = q.ngo || [];
    o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i]; if (!g) { add(L.id, where, `⑦誤答 ${JSON.stringify(x)} の説明がない（追22）`); return; } refOk(g, L.id);
      const num = y => parseInt(String(typeof y === 'object' ? y.ja.split('+')[1] : y), 10);
      if (g[0] === 'c.lowNg' || g[0] === 'c.highNg') { if ((g[0] === 'c.lowNg') !== (num(x) < num(o[q.ans]))) add(L.id, where, `⑦誤答 ${num(x)} の説明 ${g[0]} が逆`); }
      if (g[0] === 'c.rollNg' && !String(g[1].v).split(' / ').every(v => W[+v] + '/16' === x)) add(L.id, where, `⑦誤答 ${x} の出目 ${g[1].v} が違う`);
      if (g[0] === 'c.roll8Ng' && [1, 2, 3, 4, 5].some(v => W[v] + '/16' === x)) add(L.id, where, `⑦誤答 ${x} になる目がある`); });
    return cnt;
  }
  for (const L of V2) {
    has14(L.title, L.id + '.title'); has14(L.body, L.id + '.body'); (L.hints || []).forEach((h, i) => has14(h, L.id + '.hint' + i));
    if ((L.problems || []).length !== 5) add(L.id, 0, `問題数 ${(L.problems || []).length}`);
    { const ch = L.problems.filter(q => q.kind === 'choice'); if (ch.length >= 3 && new Set(ch.map(q => q.ans)).size < 2) add(L.id, 0, `追40 選ぶ問題の答えの位置がすべて ${ch[0].ans + 1} 番目`); }
    let prev = null;
    L.problems.forEach((q, i) => {
      const w = i + 1;
      if (q.kind === 'move') { const g = move(L, q, w, 3); if (g != null && prev != null && g > prev + 1e-9) add(L.id, w, `⑥易→難でない（差 ${g.toFixed(3)} が前の問題 ${prev.toFixed(3)} より大きい）`); if (g != null) prev = g; }
      else if (q.kind === 'choice') { const c = choice(L, q, w); if (prev != null && c < prev) add(L.id, w, `⑥数える数 ${c} が前の問題 ${prev} より少ない`); prev = c; }
      else add(L.id, w, 'kind');
    });
    (L.ramp || []).forEach((r, i) => { if (r.k === 'try' && r.kind !== 'choice') move(L, r, 'ramp' + i, 2); if (r.k === 'try' && r.kind === 'choice') { if (!r.why || !r.ngo) add(L.id, 'ramp' + i, '追43 準備の選ぶ問題に答えの理由（why）か誤答の説明（ngo）がない'); else choice(L, r, 'ramp' + i); } if (r.k === 'explain' && r.seq && r.seq.length) move(L, Object.assign({}, r, { ok: r.seq }), 'ramp' + i, 3); });
  }
  // 追28：準備に選択問題があるゲームの2D（senet・ur の app-learn.js）は、選択肢の描画を本番の問題だけに絞らない
  for (const g of ['senet', 'ur']) { const L = JSON.parse(fs.readFileSync(path.join(ROOT, g, 'lessons.json'), 'utf8')); if (!L.steps.some(x => (x.ramp || []).some(r => r.kind === 'choice'))) continue;
    const src = fs.readFileSync(path.join(ROOT, g, 'app-learn.js'), 'utf8'); if (/!ramp && it\.kind === 'choice'/.test(src) || !/if \(it\.kind === 'choice'\)/.test(src)) add('2D', 0, `追28 ${g}/app-learn.js が準備の選択問題のボタンを出さない`); }
  // ⑤ 全局面（問題・準備・見本・ルール説明）：駒の並びを1つずつくらべて4つ以上ちがう（出目の違いも1つ）。見本の盤＝準備の explain は同じでよい
  const items = [];
  V2.forEach(L => { (L.problems || []).forEach((q, i) => q.s && items.push({ s: q.s, n: q.n || 0, where: L.id + '#' + (i + 1) })); (L.ramp || []).forEach((r, i) => r.s && items.push({ s: r.s, n: r.n || 0, where: L.id + '/ramp' + i })); });
  F.tourStates(ROOT).forEach((s, i) => items.push({ s, n: 0, where: 'tour:' + s.src + ':' + i }));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.where.startsWith('tour:') && b.where.startsWith('tour:')) continue;
    const t = F.tokDiff(a.s, b.s, a.n, b.n); if (t < F.MIN_TOK) add(a.where.split(/[#/]/)[0], 0, `⑤ ${a.where} と ${b.where} の駒の並びが${t}か所しかちがわない`);
  }
  return out;
};
