// ur/tools/ur_facts.js — ウルのパズル・レッスンの検証と理由文の共通部品（2026-11-24、担当C）。
// 完全解析表（lut.js）で全合法手の勝率を出し、①②③を数値で確かめる。理由文は盤の事実だけ（勝率の％を書かない）。
'use strict';
const L = require('./learn_common.js'), X = require('./learn_text.js');
const E = L.E;
const MIN_GAP = 0.05, MIN_MOVES = 3;
// ①②③：完全解析で全合法手を並べ、最善が唯一（2番目と MIN_GAP 以上）・合法手 MIN_MOVES 以上・決着済みでない
function exact(T, s, n) {
  const st = Object.assign({ winner: -1 }, s);
  const ms = E.legalMoves(st, n);
  const ev = ms.map(m => [m.from, m.to, +T.after(st, m).toFixed(4)]).sort((a, b) => b[2] - a[2]);
  const gap = ev.length > 1 ? ev[0][2] - ev[1][2] : 1;
  const why = [];
  if (ms.length < MIN_MOVES) why.push(`③合法手${ms.length}`);
  if (gap < MIN_GAP) why.push(`②2番目との差${gap.toFixed(3)}`);
  if (ev.length && (ev[0][2] < 0.03 || ev[0][2] > 0.97)) why.push(`もう決着（最善${ev[0][2]}）`);
  return { ok: !why.length, why, ev, gap, nm: ms.length };
}
// ⑤ 駒の位置の違い（両者の駒の多重集合の差の大きさ。1手で動くのは自分の駒1つ＋取られた相手の駒1つ＝2まで）
function dist(a, b) {
  let d = 0;
  for (let sd = 0; sd < 2; sd++) {
    const x = a.pos[sd].slice().sort((p, q) => p - q), y = b.pos[sd].slice().sort((p, q) => p - q);
    const c = new Map(); x.forEach(v => c.set(v, (c.get(v) || 0) + 1)); y.forEach(v => c.set(v, (c.get(v) || 0) - 1));
    let pos = 0; for (const v of c.values()) if (v > 0) pos += v; d += pos;
    if (x.length !== y.length) d += 9;
  }
  if ((a.rule || 'finkel') !== (b.rule || 'finkel')) d += 9;
  return d;
}
function lessonStates(LS) {
  const out = [];
  for (const st of LS.steps) {
    if (st.diagram && st.diagram.s) out.push(st.diagram.s);
    for (const r of st.ramp || []) if (r.s) out.push(r.s);
    for (const p of st.problems || []) if (p.s) out.push(p.s);
  }
  return out.map(s => Object.assign({ rule: 'finkel' }, s));
}
function subTheme(id, th) { return id === 'center' ? (th.includes('hold') && !th.includes('center') ? 'hold' : 'center') : id === 'enter' ? (th.includes('advance') ? 'advance' : 'enter') : id; }
// ⑦⑧ 不正解の手ごとの、盤の事実による理由。どれか1つでも事実で言えなければ null（その局面は使わない）
function ngKey(s, n, best, m, th) {
  if (best.capture && !m.capture) return ['n.noCap', {}];
  if (th === 'hold' && m.from === 8) return ['n.leave8', {}];
  if (best.finish && !m.finish) return ['n.noGoal', {}];
  if (best.rosette && !m.rosette) return ['n.noRos', {}];
  const rb = L.riskAfter(s, best), rm = L.riskAfter(s, m);
  if (rm >= rb + 0.15) return ['n.risk', { r: L.pct(rm), q: L.pct(rb) }];
  return null;
}
const WHY = { capture: 'w.cap', rosette: 'w.ros', center: 'w.center', hold: 'w.hold', enter: 'w.enter', advance: 'w.adv', goal: 'w.goal', escape: 'w.escape', safe: 'w.safe', race: 'w.race' };
function reasons(p, th) {
  const s = p.s, n = p.n, best = L.moveOf(s, n, p.ev[0][0]);
  const key = WHY[th]; if (!key) return null;
  const why = [key, { r: L.pct(L.riskAfter(s, best)) }];
  const ng = {};
  for (const [f] of p.ev.slice(1)) { const k = ngKey(s, n, best, L.moveOf(s, n, f), th); if (!k) return null; ng[f] = k; }
  return { why, ng };
}
// 理由文：learn_text の MSG から勝率の％の文を除き、事実の文を足す
const WIN = /\s*(勝率|Win chance|胜率|승률|Probabilidad de ganar|Chances de gain|Chance de vitória|Gewinnchance|जीत की संभावना|فرصة الفوز|Шанс победы|Peluang menang|Kazanma şansı)[^]*$/;
const THIS = /\s*(この手の勝率は|This move:|这步的胜率|이 수의 승률|Esta jugada:|Ce coup :|Este lance:|Dieser Zug:|इस चाल की संभावना|هذه النقلة:|Этот ход:|這一手的勝率是|Langkah ini:|Bu hamle:)[^]*$/;
const LL = (...a) => { const o = {}; X.LANGS.forEach((k, i) => { o[k] = a[i]; }); return o; };   // (14言語の順：learn_text.LANGS)
const MSG = {};
for (const k in X.MSG) {
  if (k === 'w.gen' || k === 'n.gen' || k === 'n.capBad' || k === 'w.nocap') continue;
  MSG[k] = {}; for (const l of X.LANGS) MSG[k][l] = X.MSG[k][l].replace(k[0] === 'w' ? WIN : THIS, '').trim();
}
MSG['n.noGoal'] = LL('ちょうどの目でゴールできる駒がありました。ゴールした駒はもう取られません。', 'A piece could go home with the exact roll. A piece at home can never be captured.', '有棋子能用正好的点数到达终点。到达终点的棋子不会再被吃。', '딱 맞는 눈으로 골인할 수 있는 말이 있었어요. 골인한 말은 더는 잡히지 않아요.', 'Había una ficha que podía llegar a la meta con la tirada exacta. Una ficha en la meta ya no puede ser capturada.', 'Un pion pouvait rentrer avec le nombre exact. Un pion rentré ne peut plus être pris.', 'Havia uma peça que chegava à meta com o número exato. Uma peça na meta não pode mais ser capturada.', 'Ein Stein hätte mit genau dieser Zahl ins Ziel gehen können. Im Ziel kann er nicht mehr geschlagen werden.', 'एक मोहरा ठीक इसी अंक से घर पहुँच सकता था। घर पहुँचा मोहरा फिर नहीं मारा जा सकता।', 'كانت هناك قطعة تصل إلى النهاية بالرمية المضبوطة. القطعة في النهاية لا يمكن أسرها.', 'Фишка могла уйти домой точным броском. Дома её уже не взять.', '有棋子能用剛好的點數到達終點。到達終點的棋子不會再被吃。', 'Ada bidak yang bisa pulang dengan angka pas. Bidak yang sudah pulang tak bisa ditangkap lagi.', 'Tam bu sayıyla eve girebilecek bir taş vardı. Evdeki taş artık alınamaz.');
MSG['n.risk'] = LL('その手だと、次に相手に取られる確率が {r}% になります（正解の手なら {q}%）。', 'After that move, the chance of being captured next is {r}% (the right move: {q}%).', '这样走，下一步被对方吃掉的概率是 {r}%（正解是 {q}%）。', '그 수면 다음에 상대에게 잡힐 확률이 {r}%가 돼요 (정답 수는 {q}%).', 'Con esa jugada, la probabilidad de ser capturado enseguida es {r}% (con la correcta, {q}%).', 'Après ce coup, le risque d’être pris tout de suite est de {r} % (le bon coup : {q} %).', 'Com esse lance, a chance de ser capturado em seguida é {r}% (com o certo, {q}%).', 'Nach diesem Zug wirst du mit {r} % gleich geschlagen (beim richtigen Zug {q} %).', 'उस चाल के बाद अगली बारी में मारे जाने की संभावना {r}% है (सही चाल से {q}%)।', 'بعد هذه النقلة تصبح فرصة الأسر في الدور التالي {r}% (مع النقلة الصحيحة {q}%).', 'После этого хода шанс, что фишку сразу возьмут, {r}% (при верном ходе {q}%).', '這樣走，下一步被對方吃掉的機率是 {r}%（正解是 {q}%）。', 'Setelah langkah itu, peluang ditangkap berikutnya {r}% (langkah yang benar: {q}%).', 'O hamleden sonra hemen alınma ihtimali %{r} (doğru hamlede %{q}).');
module.exports = { MIN_GAP, MIN_MOVES, exact, dist, lessonStates, subTheme, reasons, ngKey, MSG, WIN, THIS };
