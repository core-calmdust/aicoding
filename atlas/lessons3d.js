/* =====================================================================
   Lessons and openings (定跡) on the 3D table (2026-11-10) — shogi and chess
   The same lessons as the full games (../shogi/lessons.json + openings*.json, ../chess/lessons.json + openings.json),
   played on the portal's 3D board through the puzzle mode of the table adapters (atlas/games/*.js ctx.pz), with the
   puzzles' guide character (atlas/puzzles.js AtlasPuzzles.G) explaining. The progress is the full game's own (same
   localStorage keys and pass rules: 20 points a problem, −4 for a hint, 75 % to pass), so a lesson passed here is passed there.
     lesson:  the intro, then its problems (shogi: 5 of the step's problems, the rules step all of them; chess: the step's 5)
              — one move each ("best" kinds; shogi's 詰将棋 kind: mate within the count, the defender answering)
     opening: the study line move by move with its notes, then 5 practice positions (moves of strong games, scored by
              how often they were played)
   Chess texts live in the chess page's I18N files (loaded here into a sandbox object, not into the page).
   Contract: AtlasLessons.has(id) · list(id, kind, lang) → Promise [{ key, cat, catName, title, sub, st: 'pass'|'try'|'', full }]
             next(id, kind) → Promise key · start(ctx) → { stop(), panel }   ctx = { id, kind, key, Table3D, lang, t, el, panel, adapter, onExit }
   ===================================================================== */
(function () {
  'use strict';
  const PTS = 20, HINT_PEN = 4, PASS = .75;
  const TX = {
    ja: { start: 'はじめる', next: '次へ', practice: '練習へ', hint: 'ヒント', again: 'もう一度', nextL: '次のレッスン', result: '結果を見る', loading: '準備中…',
      good: ['正解！', 'いいね！', 'おみごと！'], partial: 'いい手だね。でも一番は光っている手だよ。', wrong: 'おしい！ 正解は光っている手だよ。', pts: '{n}点',
      pass: '合格！ {p} / {m}点', fail: '{p} / {m}点。合格は{q}点。もう一度挑戦しよう！', step: '{i} / {n}手目', end: '手順はここまで。つぎは練習問題に挑戦しよう！', endOnly: '基本の手順はここまで。おつかれさま！',
      tsume: '<b>{n}手詰め</b>。王手を続けて玉を詰ませよう！', escaped: '玉に逃げられちゃった…', hintSay: '光っているところに注目してみて。', opGoal: 'この局面、強い人が一番よく指した手はどれかな？', drill: 'このレッスンはフル機能版で遊べます。', full: 'フル機能で開く' },
    en: { start: 'Start', next: 'Next', practice: 'Practice', hint: 'Hint', again: 'Retry', nextL: 'Next lesson', result: 'See result', loading: 'Setting up…',
      good: ['Correct!', 'Nice!', 'Well done!'], partial: 'A decent move — but the glowing one is best.', wrong: 'Close! The glowing move is the answer.', pts: '{n} pts',
      pass: 'Passed! {p} / {m} pts', fail: '{p} / {m} pts. {q} to pass — try again!', step: 'Move {i} / {n}', end: 'That is the line. Now try the practice positions!', endOnly: 'That is the basic line. Well done!',
      tsume: '<b>Mate in {n}</b>. Keep checking and catch the king!', escaped: 'The king got away…', hintSay: 'Look at the glowing squares.', opGoal: 'Which move did strong players choose most often here?', drill: 'This lesson is played in the full version.', full: 'Open the full version' },
    zh: { start: '开始', next: '下一步', practice: '去练习', hint: '提示', again: '再来一次', nextL: '下一课', result: '查看结果', loading: '准备中…',
      good: ['正确！', '不错！', '漂亮！'], partial: '不错的一步，但最好的是发光的那步。', wrong: '可惜！正解是发光的那步。', pts: '{n}分',
      pass: '合格！{p} / {m}分', fail: '{p} / {m}分。合格需{q}分，再挑战一次吧！', step: '第{i} / {n}手', end: '手顺到此为止。接下来挑战练习题吧！', endOnly: '基本手顺到此为止，辛苦了！',
      tsume: '<b>{n}手诘</b>。连续将军，把玉将死吧！', escaped: '玉逃掉了……', hintSay: '注意发光的地方。', opGoal: '这个局面，高手最常下的是哪一步？', drill: '这一课请在完整版中进行。', full: '打开完整版' },
    ko: { start: '시작', next: '다음', practice: '연습하기', hint: '힌트', again: '다시 하기', nextL: '다음 레슨', result: '결과 보기', loading: '준비 중…',
      good: ['정답!', '좋아!', '훌륭해!'], partial: '좋은 수야. 하지만 최선은 빛나는 수야.', wrong: '아깝다! 정답은 빛나는 수야.', pts: '{n}점',
      pass: '합격! {p} / {m}점', fail: '{p} / {m}점. 합격은 {q}점. 다시 도전해 보자!', step: '{i} / {n}수째', end: '수순은 여기까지. 이제 연습 문제에 도전해 보자!', endOnly: '기본 수순은 여기까지. 수고했어!',
      tsume: '<b>{n}수 외통</b>이야. 장을 계속 걸어 왕을 잡자!', escaped: '왕이 도망쳤어…', hintSay: '빛나는 곳을 잘 봐.', opGoal: '이 국면에서 강자들이 가장 많이 둔 수는 무엇일까?', drill: '이 레슨은 풀 버전에서 할 수 있어요.', full: '풀 버전 열기' },
    es: { start: 'Empezar', next: 'Siguiente', practice: 'A practicar', hint: 'Pista', again: 'Reintentar', nextL: 'Siguiente lección', result: 'Ver resultado', loading: 'Preparando…',
      good: ['¡Correcto!', '¡Bien!', '¡Muy bien!'], partial: 'Buena jugada, pero la mejor es la que brilla.', wrong: '¡Casi! La jugada que brilla es la respuesta.', pts: '{n} pts',
      pass: '¡Aprobado! {p} / {m} pts', fail: '{p} / {m} pts. Se aprueba con {q}: ¡inténtalo otra vez!', step: 'Jugada {i} / {n}', end: 'Hasta aquí la línea. ¡Ahora las posiciones de práctica!', endOnly: 'Hasta aquí la línea básica. ¡Bien hecho!',
      tsume: '<b>Mate en {n}</b>. ¡Da jaque tras jaque y atrapa al rey!', escaped: 'El rey se escapó…', hintSay: 'Fíjate en las casillas que brillan.', opGoal: '¿Qué jugada eligieron más los jugadores fuertes aquí?', drill: 'Esta lección se juega en la versión completa.', full: 'Abrir la versión completa' },
    fr: { start: 'Commencer', next: 'Suivant', practice: 'S’entraîner', hint: 'Indice', again: 'Réessayer', nextL: 'Leçon suivante', result: 'Voir le résultat', loading: 'Préparation…',
      good: ['Exact !', 'Bien !', 'Bravo !'], partial: 'Bon coup, mais le meilleur est celui qui brille.', wrong: 'Presque ! Le coup qui brille est la réponse.', pts: '{n} pts',
      pass: 'Réussi ! {p} / {m} pts', fail: '{p} / {m} pts. Il faut {q} pour réussir : réessaie !', step: 'Coup {i} / {n}', end: 'Voilà la ligne. Place aux positions d’entraînement !', endOnly: 'Voilà la ligne de base. Bravo !',
      tsume: '<b>Mat en {n}</b>. Enchaîne les échecs et attrape le roi !', escaped: 'Le roi s’est échappé…', hintSay: 'Regarde les cases qui brillent.', opGoal: 'Quel coup les joueurs forts ont-ils le plus joué ici ?', drill: 'Cette leçon se joue dans la version complète.', full: 'Ouvrir la version complète' },
    pt: { start: 'Começar', next: 'Próximo', practice: 'Praticar', hint: 'Dica', again: 'Tentar de novo', nextL: 'Próxima lição', result: 'Ver resultado', loading: 'Preparando…',
      good: ['Correto!', 'Boa!', 'Muito bem!'], partial: 'Bom lance, mas o melhor é o que brilha.', wrong: 'Quase! O lance que brilha é a resposta.', pts: '{n} pts',
      pass: 'Aprovado! {p} / {m} pts', fail: '{p} / {m} pts. Aprova com {q}: tente de novo!', step: 'Lance {i} / {n}', end: 'Essa é a linha. Agora as posições de prática!', endOnly: 'Essa é a linha básica. Muito bem!',
      tsume: '<b>Mate em {n}</b>. Dê xeque atrás de xeque e pegue o rei!', escaped: 'O rei escapou…', hintSay: 'Olhe as casas que brilham.', opGoal: 'Qual lance os jogadores fortes mais escolheram aqui?', drill: 'Esta lição é jogada na versão completa.', full: 'Abrir a versão completa' },
    de: { start: 'Los', next: 'Weiter', practice: 'Üben', hint: 'Tipp', again: 'Nochmal', nextL: 'Nächste Lektion', result: 'Ergebnis', loading: 'Wird vorbereitet…',
      good: ['Richtig!', 'Gut!', 'Stark!'], partial: 'Ein guter Zug – der beste ist aber der leuchtende.', wrong: 'Knapp! Der leuchtende Zug ist die Lösung.', pts: '{n} P.',
      pass: 'Bestanden! {p} / {m} P.', fail: '{p} / {m} P. Bestanden ab {q} – versuch es nochmal!', step: 'Zug {i} / {n}', end: 'Das ist die Variante. Jetzt die Übungsstellungen!', endOnly: 'Das ist die Grundvariante. Gut gemacht!',
      tsume: '<b>Matt in {n}</b>. Schach um Schach – fang den König!', escaped: 'Der König ist entwischt…', hintSay: 'Schau auf die leuchtenden Felder.', opGoal: 'Welchen Zug haben starke Spieler hier am häufigsten gewählt?', drill: 'Diese Lektion gibt es in der Vollversion.', full: 'Vollversion öffnen' },
    hi: { start: 'शुरू करें', next: 'आगे', practice: 'अभ्यास', hint: 'संकेत', again: 'फिर से', nextL: 'अगला पाठ', result: 'परिणाम', loading: 'तैयार हो रहा है…',
      good: ['सही!', 'बढ़िया!', 'शानदार!'], partial: 'अच्छी चाल — पर सबसे अच्छी चमकती चाल है।', wrong: 'करीब थे! चमकती चाल सही जवाब है।', pts: '{n} अंक',
      pass: 'पास! {p} / {m} अंक', fail: '{p} / {m} अंक। पास के लिए {q} — फिर कोशिश करें!', step: 'चाल {i} / {n}', end: 'लाइन यहीं तक। अब अभ्यास की स्थितियाँ!', endOnly: 'मूल लाइन यहीं तक। बहुत अच्छे!',
      tsume: '<b>{n} में मात</b>। शह पर शह देकर राजा को पकड़ो!', escaped: 'राजा बच निकला…', hintSay: 'चमकती जगहों को देखो।', opGoal: 'यहाँ मज़बूत खिलाड़ियों ने सबसे ज़्यादा कौन-सी चाल चुनी?', drill: 'यह पाठ पूरे संस्करण में है।', full: 'पूरा संस्करण खोलें' },
    ar: { start: 'ابدأ', next: 'التالي', practice: 'تدرّب', hint: 'تلميح', again: 'أعد المحاولة', nextL: 'الدرس التالي', result: 'النتيجة', loading: 'جارٍ التحضير…',
      good: ['صحيح!', 'أحسنت!', 'رائع!'], partial: 'نقلة جيدة، لكن الأفضل هي المضيئة.', wrong: 'قريب! النقلة المضيئة هي الجواب.', pts: '{n} نقطة',
      pass: 'نجحت! {p} / {m}', fail: '{p} / {m}. النجاح عند {q} — حاول مجددًا!', step: 'النقلة {i} / {n}', end: 'هذا هو الخط. والآن مواقف التدريب!', endOnly: 'هذا هو الخط الأساسي. أحسنت!',
      tsume: '<b>مات في {n}</b>. كِش بعد كِش وأمسك الملك!', escaped: 'هرب الملك…', hintSay: 'انظر إلى المربعات المضيئة.', opGoal: 'ما النقلة التي اختارها الأقوياء أكثر هنا؟', drill: 'هذا الدرس في النسخة الكاملة.', full: 'افتح النسخة الكاملة' },
    ru: { start: 'Начать', next: 'Далее', practice: 'К практике', hint: 'Подсказка', again: 'Ещё раз', nextL: 'Следующий урок', result: 'Итог', loading: 'Подготовка…',
      good: ['Верно!', 'Отлично!', 'Здорово!'], partial: 'Неплохой ход, но лучший — светящийся.', wrong: 'Почти! Светящийся ход — ответ.', pts: '{n} очк.',
      pass: 'Зачёт! {p} / {m}', fail: '{p} / {m}. Для зачёта {q} — попробуй ещё!', step: 'Ход {i} / {n}', end: 'Вот и вся линия. Теперь практика!', endOnly: 'Вот и базовая линия. Молодец!',
      tsume: '<b>Мат в {n}</b>. Шах за шахом — поймай короля!', escaped: 'Король ускользнул…', hintSay: 'Посмотри на светящиеся поля.', opGoal: 'Какой ход сильные игроки выбирали здесь чаще всего?', drill: 'Этот урок — в полной версии.', full: 'Открыть полную версию' },
    'zh-TW': { start: '開始', next: '下一步', practice: '去練習', hint: '提示', again: '再來一次', nextL: '下一課', result: '查看結果', loading: '準備中…',
      good: ['正確！', '不錯！', '漂亮！'], partial: '不錯的一步，但最好的是發光的那步。', wrong: '可惜！正解是發光的那步。', pts: '{n}分',
      pass: '合格！{p} / {m}分', fail: '{p} / {m}分。合格需{q}分，再挑戰一次吧！', step: '第{i} / {n}手', end: '手順到此為止。接下來挑戰練習題吧！', endOnly: '基本手順到此為止，辛苦了！',
      tsume: '<b>{n}手詰</b>。連續將軍，把玉將死吧！', escaped: '玉逃走了……', hintSay: '注意發光的地方。', opGoal: '這個局面，高手最常下的是哪一步？', drill: '這一課請在完整版中進行。', full: '開啟完整版' },
    id: { start: 'Mulai', next: 'Lanjut', practice: 'Latihan', hint: 'Petunjuk', again: 'Ulangi', nextL: 'Pelajaran berikutnya', result: 'Lihat hasil', loading: 'Menyiapkan…',
      good: ['Benar!', 'Bagus!', 'Hebat!'], partial: 'Langkah bagus, tapi yang terbaik yang menyala.', wrong: 'Hampir! Langkah yang menyala adalah jawabannya.', pts: '{n} poin',
      pass: 'Lulus! {p} / {m}', fail: '{p} / {m}. Lulus di {q} — coba lagi!', step: 'Langkah {i} / {n}', end: 'Itulah variasinya. Sekarang posisi latihan!', endOnly: 'Itulah variasi dasarnya. Bagus!',
      tsume: '<b>Mat dalam {n}</b>. Skak terus dan tangkap rajanya!', escaped: 'Rajanya lolos…', hintSay: 'Lihat kotak yang menyala.', opGoal: 'Langkah mana yang paling sering dipilih pemain kuat di sini?', drill: 'Pelajaran ini ada di versi lengkap.', full: 'Buka versi lengkap' },
    tr: { start: 'Başla', next: 'İleri', practice: 'Alıştırma', hint: 'İpucu', again: 'Tekrar', nextL: 'Sonraki ders', result: 'Sonuç', loading: 'Hazırlanıyor…',
      good: ['Doğru!', 'Güzel!', 'Harika!'], partial: 'İyi hamle, ama en iyisi parlayan.', wrong: 'Az kaldı! Parlayan hamle cevap.', pts: '{n} puan',
      pass: 'Geçtin! {p} / {m}', fail: '{p} / {m}. Geçmek için {q} — tekrar dene!', step: 'Hamle {i} / {n}', end: 'Varyant bu kadar. Şimdi alıştırma pozisyonları!', endOnly: 'Temel varyant bu kadar. Aferin!',
      tsume: '<b>{n} hamlede mat</b>. Şah üstüne şah çek, şahı yakala!', escaped: 'Şah kaçtı…', hintSay: 'Parlayan karelere bak.', opGoal: 'Güçlü oyuncular burada en çok hangi hamleyi seçti?', drill: 'Bu ders tam sürümde.', full: 'Tam sürümü aç' },
  };
  // shogi opening categories (= shogi/openings-ui.js tabs)
  const OPCAT = {"ja":{"beg":"初級","mid":"中級","adv":"上級","sp":"特殊","new":"流行","castle":"囲い","handi":"駒落ち"},"en":{"beg":"Beginner","mid":"Standard","adv":"Advanced","sp":"Surprise","new":"Trending","castle":"Castles","handi":"Handicap"},"zh":{"beg":"入门","mid":"中级","adv":"高级","sp":"奇袭","new":"流行","castle":"围","handi":"让子"},"ko":{"beg":"초급","mid":"중급","adv":"고급","sp":"특수","new":"유행","castle":"성","handi":"접장기"},"es":{"beg":"Inicial","mid":"Medio","adv":"Avanzado","sp":"Sorpresa","new":"Moda","castle":"Castillos","handi":"Hándicap"},"fr":{"beg":"Débutant","mid":"Moyen","adv":"Avancé","sp":"Surprise","new":"Tendance","castle":"Châteaux","handi":"Handicap"},"pt":{"beg":"Inicial","mid":"Médio","adv":"Avançado","sp":"Surpresa","new":"Moda","castle":"Castelos","handi":"Handicap"},"de":{"beg":"Einstieg","mid":"Mittel","adv":"Profi","sp":"Exoten","new":"Trend","castle":"Burgen","handi":"Vorgabe"},"hi":{"beg":"शुरुआती","mid":"मध्यम","adv":"उन्नत","sp":"अनोखे","new":"ट्रेंड","castle":"किले","handi":"हैंडीकैप"},"ar":{"beg":"مبتدئ","mid":"متوسط","adv":"متقدم","sp":"مفاجآت","new":"رائج","castle":"القلاع","handi":"الإعاقة"},"ru":{"beg":"Начальный","mid":"Стандарт","adv":"Продвинутый","sp":"Сюрпризы","new":"Тренды","castle":"Крепости","handi":"Фора"},"zh-TW":{"beg":"入門","mid":"標準","adv":"進階","sp":"奇襲","new":"流行","castle":"圍","handi":"讓子"},"id":{"beg":"Pemula","mid":"Standar","adv":"Mahir","sp":"Kejutan","new":"Tren","castle":"Benteng","handi":"Handikap"},"tr":{"beg":"Başlangıç","mid":"Standart","adv":"İleri","sp":"Sürpriz","new":"Popüler","castle":"Kaleler","handi":"Handikap"}};
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  /* ---------- the guides' own voice (2026-11-11) ----------
     Knighton (chess, ぼく) and Shogitsune (shogi, わたし, コン now and then) say the lesson's fixed lines in their own words
     (VOICE; other languages: the plain lines above). The lesson texts themselves come from the full games' data, written
     politely (です・ます): in Japanese the guide says them in plain, friendly speech (casualJa). */
  const VOICE = {
    chess: {
      ja: { hi: 'やあ、ナイトンだよ！ 今日のレッスン、いっしょにピョンピョンがんばろう！', partial: 'いい手だね！ でもいちばんは光ってる手なんだ。', wrong: 'おしい〜！ 正解は光ってる手だよ。',
        pass: 'やったね、合格！ {p} / {m}点。ぼく、うれしくて跳ねちゃう！', fail: '{p} / {m}点。合格は{q}点だよ。もう一回いってみよう！', end: '手順はここまで！ 次は練習問題で腕だめしだ！',
        endOnly: '基本の手順はここまで。おつかれさま！', opGoal: 'この局面、強い人がいちばん指した手はどれだと思う？', hintSay: 'こっそり教えちゃう。光ってるところに注目！', escaped: 'あらら、キングに逃げられちゃった…' },
      en: { hi: 'Hi, Knighton here! Let\'s hop through today\'s lesson together!', partial: 'Nice move! But the glowing one is the best.', wrong: 'So close! The glowing move is the answer.',
        pass: 'Hooray, you passed! {p} / {m} pts. I could hop all day!', fail: '{p} / {m} pts — {q} to pass. Let\'s hop back in!', end: 'That\'s the line! Now let\'s test it on the practice positions!',
        endOnly: 'That\'s the basic line. Great work!', opGoal: 'Which move do you think strong players chose most here?', hintSay: 'Psst — look at the glowing squares!', escaped: 'Oh no, the king slipped away…' },
    },
    shogi: {
      ja: { hi: 'こんにちは、ショウギツネだコン！ いっしょに将棋のお勉強をしよう。', partial: 'いい手だね。でもいちばんは光ってる手だコン。', wrong: 'おしい！ 正解は光ってる手だよ。',
        pass: '合格だコン！ {p} / {m}点。わたしもうれしい！', fail: '{p} / {m}点。合格は{q}点だよ。もう一回いってみよう！', end: '手順はここまで。つぎは練習問題に挑戦だコン！',
        endOnly: '基本の手順はここまで。おつかれさま！', opGoal: 'この局面、強い人がいちばん指した手はどれかな？', hintSay: 'ヒントだよ。光ってるところをよく見てね。',
        tsume: '<b>{n}手詰め</b>だよ。王手を続けて玉を詰ませよう！', escaped: '玉に逃げられちゃった…くやしいコン。' },
      en: { hi: 'Hello, I\'m Shogitsune! Let\'s study some shogi together.', partial: 'A nice move! But the glowing one is the best.', wrong: 'So close! The glowing move is the answer.',
        pass: 'You passed! {p} / {m} pts. I\'m so happy!', fail: '{p} / {m} pts — {q} to pass. Let\'s try once more!', end: 'That\'s the line. Now let\'s try the practice positions!',
        endOnly: 'That\'s the basic line. Well done!', opGoal: 'Which move did strong players choose most here, I wonder?', hintSay: 'Here\'s a hint — look closely at the glowing squares.', escaped: 'The king got away… how frustrating!' },
    },
  };
  // polite Japanese (です・ます) → the guide's plain, friendly speech; only at the ends of sentences, tags left as they are
  const I2U = { 'い': 'う', 'き': 'く', 'ぎ': 'ぐ', 'し': 'す', 'ち': 'つ', 'に': 'ぬ', 'び': 'ぶ', 'み': 'む', 'り': 'る' };
  const I2A = { 'い': 'わ', 'き': 'か', 'ぎ': 'が', 'し': 'さ', 'ち': 'た', 'に': 'な', 'び': 'ば', 'み': 'ま', 'り': 'ら' };
  const I2O = { 'い': 'お', 'き': 'こ', 'ぎ': 'ご', 'し': 'そ', 'ち': 'と', 'に': 'の', 'び': 'ぼ', 'み': 'も', 'り': 'ろ' };
  const I2T = { 'い': 'った', 'ち': 'った', 'り': 'った', 'に': 'んだ', 'び': 'んだ', 'み': 'んだ', 'き': 'いた', 'ぎ': 'いだ', 'し': 'した' };
  const ICHI_I = /(でき|見|起き|生き|落ち|足り|借り|信じ|感じ|閉じ|浴び|伸び|延び|過ぎ|尽き|満ち|用い|着|似|居)$/;
  const KANJI = /[\u4e00-\u9fff々]/;
  function verb(stem) {   // the verb stem before ます → { dict, neg, vol, past }
    const k = stem.slice(-1), body = stem.slice(0, -1);
    // し: する after a noun / particle / two kanji (確認し), す after one kanji or the a-row kana of 動かし・逃がし・増やし (godan)
    if (k === 'し' && (stem.length === 1 || (KANJI.test(stem.slice(-2, -1)) && KANJI.test(stem.slice(-3, -2))) || !(KANJI.test(stem.slice(-2, -1)) || /[かがさやらわまたな]/.test(stem.slice(-2, -1))))) return { dict: body + 'する', neg: body + 'しない', vol: body + 'しよう', past: body + 'した' };
    if (/来$/.test(stem) || /来き$/.test(stem)) return { dict: stem.replace(/き?$/, '') + 'る', neg: stem.replace(/き?$/, '') + 'ない', vol: stem.replace(/き?$/, '') + 'よう', past: stem.replace(/き?$/, '') + 'た' };
    if (/あり$/.test(stem)) return { dict: body + 'る', neg: body.slice(0, -1) + 'ない', vol: body + 'ろう', past: body + 'った' };
    if (/[えけげせぜてでねへべめれ]$/.test(stem) || ICHI_I.test(stem) || stem === 'い') return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };
    if (I2U[k]) return { dict: body + I2U[k], neg: body + I2A[k] + 'ない', vol: body + I2O[k] + 'う', past: body + (/行$/.test(body) ? 'った' : I2T[k]) };
    return null;
  }
  function casualJa(html, fox) {
    const E = '(?=[。！？!?」（(]|<br>|</b>|</p>|$)';
    let t = String(html)
      .replace(new RegExp('でしょうか' + E, 'g'), 'かな').replace(new RegExp('でしょう' + E, 'g'), 'だろうね')
      .replace(new RegExp('でした' + E, 'g'), 'だったよ').replace(new RegExp('ですか' + E, 'g'), 'かな').replace(new RegExp('です' + E, 'g'), 'だよ')
      .replace(new RegExp('([てで])ください' + E, 'g'), '$1ね')
      .replace(/ですが/g, 'だけど')
      .replace(new RegExp('([\\u3040-\\u30ff\\u4e00-\\u9fff々]+?)(ましょう|ません|ました|ますか|ますが|ます)' + E.replace('(?=[', '(?=[、'), 'g'), (m, stem, end, at, all) => {
        if (end !== 'ますが' && all[at + m.length] === '、') return m;   // (mid-sentence: left as it is)
        for (let n = Math.min(stem.length, 6); n >= 1; n--) {   // (the shortest piece that reads as one verb is enough: try from the long end)
          const pre = stem.slice(0, stem.length - n), v = verb(stem.slice(-n)); if (!v) continue;
          return pre + (end === 'ましょう' ? v.vol : end === 'ません' ? v.neg + 'よ' : end === 'ました' ? v.past + 'よ' : end === 'ますか' ? v.dict + 'かな' : end === 'ますが' ? v.dict + 'けど' : v.dict + 'よ');
        }
        return m;
      });
    if (fox) { let done = false; t = t.replace(/だよ。(?![^]*だよ。)/, () => { done = true; return 'だコン。'; }); if (!done) t = t.replace(/よ。$/, 'コン。'); }
    return t;
  }
  const pick = a => Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const L = (o, lang) => !o ? '' : typeof o === 'string' ? o : o[lang] != null ? o[lang] : o.en != null ? o.en : o.ja || '';
  const getJ = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const winP = (v, k) => 1 / (1 + Math.pow(10, -v / k));

  /* ---------- the two games' data ---------- */
  const SHOGI = {
    LKEY: 'shogi-kaya-lessons-v1', OKEY: 'shogi-kaya-open-v1', CATS: ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'], data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../shogi/lessons.json?v=20261107l14'), getJ('../shogi/openings.json?v=20261107l14'),
        ...['beg', 'mid', 'adv', 'sp', 'new', 'castle'].map(c => getJ(`../shogi/openings-${c}.json?v=20261107l14`).catch(() => ({ sets: [] })))])
        .then(([ls, op, ...more]) => {
          const sets = op.sets.slice(); more.forEach((m, i) => (m.sets || []).forEach(s => { s.cat = s.cat || ['beg', 'mid', 'adv', 'sp', 'new', 'castle'][i]; if (!sets.some(x => x.id === s.id)) sets.push(s); }));
          sets.forEach(s => { if (!s.cat) s.cat = s.handi ? 'handi' : 'mid'; });
          const ord = {}; Object.entries(op.index || {}).forEach(([c, L2]) => L2.forEach(([id], i) => { ord[id] = i; }));
          sets.sort((a, b) => (this.CATS.indexOf(a.cat) - this.CATS.indexOf(b.cat)) || ((ord[a.id] ?? 99) - (ord[b.id] ?? 99)));
          this.data = { ls, sets }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.sets.map(s => ({ key: s.id, cat: s.cat, catName: (OPCAT[lang] || OPCAT.en)[s.cat] || s.cat, title: L(s.title, lang), sub: L(s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.grades.map((g, i) => ({ key: String(i), cat: g.rules ? 'rules' : 'lesson', catName: '', title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, sub: L(g.short, lang), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang, X) {
      const g = this.data.ls.grades[+key]; if (!g) return null;
      const pool = g.problems.filter(p => !p.variant && (p.kind === 'best' || p.kind === 'tsume'));
      const probs = g.rules ? pool : shuffle(pool).slice(0, 5);
      return { id: g.id, title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, intro: (L(g.intro, lang) || []).join('<br>'),
        probs: probs.map(p => ({ pos: p.sfen, kind: p.kind === 'tsume' ? 'tsume' : 'best', n: p.n, sol: p.sol, P: p,
          ask: L(p.q, lang) || (p.kind === 'tsume' ? fill(X.tsume, { n: p.n }) : L(g.prompt, lang)), why: L(p.expl, lang), ans: p.sol ? p.sol[0] : (p.accept || p.pv || [])[0] })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.sets.find(x => x.id === key); if (!s) return null;
      const probs = (s.problems || []).length ? (s.handi ? s.problems.map((p, i) => i) : shuffle(s.problems.map((p, i) => i))).slice(0, 5).sort((a, b) => s.handi ? a - b : 0).map(i => s.problems[i]) : [];
      return { id: s.id, title: L(s.title, lang), intro: L(s.short, lang), start: s.study && s.study.start, steps: (s.study && s.study.steps || []).map(x => x[0]), notes: s.study && s.study.notes || {},
        probs: probs.map(p => ({ pos: p.sfen, kind: 'best', P: p, ans: (p.accept || p.pv || (p.cand && [p.cand[0][0]]) || [])[0] })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[s.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = shogi/index.html movePoints (without the engine's runtime score)
      if (P.mode === 'material' || P.mode === 'freq') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(PTS * c[1] / best) : 0; }
      if ((P.accept || []).includes(u)) return PTS;
      if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }
      if (P.cand) { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : Math.min(P.floor !== undefined ? P.floor : best - 2000, best); return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (winP(best, 600) - winP(s, 600)) / .3)))); }
      return 0;
    },
  };
  const CHESS = {
    LKEY: 'aicoding-chess-lessons', OKEY: 'aicoding-chess-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const txt = u => fetch(u).then(r => r.text());
      return (this.p = Promise.all([getJ('../chess/lessons.json?v=20261107i14'), getJ('../chess/openings.json?v=20261107i14'), txt('../chess/i18n.js?v=20261107pro2-i14'), txt('../chess/i18n_basics.js?v=20261019ol-i14')])
        .then(([ls, op, a, b]) => {
          const w = {}; try { new Function('window', a)(w); new Function('window', b)(w); } catch (e) { console.warn('[lessons3d] chess texts', e); }   // (a sandbox: the page's own I18N stays untouched)
          this.I = w.I18N || {}; this.data = { ls, op }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang) { const I = this.I || {}; return (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(s => ({ key: s.id, cat: 'open', catName: '', title: L(s.title, lang), sub: L(s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course || 'tactics', catName: this.tx('course.' + (s.course || 'tactics'), lang), title: this.tx('ls.' + s.id + '.title', lang) || s.id, sub: this.tx('ls.' + s.id + '.sub', lang),
        st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: s.kind === 'drill' }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s || s.kind === 'drill') return null;
      const T = k => this.tx('ls.' + s.id + '.' + k, lang);
      return { id: s.id, title: T('title'), intro: T('intro'),
        probs: (s.problems || []).map(p => ({ pos: p.fen, kind: 'best', P: p, ask: T('goal'), why: T('why'), ans: p.best || (p.ok || [])[0] })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.op.sets.find(x => x.id === key); if (!s) return null;
      const probs = shuffle(s.problems || []).slice(0, 5);
      return { id: s.id, title: L(s.title, lang), intro: (L(s.intro, lang) || []).join ? L(s.intro, lang).join('<br>') : L(s.intro, lang), start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        steps: (s.study && s.study.steps || []).map(x => x[0]), notes: s.study && s.study.notes || {},
        probs: probs.map(p => ({ pos: p.fen, kind: 'best', P: p, ans: p.cand && p.cand[0][0] })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = chess/app.js problemPoints (the stored scores)
      if (P.cand) { const c = (P.cand.find(x => x[0] === u) || [0, 0])[1], top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }
      if (P.ok) return P.ok.includes(u) ? 20 : 0;
      if (!P.sc) return u === P.best ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), MT = 20000, mine = val.has(u) ? val.get(u) : -30000;
      if (best > MT && mine > MT) return mine >= best ? 20 : 16;
      if (mine >= best - 10) return 20;
      if (best > MT) return mine > 150 ? 8 : mine > -60 ? 4 : 0;
      if (mine < -MT) return 0;
      return Math.max(0, Math.round(20 * (1 - (winP(best, 400) - winP(mine, 400)) / .45)));
    },
  };
  /* reversi (2026-11-11): the steps of lessons.json (5 problems: one move each, scored by the stored per-move values like the full
     game's problemPoints) and the opening course (reversi/opcourse.js: a step per named line — the line played move by move,
     then up to 5 of its positions, the line move 20 points, others by the stored evaluations). Progress: 'reversi-emerald-lessons'
     ({ best: 0–100, clear } per lesson id, and per 'opl:<moves>' for the course). A position here is '<64 cells>:<side to move>'. */
  const RV_TABS = ['op-tiger', 'op-tigervar', 'op-compos', 'op-rosebill', 'op-rabbit', 'op-roseswallow', 'op-cow', 'op-bull', 'op-cowdeep'];
  const rvSq = m => (+m[1] - 1) * 8 + 'abcdefgh'.indexOf(m[0]);
  const rvFlips = (c, sq, me) => { if (c[sq]) return []; const o = 3 - me, out = []; for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) { let r = (sq >> 3) + dr, k = (sq & 7) + dc; const ln = []; while (r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === o) { ln.push(r * 8 + k); r += dr; k += dc; } if (ln.length && r >= 0 && r < 8 && k >= 0 && k < 8 && c[r * 8 + k] === me) out.push(...ln); } return out; };
  function rvAfter(moves) {   // the position after a move list (a side with no move passes)
    const c = Array(64).fill(0); c[27] = c[36] = 2; c[28] = c[35] = 1; let me = 1;
    for (const m of String(moves).match(/../g) || []) { let sq = rvSq(m), f = rvFlips(c, sq, me); if (!f.length) { me = 3 - me; f = rvFlips(c, sq, me); } c[sq] = me; f.forEach(x => { c[x] = me; }); me = 3 - me; }
    return c.join('') + ':' + me;
  }
  const RV_ASK = { ja: '『{n}』の次の一手を打とう。', en: 'Play the next move of the {n}.', zh: '下出「{n}」的下一手。', 'zh-TW': '下出「{n}」的下一手。', ko: '「{n}」의 다음 수를 두자.', es: 'Juega la siguiente jugada de «{n}».', fr: 'Jouez le coup suivant de « {n} ».', pt: 'Jogue o próximo lance de «{n}».', de: 'Spiele den nächsten Zug von „{n}“.', ru: 'Сделайте следующий ход линии «{n}».', tr: '“{n}” hattının sıradaki hamlesini oyna.', id: 'Mainkan langkah berikutnya dari «{n}».', hi: '«{n}» की अगली चाल चलो।', ar: 'العب النقلة التالية في «{n}».' };
  const REVERSI = {
    LKEY: 'reversi-emerald-lessons', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../reversi/lessons.json?v=20261107l14'), getJ('../reversi/openings.json?v=20261107l14'), getJ('../reversi/opcourse-evals.json?v=1').catch(() => ({}))])
        .then(([ls, op, ev]) => {
          const by = new Map(op.sets.map(x => [x.id, x])), steps = [];
          RV_TABS.forEach(id => { const st = by.get(id); if (st) st.lines.forEach(ln => steps.push({ set: st, ln })); });
          this.data = { ls, op, ev, steps }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    T(o, lang) { return o && o.text ? Object.assign({}, o.text.ja, o.text.en, o.text[lang]) : {}; },
    pr(id) { const p = J(this.LKEY, {})[id]; return p ? (p.clear ? 'pass' : 'try') : ''; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') return D.steps.map(x => ({ key: x.ln.moves, cat: x.set.id, catName: this.T(x.set, lang).title || x.set.id, title: L(x.ln.name, lang), sub: L(x.ln.aim, lang), st: this.pr('opl:' + x.ln.moves) }));
      return D.ls.lessons.map((l, i) => { const T = this.T(l, lang); return { key: String(i), cat: 'lesson', catName: '', title: T.title || l.id, sub: T.short || '', st: this.pr(l.id) }; });
    },
    save(id, pts, max) { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false, v: 2 }, n = Math.round(pts * 100 / max), pass = n >= 75; pr[id] = { best: Math.max(o.best || 0, n), clear: !!o.clear || pass, v: 2 }; put(this.LKEY, pr); return pass; },
    lesson(key, lang) {
      const l = this.data.ls.lessons[+key]; if (!l) return null;
      const T = this.T(l, lang), std = shuffle(l.problems.filter(p => !p.trap)), trap = shuffle(l.problems.filter(p => p.trap)), nT = trap.length ? 1 : 0;
      const probs = [...std.slice(0, 5 - nT), ...trap.slice(0, nT)];
      return { id: l.id, title: T.title || l.id, intro: (Array.isArray(T.intro) ? T.intro.join('<br>') : T.intro || ''),
        probs: probs.map(p => { const v = Object.entries(p.f), b = v.reduce((a, x) => x[1][0] > a[1][0] ? x : a, v[0]); return { pos: p.cells + ':' + p.toMove, kind: 'best', P: p, ask: T.prompt || '', why: '', ans: b ? b[0] : '' }; }),
        save: (pts, max) => this.save(l.id, pts, max) };
    },
    opening(key, lang) {
      const st = this.data.steps.find(x => x.ln.moves === key); if (!st) return null;
      const ln = st.ln, mv = ln.moves.match(/../g), n = mv.length, ev = this.data.ev || {};
      const parent = this.data.steps.filter(x => x.ln.moves.length < key.length && key.startsWith(x.ln.moves)).reduce((a, x) => !a || x.ln.moves.length > a.length ? x.ln.moves : a, '');
      const d = parent ? parent.length / 2 : 1, c = []; for (let k = Math.max(1, d - 4); k < n; k++) c.push(k);
      const ks = c.length <= 5 ? c : [...new Set([0, 1, 2, 3, 4].map(j => c[Math.round(j * (c.length - 1) / 4)]))];
      const info = L(ln.info, lang).replace(/【[^】]+】|\[[\p{L}\p{M}]{1,16}\]/gu, ' ').trim();
      return { id: 'opl:' + key, title: L(ln.name, lang), intro: `<b>${L(ln.aim, lang)}</b><br>${mv.map((m, i) => `${i + 1}.${m}`).join(' ')}`, start: rvAfter(''),
        steps: mv.map(rvSq), notes: info ? { [String(n - 1)]: info } : {},
        probs: ks.map(k => { const pre = mv.slice(0, k).join(''); return { pos: rvAfter(pre), kind: 'best', ask: fill(RV_ASK[lang] || RV_ASK.en, { n: L(ln.name, lang) }), P: { rv: 'op', ans: rvSq(mv[k]), ev: ev[pre] || null }, ans: String(rvSq(mv[k])) }; }),
        save: (pts, max) => this.save('opl:' + key, pts, max) };
    },
    points(P, u) {
      u = +u;
      if (P.rv === 'op') {   // = reversi/opcourse.js rate (one move): the line move 20; another move by how far below the best it is
        if (u === P.ans) return PTS; if (!P.ev) return 0;
        const sc = new Map(P.ev.map(([m, v]) => [rvSq(m), v])), best = Math.max(...P.ev.map(x => x[1])); if (!sc.has(u)) return 0;
        return Math.max(0, Math.min(14, Math.round(14 - 2.5 * (best - sc.get(u)))));
      }
      const F = P.f || {}, all = Object.values(F).map(x => x[0]), mine = F[u] ? F[u][0] : -1e9, best = Math.max(...all);   // = reversi/index.html problemPoints
      if (all.length <= 1 || mine >= best - 1e-9) return PTS;
      return Math.max(0, Math.round(PTS * (all.length - 1 - all.filter(v => v > mine + 1e-9).length) / (all.length - 1)));
    },
  };
  const DATA = { shogi: SHOGI, chess: CHESS, reversi: REVERSI };

  function list(id, kind, lang) { const D = DATA[id]; return D.load().then(() => D.list(kind, lang)); }
  function next(id, kind, lang) { return list(id, kind, lang).then(L2 => { const x = L2.find(i => !i.full && i.st !== 'pass') || L2.find(i => !i.full); return x ? x.key : null; }); }

  function start(ctx) {
    const id = ctx.id, D = DATA[id], ad = ctx.adapter, GD = (window.AtlasPuzzles && AtlasPuzzles.G || {})[id] || {};
    const VO = (VOICE[id] || {})[ctx.lang] || {}, X = Object.assign({}, TX[ctx.lang] || TX.en, VO);
    const LN = ((window.AtlasPuzzleLines || {})[id] || {})[ctx.lang] || {}, line = k => { const a = LN[k]; return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; };
    const voice = h => ctx.lang === 'ja' ? casualJa(h, id === 'shogi') : h;
    let greeted = false;
    let stopped = false, sess = null, cur = null, phase = 'load', typeT = 0, onReady = null, onMoved = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const el = document.createElement('div'); el.className = 'rgd pzg lsg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide || ''}" alt=""></div><div class="bub"><div class="nm">${(GD.name && (GD.name[ctx.lang] || GD.name.en)) || ''}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    el.addEventListener('click', e => { if (more.length && e.target.closest('[data-a=next]')) { e.stopImmediatePropagation(); e.preventDefault(); if (typing) $('.tx').onclick(); else turn(); } }, true);
    // a long text is said a little at a time, like the rules guide (2026-11-11): pages of a sentence or two; 次へ (or a tap on
    // the bubble once it is all typed) shows the next page — the button's own action waits until the last page
    const CJK = /^(ja|zh|zh-TW|ko)$/.test(ctx.lang), LIM = CJK ? 58 : 150;
    let more = [], want = null, typing = false;
    const plain = h => h.replace(/<[^>]*>/g, '');
    function pages(html) {
      const out = []; let curP = '';
      const parts = String(html).split(/<br\s*\/?>/i).flatMap(par => par.match(CJK ? /[^。！？!?]*[。！？!?]+」?|[^。！？!?]+$/g : /[^.!?]*[.!?]+["”)]?\s*|[^.!?]+$/g) || [par]).map(x => x.trim()).filter(Boolean);
      // (a paragraph break stays a break when its sentences share a page)
      const raw = String(html).split(/<br\s*\/?>/i);
      let pi = 0; const brAfter = new Set(); raw.forEach(par => { const n = (par.match(CJK ? /[^。！？!?]*[。！？!?]+」?|[^。！？!?]+$/g : /[^.!?]*[.!?]+["”)]?\s*|[^.!?]+$/g) || [par]).map(x => x.trim()).filter(Boolean).length; pi += n; brAfter.add(pi - 1); });
      parts.forEach((sn, i) => { const glue = curP ? (brAfter.has(i - 1) ? '<br>' : CJK ? '' : ' ') : '';
        if (curP && plain(curP + sn).length > LIM) { out.push(curP); curP = sn; } else curP += glue + sn; });
      if (curP) out.push(curP);
      return out.length ? out : [html];
    }
    let blipN = 0;
    function blip() {
      try { if (localStorage.getItem('atlas-sfx') === '0') return; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume();
        const t = C.currentTime, f = (id === 'shogi' ? 640 : 560) + Math.random() * 240, o = C.createOscillator(), g = C.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
      } catch (e) {}
    }
    function show(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT); typing = true;
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) { typing = false; return clearInterval(typeT); } const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (blipN++ % 3 === 0)) blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 28);
      tx.onclick = () => { if (typing) { clearInterval(typeT); typing = false; nodes.forEach(([n, s]) => { n.textContent = s; }); } else if (more.length) turn(); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function turn() { show(more.shift()); apply(); }
    function say(html) {
      html = voice(String(html || '').replace(/<p[^>]*>/g, '').replace(/<\/p>\s*/g, '<br>').replace(/(<br>\s*)+$/, ''));   // (the chess texts come as <p> paragraphs)
      if (!greeted && X.hi && html !== X.loading) { greeted = true; html = X.hi + '<br>' + html; }
      const P = pages(html); more = P.slice(1); show(P[0]); apply();
    }
    const nextB = () => $('[data-a=next]');
    const head = txt => { $('.pg').textContent = txt ? ' · ' + txt : ''; };
    function act(nextLabel, { hint = false, again = false, nextOn = true } = {}) { want = { nextLabel, nextOn }; $('[data-a=hint]').disabled = !hint; $('[data-a=again]').disabled = !again; apply(); }
    function apply() {
      if (!want) return;
      if (more.length) { nextB().innerHTML = X.next + ' ▶'; nextB().disabled = false; nextB().classList.add('more'); }
      else { nextB().innerHTML = want.nextLabel + ' ▶'; nextB().disabled = !want.nextOn; nextB().classList.remove('more'); }
    }
    function dots() { if (!cur || !cur.probs.length || phase === 'study' || phase === 'intro') { $('.cnt').innerHTML = ''; return; } $('.cnt').innerHTML = cur.probs.map((_, i) => { const r = cur.res[i]; return `<i class="lsd ${r === undefined ? '' : r >= 16 ? 'ok' : r > 0 ? 'mid' : 'ng'}${i === cur.k && phase === 'prob' ? ' on' : ''}"></i>`; }).join(''); }
    const pz = () => sess && sess.pz;
    function board(pos, sol) {   // a position on the table (the first one starts the adapter)
      return new Promise(res => {
        onReady = res;
        if (!sess) {
          sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
            pz: { fen: pos, sfen: pos, sol: sol || [], ready: () => { const f = onReady; onReady = null; if (f) f(); }, moved: (u, i) => onMoved && onMoved(u, i) } });
          ctx.Table3D.play(true);
        } else pz().load(pos, sol || []);
      });
    }

    /* ---------- a lesson / an opening ---------- */
    function open(key) {
      const L2 = ctx.kind === 'open' ? D.opening(key, ctx.lang) : D.lesson(key, ctx.lang, X);
      if (!L2) { say(X.drill); act(X.full, {}); $('[data-a=next]').onclick = () => ctx.onFull && ctx.onFull(ctx.kind, key); return; }
      cur = Object.assign(L2, { key, k: 0, res: [], si: 0 }); head(cur.title);
      phase = 'intro'; dots();
      say(`<b>${cur.title}</b><br>${cur.intro || ''}`);
      act(X.start); $('[data-a=next]').onclick = () => (ctx.kind === 'open' && cur.steps.length ? study() : prob());
      if (ctx.kind === 'open' && cur.start) board(cur.start);   // (the opening's start position is on the table while reading)
      else if (cur.probs[0]) board(cur.probs[0].pos, cur.probs[0].sol);
    }
    // the study line: one move at a time, its note when there is one
    async function study() {
      phase = 'study'; dots();
      if (cur.si === 0) await board(cur.start);
      onMoved = () => { pz().undo(1); };   // (the line is played for you: a move of your own is taken back)
      const stepOn = async () => {
        if (cur.si >= cur.steps.length) {
          const more = cur.probs.length; say(more ? X.end : X.endOnly);
          if (more) { act(X.practice); $('[data-a=next]').onclick = () => { cur.k = 0; prob(); }; }
          else { cur.save(PTS, PTS); act(X.nextL); $('[data-a=next]').onclick = nextItem; }
          return;
        }
        act(X.next, { nextOn: false });
        await pz().play(cur.steps[cur.si]); if (stopped) return;
        const note = cur.notes[String(cur.si)]; cur.si++;
        head(cur.title + ' · ' + fill(X.step, { i: cur.si, n: cur.steps.length }));
        say(note ? L(note, ctx.lang) : '　'); act(X.next);
      };
      $('[data-a=next]').onclick = stepOn; stepOn();
    }
    // one problem
    async function prob() {
      phase = 'prob'; const p = cur.probs[cur.k]; if (!p) return finish();
      p.hinted = false; p.used = 0; dots(); act(X.next, { nextOn: false });
      say(p.ask || X.opGoal);
      await board(p.pos, p.sol); if (stopped || cur.probs[cur.k] !== p) return;
      onMoved = (u, info) => moved(p, u, info);
      pz().wait(); act(X.next, { hint: true, nextOn: false });
      $('[data-a=next]').onclick = () => { cur.k++; if (cur.k < cur.probs.length) prob(); else finish(); };
      $('[data-a=hint]').onclick = () => { if (!p.ans || p.done) return; p.hinted = true; pz().mark(p.ans); say(X.hintSay); };
    }
    async function moved(p, u, info) {
      if (stopped || p.done) return;
      if (p.kind === 'tsume') {   // mate within the count; the defender answers from the stored line, else the engine's defence
        const mv = pz().moves();
        if (info.mate) return scored(p, PTS);
        const remain = p.n - mv.length; if (remain <= 0) return scored(p, 0, X.escaped);
        const sol = p.sol || [], onLine = mv.every((x, i) => x === sol[i]);
        let reply = onLine && sol[mv.length] ? sol[mv.length] : null;
        if (!reply && pz().defend) { const r = await pz().defend(remain); if (stopped) return; reply = r && r.reply; }
        if (!reply) return scored(p, 0, X.escaped);
        await sleep(120); await pz().play(reply); if (stopped) return;
        pz().wait(); return;
      }
      scored(p, D.points(p.P, u));
    }
    function scored(p, pts, msg) {
      p.done = true; const n = Math.max(0, pts - (p.hinted && pts > 0 ? HINT_PEN : 0)); cur.res[cur.k] = n; dots();
      if (pts >= 16) say(`${line('solved') || pick(X.good)} <b>${fill(X.pts, { n })}</b>${p.why ? '<br>' + p.why : ''}`);
      else { if (p.ans) pz().mark(p.ans); say(`${msg || (pts > 0 ? X.partial : X.wrong)} <b>${fill(X.pts, { n })}</b>${p.why ? '<br>' + p.why : ''}`); }
      try { chime(pts >= 16); } catch (e) {}
      act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
    }
    function finish() {
      phase = 'done'; dots();
      const max = cur.probs.length * PTS, pts = cur.res.reduce((a, b) => a + (b || 0), 0), q = Math.ceil(max * PASS), pass = cur.save(pts, max);
      say(pass ? fill(X.pass, { p: pts, m: max }) : fill(X.fail, { p: pts, m: max, q }));
      if (pass && window.AtlasConfetti) try { AtlasConfetti(70); } catch (e) {}
      act(pass ? X.nextL : X.again, { again: true });
      $('[data-a=again]').onclick = () => open(cur.key);
      $('[data-a=next]').onclick = pass ? nextItem : () => open(cur.key);
      if (ctx.onDone) try { ctx.onDone(); } catch (e) {}
    }
    function nextItem() {
      const L2 = D.list(ctx.kind, ctx.lang), i = L2.findIndex(x => x.key === cur.key);
      const nx = L2.slice(i + 1).find(x => !x.full && x.st !== 'pass') || L2.slice(i + 1).find(x => !x.full);
      if (nx) open(nx.key); else say(X.endOnly);
    }
    let ac0 = null;
    function chime(ok) {
      try { if (localStorage.getItem('atlas-sfx') === '0') return; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); ac0 = C;
        const t0 = C.currentTime, F = ok ? [523, 659, 784] : [392, 330];
        F.forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + i * .09); g.gain.linearRampToValueAtTime(.08, t0 + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + i * .09 + .3); o.connect(g).connect(C.destination); o.start(t0 + i * .09); o.stop(t0 + i * .09 + .32); });
      } catch (e) {}
    }
    $('[data-a=again]').onclick = () => cur && open(cur.key);
    if ($('[data-a=list]')) $('[data-a=list]').onclick = () => ctx.onList(ctx.kind);   // 一覧 (the portal's list sheet)
    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); act(X.next, { nextOn: false });
    D.load().then(() => { if (stopped) return; const go = k => k != null ? open(String(k)) : say(X.endOnly); if (ctx.key != null) go(ctx.key); else next(id, ctx.kind, ctx.lang).then(go); }).catch(() => { if (!stopped) say('⚠'); });
    const dbg = { state: () => cur && { key: cur.key, phase, k: cur.k, si: cur.si, res: cur.res.slice(), ans: cur.probs[cur.k] && cur.probs[cur.k].ans, say: $('.tx').textContent },
      answer: async u => { const p = cur && cur.probs[cur.k]; if (!p || !pz()) return; u = u || p.ans; await pz().play(u); moved(p, u, { mate: false }); } };   // (test hook)
    window.__atlasLs = dbg;
    return {
      stop() { stopped = true; if (window.__atlasLs === dbg) delete window.__atlasLs; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el, _debug: dbg,
    };
  }
  window.AtlasLessons = { has: id => !!DATA[id], list, next, start, data: id => DATA[id].load().then(D => D.data) };
})();
