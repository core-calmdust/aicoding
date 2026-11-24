// tools/lesson-verify-ur.js — ウル（ur）のパズル・レッスンの機械チェック（2026-11-24、担当C）。lesson-verify.js の ur から呼ぶ。
// 完全解析表（RoyalUr.net の finkel.rgu、約830MB）が必要：環境変数 URLUT（既定 /tmp/urlut/finkel.rgu）。
//   取得：curl -L -o /tmp/urlut/finkel.rgu https://huggingface.co/sothatsit/RoyalUrModels/resolve/main/finkel.rgu
// node --max-old-space-size=7000 tools/lesson-verify.js ur
// パズル（ur/puzzles.json の全問）：①答え＝完全解析で最善・保存した ev が完全解析の値 ②唯一（2番目と5%以上）・正解は1手だけ（追3）
// ③合法手3以上・決着済みでない ④テーマの手段（learn_common.classify）⑤ほかのパズル・レッスン（問題・準備・図）と駒3つ以上違う
// ⑥テーマ内は2番目との差が大きい順（易→難）⑦全部の不正解手に盤の事実の理由（ur_facts.ngKey と一致・％は実際の取られる確率）
// ⑧理由文に勝率の％がない・14言語・{…}が残らない ⑨2D（app-learn.js）は ok の from で正誤、why/ng を msg から出す＝同じデータ。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
function ur(opt) {
  opt = opt || {};
  const F = require(path.join(ROOT, 'ur/tools/ur_facts.js')), L = require(path.join(ROOT, 'ur/tools/learn_common.js')), E = L.E;
  const file = process.env.URLUT || '/tmp/urlut/finkel.rgu';
  if (!fs.existsSync(file)) return ['ur: 完全解析表がない（' + file + '）。tools/lesson-verify-ur.js の先頭の取得方法で用意する'];
  const T = opt.T || require(path.join(ROOT, 'ur/tools/lut.js')).open('finkel', file);
  const P = opt.P || JSON.parse(fs.readFileSync(path.join(ROOT, 'ur/puzzles.json'), 'utf8'));
  const LS = opt.LS || JSON.parse(fs.readFileSync(path.join(ROOT, 'ur/lessons.json'), 'utf8'));
  const bad = [], all = [];
  const langs = require(path.join(ROOT, 'ur/tools/learn_text.js')).LANGS;
  for (const k in P.msg) {
    for (const l of langs) if (!P.msg[k][l]) bad.push(`ur msg ${k}: ${l} がない`);
    for (const l in P.msg[k]) if (F.WIN.test(P.msg[k][l]) || F.THIS.test(P.msg[k][l])) bad.push(`ur msg ${k} ${l}: ⑧勝率の％を理由にしている`);
  }
  const lessonS = F.lessonStates(LS);
  for (const th of P.themes) {
    let prevGap = Infinity;
    th.puzzles.forEach((p, j) => {
      const tag = `ur ${p.id}`;
      const s = Object.assign({ winner: -1 }, p.s), ms = E.legalMoves(s, p.n);
      const r = F.exact(T, p.s, p.n);
      if (!r.ok) bad.push(`${tag}: ${r.why.join('・')}`);
      if (!p.ok || p.ok.length !== 1) bad.push(`${tag}: 追3 正解は1手だけ（ok ${JSON.stringify(p.ok)}）`);
      const best = r.ev[0];
      if (!p.ok || !ms.some(m => m.from === p.ok[0][0] && m.to === p.ok[0][1])) bad.push(`${tag}: ①答えが合法手でない`);
      else if (p.ok[0][0] !== best[0]) bad.push(`${tag}: ①答え ${p.ok[0]} は最善でない（最善 ${best[0]}→${best[1]} ${best[2]}、答え ${(r.ev.find(e => e[0] === p.ok[0][0]) || [])[2]}）`);
      if (!p.best || p.best[0] !== p.ok[0][0]) bad.push(`${tag}: best と ok が違う`);
      if (!Array.isArray(p.ev) || p.ev.length !== r.ev.length || p.ev.some((e, i) => e[0] !== r.ev[i][0] || Math.abs(e[2] - r.ev[i][2]) > 0.0015)) bad.push(`${tag}: 追4 保存した ev が完全解析の値・順位と違う`);
      if (Math.abs((p.gap || 0) - r.gap) > 0.0015) bad.push(`${tag}: 保存した gap ${p.gap} が完全解析 ${r.gap.toFixed(3)} と違う`);
      // ④
      const q = { s: p.s, n: p.n, ev: r.ev }, cls = L.classify(q);
      const want = { rosette: ['rosette'], center: ['center', 'hold'], enter: ['enter', 'advance'], capture: ['capture'], escape: ['escape'], safe: ['safe'], goal: ['goal'], race: ['race'] }[th.id];
      if (!want || !want.some(t => cls.includes(t))) bad.push(`${tag}: ④答えがテーマ「${th.id}」の手段でない（${cls.join(',')}）`);
      // ⑤
      for (const o of all) if (F.dist(o.s, p.s) < 3) bad.push(`${tag}: ⑤ ${o.id} と駒${F.dist(o.s, p.s)}つしか違わない`);
      lessonS.forEach((o, k) => { if (F.dist(o, p.s) < 3) bad.push(`${tag}: ⑤ レッスンの局面 #${k} と駒${F.dist(o, p.s)}つしか違わない（追1）`); });
      all.push({ id: p.id, s: p.s });
      // ⑥
      if (r.gap > prevGap + 1e-9) bad.push(`${tag}: ⑥ 前の問題よりやさしい（差 ${r.gap.toFixed(3)} > ${prevGap.toFixed(3)}）`);
      prevGap = r.gap;
      // ⑦⑧
      const sub = F.subTheme(th.id, cls), rs = F.reasons(q, sub);
      if (!rs) bad.push(`${tag}: ⑦ 事実で理由を言えない不正解手がある`);
      else {
        if (JSON.stringify(p.why) !== JSON.stringify(rs.why)) bad.push(`${tag}: ⑧ 正解の理由 ${JSON.stringify(p.why)} ≠ 盤の事実 ${JSON.stringify(rs.why)}`);
        for (const m of ms) if (m.from !== best[0]) {
          const g = p.ng && p.ng[String(m.from)];
          if (!g) bad.push(`${tag}: ⑦ 不正解 ${m.from}→${m.to} の理由がない`);
          else if (JSON.stringify(g) !== JSON.stringify(rs.ng[m.from])) bad.push(`${tag}: ⑦ 不正解 ${m.from}→${m.to} の理由 ${JSON.stringify(g)} ≠ 盤の事実 ${JSON.stringify(rs.ng[m.from])}`);
        }
      }
      for (const k of [p.why[0]].concat(Object.values(p.ng || {}).map(x => x[0]))) if (!P.msg[k]) bad.push(`${tag}: 理由のひな形 ${k} がない`);
    });
  }
  return bad;
}
module.exports = { ur };
