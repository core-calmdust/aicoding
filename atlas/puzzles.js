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
    shogi: { guide: '../images/atlas/g-shogi.webp', name: { ja: 'ショウギツネ', en: 'Shogitsune', zh: '将棋狐', ko: '쇼기여우', es: 'Shogizorro', fr: 'Shogirenard', pt: 'Shogiraposa', de: 'Shogifuchs', hi: 'शोगी लोमड़ी', ar: 'ثعلب الشوغي', ru: 'Сёгицунэ', 'zh-TW': '將棋狐', id: 'Shogitsune', tr: 'Shogitsune' } },
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
  /* ---------- the daily puzzles: the same problem of the day as the full games, and their streak record ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY = { chess: { d1: 'aicoding-chess-daily' }, shogi: { d1: 'shogi-kaya-daily', d2: 'shogi-kaya-daily-easy' } };
  function dailyPick(id, which) {
    const B = BOOK[id], now = new Date(), date = ymd(now), wd = now.getDay(), day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
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
    else { const g = B.data.sets[d.i], P = (g.base || g.problems)[d.j]; p = { i: d.i, j: d.j, P, sfen: P.sfen, kind: 'tsume', n: P.n, count: g.problems.length, set: (g.title && (g.title[lang] || g.title.en)) || g.id }; }
    p.daily = { date: d.date, key: DAILY[id][which] || DAILY[id].d1, which };
    return p;
  }
  function dailySolved(p, hinted) {   // (the full games' dailySolved: the streak)
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
      const title = id === 'chess' ? B.problem(x.key, 0, X).set : ((g => (g.title && (g.title[lang] || g.title.en)) || g.id)(B.data.sets[x.key]));
      return { key: x.key, title, cat: x.cat, recs: x.recs, open: x.recs.map((_, j) => stageOpen(x.recs, j)), stage: STAGE };
    }));
  }

  function loadBook(id) {
    const B = BOOK[id]; if (B.data) return Promise.resolve(B);
    return B.p || (B.p = fetch(B.url).then(r => r.json()).then(d => { B.data = id === 'shogi' ? B.prep(d) : d; return B; }).catch(e => { B.p = null; throw e; }));
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
.pzst.on:nth-child(2){animation-delay:.12s}.pzst.on:nth-child(3){animation-delay:.24s}`;
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

    /* ---------- the guide's panel (the rules tour's .rgd) ---------- */
    const el = document.createElement('div'); el.className = 'rgd pzg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide}" alt=""></div><div class="bub"><div class="nm">${name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="hint">💡 ${X.hint}</button><button type="button" class="btn ghost sm" data-a="again">↻ ${X.again}</button><span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
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
    }
    function stars(n) { $('.cnt').innerHTML = n ? [1, 2, 3].map(k => STAR(k <= n)).join('') : ''; }
    function head() { $('.pg').textContent = !cur ? '' : cur.daily ? ` · ${ctx.dailyTitle ? ctx.dailyTitle(cur.daily.which) : '★'} · ${+cur.daily.date.slice(5, 7)}/${+cur.daily.date.slice(8)}` : ` · ${cur.set} · No.${cur.j + 1}`; }
    const side = c => c ? X.black : X.white;
    function goal(p) {
      if (p.kind === 'tsume') return fill(X.goalTsume, { n: p.n });
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
          pz: Object.assign({ fen: p.fen, sfen: p.sfen, sol: p.P.sol }, { ready: () => cur && cur.ready && cur.ready(), moved: (u, i) => cur && cur.moved && cur.moved(u, i) }) });
        ctx.Table3D.play(true);   // (after start(): the adapter's show() puts its board on the table in the showcase view)
      } else pz().load(p.fen || p.sfen, p.P.sol);
      cur.ready = opts.ready; cur.moved = opts.moved;
      say((first ? (line('hi') || X.hi[id]) : line('intro')) + ' ' + goal(p)); first = false;
    }
    async function onReady(p) {
      if (p !== cur || stopped) return;
      if (p.kind === 'tac') { p.state = 'busy'; buttons(); await sleep(250); if (p !== cur) return; await pz().play(p.P.line[0]); if (p !== cur) return; }
      p.state = 'play'; pz().wait(); buttons();
    }
    function expected(p) {   // the move the stored answer plays now ('' when the line is left / unknown)
      const mv = pz().moves();
      if (p.kind === 'tac') return p.P.line[p.k] || '';
      if (p.kind === 'mate') return mv.length === 0 ? p.P.answer : '';
      return mv.every((u, i) => u === p.P.sol[i]) ? p.P.sol[mv.length] || '' : '';
    }
    async function onMoved(p, u, info) {
      if (p !== cur || stopped) return;
      p.state = 'busy'; buttons(); pz().mark(null);
      const mv = pz().moves();
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
    async function wrong(p, back, ans, msg) {
      p.failed = true; p.state = 'busy'; buttons(); chime(false);
      say(msg + ' ' + (line('retry') || X.retry)); streak = 0;
      await sleep(700); if (p !== cur) return;
      if (back) pz().undo(back);
      if (ans) pz().mark(ans);
      p.state = 'fail'; buttons();
    }
    function solved(p) {
      const n = p.hinted || p.failed ? 2 : 3;
      p.state = 'solved'; chime(true); stars(n);
      if (p.daily) { dailySolved(p, p.hinted || p.failed); if (id === 'chess') { const pr = store.get(B.KEY, {}); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } }   // (as the full games: chess also keeps the stars, shogi only the streak)
      else B.save(p, n);
      streak = n === 3 ? streak + 1 : 0;
      say(n === 3 ? (streak >= 3 && line('streak', { n: streak })) || line('solved') || pick(X.solved) : line('help') || X.solvedHelp);
      buttons();
      if (window.AtlasConfetti) try { AtlasConfetti(60); } catch (e) {}
    }
    async function hint() {
      const p = cur; if (!p || p.state !== 'play') return;
      let u = expected(p);
      if (!u && p.kind === 'tsume') { p.hinted = true; if (sess.canHint && sess.canHint()) { sess.hint(); say(line('hint') || X.hintSay); } return; }   // off the stored line: the engine's move
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
    $('[data-a=again]').onclick = () => { if (!cur) return; begin(B.problem(cur.i, cur.j, X, ctx.lang), false); const a = line('again'); if (a) say(a + ' ' + goal(cur)); };
    $('[data-a=next]').onclick = () => nextPuzzle();

    requestAnimationFrame(() => el.classList.add('on'));
    say(X.loading); buttons();
    loadBook(id).then(b => { if (stopped) return; B = b;
      const d = ctx.daily && dailyProblem(id, ctx.daily, X, ctx.lang);   // 今日の詰将棋 / やさしい詰将棋 / 今日のパズル
      if (d) return begin(d, true);
      if (ctx.pick && B.sets()[ctx.pick.i]) return begin(B.problem(ctx.pick.i, ctx.pick.j, X, ctx.lang), true);   // one chosen in 問題一覧
      nextPuzzle(); }).catch(() => { if (!stopped) say('⚠'); });

    const dbg = { state: () => cur && { kind: cur.kind, i: cur.i, j: cur.j, state: cur.state, used: cur.used, k: cur.k, answer: cur.P.answer || cur.P.line || cur.P.sol, moves: pz() ? pz().moves() : [], say: $('.tx').textContent }, go: (i, j) => begin(B.problem(i, j, X, ctx.lang), true) };
    window.__atlasPz = dbg;   // (test hook)
    return {
      stop() { stopped = true; if (window.__atlasPz === dbg) delete window.__atlasPz; clearInterval(typeT); timers.forEach(clearTimeout); if (sess) sess.stop(); sess = null; el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasPuzzles = { has: id => !!G[id], start, G, sets: setsOf };   // (G: the guides — atlas/lessons3d.js too)
})();
