/* =====================================================================
   Xiangqi mates: what the defender's reply did after a move off the solution (2026-11-24 担当A, claude/lesson-quality.md 追42・追20;
   the same classes as janggi/pzwhy.js).
   The mates go on after a wrong (not losing) move — it only costs the stars — and the defender answers with the engine's move. The
   words after it say the board's fact of that reply (its point marked red) and whether a mate is still there in the moves left
   (the solver's answer, asked by the caller):
     cap   — the reply took a piece of the attacker ({b} took your {p})
     esc   — the wrong move was a check; the general stepped out of it
     block — the wrong move was a check; another piece came between, took no piece (or the cannon lost its screen)
     run   — a quiet wrong move; the general moved
     move  — a quiet wrong move; another piece moved
   then reach ({n} moves left, a mate still there) or noreach (no mate in {n} any more). No praise (追20).
   Used by the 2D page (xiangqi/app.js puzzleMove) and the 3D table (atlas/puzzles.js xqMoved → xqStray, ショウギツネ's Japanese in
   OWN.ja below). Checked by tools/lesson-verify.js xiangqi (追42: every wrong move × every reply of every mate of 2 moves or more).
   window.XiangqiPzWhy = { why(E, mid, r) → { k, p, b }, name(lang, t, col), text, say, T, OWN } · module.exports the same (Node).
   ===================================================================== */
(function () {
  'use strict';
  // piece names by type 1..7 (general, advisor, elephant, horse, chariot, cannon, soldier): [Red, Black] where the hanzi differ
  const NAMES = {
    ja: [['帥', '仕', '相', '馬', '車', '炮', '兵'], ['將', '士', '象', '馬', '車', '炮', '卒']],
    zh: [['帅', '仕', '相', '马', '车', '炮', '兵'], ['将', '士', '象', '马', '车', '炮', '卒']],
    'zh-TW': [['帥', '仕', '相', '馬', '車', '炮', '兵'], ['將', '士', '象', '馬', '車', '炮', '卒']],
    en: ['general', 'advisor', 'elephant', 'horse', 'chariot', 'cannon', 'soldier'],
    ko: ['장', '사', '상', '마', '차', '포', '졸'],
    es: ['general', 'consejero', 'elefante', 'caballo', 'carro', 'cañón', 'soldado'],
    fr: ['général', 'conseiller', 'éléphant', 'cheval', 'char', 'canon', 'soldat'],
    pt: ['general', 'conselheiro', 'elefante', 'cavalo', 'carro', 'canhão', 'soldado'],
    de: ['General', 'Berater', 'Elefant', 'Pferd', 'Wagen', 'Kanone', 'Soldat'],
    ru: ['генерал', 'советник', 'слон', 'конь', 'колесница', 'пушка', 'солдат'],
    tr: ['general', 'danışman', 'fil', 'at', 'savaş arabası', 'top', 'asker'],
    id: ['jenderal', 'penasihat', 'gajah', 'kuda', 'kereta', 'meriam', 'prajurit'],
    hi: ['जनरल', 'सलाहकार', 'हाथी', 'घोड़ा', 'रथ', 'तोप', 'सैनिक'],
    ar: ['القائد', 'المستشار', 'الفيل', 'الحصان', 'العربة', 'المدفع', 'الجندي'],
  };
  // the 2D page's words (polite Japanese, as xiangqi/i18n.js pz.*); {g} = the defender's general
  const T = {
    ja: { cap: '相手の{b}が、赤い印のあなたの{p}を取りました。', esc: '王手は、相手の{g}が赤い印の点へ逃げてかわしました。', block: '王手は、相手が{b}を赤い印の点へ動かして防ぎました。', run: '相手は{g}を赤い印の点へ動かしました。', move: '相手は{b}を赤い印の点へ動かしました。', reach: 'まだ残り{n}手で詰む手順があります。', noreach: 'これで残り{n}手では詰まなくなりました。' },
    en: { cap: 'The {b} took your {p} on the red point.', esc: 'The {g} stepped out of the check to the red point.', block: 'The opponent moved the {b} to the red point and stopped the check.', run: 'The opponent moved the {g} to the red point.', move: 'The opponent moved the {b} to the red point.', reach: 'Moves left: {n} — a mate is still there.', noreach: 'Moves left: {n} — no mate any more.' },
    zh: { cap: '对方的{b}吃掉了红点上你的{p}。', esc: '对方的{g}走到红点，躲开了将军。', block: '对方把{b}走到红点，挡住了将军。', run: '对方把{g}走到了红点。', move: '对方把{b}走到了红点。', reach: '剩下的{n}步里仍然有杀法。', noreach: '这样剩下的{n}步里已经杀不了了。' },
    'zh-TW': { cap: '對方的{b}吃掉了紅點上你的{p}。', esc: '對方的{g}走到紅點，躲開了將軍。', block: '對方把{b}走到紅點，擋住了將軍。', run: '對方把{g}走到了紅點。', move: '對方把{b}走到了紅點。', reach: '剩下的{n}步裡仍然有殺法。', noreach: '這樣剩下的{n}步裡已經殺不了了。' },
    ko: { cap: '빨간 표시의 내 {p} 말이 상대 {b} 말에게 잡혔어요.', esc: '상대의 {g} 말이 빨간 표시로 피해 장군을 벗어났어요.', block: '상대가 {b} 말을 빨간 표시로 옮겨 장군을 막았어요.', run: '상대가 {g} 말을 빨간 표시로 옮겼어요.', move: '상대가 {b} 말을 빨간 표시로 옮겼어요.', reach: '남은 {n}수 안에 외통이 아직 있어요.', noreach: '이제 남은 {n}수로는 외통이 없어요.' },
    es: { cap: 'El {b} rival capturó tu {p} en el punto rojo.', esc: 'El {g} salió del jaque hacia el punto rojo.', block: 'El rival movió su {b} al punto rojo y cortó el jaque.', run: 'El rival movió el {g} al punto rojo.', move: 'El rival movió su {b} al punto rojo.', reach: 'Jugadas restantes: {n}; aún hay mate.', noreach: 'Jugadas restantes: {n}; ya no hay mate.' },
    fr: { cap: 'Le {b} adverse a pris ton {p} sur le point rouge.', esc: 'Le {g} est sorti de l’échec vers le point rouge.', block: 'L’adversaire a mis son {b} sur le point rouge et paré l’échec.', run: 'L’adversaire a déplacé le {g} sur le point rouge.', move: 'L’adversaire a déplacé son {b} sur le point rouge.', reach: 'Coups restants : {n} ; le mat est encore là.', noreach: 'Coups restants : {n} ; plus de mat possible.' },
    pt: { cap: 'O {b} adversário capturou seu {p} no ponto vermelho.', esc: 'O {g} saiu do xeque para o ponto vermelho.', block: 'O adversário pôs o {b} no ponto vermelho e bloqueou o xeque.', run: 'O adversário moveu o {g} para o ponto vermelho.', move: 'O adversário moveu o {b} para o ponto vermelho.', reach: 'Lances restantes: {n}; ainda há mate.', noreach: 'Lances restantes: {n}; não há mais mate.' },
    de: { cap: 'Der gegnerische {b} hat deinen {p} auf dem roten Punkt geschlagen.', esc: 'Der {g} ist dem Schach auf den roten Punkt ausgewichen.', block: 'Der Gegner hat seinen {b} auf den roten Punkt gezogen und das Schach abgewehrt.', run: 'Der Gegner hat den {g} auf den roten Punkt gezogen.', move: 'Der Gegner hat seinen {b} auf den roten Punkt gezogen.', reach: 'Verbleibende Züge: {n} – ein Matt ist noch drin.', noreach: 'Verbleibende Züge: {n} – kein Matt mehr.' },
    ru: { cap: 'Фигура соперника ({b}) взяла твою фигуру ({p}) на красной точке.', esc: 'Генерал ушёл от шаха на красную точку.', block: 'Соперник поставил фигуру ({b}) на красную точку и закрылся от шаха.', run: 'Соперник перевёл генерала на красную точку.', move: 'Соперник пошёл фигурой ({b}) на красную точку.', reach: 'Осталось ходов: {n} — мат ещё есть.', noreach: 'Осталось ходов: {n} — мата больше нет.' },
    tr: { cap: 'Rakibin taşı ({b}) kırmızı noktadaki taşını ({p}) aldı.', esc: 'General şahtan kırmızı noktaya kaçtı.', block: 'Rakip taşını ({b}) kırmızı noktaya sürüp şahı kesti.', run: 'Rakip generali kırmızı noktaya sürdü.', move: 'Rakip taşını ({b}) kırmızı noktaya sürdü.', reach: 'Kalan hamle: {n} — hâlâ mat var.', noreach: 'Kalan hamle: {n} — artık mat yok.' },
    id: { cap: '{b} lawan memakan {p} milikmu di titik merah.', esc: 'Jenderal lawan lolos dari skak ke titik merah.', block: 'Lawan memindahkan {b} ke titik merah dan menahan skak.', run: 'Lawan memindahkan jenderal ke titik merah.', move: 'Lawan memindahkan {b} ke titik merah.', reach: 'Masih ada skakmat dalam {n} langkah tersisa.', noreach: 'Sekarang tidak ada skakmat dalam {n} langkah tersisa.' },
    hi: { cap: 'विरोधी के {b} ने लाल बिंदु पर तुम्हारा {p} ले लिया।', esc: 'जनरल शह से बचकर लाल बिंदु पर चला गया।', block: 'विरोधी ने {b} को लाल बिंदु पर रखकर शह रोक दी।', run: 'विरोधी ने जनरल को लाल बिंदु पर चलाया।', move: 'विरोधी ने {b} को लाल बिंदु पर चलाया।', reach: 'बची {n} चालों में अभी भी मात है।', noreach: 'अब बची {n} चालों में मात नहीं है।' },
    ar: { cap: 'أخذ {b} الخصم {p} الخاص بك على النقطة الحمراء.', esc: 'خرج القائد من الكش إلى النقطة الحمراء.', block: 'حرّك الخصم {b} إلى النقطة الحمراء وصدّ الكش.', run: 'حرّك الخصم القائد إلى النقطة الحمراء.', move: 'حرّك الخصم {b} إلى النقطة الحمراء.', reach: 'ما زال هناك مات في النقلات الـ{n} الباقية.', noreach: 'لم يعد هناك مات في النقلات الـ{n} الباقية.' },
  };
  // ショウギツネ's words on the 3D table (plain, its own tone; the other languages use T); arrays pick by turn
  const OWN = {
    ja: {
      cap: ['あっ、相手の{b}に、赤い印のきみの{p}を取られちゃった。', '相手は{b}で、赤い印のきみの{p}を取ったの。', '赤い印のところで、きみの{p}が相手の{b}に取られちゃったコン。', '痛い！ 赤い印のきみの{p}が、相手の{b}に取られたね。'],
      esc: ['王手は、{g}が赤い印の点へ逃げてかわされちゃった。', '相手の{g}は、赤い印の点へ逃げていったの。', '{g}に赤い印の点へ逃げられちゃったコン。', 'するりと、{g}が赤い印の点へ逃げ出したの。'],
      block: ['王手は、相手が{b}を赤い印の点へ動かして防いだの。', '相手は{b}を赤い印の点に入れて、王手を止めたね。', '赤い印の点へ{b}を動かされて、王手が防がれちゃったコン。'],
      run: ['王手じゃなかったから、{g}は赤い印の点へ一歩動けたの。', '{g}が赤い印の点へ動いて、逃げ道を広げられちゃったコン。', 'ひと息ついた相手は、{g}を赤い印の点へ寄せたよ。'],
      move: ['相手は{b}を赤い印の点へ動かしたね。', '王手じゃなかったから、相手は自由に{b}を赤い印の点へ動かせたの。', '赤い印の点へ、相手の{b}が動いたコン。', 'そのすきに、相手は{b}を赤い印の点へ回したよ。'],
      reach: ['でも大丈夫、残り{n}手で詰む道はまだあるから、読んでみて！', '平気平気、残り{n}手で詰む手順はまだ残ってるコン。次の1手を探そう！', 'あと少し！ 残り{n}手で詰む形は、まだ盤にあるからね。', 'まだいけるよ。{n}手で詰ませる筋が残ってるの、見つけて！'],
      noreach: ['この受けだと、残り{n}手ではもう詰まないの。でも大丈夫、最後まで指して形を覚えよう！', 'これで残り{n}手の詰みは消えちゃった。よくある見落としだから、次は最初の1手をじっくり読もう！', 'ここからは{n}手で詰む筋がなくなったコン。ドンマイ、最後まで指して確かめてみて！', '残念、あと{n}手ではもう届かないね。次は相手の受けを先に数えてみよう！', 'こうなると{n}手以内の詰みはないの。気にしないで、今度は最初の1手から読み直そうコン。'],
    },
  };
  // a piece's name: t = its type (1..7), col = its colour (0 Red / 1 Black; the hanzi differ)
  const name = (lang, t, col) => { const L = NAMES[lang] || NAMES.en, A = Array.isArray(L[0]) ? L[col ? 1 : 0] : L; return A[(t | 0) - 1] || ''; };
  // the reply r after the wrong move (mid = the position after it, the defender to move): the class and the pieces it is about
  function why(E, mid, r) {
    const f = E.mFrom(r), t = E.mTo(r), a = mid.at(f), x = mid.at(t), b = { t: E.typeOf(a), c: E.colorOf(a) }, g = { t: E.KING, c: E.colorOf(a) };
    if (x) return { k: 'cap', b, g, p: { t: E.typeOf(x), c: E.colorOf(x) } };
    const ck = mid.inCheck(), king = b.t === E.KING;
    return { k: ck ? (king ? 'esc' : 'block') : (king ? 'run' : 'move'), b, g };
  }
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, q) => v && v[q] != null ? v[q] : '');
  const text = (lang, k, v, own) => { const S = (own && own[k]) || (T[lang] || T.en)[k] || T.en[k]; const x = Array.isArray(S) ? S[((v && v.j) | 0) % S.length] : S; return fill(x, v); };
  // the whole message: the fact, then reach / noreach (null = the count is used up: the caller says it is out)
  const say = (lang, w, reach, n, own, j) => {
    const v = { b: w.b ? name(lang, w.b.t, w.b.c) : '', p: w.p ? name(lang, w.p.t, w.p.c) : '', g: w.g ? name(lang, w.g.t, w.g.c) : '', n, j };
    return text(lang, w.k, v, own) + (reach == null ? '' : ' ' + text(lang, reach ? 'reach' : 'noreach', v, own));
  };
  const API = { why, name, text, say, NAMES, T, OWN };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.XiangqiPzWhy = API;
})();
