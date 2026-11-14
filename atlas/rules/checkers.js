/* =====================================================================
   Checkers (English draughts) rules — a guided tour on the 3D table (the lacquer
   board, atlas/models/checkers.js), told by the guide character (Checkrab).
   The same lessons as the full game's hands-on rules (checkers/app.js TOUR_PAGES),
   turned into a short scenario in friendlier words: the board, a man's step, a capture
   by jumping, compulsory capture, the multi-jump, kinging, the king going backwards,
   two ways to win, draws, let's play.
   Every task is checked live by the game's own rules (../checkers/engine.js); you play
   the gold pieces (Black, moves first) at the bottom, as at the table.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Squares: the standard numbers 1..32 as the full game's tour has them (White at the
   bottom there); SP() turns them round so that here the player (gold) sits at the bottom.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-crab.webp', ENG = '../checkers/engine.js?v=rb4-pro1-n43-mt1-sv2';
  const loadEngine = () => window.CheckersEngine ? Promise.resolve(window.CheckersEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.CheckersEngine ? res(window.CheckersEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  // me / meK: the player's men / kings, op / opK: the opponent's (square numbers of the full game's tour) → an engine spec, gold (Black) to move
  const SP = o => { const a = Array(32).fill('.'); (o.me || []).forEach(x => { a[32 - x] = 'b'; }); (o.meK || []).forEach(x => { a[32 - x] = 'B'; }); (o.op || []).forEach(x => { a[32 - x] = 'w'; }); (o.opK || []).forEach(x => { a[32 - x] = 'W'; }); return { b: a.join(''), side: 1 }; };
  const INIT = { b: 'bbbbbbbbbbbb........wwwwwwwwwwww', side: 1 };
  // pos: the position; act: what the task accepts; glow: soft gold squares (indices 0..31)
  const STEPS = [
    { pos: INIT },
    { pos: INIT, glow: 'all' },
    { pos: SP({ op: [1, 2, 3, 6], me: [21, 22, 23, 26, 27] }), act: 'step' },
    { pos: SP({ op: [14, 3], me: [18, 27, 29] }), act: 'cap' },
    { pos: SP({ op: [15, 2, 4], me: [19, 22, 25, 28] }), act: 'cap', must: true },
    { pos: SP({ op: [19, 11, 2], me: [23, 30] }), act: 'multi' },
    { pos: SP({ op: [12, 16], me: [6, 25, 30] }), act: 'king', glowRow: true },
    { pos: SP({ op: [10, 3], meK: [6], me: [29, 31] }), act: 'back' },
    { pos: SP({ op: [22], me: [26, 31] }), act: 'win' },
    { pos: SP({ op: [28], me: [21], meK: [27] }), act: 'win', block: true },
    { pos: SP({ opK: [1], meK: [32, 28] }), glow: [27, 31] },
    { pos: INIT, last: true },
  ];

  const TXT = {
    ja: { name: 'チェッカニ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないよ〜', stuck: 'その駒は今は動けないよ', own: '金の駒をタップしてね', must: '取れる駒があるときは、<b>必ず取らなきゃ</b>いけないんだ！', want: '今回はお題の手をさがしてね。光っている駒がヒントだよ', wantMulti: '1手で<b>2つ</b>取れる道があるよ。跳ぶ先を順にタップしてもOK！', wantKing: 'いちばん奥の段までとどく駒をさがしてね', wantBack: 'キングを<b>後ろ向き</b>に跳ばしてみて', wantWin: 'それだとまだ勝てないよ。もう一回！', crown: '👑 キング！', win: '🏆 勝ち！', s: [
      { say: 'チョキチョキ！ ぼくは<b>チェッカニ</b>。背中のキング駒が自慢なんだ。今日は<b>チェッカー</b>のルールを、この盤でいっしょに覚えよう！' },
      { say: '使うのは<b>暗いマスだけ</b>（32マス）。手前の3段にならんだ<b>金の12こ</b>がきみの駒、奥の銀が相手だよ。金（黒番）が先手。駒はみんな<b>ななめ</b>に動くんだ。' },
      { say: 'はじめの駒は「<b>マン</b>」。<b>ななめ前に1マス</b>だけ進めるよ。後ろには戻れないから、よく考えてね。金の駒を1つ、ななめ前へ動かしてみて！', done: 'いいね〜！ マンはこうして、1マスずつ前へ進むんだ。' },
      { say: 'ななめ前に相手の駒がいて、その先が空いていたら、<b>ぴょんと跳び越えて取れる</b>よ！ 光っている駒で銀を跳び越えてみて！', done: 'カキーン！ 跳び越えられた駒は盤から消えちゃうんだ。' },
      { say: 'ここが大事！ 取れる駒があるときは、<b>必ず取らなきゃいけない</b>んだ（ほかの手はダメ）。取れる駒をさがして取ってみて！', done: '正解！ 取れるときは、取る手がいちばん優先。だから、わざと取らせるワナもあるんだよ。' },
      { say: '跳んだ先からまた跳べるなら、<b>続けて跳んで</b>どんどん取れるよ（<b>連続ジャンプ</b>）。1手で2つ取ってみよう！', done: '2つまとめて取れた〜！ 跳べるあいだは、途中でやめずに最後まで跳ぶのがきまりだよ。' },
      { say: 'マンが<b>いちばん奥の段</b>（光っている段）にたどり着くと、上にもう1つ駒が乗って<b>キング</b>に変身！ 金のマンを奥の段まで進めてみて！', done: 'キング誕生！ 王冠がピカピカだね。キングになったら、その手はそこでおしまいだよ。' },
      { say: 'キングは<b>ななめ後ろにも</b>動けるし、<b>後ろ向きにも跳んで取れる</b>んだ。キングで、後ろにいる銀を取ってみて！', done: 'すごい！ 前にも後ろにも行けるキングは、マンよりずっと強いんだ。' },
      { say: '勝ち方その1。相手の駒を<b>ぜんぶ取ったら勝ち</b>！ 最後の銀を取ってみよう！', done: 'やった〜、勝ち！ 盤の上は金だけになったね。' },
      { say: '勝ち方その2。駒が残っていても、相手が<b>1手も動けなくなったら勝ち</b>なんだ。銀のマンの行き先をふさいでみて！', done: '銀はもう動けない！ これも勝ちだよ。' },
      { say: '<b>同じ局面が3回</b>出てきたり、取りもマンの前進もないまま<b>40手ずつ</b>たったら<b>引き分け</b>。キング1つでも、光っている角の「<b>二重コーナー</b>」ににげこむと、引き分けにしやすいんだ。' },
      { say: 'これでルールはばっちり！ 「取れるときは必ず取る」を忘れずにね。さっそく対局してみよう〜！' },
    ] },
    en: { name: 'Checkrab', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't go there!", stuck: "That piece can't move right now", own: 'Tap a gold piece', must: 'When you can capture, you <b>have to</b> capture!', want: "This time, look for the move I asked for. The glowing pieces are a hint", wantMulti: 'There’s a way to take <b>two</b> in one move. You can tap the landing squares one by one, too!', wantKing: 'Find a piece that can reach the far row', wantBack: 'Make the king jump <b>backwards</b>', wantWin: "That doesn't win yet. Try again!", crown: '👑 King!', win: '🏆 You win!', s: [
      { say: "Snip snip! I'm <b>Checkrab</b>, and I'm very proud of the king on my back. Let's learn the rules of <b>Checkers</b> together on this board!" },
      { say: 'Only the <b>dark squares</b> are used (32 of them). The <b>12 gold pieces</b> on the three near rows are yours; the silver ones are your opponent’s. Gold (Black) moves first, and every piece moves <b>diagonally</b>.' },
      { say: 'Every piece starts as a <b>man</b>. A man steps <b>one square diagonally forward</b>, and it can never go back, so think first! Move one gold piece diagonally forward.', done: 'Nice! That’s how a man walks: forward, one square at a time.' },
      { say: 'If an enemy piece is diagonally in front of you and the square beyond it is empty, you can <b>jump over it and capture it</b>! Jump the glowing piece over the silver one.', done: 'Clack! The piece you jumped over leaves the board.' },
      { say: 'This one matters! When you can capture, you <b>must capture</b>; no other move is allowed. Find the capture and take it!', done: 'Right! A capture always comes first. That’s why players set traps by offering a piece.' },
      { say: 'If you can jump again from where you land, <b>keep jumping</b> and take them all (a <b>multi-jump</b>). Take two pieces in one move!', done: 'Two at once! While you can still jump, you have to keep going to the end.' },
      { say: 'When a man reaches the <b>far row</b> (the glowing one), another checker lands on top and it becomes a <b>king</b>! Bring a gold man to the far row.', done: 'A king is born! Look at that shiny crown. Becoming a king ends the move.' },
      { say: 'A king can also move <b>diagonally backwards</b>, and it can <b>jump backwards</b> too. Use the king to capture the silver piece behind it!', done: 'Great! A king goes forwards and backwards, so it’s much stronger than a man.' },
      { say: 'Way to win #1: <b>capture all</b> of your opponent’s pieces! Take the last silver piece.', done: 'Hooray, you win! Only gold is left on the board.' },
      { say: 'Way to win #2: even with pieces left, a player who <b>can’t make any move loses</b>. Block the silver man’s way!', done: 'Silver can’t move at all. That’s a win too!' },
      { say: 'It’s a <b>draw</b> if the <b>same position appears 3 times</b>, or if <b>40 moves each</b> pass with no capture and no man moving. A lone king that hides in the glowing “<b>double corner</b>” can often hold a draw.' },
      { say: 'Now you know all the rules! Just remember: if you can capture, you must. Let’s play a game!' },
    ] },
    zh: { name: '跳棋蟹', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里走不了哦～', stuck: '这枚棋子现在走不了哦', own: '请点击金色的棋子', must: '能吃子的时候，<b>一定要吃</b>哦！', want: '这次请找出题目要的走法，发光的棋子是提示哦', wantMulti: '有一条路能一步吃<b>两枚</b>。也可以依次点击落点哦！', wantKing: '找一找能走到最远一行的棋子吧', wantBack: '让王棋<b>往后</b>跳吧', wantWin: '这样还赢不了哦，再试一次！', crown: '👑 成王！', win: '🏆 赢了！', s: [
      { say: '咔嚓咔嚓！我是<b>跳棋蟹</b>，最得意的就是背上的王棋。今天在这块棋盘上，一起学<b>西洋跳棋</b>的规则吧！' },
      { say: '只用<b>深色的格子</b>（共32格）。摆在靠近你这边三行的<b>12枚金棋</b>是你的，远处的银棋是对手的。金方（黑方）先走，所有棋子都<b>斜着</b>走。' },
      { say: '一开始的棋子叫“<b>兵</b>”，只能<b>斜着向前走一格</b>，不能后退，所以要想好哦。把一枚金棋斜着往前走一格试试！', done: '很好～！兵就是这样一格一格往前走的。' },
      { say: '斜前方有对方的棋子，而它后面是空格时，就能<b>跳过去把它吃掉</b>！用发光的棋子跳过银棋吧！', done: '咔！被跳过的棋子就从棋盘上消失了。' },
      { say: '重点来了！能吃子的时候<b>必须吃</b>，不能走别的。找出能吃的棋子，吃掉它吧！', done: '答对了！能吃的时候，吃子永远优先。所以也有人故意送子设陷阱哦。' },
      { say: '跳完后如果还能接着跳，就<b>继续跳</b>，一口气吃好几枚（<b>连跳</b>）。一步吃掉两枚试试！', done: '一次吃了两枚～！只要还能跳，就必须一直跳到最后。' },
      { say: '兵走到<b>最远的一行</b>（发光的那一行），上面会再叠一枚棋子，变成<b>王棋</b>！把金兵走到最远一行吧！', done: '王棋诞生！王冠闪闪发亮。成王后，这一步就结束了。' },
      { say: '王棋还能<b>斜着往后走</b>，也能<b>往后跳着吃子</b>。用王棋吃掉后面的银棋吧！', done: '厉害！能前能后的王棋，比兵强多了。' },
      { say: '赢法一：把对方的棋子<b>全部吃光</b>就赢了！吃掉最后一枚银棋吧！', done: '耶～赢了！棋盘上只剩金棋了。' },
      { say: '赢法二：就算还有棋子，只要对方<b>一步都走不了</b>，也是你赢。堵住银兵的去路吧！', done: '银棋动不了了！这也是赢哦。' },
      { say: '<b>同一局面出现3次</b>，或者双方各走<b>40步</b>都没有吃子、也没有兵前进，就是<b>和棋</b>。就算只剩一个王棋，躲进发光的“<b>双角</b>”也容易守成和棋。' },
      { say: '规则全都学会啦！记住“能吃就必须吃”哦。马上来下一盘吧～！' },
    ] },
    ko: { name: '체카니', next: '다음', back: '이전', start: '대국해 보기', again: '한 번 더', tap: '빛나는 곳을 탭하세요', nope: '거기는 갈 수 없어~', stuck: '그 말은 지금 움직일 수 없어', own: '금색 말을 탭해 줘', must: '잡을 수 있을 때는 <b>꼭 잡아야</b> 해!', want: '이번엔 문제의 수를 찾아 줘. 빛나는 말이 힌트야', wantMulti: '한 번에 <b>두 개</b> 잡는 길이 있어. 착지할 칸을 차례로 눌러도 돼!', wantKing: '맨 끝 줄까지 갈 수 있는 말을 찾아 봐', wantBack: '킹을 <b>뒤로</b> 뛰어넘게 해 봐', wantWin: '그걸로는 아직 못 이겨. 다시 해 보자!', crown: '👑 킹!', win: '🏆 승리!', s: [
      { say: '싹둑싹둑! 나는 <b>체카니</b>. 등에 진 킹 말이 내 자랑이야. 오늘은 이 판에서 <b>체커</b> 규칙을 같이 배워 보자!' },
      { say: '쓰는 건 <b>어두운 칸만</b>(32칸)이야. 앞쪽 세 줄에 놓인 <b>금색 12개</b>가 네 말이고, 멀리 있는 은색이 상대야. 금(흑)이 먼저 두고, 말은 모두 <b>대각선</b>으로 움직여.' },
      { say: '처음 말은 「<b>맨</b>」이야. <b>대각선 앞으로 한 칸</b>만 갈 수 있어. 뒤로는 못 돌아가니까 잘 생각해! 금색 말 하나를 대각선 앞으로 움직여 봐!', done: '좋아~! 맨은 이렇게 한 칸씩 앞으로 나아가.' },
      { say: '대각선 앞에 상대 말이 있고 그 너머가 비어 있으면, <b>폴짝 뛰어넘어서 잡을 수</b> 있어! 빛나는 말로 은색 말을 뛰어넘어 봐!', done: '탁! 뛰어넘긴 말은 판에서 사라져.' },
      { say: '여기가 중요해! 잡을 수 있는 말이 있으면 <b>반드시 잡아야</b> 해(다른 수는 안 돼). 잡을 수 있는 말을 찾아서 잡아 봐!', done: '정답! 잡을 수 있을 땐 잡는 수가 제일 먼저야. 그래서 일부러 잡게 하는 함정도 있어.' },
      { say: '뛰어넘은 곳에서 또 뛸 수 있으면 <b>계속 뛰어서</b> 몇 개든 잡을 수 있어(<b>연속 점프</b>). 한 번에 두 개를 잡아 보자!', done: '한 번에 두 개~! 뛸 수 있는 동안은 끝까지 뛰는 게 규칙이야.' },
      { say: '맨이 <b>맨 끝 줄</b>(빛나는 줄)에 도착하면 위에 말이 하나 더 올라가서 <b>킹</b>으로 변신! 금색 맨을 끝 줄까지 보내 봐!', done: '킹 탄생! 왕관이 반짝반짝하네. 킹이 되면 그 수는 거기서 끝이야.' },
      { say: '킹은 <b>대각선 뒤로도</b> 움직이고, <b>뒤로 뛰어서 잡을 수도</b> 있어. 킹으로 뒤에 있는 은색 말을 잡아 봐!', done: '대단해! 앞뒤로 다 가는 킹은 맨보다 훨씬 강해.' },
      { say: '이기는 방법 1. 상대 말을 <b>전부 잡으면 승리</b>! 마지막 은색 말을 잡아 보자!', done: '야호, 승리! 판 위엔 금색만 남았어.' },
      { say: '이기는 방법 2. 말이 남아 있어도 상대가 <b>한 수도 둘 수 없으면 승리</b>야. 은색 맨이 갈 길을 막아 봐!', done: '은색은 이제 못 움직여! 이것도 승리야.' },
      { say: '<b>같은 국면이 3번</b> 나오거나, 잡기도 맨의 전진도 없이 <b>각자 40수</b>가 지나면 <b>무승부</b>야. 킹 하나만 남아도 빛나는 구석 「<b>더블 코너</b>」로 도망가면 비기기 쉬워.' },
      { say: '이제 규칙은 완벽해! 「잡을 수 있으면 꼭 잡기」 잊지 마. 바로 대국해 보자~!' },
    ] },
    es: { name: 'Checkrab', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca un sitio brillante', nope: '¡Ahí no puede ir!', stuck: 'Esa pieza no puede moverse ahora', own: 'Toca una pieza dorada', must: '¡Si puedes capturar, <b>tienes que</b> capturar!', want: 'Esta vez busca la jugada que te pido. Las piezas que brillan son una pista', wantMulti: 'Hay un camino para comer <b>dos</b> de una vez. ¡También puedes tocar las casillas de aterrizaje una a una!', wantKing: 'Busca una pieza que llegue a la última fila', wantBack: 'Haz que la dama salte <b>hacia atrás</b>', wantWin: 'Así todavía no ganas. ¡Otra vez!', crown: '👑 ¡Dama!', win: '🏆 ¡Ganaste!', s: [
      { say: '¡Chas, chas! Soy <b>Checkrab</b> y estoy muy orgulloso de la dama que llevo a la espalda. ¡Vamos a aprender juntos las reglas de las <b>Damas</b> en este tablero!' },
      { say: 'Solo se usan las <b>casillas oscuras</b> (32). Las <b>12 piezas doradas</b> de las tres filas cercanas son tuyas; las plateadas, del rival. Empiezan las doradas (negras) y todas las piezas se mueven en <b>diagonal</b>.' },
      { say: 'Al principio cada pieza es un <b>peón</b>. Avanza <b>una casilla en diagonal hacia delante</b> y nunca puede volver atrás, ¡así que piénsalo bien! Mueve una pieza dorada en diagonal hacia delante.', done: '¡Muy bien! Así camina un peón: hacia delante, de casilla en casilla.' },
      { say: 'Si hay una pieza rival en diagonal delante de ti y la casilla de detrás está libre, puedes <b>saltarla y capturarla</b>. ¡Salta con la pieza que brilla por encima de la plateada!', done: '¡Clac! La pieza saltada desaparece del tablero.' },
      { say: '¡Esto es importante! Si puedes capturar, <b>estás obligado a capturar</b>; no vale otra jugada. ¡Encuentra la captura y hazla!', done: '¡Correcto! Capturar siempre va primero. Por eso hay quien ofrece una pieza para tender una trampa.' },
      { say: 'Si desde donde caes puedes volver a saltar, <b>sigue saltando</b> y cómetelas todas (un <b>salto múltiple</b>). ¡Captura dos piezas en una sola jugada!', done: '¡Dos de golpe! Mientras puedas saltar, hay que seguir hasta el final.' },
      { say: 'Cuando un peón llega a la <b>última fila</b> (la que brilla), se le pone otra pieza encima y se convierte en <b>dama</b>. ¡Lleva un peón dorado hasta el fondo!', done: '¡Nació una dama! Mira qué corona tan brillante. Al coronar, la jugada termina.' },
      { say: 'La dama también se mueve <b>en diagonal hacia atrás</b> y puede <b>saltar hacia atrás</b> para capturar. ¡Captura con la dama la pieza plateada que tiene detrás!', done: '¡Genial! La dama va hacia delante y hacia atrás: es mucho más fuerte que un peón.' },
      { say: 'Forma de ganar n.º 1: ¡<b>captura todas</b> las piezas del rival! Cómete la última plateada.', done: '¡Bien, ganaste! Solo quedan piezas doradas.' },
      { say: 'Forma de ganar n.º 2: aunque le queden piezas, si el rival <b>no puede mover nada, pierde</b>. ¡Bloquéale el paso al peón plateado!', done: 'Las plateadas no pueden moverse. ¡También es victoria!' },
      { say: 'Hay <b>tablas</b> si la <b>misma posición se repite 3 veces</b> o si pasan <b>40 jugadas por bando</b> sin capturas ni avances de peón. Una dama sola que se refugia en la “<b>esquina doble</b>” que brilla suele salvar las tablas.' },
      { say: '¡Ya sabes todas las reglas! Recuerda: si puedes capturar, debes hacerlo. ¡A jugar!' },
    ] },
    fr: { name: 'Checkrab', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche un endroit qui brille', nope: 'Elle ne peut pas aller là !', stuck: 'Cette pièce ne peut pas bouger pour l’instant', own: 'Touche une pièce dorée', must: 'Quand tu peux prendre, tu <b>dois</b> prendre !', want: 'Cette fois, cherche le coup demandé. Les pièces qui brillent sont un indice', wantMulti: 'Il y a un chemin pour en prendre <b>deux</b> d’un coup. Tu peux aussi toucher les cases d’arrivée une par une !', wantKing: 'Trouve une pièce qui peut atteindre la dernière rangée', wantBack: 'Fais sauter la dame <b>en arrière</b>', wantWin: 'Ça ne gagne pas encore. Réessaie !', crown: '👑 Dame !', win: '🏆 Gagné !', s: [
      { say: 'Clic clac ! Moi, c’est <b>Checkrab</b>, et je suis très fier de la dame sur mon dos. Apprenons ensemble les règles des <b>dames anglaises</b> sur ce plateau !' },
      { say: 'On n’utilise que les <b>cases foncées</b> (32). Les <b>12 pièces dorées</b> des trois rangées proches sont à toi, les argentées à ton adversaire. Les dorées (les Noirs) commencent, et toutes les pièces avancent en <b>diagonale</b>.' },
      { say: 'Au début, chaque pièce est un <b>pion</b>. Il avance d’<b>une case en diagonale vers l’avant</b> et ne peut jamais reculer, alors réfléchis bien ! Avance une pièce dorée en diagonale.', done: 'Bravo ! C’est comme ça qu’un pion avance : une case à la fois.' },
      { say: 'Si une pièce adverse est juste devant toi en diagonale et que la case derrière est vide, tu peux <b>sauter par-dessus et la prendre</b> ! Fais sauter la pièce qui brille par-dessus l’argentée.', done: 'Clac ! La pièce sautée quitte le plateau.' },
      { say: 'C’est important ! Quand tu peux prendre, <b>la prise est obligatoire</b> : aucun autre coup n’est permis. Trouve la prise et joue-la !', done: 'Exact ! La prise passe toujours en premier. C’est pour ça qu’on tend des pièges en offrant une pièce.' },
      { say: 'Si tu peux encore sauter depuis ta case d’arrivée, <b>continue de sauter</b> et prends-les toutes (une <b>rafle</b>). Prends deux pièces en un seul coup !', done: 'Deux d’un coup ! Tant que tu peux sauter, il faut aller jusqu’au bout.' },
      { say: 'Quand un pion atteint la <b>dernière rangée</b> (celle qui brille), on pose une pièce dessus : il devient <b>dame</b> ! Emmène un pion doré tout au fond.', done: 'Une dame est née ! Regarde cette couronne qui brille. Devenir dame termine le coup.' },
      { say: 'La dame peut aussi aller <b>en diagonale vers l’arrière</b> et même <b>prendre en sautant en arrière</b>. Prends avec la dame la pièce argentée derrière elle !', done: 'Super ! La dame va devant et derrière : elle est bien plus forte qu’un pion.' },
      { say: 'Gagner, façon n° 1 : <b>prendre toutes</b> les pièces adverses ! Prends la dernière argentée.', done: 'Youpi, gagné ! Il ne reste que des pièces dorées.' },
      { say: 'Gagner, façon n° 2 : même avec des pièces, un joueur qui <b>ne peut plus jouer aucun coup a perdu</b>. Bloque le chemin du pion argenté !', done: 'L’argent ne peut plus bouger. C’est gagné aussi !' },
      { say: 'C’est <b>nul</b> si la <b>même position revient 3 fois</b>, ou si <b>40 coups chacun</b> passent sans prise ni pion qui avance. Une dame seule réfugiée dans le « <b>coin double</b> » qui brille tient souvent la nulle.' },
      { say: 'Tu connais toutes les règles ! N’oublie pas : si tu peux prendre, tu dois prendre. On fait une partie ?' },
    ] },
    pt: { name: 'Checkrab', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque num lugar brilhante', nope: 'Ela não pode ir aí!', stuck: 'Essa peça não pode se mexer agora', own: 'Toque numa peça dourada', must: 'Quando dá para capturar, você <b>tem que</b> capturar!', want: 'Desta vez, procure o lance que eu pedi. As peças que brilham são uma dica', wantMulti: 'Tem um caminho para pegar <b>duas</b> de uma vez. Você também pode tocar as casas de pouso uma a uma!', wantKing: 'Procure uma peça que alcance a última fileira', wantBack: 'Faça a dama pular <b>para trás</b>', wantWin: 'Assim ainda não ganha. Tente de novo!', crown: '👑 Dama!', win: '🏆 Vitória!', s: [
      { say: 'Tchec, tchec! Eu sou o <b>Checkrab</b> e morro de orgulho da dama nas minhas costas. Vamos aprender juntos as regras das <b>Damas</b> neste tabuleiro!' },
      { say: 'Só se usam as <b>casas escuras</b> (32). As <b>12 peças douradas</b> nas três fileiras mais perto são suas; as prateadas são do adversário. As douradas (pretas) começam, e todas as peças andam na <b>diagonal</b>.' },
      { say: 'No começo cada peça é um <b>peão</b>. Ele anda <b>uma casa na diagonal para a frente</b> e nunca volta, então pense bem! Mova uma peça dourada na diagonal para a frente.', done: 'Boa! É assim que o peão anda: para a frente, uma casa de cada vez.' },
      { say: 'Se tem uma peça adversária na diagonal à sua frente e a casa depois dela está vazia, você pode <b>pular por cima e capturar</b>! Pule com a peça que brilha por cima da prateada.', done: 'Clac! A peça pulada sai do tabuleiro.' },
      { say: 'Isto é importante! Quando dá para capturar, a <b>captura é obrigatória</b>; nenhum outro lance vale. Ache a captura e faça!', done: 'Isso! Capturar vem sempre primeiro. Por isso tem gente que oferece uma peça para armar uma cilada.' },
      { say: 'Se der para pular de novo de onde você caiu, <b>continue pulando</b> e pegue todas (um <b>pulo múltiplo</b>). Capture duas peças num lance só!', done: 'Duas de uma vez! Enquanto der para pular, tem que ir até o fim.' },
      { say: 'Quando um peão chega à <b>última fileira</b> (a que brilha), outra peça vai por cima e ele vira <b>dama</b>! Leve um peão dourado até lá no fundo.', done: 'Nasceu uma dama! Olha que coroa brilhante. Virar dama encerra o lance.' },
      { say: 'A dama também anda <b>na diagonal para trás</b> e pode <b>pular para trás</b> para capturar. Capture com a dama a peça prateada atrás dela!', done: 'Demais! A dama vai para a frente e para trás, por isso é bem mais forte que um peão.' },
      { say: 'Jeito de ganhar nº 1: <b>capture todas</b> as peças do adversário! Pegue a última prateada.', done: 'Eba, vitória! Só sobrou dourado no tabuleiro.' },
      { say: 'Jeito de ganhar nº 2: mesmo com peças sobrando, quem <b>não consegue fazer nenhum lance perde</b>. Bloqueie o caminho do peão prateado!', done: 'As prateadas não conseguem se mexer. Também é vitória!' },
      { say: 'É <b>empate</b> se a <b>mesma posição aparecer 3 vezes</b>, ou se passarem <b>40 lances de cada lado</b> sem captura nem peão avançando. Uma dama sozinha que se esconde no “<b>canto duplo</b>” que brilha costuma segurar o empate.' },
      { say: 'Agora você sabe todas as regras! Só não esqueça: se dá para capturar, tem que capturar. Vamos jogar!' },
    ] },
    de: { name: 'Checkrab', next: 'Weiter', back: 'Zurück', start: 'Los geht’s', again: 'Nochmal', tap: 'Tippe auf eine leuchtende Stelle', nope: 'Da kann er nicht hin!', stuck: 'Dieser Stein kann gerade nicht ziehen', own: 'Tippe auf einen goldenen Stein', must: 'Wenn du schlagen kannst, <b>musst</b> du schlagen!', want: 'Such diesmal den Zug aus der Aufgabe. Die leuchtenden Steine sind ein Tipp', wantMulti: 'Es gibt einen Weg, <b>zwei</b> auf einmal zu schlagen. Du kannst die Landefelder auch nacheinander antippen!', wantKing: 'Such einen Stein, der die hinterste Reihe erreicht', wantBack: 'Lass die Dame <b>rückwärts</b> springen', wantWin: 'Damit gewinnst du noch nicht. Nochmal!', crown: '👑 Dame!', win: '🏆 Gewonnen!', s: [
      { say: 'Schnipp schnapp! Ich bin <b>Checkrab</b> und mächtig stolz auf die Dame auf meinem Rücken. Lass uns auf diesem Brett gemeinsam die Regeln von <b>Dame</b> (Checkers) lernen!' },
      { say: 'Gespielt wird nur auf den <b>dunklen Feldern</b> (32). Die <b>12 goldenen Steine</b> auf den drei vorderen Reihen gehören dir, die silbernen dem Gegner. Gold (Schwarz) fängt an, und alle Steine ziehen <b>diagonal</b>.' },
      { say: 'Am Anfang ist jeder Stein ein <b>Mann</b>. Er zieht <b>ein Feld diagonal nach vorn</b> und kann nie zurück, also gut überlegen! Zieh einen goldenen Stein diagonal nach vorn.', done: 'Super! So läuft ein Mann: nach vorn, Feld für Feld.' },
      { say: 'Steht ein gegnerischer Stein diagonal vor dir und ist das Feld dahinter frei, kannst du <b>drüberspringen und ihn schlagen</b>! Spring mit dem leuchtenden Stein über den silbernen.', done: 'Klack! Der übersprungene Stein verlässt das Brett.' },
      { say: 'Ganz wichtig! Wenn du schlagen kannst, <b>musst du schlagen</b> – ein anderer Zug ist nicht erlaubt. Finde den Schlag und mach ihn!', done: 'Richtig! Schlagen geht immer vor. Deshalb stellen manche eine Falle, indem sie einen Stein anbieten.' },
      { say: 'Kannst du vom Landefeld aus wieder springen, <b>spring einfach weiter</b> und schlag sie alle (ein <b>Mehrfachsprung</b>). Schlag zwei Steine in einem Zug!', done: 'Zwei auf einmal! Solange du springen kannst, musst du bis zum Ende weiter.' },
      { say: 'Erreicht ein Mann die <b>hinterste Reihe</b> (die leuchtende), kommt ein zweiter Stein obendrauf und er wird zur <b>Dame</b>! Bring einen goldenen Mann ganz nach hinten.', done: 'Eine Dame ist geboren! Schau, wie die Krone glänzt. Mit der Umwandlung endet der Zug.' },
      { say: 'Die Dame darf auch <b>diagonal rückwärts</b> ziehen und sogar <b>rückwärts springend schlagen</b>. Schlag mit der Dame den silbernen Stein hinter ihr!', done: 'Klasse! Die Dame kann vor und zurück, darum ist sie viel stärker als ein Mann.' },
      { say: 'Gewinnen, Weg Nr. 1: <b>schlag alle</b> Steine des Gegners! Nimm den letzten silbernen.', done: 'Juhu, gewonnen! Nur noch Gold auf dem Brett.' },
      { say: 'Gewinnen, Weg Nr. 2: Auch mit Steinen auf dem Brett <b>verliert, wer keinen Zug mehr hat</b>. Versperr dem silbernen Mann den Weg!', done: 'Silber kann nicht mehr ziehen. Auch das ist ein Sieg!' },
      { say: '<b>Remis</b> ist es, wenn <b>dieselbe Stellung 3-mal</b> vorkommt oder <b>40 Züge pro Seite</b> ohne Schlagen und ohne Mann-Zug vergehen. Eine einzelne Dame, die sich in die leuchtende „<b>Doppelecke</b>“ rettet, hält oft das Remis.' },
      { say: 'Jetzt kennst du alle Regeln! Denk dran: Wenn du schlagen kannst, musst du. Auf zur ersten Partie!' },
    ] },
    hi: { name: 'चेकरैब', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'वहाँ नहीं जा सकते!', stuck: 'यह गोटी अभी नहीं चल सकती', own: 'सुनहरी गोटी पर टैप करो', must: 'जब मार सकते हो, तो <b>मारना ही पड़ेगा</b>!', want: 'इस बार वही चाल ढूँढो जो मैंने कही है। चमकती गोटियाँ इशारा हैं', wantMulti: 'एक चाल में <b>दो</b> मारने का रास्ता है। उतरने वाले खाने एक-एक करके भी टैप कर सकते हो!', wantKing: 'वह गोटी ढूँढो जो सबसे आख़िरी पंक्ति तक पहुँच सके', wantBack: 'राजा को <b>पीछे की ओर</b> कुदाओ', wantWin: 'इससे अभी जीत नहीं होगी। फिर से कोशिश करो!', crown: '👑 राजा!', win: '🏆 जीत!', s: [
      { say: 'कट-कट! मैं हूँ <b>चेकरैब</b>, और मुझे अपनी पीठ वाले राजा पर बड़ा गर्व है। चलो, इस बोर्ड पर साथ मिलकर <b>चेकर्स</b> के नियम सीखें!' },
      { say: 'सिर्फ़ <b>गहरे रंग के खाने</b> (32) इस्तेमाल होते हैं। पास की तीन पंक्तियों में रखी <b>12 सुनहरी गोटियाँ</b> तुम्हारी हैं, दूर वाली चाँदी की गोटियाँ विरोधी की। सुनहरा (काला) पहले चलता है, और हर गोटी <b>तिरछी</b> चलती है।' },
      { say: 'शुरू में हर गोटी एक <b>सिपाही</b> है। वह <b>तिरछे आगे एक खाना</b> चलता है और पीछे कभी नहीं लौट सकता, इसलिए सोचकर चलो! एक सुनहरी गोटी तिरछे आगे बढ़ाओ।', done: 'बढ़िया! सिपाही ऐसे ही एक-एक खाना आगे बढ़ता है।' },
      { say: 'अगर तिरछे सामने विरोधी की गोटी हो और उसके पीछे का खाना ख़ाली हो, तो तुम <b>उसके ऊपर से कूदकर उसे मार</b> सकते हो! चमकती गोटी से चाँदी वाली के ऊपर से कूदो।', done: 'खट! जिस गोटी के ऊपर से कूदे, वह बोर्ड से हट गई।' },
      { say: 'यह ज़रूरी है! जब मार सकते हो, तो <b>मारना अनिवार्य</b> है — कोई दूसरी चाल नहीं चलेगी। मारने वाली चाल ढूँढो और चलो!', done: 'सही! मारना हमेशा पहले आता है। इसीलिए लोग जानबूझकर गोटी देकर जाल बिछाते हैं।' },
      { say: 'उतरने के बाद अगर फिर कूद सकते हो, तो <b>कूदते रहो</b> और सब मार लो (<b>लगातार कूद</b>)। एक ही चाल में दो गोटियाँ मारो!', done: 'एक साथ दो! जब तक कूद सकते हो, आख़िर तक कूदना ही नियम है।' },
      { say: 'सिपाही जब <b>सबसे आख़िरी पंक्ति</b> (चमकती वाली) तक पहुँचता है, उस पर एक और गोटी रखी जाती है और वह <b>राजा</b> बन जाता है! एक सुनहरे सिपाही को आख़िरी पंक्ति तक ले जाओ।', done: 'राजा बन गया! देखो, मुकुट कैसे चमक रहा है। राजा बनते ही वह चाल ख़त्म हो जाती है।' },
      { say: 'राजा <b>तिरछे पीछे भी</b> चल सकता है और <b>पीछे की ओर कूदकर मार</b> भी सकता है। राजा से पीछे खड़ी चाँदी की गोटी मारो!', done: 'वाह! आगे-पीछे दोनों ओर चलने वाला राजा सिपाही से कहीं ज़्यादा ताक़तवर है।' },
      { say: 'जीत का तरीक़ा 1: विरोधी की <b>सारी गोटियाँ मार दो</b>! आख़िरी चाँदी वाली गोटी मारो।', done: 'हुर्रे, जीत! बोर्ड पर सिर्फ़ सुनहरी गोटियाँ बचीं।' },
      { say: 'जीत का तरीक़ा 2: गोटियाँ बची हों तब भी, जो <b>एक भी चाल न चल सके, वह हारता है</b>। चाँदी वाले सिपाही का रास्ता रोक दो!', done: 'चाँदी अब हिल भी नहीं सकती। यह भी जीत है!' },
      { say: 'अगर <b>एक ही स्थिति 3 बार</b> आए, या बिना मारे और बिना सिपाही बढ़ाए <b>दोनों की 40-40 चालें</b> हो जाएँ, तो <b>ड्रॉ</b> होता है। अकेला राजा भी चमकते “<b>डबल कॉर्नर</b>” में छिप जाए तो अक्सर ड्रॉ बचा लेता है।' },
      { say: 'अब तुम सारे नियम जान गए! बस याद रखना: मार सकते हो तो मारना ही है। चलो, एक बाज़ी खेलें!' },
    ] },
    ar: { name: 'تشيكراب', next: 'التالي', back: 'رجوع', start: 'هيا نلعب', again: 'مرة أخرى', tap: 'انقر على مكان مضيء', nope: 'لا يمكنها الذهاب إلى هناك!', stuck: 'هذه القطعة لا تستطيع التحرك الآن', own: 'انقر على قطعة ذهبية', must: 'عندما تستطيع الأسر، <b>يجب</b> أن تأسر!', want: 'ابحث هذه المرة عن النقلة المطلوبة. القطع المضيئة تلميح', wantMulti: 'هناك طريق لأسر <b>قطعتين</b> في نقلة واحدة. يمكنك أيضًا النقر على مربعات الهبوط واحدًا تلو الآخر!', wantKing: 'ابحث عن قطعة تصل إلى الصف الأخير', wantBack: 'اجعل الملك يقفز <b>إلى الخلف</b>', wantWin: 'هذا لا يكفي للفوز بعد. حاول مرة أخرى!', crown: '👑 ملك!', win: '🏆 فزت!', s: [
      { say: 'طق طق! أنا <b>تشيكراب</b>، وأنا فخور جدًا بالملك الذي على ظهري. هيا نتعلم معًا قواعد <b>الداما</b> على هذه اللوحة!' },
      { say: 'نستخدم <b>المربعات الداكنة فقط</b> (32 مربعًا). القطع <b>الذهبية الـ12</b> في الصفوف الثلاثة القريبة لك، والفضية لخصمك. يبدأ الذهبي (الأسود)، وكل القطع تتحرك <b>قطريًا</b>.' },
      { say: 'كل قطعة تبدأ <b>جنديًا</b>. يتقدم الجندي <b>مربعًا واحدًا قطريًا إلى الأمام</b> ولا يرجع أبدًا، ففكّر جيدًا! حرّك قطعة ذهبية قطريًا إلى الأمام.', done: 'رائع! هكذا يمشي الجندي: إلى الأمام، مربعًا بعد مربع.' },
      { say: 'إذا كانت قطعة للخصم أمامك قطريًا والمربع خلفها فارغ، يمكنك <b>القفز فوقها وأسرها</b>! اقفز بالقطعة المضيئة فوق القطعة الفضية.', done: 'طَق! القطعة التي قفزت فوقها تغادر اللوحة.' },
      { say: 'هذا مهم! عندما تستطيع الأسر، <b>يجب أن تأسر</b>؛ لا تُسمح بأي نقلة أخرى. ابحث عن الأسر ونفّذه!', done: 'صحيح! الأسر يأتي دائمًا أولًا. لذلك ينصب بعض اللاعبين فخًّا بتقديم قطعة.' },
      { say: 'إذا استطعت القفز مرة أخرى من مكان هبوطك، <b>تابع القفز</b> وخذها كلها (<b>قفز متتالٍ</b>). أسر قطعتين في نقلة واحدة!', done: 'اثنتان دفعة واحدة! ما دمت تستطيع القفز، عليك أن تكمل حتى النهاية.' },
      { say: 'عندما يصل الجندي إلى <b>الصف الأخير</b> (الصف المضيء)، توضع فوقه قطعة أخرى فيصبح <b>ملكًا</b>! أوصل جنديًا ذهبيًا إلى الصف الأخير.', done: 'وُلد ملك! انظر إلى التاج اللامع. التتويج يُنهي النقلة.' },
      { say: 'يستطيع الملك أيضًا التحرك <b>قطريًا إلى الخلف</b>، بل و<b>الأسر بالقفز إلى الخلف</b>. أسر بالملك القطعة الفضية التي خلفه!', done: 'مدهش! الملك يذهب للأمام وللخلف، لذلك هو أقوى بكثير من الجندي.' },
      { say: 'طريقة الفوز رقم 1: <b>أسر كل</b> قطع الخصم! خذ آخر قطعة فضية.', done: 'هيه، فزت! لم يبقَ على اللوحة إلا الذهبي.' },
      { say: 'طريقة الفوز رقم 2: حتى لو بقيت له قطع، من <b>لا يستطيع القيام بأي نقلة يخسر</b>. اسدّ الطريق أمام الجندي الفضي!', done: 'الفضي لا يستطيع الحركة إطلاقًا. وهذا فوز أيضًا!' },
      { say: 'تكون النتيجة <b>تعادلًا</b> إذا <b>تكرر الوضع نفسه 3 مرات</b>، أو مرت <b>40 نقلة لكل طرف</b> بلا أسر ولا تقدّم جندي. والملك الوحيد الذي يحتمي بـ«<b>الزاوية المزدوجة</b>» المضيئة كثيرًا ما ينجو بالتعادل.' },
      { say: 'صرت تعرف كل القواعد! تذكّر فقط: إذا استطعت الأسر فعليك أن تأسر. هيا نلعب!' },
    ] },
    ru: { name: 'Чекраб', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tap: 'Нажми на светящееся место', nope: 'Туда нельзя!', stuck: 'Эта шашка сейчас не может ходить', own: 'Нажми на золотую шашку', must: 'Если можно бить — <b>бить обязательно</b>!', want: 'Сейчас найди ход, о котором я просил. Светящиеся шашки — подсказка', wantMulti: 'Можно взять <b>две</b> за один ход. Поля приземления можно нажимать по очереди!', wantKing: 'Найди шашку, которая дойдёт до последнего ряда', wantBack: 'Пусть дамка прыгнет <b>назад</b>', wantWin: 'Это ещё не победа. Попробуй снова!', crown: '👑 Дамка!', win: '🏆 Победа!', s: [{ say: 'Щёлк-щёлк! Я <b>Чекраб</b> и очень горжусь дамкой на своей спине. Давай вместе изучим правила <b>шашек</b> на этой доске!' }, { say: 'Используются только <b>тёмные поля</b> (их 32). <b>12 золотых шашек</b> на трёх ближних рядах — твои, серебряные — соперника. Золотые (чёрные) ходят первыми, и все шашки ходят <b>по диагонали</b>.' }, { say: 'Каждая шашка сначала — <b>простая</b>. Простая ходит <b>на одно поле по диагонали вперёд</b> и никогда назад, так что сначала подумай! Сходи золотой шашкой по диагонали вперёд.', done: 'Отлично! Так и ходит простая: вперёд, по одному полю.' }, { say: 'Если вражеская шашка стоит по диагонали перед тобой, а поле за ней пусто, можно <b>перепрыгнуть и взять её</b>! Перепрыгни светящейся шашкой через серебряную.', done: 'Щёлк! Перепрыгнутая шашка уходит с доски.' }, { say: 'Это важно! Если можно бить — <b>бить обязательно</b>, другие ходы нельзя. Найди взятие и сделай его!', done: 'Верно! Взятие всегда на первом месте. Поэтому игроки ставят ловушки, отдавая шашку.' }, { say: 'Если с поля приземления можно прыгнуть снова, <b>продолжай бить</b> и бери все (<b>серия взятий</b>). Возьми две шашки за один ход!', done: 'Сразу две! Пока можно прыгать, нужно бить до конца.' }, { say: 'Когда простая доходит до <b>последнего ряда</b> (светящегося), на неё кладут ещё одну шашку, и она становится <b>дамкой</b>! Доведи золотую простую до последнего ряда.', done: 'Дамка родилась! Смотри, какая блестящая корона. Превращение в дамку завершает ход.' }, { say: 'Дамка может ходить и <b>по диагонали назад</b>, и <b>бить назад</b>. Возьми дамкой серебряную шашку позади неё!', done: 'Здорово! Дамка ходит вперёд и назад, поэтому она гораздо сильнее простой.' }, { say: 'Способ победить №1: <b>взять все</b> шашки соперника! Возьми последнюю серебряную.', done: 'Ура, победа! На доске остались только золотые.' }, { say: 'Способ победить №2: даже с шашками на доске игрок, который <b>не может сделать ход, проигрывает</b>. Перекрой путь серебряной простой!', done: 'Серебряным некуда ходить. Это тоже победа!' }, { say: '<b>Ничья</b>, если <b>одна и та же позиция повторится 3 раза</b> или пройдёт <b>по 40 ходов</b> без взятий и без ходов простыми. Одинокая дамка, укрывшаяся в светящемся «<b>двойном углу</b>», часто удерживает ничью.' }, { say: 'Теперь ты знаешь все правила! Главное: если можно бить — бей. Сыграем партию!' }] },
    'zh-TW': { name: '跳棋蟹', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', tap: '點擊發光的地方', nope: '那裡不能走喔！', stuck: '那顆棋子現在不能動', own: '請點擊金色棋子', must: '能吃子的時候<b>一定要</b>吃！', want: '這次請找出我說的那一步。發光的棋子是提示', wantMulti: '有辦法一步吃掉<b>2顆</b>喔。也可以依序點擊落點！', wantKing: '找出能走到最底線的棋子', wantBack: '讓王棋<b>往後</b>跳', wantWin: '這樣還沒贏喔。再試一次！', crown: '👑 升王！', win: '🏆 你贏了！', s: [{ say: '喀嚓喀嚓！我是<b>跳棋蟹</b>，背上的王冠是我的驕傲。一起在這塊棋盤上學<b>西洋跳棋</b>的規則吧！' }, { say: '只使用<b>深色格</b>（共32格）。靠近你的3排上的<b>12顆金色棋子</b>是你的，銀色的是對手的。金色（黑方）先走，所有棋子都<b>斜著</b>走。' }, { say: '一開始所有棋子都是<b>兵</b>。兵只能<b>往斜前方走1格</b>，絕對不能後退，所以要先想清楚！讓1顆金色棋子往斜前方走。', done: '很好！兵就是這樣一次往前走1格。' }, { say: '如果斜前方有對方的棋子，而它後面的格子是空的，就能<b>跳過去吃掉它</b>！讓發光的棋子跳過銀色棋子。', done: '喀！被跳過的棋子會離開棋盤。' }, { say: '這很重要！能吃子的時候<b>一定要吃</b>，不能走別步。找出吃子的那一步吃掉它！', done: '答對了！吃子永遠優先。所以玩家會故意送子設下陷阱。' }, { say: '落下的位置如果還能再跳，就<b>繼續跳</b>，全部吃掉（<b>連跳</b>）。一步吃掉2顆棋子！', done: '一次2顆！只要還能跳，就必須跳到最後。' }, { say: '兵走到<b>最遠的一排</b>（發光的那排）時，會再疊上一顆棋子變成<b>王棋</b>！把金色的兵帶到最遠的一排。', done: '王棋誕生了！看這頂閃亮的王冠。升王時這一步就結束。' }, { say: '王棋也可以<b>往斜後方</b>走，也能<b>往後跳吃</b>。用王棋吃掉它後面的銀色棋子！', done: '太棒了！王棋能前進也能後退，比兵強多了。' }, { say: '獲勝方法1：<b>吃光</b>對手所有的棋子！吃掉最後一顆銀色棋子。', done: '萬歲，你贏了！棋盤上只剩金色棋子。' }, { say: '獲勝方法2：就算還有棋子，<b>沒有任何一步可走的一方就輸了</b>。堵住銀色兵的去路！', done: '銀色完全不能動了。這也算贏！' }, { say: '<b>同一局面出現3次</b>，或雙方<b>各走40步</b>都沒有吃子也沒有兵移動，就是<b>和局</b>。單獨一顆王棋躲進發光的「<b>雙角</b>」，常常能守成和局。' }, { say: '規則全部學會了！只要記得：能吃就一定要吃。來下一局吧！' }] },
    id: { name: 'Checkrab', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tap: 'Ketuk tempat yang menyala', nope: 'Tidak bisa ke sana!', stuck: 'Bidak itu tak bisa bergerak sekarang', own: 'Ketuk bidak emas', must: 'Jika bisa menangkap, kamu <b>wajib</b> menangkap!', want: 'Kali ini, cari langkah yang kuminta. Bidak yang menyala adalah petunjuk', wantMulti: 'Ada cara mengambil <b>dua</b> dalam satu langkah. Kamu juga bisa mengetuk kotak pendaratan satu per satu!', wantKing: 'Cari bidak yang bisa mencapai baris terjauh', wantBack: 'Buat raja melompat <b>mundur</b>', wantWin: 'Itu belum menang. Coba lagi!', crown: '👑 Raja!', win: '🏆 Kamu menang!', s: [{ say: 'Kres kres! Aku <b>Checkrab</b>, dan aku bangga sekali dengan raja di punggungku. Ayo belajar aturan <b>dam</b> bersama di papan ini!' }, { say: 'Hanya <b>kotak gelap</b> yang dipakai (32 kotak). <b>12 bidak emas</b> di tiga baris terdekat milikmu; yang perak milik lawan. Emas (Hitam) jalan duluan, dan semua bidak bergerak <b>diagonal</b>.' }, { say: 'Setiap bidak awalnya <b>bidak biasa</b>. Bidak biasa melangkah <b>satu kotak diagonal ke depan</b> dan tak pernah mundur, jadi pikirkan dulu! Gerakkan satu bidak emas diagonal ke depan.', done: 'Bagus! Begitulah bidak biasa berjalan: maju, satu kotak sekali jalan.' }, { say: 'Jika bidak lawan ada diagonal di depanmu dan kotak di baliknya kosong, kamu bisa <b>melompatinya dan menangkapnya</b>! Lompatkan bidak yang menyala melewati yang perak.', done: 'Tak! Bidak yang dilompati keluar dari papan.' }, { say: 'Ini penting! Jika bisa menangkap, kamu <b>wajib menangkap</b>; langkah lain tidak boleh. Temukan tangkapannya dan ambil!', done: 'Benar! Tangkapan selalu didahulukan. Karena itu pemain memasang jebakan dengan memberikan bidak.' }, { say: 'Jika dari tempat mendarat kamu bisa melompat lagi, <b>terus melompat</b> dan ambil semuanya (<b>lompatan beruntun</b>). Ambil dua bidak dalam satu langkah!', done: 'Dua sekaligus! Selama masih bisa melompat, kamu harus terus sampai akhir.' }, { say: 'Saat bidak biasa mencapai <b>baris terjauh</b> (yang menyala), bidak lain ditumpuk di atasnya dan ia jadi <b>raja</b>! Bawa bidak emas ke baris terjauh.', done: 'Raja lahir! Lihat mahkotanya yang berkilau. Menjadi raja mengakhiri langkah.' }, { say: 'Raja juga bisa bergerak <b>diagonal mundur</b>, dan bisa <b>melompat mundur</b> juga. Pakai raja untuk menangkap bidak perak di belakangnya!', done: 'Hebat! Raja bisa maju dan mundur, jadi jauh lebih kuat dari bidak biasa.' }, { say: 'Cara menang #1: <b>tangkap semua</b> bidak lawan! Ambil bidak perak terakhir.', done: 'Hore, kamu menang! Hanya emas yang tersisa di papan.' }, { say: 'Cara menang #2: meski masih punya bidak, pemain yang <b>tak bisa melangkah kalah</b>. Halangi jalan bidak perak!', done: 'Perak sama sekali tak bisa bergerak. Itu juga menang!' }, { say: 'Hasilnya <b>seri</b> jika <b>posisi yang sama muncul 3 kali</b>, atau jika lewat <b>40 langkah masing-masing</b> tanpa tangkapan dan tanpa bidak biasa bergerak. Raja sendirian yang bersembunyi di “<b>pojok ganda</b>” yang menyala sering bisa bertahan seri.' }, { say: 'Sekarang kamu tahu semua aturannya! Ingat saja: jika bisa menangkap, wajib. Ayo main!' }] },
    tr: { name: 'Checkrab', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tap: 'Parlayan yere dokun', nope: 'Oraya gidemez!', stuck: 'Bu taş şu an oynayamaz', own: 'Altın bir taşa dokun', must: 'Alabiliyorsan almak <b>zorundasın</b>!', want: 'Bu kez istediğim hamleyi bul. Parlayan taşlar ipucu', wantMulti: 'Tek hamlede <b>iki</b> taş almanın yolu var. İniş karelerine sırayla da dokunabilirsin!', wantKing: 'Son sıraya ulaşabilen taşı bul', wantBack: 'Damayı <b>geriye</b> atlat', wantWin: 'Bu henüz kazandırmıyor. Tekrar dene!', crown: '👑 Dama!', win: '🏆 Kazandın!', s: [{ say: 'Çıt çıt! Ben <b>Checkrab</b>, sırtımdaki damayla çok gurur duyuyorum. Bu tahtada <b>dama</b>nın kurallarını birlikte öğrenelim!' }, { say: 'Yalnızca <b>koyu kareler</b> kullanılır (32 tane). Yakın üç sıradaki <b>12 altın taş</b> senin; gümüş taşlar rakibinin. Altın (Siyah) ilk oynar ve tüm taşlar <b>çapraz</b> hareket eder.' }, { say: 'Her taş önce <b>piyon</b>dur. Piyon <b>çapraz ileri bir kare</b> gider ve asla geri dönemez, önce düşün! Bir altın taşı çapraz ileri oynat.', done: 'Güzel! Piyon böyle yürür: ileri, birer kare.' }, { say: 'Rakip taş çapraz önündeyse ve arkasındaki kare boşsa <b>üzerinden atlayıp alabilirsin</b>! Parlayan taşı gümüş taşın üzerinden atlat.', done: 'Tak! Üzerinden atlanan taş tahtadan çıkar.' }, { say: 'Bu önemli! Alabiliyorsan <b>almak zorundasın</b>; başka hamle olmaz. Almayı bul ve yap!', done: 'Doğru! Alma her zaman önce gelir. Bu yüzden oyuncular taş vererek tuzak kurar.' }, { say: 'İndiğin yerden yine atlayabiliyorsan <b>atlamaya devam et</b> ve hepsini al (<b>çoklu atlama</b>). Tek hamlede iki taş al!', done: 'İkisi birden! Atlayabildiğin sürece sonuna kadar devam etmelisin.' }, { say: 'Piyon <b>son sıraya</b> (parlayan sıra) ulaşınca üstüne bir taş daha konur ve <b>dama</b> olur! Bir altın piyonu son sıraya götür.', done: 'Dama doğdu! Şu parlak taca bak. Dama olmak hamleyi bitirir.' }, { say: 'Dama <b>çapraz geriye</b> de gidebilir ve <b>geriye de atlayarak</b> alabilir. Damayla arkasındaki gümüş taşı al!', done: 'Harika! Dama ileri geri gider, bu yüzden piyondan çok daha güçlüdür.' }, { say: 'Kazanma yolu 1: rakibin <b>tüm taşlarını al</b>! Son gümüş taşı al.', done: 'Yaşasın, kazandın! Tahtada yalnızca altın taşlar kaldı.' }, { say: 'Kazanma yolu 2: taşı kalsa bile <b>hamle yapamayan oyuncu kaybeder</b>. Gümüş piyonun yolunu kapat!', done: 'Gümüş hiç oynayamıyor. Bu da galibiyet!' }, { say: '<b>Aynı pozisyon 3 kez</b> oluşursa ya da almasız ve piyon hareketi olmadan <b>her biri 40 hamle</b> geçerse oyun <b>berabere</b> biter. Parlayan “<b>çift köşe</b>”ye saklanan yalnız bir dama çoğu zaman beraberliği tutar.' }, { say: 'Artık tüm kuralları biliyorsun! Sadece şunu unutma: alabiliyorsan al. Hadi bir oyun oynayalım!' }] },
  };

  /* ---------- little sounds: metal on lacquer, a hop, a take, the crown and the guide's chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const put = () => { tone(320, 140, .1, .2); tone(2400, 0, .09, .025, 'triangle'); };
    const hop = () => tone(460, 200, .09, .16);
    const take = () => { tone(1800, 1500, .25, .05, 'triangle'); tone(210, 80, .18, .2); };
    const lift = () => tone(1500, 0, .06, .03, 'triangle');
    const crown = () => [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0, .5, .09, 'triangle', i * .07));
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { put, hop, take, lift, crown, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.checkers(true); T3.show('checkers', board); T3.play(true);
    const U = board.userData, Y = U.top, W = U.S * U.outer;
    if (T3.fit) T3.fit({ w: W + .3, d: W + .9, y: Y + .2, pitch: 1.0 });   // the whole board, large, from the player's side
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    // square 0..31 → the board, gold (Black) at the bottom (as at the table)
    const scr = i => { const [r, c] = E.RC[i]; return [7 - c, 7 - r]; };
    const xz = i => U.pt(...scr(i));
    const colOf = k => k <= 2 ? 1 : 2, isKing = k => k === 2 || k === 4;

    /* ---------- pieces (as atlas/games/checkers.js: lift, glide, hop, knock off, crown) ---------- */
    function mk(kind, sq) {
      const g = U.piece(colOf(kind) === 1 ? 'g' : 'w', isKing(kind), { reflect: U.mirror });
      const sh = T3.contact(.36, .55); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      g.userData.rf = g.children.find(o => o.userData && o.userData.reflection) || null;
      const [x, z] = xz(sq); g.position.set(x, Y, z); board.add(g); return g;
    }
    function lift(g, h) {
      g.position.y = Y + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .55 / (1 + h * 1.4); }
      if (g.userData.rf) g.userData.rf.position.y = -2 * h;
    }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(170, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setBoard() {   // diff against the pieces already on the board: the same ones stay still, only new ones drop in
      const old = pcs; pcs = {};
      board.children.filter(o => o.userData && o.userData.dying).forEach(drop);
      const order = []; for (let sq = 0; sq < 32; sq++) if (pos.at(sq)) order.push(sq);
      order.sort((a, b) => scr(b)[1] - scr(a)[1]);   // the near rows first
      let n = 0;
      order.forEach(sq => {
        const k = pos.at(sq), o = old[sq];
        if (o && o.k === k && !o.g.userData.dying) { delete old[sq]; pcs[sq] = o; const [x, z] = xz(sq); o.g.visible = true; o.g.position.x = x; o.g.position.z = z; o.g.scale.set(1, 1, 1); o.g.rotation.set(0, o.g.rotation.y, 0); lift(o.g, 0); return; }
        const g = mk(k, sq), j = n++; pcs[sq] = { g, k };
        g.visible = false;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); }); }, 40 + j * 16);
      });
      Object.values(old).forEach(p => drop(p.g));
      return n;
    }
    function knockOff(g, dx, dz) {
      g.userData.dying = true;
      const mats = [];
      g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      if (g.userData.rf) g.userData.rf.visible = false;
      const len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len, x0 = g.position.x, z0 = g.position.z;
      const axis = new TH.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new TH.Quaternion(), sh = g.userData.sh;
      SFX.take();
      anim(560, k => {
        qt.setFromAxisAngle(axis, 2.4 * k); g.quaternion.copy(qt).multiply(q0);
        g.position.x = x0 + ux * .5 * k; g.position.z = z0 + uz * .5 * k; g.position.y = Y + Math.sin(k * Math.PI) * .8;
        const f = k < .4 ? 1 : 1 - (k - .4) / .6; mats.forEach(m => { m.opacity = Math.max(0, f); }); if (sh) sh.material.opacity = .55 * Math.max(0, 1 - k * 2);
      }, () => { drop(g); mats.forEach(m => m.dispose()); });
    }
    function crown(sq, col) {   // a second checker and the crown come down onto the man
      const p = pcs[sq]; if (!p) return;
      const old = p.g, g = mk(col === 1 ? 2 : 4, sq); p.g = g; p.k = col === 1 ? 2 : 4;
      const tops = g.children.filter(o => o.isMesh && !o.userData.contact).slice(1);
      tops.forEach(o => { o.userData.y0 = o.position.y; o.position.y += 1.6; });
      drop(old);
      anim(420, k => { const e = k < .7 ? (k / .7) * (k / .7) : 1, b = k < .7 ? 0 : Math.sin((k - .7) / .3 * Math.PI) * .12; tops.forEach(o => { o.position.y = o.userData.y0 + 1.6 * (1 - e) + b; }); },
        () => { tops.forEach(o => { o.position.y = o.userData.y0; }); land(g); SFX.crown(); });
    }
    function travel(g, path, cap, vict, done) {
      const pts = path.map(xz), H = .32, A = 110, D = 140;
      const legs = []; for (let i = 1; i < pts.length; i++) legs.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const legT = cap ? legs.map(() => 330) : legs.map(d => 200 + d * 90), mid = legT.reduce((a, b) => a + b, 0), dur = A + mid + D;
      const h0 = hOf(g), victims = [];
      if (cap) for (let i = 1; i < path.length; i++) { const [ra, ca] = E.RC[path[i - 1]], [rb, cb] = E.RC[path[i]]; victims.push(E.sqAt((ra + rb) / 2, (ca + cb) / 2)); }
      const hit = victims.map(() => false), hopped = victims.map(() => false);
      anim(dur, k => {
        const tm = k * dur;
        if (tm < A) { lift(g, h0 + (H - h0) * io(tm / A)); return; }
        if (tm >= A + mid) { const [x, z] = pts[pts.length - 1]; g.position.x = x; g.position.z = z; const q = (tm - A - mid) / D; lift(g, H * (1 - q * q)); return; }
        let r = tm - A, i = 0; while (i < legT.length - 1 && r > legT[i]) { r -= legT[i]; i++; }
        const e = io(Math.min(1, r / legT[i])), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        lift(g, H + (cap ? Math.sin(e * Math.PI) * .55 : 0));
        if (cap) {
          if (!hopped[i] && e > .05) { hopped[i] = true; SFX.hop(); }
          if (!hit[i] && e > .5) { hit[i] = true; const vg = vict[victims[i]]; if (vg && !vg.userData.dying) knockOff(vg, x1 - x0, z1 - z0); }
        }
      }, () => { lift(g, 0); SFX.put(); land(g); if (done) done(); });
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } kick(); }
    function tile(i, color, op = .45, pulse = true) {
      const m = new TH.Mesh(new TH.PlaneGeometry(.94, .94), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .006, z); m.userData.pulse = pulse; m.renderOrder = 2; marks.add(m); return m;
    }
    function dot(i, color, r = .15) { const m = new TH.Mesh(new TH.CylinderGeometry(r, r, .012, 28), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .9, toneMapped: false, depthWrite: false })); const [x, z] = xz(i); m.position.set(x, Y + .02, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color) { const m = new TH.Mesh(new TH.TorusGeometry(.46, .035, 8, 44), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false, depthWrite: false })); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .03, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; const pl = m.geometry.type === 'PlaneGeometry'; if (!pl) { const s = .88 + k * .24; m.scale.set(s, m.geometry.type === 'TorusGeometry' ? s : 1, s); } m.material.opacity = (pl ? .22 : .45) + k * (pl ? .3 : .5); } }); if (any) kick(60); requestAnimationFrame(pulse); })();
    // the moves the task accepts (the engine's legal moves, filtered)
    const capN = m => E.bitsOf(E.mCap(m)).length;
    function accepted(st) {
      const all = pos.moves();
      if (st.act === 'step') return all.filter(m => !E.mCap(m));
      if (st.act === 'cap') return all.filter(m => E.mCap(m));
      if (st.act === 'multi') return all.filter(m => capN(m) >= 2);
      if (st.act === 'king') return all.filter(m => pos.promotes(m));
      if (st.act === 'back') return all.filter(m => E.mCap(m) && isKing(pos.at(E.mFrom(m))) && E.RC[E.mTo(m)][0] < E.RC[E.mFrom(m)][0]);
      if (st.act === 'win') return all.filter(m => { const q = E.Pos.from(pos.spec()); q.play(m); return q.status() === -1; });
      return [];
    }
    const wantMsg = st => st.act === 'multi' ? L.wantMulti : st.act === 'king' ? L.wantKing : st.act === 'back' ? L.wantBack : st.act === 'win' ? L.wantWin : L.want;
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.glow === 'all') for (let i = 0; i < 32; i++) tile(i, 0xffc94a, .4);
      else (st.glow || []).forEach(i => tile(i, 0xffc94a, .4));
      if (st.glowRow && !played) for (let i = 28; i < 32; i++) tile(i, 0xffc94a, .4);   // the far row (Black's crowning row)
      if (!st.act || played) return;
      if (sel) {
        ring(sel.from, 0xffc94a);
        const k = sel.trail.length;
        for (let j = 1; j < k; j++) tile(sel.trail[j], 0x2fd17a, .3, false);
        const next = new Set(), fin = new Set();
        sel.cands.forEach(m => { const p = E.path(pos, m); if (p.length > k && sel.trail.every((s, j) => p[j] === s)) { next.add(p[k]); if (p.length === k + 1) fin.add(p[k]); } });
        next.forEach(i => dot(i, 0x2fd17a, fin.has(i) ? .15 : .1));
        return;
      }
      new Set(accepted(st).map(E.mFrom)).forEach(f => ring(f, 0x2fd17a));
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
      if (T3.checkers && T3.checkers.recolor) html = T3.checkers.recolor(html, TXT[ctx.lang] ? ctx.lang : 'en', null, 'metal');   // (the texts say gold / silver: the chosen set's colours, 2026-11-14)
      const tx = $('.tx'); tx.innerHTML = window.TapWord ? TapWord.fix(html) : html; clearInterval(typeT);
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
      nx.textContent = (window.TapWord ? TapWord.fix : x => x)(st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶');
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
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
      pos = E.Pos.from(st.pos);
      const cnt = setBoard();
      later(showTask, 380 + cnt * 16);
      say(L.s[step].say); buttons();
    }
    function finish(m, promo) {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      if (st.act === 'win') { tip(L.win); SFX.chime(); Object.values(pcs).forEach(p => { if (colOf(p.k) === 1) anim(700, k => lift(p.g, Math.sin(k * Math.PI) * .5)); }); }
      else if (promo) tip(L.crown);
      else SFX.chime();
      buttons(); autoNext();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let c = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      if (c < 0 || c > 7 || r < 0 || r > 7) return -1;
      return E.sqAt(7 - r, 7 - c);
    }
    function liftSel(i, on) { const p = pcs[i]; if (!p) return; const g = p.g, h0 = hOf(g), h1 = on ? .28 : 0; anim(130, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function deselect() { if (sel) liftSel(sel.from, false); sel = null; showTask(); }
    function commit(m) {
      busy = true; const from = E.mFrom(m), to = E.mTo(m), cap = E.mCap(m), path = E.path(pos, m), promo = pos.promotes(m);
      sel = null; clearMarks();
      const p = pcs[from]; delete pcs[from];
      const vict = {}; E.bitsOf(cap).forEach(i => { if (pcs[i]) { vict[i] = pcs[i].g; delete pcs[i]; } });
      pos.play(m); pcs[to] = p;
      travel(p.g, path, cap, vict, () => {
        Object.values(vict).forEach(g => { if (g.parent && !g.userData.dying) knockOff(g, 0, 1); });
        if (promo) { crown(to, 1); later(() => finish(m, true), 520); } else later(() => finish(m, false), 200);
      });
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) { if (sel) deselect(); return; }
      const A = accepted(st), legal = pos.moves(), k0 = pos.at(i), own = k0 && colOf(k0) === 1;
      if (own && (!sel || sel.trail.length === 1 || i === sel.from)) {
        if (sel && sel.from === i) { deselect(); return; }
        const c = A.filter(m => E.mFrom(m) === i);
        if (!c.length) { say(legal.some(m => E.mFrom(m) === i) ? wantMsg(st) : legal.length && E.mCap(legal[0]) ? L.must : L.stuck); return; }
        if (sel) liftSel(sel.from, false);
        sel = { from: i, trail: [i], cands: c }; liftSel(i, true); SFX.lift(); showTask(); return;
      }
      if (!sel) { say(legal.length && E.mCap(legal[0]) && st.must ? L.must : L.own); return; }
      const k = sel.trail.length, paths = sel.cands.map(m => ({ m, p: E.path(pos, m) })).filter(x => sel.trail.every((s, j) => x.p[j] === s));
      const nx = paths.filter(x => x.p[k] === i);
      if (nx.length) {
        const fin = nx.filter(x => x.p.length === k + 1);
        if (fin.length && fin.length === nx.length) { commit(fin[0].m); return; }
        sel.trail.push(i); sel.cands = nx.map(x => x.m); SFX.hop(); showTask(); return;   // a multi-jump, hop by hop
      }
      const ends = paths.filter(x => E.mTo(x.m) === i);
      if (ends.length === 1) { commit(ends[0].m); return; }
      const any = legal.some(m => E.mFrom(m) === sel.from && E.mTo(m) === i);
      say(any ? wantMsg(st) : legal.length && E.mCap(legal[0]) ? L.must : L.nope);
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
    loadEngine().then(e => { if (stopped) return; E = e; later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-checkers-rules-seen', '1'); } catch (e) {}
    // test hooks
    const dbg = { at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); }, acc: () => STEPS[step].act && E ? accepted(STEPS[step]).map(m => E.path(pos, m)) : null, sel: () => sel && sel.trail.slice(), step: () => step, steps: STEPS.length, played: () => played, busy: () => busy, go: n => go(n),
      plan: () => { const a = dbg.acc(); return a && a.length ? a[0].map(dbg.at) : []; } };   // the taps that solve the task (hop by hop)
    window.__ckRules = dbg;
    return {
      stop() { stopped = true; if (window.__ckRules === dbg) delete window.__ckRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.checkers = { start };
})();
