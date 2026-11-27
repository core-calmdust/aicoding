/* =====================================================================
   Janggi puzzles: what the defender's reply did after a move off the solution (2026-11-24 担当D, claude/lesson-quality.md 追42).
   The mates go on after a wrong (not losing) move — no "mistake", it only costs the stars — and the defender answers with the
   engine's move. The words after it say the board's fact of that reply (its point marked red) and whether a mate is still there
   in the moves left (the solver's answer, asked by the caller):
     cap   — the reply took a piece of the attacker ({b} took your {p})
     esc   — the wrong move was a check; the general stepped out of it
     block — the wrong move was a check; another piece came between (or the cannon lost its screen)
     run   — a quiet wrong move; the general moved
     move  — a quiet wrong move; another piece moved
     pass  — the defender passed
     mated — the reply mated the attacker's general (a move that let it mate at once, pz.bl.lose: played on, not taken back — 追88)
   then reach ({n} moves left, a mate still there) or noreach (no mate in {n} any more).
   Used by the 2D page (janggi/app.js puzzleMove) and the 3D table (atlas/puzzles.js xqMoved, ショウギツネ's Japanese in
   atlas/games/janggi-pz.js AtlasJanggiPz.ja 'why.*'). Checked by tools/lesson-verify-janggi.js (追42: every wrong move × every reply).
   window.JanggiPzWhy = { why(E, mid, r) → { k, p, b }, name(lang, t, col), text(lang, k, v) } · module.exports the same (Node).
   ===================================================================== */
(function () {
  'use strict';
  // piece names: [general, guard, elephant, horse, chariot, cannon, soldier of 楚 (Cho), soldier of 漢 (Han)]
  const NAMES = {
    ja: ['将', '士', '象', '馬', '車', '包', '卒', '兵'],
    en: ['general', 'guard', 'elephant', 'horse', 'chariot', 'cannon', 'soldier', 'soldier'],
    zh: ['将', '士', '象', '马', '车', '包', '卒', '兵'],
    'zh-TW': ['將', '士', '象', '馬', '車', '包', '卒', '兵'],
    ko: ['궁', '사', '상', '마', '차', '포', '졸', '병'],
    es: ['general', 'consejero', 'elefante', 'caballo', 'carro', 'cañón', 'soldado', 'soldado'],
    fr: ['général', 'garde', 'éléphant', 'cheval', 'char', 'canon', 'soldat', 'soldat'],
    pt: ['general', 'guarda', 'elefante', 'cavalo', 'carro', 'canhão', 'soldado', 'soldado'],
    de: ['General', 'Leibwächter', 'Elefant', 'Pferd', 'Wagen', 'Kanone', 'Soldat', 'Soldat'],
    ru: ['генерал', 'советник', 'слон', 'конь', 'колесница', 'пушка', 'солдат', 'солдат'],
    tr: ['general', 'muhafız', 'fil', 'at', 'savaş arabası', 'top', 'asker', 'asker'],
    id: ['jenderal', 'pengawal', 'gajah', 'kuda', 'kereta', 'meriam', 'prajurit', 'prajurit'],
    hi: ['जनरल', 'रक्षक', 'हाथी', 'घोड़ा', 'रथ', 'तोप', 'सैनिक', 'सैनिक'],
    ar: ['القائد', 'الحارس', 'الفيل', 'الحصان', 'العربة', 'المدفع', 'الجندي', 'الجندي'],
  };
  // the 2D page's words (polite Japanese, as janggi/i18n.js pz.*); the 3D's Japanese is ショウギツネ's own (atlas/games/janggi-pz.js)
  const T = {
    ja: { cap: '相手の{b}が赤い印のあなたの{p}を取りました。', esc: '王手は、相手の将が赤い印の点へ逃げてかわしました。', block: '王手は、相手が{b}を赤い印の点へ動かして防ぎました。', run: '相手は将を赤い印の点へ動かしました。', move: '相手は{b}を赤い印の点へ動かしました。', mated: '相手の{b}が赤い印の点へ動き、あなたの将が詰まされました。', pass: '相手はパスしました。', reach: 'まだ残り{n}手で詰む手順があります。', noreach: 'これで残り{n}手では詰まなくなりました。', end: '' },
    en: { cap: 'The {b} took your {p} on the red point.', esc: 'The general stepped out of the check to the red point.', block: 'The opponent moved the {b} to the red point and stopped the check.', run: 'The opponent moved the general to the red point.', move: 'The opponent moved the {b} to the red point.', mated: 'The {b} moved to the red point and mated your general.', pass: 'The opponent passed.', reach: 'Moves left: {n} — a mate is still there.', noreach: 'Moves left: {n} — no mate any more.' },
    zh: { cap: '对方的{b}吃掉了红点上你的{p}。', esc: '对方的将走到红点，躲开了将军。', block: '对方把{b}走到红点，挡住了将军。', run: '对方把将走到了红点。', move: '对方把{b}走到了红点。', mated: '对方的{b}走到红点，把你的将将死了。', pass: '对方停了一步。', reach: '剩下的{n}步里仍然有杀法。', noreach: '这样剩下的{n}步里已经杀不了了。' },
    'zh-TW': { cap: '對方的{b}吃掉了紅點上你的{p}。', esc: '對方的將走到紅點，躲開了將軍。', block: '對方把{b}走到紅點，擋住了將軍。', run: '對方把將走到了紅點。', move: '對方把{b}走到了紅點。', mated: '對方的{b}走到紅點，把你的將將死了。', pass: '對方停了一步。', reach: '剩下的{n}步裡仍然有殺法。', noreach: '這樣剩下的{n}步裡已經殺不了了。' },
    ko: { cap: '빨간 표시의 내 {p} 말이 상대 {b}에게 잡혔어요.', esc: '상대의 궁이 빨간 표시로 피해 장군을 벗어났어요.', block: '상대가 {b} 말을 빨간 표시로 옮겨 장군을 막았어요.', run: '상대가 궁을 빨간 표시로 옮겼어요.', move: '상대가 {b} 말을 빨간 표시로 옮겼어요.', mated: '상대 {b} 말이 빨간 표시로 움직여 내 궁이 외통수에 걸렸어요.', pass: '상대가 한 수 쉬었어요.', reach: '남은 {n}수 안에 외통이 아직 있어요.', noreach: '이제 남은 {n}수로는 외통이 없어요.' },
    es: { cap: 'El {b} rival capturó tu {p} en el punto rojo.', esc: 'El general salió del jaque hacia el punto rojo.', block: 'El rival movió su {b} al punto rojo y cortó el jaque.', run: 'El rival movió el general al punto rojo.', move: 'El rival movió su {b} al punto rojo.', mated: 'El {b} rival fue al punto rojo y dio mate a tu general.', pass: 'El rival pasó.', reach: 'Jugadas restantes: {n}; aún hay mate.', noreach: 'Jugadas restantes: {n}; ya no hay mate.' },
    fr: { cap: 'Le {b} adverse a pris ton {p} sur le point rouge.', esc: 'Le général est sorti de l’échec vers le point rouge.', block: 'L’adversaire a mis son {b} sur le point rouge et paré l’échec.', run: 'L’adversaire a déplacé le général sur le point rouge.', move: 'L’adversaire a déplacé son {b} sur le point rouge.', mated: 'Le {b} adverse est allé sur le point rouge et a maté ton général.', pass: 'L’adversaire a passé.', reach: 'Coups restants : {n} ; le mat est encore là.', noreach: 'Coups restants : {n} ; plus de mat possible.' },
    pt: { cap: 'O {b} adversário capturou seu {p} no ponto vermelho.', esc: 'O general saiu do xeque para o ponto vermelho.', block: 'O adversário pôs o {b} no ponto vermelho e bloqueou o xeque.', run: 'O adversário moveu o general para o ponto vermelho.', move: 'O adversário moveu o {b} para o ponto vermelho.', mated: 'O {b} adversário foi ao ponto vermelho e deu mate no seu general.', pass: 'O adversário passou.', reach: 'Lances restantes: {n}; ainda há mate.', noreach: 'Lances restantes: {n}; não há mais mate.' },
    de: { cap: 'Der gegnerische {b} hat deinen {p} auf dem roten Punkt geschlagen.', esc: 'Der General ist dem Schach auf den roten Punkt ausgewichen.', block: 'Der Gegner hat seinen {b} auf den roten Punkt gezogen und das Schach abgewehrt.', run: 'Der Gegner hat den General auf den roten Punkt gezogen.', move: 'Der Gegner hat seinen {b} auf den roten Punkt gezogen.', mated: 'Der gegnerische {b} zog auf den roten Punkt und setzte deinen General matt.', pass: 'Der Gegner hat gepasst.', reach: 'Verbleibende Züge: {n} – ein Matt ist noch drin.', noreach: 'Verbleibende Züge: {n} – kein Matt mehr.' },
    ru: { cap: 'Фигура соперника ({b}) взяла твою фигуру ({p}) на красной точке.', esc: 'Генерал ушёл от шаха на красную точку.', block: 'Соперник поставил фигуру ({b}) на красную точку и закрылся от шаха.', run: 'Соперник перевёл генерала на красную точку.', move: 'Соперник пошёл фигурой ({b}) на красную точку.', mated: 'Фигура соперника ({b}) пошла на красную точку и поставила мат твоему генералу.', pass: 'Соперник пропустил ход.', reach: 'Осталось ходов: {n} — мат ещё есть.', noreach: 'Осталось ходов: {n} — мата больше нет.' },
    tr: { cap: 'Rakibin taşı ({b}) kırmızı noktadaki taşını ({p}) aldı.', esc: 'General şahtan kırmızı noktaya kaçtı.', block: 'Rakip taşını ({b}) kırmızı noktaya sürüp şahı kesti.', run: 'Rakip generali kırmızı noktaya sürdü.', move: 'Rakip taşını ({b}) kırmızı noktaya sürdü.', mated: 'Rakibin taşı ({b}) kırmızı noktaya gidip generaline mat yaptı.', pass: 'Rakip pas geçti.', reach: 'Kalan hamle: {n} — hâlâ mat var.', noreach: 'Kalan hamle: {n} — artık mat yok.' },
    id: { cap: '{b} lawan memakan {p} milikmu di titik merah.', esc: 'Jenderal lawan lolos dari skak ke titik merah.', block: 'Lawan memindahkan {b} ke titik merah dan menahan skak.', run: 'Lawan memindahkan jenderal ke titik merah.', move: 'Lawan memindahkan {b} ke titik merah.', mated: '{b} lawan pindah ke titik merah dan men-skakmat jenderalmu.', pass: 'Lawan melewatkan giliran.', reach: 'Masih ada skakmat dalam {n} langkah tersisa.', noreach: 'Sekarang tidak ada skakmat dalam {n} langkah tersisa.' },
    hi: { cap: 'विरोधी के {b} ने लाल बिंदु पर तुम्हारा {p} ले लिया।', esc: 'जनरल शह से बचकर लाल बिंदु पर चला गया।', block: 'विरोधी ने {b} को लाल बिंदु पर रखकर शह रोक दी।', run: 'विरोधी ने जनरल को लाल बिंदु पर चलाया।', move: 'विरोधी ने {b} को लाल बिंदु पर चलाया।', mated: 'विरोधी का {b} लाल बिंदु पर गया और तुम्हारे जनरल को मात दे दी।', pass: 'विरोधी ने चाल छोड़ दी।', reach: 'बची {n} चालों में अभी भी मात है।', noreach: 'अब बची {n} चालों में मात नहीं है।' },
    ar: { cap: 'أخذ {b} الخصم {p} الخاص بك على النقطة الحمراء.', esc: 'خرج القائد من الكش إلى النقطة الحمراء.', block: 'حرّك الخصم {b} إلى النقطة الحمراء وصدّ الكش.', run: 'حرّك الخصم القائد إلى النقطة الحمراء.', move: 'حرّك الخصم {b} إلى النقطة الحمراء.', mated: 'تحرّك {b} الخصم إلى النقطة الحمراء وأوقع قائدك في كش مات.', pass: 'مرّر الخصم دوره.', reach: 'ما زال هناك مات في النقلات الـ{n} الباقية.', noreach: 'لم يعد هناك مات في النقلات الـ{n} الباقية.' },
  };
  // a piece's name: t = its type (1..7), col = its colour (0 Cho / 1 Han; the soldiers differ in the hanja languages)
  const name = (lang, t, col) => { const L = NAMES[lang] || NAMES.en; return t === 7 ? L[col ? 7 : 6] : L[(t | 0) - 1] || ''; };
  // the reply r after the wrong move (mid = the position after it, the defender to move): the class and the pieces it is about
  function why(E, mid, r) {
    if (E.isPass(r)) return { k: 'pass' };
    const f = E.mFrom(r), t = E.mTo(r), a = mid.at(f), x = mid.at(t), b = { t: E.typeOf(a), c: E.colorOf(a) };
    if (mid.clone().play(r).status() === -1) return { k: 'mated', b };   // (the reply mates: after pz.bl.lose, played on — 追88)
    if (x) return { k: 'cap', b, p: { t: E.typeOf(x), c: E.colorOf(x) } };
    const ck = mid.inCheck(), king = b.t === E.KING;
    return { k: ck ? (king ? 'esc' : 'block') : (king ? 'run' : 'move'), b };
  }
  // the defender's reply after a move that lets it mate at once (pz.bl.lose): the first mating move, the same on the 2D and the 3D (追88 ⑨)
  const mateReply = (E, mid) => { for (const r of mid.moves()) if (!E.isPass(r) && mid.clone().play(r).status() === -1) return r; return null; };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, q) => v && v[q] != null ? v[q] : '');
  // the line for class k in lang (v: { b, p } = piece names, n = moves left); arrays pick by v.j
  const text = (lang, k, v, own) => { const S = (own && own[k]) || (T[lang] || T.en)[k] || T.en[k]; const x = Array.isArray(S) ? S[((v && v.j) | 0) % S.length] : S; return fill(x, v); };
  // the whole message: the fact, then reach / noreach (null = the count is used up: the caller says it is out)
  const say = (lang, w, reach, n, own, j) => {
    const v = { b: w.b ? name(lang, w.b.t, w.b.c) : '', p: w.p ? name(lang, w.p.t, w.p.c) : '', n, j };
    return text(lang, w.k, v, own) + (reach == null ? '' : ' ' + text(lang, reach ? 'reach' : 'noreach', v, own));
  };
  const API = { why, mateReply, name, text, say, NAMES, T };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.JanggiPzWhy = API;
})();
