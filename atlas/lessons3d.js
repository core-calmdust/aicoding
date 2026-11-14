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
  const ICHI_I = /(でき|見|起き|生き|落ち|足り|借り|信じ|感じ|閉じ|浴び|伸び|延び|過ぎ|尽き|満ち|用い|着|似|居)$/;
  const KANJI = /[\u4e00-\u9fff々]/;
  function verb(stem) {   // the verb stem before ます → { dict, neg, vol, past }
    const k = stem.slice(-1), body = stem.slice(0, -1);
    if (/[てで][いみ]$/.test(stem)) return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };   // (〜ています: the いる of the progressive)
    // し: する after a noun / particle / two kanji (確認し), す after one kanji or the a-row kana of 動かし・逃がし・増やし (godan)
    if (k === 'し' && (stem.length === 1 || (KANJI.test(stem.slice(-2, -1)) && KANJI.test(stem.slice(-3, -2))) || !(KANJI.test(stem.slice(-2, -1)) || /[かがさやらわまたな]/.test(stem.slice(-2, -1))))) return { dict: body + 'する', neg: body + 'しない', vol: body + 'しよう', past: body + 'した' };
    if (/来$/.test(stem) || /来き$/.test(stem)) return { dict: stem.replace(/き?$/, '') + 'る', neg: stem.replace(/き?$/, '') + 'ない', vol: stem.replace(/き?$/, '') + 'よう', past: stem.replace(/き?$/, '') + 'た' };
    if (/あり$/.test(stem)) return { dict: body + 'る', neg: body.slice(0, -1) + 'ない', vol: body + 'ろう', past: body + 'った' };
    if (/[えけげせぜてでねへべめれ]$/.test(stem) || ICHI_I.test(stem) || stem === 'い') return { dict: stem + 'る', neg: stem + 'ない', vol: stem + 'よう', past: stem + 'た' };
    if (I2U[k]) return { dict: body + I2U[k], neg: body + I2A[k] + 'ない', vol: body + I2O[k] + 'う', past: body + (/行$/.test(body) ? 'った' : I2T[k]) };
    return null;
  }
  function casualJa(html, fox) {   // → plain speech; the sentence ends it made are tokens (\u0003D noun+だ, \u0003V verb, \u0003P past) for guideJa
    const E = '(?=[。！？!?」（(]|<br>|</b>|</p>|$)';
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
    if (fox) return t;
    return t.replace(/\u0003D/g, 'だよ').replace(/\u0003[VP]/g, 'よ');
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
      if (kind === 'open') { const pr = J(this.OKEY, {}); return D.sets.map(s => ({ key: s.id, cat: s.cat, catName: (OPCAT[lang] || OPCAT.en)[s.cat] || s.cat, title: L(s.title, lang), sub: L((NC.shogi || {})['op:' + s.id + '/short'] || s.short, lang), st: pr[s.id] ? (pr[s.id].pass ? 'pass' : 'try') : '' })); }
      const pr = J(this.LKEY, {});
      return D.ls.grades.map((g, i) => ({ key: String(i), cat: g.rules ? 'rules' : 'lesson', catName: '', title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, sub: L(g.short, lang), st: pr[g.id] ? (pr[g.id].pass ? 'pass' : 'try') : '' }));
    },
    lesson(key, lang, X) {
      const g = this.data.ls.grades[+key]; if (!g) return null;
      const pool = g.problems.filter(p => !p.variant && (p.kind === 'best' || p.kind === 'tsume'));
      const probs = g.rules ? pool : shuffle(pool).slice(0, 5);
      return { id: g.id, title: `${L(g.grade, lang)} · ${L(g.title, lang)}`, intro: (L(g.intro, lang) || []).join('<br>'),
        probs: probs.map(p => ({ pos: p.sfen, kind: p.kind === 'tsume' ? 'tsume' : 'best', n: p.n, sol: p.sol, P: p,
          ask: L(p.q, lang) || (p.kind === 'tsume' ? fill(X.tsume, { n: p.n }) : L(g.prompt, lang)), why: L((NC.shogi || {})[g.id + '/p' + g.problems.indexOf(p) + '/expl'] || p.expl, lang), ans: p.sol ? p.sol[0] : (p.accept || p.pv || [])[0] })),
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
    introPos() { return { pos: 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1', lock: true }; },   // (no diagram in lessons.json: the starting position, for looking only, while the intro is read)
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
      const RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: s.id, title: T('title'), intro: T('intro'), ramp: s.ramp && s.ramp.length ? s.ramp : null, RU,   // (the warm-up before the scored problems: explain / try — not scored)
        probs: (s.problems || []).map(p => ({ pos: p.fen, kind: 'best', P: p, ask: T('goal'), why: T('why'), ans: p.best || (p.ok || [])[0] })),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= 75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const s = this.data.op.sets.find(x => x.id === key); if (!s) return null;
      const probs = shuffle(s.problems || []).slice(0, 5);
      const nc = NC.chess || {}, notes = Object.assign({}, s.study && s.study.notes || {}); Object.keys(nc).forEach(k => { const m = k.match(/^op:(.+)\/n(\d+)$/); if (m && m[1] === s.id) notes[m[2]] = nc[k]; });   // (3D: the texts without coordinates)
      const IN = nc['op:' + s.id + '/intro'] || s.intro;
      return { id: s.id, title: L(s.title, lang), intro: (L(IN, lang) || []).join ? L(IN, lang).join('<br>') : L(IN, lang), start: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        steps: (s.study && s.study.steps || []).map(x => x[0]), notes,
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
  const rvSvg = cs => { const c = String(cs).split(':')[0]; let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#2f8f5b"/>';
    for (let k = 1; k < 8; k++) o += `<path d="M${2 + k * 10} 2V82M2 ${2 + k * 10}H82" stroke="#1f6b42" stroke-width=".8"/>`;
    for (let q = 0; q < 64; q++) if (c[q] === '1' || c[q] === '2') o += `<circle cx="${7 + (q & 7) * 10}" cy="${7 + (q >> 3) * 10}" r="4.1" fill="${c[q] === '1' ? '#17181c' : '#f6f2e6'}"${c[q] === '2' ? ' stroke="#bdb6a2" stroke-width=".6"' : ''}/>`;
    return o + '</svg>'; };
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
      if (kind === 'open') return D.steps.map(x => ({ key: x.ln.moves, cat: x.set.id, catName: this.T(x.set, lang).title || x.set.id, title: L(x.ln.name, lang), sub: L(x.ln.aim, lang), svg: rvSvg(rvAfter(x.ln.moves)), st: this.pr('opl:' + x.ln.moves) }));
      return D.ls.lessons.map((l, i) => { const T = this.T(l, lang); const p0 = (l.problems || [])[0]; return { key: String(i), cat: 'lesson', catName: '', title: T.title || l.id, sub: T.short || '', desc: T.goal || '', svg: p0 ? rvSvg(p0.cells) : '', st: this.pr(l.id) }; });
    },
    introPos() { return { pos: rvAfter(''), lock: true }; },   // (no diagram in lessons.json: the four starting discs, for looking only, while the intro is read)
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
      const info = L((NC.reversi || {})['op:' + ln.moves + '/info'] || ln.info, lang).replace(/【[^】]+】|\[[\p{L}\p{M}]{1,16}\]/gu, ' ').trim();
      return { id: 'opl:' + key, title: L(ln.name, lang), intro: `<b>${L(ln.aim, lang)}</b>`,   // (no move list in coordinates: the line is played on the board next) start: rvAfter(''),
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
  const ncLoad = id => NC[id] ? Promise.resolve(NC[id]) : fetch('nocoord/' + id + '.json?v=14').then(r => r.ok ? r.json() : {}).catch(() => ({})).then(o => (NC[id] = o));
  function ncApply(id, L2) {
    const T = NC[id] || {}; if (!L2 || !L2.ramp) return L2;
    L2.ramp = L2.ramp.map((it, j) => { const o = Object.assign({}, it); ['body', 'h', 'y', 'b', 'g', 't'].forEach(f => { const v = T[L2.id + '/' + j + '/' + f]; if (v) o[f] = v; }); return o; });
    return L2;
  }
  const GSQ = x => typeof x === 'number' ? x : (+String(x).slice(1) - 1) * 15 + String(x).charCodeAt(0) - 97;
  const GNM = m => 'abcdefghijklmno'[m % 15] + (Math.floor(m / 15) + 1);
  const gCells = a => (Array.isArray(a) ? a : String(a || '').split(/\s+/)).filter(Boolean).map(GSQ);
  const gPos = (P, o) => Object.assign({ start: { b: gCells(P.b), w: gCells(P.w), side: P.side || 1 }, rule: P.rule || 'renju', me: P.side || 1, last: P.last ? GSQ(P.last) : -1 }, o || {});
  const GMK = { ok: 'ok', ng: 'ng', hl2: 'ring', t4: 'hl', t3: 'hl', hang: 'ng' };
  const GOMOKU = {
    LKEY: 'aicoding-gomoku-lessons', OKEY: 'aicoding-gomoku-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../gomoku/lessons.json?v=20261113'), getJ('../gomoku/openings.json?v=20261113'), fetch('../gomoku/i18n.js?v=20261112c1').then(r => r.text())])
        .then(([ls, op, tx]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] gomoku texts', e); } this.I = w.I18N || {}; this.data = { ls, op }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
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
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: s.id, title: T('title'), intro: T('intro'), ramp: s.ramp && s.ramp.length ? s.ramp : null, RU,
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
      const probs = shuffle(g.problems || []).slice(0, 5);
      return { id: g.id, title: this.name(g, lang), intro: this.tx('op.read', lang, { k: g.kanji, r: g.kana, n: g.name }) + '<br>' + this.tx('op.d.' + g.id, lang), start: { start: null, rule: 'renju', me: 1, last: -1 },
        steps, notes, probs: probs.map(P => { const sc = (P.sc || []).map(([u, v]) => [GSQ(u), v]), b = sc.slice().sort((a, c) => c[1] - a[1])[0]; return { pos: gPos(P, { rule: 'renju' }), kind: 'best', P: { sc }, ask: this.tx('op.goal', lang), ans: b ? b[0] : -1 }; }),
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
    rampPos: it => gPos(it, { noForbid: false }), rampBody: (it, lang) => L(it.body, lang),
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
  const GO = {
    LKEY: 'aicoding-go-lessons', OKEY: 'aicoding-go-open', data: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../go/lessons.json?v=20261113'), getJ('../go/openings.json?v=4'), goRules()]).then(([ls, op]) => { this.data = { ls, op }; return this; }).catch(e => { this.p = null; throw e; }));
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
      const RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {});
      return { id: s.id, title: L(s.title, lang), intro: L(s.intro, lang), ramp: s.ramp && s.ramp.length ? s.ramp : null, RU,
        probs: (s.problems || []).map(P => { const sp = goSpec(P.s), N = sp.n, ok = goPcs(P.ok, N);
          return { pos: { spec: sp, me: sp.turn || 1, view: P.view || goCrop(sp, ok) }, kind: 'best', P: { ok, good: goPcs(P.good, N), half: goPcs(P.half, N) }, ask: L(s.goal, lang), ans: ok[0], line: goPcs(P.line, N), N,
            good(u) { this._hl = []; return goSpots(L(P.why, lang), N, ok, u, true, lang, this._hl); }, ng(u) { this._hl = []; return goSpots(L(P.ng, lang) || L(P.why, lang), N, ok, u, false, lang, this._hl); }, hintTx: L(s.hint, lang), hint: ok.length ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => { const x = ok[0] % N + dx, y = Math.floor(ok[0] / N) + dy; return x >= 0 && y >= 0 && x < N && y < N && sp.stones[y * N + x] === '.' ? y * N + x : -1; }).filter(q => q >= 0) : null }; }),
        save: (pts, max) => { const pr = J(this.LKEY, {}), o = pr[s.id] || { best: 0, clear: false }, pass = pts >= max * .75; pr[s.id] = { best: Math.max(o.best || 0, pts), clear: o.clear || pass }; put(this.LKEY, pr); return pass; } };
    },
    opening(key, lang) {
      const g = this.data.op.sets.find(x => x.id === key); if (!g) return null;
      const N = g.n || 19, st = this.opStart(g), line = this.opLine(g), notes = {};
      line.forEach((m, i) => { const side = i % 2 ? 3 - (st.turn || 1) : st.turn || 1, ev = g.evals && g.evals[i] != null ? ` <small>(${(g.evals[i] >= 0 ? '+' : '') + g.evals[i]})</small>` : '';
        notes[String(i)] = `<b>${i + 1}. ${side === 1 ? '●' : '○'}</b>${ev}` + ((g.notes || {})[String(i + 1)] ? '<br>' + L((NC.go || {})['op:' + g.id + '/n' + (i + 1)] || g.notes[String(i + 1)], lang) : ''); });   // (3D: the notes without coordinates)
      const self = this, probs = shuffle(g.problems || []).slice(0, 5).sort((a, b) => a.at - b.at).map(P => { const ok = goPcs(P.ok, N);
        const o = { kind: 'best', P: { ok, good: goPcs(P.good, N), half: goPcs(P.half, N) }, ask: L(self.data.op.goal || null, lang) || '', ans: ok[0], N };
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
  const CK_ENG = '../checkers/engine.js?v=rb4-pro1-n43-mt1-sv2-zf1';   // (the table adapter's file: one cache)
  const ckEng = () => window.CheckersEngine ? Promise.resolve(window.CheckersEngine) : new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = CK_ENG; sc.onload = () => window.CheckersEngine ? res(window.CheckersEngine) : rej(new Error('engine')); sc.onerror = rej; document.head.appendChild(sc); });
  const CK_WIN = 30000, CK_WINT = 29000;
  const ckS = v => v > CK_WINT ? 0.9 + 0.1 * Math.min(1, 6 / (CK_WIN - v + 1)) : v < -CK_WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (CK_WIN + v + 1))) : v > CK_WINT - 1000 ? 0.88 : v < -(CK_WINT - 1000) ? -0.88 : Math.tanh(v / 260) * 0.82;   // (= checkers/app.js sOfV)
  const CKM = (k, lang) => lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の矢印の手' : '赤い矢印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;   // (a move named by its arrow)
  const ckByName = (spec, nm) => { const E = window.CheckersEngine; if (!E) return null; const p = E.Pos.from(spec); return p.moves().find(m => E.name(p, m) === nm) || null; };
  const CHECKERS = {
    LKEY: 'aicoding-checkers-lessons', OKEY: 'aicoding-checkers-open', data: null, I: null,
    load() {
      if (this.p) return this.p;
      return (this.p = Promise.all([getJ('../checkers/lessons.json?v=20261107l14'), getJ('../checkers/openings.json?v=3'), getJ('../checkers/lux.json?v=1').catch(() => ({})), fetch('../checkers/i18n.js?v=20261107l14-nd1').then(r => r.text()), ckEng()])
        .then(([ls, op, lux, tx]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] checkers texts', e); } this.I = w.I18N || {}; this.data = { ls, op, lux }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
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
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {}), E = window.CheckersEngine;
      const intro = String(T('intro') || '').replace(/\s*[（(][^）)]*\d[^）)]*[）)]/g, '');   // (the double corners' square numbers: not on the 3D board)
      return { id: s.id, title: T('title'), intro, ramp: s.ramp && s.ramp.length ? s.ramp : null, RU,
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
      return (this.p = Promise.all([getJ('../xiangqi/lessons.json?v=20261104rp'), getJ('../xiangqi/openings.json?v=2'), getJ('../xiangqi/lux.json?v=1').catch(() => ({})), fetch('../xiangqi/i18n.js?v=4lv-l14-pro-nd1').then(r => r.text()), xqEng()])
        .then(([ls, op, lux, tx]) => { const w = {}; try { new Function('window', tx)(w); } catch (e) { console.warn('[lessons3d] xiangqi texts', e); } this.I = w.I18N || {}; this.data = { ls, op, lux }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
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
      const T = (k, v) => this.tx('ls.' + s.id + '.' + k, lang, v), RU = (k, v) => fill(L((this.data.ls.rampUi || {})[k], lang), v || {}), E = window.XiangqiEngine;
      return { id: s.id, title: T('title'), intro: T('intro'), ramp: s.ramp && s.ramp.length ? s.ramp : null, RU,
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
      return (this.p = Promise.all([getJ('../backgammon/lessons.json?v=20261021pz'), getJ('../backgammon/openings.json?v=20261021op'), tx, bg])
        .then(([ls, op, I]) => { this.I = I || {}; this.data = { ls, op }; return this; })
        .catch(e => { this.p = null; throw e; }));
    },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && I['ja@dicepup'] ? I['ja@dicepup'][k] : undefined; if (x === undefined) x = I[lang] && I[lang][k];   /* (ダイスン's own lines first, backgammon/voice-dicepup-ja.js) */ if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]); if (x === undefined) return ''; return v && typeof x === 'string' ? fill(x, v) : x; },
    names(lang) { const ck = bgCkOf(); return { c: this.tx('ng.' + ck[0], lang) || ck[0], o: this.tx('ng.' + ck[1], lang) || ck[1] }; },
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
      return { id: s.id, title: T('title'), intro: introK,
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
  const DATA = { shogi: SHOGI, chess: CHESS, reversi: REVERSI, gomoku: GOMOKU, go: GO, checkers: CHECKERS, xiangqi: XIANGQI, backgammon: BACKGAMMON };

  function list(id, kind, lang) { const D = DATA[id]; return Promise.all([D.load(), ncLoad(id)]).then(() => D.list(kind, lang)); }
  function next(id, kind, lang) { return list(id, kind, lang).then(L2 => { const x = L2.find(i => !i.full && i.st !== 'pass') || L2.find(i => !i.full); return x ? x.key : null; }); }

  function start(ctx) {
    const id = ctx.id, D = DATA[id], ad = ctx.adapter, GD = (window.AtlasPuzzles && AtlasPuzzles.G || {})[id] || {};
    const VO = (VOICE[id] || {})[ctx.lang] || {}, X = Object.assign({}, TX[ctx.lang] || TX.en, VO);
    const LN = ((window.AtlasPuzzleLines || {})[id] || {})[ctx.lang] || {}, line = k => { const a = LN[k]; return a && a.length ? a[Math.floor(Math.random() * a.length)] : ''; };
    const voice = h => ctx.lang === 'ja' ? guideJa(h, id) : h;   // (each guide's own way of talking, 2026-11-15)
    let greeted = false;
    let stopped = false, sess = null, cur = null, phase = 'load', typeT = 0, onReady = null, onMoved = null;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const el = document.createElement('div'); el.className = 'rgd pzg lsg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide || ''}" alt=""></div><div class="bub"><div class="nm">${(GD.name && (GD.name[ctx.lang] || GD.name.en)) || ''}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el); autoCss();
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
    let hist = [];   // (the pages of the current speech already shown: ← goes back through them, 2026-11-15)
    function turn() { const h = more.shift(); hist.push(h); show(h); apply(); }
    function back() {
      if (hist.length < 2) return false;
      more.unshift(hist.pop()); show(hist[hist.length - 1]); $('.tx').onclick(); apply(); return true;   // (shown whole: it has been read)
    }
    function say(html) {
      html = String(html || '').replace(/[ \u00a0]*\u0001/g, '').replace(/\u0002[ \u00a0]*/g, '');   // (ja mark phrases: SP)
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
      autoT = setTimeout(() => { autoT = 0; const go = !stopped && (!ok || ok()); autoCancel(); if (go) fire(); }, ms);
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
        if (sess && id === 'go' && G && pz() && pz().n !== (G.spec.n || 9)) { sess.stop(); sess = null; }   // (go: another board size — a new board)
        if (!sess) {
          sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
            pz: Object.assign({ fen: pos, sfen: pos, sol: sol || [], drill: drill || null, lock: !!lock, counts: id === 'reversi', ready: () => { const f = onReady; onReady = null; if (f) f(); }, moved: (u, i) => onMoved && onMoved(u, i) }, G || {}) });
          ctx.Table3D.play(true);
        } else if (G && id === 'go') pz().load(G.spec, G.me, { view: G.view, marks: G.marks, lock: !!G.lock });
        else if (G && (id === 'checkers' || id === 'xiangqi')) pz().load(G.spec, G.me, { lock: !!G.lock });
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
      if (it.k === 'explain') say(`💡 <b>${L(it.t, ctx.lang)}</b><br>${D.rampBody ? D.rampBody(it, ctx.lang) : L(it.b, ctx.lang)}`);
      else say(`${L(it.g, ctx.lang)}<br><small>${RU('note')}</small>`);
      act(last ? RU('main') : RU('next'), { hint: it.k === 'try', nextOn: it.k === 'explain' });
      $('[data-a=next]').onclick = goOn;
      $('[data-a=hint]').onclick = () => {
        if (it.k !== 'try' || ok || !pz()) return; rh = Math.min(3, rh + 1);
        if (D.rampMarks) {   // gomoku: marks on points
          if (rh === 1) { say(L(it.h, ctx.lang)); pz().mark(D.rampMarks(it)); }
          else if (rh === 2) { say(L(it.h, ctx.lang) + '<br>' + RU('look')); pz().mark(D.rampMarks(it).concat(D.rampLook(it))); }
          else { const a = D.rampAns(it); say(RU('ans', { m: D.spOk ? D.spOk(ctx.lang) : SP('ok', ctx.lang) })); pz().mark(D.rampMarks(it).concat([[a, 'ok']])); }
          return;
        }
        if (rh === 1) { say(L(it.h, ctx.lang)); pz().annot && pz().annot(null); }
        else if (rh === 2) { say(L(it.h, ctx.lang) + '<br>' + RU('look')); pz().annot && pz().annot((it.look || []).map(q => ({ at: q, cls: 'ok' }))); }
        else { say(RU('ans', { m: SP(pz().annot ? 'arrow' : 'mark', ctx.lang) })); if (pz().annot) pz().annot([{ arrow: [it.ok[0].slice(0, 2), it.ok[0].slice(2, 4)], cls: '' }, { at: it.ok[0].slice(0, 2), cls: 'ok' }]); else if (pz().mark) pz().mark(it.ok[0]); }
      };
      await board(D.rampPos ? D.rampPos(it) : it.fen); if (stopped || phase !== 'ramp' || cur.ri !== i) return;
      const marks0 = () => { if (D.rampMarks) pz().mark(D.rampMarks(it)); else if (pz().annot) pz().annot(it.k === 'explain' ? rmk(it) : null); };
      if (it.k === 'explain' && it.seq && it.seq.length) { for (const q of (D.rampSeq ? D.rampSeq(it) : it.seq)) { await sleep(420); if (stopped || phase !== 'ramp' || cur.ri !== i) return; await pz().play(q); } }   // (an example sequence, played out)
      marks0();
      onMoved = u => {
        if (stopped || phase !== 'ramp' || cur.ri !== i) return;
        if (it.k === 'explain') { pz().undo(1); marks0(); pz().wait(); return; }   // (the explanation's board is for looking)
        if (D.rampOk ? D.rampOk(it, u) : it.ok.includes(u)) {
          ok = true; if (D.rampMarks) pz().mark(null); else if (pz().annot) pz().annot(null); say(`✓ ${L(it.y, ctx.lang)}`); try { chime(true); } catch (e) {}
          act(last ? RU('main') : RU('next'), {});
          autoGo(2600, () => cur && phase === 'ramp' && cur.ri === i && !more.length, goOn);   // (right: on to the next step by itself, the meter on 次へ)
          return;
        }
        say(RU('ng')); try { chime(false); } catch (e) {}
        if (D.rampMarks && id !== 'checkers' && id !== 'xiangqi') pz().mark([[u, 'ng']]);   // (checkers / xiangqi: a move number, not a square — the miss is taken back below)
        later(() => { if (cur && phase === 'ramp' && cur.ri === i && !ok) { if (!(it.pick)) pz().undo(1); marks0(); pz().wait(); } }, 1100);
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
        const note = cur.notes[String(cur.si)]; cur.si++;
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
    // one problem
    async function prob() {
      phase = 'prob'; const p = cur.probs[cur.k]; if (!p) return finish();
      p.hinted = false; p.used = 0; dots(); act(X.next, { nextOn: false });
      say(sideLine(p) + (p.ask || X.opGoal));
      await board(p.pos, p.sol); if (stopped || cur.probs[cur.k] !== p) return;
      onMoved = (u, info) => moved(p, u, info);
      if (p.marks && p.marks.length && pz().mark) pz().mark(p.marks);
      choices(p);
      if (!p.choices) pz().wait(); act(X.next, { hint: true, nextOn: false });
      $('[data-a=next]').onclick = () => { cur.k++; if (cur.k < cur.probs.length) prob(); else finish(); };
      $('[data-a=hint]').onclick = () => { if (p.ans == null || p.ans < 0 || p.ans === '' || p.done) return; p.hinted = true;
        if (p.hint && p.hint.length) { pz().mark(p.hint.map(q => [q, 'ring'])); say(p.hintTx || X.hintSay); return; }   // (gomoku: the lesson's own hint points and words)
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
      scored(p, D.points(p.P, u, p), undefined, u);
    }
    // (2026-11-12) a partial or wrong answer names the best move in words too (not only the glowing squares)
    const ANSM = { ja: '正解は盤に印を付けた手です。', en: 'The best move is marked on the board.', zh: '正解已在棋盘上标出。', 'zh-TW': '正解已在棋盤上標出。', ko: '정답은 판에 표시한 수입니다.', es: 'La mejor jugada está marcada en el tablero.', fr: 'Le meilleur coup est marqué sur le plateau.', pt: 'O melhor lance está marcado no tabuleiro.', de: 'Der beste Zug ist auf dem Brett markiert.', ru: 'Лучший ход отмечен на доске.', tr: 'En iyi hamle tahtada işaretli.', id: 'Langkah terbaik ditandai di papan.', hi: 'सबसे अच्छी चाल बोर्ड पर चिह्नित है।', ar: 'أفضل نقلة مُعلَّمة على اللوح.' };
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
      if ((id === 'checkers' || id === 'xiangqi') && typeof u === 'number') {   // (checkers / xiangqi: the lesson's own words, the moves named by their arrows; back to the problem with the right move green, yours red)
        const right = pts >= 16, k = cur.k;
        say(`${right ? line('solved') || pick(X.good) : pts > 0 ? X.partial : X.wrong} <b>${fill(X.pts, { n })}</b>` + (right ? (p.good ? '<br>' + p.good(u) : '') : p.ng ? '<br>' + p.ng(u) : ''));
        try { chime(right); } catch (e) {}
        later(() => { if (!cur || cur.k !== k || phase !== 'prob' || stopped || !pz()) return; pz().undo(1); pz().mark([...(right || p.ans == null ? [] : [[{ m: p.ans }, 'ok']]), [{ m: u }, right ? 'ok' : 'ng']]); }, 900);
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
      if (pts >= 16) say(`${line('solved') || pick(X.good)} <b>${fill(X.pts, { n })}</b>${p.why ? '<br>' + p.why : ''}`);
      else { if (p.ans) pz().mark(p.ans); const nm = p.kind !== 'tsume' && p.ans; say(`${msg || (pts > 0 ? X.partial : X.wrong)} <b>${fill(X.pts, { n })}</b>${nm ? '<br>' + (ANSM[ctx.lang] || ANSM.en) : ''}${p.why ? '<br>' + p.why : ''}`); }   // (the move is shown on the board, not named: no coordinates, 2026-11-14)
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
      if (a && a.matches && a.matches('button:focus-visible,a:focus-visible,[role=button]:focus-visible')) return;
      const b = nextB(); if (!b || b.disabled || !b.getClientRects().length) return;
      e.preventDefault(); e.stopImmediatePropagation(); autoCancel(); b.click();
    };
    document.addEventListener('keydown', onKey, true);
    if ($('[data-a=list]')) $('[data-a=list]').onclick = () => ctx.onList(ctx.kind);   // 一覧 (the portal's list sheet)
    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); act(X.next, { nextOn: false });
    Promise.all([D.load(), ncLoad(id)]).then(() => { if (stopped) return; const go = k => k != null ? open(String(k)) : say(X.endOnly); if (ctx.key != null) go(ctx.key); else next(id, ctx.kind, ctx.lang).then(go); }).catch(() => { if (!stopped) say('⚠'); });
    const dbg = { state: () => cur && { key: cur.key, phase, k: cur.k, si: cur.si, res: cur.res.slice(), ans: cur.probs[cur.k] && cur.probs[cur.k].ans, say: $('.tx').textContent },
      answer: async u => { const p = cur && cur.probs[cur.k]; if (!p || !pz()) return; u = u || p.ans; await pz().play(u); moved(p, u, { mate: false }); } };   // (test hook)
    window.__atlasLs = dbg;
    return {
      stop() { autoCancel(); stopped = true; document.removeEventListener('keydown', onKey, true); if (window.__atlasLs === dbg) delete window.__atlasLs; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el, _debug: dbg,
    };
  }
  window.AtlasLessons = { has: id => !!DATA[id], list, next, start, data: id => DATA[id].load().then(D => D.data) };
})();
