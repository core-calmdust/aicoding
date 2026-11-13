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
  // peg solitaire (2026-11-13): 'board:pegs:goal' (peg/puzzles.json b · p · t) on the board's own hole layout (PegEngine)
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
    url: '../peg/puzzles.json?v=2', KEY: 'aicoding-peg-pz', LAST: 'aicoding-peg-pz-last', data: null,
    prep(d) { const by = id => (d.themes.find(T => T.id === id) || { list: [] }).list, out = [];
      out.push({ id: 'first', grp: 'basic', list: by('first') }, { id: 'shape', grp: 'basic', list: by('shape') }, { id: 'mid', grp: 'basic', list: by('mid') }, { id: 'chain', grp: 'basic', list: by('chain') });
      for (const b of ['triangle', 'french', 'diamond', 'german']) out.push({ id: 'w-' + b, grp: 'world', board: b, list: by('world').filter(P => P.b === b) });
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
  /* ---------- the daily puzzles: the same problem of the day as the full games, and their streak record ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY = { reversi: { d1: 'reversi-emerald-daily' }, chess: { d1: 'aicoding-chess-daily' }, shogi: { d1: 'shogi-kaya-daily', d2: 'shogi-kaya-daily-easy' }, peg: { d1: 'aicoding-peg-daily', d2: 'aicoding-peg-daily' } };
  function dailyPick(id, which) {
    const B = BOOK[id], now = new Date(), date = ymd(now), wd = now.getDay(), day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
    if (id === 'reversi') {   // (reversi/index.html dailyPick: Mon–Tue level 2, Wed–Thu 3, Fri–Sat 4, Sun 5)
      const D = B.data; if (!D || D.levels.length < 5) return null;
      const li = wd === 0 ? 4 : wd <= 2 ? 1 : wd <= 4 ? 2 : 3;
      let h = day * 2654435761 >>> 0; h ^= h >>> 15;
      return { date, i: li, j: (h >>> 0) % D.levels[li].puzzles.length };
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
    else if (id === 'reversi') p = B.problem(d.i, d.j, X, lang);
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
    return B.p || (B.p = Promise.all([fetch(B.url).then(r => r.json()), id === 'peg' ? fetch('../peg/daily.json?v=2').then(r => r.json()).catch(() => null) : null]).then(([d, dl]) => { B.data = id === 'shogi' || id === 'peg' ? B.prep(d) : d; if (id === 'peg') B.daily = dl; return B; }).catch(e => { B.p = null; throw e; }));
  }

  /* ---------- sounds ---------- */
  const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
  function chime(ok) {
    const C = ac(); if (!C) return; const t = C.currentTime, F = ok ? [523, 659, 784, 1047] : [392, 330];
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
    s.textContent = `.rgd.pzg .rgd-act{gap:8px}.rgd.pzg .rgd-act .sp{flex:1}
.rgd.pzg .nm .pg{font-weight:800}
.rgd.pzg .cnt{display:flex;align-items:center;gap:2px;min-height:0}
.pzst{width:22px;height:22px;fill:#e6dccb;stroke:none}.pzst.on{fill:#ffb81c;filter:drop-shadow(0 1px 0 #c98400)}
@keyframes pzPop{0%{transform:scale(.2)}70%{transform:scale(1.25)}100%{transform:scale(1)}}.pzst.on{animation:pzPop .4s cubic-bezier(.3,1.5,.5,1) both}
.pzst.on:nth-child(2){animation-delay:.12s}.pzst.on:nth-child(3){animation-delay:.24s}
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

    /* ---------- the guide's panel (the rules tour's .rgd) ---------- */
    const el = document.createElement('div'); el.className = 'rgd pzg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide}" alt=""></div><div class="bub"><div class="nm">${name}<span class="pg"></span></div><div class="tx"></div><div class="rvn" hidden></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}${id === 'reversi' ? `<button type="button" class="btn ghost sm ic" data-a="ans" aria-label="${RVA.lb}" title="${RVA.lb}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><small>${RVA.lb}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    function say(html) {   // typed speech; a tap on the bubble shows it all
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
      if (!sess) {
        sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
          pz: Object.assign({ fen: p.fen, sfen: p.sfen, sol: p.P.sol, cells: p.cells, toMove: p.toMove, me: p.me }, { ready: () => cur && cur.ready && cur.ready(), moved: (u, i) => cur && cur.moved && cur.moved(u, i) }) });
        ctx.Table3D.play(true);   // (after start(): the adapter's show() puts its board on the table in the showcase view)
      } else pz().load(p.fen || p.sfen || p.cells, p.P.sol, p.toMove, p.me);
      cur.ready = opts.ready; cur.moved = opts.moved;
      say((first ? (line('hi') || X.hi[id] || PEG_HI[ctx.lang] || PEG_HI.en) : line('intro') || '') + ' ' + goal(p)); first = false;
    }
    async function onReady(p) {
      if (p !== cur || stopped) return;
      if (p.kind === 'rv') { rvCount(); if (p.auto) return rvAuto(p); p.state = 'play'; p.ex = pz().exact(); pz().wait(); buttons(); return; }
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
    async function wrong(p, back, ans, msg) {
      p.failed = true; p.state = 'busy'; buttons(); chime(false);
      say(msg + ' ' + (line('retry') || X.retry)); streak = 0;
      await sleep(700); if (p !== cur) return;
      if (back) pz().undo(back);
      rvCount();
      if (ans || ans === 0) pz().mark(ans);
      p.state = 'fail'; buttons();
    }
    function solved(p) {
      const n = p.hinted || p.failed ? 2 : 3;
      p.state = 'solved'; chime(true); stars(n);
      if (p.daily) { dailySolved(p, p.hinted || p.failed); if (id === 'reversi') { const pr = B.pr(); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } if (id === 'chess') { const pr = store.get(B.KEY, {}); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } }   // (as the full games: chess also keeps the stars, shogi only the streak)
      else B.save(p, n);
      streak = n === 3 ? streak + 1 : 0;
      say(n === 3 ? (streak >= 3 && line('streak', { n: streak })) || line('solved') || pick(X.solved) : line('help') || X.solvedHelp);
      buttons();
      if (window.AtlasConfetti) try { AtlasConfetti(60); } catch (e) {}
    }
    async function hint() {
      const p = cur; if (!p || p.state !== 'play') return;
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
      const r = resume(sets, p && !p.daily ? p.i : store.raw(B.LAST));
      if (!r) { say(line('allDone') || X.allDone); if (p) { p.state = 'solved'; buttons(); } return; }
      begin(B.problem(r.key, r.j, X, ctx.lang), true);
    }
    $('[data-a=hint]').onclick = hint;
    if ($('[data-a=list]')) $('[data-a=list]').onclick = () => ctx.onList();   // 一覧 (the portal's list sheet: pick another problem)
    $('[data-a=again]').onclick = () => { if (!cur) return; begin(cur.daily && cur.kind === 'peg' ? dailyProblem(id, cur.daily.which, X, ctx.lang) : B.problem(cur.i, cur.j, X, ctx.lang), false); const a = line('again'); if (a) say(a + ' ' + goal(cur)); };
    $('[data-a=next]').onclick = () => nextPuzzle();
    if ($('[data-a=ans]')) $('[data-a=ans]').onclick = () => { if (!cur || cur.kind !== 'rv') return; const np = B.problem(cur.i, cur.j, X, ctx.lang); np.auto = true; begin(np, false); cur.failed = true; };

    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); buttons();
    loadBook(id).then(b => { if (stopped) return; B = b;
      const d = ctx.daily && dailyProblem(id, ctx.daily, X, ctx.lang);   // 今日の詰将棋 / やさしい詰将棋 / 今日のパズル
      if (d) return begin(d, true);
      if (ctx.pick && B.sets()[ctx.pick.i]) return begin(B.problem(ctx.pick.i, ctx.pick.j, X, ctx.lang), true);   // one chosen in 問題一覧
      nextPuzzle(); }).catch(() => { if (!stopped) say('⚠'); });

    const dbg = { state: () => cur && { kind: cur.kind, i: cur.i, j: cur.j, state: cur.state, used: cur.used, k: cur.k, answer: cur.P.answer || cur.P.line || cur.P.sol || cur.P.s, moves: pz() ? pz().moves() : [], say: $('.tx').textContent }, go: (i, j) => begin(B.problem(i, j, X, ctx.lang), true), ex: () => cur && cur.ex, user: async u => { const p = cur; await pz().play(u); onMoved(p, u, {}); } };
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
