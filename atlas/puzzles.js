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
    hex: { guide: '../images/atlas/g-stone.webp', name: { ja: 'ゴイシペン', en: 'Stoneguin', zh: '棋石企鹅', ko: '바둑돌펭', es: 'Pingüipiedra', fr: 'Pingopierre', pt: 'Pinguipedra', de: 'Steinguin', hi: 'स्टोनगुइन', ar: 'بطريق الحجر', ru: 'Стоунгвин', 'zh-TW': '棋子企鵝', id: 'Stoneguin', tr: 'Stoneguin' } },
    checkers: { guide: '../images/atlas/g-crab.webp', name: { ja: 'チェッカニ', en: 'Checkrab', zh: '跳棋蟹', ko: '체카니', es: 'Checkrab', fr: 'Checkrab', pt: 'Checkrab', de: 'Checkrab', hi: 'चेकरैब', ar: 'تشيكراب', ru: 'Чекраб', 'zh-TW': '跳棋蟹', id: 'Checkrab', tr: 'Checkrab' } },
    janggi: { guide: '../images/atlas/g-shogi.webp', name: { ja: 'ショウギツネ', en: 'Shogitsune', zh: '将棋狐', ko: '쇼기츠네', es: 'Shogitsune', fr: 'Shogitsune', pt: 'Shogitsune', de: 'Shogitsune', hi: 'शोगित्सुने', ar: 'شوغيتسوني', ru: 'Сёгицунэ', 'zh-TW': '將棋狐', id: 'Shogitsune', tr: 'Shogitsune' } },   // (the janggi guide = atlas/rules/janggi.js, 2026-11-24)
    xiangqi: { guide: '../images/atlas/g-shogi.webp', name: { ja: 'ショウギツネ', en: 'Shogitsune', zh: '将棋狐', ko: '쇼기여우', es: 'Shogizorro', fr: 'Shogirenard', pt: 'Shogiraposa', de: 'Shogifuchs', hi: 'शोगी लोमड़ी', ar: 'ثعلب الشوغي', ru: 'Сёгицунэ', 'zh-TW': '將棋狐', id: 'Shogitsune', tr: 'Shogitsune' } },   // (the xiangqi guide is the shogi fox, as atlas/rules/xiangqi.js)
    backgammon: { guide: '../images/atlas/g-dice.webp', name: {"ja":"ダイスン","en":"Dicepup","zh":"骰子汪","ko":"다이슨","es":"Dicepup","fr":"Dicepup","pt":"Dicepup","de":"Dicepup","hi":"डाइसपप","ar":"دايس باب","ru":"Дайспап","zh-TW":"骰子汪","id":"Dicepup","tr":"Dicepup"} },
    senet: { noPz: true, guide: '../images/atlas/av/camel-2.webp', name: {"ja":"セティ","en":"Seti","zh":"塞提","ko":"세티","es":"Seti","fr":"Seti","pt":"Seti","de":"Seti","hi":"सेती","ar":"سيتي","ru":"Сети","zh-TW":"塞提","id":"Seti","tr":"Seti"} },   // (senet: セティ, the rules tour's camel, guides the 3D lessons; no puzzles — addendum 2026-11-24)
    patolli: { noPz: true, guide: '../images/atlas/g-dice.webp', name: {"ja":"ダイスン","en":"Dicepup","zh":"骰子汪","ko":"다이슨","es":"Dicepup","fr":"Dicepup","pt":"Dicepup","de":"Dicepup","hi":"डाइसपप","ar":"دايس باب","ru":"Дайспап","zh-TW":"骰子汪","id":"Dicepup","tr":"Dicepup"} },   // (patolli: ダイスン, the rules tour's guide, leads the 3D lessons; no puzzles — addendum 2026-11-24)
    ur: { noPz: true, guide: '../images/atlas/g-dice.webp', name: {"ja":"ダイスン","en":"Dicepup","zh":"骰子汪","ko":"다이슨","es":"Dicepup","fr":"Dicepup","pt":"Dicepup","de":"Dicepup","hi":"डाइसपप","ar":"دايس باب","ru":"Дайспап","zh-TW":"骰子汪","id":"Dicepup","tr":"Dicepup"} },   // (ur: ダイスン guides the 3D lessons; no puzzles for the dice-race games — addendum 2026-11-24)
    connect4: { guide: '../images/atlas/g-plop.webp', name: { ja: 'ポトンウサ', en: 'Plopbun', zh: '叮咚兔', 'zh-TW': '叮咚兔', ko: '포통우사', es: 'Plopbun', fr: 'Plopbun', pt: 'Plopbun', de: 'Plopbun', hi: 'प्लॉपबन', ar: 'بلوب بن', ru: 'Плопбан', id: 'Plopbun', tr: 'Plopbun' } },
    mancala: { guide: '../images/atlas/g-gem.webp', name: {"ja": "マンカラビ", "en": "Gembeetle", "zh": "宝石甲虫", "ko": "보석풍뎅이", "es": "Escarabajoya", "fr": "Scarabijou", "pt": "Besourojoia", "de": "Juwelkäfer", "hi": "रत्नू भौंरा", "ar": "خنفوس الجواهر", "ru": "Джембитл", "zh-TW": "寶石甲蟲", "id": "Gembeetle", "tr": "Gembeetle"} },
    dots: { guide: '../images/atlas/g-dot.webp', name: { ja: 'ハコピヨ', en: 'Boxchick', zh: '方块小鸡', 'zh-TW': '方塊小雞', ko: '하코피요', es: 'Boxchick', fr: 'Boxchick', pt: 'Boxchick', de: 'Boxchick', hi: 'बॉक्सचिक', ar: 'بوكس تشيك', ru: 'Боксчик', id: 'Boxchick', tr: 'Boxchick' } },
    morris: { guide: '../images/atlas/g-owl.webp', name: { ja: 'モリフク', en: 'Millowl', zh: '方阵猫头鹰', 'zh-TW': '方陣貓頭鷹', ko: '모리후쿠', es: 'Millowl', fr: 'Millowl', pt: 'Millowl', de: 'Millowl', hi: 'मिलआउल', ar: 'ميل أول', ru: 'Миллоул', id: 'Millowl', tr: 'Millowl' } },
    tafl: { guide: '../images/atlas/g-puffin.webp', name: { ja: 'タフリン', en: 'Taflin', zh: '塔芙林', 'zh-TW': '塔芙林', ko: '타플린', es: 'Taflín', fr: 'Taflin', pt: 'Taflin', de: 'Taflin', hi: 'टैफ़लिन', ar: 'تافلين', ru: 'Тафлин', id: 'Taflin', tr: 'Taflin' } },
    amazons: { guide: '../images/atlas/av/frog-0.webp', name: { ja: 'ケロ', en: 'Kero', zh: '呱呱', 'zh-TW': '呱呱', ko: '케로', es: 'Kero', fr: 'Kero', pt: 'Kero', de: 'Kero', hi: 'केरो', ar: 'كيرو', ru: 'Керо', id: 'Kero', tr: 'Kero' } },
    ugolki: { guide: '../images/atlas/g-owl.webp', name: { ja: 'モリフク', en: 'Millowl', zh: '方阵猫头鹰', 'zh-TW': '方陣貓頭鷹', ko: '모리후쿠', es: 'Millowl', fr: 'Millowl', pt: 'Millowl', de: 'Millowl', hi: 'मिलआउल', ar: 'ميل أول', ru: 'Миллоул', id: 'Millowl', tr: 'Millowl' } },   // (モリフク, the guide of atlas/rules/ugolki.js)
    konane: { guide: '../images/atlas/g-crab.webp', name: {"ja":"チェッカニ","en":"Checkrab","zh":"跳棋蟹","zh-TW":"跳棋蟹","ko":"체카니","es":"Checkrab","fr":"Checkrab","pt":"Checkrab","de":"Checkrab","hi":"चेकरैब","ar":"تشيكراب","ru":"Чекраб","id":"Checkrab","tr":"Checkrab"} },   // (the guide of atlas/rules/konane.js)
    foxgeese: { guide: '../images/atlas/av/duck-0.webp', name: {"ja":"ドミダック","en":"Dominoduck","zh":"骨牌鸭鸭","zh-TW":"骨牌鴨鴨","ko":"도미닥","es":"Dominoduck","fr":"Dominoduck","pt":"Dominoduck","de":"Dominoduck","hi":"डोमिनोडक","ar":"دومينو دك","ru":"Доминоутка","id":"Dominoduck","tr":"Dominoduck"} },   // (the guide of atlas/rules/foxgeese.js)
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
      notCheck: 'In tsume <b>every move must be a check</b>.', escaped: 'The king got away…', out: 'No mate — move limit: {n}…', retry: 'Tap "Retry" for a rematch!',
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
      good: ['¡Bien!', '¡Sigue así!', '¡Buena!'], left: 'Jugadas restantes: {n}.', wrong: 'Uy, esa no. La jugada que brilla es la solución.', wrongNo: 'Mmm, no ha salido…',
      notCheck: 'En tsume <b>cada jugada debe ser jaque</b>.', escaped: 'El rey se escapó…', out: 'No hubo mate — límite de jugadas: {n}…', retry: '¡Pulsa «Reintentar» para la revancha!',
      solved: ['¡Resuelto!', '¡Brillante!', '¡Perfecto!'], solvedHelp: '¡Superado! ¿La próxima sin pista?', hintSay: 'Fíjate en las casillas que brillan.', allDone: '¡Has resuelto todos los problemas! ¡Increíble!', loading: 'Preparando el problema…' },
    fr: { hint: 'Indice', again: 'Réessayer', next: 'Suivant', setMate: 'Mat en {n}', setTac: 'Tactique {a}–{b}', white: 'Blancs', black: 'Noirs',
      hi: { chess: 'Salut, c\'est Chevalou ! Aiguisons ton regard avec des problèmes.', shogi: 'Bonjour, je suis Shogirenard ! Entraînons le calcul avec des tsume.' },
      goalMate: 'Trait aux {c}. Trouve le <b>mat en {n}</b> !', goalMate1: 'Trait aux {c}. Il y a <b>mat en un</b>. Où ça ?',
      goalTac: 'Ton adversaire vient de jouer. Trait aux {c} : trouve <b>le coup qui gagne le plus</b> !', goalTsume: '<b>Mat en {n}</b>. Enchaîne les échecs et attrape le roi !',
      good: ['Bien !', 'Continue !', 'Joli !'], left: 'Encore {n}.', wrong: 'Oups, pas celui-là. Le coup qui brille est la solution.', wrongNo: 'Hmm, ça n\'a pas marché…',
      notCheck: 'En tsume, <b>chaque coup doit faire échec</b>.', escaped: 'Le roi s\'est échappé…', out: 'Pas de mat — limite de coups : {n}…', retry: 'Touche « Réessayer » pour la revanche !',
      solved: ['Résolu !', 'Brillant !', 'Parfait !'], solvedHelp: 'Réussi ! La prochaine fois sans indice ?', hintSay: 'Regarde les cases qui brillent.', allDone: 'Tu as résolu tous les problèmes. Bravo !', loading: 'Préparation du problème…' },
    pt: { hint: 'Dica', again: 'Tentar de novo', next: 'Próximo', setMate: 'Mate em {n}', setTac: 'Tática {a}–{b}', white: 'Brancas', black: 'Pretas',
      hi: { chess: 'Oi, sou o Cavalinho! Vamos treinar o olhar com problemas.', shogi: 'Olá, sou a Shogiraposa! Vamos treinar o cálculo com tsume.' },
      goalMate: 'Vez das {c}. Encontre o <b>mate em {n}</b>!', goalMate1: 'Vez das {c}. Há <b>mate em um</b>. Onde?',
      goalTac: 'O adversário acabou de jogar. Vez das {c}: ache <b>o lance que mais ganha</b>!', goalTsume: '<b>Mate em {n}</b>. Dê xeque atrás de xeque e pegue o rei!',
      good: ['Boa!', 'Continue!', 'Muito bem!'], left: 'Lances restantes: {n}.', wrong: 'Ops, não é esse. O lance que brilha é a resposta.', wrongNo: 'Hmm, não deu certo…',
      notCheck: 'No tsume <b>todo lance precisa ser xeque</b>.', escaped: 'O rei escapou…', out: 'Sem mate — limite de lances: {n}…', retry: 'Toque em «Tentar de novo» para a revanche!',
      solved: ['Resolvido!', 'Brilhante!', 'Perfeito!'], solvedHelp: 'Passou! Da próxima vez sem dica?', hintSay: 'Olhe as casas que brilham.', allDone: 'Você resolveu todos os problemas. Incrível!', loading: 'Preparando o problema…' },
    de: { hint: 'Tipp', again: 'Nochmal', next: 'Nächste', setMate: 'Matt in {n}', setTac: 'Taktik {a}–{b}', white: 'Weiß', black: 'Schwarz',
      hi: { chess: 'Hallo, ich bin Springolin! Schärfen wir deinen Blick mit Aufgaben.', shogi: 'Hallo, ich bin Shogifuchs! Trainieren wir das Rechnen mit Tsume.' },
      goalMate: '{c} am Zug. Finde das <b>Matt in {n}</b>!', goalMate1: '{c} am Zug. Es gibt ein <b>Matt in eins</b>. Wo?',
      goalTac: 'Dein Gegner hat gerade gezogen. {c} am Zug – finde <b>den Zug, der am meisten gewinnt</b>!', goalTsume: '<b>Matt in {n}</b>. Schach um Schach – fang den König!',
      good: ['Gut!', 'Weiter so!', 'Stark!'], left: 'Noch {n}.', wrong: 'Hoppla, der nicht. Der leuchtende Zug ist die Lösung.', wrongNo: 'Hm, das hat nicht geklappt…',
      notCheck: 'Beim Tsume <b>muss jeder Zug Schach geben</b>.', escaped: 'Der König ist entwischt…', out: 'Kein Matt – Zuglimit: {n}…', retry: 'Tippe auf „Nochmal“ zur Revanche!',
      solved: ['Gelöst!', 'Brillant!', 'Volltreffer!'], solvedHelp: 'Geschafft! Nächstes Mal ohne Tipp?', hintSay: 'Schau auf die leuchtenden Felder.', allDone: 'Du hast alle Aufgaben gelöst. Super!', loading: 'Aufgabe wird vorbereitet…' },
    hi: { hint: 'संकेत', again: 'फिर से', next: 'अगली पहेली', setMate: '{n} में मात', setTac: 'चाल {a}–{b}', white: 'सफ़ेद', black: 'काला',
      hi: { chess: 'नमस्ते, मैं नाइटन! पहेलियों से नज़र तेज़ करें।', shogi: 'नमस्ते, मैं शोगी लोमड़ी! त्सुमे से गणना की ताकत बढ़ाएँ।' },
      goalMate: '{c} की बारी। <b>{n} चालों में मात</b> ढूँढो!', goalMate1: '{c} की बारी। <b>एक चाल में मात</b> है। कहाँ?',
      goalTac: 'विरोधी ने अभी चाल चली। {c} की बारी — <b>सबसे फ़ायदे वाली चाल</b> ढूँढो!', goalTsume: '<b>{n} में मात</b>। शह पर शह देकर राजा को पकड़ो!',
      good: ['बढ़िया!', 'ऐसे ही!', 'शानदार!'], left: 'अभी {n} बाकी।', wrong: 'अरे, यह नहीं। चमकती चाल सही जवाब है।', wrongNo: 'हम्म, बात नहीं बनी…',
      notCheck: 'त्सुमे में <b>हर चाल शह होनी चाहिए</b>।', escaped: 'राजा बच निकला…', out: 'मात नहीं हुई — चालों की सीमा: {n}…', retry: 'बदला लेने के लिए "फिर से" दबाओ!',
      solved: ['सही जवाब!', 'कमाल!', 'बिल्कुल सही!'], solvedHelp: 'पार! अगली बार बिना संकेत?', hintSay: 'चमकती जगहों को देखो।', allDone: 'तुमने सारी पहेलियाँ हल कर लीं। वाह!', loading: 'पहेली तैयार हो रही है…' },
    ar: { hint: 'تلميح', again: 'أعد المحاولة', next: 'اللغز التالي', setMate: 'مات في {n}', setTac: 'تكتيك {a}–{b}', white: 'الأبيض', black: 'الأسود',
      hi: { chess: 'مرحبًا، أنا فارسون! لنشحذ نظرك بالألغاز.', shogi: 'مرحبًا، أنا ثعلب الشوغي! لندرّب الحساب بالتسومي.' },
      goalMate: 'دور {c}. جد <b>المات في {n}</b>!', goalMate1: 'دور {c}. هناك <b>مات في نقلة</b>. أين؟',
      goalTac: 'لعب خصمك للتو. دور {c} — جد <b>النقلة الأكثر كسبًا</b>!', goalTsume: '<b>مات في {n}</b>. كِش بعد كِش وأمسك الملك!',
      good: ['أحسنت!', 'استمر!', 'رائع!'], left: 'بقي {n}.', wrong: 'عفوًا، ليست هذه. النقلة المضيئة هي الحل.', wrongNo: 'همم، لم تنجح…',
      notCheck: 'في التسومي <b>كل نقلة يجب أن تكون كِشًّا</b>.', escaped: 'هرب الملك…', out: 'لا مات — حدّ النقلات: {n}…', retry: 'اضغط «أعد المحاولة» للثأر!',
      solved: ['أصبت!', 'مذهل!', 'تمامًا!'], solvedHelp: 'نجحت! هل تحاول المرة القادمة بلا تلميح؟', hintSay: 'انظر إلى المربعات المضيئة.', allDone: 'حللت كل الألغاز هنا. رائع!', loading: 'جارٍ تجهيز اللغز…' },
    ru: { hint: 'Подсказка', again: 'Ещё раз', next: 'Следующая', setMate: 'Мат в {n}', setTac: 'Тактика {a}–{b}', white: 'Белые', black: 'Чёрные',
      hi: { chess: 'Привет, я Найтон! Потренируем глаз на задачах.', shogi: 'Привет, я Сёгицунэ! Потренируем расчёт на цумэ.' },
      goalMate: 'Ход: {c}. Найди <b>мат в {n}</b>!', goalMate1: 'Ход: {c}. Есть <b>мат в один ход</b>. Где?',
      goalTac: 'Соперник только что сходил. Ход: {c} — найди <b>самый выгодный ход</b>!', goalTsume: '<b>Мат в {n}</b>. Шах за шахом — поймай короля!',
      good: ['Отлично!', 'Так держать!', 'Здорово!'], left: 'Осталось ходов: {n}.', wrong: 'Ой, не этот. Светящийся ход — решение.', wrongNo: 'Хм, не получилось…',
      notCheck: 'В цумэ <b>каждый ход должен быть шахом</b>.', escaped: 'Король ускользнул…', out: 'Мата нет — лимит ходов: {n}…', retry: 'Нажми «Ещё раз», чтобы отыграться!',
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
    en: { hi: 'Flipturtle here! Let\'s read endgames out to the last disc.', gWin: '{c} to move. Play it out and <b>win</b>!', gMargin: '{c} to move. Win by <b>a margin of {n} or more</b>!', gWipe: '{c} to move. <b>Wipe out</b> every opposing disc!', gDraw: '{c} to move. Get <b>at least a draw</b>!', miss: '{m} can\'t reach the goal. The best was {b}.', empties: 'Empty squares left: {n}.' },
    zh: { hi: '我是翻翻龟！来挑战算清终盘的谜题吧！', gWin: '轮到{c}。下到最后<b>赢下来</b>吧！', gMargin: '轮到{c}。以<b>{n}子以上</b>的差距获胜！', gWipe: '轮到{c}。把对方的子<b>全部吃光</b>！', gDraw: '轮到{c}。至少下成<b>和棋</b>！', miss: '下{m}好像达不到目标。最佳是{b}。', empties: '还剩{n}个空格。' },
    'zh-TW': { hi: '我是翻翻龜！來挑戰算清終盤的謎題吧！', gWin: '輪到{c}。下到最後<b>贏下來</b>吧！', gMargin: '輪到{c}。以<b>{n}子以上</b>的差距獲勝！', gWipe: '輪到{c}。把對方的子<b>全部吃光</b>！', gDraw: '輪到{c}。至少下成<b>和棋</b>！', miss: '下{m}好像達不到目標。最佳是{b}。', empties: '還剩{n}個空格。' },
    ko: { hi: '리바거북이야! 종반을 끝까지 읽는 퍼즐에 도전하자!', gWin: '{c} 차례. 끝까지 두어 <b>이겨</b> 보자!', gMargin: '{c} 차례. <b>{n}개 차 이상</b>으로 이기자!', gWipe: '{c} 차례. 상대 돌을 <b>전멸</b>시키자!', gDraw: '{c} 차례. <b>무승부 이상</b>을 만들자!', miss: '{m}(으)로는 목표에 닿지 않아. 최선은 {b}야.', empties: '빈칸이 {n}개 남았어.' },
    es: { hi: '¡Soy Tortugavuelta! Vamos a leer finales hasta la última ficha.', gWin: 'Juegan {c}. ¡Juega hasta el final y <b>gana</b>!', gMargin: 'Juegan {c}. ¡Gana por <b>una diferencia de {n} o más</b>!', gWipe: 'Juegan {c}. ¡<b>Elimina</b> todas las fichas rivales!', gDraw: 'Juegan {c}. ¡Consigue <b>al menos tablas</b>!', miss: 'Con {m} no se llega al objetivo. Lo mejor era {b}.', empties: 'Casillas vacías restantes: {n}.' },
    fr: { hi: 'Ici Tortuflip ! Lisons les finales jusqu\'au dernier pion.', gWin: 'Aux {c}. Jouez jusqu\'au bout et <b>gagnez</b> !', gMargin: 'Aux {c}. Gagnez avec <b>un écart de {n} ou plus</b> !', gWipe: 'Aux {c}. <b>Éliminez</b> tous les pions adverses !', gDraw: 'Aux {c}. Obtenez <b>au moins la nulle</b> !', miss: '{m} n\'atteint pas l\'objectif. Le meilleur était {b}.', empties: 'Cases vides restantes : {n}.' },
    pt: { hi: 'Sou a Tartavira! Vamos ler finais até a última peça.', gWin: 'Jogam as {c}. Jogue até o fim e <b>vença</b>!', gMargin: 'Jogam as {c}. Vença por <b>uma diferença de {n} ou mais</b>!', gWipe: 'Jogam as {c}. <b>Elimine</b> todas as peças do rival!', gDraw: 'Jogam as {c}. Consiga <b>pelo menos um empate</b>!', miss: 'Com {m} não dá para chegar ao objetivo. O melhor era {b}.', empties: 'Casas vazias restantes: {n}.' },
    de: { hi: 'Hier ist Wendekröte! Rechnen wir Endspiele bis zum letzten Stein.', gWin: '{c} am Zug. Spiel bis zum Ende und <b>gewinne</b>!', gMargin: '{c} am Zug. Gewinne mit <b>einem Vorsprung von {n} oder mehr</b>!', gWipe: '{c} am Zug. <b>Räume</b> alle gegnerischen Steine ab!', gDraw: '{c} am Zug. Hol <b>mindestens ein Remis</b>!', miss: 'Mit {m} ist das Ziel nicht erreichbar. Am besten war {b}.', empties: 'Leere Felder übrig: {n}.' },
    hi: { hi: 'मैं पलटकछुआ हूँ! आओ, अंत के खेल को आख़िरी गोटी तक पढ़ें।', gWin: '{c} की बारी। अंत तक खेलकर <b>जीतो</b>!', gMargin: '{c} की बारी। <b>कम से कम {n} के अंतर</b> से जीतो!', gWipe: '{c} की बारी। विरोधी की सारी गोटियाँ <b>ख़त्म</b> करो!', gDraw: '{c} की बारी। <b>कम से कम ड्रॉ</b> करो!', miss: '{m} से लक्ष्य तक नहीं पहुँचा जा सकता। सबसे अच्छी चाल {b} थी।', empties: 'बचे ख़ाली खाने: {n}।' },
    ar: { hi: 'أنا سلحفاة القلب! لنقرأ النهايات حتى آخر قطعة.', gWin: 'دور {c}. العب حتى النهاية <b>واربح</b>!', gMargin: 'دور {c}. اربح بفارق <b>{n} أو أكثر</b>!', gWipe: 'دور {c}. <b>امحُ</b> كل قطع الخصم!', gDraw: 'دور {c}. احصل على <b>التعادل على الأقل</b>!', miss: 'لا يمكن بلوغ الهدف بـ{m}. الأفضل كان {b}.', empties: 'المربعات الفارغة المتبقية: {n}.' },
    ru: { hi: 'Я Перевертуша! Давайте просчитывать эндшпили до последней фишки.', gWin: 'Ход: {c}. Доиграйте до конца и <b>победите</b>!', gMargin: 'Ход: {c}. Выиграйте с перевесом <b>не меньше {n}</b>!', gWipe: 'Ход: {c}. <b>Уничтожьте</b> все фишки соперника!', gDraw: 'Ход: {c}. Добейтесь <b>хотя бы ничьей</b>!', miss: 'Ходом {m} цели не достичь. Лучшим был {b}.', empties: 'Пустых клеток: {n}.' },
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
  // hex (2026-11-15): a position { n, b: n×n chars '.rb', side } as a small rhombus of hexagons, Red's edges top and bottom (hex/app.js miniSVG)
  window.AtlasMini.hex = spec => {
    const n = (spec && spec.n) || 9, b = spec && spec.b ? String(spec.b) : '', R = 40 / (n * 1.5 + .5), w = R * 1.732, W = w * (n + (n - 1) / 2) + w, H = R * 1.5 * (n - 1) + 2 * R;
    const sx = 84 / Math.max(W, H * 1.0) * .96, ox = (84 - W * sx) / 2, oy = (84 - H * sx) / 2, hx = (x, y) => [0, 1, 2, 3, 4, 5].map(k => { const a = Math.PI / 6 + k * Math.PI / 3; return ((x + R * Math.cos(a)) * sx + ox).toFixed(1) + ',' + ((y + R * Math.sin(a)) * sx + oy).toFixed(1); }).join(' ');
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="5" fill="#f3ead6"/>';
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) {
      const x = w / 2 + q * w + r * w / 2, y = R + r * R * 1.5, ch = b[r * n + q];
      o += `<polygon points="${hx(x, y)}" fill="${ch === 'r' ? '#d8402f' : ch === 'b' ? '#2f63c8' : '#fbf6ea'}" stroke="#b7a37c" stroke-width=".4"/>`;
    }
    return o + '</svg>';
  };
  // connect four (2026-11-15): a move string on a small 7 × 6 board (connect4/index.html miniBoardSVG)
  window.AtlasMini.connect4 = mv => {
    const g = Array.from({ length: 7 }, () => []); String(mv || '').split('').forEach((ch, i) => { const c = +ch - 1; if (c >= 0 && c < 7) g[c].push(i & 1 ? 2 : 1); });
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#123c42"/><rect x="4" y="11" width="76" height="66" rx="5" fill="#0d6b74"/>';
    for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) { const v = g[c][r] || 0, x = 10 + c * 10.6, y = 71 - r * 10.6; o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.3" fill="${v === 1 ? '#e6b33a' : v === 2 ? '#eef0f2' : '#0a3a40'}"${v ? ` stroke="${v === 1 ? '#8a5a1c' : '#9aa3aa'}" stroke-width=".7"` : ''}/>`; }
    return o + '</svg>';
  };
  // amazons (2026-11-15): a position { b: 100 chars '.wbx', side } on a small 10×10 board, the side to move at the bottom (amazons/app.js miniSVG)
  window.AtlasMini.amazons = spec => {
    const b = spec && spec.b ? String(spec.b) : '', fl = !!spec && spec.side === 2;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="5" fill="#3a2a1c"/>';
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const i = fl ? 99 - (r * 10 + c) : r * 10 + c, ch = b[i], x = 2 + c * 8, y = 2 + r * 8;
      o += `<rect x="${x}" y="${y}" width="8" height="8" fill="${(r + c) & 1 ? '#b98a56' : '#ead2a6'}"/>`;
      if (ch === 'x') o += `<rect x="${x + 1.2}" y="${y + 1.2}" width="5.6" height="5.6" rx="1" fill="#5a2a16"/><path d="M${x + 2} ${y + 6}l4-4" stroke="#ff8a50" stroke-width=".9"/>`;
      else if (ch === 'w' || ch === 'b') o += `<circle cx="${x + 4}" cy="${y + 4}" r="3.1" fill="${ch === 'w' ? '#fbf6ea' : '#1c1816'}" stroke="${ch === 'w' ? '#6f6250' : '#000'}" stroke-width=".7"/>`;
    }
    return o + '</svg>';
  };
  // mancala (2026-11-16): a board { b: 14 counts } — the six pits each side and the stores at the ends
  window.AtlasMini.mancala = spec => {
    const b = spec && spec.b ? spec.b : [], pit = (x, y, n) => `<circle cx="${x}" cy="${y}" r="5.6" fill="#7a4a24"/><text x="${x}" y="${y + 2.4}" font-size="6.5" font-weight="700" text-anchor="middle" fill="#ffe9c8">${n}</text>`;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect x="1" y="22" width="82" height="40" rx="10" fill="#c78f55"/>';
    for (let k = 0; k < 6; k++) { o += pit(18 + k * 9.6, 51, b[k] || 0); o += pit(18 + (5 - k) * 9.6, 33, b[7 + k] || 0); }
    o += `<rect x="3" y="27" width="8" height="30" rx="4" fill="#7a4a24"/><text x="7" y="44.5" font-size="6.5" font-weight="700" text-anchor="middle" fill="#ffe9c8">${b[13] || 0}</text>`;
    o += `<rect x="73" y="27" width="8" height="30" rx="4" fill="#7a4a24"/><text x="77" y="44.5" font-size="6.5" font-weight="700" text-anchor="middle" fill="#ffe9c8">${b[6] || 0}</text>`;
    return o + '</svg>';
  };
  // morris (2026-11-16): { v: nine · six · twelve, b: one digit a point (0 empty · 1 gold · 2 silver) } on the board's lines
  const MMG = (() => { const N = { pts: [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]], k: 6,
      ln: [[0, 2], [3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [0, 21], [3, 18], [6, 15], [1, 7], [16, 22], [8, 17], [5, 20], [2, 23]] };
    const S = { pts: [[0, 0], [2, 0], [4, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [0, 4], [2, 4], [4, 4]], k: 4,
      ln: [[0, 2], [3, 5], [10, 12], [13, 15], [0, 13], [3, 10], [5, 12], [2, 15], [1, 4], [6, 7], [8, 9], [11, 14]] };
    return { nine: N, six: S, twelve: Object.assign({}, N, { ln: N.ln.concat([[0, 6], [2, 6 + 2], [21, 15], [23, 17]]) }) }; })();
  // dots & boxes (2026-11-16): { n, e: the drawn lines (dots/learn.js 64-letter code), o: the boxes' owners ('.', '0', '1') }
  window.AtlasMini.dots = spec => {
    const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', n = +spec.n || 3, HN = (n + 1) * n, u = 64 / n, P = (r, c) => [10 + c * u, 10 + r * u];
    const on = new Set([...String(spec.e || '')].map(c => K.indexOf(c))), own = String(spec.o || '');
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#fbf7ee"/>';
    for (let b = 0; b < n * n; b++) { const w = own[b]; if (w === '0' || w === '1') { const [x, y] = P(Math.floor(b / n), b % n); o += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${u - 3}" height="${u - 3}" fill="${w === '0' ? '#f2a39a' : '#9cb9ef'}" opacity=".7"/>`; } }
    o += '<g stroke="#3a3f4a" stroke-width="2.2" stroke-linecap="round">';
    on.forEach(e => { if (e < 0) return; let a, b; if (e < HN) { const r = Math.floor(e / n), c = e % n; a = P(r, c); b = P(r, c + 1); } else { const f = e - HN, r = Math.floor(f / (n + 1)), c = f % (n + 1); a = P(r, c); b = P(r + 1, c); } o += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; });
    o += '</g>'; for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) { const [x, y] = P(r, c); o += `<circle cx="${x}" cy="${y}" r="2.1" fill="#1d2230"/>`; }
    return o + '</svg>';
  };
  window.AtlasMini.morris = spec => {
    const G = MMG[spec && spec.v] || MMG.nine, b = String(spec && spec.b || ''), u = 64 / G.k, X = q => 10 + G.pts[q][0] * u, Y = q => 10 + G.pts[q][1] * u;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#c99a5e"/><g stroke="#5a3a1a" stroke-width="1.4" stroke-linecap="round">';
    G.ln.forEach(([a, c]) => { o += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(c)}" y2="${Y(c)}"/>`; });
    o += '</g>';
    G.pts.forEach((_, q) => { const c = b[q]; o += c === '1' || c === '2' ? `<circle cx="${X(q)}" cy="${Y(q)}" r="4.6" fill="${c === '1' ? '#e8b923' : '#d9dde3'}" stroke="${c === '1' ? '#8a6410' : '#6c7380'}" stroke-width=".9"/>` : `<circle cx="${X(q)}" cy="${Y(q)}" r="1.6" fill="#5a3a1a"/>`; });
    return o + '</svg>';
  };
  // hnefatafl (2026-11-15): a tafl/puzzles.json spec { v, b: n² chars '.adk', side } on a small board (throne and corners marked)
  window.AtlasMini.tafl = spec => {
    const b = spec && spec.b ? String(spec.b) : '', n = Math.round(Math.sqrt(b.length)) || 11, c = 80 / n, mid = n >> 1, edge = spec && (spec.v === 'tablut' || spec.v === 'tawlbwrdd');
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="5" fill="#4a2c18"/><rect x="2" y="2" width="80" height="80" fill="#d6ad74"/>';
    const sp = [[mid, mid]].concat(edge ? [] : [[0, 0], [0, n - 1], [n - 1, 0], [n - 1, n - 1]]);
    sp.forEach(([r, q]) => { o += `<rect x="${2 + q * c}" y="${2 + r * c}" width="${c}" height="${c}" fill="#9b6a3c"/>`; });
    for (let i = 1; i < n; i++) o += `<path d="M${2 + i * c} 2V82M2 ${2 + i * c}H82" stroke="#6a4424" stroke-width=".5"/>`;
    for (let i = 0; i < b.length; i++) { const ch = b[i]; if (ch === '.') continue; const x = 2 + (i % n + .5) * c, y = 2 + (Math.floor(i / n) + .5) * c, r = c * (ch === 'k' ? .42 : .36);
      o += `<circle cx="${x}" cy="${y}" r="${r}" fill="${ch === 'a' ? '#2a1a10' : '#f6ecd4'}" stroke="${ch === 'a' ? '#000' : '#8a7550'}" stroke-width=".6"/>`; if (ch === 'k') o += `<circle cx="${x}" cy="${y}" r="${r * .45}" fill="#e2b13c"/>`; }
    return o + '</svg>';
  };
  // fox and geese (2026-11-24): a foxgeese/puzzles.json spec { b: 49 chars '.fg' on the 7×7 grid of the cross } (the lines, the fox, the geese)
  // kōnane (2026-11-24): a konane/puzzles.json spec { b: N×N chars '.bw', side } — the board turned for White to move (as the 2D)
  window.AtlasMini.konane = spec => {
    const b = String(spec && spec.b || ''), N = Math.round(Math.sqrt(b.length)) || 8, fl = spec && spec.side === 2, c = 80 / N;
    let o = `<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#b98b55"/>`;
    for (let i = 0; i < N * N; i++) { const r = Math.floor(i / N), q = i % N, rr = fl ? N - 1 - r : r, qq = fl ? N - 1 - q : q, x = 2 + qq * c + c / 2, y = 2 + rr * c + c / 2, ch = b[i];
      o += ch === 'b' ? `<circle cx="${x}" cy="${y}" r="${c * .4}" fill="#2a2826" stroke="#0b0b0b" stroke-width=".6"/>` : ch === 'w' ? `<circle cx="${x}" cy="${y}" r="${c * .4}" fill="#f6f1e6" stroke="#8d8270" stroke-width=".6"/>` : `<circle cx="${x}" cy="${y}" r="${c * .12}" fill="#7a5530"/>`; }
    return o + '</svg>';
  };
  // ugolki (2026-11-24): a ugolki/puzzles.json spec { b: 64 chars '.wb', side, n } — the two corners of c33 shaded, the board turned
  // for Black to move (as the 3D table)
  window.AtlasMini.ugolki = spec => {
    const b = String(spec && spec.b || ''), fl = spec && spec.side === 2, c = 10;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#2f5aa8"/>';
    for (let i = 0; i < 64; i++) { const r = i >> 3, q = i & 7, rr = fl ? 7 - r : r, qq = fl ? 7 - q : q, x = 2 + qq * c, y = 2 + rr * c, home = (r >= 5 && q <= 2) || (r <= 2 && q >= 5);
      o += `<rect x="${x}" y="${y}" width="${c}" height="${c}" fill="${home ? '#c9d8f2' : (r + q) % 2 ? '#eef3fb' : '#dfe8f7'}"/>`;
      const ch = b[i]; if (ch === 'w' || ch === 'b') o += `<circle cx="${x + c / 2}" cy="${y + c / 2}" r="${c * .38}" fill="${ch === 'w' ? '#fbfaf4' : '#1f2a44'}" stroke="${ch === 'w' ? '#7d8aa0' : '#05080f'}" stroke-width=".7"/>`; }
    return o + '</svg>';
  };
  window.AtlasMini.foxgeese = spec => {
    const b = String(spec && spec.b || ''), on = i => { const r = Math.floor(i / 7), c = i % 7; return (r >= 2 && r <= 4) || (c >= 2 && c <= 4); }, X = i => 12 + (i % 7) * 10, Y = i => 12 + Math.floor(i / 7) * 10;
    let o = '<svg viewBox="0 0 84 84" aria-hidden="true"><rect width="84" height="84" rx="6" fill="#d8c08a"/><g stroke="#6a4a24" stroke-width="1" stroke-linecap="round">';
    for (let i = 0; i < 49; i++) { if (!on(i)) continue; const r = Math.floor(i / 7), c = i % 7;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { if (dr && dc && (r + c) % 2) continue; const r1 = r + dr, c1 = c + dc, j = r1 * 7 + c1; if (r1 > 6 || c1 < 0 || c1 > 6 || !on(j)) continue; o += `<line x1="${X(i)}" y1="${Y(i)}" x2="${X(j)}" y2="${Y(j)}"/>`; } }
    o += '</g>';
    for (let i = 0; i < 49; i++) { if (!on(i)) continue; const ch = b[i]; o += ch === 'f' ? `<circle cx="${X(i)}" cy="${Y(i)}" r="4.4" fill="#e0662a" stroke="#7a2e0c" stroke-width=".9"/>` : ch === 'g' ? `<circle cx="${X(i)}" cy="${Y(i)}" r="3.8" fill="#fbfaf4" stroke="#7d7a70" stroke-width=".9"/>` : `<circle cx="${X(i)}" cy="${Y(i)}" r="1.3" fill="#6a4a24"/>`; }
    return o + '</svg>';
  };
  // peg solitaire (2026-11-13): 'board:pegs:goal' (peg/puzzles.json b · p · t) on the board's own hole layout (PegEngine)
  // xiangqi (2026-11-14): a FEN on a small 9×10 board, the side to move at the bottom (pieces: the colour and one character)
  const XQG = { r: { k: '帥', a: '仕', b: '相', e: '相', n: '傌', h: '傌', r: '俥', c: '炮', p: '兵' }, b: { k: '將', a: '士', b: '象', e: '象', n: '馬', h: '馬', r: '車', c: '砲', p: '卒' } };
  window.AtlasMini.xiangqi = fen => {
    if (/^jg\|/.test(fen || '')) return window.AtlasMini.janggi ? window.AtlasMini.janggi(fen.slice(3)) : '';   // (janggi: atlas/games/janggi-pz.js)
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
  /* ---------- hex (2026-11-15): hex/puzzles.json (詰めヘックス: themes "connect in N" (Win, Big) and "stop the connection" (Block,
     P.d = the opponent's moves to connect)), the full game's records 'aicoding-hex-puzzles' { '<theme>-<j>': stars }, the last theme
     'aicoding-hex-pz-last'. Texts: hex/i18n.js (a sandbox). */
  BOOK.hex = {
    url: '../hex/puzzles.json?v=1', KEY: 'aicoding-hex-puzzles', LAST: 'aicoding-hex-pz-last', data: null, I: null,
    ICO: { Win: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>', Block: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', Big: '<path d="M3 9l4.5 3.5L12 6l4.5 6.5L21 9l-2 9H5z"/>' },
    prep(d) { d.levels = d.themes; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j], block = !!P.d;
      return { i, j, P, rk: T.id + '-' + j, kind: 'hx', spec: P.s, me: P.s.side === 2 ? 2 : 1, block, k: P.d || 0, n: block ? 1 : P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Win', 'Block', 'Big'].map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'hx:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/g-stone.webp',
  };
  /* ---------- connect four (2026-11-15): connect4/puzzles.json (levels: mate = win in N against the exact defender, theme / unique:
     'b' one only move by the stored exact values, 's' several only moves in a row with stored replies), the full game's records
     'aicoding-connect4-v2-puzzles2' { '<id>:<old index>': stars } (lv.was keeps the old indices), slots refreshed on 2026-10-21 keep the
     old puzzle for players who had played them (PUZZLES.old / '-pzold'). Texts: connect4/i18n.js + learn.js (a sandbox). */
  BOOK.connect4 = {
    url: '../connect4/puzzles.json?v=20261107l14', KEY: 'aicoding-connect4-v2-puzzles2', LAST: 'aicoding-connect4-v2-pzlast', OLDK: 'aicoding-connect4-v2-pzold', data: null, I: null,
    ICO: { mate: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>', theme: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', unique: '<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.5-4 6-.6z"/>' },
    prep(d) { return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    key: (lv, j) => lv.id + ':' + (lv.was ? lv.was[j] : j),
    get(i, j, date) { const lv = this.data.levels[i], k = this.key(lv, j), o = this.data.old && this.data.old[k]; const ok = (store.get(this.OLDK, {}) || {}).keys || []; return o && ((date && date <= this.data.cut) || ok.includes(k)) ? o : lv.puzzles[j]; },
    sets() { const pr = this.pr(); return this.data.levels.map((lv, i) => ({ key: i, recs: lv.puzzles.map((_, j) => this.sv(pr[this.key(lv, j)])), cat: lv.cat })); },
    title(i, lang) { const n = this.data.levels[i].name; return (n && (n[lang] || n.en || n.ja)) || this.data.levels[i].id; },
    problem(i, j, X, lang, date) {
      const lv = this.data.levels[i], P = this.get(i, j, date), kind = P.k === 'b' ? 'b' : P.k === 's' ? 's' : 'mate';
      return { i, j, P, rk: this.key(lv, j), kind: 'c4', c4: kind, moves: P.moves, me: P.moves.length & 1 ? 2 : 1, n: P.k === 's' ? P.steps.length : P.k === 'b' ? 1 : P.n, count: lv.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); if (pr._v === undefined) pr._v = 3; store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i));
      if (this.data.old && this.data.old[p.rk] === p.P) { const o = store.get(this.OLDK, {}) || {}; o.keys = o.keys || []; if (!o.keys.includes(p.rk)) { o.keys.push(p.rk); store.set(this.OLDK, o); } } },
    cats(lang) { return ['mate', 'theme', 'unique'].map(k => ({ k, name: this.tx('pz.cat.' + k, lang), desc: this.tx('pz.cat.' + k + '.d', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const lv = this.data.levels[i], P = lv.puzzles[0]; return { desc: '', board: P ? 'c4:' + P.moves : '' }; },
    guide: '../images/atlas/g-plop.webp',
  };
  const C4X = {
    ja: { hi: 'ポトンウサだよ！ 詰めコネクトフォーで、4つ並べる読みをきたえよう！', mid: 'いい調子！ あと{n}手。', out: '{n}手以内には4つ並ばなかった…', bl: 'おっと、それは悪手。' },
    en: { hi: "Plopbun here! Let's sharpen your reading with Connect Four puzzles!", mid: 'Nice! Moves left: {n}.', out: "No four — move limit: {n}…", bl: 'Oops — that one is a mistake.' },
    zh: { hi: '我是叮咚兔！用四子棋谜题锻炼计算力吧！', mid: '不错！还剩{n}手。', out: '没能在{n}手内连成四个…', bl: '哎呀，这步是失误。' },
    'zh-TW': { hi: '我是叮咚兔！用四子棋謎題鍛鍊計算力吧！', mid: '不錯！還剩{n}手。', out: '沒能在{n}手內連成四個…', bl: '哎呀，這步是失誤。' },
    ko: { hi: '포통우사야! 커넥트 포 퍼즐로 수읽기를 단련하자!', mid: '좋아! {n}수 남았어.', out: '{n}수 안에 4개를 잇지 못했어…', bl: '앗, 그건 악수야.' },
    es: { hi: '¡Soy Plopbun! Entrena tu cálculo con problemas de Conecta 4.', mid: '¡Bien! Jugadas restantes: {n}.', out: 'No hubo cuatro — límite de jugadas: {n}…', bl: '¡Uy! Esa es un error.' },
    fr: { hi: 'C’est Plopbun ! Entraîne ton calcul avec des problèmes de Puissance 4.', mid: 'Bien ! Coups restants : {n}.', out: 'Pas de quatre — limite de coups : {n}…', bl: 'Oups, c’est une erreur.' },
    pt: { hi: 'Aqui é o Plopbun! Treine o cálculo com problemas de Lig 4.', mid: 'Boa! Lances restantes: {n}.', out: 'Nada de quatro — limite de lances: {n}…', bl: 'Ops, esse é um erro.' },
    de: { hi: 'Hier ist Plopbun! Trainiere dein Rechnen mit Vier-gewinnt-Aufgaben.', mid: 'Gut! Verbleibende Züge: {n}.', out: 'Keine Vier – Zuglimit: {n}…', bl: 'Hoppla, das ist ein Fehler.' },
    ru: { hi: 'Это Плопбан! Тренируем расчёт на задачах «Четыре в ряд».', mid: 'Отлично! Осталось ходов: {n}.', out: 'Четвёрки нет — лимит ходов: {n}…', bl: 'Ой, это ошибка.' },
    tr: { hi: 'Ben Plopbun! Dört Bağlamaca bulmacalarıyla hesap gücünü geliştirelim.', mid: 'Güzel! {n} hamle kaldı.', out: '{n} hamlede dörtlü olmadı…', bl: 'Hay aksi, bu bir hata.' },
    id: { hi: 'Aku Plopbun! Ayo latih perhitungan dengan soal Connect Four.', mid: 'Bagus! Sisa {n} langkah.', out: 'Tidak ada empat dalam {n} langkah…', bl: 'Ups, itu langkah salah.' },
    hi: { hi: 'मैं प्लॉपबन हूँ! कनेक्ट फ़ोर पहेलियों से गणना मज़बूत करें।', mid: 'बढ़िया! बची चालें: {n}।', out: 'चार नहीं जुड़े — चालों की सीमा: {n}…', bl: 'उफ़, यह गलती है।' },
    ar: { hi: 'أنا بلوب بن! لنقوِّ الحساب بألغاز أربعة في صف.', mid: 'رائع! بقي {n}.', out: 'لا أربعة — حدّ النقلات: {n}…', bl: 'عفوًا، هذه نقلة خاطئة.' },
  };
  /* ---------- amazons (2026-11-15): amazons/puzzles.json (themes of kind duel = immobilise the opponent in N, trap = box in the lit
     amazon in N, guard = keep yours free N times, read = read the ending out; all checked exactly by the engine — engine.js pzGood),
     the full game's records 'aicoding-amazons-puzzles' { '<theme>-<j>': stars }, the last theme 'aicoding-amazons-pz-last'.
     Texts: amazons/i18n-am*.js (a sandbox). */
  BOOK.amazons = {
    url: '../amazons/puzzles.json?v=2', KEY: 'aicoding-amazons-puzzles', LAST: 'aicoding-amazons-pz-last', data: null, I: null,
    ICO: { Win: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>', Tac: '<path d="M4 4h16v16H4zM9 4v16M15 4v16M4 9h16M4 15h16"/>', End: '<path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 3"/>' },
    prep(d) { d.levels = d.themes; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'am', am: T.kind, spec: P.s, me: P.s.side === 2 ? 2 : 1, n: P.n, e: P.e, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Win', 'Tac', 'End'].filter(k => this.data.themes.some(T => T.grp === k)).map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'am:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/av/frog-0.webp',
  };
  /* ---------- hnefatafl (2026-11-15): tafl/puzzles.json (themes: escape the king in N · capture the king in N; Copenhagen, Brandubh,
     Tablut), progress = the full game's ('aicoding-tafl-puzzles' { '<theme>-<j>': stars }). Texts: tafl/i18n.js (a sandbox). */
  /* ---------- mancala (2026-11-16): mancala/puzzles.json v3 (cats × rule sets → themes; kinds: pick · turn · end), progress = the full
     game's ('aicoding-mancala-v1-puzzles' { '<theme>-<j>': stars }). The portal's categories are the rule sets (the full game's rule tabs).
     Texts: mancala/i18n.js + i18n-pz.js (a sandbox). */
  BOOK.mancala = {
    url: '../mancala/puzzles.json?v=3', KEY: 'aicoding-mancala-v1-puzzles', LAST: 'aicoding-mancala-v1-pz-last', data: null, I: null,
    RULES: ['kalah', 'basic', 'easy', 'sunka'],
    ICO: { kalah: '<circle cx="6" cy="12" r="2.6"/><circle cx="12" cy="12" r="2.6"/><circle cx="18" cy="12" r="2.6"/><path d="M3 6h18M3 18h18"/>', basic: '<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/>', easy: '<circle cx="12" cy="12" r="3.4"/>', sunka: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>' },
    prep(d) { const T = []; d.cats.forEach(C => C.themes.forEach(t => { t.rules = C.rules || t.puzzles[0].rules; t.cat = C.id; T.push(t); })); d.themes = T; d.levels = T;
      const r = T.flatMap(t => t.puzzles.map(x => x.rt || 0)).sort((a, b) => a - b); d.Q = [.2, .4, .6, .8].map(q => r[Math.floor(q * (r.length - 1))]); return d; },
    diff(P) { let v = P.rt || 0, k = 1; for (const q of this.data.Q) if (v > q) k++; return k; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.rules })); },
    title(i, lang) { return this.tx('pz.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'mc', mk: P.kind, spec: { b: P.b.slice(), rules: T.rules, side: 0 }, me: 1, n: P.n || (P.line ? P.line.length : 1), count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return this.RULES.filter(r => this.data.themes.some(T => T.rules === r)).map(k => ({ k, name: this.tx('rule.' + k, lang), desc: this.tx('rule.' + k + '.d', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.' + T.id + '.d', lang), board: P ? 'mc:' + JSON.stringify({ b: P.b }) : '' }; },
    guide: '../images/atlas/g-gem.webp',
  };
  const MCX = {
    ja: { hi: 'マンカラビだよ。種の数を数えて、いちばんいい一手を探そう！', mid: 'いいね！ あと{n}手。', ok: '（金の丸）', ng: '（赤い丸）' },
    en: { hi: "Gembeetle here! Count the seeds and find the best sowing.", mid: 'Nice! Moves left: {n}.' },
    zh: { hi: '我是宝石甲虫！数一数种子，找出最好的一步吧！', mid: '不错！还剩{n}步。' },
    'zh-TW': { hi: '我是寶石甲蟲！數一數種子，找出最好的一步吧！', mid: '不錯！還剩{n}步。' },
    ko: { hi: '보석풍뎅이야! 씨앗을 세어서 최선의 한 수를 찾아보자!', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Escarabajoya! Cuenta las semillas y busca la mejor siembra.', mid: '¡Bien! Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Scarabijou ! Compte les graines et trouve le meilleur semis.', mid: 'Bien ! Encore {n}.' },
    pt: { hi: 'Aqui é o Besourojoia! Conte as sementes e ache a melhor semeadura.', mid: 'Boa! Lances restantes: {n}.' },
    de: { hi: 'Hier ist Juwelkäfer! Zähl die Samen und finde den besten Zug.', mid: 'Gut! Noch {n}.' },
    ru: { hi: 'Это Джембитл! Считай камни и ищи лучший посев.', mid: 'Отлично! Осталось ходов: {n}.' },
    tr: { hi: 'Ben Gembeetle! Taşları say, en iyi hamleyi bul.', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Gembeetle! Hitung bijinya dan cari tebaran terbaik.', mid: 'Bagus! Sisa {n}.' },
    hi: { hi: 'मैं रत्नू भौंरा हूँ! बीज गिनो और सबसे अच्छी चाल ढूँढो।', mid: 'बढ़िया! {n} बाकी।' },
    ar: { hi: 'أنا خنفوس الجواهر! عُدَّ البذور وابحث عن أفضل نثر.', mid: 'رائع! بقي {n}.' },
  };
  BOOK.tafl = {
    url: '../tafl/puzzles.json?v=2', KEY: 'aicoding-tafl-puzzles', LAST: 'aicoding-tafl-pz-last', data: null, I: null,
    ICO: { Esc: '<path d="M4 20V4h16"/><path d="M9 15l6-6M11 9h4v4"/>', Cap: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>', Var: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>' },
    prep(d) { d.levels = d.themes; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'tf', goal: T.goal, spec: P.s, me: P.s.side === 2 ? 2 : 1, n: P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { const has = k => this.data.themes.some(T => T.grp === k); return ['Esc', 'Cap', 'Var'].filter(has).map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'tf:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/g-puffin.webp',
  };
  /* ---------- fox and geese (2026-11-24 担当C): foxgeese/puzzles.json (13 geese, traditional: w2–w4 the geese shut the fox in within N,
     t2–t3 the fox takes a goose within N — foxgeese/app.js puzzleMove), the full game's records 'aicoding-foxgeese-puzzles'
     { '<theme>-<j>': stars }. Texts: foxgeese/i18n-fg.js + i18n-fg-more.js (a sandbox); on the 3D table ドミダック's words
     (atlas/games/foxgeese-pz.js AtlasFoxgeesePz). Checked by tools/lesson-verify-foxgeese.js. ---------- */
  BOOK.foxgeese = {
    url: '../foxgeese/puzzles.json?v=6', KEY: 'aicoding-foxgeese-puzzles', LAST: 'aicoding-foxgeese-pz-last', data: null, I: null,
    ICO: { Win: '<circle cx="12" cy="12" r="3"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/>', Tac: '<path d="M5 19L19 5M14 5h5v5"/>' },
    fetch() {
      const ld = u => fetch(u).then(r => r.text()).catch(() => '');
      return Promise.all([fetch(this.url).then(r => r.json()), ld('../foxgeese/i18n-fg.js?v=10'), ld('../foxgeese/i18n-fg-more.js?v=15')]).then(([d, a, b]) => {
        const w = { I18N: {} }; ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'].forEach(l => { w.I18N[l] = {}; });
        for (const tx of [a, b]) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) {} }
        this.I = w.I18N; d.levels = d.themes; return d;
      });
    },
    tx(k, lang, v) { const F = (window.AtlasFoxgeesePz || {})[lang] || {}; let x = F[k]; if (Array.isArray(x)) x = x[Math.floor(Math.random() * x.length)]; const I = this.I || {}; if (x === undefined) x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'fg', goal: P.g || 'take', spec: Object.assign({ rule: this.data.rule }, P.s), me: P.s.side === 2 ? 2 : 1, n: P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Win', 'Tac'].filter(k => this.data.themes.some(T => T.grp === k)).map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'fg:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/av/duck-0.webp',
  };
  /* ---------- kōnane (2026-11-24 担当C): konane/puzzles.json ("win in N": leave the opponent without a jump — w1…w5, the themes stop
     and chain; konane/app.js puzzleMove), the full game's records 'aicoding-konane-puzzles' { '<theme>-<j>': stars }. Texts:
     konane/i18n-kn.js + i18n-kn-more.js (a sandbox, over the I18N the page builds from checkers/i18n.js); on the 3D table
     チェッカニ's words (atlas/games/konane-pz.js AtlasKonanePz). Checked by tools/lesson-verify-konane.js. ---------- */
  BOOK.konane = {
    url: '../konane/puzzles.json?v=6', KEY: 'aicoding-konane-puzzles', LAST: 'aicoding-konane-pz-last', data: null, I: null,
    ICO: { Win: '<path d="M5 18h14M6 18l-1-9 4 3 3-6 3 6 4-3-1 9"/>', Tac: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>' },
    fetch() {
      const ld = u => fetch(u).then(r => r.text()).catch(() => '');
      return Promise.all([fetch(this.url).then(r => r.json()), ld('../konane/i18n-kn.js?v=3'), ld('../konane/i18n-kn-more.js?v=3-l14n')]).then(([d, a, b]) => {
        const w = { I18N: {} }; ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'].forEach(l => { w.I18N[l] = {}; });
        for (const tx of [a, b]) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) {} }
        this.I = w.I18N; d.levels = d.themes; return d;
      });
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'kn', th: T.id, spec: Object.assign({ rule: this.data.rule }, P.s), me: P.s.side === 2 ? 2 : 1, n: P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Win', 'Tac'].filter(k => this.data.themes.some(T => T.grp === k)).map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'kn:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/g-crab.webp',
  };
  /* ---------- ugolki (2026-11-24 担当D): ugolki/puzzles.json ("win within N": the race of the corners, the opponent defends with
     its most stubborn reply — x2, w3 … b5; ugolki/app.js puzzleMove), the full game's records 'aicoding-ugolki-puzzles'
     { '<theme>-<j>': stars }. Texts: ugolki/i18n-ug*.js (a sandbox); on the 3D table モリフク's words (atlas/games/ugolki-pz.js
     AtlasUgolkiPz). Checked by tools/lesson-verify-ugolki.js. ---------- */
  BOOK.ugolki = {
    url: '../ugolki/puzzles.json?v=4', KEY: 'aicoding-ugolki-puzzles', LAST: 'aicoding-ugolki-pz-last', data: null, I: null,
    ICO: { Step: '<path d="M12 21v-8M12 13c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>', Tac: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>', End: '<path d="M5 18h14M6 18l-1-9 4 3 3-6 3 6 4-3-1 9"/>' },
    fetch() {
      const ld = u => fetch(u).then(r => r.text()).catch(() => '');
      return Promise.all([fetch(this.url).then(r => r.json()), ld('../ugolki/i18n-ug.js?v=4lv'), ld('../ugolki/i18n-ug-more.js?v=4lv'), ld('../ugolki/i18n-ug-eu.js?v=4lvn'), ld('../ugolki/i18n-ug-hiar.js?v=4lv-l14'), ld('../ugolki/i18n-ug-pzwhy.js?v=2')]).then(([d, ...src]) => {
        const w = { I18N: {} }; ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'].forEach(l => { w.I18N[l] = {}; });
        for (const tx of src) { try { new Function('window', 'I18N', tx)(w, w.I18N); } catch (e) {} }
        this.I = w.I18N; d.levels = d.themes; return d;
      });
    },
    tx(k, lang, v) { const I = this.I || {}; let x = I[lang] && I[lang][k]; if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[T.id + '-' + j])), cat: T.grp })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: T.id + '-' + j, kind: 'ug', th: T.id, spec: Object.assign({}, P.s), me: P.s.side === 2 ? 2 : 1, n: P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return ['Step', 'Tac', 'End'].filter(k => this.data.themes.some(T => T.grp === k)).map(k => ({ k, name: this.tx('pz.grp' + k, lang), desc: this.tx('pz.grp' + k + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'ug:' + JSON.stringify(P.s) : '' }; },
    guide: '../images/atlas/g-owl.webp',
  };
  /* ---------- morris (2026-11-16): morris/puzzles(-six|-twelve).json ("win in N" / "mill in N", themes per rule set), the full game's
     records 'aicoding-morris-puzzles2' { '<six:|twelve:><theme>-<j>': stars } (morris/index.html pzKey). Texts: morris/i18n.js + i18n_more.js (a sandbox). */
  const MMV = ['nine', 'six', 'twelve'], MMPRE = v => v === 'nine' ? '' : v + ':';
  /* ---------- dots & boxes (2026-11-16): dots/puzzles/<theme>.json in the order of puzzles/index.json (easy → hard, by the solver), the
     full game's records 'dots-puzzles-v2' { '<theme>-<lv>-<k>': 1 · 0.5 · 0.25 } (= dots/learn.js pzKey / pzEnc). Texts: dots/i18n.js +
     i18n-learn.js (a sandbox) + the long texts content/text.<lang>.json. Played to the end of the game against the solver (dots/learn.js
     puzzle v2). */
  const DTG = [['T', ['take', 'double', 'longchain', 'loop', 'sacrifice', 'count']], ['R', ['real3', 'real4', 'real5']]];
  const DTK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const dtE = x => [...x].map(c => DTK.indexOf(c)), dtO = x => [...x].map(c => c === '.' ? -1 : +c), dtV = x => [...x].map((c, e) => c === '.' ? null : [e, DTK.indexOf(c) - 30]).filter(Boolean);
  BOOK.dots = {
    url: '../dots/puzzles/index.json', KEY: 'dots-puzzles-v2', LAST: 'dots-pz-last3d', data: null, I: null,
    fetch() {
      const lang = (document.documentElement.lang || 'ja'), langs = [...new Set(['ja', 'en', lang])];
      return fetch('../dots/puzzles/index.json?v=20261116').then(r => r.json()).then(ix => Promise.all([
        Promise.all(DTG.flatMap(g => g[1]).filter(id => ix.cats.some(c => c.id === id)).map(id => fetch(`../dots/puzzles/${id}.json?v=20261116`).then(r => r.json()).then(d => [id, d]))),
        Promise.all(langs.map(l => fetch(`../dots/content/text.${l}.json?v=20261021L`).then(r => r.json()).then(d => [l, d]).catch(() => [l, {}])))]).then(([F, C]) => ({ ix, F, C })));
    },
    prep({ ix, F, C }) {
      const files = Object.fromEntries(F), themes = [];
      DTG.forEach(([g, ids]) => ids.forEach(id => { const c = ix.cats.find(x => x.id === id), d = files[id]; if (!c || !d) return;
        const ord = c.order || c.counts.flatMap((m, lv) => Array.from({ length: m }, (_, k) => [lv, k]));
        themes.push({ id, grp: g, puzzles: ord.map(([lv, k]) => Object.assign({ lk: [lv, k] }, d.levels[lv][k])).filter(q => q.n) }); }));
      this.C = Object.fromEntries(C); return { themes, levels: themes };
    },
    tx(k, lang, v) { const I = this.I || {}, C = this.C || {}; let x = C[lang] && C[lang][k]; if (x === undefined) x = I[lang] && I[lang][k]; if (x === undefined) x = (C.en && C.en[k]) !== undefined ? C.en[k] : I.en && I.en[k]; if (x === undefined) x = (C.ja && C.ja[k]) || (I.ja && I.ja[k]) || ''; if (Array.isArray(x)) x = x.join(''); return v ? fill(x, v) : x; },
    sv: x => x === true || x >= 1 ? 3 : x >= 0.5 ? 2 : x > 0 ? 1 : 0,
    pr() { return store.get(this.KEY, {}) || {}; },
    rk: (T, j) => T.id + '-' + T.puzzles[j].lk[0] + '-' + T.puzzles[j].lk[1],
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[this.rk(T, j)])), cat: T.grp })); },
    title(i, lang) { return this.tx('pc.' + this.data.themes[i].id + '.t', lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], q = T.puzzles[j], values = dtV(q.v), best = values.reduce((a, b) => b[1] > a[1] ? b : a)[0];
      return { i, j, P: q, rk: this.rk(T, j), kind: 'dt', spec: { n: q.n, edges: dtE(q.e), owners: dtO(q.o) }, me: 0, values, best, target: q.t, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(), enc = s => s >= 3 ? 1 : s === 2 ? 0.5 : s === 1 ? 0.25 : 0; pr[p.rk] = enc(Math.max(this.sv(pr[p.rk]), stars)); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return DTG.map(([g]) => ({ k: g, name: this.tx('pz.grp' + g, lang), desc: this.tx('pz.grp' + g + 'Sub', lang), icon: `<svg viewBox="0 0 24 24">${g === 'T' ? '<path d="M3 6h18v12H3zM9 6v12M15 6v12"/>' : '<rect x="3" y="3" width="18" height="18"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>'}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], q = T.puzzles[0]; return { desc: this.tx('pc.' + T.id + '.d', lang), board: q ? 'dt:' + JSON.stringify({ n: q.n, e: q.e, o: q.o }) : '' }; },
    guide: '../images/atlas/g-dot.webp',
  };
  const DTX = {
    ja: { hi: 'ハコピヨだよ！ 詰めドットに挑戦しよう。最後まで最善を続けて、目標のスコアに届かせてね。', opp: '相手の番…', mine: 'あなたの番。' },
    en: { hi: "Boxchick here! Keep finding the best line to the end and reach the target score.", opp: 'Their turn…', mine: 'Your turn.' },
    zh: { hi: '点格棋谜题！一直下出最好的线，达到目标分数吧。', opp: '对手的回合…', mine: '轮到你了。' },
    'zh-TW': { hi: '點格棋謎題！一直下出最好的線，達到目標分數吧。', opp: '對手的回合…', mine: '輪到你了。' },
    ko: { hi: '도트 퍼즐이야! 끝까지 최선의 선을 그어 목표 점수에 도달하자.', opp: '상대 차례…', mine: '네 차례야.' },
    es: { hi: '¡Problemas de puntos! Sigue con la mejor línea hasta el final y alcanza el objetivo.', opp: 'Su turno…', mine: 'Tu turno.' },
    fr: { hi: 'Problèmes de pipopipette ! Trouve la meilleure ligne jusqu’au bout et atteins l’objectif.', opp: 'À l’adversaire…', mine: 'À toi.' },
    pt: { hi: 'Problemas de pontinhos! Siga com a melhor linha até o fim e alcance a meta.', opp: 'Vez do oponente…', mine: 'Sua vez.' },
    de: { hi: 'Käsekästchen-Rätsel! Finde bis zum Ende die beste Linie und erreiche das Ziel.', opp: 'Gegner ist dran…', mine: 'Du bist dran.' },
    ru: { hi: 'Задачи «Точки и квадраты»! Проводи лучшую линию до конца и достигни цели.', opp: 'Ход соперника…', mine: 'Твой ход.' },
    tr: { hi: 'Noktalar bulmacası! Sonuna kadar en iyi çizgiyi bul ve hedefe ulaş.', opp: 'Rakibin sırası…', mine: 'Senin sıran.' },
    id: { hi: 'Teka-teki titik! Terus pilih garis terbaik sampai akhir dan capai target.', opp: 'Giliran lawan…', mine: 'Giliranmu.' },
    hi: { hi: 'डॉट्स पहेली! अंत तक सबसे अच्छी रेखा खींचो और लक्ष्य स्कोर पाओ।', opp: 'विरोधी की बारी…', mine: 'तुम्हारी बारी।' },
    ar: { hi: 'ألغاز النقاط! واصل رسم أفضل خط حتى النهاية وحقّق الهدف.', opp: 'دور الخصم…', mine: 'دورك.' },
  };
  BOOK.morris = {
    url: '../morris/puzzles.json?v=20261104pzd', KEY: 'aicoding-morris-puzzles2', LAST: 'aicoding-morris-pz-last3d', data: null, I: null,
    fetch: () => Promise.all(MMV.map(v => fetch(`../morris/puzzles${v === 'nine' ? '' : '-' + v}.json?v=20261104pzd`).then(r => r.json()))),
    ICO: { nine: '<rect x="3" y="3" width="18" height="18"/><rect x="7" y="7" width="10" height="10"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>', six: '<rect x="4" y="4" width="16" height="16"/><rect x="8.5" y="8.5" width="7" height="7"/><path d="M12 4v4.5M12 15.5V20M4 12h4.5M15.5 12H20"/>', twelve: '<rect x="3" y="3" width="18" height="18"/><rect x="7" y="7" width="10" height="10"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4"/>' },
    prep(L) { const T = []; L.forEach((d, k) => d.themes.forEach(t => { t.v = MMV[k]; t.puzzles.forEach(P => { P.mv = t.v; }); T.push(t); })); return { themes: T, levels: T }; },
    tx(k, lang, v) { const I = this.I || {}; let x = (I[lang] && I[lang][k]); if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]) || ''; return v ? fill(x, v) : x; },
    sv: x => x === true ? 3 : (+x || 0),
    pr() { return store.get(this.KEY, {}) || {}; },
    rk: (T, j) => MMPRE(T.v) + T.id + '-' + j,
    sets() { const pr = this.pr(); return this.data.themes.map((T, i) => ({ key: i, recs: T.puzzles.map((_, j) => this.sv(pr[this.rk(T, j)])), cat: T.v })); },
    title(i, lang) { return this.tx('pz.th.' + this.data.themes[i].id, lang); },
    problem(i, j, X, lang) {
      const T = this.data.themes[i], P = T.puzzles[j];
      return { i, j, P, rk: this.rk(T, j), kind: 'mm', goal: T.goal, spec: { v: T.v, s: P.s }, me: P.s.side === 2 ? 2 : 1, n: P.n, count: T.puzzles.length, set: this.title(i, lang) };
    },
    save(p, stars, daily) { const pr = this.pr(); pr[p.rk] = Math.max(this.sv(pr[p.rk]), stars); store.set(this.KEY, pr); if (!daily) store.set(this.LAST, String(p.i)); },
    cats(lang) { return MMV.map(k => ({ k, name: this.tx('title.' + k, lang), desc: this.tx(k === 'nine' ? 'pz.desc' : 'pz.desc.' + k, lang), icon: `<svg viewBox="0 0 24 24">${this.ICO[k]}</svg>` })); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'mm:' + JSON.stringify({ v: T.v, b: P.s.b }) : '' }; },
    guide: '../images/atlas/g-owl.webp',
  };
  const MMX = {
    ja: { hi: 'モリフクだよ。ミルの読みをきたえるパズルに挑戦しよう！', mid: 'いい手！ あと{n}手。', out: '{n}手では届かなかった…' },
    en: { hi: "Millowl here! Let's sharpen your mill reading with morris puzzles.", mid: 'Good move! Moves left: {n}.', out: 'Not done — move limit: {n}…' },
    zh: { hi: '我是方阵猫头鹰！用直棋谜题锻炼成三的计算吧！', mid: '好棋！还剩{n}步。', out: '{n}步内没能完成……' },
    'zh-TW': { hi: '我是方陣貓頭鷹！用直棋謎題鍛鍊成三的計算吧！', mid: '好棋！還剩{n}步。', out: '{n}步內沒能完成……' },
    ko: { hi: '모리후쿠야! 모리스 퍼즐로 밀을 읽는 힘을 길러 보자!', mid: '좋은 수! {n}수 남았어.', out: '{n}수 안에 끝내지 못했어…' },
    es: { hi: '¡Soy Millowl! Entrena el cálculo de molinos con problemas de molino.', mid: '¡Buena jugada! Jugadas restantes: {n}.', out: 'No se logró — límite de jugadas: {n}…' },
    fr: { hi: 'C’est Millowl ! Entraîne ton calcul des moulins avec des problèmes de marelle.', mid: 'Bon coup ! Encore {n}.', out: 'Pas réussi — limite de coups : {n}…' },
    pt: { hi: 'Aqui é o Millowl! Treine o cálculo de moinhos com problemas de trilha.', mid: 'Boa jogada! Lances restantes: {n}.', out: 'Não deu — limite de lances: {n}…' },
    de: { hi: 'Hier ist Millowl! Trainiere dein Mühlen-Rechnen mit Mühle-Aufgaben.', mid: 'Guter Zug! Noch {n}.', out: 'Nicht geschafft – Zuglimit: {n}…' },
    ru: { hi: 'Это Миллоул! Тренируй расчёт мельниц на задачах.', mid: 'Хороший ход! Осталось ходов: {n}.', out: 'Не вышло — лимит ходов: {n}…' },
    tr: { hi: 'Ben Millowl! Değirmen bulmacalarıyla hesap gücünü geliştir.', mid: 'İyi hamle! {n} kaldı.', out: '{n} hamlede olmadı…' },
    id: { hi: 'Aku Millowl! Latih perhitungan mill dengan soal morris.', mid: 'Langkah bagus! Sisa {n}.', out: 'Tidak berhasil dalam {n} langkah…' },
    hi: { hi: 'मैं मिलआउल हूँ! मोरिस पहेलियों से मिल की गणना निखारो।', mid: 'बढ़िया चाल! {n} बाकी।', out: 'नहीं हुआ — चालों की सीमा: {n}…' },
    ar: { hi: 'أنا ميل أول! درّب حسابك للطواحين بألغاز المورِس.', mid: 'نقلة جيدة! بقي {n}.', out: 'لم ينجح — حدّ النقلات: {n}…' },
  };
  const TFX = {
    ja: { hi: 'タフリンだよ。詰めタフルで、王を逃がす読み・捕らえる読みをきたえよう！', mid: 'いい手！ あと{n}手。', out: '{n}手では決まらなかった…' },
    en: { hi: "I'm Taflin! Sharpen your reading with tafl puzzles: free the king, or catch him.", mid: 'Good move! Moves left: {n}.', out: 'Not done — move limit: {n}…' },
    zh: { hi: '我是塔芙林！用塔夫棋谜题练习让国王逃脱或擒住国王的计算吧！', mid: '好棋！还剩{n}手。', out: '{n}手内没能完成……' },
    'zh-TW': { hi: '我是塔芙林！用塔夫棋謎題練習讓國王逃脫或擒住國王的計算吧！', mid: '好棋！還剩{n}手。', out: '{n}手內沒能完成……' },
    ko: { hi: '타플린이야! 타플 퍼즐로 왕을 탈출시키거나 잡는 수읽기를 단련하자!', mid: '좋은 수! {n}수 남았어.', out: '{n}수 안에 끝내지 못했어…' },
    es: { hi: '¡Soy Taflín! Entrena el cálculo con problemas de tafl: libera al rey o atrápalo.', mid: '¡Buena jugada! Jugadas restantes: {n}.', out: 'No se logró — límite de jugadas: {n}…' },
    fr: { hi: 'Je suis Taflin ! Entraîne ton calcul avec des problèmes de tafl : libère le roi ou capture-le.', mid: 'Bon coup ! Encore {n}.', out: 'Pas réussi — limite de coups : {n}…' },
    pt: { hi: 'Sou o Taflin! Treine o cálculo com problemas de tafl: liberte o rei ou capture-o.', mid: 'Boa jogada! Lances restantes: {n}.', out: 'Não deu — limite de lances: {n}…' },
    de: { hi: 'Ich bin Taflin! Trainiere dein Rechnen mit Tafl-Aufgaben: befreie den König oder fang ihn.', mid: 'Guter Zug! Noch {n}.', out: 'Nicht geschafft – Zuglimit: {n}…' },
    ru: { hi: 'Я Тафлин! Тренируй расчёт на задачах тафла: выведи короля или поймай его.', mid: 'Хороший ход! Осталось ходов: {n}.', out: 'Не вышло — лимит ходов: {n}…' },
    tr: { hi: 'Ben Taflin! Tafl bulmacalarıyla hesap gücünü geliştir: kralı kaçır ya da yakala.', mid: 'İyi hamle! {n} kaldı.', out: '{n} hamlede olmadı…' },
    id: { hi: 'Aku Taflin! Latih perhitungan dengan soal tafl: loloskan raja atau tangkap dia.', mid: 'Langkah bagus! Sisa {n}.', out: 'Tidak berhasil dalam {n} langkah…' },
    hi: { hi: 'मैं टैफ़लिन हूँ! टैफ़्ल पहेलियों से गणना निखारो: राजा को भगाओ या पकड़ो।', mid: 'बढ़िया चाल! {n} बाकी।', out: 'नहीं हुआ — चालों की सीमा: {n}…' },
    ar: { hi: 'أنا تافلين! درّب حسابك بألغاز التافل: حرّر الملك أو أمسك به.', mid: 'نقلة جيدة! بقي {n}.', out: 'لم ينجح — حدّ النقلات: {n}…' },
  };
  const AMX = {
    ja: { hi: 'ケロだよ。アマゾンズのパズルで、相手を追いつめる読みをきたえるケロ！', mid: 'いい調子ケロ！ あと{n}手。', reply: '相手はこう答えたケロ。あと{n}手。', guard: '守れたケロ！ あと{n}回しのごう。' },
    en: { hi: "Kero here! Let's sharpen your reading with Amazons puzzles.", mid: 'Good! Moves left: {n}.', reply: 'The opponent answered. Moves left: {n}.', guard: 'Held! Times left to hold: {n}.' },
    zh: { hi: '我是呱呱！用亚马逊棋谜题锻炼计算力吧！', mid: '不错！还剩{n}手。', reply: '对手这样应对。还剩{n}手。', guard: '守住了！还要再守{n}次。' },
    'zh-TW': { hi: '我是呱呱！用亞馬遜棋謎題鍛鍊計算力吧！', mid: '不錯！還剩{n}手。', reply: '對手這樣應對。還剩{n}手。', guard: '守住了！還要再守{n}次。' },
    ko: { hi: '케로야! 아마존 퍼즐로 수읽기를 단련하자!', mid: '좋아! {n}수 남았어.', reply: '상대가 이렇게 받았어. {n}수 남았어.', guard: '막았어! {n}번 더 버티자.' },
    es: { hi: '¡Soy Kero! Entrena tu cálculo con problemas de Amazonas.', mid: '¡Bien! Jugadas restantes: {n}.', reply: 'El rival respondió. Jugadas restantes: {n}.', guard: '¡Aguantaste! Veces por resistir: {n}.' },
    fr: { hi: 'C’est Kero ! Entraîne ton calcul avec des problèmes d’Amazones.', mid: 'Bien ! Coups restants : {n}.', reply: 'L’adversaire a répondu. Coups restants : {n}.', guard: 'Tenu ! Encore {n} fois.' },
    pt: { hi: 'Aqui é o Kero! Treine o cálculo com problemas de Amazonas.', mid: 'Boa! Lances restantes: {n}.', reply: 'O rival respondeu. Lances restantes: {n}.', guard: 'Segurou! Vezes por segurar: {n}.' },
    de: { hi: 'Hier ist Kero! Trainiere dein Rechnen mit Amazonen-Aufgaben.', mid: 'Gut! Verbleibende Züge: {n}.', reply: 'Der Gegner hat geantwortet. Verbleibende Züge: {n}.', guard: 'Gehalten! Noch {n}-mal.' },
    ru: { hi: 'Это Керо! Тренируем расчёт на задачах по амазонкам.', mid: 'Отлично! Осталось ходов: {n}.', reply: 'Соперник ответил. Осталось ходов: {n}.', guard: 'Удержали! Осталось удержаний: {n}.' },
    tr: { hi: 'Ben Kero! Amazonlar bulmacalarıyla hesap gücünü geliştirelim.', mid: 'Güzel! {n} hamle kaldı.', reply: 'Rakip cevap verdi. {n} hamle kaldı.', guard: 'Dayandın! {n} kez daha.' },
    id: { hi: 'Aku Kero! Ayo latih perhitungan dengan soal Amazon.', mid: 'Bagus! Sisa {n} langkah.', reply: 'Lawan menjawab. Sisa {n} langkah.', guard: 'Bertahan! {n} kali lagi.' },
    hi: { hi: 'मैं केरो हूँ! अमेज़न्स पहेलियों से गणना मज़बूत करें।', mid: 'बढ़िया! बची चालें: {n}।', reply: 'विरोधी ने जवाब दिया। बची चालें: {n}।', guard: 'टिके रहे! {n} बार और।' },
    ar: { hi: 'أنا كيرو! لنقوِّ الحساب بألغاز الأمازونات.', mid: 'رائع! بقي {n}.', reply: 'ردّ الخصم. بقي {n}.', guard: 'صمدت! المرات المتبقية: {n}.' },
  };
  const HXX = {
    ja: { hi: 'ゴイシペンだよ。詰めヘックスで、つなぐ読みをきたえよう！', out: '{n}手以内にはつながらなかった…', mid: 'いい調子！ あと{n}手。' },
    en: { hi: "Stoneguin here! Let's train your reading with Hex puzzles.", out: "Couldn't connect — move limit: {n}…", mid: 'Good! Moves left: {n}.' },
    zh: { hi: '我是棋石企鹅！用六贯棋谜题锻炼计算力吧！', out: '没能在{n}手内连通…', mid: '不错！还剩{n}手。' },
    'zh-TW': { hi: '我是棋子企鵝！用六貫棋謎題鍛鍊計算力吧！', out: '沒能在{n}手內連通…', mid: '不錯！還剩{n}手。' },
    ko: { hi: '바둑돌펭이야! 헥스 퍼즐로 수읽기를 단련하자!', out: '{n}수 안에 잇지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Pingüipiedra! Entrena tu lectura con problemas de Hex.', out: 'No se conectó — límite de jugadas: {n}…', mid: '¡Bien! Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Pingopierre ! Entraîne ta lecture avec des problèmes de Hex.', out: 'Pas connecté — limite de coups : {n}…', mid: 'Bien ! Coups restants : {n}.' },
    pt: { hi: 'Aqui é o Pinguipedra! Treine a leitura com problemas de Hex.', out: 'Não conectou — limite de lances: {n}…', mid: 'Boa! Lances restantes: {n}.' },
    de: { hi: 'Hier ist Steinguin! Trainiere dein Lesen mit Hex-Aufgaben.', out: 'Nicht verbunden – Zuglimit: {n}…', mid: 'Gut! Verbleibende Züge: {n}.' },
    ru: { hi: 'Это Стоунгвин! Тренируем расчёт на задачах по хексу.', out: 'Соединить не удалось — лимит ходов: {n}…', mid: 'Отлично! Осталось ходов: {n}.' },
    tr: { hi: 'Ben Stoneguin! Hex bulmacalarıyla okuma gücünü geliştirelim.', out: '{n} hamlede bağlanamadı…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Stoneguin! Ayo latih membaca dengan soal Hex.', out: 'Tidak tersambung dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं स्टोनगुइन हूँ! हेक्स पहेलियों से पढ़ने की क्षमता बढ़ाएँ।', out: 'जुड़ नहीं पाए — चालों की सीमा: {n}…', mid: 'बढ़िया! बची चालें: {n}।' },
    ar: { hi: 'أنا بطريق الحجر! لنقوِّ القراءة بألغاز هيكس.', out: 'لم يتم الاتصال — حدّ النقلات: {n}…', mid: 'رائع! بقي {n}.' },
  };
  // the guide's lines for 詰めチェッカー (the rest are the game's own texts)
  const CKX = {
    ja: { hi: 'チェッカニだよ！ 詰めチェッカーで読みをきたえよう！', out: '{n}手以内に目標に届かなかった…', mid: 'いい調子！ あと{n}手。' },
    en: { hi: "Checkrab here! Let's sharpen your reading with checkers puzzles!", out: "Couldn't reach the goal — move limit: {n}…", mid: 'Nice! Moves left: {n}.' },
    zh: { hi: '我是跳棋蟹！用跳棋谜题锻炼计算力吧！', out: '没能在{n}步内达成目标……', mid: '不错！还剩{n}步。' },
    'zh-TW': { hi: '我是跳棋蟹！用跳棋謎題鍛鍊計算力吧！', out: '沒能在{n}步內達成目標……', mid: '不錯！還剩{n}步。' },
    ko: { hi: '체카니야! 체커 퍼즐로 수읽기를 단련하자!', out: '{n}수 안에 목표에 닿지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Checkrab! Entrena tu cálculo con problemas de damas.', out: 'No se alcanzó el objetivo — límite de jugadas: {n}…', mid: '¡Bien! Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Checkrab ! Entraîne ton calcul avec des problèmes de dames.', out: 'Objectif non atteint — limite de coups : {n}…', mid: 'Bien ! Coups restants : {n}.' },
    pt: { hi: 'Aqui é o Checkrab! Treine o cálculo com problemas de damas.', out: 'Não deu para chegar ao objetivo — limite de lances: {n}…', mid: 'Boa! Lances restantes: {n}.' },
    de: { hi: 'Hier ist Checkrab! Trainiere dein Rechnen mit Dame-Aufgaben.', out: 'Ziel nicht erreicht – Zuglimit: {n}…', mid: 'Gut! Verbleibende Züge: {n}.' },
    ru: { hi: 'Это Чекраб! Тренируем расчёт на шашечных задачах.', out: 'Цель не достигнута — лимит ходов: {n}…', mid: 'Отлично! Осталось ходов: {n}.' },
    tr: { hi: 'Ben Checkrab! Dama bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede hedefe ulaşılamadı…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Checkrab! Ayo latih perhitungan dengan soal dam.', out: 'Target tidak tercapai dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं चेकरैब हूँ! चेकर्स पहेलियों से गणना मज़बूत करें।', out: 'लक्ष्य तक नहीं पहुँचे — चालों की सीमा: {n}…', mid: 'बढ़िया! बची चालें: {n}।' },
    ar: { hi: 'أنا تشيكراب! لنقوِّ الحساب بألغاز الداما.', out: 'لم يتحقق الهدف — حدّ النقلات: {n}…', mid: 'رائع! بقي {n}.' },
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

  /* ---------- janggi (2026-11-24, 担当D): janggi/puzzles.json (mate in 1–3, checks-only mate in 4 and 5+; the same "mate in N" runner
     as xiangqi, kind 'xq'), the full game's records 'aicoding-janggi-puzzles' { '<theme>-<j>': stars }, the last theme
     'aicoding-janggi-pz-last', the daily 'aicoding-janggi-daily'. Texts: janggi/i18n.js; on the 3D table in Japanese ショウギツネ's
     wording (atlas/games/janggi-pz.js AtlasJanggiPz). Checked by tools/lesson-verify-janggi.js. ---------- */
  BOOK.janggi = Object.assign({}, BOOK.xiangqi, {
    url: '../janggi/puzzles.json?v=3', KEY: 'aicoding-janggi-puzzles', LAST: 'aicoding-janggi-pz-last', data: null, I: null,
    tx(k, lang, v) { const V = (window.AtlasJanggiPz || {})[lang]; let x = V && V[k]; if (x === undefined) return BOOK.xiangqi.tx.call(this, k, lang, v); if (Array.isArray(x)) x = x[(this.txN[k] = ((this.txN[k] == null ? -1 : this.txN[k]) + 1)) % x.length];   /* (ショウギツネ's variants in turn) */ return v ? fill(x, v) : x; },
    txN: {},
    cats(lang) { const has = new Set(this.data.themes.map(T => T.grp)); return BOOK.xiangqi.cats.call(this, lang).filter(c => has.has(c.k)); },
    look(i, lang) { const T = this.data.themes[i], P = T.puzzles[0]; return { desc: this.tx('pz.th.' + T.id + '.sub', lang), board: P ? 'xq:jg|' + P.s : '' }; },
  });

  /* ---------- backgammon (2026-11-14): backgammon/puzzles.json (10 categories in 4 groups; a play for a given roll, judged against
     the engine's candidate plays (equity), or a cube decision), the full game's records 'aicoding-backgammon-v2-puzzles' { id: stars },
     replaced puzzles kept for those who met them (pzKeep: 'aicoding-backgammon-v2-pz-keep'), the last category
     'aicoding-backgammon-pz-last', the daily 'aicoding-backgammon-v2-daily'. Texts: the game's i18n*.js (a sandbox). On the 3D table
     you always play the near side: a problem for the other side is turned round (the two halves of the position swapped — the
     plays are written in the mover's own numbering, so they stay as they are). Rules: backgammon/bg.js (window.BG, loaded by the table). ---------- */
  const BG_TX = ['../backgammon/i18n.js?v=20261123m0', '../backgammon/i18n-x.js?v=20261111c8', '../backgammon/i18n-ls.js?v=20261107l14', '../backgammon/i18n-op.js?v=20261124op', '../backgammon/i18n-teach.js?v=1', '../backgammon/i18n-ls2.js?v=3', '../backgammon/voice-dicepup-ja.js?v=3'];
  const bgTexts = () => Promise.all(BG_TX.map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(L => { const w = {}; for (const tx of L) { try { new Function('window', 'var I18N = window.I18N || (window.I18N = {});\n' + tx.replace(/^\s*var I18N = window\.I18N = \{\};/m, ''))(w); } catch (e) { console.warn('[puzzles] backgammon texts', e); } } window.AtlasBgTeach = { name: w.BGTeachName, html: w.BGTeachHTML }; window.AtlasBgChoice = w.BGChoice; return w.I18N || {}; });
  // the commentary engine (backgammon/explain.js: what a play is for) — after the rules (it reads window.BG when it loads)
  const bgScript = (src, test) => test() ? Promise.resolve() : new Promise(res => { const sc = document.createElement('script'); sc.src = src; sc.onload = sc.onerror = () => res(); document.head.appendChild(sc); });
  window.AtlasBgExplain = window.AtlasBgExplain || (() => bgScript('../backgammon/bg.js?v=20261115p', () => window.BG && BG.genPlays).then(() => bgScript('../backgammon/explain.js?v=20261115t', () => window.BGX && BGX.teach)));
  window.AtlasBgTexts = window.AtlasBgTexts || (() => window.__bgTx || (window.__bgTx = bgTexts()));
  const bgTurn = (pos, side) => side === 1 ? String(pos).slice(26) + String(pos).slice(0, 26) : String(pos);   // (the mover always at the near side)
  const bgCk = () => { let ck = ['gold', 'black']; try { const st = (JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}') || {}).settings || {}; if (st.ck && st.ck[0] && st.ck[1] && st.ck[0] !== st.ck[1]) ck = st.ck.slice(); } catch (e) {} return ck; };
  const BG_GROUPS = [['mid', ['opening', 'hit', 'point', 'prime', 'blitz']], ['def', ['safe', 'defense']], ['end', ['race', 'bearoff']], ['cube', ['cube']]];
  const BG_ICO = { mid: '<path d="M4 20 20 4M14 4h6v6"/><path d="M4 14l6 6"/>', def: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', end: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>', cube: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01" stroke-width="3.2"/>' };
  BOOK.backgammon = {
    url: '../backgammon/puzzles.json?v=20261021fz', KEY: 'aicoding-backgammon-v2-puzzles', LAST: 'aicoding-backgammon-pz-last', KEEP: 'aicoding-backgammon-v2-pz-keep', data: null, I: null,
    prep(d) { d.levels = d.cats; return d; },
    tx(k, lang, v) { const I = this.I || {}; let x = lang === 'ja' && I['ja@dicepup'] ? I['ja@dicepup'][k] : undefined; if (x === undefined) x = I[lang] && I[lang][k];   /* (ダイスン's own lines first, backgammon/voice-dicepup-ja.js) */ if (x === undefined) x = I.en && I.en[k]; if (x === undefined) x = (I.ja && I.ja[k]); if (x === undefined) return ''; return v && typeof x === 'string' ? fill(x, v) : x; },
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
    en: { hi: "Shogitsune here! Let's train your reading with xiangqi mates!", out: "Couldn't mate — move limit: {n}…", mid: 'Nice! Moves left: {n}.' },
    zh: { hi: '我是将棋狐！用象棋杀局锻炼计算力吧！', out: '没能在{n}步内将死……', mid: '不错！还剩{n}步。' },
    'zh-TW': { hi: '我是將棋狐！用象棋殺局鍛鍊計算力吧！', out: '沒能在{n}步內將死……', mid: '不錯！還剩{n}步。' },
    ko: { hi: '쇼기여우야! 샹치 묘수풀이로 수읽기를 단련하자!', out: '{n}수 안에 외통을 만들지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Shogizorro! Entrena tu cálculo con mates de xiangqi.', out: 'No se logró el mate — límite de jugadas: {n}…', mid: '¡Bien! Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Shogirenard ! Entraîne ton calcul avec des mats de xiangqi.', out: 'Pas de mat — limite de coups : {n}…', mid: 'Bien ! Coups restants : {n}.' },
    pt: { hi: 'Aqui é a Shogiraposa! Treine o cálculo com mates de xiangqi.', out: 'Não deu mate — limite de lances: {n}…', mid: 'Boa! Lances restantes: {n}.' },
    de: { hi: 'Hier ist Shogifuchs! Trainiere dein Rechnen mit Xiangqi-Mattaufgaben.', out: 'Kein Matt – Zuglimit: {n}…', mid: 'Gut! Verbleibende Züge: {n}.' },
    ru: { hi: 'Это Сёгицунэ! Тренируем расчёт на задачах на мат в сянци.', out: 'Мат не получился — лимит ходов: {n}…', mid: 'Отлично! Осталось ходов: {n}.' },
    tr: { hi: 'Ben Shogitsune! Xiangqi mat bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede mat gelmedi…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Shogitsune! Ayo latih perhitungan dengan soal skakmat xiangqi.', out: 'Skakmat tidak tercapai dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं शोगित्सुने हूँ! शियांगची मात पहेलियों से गणना मज़बूत करें।', out: 'मात नहीं हुई — चालों की सीमा: {n}…', mid: 'बढ़िया! बची चालें: {n}।' },
    ar: { hi: 'أنا شوغيتسوني! لنقوِّ الحساب بألغاز المات في الشيانغتشي.', out: 'لم يتحقق المات — حدّ النقلات: {n}…', mid: 'رائع! بقي {n}.' },
  };
  // the guide's lines for the janggi mates (ショウギツネ, as atlas/rules/janggi.js; the rest are the game's own texts)
  // (mid also follows a move off the line — pz.stray — so it only counts the moves left, no praise: 2026-11-24 追20)
  const JGX = {
    ja: { hi: 'やあ、ショウギツネだよ！ チャンギの詰めで読みをきたえよう。', out: '{n}手以内には詰ませられなかった…', mid: '残りはあと{n}手だよ。' },
    en: { hi: "Shogitsune here! Let's train your reading with janggi mates!", out: "Couldn't mate — move limit: {n}…", mid: 'Moves left: {n}.' },
    zh: { hi: '我是将棋狐！用韩国象棋杀局锻炼计算力吧！', out: '没能在{n}步内将死……', mid: '还剩{n}步。' },
    'zh-TW': { hi: '我是將棋狐！用韓國象棋殺局鍛鍊計算力吧！', out: '沒能在{n}步內將死……', mid: '還剩{n}步。' },
    ko: { hi: '쇼기츠네야! 장기 묘수풀이로 수읽기를 단련하자!', out: '{n}수 안에 외통을 만들지 못했어…', mid: '{n}수 남았어.' },
    es: { hi: '¡Soy Shogitsune! Entrena tu cálculo con mates de janggi.', out: 'No se logró el mate — límite de jugadas: {n}…', mid: 'Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Shogitsune ! Entraîne ton calcul avec des mats de janggi.', out: 'Pas de mat — limite de coups : {n}…', mid: 'Coups restants : {n}.' },
    pt: { hi: 'Aqui é a Shogitsune! Treine o cálculo com mates de janggi.', out: 'Não deu mate — limite de lances: {n}…', mid: 'Lances restantes: {n}.' },
    de: { hi: 'Hier ist Shogitsune! Trainiere dein Rechnen mit Janggi-Mattaufgaben.', out: 'Kein Matt – Zuglimit: {n}…', mid: 'Verbleibende Züge: {n}.' },
    ru: { hi: 'Это Сёгицунэ! Тренируем расчёт на задачах на мат в чанги.', out: 'Мат не получился — лимит ходов: {n}…', mid: 'Осталось ходов: {n}.' },
    tr: { hi: 'Ben Shogitsune! Janggi mat bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede mat gelmedi…', mid: '{n} hamle kaldı.' },
    id: { hi: 'Aku Shogitsune! Ayo latih perhitungan dengan soal skakmat janggi.', out: 'Skakmat tidak tercapai dalam {n} langkah…', mid: 'Sisa {n} langkah.' },
    hi: { hi: 'मैं शोगित्सुने हूँ! जांग्गी मात पहेलियों से गणना मज़बूत करें।', out: 'मात नहीं हुई — चालों की सीमा: {n}…', mid: 'बची चालें: {n}।' },
    ar: { hi: 'أنا شوغيتسوني! لنقوِّ الحساب بألغاز المات في الجانغي.', out: 'لم يتحقق المات — حدّ النقلات: {n}…', mid: 'بقي {n}.' },
  };
  const BGX = {
    ja: { hi: 'ワン！ ダイスンだよ。バックギャモンのパズルで最善手を見つけよう！', mid: 'あと{n}つ動かそう。' },
    en: { hi: "Woof! Dicepup here. Let's find the best plays in backgammon puzzles!", mid: '{n} more to move.' },
    zh: { hi: '汪！我是骰子汪。来找出双陆棋谜题的最佳走法吧！', mid: '还要走{n}步。' },
    'zh-TW': { hi: '汪！我是骰子汪。來找出雙陸棋謎題的最佳走法吧！', mid: '還要走{n}步。' },
    ko: { hi: '멍! 다이슨이야. 백개먼 퍼즐에서 최선의 수를 찾아보자!', mid: '{n}번 더 움직이자.' },
    es: { hi: '¡Guau! Soy Dicepup. ¡Busquemos la mejor jugada en problemas de backgammon!', mid: 'Movimientos restantes: {n}.' },
    fr: { hi: 'Ouaf ! C’est Dicepup. Trouvons les meilleurs coups dans des problèmes de backgammon !', mid: 'Déplacements restants : {n}.' },
    pt: { hi: 'Au! Aqui é o Dicepup. Vamos achar as melhores jogadas em problemas de gamão!', mid: 'Movimentos restantes: {n}.' },
    de: { hi: 'Wuff! Hier ist Dicepup. Finden wir die besten Züge in Backgammon-Aufgaben!', mid: 'Verbleibende Schritte: {n}.' },
    ru: { hi: 'Гав! Это Дайспап. Найдём лучшие ходы в задачах по нардам!', mid: 'Осталось ходов: {n}.' },
    tr: { hi: 'Hav! Ben Dicepup. Tavla bulmacalarında en iyi hamleyi bulalım!', mid: '{n} hamle daha.' },
    id: { hi: 'Guk! Aku Dicepup. Ayo cari langkah terbaik di teka-teki backgammon!', mid: 'Tinggal {n} langkah.' },
    hi: { hi: 'भौं! मैं डाइसपप हूँ। बैकगैमन पहेलियों में सबसे अच्छी चाल ढूँढें!', mid: 'बची चालें: {n}।' },
    ar: { hi: 'هاو! أنا دايس باب. لنجد أفضل النقلات في ألغاز الطاولة!', mid: 'بقي {n}.' },
  };
  const GOX = {
    ja: { hi: 'ゴイシペンだよ。詰碁で読みをきたえよう！', out: '{n}手以内には達成できなかった…', mid: 'その調子！ あと{n}手。' },
    en: { hi: "Stoneguin here! Let's train your reading with tsumego.", out: "Couldn't do it — move limit: {n}…", mid: 'Good! Moves left: {n}.' },
    zh: { hi: '我是棋石企鹅！用死活题锻炼计算力吧！', out: '没能在{n}手内达成…', mid: '不错！还剩{n}手。' },
    'zh-TW': { hi: '我是棋子企鵝！用死活題鍛鍊計算力吧！', out: '沒能在{n}手內達成…', mid: '不錯！還剩{n}手。' },
    ko: { hi: '바둑돌펭이야! 사활 문제로 수읽기를 단련하자!', out: '{n}수 안에 해내지 못했어…', mid: '좋아! {n}수 남았어.' },
    es: { hi: '¡Soy Pingüipiedra! Entrena tu lectura con tsumego.', out: 'No se logró — límite de jugadas: {n}…', mid: '¡Bien! Jugadas restantes: {n}.' },
    fr: { hi: 'C’est Pingopierre ! Entraîne ta lecture avec des tsumego.', out: 'Pas réussi — limite de coups : {n}…', mid: 'Bien ! Coups restants : {n}.' },
    pt: { hi: 'Aqui é o Pinguipedra! Treine a leitura com tsumego.', out: 'Não deu — limite de lances: {n}…', mid: 'Boa! Lances restantes: {n}.' },
    de: { hi: 'Hier ist Steinguin! Trainiere dein Lesen mit Tsumego.', out: 'Nicht geschafft – Zuglimit: {n}…', mid: 'Gut! Verbleibende Züge: {n}.' },
    ru: { hi: 'Это Стоунгвин! Тренируем чтение на цумэго.', out: 'Не получилось — лимит ходов: {n}…', mid: 'Отлично! Осталось ходов: {n}.' },
    tr: { hi: 'Ben Stoneguin! Tsumego ile okuma gücünü geliştirelim.', out: '{n} hamlede başarılamadı…', mid: 'Güzel! {n} hamle kaldı.' },
    id: { hi: 'Aku Stoneguin! Ayo latih membaca dengan tsumego.', out: 'Tidak berhasil dalam {n} langkah…', mid: 'Bagus! Sisa {n} langkah.' },
    hi: { hi: 'मैं स्टोनगुइन हूँ! त्सुमेगो से पढ़ने की क्षमता बढ़ाएँ।', out: 'नहीं हो सका — चालों की सीमा: {n}…', mid: 'बढ़िया! बची चालें: {n}।' },
    ar: { hi: 'أنا بطريق الحجر! لنقوِّ القراءة بمسائل التسوميغو.', out: 'لم يتحقق — حدّ النقلات: {n}…', mid: 'رائع! بقي {n}.' },
  };
  // the guide's lines for 詰め連珠 (the rest are the game's own texts)
  const GMX = {
    ja: { hi: 'ゴイシペンだよ。詰め連珠で読みをきたえよう！', out: '{n}手以内に勝ちを決められなかった…', chk: '読んでいるよ…', mid: 'いい調子！ あと{n}手。', ans: '正解の手順を見せるね。', done: 'これが正解の手順だよ。「もう一度」で自分でも打ってみよう！' },
    en: { hi: "Stoneguin here! Let's train your reading with renju puzzles.", out: "Couldn't settle it — move limit: {n}…", chk: 'Reading…', mid: 'Nice! Moves left: {n}.', ans: "Here's the solution.", done: 'That was the solution. Tap "Retry" and play it yourself!' },
    zh: { hi: '我是棋石企鹅！用连珠诘题锻炼计算力吧！', out: '没能在{n}手内决出胜负…', chk: '正在计算…', mid: '不错！还剩{n}手。', ans: '给你看正解的手顺。', done: '这就是正解。点「再来一次」自己下一遍吧！' },
    'zh-TW': { hi: '我是棋子企鵝！用連珠詰題鍛鍊計算力吧！', out: '沒能在{n}手內決出勝負…', chk: '正在計算…', mid: '不錯！還剩{n}手。', ans: '給你看正解的手順。', done: '這就是正解。點「再來一次」自己下一遍吧！' },
    ko: { hi: '바둑돌펭이야! 연주 묘수풀이로 수읽기를 단련하자!', out: '{n}수 안에 승부를 내지 못했어…', chk: '수읽기 중…', mid: '좋아! {n}수 남았어.', ans: '정답 수순을 보여 줄게.', done: '이게 정답 수순이야. "다시"로 직접 두어 보자!' },
    es: { hi: '¡Soy Pingüipiedra! Entrena tu cálculo con problemas de renju.', out: 'No se decidió — límite de jugadas: {n}…', chk: 'Calculando…', mid: '¡Bien! Jugadas restantes: {n}.', ans: 'Te enseño la solución.', done: 'Esa era la solución. ¡Pulsa «Reintentar» y juégala tú!' },
    fr: { hi: 'C’est Pingopierre ! Entraîne ton calcul avec des problèmes de renju.', out: 'Pas de victoire — limite de coups : {n}…', chk: 'Je calcule…', mid: 'Bien ! Coups restants : {n}.', ans: 'Voici la solution.', done: 'C’était la solution. Touche « Réessayer » et joue-la toi-même !' },
    pt: { hi: 'Aqui é o Pinguipedra! Treine o cálculo com problemas de renju.', out: 'Não deu para vencer — limite de lances: {n}…', chk: 'Calculando…', mid: 'Boa! Lances restantes: {n}.', ans: 'Vou mostrar a solução.', done: 'Essa era a solução. Toque em "Repetir" e jogue você!' },
    de: { hi: 'Hier ist Steinguin! Trainiere dein Rechnen mit Renju-Aufgaben.', out: 'Nicht entschieden – Zuglimit: {n}…', chk: 'Ich rechne…', mid: 'Gut! Verbleibende Züge: {n}.', ans: 'Ich zeige dir die Lösung.', done: 'Das war die Lösung. Tippe auf „Nochmal“ und spiel sie selbst!' },
    ru: { hi: 'Это Стоунгвин! Тренируем расчёт на задачах рэндзю.', out: 'Выиграть не удалось — лимит ходов: {n}…', chk: 'Считаю…', mid: 'Отлично! Осталось ходов: {n}.', ans: 'Покажу решение.', done: 'Это было решение. Нажмите «Ещё раз» и сыграйте сами!' },
    tr: { hi: 'Ben Stoneguin! Renju bulmacalarıyla hesap gücünü geliştirelim.', out: '{n} hamlede kazanılamadı…', chk: 'Hesaplıyorum…', mid: 'Güzel! {n} hamle kaldı.', ans: 'Çözümü göstereyim.', done: 'Çözüm buydu. "Tekrar" ile kendin oyna!' },
    id: { hi: 'Aku Stoneguin! Ayo latih perhitungan dengan soal renju.', out: 'Tidak bisa menang dalam {n} langkah…', chk: 'Menghitung…', mid: 'Bagus! Sisa {n} langkah.', ans: 'Aku tunjukkan solusinya.', done: 'Itulah solusinya. Ketuk "Ulangi" dan mainkan sendiri!' },
    hi: { hi: 'मैं स्टोनगुइन हूँ! रेंजू पहेलियों से गणना मज़बूत करें।', out: 'जीत तय नहीं हुई — चालों की सीमा: {n}…', chk: 'सोच रहा हूँ…', mid: 'बढ़िया! बची चालें: {n}।', ans: 'हल दिखाता हूँ।', done: 'यही हल था। "फिर से" दबाकर खुद खेलें!' },
    ar: { hi: 'أنا بطريق الحجر! لنقوِّ الحساب بألغاز الرنجو.', out: 'لم يُحسم الفوز — حدّ النقلات: {n}…', chk: 'أحسب…', mid: 'رائع! بقي {n}.', ans: 'سأريك الحل.', done: 'هذا هو الحل. اضغط «مرة أخرى» والعبه بنفسك!' },
  };
  /* ---------- the daily puzzles: the same problem of the day as the full games, and their streak record ---------- */
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DAILY = { dots: { d1: 'dots-daily-v1' }, morris: { d1: 'aicoding-morris-daily' }, mancala: { d1: 'aicoding-mancala-v1-daily' }, tafl: { d1: 'aicoding-tafl-daily' }, connect4: { d1: 'aicoding-connect4-v2-daily' }, amazons: { d1: 'aicoding-amazons-daily' }, hex: { d1: 'aicoding-hex-daily' }, backgammon: { d1: 'aicoding-backgammon-v2-daily' }, xiangqi: { d1: 'aicoding-xiangqi-daily' }, janggi: { d1: 'aicoding-janggi-daily' }, foxgeese: { d1: 'aicoding-foxgeese-daily' }, konane: { d1: 'aicoding-konane-daily' }, ugolki: { d1: 'aicoding-ugolki-daily' }, checkers: { d1: 'aicoding-checkers-daily' }, go: { d1: 'aicoding-go-daily' }, reversi: { d1: 'reversi-emerald-daily' }, chess: { d1: 'aicoding-chess-daily' }, shogi: { d1: 'shogi-kaya-daily', d2: 'shogi-kaya-daily-easy' }, peg: { d1: 'aicoding-peg-daily', d2: 'aicoding-peg-daily' } };
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
    if (id === 'xiangqi' || id === 'janggi' || id === 'foxgeese' || id === 'konane' || id === 'ugolki') {   // (xiangqi/app.js · janggi/app.js · foxgeese/app.js · konane/app.js dailyPick: a theme per weekday)
      const D = B.data; if (!D || !D.themes) return null;
      const ids = D.daily || D.themes.map(x => x.id), L = Math.max(0, D.themes.findIndex(x => x.id === ids[now.getDay() % ids.length]));
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.themes[L].puzzles.length };
    }
    if (id === 'connect4') {   // (connect4/index.html dailyPick: Mon–Tue win in 2, Wed–Thu in 3, Fri–Sun in 4)
      const D = B.data; if (!D || !D.levels) return null;
      const li = D.levels.findIndex(lv => lv.id === (wd >= 1 && wd <= 2 ? 'w2' : wd >= 3 && wd <= 4 ? 'w3' : 'w4')); if (li < 0) return null;
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: li, j: (h >>> 0) % D.levels[li].puzzles.length };
    }
    if (id === 'mancala') {   // (mancala/app.js dailyPick: easier early in the week, harder at the weekend, by the puzzles' difficulty)
      const D = B.data; if (!D || !D.themes) return null;
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h >>>= 0;
      const want = [[4, 5], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5]][wd], pool = [];
      D.themes.forEach((T, L) => T.puzzles.forEach((P, j) => { const k = B.diff(P); if (k >= want[0] && k <= want[1]) pool.push([L, j]); }));
      if (!pool.length) return null; const [L, j] = pool[h % pool.length]; return { date, i: L, j };
    }
    if (id === 'dots') {   // (dots/learn.js dailyPick: a theme by the day; Mon–Tue its easy third, Wed–Thu the middle, Fri–Sun the hard third)
      const D = B.data; if (!D || !D.themes || !D.themes.length) return null;
      const w = (now.getDay() + 6) % 7, part = w <= 1 ? 0 : w <= 3 ? 1 : 2; let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15;
      const L = (day * 7 + (h & 3)) % D.themes.length, m = D.themes[L].puzzles.length, a = Math.floor(m * part / 3), b = Math.floor(m * (part + 1) / 3);
      return { date, i: L, j: a + (h >>> 3) % Math.max(1, b - a) };
    }
    if (id === 'morris') {   // (morris/index.html dailyPick: a theme of Nine Men's Morris per weekday)
      const D = B.data; if (!D || !D.themes) return null;
      const want = ['zwick', 'win2', 'fork', 'mill2', 'win3', 'block', 'quiet'][now.getDay()], L = Math.max(0, D.themes.findIndex(x => x.v === 'nine' && x.id === want));
      let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
      return { date, i: L, j: (h >>> 0) % D.themes[L].puzzles.length };
    }
    if (id === 'checkers' || id === 'hex' || id === 'amazons' || id === 'tafl') {   // (tafl/app.js too; checkers/app.js · hex/app.js · amazons/app.js dailyPick: a course per weekday)
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
    else if (id === 'reversi' || id === 'go' || id === 'xiangqi' || id === 'janggi' || id === 'foxgeese' || id === 'konane' || id === 'ugolki' || id === 'hex' || id === 'amazons' || id === 'tafl' || id === 'mancala' || id === 'morris' || id === 'dots') p = B.problem(d.i, d.j, X, lang);
    else if (id === 'checkers' || id === 'backgammon' || id === 'connect4') p = B.problem(d.i, d.j, X, lang, d.date);   // (the day's slot: an old puzzle for dates up to the cut)
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
    return B.p || (B.p = Promise.all([B.fetch ? B.fetch() : fetch(B.url).then(r => r.json()), id === 'peg' ? fetch('../peg/daily.json?v=2').then(r => r.json()).catch(() => null) : id === 'gomoku' ? fetch('../gomoku/i18n.js?v=20261112c1').then(r => r.text()).catch(() => '') : id === 'go' ? fetch('../go/i18n.js?v=20261113').then(r => r.text()).catch(() => '') : id === 'checkers' ? fetch('../checkers/i18n.js?v=20261107l14-nd1').then(r => r.text()).catch(() => '') : id === 'hex' ? fetch('../hex/i18n.js?v=20261115-p61').then(r => r.text()).catch(() => '') : id === 'connect4' ? Promise.all(['../connect4/i18n.js?v=20261107l14-p61', '../connect4/learn.js?v=20261107l14'].map(f => fetch(f).then(r => r.text()).catch(() => ''))).then(L => L.join('\n')) : id === 'dots' ? Promise.all(['../dots/i18n.js?v=20261116', '../dots/i18n-learn.js?v=20261116'].map(f => fetch(f).then(r => r.text()).catch(() => ''))).then(L => 'with (window) {' + L.join('\n;\n') + '\n}') : id === 'morris' ? Promise.all(['../morris/i18n.js?v=20261116-p61', '../morris/i18n_more.js?v=20261116'].map(f => fetch(f).then(r => r.text()).catch(() => ''))).then(L => L.join('\n')) : id === 'tafl' ? fetch('../tafl/i18n.js?v=6ek-nd1-bm2').then(r => r.text()).catch(() => '') : id === 'mancala' ? Promise.all(['../mancala/i18n.js?v=20261107l15', '../mancala/i18n-pz.js?v=20261107l14'].map(u => fetch(u).then(r => r.text()).catch(() => ''))).then(a => a.join('\n;\n')) : id === 'amazons' ? Promise.all(['../checkers/i18n.js?v=20261107l14-nd1', 'i18n-am.js?v=4', 'i18n-am-more.js?v=4', 'i18n-am-pz.js?v=3'].map(f => fetch(f[0] === '.' ? f : '../amazons/' + f).then(r => r.text()).catch(() => ''))).then(L => L[0] + '\nvar I18N = window.I18N = window.I18N || {};\n' + L.slice(1).join('\n')) : id === 'xiangqi' ? fetch('../xiangqi/i18n.js?v=4lv-l14-pro-nd2-p61').then(r => r.text()).catch(() => '') : id === 'janggi' ? fetch('../janggi/i18n.js?v=3').then(r => r.text()).catch(() => '') : id === 'backgammon' ? Promise.all([AtlasBgTexts(), AtlasBgExplain()]).then(r => r[0]) : null]).then(([d, dl]) => {
      B.data = id === 'shogi' || id === 'peg' || id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'backgammon' || id === 'hex' || id === 'amazons' || id === 'connect4' || id === 'tafl' || id === 'mancala' || id === 'morris' || id === 'dots' ? B.prep(d) : d; if (id === 'peg') B.daily = dl;
      if (id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'hex' || id === 'amazons' || id === 'connect4' || id === 'tafl' || id === 'mancala' || id === 'morris' || id === 'dots') { const w = {}; try { new Function('window', dl)(w); } catch (e) {} B.I = w.I18N || {}; }
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
    const QA = id === 'janggi' ? Object.assign({}, JGX.en, JGX[ctx.lang] || {}) : Object.assign({}, XQX.en, XQX[ctx.lang] || {}), HA = Object.assign({}, HXX.en, HXX[ctx.lang] || {}), AA = Object.assign({}, AMX.en, AMX[ctx.lang] || {}), TA = Object.assign({}, TFX.en, TFX[ctx.lang] || {}), MA = Object.assign({}, MCX.en, MCX[ctx.lang] || {}), MO = Object.assign({}, MMX.en, MMX[ctx.lang] || {}), DT = Object.assign({}, DTX.en, DTX[ctx.lang] || {}), C4 = Object.assign({}, C4X.en, C4X[ctx.lang] || {});
    const QB = Object.assign({}, BGX.en, BGX[ctx.lang] || {});

    /* ---------- the guide's panel (the rules tour's .rgd) ---------- */
    const el = document.createElement('div'); el.className = 'rgd pzg';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GD.guide}" alt=""></div><div class="bub"><div class="nm">${name}<span class="pg"></span></div><div class="tx"></div><div class="rvn" hidden></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm ic" data-a="hint" aria-label="${X.hint}" title="${X.hint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/></svg><small>${X.hint}</small></button><button type="button" class="btn ghost sm ic" data-a="again" aria-label="${X.again}" title="${X.again}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg><small>${X.again}</small></button>${ctx.onList ? `<button type="button" class="btn ghost sm ic" data-a="list" aria-label="${ctx.t ? ctx.t('bv.list') : ''}" title="${ctx.t ? ctx.t('bv.list') : ''}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg><small>${ctx.t ? ctx.t('bv.list') : ''}</small></button>` : ''}${id === 'reversi' || id === 'foxgeese' || id === 'konane' || id === 'ugolki' || id === 'tafl' || id === 'mancala' || id === 'morris' || id === 'dots' || id === 'gomoku' || id === 'go' || id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'backgammon' || id === 'hex' || id === 'amazons' || id === 'connect4' ? `<button type="button" class="btn ghost sm ic" data-a="ans" aria-label="${RVA.lb}" title="${RVA.lb}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg><small>${RVA.lb}</small></button>` : ''}<span class="sp"></span><button type="button" class="btn big" data-a="next">${X.next} ▶</button></div>`;
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
      if (p.kind === 'hx') { const nm = c => B.tx('p' + c, ctx.lang) || (c === 1 ? 'Red' : 'Blue'); return '<b>' + B.tx(p.block ? 'pz.goalBlock' : 'pz.goal', ctx.lang, { c: nm(p.me), o: nm(3 - p.me), n: p.n, k: p.k }) + '</b>'; }
      if (p.kind === 'c4') { const c = c4Name(p.me); return '<b>' + (p.c4 === 'mate' ? B.tx('pz.goal', ctx.lang, { c, n: p.n }) : p.c4 === 's' ? B.tx('pz.goal.def', ctx.lang, { c, n: p.n }) : B.tx(p.P.goal === 'draw' ? 'pz.goal.draw' : 'pz.goal.win', ctx.lang, { c })) + '</b>'; }
      if (p.kind === 'mc') return (p.spec.rules !== 'kalah' ? `<small>${B.tx('rule.' + p.spec.rules, ctx.lang)}</small><br>` : '') + '<b>' + (p.mk === 'turn' ? B.tx('pz.goalTurn', ctx.lang, { n: p.P.goal }) : p.mk === 'pick' ? B.tx('pz.goalPick', ctx.lang) : B.tx('pz.goalEnd', ctx.lang, { a: p.P.goal[0], b: p.P.goal[1] })) + '</b>';
      if (p.kind === 'dt') return `<small>${p.spec.n}×${p.spec.n}</small><br><b>` + B.tx('pz.goal', ctx.lang, { a: p.target[0], b: p.target[1] }) + '</b>';
      if (p.kind === 'mm') return (p.spec.v !== 'nine' ? `<small>${B.tx('title.' + p.spec.v, ctx.lang)}</small><br>` : '') + '<b>' + B.tx(p.goal === 'mill' ? 'pz.goalMill' : 'pz.goal', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n }) + '</b>';
      if (p.kind === 'fg') return fgT(p, p.goal === 'win' ? 'goalWin' : 'goalTake', { n: p.n });
      if (p.kind === 'ug') return ugT(p, 'goal', { n: p.n, c: ugName(p.me) });
      if (p.kind === 'kn') return knT(p, p.th === 'stop' ? 'goalStop' : p.th === 'chain' ? 'goalChain' : p.n === 1 && KNP() && (KNP()[ctx.lang] || {}).goal1 ? 'goal1' : 'goalWin', { n: p.n, c: knName(p.me) });
      if (p.kind === 'tf') return '<b>' + B.tx(p.goal === 'cap' ? 'pz.goalCap' : 'pz.goalEsc', ctx.lang, { c: B.tx(p.me === 1 ? 'p1' : 'p2', ctx.lang), n: p.n }) + '</b>';
      if (p.kind === 'am') return '<b>' + B.tx(p.am === 'duel' ? 'pz.goal' : 'pz.goal.' + p.am, ctx.lang, { c: amName(p.me), n: p.n }) + '</b>';
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
      if (sess && p.kind === 'go' && pz() && pz().n !== (p.spec.n || 9)) { sess.stop(); sess = null; }
      if (sess && p.kind === 'hx' && pz() && pz().n !== (p.spec.n || 9)) { sess.stop(); sess = null; }
      if (sess && p.kind === 'tf' && pz() && pz().n !== Math.round(Math.sqrt(String(p.spec.b).length))) { sess.stop(); sess = null; }   // (tafl: another rule set's board — a new board)   // (hex: another board size — a new board)   // (go: another board size — a new board)
      if (sess && p.kind === 'mm' && pz() && pz().v !== p.spec.v) { sess.stop(); sess = null; }
      if (sess && p.kind === 'dt' && pz() && pz().n !== p.spec.n) { sess.stop(); sess = null; }   // (dots: another board size — a new board)   // (morris: another rule set's board — a new board)
      if (!sess) {
        sess = ad.start({ el: ctx.el, Table3D: ctx.Table3D, lang: ctx.lang, t: ctx.t, mode: 'pz', level: 20, side: 1, bar: false, hud: () => {}, onTurn: () => {}, onEnd: () => {},
          pz: Object.assign({ moves: p.moves, bg: p.bg, step: i => cur ? bgStep(cur, i) : true, fen: p.fen, sfen: p.sfen, sol: p.P.sol, cells: p.cells, toMove: p.toMove, me: p.me, start: p.start, spec: p.spec, view: p.view, marks: p.marks, rule: p.kind === 'gm' ? 'renju' : undefined, last: p.last, judge: p.kind === 'gm' ? (p.vcf ? 'vcf' : 'all') : undefined }, { ready: () => cur && cur.ready && cur.ready(), moved: (u, i) => cur && cur.moved && cur.moved(u, i) }) });
        ctx.Table3D.play(true);   // (after start(): the adapter's show() puts its board on the table in the showcase view)
      } else if (p.kind === 'gm') pz().load(p.start, 'renju', p.me, p.last, { judge: p.vcf ? 'vcf' : 'all' });
      else if (p.kind === 'ck' || p.kind === 'xq' || p.kind === 'hx' || p.kind === 'am' || p.kind === 'tf' || p.kind === 'mc' || p.kind === 'mm' || p.kind === 'dt' || p.kind === 'fg' || p.kind === 'kn' || p.kind === 'ug') pz().load(p.spec, p.me);
      else if (p.kind === 'c4') pz().load(p.moves, p.me);
      else if (p.kind === 'bg') pz().load(p.bg);
      else if (p.kind === 'go') pz().load(p.spec, p.me, { view: p.view, marks: p.marks });
      else pz().load(p.fen || p.sfen || p.cells, p.P.sol, p.toMove, p.me);
      cur.ready = opts.ready; cur.moved = opts.moved;
      say((first ? (line('hi') || X.hi[id] || (id === 'gomoku' ? GA.hi : id === 'go' ? GO.hi : id === 'checkers' ? CA.hi : id === 'xiangqi' || id === 'janggi' ? QA.hi : id === 'foxgeese' ? B.tx('hi', ctx.lang) : id === 'konane' ? knT(p, 'hi') : id === 'ugolki' ? ugT(p, 'hi') : id === 'hex' ? HA.hi : id === 'tafl' ? TA.hi : id === 'morris' ? MO.hi : id === 'dots' ? DT.hi : id === 'mancala' ? MA.hi : id === 'amazons' ? AA.hi : id === 'connect4' ? C4.hi : id === 'backgammon' ? QB.hi : '') || PEG_HI[ctx.lang] || PEG_HI.en) : line('intro') || '') + ' ' + goal(p)); first = false;
    }
    async function onReady(p) {
      if (p !== cur || stopped) return;
      if (p.kind === 'rv') { rvCount(); if (p.auto) return rvAuto(p); p.state = 'play'; p.ex = pz().exact(); pz().wait(); buttons(); return; }
      if (p.kind === 'gm' && p.auto) return gmAuto(p);
      if (p.kind === 'ck') { const q = pz().pos(); p.base = q ? ckLead(q, p.me) : 0; if (p.auto) return ckAuto(p); }
      if (p.kind === 'xq' && p.auto) return xqAuto(p);
      if (p.kind === 'hx' && p.auto) return hxAuto(p);
      if (p.kind === 'tf' && p.auto) return tfAuto(p);
      if (p.kind === 'fg' && p.auto) return fgAuto(p);
      if (p.kind === 'kn' && p.auto) return knAuto(p);
      if (p.kind === 'ug' && p.auto) return ugAuto(p);
      if (p.kind === 'mm' && p.auto) return mmAuto(p);
      if (p.kind === 'dt' && p.auto) return dtAuto(p);
      if (p.kind === 'mc') { p.used = 0; p.slip = null; if (p.auto) return mcAuto(p); }
      if (p.kind === 'am') { amMarks(p); if (p.auto) return amAuto(p); }
      if (p.kind === 'c4') { p.step = 0; p.off = null; if (p.auto) return c4Auto(p); }
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
      if (p.kind === 'hx') return hxMoved(p, u, info);
      if (p.kind === 'tf') return tfMoved(p, u, info);
      if (p.kind === 'fg') return fgMoved(p, u, info);
      if (p.kind === 'kn') return knMoved(p, u, info);
      if (p.kind === 'ug') return ugMoved(p, u, info);
      if (p.kind === 'mm') return mmMoved(p, u, info);
      if (p.kind === 'dt') return dtMoved(p, u, info);
      if (p.kind === 'mc') return mcMoved(p, u, info);
      if (p.kind === 'am') return amMoved(p, u, info);
      if (p.kind === 'c4') return c4Moved(p, u, info);
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
    /* (2026-11-24 担当A, 追42・追20) after a move off the solution the defender's reply is drawn as a red arrow and チェッカニ says what it
       did on the board (jumped and took / crowned / saved the threatened piece / moved — checkers/pzwhy.js) and, from the solver, whether
       the goal is still there in the moves left (checked by tools/lesson-verify-ckstray.js: every wrong move × every reply). */
    let ckJ = 0;
    async function ckStray(p, mid, r) {
      const E = pz().engine(), W = window.CheckersPzWhy, w = W.why(E, mid, r), left = p.n - p.used, own = ctx.lang === 'ja' ? W.OWN.ja : null;
      try { pz().mark([{ path: E.path(mid, r), cls: 'ng' }]); } catch (e) {}
      if (pz().state().over || left <= 0) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(W.say(ctx.lang, w, null, 0, p.g, own, ckJ++) + ' ' + fill(CA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); return; }
      const L = await ckReq(p, left, false); if (p !== cur || stopped) return;
      const reach = (L || []).some(e => e.need > 0 && e.need <= left);
      say(W.say(ctx.lang, w, reach, left, p.g, own, ckJ++)); p.state = 'play'; pz().wait(); buttons();
    }
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
        const mid = pz().pos();
        await pz().play(r); if (p !== cur) return;
        if (window.CheckersPzWhy) return ckStray(p, mid, r);   // (追42・追20: the reply's fact on the board, no praise)
        return ckOut(p);   // (the words of the reply are not loaded: no stray line with CA.mid's praise — 追20)
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
    /* 詰めコネクトフォー (= connect4/index.html puzzleMove / pzStepMove / pzDefend / pzBlunder; puzzles v2): mate — a move off the
       solution is not failed at once, the exact defender answers and the count runs on; an obvious mistake (a four missed, the
       opponent's four allowed, the goal out of reach even with help) is taken back with the right columns shown. b / s — the stored only
       move(s): any other move fails with the solver's verdict. Columns are named by their marks (no coordinates on the 3D board). */
    const c4Name = c => { const n = window.Atlas3D && Atlas3D.connect4 && Atlas3D.connect4.names ? Atlas3D.connect4.names(ctx.lang) : ['Gold', 'Silver']; return n[c - 1]; };
    const SPC = k => ctx.lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の列' : '赤い印の列') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
    const C4C = 7, C4R = 6, gridC4 = mv => { const g = Array.from({ length: C4C }, () => []); for (let i = 0; i < mv.length; i++) g[mv.charCodeAt(i) - 49].push(i & 1 ? 2 : 1); return g; };
    const atC4 = (g, c, r) => (c >= 0 && c < C4C && r >= 0 && r < g[c].length) ? g[c][r] : 0;
    function lineC4(g, c, r, p) { for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let n = 1; for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (atC4(g, x, y) === p) { n++; x += dc * s; y += dr * s; } } if (n >= 4) return true; } return false; }
    function immC4(g, p) { const out = []; for (let c = 0; c < C4C; c++) { if (g[c].length >= C4R) continue; g[c].push(p); if (lineC4(g, c, g[c].length - 1, p)) out.push(c); g[c].pop(); } return out; }
    function helpC4(g, p, d) { if (immC4(g, p).length) return true; if (d <= 1) return false; const q = 3 - p;
      for (let c = 0; c < C4C; c++) { if (g[c].length >= C4R) continue; g[c].push(p); for (let c2 = 0; c2 < C4C; c2++) { if (g[c2].length >= C4R) continue; g[c2].push(q); const ok = !lineC4(g, c2, g[c2].length - 1, q) && helpC4(g, p, d - 1); g[c2].pop(); if (ok) { g[c].pop(); return true; } } g[c].pop(); } return false; }
    function blunderC4(before, c, left, me) {
      if (immC4(gridC4(before), me).length) return true;
      const g = gridC4(before + (c + 1)), op = 3 - me; if (immC4(g, op).length) return true; if (left - 1 < 1) return false;
      for (let r = 0; r < C4C; r++) { if (g[r].length >= C4R) continue; g[r].push(op); const ok = helpC4(g, me, left - 1); g[r].pop(); if (ok) return false; } return true;
    }
    function c4Threats(g, p) { const out = []; for (let c = 0; c < C4C; c++) { const col = g[c]; for (let r = col.length; r < C4R; r++) { const tmp = col.slice(); while (tmp.length < r) tmp.push(-1); tmp[r] = p; g[c] = tmp; if (lineC4(g, c, r, p)) out.push([c, r]); } g[c] = col; } return out; }
    const PREF4 = [3, 2, 4, 1, 5, 0, 6], byPref4 = L => L.slice().sort((a, b) => PREF4.indexOf(a.c) - PREF4.indexOf(b.c));
    function pickAtt4(L, left) { let b = null; for (const e of byPref4(L)) if (e.need && e.need <= left && (!b || e.need < b.need)) b = e; return b && b.c; }
    function pickDef4(L) { if (L.pick !== undefined && L.pick >= 0) return L.pick; let b = null; for (const e of byPref4(L)) { const v = e.need ? e.need : 99; if (!b || v > b.v) b = { c: e.c, v }; } return b && b.c; }
    async function c4Fail(p, o, head) {
      const good = (o.list || []).filter(x => x.need && x.need <= o.left).map(x => x.c);
      p.failed = true; p.state = 'busy'; streak = 0; chime(false); buttons(); await sleep(600); if (p !== cur) return;
      pz().undo(pz().moves().length - o.before.length);
      pz().mark(good.map(c => [c, 'ok']).concat([[o.c, 'ng']])); p.state = 'fail';
      say('<b>' + head + '</b> ' + B.tx('pz.failWhy', ctx.lang, { m: SPC('ng'), b: SPC('ok'), n: p.n }) + ' ' + (line('retry') || X.retry)); buttons();
    }
    async function c4Moved(p, c, info) {
      const before = info.before;
      if (p.c4 !== 'mate') {   // the stored only move(s)
        const steps = p.P.k === 's' ? p.P.steps : [{ sc: p.P.sc, a: p.P.answer }], st = steps[p.step];
        if (c !== st.a) {
          p.failed = true; streak = 0; chime(false); await sleep(600); if (p !== cur) return;
          const v = st.sc[c], k = v < 0 ? 22 + v - ((before.length + 1) >> 1) : 0;
          pz().undo(1); pz().mark([[st.a, 'ok'], [c, 'ng']]); p.state = 'fail';
          say('<b>' + B.tx('pz.fail', ctx.lang) + '</b> ' + (v < 0 ? B.tx('pz.wrong.loss', ctx.lang, { m: SPC('ng'), k: Math.max(1, k) }) : B.tx('pz.wrong.draw', ctx.lang, { m: SPC('ng') })) + ' ' + B.tx('pz.right', ctx.lang, { b: SPC('ok') }) + ' ' + (line('retry') || X.retry)); buttons(); return;
        }
        p.used++; p.step++;
        if (p.step >= steps.length || info.winner === p.me) return solved(p);
        say(B.tx('pz.good.def', ctx.lang)); await sleep(650); if (p !== cur) return;
        await pz().play(st.r); if (p !== cur) return;
        say(B.tx('pz.yourMove.def', ctx.lang, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      const left = p.n - p.used; p.used++;
      if (info.winner === p.me) return solved(p);
      say(B.tx('pz.checking', ctx.lang));
      const list = await pz().mate(before, left); if (p !== cur || stopped) return;
      const e = (list || []).find(x => x.c === c), onTrack = e && e.need && e.need <= left;
      if (!onTrack) {
        if (blunderC4(before, c, left, p.me)) return c4Fail(p, p.off || { before, c, list, left }, C4.bl);
        if (!p.off) p.off = { before, c, list, left };
      }
      if (p.used >= p.n) return c4Fail(p, p.off || { before, c, list, left }, fill(C4.out, { n: p.n }));
      say(onTrack ? B.tx('pz.good', ctx.lang) : B.tx('pz.checking', ctx.lang));
      const dl = await pz().mate(pz().moves(), Math.max(1, p.n - p.used), true); if (p !== cur || stopped || !dl) return;
      await sleep(250); if (p !== cur) return;
      const own = immC4(pz().grid(), 3 - p.me); await pz().play(own.length ? own[0] : pickDef4(dl)); if (p !== cur) return;
      const st = pz().state();
      if (st.winner) return c4Fail(p, p.off, C4.bl);
      if (st.over) return c4Fail(p, p.off, fill(C4.out, { n: p.n }));
      say(p.off ? fill(C4.mid, { n: p.n - p.used }) : B.tx('pz.yourMove', ctx.lang, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    async function c4Auto(p) {   // 答え: the solution played out (connect4 pzAnswer)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      if (p.c4 !== 'mate') {
        for (const st of (p.P.k === 's' ? p.P.steps : [{ a: p.P.answer }])) { await sleep(600); if (p !== cur) return; pz().mark([[st.a, 'ok']]); await sleep(450); if (p !== cur) return; await pz().play(st.a); if (p !== cur) return; p.used++; if (st.r === undefined || st.r === null) break; await sleep(600); if (p !== cur) return; await pz().play(st.r); if (p !== cur) return; }
      } else for (let step = 0; step < 16; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) break;
        const att = st.turn === p.me, left = p.n - p.used;
        let c; if (att && step === 0) c = p.P.answer; else { const L = await pz().mate(pz().moves(), Math.max(1, left), !att); if (p !== cur || !L) return; c = att ? pickAtt4(L, left) : pickDef4(L); }
        if (c == null) break;
        await sleep(450); if (p !== cur) return; if (att) pz().mark([[c, 'ok']]); await sleep(400); if (p !== cur) return;
        if (!(await pz().play(c))) break; if (p !== cur) return; if (att) p.used++;
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    /* アマゾンズ・パズル (= amazons/app.js puzzleMove / pzOpponent / pzAnswer; the common rule of 2026-11-11): a move off the solution is not
       called out — the game goes on, the opponent answers with its most stubborn reply, and the result shows only when the goal is
       reached or can no longer be (the moves used up, the guarded amazon boxed in, the game over). Squares are named by their marks. */
    const amName = c => { const n = window.Atlas3D && Atlas3D.amazons && Atlas3D.amazons.names ? Atlas3D.amazons.names(ctx.lang) : ['White', 'Black']; return n[c - 1]; };
    function amTarget(p) {   // the lit amazon (trap: the opponent's · guard: your own), followed through the moves
      if (p.e === undefined || !pz()) return -1; const E = pz().engine(), q = pz().pos(); if (!E || !q) return -1;
      if (p.tk === undefined) p.tk = E.trapIdx(p.spec, p.e); return p.tk < 0 ? -1 : q.q[p.tk];
    }
    const amMarks = p => { const t = amTarget(p); pz().mark(t >= 0 ? [[t, p.am === 'guard' ? 'ok' : 'ng']] : null); };
    const amWon = (p, st) => st.over && st.winner === p.me;
    function amDone(p) { if (p.am === 'guard') return !p.miss && p.used >= p.n; if (p.am !== 'trap') return false; const E = pz().engine(), q = pz().pos(); if (p.tk === undefined) p.tk = E.trapIdx(p.spec, p.e); return p.tk >= 0 && E.boxed(q, p.tk); }
    function amLost(p, st) {
      if (st.over && st.winner !== p.me) return true;
      if (p.am === 'guard') { const E = pz().engine(), q = pz().pos(); if (p.tk === undefined) p.tk = E.trapIdx(p.spec, p.e); if (p.tk >= 0 && E.boxed(q, p.tk)) return true; if (p.used >= p.n + 2) return true; }
      return false;
    }
    function amFail(p) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); amMarks(p); say('<b>' + (B.tx('pz.failed', ctx.lang) || '×') + '</b> ' + B.tx('pz.out.' + p.am, ctx.lang, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); }
    function amSolved(p) { amMarks(p); solved(p); const sub = p.am === 'trap' ? 'pz.solvedTrap' : p.am === 'guard' ? 'pz.solvedGuard' : p.am === 'end' ? 'pz.solvedEnd' : p.am === 'read' ? 'pz.solvedRead' : 'pz.solvedSub'; const t = B.tx(sub, ctx.lang, { n: p.used }); if (t) later(() => { if (p === cur) say($('.tx').textContent + ' ' + t); }, 1600); }
    async function amOpponent(p) {   // the opponent's most stubborn reply; true when the puzzle is solved by then
      const st = pz().state(); if (amWon(p, st)) return true; if (st.over) return false;
      const ml = p.P.r, mv = pz().moves(), onLine = p.am === 'guard' && ml && mv.length === 1 && mv[0] === ml[0];   // (guard: the stored main line's reply)
      const r = onLine ? ml[1] : await pz().reply(p.am, p.n - p.used, p.e); if (p !== cur || stopped) return false;
      if (r == null) return false;
      await sleep(380); if (p !== cur) return false;
      await pz().play(r); if (p !== cur) return false;
      return amWon(p, pz().state()) || amDone(p);
    }
    async function amMoved(p, m, info) {
      const pre = pz().moves().slice(0, -1);
      const good = await pz().good(p.am, p.n - p.used, p.e, pre); if (p !== cur || stopped) return;
      if (good && !good.includes(m)) { p.miss = true; p.failed = true; }
      p.used++; amMarks(p);
      const st = pz().state();
      if (amWon(p, st) || amDone(p)) return amSolved(p);
      if (p.am === 'end') return p.miss ? amFail(p) : amSolved(p);
      if ((p.am === 'duel' || p.am === 'trap') && p.used >= p.n) return amFail(p);
      if (await amOpponent(p)) { if (p === cur) amSolved(p); return; }
      if (p !== cur || stopped) return;
      amMarks(p);
      if (amLost(p, pz().state())) return amFail(p);
      const left = Math.max(1, p.n - p.used);
      say(p.am === 'guard' ? fill(AA.guard, { n: left }) : line('mid') || fill(AA.reply, { n: left })); p.state = 'play'; pz().wait(); buttons();
    }
    async function amAuto(p) {   // 答え: the solution for both sides (amazons/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang) || '…');
      for (let step = 0; step < 8; step++) {
        if (p !== cur || stopped) return;
        const good = await pz().good(p.am, p.n - p.used, p.e); if (p !== cur || stopped) return; if (!good || !good.length) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m: good[0], cls: 'ok' }]); await sleep(550); if (p !== cur) return;
        if (!(await pz().play(good[0]))) break; if (p !== cur) return; p.used++; amMarks(p);
        if (p.am === 'end' || amWon(p, pz().state()) || amDone(p) || await amOpponent(p)) break;
        if (p !== cur || pz().state().over) break;
      }
      amMarks(p); p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang) || X.retry); buttons();
    }
    /* 詰めヘックス (= hex/app.js puzzleMove / blockMove, PZBook v2): "connect in N" — a move off the solution is not stopped at once: the
       defender answers with the engine's move and the player goes on until N is used up; connecting within it still counts (★2). An
       obvious mistake (the opponent connects at once, or more stones are needed than moves are left) is taken back with the right cell
       shown. "Stop": one move that leaves the opponent no forced connection within k. Cells are named by their marks (no coordinates). */
    const SPH = k => ctx.lang === 'ja' ? '\u0001' + (k === 'ok' ? '緑の印の点' : '赤い印の点') + '\u0002' : `<i class="ls-spot ${k}"></i>`;
    function hxBlunder(p, before, m, left) {   // (= hex/app.js pzBlunder)
      const after = before.clone(); after.play(m);
      if (after.winner()) return null;
      if (after.winCells(3 - p.me).length) return 'lose';
      if (after.need(p.me) > left - 1) return 'reach';
      return null;
    }
    async function hxDefence(list) {   // the longest resistance; ties broken by the engine's value (hex/app.js pickDefenceBest)
      const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(...list.map(sc)), tied = list.filter(e => sc(e) === top);
      if (tied.length < 2) return tied[0].m;
      const an = await pz().analyze(400), v = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
      return tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a).m;
    }
    const hxOut = p => { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(HA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); };
    async function hxMoved(p, m, info) {
      const before = info.before, pre = pz().moves().slice(0, -1);
      if (p.block) {
        say(B.tx('pz.checking', ctx.lang));
        const list = await pz().puzzle(p.k, true, pre); if (p !== cur || stopped) return;
        p.used = 1;
        const e = (list || []).find(x => x.m === m), good = (list || []).filter(x => x.need === 0);
        if (e && e.need === 0) return solved(p);
        p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return;
        pz().undo(1); p.used = 0; pz().mark([...(good[0] ? [[good[0].m, 'ok']] : []), [m, 'ng']]); p.state = 'fail';
        say(B.tx('pz.fail', ctx.lang) + ' ' + B.tx('pz.failBlock', ctx.lang, { m: SPH('ng'), b: SPH('ok'), k: p.k, o: B.tx('p' + (3 - p.me), ctx.lang) }) + ' ' + (line('retry') || X.retry)); buttons(); return;
      }
      const left = p.n - p.used;
      say(B.tx('pz.checking', ctx.lang));
      const list = await pz().puzzle(left, false, pre); if (p !== cur || stopped) return;
      p.used++;
      if (info.winner === p.me) return solved(p);
      const L = list || [], e = L.find(x => x.m === m), good = L.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [[good[0].m, 'ok']] : []), [m, 'ng']]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx('pz.fail', ctx.lang) + ' ' + B.tx('pz.failWhy', ctx.lang, { m: SPH('ng'), b: SPH('ok'), n: p.n }) : fill(HA.out, { n: p.n }));
        const why = before ? hxBlunder(p, before, m, left) : null;
        if (why) return back(B.tx('pz.bl.' + why, ctx.lang, { n: p.n }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: SPH('ok') }) : ''));
        p.failed = true; p.off = true;   // not the solution: played on, the defender answers with the engine's move
        const r = await pz().think(16); if (p !== cur || stopped) return;
        await sleep(250); if (p !== cur) return;
        if (r == null) return hxOut(p);
        await pz().play(r); if (p !== cur) return;
        if (pz().state().over || p.used >= p.n) return hxOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(HA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await pz().puzzle(p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = await hxDefence(dl); if (p !== cur || stopped) return;
      await pz().play(r); if (p !== cur) return;
      say(line('mid') || fill(HA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    async function hxAuto(p) {   // 答え: the solver's line for both sides (hex/app.js pzAnswer); "stop": the one blocking cell
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      if (p.block) {
        const L = await pz().puzzle(p.k, true); if (p !== cur || stopped) return;
        const g = (L || []).find(x => x.need === 0); if (g) { pz().mark(g.m); await sleep(600); if (p !== cur) return; await pz().play(g.m); }
        p.state = 'answer'; say(B.tx('pz.answerDoneBlock', ctx.lang)); buttons(); return;
      }
      for (let step = 0; step < 24; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) break;
        const att = st.turn === p.me, left = p.n - p.used;
        const list = await pz().puzzle(left, !att); if (p !== cur || stopped) return;
        let m = null;
        if (att) { const g = (list || []).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need)[0]; m = g ? g.m : null; }
        else m = list && list.length ? await hxDefence(list) : null;
        if (p !== cur) return; if (m == null) break;
        await sleep(450); if (p !== cur) return; pz().mark(m); await sleep(450); if (p !== cur) return;
        if (!(await pz().play(m))) break; if (p !== cur) return; if (att) p.used++;
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    /* 詰めタフル (= tafl/app.js puzzleMove / pzBlunder, PZBook v2): "escape the king in N" / "capture the king in N" — a move off the
       solution is played on (the opponent answers with the engine's move) until N is used up; reaching the goal within it still counts
       (★2). An obvious mistake (the opponent wins with its very next move) or the last move missing is taken back with the right move
       shown. Moves are named by their marks (no coordinates on the 3D board). */
    const tfReached = (p, st) => st.over && st.winner === p.me;
    function tfBlunder(p, before, m) { const after = before.clone().play(m); if (after.res) return null; return after.moves().some(x => { const q = after.clone().play(x); return q.res && q.res !== p.me; }) ? 'lose' : null; }
    const tfOut = p => { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(TA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); };
    async function tfMoved(p, m, info) {
      const before = info.before, pre = pz().moves().slice(0, -1), left = p.n - p.used, E = pz().engine();
      say(B.tx('pz.checking', ctx.lang));
      const list = await pz().puzzle(left, false, pre); if (p !== cur || stopped) return;
      p.used++;
      if (tfReached(p, info)) return solved(p);
      const L = list || [], e = L.find(x => x.m === m), good = L.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [{ m: good[0].m, cls: 'ok' }] : []), { m, cls: 'ng' }]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx('pz.fail', ctx.lang) + ' ' + B.tx(p.goal === 'cap' ? 'pz.failCap' : 'pz.failEsc', ctx.lang, { m: SPH('ng'), b: SPH('ok'), n: p.n }) : fill(TA.out, { n: p.n }));
        const why = before && E ? tfBlunder(p, before, m) : null;
        if (why) return back(B.tx('pz.bl.' + why, ctx.lang, { n: p.n }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: SPH('ok') }) : ''));
        p.failed = true; p.off = true;   // not the solution: played on, the opponent answers with the engine's move
        const r = await pz().think(16); if (p !== cur || stopped) return;
        await sleep(250); if (p !== cur) return;
        if (r == null) return tfOut(p);
        await pz().play(r); if (p !== cur) return;
        if (pz().state().over || p.used >= p.n) return tfOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(TA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await pz().puzzle(p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = E.pickDefence(pz().pos(), dl); if (r == null) return solved(p);
      await pz().play(r); if (p !== cur) return;
      if (tfReached(p, pz().state())) return solved(p);
      say(fill(TA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    /* ナイン・メンズ・モリスのパズル (= morris/index.html puzzleMove / pzBlunder, v2): "win in N" / "mill in N" — a move off the solution is
       played on (the defender answers with the engine's best move) until N is used up. Obvious mistakes are taken back with the answer shown:
       the right mill but the wrong piece taken, losing at once, handing over a mill, or the goal out of reach (a small exact search). */
    const mmReq = (p, left, defend, mvs) => pz().puzzle(left, defend, p.goal === 'mill', mvs);
    const mmHit = (p, m, st) => st.winner === p.me || (p.goal === 'mill' && pz().mRm(m) !== pz().NONE);
    function mmCoop(pos, k, goal, bud, Z) {
      for (const d of pos.moves()) {
        if (--bud.n < 0) return null;
        const q = pos.clone(); q.play(d); if (q.status() !== 0) continue;
        for (const a of q.moves()) {
          if (--bud.n < 0) return null;
          if (goal === 'mill' && Z.mRm(a) !== Z.NONE) return true;
          const r = q.clone(); r.play(a);
          if (goal !== 'mill' && r.status() === -1) return true;
          if (k > 1 && r.status() === 0) { const x = mmCoop(r, k - 1, goal, bud, Z); if (x !== false) return x; }
        }
      }
      return false;
    }
    function mmBlunder(p, before, m, list, left) {
      const Z = pz(), good = list.filter(x => x.need && x.need <= left);
      if (Z.mRm(m) !== Z.NONE && good.some(g => Z.mFrom(g.m) === Z.mFrom(m) && Z.mTo(g.m) === Z.mTo(m) && Z.mRm(g.m) !== Z.NONE)) return 'remove';
      const after = before.clone(); after.play(m); if (after.status() !== 0) return null;
      const oppMill = q => q.moves().some(x => Z.mRm(x) !== Z.NONE);
      if (after.moves().some(x => { const q = after.clone(); q.play(x); return q.status() === -1; })) return 'lose';
      if (oppMill(after) && good.some(g => { const q = before.clone(); q.play(g.m); return q.status() === 0 && !oppMill(q); })) return 'mill';
      if (left - 1 >= 1 && left - 1 <= 2 && mmCoop(after, left - 1, p.goal, { n: 300000 }, Z) === false) return 'reach';
      return null;
    }
    async function mmDefence(list) {   // the longest resistance; ties: the engine's best (morris/index.html pickDefenceBest)
      const sc = e => e.need ? e.need : 99, top = Math.max(...list.map(sc)), tied = list.filter(e => sc(e) === top);
      if (tied.length < 2) return tied[0].m;
      const an = await pz().analyze(400), v = m => { const e = an.find(x => x.m === m); return e ? e.v : -1e9; };
      return tied.reduce((a, b) => v(b.m) > v(a.m) ? b : a).m;
    }
    const mmOut = p => { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(fill(MO.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); };
    async function mmMoved(p, m, info) {
      const before = info.before, pre = pz().moves().slice(0, -1), left = p.n - p.used;
      say(B.tx('pz.checking', ctx.lang));
      const list = await mmReq(p, left, false, pre); if (p !== cur || stopped) return;
      p.used++;
      if (mmHit(p, m, info)) return solved(p);
      const L = list || [], e = L.find(x => x.m === m), good = L.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
      const back = async html => { p.failed = true; streak = 0; chime(false); await sleep(500); if (p !== cur) return; pz().undo(1); p.used--; pz().mark([...(good[0] ? [{ m: good[0].m, cls: 'ok' }] : []), { m, cls: 'ng' }]); p.state = 'fail'; say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!e || !(e.need > 0) || e.need > left) {
        if (left <= 1) return back(good.length ? B.tx('pz.fail', ctx.lang) + ' ' + B.tx(p.goal === 'mill' ? 'pz.failMill' : 'pz.failWhy', ctx.lang, { m: SPH('ng'), b: SPH('ok'), n: p.n }) : fill(MO.out, { n: p.n }));
        const why = before ? mmBlunder(p, before, m, L, left) : null;
        if (why) return back(B.tx('pz.bl.' + why, ctx.lang, { n: p.n, m: SPH('ng') }) + (good.length ? ' ' + B.tx('pz.best', ctx.lang, { b: SPH('ok') }) : ''));
        p.failed = true; p.off = true;
        const r = await pz().think(8); if (p !== cur || stopped) return;
        await sleep(250); if (p !== cur) return;
        if (r == null) return mmOut(p);
        await pz().play(r); if (p !== cur) return;
        if (pz().state().over || p.used >= p.n) return mmOut(p);
        say(B.tx('pz.stray', ctx.lang) + ' ' + fill(MO.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await mmReq(p, p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = await mmDefence(dl); if (p !== cur || stopped) return;
      await pz().play(r); if (p !== cur) return;
      say(fill(MO.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    /* ドットの詰め (= dots/learn.js puzzle v2): the game is played to the end against the solver; the final score must reach the target.
       Off the solution line play goes on (★★ at most); an obvious mistake is taken back at once with the best line shown green:
       take — a box was there to take (and taking was best) but the line closes none; give — a box handed over while a safe line was best. */
    function dtPos(n, by) {   // the before-position's facts (dots/engine.js Pos: completes / gives / safe lines)
      const HN = (n + 1) * n, E = HN + n * (n + 1), be = bx => { const r = Math.floor(bx / n), c = bx % n; return [r * n + c, (r + 1) * n + c, HN + r * (n + 1) + c, HN + r * (n + 1) + c + 1]; };
      const eb = e => { const o = []; if (e < HN) { const r = Math.floor(e / n), c = e % n; if (r > 0) o.push((r - 1) * n + c); if (r < n) o.push(r * n + c); } else { const f = e - HN, r = Math.floor(f / (n + 1)), c = f % (n + 1); if (c > 0) o.push(r * n + c - 1); if (c < n) o.push(r * n + c); } return o; };
      const cnt = bx => be(bx).filter(e => by[e] >= 0).length, legal = []; for (let e = 0; e < E; e++) if (by[e] < 0) legal.push(e);
      const completes = e => eb(e).filter(bx => cnt(bx) === 3).length, gives = e => completes(e) ? 0 : eb(e).filter(bx => cnt(bx) === 2).length;
      return { legal, completes, gives, safe: () => legal.filter(e => !completes(e) && !gives(e)) };
    }
    function dtBlunder(q, e, vals, best) {
      if (q.completes(e) > 0) return '';
      const caps = q.legal.filter(f => q.completes(f) > 0);
      if (caps.length) return caps.some(f => vals.get(f) === best) ? 'take' : '';
      if (q.gives(e) > 0 && q.safe().some(f => vals.get(f) === best)) return 'give';
      return '';
    }
    async function dtOpp(p) {   // the solver answers while it is its turn (a box closed: it draws again)
      while (p === cur && !stopped) {
        const st = pz().state(); if (st.over || st.turn !== 1) return true;
        say(DT.opp); const m = await pz().think(8); if (p !== cur || stopped) return false;
        if (m == null) return true; await sleep(260); if (p !== cur) return false;
        if (!(await pz().play(m))) return true;
      }
      return false;
    }
    function dtDone(p) {
      const sc = pz().state().score, fin = B.tx('pz.final', ctx.lang, { a: sc[0], b: sc[1] });
      if (sc[0] >= p.target[0]) { solved(p); return; }
      p.failed = true; p.state = 'fail'; streak = 0; chime(false);
      say(`${B.tx('pz.fail', ctx.lang)} ${fin}` + (p.dev ? ' ' + (line('retry') || X.retry) : '')); buttons();
    }
    async function dtMoved(p, e, info) {
      const n = p.spec.n, before = info.before, q = dtPos(n, before.by);
      let vals = null;
      p.first = pz().moves().length === 1 && !p.dev;   // (the problem's own first line: its stored values)
      if (p.first) vals = new Map(p.values);
      else if (!p.dev || (q.completes(e) === 0 && (q.legal.some(f => q.completes(f) > 0) || (q.gives(e) > 0 && q.safe().length > 0)))) {
        say(B.tx('pz.checking', ctx.lang) || '…'); const L = await pz().solve(8000, before.all); if (p !== cur || stopped) return;
        if (L) vals = new Map(L.map(x => [x.m, x.v]));
      }
      if (vals && vals.has(e)) {
        let best = -Infinity, bestE = -1; for (const [m, v] of vals) if (v > best) { best = v; bestE = m; }
        if (p.first) bestE = p.best;
        if (vals.get(e) < best) {
          const why = dtBlunder(q, e, vals, best);
          if (why) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); await sleep(450); if (p !== cur) return;
            pz().undo(1); pz().mark([[bestE, 'ok'], [e, 'ng']]); say(B.tx('pz.bl.' + why, ctx.lang) + ' ' + (line('retry') || X.retry)); buttons(); return; }
          if (!p.dev) { p.dev = { e, best: bestE }; p.failed = true; }
        }
      }
      p.first = false;
      if (pz().state().over) return dtDone(p);
      say(p.dev ? B.tx('pz.dev', ctx.lang) : B.tx('pz.good', ctx.lang));
      await sleep(350); if (p !== cur) return;
      if (!(await dtOpp(p))) return;
      if (pz().state().over) return dtDone(p);
      say((p.dev ? B.tx('pz.dev', ctx.lang) + ' ' : B.tx('pz.good', ctx.lang) + ' ') + DT.mine); p.state = 'play'; pz().wait(); buttons();
    }
    async function dtAuto(p) {   // 答え: the best line, then the solver for both sides to the end
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      for (let step = 0; step < 80; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) break;
        const m = step === 0 ? p.best : await pz().think(8); if (p !== cur || stopped) return; if (m == null) break;
        if (st.turn === 0) { pz().mark([[m, 'ok']]); await sleep(420); if (p !== cur) return; }
        if (!(await pz().play(m))) break; await sleep(260);
      }
      const sc = pz().state().score; p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang) + '<br>' + B.tx('pz.final', ctx.lang, { a: sc[0], b: sc[1] })); buttons();
    }
    async function mmAuto(p) {   // 答え: the solver's line for both sides
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      for (let step = 0; step < 24; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) break;
        const att = st.turn === p.me, left = p.n - p.used;
        const list = await mmReq(p, left, !att); if (p !== cur || stopped) return;
        let m = null;
        if (att) { const g = (list || []).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need)[0]; m = g ? g.m : null; }
        else m = list && list.length ? await mmDefence(list) : null;
        if (p !== cur) return; if (m == null) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m, cls: att ? 'ok' : 'hl' }]); await sleep(500); if (p !== cur) return;
        if (!(await pz().play(m))) break; if (p !== cur) return;
        if (att) { p.used++; if (p.goal === 'mill' && pz().mRm(m) !== pz().NONE) break; }
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    async function tfAuto(p) {   // 答え: the solver's line for both sides (tafl/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      for (let step = 0; step < 24; step++) {
        if (p !== cur || stopped) return;
        const st = pz().state(); if (st.over) break;
        const att = st.turn === p.me, left = p.n - p.used;
        const list = await pz().puzzle(left, !att); if (p !== cur || stopped) return;
        let m = null;
        if (att) { const g = (list || []).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need)[0]; m = g ? g.m : null; }
        else m = list && list.length ? pz().engine().pickDefence(pz().pos(), list) : null;
        if (p !== cur) return; if (m == null) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m, cls: att ? 'ok' : 'hl' }]); await sleep(500); if (p !== cur) return;
        if (!(await pz().play(m))) break; if (p !== cur) return; if (att) p.used++;
      }
      p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
    }
    /* 狐とガチョウのパズル (2026-11-24 担当C; = foxgeese/app.js puzzleMove): "shut the fox in within N" (the geese) / "take a goose within N"
       (the fox). The goal set is the engine's goalGood (the 2D asks the same). A move off it is played on (the user's rule for every 詰め
       problem: no "mistake" — it only costs the stars); the defender answers with a move that leaves the goal out of reach (a capture /
       the fox shut in first: AtlasFoxgeesePz.pickReply) and ドミダック says what happened on the board (AtlasFoxgeesePz.why, checked by
       tools/lesson-verify-foxgeese.js ⑦⑧), the reply's point in red. The last move missing the goal is taken back: the right move in
       green, the one played in red. */
    const FGP = () => window.AtlasFoxgeesePz;
    // ドミダック's line k: its variants in turn (a counter per line, from 2 × the theme), so the same words do not come back puzzle after
    // puzzle (tools/lesson-quality.js reads them the same way)
    const fgN = {};
    const fgT = (p, k, v) => { const c = fgN[k] = fgN[k] == null ? (p.i | 0) * 2 : fgN[k] + 1, F = FGP(), x = F && F.text(ctx.lang, k, c, v); return x != null ? x : B.tx(k, ctx.lang, v); };
    const fgHit = (p, before, st) => p.goal === 'win' ? st.over && st.winner === 2 && st.why === 'trap' : st.cap > (before ? before.cap : 0) || (st.over && st.winner === 1 && st.why === 'few');
    async function fgReply(p, mid, left) {   // the defender's reply after a move off the solution (the same choice as the checker)
      const mv = pz().moves();
      const can = async (r, k) => (await pz().good(k, p.goal, mv.concat([r]))).length > 0;   // (the attacker still reaches the goal within k after the reply r)
      let first = null;
      for (const r of mid.moves()) {
        const z = mid.clone().play(r), hit = p.goal === 'win' ? z.cap > mid.cap : !z.foxMoves([]).length;
        if (hit) return r;
        if (first == null && !(left >= 1 && await can(r, left))) first = r;
        if (p !== cur || stopped) return null;
      }
      return first;
    }
    async function fgMoved(p, m, info) {
      const before = info.before, left = p.n - p.used, F = FGP(), E = pz().engine();
      say(fgT(p, 'pz.checking'));
      const good = await pz().good(left, p.goal, pz().moves().slice(0, -1)); if (p !== cur || stopped) return;
      p.used++;
      if (fgHit(p, before, info)) return solved(p);
      const fail = html => { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(html + ' ' + (line('retry') || X.retry)); buttons(); };
      if (!good.includes(m)) {
        p.failed = true; p.off = true;
        if (left <= 1) {   // the last move: taken back, the right move in green, the fox's escape (red) named
          await sleep(500); if (p !== cur) return; pz().undo(1); p.used--;
          pz().mark([{ m, cls: 'ng' }, ...(good[0] != null ? [{ m: good[0], cls: 'ok' }] : [])]);   // (back on the position before it: the one played red, the right move green — drawn last, on top when both end on the same point)
          return fail(fgT(p, p.goal === 'win' ? 'lastWin' : 'lastTake'));
        }
        const mid = pz().pos(), r = await fgReply(p, mid, left - 1); if (p !== cur || stopped) return;
        if (r == null) return fail(fgT(p, 'out', { n: p.n }));
        await sleep(300); if (p !== cur) return;
        await pz().play(r); if (p !== cur) return;
        const z = pz().pos(), w = F.why({ goal: p.goal, before, mid, after: z, m, reply: r, left: left - 1, E });
        pz().mark([[E.mTo(r), 'ng']]);
        const st = pz().state();
        const wt = fgT(p, w.key, { n: left - 1, k: z.cap - mid.cap });
        if (st.over || w.k === 'trap' || p.used >= p.n) return fail(wt);
        say(wt + ' ' + fgT(p, 'mid', { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons(); return;
      }
      say(fgT(p, 'good'));
      await sleep(250); if (p !== cur) return;
      const mid = pz().pos(), r = await fgDefend(p, mid, p.n - p.used); if (p !== cur || stopped) return;
      if (r == null) return solved(p);
      await pz().play(r); if (p !== cur) return;
      const st = pz().state();
      if (st.over && st.winner === p.me) return solved(p);
      say(fgT(p, p.goal === 'win' ? 'midWin' : 'midTake', { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    // after a right move: the defender's most stubborn reply — the one after which the attacker needs the most moves (ties: the first)
    async function fgDefend(p, mid, left) {
      const mv = pz().moves(); let best = null, bk = -1;
      for (const r of mid.moves()) {
        let need = left + 1;
        for (let k = 1; k <= left; k++) { const g = await pz().good(k, p.goal, mv.concat([r])); if (p !== cur || stopped) return null; if (g.length) { need = k; break; } }
        if (need > bk) { bk = need; best = r; }
      }
      return best;
    }
    /* コナネのパズル (2026-11-24 担当C; = konane/app.js puzzleMove): "win in N" — after one of your moves the opponent has no jump. The
       winning moves are the engine's duelGood (the 2D asks the same). The common rule of every 詰め problem: nothing is judged on the
       way — after a winning move the defender answers with its most stubborn reply (duelReply, as the 2D) and the player goes on; the
       result shows when the opponent is left without a jump, or once the win can no longer be reached: after a move off the solution
       the defender's reply (the same duelReply) is played, marked red, and チェッカニ says what it did on the board (AtlasKonanePz.why:
       the player left without a jump / the jumps the opponent still has, the stones it took — tools/lesson-verify-konane.js ⑦⑧);
       a last move that misses: the opponent's stones that can still jump in red. The right move is never shown by itself (「答え」). */
    const KNP = () => window.AtlasKonanePz;
    const knN = {};
    // チェッカニ's line k: its variants in turn (a counter per line, from 2 × the theme), so the same words do not come back puzzle after
    // puzzle (tools/lesson-quality.js reads them the same way)
    const knT = (p, k, v) => { const t = (p && p.i) | 0, o = knN[k] = knN[k] || { b: t * 2, s: 1 + Math.floor(t / 5), n: -1 }; o.n++; const F = KNP(), x = F && F.text(ctx.lang, k, o.b + o.n * o.s, v); return x != null ? x : B.tx(k, ctx.lang, v); };   // (the 6th theme on steps by 2: no two themes say the variants in the same order)
    const knName = c => { const n = B.tx(c === 2 ? 'p2' : 'p1', ctx.lang); return n || (c === 2 ? '○' : '●'); };
    const knWon = p => { const q = pz().pos(); return !!q && q.turn !== p.me && !q.moves().length; };
    function knFail(p, html) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(html + ' ' + knT(p, 'ans')); buttons(); }
    function knMovers(q, c) { const E = pz().engine(), L = []; for (const m of q.moves()) if (q.turn === c) L.push(E.mFrom(m)); return [...new Set(L)]; }
    async function knMoved(p, m, info) {
      const left = p.n - p.used, E = pz().engine(), F = KNP();
      const good = await pz().good(left, pz().moves().slice(0, -1)); if (p !== cur || stopped) return;
      p.used++;
      if (knWon(p)) return solved(p);
      const mid = pz().pos();
      if (!good.includes(m)) {
        p.failed = true; p.off = true;
        if (left <= 1) {   // the last move: the opponent's stones that can still jump, red
          const w = F.why({ last: true, mid, me: p.me, E });
          pz().mark(knMovers(mid, 3 - p.me).map(q => [q, 'ng']));
          return knFail(p, knT(p, 'last', w.v));
        }
        await sleep(300); if (p !== cur) return;
        const r = await pz().reply(left - 1); if (p !== cur || stopped) return;
        if (r == null) return knFail(p, knT(p, 'last', { j: mid.mobility(3 - p.me) }));
        await pz().play(r); if (p !== cur) return;
        const z = pz().pos(), w = F.why({ mid, after: z, reply: r, left: left - 1, me: p.me, E });
        pz().mark([[E.mTo(r), 'ng']]);
        return knFail(p, knT(p, w.key, Object.assign({ c: knName(p.me) }, w.v)));
      }
      await sleep(250); if (p !== cur) return;
      const r = await pz().reply(p.n - p.used); if (p !== cur || stopped) return;
      if (r == null) return solved(p);
      await pz().play(r); if (p !== cur) return;
      pz().mark([[E.mTo(r), 'hl']]);
      say(knT(p, 'mid', { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    /* ウゴルキのパズル (2026-11-24 担当D; = ugolki/app.js puzzleMove): "win within N" — the race of the corners. The winning moves are the
       engine's duelGood (the 2D asks the same, in the engine worker). The common rule of every 詰め problem: nothing is judged on the
       way — after a winning move the defender answers with its most stubborn reply (duelReply, as the 2D) and the player goes on; the
       result shows when the game is won, or once the win can no longer be reached: after a move off the solution the defender's reply
       (the same duelReply) is played, marked red, and モリフク says what is on the board (AtlasUgolkiPz.why: far / block / slow / catch /
       over — tools/lesson-verify-ugolki.js ⑦⑧); a last move that misses: the pieces still outside (red), or the opponent's own last
       move into its corner (a draw). The right move is never shown by itself (「答え」). */
    const UGP = () => window.AtlasUgolkiPz;
    const ugN = {};
    // モリフク's line k: its variants in turn (a counter per line, from the theme), so the same words do not come back puzzle after puzzle
    const ugT = (p, k, v) => { const t = (p && p.i) | 0, o = ugN[k] = ugN[k] || { b: t * 2, s: 1 + Math.floor(t / 5), n: -1 }; o.n++; const F = UGP(), x = F && F.text(ctx.lang, k, o.b + o.n * o.s, v); return x != null ? x : B.tx(k, ctx.lang, v); };
    const ugName = c => { const n = B.tx(c === 2 ? 'p2' : 'p1', ctx.lang); return n || (c === 2 ? '●' : '○'); };
    const ugWon = p => { const s = pz().state(); return !!s.over && s.winner === p.me; };
    function ugFail(p, html) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(html + ' ' + ugT(p, 'ans')); buttons(); }
    async function ugMoved(p, m, info) {
      const left = p.n - p.used, E = pz().engine(), F = UGP();
      const good = await pz().good(left, pz().moves().slice(0, -1)); if (p !== cur || stopped) return;
      p.used++;
      if (ugWon(p)) return solved(p);
      const mid = pz().pos(), me = p.me;
      if (!good.includes(m)) {
        p.failed = true; p.off = true;
        if (left <= 1) {   // the last move: the pieces still outside (red), or the opponent's last move into its corner (a draw)
          const w = F.why({ last: true, mid, me, E });
          if (w.k === 'lastDraw') { await sleep(300); if (p !== cur) return; const r = await pz().reply(0); if (p !== cur || stopped) return; if (r != null) { await pz().play(r); if (p !== cur) return; pz().mark([[E.mTo(r), 'ng']]); } }
          else { const T0 = E.target(me), L = []; for (let i = 0; i < 64; i++) if (mid.owner(i) === me && !T0[i]) L.push([i, 'ng']); pz().mark(L); }
          return ugFail(p, ugT(p, w.k, Object.assign({ c: ugName(me) }, w.v)));
        }
        await sleep(300); if (p !== cur) return;
        const r = await pz().reply(left - 1); if (p !== cur || stopped) return;
        if (r == null) { const w = F.why({ last: true, mid, me, E }); return ugFail(p, ugT(p, w.k, w.v)); }
        await pz().play(r); if (p !== cur) return;
        const z = pz().pos(), w = F.why({ mid, after: z, reply: r, left: left - 1, me, E });
        pz().mark([[E.mTo(r), 'ng']]);
        const v = Object.assign({ c: ugName(me) }, w.v); if (w.k === 'over') v.w = ugT(p, w.v.w === 'draw' ? 'wDraw' : 'wLose');
        return ugFail(p, ugT(p, w.k, v));
      }
      await sleep(250); if (p !== cur) return;
      const r = await pz().reply(p.n - p.used); if (p !== cur || stopped) return;
      if (r == null) return solved(p);
      await pz().play(r); if (p !== cur) return;
      if (ugWon(p)) return solved(p);
      pz().mark([[E.mTo(r), 'hl']]);
      say(ugT(p, 'mid', { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    async function ugAuto(p) {   // 答え: the solver's line for both sides (ugolki/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(ugT(p, 'pz.showing'));
      for (let step = 0; step < 8; step++) {
        if (p !== cur || stopped) return;
        const good = await pz().good(p.n - p.used); if (p !== cur || stopped) return;
        if (!good.length) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m: good[0], cls: 'ok' }]); await sleep(500); if (p !== cur) return;
        if (!(await pz().play(good[0]))) break; if (p !== cur) return; p.used++;
        if (ugWon(p)) break;
        const r = await pz().reply(p.n - p.used); if (p !== cur || stopped) return; if (r == null) break;
        await sleep(350); if (p !== cur) return;
        if (!(await pz().play(r))) break; if (p !== cur) return; pz().mark([[pz().engine().mTo(r), 'hl']]);
        if (ugWon(p)) break;
      }
      p.state = 'answer'; say(ugT(p, 'pz.answerDone')); buttons();
    }
    async function knAuto(p) {   // 答え: the solver's line for both sides (konane/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(knT(p, 'pz.showing'));
      for (let step = 0; step < 8; step++) {
        if (p !== cur || stopped) return;
        const good = await pz().good(p.n - p.used); if (p !== cur || stopped) return;
        if (!good.length) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m: good[0], cls: 'ok' }]); await sleep(500); if (p !== cur) return;
        if (!(await pz().play(good[0]))) break; if (p !== cur) return; p.used++;
        if (knWon(p)) break;
        const r = await pz().reply(p.n - p.used); if (p !== cur || stopped) return; if (r == null) break;
        await sleep(350); if (p !== cur) return;
        if (!(await pz().play(r))) break; if (p !== cur) return; pz().mark([[pz().engine().mTo(r), 'hl']]);
      }
      p.state = 'answer'; say(knT(p, 'pz.answerDone')); buttons();
    }
    async function fgAuto(p) {   // 答え: the solver's line for both sides (foxgeese/app.js pzAnswer)
      p.state = 'busy'; buttons(); say(fgT(p, 'pz.showing'));
      for (let step = 0; step < 12; step++) {
        if (p !== cur || stopped) return;
        const left = p.n - p.used, good = await pz().good(left, p.goal); if (p !== cur || stopped) return;
        if (!good.length) break;
        await sleep(450); if (p !== cur) return; pz().mark([{ m: good[0], cls: 'ok' }]); await sleep(500); if (p !== cur) return;
        const before = pz().pos(); if (!(await pz().play(good[0]))) break; if (p !== cur) return; p.used++;
        const st = pz().state(); if (fgHit(p, before, st) || st.over) break;
        const r = await fgDefend(p, pz().pos(), p.n - p.used); if (p !== cur || stopped) return; if (r == null) break;
        await sleep(350); if (p !== cur) return; pz().mark([{ m: r, cls: 'hl' }]); await sleep(450); if (p !== cur) return;
        if (!(await pz().play(r))) break; if (p !== cur) return;
      }
      p.state = 'answer'; say(fgT(p, 'pz.answerDone')); buttons();
    }
    /* マンカラのパズル (= mancala/app.js puzzleMove v2): pick — one move, judged by the stored exact values; turn — store `goal`
       seeds within N moves (each extra turn counts), a move after which the goal can no longer be forced (pzReach) fails at once, another
       slip is played on; end — finish with the best result against a perfect defender (the worker's solver), a move that worsens the
       result or loses 6+ seeds fails at once. Pits are named by their rings (gold = the answer, red = your move). */
    const MSP = k => ctx.lang === 'ja' ? (MA[k] || '') : `<i class="ls-spot ${k}"></i>`;
    const mcV = v => { const r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); };
    function mcReach(b, sd, need, r, rules) {   // can the solver (side 0) still gain `need` seeds within r own moves? (true / false / null = too big)
      const E = pz().engine(); let nodes = 0; const memo = new Map(), LIMIT = 250000, STOP = {};
      const rec = (b, sd, need, r) => {
        if (need <= 0) return true; if (sd === 0 && r <= 0) return false; if (++nodes > LIMIT) throw STOP;
        const key = b.join(',') + '|' + sd + '|' + need + '|' + r; if (memo.has(key)) return memo.get(key);
        let res = sd === 1;
        for (let k = 0; k < 6; k++) {
          if (!b[(sd ? 7 : 0) + k]) continue;
          const t = E.trace(b, sd, k, rules), g = t.board[6] - b[6], ok = g >= need ? true : t.over ? false : rec(t.board, t.next, need - g, sd === 0 ? r - 1 : r);
          if (sd === 0 && ok) { res = true; break; } if (sd === 1 && !ok) { res = false; break; }
        }
        memo.set(key, res); return res;
      };
      try { return rec(Int8Array.from(b), sd, need, r); } catch (e) { if (e === STOP) return null; throw e; }
    }
    const mcGain = (p, b) => b[6] - p.P.b[6], mcLeft = p => Math.max(0, p.n - p.used);
    function mcTurnBest(p, b) {
      const E = pz().engine(), R = p.spec.rules, g = E.turnMaxFirst(Int8Array.from(b), 0, R), need = p.P.goal - mcGain(p, b);
      const k = g.findIndex(v => v !== null && v >= need); if (k >= 0) return k;
      for (let j = 0; j < 6; j++) { if (!b[j]) continue; const t1 = E.trace(Int8Array.from(b), 0, j, R), gg = t1.board[6] - b[6]; if (gg >= need || (!t1.over && mcReach(t1.board, t1.next, need - gg, mcLeft(p) - 1, R) !== false)) return j; }
      return g.indexOf(Math.max(...g.filter(x => x !== null)));
    }
    // a move that fails at once: back to the position before it, the answer (gold) and your move (red)
    async function mcFail(p, k, before, best, html) {
      p.failed = true; streak = 0; chime(false); await sleep(450); if (p !== cur) return;
      pz().load(Object.assign({}, p.spec, { b: Array.from(before) }), 1, { lock: true }); await sleep(260); if (p !== cur) return;
      pz().mark([{ at: best, cls: 'ok' }, ...(k !== best ? [{ at: k, cls: 'ng' }] : [])]);
      p.state = 'fail'; say(`${B.tx('pz.fail', ctx.lang)} ${html} ${ctx.lang === 'ja' ? B.tx('pz.bestWas', ctx.lang, { m: '' }).replace(/（穴）|\(穴\)/, '') : B.tx('pz.bestWas', ctx.lang, { m: MSP('ok') })} ` + (line('retry') || X.retry)); buttons();
    }
    function mcOut(p) {
      p.failed = true; p.state = 'fail'; streak = 0; chime(false);
      const q = pz().state(), sl = p.slip;
      const what = p.mk === 'end' ? (q.over ? B.tx('pz.solvedEnd', ctx.lang, { a: q.b[6], b: q.b[13] }) + ' ' : '') : B.tx('pz.solvedTurn', ctx.lang, { n: mcGain(p, q.b) }) + ' ';
      say(`${B.tx('pz.fail', ctx.lang)} ${fill(MA.out || TA.out, { n: p.n })} ${what}` + (sl ? B.tx('pz.slipAt', ctx.lang, { i: sl.i, m: MSP('ng'), b: MSP('ok') }) : '') + ' ' + (line('retry') || X.retry));
      if (sl) pz().mark([{ at: sl.b, cls: 'ok' }]);
      buttons();
    }
    const mcBest = L => L.reduce((a, x) => x.v > a.v ? x : a).m;
    async function mcMoved(p, k, info) {
      const E = pz().engine(), R = p.spec.rules, before = info.before, P = p.P;
      if (p.mk === 'pick') {   // judged by the stored values; back to the problem with every pit's value
        p.used++; const ok = k === P.best;
        await sleep(600); if (p !== cur) return;
        pz().load(p.spec, 1, { lock: true }); await sleep(260); if (p !== cur) return;
        const best = Math.max(...P.sc.filter(v => v !== null));
        pz().mark([{ at: P.best, cls: 'ok' }, ...(ok ? [] : [{ at: k, cls: 'ng' }]), ...P.sc.map((v, j) => v === null ? null : { at: j, label: mcV(v), best: v >= best })].filter(Boolean));
        if (ok) { say(B.tx('pz.solvedPick', ctx.lang, { v: mcV(P.sc[P.best]) })); return solved(p); }
        p.failed = true; p.state = 'fail'; streak = 0; chime(false);
        say(`${B.tx('pz.fail', ctx.lang)} ${B.tx('pz.failPick', ctx.lang, { m: MSP('ng'), a: mcV(P.sc[k]), b: mcV(P.sc[P.best]), x: MSP('ok') })} ` + (line('retry') || X.retry)); buttons(); return;
      }
      if (p.mk === 'turn') {
        const g = E.turnMaxFirst(Int8Array.from(before), 0, R), gain = mcGain(p, before);
        if (p.n <= 1) { if (gain + g[k] < P.goal) return mcFail(p, k, before, g.indexOf(Math.max(...g.filter(x => x !== null))), B.tx('pz.failTurn', ctx.lang, { m: MSP('ng'), n: gain + g[k], g: P.goal })); }
        else {
          const t1 = info.tr, got = gain + t1.board[6] - before[6], rest = p.n - p.used - 1;
          if (got < P.goal && rest > 0) { const can = t1.over ? false : mcReach(t1.board, t1.next, P.goal - got, rest, R); if (can === false) return mcFail(p, k, before, mcTurnBest(p, before), B.tx('pz.failTurn', ctx.lang, { m: MSP('ng'), n: gain + g[k], g: P.goal })); }
          if (gain + g[k] < P.goal && !p.slip) { p.slip = { i: p.used + 1, m: k, b: mcTurnBest(p, before) }; p.off = true; }
        }
        p.used++; return mcTurnFlow(p);
      }
      // end: the defender plays perfectly; each move compared with the exact optimum
      let list = null;
      if (!(p.used === 0 && p.n <= 1)) { say(B.tx('pz.checking', ctx.lang)); list = await pz().solve(before, 0); if (p !== cur || stopped) return; }
      let ok, bestM, mine, best;
      if (!list || !list.length) { ok = k === P.best; bestM = P.best; }
      else { best = Math.max(...list.map(x => x.v)); mine = list.find(x => x.m === k); bestM = mcBest(list); ok = mine && mine.v >= best - 1e-9; }
      if (!ok) {
        const sg = v => v > .5 ? 1 : v < -.5 ? -1 : 0;
        if (p.n <= 1 || !list || !mine || sg(mine.v) < sg(best) || best - mine.v >= 6 - 1e-9) return mcFail(p, k, before, bestM, B.tx('pz.failEnd', ctx.lang, { m: MSP('ng') }));
        if (!p.slip) { p.slip = { i: p.used + 1, m: k, b: bestM }; p.off = true; }
      }
      p.used++; return mcDefend(p);
    }
    async function mcTurnFlow(p) {
      for (let guard = 0; guard < 40; guard++) {
        if (p !== cur || stopped) return;
        const q = pz().state(), gain = mcGain(p, q.b);
        if (gain >= p.P.goal) { say(B.tx('pz.solvedTurn', ctx.lang, { n: gain })); return solved(p); }
        if (q.over || (q.side === 0 && mcLeft(p) <= 0) || (p.n <= 1 && q.side !== 0)) return mcOut(p);
        if (q.side === 0) { say(p.slip ? B.tx('pz.yourMove', ctx.lang) : B.tx('pz.good', ctx.lang) + ' ' + B.tx('pz.again', ctx.lang, { n: p.P.goal - gain }) + (p.n > 1 ? ' ' + fill(MA.mid, { n: mcLeft(p) }) : '')); p.state = 'play'; pz().wait(); buttons(); return; }
        say(B.tx('pz.opp', ctx.lang));
        const E = pz().engine(), R = p.spec.rules; let m = -1;
        for (let j = 0; j < 6 && m < 0; j++) { if (!q.b[7 + j]) continue; const t1 = E.trace(Int8Array.from(q.b), 1, j, R), g1 = t1.board[6] - q.b[6]; if (g1 < p.P.goal - gain && (t1.over || mcReach(t1.board, t1.next, p.P.goal - gain - g1, mcLeft(p), R) === false)) m = j; }
        if (m < 0) { const L = await pz().solve(q.b, 1); if (p !== cur || stopped) return; if (!L || !L.length) return mcOut(p); m = mcBest(L); }
        await sleep(350); if (p !== cur) return;
        await pz().play(m);
      }
    }
    async function mcDefend(p) {
      for (let guard = 0; guard < 60; guard++) {
        if (p !== cur || stopped) return;
        const q = pz().state();
        if (q.over) { if (p.slip) return mcOut(p); say(B.tx('pz.solvedEnd', ctx.lang, { a: q.b[6], b: q.b[13] })); return solved(p); }
        if (q.side === 0) { if (p.slip && mcLeft(p) <= 0) return mcOut(p); say((p.slip ? '' : B.tx('pz.good', ctx.lang) + ' ') + B.tx('pz.yourMove', ctx.lang) + (p.n > 1 ? ' ' + fill(MA.mid, { n: mcLeft(p) }) : '')); p.state = 'play'; pz().wait(); buttons(); return; }
        say(B.tx('pz.opp', ctx.lang));
        const L = await pz().solve(q.b, 1); if (p !== cur || stopped) return; if (!L || !L.length) return mcOut(p);
        await sleep(350); if (p !== cur) return; await pz().play(mcBest(L));
      }
    }
    async function mcAuto(p) {   // 答え: the solution played out (your best moves, the defender's answers)
      p.state = 'busy'; buttons(); say(B.tx('pz.showing', ctx.lang));
      const E = pz().engine(), R = p.spec.rules;
      for (let step = 0; step < 40; step++) {
        if (p !== cur || stopped) return;
        const q = pz().state(); if (q.over) break;
        if (p.mk === 'turn' && mcGain(p, q.b) >= p.P.goal) break;
        let m = -1;
        if (q.side === 0) {
          if (p.mk === 'pick' || (p.mk === 'end' && step === 0)) m = p.P.best;
          else if (p.mk === 'turn') m = p.P.line && p.P.line[step] != null && q.b[p.P.line[step]] ? p.P.line[step] : mcTurnBest(p, q.b);
          else { const L = await pz().solve(q.b, 0); if (p !== cur) return; m = L && L.length ? mcBest(L) : -1; }
        } else { const L = await pz().solve(q.b, 1); if (p !== cur) return; m = L && L.length ? mcBest(L) : -1; }
        if (m < 0) break;
        await sleep(400); if (p !== cur) return; pz().mark([{ at: (q.side ? 7 : 0) + m, cls: q.side ? 'hl' : 'ok' }]); await sleep(450); if (p !== cur) return;
        if (!(await pz().play(m))) break;
        if (p.mk === 'pick') break;
      }
      pz().mark(null); p.state = 'answer'; say(B.tx('pz.answerDone', ctx.lang)); buttons();
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
        const mid = pz().pos();
        await pz().play(r); if (p !== cur) return;
        if (id === 'janggi' && window.JanggiPzWhy) return jgStray(p, mid, r);   // (追42: the reply's fact, not pz.stray)
        if (id === 'xiangqi' && window.XiangqiPzWhy) return jgStray(p, mid, r, window.XiangqiPzWhy);   // (追42・追20: the reply's fact, no praise)
        return xqOut(p);   // (the words of the reply are not loaded: no stray line with QA.mid's praise — 追20)
      }
      say(B.tx('pz.good', ctx.lang));
      const dl = await xqReq(p, p.n - p.used, true); if (p !== cur || stopped) return;
      await sleep(250); if (p !== cur) return;
      if (!dl || !dl.length) return solved(p);
      const r = await ckDefence(dl); if (p !== cur || stopped) return;
      await pz().play(r); if (p !== cur) return;
      say(line('mid') || fill(QA.mid, { n: p.n - p.used })); p.state = 'play'; pz().wait(); buttons();
    }
    /* (2026-11-24 担当D, 追42) janggi: after a move off the solution the defender's reply is marked red and ショウギツネ says what it did on
       the board (took a piece of yours / the general stepped out / a piece blocked the check / moved — janggi/pzwhy.js) and, from the
       solver, whether a mate is still there in the moves left (checked by tools/lesson-verify-janggi.js 追42). */
    let jgN = 0;
    async function jgStray(p, mid, r, W0) {   // (2026-11-24 担当A: xiangqi too, W0 = xiangqi/pzwhy.js with ショウギツネ's own words OWN)
      const E = pz().engine(), W = W0 || window.JanggiPzWhy, w = W.why(E, mid, r), left = p.n - p.used, own = (W0 ? W0.OWN || {} : (window.AtlasJanggiPz || {}).why || {})[ctx.lang];
      pz().mark(w.k === 'pass' ? null : [[{ m: r }, 'ng'], [E.mTo(r), 'ng']]);   // (the reply: a red arrow and its point)
      if (pz().state().over || left <= 0) { p.failed = true; p.state = 'fail'; streak = 0; chime(false); say(W.say(ctx.lang, w, null, 0, own, jgN++) + ' ' + fill(QA.out, { n: p.n }) + ' ' + (line('retry') || X.retry)); buttons(); return; }
      const L = await xqReq(p, left, false); if (p !== cur || stopped) return;
      const reach = (L || []).some(e => e.need > 0 && e.need <= left);
      say(W.say(ctx.lang, w, reach, left, own, jgN++)); p.state = 'play'; pz().wait(); buttons();
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
      if (p.daily) { dailySolved(p, p.hinted || p.failed); if (id === 'checkers' || id === 'xiangqi' || id === 'janggi' || id === 'foxgeese' || id === 'konane' || id === 'ugolki' || id === 'backgammon' || id === 'hex' || id === 'amazons' || id === 'connect4' || id === 'tafl' || id === 'mancala' || id === 'morris' || id === 'dots') B.save(p, n, true); if (id === 'reversi') { const pr = B.pr(); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } if (id === 'chess') { const pr = store.get(B.KEY, {}); pr[p.rk] = Math.max(B.sv(pr[p.rk]), n); store.set(B.KEY, pr); } if (id === 'go') { const pr = store.get(B.KEY, {}), v = pr[p.rk]; pr[p.rk] = Math.max(v === true ? 3 : +v || 0, n); store.set(B.KEY, pr); } }   // (as the full games: chess also keeps the stars, shogi only the streak)
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
      if (p.kind === 'c4') {   // mate: the winning columns (green) · b / s: every empty winning cell of both sides, in their colours (connect4 pzHint)
        if (p.c4 !== 'mate') { const g = pz().grid(), mk = c4Threats(g, p.me).map(([c, r]) => ({ c, r, cls: 'ok' })).concat(c4Threats(g, 3 - p.me).map(([c, r]) => ({ c, r, cls: 'ng' }))); p.hinted = true; pz().mark(mk); say(B.tx('pz.hint.b', ctx.lang) || X.hintSay); return; }
        p.state = 'busy'; buttons(); const left = p.n - p.used, L = await pz().mate(pz().moves(), left); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const good = (L || []).filter(x => x.need && x.need <= left).map(x => x.c); if (!good.length) return;
        p.hinted = true; pz().mark(good.map(c => [c, 'ok'])); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'am') {   // 1) the theme's idea · 2) the amazons that start a solution · 3) the move (amazons/app.js pzHint)
        p.state = 'busy'; buttons(); const L = await pz().good(p.am, p.n - p.used, p.e); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        if (!L || !L.length) return; const E = pz().engine(); p.hinted = true; p.hl = Math.min(3, (p.hl || 0) + 1);
        const tg = amTarget(p), base = tg >= 0 ? [[tg, p.am === 'guard' ? 'ok' : 'ng']] : [];
        if (p.hl === 1) { pz().mark(base); say(B.tx(p.am === 'duel' ? 'pz.hint1' : 'pz.h1.' + p.am, ctx.lang, { n: p.n - p.used })); return; }
        if (p.hl === 2) { pz().mark(base.concat([...new Set(L.map(m => E.mFrom(m)))].map(q => [q, 'ring']))); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return; }
        pz().mark(base.concat([{ m: L[0], cls: 'ok' }])); say(line('hint') || X.hintSay); return;
      }
      if (p.kind === 'mc') {   // a gold ring round a good pit (mancala/app.js: turn → pzTurnBest, else the solver's best / the stored answer)
        const q = pz().state(); let k = -1;
        if (p.mk === 'turn') k = mcTurnBest(p, q.b);
        else if (p.used === 0) k = p.P.best;
        else { p.state = 'busy'; buttons(); const L = await pz().solve(q.b, 0); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons(); if (L && L.length) k = L.reduce((a, x) => x.v > a.v ? x : a).m; }
        if (k < 0) return; p.hinted = true; pz().mark([{ at: k, cls: 'hl' }]); say(B.tx(p.mk === 'turn' ? 'pz.hintTurn' : 'pz.hintEnd', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'dt') { p.hinted = true; const T = B.data.themes[p.i]; say(B.tx('pz.hintText', ctx.lang, { t: B.tx('pc.' + T.id + '.t', ctx.lang) }) + '<br><small>' + B.tx('pc.' + T.id + '.long', ctx.lang) + '</small>'); return; }   // (dots/learn.js: the theme, never the line)
      if (p.kind === 'mm') {   // the piece to use, or the point to place on (morris/index.html pzHint)
        p.state = 'busy'; buttons(); const L = await mmReq(p, p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const Z = pz(), good = (L || []).filter(x => x.need > 0 && x.need <= p.n - p.used); if (!good.length) return;
        p.hinted = true; Z.mark([...new Set(good.map(x => Z.mFrom(x.m) !== Z.NONE ? Z.mFrom(x.m) : Z.mTo(x.m)))].map(q => [q, 'ring'])); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'ug') {   // 1) the idea (ugolki/app.js pz.hint1) · 2) the pieces that start a solution (gold rings) · 3) the move
        p.state = 'busy'; buttons(); const left = p.n - p.used, good = await pz().good(left); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        if (!good.length) return; const E = pz().engine(); p.hinted = true; p.hl = Math.min(3, (p.hl || 0) + 1);
        if (p.hl === 1) { say(ugT(p, 'pz.hint1', { n: left })); return; }
        if (p.hl === 2) { pz().mark([...new Set(good.map(m => E.mFrom(m)))].map(q => [q, 'ring'])); say(ugT(p, 'pz.hintText')); return; }
        pz().mark([{ m: good[0], cls: 'ok' }]); say(line('hint') || X.hintSay); return;
      }
      if (p.kind === 'kn') {   // 1) the idea (konane/app.js pzHint) · 2) the stones that start a solution (gold rings) · 3) the move
        p.state = 'busy'; buttons(); const left = p.n - p.used, good = await pz().good(left); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        if (!good.length) return; const E = pz().engine(); p.hinted = true; p.hl = Math.min(3, (p.hl || 0) + 1);
        if (p.hl === 1) { say(knT(p, 'pz.hint1', { n: left })); return; }
        if (p.hl === 2) { pz().mark([...new Set(good.map(m => E.mFrom(m)))].map(q => [q, 'ring'])); say(knT(p, 'pz.hintText')); return; }
        pz().mark([{ m: good[0], cls: 'ok' }]); say(line('hint') || X.hintSay); return;
      }
      if (p.kind === 'fg') {   // 1) the idea (foxgeese/app.js pz.hint1) · 2) the pieces that start a solution (gold rings) · 3) the move
        p.state = 'busy'; buttons(); const left = p.n - p.used, good = await pz().good(left, p.goal); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        if (!good.length) return; const E = pz().engine(); p.hinted = true; p.hl = Math.min(3, (p.hl || 0) + 1);
        if (p.hl === 1) { say(fgT(p, 'pz.hint1', { n: left })); return; }
        if (p.hl === 2) { pz().mark([...new Set(good.map(m => E.mFrom(m)))].map(q => [q, 'ring'])); say(fgT(p, 'pz.hintText') || X.hintSay); return; }
        pz().mark([{ m: good[0], cls: 'ok' }]); say(line('hint') || X.hintSay); return;
      }
      if (p.kind === 'tf') {   // the pieces that start a solution (gold rings), not the whole move (tafl/app.js pzHint)
        p.state = 'busy'; buttons(); const L = await pz().puzzle(p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const good = (L || []).filter(x => x.need > 0 && x.need <= p.n - p.used); if (!good.length) return; const E = pz().engine();
        p.hinted = true; pz().mark([...new Set(good.map(x => E.mFrom(x.m)))].map(q => [q, 'ring'])); say(B.tx('pz.hintText', ctx.lang) || X.hintSay); return;
      }
      if (p.kind === 'hx') {   // a dashed ring round the area of the answer (hex/app.js pzHint: the cells around it)
        p.state = 'busy'; buttons(); const L = p.block ? await pz().puzzle(p.k, true) : await pz().puzzle(p.n - p.used); if (p !== cur) return; p.state = 'play'; pz().wait(); buttons();
        const good = (L || []).filter(x => p.block ? x.need === 0 : x.need > 0 && x.need <= p.n - p.used); if (!good.length) return;
        p.hinted = true; pz().mark(good.slice(0, 3).map(x => [x.m, 'ring'])); say(B.tx(p.block ? 'pz.hintBlock' : 'pz.hintText', ctx.lang) || X.hintSay); return;
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
    $('[data-a=again]').onclick = () => { if (!cur) return; begin(cur.daily && (cur.kind === 'peg' || cur.kind === 'fg' || cur.kind === 'kn' || cur.kind === 'ug' || cur.kind === 'ck' || cur.kind === 'xq' || cur.kind === 'bg' || cur.kind === 'hx' || cur.kind === 'am' || cur.kind === 'c4' || cur.kind === 'tf' || cur.kind === 'mc' || cur.kind === 'mm' || cur.kind === 'dt') ? dailyProblem(id, cur.daily.which, X, ctx.lang) : B.problem(cur.i, cur.j, X, ctx.lang), false); const a = line('again'); if (a) say(a + ' ' + goal(cur)); };
    $('[data-a=next]').onclick = () => nextPuzzle();
    if ($('[data-a=ans]')) $('[data-a=ans]').onclick = () => { if (!cur || (cur.kind !== 'rv' && cur.kind !== 'gm' && cur.kind !== 'go' && cur.kind !== 'ck' && cur.kind !== 'xq' && cur.kind !== 'bg' && cur.kind !== 'hx' && cur.kind !== 'am' && cur.kind !== 'c4' && cur.kind !== 'tf' && cur.kind !== 'mc' && cur.kind !== 'mm' && cur.kind !== 'dt' && cur.kind !== 'fg' && cur.kind !== 'kn' && cur.kind !== 'ug')) return; const np = cur.daily && (cur.kind === 'fg' || cur.kind === 'kn' || cur.kind === 'ug' || cur.kind === 'ck' || cur.kind === 'xq' || cur.kind === 'bg' || cur.kind === 'hx' || cur.kind === 'am' || cur.kind === 'c4' || cur.kind === 'tf' || cur.kind === 'mc' || cur.kind === 'mm' || cur.kind === 'dt') ? dailyProblem(id, cur.daily.which, X, ctx.lang) : B.problem(cur.i, cur.j, X, ctx.lang); np.auto = true; begin(np, false); cur.failed = true; cur.answered = true; };

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
  window.AtlasPuzzles = { has: id => !!G[id] && !G[id].noPz, start, G, sets: setsOf, cats: catsOf, book, done };   // (G: the guides — atlas/lessons3d.js too)
})();
