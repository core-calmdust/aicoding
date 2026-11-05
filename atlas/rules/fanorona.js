/* =====================================================================
   Fanorona rules — a guided tour on the 3D table (the carved acacia board,
   atlas/models/fanorona.js), told by the guide character (Checkrab).
   A short hands-on course on the 9 × 5 board: the board and the start, a plain
   step along the lines, approach, withdrawal, picking one of the two, compulsory
   capture, capture chains (and their limits), how to win, draws.
   Every task is checked live by the game's own rules (../fanorona/engine.js):
   the player is White; the steps a task accepts come from the engine.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Points are given in the game's notation ('e3': columns a–i from the left, row 1 at the bottom).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-crab.webp', ENG = '../fanorona/engine.js?v=fb4';
  const loadEngine = () => window.FanoronaEngine ? Promise.resolve(window.FanoronaEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.FanoronaEngine ? res(window.FanoronaEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });

  // the boards (rows top → bottom = row 5 … row 1); 'w' White (you), 'b' Black
  const START = ['bbbbbbbbb', 'bbbbbbbbb', 'bwbw.bwbw', 'wwwwwwwww', 'wwwwwwwww'];
  const STEPS = [
    { g: START },
    { g: START, glow: ['e3'] },
    { g: ['b.......b', '.........', '....w....', '.........', '.........'], strong: true, act: 'paika' },
    { g: ['.......bb', '.........', 'w.bbb....', '.........', '.........'], act: 'A' },
    { g: ['........b', '.........', '.bbw.....', '.........', '.........'], act: 'W' },
    { g: ['........b', '.........', '.bbw.bb..', '.........', '.........'], act: 'choose' },
    { g: ['.........', '.........', '...w.bb..', '.........', 'w.......b'], act: 'cap', must: true },
    { g: ['...b....b', '.........', '..w.b....', '.........', '.........'], act: 'chain' },
    { g: ['...b....b', '.........', '..w.b....', '.........', '.........'], path: ['c3', 'd3', 'd4'] },
    { g: ['.........', '.........', '.........', '.........', '.w.bb....'], act: 'win' },
    { g: START, last: true },
  ];

  const TXT = {
    ja: { name: 'チェッカニ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないよ〜', stuck: 'その玉は今は動かせないよ', must: '取れる玉があるときは、取らなきゃダメ〜！', wrongA: '今回は「近づいて取る」動きをさがしてね', wrongW: '今回は「離れて取る」動きをさがしてね', pick: '取りたい列の玉をタップしてね', more: 'まだ取れるよ！ 光っている点へどうぞ', win: '勝ち！', s: [
      { say: 'やっほー、ぼくは<b>チェッカニ</b>！ 今日は<b>マダガスカル</b>で大人気のゲーム<b>ファノロナ</b>を、遊びながらいっしょに覚えようね。この盤はアカシアの木を彫って作ってあるんだ〜。' },
      { say: '盤は<b>9×5の点と線</b>。白と黒が<b>22こずつ</b>並んで、<b>真ん中の1点だけ空いて</b>いるよ（光っているところ）。<b>白が先手</b>で、手前の白があなたの玉だよ！' },
      { say: '玉は<b>線にそって、となりの空いた点へ1歩</b>動くよ。ななめの線があるのは<b>光っている点</b>だけなんだ。白をどこかへ1歩動かしてみて！', done: 'すいっ！ 何も取らないふつうの1歩は「パイカ」って呼ぶんだよ。' },
      { say: 'ここからがファノロナのおもしろいところ！ 相手の玉に<b>まっすぐ近づいて</b>止まると、その先に<b>つながって並んだ相手の玉をぜんぶ取れる</b>んだ。これが<b>接近</b>。白を右へ1歩！', done: '3こまとめて取れた〜！ 取った玉は手前の溝にコロンと並ぶよ。' },
      { say: '反対に、となりの相手の玉から<b>まっすぐ離れる</b>ように動いても、<b>うしろに並んだ玉を取れる</b>よ。これが<b>離脱</b>。白を黒から遠ざけてみて！', done: '離れながら取れたね！ 引いても攻めになるのがファノロナなんだ。' },
      { say: '同じ1歩で<b>接近と離脱の両方</b>で取れるときは、<b>どちらか一方</b>を選ぶよ。光っている点へ動いてから、取りたい列の玉をタップしてね！', done: '選んで取れた！ 多く取れる方がいつも正解とはかぎらないから、よく見てね。' },
      { say: '大事なきまり！ <b>取れる手があるときは、必ず取らなきゃダメ</b>なんだ。取れる玉が光っているよ。ほかの玉は動かせないから、取る手をさがしてね！', done: 'そのとおり！ 取りはがまんできないの。わざと取らせて連続取りをねらうワナもあるよ〜。' },
      { say: '取ったあと、<b>同じ玉でまだ取れるなら続けて取れる</b>よ（<b>連続取り</b>）！ 1回取ると次に取れる点が光るから、2回続けて取ってみて！', done: '連続取り、大成功〜！ これで一気に形勢が変わるんだ。' },
      { say: '連続取りのきまりだよ。<b>同じ向きに続けて進むのはダメ</b>、<b>一度通った点には戻れない</b>。それと、連続取りは<b>好きなところでやめてもOK</b>。やめたいときは、動かしている玉をタップすればおしまい！' },
      { say: '相手の玉を<b>ぜんぶ取る</b>か、相手が<b>1歩も動けなく</b>なったら勝ち！ 残りの黒をまとめて取って、勝負を決めちゃおう！', done: 'やったー、あなたの勝ち！ おめでとう〜！' },
      { say: 'おまけ：同じ局面が<b>3回</b>出るか、<b>80手</b>だれも取らないと引き分けだよ。序盤は取り合いがはげしいから、相手に<b>連続取りされない形</b>を意識するのがコツ。さあ、さっそく対局してみよう！' },
    ] },
    en: { name: 'Checkrab', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't go there!", stuck: "That ball can't move right now", must: 'When you can capture, you have to capture!', wrongA: 'This time, find a move that captures by coming closer', wrongW: 'This time, find a move that captures by backing away', pick: 'Tap a ball of the line you want to take', more: 'You can capture again! Go to a glowing spot', win: 'You win!', s: [
      { say: "Hi there, I'm <b>Checkrab</b>! Let's learn <b>Fanorona</b>, the game everyone loves in <b>Madagascar</b>, by playing it together. This board is carved from a block of acacia wood!" },
      { say: 'The board has <b>9×5 points joined by lines</b>. White and Black have <b>22 balls each</b>, and <b>only the middle point is empty</b> (the glowing one). <b>White moves first</b>, and the white balls at the front are yours!' },
      { say: 'A ball moves <b>along a line to the next empty point</b>, one step. Only the <b>glowing points</b> have diagonal lines. Move your white ball one step anywhere!', done: 'Swish! A plain step that captures nothing is called a <b>paika</b>.' },
      { say: 'Here comes the fun part! When you step <b>straight towards</b> an enemy ball, you capture <b>the whole line of enemy balls</b> beyond it. That is <b>approach</b>. Move your ball one step to the right!', done: 'Three at once! The captured balls roll into the groove in front of you.' },
      { say: 'Stepping <b>straight away</b> from a neighbouring enemy ball captures <b>the line behind you</b> too. That is <b>withdrawal</b>. Move your ball away from Black!', done: 'You captured while backing off! In Fanorona, retreating can be an attack.' },
      { say: 'When one step could capture by <b>approach or withdrawal</b>, you pick <b>just one</b>. Move to the glowing point, then tap a ball of the line you want!', done: 'You picked one! Taking more is not always best, so look carefully.' },
      { say: 'Big rule! <b>If you can capture, you must capture.</b> The ball that can capture is glowing. The other one may not move, so find the capture!', done: "That's right! You can't skip a capture. Some players even offer one on purpose to set up a chain." },
      { say: 'After a capture, if <b>the same ball can capture again, it keeps going</b> (a <b>chain</b>)! The next landing spot glows after each capture. Capture twice in a row!', done: 'A perfect chain! That can turn a game around in one turn.' },
      { say: 'Chain rules: <b>no two moves in the same direction in a row</b>, and <b>never back onto a point you already visited</b>. You may also <b>stop a chain whenever you like</b>: just tap the ball you are moving.' },
      { say: 'You win when you <b>capture every enemy ball</b>, or when your opponent <b>cannot move</b> at all. Take the last black balls and win the game!', done: 'Hooray, you win! Congratulations!' },
      { say: 'One more thing: a position that comes up <b>three times</b>, or <b>80 moves</b> with no capture, is a draw. The opening is full of captures, so keep a shape that does not give your opponent a <b>chain</b>. Now, let’s play a real game!' },
    ] },
    zh: { name: '跳棋蟹', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里走不了哦～', stuck: '这颗球现在不能动哦', must: '能吃的时候一定要吃哦！', wrongA: '这次请找“靠近来吃”的走法', wrongW: '这次请找“离开来吃”的走法', pick: '点击你想吃的那一列中的球', more: '还能继续吃！请走到发光的点', win: '你赢了！', s: [
      { say: '哈喽，我是<b>跳棋蟹</b>！今天一起边玩边学<b>马达加斯加</b>最受欢迎的游戏<b>法诺罗纳</b>吧。这块棋盘是用相思木雕出来的哦～' },
      { say: '棋盘有<b>9×5个点和连线</b>。白黑各<b>22颗</b>，<b>只有正中间一个点是空的</b>（发光的地方）。<b>白方先走</b>，前面的白球就是你的！' },
      { say: '球<b>沿着线走到相邻的空点</b>，一次一步。只有<b>发光的点</b>才有斜线哦。把白球往任意方向走一步试试！', done: '嗖！不吃子的普通一步叫作“<b>帕伊卡</b>”。' },
      { say: '有趣的来了！<b>笔直地靠近</b>对方的球停下，就能吃掉前方<b>连成一排的对方球</b>。这叫<b>接近</b>。把白球往右走一步！', done: '一下吃了3颗～！吃掉的球会滚进你面前的槽里。' },
      { say: '反过来，从相邻的对方球<b>笔直地离开</b>，也能吃掉<b>身后那一排</b>。这叫<b>撤离</b>。让白球离开黑球吧！', done: '边退边吃！法诺罗纳里后退也能变成进攻哦。' },
      { say: '同一步既能<b>接近吃</b>又能<b>撤离吃</b>时，<b>只能选一种</b>。先走到发光的点，再点击想吃的那一列的球！', done: '选好了！吃得多不一定最好，要仔细看哦。' },
      { say: '重要规则！<b>有子可吃时一定要吃</b>。能吃子的球在发光。别的球不能动，快找吃子的走法！', done: '没错！吃子是不能忍的。也有人故意送吃来设连吃的陷阱哦～' },
      { say: '吃完后，<b>同一颗球如果还能吃就可以接着吃</b>（<b>连吃</b>）！每吃一次，下一个落点会发光，连吃两次试试！', done: '连吃大成功～！一下子就能扭转局势。' },
      { say: '连吃的规则：<b>不能连续朝同一个方向走</b>，<b>不能回到走过的点</b>。另外连吃<b>随时可以停</b>，想停的时候点一下正在走的球就好！' },
      { say: '<b>吃光</b>对方所有的球，或者对方<b>一步也走不了</b>，就赢了！把剩下的黑球一起吃掉，结束比赛吧！', done: '耶，你赢了！恭喜～！' },
      { say: '补充：同一局面出现<b>3次</b>，或连续<b>80手</b>没人吃子，就是和棋。开局吃来吃去很激烈，注意别留下让对方<b>连吃</b>的形状。来，马上下一盘吧！' },
    ] },
    ko: { name: '체카니', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기로는 못 가요~', stuck: '그 구슬은 지금 못 움직여요', must: '잡을 수 있으면 꼭 잡아야 해요!', wrongA: '이번엔 "다가가서 잡는" 수를 찾아봐요', wrongW: '이번엔 "물러나며 잡는" 수를 찾아봐요', pick: '잡고 싶은 줄의 구슬을 탭해요', more: '또 잡을 수 있어요! 빛나는 점으로', win: '승리!', s: [
      { say: '안녕, 나는 <b>체카니</b>! 오늘은 <b>마다가스카르</b>에서 인기 만점인 게임 <b>파노로나</b>를 같이 놀면서 배워 보자. 이 판은 아카시아 나무를 깎아서 만들었어~' },
      { say: '판은 <b>9×5개의 점과 선</b>이야. 백과 흑이 <b>22개씩</b> 놓이고 <b>가운데 한 점만 비어</b> 있어(빛나는 곳). <b>백이 먼저</b> 두고, 앞쪽 백 구슬이 네 거야!' },
      { say: '구슬은 <b>선을 따라 옆의 빈 점으로 한 칸</b> 움직여. 대각선이 있는 건 <b>빛나는 점</b>뿐이야. 백을 아무 데나 한 칸 움직여 봐!', done: '슝! 아무것도 잡지 않는 보통 한 걸음은 <b>파이카</b>라고 해.' },
      { say: '여기부터가 재밌어! 상대 구슬 쪽으로 <b>곧장 다가가서</b> 멈추면, 그 앞에 <b>줄지어 선 상대 구슬을 전부 잡아</b>. 이게 <b>접근</b>이야. 백을 오른쪽으로 한 칸!', done: '한 번에 3개~! 잡은 구슬은 앞쪽 홈에 데굴 굴러가.' },
      { say: '반대로 옆의 상대 구슬에서 <b>곧장 멀어지듯</b> 움직여도 <b>뒤에 늘어선 구슬을 잡을 수 있어</b>. 이게 <b>이탈</b>이야. 백을 흑에게서 떨어뜨려 봐!', done: '물러나면서 잡았네! 파노로나에선 후퇴도 공격이 돼.' },
      { say: '한 걸음으로 <b>접근과 이탈 둘 다</b> 잡을 수 있을 땐 <b>하나만</b> 골라. 빛나는 점으로 움직인 다음, 잡고 싶은 줄의 구슬을 탭해!', done: '골라서 잡았다! 많이 잡는 게 늘 정답은 아니니까 잘 봐.' },
      { say: '중요한 규칙! <b>잡을 수 있는 수가 있으면 꼭 잡아야 해</b>. 잡을 수 있는 구슬이 빛나고 있어. 다른 구슬은 못 움직이니까 잡는 수를 찾아 봐!', done: '맞아! 잡기는 참을 수 없어. 일부러 잡히게 해서 연속 잡기를 노리는 함정도 있어~' },
      { say: '잡은 뒤에 <b>같은 구슬로 또 잡을 수 있으면 계속 잡을 수 있어</b>(<b>연속 잡기</b>)! 한 번 잡으면 다음 점이 빛나. 두 번 연속으로 잡아 봐!', done: '연속 잡기 대성공~! 이걸로 형세가 단숨에 바뀌어.' },
      { say: '연속 잡기 규칙이야. <b>같은 방향으로 연달아 가면 안 돼</b>, <b>한 번 지나간 점에는 못 돌아가</b>. 그리고 연속 잡기는 <b>언제든 멈춰도 돼</b>. 멈추고 싶으면 움직이던 구슬을 탭하면 끝!' },
      { say: '상대 구슬을 <b>전부 잡거나</b>, 상대가 <b>한 걸음도 못 움직이면</b> 승리! 남은 흑을 한꺼번에 잡아서 승부를 내자!', done: '야호, 네가 이겼어! 축하해~!' },
      { say: '덤: 같은 국면이 <b>3번</b> 나오거나 <b>80수</b> 동안 아무도 못 잡으면 무승부야. 초반은 잡고 잡히는 싸움이 치열하니까 상대에게 <b>연속 잡기를 내주지 않는 모양</b>을 생각하는 게 요령이야. 자, 바로 대국해 보자!' },
    ] },
    es: { name: 'Checkrab', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡Ahí no puede ir!', stuck: 'Esa bola no puede moverse ahora', must: '¡Si puedes capturar, tienes que capturar!', wrongA: 'Esta vez, busca una jugada que capture acercándose', wrongW: 'Esta vez, busca una jugada que capture alejándose', pick: 'Toca una bola de la línea que quieres capturar', more: '¡Puedes capturar otra vez! Ve a un punto que brilla', win: '¡Ganaste!', s: [
      { say: '¡Hola, soy <b>Checkrab</b>! Vamos a aprender <b>Fanorona</b>, el juego favorito de <b>Madagascar</b>, jugando juntos. ¡Este tablero está tallado en un bloque de madera de acacia!' },
      { say: 'El tablero tiene <b>9×5 puntos unidos por líneas</b>. Blancas y negras tienen <b>22 bolas cada una</b> y <b>solo el punto del centro está vacío</b> (el que brilla). <b>Empiezan las blancas</b>, ¡y las blancas de delante son tuyas!' },
      { say: 'Una bola se mueve <b>por una línea al punto vacío de al lado</b>, un paso. Solo los <b>puntos que brillan</b> tienen líneas diagonales. ¡Mueve tu bola blanca un paso a donde quieras!', done: '¡Zas! Un paso normal sin capturar se llama <b>paika</b>.' },
      { say: '¡Ahora viene lo divertido! Si das un paso <b>directo hacia</b> una bola enemiga, capturas <b>toda la fila de bolas enemigas</b> que sigue. Eso es la <b>aproximación</b>. ¡Mueve tu bola un paso a la derecha!', done: '¡Tres de golpe! Las bolas capturadas ruedan a la ranura que tienes delante.' },
      { say: 'Si te alejas <b>en línea recta</b> de una bola enemiga vecina, también capturas <b>la fila que queda detrás</b>. Eso es la <b>retirada</b>. ¡Aleja tu bola de las negras!', done: '¡Capturaste retrocediendo! En Fanorona, retirarse también es atacar.' },
      { say: 'Si un mismo paso captura por <b>aproximación o por retirada</b>, eliges <b>solo una</b>. ¡Ve al punto que brilla y toca una bola de la fila que quieres!', done: '¡Elegiste! Capturar más no siempre es lo mejor, así que mira bien.' },
      { say: '¡Regla importante! <b>Si puedes capturar, debes capturar.</b> La bola que puede capturar está brillando. La otra no puede moverse, ¡así que busca la captura!', done: '¡Exacto! No puedes saltarte una captura. Hay quien la ofrece a propósito para preparar una cadena.' },
      { say: 'Tras capturar, si <b>la misma bola puede volver a capturar, sigue</b> (una <b>cadena</b>). Después de cada captura brilla el siguiente punto. ¡Captura dos veces seguidas!', done: '¡Cadena perfecta! Puede darle la vuelta a la partida en un solo turno.' },
      { say: 'Reglas de la cadena: <b>no puedes ir dos veces seguidas en la misma dirección</b> ni <b>volver a un punto por el que ya pasaste</b>. Además, puedes <b>parar la cadena cuando quieras</b>: solo toca la bola que estás moviendo.' },
      { say: 'Ganas si <b>capturas todas las bolas enemigas</b> o si tu rival <b>no puede moverse</b>. ¡Captura las últimas negras y gana la partida!', done: '¡Bien, ganaste! ¡Felicidades!' },
      { say: 'Una cosa más: si una posición se repite <b>tres veces</b>, o pasan <b>80 jugadas</b> sin capturas, es tablas. La apertura está llena de capturas, así que evita formas que regalen una <b>cadena</b> a tu rival. ¡Ahora, a jugar una partida de verdad!' },
    ] },
    fr: { name: 'Checkrab', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touchez un point qui brille', nope: 'Elle ne peut pas aller là !', stuck: 'Cette bille ne peut pas bouger pour l’instant', must: 'Quand tu peux prendre, tu dois prendre !', wrongA: 'Cette fois, trouve un coup qui prend en s’approchant', wrongW: 'Cette fois, trouve un coup qui prend en s’éloignant', pick: 'Touche une bille de la ligne à prendre', more: 'Tu peux reprendre ! Va sur un point qui brille', win: 'Gagné !', s: [
      { say: 'Coucou, moi c’est <b>Checkrab</b> ! Apprenons ensemble le <b>Fanorona</b>, le jeu chouchou de <b>Madagascar</b>, en jouant. Ce plateau est sculpté dans un bloc d’acacia !' },
      { say: 'Le plateau a <b>9×5 points reliés par des lignes</b>. Blancs et Noirs ont <b>22 billes chacun</b>, et <b>seul le point du milieu est vide</b> (celui qui brille). <b>Les Blancs commencent</b>, et les billes blanches devant toi sont à toi !' },
      { say: 'Une bille avance <b>le long d’une ligne jusqu’au point vide voisin</b>, d’un pas. Seuls les <b>points qui brillent</b> ont des diagonales. Avance ta bille blanche d’un pas, où tu veux !', done: 'Hop ! Un pas simple qui ne prend rien s’appelle un <b>paika</b>.' },
      { say: 'Voici le plus amusant ! Si tu avances <b>droit vers</b> une bille ennemie, tu prends <b>toute la ligne de billes ennemies</b> qui suit. C’est l’<b>approche</b>. Avance ta bille d’un pas vers la droite !', done: 'Trois d’un coup ! Les billes prises roulent dans la rainure devant toi.' },
      { say: 'En t’éloignant <b>tout droit</b> d’une bille ennemie voisine, tu prends aussi <b>la ligne derrière toi</b>. C’est le <b>retrait</b>. Éloigne ta bille des Noirs !', done: 'Tu as pris en reculant ! Au Fanorona, reculer peut être une attaque.' },
      { say: 'Quand un même pas prend par <b>approche ou par retrait</b>, tu en choisis <b>un seul</b>. Va sur le point qui brille, puis touche une bille de la ligne voulue !', done: 'Choix fait ! Prendre plus n’est pas toujours le mieux, regarde bien.' },
      { say: 'Règle importante ! <b>Si tu peux prendre, tu dois prendre.</b> La bille qui peut prendre brille. L’autre ne peut pas bouger, alors trouve la prise !', done: 'Exactement ! On ne peut pas éviter une prise. Certains en offrent une exprès pour préparer une chaîne.' },
      { say: 'Après une prise, si <b>la même bille peut reprendre, elle continue</b> (une <b>chaîne</b>) ! Après chaque prise, le point suivant brille. Prends deux fois de suite !', done: 'Chaîne réussie ! Ça peut retourner une partie en un seul tour.' },
      { say: 'Règles de la chaîne : <b>jamais deux fois de suite dans la même direction</b>, et <b>jamais sur un point déjà visité</b>. Tu peux aussi <b>arrêter la chaîne quand tu veux</b> : touche simplement la bille que tu déplaces.' },
      { say: 'Tu gagnes en <b>prenant toutes les billes ennemies</b>, ou quand l’adversaire <b>ne peut plus bouger</b>. Prends les dernières billes noires et remporte la partie !', done: 'Bravo, tu as gagné ! Félicitations !' },
      { say: 'Encore une chose : une position répétée <b>trois fois</b>, ou <b>80 coups</b> sans prise, donne une partie nulle. L’ouverture regorge de prises : évite les formes qui offrent une <b>chaîne</b> à l’adversaire. Allez, jouons une vraie partie !' },
    ] },
    pt: { name: 'Checkrab', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode ir para lá!', stuck: 'Essa bola não pode se mover agora', must: 'Quando dá para capturar, tem que capturar!', wrongA: 'Desta vez, ache um lance que captura se aproximando', wrongW: 'Desta vez, ache um lance que captura se afastando', pick: 'Toque numa bola da linha que quer capturar', more: 'Dá para capturar de novo! Vá a um ponto que brilha', win: 'Você venceu!', s: [
      { say: 'Oi, eu sou o <b>Checkrab</b>! Vamos aprender <b>Fanorona</b>, o jogo queridinho de <b>Madagascar</b>, jogando juntos. Este tabuleiro foi entalhado num bloco de acácia!' },
      { say: 'O tabuleiro tem <b>9×5 pontos ligados por linhas</b>. Brancas e pretas têm <b>22 bolas cada</b>, e <b>só o ponto do meio está vazio</b> (o que brilha). <b>As brancas começam</b>, e as bolas brancas da frente são suas!' },
      { say: 'Uma bola anda <b>por uma linha até o ponto vazio vizinho</b>, um passo. Só os <b>pontos que brilham</b> têm linhas diagonais. Mova sua bola branca um passo para onde quiser!', done: 'Vupt! Um passo comum, sem captura, se chama <b>paika</b>.' },
      { say: 'Agora vem a parte divertida! Se você der um passo <b>direto em direção</b> a uma bola inimiga, captura <b>toda a fila de bolas inimigas</b> à frente. Isso é a <b>aproximação</b>. Mova sua bola um passo para a direita!', done: 'Três de uma vez! As bolas capturadas rolam para a canaleta à sua frente.' },
      { say: 'Se você se afastar <b>em linha reta</b> de uma bola inimiga vizinha, também captura <b>a fila que ficou atrás</b>. Isso é a <b>retirada</b>. Afaste sua bola das pretas!', done: 'Você capturou recuando! No Fanorona, recuar também é atacar.' },
      { say: 'Quando o mesmo passo captura por <b>aproximação ou retirada</b>, você escolhe <b>só uma</b>. Vá ao ponto que brilha e toque numa bola da fila que quer!', done: 'Escolhido! Capturar mais nem sempre é o melhor, então olhe bem.' },
      { say: 'Regra importante! <b>Se dá para capturar, é obrigatório capturar.</b> A bola que pode capturar está brilhando. A outra não pode se mover, então ache a captura!', done: 'Isso mesmo! Não dá para pular uma captura. Tem gente que oferece uma de propósito para armar uma corrente.' },
      { say: 'Depois de capturar, se <b>a mesma bola puder capturar de novo, ela continua</b> (uma <b>corrente</b>)! A cada captura o próximo ponto brilha. Capture duas vezes seguidas!', done: 'Corrente perfeita! Isso vira a partida num só turno.' },
      { say: 'Regras da corrente: <b>nada de ir duas vezes seguidas na mesma direção</b>, nem <b>voltar a um ponto por onde já passou</b>. E você pode <b>parar a corrente quando quiser</b>: é só tocar na bola que está movendo.' },
      { say: 'Você vence ao <b>capturar todas as bolas inimigas</b>, ou quando o adversário <b>não consegue se mover</b>. Capture as últimas pretas e vença!', done: 'Eba, você venceu! Parabéns!' },
      { say: 'Só mais uma coisa: uma posição repetida <b>três vezes</b>, ou <b>80 lances</b> sem captura, é empate. A abertura tem muitas capturas, então evite formas que deem uma <b>corrente</b> ao adversário. Vamos jogar de verdade!' },
    ] },
    de: { name: 'Checkrab', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dahin geht es nicht!', stuck: 'Diese Kugel kann gerade nicht ziehen', must: 'Wenn du schlagen kannst, musst du schlagen!', wrongA: 'Diesmal suchst du einen Zug, der beim Annähern schlägt', wrongW: 'Diesmal suchst du einen Zug, der beim Zurückweichen schlägt', pick: 'Tippe eine Kugel der Reihe an, die du schlagen willst', more: 'Du kannst weiterschlagen! Auf einen leuchtenden Punkt', win: 'Gewonnen!', s: [
      { say: 'Hallo, ich bin <b>Checkrab</b>! Lass uns zusammen <b>Fanorona</b> lernen, das Lieblingsspiel auf <b>Madagaskar</b>, und zwar beim Spielen. Dieses Brett ist aus einem Block Akazienholz geschnitzt!' },
      { say: 'Das Brett hat <b>9×5 Punkte, verbunden durch Linien</b>. Weiß und Schwarz haben je <b>22 Kugeln</b>, und <b>nur der Punkt in der Mitte ist frei</b> (der leuchtende). <b>Weiß beginnt</b>, und die weißen Kugeln vorne gehören dir!' },
      { say: 'Eine Kugel zieht <b>entlang einer Linie auf den freien Nachbarpunkt</b>, einen Schritt. Nur die <b>leuchtenden Punkte</b> haben Diagonalen. Zieh deine weiße Kugel einen Schritt, wohin du magst!', done: 'Schwupp! Ein einfacher Schritt ohne Schlagen heißt <b>Paika</b>.' },
      { say: 'Jetzt wird es lustig! Gehst du <b>direkt auf</b> eine gegnerische Kugel zu, schlägst du <b>die ganze Reihe gegnerischer Kugeln</b> dahinter. Das ist die <b>Annäherung</b>. Zieh deine Kugel einen Schritt nach rechts!', done: 'Drei auf einmal! Die geschlagenen Kugeln rollen in die Rille vor dir.' },
      { say: 'Gehst du <b>gerade weg</b> von einer benachbarten gegnerischen Kugel, schlägst du auch <b>die Reihe hinter dir</b>. Das ist der <b>Rückzug</b>. Zieh deine Kugel von Schwarz weg!', done: 'Du hast beim Zurückweichen geschlagen! Bei Fanorona kann Rückzug ein Angriff sein.' },
      { say: 'Kann ein Schritt per <b>Annäherung oder Rückzug</b> schlagen, wählst du <b>nur eines</b>. Geh auf den leuchtenden Punkt und tippe dann eine Kugel der gewünschten Reihe an!', done: 'Gewählt! Mehr schlagen ist nicht immer besser, also schau genau hin.' },
      { say: 'Wichtige Regel! <b>Wer schlagen kann, muss schlagen.</b> Die Kugel, die schlagen kann, leuchtet. Die andere darf nicht ziehen, also finde den Schlag!', done: 'Genau! Einen Schlag kann man nicht auslassen. Manche bieten sogar absichtlich einen an, um eine Kette vorzubereiten.' },
      { say: 'Kann <b>dieselbe Kugel nach dem Schlag erneut schlagen, macht sie weiter</b> (eine <b>Kette</b>)! Nach jedem Schlag leuchtet der nächste Punkt. Schlag zweimal hintereinander!', done: 'Perfekte Kette! Damit kippt eine Partie in einem einzigen Zug.' },
      { say: 'Kettenregeln: <b>nie zweimal hintereinander in dieselbe Richtung</b> und <b>nie zurück auf einen schon besuchten Punkt</b>. Außerdem darfst du <b>die Kette jederzeit beenden</b>: tippe einfach die Kugel an, die du ziehst.' },
      { say: 'Du gewinnst, wenn du <b>alle gegnerischen Kugeln schlägst</b> oder der Gegner <b>gar nicht mehr ziehen kann</b>. Schlag die letzten schwarzen Kugeln und gewinne!', done: 'Juhu, gewonnen! Herzlichen Glückwunsch!' },
      { say: 'Noch etwas: Kommt eine Stellung <b>dreimal</b> vor oder gibt es <b>80 Züge</b> ohne Schlag, ist es remis. In der Eröffnung wird viel geschlagen, also meide Formen, die dem Gegner eine <b>Kette</b> schenken. Jetzt spielen wir eine echte Partie!' },
    ] },
    hi: { name: 'चेकरैब', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'वहाँ नहीं जा सकते!', stuck: 'यह गोली अभी नहीं चल सकती', must: 'जब पकड़ सकते हो, तो पकड़ना ही होगा!', wrongA: 'इस बार "पास जाकर पकड़ने" वाली चाल ढूँढो', wrongW: 'इस बार "दूर हटकर पकड़ने" वाली चाल ढूँढो', pick: 'जिस पंक्ति को पकड़ना है, उसकी कोई गोली टैप करो', more: 'फिर से पकड़ सकते हो! चमकते बिंदु पर जाओ', win: 'तुम जीते!', s: [
      { say: 'हैलो, मैं हूँ <b>चेकरैब</b>! आज खेलते-खेलते साथ में <b>मेडागास्कर</b> का सबसे पसंदीदा खेल <b>फ़ानोरोना</b> सीखते हैं। यह बोर्ड बबूल की लकड़ी को तराशकर बना है!' },
      { say: 'बोर्ड पर <b>रेखाओं से जुड़े 9×5 बिंदु</b> हैं। सफ़ेद और काले की <b>22-22 गोलियाँ</b> हैं, और <b>सिर्फ़ बीच का एक बिंदु खाली</b> है (चमकता हुआ)। <b>सफ़ेद पहले चलता है</b>, और आगे की सफ़ेद गोलियाँ तुम्हारी हैं!' },
      { say: 'गोली <b>रेखा के साथ पास के खाली बिंदु पर एक कदम</b> चलती है। तिरछी रेखाएँ सिर्फ़ <b>चमकते बिंदुओं</b> पर हैं। अपनी सफ़ेद गोली को कहीं भी एक कदम चलाओ!', done: 'सर्र! बिना पकड़े सामान्य कदम को <b>पाइका</b> कहते हैं।' },
      { say: 'अब मज़ेदार हिस्सा! दुश्मन की गोली की ओर <b>सीधे पास जाकर</b> रुकने पर, आगे <b>लगातार खड़ी दुश्मन की सारी गोलियाँ</b> पकड़ी जाती हैं। इसे <b>पास जाना (अप्रोच)</b> कहते हैं। अपनी गोली को दाईं ओर एक कदम चलाओ!', done: 'एक साथ तीन! पकड़ी गई गोलियाँ तुम्हारे सामने की नाली में लुढ़क जाती हैं।' },
      { say: 'उल्टा, पास वाली दुश्मन की गोली से <b>सीधे दूर हटने</b> पर भी <b>पीछे की पंक्ति</b> पकड़ी जाती है। इसे <b>दूर हटना (विदड्रॉअल)</b> कहते हैं। अपनी गोली को काले से दूर ले जाओ!', done: 'पीछे हटते हुए पकड़ लिया! फ़ानोरोना में पीछे हटना भी हमला बन सकता है।' },
      { say: 'जब एक ही कदम से <b>पास जाकर और दूर हटकर दोनों</b> तरह पकड़ सकते हो, तो <b>सिर्फ़ एक</b> चुनो। चमकते बिंदु पर जाओ, फिर जिस पंक्ति को पकड़ना है उसकी गोली टैप करो!', done: 'चुन लिया! ज़्यादा पकड़ना हमेशा सही नहीं होता, ध्यान से देखो।' },
      { say: 'ज़रूरी नियम! <b>जब पकड़ सकते हो, तो पकड़ना ही होगा।</b> जो गोली पकड़ सकती है, वह चमक रही है। दूसरी गोली नहीं चल सकती, पकड़ने वाली चाल ढूँढो!', done: 'बिल्कुल सही! पकड़ना छोड़ा नहीं जा सकता। कुछ लोग जानबूझकर पकड़ने देते हैं ताकि लगातार पकड़ का जाल बिछा सकें।' },
      { say: 'पकड़ने के बाद, अगर <b>वही गोली फिर पकड़ सके तो आगे जारी रख सकते हो</b> (<b>लगातार पकड़</b>)! हर बार अगला बिंदु चमकेगा। लगातार दो बार पकड़ो!', done: 'लगातार पकड़ कामयाब! इससे एक ही बारी में खेल पलट सकता है।' },
      { say: 'लगातार पकड़ के नियम: <b>एक ही दिशा में लगातार दो बार नहीं</b>, और <b>पहले से गुज़रे बिंदु पर वापस नहीं</b>। और <b>जब चाहो रुक सकते हो</b>: बस चल रही गोली को टैप करो।' },
      { say: 'दुश्मन की <b>सारी गोलियाँ पकड़ लो</b> या दुश्मन <b>बिल्कुल न चल सके</b>, तो तुम जीते! बची हुई काली गोलियाँ पकड़कर खेल जीतो!', done: 'वाह, तुम जीत गए! बधाई हो!' },
      { say: 'एक और बात: एक ही स्थिति <b>तीन बार</b> आए, या <b>80 चालों</b> तक कोई न पकड़े, तो ड्रॉ होता है। शुरुआत में खूब पकड़ होती है, इसलिए ऐसा आकार न बनाओ जिससे दुश्मन को <b>लगातार पकड़</b> मिले। चलो, अब असली खेल खेलते हैं!' },
    ] },
    ar: { name: 'تشيكراب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'انقر نقطة متوهجة', nope: 'لا يمكنها الذهاب إلى هناك!', stuck: 'هذه الكرة لا تستطيع الحركة الآن', must: 'عندما تستطيع الأسر، يجب أن تأسر!', wrongA: 'هذه المرة ابحث عن نقلة تأسر بالاقتراب', wrongW: 'هذه المرة ابحث عن نقلة تأسر بالابتعاد', pick: 'انقر كرة من الصف الذي تريد أسره', more: 'يمكنك الأسر مجددًا! اذهب إلى نقطة متوهجة', win: 'فزت!', s: [
      { say: 'مرحبًا، أنا <b>تشيكراب</b>! لنتعلّم معًا <b>فانورونا</b>، اللعبة المحبوبة في <b>مدغشقر</b>، ونحن نلعب. هذه الرقعة منحوتة من قطعة خشب أكاسيا!' },
      { say: 'في الرقعة <b>9×5 نقاط تصلها خطوط</b>. لكل من الأبيض والأسود <b>22 كرة</b>، و<b>النقطة الوسطى وحدها فارغة</b> (المتوهجة). <b>الأبيض يبدأ</b>، والكرات البيضاء في الأمام لك!' },
      { say: 'تتحرك الكرة <b>على خط إلى النقطة الفارغة المجاورة</b>، خطوة واحدة. <b>النقاط المتوهجة</b> وحدها لها خطوط قطرية. حرّك كرتك البيضاء خطوة إلى أي مكان!', done: 'هوب! الخطوة العادية بلا أسر تُسمّى <b>بايكا</b>.' },
      { say: 'وهنا يأتي الممتع! إذا تقدّمت <b>مباشرة نحو</b> كرة عدوة، تأسر <b>كل صف الكرات العدوة</b> المتتالية بعدها. هذا هو <b>الاقتراب</b>. حرّك كرتك خطوة إلى اليمين!', done: 'ثلاث دفعة واحدة! تتدحرج الكرات المأسورة إلى المجرى أمامك.' },
      { say: 'وإذا ابتعدت <b>في خط مستقيم</b> عن كرة عدوة مجاورة، تأسر أيضًا <b>الصف الذي خلفك</b>. هذا هو <b>الانسحاب</b>. أبعِد كرتك عن الأسود!', done: 'أسرت وأنت تتراجع! في فانورونا قد يكون التراجع هجومًا.' },
      { say: 'إذا كانت الخطوة نفسها تأسر <b>بالاقتراب أو بالانسحاب</b>، تختار <b>واحدًا فقط</b>. اذهب إلى النقطة المتوهجة ثم انقر كرة من الصف الذي تريده!', done: 'اخترت! أسر الأكثر ليس الأفضل دائمًا، فانظر جيدًا.' },
      { say: 'قاعدة مهمة! <b>إذا استطعت الأسر فيجب أن تأسر.</b> الكرة القادرة على الأسر تتوهج. الأخرى لا يُسمح لها بالحركة، فابحث عن الأسر!', done: 'تمامًا! لا يمكنك تجاوز الأسر. بعضهم يعرض أسرًا عمدًا ليُعدّ سلسلة.' },
      { say: 'بعد الأسر، إذا كانت <b>الكرة نفسها قادرة على الأسر مجددًا فإنها تستمر</b> (<b>سلسلة</b>)! بعد كل أسر تتوهج النقطة التالية. أسِر مرتين متتاليتين!', done: 'سلسلة ممتازة! قد تقلب المباراة في دور واحد.' },
      { say: 'قواعد السلسلة: <b>لا تتحرك مرتين متتاليتين في الاتجاه نفسه</b>، و<b>لا تعود إلى نقطة مررت بها</b>. ويمكنك أيضًا <b>إيقاف السلسلة متى شئت</b>: انقر الكرة التي تحرّكها فقط.' },
      { say: 'تفوز إذا <b>أسرت كل كرات الخصم</b> أو إذا <b>عجز الخصم عن الحركة</b>. أسِر آخر الكرات السوداء واربح المباراة!', done: 'رائع، لقد فزت! مبروك!' },
      { say: 'أمر أخير: تكرار الوضع نفسه <b>ثلاث مرات</b>، أو مرور <b>80 نقلة</b> بلا أسر، يعني التعادل. الافتتاح مليء بالأسر، فتجنّب الأشكال التي تمنح خصمك <b>سلسلة</b>. هيا، لنلعب مباراة حقيقية!' },
    ] },
  };

  /* ---------- little sounds: a wooden ball on wood, a chime, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const tok = (v = 1) => tone(260 * v, 120, .1, .18);
    const clack = () => tone(900, 420, .07, .07);
    const chime = () => [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0, .45, .08, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { tok, clack, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, F3 = T3.fanorona, L = TXT[ctx.lang] || TXT.en;
    const board = F3.board('sivy'); T3.show('fanorona', board); T3.play(true);
    const U = board.userData, Y = U.top, GS = .66;
    if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.2, y: Y + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, G = [], step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const xz = i => U.pt(i % 9, 4 - ((i / 9) | 0));   // White (you) at the bottom
    const P = s => (+s[1] - 1) * 9 + 'abcdefghi'.indexOf(s[0]);
    const specOf = g => { let b = ''; for (let r = 0; r < 5; r++) b += g[4 - r]; return { b, side: 1 }; };

    /* ---------- balls ---------- */
    function mk(k, scale = 1) { const g = U.piece(k, scale), sh = T3.contact(g.userData.r * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h, base, surf) {
      const b = base ?? U.rest; g.position.y = b + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = (surf ?? U.top + .002) - g.position.y; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); }
    }
    const _ax = new TH.Vector3(), _q = new TH.Quaternion();
    function roll(g, dx, dz) { const d = Math.hypot(dx, dz); if (d < 1e-5) return; _ax.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_ax, d / g.userData.r); g.userData.ball.quaternion.premultiply(_q); }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function bump(g) { const r = g.userData.r; anim(150, k => g.userData.ball.scale.setScalar(r * (1 + Math.sin(k * Math.PI) * .05)), () => g.userData.ball.scale.setScalar(r)); }
    function setBoard() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; G.forEach(drop); G = [];
      let n = 0;
      for (let i = 0; i < 45; i++) {
        const k = pos.at(i); if (!k) continue;
        const g = mk(k), [x, z] = xz(i); g.position.set(x, U.rest, z); pcs[i] = { g, k };
        g.visible = false; const d = 40 + (n++) * 12;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); bump(g); }); }, d);
      }
      return n;
    }
    // one step: the ball rolls along the line; its captures pop out and hop into your groove
    function step3(stp, done) {
      const o = pcs[stp.from]; delete pcs[stp.from]; pcs[stp.to] = o;
      const g = o.g, [x0, z0] = xz(stp.from), [x1, z1] = xz(stp.to), h0 = g.userData.h0 || 0; let px = x0, pz = z0;
      anim(300, k => { const e = io(k), x = x0 + (x1 - x0) * e, z = z0 + (z1 - z0) * e; roll(g, x - px, z - pz); px = x; pz = z; g.position.x = x; g.position.z = z; lift(g, h0 * (1 - Math.min(1, k * 3))); }, () => { lift(g, 0); bump(g); SFX.tok(); });
      stp.cap.forEach((c, k) => {
        const v = pcs[c]; delete pcs[c]; if (!v) return;
        const vg = v.g, slotI = G.length; G.push(vg);
        later(() => {
          const [tx, tz] = U.groove.at(1, slotI, 22), ty = U.groove.y(GS), sx = vg.position.x, sy = vg.position.y, sz = vg.position.z, r0 = vg.userData.r, r1 = F3.R * GS; let qx = sx, qz = sz;
          SFX.clack();
          anim(560, q => {
            const e = io(q), x = sx + (tx - sx) * e, z = sz + (tz - sz) * e, y = sy + (ty - sy) * e + Math.sin(q * Math.PI) * 1.1;
            roll(vg, (x - qx) * .5, (z - qz) * .5); qx = x; qz = z; vg.position.set(x, y, z);
            const r = r0 + (r1 - r0) * e; vg.userData.ball.scale.setScalar(r); vg.userData.r = r;
            if (vg.userData.sh) { vg.userData.sh.material.opacity = .5 * Math.max(0, 1 - Math.sin(q * Math.PI) * 1.2); vg.userData.sh.position.y = (U.top + .002 + (ty - r - U.top) * e) - y; }
          }, () => { vg.userData.r = r1; lift(vg, 0, ty, ty - r1 + .002); bump(vg); SFX.tok(1.6); });
        }, 240 + k * 70);
      });
      later(done, 340 + (stp.cap.length ? 300 + stp.cap.length * 70 : 0));
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    function disc(i, color, r = .13, op = .9, pulse = true) {
      const m = new TH.Mesh(new TH.CylinderGeometry(r, r, .012, 28), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      const [x, z] = xz(i); m.position.set(x, Y + .02, z); m.userData.pulse = pulse; m.renderOrder = 2; marks.add(m); return m;
    }
    function ring(i, color, r = .42) {
      const m = new TH.Mesh(new TH.TorusGeometry(r, .032, 8, 44), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false, depthWrite: false }));
      m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .04, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m;
    }
    // the marks' pulse runs only while something pulses (0 frames otherwise); a mark added starts it again
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; const s = .88 + k * .24; m.scale.set(s, m.geometry.type === 'TorusGeometry' ? s : 1, s); m.material.opacity = .45 + k * .5; } }); if (any && T3.kick) T3.kick(60); pulseOn = any && !stopped; if (pulseOn) requestAnimationFrame(pulse); }
    { const add0 = marks.add.bind(marks), rm0 = marks.remove.bind(marks); marks.add = (...a) => { const r = add0(...a); if (T3.kick) T3.kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; marks.remove = (...a) => { if (T3.kick) T3.kick(150); return rm0(...a); }; }
    pulse();
    const own = () => { const out = []; for (let i = 0; i < 45; i++) if (pos.at(i) === 1) out.push(i); return out; };
    // the steps the task accepts (from the engine), as first steps of a turn
    function accepted(st) {
      const f = pos.firstSteps();
      if (st.act === 'paika') return f.filter(x => !x.kind);
      if (st.act === 'A') return f.filter(x => x.kind === 'A');
      if (st.act === 'W') return f.filter(x => x.kind === 'W');
      return f.filter(x => x.kind);
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.strong) for (let i = 0; i < 45; i++) if (E.valid(i) && E.strong(i) && !pos.at(i)) disc(i, 0xffc24a, .09, .7);
      (st.glow || []).forEach(s => disc(P(s), 0xffc24a, .2));
      if (st.path) st.path.forEach((s, k) => k ? disc(P(s), 0x3ee08a, .14) : ring(P(s), 0xfff0c0));
      if (!st.act || played) return;
      if (sel) {
        ring(sel.st ? sel.st.cur : sel.from, 0xfff0c0);
        if (sel.choose) { disc(sel.choose[0].to, 0x3ee08a); sel.choose.forEach(x => x.cap.forEach(v => ring(v, x.kind === 'A' ? 0xff8a2a : 0x5aa8ff, .4))); return; }
        const L2 = sel.st ? pos.capSteps(sel.st) : accepted(st).filter(x => x.from === sel.from);
        new Set(L2.map(x => x.to)).forEach(t => disc(t, L2.find(x => x.to === t).kind ? 0xff8a2a : 0x3ee08a));
        return;
      }
      new Set(accepted(st).map(x => x.from)).forEach(f => ring(f, st.must ? 0xffc24a : 0x3ee08a));
    }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    let typeT = 0;
    function say(html) {   // typed speech, tap the bubble to finish
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
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; sel = null;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      pos = E.Pos.from(specOf(st.g));
      const cnt = setBoard();
      later(showTask, 380 + cnt * 12);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      if (st.act === 'win') { SFX.chime(); tip('🏆 ' + L.win); Object.values(pcs).forEach(p => anim(700, k => lift(p.g, Math.sin(k * Math.PI) * .6))); }
      else SFX.chime();
      buttons(); autoNext();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last) go(step + 1); }, ms); }
    function pointOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const dc = Math.round(p.x + 4), dr = Math.round(p.z + 2);
      if (dc < 0 || dc > 8 || dr < 0 || dr > 4 || Math.hypot(p.x + 4 - dc, p.z + 2 - dr) > .5) return -1;
      return (4 - dr) * 9 + dc;
    }
    function liftBall(i, on) { const p = pcs[i]; if (!p) return; const g = p.g, h0 = g.userData.h0 || 0, h1 = on ? .22 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function doStep(stp) {
      busy = true; clearMarks(); const st = STEPS[step];
      step3(stp, () => {
        busy = false;
        if (!stp.kind) { finish(); return; }
        sel.st = E.Pos.after(pos, sel.st, stp); sel.steps.push(stp); sel.choose = null;
        const more = pos.capSteps(sel.st);
        if (st.act === 'chain' && more.length) { say(L.more); showTask(); return; }
        finish();
      });
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = pointOf(e), A = accepted(st);
      if (sel && sel.choose) { const pick = sel.choose.find(x => x.cap.includes(i)); if (pick) doStep(pick); else say(L.pick); return; }
      if (sel && sel.st) { const opts = pos.capSteps(sel.st).filter(x => x.to === i); if (opts.length) doStep(opts[0]); else say(L.more); return; }
      if (i < 0) return;
      if (pos.at(i) === 1) {
        if (sel && sel.from === i) { liftBall(i, false); sel = null; showTask(); return; }
        if (!A.some(x => x.from === i)) { say(pos.hasCaps() ? L.must : L.stuck); return; }
        if (sel) liftBall(sel.from, false);
        sel = { from: i, st: null, steps: [], choose: null }; liftBall(i, true); SFX.tok(1.3); showTask(); return;
      }
      if (!sel) { say(A.length && st.must ? L.must : L.tap); return; }
      const all = pos.firstSteps().filter(x => x.from === sel.from && x.to === i), opts = A.filter(x => x.from === sel.from && x.to === i);
      if (!opts.length) { say(all.length ? (st.act === 'A' ? L.wrongA : st.act === 'W' ? L.wrongW : L.nope) : L.nope); return; }
      if (opts.length > 1) { sel.choose = opts; say(L.pick); showTask(); return; }
      doStep(opts[0]);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / Enter / → next, ← back (an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('sivy'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-fanorona-rules-seen', '1'); } catch (e) {}
    const dbg = { at: s => { const [x, z] = xz(P(s)); return T3.project(x, z, Y); }, step: () => step, steps: STEPS.length, played: () => played, go: n => go(n) };
    window.__fnRules = dbg;   // (test hook)
    return {
      stop() { stopped = true; if (window.__fnRules === dbg) delete window.__fnRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.fanorona = { start };
})();
