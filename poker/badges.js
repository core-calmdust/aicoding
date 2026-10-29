/* ポーカー — badges (poker/badges.js)
   Images: img/badges/*.webp (Designed by Freepik — "Poker glossy labels set", see img/badges/CREDITS.txt).
   Play badges are won at the table (big hands, all-in wins, big pots), lesson badges by passing every lesson of a
   lesson category. A won badge pops up over the table; the collection is in the statistics dialog and the lessons.
   Storage: localStorage 'aicoding-poker-badges' = { key: { n, first } }. */
(function () {
'use strict';
const A = window.PokerApp, P = window.PK, $ = s => document.querySelector(s);
const STORE = 'aicoding-poker-badges', IMG = 'img/badges/';
let B = {}; try { B = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(B)); } catch (e) {} };
// order of the collection: play badges, then lesson badges
const PLAY = ['royal', 'fourkings', 'horseshoe', 'fortune', 'allin', 'chip'];
const LESSON = { basic: 'holdem', math: 'nolimit', pre: 'vip', post: 'pokerdeco', games: 'casino' };
const ALLL = 'vipmembers';
const ORDER = PLAY.concat(Object.values(LESSON), [ALLL]);
const esc = s => A.esc(s);
const L = (k, v) => { const T = TX[A.LANG] || TX.en; let x = T[k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k] || k; if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
const has = k => !!(B[k] && B[k].n);
const img = (k, cls) => `<img class="bdg${cls ? ' ' + cls : ''}${has(k) ? '' : ' locked'}" src="${IMG}${k}.webp" alt="${esc(L('n.' + k))}" draggable="false" decoding="async">`;

function award(k, sub) {
  const first = !has(k);
  B[k] = { n: ((B[k] && B[k].n) || 0) + 1, first: (B[k] && B[k].first) || Date.now() };
  save(); pop(k, first, sub);
}
/* the pop-up over the table (click to close) */
let popT = 0, queue = [];
function pop(k, first, sub) {
  if (document.querySelector('#bdgPop.show')) { queue.push([k, first, sub]); return; }
  let el = $('#bdgPop');
  if (!el) { el = document.createElement('div'); el.id = 'bdgPop'; document.body.appendChild(el); el.onclick = close; }
  el.innerHTML = `<div class="bp-in"><div class="bp-rays"></div><img src="${IMG}${k}.webp" alt=""><small>${esc(first ? L('new') : L('again', { n: B[k].n }))}</small><b>${esc(L('n.' + k))}</b><span>${esc(sub || L('d.' + k))}</span></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  A.sfx('win');
  clearTimeout(popT); popT = setTimeout(close, first ? 3600 : 2600);
}
function close() { const el = $('#bdgPop'); if (el) el.classList.remove('show'); clearTimeout(popT); if (queue.length) { const q = queue.shift(); setTimeout(() => pop(...q), 250); } }

/* after a hand (app.js handOver): the player's winning hand */
function checkHand(T) {
  if (!T || T.tut || !T.result) return;
  const R = T.result, me = 0; if (!(R.won[me] > 0)) return;
  const pot = R.pots.reduce((a, p) => a + p.amt, 0), mine = R.pots.some(p => p.winners.includes(me));
  if (!mine) return;
  if (R.showdown && !T.seats[me].folded) {
    const info = P.handInfo(T, me), cat = info.cat;
    if (cat === 'sf') { const top = Math.max(...info.five.map(P.V)), wheel = info.five.map(P.V).includes(5) && top === 14; award('royal', top === 14 && !wheel ? L('royalTop') : A.t('hand.sf')); }
    else if (cat === 'quads') award('fourkings', A.t('hand.quads'));
    else if (cat === 'full') award('horseshoe', A.t('hand.full'));
    else if (cat === 'flush') award('fortune', A.t('hand.flush'));
    if (T.seats[me].allin || T.seats.some(s => s.i !== me && s.allin && !s.folded)) award('allin', L('d.allin'));
  }
  if (pot >= T.bb * 50) award('chip', L('potOf', { n: pot }));
}
/* after a lesson is passed (lessons.js): categories completed */
function checkLessons(cats, passed) {
  let all = true;
  cats.forEach(c => {
    const done = c.items.every(([id]) => passed(id));
    if (!done) all = false;
    const k = LESSON[c.id]; if (done && k && !has(k)) award(k, L('lessonDone'));
  });
  if (all && !has(ALLL)) award(ALLL, L('d.' + ALLL));
}
/* the collection (statistics dialog) */
function collection() {
  const n = ORDER.filter(has).length;
  return `<div class="bdg-col"><div class="bdg-h"><b>${esc(L('title'))}</b><small>${n} / ${ORDER.length}</small></div><div class="bdg-grid">` +
    ORDER.map(k => `<div class="bdg-c${has(k) ? ' got' : ''}" title="${esc(L('d.' + k))}">${img(k)}<b>${esc(has(k) ? L('n.' + k) : '？？？')}</b><small>${esc(L('d.' + k))}</small>${has(k) && B[k].n > 1 ? `<em>×${B[k].n}</em>` : ''}</div>`).join('') + `</div></div>`;
}

const TX = {
ja: {
  title: 'バッジ', new: 'バッジ獲得！', again: '{n}回目', royalTop: 'ロイヤルフラッシュ', potOf: '{n} チップの大きなポットを獲得', lessonDone: 'このカテゴリのレッスンをすべて合格',
  'n.royal': 'Royal Flush', 'd.royal': 'ストレートフラッシュ以上で勝つ',
  'n.fourkings': 'Four Kings', 'd.fourkings': 'フォーカードで勝つ',
  'n.horseshoe': 'Golden Horseshoe', 'd.horseshoe': 'フルハウスで勝つ',
  'n.fortune': 'Fortune', 'd.fortune': 'フラッシュで勝つ',
  'n.allin': 'All-In', 'd.allin': 'オールインの勝負に勝つ',
  'n.chip': 'Golden Chip', 'd.chip': '50BB以上のポットを獲得する',
  'n.holdem': 'Poker Room', 'd.holdem': 'レッスン「はじめの一歩」をすべて合格',
  'n.nolimit': 'No Limit', 'd.nolimit': 'レッスン「確率と期待値」をすべて合格',
  'n.vip': 'VIP Poker', 'd.vip': 'レッスン「プリフロップ」をすべて合格',
  'n.pokerdeco': 'Poker Master', 'd.pokerdeco': 'レッスン「フロップ以降」をすべて合格',
  'n.casino': 'Casino Club', 'd.casino': 'レッスン「いろいろなポーカー」をすべて合格',
  'n.vipmembers': 'VIP Members', 'd.vipmembers': '18のレッスンをすべて合格',
  lessonBadge: '全部合格でバッジ', lessonGot: 'バッジ獲得済み',
},
en: {
  title: 'Badges', new: 'Badge unlocked!', again: '{n} times', royalTop: 'Royal flush', potOf: 'Won a big pot of {n} chips', lessonDone: 'Passed every lesson of this category',
  'n.royal': 'Royal Flush', 'd.royal': 'Win with a straight flush or better',
  'n.fourkings': 'Four Kings', 'd.fourkings': 'Win with four of a kind',
  'n.horseshoe': 'Golden Horseshoe', 'd.horseshoe': 'Win with a full house',
  'n.fortune': 'Fortune', 'd.fortune': 'Win with a flush',
  'n.allin': 'All-In', 'd.allin': 'Win an all-in showdown',
  'n.chip': 'Golden Chip', 'd.chip': 'Win a pot of 50BB or more',
  'n.holdem': 'Poker Room', 'd.holdem': 'Pass every lesson of “First steps”',
  'n.nolimit': 'No Limit', 'd.nolimit': 'Pass every lesson of “Odds & EV”',
  'n.vip': 'VIP Poker', 'd.vip': 'Pass every lesson of “Preflop”',
  'n.pokerdeco': 'Poker Master', 'd.pokerdeco': 'Pass every lesson of “After the flop”',
  'n.casino': 'Casino Club', 'd.casino': 'Pass every lesson of “Other pokers”',
  'n.vipmembers': 'VIP Members', 'd.vipmembers': 'Pass all 18 lessons',
  lessonBadge: 'Pass them all for a badge', lessonGot: 'Badge earned',
},
zh: {"title": "徽章", "new": "获得徽章！", "again": "第{n}次", "royalTop": "皇家同花顺", "potOf": "赢得了 {n} 筹码的大底池", "lessonDone": "通过了该类别的全部课程", "n.royal": "Royal Flush", "d.royal": "以同花顺或更大的牌型获胜", "n.fourkings": "Four Kings", "d.fourkings": "以四条获胜", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "以葫芦获胜", "n.fortune": "Fortune", "d.fortune": "以同花获胜", "n.allin": "All-In", "d.allin": "赢下全押对决", "n.chip": "Golden Chip", "d.chip": "赢得 50BB 或以上的底池", "n.holdem": "Poker Room", "d.holdem": "通过“入门第一步”的全部课程", "n.nolimit": "No Limit", "d.nolimit": "通过“概率与期望值”的全部课程", "n.vip": "VIP Poker", "d.vip": "通过“翻牌前”的全部课程", "n.pokerdeco": "Poker Master", "d.pokerdeco": "通过“翻牌之后”的全部课程", "n.casino": "Casino Club", "d.casino": "通过“其他扑克”的全部课程", "n.vipmembers": "VIP Members", "d.vipmembers": "通过全部 18 节课程", "lessonBadge": "全部通过即可获得徽章", "lessonGot": "已获得徽章"},
ko: {"title": "배지", "new": "배지 획득!", "again": "{n}번째", "royalTop": "로열 플러시", "potOf": "{n} 칩의 큰 팟을 획득", "lessonDone": "이 카테고리의 레슨을 모두 합격", "n.royal": "Royal Flush", "d.royal": "스트레이트 플러시 이상으로 승리", "n.fourkings": "Four Kings", "d.fourkings": "포카드로 승리", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "풀하우스로 승리", "n.fortune": "Fortune", "d.fortune": "플러시로 승리", "n.allin": "All-In", "d.allin": "올인 승부에서 승리", "n.chip": "Golden Chip", "d.chip": "50BB 이상의 팟을 획득", "n.holdem": "Poker Room", "d.holdem": "레슨 「첫걸음」을 모두 합격", "n.nolimit": "No Limit", "d.nolimit": "레슨 「확률과 기댓값」을 모두 합격", "n.vip": "VIP Poker", "d.vip": "레슨 「프리플롭」을 모두 합격", "n.pokerdeco": "Poker Master", "d.pokerdeco": "레슨 「플롭 이후」를 모두 합격", "n.casino": "Casino Club", "d.casino": "레슨 「다양한 포커」를 모두 합격", "n.vipmembers": "VIP Members", "d.vipmembers": "18개 레슨을 모두 합격", "lessonBadge": "모두 합격하면 배지", "lessonGot": "배지 획득 완료"},
es: {"title": "Insignias", "new": "¡Insignia desbloqueada!", "again": "{n} veces", "royalTop": "Escalera real", "potOf": "Ganaste un gran bote de {n} fichas", "lessonDone": "Superaste todas las lecciones de esta categoría", "n.royal": "Royal Flush", "d.royal": "Gana con escalera de color o mejor", "n.fourkings": "Four Kings", "d.fourkings": "Gana con póker", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "Gana con full", "n.fortune": "Fortune", "d.fortune": "Gana con color", "n.allin": "All-In", "d.allin": "Gana un enfrentamiento all-in", "n.chip": "Golden Chip", "d.chip": "Gana un bote de 50BB o más", "n.holdem": "Poker Room", "d.holdem": "Supera todas las lecciones de «Primeros pasos»", "n.nolimit": "No Limit", "d.nolimit": "Supera todas las lecciones de «Probabilidades y EV»", "n.vip": "VIP Poker", "d.vip": "Supera todas las lecciones de «Preflop»", "n.pokerdeco": "Poker Master", "d.pokerdeco": "Supera todas las lecciones de «Después del flop»", "n.casino": "Casino Club", "d.casino": "Supera todas las lecciones de «Otros pókeres»", "n.vipmembers": "VIP Members", "d.vipmembers": "Supera las 18 lecciones", "lessonBadge": "Supéralas todas para obtener una insignia", "lessonGot": "Insignia obtenida"},
fr: {"title": "Badges", "new": "Badge débloqué !", "again": "{n} fois", "royalTop": "Quinte flush royale", "potOf": "Gros pot de {n} jetons remporté", "lessonDone": "Toutes les leçons de cette catégorie réussies", "n.royal": "Royal Flush", "d.royal": "Gagner avec une quinte flush ou mieux", "n.fourkings": "Four Kings", "d.fourkings": "Gagner avec un carré", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "Gagner avec un full", "n.fortune": "Fortune", "d.fortune": "Gagner avec une couleur", "n.allin": "All-In", "d.allin": "Gagner un abattage à tapis", "n.chip": "Golden Chip", "d.chip": "Remporter un pot de 50 BB ou plus", "n.holdem": "Poker Room", "d.holdem": "Réussir toutes les leçons de « Premiers pas »", "n.nolimit": "No Limit", "d.nolimit": "Réussir toutes les leçons de « Probabilités et EV »", "n.vip": "VIP Poker", "d.vip": "Réussir toutes les leçons de « Préflop »", "n.pokerdeco": "Poker Master", "d.pokerdeco": "Réussir toutes les leçons de « Après le flop »", "n.casino": "Casino Club", "d.casino": "Réussir toutes les leçons de « Autres pokers »", "n.vipmembers": "VIP Members", "d.vipmembers": "Réussir les 18 leçons", "lessonBadge": "Réussissez-les toutes pour un badge", "lessonGot": "Badge obtenu"},
pt: {"title": "Emblemas", "new": "Emblema desbloqueado!", "again": "{n} vezes", "royalTop": "Royal flush", "potOf": "Ganhou um pote grande de {n} fichas", "lessonDone": "Passou em todas as lições desta categoria", "n.royal": "Royal Flush", "d.royal": "Vença com straight flush ou melhor", "n.fourkings": "Four Kings", "d.fourkings": "Vença com quadra", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "Vença com full house", "n.fortune": "Fortune", "d.fortune": "Vença com flush", "n.allin": "All-In", "d.allin": "Vença um confronto de all-in", "n.chip": "Golden Chip", "d.chip": "Ganhe um pote de 50BB ou mais", "n.holdem": "Poker Room", "d.holdem": "Passe em todas as lições de “Primeiros passos”", "n.nolimit": "No Limit", "d.nolimit": "Passe em todas as lições de “Probabilidades e EV”", "n.vip": "VIP Poker", "d.vip": "Passe em todas as lições de “Pré-flop”", "n.pokerdeco": "Poker Master", "d.pokerdeco": "Passe em todas as lições de “Depois do flop”", "n.casino": "Casino Club", "d.casino": "Passe em todas as lições de “Outros pôqueres”", "n.vipmembers": "VIP Members", "d.vipmembers": "Passe nas 18 lições", "lessonBadge": "Passe em todas para ganhar um emblema", "lessonGot": "Emblema conquistado"},
de: {"title": "Abzeichen", "new": "Abzeichen freigeschaltet!", "again": "{n}-mal", "royalTop": "Royal Flush", "potOf": "Großen Pot von {n} Chips gewonnen", "lessonDone": "Alle Lektionen dieser Kategorie bestanden", "n.royal": "Royal Flush", "d.royal": "Gewinne mit Straight Flush oder besser", "n.fourkings": "Four Kings", "d.fourkings": "Gewinne mit einem Vierling", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "Gewinne mit einem Full House", "n.fortune": "Fortune", "d.fortune": "Gewinne mit einem Flush", "n.allin": "All-In", "d.allin": "Gewinne einen All-in-Showdown", "n.chip": "Golden Chip", "d.chip": "Gewinne einen Pot von 50 BB oder mehr", "n.holdem": "Poker Room", "d.holdem": "Bestehe alle Lektionen von „Erste Schritte“", "n.nolimit": "No Limit", "d.nolimit": "Bestehe alle Lektionen von „Odds & EV“", "n.vip": "VIP Poker", "d.vip": "Bestehe alle Lektionen von „Preflop“", "n.pokerdeco": "Poker Master", "d.pokerdeco": "Bestehe alle Lektionen von „Nach dem Flop“", "n.casino": "Casino Club", "d.casino": "Bestehe alle Lektionen von „Andere Pokervarianten“", "n.vipmembers": "VIP Members", "d.vipmembers": "Bestehe alle 18 Lektionen", "lessonBadge": "Alle bestehen für ein Abzeichen", "lessonGot": "Abzeichen erhalten"},
hi: {"title": "बैज", "new": "बैज अनलॉक हुआ!", "again": "{n} बार", "royalTop": "रॉयल फ्लश", "potOf": "{n} चिप्स का बड़ा पॉट जीता", "lessonDone": "इस श्रेणी के सभी पाठ पास किए", "n.royal": "Royal Flush", "d.royal": "स्ट्रेट फ्लश या उससे बेहतर से जीतें", "n.fourkings": "Four Kings", "d.fourkings": "फोर ऑफ़ अ काइंड से जीतें", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "फुल हाउस से जीतें", "n.fortune": "Fortune", "d.fortune": "फ्लश से जीतें", "n.allin": "All-In", "d.allin": "ऑल-इन शोडाउन जीतें", "n.chip": "Golden Chip", "d.chip": "50BB या उससे अधिक का पॉट जीतें", "n.holdem": "Poker Room", "d.holdem": "“पहले कदम” के सभी पाठ पास करें", "n.nolimit": "No Limit", "d.nolimit": "“ऑड्स और EV” के सभी पाठ पास करें", "n.vip": "VIP Poker", "d.vip": "“प्रीफ्लॉप” के सभी पाठ पास करें", "n.pokerdeco": "Poker Master", "d.pokerdeco": "“फ्लॉप के बाद” के सभी पाठ पास करें", "n.casino": "Casino Club", "d.casino": "“अन्य पोकर” के सभी पाठ पास करें", "n.vipmembers": "VIP Members", "d.vipmembers": "सभी 18 पाठ पास करें", "lessonBadge": "सभी पास करने पर बैज", "lessonGot": "बैज मिल गया"},
ar: {"title": "الشارات", "new": "تم فتح شارة!", "again": "{n} مرات", "royalTop": "رويال فلاش", "potOf": "ربحت وعاءً كبيرًا من {n} رقاقة", "lessonDone": "اجتزت جميع دروس هذه الفئة", "n.royal": "Royal Flush", "d.royal": "افز بستريت فلاش أو أفضل", "n.fourkings": "Four Kings", "d.fourkings": "افز بأربعة من نوع واحد", "n.horseshoe": "Golden Horseshoe", "d.horseshoe": "افز بفل هاوس", "n.fortune": "Fortune", "d.fortune": "افز بفلاش", "n.allin": "All-In", "d.allin": "افز في مواجهة أول-إن", "n.chip": "Golden Chip", "d.chip": "اربح وعاءً بقيمة 50BB أو أكثر", "n.holdem": "Poker Room", "d.holdem": "اجتز جميع دروس «الخطوات الأولى»", "n.nolimit": "No Limit", "d.nolimit": "اجتز جميع دروس «الاحتمالات والقيمة المتوقعة»", "n.vip": "VIP Poker", "d.vip": "اجتز جميع دروس «ما قبل الفلوب»", "n.pokerdeco": "Poker Master", "d.pokerdeco": "اجتز جميع دروس «ما بعد الفلوب»", "n.casino": "Casino Club", "d.casino": "اجتز جميع دروس «أنواع البوكر الأخرى»", "n.vipmembers": "VIP Members", "d.vipmembers": "اجتز جميع الدروس الـ18", "lessonBadge": "اجتزها كلها لتحصل على شارة", "lessonGot": "تم الحصول على الشارة"}
};
window.PokerBadges = { award, checkHand, checkLessons, collection, img, has, LESSON, ALLL, ORDER, L, TX };
})();
