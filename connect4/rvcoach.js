/* Connect Four — 振り返り解説 (coach commentary for the post-game review).
   Uses the perfect-solver results of the review (rv.list) and features computed from the position:
   immediate wins missed, opponent's winning cells blocked / left open, double threats, a disc dropped right under a
   winning cell, new winning cells and their row parity (first player: odd rows, second player: even rows — the
   zugzwang rule of Connect Four), cells taken away from the opponent, the centre column, and the best alternative.
   Every sentence is a template filled from these objective criteria (10 languages; cells are written LTR, e.g. d3 =
   column d, 3rd row from the bottom). Loaded before the main script; rvCoach() is called from renderReview(). */
const CR_TEXT = {
ja: {
  now: '{x} はすぐ入れられるマスなので、相手は次にそこをふさぐしかありません。',
  title: '振り返り解説', move: '{n}手目（{who}）{m}', won: 'この手で4つ並び、勝ちました。', drawEnd: 'この手で盤が埋まり、引き分けになりました。',
  same: '最善手です。', eq: '最善と同じ結果になる手です。', res: '読み：この手の前は「{a}」、この手の後は「{b}」。',
  oWin: 'あと{n}手で勝ち', oWinN: '勝ち', oLoss: '相手があと{n}手で勝ち', oLossN: '負け', oDraw: '引き分け',
  missWin: '{w} に入れればその場で4つ並んで勝ちでした。', block: '相手の勝ちマス {x} をふさぎました。',
  noBlock: '相手は {x} に入れれば勝てる状態でした。ここはふさぐ必要がありました。', double: '相手の勝ちマスが {x} と2か所あり、両方はふさげません（ダブルリーチ）。',
  under: 'このコマの真上 {x} は相手の勝ちマスです。真下を埋めたので、相手がすぐそこに入れて勝てます。',
  underOwn: 'このコマの真上 {x} は自分の勝ちマスでしたが、真下を埋めたので相手にふさがれます。',
  threat: '新しい勝ちマス（あと1つで4つ並ぶ空きマス）を {x} に作りました。',
  good: '{who}にとって{p}段の勝ちマスは、終盤に相手がその下を埋めざるを得なくなる「効く段」です。', bad: '{who}にとって{p}段の勝ちマスは終盤に効きにくい段です。',
  odd: '奇数', even: '偶数', kill: '相手の勝ちマス {x} を先に埋めて消しました。',
  center: '中央の d 列は4つ並びの線が最も多く通る、いちばん大事な列です。', best: '最善は {b}（{o}）でした。',
  bBlock: '{b} は相手の勝ちマスをふさぐ手です。', bThreat: '{b} なら {x} に勝ちマスを作れました。', bKill: '{b} なら相手の勝ちマス {x} を消せました。', bCenter: '{b} は中央の列を押さえる手です。', bSafe: '{b} なら相手に勝ちマスを渡しません。',
  tWin: '打つ前に、まず自分が4つ並べられるマスがないか確かめましょう。', tBlock: '自分の手を考える前に、相手が次に4つ並べられるマスを確認しましょう。',
  tUnder: '相手の勝ちマスの真下には置かないこと。そこを埋めると相手にそのマスを渡します。', tParity: '勝ちマスは数より段が大事。先手は奇数段（1・3・5）、後手は偶数段（2・4・6）の勝ちマスが終盤に生きます。',
  tCenter: '序盤は中央の列とその近くに置くと、4つ並びの線を多く作れます。', tGen: '盤の数字で、各列に入れたときの読みを比べてみましょう。',
  sumTurn: '分かれ目：{n}手目 {m}（{who}）で「{a}」→「{b}」。', show: '盤で見る', clean: '勝敗を変える悪手はありませんでした。',
  sumThreats: '最終局面の勝ちマス：{p1} {a}個（効く奇数段 {ao}）、{p2} {b}個（効く偶数段 {be}）。', pick: '手を選ぶと、その手の解説がここに出ます。', coord: 'マスの名前は列（a〜g）＋下からの段（1〜6）。'
},
en: {
  now: '{x} can be played at once, so the opponent must block it right away.',
  title: 'Coach review', move: 'Move {n} ({who}) {m}', won: 'This move makes four in a row and wins.', drawEnd: 'This move fills the board: a draw.',
  same: 'The best move.', eq: 'Gives the same result as the best move.', res: 'Solver: before this move "{a}", after it "{b}".',
  oWin: 'win in {n}', oWinN: 'win', oLoss: 'opponent wins in {n}', oLossN: 'loss', oDraw: 'draw',
  missWin: 'Playing {w} would have made four in a row and won at once.', block: 'Blocks the opponent\'s winning cell {x}.',
  noBlock: 'The opponent could win at {x} next. That cell had to be blocked.', double: 'The opponent has two winning cells ({x}); only one can be blocked (a double threat).',
  under: 'The cell right above this disc, {x}, is the opponent\'s winning cell. Filling the cell below lets them drop in and win.',
  underOwn: 'The cell right above this disc, {x}, was your own winning cell; filling the cell below lets the opponent block it.',
  threat: 'Creates a new winning cell (an empty cell that completes four) at {x}.',
  good: 'For {who}, winning cells on {p} rows are the ones that work: late in the game the opponent is forced to fill the cell below.', bad: 'For {who}, winning cells on {p} rows rarely work in the endgame.',
  odd: 'odd', even: 'even', kill: 'Takes the opponent\'s winning cell {x} first, removing it.',
  center: 'The centre column d is crossed by the most possible lines of four — the most valuable column.', best: 'Best was {b} ({o}).',
  bBlock: '{b} blocks the opponent\'s winning cell.', bThreat: '{b} would have created a winning cell at {x}.', bKill: '{b} would have removed the opponent\'s winning cell {x}.', bCenter: '{b} takes the centre column.', bSafe: '{b} gives the opponent no winning cell.',
  tWin: 'Before every move, first check whether you can make four yourself.', tBlock: 'Before planning your own move, check where the opponent could make four next.',
  tUnder: 'Never play directly under the opponent\'s winning cell — filling it hands them that cell.', tParity: 'Row matters more than number: winning cells on odd rows (1, 3, 5) work for the first player, on even rows (2, 4, 6) for the second.',
  tCenter: 'Early on, play in or near the centre column to take part in the most lines.', tGen: 'Compare the labels on the board: they show the verdict for each column.',
  sumTurn: 'Turning point: move {n} {m} ({who}) went from "{a}" to "{b}".', show: 'Show', clean: 'No mistake changed the result.',
  sumThreats: 'Winning cells at the end: {p1} {a} ({ao} on working odd rows), {p2} {b} ({be} on working even rows).', pick: 'Select a move to see its explanation here.', coord: 'Cells are named by column (a–g) and row from the bottom (1–6).'
},
zh: {
  now: '{x} 可以马上落子，所以对手下一手只能去堵。',
  title: '复盘讲解', move: '第{n}手（{who}）{m}', won: '这一手连成四子，获胜。', drawEnd: '这一手填满棋盘，和棋。',
  same: '最佳着法。', eq: '与最佳着法结果相同。', res: '计算结果：这一手之前「{a}」，之后「{b}」。',
  oWin: '{n}手内胜', oWinN: '胜', oLoss: '对手{n}手内胜', oLossN: '负', oDraw: '和',
  missWin: '下在 {w} 就能立刻连成四子获胜。', block: '堵住了对手的胜点 {x}。',
  noBlock: '对手下一手下在 {x} 就能获胜，这里必须堵住。', double: '对手有两个胜点（{x}），只能堵住一个（双重威胁）。',
  under: '这颗棋子正上方的 {x} 是对手的胜点。填了下面一格，对手马上就能下进去获胜。',
  underOwn: '这颗棋子正上方的 {x} 原本是自己的胜点，填了下面一格就会被对手堵住。',
  threat: '在 {x} 新做出了胜点（再下一子即连成四子的空格）。',
  good: '对{who}来说，{p}行的胜点在残局中有效：对手最终不得不填下面的格子。', bad: '对{who}来说，{p}行的胜点在残局中很难发挥作用。',
  odd: '奇数', even: '偶数', kill: '抢先占住对手的胜点 {x}，把它消除了。',
  center: '中央的 d 列经过的四连线最多，是最重要的一列。', best: '最佳是 {b}（{o}）。',
  bBlock: '{b} 是堵住对手胜点的一手。', bThreat: '下 {b} 可以在 {x} 做出胜点。', bKill: '下 {b} 可以消除对手的胜点 {x}。', bCenter: '{b} 是占据中央列的一手。', bSafe: '下 {b} 不会给对手胜点。',
  tWin: '每次落子前，先看看自己能不能连成四子。', tBlock: '考虑自己的着法之前，先确认对手下一手能在哪里连成四子。',
  tUnder: '不要下在对手胜点的正下方，否则等于把那一格让给对手。', tParity: '胜点的行比数量更重要：先手在奇数行（1·3·5）、后手在偶数行（2·4·6）的胜点在残局有效。',
  tCenter: '开局时下在中央列及其附近，可以参与更多的四连线。', tGen: '比较棋盘上的数字，它们显示各列的判断。',
  sumTurn: '转折点：第{n}手 {m}（{who}）由「{a}」变为「{b}」。', show: '在棋盘上看', clean: '没有改变胜负的恶手。',
  sumThreats: '终局的胜点：{p1} {a}个（有效奇数行 {ao}），{p2} {b}个（有效偶数行 {be}）。', pick: '选择一手棋，这里会显示讲解。', coord: '格子名称＝列（a–g）＋从下数的行（1–6）。'
},
ko: {
  now: '{x}은(는) 바로 둘 수 있는 칸이라 상대는 다음 수에 막을 수밖에 없습니다.',
  title: '복기 해설', move: '{n}수째 ({who}) {m}', won: '이 수로 4개가 이어져 이겼습니다.', drawEnd: '이 수로 판이 가득 차 무승부입니다.',
  same: '최선의 수입니다.', eq: '최선과 같은 결과가 되는 수입니다.', res: '계산: 이 수 전에는 "{a}", 이 수 후에는 "{b}".',
  oWin: '{n}수 안에 승리', oWinN: '승리', oLoss: '상대가 {n}수 안에 승리', oLossN: '패배', oDraw: '무승부',
  missWin: '{w}에 두었으면 바로 4개가 이어져 이겼습니다.', block: '상대의 승리 칸 {x}을(를) 막았습니다.',
  noBlock: '상대는 {x}에 두면 이길 수 있었습니다. 여기는 막아야 했습니다.', double: '상대의 승리 칸이 {x} 두 곳이라 하나만 막을 수 있습니다(이중 위협).',
  under: '이 말 바로 위 {x}은(는) 상대의 승리 칸입니다. 아래 칸을 채웠으므로 상대가 바로 넣어 이깁니다.',
  underOwn: '이 말 바로 위 {x}은(는) 내 승리 칸이었지만, 아래를 채워 상대에게 막힙니다.',
  threat: '새 승리 칸(하나만 더 놓으면 4개가 되는 빈칸)을 {x}에 만들었습니다.',
  good: '{who}에게 {p} 단의 승리 칸은 끝판에 상대가 아래 칸을 채울 수밖에 없게 되는 "통하는 단"입니다.', bad: '{who}에게 {p} 단의 승리 칸은 끝판에 잘 통하지 않습니다.',
  odd: '홀수', even: '짝수', kill: '상대의 승리 칸 {x}을(를) 먼저 채워 없앴습니다.',
  center: '가운데 d 열은 4개 줄이 가장 많이 지나는 가장 중요한 열입니다.', best: '최선은 {b} ({o})였습니다.',
  bBlock: '{b}은(는) 상대의 승리 칸을 막는 수입니다.', bThreat: '{b}이면 {x}에 승리 칸을 만들 수 있었습니다.', bKill: '{b}이면 상대의 승리 칸 {x}을(를) 없앨 수 있었습니다.', bCenter: '{b}은(는) 가운데 열을 차지하는 수입니다.', bSafe: '{b}이면 상대에게 승리 칸을 주지 않습니다.',
  tWin: '두기 전에 먼저 내가 4개를 이을 수 있는 칸이 있는지 확인하세요.', tBlock: '내 수를 생각하기 전에 상대가 다음에 4개를 이을 칸을 확인하세요.',
  tUnder: '상대 승리 칸의 바로 아래에는 두지 마세요. 그 칸을 상대에게 넘겨줍니다.', tParity: '승리 칸은 개수보다 단이 중요합니다. 선수는 홀수 단(1·3·5), 후수는 짝수 단(2·4·6)의 승리 칸이 끝판에 통합니다.',
  tCenter: '초반에는 가운데 열과 그 근처에 두면 더 많은 줄에 참여할 수 있습니다.', tGen: '판 위의 숫자로 각 열의 판정을 비교해 보세요.',
  sumTurn: '갈림길: {n}수째 {m} ({who})에서 "{a}" → "{b}".', show: '판에서 보기', clean: '승패를 바꾼 악수는 없었습니다.',
  sumThreats: '마지막 국면의 승리 칸: {p1} {a}개 (통하는 홀수 단 {ao}), {p2} {b}개 (통하는 짝수 단 {be}).', pick: '수를 고르면 그 수의 해설이 여기에 나옵니다.', coord: '칸 이름은 열(a~g)+아래부터의 단(1~6).'
},
es: {
  now: '{x} se puede jugar ya, así que el rival tiene que bloquearla de inmediato.',
  title: 'Comentario del análisis', move: 'Jugada {n} ({who}) {m}', won: 'Esta jugada hace cuatro en línea y gana.', drawEnd: 'Esta jugada llena el tablero: tablas.',
  same: 'La mejor jugada.', eq: 'Da el mismo resultado que la mejor jugada.', res: 'Cálculo: antes de esta jugada «{a}», después «{b}».',
  oWin: 'gana en {n}', oWinN: 'victoria', oLoss: 'el rival gana en {n}', oLossN: 'derrota', oDraw: 'tablas',
  missWin: 'Jugando {w} se hacían cuatro en línea y se ganaba al instante.', block: 'Bloquea la casilla ganadora del rival {x}.',
  noBlock: 'El rival podía ganar en {x} a continuación. Había que bloquearla.', double: 'El rival tiene dos casillas ganadoras ({x}); solo se puede bloquear una (amenaza doble).',
  under: 'La casilla justo encima de esta ficha, {x}, es ganadora para el rival. Al llenar la de abajo, el rival entra ahí y gana.',
  underOwn: 'La casilla justo encima, {x}, era tu casilla ganadora; al llenar la de abajo el rival puede bloquearla.',
  threat: 'Crea una nueva casilla ganadora (casilla vacía que completa cuatro) en {x}.',
  good: 'Para {who}, las casillas ganadoras en filas {p} son las que funcionan: al final el rival se ve obligado a llenar la casilla de abajo.', bad: 'Para {who}, las casillas ganadoras en filas {p} rara vez funcionan en el final.',
  odd: 'impares', even: 'pares', kill: 'Ocupa antes la casilla ganadora del rival {x} y la elimina.',
  center: 'La columna central d es la que cruzan más líneas de cuatro: la más valiosa.', best: 'La mejor era {b} ({o}).',
  bBlock: '{b} bloquea la casilla ganadora del rival.', bThreat: '{b} habría creado una casilla ganadora en {x}.', bKill: '{b} habría eliminado la casilla ganadora del rival {x}.', bCenter: '{b} ocupa la columna central.', bSafe: '{b} no le da al rival ninguna casilla ganadora.',
  tWin: 'Antes de cada jugada, mira primero si puedes hacer cuatro tú.', tBlock: 'Antes de pensar tu jugada, mira dónde podría hacer cuatro el rival.',
  tUnder: 'No juegues justo debajo de una casilla ganadora del rival: se la entregas.', tParity: 'Importa más la fila que la cantidad: las casillas ganadoras en filas impares (1, 3, 5) sirven al primer jugador; en pares (2, 4, 6), al segundo.',
  tCenter: 'Al principio, juega en la columna central o cerca para participar en más líneas.', tGen: 'Compara las etiquetas del tablero: muestran el veredicto de cada columna.',
  sumTurn: 'Momento clave: jugada {n} {m} ({who}), de «{a}» a «{b}».', show: 'Ver', clean: 'Ningún error cambió el resultado.',
  sumThreats: 'Casillas ganadoras al final: {p1} {a} ({ao} en filas impares útiles), {p2} {b} ({be} en filas pares útiles).', pick: 'Elige una jugada para ver aquí su explicación.', coord: 'Las casillas se nombran por columna (a–g) y fila desde abajo (1–6).'
},
fr: {
  now: "{x} est jouable tout de suite : l'adversaire doit la bloquer immédiatement.",
  title: 'Commentaire', move: 'Coup {n} ({who}) {m}', won: 'Ce coup aligne quatre pions et gagne.', drawEnd: 'Ce coup remplit la grille : match nul.',
  same: 'Le meilleur coup.', eq: 'Donne le même résultat que le meilleur coup.', res: 'Calcul : avant ce coup « {a} », après « {b} ».',
  oWin: 'gain en {n}', oWinN: 'gain', oLoss: 'l\'adversaire gagne en {n}', oLossN: 'perte', oDraw: 'nul',
  missWin: 'Jouer {w} alignait quatre pions et gagnait tout de suite.', block: 'Bloque la case gagnante adverse {x}.',
  noBlock: 'L\'adversaire pouvait gagner en {x} au coup suivant. Il fallait la bloquer.', double: 'L\'adversaire a deux cases gagnantes ({x}) ; une seule peut être bloquée (double menace).',
  under: 'La case juste au-dessus de ce pion, {x}, est gagnante pour l\'adversaire. En remplissant celle du dessous, vous lui permettez d\'y jouer et de gagner.',
  underOwn: 'La case juste au-dessus, {x}, était votre case gagnante ; en remplissant celle du dessous, l\'adversaire peut la bloquer.',
  threat: 'Crée une nouvelle case gagnante (case vide qui complète quatre) en {x}.',
  good: 'Pour {who}, les cases gagnantes sur les rangées {p} sont celles qui comptent : en fin de partie, l\'adversaire est forcé de remplir la case du dessous.', bad: 'Pour {who}, les cases gagnantes sur les rangées {p} servent rarement en fin de partie.',
  odd: 'impaires', even: 'paires', kill: 'Occupe d\'abord la case gagnante adverse {x} et la supprime.',
  center: 'La colonne centrale d est traversée par le plus de lignes de quatre : la plus précieuse.', best: 'Le meilleur était {b} ({o}).',
  bBlock: '{b} bloque la case gagnante adverse.', bThreat: '{b} aurait créé une case gagnante en {x}.', bKill: '{b} aurait supprimé la case gagnante adverse {x}.', bCenter: '{b} prend la colonne centrale.', bSafe: '{b} ne donne aucune case gagnante à l\'adversaire.',
  tWin: 'Avant chaque coup, regardez d\'abord si vous pouvez aligner quatre.', tBlock: 'Avant de penser à votre coup, regardez où l\'adversaire pourrait aligner quatre.',
  tUnder: 'Ne jouez jamais juste sous une case gagnante adverse : vous la lui offrez.', tParity: 'La rangée compte plus que le nombre : les cases gagnantes sur rangées impaires (1, 3, 5) servent au premier joueur, sur rangées paires (2, 4, 6) au second.',
  tCenter: 'En début de partie, jouez dans la colonne centrale ou à côté pour participer à plus de lignes.', tGen: 'Comparez les étiquettes du plateau : elles montrent le verdict de chaque colonne.',
  sumTurn: 'Tournant : coup {n} {m} ({who}), de « {a} » à « {b} ».', show: 'Voir', clean: 'Aucune erreur n\'a changé le résultat.',
  sumThreats: 'Cases gagnantes à la fin : {p1} {a} ({ao} sur rangées impaires utiles), {p2} {b} ({be} sur rangées paires utiles).', pick: 'Choisissez un coup pour voir son explication ici.', coord: 'Les cases sont nommées par colonne (a–g) et rangée depuis le bas (1–6).'
},
pt: {
  now: '{x} pode ser jogada já, então o adversário tem de bloqueá-la de imediato.',
  title: 'Comentário da análise', move: 'Jogada {n} ({who}) {m}', won: 'Esta jogada faz quatro em linha e vence.', drawEnd: 'Esta jogada enche o tabuleiro: empate.',
  same: 'A melhor jogada.', eq: 'Dá o mesmo resultado que a melhor jogada.', res: 'Cálculo: antes desta jogada "{a}", depois "{b}".',
  oWin: 'vence em {n}', oWinN: 'vitória', oLoss: 'o adversário vence em {n}', oLossN: 'derrota', oDraw: 'empate',
  missWin: 'Jogando {w} fazia quatro em linha e vencia na hora.', block: 'Bloqueia a casa vencedora do adversário {x}.',
  noBlock: 'O adversário podia vencer em {x} em seguida. Era preciso bloquear.', double: 'O adversário tem duas casas vencedoras ({x}); só dá para bloquear uma (ameaça dupla).',
  under: 'A casa logo acima desta peça, {x}, é vencedora para o adversário. Ao preencher a de baixo, ele joga ali e vence.',
  underOwn: 'A casa logo acima, {x}, era sua casa vencedora; ao preencher a de baixo, o adversário pode bloqueá-la.',
  threat: 'Cria uma nova casa vencedora (casa vazia que completa quatro) em {x}.',
  good: 'Para {who}, casas vencedoras em linhas {p} são as que funcionam: no final o adversário é obrigado a preencher a casa de baixo.', bad: 'Para {who}, casas vencedoras em linhas {p} raramente funcionam no final.',
  odd: 'ímpares', even: 'pares', kill: 'Ocupa antes a casa vencedora do adversário {x} e a elimina.',
  center: 'A coluna central d é cruzada pelo maior número de linhas de quatro: a mais valiosa.', best: 'A melhor era {b} ({o}).',
  bBlock: '{b} bloqueia a casa vencedora do adversário.', bThreat: '{b} teria criado uma casa vencedora em {x}.', bKill: '{b} teria eliminado a casa vencedora do adversário {x}.', bCenter: '{b} ocupa a coluna central.', bSafe: '{b} não dá nenhuma casa vencedora ao adversário.',
  tWin: 'Antes de cada jogada, veja primeiro se você pode fazer quatro.', tBlock: 'Antes de pensar na sua jogada, veja onde o adversário poderia fazer quatro.',
  tUnder: 'Não jogue logo abaixo de uma casa vencedora do adversário: você a entrega.', tParity: 'A linha importa mais que a quantidade: casas vencedoras em linhas ímpares (1, 3, 5) servem ao primeiro jogador; em pares (2, 4, 6), ao segundo.',
  tCenter: 'No início, jogue na coluna central ou perto dela para participar de mais linhas.', tGen: 'Compare os rótulos do tabuleiro: mostram o veredito de cada coluna.',
  sumTurn: 'Ponto de virada: jogada {n} {m} ({who}), de "{a}" para "{b}".', show: 'Ver', clean: 'Nenhum erro mudou o resultado.',
  sumThreats: 'Casas vencedoras no final: {p1} {a} ({ao} em linhas ímpares úteis), {p2} {b} ({be} em linhas pares úteis).', pick: 'Escolha uma jogada para ver a explicação aqui.', coord: 'As casas são nomeadas pela coluna (a–g) e pela linha a partir de baixo (1–6).'
},
de: {
  now: '{x} ist sofort spielbar, also muss der Gegner es gleich blockieren.',
  title: 'Kommentar', move: 'Zug {n} ({who}) {m}', won: 'Dieser Zug bildet eine Viererreihe und gewinnt.', drawEnd: 'Dieser Zug füllt das Brett: Remis.',
  same: 'Der beste Zug.', eq: 'Führt zum selben Ergebnis wie der beste Zug.', res: 'Berechnung: vor diesem Zug „{a}“, danach „{b}“.',
  oWin: 'Sieg in {n}', oWinN: 'Sieg', oLoss: 'Gegner gewinnt in {n}', oLossN: 'Niederlage', oDraw: 'Remis',
  missWin: 'Mit {w} wäre sofort eine Viererreihe entstanden – der Sieg.', block: 'Blockiert das Gewinnfeld des Gegners {x}.',
  noBlock: 'Der Gegner konnte als Nächstes auf {x} gewinnen. Dieses Feld musste blockiert werden.', double: 'Der Gegner hat zwei Gewinnfelder ({x}); nur eines lässt sich blockieren (Doppeldrohung).',
  under: 'Das Feld direkt über diesem Stein, {x}, ist ein Gewinnfeld des Gegners. Weil das Feld darunter gefüllt ist, kann er dort einwerfen und gewinnen.',
  underOwn: 'Das Feld direkt darüber, {x}, war dein eigenes Gewinnfeld; weil das Feld darunter gefüllt ist, kann der Gegner es blockieren.',
  threat: 'Schafft ein neues Gewinnfeld (leeres Feld, das vier vollendet) auf {x}.',
  good: 'Für {who} sind Gewinnfelder in {p} Reihen die wirksamen: Im Endspiel muss der Gegner das Feld darunter füllen.', bad: 'Für {who} wirken Gewinnfelder in {p} Reihen im Endspiel selten.',
  odd: 'ungeraden', even: 'geraden', kill: 'Besetzt zuerst das Gewinnfeld des Gegners {x} und beseitigt es.',
  center: 'Die mittlere Spalte d wird von den meisten möglichen Viererreihen gekreuzt – die wertvollste Spalte.', best: 'Am besten war {b} ({o}).',
  bBlock: '{b} blockiert das Gewinnfeld des Gegners.', bThreat: '{b} hätte ein Gewinnfeld auf {x} geschaffen.', bKill: '{b} hätte das Gewinnfeld des Gegners {x} beseitigt.', bCenter: '{b} besetzt die Mittelspalte.', bSafe: '{b} gibt dem Gegner kein Gewinnfeld.',
  tWin: 'Prüfe vor jedem Zug zuerst, ob du selbst vier verbinden kannst.', tBlock: 'Prüfe vor deinem Plan, wo der Gegner als Nächstes vier verbinden könnte.',
  tUnder: 'Spiele nie direkt unter ein Gewinnfeld des Gegners – du schenkst es ihm.', tParity: 'Die Reihe zählt mehr als die Anzahl: Gewinnfelder in ungeraden Reihen (1, 3, 5) helfen dem Anziehenden, in geraden (2, 4, 6) dem Nachziehenden.',
  tCenter: 'Spiele früh in oder nahe der Mittelspalte, um an mehr Linien beteiligt zu sein.', tGen: 'Vergleiche die Zahlen auf dem Brett: Sie zeigen das Urteil für jede Spalte.',
  sumTurn: 'Wendepunkt: Zug {n} {m} ({who}) – von „{a}“ zu „{b}“.', show: 'Zeigen', clean: 'Kein Fehler hat das Ergebnis verändert.',
  sumThreats: 'Gewinnfelder am Ende: {p1} {a} ({ao} in wirksamen ungeraden Reihen), {p2} {b} ({be} in wirksamen geraden Reihen).', pick: 'Wähle einen Zug, um hier seine Erklärung zu sehen.', coord: 'Felder heißen nach Spalte (a–g) und Reihe von unten (1–6).'
},
hi: {
  now: '{x} पर तुरंत खेला जा सकता है, इसलिए विरोधी को उसे तुरंत रोकना होगा।',
  title: 'समीक्षा टिप्पणी', move: 'चाल {n} ({who}) {m}', won: 'इस चाल से चार एक पंक्ति में बने और जीत हुई।', drawEnd: 'इस चाल से बोर्ड भर गया: ड्रॉ।',
  same: 'सबसे अच्छी चाल।', eq: 'सबसे अच्छी चाल जैसा ही परिणाम देती है।', res: 'गणना: इस चाल से पहले "{a}", बाद में "{b}"।',
  oWin: '{n} चाल में जीत', oWinN: 'जीत', oLoss: 'विरोधी {n} चाल में जीतेगा', oLossN: 'हार', oDraw: 'ड्रॉ',
  missWin: '{w} पर खेलने से तुरंत चार बनते और जीत होती।', block: 'विरोधी के जीत वाले खाने {x} को रोका।',
  noBlock: 'विरोधी अगली चाल में {x} पर जीत सकता था। उसे रोकना ज़रूरी था।', double: 'विरोधी के दो जीत वाले खाने हैं ({x}); केवल एक रोका जा सकता है (दोहरा ख़तरा)।',
  under: 'इस गोटी के ठीक ऊपर का खाना {x} विरोधी का जीत वाला खाना है। नीचे भरने से विरोधी वहाँ डालकर जीत जाता है।',
  underOwn: 'ठीक ऊपर का खाना {x} आपका जीत वाला खाना था; नीचे भरने से विरोधी उसे रोक सकता है।',
  threat: '{x} पर नया जीत वाला खाना (ऐसा खाली खाना जो चार पूरे करे) बनाया।',
  good: '{who} के लिए {p} पंक्तियों के जीत वाले खाने असरदार हैं: अंत में विरोधी को नीचे का खाना भरना पड़ता है।', bad: '{who} के लिए {p} पंक्तियों के जीत वाले खाने अंत में कम काम आते हैं।',
  odd: 'विषम', even: 'सम', kill: 'विरोधी का जीत वाला खाना {x} पहले भरकर उसे खत्म किया।',
  center: 'बीच का स्तंभ d सबसे ज़्यादा चार वाली रेखाओं से गुज़रता है — सबसे क़ीमती स्तंभ।', best: 'सबसे अच्छी चाल {b} थी ({o})।',
  bBlock: '{b} विरोधी के जीत वाले खाने को रोकती है।', bThreat: '{b} से {x} पर जीत वाला खाना बनता।', bKill: '{b} से विरोधी का जीत वाला खाना {x} खत्म होता।', bCenter: '{b} बीच का स्तंभ लेती है।', bSafe: '{b} विरोधी को कोई जीत वाला खाना नहीं देती।',
  tWin: 'हर चाल से पहले देखें कि क्या आप खुद चार बना सकते हैं।', tBlock: 'अपनी चाल सोचने से पहले देखें कि विरोधी अगली चाल में कहाँ चार बना सकता है।',
  tUnder: 'विरोधी के जीत वाले खाने के ठीक नीचे न खेलें — वह खाना उसे मिल जाता है।', tParity: 'संख्या से ज़्यादा पंक्ति मायने रखती है: पहले खिलाड़ी के लिए विषम (1, 3, 5), दूसरे के लिए सम (2, 4, 6) पंक्तियों के जीत वाले खाने काम आते हैं।',
  tCenter: 'शुरुआत में बीच के स्तंभ में या उसके पास खेलें ताकि ज़्यादा रेखाओं में हिस्सा हो।', tGen: 'बोर्ड पर लिखे अंकों की तुलना करें: वे हर स्तंभ का निर्णय दिखाते हैं।',
  sumTurn: 'मोड़: चाल {n} {m} ({who}) से "{a}" → "{b}"।', show: 'बोर्ड पर देखें', clean: 'किसी गलती ने परिणाम नहीं बदला।',
  sumThreats: 'अंत में जीत वाले खाने: {p1} {a} (असरदार विषम पंक्तियों पर {ao}), {p2} {b} (असरदार सम पंक्तियों पर {be})।', pick: 'कोई चाल चुनें, उसकी व्याख्या यहाँ दिखेगी।', coord: 'खानों के नाम स्तंभ (a–g) और नीचे से पंक्ति (1–6) से हैं।'
},
ar: {
  now: 'يمكن اللعب في {x} فورًا، لذا على الخصم أن يسدّها مباشرة.',
  title: 'شرح المراجعة', move: 'النقلة {n} ({who}) {m}', won: 'هذه النقلة تصنع أربعة في صف وتفوز.', drawEnd: 'هذه النقلة تملأ اللوحة: تعادل.',
  same: 'أفضل نقلة.', eq: 'تعطي النتيجة نفسها التي تعطيها أفضل نقلة.', res: 'الحساب: قبل هذه النقلة «{a}»، وبعدها «{b}».',
  oWin: 'فوز خلال {n}', oWinN: 'فوز', oLoss: 'الخصم يفوز خلال {n}', oLossN: 'خسارة', oDraw: 'تعادل',
  missWin: 'اللعب في {w} كان يصنع أربعة في صف ويفوز فورًا.', block: 'تسدّ خانة فوز الخصم {x}.',
  noBlock: 'كان الخصم يستطيع الفوز في {x} في النقلة التالية. كان يجب سدّها.', double: 'لدى الخصم خانتا فوز ({x})؛ لا يمكن سدّ إلا واحدة (تهديد مزدوج).',
  under: 'الخانة فوق هذه القطعة مباشرة {x} هي خانة فوز للخصم. بملء الخانة التي تحتها يستطيع الخصم اللعب فيها والفوز.',
  underOwn: 'الخانة فوقها مباشرة {x} كانت خانة فوزك؛ بملء ما تحتها يستطيع الخصم سدّها.',
  threat: 'تصنع خانة فوز جديدة (خانة فارغة تُكمل أربعة) في {x}.',
  good: 'بالنسبة إلى {who}، خانات الفوز في الصفوف {p} هي المؤثرة: في النهاية يُجبَر الخصم على ملء الخانة التي تحتها.', bad: 'بالنسبة إلى {who}، خانات الفوز في الصفوف {p} نادرًا ما تنفع في النهاية.',
  odd: 'الفردية', even: 'الزوجية', kill: 'تأخذ خانة فوز الخصم {x} أولًا فتُلغيها.',
  center: 'العمود الأوسط d تمرّ به أكثر خطوط الأربعة — إنه أثمن عمود.', best: 'الأفضل كان {b} ({o}).',
  bBlock: '{b} تسدّ خانة فوز الخصم.', bThreat: '{b} كانت ستصنع خانة فوز في {x}.', bKill: '{b} كانت ستُلغي خانة فوز الخصم {x}.', bCenter: '{b} تأخذ العمود الأوسط.', bSafe: '{b} لا تعطي الخصم أي خانة فوز.',
  tWin: 'قبل كل نقلة، تحقّق أولًا هل يمكنك صنع أربعة بنفسك.', tBlock: 'قبل التفكير في نقلتك، تحقّق أين يمكن للخصم صنع أربعة في النقلة التالية.',
  tUnder: 'لا تلعب أبدًا تحت خانة فوز الخصم مباشرة — فأنت تهديه إياها.', tParity: 'الصف أهم من العدد: خانات الفوز في الصفوف الفردية (1، 3، 5) تنفع اللاعب الأول، وفي الزوجية (2، 4، 6) تنفع الثاني.',
  tCenter: 'في البداية العب في العمود الأوسط أو قربه لتشارك في خطوط أكثر.', tGen: 'قارن الأرقام على اللوحة: إنها تُظهر الحكم لكل عمود.',
  sumTurn: 'نقطة التحوّل: النقلة {n} {m} ({who}) من «{a}» إلى «{b}».', show: 'اعرض', clean: 'لم يغيّر أي خطأ النتيجة.',
  sumThreats: 'خانات الفوز في النهاية: {p1} {a} ({ao} في صفوف فردية مؤثرة)، {p2} {b} ({be} في صفوف زوجية مؤثرة).', pick: 'اختر نقلة لترى شرحها هنا.', coord: 'تُسمّى الخانات بالعمود (a–g) والصف من الأسفل (1–6).'
},
};
function crT(k, v) {
  let s = (CR_TEXT[typeof LANG !== 'undefined' ? LANG : 'ja'] || CR_TEXT.en)[k]; if (s === undefined) s = CR_TEXT.en[k];
  return v ? s.replace(/\{(\w+)\}/g, (_, x) => v[x] !== undefined ? v[x] : '') : s;
}
const crEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const crCell = ([c, r]) => `<bdi class="cr-c">${'abcdefg'[c]}${r + 1}</bdi>`;
const crCells = a => a.map(crCell).join(' · ');
const crCol = c => `<bdi class="cr-c">${'abcdefg'[c]}</bdi>`;
// "win in n" / "draw" / "loss" for the side to move at ply i, from a solver entry (null when not proven)
function crOutcome(e, i) {
  if (!e) return null;
  if (e.kind === 'exact') {
    if (e.v > 0) return crT('oWin', { n: Math.max(1, 22 - e.v - (i >> 1)) });
    if (e.v < 0) return crT('oLoss', { n: Math.max(1, lossIn(e, i)) });
    return crT('oDraw');
  }
  if (e.kind === 'weak') return crT(e.v > 0 ? 'oWinN' : e.v < 0 ? 'oLossN' : 'oDraw');
  return null;
}
// position features for a move c played by p on grid g (g is not changed)
function crFeatures(g, c, p) {
  const q = p === P1 ? P2 : P1, r = g[c].length;
  const playable = th => th.filter(([x, y]) => y === g[x].length);
  const myBefore = emptyThreats(g, p), opBefore = emptyThreats(g, q);
  const winNow = playable(myBefore), oppWin = playable(opBefore);
  const g2 = g.map(col => col.slice()); g2[c].push(p);
  const myAfter = emptyThreats(g2, p), opAfter = emptyThreats(g2, q);
  const key = ([x, y]) => x * 8 + y, had = new Set(myBefore.map(key));
  const created = myAfter.filter(x => !had.has(key(x)));
  const killed = opBefore.some(([x, y]) => x === c && y === r) ? [[c, r]] : [];
  const above = r + 1 < ROWS ? [c, r + 1] : null;
  const under = above && opAfter.some(([x, y]) => x === above[0] && y === above[1]) ? above : null;
  const underOwn = above && !under && myAfter.some(([x, y]) => x === above[0] && y === above[1]) ? above : null;
  return { r, winNow, oppWin, created, killed, under, underOwn, wins: winNow.some(([x]) => x === c), blocks: oppWin.some(([x]) => x === c) };
}
// rows that work for p: first player odd rows (1, 3, 5 → index 0, 2, 4), second player even rows
const crGood = (p, r) => p === P1 ? r % 2 === 0 : r % 2 === 1;
function crMove(i) {
  const j = rvJudge(i); if (!j) return '';
  const p = i & 1 ? P2 : P1, g = gridOf(rv.moves.slice(0, i)), c = j.c, F = crFeatures(g, c, p);
  const tag = j.q ? ` <span class="tag ${j.q}">${crEsc(t('q.' + j.q))}</span>` : '';
  let h = `<p class="cr-mv"><b>${crT('move', { n: i + 1, who: crEsc(sideLabel(p)), m: crCol(c) })}</b>${tag}</p>`;
  const st = statusOf(rv.moves.slice(0, i + 1));
  if (st.winner) return h + `<p>${crT('won')}</p>`;
  const out = [], why = [];
  if (st.draw) out.push(crT('drawEnd'));
  const a = crOutcome(j.bestE, i), b = crOutcome(j.mine, i);
  if (a && b) out.push(crT('res', { a, b }));
  let tip = '';
  // what happened on the board
  if (F.winNow.length) { why.push(crT('missWin', { w: crCells(F.winNow) })); tip = 'tWin'; }
  if (F.oppWin.length > 1 && !F.wins) why.push(crT('double', { x: crCells(F.oppWin) }));
  else if (F.blocks) why.push(crT('block', { x: crCells(F.oppWin) }));
  else if (F.oppWin.length && !F.wins) { why.push(crT('noBlock', { x: crCells(F.oppWin) })); tip = tip || 'tBlock'; }
  if (F.under && !F.oppWin.length) { why.push(crT('under', { x: crCell(F.under) })); tip = tip || 'tUnder'; }
  if (F.underOwn) why.push(crT('underOwn', { x: crCell(F.underOwn) }));
  if (F.killed.length && !F.blocks) why.push(crT('kill', { x: crCells(F.killed) }));
  if (F.created.length && !F.oppWin.length) {
    why.push(crT('threat', { x: crCells(F.created) }));
    const g2 = g.map(col => col.slice()); g2[c].push(p);
    const ready = F.created.filter(([x, y]) => y === g2[x].length), later = F.created.filter(([x, y]) => y !== g2[x].length);
    if (ready.length) why.push(crT('now', { x: crCells(ready) }));
    if (later.length) {   // a cell that cannot be played yet: its row decides whether it works in the endgame (zugzwang)
      const good = later.some(([, r]) => crGood(p, r));
      why.push(crT(good ? 'good' : 'bad', { who: crEsc(sideLabel(p)), p: crT((p === P1) === good ? 'odd' : 'even') }));
      if (!good && j.q) tip = tip || 'tParity';
    }
  }
  if (c === 3 && i < 8 && !F.oppWin.length) why.push(crT('center'));
  // the best move and why
  const bestBetter = j.best !== c && !j.ok;
  if (bestBetter) {
    const o = crOutcome(j.bestE, i);
    why.push(crT('best', { b: crCol(j.best), o: o || '—' }));
    const B = crFeatures(g, j.best, p);
    if (B.blocks && !F.blocks) why.push(crT('bBlock', { b: crCol(j.best) }));
    else if (B.killed.length && !F.killed.length) why.push(crT('bKill', { b: crCol(j.best), x: crCells(B.killed) }));
    else if (B.created.length && B.created.some(([, r]) => crGood(p, r)) && !F.created.some(([, r]) => crGood(p, r))) { why.push(crT('bThreat', { b: crCol(j.best), x: crCells(B.created.filter(([, r]) => crGood(p, r))) })); tip = tip || 'tParity'; }
    else if (F.under && !B.under) why.push(crT('bSafe', { b: crCol(j.best) }));
    else if (j.best === 3 && i < 8) { why.push(crT('bCenter', { b: crCol(j.best) })); tip = tip || 'tCenter'; }
  } else if (!st.draw) out.unshift(crT(j.best === c ? 'same' : 'eq'));
  if (j.q && !tip) tip = 'tGen';
  h += out.map(x => `<p>${x}</p>`).join('');
  if (why.length) h += `<ul class="cr-list">${why.map(x => `<li>${x}</li>`).join('')}</ul>`;
  if (tip) h += `<p class="cr-tip">💡 ${crT(tip)}</p>`;
  return h;
}
function crSummary() {
  const out = [];
  let picks = [];
  for (let i = 0; i < rv.moves.length; i++) {
    const j = rvJudge(i); if (!j || j.q !== 'bad') continue;
    const p = i & 1 ? P2 : P1; if (settings.mode === 'ai' && p !== humanColor) continue;
    picks.push({ i, j, p });
  }
  picks = picks.slice(0, 3);
  for (const { i, j, p } of picks) {
    const a = crOutcome(j.bestE, i) || '—', b = crOutcome(j.mine, i) || '—';
    out.push(crT('sumTurn', { n: i + 1, m: crCol(j.c), who: crEsc(sideLabel(p)), a, b }) + ` <button class="cr-go" data-i="${i}">${crEsc(crT('show'))}</button>`);
  }
  if (!picks.length) out.push(crT('clean'));
  const g = gridOf(rv.moves), A = emptyThreats(g, P1), B = emptyThreats(g, P2);
  if (A.length || B.length) out.push(crT('sumThreats', { p1: crEsc(pname(P1)), p2: crEsc(pname(P2)), a: A.length, b: B.length, ao: A.filter(([, r]) => crGood(P1, r)).length, be: B.filter(([, r]) => crGood(P2, r)).length }));
  out.push(crT('pick'));
  return `<ul class="cr-list">${out.map(x => `<li>${x}</li>`).join('')}</ul>`;
}
function rvCoach() {
  if (typeof rv === 'undefined' || !rv || rv.running || rv.moves !== moves) return '';
  const body = cur < moves.length ? crMove(cur) : crSummary();
  return body ? `<div class="cr-box"><div class="cr-h">${crEsc(crT('title'))}</div>${body}<p class="cr-coord">${crEsc(crT('coord'))}</p></div>` : '';
}
