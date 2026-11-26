// 囲碁の定石・布石の練習問題（go/open）の ⑦⑧：ゴイシペンの文（atlas/lessons3d.js goOpJa を vm で実行）を全合法手で作り、
// 盤の事実と照合する（2026-11-26 第2期・担当B、claude/lesson-quality.md）。盤の事実は lessons3d.js の goOpF を使わずに、
// go/rules.js でここで数え直す：
//   問いかけ：「{s}の番」の色が手番
//   正解のほめ言葉（why）：文の種類ごとの主張が盤で成り立つ（取った石の数・助けた石のダメの数・アタリ・2つ以上の自分の石をつなぐ・
//     2つ以上の相手の石に接する・三々（相手の石が2以内）・相手の石に接する・一間トビ（間が空き）・コスミ・ケイマ・ノビ（ダメの数）・
//     カカリ（相手の石が3以内）・ヒラキ（自分の石から3〜5・3〜4線）・大場（4以上離れる））。名前（ハネ・ツケ…）は相手の石に接する手だけ
//   ヒント：取れる石・アタリの自分の石・ダメ2つの相手の石・三々を言うヒントは、その事実が盤にあるとき
//   不正解の文（全合法手 u）：u のあと相手が正解の点に打つと何が起きるか（取られる数・アタリ・逃げられる・割りこまれる・
//     相手の石がつながる・三々・ダメが減る数・接する）が盤で成り立ち、「相手に打たれる」と言う点が相手にとって合法。
//     自分の手について：すぐアタリ（u の石のダメが1つ）・一線・遠い（全部の石から5以上）
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const R = require(path.join(ROOT, 'go/rules.js'));
let X0 = null;
function load() {
  if (X0) return X0; const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const a = src.indexOf('  const GOJ_OP = {'), b = src.indexOf('  function goOpIntroJa(');
  if (a < 0 || b < 0) throw new Error('goOpJa が lessons3d.js に見つからない');
  const ctx = { window: { GoRules: R } };
  vm.runInNewContext(`const fill = (s, v) => String(s).replace(/\\{(\\w+)\\}/g, (_, k) => v[k] != null ? v[k] : '');
    const SPJ = { ok: '緑に光っている点' }; const SP = (k, lang) => '\\u0001' + SPJ[k] + '\\u0002';
    ${src.slice(a, b)}; this.GOJ_OP = GOJ_OP; this.goOpJa = goOpJa;`, ctx);
  return (X0 = ctx);
}
// ---- the board facts, counted here
const nbs = (N, i) => { const x = i % N, y = Math.floor(i / N), o = []; if (x > 0) o.push(i - 1); if (x < N - 1) o.push(i + 1); if (y > 0) o.push(i - N); if (y < N - 1) o.push(i + N); return o; };
const gkey = (p, i) => Math.min(...p.group(i).stones);
function facts(p, m) {   // what m (by p.turn) does
  const N = p.n, c = p.turn, o = 3 - c, r = p.tryPlay(m); if (!r) return null; const q = r.pos, x = m % N, y = Math.floor(m / N), ln = v => Math.min(v, N - 1 - v) + 1;
  const ownG = new Set(), oppG = new Set(); let savedFrom = false;
  for (const t of nbs(N, m)) { if (p.b[t] === c) { ownG.add(gkey(p, t)); if (p.group(t).libs === 1) savedFrom = true; } else if (p.b[t] === o) oppG.add(gkey(p, t)); }
  const oppAfter = new Map(); for (const t of nbs(N, m)) if (q.b[t] === o) oppAfter.set(gkey(q, t), q.group(t));
  const ataris = [...oppAfter.values()].filter(g => g.libs === 1), oppLibs = [...oppAfter.values()].map(g => g.libs);
  let dOwn = 99, dOpp = 99, jump = false, diag = false, keima = false;
  for (let i = 0; i < N * N; i++) { const v = p.b[i]; if (!v) continue; const dx = Math.abs(i % N - x), dy = Math.abs(Math.floor(i / N) - y), d = Math.max(dx, dy);
    if (v === c) { dOwn = Math.min(dOwn, d); if ((dx === 2 && !dy) || (!dx && dy === 2)) { const mid = ((Math.floor(i / N) + y) / 2) * N + (i % N + x) / 2; if (!p.b[mid]) jump = true; }
      if (dx === 1 && dy === 1) diag = true; if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) keima = true; } else dOpp = Math.min(dOpp, d); }
  // the opponent's groups that had 2 liberties and are touched (for the atari hint)
  const opp2 = [...oppG].some(k => p.group(k).libs === 2), ownLibs0 = Math.max(0, ...[...ownG].map(k => p.group(k).libs));
  return { cap: r.captured.length, libs: q.group(m).libs, line: Math.min(ln(x), ln(y)), own: ownG.size, opp: oppG.size, save: savedFrom && q.group(m).libs >= 2, atari: ataris.length > 0 && !r.captured.length,
    ataris, oppLibs, opp2, ownLibs0, sansan: ln(x) === 3 && ln(y) === 3, dOwn, dOpp, jump: jump && !ownG.size, diag: diag && !ownG.size, keima: keima && !ownG.size };
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const themT = t => t.replace(/\{m\}/g, 'そこ').replace(/^そこは/, 'そこは、').replace('そこを先に打たれて', '先にそこを打たれて');   // (as goOpJa's themOf writes them)
const rx = t => new RegExp(esc(t).replace(/\\\{n\\\}/g, '(.*?)').replace(/\\\{(k|l)\\\}/g, '(\\d+)').replace(/\\\{m\\\}/g, '(?:そこ|\\u0001緑に光っている点\\u0002)').replace(/\\\{s\\\}/g, '(黒|白)'));
function matchKind(groups, s, them) {   // the template's kind and its numbers ({k} / {l}) found in text s (the longest template that matches)
  let best = null;
  for (const [kind, arr] of Object.entries(groups)) for (const t0 of arr) { if (!t0) continue; const t = them ? themT(t0) : t0, m = s.match(rx(t));
    if (m && (!best || t.length > best.t.length)) { const names = (t.match(/\{(n|k|l)\}/g) || []).map(z => z[1]); best = { kind, t, at: m.index, len: m[0].length }; names.forEach((nm, i) => { best[nm] = m[i + 1]; }); } }
  return best;
}
function whyTrue(kind, F, v) {   // the claim of a `why` sentence about the answer, on the board
  const k = v.k != null ? +v.k : null, l = v.l != null ? +v.l : null;
  switch (kind) {
    case 'cap': return F.cap > 0 && k === F.cap;
    case 'save': return F.save && l === F.libs;
    case 'atari': return F.atari;
    case 'connect': return F.own >= 2;
    case 'cut': return F.opp >= 2;
    case 'sansan': return F.sansan && F.dOpp <= 2;
    case 'contact': return F.opp >= 1;
    case 'jump': return F.jump;
    case 'diag': return F.diag;
    case 'keima': return F.keima;
    case 'nobi': return F.own >= 1 && (l == null || l === F.libs) && F.libs > F.ownLibs0;   // (追90: some of its wordings say the liberties grew — every wording of the kind must hold)
    case 'approach': return F.dOpp <= 3;
    case 'ext': return F.dOwn >= 3 && F.dOwn <= 5 && F.line >= 3 && F.line <= 4;
    case 'open': return F.dOwn >= 4 && F.dOpp >= 4;
    case 'local': return true;
  }
  return false;
}
function themTrue(kind, T, v) {   // the claim about the other side's move at the green point (T = its facts), after the player's move
  const k = v.k != null ? +v.k : null, l = v.l != null ? +v.l : null;
  if (!T) return false;   // 「相手に打たれる」と言う点が相手に打てない
  switch (kind) {
    case 'cap': return T.cap > 0 && k === T.cap;
    case 'atari': return T.atari;
    case 'save': return T.save;
    case 'cut': return T.opp >= 2;
    case 'connect': return T.own >= 2;
    case 'sansan': return T.sansan && T.dOpp <= 2;
    case 'reduce': return T.opp >= 1 && l != null && Math.min(...T.oppLibs) === l;
    case 'contact': return T.opp >= 1;
    case 'gen': return true;
  }
  return false;
}
const HINT_NEED = { cap: F => F.cap > 0, save: F => F.save, atari: F => F.atari && F.opp2, sansan: F => F.sansan, contact: F => F.opp >= 1, cut: F => F.opp >= 2, connect: F => F.own >= 2 };
// one problem: p0 = the position, ok = the answer (index), note = the line's note (on-line problems) — returns the failures
function checkProblem(o, p0, ok) {
  const X = load(), H = X.GOJ_OP, bad = [], N = p0.n, side = p0.turn === 1 ? '黒' : '白';
  if (/(黒|白)/.test(o.ask) && !o.ask.includes(side)) bad.push(`⑦ 問いかけの色が手番（${side}）と違う：${o.ask}`);
  const F = facts(p0, ok); if (!F) { bad.push('⑧ 正解が合法でない'); return bad; }
  // the hint
  const hk = Object.entries(H.hint).find(([, arr]) => arr.includes(o.hintTx)); if (!hk) bad.push(`⑦ ヒントの文が表にない：${o.hintTx}`);
  else if (HINT_NEED[hk[0]] && !HINT_NEED[hk[0]](F)) bad.push(`⑧ ヒント（${hk[0]}）が盤と合わない：${o.hintTx}`);
  // the praise
  const WHY = Object.fromEntries(Object.entries(H.why).map(([k, a]) => [k, a.concat((H.whyMore || {})[k] || [])])), g = o.good(ok), wf = matchKind(WHY, g);   // (2026-11-26 担当B: whyMore の言い回しも盤で照合)
  if (!wf) bad.push(`⑧ 正解の文に理由（why）がない：${g}`);
  // 追90: the other wordings of the same kind (the lesson picks them in turn) — each one's numbers and claim on this board
  else { (WHY[wf.kind] || []).forEach(t => { if (!t.includes('{k}') && !t.includes('{l}')) return; if (wf.kind === 'cap' && !(F.cap > 0)) bad.push(`追90 ${t}`); });
    if (!whyTrue(wf.kind, F, wf)) bad.push(`⑧ 正解の理由（${wf.kind}）が盤と合わない：${g}`);
    for (const nm of ['ハネ', 'オサエ', 'ツケ', 'キリ', 'アテ', 'ハイ', 'オシ', 'ノゾキ']) if (['この{n}で、', '{n}を打って、', '{n}がぴったり。', 'ここで{n}！'].some(t => g.includes(t.replace('{n}', nm))) && !(F.opp >= 1)) bad.push(`⑧ 手の名前「${nm}」が相手の石に接しない手：${g}`); }
  // every legal wrong move
  for (let u = 0; u < N * N; u++) { if (u === ok) continue; const r = p0.tryPlay(u); if (!r) continue;
    const s = o.ng(u), th = matchKind(H.them, s, true);
    if (!th) { bad.push(`⑦ ${R.coord(u, N)} の不正解の文に相手の手の説明がない：${s}`); continue; }
    const T = facts(r.pos, ok);
    if (!themTrue(th.kind, T, th)) bad.push(`⑦ ${R.coord(u, N)} のあと相手が正解の点に打つ説明（${th.kind}）が盤と合わない：${s}`);
    const U = facts(p0, u), rest = s.slice(th.at + th.len);
    if (H.you.selfAtari.some(t => rest.includes(t)) && !(U.libs === 1 && !U.cap)) bad.push(`⑦ ${R.coord(u, N)}「すぐアタリ」が盤と合わない`);
    if (H.you.line1.some(t => rest.includes(t)) && U.line !== 1) bad.push(`⑦ ${R.coord(u, N)}「一線」が盤と合わない`);
    if (H.you.far.some(t => rest.includes(t)) && !(U.dOwn > 4 && U.dOpp > 4)) bad.push(`⑦ ${R.coord(u, N)}「遠い」が盤と合わない`);
    if (bad.length > 12) break; }
  return bad;
}
// a set's problems as the 3D table builds them (5 problems in `at` order), each checked over every legal move
function verifySet(g, LI, posOf, mvOf) {
  const X = load(), N = g.n || 19, F = [], probs = (g.problems || []).slice().sort((a, b) => a.at - b.at), seen = {};
  const self = { after: (sp, mv) => { let p = R.Pos.from(sp); for (const m of mv) { const r = p.tryPlay(m); if (!r) break; p = r.pos; } return p.spec(); } };
  probs.forEach((P, pi) => { const pos = posOf(P), mv = mvOf(P).map(m => R.parseCoord(m, N)), ok = R.parseCoord(P.ok[0], N), st = posOf({ at: 0, mv: [] }).spec();
    const sd = pos.turn, note = P.mv ? '' : (g.notes || {})[String(P.at + 1)] ? (g.notes[String(P.at + 1)].ja || '') : '';
    const mk = () => { const o = { P: { ok: [ok], good: [], half: [] }, __i: pi, __seen: Object.assign({}, seen) }; X.goOpJa(o, g, { at: mv.length, off: !!P.mv }, st, mv, LI, sd, note, self); return o; };
    // the stem `line.slice(0, P.at)` in goOpJa = the problem's own moves (mv) here
    const o0 = mk(); if (!(P.mv ? X.GOJ_OP.askOff : X.GOJ_OP.ask).some(t => o0.ask === t.replace('{s}', sd === 1 ? '黒' : '白'))) F.push({ q: g.problems.indexOf(P) + 1, msg: `⑦ 問いかけが${P.mv ? '手順の外の問題なのに「手順を思い出す」' : '手順の問題なのに「相手が外した」'}：${o0.ask}` });
    checkProblem(o0, pos, ok).forEach(msg => F.push({ q: g.problems.indexOf(P) + 1, msg })); });
  return F;
}
module.exports = { verifySet, checkProblem, facts, load };
// わざと壊したデータで検出できるか：別の局面の文・取った数を1つ増やした文・相手に打てない点を「打たれる」と言う文
if (require.main === module && process.argv.includes('--selftest')) {
  const X = load(), H = X.GOJ_OP, R9 = s => R.Pos.from({ n: 9, stones: s, turn: 1 }), out = [];
  // 1) a capture: black C5 takes the white stone at C4 (white C4 has one liberty)
  const b = Array(81).fill('.'), put = (m, c) => { b[R.parseCoord(m, 9)] = c; };
  put('C4', 'w'); put('B4', 'b'); put('D4', 'b'); put('C3', 'b'); put('G6', 'w'); const p = R9(b.join('')), ok = R.parseCoord('C5', 9);
  const st = { n: 9, stones: b.join(''), turn: 1 }, self = { after: sp => sp };
  const mk = () => { const o = { P: { ok: [ok], good: [], half: [] }, __i: 0, __seen: {} }; X.goOpJa(o, { id: 't' }, { at: 0 }, st, [], 0, 1, '', self); return o; };
  out.push(['そのままの文', checkProblem(mk(), p, ok).length === 0]);
  { const o = mk(), g0 = o.good; o.good = u => g0.call(o, u).replace(/(\d+)子/, (_, k) => (+k + 1) + '子'); out.push(['取った数を1つ増やす', checkProblem(o, p, ok).some(m => /⑧ 正解の理由/.test(m))]); }
  { const o = mk(); o.good = () => 'いいね！ ' + H.why.atari[0].replace('{n}', ''); out.push(['取る手を「アタリにした」と言う', checkProblem(o, p, ok).some(m => /⑧ 正解の理由（atari）/.test(m))]); }
  { const o = mk(); o.good = () => 'いいね！ ' + H.whyMore.atari[0].replace('{n}', ''); out.push(['取る手を whyMore の「追いこんだ」で言う', checkProblem(o, p, ok).some(m => /⑧ 正解の理由（atari）/.test(m))]); }
  { const o = mk(), n0 = o.ng; o.ng = u => n0.call(o, u) + ' ' + themT(H.them.cap[1]).replace('{k}', '1'); out.push(['ほかの手のあとを「取られる」と言う（取られない）', checkProblem(o, p, ok).some(m => /⑦ .*説明（cap）/.test(m))]); }
  { const o = mk(); o.hintTx = H.hint.save[0]; out.push(['アタリの自分の石がないのに「助ける」ヒント', checkProblem(o, p, ok).some(m => /⑧ ヒント（save）/.test(m))]); }
  out.forEach(([k, v]) => console.log((v ? 'OK ' : 'NG ') + k)); process.exit(out.every(x => x[1]) ? 0 : 1);
}
