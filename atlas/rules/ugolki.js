/* =====================================================================
   Ugolki rules — a guided tour on the 3D table (the Gzhel porcelain board,
   atlas/models/ugolki.js), told by the guide character (Millowl).
   A short hands-on course on the classic 3×3 game: the board and the houses, a step,
   a jump over your own piece, over the opponent's, a jump chain, bringing the last piece
   home, the last-move equaliser (shown), the move-40 rule, the other games, let's play.
   Every task is checked live by the game's own rules (../ugolki/engine.js); you play White.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Squares in the game's notation ('c2': files a–h from the left, rank 1 at the bottom).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-owl.webp', ENG = '../ugolki/engine.js?v=3';
  const loadEngine = () => window.UgolkiEngine ? Promise.resolve(window.UgolkiEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.UgolkiEngine ? res(window.UgolkiEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const rect = (c0, c1, r0, r1) => { const o = []; for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) o.push('abcdefgh'[c] + r); return o; };
  const WH = rect(0, 2, 1, 3), BH = rect(5, 7, 6, 8);
  // w / b: White's and Black's pieces; act: what the task accepts; glow: soft gold squares; demo: a move shown by itself
  const STEPS = [
    { w: WH, b: BH },
    { w: WH, b: BH, glow: WH.concat(BH) },
    { w: WH, b: BH, act: 'step' },
    { w: ['c2', 'c3', 'b2'], b: BH, act: 'jump', target: ['c4'] },
    { w: ['d4'], b: ['d5', 'g7', 'h8', 'g8', 'h7', 'f8', 'h6'], act: 'jump', target: ['d6'] },
    { w: ['a1', 'a2', 'b3', 'c4', 'd5'], b: BH, act: 'chain', from: 'a1', target: ['e5'], path: ['a1', 'a3', 'c3', 'c5', 'e5'] },
    { w: BH.filter(x => x !== 'f6').concat(['e6']), b: ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'd4'], act: 'goal', target: ['f6'], glow: BH },
    { w: BH, b: WH.filter(x => x !== 'c3').concat(['d3']), demo: ['d3', 'c3'], glow: WH },
    { w: ['a1', 'c4', 'd5', 'e4', 'f5', 'd6', 'e7', 'g6', 'h7'], b: ['f8', 'g8', 'h8', 'e5', 'c6', 'b5', 'c3', 'a4', 'b2'], warn: ['a1'] },
    { w: WH, b: BH, last: true },
  ];

  const TXT = {
    ja: { name: 'モリフク', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないよ〜', stuck: 'その駒は今は動かせないよ', own: '白い駒をタップしてね', wantStep: '今回は1マスだけ進む手をさがしてね', wantJump: '今回はぴょんと跳び越えてみて！', wantTo: '光っているマスをめざしてね', home: 'ゴール！', draw: '引き分け！', s: [
      { say: 'ホー、ホー！ ぼくは<b>モリフク</b>。今日はロシアの子どもたちが大好きな<b>ウゴルキ</b>を、このグジェリ焼きの盤でいっしょに覚えよう！ ウゴルキは「すみっこ」って意味なんだよ。' },
      { say: '白は<b>左下</b>、黒は<b>右上</b>のすみっこ（<b>陣地</b>）に9こずつ。自分の駒を<b>ぜんぶ向かいの陣地へ運んだら勝ち</b>のレースだよ！ 駒を取ることはないから、安心してね。白が先手だよ。' },
      { say: 'まずは基本。駒は<b>たて・よこに1マス</b>進めるよ（ななめはダメ）。白の駒を1つ、となりの空いたマスへ動かしてみて！', done: 'いいね〜！ 1マスずつでも、ちゃんとゴールへ近づいてるよ。' },
      { say: 'となりに駒があって、その向こうが空いていたら、<b>ぴょんと跳び越えて</b>2マス進めるんだ。<b>自分の駒も踏み台</b>にできるよ。光っている駒で、となりの駒を跳び越えてみて！', done: 'ぴょーん！ 跳び越えた駒はそのまま残るよ。' },
      { say: '<b>相手の駒も踏み台にできる</b>よ！ 取ったりはしないから、どんどん利用しちゃおう。光っている駒で黒を跳び越えて、光っているマスへ！', done: 'ナイスジャンプ！ 相手の駒だって、いい踏み台なんだ。' },
      { say: '跳んだ先からまた跳べるなら、<b>何回でも続けて跳べる</b>よ（<b>連続ジャンプ</b>）！ 光っている駒で、光っているマスまでいっきに跳んでいこう！', done: 'ぴょんぴょんぴょんぴょーん！ 1手で一気に4回ジャンプしたね。ウゴルキはこの<b>跳び道づくり</b>がカギなんだ。' },
      { say: 'さあ、最後の1こ！ <b>9こ全部</b>が向かいの陣地に入ったらゴールだよ。白の最後の駒を光っているマスへ入れてあげて！', done: 'ゴール〜！ ぜんぶ運び込めたね！' },
      { say: 'でもね、<b>先手の白が先にゴールしても、黒にはあと1手だけチャンス</b>があるんだ。その1手で黒もゴールできたら<b>引き分け</b>！ 見ててね…', done: 'ほら、黒もゴールして引き分け！ 先手と後手が平等になるルールなんだ。' },
      { say: 'それから大事なきまり！ <b>40手目</b>になっても<b>自分の陣地に駒が残っている</b>と負けちゃう（この赤いマスの白みたいにね）。陣地にこもって相手のジャマをするのは禁止なんだ。' },
      { say: '対局設定では、陣地が<b>3×4・4×4</b>の大きいゲームや、<b>ななめにも動ける</b>ゲームも選べるよ。ほかに80手で決着しないときは、陣地に入った駒の数で勝負！ さあ、遊んでみよう〜！' },
    ] },
    en: { name: 'Millowl', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't go there!", stuck: "That piece can't move right now", own: 'Tap a white piece', wantStep: 'This time, find a move of just one square', wantJump: 'This time, try a hop over a piece!', wantTo: 'Aim for the glowing square', home: 'Home!', draw: 'Draw!', s: [
      { say: "Hoo-hoo! I'm <b>Millowl</b>. Let's learn <b>Ugolki</b>, a favourite of Russian kids, together on this Gzhel porcelain board! <b>Ugolki</b> means \"little corners\"." },
      { say: 'White has 9 pieces in the <b>bottom-left</b> corner, Black in the <b>top-right</b> (the <b>houses</b>). It is a race: <b>move all your pieces into the opposite house</b> to win! Nothing is ever captured, so relax. White moves first.' },
      { say: 'First the basics: a piece steps <b>one square up, down or sideways</b> (no diagonals). Move one white piece to an empty square next to it!', done: "Nice! One square at a time still gets you closer to home." },
      { say: 'If a neighbouring square holds a piece and the square beyond is empty, you can <b>hop over it</b>, two squares. <b>Your own pieces work as stepping stones</b> too. Hop the glowing piece over its neighbour!', done: 'Boing! The piece you hopped over stays where it was.' },
      { say: "<b>The opponent's pieces are stepping stones too!</b> Nothing gets captured, so use them as much as you like. Hop the glowing piece over Black to the glowing square!", done: "Nice jump! Your opponent's pieces make great stepping stones." },
      { say: 'If you can hop again from where you land, <b>keep hopping as many times as you like</b> (a <b>jump chain</b>)! Take the glowing piece all the way to the glowing square!', done: 'Boing boing boing boing! Four hops in one move. In Ugolki, <b>building jump roads</b> is the key.' },
      { say: 'Now the very last one! You finish when <b>all 9</b> pieces are in the opposite house. Bring White’s last piece onto the glowing square!', done: 'Home! Every piece made it!' },
      { say: 'But here’s the thing: even when <b>White (who moves first) gets home first, Black still has one more move</b>. If Black finishes with it, it’s a <b>draw</b>! Watch…', done: 'See? Black made it too, so it’s a draw. That keeps first and second player fair.' },
      { say: 'One more important rule! If you still have <b>a piece in your own house at move 40</b>, you lose (like the white piece on the red square). Hiding at home to block your opponent is not allowed!' },
      { say: 'In the new-game settings you can also pick bigger houses (<b>3×4, 4×4</b>) or a game where pieces <b>move diagonally too</b>. If nobody finishes by move 80, the pieces already home decide it. Now, let’s play!' },
    ] },
    zh: { name: '方阵猫头鹰', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里走不了哦～', stuck: '这枚棋子现在走不了哦', own: '请点击白色的棋子', wantStep: '这次请找只走一格的走法', wantJump: '这次试着跳过去吧！', wantTo: '目标是发光的格子哦', home: '到家啦！', draw: '和棋！', s: [
      { say: '咕咕！我是<b>方阵猫头鹰</b>。今天在这块格热利瓷棋盘上，一起学俄罗斯小朋友最爱的<b>角棋（Ugolki）</b>吧！Ugolki 的意思是“小角落”哦。' },
      { say: '白棋在<b>左下角</b>，黑棋在<b>右上角</b>（叫作<b>营地</b>），各9枚。把自己的棋子<b>全部搬进对面的营地</b>就赢了，是一场赛跑！不会吃子，放心玩吧。白方先走。' },
      { say: '先学基础：棋子可以<b>上下左右走一格</b>（不能斜走）。把一枚白棋走到旁边的空格试试！', desc: '', done: '很好～！一格一格走，也在慢慢靠近终点哦。' },
      { say: '旁边有棋子、它后面又是空格时，就能<b>跳过去</b>前进两格。<b>自己的棋子也能当跳板</b>！用发光的棋子跳过旁边的棋子试试！', done: '啵～！被跳过的棋子会留在原地。' },
      { say: '<b>对方的棋子也能当跳板</b>！又不会被吃掉，尽情利用吧。用发光的棋子跳过黑棋，落到发光的格子！', done: '漂亮的一跳！对方的棋子也是好跳板。' },
      { say: '落地后还能再跳的话，<b>可以一直连续跳</b>（<b>连跳</b>）！用发光的棋子一口气跳到发光的格子吧！', done: '啵啵啵啵！一步里连跳了4次。角棋的关键就是<b>搭好跳路</b>。' },
      { say: '最后一枚啦！<b>9枚全部</b>进入对面营地就到终点。把白方最后一枚棋子送进发光的格子吧！', done: '到家啦！全部搬完了！' },
      { say: '不过呢，<b>先走的白方先到家，黑方还有最后一步机会</b>。如果黑方这一步也能完成，就是<b>和棋</b>！看好啦…', done: '你看，黑方也到家了，是和棋！这条规则让先手后手更公平。' },
      { say: '还有一条重要规则！到了<b>第40手</b>，<b>自己营地里还留着棋子</b>就会输（就像红格上的白棋那样）。不能躲在家里挡住对手哦！' },
      { say: '在对局设置里，还能选更大的营地（<b>3×4、4×4</b>），或者<b>也能斜走</b>的玩法。到第80手还没分出胜负时，按进入营地的棋子数决胜。来，开始玩吧～！' },
    ] },
    ko: { name: '모리후쿠', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기로는 못 가요~', stuck: '그 말은 지금 못 움직여요', own: '흰 말을 탭해요', wantStep: '이번엔 한 칸만 가는 수를 찾아봐요', wantJump: '이번엔 폴짝 뛰어넘어 봐요!', wantTo: '빛나는 칸을 노려요', home: '골인!', draw: '무승부!', s: [
      { say: '부엉부엉! 나는 <b>모리후쿠</b>. 오늘은 러시아 아이들이 정말 좋아하는 <b>우골키</b>를 이 그젤 도자기 판에서 같이 배워 보자! 우골키는 "구석"이라는 뜻이야.' },
      { say: '백은 <b>왼쪽 아래</b>, 흑은 <b>오른쪽 위</b> 구석(<b>진지</b>)에 9개씩. 자기 말을 <b>전부 맞은편 진지로 옮기면 이기는</b> 레이스야! 말을 잡는 일은 없으니 안심해. 백이 먼저 둬.' },
      { say: '먼저 기본! 말은 <b>위아래·옆으로 한 칸</b> 움직여(대각선은 안 돼). 백 말 하나를 옆의 빈칸으로 움직여 봐!', done: '좋아~! 한 칸씩이라도 골에 가까워지고 있어.' },
      { say: '옆에 말이 있고 그 너머가 비어 있으면 <b>폴짝 뛰어넘어</b> 두 칸 갈 수 있어. <b>내 말도 발판</b>이 돼! 빛나는 말로 옆의 말을 뛰어넘어 봐!', done: '폴짝! 뛰어넘은 말은 그대로 남아.' },
      { say: '<b>상대 말도 발판으로 쓸 수 있어</b>! 잡는 게 아니니까 마음껏 이용하자. 빛나는 말로 흑을 뛰어넘어 빛나는 칸으로!', done: '나이스 점프! 상대 말도 좋은 발판이야.' },
      { say: '착지한 곳에서 또 뛸 수 있으면 <b>몇 번이고 계속 뛸 수 있어</b>(<b>연속 점프</b>)! 빛나는 말로 빛나는 칸까지 단숨에 가 보자!', done: '폴짝폴짝폴짝폴짝! 한 수에 4번 점프했네. 우골키는 이 <b>점프 길 만들기</b>가 핵심이야.' },
      { say: '자, 마지막 하나! <b>9개 전부</b> 맞은편 진지에 들어가면 골인이야. 백의 마지막 말을 빛나는 칸에 넣어 줘!', done: '골인~! 다 옮겼어!' },
      { say: '그런데 말이야, <b>먼저 두는 백이 먼저 골인해도 흑에게는 딱 한 수의 기회</b>가 있어. 그 한 수로 흑도 골인하면 <b>무승부</b>! 잘 봐…', done: '봐, 흑도 골인해서 무승부! 선공과 후공을 공평하게 해 주는 규칙이야.' },
      { say: '그리고 중요한 규칙! <b>40수째</b>가 되어도 <b>자기 진지에 말이 남아 있으면</b> 져(빨간 칸의 백처럼). 진지에 틀어박혀 방해하는 건 금지야!' },
      { say: '대국 설정에서는 진지가 <b>3×4·4×4</b>인 큰 게임이나 <b>대각선으로도 움직이는</b> 게임도 고를 수 있어. 80수까지 결판이 안 나면 진지에 들어간 말 수로 승부! 자, 놀아 보자~!' },
    ] },
    es: { name: 'Millowl', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡Ahí no puede ir!', stuck: 'Esa pieza no puede moverse ahora', own: 'Toca una pieza blanca', wantStep: 'Esta vez, busca una jugada de una sola casilla', wantJump: '¡Esta vez, prueba un salto!', wantTo: 'Apunta a la casilla que brilla', home: '¡En casa!', draw: '¡Tablas!', s: [
      { say: '¡Uh-uh! Soy <b>Millowl</b>. ¡Aprendamos juntos <b>Ugolki</b>, el favorito de los niños rusos, en este tablero de porcelana de Gzhel! <b>Ugolki</b> significa "esquinitas".' },
      { say: 'Las blancas tienen 9 piezas en la esquina de <b>abajo a la izquierda</b> y las negras <b>arriba a la derecha</b> (las <b>casas</b>). Es una carrera: ¡gana quien <b>lleve todas sus piezas a la casa contraria</b>! Nunca se captura nada, tranquilo. Empiezan las blancas.' },
      { say: 'Lo básico: una pieza avanza <b>una casilla arriba, abajo o a los lados</b> (nada de diagonales). ¡Mueve una pieza blanca a una casilla vacía de al lado!', done: '¡Bien! Paso a paso también te acercas a casa.' },
      { say: 'Si hay una pieza al lado y la casilla de detrás está vacía, puedes <b>saltarla</b> y avanzar dos casillas. ¡<b>Tus propias piezas también sirven de trampolín</b>! ¡Salta con la pieza que brilla por encima de su vecina!', done: '¡Boing! La pieza saltada se queda donde estaba.' },
      { say: '¡<b>Las piezas del rival también son trampolines</b>! Nadie se captura, así que úsalas todo lo que quieras. ¡Salta con la pieza que brilla por encima de la negra hasta la casilla que brilla!', done: '¡Buen salto! Las piezas rivales son trampolines geniales.' },
      { say: 'Si desde donde caes puedes volver a saltar, <b>sigue saltando todas las veces que quieras</b> (una <b>cadena de saltos</b>). ¡Lleva la pieza que brilla hasta la casilla que brilla!', done: '¡Boing, boing, boing, boing! Cuatro saltos en una jugada. En Ugolki la clave es <b>construir caminos de salto</b>.' },
      { say: '¡Ahora la última! Terminas cuando las <b>9</b> piezas están en la casa contraria. ¡Lleva la última pieza blanca a la casilla que brilla!', done: '¡En casa! ¡Llegaron todas!' },
      { say: 'Pero ojo: aunque <b>las blancas (que empiezan) lleguen primero, las negras tienen una jugada más</b>. ¡Si con ella también terminan, son <b>tablas</b>! Mira…', done: '¿Ves? Las negras también llegaron: tablas. Así es justo para quien empieza y quien sigue.' },
      { say: '¡Otra regla importante! Si en la <b>jugada 40</b> aún tienes <b>una pieza en tu propia casa</b>, pierdes (como la blanca de la casilla roja). ¡No vale esconderse en casa para bloquear!' },
      { say: 'En la ventana de partida también puedes elegir casas más grandes (<b>3×4, 4×4</b>) o un juego en el que las piezas <b>también van en diagonal</b>. Si nadie termina antes de la jugada 80, deciden las piezas que ya llegaron. ¡A jugar!' },
    ] },
    fr: { name: 'Millowl', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Elle ne peut pas aller là !', stuck: 'Cette pièce ne peut pas bouger pour l’instant', own: 'Touche une pièce blanche', wantStep: 'Cette fois, trouve un coup d’une seule case', wantJump: 'Cette fois, essaie un saut !', wantTo: 'Vise la case qui brille', home: 'Arrivé !', draw: 'Nulle !', s: [
      { say: 'Hou-hou ! Moi c’est <b>Millowl</b>. Apprenons ensemble les <b>Ugolki</b>, le jeu chouchou des enfants russes, sur ce plateau en porcelaine de Gjel ! <b>Ugolki</b> veut dire « petits coins ».' },
      { say: 'Les Blancs ont 9 pièces dans le coin <b>en bas à gauche</b>, les Noirs <b>en haut à droite</b> (les <b>maisons</b>). C’est une course : <b>amène toutes tes pièces dans la maison d’en face</b> pour gagner ! On ne prend jamais rien, pas de panique. Les Blancs commencent.' },
      { say: 'D’abord la base : une pièce avance <b>d’une case en haut, en bas ou sur le côté</b> (pas en diagonale). Avance une pièce blanche sur une case vide voisine !', done: 'Super ! Case après case, tu te rapproches de l’arrivée.' },
      { say: 'Si une case voisine est occupée et que celle d’après est vide, tu peux <b>sauter par-dessus</b> et avancer de deux cases. <b>Tes propres pièces servent aussi de tremplin</b> ! Fais sauter la pièce qui brille par-dessus sa voisine !', done: 'Boing ! La pièce sautée reste à sa place.' },
      { say: '<b>Les pièces adverses sont aussi des tremplins</b> ! Personne n’est pris, alors profites-en. Fais sauter la pièce qui brille par-dessus la noire jusqu’à la case qui brille !', done: 'Joli saut ! Les pièces adverses font d’excellents tremplins.' },
      { say: 'Si tu peux encore sauter depuis ta case d’arrivée, <b>continue autant de fois que tu veux</b> (une <b>chaîne de sauts</b>) ! Emmène la pièce qui brille jusqu’à la case qui brille !', done: 'Boing, boing, boing, boing ! Quatre sauts en un coup. Aux Ugolki, tout l’art est de <b>construire des routes de saut</b>.' },
      { say: 'La toute dernière ! Tu as fini quand les <b>9</b> pièces sont dans la maison d’en face. Amène la dernière pièce blanche sur la case qui brille !', done: 'Arrivé ! Toutes les pièces sont rentrées !' },
      { say: 'Mais attention : même si <b>les Blancs (qui commencent) arrivent les premiers, les Noirs ont encore un coup</b>. S’ils terminent avec, c’est <b>nulle</b> ! Regarde…', done: 'Tu vois ? Les Noirs sont arrivés aussi : nulle. C’est juste pour les deux camps.' },
      { say: 'Encore une règle importante ! Si au <b>coup 40</b> il te reste <b>une pièce dans ta propre maison</b>, tu perds (comme la blanche sur la case rouge). Interdit de rester chez soi pour bloquer l’autre !' },
      { say: 'Dans la fenêtre de partie, tu peux aussi choisir des maisons plus grandes (<b>3×4, 4×4</b>) ou un jeu où les pièces <b>vont aussi en diagonale</b>. Si personne n’a fini au coup 80, les pièces déjà arrivées décident. Allez, on joue !' },
    ] },
    pt: { name: 'Millowl', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode ir para lá!', stuck: 'Essa peça não pode se mover agora', own: 'Toque numa peça branca', wantStep: 'Desta vez, ache um lance de uma casa só', wantJump: 'Desta vez, tente um pulo!', wantTo: 'Mire na casa que brilha', home: 'Chegou!', draw: 'Empate!', s: [
      { say: 'Uh-uh! Eu sou o <b>Millowl</b>. Vamos aprender juntos <b>Ugolki</b>, o queridinho das crianças russas, neste tabuleiro de porcelana de Gzhel! <b>Ugolki</b> quer dizer "cantinhos".' },
      { say: 'As brancas têm 9 peças no canto de <b>baixo à esquerda</b>, as pretas <b>em cima à direita</b> (as <b>casas</b>). É uma corrida: vence quem <b>levar todas as peças para a casa oposta</b>! Nada é capturado, fique tranquilo. As brancas começam.' },
      { say: 'O básico: uma peça anda <b>uma casa para cima, para baixo ou para o lado</b> (nada de diagonal). Mova uma peça branca para uma casa vazia vizinha!', done: 'Boa! Uma casa por vez também te leva para perto de casa.' },
      { say: 'Se há uma peça ao lado e a casa de trás está vazia, você pode <b>pular por cima</b> e andar duas casas. <b>Suas próprias peças também servem de trampolim</b>! Pule com a peça que brilha por cima da vizinha!', done: 'Boing! A peça pulada continua onde estava.' },
      { say: '<b>As peças do adversário também são trampolins</b>! Ninguém é capturado, então use à vontade. Pule com a peça que brilha por cima da preta até a casa que brilha!', done: 'Belo pulo! As peças adversárias são ótimos trampolins.' },
      { say: 'Se der para pular de novo de onde você caiu, <b>continue pulando quantas vezes quiser</b> (uma <b>sequência de pulos</b>)! Leve a peça que brilha até a casa que brilha!', done: 'Boing, boing, boing, boing! Quatro pulos num lance. No Ugolki, o segredo é <b>montar caminhos de pulo</b>.' },
      { say: 'Agora a última! Você termina quando as <b>9</b> peças estão na casa oposta. Leve a última peça branca até a casa que brilha!', done: 'Chegou! Todas as peças estão em casa!' },
      { say: 'Mas atenção: mesmo que <b>as brancas (que começam) cheguem primeiro, as pretas ainda têm um lance</b>. Se terminarem com ele, é <b>empate</b>! Olha só…', done: 'Viu? As pretas também chegaram: empate. Assim fica justo para os dois lados.' },
      { say: 'Mais uma regra importante! Se no <b>lance 40</b> você ainda tiver <b>uma peça na sua própria casa</b>, você perde (como a branca na casa vermelha). Não vale ficar em casa só para bloquear!' },
      { say: 'Na janela de partida você também pode escolher casas maiores (<b>3×4, 4×4</b>) ou um jogo em que as peças <b>andam também na diagonal</b>. Se ninguém terminar até o lance 80, decidem as peças que já chegaram. Vamos jogar!' },
    ] },
    de: { name: 'Millowl', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dahin geht es nicht!', stuck: 'Dieser Stein kann gerade nicht ziehen', own: 'Tippe einen weißen Stein an', wantStep: 'Diesmal suchst du einen Zug um nur ein Feld', wantJump: 'Diesmal probier einen Sprung!', wantTo: 'Ziel ist das leuchtende Feld', home: 'Angekommen!', draw: 'Remis!', s: [
      { say: 'Schuhu! Ich bin <b>Millowl</b>. Lass uns zusammen <b>Ugolki</b> lernen, das Lieblingsspiel russischer Kinder, auf diesem Gschel-Porzellanbrett! <b>Ugolki</b> heißt „Eckchen“.' },
      { say: 'Weiß hat 9 Steine in der Ecke <b>unten links</b>, Schwarz <b>oben rechts</b> (die <b>Häuser</b>). Es ist ein Rennen: Wer <b>alle Steine ins gegenüberliegende Haus bringt</b>, gewinnt! Geschlagen wird nie, keine Sorge. Weiß beginnt.' },
      { say: 'Zuerst das Wichtigste: Ein Stein zieht <b>ein Feld nach oben, unten oder zur Seite</b> (nicht diagonal). Zieh einen weißen Stein auf ein freies Nachbarfeld!', done: 'Super! Auch Feld für Feld kommst du dem Ziel näher.' },
      { say: 'Steht auf einem Nachbarfeld ein Stein und ist das Feld dahinter frei, kannst du <b>darüber springen</b> und zwei Felder weit kommen. <b>Auch eigene Steine sind Sprungbretter</b>! Spring mit dem leuchtenden Stein über seinen Nachbarn!', done: 'Hopp! Der übersprungene Stein bleibt stehen.' },
      { say: '<b>Auch gegnerische Steine sind Sprungbretter</b>! Geschlagen wird nichts, also nutz sie ruhig. Spring mit dem leuchtenden Stein über den schwarzen auf das leuchtende Feld!', done: 'Toller Sprung! Gegnerische Steine sind prima Sprungbretter.' },
      { say: 'Kannst du vom Landefeld aus wieder springen, <b>spring so oft du willst weiter</b> (eine <b>Sprungkette</b>)! Bring den leuchtenden Stein bis zum leuchtenden Feld!', done: 'Hopp, hopp, hopp, hopp! Vier Sprünge in einem Zug. Bei Ugolki kommt es aufs <b>Bauen von Sprungwegen</b> an.' },
      { say: 'Jetzt der allerletzte! Fertig bist du, wenn <b>alle 9</b> Steine im gegenüberliegenden Haus stehen. Bring den letzten weißen Stein auf das leuchtende Feld!', done: 'Angekommen! Alle Steine sind im Ziel!' },
      { say: 'Aber Achtung: Auch wenn <b>Weiß (das beginnt) zuerst fertig ist, hat Schwarz noch einen Zug</b>. Schafft Schwarz es damit auch, ist es <b>remis</b>! Schau mal…', done: 'Siehst du? Schwarz ist auch angekommen: remis. So ist es für beide Seiten fair.' },
      { say: 'Noch eine wichtige Regel! Steht bei <b>Zug 40</b> noch <b>ein Stein im eigenen Haus</b>, verlierst du (wie der weiße auf dem roten Feld). Sich zu Hause verschanzen, um zu blockieren, ist verboten!' },
      { say: 'Im Partie-Dialog kannst du auch größere Häuser (<b>3×4, 4×4</b>) wählen oder ein Spiel, in dem die Steine <b>auch diagonal ziehen</b>. Ist bis Zug 80 niemand fertig, entscheiden die Steine im Ziel. Los, spielen wir!' },
    ] },
    hi: { name: 'मिलआउल', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'वहाँ नहीं जा सकते!', stuck: 'यह गोटी अभी नहीं चल सकती', own: 'कोई सफ़ेद गोटी टैप करो', wantStep: 'इस बार सिर्फ़ एक खाने वाली चाल ढूँढो', wantJump: 'इस बार छलांग लगाकर देखो!', wantTo: 'चमकते खाने तक पहुँचो', home: 'पहुँच गए!', draw: 'ड्रॉ!', s: [
      { say: 'हू-हू! मैं हूँ <b>मिलआउल</b>। आज इस ग्ज़ेल पोर्सिलेन बोर्ड पर रूसी बच्चों का पसंदीदा खेल <b>उगोल्की</b> साथ में सीखते हैं! <b>उगोल्की</b> का मतलब है "छोटे कोने"।' },
      { say: 'सफ़ेद की 9 गोटियाँ <b>नीचे-बाएँ</b> कोने में, काले की <b>ऊपर-दाएँ</b> कोने (<b>घर</b>) में। यह एक दौड़ है: जो <b>अपनी सारी गोटियाँ सामने वाले घर में पहुँचा दे</b>, वही जीते! कुछ भी पकड़ा नहीं जाता, आराम से खेलो। सफ़ेद पहले चलता है।' },
      { say: 'पहले बुनियादी बात: गोटी <b>ऊपर, नीचे या बगल में एक खाना</b> चलती है (तिरछे नहीं)। एक सफ़ेद गोटी को पास के खाली खाने पर चलाओ!', done: 'बढ़िया! एक-एक खाना चलकर भी मंज़िल पास आ रही है।' },
      { say: 'अगर बगल में गोटी हो और उसके पीछे खाना खाली हो, तो <b>उछलकर पार</b> करके दो खाने आगे जा सकते हो। <b>अपनी गोटियाँ भी सीढ़ी</b> बनती हैं! चमकती गोटी से बगल वाली गोटी के ऊपर छलांग लगाओ!', done: 'उछल! जिस गोटी के ऊपर से कूदे, वह वहीं रहती है।' },
      { say: '<b>दुश्मन की गोटियाँ भी सीढ़ी बन सकती हैं</b>! कोई पकड़ा नहीं जाता, तो खूब इस्तेमाल करो। चमकती गोटी से काले के ऊपर कूदकर चमकते खाने पर पहुँचो!', done: 'शानदार छलांग! दुश्मन की गोटियाँ भी बढ़िया सीढ़ी हैं।' },
      { say: 'जहाँ उतरे वहाँ से फिर कूद सकते हो तो <b>जितनी बार चाहो लगातार कूदो</b> (<b>लगातार छलांग</b>)! चमकती गोटी को चमकते खाने तक एक बार में ले चलो!', done: 'उछल-उछल-उछल-उछल! एक चाल में चार छलांगें। उगोल्की में <b>छलांग के रास्ते बनाना</b> ही असली चाबी है।' },
      { say: 'अब आख़िरी गोटी! <b>सारी 9</b> गोटियाँ सामने वाले घर में पहुँचें तो मंज़िल पूरी। सफ़ेद की आख़िरी गोटी को चमकते खाने में पहुँचाओ!', done: 'पहुँच गए! सारी गोटियाँ घर आ गईं!' },
      { say: 'लेकिन ध्यान दो: <b>पहले चलने वाला सफ़ेद पहले पहुँच जाए, तब भी काले को एक और चाल</b> मिलती है। उसी चाल में काला भी पहुँच जाए तो <b>ड्रॉ</b>! देखो…', done: 'देखा? काला भी पहुँच गया, तो ड्रॉ! इससे पहले और बाद वाले खिलाड़ी के साथ बराबरी होती है।' },
      { say: 'एक और ज़रूरी नियम! <b>40वीं चाल</b> तक <b>अपने घर में कोई गोटी बची</b> हो तो हार (लाल खाने वाली सफ़ेद गोटी की तरह)। घर में छिपकर रास्ता रोकना मना है!' },
      { say: 'नए खेल की सेटिंग में बड़े घर (<b>3×4, 4×4</b>) या गोटियाँ <b>तिरछी भी चलें</b> वाला खेल भी चुन सकते हो। 80वीं चाल तक कोई न पहुँचे, तो घर पहुँची गोटियों की गिनती से फ़ैसला। चलो, खेलते हैं!' },
    ] },
    ar: { name: 'ميل أول', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'انقر نقطة متوهجة', nope: 'لا يمكنها الذهاب إلى هناك!', stuck: 'هذه القطعة لا تستطيع الحركة الآن', own: 'انقر قطعة بيضاء', wantStep: 'هذه المرة ابحث عن نقلة بخانة واحدة', wantJump: 'هذه المرة جرّب القفز!', wantTo: 'استهدف الخانة المتوهجة', home: 'وصلت!', draw: 'تعادل!', s: [
      { say: 'هوو هوو! أنا <b>ميل أول</b>. لنتعلّم معًا <b>أوغولكي</b>، لعبة الأطفال المحبوبة في روسيا، على رقعة خزف غجيل هذه! <b>أوغولكي</b> تعني "الزوايا الصغيرة".' },
      { say: 'للأبيض 9 قطع في الزاوية <b>السفلية اليسرى</b>، وللأسود في <b>العلوية اليمنى</b> (<b>البيوت</b>). إنه سباق: يفوز من <b>ينقل كل قطعه إلى البيت المقابل</b>! لا يُأسر شيء أبدًا، فاطمئن. يبدأ الأبيض.' },
      { say: 'أولًا الأساس: تتحرك القطعة <b>خانة واحدة إلى الأعلى أو الأسفل أو الجانب</b> (لا قطريًا). حرّك قطعة بيضاء إلى خانة فارغة مجاورة!', done: 'رائع! حتى خانة بخانة تقترب من البيت.' },
      { say: 'إذا كانت هناك قطعة مجاورة والخانة خلفها فارغة، يمكنك <b>القفز فوقها</b> والتقدم خانتين. <b>قطعك أنت أيضًا تصلح كنقطة ارتكاز</b>! اقفز بالقطعة المتوهجة فوق جارتها!', done: 'بوينغ! القطعة التي قفزت فوقها تبقى مكانها.' },
      { say: '<b>قطع الخصم أيضًا نقاط ارتكاز</b>! لا أحد يُأسر، فاستعملها كما تشاء. اقفز بالقطعة المتوهجة فوق الأسود إلى الخانة المتوهجة!', done: 'قفزة رائعة! قطع الخصم نقاط ارتكاز ممتازة.' },
      { say: 'إذا استطعت القفز مجددًا من مكان هبوطك، <b>تابع القفز كما تشاء</b> (<b>سلسلة قفزات</b>)! خذ القطعة المتوهجة حتى الخانة المتوهجة!', done: 'بوينغ بوينغ بوينغ بوينغ! أربع قفزات في نقلة واحدة. سرّ أوغولكي هو <b>بناء طرق القفز</b>.' },
      { say: 'والآن الأخيرة! تنتهي عندما تكون القطع <b>التسع كلها</b> في البيت المقابل. أدخل آخر قطعة بيضاء إلى الخانة المتوهجة!', done: 'وصلت! كل القطع في البيت!' },
      { say: 'لكن انتبه: حتى لو <b>وصل الأبيض (الذي يبدأ) أولًا، يبقى للأسود نقلة واحدة</b>. إذا أنهى بها أيضًا فهو <b>تعادل</b>! انظر…', done: 'أرأيت؟ وصل الأسود أيضًا: تعادل. هكذا يكون عادلًا للطرفين.' },
      { say: 'قاعدة مهمة أخرى! إذا بقيت لديك <b>قطعة في بيتك عند النقلة 40</b> فإنك تخسر (مثل القطعة البيضاء على الخانة الحمراء). ممنوع الاختباء في البيت لعرقلة الخصم!' },
      { say: 'في إعدادات المباراة يمكنك أيضًا اختيار بيوت أكبر (<b>3×4، 4×4</b>) أو لعبة تتحرك فيها القطع <b>قطريًا أيضًا</b>. وإذا لم ينهِ أحد حتى النقلة 80، تحسم القطع التي وصلت. هيا، لنلعب!' },
    ] },
  };

  /* ---------- little sounds: porcelain clinks, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const clink = () => { tone(2600, 1900, .12, .05, 'triangle'); tone(340, 160, .08, .12); };
    const hop = () => tone(3100, 2500, .08, .035, 'triangle');
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { clink, hop, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.ugolki.board(); T3.show('ugolki', board); T3.play(true);
    const U = board.userData, Y = U.top;
    if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.2, y: Y + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const idx = s => (8 - +s[1]) * 8 + 'abcdefgh'.indexOf(s[0]);
    const xz = i => U.pt(i & 7, i >> 3);
    const specOf = (w, b) => { const a = Array(64).fill('.'); w.forEach(s => { a[idx(s)] = 'w'; }); b.forEach(s => { a[idx(s)] = 'b'; }); return { b: a.join(''), side: 1 }; };

    /* ---------- pieces ---------- */
    function mk(col) { const g = U.piece(col), sh = T3.contact(T3.ugolki.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setBoard() {
      Object.values(pcs).forEach(drop); pcs = {};
      let n = 0;
      for (let i = 0; i < 64; i++) {
        const c = pos.owner(i); if (!c) continue;
        const g = mk(c), [x, z] = xz(i); g.position.set(x, Y, z); pcs[i] = g;
        g.visible = false; const d = 40 + (n++) * 16;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); }); }, d);
      }
      return n;
    }
    function travel(g, path, jump, done) {
      const pts = path.map(xz), legT = jump ? path.slice(1).map(() => 300) : [320], dur = legT.reduce((a, b) => a + b, 0), hopped = legT.map(() => false), h0 = g.userData.h0 || 0;
      anim(dur, k => {
        let r = k * dur, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
        const q = Math.min(1, r / legT[i]), e = jump ? q : io(q), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        if (jump && !hopped[i]) { hopped[i] = true; SFX.hop(); }
        lift(g, Math.max(0, jump ? Math.sin(q * Math.PI) * .65 + (i === 0 ? h0 * (1 - q) : 0) : (h0 + (.3 - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1)));
      }, () => { lift(g, 0); land(g); SFX.clink(); if (done) done(); });
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    function tile(i, color, op = .45, pulse = true) {
      const m = new TH.Mesh(new TH.PlaneGeometry(.94, .94), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .006, z); m.userData.pulse = pulse; m.renderOrder = 2; marks.add(m); return m;
    }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.15, .15, .012, 28), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .9, toneMapped: false, depthWrite: false })); const [x, z] = xz(i); m.position.set(x, Y + .02, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color) { const m = new TH.Mesh(new TH.TorusGeometry(.46, .032, 8, 44), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false, depthWrite: false })); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .05, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.geometry.type !== 'PlaneGeometry') { const s = .88 + k * .24; m.scale.set(s, m.geometry.type === 'TorusGeometry' ? s : 1, s); } m.material.opacity = (m.geometry.type === 'PlaneGeometry' ? .25 : .45) + k * (m.geometry.type === 'PlaneGeometry' ? .3 : .5); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();
    // the moves the task accepts (from the engine)
    function accepted(st) {
      const all = pos.moves();
      if (st.act === 'step') return all.filter(m => !E.isJump(pos, m));
      if (st.act === 'jump') return all.filter(m => E.isJump(pos, m) && st.target.map(idx).includes(E.mTo(m)));
      if (st.act === 'chain') return all.filter(m => E.mFrom(m) === idx(st.from) && E.mTo(m) === idx(st.target[0]));
      if (st.act === 'goal') return all.filter(m => E.mTo(m) === idx(st.target[0]));
      return [];
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      (st.glow || []).forEach(s => tile(idx(s), 0xffc94a, .4));
      (st.warn || []).forEach(s => tile(idx(s), 0xff3b3b, .55));
      if (st.path && !played) st.path.slice(1, -1).forEach(s => dot(idx(s), 0x8fb4ff));
      if (!st.act || played) return;
      if (sel != null) { ring(sel, 0xffc94a); accepted(st).filter(m => E.mFrom(m) === sel).forEach(m => dot(E.mTo(m), 0x2fd17a)); return; }
      new Set(accepted(st).map(E.mFrom)).forEach(f => ring(f, 0x2fd17a));
      (st.target || []).forEach(s => tile(idx(s), 0x2fd17a, .35));
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・〜~]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const tip = h => { $('.cnt').innerHTML = `<span class="tag">${h}</span>`; };
    function buttons() {
      const st = STEPS[step], wait = (st.act || st.demo) && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait && st.act ? L.tap : L.next + ' ▶';
      nx.disabled = !!(wait && st.act); nx.classList.toggle('wait', !!(wait && st.act));
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last) go(step + 1); }, ms); }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; sel = null;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      pos = E.Pos.from(specOf(st.w, st.b));
      if (st.demo) { pos.side = 1; pos.ply = 1; }
      const cnt = setBoard();
      later(showTask, 380 + cnt * 16);
      if (st.demo) later(() => {   // Black's last chance, played by itself
        const [a, b] = st.demo.map(idx), g = pcs[a]; if (!g) return;
        busy = true; delete pcs[a]; pcs[b] = g;
        tile(b, 0x2fd17a, .4);
        travel(g, [a, b], false, () => { busy = false; played = true; clearMarks(); SFX.chime(); tip('🤝 ' + L.draw); if (L.s[step].done) say(L.s[step].done); buttons(); });
      }, 2600 + cnt * 16);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'goal') { tip('🏁 ' + L.home); Object.values(pcs).forEach(g => { if (g.userData.col === 1) anim(700, k => lift(g, Math.sin(k * Math.PI) * .5)); }); }
      buttons(); autoNext();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const c = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      return c < 0 || c > 7 || r < 0 || r > 7 ? -1 : r * 8 + c;
    }
    function liftSel(i, on) { const g = pcs[i]; if (!g) return; const h0 = g.userData.h0 || 0, h1 = on ? .24 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) return;
      const A = accepted(st);
      if (pos.owner(i) === 1) {
        if (sel === i) { liftSel(i, false); sel = null; showTask(); return; }
        if (!A.some(m => E.mFrom(m) === i)) { say(pos.moves().some(m => E.mFrom(m) === i) ? (st.act === 'step' ? L.wantStep : st.act === 'jump' ? L.wantJump : L.wantTo) : L.stuck); return; }
        if (sel != null) liftSel(sel, false);
        sel = i; liftSel(i, true); SFX.clink(); showTask(); return;
      }
      if (sel == null) { say(L.own); return; }
      const m = A.find(x => E.mFrom(x) === sel && E.mTo(x) === i);
      if (m == null) { const any = pos.moves().find(x => E.mFrom(x) === sel && E.mTo(x) === i); say(any != null ? (st.act === 'step' ? L.wantStep : st.act === 'jump' ? L.wantJump : L.wantTo) : L.nope); return; }
      busy = true; clearMarks();
      const g = pcs[sel], path = E.path(pos, m), jump = E.isJump(pos, m);
      delete pcs[sel]; pcs[i] = g; pos.play(m); sel = null;
      travel(g, path, jump, () => later(finish, 200));
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('c33'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-ugolki-rules-seen', '1'); } catch (e) {}
    const dbg = { marks: () => marks.children.length, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(m => E.name(pos, m)) : null, sel: () => sel, at: s => { const [x, z] = xz(idx(s)); return T3.project(x, z, Y); }, step: () => step, steps: STEPS.length, played: () => played, go: n => go(n) };
    window.__ugRules = dbg;
    return {
      stop() { stopped = true; if (window.__ugRules === dbg) delete window.__ugRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.ugolki = { start };
})();
