/* =====================================================================
   Nine Men's Morris rules — a guided tour on the 3D table (the jeweller's board,
   atlas/models/morris.js, live pieces atlas/games/morris-pieces.js), told by the
   guide character (Millowl). The same lessons as the full game's hands-on rules
   (morris/index.html TOUR_PAGES.nine), in friendlier words: the board, placing,
   a mill takes a piece, pieces in a mill are safe, moving, flying with three,
   two ways to win, draws, let's play.
   Every task is checked live by the game's own rules (../morris/engine.js, the
   standard 'nine' rule the table plays); you play gold (moves first).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Points in the game's notation ('a7' top-left … 'g1' bottom-right).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-owl.webp', ENG = '../morris/engine.js?v=20261108pf1', RULE = 'nine';
  const loadEngine = () => window.MorrisEngine ? Promise.resolve(window.MorrisEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.MorrisEngine ? res(window.MorrisEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const NONE = 31, mFrom = m => m & 31, mTo = m => (m >> 5) & 31, mRm = m => (m >> 10) & 31;
  // gold / silver on the board, h: pieces in hand [gold, silver]; act: what the task accepts
  const STEPS = [
    { gold: [], silver: [], h: [9, 9] },
    { gold: [], silver: [], h: [9, 9], glow: 'all' },
    { gold: [], silver: [], h: [9, 9], act: 'place' },
    { gold: ['a7', 'd7'], silver: ['d6', 'b4', 'f2'], h: [7, 6], act: 'mill' },
    { gold: ['a1', 'd1', 'b4'], silver: ['a7', 'd7', 'g7', 'd5'], h: [6, 5], act: 'mill', safe: ['a7', 'd7', 'g7'] },
    { gold: ['a7', 'd7', 'g4', 'b2'], silver: ['d6', 'b4', 'f2', 'd2'], h: [0, 0], act: 'mill' },
    { gold: ['a7', 'd7', 'b2'], silver: ['d6', 'b4', 'f2', 'd2', 'f6'], h: [0, 0], act: 'mill' },
    { gold: ['a7', 'd7', 'g4', 'b2'], silver: ['d5', 'f2', 'b4'], h: [0, 0], act: 'win' },
    { gold: ['d7', 'a4', 'g4', 'd2'], silver: ['a7', 'g7', 'a1', 'g1'], h: [0, 0], act: 'win' },
    { gold: ['d6', 'b4'], silver: ['f4', 'd2'], h: [0, 0] },
    { gold: [], silver: [], h: [9, 9], last: true },
  ];

  const TXT = {
    ja: { name: 'モリフク', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', own: '金の駒をタップしてね', empty: 'そこにはもう駒があるよ', cantMv: 'そこへは動かせないよ。線でつながった、となりの点だけなんだ', stuck: 'その駒は今は動けないよ', rm: '<b>ミル！</b> 取る銀をタップしてね', safe: 'ミルの中の駒は取れないよ〜。ほかの銀をえらんでね', want: 'ミルになる手をさがしてね。光っている所がヒントだよ', wantWin: 'それだとまだ勝てないよ。もう一回！', mill: '✨ ミル！', win: '🏆 勝ち！', s: [
      { say: 'ホー…むにゃむにゃ。ぼくは<b>モリフク</b>。3つならぶと目がさめるんだ！ 今日はこの宝石箱みたいな盤で、<b>ナイン・メンズ・モリス</b>をいっしょに覚えよう。' },
      { say: '盤には<b>24この点</b>があって、3つの四角と線でつながっているよ。駒は点の上に置くんだ。手持ちは<b>9こずつ</b>（右の金がきみ、左の銀が相手）。金が先手だよ。' },
      { say: 'はじめは<b>置く時間</b>。交互に1こずつ、<b>空いている点</b>に置いていくよ。好きな点をタップして、金を3こ置いてみて！ 銀も交互に置くからね。', done: 'その調子！ 手持ちがなくなるまで、こうして交互に置いていくんだ。' },
      { say: '同じ線の上に自分の駒を<b>3つならべる</b>と「<b>ミル</b>」！ ミルを作るたびに、相手の駒を<b>1こ取れる</b>よ。光っている点に置いてミルを作って、銀を1こ取ってみて！', done: 'ミル〜！ 取った駒は盤から出て、もう戻ってこないよ。' },
      { say: 'ちょっと注意。相手の<b>ミルの中の駒</b>は、ほかに取れる駒があるうちは<b>取れない</b>んだ。上の銀3こはミルだから守られてるよ。ミルを作って、取れる銀を取ってみて！', done: '正解！ ミルの中の駒は取られにくいから、守りにもなるんだね。' },
      { say: '全部置き終わったら<b>動かす時間</b>。駒を<b>線にそって、となりの空いた点</b>へ1つ動かすよ。動かしてミルを作っても取れるんだ。光っている金を動かしてミルを作って！', done: 'ミル！ ミルを開いてまた閉じれば、何度でもミルになるよ。' },
      { say: '駒が<b>3こ</b>だけになると、線に関係なく<b>好きな空いた点へ飛べる</b>んだ！ 光っている金を遠くの点へ飛ばして、ミルを作って！', done: 'ひゅーん！ 飛べる駒はどこでもミルを作れるから、少なくなっても油断できないよ。' },
      { say: '勝ち方その1。相手の駒を<b>2こに減らしたら勝ち</b>！ 2こじゃミルを作れないからね。銀は今3こ。ミルを作って勝とう！', done: '勝ち〜！ 銀は2こになったよ。' },
      { say: '勝ち方その2。相手が<b>1こも動かせなくなったら勝ち</b>なんだ。すみっこの銀4こ、あと1か所道をふさげば動けなくなるよ！', done: '銀はどれも動けない！ これも勝ちだよ。' },
      { say: '<b>同じ局面が3回</b>出てきたり、ミルができないまま<b>50手</b>（2人合わせて）続いたら<b>引き分け</b>。こうなる前に、ミルを開け閉めできる形を作れると強いよ。' },
      { say: 'これでルールはばっちり！ 置く・動かす・飛ぶ、3つの時間を楽しんでね。さっそく対局してみよう〜！' },
    ] },
    en: { name: 'Millowl', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', own: 'Tap a gold piece', empty: 'There’s already a piece there', cantMv: 'It can’t go there. Only to the next point along a line', stuck: "That piece can't move right now", rm: '<b>Mill!</b> Tap the silver piece to take', safe: 'Pieces in a mill can’t be taken! Pick another silver one', want: 'Look for a move that makes a mill. The glowing spots are a hint', wantWin: "That doesn't win yet. Try again!", mill: '✨ Mill!', win: '🏆 You win!', s: [
      { say: "Hoo… zzz. I'm <b>Millowl</b>, and I wake up whenever three line up! Let's learn <b>Nine Men's Morris</b> together on this jewel-box board." },
      { say: 'The board has <b>24 points</b>, joined by three squares and the lines between them. Pieces go on the points. Each side has <b>9 pieces</b> in hand (gold on the right is yours, silver on the left is your opponent’s). Gold goes first.' },
      { say: 'First comes <b>placing</b>. Take turns putting one piece at a time on any <b>empty point</b>. Tap points to place 3 gold pieces! Silver will place in between.', done: 'That’s it! You keep taking turns like this until your hands are empty.' },
      { say: 'Get <b>three of yours in a row</b> on one line and you have a <b>mill</b>! Every time you make a mill, you <b>take one</b> of your opponent’s pieces. Place on the glowing point to make a mill, then take a silver piece!', done: 'Mill! A taken piece leaves the board for good.' },
      { say: 'Careful: pieces that sit <b>in a mill</b> are <b>safe</b> while there are other pieces to take. The three silver pieces at the top are a mill. Make your mill and take a silver piece you’re allowed to!', done: 'Right! Pieces in a mill are hard to take, so mills protect too.' },
      { say: 'Once everything is placed, it’s time for <b>moving</b>. Slide one piece <b>along a line to the next empty point</b>. A mill made by moving takes a piece too. Move the glowing gold piece to make a mill!', done: 'Mill! Open a mill and close it again, and it counts every time.' },
      { say: 'When you’re down to <b>3 pieces</b>, you can <b>fly to any empty point</b>, lines or no lines! Fly the glowing gold piece far away to make a mill.', done: 'Whoosh! A flying piece can make a mill anywhere, so even 3 pieces are dangerous.' },
      { say: 'Way to win #1: bring your opponent <b>down to 2 pieces</b>! You can’t make a mill with two. Silver has 3 now. Make a mill and win!', done: 'You win! Silver is down to 2.' },
      { say: 'Way to win #2: a player who <b>can’t move any piece loses</b>. The four silver pieces in the corners are almost trapped. Block the last way out!', done: 'None of the silver pieces can move. That’s a win too!' },
      { say: 'It’s a <b>draw</b> if the <b>same position appears 3 times</b>, or if <b>50 moves</b> (both players together) go by without a mill. A shape where you can open and close a mill again and again is very strong.' },
      { say: 'Now you know all the rules! Enjoy all three stages: placing, moving and flying. Let’s play a game!' },
    ] },
    zh: { name: '方阵猫头鹰', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', own: '请点击金色的棋子', empty: '那里已经有棋子了', cantMv: '那里走不了哦。只能沿着线走到相邻的点', stuck: '这枚棋子现在走不了哦', rm: '<b>成三！</b>请点击要吃掉的银棋', safe: '成三里的棋子不能吃哦～请选别的银棋', want: '找一找能成三的走法吧，发光的地方是提示', wantWin: '这样还赢不了哦，再试一次！', mill: '✨ 成三！', win: '🏆 赢了！', s: [
      { say: '咕……呼噜噜。我是<b>方阵猫头鹰</b>，三个连成一线我就会醒过来！今天就在这块像珠宝盒一样的棋盘上，一起学<b>九子棋（Nine Men’s Morris）</b>吧。' },
      { say: '棋盘上有<b>24个点</b>，由三个方框和连线连在一起。棋子放在点上。双方手里各有<b>9枚</b>（右边的金棋是你的，左边的银棋是对手的）。金方先走。' },
      { say: '一开始是<b>放子阶段</b>。双方轮流一次放一枚，放在<b>空着的点</b>上。点击喜欢的点，放3枚金棋试试！银棋也会轮流放哦。', done: '就是这样！两边轮流放，直到手里的棋子放完。' },
      { say: '在同一条线上摆出<b>自己的三枚</b>，就叫“<b>成三</b>”！每成一次三，就能<b>吃掉对方一枚</b>棋子。放在发光的点上成三，然后吃掉一枚银棋吧！', done: '成三～！被吃掉的棋子离开棋盘，再也回不来了。' },
      { say: '注意：对方<b>成三里的棋子</b>，只要还有别的棋子可吃，就<b>不能吃</b>。上面那三枚银棋是成三，被保护着。成三后，吃掉能吃的银棋吧！', done: '答对了！成三里的棋子不容易被吃，也能用来防守哦。' },
      { say: '全部放完后就是<b>走子阶段</b>。把一枚棋子<b>沿着线走到相邻的空点</b>。走子成三也能吃子哦。移动发光的金棋来成三吧！', done: '成三！把三打开再合上，就能一次又一次地成三。' },
      { say: '棋子只剩<b>3枚</b>时，就能不管连线，<b>飞到任何空点</b>！把发光的金棋飞到远处，成三吧！', done: '嗖～！会飞的棋子在哪儿都能成三，就算只剩几枚也不能大意。' },
      { say: '赢法一：把对方的棋子<b>减到2枚</b>就赢了！两枚棋子没法成三嘛。银棋现在有3枚，成三取胜吧！', done: '赢啦～！银棋只剩2枚了。' },
      { say: '赢法二：对方<b>一枚棋子都走不动</b>，也是你赢。四个角上的银棋，再堵住最后一条路就动不了了！', done: '银棋一枚都走不动了！这也是赢哦。' },
      { say: '<b>同一局面出现3次</b>，或者双方合计<b>50步</b>都没有成三，就是<b>和棋</b>。能反复开合成三的形状非常厉害哦。' },
      { say: '规则全都学会啦！好好享受放子、走子、飞子这三个阶段吧。马上来下一盘～！' },
    ] },
    ko: { name: '모리후쿠', next: '다음', back: '이전', start: '대국해 보기', again: '한 번 더', tap: '빛나는 곳을 탭하세요', own: '금색 말을 탭해 줘', empty: '거기엔 이미 말이 있어', cantMv: '거기로는 못 가. 선으로 이어진 바로 옆 점만 갈 수 있어', stuck: '그 말은 지금 움직일 수 없어', rm: '<b>밀!</b> 잡을 은색 말을 탭해 줘', safe: '밀 안에 있는 말은 못 잡아~ 다른 은색 말을 골라 줘', want: '밀이 되는 수를 찾아 봐. 빛나는 곳이 힌트야', wantWin: '그걸로는 아직 못 이겨. 다시 해 보자!', mill: '✨ 밀!', win: '🏆 승리!', s: [
      { say: '부엉… 쿨쿨. 나는 <b>모리후쿠</b>. 셋이 나란히 서면 잠에서 깨어나! 오늘은 이 보석함 같은 판에서 <b>나인 멘즈 모리스</b>를 같이 배워 보자.' },
      { say: '판에는 <b>24개의 점</b>이 있고, 사각형 세 개와 선으로 이어져 있어. 말은 점 위에 놓아. 손에 든 말은 <b>9개씩</b>(오른쪽 금색이 너, 왼쪽 은색이 상대). 금이 먼저 둬.' },
      { say: '처음은 <b>놓는 시간</b>이야. 한 개씩 번갈아 <b>비어 있는 점</b>에 놓아. 마음에 드는 점을 탭해서 금색 말 3개를 놓아 봐! 은색도 번갈아 놓을 거야.', done: '좋아! 손에 든 말이 없어질 때까지 이렇게 번갈아 놓는 거야.' },
      { say: '한 선 위에 내 말을 <b>3개 나란히</b> 놓으면 「<b>밀</b>」! 밀을 만들 때마다 상대 말을 <b>1개 잡을 수</b> 있어. 빛나는 점에 놓아서 밀을 만들고, 은색 말 하나를 잡아 봐!', done: '밀~! 잡힌 말은 판에서 나가서 다시는 돌아오지 않아.' },
      { say: '조심! 상대의 <b>밀 안에 있는 말</b>은, 다른 잡을 말이 있는 동안은 <b>못 잡아</b>. 위쪽 은색 3개는 밀이라서 보호받고 있어. 밀을 만들고, 잡을 수 있는 은색 말을 잡아 봐!', done: '정답! 밀 안의 말은 잡히기 어려우니까 수비에도 도움이 돼.' },
      { say: '다 놓고 나면 <b>움직이는 시간</b>이야. 말 하나를 <b>선을 따라 옆의 빈 점</b>으로 옮겨. 움직여서 만든 밀로도 잡을 수 있어. 빛나는 금색 말을 움직여서 밀을 만들어 봐!', done: '밀! 밀을 열었다 다시 닫으면 몇 번이든 밀이 돼.' },
      { say: '말이 <b>3개</b>만 남으면 선과 상관없이 <b>아무 빈 점으로나 날아갈</b> 수 있어! 빛나는 금색 말을 멀리 날려서 밀을 만들어 봐!', done: '휘익~! 날 수 있는 말은 어디서든 밀을 만들 수 있으니까 말이 적어도 방심하면 안 돼.' },
      { say: '이기는 방법 1. 상대 말을 <b>2개로 줄이면 승리</b>! 2개로는 밀을 못 만들거든. 은색은 지금 3개. 밀을 만들어서 이기자!', done: '승리~! 은색은 2개가 됐어.' },
      { say: '이기는 방법 2. 상대가 <b>말을 하나도 못 움직이면 승리</b>야. 구석의 은색 4개, 마지막 길 하나만 막으면 꼼짝 못 해!', done: '은색은 하나도 못 움직여! 이것도 승리야.' },
      { say: '<b>같은 국면이 3번</b> 나오거나, 밀 없이 <b>50수</b>(두 사람 합쳐서)가 이어지면 <b>무승부</b>야. 밀을 열었다 닫았다 할 수 있는 모양을 만들면 아주 강해.' },
      { say: '이제 규칙은 완벽해! 놓기・움직이기・날기, 세 시간을 즐겨 봐. 바로 대국해 보자~!' },
    ] },
    es: { name: 'Millowl', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca un sitio brillante', own: 'Toca una pieza dorada', empty: 'Ahí ya hay una pieza', cantMv: 'Ahí no puede ir. Solo al punto vecino siguiendo una línea', stuck: 'Esa pieza no puede moverse ahora', rm: '<b>¡Molino!</b> Toca la pieza plateada que quieres quitar', safe: '¡Las piezas de un molino no se pueden quitar! Elige otra plateada', want: 'Busca una jugada que forme molino. Los sitios que brillan son una pista', wantWin: 'Así todavía no ganas. ¡Otra vez!', mill: '✨ ¡Molino!', win: '🏆 ¡Ganaste!', s: [
      { say: '¡Uuh… zzz! Soy <b>Millowl</b>, y me despierto cada vez que tres se ponen en fila. ¡Vamos a aprender juntos el <b>Molino</b> (Nine Men’s Morris) en este tablero que parece un joyero!' },
      { say: 'El tablero tiene <b>24 puntos</b>, unidos por tres cuadrados y las líneas que los conectan. Las piezas van sobre los puntos. Cada uno tiene <b>9 piezas</b> en la mano (las doradas de la derecha son tuyas; las plateadas de la izquierda, del rival). Empiezan las doradas.' },
      { say: 'Primero toca <b>colocar</b>. Por turnos, se pone una pieza en cualquier <b>punto libre</b>. ¡Toca puntos para colocar 3 piezas doradas! Las plateadas irán colocando entre medias.', done: '¡Eso es! Se sigue así, por turnos, hasta quedarse sin piezas en la mano.' },
      { say: 'Si pones <b>tres tuyas en fila</b> sobre una línea, haces <b>molino</b>. ¡Cada molino te deja <b>quitar una</b> pieza al rival! Coloca en el punto que brilla para hacer molino y quita una plateada.', done: '¡Molino! La pieza quitada sale del tablero para siempre.' },
      { say: 'Ojo: las piezas que están <b>en un molino</b> están <b>a salvo</b> mientras haya otras que quitar. Las tres plateadas de arriba forman molino. ¡Haz tu molino y quita una plateada que sí se pueda!', done: '¡Correcto! Las piezas de un molino son difíciles de quitar, así que también sirven para defender.' },
      { say: 'Cuando todo está colocado, toca <b>mover</b>. Desliza una pieza <b>por una línea hasta el punto libre de al lado</b>. Un molino hecho moviendo también quita pieza. ¡Mueve la pieza dorada que brilla para hacer molino!', done: '¡Molino! Si abres un molino y lo vuelves a cerrar, cuenta cada vez.' },
      { say: 'Cuando te quedan solo <b>3 piezas</b>, puedes <b>volar a cualquier punto libre</b>, sin seguir las líneas. ¡Haz volar lejos la pieza dorada que brilla y forma molino!', done: '¡Fiuuu! Una pieza que vuela puede hacer molino en cualquier parte, así que hasta 3 piezas son peligrosas.' },
      { say: 'Forma de ganar n.º 1: ¡deja al rival con <b>solo 2 piezas</b>! Con dos no se puede hacer molino. Las plateadas tienen 3. ¡Haz molino y gana!', done: '¡Ganaste! A las plateadas solo les quedan 2.' },
      { say: 'Forma de ganar n.º 2: quien <b>no puede mover ninguna pieza, pierde</b>. Las cuatro plateadas de las esquinas están casi atrapadas. ¡Ciérrales la última salida!', done: 'Ninguna plateada puede moverse. ¡También es victoria!' },
      { say: 'Hay <b>tablas</b> si la <b>misma posición se repite 3 veces</b> o si pasan <b>50 jugadas</b> (de los dos juntos) sin ningún molino. Una forma en la que puedas abrir y cerrar un molino una y otra vez es muy fuerte.' },
      { say: '¡Ya sabes todas las reglas! Disfruta de las tres fases: colocar, mover y volar. ¡A jugar!' },
    ] },
    fr: { name: 'Millowl', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche un endroit qui brille', own: 'Touche une pièce dorée', empty: 'Il y a déjà une pièce ici', cantMv: 'Elle ne peut pas aller là. Seulement au point voisin, le long d’une ligne', stuck: 'Cette pièce ne peut pas bouger pour l’instant', rm: '<b>Moulin !</b> Touche la pièce argentée à prendre', safe: 'On ne peut pas prendre une pièce d’un moulin ! Choisis-en une autre', want: 'Cherche un coup qui fait un moulin. Les endroits qui brillent sont un indice', wantWin: 'Ça ne gagne pas encore. Réessaie !', mill: '✨ Moulin !', win: '🏆 Gagné !', s: [
      { say: 'Hou… zzz. Moi, c’est <b>Millowl</b>, et je me réveille dès que trois pièces s’alignent ! Apprenons ensemble le <b>jeu du moulin</b> (Nine Men’s Morris) sur ce plateau digne d’un coffret à bijoux.' },
      { say: 'Le plateau a <b>24 points</b>, reliés par trois carrés et les lignes qui les joignent. Les pièces se posent sur les points. Chacun a <b>9 pièces</b> en main (les dorées à droite sont à toi, les argentées à gauche à ton adversaire). Les dorées commencent.' },
      { say: 'D’abord, on <b>pose</b>. Chacun à son tour pose une pièce sur un <b>point libre</b>. Touche des points pour poser 3 pièces dorées ! L’argent posera entre-temps.', done: 'C’est ça ! On continue ainsi à tour de rôle jusqu’à ne plus rien avoir en main.' },
      { say: '<b>Trois de tes pièces alignées</b> sur une ligne, c’est un <b>moulin</b> ! À chaque moulin, tu <b>prends une</b> pièce adverse. Pose sur le point qui brille pour faire un moulin, puis prends une pièce argentée !', done: 'Moulin ! Une pièce prise quitte le plateau pour de bon.' },
      { say: 'Attention : les pièces <b>dans un moulin</b> sont <b>protégées</b> tant qu’il y en a d’autres à prendre. Les trois argentées du haut forment un moulin. Fais ton moulin et prends une pièce argentée autorisée !', done: 'Exact ! Les pièces d’un moulin sont dures à prendre : un moulin protège aussi.' },
      { say: 'Quand tout est posé, on <b>déplace</b>. Fais glisser une pièce <b>le long d’une ligne jusqu’au point libre voisin</b>. Un moulin fait en déplaçant prend aussi une pièce. Déplace la pièce dorée qui brille pour faire un moulin !', done: 'Moulin ! Ouvre un moulin puis referme-le : ça compte à chaque fois.' },
      { say: 'Quand il ne te reste que <b>3 pièces</b>, tu peux <b>voler vers n’importe quel point libre</b>, sans suivre les lignes ! Fais voler au loin la pièce dorée qui brille pour faire un moulin.', done: 'Fiouu ! Une pièce qui vole peut faire un moulin n’importe où : même 3 pièces restent dangereuses.' },
      { say: 'Gagner, façon n° 1 : réduis l’adversaire à <b>2 pièces</b> ! Avec deux, impossible de faire un moulin. L’argent en a 3. Fais un moulin et gagne !', done: 'Gagné ! L’argent n’a plus que 2 pièces.' },
      { say: 'Gagner, façon n° 2 : un joueur qui <b>ne peut bouger aucune pièce a perdu</b>. Les quatre argentées dans les coins sont presque coincées. Bouche la dernière sortie !', done: 'Aucune pièce argentée ne peut bouger. C’est gagné aussi !' },
      { say: 'C’est <b>nul</b> si la <b>même position revient 3 fois</b>, ou si <b>50 coups</b> (des deux joueurs ensemble) passent sans moulin. Une forme où tu peux ouvrir et refermer un moulin encore et encore est très forte.' },
      { say: 'Tu connais toutes les règles ! Profite des trois phases : poser, déplacer et voler. On fait une partie ?' },
    ] },
    pt: { name: 'Millowl', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque num lugar brilhante', own: 'Toque numa peça dourada', empty: 'Já tem uma peça aí', cantMv: 'Ela não pode ir aí. Só para o ponto vizinho, seguindo uma linha', stuck: 'Essa peça não pode se mexer agora', rm: '<b>Moinho!</b> Toque na peça prateada para tirar', safe: 'Peças de um moinho não podem ser tiradas! Escolha outra prateada', want: 'Procure um lance que faça moinho. Os lugares que brilham são uma dica', wantWin: 'Assim ainda não ganha. Tente de novo!', mill: '✨ Moinho!', win: '🏆 Vitória!', s: [
      { say: 'Uuu… zzz. Eu sou a <b>Millowl</b> e acordo toda vez que três se alinham! Vamos aprender juntos a <b>Trilha</b> (Nine Men’s Morris) neste tabuleiro que parece uma caixinha de joias.' },
      { say: 'O tabuleiro tem <b>24 pontos</b>, ligados por três quadrados e pelas linhas entre eles. As peças ficam nos pontos. Cada lado tem <b>9 peças</b> na mão (as douradas à direita são suas; as prateadas à esquerda, do adversário). As douradas começam.' },
      { say: 'Primeiro vem a fase de <b>colocar</b>. Cada um, na sua vez, põe uma peça em qualquer <b>ponto vazio</b>. Toque em pontos para colocar 3 peças douradas! As prateadas vão colocando no meio.', done: 'Isso! Vocês continuam assim, alternando, até as mãos ficarem vazias.' },
      { say: 'Com <b>três suas em fila</b> numa linha você faz um <b>moinho</b>! Cada moinho deixa você <b>tirar uma</b> peça do adversário. Coloque no ponto que brilha para fazer moinho e tire uma prateada!', done: 'Moinho! A peça tirada sai do tabuleiro de vez.' },
      { say: 'Cuidado: peças que estão <b>num moinho</b> ficam <b>protegidas</b> enquanto houver outras para tirar. As três prateadas de cima formam um moinho. Faça seu moinho e tire uma prateada que pode!', done: 'Isso! Peças de um moinho são difíceis de tirar, então o moinho também protege.' },
      { say: 'Depois de tudo colocado, é hora de <b>mover</b>. Deslize uma peça <b>pela linha até o ponto vazio vizinho</b>. Moinho feito movendo também tira peça. Mova a peça dourada que brilha para fazer moinho!', done: 'Moinho! Abra o moinho e feche de novo: conta toda vez.' },
      { say: 'Quando sobram só <b>3 peças</b>, você pode <b>voar para qualquer ponto vazio</b>, sem seguir as linhas! Faça a peça dourada que brilha voar para longe e forme um moinho.', done: 'Fiuuu! Uma peça que voa faz moinho em qualquer lugar, então até 3 peças são perigosas.' },
      { say: 'Jeito de ganhar nº 1: deixe o adversário com <b>só 2 peças</b>! Com duas não dá para fazer moinho. As prateadas têm 3. Faça um moinho e ganhe!', done: 'Vitória! As prateadas ficaram com 2.' },
      { say: 'Jeito de ganhar nº 2: quem <b>não consegue mover nenhuma peça perde</b>. As quatro prateadas nos cantos estão quase presas. Feche a última saída!', done: 'Nenhuma prateada consegue se mexer. Também é vitória!' },
      { say: 'É <b>empate</b> se a <b>mesma posição aparecer 3 vezes</b>, ou se passarem <b>50 lances</b> (dos dois juntos) sem nenhum moinho. Uma formação em que você abre e fecha um moinho várias vezes é muito forte.' },
      { say: 'Agora você sabe todas as regras! Aproveite as três fases: colocar, mover e voar. Vamos jogar!' },
    ] },
    de: { name: 'Millowl', next: 'Weiter', back: 'Zurück', start: 'Los geht’s', again: 'Nochmal', tap: 'Tippe auf eine leuchtende Stelle', own: 'Tippe auf einen goldenen Stein', empty: 'Da steht schon ein Stein', cantMv: 'Da kann er nicht hin. Nur zum Nachbarpunkt entlang einer Linie', stuck: 'Dieser Stein kann gerade nicht ziehen', rm: '<b>Mühle!</b> Tippe auf den silbernen Stein, den du nimmst', safe: 'Steine in einer Mühle darf man nicht nehmen! Wähl einen anderen silbernen', want: 'Such einen Zug, der eine Mühle schließt. Die leuchtenden Stellen sind ein Tipp', wantWin: 'Damit gewinnst du noch nicht. Nochmal!', mill: '✨ Mühle!', win: '🏆 Gewonnen!', s: [
      { say: 'Huhu… zzz. Ich bin <b>Millowl</b> und werde wach, sobald drei in einer Reihe stehen! Lass uns auf diesem Brett, das wie ein Schmuckkästchen aussieht, gemeinsam <b>Mühle</b> lernen.' },
      { say: 'Das Brett hat <b>24 Punkte</b>, verbunden durch drei Quadrate und die Linien dazwischen. Die Steine stehen auf den Punkten. Jeder hat <b>9 Steine</b> in der Hand (Gold rechts gehört dir, Silber links dem Gegner). Gold beginnt.' },
      { say: 'Zuerst wird <b>gesetzt</b>. Abwechselnd setzt jeder einen Stein auf einen <b>freien Punkt</b>. Tippe Punkte an und setz 3 goldene Steine! Silber setzt immer dazwischen.', done: 'Genau so! Ihr setzt abwechselnd weiter, bis die Hände leer sind.' },
      { say: '<b>Drei eigene Steine in einer Reihe</b> auf einer Linie sind eine <b>Mühle</b>! Für jede Mühle darfst du dem Gegner <b>einen Stein wegnehmen</b>. Setz auf den leuchtenden Punkt, schließ die Mühle und nimm einen silbernen Stein!', done: 'Mühle! Ein genommener Stein verlässt das Brett für immer.' },
      { say: 'Achtung: Steine <b>in einer Mühle</b> sind <b>geschützt</b>, solange es andere zum Nehmen gibt. Die drei silbernen oben sind eine Mühle. Schließ deine Mühle und nimm einen erlaubten silbernen Stein!', done: 'Richtig! Steine in einer Mühle sind schwer zu nehmen – Mühlen schützen also auch.' },
      { say: 'Sind alle gesetzt, wird <b>gezogen</b>. Schieb einen Stein <b>entlang einer Linie auf den freien Nachbarpunkt</b>. Auch eine gezogene Mühle nimmt einen Stein. Zieh den leuchtenden goldenen Stein und schließ eine Mühle!', done: 'Mühle! Mühle auf, Mühle zu – das zählt jedes Mal.' },
      { say: 'Hast du nur noch <b>3 Steine</b>, darfst du <b>auf jeden freien Punkt springen</b>, ganz ohne Linien! Lass den leuchtenden goldenen Stein weit springen und schließ eine Mühle.', done: 'Wusch! Ein springender Stein kann überall eine Mühle schließen – auch mit 3 Steinen bist du gefährlich.' },
      { say: 'Gewinnen, Weg Nr. 1: Bring den Gegner auf <b>nur 2 Steine</b>! Mit zweien kann man keine Mühle bauen. Silber hat noch 3. Schließ eine Mühle und gewinn!', done: 'Gewonnen! Silber hat nur noch 2 Steine.' },
      { say: 'Gewinnen, Weg Nr. 2: Wer <b>keinen Stein mehr ziehen kann, verliert</b>. Die vier silbernen Steine in den Ecken sind fast eingesperrt. Versperr den letzten Ausweg!', done: 'Kein silberner Stein kann mehr ziehen. Auch das ist ein Sieg!' },
      { say: '<b>Remis</b> ist es, wenn <b>dieselbe Stellung 3-mal</b> vorkommt oder <b>50 Züge</b> (beide zusammen) ohne Mühle vergehen. Eine „Zwickmühle“, die du immer wieder auf- und zumachen kannst, ist sehr stark.' },
      { say: 'Jetzt kennst du alle Regeln! Viel Spaß mit den drei Phasen: setzen, ziehen und springen. Auf zur ersten Partie!' },
    ] },
    hi: { name: 'मिलआउल', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', own: 'सुनहरी गोटी पर टैप करो', empty: 'वहाँ पहले से गोटी है', cantMv: 'वहाँ नहीं जा सकती। सिर्फ़ रेखा से जुड़े पास वाले बिंदु पर', stuck: 'यह गोटी अभी नहीं चल सकती', rm: '<b>मिल!</b> जो चाँदी वाली गोटी हटानी है, उस पर टैप करो', safe: 'मिल वाली गोटी नहीं हटा सकते! कोई और चाँदी वाली चुनो', want: 'ऐसी चाल ढूँढो जिससे मिल बने। चमकती जगहें इशारा हैं', wantWin: 'इससे अभी जीत नहीं होगी। फिर से कोशिश करो!', mill: '✨ मिल!', win: '🏆 जीत!', s: [
      { say: 'हू… ख़र्र। मैं हूँ <b>मिलआउल</b>, और जैसे ही तीन एक लाइन में आते हैं, मेरी नींद खुल जाती है! चलो, इस गहनों के डिब्बे जैसे बोर्ड पर साथ मिलकर <b>नाइन मेन्स मॉरिस</b> सीखें।' },
      { say: 'बोर्ड पर <b>24 बिंदु</b> हैं, जो तीन चौकोरों और उनके बीच की रेखाओं से जुड़े हैं। गोटियाँ बिंदुओं पर रखी जाती हैं। दोनों के हाथ में <b>9-9 गोटियाँ</b> हैं (दाईं ओर सुनहरी तुम्हारी, बाईं ओर चाँदी वाली विरोधी की)। सुनहरा पहले चलता है।' },
      { say: 'सबसे पहले <b>रखने का समय</b>। बारी-बारी से एक-एक गोटी किसी <b>ख़ाली बिंदु</b> पर रखो। बिंदुओं पर टैप करके 3 सुनहरी गोटियाँ रखो! बीच-बीच में चाँदी वाली भी रखी जाएँगी।', done: 'बिलकुल ऐसे ही! हाथ की गोटियाँ ख़त्म होने तक बारी-बारी से रखते रहो।' },
      { say: 'एक रेखा पर <b>अपनी तीन गोटियाँ एक लाइन में</b> हो जाएँ तो वह <b>मिल</b> है! हर मिल पर तुम विरोधी की <b>एक गोटी हटा</b> सकते हो। चमकते बिंदु पर रखकर मिल बनाओ और एक चाँदी वाली गोटी हटाओ!', done: 'मिल! हटाई गई गोटी हमेशा के लिए बोर्ड से बाहर।' },
      { say: 'ध्यान दो: जो गोटियाँ <b>मिल में</b> हैं, वे तब तक <b>सुरक्षित</b> हैं जब तक हटाने को दूसरी गोटियाँ बची हों। ऊपर की तीन चाँदी वाली गोटियाँ एक मिल हैं। अपनी मिल बनाओ और जो चाँदी वाली हटाई जा सकती है, उसे हटाओ!', done: 'सही! मिल की गोटियाँ मुश्किल से हटती हैं, इसलिए मिल बचाव भी करती है।' },
      { say: 'सब गोटियाँ रख दीं तो अब <b>चलाने का समय</b>। एक गोटी को <b>रेखा के साथ पास वाले ख़ाली बिंदु</b> पर खिसकाओ। चलाकर बनी मिल से भी गोटी हटती है। चमकती सुनहरी गोटी चलाकर मिल बनाओ!', done: 'मिल! मिल खोलो और फिर बंद करो — हर बार गिनती होती है।' },
      { say: 'जब सिर्फ़ <b>3 गोटियाँ</b> बचें, तो रेखाओं की परवाह किए बिना <b>किसी भी ख़ाली बिंदु पर उड़</b> सकते हो! चमकती सुनहरी गोटी को दूर उड़ाकर मिल बनाओ।', done: 'सर्र! उड़ने वाली गोटी कहीं भी मिल बना सकती है, इसलिए 3 गोटियाँ भी ख़तरनाक हैं।' },
      { say: 'जीत का तरीक़ा 1: विरोधी को <b>सिर्फ़ 2 गोटियों</b> पर ले आओ! दो से मिल नहीं बनती। चाँदी के पास अभी 3 हैं। मिल बनाकर जीतो!', done: 'जीत! चाँदी की सिर्फ़ 2 गोटियाँ बचीं।' },
      { say: 'जीत का तरीक़ा 2: जो <b>एक भी गोटी न चला सके, वह हारता है</b>। कोनों की चारों चाँदी वाली गोटियाँ लगभग फँस चुकी हैं। आख़िरी रास्ता बंद कर दो!', done: 'कोई भी चाँदी वाली गोटी नहीं हिल सकती। यह भी जीत है!' },
      { say: 'अगर <b>एक ही स्थिति 3 बार</b> आए, या बिना किसी मिल के <b>50 चालें</b> (दोनों की मिलाकर) हो जाएँ, तो <b>ड्रॉ</b> होता है। ऐसी बनावट जिसमें तुम मिल को बार-बार खोल-बंद कर सको, बहुत मज़बूत होती है।' },
      { say: 'अब तुम सारे नियम जान गए! रखना, चलाना और उड़ना — तीनों का मज़ा लो। चलो, एक बाज़ी खेलें!' },
    ] },
    ar: { name: 'ميل أول', next: 'التالي', back: 'رجوع', start: 'هيا نلعب', again: 'مرة أخرى', tap: 'انقر على مكان مضيء', own: 'انقر على قطعة ذهبية', empty: 'هناك قطعة في هذا المكان بالفعل', cantMv: 'لا يمكنها الذهاب إلى هناك. فقط إلى النقطة المجاورة على خط', stuck: 'هذه القطعة لا تستطيع التحرك الآن', rm: '<b>طاحونة!</b> انقر على القطعة الفضية التي ستأخذها', safe: 'لا يمكن أخذ قطعة داخل طاحونة! اختر قطعة فضية أخرى', want: 'ابحث عن نقلة تصنع طاحونة. الأماكن المضيئة تلميح', wantWin: 'هذا لا يكفي للفوز بعد. حاول مرة أخرى!', mill: '✨ طاحونة!', win: '🏆 فزت!', s: [
      { say: 'هوو… خخخ. أنا <b>ميل أول</b>، وأستيقظ كلما اصطفّت ثلاث قطع! هيا نتعلم معًا لعبة <b>الطاحونة</b> (Nine Men’s Morris) على هذه اللوحة التي تشبه علبة المجوهرات.' },
      { say: 'في اللوحة <b>24 نقطة</b> تربطها ثلاثة مربعات والخطوط بينها. توضع القطع على النقاط. مع كل لاعب <b>9 قطع</b> في يده (الذهبية على اليمين لك، والفضية على اليسار لخصمك). الذهبي يبدأ.' },
      { say: 'أولًا مرحلة <b>الوضع</b>. يضع كل لاعب بدوره قطعة واحدة على أي <b>نقطة فارغة</b>. انقر على النقاط لتضع 3 قطع ذهبية! وسيضع الفضي بينها.', done: 'هكذا تمامًا! تستمران بالتناوب حتى تفرغ اليدان.' },
      { say: 'إذا صففت <b>ثلاثًا من قطعك</b> على خط واحد صنعت <b>طاحونة</b>! كل طاحونة تتيح لك <b>أخذ قطعة</b> من خصمك. ضع على النقطة المضيئة لتصنع طاحونة، ثم خذ قطعة فضية!', done: 'طاحونة! القطعة المأخوذة تغادر اللوحة إلى الأبد.' },
      { say: 'انتبه: القطع التي <b>داخل طاحونة</b> تكون <b>محمية</b> ما دامت هناك قطع أخرى يمكن أخذها. القطع الفضية الثلاث في الأعلى طاحونة. اصنع طاحونتك وخذ قطعة فضية مسموحًا بأخذها!', done: 'صحيح! يصعب أخذ قطع الطاحونة، فالطاحونة تحمي أيضًا.' },
      { say: 'بعد وضع كل القطع تأتي مرحلة <b>التحريك</b>. حرّك قطعة <b>على الخط إلى النقطة الفارغة المجاورة</b>. والطاحونة المصنوعة بالتحريك تأخذ قطعة أيضًا. حرّك القطعة الذهبية المضيئة لتصنع طاحونة!', done: 'طاحونة! افتح الطاحونة ثم أغلقها من جديد، وستُحسب في كل مرة.' },
      { say: 'عندما تبقى لك <b>3 قطع</b> فقط، يمكنك <b>الطيران إلى أي نقطة فارغة</b> دون التقيد بالخطوط! أطِر القطعة الذهبية المضيئة بعيدًا واصنع طاحونة.', done: 'ووش! القطعة الطائرة تصنع طاحونة في أي مكان، لذلك حتى 3 قطع خطيرة.' },
      { say: 'طريقة الفوز رقم 1: اجعل خصمك <b>بقطعتين فقط</b>! لا يمكن صنع طاحونة بقطعتين. لدى الفضي 3 الآن. اصنع طاحونة وافز!', done: 'فزت! بقيت للفضي قطعتان.' },
      { say: 'طريقة الفوز رقم 2: من <b>لا يستطيع تحريك أي قطعة يخسر</b>. القطع الفضية الأربع في الزوايا شبه محاصرة. أغلق المخرج الأخير!', done: 'لا تستطيع أي قطعة فضية الحركة. وهذا فوز أيضًا!' },
      { say: 'تكون النتيجة <b>تعادلًا</b> إذا <b>تكرر الوضع نفسه 3 مرات</b>، أو مرت <b>50 نقلة</b> (للاعبَين معًا) دون أي طاحونة. والشكل الذي تفتح فيه طاحونة وتغلقها مرة بعد مرة قوي جدًا.' },
      { say: 'صرت تعرف كل القواعد! استمتع بالمراحل الثلاث: الوضع والتحريك والطيران. هيا نلعب!' },
    ] },
    ru: { name: 'Миллоул', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tap: 'Нажми на светящееся место', own: 'Нажми на золотую фишку', empty: 'Там уже стоит фишка', cantMv: 'Туда нельзя. Только на соседнюю точку по линии', stuck: 'Эта фишка сейчас не может ходить', rm: '<b>Мельница!</b> Нажми на серебряную фишку, чтобы снять', safe: 'Фишки в мельнице снимать нельзя! Выбери другую серебряную', want: 'Найди ход, который делает мельницу. Светящиеся места — подсказка', wantWin: 'Это ещё не победа. Попробуй снова!', mill: '✨ Мельница!', win: '🏆 Победа!', s: [{ say: 'Уху… хррр. Я <b>Миллоул</b> и просыпаюсь всякий раз, когда три встают в ряд! Давай вместе изучим <b>мельницу</b> на этой доске-шкатулке.' }, { say: 'На доске <b>24 точки</b>, соединённые тремя квадратами и линиями между ними. Фишки ставят на точки. У каждой стороны <b>9 фишек</b> в руке (золотые справа — твои, серебряные слева — соперника). Золотые ходят первыми.' }, { say: 'Сначала — <b>расстановка</b>. По очереди ставьте по одной фишке на любую <b>пустую точку</b>. Нажми на точки, чтобы поставить 3 золотые фишки! Серебро будет ставить в ответ.', done: 'Вот так! Ходите по очереди, пока фишки в руке не кончатся.' }, { say: 'Поставь <b>три своих в ряд</b> на одной линии — и у тебя <b>мельница</b>! Каждый раз, сделав мельницу, ты <b>снимаешь одну</b> фишку соперника. Поставь фишку на светящуюся точку, сделай мельницу и сними серебряную!', done: 'Мельница! Снятая фишка уходит с доски навсегда.' }, { say: 'Осторожно: фишки <b>в мельнице</b> <b>неприкосновенны</b>, пока есть другие фишки для снятия. Три серебряные фишки наверху — мельница. Сделай свою мельницу и сними серебряную, которую можно!', done: 'Верно! Фишки в мельнице трудно снять, так что мельницы ещё и защищают.' }, { say: 'Когда всё расставлено, начинаются <b>ходы</b>. Двигай фишку <b>по линии на соседнюю пустую точку</b>. Мельница, построенная ходом, тоже снимает фишку. Сходи светящейся золотой фишкой и сделай мельницу!', done: 'Мельница! Открой мельницу и закрой снова — каждый раз считается.' }, { say: 'Когда у тебя остаётся <b>3 фишки</b>, можно <b>летать на любую пустую точку</b>, без всяких линий! Перелети светящейся золотой фишкой подальше и сделай мельницу.', done: 'Вжух! Летающая фишка делает мельницу где угодно, так что даже 3 фишки опасны.' }, { say: 'Способ победить №1: оставь сопернику <b>всего 2 фишки</b>! С двумя мельницу не сделать. У серебра сейчас 3. Сделай мельницу и победи!', done: 'Победа! У серебра осталось 2.' }, { say: 'Способ победить №2: игрок, который <b>не может сходить ни одной фишкой, проигрывает</b>. Четыре серебряные фишки в углах почти в ловушке. Перекрой последний выход!', done: 'Ни одна серебряная фишка не может ходить. Это тоже победа!' }, { say: '<b>Ничья</b>, если <b>одна и та же позиция повторится 3 раза</b> или пройдёт <b>50 ходов</b> (обоих игроков вместе) без мельницы. Позиция, где можно снова и снова открывать и закрывать мельницу, очень сильна.' }, { say: 'Теперь ты знаешь все правила! Наслаждайся всеми тремя этапами: расстановкой, ходами и полётом. Сыграем партию!' }] },
    'zh-TW': { name: '方陣貓頭鷹', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', tap: '點擊發光的地方', own: '請點擊金色棋子', empty: '那裡已經有棋子了', cantMv: '不能走到那裡。只能沿線走到相鄰的點', stuck: '那枚棋子現在不能動', rm: '<b>成磨！</b>點擊要拿掉的銀色棋子', safe: '已成磨的棋子不能拿掉！請選別的銀色棋子', want: '找出能成磨的一步。發光的位置是提示', wantWin: '這樣還沒贏喔。再試一次！', mill: '✨ 成磨！', win: '🏆 你贏了！', s: [{ say: '咕……呼嚕。我是<b>方陣貓頭鷹</b>，只要三顆排成一線我就會醒來！一起在這個珠寶盒般的棋盤上學<b>九子棋</b>吧。' }, { say: '棋盤上有<b>24個點</b>，由三個正方形和它們之間的線連接。棋子放在點上。雙方手上各有<b>9枚棋子</b>（右邊金色是你的，左邊銀色是對手的）。金色先下。' }, { say: '首先是<b>布子</b>。輪流把一枚棋子放在任何<b>空點</b>上。點擊點放上3枚金色棋子！銀色也會在中間落子。', done: '就是這樣！一直輪流放，直到手上的棋子用完。' }, { say: '在一條線上讓<b>自己的3枚連成一列</b>就是<b>成磨</b>！每次成磨都能<b>拿掉</b>對手1枚棋子。放在發光的點成磨，再拿掉一枚銀色棋子！', done: '成磨！被拿掉的棋子永遠離開棋盤。' }, { say: '注意：只要還有其他棋子可拿，<b>在磨裡</b>的棋子就是<b>安全的</b>。上方的3枚銀色棋子是一個磨。做出你的磨，拿掉可以拿的銀色棋子！', done: '答對了！磨裡的棋子很難被拿走，所以磨也能保護棋子。' }, { say: '全部放完後就進入<b>走子</b>。把一枚棋子<b>沿著線移到相鄰的空點</b>。走子成磨也能拿掉一枚。移動發光的金色棋子成磨！', done: '成磨！打開磨再關上，每次都算數。' }, { say: '剩下<b>3枚棋子</b>時，就能<b>飛到任何空點</b>，不受線的限制！讓發光的金色棋子飛到遠處成磨。', done: '咻！飛子在哪裡都能成磨，所以就算只剩3枚也很危險。' }, { say: '獲勝方法1：讓對手<b>只剩2枚</b>！2枚無法成磨。銀色現在有3枚。成磨獲勝吧！', done: '你贏了！銀色只剩2枚。' }, { say: '獲勝方法2：<b>沒有任何棋子能走的一方就輸了</b>。角落的4枚銀色棋子幾乎被困住了。堵住最後的出路！', done: '銀色的棋子都不能動了。這也算贏！' }, { say: '<b>同一局面出現3次</b>，或<b>50步</b>（雙方合計）都沒有成磨，就是<b>和局</b>。能一再打開、關上磨的棋形非常強。' }, { say: '規則全部學會了！享受布子、走子、飛子三個階段吧。來下一局吧！' }] },
    id: { name: 'Millowl', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tap: 'Ketuk tempat yang menyala', own: 'Ketuk bidak emas', empty: 'Sudah ada bidak di sana', cantMv: 'Tidak bisa ke sana. Hanya ke titik berikutnya sepanjang garis', stuck: 'Bidak itu tak bisa bergerak sekarang', rm: '<b>Mill!</b> Ketuk bidak perak yang akan diambil', safe: 'Bidak dalam mill tidak bisa diambil! Pilih bidak perak lain', want: 'Cari langkah yang membuat mill. Tempat yang menyala adalah petunjuk', wantWin: 'Itu belum menang. Coba lagi!', mill: '✨ Mill!', win: '🏆 Kamu menang!', s: [{ say: 'Huu… zzz. Aku <b>Millowl</b>, dan aku terbangun setiap kali tiga berjajar! Ayo belajar <b>Nine Men\'s Morris</b> bersama di papan kotak perhiasan ini.' }, { say: 'Papan punya <b>24 titik</b>, dihubungkan tiga persegi dan garis di antaranya. Bidak ditaruh di titik. Tiap pihak punya <b>9 bidak</b> di tangan (emas di kanan milikmu, perak di kiri milik lawan). Emas jalan duluan.' }, { say: 'Pertama adalah <b>menaruh</b>. Bergantian menaruh satu bidak di <b>titik kosong</b> mana pun. Ketuk titik untuk menaruh 3 bidak emas! Perak akan menaruh di sela-selanya.', done: 'Begitu! Kalian terus bergantian seperti ini sampai tangan kosong.' }, { say: 'Dapatkan <b>tiga milikmu berderet</b> di satu garis dan kamu punya <b>mill</b>! Setiap kali membuat mill, kamu <b>mengambil satu</b> bidak lawan. Taruh di titik yang menyala untuk membuat mill, lalu ambil bidak perak!', done: 'Mill! Bidak yang diambil keluar dari papan selamanya.' }, { say: 'Hati-hati: bidak yang ada <b>dalam mill</b> <b>aman</b> selama masih ada bidak lain untuk diambil. Tiga bidak perak di atas adalah mill. Buat mill-mu dan ambil bidak perak yang boleh diambil!', done: 'Benar! Bidak dalam mill sulit diambil, jadi mill juga melindungi.' }, { say: 'Setelah semua ditaruh, saatnya <b>bergerak</b>. Geser satu bidak <b>sepanjang garis ke titik kosong berikutnya</b>. Mill yang dibuat dengan bergerak juga mengambil bidak. Gerakkan bidak emas yang menyala untuk membuat mill!', done: 'Mill! Buka mill lalu tutup lagi, dan itu dihitung setiap kali.' }, { say: 'Saat tinggal <b>3 bidak</b>, kamu bisa <b>terbang ke titik kosong mana pun</b>, ada garis atau tidak! Terbangkan bidak emas yang menyala jauh-jauh untuk membuat mill.', done: 'Wus! Bidak terbang bisa membuat mill di mana saja, jadi 3 bidak pun berbahaya.' }, { say: 'Cara menang #1: buat lawan <b>tinggal 2 bidak</b>! Dengan dua, mill tak bisa dibuat. Perak sekarang punya 3. Buat mill dan menang!', done: 'Kamu menang! Perak tinggal 2.' }, { say: 'Cara menang #2: pemain yang <b>tak bisa menggerakkan bidak mana pun kalah</b>. Empat bidak perak di pojok hampir terjebak. Tutup jalan keluar terakhir!', done: 'Tak satu pun bidak perak bisa bergerak. Itu juga menang!' }, { say: 'Hasilnya <b>seri</b> jika <b>posisi yang sama muncul 3 kali</b>, atau jika <b>50 langkah</b> (kedua pemain bersama) lewat tanpa mill. Bentuk yang bisa membuka dan menutup mill berulang kali sangat kuat.' }, { say: 'Sekarang kamu tahu semua aturannya! Nikmati ketiga tahap: menaruh, bergerak, dan terbang. Ayo main!' }] },
    tr: { name: 'Millowl', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tap: 'Parlayan yere dokun', own: 'Altın bir taşa dokun', empty: 'Orada zaten taş var', cantMv: 'Oraya gidemez. Yalnızca çizgi boyunca sonraki noktaya', stuck: 'Bu taş şu an oynayamaz', rm: '<b>Değirmen!</b> Almak için gümüş taşa dokun', safe: 'Değirmendeki taşlar alınamaz! Başka bir gümüş taş seç', want: 'Değirmen yapan bir hamle ara. Parlayan yerler ipucu', wantWin: 'Bu henüz kazandırmıyor. Tekrar dene!', mill: '✨ Değirmen!', win: '🏆 Kazandın!', s: [{ say: 'Huu… zzz. Ben <b>Millowl</b>, üç taş yan yana gelince uyanırım! Bu mücevher kutusu tahtada <b>Dokuz Taş</b>\'ı (değirmen) birlikte öğrenelim.' }, { say: 'Tahtada üç kare ve aralarındaki çizgilerle birleşen <b>24 nokta</b> var. Taşlar noktalara konur. Her tarafın elinde <b>9 taş</b> var (sağdaki altınlar senin, soldaki gümüşler rakibinin). İlk altın oynar.' }, { say: 'Önce <b>yerleştirme</b>. Sırayla birer taşı herhangi bir <b>boş noktaya</b> koyun. 3 altın taş koymak için noktalara dokun! Gümüş de aralarda koyacak.', done: 'İşte böyle! Elinizdeki taşlar bitene kadar sırayla devam edersiniz.' }, { say: 'Bir çizgide <b>üç taşını yan yana</b> getirirsen <b>değirmen</b> yaparsın! Her değirmen yaptığında rakibin bir taşını <b>alırsın</b>. Değirmen yapmak için parlayan noktaya koy, sonra bir gümüş taşı al!', done: 'Değirmen! Alınan taş tahtadan sonsuza dek çıkar.' }, { say: 'Dikkat: alınabilecek başka taşlar varken <b>değirmendeki</b> taşlar <b>güvendedir</b>. Üstteki üç gümüş taş bir değirmen. Kendi değirmenini yap ve alınabilen bir gümüş taşı al!', done: 'Doğru! Değirmendeki taşları almak zordur, yani değirmenler korur da.' }, { say: 'Her şey yerleşince <b>hareket</b> zamanı. Bir taşı <b>çizgi boyunca sonraki boş noktaya</b> kaydır. Hareketle kurulan değirmen de taş aldırır. Değirmen yapmak için parlayan altın taşı oynat!', done: 'Değirmen! Değirmeni açıp yeniden kapatırsan her seferinde sayılır.' }, { say: '<b>3 taşın</b> kalınca çizgi olsun olmasın <b>herhangi bir boş noktaya uçabilirsin</b>! Değirmen yapmak için parlayan altın taşı uzağa uçur.', done: 'Vın! Uçan taş her yerde değirmen yapabilir, bu yüzden 3 taş bile tehlikelidir.' }, { say: 'Kazanma yolu 1: rakibini <b>2 taşa düşür</b>! İki taşla değirmen yapılamaz. Gümüş\'ün şu an 3 taşı var. Değirmen yap ve kazan!', done: 'Kazandın! Gümüş 2 taşa düştü.' }, { say: 'Kazanma yolu 2: <b>hiçbir taşını oynatamayan oyuncu kaybeder</b>. Köşelerdeki dört gümüş taş neredeyse kapana kısıldı. Son çıkışı kapat!', done: 'Gümüş taşların hiçbiri oynayamıyor. Bu da galibiyet!' }, { say: '<b>Aynı pozisyon 3 kez</b> oluşursa ya da değirmensiz <b>50 hamle</b> (iki oyuncu birlikte) geçerse oyun <b>berabere</b> biter. Değirmeni tekrar tekrar açıp kapatabildiğin bir şekil çok güçlüdür.' }, { say: 'Artık tüm kuralları biliyorsun! Üç aşamanın tadını çıkar: yerleştirme, hareket ve uçma. Hadi bir oyun oynayalım!' }] },
  };

  const SFX = (() => {   // the guide's voice and a little chime (the pieces' own sounds come from morrisSet)
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.morris(true); T3.show('morris', board); T3.play(true);
    const set = T3.morrisSet(board, { sfx: true }), Y = set.top;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: 10.6, d: 9.6, y: Y - .4, pitch: 1.18 } : { w: 10.2, d: 9.4, y: Y - .6, pitch: 1.14 });   // the whole board with both channels
    let E = null, G = null, pos = null, step = 0, stopped = false, busy = false, played = false, sel = null, placed = 0, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const idx = s => G.index[s];

    function stateOf(p, tent) {   // as the table play: tent = a piece already put down while its owner picks the piece to take
      const b = Array.from(p.b);
      const hand = [0, p.hand[1], p.hand[2]], caps = [0, G.pieces - p.cnt[2] - p.hand[2], G.pieces - p.cnt[1] - p.hand[1]];
      if (tent) { if (tent.from !== NONE) b[tent.from] = 0; else hand[1]--; b[tent.at] = 1; }
      return { b, hand, caps };
    }
    const millOf = (b, at) => { const c = b[at]; return c ? G.mills.filter(ml => ml.includes(at) && ml.every(i => b[i] === c)) : []; };
    function accepted(st) {
      const all = pos.moves();
      if (st.act === 'place') return all.filter(m => mRm(m) === NONE);
      if (st.act === 'mill') return all.filter(m => mRm(m) !== NONE);
      if (st.act === 'win') return all.filter(m => { const q = pos.clone(); q.play(m); return q.status() === -1; });
      return [];
    }
    function showTask() {
      const st = STEPS[step], o = {};
      if (st.glow === 'all') o.dests = [...Array(G.n).keys()];
      if (st.act && !played && !busy) {
        const A = accepted(st);
        if (sel && sel.stage === 'remove') o.rm = [...new Set(sel.cands.map(mRm))];
        else if (sel) { o.sel = sel.from; o.dests = [...new Set(sel.cands.map(mTo))]; }
        else if (st.act !== 'place') {
          const froms = [...new Set(A.map(mFrom))];
          if (froms[0] === NONE) o.dests = [...new Set(A.map(mTo))];
          else if (froms.length === 1) o.hint = [froms[0], -1];
        }
      }
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
    function specOf(st) { const b = Array(G.n).fill(0); st.gold.forEach(x => { b[idx(x)] = 1; }); st.silver.forEach(x => { b[idx(x)] = 2; }); return { b: b.join(''), h: st.h, side: 1 }; }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; sel = null; placed = 0;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; $('.cnt').innerHTML = '';
      pos = E.Pos.from(G, specOf(st));
      set.mill(null); set.marks({});
      const w = set.sync(stateOf(pos), true);
      later(showTask, Math.min(900, w + 200));
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null;
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      if (st.act === 'win') { tip(L.win); set.chime(); } else SFX.chime();
      set.marks({}); buttons(); autoNext();
    }
    function play(m) {   // returns the ms until the pieces have landed
      const fly = mFrom(m) !== NONE && pos.flying(pos.side), side = pos.side;
      pos.play(m);
      const w = set.sync(Object.assign(stateOf(pos), { fly }), true);
      if (mRm(m) !== NONE && side === 1) { const ml = millOf(pos.b, mTo(m)); later(() => set.mill([...new Set(ml.flat())], true), Math.min(w, 420)); }
      return w;
    }
    function silverReply() {   // the placing task: silver answers with a quiet placement
      const all = pos.moves(), quiet = all.filter(x => mRm(x) === NONE), pool = quiet.length ? quiet : all;
      const m = pool[Math.floor(Math.random() * pool.length)];
      const w = play(m); later(() => { busy = false; if (pos.cnt[1] >= 3) finish(); else showTask(); }, w + 120);
    }
    function commit(m) {
      busy = true; sel = null; set.marks({});
      const w = play(m);
      if (STEPS[step].act === 'place') { placed++; later(silverReply, w + 380); return; }
      later(finish, w + (mRm(m) !== NONE ? 700 : 300));
    }
    function pointOf(e) { const p = T3.pick(e, Y); return p ? set.pointAt(p.x, p.z) : -1; }
    function cancelSel() {
      if (!sel) return;
      if (sel.stage === 'pick') set.lift(sel.from, false);
      else { set.mill(null); set.sync(stateOf(pos), true); }
      sel = null; showTask();
    }
    function onClick(e) {
      if (busy || played || !pos || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = pointOf(e), legal = pos.moves(), A = accepted(st);
      if (i < 0) { cancelSel(); return; }
      if (sel && sel.stage === 'remove') {
        const m = sel.cands.find(x => mRm(x) === i);
        if (m !== undefined) { commit(m); return; }
        say(pos.b[i] === 2 ? L.safe : L.rm); return;
      }
      if (pos.hand[1] > 0) {   // placing
        if (pos.b[i]) { say(L.empty); set.clack('board'); return; }
        const c = A.filter(m => mFrom(m) === NONE && mTo(m) === i);
        if (!c.length) { say(L.want); return; }
        if (c.length === 1 && mRm(c[0]) === NONE) { commit(c[0]); return; }
        if (c.length === 1) { tip(L.mill); commit(c[0]); return; }
        sel = { from: NONE, to: i, stage: 'remove', cands: c };   // the piece goes down, then pick the one to take
        set.sync(stateOf(pos, { at: i, from: NONE }), true);
        later(() => { if (sel && sel.to === i) { const b = Array.from(pos.b); b[i] = 1; set.mill(millOf(b, i).flat()); } }, 380);
        tip(L.mill); say(L.rm); showTask(); return;
      }
      if (pos.b[i] === 1) {   // moving / flying: pick the piece
        if (sel && sel.from === i) { cancelSel(); return; }
        const c = A.filter(m => mFrom(m) === i);
        if (!c.length) { say(legal.some(m => mFrom(m) === i) ? (st.act === 'win' ? L.wantWin : L.want) : L.stuck); return; }
        if (sel) set.lift(sel.from, false);
        sel = { from: i, stage: 'pick', cands: c }; set.lift(i, true); set.clack('felt'); showTask(); return;
      }
      if (!sel) { say(L.own); return; }
      if (pos.b[i]) { say(L.empty); return; }
      const c = sel.cands.filter(m => mTo(m) === i);
      if (!c.length) { say(legal.some(m => mFrom(m) === sel.from && mTo(m) === i) ? (st.act === 'win' ? L.wantWin : L.want) : L.cantMv); return; }
      if (c.length === 1) { if (mRm(c[0]) !== NONE) tip(L.mill); commit(c[0]); return; }
      const from = sel.from;   // closes a mill: the piece moves there, then pick the one to take
      set.lift(from, false);
      sel = { from, to: i, stage: 'remove', cands: c };
      set.sync(Object.assign(stateOf(pos, { at: i, from }), { fly: pos.flying(1) }), true);
      later(() => { if (sel && sel.to === i) { const b = Array.from(pos.b); b[from] = 0; b[i] = 1; set.mill(millOf(b, i).flat()); } }, 380);
      tip(L.mill); say(L.rm); showTask();
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
    loadEngine().then(e => { if (stopped) return; E = e; G = E.geom(RULE); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-morris-rules-seen', '1'); } catch (e) {}
    // test hooks
    const at = i => { const [x, z] = set.xz(i); return T3.project(x, z, Y); };
    const dbg = { at, step: () => step, steps: STEPS.length, played: () => played, busy: () => busy, go: n => go(n), sel: () => sel && { stage: sel.stage, from: sel.from, to: sel.to },
      plan: () => {   // the taps that solve (the next part of) the task
        const st = STEPS[step]; if (!st.act || played || busy || !pos) return [];
        const A = accepted(st); if (!A.length) return [];
        const m = A[Math.floor(A.length / 2)], o = [];
        if (mFrom(m) !== NONE) o.push(mFrom(m)); o.push(mTo(m)); if (mRm(m) !== NONE && A.filter(x => mFrom(x) === mFrom(m) && mTo(x) === mTo(m)).length > 1) o.push(mRm(m));
        return o.map(at);
      } };
    window.__mmRules = dbg;
    return {
      stop() { stopped = true; if (window.__mmRules === dbg) delete window.__mmRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); set.dispose(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.morris = { start };
})();
