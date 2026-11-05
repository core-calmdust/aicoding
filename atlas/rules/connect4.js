/* =====================================================================
   Connect Four rules — a guided tour on the 3D table (the leather & walnut tile
   tower, atlas/models/connect4.js, live tiles atlas/games/connect4-tiles.js), told by
   the guide character (Plopbun). The same lessons as the full game's hands-on rules
   (connect4/index.html RULE_PAGES), in friendlier words: dropping (gravity), taking
   turns, four across / up / diagonally, blocking a three, a full column, the draw,
   let's play. You play gold (moves first); silver answers in the turn-taking task.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Columns 0..6 = a..g (left → right), each listed bottom → top: 1 gold, 2 silver.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-plop.webp', COLS = 7, ROWS = 6;
  const grid = cols => cols.map(s => [...s].map(Number));
  const cellAt = (g, c, r) => (c >= 0 && c < COLS && r >= 0 && r < g[c].length) ? g[c][r] : 0;
  function lineThrough(g, c, r, p) {   // the four (or more) in a row through (c, r), or null
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [[c, r]];
      for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (cellAt(g, x, y) === p) { cells.push([x, y]); x += dc * s; y += dr * s; } }
      if (cells.length >= 4) return cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
    return null;
  }
  const toMove = g => g.reduce((n, c) => n + c.length, 0) & 1 ? 2 : 1;
  // cols: the tower; act: what the task accepts; col: the glowing column; red: a full column
  const STEPS = [
    { cols: ['', '', '', '', '', '', ''] },
    { cols: ['', '', '1', '12', '2', '', ''], act: 'drop', col: 3 },
    { cols: ['', '', '', '', '', '', ''], act: 'turn' },
    { cols: ['', '1', '12', '12', '', '', '2'], act: 'four' },
    { cols: ['', '', '111', '22', '2', '', ''], act: 'four' },
    { cols: ['1', '21', '211', '121', '22', '2', ''], act: 'four' },
    { cols: ['', '', '2', '21', '21', '1', ''], act: 'block', ans: 1 },
    { cols: ['', '1', '2', '121212', '', '', ''], act: 'any', red: 3 },
    { cols: ['212121', '212121', '121212', '12121', '212121', '212121', '121212'], act: 'any', col: 3, draw: true },
    { cols: ['', '', '', '', '', '', ''], last: true },
  ];

  const TXT = {
    ja: { name: 'ポトンウサ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '列をタップしてね', nope: '光っている列をえらんでね', full: 'その列はもういっぱいだよ', ng4: 'そこだと4つならばないよ〜。もう一回！', ngBlk: 'あっ、銀に4つならべられちゃった！ 銀の3つの先をよく見て、もう一回！', win: '🏆 勝ち！', draw: '🤝 引き分け', block: '🛡 ブロック！', s: [
      { say: 'ぴょこっ！ ぼくは<b>ポトンウサ</b>。コマをポトンと落とすのが大好きなんだ。今日はこの木のタワーで、<b>四目並べ（コネクトフォー）</b>のルールをいっしょに覚えよう！' },
      { say: 'タワーは<b>横7列×たて6段</b>。列を選んでコマを入れると、<b>いちばん下の空いているところ</b>までポトンと落ちるよ。好きなマスにいきなり置くことはできないんだ。光っている列にコマを落としてみて！', done: 'ポトン！ 下まで落ちて、コマの上に積み重なったね。' },
      { say: '先手は<b>金</b>（きみ）、後手は<b>銀</b>。1こずつ<b>交互に</b>入れていくよ（21こずつ）。好きな列に3回入れてみて！ 銀も入れ返すからね。', done: 'こうやって交互に入れると、下からどんどん積み上がっていくんだ。' },
      { say: '自分の色を<b>一直線に4つ</b>ならべたら、その瞬間に<b>勝ち</b>！ まずは<b>横</b>。金を横に4つならべて勝ってみて！', done: '横に4つ！ 勝ちだよ〜！' },
      { say: '同じ列に<b>たてに4つ</b>積み上げても勝ち！ 金をたてに4つならべてみて！', done: 'たてに4つ！ これも勝ち！' },
      { say: '<b>ななめ</b>の4つも勝ちだよ。コマは下に落ちるから、<b>段差の上に乗る場所</b>をさがすのがコツ。ななめに4つならべてみて！', done: 'ななめに4つ！ いちばん見つけにくい並び方だから、よく見つけたね。' },
      { say: '相手が3つならべて、4つ目に入れられそうになったら大ピンチ！ <b>そこに先に自分のコマを入れて</b>ふさごう。銀の勝ちを止めてみて！', done: 'ナイスブロック！ これで銀は4つならべられないよ。' },
      { say: '6段ぜんぶ埋まった列には、もう入れられないよ。赤い列は<b>満杯</b>。ほかの列にコマを落としてね！', done: 'ほかの列ならちゃんと入るね。' },
      { say: '<b>42マスぜんぶ</b>埋まっても、どちらも4つならべられなかったら<b>引き分け</b>。今は銀の番で、残りは1マスだけ。最後の1こを入れてみて！', done: '盤がいっぱいになったけど、4つならびはなし。引き分けだよ。' },
      { say: 'これでルールはばっちり！ 自分の4つをねらいながら、相手の3つにも気をつけてね。さっそく対局してみよう〜！' },
    ] },
    en: { name: 'Plopbun', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a column', nope: 'Pick the glowing column', full: 'That column is already full', ng4: "That doesn't make four. Try again!", ngBlk: 'Oh no, Silver made four! Look where Silver’s three is heading and try again!', win: '🏆 You win!', draw: '🤝 Draw', block: '🛡 Blocked!', s: [
      { say: "Boing! I'm <b>Plopbun</b>, and I love plopping discs in. Let's learn the rules of <b>Connect Four</b> together on this wooden tower!" },
      { say: 'The tower has <b>7 columns and 6 rows</b>. Pick a column and your disc falls all the way down to the <b>lowest empty spot</b>. You can’t just put it anywhere you like. Drop a disc into the glowing column!', done: 'Plop! It fell to the bottom and stacked up on the disc below.' },
      { say: '<b>Gold</b> (you) goes first and <b>Silver</b> second. You take turns, <b>one disc each</b> (21 each). Drop discs into any columns 3 times! Silver will drop back.', done: 'Taking turns like this, the discs pile up from the bottom.' },
      { say: 'Get <b>four of your colour in a straight line</b> and you <b>win</b> right away! First, <b>across</b>. Line up four gold discs side by side!', done: 'Four across! You win!' },
      { say: 'Four stacked <b>up</b> in one column wins too! Make four gold discs in a column.', done: 'Four up! Another win!' },
      { say: 'Four <b>diagonally</b> wins as well. Discs fall down, so the trick is to find a spot that <b>sits on top of a step</b>. Make four in a diagonal!', done: 'Four diagonally! That’s the hardest line to spot. Well found!' },
      { say: 'When your opponent has three in a row with an open fourth spot, watch out! <b>Drop your own disc there first</b> to block it. Stop Silver from winning!', done: 'Nice block! Now Silver can’t make four there.' },
      { say: 'Once a column has all 6 rows filled, nothing more goes in. The red column is <b>full</b>. Drop your disc into another column!', done: 'Any other column still works.' },
      { say: 'If <b>all 42 spots</b> fill up and nobody has four in a row, it’s a <b>draw</b>. It’s Silver’s turn and only one spot is left. Drop the very last disc!', done: 'The board is full, and there’s no four in a row. It’s a draw.' },
      { say: 'Now you know all the rules! Go for your own four, and keep an eye on your opponent’s threes. Let’s play a game!' },
    ] },
    zh: { name: '叮咚兔', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击一列', nope: '请选发光的那一列', full: '那一列已经满了', ng4: '那里连不成四个哦～再试一次！', ngBlk: '哎呀，被银方连成四个了！看清银方三个子的延长线，再试一次！', win: '🏆 赢了！', draw: '🤝 和棋', block: '🛡 堵住了！', s: [
      { say: '蹦！我是<b>叮咚兔</b>，最喜欢把棋子“叮咚”一声投进去啦。今天在这座木头塔上，一起学<b>四子棋（Connect Four）</b>的规则吧！' },
      { say: '塔有<b>横7列 × 竖6行</b>。选一列投进棋子，它就会一直落到<b>最下面的空位</b>。不能直接放在喜欢的格子上哦。往发光的那一列投一枚棋子试试！', done: '叮咚！落到底，叠在下面的棋子上了。' },
      { say: '<b>金方</b>（你）先，<b>银方</b>后，<b>轮流</b>一次投一枚（各21枚）。往喜欢的列投3次试试！银方也会投回来哦。', done: '这样轮流投下去，棋子就从下往上越堆越高。' },
      { say: '把自己颜色的棋子<b>连成一直线4个</b>，当场就<b>赢</b>！先来<b>横着</b>的。把金棋横着连成4个取胜吧！', done: '横着4个！赢啦～！' },
      { say: '在同一列<b>竖着叠4个</b>也算赢！把金棋竖着连成4个吧！', done: '竖着4个！也赢了！' },
      { say: '<b>斜着</b>的4个也算赢。棋子会往下落，所以诀窍是找到<b>能落在台阶上的位置</b>。斜着连成4个吧！', done: '斜着4个！这是最难发现的连法，你真厉害！' },
      { say: '对方连了3个、第4个位置又能投进去的时候，就危险啦！<b>抢先把自己的棋子投进那里</b>堵住它。阻止银方取胜吧！', done: '漂亮的拦截！这下银方连不成4个了。' },
      { say: '6行都填满的列，就再也投不进去了。红色那一列已经<b>满了</b>，请投到别的列吧！', done: '别的列还是能投进去的。' },
      { say: '<b>42个格子全部</b>填满，双方都没连成4个，就是<b>和棋</b>。现在轮到银方，只剩最后一格了。把最后一枚投进去吧！', done: '棋盘满了，但没有连成4个，是和棋哦。' },
      { say: '规则全都学会啦！一边瞄准自己的4连，一边也要留意对方的3连哦。马上来下一盘吧～！' },
    ] },
    ko: { name: '포통우사', next: '다음', back: '이전', start: '대국해 보기', again: '한 번 더', tap: '열을 탭해 줘', nope: '빛나는 열을 골라 줘', full: '그 열은 이미 꽉 찼어', ng4: '거기서는 4개가 안 돼~ 다시 해 보자!', ngBlk: '앗, 은색이 4개를 만들어 버렸어! 은색 3개가 이어지는 곳을 잘 보고 다시 해 보자!', win: '🏆 승리!', draw: '🤝 무승부', block: '🛡 막았다!', s: [
      { say: '폴짝! 나는 <b>포통우사</b>. 말을 퐁당 떨어뜨리는 걸 정말 좋아해. 오늘은 이 나무 타워에서 <b>사목(커넥트 포)</b> 규칙을 같이 배워 보자!' },
      { say: '타워는 <b>가로 7열 × 세로 6단</b>이야. 열을 골라서 말을 넣으면 <b>맨 아래 빈 곳</b>까지 퐁당 떨어져. 원하는 칸에 바로 놓을 수는 없어. 빛나는 열에 말을 떨어뜨려 봐!', done: '퐁당! 아래까지 떨어져서 말 위에 쌓였네.' },
      { say: '먼저 두는 건 <b>금색</b>(너), 나중은 <b>은색</b>. 한 개씩 <b>번갈아</b> 넣어(21개씩). 아무 열에나 3번 넣어 봐! 은색도 받아서 넣을 거야.', done: '이렇게 번갈아 넣으면 아래부터 차곡차곡 쌓여 가.' },
      { say: '내 색을 <b>한 줄로 4개</b> 놓으면 그 순간 <b>승리</b>! 먼저 <b>가로</b>부터. 금색을 가로로 4개 이어서 이겨 봐!', done: '가로로 4개! 승리야~!' },
      { say: '같은 열에 <b>세로로 4개</b> 쌓아도 승리! 금색을 세로로 4개 이어 봐!', done: '세로로 4개! 이것도 승리!' },
      { say: '<b>대각선</b> 4개도 승리야. 말은 아래로 떨어지니까 <b>계단 위에 올라가는 자리</b>를 찾는 게 요령. 대각선으로 4개 이어 봐!', done: '대각선으로 4개! 제일 찾기 어려운 줄인데 잘 찾았어.' },
      { say: '상대가 3개를 이어서 4번째 자리에 넣을 수 있게 되면 큰일이야! <b>그 자리에 먼저 내 말을 넣어서</b> 막자. 은색의 승리를 막아 봐!', done: '나이스 블록! 이제 은색은 거기서 4개를 못 만들어.' },
      { say: '6단이 다 찬 열에는 더 넣을 수 없어. 빨간 열은 <b>꽉 찼어</b>. 다른 열에 말을 떨어뜨려 줘!', done: '다른 열이라면 잘 들어가지.' },
      { say: '<b>42칸이 전부</b> 차도 둘 다 4개를 못 만들면 <b>무승부</b>야. 지금은 은색 차례고 남은 건 한 칸뿐. 마지막 하나를 넣어 봐!', done: '판이 가득 찼지만 4개 줄은 없어. 무승부야.' },
      { say: '이제 규칙은 완벽해! 내 4개를 노리면서 상대의 3개도 잘 살펴 봐. 바로 대국해 보자~!' },
    ] },
    es: { name: 'Plopbun', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca una columna', nope: 'Elige la columna que brilla', full: 'Esa columna ya está llena', ng4: 'Ahí no haces cuatro. ¡Otra vez!', ngBlk: '¡Ay, las plateadas hicieron cuatro! Fíjate hacia dónde apunta su tres y vuelve a intentarlo.', win: '🏆 ¡Ganaste!', draw: '🤝 Empate', block: '🛡 ¡Bloqueado!', s: [
      { say: '¡Boing! Soy <b>Plopbun</b> y me encanta dejar caer fichas, ¡plop! ¡Vamos a aprender juntos las reglas del <b>Conecta 4</b> en esta torre de madera!' },
      { say: 'La torre tiene <b>7 columnas y 6 filas</b>. Eliges una columna y la ficha cae hasta el <b>hueco libre más bajo</b>. No puedes ponerla donde quieras. ¡Suelta una ficha en la columna que brilla!', done: '¡Plop! Cayó hasta abajo y se apiló sobre la ficha de debajo.' },
      { say: 'Empiezan las <b>doradas</b> (tú) y luego las <b>plateadas</b>. Se juega <b>por turnos, una ficha cada vez</b> (21 cada uno). ¡Suelta fichas 3 veces en las columnas que quieras! Las plateadas responderán.', done: 'Así, por turnos, las fichas se van apilando desde abajo.' },
      { say: '¡Si pones <b>cuatro de tu color en línea recta</b>, <b>ganas</b> al momento! Primero, en <b>horizontal</b>. ¡Junta cuatro doradas una al lado de otra!', done: '¡Cuatro en horizontal! ¡Ganaste!' },
      { say: '¡Cuatro <b>apiladas</b> en una misma columna también ganan! Haz cuatro doradas en vertical.', done: '¡Cuatro en vertical! ¡Otra victoria!' },
      { say: 'Cuatro en <b>diagonal</b> también valen. Como las fichas caen, el truco es encontrar un hueco que <b>quede encima de un escalón</b>. ¡Haz cuatro en diagonal!', done: '¡Cuatro en diagonal! Es la línea más difícil de ver. ¡Bien visto!' },
      { say: 'Si el rival tiene tres en línea y el cuarto hueco está libre, ¡cuidado! <b>Mete tú una ficha ahí primero</b> para bloquearlo. ¡Impide que ganen las plateadas!', done: '¡Buen bloqueo! Ahora las plateadas no pueden hacer cuatro ahí.' },
      { say: 'Cuando una columna tiene las 6 filas llenas, ya no entra nada. La columna roja está <b>llena</b>. ¡Suelta tu ficha en otra columna!', done: 'En cualquier otra columna sí entra.' },
      { say: 'Si se llenan <b>los 42 huecos</b> y nadie tiene cuatro en línea, es <b>empate</b>. Les toca a las plateadas y solo queda un hueco. ¡Suelta la última ficha!', done: 'El tablero está lleno y no hay cuatro en línea. Es empate.' },
      { say: '¡Ya sabes todas las reglas! Busca tus cuatro y vigila los tres del rival. ¡A jugar!' },
    ] },
    fr: { name: 'Plopbun', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche une colonne', nope: 'Choisis la colonne qui brille', full: 'Cette colonne est déjà pleine', ng4: 'Ça ne fait pas quatre. Réessaie !', ngBlk: 'Oh non, l’argent a aligné quatre ! Regarde où mène son alignement de trois et réessaie.', win: '🏆 Gagné !', draw: '🤝 Match nul', block: '🛡 Bloqué !', s: [
      { say: 'Boing ! Moi, c’est <b>Plopbun</b>, et j’adore faire plop avec les jetons. Apprenons ensemble les règles du <b>Puissance 4</b> sur cette tour en bois !' },
      { say: 'La tour a <b>7 colonnes et 6 rangées</b>. Choisis une colonne : ton jeton tombe jusqu’à la <b>case libre la plus basse</b>. Impossible de le poser où tu veux. Lâche un jeton dans la colonne qui brille !', done: 'Plop ! Il est tombé tout en bas et s’est empilé sur le jeton du dessous.' },
      { say: 'L’<b>or</b> (toi) commence, puis l’<b>argent</b>. On joue <b>chacun son tour, un jeton à la fois</b> (21 chacun). Lâche des jetons 3 fois dans les colonnes de ton choix ! L’argent répondra.', done: 'En jouant chacun son tour, les jetons s’empilent depuis le bas.' },
      { say: 'Aligne <b>quatre jetons de ta couleur en ligne droite</b> et tu <b>gagnes</b> aussitôt ! D’abord <b>à l’horizontale</b>. Aligne quatre jetons dorés côte à côte !', done: 'Quatre à l’horizontale ! Gagné !' },
      { say: 'Quatre <b>empilés</b> dans une même colonne, ça gagne aussi ! Fais quatre jetons dorés à la verticale.', done: 'Quatre à la verticale ! Encore gagné !' },
      { say: 'Quatre <b>en diagonale</b>, ça compte aussi. Les jetons tombent, alors l’astuce est de trouver une case <b>posée sur une marche</b>. Fais quatre en diagonale !', done: 'Quatre en diagonale ! C’est l’alignement le plus dur à repérer. Bien vu !' },
      { say: 'Quand l’adversaire a trois jetons alignés et que la quatrième case est jouable, attention ! <b>Mets-y ton jeton en premier</b> pour bloquer. Empêche l’argent de gagner !', done: 'Joli blocage ! L’argent ne peut plus aligner quatre ici.' },
      { say: 'Quand une colonne a ses 6 rangées remplies, plus rien n’y entre. La colonne rouge est <b>pleine</b>. Lâche ton jeton dans une autre colonne !', done: 'Dans une autre colonne, ça passe.' },
      { say: 'Si les <b>42 cases</b> sont remplies sans que personne n’aligne quatre, c’est <b>match nul</b>. C’est au tour de l’argent et il reste une seule case. Lâche le tout dernier jeton !', done: 'Le plateau est plein et personne n’a aligné quatre. Match nul.' },
      { say: 'Tu connais toutes les règles ! Vise tes quatre et surveille les trois de l’adversaire. On fait une partie ?' },
    ] },
    pt: { name: 'Plopbun', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque numa coluna', nope: 'Escolha a coluna que brilha', full: 'Essa coluna já está cheia', ng4: 'Aí não forma quatro. Tente de novo!', ngBlk: 'Ah não, as prateadas fizeram quatro! Veja para onde vai a fileira de três delas e tente de novo.', win: '🏆 Vitória!', draw: '🤝 Empate', block: '🛡 Bloqueado!', s: [
      { say: 'Boing! Eu sou o <b>Plopbun</b> e adoro soltar peças, plop! Vamos aprender juntos as regras do <b>Lig 4</b> (Connect Four) nesta torre de madeira!' },
      { say: 'A torre tem <b>7 colunas e 6 fileiras</b>. Escolha uma coluna e a peça cai até o <b>espaço vazio mais baixo</b>. Não dá para colocar onde você quiser. Solte uma peça na coluna que brilha!', done: 'Plop! Ela caiu até embaixo e ficou em cima da peça de baixo.' },
      { say: 'As <b>douradas</b> (você) começam e as <b>prateadas</b> vêm depois. Cada um joga <b>na sua vez, uma peça por vez</b> (21 cada). Solte peças 3 vezes nas colunas que quiser! As prateadas vão responder.', done: 'Alternando assim, as peças vão se empilhando de baixo para cima.' },
      { say: 'Coloque <b>quatro da sua cor em linha reta</b> e você <b>ganha</b> na hora! Primeiro, na <b>horizontal</b>. Junte quatro douradas lado a lado!', done: 'Quatro na horizontal! Vitória!' },
      { say: 'Quatro <b>empilhadas</b> na mesma coluna também ganham! Faça quatro douradas na vertical.', done: 'Quatro na vertical! Outra vitória!' },
      { say: 'Quatro na <b>diagonal</b> também valem. Como as peças caem, o segredo é achar um espaço que <b>fica em cima de um degrau</b>. Faça quatro na diagonal!', done: 'Quatro na diagonal! É a linha mais difícil de enxergar. Boa!' },
      { say: 'Quando o adversário tem três em linha e o quarto espaço está livre, cuidado! <b>Coloque a sua peça lá primeiro</b> para bloquear. Impeça as prateadas de ganhar!', done: 'Belo bloqueio! Agora as prateadas não fazem quatro ali.' },
      { say: 'Quando uma coluna tem as 6 fileiras cheias, não entra mais nada. A coluna vermelha está <b>cheia</b>. Solte sua peça em outra coluna!', done: 'Em qualquer outra coluna ainda entra.' },
      { say: 'Se <b>os 42 espaços</b> se encherem e ninguém tiver quatro em linha, é <b>empate</b>. É a vez das prateadas e só sobrou um espaço. Solte a última peça!', done: 'O tabuleiro encheu e ninguém fez quatro em linha. É empate.' },
      { say: 'Agora você sabe todas as regras! Busque os seus quatro e fique de olho nos três do adversário. Vamos jogar!' },
    ] },
    de: { name: 'Plopbun', next: 'Weiter', back: 'Zurück', start: 'Los geht’s', again: 'Nochmal', tap: 'Tippe auf eine Spalte', nope: 'Wähl die leuchtende Spalte', full: 'Diese Spalte ist schon voll', ng4: 'Da kommen keine vier zusammen. Nochmal!', ngBlk: 'Oh nein, Silber hat vier in einer Reihe! Schau, wohin die Dreierreihe von Silber zeigt, und versuch’s nochmal.', win: '🏆 Gewonnen!', draw: '🤝 Unentschieden', block: '🛡 Geblockt!', s: [
      { say: 'Hopp! Ich bin <b>Plopbun</b> und werfe für mein Leben gern Steine ein – plopp! Lass uns an diesem Holzturm gemeinsam die Regeln von <b>Vier gewinnt</b> lernen!' },
      { say: 'Der Turm hat <b>7 Spalten und 6 Reihen</b>. Wähl eine Spalte, und dein Stein fällt bis zum <b>untersten freien Platz</b>. Einfach irgendwo hinlegen geht nicht. Wirf einen Stein in die leuchtende Spalte!', done: 'Plopp! Er ist ganz nach unten gefallen und liegt jetzt auf dem Stein darunter.' },
      { say: '<b>Gold</b> (du) fängt an, dann kommt <b>Silber</b>. Ihr seid <b>abwechselnd mit je einem Stein</b> dran (je 21). Wirf 3-mal in Spalten deiner Wahl! Silber wirft jedes Mal zurück.', done: 'So abwechselnd stapeln sich die Steine von unten nach oben.' },
      { say: 'Bring <b>vier Steine deiner Farbe in eine gerade Reihe</b>, und du hast sofort <b>gewonnen</b>! Zuerst <b>waagerecht</b>. Leg vier goldene Steine nebeneinander!', done: 'Vier waagerecht! Gewonnen!' },
      { say: 'Vier <b>übereinander</b> in einer Spalte gewinnen auch! Mach vier goldene senkrecht.', done: 'Vier senkrecht! Wieder gewonnen!' },
      { say: 'Auch vier <b>diagonal</b> zählen. Die Steine fallen nach unten, also such einen Platz, der <b>auf einer Stufe aufliegt</b>. Mach vier diagonal!', done: 'Vier diagonal! Diese Reihe sieht man am schwersten. Gut gefunden!' },
      { say: 'Hat der Gegner drei in einer Reihe und der vierte Platz ist frei, wird’s brenzlig! <b>Wirf deinen Stein zuerst dort hinein</b> und blockier ihn. Halte Silber vom Sieg ab!', done: 'Starker Block! Jetzt kann Silber dort keine vier mehr schaffen.' },
      { say: 'Sind in einer Spalte alle 6 Reihen voll, passt nichts mehr hinein. Die rote Spalte ist <b>voll</b>. Wirf deinen Stein in eine andere Spalte!', done: 'In jede andere Spalte passt er noch.' },
      { say: 'Sind <b>alle 42 Plätze</b> voll und niemand hat vier in einer Reihe, ist es <b>unentschieden</b>. Silber ist dran, und es ist nur noch ein Platz frei. Wirf den allerletzten Stein ein!', done: 'Der Turm ist voll, und keiner hat vier in einer Reihe. Unentschieden.' },
      { say: 'Jetzt kennst du alle Regeln! Geh auf deine vier und behalt die Dreier des Gegners im Auge. Auf zur ersten Partie!' },
    ] },
    hi: { name: 'प्लॉपबन', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'किसी कॉलम पर टैप करो', nope: 'चमकता हुआ कॉलम चुनो', full: 'वह कॉलम पहले से भरा है', ng4: 'वहाँ चार नहीं बनते। फिर से कोशिश करो!', ngBlk: 'अरे, चाँदी ने चार बना लिए! देखो चाँदी की तीन की लाइन कहाँ जा रही है, और फिर कोशिश करो।', win: '🏆 जीत!', draw: '🤝 ड्रॉ', block: '🛡 रोक दिया!', s: [
      { say: 'फुदक! मैं हूँ <b>प्लॉपबन</b>, और मुझे गोटियाँ टप्प से गिराना बहुत पसंद है। चलो, इस लकड़ी के टावर पर साथ मिलकर <b>कनेक्ट फ़ोर</b> के नियम सीखें!' },
      { say: 'टावर में <b>7 कॉलम और 6 पंक्तियाँ</b> हैं। कोई कॉलम चुनो, और गोटी <b>सबसे नीचे की ख़ाली जगह</b> तक गिर जाती है। मनचाहे खाने में सीधे नहीं रख सकते। चमकते कॉलम में एक गोटी गिराओ!', done: 'टप्प! वह नीचे तक गिरकर नीचे वाली गोटी के ऊपर टिक गई।' },
      { say: 'पहले <b>सुनहरा</b> (तुम), फिर <b>चाँदी</b>। <b>बारी-बारी से एक-एक गोटी</b> डालते हैं (दोनों की 21-21)। अपनी पसंद के कॉलमों में 3 बार गोटी डालो! चाँदी भी जवाब में डालेगी।', done: 'ऐसे बारी-बारी डालने से गोटियाँ नीचे से ऊपर जमती जाती हैं।' },
      { say: 'अपने रंग की <b>चार गोटियाँ एक सीधी लाइन में</b> हो जाएँ, तो उसी पल तुम <b>जीत</b> जाते हो! पहले <b>आड़ी</b> लाइन। चार सुनहरी गोटियाँ अगल-बगल लगाओ!', done: 'आड़ी चार! जीत गए!' },
      { say: 'एक ही कॉलम में <b>ऊपर-नीचे चार</b> जमा दो, तो भी जीत! चार सुनहरी गोटियाँ खड़ी लाइन में लगाओ।', done: 'खड़ी चार! फिर से जीत!' },
      { say: '<b>तिरछी</b> चार भी जीत है। गोटियाँ नीचे गिरती हैं, इसलिए तरकीब है ऐसी जगह ढूँढना जो <b>सीढ़ी के ऊपर टिके</b>। तिरछी चार बनाओ!', done: 'तिरछी चार! यह सबसे मुश्किल से दिखने वाली लाइन है। शाबाश!' },
      { say: 'जब विरोधी की तीन एक लाइन में हों और चौथी जगह भरी जा सके, तो ख़तरा है! <b>पहले अपनी गोटी वहाँ डालकर</b> रास्ता रोक दो। चाँदी को जीतने से रोको!', done: 'बढ़िया रोक! अब चाँदी वहाँ चार नहीं बना सकती।' },
      { say: 'जिस कॉलम की सारी 6 पंक्तियाँ भर गईं, उसमें अब कुछ नहीं जाता। लाल कॉलम <b>भरा हुआ</b> है। अपनी गोटी किसी और कॉलम में गिराओ!', done: 'किसी और कॉलम में तो आराम से चली जाती है।' },
      { say: 'अगर <b>सारी 42 जगहें</b> भर जाएँ और किसी की चार न बनें, तो <b>ड्रॉ</b> होता है। अभी चाँदी की बारी है और सिर्फ़ एक जगह बची है। आख़िरी गोटी डालो!', done: 'बोर्ड भर गया, पर कोई चार नहीं बनी। ड्रॉ है।' },
      { say: 'अब तुम सारे नियम जान गए! अपनी चार पर नज़र रखो और विरोधी की तीन पर भी। चलो, एक बाज़ी खेलें!' },
    ] },
    ar: { name: 'بلوب بن', next: 'التالي', back: 'رجوع', start: 'هيا نلعب', again: 'مرة أخرى', tap: 'انقر على عمود', nope: 'اختر العمود المضيء', full: 'هذا العمود ممتلئ بالفعل', ng4: 'هنا لا تكتمل أربع. حاول مرة أخرى!', ngBlk: 'أوه لا، صنع الفضي أربعًا! انظر إلى أين يتجه صف الثلاث الفضي وحاول مرة أخرى.', win: '🏆 فزت!', draw: '🤝 تعادل', block: '🛡 تم السد!', s: [
      { say: 'هوب! أنا <b>بلوب بن</b>، وأحب كثيرًا إسقاط القطع… بلوب! هيا نتعلم معًا قواعد <b>أربعة في صف</b> (Connect Four) على هذا البرج الخشبي!' },
      { say: 'في البرج <b>7 أعمدة و6 صفوف</b>. اختر عمودًا فتسقط القطعة إلى <b>أدنى مكان فارغ</b> فيه. لا يمكنك وضعها حيث تشاء. أسقط قطعة في العمود المضيء!', done: 'بلوب! سقطت إلى الأسفل واستقرت فوق القطعة التي تحتها.' },
      { say: 'يبدأ <b>الذهبي</b> (أنت) ثم <b>الفضي</b>. تتناوبان <b>بقطعة واحدة في كل مرة</b> (21 لكل منكما). أسقط قطعًا 3 مرات في الأعمدة التي تريدها! وسيرد الفضي.', done: 'بالتناوب هكذا تتكدس القطع من الأسفل إلى الأعلى.' },
      { say: 'إذا صففت <b>أربع قطع من لونك في خط مستقيم</b> <b>فزت</b> فورًا! أولًا <b>أفقيًا</b>. ضع أربع قطع ذهبية متجاورة!', done: 'أربع أفقيًا! فزت!' },
      { say: 'أربع <b>فوق بعضها</b> في عمود واحد تفوز أيضًا! اصنع أربعًا ذهبية عموديًا.', done: 'أربع عموديًا! فوز آخر!' },
      { say: 'الأربع <b>القطرية</b> تفوز كذلك. القطع تسقط للأسفل، فالحيلة أن تجد مكانًا <b>يستقر فوق درجة</b>. اصنع أربعًا قطريًا!', done: 'أربع قطريًا! إنه أصعب صف يمكن ملاحظته. أحسنت!' },
      { say: 'إذا كان لدى خصمك ثلاث في صف والمكان الرابع متاح، فانتبه! <b>ضع قطعتك هناك أولًا</b> لتسدّه. امنع الفضي من الفوز!', done: 'سدّ رائع! لم يعد الفضي قادرًا على صنع أربع هناك.' },
      { say: 'عندما تمتلئ صفوف العمود الستة كلها، لا يدخله شيء بعد ذلك. العمود الأحمر <b>ممتلئ</b>. أسقط قطعتك في عمود آخر!', done: 'في أي عمود آخر ستدخل بلا مشكلة.' },
      { say: 'إذا امتلأت <b>الأماكن الـ42 كلها</b> ولم يصنع أحد أربعًا في صف، فالنتيجة <b>تعادل</b>. الدور للفضي ولم يبقَ إلا مكان واحد. أسقط القطعة الأخيرة!', done: 'امتلأ البرج ولا توجد أربع في صف. إنه تعادل.' },
      { say: 'صرت تعرف كل القواعد! اسعَ إلى أربعك وراقب ثلاثيات خصمك. هيا نلعب!' },
    ] },
  };

  const SFX = (() => {   // the guide's voice and a chime (the tiles' own sounds come from c4Set)
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const boo = () => { tone(330, 220, .25, .07, 'triangle'); tone(247, 165, .3, .06, 'triangle', .14); };
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { chime, boo, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const stand = T3.MODELS.connect4(true); T3.show('connect4', stand); T3.play(true);
    const set = T3.c4Set(stand, { sfx: true }), inner = stand.children[0];
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: 9.7, d: 8.2, y: 3.05, pitch: .36 } : { w: 10.2, d: 7.4, y: 3.2, pitch: .34 });   // the tower seen from the front, a little from above
    let g = null, step = 0, stopped = false, busy = false, played = false, drops = 0, hover = -1, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };

    /* ---------- marks: the glowing column (the tiles' hint), a red full column, the ghost tile on hover ---------- */
    const own = new TH.Group(); inner.add(own);
    function redCol(c) {
      while (own.children.length) { const m = own.children[0]; own.remove(m); m.geometry.dispose(); m.material.dispose(); }
      if (c == null) { kick(); return; }
      const PY = set.rowY(1) - set.rowY(0), h = set.TOPY - set.rowY(0) + PY * .5;
      const m = new TH.Mesh(new TH.PlaneGeometry(.9, h), new TH.MeshBasicMaterial({ color: 0xff3b2b, transparent: true, opacity: .32, toneMapped: false, depthWrite: false }));
      m.position.set(set.colX(c), set.rowY(0) - PY * .5 + h / 2, .13 + .03); m.renderOrder = 3; own.add(m); kick(200);
    }
    function marks() {
      const st = STEPS[step], o = {};
      if (st.col != null && !played) o.hint = st.col;
      if (st.act && !played && !busy && hover >= 0 && g[hover].length < ROWS) o.ghost = { c: hover, p: toMove(g) };
      set.marks(o);
    }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・〜~…]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const tip = h => { $('.cnt').innerHTML = `<span class="tag">${h}</span>`; };
    function buttons() {
      const st = STEPS[step], wait = st.act && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last) go(step + 1); }, ms); }
    function load(animate) {   // the step's tower: the tiles drop in one after another, from the bottom up
      g = grid(STEPS[step].cols); set.win(null);
      if (!animate) { set.sync(g, null, false); return 0; }
      set.sync(grid(['', '', '', '', '', '', '']), null, false);
      const order = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (r < g[c].length) order.push([c, r]);
      const part = grid(['', '', '', '', '', '', '']), gap = order.length > 20 ? 28 : 70;
      order.forEach(([c, r], i) => later(() => { part[c].push(g[c][r]); set.sync(part.map(x => x.slice()), c + ',' + r, true); }, 120 + i * gap));
      return 120 + order.length * gap + 500;
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; drops = 0;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; $('.cnt').innerHTML = '';
      redCol(null); set.marks({});
      const w = load(true);
      busy = true; later(() => { busy = false; if (st.red != null) redCol(st.red); marks(); }, w);
      say(L.s[step].say); buttons();
    }
    function finish(tag) {
      played = true; busy = false; hover = -1; redCol(null); marks();
      if (L.s[step].done) say(L.s[step].done);
      if (tag) tip(tag);
      if (tag !== L.win) SFX.chime();
      buttons(); autoNext();
    }
    function drop(c, p) { const r = g[c].length; g[c].push(p); return [r, set.sync(g.map(x => x.slice()), c + ',' + r, true)]; }
    function retry(ms) { later(() => { g = grid(STEPS[step].cols); set.win(null); set.sync(g, null, true); busy = false; marks(); }, ms); }
    function onClick(e) {
      if (busy || played || !g || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act) return;
      const c = set.colAt(e.clientX, e.clientY); if (c < 0) return;
      if (g[c].length >= ROWS) { say(L.full); set.knock(0, true); return; }
      if (st.act === 'drop' && c !== st.col) { say(L.nope); return; }
      const p = toMove(g);
      busy = true; hover = -1; set.marks({});
      const [r, w] = drop(c, p), line = lineThrough(g, c, r, p);
      if (st.act === 'drop' || st.act === 'any') { later(() => finish(st.draw && !line ? L.draw : ''), w + 250); return; }
      if (st.act === 'turn') {
        drops++;
        later(() => {   // silver answers next to it (or in the middle)
          const opts = [c, c - 1, c + 1, 3, 2, 4].filter(x => x >= 0 && x < COLS && g[x].length < ROWS);
          const [, w2] = drop(opts[Math.floor(Math.random() * Math.min(3, opts.length))], 2);
          later(() => { if (drops >= 3) finish(''); else { busy = false; marks(); } }, w2 + 150);
        }, w + 380);
        return;
      }
      if (st.act === 'four') {
        if (line) later(() => { set.win(line); later(() => finish(L.win), 900); }, w);
        else later(() => { say(L.ng4); SFX.boo(); retry(1400); }, w + 150);
        return;
      }
      if (st.act === 'block') {
        if (c === st.ans) { later(() => finish(L.block), w + 250); return; }
        later(() => {   // silver plays the fourth and wins
          const [r2, w2] = drop(st.ans, 2), ln = lineThrough(g, st.ans, r2, 2);
          later(() => { if (ln) set.win(ln); say(L.ngBlk); SFX.boo(); retry(2600); }, w2);
        }, w + 380);
      }
    }
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const st = STEPS[step], c = st.act && !played && !busy && g ? set.colAt(e.clientX, e.clientY) : -1;
      if (c !== hover) { hover = c; marks(); }
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    ctx.el.addEventListener('pointermove', onMove);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    try { localStorage.setItem('aicoding-connect4-rules-seen', '1'); } catch (e) {}
    // test hooks
    const colPt = c => { const [x, y] = set.cellXY(c, 3); return T3.project(x, 0, y); };
    const dbg = { col: colPt, step: () => step, steps: STEPS.length, played: () => played, busy: () => busy, go: n => go(n), grid: () => g && g.map(x => x.join('')),
      plan: () => {   // the tap that solves (the next part of) the task
        const st = STEPS[step]; if (!st.act || played || busy || !g) return [];
        let c = -1;
        if (st.act === 'drop' || st.col != null) c = st.col;
        else if (st.act === 'block') c = st.ans;
        else if (st.act === 'four') { for (let x = 0; x < COLS && c < 0; x++) if (g[x].length < ROWS) { const t = g.map(y => y.slice()); t[x].push(1); if (lineThrough(t, x, t[x].length - 1, 1)) c = x; } }
        else c = [0, 1, 5, 6, 2, 4].find(x => g[x].length < ROWS);
        return c < 0 ? [] : [colPt(c)];
      } };
    window.__c4Rules = dbg;
    return {
      stop() { stopped = true; if (window.__c4Rules === dbg) delete window.__c4Rules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove); redCol(null); inner.remove(own); set.dispose(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.connect4 = { start };
})();
