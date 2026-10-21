'use strict';
// Shogi variants (おまけ): 5五将棋 (minishogi) and はさみ将棋 (hasami shogi) on the same page and board.
// index.html keeps only small hooks (window.Variants.*); the rules live in variants/mini.js and variants/hasami.js,
// the AI (variants/search.js) runs in variants/worker.js. A game record carries game.variant ('mini' | 'hasami');
// 本将棋 records have none, so everything else stays exactly as before.
(() => {
const V = '20261021va';
const START = { mini: MiniShogi.START, hasami: HasamiShogi.START };
const MODES = ['ai', 'pvp', 'watch'];   // modes a variant can be played in

// ---------------------------------------------------------------- texts (10 languages)
const TX = {
  ja: { label: '種目', hon: '本将棋', mini: '5五将棋', hasami: 'はさみ将棋', rules: 'ルール', noteS: 'おまけの2種目は平手のみ（AIと対局・二人で対局・AI同士）。', note: '5五将棋・はさみ将棋は平手のみで、AIと対局・二人で対局・AI同士で遊べます（レーティング戦・レッスン・詰将棋・局面編集・オンラインは本将棋のみ）。', lvd: 'AIの読み：最大{d}手', toHon: '本将棋のルールへ',
    'res.sennichiteMini': '千日手：5五将棋では先手の負けです', 'res.hasami5': '取った駒が5枚差になりました', 'res.nomove': '動かせる駒がなくなりました', 'res.hmax': '300手に達したため、取った枚数で判定しました',
    miniT: '5五将棋のルール', miniR: ['5×5の盤で、玉・飛・角・金・銀・歩を1枚ずつ使います。並べ方は図のとおりです。', '駒の動き、取った駒を持ち駒として打てること、王手を放置できないこと、相手の玉を詰ませたら勝ちなのは本将棋と同じです。', '敵陣は相手側のいちばん奥の1段だけです。そこへ入る・そこから出る・その中で動くときに成れます（金・玉は成れません）。歩はそこで必ず成ります。', '二歩（同じ筋に自分の歩を2枚）、打ち歩詰め、最奥の段への歩打ちは反則です。', '同じ局面が4回現れたら千日手で、先手の負けです。ただし王手を続けての千日手は、王手をかけ続けた側の負けです。'], miniH: '1970年ごろに楠本茂信が考案した小型の将棋です。盤が狭いので序盤からすぐに戦いになります。',
    hasamiT: 'はさみ将棋のルール', hasamiR: ['将棋盤のいちばん手前の段に、先手は歩を9枚、後手はとを9枚並べます。先手から1手ずつ交互に動かします。', '駒はすべて飛車と同じ動きです。縦か横に、空いているマスならいくつでも進めます。駒を飛び越えることはできません。', '動かした駒と自分の別の駒で、相手の駒を縦か横にはさむと取れます。一列に並んだ何枚もの駒も、両端をはさめばまとめて取れます。ななめは無効です。', '隅にいる相手の駒は、となりの2マスを自分の駒でふさぐと取れます。', '自分から相手の駒と駒のあいだに入っても取られません。', '取った枚数で相手より5枚多くなったら勝ちです。相手が動けなくなっても勝ちです。', '同じ局面が4回現れたら千日手で引き分け。300手で決着しないときは取った枚数の多い方の勝ち（同数なら引き分け）です。'], hasamiW: '勝ち方は地域や遊ぶ人によって「全部取る」「決めた枚数を取る」「差をつける」などさまざまです。ここでは、終盤に駒の追いかけっこで長引きにくく、一方的に取られたらすぐ決着する「5枚差」を採用しています。' },
  en: { label: 'Game', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Rules', noteS: 'Even games only (vs AI, two players, AI vs AI).', note: 'Minishogi and Hasami shogi are played even (no handicap): vs AI, two players or AI vs AI (rated games, lessons, tsume, editor and online are for standard shogi).', lvd: 'AI looks up to {d} moves ahead', toHon: 'Standard shogi rules',
    'res.sennichiteMini': 'Repetition: in Minishogi the first player (sente) loses', 'res.hasami5': 'One player is 5 captures ahead', 'res.nomove': 'No piece can move', 'res.hmax': 'Move 300 reached: decided by the number of captures',
    miniT: 'Minishogi (5×5) rules', miniR: ['A 5×5 board; each side has one king, rook, bishop, gold, silver and pawn, set up as in the diagram.', 'Moves, dropping captured pieces, never leaving your king in check and winning by checkmate are the same as in shogi.', 'The promotion zone is only the farthest rank. You may promote when a move enters, leaves or moves inside it (gold and king do not promote). A pawn must promote there.', 'Two unpromoted pawns on one file, mate by a pawn drop, and dropping a pawn on the farthest rank are not allowed.', 'If the same position appears four times (sennichite), the first player (sente) loses — unless it came from perpetual check: then the checking side loses.'], miniH: 'A compact shogi created around 1970 by Shigenobu Kusumoto. The board is so small that the fight starts at once.',
    hasamiT: 'Hasami shogi rules', hasamiR: ['On a shogi board, the first player (sente) puts nine pawns (歩) and the second (gote) nine tokin (と) on their nearest rank. Sente moves first; one piece moves per turn.', 'Every piece moves like a rook: any number of empty squares up, down, left or right. No jumping.', 'Sandwich an enemy piece between the piece you moved and another of yours, vertically or horizontally, to capture it. A whole line of enemy pieces is captured if both ends are closed. Diagonals do not count.', 'An enemy piece in a corner is captured by occupying the two squares next to it.', 'Moving into the gap between two enemy pieces is safe.', 'You win when you have captured 5 pieces more than your opponent, or when your opponent cannot move.', 'A position repeated four times is a draw. If there is no result by move 300, the player with more captures wins (equal: draw).'], hasamiW: 'House rules differ: capture all, capture a set number, or get a lead. Here a 5-piece lead decides: games do not drag on with a few pieces chasing each other, and a one-sided game ends quickly.' },
  zh: { label: '棋种', hon: '本将棋', mini: '五五将棋', hasami: '夹将棋', rules: '规则', noteS: '仅限平手（人机对局・双人对局・AI对弈）。', note: '五五将棋和夹将棋只有平手，可以人机对局、双人对局或AI对弈（等级分赛、课程、诘将棋、局面编辑和在线对局仅限本将棋）。', lvd: 'AI最多计算{d}步', toHon: '本将棋规则',
    'res.sennichiteMini': '千日手：五五将棋中先手负', 'res.hasami5': '吃子数相差5枚', 'res.nomove': '没有可以移动的棋子了', 'res.hmax': '已到300手，按吃子数判定',
    miniT: '五五将棋规则', miniR: ['在5×5的棋盘上，双方各用玉、飞、角、金、银、步各1枚，摆法如图。', '棋子的走法、可以打入吃到的棋子、不能不应将、将死对方获胜，都与本将棋相同。', '敌阵只有对方最底的一行。进入、离开或在其中移动时可以升变（金和玉不能升变）。步到达那里必须升变。', '二步（同一列有两枚自己的未升变步）、打步将死、在最底一行打步均为犯规。', '同一局面出现4次为千日手，先手负。但如果是连续将军造成的千日手，则连续将军的一方负。'], miniH: '约1970年由楠本茂信设计的小型将棋。棋盘很小，开局就进入战斗。',
    hasamiT: '夹将棋规则', hasamiR: ['在将棋盘最靠近自己的一行，先手摆9枚步，后手摆9枚と。先手先走，双方轮流各走一子。', '所有棋子都像飞车一样走：纵向或横向走任意格空格，不能跳过棋子。', '用刚走的棋子和自己的另一枚棋子从纵向或横向夹住对方棋子即可吃掉。一排连在一起的多枚棋子，两端都夹住就能一起吃掉。斜向无效。', '角落里的对方棋子，用自己的棋子堵住它旁边的两格即可吃掉。', '自己走进对方两枚棋子之间不会被吃。', '吃子数比对方多5枚即获胜；对方无子可动也获胜。', '同一局面出现4次为千日手，和棋。300手仍未分出胜负时，吃子多的一方获胜（相同则和棋）。'], hasamiW: '各地玩法不同：全部吃光、吃到规定枚数、领先若干枚等。这里采用“领先5枚”：残局不会因为少数棋子互相追逐而拖长，一边倒的对局也能很快结束。' },
  ko: { label: '종목', hon: '쇼기', mini: '5五 쇼기', hasami: '하사미 쇼기', rules: '규칙', noteS: '평수만 가능 (AI 대국·2인 대국·AI끼리).', note: '5五 쇼기와 하사미 쇼기는 평수만 가능하며 AI 대국·2인 대국·AI끼리 대국으로 즐길 수 있습니다 (레이팅전·레슨·츠메쇼기·국면 편집·온라인은 일반 쇼기 전용).', lvd: 'AI가 최대 {d}수 앞까지 읽습니다', toHon: '일반 쇼기 규칙',
    'res.sennichiteMini': '천일수: 5五 쇼기에서는 선수의 패배입니다', 'res.hasami5': '잡은 말이 5개 차이가 났습니다', 'res.nomove': '움직일 수 있는 말이 없습니다', 'res.hmax': '300수에 도달하여 잡은 말 수로 판정했습니다',
    miniT: '5五 쇼기 규칙', miniR: ['5×5 판에서 옥·비차·각·금·은·보를 1개씩 사용합니다. 배치는 그림과 같습니다.', '말의 움직임, 잡은 말을 놓을 수 있는 것, 왕수를 방치할 수 없는 것, 상대 옥을 외통으로 몰면 이기는 것은 일반 쇼기와 같습니다.', '적진은 상대 쪽 가장 안쪽 1줄뿐입니다. 그곳에 들어가거나 나오거나 그 안에서 움직일 때 승격할 수 있습니다 (금·옥은 승격 불가). 보는 그곳에서 반드시 승격합니다.', '니후(같은 줄에 자기 보 2개), 보를 놓아 외통, 가장 안쪽 줄에 보 놓기는 반칙입니다.', '같은 국면이 4번 나오면 천일수로 선수의 패배입니다. 단, 연속 왕수에 의한 천일수는 왕수를 계속한 쪽의 패배입니다.'], miniH: '1970년경 구스모토 시게노부가 고안한 소형 쇼기입니다. 판이 좁아서 초반부터 바로 싸움이 시작됩니다.',
    hasamiT: '하사미 쇼기 규칙', hasamiR: ['쇼기판의 가장 앞줄에 선수는 보 9개, 후수는 と 9개를 놓습니다. 선수부터 한 수씩 번갈아 움직입니다.', '모든 말은 비차처럼 움직입니다. 세로나 가로로 빈 칸이면 몇 칸이든 갈 수 있고, 말을 뛰어넘을 수는 없습니다.', '움직인 말과 자기의 다른 말로 상대 말을 세로나 가로로 끼우면 잡을 수 있습니다. 한 줄로 늘어선 여러 말도 양 끝을 끼우면 한꺼번에 잡힙니다. 대각선은 무효입니다.', '구석에 있는 상대 말은 옆의 2칸을 자기 말로 막으면 잡을 수 있습니다.', '스스로 상대 말 사이에 들어가도 잡히지 않습니다.', '잡은 말이 상대보다 5개 많아지면 승리합니다. 상대가 움직일 수 없게 되어도 승리입니다.', '같은 국면이 4번 나오면 천일수로 무승부. 300수까지 결판이 나지 않으면 잡은 말이 많은 쪽의 승리(같으면 무승부)입니다.'], hasamiW: '이기는 방법은 지역이나 사람마다 "모두 잡기", "정한 개수 잡기", "차이 벌리기" 등 다양합니다. 여기서는 종반에 말끼리 쫓고 쫓기며 길어지지 않고, 일방적인 대국은 금방 끝나는 "5개 차"를 채택했습니다.' },
  es: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Reglas', noteS: 'Solo sin hándicap (contra IA, dos jugadores, IA contra IA).', note: 'Minishogi y Hasami shogi se juegan sin hándicap: contra la IA, dos jugadores o IA contra IA (clasificatorias, lecciones, tsume, editor y en línea son solo para el shogi normal).', lvd: 'La IA calcula hasta {d} jugadas', toHon: 'Reglas del shogi normal',
    'res.sennichiteMini': 'Repetición: en Minishogi pierde el primer jugador (sente)', 'res.hasami5': 'Un jugador lleva 5 capturas de ventaja', 'res.nomove': 'No queda ninguna pieza que pueda moverse', 'res.hmax': 'Se llegó a la jugada 300: decide el número de capturas',
    miniT: 'Reglas del Minishogi (5×5)', miniR: ['Tablero de 5×5; cada bando tiene un rey, una torre, un alfil, un general de oro, uno de plata y un peón, colocados como en el diagrama.', 'Los movimientos, lanzar piezas capturadas, no dejar el rey en jaque y ganar con mate son como en el shogi.', 'La zona de promoción es solo la última fila. Se puede promover al entrar, salir o moverse dentro de ella (el oro y el rey no promueven). El peón debe promover allí.', 'No se permiten dos peones sin promover en una columna, el mate con lanzamiento de peón ni lanzar un peón en la última fila.', 'Si la misma posición aparece cuatro veces (sennichite), pierde el primer jugador (sente); si se debe a jaques continuos, pierde el que da jaque.'], miniH: 'Shogi compacto creado hacia 1970 por Shigenobu Kusumoto. El tablero es tan pequeño que la lucha empieza enseguida.',
    hasamiT: 'Reglas del Hasami shogi', hasamiR: ['En un tablero de shogi, el primer jugador (sente) coloca nueve peones (歩) y el segundo (gote) nueve tokin (と) en su fila más cercana. Empieza sente; se mueve una pieza por turno.', 'Todas las piezas se mueven como la torre: cualquier número de casillas vacías en vertical u horizontal, sin saltar.', 'Encierra una pieza rival entre la pieza que moviste y otra tuya, en vertical u horizontal, para capturarla. Una línea entera de piezas rivales se captura si cierras ambos extremos. En diagonal no vale.', 'Una pieza rival en una esquina se captura ocupando las dos casillas contiguas.', 'Meterse entre dos piezas rivales es seguro.', 'Ganas cuando has capturado 5 piezas más que tu rival, o cuando tu rival no puede mover.', 'Una posición repetida cuatro veces es tablas. Si no hay resultado en la jugada 300, gana quien tenga más capturas (empate: tablas).'], hasamiW: 'Las reglas varían: capturar todo, capturar un número fijo o sacar ventaja. Aquí decide una ventaja de 5 piezas: el final no se alarga con pocas piezas persiguiéndose y una partida desigual termina pronto.' },
  fr: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Règles', noteS: 'Sans handicap uniquement (contre l’IA, à deux, IA contre IA).', note: 'Le Minishogi et le Hasami shogi se jouent sans handicap : contre l’IA, à deux ou IA contre IA (parties classées, leçons, tsume, éditeur et en ligne : shogi standard uniquement).', lvd: 'L’IA calcule jusqu’à {d} coups', toHon: 'Règles du shogi standard',
    'res.sennichiteMini': 'Répétition : au Minishogi, le premier joueur (sente) perd', 'res.hasami5': 'Un joueur a 5 prises d’avance', 'res.nomove': 'Plus aucune pièce ne peut bouger', 'res.hmax': 'Coup 300 atteint : décision au nombre de prises',
    miniT: 'Règles du Minishogi (5×5)', miniR: ['Plateau 5×5 ; chaque camp a un roi, une tour, un fou, un général d’or, un d’argent et un pion, placés comme sur le diagramme.', 'Les déplacements, le parachutage des pièces prises, l’interdiction de laisser son roi en échec et la victoire par mat sont comme au shogi.', 'La zone de promotion n’est que la dernière rangée. On peut promouvoir en y entrant, en en sortant ou en s’y déplaçant (l’or et le roi ne promeuvent pas). Un pion doit y promouvoir.', 'Deux pions non promus sur une colonne, le mat par parachutage de pion et le parachutage d’un pion sur la dernière rangée sont interdits.', 'Si la même position apparaît quatre fois (sennichite), le premier joueur (sente) perd — sauf échec perpétuel : c’est alors le camp qui donne échec qui perd.'], miniH: 'Shogi compact créé vers 1970 par Shigenobu Kusumoto. Le plateau est si petit que le combat commence tout de suite.',
    hasamiT: 'Règles du Hasami shogi', hasamiR: ['Sur un plateau de shogi, le premier joueur (sente) place neuf pions (歩) et le second (gote) neuf tokin (と) sur sa rangée la plus proche. Sente commence ; une pièce par tour.', 'Toutes les pièces se déplacent comme la tour : autant de cases vides que l’on veut, verticalement ou horizontalement, sans sauter.', 'Prenez une pièce adverse en l’encadrant entre la pièce jouée et une autre des vôtres, verticalement ou horizontalement. Une ligne entière de pièces adverses est prise si ses deux bouts sont fermés. Les diagonales ne comptent pas.', 'Une pièce adverse dans un coin est prise en occupant les deux cases voisines.', 'Se placer entre deux pièces adverses est sans danger.', 'Vous gagnez avec 5 prises d’avance sur l’adversaire, ou s’il ne peut plus jouer.', 'Une position répétée quatre fois est nulle. Sans résultat au coup 300, celui qui a le plus de prises gagne (égalité : nulle).'], hasamiW: 'Les règles varient : tout prendre, prendre un nombre fixé ou mener d’un certain écart. Ici, 5 pièces d’avance décident : la fin ne s’éternise pas avec quelques pièces qui se poursuivent, et une partie déséquilibrée se termine vite.' },
  pt: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami shogi', rules: 'Regras', noteS: 'Só sem handicap (contra IA, dois jogadores, IA contra IA).', note: 'Minishogi e Hasami shogi são jogados sem handicap: contra a IA, dois jogadores ou IA contra IA (ranqueadas, lições, tsume, editor e online só no shogi normal).', lvd: 'A IA calcula até {d} lances', toHon: 'Regras do shogi normal',
    'res.sennichiteMini': 'Repetição: no Minishogi o primeiro jogador (sente) perde', 'res.hasami5': 'Um jogador tem 5 capturas de vantagem', 'res.nomove': 'Nenhuma peça pode se mover', 'res.hmax': 'Lance 300 atingido: decide o número de capturas',
    miniT: 'Regras do Minishogi (5×5)', miniR: ['Tabuleiro 5×5; cada lado tem um rei, uma torre, um bispo, um general de ouro, um de prata e um peão, dispostos como no diagrama.', 'Os movimentos, soltar peças capturadas, não deixar o rei em xeque e vencer por xeque-mate são como no shogi.', 'A zona de promoção é só a última fileira. Pode-se promover ao entrar, sair ou mover-se dentro dela (ouro e rei não promovem). O peão deve promover ali.', 'Dois peões não promovidos na mesma coluna, mate por peão solto e soltar peão na última fileira não são permitidos.', 'Se a mesma posição aparecer quatro vezes (sennichite), o primeiro jogador (sente) perde — se vier de xeques contínuos, perde quem dá xeque.'], miniH: 'Shogi compacto criado por volta de 1970 por Shigenobu Kusumoto. O tabuleiro é tão pequeno que a luta começa logo.',
    hasamiT: 'Regras do Hasami shogi', hasamiR: ['Num tabuleiro de shogi, o primeiro jogador (sente) coloca nove peões (歩) e o segundo (gote) nove tokin (と) na fileira mais próxima. Sente começa; move-se uma peça por vez.', 'Todas as peças movem-se como a torre: quantas casas vazias quiser, na vertical ou horizontal, sem pular.', 'Prenda uma peça adversária entre a peça que você moveu e outra sua, na vertical ou horizontal, para capturá-la. Uma linha inteira de peças adversárias é capturada se as duas pontas forem fechadas. Diagonal não vale.', 'Uma peça adversária no canto é capturada ocupando as duas casas vizinhas.', 'Entrar entre duas peças adversárias é seguro.', 'Você vence quando tiver capturado 5 peças a mais que o adversário, ou quando ele não puder se mover.', 'Uma posição repetida quatro vezes é empate. Sem resultado até o lance 300, vence quem capturou mais (igual: empate).'], hasamiW: 'As regras variam: capturar tudo, capturar um número combinado ou abrir vantagem. Aqui decide uma vantagem de 5 peças: o final não se arrasta com poucas peças se perseguindo e uma partida desigual acaba logo.' },
  de: { label: 'Variante', hon: 'Shogi', mini: 'Minishogi', hasami: 'Hasami-Shogi', rules: 'Regeln', noteS: 'Nur ohne Vorgabe (gegen KI, zu zweit, KI gegen KI).', note: 'Minishogi und Hasami-Shogi werden ohne Vorgabe gespielt: gegen die KI, zu zweit oder KI gegen KI (Ranglistenpartien, Lektionen, Tsume, Editor und Online nur im normalen Shogi).', lvd: 'Die KI rechnet bis zu {d} Züge voraus', toHon: 'Regeln des normalen Shogi',
    'res.sennichiteMini': 'Zugwiederholung: Im Minishogi verliert der Anziehende (Sente)', 'res.hasami5': 'Ein Spieler hat 5 Schläge Vorsprung', 'res.nomove': 'Kein Stein kann mehr ziehen', 'res.hmax': 'Zug 300 erreicht: die Zahl der geschlagenen Steine entscheidet',
    miniT: 'Minishogi-Regeln (5×5)', miniR: ['5×5-Brett; jede Seite hat je einen König, Turm, Läufer, Goldgeneral, Silbergeneral und Bauern, aufgestellt wie im Diagramm.', 'Gangarten, das Einsetzen geschlagener Steine, das Verbot, den eigenen König im Schach zu lassen, und der Sieg durch Matt sind wie im Shogi.', 'Die Umwandlungszone ist nur die letzte Reihe. Man darf umwandeln, wenn ein Zug sie betritt, verlässt oder in ihr zieht (Gold und König wandeln nicht um). Ein Bauer muss dort umwandeln.', 'Zwei unverwandelte Bauern auf einer Linie, Matt durch Bauerneinsatz und das Einsetzen eines Bauern auf die letzte Reihe sind verboten.', 'Tritt dieselbe Stellung viermal auf (Sennichite), verliert der Anziehende (Sente) — bei Dauerschach verliert die schachgebende Seite.'], miniH: 'Ein kompaktes Shogi, um 1970 von Shigenobu Kusumoto erfunden. Das Brett ist so klein, dass der Kampf sofort beginnt.',
    hasamiT: 'Hasami-Shogi-Regeln', hasamiR: ['Auf einem Shogi-Brett stellt der Anziehende (Sente) neun Bauern (歩), der Nachziehende (Gote) neun Tokin (と) auf seine nächste Reihe. Sente beginnt; pro Zug wird ein Stein gezogen.', 'Alle Steine ziehen wie der Turm: beliebig viele freie Felder senkrecht oder waagerecht, ohne zu springen.', 'Schließt du einen gegnerischen Stein zwischen dem gezogenen und einem anderen eigenen Stein senkrecht oder waagerecht ein, ist er geschlagen. Eine ganze Reihe gegnerischer Steine wird geschlagen, wenn beide Enden geschlossen sind. Diagonal zählt nicht.', 'Ein gegnerischer Stein in einer Ecke wird geschlagen, wenn du die zwei Nachbarfelder besetzt.', 'Zwischen zwei gegnerische Steine zu ziehen ist sicher.', 'Du gewinnst mit 5 geschlagenen Steinen Vorsprung oder wenn der Gegner nicht mehr ziehen kann.', 'Eine viermal wiederholte Stellung ist remis. Ohne Ergebnis bis Zug 300 gewinnt, wer mehr Steine geschlagen hat (gleich: remis).'], hasamiW: 'Die Hausregeln sind verschieden: alles schlagen, eine feste Zahl schlagen oder einen Vorsprung erreichen. Hier entscheiden 5 Steine Vorsprung: Das Ende zieht sich nicht hin, wenn wenige Steine einander jagen, und eine einseitige Partie ist schnell vorbei.' },
  hi: { label: 'खेल', hon: 'शोगी', mini: 'मिनीशोगी', hasami: 'हासामी शोगी', rules: 'नियम', noteS: 'केवल बिना हैंडीकैप (AI के साथ, दो खिलाड़ी, AI बनाम AI)।', note: 'मिनीशोगी और हासामी शोगी बिना हैंडीकैप खेले जाते हैं: AI के साथ, दो खिलाड़ी या AI बनाम AI (रेटेड, पाठ, त्सुमे, संपादक और ऑनलाइन सिर्फ़ सामान्य शोगी के लिए)।', lvd: 'AI अधिकतम {d} चालें आगे तक सोचता है', toHon: 'सामान्य शोगी के नियम',
    'res.sennichiteMini': 'दोहराव: मिनीशोगी में पहला खिलाड़ी (सेन्ते) हारता है', 'res.hasami5': 'एक खिलाड़ी 5 मोहरे ज़्यादा पकड़ चुका है', 'res.nomove': 'कोई मोहरा नहीं चल सकता', 'res.hmax': '300वीं चाल पूरी: पकड़े गए मोहरों की संख्या से फ़ैसला',
    miniT: 'मिनीशोगी (5×5) के नियम', miniR: ['5×5 बोर्ड; हर पक्ष के पास एक-एक राजा, रथ, बिशप, स्वर्ण, रजत और प्यादा, चित्र की तरह सजे।', 'चालें, पकड़े गए मोहरों को वापस रखना (ड्रॉप), राजा को शह में न छोड़ना और शह-मात से जीत — सब शोगी जैसा है।', 'प्रमोशन क्षेत्र केवल सबसे दूर की पंक्ति है। उसमें घुसते, निकलते या उसके भीतर चलते समय प्रमोशन हो सकता है (स्वर्ण और राजा नहीं)। प्यादे को वहाँ प्रमोट होना ही है।', 'एक ही फ़ाइल में दो बिना-प्रमोट प्यादे, प्यादा ड्रॉप से मात और सबसे दूर की पंक्ति में प्यादा ड्रॉप वर्जित हैं।', 'एक ही स्थिति चार बार आए (सेन्निचिते) तो पहला खिलाड़ी (सेन्ते) हारता है — अगर लगातार शह से हुआ हो तो शह देने वाला हारता है।'], miniH: 'लगभग 1970 में शिगेनोबु कुसुमोतो द्वारा बनाया गया छोटा शोगी। बोर्ड इतना छोटा है कि लड़ाई तुरंत शुरू हो जाती है।',
    hasamiT: 'हासामी शोगी के नियम', hasamiR: ['शोगी बोर्ड पर पहला खिलाड़ी (सेन्ते) अपनी सबसे पास की पंक्ति में नौ प्यादे (歩) और दूसरा (गोते) नौ तोकिन (と) रखता है। सेन्ते पहले चलता है; हर बारी में एक मोहरा।', 'हर मोहरा रथ की तरह चलता है: ऊपर-नीचे या दाएँ-बाएँ जितने खाली खाने चाहें, बिना कूदे।', 'चले गए मोहरे और अपने दूसरे मोहरे के बीच विरोधी मोहरे को खड़ी या पड़ी रेखा में दबा दें तो वह पकड़ा जाता है। विरोधी मोहरों की पूरी कतार दोनों सिरे बंद करने पर एक साथ पकड़ी जाती है। तिरछा मान्य नहीं।', 'कोने में खड़ा विरोधी मोहरा उसके पास के दोनों खानों पर कब्ज़ा करके पकड़ा जाता है।', 'दो विरोधी मोहरों के बीच खुद जाना सुरक्षित है।', 'जब आप विरोधी से 5 मोहरे ज़्यादा पकड़ लें, या विरोधी चल ही न सके, तो आप जीतते हैं।', 'एक ही स्थिति चार बार आए तो ड्रॉ। 300 चालों तक फ़ैसला न हो तो जिसने ज़्यादा पकड़े वह जीतता है (बराबर: ड्रॉ)।'], hasamiW: 'जीत के नियम जगह-जगह अलग हैं: सब पकड़ो, तय संख्या पकड़ो या बढ़त बनाओ। यहाँ 5 मोहरों की बढ़त से फ़ैसला होता है: अंत में थोड़े मोहरों की भागदौड़ से खेल लंबा नहीं खिंचता, और एकतरफ़ा खेल जल्दी ख़त्म होता है।' },
  ar: { label: 'النوع', hon: 'شوغي', mini: 'ميني شوغي', hasami: 'هاسامي شوغي', rules: 'القواعد', noteS: 'بلا أفضلية فقط (ضد الذكاء الاصطناعي، لاعبان، ذكاء ضد ذكاء).', note: 'يُلعب ميني شوغي وهاسامي شوغي بلا أفضلية: ضد الذكاء الاصطناعي أو لاعبَين أو ذكاء ضد ذكاء (المباريات المصنّفة والدروس والتسومي والمحرر واللعب عبر الإنترنت للشوغي العادي فقط).', lvd: 'يحسب الذكاء الاصطناعي حتى {d} نقلات', toHon: 'قواعد الشوغي العادي',
    'res.sennichiteMini': 'التكرار: في ميني شوغي يخسر اللاعب الأول (سينتي)', 'res.hasami5': 'تقدّم أحد اللاعبين بـ5 قطع مأسورة', 'res.nomove': 'لا توجد قطعة يمكنها الحركة', 'res.hmax': 'بلغت النقلة 300: الحكم بعدد القطع المأسورة',
    miniT: 'قواعد ميني شوغي (5×5)', miniR: ['رقعة 5×5؛ لكل طرف ملك ورخ وفيل وجنرال ذهبي وجنرال فضي وجندي واحد، مرتبة كما في الشكل.', 'الحركات وإسقاط القطع المأسورة وعدم ترك الملك في كش والفوز بالكش مات كلها كما في الشوغي.', 'منطقة الترقية هي الصف الأبعد فقط. يمكن الترقية عند الدخول إليه أو الخروج منه أو الحركة داخله (الذهبي والملك لا يترقيان). على الجندي أن يترقى هناك.', 'يُمنع جنديان غير مرقّيين في عمود واحد، والكش مات بإسقاط جندي، وإسقاط جندي في الصف الأبعد.', 'إذا تكرر الوضع نفسه أربع مرات (سينّيتشيتي) يخسر اللاعب الأول (سينتي) — وإن كان سببه كشاً متواصلاً يخسر من يعطي الكش.'], miniH: 'شوغي مصغّر ابتكره شيغينوبو كوسوموتو نحو عام 1970. الرقعة صغيرة جداً فيبدأ القتال فوراً.',
    hasamiT: 'قواعد هاسامي شوغي', hasamiR: ['على رقعة الشوغي يضع اللاعب الأول (سينتي) تسعة جنود (歩) والثاني (غوتي) تسع قطع توكين (と) في صفه الأقرب. يبدأ سينتي؛ تُحرَّك قطعة واحدة في كل دور.', 'كل القطع تتحرك مثل الرخ: أي عدد من المربعات الفارغة عمودياً أو أفقياً، دون قفز.', 'احصر قطعة الخصم بين القطعة التي حرّكتها وقطعة أخرى لك، عمودياً أو أفقياً، فتأسرها. ويُؤسر صف كامل من قطع الخصم إذا أغلقت طرفيه. القُطر لا يُحتسب.', 'قطعة الخصم في الزاوية تُؤسر باحتلال المربعين المجاورين لها.', 'الدخول بين قطعتين للخصم آمن.', 'تفوز عندما تأسر 5 قطع أكثر من خصمك، أو عندما لا يستطيع خصمك الحركة.', 'الوضع المكرر أربع مرات تعادل. إن لم تُحسم المباراة حتى النقلة 300 يفوز من أسر أكثر (التساوي: تعادل).'], hasamiW: 'تختلف القواعد المحلية: أسر الكل أو أسر عدد محدد أو التقدّم بفارق. هنا يحسم فارق 5 قطع: لا تطول النهاية بمطاردة قطع قليلة، وتنتهي المباراة غير المتكافئة سريعاً.' },
};
for (const l in TX) {
  const d = I18N[l] || (I18N[l] = {});
  for (const k in TX[l]) d[k.startsWith('res.') ? k : 'vr.' + k] = TX[l][k];
}
const tx = k => t('vr.' + k);

// ---------------------------------------------------------------- positions
function pos(v) { return v === 'mini' ? new MiniShogi() : v === 'hasami' ? new HasamiShogi() : null; }
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
    w.onerror = e => { console.warn('variant worker error', e.message); const id = wId[kind]; kill(kind); onmsg({ data: { type: 'result', id, error: true, list: [] } }); };
    W[kind] = w;
  }
  return W[kind];
}
function kill(kind) { if (W[kind]) { W[kind].terminate(); delete W[kind]; } }
// aiCall / anaCall: returns the variant worker (and tags the message) when the current game is a variant
function wk(msg, kind, onmsg, id) {
  if (!game || !game.variant || lesson) return null;
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
body.variant #btnEdit,body.variant #btnAnalyze,body.variant #btnShare,body.variant #btnCopy,body.variant #btnResAnalyze,body.variant #btnMistakes,body.variant #senkei{display:none!important}
#btnVRules{display:none}
body.variant #btnVRules{display:inline-block}
/* rules of the variants */
#vrOverlay .modal{width:min(720px,100%)}
#vrOverlay .vr-tabs{margin-bottom:14px}
#vrOverlay .vr-body{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:start}
#vrOverlay ol{margin:0;padding-inline-start:20px;font-size:14px;line-height:1.75;color:#d8cdbb}
#vrOverlay ol li{margin-bottom:6px}
#vrOverlay .vr-h{font-size:12.5px;color:var(--muted);line-height:1.7;margin-top:10px;border-left:2px solid var(--brass2);padding-left:10px}
.vr-dia{display:grid;grid-template-columns:repeat(var(--n),var(--cw));background:linear-gradient(170deg,#ecc67f 0%,#e2b66b 45%,#d6a55a 100%);border:2px solid #2b1a0a;border-radius:3px;direction:ltr}
.vr-dia > div{position:relative;width:var(--cw);height:var(--ch);border-right:1px solid rgba(40,22,5,.75);border-bottom:1px solid rgba(40,22,5,.75)}
.vr-dia > div.r{border-right:none}.vr-dia > div.b{border-bottom:none}
@media (max-width: 560px){ #vrOverlay .vr-body{grid-template-columns:minmax(0,1fr);justify-items:center} }
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
  const n = v === 'mini' ? 5 : 9, cw = v === 'mini' ? 44 : 30, f0 = flip; let h = '';
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

window.Variants = { START, MODES, pos, forGame, geom, hasamiName, inZone: MiniShogi.inZone, checkEnd, levelOpts, lvName, worker, wk, kill, dlgOpen, dlgUpdate, dlgRead, openRules, relabel };
})();
