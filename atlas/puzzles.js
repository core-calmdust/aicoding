/* =====================================================================
   Puzzles on the 3D table (2026-11-10) — chess (mates and tactics) and shogi (詰将棋)
   The same problems as the full games (../chess/puzzles.json, ../shogi/tsume.json), played on the portal's
   3D board, with the rules tour's guide character asking for the move and reacting to it. The progress is the
   full game's own (same localStorage keys), so a puzzle solved here is solved there too, and the other way round.
   Simplified judging (the full games use their engines more):
     chess mate in N: the first move must be the stored answer (or mate at once); after it the defender answers
                      with the engine's best move and any line that mates within N counts.
     chess tactics:   the opponent's move is played first, then the stored line is followed; a mate on the way counts.
     shogi 詰将棋:      every move must be a check; the defender answers from the stored line while the player follows
                      it (composed problems), otherwise the engine's tsumeDefend; mating within the count solves it.
   Contract: AtlasPuzzles.has(id) · AtlasPuzzles.start(ctx) → { stop(), panel }
   ctx = { id, Table3D, lang, t, el, panel (DOM host), adapter (Atlas3D[id]), onExit() }
   ===================================================================== */
(function () {
  'use strict';
  const STAGE = 10, UNLOCK = 6;   // shared/pzbook.js: puzzles come in stages of 10; 6 cleared opens the next stage
  const G = {
    chess: { guide: '../images/atlas/g-knight.webp', name: { ja: 'ナイトン', en: 'Knighton', zh: '奈顿', ko: '나이톤', es: 'Caballón', fr: 'Chevalou', pt: 'Cavalinho', de: 'Springolin', hi: 'नाइटन', ar: 'فارسون', ru: 'Найтон', 'zh-TW': '奈頓', id: 'Knighton', tr: 'Knighton' } },
    reversi: { guide: '../images/atlas/g-disc.webp', name: { ja: 'リバガメ', en: 'Flipturtle', zh: '翻翻龟', ko: '리바거북', es: 'Tortugavuelta', fr: 'Tortuflip', pt: 'Tartavira', de: 'Wendekröte', hi: 'पलटकछुआ', ar: 'سلحفاة القلب', ru: 'Перевертуша', 'zh-TW': '翻翻龜', id: 'Kurakura Balik', tr: 'Çevirkaplumbağa' } },
    shogi: { guide: '../images/atlas/g-shogi.webp', name: { ja: 'ショウギツネ', en: 'Shogitsune', zh: '将棋狐', ko: '쇼기여우', es: 'Shogizorro', fr: 'Shogirenard', pt: 'Shogiraposa', de: 'Shogifuchs', hi: 'शोगी लोमड़ी', ar: 'ثعلب الشوغي', ru: 'Сёгицунэ', 'zh-TW': '將棋狐', id: 'Shogitsune', tr: 'Shogitsune' } },
    gomoku: { guide: '../images/atlas/g-stone.webp', name: { ja: 'ゴイシペン', en: 'Stoneguin', zh: '棋石企鹅', ko: '바둑돌펭', es: 'Pingüipiedra', fr: 'Pingopierre', pt: 'Pinguipedra', de: 'Steinguin', hi: 'स्टोनगुइन', ar: 'بطريق الحجر', ru: 'Стоунгвин', 'zh-TW': '棋子企鵝', id: 'Stoneguin', tr: 'Stoneguin' } },
    go: { guide: '../images/atlas/g-stone.webp', name: { ja: 'ゴイシペン', en: 'Stoneguin', zh: '棋石企鹅', ko: '바둑돌펭', es: 'Pingüipiedra', fr: 'Pingopierre', pt: 'Pinguipedra', de: 'Steinguin', hi: 'स्टोनगुइन', ar: 'بطريق الحجر', ru: 'Стоунгвин', 'zh-TW': '棋子企鵝', id: 'Stoneguin', tr: 'Stoneguin' } },
    checkers: { guide: '../images/atlas/g-crab.webp', name: { ja: 'チェッカニ', en: 'Checkrab', zh: '跳棋蟹', ko: '체카니', es: 'Checkrab', fr: 'Checkrab', pt: 'Checkrab', de: 'Checkrab', hi: 'चेकरैब', ar: 'تشيكراب', ru: 'Чекраб', 'zh-TW': '跳棋蟹', id: 'Checkrab', tr: 'Checkrab' } },
    xiangqi: { guide: '../images/atlas/g-shogi.webp', name: { ja: 'ショウギツネ', en: 'Shogitsune', zh: '将棋狐', ko: '쇼기여우', es: 'Shogizorro', fr: 'Shogirenard', pt: 'Shogiraposa', de: 'Shogifuchs', hi: 'शोगी लोमड़ी', ar: 'ثعلب الشوغي', ru: 'Сёгицунэ', 'zh-TW': '將棋狐', id: 'Shogitsune', tr: 'Shogitsune' } },   // (the xiangqi guide is the shogi fox, as atlas/rules/xiangqi.js)
    backgammon: { guide: '../images/atlas/g-dice.webp', name: {"ja":"ダイスン","en":"Dicepup","zh":"骰子汪","ko":"다이슨","es":"Dicepup","fr":"Dicepup","pt":"Dicepup","de":"Dicepup","hi":"डाइसपप","ar":"دايس باب","ru":"Дайспап","zh-TW":"骰子汪","id":"Dicepup","tr":"Dicepup"} },
    peg: { guide: '../images/atlas/av/marble-2.webp', name: { ja: 'ビーユ', en: 'Bille', zh: '比尤', ko: '비유', es: 'Bille', fr: 'Bille', pt: 'Bille', de: 'Bille', hi: 'बिय', ar: 'بيّ', ru: 'Бий', 'zh-TW': '比尤', id: 'Bille', tr: 'Bille' } },
  };
  // the guide's lines ({n}, {c}, {a}, {b}: filled in; arrays: one is picked at random)
  const TX = {
    ja: { hint: 'ヒント', again: 'もう一度', next: 'つぎの問題', setMate: '{n}手メイト', setTac: '戦術 {a}–{b}', white: '白', black: '黒',
      hi: { chess: 'やあ、ナイトンだよ。パズルで腕をみがこう！', shogi: 'こんにちは、ショウギツネです。詰将棋で読みをきたえよう！' },
      goalMate: '{c}の番。<b>{n}手でチェックメイト</b>してみよう！', goalMate1: '{c}の番。<b>1手でチェックメイト</b>できるよ。どこかな？',
      goalTac: '相手がいま指したところ。{c}の番だよ。<b>いちばん得をする手</b>を見つけて！', goalTsume: '<b>{n}手詰め</b>だよ。王手をかけ続けて、玉を詰ませよう！',
      good: ['いいね！', 'その調子！', 'ナイス！'], left: 'あと{n}手。', wrong: 'おっと、その手じゃないみたい。光っているのが正解の手だよ。', wrongNo: 'うーん、届かなかった…',
      notCheck: '詰将棋は<b>ずっと王手</b>をかけ続けるルールなんだ。', escaped: '玉に逃げられちゃった…', out: '{n}手では詰ませられなかった…', retry: '「もう一度」でリベンジしよう！',
      solved: ['やった、正解！', 'おみごと！', 'すごい、ばっちり！'], solvedHelp: 'クリア！ 次はヒントなしでいけるかな？', hintSay: '光っているところに注目してみて。', allDone: '用意した問題はぜんぶクリア！ すごいね！', loading: '問題を準備中…' },
    en: { hint: 'Hint', again: 'Retry', next: 'Next puzzle', setMate: 'Mate in {n}', setTac: 'Tactics {a}–{b}', white: 'White', black: 'Black',
      hi: { chess: 'Hi, Knighton here. Let\'s sharpen your eye with some puzzles!', shogi: 'Hello, I\'m Shogitsune. Let\'s train your reading with tsume!' },
      goalMate: '{c} to move. <b>Checkmate in {n}</b> — can you find it?', goalMate1: '{c} to move. There\'s <b>mate in one</b>. Where is it?',
      goalTac: 'Your opponent just moved. {c} to play — find <b>the move that wins the most</b>!', goalTsume: '<b>Mate in {n}</b>. Keep checking and catch the king!',
      good: ['Nice!', 'Keep going!', 'Good one!'], left: '{n} to go.', wrong: 'Oops, not that one. The glowing move is the answer.', wrongNo: 'Hmm, it didn\'t quite work…',
      notCheck: 'In tsume <b>every move must be a check</b>.', escaped: 'The king got away…', out: 'No mate within {n} moves…', retry: 'Tap "Retry" for a rematch!',
      solved: ['Yes, solved!', 'Brilliant!', 'Spot on!'], solvedHelp: 'Cleared! Next time without a hint?', hintSay: 'Look at the glowing squares.', allDone: 'You\'ve cleared every puzzle here. Amazing!', loading: 'Setting up the puzzle…' },
    zh: { hint: '提示', again: '再试一次', next: '下一题', setMate: '{n}步杀', setTac: '战术 {a}–{b}', white: '白方', black: '黑方',
      hi: { chess: '你好，我是奈顿。用谜题来磨练眼力吧！', shogi: '你好，我是将棋狐。用诘将棋来锻炼计算力吧！' },
      goalMate: '轮到{c}。试着<b>{n}步将杀</b>吧！', goalMate1: '轮到{c}。<b>一步就能将杀</b>，在哪里呢？',
      goalTac: '对手刚走完。轮到{c}，找出<b>收获最大的一着</b>！', goalTsume: '<b>{n}手诘</b>。连续将军，把玉将死吧！',
      good: ['不错！', '保持这样！', '漂亮！'], left: '还剩{n}步。', wrong: '哎呀，不是这一步。发光的就是正解。', wrongNo: '唔，差了一点……',
      notCheck: '诘将棋<b>每一步都必须将军</b>哦。', escaped: '玉逃掉了……', out: '{n}步内没能将死……', retry: '点「再试一次」雪耻吧！',
      solved: ['答对了！', '太棒了！', '完美！'], solvedHelp: '过关！下次不用提示试试？', hintSay: '注意发光的地方。', allDone: '准备的题目全部通关了，真厉害！', loading: '正在准备题目…' },
    ko: { hint: '힌트', again: '다시 하기', next: '다음 문제', setMate: '{n}수 메이트', setTac: '전술 {a}–{b}', white: '백', black: '흑',
      hi: { chess: '안녕, 나이톤이야. 퍼즐로 실력을 갈고닦자!', shogi: '안녕하세요, 쇼기여우예요. 츠메쇼기로 수읽기를 단련해요!' },
      goalMate: '{c} 차례. <b>{n}수 안에 체크메이트</b>해 보자!', goalMate1: '{c} 차례. <b>한 수로 체크메이트</b>할 수 있어. 어디일까?',
      goalTac: '상대가 방금 두었어. {c} 차례야. <b>가장 이득인 수</b>를 찾아봐!', goalTsume: '<b>{n}수 외통</b>이야. 장을 계속 걸어서 왕을 잡자!',
      good: ['좋아!', '그 기세야!', '나이스!'], left: '{n}수 남았어.', wrong: '앗, 그 수가 아니야. 빛나는 게 정답이야.', wrongNo: '음, 아깝게 안 됐어…',
      notCheck: '츠메쇼기는 <b>매 수마다 장</b>을 걸어야 해.', escaped: '왕이 도망쳤어…', out: '{n}수 안에 잡지 못했어…', retry: '「다시 하기」로 설욕하자!',
      solved: ['정답!', '훌륭해!', '완벽해!'], solvedHelp: '클리어! 다음엔 힌트 없이 해 볼까?', hintSay: '빛나는 곳을 잘 봐.', allDone: '준비한 문제를 모두 클리어했어. 대단해!', loading: '문제 준비 중…' },
    es: { hint: 'Pista', again: 'Reintentar', next: 'Siguiente', setMate: 'Mate en {n}', setTac: 'Táctica {a}–{b}', white: 'Blancas', black: 'Negras',
      hi: { chess: '¡Hola, soy Caballón! Afinemos la vista con unos problemas.', shogi: '¡Hola, soy Shogizorro! Entrenemos el cálculo con tsume.' },
      goalMate: 'Juegan {c}. ¿Encuentras el <b>mate en {n}</b>?', goalMate1: 'Juegan {c}. Hay <b>mate en una</b>. ¿Dónde?',
      goalTac: 'Tu rival acaba de mover. Juegan {c}: ¡busca <b>la jugada que más gana</b>!', goalTsume: '<b>Mate en {n}</b>. ¡Da jaque tras jaque y atrapa al rey!',
      good: ['¡Bien!', '¡Sigue así!', '¡Buena!'], left: 'Quedan {n}.', wrong: 'Uy, esa no. La jugada que brilla es la solución.', wrongNo: 'Mmm, no ha salido…',
      notCheck: 'En tsume <b>cada jugada debe ser jaque</b>.', escaped: 'El rey se escapó…', out: 'No hubo mate en {n} jugadas…', retry: '¡Pulsa «Reintentar» para la revancha!',
      solved: ['¡Resuelto!', '¡Brillante!', '¡Perfecto!'], solvedHelp: '¡Superado! ¿La próxima sin pista?', hintSay: 'Fíjate en las casillas que brillan.', allDone: '¡Has resuelto todos los problemas! ¡Increíble!', loading: 'Preparando el problema…' },
    fr: { hint: 'Indice', again: 'Réessayer', next: 'Suivant', setMate: 'Mat en {n}', setTac: 'Tactique {a}–{b}', white: 'Blancs', black: 'Noirs',
      hi: { chess: 'Salut, c\'est Chevalou ! Aiguisons ton regard avec des problèmes.', shogi: 'Bonjour, je suis Shogirenard ! Entraînons le calcul avec des tsume.' },
      goalMate: 'Trait aux {c}. Trouve le <b>mat en {n}</b> !', goalMate1: 'Trait aux {c}. Il y a <b>mat en un</b>. Où ça ?',
      goalTac: 'Ton adversaire vient de jouer. Trait aux {c} : trouve <b>le coup qui gagne le plus</b> !', goalTsume: '<b>Mat en {n}</b>. Enchaîne les échecs et attrape le roi !',
      good: ['Bien !', 'Continue !', 'Joli !'], left: 'Encore {n}.', wrong: 'Oups, pas celui-là. Le coup qui brille est la solution.', wrongNo: 'Hmm, ça n\'a pas marché…',
      notCheck: 'En tsume, <b>chaque coup doit faire échec</b>.', escaped: 'Le roi s\'est échappé…', out: 'Pas de mat en {n} coups…', retry: 'Touche « Réessayer » pour la revanche !',
      solved: ['Résolu !', 'Brillant !', 'Parfait !'], solvedHelp: 'Réussi ! La prochaine fois sans indice ?', hintSay: 'Regarde les cases qui brillent.', allDone: 'Tu as résolu tous les problèmes. Bravo !', loading: 'Préparation du problème…' },
    pt: { hint: 'Dica', again: 'Tentar de novo', next: 'Próximo', setMate: 'Mate em {n}', setTac: 'Tática {a}–{b}', white: 'Brancas', black: 'Pretas',
      hi: { chess: 'Oi, sou o Cavalinho! Vamos treinar o olhar com problemas.', shogi: 'Olá, sou a Shogiraposa! Vamos treinar o cálculo com tsume.' },
      goalMate: 'Vez das {c}. Encontre o <b>mate em {n}</b>!', goalMate1: 'Vez das {c}. Há <b>mate em um</b>. Onde?',
      goalTac: 'O adversário acabou de jogar. Vez das {c}: ache <b>o lance que mais ganha</b>!', goalTsume: '<b>Mate em {n}</b>. Dê xeque atrás de xeque e pegue o rei!',
      good: ['Boa!', 'Continue!', 'Muito bem!'], left: 'Faltam {n}.', wrong: 'Ops, não é esse. O lance que brilha é a resposta.', wrongNo: 'Hmm, não deu certo…',
      notCheck: 'No tsume <b>todo lance precisa ser xeque</b>.', escaped: 'O rei escapou…', out: 'Sem mate em {n} lances…', retry: 'Toque em «Tentar de novo» para a revanche!',
      solved: ['Resolvido!', 'Brilhante!', 'Perfeito!'], solvedHelp: 'Passou! Da próxima vez sem dica?', hintSay: 'Olhe as casas que brilham.', allDone: 'Você resolveu todos os problemas. Incrível!', loading: 'Preparando o problema…' },
    de: { hint: 'Tipp', again: 'Nochmal', next: 'Nächste', setMate: 'Matt in {n}', setTac: 'Taktik {a}–{b}', white: 'Weiß', black: 'Schwarz',
      hi: { chess: 'Hallo, ich bin Springolin! Schärfen wir deinen Blick mit Aufgaben.', shogi: 'Hallo, ich bin Shogifuchs! Trainieren wir das Rechnen mit Tsume.' },
      goalMate: '{c} am Zug. Finde das <b>Matt in {n}</b>!', goalMate1: '{c} am Zug. Es gibt ein <b>Matt in eins</b>. Wo?',
      goalTac: 'Dein Gegner hat gerade gezogen. {c} am Zug – finde <b>den Zug, der am meisten gewinnt</b>!', goalTsume: '<b>Matt in {n}</b>. Schach um Schach – fang den König!',
      good: ['Gut!', 'Weiter so!', 'Stark!'], left: 'Noch {n}.', wrong: 'Hoppla, der nicht. Der leuchtende Zug ist die Lösung.', wrongNo: 'Hm, das hat nicht geklappt…',
      notCheck: 'Beim Tsume <b>muss jeder Zug Schach geben</b>.', escaped: 'Der König ist entwischt…', out: 'Kein Matt in {n} Zügen…', retry: 'Tippe auf „Nochmal“ zur Revanche!',
      solved: ['Gelöst!', 'Brillant!', 'Volltreffer!'], solvedHelp: 'Geschafft! Nächstes Mal ohne Tipp?', hintSay: 'Schau auf die leuchtenden Felder.', allDone: 'Du hast alle Aufgaben gelöst. Super!', loading: 'Aufgabe wird vorbereitet…' },
    hi: { hint: 'संकेत', again: 'फिर से', next: 'अगली पहेली', setMate: '{n} में मात', setTac: 'चाल {a}–{b}', white: 'सफ़ेद', black: 'काला',
      hi: { chess: 'नमस्ते, मैं नाइटन! पहेलियों से नज़र तेज़ करें।', shogi: 'नमस्ते, मैं शोगी लोमड़ी! त्सुमे से गणना की ताकत बढ़ाएँ।' },
      goalMate: '{c} की बारी। <b>{n} चालों में मात</b> ढूँढो!', goalMate1: '{c} की बारी। <b>एक चाल में मात</b> है। कहाँ?',
      goalTac: 'विरोधी ने अभी चाल चली। {c} की बारी — <b>सबसे फ़ायदे वाली चाल</b> ढूँढो!', goalTsume: '<b>{n} में मात</b>। शह पर शह देकर राजा को पकड़ो!',
      good: ['बढ़िया!', 'ऐसे ही!', 'शानदार!'], left: 'अभी {n} बाकी।', wrong: 'अरे, यह नहीं। चमकती चाल सही जवाब है।', wrongNo: 'हम्म, बात नहीं बनी…',
      notCheck: 'त्सुमे में <b>हर चाल शह होनी चाहिए</b>।', escaped: 'राजा बच निकला…', out: '{n} चालों में मात नहीं हुई…', retry: 'बदला लेने के लिए "फिर से" दबाओ!',
      solved: ['सही जवाब!', 'कमाल!', 'बिल्कुल सही!'], solvedHelp: 'पार! अगली बार बिना संकेत?', hintSay: 'चमकती जगहों को देखो।', allDone: 'तुमने सारी पहेलियाँ हल कर लीं। वाह!', loading: 'पहेली तैयार हो रही है…' },
    ar: { hint: 'تلميح', again: 'أعد المحاولة', next: 'اللغز التالي', setMate: 'مات في {n}', setTac: 'تكتيك {a}–{b}', white: 'الأبيض', black: 'الأسود',
      hi: { chess: 'مرحبًا، أنا فارسون! لنشحذ نظرك بالألغاز.', shogi: 'مرحبًا، أنا ثعلب الشوغي! لندرّب الحساب بالتسومي.' },
      goalMate: 'دور {c}. جد <b>المات في {n}</b>!', goalMate1: 'دور {c}. هناك <b>مات في نقلة</b>. أين؟',
      goalTac: 'لعب خصمك للتو. دور {c} — جد <b>النقلة الأكثر كسبًا</b>!', goalTsume: '<b>مات في {n}</b>. كِش بعد كِش وأمسك الملك!',
      good: ['أحسنت!', 'استمر!', 'رائع!'], left: 'بقي {n}.', wrong: 'عفوًا، ليست هذه. النقلة المضيئة هي الحل.', wrongNo: 'همم، لم تنجح…',
      notCheck: 'في التسومي <b>كل نقلة يجب أن تكون كِشًّا</b>.', escaped: 'هرب الملك…', out: 'لا مات خلال {n} نقلات…', retry: 'اضغط «أعد المحاولة» للثأر!',
      solved: ['أصبت!', 'مذهل!', 'تمامًا!'], solvedHelp: 'نجحت! هل تحاول المرة القادمة بلا تلميح؟', hintSay: 'انظر إلى المربعات المضيئة.', allDone: 'حللت كل الألغاز هنا. رائع!', loading: 'جارٍ تجهيز اللغز…' },
    ru: { hint: 'Подсказка', again: 'Ещё раз', next: 'Следующая', setMate: 'Мат в {n}', setTac: 'Тактика {a}–{b}', white: 'Белые', black: 'Чёрные',
      hi: { chess: 'Привет, я Найтон! Потренируем глаз на задачах.', shogi: 'Привет, я Сёгицунэ! Потренируем расчёт на цумэ.' },
      goalMate: 'Ход: {c}. Найди <b>мат в {n}</b>!', goalMate1: 'Ход: {c}. Есть <b>мат в один ход</b>. Где?',
      goalTac: 'Соперник только что сходил. Ход: {c} — найди <b>самый выгодный ход</b>!', goalTsume: '<b>Мат в {n}</b>. Шах за шахом — поймай короля!',
      good: ['Отлично!', 'Так держать!', 'Здорово!'], left: 'Осталось {n}.', wrong: 'Ой, не этот. Светящийся ход — решение.', wrongNo: 'Хм, не получилось…',
      notCheck: 'В цумэ <b>каждый ход должен быть шахом</b>.', escaped: 'Король ускользнул…', out: 'За {n} ходов мата нет…', retry: 'Нажми «Ещё раз», чтобы отыграться!',
      solved: ['Решено!', 'Блестяще!', 'В точку!'], solvedHelp: 'Пройдено! В следующий раз без подсказки?', hintSay: 'Посмотри на светящиеся поля.', allDone: 'Ты решил все задачи. Потрясающе!', loading: 'Готовим задачу…' },
    'zh-TW': { hint: '提示', again: '再試一次', next: '下一題', setMate: '{n}步殺', setTac: '戰術 {a}–{b}', white: '白方', black: '黑方',
      hi: { chess: '你好，我是奈頓。用謎題來磨練眼力吧！', shogi: '你好，我是將棋狐。用詰將棋來鍛鍊計算力吧！' },
      goalMate: '輪到{c}。試著<b>{n}步將死</b>吧！', goalMate1: '輪到{c}。<b>一步就能將死</b>，在哪裡呢？',
      goalTac: '對手剛走完。輪到{c}，找出<b>收穫最大的一著</b>！', goalTsume: '<b>{n}手詰</b>。連續將軍，把玉將死吧！',
      good: ['不錯！', '保持下去！', '漂亮！'], left: '還剩{n}步。', wrong: '哎呀，不是這一步。發光的就是正解。', wrongNo: '唔，差了一點……',
      notCheck: '詰將棋<b>每一步都必須將軍</b>喔。', escaped: '玉逃走了……', out: '{n}步內沒能將死……', retry: '點「再試一次」雪恥吧！',
      solved: ['答對了！', '太棒了！', '完美！'], solvedHelp: '過關！下次不用提示試試？', hintSay: '注意發光的地方。', allDone: '準備的題目全部通關了，真厲害！', loading: '正在準備題目…' },
    id: { hint: 'Petunjuk', again: 'Ulangi', next: 'Soal berikutnya', setMate: 'Mat dalam {n}', setTac: 'Taktik {a}–{b}', white: 'Putih', black: 'Hitam',
      hi: { chess: 'Hai, aku Knighton! Ayo asah mata dengan teka-teki.', shogi: 'Halo, aku Shogitsune! Ayo latih hitungan dengan tsume.' },
      goalMate: 'Giliran {c}. Temukan <b>mat dalam {n}</b>!', goalMate1: 'Giliran {c}. Ada <b>mat dalam satu</b>. Di mana?',
      goalTac: 'Lawan baru saja melangkah. Giliran {c} — cari <b>langkah yang paling untung</b>!', goalTsume: '<b>Mat dalam {n}</b>. Skak terus dan tangkap rajanya!',
      good: ['Bagus!', 'Terus!', 'Mantap!'], left: 'Tinggal {n}.', wrong: 'Ups, bukan yang itu. Langkah yang menyala adalah jawabannya.', wrongNo: 'Hmm, belum berhasil…',
      notCheck: 'Dalam tsume <b>setiap langkah harus skak</b>.', escaped: 'Rajanya lolos…', out: 'Tidak mat dalam {n} langkah…', retry: 'Ketuk "Ulangi" untuk balas dendam!',
      solved: ['Benar!', 'Hebat!', 'Tepat sekali!'], solvedHelp: 'Lulus! Lain kali tanpa petunjuk?', hintSay: 'Lihat kotak yang menyala.', allDone: 'Semua soal di sini sudah selesai. Luar biasa!', loading: 'Menyiapkan soal…' },
    tr: { hint: 'İpucu', again: 'Tekrar', next: 'Sonraki', setMate: '{n} hamlede mat', setTac: 'Taktik {a}–{b}', white: 'Beyaz', black: 'Siyah',
      hi: { chess: 'Merhaba, ben Knighton! Bulmacalarla gözünü keskinleştirelim.', shogi: 'Merhaba, ben Shogitsune! Tsume ile hesaplamayı çalıştıralım.' },
      goalMate: 'Sıra {c} tarafta. <b>{n} hamlede mat</b>ı bul!', goalMate1: 'Sıra {c} tarafta. <b>Tek hamlede mat</b> var. Nerede?',
      goalTac: 'Rakip az önce oynadı. Sıra {c} tarafta — <b>en çok kazandıran hamleyi</b> bul!', goalTsume: '<b>{n} hamlede mat</b>. Şah üstüne şah çek, şahı yakala!',
      good: ['Güzel!', 'Devam!', 'Harika!'], left: '{n} kaldı.', wrong: 'Hoppala, o değil. Parlayan hamle cevap.', wrongNo: 'Hmm, olmadı…',
      notCheck: 'Tsume\'de <b>her hamle şah olmalı</b>.', escaped: 'Şah kaçtı…', out: '{n} hamlede mat yok…', retry: 'Rövanş için "Tekrar"a dokun!',
      solved: ['Çözdün!', 'Muhteşem!', 'Tam isabet!'], solvedHelp: 'Geçtin! Bir dahakine ipucusuz?', hintSay: 'Parlayan karelere bak.', allDone: 'Buradaki tüm bulmacaları çözdün. Harika!', loading: 'Bulmaca hazırlanıyor…' },
  };
  // reversi (2026-11-11): the goal (win / by N discs / wipe-out / at least a draw, played out to the end against the best defence)
  const RV = {
    ja: { hi: 'リバガメだよ。終盤の読み切りパズルに挑戦しよう！', gWin: '{c}の番。最後まで打って<b>勝って</b>みよう！', gMargin: '{c}の番。<b>{n}石差以上</b>で勝とう！', gWipe: '{c}の番。相手の石を<b>全滅</b>させよう！', gDraw: '{c}の番。<b>引き分け以上</b>にしよう！', miss: '{m}だと目標に届かないみたい。最善は{b}だよ。', empties: '空きマスはあと{n}。' },
    en: { hi: 'Flipturtle here! Let\'s read endgames out to the last disc.', gWin: '{c} to move. Play it out and <b>win</b>!', gMargin: '{c} to move. Win by <b>{n} discs or more</b>!', gWipe: '{c} to move. <b>Wipe out</b> every opposing disc!', gDraw: '{c} to move. Get <b>at least a draw</b>!', miss: '{m} can\'t reach the goal. The best was {b}.', empties: '{n} empty squares left.' },
    zh: { hi: '我是翻翻龟！来挑战算清终盘的谜题吧！', gWin: '轮到{c}。下到最后<b>赢下来</b>吧！', gMargin: '轮到{c}。以<b>{n}子以上</b>的差距获胜！', gWipe: '轮到{c}。把对方的子<b>全部吃光</b>！', gDraw: '轮到{c}。至少下成<b>和棋</b>！', miss: '下{m}好像达不到目标。最佳是{b}。', empties: '还剩{n}个空格。' },
    'zh-TW': { hi: '我是翻翻龜！來挑戰算清終盤的謎題吧！', gWin: '輪到{c}。下到最後<b>贏下來</b>吧！', gMargin: '輪到{c}。以<b>{n}子以上</b>的差距獲勝！', gWipe: '輪到{c}。把對方的子<b>全部吃光</b>！', gDraw: '輪到{c}。至少下成<b>和棋</b>！', miss: '下{m}好像達不到目標。最佳是{b}。', empties: '還剩{n}個空格。' },
    ko: { hi: '리바거북이야! 종반을 끝까지 읽는 퍼즐에 도전하자!', gWin: '{c} 차례. 끝까지 두어 <b>이겨</b> 보자!', gMargin: '{c} 차례. <b>{n}개 차 이상</b>으로 이기자!', gWipe: '{c} 차례. 상대 돌을 <b>전멸</b>시키자!', gDraw: '{c} 차례. <b>무승부 이상</b>을 만들자!', miss: '{m}(으)로는 목표에 닿지 않아. 최선은 {b}야.', empties: '빈칸이 {n}개 남았어.' },
    es: { hi: '¡Soy Tortugavuelta! Vamos a leer finales hasta la última ficha.', gWin: 'Juegan {c}. ¡Juega hasta el final y <b>gana</b>!', gMargin: 'Juegan {c}. ¡Gana por <b>{n} fichas o más</b>!', gWipe: 'Juegan {c}. ¡<b>Elimina</b> todas las fichas rivales!', gDraw: 'Juegan {c}. ¡Consigue <b>al menos tablas</b>!', miss: 'Con {m} no se llega al objetivo. Lo mejor era {b}.', empties: 'Quedan {n} casillas vacías.' },
    fr: { hi: 'Ici Tortuflip ! Lisons les finales jusqu\'au dernier pion.', gWin: 'Aux {c}. Jouez jusqu\'au bout et <b>gagnez</b> !', gMargin: 'Aux {c}. Gagnez de <b>{n} pions ou plus</b> !', gWipe: 'Aux {c}. <b>Éliminez</b> tous les pions adverses !', gDraw: 'Aux {c}. Obtenez <b>au moins la nulle</b> !', miss: '{m} n\'atteint pas l\'objectif. Le meilleur était {b}.', empties: 'Encore {n} cases vides.' },
    pt: { hi: 'Sou a Tartavira! Vamos ler finais até a última peça.', gWin: 'Jogam as {c}. Jogue até o fim e <b>vença</b>!', gMargin: 'Jogam as {c}. Vença por <b>{n} peças ou mais</b>!', gWipe: 'Jogam as {c}. <b>Elimine</b> todas as peças do rival!', gDraw: 'Jogam as {c}. Consiga <b>pelo menos um empate</b>!', miss: 'Com {m} não dá para chegar ao objetivo. O melhor era {b}.', empties: 'Faltam {n} casas vazias.' },
    de: { hi: 'Hier ist Wendekröte! Rechnen wir Endspiele bis zum letzten Stein.', gWin: '{c} am Zug. Spiel bis zum Ende und <b>gewinne</b>!', gMargin: '{c} am Zug. Gewinne mit <b>{n} Steinen oder mehr</b>!', gWipe: '{c} am Zug. <b>Räume</b> alle gegnerischen Steine ab!', gDraw: '{c} am Zug. Hol <b>mindestens ein Remis</b>!', miss: 'Mit {m} ist das Ziel nicht erreichbar. Am besten war {b}.', empties: 'Noch {n} leere Felder.' },
    hi: { hi: 'मैं पलटकछुआ हूँ! आओ, अंत के खेल को आख़िरी गोटी तक पढ़ें।', gWin: '{c} की बारी। अंत तक खेलकर <b>जीतो</b>!', gMargin: '{c} की बारी। <b>{n} गोटियों या ज़्यादा</b> के अंतर से जीतो!', gWipe: '{c} की बारी। विरोधी की सारी गोटियाँ <b>ख़त्म</b> करो!', gDraw: '{c} की बारी। <b>कम से कम ड्रॉ</b> करो!', miss: '{m} से लक्ष्य तक नहीं पहुँचा जा सकता। सबसे अच्छी चाल {b} थी।', empties: 'अभी {n} ख़ाली खाने बचे हैं।' },
    ar: { hi: 'أنا سلحفاة القلب! لنقرأ النهايات حتى آخر قطعة.', gWin: 'دور {c}. العب حتى النهاية <b>واربح</b>!', gMargin: 'دور {c}. اربح بفارق <b>{n} قطعة أو أكثر</b>!', gWipe: 'دور {c}. <b>امحُ</b> كل قطع الخصم!', gDraw: 'دور {c}. احصل على <b>التعادل على الأقل</b>!', miss: 'لا يمكن بلوغ الهدف بـ{m}. الأفضل كان {b}.', empties: 'بقي {n} مربعات فارغة.' },
    ru: { hi: 'Я Перевертуша! Давайте просчитывать эндшпили до последней фишки.', gWin: 'Ход: {c}. Доиграйте до конца и <b>победите</b>!', gMargin: 'Ход: {c}. Выиграйте с перевесом <b>в {n} фишек и больше</b>!', gWipe: 'Ход: {c}. <b>Уничтожьте</b> все фишки соперника!', gDraw: 'Ход: {c}. Добейтесь <b>хотя бы ничьей</b>!', miss: 'Ходом {m} цели не достичь. Лучшим был {b}.', empties: 'Пустых клеток: {n}.' },
    id: { hi: 'Aku Kurakura Balik! Ayo hitung akhir permainan sampai keping terakhir.', gWin: 'Giliran {c}. Mainkan sampai akhir dan <b>menang</b>!', gMargin: 'Giliran {c}. Menang dengan selisih <b>{n} keping atau lebih</b>!', gWipe: 'Giliran {c}. <b>Habiskan</b> semua keping lawan!', gDraw: 'Giliran {c}. Dapatkan <b>minimal seri</b>!', miss: 'Dengan {m} target tak tercapai. Terbaik adalah {b}.', empties: 'Sisa {n} petak kosong.' },
    tr: { hi: 'Ben Çevirkaplumbağa! Oyun sonlarını son taşa kadar hesaplayalım.', gWin: 'Sıra {c} tarafında. Sonuna kadar oyna ve <b>kazan</b>!', gMargin: 'Sıra {c} tarafında. <b>{n} taş ya da daha fazla</b> farkla kazan!', gWipe: 'Sıra {c} tarafında. Rakibin tüm taşlarını <b>sil</b>!', gDraw: 'Sıra {c} tarafında. <b>En az beraberlik</b> al!', miss: '{m} ile hedefe ulaşılamıyor. En iyisi {b} idi.', empties: '{n} boş kare kaldı.' },
  };
  for (const l in TX) { const r = RV[l] || RV.en; TX[l].hi.reversi = r.hi; TX[l].rv = r; }
  const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : '');
  const pick = a => Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a;
  const store = { get(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {} }, raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };

  /* ---------- PZBook (shared/pzbook.js): stages, what is open, what comes next ---------- */
  function stageOpen(recs, j) {
    const s = Math.floor(j / STAGE); if (!s) return true;
    const a = (s - 1) * STAGE, b = Math.min(recs.length, a + STAGE);
    return recs.slice(a, b).filter(x => x > 0).length >= Math.min(UNLOCK, b - a);
  }
  function nextIndex(recs) { for (let j = 0; j < recs.length; j++) { if (!stageOpen(recs, j)) return -1; if (!recs[j]) return j; } return -1; }
  // continue: the set played last, else the first set with something left (same category first)
  function resume(list, last) {
    const L = list.find(x => String(x.key) === String(last));
    if (L && nextIndex(L.recs) >= 0) return { key: L.key, j: nextIndex(L.recs) };
    const cat = L ? L.cat : list.length ? list[0].cat : null;
    for (const x of list.filter(x => x.cat === cat).concat(list.filter(x => x.cat !== cat))) { const j = nextIndex(x.recs); if (j >= 0) return { key: x.key, j }; }
    return null;
  }

  /* ---------- small boards for the lists (2026-11-13): chess from a FEN (the portal's lesson / puzzle cards) ---------- */
  window.AtlasMini = window.AtlasMini || {};
  window.AtlasMini.chess = fen => {
    const rows = String(fen || '').split(' ')[0].split('/'); if (rows.length !== 8) return '';
    const G = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="5" fill="#7a4a24"/>';
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) o += `<rect x="${2 + f * 10}" y="${2 + r * 10}" width="10" height="10" fill="${(r + f) & 1 ? '#b58863' : '#f0d9b5'}"/>`;
    rows.forEach((row, r) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) { f += +ch; continue; } const w = ch === ch.toUpperCase(), g = G[ch.toLowerCase()];
      if (g) o += `<text x="${7 + f * 10}" y="${10.6 + r * 10}" font-size="9.6" text-anchor="middle" font-family="'Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans',serif" fill="${w ? '#fffaf0' : '#1c1a17'}" stroke="${w ? '#3a2a1a' : '#000'}" stroke-width="${w ? .55 : .2}" paint-order="stroke">${g}\uFE0E</text>`; f++; } });
    return o + '</svg>';
  };
  // gomoku (2026-11-13): the stones of a puzzle / lesson ('h8 i9 …' for black and white) on a small 15×15 board, cropped round them
  window.AtlasMini.gomoku = (b, w) => {
    const sq = s => { const c = s.charCodeAt(0) - 97, r = +s.slice(1) - 1; return c >= 0 && c < 15 && r >= 0 && r < 15 ? [c, r] : null; };
    const B = String(b || '').split(/\s+/).map(sq).filter(Boolean), W = String(w || '').split(/\s+/).map(sq).filter(Boolean), all = B.concat(W);
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#dcb26a"/>';
    if (!all.length) return o + '</svg>';
    const x0 = Math.min(...all.map(q => q[0])), x1 = Math.max(...all.map(q => q[0])), y0 = Math.min(...all.map(q => q[1])), y1 = Math.max(...all.map(q => q[1]));
    const span = Math.max(6, x1 - x0 + 3, y1 - y0 + 3), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, k = 80 / span, X = c => 42 + (c - cx) * k, Y = r => 42 - (r - cy) * k;
    for (let i = 0; i < 15; i++) { if (Math.abs(i - cx) * k < 44) o += `<path d="M${X(i).toFixed(1)} 0V84" stroke="#7a5428" stroke-width=".6" opacity=".7"/>`; if (Math.abs(i - cy) * k < 44) o += `<path d="M0 ${Y(i).toFixed(1)}H84" stroke="#7a5428" stroke-width=".6" opacity=".7"/>`; }
    const st = (q, bl) => `<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="${(k * .45).toFixed(1)}" fill="${bl ? '#1d1f26' : '#fbf7ec'}"${bl ? '' : ' stroke="#9a917c" stroke-width=".6"'}/>`;
    B.forEach(q => { o += st(q, 1); }); W.forEach(q => { o += st(q, 0); });
    return o + '</svg>';
  };
  // go (2026-11-13): a position { n, stones: '.bw…' (row 0 at the top) } on a small board, cropped to view [x0, y0, x1, y1] when given
  const GO_COLS = 'ABCDEFGHJKLMNOPQRST';
  window.AtlasMini.goSpec = o => {
    if (!o) return { n: 9, stones: '' }; if (o.stones) return o;
    const N = o.n || 19, a = Array(N * N).fill('.'), pc = q => { q = String(q).toUpperCase(); const x = GO_COLS.indexOf(q[0]), y = N - parseInt(q.slice(1), 10); return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : -1; };
    for (const q of o.ab || []) { const i = pc(q); if (i >= 0) a[i] = 'b'; } for (const q of o.aw || []) { const i = pc(q); if (i >= 0) a[i] = 'w'; }
    return { n: N, stones: a.join(''), turn: o.turn || 1 };
  };
  window.AtlasMini.go = (spec, view) => {
    const sp = window.AtlasMini.goSpec(spec), N = sp.n || 9, S = sp.stones || '', v = view || [0, 0, N - 1, N - 1];
    const w = v[2] - v[0] + 1, h = v[3] - v[1] + 1, k = 80 / Math.max(w, h), ox = 42 - (w - 1) * k / 2, oy = 42 - (h - 1) * k / 2, X = i => ox + (i - v[0]) * k, Y = j => oy + (j - v[1]) * k;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#dcb26a"/>';
    for (let i = v[0]; i <= v[2]; i++) o += `<path d="M${X(i).toFixed(1)} ${(v[1] === 0 ? Y(0) : 0).toFixed(1)}V${(v[3] === N - 1 ? Y(N - 1) : 84).toFixed(1)}" stroke="#6b4a24" stroke-width=".6"/>`;
    for (let j = v[1]; j <= v[3]; j++) o += `<path d="M${(v[0] === 0 ? X(0) : 0).toFixed(1)} ${Y(j).toFixed(1)}H${(v[2] === N - 1 ? X(N - 1) : 84).toFixed(1)}" stroke="#6b4a24" stroke-width=".6"/>`;
    for (let j = v[1]; j <= v[3]; j++) for (let i = v[0]; i <= v[2]; i++) { const ch = S[j * N + i]; if (ch === 'b' || ch === 'w') o += `<circle cx="${X(i).toFixed(1)}" cy="${Y(j).toFixed(1)}" r="${(k * .46).toFixed(1)}" fill="${ch === 'b' ? '#1d1f26' : '#fbf7ec'}"${ch === 'b' ? '' : ' stroke="#9a917c" stroke-width=".6"'}/>`; }
    return o + '</svg>';
  };
  // checkers (2026-11-14): a position { b: 32 chars '.bBwW', side } on a small 8×8 board, the side to move at the bottom (checkers/app.js miniSVG)
  window.AtlasMini.checkers = spec => {
    const b = spec && spec.b ? String(spec.b) : '', fl = !spec || spec.side !== 2;   // (Black to move: Black's rows at the bottom)
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="5" fill="#1a1410"/>';
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) o += `<rect x="${2 + c * 10}" y="${2 + r * 10}" width="10" height="10" fill="${(r + c) & 1 ? '#8a5a3a' : '#efe1c0'}"/>`;
    for (let i = 0; i < 32; i++) {
      const ch = b[i]; if (!ch || ch === '.') continue;
      let r = i >> 2, c = (r & 1) ? 2 * (i & 3) : 2 * (i & 3) + 1; if (fl) { r = 7 - r; c = 7 - c; }
      const x = 7 + c * 10, y = 7 + r * 10, bl = ch === 'b' || ch === 'B';
      o += `<circle cx="${x}" cy="${y}" r="4.1" fill="${bl ? '#1c1816' : '#fbf6ea'}" stroke="${bl ? '#000' : '#6f6250'}" stroke-width=".8"/>`;
      if (ch === 'B' || ch === 'W') o += `<path d="M${x - 2.4} ${y + 1.4}l.5-3 1.3 1.2.6-1.8.6 1.8 1.3-1.2.5 3z" fill="#f2c94c" stroke="#7a5a1c" stroke-width=".35"/>`;
    }
    return o + '</svg>';
  };
  // peg solitaire (2026-11-13): 'board:pegs:goal' (peg/puzzles.json b · p · t) on the board's own hole layout (PegEngine)
  // xiangqi (2026-11-14): a FEN on a small 9×10 board, the side to move at the bottom (pieces: the colour and one character)
  const XQG = { r: { k: '帥', a: '仕', b: '相', e: '相', n: '傌', h: '傌', r: '俥', c: '炮', p: '兵' }, b: { k: '將', a: '士', b: '象', e: '象', n: '馬', h: '馬', r: '車', c: '砲', p: '卒' } };
  window.AtlasMini.xiangqi = fen => {
    const [bd, tm] = String(fen || '').split(' '), rows = (bd || '').split('/'); if (rows.length !== 10) return '';
    const fl = tm === 'b', k = 8.6, X = c => 7 + (fl ? 8 - c : c) * k, Y = r => 7 + (fl ? 9 - r : r) * k;
    let o = `<svg viewBox="0 0 84.8 91.4" aria-hidden="true"><rect width="84.8" height="91.4" rx="5" fill="#f1d9a6"/><g stroke="#8a5a2a" stroke-width=".6">`;
    for (let r = 0; r < 10; r++) o += `<line x1="7" y1="${(7 + r * k).toFixed(1)}" x2="${(7 + 8 * k).toFixed(1)}" y2="${(7 + r * k).toFixed(1)}"/>`;
    for (let c = 0; c < 9; c++) { const x = (7 + c * k).toFixed(1); if (c === 0 || c === 8) o += `<line x1="${x}" y1="7" x2="${x}" y2="${(7 + 9 * k).toFixed(1)}"/>`; else o += `<line x1="${x}" y1="7" x2="${x}" y2="${(7 + 4 * k).toFixed(1)}"/><line x1="${x}" y1="${(7 + 5 * k).toFixed(1)}" x2="${x}" y2="${(7 + 9 * k).toFixed(1)}"/>`; }
    o += '</g>';
    rows.forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) { c += +ch; continue; } const red = ch === ch.toUpperCase(), g = XQG[red ? 'r' : 'b'][ch.toLowerCase()] || '';
      o += `<circle cx="${X(c).toFixed(1)}" cy="${Y(r).toFixed(1)}" r="3.9" fill="#fbf3e2" stroke="${red ? '#c0392b' : '#222'}" stroke-width=".8"/><text x="${X(c).toFixed(1)}" y="${(Y(r) + 2).toFixed(1)}" font-size="5.2" text-anchor="middle" fill="${red ? '#c0392b' : '#222'}" font-weight="700">${g}</text>`; c++; } });
    return o + '</svg>';
  };
  window.AtlasMini.peg = cells => {
    const E = window.PegEngine, [b, p, t] = String(cells || '').split(':'), B = E && E.BOARDS[b]; if (!B) return '';
    const xs = B.pos.map(q => q[0]), ys = B.pos.map(q => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true">', K, ox, oy;
    if (B.tri) {   // a triangular plate: the same rim all round (an inset of the outline), the holes spread over its face (2026-11-13)
      const T = [[42, 6], [80, 72], [4, 72]], I = [42, 50], ins = (q, f) => q.map(([x, y]) => [I[0] + (x - I[0]) * f, I[1] + (y - I[1]) * f]), pth = q => 'M' + q.map(v => v.map(n => n.toFixed(1)).join(' ')).join('L') + 'Z';
      o += `<path d="${pth(T)}" fill="#8f5a36" stroke="#8f5a36" stroke-width="6" stroke-linejoin="round"/><path d="${pth(ins(T, .84))}" fill="#a86c40" stroke="#5a321a" stroke-width="1" stroke-linejoin="round"/>`;
      K = 62 * .84 * .8 / w; ox = I[0] - w * K / 2; oy = I[1] + (h * K) / 3 - h * K;   // (the holes' triangle on the plate's centre)
    } else {
      const S = Math.max(w, h) + 1; K = 76 / S; ox = 42 - w * K / 2; oy = 42 - h * K / 2;
      o += `<circle cx="42" cy="42" r="41" fill="#8f5a36"/><circle cx="42" cy="42" r="37.5" fill="#a86c40" stroke="#5a321a" stroke-width="1"/>`;
    }
    B.pos.forEach(([x, y], i) => { const cx = (ox + (x - x0) * K).toFixed(1), cy = (oy + (y - y0) * K).toFixed(1);
      o += `<circle cx="${cx}" cy="${cy}" r="${(K * .3).toFixed(1)}" fill="#3a1e0e"/>` + (p[i] === '1' ? `<circle cx="${cx}" cy="${cy}" r="${(K * .36).toFixed(1)}" fill="#e2493f" stroke="#7a1a12" stroke-width=".5"/>` : '') + (+t === i ? `<circle cx="${cx}" cy="${cy}" r="${(K * .44).toFixed(1)}" fill="none" stroke="#ffd36b" stroke-width="1.2"/>` : ''); });
    return o + '</svg>';
  };
  /* ---------- the two collections: problems, records ---------- */
  const BOOK = {
    chess: {
      // chess/app.js: PZ_STORE 'aicoding-chess-puzzles' { "L-j": stars } (old saves: true = ★3), PZ_LAST, PUZZLES.old["L-j"] (pzSlot)
      url: '../chess/puzzles.json?v=20261021f', KEY: 'aicoding-chess-puzzles', LAST: 'aicoding-chess-pz-last', data: null,
      sv: x => x === true ? 3 : (+x || 0),
      slot(i, j, pr) { const D = this.data, k = i + '-' + j, o = D.old && D.old[k]; if (!o) return { P: D.levels[i].puzzles[j], rk: k }; return pr[k] != null ? { P: o, rk: k } : { P: D.levels[i].puzzles[j], rk: k + '~2' }; },
      recs(i, pr) { return this.data.levels[i].puzzles.map((_, j) => this.sv(pr[this.slot(i, j, pr).rk])); },
      sets() { const pr = store.get(this.KEY, {}); return this.data.levels.map((L, i) => ({ key: i, recs: this.recs(i, pr), cat: L.kind === 'line' ? 'tac' : 'mate' })); },
      problem(i, j, X) {
        const pr = store.get(this.KEY, {}), L = this.data.levels[i], { P, rk } = this.slot(i, j, pr);
        const tac = !!P.line, fen = P.fen, toMove = fen.split(' ')[1] === 'b' ? 1 : 0;
        return { i, j, rk, P, fen, kind: tac ? 'tac' : 'mate', n: tac ? P.line.length >> 1 : L.n || 1, me: tac ? toMove ^ 1 : toMove, count: L.puzzles.length,
          set: tac ? fill(X.setTac, { a: L.band ? L.band[0] : '', b: L.band ? L.band[1] : '' }) : fill(X.setMate, { n: L.n || 1 }) };
      },
      save(p, stars) { const pr = store.get(this.KEY, {}); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); store.set(this.LAST, String(p.i)); },
      look(i) { const L = this.data.levels[i], p0 = L && L.puzzles[0]; return { board: p0 && p0.fen ? 'fen:' + p0.fen : '' }; },
    },
    shogi: {
      // shogi/index.html: problems sorted by d; stars per problem id in 'shogi-kaya-tsume-v2' (v1: solved → ★3); replaced
      // problems: set.old[newId], pinned per slot in 'shogi-kaya-tsume-pin' (tsPick / tsPin); TS_LAST = the set index
      url: '../shogi/tsume.json?v=20261107l14', KEY: 'shogi-kaya-tsume-v2', V1: 'shogi-kaya-tsume-v1', PIN: 'shogi-kaya-tsume-pin', LAST: 'shogi-kaya-tsume-last', data: null,
      prep(d) { for (const g of d.sets) { g.problems = g.problems.map((p, i) => [p, i]).sort((a, b) => ((a[0].d || 0) - (b[0].d || 0)) || a[1] - b[1]).map(x => x[0]); if (g.old) g.base = g.problems; } return d; },
      stars() { let s = store.get(this.KEY, null); if (!s) { s = {}; const v1 = store.get(this.V1, {}); for (const id in v1) if (v1[id]) s[id] = 3; } return s; },
      list(g, st) { if (!g.base) return g.problems; const pin = store.get(this.PIN, {}); return g.base.map(p => { const o = g.old[p.id]; if (!o) return p; const v = pin[g.id + ':' + p.id]; return v === 'o' ? o : v === 'n' ? p : st[o.id] ? o : p; }); },
      sets() { const st = this.stars(); return this.data.sets.map((g, i) => ({ key: i, recs: this.list(g, st).map(p => st[p.id] || 0), cat: g.group || 'comp' })); },
      problem(i, j, X, lang) {
        const g = this.data.sets[i], st = this.stars(), list = this.list(g, st), P = list[j];
        if (g.base && g.old && g.old[g.base[j].id]) { const pin = store.get(this.PIN, {}), k = g.id + ':' + g.base[j].id, v = P === g.base[j] ? 'n' : 'o'; if (pin[k] !== v) { pin[k] = v; store.set(this.PIN, pin); } }
        return { i, j, P, sfen: P.sfen, kind: 'tsume', n: P.n, count: list.length, set: (g.title && (g.title[lang] || g.title.en)) || g.id };
      },
      save(p, stars) { const st = this.stars(); st[p.P.id] = Math.max(st[p.P.id] || 0, stars); store.set(this.KEY, st); store.set(this.LAST, String(p.i)); },
    },
  };
  // peg solitaire (2026-11-13: the 2D page's collection, played on the 3D table): peg/puzzles.json regrouped as the page does —
  // 基本 (first · shape · mid · chain), 世界の盤 (a theme per board), 全面; stars per problem in 'aicoding-peg-pz' { '<theme>:<j>': 1..3 }
  BOOK.peg = {
    url: '../peg/puzzles.json?v=3', KEY: 'aicoding-peg-pz', LAST: 'aicoding-peg-pz-last', data: null,
    prep(d) { const by = id => (d.themes.find(T => T.id === id) || { list: [] }).list, out = [];
      out.push({ id: 'first', grp: 'basic', list: by('first') }, { id: 'shape', grp: 'basic', list: by('shape') }, { id: 'mid', grp: 'basic', list: by('mid') }, { id: 'chain', grp: 'basic', list: by('chain') }, { id: 'edge', grp: 'basic', list: by('edge') }, { id: 'island', grp: 'basic', list: by('island') });
      for (const b of ['triangle', 'french', 'diamond', 'german']) out.push({ id: 'w-' + b, grp: 'world', board: b, list: by('world').filter(P => P.b === b) });
      out.push({ id: 'wmix', grp: 'world', list: by('wmix') }, { id: 'wbig', grp: 'world', list: by('wbig') });   // (2026-11-13: two more themes in each)
      out.push({ id: 'full', grp: 'full', list: by('full') });
      return { themes: out.filter(T => T.list.length) }; },
    PT(k, lang, v) { const D = window.PEG_I18N && PEG_I18N[k]; return D ? fill(D[lang] || D.en || D.ja || '', v || {}) : ''; },
    recs(T) { const m = store.get(this.KEY, {}); return T.list.map((_, j) => +m[T.id + ':' + j] || 0); },
    sets() { return this.data.themes.map((T, i) => ({ key: i, recs: this.recs(T), cat: T.grp })); },
    title(i, lang) { const T = this.data.themes[i]; return (T.board ? this.PT('bd.' + T.board, lang) : this.PT('pz.th.' + T.id, lang)) || T.id; },
    cells: P => P.b + ':' + P.p + ':' + P.t,
    problem(i, j, X, lang) { const T = this.data.themes[i], P = T.list[j]; return { i, j, P, kind: 'peg', cells: this.cells(P), n: P.n, count: T.list.length, set: this.title(i, lang) }; },
    save(p, stars) { const m = store.get(this.KEY, {}), k = this.data.themes[p.i].id + ':' + p.j; m[k] = Math.max(+m[k] || 0, stars); store.set(this.KEY, m); store.set(this.LAST, String(p.i)); },
    cats(lang) { const IC = { basic: '<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/>', world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', full: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>' };
      return ['basic', 'world', 'full'].map(k => ({ k, name: this.PT('pz.grp.' + k, lang) || k, desc: this.PT('pz.grp.' + k + '.sub', lang), icon: `<svg viewBox="0 0 24 24">${IC[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.list[0]; return { desc: T.board ? this.PT('pz.wb.sub', lang, { b: this.PT('bd.' + T.board, lang) }) : this.PT('pz.th.' + T.id + '.sub', lang), board: P ? 'peg:' + this.cells(P) : '' }; },
    guide: '../images/atlas/av/marble-2.webp',
    daily: null,
  };
  // reversi/index.html: 'reversi-emerald-puzzles' { "<level id>:<k>": stars, _v: 2, '@o:'/'@n:' markers }; puzzleData.old["<id>:<k>"] = a
  // slot's previous content, kept by players who already met it (pzUseOld); PZ_LAST = the level index
  BOOK.reversi = {
    url: '../reversi/puzzles.json?v=5', KEY: 'reversi-emerald-puzzles', LAST: 'reversi-pz-last', data: null,
    sv: x => x === true ? 3 : x === 'h' ? 2 : (+x || 0),
    pr() { const pr = store.get(this.KEY, {}); if (!pr._v) { for (const k of Object.keys(pr)) { const x = pr[k]; pr[k] = x === 'h' ? 2 : x ? 3 : 0; } pr._v = 2; } return pr; },
    at(i, j, pr) { const lv = this.data.levels[i], k = lv.id + ':' + j, O = this.data.old || {}; const old = O[k] && (pr['@o:' + k] || (!pr['@n:' + k] && k in pr)); return { P: old ? O[k] : lv.puzzles[j], rk: k, old: !!O[k] && old }; },
    sets() { const pr = this.pr(); return this.data.levels.map((L, i) => ({ key: i, recs: L.puzzles.map((_, j) => this.sv(pr[L.id + ':' + j])), cat: L.cat || 'level' })); },
    title(i, lang) { const n = this.data.levels[i].name; return (n && (n[lang] || n.en)) || this.data.levels[i].id; },
    problem(i, j, X, lang) {
      const pr = this.pr(), { P, rk, old } = this.at(i, j, pr), O = this.data.old || {};
      if (O[rk] && !pr['@o:' + rk] && !pr['@n:' + rk]) { pr[(old ? '@o:' : '@n:') + rk] = 1; store.set(this.KEY, pr); }   // (pzMarkSeen)
      return { i, j, rk, P, cells: P.cells, toMove: P.toMove, me: P.toMove, goal: P.goal, kind: 'rv', n: P.e || 0, count: this.data.levels[i].puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); store.set(this.LAST, String(p.i)); },
  };
  // the set list's look (atlas/app.js puzzleSheet, 2026-11-11): chapters (the full game's レベル別・テーマ別・特選 with their
  // texts), each set's icon (reversi/index.html PZI) and a small board of its first problem
  const RV_CAT = {"ja":{"level":["レベル別","空きマスの数で分けた基本コース。入門の2マスから超名人の18マスまで、少しずつ読みを長くしよう。"],"theme":["テーマ別","終盤の考え方ごとの問題集。偶数理論・パス・X打ちなど、テーマを意識して解こう。"],"unique":["ユニーク","意外な一手、大逆転、全滅、対称形…ひと味ちがう問題と傑作選。"]},"en":{"level":["By level","The core course by number of empty squares — from 2 empties up to 18, read a little further at each step."],"theme":["By theme","Puzzles grouped by endgame idea — parity, passes, X/C squares and more. Solve with the theme in mind."],"unique":["Specials","Surprising moves, comebacks, wipe-outs, symmetric shapes… unusual problems and the masterpieces."]},"zh":{"level":["按级别","按空格数分级的基础课程。从入门的2格到超名人的18格，一步步算得更远。"],"theme":["按主题","按残局思路分类的题集：奇偶理论、跳过、X位等，带着主题去解吧。"],"unique":["特色题","意外的一手、大逆转、全歼、对称形……别具一格的题目与精选佳作。"]},"ko":{"level":["레벨별","빈칸 수로 나눈 기본 코스. 입문의 2칸부터 초명인의 18칸까지 조금씩 수읽기를 늘려 가자."],"theme":["테마별","종반의 사고방식별 문제집. 짝수 이론·패스·X 두기 등 테마를 의식하며 풀어 보자."],"unique":["유니크","의외의 한 수, 대역전, 전멸, 대칭형… 색다른 문제와 걸작선."]},"es":{"level":["Por nivel","El curso básico por número de casillas vacías: de 2 a 18, calcula un poco más en cada paso."],"theme":["Por tema","Problemas agrupados por idea de final: paridad, pases, casillas X/C y más. Resuélvelos pensando en el tema."],"unique":["Especiales","Jugadas sorprendentes, remontadas, barridas, formas simétricas… problemas distintos y las obras maestras."]},"fr":{"level":["Par niveau","Le parcours de base selon le nombre de cases vides : de 2 à 18, calculez un peu plus loin à chaque étape."],"theme":["Par thème","Problèmes classés par idée de finale : parité, passes, cases X/C, etc. Résolvez-les en pensant au thème."],"unique":["Spéciaux","Coups surprenants, retournements, anéantissements, formes symétriques… des problèmes à part et les chefs-d’œuvre."]},"pt":{"level":["Por nível","O curso básico pelo número de casas vazias — de 2 até 18, calcule um pouco mais a cada etapa."],"theme":["Por tema","Problemas agrupados por ideia de final — paridade, passes, casas X/C e mais. Resolva pensando no tema."],"unique":["Especiais","Lances surpreendentes, viradas, varridas, formas simétricas… problemas diferentes e as obras-primas."]},"de":{"level":["Nach Stufe","Der Grundkurs nach Anzahl leerer Felder – von 2 bis 18, rechne mit jeder Stufe etwas weiter."],"theme":["Nach Thema","Aufgaben nach Endspiel-Ideen sortiert – Parität, Passen, X/C-Felder und mehr. Löse sie mit dem Thema im Kopf."],"unique":["Besondere","Überraschende Züge, Aufholjagden, Komplett-Auslöschungen, Symmetrien… besondere Aufgaben und die Meisterwerke."]},"hi":{"level":["स्तर अनुसार","ख़ाली ख़ानों की संख्या के अनुसार मूल कोर्स — 2 से 18 तक, हर क़दम पर थोड़ा आगे तक पढ़ें।"],"theme":["विषय अनुसार","एंडगेम के विचारों के हिसाब से पहेलियाँ — पैरिटी, पास, X/C ख़ाने और भी। विषय ध्यान में रखकर हल करें।"],"unique":["ख़ास","चौंकाने वाली चालें, वापसी, सफ़ाया, सममित आकृतियाँ… अलग तरह की पहेलियाँ और उत्कृष्ट कृतियाँ।"]},"ar":{"level":["حسب المستوى","الدورة الأساسية حسب عدد الخانات الفارغة: من 2 إلى 18، احسب أبعد قليلًا في كل خطوة."],"theme":["حسب الموضوع","ألغاز مجمّعة حسب فكرة النهاية: التكافؤ والتمرير ومربعات X/C وغيرها. حُلّها وأنت تفكر في الموضوع."],"unique":["مميزة","نقلات مفاجئة، قلب الطاولة، إبادة، أشكال متناظرة… ألغاز مختلفة والروائع."]},"ru":{"level":["По уровню","Основной курс по числу пустых полей — от 2 до 18: на каждом шаге считаем чуть дальше."],"theme":["По теме","Задачи по идеям эндшпиля — чётность, пасы, поля X/C и другое. Решайте, держа тему в уме."],"unique":["Особые","Неожиданные ходы, камбэки, полный разгром, симметричные формы… необычные задачи и шедевры."]},"zh-TW":{"level":["依程度","依空格數排列的基本課程 — 從空2格到18格，每一步多算一點。"],"theme":["依主題","依殘局觀念分類的題目 — 奇偶、Pass、X/C位等。邊想主題邊解題。"],"unique":["特選","出人意料的一手、逆轉、全滅、對稱形…獨特的題目與名作。"]},"id":{"level":["Per level","Kursus inti menurut jumlah petak kosong — dari 2 hingga 18, hitung sedikit lebih jauh di tiap tahap."],"theme":["Per tema","Soal dikelompokkan menurut ide akhir permainan — paritas, pas, petak X/C, dan lainnya. Pecahkan dengan mengingat temanya."],"unique":["Spesial","Langkah mengejutkan, comeback, sapu bersih, bentuk simetris… soal tak biasa dan mahakarya."]},"tr":{"level":["Seviyeye göre","Boş kare sayısına göre temel kurs — 2'den 18'e kadar, her adımda biraz daha ileri okuyun."],"theme":["Temaya göre","Oyun sonu fikirlerine göre gruplanmış bulmacalar — parite, pas, X/C kareleri ve dahası. Temayı aklınızda tutarak çözün."],"unique":["Özel","Şaşırtıcı hamleler, geri dönüşler, silip süpürmeler, simetrik şekiller… sıra dışı sorular ve başyapıtlar."]}};
  const RV_ICO = {
  level: '<path d="M3 20h5v-5h5v-5h5V5h3"/>', theme: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.4"/>', unique: '<path d="M12 3l2.2 6.3L20.5 11l-6.3 2.2L12 19.5l-2.2-6.3L3.5 11l6.3-1.7z"/>',
  parityOk: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7.5 12h.01M12 12h.01M16.5 12h.01" stroke-width="3.4"/>',
  parity: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M9 12h.01M15 12h.01" stroke-width="3.4"/><path d="M4 20 20 4"/>',
  pass: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>', greedy: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M19 5l-2.8 2.8M7.8 16.2 5 19"/>',
  corner: '<path d="M4 20V4h16"/><circle cx="9" cy="9" r="2.6"/><path d="M14 14l6 6M20 14l-6 6"/>', xc: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8l8 8M16 8l-8 8"/>',
  quiet: '<path d="M20 4C11 4 6 9 5 20M5 20c7 0 12-5 13-12M9.5 15H14"/>', edge: '<path d="M3 20h18"/><circle cx="7" cy="14.5" r="2.6"/><circle cx="17" cy="14.5" r="2.6"/><path d="M12 4v7M9.5 8.5 12 11l2.5-2.5"/>',
  block: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', draw: '<circle cx="12" cy="12" r="9"/><path d="M8 10h8M8 14h8"/>',
  margin: '<path d="M5 20V12M11 20V5M17 20v-9M2 20h20"/>', surprise: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6.5M12 16.8v.2"/>',
  only: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12h.01" stroke-width="3.4"/>', comeback: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  wipe: '<path d="M4 19h16M7 15l4-9M11 15l4-9M15 15l3-7"/>', sym: '<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7 4 12l5 5M15 7l5 5-5 5"/>',
  close: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>', gem: '<path d="M6 3h12l3.5 6L12 21 2.5 9zM2.5 9h19M9 3l3 6 3-6M12 9v12"/>',
};;
  Object.assign(BOOK.reversi, {
    cats(lang) { const C = RV_CAT[lang] || RV_CAT.en; return ['level', 'theme', 'unique'].map(k => ({ k, name: C[k][0], desc: C[k][1], icon: `<svg viewBox="0 0 24 24">${RV_ICO[k]}</svg>` })); },
    look(i, lang) {
      const lv = this.data.levels[i], cat = lv.cat || (lv.id === 'p6' ? 'unique' : 'level'), L = o => o ? (o[lang] || o.en || o.ja || '') : '';
      const ic = lv.icon && lv.icon !== 'lv' ? lv.icon : cat === 'level' ? 'level' : 'gem', p0 = lv.puzzles[0];
      return { cat, desc: L(lv.desc), icon: `<svg viewBox="0 0 24 24">${RV_ICO[ic] || RV_ICO.theme}</svg>`, board: p0 ? p0.cells : '' };
    },
    guide: '../images/atlas/g-disc.webp',
  });
  /* ---------- gomoku / renju (2026-11-13): gomoku/puzzles.json (詰め連珠 500: cats × levels "win in N"), the full game's records
     'aicoding-gomoku-puzzles' { '<cat>-<n>-<j>': stars } with its pinned old problems ('aicoding-gomoku-pz-old', puzzles.json old / cut),
     the last set 'gomoku-pz-last' ('<c>:<l>'). Texts: the game's own (gomoku/i18n.js, read into a sandbox). Played under the renju rule. */
  const GM_SQ = s => { const c = s.charCodeAt(0) - 97, r = +s.slice(1) - 1; return r * 15 + c; };
  const gmCells = a => String(a || '').split(/\s+/).filter(Boolean).map(GM_SQ);
  BOOK.gomoku = {
    url: '../gomoku/puzzles.json?v=20261021f', KEY: 'aicoding-gomoku-puzzles', LAST: 'gomoku-pz-last', PIN: 'aicoding-gomoku-pz-old', data: null, I: null,
    ICO: { intro: '<path d="M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>', vcf: '<circle cx="5" cy="12" r="2.2"/><circle cx="10" cy="12" r="2.2"/><circle cx="15" cy="12" r="2.2"/><circle cx="20" cy="12" r="2.2"/>', vct: '<circle cx="6" cy="12" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="18" cy="12" r="2.4"/>', forbid: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>' },
    prep(d) { d.levels = []; d.cats.forEach((C, c) => C.levels.forEach((L, l) => d.levels.push({ c, l, n: L.n, cat: C.id, puzzles: L.puzzles }))); return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    rk(i, j) { const L = this.data.levels[i]; return L.cat + '-' + L.n + '-' + j; },
    pinned() { let p = store.get(this.PIN, null); if (!p || typeof p !== 'object') { p = {}; for (const k in store.get(this.KEY, {})) p[k] = 1; store.set(this.PIN, p); } return p; },
    get(i, j) { const P = this.data.levels[i].puzzles[j], k = this.rk(i, j), o = this.data.old && this.data.old[k]; return o && this.pinned()[k] ? o : P; },
    sets() { const pr = store.get(this.KEY, {}); return this.data.levels.map((L, i) => ({ key: i, recs: L.puzzles.map((_, j) => { const v = pr[this.rk(i, j)]; return v === true ? 3 : +v || 0; }), cat: L.cat })); },
    title(i, lang) { const L = this.data.levels[i]; return this.tx('pzc.' + L.cat, lang) + ' · ' + this.tx('pz.winIn', lang, { n: L.n }); },
    lastKey() { const v = store.raw(this.LAST); if (!v) return null; const [c, l] = String(v).split(':').map(Number); const i = this.data.levels.findIndex(L => L.c === c && L.l === l); return i >= 0 ? String(i) : null; },
    problem(i, j, X, lang) {
      const L = this.data.levels[i], P = this.get(i, j);
      return { i, j, P, rk: this.rk(i, j), kind: 'gm', start: { b: gmCells(P.b), w: gmCells(P.w), side: P.side || 1 }, me: P.side || 1, last: P.last ? GM_SQ(P.last) : -1, n: L.n, vcf: L.cat === 'vcf', count: L.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars) { const pr = store.get(this.KEY, {}), v = pr[p.rk]; pr[p.rk] = Math.max(v === true ? 3 : +v || 0, stars); store.set(this.KEY, pr); const L = this.data.levels[p.i]; store.set(this.LAST, L.c + ':' + L.l); },
    cats(lang) { return this.data.cats.map(C => ({ k: C.id, name: this.tx('pzc.' + C.id, lang), desc: this.tx('pzc.' + C.id + '.sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[C.id] || this.ICO.vct}</svg>` })); },
    look(i, lang) { const L = this.data.levels[i], P = L.puzzles[0]; return { desc: this.tx('pzl.' + L.cat, lang, { n: L.n, k: L.puzzles.length }), board: P ? 'gm:' + P.b + '|' + P.w : '' }; },
    guide: '../images/atlas/g-stone.webp',
  };
  /* ---------- go (2026-11-13): go/puzzles.json (詰碁 500: 10 themes × 50, groups Cap · LD · Fight), the full game's records
     'aicoding-go-puzzles' { '<theme>-<j>': stars }, the last theme 'aicoding-go-pz-last' (its index), the daily 'aicoding-go-daily'.
     Judged by the game's own solver in its worker (go/tsumego.js via atlas/games/go.js pz.tsumego / reached). Texts: go/i18n.js. */
  const goView = (sp, extra) => {   // = go/app.js cropOf(spec, extra, 7): the part of a big board to frame
    const n = sp.n || 9; if (n <= 9) return null; const S = []; for (let i = 0; i < n * n; i++) if (sp.stones[i] === 'b' || sp.stones[i] === 'w') S.push(i); (extra || []).forEach(i => { if (i >= 0) S.push(i); }); if (!S.length) return null;
    const xs = S.map(i => i % n), ys = S.map(i => Math.floor(i / n)); let x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(n - 1, Math.max(...xs) + 1), y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(n - 1, Math.max(...ys) + 1);
    const grow = (a, b) => { while (b - a + 1 < 7) { if (b < n - 1 && (a <= 0 || n - 1 - b <= a)) b++; else a--; } return [a, b]; }; [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
    if (x0 <= 2) x0 = 0; if (y0 <= 2) y0 = 0; if (x1 >= n - 3) x1 = n - 1; if (y1 >= n - 3) y1 = n - 1;
    return Math.max(x1 - x0, y1 - y0) + 1 >= n - 2 ? null : [x0, y0, x1, y1];
  };
  const goPc = (q, N) => { if (q == null) return null; if (typeof q === 'number') return q; q = String(q).toUpperCase(); if (q === 'PASS') return -1; const x = GO_COLS.indexOf(q[0]), y = N - parseInt(q.slice(1), 10); return x >= 0 && x < N && y >= 0 && y < N ? y * N + x : null; };
  const goPcs = (a, N) => (a || []).map(q => goPc(q, N)).filter(x => x != null);
  BOOK.go = {
    url: '../go/puzzles.json?v=3', KEY: 'aicoding-go-puzzles', LAST: 'aicoding-go-pz-last', data: null, I: null,
    ICO: { Cap: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', LD: '<path d="M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>', Fight: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' },
    prep(d) { d.levels = d.themes.map(T => ({ id: T.id, grp: T.grp, title: T.title, sub: T.sub, puzzles: T.puzzles })); return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]) || (I.en && I.en[k]) || (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sets() { const pr = store.get(this.KEY, {}); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => { const v = pr[T.id + '-' + j]; return v === true ? 3 : +v || 0; }), cat: T.grp })); },
    title(i, lang) { const T = this.data.themes[i]; return (T.title && (T.title[lang] || T.title.en)) || T.id; },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j], sp = window.AtlasMini.goSpec(P.s), N = sp.n, tg = goPcs(P.target, N);
      const Pi = { s: sp, goal: P.goal, target: tg, region: goPcs(P.region, N), n: P.n, answer: goPc(P.answer, N), line: goPcs(P.line, N) };   // (= go/learn.js pzProblem)
      return { i, j, P, Pi, rk: T.id + '-' + j, kind: 'go', spec: sp, me: sp.turn || 1, n: P.n, view: P.view || goView(sp), marks: P.goal !== 'live' && P.goal !== 'kill' ? tg.map(m => [m, 'hl']) : [], count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars) { const pr = store.get(this.KEY, {}), v = pr[p.rk]; pr[p.rk] = Math.max(v === true ? 3 : +v || 0, stars); store.set(this.KEY, pr); store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Cap', 'LD', 'Fight'].map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: (T.sub && (T.sub[lang] || T.sub.en)) || '', board: P ? 'go:' + JSON.stringify({ s: window.AtlasMini.goSpec(P.s), v: P.view || goView(window.AtlasMini.goSpec(P.s)) }) : '' }; },
    guide: '../images/atlas/g-stone.webp',
  };
  /* ---------- checkers (2026-11-14): checkers/puzzles.json (詰めチェッカー 500: 10 courses × 50 "win / win material in N"), the full
     game's records 'aicoding-checkers-puzzles' { '<theme>-<j>': stars } with its replaced slots (puzzles.json old / cut: pzSlot) and
     the v2 → v3 move of old records (pzMigrate), the last course 'aicoding-checkers-pz-last'. Texts: checkers/i18n.js (a sandbox). */
  const CK_V2 = /^(win[1-5]|shot2|shot3|shot22|ekings|emen)-\d+$/;
  BOOK.checkers = {
    url: '../checkers/puzzles.json?v=20261104a', KEY: 'aicoding-checkers-puzzles', LAST: 'aicoding-checkers-pz-last', data: null, I: null,
    ICO: { Step: '<path d="M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z"/>', Tac: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', End: '<path d="M3 9l4.5 3.5L12 6l4.5 6.5L21 9l-2 9H5z"/>' },
    prep(d) { d.levels = d.themes; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() {   // = checkers/app.js pzProgress + pzMigrate (records of the v2 courses moved to the slot now holding the same position)
      const pr = store.get(this.KEY, {}) || {}, M = this.data && this.data.mig, olds = Object.keys(pr).filter(k => CK_V2.test(k));
      if (!M || !olds.length) return pr;
      const frozen = store.get('aicoding-checkers-pz-old-2026-10-21', null), bak = store.get(this.KEY + '-v2', {}) || {};
      for (const k of olds) {
        const v = this.sv(pr[k]); delete pr[k]; bak[k] = Math.max(v, this.sv(bak[k]));
        let to = M[k]; if (!to || !v) continue;
        if (to[0] === '~') { if (!Array.isArray(frozen) || frozen.includes(k)) continue; to = to.slice(1); }
        if (v > this.sv(pr[to])) pr[to] = v;
      }
      pr._v = 3; store.set(this.KEY, pr); store.set(this.KEY + '-v2', bak); return pr;
    },
    slot(T, j, pr, date) { const D = this.data, k = T.id + '-' + j, o = D.old && D.old[k]; if (!o) return { P: T.puzzles[j], rk: k }; return pr[k] != null || (date && date <= D.cut) ? { P: o, rk: k } : { P: T.puzzles[j], rk: k + '~2' }; },
    recs(T, pr) { return T.puzzles.map((_, j) => this.sv(pr[this.slot(T, j, pr).rk])); },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: this.recs(T, pr), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang, date) {
      const T = this.data.themes[i], { P, rk } = this.slot(T, j, this.pr(), date);
      return { i, j, P, rk, kind: 'ck', spec: P.s, me: P.s.side === 2 ? 2 : 1, n: P.n, g: P.g || T.g || 0, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Step', 'Tac', 'End'].map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'ck:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/g-crab.webp',
  };
  // the guide's lines for 詰めチェッカー (the rest are the game's own texts)
  const CKX = {
    ja: { hi: 'チェッカニだよ！ 詰めチェッカーで読みをきたえよう！', out: '{n}手以内に目標に届かなかった…', mid: 'いい調子！ あと{n}手。' },
    en: { hi: "Checkrab here! Let's sharpen your reading with checkers puzzles!", out: "Couldn't reach the goal within {n} moves…", mid: 'Nice! {n} moves left.' },
    zh: { hi: '我是跳棋蟹！用跳棋谜题锻炼计算力吧！', out: '没能在{n}步内达成目标……', mid: '不错！还剩{n}步。' },
    'zh-TW': { hi: '我是跳棋蟹！用跳棋謎題鍛鍊計算力吧！', out: '沒能在{n}步內達成目標……', mid: '不錯！還剩{n}步。' },
    ko: { hi: '체카니야! 체커 퍼즐로 수읽기를 단련하자!', out: '{n}수 안에 목표에 닿지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Checkrab! Entrena tu cálculo con problemas de damas.', out: 'No se alcanzó el objetivo en {n} jugadas…', mid: '¡Bien! Quedan {n} jugadas.' },
    fr: { hi: 'C’est Checkrab ! Entraîne ton calcul avec des problèmes de dames.', out: 'Objectif non atteint en {n} coups…', mid: 'Bien ! Encore {n} coups.' },
    pt: { hi: 'Aqui é o Checkrab! Treine o cálculo com problemas de damas.', out: 'Não deu para chegar ao objetivo em {n} lances…', mid: 'Boa! Faltam {n} lances.' },
    de: { hi: 'Hier ist Checkrab! Trainiere dein Rechnen mit Dame-Aufgaben.', out: 'Ziel in {n} Zügen nicht erreicht…', mid: 'Gut! Noch {n} Züge.' },
    ru: { hi: 'Это Чекраб! Тренируем расчёт на шашечных задачах.', out: 'За {n} ходов цель не достигнута…', mid: 'Отлично! Осталось {n}.' },
    tr: { hi: 'Ben Checkrab! Dama bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede hedefe ulaşılamadı…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Checkrab! Ayo latih perhitungan dengan soal dam.', out: 'Target tidak tercapai dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं चेकरैब हूँ! चेकर्स पहेलियों से गणना मज़बूत करें।', out: '{n} चालों में लक्ष्य तक नहीं पहुँचे…', mid: 'बढ़िया! {n} चालें बाकी।' },
    ar: { hi: 'أنا تشيكراب! لنقوِّ الحساب بألغاز الداما.', out: 'لم يتحقق الهدف خلال {n} نقلات…', mid: 'رائع! بقي {n}.' },
  };
  /* ---------- xiangqi (2026-11-14): xiangqi/puzzles.json (500 mates: 10 themes × 50, "mate in N" / checks-only 連将), the full game's
     records 'aicoding-xiangqi-puzzles' { '<theme>-<j>': stars }, the last theme 'aicoding-xiangqi-pz-last'. Texts: xiangqi/i18n.js (a sandbox). */
  BOOK.xiangqi = {
    url: '../xiangqi/puzzles.json?v=1', KEY: 'aicoding-xiangqi-puzzles', LAST: 'aicoding-xiangqi-pz-last', data: null, I: null,
    ICO: { Mate: '<path d="M7 21h10M9 17h6l1-7 3-3-4-1-3-4-3 4-4 1 3 3z"/>', Check: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', Pattern: '<path d="M3 9l4.5 3.5L12 6l4.5 6.5L21 9l-2 9H5z"/>' },
    prep(d) { d.levels = d.themes; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    recs(T, pr) { return T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])); },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: this.recs(T, pr), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'xq', spec: P.s, me: / b$/.test(P.s) ? 2 : 1, n: P.n, ck: !!(P.ck || T.ck), count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Mate', 'Check', 'Pattern'].map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'xq:' + P.s : '' }; },
    guide: '../images/atlas/g-shogi.webp',
  };

  /* ---------- backgammon (2026-11-14): backgammon/puzzles.json (10 categories in 4 groups; a play for a given roll, judged against
     the engine's candidate plays (equity), or a cube decision), the full game's records 'aicoding-backgammon-v2-puzzles' { id: stars },
     replaced puzzles kept for those who met them (pzKeep: 'aicoding-backgammon-v2-pz-keep'), the last category
     'aicoding-backgammon-pz-last', the daily 'aicoding-backgammon-v2-daily'. Texts: the game's i18n*.js (a sandbox). On the 3D table
     you always play the near side: a problem for the other side is turned round (the two halves of the position swapped — the
     plays are written in the mover's own numbering, so they stay as they are). Rules: backgammon/bg.js (window.BG, loaded by the table). ---------- */
  const BG_TX = ['../backgammon/i18n.js?v=20261107l14b', '../backgammon/i18n-x.js?v=20261111c8', '../backgammon/i18n-ls.js?v=20261107l14', '../backgammon/i18n-op.js?v=20261107l14', '../backgammon/i18n-teach.js?v=1', '../backgammon/i18n-ls2.js?v=1'];
  const bgTexts = () => Promise.all(BG_TX.map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(L => { const w = {}; for (const tx of L) { try { new Function('window', 'var I18N = window.I18N || (window.I18N = {});\n' + tx.replace(/^\s*var I18N = window\.I18N = \{\};/m, ''))(w); } catch (e) { console.warn('[puzzles] backgammon texts', e); } } window.AtlasBgTeach = { name: w.BGTeachName, html: w.BGTeachHTML }; return w.I18N || {}; });
  // the commentary engine (backgammon/explain.js: what a play is for) — after the rules (it reads window.BG when it loads)
  const bgScript = (src, test) => test() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = src; sc.onload = sc.onerror = () => res(); document.head.appendChild(sc); });
  window.AtlasBgExplain = window.AtlasBgExplain || (() => bgScript('../backgammon/bg.js?v=20261111c1', () => window.BG && BG.genPlays).then(() => bgScript('../backgammon/explain.js?v=20261115t', () => window.BGX && BGX.teach)));
  window.AtlasBgTexts = window.AtlasBgTexts || (() => window.__bgTx || (window.__bgTx = bgTexts()));
  const bgTurn = (pos, side) => side === 1 ? String(pos).slice(26) + String(pos).slice(0, 26) : String(pos);   // (the mover always at the near side)
  const bgCk = () => { let ck = ['gold', 'black']; try { const st = (JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}') || {}).settings || {}; if (st.ck && st.ck[0] && st.ck[1] && st.ck[0] !== st.ck[1]) ck = st.ck.slice(); } catch (e) {} return ck; };
  const BG_GROUPS = [['mid', ['opening', 'hit', 'point', 'prime', 'blitz']], ['def', ['safe', 'defense']], ['end', ['race', 'bearoff']], ['cube', ['cube']]];
  const BG_ICO = { mid: '<path d="M4 20 20 4M14 4h6v6"/><path d="M4 14l6 6"/>', def: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', end: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>', cube: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01" stroke-width="3.2"/>' };
  BOOK.backgammon = {
    url: '../backgammon/puzzles.json?v=20261021fz', KEY: 'aicoding-backgammon-v2-puzzles', LAST: 'aicoding-backgammon-pz-last', KEEP: 'aicoding-backgammon-v2-pz-keep', data: null, I: null,
    prep(d) { d.levels = d.cats; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]); if (x === undefined) return ''; return v && typeof x === 'string' ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    keep() {   // = backgammon/app.js pzKeep: the replaced puzzles a player had already met stay theirs
      const D = this.data; if (!D || !D.old || !D.cut) return [];
      let k = store.get(this.KEEP, null);
      if (!k || k.cut !== D.cut) { const pr = store.get(this.KEY, {}) || {}; k = { cut: D.cut, ids: Object.keys(D.old).filter(id => pr[id] !== undefined && pr[id] !== null) }; store.set(this.KEEP, k); }
      return k.ids;
    },
    at(i, j, date) { const D = this.data, P = D.cats[i].puzzles[j], o = P && D.old && D.old[P.id]; return o && ((date && date <= D.cut) || this.keep().includes(P.id)) ? o : P; },
    group: id => (BG_GROUPS.find(g => g[1].includes(id)) || BG_GROUPS[0])[0],
    recs(C) { const pr = store.get(this.KEY, {}) || {}; return C.puzzles.map(P => this.sv(pr[P.id])); },
    sets() { return this.data.cats.map((C, i) => ({ key: i, recs: this.recs(C), cat: this.group(C.id) })); },
    title(i, lang) { return this.tx('pzc.' + this.data.cats[i].id, lang) || this.data.cats[i].id; },
    problem(i, j, X, lang, date) {
      this.keep(); const P = this.at(i, j, date), cube = P.kind === 'cube';
      return { i, j, P, rk: P.id, kind: 'bg', cube, bg: { pos: bgTurn(P.pos, P.side), dice: cube ? null : P.dice.slice() }, count: this.data.cats[i].puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = store.get(this.KEY, {}) || {}; pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return BG_GROUPS.map(([k]) => ({ k, name: this.tx('pzg.' + k, lang), desc: this.tx('pzg.' + k + '.d', lang), icon: `<svg viewBox="0 0 24 24">${BG_ICO[k]}</svg>` })); },
    look(i, lang) { const C = this.data.cats[i], P = this.at(i, 0); return { desc: this.tx('pzc.' + C.id + '.d', lang), board: P ? 'bg:' + JSON.stringify({ pos: bgTurn(P.pos, P.side), dice: P.kind === 'cube' ? null : P.dice }) : '' }; },
    guide: '../images/atlas/g-dice.webp',
  };
  // a small board (the near side's home at the lower right, as on the table): the checkers of both sides, the dice of the roll
  window.AtlasMini.backgammon = spec => {
    let o0 = spec; if (typeof o0 === 'string') { try { o0 = JSON.parse(o0); } catch (e) { return ''; } }
    const S = String(o0 && o0.pos || ''); if (S.length < 52) return '';
    const n = i => parseInt(S[i], 16) || 0, ck = bgCk(), CC = { gold: '#e9d9a8', black: '#26282e', white: '#f6f2e8', red: '#b3242c', green: '#2f7a4c', blue: '#2c4f9a', pearl: '#ece6ee', brown: '#7a4e2c' };
    const c0 = CC[ck[0]] || CC.gold, c1 = CC[ck[1]] || CC.black;
    let o = '<svg viewBox="0 0 84 66" aria-hidden="true"><rect width="84" height="66" rx="5" fill="#5a3a22"/><rect x="3" y="3" width="35" height="60" fill="#e8d6b0"/><rect x="43" y="3" width="35" height="60" fill="#e8d6b0"/><rect x="79" y="3" width="3" height="60" fill="#3a2414"/>';
    const X = vp => vp <= 6 ? 43 + (6 - vp) * 5.83 + 2.9 : vp <= 12 ? 3 + (12 - vp) * 5.83 + 2.9 : vp <= 18 ? 3 + (vp - 13) * 5.83 + 2.9 : 43 + (vp - 19) * 5.83 + 2.9;
    for (let vp = 1; vp <= 24; vp++) { const x = X(vp), top = vp >= 13; o += `<path d="M${(x - 2.9).toFixed(1)} ${top ? 3 : 63}L${(x + 2.9).toFixed(1)} ${top ? 3 : 63}L${x.toFixed(1)} ${top ? 27 : 39}z" fill="${vp % 2 ? '#a3442c' : '#2f4a3c'}"/>`; }
    const stack = (vp, k, col, top) => `<circle cx="${X(vp).toFixed(1)}" cy="${(top ? 6 + k * 5 : 60 - k * 5).toFixed(1)}" r="2.6" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width=".5"/>`;
    for (let p = 1; p <= 24; p++) { const a = Math.min(5, n(p)), b = Math.min(5, n(26 + p)); for (let k = 0; k < a; k++) o += stack(p, k, c0, p >= 13); const vb = 25 - p; for (let k = 0; k < b; k++) o += stack(vb, k, c1, vb >= 13); }
    if (n(25)) o += `<circle cx="40.5" cy="40" r="2.6" fill="${c0}" stroke="#000" stroke-width=".5"/>`; if (n(51)) o += `<circle cx="40.5" cy="26" r="2.6" fill="${c1}" stroke="#000" stroke-width=".5"/>`;
    if (o0.dice) o0.dice.forEach((v, i) => { const x = 55 + i * 9, y = 29; o += `<rect x="${x}" y="${y}" width="7.5" height="7.5" rx="1.6" fill="#fffdf7" stroke="#2b2b2b" stroke-width=".5"/><text x="${x + 3.75}" y="${y + 6}" font-size="6" text-anchor="middle" font-family="sans-serif" font-weight="800" fill="#222">${v}</text>`; });
    return o + '</svg>';
  };
  // the guide's lines for the xiangqi mates (the rest are the game's own texts)
  const XQX = {
    ja: { hi: 'ショウギツネだよ！ シャンチーの詰めで読みをきたえよう！', out: '{n}手以内に詰ませられなかった…', mid: 'いい調子！ あと{n}手。' },
    en: { hi: "Shogitsune here! Let's train your reading with xiangqi mates!", out: "Couldn't mate within {n} moves…", mid: 'Nice! {n} moves left.' },
    zh: { hi: '我是将棋狐！用象棋杀局锻炼计算力吧！', out: '没能在{n}步内将死……', mid: '不错！还剩{n}步。' },
    'zh-TW': { hi: '我是將棋狐！用象棋殺局鍛鍊計算力吧！', out: '沒能在{n}步內將死……', mid: '不錯！還剩{n}步。' },
    ko: { hi: '쇼기여우야! 샹치 묘수풀이로 수읽기를 단련하자!', out: '{n}수 안에 외통을 만들지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Shogizorro! Entrena tu cálculo con mates de xiangqi.', out: 'No se logró el mate en {n} jugadas…', mid: '¡Bien! Quedan {n} jugadas.' },
    fr: { hi: 'C’est Shogirenard ! Entraîne ton calcul avec des mats de xiangqi.', out: 'Pas de mat en {n} coups…', mid: 'Bien ! Encore {n} coups.' },
    pt: { hi: 'Aqui é a Shogiraposa! Treine o cálculo com mates de xiangqi.', out: 'Não deu mate em {n} lances…', mid: 'Boa! Faltam {n} lances.' },
    de: { hi: 'Hier ist Shogifuchs! Trainiere dein Rechnen mit Xiangqi-Mattaufgaben.', out: 'Kein Matt in {n} Zügen…', mid: 'Gut! Noch {n} Züge.' },
    ru: { hi: 'Это Сёгицунэ! Тренируем расчёт на задачах на мат в сянци.', out: 'За {n} ходов мат не получился…', mid: 'Отлично! Осталось {n}.' },
    tr: { hi: 'Ben Shogitsune! Xiangqi mat bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede mat gelmedi…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Shogitsune! Ayo latih perhitungan dengan soal skakmat xiangqi.', out: 'Skakmat tidak tercapai dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं शोगित्सुने हूँ! शियांगची मात पहेलियों से गणना मज़बूत करें।', out: '{n} चालों में मात नहीं हुई…', mid: 'बढ़िया! {n} चालें बाकी।' },
    ar: { hi: 'أنا شوغيتسوني! لنقوِّ الحساب بألغاز المات في الشيانغتشي.', out: 'لم يتحقق المات خلال {n} نقلات…', mid: 'رائع! بقي {n}.' },
  };
  const BGX = {
    ja: { hi: 'ワン！ ダイスンだよ。バックギャモンのパズルで最善手を見つけよう！', mid: 'あと{n}つ動かそう。' },
    en: { hi: "Woof! Dicepup here. Let's find the best plays in backgammon puzzles!", mid: '{n} more to move.' },
    zh: { hi: '汪！我是骰子汪。来找出双陆棋谜题的最佳走法吧！', mid: '还要走{n}步。' },
    'zh-TW': { hi: '汪！我是骰子汪。來找出雙陸棋謎題的最佳走法吧！', mid: '還要走{n}步。' },
    ko: { hi: '멍! 다이슨이야. 백개먼 퍼즐에서 최선의 수를 찾아보자!', mid: '{n}번 더 움직이자.' },
    es: { hi: '¡Guau! Soy Dicepup. ¡Busquemos la mejor jugada en problemas de backgammon!', mid: 'Faltan {n} movimientos.' },
    fr: { hi: 'Ouaf ! C’est Dicepup. Trouvons les meilleurs coups dans des problèmes de backgammon !', mid: 'Encore {n} déplacements.' },
    pt: { hi: 'Au! Aqui é o Dicepup. Vamos achar as melhores jogadas em problemas de gamão!', mid: 'Faltam {n} movimentos.' },
    de: { hi: 'Wuff! Hier ist Dicepup. Finden wir die besten Züge in Backgammon-Aufgaben!', mid: 'Noch {n} Schritte.' },
    ru: { hi: 'Гав! Это Дайспап. Найдём лучшие ходы в задачах по нардам!', mid: 'Осталось ходов: {n}.' },
    tr: { hi: 'Hav! Ben Dicepup. Tavla bulmacalarında en iyi hamleyi bulalım!', mid: '{n} hamle daha.' },
    id: { hi: 'Guk! Aku Dicepup. Ayo cari langkah terbaik di teka-teki backgammon!', mid: 'Tinggal {n} langkah.' },
    hi: { hi: 'भौं! मैं डाइसपप हूँ। बैकगैमन पहेलियों में सबसे अच्छी चाल ढूँढें!', mid: 'अभी {n} चालें बाकी।' },
    ar: { hi: 'هاو! أنا دايس باب. لنجد أفضل النقلات في ألغاز الطاولة!', mid: 'بقي {n}.' },
  };
  const GOX = {
    ja: { hi: 'ゴイシペンだよ。詰碁で読みをきたえよう！', out: '{n}手以内には達成できなかった…', mid: 'その調子！ あと{n}手。' },
    en: { hi: "Stoneguin here! Let's train your reading with tsumego.", out: "Couldn't do it within {n} moves…", mid: 'Good! {n} moves left.' },
    zh: { hi: '我是棋石企鹅！用死活题锻炼计算力吧！', out: '没能在{n}手内达成…', mid: '不错！还剩{n}手。' },
    'zh-TW': { hi: '我是棋子企鵝！用死活題鍛鍊計算力吧！', out: '沒能在{n}手內達成…', mid: '不錯！還剩{n}手。' },
    ko: { hi: '바둑돌펭이야! 사활 문제로 수읽기를 단련하자!', out: '{n}수 안에 해내지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Pingüipiedra! Entrena tu lectura con tsumego.', out: 'No se logró en {n} jugadas…', mid: '¡Bien! Quedan {n} jugadas.' },
    fr: { hi: 'C’est Pingopierre ! Entraîne ta lecture avec des tsumego.', out: 'Pas réussi en {n} coups…', mid: 'Bien ! Encore {n} coups.' },
    pt: { hi: 'Aqui é o Pinguipedra! Treine a leitura com tsumego.', out: 'Não deu em {n} lances…', mid: 'Boa! Faltam {n} lances.' },
    de: { hi: 'Hier ist Steinguin! Trainiere dein Lesen mit Tsumego.', out: 'In {n} Zügen nicht geschafft…', mid: 'Gut! Noch {n} Züge.' },
    ru: { hi: 'Это Стоунгвин! Тренируем чтение на цумэго.', out: 'За {n} ходов не получилось…', mid: 'Отлично! Осталось {n}.' },
    tr: { hi: 'Ben Stoneguin! Tsumego ile okuma gücünü geliştirelim.', out: '{n} hamlede başarılamadı…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Stoneguin! Ayo latih membaca dengan tsumego.', out: 'Tidak berhasil dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं स्टोनगुइन हूँ! त्सुमेगो से पढ़ने की क्षमता बढ़ाएँ।', out: '{n} चालों में नहीं हो सका…', mid: 'बढ़िया! {n} चालें बाकी।' },
    ar: { hi: 'أنا بطريق الحجر! لنقوِّ القراءة بمسائل التسوميغو.', out: 'لم يتحقق خلال {n} نقلات…', mid: 'رائع! بقي {n}.' },
  };
  // the guide's lines for 詰め連珠 (the rest are the game's own texts)
  const GMX = {
    ja: { hi: 'ゴイシペンだよ。詰め連珠で読みをきたえよう！', out: '{n}手以内に勝ちを決められなかった…', chk: '読んでいるよ…', mid: 'いい調子！ あと{n}手。', ans: '正解の手順を見せるね。', done: 'これが正解の手順だよ。「もう一度」で自分でも打ってみよう！' },
    en: { hi: "Stoneguin here! Let's train your reading with renju puzzles.", out: "Couldn't settle it within {n} moves…", chk: 'Reading…', mid: 'Nice! {n} moves left.', ans: "Here's the solution.", done: 'That was the solution. Tap "Retry" and play it yourself!' },
    zh: { hi: '我是棋石企鹅！用连珠诘题锻炼计算力吧！', out: '没能在{n}手内决出胜负…', chk: '正在计算…', mid: '不错！还剩{n}手。', ans: '给你看正解的手顺。', done: '这就是正解。点「再来一次」自己下一遍吧！' },
    'zh-TW': { hi: '我是棋子企鵝！用連珠詰題鍛鍊計算力吧！', out: '沒能在{n}手內決出勝負…', chk: '正在計算…', mid: '不錯！還剩{n}手。', ans: '給你看正解的手順。', done: '這就是正解。點「再來一次」自己下一遍吧！' },
    ko: { hi: '바둑돌펭이야! 연주 묘수풀이로 수읽기를 단련하자!', out: '{n}수 안에 승부를 내지 못했어…', chk: '수읽기 중…', mid: '좋아! {n}수 남았어.', ans: '정답 수순을 보여 줄게.', done: '이게 정답 수순이야. "다시"로 직접 두어 보자!' },
    es: { hi: '¡Soy Pingüipiedra! Entrena tu cálculo con problemas de renju.', out: 'No se decidió en {n} jugadas…', chk: 'Calculando…', mid: '¡Bien! Quedan {n} jugadas.', ans: 'Te enseño la solución.', done: 'Esa era la solución. ¡Pulsa «Reintentar» y juégala tú!' },
    fr: { hi: 'C’est Pingopierre ! Entraîne ton calcul avec des problèmes de renju.', out: 'Pas de victoire en {n} coups…', chk: 'Je calcule…', mid: 'Bien ! Encore {n} coups.', ans: 'Voici la solution.', done: 'C’était la solution. Touche « Réessayer » et joue-la toi-même !' },
    pt: { hi: 'Aqui é o Pinguipedra! Treine o cálculo com problemas de renju.', out: 'Não deu para vencer em {n} lances…', chk: 'Calculando…', mid: 'Boa! Faltam {n} lances.', ans: 'Vou mostrar a solução.', done: 'Essa era a solução. Toque em "Repetir" e jogue você!' },
    de: { hi: 'Hier ist Steinguin! Trainiere dein Rechnen mit Renju-Aufgaben.', out: 'In {n} Zügen nicht entschieden…', chk: 'Ich rechne…', mid: 'Gut! Noch {n} Züge.', ans: 'Ich zeige dir die Lösung.', done: 'Das war die Lösung. Tippe auf „Nochmal“ und spiel sie selbst!' },
    ru: { hi: 'Это Стоунгвин! Тренируем расчёт на задачах рэндзю.', out: 'Не удалось выиграть за {n} ходов…', chk: 'Считаю…', mid: 'Отлично! Осталось {n}.', ans: 'Покажу решение.', done: 'Это было решение. Нажмите «Ещё раз» и сыграйте сами!' },
    tr: { hi: 'Ben Stoneguin! Renju bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede kazanılamadı…', chk: 'Hesaplıyorum…', mid: 'Güzel! {n} hamle kaldı.', ans: 'Çözümü göstereyim.', done: 'Çözüm buydu. "Tekrar" ile kendin oyna!' },
    id: { hi: 'Aku Stoneguin! Ayo latih perhitungan dengan soal renju.', out: 'Tidak bisa menang dalam {n} langkah…', chk: 'Menghitung…', mid: 'Bagus! Sisa {n} langkah.', ans: 'Aku tunjukkan solusinya.', done: 'Itulah solusinya. Ketuk "Ulangi" dan mainkan sendiri!' },
    hi: { hi: 'मैं स्टोनगुइन हूँ! रेंजू पहेलियों से गणना मज़बूत करें।', out: '{n} चालों में जीत तय नहीं हुई…', chk: 'सोच रहा हूँ…', mid: 'बढ़िया! {n} चालें बाकी।', ans: 'हल दिखाता हूँ।', done: 'यही हल था। "फिर से" दबाकर खुद खेलें!' },
    ar: { hi: 'أنا بطريق الحجر! لنقوِّ الحساب بألغاز الرنجو.', out: 'لم يُحسم الفوز خلال {n} نقلات…', chk: 'أحسب…', mid: 'رائع! بقي {n}.', ans: 'سأريك الحل.', done: 'هذا هو الحل. اضغط «مرة أخرى» والعبه بنفسك!' },
  };
  /* ---------- the daily puzzles: the same problem of the day as the full games, and their streak record ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY = { backgammon: { d1: 'aicoding-backgammon-v2-daily' }, xiangqi: { d1: 'aicoding-xiangqi-daily' }, checkers: { d1: 'aicoding-checkers-daily' }, go: { d1: 'aicoding-go-daily' }, reversi: { d1: 'reversi-emerald-daily' }, chess: { d1: 'aicoding-chess-daily' }, shogi: { d1: 'shogi-kaya-daily', d2: 'shogi-kaya-daily-easy' }, peg: { d1: 'aicoding-peg-daily', d2: 'aicoding-peg-daily' } };
  function dailyPick(id, which) {
    const B = BOOK[id], now = new Date(), date = ymd(now), wd = now.getDay(), day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    if (id === 'reversi') {   // (reversi/index.html dailyPick: Mon–Tue level 2, Wed–Thu 3, Fri–Sat 4, Sun 5)
      const D = B.data; if (!D || D.levels.length < 5) return null;
      const li = wd === 0 ? 4 : wd <= 2 ? 1 : wd <= 4 ? 2 : 3;
      let h = day * 2654435761 >>> 0; h ^= h >>> 15;
      return { date, i: li, j: (h >>> 0) % D.levels[li].puzzles.length };
    }
    if (id === 'backgammon') {   // (backgammon/app.js dailyPick: a category per day; the stage by the weekday, the weekend the hardest)
      const D = B.data; if (!D || !D.cats || !D.cats.length) return null;
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h >>>= 0;
      const c = day % D.cats.length, n = D.cats[c].puzzles.length, st = Math.max(1, Math.ceil(n / STAGE)), stage = Math.min(st - 1, wd === 0 || wd === 6 ? st - 1 : Math.floor((wd - 1) * st / 5));
      const a = stage * STAGE, b = Math.min(n, a + STAGE);
      return { date, i: c, j: a + h % Math.max(1, b - a) };
    }
    if (id === 'xiangqi') {   // (xiangqi/app.js dailyPick: a theme per weekday)
      const D = B.data; if (!D || !D.themes) return null;
      const ids = D.daily || D.themes.map(x => x.id), L = Math.max(0, D.themes.findIndex(x => x.id === ids[now.getDay() % ids.length]));
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.themes[L].puzzles.length };
    }
    if (id === 'checkers') {   // (checkers/app.js dailyPick: a course per weekday)
      const D = B.data; if (!D || !D.themes) return null;
      const ids = D.daily || D.themes.map(x => x.id), L = Math.max(0, D.themes.findIndex(x => x.id === ids[now.getDay() % ids.length]));
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.themes[L].puzzles.length };
    }
    if (id === 'go') {   // (go/learn.js dailyPick: a theme per weekday)
      const D = B.data; if (!D || !D.themes) return null;
      const ids = D.daily || D.themes.map(x => x.id), tid = ids[now.getDay() % ids.length], L = Math.max(0, D.themes.findIndex(x => x.id === tid));
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.themes[L].puzzles.length };
    }
    if (id === 'peg') {   // (peg/app.js dailyIdx: the day of the year; d1 = the day's puzzle, d2 = its EASY one)
      const D = B.daily; if (!D) return null;
      const y0 = new Date(now.getFullYear(), 0, 0), k = Math.floor((new Date(date + 'T00:00:00') - y0) / 864e5) % 366, L = which === 'd2' ? D.easy : D.list;
      return L && L[k] ? { date, P: L[k], easy: which === 'd2' } : null;
    }
    if (id === 'chess') {   // (chess/app.js dailyPick)
      const D = B.data; if (!D || D.levels.length < 4) return null;
      const T = D.levels.map((x, i) => x.kind === 'line' ? i : -1).filter(i => i >= 0);
      const L = T.length >= 5 ? [3, T[0], T[1], T[2], T[2], T[3], T[4]][wd] : (wd >= 1 && wd <= 2 ? 1 : wd >= 3 && wd <= 4 ? 2 : 3);
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.levels[L].puzzles.length };
    }
    const S = B.data && B.data.sets; if (!S) return null;   // (shogi/index.html dailyPick)
    const idx = ids => ids.map(x => S.findIndex(g => g.id === x)).find(i => i >= 0);
    if (which === 'd2') {
      const si = idx(day % 2 ? ['c5', 'p5'] : ['c3', 'p3']); if (si === undefined) return null;
      let h = (day * 2246822519 + 374761393) >>> 0; h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 3266489917) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
      return { date, i: si, j: h % S[si].problems.length, easy: true };
    }
    const want = wd === 0 ? ['c13', 'c9', 'p9'] : wd <= 2 ? ['c5', 'p3'] : wd <= 4 ? ['c7', 'p5'] : wd === 5 ? ['p7', 'c7'] : ['c9', 'p9'];
    const si = S.findIndex(x => x.id === want[0]) >= 0 ? S.findIndex(x => x.id === want[0]) : S.findIndex(x => want.includes(x.id));
    if (si < 0) return null;
    let h = day * 2654435761 >>> 0; h = (h ^ (h >>> 15)) >>> 0;
    return { date, i: si, j: h % S[si].problems.length };
  }
  function dailyProblem(id, which, X, lang) {
    const d = dailyPick(id, which); if (!d) return null;
    const B = BOOK[id]; let p;
    if (id === 'chess') p = B.problem(d.i, d.j, X);
    else if (id === 'reversi' || id === 'go' || id === 'xiangqi') p = B.problem(d.i, d.j, X, lang);
    else if (id === 'checkers' || id === 'backgammon') p = B.problem(d.i, d.j, X, lang, d.date);   // (the day's slot: an old puzzle for dates up to the cut)
    else if (id === 'peg') p = { i: -1, j: 0, P: d.P, kind: 'peg', cells: B.cells(d.P), n: d.P.n, count: 1, set: '' };
    else { const g = B.data.sets[d.i], P = (g.base || g.problems)[d.j]; p = { i: d.i, j: d.j, P, sfen: P.sfen, kind: 'tsume', n: P.n, count: g.problems.length, set: (g.title && (g.title[lang] || g.title.en)) || g.id }; }
    p.daily = { date: d.date, key: DAILY[id][which] || DAILY[id].d1, which };
    return p;
  }
  function dailySolved(p, hinted) {   // (the full games' dailySolved: the streak)
    if (p.kind === 'peg' && p.daily.which === 'd2') { const o = store.get(p.daily.key, {}) || {}; o.easy = o.easy || {}; o.easy[p.daily.date] = 1; store.set(p.daily.key, o); return; }   // (peg's EASY: a mark of the day, no streak)
    const k = p.daily.key, R = Object.assign({ last: '', streak: 0, best: 0, days: {} }, store.get(k, {})), date = p.daily.date;
    if (R.days[date]) return;
    const y = new Date(date + 'T12:00:00'); y.setDate(y.getDate() - 1);
    R.streak = R.last === ymd(y) ? R.streak + 1 : 1; R.last = date; R.best = Math.max(R.best || 0, R.streak); R.days[date] = hinted ? 'h' : 1;
    store.set(k, R);
  }
  // the sets for the portal's 問題一覧 (atlas/app.js puzzleSheet): title, stars per problem, which are open
  function setsOf(id, lang) {
    const X = TX[lang] || TX.en;
    return loadBook(id).then(B => B.sets().map((x, n) => {
      const title = B.title ? B.title(x.key, lang) : id === 'chess' ? B.problem(x.key, 0, X).set : ((g => (g.title && (g.title[lang] || g.title.en)) || g.id)(B.data.sets[x.key]));
      return Object.assign({ key: x.key, title, cat: x.cat, recs: x.recs, open: x.recs.map((_, j) => stageOpen(x.recs, j)), stage: STAGE }, B.look ? B.look(x.key, lang) : {});
    }));
  }

  const catsOf = (id, lang) => loadBook(id).then(B => B.cats ? { cats: B.cats(lang), guide: B.guide } : null);
  function loadBook(id) {
    const B = BOOK[id]; if (B.data) return Promise.resolve(B);
    return B.p || (B.p = Promise.all([fetch(B.url).then(r => r.json()), id === 'peg' ? fetch('../peg/daily.json?v=2').then(r => r.json()).catch(() => null) : id === 'gomoku' ? fetch('../gomoku/i18n.js?v=20261112c1').then(r => r.text()).catch(() => '') : id === 'go' ? fetch('../go/i18n.js?v=20261113').then(r => r.text()).catch(() => '') : id === 'checkers' ? fetch('../checkers/i18n.js?v=20261107l14-nd1').then(r => r.text()).catch(() => '') : id === 'xiangqi' ? fetch('../xiangqi/i18n.js?v=4lv-l14-pro-nd1').then(r => r.text()).catch(() => '') : id === 'backgammon' ? Promise.all([AtlasBgTexts(), AtlasBgExplain()]).then(r => r[0]) : null]).then(([d, dl]) => {
      B.data = id === 'shogi' || id === 'peg' || id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi' || id === 'backgammon' ? B.prep(d) : d; if (id === 'peg') B.daily = dl;
      if (id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi') { const w = {}; try { new Function('window', dl)(w); } catch (e) {} B.I = w.I18N || {}; }
      if (id === 'backgammon') B.I = dl || {};   // (a sandbox: the page's own words stay untouched)
      return B; }).catch(e => { B.p = null; throw e; }));
  }

  /* ---------- sounds ---------- */
  const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
  function clearJingle(C, v) {   // the problem-clear sound (2026-11-14): テレレレッ・レレー！ — four quick notes up, a stop, then two with the last held over a chord
    const t0 = C.currentTime + .02, note = (f, d, len, g0, type) => { const o = C.createOscillator(), g = C.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(g0, t0 + d + .008); g.gain.setValueAtTime(g0 * .8, t0 + d + Math.min(len * .6, .25)); g.gain.exponentialRampToValueAtTime(.001, t0 + d + len); o.connect(g).connect(C.destination); o.start(t0 + d); o.stop(t0 + d + len + .05); };
    [[784, 0, .07], [880, .075, .07], [988, .15, .07], [1047, .225, .09], [880, .39, .08], [1047, .475, .62]].forEach(([f, d, len]) => { note(f, d, len, v * .45); note(f, d, len, v * .35, 'triangle'); });
    [523, 659, 784].forEach(f => note(f, .475, .62, v * .4, 'triangle'));
  }
  /* (2026-11-14) no board coordinates in what the guide says (the 3D boards have none): a point is named by its mark — ja 「緑に光っている点」,
     other languages a small dot of the mark's colour ('\u0001…\u0002' = a ja phrase; say() drops the spaces around it) */
  const SPJ = { ok: '緑に光っている点', ng: '赤い印の点' };
  const SP = (k, lang) => lang === 'ja' ? '\u0001' + SPJ[k] + '\u0002' : `<i class="ls-spot ${k}"></i>`;
  function chime(ok) {
    const C = ac(); if (!C) return; if (ok) return clearJingle(C, .09); const t = C.currentTime, F = ok ? [523, 659, 784, 1047] : [392, 330];
    F.forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.09, t + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .35); o.connect(g).connect(C.destination); o.start(t + i * .09); o.stop(t + i * .09 + .4); });
  }
  function blip() {
    const C = ac(); if (!C) return; const t = C.currentTime, f = 560 + Math.random() * 260;
    const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
  }
  const STAR = on => `<svg class="pzst${on ? ' on' : ''}" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z"/></svg>`;
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.ls-spot{display:inline-block;width:.78em;height:.78em;border-radius:50%;vertical-align:-.06em;margin:0 .12em;box-shadow:0 0 0 2px rgba(255,255,255,.9),0 0 6px currentColor}.ls-spot.ok{background:#2fd17a;color:#2fd17a}.ls-spot.ng{background:#e0301e;color:#e0301e}.ls-spot.hl{background:#ffb21a;color:#ffb21a}.rgd.pzg .rgd-act{gap:8px}.rgd.pzg .rgd-act .sp{flex:1}
.rgd.pzg .nm .pg{font-weight:800}
.rgd.pzg .cnt{display:flex;align-items:center;gap:2px;min-height:0}
.pzst{width:22px;height:22px;fill:#e6dccb;stroke:none}.pzst.on{fill:#ffb81c;filter:drop-shadow(0 1px 0 #c98400)}
@keyframes pzPop{0%{transform:scale(.2)}70%{transform:scale(1.25)}100%{transform:scale(1)}}.pzst.on{animation:pzPop .4s cubic-bezier(.3,1.5,.5,1) both}
.pzst.on:nth-child(2){animation-delay:.12s}.pzst.on:nth-child(3){animation-delay:.24s}
.bg-teach{margin-top:6px;font-size:.9em;line-height:1.5}.bg-teach .bt-h{font-weight:800;color:#8a5a14;margin-top:4px}.bg-teach ul{margin:2px 0 0;padding-inline-start:1.2em}.bg-teach li{margin:1px 0}.bgch{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 2px}.bgch[hidden]{display:none}.bgch .btn{flex:1 1 auto;min-width:0;padding:7px 10px;font-size:13px;background:#fff;color:#2b3044;border:2px solid #e2d6bf;box-shadow:none}.bgch .btn.ok{background:#1ea36c;color:#fff;border-color:#1ea36c}.bgch .btn.ng{background:#ff5d5d;color:#fff;border-color:#ff5d5d}
@media (max-width:600px){.rgd.pzg .pic{display:none!important}.rgd.pzg .bub::before,.rgd.pzg .bub::after{display:none!important}}`;   // (phones: no guide picture in the puzzle / lesson box — it broke the row of buttons, 2026-11-11)
    document.head.appendChild(s);
  }

  function start(ctx) {
    const id = ctx.id, X = TX[ctx.lang] || TX.en, GD = G[id], ad = ctx.adapter;
    const name = GD.name[ctx.lang] || GD.name.en;
    css();
    let stopped = false, B = null, sess = null, cur = null, first = true, typeT = 0;
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    // the guide's own lines (atlas/puzzle-lines.js): this language, else English, else the plain text here; never the same twice in a row
    const LN = (window.AtlasPuzzleLines || {})[id] || {}, lastL = {};
    function line(k, v) {
      let a = (LN[ctx.lang] && LN[ctx.lang][k]) || (LN.en && LN.en[k]); if (!a) return '';
      if (a.length > 1) a = a.filter(x => x !== lastL[k]);
      const x = pick(a); lastL[k] = x; return fill(x, v || {});
    }
    let streak = 0;
    const PEG_HI = { ja: 'わたしはビーユ。ペグソリテールのパズルに挑戦しよう！', en: "I'm Bille. Let's try some peg solitaire puzzles!", zh: '我是比尤。来挑战孔明棋谜题吧！', 'zh-TW': '我是比尤。來挑戰孔明棋謎題吧！', ko: '난 비유야. 페그 솔리테어 퍼즐에 도전하자!', es: '¡Soy Bille! Probemos unos problemas de solitario.', fr: "Je suis Bille ! Essayons des problèmes de solitaire.", pt: 'Sou a Bille! Vamos tentar uns problemas de resta um.', de: 'Ich bin Bille! Lösen wir ein paar Solitär-Aufgaben.', ru: 'Я Бий! Решим задачи по солитеру.', tr: 'Ben Bille! Birkaç peg solitaire bulmacası çözelim.', id: 'Aku Bille! Ayo coba teka-teki peg solitaire.', hi: 'मैं बिय हूँ! पेग सॉलिटेयर की पहेलियाँ हल करें।', ar: 'أنا بيّ! لنجرّب ألغاز السوليتير.' };
    // reversi (2026-11-12): a move that misses the goal is not stopped — the game is played out, judged at the end; the right line
    // only with 答え (as the full game)
    const RVX = {
      ja: { lb: '答え', fail: '結果は {b}–{w}。お題には届かなかったね…。「やり直し」でもう一度挑戦しよう！ 正解は「答え」で見られるよ。', ans: '正解の手順を見せるね。', done: 'これが正解の手順だよ（結果 {b}–{w}）。「やり直し」で自分でも打ってみよう！' },
      en: { lb: 'Answer', fail: 'It ended {b}–{w} — the goal wasn\'t reached. Tap "Retry" to try again! "Answer" shows the solution.', ans: 'Here is the solution.', done: 'That\'s the solution ({b}–{w}). Tap "Retry" and play it yourself!' },
      zh: { lb: '答案', fail: '结果 {b}–{w}，没有达成目标…点「重来」再挑战一次吧！按「答案」可以看正解。', ans: '给你看正解的手顺。', done: '这就是正解（结果 {b}–{w}）。点「重来」自己下一遍吧！' },
      'zh-TW': { lb: '答案', fail: '結果 {b}–{w}，沒有達成目標…點「重來」再挑戰一次吧！按「答案」可以看正解。', ans: '給你看正解的手順。', done: '這就是正解（結果 {b}–{w}）。點「重來」自己下一遍吧！' },
      ko: { lb: '정답', fail: '결과 {b}–{w}. 목표에 닿지 못했어… "다시"로 한 번 더 도전하자! 정답은 "정답" 버튼으로 볼 수 있어.', ans: '정답 수순을 보여 줄게.', done: '이게 정답 수순이야 (결과 {b}–{w}). "다시"로 직접 두어 보자!' },
    };
    const RVA = Object.assign({}, RVX.en, RVX[ctx.lang] || {});
    const GA = Object.assign({}, GMX.en, GMX[ctx.lang] || {});
    const GO = Object.assign({}, GOX.en, GOX[ctx.lang] || {});
    const CA = Object.assign({}, CKX.en, CKX[ctx.lang] || {});
    const QA = Object.assign({}, XQX.en, XQX[ctx.lang] || {});
    const QB = Object.assign({}, BGX.en, BGX[ctx.lang] || {});

    /* ---------- the guide's panel (the rules tour's .rgd) ---------- */
    const el = document.createElement('div'); el.className = 'rgd pzg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide}" alt=""></div><div class="bub"><div class="nm">${name}<span class="pg"></span></div><div class="tx"></div><div class="rvn" hidden></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}${id === 'reversi' || id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi' || id === 'backgammon' ? `<button type="button" class="btn ghost sm ic" data-a="ans" aria-label="${RVA.lb}" title="${RVA.lb}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><small>${RVA.lb}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    function say(html) {   // typed speech; a tap on the bubble shows it all
      html = String(html).replace(/[ \u00a0]*\u0001/g, '').replace(/\u0002[ \u00a0]*/g, '');   // (ja mark phrases: SP)
      if (id === 'backgammon' && ctx.lang === 'ja' && window.AtlasGuideJa) html = AtlasGuideJa(html, id);   // (ダイスン's own way of talking, atlas/lessons3d.js)
      if (id === 'checkers' && window.Table3D && Table3D.checkers && Table3D.checkers.recolor) html = Table3D.checkers.recolor(html, ctx.lang);   // (黒 / 白 → the chosen set's colours, 2026-11-14)
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 28);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function buttons() {
      const st = cur ? cur.state : 'load';
      $('[data-a=hint]').disabled = st !== 'play';
      $('[data-a=again]').disabled = !cur || st === 'load' || st === 'busy';
      $('[data-a=next]').disabled = !cur || st === 'busy' || st === 'load';
      $('[data-a=next]').classList.toggle('ghost', st === 'play');
      if ($('[data-a=ans]')) $('[data-a=ans]').disabled = !cur || st === 'busy' || st === 'load' || st === 'answer';
    }
    // リバーシ: the discs of each side under the guide's words, kept up after every move (2026-11-12)
    const DSC = c => `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="${c === 1 ? '#1d1f26' : '#fbf7ec'}" stroke="${c === 1 ? '#000' : '#b9b19c'}" stroke-width="1.4"/></svg>`;
    function rvCount() {
      const n = $('.rvn'); if (!n) return; const st = cur && cur.kind === 'rv' && pz() && pz().state && pz().state();
      if (!st) { n.hidden = true; return; }
      const me = cur.me, a = me === 1 ? st.b : st.w, b = me === 1 ? st.w : st.b, T = k => (ctx.t && ctx.t(k)) || '';
      n.hidden = false; n.innerHTML = `<span class="me">${DSC(me)}<small>${esc0(T('p.you') || 'You')}</small><b>${a}</b></span><span class="vs">vs</span><span class="op">${DSC(3 - me)}<small>${esc0(T('p.ai') || 'AI')}</small><b>${b}</b></span>`;
    }
    const esc0 = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function stars(n) { $('.cnt').innerHTML = n ? [1, 2, 3].map(k => STAR(k <= n)).join('') : ''; }
    function head() { $('.pg').textContent = !cur ? '' : cur.daily ? ` · ${ctx.dailyTitle ? ctx.dailyTitle(cur.daily.which) : '★'} · ${+cur.daily.date.slice(5, 7)}/${+cur.daily.date.slice(8)}` : ` · ${cur.set} · No.${cur.j + 1}`; }
    const side = c => c ? X.black : X.white;
    function goal(p) {
      if (p.kind === 'rv') { const c = p.me === 1 ? X.black : X.white, g = p.goal || {}; return fill(g.type === 'wipe' ? X.rv.gWipe : g.type === 'margin' ? X.rv.gMargin : g.type === 'draw' ? X.rv.gDraw : X.rv.gWin, { c, n: g.value }) + ' ' + fill(X.rv.empties, { n: p.n }); }
      if (p.kind === 'tsume') return fill(X.goalTsume, { n: p.n });
      if (p.kind === 'go') return '<b>' + B.tx('pz.goalLine', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n, g: B.tx('pz.goal.' + (p.P.goal || 'kill'), ctx.lang) }) + '</b>';
      if (p.kind === 'ck') return '<b>' + B.tx(p.g ? 'pz.goalGain' : 'pz.goal', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n, g: p.g }) + '</b>';
      if (p.kind === 'xq') return '<b>' + B.tx(p.ck ? 'pz.goalCk' : 'pz.goal', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n }) + '</b>';
      if (p.kind === 'bg') { const v = bgNames(); return '<b>' + (p.cube ? B.tx(p.P.q === 'take' ? 'ls.q.take' : 'ls.q.double', ctx.lang, v) : B.tx('pz.goal', ctx.lang, Object.assign(v, { d: p.P.dice.join('-') }))) + '</b>'; }
      if (p.kind === 'gm') return '<b>' + B.tx('pz.goal', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n }) + '</b>';
      if (p.kind === 'peg') return '<b>' + (BOOK.peg.PT('pz.goal', ctx.lang, { n: p.n }) || '◎') + '</b>';
      if (p.kind === 'tac') return fill(X.goalTac, { c: side(p.me), n: p.n });
      return fill(p.n === 1 ? X.goalMate1 : X.goalMate, { c: side(p.me), n: p.n });
    }

    /* ---------- one puzzle ---------- */
    const pz = () => sess && sess.pz;
    function begin(p, fresh) {
      cur = Object.assign(p, { state: 'load', used: 0, k: 1, hinted: fresh ? false : cur && cur.P === p.P ? cur.hinted : false, failed: fresh ? false : cur && cur.P === p.P ? cur.failed : false, line: [] });
      head(); stars(0); buttons();
      const opts = { ready: () => onReady(p), moved: (u, info) => onMoved(p, u, info) };
      if (sess && p.kind === 'go' && pz() && pz().n !== (p.spec.n || 9)) { sess.stop(); sess = null; }   // (go: another board size — a new board)
      if (!sess) {
        sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
          pz: Object.assign({ bg: p.bg, step: i => cur ? bgStep(cur, i) : true, fen: p.fen, sfen: p.sfen, sol: p.P.sol, cells: p.cells, toMove: p.toMove, me: p.me, start: p.start, spec: p.spec, view: p.view, marks: p.marks, rule: p.kind === 'gm' ? 'renju' : undefined, last: p.last, judge: p.kind === 'gm' ? (p.vcf ? 'vcf' : 'all') : undefined }, { ready: () => cur && cur.ready && cur.ready(), moved: (u, i) => cur && cur.moved && cur.moved(u, i) }) });
        ctx.Table3D.play(true);   // (after start(): the adapter's show() puts its board on the table in the showcase view)
      } else if (p.kind === 'gm') pz().load(p.start, 'renju', p.me, p.last, { judge: p.vcf ? 'vcf' : 'all' });
      else if (p.kind === 'ck' || p.kind === 'xq') pz().load(p.spec, p.me);
      else if (p.kind === 'bg') pz().load(p.bg);
      else if (p.kind === 'go') pz().load(p.spec, p.me, { view: p.view, marks: p.marks });
      else pz().load(p.fen || p.sfen || p.cells, p.P.sol, p.toMove, p.me);
      cur.ready = opts.ready; cur.moved = opts.moved;
      say((first ? (line('hi') || X.hi[id] || (id === 'gomoku' ? GA.hi : id === 'go' ? GO.hi : id === 'checkers' ? CA.hi : id === 'xiangqi' ? QA.hi : id === 'backgammon' ? QB.hi : '') || PEG_HI[ctx.lang] || PEG_HI.en) : line('intro') || '') + ' ' + goal(p)); first = false;
    }
    async function onReady(p) {
      if (p !== cur || stopped) return;
      if (p.kind === 'rv') { rvCount(); if (p.auto) return rvAuto(p); p.state = 'play'; p.ex = pz().exact(); pz().wait(); buttons(); return; }
      if (p.kind === 'gm' && p.auto) return gmAuto(p);
      if (p.kind === 'ck') { const q = pz().pos(); p.base = q ? ckLead(q, p.me) : 0; if (p.auto) return ckAuto(p); }
      if (p.kind === 'xq' && p.auto) return xqAuto(p);
      if (p.kind === 'bg') { bgChoices(p); if (p.auto) return bgAuto(p); p.state = 'play'; if (!p.cube) pz().wait(); buttons(); return; }
      if (p.kind === 'go' && p.auto) return goAuto(p);
      if (p.kind === 'tac') { p.state = 'busy'; buttons(); await sleep(250); if (p !== cur) return; await pz().play(p.P.line[0]); if (p !== cur) return; }
      p.state = 'play'; pz().wait(); buttons();
    }
    function expected(p) {   // the move the stored answer plays now ('' when the line is left / unknown)
      const mv = pz().moves();
      if (p.kind === 'tac') return p.P.line[p.k] || '';
      if (p.kind === 'mate') return mv.length === 0 ? p.P.answer : '';
      if (p.kind === 'peg') { const S = String(p.P.s || '').split(' ').filter(Boolean); return mv.every((u, i) => u === S[i]) ? S[mv.length] || '' : ''; }
      return mv.every((u, i) => u === p.P.sol[i]) ? p.P.sol[mv.length] || '' : '';
    }
    async function onMoved(p, u, info) {
      if (p !== cur || stopped) return;
      p.state = 'busy'; buttons(); pz().mark(null);
      const mv = pz().moves();
      if (p.kind === 'rv') return rvMoved(p, u);
      if (p.kind === 'gm') return gmMoved(p, u, info);
      if (p.kind === 'ck') return ckMoved(p, u, info);
      if (p.kind === 'xq') return xqMoved(p, u, info);
      if (p.kind === 'bg') return bgMoved(p, u);
      if (p.kind === 'go') return goMoved(p, u);
      if (p.kind === 'peg') {   // nothing is judged on the way: only the end counts — one marble left on ◎
        if (!info.over) { p.state = 'play'; pz().wait(); buttons(); return; }
        if (info.left === 1 && info.onGoal) return solved(p);
        p.failed = true; p.state = 'fail'; streak = 0; chime(false);
        say((info.left === 1 ? BOOK.peg.PT('pz.offgoal', ctx.lang) : BOOK.peg.PT('pz.stuck', ctx.lang, { n: info.left })) + ' ' + (line('retry') || X.retry)); buttons(); return;
      }
      if (info.mate) return solved(p);
      // mate puzzles (chess mate in N, 詰将棋): any move may be played — nothing is judged until the N moves are used up;
      // the defender answers each move, and mating within N clears it (the user's rule, 2026-11-10: no "wrong move")
      if (p.kind === 'mate') {
        p.used++;
        if (info.over) return wrong(p, 0, '', line('stuck') || X.wrongNo);
        if (p.used >= p.n) return wrong(p, 0, '', line('out', { n: p.n }) || fill(X.out, { n: p.n }));
        await sleep(120); if (p !== cur) return;
        const r = await pz().best(20); if (p !== cur) return;
        if (!r) return wrong(p, 0, '', line('stuck') || X.wrongNo);
        await pz().play(r); if (p !== cur) return;
        say(line('mid') + ' ' + fill(X.left, { n: p.n - p.used }));
        p.state = 'play'; pz().wait(); buttons(); return;
      }
      if (p.kind === 'tac') {
        const exp = p.P.line[p.k];
        if (u !== exp) return wrong(p, 1, exp, line('tacWrong') || X.wrong);
        p.used++;
        if (p.k + 1 >= p.P.line.length) return solved(p);
        say(pick(X.good) + ' ' + fill(X.left, { n: p.n - p.used }));   // (tactics: the stored line)
        await sleep(120); if (p !== cur) return;
        await pz().play(p.P.line[p.k + 1]); if (p !== cur) return;
        p.k += 2; if (p.k >= p.P.line.length) return solved(p);
        p.state = 'play'; pz().wait(); buttons(); return;
      }
      // 詰将棋 (same rule: no move is judged on the way, only mating within the count clears it)
      const sol = p.P.sol, onLine = mv.every((x, i) => x === sol[i]);
      const remain = p.n - mv.length;
      if (remain <= 0) return wrong(p, 0, '', line('out', { n: p.n }) || fill(X.out, { n: p.n }));
      let reply = onLine && p.P.u && sol[mv.length] ? sol[mv.length] : null;
      if (!reply) { const r = await pz().defend(remain); if (p !== cur) return; reply = r && r.reply; }
      if (!reply) return wrong(p, 0, '', line('stuck') || X.wrongNo);
      await sleep(120); if (p !== cur) return;
      await pz().play(reply); if (p !== cur) return;
      say(line('mid') + ' ' + fill(X.left, { n: Math.ceil((remain - 1) / 2) }));
      p.state = 'play'; pz().wait(); buttons();
    }
    // reversi: the move must keep the goal against the best defence (exact scores, the full game's solver); the opponent then
    // answers with its best move until it is the player's turn again or the game ends — reaching the end solves it.
    // (Simplified from the full game, which lets a missed goal be played out: here a miss is shown at once.)
    const rvMeets = (g, v) => g.type === 'wipe' ? v >= 64 : g.type === 'margin' ? v >= g.value : g.type === 'draw' ? v >= 0 : v > 0;
    const sqN = sq => 'abcdefgh'[sq & 7] + ((sq >> 3) + 1);
    async function rvMoved(p, u) {
      rvCount(); const list = await p.ex; if (p !== cur || stopped) return;
      const mine = (list.find(x => x.move === u) || { score: -99 }).score;
      if (list.length && !rvMeets(p.goal, mine)) p.missed = true;   // (not told yet: played out, judged at the end)
      for (;;) {
        const st = pz().state(); if (st.over) return rvEnd(p);
        if (st.turn === p.me) break;
        await sleep(160); if (p !== cur) return;
        const ol = await pz().exact(); if (p !== cur || stopped) return;
        if (!ol.length) return rvEnd(p);
        const b = ol.reduce((a, x) => x.score > a.score ? x : a, ol[0]);
        await pz().play(b.move); if (p !== cur) return; rvCount();
      }
      const st = pz().state();
      say(fill(X.rv.empties, { n: 64 - st.b - st.w }));
      p.ex = pz().exact(); p.state = 'play'; pz().wait(); buttons();
    }
    function rvEnd(p) {
      const st = pz().state(), d = p.me === 1 ? st.b - st.w : st.w - st.b, me = p.me === 1 ? st.b : st.w, op = p.me === 1 ? st.w : st.b;
      if (p.auto) { p.state = 'answer'; say(fill(RVA.done, { b: me, w: op })); buttons(); return; }
      if (!p.missed && rvMeets(p.goal, d)) return solved(p);
      p.failed = true; p.state = 'fail'; streak = 0; chime(false); rvCount();
      say(fill(RVA.fail, { b: me, w: op })); buttons();
    }
    async function rvAuto(p) {   // 答え: the right line played out from the start (the best move for either side, by the solver)
      p.state = 'busy'; buttons(); say(RVA.ans);
      for (;;) {
        await sleep(650); if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) return rvEnd(p);
        const L = await pz().exact(); if (p !== cur || stopped) return;
        if (!L.length) return rvEnd(p);
        const b = L.reduce((a, x) => x.score > a.score ? x : a, L[0]);
        pz().mark(b.move); await sleep(350); if (p !== cur) return; pz().mark(null);
        await pz().play(b.move); if (p !== cur) return; rvCount();
      }
    }
    /* 詰め連珠 (= gomoku/app.js puzzleMove): an obvious mistake ends it at once (the opponent's five not stopped, VCF without a four, a
       move that is neither four nor three); otherwise the move is played, the defender answers with its longest resistance and the
       player goes on until the count is used up. Winning within it solves it (after leaving the solution line: ★2). */
    const gmLeft = p => p.n - 2 * p.used;
    async function gmMoved(p, m, info) {
      const left = gmLeft(p), nm = pz().name(m), pre = pz().moves().slice(0, -1);
      if (info.winner === p.me) { p.used++; return solved(p); }
      const bl = p.n > 1 ? info.blunder : '';
      if (bl) { p.failed = true; streak = 0; chime(false); pz().mark([[m, 'ng']]); p.state = 'fail'; say(B.tx('pz.bl.' + bl, ctx.lang, { k: '' }) + ' ' + (line('retry') || X.retry)); buttons(); return; }
      say(GA.chk);
      const list = await pz().solve(left, false, pre); if (p !== cur || stopped) return;
      const e = (list || []).find(x => x.m === m), good = !!(e && e.need && e.need <= left);
      p.used++;
      if (p.n <= 1 && !good) {   // 1-move puzzles: judged at once — the move taken back, the winning points shown
        const best = (list || []).filter(x => x.need && x.need <= left).sort((a, b) => a.need - b.need);
        p.failed = true; streak = 0; chime(false); await sleep(450); if (p !== cur) return;
        pz().undo(1); p.used--; pz().mark([...best.slice(0, 3).map(g => [g.m, 'ok']), [m, 'ng']]);
        p.state = 'fail'; say(B.tx('pz.failWhy', ctx.lang, { m: SP('ng', ctx.lang), b: best.length ? SP('ok', ctx.lang) : '—', n: left }) + ' ' + (line('retry') || X.retry)); buttons(); return;
      }
      if (good && e.need === 1) return solved(p);
      if (!good) p.off = true;
      if (gmLeft(p) < 1) return gmOut(p);
      const dl = await pz().solve(Math.max(1, left - 2), true); if (p !== cur || stopped) return;
      const r = await gmDefence(dl || []); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (r === null || r === undefined) return good ? solved(p) : gmOut(p);
      await pz().play(r); if (p !== cur) return;
      if (pz().state().over) return gmOut(p);
      if (p.off && !pz().canAttack(p.vcf)) return gmOut(p);
      say(line('mid') || fill(GA.mid, { n: Math.max(1, gmLeft(p)) }));
      p.state = 'play'; gmWait(p); buttons();
    }
    // the defender: the longest resistance; ties broken by the engine's evaluation (gomoku/app.js pickDefenceBest)
    async function gmDefence(list) {
      const sc = e => e.need === 0 ? 999 : e.need, top = list.length ? Math.max(...list.map(sc)) : 0, tied = list.filter(e => sc(e) === top);
      if (!tied.length) return null; if (tied.length < 2) return tied[0].m;
      const an = await pz().analyze(400), v = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
      return tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a).m;
    }
    function gmOut(p) {
      p.failed = true; p.state = 'fail'; streak = 0; chime(false);
      const pv = String(p.P.pv || p.P.a || '').split(/\s+/).filter(Boolean);
      say(fill(GA.out, { n: p.n }) + ' ' + (line('retry') || X.retry));   // (the first move is not named in coordinates: 答え plays the line) buttons();
    }
    function gmWait(p) { pz().wait(); }
    async function gmAuto(p) {   // 答え: the stored solution line, played out (the defender's replies included)
      p.state = 'busy'; buttons(); say(GA.ans);
      const pv = String(p.P.pv || p.P.a || '').split(/\s+/).filter(Boolean).map(GM_SQ);
      for (const m of pv) { await sleep(650); if (p !== cur || stopped) return; pz().mark(m); await sleep(350); if (p !== cur) return; await pz().play(m); if (p !== cur) return; }
      p.state = 'answer'; say(GA.done); buttons();
    }
    /* 詰碁 (= go/learn.js puzzleMove): the solver judges the move on the position before it; reaching the goal solves it. A move off the
       solution: an obvious mistake (out of the area, hopeless, or the last move) is taken back at once; otherwise the defender answers and the
       player goes on until the count is used up (★2 at best). The defender plays the longest resistance (pass when it has nothing). */
    const goPick = list => { let b = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need; if (!b || v > b.v) b = { m: e.m, v }; } return b ? b.m : pz().pass(); };
    /* 詰めチェッカー (= checkers/app.js puzzleMove, PZBook v2): a move off the solution is not stopped at once — the defender answers
       with the engine's move and the player goes on until the count is used up; reaching the goal within it still counts (★2). An obvious
       mistake (losing at once, a free piece while a correct move gives none, the goal out of reach) is taken back with the right move
       shown. Moves are named by their arrows on the board (no square numbers on the 3D board). */
    const ckLead = (q, me) => q.count(me) - q.count(3 - me);
    const ckReached = (p, q) => q.status() === -1 || (p.g > 0 && !q.hasCaps() && ckLead(q, p.me) - p.base >= p.g);
    const SPM = k => ctx.lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の矢印の手' : '赤い矢印の手') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
    function ckReq(p, n, defend, mvs, at) {   // the solver (checkers/app.js mateReq: the gain still missing when the lead has changed on the way)
      let goal = p.g; const q = at || pz().pos();
      if (goal && !defend && q) goal = Math.max(1, goal - (ckLead(q, p.me) - p.base));
      return pz().puzzle(n, defend, goal, p.base, mvs);
    }
    function ckCoop(p, q, k, bud) {   // defender to move; can the attacker reach the goal within k own moves if the defender helps?
      for (const d of q.moves()) {
        if (--bud.n < 0) return null;
        const r = q.clone().play(d); if (r.status() === -1) continue;
        for (const a of r.moves()) { if (--bud.n < 0) return null; const z = r.clone().play(a); if (ckReached(p, z)) return true; if (k > 1) { const x = ckCoop(p, z, k - 1, bud); if (x !== false) return x; } }
      }
      return false;
    }
    function ckBlunder(p, before, m, list, left) {   // (= checkers/app.js pzBlunder)
      const good = list.filter(x => x.need > 0 && x.need <= left), after = before.clone().play(m);
      if (after.status() !== 0) return null;
      if (after.moves().some(x => after.clone().play(x).status() === -1)) return 'lose';
      if (after.hasCaps() && good.length && good.every(g => !before.clone().play(g.m).hasCaps())) return 'give';
      if (left - 1 >= 1 && left - 1 <= 2 && ckCoop(p, after, left - 1, { n: 200000 }) === false) return 'reach';
      return null;
    }
    async function ckDefence(list) {   // the longest resistance; ties broken by the engine's value (checkers/app.js pzDefence)
      const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...list.map(sc)), tied = list.filter(e => sc(e) === top);
      if (tied.length < 2) return tied[0].m;
      const an = await pz().analyze(500), v = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
      return tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a).m;
    }
    const ckPick = (list, left) => { let b = null; for (const e of list || []) if (e.need > 0 && e.need <= left && (!b || e.need < b.need)) b = e; return b && b.m; };
    function ckOut(p) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(CA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); }
    async function ckMoved(p, m, info) {
      const left = p.n - p.used, before = info.before, pre = pz().moves().slice(0, -1);
      say(B.tx('pz.checking', ctx.lang));
      const list = await ckReq(p, left, false, pre, before); if (p !== cur || stopped) return;
      p.used++;
      if (ckReached(p, pz().pos())) return solved(p);
      const L = list || [], e = L.find(x => x.m === m), good = L.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [[{ m: good[0].m }, 'ok']] : []), [{ m }, 'ng']]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx(p.g ? 'pz.failGain' : 'pz.failWhy', ctx.lang, { m: SPM('ng'), b: SPM('ok'), n: p.n, g: p.g }) : fill(CA.out, { n: p.n }));
        const why = before ? ckBlunder(p, before, m, L, left) : null;
        if (why) return back(B.tx('pz.bl.' + why, ctx.lang, { n: p.n }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: SPM('ok') }) : ''));
        p.failed = true; p.off = true;   // not the solution: played on, the defender answers with the engine's move
        const r = await pz().think(17); if (p !== cur || stopped) return;
        await sleep(250); if (p !== cur) return;
        if (r == null) return ckOut(p);
        await pz().play(r); if (p !== cur) return;
        if (pz().state().over || p.used >= p.n) return ckOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(CA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await ckReq(p, p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = await ckDefence(dl); if (p !== cur || stopped) return;
      await pz().play(r); if (p !== cur) return;
      if (ckReached(p, pz().pos()) && pz().state().turn !== p.me) return solved(p);
      say(line('mid') || fill(CA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    async function ckAuto(p) {   // 答え: the stored first move, then the solver's best line for both sides (checkers/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      for (let step = 0; step < 24; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(), q = pz().pos();
        if (st.over || (step > 0 && ckReached(p, q) && st.turn !== p.me)) break;
        const att = st.turn === p.me, left = p.n - p.used;
        let m = null;
        if (att && step === 0) m = p.P.answer;
        else { const list = await ckReq(p, left, !att); if (p !== cur || stopped) return; m = att ? ckPick(list, left) : list && list.length ? await ckDefence(list) : null; if (p !== cur) return; }
        if (m == null) break;
        await sleep(450); if (p !== cur) return; pz().mark(m); await sleep(450); if (p !== cur) return;
        if (!(await pz().play(m))) break; if (p !== cur) return; if (att) p.used++;
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    /* xiangqi mates (= xiangqi/app.js puzzleMove, PZBook v2): a move off the solution is not stopped at once — the defender answers with
       the engine's move and the player goes on until the count is used up; mating within it still counts (★2). An obvious mistake (getting
       mated at once, or not a check in a checks-only puzzle) is taken back with the right move shown. Moves are named by their arrows. */
    const xqReq = (p, n, defend, mvs) => pz().puzzle(n, defend, p.ck, mvs);
    const xqReached = q => q.status() === -1;
    function xqBlunder(p, before, m) {   // (= xiangqi/app.js pzBlunder)
      const after = before.clone().play(m); if (after.status() !== 0) return null;
      if (p.ck && !after.inCheck()) return 'nock';
      for (const x of after.moves()) if (after.clone().play(x).status() === -1) return 'lose';
      return null;
    }
    const xqPick = (list, left) => { let b = null; for (const e of list || []) if (e.need > 0 && e.need <= left && (!b || e.need < b.need)) b = e; return b && b.m; };
    function xqOut(p) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(QA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); }
    async function xqMoved(p, m, info) {
      const left = p.n - p.used, before = info.before, pre = pz().moves().slice(0, -1);
      say(B.tx('pz.checking', ctx.lang));
      const list = await xqReq(p, left, false, pre); if (p !== cur || stopped) return;
      p.used++;
      if (xqReached(pz().pos())) return solved(p);
      const L = list || [], e = L.find(x => x.m === m), good = L.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [[{ m: good[0].m }, 'ok']] : []), [{ m }, 'ng']]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx('pz.failWhy', ctx.lang, { m: SPM('ng'), b: SPM('ok'), n: p.n }) : fill(QA.out, { n: p.n }));
        const why = before ? xqBlunder(p, before, m) : null;
        if (why) return back(B.tx('pz.bl.' + why, ctx.lang, { n: p.n }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: SPM('ok') }) : ''));
        p.failed = true; p.off = true;   // not the solution: played on, the defender answers with the engine's move
        const r = await pz().think(17); if (p !== cur || stopped) return;
        await sleep(250); if (p !== cur) return;
        if (r == null) return xqOut(p);
        await pz().play(r); if (p !== cur) return;
        if (pz().state().over || p.used >= p.n) return xqOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(QA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await xqReq(p, p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = await ckDefence(dl); if (p !== cur || stopped) return;
      await pz().play(r); if (p !== cur) return;
      say(line('mid') || fill(QA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    async function xqAuto(p) {   // 答え: the stored first move, then the solver's best line for both sides (xiangqi/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      for (let step = 0; step < 24; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state();
        if (st.over) break;
        const att = st.turn === p.me, left = p.n - p.used;
        let m = null;
        if (att && step === 0 && p.P.a != null) m = p.P.a;
        else { const list = await xqReq(p, Math.max(1, left), !att); if (p !== cur || stopped) return; m = att ? xqPick(list, left) : list && list.length ? await ckDefence(list) : null; if (p !== cur) return; }
        if (m == null) break;
        await sleep(450); if (p !== cur) return; pz().mark(m); await sleep(450); if (p !== cur) return;
        if (!(await pz().play(m))) break; if (p !== cur) return; if (att) p.used++;
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    async function goMoved(p, m) {
      const pre = pz().moves().slice(0, -1), left = p.n - p.used;
      say(B.tx('pz.checking', ctx.lang));
      const list = await pz().tsumego(p.Pi, left, false, pre); if (p !== cur || stopped) return;   // (the solver on the position before the move)
      p.used++;
      if (await pz().reached(p.Pi)) { if (p === cur) solved(p); return; }
      if (p !== cur) return;
      const e = (list || []).find(x => x.m === m), good = (list || []).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(450); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [[good[0].m, 'ok']] : []), ...(m >= 0 ? [[m, 'ng']] : [])]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      const bn = () => SP('ok', ctx.lang);   // (marked on the board by back())
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx('pz.failWhy', ctx.lang, { b: bn(good[0].m) }) : fill(GO.out, { n: p.n }));
        const region = new Set(p.Pi.region);
        if (region.size && !region.has(m)) return back(B.tx('pz.bl.away', ctx.lang) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: bn(good[0].m) }) : ''));
        if (e && e.need === 0 && e.hopeless) return back(B.tx('pz.bl.reach', ctx.lang, { n: p.n }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: bn(good[0].m) }) : ''));
        p.failed = true; p.off = true;   // not the solution: played on, the defender answers
        const dl = await pz().tsumego(p.Pi, p.n - p.used, true); if (p !== cur || stopped) return;
        await sleep(300); if (p !== cur) return;
        await pz().play(dl && dl.length ? goPick(dl) : pz().pass()); if (p !== cur) return;
        if (p.used >= p.n) return goOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(GO.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await pz().tsumego(p.Pi, p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(300); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      await pz().play(goPick(dl)); if (p !== cur) return;
      if (await pz().reached(p.Pi)) { if (p === cur) solved(p); return; }
      if (p !== cur) return;
      say(fill(GO.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    function goOut(p) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(GO.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); }   // (the answer is not named in coordinates: 答え plays it)
    async function goAuto(p) {   // 答え: the stored solution line played out
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      const ln = p.Pi.line.length ? p.Pi.line : [p.Pi.answer];
      for (const m of ln) { await sleep(700); if (p !== cur || stopped) return; if (!(await pz().play(m))) break; if (p !== cur) return; }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    async function wrong(p, back, ans, msg) {
      p.failed = true; p.state = 'busy'; buttons(); chime(false);
      say(msg + ' ' + (line('retry') || X.retry)); streak = 0;
      await sleep(700); if (p !== cur) return;
      if (back) pz().undo(back);
      rvCount();
      if (ans || ans === 0) pz().mark(ans);
      p.state = 'fail'; buttons();
    }

    /* ---------- backgammon (2026-11-14, = backgammon/app.js puzzleSubmit / pzAfterStep / pz cube choices) ---------- */
    const bgNames = () => { const ck = bgCk(); return { c: B.tx('ng.' + ck[0], ctx.lang) || ck[0], o: B.tx('ng.' + ck[1], ctx.lang) || ck[1] }; };
    const bgDec = s0 => { const q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(s0[i], 16) || 0; return q; };
    function bgPlays(p) {   // the candidate plays: their checker moves (codes), final position key, equity
      if (p._plays) return p._plays;
      const q0 = bgDec(p.bg.pos);
      return (p._plays = p.P.plays.map(([m, e]) => { const q = q0.slice(), mv = []; for (let i = 0; i < m.length; i += 2) mv.push(BG.apply(q, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65)); return { moves: mv, key: BG.key(q), e }; }));
    }
    const bgN = () => ctx.lang === 'ja' ? '緑の矢印の手' : '<i class="ls-spot ok"></i>';   // (the 3D board has no point numbers: the move is its green arrows)
    function bgWhy(p, mine, mineSteps) {   // what the position asks for, then what the best play is for (and what yours gives up)
      const P = p.P, out = []; if (P.sit) out.push(B.tx(P.sit[0], ctx.lang, P.sit[1]));
      let teach = '';
      if (!p.cube && window.BGX && BGX.teach && window.AtlasBgTeach && AtlasBgTeach.html) {
        try { const L = bgPlays(p), q0 = bgDec(p.bg.pos), mk = mv => { const q = q0.slice(); mv.forEach(c => BG.apply(q, 0, BG.mvFrom(c), BG.mvTo(c))); return { moves: mv, pos: q }; };
          const mineP = mineSteps ? mk(mineSteps) : mine > 0 && L[mine] ? mk(L[mine].moves) : null;
          teach = AtlasBgTeach.html(BGX.teach(q0, 0, mk(L[0].moves), mineP), (k, v) => B.tx(k, ctx.lang, v), false, true); } catch (e) { console.warn(e); }
      }
      return (out.length ? '<br><small>' + out.join('<br>') + '</small>' : '') + teach;
    }
    function bgReach(q, left, used, dice) {   // the final positions a part-played roll can still reach
      const out = new Set(), seen = new Set();
      const rec = (q, left, used) => { const k = BG.key(q) + left.join(''); if (seen.has(k)) return; seen.add(k);
        const st = BG.legalSteps(q, 0, left, dice, used); if (!st.length) { out.add(BG.key(q)); return; }
        for (const x of st) { const r = q.slice(); BG.apply(r, 0, x.from, x.to); const i = left.indexOf(x.die); rec(r, left.slice(0, i).concat(left.slice(i + 1)), used + 1); } };
      rec(q, left, used); return out;
    }
    function bgStep(p, info) {   // after each checker: an obvious mistake (no candidate play can be reached any more) stops it there
      if (p !== cur || p.cube || p.state !== 'play') return true;
      const L = bgPlays(p).slice(0, 6), R = bgReach(Int8Array.from(info.pos), info.left, info.used, info.dice);
      if (L.some(x => R.has(x.key))) { const n = BG.maxUse(Int8Array.from(info.pos), 0, info.left); if (n) say(fill(QB.mid, { n })); return true; }
      later(() => bgFail(p, info.steps, true), 350);
      return false;
    }
    async function bgFail(p, mine, blunder) {
      if (p !== cur) return; const L = bgPlays(p), k = mine && L.findIndex(x => x.moves.join() === mine.join()), myE = k >= 0 ? L[k].e : null;
      p.failed = true; p.state = 'fail'; streak = 0; chime(false); buttons();
      pz().reset(); pz().mark([{ play: L[0].moves, cls: 'ok' }, { play: mine, cls: 'ng' }]);
      say(`${blunder ? (line('wrong') || X.wrongNo) : B.tx('pz.fail', ctx.lang)} ${B.tx('pz.failWhy', ctx.lang, { m: bgN(L[0].moves), l: myE == null ? '>' + (L[0].e - L[L.length - 1].e).toFixed(3) : (L[0].e - myE).toFixed(3) })} ` + (line('retry') || X.retry) + bgWhy(p, k, mine));
    }
    function bgMoved(p, u) {
      if (p !== cur || stopped) return; const L = bgPlays(p), mine = L.findIndex(x => x.key === u.key);
      if (mine === 0 || (mine > 0 && L[mine].e >= L[0].e - 0.004)) { solved(p); const n = p.answered ? 1 : p.hinted || p.failed ? 2 : 3; say((n === 3 ? line('solved') || pick(X.solved) : X.solvedHelp) + ' ' + B.tx('pz.solvedSub', ctx.lang, { m: bgN(L[0].moves), g: L[1] ? (L[0].e - L[1].e).toFixed(3) : '—' }) + bgWhy(p, 0)); return; }
      const steps = u.steps.slice(); bgFail(p, steps, false);
    }
    function bgChoices(p) {   // the cube's decision buttons under the guide's words
      let box = $('.bgch'); if (!box) { box = document.createElement('div'); box.className = 'bgch'; $('.bub').insertBefore(box, $('.cnt')); }
      if (!p.cube) { box.innerHTML = ''; box.hidden = true; return; }
      const v = bgNames(); box.hidden = false;
      box.innerHTML = p.P.opts.map((o, i) => `<button type="button" class="btn sm" data-ci="${i}">${esc0(B.tx('ls.opt.' + o, ctx.lang, v) || o)}</button>`).join('');
      box.onclick = e => { const b = e.target.closest('[data-ci]'); if (!b || p !== cur || p.state !== 'play') return; const i = +b.dataset.ci, a = B.tx('ls.opt.' + p.P.opts[p.P.ans], ctx.lang, v);
        box.querySelectorAll('button').forEach((x, k) => { x.disabled = true; x.classList.toggle('ok', k === p.P.ans); x.classList.toggle('ng', k === i && i !== p.P.ans); });
        if (i === p.P.ans) { solved(p); say((line('solved') || pick(X.solved)) + ' ' + B.tx('pz.cubeAns', ctx.lang, { a }) + bgWhy(p, 0)); }
        else { p.failed = true; p.state = 'fail'; streak = 0; chime(false); buttons(); say(B.tx('pz.fail', ctx.lang) + ' ' + B.tx('pz.cubeAns', ctx.lang, { a }) + bgWhy(p, -1) + ' ' + (line('retry') || X.retry)); } };
    }
    async function bgAuto(p) {   // 答え: the best play, checker by checker (the cube: the right decision lit)
      p.state = 'busy'; buttons();
      if (p.cube) { const v = bgNames(), a = B.tx('ls.opt.' + p.P.opts[p.P.ans], ctx.lang, v); const box = $('.bgch'); if (box) box.querySelectorAll('button').forEach((x, k) => { x.disabled = true; x.classList.toggle('ok', k === p.P.ans); }); say(B.tx('pz.cubeAns', ctx.lang, { a }) + bgWhy(p, -1)); p.state = 'answer'; buttons(); return; }
      say(B.tx('pz.showing', ctx.lang)); const L = bgPlays(p);
      await sleep(500); if (p !== cur) return;
      await pz().play(L[0].moves); if (p !== cur) return;
      say(B.tx('pz.answerDone', ctx.lang, { m: bgN(L[0].moves) }) + bgWhy(p, 0)); p.state = 'answer'; buttons();
    }
    function solved(p) {
      const n = p.answered ? 1 : p.hinted || p.failed || p.off ? 2 : 3;   // (★3 first try · ★2 after a hint, a miss or leaving the line · ★1 after the answer — gomoku/app.js PZBook.starsFor)
      p.state = 'solved'; chime(true); stars(n);
      if (p.daily) { dailySolved(p, p.hinted || p.failed); if (id === 'checkers' || id === 'xiangqi' || id === 'backgammon') B.save(p, n, true); if (id === 'reversi') { const pr = B.pr(); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } if (id === 'chess') { const pr = store.get(B.KEY, {}); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } if (id === 'go') { const pr = store.get(B.KEY, {}), v = pr[p.rk]; pr[p.rk] = Math.max(v === true ? 3 : +v || 0, n); store.set(B.KEY, pr); } }   // (as the full games: chess also keeps the stars, shogi only the streak)
      else B.save(p, n);
      streak = n === 3 ? streak + 1 : 0;
      say(n === 3 ? (streak >= 3 && line('streak', { n: streak })) || line('solved') || pick(X.solved) : line('help') || X.solvedHelp);
      buttons();
      if (window.AtlasConfetti) try { AtlasConfetti(60); } catch (e) {}
    }
    async function hint() {
      const p = cur; if (!p || p.state !== 'play') return;
      if (p.kind === 'go') {   // the area of the key move (its diagonal neighbours), not the move itself (go/learn.js pzHint)
        p.state = 'busy'; buttons(); const L = await pz().tsumego(p.Pi, p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const g = (L || []).filter(x => x.need > 0 && x.need <= p.n - p.used)[0]; if (!g) return;
        const N = p.spec.n, x0 = g.m % N, y0 = Math.floor(g.m / N), mk = [];
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { const xx = x0 + dx, yy = y0 + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) mk.push([yy * N + xx, 'hl']); }
        p.hinted = true; pz().mark(mk); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'bg') {   // the checkers the best play moves (rings), the position's theme in words (backgammon/app.js pzHint)
        p.hinted = true;
        if (p.cube) { say(B.tx('ls.' + (p.P.q === 'take' ? 'takepoint' : 'racecube') + '.hint', ctx.lang)); return; }
        const L = bgPlays(p), fr = [...new Set(L[0].moves.map(c => BG.mvFrom(c)))];
        pz().reset(); pz().mark(fr.map(f => ({ from: f, cls: 'ring' }))); pz().wait();
        say(B.tx('pz.hintText', ctx.lang, { n: fr.length }) + (p.P.sit ? ' ' + B.tx(p.P.sit[0], ctx.lang, p.P.sit[1]) : p.P.theme ? ' ' + B.tx('pz.themeHint.' + p.P.theme, ctx.lang) : '')); return;
      }
      if (p.kind === 'xq') {   // the pieces to move (gold rings), not the whole move (xiangqi/app.js pzHint)
        p.state = 'busy'; buttons(); const L = await xqReq(p, p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const E = pz().engine(), good = (L || []).filter(x => x.need > 0 && x.need <= p.n - p.used); if (!good.length || !E) return;
        p.hinted = true; pz().mark([...new Set(good.map(x => E.mFrom(x.m)))].map(q => [q, 'ring'])); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'ck') {   // the pieces to move (gold rings), not the whole move (checkers/app.js pzHint)
        p.state = 'busy'; buttons(); const L = await ckReq(p, p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const E = pz().engine(), good = (L || []).filter(x => x.need > 0 && x.need <= p.n - p.used); if (!good.length || !E) return;
        p.hinted = true; pz().mark([...new Set(good.map(x => E.mFrom(x.m)))].map(q => [q, 'ring'])); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'gm') {   // a small area round the winning moves, not the point itself (gomoku/app.js pzHint)
        p.state = 'busy'; buttons(); const L = await pz().solve(gmLeft(p)); if (p !== cur) return; p.state = 'play'; gmWait(p); buttons();
        const good = (L || []).filter(x => x.need && x.need <= gmLeft(p)), mk = new Map(), occ = new Set(pz().moves().concat(p.start.b, p.start.w));
        for (const g of good) { const c = g.m % 15, r = Math.floor(g.m / 15); for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) { const cc = c + dc, rr = r + dr, q = rr * 15 + cc; if (cc >= 0 && cc < 15 && rr >= 0 && rr < 15 && !occ.has(q)) mk.set(q, 'hl'); } }
        p.hinted = true; pz().mark([...mk]); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'rv') { p.state = 'busy'; buttons(); const L = await p.ex; if (p !== cur) return; p.state = 'play'; buttons(); if (!L.length) return; const b = L.reduce((a, x) => x.score > a.score ? x : a, L[0]); p.hinted = true; pz().mark(b.move); say(line('hint') || X.hintSay); return; }
      let u = expected(p);
      if (!u && p.kind === 'tsume') { p.hinted = true; if (sess.canHint && sess.canHint()) { sess.hint(); say(line('hint') || X.hintSay); } return; }   // off the stored line: the engine's move
      if (!u && p.kind === 'peg') { p.state = 'busy'; buttons(); u = await pz().best(); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons(); if (!u) { say(BOOK.peg.PT('msg.dead', ctx.lang) || X.wrongNo); return; } }
      if (!u && p.kind === 'mate') { p.state = 'busy'; buttons(); u = await pz().best(20); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons(); }
      if (!u) return;
      p.hinted = true; pz().mark(u); say(line('hint') || X.hintSay);
    }
    function nextPuzzle() {
      const sets = B.sets(), p = cur;
      if (p && !p.daily) { const s = sets[p.i], j = p.j + 1; if (j < s.recs.length && stageOpen(s.recs, j) && !s.recs[j]) return begin(B.problem(p.i, j, X, ctx.lang), true); }
      const r = resume(sets, p && !p.daily ? p.i : B.lastKey ? B.lastKey() : store.raw(B.LAST));
      if (!r) { say(line('allDone') || X.allDone); if (p) { p.state = 'solved'; buttons(); } return; }
      begin(B.problem(r.key, r.j, X, ctx.lang), true);
    }
    $('[data-a=hint]').onclick = hint;
    if ($('[data-a=list]')) $('[data-a=list]').onclick = () => ctx.onList();   // 一覧 (the portal's list sheet: pick another problem)
    $('[data-a=again]').onclick = () => { if (!cur) return; begin(cur.daily && (cur.kind === 'peg' || cur.kind === 'ck' || cur.kind === 'xq' || cur.kind === 'bg') ? dailyProblem(id, cur.daily.which, X, ctx.lang) : B.problem(cur.i, cur.j, X, ctx.lang), false); const a = line('again'); if (a) say(a + ' ' + goal(cur)); };
    $('[data-a=next]').onclick = () => nextPuzzle();
    if ($('[data-a=ans]')) $('[data-a=ans]').onclick = () => { if (!cur || (cur.kind !== 'rv' && cur.kind !== 'gm' && cur.kind !== 'go' && cur.kind !== 'ck' && cur.kind !== 'xq' && cur.kind !== 'bg')) return; const np = cur.daily && (cur.kind === 'ck' || cur.kind === 'xq' || cur.kind === 'bg') ? dailyProblem(id, cur.daily.which, X, ctx.lang) : B.problem(cur.i, cur.j, X, ctx.lang); np.auto = true; begin(np, false); cur.failed = true; cur.answered = true; };

    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); buttons();
    loadBook(id).then(b => { if (stopped) return; B = b;
      const d = ctx.daily && dailyProblem(id, ctx.daily, X, ctx.lang);   // 今日の詰将棋 / やさしい詰将棋 / 今日のパズル
      if (d) return begin(d, true);
      if (ctx.pick && B.sets()[ctx.pick.i]) return begin(B.problem(ctx.pick.i, ctx.pick.j, X, ctx.lang), true);   // one chosen in 問題一覧
      nextPuzzle(); }).catch(() => { if (!stopped) say('⚠'); });

    const dbg = { state: () => cur && { kind: cur.kind, i: cur.i, j: cur.j, state: cur.state, used: cur.used, k: cur.k, answer: cur.P.answer || (cur.P.a != null ? cur.P.a : 0) || cur.P.line || cur.P.sol || cur.P.s || (cur.P.plays && cur.P.plays[0][0]), bg: cur.bg, cube: cur.cube, moves: pz() ? pz().moves() : [], say: $('.tx').textContent }, go: (i, j) => begin(B.problem(i, j, X, ctx.lang), true), ex: () => cur && cur.ex, user: async u => { const p = cur; await pz().play(u); onMoved(p, u, {}); } };
    window.__atlasPz = dbg;   // (test hook)
    return {
      stop() { stopped = true; if (window.__atlasPz === dbg) delete window.__atlasPz; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  // the raw collection for the portal's illustrated 問題一覧 (atlas/app.js tsumeBook): the sets, each set's problems as the
  // full game lists them (pinned old / new versions), the daily picks
  const book = id => loadBook(id).then(B => ({ sets: B.sets(), data: B.data, problems: i => id === 'shogi' ? B.list(B.data.sets[i], B.stars()) : id === 'peg' ? B.data.themes[i].list : B.data.levels[i].puzzles, daily: w => dailyPick(id, w), LAST: B.LAST, DAILY: DAILY[id] }));
  // today's puzzle solved? (the card's ✓, 2026-11-13) — the full games' own daily stores
  function done(id, which) {
    const D = DAILY[id]; if (!D) return false; const k = D[which] || D.d1, o = store.get(k, null) || {}, today = ymd(new Date());
    if (id === 'peg' && which === 'd2') return !!(o.easy && o.easy[today]);
    return !!(o.days && o.days[today]);
  }
  window.AtlasPuzzles = { has: id => !!G[id], start, G, sets: setsOf, cats: catsOf, book, done };   // (G: the guides — atlas/lessons3d.js too)
})();
