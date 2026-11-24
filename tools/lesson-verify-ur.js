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
    // 追47（2026-11-24）：準備の「いちばん出やすい出目は？」— 16通りの数え上げで最大の目、誤答は c.mostNg でその目の通り数
    if (k === 'c.most') { const W = [1, 4, 6, 4, 1]; right = String(W.indexOf(Math.max(...W))); o.forEach((x, i) => { const g = (q.ngo || [])[i]; if (i !== q.ans && g && (g[0] !== 'c.mostNg' || g[1].m !== W[+x])) add(L.id, where, `⑦誤答 ${x} の説明 ${JSON.stringify(g)} が通り数 ${W[+x]} と合わない`); }); }
    if (k === 'c.risk') { const t = E.clone(s); t.turn = 1; right = Math.round(Math.max(...E.hitRisk(t, 0)) * 16) + '/16'; cnt = String(q.why[1].list).split('+').length; }
    if (k === 'c.pips' || k === 'c.rpips') add(L.id, where, `追54 残り歩数の説明 ${k} は内訳（入っていない駒・ゴールした駒）を盤に合わせていない（c.pipsB/BO/BG/BOG）`);
    if (/^c\.pipsB(O?)(G?)$/.test(k)) { const sd = q.why[1].r ? 1 : 0; right = String(E.raceCount(s).pips[sd]); cnt = s.pos[sd].filter(x => x >= 1 && x <= 14).length; }
    if (k === 'c.lead2y' || k === 'c.lead2r') { const r = E.raceCount(s).pips, d = r[1] - r[0]; right = (d > 0 ? 'you' : 'rival') + Math.abs(d); if ((k === 'c.lead2y') !== (d > 0)) add(L.id, where, `⑧理由 ${k} のリードの側が違う`); if (q.why[1].d !== Math.abs(d) || q.why[1].a !== r[0] || q.why[1].b !== r[1]) add(L.id, where, '⑧理由の歩数が違う'); cnt = s.pos[0].filter(x => x >= 1 && x <= 14).length + 1;
      const a = o[q.ans]; const got = (a.ja.startsWith(X.Q.you.ja) ? 'you' : 'rival') + a.ja.split('+')[1]; if (got !== right) add(L.id, where, `⑧答え ${got} ≠ ${right}`); }
    else if (right == null) add(L.id, where, `理由 ${k} の答えを確かめられない`);
    else if (String(o[q.ans]) !== right) add(L.id, where, `⑧答え ${o[q.ans]} ≠ ${right}`);
    if (q.why) refOk(q.why, L.id);
    // 追54（2026-11-24）：答えの内訳と誤答の数字を盤で数え直す。誤答はよくある数え方の誤りから作り、説明がその誤りを名指す
    count54(L, q, where, s, k);
    // ⑦ 誤答それぞれに説明（数の大小が合っている）
    const ngo = q.ngo || [];
    o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i]; if (!g) { add(L.id, where, `⑦誤答 ${JSON.stringify(x)} の説明がない`); return; } refOk(g, L.id);
      if (g[0] === 'c.lowNg' || g[0] === 'c.highNg') { const v = parseInt(String(typeof x === 'object' ? x.ja.split('+')[1] : x), 10), a = parseInt(String(typeof o[q.ans] === 'object' ? o[q.ans].ja.split('+')[1] : o[q.ans]), 10); if ((g[0] === 'c.lowNg') !== (v < a)) add(L.id, where, `⑦誤答 ${v} の説明 ${g[0]} が逆`); }
      if (g[0] === 'c.rollNg' && !String(g[1].v).split(' / ').every(v => [1, 4, 6, 4, 1][+v] + '/16' === x)) add(L.id, where, `⑦誤答 ${x} の出目 ${g[1].v} が違う`); });
    return cnt;
  }
  // 追54：数える問題の内訳と誤答（このツールの中で盤から数え直す。fix_count_choice.js の数え方は使わない）
  const P16 = [0, 4, 6, 4, 1], W16 = [1, 4, 6, 4, 1];
  const num = x => parseInt(String(typeof x === 'object' ? x.ja.split('+')[1] : x), 10);
  const sideOf = x => typeof x === 'object' ? (x.ja.startsWith(X.Q.you.ja) ? 0 : 1) : null;
  const posM = C => C.m - C.on.reduce((y, p) => y + 15 - p, 0) + C.on.reduce((y, p) => y + p, 0);
  const cnt3 = a => ({ on: a.filter(x => x >= 1 && x <= 14), k0: a.filter(x => x === 0).length, kG: a.filter(x => x === 15).length, m: a.reduce((t, p) => t + 15 - p, 0) });
  function count54(L, q, where, s, k) {
    const o = q.opts || [], ngo = q.ngo || [], bad = (i, msg) => add(L.id, where, `追54 誤答 ${JSON.stringify(typeof o[i] === 'object' ? o[i].ja : o[i])}: ${msg}`);
    // 追64：その問題のよくある誤りの一覧（説明のないものも含む）で、誤答の値になる誤りがちょうど1つか
    const only64 = (all, valOf) => o.forEach((x, i) => { if (i === q.ans) return; const v = valOf(x), hit = all.filter(e => e[1] === v);
      if (hit.length !== 1) add(L.id, where, `追64 誤答 ${JSON.stringify(typeof x === 'object' ? x.ja : x)} になる誤りが${hit.length}つ（${hit.map(e => e[0]).join('・')}）`);
      else if ((ngo[i] || [])[0] !== hit[0][0]) add(L.id, where, `追64 誤答 ${JSON.stringify(typeof x === 'object' ? x.ja : x)} の説明 ${(ngo[i] || [])[0]} が、その値になる誤り ${hit[0][0]} と違う`); });
    o.forEach((x, i) => { const g = ngo[i]; if (i !== q.ans && g && ['c.lowNg', 'c.highNg', 'c.roll8Ng'].includes(g[0])) bad(i, `説明 ${g[0]} が数え方の誤りを名指さない（少なすぎ・多すぎ・ない目の決まり文句）`); });
    const hint = (q.hints || [])[0] || q.h, hj = hint && hint.ja || '';
    if (k === 'c.roll') { const n = q.why[1].n, m = W16[n];
      if (!q.hints || !q.hints[1] || !q.hints[1].ja.includes(String(n))) add(L.id, where, '追54 出目の問題のヒントがその目の数え方を言わない');
      o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i] || [], v = parseInt(x, 10);
        if (g[0] === 'c.oneWayNg' && !(v === 1 && m > 1 && g[1].n === n && g[1].m === m)) bad(i, '「1通りと数える」の数が合わない');
        if (g[0] === 'c.halfNg' && !(v === 8 && g[1].n === n && g[1].m === m)) bad(i, '「印1個の確率（半分）」の数が合わない');
        if (g[0] === 'c.rollNg' && !String(g[1].v).split(' / ').every(r => W16[+r] === v && +r !== n)) bad(i, '別の目の確率の目が合わない');
        if (g[0] === 'c.notNg' && !(v === 16 - m && g[1].n === n && g[1].m === m)) bad(i, '「出ない確率」の数が合わない');
        if (!['c.oneWayNg', 'c.halfNg', 'c.rollNg', 'c.notNg'].includes(g[0])) bad(i, `説明 ${g[0]} は出目の確率の数え方の誤りでない`); });
      const all = [['c.halfNg', 8], ['c.notNg', 16 - m]]; if (m > 1) all.push(['c.oneWayNg', 1]);
      for (const w of new Set(W16)) if (w !== m) all.push(['c.rollNg', w]);
      only64(all, x => parseInt(x, 10));
      return; }
    if (k === 'c.risk') {
      const dm = (q.marks || []).find(x => x.type === 'danger'); let p = null; for (let i = 1; i <= 14; i++) { const c = UF.rc('finkel', 0, i); if (dm && c && c.r === dm.r && c.c === dm.c) p = i; }
      if (p == null) { add(L.id, where, '追54 印の駒がない'); return; }
      // 相手の駒ごとに、何の目でこの駒を取るか（相手の合法手で数え直す）
      const t = E.clone(s); t.turn = 1; const att = [];
      for (let n = 1; n <= 4; n++) for (const mv of E.legalMoves(t, n)) if (mv.capture && mv.to === p && mv.from >= 1) att.push({ q: mv.from, d: n });
      att.sort((a, b) => a.d - b.d); const m = att.reduce((x, a) => x + P16[a.d], 0);
      const list = att.map(a => `${a.d}→${P16[a.d]}/16`).join(' + ');
      if (q.why[1].list !== list) add(L.id, where, `追54 答えの内訳 ${q.why[1].list} ≠ 盤 ${list}`);
      const dist = (q.marks || []).filter(x => x.type === 'text').map(x => x.text).sort().join(), want = att.map(a => String(a.d)).sort().join();
      if (dist !== want) add(L.id, where, `追54 距離の数字の印 ${dist} ≠ 届く駒 ${want}`);
      const ahead = s.pos[1].filter(r => r > p && r <= 12 && r - p <= 4 && p >= 5);
      o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i] || [], v = parseInt(x, 10);
        if (g[0] === 'c.nearNg') { if (att.length < 2 || v !== P16[att[0].d] || g[1].d !== att.slice(1).map(a => a.d).join('・')) bad(i, '「いちばん近い駒だけ」が盤と合わない（2つ以上の駒・数・距離）'); }
        else if (g[0] === 'c.aheadNg') { if (!ahead.length || v !== m + ahead.reduce((y, r) => y + P16[r - p], 0) || g[1].d !== ahead.map(r => r - p).join('・')) bad(i, '「前の相手の駒まで数える」が盤と合わない'); }
        else if (g[0] === 'c.privNg') { const pv = att.filter(a => a.q <= 4); if (!pv.length || v !== m - pv.reduce((y, a) => y + P16[a.d], 0)) bad(i, '「相手の手前の列の駒を忘れる」が盤と合わない'); }
        else if (g[0] === 'c.safeNg') { if (v !== 16 - m || g[1].m !== m) bad(i, '「取られない確率」の数が合わない'); }
        else if (g[0] === 'c.farNg') { const f = att[att.length - 1]; if (att.length < 2 || v !== P16[f.d] || g[1].d !== f.d || g[1].e !== att.slice(0, -1).map(a => a.d).join('・')) bad(i, '「遠い駒だけ」が盤と合わない'); }
        else if (g[0] === 'c.distNg') { if (v !== att.reduce((y, a) => y + a.d, 0) || g[1].list !== att.map(a => a.d).join(' + ')) bad(i, '「距離をそのまま通り数に」が盤と合わない'); }
        else bad(i, `説明 ${g[0]} は取られる確率の数え方の誤りでない`); });
      const all = [['c.distNg', att.reduce((y, a) => y + a.d, 0)]]; if (m) all.push(['c.safeNg', 16 - m]);
      if (att.length >= 2) all.push(['c.nearNg', P16[att[0].d]], ['c.farNg', P16[att[att.length - 1].d]]);
      if (ahead.length) all.push(['c.aheadNg', m + ahead.reduce((y, r) => y + P16[r - p], 0)]);
      const pv0 = att.filter(a => a.q <= 4); if (pv0.length) all.push(['c.privNg', m - pv0.reduce((y, a) => y + P16[a.d], 0)]);
      if (att.length === 1) { const d = att[0].d; if (P16[d] > 1) all.push(['1通り', 1]); for (const w of [d - 1, d + 1]) if (w >= 1 && w <= 4) all.push(['となりの目' + w, P16[w]]); }
      only64(all.filter(e => e[1] !== m), x => parseInt(x, 10));
      return; }
    if (/^c\.pipsB/.test(k)) { const sd = q.why[1].r ? 1 : 0, C = cnt3(s.pos[sd]);
      const key = 'c.pipsB' + (C.k0 ? 'O' : '') + (C.kG ? 'G' : ''); if (k !== key) add(L.id, where, `追54 説明 ${k} の内訳が盤（入っていない駒 ${C.k0}・ゴール ${C.kG}）と合わない → ${key}`);
      const list = C.on.map(p => 15 - p).concat(C.k0 ? ['15×' + C.k0] : []).join(' + '); if (q.why[1].list !== list || q.why[1].m !== C.m) add(L.id, where, `追54 内訳 ${q.why[1].list}=${q.why[1].m} ≠ 盤 ${list}=${C.m}`);
      if ((C.k0 > 0) !== /入っていない/.test(hj) || (C.kG > 0) !== /ゴール/.test(hj)) add(L.id, where, `追54 ヒント「${hj}」の内訳が盤と合わない`);
      o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i] || [], v = +x, ok = {
        'c.offNg': C.k0 && v === C.m - 15 * C.k0, 'c.goalNg': C.kG && v === C.m + 15 * C.kG, 'c.offOnceNg': C.k0 >= 2 && v === C.m - 15 * (C.k0 - 1), 'c.off14Ng': C.k0 && v === C.m - C.k0,
        'c.minus1Ng': C.on.length && v === C.m - C.on.length, 'c.posNg': C.on.length && v === C.m - C.on.reduce((y, p) => y + 15 - p, 0) + C.on.reduce((y, p) => y + p, 0) }[g[0]];
        if (!ok) bad(i, `説明 ${g[0]} の誤りでは ${v} にならない（盤：入っていない駒 ${C.k0}・ゴール ${C.kG}）`);
        if (ok && ['c.offNg', 'c.offOnceNg', 'c.off14Ng'].includes(g[0]) && g[1].k !== C.k0) bad(i, '入っていない駒の数が違う'); if (ok && g[0] === 'c.goalNg' && g[1].k !== C.kG) bad(i, 'ゴールした駒の数が違う'); });
      const all = [], on = C.on.length, P = C.on.reduce((y, p) => y + p, 0), R = C.on.reduce((y, p) => y + 15 - p, 0);
      if (C.k0) all.push(['c.offNg', C.m - 15 * C.k0], ['c.off14Ng', C.m - C.k0]); if (C.k0 >= 2) all.push(['c.offOnceNg', C.m - 15 * (C.k0 - 1)]);
      if (C.kG) all.push(['c.goalNg', C.m + 15 * C.kG]);
      if (on) all.push(['c.minus1Ng', C.m - on], ['c.posNg', C.m - R + P], ['16−位置', C.m + on]);
      all.push(['相手の合計', cnt3(s.pos[1 - sd]).m]);
      only64(all.filter(e => e[1] !== C.m), x => +x);
      return; }
    if (k === 'c.lead2y' || k === 'c.lead2r') { const A = cnt3(s.pos[0]), B = cnt3(s.pos[1]), res = (fa, fb) => fb - fa ? [fb - fa > 0 ? 0 : 1, Math.abs(fb - fa)] : null, ans = res(A.m, B.m);
      if ((A.k0 + B.k0 > 0) !== /入っていない/.test(hj) || (A.kG + B.kG > 0) !== /ゴール/.test(hj)) add(L.id, where, `追54 ヒント「${hj}」の内訳が盤と合わない`);
      o.forEach((x, i) => { if (i === q.ans) return; const g = ngo[i] || [], got = [sideOf(x), num(x)], want = {
        'c.sideNg': [1 - ans[0], ans[1]], 'c.leadOffNg': A.k0 + B.k0 ? res(A.m - 15 * A.k0, B.m - 15 * B.k0) : null, 'c.leadGoalNg': A.kG + B.kG ? res(A.m + 15 * A.kG, B.m + 15 * B.kG) : null, 'c.leadOff14Ng': A.k0 !== B.k0 ? res(A.m - A.k0, B.m - B.k0) : null, 'c.leadPosNg': res(posM(A), posM(B)) }[g[0]];
        if (!want || want[0] !== got[0] || want[1] !== got[1]) bad(i, `説明 ${g[0]} の誤りでは ${JSON.stringify(got)} にならない`);
        if (g[1] && g[1].a != null && (g[1].a !== A.m || g[1].b !== B.m)) bad(i, '説明の残り歩数が盤と合わない'); });
      const key = r => r && r.join(':'), all = [['c.sideNg', key([1 - ans[0], ans[1]])], ['c.leadPosNg', key(res(posM(A), posM(B)))], ['14−位置', key(res(A.m - A.on.length, B.m - B.on.length))]];
      if (A.k0 + B.k0) all.push(['c.leadOffNg', key(res(A.m - 15 * A.k0, B.m - 15 * B.k0))]); if (A.kG + B.kG) all.push(['c.leadGoalNg', key(res(A.m + 15 * A.kG, B.m + 15 * B.kG))]);
      if (A.k0 !== B.k0) all.push(['c.leadOff14Ng', key(res(A.m - A.k0, B.m - B.k0))]);
      only64(all.filter(e => e[1] && e[1] !== key(ans)), x => key([sideOf(x), num(x)]));
      return; }
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
    (L.ramp || []).forEach((r, i) => { if (r.k === 'try' && r.kind !== 'choice') move(L, r, 'ramp' + i, 2); if (r.k === 'try' && r.kind === 'choice') { if (!r.why || !r.ngo) add(L.id, 'ramp' + i, '追47 準備の選ぶ問題に答えの理由（why）か誤答の説明（ngo）がない'); else choice(L, r, 'ramp' + i); } if (r.k === 'explain' && r.seq && r.seq.length) move(L, Object.assign({}, r, { ok: r.seq }), 'ramp' + i, 2); });
  }
  // ⑤ 問題どうし：駒の並び（降順）を1つずつくらべて4つ以上ちがう（出目の違いも1つ。3D の重なりの見方と同じ）
  const PS = []; D.steps.forEach(L => L.problems.forEach((q, i) => { if (q.kind === 'move') PS.push({ s: q.s, n: q.n, where: L.id + '#' + (i + 1) }); }));
  for (let i = 0; i < PS.length; i++) for (let j = i + 1; j < PS.length; j++) { const t = UF.tokDiff(PS[i].s, PS[j].s, PS[i].n, PS[j].n); if (t < UF.MIN_TOK) add(PS[i].where.split('#')[0], 0, `⑤ ${PS[i].where} と ${PS[j].where} の駒の並びが${t}か所しかちがわない`); }
  // ⑤ 重なり（駒3つ以上ちがう。見本の盤＝準備の explain は同じでよい）
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.where.startsWith('tour:') && b.where.startsWith('tour:')) continue;
    const d = F.dist(a.s, b.s); if (d < UF.MIN_DIST) add(a.where.split(/[#/]/)[0], 0, `⑤ ${a.where} と ${b.where} が駒${d}つ違いの局面`);
  }
  // 追33（2026-11-24）：「相手の次の1振りで取られる確率」は、手のあと相手が振るときだけ（ロゼット・ブリッツの取りでもう一度振るなら言えない）
  for (const L of D.steps) for (const [i, q] of (L.problems || []).concat(L.ramp || []).entries()) {
    if (q.kind === 'choice' || !q.s || q.n == null) continue;
    const s = S(q.s), ms = E.legalMoves(s, q.n), ag = m => !m || (r => r.again || r.state.turn === 0)(E.apply(s, m)), b = ms.find(m => m.from === (q.best || (q.ok || [[]])[0])[0]);
    if (q.why && ['w.safe', 'w.escape'].includes(q.why[0]) && ag(b)) add(L.id, i + 1, '追33 もう一度振る手なのに相手の次の1振りの確率を言う');
    for (const f in q.ng || {}) if (['n.risk', 'n.capRisk'].includes(q.ng[f][0]) && (ag(ms.find(x => x.from === +f)) || ag(b))) add(L.id, i + 1, `追33 ${f} はもう一度振る手なのに相手の次の1振りの確率を言う`);
  }
  return out;
};
// 追54 の壊したデータ（node tools/lesson-verify-ur.js --selftest）
if (require.main === module && process.argv.includes('--selftest')) {
const V=module.exports, base=JSON.parse(fs.readFileSync(path.join(ROOT,'ur/lessons.json'),'utf8'));
const cp=()=>JSON.parse(JSON.stringify(base));const st=(D,id)=>D.steps.find(s=>s.id===id);
const T={
 '誤答の説明のキー入れかえ':()=>{const D=cp();const q=st(D,'race').problems[0];const i=q.ngo.findIndex(g=>g&&g[0]==='c.offNg');q.ngo[i][0]='c.goalNg';return D},
 '取られる確率の内訳':()=>{const D=cp();st(D,'prob').problems[3].why[1].list='1→4/16';return D},
 'ヒントの内訳':()=>{const D=cp();const q=st(D,'race').problems[1];q.hints[0]=st(D,'race').problems[0].hints[0];return D},
 '誤答の数字':()=>{const D=cp();const q=st(D,'race').problems[0];q.opts[0]='30';return D},
 '説明の内訳キー':()=>{const D=cp();st(D,'race').problems[1].why[0]='c.pipsBOG';return D},
 'リードの誤答の数字':()=>{const D=cp();const q=st(D,'race').problems[2];const i=q.ngo.findIndex(g=>g&&g[0]==='c.leadOff14Ng');q.opts[i]=Object.fromEntries(Object.entries(q.opts[i]).map(([k,v])=>[k,v.replace('+8','+7')]));return D},
 '前の駒を消す':()=>{const D=cp();const q=st(D,'prob').problems[4];q.s.pos[1][2]=15;return D},
 '追64 重なる誤答（旧データ：組み合わせ1通り＝出目0/4）':()=>{const D=cp();const q=st(D,'prob').problems[0];const i=q.ngo.findIndex(g=>g&&g[0]==='c.notNg');q.opts[i]='1/16';q.ngo[i]=['c.oneWayNg',{x:'1/16',n:3,m:4}];return D},
 '追64 重なる誤答（旧データ：入っていない駒を忘れる＝ゴールを15）':()=>{const D=cp();const q=st(D,'race').problems[2];const i=q.ngo.findIndex(g=>g&&g[0]==='c.leadPosNg');q.opts[i]=Object.fromEntries(Object.entries(q.opts[i]).map(([k,v])=>[k,v.replace(/^.*\+21$/,m=>m)]));q.opts[i].ja='あなた +6';q.ngo[i]=['c.leadOffNg',{x:'あなた +6',a:52,b:43}];return D},
 '追64 説明のキーが値の誤りと違う':()=>{const D=cp();const q=st(D,'prob').problems[3];const i=q.ngo.findIndex(g=>g&&g[0]==='c.distNg');q.ngo[i][0]='c.safeNg';return D},
 '追64 遠い駒だけ＝取られない確率（旧データ）':()=>{const D=cp();const q=st(D,'prob').problems[3];const i=q.ngo.findIndex(g=>g&&g[0]==='c.distNg');q.opts[i]='6/16';q.ngo[i]=['c.safeNg',{x:'6/16',m:10}];return D},
 '少なすぎの決まり文句':()=>{const D=cp();const q=st(D,'race').problems[3];const i=q.ngo.findIndex(g=>g);q.ngo[i]=['c.lowNg',{x:q.opts[i]}];return D},
};
let ok=0;for(const k in T){const r=V({data:T[k](),noLut:true}).filter(x=>/追54|追64/.test(x.msg));console.log(r.length?'検出':'見逃し',k,r.length,r[0]&&r[0].msg.slice(0,80));if(r.length)ok++}
console.log(ok+'/'+Object.keys(T).length);if(ok!==Object.keys(T).length)process.exit(1);
}
