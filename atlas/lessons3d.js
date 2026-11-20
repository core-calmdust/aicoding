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
      ja: { hi: 'ハコピヨだよ！ いっしょにドット・アンド・ボックスのお勉強をしよう。', partial: 'いい線！ でもいちばんは緑の線なんだ。', wrong: 'おしい！ 正解は緑の線だよ。', hintSay: 'ヒント：金色の線を見てね。' },
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
  const lsvLoad = lang => lang !== 'ja' ? Promise.resolve() : LSV.p || (LSV.p = fetch('lsvoice-ja.js?v=2').then(r => r.ok ? r.text() : '').then(t => { const w = {}; try { new Function('window', t)(w); } catch (e) {} LSV.d = w.AtlasLsVoice || {}; }).catch(() => { LSV.d = {}; }));
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
      out.push((px ? `{x}だと${px}は取れるけど、` : '{x}だと、') + (d > .35 ? '形勢がぐっと悪くなっちゃうの。' : d > .12 ? 'けっこう損をしちゃうんだ。' : 'ほんの少しだけ損なの。')); }
    if (SHJ.tip[gid]) out.push(SHJ.tip[gid]);
    return out.join('');
  }
  const SHOGI = {
    LKEY: 'shogi-kaya-lessons-v1', OKEY: 'shogi-kaya-open-v1', CATS: ['beg', 'mid', 'adv', 'sp', 'new', 'castle', 'handi'], data: null,
    load() {
      if (this.p) return this.p;
      const voice = fetch('../shogi/voice-fox-ja.js?v=3').then(r => r.ok ? r.text() : '').then(t => { const w = {}; try { new Function('window', t)(w); } catch (e) {} this.V = ((w.I18N || {})['ja@fox']) || {}; }).catch(() => { this.V = {}; });   // (ショウギツネ's own lines, 3D, ja)
      return (this.p = Promise.all([voice, getJ('../shogi/lessons.json?v=20261121k2'), getJ('../shogi/openings.json?v=20261107l14'),
        ...['beg', 'mid', 'adv', 'sp', 'new', 'castle'].map(c => getJ(`../shogi/openings-${c}.json?v=20261107l14`).catch(() => ({ sets: [] })))])
        .then(([_, ls, op, ...more]) => {
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
      const probs = g.rules ? pool : shuffle(pool).slice(0, 5);
      // the warm-up (lessons.json grade.ramp, shogi/tools/ramps.js; 2026-11-15 on the 3D table): the 2D form → the runner's (fen, hl, ar)
      const HLC = { ng: 'hang', ok: 'ok', hl: '' };
      const V = lang === 'ja' ? (this.V || {}) : {}, vo = k => V[k] != null ? { ja: V[k], __voice: true } : null;   // (ショウギツネ's lines win over the plain texts and atlas/nocoord)
      const ramp = (g.ramp || []).map((it, j) => { const o = Object.assign({}, it, { fen: it.sfen, hl: (it.marks || []).map(([q, c]) => [q, HLC[c] ?? '']), ar: (it.arrows || []).map(([a, b]) => [a, b, '']) });
        ['t', 'body', 'g', 'h', 'y'].forEach(f => { const v = vo(`ramp:${g.id}/${j}/${f}`); if (v) o[f] = v; }); return o; });
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: g.id, title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, intro: V['intro:' + g.id] || (L(g.intro, lang) || []).join('<br>'), ramp: ramp.length ? ramp : null, RU,
        probs: probs.map((p, i) => { const ja = lang === 'ja', best = p.kind !== 'tsume', AQ = ja && best ? SHJ.ask[g.id] : null, ans = p.sol ? p.sol[0] : (p.accept || p.pv || [])[0], pm = ja && p.mode === 'material' ? shCap(p.sfen, ans) : '';
          const why = L((NC.shogi || {})[g.id + '/p' + g.problems.indexOf(p) + '/expl'] || p.expl, lang);   // (3D: the words without coordinates)
          return { pos: p.sfen, kind: best ? 'best' : 'tsume', n: p.n, sol: p.sol, P: p,
            ask: L(p.q, lang) || (!best ? fill(ja ? ['<b>{n}手詰め</b>。王手を続けて玉を詰ませよう！', '<b>{n}手詰め</b>だよ。玉の逃げ道をよく見てね。', '<b>{n}手詰め</b>に挑戦！ 最後まで読み切るコン。'][i % 3] : X.tsume, { n: p.n }) : AQ ? AQ[i % AQ.length] : V['prompt:' + g.id] || L(g.prompt, lang)),
            why: why || (pm ? `{m}で${pm}を取ったね。取れる駒の中で、いちばん価値が高い駒なの。` : ja && g.id === 'rx' && best ? 'それがいちばん良い手だコン。駒落ちでも、ふつうの将棋と同じように、駒の働きを大事にしてね。' : ja && !best ? ['逃げ道をぜんぶふさいで、ちゃんと詰ませたね。', '王手を続けて、玉をつかまえたコン！', 'おみごと！ 最後まで読み切れたね。'][i % 3] : ''), ans,
            hintTx: ja ? (best || g.id === 'rx' ? SHJ.hint[g.id] || '' : SHJ.hint.tsume) : '', ng: ja && (best ? p.cand : true) ? u => shTeachJa(g.id, Object.assign({ why }, p), u) : null }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.sets.find(x => x.id === key); if (!s) return null;
      const probs = (s.problems || []).length ? (s.handi ? s.problems.map((p, i) => i) : shuffle(s.problems.map((p, i) => i))).slice(0, 5).sort((a, b) => s.handi ? a - b : 0).map(i => s.problems[i]) : [];
      const nc = NC.shogi || {}, notes = Object.assign({}, s.study && s.study.notes || {}); Object.keys(nc).forEach(k => { const m = k.match(/^op:(.+)\/n(\d+)$/); if (m && m[1] === s.id) notes[m[2]] = nc[k]; });   // (3D: the notes without coordinates)
      return { id: s.id, title: L(s.title, lang), intro: L(nc['op:' + s.id + '/short'] || s.short, lang), start: s.study && s.study.start, steps: (s.study && s.study.steps || []).map(x => x[0]), notes,
        probs: probs.map(p => ({ pos: p.sfen, kind: 'best', P: p, ans: (p.accept || p.pv || (p.cand && [p.cand[0][0]]) || [])[0] })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= Math.ceil(max * PASS); pr[s.id] = { best: Math.max(o.best || 0, Math.round(pts * 100 / max)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    introPos() { return { pos: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1', lock: true }; },
    rampBody: (it, lang) => L(it.body, lang),   // (no diagram in lessons.json: the starting position, for looking only, while the intro is read)
    points(P, u) {   // = shogi/index.html movePoints (without the engine's runtime score)
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
      french: 'フレンチ・ディフェンスは、守りの堅さが自慢の序盤ピョン。黒はポーンを1マス進めて支えを作り、隣のポーンを2マス進めて白の中央に挑むんだ。<br>中央が閉じたら、ポーンの鎖の根元を横から攻めるのが黒の作戦。クイーン側のビショップが出にくいのが弱点だね。',
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
  function chAtt(b, q, white) {   // the cheapest piece of that side attacking square q ('' when none)
    let best = ''; const take = ch => { if (!best || CH_VAL[ch.toLowerCase()] < CH_VAL[best.toLowerCase()]) best = ch; }, r = q >> 3, f = q & 7, mine = ch => ch && chW(ch) === white;
    const at = (rr, ff) => rr >= 0 && rr < 8 && ff >= 0 && ff < 8 ? b[rr * 8 + ff] : null;
    for (const df of [-1, 1]) { const ch = at(white ? r - 1 : r + 1, f + df); if (mine(ch) && ch.toLowerCase() === 'p') take(ch); }
    for (const [dr, df] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const ch = at(r + dr, f + df); if (mine(ch) && ch.toLowerCase() === 'n') take(ch); }
    for (let dr = -1; dr <= 1; dr++) for (let df = -1; df <= 1; df++) { if (!dr && !df) continue; const ch = at(r + dr, f + df); if (mine(ch) && ch.toLowerCase() === 'k') take(ch);
      const kinds = dr && df ? 'bq' : 'rq'; let rr = r + dr, ff = f + df; while (at(rr, ff) === '') { rr += dr; ff += df; } const c2 = at(rr, ff); if (mine(c2) && kinds.includes(c2.toLowerCase())) take(c2); }
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
    const nb = chMove(b, u), att = lo === 'k' ? '' : chAtt(nb, z, !white), def = chAtt(nb, z, white);
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
  function chWhyJa(F) {   // why the move is played (one or two short sentences)
    if (F.castle) return 'キャスリングでキングを端の安全な場所へ移して、ルークも働きやすくする手なんだ。';
    if (F.cap && F.behind) return `取られた駒をすぐ${CH_PN[F.cap]}で取り返す手。ここで取り返さないと、駒損のままになっちゃう！`;
    if (F.cap) return `相手の${CH_PN[F.cap]}を取る手。ここで取っておくのが、この形の定跡なんだ。`;
    if (F.pin) return `${CH_PN[F.pc]}で相手の${F.pin[0]}をピン！ ${F.pin[0]}が動くと、後ろの${F.pin[1]}が取られちゃう形なんだ。`;
    if (F.chase) return `ポーンで相手の${F.chase}を追い払う手。追われた${F.chase}は、逃げ場所を考えなきゃいけない。`;
    if (F.dev) return `まだ動いていない${CH_PN[F.pc]}を外へ出す手。序盤は駒を早く出すのが大事ピョン！` + (F.aim ? ` 相手の${F.aim}もねらえるおまけつき。` : '');
    if (F.centre) return '中央のポーンを進めて、盤のまん中を押さえる手。中央を取ると、駒がぐんと動きやすくなるピョン！';
    if (F.side) return '中央の隣のポーンで、まん中のマスを横から支える手だピョン。';
    if (F.aim) return `${CH_PN[F.pc]}で相手の${F.aim}をねらう手。相手は守りに1手使わなきゃいけないピョン。`;
    if (F.fian) return '端に近いポーンを1マス進めて、ビショップを長い対角線に出す準備をする手なんだ。';
    if (F.flank && F.two) return '端のポーンを2マス進めて、相手の陣地に攻めかかる手。';
    if (F.flank) return '端のポーンで、相手の駒が入ってくるマスを先にふさいでおく手なんだ。';
    return 'この形で、強い人たちが本筋と考えている手だピョン。';
  }
  function chShortJa(F) { return F.castle ? 'キングを安全にできる' : F.cap && F.behind ? '駒を取り返せる' : F.cap ? '駒を取れる' : F.pin ? 'ピンをかけられる' : F.chase ? '相手の駒を追い払える' : F.dev ? '新しい駒を出せる' : F.centre ? '中央を押さえられる' : F.side ? 'まん中を横から支えられる' : F.aim ? '相手の駒をねらえる' : '定跡どおりの形になる'; }
  function chHintJa(F, k) {
    if (F.castle) return 'キングはまだ真ん中にいるね。安全な場所へ逃がす手が光ってるピョン。';
    if (F.cap && F.behind) return '駒の数を数えてみて。いま、どっちが得をしてる？ 光ってる手がヒント！';
    if (F.cap) return '光ってる手を見てね。取れる相手の駒がありそうだピョン！';
    if (F.pin) return `相手の${F.pin[0]}の後ろに、何がいるか見てみて！ 光ってる手がヒントだよ。`;
    if (F.chase) return `相手の${F.chase}のすぐ近くまでポーンを進めたら、どうなる？`;
    if (F.dev) return ['まだ一度も動いていない駒を探してみて。光ってるところがヒント！', '序盤の基本は「駒を出す」。光ってる駒が、出番を待ってるピョン！'][k % 2];
    if (F.centre || F.side) return '盤のまん中の4マスを、だれが押さえてるか見てみよう。光ってる手がヒント！';
    return '光ってる手が、強い人がいちばん選んだ手。指したあとの形を想像してみて！';
  }
  function chOpJa(o, name, hs, i) {
    const P = o.P, C = P.cand || [], N = P.n || C.reduce((s, x) => s + x[1], 0) || 1, A = o.ans, side = String(o.pos).split(' ')[1] === 'b' ? '黒' : '白';
    const pc = c => Math.max(1, Math.round(c / N * 100)), cnt = new Map(C), FA = chFacts(o.pos, A), k = hs + i;
    const nm = /[a-h][1-8]/.test(name) ? 'この序盤' : name;
    const ask = fill(CHJ_OP.ask[k % CHJ_OP.ask.length], { n: nm, s: side }).replace('『この序盤』', 'この序盤');
    const good = u => { if (u && u !== A && cnt.has(u)) return `{x}も人気の手！ 実戦では${pc(cnt.get(u))}%、いちばん多い{m}も${pc(cnt.get(A))}%で、どっちも本筋なんだ。`;
      const w = chWhyJa(FA); return w + (/！$/.test(w) ? ' ' : '') + fill(CHJ_OP.pct[k % CHJ_OP.pct.length], { a: pc(cnt.get(A) || 0) }); };
    const ng = u0 => {
      let u = u0; if (!u || u === A) u = (C.find(x => x[0] !== A) || [])[0]; if (!u) return CHJ_OP.lead[k % CHJ_OP.lead.length] + chWhyJa(FA);
      const out = [CHJ_OP.lead[k % CHJ_OP.lead.length]];
      if (cnt.has(u)) { const b = pc(cnt.get(u)), a = pc(cnt.get(A)); out.push(b >= a ? `{x}も{m}と同じくらい指される手（${b}%）。{m}のほうがわずかに多いから、こっちを正解にしているんだ。` : b * 2 >= a ? `{x}もよく指される手（${b}%）。でも{m}なら${a}%で、こっちがいちばんの本筋なんだ。` : `{x}も実戦で指される手だけど、${b}%だけ。{m}なら${a}%の人が選んでいて、${chShortJa(FA)}んだ。`); return out.join(''); }
      let F; try { F = chFacts(o.pos, u); } catch (e) { F = {}; }
      if (F.hang) out.push(`{x}だと、その${CH_PN[F.pc]}が相手の${F.hang}に取られて損しちゃう！`);
      else if (FA.cap && FA.behind && !F.cap) out.push('{x}だと取り返しそびれて、駒損のままになっちゃう。');
      else if (F.king && !F.castle) out.push('{x}でキングが動くと、もうキャスリングできなくなっちゃうんだ。');
      else if (FA.castle) out.push('{x}だとキャスリングが遅れて、キングが真ん中に残っちゃう。');
      else if (F.pc === 'q' && F.move <= 10 && !F.cap) out.push('{x}のように序盤でクイーンを動かすと、相手の駒に追い回されて手損しやすいんだ。');
      else if (F.pc === 'r') out.push('ルークは序盤ではまだ働きにくい駒。先にナイトやビショップを出そう！');
      else if (FA.dev && (F.pc === 'n' || F.pc === 'b') && !F.dev) out.push('{x}は同じ駒をもう一度動かす手。まだ出ていない駒を先に出そう！');
      else if (FA.dev && F.pc === 'p') out.push('{x}だとポーンの手で1手使っちゃう。まだ出ていない駒を出すほうが先ピョン。');
      else if (F.flank) out.push('{x}の端のポーンは、中央の争いにはあまり役立たないんだ。');
      else out.push(`{x}は強い人の対局ではほとんど指されない手。{m}なら${chShortJa(FA)}から、こっちを選びたい！`);
      return out.join('');
    };
    return { ask, hintTx: chHintJa(FA, k), good, ng };
  }
  const CHESS = {
    LKEY: 'aicoding-chess-lessons', OKEY: 'aicoding-chess-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const txt = u => fetch(u).then(r => r.text());
      return (this.p = Promise.all([getJ('../chess/lessons.json?v=20261107i14'), getJ('../chess/openings.json?v=20261107i14'), txt('../chess/i18n.js?v=20261107pro2-i14'), txt('../chess/i18n_basics.js?v=20261019ol-i14'), txt('../chess/voice-knight-ja.js?v=1').catch(() => '')])
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
      if (s.kind === 'drill') return { id: s.id, title: T('title'), intro: T('intro'), goal: T('goal'), drill: s.stages, probs: [], dx: k => this.tx(k, lang),   // ★ stages (= chess/app.js drillMove: 3 ★ within par, 2 within par + 2, else 1; always passed)
        save: n => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }; pr[s.id] = { best: Math.max(o.best || 0, n), clear: true }; put(this.LKEY, pr); return true; } };
      const V = lang === 'ja' ? (this.V || {}) : {};
      const RU = (k, v) => fill(V['ui:' + k] != null ? V['ui:' + k] : L((this.data.ls.rampUi || {})[k], lang), v || {});
      const ramp = s.ramp && s.ramp.length ? s.ramp.map((it, j) => { const o = Object.assign({}, it); ['t', 'b', 'g', 'h', 'y'].forEach(f => { const v = V[`ramp:${s.id}/${j}/${f}`]; if (v != null) o[f] = { ja: v, __voice: true }; }); return o; }) : null;
      return { id: s.id, title: T('title'), intro: T('intro'), ramp, RU,   // (the warm-up before the scored problems: explain / try — not scored)
        probs: (s.problems || []).map(p => ({ pos: p.fen, kind: 'best', P: p, ask: T('goal'), why: T('why'), ngTx: T('ng'), ans: p.best || (p.ok || [])[0] })),   // (ngTx: the wrong answer's own words where the lesson has them)
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.op.sets.find(x => x.id === key); if (!s) return null;
      const probs = shuffle(s.problems || []).slice(0, 5);
      const nc = NC.chess || {}, notes = Object.assign({}, s.study && s.study.notes || {}); Object.keys(nc).forEach(k => { const m = k.match(/^op:(.+)\/n(\d+)$/); if (m && m[1] === s.id) notes[m[2]] = nc[k]; });   // (3D: the texts without coordinates)
      const IN = nc['op:' + s.id + '/intro'] || s.intro, ja = lang === 'ja';
      if (ja && CHJ_OP.notes[s.id]) Object.entries(CHJ_OP.notes[s.id]).forEach(([k, v]) => { notes[k] = { ja: v }; });   // (2026-11-21 lesson loop: ナイトン's own lines)
      return { id: s.id, title: L(s.title, lang), intro: ja && CHJ_OP.intro[s.id] ? CHJ_OP.intro[s.id] : (L(IN, lang) || []).join ? L(IN, lang).join('<br>') : L(IN, lang), start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        steps: (s.study && s.study.steps || []).map(x => x[0]), notes,
        probs: probs.map((p, i) => { const o = { pos: p.fen, kind: 'best', P: p, ans: p.cand && p.cand[0][0] }; if (ja && o.ans) try { Object.assign(o, chOpJa(o, L(s.title, 'ja'), s.id.length * 3, i)); } catch (e) { console.warn('[lessons3d] chess opening', e); } return o; }),
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
  /* (2026-11-21 lesson loop) the reversi lesson problems in リバガメ's words, Japanese: varied questions, and after the answer why the
     move is good / what the green square does better than yours (= reversi/index.html lessonReason, from the stored move facts
     f[sq] = [value, flips, open, opponent's moves after, gives a corner, empty region, opponent passes]). No coordinates: the best
     squares are framed green on the board, yours red. Other languages: the marks and the plain line. */
  const RVJ_ASK = {
    rules: ['いちばんたくさん返せる場所はどこかな？ 数字を見くらべてみてね。', '8方向ぜんぶ数えて、いちばん多く返せる場所に打ってみよう。', 'この場面で、いちばん多くひっくり返せるのはどこだろう？'],
    corner: ['どこに打つのがいちばんいいかな？ 隅と、XやCのマスに気をつけてね。', '隅は取れるかな？ 取れないときは、相手に隅を渡さない手をさがそう。', 'この場面のいちばんいい手はどこだろう。打ったあと、相手が隅を取れないかも見てね。'],
    mobility: ['いちばんいい手をさがそう。打ったあと、相手は何か所に打てるかな？', '石の数より、相手の打てる場所の数。いちばんいい手はどこだろう？', 'じっくり見て、いちばんいい手に打ってみて。相手に足場をあげない手がねらい目なんだ。'],
    quiet: ['いちばんいい手はどこかな？ 返す石のまわりの空きに注目してみて。', '静かな手をさがそう。でも、相手に隅をあげないかも見てね。', 'この場面のいちばんいい手に打ってみよう。のんびり考えていいからね。'],
    wall: ['いちばんいい手に打ってみよう。外がわに石を並べないようにね。', '壁を作らない手はどれかな？ 余裕手をとっておけるかも見てみて。', 'この場面、どこに打つのがいちばん得だろう？'],
    edge: ['辺をよく見て、いちばんいい手をさがそう。', '相手の辺に、すき間はないかな？ いちばんいい手に打ってみて。', 'この場面のいちばんいい手はどこだろう。辺の形がヒントなんだ。'],
    exception: ['隅は取るべきかな？ いちばんいい手をじっくりさがそう。', 'いつもの格言どおりでいいのかな？ 打ったあとのことを考えてみて。', 'この場面のいちばんいい手はどこだろう。隅やXにも、例外があるんだ。'],
    parity: ['空きの塊を数えて、いちばんいい手をさがそう。', '終盤だね。最後の1手を取れるのは、どこに打ったときかな？', 'いちばんいい手に打ってみよう。奇数の塊が、まず候補になるよ。'],
    finish: ['勝ちを守れる手は、ひとつだけ。どこかな？', '終盤の正念場だね。勝ち（か引き分け）を守れる手をさがそう。', 'ほかの手はみんな負けになっちゃう場面。正しい1手はどこだろう？'],
  };
  const RV_CN = [0, 7, 56, 63], RV_X = { 9: 0, 14: 7, 49: 56, 54: 63 }, RV_C = { 1: 0, 8: 0, 6: 7, 15: 7, 48: 56, 57: 56, 55: 63, 62: 63 };
  function rvTeachJa(kind, P, u, right) {
    const F = P.f || {}, ks = Object.keys(F).map(Number), v = q => F[q][0], top = Math.max(...ks.map(v)), bs = ks.filter(q => v(q) >= top - 1e-9);
    if (!ks.length) return '';
    u = +u;
    if (!right && (!F[u] || bs.includes(u))) {   // (no wrong move given: the most telling one — a move that hands over a corner, else the worst)
      const w = ks.filter(q => !bs.includes(q)); if (!w.length) return '';
      u = (kind !== 'parity' && kind !== 'finish' && w.find(q => F[q][4])) || w.reduce((a, q) => v(q) < v(a) ? q : a, w[0]);
    }
    const b = bs.includes(u) ? u : bs[0], fu = F[u] || F[b], fb = F[b], c = String(P.cells).split('').map(Number);
    let sd = 0; for (const ch of String(P.cells) + kind) sd = (sd * 31 + ch.charCodeAt(0)) | 0; sd = Math.abs(sd);
    const pk = a => a[sd++ % a.length];
    const xc = q => RV_X[q] != null && !c[RV_X[q]] ? 'X' : RV_C[q] != null && !c[RV_C[q]] ? 'C' : '';
    const res = n => n > 0 ? `${n}石差で勝ち` : n < 0 ? `${-n}石差で負け` : '引き分け';
    const exact = P.type === 'exact', d = Math.round(v(b) - v(u));
    const loss = () => exact ? `最後は、赤い枠だと${res(v(u))}、緑の枠なら${res(v(b))}になるんだ。` : d <= 2 ? '赤い枠も悪くないけど、緑の枠のほうが少しだけ得。差は小さいから、気にしすぎなくていいよ。' : `赤い枠だと、形勢がおよそ${d}石ぶん悪くなっちゃうんだ。`;
    const mob = () => `打ったあと相手が打てる場所は、赤い枠だと${fu[3]}か所、緑の枠なら${fb[3]}か所。`;
    const out = [];
    if (right) {
      if (!bs.includes(u)) out.push(pk(['いい手だね。でも、いちばんは緑の枠の手なんだ。', 'なかなかの手。いちばんいいのは、緑の枠のほうだったよ。']));
      switch (kind) {
        case 'rules': out.push(pk([`${fu[1]}枚、ちゃんと数えられたね。8方向ぜんぶ見るのがコツなんだ。`, `いちばん多い${fu[1]}枚を見つけたね。ななめの列まで見られたのがえらい。`, `${fu[1]}枚返る場所だね。縦・横・ななめを、のこさず数えられたんだ。`])); break;
        case 'corner':
          if (RV_CN.includes(u)) out.push(pk(['隅を取ったね。隅の石はもう返されないから、ここから辺に確定石が広がっていくんだ。', '隅をしっかり取れたね。二度と返されない石は、終盤までたよれる味方になるよ。']));
          else if (P.trap) out.push('この場面は隅が取れないんだ。だから、相手に隅への通り道を作らない手がいちばんなんだね。');
          else out.push('相手に隅への通り道を作らない、安全な手だね。');
          if (ks.some(q => q !== u && F[q][4])) out.push(pk(['赤い枠に打っていたら、相手に隅を渡すところだったんだ。', '赤い枠の手は、相手に隅をあげちゃう手。よくよけられたね。']));
          break;
        case 'mobility': {
          const mn = Math.min(...ks.map(q => F[q][3])), mf = ks.reduce((a, q) => F[q][1] > F[a][1] ? q : a, ks[0]);
          out.push(`打ったあと、相手が打てる場所は${fu[3]}か所。` + (fu[3] <= mn ? 'いちばん少なく抑えられたね。' : 'うまく抑えられたね。'));
          if (mf !== u && F[mf][3] > fu[3]) out.push(`いちばん多く返す手だと、${F[mf][3]}か所に増えちゃうんだ。`);
          break;
        }
        case 'quiet': {
          const mo = Math.min(...ks.map(q => F[q][2]));
          if (P.trap && fu[2] > mo) out.push('この問題は例外なんだ。開放度がいちばん小さい手は、ここだと相手にいい手を打たれちゃう。よく気づいたね。');
          else out.push(fu[2] === 0 ? 'まわりに空きのない石だけを返す、中割りだね。相手に新しい打ち場所をあげないんだ。' : `返す石のまわりの空きは${fu[2]}マス。静かな手だから、相手に足場をあげないんだ。`);
          break;
        }
        case 'wall':
          if (P.trap) out.push('あわてて余裕手を使わなかったね。自分だけが打てる場所は、貯金としてとっておけるんだ。');
          else out.push(pk([`外がわに石を並べずにすんだね。打ったあと相手が打てる場所は${fu[3]}か所なんだ。`, `壁を作らない、内がわの手だね。相手が打てる場所は${fu[3]}か所に抑えられるよ。`]));
          break;
        case 'edge':
          if ((P.wedge || []).includes(u)) out.push(pk(['相手の石2つのあいだに打つ付け手だね。相手の辺の形がくずれて、隅をねらいやすくなるんだ。', '辺のすき間に打つ付け手、おみごと。相手はもう、きれいな辺を作れないね。']));
          else out.push(`辺の形をよく見られたね。打ったあと相手が打てる場所は${fu[3]}か所に抑えられるんだ。`);
          break;
        case 'exception':
          if (RV_X[u] != null) out.push('X打ちが正解の場面だったね。隅への通り道ができても、相手はそこを取れないか、取っても得をしないんだ。');
          else if (ks.some(q => RV_CN.includes(q)) && !RV_CN.includes(u)) out.push(pk(['あえて隅を後回しにできたね。この場面は、隅より手番のほうが大事なんだ。', '隅にとびつかなかったね。ここで隅を取ると、相手にいい所を続けて打たれちゃうんだ。', '格言にまどわされなかったね。今は隅より、手番を守るほうが得な場面なんだ。']));
          else out.push('格言より「打ったあとに何が起きるか」で選べたね。それが強くなる近道なんだ。');
          break;
        case 'parity':
          out.push(`この空きの塊は${fu[5]}マスで${fu[5] % 2 ? '奇数' : '偶数'}。` + (fu[6] ? '相手をパスさせて、もう1手続けて打てるんだ。' : fu[5] % 2 ? '先に入ったから、最後の1手をねらえるね。' : 'ここは例外で、偶数の塊に入るほうが得なんだ。'));
          out.push(`完全読みだと、${res(v(u))}になるよ。`);
          break;
        case 'finish':
          out.push(fu[6] ? `相手をパスさせる手だね。続けて打てるから、最後は${res(v(u))}になるんだ。` : pk([`ほかの手はみんな負けの場面で、ただ一つの手を見つけたね。完全読みだと、最後は${res(v(u))}。`, `正確に読めたね。この手なら最後は${res(v(u))}、ほかの手だと負けちゃうんだ。`]));
          if (P.trap && ks.some(q => RV_CN.includes(q)) && !RV_CN.includes(u)) out.push('隅にとびつかなかったのが、えらいね。');
          break;
      }
      return out.join('');
    }
    if (!(kind === 'exception' && RV_X[b] != null)) out.push(pk(['いちばんいい手は、緑の枠なんだ。', '正解は緑の枠のマスだよ。', '緑の枠が、この場面のいちばんいい手。']));
    const lead = kind !== 'parity' && kind !== 'finish' && kind !== 'rules' ? (fu[4] ? pk(['赤い枠だと、次に相手が隅を取れるようになっちゃうんだ。', '赤い枠に打つと相手に隅への道が開くから、そこは損なんだ。']) : xc(u) ? `赤い枠は空いた隅のとなりの${xc(u)}だから、相手に隅への通り道を作りやすいんだ。` : '') : '';
    switch (kind) {
      case 'rules': out.push(`赤い枠は${fu[1]}枚、緑の枠なら${fb[1]}枚返せたんだ。` + pk(['ななめの列を見落としたのかも。', '打つ前に、8方向をひとつずつ数えてみてね。'])); break;
      case 'corner':
        if (lead) out.push(lead); else if (RV_CN.includes(b)) out.push('取れる隅があったんだ。隅の石は二度と返されないから、取れるときに取っておきたいね。'); else out.push(loss());
        if (lead && RV_CN.includes(b)) out.push('緑の枠の隅を取れば、二度と返されない石が手に入ったよ。');
        break;
      case 'mobility':
        if (lead) out.push(lead + (fu[3] > fb[3] ? mob() : ''));
        else if (fu[3] > fb[3]) out.push(mob() + (fu[1] > fb[1] ? `${fu[1]}枚も返すと外がわの石が増えて、相手の足場になっちゃうんだ。` : '相手に打てる場所をあげるほど、こちらは苦しくなるからね。'));
        else out.push(loss());
        break;
      case 'quiet': {
        const mo = Math.min(...ks.map(q => F[q][2]));
        if (lead) out.push(lead);
        else if (P.trap && fu[2] <= mo) out.push('赤い枠は開放度がいちばん小さいけど、ここは例外なんだ。そのあと相手にいい手を打たれちゃうから、相手の応手まで考えようね。');
        else if (fu[2] > fb[2]) out.push(`返す石のまわりの空きは、赤い枠が${fu[2]}マス、緑の枠は${fb[2]}マス。空きが多いと、そこが相手の打ち場所になっちゃうからね。`);
        else out.push(loss());
        break;
      }
      case 'wall': {
        const opL = rvLegal(c, 3 - P.toMove);
        if ((P.wall || []).includes(u)) out.push('赤い枠は外がわに石を並べて、壁を作っちゃう手。壁ができると、その外は相手だけが打てる場所になるからね。');
        else if (P.trap && !opL.includes(u)) out.push('赤い枠は、きみだけが打てる余裕手。今使うと損だから、貯金としてとっておこうね。');
        else if (lead) out.push(lead);
        else if (fu[3] > fb[3]) out.push(mob() + '外がわの石がふえると、相手の打てる場所もふえちゃうんだ。');
        else out.push(loss());
        break;
      }
      case 'edge':
        if ((P.wedge || []).includes(b)) out.push('緑の枠は、相手の石2つのあいだのすき間に打つ付け手。相手の辺の形をくずせるから、隅や辺をうばうきっかけになるんだ。');
        if (lead) out.push(lead); else if (!(P.wedge || []).includes(b)) out.push(loss());
        break;
      case 'exception':
        if (RV_CN.includes(u)) out.push(`隅は取れるけど、そのあと相手に${fu[3]}か所も打つ場所が残って、主導権をにぎられちゃうんだ。`);
        else if (RV_X[b] != null) out.push('ここは緑の枠のX打ちがいちばん。相手はその隅をすぐには取れないから、Xでも損をしないんだ。');
        else out.push(lead || loss());
        break;
      case 'parity': {
        const par = n => n % 2 ? '奇数' : '偶数';
        out.push((fu[5] % 2 !== fb[5] % 2 ? `赤い枠の塊は${fu[5]}マスで${par(fu[5])}、緑の枠の塊は${fb[5]}マスで${par(fb[5])}。` : `どちらも${par(fb[5])}の塊。入る場所で、最後の1手を取れるかが変わるんだ。`) + (fb[6] ? '緑の枠なら、相手をパスさせられるよ。' : ''));
        out.push(loss());
        break;
      }
      case 'finish':
        out.push(loss());
        if (fb[6]) out.push('緑の枠は、相手をパスさせる手なんだ。');
        else if (RV_CN.includes(u)) out.push('終盤は、隅より最後の1手が勝負を決めるからね。');
        break;
      default: out.push(lead || loss());
    }
    return out.join('');
  }
  /* (2026-11-21 lesson loop) the reversi opening practice in リバガメ's words, Japanese: the texts without coordinates (atlas/nocoord
     reversi.json op:<moves>/aim|info, Japanese only — other languages keep the openings.json text), a varied question, a hint from what
     the line's move does (flips, openness = empty squares next to the flipped discs, the opponent's moves after — never the square),
     and after the answer why the line's move (green frame) is played and what yours (red frame) gives up, from the AI values
     (reversi/opcourse-evals.json, the mover's view) and those facts. */
  const rvNC = (mv, f, lang) => { const o = (NC.reversi || {})['op:' + mv + '/' + f]; return o && o[lang] ? o : null; };
  const RVJ_OP = {
    intro: ['まずは手順を盤で見てみよう。そのあと、続きを打ってもらうね！', '手順をひととおり見たら、次はきみの番。覚えられるかな？', 'ゆっくり手順を並べるから、形をよく見ておいてね。'],
    ask: ['『{n}』の続き、{s}の次の一手はどこかな？', '{s}の番だね。『{n}』の手順を思い出して打ってみて！', 'ここで{s}が打つ、『{n}』の一手はどこだと思う？', 'さあ{s}の一手！ 定石どおりに打てるかな？', '『{n}』はこの先どう進むんだっけ？ {s}の手を打ってみよう。'],
    good: ['そう、それが定石の手！', 'ばっちり、手順どおりだね。', 'いいね、よく覚えてた！', 'おみごと！ 定石の一手なんだ。'],
    lead: ['定石の手は緑の枠なんだ。', '緑の枠が、この定石の手。', '正しい手順は緑の枠のマスだね。'],
  };
  function rvOpFacts(posStr) {   // every legal move: flips, openness, the opponent's moves after
    const [cs, tm] = String(posStr).split(':'), c = cs.split('').map(Number), me = +tm, op = 3 - me, F = {};
    const nbr = q => { const r = q >> 3, k = q & 7, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = k + dc; if ((dr || dc) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
    for (const m of rvLegal(c, me)) { const f = rvFlips(c, m, me), nc = c.slice(); nc[m] = me; f.forEach(q => { nc[q] = me; });
      const seen = new Set(); f.forEach(q => nbr(q).forEach(y => { if (!nc[y]) seen.add(y); })); F[m] = { n: f.length, open: seen.size, oM: rvLegal(nc, op).length }; }
    return { F, me };
  }
  function rvOpJa(o, name, aim, hs, i) {
    const nm = /(^|[^A-Za-z])[a-h][1-8](?![0-9A-Za-z])/.test(name) ? 'この定石' : name, nmQ = nm === name ? '『' + name + '』' : nm;
    const { F, me } = rvOpFacts(o.pos), A = +o.ans, ks = Object.keys(F).map(Number), fa = F[A] || { n: 0, open: 0, oM: 0 };
    const minOf = k => Math.min(...ks.map(q => F[q][k])), maxOf = k => Math.max(...ks.map(q => F[q][k])), side = me === 1 ? '黒' : '白';
    const ev = o.P.ev, sc = ev ? new Map(ev.map(([m, v]) => [rvSq(m), v])) : null, evBest = ev ? Math.max(...ev.map(x => x[1])) : null;
    const ask = fill(RVJ_OP.ask[(hs + i) % RVJ_OP.ask.length], { n: name, s: side }).replace('『' + name + '』', nmQ);
    const spread = k => ks.length > 1 && minOf(k) < maxOf(k);   // (a fact that tells the moves apart — on the first moves every move flips one disc)
    let hint;
    if (spread('n') && spread('open') && fa.n === minOf('n') && fa.open === minOf('open')) hint = 'たくさん返す手より、返す石が少なくて、まわりの空きも少ない手。静かな中割りっぽい手をさがしてみて。';
    else if (spread('open') && fa.open === minOf('open')) hint = '返す石のまわりの空き（開放度）を、手ごとに数えてみて。空きが少ない手がねらい目かも。';
    else if (spread('oM') && fa.oM === minOf('oM')) hint = '打ったあと、相手が打てる場所がいちばん少なくなる手はどこかな？';
    else if (spread('n') && fa.n === maxOf('n')) hint = 'ここは思いきって、多めに返す手が定石なんだ。どこから返せるかな？';
    else hint = ['さっき盤で見た手順を思い出してみて。相手の直前の手に、どう応じていたかな？', '石がどんな形に並んでいたか、思い出してみて。名前のもとになった形がヒントだね！', 'あわてずに、手順の流れを頭の中でもう一度並べてみよう。'][(hs + i) % 3];
    const why = () => {
      const isBest = sc && sc.has(A) && sc.get(A) >= evBest - 0.05, s = [];
      if (fa.open === 0) s.push('返す石のまわりに空きがない、中割りの手なんだ。相手に新しい足場をあげないね。');
      else if (spread('open') && fa.open === minOf('open')) s.push(`返す石のまわりの空きは${fa.open}マスだけ。相手に打ち場所をあげにくい、静かな手なんだ。`);
      else if (spread('oM') && fa.oM === minOf('oM')) s.push(`打ったあと、相手が打てる場所は${fa.oM}か所。いちばん少なく抑えられるからね。`);
      else s.push(`打ったあと、相手が打てる場所は${fa.oM}か所になるんだ。`);
      const lo = sc && sc.has(A) ? Math.round(evBest - sc.get(A)) : null;
      s.push(isBest ? 'AIの評価でも、この場面でいちばんいい手とされているよ。' : lo != null && lo <= 2 ? 'AIの評価は最善より少しだけ低めだけど、この定石の名前どおりの手なんだ。' : lo != null ? `AIの評価では最善より${lo}石ほど低い手。名前の付いた手順として覚えておこうね。` : 'この定石ならではの一手として覚えておこうね。');
      return s.join('');
    };
    const pickWrong = u => {   // (no wrong move given — the checker passes the answer: the most telling one, the AI's lowest, else the most flips)
      if (u !== A && F[u]) return u; const w = ks.filter(q => q !== A); if (!w.length) return null;
      const inEv = sc ? w.filter(q => sc.has(q)) : []; if (inEv.length) return inEv.reduce((a, q) => sc.get(q) < sc.get(a) ? q : a, inEv[0]);
      return w.reduce((a, q) => F[q].n > F[a].n ? q : a, w[0]);
    };
    const ng = u0 => {
      const u = pickWrong(+u0), out = [RVJ_OP.lead[(hs + i) % RVJ_OP.lead.length]]; if (u == null) return out[0];
      const fu = F[u];
      if (sc && sc.has(u) && sc.has(A)) { const d = Math.round((sc.get(A) - sc.get(u)) * 10) / 10;
        out.push(d <= 0.5 ? '赤い枠もAIの評価では負けていない手なんだ。でもこの練習は、名前の付いた手順を覚えるのがねらいだね。' : d < 3 ? `赤い枠は、AIの評価で${Math.round(d) || 1}石ほど損。差は小さいけど、手順から外れちゃうね。` : `赤い枠だと、AIの評価で${Math.round(d)}石ほど損しちゃうんだ。`); }
      else if (sc && !sc.has(u)) out.push('赤い枠は、AIが候補にも挙げない手。打つと大きく損をしやすいんだ。');
      if (fu.open > fa.open) out.push(`返す石のまわりの空きも、赤い枠は${fu.open}マス、緑の枠は${fa.open}マス。空きが多いと、相手の足場になっちゃうからね。`);
      else if (fu.oM > fa.oM) out.push(`打ったあと相手が打てる場所は、赤い枠だと${fu.oM}か所、緑の枠なら${fa.oM}か所。相手の選択肢をふやしちゃうんだ。`);
      else if (fu.n > fa.n) out.push(`赤い枠は${fu.n}枚も返すから、外がわの石がふえて、あとで苦しくなりやすいね。`);
      else if (out.length < 2) out.push('手順から外れると、定石で覚えた形が使えなくなっちゃうからね。');
      return out.join('');
    };
    return { ask, hintTx: hint, hintMk: () => [], good: () => RVJ_OP.good[(hs + i) % RVJ_OP.good.length] + '<br>' + why(), ng };
  }
  const REVERSI = {
    LKEY: 'reversi-emerald-lessons', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../reversi/lessons.json?v=20261107l14'), getJ('../reversi/openings.json?v=20261107l14'), getJ('../reversi/opcourse-evals.json?v=1').catch(() => ({})), getJ('../reversi/warm3d.json?v=2').catch(() => ({}))])
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
    lesson(key, lang) {
      const l = this.data.ls.lessons[+key]; if (!l) return null;
      const T = this.T(l, lang), std = shuffle(l.problems.filter(p => !p.trap)), trap = shuffle(l.problems.filter(p => p.trap)), nT = trap.length ? 1 : 0;
      const probs = [...std.slice(0, 5 - nT), ...trap.slice(0, nT)];
      const WT = this.WT || {}, W = k => WT[l.id + '/' + k] || null, pos = (c, m) => (Array.isArray(c) ? c.join('') : c) + ':' + m;
      let ramp = (l.warm || []).map(w => w.t === 'concept'
        ? { k: 'explain', pos: pos(w.cells, w.toMove), cells: w.cells, toMove: w.toMove, aid: w.aid, marks: w.marks, arrows: w.arrows, t: W('t' + w.k.slice(1)), b: W(w.k) }
        : { k: 'try', pos: pos(w.cells, w.toMove), cells: w.cells, toMove: w.toMove, aid: w.aid, guided: w.t === 'guided', ans: w.ans, g: w.t === 'guided' ? W(w.k) : WT['ui/pp'], y: W(w.k + 'ok'), h: W('h0') });
      if (l.id === 'rules' && WT['rules/c1']) {   // (no warm-up in the full game: placing and flipping, then the biggest flip)
        const st = rvAfter('').split(':')[0], me = 1, lg = rvLegal(st, me), P0 = (l.problems || [])[0];
        ramp = [{ k: 'explain', pos: st + ':1', cells: st, toMove: 1, marks: Object.fromEntries(lg.map(q => [q, 'flip'])), t: W('t1'), b: W('c1') },
          { k: 'try', pos: st + ':1', cells: st, toMove: 1, marks: Object.fromEntries(lg.map(q => [q, 'flip'])), oks: lg, ans: lg[0], g: W('g1'), y: W('y1'), h: W('h1') }];
        if (P0) { const v = Object.entries(P0.f), top = Math.max(...v.map(x => x[1][0])); ramp.push({ k: 'try', pos: pos(P0.cells, P0.toMove), cells: P0.cells, toMove: P0.toMove, aid: 'flips', guided: true, oks: v.filter(x => x[1][0] === top).map(x => +x[0]), ans: +v.find(x => x[1][0] === top)[0], g: W('g2'), y: W('y2'), h: W('h2'), look: W('look') }); }
      }
      if (!ramp.every(it => (it.k === 'explain' ? it.b : it.g))) ramp = [];   // (texts missing: no warm-up rather than an empty one)
      const look = W('look'), RU = (k, v) => fill(k === 'look' && look ? L(look, lang) : L(WT['ui/' + k], lang) || '', v || {});
      return { id: l.id, title: T.title || l.id, intro: (Array.isArray(T.intro) ? T.intro.join('<br>') : T.intro || ''), ramp: ramp.length ? ramp : null, RU,
        probs: probs.map((p, i) => { const v = Object.entries(p.f), b = v.reduce((a, x) => x[1][0] > a[1][0] ? x : a, v[0]), ja = lang === 'ja', AQ = RVJ_ASK[l.id];
          const top = b ? b[1][0] : 0, oks = v.filter(x => x[1][0] >= top - 1e-9).map(x => +x[0]);
          // (2026-11-21) the hint: the step's words, and on the board what they point at — never the answer itself (the red frames: moves
          // that hand over a corner; wall: the moves that build a wall)
          const hintMk = () => l.id === 'wall' && p.wall && p.wall.length ? p.wall.map(q => [q, 'ng']) : l.id === 'rules' || l.id === 'parity' || l.id === 'finish' ? [] : v.filter(x => x[1][4]).map(x => [+x[0], 'ng']);
          return { pos: p.cells + ':' + p.toMove, kind: 'best', P: p, ask: ja && AQ ? (i >= 2 ? AQ[i % AQ.length].replace('数字を見くらべてみてね。', '自分で数えてみてね。') : AQ[i % AQ.length]) : T.prompt || '',   /* (from the 3rd problem no flip counts on the board: lessons3d RV_NUMS) */ why: '', ans: b ? b[0] : '', oks, hintMk,
            hintTx: (T.hint || '') + (ja && hintMk().length ? (l.id === 'wall' ? '<br>赤い枠は、外がわに壁を作っちゃう手なんだ。' : '<br>赤い枠は、打つと相手に隅を渡しちゃう手。') : ''),
            good: u => ja ? rvTeachJa(l.id, p, u == null ? b && b[0] : u, true) : '', ng: u => ja ? rvTeachJa(l.id, p, u, false) : '' }; }),
        save: (pts, max) => this.save(l.id, pts, max) };
    },
    opening(key, lang) {
      const st = this.data.steps.find(x => x.ln.moves === key); if (!st) return null;
      const ln = st.ln, mv = ln.moves.match(/../g), n = mv.length, ev = this.data.ev || {};
      const parent = this.data.steps.filter(x => x.ln.moves.length < key.length && key.startsWith(x.ln.moves)).reduce((a, x) => !a || x.ln.moves.length > a.length ? x.ln.moves : a, '');
      const d = parent ? parent.length / 2 : 1, c = []; for (let k = Math.max(1, d - 4); k < n; k++) c.push(k);
      const ks = c.length <= 5 ? c : [...new Set([0, 1, 2, 3, 4].map(j => c[Math.round(j * (c.length - 1) / 4)]))];
      const info = L(rvNC(ln.moves, 'info', lang) || ln.info, lang).replace(/【[^】]+】|\[[\p{L}\p{M}]{1,16}\]/gu, ' ').trim();
      const ja = lang === 'ja', name = L(ln.name, lang), aim = L(rvNC(ln.moves, 'aim', lang) || ln.aim, lang);
      let hs = 0; for (const ch of key) hs = (hs * 31 + ch.charCodeAt(0)) | 0; hs = Math.abs(hs);
      return { id: 'opl:' + key, title: name, intro: `<b>${aim}</b>` + (ja ? '<br>' + RVJ_OP.intro[hs % RVJ_OP.intro.length] : ''),   // (no move list in coordinates: the line is played on the board next) start: rvAfter(''),
        steps: mv.map(rvSq), notes: info ? { [String(n - 1)]: info } : {},
        probs: ks.map((k, i) => { const pre = mv.slice(0, k).join(''), o = { pos: rvAfter(pre), kind: 'best', ask: fill(RV_ASK[lang] || RV_ASK.en, { n: name }), P: { rv: 'op', ans: rvSq(mv[k]), ev: ev[pre] || null }, ans: String(rvSq(mv[k])) };
          if (ja) Object.assign(o, rvOpJa(o, name, aim, hs + i, i));   // (2026-11-21 lesson loop: リバガメ asks, hints and explains — see RVJ_OP)
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
  const ncLoad = id => NC[id] ? Promise.resolve(NC[id]) : fetch('nocoord/' + id + '.json?v=19').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(o => (NC[id] = o));
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
  const GOMJ = {
    ask: ['{s}の番。いちばん良い次の一手はどこかな？', 'さあ、{s}ならどこに打つ？ 相手の狙いも見てみて！', 'ここで{s}が打つ、強い一手を探してみよう！', 'この形、{s}の急所はどこだと思う？', '{s}の一手だペン。攻めるか守るか、どっちかな？'],
    hint: { win: ['自分の四をよく見て！ 五つ並べられる点がありそうだペン。'], b4: ['相手の石をよく見て！ あと1つで五つ並ぶところがあるペン。', '大変、相手に四ができてるね。まずどこを止める？'],
      ft: ['四と三を、いっぺんに作れる点がありそうだね。', '攻めどき！ 四を作りながら三もできる点を探してみて。'], four: ['四を作って、相手に止めさせる手はないかな？', '先手で攻めたいね。四が作れる点を探してみるペン。'],
      b3t: ['相手の三が気になるね。止めながら自分も得する点はどこかな？'], b3: ['相手の三が見える？ 放っておくと達四になっちゃうね。', '守りの場面かも。相手の三をどこで止める？'],
      three: ['自分の石で、両はしのあいた三を作れないかな？', '攻めを続けたいね。三ができる点を探してみて！'],
      shape: ['まだ急ぐ場面じゃないペン。自分の石がたくさん生きる点を探してみて。', '相手の石の並びも見てみて。じゃましながら自分の形も作れたら最高ペン！'] },
    good: ['そう、それ！', 'ばっちりだペン！', 'いい読みだね！', 'お見事！', 'すてきな一手だね！'],
    why: { win: '五つ並んで勝ちだね！ ぼく、踊っちゃう。', b4: 'ここを空けると、次に五つ並べられて負けちゃう。だから四を止めるのが先なんだ。', ft: '四と三が同時にできたから、相手は両方は止められないペン。',
      four: '四を作ると、相手は止めるしかない。そのあいだに攻めの形を広げられるね。', b3t: '相手の三を止めながら、自分の三も作れたね。守りと攻めがいっぺんにできたペン。', b3: '放っておくと達四になって、もう止められなかったはず。三は早めにふさぐのが大事だね。',
      three: '三を作ると、相手は止めに回るしかない。攻めの主導権を握れるペン。' },
    lead: ['{ok}と比べてみよう。', 'きみの手と{ok}、何がちがうかな？', '{ok}とのちがいを見てみるペン。'],
    miss: { win: 'そこに打てば五つ並んで勝ちだったのに、きみの手だと勝ちを逃しちゃう。', b4: 'きみの手だと相手の四が残ったまま。次に五つ並べられて負けちゃうんだ。', ft: '四三なら勝ちが決まったのに、きみの手だと相手に立て直す時間をあげちゃうね。',
      four: 'きみの手だと攻めが止まって、相手に先手を渡しちゃう。四で押したほうが強いペン。', b3: 'きみの手だと相手の三が残るから、次に達四を作られて止められないね。', b3t: 'きみの手だと相手の三が残るから、次に達四を作られて止められないね。',
      three: 'きみの手だと攻めが続かず、相手に反撃の時間をあげちゃうペン。' },
    // the best move's why when it makes no threat: from its shape
    shapeWhy(r) { return r.two >= 2 ? '二を2本いっぺんに作る手。次にどちらからでも三が作れるペン。' : r.two && r.oppNear ? '相手の石の並びをじゃましながら、自分の二も作れる点なんだ。' : r.two ? '自分の石と並んで二ができる点。次の三の足場になるペン。' : r.oppNear ? '相手の石の並びをじゃまして、相手の攻めの足場を減らせる点なんだ。' : '石のまだ少ない側に打って、先の攻めに備える手。'; },
    side: s => s === 1 ? '黒' : '白',
    // the line's notes
    n: { three: ['三！ 放っておくと達四になっちゃう。', '三を作ったね。相手は止めに回るしかないペン。', '三だ！ 次は達四を狙ってるね。'],
      block3: ['相手の三を止めたね。', 'ここで三をふさぐペン。', '三のはしをおさえて、達四を防いだんだ。', 'あわてず三を止める。大事な一手！', '相手の三にふたをしたね。', '三をふさいで、ひと安心ペン。'],
      four: ['四！ 相手は止めるしかないね。', '四を作って先手を取ったペン。', '四だ！ これは必ず止めないといけない。'],
      block4: ['四を止めた！ ここを空けたら負けだもんね。', 'すかさず四をふさぐペン。'],
      win: ['ここから{c}の勝ちを読み切ったペン！', 'これで{c}の勝ちが決まり！ 読み切りだね。'],
      two2: ['二を2本作る欲ばりな手。次はどちらでも三が作れるね。'], two: ['自分の石と並べて、二を作ったね。', '二ができた！ 三への足場ペン。', '自分の石と組んで、攻めの準備！'] },
    ev: { bw: '研究で、黒の必勝が知られている珠型なんだ（旧RIF規定での評価）。黒を持ったら、攻めの形を覚えちゃおう！', ba: '黒が有利とされる珠型だね（旧RIF規定での評価）。',
      bs: '黒がやや有利とされる珠型だね（旧RIF規定での評価）。', eq: '互角に近いとされる珠型なんだ（旧RIF規定での評価）。', ws: '白がやや有利とされる珠型なんだ（旧RIF規定での評価）。', ww: '白の必勝とされて、黒には不利な珠型なんだ（旧RIF規定での評価）。' },
  };
  const GOMOKU = {
    LKEY: 'aicoding-gomoku-lessons', OKEY: 'aicoding-gomoku-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../gomoku/lessons.json?v=20261115'), getJ('../gomoku/openings.json?v=20261113'), fetch('../gomoku/i18n.js?v=20261115').then(r => r.text()), fetch('../gomoku/voice-pen-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')])
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
        probs: (s.problems || []).map(P => { const ok = gCells(P.ok || []), pick = P.kind === 'pick';
          return { pos: gPos(P, { pick, noForbid: !!(s.hideForbid || pick) }), kind: 'best', P: { ok }, ask: T('goal'), ans: ok[0], why: '', ng: () => T('ng', { m: SP('ok', lang), x: SP('ng', lang) }), good: () => T('why', { m: SP('here', lang), n: ok.length }), hintTx: T('hint'), hint: P.hint ? gCells(P.hint) : null }; }),
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
      if (ja) {   // (2026-11-21 lesson loop: ゴイシペン tells the line — see GOMJ)
        const bd = { b: [], w: [] }, cnt = {};
        const pk = k => { const a = GOMJ.n[k]; cnt[k] = (cnt[k] || 0) + 1; return a[(hs + cnt[k]) % a.length]; };
        g.study.forEach((x, i) => { const q = GSQ(x[0]), s = i % 2 ? 2 : 1, n = x[2]; let t = `<b>${i + 1}. ${GOMJ.side(s)}</b>`, say = '';
          if (i === 0) say = 'まずは黒が、盤のまん中（天元）に打つね。';
          else if (i === 1) say = g.kind === 'direct' ? '白は黒のすぐとなりに打つ。これを直接打ちっていうんだ。' : '白は黒のななめとなりに打つ。これを間接打ちっていうペン。';
          else if (i === 2) say = `3手目で、珠型『${g.kanji}』の形ができたね！<br>` + GOMJ.ev[g.ev];
          else if (n) say = fill(pk(String(n).replace('op.n.', '')), { c: GOMJ.side(x[1] > 0 ? 1 : 2) });
          else { const r = GMA.info(GMA.analyse({ b: bd.b, w: bd.w, side: s }).bd, q, s); if (r.two >= 2) say = pk('two2'); else if (r.two && i % 3 === 0) say = pk('two'); }
          if (say) t += '<br>' + say; notes[String(i)] = t; (s === 1 ? bd.b : bd.w).push(q); });
      }
      const probs = shuffle(g.problems || []).slice(0, 5);
      return { id: g.id, title: this.name(g, lang), intro: this.tx('op.read', lang, { k: g.kanji, r: g.kana, n: g.name }) + '<br>' + this.tx('op.d.' + g.id, lang) + (ja ? '<br>ぼくといっしょに、この珠型の流れを1手ずつ見ていこう！' : ''), start: { start: null, rule: 'renju', me: 1, last: -1 },
        steps, notes, probs: probs.map((P, i) => { const sc = (P.sc || []).map(([u, v]) => [GSQ(u), v]), b = sc.slice().sort((a, c) => c[1] - a[1])[0];
          const o = { pos: gPos(P, { rule: 'renju' }), kind: 'best', P: { sc }, ask: this.tx('op.goal', lang), ans: b ? b[0] : -1 };
          if (ja && b) Object.assign(o, this.opJa(o, sc, b, hs + i, i));
          return o; }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= 75; pr[g.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
    },
    opJa(o, sc, b, hs, i) {   // (2026-11-21 lesson loop) the question, hint, praise and correction of an opening problem — see GOMJ / GMA
      const A = GMA.analyse(o.pos.start), best = b[0], rb = A.of(best), kb = GMA.kind(rb), val = new Map(sc), side = GOMJ.side(A.s);
      const hk = GOMJ.hint[kb], whyB = GOMJ.why[kb] || GOMJ.shapeWhy(rb);
      const pickWrong = u => u !== best && u != null && u >= 0 ? u : (sc.slice().sort((a, c) => a[1] - c[1])[0] || [])[0];
      return { ask: fill(GOMJ.ask[hs % GOMJ.ask.length], { s: side }), hintTx: hk[hs % hk.length], hint: A.ring(best, rb),
        good: u => { const same = u != null && u !== best; return GOMJ.good[hs % GOMJ.good.length] + (same ? ' きみの手も、いちばんの手とほとんど同じくらい良い手なんだ。' : '') + '<br>' + (same ? '' : whyB); },
        ng: u0 => { const u = pickWrong(u0), lead = fill(GOMJ.lead[hs % GOMJ.lead.length], { ok: SP('ok', 'ja') });
          if (u == null) return lead + '<br>' + whyB;
          const ru = A.of(u), ku = GMA.kind(ru), mine = val.has(u) ? val.get(u) : null, d = mine == null ? null : b[1] - mine;
          let why;
          if (kb === 'win' || kb === 'b4' || kb === 'ft') why = GOMJ.miss[kb];
          else if ((kb === 'b3' || kb === 'b3t') && !ru.b3) why = ru.four ? '四で攻めても、止められたあとに相手の三が残っちゃうね。達四を作られたら止められないんだ。' : GOMJ.miss[kb];
          else if ((kb === 'four' || kb === 'three') && !ru.four && !ru.three) why = GOMJ.miss[kb];
          else if (mine != null && mine < -9000) why = 'きみの手だと、相手に勝ちを読み切られる形になっちゃうんだ。';
          else if (mine == null) why = 'きみの手は、AIが候補にも入れなかった手。ほかの石とのつながりが弱いからね。';
          else if (d < 80) why = 'きみの手も悪くないけど、AIの評価は少しだけ下がるね。' + (kb === 'shape' ? '緑の点は' + whyB : '');
          else why = 'きみの手だと石の働きが弱くて、AIの評価がだいぶ下がっちゃう。' + (kb === 'shape' ? '緑の点は' + whyB : '');
          return lead + '<br>' + why; } };
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
  const GO = {
    LKEY: 'aicoding-go-lessons', OKEY: 'aicoding-go-open', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../go/lessons.json?v=20261115'), getJ('../go/openings.json?v=4'), goRules(), fetch('../go/voice-pen-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')]).then(([ls, op, , vp]) => { this.data = { ls, op };
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
            good(u) { this._hl = []; return goSpots(L(P.why, lang), N, ok, u, true, lang, this._hl); }, ng(u) { this._hl = []; return goSpots(L(P.ng, lang) || L(P.why, lang), N, ok, u, false, lang, this._hl); }, hintTx: SV('hint'), hint: ok.length ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => { const x = ok[0] % N + dx, y = Math.floor(ok[0] / N) + dy; return x >= 0 && y >= 0 && x < N && y < N && sp.stones[y * N + x] === '.' ? y * N + x : -1; }).filter(q => q >= 0) : null }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const N = g.n || 19, st = this.opStart(g), line = this.opLine(g), notes = {};
      line.forEach((m, i) => { const side = i % 2 ? 3 - (st.turn || 1) : st.turn || 1, ev = g.evals && g.evals[i] != null ? ` <small>(${(g.evals[i] >= 0 ? '+' : '') + g.evals[i]})</small>` : '';
        notes[String(i)] = `<b>${i + 1}. ${side === 1 ? '●' : '○'}</b>${ev}` + ((g.notes || {})[String(i + 1)] ? '<br>' + L((NC.go || {})['op:' + g.id + '/n' + (i + 1)] || g.notes[String(i + 1)], lang) : ''); });   // (3D: the notes without coordinates)
      const self = this, probs = shuffle(g.problems || []).slice(0, 5).sort((a, b) => a.at - b.at).map(P => { const ok = goPcs(P.ok, N);
        const o = { kind: 'best', P: { ok, good: goPcs(P.good, N), half: goPcs(P.half, N) }, ask: L(self.data.op.goal || null, lang) || '', ans: ok[0], N };
        if (lang === 'ja') {   // (2026-11-21 lesson loop: ゴイシペン asks, hints and explains — see GOJ)
          const sd = P.at % 2 ? 3 - (st.turn || 1) : st.turn || 1, note = L((NC.go || {})['op:' + g.id + '/n' + (P.at + 1)] || (g.notes || {})[String(P.at + 1)], 'ja'), hs = (g.id.length * 7 + P.at) | 0;
          const why = GOJ.why(note, 80), whyS = GOJ.why(note.replace(/^[^。]*?(打ちます|ます|です)。/, ''), 60) || why, hk = GOJ.hint.find(([re]) => re.test(note));
          o.ask = fill(GOJ.ask[(hs + P.at) % GOJ.ask.length], { s: GOJ.side(sd) });
          o.hintTx = hk ? hk[1] : GOJ.hintDef[hs % 2];
          o.good = () => GOJ.good[hs % 3] + (why ? '<br>' + why : '');
          o.ng = u => { const part = (o.P.good || []).concat(o.P.half || []).includes(u);
            return SP('ok', 'ja') + 'を打つわけはね、' + (whyS || why) + '<br>' + (part ? GOJ.ngHalf[hs % 2] : GOJ.ngBad[hs % 3]); };
        }
        Object.defineProperty(o, 'pos', { get() { const sp = self.after(st, line.slice(0, P.at)); return { spec: sp, me: sp.turn || 1, view: g.view || null }; } });   // (the position after `at` moves: the rules are loaded by then)
        return o; });
      return { id: g.id, title: L(g.title, lang), intro: L((NC.go || {})['op:' + g.id + '/story'] || g.story, lang) || L(g.short, lang), start: { spec: st, me: g.side || st.turn || 1, view: g.view || null }, steps: line, notes, probs,
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
  const CHECKERS = {
    LKEY: 'aicoding-checkers-lessons', OKEY: 'aicoding-checkers-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../checkers/lessons.json?v=20261115'), getJ('../checkers/openings.json?v=3'), getJ('../checkers/lux.json?v=1').catch(() => ({})), fetch('../checkers/i18n.js?v=20261107l14-nd1').then(r => r.text()), ckEng(), fetch('../checkers/voice-crab-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')])
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
      return { id: s.id, title: T('title'), intro, ramp, RU,
        probs: (s.problems || []).map(P => { const good = P.ok || [P.best];
          return { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }), ng: () => P.ok ? T('ng', { m: CKM('ok', lang), x: CKM('ng', lang) }) : T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }) }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const notes = {}; (g.study.notes || []).forEach((n, i) => { if (n) notes[String(i)] = L(n, lang); });
      const lx = ((this.data.lux || {}).openings || {})[g.id] || {}, hist = L((NC.checkers || {})['op:' + g.id + '/hist'] || lx.hist, lang);
      const probs = shuffle(g.problems || []).slice(0, 5);
      return { id: g.id, title: L(g.title, lang), intro: hist, start: { spec: null, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes,
        probs: probs.map(P => ({ pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: window.CheckersEngine ? [CheckersEngine.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: CKM('ok', lang) }) })),
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
  const XIANGQI = {
    LKEY: 'aicoding-xiangqi-lessons', OKEY: 'aicoding-xiangqi-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../xiangqi/lessons.json?v=20261115'), getJ('../xiangqi/openings.json?v=2'), getJ('../xiangqi/lux.json?v=1').catch(() => ({})), fetch('../xiangqi/i18n.js?v=4lv-l14-pro-nd1').then(r => r.text()), xqEng(), fetch('../xiangqi/voice-fox-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')])
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
      return { id: s.id, title: T('title'), intro: T('intro'), ramp, RU,
        probs: (s.problems || []).map(P => { const good = P.ok || [P.best];
          return { pos: { spec: P.s, me: xqMe(P.s) }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: CKM('ok', lang), x: CKM('ng', lang) }), ng: () => T('ng', { m: CKM('ok', lang), x: CKM('ng', lang) }) }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const notes = {}; (g.study.notes || []).forEach((n, i) => { if (n) notes[String(i)] = L(n, lang); });
      const it = g.intro && (g.intro[lang] || g.intro.en), hist = Array.isArray(it) ? it.join(' ') : it || '';
      const probs = shuffle(g.problems || []).slice(0, 5);
      return { id: g.id, title: L(g.title, lang), intro: hist, start: { spec: null, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes,
        probs: probs.map(P => ({ pos: { spec: P.s, me: xqMe(P.s) }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: window.XiangqiEngine ? [XiangqiEngine.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: CKM('ok', lang) }) })),
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
  const BACKGAMMON = {
    LKEY: 'aicoding-backgammon-v2-lessons', OKEY: 'aicoding-backgammon-v2-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const tx = window.AtlasBgTexts ? AtlasBgTexts() : Promise.resolve({});
      const bg = window.AtlasBgExplain ? AtlasBgExplain() : Promise.resolve();   // (the rules and the commentary engine: atlas/puzzles.js loads them — the same files and cache keys as the table)
      return (this.p = Promise.all([getJ('../backgammon/lessons.json?v=20261021pz'), getJ('../backgammon/openings.json?v=20261021op'), tx, bg, getJ('../backgammon/ramps.json?v=3').catch(() => null)])
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
      const introK = intro + (keys && keys !== 'ls.' + s.id + '.keys' ? `<br><b>🧭 ${kh}</b>` + String(keys).split('|').map(x => { const cjk = /^(ja|zh)/.test(lang), y = cjk ? x.replace(/。(?=.)/g, '、') : x; return '<br>・' + y + (/[。！？!?.]$/.test(y) ? '' : cjk ? '。' : '.'); }).join('') : '');   // (one sentence per principle: the speech pages never cut one in two)
      const rp = this.data.rp, ramp = rp && rp.steps && rp.steps[s.id] && rp.steps[s.id].length ? rp.steps[s.id] : null;   // (the warm-up: backgammon/ramps.json, 2026-11-15)
      const RU = (k, v) => fill(L(((rp && rp.ui) || {})[k], lang), v || {});
      return { id: s.id, title: T('title'), intro: introK, ramp, RU,
        probs: (s.problems || []).map(P => {
          const pos = bgPos(P.pos, P.side), ask = this.tx('ls.turn', lang, { c: '<b>' + N.c + '</b>' }) + ' ';
          if (P.kind === 'play') return this.play(P, pos, ask + T('goal', { d: P.dice.join('-') }), T('hint'), lang);
          const qv = Object.assign({}, N, P.qv || {}); if (P.q === 'shots') qv.m = this.tx('ls.why.shotsD', lang, { d: (P.qv || {}).d });
          return { pos: { bg: { pos, dice: null } }, kind: 'choice', P, ask: this.tx('ls.q.' + P.q, lang, qv), hintTx: P.q === 'take' ? this.tx('ls.takepoint.hint', lang) : P.q === 'double' ? this.tx('ls.racecube.hint', lang) : T('hint'), ans: [],
            marks: (P.mk || []).map(([sd, pt, c]) => ({ pt: (sd ^ P.side) === 0 ? pt : 25 - pt, cls: c === 'ok' ? 'ok' : 'hl' })),
            choices: P.opts.map(o => { const [ok, on] = Array.isArray(o) ? o : [o]; return this.tx('ls.opt.' + ok, lang, Object.assign({}, qv, { n: on })) || ok; }), right: P.ans,
            why: this.tx('ls.why.' + (P.why || P.q), lang, qv) };
        }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, pass: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), pass: o.pass || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const it = this.data.op.items[key]; if (!it || !window.BG) return null;
      const T = f => this.tx('op.i.' + it.id + '.' + f, lang), N = this.names(lang);
      const decs = this.opDecs(it);
      return { id: it.id, title: T('t') || it.id, intro: [T('d'), T('a')].filter(Boolean).join('<br>'), start: null, steps: [], notes: {},
        probs: decs.map(x => { const tol = this.data.op.tol || .02, R = x.plays.map(y => ({ m: y[0], e: y[3] != null ? y[3] : y[1], ro: y[3] != null, ply: y[2] })), rolled = R.some(y => y.ro), best = R.filter(y => !rolled || y.ro).reduce((a, b) => b.e > a.e ? b : a);
          const P = { dice: x.d, plays: R.map(y => [y.m, y.e]), opTol: tol, opOk: R.filter(y => (rolled ? y.ro : y.ply === 2) && best.e - y.e <= tol + 1e-9).map(y => y.m), best: best.m };
          const ask = this.tx('op.drillTurn', lang, { c: '<b>' + N.c + '</b>', d: x.d.join('') });
          return Object.assign(this.play(P, x.pos, ask, this.tx('op.hint', lang) || '', lang), { ans: [{ froms: best.m, cls: 'ring' }], best: () => best.m }); }),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[it.id] || {}, pass = pts >= max; pr[it.id] = Object.assign({}, o, { pass: !!o.pass || pass, best: Math.max(o.best || 0, max ? pts / max : 0) }); put(this.OKEY, pr); return pass; } };
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
  const HEX = {
    LKEY: 'aicoding-hex-lessons', OKEY: 'aicoding-hex-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../hex/lessons.json?v=20261115'), getJ('../hex/openings.json?v=1'), fetch('../hex/i18n.js?v=20261115').then(r => r.text()), hxEng().catch(() => null), getJ('../hex/ramps3d.json?v=1').catch(() => ({})), fetch('../hex/voice-pen-ja.js?v=1').then(r => r.ok ? r.text() : '').catch(() => '')])
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
      return { id: s.id, title: T('title'), intro: T('intro'), ramp, RU,
        probs: (s.problems || []).map(P => { const good = P.ok || [P.best];
          return { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.ok ? P.ok[0] : P.best, hintTx: T('hint'), hint: hxArea(P.s, P.ok ? P.ok[0] : P.best),
            good: () => T('why', { m: HXM('ok', lang), x: HXM('ng', lang) }), ng: () => { const t = T('ng', { m: HXM('ok', lang), x: HXM('ng', lang) }); return t && t !== 'undefined' ? t : T('why', { m: HXM('ok', lang), x: HXM('ng', lang) }); } }; }),
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
      const n = g.n, line = g.study.line.slice(), notes = {}, noteMarks = {}, NCH = NC.hex || {};
      const cellOf = t => { const c = 'abcdefghijklm'.indexOf(t[0]), r = +t.slice(1) - 1; return c >= 0 && c < n && r >= 0 && r < n ? r * n + c : -1; };
      const E = window.HexEngine; let pos = E ? E.replay({ n, swap: g.swap }, []).pos : null;
      line.forEach((m, i) => {
        let played = m;
        if (pos) { const before = pos.clone ? pos.clone() : null; pos.play(m); if (m === (E ? E.SWAP : 1023)) { for (let q = 0; q < pos.b.length; q++) if (pos.b[q] && before && !before.b[q]) played = q; } }
        const raw = g.study.notes && g.study.notes[i] ? L(g.study.notes[i], lang) : '', mk = [];
        const txt = String(raw).replace(/\b([a-m])(1[0-3]|[1-9])\b/g, t => { const q = cellOf(t); if (q < 0) return t; const k = q === played ? 'ok' : 'hl'; mk.push([q, k]); return HXM(k, lang); });
        notes[String(i)] = `<b>${i + 1}. ${this.tx(i % 2 ? 'p2' : 'p1', lang) || (i % 2 ? '○' : '●')}</b>` + (txt ? '<br>' + txt : '');
        if (mk.length) noteMarks[String(i)] = mk;
      });
      const probs = shuffle(g.problems || []).slice(0, 5);
      const intro = NCH['op:' + g.id + '/intro'] ? L(NCH['op:' + g.id + '/intro'], lang) : this.tx('op.' + g.id + '.intro', lang);
      return { id: g.id, title: this.opTitle(g, lang), intro: String(intro || '').replace(/\n/g, '<br>'), start: { spec: { n, swap: g.swap }, me: g.side === 2 ? 2 : 1 }, steps: line, notes, noteMarks,
        probs: probs.map(P => ({ pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: hxArea(P.s, P.best),
          ng: () => this.tx('op.why', lang, { m: HXM('ok', lang) }), good: () => this.tx('op.why', lang, { m: HXM('ok', lang) }) })),
        save: (pts, max) => { const pr = J(this.OKEY, {}), o = pr[g.id] || { best: 0, pass: false }, pass = pts >= max * .75; pr[g.id] = { best: Math.max(o.best || 0, Math.round(pts / max * 100)), pass: o.pass || pass }; put(this.OKEY, pr); return pass; } };
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
  const AMAZONS = {
    LKEY: 'aicoding-amazons-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      const tx = ['../checkers/i18n.js?v=20261107l14-nd1', '../amazons/i18n-am.js?v=4', '../amazons/i18n-am-more.js?v=4', '../amazons/i18n-am-ls.js?v=1', '../amazons/i18n-am-ls-more.js?v=1', '../amazons/i18n-am-ls-more2.js?v=1'];
      return (this.p = Promise.all([getJ('../amazons/lessons.json?v=1'), Promise.all(tx.map(u => fetch(u).then(r => r.text()).catch(() => ''))), amEng().catch(() => null)])
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
      const RX = it => { const o = Object.assign({}, it); ['t', 'body', 'g', 'h', 'y'].forEach(f => { if (typeof o[f] === 'string') o[f] = this.tx(o[f], lang); }); o.gm = AM_GM[s.id + '/' + s.ramp.indexOf(it)] || null; return o; };
      return { id: s.id, title: T('title'), intro, ramp: s.ramp && s.ramp.length ? s.ramp.map(RX) : null, RU: (k, v) => this.tx('ru.' + k, lang, v || {}),   // (the warm-up: texts without coordinates from atlas/nocoord/amazons.json)
        probs: (s.problems || []).map(P => { const good = P.ok || [P.best];
          return { pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: T('goal'), ans: P.best != null ? P.best : good[0], marks: (P.mk || []).map(q => [q, mkc]), hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            good: () => T('why', { m: AMM('ok', lang), x: AMM('ng', lang) }), ng: () => T('ng', { m: AMM('ok', lang), x: AMM('ng', lang) }) }; }),
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
      return (this.p = Promise.all([getJ('../connect4/lessons.json?v=20261107l14'), Promise.all(['../connect4/i18n.js?v=20261107l14', '../connect4/learn.js?v=20261107l14'].map(u => fetch(u).then(r => r.text()).catch(() => '')))])
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
      return { id: s.id, title: T('title'), intro: T('intro'), ramp: s.ramp && s.ramp.length ? s.ramp.slice() : null, RU,   // (the warm-up: texts without coordinates from atlas/nocoord/connect4.json)
        probs: (s.problems || []).map(P => { const me = P.moves.length & 1 ? 2 : 1, g = c4Grid(P.moves), hm = s.hintMarks;
          const thr = hm ? [...(hm === 'me' || hm === 'both' ? c4Thr(c4Grid(P.moves), me).map(([c, r]) => ({ c, r, cls: 'ok' })) : []), ...(hm === 'op' || hm === 'both' ? c4Thr(c4Grid(P.moves), 3 - me).map(([c, r]) => ({ c, r, cls: 'ng' })) : [])] : [];
          const why = () => T('why' + (P.why || ''), { m: C4M('ok', lang), x: C4M('ng', lang), c: name(me), a: P.alt !== undefined ? C4M('hl', lang) : '' }).replace(/列\u0002[ \u00a0]*列/g, '列\u0002');   // (ja: 「緑の印の列 列」 → one 列, 2026-11-21)
          return { pos: { moves: P.moves, me }, kind: 'best', P, ask: T('goal'), ans: P.answer[0], hintTx: T('hint'), hintMk: thr, good: why, ng: why }; }),
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
  /* hnefatafl (2026-11-15): tafl/lessons.json (16 steps of 5 problems): one move from P.ok (20 or 0), a strategy move scored by the
     engine's values P.sc (= tafl/app.js problemPoints), or N moves that keep a forced escape / capture (P.n > 1, = seqAnswer: the engine's
     puzzle solver checks each move, the most stubborn defence answers). Progress = the full game's ('aicoding-tafl-lessons' { id: { best:
     points, clear } }). Texts: tafl/i18n.js (a sandbox). The 3D board has no coordinates: the moves the texts name are their marks (a ring
     on the piece, the destination square); the warm-ups name squares, so they stay in the full game; a notation paragraph is dropped. */
  const TF_ENG = '../tafl/engine.js?v=nn2sr-lv25-zf1';   // (the table adapter's file: one cache)
  const tfEng = () => window.TaflEngine ? Promise.resolve(window.TaflEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = TF_ENG; sc.onload = () => window.TaflEngine ? res(window.TaflEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const TFM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の手' : '赤い印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
  const TAFL = {
    LKEY: 'aicoding-tafl-lessons', OKEY: 'aicoding-tafl-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../tafl/lessons.json?v=3'), fetch('../tafl/i18n.js?v=6ek-nd1').then(r => r.text()).catch(() => ''), tfEng().catch(() => null), getJ('../tafl/openings.json?v=20261116').catch(() => null)])
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
      return { id: s.id, title: T('title'), intro, ramp: s.ramp && s.ramp.length ? s.ramp.slice() : null, RU,   // (the warm-up: tafl/lessons.json step.ramp — texts without coordinates from atlas/nocoord/tafl.json)
        probs: (s.problems || []).map(P => { const me = P.s.side === 2 ? 2 : 1, good = P.ok || [P.best], seq = (P.n || 1) > 1;
          return { pos: { spec: P.s, me }, kind: seq ? 'tfseq' : 'best', P, n: P.n || 1, me, ask: T('goal', { n: P.n || 1 }), ans: seq ? null : P.best != null ? P.best : good[0], hintTx: T('hint'), hint: E ? [...new Set(good.map(E.mFrom))] : null,
            why: '', good: () => T('why', sp), ng: () => T(seq ? 'ng' : 'why', Object.assign({ n: P.n || 1 }, sp)) }; }),
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
      const probs = shuffle(g.problems || []).slice(0, 5), E = window.TaflEngine;
      return { id: g.id, title: L(g.title, lang), intro: hist, start: { spec: { v: 'copenhagen', b: E && E.START && E.START.copenhagen ? E.START.copenhagen : null, side: 1 }, me: g.side === 2 ? 2 : 1 }, steps: g.study.line.slice(), notes,
        probs: probs.map(P => ({ pos: { spec: P.s, me: P.s.side === 2 ? 2 : 1 }, kind: 'best', P, ask: this.tx('op.goal', lang), ans: P.best, hintTx: this.tx('op.hint', lang), hint: E ? [E.mFrom(P.best)] : null, ng: () => this.tx('op.why', lang, { m: TFM('ok', lang) }) })),
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
  const MANCALA = {
    LKEY: 'aicoding-mancala-v1-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../mancala/lessons.json?v=3'), Promise.all(['../mancala/i18n.js?v=20261107l15', '../mancala/i18n-learn.js?v=20261107l14'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n'))])
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
      return { id: s.id, title: T('title'), intro: T('intro'), ramp: null,
        probs: (s.problems || []).map(P => {
          const base = s.id === 'sow' ? [{ at: P.target, cls: 'target' }] : [];
          const th = { extra: 'store', chain: 'store', e_chain: 'store', s_relay: 'store', capture: 'cap', k_combo: 'cap', n_cap: 'cap', s_cap: 'cap', defend: 'def', n_defend: 'def', s_defend: 'def', n_chain: 'store', s_chain: 'store', e_block: 'blk' }[s.id];
          const hintMk = () => { const b = P.b, E = window.MancalaEngine, o = [];
            if (th === 'store') o.push({ at: 6, cls: '' });
            if (th === 'cap') for (let i = 0; i < 6; i++) if (!b[i] && b[12 - i]) o.push({ at: 12 - i, cls: 'cap' });
            if ((th === 'blk' || th === 'def') && E) for (let k = 0; k < 6; k++) { if (!b[7 + k]) continue; const tr = E.trace(Int8Array.from(b), 1, k, R); if (th === 'blk' && tr.extra && !tr.over) o.push({ at: 7 + k, cls: 'cap' }); if (th === 'def' && tr.cap) o.push({ at: tr.capFrom, cls: 'cap' }); }
            return o; };
          return { pos: { spec: { b: P.b.slice(), rules: R, side: 0 }, me: 1, marks: base }, kind: 'best', P, base, hintMk, sow: s.id === 'sow', ans: P.best, ask: T('goal'), hintTx: T('hint'), hint: null, why: '',
            good: () => T('why', sp), ng: () => this.tx('fb.answerIs', lang, { m: MCM('ok', lang) }) + ' ' + T('why', sp) };
        }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, k) {   // (= mancala/app.js problemPoints)
      const sc = P.sc, all = sc.filter(v => v !== null), mine = sc[k], best = Math.max(...all), n = all.length;
      if (mine == null) return 0; if (n <= 1 || mine >= best - 1e-9) return 20;
      const r = all.filter(v => v > mine + 1e-9).length; return Math.max(0, Math.round(20 * (n - 1 - r) / (n - 1)));
    },
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), P = s && s.problems && s.problems[0]; return P ? { pos: { spec: { b: P.b.slice(), rules: this.rules(s), side: 0 }, me: 1, lock: true } } : null; },
  };
  /* morris (2026-11-16): morris/lessons(-six|-twelve).json — one move each, scored as morris/index.html problemPoints (P.ok: one of
     these; P.sc: the stored values); the moves named by their marks (no coordinates on the 3D board: a sentence naming points is left
     out). Progress = the full game's ('aicoding-morris-lessons' { '<six:|twelve:><id>': { best, clear } }). Texts: morris/i18n.js + i18n_more.js. */
  const MMV = ['nine', 'six', 'twelve'], MMPRE = v => v === 'nine' ? '' : v + ':', MF = m => m & 31, MT = m => (m >> 5) & 31, MN = 31;
  const noCoord = x => String(x || '').replace(/<p>[^<]*\b[a-g][1-7]\b[^<]*<\/p>/g, '').replace(/[^。.!！?？]*\b[a-g][1-7]\b[^。.!！?？]*[。.!！?？]?/g, '').trim();
  const MORRIS = {
    LKEY: 'aicoding-morris-lessons', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([Promise.all(MMV.map(v => getJ(`../morris/lessons${v === 'nine' ? '' : '-' + v}.json?v=20261116`))), Promise.all(['../morris/i18n.js?v=20261116', '../morris/i18n_more.js?v=20261116'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n'))])
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
      return { id: s.id, title: T('title'), intro: noCoord(T('intro')), ramp: null,
        probs: s.problems.map(P => { const me = P.s.side === 2 ? 2 : 1, ans = P.best != null ? P.best : P.ok[0], good = P.ok || [ans];
          const pts = [...new Set(good.map(m => s.id === 'b_reopen' || MF(m) !== MN && !P.ok ? MF(m) : MT(m)))];
          return { pos: { spec: { v: s.v, s: P.s }, me }, kind: 'best', P, me, ask: noCoord(T('goal')), ans, hintTx: noCoord(T('hint')), hint: pts,
            why: '', good: () => noCoord(T('why', sp)), ng: () => noCoord(P.ok ? T('ng', sp) || T('why', sp) : T('why', sp)) }; }),
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
  const dRank = (vals, mine) => { const d = [...new Set(vals.map(x => x[1]))].sort((a, b) => b - a); if (d.length <= 1) return 20; const i = d.indexOf(mine); return i < 0 ? 0 : Math.max(0, Math.round(20 * (d.length - 1 - i) / (d.length - 1))); };
  const dSafe = (n, edges) => { const HN = (n + 1) * n, E = HN + n * (n + 1), on = new Set(edges), be = bx => { const r = Math.floor(bx / n), c = bx % n; return [r * n + c, (r + 1) * n + c, HN + r * (n + 1) + c, HN + r * (n + 1) + c + 1]; };
    const cnt = bx => be(bx).filter(e => on.has(e)).length, eb = e => { const o = []; for (let bx = 0; bx < n * n; bx++) if (be(bx).includes(e)) o.push(bx); return o; };
    const out = []; for (let e = 0; e < E; e++) if (!on.has(e) && eb(e).every(bx => cnt(bx) < 2)) out.push(e); return out; };
  const DOTS = {
    LKEY: 'dots-lessons-v2', data: null, I: null, got: {},
    load(lang) {
      const T = () => Promise.all([...new Set(['ja', 'en', lang || 'en'])].filter(l => !this.got[l]).map(l => getJ(`../dots/content/text.${l}.json?v=20261021L`).then(d => { this.got[l] = 1; if (this.I) this.I[l] = Object.assign(this.I[l] || {}, d); }).catch(() => {})));
      if (this.p) return this.p.then(() => T()).then(() => this);
      return (this.p = Promise.all([getJ('../dots/lessons.json?v=20261116'), Promise.all(['../dots/i18n.js?v=20261116', '../dots/i18n-learn.js?v=20261116'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n'))])
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
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), SAFE = ['safe', 'third', 'parity', 'sacrifice', 'open3', 'mid4', 'mid5'].includes(s.id);
      return { id: s.id, title: T('t'), intro: T('body'), ramp: null,
        probs: s.problems.slice(1, 6).map(q => { const edges = dDecE(q.e), values = dDecV(q.v), best = Math.max(...values.map(x => x[1])), ans = values.find(x => x[1] === best)[0];
          return { pos: { spec: { n: q.n, edges, owners: dDecO(q.o) }, me: 0 }, kind: 'best', P: { values }, ask: `<small>${q.n}×${q.n}</small> ` + T('q'), ans, hintTx: T('hint'), hint: SAFE ? dSafe(q.n, edges) : [], dHint: true,
            why: '', good: () => T('tip'), ng: () => T('tip') }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    points(P, e) { const v = new Map(P.values).get(e); return v === undefined ? 0 : dRank(P.values, v); },
    introPos(c) { const s = this.data.ls.steps.find(x => x.id === c.id), q = s && s.problems[0]; return q ? { pos: { spec: { n: q.n, edges: dDecE(q.e), owners: dDecO(q.o) }, me: 0, lock: true } } : null; },
  };
  /* (2026-11-21 the user: a very easy first step — the answer is lit, or one obvious move — needs no 5 problems: 2 clear it). Lesson keys. */
  const EASY2 = { amazons: ['0', '1', '2'], morris: ['0'], tafl: ['0'], mancala: ['0'], reversi: ['0'], gomoku: ['0'], connect4: ['0'], hex: ['0'] };
  const DATA = { dots: DOTS, morris: MORRIS, mancala: MANCALA, tafl: TAFL, shogi: SHOGI, chess: CHESS, reversi: REVERSI, gomoku: GOMOKU, go: GO, checkers: CHECKERS, xiangqi: XIANGQI, backgammon: BACKGAMMON, hex: HEX, amazons: AMAZONS, connect4: CONNECT4 };

  function list(id, kind, lang) { const D = DATA[id]; return Promise.all([D.load(lang), ncLoad(id)]).then(() => D.list(kind, lang)); }
  function next(id, kind, lang) { return list(id, kind, lang).then(L2 => { const x = L2.find(i => !i.full && i.st !== 'pass') || L2.find(i => !i.full); return x ? x.key : null; }); }

  function start(ctx) {
    const id = ctx.id, D = DATA[id], ad = ctx.adapter, GD = (window.AtlasPuzzles && AtlasPuzzles.G || {})[id] || {};
    const VO = (VOICE[id] || {})[ctx.lang] || {}, X = Object.assign({}, TX[ctx.lang] || TX.en, VO);
    const LN = ((window.AtlasPuzzleLines || {})[id] || {})[ctx.lang] || {}, line = k => { const a = LN[k]; return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; };
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
        if (sess && id === 'dots' && G && pz() && pz().n !== G.spec.n) { sess.stop(); sess = null; }   // (dots: another board size)
        if (sess && id === 'morris' && G && pz() && pz().v !== G.spec.v) { sess.stop(); sess = null; }   // (morris: another rule set's board)
        if (sess && id === 'tafl' && G && G.spec && G.spec.b && pz() && pz().n !== Math.round(Math.sqrt(String(G.spec.b).length))) { sess.stop(); sess = null; }   // (tafl: another rule set's board)   // (go / hex: another board size — a new board)
        if (!sess) {
          sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
            pz: Object.assign({ lesson: true, fen: pos, sfen: pos, sol: sol || [], drill: drill || null, lock: !!lock, counts: () => id === 'reversi' && phase !== 'ramp' && !(phase === 'prob' && cur && cur.k >= RV_NUMS()), ready: () => { const f = onReady; onReady = null; if (f) f(); }, moved: (u, i) => onMoved && onMoved(u, i) }, G || {}) });
          ctx.Table3D.play(true);
        } else if (G && id === 'go') pz().load(G.spec, G.me, { view: G.view, marks: G.marks, lock: !!G.lock });
        else if (G && (id === 'checkers' || id === 'xiangqi' || id === 'hex' || id === 'amazons' || id === 'tafl' || id === 'morris' || id === 'dots')) pz().load(G.spec, G.me, { lock: !!G.lock });
        else if (G && id === 'mancala') pz().load(G.spec, G.me, { lock: !!G.lock, marks: G.marks });
        else if (G && id === 'connect4') pz().load(G.moves, G.me, { lock: !!G.lock });
        else if (G && id === 'backgammon') pz().load(G.bg);
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
      if (it.k === 'explain') say(`💡 <b>${RT(it.t)}</b><br>${D.rampBody ? D.rampBody(it, ctx.lang) : L(it.b, ctx.lang)}`);
      else say(RT(it.g) + (cur.ramp.findIndex(x => x.k === 'try') === i ? `<br><small>${RU('note')}</small>` : ''));   // (the note once: on the first try)
      act(last ? RU('main') : RU('next'), { hint: it.k === 'try', nextOn: it.k === 'explain' });
      $('[data-a=next]').onclick = goOn;
      $('[data-a=hint]').onclick = () => {
        if (it.k !== 'try' || ok || !pz()) return; rh = Math.min(3, rh + 1);
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
      if (it.k === 'explain' && it.seq && it.seq.length) { for (const q of (D.rampSeq ? D.rampSeq(it) : it.seq)) { await sleep(420); if (stopped || phase !== 'ramp' || cur.ri !== i) return; await pz().play(q); } }   // (an example sequence, played out)
      marks0();
      let rLine = false;   // (a mate in 3 or more: the first move was right, the line goes on — the defender answers, the player mates)
      const rDone = () => {
        ok = true; if (D.rampMarks) pz().mark(null); else if (pz().annot) pz().annot(null); say(`✓ ${RT(it.y)}`); try { chime(true); } catch (e) {}
        act(last ? RU('main') : RU('next'), {});
        autoGo(2600, () => cur && phase === 'ramp' && cur.ri === i && !more.length, goOn);
      };
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
        if (D.rampMarks && !['checkers', 'xiangqi', 'backgammon', 'tafl', 'amazons', 'connect4'].includes(id)) pz().mark([[u, 'ng']]);   // (checkers / xiangqi: a move number, not a square — the miss is taken back below)
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
      phase = 'done'; const n = cur.stars.reduce((a, b) => a + (b || 0), 0), max = cur.drill.length * 3; cur.save(n, max); dots();
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
      cur = Object.assign(ncApply(id, L2), { key, k: 0, res: [], si: 0 }); head(cur.title); choices(null);
      if (ctx.kind !== 'open' && (EASY2[id] || []).includes(String(key)) && cur.probs && cur.probs.length > 2) cur.probs = cur.probs.slice(0, 2);   // (2026-11-21 ユーザー：簡単すぎる初級の問題は2問でクリア)
      phase = 'intro'; dots();
      say(`${fill((TOPIC[ctx.lang] || TOPIC.en)[ctx.kind === 'open' ? 1 : 0], { t: `<b>${cur.title}</b>` })}<br>${cur.intro || ''}`);   // (「今日は『ルーク』について学ぶよ！」 — not the bare title, 2026-11-14)
      // (2026-11-14) while the introduction is read, the board shows the lesson's own picture (its diagram) for looking only — never the
      // first problem: no ★, no answer marks, nothing to move until はじめる
      const intro = () => { const ip = D.introPos && D.introPos(cur); if (!ip) return; board(ip.pos, [], ip.drill, ip.lock).then(() => { if (stopped || phase !== 'intro' || !pz()) return; if (ip.annot && pz().annot) pz().annot(ip.annot); if (ip.marks && pz().mark) pz().mark(ip.marks); }); };
      if (cur.drill) { cur.stars = []; cur.probs = cur.drill.map(() => ({})); act(X.start); $('[data-a=next]').onclick = () => drill(0); intro(); return; }
      act(X.start); $('[data-a=next]').onclick = () => (ctx.kind === 'open' && cur.steps.length ? study() : cur.ramp ? ramp(0) : prob());
      if (ctx.kind === 'open' && cur.start) board(cur.start);   // (the opening's start position is on the table while reading)
      else intro();
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
        const note = cur.notes[String(cur.si)], nmk = cur.noteMarks && cur.noteMarks[String(cur.si)]; cur.si++;
        if (nmk && pz().mark) pz().mark(nmk);   // (hex: the cells its note names)
        head(cur.title + ' · ' + fill(X.step, { i: cur.si, n: cur.steps.length }));
        say(note ? L(note, ctx.lang) : '　'); act(X.next);
      };
      $('[data-a=next]').onclick = stepOn; stepOn();
    }
    // (2026-11-12) every problem says first whose turn it is (the side the player plays): 「あなたは●黒番。」
    const SIDE = { ja: ['あなたは<b>●黒番</b>。', 'あなたは<b>○白番</b>。'], en: ['You play <b>● Black</b>. ', 'You play <b>○ White</b>. '], zh: ['你执<b>●黑</b>。', '你执<b>○白</b>。'], 'zh-TW': ['你執<b>●黑</b>。', '你執<b>○白</b>。'], ko: ['당신은 <b>●흑</b> 차례. ', '당신은 <b>○백</b> 차례. '], es: ['Juegas con <b>● negras</b>. ', 'Juegas con <b>○ blancas</b>. '], fr: ['Vous jouez les <b>● noirs</b>. ', 'Vous jouez les <b>○ blancs</b>. '], pt: ['Você joga de <b>● pretas</b>. ', 'Você joga de <b>○ brancas</b>. '], de: ['Du spielst <b>● Schwarz</b>. ', 'Du spielst <b>○ Weiß</b>. '], ru: ['Вы играете <b>● чёрными</b>. ', 'Вы играете <b>○ белыми</b>. '], tr: ['<b>● Siyah</b> oynuyorsun. ', '<b>○ Beyaz</b> oynuyorsun. '], id: ['Kamu main <b>● Hitam</b>. ', 'Kamu main <b>○ Putih</b>. '], hi: ['आप <b>● काले</b> से खेल रहे हैं। ', 'आप <b>○ सफ़ेद</b> से खेल रहे हैं। '], ar: ['أنت تلعب <b>● بالأسود</b>. ', 'أنت تلعب <b>○ بالأبيض</b>. '] };
    function sideLine(p) {
      if ((id === 'checkers' || id === 'xiangqi') && p && p.pos && p.pos.me && D.tx) return D.tx('ls.turn', ctx.lang, { c: '<b>' + D.tx(p.pos.me === 1 ? 'p1' : 'p2', ctx.lang) + '</b>' }) + ' ';   // (「黒の番です。」)
      if (id === 'gomoku' && p && p.pos && p.pos.me && !p.pos.pick && D.tx) return D.tx('ls.turn', ctx.lang, { c: '<b>' + D.tx(p.pos.me === 1 ? 'p1' : 'p2', ctx.lang) + '</b>' }) + ' ';   // (「白の番です。」)
      if (id !== 'reversi' || !p || !p.pos) return '';
      const s = String(p.pos).split(':')[1]; if (s !== '1' && s !== '2') return '';
      return ((SIDE[ctx.lang] || SIDE.en)[+s - 1]) + (ctx.lang === 'ja' || /^zh/.test(ctx.lang) ? '' : '');
    }
    // (2026-11-21 user) reversi: the flip counts on the first 2 problems only (1 when the lesson has only 2: EASY2) — the rest are solved without them
    const RV_NUMS = () => cur && cur.probs && cur.probs.length <= 2 ? 1 : 2, RV_SELF = { ja: 'ここからは数字なし。自分で数えて考えてみて！', en: 'From here on, no numbers: count for yourself!' };
    // one problem
    async function prob() {
      phase = 'prob'; const p = cur.probs[cur.k]; if (!p) return finish();
      p.hinted = false; p.used = 0; dots(); act(X.next, { nextOn: false });
      say(sideLine(p) + (id === 'reversi' && cur.k === RV_NUMS() && RV_SELF[ctx.lang] ? RV_SELF[ctx.lang] + '<br>' : '') + (p.ask || X.opGoal));
      await board(p.pos, p.sol); if (stopped || cur.probs[cur.k] !== p) return;
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
        return scored(p, 0, (p.ng ? p.ng() : '') || X.wrong);
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
        scored(p, ok ? PTS : 0); };
    }
    function scored(p, pts, msg, u) {
      p.done = true; const n = Math.max(0, pts - (p.hinted && pts > 0 ? HINT_PEN : 0)); cur.res[cur.k] = n; dots();
      if (id === 'backgammon') {   // (the best play's arrows green, yours red, from the roll's start; a question: its explanation)
        const right = pts >= 16, k = cur.k;
        if (p.kind === 'bgplay' && u && u.steps) { const best = p.best(); later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().reset(); pz().mark([{ m: best, cls: 'ok' }, ...(right && pts >= 20 ? [] : [{ play: u.steps, cls: 'ng' }])]); }, 700); }
        let teach = '';   // (what the best play is for, and what yours gives up: backgammon/explain.js teach)
        if (p.kind === 'bgplay' && window.BGX && BGX.teach && window.AtlasBgTeach) {
          try { const q0 = bgDecP(p.bgPos), mk = mv => { const q = q0.slice(); mv.forEach(c => BG.apply(q, 0, BG.mvFrom(c), BG.mvTo(c))); return { moves: mv, pos: q }; };
            teach = AtlasBgTeach.html(BGX.teach(q0, 0, mk(bgCodes(p.bgPos, p.best()).moves), pts >= 20 ? null : mk(u.steps)), (k, v) => D.tx(k, ctx.lang, v), false, true); } catch (e) { console.warn(e); }
        }
        say(`${right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (p.why ? '<br>' + p.why : '') + teach);
        try { chime(right); } catch (e) {}
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'mancala' && typeof u === 'number') {   // (back to the problem: the answer's pit in gold, yours red, every pit's value)
        const right = pts >= 16, k = cur.k, P = p.P;
        say(`${right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b><br>` + (right ? p.good() : p.ng()) + (p.sow ? '' : '<br><small>' + D.tx('fb.values', ctx.lang, { a: mcFmt(P.sc[u], false), b: mcFmt(P.sc[P.best], false) }) + '</small>'));
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
        say(`${right ? line('solved') || pick(X.good) : X.wrong} <b>${fill(X.pts, { n })}</b>` + (p.good ? '<br>' + p.good(u) : ''));
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([[p.ans, 'ok'], ...(right ? [] : [[u, 'ng']])]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if ((id === 'checkers' || id === 'xiangqi' || id === 'amazons' || id === 'tafl' || id === 'morris' || id === 'dots') && typeof u === 'number') {   // (checkers / xiangqi: the lesson's own words, the moves named by their arrows; back to the problem with the right move green, yours red)
        const right = pts >= 16, k = cur.k;
        say(`${right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (right ? (p.good ? '<br>' + p.good(u) : '') : p.ng ? '<br>' + p.ng(u) : ''));
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([...(right || p.ans == null ? [] : [[{ m: p.ans }, 'ok']]), [{ m: u }, right ? 'ok' : 'ng']]); }, 900);
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (right && cur.k + 1 < cur.probs.length) autoGo(2600, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); });
        return;
      }
      if (id === 'reversi' && u != null && u !== '' && !isNaN(+u) && p.P && (p.P.f || (p.P.rv === 'op' && p.good))) { u = +u;   // (openings too, 2026-11-21)
          // (2026-11-21: back to the problem — the best squares green, yours red; why, in the guide's words)
        const right = pts >= 16, k = cur.k, okA = p.oks || [+p.ans], tx = right ? p.good(u) : p.ng(u);
        say(`${right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (tx ? '<br>' + tx : right ? '' : '<br>' + fill(ANSW[ctx.lang] || ANSW.en, { m: SP('ok', ctx.lang) })));
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
        say(`${pts >= 16 ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + said + (id === 'go' && pts < 20 && p.ans >= 0 && !said.includes(SP('ok', ctx.lang)) ? '<br>' + fill(ANSW[ctx.lang] || ANSW.en, { m: SP('ok', ctx.lang) }) : ''));
        if (id === 'go' && p.line && p.line.length > 1) { const k = cur.k; later(async () => { if (!cur || cur.k !== k || phase !== 'prob') return; pz().undo(9); for (const q of p.line) { await sleep(700); if (!cur || cur.k !== k || phase !== 'prob' || stopped) return; await pz().play(q); } }, 900); }   // (go: the right line played out, as the full game)
        try { chime(pts >= 16); } catch (e) {}
        act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
        if (pts >= 16 && cur.k + 1 < cur.probs.length) { const k = cur.k, w = 2400 + (id === 'go' && p.line && p.line.length > 1 ? 900 + 700 * p.line.length : 0); autoGo(w, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); }); }   // (right: on to the next one by itself)
        return;
      }
      // (2026-11-21) {m} / {x} in the lesson's words (chess) → the best move / yours; a wrong answer gets the lesson's ng words, or the why without its 「正解！」
      const Wm = t => t && /\{[mx]\}/.test(t) ? fill(t, { m: '<b>' + (moveName(p.pos, p.ans) || SP('ok', ctx.lang)) + '</b>', x: '<b>' + (moveName(p.pos, u) || '') + '</b>' }) : t;
      const whyR = Wm(id === 'chess' && typeof p.good === 'function' ? p.good(u) : p.why), whyW = Wm(((id === 'shogi' || id === 'chess') && p.ng ? p.ng(u) : '') || p.ngTx || (p.why || '').replace(/^\s*(正解|Correct|Right)[！!]\s*/, ''));   // (shogi: why the move played falls short, 2026-11-21)
      if (pts >= 16) say(`${line('solved') || pick(X.good)} <b>${fill(X.pts, { n })}</b>${whyR ? '<br>' + whyR : ''}`);
      else { if (p.ans) pz().mark(p.ans); const mvN0 = p.kind !== 'tsume' && p.ans ? moveName(p.pos, p.ans) : '', nm = p.kind !== 'tsume' && p.ans && !(mvN0 && whyW && whyW.replace(/<[^>]+>|\s/g, '').includes(mvN0.replace(/\s/g, ''))), mvN = nm ? mvN0 : ''; say(`${msg || (pts > 0 ? X.partial : X.wrong)} <b>${fill(X.pts, { n })}</b>${nm ? '<br>' + (mvN ? fill(ANSW[ctx.lang] || ANSW.en, { m: '<b>' + mvN + '</b>' }) : (ANSP[ctx.lang] || ANSP.en)) : ''}${whyW ? '<br>' + whyW : ''}`);
        if (nm && !mvN) { const k = cur.k, mk = p.ans; later(async () => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz() || !pz().play) return; try { let r = await pz().play(mk); if (r === false) { pz().undo(1); await sleep(250); r = await pz().play(mk); } if (r === false) return; await sleep(1600); if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark(mk); } catch (e) { console.warn('[lessons] show move', e); } }, 1000); } }   // (the move is shown on the board, not named: no coordinates, 2026-11-14)
      try { chime(pts >= 16); } catch (e) {}
      act(cur.k + 1 < cur.probs.length ? X.next : X.result, {});
      if (pts >= 16 && cur.k + 1 < cur.probs.length) { const k = cur.k; autoGo(2400, () => cur && cur.k === k && phase === 'prob' && !more.length, () => { cur.k++; prob(); }); }   // (right: the next problem by itself, the meter on 次へ)
    }
    function finish() {
      phase = 'done'; dots(); choices(null);
      const max = cur.probs.length * PTS, pts = cur.res.reduce((a, b) => a + (b || 0), 0), q = Math.ceil(max * PASS), pass = cur.save(pts, max);
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
      if (nx) open(nx.key); else say(X.endOnly);
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
      toProb: () => { if (cur && cur.probs.length) { cur.k = 0; prob(); } },   // (test hook: straight to the problems)
      answer: async u => { const p = cur && cur.probs[cur.k]; if (!p || !pz()) return; u = u || p.ans; await pz().play(u); moved(p, u, { mate: false }); } };   // (test hook)
    window.__atlasLs = dbg;
    return {
      stop() { autoCancel(); stopped = true; document.removeEventListener('keydown', onKey, true); if (window.__atlasLs === dbg) delete window.__atlasLs; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el, _debug: dbg,
    };
  }
  window.AtlasLessons = { has: id => !!DATA[id], list, next, start, data: id => DATA[id].load().then(D => D.data) };
})();
