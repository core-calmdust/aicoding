/* =====================================================================
   Amazons rules — a guided tour on the 3D table (the board and figures chosen in the portal, atlas/models/amazons.js,
   the full 10×10 board), told by the guide character (Kero, the jungle frog).
   A short hands-on course: the start, moving like a queen, the arrow after every move, nothing can be passed,
   shooting back where you came from, shutting an amazon in, the last move that leaves the opponent stuck,
   and the rooms at the end. Every task is checked live by the game's own rules (../amazons/engine.js); you play White.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Squares in the game's notation ('d1': files a–j from the left, rank 1 at the bottom).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/frog-0.webp', ENG = '../amazons/engine.js?v=11', N = 10;
  const loadEngine = () => window.AmazonsEngine ? Promise.resolve(window.AmazonsEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.AmazonsEngine ? res(window.AmazonsEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const START = { w: ['a4', 'd1', 'g1', 'j4'], b: ['a7', 'd10', 'g10', 'j7'] };
  const WALL = 'abcdefghij'.split('').map(f => f + '4');
  // w / b: the amazons; x: arrows; act: what the task accepts; glow: soft gold squares; target: the green goal squares
  // (for 'go' the destinations, for 'shoot' the arrow's square); rooms: the two rooms coloured (the last lesson)
  const STEPS = [
    { w: START.w, b: START.b, x: [] },
    { w: START.w, b: START.b, x: [], glow: START.w },
    { w: ['d1'], b: ['g10'], x: [], act: 'go', target: ['d8', 'h5', 'a4'] },
    { w: ['d4'], b: ['h9'], x: [], act: 'shoot', target: ['g7'] },
    { w: ['c3'], b: ['h8'], x: ['c6', 'f6', 'e3', 'a5', 'b2'], act: 'any' },
    { w: ['e2'], b: ['e9'], x: ['d3', 'f3'], act: 'back' },
    { w: ['j2'], b: ['j10', 'b8'], x: ['i10', 'i9'], act: 'trap', trap: 'j10' },
    { w: ['a1', 'f5'], b: ['a10'], x: ['b10', 'b9', 'g6', 'e4'], act: 'win' },
    { w: ['e7'], b: ['e2'], x: WALL, rooms: true },
    { w: START.w, b: START.b, x: [], last: true },
  ];

  const TXT = {
    ja: { name: 'ケロ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないケロ', stuck: 'そのアマゾンは今は動けないケロ', own: '白いアマゾンをタップしてね', want: '今回は、お題のとおりに動いてみてケロ', shoot: '矢を撃つマスをタップ', win: '黒はもう動けない！',
      s: [
      { say: 'ケロケロ〜！ ぼくは<b>ケロ</b>。南米のジャングルからやってきたよ。今日はアルゼンチン生まれの<b>アマゾンズ</b>を、この10×10の盤で覚えようケロ！' },
      { say: '白と黒、どちらも<b>4体のアマゾン</b>で始めるよ。光っているのがきみの白いアマゾン。<b>白が先手</b>で、交互に1手ずつ指すケロ。' },
      { say: 'アマゾンは<b>チェスのクイーン</b>と同じ動き。<b>縦・横・斜め</b>に何マスでも進めるよ。光っているアマゾンをタップして、光っているマスのどれかへ動かしてみて！', done: 'スイーッ！ まっすぐなら、どこまでも行けるケロ。' },
      { say: 'ここからが大事。動いたら、着いたマスから<b>同じ動きで矢を1本撃つ</b>んだ。矢の刺さったマスは<b>もう誰も使えない</b>よ。どこかへ動いて、<b>光っているマス</b>に矢を撃ってみて！', done: 'トスッ！ あのマスはもうふさがったケロ。1手で「動く」と「撃つ」の2つをするんだ。' },
      { say: 'アマゾンも矢も、<b>アマゾンや矢を飛び越えられない</b>よ。光っているアマゾンをタップすると、行けるマスだけが光るケロ。どこかへ動いて、矢を撃ってみよう！', done: 'ナイス！ 矢がふえるほど、行ける道がどんどん細くなるケロ。' },
      { say: '矢は<b>さっきまでいたマス</b>に撃ってもいいんだ。通ってきた道をふさぐ作戦だよ。光っているアマゾンを動かして、<b>もといたマス</b>に矢を撃ってみて！', done: 'そう！ 自分の背中の道を閉じて、相手を入れないのもアリケロ。' },
      { say: '右上の黒いアマゾンは、まわりがほとんどふさがってるよ。残る出口を<b>矢かアマゾンでふさいで</b>、閉じ込めちゃおう！', done: '閉じ込めた！ もうこの黒いアマゾンは一歩も動けないケロ。' },
      { say: 'いちばん大事なルール。<b>自分の番に動けるアマゾンがなかったら負け</b>！ 黒のアマゾンは残り1体。<b>黒がもう動けなくなる手</b>を見つけてケロ！', done: 'やったー、きみの勝ち！ 最後に動けた人が勝つゲームなんだケロ。' },
      { say: '矢で盤が<b>部屋に分かれたら</b>、あとは自分の部屋の中で動くだけ。広い部屋（金色）の白は長く動けて、狭い部屋（緑）の黒が先に動けなくなる。<b>広い陣地をつくった方が勝ち</b>だよ。' },
      { say: 'これでルールはばっちりケロ！ 引き分けはないから、最後の一手まで矢でふさぎ合おう。さあ、遊んでみよう！' },
    ] },
    en: { name: 'Kero', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't go there!", stuck: "That amazon can't move right now", own: 'Tap a white amazon', want: 'This time, follow the task', shoot: 'Tap where the arrow goes', win: 'Black is stuck!',
      s: [
      { say: "Ribbit! I'm <b>Kero</b>, all the way from the South American jungle. Today let's learn <b>Amazons</b>, born in Argentina, on this 10×10 board!" },
      { say: 'Both sides start with <b>four amazons</b>. The glowing ones are your white amazons. <b>White moves first</b>, then you take turns.' },
      { say: 'An amazon moves like a <b>chess queen</b>: any distance <b>up, down, sideways or diagonally</b>. Tap the glowing amazon and move it to one of the glowing squares!', done: 'Whoosh! In a straight line she can go as far as she likes.' },
      { say: 'Now the key part: after moving, she <b>shoots one arrow</b> from where she landed, moving the same way. A square with an arrow <b>can never be used again</b>. Move somewhere, then shoot an arrow at <b>the glowing square</b>!', done: "Thunk! That square is blocked for good. Every move is two things: move, then shoot." },
      { say: "Neither amazons nor arrows can <b>pass over an amazon or an arrow</b>. Tap the glowing amazon and only the squares she can reach light up. Move somewhere and shoot!", done: 'Nice! The more arrows there are, the narrower the roads get.' },
      { say: "You may even shoot the arrow at <b>the square you just left</b> — closing the road behind you. Move the glowing amazon, then shoot <b>back at the square she left</b>!", done: "That's it! Shutting the road behind you keeps the opponent out." },
      { say: "The black amazon in the top right is almost walled in. Block the last way out <b>with an arrow or an amazon</b> and shut her in!", done: "Trapped! That black amazon can't move a single step now." },
      { say: "The most important rule: <b>if none of your amazons can move on your turn, you lose</b>! Black has one amazon left. Find the move that leaves <b>Black with no move at all</b>!", done: 'Yes — you win! The last player able to move is the winner.' },
      { say: "Once arrows split the board into <b>rooms</b>, each amazon just moves around inside its own. White in the big room (gold) can keep going; Black in the small room (green) runs out first. <b>Whoever builds the bigger territory wins</b>." },
      { say: "Now you know the rules! There are no draws, so keep blocking with arrows to the very last move. Let's play!" },
    ] },
    zh: { name: '呱呱', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里去不了呱', stuck: '这个亚马逊现在动不了呱', own: '请点击白色的亚马逊', want: '这次请按题目来走呱', shoot: '点击要射箭的格子', win: '黑方动不了了！',
      s: [
      { say: '呱呱～！我是<b>呱呱</b>，从南美的丛林来的。今天在这块10×10的棋盘上，一起学阿根廷诞生的<b>亚马逊棋</b>吧呱！' },
      { say: '白方和黑方都以<b>4个亚马逊</b>开始。发光的是你的白色亚马逊。<b>白方先走</b>，之后轮流各走一步呱。' },
      { say: '亚马逊的走法和<b>国际象棋的皇后</b>一样，可以沿<b>横、竖、斜</b>走任意格。点击发光的亚马逊，把它走到任意一个发光的格子吧！', done: '嗖～！只要是直线，想走多远都行呱。' },
      { say: '重点来了：走完之后，要从落点<b>按同样的走法射出一支箭</b>。插着箭的格子<b>再也不能用</b>。随便走到哪里，然后向<b>发光的格子</b>射箭吧！', done: '咚！那一格被封住了。每一步都要做“走”和“射”两件事呱。' },
      { say: '亚马逊和箭都<b>不能越过亚马逊或箭</b>。点击发光的亚马逊，只有能到的格子会发光呱。走到某处再射箭吧！', done: '漂亮！箭越多，路就越窄呱。' },
      { say: '箭也可以射向<b>刚刚离开的格子</b>，把走过的路封住。走动发光的亚马逊，然后把箭<b>射回原来的格子</b>！', done: '对！封住身后的路，不让对手进来也是好办法呱。' },
      { say: '右上的黑色亚马逊几乎被围住了。用<b>箭或亚马逊</b>堵住最后的出口，把它关起来吧！', done: '关住了！这个黑色亚马逊一步也动不了了呱。' },
      { say: '最重要的规则：<b>轮到自己时没有能走的亚马逊就输</b>！黑方只剩1个亚马逊。找出让<b>黑方再也走不了</b>的一步呱！', done: '太好了，你赢了！能走到最后的人获胜呱。' },
      { say: '当箭把棋盘<b>分成几个房间</b>，每个亚马逊就只能在自己的房间里走。大房间（金色）的白方能走很久，小房间（绿色）的黑方先走不动。<b>围出更大领地的一方获胜</b>。' },
      { say: '规则都学会了呱！没有和棋，用箭互相封堵到最后一步吧。来，开始玩吧！' },
    ] },
    'zh-TW': { name: '呱呱', next: '下一步', back: '返回', start: '開始對局', again: '再來一次', tap: '點擊發光的地方', nope: '那裡去不了呱', stuck: '這個亞馬遜現在動不了呱', own: '請點擊白色的亞馬遜', want: '這次請照題目來走呱', shoot: '點擊要射箭的格子', win: '黑方動不了了！',
      s: [
      { say: '呱呱～！我是<b>呱呱</b>，從南美的叢林來的。今天在這塊10×10的棋盤上，一起學阿根廷誕生的<b>亞馬遜棋</b>吧呱！' },
      { say: '白方和黑方都以<b>4個亞馬遜</b>開始。發光的是你的白色亞馬遜。<b>白方先走</b>，之後輪流各走一步呱。' },
      { say: '亞馬遜的走法和<b>西洋棋的皇后</b>一樣，可以沿<b>橫、直、斜</b>走任意格。點擊發光的亞馬遜，把它走到任一個發光的格子吧！', done: '咻～！只要是直線，想走多遠都行呱。' },
      { say: '重點來了：走完之後，要從落點<b>以同樣的走法射出一支箭</b>。插著箭的格子<b>再也不能用</b>。隨便走到哪裡，然後向<b>發光的格子</b>射箭吧！', done: '咚！那一格被封住了。每一步都要做「走」和「射」兩件事呱。' },
      { say: '亞馬遜和箭都<b>不能越過亞馬遜或箭</b>。點擊發光的亞馬遜，只有能到的格子會發光呱。走到某處再射箭吧！', done: '漂亮！箭越多，路就越窄呱。' },
      { say: '箭也可以射向<b>剛剛離開的格子</b>，把走過的路封住。走動發光的亞馬遜，然後把箭<b>射回原來的格子</b>！', done: '對！封住身後的路，不讓對手進來也是好辦法呱。' },
      { say: '右上的黑色亞馬遜幾乎被圍住了。用<b>箭或亞馬遜</b>堵住最後的出口，把它關起來吧！', done: '關住了！這個黑色亞馬遜一步也動不了了呱。' },
      { say: '最重要的規則：<b>輪到自己時沒有能走的亞馬遜就輸</b>！黑方只剩1個亞馬遜。找出讓<b>黑方再也走不了</b>的一步呱！', done: '太好了，你贏了！能走到最後的人獲勝呱。' },
      { say: '當箭把棋盤<b>分成幾個房間</b>，每個亞馬遜就只能在自己的房間裡走。大房間（金色）的白方能走很久，小房間（綠色）的黑方先走不動。<b>圍出更大領地的一方獲勝</b>。' },
      { say: '規則都學會了呱！沒有和棋，用箭互相封堵到最後一步吧。來，開始玩吧！' },
    ] },
    ko: { name: '케로', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기는 못 가, 개굴', stuck: '그 아마존은 지금 못 움직여, 개굴', own: '흰 아마존을 탭해 줘', want: '이번엔 과제대로 움직여 봐, 개굴', shoot: '화살을 쏠 칸을 탭', win: '흑은 이제 못 움직여!',
      s: [
      { say: '개굴개굴~! 나는 <b>케로</b>. 남미 정글에서 왔어. 오늘은 이 10×10 판에서 아르헨티나에서 태어난 <b>아마존스</b>를 배워 보자, 개굴!' },
      { say: '백과 흑 모두 <b>아마존 4개</b>로 시작해. 빛나는 게 네 흰 아마존이야. <b>백이 먼저</b> 두고, 번갈아 한 수씩 둬, 개굴.' },
      { say: '아마존은 <b>체스의 퀸</b>과 같이 움직여. <b>가로·세로·대각선</b>으로 몇 칸이든 갈 수 있어. 빛나는 아마존을 탭해서 빛나는 칸 중 하나로 옮겨 봐!', done: '슈웅~! 직선이라면 어디까지든 갈 수 있어, 개굴.' },
      { say: '여기가 중요해. 움직인 뒤엔 도착한 칸에서 <b>같은 방식으로 화살을 한 발 쏴</b>. 화살이 꽂힌 칸은 <b>이제 아무도 못 써</b>. 어딘가로 움직인 다음 <b>빛나는 칸</b>에 화살을 쏴 봐!', done: '퍽! 그 칸은 이제 막혔어. 한 수에 "움직이기"와 "쏘기" 두 가지를 해, 개굴.' },
      { say: '아마존도 화살도 <b>아마존이나 화살을 넘을 수 없어</b>. 빛나는 아마존을 탭하면 갈 수 있는 칸만 빛나, 개굴. 어딘가로 움직이고 화살을 쏴 보자!', done: '좋아! 화살이 늘수록 갈 수 있는 길이 점점 좁아져, 개굴.' },
      { say: '화살은 <b>방금까지 있던 칸</b>에 쏴도 돼. 지나온 길을 막는 작전이야. 빛나는 아마존을 움직이고 <b>원래 있던 칸</b>에 화살을 쏴 봐!', done: '그래! 내 뒤의 길을 닫아서 상대가 못 들어오게 하는 것도 방법이야, 개굴.' },
      { say: '오른쪽 위의 흑 아마존은 주위가 거의 막혀 있어. 남은 출구를 <b>화살이나 아마존으로 막아서</b> 가둬 버리자!', done: '가뒀다! 이 흑 아마존은 이제 한 걸음도 못 움직여, 개굴.' },
      { say: '가장 중요한 규칙. <b>내 차례에 움직일 수 있는 아마존이 없으면 패배</b>! 흑의 아마존은 하나 남았어. <b>흑이 더는 못 움직이게 되는 수</b>를 찾아 봐, 개굴!', done: '해냈다, 네 승리! 마지막까지 움직인 사람이 이기는 게임이야, 개굴.' },
      { say: '화살로 판이 <b>방으로 나뉘면</b>, 이제 각자 자기 방 안에서만 움직여. 넓은 방(금색)의 백은 오래 움직이고, 좁은 방(초록)의 흑이 먼저 못 움직이게 돼. <b>넓은 영역을 만든 쪽이 이겨</b>.' },
      { say: '이제 규칙은 완벽해, 개굴! 무승부가 없으니 마지막 한 수까지 화살로 서로 막아 보자. 자, 놀아 보자!' },
    ] },
    es: { name: 'Kero', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡No puede ir ahí!', stuck: 'Esa amazona no puede moverse ahora', own: 'Toca una amazona blanca', want: 'Esta vez, sigue la tarea', shoot: 'Toca adónde va la flecha', win: '¡Las negras no pueden mover!',
      s: [
      { say: '¡Croac! Soy <b>Kero</b> y vengo de la selva sudamericana. ¡Hoy aprendemos <b>Amazons</b>, nacido en Argentina, en este tablero de 10×10!' },
      { say: 'Los dos bandos empiezan con <b>cuatro amazonas</b>. Las que brillan son tus amazonas blancas. <b>Empiezan las blancas</b> y luego se juega por turnos.' },
      { say: 'Una amazona se mueve como la <b>dama del ajedrez</b>: cualquier distancia <b>en vertical, horizontal o diagonal</b>. ¡Toca la amazona que brilla y llévala a una de las casillas que brillan!', done: '¡Zuuum! En línea recta llega tan lejos como quiera.' },
      { say: 'Ahora lo importante: tras moverse, <b>dispara una flecha</b> desde donde llegó, del mismo modo. Una casilla con flecha <b>ya no se puede usar nunca</b>. ¡Muévete a algún sitio y dispara una flecha a <b>la casilla que brilla</b>!', done: '¡Zas! Esa casilla queda bloqueada. Cada jugada son dos cosas: mover y disparar.' },
      { say: 'Ni amazonas ni flechas pueden <b>pasar por encima de una amazona o una flecha</b>. Toca la amazona que brilla y solo brillarán las casillas a las que llega. ¡Muévete y dispara!', done: '¡Bien! Cuantas más flechas, más estrechos los caminos.' },
      { say: 'Puedes disparar incluso a <b>la casilla que acabas de dejar</b>, cerrando el camino detrás de ti. ¡Mueve la amazona que brilla y dispara <b>a la casilla de la que salió</b>!', done: '¡Eso es! Cerrar el camino a tu espalda deja fuera al rival.' },
      { say: 'La amazona negra de arriba a la derecha está casi encerrada. ¡Bloquea la última salida <b>con una flecha o una amazona</b> y enciérrala!', done: '¡Atrapada! Esa amazona negra ya no puede dar ni un paso.' },
      { say: 'La regla más importante: <b>si en tu turno ninguna de tus amazonas puede moverse, pierdes</b>. A las negras les queda una amazona. ¡Encuentra la jugada que deja a las negras <b>sin ninguna jugada</b>!', done: '¡Sí, ganas! Gana quien puede mover el último.' },
      { say: 'Cuando las flechas parten el tablero en <b>habitaciones</b>, cada amazona se mueve dentro de la suya. Las blancas, en la grande (dorada), pueden seguir; las negras, en la pequeña (verde), se quedan sin jugadas antes. <b>Gana quien construye el territorio más grande</b>.' },
      { say: '¡Ya sabes las reglas! No hay tablas, así que sigue bloqueando con flechas hasta la última jugada. ¡A jugar!' },
    ] },
    fr: { name: 'Kero', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Elle ne peut pas aller là !', stuck: 'Cette amazone ne peut pas bouger pour l’instant', own: 'Touche une amazone blanche', want: 'Cette fois, suis la consigne', shoot: 'Touche la case de la flèche', win: 'Les Noirs sont bloqués !',
      s: [
      { say: 'Croâ ! Moi c’est <b>Kero</b>, je viens de la jungle d’Amérique du Sud. Aujourd’hui on apprend le jeu des <b>Amazones</b>, né en Argentine, sur ce plateau 10×10 !' },
      { say: 'Chaque camp commence avec <b>quatre amazones</b>. Celles qui brillent sont tes amazones blanches. <b>Les Blancs commencent</b>, puis on joue chacun son tour.' },
      { say: 'Une amazone se déplace comme la <b>dame aux échecs</b> : aussi loin qu’elle veut <b>en ligne, en colonne ou en diagonale</b>. Touche l’amazone qui brille et emmène-la sur une des cases qui brillent !', done: 'Fiou ! En ligne droite, elle va aussi loin qu’elle veut.' },
      { say: 'Le plus important : après son déplacement, elle <b>tire une flèche</b> depuis sa case d’arrivée, de la même façon. Une case touchée par une flèche <b>ne sert plus jamais</b>. Déplace-toi, puis tire une flèche sur <b>la case qui brille</b> !', done: 'Tchac ! Cette case est bloquée pour de bon. Chaque coup, c’est deux choses : bouger, puis tirer.' },
      { say: 'Ni les amazones ni les flèches ne peuvent <b>passer par-dessus une amazone ou une flèche</b>. Touche l’amazone qui brille : seules les cases qu’elle peut atteindre s’allument. Déplace-toi et tire !', done: 'Bravo ! Plus il y a de flèches, plus les chemins se resserrent.' },
      { say: 'Tu peux même tirer sur <b>la case que tu viens de quitter</b>, pour fermer la route derrière toi. Déplace l’amazone qui brille, puis tire <b>sur la case qu’elle a quittée</b> !', done: 'C’est ça ! Fermer la route derrière soi empêche l’adversaire d’entrer.' },
      { say: 'L’amazone noire en haut à droite est presque emmurée. Bouche la dernière sortie <b>avec une flèche ou une amazone</b> et enferme-la !', done: 'Enfermée ! Cette amazone noire ne peut plus faire un seul pas.' },
      { say: 'La règle la plus importante : <b>si aucune de tes amazones ne peut bouger à ton tour, tu perds</b> ! Il reste une amazone aux Noirs. Trouve le coup qui laisse <b>les Noirs sans aucun coup</b> !', done: 'Oui, gagné ! Le dernier à pouvoir bouger l’emporte.' },
      { say: 'Quand les flèches découpent le plateau en <b>pièces</b>, chaque amazone ne bouge plus que dans la sienne. Les Blancs, dans la grande (dorée), tiennent longtemps ; les Noirs, dans la petite (verte), sont bloqués les premiers. <b>Le plus grand territoire gagne</b>.' },
      { say: 'Tu connais les règles ! Pas de nulle : continue à bloquer avec tes flèches jusqu’au dernier coup. Allez, on joue !' },
    ] },
    pt: { name: 'Kero', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode ir aí!', stuck: 'Essa amazona não pode se mover agora', own: 'Toque numa amazona branca', want: 'Desta vez, siga a tarefa', shoot: 'Toque onde a flecha vai', win: 'As pretas não podem mover!',
      s: [
      { say: 'Croac! Eu sou o <b>Kero</b> e venho da selva sul-americana. Hoje vamos aprender <b>Amazons</b>, nascido na Argentina, neste tabuleiro 10×10!' },
      { say: 'Os dois lados começam com <b>quatro amazonas</b>. As que brilham são as suas amazonas brancas. <b>As brancas começam</b> e depois se joga em turnos.' },
      { say: 'A amazona anda como a <b>dama do xadrez</b>: qualquer distância <b>na vertical, horizontal ou diagonal</b>. Toque na amazona que brilha e leve-a a uma das casas que brilham!', done: 'Vuuum! Em linha reta ela vai tão longe quanto quiser.' },
      { say: 'Agora o principal: depois de se mover, ela <b>atira uma flecha</b> de onde chegou, do mesmo jeito. Uma casa com flecha <b>nunca mais pode ser usada</b>. Mova-se para algum lugar e atire uma flecha na <b>casa que brilha</b>!', done: 'Toc! Essa casa está bloqueada para sempre. Todo lance são duas coisas: mover e atirar.' },
      { say: 'Nem amazonas nem flechas podem <b>passar por cima de uma amazona ou de uma flecha</b>. Toque na amazona que brilha e só as casas que ela alcança vão brilhar. Mova-se e atire!', done: 'Boa! Quanto mais flechas, mais estreitos os caminhos.' },
      { say: 'Dá até para atirar na <b>casa que você acabou de deixar</b>, fechando o caminho atrás de você. Mova a amazona que brilha e atire <b>de volta na casa de onde saiu</b>!', done: 'Isso! Fechar o caminho às suas costas deixa o rival de fora.' },
      { say: 'A amazona preta lá em cima à direita está quase cercada. Feche a última saída <b>com uma flecha ou uma amazona</b> e prenda-a!', done: 'Presa! Essa amazona preta não consegue dar nem um passo.' },
      { say: 'A regra mais importante: <b>se nenhuma amazona sua puder se mover na sua vez, você perde</b>! As pretas têm só uma amazona. Ache o lance que deixa as pretas <b>sem nenhum lance</b>!', done: 'Isso, você venceu! Vence quem consegue se mover por último.' },
      { say: 'Quando as flechas dividem o tabuleiro em <b>salas</b>, cada amazona só se move dentro da sua. As brancas, na sala grande (dourada), duram mais; as pretas, na pequena (verde), param primeiro. <b>Vence quem constrói o maior território</b>.' },
      { say: 'Agora você sabe as regras! Não há empate, então continue bloqueando com flechas até o último lance. Vamos jogar!' },
    ] },
    de: { name: 'Kero', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dorthin kann sie nicht!', stuck: 'Diese Amazone kann gerade nicht ziehen', own: 'Tippe eine weiße Amazone an', want: 'Diesmal bitte genau die Aufgabe', shoot: 'Tippe das Feld für den Pfeil an', win: 'Schwarz kann nicht mehr ziehen!',
      s: [
      { say: 'Quak! Ich bin <b>Kero</b> aus dem Dschungel Südamerikas. Heute lernen wir <b>Amazons</b>, entstanden in Argentinien, auf diesem 10×10-Brett!' },
      { say: 'Beide Seiten beginnen mit <b>vier Amazonen</b>. Die leuchtenden sind deine weißen. <b>Weiß beginnt</b>, dann wird abwechselnd gezogen.' },
      { say: 'Eine Amazone zieht wie die <b>Dame im Schach</b>: beliebig weit <b>senkrecht, waagerecht oder diagonal</b>. Tippe die leuchtende Amazone an und zieh sie auf eins der leuchtenden Felder!', done: 'Wusch! In gerader Linie kommt sie so weit, wie sie will.' },
      { say: 'Jetzt das Wichtigste: Nach dem Zug <b>schießt sie einen Pfeil</b> vom Zielfeld aus, auf dieselbe Art. Ein Feld mit Pfeil <b>ist für immer gesperrt</b>. Zieh irgendwohin und schieß einen Pfeil auf <b>das leuchtende Feld</b>!', done: 'Tschack! Das Feld ist für immer zu. Jeder Zug besteht aus zwei Teilen: ziehen, dann schießen.' },
      { say: 'Weder Amazonen noch Pfeile können <b>über eine Amazone oder einen Pfeil hinweg</b>. Tippe die leuchtende Amazone an – nur die erreichbaren Felder leuchten. Zieh und schieß!', done: 'Gut! Je mehr Pfeile, desto enger die Wege.' },
      { say: 'Du darfst den Pfeil sogar auf <b>das Feld schießen, das du gerade verlassen hast</b> – so schließt du den Weg hinter dir. Zieh die leuchtende Amazone und schieß <b>zurück auf ihr Startfeld</b>!', done: 'Genau! Den Weg hinter sich zu schließen, hält den Gegner draußen.' },
      { say: 'Die schwarze Amazone oben rechts ist fast eingemauert. Versperr den letzten Ausgang <b>mit einem Pfeil oder einer Amazone</b> und sperr sie ein!', done: 'Eingesperrt! Diese schwarze Amazone kann keinen Schritt mehr machen.' },
      { say: 'Die wichtigste Regel: <b>Kann keine deiner Amazonen am Zug ziehen, hast du verloren</b>! Schwarz hat nur noch eine Amazone. Finde den Zug, nach dem <b>Schwarz gar nicht mehr ziehen kann</b>!', done: 'Ja – gewonnen! Wer zuletzt ziehen kann, gewinnt.' },
      { say: 'Teilen die Pfeile das Brett in <b>Räume</b>, zieht jede Amazone nur noch in ihrem eigenen. Weiß im großen Raum (gold) hält lange durch, Schwarz im kleinen (grün) ist zuerst am Ende. <b>Wer das größere Gebiet baut, gewinnt</b>.' },
      { say: 'Jetzt kennst du die Regeln! Remis gibt es nicht – sperr mit Pfeilen bis zum letzten Zug. Los geht’s!' },
    ] },
    ru: { name: 'Керо', next: 'Далее', back: 'Назад', start: 'Сыграть', again: 'Ещё раз', tap: 'Нажми на светящееся место', nope: 'Туда ей не пройти!', stuck: 'Эта амазонка сейчас не может ходить', own: 'Нажми на белую амазонку', want: 'На этот раз — по заданию', shoot: 'Нажми, куда полетит стрела', win: 'Чёрным некуда ходить!',
      s: [
      { say: 'Ква! Я <b>Керо</b>, родом из южноамериканских джунглей. Сегодня учим <b>«Амазонок»</b>, придуманных в Аргентине, на этой доске 10×10!' },
      { say: 'У каждой стороны <b>четыре амазонки</b>. Светятся твои белые. <b>Белые ходят первыми</b>, дальше — по очереди.' },
      { say: 'Амазонка ходит как <b>шахматный ферзь</b>: на любое расстояние <b>по вертикали, горизонтали или диагонали</b>. Нажми на светящуюся амазонку и переведи её на одно из светящихся полей!', done: 'Вжух! По прямой она уходит так далеко, как захочет.' },
      { say: 'А теперь главное: после хода она <b>выпускает стрелу</b> с поля, куда пришла, тем же способом. Поле со стрелой <b>больше никогда не используется</b>. Сходи куда-нибудь и выстрели на <b>светящееся поле</b>!', done: 'Тук! Это поле закрыто навсегда. Каждый ход — это два дела: сходить и выстрелить.' },
      { say: 'Ни амазонки, ни стрелы <b>не перепрыгивают амазонок и стрелы</b>. Нажми на светящуюся амазонку — засветятся только поля, куда она дойдёт. Сходи и выстрели!', done: 'Отлично! Чем больше стрел, тем уже дороги.' },
      { say: 'Стрелять можно даже <b>на поле, откуда ты только что ушла</b>, — закрывая путь за собой. Сходи светящейся амазонкой и выстрели <b>обратно на её прежнее поле</b>!', done: 'Верно! Закрытая за спиной дорога не пустит соперника.' },
      { say: 'Чёрная амазонка справа вверху почти замурована. Закрой последний выход <b>стрелой или амазонкой</b> — и запри её!', done: 'Заперта! Эта чёрная амазонка не может сделать ни шагу.' },
      { say: 'Самое главное правило: <b>если в свой ход ни одна твоя амазонка не может пойти — ты проиграл</b>! У чёрных осталась одна амазонка. Найди ход, после которого <b>чёрным совсем некуда ходить</b>!', done: 'Да — победа! Выигрывает тот, кто может сходить последним.' },
      { say: 'Когда стрелы делят доску на <b>комнаты</b>, каждая амазонка ходит только в своей. Белые в большой комнате (золотой) продержатся долго, чёрные в маленькой (зелёной) застрянут первыми. <b>Побеждает тот, у кого больше территория</b>.' },
      { say: 'Теперь ты знаешь правила! Ничьих нет — перекрывай стрелами до последнего хода. Вперёд, играем!' },
    ] },
    tr: { name: 'Kero', next: 'Sonraki', back: 'Geri', start: 'Oyna', again: 'Tekrar', tap: 'Parlayan yere dokun', nope: 'Oraya gidemez!', stuck: 'O amazon şu an hareket edemiyor', own: 'Beyaz bir amazona dokun', want: 'Bu sefer görevi takip et', shoot: 'Okun gideceği kareye dokun', win: 'Siyah hareket edemiyor!',
      s: [
      { say: 'Vırak! Ben <b>Kero</b>, Güney Amerika ormanlarından geldim. Bugün Arjantin doğumlu <b>Amazons</b>\'u bu 10×10 tahtada öğreniyoruz!' },
      { say: 'İki taraf da <b>dört amazonla</b> başlar. Parlayanlar senin beyaz amazonların. <b>Önce beyaz oynar</b>, sonra sırayla hamle yapılır.' },
      { say: 'Amazon <b>satrançtaki vezir</b> gibi yürür: <b>dikey, yatay ya da çapraz</b> istediği kadar. Parlayan amazona dokun ve parlayan karelerden birine götür!', done: 'Vııın! Düz bir çizgide istediği kadar uzağa gider.' },
      { say: 'Şimdi en önemlisi: yürüdükten sonra vardığı kareden aynı şekilde <b>bir ok atar</b>. Ok saplanan kare <b>bir daha asla kullanılamaz</b>. Bir yere git ve <b>parlayan kareye</b> ok at!', done: 'Tak! O kare artık kapalı. Her hamle iki iştir: yürü, sonra at.' },
      { say: 'Ne amazonlar ne de oklar <b>bir amazonun ya da okun üzerinden geçebilir</b>. Parlayan amazona dokun; yalnızca gidebileceği kareler parlar. Yürü ve at!', done: 'Harika! Ok çoğaldıkça yollar daralır.' },
      { say: 'Oku <b>az önce çıktığın kareye</b> bile atabilirsin; arkandaki yolu kapatırsın. Parlayan amazonu yürüt ve <b>çıktığı kareye geri</b> ok at!', done: 'İşte bu! Arkandaki yolu kapatmak rakibi dışarıda tutar.' },
      { say: 'Sağ üstteki siyah amazon neredeyse duvarla çevrili. Son çıkışı <b>bir okla ya da amazonla</b> kapat ve onu hapset!', done: 'Hapsedildi! Bu siyah amazon artık tek adım atamaz.' },
      { say: 'En önemli kural: <b>sıran geldiğinde hiçbir amazonun hareket edemiyorsa kaybedersin</b>! Siyahın tek amazonu kaldı. <b>Siyahı tamamen hamlesiz</b> bırakan hamleyi bul!', done: 'Evet, kazandın! Son hamleyi yapabilen kazanır.' },
      { say: 'Oklar tahtayı <b>odalara</b> böldüğünde her amazon yalnızca kendi odasında dolaşır. Büyük odadaki (altın) beyaz uzun süre dayanır, küçük odadaki (yeşil) siyah önce tükenir. <b>Büyük bölgeyi kuran kazanır</b>.' },
      { say: 'Artık kuralları biliyorsun! Beraberlik yok; son hamleye kadar oklarla kapatmaya devam et. Hadi oynayalım!' },
    ] },
    id: { name: 'Kero', next: 'Lanjut', back: 'Kembali', start: 'Main', again: 'Lagi', tap: 'Ketuk tempat yang bersinar', nope: 'Ia tidak bisa ke sana!', stuck: 'Amazon itu tidak bisa bergerak sekarang', own: 'Ketuk amazon putih', want: 'Kali ini, ikuti tugasnya', shoot: 'Ketuk tujuan panah', win: 'Hitam tidak bisa bergerak!',
      s: [
      { say: 'Kwek! Aku <b>Kero</b> dari hutan Amerika Selatan. Hari ini kita belajar <b>Amazons</b>, kelahiran Argentina, di papan 10×10 ini!' },
      { say: 'Kedua pihak mulai dengan <b>empat amazon</b>. Yang bersinar adalah amazon putihmu. <b>Putih jalan duluan</b>, lalu bergantian.' },
      { say: 'Amazon bergerak seperti <b>ratu catur</b>: sejauh apa pun <b>vertikal, horizontal, atau diagonal</b>. Ketuk amazon yang bersinar lalu pindahkan ke salah satu petak yang bersinar!', done: 'Wuusss! Di garis lurus ia bisa pergi sejauh mungkin.' },
      { say: 'Sekarang bagian penting: setelah bergerak, ia <b>melepas satu panah</b> dari petak tujuannya, dengan cara yang sama. Petak berpanah <b>tidak bisa dipakai lagi selamanya</b>. Bergeraklah ke mana saja, lalu panah ke <b>petak yang bersinar</b>!', done: 'Jleb! Petak itu tertutup selamanya. Setiap langkah ada dua hal: bergerak, lalu memanah.' },
      { say: 'Amazon maupun panah <b>tidak bisa melewati amazon atau panah</b>. Ketuk amazon yang bersinar, hanya petak yang bisa dicapai yang bersinar. Bergerak lalu memanahlah!', done: 'Bagus! Makin banyak panah, makin sempit jalannya.' },
      { say: 'Panah bahkan boleh dilepas ke <b>petak yang baru saja kamu tinggalkan</b>, menutup jalan di belakangmu. Gerakkan amazon yang bersinar, lalu panah <b>kembali ke petak asalnya</b>!', done: 'Benar! Menutup jalan di belakang membuat lawan tak bisa masuk.' },
      { say: 'Amazon hitam di kanan atas hampir terkurung. Tutup jalan keluar terakhir <b>dengan panah atau amazon</b> dan kurung dia!', done: 'Terkurung! Amazon hitam itu tak bisa melangkah sedikit pun.' },
      { say: 'Aturan paling penting: <b>jika di giliranmu tak satu pun amazonmu bisa bergerak, kamu kalah</b>! Hitam tinggal punya satu amazon. Temukan langkah yang membuat <b>hitam tak bisa bergerak sama sekali</b>!', done: 'Ya, kamu menang! Pemenangnya yang terakhir masih bisa bergerak.' },
      { say: 'Saat panah membagi papan menjadi <b>ruangan</b>, tiap amazon hanya bergerak di ruangannya sendiri. Putih di ruang besar (emas) bertahan lama, hitam di ruang kecil (hijau) habis duluan. <b>Yang membangun wilayah lebih luas menang</b>.' },
      { say: 'Sekarang kamu tahu aturannya! Tidak ada seri, jadi terus tutup dengan panah sampai langkah terakhir. Ayo main!' },
    ] },
    hi: { name: 'केरो', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकती जगह छुएँ', nope: 'वहाँ नहीं जा सकती!', stuck: 'यह अमेज़न अभी नहीं चल सकती', own: 'सफ़ेद अमेज़न को छुएँ', want: 'इस बार काम के हिसाब से चलो', shoot: 'तीर का खाना छुएँ', win: 'काला अब नहीं चल सकता!',
      s: [
      { say: 'टर्र-टर्र! मैं <b>केरो</b> हूँ, दक्षिण अमेरिका के जंगल से आया। आज इस 10×10 बोर्ड पर अर्जेंटीना में जन्मा <b>अमेज़न्स</b> सीखेंगे!' },
      { say: 'दोनों तरफ़ <b>चार-चार अमेज़न</b> से शुरुआत होती है। चमकती हुई तुम्हारी सफ़ेद अमेज़न हैं। <b>पहले सफ़ेद चलता है</b>, फिर बारी-बारी से।' },
      { say: 'अमेज़न <b>शतरंज की रानी</b> की तरह चलती है: <b>ऊपर-नीचे, दाएँ-बाएँ या तिरछे</b> कितनी भी दूर। चमकती अमेज़न को छुओ और किसी चमकते खाने पर ले जाओ!', done: 'सर्र! सीधी रेखा में वह जितनी चाहे दूर जा सकती है।' },
      { say: 'अब सबसे ज़रूरी बात: चलने के बाद वह जहाँ पहुँची वहाँ से उसी तरह <b>एक तीर चलाती है</b>। जिस खाने में तीर लगा, वह <b>फिर कभी काम नहीं आता</b>। कहीं भी चलो, फिर <b>चमकते खाने</b> पर तीर चलाओ!', done: 'ठक! वह खाना हमेशा के लिए बंद। हर चाल में दो काम: चलो, फिर तीर चलाओ।' },
      { say: 'न अमेज़न, न तीर — कोई भी <b>अमेज़न या तीर के ऊपर से नहीं जा सकता</b>। चमकती अमेज़न को छुओ, सिर्फ़ पहुँचने लायक खाने चमकेंगे। चलो और तीर चलाओ!', done: 'बढ़िया! जितने ज़्यादा तीर, उतने संकरे रास्ते।' },
      { say: 'तीर <b>अभी-अभी छोड़े हुए खाने</b> पर भी चला सकते हो — पीछे का रास्ता बंद करने के लिए। चमकती अमेज़न को चलाओ और <b>वापस उसी खाने पर</b> तीर चलाओ जहाँ से चली थी!', done: 'हाँ! पीछे का रास्ता बंद करने से विरोधी अंदर नहीं आ पाता।' },
      { say: 'ऊपर दाईं ओर की काली अमेज़न लगभग घिरी हुई है। आख़िरी रास्ता <b>तीर या अमेज़न से बंद</b> करो और उसे क़ैद कर दो!', done: 'क़ैद! यह काली अमेज़न अब एक क़दम भी नहीं चल सकती।' },
      { say: 'सबसे अहम नियम: <b>अपनी बारी पर अगर तुम्हारी कोई अमेज़न नहीं चल सकती, तो तुम हार गए</b>! काले की एक ही अमेज़न बची है। वह चाल ढूँढो जिसके बाद <b>काला बिल्कुल नहीं चल सके</b>!', done: 'हाँ — तुम जीत गए! आख़िर तक चल पाने वाला ही जीतता है।' },
      { say: 'जब तीर बोर्ड को <b>कमरों</b> में बाँट देते हैं, तो हर अमेज़न बस अपने कमरे में चलती है। बड़े कमरे (सुनहरा) में सफ़ेद देर तक चलेगा, छोटे (हरा) में काला पहले फँसेगा। <b>बड़ा इलाका बनाने वाला जीतता है</b>।' },
      { say: 'अब तुम नियम जान गए! ड्रॉ नहीं होता, इसलिए आख़िरी चाल तक तीरों से रास्ते बंद करते रहो। चलो, खेलें!' },
    ] },
    ar: { name: 'كيرو', next: 'التالي', back: 'رجوع', start: 'العب', again: 'مرة أخرى', tap: 'المس مكانًا مضيئًا', nope: 'لا يمكنها الذهاب إلى هناك!', stuck: 'لا تستطيع هذه الأمازونة الحركة الآن', own: 'المس أمازونة بيضاء', want: 'هذه المرة اتبع المهمة', shoot: 'المس مربع السهم', win: 'الأسود لا يستطيع الحركة!',
      s: [
      { say: 'نق نق! أنا <b>كيرو</b> من غابات أمريكا الجنوبية. اليوم نتعلم <b>الأمازونات</b>، المولودة في الأرجنتين، على هذه اللوحة 10×10!' },
      { say: 'يبدأ كل طرف بـ<b>أربع أمازونات</b>. المضيئة هي أمازوناتك البيضاء. <b>يبدأ الأبيض</b> ثم يتناوب الطرفان.' },
      { say: 'تتحرك الأمازونة مثل <b>وزير الشطرنج</b>: أي مسافة <b>عموديًا أو أفقيًا أو قطريًا</b>. المس الأمازونة المضيئة وانقلها إلى أحد المربعات المضيئة!', done: 'ووووش! في خط مستقيم تذهب إلى أبعد ما تريد.' },
      { say: 'والآن الأهم: بعد الحركة <b>ترمي سهمًا</b> من مربع وصولها بالطريقة نفسها. المربع الذي فيه سهم <b>لا يُستعمل أبدًا</b>. تحرّك إلى أي مكان ثم ارمِ سهمًا إلى <b>المربع المضيء</b>!', done: 'طق! أُغلق ذلك المربع إلى الأبد. كل نقلة شيئان: تحرّك ثم ارمِ.' },
      { say: 'لا الأمازونات ولا السهام <b>تمرّ فوق أمازونة أو سهم</b>. المس الأمازونة المضيئة فتضيء المربعات التي تبلغها فقط. تحرّك وارمِ!', done: 'أحسنت! كلما كثرت السهام ضاقت الطرق.' },
      { say: 'يمكنك أن ترمي السهم حتى إلى <b>المربع الذي غادرته للتو</b>، فتغلق الطريق خلفك. حرّك الأمازونة المضيئة ثم ارمِ <b>عائدًا إلى مربعها السابق</b>!', done: 'تمامًا! إغلاق الطريق خلفك يُبقي الخصم خارجًا.' },
      { say: 'الأمازونة السوداء في أعلى اليمين شبه محاصرة. أغلق المخرج الأخير <b>بسهم أو بأمازونة</b> واحبسها!', done: 'محبوسة! لا تستطيع هذه الأمازونة السوداء أن تخطو خطوة.' },
      { say: 'أهم قاعدة: <b>إن لم تستطع أي أمازونة لك الحركة في دورك فقد خسرت</b>! بقيت للأسود أمازونة واحدة. جد النقلة التي تترك <b>الأسود بلا أي نقلة</b>!', done: 'نعم، فزت! يفوز آخر من يستطيع الحركة.' },
      { say: 'حين تقسم السهام اللوحة إلى <b>غرف</b>، تتحرك كل أمازونة داخل غرفتها فقط. الأبيض في الغرفة الكبيرة (الذهبية) يصمد طويلًا، والأسود في الصغيرة (الخضراء) يعجز أولًا. <b>يفوز من يبني الأرض الأوسع</b>.' },
      { say: 'صرت تعرف القواعد! لا تعادل، فواصل الإغلاق بالسهام حتى آخر نقلة. هيا نلعب!' },
    ] },
  };

  /* ---------- little sounds: slides, an arrow's twang and thunk, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const lift = () => tone(520, 760, .07, .05, 'triangle');
    const put = () => { tone(700, 360, .09, .06, 'triangle'); tone(180, 90, .1, .12); };
    const shoot = () => tone(900, 520, .14, .04, 'triangle');
    const thunk = () => { tone(220, 90, .16, .2); tone(420, 160, .08, .05, 'triangle'); };
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { lift, put, shoot, thunk, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, A3 = T3.amazons;
    const board = A3.board(); T3.show('amazons', board); T3.play(true);
    const U = board.userData, TOP = U.top, Y = U.top - (U.sink || 0);
    if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.4, y: TOP + .4, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const idx = s => E.sqIdx(s);
    const xz = i => { const [r, c] = E.RC[i]; return U.pt(c, r); };
    const specOf = st => { const a = Array(N * N).fill('.'); st.w.forEach(s => { a[idx(s)] = 'w'; }); st.b.forEach(s => { a[idx(s)] = 'b'; }); (st.x || []).forEach(s => { a[idx(s)] = 'x'; }); return { b: a.join(''), side: 1, n: 0 }; };

    /* ---------- amazons and arrows ---------- */
    function mkAmazon(c) { const g = U.piece(c), sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; g.userData.col = c; board.add(g); return g; }
    function mkArrow(i) { const g = new TH.Group(), s = A3.scorch(), a = A3.arrow(); s.position.y = .003; g.add(s); a.rotation.y = (i * 2.399) % (Math.PI * 2); g.add(a); g.userData.arrow = a; g.userData.col = 5; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); A3.ignite(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { A3.douse(g); if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .04; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setBoard() {   // diff against what is already on the board: the same pieces stay, new ones drop in
      const old = pcs; pcs = {}; let n = 0;
      for (let i = 0; i < N * N; i++) {
        const k = pos.at(i); if (!k) continue;
        const c = k === 5 ? 5 : pos.owner(i), o = old[i];
        if (o && o.userData.col === c) { delete old[i]; pcs[i] = o; const [x, z] = xz(i); o.visible = true; o.position.x = x; o.position.z = z; o.scale.set(1, 1, 1); if (c !== 5) lift(o, 0); continue; }
        if (c === 5) { pcs[i] = mkArrow(i); continue; }
        const g = mkAmazon(c), [x, z] = xz(i); g.position.set(x, Y, z); pcs[i] = g;
        g.visible = false; const d = 40 + (n++) * 70;
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.3), () => { lift(g, 0); land(g); SFX.put(); }); }, d);
      }
      Object.values(old).forEach(drop);
      kick(300);
      return n;
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const bm = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function tile(i, color, op = .45, pulse = true) { const g = new TH.PlaneGeometry(.92, .92); g.rotateX(-Math.PI / 2); const m = new TH.Mesh(g, bm(color, op)); const [x, z] = xz(i); m.position.set(x, TOP + .006, z); m.userData.pulse = pulse; m.userData.flat = true; m.userData.op = op; m.renderOrder = 2; marks.add(m); return m; }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.14, .14, .012, 28), bm(color, .9)); const [x, z] = xz(i); m.position.set(x, TOP + .03, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function dia(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.16, .16, .012, 4), bm(color, .95)); const [x, z] = xz(i); m.position.set(x, TOP + .03, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color) { const m = new TH.Mesh(new TH.TorusGeometry(.42, .03, 8, 44), bm(color, .95)); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, TOP + .05, z); m.userData.pulse = true; m.userData.torus = true; m.renderOrder = 2; marks.add(m); return m; }
    // the marks' pulse runs only while something pulses (0 frames otherwise); a mark added starts it again
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .88 + k * .24; m.scale.set(s, m.userData.torus ? s : 1, s); } m.material.opacity = (m.userData.op || .9) * (.55 + .45 * k); } }); if (any) { kick(80); requestAnimationFrame(pulse); } else pulseOn = false; }
    { const add0 = marks.add.bind(marks); marks.add = (...a) => { const r = add0(...a); kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; }

    // the moves the task accepts (from the engine; 'go' asks only for the queen move: the arrow is left out)
    const freeAround = (p, i) => E.NB[i].filter(t => !p.sq[t]).length;
    function accepted(st) {
      const all = pos.moves(), T = (st.target || []).map(idx);
      if (st.act === 'go') return all.filter(m => T.includes(E.mTo(m)));
      if (st.act === 'shoot') return all.filter(m => T.includes(E.mArrow(m)));
      if (st.act === 'any') return all;
      if (st.act === 'back') return all.filter(m => E.mArrow(m) === E.mFrom(m));
      if (st.act === 'trap') { const q = idx(st.trap); return all.filter(m => { const p = pos.clone().play(m), ok = !freeAround(p, q); return ok; }); }
      if (st.act === 'win') return all.filter(m => !pos.clone().play(m).canMove(E.P2));
      return [];
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      (st.glow || []).forEach(s => tile(idx(s), 0xffc94a, .4));
      if (st.rooms) { roomTiles(); return; }
      if (!st.act || played) return;
      const A = accepted(st);
      if (sel) {
        ring(sel.to >= 0 ? sel.to : sel.from, 0xffc94a);
        if (sel.to < 0) new Set(sel.cands.map(E.mTo)).forEach(i => dot(i, A.some(m => E.mFrom(m) === sel.from && E.mTo(m) === i) ? 0x3fe0c4 : 0xc8f07a));
        else sel.cands.filter(m => E.mTo(m) === sel.to).forEach(m => dia(E.mArrow(m), A.includes(m) ? 0x3fe0c4 : 0xff8a60));
        if (st.act === 'back' && sel.to >= 0) tile(sel.from, 0x3fe0c4, .35);
        if (st.act === 'shoot') (st.target || []).forEach(s => tile(idx(s), 0x3fe0c4, .35));
        return;
      }
      new Set(A.map(E.mFrom)).forEach(f => ring(f, 0x3fe0c4));
      if (st.act === 'go') new Set(A.map(E.mTo)).forEach(i => tile(i, 0x3fe0c4, .35));
      else (st.target || []).forEach(s => tile(idx(s), 0x3fe0c4, .35));
      if (st.act === 'trap') { const q = idx(st.trap); E.NB[q].filter(t => !pos.sq[t]).forEach(t => tile(t, 0xff9a4a, .35)); }
      if (st.act === 'win') for (let i = 0; i < N * N; i++) if (pos.owner(i) === E.P2) E.NB[i].filter(t => !pos.sq[t]).forEach(t => tile(t, 0xff9a4a, .35));
    }
    // the rooms: every empty square White's amazon reaches by queen moves (gold) and Black's (green)
    function roomTiles() {
      const reach = from => { const seen = new Set([from]), q = [from]; while (q.length) { const f = q.shift(); for (const t of E.NB[f]) if (!pos.sq[t] && !seen.has(t)) { seen.add(t); q.push(t); } } seen.delete(from); return seen; };
      for (let i = 0; i < N * N; i++) { const c = pos.owner(i); if (!c) continue; reach(i).forEach(t => tile(t, c === E.P1 ? 0xffc94a : 0x3fe0c4, .32, false)); }
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 34);
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
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && played && !STEPS[step].last) go(step + 1); }, ms); }   // (the timer only draws the fill: the move on is ours)
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; deselect(true);
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      pos = E.Pos.from(specOf(st));
      const cnt = setBoard();
      later(showTask, 380 + cnt * 70);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'win') { tip(L.win); Object.values(pcs).forEach(g => { if (g.userData.col === 1) anim(700, k => lift(g, Math.sin(k * Math.PI) * .5)); }); }
      if (st.act === 'trap') { const g = pcs[idx(st.trap)]; if (g) anim(600, k => { g.rotation.z = Math.sin(k * Math.PI * 4) * .12 * (1 - k); }, () => { g.rotation.z = 0; }); }
      buttons(); autoNext();
    }
    function cellOf(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      const c = Math.floor(p.x + N / 2), r = Math.floor(p.z + N / 2);
      return c < 0 || c > N - 1 || r < 0 || r > N - 1 ? -1 : E.sqAt(r, c);
    }

    /* ---------- selection: amazon → destination → arrow ---------- */
    function select(i) {
      deselect(); sel = { from: i, to: -1, cands: pos.moves().filter(m => E.mFrom(m) === i) };
      const g = pcs[i]; if (g) { const h0 = hOf(g); anim(130, k => lift(g, h0 + (.24 - h0) * io(k))); }
      SFX.lift(); showTask();
    }
    function deselect(quiet) {
      if (sel) { const g = pcs[sel.from]; if (g) { const [x, z] = xz(sel.from), h0 = hOf(g); g.position.x = x; g.position.z = z; if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } }
      sel = null; if (!quiet) showTask();
    }
    function chooseTo(i) {
      sel.to = i; const g = pcs[sel.from];
      if (g) { const [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(i); anim(220, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; }); }
      tip(L.shoot); showTask();
    }
    // the queen move alone ('go'): she slides there and stays (no arrow in this lesson)
    function goOnly(i) {
      busy = true; const f = sel.from, g = pcs[f]; sel = null; clearMarks();
      delete pcs[f]; pcs[i] = g; pos.sq[i] = pos.sq[f]; pos.sq[f] = 0; for (let k = 0; k < 8; k++) if (pos.q[k] === f) pos.q[k] = i;
      const [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(i), h0 = hOf(g);
      anim(Math.min(520, 200 + 40 * Math.hypot(x1 - x0, z1 - z0)), k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * .18 + h0 * (1 - k)); },
        () => { lift(g, 0); land(g); SFX.put(); later(finish, 250); });
    }
    function play(m) {
      busy = true; clearMarks(); $('.cnt').innerHTML = '';
      const f = E.mFrom(m), to = E.mTo(m), a = E.mArrow(m), stepped = !!(sel && sel.to === to);
      const g = pcs[f]; sel = null; delete pcs[f]; pcs[to] = g; pos.play(m);
      const [x0, z0] = [g.position.x, g.position.z], [x1, z1] = xz(to), h0 = hOf(g);
      const qd = stepped ? 160 : Math.min(520, 200 + 40 * Math.hypot(x1 - x0, z1 - z0));
      anim(qd, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * (stepped ? 0 : .18) + h0 * (1 - k)); }, () => { lift(g, 0); land(g); SFX.put(); });
      const ad = Math.min(420, 150 + 32 * Math.hypot(xz(a)[0] - x1, xz(a)[1] - z1));
      later(() => { SFX.shoot(); A3.fly(board, Y, [x1, z1], xz(a), ad, anim); }, qd + 70);
      later(() => { const ag = mkArrow(a); pcs[a] = ag; const s = ag.userData.arrow; s.position.y = .22; anim(90, k => { s.position.y = .22 * (1 - k) - .03 * k; }); A3.strike(ag, anim); SFX.thunk(); kick(600); }, qd + 70 + ad - 10);
      later(finish, qd + 70 + ad + 420);
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) { if (sel) deselect(); return; }
      const A = accepted(st);
      if (sel && sel.to >= 0) {   // the arrow
        if (i === sel.to) { const f = sel.from; deselect(true); select(f); return; }
        const m = sel.cands.find(x => E.mTo(x) === sel.to && E.mArrow(x) === i);
        if (m == null) { say(L.nope); return; }
        if (!A.includes(m)) { say(st.act === 'win' || st.act === 'trap' ? L.want : L.want); return; }
        play(m); return;
      }
      if (pos.owner(i) === E.P1) {
        if (sel && sel.from === i) { deselect(); return; }
        if (!pos.moves().some(m => E.mFrom(m) === i)) { say(L.stuck); return; }
        select(i); return;
      }
      if (!sel) { say(L.own); return; }
      if (!sel.cands.some(m => E.mTo(m) === i)) { say(L.nope); return; }
      if (st.act === 'go') { if (A.some(m => E.mFrom(m) === sel.from && E.mTo(m) === i)) goOnly(i); else say(L.want); return; }
      if (!A.some(m => E.mFrom(m) === sel.from && E.mTo(m) === i)) { say(L.want); return; }
      chooseTo(i);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' : '<path d="m23 9-6 6M17 9l6 6"/>'}</svg>`; };
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
    loadEngine().then(e => { if (stopped) return; E = e; later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-amazons-rules-seen', '1'); } catch (e) {}
    const dbg = { step: () => step, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(m => E.name ? E.name(pos, m) : m) : null, moves: () => STEPS[step].act ? accepted(STEPS[step]) : null,
      at: s => { const [x, z] = xz(idx(s)); const v = T3.project ? T3.project(x, z, TOP) : null; return v; }, sel: () => sel, played: () => played };
    window.__amRules = dbg;
    return {
      stop() { stopped = true; if (window.__amRules === dbg) delete window.__amRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.amazons = { start };
})();
