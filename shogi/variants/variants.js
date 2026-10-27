'use strict';
// Shogi variants (おまけ): 5五将棋 (minishogi) and はさみ将棋 (hasami shogi) on the same page and board.
// index.html keeps only small hooks (window.Variants.*); the rules live in variants/mini.js and variants/hasami.js,
// the AI (variants/search.js) runs in variants/worker.js. A game record carries game.variant ('mini' | 'hasami');
// 本将棋 records have none, so everything else stays exactly as before.
(() => {
const V = '20261028rb';
const START = { mini: MiniShogi.START, hasami: HasamiShogi.START };
const MODES = ['ai', 'pvp', 'watch'];   // modes a variant can be played in

// ---------------------------------------------------------------- texts (10 languages)
const TX = {
  ja: { label: '種目', hon: '本将棋', mini: '5五将棋', hasami: 'はさみ将棋', rules: 'ルール', noteS: 'おまけの2種目は平手のみ（AIと対局・二人で対局・AI同士）。', note: '5五将棋・はさみ将棋は平手のみで、AIと対局・二人で対局・AI同士で遊べます（レーティング戦・レッスン・詰将棋・局面編集・オンラインは本将棋のみ）。', lvd: 'AIの読み：最大{d}手', toHon: '本将棋のルールへ',
    'res.sennichiteMini': '千日手：5五将棋では先手の負けです', 'res.hasami5': '取った駒が5枚差になりました', 'res.nomove': '動かせる駒がなくなりました', 'res.hmax': '300手に達したため、取った枚数で判定しました',
    miniT: '5五将棋のルール', miniR: ['5×5の盤で、玉・飛・角・金・銀・歩を1枚ずつ図のように並べます。', '駒の動き・持ち駒・王手・詰ませたら勝ちなど、基本は本将棋と同じです。', '敵陣はいちばん奥の1段だけ。そこへの出入りや中での移動で成れます。歩はそこで必ず成ります。', '二歩・打ち歩詰め・奥の段への歩打ちは反則です。', '千日手（同じ局面4回）は先手の負け。連続王手の千日手は王手をかけた側の負けです。'], miniH: '1970年ごろ楠本茂信が考案。盤が狭く、すぐに戦いが始まります。',
    hasamiT: 'はさみ将棋のルール', hasamiR: ['先手は歩9枚、後手はと9枚を手前の段に並べ、先手から1手ずつ交互に動かします。', '駒はすべて飛車の動き（縦横に何マスでも。飛び越えは不可）。', '動かした駒と自分の駒で、相手の駒を縦か横にはさむと取れます（一列まとめても可、ななめは無効）。', '隅の駒は、となりの2マスをふさぐと取れます。', '自分からはさまれる位置に入っても取られません。', '取った数で相手に5枚差をつけるか、相手が動けなくなったら勝ち。', '同じ局面4回は引き分け。300手で決着しなければ取った数の多い方の勝ち（同数は引き分け）。'], hasamiW: '勝ち方は地域でさまざまですが、ここでは長引きにくい「5枚差」を採用しています。' },
  en: { label: 'Game', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Rules', noteS: 'Even games only (vs AI, two players, AI vs AI).', note: 'Minishogi and Hasami shogi are played even (no handicap): vs AI, two players or AI vs AI (rated games, lessons, tsume, editor and online are for standard shogi).', lvd: 'AI looks up to {d} moves ahead', toHon: 'Standard shogi rules',
    'res.sennichiteMini': 'Repetition: in Minishogi the first player (sente) loses', 'res.hasami5': 'One player is 5 captures ahead', 'res.nomove': 'No piece can move', 'res.hmax': 'Move 300 reached: decided by the number of captures',
    miniT: 'Minishogi (5×5) rules', miniR: ['A 5×5 board; each side has a king, rook, bishop, gold, silver and pawn, set up as shown.', 'Moves, drops, check and winning by mate work as in shogi.', 'The zone is only the farthest rank: entering, leaving or moving inside it may promote. A pawn must promote there.', 'Illegal: two pawns on a file, pawn-drop mate, dropping a pawn on the farthest rank.', 'Sennichite (same position 4 times) loses for sente; after perpetual check, the checking side loses.'], miniH: 'Created around 1970 by Shigenobu Kusumoto. The tiny board means the fight starts at once.',
    hasamiT: 'Hasami shogi rules', hasamiR: ['Sente sets 9 pawns (歩), gote 9 tokin (と) on their nearest rank. Sente starts; one piece moves per turn.', 'Every piece moves like a rook: any distance straight, no jumping.', 'Trap enemy pieces in a straight line between the moved piece and another of yours to capture them (not diagonally).', 'A piece in a corner is captured by occupying both squares next to it.', 'Moving into the gap between two enemy pieces is safe.', 'Win with 5 more captures than your opponent, or when they cannot move.', 'Four repetitions: draw. After 300 moves, more captures wins (equal: draw).'], hasamiW: 'House rules vary; here a 5-piece lead decides, so games don’t drag on.' },
  zh: { label: '棋种', hon: '本将棋', mini: '五五将棋', hasami: '夹将棋', rules: '规则', noteS: '仅限平手（人机对局・双人对局・AI对弈）。', note: '五五将棋和夹将棋只有平手，可以人机对局、双人对局或AI对弈（等级分赛、课程、诘将棋、局面编辑和在线对局仅限本将棋）。', lvd: 'AI最多计算{d}步', toHon: '本将棋规则',
    'res.sennichiteMini': '千日手：五五将棋中先手负', 'res.hasami5': '吃子数相差5枚', 'res.nomove': '没有可以移动的棋子了', 'res.hmax': '已到300手，按吃子数判定',
    miniT: '五五将棋规则', miniR: ['5×5棋盘，双方各有玉、飞、角、金、银、步1枚，按图摆放。', '走法、打入持驹、将军、将死获胜等，基本与本将棋相同。', '敌阵只有最远的1行：进入、离开或在其中移动时可升变。步到那里必须升变。', '二步、打步诘、把步打在最远一行都是犯规。', '千日手（同一局面4次）先手负；连续将军造成的千日手，将军方负。'], miniH: '约1970年由楠本茂信创制。棋盘很小，一开局就交战。',
    hasamiT: '夹将棋规则', hasamiR: ['先手在最近的一行摆9枚步，后手摆9枚と。先手先走，每次走1枚。', '所有棋子都像飞车：横竖走任意空格，不能跳过棋子。', '用走动的棋子和自己另一枚棋子横向或纵向夹住对方棋子即可吃掉（成排也可，斜向无效）。', '角落的棋子，占住相邻的2格即可吃掉。', '主动走进对方两子之间不会被吃。', '吃子数比对方多5枚，或对方无棋可走即获胜。', '同一局面4次为和棋。300步未分胜负时吃子多者胜（相同则和）。'], hasamiW: '各地规则不一，这里采用不易拖延的“领先5枚”获胜。' },
  ko: { label: '종목', hon: '쇼기', mini: '5五 쇼기', hasami: '하사미 쇼기', rules: '규칙', noteS: '평수만 가능 (AI 대국·2인 대국·AI끼리).', note: '5五 쇼기와 하사미 쇼기는 평수만 가능하며 AI 대국·2인 대국·AI끼리 대국으로 즐길 수 있습니다 (레이팅전·레슨·츠메쇼기·국면 편집·온라인은 일반 쇼기 전용).', lvd: 'AI가 최대 {d}수 앞까지 읽습니다', toHon: '일반 쇼기 규칙',
    'res.sennichiteMini': '천일수: 5五 쇼기에서는 선수의 패배입니다', 'res.hasami5': '잡은 말이 5개 차이가 났습니다', 'res.nomove': '움직일 수 있는 말이 없습니다', 'res.hmax': '300수에 도달하여 잡은 말 수로 판정했습니다',
    miniT: '5五 쇼기 규칙', miniR: ['5×5 판에서 옥·비차·각행·금장·은장·보를 1개씩 그림처럼 놓습니다.', '말의 움직임, 지닌 말, 장군, 외통으로 승리 등은 일반 쇼기와 같습니다.', '적진은 가장 먼 1단뿐. 들어가거나 나오거나 안에서 움직일 때 승격할 수 있고, 보는 반드시 승격합니다.', '이보, 타보외통, 가장 먼 단에 보 놓기는 반칙입니다.', '천일수(같은 국면 4번)는 선수의 패배. 연속 장군에 의한 천일수는 장군한 쪽의 패배입니다.'], miniH: '1970년경 구스모토 시게노부가 고안. 판이 좁아 바로 싸움이 시작됩니다.',
    hasamiT: '하사미 쇼기 규칙', hasamiR: ['선수는 보 9개, 후수는 토킨 9개를 가장 가까운 단에 놓고, 선수부터 한 수씩 둡니다.', '모든 말은 비차처럼 가로세로로 빈 칸을 몇 칸이든 갑니다(뛰어넘기 불가).', '움직인 말과 내 다른 말로 상대 말을 가로나 세로로 끼우면 잡습니다(한 줄 여러 개도 가능, 대각선 불가).', '구석의 말은 옆 2칸을 막으면 잡힙니다.', '스스로 상대 말 사이에 들어가면 잡히지 않습니다.', '잡은 수가 상대보다 5개 많거나, 상대가 움직일 수 없으면 승리.', '같은 국면 4번은 무승부. 300수까지 승부가 안 나면 많이 잡은 쪽 승리(같으면 무승부).'], hasamiW: '규칙은 지역마다 다르지만, 여기서는 오래 끌지 않는 "5개 차"를 씁니다.' },
  es: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Reglas', noteS: 'Solo sin hándicap (contra IA, dos jugadores, IA contra IA).', note: 'Minishogi y Hasami shogi se juegan sin hándicap: contra la IA, dos jugadores o IA contra IA (clasificatorias, lecciones, tsume, editor y en línea son solo para el shogi normal).', lvd: 'La IA calcula hasta {d} jugadas', toHon: 'Reglas del shogi normal',
    'res.sennichiteMini': 'Repetición: en Minishogi pierde el primer jugador (sente)', 'res.hasami5': 'Un jugador lleva 5 capturas de ventaja', 'res.nomove': 'No queda ninguna pieza que pueda moverse', 'res.hmax': 'Se llegó a la jugada 300: decide el número de capturas',
    miniT: 'Reglas del Minishogi (5×5)', miniR: ['Tablero 5×5; cada bando tiene rey, torre, alfil, oro, plata y peón, como en el diagrama.', 'Movimientos, lanzamientos, jaque y victoria por mate son como en el shogi.', 'La zona es solo la última fila: al entrar, salir o moverse en ella se puede promocionar. El peón debe hacerlo.', 'Prohibido: dos peones en una columna, mate con peón lanzado, lanzar un peón en la última fila.', 'Sennichite (misma posición 4 veces): pierde sente; si hubo jaque perpetuo, pierde quien da jaque.'], miniH: 'Creado hacia 1970 por Shigenobu Kusumoto. El tablero es tan pequeño que la lucha empieza enseguida.',
    hasamiT: 'Reglas del Hasami shogi', hasamiR: ['Sente pone 9 peones (歩) y gote 9 tokin (と) en su fila más cercana. Empieza sente; una pieza por turno.', 'Todas mueven como una torre: en línea recta, sin saltar.', 'Encierra piezas rivales en línea recta entre la pieza movida y otra tuya para capturarlas (no en diagonal).', 'Una pieza en una esquina se captura ocupando las dos casillas vecinas.', 'Meterse entre dos piezas rivales es seguro.', 'Ganas con 5 capturas más que el rival o si este no puede mover.', 'Cuatro repeticiones: tablas. Tras 300 jugadas gana quien capturó más (igual: tablas).'], hasamiW: 'Las reglas caseras varían; aquí decide una ventaja de 5 piezas para que la partida no se alargue.' },
  fr: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Règles', noteS: 'Sans handicap uniquement (contre l’IA, à deux, IA contre IA).', note: 'Le Minishogi et le Hasami shogi se jouent sans handicap : contre l’IA, à deux ou IA contre IA (parties classées, leçons, tsume, éditeur et en ligne : shogi standard uniquement).', lvd: 'L’IA calcule jusqu’à {d} coups', toHon: 'Règles du shogi standard',
    'res.sennichiteMini': 'Répétition : au Minishogi, le premier joueur (sente) perd', 'res.hasami5': 'Un joueur a 5 prises d’avance', 'res.nomove': 'Plus aucune pièce ne peut bouger', 'res.hmax': 'Coup 300 atteint : décision au nombre de prises',
    miniT: 'Règles du Minishogi (5×5)', miniR: ['Plateau 5×5 ; chaque camp a roi, tour, fou, or, argent et pion, placés comme sur le schéma.', 'Marche, parachutage, échec et victoire par mat : comme au shogi.', 'La zone n’est que la dernière rangée : y entrer, en sortir ou y bouger permet de promouvoir. Le pion y promeut forcément.', 'Interdits : deux pions sur une colonne, mat par pion parachuté, pion posé sur la dernière rangée.', 'Sennichite (même position 4 fois) : sente perd ; après un échec perpétuel, celui qui donne échec perd.'], miniH: 'Créé vers 1970 par Shigenobu Kusumoto. Le plateau est si petit que le combat commence aussitôt.',
    hasamiT: 'Règles du Hasami shogi', hasamiR: ['Sente place 9 pions (歩), gote 9 tokin (と) sur sa rangée la plus proche. Sente commence ; une pièce par tour.', 'Toutes les pièces vont comme une tour : en ligne droite, sans sauter.', 'Coincez des pièces adverses en ligne entre la pièce jouée et une autre des vôtres pour les prendre (pas en diagonale).', 'Une pièce dans un coin est prise en occupant les deux cases voisines.', 'Se placer entre deux pièces adverses est sans danger.', 'On gagne avec 5 prises d’avance ou si l’adversaire ne peut plus bouger.', 'Quatre répétitions : nulle. Après 300 coups, le plus de prises gagne (égalité : nulle).'], hasamiW: 'Les règles varient ; ici, 5 prises d’avance décident, pour éviter les parties interminables.' },
  pt: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Regras', noteS: 'Só sem handicap (contra IA, dois jogadores, IA contra IA).', note: 'Minishogi e Hasami shogi são jogados sem handicap: contra a IA, dois jogadores ou IA contra IA (ranqueadas, lições, tsume, editor e online só no shogi normal).', lvd: 'A IA calcula até {d} lances', toHon: 'Regras do shogi normal',
    'res.sennichiteMini': 'Repetição: no Minishogi o primeiro jogador (sente) perde', 'res.hasami5': 'Um jogador tem 5 capturas de vantagem', 'res.nomove': 'Nenhuma peça pode se mover', 'res.hmax': 'Lance 300 atingido: decide o número de capturas',
    miniT: 'Regras do Minishogi (5×5)', miniR: ['Tabuleiro 5×5; cada lado tem rei, torre, bispo, ouro, prata e peão, como no diagrama.', 'Movimentos, largar peças, xeque e vitória por mate são como no shogi.', 'A zona é só a última fileira: entrar, sair ou mover-se nela permite promover. O peão deve promover ali.', 'Proibido: dois peões numa coluna, mate com peão largado, largar peão na última fileira.', 'Sennichite (mesma posição 4 vezes): sente perde; com xeque perpétuo, perde quem dá xeque.'], miniH: 'Criado por volta de 1970 por Shigenobu Kusumoto. O tabuleiro é tão pequeno que a luta começa logo.',
    hasamiT: 'Regras do Hasami shogi', hasamiR: ['Sente põe 9 peões (歩) e gote 9 tokin (と) na fileira mais próxima. Sente começa; uma peça por vez.', 'Todas as peças andam como a torre: em linha reta, sem pular.', 'Prenda peças adversárias em linha reta entre a peça movida e outra sua para capturá-las (não na diagonal).', 'Uma peça no canto é capturada ocupando as duas casas vizinhas.', 'Entrar entre duas peças adversárias é seguro.', 'Vence quem capturar 5 a mais que o rival, ou se ele não puder mover.', 'Quatro repetições: empate. Após 300 lances, vence quem capturou mais (igual: empate).'], hasamiW: 'As regras caseiras variam; aqui decide uma vantagem de 5 peças, para a partida não se arrastar.' },
  de: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami-Shogi', rules: 'Regeln', noteS: 'Nur ohne Vorgabe (gegen KI, zu zweit, KI gegen KI).', note: 'Minishogi und Hasami-Shogi werden ohne Vorgabe gespielt: gegen die KI, zu zweit oder KI gegen KI (Ranglistenpartien, Lektionen, Tsume, Editor und Online nur im normalen Shogi).', lvd: 'Die KI rechnet bis zu {d} Züge voraus', toHon: 'Regeln des normalen Shogi',
    'res.sennichiteMini': 'Zugwiederholung: Im Minishogi verliert der Anziehende (Sente)', 'res.hasami5': 'Ein Spieler hat 5 Schläge Vorsprung', 'res.nomove': 'Kein Stein kann mehr ziehen', 'res.hmax': 'Zug 300 erreicht: die Zahl der geschlagenen Steine entscheidet',
    miniT: 'Minishogi-Regeln (5×5)', miniR: ['5×5-Brett; jede Seite hat König, Turm, Läufer, Gold, Silber und Bauer, aufgestellt wie im Bild.', 'Zugweisen, Einsetzen, Schach und Sieg durch Matt wie im Shogi.', 'Die Zone ist nur die letzte Reihe: Wer hinein-, heraus- oder darin zieht, darf umwandeln. Bauern müssen dort umwandeln.', 'Verboten: zwei Bauern auf einer Linie, Bauernsatz-Matt, einen Bauern auf die letzte Reihe setzen.', 'Sennichite (4-mal dieselbe Stellung): Sente verliert; bei Dauerschach verliert, wer Schach gibt.'], miniH: 'Um 1970 von Shigenobu Kusumoto erfunden. Das Brett ist so klein, dass der Kampf sofort beginnt.',
    hasamiT: 'Hasami-Shogi-Regeln', hasamiR: ['Sente stellt 9 Bauern (歩), Gote 9 Tokin (と) auf die eigene Grundreihe. Sente beginnt; ein Stein pro Zug.', 'Alle Steine ziehen wie ein Turm: gerade, beliebig weit, ohne Springen.', 'Schließe gegnerische Steine in einer Linie zwischen dem gezogenen und einem eigenen Stein ein, um sie zu schlagen (nicht diagonal).', 'Ein Stein in der Ecke wird geschlagen, wenn du beide Nachbarfelder besetzt.', 'Zwischen zwei gegnerische Steine zu ziehen ist sicher.', 'Sieg mit 5 geschlagenen Steinen Vorsprung oder wenn der Gegner nicht ziehen kann.', 'Viermalige Wiederholung: Remis. Nach 300 Zügen gewinnt, wer mehr geschlagen hat (gleich: Remis).'], hasamiW: 'Hausregeln variieren; hier entscheidet ein Vorsprung von 5 Steinen, damit nichts endlos dauert.' },
  hi: { label: 'खेल', hon: 'शोगी', mini: 'मिनीशोगी', hasami: 'हासामी शोगी', rules: 'नियम', noteS: 'केवल बिना हैंडीकैप (AI के साथ, दो खिलाड़ी, AI बनाम AI)।', note: 'मिनीशोगी और हासामी शोगी बिना हैंडीकैप खेले जाते हैं: AI के साथ, दो खिलाड़ी या AI बनाम AI (रेटेड, पाठ, त्सुमे, संपादक और ऑनलाइन सिर्फ़ सामान्य शोगी के लिए)।', lvd: 'AI अधिकतम {d} चालें आगे तक सोचता है', toHon: 'सामान्य शोगी के नियम',
    'res.sennichiteMini': 'दोहराव: मिनीशोगी में पहला खिलाड़ी (सेन्ते) हारता है', 'res.hasami5': 'एक खिलाड़ी 5 मोहरे ज़्यादा पकड़ चुका है', 'res.nomove': 'कोई मोहरा नहीं चल सकता', 'res.hmax': '300वीं चाल पूरी: पकड़े गए मोहरों की संख्या से फ़ैसला',
    miniT: 'मिनीशोगी (5×5) के नियम', miniR: ['5×5 बोर्ड; हर पक्ष के पास राजा, रथ, ऊँट, सोना, चाँदी और प्यादा एक-एक, चित्र की तरह।', 'चालें, हाथ के मोहरे रखना, शह और मात से जीत — सब सामान्य शोगी जैसे।', 'प्रमोशन क्षेत्र सिर्फ़ आख़िरी पंक्ति है: उसमें आते, निकलते या चलते समय प्रमोट कर सकते हैं। प्यादा वहाँ ज़रूर प्रमोट होता है।', 'मना: एक खड़ी पंक्ति में दो प्यादे, प्यादा रखकर मात, आख़िरी पंक्ति पर प्यादा रखना।', 'सेन्निचिते (एक स्थिति 4 बार) में सेन्ते हारता है; लगातार शह से हुआ हो तो शह देने वाला हारता है।'], miniH: 'लगभग 1970 में शिगेनोबु कुसुमोतो ने बनाया। बोर्ड छोटा है, इसलिए लड़ाई तुरंत शुरू होती है।',
    hasamiT: 'हासामी शोगी के नियम', hasamiR: ['सेन्ते 9 प्यादे (歩) और गोते 9 तोकिन (と) अपनी सबसे पास की पंक्ति में रखते हैं। सेन्ते पहले; हर बारी एक मोहरा।', 'सभी मोहरे रथ की तरह चलते हैं: सीधे, कितने भी खाली खाने, कूदे बिना।', 'चले हुए मोहरे और अपने दूसरे मोहरे के बीच सीधी रेखा में विरोधी मोहरों को घेरकर मारें (तिरछा नहीं)।', 'कोने का मोहरा उसके दोनों पड़ोसी खानों पर कब्ज़ा करके मारा जाता है।', 'ख़ुद दो विरोधी मोहरों के बीच जाना सुरक्षित है।', 'विरोधी से 5 मोहरे ज़्यादा मारने पर, या विरोधी के चल न पाने पर जीत।', 'चार बार दोहराव: बराबरी। 300 चालों के बाद ज़्यादा मारने वाला जीतता है (बराबर: बराबरी)।'], hasamiW: 'घरेलू नियम अलग-अलग हैं; यहाँ 5 मोहरों की बढ़त से फ़ैसला होता है ताकि खेल लंबा न खिंचे।' },
  ar: { label: 'النوع', hon: 'شوغي', mini: 'ميني شوغي', hasami: 'هاسامي شوغي', rules: 'القواعد', noteS: 'بلا أفضلية فقط (ضد الذكاء الاصطناعي، لاعبان، ذكاء ضد ذكاء).', note: 'يُلعب ميني شوغي وهاسامي شوغي بلا أفضلية: ضد الذكاء الاصطناعي أو لاعبَين أو ذكاء ضد ذكاء (المباريات المصنّفة والدروس والتسومي والمحرر واللعب عبر الإنترنت للشوغي العادي فقط).', lvd: 'يحسب الذكاء الاصطناعي حتى {d} نقلات', toHon: 'قواعد الشوغي العادي',
    'res.sennichiteMini': 'التكرار: في ميني شوغي يخسر اللاعب الأول (سينتي)', 'res.hasami5': 'تقدّم أحد اللاعبين بـ5 قطع مأسورة', 'res.nomove': 'لا توجد قطعة يمكنها الحركة', 'res.hmax': 'بلغت النقلة 300: الحكم بعدد القطع المأسورة',
    miniT: 'قواعد ميني شوغي (5×5)', miniR: ['رقعة 5×5؛ لكل طرف ملك ورخ وفيل وذهب وفضة وبيدق، مرتبة كما في الشكل.', 'الحركة والإسقاط والكش والفوز بالمات كما في الشوغي.', 'منطقة الترقية هي الصف الأخير فقط: الدخول إليه أو الخروج منه أو التحرك فيه يسمح بالترقية، والبيدق يُرقّى فيه إلزامًا.', 'ممنوع: بيدقان في عمود، المات بإسقاط بيدق، إسقاط بيدق في الصف الأخير.', 'السينيتشيتي (الوضع نفسه 4 مرات) يخسر فيه سينتي؛ وإن كان بكش متواصل يخسر من يكش.'], miniH: 'ابتكرها شيغينوبو كوسوموتو نحو 1970. الرقعة صغيرة فيبدأ القتال فورًا.',
    hasamiT: 'قواعد هاسامي شوغي', hasamiR: ['يضع سينتي 9 بيادق (歩) وغوتي 9 توكين (と) في أقرب صف إليه. يبدأ سينتي، وقطعة واحدة في كل دور.', 'تتحرك كل القطع كالرخ: في خط مستقيم أي مسافة دون قفز.', 'احصر قطع الخصم في خط مستقيم بين القطعة التي حرّكتها وقطعة أخرى لك لتأسرها (ليس قطريًا).', 'القطعة في الزاوية تُؤسر باحتلال المربعين المجاورين لها.', 'الدخول بين قطعتين للخصم آمن.', 'تفوز إذا أسرت 5 قطع أكثر من خصمك، أو إذا لم يستطع التحرك.', 'تكرار الوضع 4 مرات تعادل. بعد 300 نقلة يفوز صاحب الأسرات الأكثر (التساوي تعادل).'], hasamiW: 'تختلف القواعد المحلية؛ هنا يحسم فارق 5 قطع حتى لا تطول المباراة.' },
};
for (const l in TX) {
  const d = I18N[l] || (I18N[l] = {});
  for (const k in TX[l]) d[k.startsWith('res.') ? k : 'vr.' + k] = TX[l][k];
}
// post-game review notes (generic: no openings / castles / entering king — only what fits the variant's rules)
const RV = {
  ja: { mateMiss: '詰みを逃しました。最善手から詰ませられます。', winMiss: '勝ちを決める手を逃しました。', lostM: 'この手のあと、詰まされる形になりました。', lostH: 'この手のあと、負けが決まる形になりました。', capMiss: '相手の駒を取れる手がありました。', capMissH: '{n}枚取れる手を見逃しました。', hang: '次に相手に駒を取られる形になりました。', hangH: '挟まれる位置に駒が残り、次に{n}枚取られる形になりました。', sumBad: 'いちばん形勢を損ねたのは{i}手目 {m}（最善は {b}）。' },
  en: { mateMiss: 'There was a forced mate starting with the best move.', winMiss: 'A move that wins at once was missed.', lostM: 'After this move, the king gets mated.', lostH: 'After this move, the game is lost.', capMiss: 'An enemy piece could have been captured.', capMissH: 'A move capturing {n} piece(s) was missed.', hang: 'This lets the opponent capture a piece next.', hangH: 'Pieces are left where they can be sandwiched: the opponent can capture {n} next.', sumBad: 'The biggest swing: move {i}, {m} (best: {b}).' },
  zh: { mateMiss: '错过了杀棋：从最佳着法开始可以将死对方。', winMiss: '错过了一举获胜的着法。', lostM: '这步棋之后会被将死。', lostH: '这步棋之后已成败局。', capMiss: '本可以吃掉对方的棋子。', capMissH: '错过了能吃{n}枚的着法。', hang: '这步之后，对方下一手可以吃子。', hangH: '棋子留在会被夹住的位置，对方下一手可吃{n}枚。', sumBad: '形势变化最大的是第{i}手 {m}（最佳：{b}）。' },
  ko: { mateMiss: '외통을 놓쳤습니다. 최선수부터 외통으로 몰 수 있었습니다.', winMiss: '단번에 이기는 수를 놓쳤습니다.', lostM: '이 수 뒤에 외통을 당하는 형태가 되었습니다.', lostH: '이 수 뒤에 패배가 정해지는 형태가 되었습니다.', capMiss: '상대 말을 잡을 수 있는 수가 있었습니다.', capMissH: '{n}개를 잡는 수를 놓쳤습니다.', hang: '다음에 상대에게 말을 잡히는 형태가 되었습니다.', hangH: '끼워질 위치에 말이 남아, 다음에 {n}개를 잡히는 형태가 되었습니다.', sumBad: '형세가 가장 크게 기운 수: {i}수째 {m} (최선: {b}).' },
  es: { mateMiss: 'Había mate forzado empezando por la mejor jugada.', winMiss: 'Se escapó una jugada que ganaba al instante.', lostM: 'Tras esta jugada, el rey recibe mate.', lostH: 'Tras esta jugada, la partida está perdida.', capMiss: 'Se podía capturar una pieza rival.', capMissH: 'Se escapó una jugada que capturaba {n} pieza(s).', hang: 'Esto permite al rival capturar una pieza a continuación.', hangH: 'Quedan piezas donde pueden ser encerradas: el rival puede capturar {n} a continuación.', sumBad: 'El mayor cambio: jugada {i}, {m} (mejor: {b}).' },
  fr: { mateMiss: 'Il y avait un mat forcé à partir du meilleur coup.', winMiss: 'Un coup gagnant immédiat a été manqué.', lostM: 'Après ce coup, le roi est maté.', lostH: 'Après ce coup, la partie est perdue.', capMiss: 'Une pièce adverse pouvait être prise.', capMissH: 'Un coup prenant {n} pièce(s) a été manqué.', hang: 'Cela permet à l’adversaire de prendre une pièce au coup suivant.', hangH: 'Des pièces restent là où elles peuvent être coincées : l’adversaire peut en prendre {n} au coup suivant.', sumBad: 'Le plus gros basculement : coup {i}, {m} (meilleur : {b}).' },
  pt: { mateMiss: 'Havia mate forçado começando pelo melhor lance.', winMiss: 'Um lance que vencia na hora foi perdido.', lostM: 'Depois deste lance, o rei leva mate.', lostH: 'Depois deste lance, a partida está perdida.', capMiss: 'Era possível capturar uma peça adversária.', capMissH: 'Um lance que capturava {n} peça(s) foi perdido.', hang: 'Isso deixa o adversário capturar uma peça no lance seguinte.', hangH: 'Ficam peças onde podem ser cercadas: o adversário pode capturar {n} no lance seguinte.', sumBad: 'A maior virada: lance {i}, {m} (melhor: {b}).' },
  de: { mateMiss: 'Mit dem besten Zug gab es ein erzwungenes Matt.', winMiss: 'Ein sofort gewinnender Zug wurde verpasst.', lostM: 'Nach diesem Zug wird der König mattgesetzt.', lostH: 'Nach diesem Zug ist die Partie verloren.', capMiss: 'Ein gegnerischer Stein hätte geschlagen werden können.', capMissH: 'Ein Zug, der {n} Stein(e) schlägt, wurde verpasst.', hang: 'Damit kann der Gegner im nächsten Zug einen Stein schlagen.', hangH: 'Steine bleiben einschließbar stehen: Der Gegner kann im nächsten Zug {n} schlagen.', sumBad: 'Größter Umschwung: Zug {i}, {m} (am besten: {b}).' },
  hi: { mateMiss: 'सबसे अच्छी चाल से शुरू होकर ज़बरदस्ती मात थी।', winMiss: 'तुरंत जिताने वाली चाल छूट गई।', lostM: 'इस चाल के बाद राजा को मात हो जाती है।', lostH: 'इस चाल के बाद खेल हार में बदल जाता है।', capMiss: 'विरोधी का मोहरा पकड़ा जा सकता था।', capMissH: '{n} मोहरे पकड़ने वाली चाल छूट गई।', hang: 'इससे विरोधी अगली चाल में मोहरा पकड़ सकता है।', hangH: 'मोहरे घिरने की जगह पर रह गए: विरोधी अगली चाल में {n} पकड़ सकता है।', sumBad: 'सबसे बड़ा बदलाव: चाल {i}, {m} (सबसे अच्छी: {b})।' },
  ar: { mateMiss: 'كان هناك كش مات إجباري يبدأ بأفضل نقلة.', winMiss: 'فاتت نقلة تحسم الفوز فورًا.', lostM: 'بعد هذه النقلة يتعرض الملك للكش مات.', lostH: 'بعد هذه النقلة أصبحت المباراة خاسرة.', capMiss: 'كان يمكن أسر قطعة للخصم.', capMissH: 'فاتت نقلة تأسر {n} قطعة.', hang: 'هذا يسمح للخصم بأسر قطعة في النقلة التالية.', hangH: 'بقيت قطع في موضع يمكن حصرها فيه: يستطيع الخصم أسر {n} في النقلة التالية.', sumBad: 'أكبر تحوّل: النقلة {i}، <bdi>{m}</bdi> (الأفضل: <bdi>{b}</bdi>).' },
};
for (const l in RV) { const d = I18N[l] || (I18N[l] = {}); for (const k in RV[l]) d['vr.rv.' + k] = RV[l][k]; }
const tx = k => t('vr.' + k);

// ---------------------------------------------------------------- positions
function pos(v) { return v === 'mini' ? new MiniShogi() : v === 'hasami' ? new HasamiShogi() : null; }
// the variant of a position by its SFEN (5 ranks: 5五将棋; no kings: はさみ将棋), '' for 本将棋
function sfenVariant(sfen) { const b = String(sfen || '').split(' ')[0]; return b.split('/').length === 5 ? 'mini' : b && !/k/i.test(b) ? 'hasami' : ''; }
// win-rate scale of the evaluation (mini: piece values close to 本将棋; hasami: one capture = 100 and a 5-capture lead wins)
const WR = { mini: 600, hasami: 160 };
const forGame = rated => (!rated && MODES.includes(settings.mode) && START[settings.variant]) ? settings.variant : '';

// ---------------------------------------------------------------- board geometry (5×5 inside the 9×9 grid of cells)
let gKey = '';
function geom(p) {
  const n = p && p.variant === 'mini' ? 5 : 9, fl = !!flip;
  const c0 = n === 5 ? (fl ? 0 : 4) : 0, r0 = n === 5 ? (fl ? 4 : 0) : 0, key = n + ':' + fl;
  let changed = false;
  if (key !== gKey) {
    gKey = key; changed = true;
    const b = document.getElementById('board');
    b.classList.toggle('v5', n === 5);
    sqEls.forEach((c, d) => {
      const r = (d / 9) | 0, col = d % 9, on = n === 9 || (r >= r0 && r < r0 + 5 && col >= c0 && col < c0 + 5);
      c.classList.toggle('voff', !on);
      c.classList.toggle('vr', n === 5 && col === c0 + 4);
      c.classList.toggle('vb', n === 5 && r === r0 + 4);
    });
    const a = document.getElementById('arrows');
    if (a) a.setAttribute('viewBox', n === 5 ? `${c0 * 100} ${r0 * 110} 500 550` : '0 0 900 990');
    try { document.dispatchEvent(new CustomEvent('shogi-geom', { detail: { n } })); } catch (e) {}
  }
  const vg = !!(game && game.variant && !lesson && (typeof edit === 'undefined' || !edit));
  document.body.classList.toggle('variant', vg);
  document.body.classList.toggle('variant-hasami', vg && game.variant === 'hasami');
  return { n, c0, r0, changed };
}

// ---------------------------------------------------------------- notation
const W_SQ = s => (9 - (s % 9)) + 'abcdefghi'[(s / 9) | 0];
function hasamiName(pos, m, ja) {
  const f = m & 127, to = (m >> 7) & 127, n = pos.capCount ? pos.capCount(f, to) : 0;
  if (ja) return sqZen(f) + '→' + sqZen(to) + (n ? '（' + n + '枚取り）' : '');
  return W_SQ(f) + '-' + W_SQ(to) + (n ? ' x' + n : '');
}

// ---------------------------------------------------------------- end of game
function checkEnd(g, p) {
  const n = g.moves.length;
  if (p.variant === 'hasami') {
    const r = p.result(0);
    if (r != null) { g.over = { winner: p.side ^ 1, reason: 'hasami5', ply: n }; return; }
  }
  if (!p.legalMoves().length) { g.over = { winner: p.side ^ 1, reason: p.variant === 'hasami' ? 'nomove' : 'mate', ply: n }; return; }
  let reps = 0;
  for (let i = p.hn - 1; i >= 0; i -= 2) if (p.histL[i] === p.hl && p.histH[i] === p.hh) reps++;
  if (reps >= 4) {
    if (p.variant === 'hasami') { g.over = { winner: -1, reason: 'sennichite', ply: n }; return; }
    let first = -1;
    for (let i = p.hn - 1; i >= 0; i -= 2) if (p.histL[i] === p.hl && p.histH[i] === p.hh) first = i;
    let usChecked = true, themChecked = true;
    for (let j = first; j < p.hn; j += 2) if (!p.histChk[j]) usChecked = false;
    for (let j = first + 1; j < p.hn; j += 2) if (!p.histChk[j]) themChecked = false;
    if (usChecked) g.over = { winner: p.side, reason: 'perpetual', ply: n };
    else if (themChecked) g.over = { winner: p.side ^ 1, reason: 'perpetual', ply: n };
    else g.over = { winner: 1, reason: 'sennichiteMini', ply: n };   // 5五将棋: 千日手は先手の負け
    return;
  }
  if (p.variant === 'hasami' && n >= HasamiShogi.MAX_PLY) { const a = p.hand[1], b = p.hand[9]; g.over = { winner: a > b ? 0 : b > a ? 1 : -1, reason: 'hmax', ply: n }; return; }
  if (n >= 512) g.over = { winner: -1, reason: 'max', ply: n };
}

// ---------------------------------------------------------------- AI: strength steps → depth / time / noise
// the slider keeps its 19 steps; weak steps search 1–3 plies and choose loosely among moves up to `noise` worse
const LV = {
  mini: { d: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 12], n: [450, 280, 300, 190, 120, 150, 90, 55, 70, 35, 22, 10, 0, 0, 0, 0, 0, 0, 0] },
  hasami: { d: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7], n: [320, 220, 130, 200, 130, 90, 55, 60, 35, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0] },
};
const LV_TIME = [500, 500, 500, 600, 600, 700, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1900, 2300, 2800, 3500, 4500];
function levelOpts(i, v) { const L = LV[v] || LV.mini; i = Math.max(0, Math.min(18, i | 0)); return { depth: L.d[i], noise: L.n[i], time: LV_TIME[i] }; }
const lvName = i => 'Lv.' + ((i | 0) + 1);
function lvDesc(i, v) { return tx('lvd').replace('{d}', levelOpts(i, v).depth); }

// ---------------------------------------------------------------- worker
const W = {}, wId = {};
function worker(kind, onmsg) {
  if (!W[kind]) {
    const w = new Worker('variants/worker.js?v=' + V);
    w.onmessage = onmsg;
    // (a worker terminated while it was still loading reports an error too: only the current one counts)
    w.onerror = e => { if (W[kind] !== w) return; console.warn('variant worker error', e.message); const id = wId[kind]; kill(kind); onmsg({ data: { type: 'result', id, error: true, score: 0, list: [] } }); };
    W[kind] = w;
  }
  return W[kind];
}
// a separate worker for the post-game analysis (index.html runs several at once)
const newWorker = () => new Worker('variants/worker.js?v=' + V);

// ---------------------------------------------------------------- post-game review notes
const VMATE = 30000, WIN = VMATE - 200;
function capOf(p, u) {   // pieces a move captures
  const m = p.fromUsi(u), f = m & 127, to = (m >> 7) & 127;
  if (p.variant === 'hasami') return p.capCount(f, to);
  return f <= 80 && p.board[to] ? 1 : 0;
}
// a, b: analysis of the position before / after the move played ({s, bm, pv}); returns '' or <p> lines
function rvNote(sfen, played, best, a, b, q) {
  if (!a || !b || played === best) return '';
  const v = sfenVariant(sfen), H = v === 'hasami', p = pos(v); if (!p) return '';
  const out = [];
  try {
    p.setSfen(sfen);
    if (a.s >= WIN && -b.s < WIN) out.push(t('vr.rv.' + (H ? 'winMiss' : 'mateMiss')));
    else if (-b.s <= -WIN && a.s > -WIN) out.push(t('vr.rv.' + (H ? 'lostH' : 'lostM')));
    else if (q === 'dubious' || q === 'bad') {
      const cb = capOf(p, best), cp = capOf(p, played);
      if (cb > cp) out.push(H ? t('vr.rv.capMissH', { n: cb }) : t('vr.rv.capMiss'));
      // the opponent's best reply after the move played captures (more than after the best move)
      const reply = (u, r) => { if (!r) return 0; p.doMove(p.fromUsi(u)); let n = 0; try { n = capOf(p, r); } catch (e) {} p.undoMove(); return n; };
      const hp = reply(played, b.pv && b.pv[0]), hb = a.pv && a.pv[0] === best ? reply(best, a.pv[1]) : 0;
      if (hp > hb) out.push(H ? t('vr.rv.hangH', { n: hp }) : t('vr.rv.hang'));
    }
  } catch (e) { return ''; }
  return out.map(x => `<p class="vrn">${x}</p>`).join('');
}
// feature tags of a move (index.html rvFeat): はさみ将棋 names already say 「n枚取り」
function rvFeat(sfen, u) {
  const v = sfenVariant(sfen), p = pos(v); if (!p || v === 'hasami') return [];
  p.setSfen(sfen); const m = p.fromUsi(u), f = [];
  if ((m & 127) > 80) f.push(t('rv.f.drop'));
  else { if (p.board[(m >> 7) & 127]) f.push(t('rv.f.cap')); if (u.endsWith('+')) f.push(t('rv.f.prom')); }
  p.doMove(m); if (p.inCheck()) f.push(t('rv.f.check'));
  return f;
}
function kill(kind) { if (W[kind]) { const w = W[kind]; delete W[kind]; w.onmessage = null; w.terminate(); } }
// aiCall / anaCall: returns the variant worker (and tags the message) when the current game is a variant
function wk(msg, kind, onmsg, id) {
  if (!game || !game.variant || (lesson && !game.lessonGame)) return null;   // (the review of a variant game's mistakes runs as a lesson)
  msg.variant = game.variant;
  if (msg.opts && msg.opts.top) msg.opts = { ...msg.opts, time: Math.min(msg.opts.time || 1500, 1500) };
  wId[kind] = id;
  return worker(kind, onmsg);
}

// ---------------------------------------------------------------- new-game dialog: 種目 next to 手合い
let pendingUrl = (() => { try { const v = new URLSearchParams(location.search).get('variant'); return v === 'mini' || v === 'hasami' || v === 'hon' ? v : null; } catch (e) { return null; } })();
const CSS = `
#fHandi.vr-on{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 14px;align-items:stretch}
#fHandi .vr-l{min-width:0}
#fHandi .vr-l > label,#fHandi .vr-r > label{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted);letter-spacing:.1em;margin-bottom:8px;line-height:1.5}
#fHandi .vr-r{display:flex;flex-direction:column;min-width:0}
#fHandi > #handiNote{grid-column:1 / -1}
#segVariant{flex:1 1 auto;flex-direction:column;flex-wrap:nowrap;min-width:112px}
#segVariant button{flex:1 1 0;min-height:0;padding:0 10px;font-size:12.5px}
.vr-rl{font-size:11.5px;letter-spacing:0;color:var(--accent);text-decoration:underline;text-underline-offset:2px;padding:0}
.vr-rl[hidden]{display:none}
#segHandi.vr-lock button{opacity:.35;pointer-events:none}
#segHandi.vr-lock button.sel{opacity:.8}
#segMode button.vr-off{opacity:.35;pointer-events:none}
@media (max-width: 520px){
  #fHandi.vr-on{grid-template-columns:minmax(0,1fr)}
  #fHandi .vr-r{margin-top:12px}
  #segVariant{flex-direction:row}
  #segVariant button{padding:8px 4px}
}
/* the 5×5 board: the same frame and size, 25 large cells (cells outside the board are taken out of the grid) */
.board.v5{grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);--cw:calc(var(--bw) / 5);--ch:calc(var(--bh) / 5)}
.board .sq.voff{display:none}
.board.v5 .star{display:none}
.board.v5 .sq.vr{border-right:none}
.board.v5 .sq.vb{border-bottom:none}
.board.v5 .sq:not(.vr){border-right:1px solid rgba(40,22,5,.75)}
body.skin-metal .board.v5 .sq:not(.vr){border-right-color:rgba(20,28,34,.7)}
body.skin-ink .board.v5 .sq:not(.vr){border-right-color:rgba(214,180,110,.35)}
body.variant #btnEdit,body.variant #btnShare,body.variant #btnCopy,body.variant #senkei{display:none!important}
.rv-ex p.vrn{color:#e8c98a}
#btnVRules{display:none}
body.variant #btnVRules{display:inline-block}
/* rules of the variants */
#vrOverlay .modal{width:min(880px,100%);display:flex;flex-direction:column}
#vrOverlay .vr-body{flex:1 1 auto;min-height:0;overflow-y:auto}
#vrOverlay .modal-actions{flex:none;margin-top:14px}
@media (min-width: 760px) and (min-height: 600px){ #vrOverlay .modal{height:min(680px, calc(var(--vh) - 32px))} }
#vrOverlay .vr-tabs{margin-bottom:14px}
#vrOverlay .vr-body{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:start}
#vrOverlay ol{margin:0;padding-inline-start:20px;font-size:14px;line-height:1.75;color:#d8cdbb}
#vrOverlay ol li{margin-bottom:6px}
#vrOverlay .vr-h{font-size:12.5px;color:var(--muted);line-height:1.7;margin-top:10px;border-left:2px solid var(--brass2);padding-left:10px}
.vr-dia{display:grid;grid-template-columns:repeat(var(--n),var(--cw));background:linear-gradient(170deg,#ecc67f 0%,#e2b66b 45%,#d6a55a 100%);border:2px solid #2b1a0a;border-radius:3px;direction:ltr}
.vr-dia > div{position:relative;width:var(--cw);height:var(--ch);border-right:1px solid rgba(40,22,5,.75);border-bottom:1px solid rgba(40,22,5,.75)}
.vr-dia > div.r{border-right:none}.vr-dia > div.b{border-bottom:none}
/* phones: the diagram floats beside the rules so the page fits without scrolling */
@media (max-width: 560px){ #vrOverlay .modal{padding:14px 16px;max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px)}#vrOverlay .vr-tabs{margin-bottom:8px}#vrOverlay h2{font-size:17px;margin:0 0 6px}
  #vrOverlay .vr-body{display:block}#vrDia{float:left;margin:3px 12px 4px 0}
  #vrOverlay ol{font-size:13px;line-height:1.5;padding-inline-start:0;list-style-position:inside}#vrOverlay ol li{margin-bottom:3px}
  #vrOverlay .vr-h{display:flow-root;font-size:12px;line-height:1.5;margin-top:6px}#vrOverlay .modal-actions{margin-top:10px}
  html[lang=ar] #vrDia{float:right;margin:3px 0 4px 12px} }
html[lang=ar] #vrOverlay ol,html[lang=ar] #vrOverlay .vr-h{direction:rtl;text-align:right}
`;
{ const st = document.createElement('style'); st.id = 'variantCss'; st.textContent = CSS; document.head.appendChild(st); }

const fH = document.getElementById('fHandi');
let segV = null, rulesLink = null;
if (fH) {
  const l = document.createElement('div'); l.className = 'vr-l';
  while (fH.firstChild) l.appendChild(fH.firstChild);
  const hn = l.querySelector('#handiNote');
  const r = document.createElement('div'); r.className = 'vr-r';
  r.innerHTML = `<label><span id="vrLbl"></span><button type="button" class="vr-rl" id="vrRulesLink"></button></label><div class="seg" id="segVariant"><button data-v=""></button><button data-v="mini"></button><button data-v="hasami"></button></div>`;
  fH.append(l, r); if (hn) fH.appendChild(hn); fH.classList.add('vr-on');
  segV = r.querySelector('#segVariant'); rulesLink = r.querySelector('#vrRulesLink');
  segV.onclick = e => { const b = e.target.closest('button'); if (!b) return; dlg.variant = b.dataset.v; if (dlg.variant && !MODES.includes(dlg.mode)) dlg.mode = 'ai'; updDialog(); };
  rulesLink.onclick = e => { e.preventDefault(); openRules(dlg.variant || 'mini'); };
}
function dlgOpen() {
  dlg.variant = START[settings.variant] ? settings.variant : '';
  if (pendingUrl) { dlg.variant = pendingUrl === 'hon' ? '' : pendingUrl; pendingUrl = null; }
}
function dlgUpdate() {
  if (!segV) return;
  const v = MODES.includes(dlg.mode) && START[dlg.variant] ? dlg.variant : '';
  document.getElementById('vrLbl').textContent = tx('label');
  const bs = segV.querySelectorAll('button');
  bs[0].textContent = tx('hon'); bs[1].textContent = tx('mini'); bs[2].textContent = tx('hasami');
  bs.forEach(b => b.classList.toggle('sel', b.dataset.v === (START[dlg.variant] ? dlg.variant : '')));
  rulesLink.textContent = tx('rules'); rulesLink.hidden = !v;
  const sh = document.getElementById('segHandi'), note = document.getElementById('handiNote');
  sh.classList.toggle('vr-lock', !!v);
  if (v) { sh.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === '0')); note.textContent = tx('noteS'); note.title = tx('note'); note.classList.remove('hidden'); }
  else { note.textContent = t('ng.handiNote'); note.title = ''; }
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('vr-off', !!v && !MODES.includes(b.dataset.v)));
  if (v) {
    document.querySelectorAll('#csWrap1, #csWrap2').forEach(w => w.classList.add('hidden'));
    const lv = +document.getElementById('rngLevel').value, lv2 = +document.getElementById('rngLevel2').value;
    document.getElementById('levelName').innerHTML = `${lvName(lv)}<small>${lvDesc(lv, v)}</small>`;
    document.getElementById('levelName2').innerHTML = `${lvName(lv2)}<small>${lvDesc(lv2, v)}</small>`;
    document.getElementById('lvNote').classList.add('hidden');
  }
}
// the record's variant when the dialog starts a game
function dlgRead() { settings.variant = MODES.includes(dlg.mode) && START[dlg.variant] ? dlg.variant : (MODES.includes(dlg.mode) ? '' : settings.variant || ''); }

// ---------------------------------------------------------------- rules dialog
const ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'vrOverlay';
ov.innerHTML = `<div class="modal"><div class="seg vr-tabs" id="vrTabs"><button data-v="mini"></button><button data-v="hasami"></button></div><h2 id="vrTitle"></h2><div class="vr-body"><div id="vrDia"></div><div><ol id="vrList"></ol><div class="vr-h" id="vrHist"></div></div></div><div class="modal-actions"><button class="mbtn" id="vrToHon"></button><button class="mbtn go" id="vrClose"></button></div></div>`;
document.body.appendChild(ov);
let rulesV = 'mini';
function diagram(v) {
  const p = pos(v); p.setStart();
  const ph = innerWidth <= 560, n = v === 'mini' ? 5 : 9, cw = v === 'mini' ? (ph ? 26 : 44) : (ph ? 14 : 30), f0 = flip; let h = '';
  flip = false;
  try {
    const sq = v === 'mini' ? MiniShogi.SQS : [...Array(81).keys()];
    sq.forEach((s, i) => { const r = (i / n) | 0, c = i % n, code = p.board[s]; h += `<div class="${c === n - 1 ? 'r' : ''} ${r === n - 1 ? 'b' : ''}">${code ? pieceEl(code).outerHTML : ''}</div>`; });
  } finally { flip = f0; }
  return `<div class="vr-dia" style="--n:${n};--cw:${cw}px;--ch:${Math.round(cw * 1.1)}px">${h}</div>`;
}
function paintRules() {
  const v = rulesV;
  ov.querySelectorAll('#vrTabs button').forEach(b => { b.textContent = tx(b.dataset.v); b.classList.toggle('sel', b.dataset.v === v); });
  ov.querySelector('#vrTitle').textContent = tx(v + 'T');
  ov.querySelector('#vrDia').innerHTML = diagram(v);
  const list = t('vr.' + v + 'R');
  ov.querySelector('#vrList').innerHTML = (Array.isArray(list) ? list : []).map(x => `<li>${String(x).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</li>`).join('');
  ov.querySelector('#vrHist').textContent = tx(v === 'mini' ? 'miniH' : 'hasamiW');
  ov.querySelector('#vrToHon').textContent = tx('toHon');
  ov.querySelector('#vrClose').textContent = t('close');
}
function openRules(v) { rulesV = v === 'hasami' ? 'hasami' : 'mini'; paintRules(); ov.classList.add('show'); }
ov.querySelector('#vrTabs').onclick = e => { const b = e.target.closest('button'); if (b) { rulesV = b.dataset.v; paintRules(); } };
ov.querySelector('#vrClose').onclick = () => ov.classList.remove('show');
ov.querySelector('#vrToHon').onclick = () => { ov.classList.remove('show'); try { if (document.getElementById('newOverlay').classList.contains('show')) document.getElementById('newOverlay').classList.remove('show'); lsTab = 'rules'; openLessons(); } catch (e) {} };
ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
// the header's ルール button and a ルール button in the record card open these rules while a variant game is shown
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#btnRules'); if (!b || !game || !game.variant || lesson) return;
  e.preventDefault(); e.stopImmediatePropagation(); openRules(game.variant);
}, true);
{
  const btnPaste = document.getElementById('btnPaste');
  if (btnPaste) { const b = document.createElement('button'); b.id = 'btnVRules'; b.onclick = () => openRules(game && game.variant); btnPaste.parentElement.insertBefore(b, btnPaste); }
}
function relabel() { const b = document.getElementById('btnVRules'); if (b) b.textContent = tx('rules'); if (ov.classList.contains('show')) paintRules(); }
document.getElementById('langSel').addEventListener('change', () => setTimeout(relabel, 0));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', relabel); else setTimeout(relabel, 0);

window.Variants = { START, MODES, WR, pos, sfenVariant, newWorker, rvNote, rvFeat, forGame, geom, hasamiName, inZone: MiniShogi.inZone, checkEnd, levelOpts, lvName, worker, wk, kill, dlgOpen, dlgUpdate, dlgRead, openRules, relabel };
})();
