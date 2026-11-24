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
      pass: '合格！ {p} / {m}点。よくがんばったね、この調子で次のレッスンもいこう！', fail: '{p} / {m}点。合格は{q}点、あと少し！ もう一度いってみよう！', step: '{i} / {n}手目', end: '手順はここまで。つぎは練習問題に挑戦しよう！', endOnly: '基本の手順はここまで。おつかれさま！',
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
  let autoCssDone = false;
  function autoCss() {   // the auto-advance meter: a bar filling the 次へ button (shared/cardbar.js .cb-auto)
    if (autoCssDone) return; autoCssDone = true; const st = document.createElement('style');
    st.textContent = `.bgch{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}.bgch[hidden]{display:none}.bgch .btn{flex:1 1 auto;min-width:0;padding:7px 10px;font-size:13px;background:#fff;color:#2b3044;border:2px solid #e2d6bf;box-shadow:none}.bgch .btn.ok{background:#1ea36c;color:#fff;border-color:#1ea36c}.bgch .btn.ng{background:#ff5d5d;color:#fff;border-color:#ff5d5d}.ls-spot{display:inline-block;width:.78em;height:.78em;border-radius:50%;vertical-align:-.06em;margin:0 .12em;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 6px currentColor}.ls-spot.ok{background:#2fd17a;color:#2fd17a}.ls-spot.ng{background:#e0301e;color:#e0301e}.ls-spot.hl{background:#ffb21a;color:#ffb21a}.lsg [data-a=next].ls-auto{position:relative;overflow:hidden}.lsg [data-a=next].ls-auto::after{content:'';position:absolute;inset-inline-start:0;bottom:0;height:4px;width:100%;background:currentColor;opacity:.55;transform-origin:left;animation:lsAuto var(--ls-auto-ms,2400ms) linear forwards}html[dir=rtl] .lsg [data-a=next].ls-auto::after{transform-origin:right}@keyframes lsAuto{from{transform:scaleX(0)}to{transform:scaleX(1)}}`;
    document.head.appendChild(st);
  }
  // the lesson's / opening's topic, said as a sentence: [lesson, opening]
  const TOPIC = {
    ja: ['今日は「{t}」について学ぶよ！', '今日は「{t}」の進み方を見ていこう！'], en: ["Today we'll learn about {t}!", "Today let's look at how {t} goes!"],
    zh: ['今天来学习「{t}」吧！', '今天来看看「{t}」的下法吧！'], 'zh-TW': ['今天來學習「{t}」吧！', '今天來看看「{t}」的下法吧！'],
    ko: ['오늘은 「{t}」에 대해 배워 보자!', '오늘은 「{t}」의 진행을 살펴보자!'], es: ['¡Hoy aprendemos sobre {t}!', '¡Hoy vemos cómo se juega {t}!'],
    fr: ['Aujourd’hui, on apprend : {t} !', 'Aujourd’hui, voyons comment se joue {t} !'], pt: ['Hoje vamos aprender sobre {t}!', 'Hoje vamos ver como se joga {t}!'],
    de: ['Heute lernen wir: {t}!', 'Heute schauen wir uns {t} an!'], ru: ['Сегодня учим: {t}!', 'Сегодня разбираем: {t}!'],
    tr: ['Bugün {t} konusunu öğreniyoruz!', 'Bugün {t} nasıl oynanır, bakalım!'], id: ['Hari ini kita belajar tentang {t}!', 'Hari ini kita lihat jalannya {t}!'],
    hi: ['आज हम {t} के बारे में सीखेंगे!', 'आज देखें {t} कैसे खेला जाता है!'], ar: ['اليوم نتعلّم عن {t}!', 'اليوم نرى كيف تُلعب {t}!'],
  };
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  /* ---------- the guides' own voice (2026-11-11) ----------
     Knighton (chess, ぼく) and Shogitsune (shogi, わたし, コン now and then) say the lesson's fixed lines in their own words
     (VOICE; other languages: the plain lines above). The lesson texts themselves come from the full games' data, written
     politely (です・ます): in Japanese the guide says them in plain, friendly speech (casualJa). */
  const VOICE = {
    reversi: { ja: { partial: 'おしい！', wrong: 'ざんねん…。' } },   // (2026-11-21: the lesson's own words say which square was best and why)
    backgammon: {
      ja: { hi: 'ワン！ ダイスンだよ。いっしょにバックギャモンのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の矢印の手なんだ。', wrong: 'おしい！ 緑の矢印が正解だよ。', hintSay: 'ヒント：青い輪の駒を動かしてみて。' },
      en: { hi: "Woof! Dicepup here. Let's study backgammon together.", partial: 'A nice play! But the green arrows are the best.', wrong: 'So close! The green arrows are the answer.', hintSay: 'Psst — move the checkers with the blue rings.' },
      zh: { hi: '汪！我是骰子汪。一起来学双陆棋吧。', partial: '好棋！不过最好的是绿色箭头。', wrong: '差一点！绿色箭头才是正解。', hintSay: '提示：动一动蓝色圈住的棋子。' },
      'zh-TW': { hi: '汪！我是骰子汪。一起來學雙陸棋吧。', partial: '好棋！不過最好的是綠色箭頭。', wrong: '差一點！綠色箭頭才是正解。', hintSay: '提示：動一動藍色圈住的棋子。' },
      ko: { hi: '멍! 다이슨이야. 같이 백개먼을 공부하자.', partial: '좋은 수야! 하지만 최선은 초록 화살표야.', wrong: '아깝다! 정답은 초록 화살표야.', hintSay: '힌트: 파란 고리의 말을 움직여 봐.' },
      es: { hi: '¡Guau! Soy Dicepup. Estudiemos backgammon juntos.', partial: '¡Buena jugada! Pero lo mejor son las flechas verdes.', wrong: '¡Casi! Las flechas verdes son la respuesta.', hintSay: 'Pista: mueve las fichas con aros azules.' },
      fr: { hi: 'Ouaf ! C’est Dicepup. Étudions le backgammon ensemble.', partial: 'Joli coup ! Mais le meilleur, ce sont les flèches vertes.', wrong: 'Presque ! La réponse, ce sont les flèches vertes.', hintSay: 'Indice : bouge les pions aux anneaux bleus.' },
      pt: { hi: 'Au! Aqui é o Dicepup. Vamos estudar gamão juntos.', partial: 'Boa jogada! Mas a melhor são as setas verdes.', wrong: 'Quase! A resposta são as setas verdes.', hintSay: 'Dica: mova as peças com anéis azuis.' },
      de: { hi: 'Wuff! Hier ist Dicepup. Lernen wir zusammen Backgammon.', partial: 'Schöner Zug! Aber am besten sind die grünen Pfeile.', wrong: 'Knapp! Die grünen Pfeile sind die Lösung.', hintSay: 'Tipp: Zieh die Steine mit den blauen Ringen.' },
      ru: { hi: 'Гав! Это Дайспап. Давайте изучать нарды вместе.', partial: 'Хороший ход! Но лучший — зелёные стрелки.', wrong: 'Почти! Ответ — зелёные стрелки.', hintSay: 'Подсказка: ходи шашками с синими кольцами.' },
      tr: { hi: 'Hav! Ben Dicepup. Birlikte tavla çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil oklar.', wrong: 'Az kaldı! Cevap yeşil oklar.', hintSay: 'İpucu: mavi halkalı pulları oynat.' },
      id: { hi: 'Guk! Aku Dicepup. Ayo belajar backgammon bersama.', partial: 'Langkah bagus! Tapi yang terbaik panah hijau.', wrong: 'Hampir! Jawabannya panah hijau.', hintSay: 'Petunjuk: gerakkan bidak bercincin biru.' },
      hi: { hi: 'भौं! मैं डाइसपप हूँ। चलो साथ में बैकगैमन सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छे हरे तीर हैं।', wrong: 'बस ज़रा सा! हरे तीर सही जवाब हैं।', hintSay: 'संकेत: नीले घेरे वाली गोटियाँ चलाओ।' },
      ar: { hi: 'هاو! أنا دايس باب. لنتعلم الطاولة معًا.', partial: 'نقلة جيدة! لكن الأفضل هي الأسهم الخضراء.', wrong: 'اقتربت! الجواب هو الأسهم الخضراء.', hintSay: 'تلميح: حرّك القطع ذات الحلقات الزرقاء.' },
    },
    xiangqi: {
      ja: { hi: 'ショウギツネだよ！ いっしょにシャンチーのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の矢印の手なんだ。', wrong: 'おしい！ 正解は緑の矢印の手だよ。', hintSay: 'ヒントだよ。金の丸の駒に注目してみて。', opGoal: 'この局面、いちばん良い次の一手はどれかな？' },
      en: { hi: "Shogitsune here! Let's study xiangqi together.", partial: 'A nice move! But the green arrow is the best.', wrong: 'So close! The green arrow is the answer.', hintSay: 'Psst — look at the pieces in the gold rings!', opGoal: 'What is the best next move here?' },
      zh: { hi: '我是将棋狐！一起来学象棋吧。', partial: '好棋！不过最好的是绿色箭头那一步。', wrong: '差一点！正解是绿色箭头那一步。', hintSay: '提示：注意金色圆圈里的棋子。', opGoal: '这个局面，最好的下一步是哪一步？' },
      'zh-TW': { hi: '我是將棋狐！一起來學象棋吧。', partial: '好棋！不過最好的是綠色箭頭那一步。', wrong: '差一點！正解是綠色箭頭那一步。', hintSay: '提示：注意金色圓圈裡的棋子。', opGoal: '這個局面，最好的下一步是哪一步？' },
      ko: { hi: '쇼기여우야! 같이 샹치를 공부하자.', partial: '좋은 수야! 하지만 가장 좋은 건 초록 화살표 수야.', wrong: '아깝다! 정답은 초록 화살표 수야.', hintSay: '힌트: 금색 원 안의 말을 봐.', opGoal: '이 국면에서 가장 좋은 다음 수는?' },
      es: { hi: '¡Soy Shogizorro! Estudiemos xiangqi juntos.', partial: '¡Buena jugada! Pero la mejor es la flecha verde.', wrong: '¡Casi! La respuesta es la flecha verde.', hintSay: 'Pista: mira las piezas con anillo dorado.', opGoal: '¿Cuál es la mejor jugada aquí?' },
      fr: { hi: 'C’est Shogirenard ! Étudions le xiangqi ensemble.', partial: 'Joli coup ! Mais le meilleur, c’est la flèche verte.', wrong: 'Presque ! La réponse est la flèche verte.', hintSay: 'Indice : regarde les pièces dans les anneaux dorés.', opGoal: 'Quel est le meilleur coup ici ?' },
      pt: { hi: 'Aqui é a Shogiraposa! Vamos estudar xiangqi juntos.', partial: 'Boa jogada! Mas a melhor é a seta verde.', wrong: 'Quase! A resposta é a seta verde.', hintSay: 'Dica: veja as peças nos anéis dourados.', opGoal: 'Qual é o melhor lance aqui?' },
      de: { hi: 'Hier ist Shogifuchs! Lass uns zusammen Xiangqi lernen.', partial: 'Guter Zug! Aber am besten ist der grüne Pfeil.', wrong: 'Knapp! Die Antwort ist der grüne Pfeil.', hintSay: 'Tipp: Schau auf die Steine in den goldenen Ringen.', opGoal: 'Was ist hier der beste Zug?' },
      ru: { hi: 'Это Сёгицунэ! Давай вместе изучать сянци.', partial: 'Хороший ход! Но лучший — зелёная стрелка.', wrong: 'Почти! Ответ — зелёная стрелка.', hintSay: 'Подсказка: смотри на фигуры в золотых кольцах.', opGoal: 'Какой здесь лучший ход?' },
      tr: { hi: 'Ben Shogitsune! Birlikte xiangqi çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil ok.', wrong: 'Az kaldı! Cevap yeşil ok.', hintSay: 'İpucu: altın halkalardaki taşlara bak.', opGoal: 'Burada en iyi hamle hangisi?' },
      id: { hi: 'Aku Shogitsune! Ayo belajar xiangqi bersama.', partial: 'Langkah bagus! Tapi yang terbaik panah hijau.', wrong: 'Hampir! Jawabannya panah hijau.', hintSay: 'Petunjuk: lihat bidak di cincin emas.', opGoal: 'Langkah terbaik di sini yang mana?' },
      hi: { hi: 'मैं शोगित्सुने हूँ! चलो साथ में शियांगची सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छी हरे तीर वाली है।', wrong: 'बस थोड़ा सा! जवाब हरे तीर वाली चाल है।', hintSay: 'संकेत: सुनहरे घेरे वाले मोहरे देखो।', opGoal: 'यहाँ सबसे अच्छी अगली चाल कौन सी है?' },
      ar: { hi: 'أنا شوغيتسوني! لنتعلّم الشيانغتشي معًا.', partial: 'نقلة جيدة! لكن الأفضل هو السهم الأخضر.', wrong: 'قريب جدًا! الإجابة هي السهم الأخضر.', hintSay: 'تلميح: انظر إلى القطع داخل الحلقات الذهبية.', opGoal: 'ما أفضل نقلة هنا؟' },
    },
    janggi: {   // (2026-11-24 担当D: as xiangqi, the game named)
      ja: { hi: 'ショウギツネだよ！ いっしょにチャンギのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の矢印の手なんだ。', wrong: 'おしい！ 正解は緑の矢印の手だよ。', hintSay: 'ヒントだよ。金の丸の駒に注目してみて。', opGoal: 'この局面、いちばん良い次の一手はどれかな？' },
      en: { hi: "Shogitsune here! Let's study janggi together.", partial: 'A nice move! But the green arrow is the best.', wrong: 'So close! The green arrow is the answer.', hintSay: 'Psst — look at the pieces in the gold rings!', opGoal: 'What is the best next move here?' },
      zh: { hi: '我是将棋狐！一起来学韩国象棋吧。', partial: '好棋！不过最好的是绿色箭头那一步。', wrong: '差一点！正解是绿色箭头那一步。', hintSay: '提示：注意金色圆圈里的棋子。', opGoal: '这个局面，最好的下一步是哪一步？' },
      'zh-TW': { hi: '我是將棋狐！一起來學韓國象棋吧。', partial: '好棋！不過最好的是綠色箭頭那一步。', wrong: '差一點！正解是綠色箭頭那一步。', hintSay: '提示：注意金色圓圈裡的棋子。', opGoal: '這個局面，最好的下一步是哪一步？' },
      ko: { hi: '쇼기여우야! 같이 장기를 공부하자.', partial: '좋은 수야! 하지만 가장 좋은 건 초록 화살표 수야.', wrong: '아깝다! 정답은 초록 화살표 수야.', hintSay: '힌트: 금색 원 안의 말을 봐.', opGoal: '이 국면에서 가장 좋은 다음 수는?' },
      es: { hi: '¡Soy Shogizorro! Estudiemos janggi juntos.', partial: '¡Buena jugada! Pero la mejor es la flecha verde.', wrong: '¡Casi! La respuesta es la flecha verde.', hintSay: 'Pista: mira las piezas con anillo dorado.', opGoal: '¿Cuál es la mejor jugada aquí?' },
      fr: { hi: 'C’est Shogirenard ! Étudions le janggi ensemble.', partial: 'Joli coup ! Mais le meilleur, c’est la flèche verte.', wrong: 'Presque ! La réponse est la flèche verte.', hintSay: 'Indice : regarde les pièces dans les anneaux dorés.', opGoal: 'Quel est le meilleur coup ici ?' },
      pt: { hi: 'Aqui é a Shogiraposa! Vamos estudar janggi juntos.', partial: 'Boa jogada! Mas a melhor é a seta verde.', wrong: 'Quase! A resposta é a seta verde.', hintSay: 'Dica: veja as peças nos anéis dourados.', opGoal: 'Qual é o melhor lance aqui?' },
      de: { hi: 'Hier ist Shogifuchs! Lass uns zusammen Janggi lernen.', partial: 'Guter Zug! Aber am besten ist der grüne Pfeil.', wrong: 'Knapp! Die Antwort ist der grüne Pfeil.', hintSay: 'Tipp: Schau auf die Steine in den goldenen Ringen.', opGoal: 'Was ist hier der beste Zug?' },
      ru: { hi: 'Это Сёгицунэ! Давай вместе изучать чанги.', partial: 'Хороший ход! Но лучший — зелёная стрелка.', wrong: 'Почти! Ответ — зелёная стрелка.', hintSay: 'Подсказка: смотри на фигуры в золотых кольцах.', opGoal: 'Какой здесь лучший ход?' },
      tr: { hi: 'Ben Shogitsune! Birlikte janggi çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil ok.', wrong: 'Az kaldı! Cevap yeşil ok.', hintSay: 'İpucu: altın halkalardaki taşlara bak.', opGoal: 'Burada en iyi hamle hangisi?' },
      id: { hi: 'Aku Shogitsune! Ayo belajar janggi bersama.', partial: 'Langkah bagus! Tapi yang terbaik panah hijau.', wrong: 'Hampir! Jawabannya panah hijau.', hintSay: 'Petunjuk: lihat bidak di cincin emas.', opGoal: 'Langkah terbaik di sini yang mana?' },
      hi: { hi: 'मैं शोगित्सुने हूँ! चलो साथ में जांग्गी सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छी हरे तीर वाली है।', wrong: 'बस थोड़ा सा! जवाब हरे तीर वाली चाल है।', hintSay: 'संकेत: सुनहरे घेरे वाले मोहरे देखो।', opGoal: 'यहाँ सबसे अच्छी अगली चाल कौन सी है?' },
      ar: { hi: 'أنا شوغيتسوني! لنتعلّم الجانغي معًا.', partial: 'نقلة جيدة! لكن الأفضل هو السهم الأخضر.', wrong: 'قريب جدًا! الإجابة هي السهم الأخضر.', hintSay: 'تلميح: انظر إلى القطع داخل الحلقات الذهبية.', opGoal: 'ما أفضل نقلة هنا؟' },
    },
    checkers: {
      ja: { hi: 'チェッカニだよ！ いっしょにチェッカーのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の矢印の手なんだ。', wrong: 'おしい！ 正解は緑の矢印の手だよ。', hintSay: 'ヒントだよ。金の丸の駒に注目してみて。', opGoal: 'この局面、いちばん良い次の一手はどれかな？' },
      en: { hi: "Checkrab here! Let's study checkers together.", partial: 'A nice move! But the green arrow is the best.', wrong: 'So close! The green arrow is the answer.', hintSay: 'Psst — look at the pieces in the gold rings!', opGoal: 'What is the best next move here?' },
    },
    connect4: {
      ja: { hi: 'ポトンウサだよ！ いっしょにコネクトフォーのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の印の列なんだ。', wrong: 'おしい！ 正解は緑の印の列だよ。', hintSay: 'ヒントだよ。印のマスをよく見てみて。' },
      en: { hi: "Plopbun here! Let's study Connect Four together.", partial: 'A nice move! But the green-marked column is the best.', wrong: 'So close! The green-marked column is the answer.', hintSay: 'Psst — look at the marked cells.' },
      zh: { hi: '我是叮咚兔！一起来学四子棋吧。', partial: '好棋！不过最好的是绿色标记的那一列。', wrong: '差一点！正解是绿色标记的那一列。', hintSay: '提示：仔细看标记的格子。' },
      'zh-TW': { hi: '我是叮咚兔！一起來學四子棋吧。', partial: '好棋！不過最好的是綠色標記的那一列。', wrong: '差一點！正解是綠色標記的那一列。', hintSay: '提示：仔細看標記的格子。' },
      ko: { hi: '포통우사야! 같이 커넥트 포를 공부하자.', partial: '좋은 수야! 하지만 최선은 초록 표시 열이야.', wrong: '아깝다! 정답은 초록 표시 열이야.', hintSay: '힌트: 표시된 칸을 잘 봐.' },
      es: { hi: '¡Soy Plopbun! Estudiemos Conecta 4 juntos.', partial: '¡Buena jugada! Pero la mejor es la columna verde.', wrong: '¡Casi! La respuesta es la columna verde.', hintSay: 'Pista: mira las casillas marcadas.' },
      fr: { hi: 'C’est Plopbun ! Étudions le Puissance 4 ensemble.', partial: 'Joli coup ! Mais la meilleure est la colonne verte.', wrong: 'Presque ! La réponse est la colonne verte.', hintSay: 'Indice : regarde les cases marquées.' },
      pt: { hi: 'Aqui é o Plopbun! Vamos estudar Lig 4 juntos.', partial: 'Boa jogada! Mas a melhor é a coluna verde.', wrong: 'Quase! A resposta é a coluna verde.', hintSay: 'Dica: veja as casas marcadas.' },
      de: { hi: 'Hier ist Plopbun! Lass uns zusammen Vier gewinnt lernen.', partial: 'Guter Zug! Aber am besten ist die grüne Spalte.', wrong: 'Knapp! Die Antwort ist die grüne Spalte.', hintSay: 'Tipp: Schau dir die markierten Felder an.' },
      ru: { hi: 'Это Плопбан! Давай вместе изучать «Четыре в ряд».', partial: 'Хороший ход! Но лучший — зелёный столбец.', wrong: 'Почти! Ответ — зелёный столбец.', hintSay: 'Подсказка: посмотри на отмеченные клетки.' },
      tr: { hi: 'Ben Plopbun! Birlikte Dört Bağlamaca çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil sütun.', wrong: 'Az kaldı! Cevap yeşil sütun.', hintSay: 'İpucu: işaretli karelere bak.' },
      id: { hi: 'Aku Plopbun! Ayo belajar Connect Four bersama.', partial: 'Langkah bagus! Tapi yang terbaik kolom hijau.', wrong: 'Hampir! Jawabannya kolom hijau.', hintSay: 'Petunjuk: lihat kotak yang bertanda.' },
      hi: { hi: 'मैं प्लॉपबन हूँ! चलो साथ में कनेक्ट फ़ोर सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छा हरा स्तंभ है।', wrong: 'करीब था! जवाब हरा स्तंभ है।', hintSay: 'संकेत: निशान वाले खानों को देखो।' },
      ar: { hi: 'أنا بلوب بن! لنتعلّم أربعة في صف معًا.', partial: 'نقلة جيدة! لكن الأفضل هو العمود الأخضر.', wrong: 'قريب جدًا! الجواب هو العمود الأخضر.', hintSay: 'تلميح: انظر إلى الخانات المعلّمة.' },
    },
    mancala: {
      ja: { hi: 'マンカラビだよ！ いっしょにマンカラのお勉強をしよう。', partial: 'いい手！ でもいちばんは金の丸の穴なんだ。', wrong: 'おしい！ 正解は金の丸の穴だよ。', hintSay: 'ヒント：種の数を数えてみて。' },
      en: { hi: "Gembeetle here! Let's study mancala together.", partial: 'A nice move! But the gold-ringed pit is the best.', wrong: 'So close! The gold-ringed pit is the answer.', hintSay: 'Hint: count the seeds.' },
      zh: { hi: '我是宝石甲虫！一起来学播棋吧。', partial: '好棋！不过最好的是金圈的坑。', wrong: '差一点！正解是金圈的坑。', hintSay: '提示：数一数种子。' },
      'zh-TW': { hi: '我是寶石甲蟲！一起來學播棋吧。', partial: '好棋！不過最好的是金圈的洞。', wrong: '差一點！正解是金圈的洞。', hintSay: '提示：數一數種子。' },
      ko: { hi: '보석풍뎅이야! 같이 만칼라를 공부하자.', partial: '좋은 수야! 하지만 최선은 금색 고리 구멍이야.', wrong: '아깝다! 정답은 금색 고리 구멍이야.', hintSay: '힌트: 씨앗 수를 세어 봐.' },
      es: { hi: '¡Soy Escarabajoya! Estudiemos mancala juntos.', partial: '¡Buena jugada! Pero la mejor es el hoyo con anillo dorado.', wrong: '¡Casi! La respuesta es el hoyo con anillo dorado.', hintSay: 'Pista: cuenta las semillas.' },
      fr: { hi: 'C’est Scarabijou ! Étudions le mancala ensemble.', partial: 'Joli coup ! Mais le meilleur est le trou cerclé d’or.', wrong: 'Presque ! La réponse est le trou cerclé d’or.', hintSay: 'Indice : compte les graines.' },
      pt: { hi: 'Aqui é o Besourojoia! Vamos estudar mancala juntos.', partial: 'Boa jogada! Mas a melhor é a casa com anel dourado.', wrong: 'Quase! A resposta é a casa com anel dourado.', hintSay: 'Dica: conte as sementes.' },
      de: { hi: 'Hier ist Juwelkäfer! Lass uns zusammen Mancala lernen.', partial: 'Guter Zug! Aber am besten ist die golden umrandete Mulde.', wrong: 'Knapp! Die Antwort ist die golden umrandete Mulde.', hintSay: 'Tipp: Zähl die Samen.' },
      ru: { hi: 'Это Джембитл! Давай вместе изучать манкалу.', partial: 'Хороший ход! Но лучший — лунка с золотым кольцом.', wrong: 'Почти! Ответ — лунка с золотым кольцом.', hintSay: 'Подсказка: посчитай камни.' },
      tr: { hi: 'Ben Gembeetle! Birlikte mangala çalışalım.', partial: 'Güzel hamle! Ama en iyisi altın halkalı çukur.', wrong: 'Az kaldı! Cevap altın halkalı çukur.', hintSay: 'İpucu: taşları say.' },
      id: { hi: 'Aku Gembeetle! Ayo belajar congklak bersama.', partial: 'Langkah bagus! Tapi yang terbaik lubang bercincin emas.', wrong: 'Hampir! Jawabannya lubang bercincin emas.', hintSay: 'Petunjuk: hitung bijinya.' },
      hi: { hi: 'मैं रत्नू भौंरा हूँ! चलो साथ में मनकला सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छा सुनहरे घेरे वाला गड्ढा है।', wrong: 'बहुत क़रीब! जवाब सुनहरे घेरे वाला गड्ढा है।', hintSay: 'संकेत: बीज गिनो।' },
      ar: { hi: 'أنا خنفوس الجواهر! لنتعلّم المنقلة معًا.', partial: 'نقلة جيدة! لكن الأفضل هي الحفرة ذات الحلقة الذهبية.', wrong: 'قريب جدًا! الجواب هو الحفرة ذات الحلقة الذهبية.', hintSay: 'تلميح: عُدَّ البذور.' },
    },
    dots: {
      ja: { hi: 'ハコピヨだよ！ いっしょにドット・アンド・ボックスのお勉強をしよう。', partial: 'いい線！ でも、もっといい線があるんだ。', wrong: 'おしい！', hintSay: 'ヒント：金色の線を見てね。' },
      en: { hi: "Boxchick here! Let's study dots and boxes together.", partial: 'A nice line! But the green one is the best.', wrong: 'So close! The green line is the answer.', hintSay: 'Hint: look at the gold lines.' },
      zh: { hi: '我是方块小鸡！一起来学点格棋吧。', partial: '好线！不过最好的是绿色那条。', wrong: '差一点！正解是绿色那条线。', hintSay: '提示：看看金色的线。' },
      'zh-TW': { hi: '我是方塊小雞！一起來學點格棋吧。', partial: '好線！不過最好的是綠色那條。', wrong: '差一點！正解是綠色那條線。', hintSay: '提示：看看金色的線。' },
      ko: { hi: '하코피요야! 같이 도트 앤 박스를 공부하자.', partial: '좋은 선이야! 하지만 최선은 초록 선이야.', wrong: '아깝다! 정답은 초록 선이야.', hintSay: '힌트: 금색 선을 봐.' },
      es: { hi: '¡Soy Boxchick! Estudiemos puntos y cajas juntos.', partial: '¡Buena línea! Pero la mejor es la verde.', wrong: '¡Casi! La respuesta es la línea verde.', hintSay: 'Pista: mira las líneas doradas.' },
      fr: { hi: 'C’est Boxchick ! Étudions la pipopipette ensemble.', partial: 'Jolie ligne ! Mais la meilleure est la verte.', wrong: 'Presque ! La réponse est la ligne verte.', hintSay: 'Indice : regarde les lignes dorées.' },
      pt: { hi: 'Aqui é o Boxchick! Vamos estudar pontinhos juntos.', partial: 'Boa linha! Mas a melhor é a verde.', wrong: 'Quase! A resposta é a linha verde.', hintSay: 'Dica: olhe as linhas douradas.' },
      de: { hi: 'Hier ist Boxchick! Lass uns zusammen Käsekästchen lernen.', partial: 'Gute Linie! Aber am besten ist die grüne.', wrong: 'Knapp! Die Antwort ist die grüne Linie.', hintSay: 'Tipp: schau auf die goldenen Linien.' },
      ru: { hi: 'Это Боксчик! Давай вместе изучать точки и квадраты.', partial: 'Хорошая линия! Но лучшая — зелёная.', wrong: 'Почти! Ответ — зелёная линия.', hintSay: 'Подсказка: смотри на золотые линии.' },
      tr: { hi: 'Ben Boxchick! Birlikte noktalar ve kutular çalışalım.', partial: 'Güzel çizgi! Ama en iyisi yeşil olan.', wrong: 'Az kaldı! Cevap yeşil çizgi.', hintSay: 'İpucu: altın çizgilere bak.' },
      id: { hi: 'Aku Boxchick! Ayo belajar titik dan kotak bersama.', partial: 'Garis bagus! Tapi yang terbaik yang hijau.', wrong: 'Hampir! Jawabannya garis hijau.', hintSay: 'Petunjuk: lihat garis emas.' },
      hi: { hi: 'मैं बॉक्सचिक हूँ! चलो साथ में डॉट्स एंड बॉक्सेस सीखें।', partial: 'अच्छी रेखा! पर सबसे अच्छी हरी वाली है।', wrong: 'करीब! जवाब हरी रेखा है।', hintSay: 'संकेत: सुनहरी रेखाएँ देखो।' },
      ar: { hi: 'أنا بوكس تشيك! لنتعلّم النقاط والمربعات معًا.', partial: 'خط جيد! لكن الأفضل هو الأخضر.', wrong: 'قريب جدًا! الجواب هو الخط الأخضر.', hintSay: 'تلميح: انظر إلى الخطوط الذهبية.' },
    },
    morris: {
      ja: { hi: 'モリフクだよ！ いっしょにモリスのお勉強をしよう。', partial: 'いい手！ でもいちばんは緑の印の手なんだ。', wrong: 'おしい！ 正解は緑の印の手だよ。', hintSay: 'ヒント：金の丸を見てね。' },
      en: { hi: "Millowl here! Let's study morris together.", partial: 'A nice move! But the green-marked move is the best.', wrong: 'So close! The green-marked move is the answer.', hintSay: 'Hint: look at the gold rings.' },
      zh: { hi: '我是方阵猫头鹰！一起来学直棋吧。', partial: '好棋！不过最好的是绿色标记的那步。', wrong: '差一点！正解是绿色标记的那步。', hintSay: '提示：看看金色的圈。' },
      'zh-TW': { hi: '我是方陣貓頭鷹！一起來學直棋吧。', partial: '好棋！不過最好的是綠色標記的那步。', wrong: '差一點！正解是綠色標記的那步。', hintSay: '提示：看看金色的圈。' },
      ko: { hi: '모리후쿠야! 같이 모리스를 공부하자.', partial: '좋은 수야! 하지만 최선은 초록 표시 수야.', wrong: '아깝다! 정답은 초록 표시 수야.', hintSay: '힌트: 금색 고리를 봐.' },
      es: { hi: '¡Soy Millowl! Estudiemos el molino juntos.', partial: '¡Buena jugada! Pero la mejor es la marcada en verde.', wrong: '¡Casi! La respuesta es la jugada marcada en verde.', hintSay: 'Pista: mira los anillos dorados.' },
      fr: { hi: 'C’est Millowl ! Étudions la marelle ensemble.', partial: 'Joli coup ! Mais le meilleur est celui marqué en vert.', wrong: 'Presque ! La réponse est le coup marqué en vert.', hintSay: 'Indice : regarde les anneaux dorés.' },
      pt: { hi: 'Aqui é o Millowl! Vamos estudar trilha juntos.', partial: 'Boa jogada! Mas a melhor é a marcada em verde.', wrong: 'Quase! A resposta é a jogada marcada em verde.', hintSay: 'Dica: olhe os anéis dourados.' },
      de: { hi: 'Hier ist Millowl! Lass uns zusammen Mühle lernen.', partial: 'Guter Zug! Aber am besten ist der grün markierte.', wrong: 'Knapp! Die Antwort ist der grün markierte Zug.', hintSay: 'Tipp: schau auf die goldenen Ringe.' },
      ru: { hi: 'Это Миллоул! Давай вместе изучать мельницу.', partial: 'Хороший ход! Но лучший — отмеченный зелёным.', wrong: 'Почти! Ответ — ход, отмеченный зелёным.', hintSay: 'Подсказка: смотри на золотые кольца.' },
      tr: { hi: 'Ben Millowl! Birlikte dokuz taş çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil işaretli olan.', wrong: 'Az kaldı! Cevap yeşil işaretli hamle.', hintSay: 'İpucu: altın halkalara bak.' },
      id: { hi: 'Aku Millowl! Ayo belajar morris bersama.', partial: 'Langkah bagus! Tapi yang terbaik bertanda hijau.', wrong: 'Hampir! Jawabannya langkah bertanda hijau.', hintSay: 'Petunjuk: lihat cincin emas.' },
      hi: { hi: 'मैं मिलआउल हूँ! चलो साथ में मोरिस सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छी हरे निशान वाली है।', wrong: 'करीब! जवाब हरे निशान वाली चाल है।', hintSay: 'संकेत: सुनहरे घेरे देखो।' },
      ar: { hi: 'أنا ميل أول! لنتعلّم المورِس معًا.', partial: 'نقلة جيدة! لكن الأفضل هي المعلّمة بالأخضر.', wrong: 'قريب جدًا! الجواب هو النقلة المعلّمة بالأخضر.', hintSay: 'تلميح: انظر إلى الحلقات الذهبية.' },
    },
    tafl: {
      ja: { hi: 'タフリンだよ！ いっしょにタフルのお勉強をしよう。', partial: 'いい手！ でもいちばんは緑の印の手なんだ。', wrong: 'おしい！ 正解は緑の印の手だよ。', hintSay: 'ヒント：光っている駒から考えてみて。' },
      en: { hi: "Taflin here! Let's study tafl together.", partial: 'A nice move! But the green-marked move is the best.', wrong: 'So close! The green-marked move is the answer.', hintSay: 'Hint: start from the glowing pieces.' },
      zh: { hi: '我是塔芙林！一起来学塔夫棋吧。', partial: '好棋！不过最好的是绿色标记的那步。', wrong: '差一点！正解是绿色标记的那步。', hintSay: '提示：从发光的棋子想起。' },
      'zh-TW': { hi: '我是塔芙林！一起來學塔夫棋吧。', partial: '好棋！不過最好的是綠色標記的那步。', wrong: '差一點！正解是綠色標記的那步。', hintSay: '提示：從發光的棋子想起。' },
      ko: { hi: '타플린이야! 같이 타플을 공부하자.', partial: '좋은 수야! 하지만 최선은 초록 표시 수야.', wrong: '아깝다! 정답은 초록 표시 수야.', hintSay: '힌트: 빛나는 말부터 생각해 봐.' },
      es: { hi: '¡Soy Taflín! Estudiemos tafl juntos.', partial: '¡Buena jugada! Pero la mejor es la marcada en verde.', wrong: '¡Casi! La respuesta es la jugada marcada en verde.', hintSay: 'Pista: empieza por las piezas que brillan.' },
      fr: { hi: 'C’est Taflin ! Étudions le tafl ensemble.', partial: 'Joli coup ! Mais le meilleur est celui marqué en vert.', wrong: 'Presque ! La réponse est le coup marqué en vert.', hintSay: 'Indice : pars des pièces qui brillent.' },
      pt: { hi: 'Aqui é o Taflin! Vamos estudar tafl juntos.', partial: 'Boa jogada! Mas a melhor é a marcada em verde.', wrong: 'Quase! A resposta é a jogada marcada em verde.', hintSay: 'Dica: comece pelas peças que brilham.' },
      de: { hi: 'Hier ist Taflin! Lass uns zusammen Tafl lernen.', partial: 'Guter Zug! Aber am besten ist der grün markierte.', wrong: 'Knapp! Die Antwort ist der grün markierte Zug.', hintSay: 'Tipp: Fang bei den leuchtenden Steinen an.' },
      ru: { hi: 'Это Тафлин! Давай вместе изучать тафл.', partial: 'Хороший ход! Но лучший — отмеченный зелёным.', wrong: 'Почти! Ответ — ход, отмеченный зелёным.', hintSay: 'Подсказка: начни со светящихся фишек.' },
      tr: { hi: 'Ben Taflin! Birlikte tafl çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil işaretli olan.', wrong: 'Az kaldı! Cevap yeşil işaretli hamle.', hintSay: 'İpucu: parlayan taşlardan başla.' },
      id: { hi: 'Aku Taflin! Ayo belajar tafl bersama.', partial: 'Langkah bagus! Tapi yang terbaik bertanda hijau.', wrong: 'Hampir! Jawabannya langkah bertanda hijau.', hintSay: 'Petunjuk: mulai dari bidak yang bersinar.' },
      hi: { hi: 'मैं टैफ़लिन हूँ! चलो साथ में टैफ़्ल सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छी हरे निशान वाली है।', wrong: 'बहुत क़रीब! जवाब हरे निशान वाली चाल है।', hintSay: 'संकेत: चमकती गोटियों से सोचो।' },
      ar: { hi: 'أنا تافلين! لنتعلّم التافل معًا.', partial: 'نقلة جيدة! لكن الأفضل هي المعلّمة بالأخضر.', wrong: 'قريب جدًا! الجواب هو النقلة المعلّمة بالأخضر.', hintSay: 'تلميح: ابدأ من القطع المضيئة.' },
    },
    amazons: {
      ja: { hi: 'ケロだよ！ いっしょにアマゾンズのお勉強をするケロ。', partial: 'いい手ケロ。でもいちばんは緑の印の手なんだ。', wrong: 'おしい！ 正解は緑の印の手ケロ。', hintSay: 'ヒントだケロ。光っているアマゾンから考えてみて。' },
      en: { hi: "Kero here! Let's study Amazons together.", partial: 'A nice move! But the green-marked move is the best.', wrong: 'So close! The green-marked move is the answer.', hintSay: 'Psst — start from the glowing amazons.' },
      zh: { hi: '我是呱呱！一起来学亚马逊棋吧。', partial: '好棋！不过最好的是绿色标记的那步。', wrong: '差一点！正解是绿色标记的那步。', hintSay: '提示：从发光的亚马逊想起。' },
      'zh-TW': { hi: '我是呱呱！一起來學亞馬遜棋吧。', partial: '好棋！不過最好的是綠色標記的那步。', wrong: '差一點！正解是綠色標記的那步。', hintSay: '提示：從發光的亞馬遜想起。' },
      ko: { hi: '케로야! 같이 아마존을 공부하자.', partial: '좋은 수야! 하지만 최선은 초록 표시 수야.', wrong: '아깝다! 정답은 초록 표시 수야.', hintSay: '힌트: 빛나는 아마존부터 생각해 봐.' },
      es: { hi: '¡Soy Kero! Estudiemos Amazonas juntos.', partial: '¡Buena jugada! Pero la mejor es la marcada en verde.', wrong: '¡Casi! La respuesta es la jugada marcada en verde.', hintSay: 'Pista: empieza por las amazonas que brillan.' },
      fr: { hi: 'C’est Kero ! Étudions les Amazones ensemble.', partial: 'Joli coup ! Mais le meilleur est celui marqué en vert.', wrong: 'Presque ! La réponse est le coup marqué en vert.', hintSay: 'Indice : pars des amazones qui brillent.' },
      pt: { hi: 'Aqui é o Kero! Vamos estudar Amazonas juntos.', partial: 'Boa jogada! Mas a melhor é a marcada em verde.', wrong: 'Quase! A resposta é a jogada marcada em verde.', hintSay: 'Dica: comece pelas amazonas que brilham.' },
      de: { hi: 'Hier ist Kero! Lass uns zusammen Amazonen lernen.', partial: 'Guter Zug! Aber am besten ist der grün markierte.', wrong: 'Knapp! Die Antwort ist der grün markierte Zug.', hintSay: 'Tipp: Fang bei den leuchtenden Amazonen an.' },
      ru: { hi: 'Это Керо! Давай вместе изучать амазонок.', partial: 'Хороший ход! Но лучший — отмеченный зелёным.', wrong: 'Почти! Ответ — ход, отмеченный зелёным.', hintSay: 'Подсказка: начни со светящихся амазонок.' },
      tr: { hi: 'Ben Kero! Birlikte Amazonlar çalışalım.', partial: 'Güzel hamle! Ama en iyisi yeşil işaretli olan.', wrong: 'Az kaldı! Cevap yeşil işaretli hamle.', hintSay: 'İpucu: parlayan amazonlardan başla.' },
      id: { hi: 'Aku Kero! Ayo belajar Amazon bersama.', partial: 'Langkah bagus! Tapi yang terbaik bertanda hijau.', wrong: 'Hampir! Jawabannya langkah bertanda hijau.', hintSay: 'Petunjuk: mulai dari amazon yang bersinar.' },
      hi: { hi: 'मैं केरो हूँ! चलो साथ में अमेज़न्स सीखें।', partial: 'अच्छी चाल! पर सबसे अच्छी हरे निशान वाली है।', wrong: 'करीब था! जवाब हरे निशान वाली चाल है।', hintSay: 'संकेत: चमकती अमेज़न से शुरू करो।' },
      ar: { hi: 'أنا كيرو! لنتعلّم الأمازونات معًا.', partial: 'نقلة جيدة! لكن الأفضل هي المعلّمة بالأخضر.', wrong: 'قريب جدًا! الجواب هو النقلة المعلّمة بالأخضر.', hintSay: 'تلميح: ابدأ من الأمازونات المضيئة.' },
    },
    hex: {
      ja: { hi: 'ゴイシペンだよ！ いっしょにヘックスのお勉強をしよう。', partial: 'いい手だね。でもいちばんは緑の印の点なんだ。', wrong: 'おしい！ 正解は緑の印の点だよ。', hintSay: 'ヒントだよ。印のあたりをよく見てみて。' },
      en: { hi: "Stoneguin here! Let's study Hex together.", partial: 'A nice move! But the green mark is the best.', wrong: 'So close! The green mark is the answer.', hintSay: 'Psst — look around the marked cells.' },
    },
    gomoku: {
      ja: { hi: 'ゴイシペンだよ！ いっしょに五目並べのお勉強をしよう。', partial: 'いい手だね。でもいちばんは光ってる点なんだ。', wrong: 'おしい！ 正解は光ってる点だよ。', hintSay: 'ヒントだよ。光ってるあたりに注目してみて。', opGoal: 'この局面、いちばん良い次の一手はどこかな？' },
      en: { hi: "Stoneguin here! Let's study gomoku together.", partial: 'A nice move! But the glowing point is the best.', wrong: 'So close! The glowing point is the answer.', hintSay: 'Psst — look around the glowing points!', opGoal: 'What is the best next move here?' },
    },
    chess: {
      ja: { hi: 'やあ、ナイトンだよ！ 今日のレッスン、いっしょにピョンピョンがんばろう！', partial: 'いい手だね！ でもいちばんは光ってる手なんだ。', wrong: 'おしい〜！ 正解は光ってる手だよ。',
        pass: 'やったね、合格！ {p} / {m}点。この調子で、次のレッスンも行こう！', fail: '{p} / {m}点。合格は{q}点だよ。もう一回いってみよう！', end: '手順はここまで！ 次は練習問題で腕だめしだ！',
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
  const ICHI_I = /(でき|見|起き|生き|落ち|足り|借り|[\u4e00-\u9fff]じ|浴び|伸び|延び|過ぎ|尽き|満ち|用い|着|似|居|得|出|寝)$/;
  const KANJI = /[\u4e00-\u9fff々]/;
  function verb(stem) {   // the verb stem before ます → { dict, neg, vol, past }
    const k = stem.slice(-1), body = stem.slice(0, -1);
    if (/[\u30a1-\u30f6]{2}$/.test(stem)) {   // (2026-11-21 lesson loop: a go term in katakana — カカリます → カカる, ハネます → ハネる, ノビます → ノビる)
      const h = String.fromCharCode(k.charCodeAt(0) - 0x60), ichi = /[えけげせぜてでねへべめれ]/.test(h) || /(ノビ|オリ|イレ)$/.test(stem);
      if (ichi) return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };
      if (I2U[h]) return { dict: body + I2U[h], neg: body + I2A[h] + 'ない', vol: body + I2O[h] + 'う', past: body + (I2T[h] || 'った') };
      return null;
    }
    if (/[てで][いみ]$/.test(stem)) return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };   // (〜ています: the いる of the progressive)
    // し: する after a noun / particle / two kanji (確認し), す after one kanji or the a-row kana of 動かし・逃がし・増やし (godan)
    if (k === 'し' && (stem.length === 1 || (KANJI.test(stem.slice(-2, -1)) && KANJI.test(stem.slice(-3, -2))) || !(KANJI.test(stem.slice(-2, -1)) || /[かがさやらわまたなば]/.test(stem.slice(-2, -1))))) return { dict: body + 'する', neg: body + 'しない', vol: body + 'しよう', past: body + 'した' };
    if (/来$/.test(stem) || /来き$/.test(stem)) return { dict: stem.replace(/き?$/, '') + 'る', neg: stem.replace(/き?$/, '') + 'ない', vol: stem.replace(/き?$/, '') + 'よう', past: stem.replace(/き?$/, '') + 'た' };
    if (/あり$/.test(stem)) return { dict: body + 'る', neg: body.slice(0, -1) + 'ない', vol: body + 'ろう', past: body + 'った' };
    if (/[えけげせぜてでねへべめれ]$/.test(stem) || ICHI_I.test(stem) || stem === 'い') return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };
    if (I2U[k]) return { dict: body + I2U[k], neg: body + I2A[k] + 'ない', vol: body + I2O[k] + 'う', past: body + (/行$/.test(body) ? 'った' : I2T[k]) };
    return null;
  }
  function casualJa(html, fox) {   // → plain speech; the sentence ends it made are tokens (\u0003D noun+だ, \u0003V verb, \u0003P past) for guideJa
    const E = '(?=[。！？!?」（(）)]|<br>|</b>|</p>|$)';
    let t = String(html)
      .replace(new RegExp('でしょうか' + E, 'g'), 'かな').replace(new RegExp('でしょう' + E, 'g'), 'だろうね')
      .replace(new RegExp('でした' + E, 'g'), 'だった\u0003P').replace(new RegExp('ですか' + E, 'g'), 'かな').replace(new RegExp('(しい|たい|ない|多い|強い|弱い|大きい|小さい|高い|低い|良い|いい|早い|遅い|近い|遠い|広い|狭い|危ない|少ない)です' + E, 'g'), (m, k) => k + '\u0003V')   // (多いです・新しいです → 多いよ: an adjective drops です)
      .replace(new RegExp('です' + E, 'g'), '\u0003D')
      .replace(/だよ(?=。|<br>|$)/g, '\u0003D')   // (the hand-written casual lines too: their だよ joins the rotation)
      .replace(new RegExp('([てで])ください' + E, 'g'), '$1ね')
      .replace(/ですが/g, 'だけど')
      .replace(new RegExp('([\\u3040-\\u30ff\\u4e00-\\u9fff々]+?)(ましょう|ません|ました|ますか|ますが|ます)' + E.replace('(?=[', '(?=[、'), 'g'), (m, stem, end, at, all) => {
        if (end !== 'ますが' && all[at + m.length] === '、') return m;   // (mid-sentence: left as it is)
        for (let n = Math.min(stem.length, 6); n >= 1; n--) {   // (the shortest piece that reads as one verb is enough: try from the long end)
          const pre = stem.slice(0, stem.length - n), v = verb(stem.slice(-n)); if (!v) continue;
          return pre + (end === 'ましょう' ? v.vol : end === 'ません' ? v.neg + '\u0003V' : end === 'ました' ? v.past + '\u0003P' : end === 'ますか' ? v.dict + 'かな' : end === 'ますが' ? v.dict + 'けど' : v.dict + '\u0003V');
        }
        return m;
      });
    return t.replace(/\u0003D/g, 'だよ').replace(/\u0003[VP]/g, 'よ');   // (fox: no flourish of its own any more — its lines are written for it)
  }
  /* ---------- the guide's speech in Japanese (2026-11-15) ----------
     No random endings or asides: a guide's character lives in lines written for it by hand (backgammon: ダイスン,
     backgammon/voice-dicepup-ja.js, checked by tools/voice-lint.js). Texts without such lines are only made plain. */
  const GYOU = { backgammon: 'きみ' };
  function guideJa(html, id) {
    let t = casualJa(html, id === 'shogi');
    if (GYOU[id]) t = t.replace(/あなた/g, GYOU[id]);
    return t;
  }
  window.AtlasGuideJa = guideJa;
  /* (2026-11-21 the user: lines that all end in 〜だよ read badly — the endings vary, and they sound like the guide)
     Over the whole bubble: a sentence that would end the same way as the one before it (〜だよ / 〜よ) takes another
     natural ending (〜なんだ・〜だね / 〜んだ・〜ね); a guide with a verbal tic says it once in about half its bubbles,
     at its last plain ending. Hand-written lines that already vary are left as they are. */
  const TIC = { amazons: 'ケロ', shogi: 'コン', xiangqi: 'コン', backgammon: 'ワン', chess: 'ピョン', go: 'ペン', gomoku: 'ペン', hex: 'ペン', checkers: 'カニ' };
  function varyJa(h, id) {
    const re = /(なんだ|だよ|だね|んだ|よ|ね)(?=(?:<\/b>|<\/small>)?(?:[。！？!?]|<br>|$))/g, ms = [];
    let m; while ((m = re.exec(h))) { const pc = h[m.index - 1] || '';
      if (m[1] === 'よ' && (/[のわだ]/.test(pc) || (pc === 'う' && /[おこごそぞとどのほぼぽもよろ]/.test(h[m.index - 2] || '')))) continue;   // (〜のよ・〜わよ, and 〜しようよ: kept)
      ms.push({ at: m.index, pc, s: m[1], k: m[1] === 'だよ' ? 'D' : m[1] === 'よ' ? (/[いうくぐすつぬぶむるた]/.test(pc) ? 'V' : 'X') : m[1] === 'なんだ' || m[1] === 'んだ' ? 'N' : 'E' }); }   // (X: 〜てよ and the like — kept)
    if (!ms.length) return h;
    let prev = '', alt = 0;
    for (const x of ms) {
      if (x.k === 'N' && prev === 'N' && (x.s === 'なんだ' || /[いうくぐすつぬぶむるた]/.test(x.pc))) { x.r = x.s === 'なんだ' ? 'だよ' : 'よ'; prev = 'Y'; continue; }   // (〜んだ twice running → 〜よ)
      if ((x.k === 'D' || x.k === 'V') && prev === 'Y') { const D = ['なんだ', 'だね'], V = ['んだ', 'ね']; x.r = (x.k === 'D' ? D : V)[alt++ % 2]; prev = x.r === 'だね' || x.r === 'ね' ? 'E' : 'N'; }
      else prev = x.k === 'D' || x.k === 'V' ? 'Y' : x.k;   // (〜だよ and 〜よ sound alike: one family)
    }
    const tic = TIC[id]; let hs = 0; for (let i = 0; i < h.length; i++) hs = (hs * 31 + h.charCodeAt(i)) | 0;
    if (tic && !h.includes(tic) && (hs & 1)) { const last = [...ms].reverse().find(x => !x.r && (x.k === 'D' || x.k === 'V')); if (last) last.r = last.k === 'D' ? 'だ' + tic : tic; }
    for (const x of ms.slice().reverse()) if (x.r) h = h.slice(0, x.at) + x.r + h.slice(x.at + x.s.length);
    return h;
  }
  const LSV = {};   // (atlas/lsvoice-ja.js: the problem lines of the guides without a voice file, loaded for Japanese only)
  const lsvLoad = lang => lang !== 'ja' ? Promise.resolve() : LSV.p || (LSV.p = fetch('lsvoice-ja.js?v=4').then(r => r.ok ? r.text() : '').then(t => { const w = {}; try { new Function('window', t)(w); } catch (e) {} LSV.d = w.AtlasLsVoice || {}; }).catch(() => { LSV.d = {}; }));
  const pick = a => Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const J = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const L = (o, lang) => !o ? '' : typeof o === 'string' ? o : o[lang] != null ? o[lang] : o.en != null ? o.en : o.ja || '';
  const getJ = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const winP = (v, k) => 1 / (1 + Math.pow(10, -v / k));

  /* ---------- the two games' data ---------- */
  /* (2026-11-21 lesson loop) the shogi lesson problems in ショウギツネ's words, Japanese: varied questions, the hint, and after a wrong
     move why it falls short — from the stored candidate scores (lessons.json cand: the engine's value for the side to move, ±29996 =
     mate), the trap the step sets (trap / bait) and the piece each move takes. {m} = the best move, {x} = yours (named by the runner). */
  const SHJ = {
    ask: {
      k20: ['取れる駒の中で、いちばん価値が高いのはどれかな？', '盤をぐるっと見わたして、いちばん大きな駒を取ってみて。', 'どの駒を取るのがいちばん得だと思う？ 価値の高い駒をねらうコン。'],
      k15: ['タダで取れる駒はどれかな？ 取り返されないかも確かめてね。', '取り返されずに取れる駒を探してみて。わなの駒には気をつけてね。', 'いちばん得をする一手を指してみて。取ったあとのことも考えるコン。'],
      k12: ['王手をかわす、いちばん良い手はどれかな？', '王手されちゃった！ 逃げる・取る・合駒、どれがいちばん？', 'かわしたあとの形まで考えて、いちばん良い受けを選んでね。'],
      k5: ['いちばん良い一手を指してみて！ 2つをねらえる手はないかな？', '駒得できる手筋をさがそう。両取りがかかる場所はどこかな？', 'この局面、いちばん良い手はどれだと思う？'],
      k3: ['相手の詰みのねらいを防いでね。', '相手は次に詰ませようとしているの。どう受ける？', '玉のまわりをよく見て、詰めろを消す手を指してみて。'],
      k1: ['いちばん良い一手を指してみて！ 少し先まで読んでね。', '候補手をいくつか比べてみよう。いちばん良いのはどれかな？', 'じっくり読んで、相手の応手まで考えた一手を指してね。'],
    },
    hint: {
      k20: '自分の駒ひとつひとつについて、取れる相手の駒を探してみよう。<br>光っているのが、動かす駒と行き先だよ。',
      k15: '光っているのが答えの手だよ。どうしてその駒がタダなのか、取り返す駒がないか見てみてね。',
      k12: '光っている手で王手をかわせるの。逃げる・取る・合駒のどれか、確かめてみて。',
      k5: '光っている手を見てね。その手で、相手のどの駒とどの駒をねらえるかな？',
      k3: '光っている手で受けられるよ。相手がどこから詰ませようとしているか、考えてみて。',
      k1: '光っている手がいちばん。指したあと、相手がどう応じるか読んでみてね。',
      rx: '光っている手を見てね。問題の条件を、もう一度読んでみよう。',
      tsume: '光っているのが最初の王手だよ。そのあと玉がどこへ逃げられるか、確かめてみてね。',
    },
    tip: { k15: '取ったあと取り返されないか、いつも確かめてね。', k12: 'かわしたあとの形まで考えるのがコツだコン。', k5: '1手で2つをねらう手を探してみてね。', k3: '相手の詰み筋を消せているか、確かめるくせをつけようね。', k1: '候補手を比べて、相手の応手まで読んでみてね。' },
  };
  const SH_KJ = { p: '歩', l: '香車', n: '桂馬', s: '銀', g: '金', b: '角', r: '飛車', k: '玉', '+p': 'と金', '+l': '成香', '+n': '成桂', '+s': '成銀', '+b': '馬', '+r': '竜' };
  function shCap(sfen, u) {   // the opponent's piece a move takes ('' when none)
    if (!u || u.length < 4) return '';
    const [bd, side] = String(sfen).split(' '), f = +u[2], r = u.charCodeAt(3) - 97, row = (bd.split('/')[r] || ''); let x = 0, pro = '';
    for (const ch of row) { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { x += +ch; pro = ''; continue; } if (9 - x === f) { const opp = side === 'w' ? ch === ch.toUpperCase() : ch === ch.toLowerCase(); return opp ? SH_KJ[pro + ch.toLowerCase()] || '' : ''; } x++; pro = ''; }
    return '';
  }
  function shTeachJa(gid, p, u) {
    const C = p.cand || [], acc = p.accept || [];
    if (!u || acc.includes(u)) { const w = C.find(x => !acc.includes(x[0])); if (w) u = w[0]; else if (p.mode === 'material') u = ''; else if (p.kind !== 'tsume') return ''; }   // (no wrong move given: the strongest-looking one)
    const ans = acc[0] || (C[0] || [])[0] || (p.sol || [])[0], sc = new Map(C), best = C.length ? C[0][1] : 0, s = sc.has(u) ? sc.get(u) : (p.floor != null ? p.floor : best - 2000);
    let sd = 0; for (const ch of String(p.sfen) + gid) sd = (sd * 31 + ch.charCodeAt(0)) | 0; sd = Math.abs(sd); const pk = a => a[sd++ % a.length];
    const out = p.kind === 'best' && SHOGI.points(p, u) > 0 ? [] : [pk(['{m}が正しい手なの。', 'いちばん良いのは{m}だコン。', 'ここは{m}を指したかったね。'])];   // (a partial answer: the runner has said the best one is lit)
    if (p.kind === 'tsume') { out.push(p.why ? '{x}だと詰まないの。' + p.why : pk(['{x}だと玉に逃げられちゃうから、詰まないの。玉の逃げ道を、ひとつずつ消していこうね。', '{x}だと、玉の逃げ道が残っちゃうの。最初の王手で、どこへ逃げられるか確かめてね。'])); return out.join(''); }
    const px = shCap(p.sfen, u), pm = shCap(p.sfen, ans);
    if (p.mode === 'material') {
      if (!pm) out.push(gid === 'rx' ? '{x}だと、入玉宣言の条件がそろわないから、まだ宣言できないの。' : '');
      else out.push(px ? `{x}で取れるのは${px}、{m}なら${pm}が取れるの。${pm}のほうが価値が高いからね。` : `{x}だと駒が取れないの。{m}なら${pm}が取れるから、そっちが得だよ。`);
      return out.join('');
    }
    if (p.trap && p.bait && u === p.bait) out.push(s <= -29000 ? `{x}で取れる${px || '駒'}は、わななの。取ると、そのあと詰まされちゃうんだ。` : `{x}で取れる${px || '駒'}は、わななの。取ったあとに相手の強い手があるから、大損しちゃうんだ。`);
    else if (s <= -29000) out.push(pk(['{x}だと、相手に詰まされちゃうの。', '{x}だと玉が詰んじゃうから、それだけはだめなんだ。']));
    else if (best >= 29000) out.push('{m}なら詰ませられたのに、{x}だと詰みをのがしちゃうの。');
    else { const d = winP(best, 600) - winP(s, 600);
      out.push((px ? `{x}だと${px}は取れるけど、` : '{x}だと、') + (d > .35 ? '相手に強い反撃のチャンスを渡しちゃうの。' : d > .12 ? '相手に先に良い場所を取られちゃうんだ。' : '{m}より、駒の働きがほんの少し弱いの。')); }
    if (SHJ.tip[gid]) out.push(SHJ.tip[gid]);
    return out.join('');
  }
  /* (2026-11-22 lesson loop) the shogi lessons in ショウギツネ's words, Japanese, on the 3D table: a short intro per step, five
     questions and five hints per step (none said twice in a lesson), praise that cheers and says why the move works, and after a
     miss a soft word, the right move and what the move played gives up — from the board (shB / shAtt: is it check, can the piece be
     taken back, what it takes, how the king answers a check), the stored line (sol: a drop, a sacrifice, the mating piece) and the
     stored engine values (cand). The plain texts stay for the 2D game and the other languages. */
  const SHJ2 = {
    intro: {
      k20: '駒の動きは練習で見ていこう。問題では、<b>いちばん大きな駒</b>を取ってね！',
      k15: '次は<b>タダの駒</b>（取り返されない駒）を見つける練習だコン。価値の目安は、歩1・香3・桂4・銀5・金6・角8・飛10くらい。<br>取る前に「取り返されない？」と確かめるのがコツ！',
      k12: '王手をかけられたら、<b>逃げる・取る・合駒</b>のどれかで防ぐの。<br>でも、どれでもいいわけじゃないコン。かわしたあとに安全な形になる受けを選ぼう！',
      k10: '<b>詰み</b>は、玉がどう逃げても取られちゃう形のこと。<br>持ち駒を打つ手と盤の駒を動かす手、両方を考えて、1手で詰ませてみよう！',
      k8: '今度は王手のかけ方がいろいろある局面だよ。<br>王手でも、<b>逃げ道が残る手</b>や<b>取られる手</b>は詰みにならないの。玉のまわりを1マスずつ確かめてみて！',
      k6: '3手詰は<b>王手・相手の受け・詰み</b>の3手。<br>相手がいちばんねばる受けを考えて、どう受けても詰む王手を探すコン！',
      k5: '中盤は<b>駒得</b>が大事！ 代表的な手筋は、1手で2つをねらう<b>両取り</b>なの。<br>桂・銀・角は両取りをかけやすい駒だから、よく見てね。',
      k4: '今度の3手詰は、<b>駒を捨てる</b>王手が正解になりやすいの。<br>「取られるから指さない」じゃなくて「取らせて詰ます」。この発想を練習しよう！',
      k3: '相手が「次に詰ませるぞ」とねらう形を<b>詰めろ</b>っていうの。<br>攻める前に、まず自分の玉の安全を確かめるコン。相手の詰み筋を消す手を探してね！',
      k2: '5手詰は、王手と受けを2回くり返してから詰ませるよ。<br>頭の中で盤を動かす力の勝負！ 受けが何通りかあるときは、どれでも詰むか確かめよう。',
      k1: 'ここからは<b>浅い読みでは見つからない手</b>が正解。<br>候補手をいくつか出して、相手のいちばんの応手まで読み比べてみようね！',
      d1: '7手詰は、有段者の入り口っていわれるの。<b>捨て駒・空き王手・逃げ道封鎖</b>を組み合わせるコン。<br>最後の詰み形を思いうかべて、逆から考えるのもおすすめ！',
      d2: '9手詰では、<b>持ち駒を使う順番</b>をまちがえると詰まなくなっちゃう。<br>一手ずつ、相手のいちばんの受けを考えながら進めよう！',
      d3: 'さいごは<b>11手以上の詰み</b>と、<b>深く読まないと見えない静かな好手</b>のまぜこぜ。<br>ここまで来たきみなら、きっと大丈夫だコン！',
      rx: '最後はルールの確認！ <b>打ち歩詰め</b>は反則、<b>千日手</b>は引き分け、玉が敵陣に入れば<b>入玉宣言</b>もあるの。<br><b>駒落ち</b>は、強いほうが駒を減らして先に指すんだコン。',
    },
    ask: {
      k20: ['取れる駒の中で、いちばん価値が高いのはどれかな？', '盤をぐるっと見わたして！ いちばんの大物はどれ？', 'どの駒を取るのがいちばん得だと思う？', '駒の価値を思い出して！ 取るならどれ？', '大きな駒が取れそうだコン。見つけられる？'],
      k15: ['タダで取れる駒はどれかな？', '取り返されずに取れる駒、探してみて！', 'いちばん得をする一手は？ わなの駒には気をつけてね。', 'この局面、ただで駒得できる手はあるかな？', '取ったあとも安全な駒はどれだと思う？'],
      k12: ['王手をかわす、いちばん良い手はどれかな？', '王手されちゃった！ 逃げる・取る・合駒、どれがいい？', 'かわしたあとの形まで考えて、受けを選んでみて！', 'ピンチだコン！ いちばん安全な受けは？', 'この王手、どう防ぐのが正解だと思う？'],
      k5: ['いちばん良い一手を指してみて！', '駒得できる手筋はどこかな？', '1手で2つをねらえる手はないかな？', 'この局面、きみならどう指す？', '相手の駒がねらえそうだコン。いちばんの手は？'],
      k3: ['相手の詰みのねらいを防いでね！', '相手は次に詰ませようとしているの。どう受ける？', '玉があぶないコン！ 詰めろを消す手は？', 'まずは守り！ いちばんの受けはどれかな？', '相手の詰み筋、先回りして消せる？'],
      k1: ['いちばん良い一手を指してみて！', '候補手を比べて、いちばんを選べる？', 'じっくり読もう。相手の応手まで考えた一手は？', 'ここは腕の見せどころだコン！ 最善手はどれ？', '目先の駒より大事な手があるかも？'],
      d3: ['いちばん良い手を指してね！', 'はでな手だけが正解じゃないコン。最善手は？', '深く読んでみて！ いちばんの一手はどれ？', 'この局面の急所、どこだと思う？', 'じっと力をためる手もあるの。どう指す？'],
      tsume: ['<b>{n}手詰め</b>！ 玉を詰ませてみよう。', '<b>{n}手詰め</b>だコン。玉の逃げ道をよく見て！', '<b>{n}手詰め</b>に挑戦！ 最後まで読み切れる？', '次は<b>{n}手詰め</b>。どの王手から始める？', 'さあ<b>{n}手詰め</b>！ 玉をつかまえよう！'],
      rx: ['1手で詰ませてね！ ただし<b>打ち歩詰め</b>（持ち駒の歩で詰ます手）は反則だコン。', '1手で詰ませてみて！ 盤の歩を<b>突いて</b>詰ませるのは反則じゃないよ。', 'これも1手詰め！ <b>打ち歩詰め</b>にならない詰ませ方、わかるかな？'],
    },
    hint: {
      k20: ['自分の駒ひとつずつ、取れる相手の駒を数えてみて！', '光っているのが動かす駒と行き先。取れる駒を比べてみよう！', '光っている手を見て！ 価値の目安は飛・角・金・銀の順だコン。', '取れる駒が2つ以上あるなら、大きいほうを選ぼう！', 'ヒントは光っている手。どの駒が取れるかな？'],
      k15: ['光っているのが答えの手。取ったあと、相手の駒が届くかな？', '取り返す駒がいないか、相手の駒の利きをたどってみて！', 'ヒントは光っている手だコン。どうしてタダなのか考えてみよう！', '光っている手を見て！ わなの駒はどれか、わかる？', '取ったあとのマスに相手の利きがないか、確かめてみて！'],
      k12: ['光っている手で王手をかわせるの。逃げる・取る・合駒、どれかな？', 'かわしたあと、また王手されない形になる？', 'ヒントは光っている手！ 逃げた先も安全かな？', '王手している駒を取れないか、まず見てみよう！', '光っている受けなら、相手の攻めが続かないコン。'],
      k5: ['光っている手を見て！ 相手のどの駒とどの駒をねらえる？', '桂・銀・角で2つをねらう形がないか探してみて！', 'ヒントは光っている手だコン。取ったあとの反撃も読んでみよう！', '王手と同時に何かをねらえないかな？', '光っている手のあと、相手はぜんぶを守れるかな？'],
      k3: ['光っている手で受けられるの。相手はどこから詰ませにくる？', '相手の王手を1つずつ思いうかべてみて！', 'ヒントは光っている手。玉の逃げ道を広げる手もあるコン！', '相手が打ちたいマスに、先に駒を利かせられないかな？', '光っている受けのあと、まだ詰む王手は残るかな？'],
      k1: ['光っている手がいちばんだコン。相手がどう応じるか読んでみて！', '候補手を3つ出して、比べてみよう！', 'ヒントは光っている手だコン。すぐ駒を取るだけが正解じゃないの。', '光っている手のあと、駒の働きがどう変わるかな？', '相手のいちばんの応手を考えてから決めよう！'],
      d3: ['光っている手を見て！ 深く読むと良さがわかるコン。', 'はでな手ばかり探していないかな？', 'ヒントは光っている手。王手の連続で追ってみよう！', '光っている手のあと、玉の逃げ道はいくつ残る？', '最後の詰み形から逆に考えてみて！'],
      tsume: ['光っているのが最初の王手だコン。玉はどこへ逃げる？', 'ヒントは光っている手！ 玉のまわりで空いているマスを数えてみて。', '光っている王手から始めよう。相手の受けを全部たしかめて！', '持ち駒をどこで使うかがカギかも？', '光っている手のあと、玉が取れる駒はあるかな？'],
      rx: ['問題の条件をもう一度読んでみて！ 光っているのが答えだよ。', '駒落ちでも、駒の働きを大事にするのは同じだコン！', 'ヒントは光っている手！ 反則にならないかもたしかめよう。', '光っている手を見て！ ルールどおりの手になってる？', 'ルールの中で、いちばん良い手はどれかな？', '光っている手が正解。どうしてOKなのか考えてみて！'],
    },
    cheer: ['お見事！', 'さすが！', 'いい手！', 'ナイスだコン！', 'ばっちり！', 'すごい！', 'やった！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', null, 'その勢いで次へ！', null],
    soft: ['ドンマイ！', 'いい勉強になったね！', '大丈夫、これで覚えちゃおう！', null, '次はきっと見つけられるコン！', '今度こそいけるよ！', '気にしない、気にしない！'],
  };
  const SH_MV = { p: [[-1, 0]], n: [[-2, -1], [-2, 1]], s: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]], g: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]],
    k: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] };
  function shLB(sfen) {   // the board: B[r][c] = { t: 'p' | '+p' …, w: white } (r 0 = rank a, c 0 = file 9)
    const [bd, side] = String(sfen).split(' '), B = bd.split('/').map(row => { const o = []; let pro = ''; for (const ch of row) { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { for (let i = 0; i < +ch; i++) o.push(null); continue; } o.push({ t: pro + ch.toLowerCase(), w: ch === ch.toLowerCase() }); pro = ''; } return o; });
    return { B, w: side === 'w' };
  }
  const shLSq = s => [s.charCodeAt(1) - 97, 9 - +s[0]];
  function shLAtt(B, r, c, P, tr, tc) {   // does the piece P at (r, c) reach (tr, tc)?
    const d = P.w ? -1 : 1, t = P.t, steps = /^\+[psnl]$/.test(t) ? SH_MV.g : SH_MV[t] || [];
    for (const [dr, dc] of steps) if (r + dr * d === tr && c + dc === tc) return true;
    if (t === '+b' || t === '+r') for (const [dr, dc] of SH_MV.k) if (r + dr === tr && c + dc === tc) return true;
    const sl = t === 'l' ? [[-d, 0]] : t === 'b' || t === '+b' ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : t === 'r' || t === '+r' ? [[-1, 0], [1, 0], [0, -1], [0, 1]] : [];
    for (const [dr, dc] of sl) for (let k = 1; k < 9; k++) { const y = r + dr * k, x = c + dc * k; if (y < 0 || y > 8 || x < 0 || x > 8) break; if (y === tr && x === tc) return true; if (B[y][x]) break; }
    return false;
  }
  const shLBy = (B, tr, tc, w) => { const o = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const P = B[r][c]; if (P && P.w === w && shLAtt(B, r, c, P, tr, tc)) o.push(P); } return o; };
  function shLPlay(S, u) {   // → { B, to, piece, took, drop, check, takers (the side to answer that reach the piece), kingTakes }
    const B = S.B.map(r => r.slice()), me = S.w; let piece, took = null, drop = false;
    const [tr, tc] = shLSq(u.slice(2, 4));
    if (u[1] === '*') { drop = true; piece = { t: u[0].toLowerCase(), w: me }; }
    else { const [fr, fc] = shLSq(u.slice(0, 2)); piece = B[fr][fc] || { t: '?', w: me }; B[fr][fc] = null; if (u[4] === '+') piece = { t: '+' + piece.t, w: me }; }
    took = B[tr][tc]; B[tr][tc] = piece;
    let kr = -1, kc = -1; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { const P = B[r][c]; if (P && P.t === 'k' && P.w !== me) { kr = r; kc = c; } }
    const check = kr >= 0 && shLBy(B, kr, kc, me).length > 0, takers = shLBy(B, tr, tc, !me), guards = shLBy(B, tr, tc, me);
    let esc = 0; if (kr >= 0) { const B2 = B.map(r => r.slice()); B2[kr][kc] = null; for (const [dr, dc] of SH_MV.k) { const y = kr + dr, x = kc + dc; if (y < 0 || y > 8 || x < 0 || x > 8 || (B2[y][x] && B2[y][x].w !== me)) continue; if (!shLBy(B2, y, x, me).length) esc++; } }   // (the squares the king can step to)
    return { B, to: [tr, tc], piece, took, drop, check, esc, takers, kingTakes: takers.some(P => P.t === 'k') && !guards.length && Math.abs(kr - tr) <= 1 && Math.abs(kc - tc) <= 1, guarded: guards.length > 0 };
  }
  const shLNm = t => SH_KJ[t] || '駒';
  function shLFacts(p, u) { try { const S = shLB(p.sfen); return shLPlay(S, u); } catch (e) { return null; } }
  function shJaLesson(g, probs) {   // probs (lesson()) → the Japanese words of the 3D lesson
    const gid = g.id, T = SHJ2, o = { k20: 0, k15: 1, k12: 2, k10: 3, k8: 4, k6: 5, k5: 6, k4: 0, k3: 1, k2: 2, k1: 3, d1: 4, d2: 5, d3: 6, rx: 0 }[gid] || 0;
    let nUchi = 0, nHandi = 0;
    probs.forEach((q, i) => {
      const P = q.P, best = q.kind !== 'tsume', ex = String((P.expl && P.expl.ja) || '');
      const key = gid === 'rx' ? 'rx' : best ? (T.ask[gid] ? gid : 'k1') : 'tsume';
      if (gid === 'rx') { const qj = String((P.q && (P.q.ja || P.q)) || ''); if (P.kind === 'tsume') q.ask = T.ask.rx[/突いて/.test(qj) ? 1 : nUchi++ ? 2 : 0]; else if (P.src === 'handi' && nHandi++) q.ask = '今度も<b>駒落ち</b>の対局！ 下手のきみなら、どう指す？'; }
      else q.ask = best ? T.ask[key][i % 5] : fill(T.ask.tsume[(i + o) % 5], { n: q.n });
      q.hintTx = T.hint[key][(i + o) % T.hint[key].length];
      q.own = true; try { Object.defineProperty(P, '__i', { value: g.problems.indexOf(P), configurable: true }); } catch (e) {}
      const why0 = q.why;
      q.good = u => shGoodJa(gid, P, u, i, o, why0, ex);
      const ng0 = q.ng;
      q.ng = u => shNgJa(gid, P, u, i, o, ex) || (ng0 ? ng0(u) : '');
    });
    return probs;
  }
  const SH_LI = ['k20', 'k15', 'k12', 'k10', 'k8', 'k6', 'k5', 'k4', 'k3', 'k2', 'k1', 'd1', 'd2', 'd3', 'rx'];
  const shOrd = (gid, i) => { const k = Math.max(0, SH_LI.indexOf(gid)), st = 1 + Math.floor(k / 7); return a => a[(i * st + k) % a.length]; };   // (the praise / the soft words in a different order in each lesson)
  function shGoodJa(gid, P, u, i, o, why0, ex) {
    const T = SHJ2, at = a => a[(i + o) % a.length], acc = P.accept || [], ans = (P.sol || [])[0] || acc[0] || (P.pv || [])[0];
    if (!u || (P.kind === 'tsume' ? false : !acc.includes(u))) u = ans;
    const F = shLFacts(P, u) || {}, nm = F.piece ? shLNm(!F.drop && u[4] === '+' ? F.piece.t.slice(1) : F.piece.t) : '駒';
    const px = F.took ? shLNm(F.took.t) : '';
    let core = '';
    if (P.kind === 'tsume') {
      const sol = P.sol || [], n = sol.length, last = sol[n - 1], sac = n > 1 && u === sol[0] && sol[1].slice(2, 4) === sol[0].slice(2, 4);
      let lastNm = ''; try { let S = shLB(P.sfen); for (let k = 0; k < n - 1; k++) { const R = shLPlay(S, sol[k]); S = { B: R.B, w: !S.w }; } const R = shLPlay(S, last); lastNm = shLNm(R.piece.t); } catch (e) {}
      const A = [];
      if (gid === 'rx' && /打ち歩|突き歩/.test(why0 || '')) A.push(why0);
      else if (n === 1) A.push(F.drop ? at([`持ち駒の${nm}を打って、玉の逃げ道がなくなったの。`, `${nm}を打つ一手で、ぴったり詰み！`, `打った${nm}で、玉の行き場がなくなったコン。`, `持ち駒の${nm}がよく働いたね。`, `${nm}を打った場所が急所だったの。`])
        : at([`${nm}を動かして王手、玉はもう逃げられないの。`, `盤の${nm}で詰み！ 持ち駒だけが答えじゃないコン。`, `${nm}の王手で、玉の逃げ場がなくなったね。`, `動かした${nm}を、玉は取れないの。`, `${nm}で決まり！ 逃げ道をきれいに消せたね。`]));
      else {
        A.push(sac ? at([`最初の${nm}は、取らせて玉をおびき出す捨て駒だったの。`, `${nm}を捨てて取らせるのがポイントだコン。`, `取られる場所への${nm}が、じつは急所だったね。`, `${nm}をただで渡して、玉の形をくずしたの。`, `捨て駒の${nm}で、玉を逃げにくいマスへさそったね。`])
          : F.drop ? at([`持ち駒の${nm}から王手していったね。`, `最初に${nm}を打って、玉を追いこんだの。`, `${nm}を打つ王手で、逃げ道をせまくしたコン。`, `打った${nm}が、玉の退路を切ったね。`, `${nm}を打つところから、ぴったりの手順！`])
          : at([`${nm}を動かす王手から、きれいに追いこんだね。`, `盤の${nm}を使った王手がスタートだったの。`, `${nm}の王手で、玉をせまい方へ追ったコン。`, `${nm}を動かして、逃げ道を先に消したね。`, `${nm}の一手目で、流れが決まったの。`]));
        if (lastNm) A.push(at([`最後は${lastNm}で詰み！`, `しめくくりは${lastNm}だったね。`, `とどめは${lastNm}！`, `${lastNm}で最後に詰ませたコン。`, `${n}手目の${lastNm}で詰み！`]));
      }
      core = A.join('');
    } else if (P.mode === 'material' && gid === 'k20') core = at([`{m}で${px}を取ったね。ここで取れる駒の中では一番の大物なの。`, `${px}をゲット！ 盤の上でいちばんおいしい駒だったコン。`, `{m}で${px}！ 大きい駒から取るのが基本なの。`, `${px}を取れたね。ほかに取れる駒より値打ちが上でしょ？`, `大物の${px}を見のがさなかったね。`]);
    else if (P.trap && P.bait) { const b = shLFacts(P, P.bait), bx = b && b.took ? shLNm(b.took.t) : '駒'; core = at([`取りたくなる${bx}は、わなだったの。`, `${bx}に飛びつかなかったのがえらいコン。`, `${bx}を取るのはわなだって、見ぬいたね。`, `わなの${bx}をスルーできたね。`, `${bx}は取ると損する駒だったの。`]) + (P.src === 'trap' && /王様/.test(ex) ? at(['玉が危ないときは、まず守りが先だね。', '玉の安全が先、よくわかってるコン。', '守りを先にしたのが正解なの。', 'あわてず玉を守れたね。', '攻めより守り、ばっちりなの。']) : at(['取ったあとの相手の手まで読めているね。', '一手先の反撃まで見えていたコン。', '目の前の駒より、先を読んだね。', '取られたあとの手まで読めてるの。', 'あまい誘いにのらなかったね。'])); }
    else if (P.src === 'capture') core = at([`${px}をタダで取れたね。取り返す駒がいないの。`, `${px}はだれにも守られていなかったコン。`, `取り返されない${px}、まるもうけだね。`, `${px}を取ったマスに、相手の駒は届かないの。`, `ただの${px}を見のがさなかったね。`]);
    else if (P.src === 'evade') { const k = F.piece && F.piece.t === 'k' ? 0 : F.took ? 1 : 2; core = [at(['玉が逃げるのが正解。逃げた先は安全なの。', '玉をかわす受けがいちばんだったコン。', '逃げる受けで、相手の攻めが続かないね。', '玉が安全な場所へ移れたね。', '逃げた先で、もう追われない形なの。']), at([`王手している${px}を取るのが正解だったね。`, `${px}を取って、王手ごと消したコン。`, `王手の${px}を取れば、攻めが止まるの。`, `${px}を取る受けで、駒得にもなったね。`, `取る受けがいちばん。${px}がいなくなったの。`]), at([`${nm}の合駒が正解！ 玉を動かさずに守れたね。`, `間に${nm}を入れて、王手をさえぎったコン。`, `合駒の${nm}で、守りの形がくずれないの。`, `${nm}を間に置く受けが、いちばん安全だったね。`, `合駒でしのいだね。`])][k]; }
    else if (P.src === 'defend') { const th = (ex.match(/相手のねらいは([☗☖][^。]*?)からの詰み/) || [])[1]; core = at(['詰めろを消せたね。', 'これで相手の詰み筋がなくなったコン。', '先回りの受け、ばっちりなの。', 'これで玉が安全になったね。', '相手のねらいをちゃんと消したの。']) + (th ? at([`相手は${th}から詰ませるつもりだったの。`, `ねらいは${th}からの詰みだったね。`, `${th}からの詰みを止めたコン。`, `${th}の筋がもう効かないの。`, `${th}からの攻めを読めていたね。`]) : ''); }
    else if (gid === 'rx') core = P.src === 'handi' ? at(['駒落ちでも、駒の働きを大事にする手なの。', '上手の駒が少ないところを、うまくついたコン。', '駒落ちの定跡どおり、いい形だね。', '下手らしく、まっすぐ攻める手なの。', 'これで駒落ちの戦い方がわかってきたね。']) : why0 || '';
    else { const cat = /両取り/.test(ex) ? 0 : /王手◯取り|王手をかけながら/.test(ex) ? 1 : /静かな好手/.test(ex) ? 2 : /王手から/.test(ex) ? 3 : 4;
      core = [at(['1手で2つをねらう両取り！ どちらかは取れるの。', '両取りの形、見事だコン。', '2つの駒を同時にねらえたね。', '相手は両方を守れないの。', '両取りで駒得が決まったね。']),
        at(['王手しながら別の駒もねらう手筋だね。', '王手◯取りの形、決まったコン。', '王手をかけつつ駒得も見えるの。', '玉を守ると、別の駒が取れる形なの。', '王手と駒取りの合わせわざ！']),
        at(['取る手でも王手でもない、静かな好手だね。', 'じっと力をためる一手、よく見えたコン。', '深く読まないと見えない手なの。', 'はでさはないけど、いちばん効く手だね。', '静かな一手で、局面が良くなったの。']),
        at(['王手から局面を有利に動かせたね。', 'その王手で、流れが変わったコン。', '王手をうまく使えたね。', '王手で相手の形を乱したの。', '王手が次の得につながるの。']),
        at([(px ? `${px}を取って、` : '') + '相手の反撃まで読めている手だね。', '駒得につながる手！ 反撃も読めているコン。', 'あとの反撃まで考えた一手なの。', 'その手で、駒の損得が良くなったね。', '目先だけじゃなく、先まで読めたの。'])][cat]; }
    const od = shOrd(gid, i); let s = od(T.cheer) + ' ' + core; const pu = od(T.push); if (pu && (s + pu).replace(/<[^>]+>/g, '').length <= 150) s += (/[！？]$/.test(s) ? ' ' : '') + pu;
    return s;
  }
  function shLoss(d, i) {   // the last resort (no stored answer for the move): how much it gives up, in board words — never "the AI says"
    const A = d > .35 ? ['相手に強い反撃のチャンスを渡しちゃうの。', '玉や大駒のまわりにすきができて、大損なの。', '{m}とくらべて、駒の働きに大きな差がつくの。']
      : d > .12 ? ['相手に先に良い場所を取られちゃうの。', '{m}とくらべると、駒の働きが一歩おくれるコン。', '相手のねらいへの備えが足りないの。']
      : ['{m}より、駒の働きがほんの少し弱いの。', '悪くはないけど、{m}のほうが急所に効いているコン。', '差は小さいけど、{m}のほうが形がいいの。'];
    return A[i % A.length];
  }
  /* (2026-11-22 ユーザー：「AIの評価が下がるから」は最悪。その手でどういう理由で不利になるかを解説する) — what goes wrong after the move
     played, said from the board: the opponent's best answer (SH_REP, shogi/tools/lesson-replies.js) and what it does — mates, takes the
     piece just moved, takes a piece that was left attacked, takes another piece, checks, promotes — or, when the answer is quiet, what
     the right move does that yours does not (its capture, its check, the lesson's own explanation). Never "the AI says". */
  let SH_REP = {};
  const SH_ZEN = '０１２３４５６７８９', SH_KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const SH_KF = { p: '歩', l: '香', n: '桂', s: '銀', g: '金', b: '角', r: '飛', k: '玉', '+p': 'と', '+l': '成香', '+n': '成桂', '+s': '成銀', '+b': '馬', '+r': '龍' };   // (the move's notation: the short names)
  function shMvJa(S, u) {   // ☖３三角成 / ☗５五角打
    const mk = S.w ? '☖' : '☗', sq = ZEN => SH_ZEN[+u[2]] + SH_KAN[u.charCodeAt(3) - 96];
    if (u[1] === '*') return mk + sq() + SH_KF[u[0].toLowerCase()] + '打';
    const [fr, fc] = shLSq(u.slice(0, 2)), P = S.B[fr][fc];
    return mk + sq() + (P ? SH_KF[P.t] || '' : '') + (u[4] === '+' ? '成' : '');
  }
  function shReplyWhyJa(gid, P, u, ans, ex, j) { return shReplyCore(P.sfen, u, ans, SH_REP[gid + '/' + P.__i], ex, j); }
  function shReplyCore(sfen, u, ans, R, ex, j) {
    if (!R || !u || !R[u]) return '';
    const [r, sc] = R[u], best = R[ans] ? R[ans][1] : null, loss = best != null ? best - sc : 999;
    const P = { sfen };
    const pk = a => a[Math.abs(j) % a.length];
    let S0, A, S1, F;
    try { S0 = shLB(P.sfen); A = shLPlay(S0, u); S1 = { B: A.B, w: !S0.w }; } catch (e) { return ''; }
    const moved = shLNm(A.piece.t);
    if (sc <= -29000) return r ? pk([`{x}だと、${shMvJa(S1, r)}から玉が詰まされちゃうの。`, `{x}のあと、相手は${shMvJa(S1, r)}。そこから玉が詰んでしまうコン。`, `{x}では玉が危ないの。${shMvJa(S1, r)}から詰まされちゃう。`]) : '';
    if (best != null && best >= 29000 && sc < 29000) return pk(['{m}なら玉を詰ませられたの。{x}だと、その詰みをのがしちゃう。', '{m}から詰みがあったコン。{x}では相手の玉が逃げのびちゃうの。']);
    if (!r) return '';
    try { F = shLPlay(S1, r); } catch (e) { return ''; }
    const rn = shMvJa(S1, r), [tr, tc] = F.to, small = loss < 150;
    if (F.took && F.took.t !== 'k') {
      const X = shLNm(F.took.t);
      if (tr === A.to[0] && tc === A.to[1]) return A.took && (SH_V[A.took.t.replace('+', '')] || 0) >= (SH_V[A.piece.t.replace('+', '')] || 0) ? ''   // (an even trade: not a loss in itself)
        : (A.took ? a => a[0] : pk)([`{x}で動かした${moved}は、${rn}で取られちゃうの。${A.took ? `${shLNm(A.took.t)}を取っても、${moved}を取り返されて損なんだ。` : 'そのマスには相手の駒が利いているコン。'}`, `{x}だと、${moved}が相手の駒の利きに入っちゃう。${rn}でただで取られるの。`, `{x}の${moved}は守りが足りなくて、${rn}で取られちゃうコン。`]);
      let was = false; try { const P0 = S0.B[tr][tc]; was = !!P0 && P0.w === S0.w && shLBy(S0.B, tr, tc, !S0.w).length > 0; } catch (e) {}
      if (was) return pk([`ねらわれていた${X}をそのままにしたから、${rn}で取られちゃうの。`, `{x}では、相手のねらいが消えていないの。${rn}で${X}を取られちゃう。`, `相手は${X}をねらっていたコン。{x}だと、${rn}で取られちゃうの。`]);
      return pk([`{x}のあと、${rn}で${X}を取られちゃうの。`, `{x}だと、相手に${rn}と指されて、${X}を取られるコン。`, `{x}では、${rn}で${X}を取られてしまうの。`]);
    }
    if (F.check && !small) return pk([`{x}だと、${rn}の王手から攻めこまれちゃうの。`, `{x}のあと、${rn}と王手されて、玉が苦しくなるコン。`, `{x}では、${rn}の王手がきびしいの。玉の守りが足りないんだ。`]);
    if (r[4] === '+' && !small) { const nm = shLNm(F.piece.t); return pk([`{x}だと、${rn}で${nm}に成りこまれちゃうの。`, `{x}のあと、相手に${rn}と成られて、陣地に強い駒が入ってくるコン。`]); }
    // the answer is quiet: what the right move does that yours does not
    let fa = null; try { fa = shLPlay(S0, ans); } catch (e) {}
    if (fa && fa.took && !(A.took && SH_V[A.took.t.replace('+', '')] >= SH_V[fa.took.t.replace('+', '')])) return pk([`{m}なら${shLNm(fa.took.t)}が取れたの。{x}だと、その駒得をのがしちゃう。`, `{x}では駒が取れないの。{m}で${shLNm(fa.took.t)}を取るのが得だったコン。`]);
    if (fa && fa.check && !A.check) return pk(['{m}は王手で、相手に受ける手を指させる手なの。{x}だと、そのいきおいがなくなっちゃう。', '{m}の王手なら、相手は受けるしかないコン。{x}では相手に自由な一手を渡しちゃうの。']);
    // a quiet answer: what the right move is, from the board, and the opponent's move that comes instead
    let md = '';
    if (fa) { const fn = shLNm(fa.drop || !/^\+/.test(fa.piece.t) || ans[4] !== '+' ? fa.piece.t : fa.piece.t.slice(1));
      md = fa.drop ? `{m}は持ち駒の${fn}を打って、守りを足す手なの。` : fa.piece.t === 'k' ? '{m}は玉を、相手の駒が届かないマスへ動かす手なの。' : ans[4] === '+' ? `{m}は${fn}を成って、強い駒にする手なの。` : `{m}は${fn}を急所のマスへ動かす手なの。`; }
    return md + pk([`{x}だと、相手に${rn}と指されて、先に手を回されちゃうの。`, `{x}のあとは、${rn}がいい手になって、相手の駒が働き出すコン。`]);
  }
  function shNgJa(gid, P, u, i, o, ex) {
    const T = SHJ2, at = a => a[(i + o) % a.length], acc = P.accept || [], C = P.cand || [], ans = (P.sol || [])[0] || acc[0] || (C[0] || [])[0];
    if (!u || acc.includes(u) || (P.sol && u === P.sol[0])) { const w = C.find(x => !acc.includes(x[0])); u = w ? w[0] : ''; }
    const F = u ? shLFacts(P, u) : null;
    const partial = P.kind === 'best' && u && SHOGI.points(P, u) > 0;
    const od = shOrd(gid, i), right = partial ? '' : od(['{m}が正解の手なの。', '答えは{m}だったコン。', 'ここは{m}を指したかったね。', '正解は{m}！ ', 'いちばんは{m}なの。']);
    let why = '';
    if (P.kind === 'tsume') {
      if (!F) why = at(['ほかの王手だと、玉に逃げ道が残っちゃうの。', '別の手からだと、相手に受けられて詰まないコン。', 'ほかの手では、玉をつかまえきれないの。', '最初の一手をまちがえると、玉が逃げ出しちゃうの。', 'ほかの王手だと、受けがきいちゃうから詰まないの。']);
      else if (gid === 'rx' && F.drop && F.piece.t === 'p' && F.check) why = '{x}は歩を打って詰ませる「打ち歩詰め」で、反則なの。';
      else if (!F.check) why = at(['{x}は王手じゃないから、相手に一手もらっちゃうの。', '{x}だと王手にならないの。詰将棋は王手の連続だコン。', '{x}は王手じゃないの。そのすきに受けられちゃう。', '王手でない{x}だと、相手に余裕を与えるの。', '{x}では王手がかからないから、詰まないの。']);
      else if (F.kingTakes) why = at([`{x}の${shLNm(F.piece.t)}は、玉にそのまま取られちゃうの。`, `{x}だと、守りのない${shLNm(F.piece.t)}を玉に取られるコン。`, `{x}の${shLNm(F.piece.t)}は、ひもがついていないから玉が取れるの。`, `玉が{x}の${shLNm(F.piece.t)}を取って逃げちゃうの。`, `{x}だと${shLNm(F.piece.t)}を玉に取られて、王手が消えるの。`]);
      else if (P.n === 1 || (P.sol || []).length === 1) why = F.esc ? at([`{x}も王手だけど、玉の逃げ道が${F.esc}つ残るの。`, `{x}の王手だと、玉に${F.esc === 1 ? '1マス' : F.esc + 'マス'}逃げ場が残るコン。`, `{x}だと、玉が空いたマスへ逃げられるの。`, `{x}の王手では、玉のまわりに逃げ道が残っちゃう。`, `{x}は惜しい王手。でも玉の逃げ道がふさがっていないの。`])
        : at(['{x}も王手だけど、王手の駒を取られるか、合駒で受けられるの。', '{x}の王手は、取るか合駒でかわされちゃうコン。', '{x}だと、玉は逃げられなくても、ほかの駒で受けられるの。', '{x}の王手では、相手の受けが残るから詰まないの。', '{x}は惜しい王手。でも取るか合駒の受けがあるの。']);
      else why = at(['{x}の王手は、うまく受けられて詰みまで届かないの。', '{x}だと、相手のいちばんの受けで詰みが消えるの。', '{x}からだと、玉をつかまえきれないの。', '{x}の王手では、どこかで受けがきいちゃうコン。', '{x}だと、相手に受けの余裕が残るの。']);   // (n ≥ 3: the line after a wrong check is not stored — said in general words)
    } else {
      const sc = new Map(C), best = C.length ? C[0][1] : 0, s = sc.has(u) ? sc.get(u) : (P.floor != null ? P.floor : best - 2000), px = F && F.took ? shLNm(F.took.t) : '';
      const pm = (() => { const f = ans ? shLFacts(P, ans) : null; return f && f.took ? shLNm(f.took.t) : ''; })();
      const back = F && F.took && F.takers.length > 0, rw = u ? shReplyWhyJa(gid, P, u, ans, ex, i + o) : '';
      if (P.mode === 'material' && gid === 'k20') why = px ? at([`{x}で取れるのは${px}。{m}なら${pm}が取れて、そっちが大きいの。`, `{x}の${px}より、{m}で取れる${pm}のほうが価値が高いから損なの。`, `${px}もいいけど、{m}なら${pm}が取れたの。`, `{x}だと${px}どまり。{m}で${pm}を取れば、もっと得だったね。`, `取れる駒を比べると、${px}より${pm}が上だから、{m}が正解なの。`])
        : at([`{x}だと駒が取れないの。{m}なら${pm}が取れるよ。`, `{x}は駒を取らない手。${pm}を取れたのにもったいない！`, `{x}では駒得にならないの。${pm}が取れたコン。`, `{x}だと何も取れないの。${pm}を取るのが得だったね。`, `${pm}が取れたのに、{x}は駒を取っていないの。`]);
      else if (gid === 'rx' && P.mode === 'material') why = '{x}だと、入玉宣言の条件がそろわないの。';
      else if (P.trap && P.bait && u === P.bait) why = /詰まされ/.test(ex) ? at([`{x}で取れる${px || '駒'}はわな！ 取ると詰まされちゃうの。`, `${px || '駒'}を取ると、そのすきに玉が詰まされるコン。`]) : at([`{x}で取れる${px || '駒'}はわなだったの。取ったあと、相手に強い手があるの。`, `${px || '駒'}に飛びつくと、あとで大損しちゃうコン。`, `{x}の${px || '駒'}取りは、相手の反撃が待っているの。`]);
      else if (rw && gid !== 'k12' && gid !== 'k3' && !(back && !/取られちゃう|取られる|取られて/.test(rw))) why = rw;   // (2026-11-22: what the opponent's answer does to the move played)
      else if (!sc.has(u) && !back && gid !== 'k12') why = at(['{x}だと、相手の駒の利きや次のねらいへの備えが足りないの。{m}なら、そのすきを作らないコン。', '{x}は、この局面の急所から外れた手なの。{m}がいちばん大事な場所に効いているコン。']);   // (no stored answer for this move)
      else if (gid === 'k12' && F && !sc.has(u)) { const k = F.piece.t === 'k' ? '玉が逃げる受け' : F.took ? `${px}を取る受け` : `${shLNm(F.piece.t)}の合駒`; why = `{x}は${k}。` + (rw || 'そのあとも相手の攻めが続いちゃうの。'); }
      else if (!sc.has(u) && back) why = at([`{x}で${px}は取れるけど、相手の駒が届くから取り返されちゃうの。`, `{x}の${px}取りは、相手の駒が届いているから取り返されるの。`, `{x}で${px}を取っても、相手の駒が利いているから取り返されるコン。`, `{x}で取った駒は、守りの駒がいるから、すぐ取り返されちゃうの。`, `{x}の${px}は守られていて、取っても取り返されるから損なの。`]);
      else if (s <= -29000) why = at(['{x}だと、相手に詰まされちゃうの。', '{x}では玉が詰んじゃうから、それだけはだめなの。', '{x}のあと、相手に詰み筋が残るコン。']);
      else if (best >= 29000) why = '{x}だと、詰みをのがしちゃうの。';
      else if (gid === 'k12' && F) { const k = F.piece.t === 'k' ? '玉が逃げる受け' : F.took ? `${px}を取る受け` : `${shLNm(F.piece.t)}の合駒`, d = winP(best, 600) - winP(s, 600);
        why = `{x}は${k}。` + (rw || shLoss(d, i + o)); }
      else if (gid === 'k3') { const d = winP(best, 600) - winP(s, 600); why = rw && /詰ま/.test(rw) ? rw : at(['{x}でも詰みはひとまず防げるの。', '{x}も受けにはなっているの。', '{x}で詰めろは消えるの。', '{x}でも玉は助かるの。', '{x}も悪くない受け。']) + (rw ? 'でも、' + rw.replace(/^\{x\}(だと|では|のあと)、?/, '') : shLoss(d, i + o)); }
      else if (back) why = at([`{x}で${px}は取れるけど、相手の駒が届くから取り返されちゃうの。`, `{x}の${px}取りは、相手の駒が届いているから取り返されるの。`, `{x}で${px}を取っても、相手の駒が利いているから取り返されるコン。`, `{x}で取った駒は、守りの駒がいるから、すぐ取り返されちゃうの。`, `{x}の${px}は守られていて、取っても取り返されるから損なの。`]);
      else { const d = winP(best, 600) - winP(s, 600); why = rw || (px ? `{x}で${px}は取れるけど、` : at(['{x}だと、', '{x}を指すと、', '{x}では、', 'きみの{x}は、', '{x}の場合、'])) + shLoss(d, i + o + 2); }
    }
    let s = right + why; const so = od(T.soft); if (so && (s + so).replace(/<[^>]+>|\{[mx]\}/g, '').length <= 140) s = /^(ドンマイ|気にしない)/.test(so) ? so + ' ' + s : s + (/[！？]$/.test(s) ? ' ' : '') + so;
    return s;
  }
  /* (2026-11-21 lesson loop) the shogi opening practice in ショウギツネ's words, Japanese: a short intro, varied questions, a hint
     from what the answer does, and after the answer why it is played and what yours gives up — from the board (shFacts: drops,
     captures and recaptures, the bishop trade, swinging the rook, opening or closing the bishop's diagonal, the rook's pawn, edge
     pawns, the king walking into its castle, gold / silver moving up, a piece left to be taken) and the stored data (openings
     cand: freq = [move, games] with total / win, cp = [move, engine value] with floor). {m} = the line's move, {x} = yours. */
  const SHJ_OP = {
    intro: ['『{n}』をいっしょに覚えるコン！<br>{t}。', '今日は『{n}』だコン。<br>{t}。手順を追いかけてみてね！', '『{n}』の手順を見ていくコン！<br>{t}。', 'さあ、『{n}』の練習！<br>{t}。どんな形になるか、楽しみだコン。'],
    ask: ['{s}の番だコン。『{n}』で、強いソフトの対局でいちばん多い手はどれかな？', '『{n}』のこの場面、{s}ならどう指す？', 'さあ{s}の一手！ 定跡どおりに指せるかな？', '{s}がここでいちばんよく選ぶ手、わかる？', '{s}の番。手順を思い出して、本筋の手を指してみて！'],
    askCp: ['{s}の番だコン。ここでいちばん良い手はどれかな？', '駒落ちのこの場面、{s}ならどう指す？', 'さあ{s}の一手！ 駒の多さを生かせる手を探してみて。', '{s}の番。いちばん良い手、わかるかな？', '{s}の一手を考えてみて！ 定跡の形を思い出してね。'],
    pct: ['強いソフトどうしの対局の{a}%が、この手を選んでいるコン。', '実戦では{a}%がこの手。いちばん多いの！', '強いソフトの対局の{a}%で指された、定跡の本筋の手。', 'この場面では{a}%の対局がこれを選ぶの。覚えておいてね。', '{a}%の対局で選ばれた、いちばん多い手なの。', '実戦の{a}%で指されている、おなじみの手！'],
    cp: ['駒落ちの定跡でも、この手が本筋だコン。', 'この形では、これがいちばん確かな手なの。', 'ほかの手より、駒の働きがはっきり良くなる手。', '駒の多さを生かす、まっすぐな一手！', '上手の手薄なところをつく手なの。', '下手らしい、筋のいい手コン！'],
    lead: ['{m}が定跡の手。', '正解は{m}だったコン。', 'ここは{m}を指したかったね。', '本筋は{m}なの。', 'いちばんは{m}！', '定跡は{m}だったの。', 'ここは{m}が本筋コン。', '答えは{m}！'],
    // (2026-11-22 lesson loop) the praise, the soft words after a miss, the push on — each opening takes them in its own order (shOpVoice)
    cheer: ['いいね！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', '上手！', 'ナイス！', 'よく見つけたね！', 'すばらしい！', 'そうそう、それ！', 'いい手だね！', '完璧！'],
    soft: ['おしい！', 'ドンマイ！', 'あと少しだった！', 'いい線いってたコン！', '大丈夫、ここで覚えちゃおう！', '気にしない、気にしない！', 'よくある迷いだから平気！', 'だいじょうぶ、次はきっと指せるコン！', 'あと一歩！', '今度はもう覚えたでしょ？'],
    push: ['次もこの調子でいこう！', 'どんどん行こう！', 'その勢いで次へ進もう！', 'まだまだいけるね！', 'この感じで続けよう！', '次も楽しみだコン！'],
    // (2026-11-21) the line's next move (lineProbs: the castles, 鬼殺し, 立石流 … — problems made from the line itself)
    askL: ['手順の続き、{s}の次の一手はどれかな？', '{s}の番だコン。完成の形を目指して、ここで何を指す？', 'さあ、手順を思い出して！ {s}の一手は？', '『{n}』の続きだね。{s}ならここでどう指す？', '{s}の一手コン。手順どおりに指してみて！'],
    tailL: ['手順どおりの一手コン。', '完成の形に、また一歩近づいたね。', 'これで手順どおり！', '組み上がりが見えてきたの！', '形がまた一つ整ったコン！', '覚えた手順が、ちゃんと生きているの。', '手順の流れにぴったり！', 'この順番で組むのがコツなの。'],
    dubL: ['少しむりのある手だけど、『{n}』はこの手で相手をゆさぶるのが持ち味なの。', 'ちょっと強引だけど、相手をゆさぶるのがこの戦法の味なの！', '相手が正しく受けると苦しい手。でも、それがこの戦法のおもしろさコン。'],
    altL: ['{x}でも大丈夫コン！ 手順では{m}が先だけど、順番が入れかわっても同じ『{n}』の形になるの。', 'それもあり！ {x}を先に指しても、最後は同じ『{n}』の形に組めるコン。'],
    leadL: ['『{n}』の手順は{m}。', '正解は{m}だったコン。', 'ここは{m}を指したかったね。', '手順の次の手は{m}なの。', '次は{m}の番だったコン。', '手順どおりなら{m}！', '答えは{m}だったの。'],
    hintL: ['光っている手が、手順の次の一手。指したあとの形を想像してみてね。', 'ヒントは光っている手コン。『{n}』の完成した形を思い出してみて！'],
  };
  const SH_V = { p: 1, l: 3, n: 4, s: 5, g: 6, b: 8, r: 10, k: 0 };
  function shBd(sfen) {   // the board as 81 cells (row a..i × file 9..1), the side to move, the hands
    const [bd, side, hand] = String(sfen).split(' '), b = []; let pro = '';
    for (const row of bd.split('/')) for (const ch of row) { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { for (let k = 0; k < +ch; k++) b.push(''); } else b.push(pro + ch); pro = ''; }
    const H = { true: {}, false: {} }; let n = 0;
    for (const ch of hand && hand !== '-' ? hand : '') { if (/\d/.test(ch)) { n = n * 10 + +ch; continue; } const s = ch === ch.toUpperCase(); H[s][ch.toLowerCase()] = (H[s][ch.toLowerCase()] || 0) + (n || 1); n = 0; }
    return { b, sente: side !== 'w', H };
  }
  const shSq = t => (t.charCodeAt(1) - 97) * 9 + (9 - +t[0]);
  const shS = pc => pc.replace('+', '') === pc.replace('+', '').toUpperCase();   // sente's piece?
  function shTo(b, i) {   // the squares the piece on i attacks
    const pc = b[i], s = shS(pc), k = pc.toLowerCase(), r0 = (i / 9) | 0, c0 = i % 9, fw = s ? -1 : 1, out = [];
    const step = (dr, dc) => { const r = r0 + dr, c = c0 + dc; if (r >= 0 && r < 9 && c >= 0 && c < 9) out.push(r * 9 + c); };
    const slide = (dr, dc) => { let r = r0 + dr, c = c0 + dc; while (r >= 0 && r < 9 && c >= 0 && c < 9) { out.push(r * 9 + c); if (b[r * 9 + c]) break; r += dr; c += dc; } };
    const GOLD = [[fw, -1], [fw, 0], [fw, 1], [0, -1], [0, 1], [-fw, 0]], DG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], OR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (k === 'p') step(fw, 0); else if (k === 'l') slide(fw, 0); else if (k === 'n') { step(2 * fw, -1); step(2 * fw, 1); }
    else if (k === 's') [[fw, -1], [fw, 0], [fw, 1], [-fw, -1], [-fw, 1]].forEach(d => step(...d));
    else if (k === 'g' || ['+p', '+l', '+n', '+s'].includes(k)) GOLD.forEach(d => step(...d));
    else if (k === 'k') [...DG, ...OR].forEach(d => step(...d));
    else if (k === 'b' || k === '+b') { DG.forEach(d => slide(...d)); if (k === '+b') OR.forEach(d => step(...d)); }
    else if (k === 'r' || k === '+r') { OR.forEach(d => slide(...d)); if (k === '+r') DG.forEach(d => step(...d)); }
    return out;
  }
  const shAtk = (b, q, s) => b.reduce((m, pc, i) => pc && shS(pc) === s && shTo(b, i).includes(q) ? Math.min(m, SH_V[pc.replace('+', '').toLowerCase()] || 0) : m, 99);   // the cheapest attacker of q (99: none)
  const shKing = (b, s) => b.findIndex(pc => pc && pc.toLowerCase() === 'k' && shS(pc) === s);
  const shBReach = (b, s) => b.reduce((n, pc, i) => n + (pc && shS(pc) === s && /b$/i.test(pc) ? shTo(b, i).length : 0), 0);
  function shFacts(sfen, u) {
    const { b, sente: s, H } = shBd(sfen), drop = u[1] === '*', z = shSq(u.slice(2, 4)), a = drop ? -1 : shSq(u.slice(0, 2));
    const pc = drop ? u[0].toLowerCase() : b[a].replace('+', '').toLowerCase(), cap = b[z] ? b[z].replace('+', '').toLowerCase() : '';
    const mat = w => b.reduce((n, p) => n + (p && shS(p) === w ? SH_V[p.replace('+', '').toLowerCase()] : 0), 0) + Object.entries(H[w]).reduce((n, [k, c]) => n + SH_V[k] * c, 0);
    const nb = b.slice(); nb[z] = drop ? (s ? u[0].toUpperCase() : u[0].toLowerCase()) : (u[4] === '+' ? '+' : '') + b[a].replace('+', ''); if (!drop) nb[a] = '';
    if (u[4] !== '+' && !drop && b[a][0] === '+') nb[z] = b[a];
    const F = { pc, drop, cap, pro: u[4] === '+', behind: mat(s) < mat(!s), fm: s ? 9 - z % 9 : 1 + z % 9, rz: s ? (z / 9) | 0 : 8 - ((z / 9) | 0) };
    if (!drop) { const fw = s ? ((a / 9) | 0) - ((z / 9) | 0) : ((z / 9) | 0) - ((a / 9) | 0); F.dir = fw > 0 ? 'up' : fw < 0 ? 'back' : 'side'; F.n = Math.max(Math.abs(((a / 9) | 0) - ((z / 9) | 0)), Math.abs(a % 9 - z % 9)); }   // (2026-11-24 第2期: the words say which way the piece went only when it did)
    F.trade = cap === 'b' && pc === 'b';
    if (!drop && pc === 'r' && ((a / 9) | 0) === ((z / 9) | 0) && !cap) { F.swing = { 5: '中飛車', 6: '四間飛車', 7: '三間飛車', 8: '向かい飛車', 3: '袖飛車' }[F.fm] || 'side'; if ((s ? 9 - a % 9 : 1 + a % 9) !== 2) F.swing = 'side'; }
    if (!drop && pc === 'p') {
      const r1 = shBReach(b, s), r2 = shBReach(nb, s);
      F.bopen = r2 > r1 + 1; F.bshut = r2 < r1 - 1;
      F.rookp = nb.some((p, i) => p && shS(p) === s && /r$/i.test(p) && i % 9 === z % 9 && (s ? i > z : i < z));
      F.edge = F.fm === 1 || F.fm === 9;
      const ahead = z + (s ? -9 : 9); F.clash = ahead >= 0 && ahead < 81 && nb[ahead] && shS(nb[ahead]) !== s && nb[ahead].toLowerCase() === 'p';
      F.rank = F.rz <= 4;
    }
    if (drop) { const sl = w => w.reduce((n, p, i) => n + (p && shS(p) !== s && /[rbl]$/i.test(p) ? shTo(w, i).length : 0), 0), d0 = sl(b), d1 = sl(nb); if (d1 < d0 - 1) F.block = true; }
    const rk = b.findIndex(p => p && shS(p) === s && /r$/i.test(p)); F.rside = rk >= 0 && !drop && (rk % 9 < 4) === (a % 9 < 4) && a % 9 !== 4;
    const kb = shKing(b, s), kd = q => kb < 0 ? 9 : Math.max(Math.abs(((q / 9) | 0) - ((kb / 9) | 0)), Math.abs(q % 9 - kb % 9));
    if (!drop && (pc === 's' || pc === 'g')) { F.guard = kd(z) < kd(a) && kd(z) <= 2; F.up = s ? z < a - 1 : z > a + 1; }
    if (pc === 'k' && !drop) F.castle = Math.abs(z % 9 - 4) > Math.abs(a % 9 - 4) || ((z / 9) | 0) !== ((a / 9) | 0);
    const at = pc === 'k' ? 99 : shAtk(nb, z, !s), df = shAtk(nb, z, s), val = SH_V[pc];
    if (pc !== 'p' && pc !== 'k' && at < 99 && (df === 99 || at < val) && !(cap && SH_V[cap] >= val)) F.hang = Object.keys(SH_V).find(k => SH_V[k] === at);
    return F;
  }
  const SH_PN = { p: '歩', l: '香車', n: '桂馬', s: '銀', g: '金', b: '角', r: '飛車', k: '玉' };
  /* (2026-11-22 lesson loop) each idea has several wordings: a lesson's voice (shVoice, seeded by the opening's id) hands them out
     in turn, shared by the study line's notes and the problems, so the same line is not said twice in one opening */
  const shVoice = seed => { const n = {}; return (key, arr) => { const c = n[key] = (n[key] || 0) + 1; return arr[(seed + c - 1) % arr.length]; }; };
  const shSeed = id => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const shPerm = (seed, n) => { const a = [...Array(n).keys()]; let x = seed || 1; for (let i = n - 1; i > 0; i--) { x = (x * 1103515245 + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const SH_P0 = (k, a) => a[0];
  // (2026-11-22 lesson loop) the guide's words for each kind of move: a head (what the move is) and a tail (why it matters), each
  // handed out in turn by the opening's voice, so the notes of the study line and the problems do not repeat each other
  const SHW = {
    pw: [['歩を突いて、駒の通り道を作る手。', '歩を一つ進めて、うしろの駒が出られるようにする手コン。', '小さな歩の一手だけど、駒組みの下ごしらえなの！', '銀や桂が上がる道を、歩で作っておく手。', '歩をちょんと突いて、陣形をととのえる手！', '次の駒組みに向けて、歩を一歩前へ出すコン。', '駒の出口を作っておく、地味な歩の一手。', '歩をすすめて、形を広げていくところ！'],
      ['次に出ていく駒の準備なの。', 'あとで駒がのびのび動けるの！', '', '地味だけど、じわじわ効く一手コン。', 'こういう準備の手が大事！', '', 'ここから形が広がるの。', '', '一歩ずつ形を作っていくコン！', '']],
    gd: [['{X}を玉のそばに寄せて、囲いを固める手コン。', '{X}を玉の近くへ動かして、守りを厚くする手！', '{X}が玉の守りに加わる手。', '玉のとなりへ{X}を寄せる手。', '{X}で玉のまわりをしっかりガードするコン！', '守りの{X}を玉に近づける手。', '{X}を玉の横へつける手！', '{X}を玉の守り役に回す手なの。'],
      ['囲いがまた一段かたくなったね。', 'これで玉がぐっと安心なの。', '', '囲いの形が見えてきたコン！', '守りの駒どうしがくっつくと強いの！', '', '金銀が玉を守る、いい形なの。', '', 'すき間がひとつ減ったコン！', '']],
    up: [['{X}を上がって、陣形を作っていく手。', '{X}を一つ上げて、形をととのえる手コン！', '{X}を前へ出して、駒どうしのつながりを作る手。', '{X}を一段上げる手！', '{X}を前へ進めて、陣地を広げるコン。', '{X}を上へ持ちあげる手。', '{X}をすっと上がるところ！', '{X}を一歩前へ出しておく手なの。'],
      ['守りにも攻めにも使える位置なの！', '', '上がった駒が、あとで役に立つコン。', '駒が前に出ると、陣形が厚くなるの。', '', 'ここから働き場所を探すの！', '', '駒どうしが手をつなぐ形コン！', '']],
    kc: [['玉を、囲いのほうへ一歩寄せる手。', '玉が囲いの中へお引っこし！', '玉を戦場から遠ざける手コン。', '玉を一歩、守りの駒のほうへ動かす手！', '玉をすみのほうへ寄せていく手。', '玉の引っこしを一歩進める手。', '玉を安全地帯へ向かわせるコン！', '玉を囲いの奥へ近づける手なの。'],
      ['戦いが始まる前に、玉を安全にするのが大事コン。', 'これで攻められにくくなるの！', '', '囲いの奥がいちばん安心！', '', '玉は早めに安全な場所へ、が基本なの。', '', '「居玉は避けよ」っていうコン。', '', '戦場から一歩遠のいたの！', '']],
    ko: [['玉の位置を整える手。', '玉の場所を少し調整する手コン！', '玉を囲いにぴったり合う場所へ動かす手。', '玉の居場所を決める一手！'], ['囲いの形に合わせて、玉の場所を決めるの。', '', 'ちょっとした差が、あとで大きいの！']],
    rp: [['飛車先の歩を伸ばす手。', '飛車の前の歩をもう一つ進めるコン！', '飛車の筋の歩を前へ。', '飛車といっしょに攻める歩を進める手！', '飛車先の歩をずんずん進める手。', '飛車のまっすぐ前の歩を突く手。', '飛車の通る道の歩を、一歩前へ！', '飛車のための道を、歩で切り開く手コン。'],
      ['飛車の前の歩が進むほど、飛車が攻めに働きやすくなるの。', '攻めの道が開けていくね。', '', '相手は受けを考えないといけないの！', '攻め味がふえるコン。', '', '飛車の出番が近づいてきたの！', '']],
    bo: [['歩を突いて角道を開ける手。', '角の前の歩を一つ進めて、ななめの道を通す手！', '角の通り道をあけて、盤のまん中をにらむ手コン。', '歩をどかして角を目覚めさせる手！', '角がななめに走れるように、前の歩を突く手。', '角のななめの利きを通す歩の一手！'],
      ['角が斜めに大きく働けるようになるコン！', '大駒は道があってこそ働くの。', '', '角が遠くまで利くようになったね。', '', 'ここから角がにらみをきかせるの！']],
    bs: [['歩で角道を止める手。', '角のななめの道を、歩でふさぐ手コン。', 'わざと角の通り道を閉じる手！', '歩を突いて角の利きを止める手。'], ['角交換を防いで、じっくり駒組みする合図なの。', '急がずに組み上げるつもりだね。', '角を交換させない、じっくり派の作戦なの！', '']],
    cl: [['歩を相手の歩にぶつけて、戦いを始める手コン！', '歩と歩がぶつかった！', '相手の歩の目の前へ歩を進める手。', '歩をぶつけて、相手に「取る？ 取らない？」と問いかける手！'], ['取る・取らないで、相手に決断をせまるの。', 'ここから戦いが始まるね。', '仕掛けの合図コン！', '']],
    ed: [['端の歩を突く手。', '盤のはしっこの歩を一つ進める手！', '端歩を突いて、様子を見る手コン。', '端の歩を伸ばす手。', '一番はしの筋の歩を進める手！', '端の歩をひとつ前へ出すところ。'],
      ['端の歩は、あとで玉の逃げ道にも、攻めの足がかりにもなるコン。', '玉の逃げ道が広くなるの。', '終盤で差がつく一手なの。', '', 'いざというとき、端から攻めることもできるの！', '']],
    rk: [['歩を伸ばして、盤の真ん中に「位」を取る手。', '歩をぐいっと前へ！', '歩を高く進めて、相手の駒をおさえる手。', '前へ出た歩で、相手の駒の動ける場所をせまくする手！'], ['陣地が広くなって、駒が動きやすくなるの。', '自分の陣地が広がるコン。', '陣地を広げる作戦だね。', '']],
    sa: [['銀を前に出して、飛車といっしょに攻める準備をする手。', '攻めの銀がぐいっと前進！', '銀を飛車の前のほうへ進める手。', '銀を攻めに使う手！', '銀を相手の陣地へ向かわせる手コン。'], ['飛車と組んで相手陣をねらうコン。', '', '攻めの形ができてきたの！', '飛車の応援に向かうの。', '', '銀が出ると攻めに厚みが出るコン！', '']],
    gs: [['{X}の位置を整えて、形を作る手なの。', '{X}を動かして、陣形のすき間をうめる手コン。', '{X}の場所を変えて、囲いの形に合わせる手。', '{X}を横へずらす手！', '{X}の居場所を決める手。'], ['', '駒のつながりがよくなるの。', '']],
    n: [['桂馬を跳ねて、攻めに参加させる手コン！', '桂馬がぴょんと前へ！', '桂を跳ねて、相手の駒をねらう手。', '桂馬を一段跳ねておく手。'], ['', '攻めの駒がふえたね。', '桂は跳ねると働きだすの！']],
    l: [['香車を上げる手。', '香車を一つ上げる手コン！', '香車を一段持ちあげる手。'], ['玉が入る場所を作ったり、端の攻めに使ったりするの。', '端の形が変わるね。', '']],
    b: [['角を動かして、次の駒組みに備える手。', '角の位置を変える手！', '角を動かして、働く場所を探す手コン。', '角を一つずらしておく手。'], ['', 'ななめの利きを別の場所へ向けるの。', '']],
    r: [['飛車の位置を整えて、攻めにも守りにも働くようにする手なの。', '飛車を動かして、使いやすい場所へ置く手！', '飛車の場所を整える手コン。', '飛車を引いておく手。'], ['', '', '大駒の置き場所は大事なの！']],
    df: [['この形で、強いソフトが本筋として選ぶ手コン。', 'この場面の定跡どおりの手！', '定跡の流れにそった手なの。'], ['']],
  };
  // (2026-11-24 第2期・担当B) a wording that says which way the piece went (横へずらす・引く・上げる・前へ・一つ…) only for a move that went so
  const shDirOk = (h, F) => !F.dir || F.pc === 'n' || !((/横へずら|横に/.test(h) && F.dir !== 'side') || (/引い|引く/.test(h) && F.dir !== 'back') || (/上げ|上が|前へ|前に(出|進)|進め|持ちあげ/.test(h) && F.dir !== 'up') || (/一つずら|一つ上げ|一つ進め|一段|一歩/.test(h) && F.n !== 1));
  function shWhyJa(F, pk) {
    const v = pk || SH_P0, X = SH_PN[F.pc], C = SH_PN[F.cap];
    const W = key => { const [H0, T] = SHW[key], H1 = H0.filter(h => shDirOk(h, F)), H = H1.length ? H1 : SHW.df[0], h = v(key, H).replace(/\{X\}/g, X), t = v(key + '.t', T); return t ? h + (/[！？]$/.test(h) ? ' ' : '') + t : h; };
    if (F.trade && F.behind) return v('tb', ['角を取り返して、駒の損を取り戻す手。ここで取り返さないと、角1枚の損になっちゃう！', '取られた角を取り返す手！ これで駒の数が元どおりなの。', '角を取り返しておく手コン。放っておくと角損のままだからね。']);
    if (F.trade) return v('tr', ['自分から角を交換する手コン。おたがいに角を持ち駒にして、打ち込みのスキをねらい合う形になるの。', '角と角をぶつけて交換する手！ これで角が持ち駒になるの。', '角交換を選ぶ手。角を打ちこむすきを、おたがいに探す戦いになるコン。']);
    if (F.cap && F.behind) return v('cb', [`取られた駒を、すぐ${X}で取り返す手。取り返さないと駒損のままだからね。`, `${X}で取り返す手！ 駒の数をそろえておくの。`, `すかさず${X}で取り返す手コン。これで損はなし！`, `${X}で取り返して、駒の数を五分にもどす手。`, `取られっぱなしにしない、${X}の取り返し！`]);
    if (F.cap) return v('cp', [`相手の${C}を取る手。この形では、ここで取っておくのが定跡なの。`, `${C}をいただく手！ ここは取るのが本筋コン。`, `ここで相手の${C}を取っておく手だね。`]);
    if (F.drop && F.block) return v('db', [`持ち駒の${X}を打って、相手の駒の利きを止める手。打った駒が、そのまま壁になるの。`, `${X}を打って、相手の大駒の通り道をふさぐ手コン！`, `打った${X}が壁になって、相手の利きが止まる手！`]);
    if (F.drop) return v('dr', [`持ち駒の${X}を打つ手。手持ちの駒を、ここで働かせるの。`, `ここで${X}を打つ手コン！ 持ち駒の出番だね。`, `手持ちの${X}を盤に打って、働かせる手なの。`]);
    if (F.swing && F.swing !== 'side') return v('sw', [`飛車を横に動かして「${F.swing}」にする手コン！ 戦う場所を、ここで決めるの。`, `飛車をスッと横へ！ 「${F.swing}」の形になったね。`, `飛車を振って「${F.swing}」に構える手。この筋から攻めるつもりなの！`]);
    if (F.swing) return v('ss', ['飛車を横に動かして、攻める筋を変える手。飛車の働く場所を作るの。', '飛車を横にずらして、ねらう筋を変える手コン！', '飛車の場所を変える手。別の筋から攻める準備なの。']);
    if (F.pc === 'k') return W(F.castle ? 'kc' : 'ko');
    if (F.pc === 'p') return W(F.bopen ? 'bo' : F.bshut ? 'bs' : F.clash ? 'cl' : F.rookp ? 'rp' : F.edge ? 'ed' : F.rank ? 'rk' : 'pw');
    if (F.pc === 'g' || F.pc === 's') return W(F.guard ? 'gd' : F.pc === 's' && F.up && F.rside ? 'sa' : F.up ? 'up' : 'gs');
    return W(SHW[F.pc] ? F.pc : 'df');
  }
  function shShortJa(F) { return F.trade && F.behind ? '角を取り返せる' : F.trade ? '角を交換できる' : F.cap && F.behind ? '駒を取り返せる' : F.cap ? '駒を取れる' : F.drop ? '持ち駒を生かせる' : F.swing ? '飛車の働く場所が決まる' : F.pc === 'k' ? '玉を安全にできる' : F.bopen ? '角道が開く' : F.bshut ? '角道を止められる' : F.clash ? '戦いを始められる' : F.rookp ? '飛車先の歩が伸びる' : F.block ? '相手の駒の利きを止められる' : F.guard ? '囲いが固まる' : F.pc === 's' && F.up && F.rside ? '攻めの銀が前に出る' : F.dir && SH_PN[F.pc] && F.pc !== 'p' ? SH_PN[F.pc] + ({ up: ['が前に出て、相手の陣地に近づく', 'を前に進めて、攻めの形を作れる', 'が前へ出て、戦いに加われる'], back: ['を引いて、自分の陣地に戻せる', 'を引いて、守りに回せる', 'を引いて、陣形を引きしめられる'], side: ['を横に寄せて、形を整えられる', 'を横に寄せて、ほかの駒と並べられる', 'を横に動かして、位置を整えられる'] }[F.dir][(F.fm + F.rz) % 3]) : '定跡どおりの形になる'; }
  const SH_GLOW = ['光っている手がヒントだコン。', '光っている手を見てみて！', 'ヒントは光っている手！', '光っている駒に注目！', '答えのヒントは、光っているところ！', 'カギは光っている手コン！', '光っているマスがカギだコン！', '光っている手、どう思う？'];
  function shHintJa(F, k, cp, pk, line) {
    const v = pk || SH_P0, Q = (key, a) => { const q = v('h-' + key, a), g = v('glow', SH_GLOW); return q + (/[！？]$/.test(q) ? ' ' : '') + g; };
    if (F.trade && F.behind) return Q('tb', ['駒の数を数えてみて。いま、角が1枚少なくない？', '直前に角を取られたね。どうする？', 'このままだと角損のまま…？']);
    if (F.trade) return Q('tr', ['角と角が、向かい合っているね。', '角どうしがにらみ合ってるコン。', '角の交換、する？ しない？']);
    if (F.cap && F.behind) return Q('cb', ['直前に取られた駒があるね。', '駒の数、減ったままじゃない？', 'さっき取られた駒、どうしよう？']);
    if (F.cap) return Q('cp', ['取れる相手の駒がありそうだコン。', '相手の駒、取れるところにいない？', 'ただで取れる駒、ないかな？']);
    if (F.swing) return Q('sw', ['飛車をどこで使うか、考える場面コン。', '飛車の戦う場所を決める場面！', '飛車、このままの筋でいい？']);
    if (F.pc === 'k') return Q('k', ['玉はまだ戦場の近くにいるね。', '玉の居場所、このままで安心かな？', '戦いの前に、玉をどうしたい？', '玉を囲いに入れる準備、できてる？', '玉のまわり、まだ戦場に近くない？']);
    if (F.bshut) return Q('bs', ['角の通り道を見てみて。', '角交換、させたい？ させたくない？', '角のななめの道、このままでいい？']);
    if (F.bopen) return Q('b', ['角の通り道を見てみて。', '角のななめの道に注目！', '歩を動かしたら、角の利きはどう変わるかな？', '角が働くには、何が必要？']);
    if (F.clash) return Q('cl', ['相手の歩とのにらみ合いに注目！', '歩と歩の向かい合いを見てみて。', 'そろそろ戦いを始める？']);
    if (F.guard) return Q('gd', ['玉のまわりの守りを見てみて。', '玉のそばに、まだすき間がない？', '囲いを作るなら、どの駒が近づくといいかな？', '守りの駒、玉から遠くない？', '玉をもっと安心させる手は？']);
    if (cp) return Q('cp2', ['駒の多さを、どう生かすかな？', '指したあと、駒がどう働くか想像してみて。', '駒落ちの定跡の形、思い出せる？']);
    if (line) return Q('ln', ['完成した形を思い出してみて！', '指したあとの形を想像してみてね。', '手順の次の一手、思い出せる？', '囲いの形を頭に浮かべてみて！', '組み上がりまで、あと何手かな？']);
    return Q('df', ['強いソフトの対局でいちばん多い手を探してみて。', '手順の流れを思い出してみて！', '手順のどこまで来たか、思い出そう。', '指したあとの形を想像してみよう！', '定跡の形、頭に浮かぶかな？', 'この局面、次は何をする場面？']);
  }
  function shSfenStep(sfen, u) {   // the position after the move u (board, side, hands) as an sfen
    const { b, sente: s, H } = shBd(sfen), z = shSq(u.slice(2, 4));
    if (u[1] === '*') { const k = u[0].toLowerCase(); H[s][k] = (H[s][k] || 1) - 1; b[z] = s ? k.toUpperCase() : k; }
    else { const a = shSq(u.slice(0, 2)); if (b[z]) { const k = b[z].replace('+', '').toLowerCase(); H[s][k] = (H[s][k] || 0) + 1; } const base = b[a].replace('+', ''); b[z] = (u[4] === '+' || b[a][0] === '+' ? '+' : '') + base; b[a] = ''; }
    const rows = []; for (let r = 0; r < 9; r++) { let o = '', e = 0; for (let c = 0; c < 9; c++) { const pc = b[r * 9 + c]; if (!pc) { e++; continue; } if (e) { o += e; e = 0; } o += pc; } if (e) o += e; rows.push(o); }
    let hand = ''; for (const w of [true, false]) for (const k of ['r', 'b', 'g', 's', 'n', 'l', 'p']) { const c = H[w][k] || 0; if (c > 0) hand += (c > 1 ? c : '') + (w ? k.toUpperCase() : k); }
    return rows.join('/') + ' ' + (s ? 'w' : 'b') + ' ' + (hand || '-') + ' 1';
  }
  /* (2026-11-22 ユーザー：定跡の手順で、指すごとに何も言わない手があるのはやめて。「まず角道を開けて…」のような短いガイドでも) — every
     step of the study line without a note of its own gets a short guide from the board (shFacts → shWhyJa), told as whose move it is;
     the same idea answered by the other side right after is said as an answer (「後手も角道を開けて応じる」), not repeated word for word */
  const SH_SIDE = s => s ? '☗先手' : '☖後手';
  function shStepNotesJa(start, steps, notes, pk) {
    const v = pk || SH_P0, out = {}, ACT = { '角道が開く': ['角道を開けて', '角の通り道をあけて', '角のななめを通して'], '飛車先の歩が伸びる': ['飛車先の歩を伸ばして', '飛車の前の歩を進めて', '飛車の筋の歩を突いて'], '玉を安全にできる': ['玉を囲いのほうへ寄せて', '玉を守りのほうへ動かして', '玉の引っこしを進めて'], '囲いが固まる': ['囲いを固めて', '守りを厚くして', '玉のまわりを固めて'], '攻めの銀が前に出る': ['銀を前に出して', '攻めの銀を進めて', '銀を上がって'], '角道を止められる': ['角道を止めて', '角の通り道を閉じて', '角のななめをふさいで'], '飛車の働く場所が決まる': ['飛車を振って', '飛車を横へ動かして', '飛車の筋を決めて'] };
    let sf = start, prevK = '', run = 0;
    steps.forEach((u, i) => {
      let F = null; try { F = shFacts(sf, u); } catch (e) {}
      const s = String(sf).split(' ')[1] !== 'w', S = SH_SIDE(s), k = F ? shShortJa(F) : '';
      run = k && k === prevK ? run + 1 : 0;
      const own = notes && notes[String(i)];
      if (own) { const t = String(own.ja || own); if (typeof own === 'string' || own.ja) out[String(i)] = (/^\s*[☗☖]/.test(t) ? '' : S + '：') + varyJa(guideJa(t, 'shogi'), 'shogi'); }
      else if (F) {
        const why = shWhyJa(F, v), one = (why.match(/^[^。！]*[。！]/) || [why])[0];
        const AC = ACT[k] && v('act' + k, ACT[k]);
        if (run && AC && !F.cap) out[String(i)] = v('run', [`${S}も同じように、${AC}応じるコン。`, `${S}も負けずに、${AC}いくの！`, `おたがい、まだ${AC}いく場面だね。`, `${S}も、もう一手${AC}いくコン！`, `ここは${S}も${AC}追いかける手！`, `${S}だって${AC}おきたいところなの。`]);
        else if (run) out[String(i)] = `${S}も、${one.replace(/手(なの|コン)?([。！])$/, '手を指すコン$2')}`;
        else out[String(i)] = `${S}：${i === 0 ? 'まずは' : ''}${why}`;
      }
      prevK = k;
      try { sf = shSfenStep(sf, u); } catch (e) {}
    });
    return out;
  }
  function shStaticWhyJa(sfen, u, k) {   // (2026-11-22, the openings) after the move: the piece of yours the opponent can win at once (attacked and not
    // defended, or attacked by a cheaper piece) — the moved piece itself, or one that was already attacked and left there
    try {
      const { b, sente: s } = shBd(sfen), nb = shBd(shSfenStep(sfen, u)).b, z = shSq(u.slice(2, 4)), cap = b[z] ? SH_V[b[z].replace('+', '').toLowerCase()] : 0;
      let best = null;
      nb.forEach((pc, i) => { if (!pc || shS(pc) !== s) return; const t = pc.replace('+', '').toLowerCase(); if (t === 'k') return;
        const v = SH_V[t], at = shAtk(nb, i, !s); if (at >= 99) return; const df = shAtk(nb, i, s), gain = df >= 99 ? v : v - at; if (gain <= 1) return;
        if (i === z && cap >= v) return;   // (an even trade)
        if (!best || gain > best.gain) best = { i, pc, gain, at, was: i !== z && b[i] === pc && shAtk(b, i, !s) < 99 }; });
      if (!best) return '';
      const X = SH_PN[best.pc.replace('+', '').toLowerCase()], A = SH_PN[Object.keys(SH_V).find(q => SH_V[q] === best.at)] || '駒', free = shAtk(nb, best.i, s) >= 99;
      if (best.i === z) return [`{x}で動かした${X}は、相手の${A}に${free ? 'ただで' : ''}取られちゃうの。`, `{x}だと、${X}が相手の${A}の利きに入っちゃう。${free ? 'ただで' : ''}取られるコン。`][k % 2];
      if (best.was) return [`ねらわれていた${X}をそのままにしたから、相手の${A}に取られちゃうの。`, `{x}では、${X}への相手の${A}のねらいが消えていないの。`][k % 2];
      return [`{x}のあと、相手の${A}で${X}を取られちゃうの。`, `{x}だと、${X}のまもりがなくなって、相手の${A}に取られるコン。`][k % 2];
    } catch (e) { return ''; }
  }
  function shContrastJa(F, FA, k, ci) {   // (2026-11-22) a quiet miss in an opening: what the line's move does, and what yours does instead — from the board
    const mine = F.bshut ? '{x}は角道を止めてしまう手' : F.pc === 'k' && !F.castle ? '{x}は玉を戦いの起きる側へ動かしてしまう手' : F.edge ? '{x}の端歩は、急がなくてもいい手' : F.swing && !FA.swing ? '{x}は飛車を動かして、作戦が変わってしまう手' : F.pc === 'r' && !FA.swing ? '{x}は飛車をうろうろさせる手' : '';
    const theirs = `{m}なら${shShortJa(FA)}`;
    const c = ci != null ? ci : k, sh = shShortJa(FA);
    return mine ? [`${mine}。${theirs}から、ここは{m}が先なの。`, `${theirs}けど、${mine}なの。`, `${mine}だから、ここは見送りたいの。${theirs}！`, `残念、${mine}なの。${theirs}からね。`][c % 4] : [`${theirs}けど、{x}ではそうならないの。`, `{x}を指しても、${sh}ことにはならないの。{m}を先に指しておきたいところ！`, `{x}ではその働きがないの。${theirs}から、こっちが先コン。`, `{x}だと${sh}チャンスをのがしちゃうの。{m}が先！`][c % 4];
  }
  function shOpVoice(id) {   // (2026-11-22 lesson loop) one opening's voice: the wordings in turn, and the praise / the soft words / the push in an order of its own
    const seed = shSeed(id), O = SHJ_OP, pc = shPerm(seed, O.cheer.length), ps = shPerm(seed ^ 0x9e37, O.soft.length), pp = shPerm(seed ^ 0x51ed, O.push.length);
    return { pk: shVoice(seed % 97), cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]] };
  }
  const shJoin = (...a) => a.filter(Boolean).reduce((s, t) => !s ? t : s + (/[！？]$/.test(s) ? ' ' : '') + t, '');
  const shFit = (s, t) => t && (s + t).replace(/<[^>]+>|\{[mx]\}/g, '').length <= 140 ? shJoin(s, t) : s;
  function shLineJa(o, name, k, later, V, vi) {   // the line's next move (mode 'line'): {m} = the line's move, {x} = yours
    V = V || shOpVoice(name); const v = V.pk, i = vi != null ? vi : k;
    const P = o.P, C = P.cand || [], A = o.ans, sente = String(o.pos).split(' ')[1] !== 'w', side = sente ? '☗先手' : '☖後手', FA = shFacts(o.pos, A), N = t => t.replace(/\{n\}/g, name);
    const val = new Map(C), ref = Math.max(...C.filter(c => P.accept.includes(c[0])).map(c => c[1]));
    const ask = N(SHJ_OP.askL[k % 5]).replace('{s}', side);
    const hintTx = N(shHintJa(FA, k, false, v, true));
    const fb = v('fb', [0, 1, 2, 3, 4, 5]), w = shWhyJa(FA, v), t = N(P.dub ? v('dubL', SHJ_OP.dubL) : v('tailL', SHJ_OP.tailL)), alt = N(v('altL', SHJ_OP.altL)), lead = N(v('leadL', SHJ_OP.leadL)), ch = V.cheer(i), so = V.soft(i), pu = V.push(i);
    const good = u => {
      if (u && u !== A && P.accept.includes(u)) return shJoin(ch, alt);
      return shFit(shJoin(ch, w, t), pu); };
    const ng = u0 => {
      let u = u0; if (!u || u === A) u = (C.find(x => !P.accept.includes(x[0])) || [])[0];
      const kon = /コン/.test(lead) ? 'の。' : 'コン。', L = x => shJoin(so, shJoin(lead, x));
      if (!u) return L(shWhyJa(FA, v));
      let F; try { F = shFacts(o.pos, u); } catch (e) { F = {}; }
      const mine = val.has(u) ? val.get(u) : P.floor != null ? P.floor : ref - 600, d = winP(ref, 600) - winP(mine, 600);
      if (F.hang && !FA.hang && d > .05) return L(`{x}だと、その${SH_PN[F.pc]}を相手の${SH_PN[F.hang]}にタダで取られちゃう！`);
      if (FA.cap && FA.behind && !F.cap) return L('{x}だと取り返しそびれて、駒損のままになっちゃう。');
      if ((later || []).includes(u)) return L(N('{x}も『{n}』で指す手だけど、いまはまだ早いの。先に{m}を指しておかないと、形がくずれちゃう') + kon);
      const rw = shStaticWhyJa(o.pos, u, k); if (rw) return L(rw);
      if (d > .12) return L(shContrastJa(F, FA, k, fb));
      return L([`{x}も悪い手じゃないけど、それだと手順からはずれちゃうの。{m}なら${shShortJa(FA)}`, `{x}だと、組みたい形から少しそれるの。手順の{m}なら${shShortJa(FA)}`, `{x}は形に合わない一手なの。ここで{m}なら${shShortJa(FA)}`, `{x}では組む順番がずれちゃうの。先に{m}なら${shShortJa(FA)}`, `{x}だと手順が一つ飛んじゃう。{m}を指してこそ${shShortJa(FA)}`, `{x}は今の形には早すぎるの。{m}だと${shShortJa(FA)}`][fb] + kon);
    };
    return { ask, hintTx, good, ng };
  }
  function shOpJa(o, name, hs, i, handi, V) {
    V = V || shOpVoice(name); const v = V.pk;
    const P = o.P, C = P.cand || [], A = o.ans, sente = String(o.pos).split(' ')[1] !== 'w', cp = P.mode === 'cp', k = hs + i;
    const side = handi ? (sente ? '下手' : '上手') : sente ? '☗先手' : '☖後手', N = P.total || C.reduce((s, x) => s + x[1], 0) || 1;
    const pc = c => Math.max(1, Math.round(c / N * 100)), cnt = new Map(C), FA = shFacts(o.pos, A), rep = (t, q) => t.replace(/\{([ns])\}/g, (_, x) => q[x]);
    const ask = rep((cp ? SHJ_OP.askCp : SHJ_OP.ask)[k % 5], { n: name, s: side });
    const w = shWhyJa(FA, v), t0 = cp ? v('cpT', SHJ_OP.cp) : v('pct', SHJ_OP.pct).replace('{a}', pc(cnt.get(A) || 0)), t = /コン/.test(w) ? t0.replace('コン。', 'の。').replace('コン！', '！') : t0;
    const fq = v('fq', [0, 1, 2, 3]), ct = v('ct', [0, 1, 2, 3]), lead = v('lead', SHJ_OP.lead), ch = V.cheer(i), so = V.soft(i), pu = V.push(i), sh = shShortJa(FA), hint = shHintJa(FA, k, cp, v);
    const good = u => {
      if (u && u !== A && cnt.has(u)) return shJoin(ch, cp ? `{x}も悪くない手コン。でも{m}なら${sh}から、ほんの少し上なの。` : `{x}もよく指される手！ 実戦では${pc(cnt.get(u))}%、いちばん多い{m}も${pc(cnt.get(A))}%で、どっちも本筋なの。`);
      return shFit(shJoin(ch, w, t), pu); };
    const ng = u0 => {
      let u = u0; if (!u || u === A) u = (C.find(x => x[0] !== A) || [])[0]; const L = x => shJoin(so, shJoin(lead, x));
      if (!u) return L(w);
      let F; try { F = shFacts(o.pos, u); } catch (e) { F = {}; }
      const best = C.length ? C[0][1] : 0, mine = cnt.has(u) ? cnt.get(u) : null;
      const dd = cp ? winP(best, 600) - winP(mine != null ? mine : P.floor != null ? P.floor : best - 600, 600) : 1;
      if (F.hang && !FA.hang && (cp ? dd > .12 : mine == null)) return L(`{x}だと、その${SH_PN[F.pc]}を相手の${SH_PN[F.hang]}にタダで取られちゃう！`);
      if (FA.cap && FA.behind && !F.cap) return L('{x}だと取り返しそびれて、駒損のままになっちゃう。');
      if (!cp && mine != null) { const b = pc(mine), a = pc(cnt.get(A));
        return L((b * 2 >= a ? [`{x}もよく指される手（${b}%）。でも{m}なら${a}%で、こっちがいちばんの本筋なの。`, `{x}も${b}%ある手。でも{m}なら${sh}から、${a}%の対局がこっちを選ぶの。`, `{x}も悪くない（${b}%）けど、{m}は${sh}ので、${a}%の対局で指されているの。`, `{x}を選ぶ対局も${b}%あるコン。それでも{m}なら${sh}から、${a}%でいちばん多いの。`]
          : [`{x}も指される手だけど、${b}%だけ。{m}は${a}%の対局で選ばれていて、${sh}からね。`, `{x}を選ぶ対局は${b}%くらい。{m}なら${sh}から、${a}%の対局がこっちなの。`, `{x}は${b}%と少数派。{m}は${sh}ので、${a}%の対局で指されているの。`, `{x}は強いソフトの対局の${b}%でしか指されない手。{m}だと${sh}から、${a}%の対局が選ぶコン。`])[fq]); }
      const rw = shStaticWhyJa(o.pos, u, k); if (rw) return L(rw);
      if (cp) return L(shContrastJa(F, FA, k, ct));
      // (追25: the record keeps every move played 3 times or more, so a move outside it was played at most 2 times — and at most as often as the games left over)
      const rest = Math.max(0, N - C.reduce((s, x) => s + x[1], 0)), k2 = Math.min(2, rest);
      return L((rest === 0 ? [`{x}は、この場面の${N}局で一度も指されていない手。`, `{x}を選んだ対局は、記録の${N}局に一つもないの。`, `{x}は、記録した${N}局では一度も出てこない手。`, `{x}は、この場面の${N}局のどれにも出てこない手なの。`]
        : k2 / N < 0.03 ? ['{x}は、強いソフトの対局ではほとんど指されない手。', '{x}を選んだ対局は、ほとんどないの。', '{x}は実戦ではめったに見ない手。', '{x}は、この場面の対局ではほとんど出てこない手なの。']
        : [`{x}は、この場面の${N}局のうち、多くても${k2}局しか指されていない手。`, `{x}を選んだ対局は、記録の${N}局で多くても${k2}局だけ。`, `{x}は少数派で、${N}局のうち多くても${k2}局なの。`, `{x}が指されたのは、${N}局のうち多くても${k2}局。`])[fq] + shContrastJa(F, FA, k, ct));
    };
    return { ask, hintTx: hint, good, ng };
  }
  const SHOGI = {
    LKEY: 'shogi-kaya-lessons-v1', OKEY: 'shogi-kaya-open-v1', CATS: ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'], data: null,
    load() {
      if (this.p) return this.p;
      const voice = fetch('../shogi/voice-fox-ja.js?v=4').then(r => r.ok ? r.text() : '').then(t => { const w = {}; try { new Function('window', t)(w); } catch (e) {} this.V = ((w.I18N || {})['ja@fox']) || {}; }).catch(() => { this.V = {}; });   // (ショウギツネ's own lines, 3D, ja)
      const rep = getJ('../shogi/lesson-replies.json?v=2').then(j => { SH_REP = j || {}; }).catch(() => {});   // (the opponent's answer to each move of the lesson problems: shogi/tools/lesson-replies.js)
      return (this.p = Promise.all([voice, rep, getJ('../shogi/lessons.json?v=30261124a'), getJ('../shogi/openings.json?v=20261124ol1'),
        ...['beg', 'mid', 'adv', 'sp', 'new', 'castle'].map(c => getJ(`../shogi/openings-${c}.json?v=20261124oc`).catch(() => ({ sets: [] })))])
        .then(([_, _r, ls, op, ...more]) => {
          const sets = op.sets.slice(); more.forEach((m, i) => (m.sets || []).forEach(s => { s.cat = s.cat || ['beg', 'mid', 'adv', 'sp', 'new', 'castle'][i]; if (!sets.some(x => x.id === s.id)) sets.push(s); }));
          sets.forEach(s => { if (!s.cat) s.cat = s.handi ? 'handi' : 'mid'; });
          const ord = {}; Object.entries(op.index || {}).forEach(([c, L2]) => L2.forEach(([id], i) => { ord[id] = i; }));
          sets.sort((a, b) => (this.CATS.indexOf(a.cat) - this.CATS.indexOf(b.cat)) || ((ord[a.id] ?? 99) - (ord[b.id] ?? 99)));
          this.data = { ls, sets }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.sets.map(s => ({ key: s.id, cat: s.cat, catName: (OPCAT[lang] || OPCAT.en)[s.cat] || s.cat, title: L(s.title, lang), sub: L((NC.shogi || {})['op:' + s.id + '/short'] || s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.grades.map((g, i) => ({ key: String(i), cat: g.rules ? 'rules' : 'lesson', catName: '', title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, sub: L(g.short, lang), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang, X) {
      const g = this.data.ls.grades[+key]; if (!g) return null;
      const pool = g.problems.filter(p => !p.variant && (p.kind === 'best' || p.kind === 'tsume'));
      const probs = g.rules ? pool : shuffle(pool).slice(0, 5).sort((a, b) => pool.indexOf(a) - pool.indexOf(b));   // (the pool's order: easy → hard, 2026-11-24 第2期)
      // the warm-up (lessons.json grade.ramp, shogi/tools/ramps.js; 2026-11-15 on the 3D table): the 2D form → the runner's (fen, hl, ar)
      const HLC = { ng: 'hang', ok: 'ok', hl: '' };
      const V = lang === 'ja' ? (this.V || {}) : {}, vo = k => V[k] != null ? { ja: V[k], __voice: true } : null;   // (ショウギツネ's lines win over the plain texts and atlas/nocoord)
      const ramp = (g.ramp || []).map((it, j) => { const o = Object.assign({}, it, { fen: it.sfen, hl: (it.marks || []).map(([q, c]) => [q, HLC[c] ?? '']), ar: (it.arrows || []).map(([a, b]) => [a, b, '']) });
        ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = vo(`ramp:${g.id}/${j}/${f}`); if (v) o[f] = v; }); return o; });
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: g.id, title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, intro: (lang === 'ja' && SHJ2.intro[g.id]) || V['intro:' + g.id] || (L(g.intro, lang) || []).join('<br>'), ramp: ramp.length ? ramp : null, RU,
        probs: (P2 => lang === 'ja' ? shJaLesson(g, P2) : P2)(probs.map((p, i) => { const ja = lang === 'ja', best = p.kind !== 'tsume', AQ = ja && best ? SHJ.ask[g.id] : null, ans = p.sol ? p.sol[0] : (p.accept || p.pv || [])[0], pm = ja && p.mode === 'material' ? shCap(p.sfen, ans) : '';
          const why = L((NC.shogi || {})[g.id + '/p' + g.problems.indexOf(p) + '/expl'] || p.expl, lang);   // (3D: the words without coordinates)
          return { pos: p.sfen, kind: best ? 'best' : 'tsume', n: p.n, sol: p.sol, P: p,
            ask: L(p.q, lang) || (!best ? fill(ja ? ['<b>{n}手詰め</b>。王手を続けて玉を詰ませよう！', '<b>{n}手詰め</b>だよ。玉の逃げ道をよく見てね。', '<b>{n}手詰め</b>に挑戦！ 最後まで読み切るコン。'][i % 3] : X.tsume, { n: p.n }) : AQ ? AQ[i % AQ.length] : V['prompt:' + g.id] || L(g.prompt, lang)),
            why: why || (pm ? `{m}で${pm}を取ったね。取れる駒の中で、いちばん価値が高い駒なの。` : ja && g.id === 'rx' && best ? 'それがいちばん良い手だコン。駒落ちでも、ふつうの将棋と同じように、駒の働きを大事にしてね。' : ja && !best ? ['逃げ道をぜんぶふさいで、ちゃんと詰ませたね。', '王手を続けて、玉をつかまえたコン！', 'おみごと！ 最後まで読み切れたね。'][i % 3] : ''), ans,
            hintTx: ja ? (best || g.id === 'rx' ? SHJ.hint[g.id] || '' : SHJ.hint.tsume) : '', ng: ja && (best ? p.cand : true) ? u => shTeachJa(g.id, Object.assign({ why }, p), u) : null }; })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.sets.find(x => x.id === key); if (!s) return null;
      const probs = (s.problems || []).length ? (s.handi ? s.problems.map((p, i) => i) : shuffle(s.problems.map((p, i) => i))).slice(0, 5).sort((a, b) => a - b).map(i => s.problems[i]) : [];   // (the pool's order: easy → hard, 2026-11-24 第2期・担当B)
      // (2026-11-21) sets with few game-based problems (the castles, 鬼殺し, 立石流 …): filled up with "the line's next move" problems
      // (lineProbs, shogi/tools/openings/lineprobs.js), in the line's order
      if (probs.length < 5 && (s.lineProbs || []).length) probs.push(...shuffle(s.lineProbs.slice()).slice(0, 5 - probs.length).sort((a, b) => a.ply - b.ply));
      const nc = NC.shogi || {}, notes = Object.assign({}, s.study && s.study.notes || {}); Object.keys(nc).forEach(k => { const m = k.match(/^op:(.+)\/n(\d+)$/); if (m && m[1] === s.id) notes[m[2]] = nc[k]; });   // (3D: the notes without coordinates)
      const ja = lang === 'ja', nm = L(s.title, 'ja'), hs = s.id.length * 3, sh = String(L(nc['op:' + s.id + '/short'] || s.short, lang) || '');
      const intro = !ja ? sh : s.handi ? `『${nm}』の練習だコン！<br>${sh}` : SHJ_OP.intro[hs % SHJ_OP.intro.length].replace('{n}', nm).replace('{t}', sh.replace(/[。！]$/, ''));   // (2026-11-21 lesson loop: ショウギツネ introduces it)
      const VO = ja ? shOpVoice(s.id) : null;
      if (ja && s.study && s.study.start) try { const gen = shStepNotesJa(s.study.start, s.study.steps.map(x => x[0]), notes, VO.pk); Object.keys(gen).forEach(k => { notes[k] = gen[k]; }); } catch (e) { console.warn('[lessons3d] shogi step notes', e); }
      return { id: s.id, title: L(s.title, lang), intro, start: s.study && s.study.start, steps: (s.study && s.study.steps || []).map(x => x[0]), notes,
        probs: probs.map((p, i) => { const o = { pos: p.sfen, kind: 'best', P: p, ans: (p.mode === 'line' ? p.pv : p.accept || p.pv || (p.cand && [p.cand[0][0]]) || [])[0] };
          const st = (s.study && s.study.steps || []).map(x => x[0]), later = p.mode === 'line' ? st.filter((u, j) => j > p.ply && (j - p.ply) % 2 === 0) : null;
          if (ja && o.ans) try { Object.assign(o, p.mode === 'line' ? shLineJa(o, nm, hs + i, later, VO, i) : shOpJa(o, nm, hs, i, !!s.handi, VO)); } catch (e) { console.warn('[lessons3d] shogi opening', e); } return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[s.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    introPos() { return { pos: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1', lock: true }; },
    rampBody: (it, lang) => L(it.body, lang),   // (no diagram in lessons.json: the starting position, for looking only, while the intro is read)
    points(P, u) {   // = shogi/index.html movePoints (without the engine's runtime score)
      if (P.mode === 'line') { if (P.accept.includes(u)) return PTS; const ref = Math.max(...P.cand.filter(c => P.accept.includes(c[0])).map(c => c[1])), c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(12, Math.round(12 * (1 - (ref - s) / 500)))); }   // (the line's next move, 3D only: another move is partial at most)
      if (P.mode === 'material' || P.mode === 'freq') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u); return c ? Math.round(PTS * c[1] / best) : 0; }
      if ((P.accept || []).includes(u)) return PTS;
      if (P.mode === 'cp') { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : P.floor; return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (best - s) / 500)))); }
      if (P.cand) { const best = P.cand[0][1], c = P.cand.find(x => x[0] === u), s = c ? c[1] : Math.min(P.floor !== undefined ? P.floor : best - 2000, best); return Math.max(0, Math.min(PTS - 1, Math.round(PTS * (1 - (winP(best, 600) - winP(s, 600)) / .3)))); }
      return 0;
    },
  };
  /* (2026-11-21 lesson loop) the chess opening practice in ナイトン's words, Japanese: the intro and the line's notes written for him
     (3D, no coordinates — other languages keep atlas/nocoord / openings.json), a varied question, a hint from what the most played
     move does, and after the answer why it is played and what yours gives up — from the board (development, centre pawns, castling,
     recapture, pins, pieces left to be taken) and the stored game counts (openings.json cand: [move, games], n = games). */
  const CHJ_OP = {
    ask: ['{s}の番！ 『{n}』で、強い人がいちばん指した手はどれかな？', '『{n}』のこの場面。{s}ならどう指す？', 'さあ{s}の一手。定跡どおりに指せるかな？', 'ここで{s}がいちばんよく選ぶ手、わかるかな？', '{s}の番。手順を思い出して、本筋の手を指してみて！'],
    pct: ['強い人の対局の{a}%で、この手が選ばれているんだ。', '実戦では{a}%がこの手。いちばん人気！', '強い人の{a}%が指した、定跡の本筋の手。', 'この場面では{a}%の人がこれを選ぶ。覚えておこう！'],
    lead: ['{m}が定跡の手。', '正解は{m}だったんだ。', 'ここは{m}を指したかったね。', '本筋は{m}ピョン。'],
    intro: {
      italian: 'イタリアン・ゲームは、何百年も前から指されている古典の序盤。白はビショップを斜めに出して、黒のキングの横のポーンをねらうピョン！<br>このポーンはキングしか守っていない弱点なんだ。いまは中央を支えて、キャスリングしてからじっくり駒組みするのが主流だね。',
      ruy: 'ルイ・ロペスは「スペイン」とも呼ばれる、チェスの王道の序盤。白はビショップで黒のナイトをねらって、そのナイトが守る中央のポーンにじわじわ圧力をかけるピョン。<br>黒はすぐポーンでビショップを追うのが定番。そこから長い駆け引きが始まるんだ！',
      sicilian: 'シシリアン・ディフェンスは、トップレベルでいちばん多く指される黒の応手。黒は左寄りのポーンで、中央を横から押さえるピョン！<br>左右がちがう形になるから、黒も勝ちをねらいやすい。白がポーンを交換する「オープン・シシリアン」が主流なんだ。',
      french: 'フレンチ・ディフェンスは、守りの堅さが自慢の序盤ピョン。黒はポーンを1マス進めて支えを作り、隣のポーンを大きく前に出して、白の中央に挑むんだ。<br>中央が閉じたら、ポーンの鎖の根元を横から攻めるのが黒の作戦。クイーン側のビショップが出にくいのが弱点だね。',
      caro: 'カロ・カン・ディフェンスは、フレンチの仲間みたいな序盤。ポーンを2マス進めて中央に挑む前に、手前のポーンを1マス進めて支えておくピョン。<br>だからクイーン側のビショップを自由に出せるんだ。ポーンの形が崩れにくくて、手堅く戦いたい人に人気だね。',
      scandi: 'スカンジナビアン・ディフェンスでは、黒が1手目からポーンを2マス進めて、白の中央のポーンに体当たり！<br>取り合ったあと、早めにクイーンが出てくるのが特徴。クイーンは追われやすいから、安全な場所に置いて、すばやく駒を出すのがコツなんだ。',
      qgd: 'クイーンズ・ギャンビット辞退は、クイーンの前のポーンから始まる王道の形。白は隣のポーンを差し出して、黒の中央のポーンをどかそうとするピョン。<br>黒は取らずに、キングの前のポーンでがっちり守るんだ。あとは駒を自然に出して、キャスリングするのが基本の作戦だね。',
      slav: 'スラブ・ディフェンスも、クイーンズ・ギャンビットへの応じ方のひとつ。黒はキングの前ではなく、反対隣のポーンを1マス進めて中央を守るピョン。<br>これならクイーン側のビショップを外に出せる。差し出されたポーンを取ってから守る、やわらかい指し方もできるんだ。',
      kid: 'キングズ・インディアン・ディフェンスは、攻め好きの黒に人気の序盤ピョン！ 黒はビショップを長い対角線に置いて、まずキングを安全にする。中央はいったん白にゆずるんだ。<br>駒組みが終わったら、ポーンで中央に反撃して、キング側ではポーンを押し上げて攻めるのが定番だね。',
      nimzo: 'ニムゾ・インディアン・ディフェンスは、駒の働きとポーンの形のバランスを争う、ちょっと大人な序盤ピョン。<br>黒はビショップで白のナイトをピンして、白が中央を広げるのをじゃまするんだ。ナイトと交換して、白のポーンの形を崩すことも多いね。',
      london: 'ロンドン・システムは、相手が何をしてきても、だいたい同じ形を作れる白の序盤ピョン。<br>ポーンで道をふさぐ前にビショップを外へ出して、あとはポーンとナイトでがっちり組む。覚えることが少なくて安定してるから、初心者から上級者まで人気なんだ。',
      english: 'イングリッシュ・オープニングは、白がクイーン側のポーンから始める序盤ピョン。中央を横から押さえるから、ゆったりした戦いになりやすいんだ。<br>ナイトとビショップを組み合わせて、じわじわ中央をねらうのが定番の形。ほかの序盤とはひと味ちがうね！',
    },
    notes: {
      italian: { 2: 'ナイトを出して、黒の中央のポーンをねらう。ぼくの仲間の出番ピョン！', 3: '黒もナイトを出して、中央のポーンを守る形。', 4: 'ビショップが、黒のキングの横のポーンをにらんでる！ ここはキングしか守っていない弱いところなんだ。', 5: '黒ももう1つのナイトを出して、白の中央のポーンをねらう。「ツー・ナイツ・ディフェンス」って呼ばれる形だね。', 6: 'ポーンを1マスだけ進めて、中央のポーンをがっちり守る。いまいちばん人気の、落ち着いた指し方ピョン。', 8: 'このポーンは、あとで隣のポーンを進めて中央を広げるための下準備。気づいたかな？', 10: 'キャスリングでキングを安全な場所へ！ 序盤の基本は「駒を出す・中央を取る・キャスリング」の3つだよ。' },
      ruy: { 4: 'ビショップで黒のナイトに圧力！ このナイトは、中央のポーンを守っている大事な駒なんだ。', 5: '「モルフィー・ディフェンス」。ポーンでビショップに「引くの？ 取るの？」って聞いてるんだね。', 6: '白はビショップを斜め後ろに下げて、ナイトへの圧力をキープ。', 8: '中央のポーンを取られても、あとでルークで取り返せる。だから先にキャスリングしておくピョン！', 11: 'ポーンでビショップを追い払って、クイーン側に陣地を広げる手だよ。', 14: 'このポーンは、ビショップの逃げ道を作りつつ、隣のポーンで中央を広げる準備。一手で二役だね！', 15: '出た、「マーシャル・アタック」！ 黒はポーンを1つ捨てて、駒の勢いで攻めかかるんだ。' },
      sicilian: { 1: '左寄りのポーンを2マス進めて、中央を横から押さえる。左右非対称の戦いのはじまり！', 4: '白はクイーンの前のポーンを進めて交換をせまる。これが「オープン・シシリアン」だね。', 5: '黒はポーンを交換。半分開いた列ができて、あとで反撃に使えるようになるんだ。', 7: 'ナイトで白の中央のポーンをねらう。白は次にナイトで守るよ。', 9: '「ナイドルフ・バリエーション」！ この端寄りのポーンで、白のナイトやビショップが入ってくるマスをふさぐピョン。', 12: '白はキング側のポーンを2マス進めて、中央へ突撃する準備。かなり攻撃的だね！', 16: '白はクイーン側にキャスリング。お互いが反対側のキングを攻める、はげしい戦いになるよ。' },
      french: { 1: 'キングの前のポーンを1マスだけ。次に隣のポーンを2マス進めるための支えなんだ。', 3: 'さあ、隣のポーンを2マス！ 白の中央のポーンにすぐ挑む。', 6: '白は中央のポーンを押して、黒のナイトを追い払う。これで中央が閉じたね。', 8: 'キング側のポーンも2マス進めて、押し出したポーンを後ろから支えるピョン。', 9: '黒は左寄りのポーンを2マス進めて、白のポーンの鎖の根元をつつく！ フレンチの基本の反撃だよ。' },
      caro: { 1: '隣のポーンを1マス進めて、次の2マス前進を支える準備！', 4: '白は中央のポーンを押す。「アドバンス・バリエーション」っていうんだ。', 5: 'ビショップをポーンの鎖の外へ出せる。これがカロ・カンの大きな長所だね！', 6: '端のポーンを2マス進めて、ビショップを追い回す積極的な手。黒もポーンで止めるピョン。', 9: 'ビショップどうしを交換して、白の攻めの駒を1つ減らす。' },
      scandi: { 2: 'まずは白がポーンを取る。', 3: '黒はクイーンで取り返す！ こんなに早くクイーンが出るのは、この序盤ならではだね。', 4: '白はナイトでクイーンを攻撃。駒を出しながら手も稼げる、一石二鳥ピョン。', 5: 'クイーンは斜めの端のマスへ。ここなら安全だし、あとで白のナイトを縛ることもねらえるんだ。', 9: 'ビショップを出して、白のナイトをピン！ ナイトが動くと、後ろのクイーンが取られちゃう形だよ。' },
      qgd: { 2: '隣のポーンを差し出す「クイーンズ・ギャンビット」！ 黒の中央のポーンをどかすのがねらい。', 3: '黒は取らずに、キングの前のポーンを1マス進めて中央を守る。これが「辞退」なんだ。', 6: '白は先にポーンを交換する。「エクスチェンジ・バリエーション」って呼ばれる形だね。', 7: 'キングの前のポーンで取り返すと、クイーン側のビショップの通り道が開くピョン！', 8: '白のビショップが、黒のナイトをピン。ナイトの後ろにはクイーンがいるよ。' },
      slav: { 3: '反対隣のポーンで中央を守る！ ビショップの通り道をふさがないのが、スラブのいいところ。', 7: 'キングの前のポーンも加えた形は「セミ・スラブ」。とっても堅い陣形なんだ。', 8: '白のビショップが黒のナイトをピンして、圧力をかけるピョン。' },
      kid: { 5: 'ビショップを長い対角線に置く「フィアンケット」。盤の向こうまでにらみがきくピョン。', 6: '白はキングの前のポーンも2マス進めて、大きな中央を作る。黒はいったんそれを許すんだ。', 11: 'ここで黒はキングの前のポーンを2マス！ 中央に反撃開始だね。', 14: '白はポーンをもう1マス押して中央を閉じ、クイーン側で攻める作戦。', 15: '黒のナイトはキング側へ回る。あとでポーンを押し上げて攻めるための準備なんだ。', 16: '白はクイーン側のポーンを2マス進めて突撃！ 「バヨネット・アタック」っていうよ。' },
      nimzo: { 5: 'ビショップで白のナイトをピン！ 白がキングの前のポーンを進めるのを防いでる。', 6: '白はキングの前のポーンを1マスだけ進めて、落ち着いて駒を出す。「ルービンシュタイン・バリエーション」だよ。', 11: '黒はビショップとナイトを交換して、白のポーンを縦に2つ重ねさせる。これが「ダブルポーン」なんだ。' },
      london: { 2: 'ロンドンの目印！ ポーンで道をふさぐ前に、ビショップを外へ出しておく。', 4: 'キングの前のポーンを1マス進めて、ポーンの形を固める。ビショップは先に出したから、もう道はふさがらないピョン。', 6: 'クイーン側のポーンも1マス進めて、中央のポーンを支える。崩れにくい形だね！', 8: 'ナイトはポーンの後ろから出す。ポーンのじゃまをしないための置き場所なんだ。' },
      english: { 0: 'クイーン側のポーンを2マス進めて、中央を横から押さえる。ここからスタート！', 4: '白は中央のポーンも2つ加えて、中央を大きく取る。黒はキングズ・インディアンの形で迎え撃つピョン。', 9: 'お互いキャスリングが済んで、ここからは中盤の作戦を考える段階だよ。' },
    },
  };
  const CH_PN = { p: 'ポーン', n: 'ナイト', b: 'ビショップ', r: 'ルーク', q: 'クイーン', k: 'キング' }, CH_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const chSq = s => (+s[1] - 1) * 8 + s.charCodeAt(0) - 97, chW = ch => ch === ch.toUpperCase();
  function chBoard(fen) { const b = Array(64).fill(''); String(fen).split(' ')[0].split('/').forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - ri) * 8 + f] = ch; f++; } } }); return b; }
  function chAtt(b, q, white, legal) {   // the cheapest piece of that side attacking square q ('' when none; legal: only one that may really take — not pinned to its king, 2026-11-22)
    let best = ''; const r = q >> 3, f = q & 7, mine = ch => ch && chW(ch) === white;
    const free = s => { if (!legal) return true; const nb = b.slice(); nb[q] = nb[s]; nb[s] = ''; const kq = nb.findIndex(ch => ch && chW(ch) === white && ch.toLowerCase() === 'k'); return kq < 0 || !chAtt(nb, kq, !white); };
    const take = (ch, s) => { if ((!best || CH_VAL[ch.toLowerCase()] < CH_VAL[best.toLowerCase()]) && free(s)) best = ch; };
    const at = (rr, ff) => rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? b[rr * 8 + ff] : null, ix = (rr, ff) => rr * 8 + ff;
    for (const df of [-1, 1]) { const rr = white ? r - 1 : r + 1, ch = at(rr, f + df); if (mine(ch) && ch.toLowerCase() === 'p') take(ch, ix(rr, f + df)); }
    for (const [dr, df] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const ch = at(r + dr, f + df); if (mine(ch) && ch.toLowerCase() === 'n') take(ch, ix(r + dr, f + df)); }
    for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { if (!dr && !df) continue; const ch = at(r + dr, f + df); if (mine(ch) && ch.toLowerCase() === 'k') take(ch, ix(r + dr, f + df));
      const kinds = dr && df ? 'bq' : 'rq'; let rr = r + dr, ff = f + df; while (at(rr, ff) === '') { rr += dr; ff += df; } const c2 = at(rr, ff); if (mine(c2) && kinds.includes(c2.toLowerCase())) take(c2, ix(rr, ff)); }
    return best;
  }
  function chMove(b, u) {   // the board after a UCI move (castling moves the rook, en passant takes the pawn)
    const n = b.slice(), a = chSq(u), z = chSq(u.slice(2, 4)), pc = n[a], lo = pc.toLowerCase();
    if (lo === 'p' && (a & 7) !== (z & 7) && !n[z]) n[(a & ~7) | (z & 7)] = '';
    n[z] = u[4] ? (chW(pc) ? u[4].toUpperCase() : u[4]) : pc; n[a] = '';
    if (lo === 'k' && Math.abs((a & 7) - (z & 7)) === 2) { const rf = (z & 7) === 6 ? 7 : 0, rt = (z & 7) === 6 ? 5 : 3; n[(a & ~7) | rt] = n[(a & ~7) | rf]; n[(a & ~7) | rf] = ''; }
    return n;
  }
  function chFacts(fen, u) {   // what a move does, for the guide's words
    const b = chBoard(fen), white = String(fen).split(' ')[1] !== 'b', a = chSq(u), z = chSq(u.slice(2, 4)), pc = b[a] || '', lo = pc.toLowerCase();
    const home = white ? 0 : 7, cap = b[z] ? b[z].toLowerCase() : lo === 'p' && (a & 7) !== (z & 7) ? 'p' : '';
    const mat = w => b.reduce((s, ch) => s + (ch && chW(ch) === w && ch.toLowerCase() !== 'k' ? CH_VAL[ch.toLowerCase()] : 0), 0);
    const nb = chMove(b, u), att = lo === 'k' ? '' : chAtt(nb, z, !white, true), def = chAtt(nb, z, white, true);
    const F = { pc: lo, cap, castle: lo === 'k' && Math.abs((a & 7) - (z & 7)) === 2, king: lo === 'k', behind: mat(white) < mat(!white),
      dev: (lo === 'n' || lo === 'b') && (a >> 3) === home, centre: lo === 'p' && [3, 4].includes(a & 7), side: lo === 'p' && [2, 5].includes(a & 7), flank: lo === 'p' && [0, 1, 6, 7].includes(a & 7),
      move: +String(fen).split(' ')[5] || 1, two: lo === 'p' && Math.abs((a >> 3) - (z >> 3)) === 2 };
    F.fian = F.flank && !F.two && [1, 6].includes(a & 7) && (a >> 3) === (white ? 1 : 6);
    if (att && (!def || CH_VAL[att.toLowerCase()] < CH_VAL[lo]) && !(cap && CH_VAL[cap] >= CH_VAL[lo])) F.hang = CH_PN[att.toLowerCase()];
    if (lo === 'p') { for (const df of [-1, 1]) { const r2 = (z >> 3) + (white ? 1 : -1), f2 = (z & 7) + df; if (r2 >= 0 && r2 < 8 && f2 >= 0 && f2 < 8) { const ch = nb[r2 * 8 + f2]; if (ch && chW(ch) !== white && 'nbrq'.includes(ch.toLowerCase())) F.chase = CH_PN[ch.toLowerCase()]; } } }
    if ('bqr'.includes(lo)) {   // a pin: an enemy piece on the line, a bigger one behind it
      const dirs = lo === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : lo === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, df] of dirs) { let r = (z >> 3) + dr, f = (z & 7) + df; const seen = []; while (r >= 0 && r < 8 && f >= 0 && f < 8 && seen.length < 2) { const ch = nb[r * 8 + f]; if (ch) { if (chW(ch) === white) break; seen.push(ch.toLowerCase()); } r += dr; f += df; }
        if (seen.length === 2 && CH_VAL[seen[1]] > CH_VAL[seen[0]] && seen[0] !== 'p') { F.pin = [CH_PN[seen[0]], CH_PN[seen[1]]]; break; } }
    }
    if (!F.pin && lo !== 'p' && lo !== 'k') for (let q = 0; q < 64; q++) { const ch = nb[q]; if (!ch || chW(ch) === white || ch.toLowerCase() === 'k') continue; const bb = nb.slice(); bb[z] = '';
      if (chAtt(nb, q, white) && !chAtt(bb, q, white) && (!chAtt(nb, q, !white) || CH_VAL[ch.toLowerCase()] > CH_VAL[lo])) { F.aim = CH_PN[ch.toLowerCase()]; break; } }
    return F;
  }
  /* (2026-11-22 lesson loop) the chess openings in ナイトン's voice, Japanese, reworked: every move of the line gets a word from the
     board (chStepNotesJa — the hand-written notes stay, the other moves are described from chFacts), and each opening takes the
     praise / soft words / push / leads in its own order (chOpVoice). Lines are picked so that no sentence and no 10-character run
     comes back in three bubbles of the same opening, and two bubbles in a row do not end the same way (chVPick). */
  const chKind = (F, u, white) => { const a = chSq(u), z = chSq(u.slice(2, 4)), back = F.pc !== 'p' && !F.dev && (white ? (z >> 3) < (a >> 3) : (z >> 3) > (a >> 3));
    return F.castle ? 'castle' : F.cap && F.behind ? 'recap' : F.cap ? 'cap' : F.pin ? 'pin' : F.chase ? 'chase' : F.dev ? 'dev' : F.centre ? (F.two ? 'centre2' : 'centre1') : F.side ? 'side'
      : F.aim ? 'aim' : back ? 'back' : F.pc === 'q' ? 'queen' : F.pc === 'r' ? 'rook' : F.fian ? 'fian' : F.flank && F.two ? 'flank2' : F.flank ? 'flank' : F.king ? 'king' : 'other'; };
  const chF = (s, v) => String(s).replace(/\{([A-Z])\}/g, (_, k) => v[k] != null ? v[k] : '');
  const CH_STEP = {   // one word on a move of the line ({S} side, {P} piece, {C} taken, {T} chased / aimed at, {A} pinned, {B} behind it)
    castle: ['{S}はキャスリング。キングが端へ移って、ひと安心ピョン！', 'ここで{S}もキャスリング。ルークが外へ出やすくなったね。', '{S}のキングが、ルークの陰に引っこんだ。守りが固まったぞ！', 'キャスリングで、{S}のキングは安全地帯へ。', '{S}は早めにキングを囲って、戦いの準備を整える。'],
    recap: ['{S}は{C}を取り返して、駒の数をそろえる。', 'すかさず取り返し！ これで{S}も損はなしピョン。', '{S}も{P}で取り返す。交換が終わって、形が変わったね。', '取られたら取り返す。{S}は{P}で応じた！', '{S}は落ち着いて{C}を取り返す手。'],
    cap: ['{S}が{P}で{C}を取る！ 取り合いのはじまりだ。', '{S}は{C}を取って、相手に取り返しをせまる。', 'ここで{S}が{C}を取る。中央の形が動き出すピョン！', '{S}の{P}が{C}を取った。さあ、どう取り返す？'],
    pin: ['{S}の{P}が、相手の{A}をピン！ 後ろに{B}がいるから動けないピョン。', '{P}で{A}を縛る手。{A}が動くと、{B}が丸見えになるね。', '{A}の後ろには{B}。{S}はそこを{P}でにらむ！', '{S}は{P}で{A}を釘づけにする。後ろの{B}が困ってるピョン。'],
    chase: ['{S}はポーンを突いて、相手の{T}を追い払う！', 'ポーンが{T}をつつく。{T}はどこへ逃げるかな？', '{S}のポーンが前へ。{T}はその場にいられないね。', '{S}はポーンで{T}に「どいて」とせまるピョン。'],
    dev: ['{S}は{P}を外へ。まずは駒を出すのが序盤の基本！', '{P}の出番！ {S}は陣地の外へ駒を1つ出した。', '{S}の{P}が、スタートの位置から動き出すピョン。', 'ここで{S}は{P}を出す。駒がそろうほど戦いやすくなるね。', '{S}は{P}を前線へ。次の駒もすぐ続けたい！', '{S}の{P}が、働きやすいマスへ飛び出した。', '{P}を出して、{S}は陣形づくりを進める。', '眠っていた{P}が目をさます。{S}の駒組みは順調ピョン！'],
    centre2: ['{S}は中央のポーンを2マス！ 盤のまん中に旗を立てる手。', 'まずは{S}が、中央のポーンを大きく前へ。', '{S}のポーンがど真ん中へ！ 駒の通り道も開くピョン。', '{S}も中央のポーンを2マス進めて、まん中を取り合う。', '{S}は中央へポーンを2歩。まん中の主導権を取りにいく！', '中央のポーンが大きく前進。{S}の駒たちの道が広がったね。'],
    centre1: ['{S}は中央のポーンを1マス。控えめだけど、しっかりした支えになる。', '中央のポーンをそっと1マス。{S}は守りを固めるね。', '{S}は中央のポーンを1つだけ進めて、形を整える。'],
    side: ['{S}は中央の隣のポーンで、まん中を横からにらむ。', '横のポーンを進めて、{S}は中央に手を伸ばす！', '{S}は脇のポーンで、中央の争いに加わるピョン。', '{S}のポーンが、中央を斜め横から支える。'],
    aim: ['{S}の{P}が、相手の{T}をねらう位置へ！', '{P}を動かして{T}に圧力。相手は守りに手を使うね。', '{S}は{P}で{T}をにらむピョン。'],
    back: ['{S}の{P}がいったん下がる。ねらわれる前に、安全なマスへ。', '{P}は一歩引いて、形を整え直す手。', '{S}は{P}を引いて、次の出番にそなえる。'],
    queen: ['{S}のクイーンが動く。強い駒だけど、追われないように気をつけたいね。', 'クイーンが出てきた！ {S}は大駒で中央をにらむ。', '{S}はクイーンの位置を変えて、ほかの駒の通り道を作る。'],
    rook: ['{S}のルークが、これから開きそうな列へ移る。', 'ルークを動かして、働く場所を先に決めておくピョン。', '{S}はルークをまん中寄りへ。'],
    fian: ['{S}は端寄りのポーンを1マス。ビショップの通り道を作る準備！', 'ポーンを1つ上げて、{S}はビショップを長い斜めに置く準備だね。'],
    flank2: ['{S}は端のポーンを2マス！ 陣地を広げて攻めかかる。', '端のポーンが大きく前へ。{S}は外側から仕掛けるピョン。'],
    flank: ['{S}は端のポーンを動かして、相手の駒が来るマスを先にふさぐ。', '端のポーンで、{S}はこっそり陣地を広げるピョン。', '{S}は端のポーンを1マス。小さいけど大事な準備だね。'],
    king: ['{S}のキングが一歩動く。', 'キングを少し動かして、{S}は守りの形を整える。'],
    other: ['{S}は{P}を動かして、形を整える。', '{S}の{P}が位置を変える。次の作戦への準備だね。', '{P}を動かして、{S}は次の一手にそなえるピョン。'],
  };
  const CH_WHY = {   // why the most played move is played (problems' praise)
    castle: ['キングを端へ移すと、守りが固まってルークも働き出すんだ。', 'キャスリングで王さまは安全地帯へ。これで安心して戦えるね。', 'キングを真ん中に残さないのが、序盤のいちばん大事な約束。', 'この一手で、キングの安全とルークの出番が両方そろうピョン！'],
    recap: ['取られた{C}をすぐ取り返して、駒の数をそろえたね。', 'ここで取り返さないと、駒損のまま進んじゃうところだった。', '取られたら取り返す。基本中の基本を、きっちり守れたピョン！'],
    cap: ['相手の{C}を取って、交換をしかける手なんだ。', 'ここは{C}を取るのがこの形の決まりごと。中央の形がすっきりするね。', '{C}を取って、相手に取り返しの手を使わせるピョン！'],
    pin: ['相手の{A}をピン！ {A}が動くと、後ろの{B}が取られちゃう。', '{A}の後ろに{B}がいるのを見のがさなかったね。動けない駒ができたピョン！', 'ピンをかけて、相手の{A}を動けなくする手なんだ。'],
    chase: ['ポーンで{T}を追い払うと、相手は逃げるのに1手使うことになる。', '{T}をつついて、居心地のいいマスから追い出す手だね。', 'ポーンで{T}を追えば、こっちは陣地を広げながら手も稼げるピョン！'],
    dev: ['まだ動いていない{P}を外へ出す手。序盤は駒を早く出したもの勝ちピョン！', '{P}が出ると、陣地の駒がひとつ働き出すんだ。', '眠っていた{P}を起こして、戦いに参加させる手だね。', '{P}を外へ出して、キャスリングの準備も進めたね。', '{P}が働き出して、陣地がぐっとにぎやかになったピョン！', '駒を出す順番、ばっちり覚えてるね。{P}の位置もいい感じ！'],
    centre2: ['中央のポーンを大きく進めて、盤のまん中を押さえる手。駒がぐんと動きやすくなるピョン！', 'まん中のマスを取ると、ナイトもビショップも通り道が広がるんだ。'],
    centre1: ['中央のポーンを1マス進めて、まん中をしっかり支える手だね。', 'ポーンで中央の支えを作っておくと、あとで崩れにくいんだ。'],
    side: ['中央の隣のポーンで、まん中のマスを横から支える手。', '脇のポーンで中央に圧力をかける。真正面だけが中央の取り方じゃないんだ。'],
    aim: ['{P}で相手の{T}をねらう手。相手は守りに1手使わなきゃいけないピョン。', '{T}に圧力をかけて、相手の手を縛る一手なんだ。'],
    back: ['{P}をいったん引いて、ねらわれにくいマスで次の出番を待つ手だね。', '引くのも大事な一手。{P}を安全な場所に置き直したんだ。'],
    queen: ['クイーンを動かして、ほかの駒の通り道を作る手なんだ。', 'クイーンを働きやすいマスへ。ここなら追われにくいピョン。'],
    rook: ['ルークを、これから開く列に先回りさせる手だね。', 'ルークの置き場所を決めて、中盤の戦いにそなえる手なんだ。'],
    fian: ['端寄りのポーンを上げて、ビショップを長い斜めに置く準備をする手なんだ。', 'ビショップの通り道を作る下ごしらえ。あとで斜めのにらみがきくピョン！'],
    flank2: ['端のポーンを2マス進めて、相手の陣地に攻めかかる手。', '外側から仕掛けて、相手の駒を押し返すねらいだね。'],
    flank: ['端のポーンで、相手の駒が入ってくるマスを先にふさいでおく手なんだ。', '小さなポーンの一歩で、相手の作戦を先回りしてつぶすピョン！'],
    king: ['キングの位置を整えて、守りを固める手なんだ。'],
    other: ['この形で、強い人たちが本筋と考えている手だピョン。', 'この場面でいちばん多く選ばれている、手堅い一手なんだ。', '定跡の流れにぴったり乗る一手。形を覚えておくと、実戦で迷わないね。', '手順の意味がつかめてきたね。この手で形がきれいに整うんだ。'],
  };
  const CH_SHORT = { castle: ['キングを安全にできる', 'キングを囲ってルークも出せる'], recap: ['駒の数をすぐそろえられる', '取られた駒を取り返せる'], cap: ['相手の駒を取って交換に持ちこめる', '駒を取って形をはっきりさせられる'],
    pin: ['相手の駒をピンで動けなくできる', 'ピンで相手の駒を縛れる'], chase: ['相手の駒を追い払える', 'ポーンで相手の駒を追い返せる'], dev: ['まだ動いていない駒を出せる', '新しい駒を戦いに加えられる'],
    centre2: ['盤のまん中を押さえられる', '中央を大きく取れる'], centre1: ['中央をしっかり支えられる', 'まん中の支えを作れる'], side: ['まん中を横から支えられる', '中央に横から圧力をかけられる'],
    aim: ['相手の駒をねらえる', '相手の駒に圧力をかけられる'], back: ['駒を安全な場所に戻せる', 'ねらわれる前に駒を逃がせる'], queen: ['クイーンが働きやすくなる'], rook: ['ルークの働く場所を先に作れる'],
    fian: ['ビショップの通り道を作れる'], flank2: ['外側から仕掛けられる'], flank: ['相手の駒の入り口をふさげる'], king: ['守りの形を整えられる'], other: ['定跡どおりの形になる', 'いちばん手堅い形になる'] };
  const CH_HINT = {
    castle: ['キングはまだ真ん中にいるね。安全な場所へ逃がす手が光ってるピョン。', 'キングとルークの間、もう空いてないかな？', '王さまの守り、そろそろ考えたいところだね。光ってる手に注目！'],
    recap: ['駒の数を数えてみて。いま、どっちが得をしてる？', 'さっき取られた駒、そのままでいいのかな？ 光ってる手がヒント！', '取られた分を取り返せる駒がいるピョン。'],
    cap: ['光ってる手を見てね。取れる相手の駒がありそうだピョン！', '相手の駒に、手を伸ばせる駒はいないかな？', '取り合いのチャンス。光ってるところに注目だね！'],
    pin: ['相手の{A}の後ろに、何がいるか見てみて！', '一直線に並んだ相手の駒、見つかるかな？ 光ってる手がヒント！'],
    chase: ['相手の{T}のすぐ近くまでポーンを進めたら、どうなる？', '居すわっている相手の{T}、追い出せないかな？ 光ってる手に注目ピョン。'],
    dev: ['まだ一度も動いていない駒を探してみて。光ってるところがヒント！', '序盤の基本は「駒を出す」。光ってる駒が、出番を待ってるピョン！', '陣地の奥で眠ってる駒はいないかな？', 'スタートの位置から動いていない駒、まだあるよね？ 光ってる手を見てみて！', '働いていない駒を、戦いに呼んであげよう。', 'ナイトやビショップで、まだ家にいるのはどれかな？'],
    centre2: ['盤のまん中の4マスを、だれが押さえてるか見てみよう。光ってる手がヒント！', 'まん中のマスに、ポーンを大きく進められないかな？'],
    centre1: ['中央のポーンを、そっと支えられないかな？ 光ってる手がヒント！', 'まん中の形、もう少し固めておきたいね。'],
    side: ['中央のマスを、横からにらめるポーンはいないかな？', 'まん中は真正面からだけじゃなく、横からも押さえられるピョン。光ってる手を見てね。'],
    aim: ['相手の駒で、守りがうすいのはどれかな？ 光ってる手がヒント！', 'どの駒なら、相手の駒をねらえるかな？'],
    back: ['ねらわれそうな駒はいないかな？ 一度引くのも手だピョン。', '光ってる駒、いまの場所は安全かな？'],
    other: ['光ってる手が、強い人がいちばん選んだ手。指したあとの形を想像してみて！', '光ってる手を指したら、盤がどう変わるか考えてみよう！', 'ヒントは光ってる手。どんな役目の手か、わかるかな？', '盤全体をながめて、いちばん自然な一手を探そう！', '光ってるところに注目ピョン。その手の役目を想像してみて。', '駒を出す・中央・キングの安全。どれに当てはまる手か考えてみよう！'],
  };
  const CH_OPV = {
    ask: ['{s}の番！ 強い人がいちばん指した手はどれかな？', '『{n}』のこの場面。{s}ならどう指す？', 'さあ{s}の一手。定跡どおりに指せるかな？', 'ここで{s}がいちばんよく選ぶ手、わかるかな？', '{s}の番。手順を思い出して、本筋の手を指してみて！', '{s}の手番だね。きみならどこへ動かす？', 'この形、{s}の定番の一手は何かな？', '{s}になったつもりで考えてみよう。次の一手は？'],
    pct: ['強い人の対局の{a}%で、この手が選ばれている。', '実戦では{a}%がこの手。いちばん人気！', '強い人の{a}%が指した、定跡の本筋の手。', 'この場面では{a}%の人がこれを選ぶ。覚えておこう！', 'たくさんの対局のうち{a}%で、この手が指されている。', '{a}%の人がこの手を選んでいる、王道の一手なんだ。'],
    cheer: ['いいね！', 'さすが！', 'お見事！', 'ナイス！', 'その調子！', 'ばっちりピョン！', 'すごい、正解！', 'いい手を選んだね！', 'よく見つけたね！', '上手！', '完璧ピョン！', 'やったね！'],
    push: ['次もこの調子で行こう！', 'どんどん進もう！', 'まだまだいけるピョン！', '次の問題も楽しみだね！', 'その勢いで続けよう！', '次もいけるはず！'],
    soft: ['おしい！', '大丈夫、', 'ドンマイ！', 'いい線いってたね。', 'ここはよくある迷いどころだね。', '気にしない、気にしない！', 'あと一歩！', '今度こそいけるピョン！', 'これで覚えちゃおう！', 'みんな一度は迷うところ。'],
    lead: ['正解は{m}。', 'ここは{m}が本筋ピョン。', '{m}が定跡の手なんだ。', '光っていたのは{m}。', '{m}を指したかったところ！', 'ここでは{m}がいちばん人気。'],
  };
  const CH_NG = {   // what yours gives up ({b} / {a}: % of games, {w}: what the right move does)
    near: ['{x}も{m}と同じくらい指される手（{b}%）。{m}のほうがわずかに多いから、こっちを正解にしているピョン。', '{x}も実戦でよく見る手で、{b}%。{m}なら{w}から、ほんの少し人気が上なんだ。', '{x}も本筋のひとつ（{b}%）。{m}なら{w}から、今回はこっちを覚えよう！', '{x}もほぼ同じ数だけ指される（{b}%）。{m}なら{w}し、わずかに多いから正解にしたピョン。'],
    half: ['{x}もよく指される手（{b}%）。でも{m}なら{a}%で、こっちがいちばんの本筋なんだ。', '{x}は{b}%の人が選ぶ手。{m}なら{a}%で、{w}。', '{x}も悪くない手で、{b}%。ただ{m}なら{w}から、選ぶ人も多い（{a}%）。', '{x}を選ぶ人も{b}%いる。それでも{m}なら{w}から、{a}%の人がこっちを選ぶんだ。'],
    low: ['{x}は実戦で{b}%だけ。{m}なら{a}%の人が選んでいて、{w}。', '{x}を選ぶ人は{b}%しかいないんだ。{m}なら{w}から、こっちを覚えよう。', '{x}は少数派（{b}%）。{m}なら{a}%の人が選ぶし、{w}。', '{x}は{b}%と少なめ。{m}なら{w}から、強い人の多く（{a}%）がこっちを選ぶピョン。'],
    hang: ['{x}だと、その{P}は相手の{T}に取られる位置。取り合いで損をしやすいんだ。', '{x}では、動いた{P}を相手の{T}がねらえる。守りが足りない形なんだ。'],   // (2026-11-24: said only when the engine shows the loss — tools/lesson-verify.js chessOpen)
    recap: ['{x}だと取り返しそびれて、駒損のままになっちゃう。', '{x}では取られた駒を取り返せず、損をしたままなんだ。'],
    king: ['{x}でキングが動くと、もうキャスリングできなくなっちゃう。', '{x}のようにキングを動かすと、キャスリングの権利がなくなっちゃう。'],
    late: ['{x}だとキャスリングが遅れて、キングが真ん中に残っちゃう。', '{x}ではキングが真ん中のまま。中央が開くとねらわれやすいんだ。'],
    queen: ['{x}のように序盤でクイーンを動かすと、相手の駒に追い回されて手損しやすいんだ。', '{x}は早すぎるクイーンの出動。相手が駒を出しながら追いかけてくるから、手損しやすいピョン。'],
    rook: ['ルークは序盤ではまだ働きにくい駒。先にナイトやビショップを出そう！', '{x}だとルークを動かすけど、まだ働く場所が少ないんだ。'],
    again: ['{x}だと同じ駒をもう一度動かすことになる。まだ出ていない駒を先に出そう！', '{x}だと同じ駒で2手使っちゃう。ほかの駒が眠ったままになるね。'],
    pawn: ['{x}だとポーンの手で1手使っちゃう。まだ出ていない駒を出すほうが先ピョン。', '{x}だとポーンの手になる。駒を出すほうが、いまは急ぎなんだ。'],
    flank: ['{x}の端のポーンでは、中央の争いに役立たないんだ。', '{x}だと端っこの手になる。いまは中央のほうが大事なところだね。'],
    few: ['{x}は、ここで多く指される{k}つの手に入っていないんだ。{m}なら{w}から、こっちを選びたい！', '{x}は、強い人がよく選ぶ{k}つの手のどれでもない。{m}なら{w}。'],   // (2026-11-24: the record keeps the moves of 3% or more, five at most — with five kept, a move left out may still be played a little more often than "hardly")
    rare: ['{x}は強い人の対局ではほとんど指されない手。{m}なら{w}から、こっちを選びたい！', '{x}を選ぶ人はめったにいないんだ。{m}なら{w}。'],
  };
  const chEnd = sn => { const b = sn.replace(/[。！？!?]+$/, '').replace(/[）)」]+$/, ''); for (const e of ['なんだ', 'んだ', 'だよ', 'だね', 'よね', 'かな', 'よう', 'ろう', 'よ', 'ね']) if (b.endsWith(e)) return e === 'だよ' ? 'よ' : e === 'なんだ' ? 'んだ' : e === 'だね' ? 'ね' : e; return /[！？]$/.test(sn) ? sn.slice(-1) : 'x'; };
  const chSents = s => (String(s).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').match(/[^。！？\n]+[。！？]+|[^。！？\n]+$/gm) || []).map(x => x.trim()).filter(Boolean);
  function chOpVoice(id, O0) {   // one opening's voice: its own order of praise / soft words / push / leads, and what it has said so far (O0: another word list — the lessons' CH_LSV)
    const seed = shSeed((O0 ? 'chl' : 'ch') + id), P = (k, n) => shPerm(seed ^ k, n), O = O0 || CH_OPV, pc = P(0x11, O.cheer.length), ps = P(0x9e37, O.soft.length), pp = P(0x51ed, O.push.length), pl = P(0x2b7f, O.lead.length), pa = P(0x6c1d, O.ask.length), pt = P(0x3a5, O.pct.length);
    const gram = new Map(), sent = new Map(); let last = '';
    const norm = t => String(t).replace(/\{[mx]\}/g, '♘e2–e4').replace(/<[^>]+>/g, '').replace(/[\s、。！？!?「」（）()・…〜♪]/g, '');
    const grams = t => { const x = norm(t), g = new Set(); for (let k = 0; k + 10 <= x.length; k++) g.add(x.slice(k, k + 10)); return g; };
    const keyS = t => chSents(String(t).replace(/\{[mx]\}/g, '♘e2–e4')).map(x => x.replace(/^[^、！]{1,5}(、|！ ?)/, '').trim()).filter(x => x.length >= 8);
    const V = { seed, cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]], lead: i => O.lead[pl[i % pl.length]], ask: i => O.ask[pa[i % pa.length]], pct: i => O.pct[pt[i % pt.length]],
      bad(t, prev) {   // how much a line would repeat (0 = fresh)
        let n = 0; grams(t).forEach(g => { if ((gram.get(g) || 0) >= 2) n += 1; }); keyS(t).forEach(s => { if (sent.get(s)) n += 20; });
        const E = chSents(t).map(chEnd), p0 = prev === undefined ? last : prev; E.forEach((e, k) => { const pe = k ? E[k - 1] : p0; if (e !== 'x' && e !== '！' && e !== '？' && e === pe) n += 10; });
        return n; },
      pick(list, start, prev) { let best = null, bn = 1e9; for (let q = 0; q < list.length; q++) { const t = list[(start + q) % list.length], n = V.bad(t, prev); if (n < bn) { bn = n; best = t; } if (!n) break; } return best; },
      add(t, quiet) { grams(t).forEach(g => gram.set(g, (gram.get(g) || 0) + 1)); keyS(t).forEach(s => sent.set(s, 1)); const E = chSents(t).map(chEnd); if (E.length && !quiet) last = E[E.length - 1]; },
      after(t) { const E = chSents(t).map(chEnd); if (E.length) last = E[E.length - 1]; },
      endOf: t => { const E = chSents(t).map(chEnd); return E.length ? E[E.length - 1] : ''; } };
    return V;
  }
  const chJoin = (...a) => a.filter(Boolean).reduce((s, t) => !s ? t : s + (/[！？]$/.test(s) ? ' ' : /、$/.test(s) ? '' : '') + t, '');
  function chFen(b, white, mv) { const rows = []; for (let r = 7; r >= 0; r--) { let s = '', e = 0; for (let f = 0; f < 8; f++) { const ch = b[r * 8 + f]; if (ch) { if (e) { s += e; e = 0; } s += ch; } else e++; } if (e) s += e; rows.push(s); } return rows.join('/') + ' ' + (white ? 'w' : 'b') + ' - - 0 ' + mv; }
  const chVars = (F, white) => ({ S: white ? '白' : '黒', P: CH_PN[F.pc] || '駒', C: CH_PN[F.cap] || '駒', T: F.chase || F.aim || '駒', A: F.pin ? F.pin[0] : '駒', B: F.pin ? F.pin[1] : '駒' });
  function chStepNotesJa(steps, notes, V) {   // a word on every move of the line (the hand-written notes kept, the rest from the board)
    const out = {}, own0 = i => { const o = notes[String(i)]; return o && (typeof o === 'string' ? o : o.ja); }; steps.forEach((u, i) => { if (own0(i)) V.add(own0(i), true); }); let b = chBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    steps.forEach((u, i) => { const white = i % 2 === 0, fen = chFen(b, white, (i >> 1) + 1), own = notes[String(i)], ja = own && (typeof own === 'string' ? own : own.ja);
      if (ja) V.after(ja); else { try { const F = chFacts(fen, u), kd = chKind(F, u, white), vv = chVars(F, white), t = V.pick((CH_STEP[kd] || CH_STEP.other).map(x => chF(x, vv)), (V.seed + i * 3) % 7); out[String(i)] = { ja: t }; V.add(t); } catch (e) {} }
      b = chMove(b, u); });
    return out;
  }
  function chOpJa(o, name, V, i) {   // V: the opening's voice (chOpVoice), i: the problem's number
    const P = o.P, C = P.cand || [], N = P.n || C.reduce((s, x) => s + x[1], 0) || 1, A = o.ans, white = String(o.pos).split(' ')[1] !== 'b', side = white ? '白' : '黒';
    const pc = c => Math.max(1, Math.round(c / N * 100)), cnt = new Map(C), FA = chFacts(o.pos, A), kd = chKind(FA, A, white), vv = chVars(FA, white), j = i + V.seed % 5;
    const nm = /[a-h][1-8]/.test(name) ? '' : name;
    const asks = [0, 1, 2, 3, 4, 5, 6, 7].map(q => V.ask(i + q)).filter(t => nm || !/\{n\}/.test(t)).map(t => t.replace('{n}', nm).replace('{s}', side));
    const ask = V.pick(asks, 0); V.add(ask);
    const hk = (CH_HINT[kd] || []).map(x => chF(x, vv)), hintTx = V.pick([...hk.map((_, q) => hk[(j + q) % hk.length]), ...CH_HINT.other], 0); V.add(hintTx);
    const shorts = CH_SHORT[kd] || CH_SHORT.other;
    // the praise: a cheer, why (in words the line's notes have not used), the share of games, now and then a push on
    const ch = V.cheer(i), wk = (CH_WHY[kd] || []).map(x => chF(x, vv)), why = V.pick([...wk.map((_, q) => wk[(j + q) % wk.length]), ...CH_WHY.other], 0, V.endOf(ch)), pct = V.pick([0, 1, 2, 3, 4, 5].map(q => V.pct(i + q).replace('{a}', pc(cnt.get(A) || 0))), 0, V.endOf(why));
    const goodTx = chJoin(ch, why, pct, i % 2 ? V.push(i) : ''); V.add(goodTx);
    const good = u => { if (u && u !== A && cnt.has(u)) return chJoin(V.cheer(i + 1), `{x}も人気の手！ 実戦では${pc(cnt.get(u))}%、いちばん多い{m}も${pc(cnt.get(A))}%で、どっちも本筋なんだ。`); return goodTx; };
    const ngOf = u0 => {
      let u = u0; if (!u || u === A) u = (C.find(x => x[0] !== A) || [])[0];
      const head = chJoin(V.soft(i), V.lead(i)), pk = (L, v) => V.pick(L.flatMap(t => shorts.map(w => chF(fl(t, w), v || {}))), j, V.endOf(head));
      if (!u) return chJoin(head, V.pick((CH_WHY[kd] || CH_WHY.other).map(x => chF(x, vv)), j + 1));
      const fl = (s, w) => s.replace(/\{b\}/g, cnt.has(u) ? pc(cnt.get(u)) : 0).replace(/\{a\}/g, pc(cnt.get(A) || 0)).replace(/\{w\}/g, w);
      if (cnt.has(u)) { const b = pc(cnt.get(u)), a = pc(cnt.get(A)); return chJoin(head, pk(b >= a ? CH_NG.near : b * 2 >= a ? CH_NG.half : CH_NG.low)); }
      let F; try { F = chFacts(o.pos, u); } catch (e) { F = {}; }
      const vx = chVars(F, white); vx.T = F.hang || '駒';
      const L = F.hang ? CH_NG.hang : FA.cap && FA.behind && !F.cap ? CH_NG.recap : F.king && !F.castle ? CH_NG.king : FA.castle ? CH_NG.late : F.pc === 'q' && F.move <= 10 && !F.cap ? CH_NG.queen
        : F.pc === 'r' ? CH_NG.rook : FA.dev && (F.pc === 'n' || F.pc === 'b') && !F.dev ? CH_NG.again : FA.dev && F.pc === 'p' ? CH_NG.pawn : F.flank ? CH_NG.flank : C.length >= 5 && Math.min(...C.map(x => x[1])) > N * .05 ? CH_NG.few.map(t => t.replace('{k}', C.length)) : CH_NG.rare;
      return chJoin(head, pk(L, vx));
    };
    const ngTx = ngOf(null); V.add(ngTx);
    return { ask, hintTx, good, ng: u => (!u || u === A) ? ngTx : ngOf(u) };
  }
  /* (2026-11-21 lesson loop) the chess lesson problems (check, escape, mate, special rules, stalemate, tactics) in ナイトン's words,
     Japanese: a varied question, a hint about what to look at, and after the answer why the move works or what yours misses —
     from the board (check, the king's ways out, the pieces a move hits, lines through two pieces, pieces left to be taken)
     and the stored values (chess/lessons.json sc). {m} / {x} = the best move / yours, filled by the runner. */
  function chHits(b, z) {   // the squares the piece on z attacks
    const ch = b[z]; if (!ch) return []; const lo = ch.toLowerCase(), w = chW(ch), r = z >> 3, f = z & 7, out = [], ok = (rr, ff) => rr >= 0 && rr < 8 && ff >= 0 && ff < 8;
    if (lo === 'p') { for (const df of [-1, 1]) if (ok(r + (w ? 1 : -1), f + df)) out.push((r + (w ? 1 : -1)) * 8 + f + df); return out; }
    if (lo === 'n' || lo === 'k') { for (const [dr, df] of lo === 'n' ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]]) if (ok(r + dr, f + df)) out.push((r + dr) * 8 + f + df); return out; }
    const D = lo === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : lo === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dr, df] of D) { let rr = r + dr, ff = f + df; while (ok(rr, ff)) { out.push(rr * 8 + ff); if (b[rr * 8 + ff]) break; rr += dr; ff += df; } }
    return out;
  }
  function chLsF(fen, u) {   // chFacts + check, the king's free squares, what the moved piece hits, a pin / skewer line
    const F = chFacts(fen, u), b = chBoard(fen), white = String(fen).split(' ')[1] !== 'b', nb = chMove(b, u), a = chSq(u), z = chSq(u.slice(2, 4));
    const kq = nb.indexOf(white ? 'k' : 'K'), ok = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
    F.check = kq >= 0 && !!chAtt(nb, kq, white);
    F.near = kq >= 0 && Math.max(Math.abs((kq >> 3) - (z >> 3)), Math.abs((kq & 7) - (z & 7))) <= 1;
    F.hits = chHits(nb, z).filter(q => nb[q] && chW(nb[q]) !== white).map(q => nb[q].toLowerCase()).sort((x, y) => CH_VAL[y] - CH_VAL[x]);
    F.ep = F.pc === 'p' && (a & 7) !== (z & 7) && !b[z]; F.promo = u[4] || '';
    const w0 = chAtt(b, a, !white); F.was = !!w0 && (!chAtt(b, a, white) || CH_VAL[w0.toLowerCase()] < CH_VAL[F.pc]);   // (the piece moved stood to be taken)
    F.run = 0; if (kq >= 0) { const nb2 = nb.slice(); nb2[kq] = '';
      for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { const r = (kq >> 3) + dr, f = (kq & 7) + df; if ((!dr && !df) || !ok(r, f)) continue; const c = nb2[r * 8 + f]; if (c && chW(c) !== white) continue; if (!chAtt(nb2, r * 8 + f, white)) F.run++; } }
    const at = chAtt(nb, z, !white); F.taken = !!at && (at.toLowerCase() !== 'k' || !chAtt(nb, z, white)); F.def = !!chAtt(nb, z, white);
    if ('bqr'.includes(F.pc)) {
      const D = F.pc === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : F.pc === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dr, df] of D) { let r = (z >> 3) + dr, f = (z & 7) + df; const seen = []; while (ok(r, f) && seen.length < 2) { const ch = nb[r * 8 + f]; if (ch) { if (chW(ch) === white) break; seen.push(ch.toLowerCase()); } r += dr; f += df; }
        if (seen.length < 2) continue; const [fr, bk] = seen;
        if ((CH_VAL[bk] > CH_VAL[fr] && (fr !== 'p' || bk === 'k')) || CH_VAL[fr] > CH_VAL[bk] && bk !== 'p') { const L = { fr, bk, skewer: CH_VAL[fr] > CH_VAL[bk] }; if (!F.line || fr === 'k' || bk === 'k') F.line = L; } }
    }
    return F;
  }
  const CHJ_LS = {
    ask: {
      b_check: ['黒のキングに、チェックをかけてみよう！', '{p}で、キングをねらえるマスはどこかな？', 'チェックになる手を指してみて！', '{p}を動かして、黒のキングに王手！', 'さあ、キングを取れる形を作ろう！'],
      b_escape: ['チェックされちゃった！ いちばん良い守り方は？', 'キングがねらわれてる。逃げる・置く・取る、どれにする？', 'チェックを防ぐ手はいくつかある。損しない手はどれかな？', 'さあ、キングを守ろう！ 駒も損しない手を選んでね。', 'ここはどう守る？ 3つの方法を思い出してみて！'],
      b_mate: ['1手でチェックメイトにしちゃおう！', 'キングの逃げ道を全部ふさぐチェックはどれかな？', 'この局面、1手で勝てるピョン。わかる？', '黒のキングを詰ませる一手を見つけて！', '逃げ場のないチェック、指せるかな？'],
      b_special: [''],   // (its own questions below, by the rule the problem uses)
      b_draw: ['ステイルメイトにしないで、勝ちにつながる手は？', '黒のキングを追いつめよう。でも、動けなくしすぎないでね！', 'クイーンでとどめをさせるかな？ わなに注意ピョン。', '引き分けにならない、勝ちへの一手を選ぼう！', 'ここでいちばん良い手はどれかな？ キングの逃げ道もよく見て！'],
      capture: ['得をする駒取りを見つけよう！', '取れる駒はいくつかある。いちばん得なのはどれ？', '守られていない駒、見つけられるかな？', 'その駒、取っても取り返されない？ よく見て選んでね。', 'ここで駒得できる手があるピョン。どれだろう？'],
      escape: ['ねらわれた駒を助けてあげよう！', 'どの駒があぶないかな？ 安全にする手を探して！', '相手の最後の手で、何がねらわれた？', 'このままだと駒を取られちゃう。どう助ける？', '逃げる・守る・ねらい返す。いちばんいい手は？'],
      fork: ['2つの駒を、同時にねらっちゃおう！', '1手で両取りをかけられる駒はどれかな？', '相手の駒の並びをよく見て。両取りのチャンスピョン！', 'フォークをかけるマス、見つけられる？', '相手が一度に守れない手を探してみて！'],
      pin: ['並んだ駒を、一直線にねらおう！', '相手の駒がタテ・ヨコ・ナナメに並んでいないかな？', 'ピンか串刺し、かけられる？', '線の上に並んだ2つの駒、見つけたピョン？', '相手の駒を動けなくする一手はどれかな？'],
      mate1: ['1手でチェックメイトにしちゃおう！', 'キングに逃げ場のないチェックはどれ？', 'この局面、1手で勝負が決まるピョン！', '詰ませる一手、見えるかな？', 'チェックをかけたら逃げ道を数えて。詰む手はどれ？'],
      mate2: ['2手で詰ませる、最初の一手は？', '相手の応手をしぼる手から入ろう！', 'まずはどう攻める？ 2手先のメイトを見てね。', '駒を捨ててもいいピョン。2手で詰む入り方は？', '相手がどう応じても、次に詰む手を探して！'],
      promote: ['ポーンを成らせる、正しい一手は？', 'どのポーンを進めたら、クイーンになれるかな？', '相手のキングは追いつける？ 数えてから指してね。', 'パスポーンの出番ピョン！ どれを進める？', 'クイーンへの道を開く手はどれかな？'],
    },
  };
  // (2026-11-23 lesson loop: the chess lessons in ナイトン's voice — each lesson its own order of praise / soft words / push (CH_LSV via chOpVoice),
  //  every reason in 2〜4 wordings, picked so that no line, no 10 letters and no sentence ending repeat inside a lesson; the praise and the
  //  correction never use the same sentence; the wrong move's own loss is worked out from the board (chLsF) and said once per move)
  const CH_LSV = {
    ask: [''], pct: [''],
    cheer: ['いいね！', 'さすが！', 'お見事！', 'ナイス！', 'その調子！', 'ばっちりピョン！', 'すごい、正解！', 'いい手を選んだね！', 'よく見つけたね！', '上手！', '完璧ピョン！', 'やったね！'],
    push: ['次もこの調子で行こう！', 'どんどん進もう！', 'まだまだいけるピョン！', '次の問題も楽しみだね！', 'その勢いで続けよう！', '次もいけるはず！'],
    soft: ['おしい！', '大丈夫、', 'ドンマイ！', 'いい線いってたね。', 'ここはよくある迷いどころだね。', '気にしない、気にしない！', 'あと一歩！', '今度こそいけるピョン！', 'これで覚えちゃおう！', 'みんな一度は迷うところ。'],
    lead: ['正解は{m}。', '答えは{m}。', 'ここは{m}を指したかった！', '{m}が決め手だったピョン。', 'いちばんの手は{m}。', '{m}が正解。'],
    hint: ['動ける駒を、ひとつずつ確かめてみて！', '相手の次の一手も想像してみようピョン。', 'あせらずに、候補の手をくらべてみて！', '指したあと、取られる駒がないかも確かめよう！', 'いちばん強い手から考えるのがコツだピョン！', '相手の駒の利きを、1つずつなぞってみて。', 'チェック、駒取り、ねらいの順に探すと見つかりやすい！'],
  };
  function chLsJa(sid, o, i, V) {
    const A = CHJ_LS.ask[sid]; if (!A || !V) return null;
    const P = o.P, pos = o.pos, ans = o.ans, FA = chLsF(pos, ans), N = CH_PN, pA = N[FA.pc], k = i + sid.length;
    const val = u => { const e = (P.sc || []).find(x => x[0] === u); return e ? e[1] : null; }, best = val(ans);
    const ok = u => P.ok ? P.ok.includes(u) : CHESS.points(P, u) >= 16;
    const nm = q => String.fromCharCode(97 + (q & 7)) + ((q >> 3) + 1);
    const wrong0 = () => {   // (no wrong move given — the scorer asks with the right one: a legal-looking wrong move, the answer's own piece first)
      const b = chBoard(pos), wh = String(pos).split(' ')[1] !== 'b', out = [];
      for (let q = 0; q < 64; q++) { const c = b[q]; if (!c || chW(c) !== wh) continue;
        for (const z of chHits(b, q).concat(c.toLowerCase() === 'p' ? [q + (wh ? 8 : -8)].filter(x => x >= 0 && x < 64 && !b[x]) : [])) { const t = b[z]; if ((t && chW(t) === wh) || (t && t.toLowerCase() === 'k')) continue; if (c.toLowerCase() === 'p' && !t && (z & 7) !== (q & 7)) continue;
          const u = nm(q) + nm(z) + (c.toLowerCase() === 'p' && (z >> 3) % 7 === 0 ? 'q' : ''); if (u === ans || ok(u)) continue;
          try { const nb = chMove(b, u), kq = nb.findIndex(ch => ch && chW(ch) === wh && ch.toLowerCase() === 'k'); if (kq >= 0 && chAtt(nb, kq, !wh)) continue; } catch (e) { continue; }
          out.push([u, q === chSq(ans) ? 0 : 1]); } }
      out.sort((x, y) => x[1] - y[1]); return out.length ? out[0][0] : null; };
    const alt = u => u && u !== ans && !ok(u) ? u : P.sc && P.sc.find(x => !ok(x[0])) ? P.sc.find(x => !ok(x[0]))[0] : wrong0();   // (the scorer asks with the right move: a wrong one from the list)
    const F = u => { try { return chLsF(pos, u); } catch (e) { return { hits: [] }; } };
    const rot = L => L.map((_, q) => L[(k + q) % L.length]);
    const pick = (L, prev) => V.pick(rot(L), 0, prev);
    const tgt = FA.hits.filter(x => x !== 'p'), t1 = N[tgt[0]] || '', t2 = N[tgt[1]] || '';
    const tw0 = tgt.length >= 2 ? (t1 === t2 ? `2つの${t1}` : `${t1}と${t2}`) : '';
    let hints = [], goods = [], rights = [], xpart = () => [], altGood = null, ask = null;
    const cheer = V.cheer(i), soft = V.soft(i);
    if (sid === 'b_check') {
      const how = { r: 'まっすぐな線', b: 'ナナメの線', n: 'L字の跳び', q: '長い線', p: 'ナナメ前の1マス' }[FA.pc] || '動き';
      hints = [{ r: 'ルークはタテとヨコに進む駒。キングと同じ列か段に入れないかな？', b: 'ビショップはナナメの駒。キングとナナメに並ぶマスを探してみて！', n: 'ナイトはL字に跳ぶピョン。キングからL字の位置にあるマスはどこ？', q: 'クイーンはタテ・ヨコ・ナナメ全部に進める。キングと一直線に並ぶマスはいくつもあるね。', p: 'ポーンが取れるのはナナメ前の1マス。一歩進めたら、キングはそこにいるかな？' }[FA.pc] || ''].filter(Boolean);
      goods = [`{x}で${pA}がキングをにらんだ！ 黒は次の手で、キングを守るしかないピョン。`, `チェック成功！ ${pA}の${how}が、ちゃんとキングに届いてる。`, `{x}で王手！ 黒はほかの手をあと回しにして、まずキングを助けなきゃいけない。`,
        FA.pc === 'n' ? 'ナイトは駒を飛びこえるから、このチェックはあいだに駒を置いても防げないピョン。' : `{x}の${pA}からキングまで、じゃまな駒はひとつもない。きれいな王手だね。`];
      rights = [`{m}なら、${pA}の${how}がキングに届いてチェックになるピョン。`, `{m}で${pA}を動かせば、キングを射程に入れて王手だった。`, `ここは{m}、${pA}の${how}が、ちょうどキングに当たるマスなんだ。`, `正しくは{m}、そこからなら${pA}がキングをねらえる！`, `{m}へ動かせば、${pA}がキングをにらむ王手になった。`];
      xpart = G => !G || G.check ? [] : G.pc === 'k' ? ['{x}はキングが動くだけで、相手のキングをねらえない。', '{x}だと自分のキングが動いただけ。黒のキングには何も届かない。']
        : [`{x}だと${N[G.pc] || '駒'}が相手のキングに届かないから、チェックにならない。`, `{x}のあと、黒のキングはだれにもねらわれていないピョン。`, `{x}では、キングへの線が通らない。`, '{x}では、黒のキングに王手がかからない。'];
    } else if (sid === 'b_escape') {
      const kind = G => G.cap ? 'take' : G.pc === 'k' ? 'run' : 'block', kA = kind(FA), C = N[FA.cap];
      hints = { take: ['チェックしている駒は、だれかに守られてる？ 取れるなら、それがいちばん得ピョン。', 'キングをねらっている駒、きみの駒で取れないかな？'], run: ['逃げられるマスはいくつかある。逃げた先で、ほかの駒がねらわれないかも見てね。', 'キングの行き先を1つずつ確かめて。相手の駒が届かないマスはどこ？'], block: ['あいだに駒を置く手もある。置いた駒が取られないか、確かめよう！', 'キングと相手の駒のあいだに、守りのついた駒を入れられないかな？'] }[kA];
      goods = { take: [`{x}でチェックしている${C}を取った！ キングも助かって、駒得までできたピョン。`, `守りながら${C}をいただき！ {x}は、取るのがいちばん得な守り方。`, `{x}でチェックの元を取っちゃった！ ${C}がいなくなれば、もう王手はない。`],
        run: ['{x}でキングを安全なマスへ。ほかの駒もねらわれない、落ち着いた逃げ方！', '{x}に逃げれば、もうどの駒にもねらわれない。駒も1つも損してないピョン。', 'キングの避難、成功！ {x}のマスには相手の駒が届かない。'],
        block: ['{x}であいだに駒を置いて、チェックをさえぎった！ 置いた駒もちゃんと守られている。', '{x}の合い駒で王手をシャットアウト！ 取られても取り返せる形ピョン。', 'あいだに入った駒が盾になったね。{x}なら、駒も損しない。'] }[kA];
      rights = { take: [`{m}なら、チェックしている${C}を取れて駒得。`, `{m}で${C}を取れば、守りと駒得がいっぺんにできた。`, `ここは{m}で${C}を取れば、いちばん得ピョン。`, `正しくは{m}、${C}を取ってしまえば王手も消える。`],
        run: ['{m}でキングを逃がすのが、駒を損しない守り方ピョン。', '{m}に逃げれば、どの駒も取られずにすむ。', '{m}なら、キングが安全なマスへ移れる。', '正しくは{m}、そこなら相手の駒が届かないから安心。'],
        block: ['{m}で守りのついた駒を置けば、損しないで防げる！', '{m}の合い駒なら、取られても取り返せる。', '{m}であいだをふさげば、駒も損しない。', '正しくは{m}、守りのある駒で線をさえぎる手。'] }[kA];
      altGood = u => '{x}でもちゃんと守れたね！ ' + { take: 'チェックしている駒を取れて、駒得まで！', run: 'キングが安全なマスへ逃げられたピョン。', block: 'あいだに置いた駒も、ちゃんと守られている。' }[kind(F(u))];
      xpart = G => !G ? [] : kind(G) === 'block' && G.hang ? [`{x}であいだに置いた${N[G.pc]}は、${G.hang}にただで取られちゃう。`, `{x}の合い駒は守りがなくて、${G.hang}に取られて損。`]
        : kA === 'take' && !G.cap ? [`{x}でも守れるけど、チェックしている${C}を取るチャンスを見のがしちゃった。`, `{x}だと王手は防げても、${C}がそのまま残っちゃう。`]
        : G.pc === 'k' ? ['{x}に逃げると、そのあと駒を取られて損しちゃう。', '{x}へ逃げたら、ほかの駒がねらわれて損しちゃう。', '{x}のマスに逃げると、あとで駒を損する形になる。'] : ['{x}だと守りきれずに、駒を損しちゃう。', '{x}では、駒を1つ損する形になっちゃう。', '{x}の守り方だと、駒を1つ失っちゃう。'];
    } else if (sid === 'b_mate' || sid === 'mate1') {
      const why = G => G.pc === 'n' && !G.near ? ['キングは自分の駒にかこまれて、逃げ場がひとつもないピョン。', '味方の駒が壁になって、キングは一歩も動けない。', 'ナイトのチェックは、あいだに駒を置いて止められないんだ。']
        : G.near ? [`キングの目の前の${N[G.pc]}は守られているから、取ることもできない。`, `となりの${N[G.pc]}には味方の守りがついていて、キングは手を出せない。`, `${N[G.pc]}がキングにぴったりくっついた。守りがあるから取られないピョン。`]
        : ['キングの逃げ道は全部ふさがって、あいだに置く駒もない！', '逃げるマスも、防ぐ駒も、取る手もない。完全に詰んだ！', 'キングのまわりのマスは全部、きみの駒がにらんでる。', 'チェックを止める方法が、黒にはひとつも残ってない。'];
      hints = FA.pc === 'n' ? ['キングは自分の駒にかこまれて動けないね。L字に跳ぶ駒の出番ピョン！', 'キングのまわりは味方の駒でいっぱい。飛びこえてチェックできる駒は？'] : FA.near ? [`${pA}をキングのすぐ近くへ。取られないマスはどこかな？ 味方の守りを使おう！`, `${pA}をキングにくっつけてみて。そのマス、味方が守ってる？`]
        : ['キングの前の段は、自分のポーンでふさがってない？ 奥の段をねらってみて！', `${pA}の長い線でチェックしたら、キングはどこへ逃げられる？`, 'キングのまわりの8マスを数えてみて。もう1つの駒が、どこをふさいでいるかな？'];
      const heads = ['{x}でチェックメイトの完成！ ', '{x}で詰み！ ', '{x}で勝負あり！ ', '{x}でゲームセット！ ', '決まった！ {x}のチェックで、もう逃げられない。'];
      goods = why(FA).flatMap((w, q) => heads.map((_, h) => heads[(h + q * 2) % heads.length] + w));
      rights = ['{m}なら一発で詰みだった。逃げ場が残らない形ピョン。', '{m}が、逃げ場をなくす決め手。黒はもう受けられなかった。', '{m}を指せば、黒はもう何もできなかったんだ。', '{m}なら王手をかけたまま、キングの逃げ道がゼロになる。', '{m}なら、逃げても、取っても、合い駒しても防げない詰みだった。', '{m}を見つければ、キングの逃げるマスが1つも残らなかった。'];
      altGood = u => val(u) != null && val(u) < (best || 0) ? '{x}でも勝ちは近い！ でも{m}なら、1手で詰んでたピョン。' : '{x}でも詰み！ 詰ませ方はひとつじゃないんだ。';
      xpart = G => !G ? [] : !G.check ? ['{x}はチェックになっていないから、相手は自由に動けちゃう。', '{x}だと王手がかからず、黒に一手の余裕をあげちゃう。', '{x}のあと、黒のキングはねらわれていない。それじゃ詰みにならない。', '{x}では王手にならないピョン。黒は好きな手で守りを固められる。', '{x}だと黒のキングは自由なまま。詰みはまだ先になっちゃう。', '{x}はキングをねらっていない手。それじゃ黒にひと息つかせちゃう。'] : G.run ? ['{x}はチェックだけど、キングに逃げ道が残っちゃう。', '{x}の王手は、キングにすっと逃げられちゃう。', '{x}だと、キングの逃げるマスがまだ空いている。']
        : G.taken ? [`{x}だと、チェックした${N[G.pc]}を取られちゃう。`, `{x}のチェックは、${N[G.pc]}を取られて終わり。`] : ['{x}のチェックは、あいだに駒を置かれて防がれちゃう。', '{x}だと、あいだに駒をはさまれて止められちゃう。'];
    } else if (sid === 'b_special') {
      const kd = FA.castle ? 'castle' : FA.ep ? 'ep' : 'promo', long = FA.castle && (chSq(ans.slice(2, 4)) & 7) === 2;
      ask = pick({ castle: ['特別なルールを使ってみよう！ キングを安全にする手は？', 'キングとルークを、1手でいっしょに動かせるかな？'], ep: ['相手のポーンが2マス進んできた！ 特別な取り方、わかる？', 'いまだけできる取り方があるピョン。どれかな？'], promo: ['ポーンが奥の段まであと1歩！ どうする？'] }[kd]);
      hints = { castle: [long ? 'キングを、ルークのいる左へ2マス。ルークがキングを飛びこえて、となりに来るんだ。' : 'キングを横に2マス動かすと、ルークがとなりに来るピョン。'], ep: ['黒のポーンが、いま真横に並んだところ。ナナメ前のあいたマスに注目してね！', 'となりに並んだ相手のポーン。その後ろのマスへ、ナナメに進めないかな？'], promo: ['ポーンが奥の段に着いたら、いちばん強い駒に成れるね。'] }[kd];
      goods = { castle: long ? ['クイーン側へのキャスリング！ キングは端へ、ルークは真ん中の近くへ出てきた。', '{x}は長いほうのキャスリング！ ルークがキングを飛びこえて、真ん中で働きはじめる。'] : ['{x}でキャスリング！ キングは端の安全な場所へ、ルークは真ん中へ出てきたピョン。', '{x}で、キングとルークがいっぺんに動いた！ キングは隅で安心、ルークも戦える。'],
        ep: ['{x}でアンパッサン！ 真横のポーンを、ナナメ前に進んで取れた。', '{x}、アンパッサン成功！ 横を通りすぎようとしたポーンをつかまえたピョン。'], promo: ['{x}でクイーンに昇格！ いちばん強い駒が、もう1つ増えたピョン。'] }[kd];
      rights = { castle: ['{m}のキャスリングなら、キングの避難とルークの出動が1手でできるピョン。', '{m}なら、キングは隅で安全に、ルークは真ん中で戦えた。'], ep: ['{m}のアンパッサンは、ポーンが2歩で進んできた直後の一手でしかできない。いまが取りどきだった！', 'アンパッサンができるのは、いまこの一手だけ。{m}で、横のポーンを取れたんだ。'], promo: ['{m}でポーンを奥の段へ進めてクイーンに成れば、いちばん強い駒が増えるから。'] }[kd];
      xpart = G => kd === 'castle' ? [G ? '{x}だとキングが真ん中に残って、ルークも出にくいまま。' : 'ほかの手だとキングが真ん中に残って、ルークも出にくいまま。', G ? '{x}では、キングがまだ危ない真ん中にいる。' : 'ほかの手では、キングがまだ危ない真ん中にいる。']
        : kd === 'ep' ? (G ? ['{x}だと、次の手ではもうアンパッサンできない。', '{x}を指すと、横のポーンを取る権利が消えちゃう。'] : []) : G && G.promo && G.promo !== 'q' ? ['{x}だとクイーンより弱い駒になっちゃう。'] : [];
    } else if (sid === 'b_draw') {
      const m1 = best >= 29999;
      hints = m1 ? ['黒のキングの逃げ道を数えてみて。チェックしながら全部ふさげるマスがあるね。', 'チェックをかけて、逃げ道もなくせるマスは？ 王手を忘れずに！'] : ['すぐには詰まない形。黒のキングに動けるマスを残しながら、せまい所へ追いこもう！', 'あわてて詰ませなくていい。黒のキングに1マスだけ逃げ道を残してみて。'];
      goods = m1 ? ['{x}で王手をかけて詰み！ チェックをかけたから、ステイルメイトにならずに勝てたピョン。', '{x}で詰み！ 王手をかけたまま逃げ道をなくしたから、引き分けのわなもよけられた。', '{x}で決着！ チェックしてから動けなくしたから、ちゃんと勝ちになる。']
        : ['{x}がいちばん！ 黒のキングに動けるマスを1つ残して、ステイルメイトをよけながら追いつめてる。', '{x}でキングをすみへ追いこんだ！ 逃げ道を1つ残しているから、引き分けにはならない。', 'うまい追いこみ！ {x}のあとも黒には指せる手が残っているから、あわてず詰みへ向かえる。'];
      rights = m1 ? ['{m}でチェックをかけて詰ませれば、勝ちだった。', '{m}なら王手で詰み。引き分けの心配もなかったんだ。', '{m}は王手で、そのまま逃げ道もゼロ。これが勝ち方ピョン。', '{m}なら、ステイルメイトのわなをよけて詰ませられた。'] : ['{m}なら逃げ道を1つ残せる。それが勝ちへの近道ピョン。', '{m}で追いこめば、ステイルメイトにならずにすむ。', '{m}なら、黒にまだ指せる手を残しながら追いつめられた。', '{m}で追いこめば、次の手で詰ませる形ができたんだ。'];
      altGood = u => { const v = val(u); return v != null && v < best ? '{x}でも勝ちは変わらない！ ただ、{m}ならもっと早く詰ませられたピョン。' : '{x}でもばっちり！ 引き分けのわなを、ちゃんとよけたね。'; };
      xpart = G => !G ? ['ほかの手だと勝ちが遠のいちゃう。'] : G.hang ? [`{x}だと、${N[G.pc]}をキングに取られちゃう！`, `{x}の${N[G.pc]}は、黒のキングにただで取られちゃう。`] : !G.check && !G.run ? ['{x}だと黒のキングは、チェックされていないのに動けない。これじゃ引き分けになっちゃう！', '{x}のあと、黒は指せる手がゼロ。王手じゃないから、ステイルメイト！', '{x}は黒を動けなくしすぎ。チェックなしで手がなくなると、引き分けピョン。']
        : ['{x}だと勝ちが遠のいちゃう。', '{x}では、黒のキングをなかなか追いつめられない。', '{x}のあと、黒のキングはまだ広いところへ逃げられる。', '{x}だと、詰みまで遠回りになっちゃう。', '{x}では、黒のキングがまだ自由に動けるから、詰みが遠い。'];
    } else if (sid === 'capture') {
      const cA = N[FA.cap] || '駒', defd = FA.taken;
      hints = [`相手の${cA}に注目！ それを守っている駒はいるかな？`, `取ったあと、取り返されるかを数えてみて。${cA}がねらい目ピョン。`, `${cA}のまわりを見て。取り返しに来られる駒はいる？`];
      goods = defd ? [`{x}で${cA}を取った！ 取り返されても、${pA}より${cA}のほうが価値が高いから得なんだ。`, `{x}は${pA}と${cA}の交換。高い駒をもらえるから、取り返されても得ピョン。`]
        : [`{x}で、ただの${cA}をいただき！ 取り返せる駒はどこにもいないピョン。`, `{x}で${cA}をゲット！ 守っている駒がいないから、まるもうけ。`, `${cA}はすきだらけだった！ {x}で取っても、取り返す駒がいない。`, `{x}で駒得成功！ ${cA}を取ったあと、相手は何も取り返せない。`, `タダの${cA}、よく見つけた！ {x}のあと、取り返しに来る駒はいない。`];
      rights = defd ? [`{m}なら${cA}が取れて、取り返されても得。`, `{m}で${cA}を取れば、${pA}との交換でも得なんだ。`] : [`${cA}はだれにも守られていなかった！ {m}で、ただ取りできたんだ。`, `{m}なら、守りのない${cA}をただで取れたピョン。`, `ここは{m}、${cA}を守る駒は1つもいなかった。`, `正しくは{m}、ノーガードの${cA}を取り返されずに取れた。`, `{m}で取れば、${cA}の分だけまるまる得になったピョン。`];
      altGood = () => `{x}も悪くない手！ でも{m}なら${cA}を取れて、もっと得だった。`;
      xpart = G => !G ? [] : G.cap && G.hang ? [`{x}で取った${N[G.cap]}は守られていて、${N[G.pc]}を取り返されちゃう。`, `{x}だと${N[G.cap]}は取れても、${N[G.pc]}を取り返されて損。`]
        : G.cap && CH_VAL[G.cap] < CH_VAL[FA.cap] ? [`{x}で取れる${N[G.cap]}より、${cA}のほうが価値が高い。`, `{x}の${N[G.cap]}取りより、もっと大きな${cA}があった。`]
        : G.hang ? [`{x}のあと、その${N[G.pc]}が${G.hang}に取られて損しちゃう。`, `{x}で動いた${N[G.pc]}は、${G.hang}に取られる場所。`] : [`{x}だと、${cA}を取るチャンスを見のがしちゃう。`, `{x}では、取れるはずの${cA}がそのまま。`, `{x}を指すあいだに、${cA}は逃げちゃうかも。`, `{x}のあと、${cA}はまだ盤の上。もったいないピョン。`];
    } else if (sid === 'escape') {
      const th = FA.was, safe = !FA.taken, H = FA.hits.length && FA.hits[0] !== 'p' ? N[FA.hits[0]] : '';
      hints = th ? [`ねらわれているのは${pA}。逃げた先が安全か、1マスずつ確かめてね。`, `${pA}の逃げ先はいくつかあるピョン。相手の駒が届かないマスはどこ？`, `${pA}があぶない！ 相手の駒の通り道をさけて逃がそう。`] : ['ただ逃げるだけじゃない手もある。相手の駒をねらい返せないかな？', '守りながら攻める手を探してみて。相手の駒に届く場所は？'];
      const plus = H ? [`しかも相手の${H}もねらってる。`, `おまけに${H}までにらんでる！`, `さらに相手の${H}にも圧力をかけてる。`] : [''];
      goods = (th && !safe ? [`{x}で${pA}を、守りのあるマスへ逃がした！ 取られても取り返せるから、損はしないピョン。`, `${pA}を助けたね！ {x}のマスなら、取られても取り返せる。`, `{x}で${pA}をよけた！ 相手が取ってきても、味方の駒で取り返せる形。`] : th ? [`{x}で${pA}が安全なマスへ！ もう相手の駒は届かないピョン。`, `${pA}の避難、成功！ {x}のマスなら、どの駒にもねらわれない。`, `{x}で${pA}を逃がした！ 逃げた先も安全で、言うことなし。`, `${pA}を見捨てずに助けたね！ {x}なら、もう取られない。`] : ['{x}で、ねらわれた駒を助けながら反撃！ 相手は自分の駒の心配で手いっぱい。', '{x}は守りと攻めをいっぺんにやる手。相手は自分の駒を気にしなきゃいけない。'])
        .flatMap(g => plus.map(p => p ? g + p : g));
      rights = th && !safe ? [`{m}なら${pA}は守りのあるマスへ逃げられる。取られても取り返せるんだ。`, `{m}に逃げれば、${pA}を取られても取り返せた。`, `正しくは{m}、そこなら${pA}に味方の守りがつく。`] : th ? [`{m}なら${pA}が、相手の駒の届かないマスへ逃げられる。`, `{m}に逃げれば、${pA}はもうねらわれない。`, `${pA}の逃げ場所は{m}が正解。そこなら安全ピョン。`, `{m}へ動かせば、${pA}はどの駒にも取られない。`, `正しくは{m}、そこなら${pA}をねらえる駒がいない。`] : ['{m}なら、ねらわれた駒を助けながら反撃できるピョン。', '{m}で駒を守りつつ、相手にもねらいをつけられた。', '{m}なら、守りながら相手の駒をにらみ返せた。', '正しくは{m}、助けるのと攻めるのがいっぺんにできる手。'];
      altGood = () => '{x}でも助かったね！ ただ{m}なら、逃げた先での働きがもっといいピョン。';
      xpart = (G, u) => !G ? [] : th && chSq(u) !== chSq(ans) ? [`{x}だと、ねらわれていた${pA}がそのまま取られちゃう。`, `{x}を指しているあいだに、${pA}を取られちゃう。`, `{x}では${pA}が逃げられず、ただで取られるピョン。`] : G.hang ? [`{x}に逃げても、そこで${G.hang}に取られちゃう。`, `{x}の逃げ先は、${G.hang}の通り道。`] : ['{x}だと駒は助かっても、形が悪くなって損しちゃう。', '{x}では、あとで駒を損する形になっちゃう。', '{x}のあと、べつの駒がねらわれて損しちゃう。', '{x}だと、ねらわれた駒の心配が残ったまま。'];
    } else if (sid === 'fork') {
      const two = tgt.length >= 2, tw = two ? tw0 : '2つの駒';
      hints = two ? [`相手の${tw0}に注目！ その両方に届くマスはどこかな？`, `${pA}を使ってみて。${tw0}、両方に届くマスがあるピョン。`, `${tw0}、どちらにも届く場所を探そう！`, `${pA}の動きで、${tw0}を一度ににらめないかな？`] : [`${pA}で、2つの駒に同時に届くマスを探してみて！`, `${pA}の行き先から、相手の駒が2つ見えるマスはどこ？`];
      goods = FA.check && two ? [`{x}はチェックしながら${t2}もねらう両取り！ キングを守っているあいだに、${t2}をいただける。`, `王手と${t2}取りの両取り！ {x}のあと、黒はキングを守るので精一杯ピョン。`, `{x}でキングと${t2}を同時ににらんだ！ ${t2}はもう助からない。`]
        : [`{x}で${tw}を同時にねらった！ 相手は両方は守れないから、どちらかが取れるピョン。`, `${tw}にダブルアタック！ {x}のあと、どちらかは必ず取れる。`, `{x}のフォークで${tw}がピンチ。相手は1つしか助けられない。`];
      rights = [`{m}なら${tw}の両取り！`, `{m}に動けば、${tw}の両方に手が届いたんだ。`, `ここは{m}、${tw}のどちらにも届くマスだった。`, `{m}で両取りをかければ、相手はどちらかをあきらめるしかなかった。`, `正しくは{m}、そこから${tw}を一度ににらめるピョン。`];
      altGood = () => `{x}もいい手！ でも{m}なら${tw}の両取りで、もっと得できたピョン。`;
      xpart = G => !G ? [] : G.hang ? [`{x}だと、その${N[G.pc]}が${G.hang}に取られちゃう。`, `{x}の${N[G.pc]}は、${G.hang}にただで取られる場所。`, `{x}で出た${N[G.pc]}は、${G.hang}のえじきピョン。`] : ['{x}ではねらえる駒が1つだけで、相手に守られちゃう。', '{x}だと1つの駒しかねらえない。それなら相手はかんたんに守れる。', '{x}のあと、相手は1つ守るだけですむ。両取りにならないピョン。', '{x}は、2つの駒に同時には届かない。', '{x}だと、ねらいが1つにしぼられて、相手は楽に守れる。'];
    } else if (sid === 'pin') {
      const Lx = FA.line, fr = Lx ? N[Lx.fr] : '', bk = Lx ? N[Lx.bk] : '';
      hints = Lx ? [`相手の${fr}と${bk}が、一直線に並んでるね。その線に入れる駒はどれかな？`, `${pA}の線を使ってみて。${fr}の後ろに、何がいる？`, `${fr}の向こうに${bk}。その線を、${pA}でねらえないかな？`] : [`${pA}の長い線の先に、相手の駒が2つ並んでいないかな？`, `相手の駒の並びを、タテ・ヨコ・ナナメに見ていこう！`];
      goods = !Lx ? ['{x}で、線の上の相手の駒をしばった！ 前の駒はもう自由に動けないピョン。', '{x}で一直線にねらった！ 前の駒は、うかつに動けない。']
        : Lx.skewer ? [`{x}で串刺し！ ${fr}が逃げたら、後ろの${bk}が取れる。`, `${fr}の後ろに${bk}！ {x}の串刺しで、${fr}がどいたら${bk}をいただき。`]
        : Lx.bk === 'k' ? [`{x}で${fr}をキングにピン！ ${fr}はもう動くことすらできないピョン。`, `${fr}がキングの前で固まった！ {x}のピンで、${fr}は一歩も動けない。`, `{x}のピンが決まった！ ${fr}が動くとキングがむき出しになるから、ルールで動かせない。`]
        : [`{x}でピン！ ${fr}が動くと、後ろの${bk}が取られちゃう形。`, `{x}で${fr}をしばった！ 動けば後ろの${bk}がやられる。`];
      rights = !Lx ? ['{m}なら相手の駒を一直線にしばれた！', '{m}で、並んだ駒を線の上でねらえたんだ。'] : Lx.skewer ? [`{m}なら${fr}の後ろの${bk}まで取れる！`, `{m}で串刺しにすれば、${fr}がどいたあと${bk}が取れたんだ。`] : [`{m}なら${fr}が動けなくなる！`, `{m}で${fr}と${bk}を一直線にねらえば、${fr}はしばられたピョン。`, `ここは{m}、${fr}の後ろの${bk}まで線が通るんだ。`, `{m}に入れば、${fr}は後ろの${bk}を守るために動けない。`, `正しくは{m}、${fr}と${bk}をまとめて線の上にとらえる手。`];
      altGood = () => `{x}も悪くない！ でも{m}なら、線の上の${fr || '駒'}をしばれたピョン。`;
      xpart = G => !G ? [] : G.hang ? [`{x}だと、その${N[G.pc]}が${G.hang}に取られちゃう。`, `{x}の${N[G.pc]}は、${G.hang}にただで取られる場所。`] : ['{x}では線の上に2つの駒が並ばないから、相手は自由に動ける。', '{x}だと、相手の駒は一直線にならない。しばる力が出ないんだ。', '{x}のあと、相手の駒はどれも自由に動けちゃう。', '{x}は、並んだ駒の線からはずれているピョン。', '{x}では、相手の駒をしばる線ができない。', '{x}だと、ピンも串刺しもかからないから、相手は楽になる。'];
    } else if (sid === 'mate2') {
      hints = FA.hang && !FA.check ? [`${pA}をわざと捨てる手もある。取ったら、どうなるかな？`, `${pA}をただであげちゃう手、ありかも？ 取ったあとのキングを見て。`] : FA.check ? [`まずはチェックから。${pA}で、キングの逃げ道をしぼってみて！`, `${pA}でチェックしたら、相手の応手はいくつ残る？ 数えてみよう！`] : ['静かな手で、逃げ道を先にふさぐのもありピョン。', 'すぐ王手しなくてもいい。キングの逃げ道を先に消せないかな？'];
      const how = FA.check ? ['チェックで相手の手をしぼったのが決め手ピョン。', '王手で黒の選べる手を減らしたのがうまい！'] : FA.hang ? ['駒を捨てて、キングをおびき出した！', 'わざと駒を取らせる、大胆な一手！'] : ['逃げ道を先にふさいだのがうまい！', '静かな手で、逃げ場を先に消したのがえらい！'];
      goods = [`{x}から入れば、相手がどう応じても次で詰み！ ${how[0]}`, `{x}が詰みへの入口！ 黒の受けは、もうどれも間に合わないピョン。`, `${how[1]} {x}のあと、黒に助かる手はない。`, `{x}で黒を追いこんだ！ ${how[0]}`, `いい入り方！ {x}で、2手目の詰みが見えた。`];
      rights = ['{m}から入れば、2手で詰むんだ。', '{m}を指せば、黒の受けはどれも次で詰みだった。', '正しい入り方は{m}、そこから2手目で詰む。', 'ここは{m}、そのあと黒に逃げる手はなかった。', '{m}なら、黒はどう受けても2手目で詰んでいた。', '{m}で黒の受けをしぼれば、次の一手で詰み。'];
      altGood = u => val(u) != null && val(u) < best ? '{x}でも詰みまで行ける！ でも{m}なら、もっと早く決まったピョン。' : '{x}からでも2手で詰む！ 入り方はひとつじゃないんだ。';
      xpart = G => !G ? [] : G.check ? ['{x}はチェックだけど、キングに逃げられて詰まない。', '{x}の王手は、キングに逃げ道を与えちゃう。'] : G.hang ? [`{x}は${N[G.pc]}を取られるだけになっちゃう。`, `{x}だと${N[G.pc]}をただであげて終わり。`] : ['{x}だと相手に一手の余裕ができて、詰みをのがしちゃう。', '{x}は、黒に守りを固める時間をあげちゃう。', '{x}のあと、黒のキングに逃げ道ができちゃう。', '{x}では、2手目に詰ませる形が作れないピョン。', '{x}は、詰みまでの道すじからはずれちゃう。'];
    } else if (sid === 'promote') {
      const z = chSq(ans.slice(2, 4)), white = String(pos).split(' ')[1] !== 'b', left = FA.pc === 'p' ? (white ? 7 - (z >> 3) : z >> 3) : 0;
      const rests = !left ? ['これでクイーン誕生！', 'ついにクイーンに成れた！'] : [`成るまであと${left}マス！`, `奥の段まで、残り${left}マス！`, `クイーンまであと${left}歩！`];
      hints = FA.pc === 'p' ? [`${left + 1}マス進めば成れるポーンがあるね。じゃまする相手の駒は届くかな？`, '相手のキングとポーンの距離をくらべてみて。成るまでいちばん近いポーンはどれピョン？', 'ポーンの前のマスを見て。止めに来られる相手の駒はいる？'] : ['ポーンの前をふさいでいる駒はいない？ 道を開ける手も考えよう！', 'ポーンが進めないのは、何がじゃましているから？'];
      goods = FA.pc === 'p' ? [`{x}でポーンが一歩前へ！ ${rests[0]} 相手は止めるのに大いそがし。`, `{x}が大正解！ ${rests[1 % rests.length]} 相手はもう、止めるのがたいへんピョン。`, `{x}でクイーンにぐっと近づいた！ ${rests[2 % rests.length]}`, `ポーン、前進！ {x}なら相手のじゃまは間に合わない。`, `{x}でパスポーンが走りだした！ もう止まらないピョン。`, `いい判断！ {x}で、相手のキングより先に奥の段へ着ける。`]
        : ['{x}でポーンの道が開いた！ クイーンへの道がはっきり見えてきた。', '{x}でじゃま者がいなくなった！ ポーンが進めるピョン。'];
      rights = FA.pc === 'p' ? [`{m}なら、${rests[0]}`, `正しくは{m}、${rests[1 % rests.length]}`, `ここは{m}でポーンを前へ。${rests[2 % rests.length]}`, `{m}で進めれば、相手のじゃまより先に奥の段へ着ける。`, `{m}のポーンなら、だれにも止められずに成れるピョン。`] : ['{m}でポーンの道が開くんだ。', '{m}なら、ポーンが進む道が開けた。'];
      altGood = () => '{x}でもまだ戦える！ でも{m}なら、ポーンがもっと早く成れたピョン。';
      xpart = (G, u) => !G ? [] : G.pc === 'p' && FA.pc === 'p' && chSq(u) !== chSq(ans) ? ['{x}のポーンは、成るまでまだ遠い。', '{x}のポーンだと、クイーンまで時間がかかりすぎる。', '{x}で進めるポーンは、奥の段までまだ距離があるから間に合わない。'] : G.pc !== 'p' ? ['{x}だとポーンが止まったまま。相手に守りを固める時間をあげちゃう。', '{x}ではポーンが進まない。そのあいだに相手が追いついちゃう。', '{x}では、クイーンへの道のりが縮まらない。', '{x}のあいだに、相手がポーンの前をふさいじゃう。', '{x}だと、ポーンを進めるチャンスを一手ムダにしちゃう。', '{x}はポーンと関係ない手だから、そのすきに相手が守りを固めちゃう。'] : ['{x}では相手のじゃまが間に合っちゃう。', '{x}だと、相手のキングが追いついちゃう。', '{x}のあと、相手に止めに来る時間をあげちゃうピョン。', '{x}だと、奥の段に着く前につかまっちゃう。'];
    }
    if (!ask) ask = pick(A.map(t => t.replace('{p}', pA)));
    V.add(ask);
    const hintTx = V.pick([...rot(hints), ...rot(CH_LSV.hint)], 0); V.add(hintTx);
    const push = (i + V.seed) % 2 ? V.push(i) : '';
    const body = V.pick(rot(goods), 0, V.endOf(cheer)), goodTx = chJoin(cheer, body, push); V.add(goodTx);
    // the correction: what the move played misses (from the board) + the right move's own reason, in a wording the praise has not used
    const FB = ['ほかの手だと、ここでのチャンスをのがしちゃう。', 'ほかの手では、この形の得が消えちゃうピョン。', 'ほかの手を指すと、せっかくの好機がなくなる。'];
    const memo = new Map();
    const ng = u0 => {
      const u = alt(u0), key = u || ''; if (memo.has(key)) return memo.get(key);
      const G = u ? F(u) : null, xs0 = xpart(G, u) || [], xs = xs0.length ? xs0 : FB;
      const L = rot(xs).flatMap((x, q) => rot(rights).map((_, r) => chJoin(x, rights[(r + q + k) % rights.length])));
      const body = V.pick(L, 0, V.endOf(soft)), t = chJoin(soft, body); V.add(t); memo.set(key, t); return t; };
    const good = u => u && u !== ans ? chJoin(V.cheer(i + 1), altGood ? altGood(u) : body) : goodTx;
    return { ask, hintTx, good, ng, voiced: true };
  }
  // non-Japanese lessons keep their own lines; Japanese ones get ナイトン's voice from chLsJa (voiced), the rest untouched
  function chCheerJa(probs, lang) { return probs; }
  /* (2026-11-21 lesson loop, user: 駒の動き8本にも手順から問題を作る) chess's beginner ★ drills: after the ★ stages, 3 problems from
     the stages' shortest routes — 「次にどこへ動かす？」 at a position on a shortest route (right = every move that keeps the route
     shortest; a 'safe' stage bars the squares a black piece attacks, as the drill does). Solved here by a breadth-first search over
     (square, piece, black pieces left, ★ left) — the black pieces never move, a ★ is taken by landing on it (= chess/app.js drillMove). */
  // the words, per language (2026-11-22 user: ほかの言語もナイトンらしく): ask / hint by the piece, praise good(x, R) + R (why it is right),
  // a miss ng(m, x, W) + W (what yours costs). R / W entries: a string or p => string, p = { r: moves left after, e: moves lost, cp: the black
  // piece taken (in the form the line needs), how (ja), k: the king, t: the right move took a ★, M: n → 'n moves' }. Each list has 3 so the
  // 3 problems of a lesson say it differently.
  const CDQ = {
    ja: {
      M: n => n + '手', cp: { p: 'ポーン', n: 'ナイト', b: 'ビショップ', r: 'ルーク', q: 'クイーン' },
      how: { r: 'タテ・ヨコの線', b: 'ナナメの線', q: '長い線', k: '1マスの歩み', n: 'L字の跳び', p: 'まっすぐな前進' },
      askS: {
        b_rook: ['さあ、ここからは問題ピョン！ ★を最短で集めるには、ルークを次にどこへ動かす？', 'ルークの次の行き先はどこかな？ 遠回りしない道を選んでね！', '残りの★を一番少ない手数で取りたい。きみならどのマスへ進める？'],
        b_bishop: ['ここからは問題ピョン！ ビショップの次の一手で、★への近道はどれ？', 'ナナメの道を使って、手数を少なく集めるには？', '残りの★、どの順で回る？ 最初に進むマスを選んでね！'],
        b_queen: ['問題の時間ピョン！ クイーンを次にどこへ動かせば、最短で★が集まる？', '8方向に動けるクイーン。いちばんムダのない一手はどれかな？', '★を全部取るまで何手？ その最短コースの最初の一手を指して！'],
        b_king: ['ここからは問題ピョン！ キングの次の一歩、どこが最短？', '1マスずつのキングでも、ムダなく歩けるかな？', 'あと何歩で★が全部集まる？ 近道の一歩を選んでね！'],
        b_knight: ['いよいよ問題ピョン！ ナイトをどこへ跳ばせば、★に一番早く届く？', 'L字の跳び先はたくさん。最短コースに乗るのはどれかな？', 'ぼくの得意な跳び、きみも使いこなせる？ 次の跳び先を選んで！'],
        b_pawn: ['ここからは問題ピョン！ ポーンを次にどう進める？', 'まっすぐ？ それともナナメに取る？ 一番の近道はどっちかな？', '★まで最短で行く一手、見つけられる？'],
        b_capture: ['問題の時間ピョン！ 黒い駒を最短で取りつくすには、次にどこへ動かす？', 'どの駒から取りに行く？ 取る順番がポイントだよ！', '残りの★、少ない手数で回収できるかな？ 次の一手を選んで！'],
        b_safety: ['ここからは問題ピョン！ しましまを避けて最短で★へ行くには、次にどこ？', '取られないマスだけで、一番の近道はどれかな？', '安全第一、でもムダは少なく！ 次の一手はどこ？'],
      },
      hint: {
        r: ['ルークはタテとヨコにまっすぐ。★と同じ列か段に入れるマスはどこかな？', '次の手で★に届かなくても平気。2手目で★を取れる場所を考えてみて！', '曲がり角になるマスを決めると、道すじが見えてくるピョン！'],
        b: ['ビショップはナナメにだけ進む。★とナナメに並ぶマスを探してみて！', '★を2つ、ナナメの線でつなげられないかな？', 'ナナメの線が交わるマスに立つと、次の★を取りやすいピョン。'],
        q: ['クイーンはタテ・ヨコ・ナナメのどれでも行ける。2つの★の両方に届くマスはある？', '取る順番を変えると、手数がへることもあるピョン！', 'ナナメを使うと近道になるかも？ 8方向ぜんぶ見てみて！'],
        k: ['キングは1マスずつ。★までのマス数を数えてみよう！', 'ナナメに1歩動くと、タテとヨコを同時に1つ進めるピョン。', 'どの★から回ると、行ったり来たりしないですむかな？'],
        n: ['今いるマスから跳べる先を、全部思いうかべてみて！', '★にすぐ届かないときは、2回の跳びで届くマスを探すピョン。', '跳ぶたびにマスの色が変わる。★のマスの色から、あと何回跳ぶか考えてみて！'],
        p2: '最初の1回だけは、2マス進めるのを覚えてる？', px: '駒を取るときだけは、ナナメ前に進めるピョン。', pf: 'ポーンは前にまっすぐ1マスずつ。後ろには戻れないから、慎重にね！',
        cap: '取ったあとの位置から、次の駒もねらえる？', safe: '赤いしましまのマスには入れないピョン。ねらわれていないマスを伝っていこう！',
      },
      good: [(x, R) => `いいね、${x}で正解！ ${R} この調子で次も行こう！`, (x, R) => `お見事！ ${x}が最短コースだピョン。${R}`, (x, R) => `さすが、よく見つけたね！ ${x}、ばっちり。${R} どんどん上手になってるピョン！`],
      ng: [(m, x, W) => `大丈夫、ここで覚えればいい！ ${m}が近道だったピョン。${x}だと、${W}`, (m, x, W) => `あと少し！ 正解は${m}。${x}では、${W}`, (m, x, W) => `${m}を選べたら満点だったね。${x}にすると、${W} 次はいけるはず！`],
      R: {
        last: ['最後の★までひとっ飛び、これで全部集まったね。', '残っていた★を一気に回収！ 手数もぴったり。', 'これで★はゼロ。ムダな手がひとつもなかった！'],
        cap: [p => `黒い${p.cp}を取って、次の★へも${p.how}がつながる。残りあと${p.r}手！`, p => `${p.cp}を取ったマスが、そのまま次への近道になってる。`, p => `${p.cp}を取りつつ、次の★まで${p.r}手。順番がばっちり！`],
        starNx: ['★を取ったマスから、次の★にもすぐ届くからね。', '★を取りながら、次の★まで一直線につながるんだ。', '取ったその場所から、次の★がもう射程に入ってる！'],
        starR: [p => `★を取ったあと、残り${p.r}手で全部取れるから。`, p => `先にこの★を取っておくと、あと${p.r}手で終わる。`, p => `この★からなら、残りもあと${p.r}手で回れる。`],
        promo: 'ここで成ってクイーンに！ 動ける方向がいっきに増えるピョン。',
        mid: [p => `★はまだ取らないけど、次の手で★に届くマス。${p.k ? 'ムダな一歩がない' : 'ちょうどいい中継地点'}！`, p => `いったんここへ寄ると、次の${p.how}で★に届くんだ。`, '寄り道に見えて、じつは次の★への近道なんだ。'],
        path: [p => `ここからなら残り${p.r}手で全部集まる。遠回りゼロ！`, p => `このマスを通ると、あと${p.r}手で終わる道すじになるピョン。`, p => `急がば回れ！ ここを通るのが、あと${p.r}手の最短コース。`],
      },
      W: {
        greedy: [p => `★は取れるけど、残りの★が遠くなって${p.e}手よけいにかかっちゃう。取る順番が大事なんだ。`, p => `目の前の★に飛びつくと、残りが遠回りで${p.e}手のロス。先を読むのがコツ！`, p => `★をひとつ取れても、そのあとが${p.e}手長くなる。順番を入れかえてみよう！`],
        pawn: ['ポーンは後ろに戻れないから、★のある段を通りすぎると取りに戻れない。', 'まっすぐ進むと、ナナメ前の★が取れなくなっちゃう。ポーンは戻れないからね。', '前に進んだポーンは戻れない。★を取るチャンスが消えちゃうんだ。'],
        dead: 'そこへ行くと、もう全部の★は取れなくなっちゃう。',
        cap: [p => `じゃまな駒を取っても、★まで${p.e}手の遠回りになる。`, p => `その駒を取るのは寄り道。★まで${p.e}手よけいにかかる。`, p => `駒を取っても★には近づかなくて、${p.e}手のムダが出る。`],
        noReach: [p => `そのマスからは次の手で届く★がひとつもないから、${p.e}手遠回りになっちゃう。`, p => `次の手で★をねらえない場所だから、${p.e}手ぶん損しちゃう。`, p => `次の手で届く★がなくて、${p.e}手よけいにかかるんだ。`],
        off: [p => `★はねらえるけど、道すじがずれて${p.e}手のロス。${p.t ? '取れる★は先に取っておこう！' : ''}`, p => `★には近づくけど、回る順がずれて${p.e}手長くなる。${p.t ? 'すぐ取れる★を見のがさないでね。' : ''}`, p => `届く★はあるけど、全部まわると${p.e}手のムダ。${p.t ? '先に取れる★があったんだ。' : ''}`],
      },
      done: '★集め、おつかれさま！', go: ['全部★3つ、すごいピョン！ 次は、いまの道すじから問題を3つ。最短の一手を選んでね！', 'よくがんばったね！ 次は、いまの道すじから問題を3つ。最短の一手を探してみよう！'],
    },
    en: {
      M: n => n === 1 ? 'one move' : n + ' moves', pk: { r: 'your rook', b: 'your bishop', q: 'your queen', k: 'your king', n: 'your knight', p: 'your pawn' }, cp: { p: 'the pawn', n: 'the knight', b: 'the bishop', r: 'the rook', q: 'the queen' },
      ask: ['Puzzle time, hop! To grab every ★ in the fewest moves, where does {p} go next?', 'Where should {p} go next? Pick the route with no detours!', 'Can you sweep up the rest in as few moves as possible? Choose the next square for {p}!'],
      askCap: ['Puzzle time, hop! To capture them all in the fewest moves, where do you go next?', 'Which piece will you go for first? The order is the key!', 'Can you clear the last ★ in just a few moves? Pick your next move!'],
      askSafe: ['Puzzle time, hop! Dodging the stripes, what\'s the shortest way to the ★?', 'Using only safe squares, which move is the shortcut?', 'Safety first — but no wasted moves! Where to next?'],
      hint: {
        r: ['The rook goes straight: up, down and sideways. Which square lines it up with a ★?', 'No ★ in reach yet? That\'s fine. Find a square that grabs one on the next move!', 'Pick the corner where your route turns, and the path appears, hop!'],
        b: ['The bishop only moves diagonally. Look for a square on a diagonal with a ★!', 'Can two ★ be linked by a single diagonal?', 'Stand where two diagonals cross and the next ★ is easy to reach, hop!'],
        q: ['The queen goes straight or diagonally. Is there a square that reaches both ★?', 'Changing the order can save a move, hop!', 'A diagonal might be the shortcut. Check all eight directions!'],
        k: ['The king steps one square at a time. Count the squares to each ★!', 'One diagonal step moves you a file and a rank at once, hop!', 'Which ★ should come first so you never have to walk back?'],
        n: ['Picture every square your knight can jump to from here!', 'If no ★ is one jump away, look for one that\'s two jumps away, hop!', 'Every jump switches the square\'s colour. Use the ★\'s colour to count the jumps!'],
        p2: 'Remember: on its very first move, a pawn may step two squares!', px: 'Only when it captures does a pawn move diagonally forward, hop!', pf: 'Pawns go straight ahead, one square at a time, and never back. Careful!',
        cap: 'From the square where you capture, can you reach the next piece?', safe: 'You can\'t step on the red stripes, hop! Travel along the squares nobody attacks.',
      },
      good: [(x, R) => `Nice, ${x} is right! ${R} Keep it up on the next one!`, (x, R) => `Brilliant! ${x} is the shortest route, hop! ${R}`, (x, R) => `Great find! ${x}, spot on. ${R} You're getting better and better!`],
      ng: [(m, x, W) => `It's okay, now you know! ${m} was the shortcut, hop. With ${x}, ${W}`, (m, x, W) => `So close! The answer is ${m}. After ${x}, ${W}`, (m, x, W) => `${m} would have been perfect. Playing ${x}, ${W} You'll get the next one!`],
      R: {
        last: ['One hop to the last ★, and that\'s all of them!', 'The last ★ is yours, right on target!', 'No ★ left, and not a single wasted move!'],
        cap: [p => `You take ${p.cp} and the road to the next ★ stays open. Only ${p.M(p.r)} to go!`, p => `The square where you take ${p.cp} is a shortcut to the next one.`, p => `Take ${p.cp}, then just ${p.M(p.r)} to the next ★. Perfect order!`],
        starNx: ['From the ★ you just took, the next one is already in reach.', 'You grab a ★ and line up straight for the next one!', 'Right where you landed, the next ★ is already in range!'],
        starR: [p => `After this ★, the rest takes only ${p.M(p.r)}.`, p => `Take this ★ first and you're done in ${p.M(p.r)}.`, p => `From this ★, you can sweep up the rest in ${p.M(p.r)}.`],
        promo: 'Promote to a queen right here! Now you can go in every direction, hop!',
        mid: [p => `No ★ yet, but from here one is in reach next move. ${p.k ? 'Not a single wasted step!' : 'The perfect stepping stone!'}`, 'Stopping here first lets you reach a ★ on the very next move.', 'It looks like a detour, but it\'s really the shortcut to the next ★.'],
        path: [p => `From here, every ★ takes just ${p.M(p.r)} more. Zero detours!`, p => `Go through this square and you finish in ${p.M(p.r)}, hop!`, p => `Slow and steady! This square is on the shortest route, ${p.M(p.r)} to go.`],
      },
      W: {
        greedy: [p => `you get a ★, but the others end up far away and it costs ${p.M(p.e)} extra. The order matters!`, p => `jumping at the nearest ★ turns the rest into a detour: ${p.M(p.e)} lost. Look ahead!`, p => `one ★ comes easy, but the rest takes ${p.M(p.e)} longer. Try another order!`],
        pawn: ['pawns can\'t go back, so once you pass the ★\'s row you can\'t return for it.', 'marching straight on loses the ★ diagonally in front. Pawns never go back!', 'a pawn that moves forward can\'t come back, and the chance at the ★ is gone.'],
        dead: 'you can no longer collect every ★.',
        cap: [p => `taking that blocker sends you ${p.M(p.e)} out of your way.`, p => `that capture is a side trip: ${p.M(p.e)} extra to the ★.`, p => `the capture brings you no closer to a ★, so you waste ${p.M(p.e)}.`],
        noReach: [p => `no ★ can be reached from there next move, so it's a detour of ${p.M(p.e)}.`, p => `from there you can't aim at a ★ next move, and you lose ${p.M(p.e)}.`, p => `no ★ is one move from that square, so it takes ${p.M(p.e)} more.`],
        off: [p => `you can aim at a ★, but the route slips and costs ${p.M(p.e)}.${p.t ? ' Grab the ★ you can take first!' : ''}`, p => `you get closer, but the order goes wrong and it's ${p.M(p.e)} longer.${p.t ? ' Don\'t miss a ★ you can take right away!' : ''}`, p => `a ★ is in reach, but going round them all wastes ${p.M(p.e)}.${p.t ? ' There was a ★ to take first!' : ''}`],
      },
      done: '★ collecting done, great hopping!', go: ['Three ★ on every stage, amazing, hop! Next: 3 puzzles from the routes you just walked. Find the shortest move!', 'Well done! Next: 3 puzzles from those routes. Look for the shortest move!'],
    },
    zh: {
      M: n => n + '步', pk: { r: '车', b: '象', q: '后', k: '王', n: '马', p: '兵' }, cp: { p: '兵', n: '马', b: '象', r: '车', q: '后' },
      ask: ['出题啦，蹦！想用最少的步数收集所有★，{p}下一步走到哪？', '{p}下一步去哪儿好呢？选一条不绕远的路吧！', '剩下的★能用最少的步数拿完吗？给{p}选下一格吧！'],
      askCap: ['出题啦，蹦！想用最少的步数吃光黑子，下一步走到哪？', '先去吃哪一个？顺序才是关键哦！', '剩下的★，几步就能收完吗？选出你的下一步！'],
      askSafe: ['出题啦，蹦！避开条纹格，最快到达★的下一步是哪？', '只走安全的格子，哪一步是近路？', '安全第一，但也别浪费步数！下一步走哪？'],
      hint: {
        r: ['车只能横竖直走。哪一格能和★排在同一行或同一列？', '下一步碰不到★也没关系。想想哪一格能在第二步拿到★！', '先决定在哪里拐弯，路线就看清楚了，蹦！'],
        b: ['象只能斜着走。找找和★在同一条斜线上的格子吧！', '能不能用一条斜线把两颗★连起来？', '站在两条斜线交叉的地方，下一颗★就好拿了，蹦！'],
        q: ['后可以横、竖、斜任意走。有没有一格能同时够到两颗★？', '换个顺序，有时能省下一步哦，蹦！', '走斜线说不定是近路？八个方向都看看吧！'],
        k: ['王一次只走一格。数一数到每颗★有几格吧！', '斜走一格，等于同时横竖各走一格，蹦！', '先去哪颗★，才不用走回头路呢？'],
        n: ['把马从这里能跳到的格子全想一遍吧！', '一跳够不着★的时候，找找两跳能到的格子，蹦！', '每跳一次格子颜色都会变。看看★的颜色，算算还要跳几次！'],
        p2: '还记得吗？兵第一次走的时候可以走两格！', px: '只有吃子的时候，兵才能斜着往前走，蹦！', pf: '兵只能一格一格往前走，不能后退，要小心哦！',
        cap: '吃子之后的位置，还能瞄准下一个吗？', safe: '红色条纹的格子不能进，蹦！沿着没被攻击的格子走吧。',
      },
      good: [(x, R) => `不错，${x}正确！${R}下一题也保持这个势头！`, (x, R) => `漂亮！${x}就是最短路线，蹦！${R}`, (x, R) => `厉害，被你找到了！${x}，完美。${R}你越来越棒了！`],
      ng: [(m, x, W) => `没关系，现在学会就好！${m}才是近路，蹦。走${x}的话，${W}`, (m, x, W) => `就差一点！正解是${m}。走${x}，${W}`, (m, x, W) => `选${m}就满分啦。走${x}的话，${W}下一题一定行！`],
      R: {
        last: ['一跳拿下最后一颗★，全部到手！', '最后一颗★也收进来了，步数刚刚好！', '★一颗不剩，而且一步都没浪费！'],
        cap: [p => `吃掉黑${p.cp}，通往下一颗★的路也通了。只剩${p.M(p.r)}！`, p => `吃掉${p.cp}的这一格，正好是去下一颗的近路。`, p => `吃掉${p.cp}，再走${p.M(p.r)}就到下一颗★。顺序完美！`],
        starNx: ['拿到★的这一格，下一颗★马上就够得着。', '一边拿★，一边直通下一颗！', '就在落脚的地方，下一颗★已经在射程里了！'],
        starR: [p => `拿下这颗★之后，剩下的只要${p.M(p.r)}。`, p => `先拿这颗★，再走${p.M(p.r)}就结束了。`, p => `从这颗★出发，剩下的${p.M(p.r)}就能收完。`],
        promo: '就在这里升变成后！能走的方向一下子变多了，蹦！',
        mid: [p => `虽然还没拿★，但下一步就能够到。${p.k ? '一步都不浪费！' : '绝佳的中转站！'}`, '先停在这里，下一步就能拿到★。', '看起来像绕路，其实是去下一颗★的近路。'],
        path: [p => `从这里出发，再走${p.M(p.r)}就全收齐了。零绕路！`, p => `经过这一格，${p.M(p.r)}就能走完，蹦！`, p => `欲速则不达！这一格就在最短路线上，还剩${p.M(p.r)}。`],
      },
      W: {
        greedy: [p => `能拿到一颗★，可剩下的变远了，要多花${p.M(p.e)}。顺序很重要哦！`, p => `急着扑向眼前的★，剩下的就得绕路，损失${p.M(p.e)}。要往前多想一步！`, p => `拿到一颗★，后面却多了${p.M(p.e)}。换个顺序试试吧！`],
        pawn: ['兵不能后退，走过★所在的那一行就回不去了。', '一直往前走，斜前方的★就吃不到了。兵是不能回头的！', '往前走的兵回不来，拿★的机会就没了。'],
        dead: '就再也拿不全所有的★了。',
        cap: [p => `吃掉挡路的棋子，反而绕了${p.M(p.e)}的远路。`, p => `吃那个子是绕道，到★要多花${p.M(p.e)}。`, p => `吃了子也没离★更近，白白浪费${p.M(p.e)}。`],
        noReach: [p => `从那一格下一步一颗★都够不着，绕远了${p.M(p.e)}。`, p => `那里下一步瞄不到★，所以亏了${p.M(p.e)}。`, p => `那一格一步之内没有★，要多走${p.M(p.e)}。`],
        off: [p => `虽然能瞄准★，可路线偏了，损失${p.M(p.e)}。${p.t ? '能拿的★要先拿哦！' : ''}`, p => `离★近了，但顺序乱了，多了${p.M(p.e)}。${p.t ? '别漏掉马上能拿的★！' : ''}`, p => `有够得着的★，但全部绕一圈要浪费${p.M(p.e)}。${p.t ? '其实有一颗★可以先拿！' : ''}`],
      },
      done: '收集★完成，辛苦啦！', go: ['每关都是3颗★，太棒了，蹦！接下来用刚才的路线出3道题，选出最短的一步吧！', '做得很好！接下来用刚才的路线出3道题，找找最短的一步吧！'],
    },
    'zh-TW': {
      M: n => n + '步', pk: { r: '城堡', b: '主教', q: '皇后', k: '國王', n: '騎士', p: '士兵' }, cp: { p: '士兵', n: '騎士', b: '主教', r: '城堡', q: '皇后' },
      ask: ['出題囉，蹦！想用最少的步數收集所有★，{p}下一步走到哪？', '{p}下一步去哪裡好呢？選一條不繞遠的路吧！', '剩下的★能用最少的步數拿完嗎？幫{p}選下一格吧！'],
      askCap: ['出題囉，蹦！想用最少的步數吃光黑子，下一步走到哪？', '先去吃哪一個？順序才是關鍵喔！', '剩下的★，幾步就能收完嗎？選出你的下一步！'],
      askSafe: ['出題囉，蹦！避開條紋格，最快到達★的下一步是哪？', '只走安全的格子，哪一步是捷徑？', '安全第一，但也別浪費步數！下一步走哪？'],
      hint: {
        r: ['城堡只能橫豎直走。哪一格能和★排在同一行或同一列？', '下一步碰不到★也沒關係。想想哪一格能在第二步拿到★！', '先決定在哪裡轉彎，路線就看清楚了，蹦！'],
        b: ['主教只能斜著走。找找和★在同一條斜線上的格子吧！', '能不能用一條斜線把兩顆★連起來？', '站在兩條斜線交叉的地方，下一顆★就好拿了，蹦！'],
        q: ['皇后可以橫、豎、斜任意走。有沒有一格能同時碰到兩顆★？', '換個順序，有時能省下一步喔，蹦！', '走斜線說不定是捷徑？八個方向都看看吧！'],
        k: ['國王一次只走一格。數一數到每顆★有幾格吧！', '斜走一格，等於同時橫豎各走一格，蹦！', '先去哪顆★，才不用走回頭路呢？'],
        n: ['把騎士從這裡能跳到的格子全想一遍吧！', '一跳碰不到★的時候，找找兩跳能到的格子，蹦！', '每跳一次格子顏色都會變。看看★的顏色，算算還要跳幾次！'],
        p2: '還記得嗎？士兵第一次走的時候可以走兩格！', px: '只有吃子的時候，士兵才能斜著往前走，蹦！', pf: '士兵只能一格一格往前走，不能後退，要小心喔！',
        cap: '吃子之後的位置，還能瞄準下一個嗎？', safe: '紅色條紋的格子不能進，蹦！沿著沒被攻擊的格子走吧。',
      },
      good: [(x, R) => `不錯，${x}正確！${R}下一題也保持這個氣勢！`, (x, R) => `漂亮！${x}就是最短路線，蹦！${R}`, (x, R) => `厲害，被你找到了！${x}，完美。${R}你越來越棒了！`],
      ng: [(m, x, W) => `沒關係，現在學會就好！${m}才是捷徑，蹦。走${x}的話，${W}`, (m, x, W) => `就差一點！正解是${m}。走${x}，${W}`, (m, x, W) => `選${m}就滿分囉。走${x}的話，${W}下一題一定行！`],
      R: {
        last: ['一跳拿下最後一顆★，全部到手！', '最後一顆★也收進來了，步數剛剛好！', '★一顆不剩，而且一步都沒浪費！'],
        cap: [p => `吃掉黑${p.cp}，通往下一顆★的路也通了。只剩${p.M(p.r)}！`, p => `吃掉${p.cp}的這一格，正好是去下一顆的捷徑。`, p => `吃掉${p.cp}，再走${p.M(p.r)}就到下一顆★。順序完美！`],
        starNx: ['拿到★的這一格，下一顆★馬上就碰得到。', '一邊拿★，一邊直通下一顆！', '就在落腳的地方，下一顆★已經在射程裡了！'],
        starR: [p => `拿下這顆★之後，剩下的只要${p.M(p.r)}。`, p => `先拿這顆★，再走${p.M(p.r)}就結束了。`, p => `從這顆★出發，剩下的${p.M(p.r)}就能收完。`],
        promo: '就在這裡升變成皇后！能走的方向一下子變多了，蹦！',
        mid: [p => `雖然還沒拿★，但下一步就能碰到。${p.k ? '一步都不浪費！' : '絕佳的中繼站！'}`, '先停在這裡，下一步就能拿到★。', '看起來像繞路，其實是去下一顆★的捷徑。'],
        path: [p => `從這裡出發，再走${p.M(p.r)}就全收齊了。零繞路！`, p => `經過這一格，${p.M(p.r)}就能走完，蹦！`, p => `欲速則不達！這一格就在最短路線上，還剩${p.M(p.r)}。`],
      },
      W: {
        greedy: [p => `能拿到一顆★，可是剩下的變遠了，要多花${p.M(p.e)}。順序很重要喔！`, p => `急著撲向眼前的★，剩下的就得繞路，損失${p.M(p.e)}。要往前多想一步！`, p => `拿到一顆★，後面卻多了${p.M(p.e)}。換個順序試試吧！`],
        pawn: ['士兵不能後退，走過★所在的那一行就回不去了。', '一直往前走，斜前方的★就吃不到了。士兵是不能回頭的！', '往前走的士兵回不來，拿★的機會就沒了。'],
        dead: '就再也拿不全所有的★了。',
        cap: [p => `吃掉擋路的棋子，反而繞了${p.M(p.e)}的遠路。`, p => `吃那個子是繞道，到★要多花${p.M(p.e)}。`, p => `吃了子也沒離★更近，白白浪費${p.M(p.e)}。`],
        noReach: [p => `從那一格下一步一顆★都碰不到，繞遠了${p.M(p.e)}。`, p => `那裡下一步瞄不到★，所以虧了${p.M(p.e)}。`, p => `那一格一步之內沒有★，要多走${p.M(p.e)}。`],
        off: [p => `雖然能瞄準★，可是路線偏了，損失${p.M(p.e)}。${p.t ? '能拿的★要先拿喔！' : ''}`, p => `離★近了，但順序亂了，多了${p.M(p.e)}。${p.t ? '別漏掉馬上能拿的★！' : ''}`, p => `有碰得到的★，但全部繞一圈要浪費${p.M(p.e)}。${p.t ? '其實有一顆★可以先拿！' : ''}`],
      },
      done: '收集★完成，辛苦囉！', go: ['每關都是3顆★，太棒了，蹦！接下來用剛才的路線出3道題，選出最短的一步吧！', '做得很好！接下來用剛才的路線出3道題，找找最短的一步吧！'],
    },
    ko: {
      M: n => n + '수', pk: { r: '룩', b: '비숍', q: '퀸', k: '킹', n: '나이트', p: '폰' }, cp: { p: '폰', n: '나이트', b: '비숍', r: '룩', q: '퀸' },
      ask: ['문제 시간이야, 깡충! ★을 가장 적은 수로 모으려면, {p}의 다음 칸은 어디일까?', '{p}, 다음엔 어디로 가면 좋을까? 돌아가지 않는 길을 골라 봐!', '남은 ★을 최소한의 수로 모을 수 있을까? {p}의 다음 칸을 골라 줘!'],
      askCap: ['문제 시간이야, 깡충! 검은 기물을 가장 빨리 다 잡으려면 다음엔 어디로?', '어느 기물부터 잡으러 갈까? 순서가 포인트야!', '남은 ★, 몇 수 만에 모을 수 있을까? 다음 수를 골라 봐!'],
      askSafe: ['문제 시간이야, 깡충! 줄무늬를 피해서 ★까지 가장 빨리 가려면 다음은 어디?', '안전한 칸만 밟으면서, 지름길이 되는 수는 뭘까?', '안전이 먼저, 그래도 낭비는 없이! 다음 수는 어디야?'],
      hint: {
        r: ['룩은 가로세로로 곧게 움직여. ★과 같은 줄에 들어가는 칸이 어디일까?', '다음 수에 ★이 안 닿아도 괜찮아. 두 번째 수에 ★을 잡을 수 있는 칸을 생각해 봐!', '꺾는 칸을 먼저 정하면 길이 보이기 시작해, 깡충!'],
        b: ['비숍은 대각선으로만 움직여. ★과 같은 대각선에 있는 칸을 찾아봐!', '★ 두 개를 하나의 대각선으로 이을 수 없을까?', '대각선 두 개가 만나는 칸에 서면 다음 ★을 잡기 쉬워, 깡충!'],
        q: ['퀸은 가로, 세로, 대각선 어디로든 갈 수 있어. ★ 두 개에 모두 닿는 칸이 있을까?', '잡는 순서를 바꾸면 한 수를 아낄 때도 있어, 깡충!', '대각선이 지름길일지도? 여덟 방향을 다 살펴봐!'],
        k: ['킹은 한 칸씩만 움직여. 각 ★까지 몇 칸인지 세어 보자!', '대각선으로 한 칸 가면 가로와 세로를 동시에 한 칸씩 가는 거야, 깡충!', '어느 ★부터 돌면 왔다 갔다 하지 않아도 될까?'],
        n: ['지금 칸에서 나이트가 뛸 수 있는 곳을 전부 떠올려 봐!', '한 번에 ★에 안 닿으면, 두 번 뛰어서 닿는 칸을 찾아봐, 깡충!', '뛸 때마다 칸 색이 바뀌어. ★의 칸 색으로 몇 번 더 뛰어야 할지 생각해 봐!'],
        p2: '기억나? 폰은 맨 처음 한 번만 두 칸 갈 수 있어!', px: '기물을 잡을 때만 폰은 대각선 앞으로 갈 수 있어, 깡충!', pf: '폰은 앞으로 한 칸씩만 가고 뒤로는 못 가. 신중하게!',
        cap: '잡은 다음 그 자리에서도 다음 기물을 노릴 수 있을까?', safe: '빨간 줄무늬 칸에는 들어갈 수 없어, 깡충! 공격받지 않는 칸을 따라가 보자.',
      },
      good: [(x, R) => `좋아, ${x} 정답! ${R} 다음 문제도 이 기세로 가자!`, (x, R) => `훌륭해! 최단 코스는 바로 ${x}, 깡충! ${R}`, (x, R) => `대단해, 잘 찾았어! ${x}, 딱 맞아. ${R} 점점 실력이 늘고 있어!`],
      ng: [(m, x, W) => `괜찮아, 지금 익히면 돼! 지름길은 바로 ${m}, 깡충. ${x} 수는 ${W}`, (m, x, W) => `아깝다! 정답은 ${m}. ${x}(으)로 가면 ${W}`, (m, x, W) => `${m} 수를 골랐다면 만점이었어. ${x} 수로 두면 ${W} 다음엔 할 수 있어!`],
      R: {
        last: ['마지막 ★까지 단숨에! 이제 전부 모았어.', '남은 ★을 한 번에 회수! 수도 딱 맞아.', '★이 하나도 안 남았어. 낭비한 수가 하나도 없어!'],
        cap: [p => `검은 ${p.cp}까지 잡고, 다음 ★으로 가는 길도 열려. 이제 ${p.M(p.r)}만 남았어!`, p => `${p.cp} 잡은 칸이 그대로 다음 ★으로 가는 지름길이야.`, p => `${p.cp} 잡고 다음 ★까지 ${p.M(p.r)}. 순서가 완벽해!`],
        starNx: ['★을 잡은 칸에서 다음 ★에도 바로 닿거든.', '★을 잡으면서 다음 ★까지 한 줄로 이어져!', '내려선 그 자리에서 다음 ★이 벌써 사정거리야!'],
        starR: [p => `이 ★을 잡고 나면 나머지는 ${p.M(p.r)}이면 끝나.`, p => `이 ★을 먼저 잡아 두면 ${p.M(p.r)}만 더 가면 돼.`, p => `이 ★에서라면 나머지도 ${p.M(p.r)}에 돌 수 있어.`],
        promo: '여기서 승격해서 퀸으로! 갈 수 있는 방향이 확 늘어나, 깡충!',
        mid: [p => `아직 ★은 안 잡지만, 다음 수에 ★에 닿는 칸이야. ${p.k ? '헛걸음이 하나도 없어!' : '딱 좋은 중간 지점이야!'}`, '일단 여기에 들르면 바로 다음 수에 ★에 닿아.', '돌아가는 것 같지만, 사실은 다음 ★으로 가는 지름길이야.'],
        path: [p => `여기서라면 ${p.M(p.r)}만 더 두면 전부 모여. 돌아가는 길 제로!`, p => `이 칸을 지나면 ${p.M(p.r)}에 끝나는 길이 돼, 깡충!`, p => `급할수록 돌아가라! 여기가 남은 ${p.M(p.r)}의 최단 코스야.`],
      },
      W: {
        greedy: [p => `★은 잡지만, 남은 ★이 멀어져서 ${p.M(p.e)}가 더 들어. 잡는 순서가 중요해!`, p => `눈앞의 ★에 달려들면 나머지가 돌아가는 길이 돼서 ${p.M(p.e)} 손해야. 앞을 내다보는 게 요령!`, p => `★ 하나는 잡아도 그다음이 ${p.M(p.e)} 길어져. 순서를 바꿔 보자!`],
        pawn: ['폰은 뒤로 못 가니까, ★이 있는 줄을 지나치면 다시 잡으러 갈 수 없어.', '앞으로 곧장 가면 대각선 앞의 ★을 못 잡게 돼. 폰은 되돌아갈 수 없거든!', '앞으로 간 폰은 돌아오지 못해. ★을 잡을 기회가 사라져 버려.'],
        dead: '이제 ★을 전부 모을 수 없게 돼.',
        cap: [p => `길을 막던 기물을 잡아도, ★까지 ${p.M(p.e)} 돌아가게 돼.`, p => `그 기물을 잡는 건 샛길이야. ★까지 ${p.M(p.e)}가 더 들어.`, p => `기물을 잡아도 ★에 가까워지지 않아서 ${p.M(p.e)}를 낭비해.`],
        noReach: [p => `그 칸에서는 다음 수에 닿는 ★이 하나도 없어서 ${p.M(p.e)} 돌아가게 돼.`, p => `다음 수에 ★을 노릴 수 없는 자리라서 ${p.M(p.e)} 손해야.`, p => `그 칸에서 한 수에 닿는 ★이 없어서 ${p.M(p.e)}가 더 걸려.`],
        off: [p => `★을 노릴 수는 있지만, 길이 어긋나서 ${p.M(p.e)} 손해야.${p.t ? ' 잡을 수 있는 ★은 먼저 잡자!' : ''}`, p => `★에 가까워지긴 해도 도는 순서가 어긋나서 ${p.M(p.e)} 길어져.${p.t ? ' 바로 잡을 수 있는 ★을 놓치지 마!' : ''}`, p => `닿는 ★은 있지만, 전부 돌면 ${p.M(p.e)}를 낭비해.${p.t ? ' 먼저 잡을 수 있는 ★이 있었거든.' : ''}`],
      },
      done: '★ 모으기 수고했어!', go: ['전부 ★ 3개, 굉장해, 깡충! 이제 방금 지나온 길에서 문제 3개. 가장 짧은 수를 골라 봐!', '잘했어! 이제 방금 지나온 길에서 문제 3개. 가장 짧은 수를 찾아보자!'],
    },
    es: {
      M: n => n === 1 ? 'una jugada' : n + ' jugadas', pk: { r: 'tu torre', b: 'tu alfil', q: 'tu dama', k: 'tu rey', n: 'tu caballo', p: 'tu peón' }, cp: { p: 'el peón', n: 'el caballo', b: 'el alfil', r: 'la torre', q: 'la dama' },
      ask: ['¡Hora del reto, hop! Para juntar todas las ★ en el menor número de jugadas, ¿adónde va {p}?', '¿Adónde mueves {p} ahora? ¡Elige el camino sin rodeos!', '¿Puedes recoger las que quedan con las mínimas jugadas? ¡Elige la próxima casilla para {p}!'],
      askCap: ['¡Hora del reto, hop! Para capturarlas todas en pocas jugadas, ¿adónde vas ahora?', '¿Qué pieza vas a buscar primero? ¡El orden es la clave!', '¿Puedes recoger las ★ que quedan en pocas jugadas? ¡Elige tu siguiente jugada!'],
      askSafe: ['¡Hora del reto, hop! Esquivando las rayas, ¿cuál es el camino más corto hacia la ★?', 'Pisando solo casillas seguras, ¿qué jugada es el atajo?', '¡Primero la seguridad, pero sin jugadas de más! ¿Adónde ahora?'],
      hint: {
        r: ['La torre va recta: arriba, abajo y a los lados. ¿Qué casilla la alinea con una ★?', '¿Ninguna ★ a tu alcance todavía? No pasa nada. ¡Busca una casilla desde la que la atrapes en la siguiente!', 'Decide en qué esquina gira tu ruta y verás el camino, ¡hop!'],
        b: ['El alfil solo va en diagonal. ¡Busca una casilla en diagonal con una ★!', '¿Se pueden unir dos ★ con una sola diagonal?', 'Ponte donde se cruzan dos diagonales y la siguiente ★ quedará a mano, ¡hop!'],
        q: ['La dama va recta o en diagonal. ¿Hay una casilla que alcance las dos ★?', 'Cambiar el orden a veces ahorra una jugada, ¡hop!', '¿Y si la diagonal es el atajo? ¡Mira las ocho direcciones!'],
        k: ['El rey avanza de una en una. ¡Cuenta las casillas hasta cada ★!', 'Un paso en diagonal avanza una columna y una fila a la vez, ¡hop!', '¿Por qué ★ empezar para no tener que volver atrás?'],
        n: ['¡Imagina todas las casillas a las que puede saltar tu caballo desde aquí!', 'Si ninguna ★ está a un salto, busca una que esté a dos, ¡hop!', 'Cada salto cambia el color de la casilla. ¡Usa el color de la ★ para contar los saltos!'],
        p2: '¿Te acuerdas? ¡En su primera jugada, el peón puede avanzar dos casillas!', px: 'Solo al capturar avanza el peón en diagonal, ¡hop!', pf: 'El peón avanza recto, de casilla en casilla, y nunca retrocede. ¡Con cuidado!',
        cap: 'Desde la casilla donde capturas, ¿alcanzas la siguiente pieza?', safe: 'No puedes pisar las rayas rojas, ¡hop! Avanza por casillas que nadie ataca.',
      },
      good: [(x, R) => `¡Muy bien, ${x} es correcto! ${R} ¡Sigue así en la próxima!`, (x, R) => `¡Genial! ${x} es la ruta más corta, ¡hop! ${R}`, (x, R) => `¡Qué buen ojo! ${x}, perfecto. ${R} ¡Cada vez lo haces mejor!`],
      ng: [(m, x, W) => `¡Tranquilo, así se aprende! ${m} era el atajo, ¡hop! Con ${x}, ${W}`, (m, x, W) => `¡Casi! La respuesta es ${m}. Tras ${x}, ${W}`, (m, x, W) => `Con ${m} habría sido perfecto. Jugando ${x}, ${W} ¡La próxima te sale!`],
      R: {
        last: ['¡Un salto hasta la última ★ y ya están todas!', '¡La última ★ es tuya, justo en el objetivo!', '¡No queda ninguna ★ y sin una sola jugada de más!'],
        cap: [p => `Capturas ${p.cp} y el camino a la siguiente ★ sigue abierto. ¡Solo ${p.M(p.r)} más!`, p => `La casilla donde capturas ${p.cp} es un atajo hacia la siguiente.`, p => `Capturas ${p.cp} y luego solo ${p.M(p.r)} hasta la siguiente ★. ¡Orden perfecto!`],
        starNx: ['Desde la ★ que acabas de tomar, la siguiente ya está a tu alcance.', 'Tomas una ★ y quedas en línea con la siguiente.', '¡Justo donde caíste, la siguiente ★ ya está a tiro!'],
        starR: [p => `Después de esta ★, el resto solo lleva ${p.M(p.r)}.`, p => `Toma esta ★ primero y terminas en ${p.M(p.r)}.`, p => `Desde esta ★ recoges el resto en ${p.M(p.r)}.`],
        promo: '¡Corona aquí y conviértete en dama! Ahora puedes ir en todas las direcciones, ¡hop!',
        mid: [p => `Aún no tomas ninguna ★, pero desde aquí una queda a tu alcance. ${p.k ? '¡Ni un paso de más!' : '¡El trampolín perfecto!'}`, 'Parar aquí primero te deja alcanzar una ★ en la jugada siguiente.', 'Parece un rodeo, pero en realidad es el atajo a la siguiente ★.'],
        path: [p => `Desde aquí, todas las ★ te llevan solo ${p.M(p.r)} más. ¡Cero rodeos!`, p => `Pasa por esta casilla y terminas en ${p.M(p.r)}, ¡hop!`, p => `¡Despacio y con buena letra! Esta casilla está en la ruta más corta: quedan ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `tomas una ★, pero las demás quedan lejos y te cuesta ${p.M(p.e)} de más. ¡El orden importa!`, p => `lanzarte a la ★ más cercana convierte el resto en un rodeo: pierdes ${p.M(p.e)}. ¡Mira más allá!`, p => `una ★ sale fácil, pero el resto tarda ${p.M(p.e)} más. ¡Prueba otro orden!`],
        pawn: ['el peón no puede retroceder, así que si pasas la fila de la ★ ya no puedes volver a por ella.', 'si sigues recto, pierdes la ★ en diagonal. ¡El peón nunca vuelve atrás!', 'un peón que avanza no puede regresar, y la ocasión de tomar la ★ se esfuma.'],
        dead: 'ya no puedes recoger todas las ★.',
        cap: [p => `capturar esa pieza que estorba te desvía ${p.M(p.e)}.`, p => `esa captura es un desvío: ${p.M(p.e)} de más hasta la ★.`, p => `la captura no te acerca a ninguna ★ y desperdicias ${p.M(p.e)}.`],
        noReach: [p => `desde ahí ninguna ★ queda a una jugada, así que das un rodeo de ${p.M(p.e)}.`, p => `desde ahí no apuntas a ninguna ★ en la siguiente, y pierdes ${p.M(p.e)}.`, p => `no hay ninguna ★ a una jugada de esa casilla, así que tardas ${p.M(p.e)} más.`],
        off: [p => `apuntas a una ★, pero la ruta se tuerce y cuesta ${p.M(p.e)}.${p.t ? ' ¡Toma primero la ★ que tienes a mano!' : ''}`, p => `te acercas, pero el orden falla y son ${p.M(p.e)} más.${p.t ? ' ¡No dejes pasar una ★ que puedes tomar ya!' : ''}`, p => `hay una ★ a tiro, pero recorrerlas todas desperdicia ${p.M(p.e)}.${p.t ? ' ¡Había una ★ para tomar primero!' : ''}`],
      },
      done: '¡Estrellas recogidas, qué buenos saltos!', go: ['¡Tres ★ en todas las fases, increíble, hop! Ahora, 3 retos con las rutas que acabas de recorrer. ¡Busca la jugada más corta!', '¡Bien hecho! Ahora, 3 retos con esas rutas. ¡Busca la jugada más corta!'],
    },
    fr: {
      M: n => n === 1 ? 'un coup' : n + ' coups', pk: { r: 'ta tour', b: 'ton fou', q: 'ta dame', k: 'ton roi', n: 'ton cavalier', p: 'ton pion' }, cp: { p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame' },
      ask: ['C\'est l\'heure du défi, hop ! Pour ramasser toutes les ★ en un minimum de coups, où va {p} ?', 'Où vas-tu poser {p} maintenant ? Choisis la route sans détour !', 'Peux-tu ramasser le reste en un minimum de coups ? Choisis la prochaine case pour {p} !'],
      askCap: ['C\'est l\'heure du défi, hop ! Pour toutes les prendre en un minimum de coups, où vas-tu ?', 'Quelle pièce vas-tu chercher d\'abord ? L\'ordre, c\'est la clé !', 'Peux-tu ramasser les ★ restantes en quelques coups ? Choisis ton prochain coup !'],
      askSafe: ['C\'est l\'heure du défi, hop ! En évitant les rayures, quel est le chemin le plus court vers la ★ ?', 'En ne passant que par des cases sûres, quel coup est le raccourci ?', 'La sécurité d\'abord, mais sans coup inutile ! Où vas-tu ?'],
      hint: {
        r: ['La tour va tout droit : en haut, en bas et sur les côtés. Quelle case l\'aligne avec une ★ ?', 'Aucune ★ à portée pour l\'instant ? Pas grave. Trouve une case d\'où tu l\'attrapes au coup suivant !', 'Choisis le coin où ta route tourne, et le chemin apparaît, hop !'],
        b: ['Le fou ne va qu\'en diagonale. Cherche une case sur une diagonale avec une ★ !', 'Peut-on relier deux ★ par une seule diagonale ?', 'Place-toi au croisement de deux diagonales et la ★ suivante sera facile, hop !'],
        q: ['La dame va tout droit ou en diagonale. Y a-t-il une case qui touche les deux ★ ?', 'Changer l\'ordre peut faire gagner un coup, hop !', 'Et si la diagonale était le raccourci ? Regarde les huit directions !'],
        k: ['Le roi avance d\'une case à la fois. Compte les cases jusqu\'à chaque ★ !', 'Un pas en diagonale avance d\'une colonne et d\'une rangée à la fois, hop !', 'Par quelle ★ commencer pour ne jamais revenir sur tes pas ?'],
        n: ['Imagine toutes les cases où ton cavalier peut sauter d\'ici !', 'Si aucune ★ n\'est à un saut, cherche-en une à deux sauts, hop !', 'Chaque saut change la couleur de la case. Sers-toi de la couleur de la ★ pour compter les sauts !'],
        p2: 'Tu te souviens ? À son tout premier coup, le pion peut avancer de deux cases !', px: 'C\'est seulement pour prendre que le pion avance en diagonale, hop !', pf: 'Le pion avance tout droit, une case à la fois, et ne recule jamais. Prudence !',
        cap: 'Depuis la case où tu prends, peux-tu viser la pièce suivante ?', safe: 'Tu ne peux pas marcher sur les rayures rouges, hop ! Passe par les cases que personne n\'attaque.',
      },
      good: [(x, R) => `Bien joué, ${x} est juste ! ${R} Continue comme ça au suivant !`, (x, R) => `Bravo ! ${x} est le chemin le plus court, hop ! ${R}`, (x, R) => `Quel coup d\'œil ! ${x}, parfait. ${R} Tu progresses à vue d\'œil !`],
      ng: [(m, x, W) => `Pas grave, maintenant tu sais ! ${m} était le raccourci, hop. Avec ${x}, ${W}`, (m, x, W) => `Presque ! La réponse est ${m}. Après ${x}, ${W}`, (m, x, W) => `${m} aurait été parfait. En jouant ${x}, ${W} Tu auras le prochain !`],
      R: {
        last: ['Un bond jusqu\'à la dernière ★, et elles y sont toutes !', 'La dernière ★ est à toi, pile dans l\'objectif !', 'Plus aucune ★, et pas un seul coup perdu !'],
        cap: [p => `Tu prends ${p.cp} et la route vers la ★ suivante reste ouverte. Plus que ${p.M(p.r)} !`, p => `La case où tu prends ${p.cp} est un raccourci vers la suivante.`, p => `Tu prends ${p.cp}, puis seulement ${p.M(p.r)} jusqu\'à la ★ suivante. Ordre parfait !`],
        starNx: ['Depuis la ★ que tu viens de prendre, la suivante est déjà à portée.', 'Tu prends une ★ et tu t\'alignes sur la suivante !', 'Juste là où tu as atterri, la ★ suivante est déjà dans le viseur !'],
        starR: [p => `Après cette ★, le reste ne prend que ${p.M(p.r)}.`, p => `Prends d\'abord cette ★ et tu as fini en ${p.M(p.r)}.`, p => `Depuis cette ★, tu ramasses le reste en ${p.M(p.r)}.`],
        promo: 'Promotion en dame, juste ici ! Maintenant tu vas dans toutes les directions, hop !',
        mid: [p => `Pas encore de ★, mais d\'ici l\'une d\'elles est à portée au coup suivant. ${p.k ? 'Pas un pas de trop !' : 'Le tremplin idéal !'}`, 'T\'arrêter ici d\'abord te permet d\'atteindre une ★ dès le coup suivant.', 'On dirait un détour, mais c\'est en fait le raccourci vers la ★ suivante.'],
        path: [p => `D\'ici, toutes les ★ ne demandent que ${p.M(p.r)} de plus. Zéro détour !`, p => `Passe par cette case et tu finis en ${p.M(p.r)}, hop !`, p => `Doucement mais sûrement ! Cette case est sur la route la plus courte : encore ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `tu prends une ★, mais les autres s\'éloignent et ça coûte ${p.M(p.e)} de plus. L\'ordre compte !`, p => `foncer sur la ★ la plus proche transforme le reste en détour : ${p.M(p.e)} de perdus. Regarde plus loin !`, p => `une ★ vient facilement, mais le reste prend ${p.M(p.e)} de plus. Essaie un autre ordre !`],
        pawn: ['le pion ne recule pas : une fois la rangée de la ★ dépassée, impossible d\'y revenir.', 'en avançant tout droit, tu perds la ★ en diagonale. Le pion ne revient jamais en arrière !', 'un pion qui avance ne peut pas revenir, et la chance de prendre la ★ s\'envole.'],
        dead: 'tu ne peux plus ramasser toutes les ★.',
        cap: [p => `prendre cette pièce gênante te fait faire un détour de ${p.M(p.e)}.`, p => `cette prise est un crochet : ${p.M(p.e)} de plus jusqu\'à la ★.`, p => `la prise ne te rapproche d\'aucune ★, et tu gâches ${p.M(p.e)}.`],
        noReach: [p => `aucune ★ n\'est à un coup de là, donc c\'est un détour de ${p.M(p.e)}.`, p => `de là, tu ne vises aucune ★ au coup suivant, et tu perds ${p.M(p.e)}.`, p => `aucune ★ n\'est à un coup de cette case, il faut donc ${p.M(p.e)} de plus.`],
        off: [p => `tu vises une ★, mais la route dévie et coûte ${p.M(p.e)}.${p.t ? ' Prends d\'abord la ★ qui est à portée !' : ''}`, p => `tu t\'approches, mais l\'ordre cloche et c\'est ${p.M(p.e)} de plus.${p.t ? ' Ne rate pas une ★ que tu peux prendre tout de suite !' : ''}`, p => `une ★ est à portée, mais faire le tour de toutes gâche ${p.M(p.e)}.${p.t ? ' Il y avait une ★ à prendre d\'abord !' : ''}`],
      },
      done: 'Étoiles ramassées, quels beaux bonds !', go: ['Trois ★ partout, incroyable, hop ! Maintenant, 3 défis tirés des routes que tu viens de parcourir. Trouve le coup le plus court !', 'Bien joué ! Maintenant, 3 défis tirés de ces routes. Cherche le coup le plus court !'],
    },
    pt: {
      M: n => n === 1 ? 'um lance' : n + ' lances', pk: { r: 'sua torre', b: 'seu bispo', q: 'sua dama', k: 'seu rei', n: 'seu cavalo', p: 'seu peão' }, cp: { p: 'o peão', n: 'o cavalo', b: 'o bispo', r: 'a torre', q: 'a dama' },
      ask: ['Hora do desafio, hop! Para pegar todas as ★ com o mínimo de lances, para onde vai {p}?', 'Para onde vai {p} agora? Escolha o caminho sem desvios!', 'Dá para pegar o resto com o mínimo de lances? Escolha a próxima casa para {p}!'],
      askCap: ['Hora do desafio, hop! Para capturar todas com poucos lances, para onde você vai agora?', 'Qual peça você vai buscar primeiro? A ordem é o segredo!', 'Dá para recolher as ★ que faltam em poucos lances? Escolha seu próximo lance!'],
      askSafe: ['Hora do desafio, hop! Desviando das listras, qual é o caminho mais curto até a ★?', 'Pisando só em casas seguras, qual lance é o atalho?', 'Segurança em primeiro lugar, mas sem lance à toa! Para onde agora?'],
      hint: {
        r: ['A torre anda reto: para cima, para baixo e para os lados. Qual casa a alinha com uma ★?', 'Nenhuma ★ ao alcance ainda? Tudo bem. Ache uma casa de onde você pega uma no lance seguinte!', 'Decida a esquina onde sua rota vira, e o caminho aparece, hop!'],
        b: ['O bispo só anda na diagonal. Procure uma casa na mesma diagonal de uma ★!', 'Dá para ligar duas ★ com uma única diagonal?', 'Pare onde duas diagonais se cruzam e a próxima ★ fica fácil, hop!'],
        q: ['A dama anda reto ou na diagonal. Existe uma casa que alcança as duas ★?', 'Mudar a ordem às vezes economiza um lance, hop!', 'E se a diagonal for o atalho? Olhe as oito direções!'],
        k: ['O rei anda uma casa por vez. Conte as casas até cada ★!', 'Um passo na diagonal avança uma coluna e uma fileira ao mesmo tempo, hop!', 'Por qual ★ começar para não precisar voltar?'],
        n: ['Imagine todas as casas para onde seu cavalo pode pular daqui!', 'Se nenhuma ★ está a um pulo, procure uma a dois pulos, hop!', 'Cada pulo troca a cor da casa. Use a cor da ★ para contar os pulos!'],
        p2: 'Lembra? No primeiríssimo lance, o peão pode andar duas casas!', px: 'Só quando captura é que o peão anda na diagonal, hop!', pf: 'O peão anda reto, uma casa por vez, e nunca volta. Cuidado!',
        cap: 'Da casa onde você captura, dá para mirar a próxima peça?', safe: 'Não dá para pisar nas listras vermelhas, hop! Vá pelas casas que ninguém ataca.',
      },
      good: [(x, R) => `Boa, ${x} está certo! ${R} Continue assim no próximo!`, (x, R) => `Mandou bem! ${x} é a rota mais curta, hop! ${R}`, (x, R) => `Que olho bom! ${x}, perfeito. ${R} Você está cada vez melhor!`],
      ng: [(m, x, W) => `Tudo bem, agora você aprendeu! ${m} era o atalho, hop. Com ${x}, ${W}`, (m, x, W) => `Quase! A resposta é ${m}. Depois de ${x}, ${W}`, (m, x, W) => `Com ${m} teria sido perfeito. Jogando ${x}, ${W} No próximo você acerta!`],
      R: {
        last: ['Um pulo até a última ★, e pronto, pegou todas!', 'A última ★ é sua, bem no alvo!', 'Nenhuma ★ sobrando, e nem um lance desperdiçado!'],
        cap: [p => `Você captura ${p.cp} e o caminho para a próxima ★ continua aberto. Só faltam ${p.M(p.r)}!`, p => `A casa onde você captura ${p.cp} é um atalho para a próxima.`, p => `Captura ${p.cp} e depois só ${p.M(p.r)} até a próxima ★. Ordem perfeita!`],
        starNx: ['Da ★ que você acabou de pegar, a próxima já está ao alcance.', 'Pega uma ★ e já fica alinhado com a próxima!', 'Bem onde você parou, a próxima ★ já está na mira!'],
        starR: [p => `Depois desta ★, o resto leva só ${p.M(p.r)}.`, p => `Pegue esta ★ primeiro e você termina em ${p.M(p.r)}.`, p => `A partir desta ★, você recolhe o resto em ${p.M(p.r)}.`],
        promo: 'Promova a dama bem aqui! Agora dá para ir em todas as direções, hop!',
        mid: [p => `Ainda sem ★, mas daqui uma fica ao alcance no próximo lance. ${p.k ? 'Nem um passo a mais!' : 'O trampolim perfeito!'}`, 'Parar aqui primeiro deixa você alcançar uma ★ logo no lance seguinte.', 'Parece desvio, mas é o atalho para a próxima ★.'],
        path: [p => `Daqui, todas as ★ levam só mais ${p.M(p.r)}. Zero desvios!`, p => `Passe por esta casa e você termina em ${p.M(p.r)}, hop!`, p => `Devagar e sempre! Esta casa está na rota mais curta: faltam ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `você pega uma ★, mas as outras ficam longe e custa ${p.M(p.e)} a mais. A ordem importa!`, p => `pular na ★ mais próxima vira desvio para o resto: ${p.M(p.e)} perdidos. Olhe mais adiante!`, p => `uma ★ vem fácil, mas o resto demora ${p.M(p.e)} a mais. Tente outra ordem!`],
        pawn: ['o peão não volta, então, se passar da fileira da ★, não dá para buscá-la.', 'seguindo reto, você perde a ★ na diagonal. O peão nunca volta!', 'um peão que avança não pode voltar, e a chance de pegar a ★ some.'],
        dead: 'você não consegue mais pegar todas as ★.',
        cap: [p => `capturar essa peça no caminho desvia você em ${p.M(p.e)}.`, p => `essa captura é um desvio: ${p.M(p.e)} a mais até a ★.`, p => `a captura não aproxima você de nenhuma ★, e desperdiça ${p.M(p.e)}.`],
        noReach: [p => `dali nenhuma ★ fica a um lance, então é um desvio de ${p.M(p.e)}.`, p => `dali você não mira nenhuma ★ no lance seguinte, e perde ${p.M(p.e)}.`, p => `não há ★ a um lance daquela casa, então leva ${p.M(p.e)} a mais.`],
        off: [p => `você mira uma ★, mas a rota desvia e custa ${p.M(p.e)}.${p.t ? ' Pegue primeiro a ★ que está ao alcance!' : ''}`, p => `você se aproxima, mas a ordem falha e são ${p.M(p.e)} a mais.${p.t ? ' Não deixe passar uma ★ que dá para pegar já!' : ''}`, p => `há uma ★ ao alcance, mas rodar todas desperdiça ${p.M(p.e)}.${p.t ? ' Tinha uma ★ para pegar primeiro!' : ''}`],
      },
      done: 'Estrelas recolhidas, que pulos bonitos!', go: ['Três ★ em todas as fases, incrível, hop! Agora, 3 desafios das rotas que você acabou de fazer. Ache o lance mais curto!', 'Muito bem! Agora, 3 desafios dessas rotas. Procure o lance mais curto!'],
    },
    de: {
      M: n => n === 1 ? 'einen Zug' : n + ' Züge', MD: n => n === 1 ? 'einem Zug' : n + ' Zügen', pk: { r: 'deinen Turm', b: 'deinen Läufer', q: 'deine Dame', k: 'deinen König', n: 'deinen Springer', p: 'deinen Bauern' }, cp: { p: 'den Bauern', n: 'den Springer', b: 'den Läufer', r: 'den Turm', q: 'die Dame' },
      ask: ['Rätselzeit, hopp! Um alle ★ mit möglichst wenigen Zügen zu holen: Wohin ziehst du {p}?', 'Wohin ziehst du {p} jetzt? Such dir den Weg ohne Umwege!', 'Schaffst du den Rest mit möglichst wenigen Zügen? Wähl das nächste Feld für {p}!'],
      askCap: ['Rätselzeit, hopp! Um alle mit wenigen Zügen zu schlagen: Wohin geht es jetzt?', 'Welche Figur holst du dir zuerst? Die Reihenfolge ist der Schlüssel!', 'Schaffst du die restlichen ★ in wenigen Zügen? Wähl deinen nächsten Zug!'],
      askSafe: ['Rätselzeit, hopp! An den Streifen vorbei: Welcher Weg zum ★ ist der kürzeste?', 'Nur über sichere Felder: Welcher Zug ist die Abkürzung?', 'Sicherheit zuerst, aber ohne Zug zu verschenken! Wohin jetzt?'],
      hint: {
        r: ['Der Turm zieht gerade: hoch, runter und zur Seite. Welches Feld bringt ihn in eine Linie mit einem ★?', 'Noch kein ★ in Reichweite? Kein Problem. Such ein Feld, von dem du im nächsten Zug eins erwischst!', 'Leg die Ecke fest, an der dein Weg abbiegt, dann siehst du den Pfad, hopp!'],
        b: ['Der Läufer zieht nur schräg. Such ein Feld auf einer Diagonale mit einem ★!', 'Lassen sich zwei ★ mit einer einzigen Diagonale verbinden?', 'Stell dich dorthin, wo sich zwei Diagonalen kreuzen, dann ist der nächste ★ leicht zu holen, hopp!'],
        q: ['Die Dame zieht gerade oder schräg. Gibt es ein Feld, das beide ★ erreicht?', 'Eine andere Reihenfolge spart manchmal einen Zug, hopp!', 'Vielleicht ist die Diagonale die Abkürzung? Schau in alle acht Richtungen!'],
        k: ['Der König geht immer nur ein Feld. Zähl die Felder bis zu jedem ★!', 'Ein Schritt schräg bringt dich eine Linie und eine Reihe zugleich weiter, hopp!', 'Mit welchem ★ fängst du an, damit du nie zurücklaufen musst?'],
        n: ['Stell dir alle Felder vor, auf die dein Springer von hier springen kann!', 'Wenn kein ★ einen Sprung entfernt ist, such eins, das zwei Sprünge entfernt ist, hopp!', 'Jeder Sprung wechselt die Feldfarbe. Zähl mit der Farbe des ★ die Sprünge!'],
        p2: 'Weißt du noch? Bei seinem allerersten Zug darf der Bauer zwei Felder vorrücken!', px: 'Nur beim Schlagen zieht der Bauer schräg nach vorn, hopp!', pf: 'Der Bauer zieht geradeaus, ein Feld nach dem anderen, und nie zurück. Vorsicht!',
        cap: 'Kannst du vom Feld, auf dem du schlägst, die nächste Figur anpeilen?', safe: 'Die roten Streifen darfst du nicht betreten, hopp! Nimm die Felder, die niemand angreift.',
      },
      good: [(x, R) => `Super, ${x} ist richtig! ${R} Mach beim nächsten genauso weiter!`, (x, R) => `Klasse! ${x} ist der kürzeste Weg, hopp! ${R}`, (x, R) => `Gut gesehen! ${x}, genau richtig. ${R} Du wirst immer besser!`],
      ng: [(m, x, W) => `Macht nichts, jetzt weißt du es! ${m} war die Abkürzung, hopp. Mit ${x} ${W}`, (m, x, W) => `Knapp daneben! Die Lösung ist ${m}. Nach ${x} ${W}`, (m, x, W) => `Mit ${m} wäre es perfekt gewesen. Spielst du ${x}, ${W} Beim nächsten klappt's!`],
      R: {
        last: ['Ein Sprung zum letzten ★, und alle sind eingesammelt!', 'Der letzte ★ gehört dir, genau im Ziel!', 'Kein ★ mehr übrig, und kein einziger Zug verschenkt!'],
        cap: [p => `Du schlägst ${p.cp}, und der Weg zum nächsten ★ bleibt frei. Nur noch ${p.M(p.r)}!`, p => `Das Feld, auf dem du ${p.cp} schlägst, ist eine Abkürzung zum nächsten.`, p => `Du schlägst ${p.cp}, dann nur noch ${p.M(p.r)} bis zum nächsten ★. Perfekte Reihenfolge!`],
        starNx: ['Von dem ★, den du gerade geholt hast, ist der nächste schon in Reichweite.', 'Du holst einen ★ und stehst direkt in Linie mit dem nächsten!', 'Genau da, wo du gelandet bist, ist der nächste ★ schon im Visier!'],
        starR: [p => `Nach diesem ★ braucht der Rest nur noch ${p.M(p.r)}.`, p => `Hol erst diesen ★, dann bist du in ${p.MD(p.r)} fertig.`, p => `Von diesem ★ aus sammelst du den Rest in ${p.MD(p.r)} ein.`],
        promo: 'Hier umwandeln in eine Dame! Jetzt kannst du in alle Richtungen ziehen, hopp!',
        mid: [p => `Noch kein ★, aber von hier ist einer im nächsten Zug erreichbar. ${p.k ? 'Kein Schritt zu viel!' : 'Das perfekte Sprungbrett!'}`, 'Erst hier anzuhalten bringt dich gleich im nächsten Zug an einen ★.', 'Sieht aus wie ein Umweg, ist aber die Abkürzung zum nächsten ★.'],
        path: [p => `Von hier aus brauchst du für alle ★ nur noch ${p.M(p.r)}. Null Umwege!`, p => `Geh über dieses Feld, dann bist du in ${p.MD(p.r)} fertig, hopp!`, p => `Langsam, aber sicher! Dieses Feld liegt auf dem kürzesten Weg: noch ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `holst du zwar einen ★, aber die anderen liegen dann weit weg, und es kostet ${p.M(p.e)} extra. Die Reihenfolge zählt!`, p => `wird der Rest zum Umweg, wenn du dich auf den nächsten ★ stürzt: ${p.M(p.e)} verloren. Schau weiter voraus!`, p => `ist ein ★ leicht zu haben, aber der Rest dauert ${p.M(p.e)} länger. Probier eine andere Reihenfolge!`],
        pawn: ['kommst du nicht mehr zurück: Bauern ziehen nie rückwärts, und hinter der Reihe des ★ ist er verloren.', 'verpasst du den ★ schräg vor dir, wenn du geradeaus ziehst. Bauern gehen nie zurück!', 'kann der Bauer nicht mehr zurück, und die Chance auf den ★ ist weg.'],
        dead: 'kannst du nicht mehr alle ★ einsammeln.',
        cap: [p => `bringt dich das Schlagen der störenden Figur ${p.M(p.e)} vom Weg ab.`, p => `ist das Schlagen ein Abstecher: ${p.M(p.e)} extra bis zum ★.`, p => `bringt dich das Schlagen keinem ★ näher, und du verschenkst ${p.M(p.e)}.`],
        noReach: [p => `ist von dort im nächsten Zug kein ★ erreichbar, also kostet der Umweg ${p.M(p.e)}.`, p => `zielst du von dort im nächsten Zug auf keinen ★ und verlierst ${p.M(p.e)}.`, p => `liegt kein ★ einen Zug von diesem Feld entfernt, also brauchst du ${p.M(p.e)} mehr.`],
        off: [p => `zielst du zwar auf einen ★, aber der Weg verrutscht und kostet ${p.M(p.e)}.${p.t ? ' Hol zuerst den ★, den du gleich nehmen kannst!' : ''}`, p => `kommst du näher, aber die Reihenfolge stimmt nicht, und es dauert ${p.M(p.e)} länger.${p.t ? ' Lass keinen ★ liegen, den du sofort holen kannst!' : ''}`, p => `ist ein ★ in Reichweite, aber alle abzuklappern verschenkt ${p.M(p.e)}.${p.t ? ' Da war ein ★, den du zuerst holen konntest!' : ''}`],
      },
      done: 'Sterne gesammelt, tolle Sprünge!', go: ['Überall drei ★, großartig, hopp! Jetzt 3 Rätsel aus den Wegen, die du gerade gegangen bist. Finde den kürzesten Zug!', 'Gut gemacht! Jetzt 3 Rätsel aus diesen Wegen. Such den kürzesten Zug!'],
    },
    ru: {
      M: n => { const a = n % 10, b = n % 100; return n + (a === 1 && b !== 11 ? ' ход' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? ' хода' : ' ходов'); },
      pk: { r: 'ладьёй', b: 'слоном', q: 'ферзём', k: 'королём', n: 'конём', p: 'пешкой' }, cp: { p: 'пешку', n: 'коня', b: 'слона', r: 'ладью', q: 'ферзя' },
      ask: ['Время задачки, прыг! Чтобы собрать все ★ за меньшее число ходов, куда пойти {p}?', 'Куда теперь пойти {p}? Выбери путь без обходов!', 'Сможешь собрать остальное за минимум ходов? Выбери следующее поле и сходи {p}!'],
      askCap: ['Время задачки, прыг! Чтобы забрать всех за меньшее число ходов, куда пойти сейчас?', 'За какой фигурой пойдёшь сначала? Всё решает порядок!', 'Сможешь собрать оставшиеся ★ за пару ходов? Выбери следующий ход!'],
      askSafe: ['Время задачки, прыг! В обход полосок: какой путь к ★ самый короткий?', 'Только по безопасным полям: какой ход ведёт напрямик?', 'Безопасность прежде всего, но без лишних ходов! Куда дальше?'],
      hint: {
        r: ['Ладья ходит прямо: вверх, вниз и вбок. Какое поле ставит её на одну линию со ★?', 'Пока ни одна ★ не достаётся? Ничего. Найди поле, откуда возьмёшь её следующим ходом!', 'Реши, где твой путь поворачивает, и дорога сразу видна, прыг!'],
        b: ['Слон ходит только по диагонали. Ищи поле на одной диагонали со ★!', 'Можно ли связать две ★ одной диагональю?', 'Встань там, где пересекаются две диагонали, и следующую ★ легко достать, прыг!'],
        q: ['Ферзь ходит прямо и по диагонали. Есть ли поле, откуда достаются обе ★?', 'Другой порядок иногда экономит ход, прыг!', 'А вдруг диагональ — это короткий путь? Проверь все восемь направлений!'],
        k: ['Король шагает на одно поле. Посчитай поля до каждой ★!', 'Шаг по диагонали — это сразу и вертикаль, и горизонталь, прыг!', 'С какой ★ начать, чтобы не возвращаться назад?'],
        n: ['Представь все поля, куда отсюда может прыгнуть твой конь!', 'Если ни одна ★ не в одном прыжке, ищи ту, что в двух, прыг!', 'Каждый прыжок меняет цвет поля. По цвету ★ посчитай, сколько ещё прыгать!'],
        p2: 'Помнишь? Самым первым ходом пешка может пройти два поля!', px: 'Только когда бьёт, пешка идёт вперёд по диагонали, прыг!', pf: 'Пешка идёт прямо, по одному полю, и никогда назад. Осторожно!',
        cap: 'С поля, где ты бьёшь, достанешь до следующей фигуры?', safe: 'На красные полоски вставать нельзя, прыг! Иди по полям, которые никто не бьёт.',
      },
      good: [(x, R) => `Отлично, ${x} — верно! ${R} Так держать и в следующей!`, (x, R) => `Здорово! ${x} — самый короткий путь, прыг! ${R}`, (x, R) => `Зоркий глаз! ${x}, точно в цель. ${R} У тебя получается всё лучше!`],
      ng: [(m, x, W) => `Ничего, теперь ты знаешь! Короткий путь был ${m}, прыг. После ${x} ${W}`, (m, x, W) => `Почти! Ответ — ${m}. После ${x} ${W}`, (m, x, W) => `С ${m} было бы идеально. Если сыграть ${x}, ${W} В следующей получится!`],
      R: {
        last: ['Прыжок к последней ★ — и все собраны!', 'Последняя ★ твоя, точно в цель!', 'Ни одной ★ не осталось, и ни одного лишнего хода!'],
        cap: [p => `Ты забираешь ${p.cp}, и путь к следующей ★ открыт. Осталось всего ${p.M(p.r)}!`, p => `Поле, где ты забираешь ${p.cp}, — короткий путь к следующей.`, p => `Забираешь ${p.cp}, а дальше всего ${p.M(p.r)} до ★. Идеальный порядок!`],
        starNx: ['Со ★, которую ты только что взял, следующая уже достаётся.', 'Берёшь ★ и сразу встаёшь на линию со следующей!', 'Прямо там, куда ты приземлился, следующая ★ уже на прицеле!'],
        starR: [p => `После этой ★ на остальное нужно всего ${p.M(p.r)}.`, p => `Возьми сначала эту ★ — и закончишь за ${p.M(p.r)}.`, p => `С этой ★ остальное соберёшь за ${p.M(p.r)}.`],
        promo: 'Превращайся в ферзя прямо здесь! Теперь можно ходить во все стороны, прыг!',
        mid: [p => `★ пока нет, но отсюда одна достаётся следующим ходом. ${p.k ? 'Ни одного лишнего шага!' : 'Идеальная пересадка!'}`, 'Сначала остановиться здесь — и следующим же ходом достанешь ★.', 'Похоже на обход, а на самом деле это короткий путь к следующей ★.'],
        path: [p => `Отсюда на все ★ нужно всего ${p.M(p.r)}. Никаких обходов!`, p => `Пройди через это поле — и закончишь за ${p.M(p.r)}, прыг!`, p => `Тише едешь — дальше будешь! Это поле на кратчайшем пути: осталось ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `★ берётся, но остальные оказываются далеко, и это ${p.M(p.e)} лишних. Порядок важен!`, p => `бросок к ближайшей ★ превращает остальное в обход: потеряно ${p.M(p.e)}. Смотри дальше!`, p => `одна ★ даётся легко, но на остальное уходит на ${p.M(p.e)} больше. Попробуй другой порядок!`],
        pawn: ['пешка не ходит назад: проскочив ряд со ★, за ней уже не вернуться.', 'идя прямо, теряешь ★ по диагонали впереди. Пешка никогда не возвращается!', 'пешка, ушедшая вперёд, не вернётся, и шанс взять ★ пропадает.'],
        dead: 'собрать все ★ уже не получится.',
        cap: [p => `взятие мешающей фигуры уводит в сторону на ${p.M(p.e)}.`, p => `это взятие — крюк: на ${p.M(p.e)} больше до ★.`, p => `взятие не приближает ни к одной ★, и ${p.M(p.e)} уходят впустую.`],
        noReach: [p => `оттуда следующим ходом не достать ни одну ★, так что это крюк на ${p.M(p.e)}.`, p => `оттуда следующим ходом не нацелиться на ★, и ты теряешь ${p.M(p.e)}.`, p => `ни одна ★ не в одном ходе от того поля, поэтому нужно на ${p.M(p.e)} больше.`],
        off: [p => `★ на прицеле, но путь съезжает и стоит ${p.M(p.e)}.${p.t ? ' Сначала возьми ★, которая рядом!' : ''}`, p => `ты приближаешься, но порядок сбивается, и выходит на ${p.M(p.e)} дольше.${p.t ? ' Не пропускай ★, которую можно взять сразу!' : ''}`, p => `★ достаётся, но обойти все — это ${p.M(p.e)} впустую.${p.t ? ' Была ★, которую стоило взять первой!' : ''}`],
      },
      done: 'Звёзды собраны, отличные прыжки!', go: ['Везде по три ★, потрясающе, прыг! Теперь 3 задачки по путям, которые ты только что прошёл. Найди самый короткий ход!', 'Молодец! Теперь 3 задачки по этим путям. Ищи самый короткий ход!'],
    },
    tr: {
      M: n => n + ' hamle', pk: { r: 'kale', b: 'fil', q: 'vezir', k: 'şah', n: 'at', p: 'piyon' }, cp: { p: 'piyonu', n: 'atı', b: 'fili', r: 'kaleyi', q: 'veziri' },
      ask: ['Bulmaca zamanı, hop! Tüm ★\'ları en az hamleyle toplamak için {p} şimdi nereye gitsin?', 'Şimdi {p} nereye gitsin? Dolambaçsız yolu seç!', 'Kalanları en az hamleyle toplayabilir misin? {p} için bir sonraki kareyi seç!'],
      askCap: ['Bulmaca zamanı, hop! Hepsini az hamleyle almak için şimdi nereye gidiyorsun?', 'Önce hangi taşın peşine düşeceksin? İşin sırrı sıralamada!', 'Kalan ★\'ları birkaç hamlede toplayabilir misin? Sıradaki hamleni seç!'],
      askSafe: ['Bulmaca zamanı, hop! Çizgilerden kaçarak ★\'a en kısa yol hangisi?', 'Yalnızca güvenli karelerden geçerek kestirme hamle hangisi?', 'Önce güvenlik, ama boşa hamle yok! Şimdi nereye?'],
      hint: {
        r: ['Kale dümdüz gider: yukarı, aşağı ve yanlara. Hangi kare onu bir ★ ile aynı hizaya getirir?', 'Henüz hiçbir ★ menzilde değil mi? Sorun yok. Bir sonraki hamlede birini alacağın kareyi bul!', 'Yolunun döneceği köşeyi belirle, yol kendiliğinden görünür, hop!'],
        b: ['Fil yalnızca çapraz gider. Bir ★ ile aynı çaprazdaki kareyi ara!', 'İki ★ tek bir çaprazla birleştirilebilir mi?', 'İki çaprazın kesiştiği yerde dur, sonraki ★ kolayca gelir, hop!'],
        q: ['Vezir düz ya da çapraz gider. İki ★\'a birden ulaşan bir kare var mı?', 'Sırayı değiştirmek bazen bir hamle kazandırır, hop!', 'Ya kestirme çaprazsa? Sekiz yönün hepsine bak!'],
        k: ['Şah her seferinde bir kare gider. Her ★\'a kadar kareleri say!', 'Çapraz bir adım, aynı anda hem sütunda hem sırada ilerletir, hop!', 'Hangi ★\'dan başlarsan geri dönmek zorunda kalmazsın?'],
        n: ['Atının buradan zıplayabileceği tüm kareleri gözünün önüne getir!', 'Hiçbir ★ bir zıplama uzakta değilse, iki zıplama uzaktakini ara, hop!', 'Her zıplamada karenin rengi değişir. ★\'ın rengine bakıp zıplamaları say!'],
        p2: 'Hatırladın mı? İlk hamlesinde piyon iki kare ilerleyebilir!', px: 'Piyon yalnızca taş alırken çapraz ileri gider, hop!', pf: 'Piyon dümdüz, birer birer ilerler ve asla geri dönmez. Dikkat!',
        cap: 'Taşı aldığın kareden sıradaki taşa nişan alabilir misin?', safe: 'Kırmızı çizgili karelere basamazsın, hop! Kimsenin saldırmadığı karelerden ilerle.',
      },
      good: [(x, R) => `Harika, ${x} doğru! ${R} Sıradakinde de böyle devam!`, (x, R) => `Müthiş! ${x} en kısa yol, hop! ${R}`, (x, R) => `Ne güzel buldun! ${x}, tam isabet. ${R} Gittikçe ustalaşıyorsun!`],
      ng: [(m, x, W) => `Dert etme, artık biliyorsun! Kestirme ${m} idi, hop. ${x} ile ${W}`, (m, x, W) => `Az kaldı! Doğrusu ${m}. ${x} sonrasında ${W}`, (m, x, W) => `${m} olsaydı tam puandı. ${x} oynarsan ${W} Sıradakini yaparsın!`],
      R: {
        last: ['Son ★\'a tek zıplayış, hepsi toplandı!', 'Son ★ senin, tam hedefte!', 'Hiç ★ kalmadı, tek bir hamle bile boşa gitmedi!'],
        cap: [p => `${p.cp} alıyorsun ve sıradaki ★\'a giden yol açık kalıyor. Sadece ${p.M(p.r)} kaldı!`, p => `${p.cp} aldığın kare, sıradakine kestirme oluyor.`, p => `${p.cp} al, sonra sıradaki ★\'a sadece ${p.M(p.r)}. Mükemmel sıra!`],
        starNx: ['Az önce aldığın ★\'dan sıradaki zaten menzilde.', 'Bir ★ alıp hemen sıradakiyle aynı hizaya geçiyorsun!', 'Tam indiğin yerde sıradaki ★ zaten nişanda!'],
        starR: [p => `Bu ★\'dan sonra geri kalanı sadece ${p.M(p.r)} sürer.`, p => `Önce bu ★\'ı al, ${p.M(p.r)} içinde bitirirsin.`, p => `Bu ★\'dan kalanları ${p.M(p.r)} içinde toplarsın.`],
        promo: 'Tam burada terfi edip vezir ol! Artık her yöne gidebilirsin, hop!',
        mid: [p => `Henüz ★ yok, ama buradan bir sonraki hamlede birine ulaşırsın. ${p.k ? 'Tek bir fazla adım yok!' : 'Mükemmel bir basamak!'}`, 'Önce burada durmak, hemen sonraki hamlede bir ★\'a ulaşmanı sağlar.', 'Dolambaç gibi görünse de aslında sıradaki ★\'a kestirme.'],
        path: [p => `Buradan tüm ★\'lar sadece ${p.M(p.r)} daha sürer. Sıfır dolambaç!`, p => `Bu kareden geç, ${p.M(p.r)} içinde bitirirsin, hop!`, p => `Acele işe şeytan karışır! Bu kare en kısa yolun üstünde: ${p.M(p.r)} kaldı.`],
      },
      W: {
        greedy: [p => `bir ★ alırsın, ama diğerleri uzakta kalır ve ${p.M(p.e)} fazlaya patlar. Sıra önemli!`, p => `en yakın ★\'a atılmak kalanını dolambaca çevirir: ${p.M(p.e)} kayıp. İleriyi düşün!`, p => `bir ★ kolay gelir, ama kalanı ${p.M(p.e)} daha uzun sürer. Başka bir sıra dene!`],
        pawn: ['piyon geri gidemez, ★\'ın sırasını geçince onu almaya dönemezsin.', 'dümdüz ilerlersen çapraz öndeki ★\'ı kaçırırsın. Piyon asla geri dönmez!', 'ileri giden piyon geri gelemez ve ★\'ı alma şansı uçup gider.'],
        dead: 'artık tüm ★\'ları toplayamazsın.',
        cap: [p => `yolu kesen taşı almak seni ${p.M(p.e)} yoldan çıkarır.`, p => `bu alış bir sapma: ★\'a kadar ${p.M(p.e)} fazla.`, p => `taşı almak seni hiçbir ★\'a yaklaştırmaz ve ${p.M(p.e)} boşa gider.`],
        noReach: [p => `oradan sonraki hamlede hiçbir ★\'a ulaşılmaz, yani ${p.M(p.e)} dolambaç.`, p => `oradan sonraki hamlede hiçbir ★\'ı hedefleyemezsin ve ${p.M(p.e)} kaybedersin.`, p => `o kareden bir hamle uzakta hiç ★ yok, bu yüzden ${p.M(p.e)} daha gerekir.`],
        off: [p => `bir ★\'ı hedefleyebilirsin, ama yol kayar ve ${p.M(p.e)} kaybettirir.${p.t ? ' Önce yanı başındaki ★\'ı al!' : ''}`, p => `yaklaşırsın ama sıra bozulur ve ${p.M(p.e)} uzar.${p.t ? ' Hemen alabileceğin ★\'ı kaçırma!' : ''}`, p => `menzilde bir ★ var, ama hepsini dolaşmak ${p.M(p.e)} boşa harcar.${p.t ? ' Önce alınacak bir ★ vardı!' : ''}`],
      },
      done: 'Yıldızlar toplandı, ne güzel zıplayışlar!', go: ['Her aşamada üç ★, harika, hop! Şimdi az önce yürüdüğün yollardan 3 bulmaca. En kısa hamleyi bul!', 'Aferin! Şimdi bu yollardan 3 bulmaca. En kısa hamleyi ara!'],
    },
    id: {
      M: n => n + ' langkah', pk: { r: 'bentengmu', b: 'gajahmu', q: 'menterimu', k: 'rajamu', n: 'kudamu', p: 'pionmu' }, cp: { p: 'pion', n: 'kuda', b: 'gajah', r: 'benteng', q: 'menteri' },
      ask: ['Waktunya teka-teki, hop! Supaya semua ★ terkumpul dengan langkah paling sedikit, ke mana {p} pergi?', 'Ke mana {p} melangkah sekarang? Pilih jalan tanpa memutar!', 'Bisa kumpulkan sisanya dengan langkah sesedikit mungkin? Pilih petak berikutnya untuk {p}!'],
      askCap: ['Waktunya teka-teki, hop! Supaya semua termakan dengan sedikit langkah, ke mana sekarang?', 'Buah mana yang mau kamu kejar duluan? Urutannya kuncinya!', 'Bisa kumpulkan ★ yang tersisa dalam beberapa langkah? Pilih langkahmu berikutnya!'],
      askSafe: ['Waktunya teka-teki, hop! Sambil menghindari garis-garis, jalan mana yang paling pendek ke ★?', 'Hanya lewat petak aman, langkah mana yang jadi jalan pintas?', 'Utamakan aman, tapi jangan buang langkah! Ke mana sekarang?'],
      hint: {
        r: ['Benteng bergerak lurus: ke atas, ke bawah, dan ke samping. Petak mana yang membuatnya sejajar dengan ★?', 'Belum ada ★ yang terjangkau? Tidak apa-apa. Cari petak yang bisa mengambil ★ di langkah berikutnya!', 'Tentukan sudut tempat rutemu berbelok, jalannya akan terlihat, hop!'],
        b: ['Gajah hanya bergerak diagonal. Cari petak yang sediagonal dengan ★!', 'Bisakah dua ★ disambung dengan satu diagonal?', 'Berdirilah di persilangan dua diagonal, ★ berikutnya jadi gampang diambil, hop!'],
        q: ['Menteri bisa lurus atau diagonal. Adakah petak yang menjangkau kedua ★?', 'Mengubah urutan kadang menghemat satu langkah, hop!', 'Jangan-jangan diagonal itu jalan pintasnya? Lihat kedelapan arah!'],
        k: ['Raja melangkah satu petak setiap kali. Hitung petak ke setiap ★!', 'Satu langkah diagonal maju satu lajur dan satu baris sekaligus, hop!', 'Mulai dari ★ yang mana supaya tidak perlu balik lagi?'],
        n: ['Bayangkan semua petak yang bisa dilompati kudamu dari sini!', 'Kalau tidak ada ★ yang sejauh satu lompatan, cari yang dua lompatan, hop!', 'Setiap lompatan mengganti warna petak. Pakai warna petak ★ untuk menghitung lompatannya!'],
        p2: 'Ingat? Di langkah pertamanya, pion boleh maju dua petak!', px: 'Hanya saat memakan, pion maju secara diagonal, hop!', pf: 'Pion maju lurus satu petak demi satu dan tidak pernah mundur. Hati-hati!',
        cap: 'Dari petak tempatmu memakan, bisakah kamu mengincar buah berikutnya?', safe: 'Petak bergaris merah tidak boleh diinjak, hop! Lewati petak yang tidak diserang siapa pun.',
      },
      good: [(x, R) => `Bagus, ${x} benar! ${R} Pertahankan di soal berikutnya!`, (x, R) => `Hebat! ${x} adalah rute terpendek, hop! ${R}`, (x, R) => `Jeli sekali! ${x}, tepat sasaran. ${R} Kamu makin jago!`],
      ng: [(m, x, W) => `Tidak apa-apa, sekarang kamu tahu! ${m} jalan pintasnya, hop. Dengan ${x}, ${W}`, (m, x, W) => `Sedikit lagi! Jawabannya ${m}. Setelah ${x}, ${W}`, (m, x, W) => `${m} pasti sempurna. Kalau main ${x}, ${W} Soal berikutnya pasti bisa!`],
      R: {
        last: ['Satu lompatan ke ★ terakhir, semuanya terkumpul!', '★ terakhir jadi milikmu, tepat sasaran!', 'Tidak ada ★ tersisa, dan tidak ada satu langkah pun terbuang!'],
        cap: [p => `Kamu memakan ${p.cp} dan jalan ke ★ berikutnya tetap terbuka. Tinggal ${p.M(p.r)}!`, p => `Petak tempatmu memakan ${p.cp} jadi jalan pintas ke berikutnya.`, p => `Makan ${p.cp}, lalu cuma ${p.M(p.r)} ke ★ berikutnya. Urutan yang sempurna!`],
        starNx: ['Dari ★ yang baru kamu ambil, yang berikutnya sudah terjangkau.', 'Ambil satu ★ dan langsung sejajar dengan yang berikutnya!', 'Tepat di tempatmu mendarat, ★ berikutnya sudah dalam bidikan!'],
        starR: [p => `Setelah ★ ini, sisanya hanya butuh ${p.M(p.r)}.`, p => `Ambil ★ ini dulu, lalu selesai dalam ${p.M(p.r)}.`, p => `Dari ★ ini, sisanya bisa kamu kumpulkan dalam ${p.M(p.r)}.`],
        promo: 'Promosi jadi menteri di sini! Sekarang bisa ke segala arah, hop!',
        mid: [p => `Belum ada ★, tapi dari sini satu ★ terjangkau di langkah berikutnya. ${p.k ? 'Tidak ada langkah yang sia-sia!' : 'Batu loncatan yang pas!'}`, 'Singgah di sini dulu membuatmu bisa meraih ★ di langkah berikutnya.', 'Kelihatannya memutar, padahal ini jalan pintas ke ★ berikutnya.'],
        path: [p => `Dari sini, semua ★ cuma butuh ${p.M(p.r)} lagi. Nol putaran!`, p => `Lewati petak ini dan kamu selesai dalam ${p.M(p.r)}, hop!`, p => `Pelan tapi pasti! Petak ini ada di rute terpendek: tinggal ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `kamu dapat satu ★, tapi yang lain jadi jauh dan butuh ${p.M(p.e)} ekstra. Urutan itu penting!`, p => `menyerbu ★ terdekat membuat sisanya memutar: rugi ${p.M(p.e)}. Lihat lebih jauh ke depan!`, p => `satu ★ gampang didapat, tapi sisanya ${p.M(p.e)} lebih lama. Coba urutan lain!`],
        pawn: ['pion tidak bisa mundur, jadi setelah melewati baris ★ kamu tak bisa kembali mengambilnya.', 'kalau terus lurus, ★ di depan diagonal jadi terlewat. Pion tidak pernah mundur!', 'pion yang sudah maju tidak bisa kembali, dan kesempatan mengambil ★ hilang.'],
        dead: 'kamu tidak bisa lagi mengumpulkan semua ★.',
        cap: [p => `memakan buah penghalang itu membuatmu melenceng ${p.M(p.e)}.`, p => `makan buah itu cuma jalan memutar: ${p.M(p.e)} ekstra sampai ke ★.`, p => `memakan buah tidak membawamu lebih dekat ke ★, jadi ${p.M(p.e)} terbuang.`],
        noReach: [p => `dari sana tidak ada ★ yang terjangkau di langkah berikutnya, jadi memutar ${p.M(p.e)}.`, p => `dari sana kamu tak bisa mengincar ★ di langkah berikutnya, dan rugi ${p.M(p.e)}.`, p => `tidak ada ★ yang sejauh satu langkah dari petak itu, jadi butuh ${p.M(p.e)} lagi.`],
        off: [p => `kamu bisa mengincar ★, tapi rutenya meleset dan rugi ${p.M(p.e)}.${p.t ? ' Ambil dulu ★ yang sudah terjangkau!' : ''}`, p => `kamu mendekat, tapi urutannya salah dan jadi ${p.M(p.e)} lebih lama.${p.t ? ' Jangan lewatkan ★ yang bisa langsung diambil!' : ''}`, p => `ada ★ yang terjangkau, tapi mengitari semuanya membuang ${p.M(p.e)}.${p.t ? ' Ada ★ yang bisa diambil lebih dulu!' : ''}`],
      },
      done: 'Bintang terkumpul, lompatan yang keren!', go: ['Tiga ★ di semua tahap, luar biasa, hop! Sekarang 3 teka-teki dari rute yang baru kamu lalui. Temukan langkah terpendek!', 'Kerja bagus! Sekarang 3 teka-teki dari rute itu. Cari langkah terpendek!'],
    },
    hi: {
      M: n => n === 1 ? '1 चाल' : n + ' चालें', pk: { r: 'हाथी', b: 'ऊँट', q: 'वज़ीर', k: 'राजा', n: 'घोड़ा', p: 'प्यादा' }, cp: { p: 'प्यादे', n: 'घोड़े', b: 'ऊँट', r: 'हाथी', q: 'वज़ीर' },
      ask: ['पहेली का समय, फुदक! सारे ★ सबसे कम चालों में जुटाने हैं, तो अब {p} कहाँ जाए?', 'अब {p} कहाँ जाए? बिना चक्कर वाला रास्ता चुनो!', 'क्या बाकी ★ सबसे कम चालों में बटोर सकते हो? {p} का अगला खाना चुनो!'],
      askCap: ['पहेली का समय, फुदक! सबको कम चालों में मारना है, तो अब कहाँ जाओगे?', 'पहले किस मोहरे के पीछे जाओगे? क्रम ही असली चाबी है!', 'क्या बचे हुए ★ कुछ ही चालों में बटोर सकते हो? अगली चाल चुनो!'],
      askSafe: ['पहेली का समय, फुदक! धारियों से बचते हुए ★ तक सबसे छोटा रास्ता कौन-सा है?', 'सिर्फ़ सुरक्षित खानों पर चलते हुए, कौन-सी चाल शॉर्टकट है?', 'पहले सुरक्षा, पर कोई चाल बेकार नहीं! अब कहाँ?'],
      hint: {
        r: ['हाथी सीधा चलता है: ऊपर, नीचे और बगल में। कौन-सा खाना उसे किसी ★ की सीध में लाता है?', 'अभी कोई ★ पहुँच में नहीं? कोई बात नहीं। ऐसा खाना ढूँढो जहाँ से अगली चाल में ★ मिल जाए!', 'तय करो कि रास्ता कहाँ मुड़ेगा, फिर राह खुद दिखेगी, फुदक!'],
        b: ['ऊँट सिर्फ़ तिरछा चलता है। किसी ★ वाले तिरछे पर खाना ढूँढो!', 'क्या दो ★ एक ही तिरछी रेखा से जुड़ सकते हैं?', 'जहाँ दो तिरछी रेखाएँ मिलती हैं, वहाँ खड़े हो तो अगला ★ आसान है, फुदक!'],
        q: ['वज़ीर सीधा भी चलता है और तिरछा भी। क्या कोई खाना दोनों ★ तक पहुँचता है?', 'क्रम बदलने से कभी-कभी एक चाल बचती है, फुदक!', 'कहीं तिरछा ही शॉर्टकट तो नहीं? आठों दिशाएँ देखो!'],
        k: ['राजा एक बार में एक खाना चलता है। हर ★ तक खाने गिनो!', 'एक तिरछा कदम एक साथ खड़ी और पड़ी दोनों पंक्तियों में आगे बढ़ाता है, फुदक!', 'किस ★ से शुरू करो कि वापस न लौटना पड़े?'],
        n: ['सोचो, तुम्हारा घोड़ा यहाँ से किन-किन खानों पर कूद सकता है!', 'अगर कोई ★ एक छलाँग पर नहीं, तो दो छलाँग वाला खाना ढूँढो, फुदक!', 'हर छलाँग पर खाने का रंग बदलता है। ★ के रंग से छलाँगें गिनो!'],
        p2: 'याद है? अपनी सबसे पहली चाल में प्यादा दो खाने चल सकता है!', px: 'सिर्फ़ मारते वक़्त प्यादा तिरछा आगे जाता है, फुदक!', pf: 'प्यादा सीधा, एक-एक खाना आगे बढ़ता है और कभी पीछे नहीं जाता। सावधान!',
        cap: 'जिस खाने पर मारोगे, वहाँ से अगले मोहरे पर निशाना लग सकता है?', safe: 'लाल धारी वाले खानों पर पैर नहीं रख सकते, फुदक! उन खानों से चलो जिन पर कोई हमला नहीं।',
      },
      good: [(x, R) => `बढ़िया, ${x} सही है! ${R} अगली पहेली में भी ऐसे ही!`, (x, R) => `शाबाश! ${x} सबसे छोटा रास्ता है, फुदक! ${R}`, (x, R) => `क्या नज़र है! ${x}, बिल्कुल सही। ${R} तुम लगातार बेहतर हो रहे हो!`],
      ng: [(m, x, W) => `कोई बात नहीं, अब तुम जान गए! ${m} शॉर्टकट था, फुदक। ${x} से ${W}`, (m, x, W) => `बस ज़रा-सा! जवाब है ${m}। ${x} के बाद ${W}`, (m, x, W) => `${m} चुनते तो पूरे अंक मिलते। ${x} खेलने पर ${W} अगली बार ज़रूर!`],
      R: {
        last: ['आख़िरी ★ तक एक छलाँग, और सब जुट गए!', 'आख़िरी ★ तुम्हारा, ठीक निशाने पर!', 'कोई ★ नहीं बचा, और एक भी चाल बेकार नहीं गई!'],
        cap: [p => `तुम ${p.cp} को मारते हो और अगले ★ का रास्ता खुला रहता है। बस ${p.M(p.r)} बाकी!`, p => `जिस खाने पर ${p.cp} को मारते हो, वही अगले तक शॉर्टकट है।`, p => `${p.cp} को मारो, फिर अगले ★ तक सिर्फ़ ${p.M(p.r)}। एकदम सही क्रम!`],
        starNx: ['अभी जो ★ लिया, वहीं से अगला भी पहुँच में है।', 'एक ★ लेते ही अगले की सीध में आ गए!', 'ठीक जहाँ उतरे, अगला ★ पहले से निशाने पर है!'],
        starR: [p => `इस ★ के बाद बाकी में सिर्फ़ ${p.M(p.r)} लगेंगी।`, p => `पहले यह ★ लो, फिर ${p.M(p.r)} में काम पूरा।`, p => `इस ★ से बाकी सब ${p.M(p.r)} में बटोर लोगे।`],
        promo: 'यहीं वज़ीर बन जाओ! अब हर दिशा में जा सकते हो, फुदक!',
        mid: [p => `अभी ★ नहीं, पर यहाँ से अगली चाल में एक मिल जाएगा। ${p.k ? 'एक भी कदम फ़ालतू नहीं!' : 'एकदम सही पड़ाव!'}`, 'पहले यहाँ रुकने से अगली ही चाल में ★ तक पहुँच जाते हो।', 'चक्कर जैसा लगता है, पर असल में यही अगले ★ का शॉर्टकट है।'],
        path: [p => `यहाँ से सारे ★ बस ${p.M(p.r)} और। एक भी चक्कर नहीं!`, p => `इस खाने से गुज़रो और ${p.M(p.r)} में ख़त्म, फुदक!`, p => `धीरे-धीरे, पर पक्का! यह खाना सबसे छोटे रास्ते पर है: ${p.M(p.r)} बाकी।`],
      },
      W: {
        greedy: [p => `एक ★ तो मिलता है, पर बाकी दूर हो जाते हैं और ${p.M(p.e)} ज़्यादा लगती हैं। क्रम मायने रखता है!`, p => `सबसे पास वाले ★ पर झपटने से बाकी चक्कर बन जाता है: ${p.M(p.e)} का नुकसान। आगे की सोचो!`, p => `एक ★ आसानी से मिलता है, पर बाकी में ${p.M(p.e)} ज़्यादा लगती हैं। दूसरा क्रम आज़माओ!`],
        pawn: ['प्यादा पीछे नहीं जा सकता, ★ वाली पंक्ति पार की तो उसे लेने लौट नहीं पाओगे।', 'सीधे बढ़ते रहे तो तिरछे सामने वाला ★ छूट जाता है। प्यादा कभी पीछे नहीं जाता!', 'आगे बढ़ा प्यादा लौट नहीं सकता, और ★ लेने का मौका चला जाता है।'],
        dead: 'अब सारे ★ नहीं बटोर पाओगे।',
        cap: [p => `रास्ते के मोहरे को मारना तुम्हें ${p.M(p.e)} भटका देता है।`, p => `वह मारना एक चक्कर है: ★ तक ${p.M(p.e)} ज़्यादा।`, p => `मारने से तुम किसी ★ के पास नहीं पहुँचते, और ${p.M(p.e)} बेकार जाती हैं।`],
        noReach: [p => `वहाँ से अगली चाल में कोई ★ नहीं मिलता, यानी ${p.M(p.e)} का चक्कर।`, p => `वहाँ से अगली चाल में किसी ★ पर निशाना नहीं, और ${p.M(p.e)} का नुकसान।`, p => `उस खाने से एक चाल दूर कोई ★ नहीं, इसलिए ${p.M(p.e)} और लगती हैं।`],
        off: [p => `★ पर निशाना तो है, पर रास्ता भटकता है और ${p.M(p.e)} लगती हैं।${p.t ? ' जो ★ पास है, पहले उसे लो!' : ''}`, p => `पास तो पहुँचते हो, पर क्रम बिगड़ता है और ${p.M(p.e)} ज़्यादा लगती हैं।${p.t ? ' तुरंत मिलने वाला ★ मत छोड़ो!' : ''}`, p => `एक ★ पहुँच में है, पर सबका चक्कर लगाने में ${p.M(p.e)} बेकार जाती हैं।${p.t ? ' पहले लेने लायक एक ★ था!' : ''}`],
      },
      done: '★ बटोर लिए, क्या शानदार छलाँगें!', go: ['हर चरण में तीन ★, कमाल, फुदक! अब अभी चले रास्तों से 3 पहेलियाँ। सबसे छोटी चाल ढूँढो!', 'बहुत बढ़िया! अब उन्हीं रास्तों से 3 पहेलियाँ। सबसे छोटी चाल खोजो!'],
    },
    ar: {
      M: n => n === 1 ? 'نقلة واحدة' : n === 2 ? 'نقلتان' : n <= 10 ? n + ' نقلات' : n + ' نقلة', pk: { r: 'الرخ', b: 'الفيل', q: 'الوزير', k: 'الملك', n: 'الحصان', p: 'البيدق' }, cp: { p: 'البيدق', n: 'الحصان', b: 'الفيل', r: 'الرخ', q: 'الوزير' },
      ask: ['وقت اللغز، قفزة! لتجمع كل ★ بأقل عدد من النقلات، إلى أين ينتقل {p} الآن؟', 'إلى أين ينتقل {p} الآن؟ اختر الطريق بلا التفاف!', 'هل تجمع الباقي بأقل النقلات؟ اختر المربع التالي الذي ينتقل إليه {p}!'],
      askCap: ['وقت اللغز، قفزة! لتأسرها كلها بنقلات قليلة، إلى أين تذهب الآن؟', 'أي قطعة ستلاحق أولًا؟ الترتيب هو المفتاح!', 'هل تجمع ما تبقى من ★ في نقلات قليلة؟ اختر نقلتك التالية!'],
      askSafe: ['وقت اللغز، قفزة! متجنبًا الخطوط، ما أقصر طريق إلى ★؟', 'بالمرور على المربعات الآمنة فقط، أي نقلة هي الطريق المختصر؟', 'الأمان أولًا، لكن بلا نقلات ضائعة! إلى أين الآن؟'],
      hint: {
        r: ['الرخ يتحرك مستقيمًا: للأمام وللخلف وللجانبين. أي مربع يضعه على خط واحد مع ★؟', 'لا ★ في متناولك بعد؟ لا بأس. ابحث عن مربع تلتقطها منه في النقلة التالية!', 'حدّد الزاوية التي ينعطف فيها طريقك، وسيظهر لك الدرب، قفزة!'],
        b: ['الفيل يتحرك قطريًا فقط. ابحث عن مربع على قطر واحد مع ★!', 'هل يمكن وصل نجمتين ★ بقطر واحد؟', 'قف حيث يتقاطع قطران، وستسهل عليك ★ التالية، قفزة!'],
        q: ['الوزير يتحرك مستقيمًا أو قطريًا. هل هناك مربع يصل إلى النجمتين ★ معًا؟', 'تغيير الترتيب يوفّر نقلة أحيانًا، قفزة!', 'ماذا لو كان القطر هو الطريق المختصر؟ انظر في الاتجاهات الثمانية!'],
        k: ['الملك يخطو مربعًا واحدًا كل مرة. عدّ المربعات حتى كل ★!', 'خطوة قطرية واحدة تقدّمك عمودًا وصفًا في آن واحد، قفزة!', 'بأي ★ تبدأ حتى لا تضطر إلى الرجوع؟'],
        n: ['تخيّل كل المربعات التي يقفز إليها حصانك من هنا!', 'إن لم تكن أي ★ على بعد قفزة، فابحث عن واحدة على بعد قفزتين، قفزة!', 'كل قفزة تغيّر لون المربع. استعن بلون مربع ★ لتعدّ القفزات!'],
        p2: 'أتذكر؟ في نقلته الأولى تمامًا يستطيع البيدق التقدم مربعين!', px: 'لا يتقدم البيدق قطريًا إلا عندما يأسر، قفزة!', pf: 'البيدق يتقدم مستقيمًا مربعًا بعد مربع ولا يتراجع أبدًا. انتبه!',
        cap: 'من المربع الذي تأسر فيه، هل تستطيع أن تصوّب نحو القطعة التالية؟', safe: 'لا يمكنك الوقوف على الخطوط الحمراء، قفزة! تنقّل عبر المربعات التي لا يهاجمها أحد.',
      },
      good: [(x, R) => `رائع، ${x} صحيحة! ${R} واصل هكذا في اللغز التالي!`, (x, R) => `أحسنت! ${x} هي أقصر طريق، قفزة! ${R}`, (x, R) => `يا لها من عين! ${x}، في الصميم. ${R} أنت تتحسّن أكثر فأكثر!`],
      ng: [(m, x, W) => `لا بأس، الآن عرفت! كانت ${m} هي الطريق المختصر، قفزة. مع ${x}، ${W}`, (m, x, W) => `اقتربت كثيرًا! الجواب هو ${m}. بعد ${x}، ${W}`, (m, x, W) => `لو اخترت ${m} لكانت مثالية. إذا لعبت ${x}، ${W} ستنجح في التالي!`],
      R: {
        last: ['قفزة واحدة إلى آخر ★، وجمعتها كلها!', 'آخر ★ صارت لك، في الهدف تمامًا!', 'لم تبقَ أي ★، ولم تضِع نقلة واحدة!'],
        cap: [p => `تأسر ${p.cp} ويبقى الطريق إلى ★ التالية مفتوحًا. بقيت ${p.M(p.r)} فقط!`, p => `المربع الذي تأسر فيه ${p.cp} طريق مختصر إلى التالية.`, p => `تأسر ${p.cp}، ثم ${p.M(p.r)} فقط حتى ★ التالية. ترتيب مثالي!`],
        starNx: ['من ★ التي أخذتها للتو، صارت التالية في متناولك.', 'تأخذ ★ وتصطف مباشرة مع التالية!', 'في المكان الذي هبطت فيه تمامًا، ★ التالية في مرماك بالفعل!'],
        starR: [p => `بعد هذه ★، لا يحتاج الباقي إلا ${p.M(p.r)}.`, p => `خذ هذه ★ أولًا وتنتهي في ${p.M(p.r)}.`, p => `من هذه ★ تجمع الباقي في ${p.M(p.r)}.`],
        promo: 'رقِّ البيدق إلى وزير هنا! الآن تتحرك في كل الاتجاهات، قفزة!',
        mid: [p => `لا ★ بعد، لكن من هنا تصل إلى واحدة في النقلة التالية. ${p.k ? 'ولا خطوة زائدة!' : 'محطة مثالية!'}`, 'التوقف هنا أولًا يتيح لك بلوغ ★ في النقلة التالية مباشرة.', 'تبدو كالتفاف، لكنها في الحقيقة الطريق المختصر إلى ★ التالية.'],
        path: [p => `من هنا، لا تحتاج كل ★ إلا ${p.M(p.r)} أخرى. بلا أي التفاف!`, p => `مرّ بهذا المربع وتنتهي في ${p.M(p.r)}، قفزة!`, p => `في التأني السلامة! هذا المربع على أقصر طريق: بقيت ${p.M(p.r)}.`],
      },
      W: {
        greedy: [p => `تأخذ ★، لكن البقية تبتعد ويكلّفك ذلك ${p.M(p.e)} زيادة. الترتيب مهم!`, p => `الاندفاع نحو أقرب ★ يجعل الباقي التفافًا: خسارة ${p.M(p.e)}. انظر إلى الأمام!`, p => `★ واحدة تأتي بسهولة، لكن الباقي يستغرق ${p.M(p.e)} أكثر. جرّب ترتيبًا آخر!`],
        pawn: ['البيدق لا يتراجع، فإذا تجاوزت صف ★ لن تعود لأخذها.', 'إن مضيت مستقيمًا تفوتك ★ القطرية أمامك. البيدق لا يعود أبدًا!', 'البيدق الذي تقدّم لا يرجع، وتضيع فرصة أخذ ★.'],
        dead: 'لن تستطيع جمع كل ★ بعد الآن.',
        cap: [p => `أسر القطعة المعترضة يبعدك عن طريقك ${p.M(p.e)}.`, p => `هذا الأسر تحويلة: ${p.M(p.e)} زيادة حتى ★.`, p => `الأسر لا يقرّبك من أي ★، فتضيع ${p.M(p.e)}.`],
        noReach: [p => `من هناك لا تصل إلى أي ★ في النقلة التالية، فهو التفاف بمقدار ${p.M(p.e)}.`, p => `من هناك لا تستطيع التصويب نحو ★ في النقلة التالية، فتخسر ${p.M(p.e)}.`, p => `لا توجد ★ على بعد نقلة من ذلك المربع، لذا تحتاج ${p.M(p.e)} إضافية.`],
        off: [p => `يمكنك التصويب نحو ★، لكن الطريق ينحرف ويكلّف ${p.M(p.e)}.${p.t ? ' خذ أولًا ★ التي في متناولك!' : ''}`, p => `تقترب، لكن الترتيب يختل فيطول الأمر ${p.M(p.e)}.${p.t ? ' لا تفوّت ★ يمكنك أخذها فورًا!' : ''}`, p => `هناك ★ في المتناول، لكن الدوران على الجميع يضيّع ${p.M(p.e)}.${p.t ? ' كانت هناك ★ تؤخذ أولًا!' : ''}`],
      },
      done: 'جمعت النجوم، يا لها من قفزات!', go: ['ثلاث ★ في كل مرحلة، مذهل، قفزة! والآن 3 ألغاز من الطرق التي سلكتها للتو. جد أقصر نقلة!', 'أحسنت! والآن 3 ألغاز من تلك الطرق. ابحث عن أقصر نقلة!'],
    },
  };
  function cdBoard(fen) { const b = Array(64).fill(''); String(fen).split(' ')[0].split('/').forEach((row, i) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - i) * 8 + f] = ch; f++; } } }); return b; }
  const cdName = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1), cdSq = n => (+n[1] - 1) * 8 + 'abcdefgh'.indexOf(n[0]);
  const CD_DIR = { r: [[1, 0], [-1, 0], [0, 1], [0, -1]], b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], n: [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]] };
  CD_DIR.q = CD_DIR.k = CD_DIR.r.concat(CD_DIR.b);
  function cdAtt(occ, pc, q, black) {   // the squares a piece on q attacks (a black pawn: diagonally down)
    const out = [], r0 = q >> 3, f0 = q & 7, ok = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
    if (pc === 'p') { const dr = black ? -1 : 1; [-1, 1].forEach(df => { if (ok(r0 + dr, f0 + df)) out.push((r0 + dr) * 8 + f0 + df); }); return out; }
    const slide = 'rbq'.includes(pc);
    for (const [dr, df] of CD_DIR[pc]) { let r = r0 + dr, f = f0 + df; while (ok(r, f)) { out.push(r * 8 + f); if (!slide || occ[r * 8 + f]) break; r += dr; f += df; } }
    return out;
  }
  function cdMoves(S, st) {   // S: { blk: [[sq, pc]…], stars: [sq…], safe }; st: { q, pc, bm (black alive bits), sm (★ left bits) }
    const occ = Array(64).fill(0); S.blk.forEach(([q], i) => { if (st.bm >> i & 1) occ[q] = 2; });
    const out = [], r0 = st.q >> 3, f0 = st.q & 7, ok = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;
    const add = (to, promo) => { if (occ[to] === 1) return; out.push({ to, promo }); };
    if (st.pc === 'p') {
      const one = st.q + 8; if (r0 < 7 && !occ[one]) { add(one, r0 + 1 === 7 ? 'q' : ''); if (r0 === 1 && !occ[one + 8]) add(one + 8, ''); }
      [-1, 1].forEach(df => { if (r0 < 7 && ok(r0 + 1, f0 + df) && occ[(r0 + 1) * 8 + f0 + df] === 2) add((r0 + 1) * 8 + f0 + df, r0 + 1 === 7 ? 'q' : ''); });
    } else cdAtt(occ, st.pc, st.q, false).forEach(to => add(to, ''));
    return out.filter(m => {
      if (!S.safe) return true;
      const o2 = occ.slice(); o2[m.to] = 0;   // (= drillDanger: the moving piece and the square's own piece left out)
      return !S.blk.some(([q, pc], i) => (st.bm >> i & 1) && q !== m.to && cdAtt(o2, pc.toLowerCase(), q, true).includes(m.to));
    }).map(m => {
      const n = { q: m.to, pc: m.promo || st.pc, bm: st.bm, sm: st.sm };
      S.blk.forEach(([q], i) => { if (q === m.to) n.bm &= ~(1 << i); });
      S.stars.forEach((q, i) => { if (q === m.to) n.sm &= ~(1 << i); });
      return { u: cdName(st.q) + cdName(m.to) + m.promo, to: m.to, promo: m.promo, st: n, star: n.sm !== st.sm, cap: n.bm !== st.bm };
    });
  }
  function cdDist(S, st, memo) {   // the fewest moves to take every ★ left (breadth first)
    const key = s => s.q + s.pc + ':' + s.bm + ':' + s.sm, k0 = key(st); if (memo.has(k0)) return memo.get(k0);
    if (!st.sm) { memo.set(k0, 0); return 0; }
    let front = [st], d = 0; const seen = new Set([k0]);
    while (front.length && d < 14) { d++; const nx = [];
      for (const s of front) for (const m of cdMoves(S, s)) { if (!m.st.sm) { memo.set(k0, d); return d; } const k = key(m.st); if (!seen.has(k)) { seen.add(k); nx.push(m.st); } }
      front = nx; }
    memo.set(k0, 99); return 99;
  }
  function cdFen(S, st) {
    const b = Array(64).fill(''); S.blk.forEach(([q, pc], i) => { if (st.bm >> i & 1) b[q] = pc; }); b[st.q] = st.pc.toUpperCase();
    const rows = []; for (let r = 7; r >= 0; r--) { let s = '', e = 0; for (let f = 0; f < 8; f++) { const c = b[r * 8 + f]; if (c) { if (e) s += e; e = 0; s += c; } else e++; } if (e) s += e; rows.push(s); }
    return rows.join('/') + ' w - - 0 1';
  }
  // one new ★ position for a drill lesson (problem i): the piece the lesson teaches (the capture / safety lessons: the pieces their stages use),
  // ★ and black pieces at random — kept when the shortest route is 2–4 moves (the king 2–5), the first move has 1–2 right answers out of
  // 3 or more (the pawn: 2 or more), no promotion on the first move, and the position is new (not a stage's, not an earlier problem's)
  const CD_SEEN = [];   // (every drill problem made on this page, as 64 squares — no two alike across the chess lessons)
  function cdGen(s, i, seen) {
    const stg = s.stages || [], sid = s.id, R = n => Math.floor(Math.random() * n), pcs = [...new Set(stg.map(g => (cdBoard(g.fen).find(c => c && c === c.toUpperCase()) || 'Q').toLowerCase()))];
    const free = (occ, lo = 0, hi = 63) => { for (let k = 0; k < 50; k++) { const q = lo + R(hi - lo + 1); if (!occ.has(q)) { occ.add(q); return q; } } return -1; };
    for (let tr = 0; tr < 400; tr++) {
      const pc = sid === 'b_capture' || sid === 'b_safety' ? pcs[(i + tr) % pcs.length] : pcs[0], occ = new Set(), blk = [], stars = [];
      let q0;
      if (pc === 'p') {   // a pawn on the 2nd–4th rank, black pieces just ahead to take, ★ on them or on a square ahead
        const f = 1 + R(6), r = 1 + R(3); q0 = r * 8 + f; occ.add(q0);
        const nb = 1 + R(2); for (let k = 0; k < nb; k++) { const rr = r + 1 + R(2), ff = f + R(5) - 2; if (rr > 6 || ff < 0 || ff > 7 || occ.has(rr * 8 + ff)) continue; occ.add(rr * 8 + ff); blk.push([rr * 8 + ff, 'pnb'[R(3)]]); }
        blk.forEach(([q]) => { if (R(3)) stars.push(q); }); if (!stars.length || R(2)) { const rr = Math.min(6, r + 2 + R(2)), ff = f + R(3) - 1; if (ff >= 0 && ff < 8 && !occ.has(rr * 8 + ff)) { occ.add(rr * 8 + ff); stars.push(rr * 8 + ff); } }
      } else {
        q0 = free(occ);
        if (sid === 'b_capture') { const n = 2 + (R(3) === 0 ? 1 : 0); for (let k = 0; k < n; k++) { const q = free(occ, 8, 63); if (q >= 0) { blk.push([q, 'pnbr'[R(4)]]); stars.push(q); } } }
        else {
          if (sid === 'b_safety') blk.push([free(occ, 16, 55), 'bnr'[R(3)]]);
          else if (sid === 'b_rook' && R(2)) blk.push([free(occ, 8, 55), 'p']);
          const n = 2 + (R(2) && sid !== 'b_safety' ? 1 : 0); for (let k = 0; k < n; k++) stars.push(free(occ));
        }
      }
      if (q0 < 0 || stars.some(q => q < 0) || blk.some(([q]) => q < 0) || !stars.length) continue;
      const S = { blk, stars, safe: sid === 'b_safety' }, st = { q: q0, pc, bm: (1 << blk.length) - 1, sm: (1 << stars.length) - 1 };
      if (S.safe && (blk.some(([q, c]) => cdAtt(Array(64).fill(0), c, q, true).includes(q0)) || stars.some(z => blk.some(([q, c]) => { const o = Array(64).fill(0); blk.forEach(([x]) => { o[x] = 2; }); return cdAtt(o, c, q, true).includes(z); })))) continue;   // (start and ★ squares not attacked)
      const key = (() => { const b = Array(64).fill(''); blk.forEach(([q, c]) => { b[q] = c; }); b[q0] = pc.toUpperCase(); return b.join(',') + '|' + stars.map(cdName).sort().join(','); })();
      if (seen.has(key)) continue;
      // (2026-11-23 lesson loop: the same lone piece on the same square with the same ★ a lesson or two later read as the same problem
      //  again — キングの1問目がルークの3問目と、ナイトの2問目がキングの3問目とほぼ同じ配置だった。盤（駒・黒の駒・★）を64マスで比べ、
      //  この画面で出したどの問題とも5マス以上ちがう配置だけを使う)
      const sq = (() => { const b = Array(64).fill('.'); blk.forEach(([q, c]) => { b[q] = c; }); stars.forEach(q => { b[q] = b[q] === '.' ? '*' : '#'; }); b[q0] = pc.toUpperCase(); return b; })();
      if (CD_SEEN.some(o => { let d = 0; for (let k = 0; k < 64 && d < 5; k++) if (o[k] !== sq[k]) d++; return d < 5; })) continue;
      const memo = new Map(), d = cdDist(S, st, memo), hi = pc === 'k' ? 5 : 4;
      if (d < 2 || d > hi) continue;
      const ms = cdMoves(S, st); if (ms.length < (pc === 'p' ? 2 : 3) || ms.some(m => m.promo)) continue;
      ms.forEach(m => { m.d = cdDist(S, m.st, memo); }); const ok = ms.filter(m => 1 + m.d === d);
      if (!ok.length || ok.length > 2 || ok.length >= ms.length) continue;
      seen.add(key); CD_SEEN.push(sq); if (CD_SEEN.length > 60) CD_SEEN.shift(); return { gi: i, step: 0, S, st, d, ms, ok, left: stars.length };
    }
    return null;
  }
  function chDrillQs(s, lang) {
    const cands = [];
    (s.stages || []).forEach((g, gi) => {
      const b = cdBoard(g.fen), blk = [], stars = (g.stars || []).map(cdSq); let st = null;
      b.forEach((c, q) => { if (!c) return; if (c === c.toUpperCase()) st = { q, pc: c.toLowerCase() }; else blk.push([q, c]); });
      if (!st) return; const S = { blk, stars, safe: !!g.safe }, memo = new Map();
      st.bm = (1 << blk.length) - 1; st.sm = (1 << stars.length) - 1;
      for (let step = 0; st.sm && step < 12; step++) {
        const d = cdDist(S, st, memo), ms = cdMoves(S, st).map(m => Object.assign(m, { d: cdDist(S, m.st, memo) }));
        const ok = ms.filter(m => 1 + m.d === d);
        if (ms.length >= 3 && ok.length < ms.length && !ms.some(m => m.promo)) cands.push({ gi, step, S, st, d, ms, ok, left: stars.filter((q, i) => st.sm >> i & 1).length });
        if (!ok.length) break; st = ok[0].st;
      }
    });
    // (2026-11-22 user: 駒の配置まで★集めと同じ問題の繰り返し) the 3 problems are new positions each time the lesson opens — made at random
    // in the lesson's own kind (its piece, its blockers / targets / attackers), never a stage's position, each one different; the route
    // positions above are only the fallback
    const pickd = [], seen = new Set((s.stages || []).map(g => cdBoard(g.fen).join(',') + '|' + (g.stars || []).slice().sort().join(',')));
    for (let i = 0; i < 3; i++) { const c = cdGen(s, i, seen); if (c) pickd.push(c); }
    if (pickd.length < 3) { const used = new Set();
      for (const pass of [0, 1, 2]) for (let gi = (s.stages || []).length - 1; gi >= 0 && pickd.length < 3; gi--) {
        if (pass < 2 && used.has(gi)) continue;
        const c = cands.filter(x => x.gi === gi && !pickd.includes(x)).sort((a, b) => (b.left >= 2) - (a.left >= 2) || (b.step > 0) - (a.step > 0) || a.step - b.step)[0];
        if (!c || (pass === 0 && c.left < 2)) continue; pickd.push(c); used.add(gi);
      } }
    const C = CDQ[lang] || CDQ.en, sid = s.id, used2 = new Set(), once = t => { if (!t || used2.has(t)) return ''; used2.add(t); return t; };
    const sp = lang === 'ja' || /^zh/.test(lang) ? '' : ' ', T = (x, p) => typeof x === 'function' ? x(p) : x;
    return pickd.map((c, i) => {
      const pc = c.st.pc, ans = c.ok[0].u, okU = c.ok.map(m => m.u), V = arr => arr[i % arr.length];
      const by = u => c.ms.find(m => m.u === u), stars = c.S.stars.filter((q, j) => c.st.sm >> j & 1).map(cdName);
      const reach = m => cdMoves(c.S, m.st).filter(n => n.star).length;   // (★ the piece can take on its next move)
      let hintTx = sid === 'b_pawn' && pc === 'p' ? (() => { const rel = c.ms.some(m => m.cap) ? 'px' : (c.st.q >> 3) === 1 ? 'p2' : 'pf'; return [rel, 'px', 'pf', 'p2'].map(k => C.hint[k]).find(t => once(t)) || C.hint[rel]; })() : (C.hint[pc] || C.hint.q)[i % 3];   // (the pawn: the hint that fits, another one when it was said already)
      if (sid === 'b_capture') { const t = once(C.hint.cap); if (t) hintTx += sp + t; }
      if (c.S.safe) hintTx = [once(C.hint.safe), i ? hintTx : ''].filter(Boolean).join(sp);
      const P = (m, e) => ({ r: m.d, e, k: pc === 'k', how: (C.how || {})[pc] || '', M: C.M, MD: C.MD || C.M, t: false, cp: C.cp[(c.S.blk.find(([q]) => q === m.to) || [0, 'p'])[1].toLowerCase()] || C.cp.p });
      const whyR = m => { const p = P(m, 0), R = C.R;
        if (m.star && !m.d) return V(R.last);
        if (m.cap && m.d) return T(V(R.cap), p);
        if (m.star) return T(V(reach(m) ? R.starNx : R.starR), p);
        if (m.promo) return R.promo;
        return T(V(reach(m) ? R.mid : R.path), p); };
      const alt = u0 => { const m0 = u0 && by(u0); if (m0 && !okU.includes(u0)) return m0; return c.ms.filter(m => !okU.includes(m.u)).sort((a, b) => b.star - a.star || a.d - b.d)[0]; };
      const whyW = (m, x) => { const p = Object.assign(P(x, 1 + x.d - c.d), { t: !!m.star }), W = C.W;
        if (x.star && x.d) return T(V(W.greedy), p);
        if (pc === 'p' && !x.star && !x.cap && (x.d >= 99 || p.e >= 3)) return V(W.pawn);
        if (x.d >= 99) return W.dead;
        if (x.cap) return T(V(W.cap), p);   // (a capture off the ★: a blocker taken — on a ★ it is the branch above)
        if (!reach(x)) return T(V(W.noReach), p);
        return T(V(W.off), p); };
      const o = { pos: cdFen(c.S, c.st), kind: 'best', drill: { stars, safe: c.S.safe }, P: { ok: okU }, ans, hintTx,
        ask: C.askS ? C.askS[sid][i % 3] : V(sid === 'b_capture' ? C.askCap : sid === 'b_safety' ? C.askSafe : C.ask).replace('{p}', C.pk[pc]),
        good: u => { const m = (u && okU.includes(u) && by(u)) || c.ok[0]; return V(C.good)('{x}', whyR(m)); },
        ng: u0 => { const x = alt(u0); if (!x) return ''; return V(C.ng)('{m}', '{x}', whyW(c.ok[0], x)); } };
      return o;
    });
  }
  const CHESS = {
    LKEY: 'aicoding-chess-lessons', OKEY: 'aicoding-chess-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const txt = u => fetch(u).then(r => r.text());
      return (this.p = Promise.all([getJ('../chess/lessons.json?v=30261107i14'), getJ('../chess/openings.json?v=20261107i14'), txt('../chess/i18n.js?v=20261107pro2-i14'), txt('../chess/i18n_basics.js?v=20261019ol-i14'), txt('../chess/voice-knight-ja.js?v=3').catch(() => '')])
        .then(([ls, op, a, b, vk]) => {
          const w = {}; try { new Function('window', a)(w); new Function('window', b)(w); } catch (e) { console.warn('[lessons3d] chess texts', e); }   // (a sandbox: the page's own I18N stays untouched)
          try { const v = {}; new Function('window', vk)(v); this.V = ((v.I18N || {})['ja@knight']) || {}; } catch (e) { this.V = {}; }   // (ナイトン's own lines, 3D, ja)
          this.I = w.I18N || {}; this.data = { ls, op }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang) { const I = this.I || {}; if (lang === 'ja' && this.V && this.V[k] != null) return this.V[k]; return (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; },
    list(kind, lang) {
      const D = this.data;
      const mini = f => f && window.AtlasMini ? AtlasMini.chess(f) : '';
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(s => ({ key: s.id, cat: 'open', catName: '', title: L(s.title, lang), sub: L((NC.chess || {})['op:' + s.id + '/short'] || s.short, lang), svg: mini(((s.problems || [])[0] || {}).fen), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course || 'tactics', catName: this.tx('course.' + (s.course || 'tactics'), lang), title: this.tx('ls.' + s.id + '.title', lang) || s.id, sub: this.tx('ls.' + s.id + '.sub', lang), svg: mini((s.diagram && s.diagram.fen) || ((s.problems || [])[0] || {}).fen || ((s.stages || [])[0] || {}).fen),
        st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));   // (the beginner drills play on the 3D table too, 2026-11-13)
    },
    introPos(c) {   // the lesson's diagram (chess/lessons.json step.diagram: fen, dots, hl, arrows), shown locked while the intro is read
      const s = this.data.ls.steps.find(x => x.id === c.id), d = s && s.diagram; if (!d || !d.fen) return null;
      const fen = d.fen.split(' ').length > 1 ? d.fen.split(' ')[0] + ' w - - 0 1' : d.fen + ' w - - 0 1';
      return { pos: fen, drill: { stars: [], lock: true }, annot: [...(d.dots || []).map(q => ({ at: q, cls: 'ok' })), ...(d.hl || []).map(q => ({ at: q, cls: 'hang' })), ...(d.arrows || []).map(([a, b]) => ({ arrow: [a, b], cls: '' }))] };
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = k => this.tx('ls.' + s.id + '.' + k, lang);
      if (s.kind === 'drill') return { id: s.id, title: T('title'), intro: T('intro'), goal: T('goal'), drill: s.stages, dx: k => this.tx(k, lang),
        probs: CDQ[lang] ? (() => { try { return chDrillQs(s, lang); } catch (e) { console.warn('[lessons3d] chess drill problems', e); return []; } })() : [],   // (2026-11-21 lesson loop: 3 problems from the stages' shortest routes, after the ★ — every language, 2026-11-22)
        qsave: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: o.best || 0, clear: o.clear || pass }; put(this.LKEY, pr); return pass; },   // ★ stages (= chess/app.js drillMove: 3 ★ within par, 2 within par + 2, else 1; always passed)
        save: (n, max, q) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }; pr[s.id] = { best: Math.max(o.best || 0, n), clear: o.clear || !q }; put(this.LKEY, pr); return true; } };   // (q: problems follow — cleared by them)
      const V = lang === 'ja' ? (this.V || {}) : {};
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'b', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`]; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      return { id: s.id, title: T('title'), intro: T('intro'), ramp, RU,   // (the warm-up before the scored problems: explain / try — not scored)
        probs: chCheerJa(((LV) => (s.problems || []).map((p, i) => { const o = { pos: p.fen, kind: 'best', P: p, ask: T('goal'), why: T('why'), ngTx: T('ng'), ans: p.best || (p.ok || [])[0] }; if (lang === 'ja' && o.ans) try { Object.assign(o, chLsJa(s.id, o, i, LV) || {}); } catch (e) { console.warn('[lessons3d] chess lesson', e); } return o; }))(lang === 'ja' ? (() => { const LV = chOpVoice(s.id, CH_LSV); LV.add(String(T('intro') || '')); (ramp || []).forEach(r => ['t', 'b', 'g', 'h', 'y'].forEach(f => { const v = r[f], t = v && (typeof v === 'string' ? v : v.ja); if (t) LV.add(t, true); })); return LV; })() : null), lang),   // (2026-11-21 lesson loop: ナイトン's question, hint, why / what yours misses)   // (ngTx: the wrong answer's own words where the lesson has them)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.op.sets.find(x => x.id === key); if (!s) return null;
      const probs = s.drill ? shuffle(s.drill.slice()).slice(0, 5).sort((a, b) => s.drill.indexOf(a) - s.drill.indexOf(b)).map(i => s.problems[i]) : shuffle(s.problems || []).slice(0, 5);   // (2026-11-24 第2期・担当B: the verified drill, easy → hard — tools/lesson-verify.js chessOpen)
      const nc = NC.chess || {}, notes = Object.assign({}, s.study && s.study.notes || {}); Object.keys(nc).forEach(k => { const m = k.match(/^op:(.+)\/n(\d+)$/); if (m && m[1] === s.id) notes[m[2]] = nc[k]; });   // (3D: the texts without coordinates)
      const IN = nc['op:' + s.id + '/intro'] || s.intro, ja = lang === 'ja';
      if (ja && CHJ_OP.notes[s.id]) Object.entries(CHJ_OP.notes[s.id]).forEach(([k, v]) => { notes[k] = { ja: v }; });   // (2026-11-21 lesson loop: ナイトン's own lines)
      const intro = ja && CHJ_OP.intro[s.id] ? CHJ_OP.intro[s.id] : (L(IN, lang) || []).join ? L(IN, lang).join('<br>') : L(IN, lang);
      const CV = ja ? chOpVoice(s.id) : null; if (CV) { CV.add(intro); try { Object.assign(notes, chStepNotesJa((s.study && s.study.steps || []).map(x => x[0]), notes, CV)); } catch (e) { console.warn('[lessons3d] chess step notes', e); } }   // (2026-11-22 lesson loop: a word on every move)
      return { id: s.id, title: L(s.title, lang), intro, start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        steps: (s.study && s.study.steps || []).map(x => x[0]), notes,
        probs: probs.map((p, i) => { const o = { pos: p.fen, kind: 'best', P: p, ans: p.cand && p.cand[0][0] }; if (ja && o.ans) try { Object.assign(o, chOpJa(o, L(s.title, 'ja'), CV, i)); } catch (e) { console.warn('[lessons3d] chess opening', e); } return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = chess/app.js problemPoints (the stored scores)
      if (P.cand) { if (P.acc && P.acc.includes(u)) return 20; const c = (P.cand.find(x => x[0] === u) || [0, 0])[1], top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }   // (acc: the moves as good and as often played as the most played one — openings.json, chess/tools/op_curate.js)
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
  const rvSvg = cs => { const c = String(cs).split(':')[0]; let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#2f8f5b"/>';
    for (let k = 1; k < 8; k++) o += `<path d="M${2 + k * 10} 2V82M2 ${2 + k * 10}H82" stroke="#1f6b42" stroke-width=".8"/>`;
    for (let q = 0; q < 64; q++) if (c[q] === '1' || c[q] === '2') o += `<circle cx="${7 + (q & 7) * 10}" cy="${7 + (q >> 3) * 10}" r="4.1" fill="${c[q] === '1' ? '#17181c' : '#f6f2e6'}"${c[q] === '2' ? ' stroke="#bdb6a2" stroke-width=".6"' : ''}/>`;
    return o + '</svg>'; };
  const rvLegal = (c, me) => { const a = Array.isArray(c) ? c : String(c).split('').map(Number), out = []; for (let q = 0; q < 64; q++) if (rvFlips(a, q, me).length) out.push(q); return out; };
  const RV_MK = { focus: 'hl', danger: 'ng', flip: 'ok', front: 'ok', best: 'ok' };
  function rvAid(it) {   // = reversi/index.html warmFacts + warmAids: what the step tells the player to look at
    const c = String(it.cells).split('').map(Number), me = +it.toMove, op = 3 - me, CN = [0, 7, 56, 63], opL = rvLegal(c, op), out = [];
    const nbr = q => { const r = q >> 3, k = q & 7, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = k + dc; if ((dr || dc) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
    const front = (b, s) => { let n = 0; for (let q = 0; q < 64; q++) if (b[q] === s && nbr(q).some(y => !b[y])) n++; return n; };
    const F = {}; for (const m of rvLegal(c, me)) { const f = rvFlips(c, m, me), nc = c.slice(); nc[m] = me; f.forEach(q => { nc[q] = me; });
      const seen = new Set(); f.forEach(q => nbr(q).forEach(y => { if (!nc[y]) seen.add(y); })); const ol = rvLegal(nc.join(''), op), r = m >> 3, k = m & 7;
      const ed = r === 0 || r === 7 ? [m - 1, m + 1] : k === 0 || k === 7 ? [m - 8, m + 8] : null;
      F[m] = { n: f.length, open: seen.size, oM: ol.length, give: ol.filter(q => CN.includes(q) && !opL.includes(q)), front: front(nc, me), reserve: !opL.includes(m), wedge: !CN.includes(m) && !!ed && ed.every(x => c[x] === op) }; }
    const L2 = Object.keys(F).map(Number), lab = (q, v) => out.push({ at: q, label: v }), danger = () => L2.forEach(q => { if (F[q].give.length) out.push([q, 'ng']); }), dots = () => opL.forEach(q => out.push([q, 'dot']));
    const xc = () => { for (const [cn, xs] of [[0, [9, 1, 8]], [7, [14, 6, 15]], [56, [49, 57, 48]], [63, [54, 62, 55]]]) if (!c[cn]) xs.forEach((q, i) => { if (!c[q]) lab(q, i ? 'C' : 'X'); }); };
    switch (it.aid) {
      case 'corner': xc(); danger(); break;
      case 'cwait': xc(); danger(); dots(); break;
      case 'odots': dots(); break;
      case 'mob': case 'pass': L2.forEach(q => lab(q, F[q].oM)); break;
      case 'open': L2.forEach(q => lab(q, F[q].open)); break;
      case 'front': L2.forEach(q => lab(q, F[q].front)); break;
      case 'flips': L2.forEach(q => lab(q, F[q].n)); break;
      case 'wallc': for (let q = 0; q < 64; q++) if (c[q] === me && nbr(q).some(y => !c[y])) out.push([q, 'ng']); break;
      case 'reserve': L2.forEach(q => { if (F[q].reserve) out.push([q, 'ok']); }); dots(); danger(); break;
      case 'wedge': L2.forEach(q => { if (F[q].wedge) out.push([q, 'hl']); }); break;
      case 'region': { const seen = new Set(); for (let q = 0; q < 64; q++) { if (c[q] || seen.has(q)) continue; const reg = [q]; seen.add(q); for (let i = 0; i < reg.length; i++) for (const y of nbr(reg[i])) if (!c[y] && !seen.has(y)) { seen.add(y); reg.push(y); } reg.forEach(y => lab(y, reg.length)); } break; }
    }
    return out;
  }
  /* (2026-11-22 lesson loop) the reversi lessons in リバガメ's words, Japanese, 3D only: his own intros and warm-up lines (RVJ_LS.intro /
     RVJ_LS.ramp — the 2D texts in lessons.json / warm3d.json stay), five questions and five hints per step, and after the answer the
     praise with why or, for a miss, the green square and what yours misses — from the stored move facts (= reversi/index.html
     lessonReason) f[sq] = [value, flips, open, opponent's moves after, gives a corner, empty region, opponent passes]. No coordinates:
     the best squares are framed green on the board, yours red. Cheers the player on (RV_CH; the openers in a different order in each
     lesson). Other languages: the marks and the plain line. */
  const RVJ_LS = {
    intro: {
      rules: 'はさんだ石がぜんぶ自分の色になる、それがリバーシのきほん！ ここでは「何枚返せるか」を数える練習をしよう。',
      corner: '隅に置いた石は、<b>二度と返されない</b>！ 隅から辺へ、ずっと色の変わらない「確定石」が育っていくんだ。<br>でも、隅のななめ隣の<b>X</b>や、辺で隅の隣の<b>C</b>はあぶないマス。うっかり打つと、相手に隅への道を開いちゃうかも？',
      mobility: '石の数で勝っていても、安心はできないんだ。強い人は<b>打てる場所の数</b>を見てる！<br>相手の打てる場所が少ないほど、相手はXやCみたいなイヤなマスに追いこまれる。たくさん返すと外がわの石がふえて、相手の足場になっちゃうね。',
      quiet: '<b>開放度</b>は、返す石のまわりの空きマスの数のこと。小さい手ほど、相手に新しい打ち場所をあげないんだ。<br>まわりを石にかこまれた石だけを返す手は<b>中割り</b>！ 静かで強い、ぼくの好きな手だね。',
      wall: '自分の石が外がわに一列に並んだら、それは<b>壁</b>。壁の外は相手だけが打てる場所になって、こっちは苦しくなるんだ。<br>反対に、<b>自分だけが打てるマス（余裕手）</b>はいつでも使える貯金！ あわてて使わずに、とっておこうね。',
      edge: '辺で、相手の石2つにはさまれた空きマスに打つ手を<b>付け手</b>（くさび）って呼ぶんだ。<br>相手の辺の形をくずして、隅や辺をうばうきっかけになる！ 4本の辺に「すき間」がないか、のぞいてみよう。',
      exception: '「隅は必ず取れ」にも、じつは例外があるんだ。隅を取ったあと打つ場所がなくなって、相手にいい所を連続で打たれたら損でしょ？<br>強い人は<b>手番</b>のために隅を後回しにすることもある。X打ちが正しい場面だって、ちゃんとあるよ！',
      parity: '終盤、空きマスはいくつかの<b>塊</b>に分かれる。<b>奇数の塊には先に入る</b>のが基本なんだ。<br>塊の最後の1手を打てば、直前に返された石を取り返せる。だから最後に打つほうが得ってわけ！',
      finish: '終盤は、格言より<b>正確に読むこと</b>がいちばん！ ここでは勝ち（か引き分け）を守れる手が、ひとつしかないんだ。<br>まず探したいのは<b>相手をパスさせる手</b>。相手が打てなければ、こっちは続けて打てるからね。',
    },
    // the warm-ups (reversi/warm3d.json keys; pp: the practice questions in order, h: the hints of the tries in order)
    ramp: {
      rules: { t1: 'はさんだら、ひっくり返る！', c1: '自分の石で相手の石を<b>縦・横・ななめ</b>にはさむと、はさんだ石がぜんぶ自分の色に変わる！<br>緑の枠が、いま黒が打てる場所。1枚も返せないマスには打てないんだ。<br>打てる場所がなければパス。どちらも打てなくなったら終わりで、石の多いほうが勝ちだね。',
        g1: '黒の番！ 緑の枠のどこかに、ぽんと打ってみて。', h1: '緑の枠なら、どこでも相手の石をはさめるよ。', y1: 'ひっくり返ったね！ はさんだ石は、こうして自分の色になるんだ。',
        g2: '今度は、いちばんたくさん返せる場所をねらってみよう！', h2: '打つ前に、何枚はさめるか向きごとに数えてみて。', y2: 'お見事、いちばん多く返せたね！ 全部の向きをのこさず見るのがコツ。' },
      corner: { t1: '隅は、二度と返されない！', c1: '<b>隅</b>（盤の角）に置いた石は、もう二度と返されないんだ。金の枠の隅に白が打つと、矢印のように辺の石も白になって、隅から続く<b>返されない石</b>ができる！<br>いっぽう、隅のななめ隣の<b>X</b>や、辺で隅の隣の<b>C</b>は、相手に隅への道を作りがちなマスだね。',
        g: 'まずは隅を取ってみよう！ 白が打てる隅は、ひとつだけ。', gok: '隅、ゲット！ 隅の石と、そこから続く辺の石は、もう返されないね。赤い枠のXに打っていたら、相手に隅を渡すところだったんだ。',
        pp: ['次は練習問題！ いちばんいい場所はどこかな？', 'もう1問いこう！ 隅とX・Cに目を配ってね。'],
        h: ['盤の4つの角を順に見てごらん。白で黒をはさめる角はどこかな？', '取れる隅がないか、まず探してみて！', '打ったあと、相手が隅に手をのばせないかも確かめよう。'],
        p1ok: 'そう、隅が正解！ ほかの手は、相手に打てる場所をたくさんあげちゃうんだ。', p2ok: 'ばっちり！ 赤い枠は相手に隅を渡す手、ほかの手は外がわの石を大きくふやす手だったね。' },
      mobility: { t1: '相手の打てる場所を減らそう', c1: '赤い点は、いま<b>相手が打てる場所</b>で、14か所あるね。少ないほど、相手は打ちたくないマスに追いこまれるんだ。<br>白が金の枠に打つと、相手の打てる場所は<b>8か所</b>に減る！ 赤い枠の手だと<b>15か所</b>にふえちゃう。',
        g: '数字は「そこに打ったあと、相手が打てる場所の数」。いちばん小さい手に打ってみよう！', gok: '相手の打てる場所が14から8に減ったね！ 返したのがほとんど内がわの石だから、新しい足場をあげなかったんだ。',
        pp: ['さあ練習！ どこに打つのが得かな？', 'もう1問！ 相手をきゅうくつにする手をさがそう。'],
        h: ['数字をくらべて、いちばん小さいマスを探してみて。', '打ったあと、相手が何か所に打てるかを手ごとに思いうかべてみて！', '外がわの石を返す手は、相手の足場をふやしがちなんだ。'],
        p1ok: '正解！ 相手の打てる場所は7か所で、ほかの手よりずっと少ないね。', p2ok: 'いいね！ 外がわの石を返す手だと、相手の打てる場所がふえちゃうところだったんだ。' },
      quiet: { t1: 'まわりに空きの少ない石を返す', c1: '<b>開放度</b>は、返す石のまわりにある空きマスの数。金の枠に白が打つと、返るのは緑の枠の2枚で、まわりの空きは1マスだけ。だから開放度は<b>1</b>！<br>赤い枠の手は外がわの石を返して、開放度は<b>7</b>。小さい手ほど相手に打ち場所をあげない、<b>静かな手</b>なんだ。',
        g: '数字は、それぞれの手の開放度。いちばん小さい、静かな手に打ってみて！', gok: '開放度1の静かな手だね！ 返した石がまわりを石にかこまれているから、相手は足がかりにできないんだ。',
        pp: ['さあ練習！ 静かな手はどこだろう？', 'もう1問いってみよう！'],
        h: ['いちばん小さい数字は、どこにあるかな？', '返す石のとなりに、空きマスがいくつあるか数えてみて。', '静かな手でも、相手に隅をあげないかは見ておこうね！'],
        p1ok: '正解！ 開放度0、空きにふれない内がわの石だけを返す<b>中割り</b>だね。', p2ok: 'いいね、ほかの手より静かな手！ 赤い枠の手は、相手に隅も渡しちゃうんだ。' },
      wall: { t1: '壁を作らない', c1: '赤い枠の石は、空きマスに接している<b>黒の外がわの石</b>。これが一列に並ぶと<b>壁</b>になって、壁の外には白だけが打てるようになっちゃう。<br>金の枠の手は内がわの石を返すから、外がわの石が減る！ 矢印の向きに返す手は、壁を厚くしちゃうんだ。',
        g: '数字は「打ったあと、きみの外がわの石がいくつになるか」。いちばん少なくなる手に打ってみよう！', gok: '外がわの石は9個で、ほかの手より少ないね！ 壁を作らない手は、自分の打てる場所を守ってくれるんだ。',
        pp: ['さあ練習！ 壁にならない手はどこ？', 'もう1問！ 外がわの石の数に注目してみて。'],
        h: ['いちばん小さい数字のマスを探してみて。', '内がわの石を返す手を選ぶと、壁ができにくいね。', '辺の石と石のあいだに、割りこめる手もあるかも？', '緑の枠はあとでも打てるから、今はそれ以外で安全な手を探してね。'],
        p1ok: '正解！ 外がわの石が12個まで減る、内がわの静かな手だね。', p2ok: 'ばっちり！ 外がわの石が減って、しかも辺の白石2つのあいだに割りこむ手なんだ。',
        t2: '自分だけが打てる場所は、貯金', c2: 'もうひとつの考え方が<b>余裕手</b>。緑の枠は、<b>白だけが打てて、黒は打てない場所</b>なんだ。黒に消される心配がないから、急がずに「貯金」として残しておける！<br>赤い点は黒の打てる場所。金の枠は黒も打てるから、先に使っておく価値があるね。',
        g2: '緑の枠の余裕手はとっておいて、ほかの安全な手を打とう。赤い枠は、相手に隅を渡す手！', g2ok: '正解！ 余裕手は残したまま。赤い枠の手だと、相手に隅を渡すところだったね。' },
      edge: { t1: '辺のすき間に打ちこむ', c1: '上の辺を見て。緑の枠に白石が2つあって、そのあいだの金の枠が空いてるね。相手の石2つにはさまれた辺の空きに打つ手を<b>付け手</b>（くさび）っていうんだ。<br>黒がここに打つと白の辺が分かれる！ しかも両側が白だから、横から返されることもないんだ。',
        g: '上の辺の、白石2つにはさまれた金の枠に打ってみよう！', gok: '付け手で白の辺を分けたね！ ほかの手だと、相手に隅を渡すところだったんだ。',
        pp: ['さあ練習！ 辺をじっくりながめてみよう。', 'もう1問いこう！'],
        h: ['金の枠は上の辺。白石と白石のあいだにあるよ。', '4本の辺をひとつずつ見て、相手の石にはさまれた空きを探してみて。', '相手の石と石のあいだ、空いているマスはどこかな？'],
        p1ok: '正解！ 黒石2つのあいだに割りこむ付け手。しかも白だけが打てる場所だったんだ。', p2ok: 'いいね！ 白石2つのあいだに割りこむ付け手なんだ。' },
      exception: { t1: '相手が取れない隅は、逃げない', c1: '「隅はかならず取れ」にも例外がある。この局面の左下の隅は、白には取れないんだ（赤い点が白の打てる場所）。<b>相手が取れない隅は逃げない</b>から、あとまわしにできる！<br>金の枠の手は外がわの石をふやさず、白の打てる場所も10から9に減らす手だね。',
        g: '左下の隅はあとでも取れる。今は、相手の打てる場所を減らす金の枠に打ってみよう！', gok: '正解！ 白は隅を取れないから、隅は残ったまま。赤い枠のCに打つと、白に隅を取らせちゃうところだったんだ。',
        pp: ['さあ練習！ 隅にとびつかずに考えてみよう。', 'もう1問！ X・Cでも、だめとはかぎらないからね。'],
        h: ['金の枠に打てば、隅は残したままにできるね。', '取れる隅があっても、相手がその隅を取れないなら急がなくていいかも？', '金の枠に打っても、白はその隅に届かないんだ。', '打ったあと、相手の石が隅まで届くかどうか、手ごとに確かめてみて！'],
        p1ok: 'いいね！ 隅は白には取れないから、急がなくていいんだ。この手は静かに相手の打てる場所を減らすね。',
        t2: 'Xに打っていい場面もある', c2: 'Xに打つのが正しい場面もあるんだ。矢印の対角線を見て。金の枠のXに黒が打つと、その線はずっと黒石で、先は空き。だから白は隅（赤い枠）を取れない！<br><b>「XやCは危ない」は目安。</b>打ったあと相手が隅を取れるか、確かめよう。',
        g2: '金の枠のX打ちは安全！ 赤い枠（隅を渡す手）をよけて、ここに打ってみよう。', g2ok: '正解！ 白は隅を取れないね。ほかの手だと、白が隅を取れるようになっていたんだ。',
        p2ok: 'お見事！ Xだけど、白はこのあと隅を取れない。赤い枠のCは、隅を渡しちゃう手だったね。' },
      parity: { t1: '空きの塊を数える', c1: '終盤の空きマスは、いくつかの<b>塊</b>に分かれる。数字は、そのマスが入っている塊の大きさ。ここには6マスの塊と、1マスだけの塊（金の枠）があるね。<br><b>奇数の塊に自分から入る</b>と、その塊の最後の1手を自分が打てる！ 1マスの塊に白が打てば、黒はそこに何も返せないんだ。',
        g: '数字は空きの塊の大きさ。奇数の塊の空きに打ってみよう！', gok: '正解！ 1マスの塊を白が埋めたから、黒は返し返しができないね。',
        pp: ['さあ練習！ 塊の大きさを数えてみて。', 'もう1問いこう！'],
        h: ['1・3・5…が奇数。金の枠の塊は何マスかな？', '塊ごとにマスを数えて、奇数の塊を探そう！', '奇数の塊は、いくつあるかな？'],
        p1ok: 'いいね！ そこは1マスの塊。ほかの手は、4マスの塊（偶数）に入っちゃうんだ。', p2ok: 'ばっちり！ 1マスの塊を先に埋めたね。ほかの手は2マスの塊（偶数）に入る手だった。' },
      finish: { t1: '相手をパスさせる', c1: '赤い点は、いま<b>相手が打てる場所</b>。白が打てるのは1か所だけだね。黒が先に金の枠に打つと、白は打つ場所がなくなって<b>パス</b>！ 黒が続けて打てるんだ。<br>終盤では、相手をパスさせる手が勝負を決めることがよくあるよ。',
        g: '数字は、打ったあとの相手の打てる場所の数。0になる手に打ってみよう！', gok: '白はパス！ 黒はもう一度打てるね。この手だけが勝ちで、ほかの手はぜんぶ負けだったんだ。',
        pp: ['さあ練習！ パスさせる手はあるかな？', 'もう1問！ 最後まで気をぬかずにいこう。'],
        h: ['数字が0のマスが、相手をパスさせる手だね。', '相手がいま打てる場所を、先にふさいでみたら？', '白が打てる場所は、何か所ある？'],
        p1ok: '正解！ 白がただひとつ打てた場所を先に埋めて、パスさせたね。', p2ok: 'お見事！ 白が打てる場所はそこだけ。埋めれば白はパスで、黒が続けて打てる。' },
    },
    ask: {
      rules: ['いちばんたくさん返せる場所はどこかな？ 数字を見くらべてみて！', '8方向を見わたして、いちばん多く返せる場所に打ってみよう！', 'ここからが本番！ いちばん多くひっくり返せるのはどこだろう？', 'たくさん返せるマスはどこ？ じっくり数えてね。', 'さあ、いちばん多く返る1手はどれかな？'],
      corner: ['どこに打つのがいちばんいいかな？ 隅と、XやCのマスに気をつけて！', '隅は取れるかな？ 取れないなら、相手に隅を渡さない手をさがそう。', '打ったあと、相手が隅を取れないかも見てね。いちばんいい手は？', '確定石を作れるチャンスはある？', 'XとCに気をつけながら、いい手を見つけてみて！'],
      mobility: ['いちばんいい手をさがそう。打ったあと、相手は何か所に打てるかな？', '石の数より、相手の打てる場所の数！ いちばんいい手はどこだろう？', '相手に足場をあげない手は、どこかな？', '相手をきゅうくつにする1手、見つけられる？', 'たくさん返すのが正解とはかぎらない！ どこに打つ？'],
      quiet: ['いちばんいい手はどこかな？ 返す石のまわりの空きに注目してみて！', '静かな手をさがそう。相手に隅をあげないかも見てね。', '中割りできるところ、あるかな？', 'まわりの空きがいちばん少ない手は？ ゆっくり考えていいからね。', '相手に足場をあげない手、見つけてみて！'],
      wall: ['いちばんいい手に打ってみよう。外がわに石を並べないようにね！', '壁を作らない手はどれかな？', '余裕手、とっておけるかな？ いちばん得な手はどこ？', 'この場面、どこに打つのがいちばん得だろう？', '外がわの石をふやさない手、見つけられる？'],
      edge: ['辺をよく見て、いちばんいい手をさがそう！', '相手の辺に、すき間はないかな？', '辺の形がヒント！ どこに打つ？', '付け手のチャンス、あるかな？', '4本の辺を見わたして、いい手を見つけてみて！'],
      exception: ['隅は取るべきかな？ いちばんいい手をじっくりさがそう。', 'いつもの格言どおりでいいのかな？ 打ったあとのことを考えてみて！', '隅やXにも、例外がある！ この場面のいちばんいい手は？', '手番をにぎれる手はどこだろう？', '格言にまどわされずに、いい手を見つけてみて！'],
      parity: ['空きの塊を数えて、いちばんいい手をさがそう！', '終盤だね。最後の1手を取れるのは、どこに打ったときかな？', '奇数の塊は、どこにある？', '塊の大きさをくらべて、打つ場所を決めてみて！', 'あと少しで終局！ 正しい1手はどれ？'],
      finish: ['勝ちを守れる手は、ひとつだけ。どこかな？', '終盤の正念場！ 勝ち（か引き分け）を守れる手をさがそう。', 'ほかの手はみんな負けになっちゃう場面。正しい1手はどこだろう？', '最後まで読みきれるかな？ 負けない手はどれ？', '落ちついて！ 負けにならない1手を見つけよう。'],
    },
    hint: {
      rules: ['縦・横・ななめ、8つの向きにはさめる石を数えてみて。', 'ななめの列は、見落としやすいんだ！', '1つの向きだけじゃなく、ほかの向きでも返せないか見てね。', '自分の石まで、相手の石が何枚続くか数えよう！', '遠くの自分の石とも、はさめることがあるね。'],
      corner: ['まず、4つの角に打てるかどうかを見てごらん。', '隅が取れないときは、隅の隣のマスに要注意！', '打ったあと、相手の石が隅に届く線ができないか考えてみて。', '隅のななめ隣（X）は、とくに危ないマスなんだ。', '安全な手は、隅から離れたところにあることが多いね！'],
      mobility: ['手ごとに、打ったあとの相手の打てる場所を数えてみよう。', 'いちばん多く返す手は、ちょっと要注意！', '外がわの石を返すと、相手の足場がふえがちなんだ。', '内がわの石を返す手が、ねらい目かも？', '相手がいま打てる場所を、ふさげる手はある？'],
      quiet: ['返す石のまわりに、空きマスが少ない手を探そう。', '空きにふれない石だけを返せたら、中割り！', '空きにふれる石を返すと、そこが相手の足場になるんだ。', '開放度が小さくても、隅を渡す手はだめ！', '静かな手が見つからないときは、相手の次の手まで考えてみて。'],
      wall: ['外がわに一列に石が並ぶ手は、よけよう。', 'きみだけが打てる場所は、今すぐ使わなくてもいいかもしれないね。', '内がわの石を返す手を探してみて！', '打ったあと、きみの石のまわりに空きがどれだけ残るか想像してみて。', '相手も打てる場所から先に使うと、貯金が残るね！'],
      edge: ['相手の石と石のあいだに、1マスだけ空いた辺はない？', 'すき間に打てば、横から返される心配がないんだ！', '上下左右、4本の辺を順番に見てね。', '付け手は、相手の辺をまっぷたつにする手！', '辺の手でも、相手に隅をあげないかは確かめよう。'],
      exception: ['隅を取ったあと、安全な手が残るかな？', '相手にいい所を続けて打たれないか、考えてみて！', 'Xでも、相手が隅に届かないなら安全なこともあるんだ。', '打ったあと、相手は何か所に打てる？', '取られる心配のない隅は、あとでも間に合うよ。'],
      parity: ['空きマスの塊ごとに、数を数えてみよう。', '奇数の塊から打つのが基本。でも例外もあるんだ！', '1マスだけの塊は、相手に返されずにすむね。', '相手をパスさせられる手があれば、それがいちばんかも？', '偶数の塊に入ると、最後の1手を相手に取られやすいね。'],
      finish: ['相手をパスさせる手は、ない？', '隅を取る手が勝ちとはかぎらないんだ！', '相手がいま打てる場所を数えてみて。', '最後の1手を打つのは、どっちになりそう？', '大きく返す手より、相手の手を消す手が強いこともあるね。'],
    },
    rf: ['赤い枠は、打つと相手に隅を渡しちゃう手。', '赤い枠は、隅をあげちゃうマス！', '赤い枠に打つと、隅への道が開いちゃう！', '赤い枠は、さけたほうがいい手！', '赤い枠のマスは、相手の隅取りにつながるんだ。'],
    rfWall: ['赤い枠は、外がわに壁を作っちゃう手。', '赤い枠は、壁になっちゃう手！', '赤い枠に打つと、外がわに石が並んじゃう！', '赤い枠は、さけたほうがいい手！', '赤い枠のマスは、壁を厚くする手なんだ。'],
  };
  const RV_CH = {
    good: ['いい感じ！', 'さすが！', 'お見事！', 'ばっちり！', 'やった！', 'いい目してる！', 'すごいすごい！', 'そうそう、それ！'],
    push: [null, 'この調子で次も行こう！', null, 'どんどん行こう！', 'その勢いで次へ！'],
    soft: ['大丈夫！', 'ドンマイ！', 'あと少しだった！', '気にしない、気にしない！', 'あと一歩！', '平気、平気！', 'よくある見落とし！', 'いっしょに見てみよう！'],
    tail: [null, null, 'これで覚えちゃおう！', null, '次はきっと見つけられる！'],
    green: ['正解は緑の枠のマス。', '緑の枠が、いちばんいい手。', 'いちばんは緑の枠！', '答えは緑の枠のところ。', '緑の枠に打てばよかったんだ。'],
  };
  const RV_CN = [0, 7, 56, 63], RV_X = { 9: 0, 14: 7, 49: 56, 54: 63 }, RV_C = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
  const rvEmpt = p => (String(Array.isArray(p.cells) ? p.cells.join('') : p.cells).match(/0/g) || []).length;   // (empty squares = how deep an exact read goes)
  function rvLsJa(kind, P, i, li, marks) {
    const F = P.f || {}, ks = Object.keys(F).map(Number), v = q => F[q][0], top = Math.max(...ks.map(v)), bs = ks.filter(q => v(q) >= top - 1e-9);
    const k = i % 5, o8 = li % 8 + i * [1, 3, 5, 7][(li >> 3) % 4], pk = (L, j) => L[((j % L.length) + L.length) % L.length];
    const c = String(P.cells).split('').map(Number), exact = P.type === 'exact';
    const xc = q => RV_X[q] != null && !c[RV_X[q]] ? 'X' : RV_C[q] != null && !c[RV_C[q]] ? 'C' : '';
    const res = n => n > 0 ? `${n}石差で勝ち` : n < 0 ? `${-n}石差で負け` : '引き分け';
    const H = RVJ_LS.hint[kind] || [''], hintTx = pk(H, i) + (marks ? ' ' + pk(kind === 'wall' ? RVJ_LS.rfWall : RVJ_LS.rf, i + 2) : '');
    const reasonGood = u => {
      const fu = F[u], out = [];
      switch (kind) {
        case 'rules': { const n = fu[1]; out.push(pk([`${n}枚、ちゃんと数えられた！`, `いちばん多い${n}枚を見つけたんだ。8つの向きを、ちゃんと見てたね。`, `${n}枚返る場所だよ。縦も横もななめも、のこさず見られたんだ。`, `${n}枚いっぺんに返った！ 数えまちがいもなかったね。`, `石が${n}枚ひっくり返った！ 遠くの石まで目が届いてたんだ。`], k)); break; }
        case 'corner':
          if (RV_CN.includes(u)) out.push(pk(['隅を取ったよ。隅の石はもう返されないから、ここから辺に確定石が広がっていくんだ。', '隅をしっかり確保！ 二度と返されない石は、終盤までたよれる味方になるよ。', '角の石は、もうだれにも返せない。ここを足場に辺を固めていけるね。', '隅、ゲット！ ここから続く辺の石も、どんどん確定していくんだ。', '取れる隅を、ちゃんと取れた！ 確定石の第一歩だよ。'], k));
          else if (P.trap) out.push(pk(['この場面は隅が取れない。だから、相手に隅への道を作らない手がいちばんなんだ。', '取れる隅がないときは、守りが大事！ 隅への通り道を作らない手を選べたね。', '隅が取れない場面で、ちゃんと安全な手を選べた！', '隅がないなら、隅を渡さない。その考え方がぴったりの場面だよ。', '隅に打てない場面でも、あわてずに守れたんだ。'], k));
          else out.push(pk(['相手に隅への通り道を作らない、安全な手だよ。', '隅を渡さない、落ちついた手！', '相手に隅をねらわせない、しっかりした手だね。', '隅のまわりをきれいに保てた！', '危ないマスをよけて、安全に打てたんだ。'], k));
          if (ks.some(q => q !== u && F[q][4])) out.push(pk(['赤い枠に打っていたら、相手に隅を渡すところだったんだ。', 'ほかの手には、隅をあげちゃう手もまざってたね。', '赤い枠の手は、隅への道を開く手だったよ。', 'よけた赤い枠は、相手に隅を取られる手！', '赤い枠に打つと、隅をうばわれていたかも。'], k + 1));
          break;
        case 'mobility': {
          const n = fu[3], mn = Math.min(...ks.map(q => F[q][3])), mf = ks.reduce((a, q) => F[q][1] > F[a][1] ? q : a, ks[0]);
          out.push(n <= mn ? pk([`相手の打てる場所は${n}か所。いちばん少なく抑えられたよ。`, `相手に残る打ち場所は${n}か所だけ！ これより少なくなる手はないんだ。`, `これで相手の候補は${n}か所に。いちばんきゅうくつにできたね。`, `相手が次に打てるのは${n}か所。どの手よりも少ない！`, `相手の打てるマスを${n}か所まで絞れたんだ。`], k)
            : pk([`相手の打てる場所は${n}か所。うまく抑えられたよ。`, `相手に残る打ち場所は${n}か所。形もいいね。`, `相手の候補を${n}か所に抑えつつ、先まで読めた手！`, `相手が次に打てるのは${n}か所。先の形まで考えた手なんだ。`, `相手の打てるマスは${n}か所。これなら苦しくない！`], k));
          if (mf !== u && F[mf][3] > n) out.push(pk([`いちばん多く返す手だと、${F[mf][3]}か所にふえちゃうんだ。`, `たくさん返す手を選んでいたら、相手は${F[mf][3]}か所も打てたね。`, `欲ばって多く返すと、相手の打ち場所が${F[mf][3]}か所になるところだった。`, `多く返す手なら、相手の候補は${F[mf][3]}か所。返す数だけで選ばなかったのが大きいよ。`, `石をたくさん返すと、相手が${F[mf][3]}か所に打てちゃうんだ。`], k));
          break;
        }
        case 'quiet': {
          const n = fu[2], mo = Math.min(...ks.map(q => F[q][2]));
          if (P.trap && n > mo) out.push(pk(['この問題は例外なんだ。開放度がいちばん小さい手は、ここだと相手にいい手を打たれちゃう。よく気づいたね！', '例外の場面だったよ！ いちばん静かな手は、ここだと相手にいい所を打たれるんだ。', '目安にしばられなかった！ ここは開放度より、相手の次の手が大事な場面なんだ。', '静かさだけで選ばなかったね。ここは相手の応手まで読むのが正解なんだ。', 'ひっかけに気づけた！ いちばん静かな手は、この場面だと相手の得になるんだよ。'], k));
          else if (n > mo) out.push(pk(['開放度だけなら、もっと小さい手もあった。でも打ったあとまで読むと、この手がいちばん得なんだ。', '空きの数だけで決めなかったのがえらい！ 先まで読むと、この手がいちばん。', '開放度は少し大きめ。それでも、相手の次の手まで考えるとこれがいちばんなんだ。', '数字にまどわされなかった！ 打ったあとの形を見ると、この手がいちばんだよ。', '静かさより先の読みを取った、かしこい手！'], k));
          else if (n === 0) out.push(pk(['まわりに空きのない石だけを返す、中割り！ 相手の打てる場所がふえないんだ。', '中割り成功！ 返した石が、ぜんぶ石にかこまれてるよ。', '開放度0の中割り！ 相手は足がかりを作れないね。', '空きにひとつもふれない中割りだよ。静かで強い手なんだ。', 'みごとな中割り！ 相手には新しい足場がひとつもできないんだ。'], k));
          else out.push(pk([`返した石のまわりの空きは${n}マス。静かな手だから、相手に足場をあげないんだ。`, `開放度${n}の静かな手！ 相手に足がかりをほとんどあげないね。`, `空きにふれるのは${n}マスだけ。相手は手がかりを作りにくいんだ。`, `開放度は${n}。静かに打てたから、相手は打ち場所がふえないよ。`, `${n}マスしか空きにふれない手！ 相手の足場がふえないね。`], k));
          break;
        }
        case 'wall':
          if (P.trap) out.push(pk(['あわてて余裕手を使わなかったね。自分だけが打てる場所は、貯金としてとっておけるんだ。', '余裕手を温存できた！ あとで困ったときの切り札になるよ。', '貯金の余裕手には、手をつけずにすんだ！', '余裕手はまだ使わない、が正解の場面だよ。ちゃんと残せたね。', 'きみだけが打てる場所は、最後までとっておける。いい判断なんだ。'], k));
          else out.push(pk([`外がわに石を並べずにすんだ！ 相手が打てる場所は${fu[3]}か所なんだ。`, `壁を作らない、内がわの手だよ。相手の打てる場所は${fu[3]}か所に抑えられるね。`, `外がわの石をふやさずにすんだね。相手は${fu[3]}か所にしか打てないんだ。`, `壁を作らずに打てた！ 相手の候補も${fu[3]}か所ですむよ。`, `内がわを返す、静かな手だね。相手の打ち場所は${fu[3]}か所！`], k));
          break;
        case 'edge':
          if ((P.wedge || []).includes(u)) out.push(pk(['相手の石2つのあいだに打つ付け手！ 相手の辺の形がくずれて、隅をねらいやすくなるんだ。', '辺のすき間に打つ付け手だよ。相手はもう、きれいな辺を作れないね。', '付け手がずばり決まった！ 両側が相手の石だから、横から返されないんだ。', 'くさびを打ちこめた！ 相手の辺が、まっぷたつに分かれたよ。', 'すき間を見のがさなかったね。付け手で、相手の辺はばらばらなんだ。'], k));
          else out.push(pk([`辺の形をよく見られたね。相手の打てる場所は${fu[3]}か所に抑えられるんだ。`, `辺のバランスをくずさない手！ 相手の打ち場所は${fu[3]}か所だよ。`, `辺をうまく守れたんだ。相手の候補は${fu[3]}か所！`, `辺の読みがばっちり！ 相手は${fu[3]}か所にしか打てないね。`, `辺に気をくばった手だよ。相手の打てる場所も${fu[3]}か所ですむんだ。`], k));
          break;
        case 'exception':
          if (RV_X[u] != null) out.push(pk(['X打ちが正解の場面だったよ。隅への通り道ができても、相手はそこを取れないか、取っても得をしないんだ。', 'Xに打つ勇気、すばらしい！ 相手はその隅を、すぐには取れないんだ。', 'あえてのX打ち！ 相手が隅に届かないのを、ちゃんと見ぬけたね。', '「Xは危ない」の例外を見つけた！ ここは相手が隅を取れないんだ。', 'こわがらずにXへ！ この場面なら、隅を取られる心配はないよ。'], k));
          else if (ks.some(q => RV_CN.includes(q)) && !RV_CN.includes(u)) out.push(pk(['あえて隅を後回しにできたね。この場面は、隅より手番のほうが大事なんだ。', '隅にとびつかなかった！ ここで隅を取ると、相手に好きな所を打たれちゃう。', '格言にまどわされなかった！ 今は隅より、手番を守るほうが得な場面なんだ。', '隅はあとでも取れる、と見ぬけたね。いまは手番が先だよ。', '隅をがまんできた！ 強い人のやり方なんだ。'], k));
          else out.push(pk(['格言より「打ったあとに何が起きるか」で選べたね。それが強くなる近道なんだ。', '打ったあとのことまで考えられた！ その読みが強さのもとだよ。', '目安より局面を見て選べたんだ。', '先の形まで見通せた手！', '格言どおりじゃない正解を見つけたね。'], k));
          break;
        case 'parity': {
          const n = fu[5];
          out.push(fu[6] ? pk(['相手をパスさせて、もう1手続けて打てる！', 'パスさせる手を見つけたね。続けて打てるのは大きいんだ。', '相手は打つ場所なし！ こっちの連続攻撃だよ。', '相手をパスに追いこめた！', 'パスさせて、手番をつかんだんだ。'], k)
            : n % 2 ? pk([`この塊は${n}マスで奇数。先に入ったから、塊の終わりはきみの番になりやすいんだ。`, `${n}マスの奇数の塊に、先に入れた！`, `奇数（${n}マス）の塊から打てたね。最後に打つのは、きみのほうになりやすいんだ。`, `空きが${n}つの塊は奇数だよ。そこへ先に入るのが基本どおり！`, `${n}マスの塊に入ったね。奇数の塊から打つ、お手本どおりの手なんだ。`], k)
            : pk([`${n}マスの偶数の塊だけど、ここは例外なんだ。よく読めたね！`, `偶数の塊に入るほうが得な、めずらしい場面！ 見抜けたんだ。`, `${n}マスの偶数の塊が正解。基本の例外まで読めたよ！`, `偶数の塊でも、この場面はこっちが得。読みの勝ちだね。`, `「奇数から」の例外を見つけたんだ！`], k));
          out.push(pk([`完全読みだと、${res(v(u))}になる。`, `最後まで読むと${res(v(u))}！`, `読みきると、結果は${res(v(u))}だね。`, `この手なら${res(v(u))}まで持っていけるよ。`, `終局まで読んで、${res(v(u))}！`], k + 1));
          break;
        }
        case 'finish':
          out.push(fu[6] ? pk([`パスさせる1手を見つけた！ 続けて打てるから、最後は${res(v(u))}になるんだ。`, `パスさせて連続で打てる！ 最後は${res(v(u))}だね。`, `相手の手をぜんぶ消した！ 結果は${res(v(u))}。`, `相手はパスするしかない！ これで${res(v(u))}だよ。`, `パスで手番が続くから、${res(v(u))}を守れたんだ。`], k)
            : pk([`ただ一つの正しい手を見つけたね。最後は${res(v(u))}。`, `正確に読めた！ この手なら${res(v(u))}、ほかの手だと負けちゃうんだ。`, `読みがぴったり！ この1手で${res(v(u))}をつかめたよ。`, `負けにならない、たった1つの道を選べた！ 結果は${res(v(u))}。`, `最後まで読みきったね。${res(v(u))}を守る1手なんだ。`], k));
          if (P.trap && ks.some(q => RV_CN.includes(q)) && !RV_CN.includes(u)) out.push(pk(['隅にとびつかなかったのが、えらい！', '隅の誘惑に負けなかったね！', '隅をがまんできたのが大きいよ。', '隅をとらない勇気、すばらしい！', '隅にまどわされなかったんだ。'], k));
          break;
      }
      return out;
    };
    const good = u0 => {
      const u = u0 == null || !F[+u0] ? bs[0] : +u0, out = [];
      if (!bs.includes(u)) out.push(pk(['いい手だね！ でも、いちばんは緑の枠の手なんだ。', 'なかなかいい手！ いちばんいいのは、緑の枠のほうだったよ。'], k));
      else out.push(pk(RV_CH.good, o8));
      out.push(...reasonGood(u)); if (bs.includes(u) && RV_CH.push[k]) out.push(RV_CH.push[k]);
      return out.join(' ');
    };
    const ng = u0 => {
      let u = +u0;
      if (!F[u] || bs.includes(u)) {   // (no wrong move given: the most telling one — a move that hands over a corner, else the worst)
        const w = ks.filter(q => !bs.includes(q)); if (!w.length) return '';
        u = (kind !== 'parity' && kind !== 'finish' && w.find(q => F[q][4])) || w.reduce((a, q) => v(q) < v(a) ? q : a, w[0]);
      }
      const b = bs[0], fu = F[u], fb = F[b], d = Math.round(v(b) - v(u)), out = [pk(RV_CH.soft, o8 + 2)];
      if (!(kind === 'exception' && RV_X[b] != null)) out.push(pk(RV_CH.green, li + i));
      const loss = () => exact ? pk([`最後は、赤い枠だと${res(v(u))}、緑の枠なら${res(v(b))}になるんだ。`, `読みきると、きみの手は${res(v(u))}。緑の枠は${res(v(b))}だよ。`, `終局まで読むと、赤い枠は${res(v(u))}。いっぽう緑の枠は${res(v(b))}だね。`, `きみの手だと${res(v(u))}。緑の枠を選べば${res(v(b))}！`, `完全読みでは、赤い枠が${res(v(u))}で、緑の枠が${res(v(b))}なんだ。`], k)
        : d <= 2 ? pk(['赤い枠も悪くないけど、緑の枠のほうが少しだけ得。差は小さいから、気にしすぎなくていいよ。', 'きみの手との差はほんの少し。でも緑の枠なら、ちょっとだけ得なんだ。', '差はわずかだから安心して！ 緑の枠のほうが、ほんの少し形がいいだけ。', 'おしい手だよ。緑の枠と比べると、ほんの少し損なだけ。', 'きみの手でも戦える！ ただ緑の枠なら、もうちょっと得なんだ。'], k)
        : pk([`赤い枠だと、最後に${d}石ほど差がつきやすい形になっちゃうんだ。`, `きみの手だと、このあとの打ち合いで${d}石ほど損しやすいね。`, `その手だと、終盤までに${d}石ぶんくらい差がつきやすいの。`], k);   // (2026-11-22: never "the AI says")
      const mob = () => pk([`相手の打てる場所は、赤い枠だと${fu[3]}か所、緑の枠なら${fb[3]}か所。`, `きみの手のあと、相手には${fu[3]}か所も打ち場所が残る。緑の枠なら${fb[3]}か所だね。`, `相手の候補は、赤い枠で${fu[3]}か所。緑の枠なら${fb[3]}か所ですむ。`, `赤い枠だと相手は${fu[3]}か所に打てる。緑の枠なら${fb[3]}か所だよ。`, `緑の枠なら相手は${fb[3]}か所、きみの手だと${fu[3]}か所に打てちゃうんだ。`], k);
      const lead = kind !== 'parity' && kind !== 'finish' && kind !== 'rules' ? (fu[4] ? pk(['赤い枠だと、次に相手が隅を取れるようになっちゃう。', 'きみの手だと、相手に隅への道が開いちゃうんだ。', 'その手を打つと、相手は隅に打てるようになるよ。', '赤い枠だと、隅をプレゼントしちゃう！', '打ったあと、相手に隅を取られちゃうんだ。'], k)
        : xc(u) ? pk([`赤い枠は空いた隅のとなりの${xc(u)}だから、隅への通り道になりやすい。`, `隅が空いているうちは${xc(u)}のマスは危ない。相手に隅を取られやすいんだ。`, `赤い枠は${xc(u)}だから、あとで隅を取られる種になりやすいよ。`, `${xc(u)}に打つと、空いた隅を相手にねらわれるんだ。`, `赤い枠は${xc(u)}のマス。隅が空いてると、取られる心配があるね。`], k) : '') : '';
      switch (kind) {
        case 'rules': out.push(pk([`赤い枠は${fu[1]}枚、緑の枠なら${fb[1]}枚返せたんだ。`, `きみの手は${fu[1]}枚。緑の枠なら${fb[1]}枚だよ。`, `赤い枠だと${fu[1]}枚どまり。緑の枠なら${fb[1]}枚もひっくり返る！`, `緑の枠なら${fb[1]}枚、きみの手だと${fu[1]}枚なんだ。`, `赤い枠では${fu[1]}枚、緑の枠では${fb[1]}枚返るよ。`], k), pk(['ななめの列を見落としたのかも？', '次は8つの向きを順番に指でなぞってみて！', 'もう一度、緑の枠から8方向をたどってみよう！', '向きごとに数えると、見落としがへるよ。', '縦・横・ななめ、全部の線を確かめてみて！'], k + 1)); break;
        case 'corner':
          if (lead) out.push(lead); else if (RV_CN.includes(b)) out.push(pk(['取れる隅があったんだ。隅の石は二度と返されないから、取れるときに取っておきたいね。', '隅が空いてた！ 二度と返されない石だから、見のがすのはもったいない。', '角に打てるチャンスだった！ 確定石の始まりになるからね。', '隅を取れば、そこから確定石がふえていくんだ。', '隅に打てたのに見送ると、相手に取られるかもしれないよ。'], k)); else out.push(loss());
          if (lead && RV_CN.includes(b)) out.push(pk(['緑の枠の隅を取れば、二度と返されない石が手に入ったね。', '緑の枠は隅そのもの。そっちが先だったんだ。', '隅を先に取れば、相手の心配もいらなかったよ。', '緑の枠の隅なら、もう返されない！', '先に隅を取っていれば安心だったね。'], k + 1));
          break;
        case 'mobility':
          if (lead) out.push(lead + (fu[3] > fb[3] ? mob() : ''));
          else if (fu[3] > fb[3]) out.push(mob() + (fu[1] > fb[1] ? pk([`${fu[1]}枚も返すと外がわの石がふえて、相手の足場になっちゃうんだ。`, `多めに返した${fu[1]}枚が、相手の足場になるからね。`, `${fu[1]}枚返すぶん、外がわに石が出ちゃうから損なんだ。`, `返しすぎた${fu[1]}枚が、相手の打ち場所をふやすよ。`, `${fu[1]}枚も返すと、相手に足がかりをあげちゃう！`], k) : pk(['相手に打てる場所をあげるほど、こちらは苦しくなるからね。', '相手の選べる手がふえると、こっちの打ち場所が減っていくんだ。', '相手の候補がふえるほど、こっちは不利になるよ。', '相手に選ぶ余地をあげると、あとで苦しくなるんだ。', '打ち場所の差が、そのまま形勢の差になるからね。'], k)));
          else out.push(loss());
          break;
        case 'quiet': {
          const mo = Math.min(...ks.map(q => F[q][2]));
          if (lead) out.push(lead);
          else if (P.trap && fu[2] <= mo) out.push(pk(['赤い枠は開放度がいちばん小さいけど、ここは例外なんだ。そのあと相手にいい手を打たれちゃうから、相手の応手まで考えようね。', 'いちばん静かな手が、ここではわな。相手の次の一手で困るから、そこまで読んでみよう！', '静かな手でも、ここだと相手に好手をあげちゃうんだ。', '開放度は最小だけど、相手の返し手が強いから損なんだ。', 'この場面は例外！ 赤い枠は静かでも、相手の次の手で困るから損なんだ。'], k));
          else if (fu[2] > fb[2]) out.push(pk([`開放度は、赤い枠が${fu[2]}、緑の枠は${fb[2]}。空きが多いと、そこが相手の打ち場所になっちゃうからね。`, `きみの手の開放度は${fu[2]}。空きにふれる石は、相手の足場になって損なんだ。緑の枠なら${fb[2]}だよ。`, `赤い枠は空きを${fu[2]}マスもかかえる手。緑の枠なら${fb[2]}マスですむね。`, `緑の枠なら空きにふれるのは${fb[2]}マス、赤い枠だと${fu[2]}マスなんだ。`, `赤い枠だと開放度が${fu[2]}もあるよ。緑の枠は${fb[2]}！`], k));
          else out.push(loss());
          break;
        }
        case 'wall': {
          const opL = rvLegal(c, 3 - P.toMove);
          if ((P.wall || []).includes(u)) out.push(pk(['赤い枠は外がわに石を並べて、壁を作っちゃう手。壁ができると、その外は相手だけが打てる場所になるからね。', 'きみの手だと、外がわに壁ができちゃう。壁の外は、相手だけの打ち場所なんだ。', '赤い枠だと壁が厚くなって、こっちの打てる場所がどんどん減っていくよ。', '外がわに石が並ぶと、相手の足場がふえるから損なんだ。', '赤い枠では壁ができちゃう！ 相手だけが打てる場所がふえるね。'], k));
          else if (P.trap && !opL.includes(u)) out.push(pk(['赤い枠は、きみだけが打てる余裕手。今使うと損だから、貯金としてとっておこうね。', 'その手は余裕手。今使うと損だから、ほかに打てるうちはとっておきたいんだ。', '余裕手は、使わずにおけば最後まで残る貯金だよ。', '赤い枠は相手が打てない場所。あわてて使うと損なんだ。', 'きみだけの打ち場所を、ここで使うのはもったいないから損！'], k));
          else if (lead) out.push(lead);
          else if (fu[3] > fb[3]) out.push(mob() + pk(['外がわの石がふえると、相手の打てる場所もふえちゃうんだ。', '相手に足場をあげちゃう形だから損なんだ。', '外がわの石は、相手の打ち場所になるからね。', '相手の候補がふえるほど、こっちが苦しくなるよ。', '外がわに出た石が、相手の足場になるんだ。'], k));
          else out.push(loss());
          break;
        }
        case 'edge':
          if ((P.wedge || []).includes(b)) out.push(pk(['緑の枠は、相手の石2つのあいだのすき間に打つ付け手。相手の辺の形をくずせるから、隅や辺をうばうきっかけになるんだ。', '緑の枠は辺のすき間！ そこに入れれば、相手の辺がまっぷたつになったね。', '付け手のチャンスが緑の枠にあったんだ。両側が相手の石だから、返される心配もないよ。', '緑の枠なら相手の辺を分けられた！ すき間に打つと、横から返されないからね。', '辺のすき間に打てば、相手の辺の形がくずれたから、隅もねらえたんだ。'], k));
          if (lead) out.push(lead); else if (!(P.wedge || []).includes(b)) out.push(loss());
          break;
        case 'exception':
          if (RV_CN.includes(u)) out.push(pk([`隅は取れるけど、そのあと相手に${fu[3]}か所も打つ場所が残るから、主導権をにぎられちゃうんだ。`, `隅を取っても、相手には${fu[3]}か所の打ち場所が残る。相手の思うつぼになるんだ。`, `隅に打つと、相手の候補が${fu[3]}か所も残っちゃうよ。`, `隅を急ぐと、相手に${fu[3]}か所の打ち場所が残って損なんだ。`, `赤い枠の隅だと、相手は${fu[3]}か所に打てるから、手番を取られるよ。`], k));
          else if (RV_X[b] != null) out.push(pk(['ここは緑の枠のX打ちがいちばん。相手はその隅をすぐには取れないから、Xでも損をしないんだ。', '正解は緑の枠のX！ 相手はその隅に届かないから、安心して打てたんだ。', '緑の枠のXが正解。相手が隅を取れないから、こわくないんだ。', 'ここは緑の枠のXへ！ 隅に届く線が相手にないから安全だよ。', '答えは緑の枠のX。この場面は、相手が隅を取れないからね。'], k));
          else out.push(lead || loss());
          break;
        case 'parity': {
          const par = n => n % 2 ? '奇数' : '偶数';
          out.push((fu[5] % 2 !== fb[5] % 2 ? pk([`赤い枠の塊は${fu[5]}マスで${par(fu[5])}、緑の枠の塊は${fb[5]}マスで${par(fb[5])}。`, `きみが入った塊は${fu[5]}マス（${par(fu[5])}）、緑の枠は${fb[5]}マス（${par(fb[5])}）なんだ。`, `緑の枠は${fb[5]}マスの${par(fb[5])}の塊、赤い枠は${fu[5]}マスの${par(fu[5])}の塊だよ。`, `塊の大きさは、きみの手が${fu[5]}マス、緑の枠が${fb[5]}マス。${par(fb[5])}の塊に入るのが正解だったんだ。`, `${par(fu[5])}の塊（${fu[5]}マス）に入っちゃった！ 緑の枠は${par(fb[5])}の塊（${fb[5]}マス）だね。`], k)
            : pk([`どちらも${par(fb[5])}の塊。入る場所で、最後の1手を取れるかが変わるんだ。`, `塊の大きさはどちらも${par(fb[5])}。でも入り方しだいで、結果が変わるね。`, `どっちも${par(fb[5])}の塊だよ。そこから先の読みで差がつくんだ。`, `${par(fb[5])}どうしの塊だから、数だけでは決まらない場面！`, `塊はどちらも${par(fb[5])}。ここは最後まで読んだ人の勝ちなんだ。`], k)) + (fb[6] ? '緑の枠なら、相手をパスさせられる！' : ''));
          out.push(loss());
          break;
        }
        case 'finish':
          out.push(loss());
          if (fb[6]) out.push(pk(['緑の枠は、相手をパスさせる手なんだ。', '緑の枠なら相手はパス、こっちが続けて打てたね。', '緑の枠を打てば、相手は打つ場所がなくなるよ。', '緑の枠で相手をパスさせられた！', '緑の枠なら、相手の手番が消えるんだ。'], k));
          else if (RV_CN.includes(u)) out.push(pk(['終盤は、隅より最後の1手が勝負を決めるからね。', '隅をとっても、最後の1手を相手にとられたら負けなんだ。', '隅にとびつくと、終盤は逆転されやすいよ。', '終盤の隅は、かならずしも得じゃないんだ。', '隅より、手番の流れが大事な場面だったね。'], k));
          break;
        default: out.push(lead || loss());
      }
      if (RV_CH.tail[k]) out.push(RV_CH.tail[k]);
      return out.join(' ');
    };
    return { ask: pk(RVJ_LS.ask[kind] || [''], i), hintTx, good, ng, own: true };
  }
  /* (2026-11-21 lesson loop; 2026-11-22 rewritten) the reversi opening practice in リバガメ's words, Japanese: the texts without
     coordinates (atlas/nocoord reversi.json op:<moves>/aim|info, Japanese only — the sentences that give the engine's opinion
     (互角・2石損・AIの評価…) are left out: rvClean*), a short guide on every move of the line from the board (rvStepNotesJa:
     flips, openness = empty squares next to the flipped discs, the opponent's moves after, corners / X / C, the name of the
     shape the line passes through), a varied question, a hint from what the line's move does, and after the answer the praise
     or the soft words in an order of the opening's own (rvOpVoice), why the line's move (green frame) is played and what yours
     (red frame) gives up — all from the board, never the engine's value. */
  const rvNC = (mv, f, lang) => { const o = (NC.reversi || {})['op:' + mv + '/' + f]; return o && o[lang] ? o : null; };
  const RV_EV = /AI|評価|形勢|勝率|互角|\d石|石ほど|損|得を|得な|得で|有利|不利|苦しい/;
  const rvCleanInfo = t => (String(t || '').match(/[^。！？]+[。！？]+|[^。！？]+$/g) || []).map(s => s.replace(/見立てた/g, 'たとえた')).filter(s => !RV_EV.test(s)).join('').trim();
  const RV_AIM = { '辺側に打つ5手目。黒が大きく損する、名前だけ知る手': '辺側に打つ5手目。名前だけ知っておけばいい手', '同じ1枚返しでも、場所しだいで損をする例': '同じ1枚返しでも、打つ場所で形が変わる例', '虎の代わりに打つ、少し損な変化球': '虎の代わりに打つ変化球', '5手目に離れたマスへ。黒が大きく損をする': '5手目に離れたマスへ打つ変化', '白が遠くの右側へ打ち出す、損な手': '白が遠くの右側へ打ち出す手', '牛の代わりに離れた場所へ。黒がやや損': '牛の代わりに離れた場所へ打つ変化', '黒が右側へ。白が少し有利': '黒が右側へ打つ変化' };
  const rvCleanAim = t => { t = String(t || ''); if (RV_AIM[t]) return RV_AIM[t];
    return t.replace(/[（(][^）)]*(損|互角)[^）)]*[）)]/g, '').replace(/^\d石ほど損をする、/, '').replace(/、?\d石(ほど)?損の/g, '').replace(/[、。]?互角を保つ[、。]?/g, '').replace(/、?(ほぼ)?互角の/g, '').replace(/^[、。]|[、。]$/g, '').trim(); };
  const RVJ_OP = {
    intro: ['まずは手順を盤で見てみよう。そのあと、続きを打ってもらうね！', '手順をひととおり見たら、次はきみの番。覚えられるかな？', 'ゆっくり手順を並べるから、形をよく見ておいてね。', '一手ずつ並べていくよ。どんな形になるか、いっしょに見よう！', 'まずは盤で手順を追いかけよう。そのあとで、きみに打ってもらうね。'],
    askN: ['『{n}』の続き、{s}の次の一手はどこかな？', '{s}の番！ 『{n}』の手順を思い出して打ってみて！', 'ここで{s}が打つ、『{n}』の一手はどこだと思う？', '『{n}』はこの先どう進むんだっけ？ {s}の手を打ってみよう！', '次は{s}。『{n}』なら、どこに打つ？'],
    ask: ['さあ{s}の一手！ 定石どおりに打てるかな？', '{s}の番！ さっきの手順、覚えてるかな？', '{s}の一手、きみならどこに置く？', '続けて{s}の番。手順の次はどこだっけ？', 'お次は{s}！ 盤の形から思い出せるかな？', '{s}ならここでどう打つ？ 落ち着いていこう！'],
    cheer: ['いいね！', 'さすが！', 'ばっちり！', 'お見事！', 'その調子！', '上手！', 'ナイス！', 'よく覚えてたね、すごい！', 'そうそう、それ！', 'いい手だね！', '完璧！', 'やったね！'],
    soft: ['おしい！', 'ドンマイ！', 'あと少しだった！', 'いい線いってたね！', '大丈夫、ここで覚えちゃおう！', '気にしない、気にしない！', 'よくある迷いだから平気！', 'だいじょうぶ、次はきっと打てるね！', 'あと一歩！', '今度はもう覚えたかな？'],
    push: ['次もこの調子でいこう！', 'どんどん行こう！', 'その勢いで次へ進もう！', 'まだまだいけるね！', 'この感じで続けよう！', '次も楽しみだね！'],
  };
  function rvOpVoice(id) {   // one opening's voice: the wordings in turn, the praise / the soft words / the push in an order of its own
    let h = shSeed('rv' + id); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; h = Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0; const seed = (h ^ (h >>> 16)) >>> 0;
    const O = RVJ_OP, pc = shPerm(seed, O.cheer.length), ps = shPerm((seed ^ 0x9e3779b9) >>> 0, O.soft.length), pp = shPerm((seed ^ 0x51ed27f1) >>> 0, O.push.length);
    // (a wording is skipped while one of its sentences, or a 10-letter run of it already in two bubbles, has been said in this opening)
    const cnt = {}, used = new Set(), gram = new Map(), sn = t => (String(t).replace(/<[^>]+>/g, '').match(/[^。！？]+[。！？]*/g) || []).map(x => x.trim()).filter(x => x.length >= 5);
    const gr = t => { const x = String(t).replace(/<[^>]+>/g, '').replace(/[\s、。！？!?「」（）()・…〜♪]/g, ''), g = new Set(); for (let k = 0; k + 10 <= x.length; k++) g.add(x.slice(k, k + 10)); return g; };
    const v = (key, arr) => { const c = cnt[key] = (cnt[key] || 0) + 1;
      for (let k = 0; k < arr.length; k++) { const t = arr[(seed + c - 1 + k) % arr.length], G = gr(t); if (sn(t).some(x => used.has(x)) || [...G].some(g => (gram.get(g) || 0) >= 2)) continue;
        sn(t).forEach(x => used.add(x)); G.forEach(g => gram.set(g, (gram.get(g) || 0) + 1)); return t; }
      return arr[(seed + c - 1) % arr.length]; };
    return { v, seed, cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]] };
  }
  function rvOpFacts(posStr) {   // every legal move: flips, openness, the opponent's moves after
    const [cs, tm] = String(posStr).split(':'), c = cs.split('').map(Number), me = +tm, op = 3 - me, F = {};
    const nbr = q => { const r = q >> 3, k = q & 7, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = k + dc; if ((dr || dc) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
    for (const m of rvLegal(c, me)) { const f = rvFlips(c, m, me), nc = c.slice(); nc[m] = me; f.forEach(q => { nc[q] = me; });
      const seen = new Set(); f.forEach(q => nbr(q).forEach(y => { if (!nc[y]) seen.add(y); })); const oL = rvLegal(nc, op); F[m] = { n: f.length, open: seen.size, oM: oL.length, oC: oL.filter(q => q === 0 || q === 7 || q === 56 || q === 63).length, x: [9, 14, 49, 54].includes(m), cq: [1, 8, 6, 15, 48, 57, 55, 62].includes(m), cn: [0, 7, 56, 63].includes(m) }; }
    return { F, me };
  }
  const rvEndOf = sn => { const b = sn.replace(/<[^>]+>/g, '').trim().replace(/[。！？!?]+$/, '').replace(/[）)」]+$/, ''); for (const e of ['なんだ', 'んだ', 'だよ', 'だね', 'よね', 'かな', 'よう', 'ろう', 'よ', 'ね']) if (b.endsWith(e)) return e === 'だよ' ? 'よ' : e === 'なんだ' ? 'んだ' : e === 'だね' ? 'ね' : e; return 'x'; };
  function rvEnds(h, prev) {   // (a sentence that would end like the one before it — 〜ね。〜ね。/ 〜んだ。〜んだ。— takes another ending)
    let p = prev || '';
    const E = tok => { const e = rvEndOf(tok); return e !== 'x' ? e : /[！？]\s*$/.test(tok) ? '!' : 'x'; };   // (= tools/lesson-quality.js end(): 〜だね！ still ends in ね)
    const out = String(h).replace(/[^。！？]*[。！？]+|[^。！？]+$/g, tok => {
      let e = E(tok);
      if (e === p && e !== '!' && e !== 'x') {
        if (e === 'ね') tok = tok.replace(/(だね|よね|ね)([。！])(\s*)$/, (_, a, b, c) => (a === 'だね' ? 'だ' : '') + '！' + c);
        else if (e === 'んだ') tok = tok.replace(/(なんだ|んだ)([。！])(\s*)$/, (_, a, b, c) => (a === 'なんだ' ? '' : '') + b + c);
        e = E(tok);
      }
      p = e; return tok; });
    return { t: out, e: p };
  }
  const RV_OPP = ['相手の打てる場所', '相手の打ち場所', '相手の候補', '相手が選べる手', '相手の打てるマス'];   // (the same idea in other words, so a lesson does not say it the same way in every bubble)
  const rvPlainNote = (f, O) => [`${f.n}枚返して、${O}は${f.oM}か所になる手。`, `返すのは${f.n}枚。このあと${O}は${f.oM}か所！`, `${f.n}枚返す一手！ 相手の番では${f.oM}か所に打てるんだ。`, `${f.n}枚を返す手。${O}が${f.oM}か所の形になるね。`, `ここは${f.n}枚返し。相手は次に${f.oM}か所から選ぶ形だね。`, `${f.n}枚返して形を広げる手。`, `${f.n}枚を自分の色にする一手！`, `手順どおり${f.n}枚返す手。次の相手の打ち場所は${f.oM}か所。`, `${f.n}枚返し！ 相手に残る打ち場所は${f.oM}か所なんだ。`, `次の形につなげる、${f.n}枚返しの手。`];
  function rvStepNotesJa(mv, names, info, V) {   // (2026-11-22 ユーザー：定跡の手順は、全部の手にひとことガイドを付ける) a short guide on every move
    const v = V.v, out = {}, n = mv.length; let pre = '', pe = '!';
    mv.forEach((m, i) => {
      const pos = rvAfter(pre), { F, me } = rvOpFacts(pos), q = rvSq(m), f = F[q], S = me === 1 ? '黒' : '白', ks = Object.keys(F).map(Number);
      pre += m; if (!f) return;
      const mn = k => Math.min(...ks.map(z => F[z][k])), mx = k => Math.max(...ks.map(z => F[z][k])), many = ks.length > 1, O = v('opp', RV_OPP), PL = rvPlainNote(f, O);
      let t;
      if (i === 0) t = v('n0', ['最初の一手。4か所どこに打っても同じ形になるから、ここから始めよう！', 'まずは1枚返す最初の手。どこを選んでも形は同じなんだ。', 'スタートの一手！ 4か所のどれでも、盤を回せば同じ形だね。']);
      else if (i === 1) t = m === 'd6' ? v('n1d', ['「縦取り」で応じる手。真ん中の石を縦に返すんだ。', '縦取り！ 虎や兎などの定石は、ここから分かれていくね。']) : m === 'f6' ? v('n1f', ['「斜め取り」で応じる手。真ん中の石をななめに返すんだ。', '斜め取り！ 牛やりんごなどの定石は、ここから分かれていくね。']) : v('n1p', ['「並び取り」で応じる手。黒の石と同じ列を返すんだ。', '並び取り！ 鼠の定石はこの応じ方から始まるね。']);
      else if (f.cn) t = v('cn', ['隅を取る手！ 隅の石は二度と返されないんだ。', 'ここで隅へ！ ずっと自分の色のままの、大事な石だね。', '隅に打つ一手。取ったら最後まで取られない場所！']);
      else if (f.x) t = v('x', ['隅のななめとなり（X）へ打つ、思いきった手。', 'Xへの一手！ 相手がその隅に届かないうちは打てる場所なんだ。', 'あえてXに入る手。隅を取られる心配がないか、よく見ておこう！']);
      else if (f.cq) t = v('c', ['辺の、隅のとなり（C）へ打つ手。', 'Cに入る一手。辺の形が変わるから、隅まわりに注目！', '隅のとなりのCへ。辺をめぐる戦いが始まるね。']);
      else if (f.open === 0) t = v('q0', [`中割り！ 返す${f.n}枚のまわりに空きがない、静かな手なんだ。`, `まわりを石にかこまれた${f.n}枚だけ返す、中割りの手。`, `空きにふれない中割り。${O}がふえにくいね！`, `中割りで返す${f.n}枚は、外から見えない石。じょうずな手だね。`, `きれいな中割り！ 外がわの石は1つもふえないんだ。`, `内がわの${f.n}枚だけをそっと返す、中割り。`, ...PL]);
      else if (many && f.open === mn('open') && mn('open') < mx('open')) t = v('q', [`開放度${f.open}の静かな手。外に石を出さないんだ。`, `返した石のそばの空きは${f.open}マスだけ。おとなしい一手！`, `空きマスにふれるのが${f.open}つですむ手。${O}をふやさないね。`, `いちばん静かな手を選んで、開放度は${f.open}。`, `外がわの空きにさわるのは${f.open}マス。静かに打つ手！`, `開放度が${f.open}ですむ、ひかえめな一手。`, `どの手より空きにふれない、開放度${f.open}の手なんだ。`, ...PL]);
      else if (many && f.oM === mn('oM') && mn('oM') < mx('oM')) t = v('r', [`打ったあと、${O}は${f.oM}か所。いちばん少なく抑える手！`, `${O}を${f.oM}か所までしぼる手なんだ。`, `相手の打てるマスを${f.oM}か所までにとどめる一手。`, `これで${O}は${f.oM}か所だけ。きゅうくつにさせる手だね。`, `相手に${f.oM}か所しか選ばせない手！`, `${f.oM}か所まで相手の手を減らす、いやらしい一手。`, ...PL]);
      else if (many && f.n >= 3 && f.n === mx('n')) t = v('b', [`${f.n}枚まとめて返す、思いきった手！`, `ここは多めに${f.n}枚返す手。形を整えるための一手なんだ。`, `${f.n}枚返して、中央に石を広げる手。`, `大きく${f.n}枚返し！ この形ではこれが手順なんだ。`, ...PL]);
      else t = v('p', PL);
      t = S + '：' + t;
      const nm = i < n - 1 && names[pre]; if (nm && !/(^|[^A-Za-z])[a-h][1-8](?![0-9A-Za-z])/.test(nm)) t += (/[！？]$/.test(t) ? ' ' : '') + v('nm', [`ここまでで『${nm}』の形！`, `この形が『${nm}』なんだ。`, `ここで『${nm}』ができあがり！`, `この形には『${nm}』という名前があるね。`, `ここが『${nm}』の形！`]);
      const r = rvEnds(t, pe); out[String(i)] = r.t; pe = r.e;
    });
    if (info) { const last = out[String(n - 1)], both = last ? last + '<br>' + info : info, r = rvEnds(both, ''); out[String(n - 1)] = r.t.replace(/<[^>]+>/g, '').length <= 130 ? r.t : rvEnds(info, '').t; }
    return out;
  }
  function rvOpJa(o, name, i, V) {
    const nm = /(^|[^A-Za-z])[a-h][1-8](?![0-9A-Za-z])/.test(name) ? 'この定石' : name, nmQ = nm === name ? '『' + name + '』' : nm, v = V.v;
    const { F, me } = rvOpFacts(o.pos), A = +o.ans, ks = Object.keys(F).map(Number), fa = F[A] || { n: 0, open: 0, oM: 0, oC: 0 };
    const minOf = k => Math.min(...ks.map(q => F[q][k])), maxOf = k => Math.max(...ks.map(q => F[q][k])), side = me === 1 ? '黒' : '白';
    const ask = i === 0 || i === 3 ? v('askN', RVJ_OP.askN.map(t => fill(t, { n: name, s: side }).replace('『' + name + '』', nmQ))) : v('ask', RVJ_OP.ask.map(t => fill(t, { s: side })));
    const spread = k => ks.length > 1 && minOf(k) < maxOf(k);   // (a fact that tells the moves apart — on the first moves every move flips one disc)
    const O = () => v('opp', RV_OPP), MEM = ['さっき盤で見た手順を思い出してみて。相手の直前の手に、どう応じていたかな？', '石がどんな形に並んでいたか、思い出してみて。盤の絵がヒントになるかも！', 'あわてずに、手順の流れを頭の中でもう一度並べてみよう。', '最後にできあがる形を思いうかべると、次の一手が見えてくるかも？', '一手前の相手の石に、どう応じる流れだったっけ？', '手順の動画を巻きもどすつもりで、ゆっくり思い出してみて！'];
    let hint;
    if (fa.cn) hint = v('hc', ['隅に打てるチャンスがあるみたい。どこかな？', '盤の角をよく見てみて！', ...MEM]);
    else if (spread('n') && spread('open') && fa.n === minOf('n') && fa.open === minOf('open')) hint = v('h1', ['たくさん返す手より、返す石が少なくて、まわりの空きも少ない手。静かな中割りっぽい手をさがしてみて。', '返す枚数も、まわりの空きも少ない手が正解。中割りの形を思い出して！', 'ねらいは、まわりを石にかこまれた石だけを返す手。どこかな？', '外に石を出さない、ひかえめな手をさがしてみよう！', ...MEM]);
    else if (spread('open') && fa.open === minOf('open')) hint = v('h2', ['返す石のまわりの空き（開放度）を、手ごとに数えてみて。空きが少ない手がねらい目かも。', '外がわの空きにふれない、静かな手はどこだろう？', '開放度がいちばん小さい手をさがしてみて！', '空きマスにさわらない手ほど、いい手になりやすいんだ。どこかな？', ...MEM]);
    else if (spread('oM') && fa.oM === minOf('oM')) hint = v('h3', [`打ったあと、${O()}がいちばん少なくなる手はどこかな？`, '相手を打ちにくくさせる手をさがしてみて！', `打ったあとの${O()}を、手ごとに数えてみよう。`, ...MEM]);
    else if (spread('n') && fa.n === maxOf('n')) hint = v('h4', ['ここは思いきって、多めに返す手が定石なんだ。どこから返せるかな？', 'めずらしく、たくさん返す手が正解の場面！', 'いちばん多く返せるのはどこか、数えてみて。', ...MEM]);
    else hint = v('h5', MEM);
    const W4 = () => [`${fa.n}枚返して、${O()}は${fa.oM}か所になる手。`, `返すのは${fa.n}枚。そのあと${O()}は${fa.oM}か所なんだ。`, `${fa.n}枚を返して、相手の番は${fa.oM}か所から選ぶ形になるね。`, `手順どおり${fa.n}枚返し！ 相手に残る打ち場所は${fa.oM}か所。`, `${fa.n}枚返したあと、相手が打てるのは${fa.oM}か所。`];
    const why = () => {
      if (fa.cn) return v('wc', ['隅を取ったから、その石はもう返されない！', '隅は取ったら取られない場所。いいところに目をつけたね。', ...W4()]);
      if (fa.open === 0) return v('w0', ['返す石のまわりに空きがない、中割りの手なんだ。相手に新しい足場をあげないね。', `中割りだから、外がわに石が出ない。${O()}もふえにくいんだ。`, 'まわりをかこまれた石だけを返す中割り！ 静かでいい手だね。', '内がわだけを返す中割りで、相手の足場を作らない！', ...W4()]);
      if (spread('open') && fa.open === minOf('open')) return v('w1', [`返す石のまわりの空きは${fa.open}マスだけ。相手に打ち場所をあげにくい、静かな手なんだ。`, `開放度は${fa.open}。外がわの石がふえないから、相手が打ちにくくなるね。`, `空きにふれるのが${fa.open}マスですむ手。いちばん静かな一手！`, `ほかの手より空きにさわらない、開放度${fa.open}の手を選べたね。`, `開放度${fa.open}の、ひかえめな一手！ 相手に足場をわたさないんだ。`, ...W4()]);
      if (spread('oM') && fa.oM === minOf('oM')) return v('w2', [`打ったあと、${O()}は${fa.oM}か所。いちばん少なく抑えられるからね。`, `これで${O()}は${fa.oM}か所だけ。相手をきゅうくつにする手なんだ。`, `${O()}を${fa.oM}か所にしぼれたね！`, `相手に${fa.oM}か所しか残さない、きびしい一手！`, ...W4()]);
      if (spread('n') && fa.n === maxOf('n')) return v('w3', [`${fa.n}枚返して、形を整える手。ここは多めに返すのが定石なんだ。`, `思いきって${fa.n}枚！ この場面では、それが手順の手だね。`, ...W4()]);
      return v('w4', W4());
    };
    const tail = () => v('tl', [`${nmQ}の形を作る大事な一手なんだ。`, 'この流れごと覚えておくと、次の手も見えてくるね。', '手順の意味がわかると、忘れにくくなるんだ。', 'これで形がまた一つ進んだ！', '定石の流れにぴったりの手。', '形がきれいに整ってきた！']);
    const good = () => { const w = why(), t = i % 2 === 0 && (w + '12345678901234567890').length <= 100 ? w + tail() : w, p = i % 2 === 1 || i === 4 ? V.push(i) : '';
      return rvEnds(V.cheer(i) + '<br>' + t + (p ? ' ' + p : ''), '!').t; };
    const pickWrong = u => {   // (no wrong move given — the checker passes the answer: the most telling one, the AI's lowest, else the most flips)
      if (u !== A && F[u]) return u; const w = ks.filter(q => q !== A); if (!w.length) return null;
      const ev = o.P.ev, sc = ev ? new Map(ev.map(([m, x]) => [rvSq(m), x])) : null, inEv = sc ? w.filter(q => sc.has(q)) : [];
      if (inEv.length) return inEv.reduce((a, q) => sc.get(q) < sc.get(a) ? q : a, inEv[0]);
      return w.reduce((a, q) => F[q].n > F[a].n ? q : a, w[0]);
    };
    const LEAD = ['定石の手は緑の枠。', '緑の枠が、この定石の手！', '正しい手順は緑の枠のマス。', '答えは緑の枠だった！', '手順の手は緑の枠のほう。', 'ここは緑の枠に打ちたかった！', '正解は緑の枠！'];
    const ng = u0 => {
      const u = pickWrong(+u0), out = [V.soft(i), v('lead', LEAD)]; if (u == null) return out.join('');
      const fu = F[u], near = Math.abs(fu.oM - fa.oM) <= 1 && Math.abs(fu.n - fa.n) <= 1, N7 = [near ? `緑の枠は${fa.n}枚返して${O()}が${fa.oM}か所、赤い枠は${fu.n}枚で${fu.oM}か所。数は近くても、手順から外れると次の形が変わっちゃうんだ。` : fu.oM > fa.oM ? `緑の枠なら${O()}は${fa.oM}か所、赤い枠だと${fu.oM}か所。相手に選ぶ余地をあげちゃうからね。` : `赤い枠のほうが${O()}は少ない（${fu.oM}か所）けど、定石の手順から外れると、覚えた次の形が使えなくなるんだ。`, '赤い枠だと、定石で覚えたこの先の形にならないから、次の手を自分で考えることになるね。', fu.n !== fa.n ? `赤い枠は${fu.n}枚返し、緑の枠は${fa.n}枚返し。形が変わると、覚えた手順が使えなくなるからね。` : '返す枚数は同じでも、場所がちがえば形が変わる。覚えた手順が使えなくなるからね。', '赤い枠に打つと、この先は定石の外の形。そこからは手探りになっちゃう。'];
      if (fu.oC > fa.oC) out.push(v('n1', ['赤い枠だと、相手が隅に打てるようになっちゃう。隅は取られたら取り返せない場所なんだ。', '赤い枠では隅への道が開いて、相手に隅を取られちゃうね。', '赤い枠のあと、相手は隅に打てる。隅をあげると、辺までくずれていくからね。']));
      else if (fu.x && !fa.x) out.push(v('n2', ['赤い枠は隅のななめ隣（X）。あとで相手に隅を取られる足場になりやすいんだ。', 'Xに打つと、その隅を相手にねらわれやすくなるからね。']));
      else if (fu.cq && !fa.cq) out.push(v('n3', ['赤い枠は隅のとなりのマス。辺の形がくずれるから、相手に隅をねらわれやすいね。', 'Cに打つと辺の形がくずれて、隅をねらわれやすくなるんだ。']));
      else if (fu.open > fa.open) out.push(v('n4', [`開放度は赤い枠が${fu.open}、緑の枠は${fa.open}。空きが多いと、相手の足場になっちゃうからね。`, `赤い枠だと、返した石のそばの空きが${fu.open}マス。緑の枠なら${fa.open}マスですむんだ。`, `緑の枠のほうが静かな手。赤い枠は空きを${fu.open}マスもかかえるから、相手に打ち場所をあげちゃう。`, `赤い枠は開放度${fu.open}で、外に石が出ちゃう。緑の枠なら${fa.open}にとどまるからね。`, `空きにふれるのは、緑の枠なら${fa.open}マス、赤い枠だと${fu.open}マス。そのぶん相手が打ちやすくなるんだ。`, ...N7]));
      else if (fu.oM > fa.oM) out.push(v('n5', [`打ったあとの${O()}は、赤い枠だと${fu.oM}か所、緑の枠なら${fa.oM}か所。相手の選択肢をふやしちゃうんだ。`, `赤い枠のあと、相手は${fu.oM}か所に打てる。緑の枠なら${fa.oM}か所にしぼれたね。`, `緑の枠なら${O()}は${fa.oM}か所なのに、赤い枠だと${fu.oM}か所にふえちゃうからね。`, ...N7]));
      else if (fu.n > fa.n) out.push(v('n6', [`赤い枠は${fu.n}枚も返すから、外がわの石がふえて、あとで苦しくなりやすいね。`, `${fu.n}枚も返すと、外に出た石が相手の足場になるんだ。`, `返しすぎの${fu.n}枚！ 外に出た石は、相手の打ち場所になるからね。`, ...N7]));
      else out.push(v('n7', N7));
      return rvEnds(out.join(''), '!').t;
    };
    return { ask, hintTx: rvEnds(hint, '').t, hintMk: () => [], good, ng };
  }
  const REVERSI = {
    LKEY: 'reversi-emerald-lessons', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../reversi/lessons.json?v=30261124p1'), getJ('../reversi/openings.json?v=20261107l14'), getJ('../reversi/opcourse-evals.json?v=1').catch(() => ({})), getJ('../reversi/warm3d.json?v=2').catch(() => ({}))])
        .then(([ls, op, ev, wt]) => { this.WT = wt || {};
          const by = new Map(op.sets.map(x => [x.id, x])), steps = [];
          RV_TABS.forEach(id => { const st = by.get(id); if (st) st.lines.forEach(ln => steps.push({ set: st, ln })); });
          this.data = { ls, op, ev, steps }; return this;
        }).catch(e => { this.p = null; throw e; }));
    },
    T(o, lang) { return o && o.text ? Object.assign({}, o.text.ja, o.text.en, o.text[lang]) : {}; },
    pr(id) { const p = J(this.LKEY, {})[id]; return p ? (p.clear ? 'pass' : 'try') : ''; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') return D.steps.map(x => ({ key: x.ln.moves, cat: x.set.id, catName: this.T(x.set, lang).title || x.set.id, title: L(x.ln.name, lang), sub: L(rvNC(x.ln.moves, 'aim', lang) || x.ln.aim, lang), svg: rvSvg(rvAfter(x.ln.moves)), st: this.pr('opl:' + x.ln.moves) }));
      return D.ls.lessons.map((l, i) => { const T = this.T(l, lang); const p0 = (l.problems || [])[0]; return { key: String(i), cat: 'lesson', catName: '', title: T.title || l.id, sub: T.short || '', desc: T.goal || '', svg: p0 ? rvSvg(p0.cells) : '', st: this.pr(l.id) }; });
    },
    introPos() { return { pos: rvAfter(''), lock: true }; },   // (no diagram in lessons.json: the four starting discs, for looking only, while the intro is read)
    // the warm-up (reversi/lessons.json l.warm + reversi/warm3d.json texts, 2026-11-15): the 2D aids drawn on the 3D board
    rampPos: it => it.pos, rampBody: (it, lang) => L(it.b, lang),
    rampMarks(it) { const out = it.k === 'explain' || it.guided ? rvAid(it) : []; for (const q in it.marks || {}) out.push([+q, RV_MK[it.marks[q]] || 'hl']); for (const ar of it.arrows || []) out.push({ arrow: ar, cls: 'ok' }); return out; },
    rampLook: it => it.guided ? [] : rvAid(it), rampAns: it => it.ans,
    rampAnsMk(it) { return this.rampMarks(it).concat(it.guided ? [] : rvAid(it)).concat([[it.ans, 'ok']]); },
    rampOk: (it, u) => it.oks ? it.oks.includes(+u) : +u === it.ans,
    save(id, pts, max) { const pr = J(this.LKEY, {}), o = pr[id] || { best: 0, clear: false, v: 2 }, n = Math.round(pts * 100 / max), pass = n >= 75; pr[id] = { best: Math.max(o.best || 0, n), clear: !!o.clear || pass, v: 2 }; put(this.LKEY, pr); return pass; },
    // (2026-11-22 lesson loop) a problem a move or two away from one of an earlier lesson is not drawn, nor two near ones in a lesson
    near(a, b) { let n = 0; for (let q = 0; q < 64; q++) if (a[q] !== b[q] && ++n > 3) return false; return true; },
    pool(li) { const ls = this.data.ls.lessons, cs = p => Array.isArray(p.cells) ? p.cells.join('') : String(p.cells); this.pools = this.pools || {};
      if (!this.pools[li]) { const prev = ls.slice(0, li).flatMap(l => l.problems.map(cs)); const ok = ls[li].problems.filter(p => !prev.some(c => this.near(c, cs(p)))); this.pools[li] = ok.length >= 8 ? ok : ls[li].problems; }
      return this.pools[li]; },
    lesson(key, lang) {
      const l = this.data.ls.lessons[+key]; if (!l) return null;
      const li = +key, ja = lang === 'ja', PL = this.pool(li), cs = p => Array.isArray(p.cells) ? p.cells.join('') : String(p.cells);
      const T = this.T(l, lang), std = shuffle(PL.filter(p => !p.trap)), trap = shuffle(PL.filter(p => p.trap)), nT = trap.length ? 1 : 0;
      const probs = [], take = (L, n) => { for (const p of L) { if (n <= 0) break; if (probs.some(o => this.near(cs(o), cs(p)))) continue; probs.push(p); n--; } };
      take(std, 5 - nT); take(trap, nT); if (probs.length < 5) take([...std, ...trap].filter(p => !probs.includes(p)), 5 - probs.length);
      const WT = this.WT || {}, RJ = ja ? RVJ_LS.ramp[l.id] || null : null, vo = t => t ? { ja: t, __voice: true } : null;
      const W = k => (RJ && RJ[k] && vo(RJ[k])) || WT[l.id + '/' + k] || null, pos = (c, m) => (Array.isArray(c) ? c.join('') : c) + ':' + m;
      let nTry = 0, nPP = 0; const HJ = k => RJ && RJ.h && RJ.h[nTry] ? vo(RJ.h[nTry++]) : W(k), PPJ = () => RJ && RJ.pp && RJ.pp[nPP] ? vo(RJ.pp[nPP++]) : WT['ui/pp'];
      let ramp = (l.warm || []).map(w => w.t === 'concept'
        ? { k: 'explain', pos: pos(w.cells, w.toMove), cells: w.cells, toMove: w.toMove, aid: w.aid, marks: w.marks, arrows: w.arrows, t: W('t' + w.k.slice(1)), b: W(w.k) }
        : { k: 'try', pos: pos(w.cells, w.toMove), cells: w.cells, toMove: w.toMove, aid: w.aid, guided: w.t === 'guided', ans: w.ans, g: w.t === 'guided' ? W(w.k) : PPJ(), y: W(w.k + 'ok'), h: HJ('h0') });
      if (l.id === 'rules' && WT['rules/c1']) {   // (no warm-up in the full game: placing and flipping, then the biggest flip)
        const st = rvAfter('').split(':')[0], me = 1, lg = rvLegal(st, me), P0 = (l.problems || [])[0];
        ramp = [{ k: 'explain', pos: st + ':1', cells: st, toMove: 1, marks: Object.fromEntries(lg.map(q => [q, 'flip'])), t: W('t1'), b: W('c1') },
          { k: 'try', pos: st + ':1', cells: st, toMove: 1, marks: Object.fromEntries(lg.map(q => [q, 'flip'])), oks: lg, ans: lg[0], g: W('g1'), y: W('y1'), h: W('h1') }];
        if (P0) { const v = Object.entries(P0.f), top = Math.max(...v.map(x => x[1][0])); ramp.push({ k: 'try', pos: pos(P0.cells, P0.toMove), cells: P0.cells, toMove: P0.toMove, aid: 'flips', guided: true, oks: v.filter(x => x[1][0] === top).map(x => +x[0]), ans: +v.find(x => x[1][0] === top)[0], g: W('g2'), y: W('y2'), h: W('h2'), look: W('look') }); }
        probs.splice(0, probs.length, ...probs.filter(p => P0 !== p && !this.near(cs(P0), cs(p))));   // (the warm-up's position is not asked again)
        take(std.filter(p => !probs.includes(p) && !this.near(cs(P0), cs(p))), 5 - probs.length);
      }
      // (2026-11-24 第2期 ⑥) the exact endgames from easy to hard: fewer empties (= a shorter read) first, the exception (trap) last
      if (probs.length && probs.every(p => p.type === 'exact')) probs.sort((a, b) => (a.trap ? 1 : 0) - (b.trap ? 1 : 0) || rvEmpt(a) - rvEmpt(b));
      if (!ramp.every(it => (it.k === 'explain' ? it.b : it.g))) ramp = [];   // (texts missing: no warm-up rather than an empty one)
      const look = W('look'), RU = (k, v) => fill(k === 'look' && look ? L(look, lang) : L(WT['ui/' + k], lang) || '', v || {});
      return { id: l.id, title: T.title || l.id, intro: ja && RVJ_LS.intro[l.id] ? RVJ_LS.intro[l.id] : (Array.isArray(T.intro) ? T.intro.join('<br>') : T.intro || ''), ramp: ramp.length ? ramp : null, RU,
        probs: probs.map((p, i) => { const v = Object.entries(p.f), b = v.reduce((a, x) => x[1][0] > a[1][0] ? x : a, v[0]);
          const top = b ? b[1][0] : 0, oks = v.filter(x => x[1][0] >= top - 1e-9).map(x => +x[0]);
          // (2026-11-21) the hint: the step's words, and on the board what they point at — never the answer itself (the red frames: moves
          // that hand over a corner; wall: the moves that build a wall)
          const hintMk = () => l.id === 'wall' && p.wall && p.wall.length ? p.wall.map(q => [q, 'ng']) : l.id === 'rules' || l.id === 'parity' || l.id === 'finish' ? [] : v.filter(x => x[1][4]).map(x => [+x[0], 'ng']);
          const base = { pos: p.cells + ':' + p.toMove, kind: 'best', P: p, why: '', ans: b ? b[0] : '', oks, hintMk };
          if (ja) return Object.assign(base, rvLsJa(l.id, p, i, li, hintMk().length > 0));   // (from the 3rd problem no flip counts on the board: lessons3d RV_NUMS — the questions do not lean on them)
          return Object.assign(base, { ask: T.prompt || '', hintTx: T.hint || '', good: () => '', ng: () => '' }); }),
        save: (pts, max) => this.save(l.id, pts, max) };
    },
    opening(key, lang) {
      const st = this.data.steps.find(x => x.ln.moves === key); if (!st) return null;
      const ln = st.ln, mv = ln.moves.match(/../g), n = mv.length, ev = this.data.ev || {};
      const parent = this.data.steps.filter(x => x.ln.moves.length < key.length && key.startsWith(x.ln.moves)).reduce((a, x) => !a || x.ln.moves.length > a.length ? x.ln.moves : a, '');
      const d = parent ? parent.length / 2 : 1, c = []; for (let k = Math.max(1, d - 4); k < n; k++) c.push(k);
      const ks = c.length <= 5 ? c : [...new Set([0, 1, 2, 3, 4].map(j => c[Math.round(j * (c.length - 1) / 4)]))];
      const info = L(rvNC(ln.moves, 'info', lang) || ln.info, lang).replace(/【[^】]+】|\[[\p{L}\p{M}]{1,16}\]/gu, ' ').trim();
      const ja = lang === 'ja', name = L(ln.name, lang), aim0 = L(rvNC(ln.moves, 'aim', lang) || ln.aim, lang), aim = ja ? rvCleanAim(aim0) || aim0 : aim0;
      let hs = 0; for (const ch of key) hs = (hs * 31 + ch.charCodeAt(0)) | 0; hs = Math.abs(hs);
      const V = ja ? rvOpVoice(key) : null, names = {}; if (ja) this.data.steps.forEach(x => { names[x.ln.moves] = L(x.ln.name, lang); });
      return { id: 'opl:' + key, title: name, intro: `<b>${aim}</b>` + (ja ? '<br>' + RVJ_OP.intro[hs % RVJ_OP.intro.length] : ''), start: rvAfter(''),   // (no move list in coordinates: the line is played on the board next. 2026-11-23: start was inside this comment — the study line began on an empty board)
        steps: mv.map(rvSq), notes: ja ? rvStepNotesJa(mv, names, rvCleanInfo(info), V) : info ? { [String(n - 1)]: info } : {},
        probs: ks.map((k, i) => { const pre = mv.slice(0, k).join(''), o = { pos: rvAfter(pre), kind: 'best', ask: fill(RV_ASK[lang] || RV_ASK.en, { n: name }), P: { rv: 'op', ans: rvSq(mv[k]), ev: ev[pre] || null }, ans: String(rvSq(mv[k])) };
          if (ja) Object.assign(o, rvOpJa(o, name, i, V));   // (2026-11-21 lesson loop: リバガメ asks, hints and explains — see RVJ_OP, rvOpVoice)
          else { o.good = () => ''; o.ng = () => ''; }
          return o; }),
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
  /* gomoku / renju (2026-11-13): the lessons (gomoku/lessons.json: steps of 5 one-move problems, a warm-up ramp before some; 'pick'
     problems: tap the point, no stone is played — the forbidden points) and the 26 opening shapes (openings.json: the line with the
     AI's values and notes, then 5 practice positions scored by the stored values). Progress = the full game's ('aicoding-gomoku-lessons'
     { id: { best, clear } }, 'aicoding-gomoku-open' { id: { best, pass } }). Texts: gomoku/i18n.js, read into a sandbox. A position here is
     { start: { b, w, side }, rule, me, last, pick, noForbid } (cells: row × 15 + column, a1 = 0). */
  /* (2026-11-14) no board coordinates (e10, D4, f5 …) in what the guide says — the 3D boards have none. A point is named by its mark
     on the board: ja 「緑に光っている点」, other languages a small dot of the mark's colour. ('\u0001…\u0002' = a ja phrase: say() drops the
     spaces the templates had around the coordinate.) */
  const SPJ = { ok: '緑に光っている点', ng: '赤い印の点', hl: 'オレンジの印の点', here: 'そこ', arrow: '矢印の手', mark: '盤に印を付けた手' };
  const SP = (k, lang) => lang === 'ja' ? '\u0001' + SPJ[k] + '\u0002' : k === 'arrow' ? '<b>➜</b>' : k === 'mark' ? '<i class="ls-spot hl"></i>' : `<i class="ls-spot ${k === 'here' ? 'ok' : k}"></i>`;
  const GO_RX = /(?:<bdi>)?\b([A-HJ-T](?:1[0-9]|[1-9]))\b(?:<\/bdi>)?/g;
  function goSpots(txt, N, ok, u, right, lang, hl) {   // go's own texts: each point named by its mark (the answer green, the player's move red, any other orange)
    return String(txt || '').replace(GO_RX, (a, c) => { const q = goPc(c, N); if (q == null || q < 0) return a;
      if (ok.includes(q)) return SP(right && q === u ? 'here' : 'ok', lang); if (q === u) return SP(right ? 'here' : 'ng', lang); if (!hl.includes(q)) hl.push(q); return SP('hl', lang); });
  }
  /* the same texts without coordinates, for the 3D board (2026-11-14): atlas/nocoord/<game>.json { '<lesson id>/<ramp index>/<field>': { lang: text } }
     (the full games keep their own texts: their boards show coordinates) */
  const NC = {};
  const ncLoad = id => NC[id] ? Promise.resolve(NC[id]) : fetch('nocoord/' + id + '.json?v=21').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(o => (NC[id] = o));
  // (2026-11-21 user: 「ドット＆ボックスの初回レッスンも、これはどういうゲームなのかの説明がない。まずは短くても良いからそこから」)
  // the first lesson of a game opens with what the game is and how it is won, in the guide's voice (ja; the games whose first intro lacks it)
  const GAME_JA = {
    dots: 'ぼくはハコピヨ！ ドット・アンド・ボックスは、2人で交互に点と点を線でつないで、箱を取り合うゲームなんだ。最後に箱を多く取ったほうが勝ち！ いっしょにやってみよう！',
    morris: 'ホー、ぼくはモリフク！ モリスは駒を交互に置いて、置き終わったら動かすゲーム。線の上に3つ並べると<b>ミル</b>で、相手の駒を1つ取れるんだ。相手を2つまで減らすか、動けなくしたら勝ち！',
    mancala: 'ぼくはマンカラビ！ マンカラは、種をまいて自分の<b>ストア</b>（大きな穴）に集めていくゲーム。最後に多く集めたほうが勝ちなんだ。いっしょにやってみよう！',
    tafl: 'わたしはタフリン！ タフルは、真ん中の<b>王さま</b>を守る側と、まわりから攻める側に分かれるゲームなの。王さまが角まで逃げたら守る側、つかまえたら攻める側の勝ち！',
    shogi: 'わたしはショウギツネ！ 将棋は、2人で交互に駒を動かして、相手の<b>玉</b>を逃げられなくしたら（<b>詰み</b>）勝ちのゲームだコン。取った駒は自分の駒として使えるのが楽しいところ！ まずは駒の動きから覚えよう。',
    reversi: 'ぼくはリバガメ！ リバーシは、黒と白が交互に石を置いて、自分の色を広げていくゲーム。最後に自分の色の石が多いほうが勝ちなんだ。いっしょにやってみよう！',
    backgammon: 'ワン！ ぼくはダイスン。バックギャモンは、サイコロをふって15個の駒を進め、先に全部ゴールから出しきったほうが勝ちのゲームなんだ。',
    amazons: 'ケロ！ アマゾンズは、駒を動かして<b>矢</b>を放ち、マスをふさいでいくゲーム。先に動けなくなったほうが負けなんだ！',
    connect4: 'ポトンウサだよ！ コネクトフォーは、2人で交互に、列の上からコマを落としていくゲーム。'
  };
  window.AtlasGameIntroJa = (id, key, kind, L) => { if (kind === 'open' || String(key) !== '0' || !GAME_JA[id] || !L || L.__gi) return L; L.__gi = true; L.intro = GAME_JA[id] + '<br>' + (L.intro || ''); return L; };
  function ncApply(id, L2) {
    const T = NC[id] || {}; if (!L2 || !L2.ramp) return L2;
    L2.ramp = L2.ramp.map((it, j) => { const o = Object.assign({}, it); ['body', 'h', 'y', 'b', 'g', 't'].forEach(f => { const v = T[L2.id + '/' + j + '/' + f]; if (v && !(o[f] && o[f].__voice)) o[f] = v; }); return o; });   // (a guide's own line stays)
    return L2;
  }
  const GSQ = x => typeof x === 'number' ? x : (+String(x).slice(1) - 1) * 15 + String(x).charCodeAt(0) - 97;
  const GNM = m => 'abcdefghijklmno'[m % 15] + (Math.floor(m / 15) + 1);
  const gCells = a => (Array.isArray(a) ? a : String(a || '').split(/\s+/)).filter(Boolean).map(GSQ);
  const gPos = (P, o) => Object.assign({ start: { b: gCells(P.b), w: gCells(P.w), side: P.side || 1 }, rule: P.rule || 'renju', me: P.side || 1, last: P.last ? GSQ(P.last) : -1 }, o || {});
  const GMK = { ok: 'ok', ng: 'ng', hl2: 'ring', t4: 'hl', t3: 'hl', hang: 'ng', forb: 'ng' };
  /* (2026-11-21 lesson loop) the gomoku opening practice in ゴイシペン's words, Japanese: the line's notes varied (and the first three
     moves told: 天元 → 直接打ち／間接打ち → the shape), a varied question, a hint from what the best move does (its threat or the
     threat it stops — the stones in that line ringed, never the point itself), why it is best, and for another move what it misses.
     The reasons come from the position (gmA: fives, fours, open threes through a point, on the 15×15 board) and the stored values. */
  const GMA = (() => {
    const DIR = [[1, 0], [0, 1], [1, 1], [1, -1]], at = (bd, x, y) => x < 0 || y < 0 || x > 14 || y > 14 ? -1 : bd[y * 15 + x];
    const run = (bd, q, s, dx, dy) => { const x = q % 15, y = Math.floor(q / 15); let n = 1, k; for (k = 1; at(bd, x + dx * k, y + dy * k) === s; k++) n++; for (k = 1; at(bd, x - dx * k, y - dy * k) === s; k++) n++; return n; };
    const five = (bd, q, s, d) => { if (bd[q] !== 0) return false; bd[q] = s; const n = run(bd, q, s, d[0], d[1]); bd[q] = 0; return s === 1 ? n === 5 : n >= 5; };   // (renju: black needs exactly five)
    const lineCells = (q, d) => { const x = q % 15, y = Math.floor(q / 15), out = []; for (let k = -5; k <= 5; k++) { const a = x + d[0] * k, b = y + d[1] * k; if (a >= 0 && b >= 0 && a < 15 && b < 15) out.push(b * 15 + a); } return out; };
    const fivesIn = (bd, q, s, d) => lineCells(q, d).filter(c => five(bd, c, s, d));   // (the points that make five in this line)
    const openFourAt = (bd, q, s, d) => { if (bd[q] !== 0) return false; bd[q] = s; const f = fivesIn(bd, q, s, d); bd[q] = 0; return f.length >= 2; };
    const threeIn = (bd, q, s, d) => lineCells(q, d).some(c => openFourAt(bd, c, s, d));   // (a three: one more stone makes an open four)
    function info(bd, m, s) {   // what s playing m does
      const r = { five: false, four: 0, three: 0, two: 0, line4: null, line3: null };
      if (bd[m] !== 0) return r;
      DIR.forEach(d => { if (five(bd, m, s, d)) r.five = true; });
      bd[m] = s;
      DIR.forEach(d => { if (fivesIn(bd, m, s, d).length) { r.four++; r.line4 = r.line4 || d; } else if (threeIn(bd, m, s, d)) { r.three++; r.line3 = r.line3 || d; }
        else { const cs = lineCells(m, d); if (cs.some(c => { if (bd[c] !== 0) return false; bd[c] = s; const t = threeIn(bd, c, s, d); bd[c] = 0; return t; })) r.two++; } });
      bd[m] = 0; return r;
    }
    const allPts = (bd, f) => { const o = []; for (let q = 0; q < 225; q++) if (bd[q] === 0 && f(q)) o.push(q); return o; };
    const foursOf = (bd, s) => allPts(bd, q => DIR.some(d => five(bd, q, s, d)));
    const threesOf = (bd, s) => allPts(bd, q => DIR.some(d => openFourAt(bd, q, s, d)));
    const stonesNear = (bd, q, s, d) => { const x = q % 15, y = Math.floor(q / 15), o = []; for (const sg of [1, -1]) for (let k = 1; k <= 4; k++) { const v = at(bd, x + d[0] * k * sg, y + d[1] * k * sg); if (v === s) o.push((y + d[1] * k * sg) * 15 + x + d[0] * k * sg); else if (v !== 0) break; } return o; };
    function analyse(pos, best) {   // pos = { b, w, side } (cells) → the board, the side's threats and the opponent's
      const bd = new Array(225).fill(0); pos.b.forEach(q => { bd[q] = 1; }); pos.w.forEach(q => { bd[q] = 2; });
      const s = pos.side, o = 3 - s, o4 = foursOf(bd, o), o3 = threesOf(bd, o);
      const blocks3 = m => { if (!o3.length || bd[m] !== 0) return false; bd[m] = s; const n = threesOf(bd, o).length; bd[m] = 0; return n < o3.length; };
      const of = m => { const r = info(bd, m, s); r.b4 = o4.includes(m); r.b3 = blocks3(m); r.oppNear = DIR.filter(d => stonesNear(bd, m, o, d).length).length; return r; };
      const ring = (m, r) => {   // the stones the hint rings: the opponent's threat, or our own line
        if (o4.length) { const q = o4[0]; const d = DIR.find(d => five(bd, q, o, d)); return stonesNear(bd, q, o, d); }
        if (r.b3) { const q = o3.find(q => q === m) != null ? m : o3[0]; const d = DIR.find(d => openFourAt(bd, q, o, d)); return d ? stonesNear(bd, q, o, d) : []; }
        const d = r.line4 || r.line3; return d ? stonesNear(bd, m, s, d) : [];
      };
      return { bd, s, o, o4, o3, of, ring };
    }
    const kind = r => r.five ? 'win' : r.b4 ? 'b4' : r.four >= 2 || (r.four && r.three) ? 'ft' : r.four ? 'four' : r.b3 && r.three ? 'b3t' : r.b3 ? 'b3' : r.three ? 'three' : 'shape';
    return { analyse, kind, info };
  })();
  /* (2026-11-22 lesson loop) the gomoku opening practice (珠型) in ゴイシペン's words, Japanese — every move of the line gets a word
     read off the board (GOP.fx: five / four / open four / four-three, the opponent's four or three it stops, the twos it makes, the
     opponent's line it gets in the way of, and the line's direction ヨコ・タテ・ナナメ), the shape's standing (as known from study —
     never an engine's figure), and the problems: a varied question, a hint from what the best point does, praise that cheers the player
     on, and for another point what the green point does and what the player's point lets the opponent do next (a five, an open four, a
     four-three, a three left open…). The phrases are drawn without repeats inside a lesson; the openers' order differs per lesson. */
  const GOP = {
    DN: ['ヨコ', 'タテ', 'ナナメ', 'ナナメ'],
    side: s => s === 1 ? '黒' : '白',
    // what s playing q does on the board of G (GML.mk) — G.bd is left as it was
    fx(G, q, s) {
      const o = 3 - s, bd = G.bd, DIR = [[1, 0], [0, 1], [1, 1], [1, -1]], at = (x, y) => x < 0 || y < 0 || x > 14 || y > 14 ? -1 : bd[y * 15 + x];
      const nearAny = (c, r) => { const x = c % 15, y = Math.floor(c / 15); for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const v = at(x + a, y + b); if ((a || b) && v > 0) return true; } return false; };
      const opens = c3 => { const L = []; for (let c = 0; c < 225; c++) if (bd[c] === 0 && nearAny(c, 2)) G.info(c, c3).open4.forEach(i => L.push(c * 4 + i)); return L; };   // (the opponent's threes: point·direction pairs that make an open four)
      const along = (c, c3, d) => { const x = c % 15, y = Math.floor(c / 15); let n = 0; for (const g of [1, -1]) for (let k = 1; k <= 4; k++) { const v = at(x + d[0] * k * g, y + d[1] * k * g); if (v === c3) n++; else if (v !== 0) break; } return n; };
      const r = G.info(q, s), F = { five: r.five, fours: r.fours, open4: r.open4, threes: r.threes, b4: G.fivePts(o).includes(q), near: nearAny(q, 2), twos: [], blk: [] };
      const o3 = opens(o);
      bd[q] = s;
      const o3a = opens(o), gone = o3.filter(v => !o3a.includes(v));
      F.b3 = gone.length > 0; F.b3dir = gone.length ? gone[0] % 4 : -1;
      DIR.forEach((d, i) => { if (r.fours.includes(i) || r.threes.includes(i)) return; const x = q % 15, y = Math.floor(q / 15);
        for (let k = -4; k <= 4; k++) { const c = (y + d[1] * k) * 15 + x + d[0] * k; if (!k || x + d[0] * k < 0 || x + d[0] * k > 14 || y + d[1] * k < 0 || y + d[1] * k > 14 || bd[c] !== 0) continue;
          if (G.info(c, s).threes.includes(i)) { F.twos.push(i); break; } } });   // (info places c itself)
      bd[q] = 0;
      DIR.forEach((d, i) => { if (along(q, o, d) >= 2) F.blk.push(i); });
      F.b3d = F.b3dir >= 0 ? F.b3dir : F.blk[0] != null ? F.blk[0] : -1;
      const adj = (c3, d) => { const x = q % 15, y = Math.floor(q / 15); return at(x + d[0], y + d[1]) === c3 || at(x - d[0], y - d[1]) === c3; };
      F.adjS = DIR.map((d, i) => adj(s, d) ? i : -1).filter(i => i >= 0); F.adjO = DIR.map((d, i) => adj(o, d) ? i : -1).filter(i => i >= 0);
      return F;
    },
    kind(F) { return F.five >= 0 ? 'win' : F.b4 ? 'b4' : F.open4.length ? 'f4' : F.fours.length >= 2 || (F.fours.length && F.threes.length) ? 'ft' : F.fours.length ? 'four' : F.b3 && F.threes.length ? 'b3t' : F.b3 ? 'b3' : F.threes.length ? 'three' : F.twos.length >= 2 ? 'two2' : F.twos.length && F.blk.length ? 'twob' : F.twos.length ? 'two' : F.blk.length ? 'blk' : F.adjS.length ? 'own' : F.adjO.length ? 'foe' : 'none'; },
    // the words the templates take: {c} mover {f} opponent {d} the line's direction {d2}/{dd} two directions {bd} the opponent's line
    vars(F, s) {
      const D = i => GOP.DN[i] || '', two = F.twos.length >= 2 ? (D(F.twos[0]) === D(F.twos[1]) ? '2本の' + D(F.twos[0]) : D(F.twos[0]) + 'と' + D(F.twos[1])) : D(F.twos[0]);
      const d = F.five >= 0 ? D(F.five) : F.open4.length ? D(F.open4[0]) : F.fours.length ? D(F.fours[0]) : F.threes.length ? D(F.threes[0]) : F.twos.length ? D(F.twos[0]) : D(F.b3d);
      return { c: GOP.side(s), f: GOP.side(3 - s), d, d3: D(F.threes[0]), d4: D(F.fours[0]), dd: two, bd: D(F.b3d), da: D(F.adjS[0]), do: D(F.adjO[0]) };
    },
    // the line's notes, by what the move does
    n: {
      win: ['{c}の{d}に5つ並んで勝ち！ ぼく、思わず踊っちゃう。', 'これで{d}に五つ！ 最後まできれいな攻めだったペン。', '{d}に5つそろった！ {c}の勝ちが決まったね。'],
      b4: ['{f}の四を、すかさずふさいだ！ ここを空けたら負けだったペン。', 'あと1つで{f}が5つ並ぶ点。ここはもう止めるしかない！', '{d}の四にふたをした！ あぶないところだったね。', '{f}の四の止め場所はここだけ。迷わず打てたね！'],
      f4: ['{d}に両はしのあいた四！ もう{f}には止められないペン。', '達四ができた！ どちらをふさいでも、もう片方で5つ並ぶね。'],
      ft: ['{d4}の四と{d3}の三が一度にできた、四三！ {f}は両方は止められないペン。', '四三の完成！ 四を止めたら、三が達四になる。', '一手で四と三！ これが勝ちの形なんだ。'],
      four: ['{d}に四！ {f}はここを止めるしかないね。', '四で押した！ 相手に止めさせて、手番をもらう作戦ペン。', '{c}が{d}に四を作って、先手を取った！', '止めないと負ける四で、{f}を忙しくさせる！', '{d}の四で、{f}の止める場所を決めさせたペン。', 'ここで四！ 止めてもらったあとの次の攻めに注目してみて。'],
      b3t: ['{f}の三を止めながら、{d}に自分の三も作った！ 守りと攻めがいっぺんだね。', '守るついでに三！ 今度は{f}が止める番になったペン。', 'ふさいだ石がそのまま{d}の三になる、うまい手！', '{f}の三にふたをして、{d}の三で反撃！'],
      three: ['{d}に三！ このままだと達四だから、{f}は止めに回る。', '両はしのあいた三を{d}に作ったペン。', '三ができた！ 次は達四をねらっている。', '{c}は{d}の三で攻めを続ける！', '{d}に三を作って、{f}に守りの手を打たせる作戦だね。', '{c}の三！ ここで止めないと、次は止められない四になっちゃう。', 'ここで{d}の三。攻めの主導権は{c}がにぎっているペン。', '三で迫る！ {f}がどこで止めるか、見ていてね。'],
      b3: ['{f}の{bd}の三を止めた！ これで達四は作られないね。', '{bd}に並んだ{f}の三に、さっとふたをしたペン。', 'あわてず{f}の三をふさぐ。大事な守りの一手！', '三のはしをおさえた！ {f}の{bd}の並びは片方がふさがったよ。', 'ここで止めておかないと、次は止められない四になっていたペン。', '{bd}の三をふさいで、ひと安心！', '守りの急所に打った！ {f}の{bd}の三はもう伸びない。', '{c}はしっかり守った！ 三を放っておくのは危ないもんね。', '{f}の{bd}の三、ここでストップ！', 'すき間をうめて{f}の三を止めた。じょうずな受けだペン。'],
      two2: ['{dd}に、二を2本いっぺんに作った！ 次はどちらからでも三をねらえるペン。', '欲ばりな一手！ {dd}の2つの向きで、石がつながったね。', '二が2本できた！ {f}は全部を見張るのが大変になる。', '{dd}に伸びる、よくばりな形だペン。',
        '{c}の石が{dd}の両方でつながった！ 攻めの道が2つになったよ。', '一手で二を2本！ {dd}のどちらかから三が作れそうペン。'],
      twob: ['{f}の{bd}の並びに割って入って、{d}に二も作った！', '守りながら{d}に石をつなげる、ちゃっかりした一手ペン。', '{bd}に並んだ{f}の石をおさえて、自分は{d}の二！', '{f}の{bd}の線をふさぎつつ、{d}の二で次の三をねらう！',
        '{c}は{bd}で{f}を止めて、{d}では自分の石を伸ばした！', '一石二鳥ペン！ {f}の{bd}をおさえ、{d}に二ができたよ。', '{d}の二を作るついでに、{f}の{bd}の線もじゃま！', '{f}の{bd}の先をおさえた石が、{d}では二になっているペン。'],
      two: ['{d}に二を作った！ 三への足場だね。', '自分の石と{d}に並べて、攻めの準備ペン。', '{c}は{d}の二で、次の三をねらっている！', '{d}に石がつながった！ ここから三が作れそう。', '{d}の二を作って、じわじわ攻める！', '石を{d}につなげて、形を広げたペン。', '次の三につながる{d}の二！', '{c}が{d}に並べた！ 攻めの芽が育ってきたね。'],
      blk: ['{f}の{bd}の並びのはしに打って、伸びる先をふさいだ！', '{bd}に並んだ{f}の石に、先回りしてじゃまをしたペン。', '{f}の石が{bd}に3つ並ぶ前に、先におさえた！', '{f}の{bd}の二をおさえる、ていねいな守り！', '{f}が三を作りたい{bd}の線に、先に石を置いた。',
        '{bd}の線は、これで{f}には使いにくくなったペン。', '{c}は{f}の{bd}の2つ並びに、そっとふたをした！', '先回りの守り！ {f}の石は{bd}にもう伸ばしにくい。', '{f}の{bd}のつながりを切る一手だペン。', '{c}が{bd}の通り道に石を置いて、{f}の三を作らせない！', '{f}の{bd}の石と石のあいだに割りこんだ！', '{bd}の先をとめて、{f}の形を小さくしたよ。'],
      own: ['{c}は自分の石に{da}からくっつけた！ 形をかためる一手。', '{da}に自分の石と手をつないだペン。', '{c}の石が{da}でとなり合った！ ここから並びを広げていくよ。', '自分の石の{da}どなりに打って、足場をしっかりさせた！', '{c}は石を{da}に寄せて、まとまりを作ったペン。', 'となりの石と{da}にならべて、次の手の準備！', '{da}どなりにぴたっと置いた！ 石が多いほうが攻めやすいもんね。', '{c}の石がまた1つ集まった！ {da}にくっついて、形がしっかりしたよ。'],
      foe: ['{f}の石に{do}からぴったりついた！ 相手の形をせまくする一手。', '{c}は{f}の石の{do}どなりに打って、ようすを見るペン。', '{do}で{f}の石にくっつけた！ 相手の広がりをおさえるね。', '{f}の石に寄りそうように{do}どなりに置いた。じゃまの準備ペン！', '{c}は{f}の石の{do}を先におさえた！', '{f}の石のすぐ{do}どなり！ 相手が伸びたい方向をふさいだよ。'],
      none: ['{c}はまだ形を決めず、少し離れた点に打った！', 'じっくりした一手！ 先の攻めに備えて石を配ったペン。', '{c}は次の手のために、遠くに足場を作った！', '急がず、石の少ない側に目を向けた！', '次の攻めの準備！ どこにつながるか見ていてね。', '{c}は広いほうに石を置いて、形の幅を広げたペン。'],
      won: ['ここから先、{w}の勝ちが読み切れているペン！', 'この形で{w}の勝ちが決まり！ あとは四と三で押し切るね。'],
    },
    ev: { bw: '研究では、黒の必勝が知られている珠型！ 黒を持ったら、攻めの形を覚えちゃおう。', ba: '黒がはっきり打ちやすいと言われる珠型。黒は攻めの手順を楽しめるね！',
      bs: '黒が少し打ちやすいと言われる珠型だね。白も守り方を知っておけば戦えるペン。', eq: '黒と白、ほぼ五分と言われる珠型なんだ。どちらを持っても戦えるペン！',
      ws: '白が少し打ちやすいと言われる珠型。黒は守りも大事になるね！', ww: '研究では白の必勝と言われていて、黒にはつらい珠型なんだ。白を持ったら、守り勝つ形を覚えよう！' },
    // the problems
    ask: ['{s}の番。いちばん良い次の一手はどこだろう？', 'さあ、{s}ならどこに打つ？ 相手のねらいも見てね！', 'ここで{s}が打つ、強い一手を探してみよう！', 'この形、{s}の急所はどこだと思う？', '{s}の一手だペン。攻めるか守るか、どっちかな？',
      '問題！ {s}を持ったきみなら、どこに置く？', '{s}の手番。盤ぜんたいをながめて、いい点を探そう！', 'きみの読みの見せどころ！ {s}の次の一手は？', '{s}が打つなら、どの点がいちばん生きるかな？', 'じっくり考えてみて。{s}の最善の一手はどこ？'],
    hint: {
      win: ['自分の四をよく見て！ 5つ並べられる点がありそうだペン。', '4つ並んだ{s}の石、どこかにないかな？ すき間のある形もあるね。'],
      b4: ['相手の石をよく見て！ あと1つで5つ並ぶところがあるペン。', '大変、{f}に四ができてるね。まずどこを止める？', '{f}の4つ並び、見つけられたかな？'],
      f4: ['{s}の三を、両はしのあいた四にできないかな？', '止められない四が作れそうだペン！'],
      ft: ['四と三を、いっぺんに作れる点がありそうだね。', '攻めどき！ 四を作りながら三もできる点を探してみて。', '{s}の石の並びが交わるところに注目！'],
      four: ['四を作って、{f}に止めさせる手はないかな？', '先手で攻めたいね。四が作れる点を探してみるペン。', '{s}の3つ並びを、もう1つ伸ばせないかな？'],
      b3t: ['{f}の三が気になるね。止めながら自分も得する点はどこかな？', '守りながら攻める、一石二鳥の点がありそうペン。'],
      b3: ['{f}の三が見える？ 止めないと次に達四ができちゃう！', '守りの場面かも。{f}の三をどこで止める？', '両はしのあいた{f}の3つ並びを探してみて！'],
      three: ['{s}の石で、両はしのあいた三を作れないかな？', '攻めを続けたいね。三ができる点を探してみて！', '{s}の2つ並びを3つにのばすと、どうなるかな？'],
      blk: ['{f}の石の並びを見てみて。伸ばされる前に先回りしたいペン！', '{f}がこれから伸ばしたい線はどこだろう？ 先回りを考えてみて！', '光っている{f}の石に注目！ その並びのはしはどこかな？', 'まだ三はないけど、{f}の2つ並びが気になる！', '守りの目で盤を見てみて。{f}の石がつながりそうな線はある？', '{f}の石を2つ以上ふくむ線を探して、その先っぽを考えよう！'],
      two: ['{s}の石どうしをつなげる点、さがしてみて！', '光っている石のまわりに注目してみよう！', 'まだ急ぐ場面じゃないペン。{s}の石がたくさん生きる点を探してみて。', '次に三が作れるように、自分の石を並べてみよう！'],
      twob: ['{f}の石の並びも見てみて。じゃましながら自分の形も作れたら最高ペン！', '自分の石とつながって、{f}のじゃまにもなる点はどこ？', '守りと攻めを一度にできる点がありそうだペン。', '{f}の2つ並びと{s}の石、その両方にかかわる点はどこ？', '光っている石とつながりながら、{f}の線もじゃまできたら最高！'],
      shape: ['あわてなくて大丈夫。石と石のあいだに、いい点がかくれているペン。', 'ここは静かな場面。{s}の石が長く働く点はどこだと思う？', '光っている石のまわりに注目してみよう！', '{f}の石と自分の石、両方を見くらべてみて！'],
    },
    good: ['そうそう、それ！', 'ばっちりだペン！', 'いい目をしてるね！', 'やったね！', 'すてきな一手！', 'さすが、きみ！', 'いいね、その点！', 'よく見つけたね！', '完璧だペン！', '上手だね！'],
    push: ['この調子で次もいこう！', 'その勢いで、どんどん行こう！', '次も楽しみだペン！', 'まだまだいけるペン！'],
    soft: ['あと少し！', '大丈夫、', 'ドンマイ！', 'あと一歩！', 'いい線いってた！', '気にしないで！', '次はいけるペン！', 'よくある迷い方！', '今度は見えるはず！', 'いっしょに見てみよう。'],
    why: {
      win: ['{d}に5つ並んで勝ち！ 最後の一手を見逃さなかったね。', '5つそろって{c}の勝ちだペン。'],
      b4: ['ここを空けると、{f}に5つ並べられて負けていた。だから四を止めるのが先なんだ。', '{f}の四を見落とさなかった！ 止めないと次の一手で負けだったペン。'],
      f4: ['{d}に両はしのあいた四ができたから、{f}はどちらか片方しか止められない！', '達四の完成！ もう5つ並ぶのを止める手はないペン。'],
      ft: ['{d4}の四と{d3}の三が同時にできたから、{f}は両方を止められない！', '四三の完成！ 四を止めたら、三が達四になるペン。'],
      four: ['{d}に四を作ると、{f}は止めるしかない。その間に攻めの形を広げられるね。', '{d}の四で{f}の手番を使わせたペン。止め石の位置まで見えていたら完璧！', '四で押して先手をにぎった！ {f}に自由な手を打たせないね。'],
      b3t: ['{f}の三を止めながら、{d}に自分の三も作れた！ 守りと攻めがいっぺんだペン。', '守った石がそのまま{d}の三になる。今度は{f}が止める番だね。'],
      b3: ['{f}の{bd}の三を放っておくと達四になって、もう止められなかった。早めにふさぐのが大事だね。', '三のはしをおさえたから、{f}の{bd}の並びは片方がふさがった。これで達四はできないペン。', 'ここで止めれば、{f}の攻めはひと区切り！ 三は見つけたらすぐふさごう。'],
      three: ['{d}に三を作ると、{f}は止めに回るしかない。攻めの主導権をにぎれるペン。', '{d}の三で{f}を守りにしばった！ 次は四三をねらえるね。', '両はしのあいた三で攻めを続けた！ 止めた石の位置もよく見ておこう。'],
      two2: ['{dd}に二を2本作る点。次はどちらからでも三が作れるペン。', '一手で{dd}の2つの向きに石がつながる、欲ばりな点なんだ。'],
      twob: ['{f}の{bd}に割りこみつつ、{d}に自分の二も作れる点！', '{bd}に並んだ{f}の石をおさえつつ、自分は{d}に二を作る。一石二鳥だペン。', '守りと攻めを両立！ {f}の{bd}の線をふさいで、{d}の二も手に入れたね。'],
      two: ['{d}に二ができる点。次の三の足場になるペン。', '自分の石と{d}に並んで、攻めの芽を育てる点なんだ。', '{d}の二を作って、次に三をねらえる形にした！', '{d}に石が2つ並んで、攻めの準備がととのう点！'],
      blk: ['{f}の{bd}の並びをじゃまして、{f}の攻めの足場を減らせる点なんだ。', '{f}が{bd}に伸ばしたい線を、先にふさいだペン。', '{bd}に並んだ{f}の石のはしをおさえる、ていねいな守り！', '{f}の{bd}の2つ並びが伸びないように、先回りする一手だペン。', 'ここをおさえれば、{f}は{bd}で三を作りにくくなる！'],
      own: ['{da}どなりの石とまとまって、しっかりした形にできる点！', '{da}どなりの石と組んで、次の並びの足場になる点だペン。', '石を{da}に寄せておけば、あとで三を作りやすくなる。そこが急所だったんだ。'],
      foe: ['{f}の石に{do}からついて、相手の広がりをおさえる点！', '{f}が伸びたい{do}の先を、先にふさげる点だペン。', '{f}の石のすぐ{do}どなり。相手の形をせまくする、いい場所なんだ。'],
      none: ['石のまだ少ない側に打って、先の攻めに備える点なんだ。', 'まわりの石とつながりやすい、のびのびした点だペン。', 'ほかの石から少し離れて、広く使える点を選べたね。'],
    },
    role: { win: ['{d}に5つ並ぶ勝ちの点'], b4: ['{f}の四の止め場所', '{f}が5つ並べたい点'], f4: ['{d}に達四ができる点'], ft: ['四三ができる点', '四と三がいっぺんにできる点'], four: ['{d}に四ができる点', '{d}の四で先手を取る点'],
      b3t: ['{f}の三を止めて自分の三も作る点', '守りながら{d}に三もできる点'], b3: ['{f}の{bd}の三を止める点', '{f}の三のはしをおさえる点', '{bd}の三にふたをする点'],
      three: ['{d}に三ができる点', '{d}の三で攻めを続ける点', '両はしのあいた三が{d}にできる点'], two2: ['{dd}に二が2本できる点', '石が{dd}につながる点'],
      twob: ['{f}の{bd}の並びをおさえて{d}に二も作る点', '守りと{d}の二を両立できる点', '{bd}の線をふさいで二も作れる点'], two: ['{d}に二ができる点', '{d}の石とつながって三の足場になる点', '{d}に並びを伸ばせる点'],
      blk: ['{f}の{bd}の並びのじゃまをする点', '{f}が{bd}に伸ばしたい線をふさぐ点', '{bd}に並んだ{f}の石のはしの点'], own: ['自分の石と{da}にくっつく点', '{da}どなりの石と組める点'],
      foe: ['{f}の石に{do}からつく点', '{f}の{do}の先をおさえる点'], none: ['石がのびのび働く点', '広く使える点'] },
    rs: ['緑の点は、{r}だったペン。', '緑に光っているのが{r}！', '緑の点こそ、{r}なんだ。', '正解の緑の点は{r}。', 'いちばんの手は緑の点、{r}だペン！'],
    miss: {
      lose5: ['きみの手だと、{f}に次の一手で5つ並べられて負けちゃう！', 'そこだと{f}の四が残って、すぐに5つ並べられちゃうんだ。'],
      loseW: ['きみの手だと、{f}に{how}を打たれて、もう止められない。', 'そこに打つと、{f}の{how}が決まって負けになっちゃうペン。'],
      win: ['きみの手だと5つ並ばず、勝ちを逃しちゃう。', 'そこでは勝ちが決まらず、{f}に立て直されちゃうね。'],
      left3: ['きみの手だと{f}の三が残るから、次に達四を作られちゃうペン。', 'そこだと{f}の三がそのまま。達四になったら止められないね。'],
      stop: ['きみの手だと攻めがとぎれて、{f}に先手が回っちゃう。', '攻めの手を休むと、{f}が反撃の形を作り始めるペン。', 'そこだと三も四もできず、{f}に自由に打たれちゃうね。'],
      far: ['きみの点はほかの石から離れていて、どの並びにも関われないんだ。', 'きみの石はぽつんと離れていて、{f}の形を止められないペン。'],
      free: ['{f}の{bd}の並びを放っておくと、次に三を作られやすくなる。', 'きみの手だと{f}の{bd}の線がのびのび使えちゃう。', 'そこだと{f}の{bd}の石がつながったまま。次に三へ伸ばされちゃうペン。', '{bd}の線を空けたままだと、{f}の攻めの足場が残るんだ。'],
      lone: ['きみの手は自分の石とつながらないから、次の三につながらないペン。', 'きみの石は並びを作れず、攻めの足場にならないね。', 'そこだと{c}の石どうしが離れたまま。三を作るのに手数がかかっちゃう。'],
      close: ['きみの手も悪くないけど、緑の点だと石がもっとよく働くペン。', 'きみの点でも戦えるけど、緑の点なら石が2つの役目をするから一歩リード！', 'きみの石も役に立つけど、緑の点に比べると次の三が作りにくいんだ。', 'そこでもすぐには負けないよ。でも緑の点なら、先の攻めがずっと楽になるペン。', 'きみの点はちょっと控えめ。緑の点のほうが、相手のじゃまと自分の形を一度に作れるから強いんだ。'],
    },
    how: { open4: '達四', '44': '四四', '43': '四三', five: '五' },
    // per lesson: draws without repeats; the openers' order is set by the lesson's index j (a start and a step, unique per lesson)
    mk(j) {
      const cnt = {}, a = j % 10, st = 1 + Math.floor(j / 10) % 3;
      const used = {};
      const pk = (arr, key, ok) => { const u = used[key] = used[key] || new Set(); cnt[key] = (cnt[key] || 0) + 1; const st0 = j * 3 + cnt[key] - 1;
        for (let pass = 0; pass < 2; pass++) { for (let k = 0; k < arr.length; k++) { const ix = (st0 + k) % arr.length; if (u.has(ix) || (ok && !ok(arr[ix]))) continue; u.add(ix); return arr[ix]; } u.clear(); }
        return arr[st0 % arr.length]; };
      return { pk, open: (arr, i, off) => arr[(a + off + st * i) % arr.length] };
    },
  };
  const GOMOKU_OP_JA = {
    // every move's note: its number and colour, then what it does
    notes(g, P) {
      const pos = { b: [], w: [] }, out = {};
      g.study.forEach((x, i) => { const q = GSQ(x[0]), s = i % 2 ? 2 : 1; let say;
        if (i === 0) say = 'まずは黒が、盤のまん中（天元）に打つね。';
        else if (i === 1) say = g.kind === 'direct' ? '白は黒のすぐとなりに打つ。これを直接打ちっていうんだ。' : '白は黒のななめとなりに打つ。これを間接打ちっていうペン。';
        else if (i === 2) say = `3手目で、珠型『${g.kanji}』の形ができた！<br>` + GOP.ev[g.ev];
        else { const G = GML.mk(pos, 'renju'), F = GOP.fx(G, q, s), k = GOP.kind(F); say = fill(P.pk(GOP.n[k], 'n' + k), GOP.vars(F, s)).replace(/のの/g, 'の');
          if (x[2] === 'op.n.win') say += '<br>' + fill(P.pk(GOP.n.won, 'won'), { w: GOP.side(x[1] > 0 ? 1 : 2) }); }
        out[String(i)] = `<b>${i + 1}. ${GOP.side(s)}</b><br>` + say; (s === 1 ? pos.b : pos.w).push(q); });
      return out;
    },
    // a problem's question, hint, praise and correction
    prob(g, o, sc, b, i, P) {
      const start = o.pos.start, s = start.side || 1, f = GOP.side(3 - s), sd = GOP.side(s), G = GML.mk(start, 'renju'), best = b[0];
      const FB = GOP.fx(G, best, s), kb = GOP.kind(FB), VB = Object.assign(GOP.vars(FB, s), { s: sd }), val = new Map(sc);
      const hkey = GOP.hint[kb] ? kb : kb === 'two2' || kb === 'own' ? 'two' : kb === 'foe' ? 'blk' : 'shape', hk = GOP.hint[hkey], A = GMA.analyse(start), rb = A.of(best);
      let ring = A.ring(best, rb);
      if (!ring.length) { const DIR = [[1, 0], [0, 1], [1, 1], [1, -1]], d = FB.twos.length ? DIR[FB.twos[0]] : FB.blk.length ? DIR[FB.blk[0]] : null, who = FB.twos.length ? s : 3 - s;
        if (d) { const x = best % 15, y = Math.floor(best / 15); ring = []; for (const gg of [1, -1]) for (let k = 1; k <= 4; k++) { const a = x + d[0] * k * gg, c = y + d[1] * k * gg; if (a < 0 || c < 0 || a > 14 || c > 14) break; const v = G.bd[c * 15 + a]; if (v === who) ring.push(c * 15 + a); else if (v !== 0) break; } } }
      const whyB = fill(P.pk(GOP.why[kb], 'w' + kb), VB), roleB = fill(P.pk(GOP.role[kb], 'r' + kb), VB);
      const pickWrong = u => u !== best && u != null && u >= 0 ? u : (sc.slice().sort((x, y) => x[1] - y[1])[0] || [])[0];
      const goodO = P.open(GOP.good, i, 0), softO = P.open(GOP.soft, i, 5), push = i === 1 || i === 3 ? ' ' + P.pk(GOP.push, 'push') : '', rsT = P.pk(GOP.rs, 'rs');
      const mp = k => P.pk(GOP.miss[k], 'm' + k);
      return { ask: fill(P.pk(GOP.ask, 'ask'), { s: sd }), hintTx: fill(P.pk(hk, 'h' + hkey, t => ring.length || !/光って/.test(t)), VB), hint: ring,
        good: u => { const other = u != null && u !== best && val.has(u) && val.get(u) >= b[1] - 25;
          return goodO + ' ' + (other ? 'きみの手も、緑の点と同じくらい良い一手だね。緑の点は' + roleB + '。' : whyB) + push; },
        ng: u0 => { const u = pickWrong(u0); if (u == null) return softO + ' ' + fill(rsT, { r: roleB });
          const FU = GOP.fx(G, u, s), ku = GOP.kind(FU), V = Object.assign({}, VB);
          G.bd[u] = s; const mine5 = G.fivePts(s).length, o5 = G.fivePts(3 - s), ow = mine5 ? [] : G.winPt(3 - s); G.bd[u] = 0;
          let why;
          if (kb === 'win') why = mp('win');
          else if (!mine5 && o5.length) why = mp('lose5');
          else if (ow.length) { V.how = GOP.how[ow[0][1]] || '四三'; why = mp('loseW'); }
          else if ((kb === 'b3' || kb === 'b3t') && !FU.b3) why = mp('left3');
          else if (/^(f4|ft|four|three|b3t)$/.test(kb) && !FU.fours.length && !FU.threes.length) why = mp('stop');
          else if (!FU.near) why = mp('far');
          else if (FB.blk.length && !FU.blk.includes(FB.blk[0])) why = mp('free');
          else if (FB.twos.length && !FU.twos.length && ku !== 'three') why = mp('lone');
          else why = mp('close');
          return softO + ' ' + fill(rsT, { r: roleB }) + '<br>' + fill(why, V); } };
    },
  };
  /* (2026-11-21 lesson loop) the gomoku lessons in ゴイシペン's words, Japanese: a varied question and two hints per step (GMJ_LS), and
     after the answer why it works / for another point what it misses, read off the board (GML: fives, fours (open or not), threes, the
     line's direction, black's forbidden points under renju, a small four-after-four (VCF) search) — gmLsJa. The opponent's winning point,
     when the player's move leaves one, is marked orange (p._hl). */
  const GML = (() => {
    const DIR = [[1, 0], [0, 1], [1, 1], [1, -1]], DN = ['ヨコ', 'タテ', 'ナナメ', 'ナナメ'];
    const at = (bd, x, y) => x < 0 || y < 0 || x > 14 || y > 14 ? -1 : bd[y * 15 + x];
    const run = (bd, q, s, d) => { const x = q % 15, y = Math.floor(q / 15); let n = 1, k; for (k = 1; at(bd, x + d[0] * k, y + d[1] * k) === s; k++) n++; for (k = 1; at(bd, x - d[0] * k, y - d[1] * k) === s; k++) n++; return n; };
    const cells = (q, d) => { const x = q % 15, y = Math.floor(q / 15), o = []; for (let k = -5; k <= 5; k++) { const a = x + d[0] * k, b = y + d[1] * k; if (a >= 0 && b >= 0 && a < 15 && b < 15) o.push(b * 15 + a); } return o; };
    function mk(pos, rule) {
      const bd = new Array(225).fill(0); pos.b.forEach(q => { bd[q] = 1; }); pos.w.forEach(q => { bd[q] = 2; });
      const exact = s => s === 1 && rule !== 'free';
      // s playing q makes five in direction d (renju: black exactly five)
      const fiveD = (q, s, d) => { if (bd[q] !== 0) return false; bd[q] = s; const n = run(bd, q, s, d); bd[q] = 0; return exact(s) ? n === 5 : n >= 5; };
      const five = (q, s) => DIR.findIndex(d => fiveD(q, s, d));
      const over = (q, s) => { if (bd[q] !== 0) return false; bd[q] = s; const n = Math.max(...DIR.map(d => run(bd, q, s, d))); bd[q] = 0; return n >= 6; };
      const fivesIn = (q, s, d) => cells(q, d).filter(c => fiveD(c, s, d));
      // what s playing q makes: per direction a five / an open four / a four / a three
      function info(q, s) {
        const r = { five: five(q, s), fours: [], open4: [], threes: [], max: 1, fp: [] };
        if (bd[q] !== 0) return r;
        bd[q] = s; r.max = Math.max(...DIR.map(d => run(bd, q, s, d)));
        DIR.forEach((d, i) => { const f = fivesIn(q, s, d); if (f.length) { r.fours.push(i); f.forEach(c => { if (!r.fp.includes(c)) r.fp.push(c); }); if (f.length >= 2) r.open4.push(i); }
          else if (cells(q, d).some(c => { if (bd[c] !== 0) return false; bd[c] = s; const n = fivesIn(c, s, d).length; bd[c] = 0; return n >= 2; })) r.threes.push(i); });
        bd[q] = 0; return r;
      }
      const forb = q => { if (rule === 'free' || bd[q] !== 0 || five(q, 1) >= 0) return false; if (over(q, 1)) return true; const r = info(q, 1); return r.fours.length >= 2 || r.threes.length >= 2; };   // (black, renju: roughly — 三三・四四・長連)
      const fivePts = s => { const o = []; for (let q = 0; q < 225; q++) if (bd[q] === 0 && five(q, s) >= 0) o.push(q); return o; };
      const near = (q, s) => { const x = q % 15, y = Math.floor(q / 15); for (const d of DIR) for (const g of [1, -1]) for (let k = 1; k <= 4; k++) { const v = at(bd, x + d[0] * k * g, y + d[1] * k * g); if (v === s) return true; if (v !== 0) break; } return false; };
      // four after four: can s win by fours alone (o must block each one)?
      function vcf(s, depth, nodes) {
        nodes = nodes || { n: 0 }; const o = 3 - s;
        if (fivePts(s).length) return [];
        if (depth <= 0 || nodes.n > 4000) return null;
        if (fivePts(o).length) return null;
        for (let q = 0; q < 225; q++) {
          if (bd[q] !== 0 || !near(q, s)) continue;
          if (s === 1 && forb(q)) continue;
          bd[q] = s; const f = fivePts(s); nodes.n++;
          if (!f.length) { bd[q] = 0; continue; }
          if (f.length >= 2 || (o === 1 && forb(f[0]))) { bd[q] = 0; return [q]; }
          bd[f[0]] = o; const ok = !fivePts(o).length ? vcf(s, depth - 1, nodes) : null; bd[f[0]] = 0; bd[q] = 0;
          if (ok) return [q, f[0], ...ok];
        }
        return null;
      }
      // s's winning point right now: a five, an open four, a four-three or a double four (black: not forbidden)
      function winPt(s) {
        const o = []; for (let q = 0; q < 225; q++) { if (bd[q] !== 0 || !near(q, s)) continue; if (s === 1 && forb(q)) continue; const r = info(q, s);
          if (r.five >= 0) o.push([q, 'five']); else if (r.open4.length) o.push([q, 'open4']); else if (r.fours.length >= 2) o.push([q, '44']); else if (r.fours.length && r.threes.length) o.push([q, '43']); }
        return o;
      }
      return { bd, info, forb, five, fivePts, vcf, winPt, over, DN };
    }
    return { mk, DN };
  })();
  // (2026-11-23 lesson loop) ゴイシペン's voice for one lesson: praise / soft words / push on, each lesson in an order of its own (gmVoice);
  // the hints and every reason below have five wordings, taken by the problem's number, so no line comes twice in a lesson
  const GM_V = {
    cheer: ['いいね、その一手！', 'さすがだペン！', 'ばっちり！', 'お見事！', 'やった、正解！', 'ナイス！', 'すごい、大正解だペン！', 'そうそう、そこ！', 'いい目してる！', '上手！', '完璧だペン！', 'よく見つけた！'],
    soft: ['あと少しだったね！', '大丈夫だペン！', 'ドンマイ！', 'あと一歩だった！', 'いい線いってたペン！', '次は見つけられるはず！', '気にしない、気にしない！', 'よくある見落としなんだ。', 'いっしょに確かめよう！', 'これで覚えちゃおう！', '今度こそいけるペン！'],
    push: ['この調子で次も行こう！', 'どんどん行こうペン！', 'その勢いで次へ！', '次も見せて！', 'まだまだいけるペン！', 'わかってきたね、続けよう！'],
  };
  function gmVoice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = (n * 5) % 12, a2 = 1 + (n * 3) % 10, b2 = (n * 4) % 11;
    return { cheer: i => GM_V.cheer[(a * i + b) % 12], soft: i => GM_V.soft[(a2 * i + b2) % 11], push: i => GM_V.push[(i + n) % 6] }; }
  const GMJ_LS = {
    five: { ask: ['あと1手で5つ並ぶ点、見つけられるかな？', '5つ並べて勝っちゃおう！ どこに打つ？', '勝ちの一手が隠れてる。さあ、どこだペン？', 'この盤、あと1つで5つ並ぶところがあるね。どこかな？', '{s}の番。一手で勝てる点を探してみて！'],
      hint: ['自分の石が4つ並んでいる列を探してみて。すき間が1つの形もあるペン。', 'タテ・ヨコ・ナナメ、ぜんぶの向きを見てみよう。', '4つ並びのはしか、すき間。あいている点はどこかな？', '真ん中が1つあいた「飛び四」も、埋めれば5つになるペン！', 'まずは自分の石がたくさん集まっている線を目で追ってみて。'] },
    block: { ask: ['相手の四を止めよう！', '大変、相手があと1つで5つ並ぶペン！ どこをふさぐ？', '負けないために、まず打つべき点はどこかな？', '相手の四、見つけられる？ すぐに止めよう！', 'ここは守りの一手！ どこに打つ？'],
      hint: ['相手の石が4つ並んでいる列を探してね。すき間が1つの四もあるペン。', '相手が次に打ったら5つ並ぶ点、それが止める場所なんだ。', '自分の攻めより先に、相手の4つ並びを確かめるのがコツ！', 'タテ・ヨコ・ナナメ、相手の石が集まった線をなぞってみて。', 'すき間のある四は見落としやすいペン。1つあいた並びにも注意！'] },
    three: { ask: ['相手の三を止めよう！', '相手の三が見えるかな？ 達四になる前にふさごう！', '放っておくと止められなくなる形があるペン。どこで止める？', '守りの場面だね。相手の三、どこをおさえる？', '相手の3つ並びに、ふたをしちゃおう！'],
      hint: ['両はしがあいた、相手の3つ並びを探してみて。', '三は、はしかすき間で止められるペン。止める点は1つじゃないかも！', 'すき間が1つの「飛び三」も、立派な三なんだ。', '相手が次に打ったら達四になる点、そこが守りの場所だね。', '相手の石が3つ集まった線を探そう。両側があいてたら要注意だペン！'] },
    sfour: { ask: ['達四（両はしがあいた四）を作ろう！', '自分の三を伸ばして、止められない四を作ってみて！', '両はしのあいた四、どこに打てばできるかな？', '攻めの一手だペン。達四ができる点はどこ？', 'ここで達四を作れば、もう勝ちだね。どこかな？'],
      hint: ['両はしがあいた、自分の三を探してみて。', 'はしが相手にふさがれている側に伸ばしても、達四にはならないペン。', '打ったあと、五になる点が2つできるかな？ そこが答え！', '三の両側を見比べてみよう。どっちも空いてる？', '3つ並びのすき間を埋めるのも、達四への近道なんだ。'] },
    fourthree: { ask: ['四三を作ろう！', '四と三をいっぺんに作れる点、見つけられるかな？', '勝ちを決める一手があるペン。どこだと思う？', '1つの石で四と三！ さあ、どこに打つ？', '相手が止めきれない攻めの点を探してみて！'],
      hint: ['四になる列と、三になる列が交わる点がねらい目だペン。', '3つ並びと2つ並び、向きのちがう2本を見つけてみて。', '2本の線が十字かバツに交わるところが急所だペン！', 'まず四になる点を全部さがして、その中から三もできる点を選ぶんだ。', '1本だけの攻めだと止められちゃう。2本同時に動く点はどこかな？'] },
    forbid33: { ask: ['黒の禁手（三三）はどこかな？ その点をタップして！', '黒が打つと三が2つできる点、見つけられる？ タップして！', '黒の打てない点をさがそう！ 三三はどこかな？', 'ここで黒の禁手になる点、タップしてみて！', '三三の点を見抜けるかな？ タップで答えて！'],
      hint: ['黒の2つ並びが、向きをかえて2本あるね。交わる点を見てみて。', '打つと、2つの列にそれぞれ三ができる点だペン。', '片方のはしがふさがった並びは三にならない。両はしがあいた並びだけ数えよう！', '黒の石が集まっているあたりの、2本の線の交差点がくさいペン。', '1本の三は打ってOK。2本同時にできたら禁手なんだ。'] },
    forbid44: { ask: ['黒の禁手（四四・長連）はどこかな？ その点をタップして！', '黒が打つと四が2つできる点、または6つ以上並ぶ点はどこ？', '黒の打てない点はどこ？ タップで教えて！', '四四か長連になる点、見抜けるかな？', 'ここで黒の禁手になる点、タップしてみて！'],
      hint: ['黒の3つ並びが2本あるか、見てみて。同じ列に2つの四ができる形もあるペン。', '打ったら6つ以上つながる点も禁手なんだ。', '黒はちょうど5つで勝ち。6つ以上になる点はだめだペン！', '四が2本いっぺんにできる交差点を探してみよう。', '1本の列に石が飛び飛びに並んでいたら、四が2つできないか数えてみて。'] },
    fourthreeB: { ask: ['黒の四三を打とう（×は禁手だね）。', '×をよけて、黒の勝ちの一手を探してみて！', '黒の四三はどこかな？ 禁手には気をつけるペン。', '四と三を1つずつ作れる点、見つけられる？', 'さあ黒の番。×じゃない四三の点はどこ？'],
      hint: ['×は黒の打てない点。四の列と三の列が交わる、×でない点がねらい目だペン。', '三が2つや四が2つになる点は禁手。四1つ・三1つの点を探してみて。', '黒の勝ち方は四三がいちばん！ 交わる2本の線を見つけよう。', '×のとなりにも、打てる四三の点が隠れているかも？', 'まず四になる点を探して、×じゃないものだけ残そう。'] },
    trap: { ask: ['きみは白。黒が止められない四を作ろう！', '黒の禁手を利用して勝てるかな？', '白の四、どこに作れば黒はふさげない？', '×の点に注目！ 白の勝ちの一手はどこかな？', '連珠ならではの勝ち方だペン。どこに打つ？'],
      hint: ['×（黒の禁手点）に注目。白の四の止め場所が×になるように打とう。', '黒が止めたい点が三三や四四になるなら、黒はそこに打てないね。', '白の四を作れる点をさがして、そのとき黒が止める点を確かめよう！', '黒にとって打てない点は、白にとっては安全な通り道だペン。', '白には禁手がない。そのぶん大胆に攻められるんだ。'] },
    vcf: { ask: ['四追いで勝とう。最初の一手はどこかな？', '四を続けて勝ち切れるペン。1手目はどこ？', '相手に休ませない攻め、どこから始める？', '四だけで勝てる局面だね。最初の四はどこかな？', '四追いの入り口、見つけられるかな？'],
      hint: ['まず四を打ち、相手の止め石で形が崩れない順番を考えよう。', '止めた石で相手に四ができないかも、ちゃんと見てね。', '最後は四三か達四。そこから逆に考えるとわかりやすいペン！', '四を打つたびに、相手が止める点は1つに決まるんだ。', '自分の石が多い線から四を作ってみよう。'] },
    defend: { ask: ['相手の勝ち筋を止めよう！', '相手のねらい、先に消しちゃおう。どこに打つ？', '守りの急所はどこかな？ 相手の四三の点を探してみて。', 'このままだと負けちゃうペン。どこで受ける？', '相手が次に打ちたい点はどこかな？ 先回りしよう！'],
      hint: ['相手が次に打つと四三や四追いになる点を探して、先にふさぐのがコツ。', '止めたあと、別の勝ち筋が残らないかもチェックしてみて。', '相手の目線で考えるのがコツ。きみが相手なら、どこに打ちたい？', '相手の2本の線が交わる点が、いちばんあぶないペン！', 'ただ近くに置くだけじゃだめ。相手の攻めの真ん中をつくんだ。'] },
    vct: { ask: ['勝ちにつながる最初の一手を打とう（三を使ってもOK）。', '三と四で追いこむ攻め、1手目はどこかな？', '三で相手に止めさせて、攻めを続けよう！ どこから？', 'どう止められても勝てる攻め、見つけられるかな？', '攻めの入り口はどこだペン？'],
      hint: ['三を作って相手に止めさせ、その止め石を利用されない順番を考えよう。', '自分の石が集まっている線を探してみて。そこで三ができるペン。', '相手に止めさせるたびに、次の攻めが続く手を選ぼう！', '四だけじゃ足りないときは、三もまぜて追いこむんだ。', '相手の止め石が自分の攻めになる形は、さけたいペン。'] },
  };
  // the reasons, five wordings each (W[sid].g: praise, .n: what the right point does, the tails: what the player's point misses)
  const GMW = {
    five: { g: [d => `${d}にぴったり5つ！ 一手で勝負を決めたね。`, d => `これで${d}の5つ並びが完成、きみの勝ちだペン！`, d => `4つの石の続きを見抜いて、${d}に五ができた！`, d => `勝ちの点を一発で見つけた！ ${d}の石がそろったね。`, d => `${d}にきれいな五の完成！ 迷わず打てたのがえらいペン。`],
      n: [d => `緑の点なら${d}に5つ並んで勝ちだったんだ。`, d => `正解は緑の点。打てば${d}の五ができていたペン。`, d => `${d}の列は、緑の点で5つつながったんだ。`, d => `勝ちの点は緑のところ。${d}に石がそろっていたね。`, d => `緑の点に打てば、${d}で五の完成だったペン。`],
      t4: ['きみの手は四どまりだから、まだ勝ちじゃない。五が打てるなら迷わず五！', 'その手で作れるのは四まで。五の点があいていたから、この一手で勝てたペン。', '四で止まると相手にもう一度番が回るから、そのぶん勝ちが遠のいちゃう。', '四は作れても、五ならこの一手でおしまいだった。だから五が先！', 'いまの手は四になるだけで、五にはならないから勝ちきれないペン。'],
      tm: [m => `きみの手だと並ぶのは${m}つまで。勝ちを逃しちゃったペン。`, m => `その手は${m}つ並びどまりで、五には届かないんだ。`, m => `いまの手でつながるのは${m}つだけ。チャンスを見送っちゃった。`, m => `きみの石は${m}つまでしか並ばないから、まだ勝てないんだ。`, m => `${m}つ並びでは勝ちにならない。相手に番を渡しちゃうペン。`],
      t0: ['きみの手だと、5つにはまだまだ届かない。', 'その手は並びから外れていて、勝ちを逃しちゃったペン。', 'いまの手では石がつながらないんだ。', 'きみの石は列の外。五の形にならない。', 'その一手だと、せっかくの4つ並びが使えないペン。'] },
    block: { g: ['相手の四をふさいだね。空けておいたら、次に5つ並べられていたペン。', '五になる点を先に埋めた！ これで負けの心配は消えたね。', 'まず四を止める、いちばん大事な順番を守れたね。', '相手の5つ目の場所にふたをした！ 守りの基本、ばっちりだペン。', 'あぶないところを見逃さなかった！ 相手の四は、もう五にならないね。'],
      n: [f => `${f}は緑の点に打って5つ並べちゃう。`, f => `緑の点を空けておくと、${f}の五が完成しちゃうペン。`, f => `止めるべきは緑の点。そこは${f}の5つ目の場所なんだ。`, f => `緑の点ががら空きだと、次の${f}の一手で負けちゃう。`, f => `${f}の四は緑の点でつながるから、そこが守りの場所だったね。`],
      t4: ['四で返しても、先に相手が5つ並ぶから間に合わないんだ。', 'きみの四より、相手の五のほうが一手早いペン。', '攻め返しても、相手は止めずに5つ並べて勝っちゃう。', '自分の四は後回し。相手の四を放っておくと先に負けちゃう。', '四どうしの勝負は、先に四を作った相手の勝ちなんだ。'],
      t0: ['きみの手だと四が残ったままで、次の一手で負けちゃうペン。', 'その手では相手の四に手が届いていない。', 'いまの手は四から離れていて、ふさぐ役目をしてないんだ。', 'きみの石は守りの点からずれちゃった。相手は次に勝っちゃう。', 'その一手だと、相手の5つ目の点があいたままだペン。'] },
    three: { g: ['そこで止めれば、相手の並びは片方がふさがった形になるんだ。', '三のはしをふさいだから、相手はもう達四を作れないね！', '三にふたをしたね。これで相手の攻めはひと休みだペン。', '両はしがあいた三は放っておくと止まらない。先に手を打てたのがえらい！', '相手の達四の芽をつんだ！ 守りがしっかりしてきたね。'],
      cnt: [n => `止められる点は${n}か所あったんだ。`, n => `ちなみに、止める点はほかにもあって${n}か所だペン。`, n => `守れる点は全部で${n}つあった。`],
      t4: ['四で攻めても、止められたあとに相手の三が残っちゃう。', 'きみの四は相手に止められて、そのあと三が伸びてくるペン。', '四を打っても一度ふさがれたら終わり。相手の三は手つかずのままなんだ。', '先に四で攻めたけど、受けられると相手の三がそのまま残る。', '四で押しても、受けたあとの相手は三を達四にできちゃう。'],
      t0: ['きみの手だと相手の三が残ったまま。', 'その手では、相手の3つ並びに手が届いてないペン。', 'いまの手は三から離れていて、ふさぐ役目をしていない。', 'その一手だと、相手の三の両はしがあいたままなんだ。', 'きみの石は三を止める場所からずれちゃった。'],
      tl: [a => `次に達四を作られたら、もう止められない。ふさぐなら緑の点${a}だったペン。`, a => `相手に達四を作られる前に、緑の点${a}で止めたかった。`, a => `達四になったら両はしは守れない。だから緑の点${a}が正解なんだ。`, a => `緑の点${a}に置けば、達四の形は作れなかったんだ。`, a => `ふさぐ場所は緑の点${a}。そこなら相手の三が伸びないペン。`] },
    sfour: { g: [d => `${d}に両はしのあいた四ができた！ 相手はどちらか片方しか止められないね。`, d => `達四の完成！ ${d}のどっちのはしでも五になるから、もう止まらないペン。`, d => `${d}に、止めようのない四を作れたね。これで勝ちが決まり！`, d => `いい攻め！ ${d}の四は両側があいているから、相手は守りきれないんだ。`, d => `三を伸ばして達四にした！ ${d}に五の点が2つできたね。`],
      n: ['緑の点なら、両はしがあいた達四になったんだ。', '正解は緑の点。そこなら両側があいた四ができたペン。', '緑の点に伸ばせば、止められない四だったね。', '達四ができるのは緑の点。はしがどちらもあいた形になるんだ。', '緑の点だったら、五の点が2つある四になったペン。'],
      t4: ['きみの四は片方のはしがふさがっていて、そこを止められたら終わりだペン。', 'きみの四は片側が行き止まり。1か所ふさげば止まっちゃう。', 'その四は五の点が1つだけ。相手はそこを守るだけでいいんだ。', 'いまの四は片方がつまっていて、相手に楽に受けられちゃう。', 'はしがふさがった四だと、相手は1手で守れちゃう。'],
      t3: ['きみの手は三どまりで、相手に止める時間をあげちゃう。', 'その手は三を作っただけ。相手にひと息つかせちゃうペン。', 'きみの手だと三のままで、相手は先に守りに回れるんだ。', '三では、相手にはしをふさがれたら攻めが止まっちゃう。', 'いまの手は三止まり。四まで伸ばさないと相手は困らない。'],
      t0: ['きみの手だと四ができないから、攻めが止まっちゃう。', 'その一手では四にならず、相手に反撃の時間ができちゃう。', 'きみの石は列から外れていて、四の形にならないんだ。', 'いまの手では攻めがつながらないペン。', 'その手だと並びが伸びないから、相手は自由に打てちゃう。'] },
    fourthree: { g: [(a, b) => `${a}の四と${b}の三がいっぺんにできたね！ 四を止めたら、三が達四になるペン。`, (a, b) => `四三の完成！ ${a}の四を止めさせて、次は${b}を達四にできるね。`, (a, b) => `1つの石で${a}に四、${b}に三。相手は両方は守れないんだ！`, (a, b) => `決め手の一手！ ${a}の四をふさいでも、${b}の三が伸びて勝ちだペン。`, (a, b) => `交わる点を見抜いたね。${a}の四と${b}の三、2本の攻めが同時に動き出した！`],
      B: ['禁手でもないから、黒の勝ちが決まり！', '×じゃない点を選べたのもえらい！', '三三でも四四でもないから、黒でも打てるペン。', 'ちゃんと禁手もよけられた！', '黒が打っていい四三、文句なし！'],
      n: [(a, b) => `緑の点なら、${a}の四と${b}の三が同時にできたんだ。`, (a, b) => `正解は緑の点。${a}に四、${b}に三がそろう交点だったペン。`, (a, b) => `緑の点に打てば四三になって、相手は止めきれなかったね。`, (a, b) => `${a}の列と${b}の列が交わる緑の点が、四三の点なんだ。`, (a, b) => `緑の点だと、四を止めても${b}の三が残る形だったペン。`],
      t43: ['きみの手は三のほうが達四になれない形だから、止められちゃう。', 'きみの点の三は、はしがふさがっていて伸びないんだ。', 'その手の三は本物の三じゃなくて、達四にならないペン。', '四と三に見えるけど、三のほうは相手に受けられちゃう形だ。', '三の片側がつまっているから、四を止められたら攻めが切れちゃう。'],
      t4: ['きみの手は四だけだから、止められたら攻めが終わっちゃうペン。', 'その四は1本だけ。ふさがれたら次の攻めがない。', '四ひとつでは、相手が止めて終わり。三もいっしょに作りたかったんだ。', 'いまの手は四どまり。止めたあとの相手は楽になっちゃう。', '四は作れても、同時に三がないと勝ちまで届かないペン。'],
      t3: ['きみの手は三だけで、相手に止められたら勝ちまで届かない。', 'その手は三を作っただけ。はしをふさがれたら終わっちゃう。', '三ひとつだと、相手は落ち着いて受けられるペン。', 'いまの手は三どまりで、四がないから相手に余裕ができちゃう。', '三だけでは決め手にならないんだ。相手が先に守れちゃう。'],
      t0: ['きみの手だと四も三もできないから、相手に反撃されちゃう。', 'その手では攻めの形ができないペン。相手に番を渡しちゃう。', 'いまの手は石の集まりから外れて、四も三も作れない。', 'その一手だと、相手に先に攻められちゃう。', 'きみの石では並びが伸びないから、勝ちが遠のくんだ。'] },
    forbid33: { g: [d => `${d}に三が2つできる、三三の点だね！ 黒はそこに打てないんだ。`, d => `そこは${d}の三が同時にできるから、黒には禁手だペン。`, d => `${d}、2本の三が交わる点を見抜いたね。黒が打つと反則になるんだ。`, d => `三三の禁手、しっかり見つけた！ ${d}に三がそろう点だね。`, d => `黒には打てない点、大当たり！ ${d}で三が2つになるからだペン。`],
      n: ['禁手は緑の点。三が2つ同時にできるからね。', '答えは緑の点。打つと三が2本いっぺんにできるペン。', '緑の点に黒が打つと、三三になるんだ。', '三三になるのは緑の点のほう。2本の三が交わっているね。', '緑の点こそ黒が打てない点。三が2つそろっちゃうからだペン。'],
      t43: ['きみの点は四と三が1つずつの四三だから、禁手じゃないペン。', 'きみの選んだ点は四三。黒も打っていい勝ちの形なんだ。', 'その点は四1つと三1つ。三三とはちがうから打てる。', 'きみの点だと四三になって、黒の反則にはならないんだ。', '四と三の組み合わせは禁手じゃない。むしろ黒の勝ち方だペン！'],
      t33: ['きみの点は三が2つに見えるけど、片方は達四になれないから禁手じゃないんだ。', 'きみの点の三の1本は、はしがふさがっていて本物の三じゃないペン。', 'その点は三が2つに見えて、じつは1つ。だから打っていいんだ。', '片方の並びは伸ばしても達四にならないね。だから禁手じゃないんだ。', 'きみの点の2本目の三は、相手の石にじゃまされているペン。'],
      t3: ['きみの点だと三は1つだけ。だから打ってもいい点なんだ。', 'その点で三ができるのは1本だけ。禁手にはならないペン。', 'きみの点は三1本。2本そろわないと三三じゃない。', '三がひとつなら、黒は堂々と打っていいんだ。', 'その点だと、できる三は1本きりだペン。'],
      t0: ['きみの点だと三ができないから、禁手にはならないペン。', 'その点に打っても三が生まれないから、黒は打てるんだ。', 'きみの点は並びから外れていて、三にならない。', 'その点だと黒の2つ並びが伸びないから、禁手じゃないんだ。', 'きみの点では三が1本もできないペン。'] },
    forbid44: { g: [{ L: 'ぴったり6つ以上つながる、長連の点だね！ 黒はちょうど5つじゃないとだめなんだ。', F: d => `${d}に四が2つできる、四四の点だね！ 黒はそこに打てないんだ。` }, { L: '6つ以上つながっちゃう点を見抜いた！ 黒の長連は反則なんだ。', F: d => `${d}で四が2本いっぺん、四四の禁手を見抜いたペン。` }, { L: '長連の点、大当たり！ 黒が並べすぎると負けなんだ。', F: d => `四四の点、大当たり！ ${d}の四が同時にできるからね。` }, { L: '黒が打つと6つ以上並ぶ、長連の点だペン！', F: d => `${d}、2本の四が重なる点を見つけたね。黒には禁手なんだ。` }, { L: 'そこは長連になる点。黒は5つちょうどでしか勝てないね。', F: d => `黒が打つと${d}に四が2つ。四四だから打てないペン！` }],
      nL: ['禁手は緑の点。6つ以上つながる長連になるからね。', '答えは緑の点。打つと石が6つ以上並ぶペン。', '緑の点に黒が打つと長連、つまり反則なんだ。', '6つ以上並ぶのは緑の点のほうだね。', '緑の点こそ長連の点。黒は並べすぎちゃだめなんだ。'],
      nF: ['禁手は緑の点。四が2つ同時にできるからね。', '答えは緑の点。打つと四が2本いっぺんにできるペン。', '緑の点に黒が打つと、四四になるんだ。', '四四になるのは緑の点のほう。四が2つ重なっているね。', '緑の点こそ黒が打てない点。四が2つそろっちゃうからだペン。'],
      t5: ['きみの点はちょうど5つで、黒の勝ちになるペン。', 'その点は5つぴったり。禁手どころか勝ちの点なんだ。', 'きみの点だと五が完成。黒はちょうど5つならOKだ。', 'その点は長連じゃなくて五。黒の勝ちだペン！', 'きみの点に打つと、きっちり5つで黒の勝ちなんだ。'],
      t4: ['きみの点だと四は1つだけ。だから禁手じゃないんだ。', 'その点でできる四は1本だけ。黒は打てるペン。', 'きみの点は四が1本きり。四四にはならない。', '四がひとつなら、黒は堂々と打っていいんだ。', 'その点だと四は1つ。2つそろわないと禁手じゃないペン。'],
      t0: ['きみの点だと四ができないから、禁手にはならないペン。', 'その点に打っても四が生まれないから、黒は打てるんだ。', 'きみの点は並びから外れていて、四にならない。', 'その点だと黒の並びが伸びないから、禁手じゃないんだ。', 'きみの点では四が1本もできないペン。'] },
    trap: { g: [d => `${d}に四ができたね。止める点は黒の禁手だから、黒はふさげないペン。`, d => `白の${d}の四、止める場所は黒の×の点！ 黒は守れないんだ。`, d => `禁手を味方にした攻め！ ${d}の四を、黒は止められないね。`, d => `${d}に四を作って、止め場所を禁手にした！ 連珠らしい勝ち方だペン。`, d => `黒が止めたい点は打てない点。${d}の四で勝負ありだね！`],
      n: ['緑の点なら、四の止め場所が黒の禁手になったんだ。', '正解は緑の点。そこで作る四は、黒が×の点でしか止められないペン。', '緑の点に打てば、黒はふさぐ点が禁手で手も足も出なかったね。', '緑の点の四は、止める場所が三三か四四になる形だったんだ。', '緑の点から四を作れば、黒は禁手のせいで守れなかったペン。'],
      tF: ['きみの四は、オレンジの印の点で黒にふさがれちゃう。そこは禁手じゃないから。', 'オレンジの印の点は黒が打てる点。そこで四を止められちゃうペン。', 'きみの四の止め場所はオレンジの印。そこなら黒も堂々と打てるんだ。', '黒はオレンジの印の点で受けられる。禁手になっていないから。', 'きみの四は、オレンジの印の点に黒が置いて止まっちゃう。'],
      tX: ['きみの四は止められないけど、黒が先に勝つ筋が残るペン。', 'その四は止まらないけど、黒に先に五を作られちゃうんだ。', 'きみの四もいい形。でも黒のほうが一手早く勝てちゃう。', '止められない四だけど、黒の勝ちが先に来ちゃう。', 'その四より先に、黒が5つ並べられるペン。'],
      t0: ['きみの手だと四にならないから、黒は好きな点で受けられちゃう。', 'その手は四じゃないから、黒にゆっくり守られちゃうペン。', 'いまの手では黒に打つ点を強制できないんだ。', '四にならない手だと、黒は自由に応じられる。', 'その一手では、黒を禁手の点に追いこめないペン。'] },
    vcf: { g: ['その四から止めさせ続けて、最後は四三か達四。相手は一度も自由に打てないね。', '四で押すたびに相手の止め石が決まるから、迷わず勝ち切れるペン。', '止め石が相手の四にならない、正しい入り口だね。', '四、また四。相手は受けるだけで手いっぱいなんだ！', '1手目の四で流れをつかんだね。あとは勝ちまで一直線だペン。'],
      n: ['緑の点から四を続ければ勝ちだったんだ。', '正解は緑の点。そこから四を打ち続けて勝ち切れたペン。', '四追いの入り口は緑の点。ここから相手は受け続けるしかないんだ。', '緑の点の四から始めれば、最後は止められない形だったね。', '緑の点から四を重ねれば、相手は一度も反撃できなかったペン。'],
      tN: ['きみの手は四じゃないから、相手は止めずに反撃できちゃうペン。', 'その手は四になっていないから、相手に自由な一手をあげちゃう。', '四じゃない手だと、相手は受けなくていいんだ。', 'いまの手では相手に休む時間ができちゃう。', '四で押さないと、相手が先に攻めてくるペン。'],
      tC: ['きみの四だと、止めたオレンジの印の石で相手に四ができて、逆に攻められちゃう。', 'オレンジの印の止め石が、相手の四になっちゃうんだ。', 'きみの四を止めたオレンジの印の石から、相手の反撃が始まっちゃうペン。', '止め石のオレンジの印で相手に四ができて、攻守が入れかわっちゃう。', 'オレンジの印で止められると、そこが相手の四になっちゃう。'],
      tO: ['きみの四も悪くないけど、順番がちがうと勝ち切れないことがあるペン。', 'きみの四からでも続くけど、緑の点から行くのが確実なんだ。', 'その四も筋はいい。でも順番しだいで相手に逃げられちゃう。', 'いまの四でも攻められるけど、近道は緑の点のほうだ。', '順番を入れかえると、止め石が攻めのじゃまをすることがあるペン。'],
      tE: ['きみの四は止められたあと、続く四がなくて攻めが切れちゃう。', 'その四をふさがれると、次の四が作れないんだ。', 'きみの四は一発で終わり。続きの四がないペン。', 'その四のあと、攻めがつながらない。', '止められたら次がない四だと、相手に番が回っちゃう。'] },
    defend: { g: ['相手の四三の点を先にふさいで、勝ち筋を消せたね。', '急所をおさえたから、相手の攻めはもう続かないペン。', 'そこを先に取れば、相手のねらいが空振りになるんだ。', '相手の一番打ちたい点を先取り！ これで攻めが止まったね。', '先回りの守り、みごとだペン。相手の作戦がくずれたね。'],
      cnt: [n => `止められる点は${n}か所あったんだ。`, n => `ちなみに、守れる点は全部で${n}つあったペン。`, n => `受ける点はほかにもあって、${n}か所だ。`],
      n: [f => `緑の点なら${f}のねらいを消せたんだ。`, f => `正解は緑の点。${f}の攻めの急所だったペン。`, f => `緑の点を先に取れば、${f}は勝ち筋を失っていたね。`, f => `${f}が打ちたかったのは緑の点。そこを先にふさぐんだ。`, f => `守りの急所は緑の点。${f}の攻めの線が交わっていたペン。`],
      tW: [h => `きみの手だと、オレンジの印の点に${h}負けちゃう。`, h => `オレンジの印の場所をふさいでないから、そこに${h}しまうペン。`, h => `相手は光るオレンジの点に${h}勝っちゃうんだ。`, h => `きみの手のあと、オレンジに${h}負けが決まっちゃう。`, h => `オレンジで示した急所をふさいでないから、${h}負けちゃう。`],
      tV: ['きみの手だと、オレンジの印の点から四追いで勝たれちゃうペン。', 'オレンジの点を起点に四追いされて、負けちゃう。', '相手はオレンジの印から四を続けて勝てちゃうんだ。', 'きみの手のあと、オレンジで示した場所からの四追いが止まらないから、守りきれない。', 'オレンジのところで四を重ねられて、守りきれないペン。'],
      t0: ['きみの手だと、三と四で追いこまれる筋が残っちゃう。', 'その手では、相手の三と四の攻めが止まらないペン。', 'いまの手だと相手の攻めの線がまだ生きているんだ。', 'その一手だと、相手に追いこまれる形が残っちゃう。', 'きみの手は急所から外れて、相手の攻めが続いちゃう。'] },
    vct: { g: [w => `${w}で止めさせて、どう受けられても三と四で最後まで追いこめるね。`, w => `攻めの主導権をにぎった！ 相手は受けるだけになるペン。`, w => `${w}のあとも次の攻めの形が残る、いい入り口だね。`, w => `相手の止め石が攻めのじゃまにならない、上手な順番なんだ。`, w => `あとは三と四をつないで、勝ちまで一直線！`],
      n: ['緑の点からなら、どう止められても勝ち切れたんだ。', '正解は緑の点。そこから三と四で追いこめたペン。', '緑の点の攻めなら、相手はどこで受けても逃げられなかったね。', '攻めの入り口は緑の点。そこから攻めが途切れなかったんだ。', '緑の点から始めれば、相手は受け続けるしかなかったペン。'],
      t4: ['きみの四は止められたあと、攻めが続かないペン。', 'その四はふさがれたら終わり。次の攻めがないんだ。', 'きみの四は一発勝負で、止められると相手の番になっちゃう。', 'いまの四のあと、続く攻めの形がない。', '四を急ぎすぎて、攻めの材料を使い切っちゃうペン。'],
      t3: ['きみの三は、止め方によっては攻めが切れちゃう。', 'その三は、うまく受けられると次が続かないペン。', 'きみの三をはしで止められると、攻めが途切れちゃうんだ。', 'いまの三は、相手の受け方しだいで空振りになる。', 'その三だと、相手の止め石が攻めのじゃまをしちゃう。'],
      t0: ['きみの手だと三も四もできないから、相手に反撃の時間をあげちゃう。', 'その手は攻めになっていないから、相手が先に動けちゃうペン。', 'いまの手では相手に受けを強制できないんだ。', 'その一手だと相手は自由に打てて、攻めが止まっちゃう。', 'きみの手は攻めの線から外れていて、相手に番を渡しちゃうペン。'] },
  };
  function gmLsJa(sid, pos, rule, ok, i, n) {
    const T = GMJ_LS[sid], W = GMW[sid === 'fourthreeB' ? 'fourthree' : sid]; if (!T || !W) return null;
    n = n || 0;
    const s = pos.side || 1, o = 3 - s, G = GML.mk(pos, rule), side = s === 1 ? '黒' : '白', foe = o === 1 ? '黒' : '白', VO = gmVoice(n);
    const pk = (a, j) => a[(i + n + (j || 0)) % a.length], k = n * 3 + i;
    const D = q => GML.DN[q] || '';
    const D2 = L => L.length >= 2 ? (D(L[0]) === D(L[1]) ? '2本の' + D(L[0]) : D(L[0]) + 'と' + D(L[1])) : '2つの列';
    const near = q => { const x = q % 15, y = Math.floor(q / 15); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = G.bd[(y + b) * 15 + x + a]; if ((a || b) && x + a >= 0 && x + a < 15 && y + b >= 0 && y + b < 15 && v) return true; } return false; };
    const wrongOf = u => { if (u != null && u >= 0 && !ok.includes(u) && G.bd[u] === 0) return u;   // (the tool asks with the answer: a tempting other point)
      const c = []; for (let q = 0; q < 225; q++) if (G.bd[q] === 0 && !ok.includes(q) && near(q) && !(s === 1 && rule !== 'free' && sid !== 'forbid33' && sid !== 'forbid44' && G.forb(q))) c.push(q);
      const sc = q => { const r = G.info(q, s); return r.fours.length * 3 + r.threes.length * 2 + (G.info(q, o).fours.length ? 2 : 0); };
      c.sort((a, b) => sc(b) - sc(a) || a - b); return c[k % Math.min(3, c.length || 1)]; };
    const ra = ok[0], R = ra != null ? G.info(ra, s) : null, any = ok.length > 1 ? 'のどれか' : '';
    let good, ng;
    switch (sid) {
      case 'five':
        good = u => pk(W.g)(D(G.info(u, s).five));
        ng = u => { const r = G.info(u, s); return pk(W.n)(D(R.five)) + (r.fours.length ? pk(W.t4, 1) : r.max >= 3 ? pk(W.tm, 2)(r.max) : pk(W.t0, 3)); };
        break;
      case 'block':
        good = () => pk(W.g);
        ng = u => pk(W.n)(foe) + (G.info(u, s).fours.length ? pk(W.t4, 2) : pk(W.t0, 1));
        break;
      case 'three':
        good = () => pk(W.g) + (ok.length > 1 && i % 2 === 0 ? pk(W.cnt)(ok.length) : '');
        ng = u => (G.info(u, s).fours.length ? pk(W.t4, 1) : pk(W.t0, 2)) + pk(W.tl, 3)(any);
        break;
      case 'sfour':
        good = u => { const r = G.info(u, s); return pk(W.g)(D(r.open4[0] != null ? r.open4[0] : r.fours[0])); };
        ng = u => { const r = G.info(u, s); return pk(W.n) + (r.fours.length ? pk(W.t4, 1) : r.threes.length ? pk(W.t3, 2) : pk(W.t0, 3)); };
        break;
      case 'fourthree':
      case 'fourthreeB':
        good = u => { const r = G.info(u, s); return pk(W.g)(D(r.fours[0]), D(r.threes[0])) + (sid === 'fourthreeB' ? ' ' + pk(W.B, 2) : ''); };
        ng = u => { const r = G.info(u, s); return pk(W.n)(D(R.fours[0]), D(R.threes[0])) + (r.fours.length && r.threes.length ? pk(W.t43, 1) : r.fours.length ? pk(W.t4, 2) : r.threes.length ? pk(W.t3, 3) : pk(W.t0, 4)); };
        break;
      case 'forbid33':
        good = u => pk(W.g)(D2(G.info(u, 1).threes));
        ng = u => { const r = G.info(u, 1); return pk(W.n) + (r.fours.length && r.threes.length ? pk(W.t43, 1) : r.threes.length >= 2 ? pk(W.t33, 2) : r.threes.length ? pk(W.t3, 3) : pk(W.t0, 4)); };
        break;
      case 'forbid44':
        good = u => { const r = G.info(u, 1), g = pk(W.g); return G.over(u, 1) ? g.L : g.F(D2(r.fours)); };
        ng = u => { const r = G.info(u, 1); return pk(G.over(ra, 1) ? W.nL : W.nF) + (r.five >= 0 ? pk(W.t5, 1) : r.fours.length ? pk(W.t4, 2) : pk(W.t0, 3)); };
        break;
      case 'trap':
        good = u => pk(W.g)(D(G.info(u, 2).fours[0]));
        ng = function (u) { const r = G.info(u, 2), ff = r.fp.filter(q => !G.forb(q)); this._hl = ff.slice(0, 1);
          return pk(W.n) + (r.fours.length ? (ff.length ? pk(W.tF, 1) : pk(W.tX, 2)) : pk(W.t0, 3)); };
        break;
      case 'vcf':
        good = () => pk(W.g);
        ng = function (u) { const r = G.info(u, s); this._hl = [];
          if (!r.fours.length) return pk(W.n) + pk(W.tN, 1);
          const f = r.fp[0]; G.bd[u] = s; G.bd[f] = o; const ctr = G.fivePts(o), cont = !ctr.length && G.vcf(s, 7); G.bd[f] = 0; G.bd[u] = 0;
          if (ctr.length) { this._hl = [f]; return pk(W.n) + pk(W.tC, 2); }
          return pk(W.n) + (cont ? pk(W.tO, 3) : pk(W.tE, 4)); };
        break;
      case 'defend':
        good = () => pk(W.g) + (ok.length > 1 && i % 2 === 0 ? pk(W.cnt)(ok.length) : '');
        ng = function (u) { G.bd[u] = s; const w = G.winPt(o), v = !w.length && G.vcf(o, 7); G.bd[u] = 0;
          this._hl = w.length ? [w[0][0]] : v && v.length ? [v[0]] : [];
          const how = w.length ? { five: '5つ並べられて', open4: '達四を作られて', '44': '四四を打たれて', '43': '四三を打たれて' }[w[0][1]] : '';
          return pk(W.n)(foe) + (w.length ? pk(W.tW, 1)(how) : v ? pk(W.tV, 2) : pk(W.t0, 3)); };
        break;
      case 'vct':
        good = u => { const r = G.info(u, s); return pk(W.g)(r.fours.length ? '四' : r.threes.length ? '三' : '先手の一手'); };
        ng = u => { const r = G.info(u, s); return pk(W.n) + (r.fours.length ? pk(W.t4, 1) : r.threes.length ? pk(W.t3, 2) : pk(W.t0, 3)); };
        break;
      default: return null;
    }
    const pu = i % 2 === 1 || i === 4;
    const ngW = function (u0) { const u = wrongOf(u0); this._hl = []; return u == null ? '' : VO.soft(i) + ' ' + ng.call(this, u); };
    const goodW = function (u) { this._hl = []; return VO.cheer(i) + ' ' + good.call(this, ok.includes(u) ? u : ra) + (pu ? ' ' + VO.push(i) : ''); };
    return { ask: fill(pk(T.ask), { s: side }), hintTx: pk(T.hint, 2), good: goodW, ng: ngW, own: true };
  }
  const GOMOKU = {
    LKEY: 'aicoding-gomoku-lessons', OKEY: 'aicoding-gomoku-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../gomoku/lessons.json?v=30261123'), getJ('../gomoku/openings.json?v=20261113'), fetch('../gomoku/i18n.js?v=20261115').then(r => r.text()), fetch('../gomoku/voice-pen-ja.js?v=3').then(r => r.ok ? r.text() : '').catch(() => '')])
        .then(([ls, op, tx, vp]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] gomoku texts', e); } this.I = w.I18N || {}; this.data = { ls, op };
          try { const v = {}; new Function('window', vp)(v); this.V = ((v.I18N || {})['ja@pen']) || {}; } catch (e) { this.V = {}; }   // (ゴイシペン's own lines, 3D, ja)
          return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && this.V && this.V[k] != null ? this.V[k] : (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: P => window.AtlasMini && AtlasMini.gomoku ? AtlasMini.gomoku(Array.isArray(P.b) ? P.b.join(' ') : P.b, Array.isArray(P.w) ? P.w.join(' ') : P.w) : '',
    name(g, lang) { return lang === 'ja' ? g.kanji : lang === 'zh' || lang === 'zh-TW' ? g.zh || g.kanji : lang === 'ko' ? g.ko || g.name : g.name; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(g => { const L = g.line.split(' '); return { key: g.id, cat: g.kind, catName: this.tx('op.tab.' + g.kind, lang), title: this.name(g, lang), sub: this.tx('op.d.' + g.id, lang), tag: (g.kind === 'direct' ? 'D' : 'I') + g.no, svg: this.mini({ b: [L[0], L[2]], w: [L[1]] }), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' }; }); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang), title: this.tx('ls.' + s.id + '.title', lang) || s.id, sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0]) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), V = lang === 'ja' ? (this.V || {}) : {};
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`]; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      return { id: s.id, title: T('title'), intro: T('intro'), ramp, RU,
        probs: (s.problems || []).map((P, i) => { const ok = gCells(P.ok || []), pick = P.kind === 'pick';
          const o = { pos: gPos(P, { pick, noForbid: !!(s.hideForbid || pick) }), kind: 'best', P: { ok }, ask: T('goal'), ans: ok[0], why: '', ng: () => T('ng', { m: SP('ok', lang), x: SP('ng', lang) }), good: () => T('why', { m: SP('here', lang), n: ok.length }), hintTx: T('hint'), hint: P.hint ? gCells(P.hint) : null };
          if (lang === 'ja') { const J = gmLsJa(s.id, o.pos.start, o.pos.rule, ok, i, +key); if (J) Object.assign(o, J); }   // (2026-11-21 lesson loop: ゴイシペン asks and explains — see GML / gmLsJa)
          return o; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const steps = g.study.map(x => GSQ(x[0])), notes = {};
      g.study.forEach((x, i) => { const v = x[1], n = x[2]; let t = `<b>${i + 1}. ${this.tx(i % 2 ? 'p2' : 'p1', lang)}</b>`;   // (every move: its number and colour — the point is the one just played, no coordinate)
        if (i === 2) t += '<br>' + this.tx('op.ev.' + g.ev, lang);
        if (n) t += '<br>' + (String(n).startsWith('op.n.') ? this.tx(n, lang, { c: this.tx(v > 0 ? 'p1' : 'p2', lang) }) : L(n, lang));
        notes[String(i)] = t; });
      const ja = lang === 'ja', hs = g.id.length * 7 + g.no;
      const PJ = ja ? GOP.mk(this.data.op.sets.indexOf(g)) : null;
      if (ja) Object.assign(notes, GOMOKU_OP_JA.notes(g, PJ));   // (2026-11-22 lesson loop: ゴイシペン tells every move — see GOP)
      const probs = shuffle(g.problems || []).slice(0, 5);
      return { id: g.id, title: this.name(g, lang), intro: this.tx('op.read', lang, { k: g.kanji, r: g.kana, n: g.name }) + '<br>' + this.tx('op.d.' + g.id, lang) + (ja ? '<br>ぼくといっしょに、この珠型の流れを1手ずつ見ていこう！' : ''), start: { start: null, rule: 'renju', me: 1, last: -1 },
        steps, notes, probs: probs.map((P, i) => { const sc = (P.sc || []).map(([u, v]) => [GSQ(u), v]), b = sc.slice().sort((a, c) => c[1] - a[1])[0];
          const o = { pos: gPos(P, { rule: 'renju' }), kind: 'best', P: { sc }, ask: this.tx('op.goal', lang), ans: b ? b[0] : -1 };
          if (ja && b) Object.assign(o, GOMOKU_OP_JA.prob(g, o, sc, b, i, PJ));
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= 75; pr[g.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, u) {   // = gomoku/app.js problemPoints
      if (P.sc && P.sc.length) {
        const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(u) ? val.get(u) : Math.min(...P.sc.map(e => e[1])) - 200, WINT = 9000;
        if (best > WINT) return mine > WINT ? 20 : 0;
        if (mine >= best - 25) return 20;
        const sv = v => 2 / (1 + Math.exp(-v / 200)) - 1;   // (≈ the game's sOfV)
        return Math.max(0, Math.round(20 * (1 - (sv(best) - sv(mine)) / 0.4)));
      }
      return (P.ok || []).includes(u) ? 20 : 0;
    },
    // the warm-up: its position, its marks, whether a move is right
    rampPos: it => gPos(it, { noForbid: !!it.pick, pick: !!it.pick }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => (it.marks || []).map(([q, c]) => [GSQ(q), GMK[c] || 'hl']),
    rampOk: (it, u) => gCells(it.ok || []).includes(u), rampAns: it => GSQ((it.ok || [])[0]), rampLook: it => gCells(it.look || []).map(q => [q, 'ring']),
    rampSeq: it => gCells(it.seq || []), nm: m => GNM(m),
    introPos(c) {   // the lesson's diagram (gomoku/lessons.json step.diagram: b, w stones; o = the point that matters, d = a point to avoid)
      const s = this.data.ls.steps.find(x => x.id === c.id), d = s && s.diagram; if (!d) return { pos: { start: null, rule: 'renju', me: 1, last: -1, lock: true, noForbid: true } };
      return { pos: { start: { b: gCells(d.b), w: gCells(d.w), side: 1 }, rule: 'free', me: 1, last: -1, lock: true, noForbid: true }, marks: [...gCells(d.o).map(q => [q, 'ok']), ...gCells(d.d).map(q => [q, 'ng'])] };
    },
  };
  /* go (2026-11-13): go/lessons.json (21 steps of 5 problems on 7–19 boards: ok 20 · good 16 · half 10 points; the right line is played
     out after the answer; a warm-up ramp before some) and go/openings.json (45 joseki / fuseki: the line move by move with notes and the
     AI's values, then 5 practice positions). Progress = the full game's ('aicoding-go-lessons' / 'aicoding-go-open'). The texts are in the
     JSON files themselves (all languages). A position here is { spec: { n, stones, turn }, me, view, marks } (index: row × n + column, row 0 at the top). */
  const GOC = 'ABCDEFGHJKLMNOPQRST';
  const goPc = (q, N) => { if (q == null) return null; if (typeof q === 'number') return q; q = String(q).toUpperCase(); if (q === 'PASS') return -1; const x = GOC.indexOf(q[0]), y = N - parseInt(q.slice(1), 10); return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : null; };
  const goPcs = (a, N) => (a || []).map(q => goPc(q, N)).filter(x => x != null);
  const goNm = (m, N) => m < 0 ? 'pass' : GOC[m % N] + (N - Math.floor(m / N));
  const goSpec = o => window.AtlasMini && AtlasMini.goSpec ? AtlasMini.goSpec(o) : o;
  const goCrop = (sp, extra) => {   // = go/app.js cropOf(spec, extra, 9)
    const n = sp.n || 9; if (n <= 9) return null; const S = []; for (let i = 0; i < n * n; i++) if (sp.stones[i] === 'b' || sp.stones[i] === 'w') S.push(i); (extra || []).forEach(i => { if (i >= 0) S.push(i); }); if (!S.length) return null;
    const xs = S.map(i => i % n), ys = S.map(i => Math.floor(i / n)); let x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(n - 1, Math.max(...xs) + 1), y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(n - 1, Math.max(...ys) + 1);
    const grow = (a, b) => { while (b - a + 1 < 9) { if (b < n - 1 && (a <= 0 || n - 1 - b <= a)) b++; else a--; } return [a, b]; }; [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
    if (x0 <= 2) x0 = 0; if (y0 <= 2) y0 = 0; if (x1 >= n - 3) x1 = n - 1; if (y1 >= n - 3) y1 = n - 1;
    return Math.max(x1 - x0, y1 - y0) + 1 >= n - 2 ? null : [x0, y0, x1, y1];
  };
  const GO_CLS = { ok: 'ok', ng: 'ng', hang: 'ng', tri: 'hl', sq: 'hl', dash: 'ring', hl2: 'ring', x: 'ng' };
  let goRulesP = null;
  const goRules = () => window.GoRules ? Promise.resolve() : goRulesP || (goRulesP = new Promise(res => { const sc = document.createElement('script'); sc.src = '../go/rules.js?v=2'; sc.onload = sc.onerror = () => res(); document.head.appendChild(sc); }));
  /* (2026-11-21 lesson loop) the joseki practice in ゴイシペン's words, Japanese: a varied question, a hint from what the line's move is
     for (the note's key word — never the point itself), and after the answer the note's reason; a wrong move gets the right point
     (green), why it is played, and what the other move gives up. */
  const GOJ = {
    ask: ['定石の続き、{s}の次の一手はどこかな？', '{s}の番だね。手順を思い出して打ってみて！', 'ここで{s}が打つ、いちばんの定石はどこだと思う？', 'この形の急所はどこかな？ 相手の狙いも考えてみるペン。', 'さあ{s}の一手！ 強い人がよく打った手を当ててみて。'],
    hint: [[/切|キリ|ツギ|ツイ|ツナ|つな/, '自分の石のつながりを確かめてみて。切られそうなところはないかな？'], [/三々|隅に入|隅にすべ/, '隅の奥がまだ空いてるね。そこが気にならない？'],
      [/ハネ/, '相手の石の先をおさえる手を考えてみて。頭をたたかれると苦しいペン。'], [/押さえ|オサエ|ふさ|止め/, '相手が進みたい方向はどっちかな？ そこをふさぐ手が大事だね。'],
      [/ヒラ|開い|開く|足場|根拠/, '石が生きるには足場が要るよね。辺に広げる手を探してみて！'], [/ハサ/, '受けるだけじゃなく、相手の石をはさんで攻める手もあるペン。'],
      [/カカ/, '相手の隅の石に近づいて、地を減らす手を考えてみて。'], [/ノビ|伸び|ノビる/, 'あわてずに、石をまっすぐ伸ばす手も考えてみて。'], [/トビ|一間/, '一歩軽く跳んで、中央に顔を出す手はどうかな？']],
    hintDef: ['前の手の狙いを思い出してみて。相手は次に何をしたいのかな？', 'まずは自分の弱い石を探そう。それから相手の急所を考えるペン。'],
    good: ['そう、それが定石ペン！', 'ばっちり！ 手順どおりだね。', 'いいね、その一手！'],
    ngHalf: ['きみの手も一つの考え方だね。でも定石の手順と比べると、少し損なんだ。', 'きみの手も悪くはないね。ただ、手順から外れると細かいところで損が出ちゃう。'],
    ngBad: ['ほかの点だと、その狙いが果たせないまま相手に急所を先に打たれちゃうペン。', 'そこだと一手遅れて、相手に好きな形を作られちゃうんだ。', 'その手だと石の働きが弱くて、相手に隅や辺の主導権を渡しちゃうね。'],
    // the note → its plain sentences (no tags), the first ones up to `max` characters
    why(note, max) { const ss = (String(note || '').replace(/<[^>]+>/g, '').match(/[^。！？]+[。！？]/g) || []).map(x => x.trim()); let out = ''; for (const x of ss) { if (out && (out + x).length > max) break; out += x; } return out; },
    side: s => s === 1 ? '黒' : '白',
  };
  /* (2026-11-22 lesson loop) the go lessons in ゴイシペン's words, Japanese: five questions and five hints per step and each problem's
     own why / what the miss overlooks, written by hand without coordinates (go/voice-pen-ja.js <step>.ask0-4 / .hint0-4 / <step>/<i>.why /
     <step>/<i>.ng — a coordinate left in them is named by its mark: the answer green, the player's move red, one other orange). Around
     them: praise for the player, a push on, a soft word after a miss (GO_CH). */
  const GO_CH = {
    good: ['いい手！', 'さすが！', 'お見事！', 'ばっちりだペン！', 'やった！', 'すごい！', 'その通り！', 'よく見つけた！'],
    near: ['その手もいい手だね！', 'それも十分いい手ペン！', 'その手でもOK！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', 'その勢いで次へ行こうペン！'],
    soft: ['大丈夫！', 'ドンマイだペン！', '気にしない、気にしない！', 'あと一歩！', '平気、平気！', 'おしかった！', 'いっしょに確認！', 'よくある見落としペン！'],
    half: ['きみの手も悪くないね。', 'その手も一つの考え方だペン。', 'いい線いってるね！'],
    right: ['正解は{m}。', '答えは{m}だったんだ。', 'ここは{m}が正解ペン。', 'いちばんいいのは{m}！', '{m}を見てみて。'],
    tail: [null, 'これで覚えちゃおう！', null, '次はきっと見つけられるペン！', null],
  };
  function goLsJa(V, sid, i, P, N, ok, half, si) {   // { ask, hintTx, good, ng, own } from the hand-written lines, or null
    const cl = t => t == null ? null : String(t).replace(/\[([A-HJ-T](?:1[0-9]|[1-9]))\]/g, '<bdi>$1</bdi>'), w = cl(V[sid + '/' + i + '.why']), n = cl(V[sid + '/' + i + '.ng']); if (w == null || n == null) return null;
    const k = i % 5, pk = (L, j) => L[((j % L.length) + L.length) % L.length], OKM = SP('ok', 'ja'), o8 = (si | 0) % 8 + i * [1, 3, 5, 7][((si | 0) >> 3) % 4];   // (o8: the praise / soft openers in a different order in each lesson)
    const ask = V[sid + '.ask' + k] != null ? V[sid + '.ask' + k] : V[sid + '.goal'], hintTx = V[sid + '.hint' + k] != null ? V[sid + '.hint' + k] : V[sid + '.hint'];
    return { ask, hintTx, own: true,
      good(u) { this._hl = []; const t = goSpots(w, N, ok, u, true, 'ja', this._hl); return [ok.includes(u) ? pk(GO_CH.good, o8) : pk(GO_CH.near, k), t, pk(GO_CH.push, k)].filter(Boolean).join(' '); },
      ng(u) { this._hl = []; const t = goSpots(n, N, ok, u, false, 'ja', this._hl), part = half.includes(u);
        return [part ? pk(GO_CH.half, k) : pk(GO_CH.soft, o8), t.includes(OKM) ? null : fill(pk(GO_CH.right, k + 1), { m: OKM }), t, part ? null : pk(GO_CH.tail, k)].filter(Boolean).join(' '); } };
  }
  /* (2026-11-22 lesson loop) the go joseki / fuseki practice in ゴイシペン's words, Japanese, read from the board (go/rules.js): what the
     line's move does (captures, atari, saves a stone in atari, connects, cuts in, touches, the 3-3, a jump / knight / diagonal from a
     friend, an approach, an extension) — goOpF — and, after a miss, what the other side does with the green point (goOpF from the
     opponent's side: takes stones, ataris, cuts in, connects, slides into the corner, touches). Never the engine's opinion. The stored
     notes keep their sentences without the AI's judgement (GOJ_OP.clean); the move's name is taken from the note's first sentence. */
  const GOJ_OP = {
    ask: ['手順の続き！ {s}の次の一手はどこかな？', '{s}の番だね。手順を思い出して打ってみて！', 'ここで{s}が打つ、いちばんの手はどこだと思う？', 'この形の急所はどこかな？ 相手のねらいも考えてみるペン。', 'さあ{s}の一手！ 強い人がよく打った手を当ててみて。',
      '{s}はここで何を打つ？ さっきの手順を思い出してみよう！', 'ここが勝負どころペン。{s}のいちばんの手は？', '{s}の手番。形を整える一手を探してみて！', '次の{s}の一手、きみならどこに打つ？', 'ちょっと考えどころだね。{s}はどこへ打つかな？'],
    hint: {
      cap: ['相手の石のダメ（空いている点）を数えてみて。あと1つの石はないかな？', '取れる石が盤の上にないか、じっくり見てみるペン！', 'ダメが1つしかない相手の石、見つかるかな？'],
      save: ['自分の石のダメを数えてみて。あと1つしかない石はない？', 'アタリになっている石はないかな？ まずは助けるのが先ペン！', '取られそうな石がないか、先に確かめてみよう！'],
      atari: ['相手の石のダメを数えてみて。2つしかない石はどれかな？', '相手の石を追いつめる手があるペン。ダメを減らしてみよう！', '相手に「逃げなきゃ！」と思わせる手はどこかな？'],
      connect: ['自分の石のつながりを確かめてみて。切られそうなところはないかな？', '石と石のあいだに、すきが空いてないかな？ そこが急所ペン！'],
      cut: ['相手の石のつなぎ目を探してみて。割りこめそうなところはない？', '相手の石は、ちゃんとつながってるかな？ すきを探してみよう！', '相手の石を2つに分けられたら、攻めやすくなるよね？'],
      sansan: ['隅の奥がまだ空いてるね。そこが気にならない？', '隅のいちばん奥の、地になりやすい場所を考えてみるペン。', '隅で生きるなら、どこに入るのがいいかな？'],
      contact: ['相手の石にくっつける手を考えてみて。どっちからおさえるかがポイント！', '相手の石のすぐとなりが急所ペン。伸びたい方向をふさごう！', '相手の石の頭はどっちかな？ そこをおさえる手を探してみて。', '相手の石が伸びたいのは、どっちの方向かな？', 'となりにつけて、相手の形を決めさせる手があるペン！'],
      shape: ['自分の石から、軽く一歩のばす手を考えてみて！', '仲間の石と連絡しながら、形よく広がる手があるペン。', '石をくっつけすぎず、離しすぎず。ちょうどいい間かくはどこかな？', '自分の石を強くする手はどこかな？ まずは足元を固めよう！', '仲間の石とどうつながるか、形を思いうかべてみて！', 'あせらず、自分の石の弱いところを探してみるペン。'],
      approach: ['相手の石に近づいて、地を広げさせない手を考えてみて。', '相手の隅や辺に、少し離れて近づく手があるペン！', '相手が広げたい場所はどこ？ そこへ先回りしてみよう！', 'くっつけずに、ひと間あけて相手にせまる手はどうかな？'],
      ext: ['石が生きるには足場が要るよね。辺に広げる手を探してみて！', '辺にひらいて、自分の石の根拠を作る手はどこかな？', '自分の石から辺にそって、ほどよく離れた点を探してみるペン。'],
      open: ['盤の空いている広い場所はどこかな？ 大きいところを先に取ろう！', 'まだだれもいない隅や辺を見てみて。先に打った方が得ペン！', '相手の石から離れた、大きく広い場所を探してみよう。'] },
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちりだペン！', 'やった！', 'すごい！', 'その通り！', 'よく見つけた！', 'ナイス！', 'いい手ペン！', '上手！'],
    near: ['その手もいい手だね！', 'それも十分いい手ペン！', 'その手でもバッチリ！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', 'その勢いで次へ行こうペン！', null, 'まだまだ行けるね！'],
    soft: ['大丈夫！', 'ドンマイだペン！', '気にしない、気にしない！', 'あと一歩！', '平気、平気！', 'いっしょに確認しよう！', 'よくある見落としペン！', 'だいじょうぶ、ここは難しいところ！', 'おしい！', '次は見つけられるね！', 'いい線いってたよ！'],
    half: ['きみの手も悪くないね。', 'その手も一つの考え方だペン。', 'いい線いってるね！'],
    right: ['正解は{m}。', '答えは{m}だったんだ。', 'ここは{m}が正解ペン。', 'いちばんの手は{m}！', '{m}を見てみて。'],
    tail: [null, 'これで覚えちゃおう！', null, '次はきっと見つけられるペン！', null, 'もう一回並べれば、すぐ覚えられるよ。'],
    // the role of the line's move ({n} its name from the note — 'この{n}で、' when there is one), by what it does on the board
    why: {
      cap: ['{n}相手の石を{k}子取った！ 形がいっぺんに軽くなるペン。', '{n}{k}子をしっかり取りきった。もう取られる心配もないね！'],
      save: ['{n}アタリの石を助けた！ ダメが{l}つに増えて、ひと安心ペン。', '{n}あと1つだったダメが{l}つになった。取られずにすんだね！'],
      atari: ['{n}相手の石をアタリにした！ 相手は逃げるのに手をとられるペン。', '{n}相手の石のダメがあと1つ。先手で相手に受けさせる手なんだ！'],
      connect: ['{n}自分の石どうしをつないだ！ もう切られる心配はないペン。', '{n}離れそうだった石がつながった。しっかりした形だね！', '{n}つなぎ目をふさいで、石がひとつにまとまった！'],
      cut: ['{n}相手の石のあいだに割りこんだ！ 相手は2つに分かれて苦しいペン。', '{n}相手の石のつなぎ目に入った。片方ずつ攻められるね！'],
      sansan: ['{n}隅のいちばん奥、三々に入った！ 隅の地をそっくり持っていく手ペン。', '{n}三々にすべりこんで、隅で生きる足場ができた！'],
      contact: ['{n}相手の石にぴったりつけた！ 伸びたい方向をおさえたペン。', '{n}相手の石のすぐとなりで、行く手をふさいだ！', '{n}相手の石に体をくっつけて、形を決めにいった！', '{n}相手とがっぷり組んで、強い形を作りにいったペン！'],
      jump: ['{n}自分の石から一間とんで、軽く広がった！ 切られにくい形ペン。', '{n}一歩とびで、相手より先に広い方へ顔を出した！', '{n}ひとつあけて軽くとんだ。足の速い形だね！'],
      diag: ['{n}ななめにつないだ。切られずに、しっかり広がる形ペン！', '{n}コスミの形で、すきなく一歩のびた！', '{n}ななめに一歩。じょうぶで、むだのない形だね！'],
      keima: ['{n}ケイマの形で、自分の石と連絡しながら広がった！', '{n}ケイマにひらいて、足を軽くのばしたペン！', '{n}桂馬の形で、ふわっと広がった。軽くて速い一手！'],
      approach: ['{n}相手の石に近づいて、地を広げさせない！', '{n}相手の隅に少し離れて近づいた。ここから足場を作れるペン！', '{n}ほどよく間をあけて、相手の石にせまった！', '{n}相手の陣地になりそうな所へ、先に入っていったペン！'],
      ext: ['{n}辺にひらいて、自分の石の足場を作った！', '{n}自分の石から辺にそって広げた。これで根拠ができるペン！', '{n}ほどよく離れてひらいて、辺に陣地のもとを作った！'],
      nobi: ['{n}自分の石からまっすぐ伸びた！ ダメが{l}つに増えて、じょうぶな形ペン。', '{n}仲間の石にくっつけて伸びた。これで石が強くなったね！', '{n}あわてずに一歩伸びて、ダメを{l}つにした！'],
      local: ['{n}ここで形を整えた！ 次の戦いにそなえる一手ペン。', '{n}石の働きを広げる、大事な一手だね！', '{n}まわりの石と協力できる場所に打った！'],
      open: ['{n}空いている大きな場所を先に取った！', '{n}広いところに先に石を置いたペン。あとで大きく働くね！', '{n}まだだれもいない場所へ。大場を取る手なんだ！'] },
    // what the other side does with the green point if it is left
    them: {
      cap: ['そのままだと、相手に{m}を打たれて、石を{k}子取られちゃう。', '相手が{m}に打つと、きみの石が{k}子取られちゃうんだ。', 'もし{m}を後回しにすると、そこで{k}子を取られちゃうペン。'],
      atari: ['相手に{m}を打たれると、きみの石がアタリにされちゃう。', '{m}を相手が打つと、きみの石のダメがあと1つになっちゃう。', '放っておくと、相手は{m}できみの石をアタリにできるんだ。'],
      save: ['相手に{m}を打たれると、アタリの石に逃げられちゃう。', 'そのままだと、相手は{m}でアタリの石を助けられるんだ。', '{m}を空けておくと、取れそうな石がそこから逃げちゃうペン。'],
      cut: ['相手に{m}を打たれると、きみの石のあいだに割りこまれちゃう。', '{m}はきみの石のつなぎ目。相手に打たれると、石が2つに分かれちゃう。', 'もし相手が{m}に来ると、きみの石は切り離されちゃうペン。'],
      connect: ['相手に{m}を打たれると、相手の石がつながって、攻めるチャンスがなくなる。', '{m}は相手の石のつなぎ目。打たれると、もう切れなくなっちゃう。', '相手が{m}に打つと、離れていた石がひとつにまとまっちゃうんだ。'],
      sansan: ['相手に{m}を打たれると、隅の奥に入られて、地をへらされちゃう。', 'そのままだと、相手に{m}で三々に入られて、隅で生きられちゃう。', '{m}を空けておくと、隅の地に入りこまれちゃうペン。'],
      contact: ['相手に{m}を打たれると、きみの石にぴったりつけられて、伸びる先をおさえられちゃう。', '{m}を相手が先に打つと、きみの石の行く手がふさがれちゃう。', 'もし相手が{m}に来ると、きみの石は伸びたい方へ進めなくなるんだ。', '放っておくと、{m}で頭をおさえられて、きみの石が苦しくなっちゃう。'],
      reduce: ['相手に{m}を打たれると、きみの石のダメが{l}つに減って、苦しくなっちゃう。', '{m}を相手が打つと、きみの石はダメが{l}つしかなくなるペン。', 'そこを取られると、きみの石のダメが{l}つまで減っちゃうんだ。'],
      gen: ['ほかの点だと、相手に{m}を先に打たれて、この形の大事な場所を取られちゃう。', '{m}を後回しにすると、相手がそこに打って、いい形を作っちゃう。', '{m}は相手にとっても大事な点。先に打たれると、ここで一手遅れちゃうんだ。',
        'そこを空けておくと、相手が{m}に打って、形がよくなっちゃうペン。', 'もし相手が{m}に来ると、きみはこの場所で後手にまわっちゃう。'] },
    you: { selfAtari: ['それに、きみの石はすぐアタリになっちゃう。', 'しかも、その石はダメが1つしかないペン。'], line1: ['一線の石は、地にも厚みにもなりにくいんだ。'], far: ['それに、いま戦っている場所から遠すぎるペン。', 'その点は、この戦いから離れすぎているんだ。'],
      half: ['手順の手のほうが、石の働きが大きいから、ここは覚えておこう。', 'でも手順の手なら、相手の形をもっと苦しくできるんだ。'] },
    intro0: '囲碁は、石で囲んだ陣地の広さを競って、広いほうが勝ちのゲームだペン。定石は、何度も打たれてきた「おたがいに損のない手順」なんだ。',
    introA: ['今日は「{t}」！', '「{t}」を並べてみよう！', '次は「{t}」だペン。', 'お待たせ、「{t}」の時間！', '「{t}」、いっしょに覚えよう！', 'さあ、「{t}」を見てみよう！'],
    introZ: ['手順を見たら、問題に挑戦だよ！', 'どんな形になるか、よく見ててね！', '最後に問題も出すから、お楽しみにペン！', 'ひと手ずつ、いっしょに確かめよう！', '石の流れに注目してみて！', '覚えたら、問題で腕だめしだね！'],
    names: [[/三々/, '三々入り'], [/ハネ/, 'ハネ'], [/ツイ|ツギ|ツグ|ツナ/, 'ツギ'], [/オサエ|押さえ/, 'オサエ'], [/ツケ/, 'ツケ'], [/ハサ/, 'ハサミ'], [/カカ/, 'カカリ'], [/ヒラ|開い|開く/, 'ヒラキ'], [/コスミ/, 'コスミ'], [/ノビ|伸び/, 'ノビ'], [/キリ|切り|切っ/, 'キリ'], [/サガ/, 'サガリ'], [/トビ|トん|一間/, 'トビ'], [/ケイマ/, 'ケイマ'], [/シマ/, 'シマリ'], [/ハイ|ハッ|ハう|ハわ/, 'ハイ'], [/オシ|押し|押す/, 'オシ'], [/アテ/, 'アテ'], [/ノゾ/, 'ノゾキ']],
    AIR: /AI(の|が|も|で|に)|評価|見立て|形勢|勝つ見込み|勝率/,
    clean(h) { const s = String(h || ''); const parts = s.replace(/（[^（）]*?(AI|評価)[^（）]*?）/g, '').split(/(<br>)/); return parts.map(p => p === '<br>' ? p : (p.match(/[^。！？]+[。！？]?/g) || []).filter(x => !GOJ_OP.AIR.test(x)).join('')).join('').replace(/(<br>)+$/, '').replace(/^(<br>)+/, ''); },
    side: s => s === 1 ? '黒' : '白',
  };
  function goOpF(p, m) {   // what move m (by p.turn) does on the board, or null if illegal
    const R = window.GoRules, N = p.n, nb = R.nbrs(N), c = p.turn, o = 3 - c; if (m == null || m < 0) return null;
    const r = p.tryPlay(m); if (!r) return null; const q = r.pos, x = m % N, y = Math.floor(m / N), ln = v => Math.min(v, N - 1 - v) + 1;
    const gid = (pp, i) => Math.min(...pp.group(i).stones), own = new Set(), opp = new Set(); let saved = false;
    for (let k = 0; k < 4; k++) { const t = nb[m * 4 + k]; if (t < 0) continue; if (p.b[t] === c) { own.add(gid(p, t)); if (p.group(t).libs === 1) saved = true; } else if (p.b[t] === o) opp.add(gid(p, t)); }
    const f = { adjOwn: own.size, cap: r.captured.length, line: Math.min(ln(x), ln(y)), libs: q.group(m).libs, connect: own.size >= 2, contact: opp.size > 0, sansan: ln(x) === 3 && ln(y) === 3 };
    f.save = saved && f.libs >= 2;
    let at = 0, red = 9; const sg = new Set(); for (let k = 0; k < 4; k++) { const t = nb[m * 4 + k]; if (t < 0 || q.b[t] !== o) continue; const g = q.group(t), id = Math.min(...g.stones); if (sg.has(id)) continue; sg.add(id); if (g.libs === 1) at += g.stones.length; red = Math.min(red, g.libs); }
    f.atari = at; f.red = red; f.cut = sg.size >= 2;
    let dOwn = 99, dOpp = 99, jump = false, diag = false, keima = false;
    for (let i = 0; i < N * N; i++) { const v = p.b[i]; if (!v || i === m) continue; const dx = Math.abs(i % N - x), dy = Math.abs(Math.floor(i / N) - y), d = Math.max(dx, dy);
      if (v === c) { dOwn = Math.min(dOwn, d); if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) { const mid = ((Math.floor(i / N) + y) / 2) * N + (i % N + x) / 2; if (!p.b[mid]) jump = true; } if (dx === 1 && dy === 1) diag = true; if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) keima = true; }
      else dOpp = Math.min(dOpp, d); }
    Object.assign(f, { dOwn, dOpp, jump: jump && !own.size, diag: diag && !own.size, keima: keima && !own.size });
    f.kind = f.cap ? 'cap' : f.save ? 'save' : f.atari ? 'atari' : f.connect ? 'connect' : f.cut ? 'cut' : f.sansan && dOpp <= 2 ? 'sansan' : f.contact ? 'contact' : f.jump ? 'jump' : f.diag ? 'diag' : f.keima ? 'keima'
      : own.size ? 'nobi' : dOpp <= 3 && dOwn > 3 ? 'approach' : dOwn <= 5 && dOwn >= 3 && f.line >= 3 && f.line <= 4 && dOpp >= 3 ? 'ext' : dOwn >= 4 && dOpp >= 4 ? 'open' : 'local';
    return f;
  }
  const goOpNameOk = (nm, f) => {   // the note's name only where the board agrees (a contact name for a move that touches, トビ for a jump…)
    const k = f.kind, touch = f.contact || f.cut || f.atari || f.cap || f.save;
    return /^(ハネ|オサエ|ツケ|キリ|アテ|ハイ|オシ|ノゾキ)$/.test(nm) ? touch : /^(ノビ|サガリ)$/.test(nm) ? f.adjOwn > 0 && !/^(approach|ext|open)$/.test(k) : nm === 'ツギ' ? f.connect || f.save || f.adjOwn > 0
      : nm === 'トビ' ? k === 'jump' : nm === 'ケイマ' ? /^(keima|approach|ext)$/.test(k) : nm === 'コスミ' ? k === 'diag' : nm === '三々入り' ? k === 'sansan'
      : /^(カカリ|ヒラキ|ハサミ|シマリ)$/.test(nm) ? /^(approach|ext|open|keima|jump|diag)$/.test(k) : false; };
  function goOpJa(o, g, P, st, line, LI, sd, note, self) {   // fills o.ask / hintTx / good / ng
    const H = GOJ_OP, pk = (a, j) => a[((j % a.length) + a.length) % a.length], OKM = SP('ok', 'ja'), i = o.__i;
    const a = LI % 11, b = 1 + Math.floor(LI / 11) % 10, oi = a + i * b;   // (the praise / soft openers in a different order in each lesson)
    const pos = () => window.GoRules.Pos.from(self.after(st, line.slice(0, P.at))), ok = o.P.ok[0];
    const p0 = pos(); const fb = goOpF(p0, ok) || { kind: 'open' }, first = (String(note || '').match(/[^。！？]+/) || [''])[0];
    const nmH = H.names.find(([re]) => re.test(first)), nm = nmH && goOpNameOk(nmH[1], fb) ? nmH[1] : '', kind = /^(jump|diag|keima|nobi|local)$/.test(fb.kind) ? 'shape' : fb.kind;
    const seen = o.__seen, uz = (key, arr) => { const c = seen[key] = (seen[key] || 0) + 1; return pk(arr, c + LI); };
    o.ask = fill(pk(H.ask, LI * 3 + i), { s: H.side(sd) });
    o.hintTx = uz('h' + kind, H.hint[kind] || H.hint.open);
    const why = fill(uz('w' + fb.kind, H.why[fb.kind] || H.why.open), { n: nm && fb.kind !== 'sansan' && !(H.why[fb.kind] || []).join('').includes(nm) ? fill(uz('nm', ['この{n}で、', '{n}を打って、', '{n}がぴったり。', '', 'ここで{n}！ ']), { n: nm }) : '', k: fb.cap, l: fb.libs });
    const themOf = u => {   // the other side's use of the green point (after the player's move u, or now)
      let q = p0; if (u != null && u !== ok) { const r = p0.tryPlay(u); if (r) q = r.pos; else u = null; } if (u == null || u === ok) { q = p0.tryPlay(-1).pos; u = null; }
      const t = goOpF(q, ok); if (!t) return [fill(pk(H.them.gen, i), { m: 'そこ' }), u];
      const k = t.kind === 'cap' ? 'cap' : t.atari ? 'atari' : t.kind === 'save' ? 'save' : t.cut ? 'cut' : t.connect ? 'connect' : t.sansan && t.dOpp <= 2 ? 'sansan' : t.contact && t.red === 2 ? 'reduce' : t.contact ? 'contact' : 'gen';
      return [fill(uz('t' + k, H.them[k]), { m: 'そこ', k: t.cap, l: t.red }).replace(/^そこは/, 'そこは、').replace('そこを先に打たれて', '先にそこを打たれて'), u]; };
    o.good = function (u) { this._hl = []; return [u == null || u === ok ? pk(H.good, oi) : pk(H.near, i), why, pk(H.push, LI + i)].filter(Boolean).join(' '); };
    o.ng = function (u) { this._hl = []; const part = (o.P.good || []).concat(o.P.half || []).includes(u), right = fill(pk(H.right, LI + i + 1), { m: OKM });
      if (part) return [pk(H.half, i), right, why, pk(H.you.half, LI + i)].join(' ');
      const [th, uu] = themOf(u); let ex = null;
      if (uu != null) { const fu = goOpF(p0, uu); if (fu) ex = fu.libs === 1 && !fu.cap ? pk(H.you.selfAtari, i) : fu.line === 1 ? H.you.line1[0] : fu.dOwn > 4 && fu.dOpp > 4 ? pk(H.you.far, i) : null; }
      return [pk(H.soft, oi), right, th, ex, ex ? null : pk(H.tail, LI + i)].filter(Boolean).join(' '); };
  }
  function goOpIntroJa(g, LI) {   // a short intro: the name, the stored one-line summary (or the story's first plain sentence), a nudge
    const H = GOJ_OP, pk = (a, j) => a[((j % a.length) + a.length) % a.length], sh = L(g.short, 'ja');
    const ss = (L(g.story, 'ja').replace(/<\/?p>/g, ' ').replace(/（[^（）]*）/g, '').match(/[^。！？]+[。！？]/g) || []).map(x => x.trim()).filter(x => !H.AIR.test(x) && x.length <= 70 && !/<bdi>|[A-HJ-T](1[0-9]|[1-9])/.test(x));
    const body = sh && !H.AIR.test(sh) ? sh.replace(/[。]?$/, '。') : '', more = ss.find(x => x.length + body.length <= 100 && !x.includes(sh)) || '';
    const lead = LI === 0 ? H.intro0 + '<br>' : '';
    return lead + fill(pk(H.introA, LI), { t: L(g.title, 'ja').replace(H.AIR, '') }) + (body || more) + (LI === 0 ? '' : body && more ? more : '') + pk(H.introZ, LI);
  }
  const GO = {
    LKEY: 'aicoding-go-lessons', OKEY: 'aicoding-go-open', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../go/lessons.json?v=30261123d'), getJ('../go/openings.json?v=4'), goRules(), fetch('../go/voice-pen-ja.js?v=6').then(r => r.ok ? r.text() : '').catch(() => '')]).then(([ls, op, , vp]) => { this.data = { ls, op };
        try { const v = {}; new Function('window', vp)(v); this.V = ((v.I18N || {})['ja@pen']) || {}; } catch (e) { this.V = {}; }   // (ゴイシペン's own lines, 3D, ja)
        return this; }).catch(e => { this.p = null; throw e; }));
    },
    mini: (sp, view) => window.AtlasMini && AtlasMini.go ? AtlasMini.go(sp, view) : '',
    opStart: g => goSpec(g.start ? Object.assign({ n: g.n || 19 }, g.start) : { n: g.n || 19 }),
    opLine: g => goPcs(g.line, g.n || 19),
    after(sp, mv) { const R = window.GoRules; if (!R) return sp; let p = R.Pos.from(sp); for (const m of mv) { const r = p.tryPlay(m); if (!r) break; p = r.pos; } return p.spec(); },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}), cn = id => { const c = D.op.cats.find(x => x.id === id); return c ? L(c.title, lang) : id; };
        return D.op.sets.map(g => ({ key: g.id, cat: g.cat, catName: cn(g.cat), title: L(g.title, lang), sub: L(g.short, lang), svg: this.mini(this.after(this.opStart(g), this.opLine(g).slice(0, g.show || 6)), g.view || null), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {}), cn = id => { const c = (D.ls.courses || []).find(x => x.id === id); return c ? L(c.title, lang) : id; };
      return D.ls.steps.map((s, i) => { const P = (s.problems || [])[0], sp = P ? goSpec(P.s) : null; return { key: String(i), cat: s.course, catName: cn(s.course), title: L(s.title, lang), sub: L(s.sub, lang), svg: sp ? this.mini(sp, P.view || goCrop(sp)) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }; });
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const V = lang === 'ja' ? (this.V || {}) : {}, SV = k => V[s.id + '.' + k] != null ? V[s.id + '.' + k] : L(s[k], lang);
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`] != null ? V[`ramp:${s.id}/${j}/${f}`] : f === 'h' && it.k === 'try' && V[s.id + '.hint'] != null && JSON.stringify(it.h) === JSON.stringify(s.hint) ? V[s.id + '.hint'] : null; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      return { id: s.id, title: L(s.title, lang), intro: SV('intro'), ramp, RU,
        probs: (s.problems || []).map(P => { const sp = goSpec(P.s), N = sp.n, ok = goPcs(P.ok, N);
          return { pos: { spec: sp, me: sp.turn || 1, view: P.view || goCrop(sp, ok) }, kind: 'best', P: { ok, good: goPcs(P.good, N), half: goPcs(P.half, N) }, ask: SV('goal'), ans: ok[0], line: goPcs(P.line, N), N,
            good(u) { this._hl = []; return goSpots(L(P.why, lang), N, ok, u, true, lang, this._hl); }, ng(u) { this._hl = []; return goSpots(L(P.ng, lang) || L(P.why, lang), N, ok, u, false, lang, this._hl); }, hintTx: SV('hint'), hint: ok.length ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => { const x = ok[0] % N + dx, y = Math.floor(ok[0] / N) + dy; return x >= 0 && y >= 0 && x < N && y < N && sp.stones[y * N + x] === '.' ? y * N + x : -1; }).filter(q => q >= 0) : null }; })
          .map((o, i) => { if (lang !== 'ja') return o; const J = goLsJa(V, s.id, i, s.problems[i], o.N, o.P.ok, o.P.good.concat(o.P.half), +key); return J ? Object.assign(o, J) : o; }),   // (2026-11-22 lesson loop: ゴイシペン's own words per problem)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const N = g.n || 19, st = this.opStart(g), line = this.opLine(g), notes = {};
      line.forEach((m, i) => { const side = i % 2 ? 3 - (st.turn || 1) : st.turn || 1, ev = g.evals && g.evals[i] != null ? ` <small>(${(g.evals[i] >= 0 ? '+' : '') + g.evals[i]})</small>` : '';
        let nt = (g.notes || {})[String(i + 1)] ? L((NC.go || {})['op:' + g.id + '/n' + (i + 1)] || g.notes[String(i + 1)], lang) : '';
        if (lang === 'ja') { nt = GOJ_OP.clean(nt); if (!nt && window.GoRules) { const p = window.GoRules.Pos.from(this.after(st, line.slice(0, i))), f = goOpF(p, m); if (f) nt = GOJ_OP.side(p.turn) + '：' + fill((GOJ_OP.why[f.kind] || GOJ_OP.why.open)[i % (GOJ_OP.why[f.kind] || GOJ_OP.why.open).length], { n: '', k: f.cap, l: f.libs }); } }   // (2026-11-22 lesson loop: no AI judgement; a bare step gets its board reading)
        if (lang === 'ja' && nt && i % 2 === 0) nt = nt.replace(/。$/, '！');   // (some life in the guide's voice)
        notes[String(i)] = `<b>${i + 1}. ${side === 1 ? '●' : '○'}</b>${ev}` + (nt ? '<br>' + nt : ''); });   // (3D: the notes without coordinates)
      const self = this, LI = this.data.op.sets.indexOf(g), seen = {}, probs = shuffle(g.problems || []).slice(0, 5).sort((a, b) => a.at - b.at).map((P, pi) => { const ok = goPcs(P.ok, N);
        const o = { kind: 'best', P: { ok, good: goPcs(P.good, N), half: goPcs(P.half, N) }, ask: L(self.data.op.goal || null, lang) || '', ans: ok[0], N };
        if (lang === 'ja' && window.GoRules) {   // (2026-11-22 lesson loop: ゴイシペン asks, hints and explains from the board — GOJ_OP / goOpF)
          const sd = P.at % 2 ? 3 - (st.turn || 1) : st.turn || 1, note = L((NC.go || {})['op:' + g.id + '/n' + (P.at + 1)] || (g.notes || {})[String(P.at + 1)], 'ja');
          o.__i = pi; o.__seen = seen; goOpJa(o, g, P, st, line, LI, sd, note, self); o.own = true;
        }
        Object.defineProperty(o, 'pos', { get() { const sp = self.after(st, line.slice(0, P.at)); return { spec: sp, me: sp.turn || 1, view: g.view || null }; } });   // (the position after `at` moves: the rules are loaded by then)
        return o; });
      return { id: g.id, title: L(g.title, lang), intro: lang === 'ja' ? goOpIntroJa(g, LI) : L((NC.go || {})['op:' + g.id + '/story'] || g.story, lang) || L(g.short, lang), start: { spec: st, me: g.side || st.turn || 1, view: g.view || null }, steps: line, notes, probs,
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = Object.assign(o, { best: Math.max(o.best || 0, pts), pass: o.pass || pass, seen: true }); put(this.OKEY, pr); return pass; } };
    },
    points: (P, u) => (P.ok || []).includes(u) ? 20 : (P.good || []).includes(u) ? 16 : (P.half || []).includes(u) ? 10 : 0,   // = go/learn.js problemPoints
    rampPos: it => { const sp = goSpec(it.s); return { spec: sp, me: sp.turn || 1, view: it.view || null }; }, rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => { const N = goSpec(it.s).n; return (it.marks || []).map(([q, c]) => [goPc(q, N), GO_CLS[c] || 'hl']).filter(x => x[0] != null && x[0] >= 0); },
    rampOk: (it, u) => goPcs(it.ok, goSpec(it.s).n).includes(u), rampAns: it => goPcs(it.ok, goSpec(it.s).n)[0], rampLook: it => goPcs(it.look, goSpec(it.s).n).map(q => [q, 'ring']),
    rampSeq: it => goPcs(it.seq, goSpec(it.s).n), nm: (m, it) => goNm(m, goSpec(it.s).n),
    introPos(c) {   // the lesson's diagram (go/lessons.json step.diagram: s, marks), shown locked while the intro is read
      const s = this.data.ls.steps.find(x => x.id === c.id), d = s && s.diagram; if (!d || !d.s) return null; const sp = goSpec(d.s), N = sp.n;
      return { pos: { spec: sp, me: sp.turn || 1, view: d.view || goCrop(sp), lock: true }, marks: (d.marks || []).map(([q, k]) => [goPc(q, N), GO_CLS[k] || 'hl']).filter(x => x[0] != null && x[0] >= 0) };
    },
  };
  /* checkers (2026-11-14): the lessons (checkers/lessons.json: 13 steps of 5 one-move problems — 'ok' kinds (any listed move is
     right) and 'sc' kinds scored by the engine's values (= checkers/app.js problemPoints) — a warm-up ramp before the shot / defence
     steps) and the 19 named openings (openings.json: the line move by move with its notes, then 5 practice positions scored by the
     stored values). Progress = the full game's ('aicoding-checkers-lessons' { id: { best, clear } }, 'aicoding-checkers-open'
     { id: { best, pass } }). Texts: checkers/i18n.js (a sandbox) and lux.json (each opening's story). The 3D board has no square numbers:
     the moves the texts name ({m}, {x}) become their arrows on the board, the ramps' and openings' own texts come from atlas/nocoord. A
     position here is { spec: { b, side } (null = the start), me }. Moves: checkers/engine.js move numbers. */
  const CK_ENG = '../checkers/engine.js?v=rb4-pro1-n43-mt1-sv2-zf1-eg6tm';   // (the table adapter's file: one cache)
  const ckEng = () => window.CheckersEngine ? Promise.resolve(window.CheckersEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = CK_ENG; sc.onload = () => window.CheckersEngine ? res(window.CheckersEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const CK_WIN = 30000, CK_WINT = 29000;
  const ckS = v => v > CK_WINT ? 0.9 + 0.1 * Math.min(1, 6 / (CK_WIN - v + 1)) : v < -CK_WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (CK_WIN + v + 1))) : v > CK_WINT - 1000 ? 0.88 : v < -(CK_WINT - 1000) ? -0.88 : Math.tanh(v / 260) * 0.82;   // (= checkers/app.js sOfV)
  const CKM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の矢印の手' : '赤い矢印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;   // (a move named by its arrow)
  const ckByName = (spec, nm) => { const E = window.CheckersEngine; if (!E) return null; const p = E.Pos.from(spec); return p.moves().find(m => E.name(p, m) === nm) || null; };
  /* (2026-11-21 lesson loop) the checkers openings in チェッカニ's words, Japanese, for the 3D table (no square numbers): his own intro,
     the line's notes rebuilt from the board (what each move does — a capture / the recapture, an exchange offered, a shot, a piece saved
     from a jump, a crowning, a back-row piece brought out, a step to the centre / the edge — with the stored AI verdict when it changes),
     a question, a hint from what the best move does (never where), and after the answer why it is played and what yours gives up (a
     piece left to be jumped, a capture that is taken back, the crowning missed, the back row opened, openings.json sc). */
  function ckFacts(E, pos, m, prev) {   // what a checkers move does (prev: the move before, when known)
    const qs = (p, d) => { const c = p.caps(); if (!c.length || d > 10) return 0; let b = -99; for (const x of c) b = Math.max(b, E.popc(E.mCap(x)) - qs(p.clone().play(x), d + 1)); return b; };
    const me = pos.side, f = E.mFrom(m), t = E.mTo(m), capN = E.popc(E.mCap(m)), after = pos.clone().play(m), RC = E.RC;
    const flip = p => { const q = p.clone(); q.side ^= 1; q.rehash(); return q; };
    const net = capN - qs(after, 0), oppMust = after.caps().length > 0, thr = qs(flip(pos), 0) > 0, thrAfter = !oppMust && qs(flip(after), 0) > 0;
    const back = me ? 7 : 0, [fr] = RC[f], [tr, tc] = RC[t], king = pos.at(f) === 2 || pos.at(f) === 4;
    const Fx = { capN, net, win: after.moves().length === 0, crown: pos.promotes(m), trade: !capN && oppMust && net === 0, shot: !capN && net > 0, hang: net < 0,
      save: thr && !capN && net >= 0 && !oppMust, back: !king && fr === back, center: tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5, edge: tc === 0 || tc === 7, recap: capN > 0 && prev != null && E.mCap(prev) > 0, thrAfter, side: me };
    Fx.k = Fx.win ? 'win' : Fx.shot ? 'shot' : Fx.recap ? 'recap' : capN && net < capN ? 'xchg' : capN ? 'cap' : Fx.hang ? 'gambit' : Fx.crown ? 'crown' : Fx.save ? 'save' : Fx.trade ? 'trade' : Fx.back ? 'back' : Fx.center ? 'center' : Fx.edge ? 'edge' : 'dev';
    return Fx;
  }
  function ckOppShot(E, pos, u) {   // (2026-11-24) after your move u: the most the opponent wins by a shot (a quiet move that lets a piece be taken, then jumps back); 0 if none
    const qs = (p, d) => { const c = p.caps(); if (!c.length || d > 10) return 0; let b = -99; for (const x of c) b = Math.max(b, E.popc(E.mCap(x)) - qs(p.clone().play(x), d + 1)); return b; };
    const q = pos.clone().play(u); if (q.caps().length) return 0; let g = 0;
    for (const y of q.moves()) { const r = q.clone().play(y); if (!r.caps().length) continue; g = Math.max(g, -qs(r, 0)); }
    return g;
  }
  const CK_SIDE = s => s ? '白' : '黒';
  const CKJ_OP = {
    intro: {
      single: '黒と白の駒が、1マスだけの角「シングル・コーナー」へのびる長い斜めの道で向かい合う形。名前はそこから来ているんだ。いちばん古くからある定跡のひとつだカニ！',
      cross: '黒のいちばん人気の出だしに、白が斜めに向かい合って応じる形だね。古くから指されてきた、由緒ある定跡なんだ。',
      ayrshire: '「ラッシー」はスコットランドの言葉で「娘さん」のこと。エアシャーはスコットランド南西部の地方なの。白は端の駒から動かしていくよ。',
      old14: '1800年の定跡書で14番目に載っていた対局から、この名前が付いたんだって。黒は後ろの段の駒で形を支えるのがポイント！',
      glasgow: 'グラスゴーは、19世紀にドラフツがさかんだったスコットランドの大きな町。黒は中央の駒を、さらに前へ押し出していくカニ。',
      laird: '「レアード」はスコットランドの言葉で「領主」のこと。「領主と奥方」なんて、すてきな名前だよね！ 黒は端の駒を進めていくんだ。',
      alma: 'オールド・フォーティーンスやグラスゴーと同じ出だしから、黒が後ろの段の駒を出す形。どれも兄弟みたいな定跡なの。',
      souter: '「スーター」はスコットランドの言葉で「靴職人」のこと。職人さんたちもチェッカーを楽しんでいたんだね。黒は端から駒を寄せていくよ。',
      fife: 'ファイフはスコットランド東部の地方の名前。スーターと同じ出だしから、黒が端の駒を中へ寄せる形なんだ。',
      whilter: 'スーターやファイフと同じ出だしの定跡。黒は後ろの駒で、中央の駒をしっかり支えるのがねらいだカニ！',
      edinburgh: 'スコットランドの首都エジンバラの名前を持つ定跡。黒は1手目から盤の端へ駒を出す、ちょっと変わった出だしなんだ。',
      double: '黒の1手目が、2マスが並ぶ角「ダブル・コーナー」からのびる斜めの道を進むから、この名前なの。白はまっすぐ向かい合って応じるよ。',
      dcross: 'ダブル・コーナーの定跡で、白の応じ方を変えた形。黒と白の駒が、斜めの道で向かい合うんだ。',
      pioneer: '「パイオニア」は開拓者のこと。黒も白も、駒をどんどん中央へ集めていく定跡だね！',
      denny: 'デニーはスコットランド中部の町の名前。黒は1手目から、まん中寄りの駒を斜めに出していくカニ。',
      kelso: 'ケルソーは、スコットランドとイングランドの境に近い町。黒は1手目で、いきなり中央をおさえにいくんだ！',
      bristol: 'ブリストルはイングランド西部の港町。スコットランドの地名が多い定跡の中では、めずらしい名前なの。黒は駒をぐいぐい前へ進めるよ。',
      bcross: 'ブリストルの定跡で、白の応じ方を変えた形。ブリストルの兄弟にあたるんだ。白は中央に駒を集めて受けるカニ。',
      dundee: 'ダンディーはスコットランド東部の港町。黒は1手目から、端に近い駒を前へ出していく定跡なんだ。',
    },
    ask: ['この場面、いちばんいい手はどれ？', 'さあ、きみならここはどう動かす？', 'ここで指したい一手、見つけられるかな？', 'この局面の最善手、わかるかな？', '続きはどの手で行く？', '定跡の続きだカニ。どの駒を動かす？', 'ここ、きみならどう進める？', 'いちばん働く一手を探してみて！'],
    askN: '『{n}』の続き！ 次の一手はどれだと思う？',
    lead: ['正解は{m}だったんだ。', 'ここは{m}がいちばん！', '{m}を見てみて！', '本筋は{m}だカニ。', '定跡では{m}を選ぶの。', 'ここで指したかったのは{m}！'],
    so: ['{a}、それがこの手の強み！', '{a}のが、この手のいいところ。', 'この手なら{a}の。', 'これなら{a}んだ。', 'こう動かすと{a}からね。', '{a}から、こっちを選びたいカニ。'],
    gap: ['{x}だと、そのよさが出ないの。', '{x}だと、その形が作れないの。', '{x}だと、相手に先に良い場所を取られちゃう。', '{x}では駒の働きが一歩遅れて、相手に先を越されるの。'],
    // (2026-11-23 lesson loop) the praise, the soft words after a miss, the push on — each opening takes them in its own order (ckOpVoice)
    cheer: ['いいね！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', '上手！', 'ナイスだカニ！', 'よく見つけたね！', 'すばらしい！', 'そうそう、それ！', 'いい手だね！', '完璧！'],
    soft: ['おしい！', 'ドンマイ！', 'あと少しだった！', 'いい線いってたカニ！', '大丈夫、ここで覚えちゃおう！', '気にしない、気にしない！', 'よくある迷いだから平気！', 'だいじょうぶ、次はきっと指せるカニ！', 'あと一歩！', 'みんな一度は迷う場面なの。'],
    push: ['次もこの調子でいこう！', 'どんどん行こう！', 'その勢いで次へ進もう！', 'まだまだいけるね！', 'この感じで続けよう！', '次も楽しみだカニ！'],
    pr: ['きみの手で{a}の。', 'これで{a}ね！', '{a}のが、この手のねらいだカニ。', 'その手なら{a}。形がわかってきたね！', '{a}から、ここはこの一手なの。', 'ちゃんと{a}手を選べたね。'],
    deg: d => d <= 10 ? 'ほんの少し' : d <= 40 ? '少し' : d <= 150 ? 'はっきり' : 'かなり',
  };
  const CK_WHY = {   // why the move is played (the praise / the line's notes) — several wordings each, none said twice in one opening
    win: ['これで相手は動けない！ 勝ちが決まる手だね。', '一気に決めちゃう手だカニ！', '相手の動ける駒がなくなる、とどめの一手！'],
    gambit: ['わざと1枚を取らせる手！ 駒は1枚へるけど、定跡ではそのあとの形を大事にするの。', '1枚を差し出す、思い切った手だカニ！ 取らせたあとの陣形で勝負するんだ。', '相手に1枚あげちゃう手。損は承知で、形を先に作るのがこの定跡のやり方なの。'],
    shot: ['わざと駒を取らせて、そのあと跳び返す「ショット」！ 差し引きで得をするんだ。', '取らせてから跳び返す手。損に見えて、じつは得なの！', '捨てた駒より多く取り返す、気持ちいい一手だカニ！',
      '相手は取るしかない。取ったあとの形を、こっちが跳び越せるんだ！', '取るのがルールだから、相手はよけられないの。そのすきに跳び返すカニ！', 'えさの駒を置いて、取りに来た駒を跳び返す。これぞショット！', '一度へこんでから大きく取り返す、チェッカーらしい一手！'],
    recap: ['取られた分を、すぐに取り返す手。これで駒の数は元どおり！', '取り返しの一手！ 取れるときは取らなきゃいけないルールなんだ。', 'すかさず取り返して、駒の数をそろえる手だカニ。', 'やられたらやり返す！ 跳び越えて1枚取り戻すの。', 'お返しの一手だね。これで取り合いはおあいこカニ！', '相手の跳んできた駒を、こっちも跳んで取る。これで五分五分！'],
    cap: ['相手の駒を跳び越えて取る手！ 取ったあとも取り返されない取り方を選ぶのがコツなんだ。', 'どの取り方を選ぶかが大事。これなら着地した駒が安全なの。', '取るのは義務。だからこそ、いちばん得な取り方を選ぶんだ！', '相手の駒をいただく手！ 着地したマスで、すぐには跳ばれないカニ。'],
    xchg: ['取るのは義務だから、ここは跳び越えて取る。このあと取り返されて、1枚ずつの交換になるんだ。', '跳び越えて取る手。すぐ取り返されるけど、それも定跡のうちだカニ。', 'ルールどおり取る手！ 取り返されて、駒の数はおあいこになるの。', 'ここは取る一手！ 相手も取り返して、盤がすっきりするカニ。', '跳んで1枚いただき！ 次に取り返されるのは、はじめから計算ずみなの。'],
    crown: ['いちばん奥まで進んでキングになる手！ キングは後ろにも動けるんだ。', 'キングに成る手だね。ぼくの背中の王冠とおそろいだカニ！', '奥の段に着いて王冠をかぶる！ ここから後ろへも戻れるの。'],
    save: ['跳び越えられそうな駒を、先に守る手。取られる前に手当てするのが大事なの。', '相手の取るねらいを、先にかわしておく手なの。', 'ピンチの駒を助ける手！ これで相手は跳び越えられないカニ。'],
    trade: ['駒をぶつけて、1枚取らせて1枚取り返す交換をさそう手。形をすっきりさせるんだ。', '交換をしかける手！ 取り合いのあと、こっちの形がよくなるの。', '自分から駒をぶつけて交換にいく手だカニ。', 'わざと相手の前に駒を出す手。相手は取るしかなくて、こっちもすぐ取り返せるね！', '1枚ずつの取り合いにさそう手。相手の形をくずすねらいなの。'],
    back: ['後ろの段の駒を出して、前の駒をうしろから支える手。', '後ろの段から駒を出す手。ただ、後ろの段を空けすぎると相手にキングになられやすいから注意なんだ。', '控えの駒を前線へ送る手！ 前の駒に後ろ盾ができるの。', '最後の段の駒にも出番が来たね！ 前線に加わって、数で押せるカニ。', 'いちばん奥の駒を動かす手。1つだけ出して、残りの駒でキングを防ぐの。'],
    center: ['駒を盤の真ん中へ進める手。真ん中をおさえると、動ける道が広がるんだ。', '中央に駒を出す手！ 相手の駒の通り道をじゃまできるの。', '真ん中を取りにいく手。チェッカーでも中央は大事なんだカニ。', 'まん中のマスへ一歩！ ここに立つ駒は、左右どちらにも進めるね。', '中央へ駒を集める手。まん中に駒が多いほうが戦いやすいカニ！', '盤のまん中に陣取る手だね。相手は前へ出にくくなるカニ。', '中央の空きマスを先に使う手！ 相手にそこを取らせないんだ。', 'まん中で仲間と並ぶ手。並んだ駒は、おたがいを守り合えるカニ。'],
    edge: ['盤の端へ寄せる手。端の駒は跳び越えられないから、安全なんだ。', '端の駒を動かして、形をくずさずに進める手。相手にすきを見せないの。', '端のすじを進める手だカニ。横に相手がいないから、取られる心配が少ないね。', 'へりに沿って進む手！ ここなら跳び越えられる向きがないの。', '端っこを使う手。ちょっと地味だけど、守りがかたい進め方だカニ。'],
    dev: ['駒を進めて、形を整える手だカニ。', '仲間の駒とくっつくように進める手なの。', 'すぐ後ろが空かないように、駒を進めておく手！', '駒どうしを斜めにつなげて進む手。つながった駒は取られにくいカニ！', 'あわてず一歩進める手。形がくずれないのがいちばんなの。', '次の動きにそなえて、駒の位置を整える手だカニ！'],
  };
  const CK_SHORT = { gambit: ['1枚差し出して形を先に作れる', '損を承知で陣形を整えられる'], win: ['勝ちが決まる', '相手を動けなくできる'], shot: ['取らせてから跳び返して得をする', '捨てた分より多く取り返せる', '相手に取らせたあと跳び返せる', 'えさの駒で相手をさそい出せる', '取るしかない相手を逆に跳び越せる'], recap: ['駒の数をそろえられる', '取られた分を取り戻せる'], cap: ['取ったあとも取り返されない', '安全に1枚取れる'],
    xchg: ['ルールどおり取って交換にできる', '取り合いをおあいこにできる'], crown: ['キングになれる', '後ろにも動ける駒が作れる'], save: ['ねらわれた駒を守れる', '取られそうな駒を助けられる'], trade: ['交換で形を整えられる', '取り合いで相手の形をくずせる', '盤をすっきりさせられる'],
    back: ['前の味方を支えられる', '控えの駒を戦いに加えられる', '奥の駒も戦力にできる', '守りの駒を前線に回せる'], center: ['中央をおさえられる', 'まん中で動ける道が広がる', '相手が前へ進みにくくなる', '相手より先にまん中に立てる'], edge: ['端で安全に駒を進められる', '跳ばれる心配なく進める', 'へりで守りをかためられる'], dev: ['形をくずさずに進められる', '駒どうしがつながる', 'すきを作らずに前へ出られる'] };
  const ckSh = (kd, n, V) => { const A = CK_SHORT[kd] || CK_SHORT.dev; if (!V) return A[n % A.length]; const c = V.sh || (V.sh = {}); c[kd] = (c[kd] || 0) + 1; return A[(n + c[kd]) % A.length]; };   // (V: each use moves on, so one opening does not say the same phrase three times)
  const ckRot = (A, o) => A.map((_, q) => A[(o + q) % A.length]);
  function ckWhyJa(F, k, V) { const L = CK_WHY[F.k] || CK_WHY.dev; return V ? xqPick(V, ckRot(L, k)) : L[k % L.length]; }
  const CK_HINT = { gambit: ['1枚取らせてでも、形を作りにいく手があるかも？', '駒を差し出す、思い切った手も考えてみて！'], win: ['相手を動けなくする手、ないかな？', '一気に決められる手がありそう！', 'とどめを刺せる駒、さがしてみて！'], shot: ['わざと取らせたら、そのあと跳び返せる道はない？', '損して得とれ！ 取らせてから跳び返す手、さがしてみて。', '捨て駒から始まる跳び返しを見つけよう！', '相手が取るしかない場面を、自分で作ってみよう！', 'わざと駒を差し出したら、相手の駒はどこに着地する？'],
    recap: ['取られた分、取り返せる駒はどれ？', 'まずは駒の数をそろえよう！', 'さっき跳んできた相手の駒、そのままでいいかな？'], cap: ['取るのは義務。どの取り方なら、取り返されずにすむ？', '取り方がいくつかあるね。着地したあと安全なのはどれ？', '着地したマスの、まわりも見てから選んでみて！'],
    xchg: ['取るのは義務。どの駒で取るのがいい？', '取り方を選べるときは、そのあとの形も考えてみて！', '取ったあとの取り返しまで、読んでみよう！'], crown: ['いちばん奥の段まで、あと一歩の駒がいるね！', 'キングになれる駒、さがしてみて！', '王冠に手が届きそうな駒、いないかな？'],
    save: ['いま、跳び越えられそうな駒はない？', '相手が取りにきそうな駒、守ってあげて！', '相手の番になったら、どの駒が危ない？'], trade: ['駒をぶつけて交換にいく手も考えてみて。', '1枚取らせて1枚取り返す、そんな手がありそう！', '相手の駒の前へ出たら、取り合いはどうなる？', '取らせても、すぐ取り返せるマスはないかな？'],
    back: ['後ろの段の駒にも、そろそろ出番があるかも？', '前の駒を、うしろから支えてあげよう！', 'いちばん奥の段で休んでいる駒、いないかな？', '控えの駒を前に出すタイミングかも！', '後ろの段のどの駒なら、出しても守りがくずれない？'],
    center: ['盤の真ん中、空いているマスはない？', '中央へ進める駒をさがしてみて！', '真ん中をおさえる手がありそう！', 'まん中のマスに先に入れる駒はどれ？', '相手が出てきにくくなる、まん中の一歩は？'],
    edge: ['盤の端は跳び越えられない、安全な場所なんだ。', '端の駒の使い道も考えてみて！', 'へりのすじに、進められる駒はない？', '取られる心配のない進み方、さがしてみて！'],
    dev: ['動かした先の「すぐ後ろ」が空かないか、確かめてみて。', '形をくずさない手をさがしてみよう！', '仲間とつながったまま進める駒はどれ？', 'あわてない一歩、どの駒で指す？'] };
  function ckHintJa(F, k, V) {
    const H = CK_HINT[F.k] || ['金の丸の駒で、いちばん働く場所を考えてみて。'];
    const h = V ? xqPick(V, ckRot(H, k)) : H[k % H.length], t = k % 3 === 1 ? (V ? xqPick(V, ckRot(['金の丸が動かす駒だカニ。', '金の丸がついた駒に注目！', '金の丸の駒から考えてみて。'], k)) : '金の丸が動かす駒だカニ。') : '';
    return xqJoin(h, t);
  }
  function ckOpVoice(id) {   // (2026-11-23 lesson loop) one opening's voice: praise / soft words / push / lead in an order of its own, and the lines already said
    const seed = shSeed('ck' + id), O = CKJ_OP, pc = shPerm(seed, O.cheer.length), ps = shPerm(seed ^ 0x9e37, O.soft.length), pp = shPerm(seed ^ 0x51ed, O.push.length), pl = shPerm(seed ^ 0x2b7f, O.lead.length), pr = shPerm(seed ^ 0x6c1d, O.pr.length), pa = shPerm(seed ^ 0x1f3b, O.ask.length);
    return { cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]], lead: i => O.lead[pl[i % pl.length]], pr: i => O.pr[pr[i % pr.length]], ask: i => O.ask[pa[i % pa.length]], used: new Set(), seed };
  }
  function ckOpJa(E, P, name, k, ck, V, i) {   // ck(k): the move named by its arrow; V: the opening's voice (ckOpVoice), i: the problem's number
    V = V || ckOpVoice(name); i = i || 0;
    const pos = E.Pos.from(P.s), A = P.best, sc = new Map(P.sc || []), best = sc.has(A) ? sc.get(A) : Math.max(...(P.sc || [[0, 0]]).map(x => x[1]));
    const FA = ckFacts(E, pos, A), M = ck('ok'), X = ck('ng'), f = s => s.replace(/\{m\}/g, M).replace(/\{x\}/g, X);
    const ask = i === 0 ? CKJ_OP.askN.replace('{n}', name) : V.ask(i), j = i + V.seed % 7, sh = ckSh(FA.k, j, V), sh2 = ckSh(FA.k, j, V);
    // the praise: the cheer, why — in words the line's notes have not used — and now and then a push on
    let why; { const L = CK_WHY[FA.k] || CK_WHY.dev, fresh = L.filter(x => xqSn(x).every(y => !V.used.has(y.trim())));
      why = fresh.length ? ckWhyJa(FA, j, V) : xqPick(V, [0, 1, 2, 3, 4, 5].map(q => V.pr(i + q).replace('{a}', sh2))); }
    if (FA.thrAfter && !FA.win) why = xqJoin(why, xqPick(V, ckRot(['しかも次に跳び越えるねらいもあるカニ！', 'おまけに、次は相手の駒を跳べる形！', 'そのうえ相手の駒をひとつ、ねらっているね。'], j)));
    const pu = i % 2 ? [0, 1, 2].map(q => V.push(i + q)).find(x => xqEnd(xqSn(x)[0]) !== xqLastEnd(why)) || V.push(i) : '', goodTx = xqJoin(V.cheer(i), why, pu);
    const good = u => { if (u != null && u !== A && sc.has(u)) return f(best - sc.get(u) <= 6 ? xqJoin(V.cheer(i), '{x}もいい手だカニ！ {m}と同じくらいよく働くの。') : xqJoin('悪くない手だね！', `でも{m}なら${sh2}から、そっちが本筋なの。`));
      return goodTx; };
    const ng = u0 => {
      let u = u0; if (u == null || u === A) u = ((P.sc || []).find(x => x[0] !== A && best - x[1] > 6) || (P.sc || []).find(x => x[0] !== A) || [])[0];   // (no move given: a real miss, as the tool asks)
      const pk = A0 => xqPick(V, ckRot(A0, j));
      const out = [V.soft(i), V.lead(i), pk(CKJ_OP.so.map(x => x.replace('{a}', sh)))];
      if (u == null) return f(xqJoin(...out));
      let F = null; try { F = ckFacts(E, pos, u); } catch (e) {}
      const d = sc.has(u) ? best - sc.get(u) : null, n0 = out.length;
      if (F) {
        if (FA.win && !F.win) out.push('{x}だと、せっかくの勝ちを見のがしちゃう。');
        else if (F.net < FA.net && F.capN && F.net < F.capN) out.push(pk(['{x}の取り方だと、着地した駒を取り返されちゃう！', '{x}で取ると、着地したところをすぐ跳び返されるの。']));
        else if (F.net < FA.net && F.capN && F.capN < FA.capN) out.push(`{x}の取り方だと、取れるのは${F.capN}枚だけ。{m}なら${FA.capN}枚取れるの。`);   // (2026-11-24: fewer pieces, not taken back)
        else if (F.net < FA.net && F.net <= -2) out.push(`{x}だと、相手に連続で跳ばれて${-F.net}枚も取られちゃう！`);
        else if (F.net < FA.net && F.net < 0) out.push(pk(['{x}だと、駒をタダで跳び越えられちゃう！', '{x}では、動かした駒の後ろが空いて、ただで取られるの。']));
        else if (F.net < FA.net) out.push(pk(['{x}だと、取らせて跳び返すチャンスを見のがしちゃう。', '{x}では、相手に取らせて跳び返す形にならないの。', '{x}だと駒をぶつけないから、相手の駒を跳び越すチャンスが消えちゃうカニ。', '{x}を選ぶと、いまだけのショットが打てなくなるの。']));
        else if (FA.crown && !F.crown) out.push('{x}だと、キングになるチャンスを逃しちゃう。');
        else if (FA.save && !F.save) out.push('{x}だと、ねらわれた駒を守れないの。');
        else if (F.back && !FA.back) out.push(pk(['{x}だと、後ろの段に穴があいて、相手にキングになられやすくなるんだ。', '{x}は後ろの段の守りの駒を動かす手。奥にすきができるから、相手の駒が成りこみやすくなるカニ。', '{x}だと奥の段が手うすになって、キングへの道を相手に開けちゃう。']));
        else if (FA.trade && !F.trade) out.push(pk(['{x}だと、交換で形を整えるチャンスがなくなるの。', '{x}では駒がぶつからないから、相手は自由に形を整えられちゃう。', '{x}だと取り合いが起きないまま、相手のペースで進んじゃうカニ。']));
        else if (FA.thrAfter && !F.thrAfter) out.push(pk(['{x}だと、相手の駒をねらう形が作れないの。', '{x}では、次に跳び越えるねらいが生まれないカニ。']));
        else if (FA.center && F.edge) out.push(pk(['{x}は端へ寄る手。安全だけど、まん中を相手に先に取られちゃう。', '{x}だと駒が端へ行って、中央が相手のものになりやすいの。']));
        else if (FA.center && !F.center && !F.capN) out.push(pk(['{x}だと、中央への進出が遅れちゃう。', '{x}では、まん中のマスを相手にゆずることになるの。', '{x}だと、まん中が空いたままで、相手に先に入られちゃう。', '{x}では中央の駒が足りなくなって、相手に押しこまれるカニ。']));
        else if (F.k !== FA.k && CK_SHORT[F.k]) out.push(pk([`{x}だと${ckSh(F.k, j, V)}けど、いまはそれより急ぐ手があるの。`, `{x}も${ckSh(F.k, j, V)}手。だけど、この場面では一歩おそいカニ。`, `{x}なら${ckSh(F.k, j, V)}。ただ、それだと先にやるべきことが後回しになるの。`, `{x}で${ckSh(F.k, j, V)}のは、あとからでも間に合うんだ。`, `{x}だと${ckSh(F.k, j, V)}。でも、それはもう少しあとの話だカニ。`]));
      }
      if (out.length === n0) { const g2 = ckOppShot(E, pos, u);   // (2026-11-24 第2期) the opponent's shot that your move allows, from the board
        if (g2 > 0) out.push(pk([`{x}だと、相手がわざと駒を取らせてから跳び返す「ショット」を打てるの。差し引き${g2}枚の損になっちゃう！`, `{x}のあとは、相手に「ショット」があるカニ。1枚取らされたあと連続で跳ばれて、差し引き${g2}枚へっちゃう。`])); }
      if (out.length === n0) out.push(d != null && d <= 6 ? pk(['{x}も悪くないけど、定跡の本筋はこっちなの。', '{x}もありだけど、よく指されるのはこっちだカニ。']) : pk(CKJ_OP.gap));   // (2026-11-22: no "the AI says" — the right move's aim)
      return f(xqJoin(...out));
    };
    return { ask, hintTx: ckHintJa(FA, k, V), good, ng, own: true };
  }
  function ckNotesJa(E, g, notes, V) {   // the line's notes in チェッカニ's words (3D, ja), rebuilt from the board; each line said once
    const out = {}, cnt = {}; let pos = E.Pos.from(null), prev = null;
    g.study.line.forEach((m, i) => { const o = notes[String(i)];
      let F = null; try { F = ckFacts(E, pos, m, prev); } catch (e) {}
      if (F) { cnt[F.k] = (cnt[F.k] || 0) + 1;
        let s = CK_SIDE(F.side) + '：' + ckWhyJa(F, cnt[F.k] + g.id.charCodeAt(1), V);
        if (i === 0) s = `『${(g.title || {}).ja || ''}』のはじまり！ ` + s;
        out[String(i)] = { ja: s }; }
      else if (o) out[String(i)] = o;
      prev = m; pos = pos.clone().play(m); });
    return out;
  }
  /* (2026-11-22 lesson loop) the checkers lessons in チェッカニ's words, Japanese, for the 3D table (no square numbers): a short intro
     per step (the first says what the game is and how it is won), five questions and five hints per step, and after the answer the
     praise with why (from the board: the edge / the square behind filled / no piece near, the capture kept, the jumps counted, the crown
     safe, the threatened piece fled or the landing square blocked, the opponent left without a move, the shot's gain, the opponent's shot
     stopped, the endgame database's result CK_EG) or, for a miss, the green arrow's move and what yours gives up (a piece jumped for
     nothing, the capture taken back, fewer jumps, no crown, the opponent still able to move, the shot missed / suffered, the win or the
     draw lost). Cheers the player on (CK_CH) and words each problem differently. */
  const CK_EG = {   // the endgame lessons' wrong moves: the database's result for the side to move (d = only a draw, l = a loss) — tools/lesson-verify.js checkers re-solves them
    '........................W.BW.B..2': '25-29:d 25-21:d 25-22:d 28-24:l', '...............B....W.....W.B...2': '21-25:l 21-17:d 27-31:d 27-32:d', '..BB...W.W......................2': '8-11:d 10-14:l 10-15:l 10-6:l 10-7:l', '............B..W......WB........1': '13-17:d 13-9:d 24-27:l 24-28:d 24-20:d', '..B..W.................W......B.2': '6-1:d 24-27:l 24-28:d 24-19:d 24-20:d',
    '...W.......B.....b.w............1': '12-16:l 12-8:l', '..WB......b.......w.............2': '3-8:l 19-15:l 19-16:l', '..............w.b...b.........W.2': '15-10:d 15-11:d 31-27:d', '............b......b..W..W......2': '23-18:d 26-30:d 26-22:d', '............b....W....w......B..2': '18-14:d 18-15:d 23-19:d',
    '....B..b.....w.........W........1': '5-9:l 8-11:l', '...B..W........B..........w.....1': '16-19:l 16-20:l 16-11:l', '................w........w.b..B.2': '17-13:l 17-14:l 26-22:l', '............Wb.w.......B........1': '14-17:l 24-19:l 24-20:l', '........B..W..............b....W1': '9-13:l 9-14:l 9-5:l 9-6:l' };
  const CK_DC = [0, 4, 27, 31];   // the double corners' squares (1, 5, 28, 32)
  const CKJ_LS = {
    intro: {
      b_move: 'ぼくはチェッカニ！ チェッカーは、駒を斜めに進めて、相手の駒を跳び越えて取るゲームだカニ。相手の駒を全部取るか、動けなくしたら勝ち！<br>最初は取られない進み方の練習。進んだマスの裏側が空いていると、跳び越えられちゃうの。',
      b_jump: '取れる駒があるときは、必ず取るのがルール。でも、どの駒で取るかは選べるカニ！<br>せっかく取っても、すぐ取り返されたら得が帳消し。着地した先が安全かを見て選ぼう。',
      b_multi: '跳び越えた先から、さらに跳べるなら続けて何枚も取れるの。これが気持ちいいカニ！<br>取り方が何通りかあるときは、好きな道を選べる。ここでは、いちばんたくさん取れる道を探してみて。',
      b_king: 'マンが相手側のいちばん奥の段に着くと、キングに成れる！ 後ろにも動ける強い駒で、ぼくの背中の王冠とおそろいなの。<br>ただし、成ったとたんに取られないかも確かめるカニ。',
      b_safe: '相手の番になったら取られちゃう駒、見つけられる？<br>守り方は3つ。逃げる、跳ばれる先のマスをふさぐ、取られても取り返せる形にする。どれが使えるか考えるカニ！',
      b_win: '相手の駒を全部取るか、1手も動けない形にしたら勝ち！ 駒が残っていても、動かせなければ負けなの。<br>ここでは、1手で勝負を決める手を探すカニ。',
      t_shot1: 'いよいよ大事な戦術「ショット」だカニ！<br>わざと1枚取らせると、取るのは義務だから相手の駒が動く。そのあと連続で跳び返して、1枚捨てて2枚取るの。',
      t_shot2: 'ちょっと長いショットに挑戦！<br>捨てた駒を相手が取ると、相手の駒はどこに着地する？ その着地点から、自分の連続取りがつながるかを読むカニ。',
      t_defend: '今度は守る側。相手にショットのねらいがあって、たいていの手は駒損になっちゃう局面なの。<br>指す前に「このあと捨て駒の一手はない？」と確かめて、ただ一つの受けを探すカニ！',
      t_best: '終盤に近い局面で、ほかよりはっきり良い手が一つだけある問題だカニ。<br>キングを作る、相手の駒を止める、交換で得をする。どれが決め手になるか、じっくり考えてみて！',
      e_kings: 'キングどうしの終盤！ 勝てる局面でも、勝ちを保てる手は少ないことがあるの。<br>相手のキングを、角の二重コーナーへ逃がさないのがコツだカニ。答えは終盤のデータベースで確かめてある！',
      e_men: 'マンが残った終盤は、どっちが先にキングになるかの競争！ 相手のマンを止める位置取りも勝負を決めるカニ。<br>答えは終盤のデータベースで確かめてあるから、安心して考えてみて。',
      e_draw: '不利な局面でも、正しく指せば引き分けにできることがあるの。負けを避ける手は、たいてい一つか二つだけ！<br>キングは角の二重コーナーに逃げこむと粘りやすいカニ。あきらめずにいこう！',
    },
    ask: {
      b_move: ['相手にタダで取られないように、駒を1つ進めてみて！', '取られない進み方はどれかな？', 'すぐ後ろが空かない手、見つけられる？', '安全に進める駒はどれだと思う？', '跳び越えられない場所へ、1マス進めるカニ！'],
      b_jump: ['いちばん得をする取り方、選べるかな？', '取ったあとに安全なのは、どの取り方？', 'どの駒で取るのがいちばん得かな？', '着地した先が安全な取り方、わかる？', '取り返されずにすむ取り方を探すカニ！'],
      b_multi: ['いちばんたくさん取れる道を選んでみて！', '続けて跳んで、何枚取れるかな？', 'いちばん長い連続ジャンプはどれ？', '取れる枚数がいちばん多い手、見つけられる？', '跳んで跳んで、たくさん取っちゃうカニ！'],
      b_king: ['マンをキングにしてみて！ 取られないようにね。', 'キングに成れる駒はどれかな？', '王冠をかぶれる手、見つけられる？', '奥の段まで進んで、安全にキングになる手は？', 'キングになるチャンス、逃さないでカニ！'],
      b_safe: ['ねらわれた駒を、タダで取られないようにしよう！', '取られそうな駒、どうやって守る？', '損をしない手はどれかな？', '相手の取るねらい、先にかわせる？', '逃げる？ ふさぐ？ 守り方を選ぶカニ！'],
      b_win: ['1手で勝っちゃおう！', '相手を動けなくする手、わかる？', '勝負を決める一手はどれかな？', '全部取る？ それとも動けなくする？', 'この1手で決着をつけるカニ！'],
      t_shot1: ['駒得になるショットを探してみて！', '1枚捨てて2枚取る手、見つけられる？', 'わざと取らせる手はどれかな？', '取らせて跳び返す、ショットの1手目は？', 'ショットを決めちゃうカニ！'],
      t_shot2: ['駒得につながる手順の、1手目は？', '相手の着地点を読んで、ショットを決めて！', '捨てる駒はどれがいいかな？', '長いショットの始まりの手、わかる？', '3手先まで読んで、駒得する手を探すカニ！'],
      t_defend: ['損をしない、ただ一つの受けは？', '相手のショットをかわす手はどれかな？', '捨て駒の一手を許さない手、見つけられる？', 'ここは守りどころ。正しい受けは？', '相手のねらいを先に消す手を探すカニ！'],
      t_best: ['いちばん良い手を探してみて！', '頭ひとつ抜けた一手はどれかな？', 'この局面の決め手、わかる？', '勝負を分ける一手はどれだと思う？', '決め手をズバッと指すカニ！'],
      e_kings: ['勝ちを保つ手を指してみて！', '相手のキングを逃がさない手はどれかな？', '勝ちをキープできる手、わかる？', '二重コーナーに逃がさない一手は？', 'キングで追いつめる手を探すカニ！'],
      e_men: ['勝ちへ近づく手はどれ？ 指してみて！', 'キング競争に勝てる手はどれかな？', '相手のマンを止めつつ進む手、わかる？', '勝ちへの一手はどれだと思う？', '位置取りで差をつける手を探すカニ！'],
      e_draw: ['負けない手、引き分けにできる手を指してみて！', '負けを避ける手はどれかな？', '粘って引き分けに持ちこむ一手は？', 'ここで踏んばれる手、わかる？', 'あきらめずに、引き分けの道を探すカニ！'],
    },
    hint: {
      b_move: ['動かした先の「すぐ後ろ」が空いていないか、見てみて。', '盤の端は跳び越えられない、安全な場所なの。', '相手の駒が斜め前にいるマスは要注意！', '後ろに味方がいれば、跳び越えられないカニ。', '相手の駒から離れたマスなら、まず安心。'],
      b_jump: ['着地したマスのまわりに、相手の駒はいない？', '取ったあと、相手の番になったつもりで考えてみて。', '取り方ごとに、着地点の安全をくらべるカニ。', '取り方は1つじゃない。全部くらべてみてね！', '跳んだ先のすぐ後ろが空いていると、取り返されちゃう。'],
      b_multi: ['跳んだ先から、もう一度跳べないか見てみて。', '着地したマスから、さらに続く道をたどるカニ。', '着地するたび、斜めのとなりに相手の駒はいない？', '向きを変えて跳べることもあるの！', 'いちばん遠くまで行ける道はどれかな？'],
      b_king: ['奥の段まで、あと1マスの駒がいる！', '成ったあと、すぐ取られないマスを選んでみて。', 'マンは前にしか進めない。奥の段に近い駒はどれ？', '着いたマスの斜めのとなりに、相手の駒はいない？', '王冠まであと一歩の駒を探すカニ！'],
      b_safe: ['いま跳び越えられそうな駒はどれ？', '跳ばれる先のマスをふさぐ手もあるの。', '取られても、すぐ取り返せる形なら損はしないカニ。', '逃げた先でまた取られないか、確かめてみて。', '相手の番になったつもりで、取れる駒を探してみて！'],
      b_win: ['相手が動かせる駒、全部数えてみて！', '相手の駒の進む先をふさぐ手もあるの。', '全部取り切れる道はない？', '相手の最後の駒をねらえる駒はどれだカニ？', 'この手のあと、相手に動ける手が残るか見てみて。'],
      t_shot1: ['わざと取らせたら、相手の駒はどこに着地する？', '取られるマスへ、あえて進めてみるカニ。', '相手の取る手は決まっている。それを利用するカニ！', '着地点の先に、もう1枚取れる駒が並ぶかな？', '損して得とれ！ 先に1枚あげちゃおう。'],
      t_shot2: ['一見タダで取られる手が、じつは正解かもカニ。', '捨てる → 相手の着地点 → 自分の取る道、の順に読んでみて。', '相手の駒が着地したら、2回以上跳べる？', '捨てる駒の場所で、相手の着地点が決まるの。', '相手に取らせたあとの盤を想像してみて！'],
      t_defend: ['この手のあと、相手に捨て駒の一手はない？', '相手の連続取りの道、先にふさげない？', '相手に「取らされる」形にならない手を探すカニ。', '1手ずつ「相手の番になったら？」と確かめてみて。', '何気ない手ほど危ないの。相手のねらいを読んでみて！'],
      t_best: ['キングを作る手、相手を止める手、交換の手…どれかな？', 'いちばん働く駒はどれか、考えるカニ。', '相手の駒の進む道もよく見てみて。', 'タダで取られる駒が出ないかも確かめてね。', '先に成った方が有利になりやすいの！'],
      e_kings: ['相手のキングを二重コーナーへ行かせないで！', '勝ちを保てる手は、じつは少ないカニ。', '相手のキングの逃げ道を数えてみて。', 'キングをタダで取られないマスを選んでね。', '2枚のキングで、はさむように追いつめよう！'],
      e_men: ['どっちが先にキングになれるか、手数を数えてみて！', '相手のマンの進む先、おさえられない？', '先にキングになれば、ぐっと有利になるカニ。', '取られる形にならないかも確かめてね。', 'キングとマン、どの駒を動かすのがいいかな？'],
      e_draw: ['キングは二重コーナーに逃げこむと粘りやすいの。', '引き分けで十分！ 守りに徹するカニ。', 'タダで取られる駒を出さないようにね。', '相手のマンをキングにさせない手はある？', 'あきらめないで！ 負けない手は一つか二つだけ。'],
    },
  };
  const CK_CH = {
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちり！', 'やったね！', 'いい目してるカニ！', 'すごいすごい！', 'そうそう、それ！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', 'その勢いで次のレッスンへ！'],
    soft: ['大丈夫！', 'ドンマイだカニ！', 'あと少しだったね！', '気にしない、気にしない！', 'あと一歩カニ！', '平気、平気！', 'よくある見落としだよ。', 'いっしょに見てみよう！'],
    tail: [null, null, 'これで覚えちゃおう！', null, '次はきっと見つけられるカニ！'],
    right: ['{m}なら、{a}の。', '{m}が正解！ {a}カニ。', 'ここは{m}。それなら{a}から！', '{m}を見て。あの手なら{a}の！', '答えは{m}だった。{a}んだ。'],
    why: ['{a}！', 'その手なら{a}の。', '{a}カニ！', 'ほら、{a}でしょ？', 'これで{a}んだ。'],
    you: ['{x}だと、{b}。', 'きみの{x}は、{b}の。', '{x}では{b}！', '{x}を指すと、{b}。', '{x}だと{b}んだ。'],
  };
  function ckLF(E, pos, m) {   // ckFacts + what the lessons need
    const F = ckFacts(E, pos, m), after = pos.clone().play(m), me = pos.side, t = E.mTo(m), f = E.mFrom(m), opp = me ? 1 : 2;
    F.after = after; F.oppN = after.moves().length; F.oppLeft = after.count(opp); F.t = t;
    // the moved piece's safety: on the edge / the square behind filled / no opponent piece next to it
    let near = false, blocked = true;   // (near: an opponent piece next to it that could jump it that way — its men only forward)
    for (let d = 0; d < 4; d++) { const n = E.NB[d][t]; if (n < 0) continue; const v = after.at(n); if (!v || (v <= 2) === (me === 0)) continue;
      const kg = v === 2 || v === 4, jd = 3 - d; if (!kg && (v <= 2 ? jd >= 2 : jd < 2)) continue;
      near = true; const back = E.NB[jd][t]; if (back >= 0 && !after.at(back)) blocked = false; }
    F.near = near; F.blocked = blocked;
    F.fled = (() => { const q = pos.clone(); q.side ^= 1; q.rehash(); return q.caps().some(c => E.mCap(c) & E.bit(f)); })();
    F.plug = (() => { const q = pos.clone(); q.side ^= 1; q.rehash(); return q.caps().some(c => E.mTo(c) === t); })();
    // the opponent's best answer: a quiet sacrifice that wins pieces back (a shot), a crowning, a king into a double corner
    F.oppShot = 0; if (!after.caps().length && F.oppN) for (const r of after.moves()) { try { const G = ckFacts(E, after, r); if (G.net > F.oppShot) F.oppShot = G.net; } catch (e) {} }
    F.oppCrown = after.moves().some(r => after.promotes(r));
    F.oppDC = after.moves().some(r => CK_DC.includes(E.mTo(r)) && (after.at(E.mFrom(r)) === 2 || after.at(E.mFrom(r)) === 4));
    F.tDC = CK_DC.includes(t);
    return F;
  }
  function ckLsJa(E, s, P, i) {
    const id = s.id, pos = E.Pos.from(P.s), ok = P.ok || [P.best], A = P.best, k = i % 5, name = m => E.name(pos, m);
    const si = Math.max(0, ((CHECKERS.data && CHECKERS.data.ls.steps) || []).indexOf(s)), o8 = si % 8 + i * [1, 3, 5, 7][(si >> 3) % 4];   // (the praise / soft openers in a different order in each lesson)
    const sc = new Map(P.sc || []), best = P.sc ? Math.max(...P.sc.map(x => x[1])) : 0;
    const FA = ckLF(E, pos, A), M = CKM('ok', 'ja'), X = CKM('ng', 'ja'), pk = (L, j) => L[((j % L.length) + L.length) % L.length];
    const eg = {}; String(CK_EG[P.s.b + P.s.side] || '').split(' ').filter(Boolean).forEach(x => { const [a, b] = x.split(':'); eg[a] = b; });
    const wrongOf = u => { if (u != null && !ok.includes(u) && pos.moves().includes(u)) return u;   // (no move given, or a right one: a typical miss, as the tool asks)
      const L = pos.moves().filter(m => !ok.includes(m)); if (P.sc) { const v = P.sc.filter(x => !ok.includes(x[0]) && best - x[1] > 6); if (v.length) return v[Math.min(v.length - 1, k % 2)][0]; } return L[k % Math.max(1, L.length)]; };
    const deg = d => CKJ_OP.deg(d);
    // why the right move works (a: a short plain clause, the variant j)
    const why = (F, j) => {
      const n = F.capN, g = F.net;
      switch (id) {
        case 'b_move': return F.edge ? pk(['端のマスなら跳び越えられない', '盤の端は跳ばれる心配がない', '端っこは安全地帯', '端に寄せれば向こう側にマスがない', '盤のふちなら跳び越す先がない'], j)
          : F.trade ? pk(['取られても、すぐ取り返せる', '1枚取られても取り返せて損がない', '取り合いになっても五分', '相手が取ったら、こっちも取り返せる', '取られた分はすぐ取り戻せる'], j)
          : F.near && F.blocked ? pk(['すぐ後ろがふさがっていて跳べない', '跳ぶ先のマスが空いていない', '後ろが埋まっていて取られない', '背中のマスに駒がいて、跳び越せない', '着地するマスがないから跳ばれない'], j)
          : pk(['跳び越えてくる相手の駒がいなくて安全', 'ねらってくる相手の駒がいないから取られない', '相手の駒に跳ばれる心配がない', 'となりに危ない駒がいない', 'そこまで届く相手の駒がない'], j);
        case 'b_jump': return pk(['取ったあとも取り返されない', '着地した駒が安全なまま', `${g >= 2 ? g + '枚' : '1枚'}まるまる得できる`, '着地点のまわりに危険がない', '取ったあと相手にお返しされない'], j);
        case 'b_multi': return pk([`続けて跳んで${n}枚も取れる`, `${n}枚まとめて取れる`, `${n}枚取りの大ジャンプになる`, `一気に${n}枚も持っていける`, `連続ジャンプで${n}枚ゲットできる`], j);
        case 'b_king': return pk(['キングになれて、すぐには取られない', '王冠をかぶって、しかも安全', '安全なマスでキングに成れる', '成った駒をねらう相手がいない', '成ったあとも跳び越えられない'], j);
        case 'b_safe': return F.fled ? pk(['ねらわれた駒が逃げられる', '取られそうな駒を安全な所へ逃がせる', '危ない駒をさっと逃がせる', 'ねらいの駒がいなくなって、相手は取れない', '逃げた先でも跳ばれない'], j)
          : F.plug ? pk(['跳ばれる先のマスをふさげる', '相手の着地点を先にうめられる', '跳ぶ先をふさいで取らせない', '着地するマスがなくなって相手は跳べない', '空きマスをうめて、取りを止められる'], j)
          : pk(['相手が取っても、すぐ取り返せる', '取り合いで損をしない形になる', '取られても取り返せる形になる', '取られた分を取り戻せる', '相手が取ればお返しできる'], j);
        case 'b_win': return F.oppLeft === 0 ? pk(['相手の駒を全部取り切れる', '最後の駒まで取れる', '相手の駒がひとつも残らない', '盤の上から相手がいなくなる', '残りの駒をまとめて取れる'], j)
          : pk(['相手がもう1手も動けない', '相手の進む先が全部ふさがる', '相手は動かせる手がなくなる', '相手の駒が身動きできなくなる', '相手に指せる手がひとつも残らない'], j);
        case 't_shot1': case 't_shot2': return F.shot ? pk([`1枚取らせたあと跳び返して、差し引き${g}枚の得`, '取らせてから跳び返す、ショットが決まる', `捨てた分より${g}枚多く取り返せる`, `相手が取ったあとに連続取りで${g}枚の得`, 'わざと渡した1枚が、倍になって返ってくる'], j)
          : pk(['相手の取る手を利用して、駒得の手順に入れる', '捨て駒からの手順で駒得できる', '相手の駒を、こっちの取りやすい所へ呼びこめる', '相手は取るしかなくて、そこから得をする', '一手ずつ追いこんで、駒得の始まりになる'], j);
        case 't_defend': if (P.sc && P.sc.every(x => x[0] === A || x[1] < -(CK_WINT - 1000))) return pk(['負けを避けられる、ただ一つの手になる', 'ほかの手はどれも負け。これだけが助かる', '負けの道をひとつだけ抜けられる', '相手の勝ち筋をただ一つ消せる', '負けずにすむ道に入れる'], j);
          return F.oppShot <= 0 ? pk(['相手のショットが決まらなくなる', '捨て駒の一手を先に消せる', '相手の連続ジャンプを先に封じられる', '捨て駒をされても困らない', '相手のねらいが空振りになる'], j)
          : pk(['損をいちばん小さくできる', 'ほかの手より被害が少ない', '傷を浅くすませられる', 'いちばんましな受けになる', '損を最小限におさえられる'], j);
        case 't_best': return F.win ? pk(['相手を動けなくして勝ちが決まる', '一気に勝負を決められる', 'これで相手は動けない', 'そのまま勝ちになる', '決着がつく'], j)
          : F.crown ? pk(['キングに成って一気に有利になる', '先に王冠をかぶって主導権をにぎれる', 'キングを作って、戦いがぐっと楽になる', '奥の段に着いて強い駒が増える', '後ろにも動ける駒が手に入る'], j)
          : F.shot ? pk(['取らせて跳び返して駒得できる', 'ショットで駒得になる', '捨て駒から得をする手順に入れる', '1枚あげて、それ以上取り返せる', '相手の取りを利用して得をする'], j)
          : F.capN ? pk(['取り返されない取り方で得をする', 'いちばん得な取り方ができる', '取ったあとも駒が安全', '取ってもお返しされない', '得をしたまま形を保てる'], j)
          : P.sc && P.sc.filter(x => x[0] !== A && x[1] < -(CK_WINT - 1000)).length * 2 >= P.sc.length - 1 ? pk(['負けにつながる落とし穴をよけられる', '負けの落とし穴をよけて進める', 'ちゃんと負けから逃れられる', '負けにつながる手を全部よけられる', '負けの道を避けて踏みとどまれる'], j)
          : F.oppShot <= 0 && F.net >= 0 ? pk(['相手にショットのすきを作らない', '駒を取られる形を作らずに進める', '相手に跳び越えるチャンスをあげない', '後ろの守りをくずさずに進める', '駒の並びをくずさずに前へ出せる'], j)
          : pk(['損をいちばん小さくできる', 'ほかの手より被害が少ない', 'いちばんましな形で受けられる'], j);
        case 'e_kings': return F.capN ? pk(['相手の駒を取って勝ちを決められる', '取って一気に勝ちに近づける', '駒を取って勝ちを確かにできる', '取って数の差を広げられる', '取れば残りは追いつめるだけ'], j)
          : pk(['勝ちのレールに乗ったまま進める', 'データベースでも勝ちのまま', '勝ちを手放さずにすむ', '相手に逃げ切りを許さない', '勝ちへの道をはずれない'], j);
        case 'e_men': return F.crown ? pk(['先にキングになって競争に勝てる', '王冠を先にかぶって勝ちに進める', 'キングになって一歩リードできる', '先に成って、あとは追いかけるだけ', 'キング競争で先手を取れる'], j)
          : F.capN ? pk(['相手の駒を取って勝ちに近づける', '取って差を広げられる', '駒を取って勝ちを確かにできる', '取れば数で上回れる', '取って相手の手を減らせる'], j)
          : pk(['データベースでも勝ちにつながる', '勝ちの道に乗れる', 'ほかの手では届かない勝ちに届く', '勝ちを手放さずにすむ', '勝ちへの道をまっすぐ進める'], j);
        case 'e_draw': return F.tDC ? pk(['二重コーナーの奥で粘れる', '二重コーナーで守りを固められる', '角の二重コーナーで踏んばれる', '二重コーナーなら追い出されにくい', '角の安全地帯にもぐりこめる'], j)
          : F.capN || F.trade ? pk(['駒を取り合って引き分けにできる', '交換で駒を減らして粘れる', '取り合いで差を消せる', '駒が減って相手が決めきれなくなる', '数の差をなくして粘れる'], j)
          : pk(['負けを避けて引き分けにできる', '最後まで粘って負けを消せる', 'ここで踏んばって負けない', '相手に決め手をあたえない', 'データベースでも引き分けのまま'], j);
      }
      return pk(['いちばんいい形になる', '形をくずさずに進める', '損をしない'], j);
    };
    // what the miss gives up (b: a short plain clause)
    const loss = (F, u, j) => {
      const r = eg[name(u)], n = -F.net, d = sc.has(u) ? best - sc.get(u) : null;
      if (FA.win && !F.win) return F.oppN ? pk([`相手にまだ${F.oppN}通りの手が残っちゃう`, '相手の駒がまだ動けちゃう', `勝負がつかず、相手に${F.oppN}通りの逃げ道が残る`], j) : pk(['勝ちを見のがしちゃう', 'まだ勝負がつかない', '決着が先にのびちゃう'], j);
      if (id === 'b_multi' && F.capN < FA.capN) return pk([`${F.capN}枚しか取れない`, `取れるのは${F.capN}枚だけ`, `${FA.capN}枚取れるところが${F.capN}枚どまり`], j);
      if (id === 'b_king' && !F.crown) return pk(['キングになれない', 'せっかくの王冠のチャンスを逃しちゃう', 'マンのままで終わっちゃう'], j);
      if (F.crown && F.net < 0) return pk(['キングになったとたん取られちゃう', '成った駒をすぐ跳び越えられちゃう', '王冠をかぶった直後に取られちゃう'], j);
      if (F.capN && F.net < FA.net) return F.net < 0 ? pk(['取ったのに取り返されて、かえって損しちゃう', '取り返されて差し引きで損が出ちゃう', '着地した駒ごと取り返されて損になる'], j) : pk(['着地した駒をすぐ取り返されちゃう', '取り返されて、得が帳消しになっちゃう', '取った分をそのまま取り返される'], j);
      if (r === 'l' && F.net < 0) return pk(['駒をタダで取られて、負けになっちゃう', '跳び越えられて、そのまま負け', '駒を取られて、そのまま押し切られて負けちゃう'], j);
      if (r === 'd' && F.net < 0) return pk(['駒をタダで取られて、勝ちが引き分けに変わっちゃう', '跳び越えられて1枚減って、引き分けどまり', '駒を取られて、勝ちが消えて引き分けになっちゃう'], j);
      if (r === 'l' && F.oppCrown) return pk(['相手のマンがキングになって負けちゃう', '相手に王冠を許して負けになる', '相手にキングを作られて押し切られる'], j);
      if (r === 'l') return pk(['相手に追いつめられて負けちゃう', '負けが決まっちゃう', '粘りきれずに負けになる'], j);
      if (r === 'd' && F.oppDC) return pk(['相手のキングに二重コーナーへ逃げこまれちゃう', '相手のキングが二重コーナーで粘れちゃう', '二重コーナーに逃げられて引き分けになる'], j);
      if (r === 'd' && F.oppCrown) return pk(['相手のマンもキングになれて、引き分けどまり', '相手にも王冠を許して引き分けになる', '相手がキングになって追いつけない'], j);
      if (r === 'd') return pk(['勝ちが消えて引き分けになっちゃう', '相手に粘られて引き分けまで', 'データベースでは引き分けどまり'], j);
      if (d != null && sc.get(u) < -(CK_WINT - 1000) && best > -(CK_WINT - 1000)) return pk(['そのまま負けにつながっちゃう', '負けが決まっちゃう', '最後まで指すと負けになっちゃう'], j);
      if (d != null && d < 120 && (F.oppShot > 0 || F.net < 0)) return d > 6 ? (F.oppShot > 0 ? pk([`相手にショットを打たれて${F.oppShot}枚損しちゃう`, `相手の捨て駒から${F.oppShot}枚取られちゃう`], j) : pk([`相手に${-F.net}枚タダで取られちゃう`, `跳び越えられて${-F.net}枚の損になる`], j)) : pk(['悪くないけど、ほんの少し見劣りする', 'わずかに形が悪くなる', 'ほんの少しだけ損になる'], j);
      if (F.oppShot > 0) return pk([`相手にショットを打たれて${F.oppShot}枚損しちゃう`, `捨て駒からの連続取りで${F.oppShot}枚取られちゃう`, `相手の捨て駒が決まって${F.oppShot}枚の損`], j);
      if (F.net < 0) return pk([`相手に跳び越えられて、${n}枚タダで取られちゃう`, `タダで${n}枚、相手に取られちゃう`, `相手に${n}枚タダで取られて損しちゃう`], j);
      if (FA.shot && !F.shot) return pk(['ショットのチャンスを見のがしちゃう', '駒得できる手順に入れない', '相手の取る手を利用できない'], j);
      if (FA.crown && !F.crown) return pk(['キングになるチャンスを逃しちゃう', '先に成るチャンスがなくなる', '王冠への近道を見のがしちゃう'], j);
      if (F.back && !FA.back) return pk(['後ろの段に穴があいて、相手にキングになられやすくなる', '後ろの守りがうすくなって、相手のマンが奥へ入りやすくなる'], j);
      if (FA.center && !F.center) return pk(['真ん中への進出がおくれて、相手に中央を取られちゃう', '中央をあけてしまって、相手の駒が入りこみやすくなる'], j);
      if (d != null && d > 6) return pk(['相手に先に良いマスを取られて、あとで駒の動きがつまっちゃう', 'あとの展開で、相手の駒のほうが動きやすくなっちゃう'], j);
      return pk(['悪くないけど、ほんの少し見劣りする', 'わずかに形が悪くなる', 'ほんの少しだけ損になる'], j);
    };
    const fill2 = (t, a) => t.replace('{m}', M).replace('{x}', X).replace('{a}', a).replace('{b}', a)
      .replace(/(安全|地帯|得|損|始まり|だけ|まま|どまり|一つの手)(?=の[。！]|んだ|カニ|から)/g, (w, x, o, str) => w + (/^(の|ん)/.test(str.slice(o + w.length)) ? 'な' : 'だ'));   // (a noun before の / んだ / カニ / から: 安全なの, 得なんだ, 安全だカニ)
    const good = u => { const F = u != null && ok.includes(u) && u !== A ? ckLF(E, pos, u) : FA;
      return [pk(CK_CH.good, o8), fill2(CK_CH.why[k], why(F, k)), CK_CH.push[k]].filter(Boolean).join(' '); };
    const ng = u0 => { const u = wrongOf(u0); let F = null; try { F = ckLF(E, pos, u); } catch (e) {}
      const out = [pk(CK_CH.soft, o8), fill2(CK_CH.right[(k + 2) % 5], why(FA, k + 2))]; if (F) out.push(fill2(CK_CH.you[(k + 3) % 5], loss(F, u, k + 2)));
      if (CK_CH.tail[k]) out.push(CK_CH.tail[k]); return out.filter(Boolean).join(' '); };
    return { ask: pk(CKJ_LS.ask[id] || [''], k), hintTx: pk(CKJ_LS.hint[id] || [''], k), good, ng, own: true, ckls: true };   // (ckls: チェッカニ praises himself — no heading line)
  }
  const CHECKERS = {
    LKEY: 'aicoding-checkers-lessons', OKEY: 'aicoding-checkers-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../checkers/lessons.json?v=30261124b'), getJ('../checkers/openings.json?v=5'), getJ('../checkers/lux.json?v=1').catch(() => ({})), fetch('../checkers/i18n.js?v=20261107l14-nd1').then(r => r.text()), ckEng(), fetch('../checkers/voice-crab-ja.js?v=3').then(r => r.ok ? r.text() : '').catch(() => '')])
        .then(([ls, op, lux, tx, , vc]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] checkers texts', e); } this.I = w.I18N || {}; this.data = { ls, op, lux };
          try { const v = {}; new Function('window', vc)(v); this.V = ((v.I18N || {})['ja@crab']) || {}; } catch (e) { this.V = {}; }   // (チェッカニ's own lines, 3D, ja)
          return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && this.V && this.V[k] != null ? this.V[k] : I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: sp => window.AtlasMini && AtlasMini.checkers ? AtlasMini.checkers(sp) : '',
    lineSpec(line) { const E = window.CheckersEngine; return E ? E.replay(null, line).pos.spec() : null; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(g => ({ key: g.id, cat: g.grp, catName: this.tx('op.grp.' + g.grp, lang), title: L(g.title, lang), sub: g.short ? L(g.short, lang) : this.tx('op.' + g.id + '.short', lang), svg: this.mini(this.lineSpec(g.study.line.slice(0, g.show || 3))), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang), title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), E = window.CheckersEngine, V = lang === 'ja' ? (this.V || {}) : {};
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`] != null ? V[`ramp:${s.id}/${j}/${f}`] : f === 'h' && it.src === 'turn' && V['ls.' + s.id + '.hint'] != null ? V['ls.' + s.id + '.hint'] : null; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      const intro = String(T('intro') || '').replace(/\s*[（(][^）)]*\d[^）)]*[）)]/g, '');   // (the double corners' square numbers: not on the 3D board)
      const ja = lang === 'ja' && E && CKJ_LS.intro[s.id];   // (2026-11-22 lesson loop: チェッカニ's own intro, questions, hints, why / what the miss gives up)
      return { id: s.id, title: T('title'), intro: ja ? CKJ_LS.intro[s.id] : intro, ramp, RU,
        probs: (s.problems || []).map((P, i) => { const good = P.ok || [P.best];
          const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }), ng: () => P.ok ? T('ng', { m: CKM('ok', lang), x: CKM('ng', lang) }) : T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }) };
          if (ja) try { Object.assign(o, ckLsJa(E, s, P, i)); } catch (e) { console.warn('[lessons3d] checkers lesson', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const notes = {}; (g.study.notes || []).forEach((n, i) => { if (n) notes[String(i)] = L(n, lang); });
      const lx = ((this.data.lux || {}).openings || {})[g.id] || {}, hist = L((NC.checkers || {})['op:' + g.id + '/hist'] || lx.hist, lang);
      const probs = shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]);   // (2026-11-24 第2期: the pool is easy → hard; 5 drawn, kept in its order)
      const E = window.CheckersEngine, ja = lang === 'ja' && E;
      const CV = ja ? ckOpVoice(g.id) : null; let nj = null; if (ja) try { nj = ckNotesJa(E, g, notes, CV); } catch (e) { console.warn('[lessons3d] checkers notes', e); }
      return { id: g.id, title: L(g.title, lang), intro: ja && CKJ_OP.intro[g.id] ? CKJ_OP.intro[g.id] : hist, start: { spec: null, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes: nj || notes,
        probs: probs.map((P, i) => { const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: E ? [E.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: CKM('ok', lang) }) };
          if (ja) try { Object.assign(o, ckOpJa(E, P, L(g.title, 'ja'), g.id.charCodeAt(1) * 2 + i, k => CKM(k, lang), CV, i)); } catch (e) { console.warn('[lessons3d] checkers opening', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, m) {   // = checkers/app.js problemPoints
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -CK_WIN;
      if (mine >= best - 6 && !(best > CK_WINT && mine < best)) return 20;
      if (best > CK_WINT && mine > CK_WINT) return 16;
      if (best > CK_WINT && mine <= CK_WINT) return mine > -CK_WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0;
      if (mine < -CK_WINT && best >= -CK_WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (ckS(best) - ckS(mine)) / 0.5)));
    },
    // the warm-up (lessons.json step.ramp: squares 1-based, moves by name): its position, marks, the right moves, the example line
    rampPos: it => ({ spec: it.s, me: it.s.side === 2 ? 2 : 1 }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => (it.marks || []).map(([q, c]) => [q - 1, c === 'ng' ? 'ng' : c === 'ok' ? 'ok' : 'hl']),
    rampOk: (it, u) => { const E = window.CheckersEngine; return !!E && (it.ok || []).includes(E.name(E.Pos.from(it.s), u)); },
    rampAns: it => ({ m: ckByName(it.s, (it.ok || [])[0]) }), rampLook: it => (it.look || []).map(q => [q - 1, 'ring']),
    rampSeq(it) { const E = window.CheckersEngine; if (!E) return []; let p = E.Pos.from(it.s); const out = []; for (const nm of it.seq || []) { const m = p.moves().find(x => E.name(p, x) === nm); if (m == null) break; out.push(m); p = p.clone().play(m); } return out; },
    spOk: lang => CKM('ok', lang),
    introPos(c) {   // while the intro is read: the warm-up's first picture (locked), never the first problem
      const s = this.data.ls.steps.find(x => x.id === c.id), it = s && s.ramp && s.ramp[0]; if (!it || it.k !== 'explain') return null;
      return { pos: { spec: it.s, me: it.s.side === 2 ? 2 : 1, lock: true } };   // (its marks belong to the end of the example line: not here)
    },
  };
  /* xiangqi (2026-11-14, as checkers): the lessons (xiangqi/lessons.json: 16 steps of 5 one-move problems — 'ok' kinds and 'sc' kinds
     scored by the engine's values (= xiangqi/app.js problemPoints), warm-up ramps before some steps) and the 14 named openings
     (openings.json: the line move by move with its notes, then practice positions). Progress = the full game's
     ('aicoding-xiangqi-lessons' { id: { best, clear } }, 'aicoding-xiangqi-open' { id: { best, pass } }). Texts: xiangqi/i18n.js (a
     sandbox). The 3D board has no coordinates: the moves the texts name ({m}, {x}) become their arrows. A position here is
     { spec: FEN, me: 1 Red / 2 Black }. Moves: xiangqi/engine.js move numbers; the ramps name points and moves in ICCS (e3, e3d5). */
  const XQ_ENG = '../xiangqi/engine.js?v=20261114w-zf1';   // (the table adapter's file: one cache)
  const xqEng = () => window.XiangqiEngine ? Promise.resolve(window.XiangqiEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = XQ_ENG; sc.onload = () => window.XiangqiEngine ? res(window.XiangqiEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const xqMe = fen => / b$/.test(String(fen || '')) ? 2 : 1;
  const xqSq = n => { const f = 'abcdefghi'.indexOf(String(n)[0]), r = +String(n).slice(1); return f < 0 || !(r >= 0 && r <= 9) ? -1 : (9 - r) * 9 + f; };
  const xqParse = (fen, nm) => { const E = window.XiangqiEngine; if (!E) return null; try { return E.parse(E.Pos.from(fen), nm); } catch (e) { return null; } };
  const xqS = v => { const E = window.XiangqiEngine, W = E ? E.WIN : 30000, WT = E ? E.WINT : 29000; return v > WT ? 0.9 + 0.1 * Math.min(1, 6 / (W - v + 1)) : v < -WT ? -(0.9 + 0.1 * Math.min(1, 6 / (W + v + 1))) : v > WT - 1000 ? 0.88 : v < -(WT - 1000) ? -0.88 : Math.tanh(v / 450) * 0.82; };   // (= xiangqi/app.js sOfV)
  /* (2026-11-21 lesson loop) the xiangqi openings in ショウギツネ's words, Japanese, for the 3D table (no coordinates): her own intro,
     the line's notes rebuilt from the board (what each move does — rook out / up / over the river, horse out / to the edge, central
     cannon, the palace corner, pawns opening the horse's way, recaptures — with the stored AI verdict), a varied question, a hint from
     what the best move does (never where), and after the answer why it is played and what yours gives up (a piece left to be taken, a
     missed recapture, the engine's score gap from openings.json sc). */
  const XQJ_OP = {
    intro: {
      zpp: '赤が炮を真ん中に置く「中炮」に、黒は両方の馬を中央へ跳ねて、真ん中の卒を守るの。馬が屏風みたいに並ぶから「屏風馬」。シャンチーでいちばん指される定跡だコン！',
      zpgh: '屏風馬に対して、赤は右の車を一気に相手の陣地まで進めるよ。これが「過河車」。黒の馬と卒を直接ねらう激しい戦型で、昔からたくさん研究されてきたんだ。',
      wqp: '中炮に加えて、もう一方の炮もひとつ横へ回して、黒の右側の卒と馬に二つの炮で圧力をかけるの。これが「五七炮」。いまの大会でもよく見る作戦だね。',
      fgm: '黒が炮を九宮の角に置いて、その両側に馬を跳ねるのが「反宮馬」。屏風馬とはちがって、反撃をねらう柔らかい受け方なの。形を覚えておくと便利だコン。',
      sp: '赤の中炮に、黒も同じ側の炮を真ん中へ置いて向かい合うのが「順炮」。おたがいに中央をにらみ合う、昔からある激しい戦いだよ。',
      lp: '黒が、赤とは反対側の炮を真ん中へ置くのが「列炮」。おたがいに相手の真ん中の兵をねらい合う、攻め合いの定跡なの。気が抜けないね！',
      dtm: '屏風馬の片方の馬を、端へ跳ねるのが「単提馬」。馬が端へよけるぶん、車の通り道が早く開くんだ。中炮への受け方のひとつだコン。',
      fx7: '赤が1手目に相を真ん中へ上げるのが「飛相局」。中炮みたいな速攻じゃなくて、しっかり守ってから戦う作戦なの。黒は卒を突いて、馬の道を開けるよ。',
      fxg: '飛相局に、黒が炮を九宮の反対側へ回して応じる形。これを「過宮炮」と呼ぶの。真ん中をさけて、横から戦うんだね。',
      xr: '1手目に馬の前の兵を突くのが「仙人指路」。仙人が道を指し示す、という名前なの。相手を見てから中炮にも飛相にもできる、柔らかい手だよ。黒も卒を突き返すのが「対兵局」だコン。',
      xrd: '仙人指路に、黒が炮を相手の突いた兵の筋へ回すのが「卒底炮」。突いた兵をねらって、先に主導権を取りに行く積極的な応手なの。',
      qm: '赤が1手目に馬を跳ねるのが「起馬局」。真ん中を急がずに、駒を順番に出して形を整えるの。黒は卒を突いて応じるよ。のんびりに見えて、奥が深いんだコン。',
      ggp: '赤が右の炮を、九宮を横切って反対側へ回すのが「過宮炮」。真ん中を空けたまま、横から攻める作戦なの。黒はすかさず中炮で応じるね。',
      sjp: '赤が炮を九宮の角に置くのが「士角炮」。中炮ほど攻撃的じゃないけど、守りと反撃のバランスがいいの。じっくり戦いたい人向けだね。',
    },
    ask: ['『{n}』のこの局面、いちばん良い手はどれかな？', 'さあ、ここでどう指す？', '定跡の続きだコン。最善手を見つけてみて！', 'ここで指したい一手、わかるかな？', 'いちばんの手を当ててみよう！'],   // (the runner says whose turn it is first)
    lead: ['正解は{m}だったの。', 'ここは{m}がいちばんだコン。', '{m}を見てみて！', '本筋は{m}なの。', '定跡では{m}を指すの。', 'ここで指したかったのは{m}！'],
    so: ['こっちなら{a}からね。', '{a}から、こっちを選びたいの。', 'この手なら{a}んだ。', 'これなら{a}の。', '{a}のが、この手のいいところコン。', 'こう指すと{a}からね。'],
    gap: ['{x}だと、そのよさが出ないの。', '{x}だと、その形が作れないコン。', '{x}だと、相手に先に良い場所を取られちゃう。', '{x}では駒の働きが一歩遅れて、相手に先を越されちゃう。', '{x}だと、相手の駒が先に動きやすくなるの。'],
    late: ['{x}だと車の出番が遅れちゃう。車は早く働かせたい駒だからね。', '{x}では車が隅に残ったまま。いちばん強い駒が休んでいるの。', '{x}だと、車が働くまでに手がかかって損なの。',
      '{x}では、いちばん強い車がまだ戦いに入れないコン。', '{x}だと、車を出すのがもう1手あとになっちゃう。', '{x}では車の筋が開かないまま。せっかくの車がもったいない！', '{x}を指しているあいだに、相手の駒が先にそろっちゃうの。', '{x}だと車が働き出すのが遅くて、序盤の1手を損しちゃう。'],
    // (2026-11-22 lesson loop) the praise, the soft words after a miss, the push on — each opening takes them in its own order (xqOpVoice)
    cheer: ['いいね！', 'さすが！', 'お見事！', 'ばっちり！', 'その調子！', '上手！', 'ナイスだコン！', 'よく見つけたね！', 'すばらしい！', 'そうそう、それ！', 'いい手だね！', '完璧！'],
    soft: ['おしい！', 'ドンマイ！', 'あと少しだった！', 'いい線いってたコン！', '大丈夫、ここで覚えちゃおう！', '気にしない、気にしない！', 'よくある迷いだから平気！', 'だいじょうぶ、次はきっと指せるコン！', 'あと一歩！', 'みんな一度は迷う場面なの。'],
    push: ['次もこの調子でいこう！', 'どんどん行こう！', 'その勢いで次へ進もう！', 'まだまだいけるね！', 'この感じで続けよう！', '次も楽しみだコン！'],
    // the praise's own words (never the line's note again): {a} = what the move does
    pr: ['きみの手で{a}の。', 'これで{a}ね。定跡の本筋どおり！', '{a}のが、この手のねらいコン。', 'その手なら{a}。形がわかってきたね！', '{a}から、ここはこの一手なの。', 'ちゃんと{a}手を選べたね。'],
    deg: d => d <= 30 ? 'ほんの少し' : d <= 80 ? '少し' : d <= 200 ? 'はっきり' : 'かなり',
  };
  const XQN = (t, c) => ['', '王さま', c ? '士' : '仕', c ? '象' : '相', '馬', '車', '炮', c ? '卒' : '兵'][t] || '駒';
  const XQV = [0, 100, 2, 2, 4, 9, 4.5, 1];
  function xqFacts(E, pos, m) {   // what a move does, for ショウギツネ's words
    const c = pos.side, f = E.mFrom(m), t = E.mTo(m), [fr, fc] = E.RC[f], [tr, tc] = E.RC[t], pc = pos.at(f), ty = E.typeOf(pc), cp = pos.at(t);
    const mat = col => { let s = 0; for (let q = 0; q < 90; q++) { const x = pos.at(q); if (x && E.colorOf(x) === col && E.typeOf(x) !== 1) s += XQV[E.typeOf(x)]; } return s; };
    const after = pos.clone().play(m), fw = c ? tr - fr : fr - tr, crossed = c ? tr >= 5 : tr <= 4, back = c ? 0 : 9;
    const F = { ty, c, cap: cp ? E.typeOf(cp) : 0, behind: mat(c) < mat(c ^ 1), check: after.inCheck(), fw, crossed, wasCrossed: c ? fr >= 5 : fr <= 4 };
    F.mine = new Set(E.threats(after, c ^ 1)); F.aims = [...E.threats(after, c)].filter(q => !E.threats(pos, c).has(q)).map(q => E.typeOf(after.at(q)));
    if (ty === 5) F.k = fr === back && (fc === 0 || fc === 8) && tr === back ? 'rookOut' : fr === back && (fc === 0 || fc === 8) && Math.abs(fw) === 1 ? 'rookUp' : crossed && !F.wasCrossed ? 'rookCross' : tr === (c ? 4 : 5) ? 'rookRiver' : fr === tr ? 'rookSide' : 'rook';
    else if (ty === 4) F.k = fr === back ? (tc === 0 || tc === 8 ? 'horseEdge' : 'horseOut') : 'horseUp';
    else if (ty === 6) F.k = tc === 4 && fc !== 4 ? 'cannonMid' : (tc === 3 || tc === 5) && tr === fr && tr === (c ? 2 : 7) ? 'cannonCorner' : crossed ? 'cannonDeep' : tr === (c ? 4 : 5) ? 'cannonRiver' : fr === tr ? 'cannonSide' : 'cannon';
    else if (ty === 7) F.k = F.crossed ? 'pawnCross' : fc === 2 || fc === 6 ? 'pawnHorse' : 'pawn';
    else if (ty === 2 || ty === 3) F.k = 'guard'; else F.k = 'king';
    return F;
  }
  const XQ_WHY = {   // why the move is played (the problems' praise / the line's notes): a few wordings each, with different endings
    recap: ['取られた駒をすぐ取り返して、駒の損を戻す手なの。', '{P}をすぐ取り返す！ ここで取らないと駒損のままだから。', '取り返しの一手だコン。これで駒の数は元どおり。', '{P}を取り返して、駒の数をそろえたの！', 'すかさず{P}を取り返す！ 取られっぱなしにはしないコン。'],
    cap: ['相手の{P}を取る手。取り合いの始まりだね！', '{P}を取って、取り合いを始めるの。', '{P}を取る手。ここで取っておくのがこの形の本筋だコン。', '先に{P}を取る！ 取れるときに取っておくのが大事なの。', '{P}をいただき！ ここから駒の取り合いになるコン。'],
    rookOut: ['車を横に動かして、通り道の開いた筋へ出すの。車は早く働かせたい駒だコン。', '隅の車を、開いた筋へ出したね。これで車がよく働くよ。', '車を出して、縦の筋をにらむんだ。'],
    rookUp: ['車を1つ上げる「横車」。次に横へ回って、好きな筋へ出られるの。', '車を一歩上げて、横へ動ける道を作る手。', '一歩上がった車は、次に横へすべって好きな筋へ行けるコン。', 'ここは車をひとつ上げる手。横へ回る準備だコン！', '車を一歩前へ。これで横の道が開くよ。'],
    rookCross: ['車が川を渡って、相手の陣地へ入ったね！ 馬や卒を直接ねらえるの。', '車で相手の陣地に乗りこむ！ 相手は受けに手を取られるよ。', '川を越えた車は、相手にとってとってもこわい存在なんだ。'],
    rookRiver: ['車を川のほとりまで進めて、横に広くにらみをきかせるの。', '川のほとりの車は、守りにも攻めにも使えるんだ。', '車を川の手前へ。横に広く目が届くね！', '車が川べりに立って、相手の駒の動きを見張るの。'],
    rookSide: ['車を横へ回して、ねらう筋を変えるの。', '車を横へ動かして、もっと働く筋へ移すね。', '車の筋を変える手。開いた筋は車の通り道だコン。', '車を横すべり！ 次はこの筋から攻めるよ。'],
    rook: ['車を動かして、もっと働く場所へ移すの。', '車の位置を直して、次の攻めに備えるね。', '車をいい場所へ。車が働くと、攻めがぐっと楽になるんだ。'],
    horseOut: ['馬を跳ねて、真ん中を守りながら駒を出すの。', 'まだ動いていない馬を出す手。序盤は駒を早く出すのが大事だコン！', '馬を跳ねて、兵（卒）を守りつつ車の道も開ける手。', '馬の出番！ 駒がそろうと戦いやすいんだ。', '馬がぴょんと前へ。これで次の駒も出しやすくなるの。'],
    horseEdge: ['馬を端へ跳ねる手。車の通り道を早く開けるねらいなの。', '馬を端へよけて、車が出やすくするね。', '端の馬は少し働きにくいけど、車の道が開くんだコン。'],
    horseUp: ['馬をさらに前へ進めて、相手の陣地をうかがうの。', '馬をもう一歩前へ。働く場所が増えるね！', '前に出た馬が、相手の駒をにらんでいるよ。'],
    cannonMid: ['炮を真ん中へ！ 相手の真ん中の兵（卒）をにらむ「中炮」の形だコン。', '炮を中央の筋へ回して、真ん中をねらうの。', '真ん中の炮は、いちばん人気の攻めの形なんだ。'],
    cannonCorner: ['炮を九宮の角へ回して、守りと攻めの両方に備えるの。', '炮を九宮の角に置く手。王さまのそばで、守りにも効いているね。', '九宮の角の炮は、守りの要にもなるんだコン。'],
    cannonDeep: ['炮を相手の陣地へ進めて、攻めの準備をするの。', '炮で相手の陣地に飛びこむ！ 相手の駒をゆさぶるよ。', '深く入った炮が、相手の駒の後ろをねらうんだ。'],
    cannonRiver: ['炮を川のほとりへ出して、横からも前からもねらえるようにするの。', '川のほとりの炮は、相手の兵（卒）をおさえるのにぴったりなんだ。', '炮を川の手前へ。にらみがぐっと広がるね！', '炮が川べりへ！ 相手の駒が前に出にくくなるコン。'],
    cannonSide: ['炮を横へ回して、ねらう筋を変えるの。', '炮の向きを変えて、別の筋に圧力をかけるね。', '炮を横へ。ねらいの筋をずらす手だコン。'],
    cannon: ['炮を動かして、次の攻めに備えるの。', '炮の位置を整える手だね。', '炮をいい場所へ移すよ。'],
    pawnHorse: ['馬の前の{P}を突いて、馬の通り道を開けるの。', '{P}を一つ進めて、馬が跳ねる道を作るね。', '{P}を突く手。馬が前へ出やすくなるんだコン。'],
    pawnCross: ['{P}が川を渡ったよ！ 渡った{P}は横にも動けて、ぐっと強くなるの。', '{P}で相手の陣地へ！ 小さな駒でも、渡れば立派な戦力だコン。', '川を越えた{P}は、横にも動けるんだ。'],
    pawn: ['{P}を突いて、陣形を整えるの。', '{P}を一つ進めて、ほかの駒が動きやすくするね。', '{P}を突く静かな一手。形を整えるよ。'],
    guard: ['{P}を上げて、王さまの守りを固めるの。', '{P}で九宮のまわりをしっかり守るね。', '{P}を上げる守りの手。あわてず固めるのも大事だコン。'],
    king: ['王さまを動かして、安全な場所へ移すの。', '王さまを一歩よけて、危ない筋から外すね。'],
  };
  const XQ_SHORT = { recap: ['駒を取り返せる', '駒の損を戻せる'], cap: ['駒を取れる', '相手の駒を減らせる'], rookOut: ['車を早く働かせられる', '車がすぐ戦いに加われる', '隅の車が動き出せる'], rookUp: ['車が横へ動けるようになる', '車の横の道が開く', '車が好きな筋へ回れる'], rookCross: ['相手の陣地をねらえる', '相手の馬や卒を直接せめられる'], rookRiver: ['車が広くにらみをきかせられる', '車が横いっぱいに目を光らせられる'], rookSide: ['車の筋を変えられる', '車がもっと働く筋へ移れる'], rook: ['車がもっと働く', '車の位置が良くなる'], horseOut: ['新しい駒を出せる', '休んでいた馬が働き出す', '駒の数がそろって戦いやすくなる'], horseEdge: ['車の道が開く', '車が出やすくなる'], horseUp: ['馬が前で働く', '馬が相手の陣地をうかがえる'], cannonMid: ['真ん中をねらえる', '相手の中央をにらめる'], cannonCorner: ['守りと攻めの両方に備えられる', '王さまのそばを固めながら戦える'], cannonDeep: ['相手をゆさぶれる', '相手の陣地に圧力をかけられる'], cannonRiver: ['炮が広くにらめる', '炮のにらみが横にも広がる'], cannonSide: ['別の筋をねらえる', 'ねらいの筋をずらせる'], cannon: ['形が整う', '炮が働きやすくなる'], pawnHorse: ['馬の道が開く', '馬が跳ねやすくなる'], pawnCross: ['兵（卒）が強くなる', '兵（卒）が横にも動けるようになる'], pawn: ['形が整う', 'ほかの駒が動きやすくなる'], guard: ['王さまが固くなる', '九宮の守りが厚くなる'], king: ['王さまが安全になる', '王さまが危ない筋から外れる'] };
  const xqSh = (kd, n) => { const A = XQ_SHORT[kd] || XQ_SHORT.cannon; return A[n % A.length]; };
  const xqKind = F => F.cap ? (F.behind ? 'recap' : 'cap') : F.k;
  const xqSn = t => String(t).match(/[^。！？]*[。！？]+|[^。！？]+$/g) || [];
  // (2026-11-23 lesson loop) a sentence is "said" without its short lead-in (車を取って、… / {x}だと、…), as the quality tool reads it,
  // and a wording whose first sentence ends like the line before it (〜ね。〜ね。/ 〜かな？〜かな？) is passed over when another will do
  const xqKey = x => x.trim().replace(/^[^、！]{1,5}(、|！ ?)/, '').trim();
  const xqEnd = sn => { const b = String(sn || '').replace(/<[^>]+>/g, '').trim().replace(/[。！？!?]+$/, '').replace(/[）)」]+$/, ''); for (const e of ['なんだ', 'んだ', 'だよ', 'だね', 'よね', 'かな', 'よう', 'ろう', 'よ', 'ね']) if (b.endsWith(e)) return e === 'だよ' ? 'よ' : e === 'なんだ' ? 'んだ' : e === 'だね' ? 'ね' : e; return ''; };
  const xqEnds = t => xqSn(t).map(xqEnd);
  const xqLastEnd = t => { const E = xqEnds(t); return E.length ? E[E.length - 1] : ''; };
  function xqPick(V, cands, avoid) {   // the first wording none of whose sentences the opening has said yet (else the one with the fewest), marked as said
    const C = cands.filter(Boolean); if (!C.length) return ''; let bestW = C[0], best = 1e9;
    for (const w of C) { const n = V ? xqSn(w).map(xqKey).filter(x => x.length >= 6 && V.used.has(x)).length : 0, E = xqEnds(w);
      const bad = (avoid && E[0] === avoid ? 1 : 0) + (E.some((e, q) => q && e && e === E[q - 1]) ? 1 : 0), sc = n * 10 + bad;
      if (sc < best) { best = sc; bestW = w; } if (!sc) break; }
    if (V) xqSn(bestW).forEach(x => V.used.add(xqKey(x))); return bestW;
  }
  const XQ_TAIL = { check: ['しかも王手だね！', 'おまけに王手！', '王手にもなっているコン！'],
    aim: ['相手の{T}もねらっているよ。', 'ついでに相手の{T}をにらんでいるの。', '相手の{T}にも目が届くね！', 'しかも相手の{T}をねらえるコン。'] };
  function xqWhyJa(F, k, V, avoid) { const kd = xqKind(F), P = XQN(F.cap || F.ty, F.cap ? F.c ^ 1 : F.c);
    const L = (XQ_WHY[kd] || XQ_WHY.cannon).filter(x => !(kd === 'recap' && F.slow && /すかさず|すぐ/.test(x)));   // (a take-back moves later than the capture: not 'at once')
    const rot = (A, o) => A.map((_, q) => A[(o + q) % A.length]);
    const main = xqPick(V, rot(L, k).map(s => s.replace(/\{P\}/g, P)), avoid);
    let tail = '';
    if (F.check) tail = xqPick(V, rot(XQ_TAIL.check, k), xqLastEnd(main));
    else if (!F.cap && F.aims.length) tail = xqPick(V, rot(XQ_TAIL.aim, k).map(s => s.replace('{T}', XQN(F.aims[0], F.c ^ 1))), xqLastEnd(main));
    return xqJoin(main, tail); }
  function xqHintJa(F, k, V, avoid) {
    const kd = xqKind(F), rot = (A, o) => A.map((_, q) => A[(o + q) % A.length]);
    let H;
    if (kd === 'recap') H = ['駒の数を数えてみて。取られたままの駒はない？', 'さっき取られた駒、そのままでいいのかな？', '駒の損を戻せる手がありそうだね。'];
    else if (kd === 'cap') H = ['取れる駒がないか、盤をよく見てみて！', '相手の駒で、ただで取れるものはない？', '取り合いが始まりそうな局面コン。', '目の前に取れる駒、ないかな？'];
    else if (F.check) H = ['王さまに王手をかけられる駒がありそう。', '相手の王さまのまわり、すきはない？', '相手の王さまをおびやかす手、見えるかな？'];
    else if (F.aims.length) H = ['相手の駒で、ねらえそうなものはない？', '動かすと相手の駒をにらめる駒、どれかな？', '相手の大事な駒に、届きそうな手を探してみて。', '指したあと、相手の駒をねらえる手があるコン。'];
    else if (/^rook/.test(kd)) H = ['車の出番、そろそろじゃない？', 'いちばん強い駒、車の使い方を考えてみて。', '隅で休んでいる駒はいないかな？', '車が通れる筋、開いていない？'];
    else if (/^horse/.test(kd)) H = ['馬の跳ねる先を考えてみて。', 'まだ動いていない馬を探してみて！', '馬を出すなら、どっちへ跳ねる？', '馬の足がふさがっていない跳び先はどこ？'];
    else if (kd === 'cannonMid') H = ['真ん中の筋をにらめる駒があるね。', '相手の真ん中の卒、ねらえないかな？'];
    else if (/^cannon/.test(kd)) H = ['炮の置き場所を考えてみて。いちばんにらみがきくのはどこ？', '炮は、間に1つはさんで取る駒。どこに置くと効く？', '炮の向きを変えるとしたら、どの筋？'];
    else if (/^pawn/.test(kd)) H = ['兵（卒）を一つ進めると、何が動きやすくなる？', '小さな駒の一歩が、大事な場面もあるの。', '馬の前の兵（卒）に注目してみて！'];
    else if (kd === 'guard') H = ['王さまのまわりの守り、足りてる？', '攻める前に、守りを固める手もあるね。'];
    else H = ['金の丸の駒で、いちばん働く場所を考えてみて。'];
    const h = xqPick(V, rot(H, k), avoid), t = k % 3 === 1 ? xqPick(V, rot(['金の丸の駒がヒントだコン。', '金の丸がついた駒に注目！', '金の丸の駒から考えてみて。'], k), xqLastEnd(h)) : '';
    return xqJoin(h, t);
  }
  function xqOpVoice(id) {   // (2026-11-22 lesson loop) one opening's voice: praise / soft words / push in an order of its own, and the lines already said
    const seed = shSeed('xq' + id), O = XQJ_OP, pc = shPerm(seed, O.cheer.length), ps = shPerm(seed ^ 0x9e37, O.soft.length), pp = shPerm(seed ^ 0x51ed, O.push.length), pl = shPerm(seed ^ 0x2b7f, O.lead.length), pr = shPerm(seed ^ 0x6c1d, O.pr.length);
    return { cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]], lead: i => O.lead[pl[i % pl.length]], pr: i => O.pr[pr[i % pr.length]], used: new Set(), seed };
  }
  const xqJoin = (...a) => a.filter(Boolean).reduce((s, t) => !s ? t : s + (/[！？]$/.test(s) ? ' ' : '') + t, '');
  function xqOpJa(E, P, name, k, ck, V, i) {   // ck(k): the move named by its arrow; V: the opening's voice (xqOpVoice), i: the problem's number
    V = V || xqOpVoice(name); i = i || 0;
    const pos = E.Pos.from(P.s), A = P.best, sc = new Map(P.sc || []), best = sc.has(A) ? sc.get(A) : Math.max(...(P.sc || [[0, 0]]).map(x => x[1]));
    const FA = xqFacts(E, pos, A), M = ck('ok'), X = ck('ng'), f = s => s.replace(/\{m\}/g, M).replace(/\{x\}/g, X);
    const ask = XQJ_OP.ask[k % XQJ_OP.ask.length].replace('{n}', name), kd = xqKind(FA), j = i + V.seed % 7, sh = xqSh(kd, j), sh2 = xqSh(kd, j + 1);
    // the praise: the cheer, why — in words the line's notes have not used — and now and then a push on
    let why; { const L = XQ_WHY[kd] || XQ_WHY.cannon, P0 = XQN(FA.cap || FA.ty, FA.cap ? FA.c ^ 1 : FA.c);
      const fresh = L.map(x => x.replace(/\{P\}/g, P0)).filter(x => xqSn(x).every(y => !V.used.has(xqKey(y))));
      why = fresh.length ? xqWhyJa(FA, j, V, xqLastEnd(V.cheer(i))) : xqPick(V, [0, 1, 2, 3, 4, 5].map(q => V.pr(i + q).replace('{a}', sh2)), xqLastEnd(V.cheer(i))); }
    const pu = i % 2 ? [0, 1, 2].map(q => V.push(i + q)).find(x => xqEnd(xqSn(x)[0]) !== xqLastEnd(why)) || V.push(i) : '', goodTx = xqJoin(V.cheer(i), why, pu);
    const good = u => { if (u != null && u !== A && sc.has(u)) return f(best - sc.get(u) <= 10 ? xqJoin(V.cheer(i), '{x}もいい手だコン！ {m}と同じくらいよく働くの。') : xqJoin('悪くない手だね！', `でも{m}なら${sh2}から、そっちが本筋なの。`));
      return goodTx; };
    const ng = u0 => {
      let u = u0; if (u == null || u === A) u = ((P.sc || []).find(x => x[0] !== A && best - x[1] > 10) || (P.sc || []).find(x => x[0] !== A) || [])[0];   // (no move given: a real miss, as the tool asks)
      const rot = (A, o) => A.map((_, q) => A[(o + q) % A.length]); let out = [V.soft(i), V.lead(i)];
      const pk = A0 => xqPick(V, rot(A0, j), xqLastEnd(out[out.length - 1] || ''));
      out.push(pk(XQJ_OP.so.map(x => x.replace('{a}', sh))));
      if (u == null) return f(xqJoin(...out));
      let F = null; try { F = xqFacts(E, pos, u); } catch (e) {}
      const lost = F ? [...F.mine].filter(q => !FA.mine.has(q)) : [], aft = pos.clone().play(u), d = sc.has(u) ? best - sc.get(u) : null;
      const lp = lost.length ? E.typeOf(aft.at(lost[0])) : 0, n0 = out.length, me = XQN(lp, pos.side), RECAP = ['{x}だと取り返しそびれて、駒損のままになっちゃう。', '{x}では取られた駒を取り返せず、損をしたままなの。', '{x}だと、取り返すチャンスを逃しちゃう！'];
      if (F && FA.cap && FA.behind && !F.cap) out.push(pk(RECAP));   // (the bigger miss first)
      else if (F && lp && F.cap && XQV[F.cap] >= XQV[lp]) {}   // (an even trade or better: no 'taken' line)
      else if (F && lp) out.push(F.cap ? `{x}で${XQN(F.cap, pos.side ^ 1)}を取っても、きみの${me}を取られて損しちゃう！` : pk([`{x}だと、きみの${me}がただで取られちゃう！`, `{x}では${me}の守りが外れて、相手に取られてしまうの。`, `{x}だと、${me}が相手のねらいに残っちゃう！`]));
      else if (F && FA.cap && !F.cap) out.push(FA.behind ? pk(RECAP) : pk([`{x}だと、取れる${XQN(FA.cap, pos.side ^ 1)}を見のがしちゃう。`, `{x}では、ただで取れた${XQN(FA.cap, pos.side ^ 1)}がそのまま残るの。`]));
      else if (F && /^rook/.test(FA.k) && !FA.cap && F.ty !== 5) out.push(pk(XQJ_OP.late));
      if (out.length === n0) out.push(d != null && d <= 10 ? pk(['{x}も悪くないけど、定跡の本筋はこっちなの。', '{x}もありだけど、よく指されるのはこっちコン。']) : pk(XQJ_OP.gap));   // (2026-11-22: no "the AI says")
      return f(xqJoin(...out));
    };
    return { ask, hintTx: xqHintJa(FA, k, V, xqLastEnd(ask)), good, ng, own: true };
  }
  function xqNotesJa(E, g, notes, V) {   // the line's notes in ショウギツネ's words (3D, ja), rebuilt from the board; each line said once
    const out = {}, cnt = {}; let pos = E.Pos.from(null), n = 0, prevCap = true;
    g.study.line.forEach((m, i) => { const o = notes[String(i)];
      if (o) { let F = null; try { F = xqFacts(E, pos, m); } catch (e) {}
        const kd = F ? xqKind(F) : ''; cnt[kd] = (cnt[kd] || 0) + 1;
        let s = String(o.ja || '');
        if (F) { F.slow = i > 0 && !prevCap; s = xqWhyJa(F, cnt[kd] + g.id.length, V, n ? V.lastNote : ''); }
        if (V) V.lastNote = xqLastEnd(s);
        if (n === 0) s = `ここまでが『${(g.title || {}).ja || ''}』の形だコン！ ` + s;
        out[String(i)] = { ja: s }; n++; }
      prevCap = !!pos.at(E.mTo(m)); pos = pos.clone().play(m); });
    return out;
  }
  /* (2026-11-21 lesson loop) the xiangqi lessons in ショウギツネ's words, Japanese, for the 3D table (no coordinates): a shorter intro,
     a varied question and two hints for each step, and after the answer why the move works and what yours misses — from the board
     (xqLF: what is taken and whether it is taken back, which of your pieces are left to be taken, check / mate, the new targets — a
     fork —, the king's way out after a wrong check) and the engine's values in lessons.json (sc; the mate distance in the endgames). */
  const XQJ_LS = {
    intro: {
      b_rook: 'わたしはショウギツネ。今日はシャンチー（中国の将棋）をいっしょにやろう！<br>真ん中に<b>川</b>があって、王さまは<b>九宮</b>という四角から出られないの。相手の王さまを詰ませたら勝ちだコン。<br>まずは<b>車</b>から。縦と横に、どこまでも進める駒なんだ。取り返されない駒を、車で取ってみよう！',
      b_horse: '<b>馬</b>は「1つまっすぐ、それから1つななめ」に跳ぶの。<br>最初のまっすぐの点（<b>馬の足</b>）に駒があると、そっちへは跳べないんだ。将棋の桂馬とは、ちょっとちがうね。<br>馬で取れる、ただの駒を探してみて！',
      b_cannon: '<b>炮</b>は、ふだんは車と同じ動きをするの。<br>でも取るときだけは、間にちょうど1つの駒（<b>炮台</b>）を飛び越えるんだ。炮台は敵でも味方でもいいコン。<br>炮台を見つけて、ただの駒を取ってみよう！',
      b_pawn: '<b>兵</b>（相手は<b>卒</b>）は、1つ前へ進む駒。川を渡ると、横にも1つ動けるようになるの。<br>後ろには戻れないけど、大きな駒をただで取れることもあるんだコン。',
      b_escape: '相手の駒が、きみの大事な駒をねらっているの！<br>取られない場所へ逃げよう。逃げた先でまたねらわれないか、確かめるのも忘れずにね。',
      b_mate1: '王手をかけて、相手がどうしても王手をはずせなければ<b>詰み</b>。きみの勝ちだコン！<br>將（帥）は九宮から出られないから、逃げ道は少ないの。そこがねらい目だね。',
      t_capture: '守られている駒でも、自分の駒より価値が高ければ、取る値打ちがあるの。<br>目安は、車9・炮4.5・馬4・仕と相2・兵1（川を渡ると2）くらい。<br>取り返されても得をする取り方を、探してみよう！',
      t_fork: '1つの駒で2つの駒を同時にねらうのが<b>両取り</b>。相手は片方しか守れないの。<br>とくに馬の両取りはよく出てくるから、覚えておくと役に立つコン！',
      t_check: '王手をかけられたら、相手は必ず受けないといけないよね。<br>だから、王手のついでに別の駒もねらえる手は、とっても強いの。相手を忙しくさせちゃおう！',
      t_defend: '相手の次の手を、先に読んでみよう。<br>ただで取られそうな駒があったら、守る（ひもをつける）か、間に駒を入れて防ぐの。守りも攻めと同じくらい大切だコン。',
      m_mate2: '相手がどう受けても、次の手で必ず詰む。そんな最初の1手を見つけよう！<br>王手から始まるとはかぎらないの。静かな一手が決め手になることもあるんだコン。',
      m_hc: '將と同じ筋に馬を置いて、その後ろから炮で王手。これが<b>馬後炮</b>なの。<br>馬が炮台になって、將の逃げ道まで押さえちゃう。シャンチーでいちばん有名な詰め方のひとつだコン！',
      m_dc: '2つの炮を將と同じ筋に縦に並べると、前の炮が後ろの炮の炮台になるの。これが<b>重炮</b>。<br>前の炮を取るのも、間に駒を入れるのも難しい、強い詰め方なんだ。',
      m_face: '帥と將は、間に駒がないまま同じ筋で向かい合えないルールなの。<br>だから帥のいる筋には、相手の將は入れないね。帥も立派な攻めの駒だコン！',
      e_rook: '車1つと帥だけでも、士2つに守られた將を詰ませられるの。<br>帥が筋をにらんで、車が將の行き場を1つずつ消していく。あせらずいこうね！',
      e_pawn: '川を渡った兵は、九宮に入るとぐっと強くなるの。<br>後ろに戻れないから、奥まで進めすぎないのがコツ。帥のにらみも使ってね！',
    },
    // (2026-11-23 lesson loop) five questions and five hints a step, each problem its own (no line twice in a lesson, none the warm-up's)
    ask: {
      b_rook: ['車で、取り返されない駒を取ってみよう！', '取り返されない駒はどれかな？ 車で取ってみて！', '車の通り道に、ただで取れる駒はある？', 'ここでも車の出番だコン。守りのない獲物はどれ？', '車で取れる駒はいくつかありそう。でも、ただで取れるのは？'],
      b_horse: ['馬で、ただの駒を取ってみよう！', '馬の跳び先に、ただで取れる駒はないかな？', '馬の足に気をつけて。取れるのはどの駒？', '跳んで取れる獲物を探してみて！', '馬の出番だコン。取り返されない駒はどれ？'],
      b_cannon: ['炮で、守りのない駒をいただこう！', '炮で取るには、間に駒がちょうど1つ。取れる駒はどれ？', '炮台になる駒はどこかな？ 取ってみて！', '炮の出番だコン。飛び越えて取ってみよう！', '炮で、取り返されない駒を取れる？'],
      b_pawn: ['兵（卒）で、駒を取ってみよう！', '小さな兵でも、大きな駒が取れるかも。どれかな？', '兵の前と横に、取れる駒はある？', '兵の出番だコン。どの駒をいただく？', '兵（卒）で、ただの駒を取れる？'],
      b_escape: ['ねらわれた駒を、安全な場所へ逃がしてあげて！', 'このままだと取られちゃう！ どこへ逃げるコン？', 'ねらわれている駒の、安全な逃げ先はどこかな？', '逃げた先でまたねらわれない場所、わかる？', '大事な駒がピンチだコン。どこへ動かす？'],
      b_mate1: ['1手で詰ませてみよう！', '詰みの一手はどれかな？', '將の逃げ道をなくす王手、わかる？', '1手で勝てるコン。見つけてみて！', 'どの王手なら、將はもう動けない？'],
      t_capture: ['得になる取り方を見つけてみよう！', '取られても損をしない取り方はどれ？', '安い駒で高い駒を取れる？', '駒の値打ちを比べてみて。得な取り方は？', 'ここは駒得のチャンスだコン！'],
      t_fork: ['両取りをかけてみよう！', '1手で2つの駒をねらえる手はどれかな？', '相手が片方しか守れない手、わかる？', '両取りのチャンスだコン。見つけてみて！', 'どこへ動かせば、2つ同時にねらえる？'],
      t_check: ['王手をかけて、駒得してみよう！', '王手のついでに駒をねらえる手はどれかな？', '相手を忙しくさせる王手、わかる？', '王手で得するチャンスだコン！', 'どの王手なら、受けたあとに駒が取れる？'],
      t_defend: ['相手のねらいを防いでみよう！', '相手は次に何をねらってる？ 先に防いで！', 'ただで取られそうな駒、守れるかな？', '守りの一手を探してみて！', 'ここは守りどころだコン。どう受ける？'],
      m_mate2: ['2手で詰ませる、最初の手はどれかな？', '相手がどう受けても次で詰む。そんな一手は？', '次の詰みを用意する一手、わかる？', '2手詰めだコン。最初の手を見つけてみて！', '2手先の詰みを見すえて。最初の一手は？'],
      m_hc: ['馬後炮で詰ませる、最初の手はどれかな？', '馬と炮を將の筋に並べるには？', '馬後炮の形を作る一手、わかる？', '馬を台にして炮で詰ませよう！ 最初の手は？', '馬後炮のチャンスだコン！ どこから始める？'],
      m_dc: ['重炮で詰ませる、最初の手はどれかな？', '2つの炮を縦に重ねるには、どう指す？', '重炮の形を作る一手、わかる？', '重炮のチャンスだコン！ 最初の手は？', '炮を台にして炮で詰ませる。どこから始める？'],
      m_face: ['帥の力も使って、詰ませてみよう！', '帥と將のにらみ合いを使う一手はどれかな？', '帥のいる筋は、將は通れない。それを使うと？', '帥も攻めに参加させるコン！ 決め手は？', '帥のにらみを生かす詰め方、わかる？'],
      e_rook: ['詰みへの近道になる手はどれかな？', '將の動ける場所を減らす一手は？', '車と帥で、どう追いつめる？', 'いちばん早く詰むコースを探してみて！', 'ここが腕の見せどころだコン！'],
      e_pawn: ['詰みへの近道になる手はどれかな？', '兵をどこまで進める？ いちばん良い手は？', '帥と兵で、どう追いつめる？', 'いちばん早く詰むコースを探してみて！', '兵の進め方が勝負だコン！'],
    },
    hint: {
      b_rook: ['車の縦と横を、端まで見通してみて。', '取ったあと、その場所を相手の駒がねらっていない？', 'ひもの付いていない駒を探すのがコツだコン。', '車の通り道に、さえぎる駒はある？', '取れる駒の中で、守り手のいないのはどれ？'],
      b_horse: ['馬の跳び先は、最大で8つ。順番に見ていこう！', '馬の足、つまり最初のまっすぐの点はふさがってない？', '「日」の字の反対の角が、馬の行き先だコン。', '跳んだ先の駒を、相手が取り返せないかも確かめてね。', '足がふさがった方向は、候補から外していいの。'],
      b_cannon: ['炮が取るときは、間にちょうど1つの駒が必要なの。', '炮台は敵の駒でも味方の駒でもいいんだコン。', '炮の筋に、駒が2つ並んでいるところはない？', '間に駒が0こや2こだと、炮は取れないね。', '取ったあと、取り返されないかも見てみて！'],
      b_pawn: ['兵は前に1つ。川を渡っていれば、横にも1つ動けるの。', '兵のすぐとなりと前に、相手の駒はいない？', '小さな兵で大きな駒を取れたら、大もうけだコン！', '兵は後ろの駒は取れないから、前と横だけ見ればいいね。', '取ったあとで、兵が取り返されないかも確かめて！'],
      b_escape: ['ねらっている相手の駒の利きを、たどってみて。', '逃げた先が、相手の車や炮の筋にないか確かめるコン。', '逃げ先の候補を全部並べて、安全なのを選ぼう！', '馬の跳び先にも気をつけてね。', '相手の炮は、間に1つ駒があると取れるのを忘れずに！'],
      b_mate1: ['將が動ける点を、先に数えてみて。', '王手をかけたあと、將の逃げ先は残ってない？', '九宮の中だけ見れば、將の行き先は少ないの。', '王手の駒が取られないかも、確かめるコン。', '間に駒を入れて防がれない王手はどれ？'],
      t_capture: ['駒の値打ちの目安を思い出して、比べてみて！', '取り返されても、取った駒のほうが高ければ得なの。', '安い駒で高い駒を取れるところはない？', '取ったあとの交換まで、足し算と引き算だコン。', '守られている駒でも、取る値打ちがあることがあるの。'],
      t_fork: ['1手で2つの駒に届く点を探してみて。', '馬の両取りは、とくによく出てくるコン。', '相手の大きな駒どうしの、ちょうど間あたりがねらい目なの。', '動かした駒から、相手の駒が2つ見える？', '王手と駒取りを同時にかけるのも、両取りのひとつだね。'],
      t_check: ['王手のあと、相手の受けで何が取れるようになる？', '王手をかけた駒の、もう一方の利き先を見てみて。', '相手が王手を受けたあとの形まで、思いうかべてね。', '王手は相手の手番をうばう、強いカードだコン。', '王手と一緒に、ただの駒をねらえる点はない？'],
      t_defend: ['相手の車や炮が、次にどの駒を取れるか見てみて。', '守るか、間に駒を入れるか、逃げるか。3つの方法があるの。', '相手の次の1手を、先に指してみるつもりで考えて！', 'ひもを付けるだけでも、守りになるコン。', '取られそうな駒を、まず見つけよう！'],
      m_mate2: ['相手の受け方を、ひとつずつ考えてみて。', '次の詰みの形を、先に思いうかべてみて！', '相手がどう受けても詰む。そんな形を探そう！', '相手に残る受けが、どれも詰みにつながる手は？', '最初の手のあと、相手の受けを全部ためしてみて。'],
      m_hc: ['將・馬・炮が、同じ筋に縦に並ぶ形を思い出して！', '馬が炮台になって、炮が王手する形だね。', '馬は將の横の逃げ道も押さえてくれるコン。', '炮を將の筋へ回す道はある？', '先に馬を置くか、先に炮を回すか、順番が大事なの。'],
      m_dc: ['前の炮が台になって、後ろの炮で王手する形だね。', '炮を2つ、將の筋に縦に重ねられない？', '前の炮は取られにくい場所に置きたいコン。', 'まず1つ目の炮で王手、それとも先に重ねる？', '炮を重ねると、間に駒を入れても受けられないの。'],
      m_face: ['將が横へ逃げると、帥と向かい合わない？', '帥のいる筋は、將にとって通れない壁だコン。', '帥と將が同じ筋に並ぶ手は指せないルールなの。', '車や馬の王手に、帥のにらみを組み合わせてみて！', '將の逃げ道を、帥がいくつ消しているか数えてみて。'],
      e_rook: ['帥のにらみと車の通せんぼ、両方使うのがコツだコン。', '將が動ける点を数えて、いちばん減る手を探して！', '車は遠くから、將の段や筋をふさげるの。', 'あせって王手を続けるより、包囲を狭めるのが近道なの。', '士を取れるタイミングがないかも見てみて！'],
      e_pawn: ['兵は戻れないから、進めすぎに気をつけるコン。', '帥のにらみで、將の行き場をしぼってみて。', '兵が九宮に入ると、將のとなりをおさえられるの。', '將が動ける点を数えて、いちばん減る手を探そう！', '兵を急がせず、帥を先に動かす手もあるの。'],
    },
    // ショウギツネ's voice for one lesson, each lesson in an order of its own (xqLsVoice)
    cheer: ['お見事！', 'いい手！', 'そのとおり！', 'ばっちりだコン！', 'さすが！', 'ナイス！', 'やったね！', 'すごい、正解！', 'よく見つけた！', 'そうそう、それ！', '上手だコン！', 'いい目してる！'],
    soft: ['おしい！', '大丈夫！', 'ドンマイだコン！', 'あと一歩だった！', 'いい線いってたの！', '気にしない、気にしない！', 'よくある見落としなの。', '次は見つけられるコン！', 'いっしょに確かめよう！', 'これで覚えちゃおう！', '今度こそいけるコン！'],
    push: ['この調子で次もいこう！', 'どんどん行こう！', 'その勢いで次へ！', '次も期待してるコン！', 'まだまだいけるコン！', 'わかってきたみたい、続けよう！'],
    lead: ['{m}なら、', '正解の{m}だと、', '{m}を選んでいれば、', 'こっちの{m}なら、', '{m}を指すと、'],
    tail: ['から。', 'からなの。', 'んだコン。', 'の。', 'んだ！'],
    gend: ['ね。', 'の。', 'んだコン。', 'のがポイントだね。', 'から、文句なし！'],
  };
  const XQ_MATE = { m_hc: '馬後炮', m_dc: '重炮', m_face: '帥のにらみ' };
  function xqLF(E, pos, m) {   // what a lesson move does
    const me = pos.side, o = me ^ 1, f = E.mFrom(m), t = E.mTo(m), ty = E.typeOf(pos.at(f)), cp = pos.at(t), after = pos.clone().play(m);
    const mine = (q, S) => [...S].filter(x => q.at(x) && E.colorOf(q.at(x)) === me);
    const hang0 = mine(pos, E.threats(pos, o)), hang = mine(after, E.threats(after, o));
    const aims0 = new Set(E.threats(pos, me)), aims = [...E.threats(after, me)].filter(x => !aims0.has(x) || x === t);
    const rep = after.moves(), recap = rep.some(x => E.mTo(x) === t), hits = after.pseudo(me, true, t).map(x => E.typeOf(after.at(E.mTo(x)))).filter(x => x !== 1 && x !== 7);   // (what the moved piece now attacks)
    const F = { m, ty, cap: cp ? E.typeOf(cp) : 0, check: after.inCheck(), mate: !rep.length, recap, hang0, hang: hang.map(x => E.typeOf(after.at(x))), hangSq: hang,
      aims: aims.map(x => E.typeOf(after.at(x))).filter(x => x !== 1), all: [...E.threats(after, me)].map(x => E.typeOf(after.at(x))), hits, saved: hang0.includes(f) && !hang.includes(t) };
    F.lossy = F.cap ? recap && XQV[ty] > XQV[F.cap] : false;
    F.out = () => { if (!F.check || F.mate) return ''; const k = after.k[o];   // (how the wrong check is met)
      if (rep.some(x => E.mTo(x) === t)) return 'take'; if (rep.some(x => E.mFrom(x) === k)) return 'run'; return 'block'; };
    return F;
  }
  function xqLsVoice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = n % 12, a2 = 1 + Math.floor(n / 11) % 10, b2 = n % 11, X = XQJ_LS;
    return { cheer: i => X.cheer[(a * i + b) % 12], soft: i => X.soft[(a2 * i + b2) % 11], push: i => X.push[(i + n) % 6] }; }
  function xqLsJa(E, s, P, i, ck, n) {   // n: the lesson's number (each lesson words its praise / misses in an order of its own)
    const id = s.id, A0 = XQJ_LS.ask[id]; if (!A0) return null; n = n || 0;
    const k = i + id.length, pick = L => L[k % L.length], H = XQJ_LS.hint[id] || [], VO = xqLsVoice(n);
    const vi = (i + n) % 5, V = (L, o) => L[(i + n + (o || 0)) % L.length];   // (the problem's own wording: five problems, five wordings)
    const pos = E.Pos.from(P.s), me = pos.side, M = ck('ok'), X = ck('ng'), N = t => XQN(t, me), NO = t => XQN(t, me ^ 1);
    const f = x => x.replace(/\{m\}/g, M).replace(/\{x\}/g, X);
    const A = P.ok ? P.ok[0] : P.best, sc = P.sc ? new Map(P.sc) : null, best = sc ? Math.max(...P.sc.map(e => e[1])) : 0, WT = E.WINT;
    const right = u => P.ok ? P.ok.includes(u) : sc.has(u) && sc.get(u) >= best - 10 && !(best > WT && sc.get(u) < best);
    const FF = u => { try { return xqLF(E, pos, u); } catch (e) { return null; } }, FA = FF(A);
    const near = u => sc && best > WT && sc.has(u) && sc.get(u) > WT;   // (a slower mate: 16 points, praised as right)
    const pickWrong = pref => { const L = P.sc ? P.sc.slice().sort((a, b) => b[1] - a[1]).map(e => e[0]) : pos.moves(); const Wr = L.filter(x => !right(x) && !near(x));
      if (pref) for (const x of Wr.slice(0, 80)) { const Q = FF(x); if (Q && pref(Q)) return x; } return Wr[0]; };
    // why the right move works: five wordings of one short clause (plain form, no ending)
    const plus = (Fm, u) => {
      if (Fm.mate) { const mn = XQ_MATE[id]; return [mn ? `${mn}が決まって、將はもう動けなくなる` : '將の行き場がひとつも残らなくなる', '王手をはずす手が、相手にもう1つもない', '將が逃げても、取っても、間に駒を入れても防げない', 'たった1手で、九宮の將がつかまる', '將の逃げ道が全部なくなる']; }
      if (P.ok) return Fm.check ? ['どう受けても、次の手で詰みが待っている', '相手の受けは、どれも次の詰みにつながる', '王手で受け方をしぼって、次で仕上げられる', '相手がどこへ逃げても、とどめの手がある', '王手を受けた形が、そのまま詰みの形になる']
        : ['王手じゃなくても、相手に詰みを防ぐ手がない', '静かな手なのに、次の詰みをもう止められない', '將の逃げ道を先にふさいで、次で詰ませられる', '相手が何を指しても、次の手で詰む形になる', '王手をかけずに、相手の受けを先に消しておける'];
      const v = sc && sc.has(u) ? sc.get(u) : best;
      if (id === 'e_rook' || id === 'e_pawn') return v > WT ? (v === best ? ['いちばん早く詰ませられる', '最短の道で將を追いつめられる', '回り道しないで詰みまで行ける', '相手に粘るすきを与えない、最短コースになる', '詰みまでの手数がいちばん少なくなる'] : ['ちゃんと詰みまで行ける', '少し長くても、詰みまでたどり着ける', '詰みの道すじは消えない', '將を逃がさずに追いつめられる', '詰みまでの流れはちゃんと残る'])
        : ['將の動ける場所をせばめられる', '將の行き場を1つずつ減らせる', '帥と組んで、將をすみへ追いこめる', '將の逃げ道をじわじわ消せる', '包囲の輪を、ひとまわり小さくできる'];
      const two = (a, b) => a === b ? `2つの${NO(a)}` : `${NO(a)}と${NO(b)}`;
      if (Fm.saved && !Fm.cap) { const nm = N(pos.at(E.mFrom(Fm.m)) & 7); return [`ねらわれた${nm}が、取られない点へ逃げられる`, `${nm}を、もうねらわれない点へ移せる`, `${nm}の逃げた先には、相手の駒が届かない`, `取られそうだった${nm}を助けられる`, `${nm}が、相手のどの駒のねらいからも外れる`]; }
      if (Fm.cap && !Fm.recap) { const c = NO(Fm.cap); return [`${c}をただで取れる`, `${c}を取っても、取り返されない`, `守りのない${c}をいただける`, `${c}を取ったあと、相手に取り返す駒がない`, `ひもの付いていない${c}を取れる`]; }
      if (Fm.cap && !Fm.lossy) { const c = NO(Fm.cap), t = N(Fm.ty);
        return XQV[Fm.cap] > XQV[Fm.ty] ? [`取り返されても、${c}のぶん得をする`, `安い${t}で、値打ちの高い${c}を取れる`, `${t}を渡しても、${c}のほうが値打ちが高い`, `取って取られても、差し引きで得が残る`, `${c}と${t}の交換なら、きみの得になる`]
          : [`${c}と交換して、駒の損がない`, `${c}との取り合いが、五分で終わる`, `取り返されても、${c}と同じくらいの値打ち`, `${c}を取って、損のない交換にできる`, `駒の値打ちが釣り合う交換になる`]; }
      if (Fm.check && Fm.all.length) { const a = NO(Fm.all[0]); return [`王手しながら、相手の${a}もねらえる`, `王手のついでに、${a}にもねらいがつく`, `王手で相手の手を止めて、${a}も取りにいける`, `王手と${a}取りの両ねらいになる`, `相手は王手の受けで手いっぱい、${a}までは守りにくい`]; }
      if (Fm.check && id === 't_check') return ['相手が王手を受けているあいだに、駒得できる', '王手の受けに1手使わせて、そのすきに駒を取れる', '相手を王手で忙しくさせて、駒得につなげられる', '王手の受けで、相手の守りがくずれる', '王手から、駒を取る流れが作れる'];
      if (Fm.aims.length >= 2 || (id === 't_fork' && Fm.hits.length >= 2)) { const L2 = Fm.aims.length >= 2 ? Fm.aims : Fm.hits, w = two(L2[0], L2[1]);
        return [`${w}を同時にねらえる`, `${w}の両取りになる`, `1手で${w}に同時に届く`, `相手は${w}を両方は守りきれない`, `${w}を一度にねらえる`]; }
      if (Fm.hang0.length && !Fm.hang.length) return ['相手のねらいを全部防げる', 'ねらわれていた駒が、全部守られる', '相手の次の取りが、ひとつもなくなる', '取られそうな駒がゼロになる', '相手の攻めが空振りになる'];
      if (id === 't_defend') return ['相手のねらいに先回りして、駒を守れる', '相手が取る前に、守りが間に合う', '次の取りを、先に消しておける', '相手の取りを、1手早く防げる', '相手の攻めの筋を、前もって止められる'];
      if (id === 'b_escape') return ['ねらわれた駒が、取られずにすむ', 'ピンチの駒を、無事に逃がせる', '取られそうな駒が、安全な点へ移れる', 'ねらいの外へ、駒を出せる', '大事な駒を、取られる前に助けられる'];
      if (Fm.check) return ['王手で相手の手を限定できる', '王手で相手の自由をうばえる', '王手で相手に受けを強いられる', '王手で主導権を握れる', '王手で相手に考える時間を与えない'];
      if (Fm.cap) { const c = NO(Fm.cap); return [`${c}を取れる`, `${c}をいただける`, `${c}を盤から消せる`, `${c}を取って駒得できる`, `${c}を取りきれる`]; }
      return ['駒の働きがいちばん良くなる', '駒がいちばん生きる場所に行ける', '次の攻めにつながる形になる', '駒の利きがいちばん広がる', '相手より先に良い形を作れる'];
    };
    // what the wrong move misses (most telling first), worded per problem
    const why = (Q, u) => {
      const v = sc && sc.has(u) ? sc.get(u) : null, d = v == null ? null : best - v;
      if (P.ok) { const o = Q.out();
        return Q.mate ? '' : o === 'take' ? V(['{x}の王手は、その駒を取られて終わっちゃう。', '{x}で王手しても、王手した駒がそのまま取られるの。', '{x}だと、王手の駒を相手にぱくっと取られちゃう。', '{x}の王手は、相手に駒を取られて消えちゃうの。', '{x}だと、王手した駒がただで取られるね。'])
          : o === 'run' ? V(['{x}の王手だと、將に逃げられちゃうの。', '{x}では將に逃げ道が残って、かわされるの。', '{x}の王手は、將が空いている点へ動いてかわせちゃう。', '{x}だと、將がするりと逃げ出せるね。', '{x}の王手では、將の逃げ場がまだあるの。'])
          : o === 'block' ? V(['{x}の王手は、間に駒を入れて受けられるの。', '{x}だと、相手が間に駒をはさんで防げるの。', '{x}の王手は、合い駒ひとつで止まっちゃう。', '{x}だと、王手の筋に駒を入れられて終わりなの。', '{x}の王手は、あいだをふさがれて効かないね。'])
          : FA.check ? V(['{x}は王手じゃないから、相手に受ける時間ができちゃう。', '{x}だと、相手に1手の余裕をあげて、詰みを防がれるの。', '{x}はおだやかすぎて、相手に逃げ道を作られちゃう。', '{x}だと王手にならず、相手に守りを固められるの。', '{x}では相手に1手もらって、詰みが消えちゃう。'])
          : V(['{x}のあとは、相手に詰みを防ぐ手が見つかっちゃう。', '{x}だと、相手が逃げ道を作って、次の詰みがなくなるの。', '{x}では、相手に受けの1手を指されて詰まなくなるの。', '{x}だと、將の逃げ道がひとつ残っちゃう。', '{x}を指すと、相手に守りの1手が間に合うの。']); }
      if (best > WT && v != null) return v > WT ? V(['{x}でも詰むけど、少し遠回りになるの。', '{x}も詰みまで行けるけど、手数が多くかかるの。'])
        : v <= 50 && v >= -50 ? V(['{x}だと詰みを逃して、引き分けになりそうなの。', '{x}では將をつかまえきれず、引き分けの形になっちゃう。'])
        : V(['{x}だと詰みを逃して、相手に粘られちゃう。', '{x}だと詰みまでの道すじが消えて、長引いちゃうの。', '{x}では將に息をつかせて、詰ませにくくなるの。', '{x}のあとは、すぐには詰まない形になっちゃう。', '{x}を指すと、せっかく追いつめた將がひと息ついちゃう。']);
      if (Q.lossy) { const c = NO(Q.cap), t = N(Q.ty); return V([`{x}で${c}を取っても、きみの${t}を取り返されて損しちゃう！`, `{x}は${c}を取れるけど、代わりに${t}を取られて差し引き損なの。`, `{x}だと${c}と引きかえに、もっと大きい${t}を失うの。`]); }
      if (FA.cap && Q.cap && XQV[Q.cap] < XQV[FA.cap] && !Q.hang.length) { const qc = NO(Q.cap), ac = NO(FA.cap); return V([`{x}で取れる${qc}より、${ac}のほうが大きい駒なの。`, `{x}の${qc}取りは、${ac}取りより得が小さいの。`, `{x}だと${qc}止まり。値打ちの高い${ac}が残っちゃう。`]); }
      if (Q.hang.length && (FA.hang.length < Q.hang.length)) { const h = N(Q.hang[0]);
        return Q.hang0.length && !Q.saved && (id === 'b_escape' || id === 't_defend') ? V([`{x}のあとも、ねらわれた${h}は取られたままなの。`, `{x}だと、${h}へのねらいが消えないの。`, `{x}では${h}が助からないね。`, `{x}を指しても、${h}はまだねらわれてるの。`, `{x}だと、${h}が次に取られちゃう。`])
          : V([`{x}だと、きみの${h}が取られちゃう。`, `{x}のあと、相手に${h}をねらわれるの。`, `{x}を指すと、${h}が取られる形が残るの。`, `{x}だと、${h}が相手の駒の利きに入っちゃう。`, `{x}では、${h}がただで取られそうなの。`]); }
      if (FA.cap && !Q.cap) { const ac = NO(FA.cap); return V([`{x}では駒を取れないね。取れる${ac}を見のがしちゃう。`, `{x}だと、せっかくの${ac}を取りそこねるの。`, `{x}は取る手じゃないから、${ac}がそのまま残るの。`, `{x}を指すと、${ac}を取るチャンスが消えちゃう。`, `{x}だと、${ac}に手が届かないの。`]); }
      if (FA.check && !Q.check && id === 't_check') return V(['{x}は王手じゃないから、相手に立て直す時間をあげちゃう。', '{x}だと王手にならず、相手に守りを固められるの。', '{x}では相手を忙しくできなくて、駒得のチャンスが消えるの。', '{x}のあと、相手は自由に1手指せるから、駒を逃がされちゃう。', 'その{x}だと、相手の手番をうばえないの。']);
      if (id === 't_fork' && FA.aims.length < 2 && FA.hits.length >= 2 && Q.hits.length < 2) return Q.hits.length ? V([`{x}だと、ねらえるのは${NO(Q.hits[0])}だけ。相手はそれを逃がせば終わりなの。`, `{x}では${NO(Q.hits[0])}しかねらえないから、逃げられて終わりなの。`]) : V(['{x}だと、相手の駒を何もねらえないの。', '{x}では、どの駒にもねらいがつかないね。']);
      if (id === 't_defend' || id === 'b_escape') return d != null && d > 300 ? (Q.hang.length ? V([`{x}のあと、${N(Q.hang[0])}を取られちゃうの。`, `{x}では、${N(Q.hang[0])}がねらわれたまま残るの。`, `{x}を指しても、${N(Q.hang[0])}は取られちゃう。`]) : V(['{x}だと、ねらいが残ったまま。次の手で攻めこまれちゃう。', '{x}では攻めが止まらず、次に攻めこまれるの。', '{x}を指すと、相手の次の一手がそのまま決まっちゃう。']))
        : V(['{x}だと、ねらいを止めきれないの。', '{x}では、守りが1手おくれちゃう。', '{x}を指しても、相手の取りは消えないの。', '{x}のあとも、攻めの筋がまだ通ってるの。', 'その{x}では、ねらわれた駒が守りきれないの。']);
      if (FA.aims.length >= 2 && Q.aims.length < 2) return Q.aims.length ? V([`{x}だと、ねらえるのは${NO(Q.aims[0])}だけ。相手はそれを守れば終わりなの。`, `{x}では${NO(Q.aims[0])}しかねらえないから、守られて終わりなの。`]) : V(['{x}だと、相手の駒を何もねらえないの。', '{x}では、どの駒にもねらいがつかないね。']);
      if (Q.check && !FA.check) return V(['{x}の王手は、すぐ受けられて、相手の駒に追い返されちゃうの。', '{x}で王手しても、受けられたらそれまでなの。']);
      return d != null && d <= 60 ? V(['{x}も悪くないけど、相手の駒へのねらいが少し弱いの。', '{x}もありだけど、駒の働きが少し落ちるの。']) : V(['{x}だと、相手の駒へのねらいが作れなくて、先に攻めこまれちゃうの。', '{x}では駒が働かず、相手に先手をとられるの。']);
    };
    // (2026-11-24 第2期 m_mate2) the misses name a reply that really escapes (after it no move wins at once); the hint and the
    // praise follow the answer (a check / a quiet move that takes squares from the general)
    const M2 = id === 'm_mate2' && P.ok ? (() => { const win1 = q => q.moves().some(x => !q.clone().play(x).moves().length);
      const kMoves = q => { const kk = q.k[q.side]; return q.moves().filter(x => E.mFrom(x) === kk).length; };
      const before = kMoves(E.Pos.from(P.s.replace(/ [wb]$/, me ? ' w' : ' b'))), afA = pos.clone().play(A);
      return { esc: u => { const q = pos.clone().play(u); return q.moves().filter(r => !win1(q.clone().play(r))).map(r => ({ r, q })); }, shut: kMoves(afA) < before, chk: afA.inCheck() }; })() : null;
    const why2 = (Q, u) => { const es = M2.esc(u); if (!es.length) return ''; const q = es[0].q, kk = q.k[me ^ 1], to = E.mTo(u);
      if (Q.check) { const o = es.some(e => E.mTo(e.r) === to) ? 'take' : es.some(e => E.mFrom(e.r) === kk) ? 'run' : 'block';
        return o === 'take' ? V(['{x}の王手は、その駒を取られて終わっちゃう。', '{x}で王手しても、王手した駒がそのまま取られて、次で詰まないの。', '{x}だと、王手の駒を相手にぱくっと取られちゃう。', '{x}の王手は、相手に駒を取られて消えちゃうの。', '{x}だと、王手した駒がただで取られるね。'])
          : o === 'run' ? V(['{x}の王手だと、將に逃げられて、次で詰まないの。', '{x}では將に逃げ道が残って、かわされるの。', '{x}の王手は、將が空いている点へ動いてかわせちゃう。', '{x}だと、將がするりと逃げ出せるね。', '{x}の王手では、將の逃げ場がまだあるの。'])
          : V(['{x}の王手は、間に駒を入れて受けられるの。', '{x}だと、相手が間に駒をはさんで防げるの。', '{x}の王手は、合い駒ひとつで止まっちゃう。', '{x}だと、王手の筋に駒を入れられて終わりなの。', '{x}の王手は、あいだをふさがれて効かないね。']); }
      const e = es.find(x => E.mFrom(x.r) === kk) || es.find(x => q.at(E.mTo(x.r))) || es[0], pre = M2.chk ? '{x}は王手じゃないから、' : '{x}だと、';
      if (E.mFrom(e.r) === kk) return pre + V(['將が動いて逃げ道を作れるの。次の手で詰まないよ。', '將が1歩動いて、詰みの形から外れちゃう。', '將に逃げられて、次で詰まなくなるの。']);
      if (q.at(E.mTo(e.r))) return pre + V([`相手に${N(E.typeOf(q.at(E.mTo(e.r))))}を取られて、詰みが消えちゃう。`, `きみの${N(E.typeOf(q.at(E.mTo(e.r))))}が取られて、次で詰まなくなるの。`]);
      return pre + V([`相手の${NO(E.typeOf(q.at(E.mFrom(e.r))))}が動いて受けられて、次で詰まなくなるの。`, `相手に${NO(E.typeOf(q.at(E.mFrom(e.r))))}で守りの1手を指されて、詰みが消えちゃう。`]); };
    const plus2 = () => M2.chk ? ['どう受けても、次の手で詰みが待っている', '相手の受けは、どれも次の詰みにつながる', '王手で受け方をしぼって、次で仕上げられる', '王手を受けたあとに、とどめの手が残っている', '王手を受けた形が、そのまま詰みの形になる']
      : ['王手じゃなくても、相手に詰みを防ぐ手がない', '静かな手なのに、次の詰みをもう止められない', M2.shut ? '將の逃げ道を先にふさいで、次で詰ませられる' : '相手が受けに使える手を、先に消しておける', '相手が何を指しても、次の手で詰む形になる', '王手をかけずに、相手の受けを先に消しておける'];
    const pu = i % 2 === 1 || i === (s.problems || []).length - 1;
    const say = u0 => { let u = u0; if (u == null || right(u)) u = pickWrong(id === 'b_mate1' || P.ok ? Q => Q.check : FA.cap ? Q => Q.cap || Q.hang.length : null);
      const Q = u != null ? FF(u) : null, w = Q ? (M2 ? why2(Q, u) : why(Q, u)) : '';
      return f(VO.soft(i) + ' ' + w + XQJ_LS.lead[vi] + (M2 ? plus2() : plus(FA, A))[(vi + 2) % 5] + XQJ_LS.tail[vi]); };
    const good = u => { const U = u != null && (sc ? sc.has(u) : right(u)) ? u : A, Q = FF(U) || FA; let s0 = VO.cheer(i) + ' ' + (M2 ? plus2() : plus(Q, U))[vi] + XQJ_LS.gend[vi];
      if (sc && U !== A && sc.get(U) < best) s0 += best > WT ? V([' いちばん早い詰みより、ほんの少し遠回りだけどね。', ' 最短の詰みには、あと一歩だったけどね。']) : V([' これもいい手だコン。', ' これも十分いい手なの。']);
      if (pu) s0 += ' ' + VO.push(i);
      return f(s0); };
    const H2 = M2 ? (M2.chk ? ['王手をかけて、相手の受け方をしぼってみて。', '王手のあと、相手に残る受けは少ないほどいいコン。', '王手した駒が取られないかも、確かめてね。', '王手のあとの受けを、ひとつずつ追ってみて！', '王手を受けた形に、とどめの手はある？']
      : ['王手をかけなくてもいいの。相手の受けをなくす手を探そう。', M2.shut ? '將の逃げ道になりそうな点を、先に消しておけない？' : '相手が受けに使えそうな手を、先に消しておけない？', '相手が何を指しても詰む形、思いうかぶ？', '王手はどれも受けられちゃう。静かな一手を探してみて。', '相手の受け方を、ひとつずつ考えてみて。']) : null;
    return { ask: pick(A0), hintTx: H2 ? H2[(i + n) % 5] : H.length ? H[(i + n) % H.length] : '', good, ng: say, own: true };
  }
  const XIANGQI = {
    LKEY: 'aicoding-xiangqi-lessons', OKEY: 'aicoding-xiangqi-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../xiangqi/lessons.json?v=30261124xm2'), getJ('../xiangqi/openings.json?v=2'), getJ('../xiangqi/lux.json?v=1').catch(() => ({})), fetch('../xiangqi/i18n.js?v=4lv-l14-pro-nd1').then(r => r.text()), xqEng(), fetch('../xiangqi/voice-fox-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')])
        .then(([ls, op, lux, tx, , vf]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] xiangqi texts', e); } this.I = w.I18N || {}; this.data = { ls, op, lux };
          try { const v = {}; new Function('window', vf)(v); this.V = ((v.I18N || {})['ja@fox']) || {}; } catch (e) { this.V = {}; }   // (ショウギツネ's own lines, 3D, ja)
          return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && this.V && this.V[k] != null ? this.V[k] : I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: fen => window.AtlasMini && AtlasMini.xiangqi ? AtlasMini.xiangqi(fen) : '',
    lineSpec(line) { const E = window.XiangqiEngine; if (!E) return null; const p = E.replay(null, line).pos; return E.toFen ? E.toFen(p) : p.fen ? p.fen() : null; },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.op.sets.map(g => ({ key: g.id, cat: g.grp, catName: this.tx('op.grp.' + g.grp, lang), title: L(g.title, lang), sub: g.short ? L(g.short, lang) : '', svg: this.mini(this.lineSpec(g.study.line.slice(0, g.show || 3))), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang), title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), E = window.XiangqiEngine, V = lang === 'ja' ? (this.V || {}) : {};
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`] != null ? V[`ramp:${s.id}/${j}/${f}`] : f === 'h' && it.src === 'mirror' && V['ls.' + s.id + '.hint'] != null ? V['ls.' + s.id + '.hint'] : null; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      return { id: s.id, title: T('title'), intro: lang === 'ja' && XQJ_LS.intro[s.id] || T('intro'), ramp, RU,
        probs: (s.problems || []).map(P => { const good = P.ok || [P.best];
          return { pos: { spec: P.s, me: xqMe(P.s) }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }), ng: () => T('ng', { m: CKM('ok', lang), x: CKM('ng', lang) }) }; }).map((o, i) => { if (lang === 'ja' && E) try { Object.assign(o, xqLsJa(E, s, o.P, i, k => CKM(k, lang), +key) || {}); } catch (e) { console.warn('[lessons3d] xiangqi lesson', e); } return o; }),   // (2026-11-21 lesson loop: ショウギツネ's question, hint, why / what yours misses)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const notes = {}; (g.study.notes || []).forEach((n, i) => { if (n) notes[String(i)] = L(n, lang); });
      const it = g.intro && (g.intro[lang] || g.intro.en), hist = Array.isArray(it) ? it.join(' ') : it || '';
      const probs = shuffle(g.problems || []).slice(0, 5), E = window.XiangqiEngine, ja = lang === 'ja' && E;
      const XV = ja ? xqOpVoice(g.id) : null; let nj = null; if (ja) try { nj = xqNotesJa(E, g, notes, XV); } catch (e) { console.warn('[lessons3d] xiangqi notes', e); }
      return { id: g.id, title: L(g.title, lang), intro: ja && XQJ_OP.intro[g.id] ? XQJ_OP.intro[g.id] : hist, start: { spec: null, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes: nj || notes,
        probs: probs.map((P, i) => { const o = { pos: { spec: P.s, me: xqMe(P.s) }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: E ? [E.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: CKM('ok', lang) }) };
          if (ja) try { Object.assign(o, xqOpJa(E, P, L(g.title, 'ja'), g.id.length * 2 + i, k => CKM(k, lang), XV, i)); } catch (e) { console.warn('[lessons3d] xiangqi opening', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    points(P, m) {   // = xiangqi/app.js problemPoints
      const E = window.XiangqiEngine, WIN = E ? E.WIN : 30000, WINT = E ? E.WINT : 29000;
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
      if (mine >= best - 10 && !(best > WINT && mine < best)) return 20;
      if (best > WINT && mine > WINT) return 16;
      if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0;
      if (mine < -WINT && best >= -WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (xqS(best) - xqS(mine)) / 0.5)));
    },
    // the warm-up (lessons.json step.ramp: points in ICCS, moves in ICCS): its position, marks, the right moves, the example line
    rampPos: it => ({ spec: it.s, me: xqMe(it.s) }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => (it.marks || []).map(([q, c]) => [xqSq(q), c === 'ng' ? 'ng' : c === 'ok' ? 'ok' : 'hl']).filter(x => x[0] >= 0),
    rampOk: (it, u) => { const E = window.XiangqiEngine; if (!E) return false; const p = E.Pos.from(it.s); return (it.ok || []).includes(E.name(p, u, 'iccs')); },
    rampAns: it => ({ m: xqParse(it.s, (it.ok || [])[0]) }), rampLook: it => (it.look || []).map(q => [xqSq(q), 'ring']).filter(x => x[0] >= 0),
    rampSeq(it) { const E = window.XiangqiEngine; if (!E) return []; let p = E.Pos.from(it.s); const out = []; for (const nm of it.seq || []) { const m = E.parse(p, nm); if (m == null) break; out.push(m); p = p.clone().play(m); } return out; },
    spOk: lang => CKM('ok', lang),
    introPos(c) {   // while the intro is read: the warm-up's first picture (locked), else the first problem's position (locked)
      const s = this.data.ls.steps.find(x => x.id === c.id), it = s && s.ramp && s.ramp[0];
      if (it && it.k === 'explain') return { pos: { spec: it.s, me: xqMe(it.s), lock: true } };
      return null;
    },
  };

  /* janggi (2026-11-24, 担当D): the lessons of the full game (janggi/lessons.json: steps of 5 one-move problems scored by the engine's
     values, = janggi/app.js problemPoints) on the janggi table (atlas/games/janggi.js ctx.pz, as xiangqi's). Progress = the full game's
     'aicoding-janggi-lessons' { id: { best, clear } }. Texts: janggi/i18n.js; in Japanese ショウギツネ's own words (atlas/games/janggi-ls.js
     AtlasJanggiLs: intro, question, hints, why / what yours misses from the board). Only the checked steps (AtlasJanggiLs.DONE) are
     listed (claude/lesson-quality.md「検証の進み具合」; tools/lesson-verify-janggi.js). No openings on the 3D table (app.js NO_OPEN3D). */
  const JG_ENG = '../janggi/engine.js?v=7';   // (the table adapter's file: one cache)
  const jgScript = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = src; sc.onload = () => ok() ? res() : rej(new Error(src)); sc.onerror = rej; document.head.appendChild(sc); });
  const jgS = v => { const E = window.JanggiEngine, W = E ? E.WIN : 30000, WT = E ? E.WINT : 29000; return v > WT ? 0.9 + 0.1 * Math.min(1, 6 / (W - v + 1)) : v < -WT ? -(0.9 + 0.1 * Math.min(1, 6 / (W + v + 1))) : v > WT - 1000 ? 0.88 : v < -(WT - 1000) ? -0.88 : Math.tanh(v / 800) * 0.82; };   // (= janggi/app.js sOfV)
  const JANGGI = Object.assign({}, XIANGQI, {
    LKEY: 'aicoding-janggi-lessons', OKEY: null, data: null, I: null, V: {},
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../janggi/lessons.json?v=4'), fetch('../janggi/i18n.js?v=3').then(r => r.text()), jgScript(JG_ENG, () => window.JanggiEngine), jgScript('games/janggi-ls.js?v=3', () => window.AtlasJanggiLs), jgScript('games/janggi-pz.js?v=1', () => window.AtlasMini && window.AtlasMini.janggi)])
        .then(([ls, tx]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] janggi texts', e); } this.I = w.I18N || {}; const D = (window.AtlasJanggiLs || {}).DONE || [];
          this.data = { ls: Object.assign({}, ls, { steps: ls.steps.filter(x => D.includes(x.id)) }) }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: fen => window.AtlasMini && AtlasMini.janggi ? AtlasMini.janggi(fen) : '',
    list(kind, lang) { if (kind === 'open') return []; return XIANGQI.list.call(this, kind, lang); },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), E = window.JanggiEngine, JL = window.AtlasJanggiLs, ja = lang === 'ja' && E && JL;
      return { id: s.id, title: T('title'), intro: ja && JL.INTRO[s.id] || T('intro'), ramp: null, RU: (k, v) => fill('', v || {}),
        probs: (s.problems || []).map((P, i) => { const good = P.ok || [P.best];
          const o = { pos: { spec: P.s, me: xqMe(P.s) }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }), ng: () => T('ng', { m: CKM('ok', lang), x: CKM('ng', lang) }) };
          if (ja) try { Object.assign(o, JL.lsJa(E, s, P, i, k => CKM(k, lang), +key) || {}); } catch (e) { console.warn('[lessons3d] janggi lesson', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening: null,
    points(P, m) {   // = janggi/app.js problemPoints
      const E = window.JanggiEngine, WIN = E ? E.WIN : 30000, WINT = E ? E.WINT : 29000;
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
      if (mine >= best - 10 && !(best > WINT && mine < best)) return 20;
      if (best > WINT && mine > WINT) return 16;
      if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0;
      if (mine < -WINT && best >= -WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (jgS(best) - jgS(mine)) / 0.5)));
    },
    rampPos: null, rampMarks: null, rampOk: null, rampAns: null, rampLook: null, rampSeq: null,
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: xqMe(P.s), lock: true } } : null; },
  });

  /* backgammon (2026-11-14): the lessons (backgammon/lessons.json: 23 steps in 7 categories, 5 problems each — a play for a roll, scored
     by the rank of the play among the engine's candidates (= backgammon/app.js problemPoints), or a question with choices) and the
     openings (openings.json: the 15 opening rolls and the replies; a line's decision is the problem — right when it is within the
     table's tolerance of the best rolled-out play, as backgammon/op.js opSubmit). Progress = the full game's
     ('aicoding-backgammon-v2-lessons' { id: { best, pass } }, '…-open' { id: { pass, best } }). Texts: the game's i18n*.js. You always
     play the near side: a problem for the far side is turned round (the position's halves swapped). Positions here are
     { bg: { pos: 52 hex digits, dice } } (atlas/games/backgammon.js pz); plays are the json's letter pairs, decoded with window.BG. */
  const bgPos = (pos, side) => side === 1 ? String(pos).slice(26) + String(pos).slice(0, 26) : String(pos);
  const bgDecP = s0 => { const q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(String(s0)[i], 16) || 0; return q; };
  const bgCodes = (pos, m) => { const q = bgDecP(pos), out = []; for (let i = 0; i + 1 < m.length; i += 2) out.push(BG.apply(q, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65)); return { moves: out, key: BG.key(q) }; };
  const bgCkOf = () => { let ck = ['gold', 'black']; try { const st = (JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}') || {}).settings || {}; if (st.ck && st.ck[0] && st.ck[1] && st.ck[0] !== st.ck[1]) ck = st.ck.slice(); } catch (e) {} return ck; };
  /* (2026-11-21 lesson loop) the backgammon openings in ダイスン's words, Japanese, for the 3D table: an intro without point numbers
     (the 3D board has none), a varied question, a hint from what the best play is for (never where), and after the answer a short
     reason built from backgammon/explain.js teach (the plan of the best play, and what yours gives up) instead of its long list. */
  const BGJ_OP = {
    intro: {
      o31: '3と1は、最初の一手でゴールデンポイント（インナーの右から5番目）が作れる目ワン！ ほかの手とは大きな差があるから、迷わなくていいんだ。',
      o42: '4と2なら、インナーの右から4番目にポイントが作れるね。ゴールデンポイントの次に大事な場所で、ほかの手より明らかに得ワン。',
      o53: '5と3は、インナーの右から3番目にポイントを作るのがいちばん。少し奥でも、ポイントの価値は大きいからね。後ろの駒を分ける手が次点ワン。',
      o61: '6と1なら、バーポイントが作れるワン！ となりのポイントとつながって、相手の後ろの駒は6の目で逃げられなくなるんだ。',
      o21: '2と1は考え方が2つあるね。後ろの駒を分けて中盤に材料を置くか、ゴールデンポイントに1枚置いて次に作るのを狙うか。差は小さくて、どちらも正解ワン。',
      o41: '4と1は、中盤から1枚下ろして材料（ビルダー）にして、1の目で後ろの駒を分けるのがいちばん。ゴールデンポイントに1枚置く手は、少し落ちるワン。',
      o51: '5と1は、5で中盤から安全に1枚下ろして、1で後ろの駒を分けるワン。ゴールデンポイントに1枚だけ置く手は、相手の4の目などで打たれる危険があるんだ。',
      o32: '3と2は、後ろの駒を1枚前に出して、中盤からも1枚下ろすのが基本ワン。中盤から2枚下ろす手も、差は小さいね。',
      o43: '4と3は、後ろの駒を進めるか、中盤から材料を下ろすか。その組み合わせの4つの手は、どれも大きな差がないワン。好みで選んでいい目なんだ。',
      o52: '5と2は、中盤から2枚下ろす手がわずかに上ワン。後ろを分ける手も十分で、どちらを選んでも大きな損はないね。',
      o54: '5と4は、後ろの駒を1枚前に出して、中盤からも1枚下ろすのが基本ワン。中盤から2枚下ろす手も僅差。後ろの1枚を逃がす手は、少し落ちるんだ。',
      o62: '6と2は、6で後ろの駒を相手のバーポイントへ、2で中盤から材料を下ろすのがいちばんワン。1枚を逃がす手や、ゴールデンポイントに置く手は少し落ちるね。',
      o63: '6と3は、相手のバーポイントに出て材料を置くか、後ろの1枚を逃がすか。ほとんど互角だけど、前のほうがわずかに上ワン。',
      o64: '6と4は、考え方の違う手が3つあるね。ポイントを作る、後ろの1枚を逃がす、相手のバーポイントに出て材料を置く。どれを選んでも大きな差はないワン。',
      o65: '6と5は、後ろの1枚を相手の陣地からミッドポイントまで一気に逃がすワン！ 「ラバーズリープ」と呼ばれる有名な手で、ほかの手よりずっと上なんだ。',
      r31: '相手がゴールデンポイントを作ると、そこには駒を出せないね。だから応手も少し変わるワン。ポイントを作れる目なら、こっちも作るのがいちばんなんだ。',
      r42: '相手がインナーの4番目にポイントを作った後の応手ワン。いつもの手が使えない目もあるけど、ポイントを作れる目なら、やっぱり作るのがいちばんだね。',
      r61: '相手がバーポイントを作ると、6の目で後ろの駒を出せなくなるね。2つの目を合わせて走る手が多いけど、走らずに材料を置くのが良い目もあるワン。',
      r53: '相手が少し奥にポイントを作った後の応手ワン。ポイントを作れる目なら、こっちも作るのがいちばん。ほかの目は、オープニングと同じ考え方で大丈夫なんだ。',
      r21p: '相手が後ろの駒を分けてきた後の応手ワン。ポイントを作れる目なら、やっぱり作るのが最善。ほかの目は、後ろを分けたり材料を置いたりするんだ。',
      r51: '相手が後ろの駒を分けると、相手の陣地にブロットが残るね。目によっては、2枚まとめて打つ手が最善になるワン！ 走る目、分ける目もあるから、よく見てね。',
      r65: '相手が1枚を一気に逃がした後の応手ワン。ポイントを作れる目は作る。ほかは、オープニングと同じ考え方で動かすのがいちばんなんだ。',
      d66: '2手目に6のゾロ目が出たら、ふつうは後ろの2枚を相手のバーポイントへ、中盤の2枚をバーポイントへ動かすワン。でも相手がバーポイントを作っていたら、そこへは止まれないね。',
      d55: '5のゾロ目は、多くの場面で中盤の2枚をインナーの右から3番目へ運んでポイントにするワン。相手の残したブロットが打てるなら、打ちながらポイントを作る手もあるんだ。',
      d44: '4のゾロ目は、ポイントを作るか、後ろと中盤をそろえて進めるか、相手の形しだいで変わるワン。ブロットを打てるときは、打つのが大事だね。',
      d33: '3のゾロ目は、後ろの2枚で相手の陣地に足場（アンカー）を作る手が多いワン。相手のブロットが打てるときや、相手が逃げた後は、インナーにポイントを作るんだ。',
      d22: '2のゾロ目は、多くの場面でインナーの右から4番目にポイントを作るワン。相手のブロットに届くなら、打ちながら作るのがいちばんだね。',
      d11: '1のゾロ目は、ゴールデンポイントを作るのが基本ワン。相手のブロットを打てるときは打つ。相手が逃げた後なら、バーポイントまで一緒に作れることもあるんだ。',
      h21s: '相手がゴールデンポイントに1枚だけ置いてきたら、それを打てる目は打つのがいちばんワン！ 自分のポイントを作れる目でも、打つほうが上のことが多いんだ。',
      h43: '相手が後ろと中盤から1枚ずつ出てきた後の応手ワン。打てる目は打つのが基本。でも、打たずにポイントを作るほうが良い目もあるんだ。',
      h64: '相手が後ろの1枚を中盤まで逃がした後の応手ワン。その1枚に届く目は、打つのがいちばん。打たずに自分も逃げるほうが良い目もあるから、気をつけてね。',
      h62: '相手がこっちのバーポイントに出てきた後の応手ワン。打ちながらポイントを作れる目は最高だね。打たずにポイントを作るほうが良い目もあるんだ。',
    },
    ask: ['{d}が出たワン。どう動かすのがいちばんかな？', '{d}か。きみならどう動かす？', 'さあ、{d}をどう使う？ 強い人の手を当ててみて！', '{d}が出た！ 作る、逃げる、打つ……どれを選ぶワン？', 'ここで{d}。いちばん得な動かし方はどれかな？'],
    dice: d => d[0] === d[1] ? d[0] + 'のゾロ目' : d[0] + 'と' + d[1],
    // a point (the mover's own numbering) by a short name: no numbers on the 3D board
    pt(i) { return i === 5 ? 'ゴールデンポイント' : i === 6 ? 'インナーの左はしのポイント' : i >= 1 && i <= 4 ? `インナーの右から${i}番目のポイント` : i === 7 ? 'バーポイント' : i >= 8 && i <= 12 ? `バーの左${i - 6}つ目のポイント` : i === 13 ? 'ミッドポイント'
      : i === 18 ? '相手のバーポイント' : i >= 14 && i <= 17 ? `ミッドポイントの右${i - 13}つ目` : i === 20 ? '相手のゴールデンポイント' : i === 24 ? '相手の陣地のいちばん奥' : `相手のインナーの左から${i - 18}番目`; },
    plan: { enter: 'まずバーの駒を入れ直すのが先だからね。', hit: '相手のブロットを打てば、約{n}ピップも戻せるからね。', hit2: '相手の駒を{k}枚まとめて打てば、相手は反撃どころじゃなくなるワン。',
      dance: '打たれた相手が入れずに休む確率も、約{d}%あるんだ。',
      pt5: '{P}は相手の後ろの駒の前をふさぐ、いちばん大事な場所だからね。', pt7: '{P}をふさげば、相手の後ろの駒は6の目で飛び出せなくなるワン。',
      ptHome: '{P}が増えると、打たれた相手の駒が入りにくくなるからね。', ptDeep: '少し奥の{P}でも、ポイントにすれば相手の入り口が1つ減るワン。',
      ptOuter: '{P}は相手の逃げ道をふさいで、駒を運ぶ中継にもなるからね。', anchor20: '{P}に足場（アンカー）があれば、打たれても戻る場所になるワン。',
      anchor: '{P}に2枚の足場ができれば、閉じ込められにくくなるからね。', ptMid: '{P}が中盤の足場になって、駒を安全に運べるワン。',
      prime: 'ポイントが{n}つ並んで、相手の駒の前に壁ができるからね。', prime6: '6つ並んだ完全な壁で、相手は一歩も出られないワン！',
      escape: '後ろの駒が閉じ込められる前に、相手の陣地から逃げ出せるからね。', raceA: '接触がなくなって、リードしたままのレースになるワン。', raceB: '接触をなくして、あとはレース勝負にするからね。',
      off: '駒を{n}枚上げられるからね。', raceMove: 'むだなく前へ進めて、上げやすい形に整えるワン。', boRolls: '', safe0: 'しかもブロットを残さないから、打たれる心配がないワン。',
      bold: 'わざと打たれる危険をとって、次にポイントを作る材料を置くからね。', build: '次の番にポイントを作れる目が{a}通りもあるワン。', unstack: '重なった駒をほぐして、使える駒を増やせるからね。', quiet: '駒の配置のバランスがいちばん良いからね。' },
    vs: { noHit: 'きみの手は打つチャンスを見送っちゃうから、相手を自由に動かせちゃう。', noPoint: 'きみの手だと{P}が作れないままになるワン。', broke: 'きみの手は{P}をくずすから、せっかくの壁が弱くなるんだ。',
      shots: 'きみの手は打たれる目が{a}通りもあるから、緑の手の{b}通りより危ないワン。', shots0: 'きみの手はブロットが残って、{a}通りの目で打たれちゃう。緑の手なら打たれる目はゼロなんだ。',
      stuck: 'きみの手だと後ろの駒が残って、閉じ込められる危険が続くワン。', build: 'きみの手だと、次にポイントを作れる目が{c}通り減っちゃうから、少し損なんだ。', stack: 'きみの手は{n}枚が1か所に重なって、駒が使いにくくなるワン。',
      off: 'きみの手だと、上げる駒が{n}枚少なくなるからね。', close: '差はほんの少しだけど、細かい駒の置き方で緑の手がわずかに上だからね。' },
    good: ['ナイス！ ', 'その手ワン！ ', 'ばっちり！ ', 'いいね、正解！ ', 'さすが！ '],
    ngHead: ['正解は緑の矢印の手ワン。', 'ここは緑の矢印の手がいちばんなんだ。', '緑の矢印の手を見てみて。', '強い人は緑の矢印の手を選ぶワン。'],
    hint: { hit: '相手のブロット（1枚だけの駒）に届く目がないか、数えてみて！', hit2: '相手のブロット、1枚だけじゃないね。まとめて狙ってみて！', enter: 'まずはバーの駒からだね。',
      pt: '2枚を同じ場所にそろえれば、ポイントが作れそうだね。', anchor: '後ろの2枚を同じ場所にそろえる手もあるワン。', escape: '後ろの駒、そろそろ相手の陣地から逃がしたくない？',
      build: 'すぐポイントにならなくても、次に作る材料を置く手があるワン。', safe0: 'ブロットを残さない、安全な形を探してみて。', off: '何枚上げられるか、目の組み合わせを数えてみて！', raceMove: 'レースはむだなく前へ。いちばん後ろの駒から考えてみてワン。',
      def: '後ろの駒と中盤の駒、どっちを動かすか考えてみて！' },
    say(x) { const t = (this[x.k.slice(0, 2) === 'tv' ? 'vs' : 'plan'] || {})[x.k.slice(3)]; if (!t) return '';
      const a = Object.assign({}, x.a); if (a.P != null) a.P = '<b>' + this.pt(a.P) + '</b>'; if (a.a != null && a.b != null) a.c = a.a - a.b; return fill(t, a); },
    // join the pieces: one ワン in a row is enough (the next piece's ワン becomes ね, or んだ after a ね)
    join(...xs) { let out = ''; for (let x of xs) { if (!x) continue; if (/ワン[。！]$/.test(out.replace(/<[^>]+>/g, '').trim()) && /ワン[。！]$/.test(x)) x = x.replace(/ワン([。！])$/, (a, e) => (/ね[。！]?\s*$/.test(out) ? 'んだ' : 'ね') + e);
      else if (/ね[。！]\s*$/.test(out) && /からね。$/.test(x)) x = x.replace(/からね。$/, 'からなんだ。'); out += x; } return out; },
    hintOf(T) { const k = T && T.plan[0] ? T.plan[0].k.slice(3) : ''; return this.hint[k] || this.hint[/^pt|prime/.test(k) ? 'pt' : /^anchor/.test(k) ? 'anchor' : k === 'bold' ? 'build' : 'def']; },
    /* (2026-11-21 lesson loop) the lessons' play problems: a varied question (the step's own goal and these, in turn), and the
       same short reasons as the openings (bgTeachJa). The questions with choices (race / shots / cube) get a praise + the reason
       when right, and when wrong the right answer and what the chosen one overlooks (chJa). */
    lsAsk: ['{d}が出たワン。いちばん良い動かし方はどれかな？', '次は{d}。きみならどう動かす？', 'さあ、{d}をどう使う？', 'ここで{d}が出た！ どの駒を動かすワン？', '{d}か……。いちばん得な手を探してみて！'],
    chGood: ['正解ワン！ ', 'そのとおり！ ', 'よく見てるね！ ', 'ばっちり！ ', 'さすがワン！ '],
  };
  /* (2026-11-22 lesson loop) the backgammon lessons in ダイスン's voice, Japanese: one voice per lesson (bgVoice — the praise / the soft
     words / the push in an order of the lesson's own, and every wording picked in turn so a lesson never says the same sentence, or the
     same 10-letter run in a third bubble, again — texts already said in the intro and the warm-up are marked first). The reasons are
     the commentary engine's (backgammon/explain.js teach: tc.* = what the best play is for, tv.* = what yours gives up), each said in
     3–4 ways (BGV.plan / BGV.vs); the hints follow the best play's plan (BGV.hint); the choice questions (race / shots / cube) get
     their own questions, hints and reasons from the problem's values (bgChJa). */
  const BGV = {
    cheer: ['いいね！', 'ナイス！', 'さすが！', 'ばっちり！', 'お見事ワン！', 'その調子！', '上手！', 'やった！', '完璧！', 'そうそう、それ！', 'いい手！', 'よく見えてるね、すごい！'],
    soft: ['おしい！', 'ドンマイ！', 'あと少しだったワン！', 'いい線いってた！', '大丈夫、ここで覚えちゃおう！', '気にしない、気にしない！', 'よくある迷いだから平気！', 'だいじょうぶ、次はきっと当たる！', 'あと一歩！', '今度はいっしょに確かめよう！'],
    push: ['次もこの調子でいこう！', 'どんどん行こうワン！', 'その勢いで次へ進もう！', 'まだまだいけるね！', 'この感じで続けよう！', '次も楽しみだね！'],
    lead: ['正解は緑の矢印の手ワン。', '緑の矢印が、いちばん良い手。', 'ここは緑の矢印の動かし方が正解！', '緑の矢印のほうを見てみて。', '答えは緑の矢印の手だったワン。', '強い人なら緑の矢印の手を選ぶね。', 'ここは緑の矢印に動かしたかった！'],
    ask: ['{d}が出たワン。いちばん良い動かし方はどれかな？', '次は{d}。きみならどう動かす？', 'さあ、{d}をどう使う？', 'ここで{d}が出た！ どの駒を動かすワン？', '{d}か……。いちばん得な手を探してみて！', '{d}の目、きみならどこへ進める？', 'お次は{d}！ 強い人の手を当ててみて！', '{d}が出た！ 落ち着いて考えてみよう。'],
    last: ['最後の1問ワン！ {d}で決めてみよう！', 'ラストは{d}！ きみの答えを見せて！', '最後は{d}。ここまでの考え方を使ってみよう！'],
    cn: ['それに、', 'しかも、', 'おまけに、', 'そのうえ、'],
    plan: {
      enter: ['まずはバーの駒を入れ直すのが先だからね。', 'バーに駒があるうちは、ほかの駒は動かせないからね。', '最初にバーの駒を盤に戻すのが決まりワン。', 'バーの駒を入れないと、ほかの駒が動かせないんだ。', 'バーの駒がもどれば、また全部の駒が使えるね。'],
      hit: ['相手のブロットを打てば、約{n}ピップも戻せるからね。', 'ヒットで相手の駒をバーへ！ 約{n}ピップぶん戻されるワン。', '1枚だけの相手の駒を打って、約{n}ピップ後ろへ下げられるね。', '打たれた駒は、約{n}ピップの道のりをやり直しなんだ。', 'ここで打てば、相手は約{n}ピップのふり出しに逆もどり！', '相手の駒を打ち落として、約{n}ピップのリードをもらえるワン。'],
      hit2: ['相手の駒を{k}枚まとめて打てば、相手は反撃どころじゃなくなるワン。', '{k}枚まとめてヒット！ 相手はバーから出すので手いっぱいになるね。', '一度に{k}枚を打てば、相手に攻め返す余裕がなくなるんだ。', '{k}枚ともバーへ送れば、相手は入り直すだけで精いっぱい！'],
      dance: ['打たれた相手が入れずに休む確率も、約{d}%あるんだ。', '相手がバーから入れずにお休みする確率は約{d}%。', '約{d}%で、相手は入れずに1回お休み（ダンス）ワン。', '相手は約{d}%の確率で、バーから出られずに足止めだね。', 'ふさいだポイントが多いから、相手が入れない確率は約{d}%もあるんだ。'],
      pt5: ['{P}は相手の後ろの駒の前をふさぐ、いちばん大事な場所だからね。', '{P}が取れたね！ 相手の後ろの駒の前に立ちはだかる急所ワン。', '{P}はインナーでいちばん価値のあるポイントなんだ。', '相手の後ろの駒の目の前にある{P}。ここをふさぐのが大きいね。', '{P}をおさえたから、相手の後ろの駒は前に出にくくなるワン。', '{P}を自分のものにして、相手の後ろの駒の行く手をさえぎったんだ。', '{P}は強い人がまっ先にほしがる場所だね。'],
      pt7: ['{P}をふさげば、相手の後ろの駒は6の目で飛び出せなくなるワン。', '{P}ができると、相手は6の目で逃げ出せないんだ。', '{P}をふさいで、相手の6の目の逃げ道を止めたね。', '{P}は壁のかなめ！ 相手の後ろの駒が飛び出しにくくなるね。', '{P}は、相手の後ろの駒が6の目で飛び出す先。そこをふさいだね。', '{P}を取ったから、相手の後ろの駒は6の目で飛び出せないワン。', '6の目の逃げ道を{P}でふさいだんだ。'],
      ptHome: ['{P}が増えると、打たれた相手の駒が入りにくくなるからね。', 'インナーに{P}ができて、相手の入り口が1つ減ったワン。', '{P}をふさげば、バーの相手の駒が戻りにくくなるんだ。', '{P}がふさがって、ゴール前の守りがまた1つ固くなったね。', '{P}を作って、相手がバーから入れる場所を減らしたワン。', '{P}がふさがれば、打たれた相手は戻るのに苦労するんだ。'],
      ptDeep: ['少し奥の{P}でも、ポイントにすれば相手の入り口が1つ減るワン。', '奥の{P}でも、ふさいでおけば相手が入りにくくなるね。', '{P}はゴールに近いけど、ポイントにする価値はちゃんとあるんだ。', '{P}をふさいで、相手の入れる場所をまた1つ消したね。', '奥の{P}も、相手の入り口を1つ減らす立派なポイントワン。'],
      ptOuter: ['{P}は相手の逃げ道をふさいで、駒を運ぶ中継にもなるからね。', '{P}ができると、相手の逃げ道が減って、自分の駒も運びやすくなるワン。', '外側の{P}は、壁にも中継地点にもなるんだ。', '{P}をふさげば、相手の逃げ道がまた1つ消えるね。'],
      anchor20: ['{P}に足場（アンカー）があれば、打たれても戻る場所になるワン。', '相手の陣地の{P}にアンカー！ 打たれても戻る場所ができたね。', '{P}に2枚そろえておけば、相手の陣地でも安心なんだ。', 'この足場があれば、後ろの駒は閉じ込められにくいね。', '相手のいちばんほしい場所を、先にもらっちゃったワン。', 'いちばん強いアンカーだから、外側の相手の駒もにらめるんだ。', '相手はここを壁に使えなくなるから、こっちは安心して待てるね。'],
      anchor: ['{P}に2枚の足場ができれば、閉じ込められにくくなるからね。', '{P}にアンカーを作って、閉じ込められる心配が減ったワン。', '{P}の足場があれば、後ろの駒も落ち着いて待てるんだ。', '相手の陣地に2枚の足場！ 打たれても戻る場所ができたね。'],
      ptMid: ['{P}が中盤の足場になって、駒を安全に運べるワン。', '{P}をポイントにして、中盤の中継地点ができたね。', '{P}があると、後ろの駒を安全に運んでこられるんだ。', '中盤に休める場所ができて、駒の行き来が楽になるね。'],
      prime: ['ポイントが{n}つ並んで、相手の駒の前に壁ができるからね。', '{n}つ続きのポイントで、相手の前に壁ができたワン。', 'ポイントが{n}つつながって、相手の駒が通りにくくなるんだ。', '{n}つ並びの壁！ 相手の後ろの駒は、そう簡単には越えられないね。'],
      prime6: ['6つ並んだ完全な壁で、相手は一歩も出られないワン！', 'ポイントが6つ並んだ完全なプライム！ 相手は出られないね。', '6つ続きの壁ができたから、相手の後ろの駒はもう動けないんだ。'],
      escape: ['後ろの駒が閉じ込められる前に、相手の陣地から逃げ出せるからね。', '後ろの駒を、閉じ込められる前に逃がせたワン。', '相手の陣地にいた駒が、ここで脱出できるんだ。', 'いちばん後ろの駒が動き出して、閉じ込められる心配が減ったね。', '壁ができる前に、後ろの駒を外へ出せたワン！'],
      raceA: ['接触がなくなって、リードしたままのレースになるワン。', 'もうぶつかる駒はない！ リードを守ったままレースに入れるね。', 'すれちがいが終わって、先を行くきみのレースになるんだ。', '打ち合いはおしまい！ あとは先を行くきみが走るだけだね。'],
      raceB: ['接触をなくして、あとはレース勝負にするからね。', '駒のすれちがいを終わらせて、レースに持ちこむワン。', 'ぶつかる駒をなくして、あとは走りっこの勝負なんだ。'],
      off: ['駒を{n}枚上げられるからね。', 'これで{n}枚を盤の外へ！', '{n}枚上げられる、いちばん速い出し方ワン。', '{n}枚をゴールから出せるんだ。', '{n}枚出して、ゴールに一歩近づいたね。', 'むだなく{n}枚を外へ出せる手ワン。', '{n}枚を一気にベアオフ！ 残りもぐっと減ったね。', '目をむだにしないで、{n}枚とも盤の外へ出せたんだ。'],
      raceMove: ['むだなく前へ進めて、上げやすい形に整えるワン。', 'むだのない進め方で、次に上げやすくなるね。', 'ゴールに向けて、目をむだにしない進め方なんだ。', 'インナーに入りきっていない駒を先に運ぶ、レースの基本だね。'],
      safe0: ['ブロットを残さないから、打たれる心配がないワン。', '1枚だけの駒を残さないから、打たれる目はゼロだね。', '打たれる駒が1枚もない、安全な形なんだ。', 'どの駒も2枚以上でそろっているから、相手は打てないね。', 'すき間なく駒を並べて、相手に当たり目をあげないワン。'],
      bold: ['わざと打たれる危険をとって、次にポイントを作る材料を置くからね。', '少し危なくても、次のポイント作りの材料を置くワン。', 'あえて1枚置いて、次の番にふさぐねらいなんだ。', '打たれる心配より、次の番に壁を作るチャンスを取ったね。', '打たれる危険はあっても、次にふさぐ材料を置く価値があるワン。', '次にふさぐための駒を、思い切って置いておくんだ。'],
      build: ['次の番にポイントを作れる目が{a}通りもあるワン。', 'これで次の番、{a}通りの目で新しくふさげるね。', '材料がそろって、{a}通りの目で次に壁ができる形なんだ。', '駒をばらしておいたから、{a}通りの目で次にふさげるワン。', '{a}通りの目で、次の番に新しい足場が作れるね。'],
      unstack: ['重なった駒をほぐして、使える駒を増やせるからね。', '1か所に重なった駒を散らして、動かしやすくしたワン。', '重なりをほぐして、次に使える駒を増やすんだ。'],
      quiet: ['駒の配置のバランスがいちばん良いからね。', '駒がバランスよく散らばる、落ち着いた手ワン。', 'どの駒もむりなく働ける配置になるんだ。', '次の目にも対応しやすい、バランスのいい形だね。', 'むりのない形を保って、次の番に備える手ワン。', '形をくずさずに進める、ていねいな一手だね。', 'あわてずに形を整える、じょうずな一手なんだ。', 'どこにもすきを作らない、きれいな動かし方ワン。', '先の展開まで考えた、むだのない置き方！', '次の番のことまで見通した、手堅い動かし方だね。', 'ひとつひとつの駒が、ちゃんと役目を持てる並びなんだ。', 'あとで困らないように、今のうちに形を整えておく手ワン。'],
    },
    vs: {
      noHit: ['きみの手は打つチャンスを見送っちゃうから、相手を自由に動かせちゃう。', 'きみの手だとヒットを見送るから、相手がのびのび動けるワン。', '打てる駒を打たないと、相手に立て直す時間をあげちゃうんだ。', 'ここで打たないと、相手の駒は無事に逃げられちゃうね。'],
      noPoint: ['きみの手だと{P}が作れないままになるワン。', 'きみの手では{P}が空いたままだから、せっかくのチャンスを逃しちゃう。', '{P}をふさがないと、そのぶん相手が楽になるね。', 'きみの手だと{P}がふさがらないから、相手の通り道が残るんだ。'],
      broke: ['きみの手は{P}をくずすから、せっかくの壁が弱くなるんだ。', '{P}をくずすと、作った壁にすき間ができちゃうワン。', 'きみの手だと{P}がばらけて、壁が弱くなるね。'],
      shots: ['きみの手は打たれる目が{a}通りもあるから、緑の手の{b}通りより危ないワン。', '打たれる目は、きみの手だと{a}通り、緑の手なら{b}通り。そのぶん危ないんだ。', 'きみの手だと相手の当たり目が{a}通り。緑の手より{c}通りも多いね。', 'きみの手だと{a}通りで打たれるから、{b}通りの緑の手より危険なんだ。'],
      shots0: ['きみの手はブロットが残って、{a}通りの目で打たれちゃう。緑の手なら打たれる目はゼロなんだ。', 'きみの手だと1枚だけの駒が残るから、{a}通りで打たれるワン。緑の手は打たれないね。', 'ブロットを残すと{a}通りの目で打たれちゃう。緑の手なら0通りなんだ。', 'きみの手だと{a}通りの当たり目ができるね。緑の手は1枚も打たれない形なんだ。', 'きみの手は1枚だけの駒ができるから、相手に{a}通りのチャンスをあげちゃうワン。'],
      stuck: ['きみの手だと後ろの駒が残って、閉じ込められる危険が続くワン。', '後ろの駒を置いたままだと、閉じ込められる心配が消えないね。', 'きみの手では後ろの駒が取り残されるから、逃げ道がせまくなるんだ。'],
      build: ['きみの手だと、次にポイントを作れる目が{c}通り減っちゃうから、少し損なんだ。', 'きみの手だと、次の番にふさげる目が緑の手より{c}通り少なくなるワン。', '緑の手なら次の番の材料が多いから、ふさげる目が{c}通り多いね。'],
      stack: ['きみの手は{n}枚が1か所に重なって、駒が使いにくくなるワン。', '{n}枚も1か所に積み上がると、動かしにくくなるんだ。', 'きみの手だと駒が{n}枚重なって、次の目で使える駒が減っちゃうね。'],
      off: ['きみの手だと、上げる駒が{n}枚少なくなるからね。', 'きみの手だと緑の手より{n}枚少なくしか上げられないワン。', '上げられる駒が{n}枚減ると、ゴールが遠くなるんだ。', 'きみの手は目をむだにしちゃうから、{n}枚ぶん上がりが遅れるね。'],
      close: ['差はほんの少しだけど、細かい駒の置き方で緑の手がわずかに上だからね。', 'ほんの少しの差だけど、駒の置き方を比べると緑の手がわずかに上ワン。', 'どちらも悪くないけど、緑の手のほうが駒の並びがわずかに良いからね。', '悪い手じゃないよ。でも並べ方を比べると、緑の手がほんの少し上なんだ。', 'きみの手も十分だけど、細かく比べると緑の手のほうが形がいいワン。'],
    },
    hint: {
      hit: ['相手のブロット（1枚だけの駒）に届く目がないか、数えてみて！', '1枚だけの相手の駒、どこかで打てないかな？', '相手の駒が1つだけの場所に、ぴったり止まれる目はある？', 'ひとりぼっちの相手の駒、ねらえそう？', 'ヒットのチャンスがかくれているかも！ 相手の駒を見てワン。'],
      hit2: ['相手のブロット、1枚だけじゃないね。まとめて狙ってみて！', '打てそうな相手の駒、2枚あるかも？', '一度に2枚打てる動かし方、さがしてみてワン！'],
      enter: ['まずはバーの駒からだね。', 'バーにいる駒、忘れてないかな？', 'バーの駒を入れるのが先！ どこに入れる？', 'バーの駒が先決ワン。入ったあとの残りの目も考えてね。'],
      pt: ['2枚を同じ場所にそろえれば、ポイントが作れそうだね。', '2つの目で、同じ場所に2枚そろえられないかな？', '新しいポイントを作れる組み合わせ、あるかも！', '2枚が同じ場所に止まれる目の組み合わせを探してワン。', '壁を伸ばせる場所はどこだろう？'],
      anchor: ['後ろの2枚を同じ場所にそろえる手もあるワン。', '相手の陣地で、2枚そろえて足場にできない？', '後ろの駒どうしで、ポイントを作れないかな？', '相手の陣地に、2枚で守れる場所はある？'],
      escape: ['後ろの駒、そろそろ相手の陣地から逃がしたくない？', 'いちばん後ろの駒、閉じ込められる前に動かせる？', '逃げ出すなら今かも？ 後ろの駒を見て！', '相手の壁が完成する前に、できることはないかな？'],
      build: ['すぐポイントにならなくても、次に作る材料を置く手があるワン。', '次の番にポイントを作るための駒を置けないかな？', '今すぐじゃなく、次に作る準備をする手もあるね。', '次の番を楽にする駒の置き方、考えてみて！'],
      safe0: ['ブロットを残さない、安全な形を探してみて。', '1枚だけの駒が残らない動かし方はどれ？', '打たれる駒を残さない手、あるかな？', '全部の駒を2枚ずつそろえられる動かし方は？'],
      off: ['何枚上げられるか、目の組み合わせを数えてみて！', 'いちばん多く駒を上げられるのは？', '目をむだにせず、何枚出せるか考えてみて！', 'どの目でどの駒を出すか、順番に考えてみてワン。', '出せる駒は出す、が基本！ でも順番も大事だね。'],
      raceMove: ['レースはむだなく前へ。いちばん後ろの駒から考えてみてワン。', 'むだのない進め方はどれかな？', 'いちばん遠い駒から近づけてみよう！', 'インナーの外にいる駒、先に運べない？'],
      def: ['後ろの駒と中盤の駒、どっちを動かすか考えてみて！', 'どの駒を動かすと、形がいちばん整うかな？', '打たれにくくて、次につながる形はどれだろう？', 'ひとつひとつの手を、動かしたあとの形で比べてみてワン。', 'あせらず、駒の並びがきれいになる手を探そう！'],
    },
  };
  // (2026-11-22 lesson loop) the lessons' intros for the 3D table in ダイスン's words, Japanese: short (a phone bubble of 4 pages at most),
  // the step's text and its three principles (backgammon/i18n-ls2.js keys) told in one; no point numbers (the 3D board has none)
  const BGJ_LS_INTRO = {
    move: "サイコロの目の1つずつが1回の移動で、ゾロ目なら4回動けるワン！<br>相手の駒が2個以上いる場所には止まれないから気をつけて。まずはポイント作りに挑戦しよう！",
    enter: "打たれた駒は真ん中のバーへ。バーに駒があるうちは、ほかの駒は動かせないんだ。<br>まずは相手のインナー（右上）に入れ直そう。出た目の場所がふさがっていたら入れなくて、2つともだめなら1回お休み（ダンス）ワン。<br>入るついでに打てないか、入った駒が安全かも見てね！",
    hit: "1個だけの駒をブロットっていうんだ。相手のブロットにぴったり止まればヒット！ その駒をバーへ送れるワン。<br>遠くまで来た駒ほど、打たれたときの損は大きいね。打ったあと、自分のブロットに何通り当たるかも数えよう。",
    bearoff: "15個ぜんぶがインナーに入ったら、駒を盤の外へ出すベアオフの始まり！<br>出た目と同じ場所の駒を出せて、それより奥に駒がなければ、大きい目で奥の駒も出せるんだ。<br>相手の駒が近くにいるうちは、ブロットを作らない出し方がいちばんワン。",
    open1: "最初の1手には、だいたい決まった指し方があるんだ。3-1・4-2・5-3・6-1は、2つの駒で新しいポイントを作れる当たりの目ワン！<br>3-1ならゴールデンポイント、6-1ならバーポイント。ポイントが並ぶほど、相手の奥の2個は逃げにくくなるね。",
    open2: "ポイントが作れない目なら「走る」か「分ける」が基本だね。<br>6-5は、いちばん奥の駒をミッドポイントまで一気に走らせる手。2-1・4-1・5-1は、外側に1個降ろして奥の2個を分けるのが定番なんだ。<br>降ろした駒は、次にポイントを作る材料になるワン。",
    open3: "2手目からはゾロ目も出るワン。同じ数で4回動けるから、ポイントを2つ一度に作れる大チャンス！<br>相手がブロットを残していたら、打つのも有力なんだ。まずは相手の最初の1手で、盤のどこが変わったかを見てから考えよう。",
    prime: "駒が2個以上ある場所はポイント。相手はそこに止まれないんだ。<br>ポイントが横に並ぶとプライム、つまり壁になるワン。壁の後ろに相手の駒がいるほど強くて、6つ続けばもう一歩も出られない！<br>今あるポイントのとなりに作って、壁を伸ばしていこうね。",
    anchor: "相手のインナーに2個以上で作ったポイントがアンカー。打たれてもそこへ戻れるから、閉じ込められにくくなるんだ。<br>いちばん強いのは、相手のゴールデンポイントのアンカーワン！<br>不利なときや攻められているときは、まず足場を作って落ちつこうね。",
    blitz: "相手の駒がバーにいて、こっちのインナーにポイントが多いならブリッツのチャンス！<br>どんどん打って、ポイントを増やして、相手を入れなくしちゃおう。インナーを全部ふさげば、ギャモン勝ちも見えてくるワン。<br>少しのブロットより、攻めの手を止めないのがコツなんだ。",
    escape: "まずはピップを数えて、先を行っているか確かめよう。<br>リードしているなら、後ろの駒を逃がしてレースにしちゃうのが近道ワン。<br>遅れているときは、あわてて逃げるより、アンカーを守って相手のすきを待つほうがいいこともあるんだ。",
    safe: "ブロットを残すと、相手のサイコロで打たれるかもしれないね。すぐ近くなら36通り中11〜17通り、遠くならぐっと減るんだ。<br>でも安全がいつも正解とはかぎらないワン。大事なポイントの準備なら、少しの危険はがまんする価値がある！",
    shots: "サイコロ2個の出方は36通り。距離が6以内なら、その数が出る11通りに、2つの目の合計で届く組み合わせを足すんだ。<br>距離7以上は合計かゾロ目だけだから、ぐんと少なくなるワン。途中がふさがっていると、合計の目は届かないね。",
    bold: "ブロットはこわいけど、安全がいつも正解とはかぎらないんだ。<br>相手のインナーが弱くて打たれても損が小さいなら、次にポイントを作るための駒（スロット）を置くほうが得なこともあるワン。<br>何通りで打たれるか、打たれたらどれだけ困るかで決めよう！",
    race: "おたがいの駒がすれちがったら、あとはレース！ 全部の駒をゴールさせるのに必要な目の合計をピップっていうんだ。最初はどちらも167。<br>ピップが少ないほうが有利ワン。駒をむだなく、早くインナーへ運ぼうね。",
    bearcontact: "ベアオフ中でも、相手のアンカーが残っていたら油断は禁物！ ブロットを打たれると大逆転もあるんだ。<br>ここはたくさん出すより安全が先ワン。偶数の駒を残す、奥から片づける、が基本だね。",
    bearopt: "相手の駒がいないベアオフは、出しきるまでの回数を少なくするのが目標ワン。<br>できるだけたくさん出す。出せないときは空いたポイントを埋めて、次の目をむだにしない。<br>高いところに積みすぎると、大きい目がむだになっちゃうんだ。",
    cube: "サイコロを振る前、自分の番に「ダブル」と言えば、点を2倍にしようと持ちかけられるんだ。相手はテイク（受けて続ける）かパス（1点払って降りる）を選ぶワン。<br>ダブルは「かなり有利、でも相手がまだ受けられる」くらいがちょうどいい。有利すぎるなら、ダブルせずにギャモンを狙う手もあるね。",
    racecube: "レースなら、ピップの差でキューブを決められるワン。リード率は、ピップの差 ÷ 自分の番の側のピップ。<br>目安は8%でダブル、9%でリダブル、12%をこえると相手はパス！ 100ピップと110ピップならリード10%だから、ダブル・テイクなんだ。",
    takepoint: "ダブルされたら、勝ち目が25%くらいあればテイク、なければパスが基本ワン。テイクして負けると2点、パスなら1点ですむからね。<br>ギャモン負けの危険が大きいときは、もう少し勝ち目がほしいんだ。",
    backgame: "ピップで大きく遅れたら、相手のインナーにアンカーを2つ持って、相手が帰ってくるときのブロットを待つ作戦があるんだ。これがバックゲーム！<br>大事なのはタイミング。前に進みすぎて形をくずさないようにしようね。打てても自分のインナーがボロボロだと勝てないワン。",
    holding: "相手のインナーにアンカーを1つ持って、相手の駒が前を通るときに打つチャンスを待つ。これがホールディングゲームワン。<br>アンカーはかんたんに手放さないで、相手が通る外側をにらめる場所に駒を置いておこうね。",
    gammon: "相手が1個も出さないうちに全部出しきるとギャモンで2点！ 大きくリードしているなら、ギャモンを狙うほうが得なこともあるんだ。<br>反対に負けそうなときは、ギャモン負けをさけるのが先ワン。後ろの駒を早めに帰そうね。",
  };
  function bgVoice(id) {
    let h = shSeed('bg' + id); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; h = Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0; const seed = (h ^ (h >>> 16)) >>> 0;
    const perm = (sd, n) => { const a = [...Array(n).keys()]; let x = sd >>> 0 || 1; for (let i = n - 1; i > 0; i--) { x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; x = Math.imul(x ^ (x >>> 12), 0x297a2d39) >>> 0; x = (x ^ (x >>> 15)) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };   // (well mixed: shPerm's low bits gave two lessons one order)
    const O = BGV, pc = perm(seed, O.cheer.length), ps = perm((seed ^ 0x9e3779b9) >>> 0, O.soft.length), pp = perm((seed ^ 0x51ed27f1) >>> 0, O.push.length);
    const cnt = {}, used = new Set(), gram = new Map(), sn = t => (String(t).replace(/<[^>]+>/g, '').match(/[^。！？]+[。！？]*/g) || []).map(x => x.trim()).filter(x => x.length >= 5);
    const gr = t => { const x = String(t).replace(/<[^>]+>/g, '').replace(/[\s、。！？!?「」（）()・…〜♪]/g, ''), g = new Set(); for (let k = 0; k + 10 <= x.length; k++) g.add(x.slice(k, k + 10)); return g; };
    const mark = t => { if (!t) return t; sn(t).forEach(x => used.add(x)); gr(t).forEach(g => gram.set(g, (gram.get(g) || 0) + 1)); return t; };
    const free = t => !sn(t).some(x => used.has(x)) && ![...gr(t)].some(g => (gram.get(g) || 0) >= 2);
    // v(key, list, avoidEnd): the next free wording of the list (not opening with the ending just said, when another will do)
    const v = (key, arr, avoid) => { const c = cnt[key] = (cnt[key] || 0) + 1; let pick = null;
      for (let pass = 0; pass < 3 && pick == null; pass++) for (let k = 0; k < arr.length; k++) { const t = arr[(seed + c - 1 + k) % arr.length];
        if (pass < 2 ? !free(t) : sn(t).some(x => used.has(x))) continue; if (pass === 0 && avoid && rvEndOf((String(t).match(/[^。！？]+[。！？]*/) || [''])[0]) === avoid) continue; pick = t; break; }
      return mark(pick != null ? pick : arr[(seed + c - 1) % arr.length]); };
    const vTry = (key, arr) => { const c = cnt[key] = (cnt[key] || 0) + 1; for (let k = 0; k < arr.length; k++) { const t = arr[(seed + c - 1 + k) % arr.length]; if (free(t)) return mark(t); } return ''; };
    let pn = 0; const ptName = (i, base) => { const L0 = i >= 1 && i <= 4 ? [base, `インナーで右から${i}つ目のポイント`, `右から${i}番目のインナーのポイント`] : i === 6 ? [base, 'インナーのいちばん左のポイント', 'バーのすぐ右のポイント'] : i === 20 ? [base, 'ゴールデンポイント（相手の陣地）', '相手の陣地の、ゴールデンポイント'] : [base]; return L0[(seed + pn++) % L0.length]; };   // (one point, said in other words in turn)
    const tic = t => { let n = 0; return String(t).replace(/ワン([。！])/g, (a, e) => n++ ? e : a); };   // (one ワン a bubble is enough)
    return { v, vTry, ptName, mark, free, seed, tic, cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]] };
  }
  const bgEndLast = t => { const s = (String(t).replace(/<[^>]+>/g, '').match(/[^。！？]+[。！？]+|[^。！？]+$/g) || []).map(x => x.trim()).filter(Boolean); return s.length ? rvEndOf(s[s.length - 1]) : ''; };
  const bgFin = (V, t, prev) => rvEnds(V.tic(String(t).replace(/ゾロ目の目/g, 'ゾロ目')), prev || '!').t.replace(/([！？])(?=[^\s<」）！？])/g, '$1 ');
  // the choice questions in the lesson's voice (V): a question of their own after the first, a hint that is not the same each time,
  // right → praise + the reason from the values (+ a push), wrong → soft words + the right answer + why the chosen one is off
  function bgChJaV(p, N, V, pi, last, sid) {
    const P = p.P, v = P.qv || {}, opt = i => { const o = P.opts[i]; return Array.isArray(o) ? o : [o]; }, c = '<b>' + N.c + '</b>', o2 = '<b>' + N.o + '</b>', q = P.q;
    const AQ = {
      race: ['次の局面もピップを数えてみて！ リードしてるのはどっち？', '今度はどうかな？ どっちがどれだけ先を行ってる？', 'もう一度ピップ勝負！ 先を行ってるのはどっち？'],
      shots: ['同じように数えてみよう。印のブロットに、相手が当てられる目は何通り？', '次のブロットはどうかな？ 36通りのうち、当たる目を数えてワン！', 'これは何通りで当たる？ 足し算の目も忘れずにね。'],
      double: ['今度はどうかな。サイコロを振る前に、ダブルする？', `${c}の番。ダブルのタイミングかな？ それともまだ待つ？`, 'この局面、きみならキューブを使う？ 相手は受けそう？', 'もう1問！ ダブルする？ 相手はテイクする？'],
      take: [`${o2}がまたダブルしてきた！ テイクする？ パスする？`, 'この局面でダブルされたら、受ける？ 降りる？', `さて、次はどうする？ ${c}はテイク？ それともパス？`],
    };
    const LQ = { race: '最後の1問ワン！ リードしてるのはどっち？', shots: '最後の1問！ 印のブロットに当たる目は何通り？', double: '最後の1問ワン！ ダブルするか、待つか、決めてみて。', take: '最後の1問ワン！ テイクかパスか、決めてみて。' };
    if (pi > 0 && AQ[q]) p.ask = last ? LQ[q] : V.v('ask:' + q, AQ[q]); V.mark(p.ask);
    const HQ = {
      race: ['いちばん奥の駒から順に、ゴールまでの残りを足してみて！', 'ゴールまでの残りマス × 駒の数を、ポイントごとに足していくワン。', '差が小さいときほど、ていねいに数えよう！'],
      shots: ['すぐ近くなら直接の目だけで11通り。そこに足し算の目を足していこう！', '2つの目の合計で届く組み合わせも数えてね。', '途中にきみのポイントがあると、相手の足し算の目は止まっちゃうワン。', 'ゾロ目は4回動けるから、遠くまで届くこともあるね。'],
      double: ['勝つチャンスがどれくらいか、局面を見て考えてみて！', 'ダブルは「十分有利、でも相手がまだ受けられる」くらいがちょうどいいワン。', '有利すぎるなら、ダブルせずにギャモンをねらう手もあるワン。', '相手が受けたくなるか、降りたくなるか、相手の立場で考えてみよう！'],
      take: ['ギャモン負けが多いと、テイクは危なくなるワン。', 'パスなら1点、テイクして負ければ2点。どっちの損が小さいかな？', '相手のインナーの強さや、閉じ込められた駒の数も見てみて！', '勝ち目が4回に1回より多くありそうか、考えてみて。', 'ピップの差と、相手の壁の強さを見くらべてみよう！', 'もし受けたら、どれくらい逆転のチャンスがあるかな？'],
    };
    const h0 = p.hintTx;
    p.hintTx = bgFin(V, pi === 0 && h0 && V.free(h0) && (q !== 'double' || sid === 'racecube') ? V.mark(h0) : HQ[q] ? V.v('h:' + q, HQ[q], bgEndLast(p.ask)) : h0, bgEndLast(p.ask));
    const pc = x => Math.round(+x || 0), lose = pc(v.l);
    const why = () => {
      if (q === 'race') { const d = Math.abs(v.a - v.b), L = v.a < v.b ? c : o2;
        return d ? V.v('w:race', [`ピップは${c}が${v.a}、${o2}が${v.b}。${L}が${d}ピップ少ない、つまりリードしてるんだ。`, `数えると${c}は${v.a}、${o2}は${v.b}ピップ。差の${d}ピップぶん、${L}が先を行ってるワン。`, `${L}のほうがゴールまで${d}ピップ近いね。${c}${v.a}、${o2}${v.b}で比べたとおり！`])
          : V.v('w:race0', [`どっちも${v.a}ピップで同じ。こういうときは、先にサイコロを振れる側がちょっと有利なんだ。`, `${v.a}ピップどうしの横並び！ 自分の番の側が少しだけ得ワン。`]); }
      if (q === 'shots') return V.v('w:shots', [`ブロットまでの距離は${v.d}。直接の目と足し算の目を合わせて${v.n}通り、約${v.p}%で当たるんだ。`, `距離${v.d}のブロットに当たる目は${v.n}通り。36通りのうち約${v.p}%ワン。`, `直接の目に足し算の目も加えて、ちょうど${v.n}通り。距離${v.d}なら約${v.p}%で当たるね。`, `距離は${v.d}。数えると${v.n}通りだから、当たるのは約${v.p}%なんだ。`]);
      const w = P.why, p0 = v.p;
      if (w === 'nd') return V.v('w:nd', [`勝つチャンスは約${p0}%。まだダブルには早いから、待つのがいちばんなんだ。`, `約${p0}%なら、まだ様子見ワン。キューブは手元に置いておこう！`, `勝ち目は約${p0}%。もう少し有利になってからダブルしても遅くないね。`]);
      if (w === 'dt') return V.v('w:dt', [`勝つチャンスは約${p0}%。ダブルするならここ！ でも相手はまだテイクできる局面なんだ。`, `約${p0}%まで来たら、ダブルのタイミングワン！ 相手はまだ受けて戦えるね。`, `勝ち目は約${p0}%。相手がテイクしたくなる、ちょうどいいダブルなんだ。`]);
      if (w === 'dp') return V.v('w:dp', [`勝つチャンスは約${p0}%。ここまで有利なら、ダブルすれば相手はパスするしかないんだ。`, `約${p0}%もあれば、相手は受けられないワン。ダブルで1点を確保！`, `勝ち目は約${p0}%。相手がテイクすると損をするほどの差なんだ。`]);
      if (w === 'tg') return V.v('w:tg', [`勝つチャンス約${p0}%、ギャモン${v.g}%。ダブルするとパスされて1点で終わるから、続けてギャモンを狙うんだ。`, `ギャモン勝ちが${v.g}%もあるから、ダブルせずに2点をねらうワン！`, `約${p0}%で勝てて、ギャモンも${v.g}%。ダブルで1点にしちゃうのはもったいないね。`]);
      if (w === 'take') return V.v('w:take', lose >= 20 ? [`勝つチャンスは約${p0}%。ギャモン負けが${lose}%あっても、パスで1点払うより戦ったほうが損は小さいんだ。`, `ギャモン負けの心配は${lose}%あるけど、約${p0}%の勝ち目があるから受けて戦えるワン！`, `勝ち目約${p0}%。ギャモン負け${lose}%を入れても、テイクのほうが得なんだ。`]
        : [`勝つチャンスは約${p0}%、ギャモン負けは${lose}%。25%をこえているから、テイクしてがんばれるんだ。`, `約${p0}%の勝ち目があるから、受けて戦えるワン！ ギャモン負けも${lose}%ですむね。`, `勝ち目${p0}%なら、パスで1点払うより戦ったほうが得なんだ。`]);
      if (w === 'pass') return V.v('w:pass', +p0 >= 25 && lose >= 15 ? [`勝ち目は約${p0}%あっても、ギャモン負けが${lose}%もあるから、テイクすると損が大きいんだ。`, `ギャモン負け${lose}%は重いワン。約${p0}%の勝ち目では、受けると平均で1点より多く失うね。`, `約${p0}%勝てても、${lose}%のギャモン負けで2倍、4倍の点を失う危険があるんだ。`]
        : [`勝ち目は約${p0}%しかないから、受けると平均で1点より多く失うんだ。`, `約${p0}%では25%に届かないワン。1点で手を打つのがいちばんだね。`, `勝つチャンスが約${p0}%だと、テイクしても取り返すのはむずかしいんだ。`]);
      return '';
    };
    const pickWrong = u => typeof u === 'number' && u !== P.ans ? u : P.opts.findIndex((x, i) => i !== P.ans);
    p.ownHead = true;
    p.good = () => bgFin(V, V.cheer(pi) + ' ' + why() + (pi % 2 === 1 || last ? ' ' + V.push(pi) : ''), '!');
    p.ng = u => {
      const i = pickWrong(u), [k, n] = opt(i), [ka] = opt(P.ans), S = V.soft(pi) + ' ';
      if (q === 'race') {
        const lead = v.a === v.b ? '' : v.a < v.b ? c : o2;
        const pre = k === ka ? V.v('n:race1', ['リードしてる側は合ってるワン。でも差の数がちがうね。', '先を行ってる側は正解！ 差の数だけずれちゃったね。']) : lead ? V.v('n:race2', [`正解は${lead}のリードワン。`, `先を行ってるのは${lead}のほうなんだ。`, `リードしてるのは${lead}だったね。`]) : '実は、どっちも同じピップなんだ。';
        const why2 = V.v('n:race3', ['見た目の駒の数だと、ゴールまでの残りの差を見落としちゃうからね。1枚ずつ足して比べるのがコツ！', '駒の数より、1枚ずつの残りの道のりを足すと、差がはっきりするワン。', '奥にいる駒ほどピップが大きいから、そこを数えもらすと差が変わっちゃうんだ。']);
        return bgFin(V, S + pre + `数えると${c}が${v.a}、${o2}が${v.b}` + (v.a === v.b ? 'で同じ。' : `で、差は${Math.abs(v.a - v.b)}ピップ。`) + why2, '!');
      }
      if (q === 'shots') return bgFin(V, S + `正解は${v.n}通り。` + V.v('n:shd', [`距離${v.d}のブロットだね。`, `ブロットまでは${v.d}つ。`, `相手の駒からブロットまで${v.d}つの距離ワン。`]) + (n < v.n ? V.v('n:sh1', ['直接の目だけじゃなく、2つの目の合計やゾロ目でも届くから、そのぶん増えるんだ。', '足し算の目やゾロ目も数えると、当たる目はもっと多くなるワン。', '直接の目だけだと少なくなっちゃう。合計で届く目も足すと答えになるね。', 'ゾロ目は4回動けるから、思ったより遠くまで届くんだ。', '2つの目の合計で止まれる組み合わせ、数えもれがあったかも？ そこを足すと答えになるワン。', '片方の目だけで届く目に、合計で届く目を加えると、数がそろうね。']) : V.v('n:sh2', ['途中にきみのポイントがあると、相手の足し算の目は届かないから、そのぶん減るんだ。', '少し数えすぎだね。ふさがった道を通る目は届かないから、数から引くワン。', '同じ組み合わせを二度数えていないかな？ 1通りずつ数えると答えになるね。', '合計で届く目でも、途中で止まる場所がふさがっていたら当たらないんだ。', '遠い組み合わせを入れすぎたかも？ 届かない目を引くと答えになるワン。'])), '!');
      const w = P.why, A = { nd: 'ノーダブル', dt: 'ダブル（相手はテイク）', dp: 'ダブル（相手はパス）', tg: 'ノーダブル', take: 'テイク', pass: 'パス' };
      let x = '';
      if (w === 'nd') x = V.v('n:nd', ['ここでダブルするのは早すぎるワン。相手にキューブを渡すと、2倍の点で逆転されるチャンスをあげちゃうんだ。', 'まだ有利さが足りないから、ダブルすると相手は喜んで受けちゃうね。', '今ダブルすると、キューブが相手のものになって、逆転のときに痛いんだ。']);
      else if (w === 'tg') x = V.v('n:tg', ['ダブルすると相手はパスして、1点で終わっちゃうワン。ギャモン勝ち（2点）を狙えるのに、もったいないんだ。', '有利すぎるときにダブルすると、相手はパスして1点だけ。ギャモンの2点をねらえるのに損だね。']);
      else if (w === 'dt') x = k === 'nd' ? V.v('n:dt1', ['待ちすぎワン！ 次に有利になりすぎると、相手にパスされて1点しか取れなくなるんだ。', '今ダブルしないと、次の番には相手がパスできる差になって、1点止まりになるからね。']) : V.v('n:dt2', ['相手はまだテイクできる局面ワン。パスすると決めつけるのは、ちょっと楽観しすぎなんだ。', '相手にはまだ受けて戦う理由があるから、テイクしてくるね。']);
      else if (w === 'dp') x = k === 'nd' ? V.v('n:dp1', ['ここで待つと、逆転される危険が残るワン。ダブルして1点を確実にもらうんだ。', 'これだけ有利なら、ダブルで相手を降ろせるから、待つと逆転の危険だけが残るね。']) : V.v('n:dp2', ['相手がテイクすると損をする局面ワン。テイクすると見るのは、相手に甘すぎるね。', 'ここまで差があると、相手は受けると損だから、パスするしかないんだ。']);
      else if (w === 'take') x = V.v('n:take', ['パスすると1点を確実に失うワン。テイクして戦ったほうが、平均の損は小さいんだ。', 'まだ勝ち目が十分あるから、ここで降りるのはもったいないね。', 'パスで1点払うより、受けて逆転をねらうほうが損が少ないんだ。']);
      else if (w === 'pass') x = +v.p >= 25 ? V.v('n:pass1', ['勝てる見こみが25%をこえていても、ギャモン負けが多いから、テイクすると損が大きいワン。ここは1点で手を打つんだ。', 'ギャモン負けが重いから、受けると2倍以上の点を失いやすいね。']) : V.v('n:pass2', ['テイクすると、2倍の点を失う危険が大きすぎるワン。ここは1点で手を打つのが正解なんだ。', '勝ち目が25%に届かないから、受けると損が大きくなるね。']);
      return bgFin(V, S + `正解は<b>${A[w] || ''}</b>（勝ち目約${v.p}%` + (/take|pass/.test(w) ? `、ギャモン負け${lose}%` : w === 'tg' ? `、ギャモン${v.g}%` : '') + '）。' + x, '!');
    };
  }
  // the choice questions' words (ダイスン): right → the reason; wrong → the answer, and why the chosen one is off
  function bgChJa(p, N, hs) {
    const P = p.P, v = P.qv || {}, opt = i => { const o = P.opts[i]; return Array.isArray(o) ? o : [o]; }, c = '<b>' + N.c + '</b>', o2 = '<b>' + N.o + '</b>';
    const why = () => {
      if (P.q === 'race') { const d = Math.abs(v.a - v.b); return d ? `ピップは${c}が${v.a}、${o2}が${v.b}。${v.a < v.b ? c : o2}が${d}ピップ少ない、つまりリードしてるんだ。` : `どっちも${v.a}ピップで同じ。こういうときは、自分の番の側がちょっと有利なんだ。`; }
      if (P.q === 'shots') return `ブロットまでの距離は${v.d}。直接の目と足し算の目を合わせて${v.n}通り、約${v.p}%で当たるんだ。`;
      const w = P.why;
      if (w === 'nd') return `勝てる見こみは約${v.p}%。まだダブルには早いから、待つのがいちばんなんだ。`;
      if (w === 'dt') return `勝てる見こみは約${v.p}%。ダブルするならここ！ でも相手はまだテイクできる局面なんだ。`;
      if (w === 'dp') return `勝てる見こみは約${v.p}%。ここまで有利なら、ダブルすれば相手はパスするしかないんだ。`;
      if (w === 'tg') return `勝てる見こみ約${v.p}%、ギャモン${v.g}%。ダブルするとパスされて1点で終わるから、続けてギャモンを狙うんだ。`;
      if (w === 'take') return `勝てる見こみは約${v.p}%、ギャモン負けは${v.l}%。25%をこえていれば、テイクしてがんばれるんだ。`;
      if (w === 'pass') return `勝てる見こみは約${v.p}%、ギャモン負けが${v.l}%もある。テイクすると平均で1点より多く失うんだ。`;
      return '';
    };
    const pickWrong = u => typeof u === 'number' && u !== P.ans ? u : P.opts.findIndex((x, i) => i !== P.ans);
    p.good = () => BGJ_OP.chGood[hs % BGJ_OP.chGood.length] + why();
    p.ng = u => {
      const i = pickWrong(u), [k, n] = opt(i), [ka] = opt(P.ans);
      if (P.q === 'race') {
        const lead = v.a === v.b ? '' : v.a < v.b ? c : o2;
        const pre = k === ka ? 'リードしてる側は合ってるワン。でも差の数がちがうね。' : lead ? `リードしてるのは${lead}のほうワン。` : '実は、どっちも同じピップなんだ。';
        return pre + `数えると${c}が${v.a}、${o2}が${v.b}` + (v.a === v.b ? 'で同じ。' : `で、差は${Math.abs(v.a - v.b)}ピップ。`) + '見た目の駒の数だと、ゴールまでの残りの差を見落としちゃうからね。1枚ずつ足して比べるのがコツ！';
      }
      if (P.q === 'shots') return `正解は${v.n}通りワン。` + (n < v.n ? '数えもれがあるね。直接の目だけじゃなく、2つの目の合計やゾロ目でも届くから、そのぶん増えるんだ。' : '少し数えすぎだね。途中が相手のポイントでふさがると、足し算の目は届かないから、そのぶん減るんだ。') + `ブロットまでの距離は${v.d}。`;
      const w = P.why, A = { nd: 'ノーダブル', dt: 'ダブル（相手はテイク）', dp: 'ダブル（相手はパス）', tg: 'ノーダブル', take: 'テイク', pass: 'パス' };
      let x = '';
      if (w === 'nd') x = 'ここでダブルするのは早すぎるワン。相手にキューブを渡すと、2倍の点で逆転されるチャンスをあげちゃうんだ。';
      else if (w === 'tg') x = 'ダブルすると相手はパスして、1点で終わっちゃうワン。ギャモン勝ち（2点）を狙えるのに、もったいないんだ。';
      else if (w === 'dt') x = k === 'nd' ? '待ちすぎワン！ 次に有利になりすぎると、相手にパスされて1点しか取れなくなるんだ。' : '相手はまだテイクできる局面ワン。パスすると決めつけるのは、ちょっと楽観しすぎなんだ。';
      else if (w === 'dp') x = k === 'nd' ? 'ここで待つのはもったいないワン。逆転される危険を残すより、ダブルして1点を確実にもらうんだ。' : '相手がテイクすると損をする局面ワン。テイクすると見るのは、相手に甘すぎるね。';
      else if (w === 'take') x = 'パスすると1点を確実に失うワン。テイクして戦ったほうが、平均の損は小さいんだ。';
      else if (w === 'pass') x = +v.p >= 25 ? '勝てる見こみが25%をこえていても、ギャモン負けが多いから、テイクすると損が大きいワン。ここは1点で手を打つんだ。' : 'テイクすると、2倍の点を失う危険が大きすぎるワン。ここは1点で手を打つのが正解なんだ。';
      return `正解は<b>${A[w] || ''}</b>（勝てる見こみ約${v.p}%` + (/take|pass/.test(w) ? `、ギャモン負け${v.l}%` : w === 'tg' ? `、ギャモン${v.g}%` : '') + '）。' + x;
    };
  }
  const BACKGAMMON = {
    LKEY: 'aicoding-backgammon-v2-lessons', OKEY: 'aicoding-backgammon-v2-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const tx = window.AtlasBgTexts ? AtlasBgTexts() : Promise.resolve({});
      const bg = window.AtlasBgExplain ? AtlasBgExplain() : Promise.resolve();   // (the rules and the commentary engine: atlas/puzzles.js loads them — the same files and cache keys as the table)
      return (this.p = Promise.all([getJ('../backgammon/lessons.json?v=30261123m0'), getJ('../backgammon/openings.json?v=20261021op'), tx, bg, getJ('../backgammon/ramps.json?v=3').catch(() => null)])
        .then(([ls, op, I, _, rp]) => { this.I = I || {}; this.data = { ls, op, rp }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && I['ja@dicepup'] ? I['ja@dicepup'][k] : undefined; if (x === undefined) x = I[lang] && I[lang][k];   /* (ダイスン's own lines first, backgammon/voice-dicepup-ja.js) */ if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]); if (x === undefined) return ''; return v && typeof x === 'string' ? fill(x, v) : x; },
    names(lang) { const ck = bgCkOf(); return { c: this.tx('ng.' + ck[0], lang) || ck[0], o: this.tx('ng.' + ck[1], lang) || ck[1] }; },
    // the warm-up (backgammon/ramps.json, 2026-11-15): explain = a board to look at with its marks; try = dice to play, judged by ok
    rampPos: it => ({ bg: { pos: String(it.pos), dice: it.k === 'try' ? it.dice.slice() : null, lock: it.k !== 'try' } }), rampBody: (it, lang) => L(it.b, lang),
    rampMarks: it => (it.marks || []).slice(), rampLook: it => (it.look || []).slice(), rampAns: it => it.ans || null,
    rampAnsMk: it => (it.marks || []).concat(it.ans ? [{ m: it.ans, cls: 'ok' }] : []).concat(it.look || []),
    rampUndo: P => P.reset(),
    rampOk(it, u) {
      if (!window.BG || !u || !u.pos) return false;
      const p0 = bgDecP(it.pos), q = u.pos, mv = u.steps || [];
      return String(it.ok).split('&').every(c => { const [k, a] = c.split(':');
        if (k === 'any') return true; if (k === 'hit') return mv.some(x => BG.mvHit(x)); if (k === 'enter') return q[25] < p0[25];
        if (k === 'make') return q[+a] >= 2 && p0[+a] < 2; if (k === 'off') return q[0] - p0[0] >= +a; if (k === 'has') return q[+a] >= 1; if (k === 'keep') return q[+a] >= 2;
        if (k === 'slot') return q[+a] === 1 && p0[+a] === 0; if (k === 'race') return !BG.contact(q);
        if (k === 'allhome') { for (let i = 7; i <= 25; i++) if (q[i]) return false; return true; }
        if (k === 'safe') { for (let i = 1; i <= 24; i++) if (q[i] === 1) return false; return true; }
        if (k === 'plays') { const K = BG.key(q); return a.split(',').some(t => { const r = p0.slice(); for (let i = 0; i + 1 < t.length; i += 2) BG.apply(r, 0, t.charCodeAt(i) - 65, t.charCodeAt(i + 1) - 65); return BG.key(r) === K; }); }
        return false; });
    },
    mini: (pos, dice) => window.AtlasMini && AtlasMini.backgammon ? AtlasMini.backgammon({ pos, dice }) : '',
    course(id) { const c = (this.data.ls.cats || []).find(x => x.steps.includes(id)); return c ? c.id : 'rules'; },
    opItems() { const op = this.data.op; return op.cats.flatMap(c => c.items.map(id => ({ c: c.id, it: op.items[id] }))).filter(x => x.it); },
    // an opening's decisions: for a reply, the opponent's opening is already on the board (you are the near side, they the far one)
    opDecs(it) {
      return it.lines.map(ln => {
        const seq = ln.seq || [{ r: 0, d: it.d, m: ln.m }], k = it.kind === 'open' ? 0 : seq.length - 1, x = seq[k];
        let p = '0000005030000500000000002000000050300005000000000020'.split('').join('');   // (the starting position, as the json writes it)
        if (k > 0 && window.BG) { const q = bgDecP(p); for (let i = 0; i < k; i++) { const st = seq[i], sd = st.r === seq[k].r ? 0 : 1; for (let j = 0; j + 1 < st.m.length; j += 2) BG.apply(q, sd, st.m.charCodeAt(j) - 65, st.m.charCodeAt(j + 1) - 65); } p = Array.from(q).map(v => v.toString(16)).join(''); }
        return { ln, pos: p, d: x.d, plays: ln.plays || it.plays };
      });
    },
    list(kind, lang) {
      const D = this.data;
      if (kind === 'open') { const pr = J(this.OKEY, {}); return this.opItems().map(({ c, it }) => { const d0 = window.BG ? this.opDecs(it)[0] : null;
        return { key: it.id, cat: c, catName: this.tx('op.cat.' + c, lang), title: this.tx('op.i.' + it.id + '.t', lang) || it.id, sub: this.tx('op.i.' + it.id + '.k', lang), svg: d0 ? this.mini(d0.pos, d0.d) : this.mini('0000005030000500000000002000000050300005000000000020', it.d || null), st: pr[it.id] ? (pr[it.id].pass ? 'pass' : 'try') : '', full: false }; }); }
      const pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => { const P0 = (s.problems || [])[0] || {}, f = s.diagram || (s.figs && s.figs[0]) || P0;
        return { key: String(i), cat: this.course(s.id), catName: this.tx('lx.c.' + this.course(s.id), lang), title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: f.pos ? this.mini(bgPos(f.pos, f.side || 0), f.dice || null) : '', st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '', full: false }; });
    },
    play(P, pos, ask, hintTx, lang) {   // a play problem: the roll on the board, its candidate plays
      return { pos: { bg: { pos, dice: P.dice.slice() } }, kind: 'bgplay', P, bgPos: pos, ask, hintTx, ans: [{ froms: P.plays[0][0], cls: 'ring' }],
        best: () => P.plays[0][0] };
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const N = this.names(lang), T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, Object.assign({}, N, v || {}));
      const intro = String(T('intro', { fig0: '', fig1: '', fig2: '' }) || '').replace(/\{fig\d\}/g, '');
      const keys = this.tx('ls.' + s.id + '.keys', lang), kh = this.tx('ls.keysH', lang);   // (the step's three principles, backgammon/i18n-ls2.js)
      let introK = intro + (keys && keys !== 'ls.' + s.id + '.keys' ? `<br><b>🧭 ${kh}</b>` + String(keys).split('|').map(x => { const cjk = /^(ja|zh)/.test(lang), y = cjk ? x.replace(/。(?=.)/g, '、') : x; return '<br>・' + y + (/[。！？!?.]$/.test(y) ? '' : cjk ? '。' : '.'); }).join('') : '');   // (one sentence per principle: the speech pages never cut one in two)
      const rp = this.data.rp, ramp = rp && rp.steps && rp.steps[s.id] && rp.steps[s.id].length ? rp.steps[s.id] : null;   // (the warm-up: backgammon/ramps.json, 2026-11-15)
      const RU = (k, v) => fill(L(((rp && rp.ui) || {})[k], lang), v || {});
      const V = lang === 'ja' ? bgVoice(s.id) : null;   // (the lesson's voice: what the intro and the warm-up say is not said again)
      if (V) { introK = BGJ_LS_INTRO[s.id] || introK.replace(/勝率/g, '勝つ確率'); V.mark(introK); (ramp || []).forEach(r => ['t', 'b', 'g', 'h', 'y'].forEach(f => { if (r[f]) V.mark(L(r[f], lang)); })); }
      return { id: s.id, title: T('title'), intro: introK, ramp, RU,
        probs: (s.problems || []).map((P, pi) => {
          const pos = bgPos(P.pos, P.side), ask = this.tx('ls.turn', lang, { c: '<b>' + N.c + '</b>' }) + ' ';
          const ja = lang === 'ja' && window.BGX && BGX.teach, hs = (+key * 5 + pi * 3 + s.id.length) | 0, last = pi === (s.problems || []).length - 1;
          if (P.kind === 'play') {
            if (!ja) return this.play(P, pos, ask + T('goal', { d: P.dice.join('-') }), T('hint'), lang);
            // (ダイスン, 2026-11-22: the step's own goal once, then his own questions — none said twice in a lesson, see bgVoice)
            const d = BGJ_OP.dice(P.dice), q1 = pi === 0 ? `きみは<b>${N.c}</b>。` : '';
            const a0 = pi === 0 ? q1 + String(T('goal', { d })).split(' ' + d + ' ').join(d).replace(/^サイコロは ?(.+?)。/, '$1が出た！ ').replace(/ ?が出たよ。/, 'が出た！ ') : V.v(last ? 'last' : 'ask', (last ? BGV.last : BGV.ask).map(t => fill(t, { d })));
            const o = this.play(P, pos, bgFin(V, V.mark(a0), ''), '', lang);
            try { this.teachJaV(o, V, pi, last, pi === 0 ? T('hint') : ''); } catch (e) { o.hintTx = T('hint'); }
            return o;
          }
          const qv = Object.assign({}, N, P.qv || {}); if (P.q === 'shots') qv.m = this.tx('ls.why.shotsD', lang, { d: (P.qv || {}).d });
          const o = { pos: { bg: { pos, dice: null } }, kind: 'choice', P, ask: this.tx('ls.q.' + P.q, lang, qv), hintTx: P.q === 'take' ? this.tx('ls.takepoint.hint', lang) : P.q === 'double' ? this.tx('ls.racecube.hint', lang) : T('hint'), ans: [],
            marks: (P.mk || []).map(([sd, pt, c]) => ({ pt: (sd ^ P.side) === 0 ? pt : 25 - pt, cls: c === 'ok' ? 'ok' : 'hl' })),
            choices: P.opts.map(o => { const [ok, on] = Array.isArray(o) ? o : [o]; return this.tx('ls.opt.' + ok, lang, Object.assign({}, qv, { n: on })) || ok; }), right: P.ans,
            why: this.tx('ls.why.' + (P.why || P.q), lang, qv) };
          if (ja) { bgChJaV(o, N, V, pi, last, s.id); o.why = ''; }
          return o;
        }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const it = this.data.op.items[key]; if (!it || !window.BG) return null;
      const T = f => this.tx('op.i.' + it.id + '.' + f, lang), N = this.names(lang);
      const decs = this.opDecs(it), intro = (lang === 'ja' && BGJ_OP.intro[it.id]) || [T('d'), T('a')].filter(Boolean).join('<br>');
      const V = lang === 'ja' ? bgVoice('op:' + it.id) : null; if (V) V.mark(intro);   // (2026-11-23: one voice per opening, as the lessons — the intro is not said again)
      return { id: it.id, title: T('t') || it.id, intro, start: null, steps: [], notes: {},
        probs: decs.map((x, j) => { const tol = this.data.op.tol || .02, R = x.plays.map(y => ({ m: y[0], e: y[3] != null ? y[3] : y[1], ro: y[3] != null, ply: y[2] })), rolled = R.some(y => y.ro), best = R.filter(y => !rolled || y.ro).reduce((a, b) => b.e > a.e ? b : a);
          const P = { dice: x.d, plays: R.map(y => [y.m, y.e]), opTol: tol, opOk: R.filter(y => (rolled ? y.ro : y.ply === 2) && best.e - y.e <= tol + 1e-9).map(y => y.m), best: best.m };
          const ask = this.tx('op.drillTurn', lang, { c: '<b>' + N.c + '</b>', d: x.d.join('') });
          const o = Object.assign(this.play(P, x.pos, ask, this.tx('op.hint', lang) || '', lang), { ans: [{ froms: best.m, cls: 'ring' }], best: () => best.m });
          if (lang === 'ja' && window.BGX && BGX.teach) { try { this.opJaV(o, it, j, j === decs.length - 1, V); } catch (e) { this.opJa(o, it, j); } }   // (ダイスン asks, hints and explains in the opening's own voice — bgVoice)
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[it.id] || {}, pass = pts >= max; pr[it.id] = Object.assign({}, o, { pass: !!o.pass || pass, best: Math.max(o.best || 0, max ? pts / max : 0) }); put(this.OKEY, pr); return pass; } };
    },
    opJaV(o, it, j, last, V) {   // (2026-11-23 lesson loop) the opening problem in the opening's own voice: his questions in turn (none said twice), then the lessons' hint / praise / soft words / reasons (teachJaV)
      const d = BGJ_OP.dice(o.P.dice), a0 = V.v(last && j ? 'last' : 'ask', (last && j ? BGV.last : BGV.ask.concat(BGJ_OP.ask)).map(t => fill(t, { d })));
      o.ask = bgFin(V, a0, '');
      this.teachJaV(o, V, j, last, '');
    },
    opJa(o, it, j) {   // (2026-11-21 lesson loop) the opening problem in ダイスン's words: see BGJ_OP
      const J2 = BGJ_OP, hs = (it.id.length * 7 + it.id.charCodeAt(1) + j) | 0, d = J2.dice(o.P.dice);
      o.ask = fill(J2.ask[hs % J2.ask.length], { d });
      this.teachJa(o, hs);
    },
    teachJa(o, hs, hint0) {   // the hint, and the short reasons after the answer (BGJ_OP; openings and the lessons' play problems)
      const J2 = BGJ_OP, q0 = bgDecP(o.bgPos);
      const mk = m => { const q = q0.slice(), mv = Array.isArray(m) ? m : bgCodes(o.bgPos, m).moves; mv.forEach(c => BG.apply(q, 0, BG.mvFrom(c), BG.mvTo(c))); return { moves: mv, pos: q }; };
      const bestM = o.best(), bestP = mk(bestM), ok = o.P.opOk || [bestM], others = o.P.plays.map(y => y[0]).filter(m => !ok.includes(m));
      const T0 = (() => { try { return BGX.teach(q0, 0, bestP, null); } catch (e) { return null; } })();
      const k0 = T0 && T0.plan[0] ? T0.plan[0].k.slice(3) : '';
      o.hintTx = hint0 && (hs % 2 === 0 || !k0 || !J2.hint[k0] && !/^pt|prime|anchor|bold/.test(k0)) ? hint0 : J2.hintOf(T0);
      const reasons = (T, max, pre) => { let out = pre || ''; const n0 = out.length; for (const x of (T && T.plan) || []) { let s = J2.say(x); if (!s || (out.length > n0 && (out + s).length - n0 > max)) continue; if (out.length > n0) s = (/[！？]$/.test(out) ? ' ' : '') + 'それに、' + s.replace(/^しかも/, '').replace(/だからね。$/, 'なんだ。').replace(/からね。$/, 'んだ。'); out = J2.join(out, s); if (out.length - n0 > max * .6) break; } return out; };
      o.good = u => { let T = T0; try { if (u && u.steps && u.steps.length) T = BGX.teach(q0, 0, mk(u.steps), null); } catch (e) {}
        const many = ok.length > 1 ? (hs % 2 ? 'ほかにも同じくらい良い手があるけど、' : '同じくらいの手はほかにもあるワン。') : '';
        return J2.join(reasons(T, 90, J2.good[hs % J2.good.length]), many && many.endsWith('、') ? many + 'どれも大きな差はないんだ。' : many); };
      o.ng = u => { let mine = null; try { mine = u && u.steps && u.steps.length ? mk(u.steps) : others.length ? mk(others[0]) : null; } catch (e) {}
        let T = T0; try { if (mine) T = BGX.teach(q0, 0, bestP, mine); } catch (e) {}
        const vs = ((T && T.vs) || []).map(x => J2.say(x)).filter(Boolean)[0] || J2.vs.close;
        return J2.join(reasons(T, 60, J2.ngHead[hs % J2.ngHead.length]), vs); };
    },
    teachJaV(o, V, pi, last, hint0) {   // (2026-11-22) the lessons' play problems in the lesson's voice: the hint, and the reasons after the answer (BGV)
      const J2 = BGJ_OP, q0 = bgDecP(o.bgPos);
      const mk = m => { const q = q0.slice(), mv = Array.isArray(m) ? m : bgCodes(o.bgPos, m).moves; mv.forEach(c => BG.apply(q, 0, BG.mvFrom(c), BG.mvTo(c))); return { moves: mv, pos: q }; };
      const bestM = o.best(), bestP = mk(bestM), ok = o.P.opOk || [bestM], others = o.P.plays.map(y => y[0]).filter(m => !ok.includes(m));
      const T0 = (() => { try { return BGX.teach(q0, 0, bestP, null); } catch (e) { return null; } })();
      const k0 = T0 && T0.plan[0] ? T0.plan[0].k.slice(3) : '', hk = BGV.hint[k0] ? k0 : /^pt|prime/.test(k0) ? 'pt' : /^anchor/.test(k0) ? 'anchor' : k0 === 'bold' ? 'build' : k0 === 'dance' ? 'hit' : 'def';
      const aE = bgEndLast(o.ask); o.ownHead = true;
      o.hintTx = bgFin(V, hint0 && V.free(hint0) ? V.mark(hint0) : V.v('h:' + hk, BGV.hint[hk], aE), aE);
      const sayV = (x, strict) => { const grp = x.k.slice(0, 2) === 'tv' ? 'vs' : 'plan', L0 = BGV[grp][x.k.slice(3)]; if (!L0 || !L0.length) return '';
        const a = Object.assign({}, x.a); if (a.P != null) a.P = '<b>' + V.ptName(a.P, J2.pt(a.P)) + '</b>'; if (a.a != null && a.b != null) a.c = a.a - a.b;
        const L1 = L0.map(t => fill(t, a)), L2 = strict === 'ng' && grp === 'plan' ? L1.filter(t => !/(た|たね|たワン|たんだ)[。！]|できたね|取れたね/.test(t)) : L1;   // (after a miss the green play's reason is said as what it does, not 「〜できたね」)
        return strict ? V.vTry(grp + ':' + x.k.slice(3), L2) : V.v(grp + ':' + x.k.slice(3), L2); };
      // (strict: a reason already said in all its wordings is left out — the first reason of the praise is always said)
      const reasons = (T, max, n, strict) => { const out = []; let len = 0;
        for (const x of (T && T.plan) || []) { if (out.length >= n) break; if (out.length && len > max * .6) break; if (out.length && x.k === 'tc.enter') continue; const s = sayV(x, strict || (out.length > 0 && 1)); if (!s || (out.length && len + s.length > max)) continue; out.push(s); len += s.length; }
        return out.map((s, i) => i ? V.v('cn', BGV.cn) + s.replace(/^(しかも|それに)、?/, '') : s).join(''); };
      o.good = u => { let T = T0; try { if (u && u.steps && u.steps.length) T = BGX.teach(q0, 0, mk(u.steps), null); } catch (e) {}
        const many = ok.length > 1 ? V.v('many', ['同じくらい良い手はほかにもあるワン。', 'これと並ぶ手もあるから、どれを選んでも大きな差はないね。', 'ほぼ互角の手がほかにもあるから、そっちでも大丈夫！', '実は、ほかにも同じくらいの手があるんだ。', '別の動かし方でも、ほとんど差はないワン。']) : '';
        // (2026-11-23: the same point praised first in the problem before → the play's other reason goes first, when it has one)
        const pk = x => x ? x.k + ':' + (x.a && x.a.P != null ? x.a.P : '') : ''; if (T && T.plan && T.plan.length > 1 && V.pk0 && pk(T.plan[0]) === V.pk0) T = Object.assign({}, T, { plan: [T.plan[1], T.plan[0]].concat(T.plan.slice(2)) }); V.pk0 = T && T.plan ? pk(T.plan[0]) : '';
        const push = pi % 2 === 1 || last ? V.push(pi) : '';
        return bgFin(V, V.cheer(pi) + ' ' + (reasons(T, many ? 70 : 90, 2) || V.v('plan:quiet', BGV.plan.quiet)) + (many ? ' ' + many : '') + (push ? ' ' + push : ''), '!'); };
      o.ng = u => { let mine = null; try { mine = u && u.steps && u.steps.length ? mk(u.steps) : others.length ? mk(others[0]) : null; } catch (e) {}
        let T = T0; try { if (mine) T = BGX.teach(q0, 0, bestP, mine); } catch (e) {}
        let vx = ''; for (const x of (T && T.vs) || []) { vx = sayV(x); if (vx) break; } if (!vx) vx = V.v('vs:close', BGV.vs.close);
        return bgFin(V, V.soft(pi) + ' ' + V.v('lead', BGV.lead) + reasons(T, 50, 1, 'ng') + vx, '!'); };
    },
    points(P, u, p) {   // = backgammon/app.js problemPoints (lessons) · op.js opSubmit (openings: right within the tolerance, else nothing)
      const mine = u && u.key, L = P.plays.map(([m, e]) => Object.assign(bgCodes(p.bgPos, m), { m, e }));
      if (P.opOk) { const x = L.find(y => y.key === mine); return x && P.opOk.includes(x.m) ? 20 : 0; }
      let rank = L.findIndex(y => y.key === mine); if (rank < 0) rank = L.length - 1;
      const eff = L.filter(y => y.e > L[rank].e + 0.004).length, n = L.length;
      return n <= 1 || eff === 0 ? 20 : Math.max(0, Math.round(20 * (n - 1 - eff) / (n - 1)));
    },
    introPos(c) {   // while the intro is read: the lesson's own picture (its diagram, the play's arrows), for looking only
      const s = this.data.ls.steps.find(x => x.id === c.id), f = s && (s.diagram || (s.figs && s.figs[0])); if (!f || !f.pos) return null;
      const sd = f.side || 0;
      return { pos: { bg: { pos: bgPos(f.pos, sd), dice: f.dice || null, lock: true } }, marks: f.play ? [{ m: f.play, cls: 'ok' }] : (f.marks || []).map(x => Array.isArray(x) ? { pt: (x[0] ^ sd) === 0 ? x[1] : 25 - x[1], cls: 'hl' } : null).filter(Boolean) };
    },
  };
  /* hex (2026-11-15): hex/lessons.json (13 steps of 5 one-move problems on 7–11 boards: 'ok' kinds — 20 points or 0 — and 'sc' kinds
     scored by the engine's values (= hex/app.js problemPoints)). Progress = the full game's ('aicoding-hex-lessons' { id: { best, clear } }).
     Texts: hex/i18n.js, read into a sandbox. A position here is { spec: { n, b, side }, me: 1 Red / 2 Blue }; cells are named by their marks. */
  const HX_ENG = '../hex/engine.js?v=4-pro1-mt1';   // (the table adapter's file: one cache)
  const hxEng = () => window.HexEngine ? Promise.resolve(window.HexEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = HX_ENG; sc.onload = () => window.HexEngine ? res(window.HexEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const HEX_WINT = 29000;   // (hex/engine.js WINT)
  /* (2026-11-21 lesson loop) the hex opening practice in ゴイシペン's words, Japanese: the intro and the line's notes retold (each kind of
     note — bridge, block at a distance, touch, intrusion, edge template, swap — in varied lines), a varied question, a hint from what the
     best move does (never its cell: the ring of hxArea shows the area), why it is best, and for another move what it misses. The shapes
     come from the position (HXA: bridges, intrusions, the 2nd-row edge template, touching / blocking at a distance) and the stored values
     (P.sc, the engine's; ≈ win share (v + 1000) / 2000 for the side to move). */
  const HXA = (() => {
    const geo = n => window.HexEngine.geo(n);
    function facts(sp, m) {   // what the side to move does by playing m
      const n = sp.n, b = String(sp.b), s = sp.side === 2 ? 2 : 1, o = 3 - s, NB = geo(n).NB, at = q => b[q] === 'r' ? 1 : b[q] === 'b' ? 2 : 0, N = n * n;
      if (m === 1023) return { swap: 1 };
      const f = { adj: 0, touch: 0, bridge: 0, save: 0, intrude: 0, edge: 0, onEdge: 0, center: 0, dOpp: 99, dOwn: 99 };
      if (!(m >= 0 && m < N) || at(m)) return f;
      const r = Math.floor(m / n), c = m % n, common = (a, q) => NB[a].filter(x => NB[q].includes(x));
      NB[m].forEach(q => { if (at(q) === s) f.adj++; else if (at(q) === o) f.touch++; });
      for (let q = 0; q < N; q++) { if (q === m || NB[m].includes(q) || at(q) !== s) continue; const cm = common(m, q); if (cm.length === 2 && cm.every(x => !at(x))) f.bridge++; }
      for (let a = 0; a < N; a++) for (let q = a + 1; q < N; q++) {   // the bridges m is a carrier of: ours with the other carrier taken (save), the opponent's (intrude)
        if (!at(a) || at(a) !== at(q) || NB[a].includes(q)) continue; const cm = common(a, q); if (cm.length !== 2 || !cm.includes(m)) continue; const ot = cm.find(x => x !== m);
        if (at(a) === s && at(ot) === o) f.save++; if (at(a) === o && !at(ot)) f.intrude++; }
      const er = s === 1 ? (r === 1 ? [[0, c], [0, c + 1]] : r === n - 2 ? [[n - 1, c], [n - 1, c - 1]] : null) : (c === 1 ? [[r, 0], [r + 1, 0]] : c === n - 2 ? [[r, n - 1], [r - 1, n - 1]] : null);
      f.edge = er && er.every(([a, d]) => a >= 0 && a < n && d >= 0 && d < n && !at(a * n + d)) ? 1 : 0;
      f.onEdge = (s === 1 ? r === 0 || r === n - 1 : c === 0 || c === n - 1) ? 1 : 0;
      f.center = r === (n - 1) / 2 && c === (n - 1) / 2 ? 1 : 0;
      const hd = q => { const dr = Math.floor(q / n) - r, dc = q % n - c; return (Math.abs(dr) + Math.abs(dc) + Math.abs(dr + dc)) / 2; };
      for (let q = 0; q < N; q++) { if (at(q) === o) f.dOpp = Math.min(f.dOpp, hd(q)); else if (at(q) === s) f.dOwn = Math.min(f.dOwn, hd(q)); }
      return f;
    }
    const kind = f => f.swap ? 'swap' : f.save ? 'save' : f.intrude ? 'intrude' : f.edge && (f.bridge || f.adj || f.dOwn <= 2) ? 'edge' : f.bridge ? 'bridge' : f.adj && f.touch ? 'adjtouch'
      : f.touch ? 'touch' : f.adj ? 'adj' : f.center ? 'center' : f.dOpp <= 3 ? 'far' : 'open';
    const wr = v => Math.max(0, Math.min(1, (v + 1000) / 2000));
    return { facts, kind, wr };
  })();
  /* (2026-11-22 lesson loop, rewritten) the hex openings in ゴイシペン's words: the intro, a note on every move of the line read from the
     board (HXA.facts of the move — a bridge with the gold stone, touching / blocking at a distance, both at once, an intrusion, the reply
     to one, the 2nd-row edge template; never the stored 2D note, whose "blocks at a distance" is sometimes a stone that touches), and for
     the problems a varied question, a hint by the best cell's shape, praise with why + a push on, and for a miss a soft word, the green
     cell and what it does, what yours leaves undone. The order of the lines differs by lesson ((a·i + b) mod 5, HXOP_K). */
  const HXJ_OP = {
    intro: { center11: 'まん中の点は、赤のいちばん強い1手目なんだ。<br>だからスワップありなら、青がそれをもらっちゃうペン。そのあと赤が、青になった中央の石をどう止めるか見てみよう！',
      edge11a: 'ふちの1手目は、青がスワップしたくないくらいの強さ。それでいて、赤が負けるわけでもない！<br>スワップありで、強い人がよく使う開局だペン。',
      edge11b: 'もう1つの、バランスのいいふちの開局だね。<br>青はスワップせず、中央の近くで応じるペン。ふちの赤石があとで役に立つところに注目してみて！',
      ring11: '2段目からの1手目は、ふちより少し強いけど、まだ互角に近いんだ。<br>ここでも青はスワップせず、中央を取り合う。どっちが先に道を作るかな？',
      f6r1: 'スワップなしのルールだと、赤はまん中から始めるペン。<br>これは青のいちばん良い受けとされる手順。赤の道をふさぎながら、青は自分の列も準備するんだ！',
      f6r2: 'まん中の1手目（スワップなし）への、もう1つのいい受け！<br>1つ1つの石が、止める役とつなぐ役を同時にこなすところを見てみて。',
      f6r3: 'まん中の1手目への、3つ目の受けだペン。<br>3つの手順をくらべてみると、おもしろいんだ。青はどこで止めて、赤はどう回りこむかな？',
      c7: '7路の盤では、まん中の1手目で赤の必勝なんだ！<br>ブリッジがどれだけ早く辺に届くか、短い手順で見てみようペン。',
      c9: '9路でも、まん中がいちばん強い1手目！<br>青は離れて止めて、赤はブリッジで応じるペン。小さな盤だから、流れがよく見えるはず。',
      e9: 'スワップありの9路では、赤はふちから始めるペン。まん中だと、スワップでもらわれちゃうからね。<br>小さな盤でスワップありの開局を練習するのに、ぴったりなんだ！' },
    side: s => s === 2 ? '青' : '赤',
    // the notes on the line's moves, by what the move does on the board ({me} the side moving, {c} the other, {ok} the stone just played, {hl} its bridge partner)
    n: { start: ['まずは赤が{ok}に打って、勝負のはじまり！', '赤の1手目は{ok}。ここから道づくりが始まるペン！', '最初の一手、赤は{ok}を選んだ！ どう広がるか、見ものだペン。'],
      swap: ['青はスワップ！ 赤の強い1手目が、{ok}の青い石になったペン。', 'ここで青はスワップ！ 強い石を、そっくり自分のものにしちゃった。'],
      noswap: ['青はスワップしないで、自分で{ok}に打った！ ふちの石は、もらってもうまみが少ないんだ。', 'スワップはなし！ 青は{ok}に打って、中央を取りに行くペン。', '青はあえてスワップせず、{ok}へ。もらう価値が小さい1手目だからね。'],
      bridge: ['{hl}とブリッジ！ もうこの2つは切れないペン。', '{me}は{hl}とブリッジを組んだ！ どっちをふさがれても、もう片方でつながる。', 'ブリッジでぐんと前へ！ {hl}とのつながり方が2通りあるんだ。',
        '1つとばして{hl}と手を組んだ。安全なまま、道がのびた！', '{hl}との間に、空いた点が2つ。これがブリッジの強さだペン！', 'またブリッジ！ {hl}と組んで、{c}に切るすきを与えない。', '{hl}と組む、ひとつとびの形！ 相手がどちらに打っても、もう片方で受けられる。', 'ブリッジの橋がもう1本！ {me}の道が、どんどん前へのびるペン。'],
      touch: ['{c}の石に、ぴたっとつけて止める！', '{c}のすぐとなりに打って、行く手をおさえたペン。', '{c}にくっついて、伸びたい向きをじゃまする！', 'となりにつけて、{c}の進みにブレーキ！',
        '{c}の石の頭をおさえる一手。そっちへは行かせないペン！', '真横にぴったり。{c}は向きを変えるしかない！', '{c}の前に立ちはだかった！ ここは押し合いになるんだ。', '{c}の石に体当たり！ 道をせまくしたペン。'],
      adjtouch: ['自分の石とつながりながら、{c}もおさえる！ 1手で2つの仕事だペン。', '{me}の石を1つ伸ばしつつ、{c}の行く手にふたをした！', 'つなぐのと止めるのを、いっぺんに！ むだのない一手。',
        '自分の列をのばしながら、{c}の石に押しつけたペン！', '仲間の石のとなりで、{c}の進みもじゃまする手！', 'しっかりつながったまま、{c}を押し返す！ 力強いペン。', '{c}の正面に立ちつつ、自分の列もつないだペン。', 'くっつけて止めて、しかも仲間とつながってる！', '{me}の壁がまた1つ厚くなった！ {c}は押し返される。', 'ここでも、つなぎながらのブロック！ 手堅いペン。'],
      far: ['{c}の進路の先を、少し離れてふさぐ！', '{c}の行く手に、間をあけて先回りしたペン。', 'くっつかずに離れて止める。ヘックスの守りのコツなんだ！', '{c}の道の先に、ひと足早く石を置いた！',
        '離れた所で待ちぶせ！ {c}はすり抜けにくくなるペン。', 'あえて間をあけて、{c}の行き先をふさいだ！'],
      adj: ['自分の石のすぐとなりに、しっかりつないだ！', '{me}は1つ伸ばして、切られないつながりを作ったペン。', 'となりにぴったりつないで、すきをなくす！', '仲間の石と手をつないだ！ これで切れない。'],
      center: ['盤のまん中を取った！ どの辺にも近い場所なんだ。', 'まん中に打ったペン！ どっちへも伸びられる。'],
      open: ['広く空いた場所に、先に石を置いた！', 'まだ誰もいない所へ。道の選び方を増やす手だペン。', 'ゆったり広い場所を先取り！', '{me}は空いている所に打って、次の道を準備！'],
      intrude: ['{c}のブリッジに割りこんだ！ 相手は受けるしかないペン。', 'ブリッジのすき間に割りこみ！ {c}に受けさせる手。', 'すき間をついて割りこむ！ {c}は急いで受けなきゃ。'],
      save: ['割りこみには、すぐ受ける！ これでブリッジはつながったままペン。', 'すかさず受けた！ {me}のつながりは切れない。', 'もう片方の点で受けて、ブリッジを守った！'],
      edge: ['2段目まで来た！ 辺のテンプレートで、もう辺とつながったペン。', '辺から2段目の石は、辺とつながったも同然！ 片方をふさがれても、もう片方がある。', 'これで辺まで届いた形！ 2段目の辺のテンプレートなんだ。'] },
    ask: ['{s}の番！ いちばんいい点はどこ？', 'さあ、{s}ならどこに打つ？ 相手の道もよく見て！', 'ここで{s}が打つ、強い一手を探してみて！', '{s}の一手だペン。止める？ つなぐ？',
      'この局面、{s}の急所はどこだと思う？', '{s}になったつもりで考えてみて！ どこがいちばん効く？', '次は{s}。きみの読みを見せてほしいペン！', '{s}が打つなら、どこがいい？ じっくり考えてみて。'],
    askSw: ['1手目が打たれた！ 青はスワップする？ それとも自分で打つ？', '青の番。この1手目、スワップでもらっちゃう？ 自分で打つ？', 'さて青、スワップするか考えどころだペン！ もらう？ もらわない？'],
    hint: { swap: ['この1手目、青がもらったら得かな？ 石の強さを考えてみて。'],
      noswap: ['スワップはしないほうがよさそう。輪で囲んだあたりに、いい手が隠れてるペン。', 'この1手目、もらって得かな？ 自分で打つ手もくらべてみて！'],
      save: ['自分のブリッジに、割りこまれていないかな？', 'つながりが切られそうな所はない？ すぐ手当てしてあげて！'],
      intrude: ['相手のブリッジのすき間を見てみて！ 割りこむと、相手は受けるしかないペン。', '相手の2つの石の間に、空いた点が2つある。そこをつつくと？'],
      edge: ['辺から2段目に、いい点がありそうだペン。', '辺に直接打たなくても、つながる形があるんだ。どこかな？'],
      bridge: ['自分の石から1つとばして、ブリッジを組める点はどこかな？', '守るより、自分の道を1つとびで伸ばす場面かも！', '間に空いた点が2つある形、作れないかな？ 輪の中を探してみるペン。'],
      adjtouch: ['自分の石とつながりながら、相手もおさえられる点はないかな？', '仲間の石のとなりで、相手の前にも立てる点があるペン！', '1手で「つなぐ」と「止める」を両方できる所、探してみて！',
        '点線の輪のあたり。自分の石と相手の石、両方に触れる点はどこ？', 'むだのない一手を探そう。自分の列も、相手の進路も見てみて！'],
      touch: ['相手の石が伸びたい向きを見てみて。すぐとなりでおさえる手がありそう！', '点線の輪のあたり、相手の石の真ん前に注目だペン。', '離れて待つより、くっつけて止める場面かも？',
        '相手の石が、どっちへ進みたがっているか考えてみて！', 'ぴったりくっつく手、くらべてみた？'],
      far: ['相手の石にくっつかず、離れて先回りしてみて！ 点線の輪のあたりだペン。', '相手の進路の少し先を見てみて。間をあけてふさぐと止めやすいんだ。', 'すぐとなりじゃなくて、1つ2つ先で待ちぶせする手は？',
        '相手がこれから通りたい場所はどこかな？', 'くっつけると横へすり抜けられちゃう。少し離れた点を探してみて！'],
      adj: ['自分の石のすぐとなりに、しっかりつなぐ点を探してみて。', '切られそうな所はない？ 仲間のとなりを見てみて！'], center: ['どの辺にも近い、盤のまん中あたりを見てみて！'],
      open: ['まだ広いところがある！ どの方向にも伸びられる点を探してみて。', '石の少ない場所に、いい点が眠っているかも？'] },
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちりだペン！', 'やったね！'],
    push: ['次もこの調子で行こう！', null, 'どんどん行こう！', null, 'その勢いで次へ行こうペン！'],
    soft: ['おしい！', 'ドンマイだペン！', '大丈夫、ここはむずかしいんだ。', '気にしない、気にしない！', 'あと一歩！'],
    tail: [null, 'これで覚えちゃおう！', null, '次はきっと見つけられるペン！', '次もいっしょに考えよう！'],
    // why the best cell is best (praise), by its shape
    why: { swap: ['この1手目は強すぎるから、もらっちゃうのがいちばん！', '中央に近い強い石を、そっくり自分のものにできた！'],
      noswap: ['この石はもらっても得が少ないから、自分で打つのが正解！', 'スワップせずに中央を争う。それがいちばんだペン！'],
      save: ['割りこまれたら、すぐもう片方で受ける。つながりが守れた！', 'すかさず受けたから、ブリッジは切れないペン！'],
      intrude: ['割りこみで、相手に受けを強制した！ 先手で形を決められるペン。', 'ブリッジのすき間をついた！ 相手は受けるしかない。'],
      edge: ['2段目の石は、辺のテンプレートで辺とつながる！', '辺に打たずに、2段目から辺まで届いたペン！'],
      bridge: ['ブリッジなら、どっちをふさがれてもつながるペン！', '1つとばして、安全なまま遠くへ伸びた！', '間の2点のどちらかで必ずつながる。切れない形！'],
      adjtouch: ['自分の石とつながったまま、相手の行く手もおさえた！', '1手で2つの仕事。つなぎと止めを同時にこなしたペン！', '仲間から離れずに、相手の前に立てた！',
        'つながりを保ちながらブロック！ これが理想の形なんだ。', 'きみの列はのびて、相手の道はせまくなった！'],
      touch: ['相手の石にぴったりつけて、進みたい向きをふさいだ！', 'すぐ前に立ったから、相手は向きを変えるしかない。', 'ここは押し合いの場面。つけて止めるのが正しいペン！',
        '相手の頭をおさえた！ この先の道が細くなるんだ。', 'くっつけたことで、相手のいちばんいい道が消えた！'],
      far: ['少し離れてふさいだから、相手は回りこむのが大変！', '先回りの石が、相手の通り道をまるごとじゃましてるペン。', '間をあけて止めたから、すり抜けられにくいんだ。',
        '遠めに構えて先回り！ くっつけるより、ずっと止めやすい。', '相手がこれから通る場所を、先に押さえた！'],
      adj: ['となりにつないで、切られる心配がなくなった！', 'しっかりつないで、すきをなくしたペン！'], center: ['まん中を取って、どの辺にも近くなった！', 'どの方向にも伸びられる点を取れたペン！'],
      open: ['広い場所を先に取って、道の選び方が増えた！', 'どこへでも伸びられる場所を、先に取れたペン！'] },
    // what the green cell does (a miss), plain past forms for C.right
    ngWhy: { swap: ['強い1手目を、そのまま自分のものにできた', '中央に近い強い石をもらえた'], noswap: ['自分で打って、中央を争えた', 'もらう価値の小さい石を取らずに、いい点を先に打てた'],
      save: ['割りこみに受けて、ブリッジを守れた', 'すぐ受けて、つながりを切らせなかった'], intrude: ['相手のブリッジに割りこんで、受けさせられた', 'すき間をついて、先手を取れた'],
      edge: ['2段目から辺とつながれた', '辺のテンプレートで、辺まで届いた'], bridge: ['ブリッジで、切られずに遠くまで伸ばせた', '1つとばしても、2通りでつながれた', '安全なまま、道を2マスぶん進められた'],
      adjtouch: ['自分の石とつながったまま、相手も止められた', 'つなぎと止めを1手でこなせた', '仲間のとなりで、相手の前に立てた', '列をのばしながら、相手を押し返せた', 'つながりを切らさずにブロックできた'],
      touch: ['相手の石の真ん前をふさげた', 'ぴったりつけて、進みたい向きをおさえられた', '相手の頭をおさえて、道を細くできた', 'すぐとなりで押し返せた', '相手に横へ逃げるすきを与えなかった'],
      far: ['離れて先回りして、すり抜けを防げた', '相手の通り道の先を、先に押さえられた', '間をあけて待ちぶせできた', '回りこみにくい所でふさげた', '相手の行き先に、ひと足早く石を置けた'],
      adj: ['しっかりつないで、すきをなくせた', '切られないつながりを作れた'], center: ['まん中を先に取れた', 'どの辺にも近い点を取れた'], open: ['広い場所を先に取れた', '道の選び方を増やせた'] },
    right: ['正解は{m}。{a}んだ。', '{m}を見て！ そこなら{a}。', 'ここは{m}がいちばん。{a}から！', '答えは{m}。{a}ペン。', '{m}に打てば、{a}！'],
    you: ['{x}だと、{b}。', 'きみの{x}だと、{b}んだ。', '{x}では{b}！', '{x}に打つと、{b}。', '{x}を選ぶと、{b}。'],
    // what the miss leaves undone (by the best cell's shape, when no sharper reason applies)
    lack: { adjtouch: ['つなぐか止めるか、片方しかできていない', '自分の石とのつながりか、相手の止めか、どちらかが足りない', '仲間から浮いた石になって、止める力も半分になっちゃう'], touch: ['相手の石の行く手が空いたままになっちゃう', '相手の正面がふさがらず、前へ進まれちゃう', '相手の頭がおさえられず、のびのび進まれちゃう'],
      far: ['相手の進路の先が空いたままで、すいすい進まれちゃう', '先回りできず、相手の道が残っちゃう', '相手が通りたい場所に、だれも立っていない'], bridge: ['つながりが弱いままになる', '自分の道がのびず、切られるすきが残る', '道をのばすチャンスを、相手にゆずっちゃう'],
      adj: ['自分の石とつながらず、切られるすきが残る'], center: ['まん中を相手に先に取られちゃう'], open: ['広い場所を相手に先に取られちゃう'], edge: ['辺までの道が、まだ切られやすい'],
      intrude: ['相手のブリッジがそのまま残っちゃう'], save: ['割りこまれたブリッジが切られちゃう'] },
  };
  const HXOP_K = (L, i) => ((1 + L % 4) * i + (L * 3) % 5) % 5;   // the line index of problem i in lesson L — a different order in each lesson
  function hxNoteJa(sp, m, i, swapRule, cnt, L) {   // the note on move i (m, played by the side to move in sp): [text, marks]
    const H = HXJ_OP, s = sp.side === 2 ? 2 : 1, me = H.side(s), c = H.side(3 - s), pk = (a, j) => a[((j % a.length) + a.length) % a.length];
    let k, hl = -1;
    if (i === 0) k = 'start'; else if (m === 1023) k = 'swap'; else if (i === 1 && swapRule) k = 'noswap';
    else { const f = HXA.facts(sp, m); k = HXA.kind(f); if (k === 'bridge') hl = hxBridgeOf(sp, m); if (!H.n[k]) k = 'open'; }
    cnt[k] = (cnt[k] || 0) + 1;
    const t = pk(H.n[k], L * 2 + cnt[k] - 1), mk = [];
    if (/\{ok\}/.test(t)) mk.push([m, 'ok']); if (/\{hl\}/.test(t) && hl >= 0) mk.push([hl, 'hl']);
    return [fill(t, { me, c, ok: HXM('ok', 'ja'), hl: HXM('hl', 'ja') }), mk];
  }
  function hxBridgeOf(sp, m) {   // the own stone m makes a bridge with (both carriers empty), or -1
    const n = sp.n, b = String(sp.b), s = sp.side === 2 ? 'b' : 'r', NB = window.HexEngine.geo(n).NB;
    for (let q = 0; q < n * n; q++) { if (b[q] !== s || q === m || NB[m].includes(q)) continue; const cm = NB[m].filter(x => NB[q].includes(x)); if (cm.length === 2 && cm.every(x => b[x] === '.')) return q; }
    return -1;
  }
  /* (2026-11-22 lesson loop) the hex lessons in ゴイシペン's words, Japanese, for the 3D table (no coordinates): a short intro per step
     (the first says what the game is and how it is won), five questions and five hints per step, and after the answer the praise with
     why or, for a miss, the green cell and what yours gives up — read from the board (hex/engine.js winCells / need): the opponent
     connects at once (the cell marked), your connection still a cell short, your only winning cell that the opponent blocks (gold), the
     opponent's double threat (gold), the green cell taken from you and the path it costs, a move that shortens nothing, a stone on the
     edge itself; the strategy steps from the cell's shape (HXA) and the AI's values. Cheers the player on (HX_CH). */
  const HXJ_LS = {
    intro: {
      b_connect: 'ぼくはゴイシペン！ ヘックスは、六角形のマスに赤と青が交互に石を置くゲームなんだ。<br>自分の色の2つの辺を、自分の石で途切れずにつないだら勝ち！ となりのマスの石どうしは、つながっているペン。<br>まずは、1手で勝ちを決める練習から。',
      b_block: '今度は守る番！ 相手があと1マスでつながりそうなら、そのすき間に自分の石を置いてふさごう。<br>自分の道だけじゃなく、相手の道もときどき数えてみるクセをつけるペン。',
      b_bridge: '2つの石のあいだに空きマスが2つあって、どっちを通ってもつながる形を<b>ブリッジ</b>っていうんだ。<br>相手が片方をふさいでも、もう片方でつながる！ となり合わせとほとんど同じくらい強いペン。',
      b_save: '相手がブリッジの片方に割りこんできたら、すぐもう片方に打てば、つながりは切れないんだ。<br>自分の<b>辺</b>も、石と同じようにつながるよ。2段目の石と辺のあいだの2マスも、ブリッジなんだ。<br>割りこみは、よそ見をさせるための手のことが多いペン。あわてず受けよう！',
      b_edge: '自分の辺から2段目の石は、下の2マスが空いていれば、もう辺とつながっているのと同じ！ これを<b>辺のテンプレート</b>っていうんだ。<br>辺そのものに打つのは1手のむだ。2段目を上手に使うペン。',
      t_double: 'ここからは戦術！ 強い手は、つながる狙いを2つ同時に作るんだ。<br>相手は1手で片方しかふさげないから、狙いが2つ残れば勝ちペン。道ごとに、あと何手か数えてみよう。',
      t_stop: '相手が2手でつながりそうなとき、片方の道をふさぐだけでは足りないんだ。<br>2つの狙いが両方通る、弱いつなぎ目を探して切ろう！ ブリッジは切れないから、そこはねらわないペン。',
      t_ladder: '辺の近くで、相手が1段目をふさぐあいだに2段目を押して進む形を<b>ラダー</b>っていうんだ。<br>その先に自分の石（<b>ラダーエスケープ</b>）が待っていれば、ラダーは勝ち！ 進める前に、行き先を確かめるペン。',
      t_edge3: '3段目の石も、下の決まった範囲が空いていれば辺とつながっているんだ。この形を<b>ジッグラト</b>っていうよ。<br>割りこまれたら、その範囲の中で受けよう！ 受けたあとに辺への形が残れば、まだ大丈夫ペン。',
      s_center: 'ここからは作戦！ スワップがなければ、先手は中央か、鈍角の角どうしを結ぶ線の上から始めると強いんだ。<br>どっちの辺にも近いからね。まん中に近い手ほど点が高いペン！',
      s_swap: 'スワップありでは、青は赤の1手目を見て、その石をもらう（スワップ）か、自分で打つかを決めるんだ。<br>中央に近い手は強いからもらう、ふちの手はたいてい弱いから打つ。スワップは上のボタンで選べるペン！',
      s_block: '相手の石のすぐとなりで止めても、ブリッジでするっと回りこまれちゃうんだ。<br>少し離れて、相手の進む先に打とう！ その石は、自分の道にも役立つペン。',
      s_plan: '中盤は、自分と相手、両方のいちばん短い道を見くらべるんだ。<br>いい手はたいてい、自分の道を助けながら相手の道もふさぐ手！ 両方を数えてから打つペン。',
    },
    ask: {
      b_connect: ['1手で、自分の2つの辺をつないでみて！', '勝ちを決める1マスはどこかな？', 'あと1手でつながる形だね。どこに打つ？', '辺から辺まで、道を完成させる点を探してみよう！', 'ここで決めちゃおうペン！ つながる1マスは？'],
      b_block: ['相手がつながるのを止めてみて！', '相手の道の、最後のすき間はどこかな？', 'このままだと相手がつながる！ どこでふさぐ？', '相手の勝ちを消す1マスを探してみよう！', '守りの1手だペン。ふさぐ場所はわかる？'],
      b_bridge: ['どう守られても、2手でつながる手を打ってみて！', '打ったあと、相手が止めきれない形になる点はどこかな？', 'ブリッジで辺まで届く1手を探してみよう！', '相手が片方しか止められない形、作れる？', 'ブリッジの出番だペン！ どこに打つ？'],
      b_save: ['割りこまれたブリッジを守ってみて！', 'つながりを切らせない1手はどこかな？', '相手の割りこみに、どう受ける？', 'ブリッジを元通りにする点を探してみよう！', 'あわてず受けるペン！ 受ける場所は？'],
      b_edge: ['2段目の石で、辺までつなぐ手を打ってみて！', '辺のテンプレートが使える点はどこかな？', '辺までの道を、1手で確保できる？', '2段目の急所を探してみよう！', '辺へのつながりを決める1手はどこだペン？'],
      t_double: ['3手以内につながる、ただ1つの手を見つけて！', '狙いを2つ同時に作れる点はどこかな？', '相手が両方は止められない1手、わかる？', '両ねらいの急所を探してみよう！', 'ここは攻めどきペン！ 決め手はどこ？'],
      t_stop: ['相手の2手の狙いを、1手で止めてみて！', '相手の狙いを、2つまとめて消せる点はどこかな？', 'このままだと相手の両ねらい！ どこで切る？', '相手の道の、切れやすいところを探してみよう！', '守りどころだペン。急所はどこ？'],
      t_ladder: ['ラダーを使って、辺までつないでみて！', 'ラダーが勝ちになる進め方はどこかな？', 'ラダーを進める次の1手、わかる？', '2段目を押して進む点を探してみよう！', '行き先は確かめたペン？ さあ、どこに打つ？'],
      t_edge3: ['辺とのつながりを守ってみて！', '割りこみに、テンプレートの中で受けるならどこかな？', '辺へのつながりを残す1手はどこ？', 'ジッグラトを守る受けを探してみよう！', '割りこまれても落ち着いてペン。受ける場所は？'],
      s_center: ['いちばん強い最初の1手を打ってみて！', 'どこから始めると、両方の辺に近いかな？', '先手の1手目、きみならどこに打つ？', '盤全体を見て、いちばん働く点を探してみよう！', '最初の1手が大事だペン！ どこにする？'],
      s_swap: ['スワップする？ それとも自分で打つ？', 'この1手目、もらうと得かな？', '青の番だね。いちばんいい選び方はどれ？', '赤の石の強さを見て、決めてみよう！', 'スワップか、打つか。きみの判断はどっちペン？'],
      s_block: ['相手の道を止める、いちばんいい手を選んでみて！', '相手の道を、どこでふさぐのがいいかな？', 'くっつける？ 離れる？ 止め方を選んでみよう！', '相手の進む先を読んで、先回りできる？', '止めながら自分も得する点はどこペン？'],
      s_plan: ['中盤のいちばんいい手を選んでみて！', '自分の道と相手の道、両方に効く点はどこかな？', '中盤の急所、わかる？', 'つなぐ手とふさぐ手を兼ねる点を探してみよう！', 'ここが勝負どころペン！ どこに打つ？'],
    },
    hint: {
      b_connect: ['自分の石の列で、1マスだけ空いているところはない？', '辺から伸びた石と、反対の辺から伸びた石のあいだを見てみて。', '途切れているところは1か所だけだペン。', 'となりどうしでつながるか、1マスずつたどってみて！', '自分の2つの辺から、石をたどってみよう！'],
      b_block: ['相手の石を辺から辺へたどってみて。切れ目はどこ？', '相手が次に打ったら勝ちになるマスを探すペン。', 'ふさげるのは1か所だけ。相手の目で見てみて！', '相手の列のすき間に、先に自分の石を置こう。', '相手の番になったつもりで考えてみて！'],
      b_bridge: ['自分の石から1つとばした場所に、ブリッジを作れる点はない？', '間の2マスが両方空いているか、確かめてみて！', '辺までの残りも、2通りで届くかな？', 'つながり方が1通りだけだと、ふさがれちゃうペン。', '打ったあと、相手の番になったつもりで考えてみて。'],
      b_save: ['ブリッジの間の2マス、片方がふさがれていない？', '相手の石のとなりに、もう1つの空きマスがあるはず！', '割りこまれた場所のすぐ横を見てみよう。', 'よそを打つと、そこで切られちゃうペン。', '切れそうなつながりはどこかな？ 自分の石をたどってみて。'],
      b_edge: ['辺から2段目のマスに注目！', '下の2マスが両方空いている、2段目の点を探すペン。', '自分の石から、2段目までつながる点はある？', '辺そのものに打つ必要はないんだ。1段上を見てみて！', 'つながりを途切れさせずに2段目へ届く点はどこかな？'],
      t_double: ['打ったあと、短い道が2本残る点を探してみて！', 'ブリッジと辺のテンプレート、組み合わせられないかな？', '狙いが1本だけだと、相手にふさがれちゃうペン。', 'それぞれの道があと何手か、数えてみよう！', '2つの道が分かれる、分かれ道の点はどこかな？'],
      t_stop: ['相手の2本の道が、どこで重なっているか見てみて！', 'ブリッジは切れないから、ほかのつなぎ目をねらうペン。', '相手が次に打ったら2通りになる点、先に取れないかな？', '片方の道だけふさいでも、もう片方が残っちゃう。', '相手の目線で、いちばん打ちたい点を探してみよう！'],
      t_ladder: ['2段目の石を、辺にそって進める向きはどっち？', 'ラダーの行き先に、助けてくれる自分の石はある？', '相手は1段目をふさぐしかない。次はどこを押す？', 'エスケープの石がある方へ進めるペン！', '進めたあと、1手でつながる点がいくつできるかな？'],
      t_edge3: ['割りこまれた石のまわりを見てみて！', '受けたあとも、辺へ届く形が残るかな？', 'テンプレートの範囲の外に打つと、切られちゃうペン。', 'この問題は、受け方が2通りあることも。どっちでもOK！', '3段目の石から辺まで、道をたどってみよう！'],
      s_center: ['盤のまん中あたりを見てみて！', '鈍角の角どうしを結ぶ線を思い浮かべてみよう。', 'ふちに近い点は、相手に止められやすいペン。', '赤の2つの辺、どっちにも近い点はどこかな？', 'まん中に近いほど、行ける方向が多いんだ。'],
      s_swap: ['赤の石は中央に近い？ ふちに近い？', '強い石ならもらっちゃうのが得ペン。', 'ふちの石なら、自分で打つほうがいいかも！', 'もらったら、その石は青の石になるんだ。役に立ちそう？', 'スワップしないなら、中央あたりで応じるのが基本だね。'],
      s_block: ['相手の石にくっつけず、2〜3マス先を見てみて！', '相手がブリッジで回りこめない場所はどこかな？', '止める石が、自分の道にもなる点を探すペン。', '相手の進む向きを読んでみよう！', 'すぐとなりで止めると、するっとかわされちゃう。'],
      s_plan: ['自分の道と相手の道、両方を数えてみて！', 'つなぐ手とふさぐ手、1手で両方できる点はないかな？', '相手のいちばん短い道はどこを通る？', '自分のブリッジに割りこまれていないかも見てみるペン。', 'いちばん大事な場所は、2つの道が交わるところかも！'],
    },
    // why the right cell works (plain clauses: {n} = cells the opponent still needs)
    why: {
      b_connect: ['2つの辺が1本の道でつながる', '辺から辺まで、道が完成する', '最後のすき間がうまって勝ちが決まる', '途切れていた列が、ひとつながりになる', 'その1マスで勝ちの道が通る'],
      b_block: ['相手の最後のすき間がふさがる', '相手は回り道で、あと{n}マス必要になる', '相手の勝ちの1マスを先に取れる', '相手の列がそこで切れる', '相手の道が、あと{n}マスまで遠のく'],
      b_bridge: ['ふさぐ場所が2つになって、相手の守りが間に合わない', '1手でつながる点が2つできる', 'どっちをふさがれても、残りの1つで届く', 'ブリッジで、辺まで切れずに届く', '相手に止める手がなくなる'],
      b_save: ['ブリッジのつながりが切れずに残る', '割りこみをはね返して、道がつながったまま', '切られそうな所を、しっかりうめられる', '相手の割りこみが空振りになる', '2つの石が、となり同士でつながる'],
      b_edge: ['2段目の石が、下の2マスのどちらかで辺に届く', '辺のテンプレートで、辺とつながったも同然になる', '相手が片方をふさいでも、もう片方で辺に届く', '辺に直接打たずに、1手得できる', '2段目から、辺まで切れない形になる'],
      t_double: ['狙いが2つできて、相手の守りが1手足りなくなる', '2本の短い道が同時に残る', '相手がどっちをふさいでも、もう片方が通る', '両ねらいの形ができる', '相手の守りが追いつかなくなる'],
      t_stop: ['相手の2つの狙いが、まとめて止まる', '相手の道のつなぎ目が切れる', '相手は2手でつながれなくなる', '相手の両ねらいが消える', 'いちばん弱いつなぎ目を、先に切れる'],
      t_ladder: ['ラダーが、エスケープの石まで届く', '2段目を押して、相手を1段目に追いこめる', '相手は受けるだけで手いっぱいになる', 'エスケープの石と手をつなげる', '辺にそって、切れずに進める'],
      t_edge3: ['範囲の中で受けて、辺とつながったままになる', 'ジッグラトの形がくずれずに残る', '割りこみが空振りになる', '辺までの道が、切れない形で残る', '相手に、辺とのつながりを切らせない'],
    },
    // the strategy steps: why, by the best cell's shape (HXA.kind)
    whyK: { swap: ['この1手目は強いから、もらうのがいちばん得になる', '中央に近い強い石を、そのまま自分のものにできる', '赤のいい石をもらって、有利に戦える'],
      noswap: ['この石はもらっても得が少なく、自分で中央を争うほうがいい', 'ふちに近い石はもらう価値が小さいから、自分で打てる', 'スワップせずに、自分で中央を争える'],
      save: ['割りこまれたブリッジに受けて、つながりが切れない', 'ブリッジを守って、道がつながったままになる'],
      intrude: ['相手のブリッジに割りこんで、先に受けさせられる', '割りこみで、先手で形を決められる'],
      edge: ['2段目から、辺のテンプレートで辺に届く', '辺に打たずに、2段目で辺とつながれる'],
      bridge: ['ブリッジで、安全なまま遠くまで伸ばせる', 'ブリッジなら、どっちをふさがれてもつながる', '切れないブリッジで、一気に道がのびる'],
      adjtouch: ['自分の石とつながりながら、相手の行く手もおさえられる', 'つなぐのと止めるのを、1手でこなせる'],
      touch: ['相手の石にぴたっとつけて、進む向きをおさえられる', '相手の行く手を、すぐとなりでおさえられる'],
      adj: ['となりにつないで、切られる心配がなくなる', 'しっかりつないで、すきをなくせる'],
      center: ['まん中を取って、どの辺にも近くなる', 'どの方向にも伸びられる、まん中が取れる'],
      far: ['少し離れて先回りして、相手が回りこみにくくなる', '相手の進路の先をふさいで、すり抜けさせない', '離れて止めた石が、自分の道にもなる'],
      open: ['どこへでも伸びられる広い場所を、先に取れる', '広い場所を先に取って、道の選び方が増える'] },
    lack: { bridge: 'つながりが弱いままになる', touch: '相手の行く手が空いたままになる', adjtouch: 'つなぐか止めるか、片方しかできていない', far: '相手の進路の先が空いたままで、すいすい進まれちゃう',
      adj: '自分の石とつながらず、切られるすきが残る', center: 'まん中を相手に先に取られちゃう', open: '広い場所を相手に先に取られちゃう', edge: '辺までの道が、まだ切られやすい',
      intrude: '相手のブリッジがそのまま残っちゃう', save: '割りこまれたブリッジが切られちゃう', swap: '強い赤石が、相手のまま残っちゃう' },
  };
  const HX_CH = {   // (2026-11-23 lesson loop: each lesson its own order of praise / soft words / push / tail — hxVoice; the same order in every lesson read as a stamp)
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちりだペン！', 'やったね！', 'すごい、よく見つけたね！', 'いい目をしてる！', 'その感じ！', 'ナイスな一手！', '冴えてるペン！', 'いい手だね！', 'そうそう、それ！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', 'その勢いで次へ行こうペン！', null, 'まだまだ行けるペン！'],
    soft: ['大丈夫！', 'ドンマイだペン！', 'おしい！', '気にしない、気にしない！', 'あと少しだった！', '平気平気、ここで覚えよう！', 'いい線いってたペン！', 'よくある見落とし、大丈夫！', 'ドンマイ！', 'いっしょに見てみよう！'],
    tail: [null, null, 'これで覚えちゃおう！', null, '次はきっと見つけられるペン！', null, 'ここ、大事なところだペン！'],
    right: ['{m}なら、{a}んだ。', '{m}が正解！ {a}ペン。', 'ここは{m}。そこなら{a}から！', '{m}を見て。あそこなら{a}でしょ？', '答えは{m}だった。{a}んだ。'],
    why: ['{a}！', 'その手なら{a}ね。', '{a}ペン！', 'ほら、{a}でしょ？', 'これで{a}んだ。'],
    you: ['{x}だと、{b}。', 'きみの{x}だと、{b}んだ。', '{x}では{b}！', '{x}に打つと、{b}。', '{x}だと{b}んだ。'],
  };
  function hxLF(pos, m) {   // what the side to move gets by playing m: the win, the cells each side still needs, each side's winning cells
    const me = pos.side, o = 3 - me, q = pos.clone().play(m), w = q.winner();
    return { q, win: w === me, needMe: q.need(me), needO: q.need(o), oWin: w ? [] : q.winCells(o), W: w ? [] : q.winCells(me) };
  }
  function hxDouble(q) {   // the opponent's reply that leaves it two winning cells (a connection in two moves), or -1
    const o = q.side; for (const r of q.moves()) { if (r === 1023) continue; const t = q.clone().play(r); if (t.winCells(o).length >= 2) return r; } return -1;
  }
  function hxLsJa(E, s, P, i, pts) {
    const id = s.id, H = HXJ_LS, C = HX_CH, pos = E.Pos.from(P.s), k = i % 5, me = pos.side, sp = P.s, N = sp.n * sp.n;
    const pk = (L, j) => L[((j % L.length) + L.length) % L.length], f2 = (t, v) => fill(t, v), M = HXM('ok', 'ja'), X = HXM('ng', 'ja'), G = HXM('hl', 'ja');
    const sd = shSeed('hx' + id), vo = (L, x) => { const p = shPerm(sd ^ x, L.length); return j => L[p[((j % L.length) + L.length) % L.length]]; };
    const VC = { good: vo(C.good, 0x11), soft: vo(C.soft, 0x9e37), push: vo(C.push, 0x51ed), tail: vo(C.tail, 0x2b7f) };
    const ask = pk(H.ask[id] || [''], k), hintTx = pk(H.hint[id] || [''], k);
    if (P.ok) {   // one-move tactics: any cell in P.ok
      const ok = P.ok, A = ok[0], n0 = pos.need(me), FA0 = hxLF(pos, A);
      const near = () => { const NB = E.geo(sp.n).NB, L = []; ok.forEach(a => NB[a].forEach(q => { if (!pos.at(q) && !ok.includes(q) && !L.includes(q)) L.push(q); })); NB[A].forEach(a => NB[a].forEach(q => { if (!pos.at(q) && !ok.includes(q) && !L.includes(q)) L.push(q); })); return L; };
      const wrongOf = u => { if (u != null && u >= 0 && u < N && !ok.includes(u) && !pos.at(u)) return u; const L = near(); return L.length ? L[(k * 3) % L.length] : pos.moves().find(q => q !== 1023 && !ok.includes(q)); };
      const why = (F, j) => { let a = pk(H.why[id] || H.why.b_connect, j); if (id === 'b_bridge' && F.W.length < 2) a = pk(H.why.t_ladder.slice(4).concat(H.why.b_bridge.slice(2, 3)), j); return a.replace('{n}', F.needO); };
      const loss = (u, F, j) => {   // what the miss gives up (and the cell marked gold, if any)
        const hl = [];
        if (F.oWin.length) { const at = F.oWin.includes(A) ? M : (hl.push(F.oWin[0]), G);
          return [pk([`相手に${at}を打たれて、先につながられちゃう`, `${at}を相手に取られて、そのまま負けちゃう`, `相手が${at}でつながって、勝負が終わっちゃう`], j), hl]; }
        if (id === 'b_connect') return [pk(['まだ1マス足りなくて、勝ちにならない', '道が途切れたままで、つながらない', '辺から辺まで、まだ届かない'], j), hl];
        if (id === 'b_edge' && HXA.facts(sp, u).onEdge) return [pk(['辺そのものに打つのは、1手のむだになっちゃう', '辺に直接打っても、2段目ほどの働きがない'], j), hl];
        if (id === 'b_block' || id === 't_stop') { const r = hxDouble(F.q); if (r >= 0) { hl.push(r);
          return [pk([`相手は${G}に打って、つながる道を2本にできちゃう`, `${G}に打たれると、相手の両ねらいが決まっちゃう`, `相手に${G}を取られて、2手でつながれちゃう`], j), hl]; }
          return [pk(['相手の道が、まだ切れずに残っちゃう', '相手のつなぎ目が、そのまま残る'], j), hl]; }
        if (F.W.length === 1) { hl.push(F.W[0]); return [pk([`1手でつながる点が${G}だけで、そこをふさがれちゃう`, `${G}をふさがれたら、それで止まっちゃう`, `狙いが${G}の1つだけだから、相手に止められちゃう`], j), hl]; }
        if (F.needMe >= n0) return [pk(['道が1マスも縮まらない', '辺までの道のりが、ちっとも短くならない', 'つながりに役立たない場所なんだ。道は短くならない'], j), hl];
        const cut = F.q.clone().play(A).need(me);
        if (cut > FA0.needMe && cut < 99) return [pk([`相手に${M}を取られると、道があと${cut}マス必要になっちゃう`, `${M}を相手にふさがれて、道があと${cut}マスに遠のく`, `相手が${M}に打つと、道があと${cut}マス残っちゃう`], j), hl];
        return [pk(['まだ相手にふさぐ手が残っちゃう', '相手に守られて、つながらない'], j), hl];
      };
      const good = function (u) { this._hl = []; const F = ok.includes(u) ? hxLF(pos, u) : FA0; return [VC.good(k), f2(pk(C.why, k), { a: why(F, k) }), VC.push(k)].filter(Boolean).join(' '); };
      const ng = function (u0) { const u = wrongOf(u0); this._hl = []; if (u == null) return '';
        const F = hxLF(pos, u), [b, hl] = loss(u, F, k + 1); this._hl = hl;
        return [VC.soft(k), f2(pk(C.right, k + 2), { m: M, a: why(FA0, k + 2) }), f2(pk(C.you, k + 3), { x: X, b }), VC.tail(k)].filter(Boolean).join(' '); };
      return { ask, hintTx, good, ng, own: true };
    }
    // the strategy steps (P.sc: the AI's values; P.best may be the swap)
    const best = P.best, val = new Map(P.sc), vb = val.has(best) ? val.get(best) : Math.max(...P.sc.map(e => e[1])), sw = !!sp.sw;
    const fb = HXA.facts(sp, best), kb0 = HXA.kind(fb), kb = sw && kb0 !== 'swap' ? 'noswap' : kb0;
    const whyB = j => pk(H.whyK[kb] || H.whyK.open, j);
    const HK = { touch: ['今回は、くっつけて止めるのが急所かも。相手の進む向きを見てみて！', '相手の石が伸びたい方向は？ そこをすぐ横でおさえられないかな？', 'ここは例外かも。ぴたっとつける手もくらべてみて！'],
      adjtouch: ['自分の石とつながりながら、相手もおさえられる点はないかな？'], bridge: ['止めるより、ブリッジで自分の道を伸ばすほうがいい場面かも！', '自分の石から1つとばして、ブリッジを組める点はある？', '守るだけじゃなく、自分の道を伸ばす手も考えてみるペン。'],
      adj: ['自分の石のすぐとなりを見てみて。切られそうな所はない？'], save: ['自分のブリッジに、割りこまれていないかな？'], intrude: ['相手のブリッジのすき間を見てみて！'], edge: ['辺から2段目に、いい点がありそうだペン。'], center: ['まん中あたりを見てみて！'] };
    const nth = s.problems.slice(0, i).filter(Q => Q.sc && HXA.kind(HXA.facts(Q.s, Q.best)) === kb0).length;
    const hint2 = id === 's_block' && HK[kb0] ? pk(HK[kb0], nth) : hintTx;
    const full = u => pts(P, u) >= 20;
    const wrongOf = u => u != null && u !== best && !full(u) ? u : (P.sc.slice().sort((a, c) => a[1] - c[1])[k % 2] || [])[0];
    const good = function (u) { this._hl = []; const same = u != null && u !== best;
      return [VC.good(k), same ? pk(['きみの手も、いちばんの手とほとんど同じくらいいい手！', 'その手も満点、いちばんの手と変わらないくらい強いペン！'], k) : f2(pk(C.why, k), { a: whyB(k) }), VC.push(k)].filter(Boolean).join(' '); };
    const ng = function (u0) { this._hl = []; const u = wrongOf(u0); if (u == null) return '';
      const fu = HXA.facts(sp, u), ku = HXA.kind(fu), mine = val.has(u) ? val.get(u) : null, d = mine == null ? null : Math.round((HXA.wr(vb) - HXA.wr(mine)) * 100);
      const Mb = best === 1023 ? 'スワップ' : M, Xu = u === 1023 ? 'スワップ' : X;
      let b;
      const stones = /[rb]/.test(String(sp.b)), hc = q => { const n = sp.n, r = Math.floor(q / n) - (n - 1) / 2, c = q % n - (n - 1) / 2; return (Math.abs(r) + Math.abs(c) + Math.abs(r + c)) / 2; };
      if (kb === 'swap') b = pk(['強い赤石が、相手のまま残っちゃう', '中央に近いいい石を、相手に持たせたままになる', 'せっかくの強い石を、もらいそこねちゃう'], k);
      else if (ku === 'swap') b = 'もらっても得が小さい石を取って、中央を争う手番を逃しちゃう';
      else if (kb0 === 'save') b = 'ブリッジに受けていないから、そこで切られちゃう';
      else if (!stones && u !== 1023 && best !== 1023 && hc(u) > hc(best)) b = pk(['まん中から遠くて、相手に止められやすい', '盤のはしに寄っていて、行ける方向が少ない', '中央から離れていて、道の選び方がせまくなる'], k);
      else if (stones && fu.dOpp >= 4 && fu.dOwn >= 4) b = pk(['ほかの石から遠すぎて、いまの戦いに関われない', '戦いの場所から離れすぎていて、働きが小さい', 'まわりに石がなくて、つなぐのにも止めるのにも役立たない'], k);
      else if (kb0 === 'intrude') b = '相手のブリッジに割りこむ先手を逃しちゃう';
      else if (kb0 === 'far' && (ku === 'touch' || ku === 'adjtouch')) b = 'くっつけて止めると、すぐ横へすり抜けられちゃう';
      else if ((kb0 === 'touch' || kb0 === 'adjtouch') && (ku === 'far' || ku === 'open')) b = '離れすぎて、そのあいだを相手に使われちゃう';
      else if (kb0 === 'bridge' && ku === 'adj') b = '1マスずつしか進めず、もったいない';
      else if (fu.onEdge && !fb.onEdge) b = 'ふちの1段目は辺に近すぎて、働きが小さい';
      else if (kb0 === 'edge' && !fu.edge) b = '辺までの道が、まだ切られやすい';
      else b = H.lack[kb0] || H.lack.open;   // (2026-11-22: what the move leaves undone — never "the AI says")
      const out = [VC.soft(k), f2(best === 1023 ? pk(['{m}が正解！ {a}ペン。', '答えは{m}だった。{a}んだ。', 'ここは{m}がいちばん。{a}から！'], k) : pk(C.right, k + 2), { m: Mb, a: whyB(k + 1) }), f2(pk(C.you, k + 3), { x: Xu, b })];
      out.push(VC.tail(k));
      return out.filter(Boolean).join(' '); };
    return { ask, hintTx: hint2, good, ng, own: true };
  }
  const HEX = {
    LKEY: 'aicoding-hex-lessons', OKEY: 'aicoding-hex-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../hex/lessons.json?v=30261123b'), getJ('../hex/openings.json?v=1'), fetch('../hex/i18n.js?v=20261124').then(r => r.text()), hxEng().catch(() => null), getJ('../hex/ramps3d.json?v=2').catch(() => ({})), fetch('../hex/voice-pen-ja.js?v=3').then(r => r.ok ? r.text() : '').catch(() => '')])
        .then(([ls, op, tx, , rt, vp]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] hex texts', e); } this.I = w.I18N || {}; this.data = { ls, op }; this.RT = rt || {};
          try { const v = {}; new Function('window', vp)(v); this.V = ((v.I18N || {})['ja@pen']) || {}; } catch (e) { this.V = {}; }   // (ゴイシペン's own lines, 3D, ja)
          return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && this.V && this.V[k] != null ? this.V[k] : I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: sp => window.AtlasMini && AtlasMini.hex ? AtlasMini.hex(sp) : '',
    // 定跡 (hex/openings.json): coordinates are not on the 3D board — a title with one is replaced by the set's short line, and the
    // notes name cells by their marks (the stone just played green, an earlier one gold)
    opTitle(g, lang) { const t = L(g.title, lang); return /\b[a-m](1[0-3]|[1-9])\b/.test(t) ? this.tx('op.' + g.id + '.short', lang) || t : t; },
    opSpec(g, k) { const E = window.HexEngine; if (!E) return null; const p = E.replay({ n: g.n, swap: g.swap }, g.study.line.slice(0, k)).pos; let b = ''; for (let i = 0; i < p.b.length; i++) b += p.b[i] === 1 ? 'r' : p.b[i] === 2 ? 'b' : '.'; return { n: g.n, b, side: p.side }; },
    list(kind, lang) {
      const D = this.data, pr = J(this.LKEY, {});
      if (kind === 'open') { const po = J(this.OKEY, {}); return D.op.sets.map(g => ({ key: g.id, cat: g.grp, catName: this.tx('op.grp.' + g.grp, lang), title: this.opTitle(g, lang), sub: this.tx('op.' + g.id + '.short', lang), svg: this.opSpec(g, g.show || 2) ? this.mini(this.opSpec(g, g.show || 2)) : '', st: po[g.id] ? (po[g.id].pass ? 'pass' : 'try') : '' })); }
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v);
      // the warm-up (2026-11-15): explain on the first problem (its answers green) → the same problem turned 180° (a symmetry of Hex);
      // texts hex/ramps3d.json (14 languages), ゴイシペン's own lines in ja (hex/voice-pen-ja.js ramp:<step>/<field>)
      const RT = this.RT || {}, V = lang === 'ja' ? (this.V || {}) : {}, W = f => V['ramp:' + s.id + '/' + f] != null ? { ja: V['ramp:' + s.id + '/' + f], __voice: true } : RT[s.id + '/' + f];
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L(RT['ui/' + k], lang), v || {});
      const P0 = (s.problems || [])[0]; let ramp = null;
      if (P0 && W('t') && W('g')) {
        const n = P0.s.n, N = n * n, rot = q => q >= 0 && q < N ? N - 1 - q : q, ok = hxOk(P0), sp = P0.s;
        const sr = Object.assign({}, sp, { b: String(sp.b).split('').reverse().join('') });
        const mk = ok.filter(q => q >= 0 && q < N).map(q => [q, 'ok']); if (ok.includes(1023)) { const r = String(sp.b).search(/[rb]/); if (r >= 0) mk.push([r, 'hl']); }
        ramp = [{ k: 'explain', s: sp, marks: mk, t: W('t'), body: W('body') },
          { k: 'try', s: sr, ok: ok.map(rot), look: hxArea(sr, rot(ok[0])), g: W('g'), h: V['ls.' + s.id + '.hint'] != null ? { ja: V['ls.' + s.id + '.hint'], __voice: true } : Object.fromEntries(Object.keys(this.I || {}).map(l => [l, (this.I[l] || {})['ls.' + s.id + '.hint']]).filter(x => x[1])), y: W('y') }];
      }
      const ja = lang === 'ja' && window.HexEngine && HXJ_LS.intro[s.id];   // (2026-11-22 lesson loop: ゴイシペン's own intro, questions, hints, why / what the miss gives up — hxLsJa)
      return { id: s.id, title: T('title'), intro: ja ? HXJ_LS.intro[s.id] : T('intro'), ramp, RU,
        probs: (s.problems || []).map((P, i) => { const good = P.ok || [P.best];
          const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: hxArea(P.s, P.ok ? P.ok[0] : P.best),
            good: () => T('why', { m: HXM('ok', lang), x: HXM('ng', lang) }), ng: () => { const t = T('ng', { m: HXM('ok', lang), x: HXM('ng', lang) }); return t && t !== 'undefined' ? t : T('why', { m: HXM('ok', lang), x: HXM('ng', lang) }); } };
          if (ja) try { Object.assign(o, hxLsJa(window.HexEngine, s, P, i, (Q, m) => this.points(Q, m))); } catch (e) { console.warn('[lessons3d] hex lesson', e); }
          return o; }).filter((o, i) => !(ramp && i === 0)),   // (2026-11-24 第2期・追1: the warm-up's problem — shown with its answer, then turned 180° — is not asked again; lesson-verify.js hex hxWarm)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, m) {   // = hex/app.js problemPoints
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : (P.sc.length ? Math.min(...P.sc.map(e => e[1])) - 60 : -1000);
      const wr = v => v > HEX_WINT ? 1 : v < -HEX_WINT ? 0 : Math.max(0, Math.min(1, (v + 1000) / 2000));   // (= hex/app.js wrOf)
      if (mine >= best - 15 && !(best > HEX_WINT && mine < best)) return 20;
      if (best > HEX_WINT && mine <= HEX_WINT) return mine > 400 ? 8 : 0;
      if (mine < -HEX_WINT && best >= -HEX_WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (wr(best) - wr(mine)) / 0.25)));
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const n = g.n, line = g.study.line.slice(), notes = {}, noteMarks = {}, NCH = NC.hex || {}, cnt = {}, LI = this.data.op.sets.indexOf(g);
      const cellOf = t => { const c = 'abcdefghijklm'.indexOf(t[0]), r = +t.slice(1) - 1; return c >= 0 && c < n && r >= 0 && r < n ? r * n + c : -1; };
      const E = window.HexEngine; let pos = E ? E.replay({ n, swap: g.swap }, []).pos : null;
      const specOf = p => { let b = ''; for (let q = 0; q < p.b.length; q++) b += p.b[q] === 1 ? 'r' : p.b[q] === 2 ? 'b' : '.'; return { n, b, side: p.side }; };
      line.forEach((m, i) => {
        let played = m; const pre = pos ? specOf(pos) : null;
        if (pos) { const before = pos.clone ? pos.clone() : null; pos.play(m); if (m === (E ? E.SWAP : 1023)) { for (let q = 0; q < pos.b.length; q++) if (pos.b[q] && before && !before.b[q]) played = q; } }
        const raw = g.study.notes && g.study.notes[i] ? L(g.study.notes[i], lang) : '', mk = [];
        const txt = String(raw).replace(/\b([a-m])(1[0-3]|[1-9])\b/g, t => { const q = cellOf(t); if (q < 0) return t; const k = q === played ? 'ok' : 'hl'; mk.push([q, k]); return HXM(k, lang); });
        notes[String(i)] = `<b>${i + 1}. ${this.tx(i % 2 ? 'p2' : 'p1', lang) || (i % 2 ? '○' : '●')}</b>` + (txt ? '<br>' + txt : '');
        if (lang === 'ja' && pre) {   // (2026-11-22 lesson loop: ゴイシペン says what the move does, read from the board — hxNoteJa)
          const [say, m2] = hxNoteJa(pre, m, i, !!g.swap, cnt, LI); if (m === 1023) m2.forEach(e => { if (e[0] === 1023) e[0] = played; });
          notes[String(i)] = `<b>${i + 1}. ${HXJ_OP.side(pre.side === 2 ? 2 : 1)}</b><br>` + say; mk.length = 0; mk.push(...m2);
        }
        if (mk.length) noteMarks[String(i)] = mk;
      });
      const probs = shuffle(g.problems || []).slice(0, 5), used = {};   // (used: how often each kind of miss was explained, to vary the words)
      const intro = lang === 'ja' && HXJ_OP.intro[g.id] ? HXJ_OP.intro[g.id] : NCH['op:' + g.id + '/intro'] ? L(NCH['op:' + g.id + '/intro'], lang) : this.tx('op.' + g.id + '.intro', lang);
      return { id: g.id, title: this.opTitle(g, lang), intro: String(intro || '').replace(/\n/g, '<br>'), start: { spec: { n, swap: g.swap }, me: g.side === 2 ? 2 : 1 }, steps: line, notes, noteMarks,
        probs: probs.map((P, i) => { const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: hxArea(P.s, P.best),
          ng: () => this.tx('op.why', lang, { m: HXM('ok', lang) }), good: () => this.tx('op.why', lang, { m: HXM('ok', lang) }) };
          if (lang === 'ja' && window.HexEngine && P.sc && P.sc.length) Object.assign(o, this.opJa(P, LI, i, probs, used));
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts / max * 100)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    opJa(P, LI, i, probs, used) {   // (2026-11-22 lesson loop) the question, hint, praise and correction of an opening problem — see HXA / HXJ_OP
      const H = HXJ_OP, sp = P.s, sw = !!sp.sw, best = P.best, val = new Map(P.sc), k = HXOP_K(LI, i), pk = (a, j) => a[((j % a.length) + a.length) % a.length];
      const kindOf = Q => { const k0 = HXA.kind(HXA.facts(Q.s, Q.best)); return Q.s.sw && k0 !== 'swap' ? 'noswap' : k0; };
      const fb = HXA.facts(sp, best), kb0 = HXA.kind(fb), kb = sw && kb0 !== 'swap' ? 'noswap' : kb0, side = H.side(sp.side === 2 ? 2 : 1);
      const nth = (probs || []).slice(0, i).filter(Q => Q.sc && kindOf(Q) === kb).length + LI, uz = (key, a) => { used = used || {}; const c = used[key] = (used[key] || 0) + 1; return pk(a, c + LI); };
      const M = HXM('ok', 'ja'), X = HXM('ng', 'ja'), Mb = best === 1023 ? 'スワップ' : M;
      const full = u => this.points(P, u) >= 20;
      const wrongOf = u => u != null && u !== best && !full(u) ? u : (P.sc.slice().sort((a, c) => a[1] - c[1])[k % 2] || [])[0];
      const ask = sw ? pk(H.askSw, k + LI) : fill(pk(H.ask, k + LI), { s: side }), hintTx = pk(H.hint[kb] || H.hint.open, nth);
      const good = function (u) { this._hl = []; const same = u != null && u !== best;
        return [pk(H.good, k), same ? pk(['きみの手も、いちばんの手と同じくらい強いペン！', 'その手も満点！ いちばんの手と変わらない強さなんだ。'], k) : pk(H.why[kb] || H.why.open, nth), pk(H.push, k)].filter(Boolean).join(' '); };
      const ng = function (u0) { this._hl = []; const u = wrongOf(u0); const right = fill(best === 1023 ? pk(['ここはスワップが正解！ {a}んだ。', '答えはスワップ。{a}から！', 'スワップしていれば、{a}！'], nth) : pk(H.right, k + 2), { m: Mb, a: pk(H.ngWhy[kb] || H.ngWhy.open, nth + 1) });
        if (u == null) return [pk(H.soft, k), right, pk(H.tail, k)].filter(Boolean).join(' ');
        const fu = u === 1023 ? { swap: 1 } : HXA.facts(sp, u), ku = HXA.kind(fu), Xu = u === 1023 ? 'スワップ' : X, stones = /[rb]/.test(String(sp.b));
        let b;
        if (kb === 'swap') b = uz('swap', ['強い赤石が、相手のまま残っちゃう', 'せっかくの強い石を、もらいそこねちゃう', '中央に近いいい石を、相手に持たせたままになる']);
        else if (ku === 'swap') b = uz('usw', ['もらっても得が小さい石を取って、中央を争う手番を逃しちゃう', 'ふちの弱い石をもらうだけで、いい点を先に打たれちゃう', 'うまみの少ない石と引きかえに、中央を相手にゆずっちゃう']);
        else if (kb0 === 'save') b = uz('save', ['ブリッジに受けていないから、そこで切られちゃう', '割りこみを放っておくと、もう片方もふさがれて切れちゃう', '受けそびれたブリッジが、次の一手で切られちゃう']);
        else if (stones && fu.dOpp >= 4 && fu.dOwn >= 4) b = uz('far', ['ほかの石から遠すぎて、いまの戦いに関われない', '戦いの場所から離れすぎて、働きが小さい', 'まわりに石がなくて、つなぐのにも止めるのにも役立たない']);
        else if (kb0 === 'intrude') b = uz('intr', ['相手のブリッジに割りこむ先手を逃しちゃう', '相手のすき間をつくチャンスが消えちゃう', '受けさせる一手を打てず、相手に形を整えられちゃう']);
        else if (kb0 === 'far' && (ku === 'touch' || ku === 'adjtouch')) b = uz('tch', ['くっつけて止めると、すぐ横へすり抜けられちゃう', 'となりで止めても、相手は向きを変えて回りこめちゃう', 'ぴったりつけると、相手にななめへ逃げ道ができちゃう']);
        else if ((kb0 === 'touch' || kb0 === 'adjtouch') && (ku === 'far' || ku === 'open')) b = uz('gap', ['離れすぎて、そのあいだを相手に使われちゃう', '間があきすぎて、相手に押し進まれちゃう', '遠くで待っても、相手は手前で曲がって進めちゃう']);
        else if (kb0 === 'bridge' && ku === 'adj') b = uz('adj', ['1マスずつしか進めず、もったいない', 'となりにつなぐだけで、道があまりのびない', '安全だけど歩みがおそくて、相手に先を越されちゃう']);
        else if (fu.onEdge && !fb.onEdge) b = uz('edg1', ['ふちの1段目は辺に近すぎて、働きが小さい', '辺そのものに打つと、2段目ほど遠くまで効かない', 'いちばん外側の列は、道をのばす力が弱い']);
        else if (kb0 === 'edge' && !fu.edge) b = uz('edg2', ['辺までの道が、まだ切られやすい', '辺とのつながりに、すきが残っちゃう', '辺の手前で、相手にふさがれる心配が残る']);
        else b = uz('lack' + kb0, H.lack[kb0] || H.lack.open);   // (what the move leaves undone — never "the AI says")
        return [pk(H.soft, k), right, fill(pk(H.you, k + 3), { x: Xu, b }), pk(H.tail, k)].filter(Boolean).join(' '); };
      return { own: true, ask, hintTx, good, ng };
    },
    // the warm-up: its position, marks, the right moves
    rampPos: it => ({ spec: it.s, me: it.s.side === 2 ? 2 : 1 }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => it.marks || [], rampOk: (it, u) => (it.ok || []).includes(u), rampAns: it => (it.ok || [])[0], rampLook: it => (it.look || []).map(q => [q, 'ring']),
    spOk: lang => HXM('ok', lang),
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: { n: P.s.n, b: '.'.repeat(P.s.n * P.s.n), side: 1 }, me: 1, lock: true } } : null; },   // (the empty board of the lesson's size while the intro is read)
  };
  const hxOk = P => { if (P.ok) return P.ok.slice(); const best = Math.max(...P.sc.map(e => e[1])); return P.sc.filter(e => e[1] >= best - 15).sort((a, b) => b[1] - a[1]).map(e => e[0]); };   // (the moves worth full points: hex/app.js problemPoints)
  const hxArea = (sp, m) => {   // the hint (= hex/app.js): the answer and one empty cell next to it, never the answer alone
    const n = sp.n, b = sp.b || ''; if (!(m >= 0 && m < n * n)) return [];
    const r = Math.floor(m / n), q = m % n, nb = [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]].map(([dr, dq]) => [r + dr, q + dq]).filter(([a, c]) => a >= 0 && a < n && c >= 0 && c < n).map(([a, c]) => a * n + c).filter(x => b[x] === '.');
    return nb.length ? [nb[Math.floor(Math.random() * nb.length)], m] : [m];
  };
  const HXM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の点' : k === 'hl' ? '金の印の点' : '赤い印の点') + '\u0002' : `<i class="ls-spot ${k}"></i>`;   // (a cell named by its mark)
  /* amazons (2026-11-15): amazons/lessons.json (8 steps of 5 one-move problems: any move in P.ok is right — 20 points or 0, = amazons/app.js
     lessonAnswer). Progress = the full game's ('aicoding-amazons-lessons' { id: { best, clear } }). Texts: checkers/i18n.js + amazons/
     i18n-am*.js (the page's own order), read into a sandbox. The 3D board has no coordinates: the moves the texts name ({m}, {x}) are
     their marks on the board (the amazon's square ring, the destination dot, the arrow's diamond). The warm-ups (step.ramp) play here
     too, with texts without coordinates (atlas/nocoord/amazons.json, 2026-11-16); an intro's notation paragraph is dropped.
     A position here is { spec: { b, side }, me }. Moves: amazons/engine.js move numbers. */
  const AM_ENG = '../amazons/engine.js?v=17';   // (the table adapter's file: one cache)
  const amEng = () => window.AmazonsEngine ? Promise.resolve(window.AmazonsEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = AM_ENG; sc.onload = () => window.AmazonsEngine ? res(window.AmazonsEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const AMM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の手' : '赤い印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;   // (a move named by its marks)
  const AM_MK = { s_escape: 'ng' };   // (amazons/app.js MK_CLS: the squares a problem lights)
  const AM_GM = { 'b_queen/1': [['c8', 'hl']], 'b_arrow/1': [['h7', 'hl']], 'b_block/1': [['c7', 'hl']], 's_trap/1': [['j1', 'ng']], 's_escape/1': [['j10', 'ng']] };
  const amByName = (sp, nm) => { const E = window.AmazonsEngine; if (!E || !nm) return null; const p = E.Pos.from(sp), m = p.moves().find(x => E.name(p, x) === nm); return m === undefined ? null : m; };
  /* amazons lessons in ケロ's words, Japanese (2026-11-22 lesson loop): his own intros and warm-up lines (AMJ_LS), five questions and
     five hints per step, and after the answer the praise with why or, for a miss, the green move and what yours misses — read from the
     board (amazons/engine.js): the line from the amazon to the square (縦・横・斜め and how far), where the arrow flies and what blocks
     it, the exits left around an amazon (emptyAround / freeAt; the square just left counts), the trap the opponent's next move sets
     (boxed), the rooms the arrows cut the board into and the moves left in one (fillMax). Cheers the player on (AM_CH). */
  const AMJ_LS = {
    intro: {
      b_queen: '駒の<b>アマゾン</b>は、チェスのクイーンと同じ動き。縦・横・斜めに、まっすぐ何マスでも進めるケロ！ 途中で曲がるのはなし。',
      b_arrow: '動いたら、着いたマスから<b>矢</b>を1本撃つんだ。矢もアマゾンと同じ線を飛ぶケロ。<br>刺さったマスは最後までふさがったまま！ 「動く＋矢」で1手になるね。',
      b_block: 'アマゾンも矢も、<b>ほかの駒や矢を飛び越えられない</b>。線の途中に何かあれば、その手前で止まっちゃう。<br>的のマスから逆にたどって、ふさがっていない線をさがすのがコツだケロ！',
      b_win: '自分の番に<b>どのアマゾンも動けなかったら負け</b>。取ったり取られたりはなくて、引き分けもないゲームなんだ。<br>相手のアマゾン全部のまわりをふさげたら、勝ちケロ！',
      s_trap: 'ここからは作戦！ 相手のアマゾンを1体<b>閉じこめる</b>と、そいつは最後まで動けない。<br>まわりの空きマスが1つ2つしかないアマゾンは、ねらい目だケロ。',
      s_escape: '反対に、自分のアマゾンのまわりがせまくなったら危険信号！ 相手の1手で閉じこめられちゃうかも。<br>そうなる前に、<b>まわりが広く空いた場所</b>（となりの空きマスが4つ以上）へ逃がそう。自分の矢で自分のとなりをふさがないようにね。',
      s_wall: '矢が並ぶと、盤はいくつかの<b>部屋</b>に分かれる。分かれたら、もうおたがいの部屋には入れないんだ。<br>最後は、自分の部屋で長く動けたほうの勝ち！ 壁のすき間は、白の部屋が広くなるようにふさぐケロ。',
      s_fill: '部屋が分かれたら、あとは何回動けるかの勝負！ ふつうは1マスで1手だけど、矢の置き方が悪いと<b>行けなくなるマス</b>ができちゃう。<br>元いたマスや行き止まりのすみに矢を刺して、端から埋めていくケロ。',
    },
    // the warm-ups: rp.<x>.<field> of amazons/lessons.json (t: the title, g: the goal, h: the hint, y: the praise)
    ramp: {
      'rp.q1.t': 'クイーンと同じ動き！', 'rp.q2.g': '金の印のマスへアマゾンを動かしてみて！ タップはアマゾン→行き先→矢の3回。矢はどこでもOKケロ。', 'rp.q2.h': '金の印は、アマゾンと同じ縦の線の上にあるね。まっすぐ進めば1手で着くはず！', 'rp.q2.y': 'そうそう！ 縦にまっすぐ5マス、1手でひとっ跳びケロ。',
      'rp.a1.t': '動いて、撃つ！', 'rp.a2.g': '金の印のマスに矢を刺してみて！', 'rp.a2.h': 'いまの場所からは、金の印へ一直線じゃないケロ。まず金の印と並ぶマスへ動こう！', 'rp.a2.y': 'ナイス！ 動いた先から矢を撃てたね。',
      'rp.a3.g': '今度は、動いたあとで元いたマスに矢を撃ち返してみよう！', 'rp.a3.h': 'どこへ動いても、来た線をまっすぐ戻れば元のマスに届くんだ。', 'rp.a3.y': 'いいね！ 空いたばかりのマスにも撃てるケロ。',
      'rp.k1.t': '飛び越えられない！', 'rp.k2.g': '金の印の矢に向かって、白のアマゾンを行けるいちばん遠くまで進めてみて！', 'rp.k2.h': '矢は飛び越えられないから、止まれるのはその手前のマスまでケロ。', 'rp.k2.y': '正解！ 矢の手前でぴたっと止まれたね。',
      'rp.w1.t': '動けなければ負け！', 'rp.w2.g': '黒が1手も指せないようにしてみよう！', 'rp.w2.h': '黒のアマゾンのとなりで、まだ空いているマスはどこ？ そこに矢を刺すか、白で入ればいいケロ。', 'rp.w2.y': '勝ち！ 黒のアマゾンはもうどこへも行けないね。',
      'rp.t1.t': '閉じこめちゃえ！', 'rp.t2.g': '赤い印の黒のアマゾンを閉じこめてみて！', 'rp.t2.h': 'その黒のとなりで空いているのは1マスだけ。そこが出口ケロ！', 'rp.t2.y': '閉じこめ成功！ 黒は残りの1体だけで戦うしかないね。',
      'rp.e1.t': '危ないアマゾン！', 'rp.e2.g': 'すみにいる白のアマゾン（赤い印）を、広い場所へ逃がしてあげて！', 'rp.e2.h': 'すみのマスは、となりがほとんどふさがってる。盤のまん中のほうへ大きく動こう！', 'rp.e2.y': '脱出成功ケロ！ 広い場所なら、かんたんには囲まれないね。',
      'rp.l1.t': 'すき間をふさごう！', 'rp.l2.g': '壁のすき間をふさいで、盤を2つに分けてみて！', 'rp.l2.h': '縦に並んだ矢の壁で、矢のないマスがすき間。白のアマゾンは広い側に残しておくケロ。', 'rp.l2.y': '盤が分かれた！ 白の部屋のほうがずっと広いね。',
      'rp.f1.t': 'むだなく埋めよう！', 'rp.f2.g': '白の部屋で、最後までいちばん多く動ける手を選んでみて！', 'rp.f2.h': '白の部屋は5マス。部屋を切らないように、元のマスか端のマスに矢を刺そう！', 'rp.f2.y': 'ばっちり！ これでこの部屋を最後まで使い切れるケロ。',
    },
    ask: {
      b_queen: ['光ってるマスへアマゾンを動かしてみよう！ 矢はどこに撃ってもいいケロ。', 'ゴールの光るマスまで、1手で行ける？', 'どのアマゾンなら、光ってるマスに届くかな？', '光ったマスまでひとっ跳び！ どう動く？', 'あのマスへ行く道、見つけられるかなケロ？'],
      b_arrow: ['光ってるマスに矢を刺してみよう！', '光るマスに矢を届かせるには、どこへ動けばいい？', '矢の的は光ってるマス！ どこから撃つ？', '動いてから撃つ、の順番だね。的に届く場所はどこケロ？', 'あのマスを矢で射抜いてみて！'],
      b_block: ['光ってるマスに矢を刺そう！ 通れる道は少ないケロ。', '矢やアマゾンがじゃまな盤だね。光るマスへ矢を通せる？', 'ふさがっていない線はどこかな？ 的を射抜いてみて！', '的に届く道はほんの少し。見つけられる？', '飛び越えずに矢を通す道、さがしてみてケロ！'],
      b_win: ['黒が次に1手も指せないようにしちゃおう！', '黒のアマゾン全部を止める1手、わかる？', 'あと1手で勝ちケロ！ 黒の出口をどうふさぐ？', '黒が動けなくなる手を見つけて！', '決め手の1手はどこかな？'],
      s_trap: ['光ってる黒のアマゾンを閉じこめちゃおう！', '光る黒の出口、ふさげるかな？', 'あの黒を、最後まで動けなくしてみて！', '黒を1体つかまえるチャンスだケロ！ どうする？', 'ねらいの黒のまわり、どこが空いてる？ 閉じこめてみよう！'],
      s_escape: ['赤く光ってる白のアマゾンを、広い場所へ逃がしてあげよう！', 'あぶない白のアマゾン、どこへ逃げる？', 'このままだと閉じこめられちゃう！ 安全な場所はどこケロ？', '赤い白を助けてあげて！', '囲まれる前に脱出だ！ 行き先はどこかな？'],
      s_wall: ['壁のすき間をふさいで、白の部屋をいちばん大きくしよう！', 'すき間をふさいで盤を分けるなら、どの手かな？', '白に広い部屋を残す手、わかる？', '壁を完成させるチャンスだケロ！ どうふさぐ？', '分けたあと、白のほうが広くなる手を選んでみて！'],
      s_fill: ['白の部屋で、最後までいちばん多く動ける手を選んでね！', 'この部屋、むだなく埋めるにはどう動く？', '手数をいちばん残せる手はどれかな？', '部屋を使い切る1手を見つけてケロ！', '行けないマスを作らない手、わかる？'],
    },
    hint: {
      b_queen: ['アマゾンから光ってるマスまで、縦・横・斜めのまっすぐな線でつながってるか見てみて。', '途中に何もなければ、遠くてもひとっ跳びケロ！', 'アマゾンごとに、8つの方向へ線を伸ばしてみよう。', '曲がるのはなし！ 1本の線で届くアマゾンはどれ？', '線の途中に矢がないかも、ちゃんと確かめてね。'],
      b_arrow: ['いまの場所からは届かないケロ。まず的と一直線に並ぶマスへ動こう！', '的のマスから8方向に線を伸ばして、アマゾンが行けるマスと重なるところをさがしてみて。', '矢は、動いた先から飛ぶんだ。どこに着けば的が見える？', '的と同じ縦・横・斜めの線に、アマゾンを乗せちゃおう！', '動く場所が決まれば、あとは的へまっすぐ撃つだけケロ。'],
      b_block: ['的のマスから縦・横・斜めに逆にたどって、ふさがっていない線をさがしてね。', '矢は飛び越えられないケロ！ じゃまものの手前までしか届かないよ。', '的が見えるマスのうち、アマゾンが行けるのはどこかな？', '近くの線ほどふさがりやすいんだ。遠くからの線も見てみて！', 'アマゾンの通り道も、ふさがってないか確かめてケロ。'],
      b_win: ['黒のアマゾンのすぐとなりの空きマスを数えてみて！', '残った空きマスに矢を刺すか、白のアマゾンで入ってふさげば勝ちケロ。', '出口が2つなら、白が入るのと矢とで、いっぺんにふさげるかも？', '白が動いたあとの元のマスが、黒の新しい出口にならない？', '黒の全部のアマゾンを見てね。1体でも動けたら勝ちじゃないケロ。'],
      s_trap: ['光る黒のとなりで、まだ空いてるマスはどこ？ そこが出口ケロ。', '出口が1つなら、矢を1本刺すだけでいいね！', '白のアマゾンで出口に入って、ふさぐ手もあるよ。', '動いた白の元のマスが、新しい出口にならないか気をつけて！', '出口が2つなら、アマゾンと矢で1つずつふさげないかな？'],
      s_escape: ['赤いアマゾンの行き先で、となりに空きマスが多いところを選んでね。', '逃げた先で、黒の1手でふさがれないかも確かめて！', '矢は自分から離れたところへ撃とう。自分のとなりをふさいだらもったいないケロ。', '盤のすみや矢のそばは、出口が少なくなりがちだよ。', 'となりの空きマスが4つ以上あると、ひとまず安心ケロ！'],
      s_wall: ['光ってるマスが壁のすき間だよ。そこをふさげば盤が分かれるね。', '白のアマゾンを2体とも広い側に残したまま、すき間をふさいでね！', 'ふさいだあと、白と黒の部屋のマスを数えてくらべてみて。', '矢でふさぐか、アマゾンで入るか。どっちが白の得かな？', '白が1体でもせまい側に残ると損しちゃうケロ。'],
      s_fill: ['部屋を2つに切っちゃう矢は損！ 元いたマスやすみっこに矢を刺してみて。', '行き止まりのマスから先に埋めると、むだが出にくいケロ。', '動いたあと、残りのマスを全部回れるか想像してみよう！', '真ん中に矢を刺すと、部屋がちぎれやすいんだ。', '最後のマスまで、1手ずつ順に行ける形を残してね。'],
    },
  };
  const AM_CH = {
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちりケロ！', 'やったね！', 'いい目してる！', 'すごいすごい！', 'そうそう、それ！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こうケロ！', 'その勢いで次へ！'],
    soft: ['大丈夫！', 'ドンマイケロ！', 'あと少しだったね！', '気にしない、気にしない！', 'あと一歩ケロ！', '平気、平気！', 'よくある見落としだね。', 'いっしょに見てみよう！'],
    tail: [null, null, 'これで覚えちゃおう！', null, '次はきっと見つけられるケロ！'],
    right: ['{m}なら、{a}！', '{m}が正解、{a}ケロ。', '{m}を選べば、{a}から！', '{m}にすると、{a}でしょ？', '答えは{m}で、{a}んだ。'],
    why: ['{a}！', 'つまり、{a}！', '{a}ケロ！', 'ほら、{a}でしょ？', 'これで{a}！'],
    you: ['{x}だと、{b}。', 'きみの{x}だと、{b}ね。', '{x}では{b}！', '{x}を指すと、{b}。', '{x}だと{b}んだ。'],
  };
  const amDir = (E, f, t) => { const [r1, c1] = E.RC[f], [r2, c2] = E.RC[t]; return c1 === c2 ? '縦' : r1 === r2 ? '横' : Math.abs(r1 - r2) === Math.abs(c1 - c2) ? '斜め' : ''; };
  const amDist = (E, f, t) => { const [r1, c1] = E.RC[f], [r2, c2] = E.RC[t]; return Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2)); };
  // the first square that blocks the line f → t (or -1 when it is clear; ex: a square that counts as empty, the amazon's old one)
  function amBlock(E, sq, f, t, ex) { const [r1, c1] = E.RC[f], [r2, c2] = E.RC[t], dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1); let r = r1 + dr, c = c1 + dc;
    while (r !== r2 || c !== c2) { const q = r * 10 + c; if (sq[q] && q !== ex) return q; r += dr; c += dc; } return -1; }
  // the rooms after a move: the squares (not arrows) linked by kings' steps; w / b the empty squares each side alone owns, sep: no room shared
  function amRooms(E, pos) { const sq = pos.sq, seen = new Int8Array(100).fill(-1), R = []; let w = 0, b = 0, sep = true, wSmall = false;
    for (let s0 = 0; s0 < 100; s0++) { if (sq[s0] === 3 || seen[s0] >= 0) continue; const L = [s0]; seen[s0] = R.length; for (let h = 0; h < L.length; h++) for (const t of E.NB[L[h]]) if (seen[t] < 0 && sq[t] !== 3) { seen[t] = R.length; L.push(t); }
      const nw = L.filter(q => sq[q] === 1).length, nb = L.filter(q => sq[q] === 2).length, ne = L.filter(q => !sq[q]).length; R.push({ nw, nb, ne });
      if (nw && nb) sep = false; else if (nw) w += ne; else if (nb) b += ne; }
    const big = Math.max(0, ...R.filter(r => r.nw && !r.nb).map(r => r.ne)); wSmall = R.some(r => r.nw && !r.nb && r.ne < big);
    return { sep, w, b, wSmall }; }
  function amLF(E, pos, m, P, id) {   // what the move m gives: its line, the opponent's exits, the marked amazon's exits, the rooms
    const f = E.mFrom(m), t = E.mTo(m), a = E.mArrow(m), q = pos.clone().play(m), T = (P.mk || [])[0];
    const F = { m, f, t, a, q, dir: amDir(E, f, t), n: amDist(E, f, t), adir: amDir(E, t, a), an: amDist(E, t, a) };
    F.oCan = q.canMove(2); F.oEx = E.emptyAround(q, 2).length; F.ex0 = E.emptyAround(pos, 2);
    F.opened = E.NB[f].some(x => pos.sq[x] === 2) && q.sq[f] === 0;   // (the square just left now next to a black amazon, still empty)
    if (id === 's_trap' || id === 's_escape') { let kk = -1; for (let k = 0; k < 8; k++) if (pos.q[k] === T) kk = k; F.kk = kk;
      const qk = kk >= 0 ? q.q[kk] : -1; F.free = kk >= 0 ? E.freeAt(q, kk) : 0; F.free0 = kk >= 0 ? E.freeAt(pos, kk) : 0; F.moved = f === T; F.selfNext = qk >= 0 && E.NB[qk].includes(a);
      if (id === 's_escape' && kk >= 0) { let trap = false; for (const r of q.moves()) { q.play(r); const bx = E.boxed(q, kk); q.unplay(r); if (bx) { trap = true; break; } } F.trap = trap; } }
    if (id === 's_wall') Object.assign(F, amRooms(E, q));
    if (id === 's_fill') { F.left = E.fillMax(q, t); const R = E.roomOf(pos, f); F.room = R ? R.length - 1 : 0; const R2 = E.roomOf(q, t); F.cut = R ? Math.max(0, F.room - 1 - (R2 ? R2.length - 1 : 0)) : 0; }
    return F;
  }
  // (2026-11-24 第2期・追7) the strategy steps' hints are chosen by the board, not by the problem's number: each hint has the fact it
  // takes for granted; when the fact does not hold on this board, its always-true line is said instead
  function amHint(E, id, pos, P, ok, k) {
    const T = (P.mk || [])[0], NB = E.NB, all = pos.moves(), okS = new Set(ok), wr = all.filter(m => !okS.has(m));
    let kk = -1; for (let x = 0; x < 8; x++) if (pos.q[x] === T) kk = x;
    const W = []; for (let x = 0; x < 8; x++) if (pos.q[x] >= 0 && pos.sq[pos.q[x]] === 1) W.push(pos.q[x]);
    const after = m => pos.clone().play(m);
    let L = null;
    if (id === 's_trap') { const n0 = kk >= 0 ? E.freeAt(pos, kk) : 0;
      L = [['光る黒のとなりで、まだ空いてるマスはどこ？ そこが出口ケロ。', true],
        ['出口が1つなら、矢を1本刺すだけでいいね！', n0 === 1 && ok.some(m => !NB[T].includes(E.mTo(m))), 'その黒のとなりの空きマスに、白の矢が届く線はあるかな？'],
        ['白のアマゾンで出口に入って、ふさぐ手もあるよ。', ok.some(m => NB[T].includes(E.mTo(m))), '白のアマゾンから出口まで、まっすぐの線をさがしてみて！'],
        ['動いた白の元のマスが、新しい出口にならないか気をつけて！', wr.some(m => NB[T].includes(E.mFrom(m)) && pos.sq[E.mFrom(m)] === 1 && !after(m).sq[E.mFrom(m)]), '閉じこめたあと、その黒のとなりに空きが残っていないか数えてね。'],
        ['出口が2つなら、アマゾンと矢で1つずつふさげないかな？', n0 === 2, '出口が1つなら、そこに届く矢を1本見つければいいケロ。']]; }
    if (id === 's_escape') { const trapped = m => { const q = after(m); if (kk < 0) return false; for (const r of q.moves()) { q.play(r); const b = E.boxed(q, kk); q.unplay(r); if (b) return true; } return false; };
      const mv = wr.filter(m => E.mFrom(m) === T);
      L = [['赤いアマゾンの行き先で、となりに空きマスが多いところを選んでね。', true],
        ['逃げた先で、黒の1手でふさがれないかも確かめて！', mv.some(m => E.freeAt(after(m), kk) >= 4 && trapped(m)), '黒のアマゾンのすぐ近くは、ふさがれやすいから気をつけてね。'],
        ['矢は自分から離れたところへ撃とう。自分のとなりをふさいだらもったいないケロ。', mv.some(m => NB[E.mTo(m)].includes(E.mArrow(m))), '行き先を決めたら、矢はそのまわりの空きを減らさない場所へ撃とう。'],
        ['盤のすみや矢のそばは、出口が少なくなりがちだよ。', true],
        ['となりの空きマスが4つ以上あると、ひとまず安心ケロ！', true]]; }
    if (id === 's_wall') {
      L = [['光ってるマスが壁のすき間だよ。そこをふさげば盤が分かれるね。', ok.every(m => E.mArrow(m) === T), '壁のすき間は1つだけ。そこがふさがれば部屋が分かれるケロ。'],
        [`白のアマゾンを${W.length === 2 ? '2体とも' : '全部'}広い側に残したまま、すき間をふさいでね！`, true],
        ['ふさいだあと、白と黒の部屋のマスを数えてくらべてみて。', true],
        ['アマゾンですき間に入るだけじゃ、どいたらまた開いちゃう。矢でふさぐケロ！', all.some(m => E.mTo(m) === T), 'すき間に矢が届く白のアマゾンはどれ？ 線をたどってみて。'],
        ['すき間を通ってむこう側へ渡る手は、白が黒の部屋に入っちゃうよ。', wr.some(m => E.mArrow(m) === T), '白のアマゾンが全部、広い側にいるまま分けられる手をさがそう。']]; }
    if (id === 's_fill') { const f = W[0], room = f != null ? E.roomOf(pos, f) : null, n = room ? room.length - 1 : 0;
      const cut = m => { const R2 = E.roomOf(after(m), E.mTo(m)); return n - 1 - (R2 ? R2.length - 1 : 0) > 0; };
      L = [['部屋を2つに切っちゃう矢は損！ 元いたマスやすみっこに矢を刺してみて。', wr.some(cut) && ok.some(m => E.mArrow(m) === E.mFrom(m)), '矢を刺したあと、部屋のマスが全部つながっているか見てみよう！'],
        ['行き止まりのマスから先に埋めると、むだが出にくいケロ。', true],
        ['動いたあと、残りのマスを全部回れるか想像してみよう！', true],
        ['真ん中に矢を刺すと、部屋がちぎれやすいんだ。', wr.some(cut), '動いたあと、行けないマスが残らないか数えてみてね。'],
        ['最後のマスまで、1手ずつ順に行ける形を残してね。', true]]; }
    if (!L) return null;
    const x = L[k % L.length]; return x[1] ? x[0] : x[2] || null;   // (a hint whose fact does not hold gives way to its own always-true line: no line twice in a lesson)
  }
  function amLsJa(E, s, P, i) {
    const id = s.id, pos = E.Pos.from(P.s), ok = P.ok || [P.best], A = P.best != null ? P.best : ok[0], k = i % 5, T = (P.mk || [])[0];
    const si = Math.max(0, ((AMAZONS.data && AMAZONS.data.ls.steps) || []).indexOf(s)), o8 = si % 8 + i * [1, 3, 5, 7][(si >> 3) % 4];   // (the praise / soft openers in a different order in each lesson)
    const pk = (L, j) => L[((j % L.length) + L.length) % L.length], M = AMM('ok', 'ja'), X = AMM('ng', 'ja');
    const FA = amLF(E, pos, A, P, id);
    const all = pos.moves();
    // a typical miss when none is given (or a right one): by the step, the near miss the lesson warns about
    const wrongOf = u => { if (u != null && !ok.includes(u) && all.includes(u)) return u;
      const W = all.filter(m => !ok.includes(m)), pref = {
        b_queen: m => E.mFrom(m) === FA.f && amDir(E, FA.f, E.mTo(m)) === FA.dir,
        b_arrow: m => E.mFrom(m) === FA.f, b_block: m => E.mFrom(m) === FA.f && E.mTo(m) !== FA.t,
        b_win: m => FA.ex0.includes(E.mArrow(m)), s_trap: m => E.NB[T].includes(E.mArrow(m)),
        s_escape: m => E.mFrom(m) === T, s_wall: m => E.mArrow(m) !== T, s_fill: m => E.mFrom(m) === FA.f }[id];
      const L = pref ? W.filter(pref) : []; const C = L.length ? L : W; return C.length ? C[(k * 7 + 3) % C.length] : null; };
    const D = F => F.dir || 'まっすぐ';
    // why the right move works (a: a short plain clause, the variant j)
    const why = (F, j) => {
      switch (id) {
        case 'b_queen': return pk([`${D(F)}に${F.n}マス、まっすぐ一気に進める`, `${D(F)}の線の上だから、遠くても1手で届く`, `途中に何もないから、${F.n}マス先までひとっ跳びできる`, `アマゾンとゴールが${D(F)}に並んでいる`, `${D(F)}へ${F.n}マス、曲がらずに行ける`], j);
        case 'b_arrow': return pk([`動いた先から${F.adir}に一直線で、矢がちゃんと届く`, `着いたマスと的が${F.adir}に並ぶ`, `${F.adir}の線にじゃまものがなくて、矢がまっすぐ飛ぶ`, `先に的の見えるマスへ動いてから撃てる`, `${F.an}マス先の的まで、${F.adir}に矢が通る`], j);
        case 'b_block': return pk([`ふさがっていない${F.adir}の線を見つけて、矢を通せる`, `着いたマスから${F.adir}に、的までさえぎるものがない`, `じゃまな矢をよけて、${F.adir}から的をねらえる`, `数少ない通り道に、うまく入りこめる`, `${F.adir}の線だけは、的まで空いている`], j);
        case 'b_win': { const n0 = F.ex0.length, byT = F.ex0.includes(F.t), byA = F.ex0.includes(F.a), back = F.a === F.f;
          if (back && byT) return pk(['アマゾンで出口に入って、空いた元のマスにも矢を撃ち返せる', '出口に入ったあと元のマスを矢でふさぐから、すき間が残らない', '出口へ動いて、来た道に矢でふたができる', '白が出口をふさぎ、元のマスも矢でうまる', '動いたあとのすき間まで、矢でしっかりふさげる'], j);
          if (byT && byA) return pk(['アマゾンで1つ、矢で1つ、出口を同時にふさげる', '2つの出口を、動きと矢で1手のうちにふさぎきれる', '出口2つをまとめてふさいで、黒の行き場がなくなる', '白が片方の出口に入り、もう片方は矢でうまる', '動きでふたを1つ、矢でもう1つ。これで黒は1歩も動けない'], j);
          if (byT) return pk(['白のアマゾンが最後の出口に入って、ふたをする', '出口に白がどっかり座って、黒の行き場がなくなる', '白のアマゾン自身が、黒の出口のふたになる', '最後のすき間に白が入って、黒は手づまりになる', '白で出口をふさいで、黒はもう指せない'], j);   // (2026-11-24 第2期: the amazon closes the exit, its arrow elsewhere)
          if (n0 === 1) return pk(['最後の出口に矢が刺さって、黒の行き場がなくなる', 'たった1つの出口がふさがる', '残った1マスに矢が刺さって、黒は手づまりになる', '最後のすき間がうまって、黒はもう指せない', '矢1本で、黒の最後の逃げ道が消える'], j);
          return pk(['黒のまわりの空きマスが、全部ふさがる', '黒の行き場が、1マスも残らない', '黒の出口が全部なくなる'], j); }
        case 's_trap': { const byT = E.NB[T].includes(F.t), byA = E.NB[T].includes(F.a);
          if (byT && F.a === F.f) return pk(['白が出口に入って、元のマスにも矢を撃ち返すから、すき間が残らない', '出口に入って、空いたマスも矢でふさげる', '出口に白が入り、どいたマスも矢でうまる', 'ふたをした白の元のマスまで、矢でしっかりふさげる', '白で出口をふさいで、来た道にも矢を刺せる'], j);
          if (byT && byA && F.free0 >= 2) return pk(['アマゾンで1つ、矢で1つ、その黒の出口をまとめてふさげる', '出口を2つ同時にふさいで、その黒の逃げ場がなくなる', '白が出口に入り、残りの出口には矢が刺さる', '2つの出口に、白と矢でいっぺんにふたができる', '動きと矢の両方で、その黒をぐるりと囲める'], j);
          if (byT && F.a === F.f) return pk(['白が出口に入って、元のマスにも矢を撃ち返すから、すき間が残らない', '出口に入って、空いたマスも矢でふさげる', '出口に白が入り、どいたマスも矢でうまる', 'ふたをした白の元のマスまで、矢でしっかりふさげる', '白で出口をふさいで、来た道にも矢を刺せる'], j);
          if (byT) return pk(['白のアマゾンが出口に入って、ふたをする', '出口に白が入って、その黒はもう動けない', '白が出口にどっかり座って、黒を通さない', '白のアマゾン自身が、出口のふたになる', '出口を白でふさいで、その黒をつかまえられる'], j);
          return pk(['最後の出口に矢が刺さって、その黒は最後まで動けない', '出口がふさがって、黒は残りのアマゾンだけで戦うことになる', '矢1本で、その黒を閉じこめられる', '出口に矢でふたをして、黒を1体つかまえられる', '逃げ道がなくなって、その黒は置き物になる'], j); }
        case 's_escape': return pk([`まわりに空きマスが${F.free}つある広い場所へ移れる`, `となりが${F.free}マスも空いていて、黒の1手ではふさぎきれない`, `広い場所へ出て、閉じこめられる心配がなくなる`, `黒の次の1手では囲めない場所へ逃げられる`, F.selfNext ? `矢をとなりに刺しても、まだ${F.free}マス空いていて広いまま` : '矢も遠くへ撃って、自分のまわりを広いまま保てる'], j);
        case 's_wall': if (!F.sep) return pk(['すき間がふさがって、黒が入ってきにくくなる', '壁がほぼできて、白の陣地が守れる'], j); return pk([`白の部屋が${F.w}マス、黒の部屋が${F.b}マスに分かれる`, `${F.w}対${F.b}で、白の部屋のほうが広くなる`, 'すき間がふさがって、黒はもうこっちに入ってこられない', `壁が完成して、白は${F.w}マスの部屋を使える`, `盤が分かれて、黒の部屋は${F.b}マスだけになる`], j);
        case 's_fill': return pk([`この部屋で、まだ${F.left}手も指せる`, `マスをむだなく使えて、${F.left}手ぶん動ける`, '部屋が切れずに、端から順に埋めていける', `行けなくなるマスを作らずに、${F.left}手を残せる`, '矢で部屋を切らずに、残りのマスを順にたどれる'], j);
      }
      return '';
    };
    // what the miss gives up
    const loss = (F, j) => {
      switch (id) {
        case 'b_queen': { if (F.t === T) return 'それでも着いているけど、ほかの手と同じくらいいい'; const fa = amDir(E, F.f, T), bl = fa ? amBlock(E, pos.sq, F.f, T, -1) : -1;
          if (!fa) return pk(['そのアマゾンからは、ゴールが一直線に並んでいない', '曲がらないと届かない場所で、1手では着かない', 'そのアマゾンとゴールは、縦・横・斜めのどれにも並ばない'], j);
          if (bl >= 0) return pk(['線の途中にじゃまものがあって、ゴールまで進めない', '途中のマスがふさがっていて、飛び越えられない'], j);
          const on = (x, y, z) => amBlock(E, Array(100).fill(0).map((v, q) => q === y ? 1 : 0), x, z, -1) === y;   // (y strictly between x and z on their line; 2026-11-24 第2期: the same axis the other way is not "short")
          if (fa === F.dir && on(F.f, F.t, T)) return pk(['ゴールの手前で止まっちゃってる', 'あと少し足りなくて、ゴールに着かない', '向きは合ってるけど、進む距離が短い'], j);
          if (fa === F.dir && on(F.f, T, F.t)) return pk(['ゴールを通りすぎちゃってる', '行きすぎて、ゴールのマスに止まっていない'], j);
          if (fa === F.dir) return pk(['ゴールと反対の向きに進んじゃってる', '逆向きに動いて、ゴールから遠ざかっちゃう'], j);
          return pk([`向きがちがって、ゴールから離れちゃう`, `${F.dir}に動いても、ゴールは${fa}の方向にある`], j); }
        case 'b_arrow': case 'b_block': { const fa = amDir(E, F.t, T), bl = fa ? amBlock(E, F.q.sq, F.t, T, F.a) : -1;   // (the line without your own arrow: an arrow shot short is not a blocker)
          if (F.a === T) return 'それでも的に届いている';
          if (fa && bl < 0 && amBlock(E, F.q.sq, F.t, T, -1) === F.a) return pk(['的に向けて撃ったけど、手前のマスに刺さっちゃう', '矢を的の手前で止めちゃってる', '向きは合ってるのに、矢が的まで飛んでいない'], j);
          if (!fa) return pk(['着いたマスと的が一直線に並ばなくて、矢が届かない', '動いた先からは、的が縦・横・斜めのどれにも見えない', '着いた場所がずれていて、的をねらえない'], j);
          if (bl >= 0) return pk([`${fa}の線の途中にじゃまものがあって、矢が通らない`, `的は${fa}に見えてるけど、途中でふさがれてる`, 'じゃまものにぶつかって、矢がその手前で止まっちゃう'], j);
          return pk(['的は見えているのに、矢を別のマスに撃っちゃってる', '撃つ向きがずれて、的をはずしちゃう'], j); }
        case 'b_win': { if (!F.oCan) return 'それでも黒は動けない'; const n = F.oEx;
          if (F.opened) return pk(['動いた白の元のマスが、黒の新しい出口になっちゃう', '白が動いたあとの空きマスから、黒が逃げられる'], j);
          return pk([`黒のまわりに、まだ出口が${n}つ残る`, `空きマスが${n}つ残って、黒はまだ動ける`, `黒の出口を${n}つふさぎ残してる`], j); }
        case 's_trap': { if (!F.free) return 'それでもその黒は閉じこめられる';
          if (F.opened && E.NB[T].includes(F.f)) return pk(['動いた白の元のマスが、その黒の新しい出口になっちゃう', '白がどいたマスから、黒がするっと逃げられる'], j);
          return pk([`その黒にまだ出口が${F.free}つ残って、逃げられちゃう`, `出口が${F.free}つ空いたままで、閉じこめられない`, `その黒は、残った${F.free}つの出口から外へ出られる`], j); }
        case 's_escape': {
          if (!F.moved) return F.trap ? pk(['赤いアマゾンがそのままで、黒の次の1手で閉じこめられちゃう', 'あぶないアマゾンを放っておくことになって、黒にふたをされちゃう', 'ほかのアマゾンを動かしても、赤いアマゾンは黒の1手でつかまっちゃう'], j)
            : pk(['あぶないアマゾンをそのまま放っておくことになる', '赤いアマゾンが動かないまま、出口も少ないまま', 'ほかのアマゾンを動かしただけで、赤いアマゾンのまわりはせまいまま'], j);
          if (F.selfNext && F.trap) return pk(['自分の矢で自分のとなりをふさいで、黒の1手で閉じこめられちゃう', '矢を近くに撃って出口が減り、黒にふたをされちゃう', 'すぐそばに矢を刺したせいで、黒の1手でつかまっちゃう'], j);
          if (F.trap) return pk([`逃げた先も出口が${F.free}つしかなくて、黒の1手で閉じこめられちゃう`, `行き先がせまくて、黒にすぐふたをされちゃう`, '逃げた場所でも、黒の次の手で囲まれちゃう'], j);
          if (F.selfNext) return pk(['自分の矢で自分のとなりをふさいじゃってる', '矢を近くに撃って、自分の出口を減らしてる', 'すぐそばに矢を刺して、逃げ道をせばめてる', '矢が自分の足もとをふさいで、もったいない', '自分のまわりに矢を置いて、せっかくの広さを減らしてる'], j);
          return pk([`まわりの空きが${F.free}つだけで、まだ安心できない`, `となりの空きが${F.free}つで、4つに届かない`], j); }
        case 's_wall': { if (!F.sep && F.q.sq[T] === 3) return pk(['すき間はふさいだけど、白のアマゾンが黒の側へ渡っちゃって、部屋が分かれない', '壁はできても、白が1体むこう側に入って、黒と同じ部屋になっちゃう'], j);
          if (!F.sep && F.q.sq[T] === 1) return pk(['白がすき間に立っても、矢の壁じゃないから、どけばまた開いちゃう', 'アマゾンですき間に入っただけで、壁は完成しない'], j);
          if (!F.sep) return pk(['すき間が開いたままで、黒に入ってこられちゃう', '盤が分かれずに、黒と広い場所を取り合うことになる', '壁が完成しなくて、黒が白の陣地へもぐりこめる'], j);
          if (F.wSmall) return pk(['白のアマゾンが1体、せまい側に取り残される', '白が1体せまい部屋に入って、うまく働けない'], j);
          return pk([`白の部屋が${F.w}マスで、黒の${F.b}マスより得が少ない`, `分かれても、白の部屋が${F.w}マスしかない`], j); }
        case 's_fill': { const d = FA.left - F.left;
          if (F.cut > 0) return d > 0 ? pk([`部屋がちぎれて${F.cut}マスに行けなくなり、${d}手も損しちゃう`, `矢で部屋を切って${F.cut}マスが使えなくなり、手数が${d}手へっちゃう`], j) : pk([`部屋がちぎれて、行けなくなるマスが${F.cut}つできちゃう`, `矢で部屋を切って、${F.cut}マスが使えなくなる`], j);
          return pk([`最後まで動ける手数が${d}手少なくなる`, `むだなマスが出て、${d}手ぶん損しちゃう`, `${F.left}手しか指せなくて、${d}手足りない`], j); }
      }
      return '';
    };
    const fill2 = (t, a) => t.replace('{m}', M).replace('{x}', X).replace('{a}', a).replace('{b}', a);
    const good = u => { const F = u != null && ok.includes(u) && u !== A ? amLF(E, pos, u, P, id) : FA;
      return [pk(AM_CH.good, o8), fill2(AM_CH.why[k], why(F, k)), AM_CH.push[k]].filter(Boolean).join(' '); };
    const ng = u0 => { const u = wrongOf(u0); let F = null; try { if (u != null) F = amLF(E, pos, u, P, id); } catch (e) {}
      const out = [pk(AM_CH.soft, o8), fill2(AM_CH.right[(k + 2) % 5], why(FA, k + 2))]; if (F) out.push(fill2(AM_CH.you[(k + 3) % 5], loss(F, k + 2)));
      if (AM_CH.tail[k]) out.push(AM_CH.tail[k]); return out.filter(Boolean).join(' '); };
    return { ask: pk(AMJ_LS.ask[id] || [''], k), hintTx: amHint(E, id, pos, P, ok, k) || pk(AMJ_LS.hint[id] || [''], k), good, ng, own: true, ckls: true };   // (ckls: ケロ praises himself — no heading line)
  }
  const AMAZONS = {
    LKEY: 'aicoding-amazons-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const tx = ['../checkers/i18n.js?v=20261107l14-nd1', '../amazons/i18n-am.js?v=4', '../amazons/i18n-am-more.js?v=4', '../amazons/i18n-am-ls.js?v=3', '../amazons/i18n-am-ls-more.js?v=3', '../amazons/i18n-am-ls-more2.js?v=3'];
      return (this.p = Promise.all([getJ('../amazons/lessons.json?v=5'), Promise.all(tx.map(u => fetch(u).then(r => r.text()).catch(() => ''))), amEng().catch(() => null)])
        .then(([ls, T]) => { const w = {}; try { new Function('window', T[0] + '\nvar I18N = window.I18N = window.I18N || {};\n' + T.slice(1).join('\n'))(w); } catch (e) { console.warn('[lessons3d] amazons texts', e); } this.I = w.I18N || {}; this.data = { ls }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: sp => window.AtlasMini && AtlasMini.amazons ? AtlasMini.amazons(sp) : '',
    list(kind, lang) {
      const D = this.data, pr = J(this.LKEY, {});
      return D.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), E = window.AmazonsEngine;
      const intro = String(T('intro') || '').replace(/<p>[^<]*?[a-j](?:10|[1-9])-[a-j](?:10|[1-9])[^]*?<\/p>/g, '');   // (the notation paragraph: no coordinates on the 3D board)
      const mkc = AM_MK[s.id] || 'ok';
      const ja = lang === 'ja' && E && AMJ_LS.intro[s.id];   // (2026-11-22 lesson loop: ケロ's own intro, warm-up lines, questions, hints, why / what the miss gives up — amLsJa)
      const RX = it => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { if (typeof o[f] !== 'string') return; const v = ja && AMJ_LS.ramp[o[f]]; o[f] = v ? { ja: v, __voice: true } : this.tx(o[f], lang); }); o.gm = AM_GM[s.id + '/' + s.ramp.indexOf(it)] || null; return o; };
      return { id: s.id, title: T('title'), intro: ja ? AMJ_LS.intro[s.id] : intro, ramp: s.ramp && s.ramp.length ? s.ramp.map(RX) : null, RU: (k, v) => this.tx('ru.' + k, lang, v || {}),   // (the warm-up: texts without coordinates from atlas/nocoord/amazons.json)
        probs: (s.problems || []).map((P, i) => { const good = P.ok || [P.best];
          const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.best != null ? P.best : good[0], marks: (P.mk || []).map(q => [q, mkc]), hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: AMM('ok', lang), x: AMM('ng', lang) }), ng: () => T('ng', { m: AMM('ok', lang), x: AMM('ng', lang) }) };
          if (ja) try { Object.assign(o, amLsJa(E, s, P, i)); } catch (e) { console.warn('[lessons3d] amazons lesson', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, m) { return (P.ok || [P.best]).includes(m) ? 20 : 0; },   // (= amazons/app.js lessonAnswer)
    spOk: lang => AMM('ok', lang),
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), it = s && s.ramp && s.ramp[0]; if (it) return { pos: { spec: it.s, me: it.s.side === 2 ? 2 : 1, lock: true } }; const P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1, lock: true } } : null; },
    // the warm-up (= amazons/app.js loadRamp / rampMarks; its marks and looks count squares from 1): the example move played out, the marks,
    // on a try the square or piece the goal names (AM_GM: the full game's texts name it by its coordinate)
    rampPos: it => ({ spec: it.s, me: it.s.side === 2 ? 2 : 1 }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => it.k === 'explain' ? (it.marks || []).map(([q, c]) => [q - 1, c === 'ng' ? 'ng' : c === 'ok' ? 'ok' : 'hl']) : (it.gm || []).map(([q, c]) => [window.AmazonsEngine.sqIdx(q), c]),
    rampLook: it => (it.look || []).map(q => [q - 1, 'ring']),
    rampOk: (it, u) => { const E = window.AmazonsEngine; return !!E && (it.ok || []).includes(E.name(E.Pos.from(it.s), u)); },
    rampAns: it => ({ m: amByName(it.s, (it.ok || [])[0]) }),
    rampAnsMk(it) { const m = amByName(it.s, (it.ok || [])[0]); return this.rampMarks(it).concat(m != null ? [{ m, cls: 'ok' }] : []); },
    rampSeq(it) { const E = window.AmazonsEngine; if (!E) return []; let p = E.Pos.from(it.s); const out = []; for (const nm of it.seq || []) { const m = p.moves().find(x => E.name(p, x) === nm); if (m === undefined) break; out.push(m); p = p.clone().play(m); } return out; },
  };
  /* connect four (2026-11-15): connect4/lessons.json (23 steps of 3–4 one-move problems: any column in P.answer is right, = connect4/index.html
     lessonAnswer). Progress = the full game's ('aicoding-connect4-v2-lessons' { id: { best: right answers, clear: all but one right } }).
     Texts: connect4/i18n.js + learn.js (a sandbox). Columns are named by their marks (no letters on the 3D tower); the warm-ups play here
     too, with texts without coordinates (atlas/nocoord/connect4.json, 2026-11-16). A position: { moves, me }. */
  const C4M = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の列' : k === 'hl' ? '金の印の列' : '赤い印の列') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
  const c4Grid = mv => { const g = Array.from({ length: 7 }, () => []); for (let i = 0; i < mv.length; i++) g[mv.charCodeAt(i) - 49].push(i & 1 ? 2 : 1); return g; };
  function c4Line(g, c, r, p) { const at = (x, y) => (x >= 0 && x < 7 && y >= 0 && y < g[x].length) ? g[x][y] : 0; for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let n = 1; for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (at(x, y) === p) { n++; x += dc * s; y += dr * s; } } if (n >= 4) return true; } return false; }
  function c4Thr(g, p) { const out = []; for (let c = 0; c < 7; c++) { const col = g[c]; for (let r = col.length; r < 6; r++) { const tmp = col.slice(); while (tmp.length < r) tmp.push(-1); tmp[r] = p; g[c] = tmp; if (c4Line(g, c, r, p)) out.push([c, r]); } g[c] = col; } return out; }
  const CONNECT4 = {
    LKEY: 'aicoding-connect4-v2-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../connect4/lessons.json?v=30261124o1'), Promise.all(['../connect4/i18n.js?v=20261107l14', '../connect4/learn.js?v=20261123l15'].map(u => fetch(u).then(r => r.text()).catch(() => '')))])
        .then(([ls, T]) => { const w = {}; try { new Function('window', T.join('\n'))(w); } catch (e) { console.warn('[lessons3d] connect4 texts', e); } this.I = w.I18N || {}; this.data = { ls }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: mv => window.AtlasMini && AtlasMini.connect4 ? AtlasMini.connect4(mv) : '',
    list(kind, lang) {
      const pr = J(this.LKEY, {});
      return this.data.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('lx.course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].moves) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), name = c => (window.Atlas3D && Atlas3D.connect4 && Atlas3D.connect4.names ? Atlas3D.connect4.names(lang) : ['Gold', 'Silver'])[c - 1];
      const RU = (k, v) => k === 'ans' ? fill(L(C4_ANS, lang), v || {}) : fill(L((this.data.ls.rampUi || {})[k], lang), v || {}).replace(/%P([12])%/g, (_, n) => name(+n));
      return { id: s.id, title: T('title'), intro: lang === 'ja' && C4J_LS.intro[s.id] || T('intro'), ramp: s.ramp && s.ramp.length ? s.ramp.slice() : null, RU,   // (the warm-up: texts without coordinates from atlas/nocoord/connect4.json)
        probs: (s.problems || []).map((P, i) => { const me = P.moves.length & 1 ? 2 : 1, g = c4Grid(P.moves), hm = s.hintMarks;
          const thr = hm ? [...(hm === 'me' || hm === 'both' ? c4Thr(c4Grid(P.moves), me).map(([c, r]) => ({ c, r, cls: 'ok' })) : []), ...(hm === 'op' || hm === 'both' ? c4Thr(c4Grid(P.moves), 3 - me).map(([c, r]) => ({ c, r, cls: 'ng' })) : [])] : [];
          const why = () => T('why' + (P.why || ''), { m: C4M('ok', lang), x: C4M('ng', lang), c: name(me), a: P.alt !== undefined ? C4M('hl', lang) : '' }).replace(/列\u0002[ \u00a0]*列/g, '列\u0002');   // (ja: 「緑の印の列 列」 → one 列, 2026-11-21)
          const o = { pos: { moves: P.moves, me }, kind: 'best', P, ask: T('goal'), ans: P.answer[0], hintTx: T('hint'), hintMk: thr, good: why, ng: why };
          if (lang === 'ja') try { Object.assign(o, c4LsJa(s, P, i, me, name, +key) || {}); } catch (e) { console.warn('[lessons3d] connect4 lesson', e); }   // (2026-11-21 lesson loop: ポトンウサ's question, hint, why / what yours misses)
          return o; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, n = Math.round(pts / PTS), cnt = Math.round(max / PTS), pass = n >= cnt - 1; pr[s.id] = { best: Math.max(o.best || 0, n), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, c) { return P.answer.includes(c) ? 20 : 0; },   // (= connect4/index.html lessonAnswer)
    spOk: lang => C4M('ok', lang),
    introPos(cc) { const s = this.data.ls.steps.find(x => x.id === cc.id), it = s && s.ramp && s.ramp[0], mv = it ? it.moves : s && s.problems && s.problems[0] && s.problems[0].moves; return mv != null ? { pos: { moves: mv, me: mv.length & 1 ? 2 : 1, lock: true } } : null; },
    // the warm-up (= connect4/index.html loadRamp / rampMarks): marks are cells [c, r, cls] (a dotted threat → gold), a try's right
    // columns are it.ok; the disc names %P1% / %P2% are the 3D set's
    rampTx: (x, lang) => String(x || '').replace(/%P([12])%/g, (_, n) => (window.Atlas3D && Atlas3D.connect4 && Atlas3D.connect4.names ? Atlas3D.connect4.names(lang) : ['Gold', 'Silver'])[n - 1]),
    rampPos: it => ({ moves: it.moves, me: it.moves.length & 1 ? 2 : 1 }), rampBody(it, lang) { return this.rampTx(L(it.body, lang), lang); },
    rampMarks: it => it.k === 'explain' ? (it.marks || []).map(([c, r, cls]) => ({ c, r, cls: cls === 'ok' ? 'ok' : cls === 'ng' ? 'ng' : 'hl' })) : [],
    rampLook: it => (it.look || []).map(([c, r]) => ({ c, r, cls: 'hl' })),
    rampOk: (it, u) => (it.ok || []).includes(u), rampAns: it => (it.ok || [])[0],
    rampAnsMk(it) { const g = c4Grid(it.moves); return (it.ok || []).map(c => ({ c, r: g[c].length, cls: 'ok' })); },
    rampSeq: it => [...String(it.seq || '')].map(ch => +ch - 1),
  };
  const C4_ANS = { ja: '答え：{m}', en: 'Answer: {m}', zh: '答案：{m}', 'zh-TW': '答案：{m}', ko: '정답: {m}', es: 'Respuesta: {m}', fr: 'Réponse : {m}', pt: 'Resposta: {m}', de: 'Lösung: {m}', hi: 'उत्तर: {m}', ar: 'الجواب: {m}', ru: 'Ответ: {m}', id: 'Jawaban: {m}', tr: 'Cevap: {m}' };
  /* (2026-11-21 lesson loop) the connect four lessons in ポトンウサ's words, Japanese, for the 3D tower (no column letters): his own
     intros, five questions a lesson, two hints, and after the answer why the column works / what yours misses, read from the board
     (c4F: a four now, the opponent's four next, a cell under the opponent's winning cell, new winning cells and their row, two at once /
     stacked) and the solver's result of every column (C4SOL, connect4/engine.js with the book and tree: A the lesson's answer, W a win,
     w a slower win, D a draw, L a loss, - a full column). */
  const C4SOL = {"four":["DLAwwww","wwwwAww","LDALLLL","wDwAwww"],"block":["LLLLLAL","LLLALLL","LLALLLL"],"centre":["LLDADLL","LLLALLL","LLLALDL"],"early":["LLLALLL","LLALLLL","LLLLALL","LLLALLL"],"threat":["LALLLLL","ALLLLLL","DAL-LLL"],"open":["LDAwwwD","LLwADLL","LALLLLL","LwALLLL"],"diag":["LLLALLL","LLLLLAL","LLLADwD","LLLLLAL"],"double":["A-L---L","-L-L--A","L-L-AL-"],"stack":["LALLwwL","wwwLwAw","wAwwLww","LwDLLLA"],"force":["wAwwwwD","wwAwwww","LLwwALL","LLAwwLL"],"parity":["D-D-DAD","AD-L-DD","DDADDDD"],"zugz":["-D--L-A","LA----L","DA----D","AL---LL"],"follow":["LLLLALL","LLALLLL","wLLALLL","LLLALLL"],"first":["LALLLLL","LLLALLL","LLLLALL","DLALLLL"],"second":["LADLLwL","LLALLLL","LLLADDL","LDALDDL"],"op1":["LLLALLL","LLLALLL","LLDALLL","LLLALLL"],"op2":["LDLDLAL","LLDDADL","DLLDDLA"],"op3":["LDL-LAL","LLL-ALL","LLA-LDL"],"count":["A-L---L","L---LA-","DDA---D","L----LA"],"endwin":["DA--DD-","L-AD---","AL-L-L-","LL---LA"],"miss":["ALLLLLL","wLLLALL","LALLLLL","wLLLALL"],"under":["wLL-ALL","LLw-LwA","DLLAwLL","LLLALLL"],"edge":["LLALLLL","LLALLLL","LLLDALL","LLLLALL"]};
  const C4J_LS = {
    intro: {
      four: '自分の色を<b>ヨコ・タテ・ナナメ</b>に4つ並べたら勝ち！<br>コマは列の<b>いちばん下の空きマス</b>にポトンと落ちるの。<br>置く前に「今すぐ4つ並ぶマスはない？」って見るくせをつけようね。',
      block: '相手に<b>今すぐ置ける勝ちマス</b>があったら、どんないい手よりも先にふさがなきゃ！<br>それから、相手の勝ちマスの<b>真下</b>に置くのもだめ。次に相手がそこへ置けるようになっちゃうの。',
      centre: '4つ並ぶ線は、盤の上に全部で<b>69本</b>。そのうちいちばん多くの線が通るのが<b>真ん中の列</b>なの。<br>コネクトフォーは先手必勝って分かっていて、初手で勝ちにつながるのは真ん中の列だけ！ 迷ったら真ん中寄りだね。',
      early: 'マスごとに「4つ並びの線」の数をくらべると、<b>真ん中ほど多くて、端ほど少ない</b>の。真ん中の2マスは13本、すみはたった3本！<br>序盤は線の多いマスに置くと、自分のチャンスがふえて相手のチャンスがへるね。でも、さいごに決めるのは読みだよ。',
      threat: '3つ並んで、4つ目のマスが空いている形を<b>勝ちマス（スレット）</b>って呼ぶの。相手はそのマスの真下に置けなくなる！<br>すぐには埋まらない<b>空中の勝ちマス</b>は、終盤になるほど効いてくるね。',
      open: 'すぐ置ける段で、<b>両はしが空いた2つ</b>に3つ目を足すと、どっちのはしに置いても4つ並ぶ形になるの。相手は片方しかふさげない！<br>ぎゃくに、相手がいちばん下の段で2つ並べたら、早めにはしを押さえておこうね。',
      diag: 'ナナメの4つ並びは<b>階段みたいな土台</b>がいるから、相手も自分も見落としがちなの。<br>ナナメの勝ちマスは空中にできることが多くて、すぐには使えなくても<b>終盤に効く</b>ねらいになるね。',
      double: '勝ちマスを<b>同時に2つ</b>作れば、相手は1手で片方しかふさげない！ これがダブルスレット。<br>よくあるのは、両はしが空いたヨコの3つと、<b>上下に重なった2つの勝ちマス</b>。一手で勝負が決まる、気持ちのいい手筋だね。',
      stack: '同じ列に<b>上下に並んだ2つの勝ちマス</b>を作ると、相手が下をふさいでも、その上にきみが置いて勝てるの。<br>数字の「7」みたいな形が代表的！ ヨコの3つとナナメの3つが、同じ列のとなりあうマスをねらうんだ。',
      force: 'すぐ置ける勝ちマス（<b>リーチ</b>）を作ると、相手はそこをふさぐしかないの。相手の手を<b>決めさせている</b>あいだに、自分の形を整えちゃおう！<br>「リーチ → 相手がふさぐ → ダブルリーチ → 勝ち」の流れを読み切ってね。',
      parity: '後手がずっと先手の<b>真上</b>に置き返すと、後手は<b>偶数段（下から2・4・6段目）</b>をみんな取れるの。<br>だから終盤は、<b>先手は奇数段</b>、<b>後手は偶数段</b>の勝ちマスが強い！ ほかの列が埋まると、相手は勝ちマスの真下に置くしかなくなるからね。',
      zugz: 'コネクトフォーは<b>パスができない</b>の。終盤にほかの列が埋まると、相手はきみの勝ちマスの<b>真下</b>に置くしかなくなる！ これがツークツワンク（手づまり）。<br>勝ちマスは数より<b>段</b>が大事なんだ。',
      follow: '後手が先手の石の<b>真上</b>に置き返し続けると、偶数段（2・4・6段目）をみんな取れるの。偶数段に勝ちマスがある後手は、これだけで負けない！<br>でも、真上に置くと相手に勝ちマスをわたすこともあるから、いつもまねすればいいわけじゃないね。',
      first: '先手は<b>奇数段（1・3・5段目）</b>の勝ちマスが終盤に効くの。奇数段に1つ作って、後手に偶数段の勝ちマスを作らせなければ先手の勝ち！<br>真上に置き返されても、奇数段の勝ちマスがその流れをくずしてくれるね。',
      second: '後手は<b>偶数段（2・4・6段目）</b>の勝ちマスが効くの。先手の奇数段のねらいを消しながら偶数段に勝ちマスを持てば、手づまりで後手が勝てる！<br>強い先手が相手でも、ねばれば勝負はまだまだ。結果を悪くしない一手をさがそうね。',
      op1: 'コネクトフォーは完全に解かれたゲームなの。先手が<b>初手で真ん中の列</b>に置けば、最善をつくすと先手の勝ち！ そのとなりの列なら引き分け、ほかは後手の勝ちになるね。<br>でも勝ち切るのは41手目。初手は長い戦いの入り口なんだ。',
      op2: '先手が真ん中に置いたら、後手はどこに返しても、強い先手には負けちゃうの。真上に返せば41手目までねばれるけど、<b>横にはずすと先手はもっと早く勝てる</b>！<br>相手が真ん中をはずしたら、すかさず攻めの形を作ろうね。',
      op3: '先手と後手が真ん中に置き合ったあとは、2人とも真ん中の列をてっぺんまで積み上げて、それから横の列へ広がるのが本線なの。<br>最善どうしなら、先手が<b>41手目</b>に勝つ！ 本線の手を当ててみてね。',
      count: '終盤は、勝ちマスのある列のほかに<b>空きマスがいくつ残っているか</b>を数えるの。そこが全部埋まったときに手番の側が、勝ちマスの下へ置かされる！<br>相手が置かされる側になるように、<b>数を合わせる</b>のが終盤のわざだね。',
      endwin: '盤が埋まってくると置ける場所がへって、ひとつのリーチが相手の手を決めちゃうの。<br>勝ちが見えたら、相手に反撃の勝ちマスをあげない<b>いちばん短い手順</b>で決め切ろう！',
      miss: '相手の勝ちマスをふさぐのは大事。でも、<b>自分が今すぐ4つ並べられるなら、それがいちばん先</b>！ 勝ってしまえば相手のねらいは関係ないからね。<br>置く前の確認は「①自分の勝ち ②相手の勝ちマスをふさぐ ③それ以外」の順番で。',
      under: '相手の勝ちマスの<b>真下</b>に置くと、そのマスが使えるようになって、相手にすぐ置かれて負けちゃうの。<br>ふさげない勝ちマスの下は、できるだけさいごまで空けておくのが鉄則！ 置ける列が少ない終盤ほど気をつけてね。',
      edge: 'いちばん端の2列は、どのマスも通る線が少なくて、序盤・中盤ははたらきが弱いの。端に置いているあいだに、相手に真ん中を固められちゃう！<br>迷ったら真ん中寄り。でも、読んでみたら端が正解の場面もあるからね。',
    },
    ask: {
      four: ['今すぐ4つ並べて勝っちゃおう！', '4つ目を入れる列はどこかな？', '勝ちの一手があるよ。見つけられる？', 'ヨコ・タテ・ナナメ、どこで4つそろう？', 'さあ、ポトンと落として勝負を決めよう！'],
      block: ['負けないための一手をえらんでね。', '相手が次に4つ並べちゃうマスはどこかな？', 'あぶない！ 相手のねらいを止める列は？', 'ここはまず守り。どの列に置く？', '相手の3つの先、空いているのはどこ？'],
      centre: ['勝ちにつながる、たった一つの手をえらんでね。', 'いちばん多くの線が通る列はどこかな？', 'ここで勝ちにつながる列はひとつだけ。どれ？', '{c}の番！ どの列がいちばん働く？', 'さあ、勝ちへの一手を見つけよう！'],
      early: ['序盤のいちばんいい一手をえらんでね。', 'この形、いちばん働くマスはどこかな？', '線の数と読み、両方で考えてみて！', '{c}の番。どこに置くのがいちばん？', 'さあ、序盤のじょうずな置き場所は？'],
      threat: ['勝ちにつながるねらいを作ってみよう！', 'あと1つで4つ並ぶマス、作れるかな？', '{c}の番！ 新しい勝ちマスを作る列は？', '相手をしばる勝ちマスを作る一手は？', 'さあ、空中の勝ちマスを作っちゃおう！'],
      open: ['両はしが空いた3つを作って、勝ちを決めちゃおう！', '相手が片方しか止められない形、作れるかな？', '{c}の番！ 2つ並びに3つ目を足すならどこ？', 'はしが2つとも空く3つ並び、どの列で作る？', 'さあ、止められない3つを作ろう！'],
      diag: ['ナナメの線を生かす、いちばんいい手をえらんでね。', 'ナナメの勝ちマスを作れる列はどこかな？', '{c}の番！ 階段の土台、使えそう？', 'ナナメに伸ばせる所、見つけられる？', 'さあ、ナナメのねらいを作ろう！'],
      double: ['勝ちマスを2つ同時に作っちゃおう！', '相手が1手じゃふさぎきれない形、作れるかな？', '{c}の番！ ダブルスレットの一手は？', '勝ちマスが2つになる列はどこ？', 'さあ、一手で勝負を決めよう！'],
      stack: ['上下に重なる勝ちマスを作ってみよう！', '同じ列に勝ちマスを2つ重ねられるかな？', '{c}の番！ 「7」の形、作れそう？', '下をふさがれても上で勝てる形、どの列で作る？', 'さあ、重なる勝ちマスをねらおう！'],
      force: ['3手以内に勝つ、さいしょの一手をえらんでね。', 'まずはリーチ！ どの列から始める？', '{c}の番！ 相手の手を決めさせる一手は？', '相手にふさがせてから勝つ道、見えるかな？', 'さあ、強制手順のスタート！'],
      parity: ['自分に合った段にねらいを作ってみよう。', '{c}に合うのは奇数段？ 偶数段？ どの列に置く？', '勝ちマスを作るなら何段目がいいかな？', '終盤に効く段の勝ちマス、作れる？', 'さあ、段を考えて置いてみよう！'],
      zugz: ['さいごに相手を手づまりにする一手をえらんでね。', '相手に勝ちマスの下へ置かせる手はどれかな？', '{c}の番！ 空きマスの数、合わせられる？', 'パスはできない。それを生かす一手は？', 'さあ、手づまりにする一手を見つけよう！'],
      follow: ['後手として、いちばんいい返し手をえらんでね。', '相手が今置いた石、そのすぐ上はどこかな？', '{c}の番！ 置き返すならどの列？', '偶数段をもらう一手は？', 'さあ、じょうずに置き返そう！'],
      first: ['先手として、勝ちにつながる一手をえらんでね。', '奇数段に勝ちマスを作れる列はどこかな？', '{c}の番！ 先手らしい一手は？', '終盤に効く勝ちマス、作れそう？', 'さあ、先手の勝ちへ進もう！'],
      second: ['後手として、いちばんいい一手をえらんでね。', '先手のねらいを消せる列はどこかな？', '{c}の番！ 偶数段を生かす一手は？', '結果を悪くしない一手、見つけられる？', 'さあ、後手のねばりを見せよう！'],
      op1: ['{c}の番！ 勝ちを残せる列は、ひとつだけ。どこかな？', '{c}の番。真ん中の列の積み合い、どう続ける？ 勝ちを残す列はひとつだけ。', '{c}の番！ 勝ちを残す列は？', '{c}の番。ここで負けない列は、ひとつだけ。見つけられる？', 'さあ、序盤の正解を当ててみよう！ 負けない列はひとつだけ。'],
      op2: ['{c}の番！ 勝ちにつながる列は、ひとつだけ。どこかな？', '相手が真ん中をはずしたよ。どう攻める？', '{c}の番！ 勝ちにつながる列は？', '相手が真ん中をはずしたよ。勝ちを残せる列は、ひとつだけ。どこかな？', 'さあ、とがめる一手を見つけよう！ 勝ちが残る列はひとつだけ。'],
      op3: ['本線の、いちばんいい一手をえらんでね。', '本線ではどの列に置くかな？', '{c}の番！ 最善の一手は？', '真ん中の列が埋まったよ。本線で{c}が置く列は？', 'さあ、本線の手を当ててみよう！'],
      count: ['終盤の、いちばんいい一手をえらんでね。', '空きマスはいくつ残ってる？ どの列に置く？', '{c}の番！ 数を合わせる一手は？', 'さいごに残る列はどれかな？', 'さあ、数えて置いてみよう！'],
      endwin: ['いちばん早く勝てる一手をえらんでね。', '勝ちが見えてる！ 決め切る列はどこかな？', '{c}の番！ 最短の一手は？', '相手に反撃させない一手、見つけられる？', 'さあ、勝ち切っちゃおう！'],
      miss: ['いちばんいい一手をえらんでね。', '相手のねらいもあるけど、まずは自分を見て！ どの列？', '{c}の番！ 今すぐできることは？', 'ふさぐ前に、もっといい手はないかな？', 'さあ、見のがさずに決めよう！'],
      under: ['負けない一手をえらんでね。', '置いちゃいけない列はどこかな？ その上で選んで！', '{c}の番！ 安全な列は？', '相手の勝ちマスの下、うめずにすむ手は？', 'さあ、落とし穴をよけて置こう！'],
      edge: ['この場面のいちばんいい一手をえらんでね。', '端と真ん中寄り、どっちが働くかな？', '{c}の番！ どの列に置く？', '線の多いマス、見つけられる？', 'さあ、じょうずな置き場所は？'],
    },
    // five hints a lesson (2026-11-23 lesson loop: two hints made the same line come back in every lesson); a hint naming the marks only
    // where the lesson shows them (hintMarks: me → green = yours, op → red = the opponent's, both)
    hint: {
      four: ['3つ並んでいる所をさがして、その先のマスに今すぐ置けるか見てみて。', 'ナナメも忘れずに！ 4つ目のマスの下が埋まっているかも確かめてね。', 'タテの3つは見つけやすいけど、ヨコの「2つ＋すき間＋1つ」もあるの。', '自分の色の線を、ヨコ・タテ・ナナメの順になぞってみよう！', '4つ目のマスが空中だと、まだ置けないの。今すぐ届くかがカギ！'],
      block: ['相手の3つ並びをさがして、その先のマスに今すぐ置けるか見てみて。', '相手の勝ちマスのうち、もう下が埋まっているマスが答えなの。', '自分の攻めはあと回し！ まずは相手が次に4つそろえる所をつぶそう。', 'ヨコ・タテ・ナナメ、相手の色が3つ並んでいる線はどれかな？', 'すき間のある「2つ＋1つ」も、相手のりっぱなねらいなの。見落とさないでね！'],
      centre: ['真ん中の列に注目してみて。左右どっちの4並びにも使えるからね。', '端の列を通る線は少ないの。真ん中ほど線が多いね。', 'そのマスを通る「4つ並びの線」が何本あるか、ざっと数えてみて！', '相手の石どうしのつながりを切れるマスも、いい候補なの。', '迷ったら真ん中から。そこから左右へくらべていこう！'],
      early: ['端の列は線が少ないから、序盤はたいてい弱い手なの。真ん中寄りから考えてみて。', '相手の形を分断できるマスはどこかな？', '真ん中の2マスは13本、すみはたった3本。線の数を思い出して！', '置いたマスが、自分の石とつながるかも見てみてね。', '置いたあと、相手にいいマスをゆずっていないかもチェック！'],
      threat: ['置いたあとに「あと1つで4つ並ぶ空きマス」ができる手をさがしてね。', '1つ空けて3つ並べると、空いたマスが勝ちマスになるの。その下が空いているとなおいいね。', '2つ並んでいる所に、3つ目を足せないか見てみて！', '勝ちマスの真下が空いていると、相手はその列に置きにくくなるの。', 'ヨコだけじゃなく、ナナメの3つでも勝ちマスは作れるよ。'],
      open: ['緑の印はきみの勝ちマス。ヨコに2つ並んだ所で、両どなりとその外がわにすぐ置けるか見てみて。', 'いちばん下の段や、すぐ置ける段の2つ並びに注目！', '3つ目を足したとき、両はしの2マスがどっちも今すぐ置けるかがポイントなの。', 'はしの片方に相手の石があると止められちゃう。両方空いている側をさがしてね。', '空きマスにはさまれた2つ並びが、いちばんのねらい目なの！'],
      diag: ['緑の印はきみの勝ちマス。ナナメに2〜3つ並んだ所を伸ばせないか考えてみて。', '置いたマスから、右上と左上の両方のナナメを見てね。', 'ナナメの線は、階段みたいに高さが1段ずつずれていくの。たどってみて！', '相手の石がナナメの線をふさいでいないかも、確かめてね。', '今すぐ置けなくても、空中にナナメの勝ちマスができればりっぱなねらい！'],
      double: ['置いたあとに勝ちマスが2つになる手をさがしてね。ヨコの両はしか、上下に重なる形！', '1つしか勝ちマスができない手だと、ふさがれておしまいなの。', '今すぐ置ける勝ちマスが2つ同時にできれば、相手はお手上げ！', '2本の線が交わるマスに置くと、ねらいが2つになりやすいの。', '相手は1手で1か所しかふさげない。それを思い出して！'],
      stack: ['緑の印はきみの勝ちマス。そのすぐ上か下に、もう1つ勝ちマスを作れないかな？', 'ヨコの3つとナナメの3つが、同じ列のとなりのマスをねらう形をさがしてね。', '数字の「7」の形を思い出して！ ヨコの線とナナメの線の組み合わせなの。', '下のマスをふさがれても、その上で勝てる形がゴールなの。', '同じ列の、上下にとなりあう2マスに注目してみて！'],
      force: ['光ってる印はきみの勝ちマス。まずは今すぐ置ける勝ちマスを作る手をさがして！', '相手がふさいだあと、どんな形が残るか考えてみてね。', 'リーチをかけると、相手の次の一手は決まっちゃうの。その先を読もう！', 'タテに3つ積むのも、りっぱなリーチになるの。', 'さいごは勝ちマスを2つ作ってフィニッシュ。そこから逆にたどってみて！'],
      parity: ['先手は奇数段（1・3・5段目）、後手は偶数段（2・4・6段目）のねらいをめざしてね。', '置いたあとにできる勝ちマスが、下から何段目かを数えてみて。', '勝ちマスを作れる手がいくつかあったら、段の奇数・偶数でくらべるの。', '{c}の番。{c}に合うのは奇数段？ 偶数段？', '終盤まで生き残る勝ちマスがどれか、想像してみて！'],
      zugz: ['印は勝ちマス。それぞれの列の空きマスの数と、どの段がだれの勝ちマスかを数えてみて。', '相手の勝ちマスの真下だけは、きみから埋めないこと！ ほかの空きマスを使っていこう。', 'パスはできないの。空きマスが尽きたとき、手番なのはどっち？', '赤い印は相手、緑の印はきみの勝ちマス。相手の勝ちマスの下は、さいごまで空けておいてね。', 'のこりの空きマスが偶数か奇数かで、さいごに置かされる側が決まるの。'],
      follow: ['相手が今置いた石のすぐ上を考えてみて。', '真上に置き返すと、偶数段がきみのものになるの。', '置き返す前に、そのマスで相手に勝ちマスをあげないかもチェック！', 'まねっこ作戦は、後手の守りの基本なの。', '相手が置いた列を思い出して。そこに重ねられるかな？'],
      first: ['緑の印はきみの勝ちマス。奇数段（1・3・5段目）に勝ちマスを作る手をさがしてね。', '置いたあと、相手に勝ちマスをわたさないかも確かめて！', '3段目の勝ちマスは、先手にとっていちばんたのもしいの。', '偶数段の勝ちマスは、先手にはあんまり効かないの。段を数えよう！', '相手の偶数段のねらいを消す手も、先手のいい手になるの。'],
      second: ['赤い印は相手の勝ちマス、緑の印はきみの勝ちマス。偶数段（2・4・6段目）に注目してね。', '先手の奇数段のねらいを消せる手はないかな？', '負けないのがいちばん。まずは相手の勝ちマスの下を空けておこう！', '後手は、ねばって引き分け以上をめざすのもりっぱな作戦なの。', '相手の3段目のねらい、つぶせる？'],
      op1: ['真ん中の列から考えてみて。', '真ん中の列は、まだ上が空いてるね。', '真ん中の列が、まだ空っぽ！ いちばん下から使えるね。', '相手が真ん中に重ねてきたね。きみも負けずに積めないかな？', '序盤は、線の数がいちばんの目安！'],
      op2: ['真ん中の列と、相手がはずした側の列をくらべてみて。', 'きみが前に置いた石の上も、立派な候補なの。', '相手がいま置いた石の上を見てみて。', 'ここは真ん中の列が主役じゃないの。きみが端に置いた石を見てみて。', '相手の石から遠い側を広げるのも、ひとつの手！'],
      op3: ['置いたあとに相手の勝ちマスができないか、それぞれの列を見てみて。', '本線は真ん中の列をてっぺんまで積んでから、横へ広がっていくの。', '真ん中の列はもう満タン。相手が置いた側とは反対の側を広げてみて。', '真ん中のすぐとなりの列で、積み合いが続いてるね。そこを見てみて。', '相手がいま置いた石のすぐ上が、大事なマスなの。'],
      count: ['印は勝ちマス。それぞれの列の空きマスを数えて、どの列がさいごまで残るか考えてみて。', '勝ちマスのある列以外の空きマスが、偶数か奇数かがカギなの。', '勝ちマスの真下は、相手に置かせたいマス。自分から埋めちゃだめ！', '空きマスを1つ埋めるごとに、数が1つへる。手番と合わせて数えよう！', '赤い印と緑の印、どっちの勝ちマスが下にあるかも大事なの。'],
      endwin: ['緑の印はきみの勝ちマス。すぐ置ける場所はあるかな？', '相手に反撃の勝ちマスをあげない手順を考えてね。', 'リーチをかけて、相手の手を決めさせるのが早道なの。', '置いたあとに、相手が今すぐ4つ並べられないかも確かめて！', 'いちばん短い勝ち方は、勝ちマスを2つ作ること。どこならできる？'],
      miss: ['相手の勝ちマスより先に、きみの勝ちマスを見てね。', '赤い印は相手、緑の印はきみの勝ちマス。今すぐ置けるのはどっち？', '「①自分の勝ち ②相手をふさぐ」の順番を思い出して！', '自分の色の3つ並び、もう完成しかけていない？', 'ふさぐのは、自分の勝ちがないと分かってから！'],
      under: ['赤い印は相手の勝ちマス。その真下に置く手はさけようね。', '置いたあと、相手がすぐ上に置いて4つ並ばないか確かめて！', '置ける列を1つずつ、真上が相手の勝ちマスかどうか調べてみて。', '安全な列のなかで、いちばん役に立つマスはどこかな？', '落とし穴は、空中の勝ちマスの下にあるの。その列はさいごまで残しておこう！'],
      edge: ['端の列はあとまわし。真ん中寄りの列からくらべてみて。', '置いたあとに相手の勝ちマスができないかも見てね。', 'そのマスを通る4つ並びの線、何本あるかな？', '相手の石のつながりを切れるマスも、いい候補なの。', '端に置くと、真ん中を相手にゆずっちゃうかも。くらべてみて！'],
    },
    // ポトンウサ's voice for one lesson, each lesson in an order of its own (c4Voice)
    cheer: ['いい感じ！', 'ナイス！', 'さすが！', 'やった！', 'すごい！', 'お見事！', 'ばっちり！', 'ぴょこっ、上手！', 'よく見つけた！', 'そうそう、それ！', 'いい手！', '完璧！'],
    soft: ['おしい！', '大丈夫！', 'ドンマイ！', 'あと一歩だった！', 'いい線いってたの！', '気にしない、気にしない！', 'よくある見落としなの。', '次は見つけられるはず！', 'いっしょに確かめよう！', 'これで覚えちゃおう！', '今度こそいけるって！'],
    push: ['この調子で次もいこう！', 'どんどん行こう！', 'その勢いで次へ！', '次もこの調子！', 'まだまだいけるよ！', 'わかってきたみたい、続けよう！'],
    lead: ['{m}なら、', '正解の{m}だと、', '{m}を選んでいれば、', 'こっちの{m}なら、', '{m}に置くと、'],
    tail: ['から。', 'からなの。', 'んだ。', 'の。', 'んだよ。'],
    gend: ['ってわけ！', 'の。', 'んだ！', 'のがポイント！', 'から、文句なし！'],
  };
  const C4DIR = ['ヨコ', 'タテ', 'ナナメ', 'ナナメ'];
  function c4Dir(g, c, r, p) { const at = (x, y) => (x >= 0 && x < 7 && y >= 0 && y < g[x].length) ? g[x][y] : 0; const D = [[1, 0], [0, 1], [1, 1], [1, -1]]; for (let d = 0; d < 4; d++) { const [dc, dr] = D[d]; let n = 1; for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (at(x, y) === p) { n++; x += dc * s; y += dr * s; } } if (n >= 4) return C4DIR[d]; } return ''; }
  function c4F(mv, u) {   // what dropping a disc in column u does (the side to move)
    const g = c4Grid(mv), me = mv.length & 1 ? 2 : 1, op = 3 - me, h = g[u].length;
    const now = p => { const o = []; for (let c = 0; c < 7; c++) if (g[c].length < 6) { g[c].push(p); if (c4Line(g, c, g[c].length - 1, p)) o.push(c); g[c].pop(); } return o; };
    const has = (L, c, r) => L.some(([x, y]) => x === c && y === r);
    const myNow = now(me), opNow = now(op), thrB = c4Thr(g, me), opThrB = c4Thr(g, op);
    const R = { u, h, row: h + 1, myNow, opNow, blocked: has(opThrB, u, h), under: has(opThrB, u, h + 1), underMine: has(thrB, u, h + 1), centre: Math.abs(u - 3) };
    if (h >= 6) return Object.assign(R, { full: true });
    g[u].push(me); R.win = c4Line(g, u, h, me); R.dir = R.win ? c4Dir(g, u, h, me) : '';
    R.opNext = R.win ? [] : now(op); R.myNext = now(me);
    const thrA = c4Thr(g, me); R.newThr = thrA.filter(([c, r]) => !has(thrB, c, r)); R.thrA = thrA;
    R.stacked = thrA.some(([c, r]) => has(thrA, c, r + 1));
    R.newRows = [...new Set(R.newThr.map(([, r]) => r + 1))].sort((a, b) => a - b);
    g[u].pop();
    return R;
  }
  // the 4-lines through a cell still open to p (no disc of the other side on them): a board fact for 「線の多いマス」
  function c4Lines(g, c, r, p) { const at = (x, y) => (x < 0 || x > 6 || y < 0 || y > 5) ? -1 : y < g[x].length ? g[x][y] : 0; let n = 0;
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) for (let s = -3; s <= 0; s++) { let ok = true; for (let k = 0; k < 4 && ok; k++) { const v = at(c + dc * (s + k), r + dr * (s + k)); if (v === -1 || v === 3 - p) ok = false; } if (ok) n++; }
    return n; }
  function c4Voice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = (n * 5) % 12, a2 = 1 + Math.floor(n / 11) % 10, b2 = (n * 3) % 11, X = C4J_LS;
    return { cheer: i => X.cheer[(a * i + b) % 12], soft: i => X.soft[(a2 * i + b2) % 11], push: i => X.push[(i + n) % 6] }; }
  function c4LsJa(s, P, i, me, cname, n) {   // n: the lesson's number (each lesson words its praise / misses in an order of its own)
    const id = s.id, A0 = C4J_LS.ask[id]; if (!A0) return null; n = n || 0;
    const k = i + id.length, pick = L => L[k % L.length], H = C4J_LS.hint[id] || [], VO = c4Voice(n);
    const vi = (i + n) % 5, V = (L, o) => L[(i + n + (o || 0)) % L.length];   // (the problem's own wording: five wordings a clause)
    const M = C4M('ok', 'ja'), X = C4M('ng', 'ja'), f = x => x.replace(/\{m\}/g, M).replace(/\{x\}/g, X).replace(/\{c\}/g, cname(me)).replace(/\{o\}/g, cname(3 - me));
    const ask = f(pick(A0)), hintTx = f(H.length ? H[(i + n) % H.length] : '');
    const sol = (C4SOL[id] || [])[i] || '', okS = new Set(P.answer), A = P.answer[0], odd = me === 1, g0 = c4Grid(P.moves);
    const legal = c => g0[c].length < 6, lines = c => c4Lines(g0, c, g0[c].length, me);
    const alt = u => { if (u != null && !okS.has(u) && legal(u)) return u; for (const c of [3, 2, 4, 1, 5, 0, 6]) if (!okS.has(c) && legal(c)) return c; return null; };
    const rowW = r => `${r}段目（${r & 1 ? '奇数' : '偶数'}段）`, myRow = r => (r & 1) === (odd ? 1 : 0), lastCol = P.moves.length ? +P.moves[P.moves.length - 1] - 1 : -1;
    const maxL = Math.max(...[0, 1, 2, 3, 4, 5, 6].filter(legal).map(lines));
    // why a right move works: five wordings of one plain clause (no ending), read from the board
    const plus = (F, u) => {
      if (F.win) { const d = F.dir; return [`${d}に4つそろって、その場で勝ちになる`, `${d}の4つ並びが完成する`, `4つ目が${d}の線にぴたりと入る`, `${d}に4つつながって勝負が決まる`, `${d}の線がうまって、すぐに勝てる`]; }
      if (F.blocked && F.myNext.length < 2) return F.myNext.length ? ['相手の勝ちマスをふさぎながら、リーチもかけられる', '守りながら、きみの勝ちマスも今すぐ置ける形になる', 'ふさいだ石が、そのままきみのリーチになる', '相手を止めて、こんどは相手にふさがせる番になる', '守りと攻めがいっぺんにできる']
        : ['相手が次に4つ並べるマスを先にふさげる', '相手の3つ並びの先をつぶせる', '次の手で負ける心配がなくなる', '相手の勝ちマスに先回りできる', '相手の4つ目が入る場所をうばえる'];
      if (id === 'follow' && u === lastCol) return ['相手の石に重ねて、偶数段を取っていける', '真上に重ねて、偶数段をきみのものにできる', '相手と同じ列に重ねて、偶数段の流れを守れる', 'まねっこで、相手に奇数段のねらいを作らせない', '真上の一手で、後手らしい形をくずさずにすむ'];
      if (id === 'zugz' || id === 'count') return ['空きマスの数が合って、相手が先に落とし穴へ置かされる', '残りのマスを埋めきったとき、置かされるのが相手になる', 'さいごに手づまりになるのが相手のほうになる', '勝ちマスの下を空けたまま、ほかのマスを使っていける', '数がぴったりで、相手に勝ちマスの下を埋めさせられる'];
      if (id === 'under' && !F.under) return ['相手の勝ちマスの下を埋めずにすむ', '相手のねらいの真下に手を出さずにすむ', '相手に勝ちマスを使わせない', '落とし穴の列にさわらずにすむ', '相手のねらいの下を、さいごまで残しておける'];
      if (F.myNext.length >= 2) return ['勝ちマスが2つ同時にできて、相手の守りが追いつかない', '今すぐ置ける勝ちマスが2つになる', 'ダブルリーチの形になって、もう止められない', 'どっちをふさがれても、もう片方で勝てる', '相手の1手では守りきれない形になる'];
      if (F.stacked && F.newThr.length) return ['上下にならんだ勝ちマスができる', '同じ列に勝ちマスが2つ重なる', '下をふさがれても、そのすぐ上で勝てる形になる', '「7」の形がそろって、その列は相手に使えなくなる', 'タテにとなりあう勝ちマスが2つできる'];
      if (F.myNext.length === 1 && (id === 'force' || id === 'endwin')) return ['リーチになって、相手はそこをふさぐしかない', '相手の次の一手を決めさせられる', 'すぐ使える勝ちマスで、相手の手をしばれる', 'リーチで相手を守りに回して、そのすきに形を作れる', 'リーチで主導権がきみのものになる'];
      if (F.newThr.length && (id === 'parity' || id === 'first' || id === 'second') && myRow(F.newRows[F.newRows.length - 1])) { const r = F.newRows[F.newRows.length - 1];
        return [`${rowW(r)}に勝ちマスができる`, `${r}段目という、{c}に合う段にねらいを置ける`, `終盤まで生き残りやすい${r}段目のねらいが作れる`, `{c}の得意な${odd ? '奇数' : '偶数'}段に勝ちマスが生まれる`, `${r}段目にねらいができて、相手はその下に置きにくくなる`]; }
      if (id === 'endwin') return ['相手に反撃させずに勝ち切れる', '最短コースで決められる', '相手に勝ちマスを1つもあげずに終われる', '寄り道しないで勝ちまで行ける', '相手の逆転のチャンスを消せる'];
      if (F.newThr.length) return F.myNext.length ? ['新しい勝ちマスができる', 'あと1つでそろう空きマスが生まれる', '相手がふさぐしかない勝ちマスが作れる', '相手をしばるねらいが1つふえる', 'きみの勝ちマスが1つふえる']
        : ['新しい勝ちマスができる', 'あと1つでそろう空きマスが生まれる', '相手は勝ちマスの真下に置けなくなる', '相手をしばるねらいが1つふえる', '空中に勝ちマスを作れる'];
      const L = lines(u);
      if (L >= maxL && L >= 5) return [`まだ使える4つ並びの線が${L}本も通るマスを押さえられる`, `${L}本の線に参加できる、働きのいいマスに置ける`, `通れる線が${L}本ある、いちばん欲ばりなマスを取れる`, `${L}本の4つ並びに顔を出せるマスが取れる`, `いちばん多い${L}本の線が通るマスを、先に取れる`];
      return ['最後まで読んでも、いちばんいい結果になる', 'このあと最善で進めても、いちばん得をする', '先の先まで読んで、いちばん損がない', '相手がどう返しても、いい流れが続く', 'ずっと先まで、きみに有利な形が残る'];
    };
    const FA = c4F(P.moves, A);
    const good = u => { const U = u != null && okS.has(u) ? u : A, F = U === A ? FA : c4F(P.moves, U), pu = i % 2 === 1 || i === (s.problems || []).length - 1;
      let s0 = VO.cheer(i) + ' ' + plus(F, U)[vi] + C4J_LS.gend[vi]; if (pu) s0 += ' ' + VO.push(i); return f(s0); };
    // what the wrong column misses (most telling first), worded per problem
    const ng = u0 => {
      const u = alt(u0); if (u == null) return f(VO.soft(i) + ' ' + C4J_LS.lead[vi] + plus(FA, A)[(vi + 2) % 5] + C4J_LS.tail[vi]);
      const G = c4F(P.moves, u), sv = sol[u] || '';
      let a = '', weak = false;
      if (G.myNow.length && !G.win) a = G.opNext.length ? V(['{x}だと勝ちを見のがして、逆に相手に4つ並べられちゃう！', '{x}を選ぶと、勝てるはずが次の手で相手の勝ちになるの。', 'その{x}は目の前の勝ちを通りすぎて、相手に4つそろえさせちゃう。', '{x}だと勝負を決めそこねて、相手の4つ目が先に入るの。', '{x}じゃ勝ちを逃したうえに、相手の勝ちマスも空いたままなの！'])
        : G.myNext.length === 1 ? V(['{x}だと、せっかくの勝ちを見のがしちゃう！', '{x}に置くと、そのすきに相手がきみの勝ちマスをふさいじゃう！', 'その{x}は、目の前の勝ちを通りすぎちゃう手なの。', '{x}より先に、今すぐ4つ並べられる列があったの。', '{x}じゃ勝負が決まらなくて、次は勝ちマスをふさがれちゃうの。'])
        : V(['{x}だと、せっかくの勝ちを見のがしちゃう！', '{x}より先に、今すぐ4つ並べられる列があったの。', 'その{x}は、目の前の勝ちを通りすぎちゃう手なの。', '{x}じゃ、まだ勝負が決まらないの。', '{x}を選ぶと、すぐ勝てる場面を遠回りしちゃうの。']);
      else if (G.opNext.length && G.under && !G.opNow.length) a = V(['{x}は相手の勝ちマスの真下！ すぐ上に置かれて4つ並んじゃう。', '{x}に置くと、そのすぐ上で相手が4つそろえて負けちゃう！', 'その{x}は落とし穴。相手が真上に置いて4つそろうの。', '{x}だと、相手の勝ちマスに手が届くようにしちゃう！', '{x}は相手のための土台になっちゃう。真上で4つ並ばれるの！']);
      else if (G.opNext.length) a = V(['{x}だと、相手の勝ちマスがあいたまま。次に4つ並べられて負けちゃう！', '{x}では相手の3つの先がふさがらないの。次で負けちゃう！', 'その{x}のあと、相手はすぐに4つそろえられるの。', '{x}に置いても相手の勝ちマスは残ったまま。すぐ負けちゃう！', '{x}だと守りが間に合わず、相手に4つ並ばれちゃう！']);
      else if (G.underMine) a = V(['{x}はきみの勝ちマスの真下。相手にその勝ちマスをふさがれちゃう！', '{x}に置くと、せっかくの勝ちマスに相手の手が届いちゃう。', 'その{x}は、きみの勝ちマスの土台になって、相手にふさがれるの。', '{x}だと、空中の勝ちマスを自分でつぶしちゃう！', '{x}は、相手にきみの勝ちマスを消させる手なの。']);
      else if ((id === 'double' || id === 'open') && G.myNext.length < 2) a = G.myNext.length ? V(['{x}だと勝ちマスは1つだけ。ふさがれておしまいなの。', '{x}のリーチは1つだけだから、相手にすぐ止められちゃう。', 'その{x}だとねらいが1本だけ。ふさがれたら終わり！', '{x}では勝ちマスが2つにならないの。相手の1手で止まっちゃう。', '{x}だと、相手は1か所ふさぐだけで守れちゃうの。'])
        : V(['{x}だと、すぐ置ける勝ちマスができないの。', '{x}では、今すぐ使える勝ちマスがひとつも生まれないの。', 'その{x}は、相手をあわてさせる手になってないの。', '{x}に置いても、相手はまだ自由に動けちゃう。', '{x}じゃ、相手に止めなきゃいけない場所ができないの。']);
      else if ((id === 'threat' || id === 'diag' || id === 'stack') && !G.newThr.length) a = V(['{x}だと、新しい勝ちマスができないの。', '{x}に置いても、4つ目を待つ空きマスは生まれないの。', 'その{x}では、相手をしばるねらいが作れないの。', '{x}だと、3つ並びの形にならないの。', '{x}じゃ、勝ちマスがふえないね。']);
      else if (id === 'stack' && !G.stacked) a = V(['{x}の勝ちマスは重ならないから、ふさがれたら終わりなの。', '{x}だと勝ちマスが上下にそろわないの。', 'その{x}のねらいは1段だけ。下をふさがれたらおしまい！', '{x}では「7」の形にならないの。', '{x}だと、同じ列に2つ目の勝ちマスができないの。']);
      else if ((id === 'parity' || id === 'first' || id === 'second') && G.newThr.length && !myRow(G.newRows[G.newRows.length - 1])) { const r = G.newRows[G.newRows.length - 1];
        a = V([`{x}の勝ちマスは${rowW(r)}。{c}には効きにくい段なの。`, `{x}だと、ねらいが${r}段目。{c}にはあまり役立たないの。`, `その{x}の勝ちマスは${r}段目で、{c}に合う段じゃないの。`, `{x}でできるのは${r}段目のねらい。終盤に{c}の味方をしてくれないの。`, `{x}だと${odd ? '偶数' : '奇数'}段の勝ちマスになって、{c}には効きにくいの。`]); weak = true; }
      else if (id === 'follow' && lastCol >= 0 && lastCol !== u) { a = V(['{x}は相手の石の真上じゃないから、偶数段の流れがくずれちゃう。', '{x}に置くと、まねっこがとぎれて奇数段を相手にゆずるの。', 'その{x}は、相手の置いた列からはずれちゃってるの。', '{x}だと、相手の石のすぐ上が空いたままになるの。', '{x}では置き返しにならないから、偶数段を取りそこねるの。']); weak = true; }
      else if (/^(centre|early|edge|op1|op2|op3)$/.test(id) && lines(u) < lines(A)) { const lu = lines(u), la = lines(A);
        a = V([`{x}のマスは、使える線が${lu}本だけ。`, `{x}に置いても、そのマスを通る線は${lu}本しかないの。`, `その{x}のマスは、4つ並びの線が${lu}本しか通らないの。`, `{x}だと、参加できる線は${lu}本どまり。${la}本とくらべると少ないね。`, `{x}は線が${lu}本の、働きの弱いマスなの。`]); weak = true; }
      const B = { L: ['{x}だと、相手が正しく打てば最後は負けになっちゃう。', '{x}だと、先まで読むと相手に勝ち筋が残るの。', '{x}のあと、相手がまちがえなければ負けちゃう。', 'その{x}は、最後まで読むと負けにつながる手なの。', '{x}を選ぶと、相手に勝ちへの道をゆずっちゃう。'],
        D: ['{x}だと、最後まで読んでも引き分けどまり。', '{x}では、いいとこ引き分けになっちゃう。', 'その{x}だと、相手に引き分けまで持ちこまれるの。', '{x}を選ぶと、勝負が引き分けで終わりそうなの。', '{x}だと、勝ちまでは届かないの。'],
        w: ['{x}でも勝てるけど、勝つまでが長くなっちゃう。', '{x}も勝ちは残るけど、遠回りなの。', 'その{x}でも勝てるけど、相手にねばられちゃう。', '{x}だと勝つまでに手数がかかって、ちょっと損。', '{x}も悪くないけど、もっと早い勝ち方があるの。'] }[sv];
      const B2 = { L: ['最後まで読むと、相手の勝ちになっちゃう。', 'そのまま進むと、負けにつながるの。', '相手が正しく打てば、負けちゃう。', '先まで読むと、相手に勝ち筋が残るの。', 'このままだと、最後は相手の勝ち。'], D: ['最後まで読むと引き分けどまり。', 'それだと引き分けで終わっちゃう。', '先まで読んでも、勝ちには届かないの。', 'いいとこ引き分けなの。', '勝負は引き分けになりそう。'], w: ['まだ勝てるけど、遠回り。', '勝てても、手数がかかっちゃう。', '勝ちは残るけど、相手にねばられるの。', 'もっと早い勝ち方があったの。', '勝つまでが長くなっちゃう。'] }[sv];
      let b2 = '';
      // (2026-11-23 第2期) a wrong column that still wins by force (sv 'w'): never say it fails (「ふさがれておしまい」「止められちゃう」) —
      // it is a slower win, worded as one (the lesson's own point about it stays only when it is true: 勝ちを見のがし・ふさがれる)
      if (sv === 'w' && /おしまい|止め|止ま|守れちゃう|終わり|負け|引き分け|届かない/.test(a)) { a = ''; weak = false; }
      if (!a) a = B ? V(B) : V(['{x}だと、相手に楽をさせちゃうの。', '{x}では、相手にいいマスをゆずっちゃう。', 'その{x}は、ちょっと働きが弱いの。', '{x}だと、相手の形がよくなっちゃう。', '{x}は少しもったいない手なの。']);
      else if (weak && B2) b2 = V(B2, 2);
      const head = VO.soft(i) + ' ', why = C4J_LS.lead[vi] + plus(FA, A)[(vi + 2) % 5] + C4J_LS.tail[vi];
      const t = head + a + b2 + why;
      return f(t.length > 140 ? head + a + why : t);
    };
    return { ask, hintTx, good, ng, own: true };
  }
  /* hnefatafl (2026-11-15): tafl/lessons.json (16 steps of 5 problems): one move from P.ok (20 or 0), a strategy move scored by the
     engine's values P.sc (= tafl/app.js problemPoints), or N moves that keep a forced escape / capture (P.n > 1, = seqAnswer: the engine's
     puzzle solver checks each move, the most stubborn defence answers). Progress = the full game's ('aicoding-tafl-lessons' { id: { best:
     points, clear } }). Texts: tafl/i18n.js (a sandbox). The 3D board has no coordinates: the moves the texts name are their marks (a ring
     on the piece, the destination square); the warm-ups name squares, so they stay in the full game; a notation paragraph is dropped. */
  const TF_ENG = '../tafl/engine.js?v=nn2sr-lv25-zf1';   // (the table adapter's file: one cache)
  const tfEng = () => window.TaflEngine ? Promise.resolve(window.TaflEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = TF_ENG; sc.onload = () => window.TaflEngine ? res(window.TaflEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const TFM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の手' : '赤い印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
  /* (2026-11-21 lesson loop) the tafl openings in タフリン's words, Japanese, for the 3D table (no coordinates): her own intro, the
     line's notes rebuilt from the board (what each move does — a capture, a piece saved from a sandwich, the corner guard, the king's
     room widened / narrowed, a capture threat, a defender to the edge / a corner — with the stored AI verdict when it changes), a
     question naming the side to move, a hint from what the best move does (never where), and after the answer why it is played and
     what yours gives up (the king let out / caught, a piece left to be sandwiched, a capture missed, the king's room, openings.json sc). */
  const TF_BLOCK = new Set([2, 12, 22, 8, 20, 32, 88, 100, 112, 98, 108, 118]);   // (the corner guard squares, = tafl/tools/gen_openings.js)
  function tfFacts(E, pos, m) {   // what a tafl move does (Copenhagen 11×11)
    const f = E.mFrom(m), t = E.mTo(m), att = pos.turn === 1, king = pos.at(f) === 3, n = pos.n, F = pos.G.F, me = pos.turn, op = me === 1 ? 2 : 1;
    const after = pos.clone().play(m), caps = after.lastCaps.length;
    const flip = (p, s) => { const q = p.clone(); q.turn = s; q.rehash(); return q; };
    const reply = q => { let c = 0, w = false; if (q.res) return { c, w }; for (const r of q.moves()) { const z = q.clone().play(r); if (z.res && z.res === q.turn) w = true; c = Math.max(c, z.lastCaps.length); } return { c, w }; };
    const opp = reply(after), thr = reply(flip(pos, op)).c, aim0 = reply(flip(pos, me)).c, aim = after.res ? 0 : reply(flip(after, me)).c;
    const km = p => p.king < 0 ? 0 : flip(p, 2).moves().filter(x => x % 256 === p.king).length, km0 = km(pos), km1 = km(after);
    const nb = [t - n, t + n, t - 1, t + 1].filter(x => x >= 0 && x < n * n && Math.abs(x % n - t % n) <= 1);
    const cd = q => { const r = Math.floor(q / n), c = q % n; return Math.min(r, n - 1 - r) + Math.min(c, n - 1 - c); };
    const Fx = { att, king, caps, win: after.res === me ? after.why || 'win' : '', oppCap: opp.c, oppWin: opp.w, thr, aim: aim > aim0 ? aim : 0, km0, km1,
      block: att && TF_BLOCK.has(t), edge: !!(F[t] & 1), touch: nb.some(x => { const y = after.at(x); return y && (y === 1) !== att; }), toCorner: cd(t) < cd(f) };
    Fx.k = Fx.win ? 'win' : caps ? 'cap' : thr && !opp.c ? 'save' : !att && king ? 'king' : att && Fx.block ? 'block' : att && km1 < km0 - 1 ? 'shut'
      : !att && km1 > km0 ? 'widen' : Fx.aim ? 'aim' : Fx.touch ? 'touch' : !att && Fx.edge ? 'edge' : !att && Fx.toCorner ? 'corner' : att ? 'ring' : 'out';
    return Fx;
  }
  const TFJ_OP = {
    intro: {
      a1: '攻め手は1手目から、四つの角のまわりを固めにいくの。王が角へ入る道を、先にふさいでおく作戦だね。いちばん基本の考え方だから、しっかり覚えよう！',
      a2: '辺のまん中にいる攻め手を、横へ広げていく作戦。翼を広げるみたいに、早めに大きな輪の形を作るんだ。',
      a3: '攻め手の駒をななめにつなげて、壁を作っていくよ。王の進む道を、少しずつせまくしていく作戦なの。',
      a4: '攻め手が辺にそって駒を動かして、守り手の出口を外側からおさえる作戦。外から締めつけるのがコツだね！',
      d1: '守り手は早めに王のまわりを空けて、王さま自身を外へ走らせるの。攻め手の輪ができる前に動くのがポイントだよ。',
      d2: '攻め手の輪のうすいところをねらって、すき間を作る作戦。守り手の駒で、輪の横っぱらをつつくんだ！',
      d3: '守り手の駒を外へ出して、盤を広く使う作戦。攻め手をあちこちに散らして、輪を作らせないの。',
      d4: '守り手の駒を角の近くへ送って、攻め手の角固めを先にくずす作戦だね。王の逃げ道を、早めに準備しておくんだ。',
    },
    ask: ['『{n}』のこの場面、{s}のいちばんいい手はどれかな？', '{s}の番！ ここはどう指す？', '{s}として、いちばんの手を当ててみて！', 'さあ、{s}ならここで何を指す？', '『{n}』の続きだよ。{s}の最善手、わかるかな？'],
    lead: ['正解は{m}だったの。', 'ここは{m}がいちばん！', '{m}を見てみて！', '本筋は{m}なんだ。', 'ここで指したいのは{m}。'],
    so: ['こっちは{a}から。', '{a}のが、この手のいいところ。', 'この手で{a}の。', 'これで{a}んだ。', '{a}、それが決め手。'],
    gap: ['{x}には、そのよさがないの。', '{x}だと、その形が作れないね。', '{x}だと、相手に先に大事なマスを使われちゃう。', '{x}では、そのチャンスを逃しちゃう。', '{x}だと、一手おくれる形なの。'],
    good: ['これで次のねらいがはっきりした！', 'いい流れを作れたの。', 'この作戦の本筋どおり、ばっちり！', 'いい形になった！', '作戦どおりに進んでる！'],
    deg: d => d <= 30 ? 'ほんの少し' : d <= 120 ? '少し' : d <= 400 ? 'はっきり' : 'かなり',
  };
  const TF_WHY = {   // why the move is played (the praise / the line's notes): a few wordings each, with different endings
    win: ['これで勝負あり！ この手で勝ちが決まるんだ。', '一気に決めちゃう手だね！', 'この一手でゲームセット！', '勝ちを決める、とどめの一手なの。', 'ここで決着！ 見のがさないでね。'],
    cap: ['相手の駒をはさんで取る手！ 駒が減ると、相手はぐっと苦しくなるね。', 'はさみ取り成功！ 取れるときは取っておこう。', '相手の駒を1つ取る手。これで相手の駒がひとつ減ったね！', '両側からはさんで、1枚いただく手なの。', '取れる駒をしっかり取る、かたい一手！'],
    save: ['ねらわれていた駒を、はさまれない場所へよける手。まずは駒を守るのが大事だね。', 'はさまれそうな駒を助ける手なの。取られる前に動かすのがコツ！', '相手のはさみ取りのねらいを、先にかわしておく手。', '取られそうな駒を逃がして、損をふせぐ手なの。', 'あぶない駒を先に守る、落ちついた一手！'],
    king: ['王さま自身が動く手！ 動けるマスが{a}から{b}に増えるの。', '王を外へ動かして、逃げ道をさがしにいくんだ。', '王さまが前へ出る手。攻め手は王の行き先を気にしないといけなくなる！', '王さまみずから出発！ 動ける場所が{b}マスになるの。', '王を動かして、角への道をうかがう手ね。', '王さまが自分で道を切りひらく手なの。', '王が動いて、攻め手の輪をゆさぶる手！'],
    block: ['角のとなりを固める手。王が角へ入る道を、先にふさいでおくの。', '角のまわりをしっかりガード！ 守り手は角へ逃げにくくなるんだ。', '角を守る形を作る手。攻め手の基本中の基本！', '四隅への入口に、先回りして駒を置く手なの。', '角のそばにふたをする手。王の逃げ道がひとつ減るね！'],
    shut: ['王の動けるマスを{a}から{b}にせばめる手！ 王の道をふさいでいくの。', '王の通り道に駒を入れて、動きをしばる手だね。', '王の行き先を減らす手。じわじわ追いつめるんだ。', '王さまの動ける場所を{b}マスにしぼる手なの。', '王の前に立ちふさがって、道を細くする手！'],
    widen: ['駒をどかして、王の動けるマスを{a}から{b}に広げる手！', '王のまわりを空けて、通り道を作るの。', '王の道を広げる手だね。王が動けるほど、攻め手は守りにくいんだ。', 'じゃまな駒をよけて、王さまの動ける場所を{b}マスにする手。', '王のための道をあける、地味だけど大事な一手なの。'],
    aim: ['つぎに相手の駒をはさんで取るねらいを作る手！ 相手は受けに手を取られちゃう。', '相手の駒をはさむ準備ができたの。', 'つぎのはさみ取りをねらう手。相手にプレッシャーをかけるんだ！', '次の一手で取れる形を作る手ね。', '相手の駒にねらいをつける、攻めの一手！'],
    touch: ['相手の駒にぴったりついて、はさむ形をねらう手だね。', '相手の駒のとなりへ。はさみ取りの準備なの。', '相手に近づいて、じわっと圧力をかける手！', '相手の駒に寄りそって、反対側をうかがう手。', 'となりに張りついて、相手を動きにくくする手なの。'],
    edge: ['守り手が端へ出て、攻め手の輪を外からかき乱す手！', '端へ出る手。攻め手は外側も気にしないといけなくなるの。', '盤のふちまで出て、輪の外側に足場を作る手ね。', '端に駒を置いて、攻め手の輪を広げさせる手なの。', '外へ飛び出す手！ 攻め手の守りがばらけるね。'],
    corner: ['角のほうへ駒を送って、攻め手の角固めをじゃまする手だね。', '角に近づく手。王の逃げ道の準備なの！', '角のそばに味方を置いて、王の着地点を守る手。', '四隅の近くへ先回りする手ね。', '角への道すじに駒を出して、攻め手の固めをおくらせる手なの。'],
    ring: ['輪をつめて、守り手の出口をせまくする手だね。', '攻め手の輪を少しずつ閉じていく手なの。', '外側から包む形を作る手！', '輪のすき間をうめていく、ていねいな一手。', '守り手を外へ出さないように、輪を整える手なの。'],
    out: ['駒を外へ広げて、攻め手を散らす手だね。', '盤を広く使う手。攻め手の輪を作らせないの！', '守り手の駒を外へ出す手。', '外へ駒を送って、輪ができる前にくずす手なの。', '広い場所へ出て、攻め手の手をふやさせる一手！'],
  };
  const TF_SHORT = { win: '勝ちが決まる', cap: '相手の駒を取れる', save: 'ねらわれた駒を守れる', king: '王の逃げ道が増える', block: '角を先に固められる', shut: '王の動ける道をせばめられる',
    widen: '王の通り道が広がる', aim: 'つぎのはさみ取りをねらえる', touch: '相手にはさむ圧力をかけられる', edge: '輪を外から乱せる', corner: '角固めをじゃまできる', ring: '輪をつめられる', out: '攻め手を散らせる' };
  const TF_SIDE = att => att ? '攻め手' : '守り手';
  function tfWhyJa(F, k) { let L = TF_WHY[F.k] || TF_WHY.ring; if (F.k === 'king' && !(F.km1 > F.km0)) L = L.filter(x => !/\{[ab]\}/.test(x));   // (the king's room shrinks: no "grows from a to b")
    let s = L[k % L.length].replace('{a}', F.km0).replace('{b}', F.km1); if (F.win === 'escape') s = '王が角までたどり着いて、守り手の勝ち！'; else if (F.win === 'capture') s = '王をはさみこんで、攻め手の勝ち！'; return s; }
  function tfHintJa(F, k) {
    const tail = ['', '金の丸が動かす駒だよ。', ''][k % 3], a = F.att;
    const h = { win: a ? '王をつかまえ切れる手がありそう！' : '王が一気に角まで行ける道、ないかな？', cap: 'はさんで取れる相手の駒をさがしてみて！', save: 'いま、はさまれそうな自分の駒はない？',
      king: '王さま自身を動かすのもアリなんだ。', block: '角のまわり、だいじょうぶ？ 王が入ってこられる道をチェックしてね。', shut: '王の動けるマスを数えてみて。いちばん減らせる手はどれ？',
      widen: '王のまわりの駒、じゃまになってない？', aim: 'つぎに相手の駒をはさめるように、準備できる手は？', touch: '相手の駒のとなりに、行ける駒はある？',
      edge: '盤の端まで出られる駒をさがしてみて。', corner: '角に近づける駒はどれ？', ring: '守り手の出口はどこ？ そこを外からふさごう。', out: '駒を外へ広げて、盤を広く使ってみて。' }[F.k];
    return (h || '金の丸の駒で、いちばん働く場所を考えてみて。') + tail;
  }
  function tfOpJa(E, P, name, k, ck) {   // ck(k): the move named by its mark
    const pos = E.Pos.from(P.s), A = P.best, sc = new Map(P.sc || []), best = sc.has(A) ? sc.get(A) : Math.max(...(P.sc || [[0, 0]]).map(x => x[1]));
    const FA = tfFacts(E, pos, A), M = ck('ok'), X = ck('ng'), f = s => s.replace(/\{m\}/g, M).replace(/\{x\}/g, X), side = TF_SIDE(FA.att);
    const ask = TFJ_OP.ask[k % TFJ_OP.ask.length].replace('{n}', name).replace('{s}', side);
    const good = u => { if (u != null && u !== A && sc.has(u)) return f(best - sc.get(u) <= 15 ? '{x}もいい手だね！ {m}と同じくらいよく働く手なの。' : `{x}も悪くない手。でも{m}なら${TF_SHORT[FA.k] || '形が整う'}から、そっちが本筋なの。`);
      const w = tfWhyJa(FA, k); return w + (/[！？]$/.test(w) ? ' ' : '') + TFJ_OP.good[k % TFJ_OP.good.length]; };
    const ng = u0 => {
      let u = u0; if (u == null || u === A) u = ((P.sc || []).find(x => x[0] !== A && best - x[1] > 15) || (P.sc || []).find(x => x[0] !== A) || [])[0];   // (no move given: a real miss, as the tool asks)
      const out = [TFJ_OP.lead[k % TFJ_OP.lead.length], TFJ_OP.so[k % TFJ_OP.so.length].replace('{a}', TF_SHORT[FA.k] || '形が整う')];
      if (u == null) return f(out.join(''));
      let F = null; try { F = tfFacts(E, pos, u); } catch (e) {}
      const d = sc.has(u) ? best - sc.get(u) : null;
      if (F) {
        const v5 = L => L[k % L.length];
        if (F.oppWin && !FA.oppWin) out.push(FA.att ? v5(['{x}だと、王に角まで逃げられちゃう！', '{x}では、王の逃げ道が開いて角まで走られるの。', '{x}だと、王さまに脱出されちゃう！', '{x}のすきに、王が角へ逃げこめるの。', '{x}では、王の道をふさぎ損ねて逃げられちゃう。']) : v5(['{x}だと、王がつかまっちゃう！', '{x}では、王さまがかこまれて負けちゃう。', '{x}だと、攻め手に王を取られるの。', '{x}のあと、王の逃げ場がなくなっちゃう。', '{x}では、王さまがはさまれて負けなの。']));
        else if (FA.win && !F.win) out.push(v5(['{x}だと、せっかくの勝ちを見のがしちゃうね。', '{x}では、勝てる場面を逃しちゃう。', '{x}だと、決められる勝負が続いちゃうの。', '{x}では、勝ちの一手を見落としてるの。', '{x}だと、勝ちまであと一歩で止まっちゃう。']));
        else if (F.oppCap > FA.oppCap) out.push(v5(['{x}だと、きみの駒がはさまれて取られちゃう！', '{x}のあと、相手に1枚はさみ取られるの。', '{x}では、ねらわれた駒が取られちゃう。', '{x}だと、相手の次の手で駒が減っちゃう。', '{x}では、駒を1つ取られる形が残るの。']));
        else if (FA.caps > F.caps) out.push(v5(['{x}だと、取れる駒を見のがしちゃうね。', '{x}では、はさみ取りのチャンスを逃すの。', '{x}だと、相手の駒が減らないまま。', '{x}では、取れたはずの駒が残っちゃう。', '{x}だと、せっかくの駒取りがお預け。']));
        else if (FA.att && F.km1 > FA.km1 + 1) out.push(v5([`{x}だと、王の動けるマスが${F.km1}まで増えちゃう。`, `{x}では、王の動ける場所が${F.km1}マスに広がるの。`, `{x}だと、王に${F.km1}マスも動かれちゃう。`, `{x}のあと、王の行き先が${F.km1}マスになっちゃう。`, `{x}では、王が${F.km1}マス動ける形が残るの。`]));
        else if (!FA.att && F.km1 < FA.km1 - 1) out.push(v5([`{x}だと、王の動けるマスが${F.km1}しかないまま。`, `{x}では、王の行き先が${F.km1}マスだけなの。`, `{x}だと、王は${F.km1}マスしか動けないの。`, `{x}のあと、王の動ける場所は${F.km1}マスどまり。`, `{x}では、王さまが${F.km1}マスに閉じこめられちゃう。`]));
        else if (FA.k === 'block' && !F.block) out.push(v5(['{x}だと、角のまわりが手うすになっちゃう。', '{x}では、角への入口があいたままなの。', '{x}だと、王が角へ近づく道が残るの。', '{x}では、四隅の守りが間に合わないの。', '{x}だと、角固めが一手おくれちゃう。']));
        else if (FA.aim && !F.aim && !F.caps) out.push(v5(['{x}だと、つぎのはさみ取りのねらいが作れないの。', '{x}では、相手の駒をねらう形にならないの。', '{x}だと、次に取れる駒が生まれないの。', '{x}では、はさみ取りの準備ができないね。', '{x}だと、相手に受けの手を使わせられないの。']));
      }
      if (out.length < 3) out.push(d != null && d <= 15 ? '{x}も悪くないけど、この作戦の本筋はこっちなの。' : TFJ_OP.gap[k % TFJ_OP.gap.length].replace('{a}', TF_SHORT[FA.k] || '形を整える'));   // (2026-11-22: no "the AI says")
      return f(out.join(''));
    };
    return { ask, hintTx: tfHintJa(FA, k), good, ng, own: true };
  }
  // (2026-11-23 lesson loop) the openings in タフリン's voice: each opening takes the praise / soft words / push / lead in an order of its own
  // (tfOpVoice), every "why" is picked so no sentence comes twice in one opening (the line's notes and the 5 problems together: xqPick)
  const TFV_OP = {
    askN: '『{n}』の続き！ {s}の次の一手はどれだと思う？',
    ask: ['{s}の番！ ここはどう指す？', '{s}として、いちばん働く手を当ててみて！', 'さあ、{s}ならここで何を指す？', 'この場面、{s}の一手を考えてみよう！', '{s}になったつもりで、次の手を選んでみて！', 'ここは{s}の腕の見せどころ。どの駒をどこへ？', '{s}の作戦を思い出して。次はどこかな？', '盤をよく見て！ {s}の最善手はどれ？'],
    cheer: ['いいね、その手！', 'さすが！', 'ばっちり！', 'お見事！', 'やった、正解！', 'ナイス！', 'すごい、大正解！', 'そうそう、それ！', 'いい目してる！', '上手！', '完璧！', 'よく見つけたね！'],
    soft: ['おしい、あと少し！', '大丈夫！', 'ドンマイ！', 'あと一歩だったの！', 'いい線いってた！', '気にしない、気にしない！', 'よくある迷いだから平気！', '次はきっと見つけられる！', 'いっしょに確かめよう！', 'ここで覚えちゃおう！'],
    push: ['この調子で次も行こう！', 'どんどん行こう！', 'その勢いで次へ！', '次も見せてね！', 'まだまだいける！', 'わかってきたね、続けよう！'],
    lead: ['正解は{m}だったの。', 'ここは{m}がいちばん！', '{m}を見てみて！', '本筋は{m}なんだ。', 'ここで指したいのは{m}。', '作戦どおりなら{m}！'],
    so: ['こっちは{a}から。', '{a}のが、この手のいいところ。', 'この手なら{a}の。', 'これで{a}んだ。', '{a}、それが決め手。', 'こう指せば{a}わけ。'],
    gap: ['{x}には、そのよさがないの。', '{x}だと、その形が作れないね。', '{x}だと、この手の働きが生まれないの。', '{x}では、そのチャンスを逃しちゃう。', '{x}だと、そのねらいが一手おくれるの。'],
    pr: ['きみの手で{a}の。', 'これで{a}ね！', '{a}のが、この手のねらい。', 'その手なら{a}。作戦がわかってきたね！', '{a}から、ここはこの一手なの。', 'ちゃんと{a}手を選べたね。'],
  };
  const TF_WHY_X = {   // more wordings for the openings (8 or so a kind: an opening says one kind up to 8 times)
    win: [], cap: ['はさみ取りが決まった！ 駒の数で一歩リード。', 'ここは取れる駒をいただく場面。迷わず取るのが正解なの。', '1枚取って、相手の陣形に穴をあける手！'],
    save: ['相手のはさみ取りを読んで、先に駒をどかす手。', '取られかけた駒の避難。損をしないのが作戦の土台なの。', 'はさまれる前にひょいとかわす、身軽な一手！'],
    king: ['王さまのお出かけ！ じっとしているより、動いて道をさがすの。', '王が一歩外へ。攻め手は王から目がはなせなくなる！', '王さまで攻め手の輪をつつく手。角をねらう準備ね。'],
    block: ['角の入口に門番を置く手。王はこのすじから角へ入れないの。', '角へのななめの道に駒を置く手。これで角まわりの守りが一つふえた！', '王の行き先になりそうな角を、先に閉じておく手。', '角を三つの駒で囲う形の、大事な一つ。'],
    shut: ['王の足もとをせまくする手！ 動ける道がぐっと減ったの。', '王さまの行く手をふさいで、じわっと追いこむ手。', '王の通り道に立って、走れる距離を短くする手！'],
    widen: ['王の前の駒がどいて、走れる道が開いた！', '道あけの一手。王が外をうかがえるようになるの。', '味方の駒を動かして、王さまの通り道を作る手。', '王の動ける場所がふえる手。攻め手は見はるマスがふえて大変！'],
    aim: ['相手の駒の向こう側をねらう手。次ははさんで取れるかも！', 'はさみ取りの予告みたいな手。相手は守りに一手使うことになるの。', '取るための下ごしらえ！ 相手の駒の横に、もう片方の手がとどく形。', 'ひとつ先を見た手。次に1枚取れる形ができたの。'],
    touch: ['相手のすぐ横へ。反対側に置けば取れる形！', 'ぴたっとくっついて、相手の自由をうばう手。'],
    edge: ['盤のふちへ出て、輪の外に足場を作る手。'], corner: ['角の近くに味方を送って、王の着地点を用意する手。', '角固めがまだのうちに、角のそばへ先回りする手。'],
    ring: ['輪の穴をふさぐ手。守り手の出口がひとつ減ったの。', '外側の壁を一枚ふやす手。'], out: ['守り手の駒を外へ。攻め手に輪を作るひまをあげないの。'],
  };
  const TF_SH = { win: ['勝ちが決まる', '勝負を決められる'], cap: ['相手の駒を取れる', '1枚いただける', '相手の駒が減る'], save: ['ねらわれた駒を守れる', '取られそうな駒を逃がせる', 'はさみ取りをかわせる'],
    king: ['王の逃げ道が増える', '王が自分で道をさがせる', '王が外をうかがえる'], block: ['角を先に固められる', '角への入口をふさげる', '角のそばに門番を置ける'], shut: ['王の動ける道をせばめられる', '王の行き先を減らせる', '王を追いつめられる'],
    widen: ['王の通り道が広がる', '王の走れる道がふえる', '王のまわりが空く'], aim: ['次に相手の駒をはさめる', '取るねらいが作れる', '相手に受けの手を使わせられる'], touch: ['相手にはさむ圧力をかけられる', '相手の駒にくっつける'],
    edge: ['輪を外から乱せる', '盤のふちに足場ができる'], corner: ['角固めをじゃまできる', '王の着地点を用意できる'], ring: ['輪をつめられる', '出口をひとつ減らせる'], out: ['攻め手を散らせる', '盤を広く使える'] };
  const tfSh = (kd, j, V) => { const A = TF_SH[kd] || TF_SH.ring; const c = V.sh || (V.sh = {}); c[kd] = (c[kd] || 0) + 1; return A[(j + c[kd]) % A.length]; };
  const TF_HINTV = { win: [a => a ? '王をつかまえ切れる手がありそう！' : '王が一気に角まで行ける道、ないかな？', a => a ? 'とどめの一手、さがしてみて！' : '王さまのゴール、もう見えてない？'],
    cap: ['はさんで取れる相手の駒をさがしてみて！', '両側から挟める駒、どこかにない？'], save: ['いま、はさまれそうな自分の駒はない？', '相手に取られそうな駒、助けてあげて！', '相手の番になったら、どの駒があぶない？'],
    king: ['王さま自身を動かすのもアリなんだ。', '王さまをじっとさせておくのはもったいないかも？', '王が動ける道、数えてみて！'], block: ['角のまわり、だいじょうぶ？ 王が入ってこられる道をチェックしてね。', '角の入口、ふさぎ終わってる？', '王が角へ近づくすじ、まだ開いてないかな？'],
    shut: ['王の動けるマスを数えてみて。いちばん減らせる手はどれ？', '王の通り道に立てる駒はどれ？', '王さまが走れるすじ、どこかに開いてない？', '王の行き先をひとつずつ数えてみよう。'], widen: ['王のまわりの駒、じゃまになってない？', '王さまの前をあけてあげる手は？', '王が通れる道、どうしたら増える？'],
    aim: ['次に相手の駒をはさめるように、準備できる手は？', '取るための下ごしらえ、できる駒はある？', '相手の駒の向こう側、ねらえないかな？', '次の一手で、どの相手の駒をはさめそう？', 'ひとつの手で、いくつの駒をねらえるかな？'], touch: ['相手の駒のとなりに、行ける駒はある？', '相手にぴたっと寄れる駒をさがしてみて。'],
    edge: ['盤の端まで出られる駒をさがしてみて。'], corner: ['角に近づける駒はどれ？', '角のそばへ先回りできる駒は？'], ring: ['守り手の出口はどこ？ そこを外からふさごう。', '輪のすき間、どこにある？'], out: ['駒を外へ広げて、盤を広く使ってみて。'] };
  function tfOpVoice(id) {
    const seed = shSeed('tf' + id), O = TFV_OP, pc = shPerm(seed, O.cheer.length), ps = shPerm(seed ^ 0x9e37, O.soft.length), pp = shPerm(seed ^ 0x51ed, O.push.length), pl = shPerm(seed ^ 0x2b7f, O.lead.length), pr = shPerm(seed ^ 0x6c1d, O.pr.length), pa = shPerm(seed ^ 0x1f3b, O.ask.length);
    return { cheer: i => O.cheer[pc[i % pc.length]], soft: i => O.soft[ps[i % ps.length]], push: i => O.push[pp[i % pp.length]], lead: i => O.lead[pl[i % pl.length]], pr: i => O.pr[pr[i % pr.length]], ask: i => O.ask[pa[i % pa.length]], used: new Set(), seed };
  }
  const tfRot = (A, o) => A.map((_, q) => A[(o + q) % A.length]);
  function tfWhyV(F, j, V) {   // the why, in words the opening has not used yet (null when every wording is used)
    if (F.win === 'escape') return xqPick(V, ['王が角までたどり着いて、守り手の勝ち！']); if (F.win === 'capture') return xqPick(V, ['王をはさみこんで、攻め手の勝ち！']);
    let L = (TF_WHY[F.k] || TF_WHY.ring).concat(TF_WHY_X[F.k] || []); if (F.k === 'king' && !(F.km1 > F.km0)) L = L.filter(x => !/\{[ab]\}/.test(x));
    L = L.map(x => x.replace('{a}', F.km0).replace('{b}', F.km1));
    const fresh = L.filter(x => xqSn(x).every(y => y.trim().length < 6 || !V.used.has(y.trim())));
    return fresh.length ? xqPick(V, tfRot(fresh, j)) : null;
  }
  function tfTargets(E, pos, m) {   // (2026-11-24 第2期) after m, how many enemy pieces the mover could sandwich with the next move
    const q = pos.clone().play(m), me = pos.turn; if (q.res) return 0; const f = q.clone(); f.turn = me; f.rehash(); const T = new Set();
    for (const r of f.moves()) for (const c of f.clone().play(r).lastCaps) T.add(c); return T.size; }
  function tfOpJaV(E, P, name, ck, V, i) {   // one problem of an opening, in the opening's voice V (tfOpVoice); i: the problem's number
    const pos = E.Pos.from(P.s), A = P.best, sc = new Map(P.sc || []), best = sc.has(A) ? sc.get(A) : Math.max(...(P.sc || [[0, 0]]).map(x => x[1]));
    const FA = tfFacts(E, pos, A), M = ck('ok'), X = ck('ng'), f = s => s.replace(/\{m\}/g, M).replace(/\{x\}/g, X), side = TF_SIDE(FA.att), j = i + V.seed % 7; let tgtA = 0;
    const ask = (i === 0 ? TFV_OP.askN : V.ask(i)).replace('{n}', name).replace('{s}', side);
    const HL = (TF_HINTV[FA.k] || ['金の丸の駒で、いちばん働く場所を考えてみて。']).map(h => typeof h === 'function' ? h(FA.att) : h);
    const hintTx = xqJoin(xqPick(V, tfRot(HL, j)), i % 3 === 1 ? xqPick(V, tfRot(['金の丸が動かす駒だよ。', '金の丸がついた駒に注目！', '金の丸の駒から考えてみて。'], j)) : '');
    const why = tfWhyV(FA, j, V) || xqPick(V, [0, 1, 2, 3, 4, 5].map(q => V.pr(i + q).replace('{a}', tfSh(FA.k, j, V))));
    const pu = i % 2 ? [0, 1, 2].map(q => V.push(i + q)).find(x => xqEnd(xqSn(x)[0]) !== xqLastEnd(why)) || V.push(i) : '', goodTx = xqJoin(V.cheer(i), why, pu);
    const sh = tfSh(FA.k, j, V);
    const good = u => { if (u != null && u !== A && sc.has(u)) return f(best - sc.get(u) <= 15 ? xqJoin(V.cheer(i), '{x}もいい手だね！ {m}と同じくらいよく働く手なの。') : xqJoin('悪くない手だね！', `でも{m}なら${sh}から、そっちが本筋なの。`));
      return goodTx; };
    const ng = u0 => {
      let u = u0; if (u == null || u === A) u = ((P.sc || []).find(x => x[0] !== A && best - x[1] > 15) || (P.sc || []).find(x => x[0] !== A) || [])[0];
      const pk = L => xqPick(V, tfRot(L, j));
      const out = [V.soft(i), V.lead(i), pk(TFV_OP.so.map(x => x.replace('{a}', sh)))];
      if (u == null) return f(xqJoin(...out));
      let F = null; try { F = tfFacts(E, pos, u); } catch (e) {}
      const d = sc.has(u) ? best - sc.get(u) : null, n0 = out.length; let tgtU = 0;
      if (F) {
        if (F.oppWin && !FA.oppWin) out.push(FA.att ? pk(['{x}だと、王に角まで逃げられちゃう！', '{x}では、王の逃げ道が開いて角まで走られるの。', '{x}のすきに、王が角へ逃げこめるの。']) : pk(['{x}だと、王がつかまっちゃう！', '{x}では、王さまがかこまれて負けちゃう。', '{x}のあと、王の逃げ場がなくなっちゃう。']));
        else if (FA.win && !F.win) out.push(pk(['{x}だと、せっかくの勝ちを見のがしちゃうね。', '{x}では、勝てる場面を逃しちゃう。']));
        else if (F.oppCap > FA.oppCap) out.push(pk(['{x}だと、きみの駒がはさまれて取られちゃう！', '{x}のあと、相手に1枚はさみ取られるの。', '{x}では、相手の次の手で駒が減っちゃう。']));
        else if (FA.caps > F.caps) out.push(pk(['{x}だと、取れる駒を見のがしちゃうね。', '{x}では、はさみ取りのチャンスを逃すの。', '{x}だと、取れたはずの駒が残っちゃう。']));
        else if (FA.att && F.km1 > FA.km1 + 1) out.push(pk([`{x}だと、王の動けるマスが${F.km1}まで増えちゃう。`, `{x}では、王の動ける場所が${F.km1}マスに広がるの。`, `{x}のあと、王に${F.km1}マスも動かれちゃう。`]));
        else if (!FA.att && F.km1 < FA.km1 - 1) out.push(pk([`{x}だと、王の動けるマスが${F.km1}しかないまま。`, `{x}では、王の行き先が${F.km1}マスだけなの。`, `{x}のあと、王さまは${F.km1}マスに閉じこめられちゃう。`]));
        else if (FA.k === 'block' && !F.block) out.push(pk(['{x}だと、角のまわりが手うすになっちゃう。', '{x}では、角への入口があいたままなの。', '{x}だと、王が角へ近づく道が残るの。', '{x}では、角固めが一手おくれちゃう。']));
        else if (FA.thr && !FA.oppCap && F.oppCap) out.push(pk(['{x}だと、ねらわれていた駒がそのまま取られちゃう。', '{x}では、あぶない駒を見すごしてるの。']));
        else if (FA.aim && !F.aim && !F.caps) out.push(pk(['{x}だと、次のはさみ取りのねらいが作れないの。', '{x}では、相手の駒をねらう形にならないの。', '{x}だと、相手に受けの手を使わせられないの。']));
        else if (FA.k === 'widen' && !(F.km1 > F.km0)) out.push(pk(['{x}だと、王の通り道は広がらないまま。', '{x}では、王のまわりがつまったままなの。']));
        else if (FA.k === 'king' && !F.king) out.push(pk(['{x}だと、王さまが動かないぶん、攻め手に輪を作る時間をあげちゃう。', '{x}では、王が出るタイミングを逃しちゃう。']));
        else if (F.k === FA.k && FA.att && F.km1 > FA.km1) out.push(pk([`{x}も同じような手だけど、王の動けるマスが${F.km1}残るの。{m}なら${FA.km1}まで減らせる！`, `{x}だと王は${F.km1}マス動けるまま。{m}なら${FA.km1}マスにしぼれるの。`]));   // (2026-11-24 第2期: the same kind of move — say a difference on the board)
        else if (F.k === FA.k && !FA.att && F.km1 < FA.km1) out.push(pk([`{x}も同じような手だけど、王の動けるマスは${F.km1}どまり。{m}なら${FA.km1}まで広がるの！`, `{x}だと王は${F.km1}マスしか動けないの。{m}なら${FA.km1}マス！`]));
        else if (F.k === FA.k && (tgtA || (tgtA = tfTargets(E, pos, A))) > (tgtU = tfTargets(E, pos, u))) out.push(pk(tgtU ? [`{x}だと、次にはさんで取れる相手の駒は${tgtU}つ。{m}なら${tgtA}つもねらえるの！`, `{x}でねらえる相手の駒は${tgtU}つだけ。{m}なら${tgtA}つ！`] : [`{x}だと、次にはさんで取れる相手の駒がないの。{m}なら${tgtA}つねらえる！`, `{x}では、次にはさめる相手の駒が生まれないの。{m}なら${tgtA}つ！`]));
      }
      if (out.length === n0) out.push(d != null && d <= 15 ? pk(['{x}も悪くないけど、この作戦の本筋はこっちなの。', '{x}もありだけど、作戦の流れからは少しはずれるの。']) : pk(TFV_OP.gap));   // (a move of the same kind: the verified plans have none left without a board difference — tools/lesson-verify.js taflOpen)
      return f(xqJoin(...out));
    };
    return { ask, hintTx, good, ng, own: true };
  }
  function tfNotesJa(E, g, notes, startSpec, V) {   // the line's notes in タフリン's words (3D, ja); the AI's verdict kept from the stored note when it changes
    const out = {}, cnt = {}; let pos = E.Pos.from(startSpec), n = 0, lastAi = '';
    g.study.line.forEach((m, i) => { const o = notes[String(i)];
      if (o) { const ai = (String(o.ja || o || '').match(/\((?:AI)[:：]\s*([^)]+)\)|（AI[:：]\s*([^）]+)）/) || []).slice(1).find(Boolean); let F = null; try { F = tfFacts(E, pos, m); } catch (e) {}
        const kd = F ? F.k : ''; cnt[kd] = (cnt[kd] || 0) + 1;
        let s = F ? (n ? TF_SIDE(F.att) + '：' : '') + ((V && tfWhyV(F, cnt[kd] + g.id.charCodeAt(1), V)) || tfWhyJa(F, cnt[kd] + g.id.charCodeAt(1))) : String(o.ja || o || '');
        if (n === 0) s = `『${(g.title || {}).ja || ''}』のはじまり！ ` + TF_SIDE(F ? F.att : true) + '：' + s.replace(/^[^：]*：/, '');
        lastAi = ai || lastAi;
        out[String(i)] = { ja: s }; n++; }
      pos = pos.clone().play(m); });
    return out;
  }
  /* (2026-11-21 lesson loop) the tafl lessons in タフリン's words, Japanese, for the 3D table (no coordinates): her own intros, five
     questions a lesson, hints, and after the answer why the move works / what yours misses, read from the board (tfLF: the king at the
     edge, the captures and what helps them — a corner, the throne, a shield wall —, the king's open lines (ライチ / トゥイチ), the
     opponent's best reply: a capture, the king let out / caught). The engine-scored strategy lessons use the openings' words (tfOpJa). */
  const TFJ_LS = {
    intro: {
      b_move: '駒も王さまも、縦か横に<b>空いていればどこまでも</b>進めるの。王を盤の<b>端</b>まで走らせよう！',
      b_cap: '相手の駒を<b>縦か横の両側から</b>はさむと取れるの。取れるのは<b>動かした側</b>だけ！<br>守り手は王さまもはさむ仲間になれる。でも、ななめにはさんでも取れないから気をつけてね。',
      b_hostile: '<b>四隅</b>は、どちらの駒から見ても相手の駒と同じはたらきをするの。<b>空いた玉座</b>も同じ（攻め手にとっては、王がいても敵）！<br>角や玉座のとなりの駒は、反対側に1枚置くだけで取れちゃう。',
      b_escape: '王が<b>四隅のどれか</b>に着けば守り手の勝ち！ でも攻め手も道をふさぎに来るの。<br><b>3手のうちに</b>、どう守られても逃げ切れる手順をさがそう。コツは、攻め手が1本ふさいでも<b>別の道が残る</b>ように王を進めること。',
      b_kingcap: '王は<b>4方向ぜんぶ</b>を攻め手にかこまれるとつかまるの（<b>玉座のとなり</b>なら3方向＋玉座）。盤の端にいる王はつかまらない！<br>王も逃げまわるから、<b>3手のうちに</b>どう逃げられてもつかまえる手順をさがそう。先に逃げ道をふさいでから、かこみを閉じるのがコツ。',
      b_safe: 'いま、きみの駒が相手にはさまれそう！ 逃がすか、はさまれない形にして守ろう。<br>動かした先でも、縦・横の両どなりに相手がもう1枚置けないか、確かめてね。',
      t_shield: '盤の<b>端</b>に2枚以上並んだ駒は、<b>列の両はしをふさいで</b>、<b>1枚ずつ前にも相手の駒</b>がいれば<b>まとめて</b>取れるの。角も列のふたになる（王さまだけは取られない）！',
      t_tuichi: '王に逃げ道が1本開くことを<b>「ライチ」</b>、2本同時に開くことを<b>「トゥイチ」</b>っていうの（リンネが記録した言葉）。<br>攻め手は1手で1本しかふさげないから、トゥイチができたらほぼ勝ち！',
      t_block: '王に逃げ道（ライチ）が開いたら、攻め手は<b>すぐにふさがないと</b>負けちゃう。<br>ただふさぐだけじゃなくて、次に王が<b>2本の逃げ道</b>を作れないかも考えるのがコツ！',
      t_fort: '王が<b>端</b>にいて、守り手の駒でかこった<b>こわせない砦</b>の中で動けたら、守り手の勝ち！<br>砦の駒は、どれも攻め手にはさまれない形じゃないとだめなの。',
      t_encircle: '攻め手が<b>守り手の駒ぜんぶ</b>をかこんで、どの駒も盤の端へ出られなくしたら、攻め手の勝ち！<br>輪はななめにつながっていても、ちゃんと閉じているあつかいなの。',
      s_corner: '攻め手のいちばん最初の仕事は、王が角へ走る前に<b>四隅のまわりを固める</b>こと。角からななめに並ぶ3つのマスに駒を置くと、王は角へ近づけないの。',
      s_breakout: '守り手は、攻め手の輪ができあがる前に<b>駒を外へ出して</b>すき間を作り、王の走る道を開くの。王さま自身も早めに動いて、2方向を見通せるマスをねらおう！',
      s_squeeze: '角を固めたら、攻め手は<b>少しずつ輪を縮めて</b>、王の動ける場所をせまくしていくの。取れる駒は取って、王のそばへ駒を寄せていこう！',
      v_brandubh: '小さな盤のブランドゥブでは、王は玉座とそのとなり以外なら<b>2枚ではさむだけ</b>でつかまっちゃう。角も攻め手の味方（敵のマス）になるの！',
      v_tablut: 'タブルットでは、王は盤の<b>端のどこか</b>に着けば脱出成功！ そのかわり、玉座からはなれた王は2枚ではさまれちゃうの。',
    },
    ask: {
      b_move: ['王さまを盤の端まで走らせてみて！', '王が一気に端へ出られる道、どっちかな？', 'さあ、王を端まで動かそう！ 角はまだ先でいいの。', '王から縦と横を見て、端まで走れる方向は？', 'もう一回！ 王さまを端までまっすぐ進めて。'],
      b_cap: ['相手の駒を1つ、はさんで取ってみて！', '片側にもう味方がいる相手の駒、見つけられるかな？', 'はさみ取りのチャンス！ どの駒を動かす？', 'あと1枚ではさめる駒があるの。どれだろう？', 'さあ、相手の駒をはさんでいただこう！'],
      b_hostile: ['角か玉座を使って、相手の駒を取ってみて！', '角や玉座のとなりにいる相手の駒、見つけたかな？', '角と玉座も味方にしちゃおう。取れる駒はどれ？', '片側は角か玉座がふさいでくれてる。もう片側に置ける駒は？', 'さあ、角や玉座ではさんで取ろう！'],
      b_escape: ['{n}手のうちに、王を角へ逃がそう！ どう守られても逃げ切れる手順は？', 'ふさがれても別の道が残る進み方、わかるかな？ {n}手で脱出をめざして！', '王さまを角まで連れていこう。{n}手以内でね！', '攻め手のいちばんしぶとい受けまで読んで、{n}手で脱出！', 'さあ、{n}手の脱出劇！ 最初の一手はどれ？'],
      b_kingcap: ['{n}手のうちに、どう逃げられても王をつかまえよう！', '王の逃げ道はどこかな？ 先にふさいで、{n}手でつかまえて！', '王さまを追いつめよう。{n}手以内でね！', '王がどう逃げても、{n}手でかこめる手順は？', 'さあ、王さまをつかまえる{n}手の作戦！ 最初の一手は？'],
      b_safe: ['相手に駒を取られない手を指してみて！', 'はさまれそうな駒はどれかな？ 守ってあげよう。', '取られる前に、ひと工夫！ 安全な手はどれ？', 'このままだとはさまれちゃう。どう守る？', '動かした先も安全かな？ よく見て選んでね。'],
      t_shield: ['端に並んだ相手の駒を、まとめて取っちゃおう！', 'シールドウォールのチャンス！ 列のふたはどこかな？', '端の列は、前がもうふさがってる。最後のふたを閉じて！', 'まとめ取りの一手、見つけられる？', 'さあ、端の駒を一気にいただこう！'],
      t_tuichi: ['王を、逃げ道が2本できるマスへ動かしてみて！', 'トゥイチのチャンス！ 王はどこへ行く？', '角への道を2本、いっぺんに開けるかな？', '攻め手が1手でふさぎきれない場所は、どこだろう？', 'さあ、王さまの逃げ道を2本作っちゃおう！'],
      t_block: ['王の逃げ道をふさいで、2手以内に逃げられないようにしよう！', '王から角までの道が開いてる！ どこでふさぐ？', 'ふさいだあと、王にトゥイチされないかな？ よく見て！', 'ライチ発生！ 攻め手の受けの一手は？', 'さあ、王さまの道に駒を入れて止めよう！'],
      t_fort: ['さいごの1枚を入れて、エッジフォートを完成させよう！', '砦の壁に、穴がひとつあいてるの。どこかな？', 'あと1手で砦ができあがる！ どの駒を動かす？', '攻め手が入れない砦、作れるかな？', 'さあ、王さまのお城を完成させて！'],
      t_encircle: ['輪のさいごのすき間を閉じて、包囲を完成させよう！', '守り手が外へ出られるすき間、どこにあるかな？', 'あと1手で包囲の完成！ どの駒で閉じる？', '輪がななめにつながってもいいのを思い出して！ 閉じる手は？', 'さあ、守り手をまるごとかこんじゃおう！'],
      s_corner: ['この場面、攻め手のいちばんいい手はどれかな？ 角のまわりに注目！', '角のまわり、すき間はない？ いちばんの一手を指して！', '王が角へ走る前に、どこを固める？', 'いちばんの手を当ててみて！ カギは四隅。', 'さあ、角の守りをしっかり！ どの駒を動かす？'],
      s_breakout: ['この場面、守り手のいちばんいい手は？ 王の道に注目して！', '輪がとじる前に、すき間を作れるかな？', '王さまの通り道、どうやって広げる？', 'いちばんの一手を当ててみて！', 'さあ、守り手の反撃！ どこから動く？'],
      s_squeeze: ['この場面、攻め手のいちばんいい手は？ 王のまわりに注目！', '輪をひとまわり小さくできるかな？', '王の動けるマス、どうやったら減らせる？', 'いちばんの一手を当ててみて！', 'さあ、じわじわ追いつめよう！ どの駒を寄せる？'],
      v_brandubh: ['王さまをつかまえて、勝っちゃおう！', '王のとなりに攻め手がいる！ 反対側に置ける駒は？', 'ブランドゥブなら2枚でつかまえられる。どの駒を動かす？', '角も味方になるのを思い出して！ 王をはさむ手は？', 'さあ、一手で勝負を決めよう！'],
      v_tablut: ['2手以内に、王を端へ逃がせる手を指してみて！', '王から端まで、2方向に見通せるマスはどこかな？', '攻め手が1手でふさぎきれない場所へ、王を動かそう！', '端への道を2本作れたら勝ち！ どこへ行く？', 'さあ、王さまの脱出ルートを作っちゃおう！'],
    },
    hint: {
      b_move: ['金の丸が王さま。縦と横、端まで駒がない方向はどっち？', '王から4方向を順に見てみて。とちゅうに駒があると、そこで止まっちゃう。', '王さまの上下左右、ずっと空いている列はあるかな？', 'タフルの駒は、空いていればどこまでも進めるの。王も同じ！', '駒にぶつからずに、盤のふちまで行ける向きをさがしてね。'],
      b_cap: ['金の丸の駒を動かすと、相手の駒をはさめるの。', '相手の駒のとなりに、もう味方がいるところをさがしてみて。反対側があいていればチャンス！', '縦か横で、相手の駒を味方とはさめる場所は？ ななめはだめなの。', '片側はもう準備OKの相手の駒があるの。もう片側へ行ける駒は？', '動かした先で、相手の駒が自分の駒2つにはさまれる形を作ろう！'],
      b_hostile: ['角か玉座に接した相手の駒をさがしてね。金の丸が動かす駒！', '角と玉座は、相手の駒の代わりになるの。その反対側へ行ける駒は？', '四隅に接している相手の駒、見つけた？', '空いた玉座も、敵のマスとしてはたらくの。そのとなりは危ない場所！', '角や玉座が、はさむ相手の片方になってくれるの。あと1枚を置くだけ！'],
      b_escape: ['光ってる駒から動かすの。攻め手が1本ふさいでも、まだ別の道が残る場所はどこかな？', '相手が道をふさいできたら、そのあとの道も残るかな？ 2手先まで考えてみて。', '王さまが辺に出ると、角までの道が見えてくるの。', '攻め手のいちばんしぶとい受けを想像してね。それでも道は残る？', '王が進んだあと、攻め手のどの受けにも次の道が残るかな？ ひとつずつ確かめてみて。'],
      b_kingcap: ['光ってる駒から動かすの。まずは王の逃げ道をよく見てね。', '王が逃げられるマスを先につぶしてから、かこみを閉じよう！', '王のまわり4方向、まだ空いているのはどこ？', '王が動けるマスを数えてみて。その数を減らせる手から考えよう。', '王が逃げた先でも、かこめるかな？ 2手先まで読んでみて。'],
      b_safe: ['金の丸の駒から動かすと、どの駒も取られなくなるの。', 'いま両どなりの片方に相手がいる駒はどれ？ その反対側に注目してね。', '逃げた先でも、はさまれない？ 両どなりを確かめてね。', '相手が次に置けるマスを想像してみて。そこで取られる駒は？', 'よけるだけじゃなく、相手の置き場所をふさぐのも守りなの。'],
      t_shield: ['並んだ駒の前はもう埋まってるの。残ってるのは、列のはしの「ふた」だね。', '列の両はしを見てみて。ふたがあいているのはどっち？ 角もふたになるの！', '端に並んだ相手の駒、何枚あるか数えてみて。', 'まとめ取りは、列の両はしと前がそろったとき。足りないのは1か所！', '金の丸の駒で、列のはしへ入ってみよう。'],
      t_tuichi: ['王を、2つの辺が見通せるマス（角に近い辺の上など）へ動かしてね。金の丸が王さま！', '王が着いた先から、角へまっすぐ行ける道は何本あるかな？ 2本ならトゥイチ！', '1本だけの道は、すぐふさがれちゃう。2本同時がねらい目なの。', '角のそばの空いたマス、王さまが行けるのはどこ？', '縦にも横にも、角まで駒がない場所をさがそう。'],
      t_block: ['王から角（端）までの道の上に、攻め手を1つ入れるの。金の丸がその駒！', 'ふさいだあと、王が別のマスで2本の道を作れないかも見てね。', '王さまが次に動く先も想像してみて。', '道のどこでふさぐかで、そのあとが変わるの。', 'ふさぎに行く駒が、はさまれないかも確かめて！'],
      t_fort: ['王のまわりの壁に、1か所だけ穴があいてるの。金の丸の駒でふさいでね。', '壁の駒が、攻め手にはさまれない形になるかも確かめて！', '砦は端にくっついた守りの壁。どこが欠けてる？', '王さまが中で動けるスペースも残しておいてね。', '攻め手が入ってこられる入口、ひとつだけあるの。'],
      t_encircle: ['輪に1か所だけすき間があるの。金の丸の駒で閉じてね。', '守り手の駒が端へ出られる道をたどってみて。どこで切れるかな？', '輪はななめにつながっていてもOK！', '外へぬける穴をひとつ探そう。そこに入れば完成なの。', '閉じる駒が、はさまれない場所かも見ておいてね。'],
      v_brandubh: ['王の反対側に、もう1枚置ける攻め手をさがしてね。', '王のとなりにいる攻め手は？ その向かい側へ行ける駒が答え！', '角のとなりの王なら、角が片側の役をしてくれるの。', '縦でも横でもいいの。2枚で王をはさむ形を作ろう。', '王が玉座のとなりにいないか、先に確かめてね。'],
      v_tablut: ['王を、2つ以上の方向へ端まで見通せるマスへ動かしてね。', '端への道が2本できれば、攻め手は1本しかふさげないの。王はどこへ行く？', 'タブルットは角じゃなくて、端ならどこでも脱出なの。', '王さまの上下左右、端まで空いた道を数えてみて。', '一度にふさがれない場所、見つけられるかな？'],
      s_corner: ['四隅のまわりで、王が入りこめそうなすき間はどこかな？', 'ねらわれている自分の駒がないかも、先に確かめてね。', '角からななめに並ぶ3マス、もう埋まってる？', '王から角へ向かう道を、指でたどってみて。', '取れる相手の駒があれば、それも候補に入れてね。'],
      s_breakout: ['王から見て、ふさがっている方向はどっち？ じゃまな駒をどかすのも手なの。', '輪のうすいところはどこかな？ そこへ駒を出してみて。', '王さま自身が動くのも、立派な作戦なの。', 'はさまれそうな味方はいない？ 守りながら外へ出よう。', '盤の端や角に近い場所、空いてないかな？'],
      s_squeeze: ['王の動けるマスを数えてみて。いちばん減らせる手は？', 'はさまれそうな自分の駒、取れる相手の駒も見のがさないでね。', '輪のすき間から、守り手が出てこられそうな所は？', '王の近くへ寄せられる攻め手はどれかな？', '急ぎすぎて、駒をはさまれないようにね。'],
    },
  };
  function tfLF(E, pos, m) {   // what a lesson move does: the king, the edge, the captures (and what helped), the king's open lines, the reply
    const f = E.mFrom(m), t = E.mTo(m), F = pos.G.F, me = pos.turn, after = pos.clone().play(m), caps = after.lastCaps.slice();
    const help = caps.map(q => { const o = 2 * q - t; return (F[o] & 2) ? '角' : (F[o] & 4) && !after.at(o) ? '玉座' : ''; }).find(Boolean) || '';   // (the square beyond the taken man: a corner / the empty throne)
    const R = { m, f, t, king: pos.at(f) === 3, edge: !!(F[t] & 1), caps: caps.length, help, win: after.res === me ? after.why || 'win' : '', routes: after.res ? 0 : after.kingLines().length, kingPair: caps.some(q => pos.at(2 * q - t) === 3), kingNearCorner: after.king >= 0 && after.nb(after.king).some(x => F[x] & 2) };
    R.scan = () => { if (R._s) return R._s; let c = 0, w = false, tu = false;
      if (!after.res) for (const r of after.moves()) { const z = after.clone().play(r); if (z.res && z.res !== me) w = true; c = Math.max(c, z.lastCaps.length); if (!z.res && z.kingLines().length >= 2) tu = true; }
      return (R._s = { c, w, tu }); };
    return R;
  }
  // (2026-11-22 lesson loop) タフリン's voice for one lesson: praise / soft words / push on, each lesson in an order of its own (tfVoice);
  // every line below has five wordings, taken by the problem's number, so no line comes twice in a lesson
  const TF_V = {
    cheer: ['いいね、その手！', 'さすが！', 'ばっちり！', 'お見事！', 'やった！ 正解！', 'ナイス！', 'すごい、大正解！', 'そうそう、それ！', 'いい目してる！', '上手！', '完璧！', 'よく見つけたね！'],
    soft: ['おしい、あと少し！', '大丈夫！', 'ドンマイ！', 'あと一歩だったの！', 'いい線いってた！', '今度こそいけるよ！', '気にしない、気にしない！', 'よくある見落としなの。', '次は見つけられるはず！', 'いっしょに確かめよう！', 'これで覚えちゃおう！'],
    push: ['この調子で次も行こう！', 'どんどん行こう！', 'その勢いで次へ！', '次も見せてね！', 'まだまだいける！', 'わかってきたね、続けよう！'],
  };
  function tfVoice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = n % 12, a2 = 1 + Math.floor(n / 11) % 10, b2 = n % 11;
    return { cheer: i => TF_V.cheer[(a * i + b) % 12], soft: i => TF_V.soft[(a2 * i + b2) % 11], push: i => TF_V.push[(i + n) % 6] }; }
  function tfLsJa(E, s, P, i, ck, n) {   // ck(k): the move named by its mark; n: the lesson's number
    const id = s.id, A0 = TFJ_LS.ask[id]; if (!A0) return null; n = n || 0;
    const pk = (L, o) => L[(i + n + (o || 0)) % L.length], pick = pk, nn = P.n || 1, H = TFJ_LS.hint[id] || [], VO = tfVoice(n);
    const ask = pk(A0).replace(/\{n\}/g, nn), M = ck('ok'), X = ck('ng'), f = x => x.replace(/\{m\}/g, M).replace(/\{x\}/g, X);
    const fg = x => f(x.replace(/\{x\}/g, pk(['その手', 'いまの手', 'きみの一手', 'その一手', 'いまの一手'])));   // (praise: your move is the right one — no red mark to name)
    const hintTx = H.length ? pk(H) : '';
    const wrap = (o, pu) => { const g0 = o.good, n0 = o.ng; return Object.assign(o, { good: (...a) => VO.cheer(i) + ' ' + g0(...a) + (pu ? ' ' + VO.push(i) : ''), ng: (...a) => VO.soft(i) + ' ' + n0(...a), own: true }); };
    const pu = i % 2 === 1 || (s.problems || []).length <= 2;
    if (P.sc && !P.ok) {   // (the engine-scored strategy lessons: the openings' words, the lesson's question and hints)
      const o = tfOpJa(E, P, '', i + n, ck); return wrap(Object.assign(o, { ask, hintTx: hintTx || o.hintTx }), pu);
    }
    if (nn > 1) {   // (N moves with a forced escape / capture: the runner names the green / red moves)
      // (2026-11-24 第2期) the words say only what the board shows: ng(u, before, used, m) — your move u from the position before it
      // (used: your moves already played), m: a move that still forces the goal there. Every count is read from that board
      // (tools/lesson-verify.js tafl checks them: the king's lines to a corner, the king's free squares, a win next move).
      const esc = id === 'b_escape';
      const G = esc ? ['脱出成功！ 攻め手がどこをふさいでも、そのたびに別の道が残っていたね。', 'みごとに逃げ切った！ どう受けられても、王は角までたどり着けたの。', '王さまが角に到着！ 受けられても道が消えない進み方だったね。', `${nn}手の脱出劇、大成功！ ふさがれるたびに次の道が開いていたの。`, '攻め手の受けを全部かわして、角までゴール！ 読みがしっかりしてたね。']
        : ['王さまをつかまえた！ どこへ逃げても、かこみが追いついたね。', 'みごとな包囲！ 王の行き先を先に読んで、かこみを閉じられたの。', `つかまえた！ 王がどう逃げても、${nn}手のうちにかこめる手順だったね。`, `${nn}手でぴたっと捕獲！ 王がどっちへ逃げても、かこめる形だったの。`, '王さま、もう動けない！ かこみを閉じる順番が完璧だったね。'];
      const kMob = q => { const z = q.clone(); z.turn = 2; z.res = 0; return z.king < 0 ? 0 : z.moves().filter(x => E.mFrom(x) === z.king).length; };
      const winsNext = q => !q.res && q.moves().some(x => q.clone().play(x).res === q.turn);
      const ng = (u0, b0, used, m0) => {
        const real = b0 && typeof b0.moves === 'function', pos = real ? b0 : E.Pos.from(P.s), left = nn - (real && typeof used === 'number' ? used : 0), all = pos.moves(), m = real && m0 != null ? m0 : P.best;
        const u1 = all.find(x => !(P.ok || []).includes(x) && E.mFrom(x) === E.mFrom(m)), u = typeof u0 === 'number' && u0 !== m && all.includes(u0) ? u0 : u1 != null ? u1 : all.find(x => x !== m);
        const q = pos.clone().play(u), q2 = pos.clone().play(m), out = [];
        if (esc) {
          const king = pos.at(E.mFrom(u)) === 3, kl = q.kingLines().length, kl2 = q2.kingLines().length;
          out.push(winsNext(q) ? pk(['{x}だと、王さまが攻め手にかこまれてつかまっちゃう！', '{x}のあと、攻め手に王をはさまれて負けちゃう。', '{x}では、王さまがつかまる場所に入っちゃうの。', '{x}だと、次の手で王がつかまっちゃう！', '{x}のあと、王さまのまわりが攻め手でうまっちゃう。'])
            : !king ? pk(['{x}で動いたのは王さまじゃない駒なの。王が止まっているあいだに、攻め手の受けが間に合っちゃう。', '{x}は王さまじゃない駒の手。王が1手止まるぶん、攻め手に先回りされちゃう。', '{x}だと王さまはその場のまま。そのすきに攻め手が守りを固められるの。', '{x}は守り手の駒の手で、王は動いてないね。攻め手の受けが追いついちゃう。', '{x}では王さまが進まないの。攻め手に1手あげることになっちゃう。'])
            : kl === 1 ? pk(['{x}だと角への道は1本だけ。攻め手はその道に駒を置けば止められるの。', '{x}のあと、角までまっすぐ通る道は1本きり。1手でふさがれちゃう。', '{x}では道が1本しかできないの。攻め手はそこをふさぐだけでいいね。', '{x}だと見えている道は1本だけ。攻め手にすぐふさがれちゃう。', '{x}のあとの角への道は1本。攻め手の1手で消えちゃうの。'])
            : pk(['{x}のあとは、角までまっすぐ通る道がまだないの。そのあいだに攻め手が先回りできちゃう。', '{x}だと、王から角へまっすぐ行ける道がまだないね。攻め手に守りを固められちゃう。', '{x}では、角まで通る道がひとつもできないの。攻め手の受けが間に合っちゃう。', '{x}のあと、王さまから角までの道はまだふさがったまま。攻め手に先回りされるの。', '{x}だと、角へまっすぐ行ける道がゼロ。攻め手に時間をあげちゃう。']));
          out.push(q2.res === 2 ? pk(['{m}なら、そのまま角に着けたの。', '{m}を選べば、その場で脱出だったね。', 'こっちの{m}なら、一直線に角へゴールだったの。', '{m}だったら、そのまま角まで走れたんだ。', '正解の{m}は、角まで一直線の道。'])
            : kl2 >= 2 ? pk([`{m}なら角への道が${kl2}本できて、攻め手は1手で全部はふさげなかったの。`, `{m}を選べば、角までまっすぐの道が${kl2}本。1本ふさがれても、もう1本から行けたね。`, `こっちの{m}なら道が${kl2}本ひらいて、受けが追いつかなかったの。`, `{m}だったら、角への道が${kl2}本。攻め手は1本しか止められなかったんだ。`, `正解の{m}は、角への道を${kl2}本ひらく手なの。`])
              : pk([`{m}なら、攻め手がどこをふさいでも、残り${left}手のうちに角へ着ける道が残ったの。`, `{m}から進めば、どう受けられても${left}手のうちに逃げ切れたね。`, `こっちの{m}なら、ふさがれるたびに次の道が開いて、${left}手で角に届いたの。`, `{m}を選べば、攻め手のどの受けにも別の道が残っていたんだ。`, `正解の{m}は、どう守られても${left}手のうちに脱出できる進み方なの。`]));
        } else {
          const k0 = kMob(pos), k1 = kMob(q), k2 = kMob(q2);
          out.push(winsNext(q) ? pk(['{x}だと、王さまに角まで逃げられちゃう！', '{x}のあと、王の角への道が開いて脱出されちゃう。', '{x}では、王さまが次の手で角に着いちゃうの。', '{x}だと、王に角まで走られちゃう！', '{x}のすきに、王さまが角へ逃げこめるの。'])
            : k1 ? pk([`{x}のあとも、王さまはまだ${k1}マス動けるの。逃げ道が残っていて、${left}手ではつかまえきれないんだ。`, `{x}だと、王の動けるマスが${k1}つ残るの。${left}手のうちには、かこみが閉じないね。`, `{x}では、王さまがまだ${k1}マス動けるまま。どう追っても${left}手では足りないの。`, `{x}のあと、王には${k1}マスの逃げ場があるの。かこみきる前に逃げられちゃう。`, `{x}だと王さまの行き先が${k1}マス残って、${left}手ではつかまらないの。`])
            : pk([`{x}だと王さまは動けないけど、${left}手のうちにかこみを閉じきれないの。`, `{x}のあと、王は動けなくても、${left}手ではつかまえる形にならないね。`, `{x}では、かこみの最後のすき間が${left}手のうちに閉じないの。`, `{x}だと、王を止めてもつかまえるまでに手が足りないの。`, `{x}のあとは、${left}手ではかこみが完成しないんだ。`]));
          out.push(q2.res === 1 ? pk(['{m}なら、その場で王をつかまえられたの。', '{m}を選べば、そのままかこみが閉じたね。', 'こっちの{m}なら、王さまをすぐ捕獲できたの。', '{m}だったら、その場で攻め手の勝ちだったんだ。', '正解の{m}は、王をつかまえる最後の1枚。'])
            : k2 < k0 ? pk([`{m}なら王の動けるマスが${k0}から${k2}に減って、どう逃げても${left}手のうちにかこめたの。`, `{m}を選べば、王の行き先が${k0}マスから${k2}マスに。そこから${left}手でつかまえられたね。`, `こっちの{m}なら、王の動けるマスを${k2}つにしぼれて、${left}手で捕獲できたの。`, `{m}だったら、王の逃げ場が${k0}から${k2}に減って、かこみが間に合ったんだ。`, `正解の{m}は、王の動けるマスを${k2}つにしぼる手なの。`])
              : pk([`{m}なら、王がどう逃げても、${left}手のうちにかこめたの。`, `{m}を選べば、どこへ逃げられても${left}手でつかまえられたね。`, `こっちの{m}なら、王の逃げた先まで${left}手で押さえられたの。`, `{m}だったら、王がどっちへ行っても、かこみが間に合ったんだ。`, `正解の{m}は、どう逃げられても${left}手でつかまえられる手なの。`]));
        }
        return f(out.join(''));
      };
      return wrap({ ask, hintTx, good: () => f(pk(G)), ng }, pu);
    }
    const pos = E.Pos.from(P.s), ok = P.ok || [P.best], okS = new Set(ok), A = P.best != null && okS.has(P.best) ? P.best : ok[0], FA = tfLF(E, pos, A);
    const FF = u => { try { return tfLF(E, pos, u); } catch (e) { return null; } };
    const wrongs = () => pos.moves().filter(x => !okS.has(x));
    const alt = (u, pref) => { if (u != null && !okS.has(u)) return u; const W = wrongs(); let w = null; if (pref) for (const x of W.slice(0, 160)) { const G = FF(x); if (G && pref(G)) { w = x; break; } } return w != null ? w : W.find(x => E.mFrom(x) === E.mFrom(A)) != null ? W.find(x => E.mFrom(x) === E.mFrom(A)) : W[0]; };
    const say = (u0, pref, why, tail) => { const u = alt(u0, pref), G = u != null ? FF(u) : null; const w = G ? why(G) : ''; return f(w + (w && !/[。！？]$/.test(w) ? '。' : '') + tail); };
    let good, ng;
    if (id === 'b_move') {
      good = () => fg(pk(['{x}で王が端に着いた！ ここからは辺にそって角をねらえるね。', '端まで一直線！ とちゅうに駒がないから、王は止まらずに走れたの。', 'いい走りっぷり！ 端に着いた王は、つぎに角をねらえるから攻め手はたいへん。', '王さま、ちゃんと端までとどいた！ 空いている列をしっかり見つけたの。', 'まっすぐ走って、盤のふちに到着！ ここからは辺にそって角をめざせるの。']));
      const blk = G => { const n = pos.n, dr = Math.sign(Math.floor(G.t / n) - Math.floor(G.f / n)), dc = Math.sign(G.t % n - G.f % n); let r = Math.floor(G.t / n) + dr, c = G.t % n + dc;   // (a piece between the king's stop and the edge)
        for (; r >= 0 && c >= 0 && r < n && c < n; r += dr, c += dc) if (pos.at(r * n + c)) return true; return false; };
      ng = u => say(u, G => G.king && !G.edge, G => !G.king ? pk(['{x}は王じゃない駒を動かしてるの。', '{x}で動いたのは、王さまじゃない駒なんだ。', '{x}は守り手の駒。今回走らせたいのは王さま！', '{x}だと、王さまはその場から動いてないね。', '{x}は王さまじゃない駒の手なの。'])
        : blk(G) ? pk(['{x}の方向だと、とちゅうに駒がいて行き止まり。', '{x}の向きだと、端までのあいだに駒がいるの。', '{x}では、駒がじゃまをして盤のふちまで出られないの。', '{x}だと、駒にぶつかって端まで行けないの。', '{x}の向きは、駒がふさいでいて端に届かないんだ。'])
          : pk(['{x}だと王はとちゅうで止まって、端まで届かないの。', '{x}だと、端まで空いてたのに手前で止まっちゃった。', '{x}では盤のふちまで出られないの。もっと先まで走れたのに！', '{x}だと、王さまはまだ盤の内側にいるまま。', '{x}は走る向きはいいのに、端の手前で止まっちゃったんだ。']),
        pk(['{m}なら、駒のない列を通って端まで行けるから。', '{m}の方向は、端までずっと空いていたね。', '正解の{m}は、さえぎる駒がひとつもない道なの。', '{m}を選べば、ふちまで一気に走れたんだ。', 'こっちの{m}だと、まっすぐ端に着けたの。']));
    } else if (id === 'b_cap' || id === 'b_hostile') {
      const hp = FA.help, ho = id === 'b_hostile' && !!hp, c2 = FA.caps >= 2;
      good = u => { const G = u != null && okS.has(u) ? FF(u) : null, hp = G && G.help || FA.help; return fg(ho ? pk([`{x}で、${hp}とのあいだにはさんで取れた！ ${hp}は相手の駒と同じはたらきなの。`, `${hp}を味方につけたはさみ取り！ 片側に置くだけで取れちゃうのがポイント。`, `{x}で${hp}と自分の駒ではさんで、1つ取ったね。`, `${hp}がもう片側の役をしてくれた！ 1枚だけで取れたの。`, `${hp}のとなりは危ない場所。そこをしっかり突けたね。`])
        : c2 ? pk([`{x}で一度に${FA.caps}つも取れた！ 両側がそろう駒がふたつあったのね。`, `${FA.caps}枚まとめて取れた！ 1手で2方向をはさむ、ぜいたくな手なの。`, `{x}で${FA.caps}つ同時にいただき！ よく見えてたね。`, `一石二鳥！ 動かした先の両どなりで、${FA.caps}つはさめたの。`, `${FA.caps}枚取り！ 縦と横、両方そろう場所だったね。`])
        : (G || FA).kingPair ? pk(['{x}で、王さまと組んではさみ取り！ 王も守り手の仲間なの。', '王さまが反対側の壁になってくれた！ 王もはさむ仲間なんだ。', '{x}で、王さまといっしょにはさんで1枚取り！', '王さまと味方の駒で、ぴったりはさめた！ 王も立派なはさみ役なの。', '王さまを相方にして1枚いただき！ よく見つけたね。'])
        : pk(['{x}で、はさみ取り成功！ 相手の駒が1つ減ったね。', '両側から、ぴったりはさめた！ 取れるのは動かした側だけだから、いまがチャンスだったの。', '{x}で相手の駒をいただき！ 縦か横にきちんとはさめたね。', '片側で待っていた味方と、うまく組めた！ これで1枚取りね。', 'はさんで1枚ゲット！ 相手の駒がへると、王さまも守りにくくなるの。'])); };
      ng = u => say(u, G => !G.caps, G => (G.caps ? pk(['{x}でも取れるけど、取れる数が少ないの。', '{x}は取れても1つだけ。', '{x}でも1つは取れるね。', '{x}も取れる手ではあるの。', '{x}で取れるのは少しだけ。']) : ho ? pk([`{x}だと、${hp}の反対側があいたままで取れないの。`, `{x}では、${hp}とはさむ形にならないね。`, `{x}だと、${hp}の向かい側に駒が来ないの。`, `{x}だと、${hp}を使えていないの。`, `{x}だと、${hp}のとなりの相手が残ったまま。`])
          : pk(['{x}だと、相手の駒の両側がそろわないから取れないの。', '{x}では、はさむ形にならないね。', '{x}だと、片側があいたままなんだ。', '{x}では、反対側に味方がいないから取れないの。', '{x}では、相手の駒が1枚も減らないね。']))
          + (G.scan().c ? pk(['しかも、相手にぎゃくに駒をはさまれちゃう。', 'おまけに、次にきみの駒がはさまれるの。', 'そのうえ、相手に1枚取られちゃう。', 'しかも、次の手で相手にきみの駒をはさまれるの。', 'おまけに、きみの駒がねらわれる形なの。']) : ''),
        ho ? pk([`{m}なら、${hp}と自分の駒ではさめたから。`, `正解の{m}は、${hp}の向かい側に入る手。`, `{m}を選べば、${hp}が片側の役をしてくれたの。`, `こっちの{m}で、${hp}とはさむ形になったんだ。`, `{m}だったら、${hp}を味方にして取れたね。`])
          : pk([`{m}なら、反対側の味方といっしょにはさめたから${c2 ? `（${FA.caps}つ取り）` : ''}。`, '{m}で動かせば、相手の駒が両側からはさまれる形だったの。', '正解の{m}は、味方の向かい側に入る手。', '{m}を選べば、縦か横にきちんとはさめたね。', 'こっちの{m}だったら、取れていたんだ。']));
    } else if (id === 'b_safe') {
      good = () => fg(pk(['{x}なら、どの駒もはさまれない形になった！', 'これで相手は、どの駒もはさめないの。動かした先も安全だね。', '{x}で守りはばっちり！ 両どなりに相手が置けない場所を選べたね。', 'ねらわれていた駒を、うまく助けられた！ 取られる前の一手が大事なの。', '相手のはさみ取り、きれいにかわせた！ 守りも立派な一手ね。']));
      ng = u => say(u, G => G.scan().c > 0, G => G.scan().c ? pk(['{x}だと、相手に駒をはさまれて取られちゃう！', '{x}のあと、相手の次の手で駒を1つ取られちゃう。', '{x}では、ねらわれた駒を守れないの。', '{x}だと、相手がもう1枚置いてはさめちゃう。', '{x}のあと、きみの駒が両側からはさまれるの。'])
        : pk(['{x}でもすぐには取られないけど、守りが少しあまくなるの。', '{x}だと、はさまれやすい形が残るね。', '{x}は、守りの形がうすくなる手なの。', '{x}だと、次にねらわれやすくなっちゃう。', '{x}でも取られはしないけど、いちばん安全じゃないの。']),
        pk(['{m}なら、どの駒もはさまれないから。', '{m}を指せば、相手はどの駒もはさめなかったね。', '正解の{m}は、ねらわれた駒を守る手。', 'こっちの{m}だったら、両どなりをふさがれなかったの。', '{m}を選べば、取られる駒がゼロだったんだ。']));
    } else if (id === 't_shield') {
      const c = FA.caps;
      good = () => fg(pk([`{x}でシールドウォール！ 端の${c}枚をまとめて取れた。`, `列のふたがぴたっと閉まった！ 前がふさがれていたから、${c}枚いっぺんに取れたの。`, 'みごとなまとめ取り！ {x}で端の列がまるごと消えたね。', `端の${c}枚、一気にいただき！ ふたの場所を見ぬけたね。`, `シールドウォール成功！ 前と両はしがそろって、${c}枚が盤から消えたの。`]));
      ng = u => say(u, G => G.caps < c, G => G.caps >= c ? '' : G.caps ? pk([`{x}だと${G.caps}枚しか取れないの。`, `{x}では${G.caps}枚どまり。`, `{x}で取れるのは${G.caps}枚だけ。`, `{x}だと、まとめ取りにならず${G.caps}枚だけ。`, `{x}では、取れても${G.caps}枚なの。`])
        : pk(['{x}だと列のふたが閉じないから、まとめて取れないの。', '{x}では、列のはしがあいたままなんだ。', '{x}だと、端の列はそのまま残っちゃう。', '{x}は、ふたの場所からずれてるの。', '{x}のあとも、列のはしにすき間が残るね。']),
        pk([`{m}なら、列の両はしがふさがって${c}枚いっぺんに取れたから。`, '正解の{m}が、列の最後のふた。', `{m}を選べば、${c}枚まとめて取れたの。`, 'こっちの{m}で、列のはしが閉じたんだ。', '{m}だったら、シールドウォールが完成していたね。']));
    } else if (id === 't_tuichi' || id === 'v_tablut') {
      const r = FA.routes, goal = id === 'v_tablut' ? '端' : '角';
      good = () => fg(FA.win ? pk([`王がそのまま${goal}へ！ 脱出成功だね。`, `一直線に${goal}までゴール！`, `{x}で王さまが${goal}に着いた、脱出！`, `${goal}まで走りきった！ 守り手の勝ちなの。`, `そのまま${goal}へ、みごとな脱出！`])
        : pk([`{x}でトゥイチ！ ${goal}への道が${r}本できたから、攻め手は両方はふさげないの。`, `いい場所！ 王から${goal}へまっすぐ行ける道が${r}本。1手じゃ止められないね。`, `{x}で逃げ道が${r}本！ 次の手で${goal}に出られるの。`, `道が${r}本ひらいた！ 攻め手がどっちをふさいでも、もう片方から行けるね。`, `王さま、いい位置についた！ ${goal}への見通しが${r}方向もあるの。`]));
      ng = u => say(u, G => G.king && !G.win && G.routes < 2, G => G.win ? '' : G.scan().w ? pk(['{x}だと、王が攻め手にはさまれちゃう！', '{x}のあと、王さまがつかまっちゃう。', '{x}だと、王が攻め手につかまる場所なの。', '{x}では、王さまが危ないマスに入っちゃう。', '{x}のあと、攻め手が王をはさめるの。'])
        : G.routes === 1 ? pk([`{x}だと${goal}への道は1本だけ。攻め手にすぐふさがれちゃう。`, '{x}では道が1本しかできないの。1手でふさがれるね。', '{x}だと見通せるのは1方向だけ。それだとライチどまり。', `{x}の場所からは、${goal}への道が1本きり。`, '{x}だと、攻め手はその1本をふさぐだけでいいの。'])
        : !G.king ? pk(['{x}は王じゃない駒を動かしてるの。', '{x}で動いたのは王さまじゃないね。', '{x}は守り手の駒。動かしたいのは王さま！', '{x}だと、王さまはその場のまま。', '{x}では王さまの道が増えないの。'])
        : pk([`{x}だと、王から${goal}へまっすぐ通る道がないの。`, `{x}の場所からは、${goal}まで見通せないね。`, `{x}だと、${goal}への道がひとつもできないの。`, `{x}では、王さまの前に駒が立ちふさがってるね。`, `{x}だと、王から${goal}までのあいだに駒がいるの。`]),
        FA.win ? pk([`{m}なら、そのまま${goal}へ着けたから。`, `正解の{m}は、${goal}まで一直線の道。`, `{m}を選べば、その場で脱出できたの。`, `こっちの{m}だったら、${goal}まで止まらずに行けたね。`, `{m}だと、そのまま勝ちだったんだ。`])
          : pk([`{m}なら道が${r}本できて、攻め手は1手じゃふさぎきれないから。`, `正解の{m}は、${goal}への道を${r}本ひらく場所。`, '{m}を選べば、攻め手は1本しか止められなかったの。', 'こっちの{m}だったら、トゥイチになっていたね。', `{m}だと、${r}方向に道が通っていたんだ。`]));
    } else if (id === 't_block') {
      good = () => fg(pk(['{x}で逃げ道がふさがった！ 次に王が動いても、道を2本は作れないの。', 'ナイスブロック！ 王の道に駒を入れたうえに、トゥイチの心配もない形だね。', '{x}で王の走る道がとぎれた！ これで2手のうちには逃げられないの。', 'ぴったりの場所でふさげた！ 王の次の一手まで、ちゃんと見えてたね。', '道をふさいで、しかもトゥイチもさせない。攻め手のお手本の受けなの。']));
      ng = u => say(u, G => G.scan().w || G.scan().tu, G => G.scan().w ? pk(['{x}だと、王にそのまま角まで逃げられちゃう！', '{x}では道がふさがらなくて、王が角に着いちゃう。', '{x}のあと、王さまはそのまま脱出なの。', '{x}だと、ひらいた道がそのまま残るの。', '{x}では、王の通り道に駒が入らないね。'])
        : G.scan().tu ? pk(['{x}だと1本はふさげても、次に王が2本の逃げ道を作れちゃう。', '{x}のあと、王が動いてトゥイチを作れるの。', '{x}では、王の次の一手で道が2本ひらいちゃう。', '{x}だと、ふさいだ先で別の2本が生まれるね。', '{x}のあと、王さまに2方向をねらわれちゃう。'])
        : pk(['{x}だと、王に2手で逃げ切られちゃう。', '{x}では、2手のうちに王が角へ着いちゃうの。', '{x}だと、王さまの逃げ道がまだ残るね。', '{x}のあと、王は2手で脱出できるの。', '{x}では止めきれないんだ。']),
        pk(['{m}なら、王の道がしっかり止まるから。', '{m}で道をふさげば、王はトゥイチも作れなかったの。', '正解の{m}は、道を止めて先の2本も消す手。', 'こっちの{m}だったら、2手のうちに逃げられなかったね。', '{m}を選べば、王の行き先がちゃんと減ったんだ。']));
    } else if (id === 't_fort') {
      good = () => fg(FA.win === 'fort' ? pk(['{x}で砦の完成！ もう攻め手は壁をこわせないから、守り手の勝ち。', 'エッジフォートのできあがり！ 王は砦の中で動けて、壁の駒もはさまれないの。', '{x}で穴がふさがった！ こわせない砦で、守り手の勝ちだね。', '最後の1枚がぴたり！ 攻め手はもう砦に手が出せないの。', '王さまのお城、完成！ 壁のどの駒もはさめない形ね。']) : pk(['{x}で守り手の勝ち！ 王の守りは完ぺきだね。', '{x}で勝負あり！', '守り手の勝ち！', 'みごとに勝ちを決めたね！', 'これで守り手の勝ち！']));
      ng = u => say(u, null, G => G.scan().c ? pk(['{x}だと壁の駒がはさまれて、砦がくずれちゃう。', '{x}のあと、壁の駒を攻め手に取られるの。', '{x}では、壁にはさまれる駒が残っちゃう。', '{x}だと、攻め手に壁をこわされちゃう。', '{x}のあと、壁の1枚がねらわれるの。'])
        : pk(['{x}だと壁に穴が残って、攻め手に入りこまれちゃう。', '{x}では、砦の入口があいたままなの。', '{x}だと、まだ砦が完成しないね。', '{x}だと、壁のすき間がそのまま残るの。', '{x}では、穴をふさげないんだ。']),
        pk(['{m}なら、穴がぴったりふさがるの。', '{m}で最後の1枚を入れれば、砦が完成したから。', '正解の{m}が、壁の最後のピース。', 'こっちの{m}だったら、こわせない砦になったね。', '{m}を選べば、その場で守り手の勝ちだったの。']));
    } else if (id === 't_encircle') {
      good = () => fg(FA.win === 'encircle' ? pk(['{x}で包囲の完成！ 守り手はどの駒も端へ出られないから、攻め手の勝ち。', '輪がぴったり閉じた！ ななめのつながりでも、ちゃんと閉じているの。', '{x}ですき間がなくなった！ 守り手をまるごとかこんで、攻め手の勝ちだね。', '最後のすき間を閉じた！ 守り手はもう外へ出られないの。', '大きな輪の完成！ 守り手をまるごと閉じこめたね。']) : pk(['{x}で攻め手の勝ち！ みごとな包囲だね。', '{x}で勝負あり！', '攻め手の勝ち！', 'みごとに勝ちを決めたね！', 'これで攻め手の勝ち！']));
      ng = u => say(u, null, G => G.scan().c ? pk(['{x}だと輪の駒がはさまれて、穴があいちゃう。', '{x}のあと、輪の駒を守り手に取られるの。', '{x}では、輪の1枚がはさまれちゃう。', '{x}だと、守り手に輪をこわされちゃう。', '{x}のあと、輪の駒がねらわれるの。'])
        : pk(['{x}だと輪にすき間が残って、守り手が外へ出られちゃう。', '{x}では、輪の出口があいたままなの。', '{x}だと、まだ包囲が完成しないね。', '{x}のあとも、守り手のぬけ道が残るの。', '{x}では、すき間を閉じられないんだ。']),
        pk(['{m}なら、さいごのすき間が閉じるから。', '{m}で閉じれば、守り手の出口はひとつもなかったの。', '正解の{m}が、輪の最後のひとつ。', 'こっちの{m}だったら、包囲が完成していたね。', '{m}を選べば、その場で攻め手の勝ちだったの。']));
    } else if (id === 'v_brandubh') {
      good = () => fg(FA.win ? (FA.kingNearCorner ? pk(['{x}で、角と攻め手で王をはさんだ！ 角も攻め手の味方なの。', '角を味方にして王さまを捕獲！', '{x}で角との間にはさんで、攻め手の勝ち！', '角のとなりの王を、1枚でつかまえたね！', '角が片側の役！ 王さまをつかまえたの。'])
        : pk(['{x}で王さまをはさんだ！ 攻め手の勝ち！', '2枚でぴたっとつかまえた！ 小さな盤のブランドゥブならではだね。', '{x}で勝負あり！ 王の向かい側に、ちゃんと駒を置けたね。', '王さまを両側からはさんで捕獲！', '向かい側にぴたり！ 王さま、つかまえたの。'])) : pk(['{x}で王を追いつめた！', '王さまをしっかり追いつめたね！', 'いい追いこみ！', '王の逃げ道をせばめたね！', 'じわっと追いつめた！']));
      ng = u => say(u, G => !G.win, G => pk(['{x}だと王の反対側があいたままで、つかまえられないの。', '{x}では、王を2枚ではさむ形にならないね。', '{x}だと、王の向かい側に駒が来ないの。', '{x}だと、王さまは自由なまま。', '{x}では、王をはさむもう1枚が足りないんだ。'])
          + (G.scan().w ? pk(['しかも王に逃げられちゃう！', 'そのうえ、王さまが角へ逃げちゃう。', 'おまけに王が脱出しちゃうの。', 'しかも王に逃げ切られるね。', 'そのうえ王に走られちゃう！']) : ''),
        pk(['{m}なら、王を2枚ではさめたから。', '{m}で向かい側に置けば、王はもう逃げられなかったの。', '正解の{m}は、王の向かい側に入る手。', 'こっちの{m}だったら、その場で王をつかまえられたね。', '{m}を選べば、攻め手の勝ちだったんだ。']));
    }
    return wrap({ ask, hintTx, good, ng }, pu);
  }
  const TAFL = {
    LKEY: 'aicoding-tafl-lessons', OKEY: 'aicoding-tafl-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../tafl/lessons.json?v=6'), fetch('../tafl/i18n.js?v=6ek-nd1-bm2').then(r => r.text()).catch(() => ''), tfEng().catch(() => null), getJ('../tafl/openings.json?v=20261124o2').catch(() => null)])
        .then(([ls, T, _, op]) => { const w = {}; try { new Function('window', T)(w); } catch (e) { console.warn('[lessons3d] tafl texts', e); } this.I = w.I18N || {}; this.data = { ls, op }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    mini: sp => window.AtlasMini && AtlasMini.tafl ? AtlasMini.tafl(sp) : '',
    list(kind, lang) {
      if (kind === 'open') { const pr = J(this.OKEY, {}), O = this.data.op; return O ? O.sets.map(g => ({ key: g.id, cat: g.grp, catName: this.tx('op.grp.' + g.grp, lang), title: L(g.title, lang), sub: '',
        svg: g.problems && g.problems[0] ? this.mini(g.problems[0].s) : '', st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '', full: false })) : []; }
      const pr = J(this.LKEY, {});
      return this.data.ls.steps.map((s, i) => ({ key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang), svg: s.problems && s.problems[0] ? this.mini(s.problems[0].s) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }));
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), E = window.TaflEngine;
      const intro = String(T('intro') || '').replace(/<p>[^<]*?[a-k](?:1[01]|[1-9])-[a-k](?:1[01]|[1-9])[^]*?<\/p>/g, '');
      const sp = { m: TFM('ok', lang), x: TFM('ng', lang) };
      const RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: s.id, title: T('title'), intro: lang === 'ja' && TFJ_LS.intro[s.id] || intro, ramp: s.ramp && s.ramp.length ? s.ramp.slice() : null, RU,   // (the warm-up: tafl/lessons.json step.ramp — texts without coordinates from atlas/nocoord/tafl.json)
        probs: (s.problems || []).map(P => { const me = P.s.side === 2 ? 2 : 1, good = P.ok || [P.best], seq = (P.n || 1) > 1;
          return { pos: { spec: P.s, me }, kind: seq ? 'tfseq' : 'best', P, n: P.n || 1, me, ask: T('goal', { n: P.n || 1 }), ans: seq ? null : P.best != null ? P.best : good[0], hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            why: '', good: () => T('why', sp), ng: () => T(seq ? 'ng' : 'why', Object.assign({ n: P.n || 1 }, sp)) }; }).map((o, i) => { if (lang === 'ja' && E) try { Object.assign(o, tfLsJa(E, s, o.P, i, k => TFM(k, lang), +key) || {}); } catch (e) { console.warn('[lessons3d] tafl lesson', e); } return o; }),   // (2026-11-21 lesson loop: タフリン's question, hint, why / what yours misses)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, m) {   // (= tafl/app.js problemPoints)
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      if (!P.sc) return m === P.best ? 20 : 0;
      const WIN = 30000, WINT = 29000, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : Math.tanh(v / 450) * 0.85;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
      if (mine >= best - 15 && !(best > WINT && mine < best)) return 20;
      if (best > WINT && mine > WINT) return 16;
      if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0;
      if (mine < -WINT && best >= -WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5)));
    },
    spOk: lang => TFM('ok', lang),
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), it = s && s.ramp && s.ramp[0]; if (it) return { pos: { spec: it.s, me: it.s.side === 2 ? 2 : 1, lock: true } }; const P = s && s.problems && s.problems[0]; return P ? { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1, lock: true } } : null; },
    // the warm-up (= tafl/app.js loadRamp / rampMarks): the example move played out, the marked squares, the right moves
    rampPos: it => ({ spec: it.s, me: it.s.side === 2 ? 2 : 1 }), rampBody: (it, lang) => L(it.body, lang),
    rampMarks: it => (it.marks || []).map(([q, c]) => [q, c === 'ng' ? 'ng' : c === 'ok' ? 'ok' : 'hl']),
    rampOk: (it, u) => (it.ok || []).includes(u), rampAns: it => ({ m: (it.ok || [])[0] }), rampLook: it => (it.look || []).map(q => [q, 'ring']),
    rampSeq(it) { const E = window.TaflEngine; if (!E) return []; let p = E.Pos.from(it.s, it.s.v); const out = []; for (const [nm] of it.seq || []) { const m = p.moves().find(x => E.name(p, x) === nm); if (m === undefined) break; out.push(m); p = p.clone().play(m); } return out; },
    // the openings (tafl/openings.json: 8 plans of the Copenhagen rules — the line to study, then 5 positions where the engine's move is the
    // answer, scored as the lessons; progress = the full game's 'aicoding-tafl-open' { id: { best, pass } })
    opening(key, lang) {
      const g = this.data.op && this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const notes = {}; (g.study.notes || []).forEach((n, i) => { if (n) notes[String(i)] = L(n, lang); });
      const it = g.intro && (g.intro[lang] || g.intro.en), hist = Array.isArray(it) ? it[0] : it || '';
      const probs = shuffle((g.problems || []).map((p, i) => i)).slice(0, 5).sort((a, b) => a - b).map(i => g.problems[i]), E = window.TaflEngine, ja = lang === 'ja' && E;   // (2026-11-24 第2期: the pool's easy → hard order kept)
      const start = { v: 'copenhagen', b: E && E.START && E.START.copenhagen ? E.START.copenhagen : null, side: 1 };
      const TV = ja ? tfOpVoice(g.id) : null; let nj = null; if (ja) try { nj = tfNotesJa(E, g, notes, start, TV); } catch (e) { console.warn('[lessons3d] tafl notes', e); }
      return { id: g.id, title: L(g.title, lang), intro: ja && TFJ_OP.intro[g.id] ? TFJ_OP.intro[g.id] : hist, start: { spec: start, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes: nj || notes,
        probs: probs.map((P, i) => { const o = { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: E ? [E.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: TFM('ok', lang) }) };
          if (ja) try { Object.assign(o, tfOpJaV(E, P, L(g.title, 'ja'), k => TFM(k, lang), TV, i)); } catch (e) { console.warn('[lessons3d] tafl opening', e); }
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
  };
  /* mancala (2026-11-16): mancala/lessons.json (29 steps of 5 problems, by rule set and course = the full game's LS_RULESETS): one move,
     scored by the stored values P.sc (= mancala/app.js problemPoints); after the move, back to the problem with the answer (gold ring),
     your move (red) and every pit's value. Progress = the full game's ('aicoding-mancala-v1-lessons' { id: { best, clear } }). Texts:
     mancala/i18n.js + i18n-learn.js (a sandbox); a pit is named by its ring (the 3D board has no pit numbers). The warm-ups stay in the
     full game. */
  const MC_SETS = { kalah: { basic: ['sow', 'extra', 'capture'], tactics: ['defend', 'chain', 'endgame'], kOpen: ['k_open', 'k_open6', 'k_tempo'], kMid: ['k_combo', 'k_hoard', 'k_starve', 'k_count'] },
    basic: { nOpen: ['n_open', 'n_chain'], nCap: ['n_cap', 'n_defend'], nEnd: ['n_play', 'n_end'] }, easy: { eOpen: ['e_open', 'e_chain'], eMid: ['e_block', 'e_keep', 'e_end'] },
    sunka: { sRelay: ['s_relay', 's_chain', 's_cap'], sEnd: ['s_defend', 's_end'] } };
  const MCM = (k, lang) => lang === 'ja' ? (k === 'ok' ? '（金の丸）' : '（赤い丸）') : `<i class="ls-spot ${k}"></i>`;
  const mcFmt = (v, exact) => { const r = exact ? Math.round(v) : Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); };
  /* (2026-11-21 lesson loop) mancala in Japanese: マンカラビ's own intro / questions / hints (no pit numbers: the 3D board has none,
     a pit is named by its distance to the store or its ring), and the feedback from the position itself — mcF: where the last seed
     lands (the store: one more turn, and the whole turn's gain; an empty pit of yours: the capture), the seeds sown to the
     opponent's row, what the opponent can take next (a capture / a chain of extra turns), the threats it removes, the end of the
     game. Right → the reason; wrong → the gold-ringed pit, what yours misses, and the AI's value gap. */
  const MC_ENG = '../mancala/engine.js?v=20261114p1';   // (= atlas/games/mancala.js: the same file and version, one cache)
  const mcEng = () => window.MancalaEngine ? Promise.resolve(window.MancalaEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = MC_ENG; sc.onload = () => window.MancalaEngine ? res(window.MancalaEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const MCJ_GRP = { sow: 'sow', extra: 'extra', chain: 'extra', n_chain: 'extra', e_chain: 'extra', s_chain: 'extra', s_relay: 'extra', capture: 'cap', k_combo: 'cap', n_cap: 'cap', s_cap: 'cap',
    defend: 'def', n_defend: 'def', s_defend: 'def', e_block: 'blk', k_open: 'open', k_open6: 'open', n_open: 'open', e_open: 'open', endgame: 'end', k_count: 'end', n_end: 'end', e_end: 'end', s_end: 'end',
    k_tempo: 'keep', k_hoard: 'keep', k_starve: 'keep', e_keep: 'keep', n_play: 'play' };
  const MCJ_LS = {
    intro: {
      sow: '穴の種を全部つかんで、<b>反時計回り</b>に1粒ずつまくの。<br>相手のストアはとばして、<b>種の数だけ先へ</b>！',
      extra: 'さいごの1粒が<b>きみのストア</b>に入ったら、もう一回きみの番！<br>ストアのとなりの穴なら1粒、2つ目なら2粒……<b>種の数＝ストアまでの距離</b>の穴をさがそう。種も手番も得する、いちばん大事な手なんだ〜。',
      capture: 'さいごの1粒が<b>きみの側の空っぽの穴</b>に止まったら、向かいの相手の種を<b>まとめて横取り</b>！ 止まった1粒もいっしょにストアへ入るの。<br>相手の大きな山の向かいが空いていたら、チャンスだね。',
      defend: '相手の番に<b>きみの山が横取りされない</b>か、いつも確かめよう。<br>守り方は3つ。ねらわれた山を動かす、相手が止まる空の穴をうめる、相手の穴に種を足して止まる場所をずらす。どれが使えるかな？',
      chain: '「もう一回」を<b>何度もつなげる</b>と、大きく得するんだ〜。<br>コツは<b>ストアに近い穴から</b>使うこと。遠い穴を先にまくと、近い穴の種が1粒ふえて、ぴったりがくずれちゃうの。',
      endgame: '終盤は<b>数えれば読み切れる</b>！ 全部の種の半分より多くストアに入れたら、勝ちが決まるの。<br>どちらかの列が空になると、残りの種はその列の持ち主のもの。自分の列に<b>ためておく</b>のも作戦だね。',
      k_open: '4粒カラハの初手は、<b>ストアから4つ目の穴</b>が定石。4粒でぴったりストアに届いて、もう一回！<br>序盤の基本は、もう一回を取る、相手にぴったりの穴を作らせない、種を相手にわたしすぎない、の3つだね。',
      k_open6: '6粒カラハでは、<b>ストアからいちばん遠い穴</b>の6粒がちょうどストアに届くの。まずはそこでもう一回！<br>種が多いぶん、1手で盤が大きく動くんだ。相手にぴったりの穴を作らせない形をえらぼうね。',
      k_combo: 'もう一回で指し続けるあいだに、<b>きみの側に空の穴</b>を作っておくと……さいごの1粒をそこへ止めて<b>横取り</b>でしめくくれる！<br>順番しだいで取れる山が変わるから、さいごまで読んでから始めようね。',
      k_tempo: '大きく動くのがいいとは限らないの。<b>きみの側の中だけで終わる</b>少ない種を動かすと、種はわたさず手番だけわたせるんだ。<br>相手が先に形をくずしてくれるのを<b>待つ</b>のも、強い手だね。',
      k_hoard: 'ストアのとなりの穴には相手の種がよく流れこんで、<b>大きな山</b>になりやすいの。<br>この山は、おしまいまで持っていれば<b>きみの得点</b>！ あわててまくと、大半が相手の側へ流れちゃう。',
      k_starve: 'どちらかの側の種がなくなると<b>対局はおしまい</b>。残った種は、それぞれの列の持ち主のものになるの。<br>きみの側に種が多くて相手が少ないなら、<b>相手に種をわたさない</b>手を続けよう！',
      k_count: '終盤は<b>数え合い</b>！ 4粒なら全部で48粒だから、<b>25粒</b>取れば勝ち。<br>片側が空になった瞬間におしまいだから、どっちが先に空になるか、そのとき誰の側に何粒残るかを読むのがコツなんだ。',
      n_cap: 'ノーマルルールの横取りでは、<b>止まったきみの1粒は穴に残る</b>の。カラハより1粒少なめだね。<br>残った1粒はまた使えるけど、相手から見ると<b>横取りの的</b>にもなるんだ。取ったあとの形まで考えよう！',
      n_defend: '相手の次の手で<b>横取りされる山</b>はないかな？ 守り方は、山を動かす・止まる穴をうめる・相手の数をずらす、の3つ。<br>ノーマルでは取られても相手の1粒が穴に残るから、取り返しのねらいが生まれることもあるんだ〜。',
      n_play: 'もう一回・横取り・守り・手番・残り種。ここまでの考え方を全部使う実戦問題！<br>迷ったら、<b>きみの得</b>と、そのあとの<b>相手の得</b>を両方数えて比べてみてね。',
      e_chain: 'イージールールには横取りがないから、<b>もう一回</b>がいちばんの武器！<br>ストアに近い穴から順に使うと、何度も続けられるんだ。でも種を出しきると相手の側に種がたまるから、おしまいの残りも考えてね。',
      e_keep: '横取りのないイージーでは、<b>きみの側にある種</b>は、さいごにはきみのものになりやすい財産なの。<br>相手の側へ種を流す大きな手より、<b>きみの側の中で回す手</b>が強い場面がたくさんあるんだ〜。',
      e_end: '終盤は、<b>どちらの側が先に空になるか</b>の競争！ きみの側が空になると、相手の側の残りは全部相手のものになるの。<br>もう一回で手番を重ねるのと、相手に種をわたさないのを組み合わせて、数えきろうね。',
      s_relay: 'スンカでは、さいごの1粒が<b>種の入った穴</b>に落ちると、その穴の種を全部つかんで<b>まき直し</b>！ これがリレー。<br>止まるのは空の穴かストアに落ちたときだけ。リレーが<b>ストアで止まれば、もう一回</b>だね。',
      s_cap: 'リレーが<b>きみの側の空の穴</b>で止まると、向かいの山を止まった1粒ごと<b>横取り</b>できるの。カラハと同じだね。<br>リレーのあいだに相手の山が育つこともあるんだ。止まる穴と、そのときの向かいの数を読もう！',
      s_end: '種が少なくなるとリレーも短くなって、読み切れるようになるの。<br>もう一回・横取り・おしまいのときの残り種を全部数えて、いちばん差がつく手をえらぼうね！',
      n_open: 'ノーマルでも初手は<b>ストアから4つ目の穴</b>。4粒でぴったり届いて、もう一回！<br>ノーマルの横取りはカラハより1粒少なめ。だから序盤は<b>もう一回の数</b>と、相手にぴったりの穴を作らせないことがもっと大事なんだ〜。',
      e_open: 'イージーでも初手は<b>ストアから4つ目の穴</b>でもう一回、続けて<b>ストアのとなりの穴</b>が深い読みでの最善なの。<br>横取りがないから、序盤の差はほとんど<b>もう一回の数</b>と<b>種のわたし方</b>で決まるんだ。',
      n_chain: 'ストアにぴったり届く穴をまくと<b>もう一回</b>。<b>ストアに近い穴から</b>順に使うと、ぴったりがくずれずに長く続くの。<br>遠い穴を先にまくと、近い穴の数が1つふえちゃうこともあるんだ。連続手は順番が勝負だね！',
      n_end: 'ノーマルの終盤も<b>数え合い</b>。25粒取れば勝ち！<br>横取りしても止まった1粒は穴に残るから、<b>その1粒がおしまいのときどちらの側に残るか</b>まで数えようね。',
      e_block: '横取りのないイージーでは、相手の<b>もう一回</b>がいちばんの脅威なの。<br>相手の穴に種を1粒落とすと、ぴったりの数が<b>ずれて</b>、もう一回が消えるんだ！ どの相手の穴に種が入るか数えてみてね。',
      s_defend: 'スンカではリレーのせいで、<b>思わぬ山が横取りされる</b>ことがあるの。<br>相手の穴からのリレーを追って、止まる空の穴と向かいの山を確かめよう。守り方は、山を動かす・止まる穴をうめる・相手の数をずらす、だね！',
      s_chain: 'スンカでもストアで止まれば<b>もう一回</b>！ リレーで種がまき直されるから、もう一回のあとに<b>次のぴったりの穴</b>が生まれることがよくあるんだ。<br>何度も続けて指す手順を、さいごまで読みきろうね。',
    },
    ask: {
      sow: ['金の点線の穴に、さいごの1粒をぴたっと止めてみて！', '目標まで、ちょうど届く穴はどれかな？', 'さあ、種の数と距離をくらべよう。どの穴をまく？', 'さいごの1粒、金の点線まで運べるかな？', 'もう一回！ ぴったり止まる穴をえらんでね。'],
      extra: ['もう一回のチャンス！ どの穴をまく？', 'ストアにぴったり届く穴、見つけられるかな？', '「もう一回」をいちばん長くつなげる、さいしょの一手は？', 'さあ、種の数とストアまでの距離をくらべて！', '続けて打てる手順、どこから始めようか？'],
      cap: ['横取りのチャンス！ どの穴をまく？', 'さいごの1粒を、空の穴に止められるかな？', '相手の山、どこから取ろうか？', 'いちばんたくさん取れる手はどれかな？', 'さあ、向かいの山をごっそりいただこう！'],
      def: ['相手の横取りのねらい、かわせるかな？', 'このままだと山を取られちゃう！ どうする？', '相手の次の手を読んで、いちばんいい守りをえらんでね。', 'ねらわれた山、どうやって守ろうか？', 'さあ、相手の止まる穴を考えて！'],
      blk: ['相手のもう一回、消せるかな？', '相手のぴったりの穴に、種を落とす手はどれ？', 'このままだと相手に続けて打たれちゃう！ どうする？', '相手の穴の数をずらせる手、どこかな？', 'さあ、相手の「もう一回」をじゃましよう！'],
      open: ['序盤のいちばんいい手はどれかな？', 'まずは、もう一回が取れる？', '序盤の組み立て、どの穴から始める？', '相手にぴったりの穴をあげない手、わかるかな？', 'さあ、定石どおりに指せるかな？'],
      end: ['終盤！ さいごの差がいちばん大きくなる手はどれかな？', 'ここは数えれば読みきれる！ どの穴をまく？', '勝ちまであと何粒？ いちばん得する手をえらんでね。', 'おしまいまで数えて、最善の一手を！', 'さあ、数え合いの勝負！ どの穴かな？'],
      keep: ['あわてずに考えよう。いちばんいい手はどれかな？', '大きく動く手が、いつもいいとは限らないの。どうする？', '種を相手にわたしすぎない手、見つけられるかな？', 'さあ、きみの側の種をどう使う？', '先の形まで見て、一手をえらんでね！'],
      play: ['実戦の局面！ いちばんいい手はどれかな？', 'きみの得と相手の得、くらべてみて！', 'さあ、ここまでの考え方を全部使おう！', '迷ったら相手の次の手まで数えてね。どの穴？', '最善手、見つけられるかな？'],
    },
    hint: {
      sow: ['目標までの穴の数を数えてみて。きみのストアも1つと数えるの。', '種の数が、目標までの距離と同じ穴をさがそう！'],
      extra: ['ストアのとなりは1粒、2つ目は2粒……種の数と距離が同じ穴はどれかな？', '候補がいくつかあるなら、ストアに近い穴から使うのがコツ！'],
      capture: ['赤い丸は、向かいが空いている相手の種。そこへさいごの1粒を止められる穴は？', '空の穴までの距離と、同じ数の種が入った穴をさがしてね。'],
      defend: ['赤い丸が、相手の次の手で取られちゃうきみの種。', '相手の種が止まる空の穴はどこ？ その向かいの山があぶないの。'],
      chain: ['ストアに近い穴から順に、ぴったりの数の穴をさがしてね。', '遠い穴を先にまくと、近い穴の数が変わっちゃう！'],
      endgame: ['それぞれの手のあと、相手がどう返すかまで数えてみて。', 'きみの列に残った種は、さいごにきみのものになるの。'],
      k_open: ['まずストアにぴったり届く穴をさがして！', 'もう一回のあとは、相手に「もう一回」をあげない手をね。'],
      k_open6: ['6粒なら、ストアからいちばん遠い穴がぴったりの数！', '相手の穴に1粒足すと、相手のぴったりがずれることもあるの。'],
      k_combo: ['もう一回で穴を空けると、そこが横取りの着地点になるの。', '赤い丸は取れそうな相手の山。どの順番なら届くかな？'],
      k_tempo: ['相手の側に種が入らない手をさがしてみて。', 'きみの側の中だけで終わる、少ない種の穴はどれかな？'],
      k_hoard: ['ストアのとなりの山をまくと、何粒が相手の側へ行くか数えてみて。', '大きな山は、持っているだけで得点になることもあるの。'],
      k_starve: ['相手の側に種を落とさない手はどれかな？', '相手に種をわたすと、相手を助けることになっちゃう。'],
      k_count: ['もう一回・横取り・おしまいの残り種を、全部足してくらべよう。', 'あと何粒で半分をこえるか、まず数えてみてね。'],
      n_cap: ['きみの側の空の穴に、さいごの1粒が止まる手をさがそう。', '赤い丸は、取れそうな相手の山。止まった1粒が残るのも忘れずに！'],
      n_defend: ['赤い丸が、相手の次の手で取られちゃうきみの山。', '山を動かすか、相手の止まる穴をうめるか。どっちが得かな？'],
      n_play: ['きみの得と、そのあと相手が取れる量の差でくらべよう。', '相手にもう一回や横取りを残していないかな？'],
      e_chain: ['ストアにぴったり届く穴を、ストアに近い順にさがそう。', 'もう一回のあと、次のぴったりができるかも見てね。'],
      e_keep: ['まいた種のうち、何粒が相手の側へ行くか数えてみて。', 'きみの側の中で回せる手はどれかな？'],
      e_end: ['おしまいまでの手順を、もう一回もふくめて数えよう。', 'どちらの側が先に空になるかがカギ！'],
      s_relay: ['リレーの行き先を、1回ずつ追いかけてみて。', '種の入った穴に落ちたらまき直し。どこで止まるかな？'],
      s_cap: ['赤い丸は、今取れそうな相手の山。リレーのあとは数が変わるの。', 'リレーが空の穴で止まる手をさがそう！'],
      s_end: ['リレーの止まる場所を1手ずつ追って、おしまいまで数えよう。', 'おしまいのとき、どちらの列に種が残るかな？'],
      n_open: ['ストアにぴったり届く穴がいちばん大事！', 'なければ、相手にもう一回をあげない手をね。'],
      e_open: ['ストアにぴったり届く穴が最優先！', '次に、相手にもう一回をあげない手をさがしてね。'],
      n_chain: ['それぞれの穴の数と、ストアまでの距離をくらべてみて。', 'ストアに近い穴から順に使うのがコツ！'],
      n_end: ['もう一回・横取り・おしまいの残り種を全部足そう。', '横取りで残る1粒が、どちらの側に残るかも数えてね。'],
      e_block: ['赤い丸は、今ストアにぴったり届く相手の穴。そこに種を落とそう！', 'きみの種が、相手のどの穴まで届くか数えてみて。'],
      s_defend: ['赤い丸が、相手の次の手で取られちゃうきみの山。', '相手の穴からのリレーを追って、止まる場所をさがそう。'],
      s_chain: ['ストアで止まる手をさがして、そのあとの形も追いかけよう。', 'リレーのあと、次のぴったりができる手はどれかな？'],
    },
  };
  function mcF(E, b, k, R) {   // what a lesson move does (side 0 to move; pits 0-5, store 6)
    const tr = E.trace(Int8Array.from(b), 0, k, R), a = tr.board, Rl = E.RULES[R] || E.RULES.kalah;
    const tm = E.turnMaxFirst(Int8Array.from(b), 0, R)[k];
    const toOpp = Rl.relay ? Math.max(0, E.sideSum(a, 1) - E.sideSum(b, 1)) : tr.events.filter(e => e.t === 'drop' && e.at >= 7 && e.at <= 12).length;
    let q = a; if (tr.extra && !tr.over) { const t = E.turnMax(Int8Array.from(a), 0, R); q = Int8Array.from(a); for (const x of (t.lines[0] || [])) { const r = E.trace(q, 0, x, R); q = r.board; if (r.over) break; } }   // (after the turn's best run of extra turns)
    const oppAt = c => { let best = 0, cap = 0, ex = 0, how = ''; if (E.sideSum(c, 0) && E.sideSum(c, 1)) { const g = E.turnMaxFirst(Int8Array.from(c), 1, R); for (let j = 0; j < 6; j++) { if (g[j] == null) continue; best = Math.max(best, g[j]); const r = E.trace(Int8Array.from(c), 1, j, R); if (r.cap) cap = Math.max(cap, r.cap); if (r.extra && !r.over) ex++; }
        const t = E.turnMax(Int8Array.from(c), 1, R), ln = t.lines[0] || []; let z = Int8Array.from(c), cp = false; for (const x of ln) { const r = E.trace(z, 1, x, R); z = r.board; if (r.cap) cp = true; } how = ln.length > 1 ? (cp ? 'both' : 'extra') : cp ? 'cap' : ''; }   // (the opponent's best turn: a capture, a run of extra turns, or both)
      return { best, cap, ex, how }; };
    const o0 = oppAt(b), o1 = oppAt(q), over = E.sideSum(q, 0) === 0 || E.sideSum(q, 1) === 0;
    const n = b[k], d = 6 - k;
    return { k, n, d, land: tr.land, extra: tr.extra && !tr.over, relays: tr.relays, cap: tr.cap || 0, gain: a[6] - b[6], turn: tm == null ? 0 : tm, toOpp,
      over, margin: q[6] - q[13], oppBest: over ? 0 : o1.best, oppCap: over ? 0 : o1.cap, oppHow: over ? '' : o1.how, oppEx: over ? 0 : o1.ex, cap0: o0.cap, ex0: o0.ex, total: b.reduce((s, x) => s + x, 0) };
  }
  // (2026-11-22 lesson loop) マンカラビ's voice for one lesson: praise / soft words / push on, each lesson in an order of its own (mcVoice);
  // every sentence below has five wordings, taken by the problem's number, so no line comes twice in a lesson (the praise and the
  // miss have lists of their own, so the same problem's two answers never share a line either)
  const MC_V = {
    cheer: ['ブーン！ いい手！', 'さすが！', 'ばっちり！', 'お見事！', 'やった〜！', 'ナイス！', 'すごい、正解！', 'そうそう、それ！', 'いい読み、さすが！', '上手！', '完璧！', 'よく見つけた！'],
    soft: ['おしい！', '大丈夫！', 'ドンマイ！', 'あと一歩！', 'あと少し！', '今度こそ！', '気にしない、気にしない！', 'よくある見落とし！', '次は見つけられるはず！', 'いっしょに確かめよう！', 'これで覚えちゃおう！'],
    push: ['この調子で次も行こう！', 'どんどん行こう！', 'その勢いで次へ！', '次も見せて！', 'まだまだいける！', 'わかってきたね、続けよう！'],
  };
  function mcVoice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = n % 12, a2 = 1 + Math.floor(n / 11) % 10, b2 = n % 11;
    return { cheer: i => MC_V.cheer[(a * i + b) % 12], soft: i => MC_V.soft[(a2 * i + b2) % 11], push: i => MC_V.push[(i + n) % 6] }; }
  const MCJ_GH = {   // (the 3rd-5th problems' hints, by group; the lesson's own two come first)
    sow: ['穴ごとに、目標まであといくつか数えてみよう！', 'ストアをまたぐときは、きみのストアも1つ分と数えるの！', '多すぎても少なすぎても止まらないの。ちょうどの穴はどれ？'],
    extra: ['ストアのすぐとなりに、1粒だけの穴はない？', 'ぴったりの穴が2つあったら、近いほうから使おう！', '種の数と、ストアまでの穴の数を見くらべてみて！'],
    cap: ['まずは、きみの側の空っぽの穴を見つけよう！', '向かいに大きな山がある空き穴をねらってね！', 'その空き穴まで、ちょうどの数の種がある穴は？'],
    def: ['ねらわれた山を動かせば、取られるものがなくなるの！', '相手が止まる空の穴に、種を落としてうめる手もあるの！', '相手の穴に1粒足して、止まる場所をずらすのも手！'],
    blk: ['相手のストアまでの距離と、相手の穴の種の数をくらべてみて！', 'きみのまく種が、相手の列のどこまで届くか追ってみよう？', '相手の穴が1粒ふえるだけで、ぴったりはくずれるの！'],
    open: ['まずはもう一回。そのあとで相手の形を見よう！', '相手の列にどれだけ種をわたすかも数えてね！', 'まいたあと、相手にぴったりの穴ができない？'],
    end: ['おしまいの瞬間、どちらの列に何粒残る？', 'あと何粒で勝ちか、先に数えておこう！', 'もう一回で手番を重ねられるかもチェック！'],
    keep: ['大きな山をまくと、種はどこまで流れる？', '少ない種で、手番だけわたす手もあるの！', 'きみの側にためた種は、さいごにきみのもの！'],
    play: ['まずは、もう一回と横取りを探そう！', '相手の次の一手で何をされるかも見てね！', 'きみの得から相手の得を引いて、くらべよう！'],
  };
  // (2026-11-23 第2期) when a group hint holds on a problem (null: always) — and the hints for a problem none of them fits
  const mcTurnCap = (E, Q, R) => { let best = 0; for (const l of E.turnMax(Int8Array.from(Q.b), 0, R).lines.filter(l => l[0] === Q.best).concat([[Q.best]])) { let c = Int8Array.from(Q.b), n = 0; for (const x of l) { const r = E.trace(c, 0, x, R); c = r.board; n = Math.max(n, r.cap || 0); if (r.over) break; } best = Math.max(best, n); } return best; };   // (the biggest capture in the answer's turn, extra turns followed)
  const mcReady = (E, Q, R) => E.legal(Int8Array.from(Q.b), 0, R).filter(k => E.trace(Int8Array.from(Q.b), 0, k, R).extra);
  const mcDef = (E, Q, R) => { const b = Int8Array.from(Q.b), th = E.legal(b, 1, R).map(k => ({ k, t: E.trace(b, 1, k, R) })).filter(x => x.t.cap >= 3), drops = E.trace(b, 0, Q.best, R).events.filter(e => e.t === 'drop').map(e => e.at);
    return { mv: th.some(x => x.t.capFrom === Q.best), fill: th.some(x => drops.includes(x.t.land)), shift: th.some(x => drops.includes(7 + x.k)) }; };
  const MCJ_GHFIT = {
    sow: [null, (E, Q) => Q.target > 6, null],
    extra: [(E, Q) => Q.b[5] === 1 && Q.best === 5, (E, Q, R) => { const r = mcReady(E, Q, R); return r.length >= 2 && r.every(k => k <= Q.best); }, null],
    cap: [(E, Q, R) => mcTurnCap(E, Q, R) > 0, (E, Q, R) => mcTurnCap(E, Q, R) >= 4, (E, Q, R) => mcTurnCap(E, Q, R) > 0],
    def: [(E, Q, R) => mcDef(E, Q, R).mv, (E, Q, R) => mcDef(E, Q, R).fill, (E, Q, R) => mcDef(E, Q, R).shift],
    end: [null, null, (E, Q, R) => mcReady(E, Q, R).length > 0],
  };
  const mcNear = (E, Q, R) => { const r = mcReady(E, Q, R); return r.length >= 1 && r.every(k => k <= Q.best); }, mcNear2 = (E, Q, R) => mcReady(E, Q, R).length >= 2 && mcNear(E, Q, R);
  const MCJ_HFIT = { extra: [null, mcNear2], chain: [mcNear, mcNear2] };   // (the lessons' own two hints: 「候補がいくつかあるなら…」「遠い穴を先にまくと…」 need two ready pits)
  const MCJ_GHX = {
    sow: ['1粒ずつ、穴を数えながらまいてみよう！', 'さいごの1粒が落ちる穴を、指でたどってみて。', '種の数だけ、となりへとなりへ進めるの。'],
    extra: ['さいごの1粒がどこに落ちるか、指でなぞって確かめよう！', 'ストアまでの穴の数を、右から順に数えてみて。', 'まいたあと、手番がきみに残る穴はどこ？'],
    cap: ['相手の大きな山の向かいは、空いていない？', 'さいごの1粒が空の穴に入る手を探してみて。', '取れる粒の数を、穴ごとにくらべよう！'],
    def: ['相手の番に、どの穴の種がどこで止まるか追いかけてみて！', 'いちばん大きな山がねらわれていないか、先に確かめて。', '守ったあとに相手が取れる粒の数を、くらべてみよう。'],
    end: ['さいごまで数えて、いちばん多く残る手をえらんでね！', '相手の列が空になったら、残りの種はどうなる？', 'あと何手でおしまいか、先に数えておくといいの。'],
  };
  // why the red pit falls short — five wordings each (by the problem's number)
  const MCJ_WHY = {
    sowShort: (n, m) => [`赤い丸の穴は${n}粒だから、目標の${m}つ手前で止まっちゃう。`, `赤い丸だと${n}粒しかないから、目標まで${m}つ足りないの。`, `赤い丸をまくと、さいごの1粒は目標の${m}つ手前。`, `赤い丸の${n}粒では、目標に${m}つ届かないの。`, `赤い丸からだと、あと${m}つのところで種が切れちゃう。`],
    sowOver: (n, m) => [`赤い丸の穴は${n}粒だから、目標を${m}つ通りすぎちゃう。`, `赤い丸だと${n}粒あって、目標より${m}つ先まで行っちゃうの。`, `赤い丸をまくと、さいごの1粒は目標の${m}つ先。`, `赤い丸の${n}粒は、目標には${m}つ多すぎるの。`, `赤い丸からだと、目標を${m}つ追いこしちゃう。`],
    notWin: () => ['赤い丸の穴だと、まだ勝ちが決まらないの。', '赤い丸では勝負がつかないまま、相手の番になっちゃう。', '赤い丸をまくと、勝ちまであと少し届かないの。', '赤い丸の手だと、決めきれずに相手へ手番がわたるの。', 'せっかくの勝ちの場面なのに、赤い丸では決まらないの。'],
    noExRelay: () => ['赤い丸の穴だと、リレーがストアで止まらないから、もう一回がないの。', '赤い丸からのリレーは、ストアの外で止まっちゃう。もう一回はなし。', '赤い丸をまくと、リレーのさいごがストアに入らないの。', '赤い丸のリレーは、ストアにたどり着かずに終わるの。', '赤い丸だと、まき直しの行き先がストアじゃないの。手番は相手へ。'],
    noExShort: m => [`赤い丸の穴は種が${m}粒足りなくて、ストアの手前で止まっちゃう。`, `赤い丸だと、ストアまで${m}粒足りないの。`, `赤い丸をまくと、ストアの${m}つ手前で種が切れちゃう。`, `赤い丸の種では、ストアに${m}つ届かないの。`, `赤い丸からだと、あと${m}粒あればストアだったのに！`],
    noExOver: () => ['赤い丸の穴は種が多すぎて、ストアを通りすぎちゃうの。', '赤い丸だと、種がストアを越えて相手の列まで行っちゃう。', '赤い丸をまくと、さいごの1粒はストアの先。', '赤い丸の種は多すぎて、ぴったりにならないの。', '赤い丸からだと、ストアを通りこして止まるの。'],
    capSmall: c => [`赤い丸の穴の横取りは${c}粒だけ。`, `赤い丸でも取れるけど、${c}粒しか入らないの。`, `赤い丸をまくと、横取りできるのは${c}粒。`, `赤い丸の横取りは小さめで、${c}粒どまり。`, `赤い丸だと、向かいの山が${c}粒しかないの。`],
    noCap: () => ['赤い丸の穴だと空の穴に止まらないから、横取りできないの。', '赤い丸では、さいごの1粒が空の穴に落ちないの。横取りはなし。', '赤い丸をまくと、止まる場所が空の穴じゃないから取れないの。', '赤い丸の手だと、向かいの山に手が届かないの。', '赤い丸からだと、さいごの1粒が種のある穴に落ちちゃう。'],
    oppCap: (b, mo) => [`赤い丸の穴のあと、相手に横取りされて${b}粒${mo}取られちゃう。`, `赤い丸をまくと、次に相手の横取りで${b}粒${mo}持っていかれるの。`, `赤い丸のあとは、相手の横取りが待っているの。${b}粒${mo}取られちゃう！`, `赤い丸の手だと、相手の番に横取りされて${b}粒${mo}ストアへ。`, `赤い丸では、きみの山が横取りの的のまま。相手に${b}粒${mo}取られるの。`],
    oppBoth: (b, mo) => [`赤い丸の穴のあと、相手にもう一回から横取りまでつながれて、${b}粒${mo}取られちゃう。`, `赤い丸をまくと、相手はもう一回で打ち続けて、さいごに横取り。${b}粒${mo}取られるの。`, `赤い丸のあと、相手にもう一回と横取りを続けられて、${b}粒${mo}入れられちゃう。`, `赤い丸の手だと、相手のもう一回が横取りにつながって、${b}粒${mo}持っていかれるの。`, `赤い丸では、相手に続けて打たれて横取りまで決められちゃう。${b}粒${mo}取られるの。`],
    oppEx: (b, mo) => [`赤い丸の穴のあと、相手にもう一回を続けられて${b}粒${mo}入れられちゃう。`, `赤い丸をまくと、相手がもう一回をつないで${b}粒${mo}ストアに入れるの。`, `赤い丸のあと、相手のぴったりの穴が残って、${b}粒${mo}入れられちゃう。`, `赤い丸の手だと、相手に続けて打たれて${b}粒${mo}入るの。`, `赤い丸では、相手のもう一回が止まらないの。${b}粒${mo}入れられちゃう。`],
    oppPlain: (b, mo) => [`赤い丸の穴のあと、相手に${b}粒${mo}入れられちゃう。`, `赤い丸をまくと、相手は次の番で${b}粒${mo}ストアに入れられるの。`, `赤い丸のあと、相手の番に${b}粒${mo}入っちゃう。`, `赤い丸の手だと、相手に${b}粒${mo}かせがれるの。`, `赤い丸では、相手が次に${b}粒${mo}取れちゃう。`],
    blk: () => ['赤い丸の穴だと、相手のぴったりの穴がそのまま残るの。', '赤い丸では相手の穴の数が変わらないから、相手のもう一回が消えないの。', '赤い丸をまくと、相手のぴったりの数がずれないまま。', '赤い丸の手だと、相手は次ももう一回できちゃう。', '赤い丸だと、相手のストア前の穴はさわられずに残るの。'],
    turn: t => [`赤い丸の穴だと、この番で入るのは${t}粒だけ。`, `赤い丸をまくと、この番のストアは${t}粒どまり。`, `赤い丸では、この番に${t}粒しか入らないの。`, `赤い丸の手だと、ストアに入るのは${t}粒だけなの。`, `赤い丸だと、この番のかせぎは${t}粒。`],
    toOpp: c => [`赤い丸の穴だと、種が${c}粒も相手の列へ流れちゃう。`, `赤い丸をまくと、${c}粒も相手の側へわたっちゃうの。`, `赤い丸では、相手の列に${c}粒もプレゼントすることになるの。`, `赤い丸の手だと、${c}粒が相手の側へ行っちゃう。`, `赤い丸だと、相手の列が${c}粒もふえちゃう。`],
    lose: () => ['赤い丸の穴だと、さいごまで読むと負けになっちゃう。', '赤い丸をまくと、おしまいまで数えて、きみの負けになるの。', '赤い丸では、さいごの数え合いで相手が上回っちゃう。', '赤い丸の手だと、勝てた局面が負けに変わるの。', '赤い丸だと、おしまいのとき相手のほうが多くなるの。'],
    diff: d => [`赤い丸の穴だと、さいごまで読むと差が${d}粒ちぢまるの。`, `赤い丸をまくと、おしまいの差が${d}粒へっちゃう。`, `赤い丸では、さいごに${d}粒ぶん損するの。`, `赤い丸の手だと、数えきったときの差が${d}粒少ないの。`, `赤い丸だと、おしまいまでに${d}粒もったいないの。`],
    oppMore: (b, w) => [`赤い丸の穴のあと、相手が次に取れる種が${b}粒になるの（金の丸なら${w}粒）。`, `赤い丸をまくと、相手の次のかせぎが${b}粒。金の丸なら${w}粒ですんだの。`, `赤い丸では、相手に${b}粒取れる形が残るの。金の丸なら${w}粒。`, `赤い丸の手だと、相手の次の番は${b}粒。金の丸より${b - w}粒多いの。`, `赤い丸だと、相手が次に${b}粒入れられるの。金の丸なら${w}粒だけ。`],
    toOpp2: c => [`赤い丸の穴だと、種が${c}粒、相手の列へ流れちゃう。`, `赤い丸をまくと、${c}粒が相手の側へ行くの。`, `赤い丸では、相手の列に${c}粒わたすことになるの。`, `赤い丸の手だと、相手の側に${c}粒落ちちゃう。`, `赤い丸だと、相手に${c}粒わたしちゃうの。`],
    okish: () => ['赤い丸の穴も悪くないけど、金の丸のほうが、この先の種の入り方がいいの。', '赤い丸も一手だけど、何手か先の種の入り方で金の丸に少し負けるの。', '赤い丸でも戦えるけど、先まで数えると金の丸がちょっと多く入るの。', '赤い丸も考えられる手。でも、この先のかせぎは金の丸が上なの。', '赤い丸もわるくない手。先の数え合いで、金の丸がわずかに得なの。'],
    near: () => ['赤い丸の穴もいい線！ 金の丸とほとんど同じなの。', '赤い丸もほぼ互角の手！ 金の丸がほんの少しだけ上なの。', '赤い丸もかなりいい手！ 差はほんのちょっと。', '赤い丸でもほとんど変わらないの！ 金の丸がわずかに上。', '赤い丸もおしい！ 金の丸とほぼ同じ働きなの。'],
  };
  // what the gold pit does — five wordings for the praise (G) and five more for the miss (N)
  const MCJ_PLUS = {
    win: { G: () => ['そのまま勝ちが決まる', 'この一手で勝ちきれる', 'ここで勝負が決まる', 'すぐに勝ちが決まる', 'おしまいまで一気に勝てる'], N: () => ['その場で勝ちが決まる', '勝負をここで決められる', 'この番で勝ちきれる', 'そのまま勝ちまで行ける', 'すぐに勝負がつく'] },
    run: { G: t => [`もう一回をつないで、この番で${t}粒入る`, `もう一回を重ねて、${t}粒もストアに入る`, `続けて打って、この番だけで${t}粒かせげる`, `ぴったりを何度もつないで${t}粒入る`, `何度も続けて打てて、合計${t}粒入る`], N: t => [`続けて打てて、この番で${t}粒入る`, `もう一回が何度も続いて${t}粒になる`, `ぴったりをつなげて、合計${t}粒かせげる`, `この番だけで${t}粒もストアに入る`, `もう一回を重ねて${t}粒集められる`] },
    extra: { G: () => ['ぴったりストアに届いて、もう一回打てる', 'さいごの1粒がストアに入って、続けて打てる', '種の数とストアまでの距離が同じで、もう一回打てる', 'ストアでぴたっと止まって、手番がきみに残る', 'ちょうどストアに落ちて、もう一度きみの番になる'], N: () => ['ストアにちょうど届いて、もう一回打てる', 'さいごの1粒がストアでぴたっと止まる', '距離と種の数が同じで、続けて打てる', 'ぴったりストアに入って、手番を続けられる', 'ちょうどストアで止まって、もう一度打てる'] },
    cap: { G: c => [`相手の${c}粒を横取りできる`, `向かいの${c}粒をごっそりいただける`, `相手の山${c}粒がまるごときみのストアへ行く`, `空の穴に止まって、${c}粒をまるごと取れる`, `向かいの${c}粒をひと息に取れる`], N: c => [`向かいの${c}粒をいただける`, `相手の${c}粒の山をまるごと取れる`, `空の穴に止まって、向かいの${c}粒が手に入る`, `${c}粒の横取りが決まる`, `相手の${c}粒をストアにしまえる`] },
    defuse: { G: () => ['相手の横取りのねらいをはずせる', 'ねらわれていた山を守れる', '相手の横取りを空ぶりにできる', 'きみの山を横取りから逃がせる', 'きみの山が取られる心配を消せる'], N: () => ['相手の横取りをかわせる', '取られそうな山を守れる', '相手のねらいを空ぶりにできる', 'きみの山を安全にできる', '横取りの心配がなくなる'] },
    killEx: { G: () => ['相手のもう一回を消せる', '相手のぴったりの穴をずらせる', '相手の続けて打つ手をなくせる', '相手のストア前の穴の数をくずせる', '相手のもう一回を止められる'], N: () => ['相手のぴったりをくずせる', '相手の連続の手を消せる', '相手のもう一回の穴をずらせる', '相手に続けて打たせない', '相手のもう一回をふうじられる'] },
    oppNone: { G: () => ['相手に次の得をさせない', '相手の次の番を空ぶりにできる', '相手に何も取らせない', '相手の次のかせぎをゼロにできる', '相手に得をさせない形にできる'], N: () => ['相手は次に何も取れない', '相手の次のかせぎがなくなる', '相手に1粒も入れさせない', '相手の得をゼロにできる', '相手に次の得をあたえない'] },
    oppFew: { G: b => [`相手が次に取れるのは${b}粒だけになる`, `相手の次の番を${b}粒におさえられる`, `相手のかせぎを${b}粒どまりにできる`, `相手には${b}粒しか取らせない`, `次の相手の得が${b}粒ですむ`], N: b => [`相手の次は${b}粒だけになる`, `相手を${b}粒におさえられる`, `相手のかせぎを${b}粒どまりにできる`, `相手は${b}粒しか取れない`, `相手の得を${b}粒にとどめられる`] },
    oppLess: { G: d => [`相手の次の得を${d}粒へらせる`, `相手のかせぎを${d}粒少なくできる`, `相手の次の番を${d}粒ぶん小さくできる`, `相手の取り分を${d}粒けずれる`, `相手に入る種を${d}粒へらせる`], N: d => [`相手の得が${d}粒へる`, `相手の次の番が${d}粒小さくなる`, `相手の入る種を${d}粒おさえられる`, `相手のかせぎから${d}粒けずれる`, `相手の取り分が${d}粒少なくなる`] },
    noGive: { G: () => ['相手の列に種をわたさない', '種を1粒も相手の側へ流さない', 'きみの側の中で種を回せる', '相手に種をプレゼントしない', '相手の列をふやさずにすむ'], N: () => ['相手の側に種を落とさない', '種を相手にわたさずにすむ', 'きみの列の中だけでまける', '相手の列に1粒もあげない', '相手の種をふやさない'] },
  };
  function mcLsJa(E, s, P, i, R, pts, n) {
    const id = s.id, g = MCJ_GRP[id], A0 = MCJ_LS.ask[g]; if (!A0) return null; n = n || 0;
    const k0 = i + id.length, pick = L => L[k0 % L.length], H = MCJ_LS.hint[id] || [], GH = MCJ_GH[g] || [], VO = mcVoice(n);
    const v = L => L[i % L.length];   // (the problem's own wording: one per problem, none twice in a lesson)
    const exact = P.exact === true || g === 'end', sc = P.sc, vBest = Math.max(...sc.filter(x => x !== null));
    const right = u => sc[u] != null && pts(P, u) >= 16, wrongs = () => sc.map((x, j) => x === null || right(j) ? -1 : j).filter(j => j >= 0);
    const FF = u => { try { return mcF(E, P.b, u, R); } catch (e) { return null; } }, A = P.best, FA = FF(A); if (!FA) return null;
    const dist = (from, to) => { let c = 0, x = from; while (x !== to && c < 30) { x = x === 13 ? 0 : x + 1; if (x !== 13) c++; } return c; };   // (sowing steps, the opponent's store skipped)
    const n1 = x => Math.max(1, Math.round(Math.abs(x))), W_ = MCJ_WHY;
    // the one thing the wrong move misses, against the gold one (most telling first) → { t, weak }
    const why = (G, u) => {
      const W = FA, dv = vBest - sc[u], T = t => ({ t, weak: false });
      if (g === 'sow') { const t = dist(G.k, P.target), dd = G.n - t; return T(v(dd < 0 ? W_.sowShort(G.n, -dd) : W_.sowOver(G.n, dd))); }
      if (W.over && W.margin > 0 && !(G.over && G.margin > 0)) return T(v(W_.notWin()));
      if (W.extra && !G.extra) return T(v(s.rules === 'sunka' || G.relays ? W_.noExRelay() : G.n < G.d ? W_.noExShort(G.d - G.n) : W_.noExOver()));
      if (W.cap > G.cap && W.cap >= 2) return T(v(G.cap ? W_.capSmall(G.cap) : W_.noCap()));
      if (G.oppBest >= W.oppBest + 2) { const mo = G.oppBest >= 4 ? 'も' : ''; return T(v((G.oppHow === 'cap' ? W_.oppCap : G.oppHow === 'both' ? W_.oppBoth : G.oppHow === 'extra' ? W_.oppEx : W_.oppPlain)(G.oppBest, mo))); }
      if (g === 'blk' && G.oppEx > W.oppEx) return T(v(W_.blk()));
      if (W.turn >= G.turn + 2) return T(v(W_.turn(G.turn)));
      if (G.toOpp >= W.toOpp + 2) return T(v(W_.toOpp(G.toOpp)));
      if (exact && vBest > 0 && sc[u] < 0) return T(v(W_.lose()));
      if (exact) return { t: v(W_.diff(n1(dv))), weak: true };
      if (G.oppBest > W.oppBest) return T(v(W_.oppMore(G.oppBest, W.oppBest)));
      if (G.toOpp > W.toOpp) return T(v(W_.toOpp2(G.toOpp)));
      return { t: v(dv >= 1.5 ? W_.okish() : W_.near()), weak: true };   // (2026-11-22: never "the AI says")
    };
    const plus = (W, Q, side) => { const o = [], at = (k, x) => v(MCJ_PLUS[k][side](x));
      if (W.over && W.margin > 0) o.push(at('win'));
      if (W.extra) o.push(W.turn > W.gain + 1 ? at('run', W.turn) : at('extra'));
      if (W.cap >= 2) o.push(at('cap', W.cap));
      if (W.cap0 >= 2 && W.oppCap < W.cap0 && o.length < 2) o.push(at('defuse'));
      if (W.ex0 > W.oppEx && W.oppEx === 0 && o.length < 2 && !W.extra) o.push(at('killEx'));
      if (o.length < 2 && Q && Q.oppBest >= W.oppBest + 2) o.push(!W.oppBest ? at('oppNone') : W.oppBest <= 3 ? at('oppFew', W.oppBest) : at('oppLess', Q.oppBest - W.oppBest));
      if (o.length < 2 && !W.extra && W.toOpp === 0 && (!Q || Q.toOpp > 0)) o.push(at('noGive'));
      return o.slice(0, 2).join('し、'); };
    const deepG = exact ? ['さいごまで読み切ると、これがいちばん差がつく手なんだ。', 'おしまいまで数えると、これが最善なの。', '数えきったら、いちばん多く残るのがこの手！', 'さいごの数え合いで、いちばん得するのがこれ。', '読みきれてるね！ これがいちばん差がつくの。']
      : ['目先の得は小さいけど、何手か先まで数えるといちばん種が増える手なんだ。', 'すぐには入らなくても、先まで見るといちばん得なの。', 'あとから効いてくる手！ 先のかせぎがいちばん多いの。', '今は地味でも、数手先でいちばん種が集まるの。', '先を見すえた一手！ これがいちばん伸びるの。'];
    const deepN = exact ? ['金の丸の穴は、おしまいまで数えていちばん差がつく手なの。', '正解は金の丸。さいごの数え合いでいちばん多く残るの。', '金の丸をまけば、読みきったときの差がいちばん大きいの。', '金の丸の穴だと、おしまいの差がいちばん開くんだ。', 'ここは金の丸！ 数えきると、それがいちばん得なの。']
      : ['金の丸の穴は、何手か先まで数えるといちばん種が増える手なの。', '正解は金の丸。少し先まで見ると、いちばん得なの。', '金の丸をまけば、先のかせぎがいちばん多くなるんだ。', '金の丸の穴だと、数手先でいちばん種が集まるの。', 'ここは金の丸！ あとから効いてくる手なんだ。'];
    const goldN = a => v([`金の丸の穴なら、${a}から。`, `正解は金の丸。${a}の。`, `金の丸をまけば、${a}んだ。`, `金の丸の穴だと、${a}ところだったの。`, `ここは金の丸！ ${a}手なの。`]);
    const bodyG = a => v([`その手なら、${a}から！`, `${a}のが大きいね。`, `${a}んだ〜。`, `それで${a}の！`, `${a}手、見つけたね！`]);
    const pushOn = (i + n) % 2 === 0;
    const alt = u => { if (u != null && !right(u) && sc[u] != null) return u; const W = wrongs().sort((x, y) => sc[y] - sc[x]); for (const x of W) { const Q = FF(x); if (Q && !why(Q, x).weak) return x; } return W[0]; };
    const good = u => { const own = u != null && right(u) ? u : A, W = FF(own) || FA, p = VO.cheer(i), tail = pushOn ? ' ' + VO.push(i) : '';
      if (g === 'sow') { const t = dist(W.k, P.target); return W.n === t ? p + ' ' + v(['種の数が、ちょうど目標までの距離だったね。', `${W.n}粒で、ぴたっと目標に止まった！`, '数えたとおり、さいごの1粒が目標に入ったの。', `目標まで${t}つ、種も${W.n}粒。ぴったりだね！`, 'きれいに目標でストップ！ 数え方もばっちり。']) + tail
        : `いい線！ 目標まであと${Math.abs(W.n - t)}つずれたけど、ほとんどぴったり。金の丸の穴なら、ちょうど止まったんだ。` + tail; }
      const a = plus(W, null, 'G'), more = own !== A ? ' ' + v(['金の丸なら、もう少し得できたね。', '金の丸ならもうちょっと多かったの。', 'いちばんは金の丸だけど、十分いい手！', '金の丸だと、さらに少し得なんだ。', '金の丸なら、あと少し上積みできたの。']) : '';
      return p + ' ' + (a ? bodyG(a) : v(deepG)) + more + tail; };
    const ng = u0 => { const u = alt(u0), sf = VO.soft(i); if (u == null) return sf + ' ' + v(deepN); const G = FF(u) || FA;
      if (g === 'sow') { const t = dist(FA.k, P.target), m = FA.n; return sf + ' ' + why(G, u).t + ' ' + v([`金の丸の穴は${m}粒で、目標までちょうど${t}つなんだ。`, `金の丸なら${m}粒。目標までの${t}つとぴったり同じなの。`, `正解は金の丸。${t}つ先の目標に、${m}粒でちょうど届くの。`, `金の丸の${m}粒なら、さいごの1粒が目標に落ちるんだ。`, `ここは金の丸！ 目標まで${t}つ、種も${m}粒。`]); }
      const a = plus(FA, G, 'N'); return sf + ' ' + why(G, u).t + ' ' + (a ? goldN(a) : v(deepN)); };
    // (2026-11-23 第2期) the 3rd-5th problems' hints are given only where the board bears them out (MCJ_GHFIT: the pit by the store
    // holds one seed and it is the answer / two pits are ready and the answer is the nearer one / the answer moves the threatened pile,
    // fills the empty pit the opponent would stop in, or adds a seed to the opponent's pit …), each once a lesson; else MCJ_GHX
    const ghOf = j => { const fits = MCJ_GHFIT[g] || [], hf = MCJ_HFIT[id] || [], used = new Set(); let t = '', nx = 0;
      for (let q = 0; q <= j; q++) { const Q = s.problems[q], q0 = Math.max(0, q - H.length); t = '';
        if (q < H.length) { let ok = true; try { ok = !hf[q] || !Q || hf[q](E, Q, R); } catch (e) { ok = false; } if (ok) { t = H[q]; continue; } }   // (the lesson's own two, where they hold)
        if (!GH.length) continue;
        if (!Q) { t = GH[q0 % GH.length]; continue; }
        for (let z = 0; z < GH.length; z++) { const x = (q0 + z) % GH.length; if (used.has(x)) continue; let ok = true; try { ok = !fits[x] || fits[x](E, Q, R); } catch (e) { ok = false; } if (ok) { used.add(x); t = GH[x]; break; } }
        if (!t) { const XL = MCJ_GHX[g] || []; t = XL.length ? XL[nx++ % XL.length] : ''; } }
      return t; };
    const ask = pick(A0); let hintTx = H.length || GH.length ? ghOf(i) : '';
    if (/かな？$/.test(ask)) hintTx = hintTx.replace(/かな？$/, '？');   // (no かな？ right after a かな？)
    return { ask, hintTx, good, ng, own: true };
  }
  const MANCALA = {
    LKEY: 'aicoding-mancala-v1-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../mancala/lessons.json?v=6'), Promise.all(['../mancala/i18n.js?v=20261107l15', '../mancala/i18n-learn.js?v=20261107l14'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n')), mcEng().catch(() => null)])
        .then(([ls, T]) => { const w = {}; try { new Function('window', T)(w); } catch (e) { console.warn('[lessons3d] mancala texts', e); } this.I = w.I18N || {}; this.data = { ls }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    courseOf(sid) { for (const r in MC_SETS) for (const c in MC_SETS[r]) if (MC_SETS[r][c].includes(sid)) return [r, c]; return ['kalah', 'basic']; },
    rules(s) { return s.rules || this.data.ls.rules || 'kalah'; },
    list(kind, lang) {
      const pr = J(this.LKEY, {}), steps = this.data.ls.steps, out = [];
      for (const r in MC_SETS) for (const c in MC_SETS[r]) for (const sid of MC_SETS[r][c]) {
        const i = steps.findIndex(s => s.id === sid); if (i < 0) continue; const s = steps[i];
        out.push({ key: String(i), cat: c, catName: (r !== 'kalah' ? this.tx('rule.' + r, lang) + '・' : '') + (this.tx('lc.' + c, lang) || c), title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: s.problems && s.problems[0] && window.AtlasMini && AtlasMini.mancala ? AtlasMini.mancala({ b: s.problems[0].b }) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false });
      }
      return out;
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), R = this.rules(s), sp = { m: MCM('ok', lang), x: MCM('ng', lang) };
      return { id: s.id, title: T('title'), intro: lang === 'ja' && MCJ_LS.intro[s.id] || T('intro'), ramp: null,
        probs: (s.problems || []).map((P, pi) => {
          const base = s.id === 'sow' ? [{ at: P.target, cls: 'target' }] : [];
          const th = { extra: 'store', chain: 'store', e_chain: 'store', s_relay: 'store', capture: 'cap', k_combo: 'cap', n_cap: 'cap', s_cap: 'cap', defend: 'def', n_defend: 'def', s_defend: 'def', n_chain: 'store', s_chain: 'store', e_block: 'blk' }[s.id];
          const hintMk = () => { const b = P.b, E = window.MancalaEngine, o = [];
            if (th === 'store') o.push({ at: 6, cls: '' });
            if (th === 'cap') for (let i = 0; i < 6; i++) if (!b[i] && b[12 - i]) o.push({ at: 12 - i, cls: 'cap' });
            if ((th === 'blk' || th === 'def') && E) for (let k = 0; k < 6; k++) { if (!b[7 + k]) continue; const tr = E.trace(Int8Array.from(b), 1, k, R); if (th === 'blk' && tr.extra && !tr.over) o.push({ at: 7 + k, cls: 'cap' }); if (th === 'def' && tr.cap) o.push({ at: tr.capFrom, cls: 'cap' }); }
            return o; };
          return { pos: { spec: { b: P.b.slice(), rules: R, side: 0 }, me: 1, marks: base }, kind: 'best', P, base, hintMk, sow: s.id === 'sow', ans: P.best, ask: T('goal'), hintTx: T('hint'), hint: null, why: '',
            good: () => T('why', sp), ng: () => this.tx('fb.answerIs', lang, { m: MCM('ok', lang) }) + ' ' + T('why', sp) };
        }).map((o, i) => { if (lang === 'ja' && window.MancalaEngine) try { Object.assign(o, mcLsJa(window.MancalaEngine, s, o.P, i, R, (P, k) => this.points(P, k), +key) || {}); } catch (e) { console.warn('[lessons3d] mancala lesson', e); } return o; }),   // (2026-11-21 lesson loop: マンカラビ's question, hint, why / what yours misses)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, k) {   // (= mancala/app.js problemPoints)
      const sc = P.sc, all = sc.filter(v => v !== null), mine = sc[k], best = Math.max(...all), n = all.length;
      if (mine == null) return 0; if (n <= 1 || mine >= best - 1e-9) return 20;
      const r = all.filter(v => v > mine + 1e-9).length; return Math.min(15, Math.max(0, Math.round(20 * (n - 1 - r) / (n - 1))));   // (2026-11-23: only the gold pit is right)
    },
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: { b: P.b.slice(), rules: this.rules(s), side: 0 }, me: 1, lock: true } } : null; },
  };
  /* morris (2026-11-16): morris/lessons(-six|-twelve).json — one move each, scored as morris/index.html problemPoints (P.ok: one of
     these; P.sc: the stored values); the moves named by their marks (no coordinates on the 3D board: a sentence naming points is left
     out). Progress = the full game's ('aicoding-morris-lessons' { '<six:|twelve:><id>': { best, clear } }). Texts: morris/i18n.js + i18n_more.js. */
  const MMV = ['nine', 'six', 'twelve'], MMPRE = v => v === 'nine' ? '' : v + ':', MF = m => m & 31, MT = m => (m >> 5) & 31, MN = 31;
  const noCoord = x => String(x || '').replace(/<p>[^<]*\b[a-g][1-7]\b[^<]*<\/p>/g, '').replace(/[^。.!！?？]*\b[a-g][1-7]\b[^。.!！?？]*[。.!！?？]?/g, '').trim();
  const MR_ENG = '../morris/engine.js?v=20261114eg-zf1';   // (= atlas/games/morris.js: the same file and version, one cache)
  const mrEng = () => window.MorrisEngine ? Promise.resolve(window.MorrisEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = MR_ENG; sc.onload = () => window.MorrisEngine ? res(window.MorrisEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  /* (2026-11-21 lesson loop) morris in Japanese: モリフク's own intro / questions / hints (short, no coordinates), and the feedback
     from the position itself — mrF: a mill and what it takes (a piece of the opponent's pair / one blocking your own line), the
     opponent's mill point it fills, the mill points each side has after it (yours: a fork when two), the opponent's moves left
     (a blockade), the point it vacates (a mill opened: can the opponent step in?), the win. Right → the reason; wrong → the green
     move, what yours misses, and (engine-scored steps) what it costs. */
  const MRJ_LS = {
    intro: {
      b_place: '駒は、線が交わる<b>点</b>に置くの。線でつながった点どうしが「となり」。<br>角はとなりが2つ、辺のまん中は3つ、中段の四角の辺のまん中は<b>4つ</b>！ 多いほど強い点なんだ。',
      b_mill: '同じ線の上に自分の駒を<b>3つ並べる</b>と「ミル」！ ミルを作るたびに、相手の駒を<b>1つ取れる</b>んだ。<br>まずは、きみの駒が2つ並んでいる線をさがしてみてね。',
      b_take: 'ミルを作ったら、取る駒は自分でえらぶの。どれでもいいわけじゃないぞ。<br>相手が<b>2つ並べて</b>次のミルをねらっていたら、その片方を取れば一石二鳥！ ミルの中の駒は、ふつうは取れないからね。',
      b_block: '相手の駒が2つ並んで、3つ目の点が空いていたら……次の手でミルにされちゃう！<br>自分がミルを作れないときは、<b>その3つ目の点に先に置いて</b>ふさごう。これで駒を1つ守れるね。',
      b_move: 'おたがいに駒を置き終わったら、<b>動かす時間</b>のはじまり。駒を1つえらんで、線にそって<b>となりの空いた点</b>へ1歩だけ進めるんだ。<br>動かして3つ並べても、もちろんミル！',
      b_reopen: 'ミルの駒を1つ外へ動かして、次の手で戻すと……<b>もう一度ミル</b>！ また相手の駒を取れるんだ。<br>ただし、空けた点に<b>相手が入ってこられない</b>か、先に確かめてから開こうね。',
      b_fly: '駒が<b>3つ</b>まで減った側は、線に関係なく<b>好きな空き点へ飛べる</b>んだ。ホー、ぼくみたい！<br>遠くの点へもひとっ飛びだから、ミルも作りやすいよ。',
      b_win: '勝ち方は2つ。相手の駒を<b>2つ</b>まで減らすか、相手を<b>1歩も動けなく</b>するか！<br>どちらでも、その瞬間にきみの勝ちだね。',
      mill: 'ミルを作れる場面では、まず作れないか考えよう。駒の数は、そのまま力の差なんだ。<br>そのあと<b>どの駒を取るか</b>もだいじ。相手の2つ並びや、きみの線をふさいでいる駒をねらってね！',
      block: '相手の2つ並びの3つ目が空いていたら、それは<b>次の手でミルになる</b>合図。<br>きみがミルを作れないなら、まず<b>そこをふさぐ</b>のが基本だね。ふさいだ駒が、きみの並びにもなればもっといい！',
      remove: 'ミルを作ったあと、<b>どの駒を取るか</b>で、その後の戦いが大きく変わるんだ。<br>ねらい目は、相手がミルを作りかけている駒と、きみの線をふさいでいる駒。取ったあとに相手がすぐミルを作れないかも見てね！',
      fork: '1手で<b>ミルの点を2つ同時に</b>作れたら、相手は片方しかふさげない！ 次の手でかならずミルができるんだ。<br>線がたくさん集まる交差点は、両取りの出発点になりやすいよ。',
      junction: '置く時間の序盤は、すぐにミルを作るより<b>あとで役立つ点</b>を押さえよう。<br>となりが4つの交差点や3つの辺のまん中は強い場所。角はとなりが2つで、あとで閉じこめられやすいんだ。',
      counter: '相手のミルをふさぐなら、できれば<b>きみのねらい（あと1つでミル）も同時に</b>作る手がいい！<br>そうすれば、こんどは相手が守る番。主導権がきみに移るね。',
      double: '1つの駒が<b>2つのミルのあいだを行き来</b>できる形が「往復ミル」！ 片方を開けると、もう片方が閉じるんだ。<br>動くたびに相手の駒を取れる、モリスでいちばん強い形だよ。',
      openmill: '動かす時間は、ミルの駒を1つ動かして<b>開き</b>、次に戻して<b>閉じれば</b>また取れる。<br>だいじなのは開く<b>向き</b>。空けた点に相手が入れない開き方を見つけてね！',
      mobility: '置く時間の最後の数手は、そのあと<b>動けるかどうか</b>を決めるんだ。<br>置き終わったとき動ける駒が少ないと、すぐ閉じこめられて負け！ きみの駒のとなりに空き点を残そうね。',
      blockade: '動かす時間は、<b>動かせる駒がなくなった側の負け</b>。駒の数で負けていても、相手の逃げ道を全部ふさげば勝てるんだ！<br>相手の駒のとなりの空き点を数えてみてね。',
      fly: '駒が3つになると、<b>どの空き点へも飛べる</b>。どこにでも現れて相手のねらいをふさげるけど、止められるのは一度に1つだけ。<br>ふさぎながら、きみのミルの形も作るのが基本だよ。',
      endgame: '相手が3つになると、どこへでも飛んでふさいでくる。ねらいが1つじゃ止められちゃうんだ。<br>勝ちパターンは<b>ミルの点を2つ同時に</b>作ること！ 相手の2つ並びも放っておかないでね。',
      defend: '相手の攻めがきびしいと、正しい受けが<b>たった1つ</b>しかないこともある。ほかの手だと駒を取られたり、閉じこめられたり！<br>相手の次の手で何が起きるか、全部数えてから指そうね。',
      sx_nofly: 'シックスでは、駒が3つになっても<b>飛べない</b>んだ。最後まで、となりの点へ1歩ずつ。<br>少ない駒でも、動かして3つ並べればミル！',
      sx_win: '相手の駒がぜんぶ<b>動けなくなったら</b>、その時点できみの勝ち！<br>小さな盤は逃げ道が少ないから、閉じこめがよく決まるんだ。',
      tw_diag: 'トゥエルブには、四隅から内側へのびる<b>ななめの線</b>がある！ 外・中・内の角を結ぶななめに3つ並べても<b>ミル</b>だよ。<br>線が増えたぶん、角の点も強くなるんだ。',
      tw_dblock: 'ななめの線は見落としやすいんだ。相手の<b>ななめの2つ並び</b>に気をつけて！<br>あと1つでミルになる点に、先にきみの駒を置いてふさごうね。',
    },
    ask: {
      b_place: ['線が4本集まる交差点に置いてみて！', 'となりが4つある点、どこかな？', 'さあ、いちばん線が集まる点に置こう！', '交差点はどこだっけ？ 空いているところに置いてね！', 'もう一回！ となりの多い交差点をえらんで。'],
      b_mill: ['3つ並べてミルを作ってみて！', 'あと1つで並ぶ線、見つけられるかな？', 'ミルのチャンス！ どこに置く？', 'きみの駒が2つ並んでいる線はどれ？', 'さあ、3つそろえて相手の駒をいただこう！'],
      b_take: ['ミルを作って、相手の2つ並びの駒を取ってみて！', '取るならどの駒？ 相手のねらいに注目！', 'ミルを作ったあと、相手の次のミルも止められるかな？', '一石二鳥の取り方、わかるかな？', 'さあ、ミル！ そして取る駒をよく選んで。'],
      b_block: ['相手のミルをふさいでみて！', '相手があと1つで並ぶ線、どこかな？', 'このままだとミルにされちゃう！ どこに置く？', '相手の2つ並びの3つ目はどこだろう？', 'さあ、先回りしてふさいじゃおう！'],
      b_move: ['駒を動かしてミルを作ってみて！', 'となりへ1歩でミルになる駒、どれかな？', '動かす時間のミル！ どの駒を動かす？', 'あと1つで並ぶ線に、となりから入れる駒は？', 'さあ、1歩動かして3つそろえよう！'],
      b_reopen: ['ミルを安全に開いてみて！ 次にまた閉じられる形でね。', 'どの駒を動かせば、相手に割りこまれないかな？', 'ミルを開くチャンス！ 空けた点、相手は入ってこない？', '開いて閉じる作戦！ 動かすのはどの駒？', 'さあ、もう一度ミルを作るための一歩！'],
      b_fly: ['飛んでミルを作ってみて！', '3つの駒なら、どこへでも飛べる。ミルになる点はどこかな？', 'ひとっ飛びでミル！ どの駒をどこへ？', 'あと1つで並ぶ線、見つけたかな？', 'さあ、飛んで3つそろえよう！'],
      b_win: ['この一手で勝っちゃおう！', '勝ちを決める手、見つけられるかな？', '相手を2つにするか、動けなくするか。どっち？', 'あと一手で勝負あり！ どこに指す？', 'さあ、決めの一手を！'],
      mill: ['ミルを作って、いちばんいい駒を取ってみて！', 'ミルのチャンス！ 取る駒までよく考えてね。', 'どこでミルを作って、どの駒を取るのがいいかな？', '3つそろえたあとが勝負！ 取るならどれ？', 'さあ、ミルを作って最高の一枚を取ろう！'],
      block: ['相手のミルを防いでみて！', '相手のねらいはどこかな？ 先にふさごう！', 'このままだとミルにされちゃう。どう守る？', 'ふさぐだけじゃなく、きみの並びにもなる手はある？', 'さあ、相手のあと1つを止めよう！'],
      remove: ['ミルを作って、取る駒を正しくえらんでみて！', 'どの駒を取ると、いちばん得かな？', '相手のねらいを消す取り方、わかる？', 'ミルのあと、取る駒で戦いが変わるよ。どれにする？', 'さあ、ミル！ 取る一枚をよく見てね。'],
      fork: ['ミルの点を2つ同時に作ってみて！', '相手が片方しかふさげない形、作れるかな？', '両取りのチャンス！ どこに指す？', '置いたあと「あと1つ」が2つできる点は？', 'さあ、ふさぎきれないねらいを作ろう！'],
      junction: ['序盤のいい場所に置いてみて！', 'となりが多くて、あとで役立つ点はどこかな？', 'すぐにミルより、先を見た一手！ どこに置く？', 'きみの駒と協力できる点、わかるかな？', 'さあ、強い場所を押さえよう！'],
      counter: ['相手のミルを防ぎながら、きみのねらいも作ってみて！', 'ふさぐと同時に攻められる手、どれかな？', '守りながら攻める一手！ どこへ行く？', 'ふさいだ駒で2つ並びもできる手はある？', 'さあ、主導権を取りかえそう！'],
      double: ['ミルの駒を動かして、べつのミルを閉じてみて！', '往復ミルのチャンス！ どの駒を動かす？', 'となりへ動くと、べつの線が3つになる駒は？', '開けて閉じて、毎手取る形を作れるかな？', 'さあ、モリス最強の形を完成させよう！'],
      openmill: ['ミルを開く、いちばんいい一手を見つけて！', 'どの向きに開けば、相手に割りこまれないかな？', 'ミルを開くタイミング！ 動かすのはどれ？', '空けた点に相手が届かない開き方は？', 'さあ、安全に開いて次の一枚をねらおう！'],
      mobility: ['動かす時間のことまで考えて、いちばんいい一手を見つけて！', '置き終わったあと、きみの駒は動けるかな？', '閉じこめられない形を作る一手は？', '相手の逃げ道は減らして、きみのは残す。どこに置く？', 'さあ、このあとの戦いを見すえた一手を！'],
      blockade: ['相手を動けなくしちゃおう！', '相手の駒の逃げ道、残りはいくつかな？', '最後の逃げ道をふさぐ手、わかる？', '駒の数より動ける場所！ どこをふさぐ？', 'さあ、相手を閉じこめて勝とう！'],
      fly: ['飛べる駒で、いちばんいい一手を見つけて！', '相手のねらいをふさぎながら、きみの並びも作れるかな？', '3つの駒の使いどころ！ どこへ飛ぶ？', 'ふさいで、つなげる。そんな点はどこ？', 'さあ、飛んで流れを変えよう！'],
      endgame: ['3つになった相手への、いちばんいい一手を見つけて！', '飛べる相手でも止められない形、作れるかな？', 'ミルの点を2つ同時に作れる手は？', '相手の2つ並びは大丈夫？ そのうえで攻める手を！', 'さあ、とどめの準備をしよう！'],
      defend: ['たった1つの正しい受けを見つけて！', '相手の次の手で何が起きるかな？ よく見てね。', 'ここをしのげるのは1手だけ。どれだろう？', '取られない、閉じこめられない受けは？', 'さあ、ピンチをしのごう！'],
      sx_nofly: ['3つの駒を動かしてミルを作ってみて！', '飛べないシックス。となりへ1歩でミルになる駒は？', 'あと1つで並ぶ線、どの駒が入れるかな？', '1歩でそろう形、見つけられる？', 'さあ、少ない駒でもミルを作ろう！'],
      sx_win: ['1手で相手を動けなくして勝っちゃおう！', '相手の駒が動ける点、残りはどこかな？', '最後の逃げ道をふさげる？', '閉じこめの一手、わかるかな？', 'さあ、小さな盤で閉じこめ勝ち！'],
      tw_diag: ['ななめのミルを作ってみて！', 'ななめの線で、あと1つの場所はどこかな？', '角どうしをななめに結ぶミル！ どこに置く？', 'ななめの2つ並び、見つけた？', 'さあ、ななめに3つそろえよう！'],
      tw_dblock: ['相手のななめのミルを防いでみて！', '見落としやすいななめの2つ並び、どこかな？', 'このままだとななめのミルにされちゃう！ どこに置く？', '相手のねらいの3つ目はどこだろう？', 'さあ、ななめのすき間をふさごう！'],
    },
    hint: {   // (2026-11-22 lesson loop: five each, one per problem — the same hint never twice in a lesson)
      b_place: ['金の丸が交差点。まだ空いているのはどれかな？', '中段の四角の、辺のまん中を見てみて。線が4本集まっているね。', '点から何本の線がのびているか、数えてみて！', '四隅の角は、となりが2つだけ。そこはさけようね。', 'まん中の四角に注目！ 外の四角とも内の四角ともつながる点があるんだ。'],
      b_mill: ['金の丸が、置けばミルになる点。', 'きみの駒が2つ並んでいて、3つ目が空いている線をさがしてみて。', 'たての線も、よこの線も見てね。2つそろっているのはどこかな？', '同じ線の上に、きみの駒が2つ。その残りの1点が答え！', '線を1本ずつ目でなぞってみよう。きみの色が2つの線は？'],
      b_take: ['金の丸がミルの点。そのあと、相手の2つ並びの駒を取ろうね。', '相手があと1つでミルになる線はどれかな？ その2つのどちらかを取るんだ。', 'ミルを作ったら、取る前に相手のねらいを確かめて！', '相手の駒が2つ並んで、3つ目が空いている線はある？', '取るなら、相手の次のミルにつながる駒。どれだろう？'],
      b_block: ['金の丸が、相手が次にミルを作れる点。そこに置いてね。', '相手の駒が2つ並んで、3つ目が空いている線をさがしてみて。', '相手の目線で見てみよう。次に置きたい点はどこかな？', 'きみはまだミルを作れない。なら、先に相手のじゃまを！', '相手の色が2つ並ぶ線、たてとよこの両方を見てごらん。'],
      b_move: ['金の丸がミルになる点。そのとなりにいる、きみの駒を動かしてね。', 'あと1つで並ぶ線の空き点に、線でつながっている駒はどれ？', '動けるのはとなりの空き点だけ。1歩でそろう駒は？', '並んでいる2つを動かしても、3つにはならないんだ。ほかの駒を使おう！', '空き点のとなりを見てみて。きみの駒が待っていないかな？'],
      b_reopen: ['金の丸が、安全に動かせるミルの駒。', '空けた点のとなりに相手の駒がいないミルの駒をさがしてみて。', 'ミルの3つのうち、どれを外へ出す？ 空く点をよく見て！', '開いたすきに相手が入ってこないか、確かめてから動かそうね。', '外へ1歩出て、次に戻る。その道があいている駒はどれかな？'],
      b_fly: ['金の丸が、飛べばミルになる点。', 'ミルの線の駒は動かさずに、残りの1つを飛ばすんだ。', '飛べるから、となりじゃなくてもOK！ あと1つの線はどこ？', '盤のどこへでも行ける！ きみの駒が2つ並んだ線を見つけて。', '3つの駒のうち、線から外れている1つが主役だね。'],
      b_win: ['金の丸が、勝ちになる手で使う点。', '相手が3つなら1つ取れば勝ち。それか、最後の逃げ道をふさぐ手！', '勝ち方は2つ。どちらが使えそうかな？', '相手の駒の数と、動ける点を数えてみて！', 'あと一押し！ 相手がいちばん困る点はどこ？'],
      mill: ['ミルを作ったら、相手の2つ並びの駒か、きみの線をふさぐ駒を取るといいね。', '取ったあと、相手がすぐミルを作れないかも確かめてみて。', 'まずはミルを作れる線をさがそう。きみの駒が2つ並んだのはどこ？', '取る駒を選ぶときは、相手の次のねらいを先に消すのがコツ！', '作れるミルが2つあったら、取ったあとの形がいいほうを！'],
      block: ['相手の駒が2つ並んで、3つ目が空いている線をさがして！', 'ふさいだ駒が、きみの2つ並びにもなる点があればいちばん！', '相手が次に何をしたいか、先に考えてみて！', 'ふさぐ点が2つ見えたら、どっちが急ぎかな？', 'じゃまするだけじゃなく、ふさいだあと動けるかも確かめて！'],
      remove: ['相手がミルを作りかけている駒は、どれかな？', 'きみのねらいの線をふさいでいる相手の駒にも注目！', '取ったあと、相手がすぐミルを作れないか確かめて！', 'ミルの中の駒は、ふつうは取れないんだ。取れる駒の中から選ぼう。', '相手の駒を1つずつ見て、いちばんじゃまなのはどれ？'],
      fork: ['置いたあとに「あと1つでミル」の点が2つできる場所をさがしてね。', '線が交わる点なら、2本の線を同時にねらえるかも！', 'きみの駒が1つずつある線が、2本交わる点はどこかな？', '相手が1手でふさげるのは1か所だけ。それを使おう！', 'ねらいを1つ作るだけじゃ足りない。2つ同時にできる点は？'],
      junction: ['となりの数が多い点や、きみの駒と協力できる点をさがしてね。', '角はとなりが2つだけ。なるべく線の集まる点を！', 'まだミルをいそがなくていい。あとで動きやすい点はどこ？', 'きみの駒のとなりで、線がたくさん通る点はある？', '相手の駒にふさがれにくい場所はどこだろう？'],
      counter: ['相手のミルの点へ行ける駒のうち、動いたあとにきみの2つ並びができるのはどれかな？', 'ふさぐ場所が同じなら、きみの線の上にある点がおすすめ！', 'まず相手のミルの点を見つけて。次に、そこできみが得するか考えよう！', 'ふさぐだけで終わらない手、あるかな？', '守った駒が、そのまま攻めの駒になる場所をさがして！'],
      double: ['今ミルになっている駒のうち、となりへ動くとべつの線が3つになる駒をさがしてね。', '2つのミルのあいだを、1つの駒が行き来できる形を作るんだ。', '1歩動いただけで、べつの線がそろう駒はどれ？', '開けるミルと閉じるミル、両方に関わる点をさがしてみて！', '行ったり来たりするたびに取れる形、見えるかな？'],
      openmill: ['ミルの駒のうち、空けた点に相手の駒が届かないのはどれかな？', '開いた駒が、相手のじゃまもできたら最高！', '空く点のとなりに、相手の駒はいる？', 'ミルを開く向きは、ひとつずつ確かめてみて！', '開いたあと、次の手で戻れる道があいているか見て！'],
      mobility: ['置き終わったとき、きみと相手の駒はそれぞれいくつ動けそうかな？', 'きみの駒のとなりには空き点を残して、相手の駒のとなりはふさごう！', 'ぎゅうぎゅうに固まった駒は、動けなくなりやすいんだ。', '相手の駒のとなりの空き点を、数えてみて！', '動かす時間になったとき、どの駒が働けるかな？'],
      blockade: ['相手の駒が動ける空き点を数えてみて。いくつ残ってる？', '最後の逃げ道に、きみの駒を入れるんだ。', '相手の駒のまわりを1つずつ見てみよう。まだあいている点は？', 'ふさいだあと、きみが空けた点から相手が出られないかも確かめて！', '取るより閉じこめ！ 逃げ道はどこかな？'],
      fly: ['まず相手のねらいを確かめて。ふさぎながら、きみの並びも作れる点は？', 'ふさぐ点が、きみの2つ並びの線の上にあったら一石二鳥！', '飛べるのは強みだけど、相手のミルの点がいちばん先！', '駒が3つしかないから、1手もむだにできないね。', '相手が次にそろえたい点、どこかな？'],
      endgame: ['相手のねらいを防いだうえで、ミルの点を2つ作れるところは？', '飛べる相手でも、一度にふさげるのは1つだけ！', '相手の2つ並びが残っていないか、まず見よう！', 'あと1つで並ぶ線を、2本いっしょに作れる点は？', 'あわてずに。守りを確かめてから攻めよう！'],
      defend: ['相手が次にミルを作れる点はどこかな？ 開け閉めできるミルにも気をつけて。', '動かしたあと、相手の駒がどこへ行けるか数えてみて！', 'ほかの手だと何を取られるか、ひとつずつ考えてみて！', '相手のいちばん強い次の一手は？ それを消す手をさがそう。', 'きみの駒が閉じこめられないかも、忘れずに！'],
      sx_nofly: ['金の丸が、動いてくればミルになる点。', 'ミルの点に、線でつながっているきみの駒はどれかな？', 'シックスでは3つでも飛べない！ となりへ1歩で考えよう。', '空き点のとなりにいる駒を、さがしてみて！', 'きみの駒が2つ並ぶ線の、残り1点を見つけて！'],
      sx_win: ['相手の駒が動ける、最後の空き点をふさいでね。', '相手の駒のとなりの空き点は、もう1つしかないはず！', '相手の駒のまわりを、ぐるっと見てみよう！', '動けなくしたら勝ち。逃げ道はどこ？', '取らなくても勝てるんだ。相手の出口をさがして！'],
      tw_diag: ['金の丸が、置けばななめのミルになる点。', '四隅から内側へのびるななめの線を見てみて。', 'トゥエルブは、ななめの線もミルになるんだ。どこかな？', '角の点どうしを結ぶ線に、きみの駒が2つ並んでない？', 'たて・よこだけじゃなく、ななめも忘れずに！'],
      tw_dblock: ['金の丸が、相手が置けばミルになる点。', 'ななめの線の上に、相手の駒が2つ並んでいない？', '見落としやすいのは、ななめの線！', '相手が次に置きたい点を、先にうめよう！', '角から角へのびる線、相手の色が2つあるのはどれ？'],
    },
  };
  function mrF(E, G, pos, m) {   // what a lesson move does
    const NO = E.NONE, f = E.mFrom(m), t = E.mTo(m), r = E.mRm(m), me = pos.side, o = 3 - me, b = pos.b;
    const pts = (q, side) => { const c = q.clone(); c.side = side; const S = new Set(); for (const x of c.moves()) if (E.mRm(x) !== NO) S.add(E.mTo(x)); return S; };
    const mob = (q, side) => { let n = 0, pc = 0; for (let i = 0; i < G.n; i++) if (q.b[i] === side) { const e = G.adj[i].filter(j => !q.b[j]).length; n += e; if (e) pc++; } return { n, pc }; };   // (steps to empty neighbours: the moving phase's mobility, also while placing)
    const line2 = (q, at, who) => G.mills.some(ml => ml.includes(at) && ml.filter(i => i !== at).filter(i => q.b[i] === who).length === 1 && ml.filter(i => i !== at).some(i => !q.b[i]));   // (at + one more of who's + an empty point)
    const opp0 = pts(pos, o), after = pos.clone(); after.play(m);
    const R = { m, f, t, r, place: f === NO, mill: r !== NO, deg: G.adj[t].length, blocks: opp0.has(t),
      rmThreat: r !== NO && line2(pos, r, o), rmBlock: r !== NO && G.mills.some(ml => ml.includes(r) && ml.filter(i => i !== r).every(i => b[i] === me)),
      win: after.status() === -1, oppNow: pts(after, o).size, oppBefore: opp0.size, myNext: pts(after, me).size,
      oppMob: mob(after, o), myMob: mob(after, me), enter: f !== NO && after.moves().some(x => E.mTo(x) === f), back: f !== NO && after.b[f] === 0 };
    R.opened = f !== NO && pos.inMill(f) && !R.mill;
    R.reply = () => { if (R._r) return R._r; let fork = false; if (!R.win) for (const y of after.moves()) { if (E.mRm(y) !== NO) continue; const z = after.clone(); z.play(y); if (pts(z, o).size >= 2 && !pts(z, me).size) { fork = true; break; } } return (R._r = { fork }); };   // (the opponent's answer: two mill points at once, none for you)
    return R;
  }
  // (2026-11-22 lesson loop) モリフク's voice for one lesson: praise / soft words / push on, each lesson in an order of its own (mrVoice);
  // every sentence below has five wordings, taken by the problem's number, so no line comes twice in a lesson
  const MR_V = {
    cheer: ['ホー、いいね、それ！', 'さすが！', 'ばっちり！', 'お見事！', 'やった！ 正解！', 'ナイス！', 'すごい、正解！', 'そうそう、それ！', 'いい目してる！', 'ホー、上手！', '完璧！', 'よく見つけた！'],
    soft: ['そこも見えてたら、あと少し！', '大丈夫！', 'ドンマイ！', 'あと一歩！', 'いい線いってた！', 'ホー、今度こそ！', '気にしない、気にしない！', 'よくある見落とし！', '次は見つけられるはず！', 'いっしょに確かめよう！', 'これで覚えちゃおう！'],
    push: ['この調子で次も行こう！', 'どんどん行こう！', 'その勢いで次へ！', '次も見せて！', 'まだまだいける！', 'わかってきたね、続けよう！'],
  };
  function mrVoice(n) { const a = [1, 5, 7, 11][Math.floor(n / 12) % 4], b = n % 12, a2 = 1 + Math.floor(n / 11) % 10, b2 = n % 11;
    return { cheer: i => MR_V.cheer[(a * i + b) % 12], soft: i => MR_V.soft[(a2 * i + b2) % 11], push: i => MR_V.push[(i + n) % 6] }; }
  function mrLsJa(E, s, P, i, ck, n) {
    const id = s.id, A0 = MRJ_LS.ask[id]; if (!A0) return null; n = n || 0;
    const pk = (L, o) => L[(i + n + (o || 0)) % L.length], H = MRJ_LS.hint[id] || [], VO = mrVoice(n);
    const G = E.geom(s.v), pos = E.Pos.from(G, P.s), M = ck('ok'), X = ck('ng');
    const f = x => x.replace(/\{m\}/g, M).replace(/\{x\}/g, X), fg = x => f(x.replace(/\{x\}/g, pos.placing() ? 'そこ' : 'その手'));
    const ok = P.ok || [P.best], okS = new Set(ok), A = P.best != null ? P.best : ok[0];
    const FF = u => { try { return mrF(E, G, pos, u); } catch (e) { return null; } }, FA = FF(A);
    const V = P.sc ? new Map(P.sc) : null, vBest = V ? Math.max(...P.sc.map(e => e[1])) : 0;
    const right = u => P.sc && !P.ok ? V.has(u) && V.get(u) >= vBest - 6 && !(vBest > E.WINT && V.get(u) < vBest) : okS.has(u);
    const wrongs = () => pos.moves().filter(x => !right(x));
    const alt = (u, pref) => { if (u != null && !right(u) && pos.moves().includes(u)) return u; const W = wrongs(); if (pref) for (const x of W.slice(0, 200)) { const Q = FF(x); if (Q && pref(Q)) return x; } return W[0]; };
    const hintTx = H.length ? pk(H) : '';
    const deg = d => d >= 4 ? '交差点' : d === 3 ? '辺のまん中' : '角';
    const V2 = u => V && V.has(u) ? V.get(u) : null;
    const lost = u => { const v = V2(u); return v != null && v < -E.WINT && vBest >= -E.WINT; }, missW = u => { const v = V2(u); return v != null && vBest > E.WINT && v <= E.WINT; };
    const loss = u => lost(u) ? pk(['最後まで進めると、負けにつながっちゃう。', 'このまま進むと、負けの形になるの。', '先まで読むと、きみが負ける流れなんだ。', 'その先は、負けにつながる道。', '読みきると、相手の勝ちになっちゃう。'])
      : missW(u) ? pk(['最後まで読むと勝てたのに、それを逃しちゃうんだ。', '勝ちきれる場面だったのに、もったいない！', '勝ちまで読める局面なのに、その道からそれちゃう。', '勝ちの道からはずれちゃうの。', '正しく進めば勝てたのに、チャンスを逃すんだ。']) : '';
    // the one thing the wrong move misses, against the right one (most telling first)
    const why = (G2, u) => {
      const W = FA, c = G2.oppNow, nm = G2.myNext, om = G2.oppMob.n, mm = G2.myMob.n;
      if (W.win && !G2.win) return pk(['{x}だと、まだ勝ちにならないの。', '{x}では勝負が決まらないんだ。', '{x}のあとも、相手はまだ戦えちゃう。', '{x}だと決めきれないの。相手にもう1手わたしちゃう。', '勝てる場面なのに、{x}では勝ちを逃しちゃう。']);
      if (c > 0 && W.oppNow === 0) return pk([`{x}だと相手のミルの点が${c > 1 ? c + 'つも' : ''}空いたまま。次の手でミルにされて、駒を取られちゃう。`, `{x}のあと、相手は${c > 1 ? c + 'か所の' : '空いた'}ミルの点に入れるの。そうしたら駒を1つ取られちゃうね。`, '{x}では相手の2つ並びがそのまま。次にそろえられて、駒を取られるんだ。', `{x}を指すと、相手にミルを作られる点が${c > 1 ? c + 'つ' : ''}残っちゃう。取られるのはきみの駒！`, '相手の2つ並びを放っておいたのが{x}の弱いところ。そろえられたら1つ取られちゃう。']);
      if (W.mill && !G2.mill) return pk(['{x}だとミルにならないから、相手の駒を取れないね。', '{x}では3つそろわないの。駒を取るチャンスを逃しちゃう。', '{x}だと線がそろわず、相手の駒は減らないんだ。', '{x}だと、相手の駒の数はそのまま。ミルを作れる場面だったの。', 'せっかくミルを作れるのに、{x}だとそろわないの。']);
      if (W.mill && G2.mill && W.rmThreat && !G2.rmThreat) return pk(['{x}で取った駒は、相手の2つ並びとは関係ないの。相手のねらいが残っちゃう。', '{x}の取り方だと、相手の2つ並びが残って、次にミルを作られちゃう。', '{x}で取ったのは、ねらいのない駒。相手のミルの点はまだ生きているの。', '{x}だと、相手が作りかけのミルをそのまま進められちゃう。', '取る駒がずれちゃった。{x}では、相手の2つ並びが消えないんだ。']);
      if (W.mill && G2.mill && W.rmBlock && !G2.rmBlock) return pk(['{x}で取った駒より、きみの線をふさいでいる駒を取ったほうが得だったね。', '{x}だと、きみの線をふさぐ相手の駒が残っちゃう。', '{x}の取り方では、きみの2つ並びがふさがれたままなの。', 'きみのねらいの線にじゃまな駒がいたのに、{x}ではそれが残るんだ。', '{x}だと、きみの次のミルの道がひらけないの。']);
      if (c > W.oppNow) return pk(['{x}のあと、相手にミルの点が残っちゃう。', '{x}だと、相手がそろえられる点ができちゃうの。', '{x}を指すと、相手のミルのねらいが生まれるんだ。', '{x}のすきに、相手は次のミルをねらえちゃう。', '{x}だと、相手の2つ並びの3つ目があいてしまうの。']);
      if (W.myNext >= 2 && nm < 2) return pk([`{x}だと、きみのミルの点は${nm ? '1つだけ' : 'できない'}。相手にふさがれて終わりなんだ。`, '{x}では両取りにならないの。相手は1手でしのげちゃう。', '{x}のあと、相手がふさぐ点は1つで足りちゃう。ねらいが2つあれば止められなかったのに。', '{x}だと、ねらいが2本立たないの。相手にかんたんに守られちゃう。', `ミルの点を2つ作れる場面なのに、{x}だと${nm ? '1つしか' : '1つも'}できないの。`]);
      if (W.oppMob.n === 0 && om > 0) return pk([`{x}だと、相手の駒にまだ逃げ道が${om}つ残るの。`, `{x}のあとも、相手はまだ${om}か所へ動けちゃう。`, `{x}では閉じこめきれないね。相手の逃げ道が${om}つあるんだ。`, `{x}だと、相手の駒が動ける道が${om}本残っちゃう。`, `相手を動けなくできるのに、{x}だと逃げ道が${om}つ残るの。`]);
      if (G2.enter && !W.enter) return pk(['{x}で空けた点に、相手の駒が入ってこられるの。ミルを閉じなおせなくなっちゃう。', '{x}だと、空いた点に相手がとなりから入ってきちゃう。', '{x}で開くと、相手にすき間をふさがれるの。戻ってもミルにならないね。', '{x}のあと、相手はあいた点にすべりこめるんだ。', '{x}だと開いた口を相手にふさがれて、もう一度のミルが作れないの。']);
      if ((lost(u) || V2(u) != null && V2(u) < vBest - 150) && G2.reply().fork && !W.reply().fork) return pk(['{x}のあと、相手にミルの点を2つ同時に作られちゃう。片方しかふさげないね。', '{x}だと、相手に両取りの形を作られるの。', '{x}を指すと、相手は次にねらいを2つ作れちゃう。1手では守りきれないね。', '{x}のすきに、相手がミルの点を2つ並べてくるの。', '{x}だと、相手の両取りが待っているんだ。']);
      if (mm < W.myMob.n - 1) return pk([`{x}だと、きみの駒が動ける道が${mm}本に減って、閉じこめられやすくなるの。`, `{x}のあと、きみの駒の動ける道は${mm}本だけ。動かす時間に苦しくなるんだ。`, `{x}では、きみの駒がかたまって、動ける道が${mm}本しか残らないの。`, `{x}だと、きみの逃げ道が${mm}本まで減っちゃう。`, `{x}を指すと、きみの駒の動ける道が${mm}本になるの。閉じこめられる心配が出てくるね。`]);
      if (om > W.oppMob.n + 1) return pk([`{x}だと、相手の駒の動ける道が${om}本も残るの。`, `{x}のあと、相手はまだ${om}本の道で自由に動けちゃう。`, `{x}では相手の動きをしばれないね。道が${om}本あるんだ。`, `{x}だと、相手に${om}本の動ける道をわたしちゃう。`, `{x}では、相手の駒が${om}本の道を使えるの。`]);
      if (W.myNext > nm) return pk(['{x}だと、きみのねらいの線が1本少なくなるの。', '{x}のあと、ミルをねらえる点が1つ減っちゃう。', '{x}では、次にねらえるミルが少ないんだ。', '{x}を指すと、きみの攻めの線が1本へるの。', '{x}だと、次にそろえたい点が1つ足りないの。']);
      if (W.place && G2.place && W.deg > G2.deg) { const d = deg(G2.deg), k = G2.deg; return pk([`{x}は${d}で、となりが${k}つしかないの。`, `{x}の${d}は、となりが${k}つだけ。あとで動きにくい点なんだ。`, `{x}だと、となりの点が${k}つで、線の集まりが少ないの。`, `{x}は${d}だから、出口が${k}つしかないね。`, `{x}は${d}だから、となりが${k}つしかなくて、閉じこめられやすいの。`]); }
      return lost(u) || missW(u) ? pk(['{x}だと、相手に形を立てなおされて苦しくなるの。', '{x}のあと、相手に流れをわたしてしまうの。', '{x}では、相手の反撃がきびしくなるんだ。', '{x}だと、このあとの戦いで押しこまれちゃう。', '{x}を指すと、少しずつ苦しい形になっていくの。'])
        : pk(['{x}も悪くないけど、ねらいの線や動ける道で少し見劣りするの。', '{x}も一手だけど、くらべると少し働きが弱いの。', '{x}も考えられる手。でも、動ける道とねらいで少し損なんだ。', '{x}だと、ねらいの線の数で少し差がつくの。', '{x}でも戦えるけど、駒の働きがわずかに落ちるの。']);
    };
    const PL = {
      win: ['その場で勝ちになる', 'この手で勝負が決まる', '相手はもう戦えなくなる', 'すぐに勝ちが決まる', 'ここで勝ちきれる'],
      rmT: ['ミルを作って、相手の2つ並びもくずせる', '3つそろえて、相手のねらいの駒を取れる', 'ミルと同時に、相手の次のミルも消せる', '駒を取りながら、相手の作りかけのミルをこわせる', 'ミルで取る駒が、相手の2つ並びの片方になる'],
      rmB: ['ミルを作って、きみの線をふさぐ駒も取れる', '3つそろえて、じゃまな相手の駒をどかせる', 'ミルのついでに、きみの線のふさがりを取りのぞける', '駒を取って、きみの次の線もひらける', 'ミルで、きみのねらいの線をあけられる'],
      mill: ['ミルを作って駒を1つ取れる', '3つそろえて相手の駒を減らせる', 'ミル完成で1枚いただける', '線がそろって、相手の駒が1つ減る', 'ここでミルにして取れる'],
      blk: ['相手のミルの点をふさげる', '相手の3つ目の点に先回りできる', '相手の次のミルを止められる', '相手の2つ並びを使えなくできる', '相手のねらいの点をうめられる'],
      two: ['ミルの点が2つできて、相手は両方ふさげない', 'ねらいが2つ立って、相手は1つしか止められない', '次にミルになる点が2か所できる', '両取りの形になって、相手は守りきれない', '相手がどちらをふさいでも、もう片方でミルになる'],
      one: ['次はきみがミルをねらえる', 'あと1つでミルの線ができる', '次の手でそろえるねらいが生まれる', '攻めの線が1本できる', '相手にふさぐ手を考えさせられる'],
      open: ['空けた点に相手が入れない', '開いたすき間を相手がふさげない', '次に戻ればまたミルにできる', '相手に割りこまれずにミルを開ける', '安全にミルを開ける'],
      shut: ['相手はもう動けない', '相手の逃げ道がなくなる', '相手の駒を閉じこめられる', '相手の動ける点がゼロになる', '相手を身動きできなくできる'],
      myM: ['きみの駒の動ける道を残せる', 'きみの駒が動きやすい形を保てる', 'きみの駒が閉じこめられにくくなる', '動かす時間に使える道が多く残る', 'きみの駒に逃げ道を残せる'],
      opM: ['相手の駒の動ける道をへらせる', '相手の駒の動きをしばれる', '相手の逃げ道をせまくできる', '相手の駒を窮屈にできる', '相手の動ける点を少なくできる'],
      base: ['駒の動ける道とねらいの線を、いちばん多く残せる', 'ねらいと動きやすさのバランスがいちばんいい', '攻めと守りの両方に駒が働く', 'このあとの戦いでいちばん形がいい', '駒の働きをいちばん生かせる'],
    };
    const plus = (W, Q, o) => { const t = [], p = k => t.push(pk(PL[k], o));
      if (W.win) p('win');
      else if (W.mill) p(W.rmThreat ? 'rmT' : W.rmBlock ? 'rmB' : 'mill');
      else if (W.blocks) p('blk');
      if (!W.win && W.myNext >= 2) p('two');
      else if (!W.win && W.myNext === 1 && !W.mill) p('one');
      if (!W.win && W.opened && !W.enter) p('open');
      if (!W.win && W.oppMob.n === 0) p('shut');
      else if (!W.win && Q && W.myMob.n > Q.myMob.n + 1) p('myM');
      else if (!W.win && Q && W.oppMob.n < Q.oppMob.n - 1) p('opM');
      return t.slice(0, 2).join('し、') || pk(PL.base, o); };
    const tail = Q => { const p = plus(FA, Q, 2); return pk(['{m}なら、' + p + 'から。', '{m}を選べば、' + p + 'んだ。', '正解は{m}。' + p + 'のがポイント！', '{m}のほうは、' + p + 'の。', '{m}に指せば、' + p + '。'], 3); };
    const say = (u0, pref) => { const u = alt(u0, pref), G2 = u != null ? FF(u) : null; const w = G2 ? why(G2, u) : ''; const l = /苦しく|見劣り|流れを|反撃|押しこ|働き|損なんだ|差がつく/.test(w) ? '' : G2 ? loss(u) : ''; const t = tail(G2); return f(w + ((w + l + t).length > 125 ? '' : l) + t); };
    let good, ng;
    const own = u => (u != null && right(u) && FF(u)) || FA;
    switch (id) {
      case 'b_place': case 'junction': {
        good = u => { const W = own(u); return fg(W.deg >= 4 ? pk(['{x}はとなりが4つの交差点。いちばん線が集まる場所だね。', '交差点はとなりが4つあるから、ミルにも守りにも使えるんだ。', '{x}から4方向へ線がのびているね。', '4つの点とつながる交差点を取れたね。動かす時間にも強い！', 'となりが4つ。盤でいちばん頼れる点だね。'])
          : pk([`{x}は${deg(W.deg)}だけど、きみの駒と協力できる点なんだ。`, '{x}は先を見た好点。読みが深いね。', 'あとでミルにも守りにも使える場所だね。', 'きみの駒どうしがつながる、いい置き場所だね。', '相手にふさがれにくくて、あとで生きる点なんだ。'])); };
        ng = u => { const v = alt(u, Q => Q.deg < FA.deg), Q = FF(v); const a = deg(Q.deg), b = deg(FA.deg), x = Q.deg, y = FA.deg;
          return f(FA.deg > Q.deg ? pk([`{x}は${a}で、となりは${x}つだけ。{m}は${b}だから、となりが${y}つもあるんだ。`, `{x}から出られる線は${x}本しかないの。{m}なら${y}本の線が集まっているから、ずっと動きやすいね。`, `{m}の点はとなりが${y}つ。{x}の${a}はとなりが${x}つだから、あとで閉じこめられやすいんだ。`, `{x}は${a}だから、駒を動かす道が${x}本だけ。{m}を選べば、${y}方向に動けたの。`, `となりの数をくらべてみよう。{x}は${x}つ、{m}は${y}つ。多いほど動ける道が残るから、{m}が強い点なんだ。`]) : why(Q, v) + tail(Q)); };
        break; }
      case 'b_mill': case 'b_move': case 'b_fly': case 'sx_nofly': case 'tw_diag': {
        const how = id === 'b_move' || id === 'sx_nofly' ? '1歩動かして' : id === 'b_fly' ? '飛んで' : '置いて', dg = id === 'tw_diag' ? 'ななめに' : '';
        good = () => fg(pk([`${how}${dg}3つ並んでミル！ 相手の駒を1つ取れたね。`, id === 'tw_diag' ? 'ななめの線も、ちゃんとミルになるんだ。見落とさなかったね。' : '2つ並んだ線の3つ目に入れたのがよかったね。', '線がぴったりそろったね。これで相手の駒が1つ減るんだ。', `${dg ? 'ななめの' : 'きみの'}2つ並びを見のがさなかったね。ミル完成！`, '3つそろった瞬間に、相手の駒を1つ取れるんだ。']));
        ng = u => { const v = alt(u, Q => !Q.mill), Q = FF(v);
          return f(Q.mill ? why(Q, v) + tail(Q) : pk([`{x}だと3つ並ばないから、ミルにならないの。{m}なら、${how}${dg}3つそろうから。`, `{x}では線がそろわないね。{m}を選べば、${how}ミルになったんだ。`, `{x}の線には、きみの駒が足りないから、3つそろわないの。{m}は、きみの2つ並びの残りの1点なんだ。`, `{x}だと駒は並ばず、相手の駒も取れないの。{m}へ${how}いれば、ミルで1つ取れたね。`, `{m}が、きみの2つ並びの3つ目。{x}はその線から外れているから、そろわないの。`])); };
        break; }
      case 'b_take': {
        good = () => fg(pk(['ミルを作りながら、相手の2つ並びもくずせたね。一石二鳥！', 'これで相手は次のミルを作れないんだ。', '相手のねらいの駒を取ったから、ひと安心だね。', '取る駒の選び方がばっちり。相手の作りかけのミルが消えたんだ。', 'ミルで取ったのが、相手のミルの材料だったね！']));
        ng = u => { const v = alt(u, Q => Q.mill && !Q.rmThreat), Q = FF(v);
          return f(!Q.mill ? pk(['{x}だとミルにならないから、駒を取れないの。{m}でミルを作って、相手の2つ並びの駒を取るんだ。', '{x}では3つそろわないの。{m}ならミルで1つ取れて、相手のねらいも消せたから。', '{x}だと駒を取るチャンスがないの。{m}でそろえて、相手の2つ並びをくずそう。'])
            : pk(['{x}で取った駒は、相手の2つ並びとは関係ないの。次に相手にミルを作られちゃう。{m}なら、ミルと同時に相手のねらいも消せたから。', '{x}の取り方だと、相手の2つ並びが残るの。{m}なら、相手の次のミルの材料を取れたんだ。', '{x}で取ったのは、ねらいのない駒で、相手のミルの点が残るの。{m}を選べば、それごと消せたんだ。', '取る駒がずれちゃった。{x}だと相手の2つ並びが生きたまま。{m}なら、その片方を取れたから。', '{m}は、相手が作りかけのミルの駒を取る手。{x}だと、そのミルが次に完成しちゃう。'])); };
        break; }
      case 'b_block': case 'tw_dblock': {
        const dg = id === 'tw_dblock' ? 'ななめの' : '';
        good = () => fg(pk(['これで相手はミルを作れないね。', '相手の3つ目の点に先回りできたね。ひと安心！', 'ふさいだから、駒を取られずにすむんだ。', `相手の${dg}2つ並びを、しっかり止めたね。`, '相手のねらいを先に読めたね。守りはばっちり！']));
        ng = u => { const v = alt(u, Q => Q.oppNow > 0); return f(pk([`{x}だと相手の${dg}2つ並びの3つ目が空いたまま。次にそこへ置かれてミル、駒を取られちゃう。{m}でその点をふさげば守れたから。`, `{m}は、相手の${dg}2つ並びの3つ目。{x}ではそこが空くから、次の手でミルにされちゃうの。`, `{x}のあと、相手は${dg}3つ目に置いてミル。きみの駒が1つ取られるんだ。{m}に置けば止められたね。`, `相手の${dg}ミルのねらいが残るのが{x}の弱いところ。{m}を先にうめれば、取られずにすんだの。`, `{x}だと守りが間に合わないの。{m}なら、相手の${dg}線を先にふさげたから。`])); };
        break; }
      case 'b_reopen': {
        good = () => fg(pk(['空けた点に相手は届かないね。次に戻せば、またミルなんだ。', '相手が割りこめないから、次の手でまた取れるね。', 'これで同じミルを何度でも使えるんだ。', '開いた口のまわりに相手の駒がいない、安全な開き方だね。', '外へ出て、戻ればまたミル。いい開き方を選べたね。']));
        ng = u => { const v = alt(u, Q => Q.enter || Q.oppNow > 0), Q = FF(v);
          return f(Q.oppNow > 0 ? pk(['{x}だと、相手にミルの点をわたしちゃう。開いたすきに駒を取られるんだ。{m}なら、空いた点に相手が入れないから。', '{x}で開くと、相手にミルを作られる点ができちゃう。{m}を選べば、相手は何もできなかったの。', '{x}のすきに、相手がミルをそろえてくるの。{m}なら安全に開けたんだ。', '{m}は相手にねらいを与えない開き方。{x}だと、相手のミルの点があいちゃうの。', '{x}だと開いたとたんに相手の番でミル。{m}なら、相手が届かないから安全だったね。'])
            : Q.enter ? pk(['{x}で空けた点には、相手の駒がとなりから入れるの。ふさがれたら閉じなおせないね。{m}なら、相手が届かないから。', '{x}だと、すき間に相手がすべりこめるの。{m}を選べば、戻ってまたミルにできたんだ。', '{x}の開き方だと、空いた点のとなりに相手の駒がいるの。{m}なら、そのすき間はだれも入れないから。', '{m}は相手の駒から遠い側を開ける手。{x}だと、空いた点を相手にうめられちゃう。', '{x}で開くと、相手にふたをされるの。{m}なら、次の手でミルを閉じなおせたね。'])
            : pk(['{x}だと、次の手でミルを閉じなおせないの。{m}なら、戻ればまたミルになるから。', '{x}では、次の手でもう一度ミルを作る形にならないの。{m}なら、1歩出て戻るだけでまたミルになったから。', '{x}では同じミルを使いなおせないね。{m}を選べば、戻ってまた取れたんだ。'])); };
        break; }
      case 'b_win': case 'sx_win': {
        good = () => fg(FA.mill ? pk(['相手の駒が2つになって、きみの勝ち！', 'ミルで最後の1つを取ったね。勝負あり！', '3つ目をそろえて、相手は2つだけ。きみの勝ち！', 'ミルで決めた！ 相手はもう戦えないんだ。', '最後のミル、決まったね！'])
          : pk(['相手はどの駒も動けない。きみの勝ち！', '閉じこめ成功！ 相手の逃げ道がなくなったね。', '最後の逃げ道をふさげたね。勝負あり！', '駒を取らずに決着！ 相手は1歩も動けないね。', '出口をぜんぶふさいで、きみの勝ち！']));
        ng = u => { const v = alt(u, Q => !Q.win), Q = FF(v), r = Q.oppMob.n || 1;
          return f(FA.mill ? pk([(Q.mill ? '{x}だと、まだ勝ちにならないの。' : '{x}だとミルにならないから、相手の駒は3つのまま。') + '{m}ならミルで1つ取って、相手の駒が2つになるから。', '{x}では相手の駒が減らないの。{m}で3つそろえれば、相手は2つになって勝ちだったんだ。', '{m}がミルになる点。{x}だと決めきれず、相手にもう1手わたしちゃう。', '{x}のあとも、相手の駒は3つ残るの。{m}を選べば、ミルで最後の1つを取れたね。', '{x}だと勝ちを逃しちゃうの。{m}なら、そろえて取って、その場で勝ちだから。'])
            : pk([`{x}だと、相手の駒にまだ逃げ道が${r}つ残るの。{m}なら、最後の逃げ道がふさがって動けなくなるから。`, `{x}のあとも、相手は動けちゃう。{m}が最後の出口をふさぐ手だったんだ。`, `{m}は相手の最後の逃げ道。{x}だと、そこから相手が出られるの。`, `{x}では閉じこめきれないね。{m}に入れば、相手は1歩も動けなかったから。`, `{x}だと相手の出口が${r}つ残るの。{m}で最後の1つをふさげば勝ちだったんだ。`])); };
        break; }
      default: {   // (the engine-scored steps)
        const FR = ['この一手で、{p}んだ。', '{p}のが、この手のいいところ！', 'そこなら、{p}。', 'これで{p}。よく見えてる！', '{p}。読みがしっかりしてる！'];
        good = u => { const W = own(u), oth = wrongs().slice(0, 60).map(FF).filter(Boolean), Qm = oth.length ? { myMob: { n: Math.round(oth.reduce((a, q) => a + q.myMob.n, 0) / oth.length) }, oppMob: { n: Math.round(oth.reduce((a, q) => a + q.oppMob.n, 0) / oth.length) } } : null;   // (mobility against the other moves on average)
          return fg(pk(FR).replace('{p}', plus(W, Qm))); };
        ng = u => say(u, Q => Q.oppNow > 0 || (FA.mill && !Q.mill) || Q.enter);
      }
    }
    const g0 = good, n0 = ng, pu = i % 2 === 1;
    return { ask: pk(A0), hintTx, good: (...a) => VO.cheer(i) + ' ' + g0(...a) + (pu ? ' ' + VO.push(i) : ''), ng: (...a) => VO.soft(i) + ' ' + n0(...a), own: true };
  }
  const MORRIS = {
    LKEY: 'aicoding-morris-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([Promise.all(MMV.map(v => getJ(`../morris/lessons${v === 'nine' ? '' : '-' + v}.json?v=20261123`))), Promise.all(['../morris/i18n.js?v=20261116', '../morris/i18n_more.js?v=20261116'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n')), mrEng().catch(() => null)])
        .then(([L, T]) => { const w = {}; try { new Function('window', T)(w); } catch (e) { console.warn('[lessons3d] morris texts', e); } this.I = w.I18N || {};
          const steps = []; L.forEach((d, k) => d.steps.forEach(s => { if (s.problems && s.problems.length) steps.push(Object.assign({ v: MMV[k] }, s)); })); this.data = { steps }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    list(kind, lang) {
      const pr = J(this.LKEY, {});
      return this.data.steps.map((s, i) => { const r = pr[MMPRE(s.v) + s.id], P = s.problems[0];
        return { key: String(i), cat: s.v + ':' + s.course, catName: (s.v !== 'nine' ? this.tx('title.' + s.v, lang) + '・' : '') + (this.tx('course.' + s.course, lang) || s.course), title: this.tx('ls.' + s.id + '.title', lang), sub: this.tx('ls.' + s.id + '.sub', lang),
          svg: P && window.AtlasMini && AtlasMini.morris ? AtlasMini.morris({ v: s.v, b: P.s.b }) : '', st: r ? (r.clear ? 'pass' : 'try') : '', full: false }; });
    },
    lesson(key, lang) {
      const s = this.data.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), sp = { m: TFM('ok', lang), x: TFM('ng', lang) };
      return { id: s.id, title: T('title'), intro: lang === 'ja' && MRJ_LS.intro[s.id] || noCoord(T('intro')), ramp: null,
        probs: s.problems.map(P => { const me = P.s.side === 2 ? 2 : 1, ans = P.best != null ? P.best : P.ok[0], good = P.ok || [ans];
          const pts = [...new Set(good.map(m => s.id === 'b_reopen' || MF(m) !== MN && !P.ok ? MF(m) : MT(m)))];
          return { pos: { spec: { v: s.v, s: P.s }, me }, kind: 'best', P, me, ask: noCoord(T('goal')), ans, hintTx: noCoord(T('hint')), hint: pts,
            why: '', good: () => noCoord(T('why', sp)), ng: () => noCoord(P.ok ? T('ng', sp) || T('why', sp) : T('why', sp)) }; }).map((o, i) => { if (lang === 'ja' && window.MorrisEngine) try { Object.assign(o, mrLsJa(window.MorrisEngine, s, o.P, i, k => TFM(k, lang), +key) || {}); } catch (e) { console.warn('[lessons3d] morris lesson', e); } return o; }),   // (2026-11-21 lesson loop: モリフク's question, hint, why / what yours misses)
        save: (pts, max) => { const pr = J(this.LKEY, {}), k = MMPRE(s.v) + s.id, o = pr[k] || { best: 0, clear: false }, pass = pts >= max * .75; pr[k] = { best: Math.max(o.best || 0, Math.round(pts / max * 100)), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, m) {   // (= morris/index.html problemPoints)
      if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const WIN = 30000, WINT = 29000, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : Math.tanh(v / 320) * 0.82;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
      if (mine >= best - 6 && !(best > WINT && mine < best)) return 20;
      if (best > WINT && mine > WINT) return 16;
      if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0;
      if (mine < -WINT && best >= -WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5)));
    },
    introPos(c) { const s = this.data.steps.find(x => x.id === c.id), P = s && s.problems[0]; return P ? { pos: { spec: { v: s.v, s: P.s }, me: P.s.side === 2 ? 2 : 1, lock: true } } : null; },
  };
  /* dots & boxes (2026-11-16): dots/lessons.json (15 steps; problem 0 is the worked example, the next five are played) — one line each,
     scored by rank among the solver's values (= dots/learn.js rankPoints); after the line, back to the problem with the best line green
     and yours red. Progress = the full game's ('dots-lessons-v2' { id: { best, clear } }). Texts: dots/i18n.js + i18n-learn.js + the long
     texts content/text.<lang>.json (a sandbox). The hint: the safe lines in gold (the steps about safe lines) or the step's words. */
  const DK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const dDecE = x => [...x].map(c => DK.indexOf(c)), dDecO = x => [...x].map(c => c === '.' ? -1 : +c), dDecV = x => [...x].map((c, e) => c === '.' ? null : [e, DK.indexOf(c) - 30]).filter(Boolean);
  const dRank = (vals, mine) => { const d = [...new Set(vals.map(x => x[1]))].sort((a, b) => b - a); if (d.length <= 1) return 20; const i = d.indexOf(mine); return i < 0 ? 0 : i === 0 ? 20 : Math.min(15, Math.max(0, Math.round(20 * (d.length - 1 - i) / (d.length - 1)))); };   // (= dots/learn.js rankPoints: a worse line never reaches 16)
  const dSafe = (n, edges) => { const HN = (n + 1) * n, E = HN + n * (n + 1), on = new Set(edges), be = bx => { const r = Math.floor(bx / n), c = bx % n; return [r * n + c, (r + 1) * n + c, HN + r * (n + 1) + c, HN + r * (n + 1) + c + 1]; };
    const cnt = bx => be(bx).filter(e => on.has(e)).length, eb = e => { const o = []; for (let bx = 0; bx < n * n; bx++) if (be(bx).includes(e)) o.push(bx); return o; };
    const out = []; for (let e = 0; e < E; e++) if (!on.has(e) && eb(e).every(bx => cnt(bx) < 2)) out.push(e); return out; };
  /* (2026-11-21 lesson loop) dots in Japanese: ハコピヨ's own intro / questions / hints / tips (short, no coordinates), and the
     feedback from the position itself — dFacts: boxes a line takes (k), boxes it hands over (m: the opponent's run of captures),
     an end-opened 2-chain (ret: the opponent can hand it back), the safe lines left (ns). Right → the reason; wrong → the green line,
     what the red one overlooks, and the boxes it costs ((best − v) / 2, as dots/learn.js finalAt). */
  const dFacts = (n, edges) => { const HN = (n + 1) * n, E = HN + n * (n + 1), be = bx => { const r = Math.floor(bx / n), c = bx % n; return [r * n + c, (r + 1) * n + c, HN + r * (n + 1) + c, HN + r * (n + 1) + c + 1]; };
    const ob = []; for (let e = 0; e < E; e++) ob.push([]); for (let bx = 0; bx < n * n; bx++) be(bx).forEach(e => ob[e].push(bx));
    const cnt = (on, bx) => be(bx).filter(e => on.has(e)).length, cap = on => { for (let bx = 0; bx < n * n; bx++) if (cnt(on, bx) === 3) return bx; return -1; };
    const run = on => { on = new Set(on); let t = 0, bx; while ((bx = cap(on)) >= 0) { const e = be(bx).find(x => !on.has(x)); t += ob[e].filter(b => cnt(on, b) === 3).length; on.add(e); } return t; };
    const on0 = new Set(edges); let ns = 0; for (let e = 0; e < E; e++) if (!on0.has(e) && ob[e].every(bx => cnt(on0, bx) < 2)) ns++;
    const hasCap = cap(on0) >= 0;
    return { hasCap, ns, of(e) { const k = ob[e].filter(bx => cnt(on0, bx) === 3).length, on = new Set(on0); on.add(e); let three = 0; for (let bx = 0; bx < n * n; bx++) if (cnt(on, bx) === 3) three++;
      const m = k ? 0 : run(on), cls = k ? 'take' : hasCap ? 'decline' : m ? 'give' : 'safe'; let n2 = 0; for (let f = 0; f < E; f++) if (!on.has(f) && ob[f].every(bx => cnt(on, bx) < 2)) n2++;
      return { k, m, cls, ret: cls === 'give' && m === 2 && three === 1, edge: ob[e].length === 1, n2 }; } };   // (edge: an outer line, one box; n2: the safe lines left after it)
  };
  /* (2026-11-22 lesson loop) ハコピヨ's own words for each step: a short intro, five questions and five hints (DTJ), and after the
     answer his praise + why, or for a miss a soft word, the green line's point and what the red one costs — read from the board
     (dFacts) — with cheers that change order in each lesson (DT_CH). */
  const DTJ = {
    safe: { intro: '箱の<b>4本目</b>を引くと、その箱がもらえる。だから<b>3本目</b>は相手へのプレゼント！ 3本目を作らない線が<b>安全な線</b>。',
      ask: ['相手に箱をあげない線を引いてみて！', '3本目を作らない線、どこにあるかな？', 'どの箱にもプレゼントしない1本はどれ？', 'こんどの盤はどう？ 安全な線を探してみて！', '最後の1問！ 安全な線はどこだろう？'],
      hint: ['金色の輪の線なら、引いても箱は3本目にならないんだ。', '2本引いてある箱の辺は避けよう！ 残りから探してみて。', '線のとなりの箱で、引いてある線を数えてみよう！', '0本か1本の箱の辺なら、引いても平気だよ。', '光っている線のどれかが答え。迷ったら箱ごとに数えて！'] },
    third: { intro: '盤が広くなると、2本引いた箱があちこちにできる。<br>内がわの線は<b>2つの箱</b>にまたがるから、片方が平気でも、もう片方が2本ならアウト！ 線の<b>両がわ</b>を見るクセをつけよう。',
      ask: ['箱をあげない線を引いてみて！', 'うっかり3本目にならない線は？', '両がわの箱が平気な線、見つかる？', 'この広い盤で、安全な1本はどれかな？', 'ラスト！ 3本目を作らない線を引いてね。'],
      hint: ['線の両がわの箱を数えてみて！ どっちかが2本ならアウト。', '内がわの線は箱2つぶん。両方とも1本以下かな？', '外がわの線なら、箱1つだけ見ればいいから数えやすい！', '金色の輪がついた線は、両がわとも安全なんだ。', '片方の箱だけ見て安心しないでね！'] },
    take: { intro: '3本で囲まれた箱は、4本目で取れる。取ったらもう1回引けるから、<b>先に取って</b>から考えても損はないんだ。<br>ほうっておくと、その箱も手番も相手のものに！',
      ask: ['取れる箱があるよ！ どの線を引く？', '箱が取れそう。いちばんいい線は？', '3本で囲まれた箱、見つけた？', 'ごちそうが待ってる！ どこに引こうか？', '最後の問題！ 取れる箱をどうする？'],
      hint: ['3本で囲まれた箱の、のこり1本はどこかな？', '線が3本の箱を探してみよう！', '取ったらもう1回引けるのを忘れずに！', '4本目を引けば、その箱はきみのもの！', 'ほかの線を引くと、相手がその箱を取っちゃうよ？'] },
    chain: { intro: '安全な線がなくなると、どこに引いても箱をあげることになる。盤は、箱がつながった<b>鎖</b>に分かれているんだ（輪になった鎖は<b>ループ</b>）。<br>開いた鎖は相手が丸ごと取るから、あげるなら<b>いちばん短い鎖</b>から！',
      ask: ['どこに引いても箱をあげちゃう…。損がいちばん少ない線は？', 'どの鎖から開く？', 'いちばん安くすむ線、わかる？', 'あげる箱を少なくするなら、どこかな？', 'ラスト！ 差し出すなら、どの鎖がいちばん安い？'],
      hint: ['つながった箱を数えて、いちばん短い鎖を探してみて！', '1箱だけの鎖はないかな？', '長い鎖を開くと、相手が丸ごと持っていっちゃう！', '鎖ごとに箱を数えて、くらべてみよう。', '開いた鎖の箱は、全部相手のものになると思ってね！'] },
    hard: { intro: '2箱の鎖を<b>端の線</b>で開くと、相手は2箱を取らずに先の線を引いて「返す」ことができる。手番を押しつけられちゃうんだ。<br><b>真ん中の線</b>で開けば1箱ずつに分かれて、相手は返せない！',
      ask: ['2箱の鎖をあげる場面。いちばんいい線はどれ？', 'この鎖は、どこから開く？', '相手に返させない開き方、わかる？', '箱をあげるなら、どの線で？', 'ラスト！ 上手なあげ方を見せて！'],
      hint: ['どの線で開けば、相手は「返す」ことができないかな？', '端の線と真ん中の線、どっちで開く？', '真ん中を切ると、箱は1つずつに分かれるんだ。', '端から開くと、相手に2箱を返す手が残っちゃう！', '長い鎖より、まず2箱の鎖。開いたあとの相手の手も想像して！'] },
    double: { intro: '相手が長い鎖を開いたら、全部取りたくなる。でも全部取ると、次の鎖を開くのは自分なんだ。<br>そこで<b>最後の2箱を残し</b>、その先の線を引いて手番を返す。これが<b>2つ残し</b>！ 2箱はあげても、次の長い鎖で取り返せる。',
      ask: ['相手が開いた鎖の、さいごの2箱が残ってる。いちばんいい線は？', '全部取る？ それとも？', 'ここで手番を返す方法、わかる？', 'あとに長い鎖がある！ どう引く？', 'ラスト！ 2つ残し、決められる？'],
      hint: ['全部取ったら、次に鎖を開くのはだれかな？', '最後の2箱の先の線を引くと、どうなる？', '2箱をあげて、次の長い鎖をもらう作戦！', 'あとに残っている鎖の長さを見てみよう。', '相手は2箱をもらうけど、そのあと鎖を開くのは相手！'] },
    control: { intro: '2つ残し（ループなら4つ残し）は、いつでも正しいわけじゃない。残すたびに、2箱（4箱）を相手にあげるからね。<br><b>残りの鎖が小さい</b>ときや<b>最後の鎖</b>なら、全部取るのが正解。大きな長い鎖が残っていれば、残して主導権をキープ！',
      ask: ['取れる箱がある。全部取る？ 残す？', 'さて、取り切る？ 2つ残す？', '残りの鎖を見て決めよう。どの線？', '主導権、守る？ 手放す？', 'ラスト！ 取るか残すか、決めて！'],
      hint: ['残りの鎖の長さを数えてみて！', 'あげた2箱を、あとで取り返せるかな？', 'これが最後の鎖なら、残す意味はある？', '大きな鎖が残ってるなら、主導権が大事！', '小さな鎖ばかりなら、目の前の箱をいただこう！'] },
    parity: { intro: '安全な線がつきたとき、最初に長い鎖を開かされた側はたいてい負け。だれが開くかは、手数の偶数・奇数で決まるんだ。<br><b>長鎖ルール</b>：3×3なら先手は長い鎖を偶数本に、4×4なら奇数本にしたい（後手はその逆）。鎖をつなげたり切ったりしよう！',
      ask: ['安全な線はまだあるけど、どれでも同じじゃない。いちばんいい線は？', '長い鎖の数を考えて、1本えらんでみて！', '鎖をつなぐ？ 切る？ どの線にする？', '先を読んで、きみに合う1本は？', 'ラスト！ 長鎖ルールで勝てる線は？'],
      hint: ['その線で、鎖はつながる？ 分かれる？', '長い鎖は、いま何本になりそうかな？', '3×3は偶数本、4×4は奇数本が先手のねらい！', '金色の輪の線の中から、鎖の形が変わるものを探そう！', '安全な線を全部使い切ったとき、手番はどっち？'] },
    sacrifice: { intro: '長鎖ルールで負けている側は、安全な線が残っていても、<b>あえて1〜2箱をあげて</b>手番の偶数・奇数をひっくり返せる。<br>小さくあげて大きく取る！ 目の前の1箱より、最後の長い鎖をだれが取るかのほうが、ずっと大きいんだ。',
      ask: ['安全な線はあるけど、それだと負けちゃう…！ いちばんいい線は？', 'ここで流れを変える1本は？', 'あえて箱をあげるなら、どこ？', '小さくあげて大きく取る！ どの線かな？', 'ラスト！ 勝つための投資をしてみて！'],
      hint: ['安全な線を引きあったら、最後に長い鎖を開くのはだれかな？', '1〜2箱で、手番の偶数・奇数をひっくり返せるよ！', '目の前の箱より、最後の長い鎖のほうがずっと大きい！', 'あげるなら、なるべく小さな所から！', '安全な線を引いても、相手は困らないかも？'] },
    loop: { intro: '開かれた<b>ループ</b>で主導権を保つには、<b>最後の4箱を残し</b>て、2箱ずつの組を2つあげる。ループの犠牲は4箱と大きいんだ。<br>だから主導権のない側は、<b>ループから先に開いて</b>相手に4箱をはらわせる。残りの大きさで決めよう！',
      ask: ['ループのある終盤。いちばんいい線はどれ？', 'ループと鎖、どう動く？', '4つ残し、使う？ 使わない？', 'どこから開くのが得かな？', 'ラスト！ ループの扱い、見せて！'],
      hint: ['ループで残すには4箱いる。残りの鎖で取り返せるかな？', 'ループは輪だから、開くと両方向から取れちゃう！', '主導権を持ってるのはどっちか、まず考えて！', '主導権がないなら、ループから開くのも手！', '残りの鎖とループの箱を足してみよう！'] },
    count: { intro: '安全な線がつきた盤は、鎖とループの組み合わせ。主導権を持つ側は最後の鎖以外で2つ残し（ループは4つ残し）を続け、持たない側は開く順番で損をへらすんだ。<br>小さな鎖（1〜2箱）が多いほど、主導権の値打ちは下がる！',
      ask: ['安全な線はもうない。開く順番を計算して、いちばんいい線は？', 'どの鎖から開くのが得？', '損を小さくする順番、わかる？', '小さな鎖は何本ある？ どれから？', 'ラスト！ 計算勝負だよ！'],
      hint: ['主導権を持ってるのはどっち？', '1箱・2箱の小さな鎖は何本あるかな？', '小さな鎖は、取り切りと残しの損得を変えるんだ！', '2箱の鎖は、真ん中から開くのを忘れずに！', '残しの損と取り切りの得を、順に足してみて！'] },
    open3: { intro: '3×3（点16個）は完全に解かれていて、おたがい最善なら後手が6対3で勝つ。それでも序盤には、1本で結果が変わる局面がたくさんあるんだ。<br>先手は長い鎖を偶数本に、後手は奇数本にしたい。盤を分ける線が鎖の形を決める！',
      ask: ['3×3の序盤。いちばんいい線はどれ？', 'この盤なら、どの1本？', '先を読んで、鎖の形を決めよう！ どの線？', 'どこに引けば、きみに合う形になるかな？', 'ラスト！ 序盤の1本を選んで！'],
      hint: ['この線で、盤はどんな鎖に分かれていきそう？', '先手は長い鎖を偶数本、後手は奇数本にしたい！', '長い鎖ができそうな所を想像してみて！', '安全な線でも、鎖の形は変わるんだ。', '金色の輪の線をひとつずつ試すつもりで、形を想像してみて！'] },
    mid4: { intro: '4×4（点25個）は、おたがい最善なら8対8の引き分け。点が奇数だから、<b>先手は長い鎖を奇数本、後手は偶数本</b>にしたい盤なんだ。<br>中盤は1本引くたびに鎖の形が固まっていく。どの線が鎖をつなげて、どれが切るかを考えよう！',
      ask: ['4×4の中盤。いちばんいい線は？', '鎖の形を読んで、1本えらんで！', 'どの線が鎖をつなげる？ 切る？', 'この局面、きみならどう引く？', 'ラスト！ 中盤の勝負所だよ！'],
      hint: ['長い鎖になりそうな所を探してみて。', '先手は長い鎖を奇数本、後手は偶数本にしたい盤！', '安全な線だけが正解とはかぎらない！', '小さくあげて流れを変える手もあるよ？', '金色の輪の線で、鎖の数がどう変わるか考えて！'] },
    mid5: { intro: '5×5（点36個）はまだ解かれていない大きな盤。ここでは、安全な線が少なくなって読み切れる局面だけを出すね。<br>点が偶数だから、先手は長い鎖を偶数本、後手は奇数本にしたい。取り切り・残しの損得も大きいんだ。',
      ask: ['5×5の中盤から終盤。いちばんいい線はどれ？', '大きな盤でも落ちついて。どの線にする？', '長い鎖とループ、何本あるかな？ どこに引く？', '読み切れる局面だよ！ いちばんいい1本は？', 'ラスト！ 大きな盤を決めて！'],
      hint: ['残りの安全な線と、長い鎖・ループの数を数えてみて。', '5×5は、先手が長い鎖を偶数本にしたい盤！', '取り切り・残しの損得も大きいんだ！', '安全な線は残りわずか。最後に開くのはだれ？', '1箱あげて手番を変える手も考えて！'] },
    exam: { intro: '最後は総合問題！ 安全な線、取り切りと残し、長鎖ルール、犠牲、ループ、終盤の数え。どの考え方がいるか、自分で見きわめてね。<br>75点以上で卒業。がんばろう！',
      ask: ['どの考え方がいるか見きわめて、いちばんいい線を引いて！', 'つぎはどう？ いちばんいい線は？', 'さあ、腕の見せどころ！ どの線？', 'これまでの技を思い出して、1本えらんで！', 'ラスト！ 卒業をかけた1本だよ！'],
      hint: ['安全な線は残ってる？ 取れる箱は？', '長い鎖とループは何本あるかな？', 'あげるなら小さく！ 2箱は真ん中から。', '安全な線の偶数・奇数を数えてみよう！', '迷ったら、取れる箱 → 安全な線 → あげる順番！'] },
  };
  const DT_CH = {
    good: ['いいね！', 'さすが！', 'お見事！', 'ばっちりピヨ！', 'やったね！', 'いい目してる！', 'すごいすごい！', 'そうそう、それ！'],
    push: [null, '次もこの調子で行こう！', null, 'どんどん行こう！', 'その勢いで次へ！'],
    soft: ['大丈夫！', 'ドンマイ！', 'あと少しだったね！', '気にしない、気にしない！', 'あと一歩ピヨ！', '平気、平気！', 'よくある見落としだね。', 'いっしょに見てみよう！'],
    tail: [null, null, 'これで覚えちゃおう！', null, '次はきっと見つけられる！'],
    loss: ['最後に{L}箱の差がつく。', '全部で{L}箱の差になっちゃう。', '結果は{L}箱ちがってくる。', '{L}箱ぶん、もったいない！', '終わってみると{L}箱の差になる。'],
    // why a right line is good (5 ways each; {k} boxes taken, {m} boxes handed over, {n} safe lines left)
    safe: ['どの箱も2本までで止まってる。相手に渡す箱はゼロ！', 'この線なら、となりの箱はまだ3本目にならない。相手は取れる箱なしで番が回ってくる。', '3本目を作らない線、ちゃんと見つけられた！', '{edge}', '{left}'],
    safeP: ['安全な線の中でも、長い鎖の数がきみに合う1本！', 'この線なら、最後に長い鎖を開くのは相手になる。', 'どの安全な線でもいいわけじゃない。鎖の形まで読めてる！', '先の鎖の形まで考えた、深い1本！', 'ほかの安全な線だと鎖の数がずれちゃう。そこを避けられた！'],
    take: ['箱を{k}つ取って、もう1回引ける！', 'まずは{k}箱いただき。取ってから次を考えれば損はない！', '取れる箱を見のがさなかった！ 手番もきみのまま。', '4本目を引いて{k}箱ゲット！ ほうっておいたら相手に取られてた。', '先に取るのが鉄則！ これで{k}箱ぶん得をした。'],
    takeE: ['ここは取り切るのが正解！ 残りの鎖が小さいから、残しても取り返せない。', '全部取ってOK！ あとに大きな鎖がないから、主導権より目の前の箱。', '残す意味がない場面を見きわめた！ あとの鎖は小さいもんね。', 'これが取り切りどき！ 箱を残しても、取り返す鎖がないんだ。', '取り切り、正解！ 主導権より箱の数が大事な場面。'],
    dec: ['{m}箱を残して手番を返した！ 次の長い鎖も、きみが取れる。', 'わざと{m}箱残す、上手な手！ 主導権はきみが持ったまま。', '2つ残し、決まった！ 次に鎖を開くのは相手のほう。', '全部取りたいのをがまんできた！ {m}箱あげても、あとで大きく取り返せる。', 'これがダブルディール！ 相手は{m}箱をもらうけど、そのあと開くのは相手。'],
    dec4: ['4箱を残して手番を返した！ ループでも主導権はきみのまま。', 'ループの4つ残し、決まった！ 次に開くのは相手。', 'ループの犠牲は4箱。それでも残りの鎖で取り返せる！', 'がまんの4つ残し！ 次の鎖も、きみのもの。', '主導権を4箱で守れた！ あとの鎖のほうが大きいもんね。'],
    sac: ['あえて{m}箱あげる勇気の1手！ これで最後の長い鎖がきみに回ってくる。', '小さな犠牲で流れを変えた！ {m}箱で主導権が買えた。', '安全な線を引いていたら負けだった。{m}箱の投資、大成功！', '目の前の箱より、最後の長い鎖！ そこが見えてる。', '{m}箱で、最後に長い鎖を開く役を相手に回した！'],
    mid: ['真ん中から開いたから、相手は返せない！', '1箱ずつに分けたから、相手は取るしかない！', '端から開かずにすんだ。これで手番を押しつけられない！', '2箱の鎖は真ん中から。コツをつかんだ！', '相手は2箱を取って、また線を引くことになる。上手なあげ方！'],
    small: ['{m}箱だけですむ、いちばん安いあげ方！', '{m}箱ですむ所から開いた。ここがいちばん損が少ない！', '短い鎖から順にあげる、基本どおり！', '長い鎖は後回し。{m}箱の所を先に差し出せた！', 'あげる箱をいちばん少なくできた！ 計算ばっちり。'],
    loop4: ['主導権がないから、ループから開いて相手に4つ残しをさせる！', 'ループを先に開けば、相手は残すたびに4箱も損する！', 'ループから開く、上手な順番！', '相手に高い犠牲をはらわせる開き方！', 'ループは主導権を持つ側に高くつく。そこをついた！'],
    // the green line's point, for a miss ({bm}: what the green line hands over)
    rSafe: ['緑の線は安全な線。', '緑の線なら1箱もあげずにすむ。', '安全な線は緑の所！', '緑の線は、どの箱にも3本目を作らない。', '正解は緑の線。'],
    rPar: ['どっちも安全な線だけど、緑の線なら長い鎖の数がきみにぴったり。', '緑の線を引けば、長い鎖を開かされるのは相手のほう。', '正解は緑の線。鎖の形まで見た1本なんだ。', '緑の線のほうが、長い鎖の本数がきみに合う。', '安全な線どうしでも、緑の線が勝ちにつながる。'],
    rTake: ['3本で囲まれた箱は、緑の線で取れたのに！', '緑の線が4本目！ 箱がもらえる線なんだ。', '取れる箱は緑の線の所！', '正解は緑の線。まず取ってから考えよう。', '緑の線で取れば、もう1回引ける！'],
    rTakeE: ['ここは緑の線で取り切るのが正解。', '緑の線でそのまま取っちゃおう。', '正解は緑の線、取り切り！', 'あとの鎖が小さいから、緑の線で全部いただこう。', '緑の線で取り切れば、箱の数で勝てる。'],
    rDec: ['緑の線で{bm}箱を残せば、主導権はきみのまま。', '正解は緑の線。{bm}箱を残して手番を相手に返すんだ。', 'ここは緑の線で{bm}つ残し！', '緑の線なら損は{bm}箱ですむ。', '緑の線で最後の{bm}箱だけ残そう。'],
    rSac: ['ここは緑の線で{bm}箱あげるのが正解。', '正解は緑の線、あえての犠牲！', '緑の線で{bm}箱を差し出そう。', '緑の線の犠牲で、長い鎖の主導権が手に入る。', '緑の線で小さくあげて、大きく取る作戦！'],
    rMid: ['緑の線は鎖の真ん中。1箱ずつに分かれて返せない形になる。', '正解は緑の真ん中の線！', '緑の真ん中の線なら、相手は返せない。', '2箱の鎖は緑の線、真ん中で切るのがコツ。', '緑の線で開けば、相手は取るしかない。'],
    rSmall: ['緑の線なら{bm}箱の所から開ける。', '緑の線ですむのは{bm}箱だけ。', 'いちばん短い所は緑の線。', '正解は緑の線、{bm}箱ですむ開き方。', '緑の線から開くのがいちばん安い。'],
    // what the red line (the player's) costs ({xm}: what it hands over)
    yGive: ['赤い線は箱の3本目になって、相手に{xm}箱取られちゃう。', '赤い線を引くと、{xm}箱が相手のものに。', '赤い線のとなりの箱は2本引いてあったから、そこが3本目になって{xm}箱取られる。', '赤い線だと、相手が{xm}箱をぺろり！', '赤い線は2本の箱にさわったから、相手に{xm}箱が渡る。'],
    yPar: ['赤い線だと長い鎖の本数が合わなくて、最後に長い鎖を開かされる。', '赤い線も安全だけど、それだと鎖の形がきみに不利になる。', '赤い線だと、長い鎖の本数がずれちゃう。', '赤い線では、最後に長い鎖を開くのがきみになる。', '赤い線だと、手数の偶数・奇数が相手に合っちゃう。'],
    ySafe: ['安全な赤い線だと、最後に長い鎖を開くのがきみになっちゃう。', '赤い線は安全でも、手番の偶数・奇数がきみに合わないから負け筋。', '赤い線で安全に逃げても、最後の長い鎖を相手に取られる。', '赤い線のままだと、長鎖ルールで負けちゃう。', '安全な線でしのいでも、最後に大きく取られる形なんだ。'],
    yAll: ['赤い線で取り切ると、次の鎖を開くのはきみになっちゃう。', '全部取ると、あとの長い鎖を相手に取られる！', '取り切った赤い線だと、自分で次の鎖を開くはめになる。', '赤い線は目の前の箱に飛びついたから、主導権が相手に移る。', '赤い線で取りすぎると、手番を返せない。'],
    yKeep: ['赤い線で{xm}箱残しても、あとの鎖が小さいから取り返せない。', '残した{xm}箱は相手のもの。取り返す大きな鎖がないから損なんだ。', 'この先は小さな鎖だけ。赤い線の残しは{xm}箱の損になる。', '赤い線の2つ残しは、ここではもったいない。', '主導権を守っても、あとに取る鎖がなければ意味がない。'],
    yMiss: ['赤い線だと、相手に{xm}箱取られちゃう。', '赤い線を引くと、その箱は相手が取る。{xm}箱のプレゼントになる。', '見のがすと、相手に{xm}箱と手番まで渡しちゃう。', '赤い線では、取れたはずの箱が相手のものに。', '赤い線のあと、相手は{xm}箱をまとめて取れる。'],
    yMore: ['赤い線だと{xm}箱も相手にあげることになる。', '赤い線の所で手を止めると、残る箱が{xm}箱にふえちゃう。', '赤い線は残しすぎ！ {xm}箱も渡るから損が大きい。', '赤い線では、相手に{xm}箱をまとめて取られる。', '赤い線では取り方の順番がずれて、{xm}箱あげることになる。'],
    yEnd: ['端の赤い線で開くと、相手は2箱を返して手番を押しつけてくる。', '端から開いた赤い線だと、相手に「返す」手が残っちゃう。', '赤い端の線だと、相手は2箱を取らずに手番だけ押しつけられる。', '赤い線は端から開いたから、相手が2箱を返せる形。', '端の赤い線では、2箱をあげたうえに主導権まで取られちゃう。'],
    yLong: ['赤い線は{xm}箱の鎖を開くから、相手に丸ごと取られる。', '赤い線だと{xm}箱の鎖が開いちゃう。長い鎖は後回しにしたい！', '赤い線だと、{xm}箱を丸ごと持っていかれる。', '赤い線のほうは{xm}箱。差し出すには大きすぎて損！', '赤い線で開くと、相手は{xm}箱をごっそり取れる。'],
    ySmall: ['赤い線だと{xm}箱あげることになるから、緑の線より損。', '赤い線は{xm}箱を渡す線だから、緑の線より高くつく。', '赤い線で開くと、相手は{xm}箱をまとめて取れる。', '赤い線のほうがあげる箱が多いから損。', '赤い線だと{xm}箱。少しの差でも、終盤では大きい！'],   // (x.m < 3: not a long chain)
    ySac: ['赤い線だと流れが変わらない。', '赤い線では箱をあげても、手番の偶数・奇数が変わらない。', '赤い線の犠牲だと、長い鎖の主導権につながらない。', '赤い線では、あげ損になっちゃう。', '赤い線だと、最後の長い鎖はやっぱり相手のもの。'],
    yOrd: ['赤い線から開くと、あとの鎖の取り分が少なくなる。', '赤い線だと、開く順番で損が出る。', '赤い線から開くと、あとの鎖の分け方がきみに不利になる。', '赤い線は順番が逆だから、あとで損が出る。', '赤い線では、取り分の計算が合わなくなる。'],
  };
  const DT_END = /^(double|control|loop|count|exam)$/;
  // ハコピヨ's words for one problem (i: its number in the lesson; si: the lesson's, so the cheers come in another order in each)
  const dotsJa = (s, F, P, ans, i, si) => {
    const V = new Map(P.values), best = Math.max(...P.values.map(x => x[1])), b = F.of(ans), k = i % 5, o8 = si % 8 + i * [1, 3, 5, 7][(si >> 3) % 4];
    const pk = (L, j) => L[((j % L.length) + L.length) % L.length], fl = (t, o) => t.replace(/\{(\w+)\}/g, (_, x) => o[x] != null ? o[x] : '');
    const pick2 = P.values.some(([e, v]) => v < best && F.of(e).cls === 'safe');   // (a safe line that loses: the best one is picked by the long chains)
    const why = x => {
      const o = { k: x.k, m: x.m, edge: x.edge ? '外がわの線は箱1つにしか関係しない。その箱がまだ1本以下だから安心！' : '内がわの線は箱2つにまたがるけど、どっちも2本未満。だから安全！',
        left: x.n2 ? `引いたあと、安全な線は残り${x.n2}本。先に困るのは相手かも！` : '引いたあと、安全な線はもうない。次に箱をあげるのは相手のほう！' };
      let L;
      if (x.cls === 'take') L = F.hasCap && DT_END.test(s.id) ? DT_CH.takeE : DT_CH.take;
      else if (x.cls === 'decline') L = x.m === 4 ? DT_CH.dec4 : DT_CH.dec;
      else if (x.cls === 'safe') L = pick2 ? DT_CH.safeP : DT_CH.safe;
      else if (F.ns) L = DT_CH.sac;
      else if (x.m === 4 && s.id === 'loop') L = DT_CH.loop4;
      else if (x.m === 2 && !x.ret && s.id === 'hard') L = DT_CH.mid;
      else L = DT_CH.small;
      return fl(pk(L, k), o);
    };
    const jn = a => a.filter(Boolean).reduce((t, c) => t + (!t || /。$/.test(t) ? '' : ' ') + c, '');   // (no space after 。)
    const good = u => jn([pk(DT_CH.good, o8), why(F.of(V.get(u) === best ? u : ans)), DT_CH.push[k]]);
    const ng = u => {
      if (V.get(u) === undefined || V.get(u) === best) u = P.values.reduce((a, c) => c[1] < a[1] ? c : a)[0];   // (the runner never shows this for a best line: a checker's call — the worst line stands in)
      const x = F.of(u), loss = (best - V.get(u)) / 2, o = { bm: b.m, xm: x.m };
      let R, Y;
      if (b.cls === 'safe') { R = x.cls === 'safe' ? DT_CH.rPar : DT_CH.rSafe; Y = x.cls === 'safe' ? DT_CH.yPar : DT_CH.yGive; }
      else if (b.cls === 'take') { const e = x.cls === 'decline' && DT_END.test(s.id) && (x.m === 2 || x.m === 4); R = e ? DT_CH.rTakeE : DT_CH.rTake; Y = e ? DT_CH.yKeep : x.cls === 'decline' ? DT_CH.yMiss : DT_CH.yOrd; }
      else if (b.cls === 'decline') { R = DT_CH.rDec; Y = x.cls === 'take' ? DT_CH.yAll : DT_CH.yMore; }
      else if (x.cls === 'safe') { R = DT_CH.rSac; Y = DT_CH.ySafe; }
      else if (x.ret && !b.ret && b.m === 2) { R = DT_CH.rMid; Y = DT_CH.yEnd; }
      else if (b.m < x.m) { R = DT_CH.rSmall; Y = x.m >= 3 ? DT_CH.yLong : DT_CH.ySmall; }
      else if (F.ns) { R = DT_CH.rSac; Y = DT_CH.ySac; }
      else { R = DT_CH.rSmall; Y = DT_CH.yOrd; }
      const out = [pk(DT_CH.soft, o8), fl(pk(R, k), o), fl(pk(Y, k + 2), o)];
      if (loss > 0) out.push(fl(pk(DT_CH.loss, k + 1), { L: loss }));
      if (DT_CH.tail[k]) out.push(DT_CH.tail[k]);
      return jn(out);
    };
    return { good, ng };
  };
  const DOTS = {
    LKEY: 'dots-lessons-v2', data: null, I: null, got: {},
    load(lang) {
      const T = () => Promise.all([...new Set(['ja', 'en', lang || 'en'])].filter(l => !this.got[l]).map(l => getJ(`../dots/content/text.${l}.json?v=20261021L`).then(d => { this.got[l] = 1; if (this.I) this.I[l] = Object.assign(this.I[l] || {}, d); }).catch(() => {})));
      if (this.p) return this.p.then(() => T()).then(() => this);
      return (this.p = Promise.all([getJ('../dots/lessons.json?v=30261123'), Promise.all(['../dots/i18n.js?v=20261116', '../dots/i18n-learn.js?v=20261116'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n'))])
        .then(([ls, X]) => { const w = {}; try { new Function('window', 'with (window) {' + X + '\n}')(w); } catch (e) { console.warn('[lessons3d] dots texts', e); } this.I = w.I18N || {}; this.data = { ls }; return T(); }).then(() => this)
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; if (Array.isArray(x)) x = x.map(p => `<p>${p}</p>`).join(''); return v ? fill(x, v) : x; },
    list(kind, lang) {
      const pr = J(this.LKEY, {});
      return this.data.ls.steps.map((s, i) => { const q = s.problems[0];
        return { key: String(i), cat: s.course, catName: this.tx('course.' + s.course, lang) || s.course, title: this.tx('ls.' + s.id + '.t', lang), sub: this.tx('ls.' + s.id + '.d', lang),
          svg: q && window.AtlasMini && AtlasMini.dots ? AtlasMini.dots({ n: q.n, e: q.e, o: q.o }) : '', st: pr[s.id] ? (pr[s.id].clear ? 'pass' : 'try') : '', full: false }; });
    },
    lesson(key, lang) {
      const s = this.data.ls.steps[+key]; if (!s) return null;
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), SAFE = ['safe', 'third', 'parity', 'sacrifice', 'open3', 'mid4', 'mid5'].includes(s.id), ja = lang === 'ja' && DTJ[s.id];
      return { id: s.id, title: T('t'), intro: ja ? ja.intro : T('body'), ramp: null,
        probs: s.problems.slice(1, 6).map((q, i) => { const edges = dDecE(q.e), values = dDecV(q.v), best = Math.max(...values.map(x => x[1])), ans = values.find(x => x[1] === best)[0], P = { values };
          const fb = ja ? dotsJa(s, dFacts(q.n, edges), P, ans, i, +key) : { good: () => T('tip'), ng: () => T('tip') };
          return { pos: { spec: { n: q.n, edges, owners: dDecO(q.o) }, me: 0 }, kind: 'best', P, ask: `<small>${q.n}×${q.n}</small> ` + (ja ? ja.ask[i % 5] : T('q')), ans, hintTx: ja ? ja.hint[i % 5] : T('hint'), hint: SAFE ? dSafe(q.n, edges) : [], dHint: true,
            why: '', good: fb.good, ng: fb.ng, own: !!ja, ckls: !!ja }; }),   // (ckls: ハコピヨ praises himself — no heading line)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, e) { const v = new Map(P.values).get(e); return v === undefined ? 0 : dRank(P.values, v); },
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), q = s && s.problems[0]; return q ? { pos: { spec: { n: q.n, edges: dDecE(q.e), owners: dDecO(q.o) }, me: 0, lock: true } } : null; },
  };
  /* (2026-11-21 the user: a very easy first step — the answer is lit, or one obvious move — needs no 5 problems: 2 clear it). Lesson keys. */
  const EASY2 = { amazons: ['0', '1', '2'], morris: ['0'], tafl: ['0'], mancala: ['0'], reversi: ['0'], gomoku: ['0'], connect4: ['0'], hex: ['0'] };
  /* whose move it is (2026-11-23 user: every problem — the warm-up's too — must say which side the player moves, 「黒の手番だよ」).
     turnOf: 1 / 2 from the position (an object's me, reversi "…:1", a chess FEN's w / b, a shogi SFEN's b / w), 0 = no sides (dots),
     null = not known. turnLine: the line put before the question, '' when the question already names the side (the same side). */
  const TURN_N = { ja: { ur: ['白', '黒'], senet: ['糸巻き', '円錐'], morris: ['金', '銀'], tafl: ['攻め手', '守り手'], chess: ['白', '黒'], reversi: ['●黒', '○白'], gomoku: ['●黒', '○白'], go: ['●黒', '○白'], checkers: ['黒', '白'], xiangqi: ['赤', '黒'], janggi: ['楚', '漢'], hex: ['赤', '青'], amazons: ['白', '黒'], connect4: ['金', '銀'], shogi: ['☗先手', '☖後手'], backgammon: ['金', '金'] },
    en: { ur: ['Light', 'Dark'], senet: ['Spools', 'Cones'], morris: ['Gold', 'Silver'], tafl: ['Attackers', 'Defenders'], chess: ['White', 'Black'], reversi: ['● Black', '○ White'], gomoku: ['● Black', '○ White'], go: ['● Black', '○ White'], checkers: ['Black', 'White'], xiangqi: ['Red', 'Black'], janggi: ['Cho', 'Han'], hex: ['Red', 'Blue'], amazons: ['White', 'Black'], connect4: ['Gold', 'Silver'], shogi: ['☗ Sente', '☖ Gote'], backgammon: ['Gold', 'Gold'] } };
  function turnOf(id, pos) {
    if (id === 'dots') return 0;
    if (id === 'mancala') return 1;   // (the player's row is always the near one)
    if (pos && typeof pos === 'object') { if (pos.pick) return 0; if (pos.bg) return 1; return pos.me === 1 || pos.me === 2 ? pos.me : null; }
    const t = String(pos || '');
    if (id === 'reversi') { const m = t.match(/:([12])$/); return m ? +m[1] : null; }
    if (id === 'chess') { const f = t.split(' ')[1]; return f === 'w' ? 1 : f === 'b' ? 2 : null; }
    if (id === 'shogi') { const f = t.split(' ')[1]; return f === 'b' ? 1 : f === 'w' ? 2 : null; }
    return null;
  }
  function turnLine(id, pos, ask, lang) {
    const w = turnOf(id, pos); if (!w) return '';
    if ((id === 'ur' || id === 'senet') && pos && pos[id] && pos[id].lock) return '';   // (ur: a question to count on a board for looking — no move to make)
    const ja = lang === 'ja', a = String(ask || '').replace(/<[^>]+>/g, '');
    if (id === 'mancala') return ja ? (/手前/.test(a) ? '' : '<b>手前の列</b>がきみの穴だよ。') : '';
    const N = (TURN_N[ja ? 'ja' : 'en'] || {})[id]; if (!N) return '';
    const nm = N[w - 1], bare = nm.replace(/^[●○☗☖] ?/, '');
    if (ja && (new RegExp('(' + bare + '|' + nm + ')(の手番|の番|番)|きみは' + bare)).test(a)) return '';   // (the question says it already)
    if (!ja && /to (move|play)|You play/i.test(a)) return '';
    return ja ? (id === 'backgammon' ? `きみは<b>${nm}</b>。` : `<b>${nm}</b>の手番だよ。`) : `<b>${nm}</b> to move. `;
  }
  /* ur (2026-11-24 担当C): the data, ダイスン's words and the board hooks are in atlas/ls-ur.js (loaded the first time) */
  const UR = { load(lang) { return this.p || (this.p = new Promise((res, rej) => { if (window.AtlasLsUr) return res(); const sc = document.createElement('script'); sc.src = 'ls-ur.js?v=1'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); })
    .then(() => { const U = AtlasLsUr.make({ getJ, J, put, L, fill }); Object.keys(U).forEach(k => { if (k !== 'load' && k !== 'p') this[k] = typeof U[k] === 'function' ? U[k].bind(U) : U[k]; }); return U.load(lang).then(() => { this.data = U.data; return this; }); })
    .catch(e => { this.p = null; throw e; })); } };
  /* senet (2026-11-24 担当C): the data, セティ's words and the board hooks are in atlas/ls-senet.js (loaded the first time) */
  const SENET = { load(lang) { return this.p || (this.p = new Promise((res, rej) => { if (window.AtlasLsSenet) return res(); const sc = document.createElement('script'); sc.src = 'ls-senet.js?v=1'; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); })
    .then(() => { const U = AtlasLsSenet.make({ getJ, J, put, L, fill }); Object.keys(U).forEach(k => { if (k !== 'load' && k !== 'p') this[k] = typeof U[k] === 'function' ? U[k].bind(U) : U[k]; }); return U.load(lang).then(() => { this.data = U.data; return this; }); })
    .catch(e => { this.p = null; throw e; })); } };
  const DATA = { ur: UR, senet: SENET, dots: DOTS, morris: MORRIS, mancala: MANCALA, tafl: TAFL, shogi: SHOGI, chess: CHESS, reversi: REVERSI, gomoku: GOMOKU, go: GO, checkers: CHECKERS, xiangqi: XIANGQI, janggi: JANGGI, backgammon: BACKGAMMON, hex: HEX, amazons: AMAZONS, connect4: CONNECT4 };

  function list(id, kind, lang) { const D = DATA[id]; return Promise.all([D.load(lang), ncLoad(id)]).then(() => D.list(kind, lang)); }
  function next(id, kind, lang) { return list(id, kind, lang).then(L2 => { const x = L2.find(i => !i.full && i.st !== 'pass') || L2.find(i => !i.full); return x ? x.key : null; }); }

  function start(ctx) {
    const id = ctx.id, D = DATA[id], ad = ctx.adapter, GD = (window.AtlasPuzzles && AtlasPuzzles.G || {})[id] || {};
    const VO = (VOICE[id] || {})[ctx.lang] || {}, X = Object.assign({}, TX[ctx.lang] || TX.en, VO);
    const LN = ((window.AtlasPuzzleLines || {})[id] || {})[ctx.lang] || {}, line = k => { const a = LN[k]; return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; };
    const okLine = () => { const a = (LN.solved || []).filter(t => !/詰|参りました|降参|mate|メイト/i.test(t)); return a.length ? a[Math.floor(Math.random() * a.length)] : ''; };   // (2026-11-21 lesson loop: a best-move or opening problem is not praised with 「詰んだ！」)
    const lsv = h => { const m = (LSV.d || {})[id]; if (!m) return h; const ks = LSV[id] || (LSV[id] = Object.keys(m).sort((a, b) => b.length - a.length)); for (const k of ks) if (h.includes(k)) h = h.split(k).join(m[k]); return h; };   // (the problem lines in the guide's own words: atlas/lsvoice-ja.js, 2026-11-21)
    const voice = h => ctx.lang === 'ja' ? varyJa(lsv(guideJa(h, id)), id) : h;   // (each guide's own way of talking, 2026-11-15)
    let greeted = false;
    let stopped = false, sess = null, cur = null, phase = 'load', typeT = 0, onReady = null, onMoved = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const el = document.createElement('div'); el.className = 'rgd pzg lsg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide || ''}" alt=""></div><div class="bub"><div class="nm"><span class="gn">${(GD.name && (GD.name[ctx.lang] || GD.name.en)) || ''}</span><span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el); autoCss();
    const $ = s => el.querySelector(s);
    el.addEventListener('click', e => { if (more.length && e.target.closest('[data-a=next]')) { e.stopImmediatePropagation(); e.preventDefault(); if (typing) $('.tx').onclick(); else turn(); } }, true);
    // a long text is said a little at a time, like the rules guide (2026-11-11): pages of a sentence or two; 次へ (or a tap on
    // the bubble once it is all typed) shows the next page — the button's own action waits until the last page
    const CJK = /^(ja|zh|zh-TW|ko)$/.test(ctx.lang), NARROW = matchMedia('(max-width: 600px)').matches, LIM = CJK ? (NARROW ? 44 : 58) : (NARROW ? 110 : 150);   // (phones: shorter pages, the bubble keeps to ~4 lines, 2026-11-15)
    let more = [], want = null, typing = false;
    const plain = h => h.replace(/<[^>]*>/g, '');
    function pages(html) {
      const out = []; let curP = '';
      const parts = String(html).split(/<br\s*\/?>/i).flatMap(par => par.match(CJK ? /[^。！？!?]*[。！？!?]+」?|[^。！？!?]+$/g : /[^.!?]*[.!?]+["”)]?\s*|[^.!?]+$/g) || [par]).map(x => x.trim()).filter(Boolean);
      // (a paragraph break stays a break when its sentences share a page)
      const raw = String(html).split(/<br\s*\/?>/i);
      let pi = 0; const brAfter = new Set(); raw.forEach(par => { const n = (par.match(CJK ? /[^。！？!?]*[。！？!?]+」?|[^。！？!?]+$/g : /[^.!?]*[.!?]+["”)]?\s*|[^.!?]+$/g) || [par]).map(x => x.trim()).filter(Boolean).length; pi += n; brAfter.add(pi - 1); });
      // (one sentence much longer than a page: cut at the comma nearest its middle, outside any tag)
      const cut = sn => { const t = plain(sn); if (t.length <= LIM * 1.25) return [sn]; const mid = sn.length / 2; let best = -1, depth = 0;
        for (let k = 0; k < sn.length; k++) { const ch = sn[k]; if (ch === '<') depth++; else if (ch === '>') depth--; else if (!depth && (CJK ? ch === '、' || ch === '，' : ch === ',') && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k; }
        if (best < 0 || /<b>[^<]*$/.test(sn.slice(0, best + 1))) return [sn]; return [sn.slice(0, best + 1), sn.slice(best + 1).trim()]; };
      for (let k = parts.length - 1; k >= 0; k--) { const c = cut(parts[k]); if (c.length > 1) { parts.splice(k, 1, ...c); const sh = new Set(); brAfter.forEach(b => sh.add(b >= k ? b + 1 : b)); brAfter.clear(); sh.forEach(b => brAfter.add(b)); } }
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
    let hist = [];   // (the pages of the current speech already shown: ← goes back through them, 2026-11-15)
    function turn() { const h = more.shift(); hist.push(h); show(h); apply(); }
    function back() {
      if (hist.length < 2) return false;
      more.unshift(hist.pop()); show(hist[hist.length - 1]); $('.tx').onclick(); apply(); return true;   // (shown whole: it has been read)
    }
    function say(html) {
      html = String(html || '').replace(/[ \u00a0]*\u0001/g, '').replace(/\u0002[ \u00a0]*/g, '').replace(/\{fig\d*\}\s*/g, '').replace(/\{[a-zA-Z]\w{0,8}\}/g, '');   // (2026-11-21: the 2D page's figure slots {fig1}… — none on the 3D table)
      // (ja mark phrases: SP)
      if (id === 'checkers' && window.Table3D && Table3D.checkers && Table3D.checkers.recolor) html = Table3D.checkers.recolor(html, ctx.lang);   // (黒 / 白 → the chosen set's colours, 2026-11-14)
      html = voice(String(html || '').replace(/<p[^>]*>/g, '').replace(/<\/p>\s*/g, '<br>').replace(/(<br>\s*)+$/, ''));   // (the chess texts come as <p> paragraphs)
      if (!greeted && X.hi && html !== X.loading) { greeted = true; html = X.hi + '<br>' + html; }
      const P = pages(html); more = P.slice(1); hist = [P[0]]; show(P[0]); apply();
    }
    const nextB = () => $('[data-a=next]');
    /* auto-advance (2026-11-14, = shared/cardbar.js autoNext): after a right answer the next problem comes by itself; meanwhile the
       次へ button fills up as a meter. Any tap / key before then cancels it (the player stays on the answer). */
    let autoT = 0, autoOff = null;
    function autoCancel() { clearTimeout(autoT); autoT = 0; const b = nextB(); if (b) b.classList.remove('ls-auto'); if (autoOff) { autoOff(); autoOff = null; } }
    function autoGo(ms, ok, fire) {
      autoCancel(); autoCss();
      const b = nextB(); if (b) { b.style.setProperty('--ls-auto-ms', ms + 'ms'); void b.offsetWidth; b.classList.add('ls-auto'); }
      const stop = e => { if (e && e.isTrusted === false) return; autoCancel(); };
      setTimeout(() => { if (!autoT) return; ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, stop, true)); autoOff = () => ['pointerdown', 'keydown'].forEach(ev => document.removeEventListener(ev, stop, true)); }, 0);
      autoT = setTimeout(() => { autoT = 0; autoCancel(); if (stopped) return;
        if (more.length) { turn(); autoGo(Math.max(2200, ms), ok, fire); return; }   // (2026-11-21: the words ran onto a second page — show it, then go on; before, the meter ran out and nothing happened)
        if (!ok || ok()) fire(); }, ms);
    }
    const head = txt => { $('.pg').textContent = txt ? ' · ' + txt : ''; };
    function act(nextLabel, { hint = false, again = false, nextOn = true } = {}) { want = { nextLabel, nextOn }; $('[data-a=hint]').disabled = !hint; $('[data-a=again]').disabled = !again; apply(); }
    function apply() {
      if (!want) return;
      if (more.length) { nextB().innerHTML = X.next + ' ▶'; nextB().disabled = false; nextB().classList.add('more'); }
      else { nextB().innerHTML = want.nextLabel + ' ▶'; nextB().disabled = !want.nextOn; nextB().classList.remove('more'); }
    }
    function dots() { if (!cur || !cur.probs.length || phase === 'study' || phase === 'intro') { $('.cnt').innerHTML = ''; return; } $('.cnt').innerHTML = cur.probs.map((_, i) => { const r = cur.res[i]; return `<i class="lsd ${r === undefined ? '' : r >= 16 ? 'ok' : r > 0 ? 'mid' : 'ng'}${i === cur.k && phase === 'prob' ? ' on' : ''}"></i>`; }).join(''); }
    const pz = () => sess && sess.pz;
    function board(pos, sol, drill, lock) {   // lock: shogi / reversi — for looking only (the intro's picture)   // a position on the table (the first one starts the adapter); drill: chess's ★ stage { stars, safe }
      return new Promise(res => {
        onReady = res;
        const G = pos && typeof pos === 'object' ? pos : null;   // (gomoku: { start, rule, me, last, pick, noForbid } · go: { spec, me, view, marks })
        if (sess && (id === 'go' || id === 'hex') && G && pz() && pz().n !== (G.spec.n || 9)) { sess.stop(); sess = null; }
        if (sess && id === 'dots' && G && pz() && pz().n !== G.spec.n) { sess.stop(); sess = null; }
        if (sess && id === 'ur' && G && G.ur && pz() && pz().rule() !== ((G.ur.s && G.ur.s.rule) || 'finkel')) { sess.stop(); sess = null; }   // (ur: Blitz is another track — a new board)   // (dots: another board size)
        if (sess && id === 'morris' && G && pz() && pz().v !== G.spec.v) { sess.stop(); sess = null; }   // (morris: another rule set's board)
        if (sess && id === 'tafl' && G && G.spec && G.spec.b && pz() && pz().n !== Math.round(Math.sqrt(String(G.spec.b).length))) { sess.stop(); sess = null; }   // (tafl: another rule set's board)   // (go / hex: another board size — a new board)
        if (!sess) {
          sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
            pz: Object.assign({ lesson: true, fen: pos, sfen: pos, sol: sol || [], drill: drill || null, lock: !!lock, counts: () => id === 'reversi' && phase !== 'ramp' && !(phase === 'prob' && cur && cur.k >= RV_NUMS()), ready: () => { const f = onReady; onReady = null; if (f) f(); }, moved: (u, i) => onMoved && onMoved(u, i) }, G || {}) });
          ctx.Table3D.play(true);
        } else if (G && id === 'go') pz().load(G.spec, G.me, { view: G.view, marks: G.marks, lock: !!G.lock });
        else if (G && (id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'hex' || id === 'amazons' || id === 'tafl' || id === 'morris' || id === 'dots')) pz().load(G.spec, G.me, { lock: !!G.lock });
        else if (G && id === 'mancala') pz().load(G.spec, G.me, { lock: !!G.lock, marks: G.marks });
        else if (G && id === 'connect4') pz().load(G.moves, G.me, { lock: !!G.lock });
        else if (G && id === 'backgammon') pz().load(G.bg);
        else if (G && (id === 'ur' || id === 'senet')) pz().load(G[id]);
        else if (G) pz().load(G.start, G.rule, G.me, G.last, { pick: G.pick, noForbid: G.noForbid, lock: !!G.lock });
        else if (drill && pz().drill) pz().drill(Object.assign({ fen: pos }, drill));
        else if (id === 'shogi') pz().load(pos, sol || [], { lock: !!lock });
        else pz().load(pos, sol || []);
      });
    }
    /* ---------- the warm-up before a lesson's problems (chess lessons.json step.ramp = chess/app.js loadRamp / rampMove): first the
       idea on a board with arrows and frames (explain), then a guided move or two (try: any move in ok; a miss is taken back) ---------- */
    const rmk = it => [...(it.hl || []).map(([q, c]) => ({ at: q, cls: c })), ...(it.ar || []).map(([a, b, c]) => ({ arrow: [a, b], cls: c || '' }))];
    async function ramp(i) {
      const it = cur.ramp[i], RU = cur.RU, last = i + 1 >= cur.ramp.length; if (!it) return prob();
      phase = 'ramp'; cur.ri = i; dots(); onMoved = null; let rh = 0, ok = false;
      head(cur.title + ' · ' + RU('step', { i: i + 1, n: cur.ramp.length }));
      const goOn = () => (last ? (cur.k = 0, prob()) : ramp(i + 1));
      const RT = x => D.rampTx ? D.rampTx(L(x, ctx.lang), ctx.lang) : L(x, ctx.lang);   // (connect4: the disc names in the lines)
      choices(null);
      if (it.k === 'explain') say(`💡 <b>${RT(it.t)}</b><br>${D.rampBody ? D.rampBody(it, ctx.lang) : L(it.b, ctx.lang)}`);
      else say((it.k === 'try' ? turnLine(id, D.rampPos ? D.rampPos(it) : it.fen, RT(it.g), ctx.lang) : '') + RT(it.g) + (cur.ramp.findIndex(x => x.k === 'try') === i ? `<br><small>${RU('note')}</small>` : ''));   // (2026-11-23: whose move, on every try)   // (the note once: on the first try)
      act(last ? RU('main') : RU('next'), { hint: it.k === 'try', nextOn: it.k === 'explain' });
      $('[data-a=next]').onclick = goOn;
      $('[data-a=hint]').onclick = () => {
        if (it.k !== 'try' || ok || !pz()) return; rh = Math.min(3, rh + 1);
        if (it.choices) { if (rh < 3) say(RT(it.h)); else { say(RU('ans', { m: '<b>' + it.choices[it.right] + '</b>' })); const b = el.querySelector(`.lsch [data-ci="${it.right}"]`); if (b) b.classList.add('ok'); } return; }   // (ur: a warm-up with choices)
        if (D.rampMarks) {   // gomoku: marks on points
          if (rh === 1) { say(RT(it.h)); pz().mark(D.rampMarks(it)); }
          else if (rh === 2) { say(RT(it.h) + '<br>' + RU('look')); pz().mark(D.rampMarks(it).concat(D.rampLook(it))); }
          else { const a = D.rampAns(it); say(RU('ans', { m: D.spOk ? D.spOk(ctx.lang) : SP('ok', ctx.lang) })); pz().mark(D.rampAnsMk ? D.rampAnsMk(it) : D.rampMarks(it).concat([[a, 'ok']])); }
          return;
        }
        if (rh === 1) { say(RT(it.h)); pz().annot && pz().annot(null); }
        else if (rh === 2) { say(RT(it.h) + '<br>' + RU('look')); pz().annot && pz().annot((it.look || []).map(q => ({ at: q, cls: 'ok' }))); }
        else { say(RU('ans', { m: SP(pz().annot ? 'arrow' : 'mark', ctx.lang) })); if (pz().annot) pz().annot([{ arrow: [it.ok[0].slice(0, 2), it.ok[0].slice(2, 4)], cls: '' }, { at: it.ok[0].slice(0, 2), cls: 'ok' }]); else if (pz().mark) pz().mark(it.ok[0]); }
      };
      await board(D.rampPos ? D.rampPos(it) : it.fen); if (stopped || phase !== 'ramp' || cur.ri !== i) return;
      const marks0 = () => { if (D.rampMarks) pz().mark(D.rampMarks(it)); else if (pz().annot) pz().annot(it.k === 'explain' ? rmk(it) : null); };
      if (it.k === 'explain' && it.seq && it.seq.length) { for (const q of (D.rampSeq ? D.rampSeq(it) : it.seq)) { await sleep(420); if (stopped || phase !== 'ramp' || cur.ri !== i) return; await pz().play(q); } if (stopped || phase !== 'ramp' || cur.ri !== i) return; }   // (an example sequence, played out — 2026-11-24: Next pressed while it walked: this step is over, nothing more on the next one's board)
      marks0();
      let rLine = false;   // (a mate in 3 or more: the first move was right, the line goes on — the defender answers, the player mates)
      const rDone = () => {
        ok = true; if (D.rampMarks) pz().mark(null); else if (pz().annot) pz().annot(null); say(`✓ ${RT(it.y)}`); try { chime(true); } catch (e) {}
        act(last ? RU('main') : RU('next'), {});
        autoGo(2600, () => cur && phase === 'ramp' && cur.ri === i && !more.length, goOn);
      };
      if (it.k === 'try' && it.choices) {   // (ur, 2026-11-24: a warm-up question with choices — the buttons under the words; a miss can be tried again)
        let box = $('.lsch'); if (!box) { box = document.createElement('div'); box.className = 'lsch bgch'; $('.bub').insertBefore(box, $('.cnt')); }
        box.hidden = false; box.innerHTML = it.choices.map((c, k) => `<button type="button" class="btn sm" data-ci="${k}">${c}</button>`).join('');
        box.onclick = e => { const b = e.target.closest('[data-ci]'); if (!b || ok || phase !== 'ramp' || cur.ri !== i) return; const k = +b.dataset.ci;
          if (k === it.right) { box.querySelectorAll('button').forEach((x, j) => { x.disabled = true; x.classList.toggle('ok', j === k); }); rDone(); } else { b.classList.add('ng'); b.disabled = true; say(RU('ng')); try { chime(false); } catch (e2) {} } };
      }
      onMoved = async (u, info) => {
        if (stopped || phase !== 'ramp' || cur.ri !== i) return;
        if (it.k === 'try' && it.goal === 'mate' && it.n > 1 && pz().defend && (rLine || it.ok.includes(u))) {   // (shogi's mates in 3+: played out to the end, 2026-11-15)
          rLine = true; if (pz().annot) pz().annot(null);
          if (info && info.mate) return rDone();
          const remain = it.n - pz().moves().length;
          let reply = null; if (remain > 0) { const r = await pz().defend(remain); if (stopped || phase !== 'ramp' || cur.ri !== i) return; reply = r && r.reply; }
          if (!reply) { say(`${X.escaped}<br>${RU('ng')}`); try { chime(false); } catch (e) {} later(() => { if (cur && phase === 'ramp' && cur.ri === i && !ok) ramp(i); }, 1600); return; }
          await sleep(150); await pz().play(reply); if (stopped || phase !== 'ramp' || cur.ri !== i) return;
          say(RU('cont')); pz().wait(); return;
        }
        if (it.k === 'explain') { if (D.rampUndo) D.rampUndo(pz()); else pz().undo(1); marks0(); pz().wait(); return; }   // (the explanation's board is for looking)
        if (D.rampOk ? D.rampOk(it, u) : it.ok.includes(u)) return rDone();   // (right: on to the next step by itself, the meter on 次へ)
        say(RU('ng')); try { chime(false); } catch (e) {}
        if (D.rampMarks && !['checkers', 'xiangqi', 'janggi', 'backgammon', 'tafl', 'amazons', 'connect4'].includes(id)) pz().mark((id === 'ur' || id === 'senet' ? D.rampMarks(it) : []).concat([[u, 'ng']]));   // (checkers / xiangqi: a move number, not a square — the miss is taken back below)
        later(() => { if (cur && phase === 'ramp' && cur.ri === i && !ok) { if (D.rampUndo) D.rampUndo(pz()); else if (!(it.pick)) pz().undo(1); marks0(); pz().wait(); } }, 1100);
      };
      pz().wait();
    }
    /* ---------- chess's beginner drills (2026-11-13): move the piece and take every ★ — the full game's stages, texts and ★ ---------- */
    const dfen = st => st.fen.split(' ').length > 1 ? st.fen : st.fen + ' w - - 0 1';
    async function drill(i) {
      const st = cur.drill[i]; if (!st) return drillDone();
      phase = 'prob'; cur.k = i; cur.used = 0; dots(); onMoved = null;
      const dx = cur.dx, par = fill(dx('dr.par'), { p: st.par });
      say((i === 0 ? fill(dx('dr.start'), { p: st.par }) : `${cur.goal} ${par}`) + (st.safe && !cur.warned ? '<br>' + dx('dr.danger') : ''));
      if (st.safe) cur.warned = true;
      act(X.next, { again: true, nextOn: false });
      $('[data-a=again]').onclick = () => drill(i);   // やり直す: the stage again
      $('[data-a=next]').onclick = () => (i + 1 < cur.drill.length ? drill(i + 1) : drillDone());
      await board(dfen(st), [], { stars: st.stars, safe: !!st.safe }); if (stopped || cur.k !== i || phase !== 'prob') return;
      onMoved = () => {
        if (stopped || cur.k !== i) return; cur.used++;
        const left = pz().left ? pz().left() : 0;
        if (left > 0) { say(fill(dx('dr.progress'), { n: cur.used, left })); pz().wait(); return; }
        const k = cur.used, n = k <= st.par ? 3 : k <= st.par + 2 ? 2 : 1; cur.stars[i] = n; cur.res[i] = n === 3 ? 20 : n === 2 ? 12 : 6; dots();
        say(`${line('solved') || dx('dr.clear')} <b>${'★'.repeat(n)}${'☆'.repeat(3 - n)}</b><br>${fill(dx('dr.used'), { n: k, p: st.par })}${n < 3 ? ' ' + dx('dr.tryPar') : ''}`);
        try { chime(true); } catch (e) {}
        const last = i + 1 >= cur.drill.length; act(last ? X.result : X.next, { again: true });
        if (!last) autoGo(2200, () => cur && cur.k === i && phase === 'prob' && !more.length, () => drill(i + 1));   // (cleared: on to the next stage by itself, the meter on 次へ)
      };
      pz().wait();
    }
    function drillDone() {
      const n = cur.stars.reduce((a, b) => a + (b || 0), 0), max = cur.drill.length * 3;
      if (cur.qs && cur.qs.length) {   // (2026-11-21 lesson loop: the ★ done, problems from the routes follow — the lesson is cleared by them)
        cur.save(n, max, true); phase = 'done'; dots(); try { chime(true); } catch (e) {}
        const C = CDQ[ctx.lang] || CDQ.en; say(`${C.done} <b>★ ${n} / ${max}</b><br>${C.go[n >= max ? 0 : 1]}`);
        act(X.next, { again: true }); $('[data-a=again]').onclick = () => open(cur.key);
        $('[data-a=next]').onclick = () => { cur.drill = null; cur.probs = cur.qs; cur.save = cur.qsave; cur.res = []; cur.k = 0; prob(); };
        return;
      }
      phase = 'done'; cur.save(n, max); dots();
      say(`${cur.dx('ls.passed')} <b>★ ${n} / ${max}</b><br>${cur.dx('dr.more')}`);
      if (window.AtlasConfetti) try { AtlasConfetti(70); } catch (e) {}
      setTimeout(fanfare, 350);
      act(X.nextL, { again: true });
      $('[data-a=again]').onclick = () => open(cur.key);
      $('[data-a=next]').onclick = nextItem;
      if (ctx.onDone) try { ctx.onDone(); } catch (e) {}
    }

    /* ---------- a lesson / an opening ---------- */
    function open(key) {
      const L2 = ctx.kind === 'open' ? D.opening(key, ctx.lang) : D.lesson(key, ctx.lang, X);
      if (!L2) { say(X.drill); act(X.full, {}); $('[data-a=next]').onclick = () => ctx.onFull && ctx.onFull(ctx.kind, key); return; }
      cur = Object.assign(ncApply(id, L2), { key, k: 0, res: [], si: 0 }); if (ctx.lang === 'ja') window.AtlasGameIntroJa(id, key, ctx.kind, cur); head(cur.title); choices(null);
      if (ctx.kind !== 'open' && (EASY2[id] || []).includes(String(key)) && cur.probs && cur.probs.length > 2) cur.probs = cur.probs.slice(0, 2);   // (2026-11-21 ユーザー：簡単すぎる初級の問題は2問でクリア)
      phase = 'intro'; dots();
      say(`${fill((TOPIC[ctx.lang] || TOPIC.en)[ctx.kind === 'open' ? 1 : 0], { t: `<b>${cur.title}</b>` })}<br>${cur.intro || ''}`);   // (「今日は『ルーク』について学ぶよ！」 — not the bare title, 2026-11-14)
      // (2026-11-14) while the introduction is read, the board shows the lesson's own picture (its diagram) for looking only — never the
      // first problem: no ★, no answer marks, nothing to move until はじめる
      const intro = () => { const ip = D.introPos && D.introPos(cur); if (!ip) return; board(ip.pos, [], ip.drill, ip.lock).then(() => { if (stopped || phase !== 'intro' || !pz()) return; if (ip.annot && pz().annot) pz().annot(ip.annot); if (ip.marks && pz().mark) pz().mark(ip.marks); }); };
      if (cur.drill) { cur.stars = []; cur.qs = cur.probs || []; cur.probs = cur.drill.map(() => ({})); act(X.start); $('[data-a=next]').onclick = () => drill(0); intro(); return; }
      act(X.start); $('[data-a=next]').onclick = () => (ctx.kind === 'open' && cur.steps.length ? study() : cur.ramp ? ramp(0) : prob());
      if (ctx.kind === 'open' && cur.start) board(cur.start);   // (the opening's start position is on the table while reading)
      else intro();
    }
    // the study line: one move at a time, its note when there is one
    async function study() {
      phase = 'study'; dots();
      if (cur.si === 0) { act(X.next, { nextOn: false }); await board(cur.start); if (stopped || phase !== 'study') return; }   // (2026-11-22 進行チェック: はじめる stayed on while the board was set — a second tap reloaded it, and taps in a row never let it get ready)
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
        const note = cur.notes[String(cur.si)], nmk = cur.noteMarks && cur.noteMarks[String(cur.si)]; cur.si++;
        if (nmk && pz().mark) pz().mark(nmk);   // (hex: the cells its note names)
        head(cur.title + ' · ' + fill(X.step, { i: cur.si, n: cur.steps.length }));
        say(note ? L(note, ctx.lang) : '　'); act(X.next);
      };
      $('[data-a=next]').onclick = stepOn; stepOn();
    }
    // (2026-11-12 → 2026-11-23) whose move it is: turnLine (above DATA) — every game, problems and warm-up tries
    // (2026-11-21 user) reversi: the flip counts on the first 2 problems only (1 when the lesson has only 2: EASY2) — the rest are solved without them
    const RV_NUMS = () => cur && cur.probs && cur.probs.length <= 2 ? 1 : 2, RV_SELF = { ja: 'ここからは数字なし。自分で数えて考えてみて！', en: 'From here on, no numbers: count for yourself!' };
    // one problem
    /* a soft fade between COURSES (2026-11-23 user: not between problems — between lesson 1 and lesson 2, so moving to the next course
       is clear): the table dims with a small card 「コース 2 / 9 ・ title」, the next lesson is set up under it, then it clears */
    let veil = null, veilT = 0;
    const veilHold = () => 1600;   // how long the card stays after the next lesson is set up (2026-11-24 user: longer, PC and phone)
    function dim(on, card) {
      const host = ctx.el; if (!host) return Promise.resolve();
      const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, tx = $('.tx');
      clearTimeout(veilT);
      if (on) {
        if (RM) return Promise.resolve();
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        if (!veil) { veil = document.createElement('div'); veil.className = 'ls-veil'; veil.style.cssText = 'position:absolute;inset:0;background:#0b0d14;opacity:0;pointer-events:none;z-index:5;transition:opacity 140ms ease-in'; }
        if (veil.parentNode !== host) host.appendChild(veil);
        veil.style.display = 'flex'; veil.style.alignItems = 'center'; veil.style.justifyContent = 'center';
        // (2026-11-24 user, PC: the card bigger and in the middle of the table; it also stays up longer — VEIL_HOLD)
        const W = host.clientWidth, PC = W >= 700, fT = PC ? Math.round(Math.min(60, Math.max(34, W * .042))) : Math.round(Math.min(34, Math.max(28, W * .08))), fN = Math.round(fT * .5);   // (phone too, 2026-11-24 user)
        veil.innerHTML = card ? '<div style="color:#fff;text-align:center;font-weight:800;line-height:1.3;padding:0 16px;max-width:' + (PC ? '80%' : '92%') + ';text-shadow:0 2px 10px rgba(0,0,0,.55);transform:translateY(6px);transition:transform 320ms ease-out"><div style="font-size:' + fN + 'px;opacity:.8;letter-spacing:.08em">' + card.n + '</div><div style="font-size:' + fT + 'px;margin-top:' + (PC ? 10 : 6) + 'px">' + card.t + '</div></div>' : '';
        void veil.offsetWidth; veil.style.transition = 'opacity 260ms ease-in'; veil.style.opacity = '.82';
        if (veil.firstChild) veil.firstChild.style.transform = 'none';
        if (tx) { tx.style.transition = 'opacity 260ms ease-in'; tx.style.opacity = '0'; }
        veilT = setTimeout(() => dim(false), 3000 + veilHold());   // (never left dark: a slow board load still clears)
        return new Promise(r => setTimeout(r, 280));
      }
      if (veil) { veil.style.transition = 'opacity 420ms ease-out'; veil.style.opacity = '0'; const v = veil; veilT = setTimeout(() => v.remove(), 440); }
      if (tx) { tx.style.transition = 'opacity 420ms ease-out'; tx.style.opacity = ''; }
      return Promise.resolve();
    }
    async function prob() {
      const was = phase, p = cur.probs[cur.k]; if (!p) return finish();
      phase = 'prob'; head(cur.title);   // (2026-11-24 ⑨: the warm-up's 「準備 4/4」 / the line's 「手順」 no longer stays over the problems)
      p.hinted = false; p.used = 0; dots(); act(X.next, { nextOn: false });
      say(turnLine(id, p.pos, p.ask || X.opGoal, ctx.lang) + (id === 'reversi' && cur.k === RV_NUMS() && RV_SELF[ctx.lang] ? RV_SELF[ctx.lang] + '<br>' : '') + (p.ask || X.opGoal));
      await board(p.pos, p.sol, p.drill); if (stopped || cur.probs[cur.k] !== p) return;   // (p.drill: a chess ★ route problem — the ★ left on the table)
      onMoved = (u, info) => moved(p, u, info);
      if (p.marks && p.marks.length && pz().mark) pz().mark(p.marks);
      choices(p);
      if (!p.choices) pz().wait(); act(X.next, { hint: true, nextOn: false });
      $('[data-a=next]').onclick = () => { cur.k++; if (cur.k < cur.probs.length) prob(); else finish(); };
      $('[data-a=hint]').onclick = () => { if (p.ans == null || p.ans < 0 || p.ans === '' || p.done) return; p.hinted = true;
        if (id === 'connect4') { pz().mark(p.hintMk && p.hintMk.length ? p.hintMk : null); say(p.hintTx || X.hintSay); return; }
        if (id === 'reversi' && p.hintMk) { const mk = p.hintMk(); pz().mark(mk.length ? mk : null); say(p.hintTx || X.hintSay); return; }   // (2026-11-21: the lesson's own hint, not the answer ring)
        if (id === 'mancala') { pz().mark(p.base.concat(p.hintMk ? p.hintMk() : [])); say(p.hintTx || X.hintSay); return; }   // (mancala/app.js lsHint: the store, the pits to capture, the threats — never the answer itself)   // (the threats the step's hint names: yours green, the opponent's red)
        if (p.dHint) { pz().mark(p.hint.length ? p.hint.map(q => [q, 'ring']) : null); say(p.hintTx || X.hintSay); return; }   // (dots: the safe lines, or the step's words alone — never the answer)
        if (id === 'gomoku' && Array.isArray(p.hint) && !p.hint.length && p.hintTx) { say(p.hintTx); return; }   // (2026-11-21 the opening hint: words only when no stones to ring)
        if (p.hint && p.hint.length) { pz().mark((id === 'amazons' && p.marks ? p.marks : []).concat(p.hint.map(q => [q, 'ring']))); say(p.hintTx || X.hintSay); return; }   // (gomoku: the lesson's own hint points and words)
        if (p.kind === 'bgplay') { pz().reset(); pz().mark(p.ans); pz().wait(); say((p.hintTx ? p.hintTx + '<br>' : '') + X.hintSay); return; }   // (backgammon: back to the roll's start, rings on the checkers the best play moves)
        if (p.kind === 'choice') { say(p.hintTx || X.hintSay); return; }
        pz().mark(p.ans); say(p.hintTx || X.hintSay); };
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
      if (p.kind === 'tfseq') return tfSeq(p, u, info);
      scored(p, D.points(p.P, u, p), undefined, u);
    }
    // tafl: N moves that keep a forced escape / capture (= tafl/app.js seqAnswer); a move that lets it slip is taken back, a working one shown
    async function tfSeq(p, u, info) {
      const win = () => { p.why = p.good ? p.good() : ''; scored(p, PTS); }, used0 = Math.ceil(pz().moves().length / 2) - 1, left = p.n - used0, pre = pz().moves().slice(0, -1), here = () => !stopped && cur && cur.probs[cur.k] === p;
      say(D.tx('pz.checking', ctx.lang));
      const list = await pz().puzzle(left, false, pre); if (!here()) return;
      p.used = used0 + 1;   // (counted from the board: the solver moves first, so a retry starts from 0)
      if (info.over && info.winner === p.me) return win();
      const e = (list || []).find(x => x.m === u), good = (list || []).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      if (!e || !(e.need > 0) || e.need > left) {
        await sleep(600); if (!here()) return;
        pz().undo(1); pz().mark([...(good[0] ? [{ m: good[0].m, cls: 'ok' }] : []), { m: u, cls: 'ng' }]);
        return scored(p, 0, (p.ng ? p.ng(u, pz().pos(), used0, good[0] ? good[0].m : null) : '') || X.wrong);
      }
      say(D.tx('pz.good', ctx.lang));
      const dl = await pz().puzzle(p.n - p.used, true); if (!here()) return;
      await sleep(300); if (!here()) return;
      if (!dl || !dl.length) return win();
      const r = pz().engine().pickDefence(pz().pos(), dl); if (r == null) return win();
      await pz().play(r); if (!here()) return;
      const st = pz().state(); if (st.over && st.winner === p.me) return win();
      if (st.over) return scored(p, 0, X.wrong);
      pz().wait();
    }
    // (2026-11-12) a partial or wrong answer names the best move in words too (not only the glowing squares)
    // (2026-11-21 ユーザー：印だけでは0点に見える) shogi / chess: the move itself in notation (☗７九銀, ♘g1–f3); other games: 盤に印を付けた手
    const ANSM = { ja: '正解は盤に印を付けた手です。', en: 'The best move is marked on the board.', zh: '正解已在棋盘上标出。', 'zh-TW': '正解已在棋盤上標出。', ko: '정답은 판에 표시한 수입니다.', es: 'La mejor jugada está marcada en el tablero.', fr: 'Le meilleur coup est marqué sur le plateau.', pt: 'O melhor lance está marcado no tabuleiro.', de: 'Der beste Zug ist auf dem Brett markiert.', ru: 'Лучший ход отмечен на доске.', tr: 'En iyi hamle tahtada işaretli.', id: 'Langkah terbaik ditandai di papan.', hi: 'सबसे अच्छी चाल बोर्ड पर चिह्नित है।', ar: 'أفضل نقلة مُعلَّمة على اللوح.' };
    const ANSP = { ja: '正解の手を盤の上で動かして見せます。', en: 'Watch the board: the best move is played out for you.', zh: '看棋盘：正解会为你走一遍。', 'zh-TW': '看棋盤：正解會為你走一遍。', ko: '판을 보세요. 정답 수를 직접 움직여 보여 줍니다.', es: 'Mira el tablero: se juega la mejor jugada para ti.', fr: 'Regardez le plateau : le meilleur coup est joué pour vous.', pt: 'Veja o tabuleiro: o melhor lance é jogado para você.', de: 'Schau aufs Brett: der beste Zug wird dir vorgespielt.', ru: 'Смотрите на доску: лучший ход будет показан.', tr: 'Tahtaya bak: en iyi hamle senin için oynanıyor.', id: 'Lihat papan: langkah terbaik dimainkan untukmu.', hi: 'बोर्ड देखें: सबसे अच्छी चाल आपके लिए चलकर दिखाई जाती है।', ar: 'انظر إلى الرقعة: تُلعب لك أفضل نقلة.' };   // (2026-11-21: games without coordinates on the 3D board — the move itself, played out)
    const ANSW = { ja: '正解は {m}', en: 'Best move: {m}', zh: '正解：{m}', 'zh-TW': '正解：{m}', ko: '정답: {m}', es: 'Mejor jugada: {m}', fr: 'Meilleur coup : {m}', pt: 'Melhor lance: {m}', de: 'Bester Zug: {m}', ru: 'Лучший ход: {m}', tr: 'En iyi hamle: {m}', id: 'Langkah terbaik: {m}', hi: 'सबसे अच्छी चाल: {m}', ar: 'أفضل نقلة: {m}' };
    function moveName(pos, u) {
      if (!pos || !u || typeof u !== 'string') return '';
      if (id === 'shogi') {
        const [bd, side] = String(pos).split(' '), KJ = { p: '歩', l: '香', n: '桂', s: '銀', g: '金', b: '角', r: '飛', k: '玉', '+p': 'と', '+l': '成香', '+n': '成桂', '+s': '成銀', '+b': '馬', '+r': '龍' };
        const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'], mk = side === 'w' ? '☖' : '☗';
        const sq = t => ZEN[+t[0]] + KAN[t.charCodeAt(1) - 96];
        if (u[1] === '*') return mk + sq(u.slice(2, 4)) + KJ[u[0].toLowerCase()] + '打';
        const rows = bd.split('/'), f = +u[0], r = u.charCodeAt(1) - 97; let x = 0, pc = '', pro = '';
        for (const ch of rows[r] || '') { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { x += +ch; continue; } if (9 - x === f) { pc = pro + ch.toLowerCase(); break; } x++; pro = ''; }
        return mk + sq(u.slice(2, 4)) + (KJ[pc] || '') + (u[4] === '+' ? '成' : '');
      }
      if (/^[a-h][1-8][a-h][1-8]/.test(u)) {   // chess (UCI): the piece's letter + from-to
        const rows = String(pos).split(' ')[0].split('/'), f = u.charCodeAt(0) - 97, r = 8 - +u[1]; let x = 0, pc = '';
        for (const ch of rows[r] || '') { if (/\d/.test(ch)) { x += +ch; continue; } if (x === f) { pc = ch; break; } x++; }
        const SY = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '' };
        return (SY[pc.toLowerCase()] || '') + u.slice(0, 2) + '–' + u.slice(2, 4) + (u[4] ? '=' + u[4].toUpperCase() : '');
      }
      return '';
    }
    // a question with choices (backgammon: race / shots / cube): the buttons under the guide's words
    function choices(p) {
      let box = $('.lsch'); if (!box) { box = document.createElement('div'); box.className = 'lsch bgch'; $('.bub').insertBefore(box, $('.cnt')); }
      if (!p || !p.choices) { box.innerHTML = ''; box.hidden = true; return; }
      box.hidden = false; box.innerHTML = p.choices.map((c, i) => `<button type="button" class="btn sm" data-ci="${i}">${c}</button>`).join('');
      box.onclick = e => { const b = e.target.closest('[data-ci]'); if (!b || p.done || cur.probs[cur.k] !== p) return; const i = +b.dataset.ci, ok = i === p.right;
        box.querySelectorAll('button').forEach((x, k) => { x.disabled = true; x.classList.toggle('ok', k === p.right); x.classList.toggle('ng', k === i && !ok); });
        scored(p, ok ? PTS : 0, undefined, i); };
    }
    function scored(p, pts, msg, u) {
      p.done = true; const n = Math.max(0, pts - (p.hinted && pts > 0 ? HINT_PEN : 0)); cur.res[cur.k] = n; dots();
      if (id === 'backgammon') {   // (the best play's arrows green, yours red, from the roll's start; a question: its explanation)
        const right = pts >= 16, k = cur.k;
        if (p.kind === 'bgplay' && u && u.steps) { const best = p.best(); later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().reset(); pz().mark([{ m: best, cls: 'ok' }, ...(right && pts >= 20 ? [] : [{ play: u.steps, cls: 'ng' }])]); }, 700); }
        let teach = '';   // (what the best play is for, and what yours gives up: backgammon/explain.js teach)
        if (p.kind === 'bgplay' && typeof p.good === 'function' && u && u.steps) teach = '<br>' + (pts >= 16 ? p.good(u) : p.ng(u));   // (in ja: ダイスン's short words, BGJ_OP)
        else if (p.kind === 'choice' && typeof p.good === 'function') teach = '<br>' + (right ? p.good() : p.ng(u));   // (a question in ja: the reason, or the answer and what the choice overlooks — bgChJa)
        else if (p.kind === 'bgplay' && window.BGX && BGX.teach && window.AtlasBgTeach) {
          try { const q0 = bgDecP(p.bgPos), mk = mv => { const q = q0.slice(); mv.forEach(c => BG.apply(q, 0, BG.mvFrom(c), BG.mvTo(c))); return { moves: mv, pos: q }; };
            teach = AtlasBgTeach.html(BGX.teach(q0, 0, mk(bgCodes(p.bgPos, p.best()).moves), pts >= 20 ? null : mk(u.steps)), (k, v) => D.tx(k, ctx.lang, v), false, true); } catch (e) { console.warn(e); }
        }
        const own = p.kind === 'bgplay' && typeof p.ng === 'function' && u && u.steps, chJa = p.kind === 'choice' && typeof p.ng === 'function';   // (ダイスン names the green play / the answer himself: the head stays short; p.ownHead (the lessons in bgVoice): his own praise / soft words open it, no head)
        say(`${p.ownHead && (own || chJa) ? '' : chJa ? (right ? '' : 'おしい！') : right ? (own && pts >= 16 ? '' : line('solved') || pick(X.good)) : own ? String(pts > 0 ? X.partial : X.wrong).replace(/([！!]).*$/, '$1') : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (p.why ? '<br>' + p.why : '') + teach);
        try { chime(right); } catch (e) {}
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'ur' || id === 'senet') {   // (2026-11-24: ダイスン's / セティ's reason from the board; a move: back to the problem, the best move's route green, yours red)
        const right = pts >= 16, k = cur.k, mv = p.kind !== 'choice';
        say(`${p.own ? '' : right ? pick(X.good) : X.wrong} <b>${fill(X.pts, { n })}</b><br>` + (right ? p.good(u) : p.ng(u)));
        try { chime(right); } catch (e) {}
        if (mv) later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(); pz().mark([...(right ? [] : [[p.ans, 'ok']]), [u, right ? 'ok' : 'ng']]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'mancala' && typeof u === 'number') {   // (back to the problem: the answer's pit in gold, yours red, every pit's value)
        const right = pts >= 16, k = cur.k, P = p.P;
        say(`${p.own ? (right ? '' : pts >= 10 ? 'いい線！' : 'おしい！') : right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b><br>` + (right ? p.good(u) : p.ng(u)) + (p.sow ? '' : '<br><small>' + D.tx('fb.values', ctx.lang, { a: mcFmt(P.sc[u], false), b: mcFmt(P.sc[P.best], false) }).replace('あなたの手', 'きみの手') + '</small>'));   // (p.own: マンカラビ praises / names the gold pit himself)
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().load(p.pos.spec, 1, { lock: true });
          const best = Math.max(...P.sc.filter(v => v !== null));
          later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().mark([...p.base, { at: P.best, cls: 'ok' }, ...(u !== P.best ? [{ at: u, cls: 'ng' }] : []), ...(p.sow ? [] : P.sc.map((v, j) => v === null ? null : { at: j, label: mcFmt(v, false), best: v >= best }).filter(Boolean))]); }, 260); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'connect4' && typeof u === 'number') {   // (back to the problem: the right column green, yours red)
        const right = pts >= 16, k = cur.k;
        say(`${p.own ? (right ? '' : 'おしい！') : right ? line('solved') || pick(X.good) : X.wrong} <b>${fill(X.pts, { n })}</b>` + (right || !p.own ? (p.good ? '<br>' + p.good(u) : '') : p.ng ? '<br>' + p.ng(u) : ''));   // (p.own: ポトンウサ names the green column and why yours falls short himself)
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([[p.ans, 'ok'], ...(right ? [] : [[u, 'ng']])]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if ((id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'amazons' || id === 'tafl' || id === 'morris' || id === 'dots') && typeof u === 'number') {   // (checkers / xiangqi: the lesson's own words, the moves named by their arrows; back to the problem with the right move green, yours red)
        const right = pts >= 16, k = cur.k;   // (p.own: the guide names the green arrow herself — the heading is only 「おしい！」)
        say(`${right ? (p.own && (id === 'morris' || id === 'janggi' || p.ckls) ? '' : line('solved') || pick(X.good)) : p.own ? (pts > 0 ? 'いい線いってる！' : 'おしい！') : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (right ? (p.good ? '<br>' + p.good(u) : '') : p.ng ? '<br>' + p.ng(u) : ''));
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([...(right || p.ans == null ? [] : [[{ m: p.ans }, 'ok']]), [{ m: u }, right ? 'ok' : 'ng']]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'hex' && typeof u === 'number' && typeof p.ng === 'function') {   // (2026-11-21 lesson loop: ゴイシペン's why / what your move misses; back to the problem with the right cell green, yours red)
        const right = pts >= 16, k = cur.k, N = p.pos.spec.n * p.pos.spec.n, cell = q => q >= 0 && q < N;
        const head = p.own ? (right ? '' : 'おしい！') : right ? okLine() || pick(X.good) : pts > 0 ? X.partial : X.wrong;   // (p.own: ゴイシペン praises / names the green cell himself)
        say(`${head} <b>${fill(X.pts, { n })}</b>` + (right ? (p.good ? '<br>' + p.good(u) : '') : '<br>' + p.ng(u)));
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([...(right || !cell(p.ans) ? [] : [[p.ans, 'ok']]), ...(cell(u) ? [[u, right ? 'ok' : 'ng']] : []), ...(right ? [] : (p._hl || []).filter(q => cell(q) && q !== u && q !== p.ans).map(q => [q, 'hl']))]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'reversi' && u != null && u !== '' && !isNaN(+u) && p.P && (p.P.f || (p.P.rv === 'op' && p.good))) { u = +u;   // (openings too, 2026-11-21)
          // (2026-11-21: back to the problem — the best squares green, yours red; why, in the guide's words)
        const right = pts >= 16, k = cur.k, okA = p.oks || [+p.ans], tx = right ? p.good(u) : p.ng(u);
        say(`${p.own ? (right ? '' : pts > 0 ? 'いい線！' : 'おしい！') : right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (tx ? '<br>' + tx : right ? '' : '<br>' + fill(ANSW[ctx.lang] || ANSW.en, { m: SP('ok', ctx.lang) })));   // (p.own: リバガメ praises / names the green square himself)
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1);
          const danger = right && cur.id === 'corner' ? Object.entries(p.P.f).filter(x => x[1][4] && +x[0] !== u).map(x => [+x[0], 'ng']) : [];
          pz().mark([...okA.filter(q => q !== u).map(q => [q, 'ok']), [u, okA.includes(u) || right ? 'ok' : 'ng'], ...danger]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if ((id === 'gomoku' || id === 'go') && typeof u === 'number') {   // (gomoku: the lesson's own words — why it wins / which points were right; the points marked)
        const okA = (p.P.ok && p.P.ok.length ? p.P.ok : [p.ans]).filter(q => q >= 0);
        const said = pts >= 16 ? (p.good ? '<br>' + p.good(u) : '') : p.ng ? '<br>' + p.ng(u) : '<br>' + fill(ANSW[ctx.lang] || ANSW.en, { m: SP('ok', ctx.lang) });   // (no coordinates: the points are named by their marks)
        pz().mark([...okA.filter(q => q !== u).slice(0, 4).map(q => [q, 'ok']), [u, pts >= 16 ? 'ok' : 'ng'], ...(p._hl || []).filter(q => q !== u && !okA.includes(q)).map(q => [q, 'hl'])]);
        say(`${p.own ? (pts >= 16 ? '' : pts > 0 ? 'いい線！' : 'おしい！') : pts >= 16 ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + said + (id === 'go' && pts < 20 && p.ans >= 0 && !said.includes(SP('ok', ctx.lang)) ? '<br>' + fill(ANSW[ctx.lang] || ANSW.en, { m: SP('ok', ctx.lang) }) : ''));
        if (id === 'go' && p.line && p.line.length > 1) { const k = cur.k; later(async () => { if (!cur || cur.k !== k || phase !== 'prob') return; pz().undo(9); for (const q of p.line) { await sleep(700); if (!cur || cur.k !== k || phase !== 'prob' || stopped) return; await pz().play(q); } }, 900); }   // (go: the right line played out, as the full game)
        try { chime(pts >= 16); } catch (e) {}
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (pts >= 16 && cur.k + 1 < cur.probs.length) { const k = cur.k, w = 2400 + (id === 'go' && p.line && p.line.length > 1 ? 900 + 700 * p.line.length : 0); autoGo(w, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); }); }   // (right: on to the next one by itself)
        return;
      }
      // (2026-11-21) {m} / {x} in the lesson's words (chess) → the best move / yours; a wrong answer gets the lesson's ng words, or the why without its 「正解！」
      const Wm = t => t && /\{[mx]\}/.test(t) ? fill(t, { m: '<b>' + (moveName(p.pos, p.ans) || SP('ok', ctx.lang)) + '</b>', x: '<b>' + (moveName(p.pos, u) || '') + '</b>' }) : t;
      const whyR = Wm((id === 'chess' || id === 'shogi') && typeof p.good === 'function' ? p.good(u) : p.why), whyW = Wm(((id === 'shogi' || id === 'chess') && p.ng ? p.ng(u) : '') || p.ngTx || (p.why || '').replace(/^\s*(正解|Correct|Right)[！!]\s*/, ''));   // (shogi: why the move played falls short, 2026-11-21)
      if (pts >= 16) say(`${p.own ? '' : (p.kind === 'tsume' ? line('solved') : okLine()) || pick(X.good)} <b>${fill(X.pts, { n })}</b>${whyR ? '<br>' + whyR : ''}`);
      else { if (p.ans) { if (p.drill) pz().undo(1); pz().mark(p.ans); } const mvN0 = p.kind !== 'tsume' && p.ans ? moveName(p.pos, p.ans) : '', nm = p.kind !== 'tsume' && p.ans && !(mvN0 && whyW && whyW.replace(/<[^>]+>|\s/g, '').includes(mvN0.replace(/\s/g, ''))), mvN = nm ? mvN0 : ''; say(`${msg || (p.own ? (pts >= (id === 'shogi' ? 10 : 1) ? 'いい線！' : 'おしい！') : pts > 0 ? X.partial : X.wrong)} <b>${fill(X.pts, { n })}</b>${nm ? '<br>' + (mvN ? fill(ANSW[ctx.lang] || ANSW.en, { m: '<b>' + mvN + '</b>' }) : (ANSP[ctx.lang] || ANSP.en)) : ''}${whyW ? '<br>' + whyW : ''}`);
        if (nm && !mvN) { const k = cur.k, mk = p.ans; later(async () => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz() || !pz().play) return; try { let r = await pz().play(mk); if (r === false) { pz().undo(1); await sleep(250); r = await pz().play(mk); } if (r === false) return; await sleep(1600); if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark(mk); } catch (e) { console.warn('[lessons] show move', e); } }, 1000); } }   // (the move is shown on the board, not named: no coordinates, 2026-11-14)
      try { chime(pts >= 16); } catch (e) {}
      act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
      if (pts >= 16 && cur.k + 1 < cur.probs.length) { const k = cur.k; autoGo(2400, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); }); }   // (right: the next problem by itself, the meter on 次へ)
    }
    function finish() {
      phase = 'done'; dots(); choices(null);
      const max = cur.probs.length * PTS, pts = cur.res.reduce((a, b) => a + (b || 0), 0), q = Math.ceil(max * PASS), pass = cur.save(Math.round(pts * 100 / max), 100) || pts >= q;   // (2026-11-21 user: 40 / 40 read 「合格は30点。もう一度挑戦しよう！」 — some saves pass at a fixed 75 of 100, but EASY2 lessons have 2 problems = 40: scored on 100 now)
      say(pass ? fill(X.pass, { p: pts, m: max }) : fill(X.fail, { p: pts, m: max, q }));
      if (pass && window.AtlasConfetti) try { AtlasConfetti(70); } catch (e) {}
      if (pass) setTimeout(fanfare, 350);   // (2026-11-12) the lesson passed: a little fanfare
      // (2026-11-21) not passed: the main button runs the problems again (not the explanation); the ↺ button still starts the lesson over
      const RQ = { ja: '問題をやり直す', en: 'Retry the problems', zh: '重做题目', 'zh-TW': '重做題目', ko: '문제 다시 풀기', es: 'Repetir los problemas', fr: 'Refaire les problèmes', pt: 'Refazer os problemas', de: 'Aufgaben wiederholen', ru: 'Решить задачи снова', tr: 'Soruları tekrar çöz', id: 'Ulangi soalnya', hi: 'प्रश्न फिर से करें', ar: 'أعد حل المسائل' };
      const retry = cur.probs && cur.probs.length && !cur.drill;
      act(pass ? X.nextL : retry ? (RQ[ctx.lang] || RQ.en) : X.again, { again: true });
      $('[data-a=again]').onclick = () => open(cur.key);
      $('[data-a=next]').onclick = pass ? nextItem : retry ? () => { cur.res = []; cur.probs.forEach(p => { p.done = false; p.hinted = false; p.used = 0; }); cur.k = 0; prob(); } : () => open(cur.key);
      if (ctx.onDone) try { ctx.onDone(); } catch (e) {}
    }
    function nextItem() {
      const L2 = D.list(ctx.kind, ctx.lang), i = L2.findIndex(x => x.key === cur.key);
      const nx = L2.slice(i + 1).find(x => !x.full && x.st !== 'pass') || L2.slice(i + 1).find(x => !x.full);
      if (!nx) return say(X.endOnly);
      const CN = { ja: ['コース', '定跡'], en: ['Course', 'Opening'], zh: ['课程', '定式'], 'zh-TW': ['課程', '定式'], ko: ['코스', '정석'] }, j = L2.indexOf(nx);
      const card = { n: ((CN[ctx.lang] || CN.en)[ctx.kind === 'open' ? 1 : 0]) + ' ' + (j + 1) + ' / ' + L2.length, t: String(nx.title || '').replace(/[<>&]/g, '') };
      phase = 'fade'; onMoved = null; autoCancel(); act(X.next, { nextOn: false });   // (no second tap while it dims)
      dim(true, card).then(() => { if (stopped || phase !== 'fade') return dim(false); open(nx.key); setTimeout(() => { if (!stopped) dim(false); }, veilHold()); });
    }
    let ac0 = null;
    function clearJingle(C, v) {   // the problem-clear sound (2026-11-14): テレレレッ・レレー！ — four quick notes up, a stop, then two with the last held over a chord
      const t0 = C.currentTime + .02, note = (f, d, len, g0, type) => { const o = C.createOscillator(), g = C.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(g0, t0 + d + .008); g.gain.setValueAtTime(g0 * .8, t0 + d + Math.min(len * .6, .25)); g.gain.exponentialRampToValueAtTime(.001, t0 + d + len); o.connect(g).connect(C.destination); o.start(t0 + d); o.stop(t0 + d + len + .05); };
      [[784, 0, .07], [880, .075, .07], [988, .15, .07], [1047, .225, .09], [880, .39, .08], [1047, .475, .62]].forEach(([f, d, len]) => { note(f, d, len, v * .45); note(f, d, len, v * .35, 'triangle'); });
      [523, 659, 784].forEach(f => note(f, .475, .62, v * .4, 'triangle'));
    }
    function fanfare() {   // the pass jingle: bells rising C' E' G', then a soft bell chord — bells only (2026-11-14: the user's pick, No.3 of 7, without its fast arpeggio)
      try { if (localStorage.getItem('atlas-sfx') === '0') return; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume();
        const t0 = C.currentTime + .03, out = C.createGain(), comp = C.createDynamicsCompressor(); out.gain.value = .9; out.connect(comp).connect(C.destination);
        const tone = (f, t, len, v, att) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(.0008, t + len); o.connect(g).connect(out); o.start(t); o.stop(t + len + .05); };
        const bell = (f, t, v, len = 1.6) => [[1, 1], [2.76, .35], [5.4, .18], [8.9, .08]].forEach(([r, a]) => tone(f * r, t, len / (r > 1 ? r * .6 : 1), v * a, .004));
        [1046.5, 1318.5, 1568].forEach((f, i) => bell(f, t0 + i * .12, .07));
        [523.3, 784, 1046.5].forEach(f => bell(f, t0 + .42, .05, 2.4));
      } catch (e) {}
    }
    function chime(ok) {
      try { if (localStorage.getItem('atlas-sfx') === '0') return; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); ac0 = C;
        if (ok) return clearJingle(C, .08);
        const t0 = C.currentTime, F = ok ? [523, 659, 784] : [392, 330];
        F.forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + i * .09); g.gain.linearRampToValueAtTime(.08, t0 + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + i * .09 + .3); o.connect(g).connect(C.destination); o.start(t0 + i * .09); o.stop(t0 + i * .09 + .32); });
      } catch (e) {}
    }
    $('[data-a=again]').onclick = () => cur && open(cur.key);
    /* Enter / → = 次へ / はじめる (2026-11-14, a common rule for every lesson; → and ← 2026-11-15): not while typing in a field, nor on a focused button (its own Enter) */
    const onKey = e => {
      if (e.key === 'ArrowLeft' && !e.isComposing && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !stopped && el.isConnected) {   // ← = the previous page of the speech
        const a = document.activeElement; if (a && a !== document.body && a.closest && a.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (back()) { e.preventDefault(); e.stopImmediatePropagation(); } return;
      }
      if ((e.key !== 'Enter' && e.key !== 'ArrowRight') || e.isComposing || e.keyCode === 229 || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.repeat || stopped || !el.isConnected) return;
      const a = document.activeElement; if (a && a !== document.body && a.closest && a.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (e.key === 'Enter' && a && a.matches && a.matches('button:focus-visible,a:focus-visible,[role=button]:focus-visible')) return;   // (Enter on a focused button presses that button; → never does)
      const b = nextB(); if (!b || b.disabled || !b.getClientRects().length) return;
      e.preventDefault(); e.stopImmediatePropagation(); autoCancel(); b.click();
    };
    document.addEventListener('keydown', onKey, true);
    if ($('[data-a=list]')) $('[data-a=list]').onclick = () => ctx.onList(ctx.kind);   // 一覧 (the portal's list sheet)
    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); act(X.next, { nextOn: false });
    Promise.all([D.load(ctx.lang), ncLoad(id), lsvLoad(ctx.lang)]).then(() => { if (stopped) return; const go = k => k != null ? open(String(k)) : say(X.endOnly); if (ctx.key != null) go(ctx.key); else next(id, ctx.kind, ctx.lang).then(go); }).catch(() => { if (!stopped) say('⚠'); });
    const dbg = { state: () => cur && { key: cur.key, phase, k: cur.k, si: cur.si, res: cur.res.slice(), ans: cur.probs[cur.k] && cur.probs[cur.k].ans, ramp: phase === 'ramp' && cur.ramp && cur.ramp[cur.ri] ? cur.ramp[cur.ri].ans : undefined, moves: cur.probs[cur.k] && cur.probs[cur.k].P && cur.probs[cur.k].P.f ? Object.keys(cur.probs[cur.k].P.f).map(Number) : cur.probs[cur.k] && cur.probs[cur.k].P && cur.probs[cur.k].P.cand ? cur.probs[cur.k].P.cand.map(c => c[0]) : null, say: $('.tx').textContent },
      data: () => D,
      open: (k, kind) => { if (kind) ctx.kind = kind === 'open' ? 'open' : 'lesson'; open(String(k)); }, items: kind => { const kd = kind === 'open' ? 'open' : 'lesson'; if (kd === 'open' && typeof D.opening !== 'function') return null; try { return (D.list(kd, ctx.lang) || []).filter(x => !x.full).map(x => ({ key: x.key, title: x.title })); } catch (e) { return null; } }, cur: () => cur, pz: () => pz(),   // (test hooks: tools/lesson-progress.js plays every problem)
      toProb: () => { if (cur && cur.probs.length) { cur.k = 0; prob(); } },   // (test hook: straight to the problems)
      seqAns: async () => { const p = cur && cur.probs[cur.k]; if (!p || p.kind !== 'tfseq' || !pz()) return null; const pre = pz().moves().slice(), left = p.n - (Math.ceil((pre.length + 1) / 2) - 1);   // (test hook, tafl's N-move problems: a move that keeps the forced escape / capture, as tfSeq checks it)
        const L = await pz().puzzle(left, false, pre), g = (L || []).filter(x => x.need > 0 && x.need <= left).sort((x, y) => x.need - y.need); return g[0] ? g[0].m : null; },
      drillEnd: () => { if (cur && cur.drill) drillDone(); },
      rampAnswer: async () => { const it = cur && phase === 'ramp' && cur.ramp && cur.ramp[cur.ri]; if (!it || !pz()) return false; if (it.choices) { const b = el.querySelector(`.lsch [data-ci="${it.right}"]`); if (b) b.click(); return !!b; } if (id === 'backgammon' && it.k === 'try' && window.BG) {   // (backgammon: a legal play of the roll that the warm-up's ok accepts, as the player moves — 2026-11-22: it.ok is a rule, not a move)
          const q0 = bgDecP(it.pos), pl = BG.genPlays(q0, 0, it.dice[0], it.dice[1]).find(x => D.rampOk(it, { pos: x.pos, steps: x.moves })); if (!pl) return false;
          await pz().play(pl.moves); if (onMoved) await onMoved({ key: BG.key(pl.pos), steps: pl.moves, pos: pl.pos }, {}); return true; }
        let u = it.ok ? it.ok[0] : D.rampAns ? D.rampAns(it) : it.ans; if (u == null) return false;   // (reversi: the warm-up's answer is it.ans, no it.ok)
        if (it.goal === 'mate' && pz().moves && pz().moves().length && pz().mateMove) { const m = await pz().mateMove(Math.max(1, (it.n || 3) - pz().moves().length)); if (m) { await pz().play(m); if (onMoved) await onMoved(m, { mate: pz().moves().length >= (it.n || 3) }); return true; } }   // (a mate in 3+: the next mating move)
        const E = { amazons: window.AmazonsEngine, checkers: window.CheckersEngine, xiangqi: window.XiangqiEngine }[id];   // (a warm-up named by notation: the engine's move with that name)
        if (E && it.s && D.rampOk) { const ms = E.Pos.from(it.s).moves(), m = ms.find(x => D.rampOk(it, x)); if (m !== undefined) u = m; }
        else if (D.rampOk && !D.rampOk(it, u) && D.rampAns) { const a = D.rampAns(it); if (a != null && typeof a !== 'object') u = a; } await pz().play(u); if (onMoved) await onMoved(u, {}); return true; },   // (test hook: a warm-up's guided move)   // (test hook: a chess ★ drill done — on to its route problems)
      answer: async u => { const p = cur && cur.probs[cur.k]; if (!p || !pz()) return;
        if (p.choices) { const b = el.querySelector(`[data-ci="${typeof u === 'number' ? u : p.right}"]`); if (b) b.click(); return; }   // (a question with choices: its button — 2026-11-22, backgammon's race / shots / cube)
        if (p.kind === 'bgplay') { const m = typeof u === 'string' ? u : p.best(), c = bgCodes(p.bgPos, m), q = bgDecP(p.bgPos); c.moves.forEach(x => BG.apply(q, 0, BG.mvFrom(x), BG.mvTo(x))); await pz().play(c.moves); return moved(p, { key: c.key, steps: c.moves, pos: q }); }   // (backgammon: a play by the json's letter pairs)
        u = u == null || u === '' ? p.ans : u; await pz().play(u); let mate = false; try { mate = p.kind === 'tsume' && (p.sol || []).length > 0 && pz().moves().length >= p.sol.length && pz().moves().every((x, i) => x === p.sol[i]); } catch (e) {} moved(p, u, { mate }); } };   // (a mate problem played along its stored line to the end: mate)   // (test hook; pit / column 0 is an answer too)
    window.__atlasLs = dbg;
    return {
      stop() { autoCancel(); stopped = true; clearTimeout(veilT); if (veil) veil.remove(); document.removeEventListener('keydown', onKey, true); if (window.__atlasLs === dbg) delete window.__atlasLs; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el, _debug: dbg,
    };
  }
  window.AtlasLessonsTurn = { turnOf, turnLine, N: TURN_N }; window.AtlasLessons = { has: id => !!DATA[id], list, next, start, data: id => DATA[id].load().then(D => D.data) };
})();
