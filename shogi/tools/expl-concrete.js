// Makes the lesson problems' explanations concrete (2026-11-21 ユーザー：具体例がないとわかりにくい — 全問精査):
// the templates (trap / capture / evade / defend / best) get the actual moves added — the right move, the bait and how the
// opponent punishes it (engine search), the mate the opponent threatens, how the check is answered.
//   node shogi/tools/expl-concrete.js   (rewrites shogi/lessons.json; idempotent — the base sentence is kept in expl0)
'use strict';
const E = require('../engine.js'), fs = require('fs'), path = require('path');
const F = path.join(__dirname, '..', 'lessons.json');
const raw = fs.readFileSync(F, 'utf8'), D = JSON.parse(raw);
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const KJ = { 1: '歩', 2: '香', 3: '桂', 4: '銀', 5: '角', 6: '飛', 7: '金', 8: '玉', 9: 'と', 10: '成香', 11: '成桂', 12: '成銀', 13: '馬', 14: '龍' };
const WL = { 1: 'P', 2: 'L', 3: 'N', 4: 'S', 5: 'B', 6: 'R', 7: 'G', 8: 'K', 9: '+P', 10: '+L', 11: '+N', 12: '+S', 13: '+B', 14: '+R' };
const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const posOf = sfen => { const p = new E.Position(); p.setSfen(sfen); return p; };
const sqI = q => E.makeSq(+q[0], q.charCodeAt(1) - 96);
// the move in words: ja / zh: ☗７七角成 · others: Bx7g+ (western notation)
function name(sfen, u, lang, side) {
  const p = posOf(sfen), mk = (side != null ? side : (sfen.split(' ')[1] === 'w' ? 1 : 0)) ? '☖' : '☗';
  const cjk = lang === 'ja' || lang === 'zh' || lang === 'zh-TW';
  if (u[1] === '*') { const t = { P: 1, L: 2, N: 3, S: 4, B: 5, R: 6, G: 7 }[u[0]]; return cjk ? mk + ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96] + KJ[t] + '打' : u[0] + '*' + u.slice(2, 4); }
  const from = sqI(u.slice(0, 2)), to = sqI(u.slice(2, 4)), pc = p.board[from], t = E.typeOf(pc), cap = p.board[to] !== 0, pro = u[4] === '+';
  return cjk ? mk + ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96] + KJ[t] + (pro ? '成' : '') : WL[t] + (cap ? 'x' : '-') + u.slice(2, 4) + (pro ? '+' : '');
}
const T = {
  best: { ja: '正解は{b}。', en: 'The move: {b}.', zh: '正解是{b}。', 'zh-TW': '正解是{b}。', ko: '정답은 {b}.', es: 'La jugada: {b}.', fr: 'Le coup : {b}.', pt: 'O lance: {b}.', de: 'Der Zug: {b}.', ru: 'Ход: {b}.', tr: 'Doğru hamle: {b}.', id: 'Langkahnya: {b}.', hi: 'सही चाल: {b}।', ar: 'النقلة: {b}.' },
  trapM: { ja: '罠は{x}。取ると{r}から詰まされてしまいます。正解は{b}。', en: 'The bait is {x}: after it, {r} starts a mating attack. The move is {b}.', zh: '陷阱是{x}：吃了之后，对方{r}起就能将死你。正解是{b}。', 'zh-TW': '陷阱是{x}：吃了之後，對方{r}起就能將死你。正解是{b}。', ko: '함정은 {x}. 잡으면 {r}부터 외통수에 걸립니다. 정답은 {b}.', es: 'El cebo es {x}: tras él, {r} inicia un ataque de mate. La jugada es {b}.', fr: 'L’appât est {x} : ensuite, {r} lance une attaque de mat. Le coup est {b}.', pt: 'A isca é {x}: depois dela, {r} inicia um ataque de mate. O lance é {b}.', de: 'Der Köder ist {x}: danach leitet {r} einen Mattangriff ein. Der Zug ist {b}.', ru: 'Приманка — {x}: после неё {r} начинает матовую атаку. Ход — {b}.', tr: 'Tuzak {x}: sonrasında {r} mat saldırısı başlatır. Doğru hamle {b}.', id: 'Umpannya {x}: setelah itu {r} memulai serangan skak mat. Langkahnya {b}.', hi: 'चारा {x} है: उसके बाद {r} से मात का हमला शुरू होता है। सही चाल {b}।', ar: 'الطُّعم هو {x}: بعده يبدأ {r} هجوم كش مات. النقلة هي {b}.' },
  trap: { ja: '罠は{x}。取ると{r}と返されて損をします。正解は{b}。', en: 'The bait is {x}: {r} answers it and you come out behind. The move is {b}.', zh: '陷阱是{x}：吃了之后被{r}反击，反而吃亏。正解是{b}。', 'zh-TW': '陷阱是{x}：吃了之後被{r}反擊，反而吃虧。正解是{b}。', ko: '함정은 {x}. 잡으면 {r}로 반격당해 손해입니다. 정답은 {b}.', es: 'El cebo es {x}: {r} responde y sales perdiendo. La jugada es {b}.', fr: 'L’appât est {x} : {r} répond et vous y perdez. Le coup est {b}.', pt: 'A isca é {x}: {r} responde e você sai perdendo. O lance é {b}.', de: 'Der Köder ist {x}: {r} antwortet, und du stehst schlechter. Der Zug ist {b}.', ru: 'Приманка — {x}: на неё следует {r}, и вы в проигрыше. Ход — {b}.', tr: 'Tuzak {x}: {r} cevabıyla zararlı çıkarsın. Doğru hamle {b}.', id: 'Umpannya {x}: dibalas {r} dan kamu malah rugi. Langkahnya {b}.', hi: 'चारा {x} है: {r} के जवाब से आप घाटे में रहते हैं। सही चाल {b}।', ar: 'الطُّعم هو {x}: يُرَدّ عليه بـ{r} فتخسر. النقلة هي {b}.' },
  evK: { ja: 'ここは{b}と玉が逃げるのが最善です。', en: 'Here the best is to move the king: {b}.', zh: '这里最好是王逃开：{b}。', 'zh-TW': '這裡最好是王逃開：{b}。', ko: '여기서는 왕이 피하는 {b}가 최선입니다.', es: 'Aquí lo mejor es mover el rey: {b}.', fr: 'Ici le mieux est de déplacer le roi : {b}.', pt: 'Aqui o melhor é mover o rei: {b}.', de: 'Hier ist das Beste, den König zu ziehen: {b}.', ru: 'Здесь лучше всего уйти королём: {b}.', tr: 'Burada en iyisi şahı kaçırmak: {b}.', id: 'Di sini yang terbaik raja menghindar: {b}.', hi: 'यहाँ सबसे अच्छा राजा को हटाना है: {b}।', ar: 'الأفضل هنا تحريك الملك: {b}.' },
  evC: { ja: 'ここは{b}と王手の駒を取るのが最善です。', en: 'Here the best is to capture the checking piece: {b}.', zh: '这里最好是吃掉将军的子：{b}。', 'zh-TW': '這裡最好是吃掉將軍的子：{b}。', ko: '여기서는 장군 거는 말을 잡는 {b}가 최선입니다.', es: 'Aquí lo mejor es capturar la pieza que da jaque: {b}.', fr: 'Ici le mieux est de prendre la pièce qui fait échec : {b}.', pt: 'Aqui o melhor é capturar a peça que dá xeque: {b}.', de: 'Hier ist das Beste, die schachgebende Figur zu schlagen: {b}.', ru: 'Здесь лучше всего взять шахующую фигуру: {b}.', tr: 'Burada en iyisi şah çeken taşı almak: {b}.', id: 'Di sini yang terbaik memakan bidak yang men-skak: {b}.', hi: 'यहाँ सबसे अच्छा शह देने वाले मोहरे को पकड़ना है: {b}।', ar: 'الأفضل هنا أخذ القطعة التي تكش: {b}.' },
  evI: { ja: 'ここは{b}と間に駒を入れる（合駒）のが最善です。', en: 'Here the best is to block the check: {b}.', zh: '这里最好是在中间垫子（合驹）：{b}。', 'zh-TW': '這裡最好是在中間墊子（合駒）：{b}。', ko: '여기서는 사이에 말을 놓아 막는 {b}가 최선입니다.', es: 'Aquí lo mejor es interponer una pieza: {b}.', fr: 'Ici le mieux est d’interposer une pièce : {b}.', pt: 'Aqui o melhor é interpor uma peça: {b}.', de: 'Hier ist das Beste, eine Figur dazwischenzustellen: {b}.', ru: 'Здесь лучше всего закрыться: {b}.', tr: 'Burada en iyisi araya taş koymak: {b}.', id: 'Di sini yang terbaik menyisipkan bidak: {b}.', hi: 'यहाँ सबसे अच्छा बीच में मोहरा रखना है: {b}।', ar: 'الأفضل هنا وضع قطعة في الطريق: {b}.' },
  def: { ja: '相手のねらいは{t}からの詰み。{b}でそれを防ぎます。', en: 'The threat is mate starting with {t}. {b} stops it.', zh: '对方的目标是从{t}开始将死。用{b}化解。', 'zh-TW': '對方的目標是從{t}開始將死。用{b}化解。', ko: '상대의 노림은 {t}부터의 외통수. {b}로 막습니다.', es: 'La amenaza es mate empezando por {t}. {b} lo impide.', fr: 'La menace : un mat qui commence par {t}. {b} l’empêche.', pt: 'A ameaça é mate começando com {t}. {b} impede.', de: 'Die Drohung ist Matt, beginnend mit {t}. {b} verhindert es.', ru: 'Угроза — мат, начиная с {t}. {b} его предотвращает.', tr: 'Tehdit {t} ile başlayan mat. {b} bunu önler.', id: 'Ancamannya skak mat dimulai {t}. {b} mencegahnya.', hi: 'खतरा {t} से शुरू होने वाली मात है। {b} उसे रोकती है।', ar: 'التهديد كش مات يبدأ بـ{t}. {b} يمنعه.' },
};
const fill = (s, v) => s.replace(/\{(\w)\}/g, (m, k) => v[k] != null ? v[k] : m);
const join = (base, add, l) => base ? base + ((l === 'ja' || l === 'zh' || l === 'zh-TW') ? '' : ' ') + add : add;
function think(sfen, ms) { const p = posOf(sfen), s = new E.Searcher(p); return s.rootSearch({ time: ms }); }
function after(sfen, u) { const p = posOf(sfen); p.doMove(p.fromUsi(u)); return p.toSfen ? p.toSfen() : null; }
let n = 0, nt = 0;
for (const g of D.grades) for (const P of g.problems || []) {
  if (!P.expl || typeof P.expl !== 'object' || !P.pv || !P.pv.length || !P.sfen) continue;
  const src = P.src, kind = { trap: 1, capture: 1, evade: 1, defend: 1, best: 1 }[src]; if (!kind) continue;
  const base = P.expl0 || P.expl; P.expl0 = base;   // (the template sentence, kept for re-runs)
  const b = P.pv[0], side = P.sfen.split(' ')[1] === 'w' ? 1 : 0, add = {};
  try {
    if (src === 'trap' && P.bait) {
      const p = posOf(P.sfen); p.doMove(p.fromUsi(P.bait)); const se = new E.Searcher(p), r = se.rootSearch({ time: 1500 });
      const rU = r.move ? p.toUsi(r.move) : null; p.undoMove();
      const sAfter = (() => { const q = posOf(P.sfen); q.doMove(q.fromUsi(P.bait)); return q; })();
      const mate = r.score > 30000 - 200;
      LANGS.forEach(l => { const x = name(P.sfen, P.bait, l, side), rr = rU ? nameP(sAfter, rU, l, 1 - side) : '?'; add[l] = fill((mate ? T.trapM : T.trap)[l], { x, r: rr, b: name(P.sfen, b, l, side) }); });
      nt++;
    } else if (src === 'evade') {
      const p = posOf(P.sfen), m = p.fromUsi(b), kind2 = b[1] === '*' ? 'evI' : E.typeOf(p.board[E.mFrom(m)]) === E.OU ? 'evK' : p.board[E.mTo(m)] ? 'evC' : 'evI';
      LANGS.forEach(l => { add[l] = fill(T[kind2][l], { b: name(P.sfen, b, l, side) }); });
    } else if (src === 'defend') {
      const parts = P.sfen.split(' '); parts[1] = parts[1] === 'b' ? 'w' : 'b';
      const q = posOf(parts.join(' ')), mn = /(\d+)手詰め/.exec(base.ja || ''), r = E.solveMate(q, mn ? +mn[1] : 5, 4e6, false);
      if (r && r.mate > 0 && r.pv && r.pv.length) { const tU = q.toUsi(r.pv[0]); LANGS.forEach(l => { add[l] = fill(T.def[l], { t: nameP(q, tU, l, 1 - side), b: name(P.sfen, b, l, side) }); }); }
      else LANGS.forEach(l => { add[l] = fill(T.best[l], { b: name(P.sfen, b, l, side) }); });
    } else LANGS.forEach(l => { add[l] = fill(T.best[l], { b: name(P.sfen, b, l, side) }); });
  } catch (e) { console.warn('skip', g.id, e.message); continue; }
  P.expl = {}; LANGS.forEach(l => { P.expl[l] = join(base[l] || base.en, add[l], l); });
  n++;
}
function nameP(pos, u, lang, side) {   // the same as name(), from a Position (the reply's position)
  const cjk = lang === 'ja' || lang === 'zh' || lang === 'zh-TW', mk = side ? '☖' : '☗';
  if (u[1] === '*') { const t = { P: 1, L: 2, N: 3, S: 4, B: 5, R: 6, G: 7 }[u[0]]; return cjk ? mk + ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96] + KJ[t] + '打' : u[0] + '*' + u.slice(2, 4); }
  const from = sqI(u.slice(0, 2)), to = sqI(u.slice(2, 4)), t = E.typeOf(pos.board[from]), cap = pos.board[to] !== 0, pro = u[4] === '+';
  return cjk ? mk + ZEN[+u[2]] + KAN[u.charCodeAt(3) - 96] + KJ[t] + (pro ? '成' : '') : WL[t] + (cap ? 'x' : '-') + u.slice(2, 4) + (pro ? '+' : '');
}
const compact = raw.split('\n').length < 5;
fs.writeFileSync(F, compact ? JSON.stringify(D) : JSON.stringify(D, null, 1));
console.log('rewrote', n, 'explanations (traps', nt + ')');
