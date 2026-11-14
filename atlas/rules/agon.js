/* =====================================================================
   Agon rules — a guided tour on the 3D table (the board the player last chose: the 1842 London
   mahogany board or the worn American folk-art panel, atlas/models/agon.js), told by Goldpup.
   A short hands-on course: the board and its six rings, the queen and the guards, a step inwards,
   never outwards, the throne is the queen's, a sandwich capture, relocating a captured guard
   (and the queen), the cell between two enemies, the throne win, the empty-throne loss, let's play.
   Every task is checked live by the game's own rules (../agon/engine.js); you play White.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Cells in the game's notation ('3.5': ring 3, 5th cell of that ring; 'T' the throne).
   The positions are the 2D page's own tour (agon/app.js TOUR_PAGES).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-gold.webp', ENG = '../agon/engine.js?v=7-ab-zf1';
  const loadEngine = () => window.AgonEngine ? Promise.resolve(window.AgonEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.AgonEngine ? res(window.AgonEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  // p: the pieces (W / B queen, w / b guards, x captured); act: what the task accepts; glow: soft gold cells; ok / ng: green / red cells;
  // dest: a piece whose possible steps are shown (green) next to the forbidden ones (red)
  const STEPS = [
    { start: true },
    { start: true, rings: true },
    { p: { W: '5.16', w: ['5.21'], B: '5.1', b: ['5.26'] }, glow: ['5.16', '5.1'] },
    { p: { w: ['4.7', '5.21'], W: '5.16', b: ['5.4', '5.27'], B: '5.1' }, act: 'in', from: '4.7' },
    { p: { w: ['3.5'], W: '5.16', b: ['5.4'], B: '5.1' }, show: '3.5' },
    { p: { W: '1.3', w: ['1.4', '2.9'], b: ['3.2', '4.20'], B: '5.1' }, act: 'throne', glow: ['T'] },
    { p: { w: ['2.3', '3.2'], W: '4.15', b: ['2.2', '3.15', '5.9'], B: '5.1' }, act: 'capture', glow: ['2.2'] },
    { p: { w: ['2.4', '3.12', '1.2'], W: '3.9', b: ['2.3', '2.5', '3.6'], B: '4.3', x: ['2.4'] }, act: 'reloc' },
    { p: { W: '1.2', w: ['2.2', '3.10'], b: ['1.1', '2.4', '4.5'], B: '3.8', x: ['1.2'] }, act: 'reloc' },
    { p: { w: ['3.3', '4.20'], W: '5.16', b: ['2.1', '2.3', '4.11'], B: '5.1' }, act: 'any', ng: ['2.2'] },
    { p: { W: 'T', w: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.12'], b: ['3.4', '4.9', '5.3', '2.6', '3.8', '4.17'], B: '5.20' }, act: 'goal', glow: ['1.6'] },
    { p: { w: ['1.1', '1.2', '1.3', '1.4', '1.5'], b: ['2.3', '3.10', '4.2'], B: '3.14', W: '4.18' }, ng: ['1.6'], glow: ['T'] },
    { start: true, last: true },
  ];

  const TXT = {
    ja: { name: 'キンダイスン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないワン', stuck: 'その駒は今は動かせないよ', own: '白い駒をタップしてね', wantIn: '今回は<b>内側の輪</b>へ進んでみて！', wantThrone: '王座に入れるのは<b>女王（六角形）</b>だけだよ', wantCap: '黒の駒を<b>一直線にはさめる</b>マスをさがしてね', wantReloc: '取られた駒を置き直すのが先だよ', relocOnly: '光っているマスへ置き直してね', took: '捕獲！', crown: '戴冠！', s: [
      { say: 'ワンワン！ ぼくは<b>キンダイスン</b>、ふるとラッキーが出る金色の子犬だよ。今日は1842年のロンドン生まれ、六角形のマスで遊ぶ<b>アゴン</b>をいっしょに覚えよう！' },
      { say: '盤は<b>91マスの六角形</b>。まんなかの<b>王座</b>のまわりを、<b>6つの輪</b>がぐるっと囲んでいるよ。はじめは白と黒の駒が、いちばん外の輪に<b>こうごに</b>並んでいるんだ。' },
      { say: '<b>六角形の駒が女王</b>、<b>丸い駒がガード</b>（光っているのが女王だよ）。女王1枚とガード6枚でチームなんだ。動き方は同じだけど、<b>王座に入れるのは女王だけ</b>！' },
      { say: '手番では駒を1枚、<b>となりの空いているマスへ1歩</b>。行けるのは<b>同じ輪の上</b>か<b>1つ内側の輪</b>だよ。光っている白のガードを、内側の輪へ進めてみて！', done: 'いいね〜！ 1歩ずつ王座に近づいていくんだワン。' },
      { say: '大事なルール！ 駒は<b>外側の輪へは戻れない</b>んだ。緑のマスへは行けるけど、赤いマス（外側）へはダメ。跳び越えもないよ。だから、どの駒をいつ内側へ入れるかがカギなんだ。' },
      { say: '王座へ入れるのは<b>女王だけ</b>。ガードは王座のとなり（1の輪）までなんだ。白の女王を、光っている<b>王座</b>へ座らせてあげて！', done: '戴冠〜！ 女王が王座に座ったワン！' },
      { say: '動かした駒と自分のもう1枚で、相手の駒を<b>一直線にはさむ</b>と<b>捕獲</b>！ 光っている黒のガードを、白ではさんでみよう！', done: 'つかまえた！ 捕まった駒は盤に残って、ちょっと傾いてるでしょ？ 持ち主は<b>次の手番で置き直さないといけない</b>んだ。' },
      { say: 'あれれ、白のガードが捕まっちゃった（赤い輪の駒）。この手番は<b>置き直し</b>！ ほかの駒は動かせないよ。<b>捕まったガードは外周（5の輪）の好きな空きマス</b>へ。光っているマスへ置き直してね！', done: 'おかえり〜！ 外周からまた出発だワン。' },
      { say: '女王も同じようにはさまれると捕まるよ。でも女王は特別で、<b>王座以外の好きな空きマス</b>へ置き直せるんだ（外周でなくてもOK）。女王とガードが同時に捕まったら<b>女王が先</b>！ 置き直してみて！', done: 'さすが女王さま！ 好きな所から再出発だよ。' },
      { say: '相手の駒2枚の<b>あいだ</b>（一直線にはさまれる位置）へは<b>自分から入れない</b>んだ。赤いマスがそれ！ 自分からつかまりには行けないよ。どれか白の駒を動かしてみて！', done: 'そうそう！ 赤いマスには行けなかったでしょ？' },
      { say: '勝ち方はね、<b>女王が王座に座って、まわりの6マスをぜんぶ自分のガード</b>でうめること！ あと1枚だよ。光っているマスへガードを入れて完成させよう！', done: 'やったー、完成！ 女王と6人のガードで、白の勝ちだワン！' },
      { say: 'でも気をつけて！ 女王が王座にいないのに<b>ガード6枚で王座を囲むと、その場で負け</b>なんだ（赤いマスに6枚目を入れちゃダメ）。5枚そろったら、女王が王座に入るまで6枚目は待とうね。' },
      { say: '対局設定では、1842年の原典どおり<b>ガードを1枚ずつ置いて始める</b>遊び方も選べるよ。同じ局面が3回出たり、手数が上限になったら引き分け。さあ、いっしょに王座をめざそう〜！' },
    ] },
    en: { name: 'Goldpup', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "Woof, it can't go there!", stuck: "That piece can't move right now", own: 'Tap a white piece', wantIn: 'This time, step <b>into an inner ring</b>!', wantThrone: 'Only the <b>queen (the hexagon)</b> may enter the throne', wantCap: 'Find a cell that <b>sandwiches</b> a black piece in a line', wantReloc: 'First relocate your captured piece', relocOnly: 'Put it on a glowing cell', took: 'Captured!', crown: 'Crowned!', s: [
      { say: "Woof woof! I'm <b>Goldpup</b>, the golden puppy — give me a shake and luck falls out! Let's learn <b>Agon</b> together, a game of hexagons born in London in 1842!" },
      { say: 'The board has <b>91 hexagonal cells</b>: the <b>throne</b> in the middle and <b>six rings</b> all round it. At the start the white and black pieces stand on the outermost ring, <b>taking turns</b> with each other.' },
      { say: 'The <b>hexagonal piece is the queen</b>, the <b>round ones are guards</b> (the glowing ones are the queens). One queen and six guards make a team. They move alike, but <b>only the queen may enter the throne</b>!' },
      { say: 'On your turn move one piece <b>one step to an empty neighbouring cell</b>: <b>along its ring</b> or <b>one ring inwards</b>. Move the glowing white guard into the inner ring!', done: 'Nice! Step by step, closer to the throne.' },
      { say: 'Important rule! A piece <b>never moves back to an outer ring</b>. It may go to the green cells, never the red ones (outwards), and nothing jumps. So which piece goes in, and when, is the whole secret.' },
      { say: '<b>Only the queen</b> may sit on the throne — guards stop at ring 1, right round it. Seat the white queen on the glowing <b>throne</b>!', done: 'Crowned! The queen is on her throne, woof!' },
      { say: 'When the piece you move and another of yours <b>sandwich an enemy piece in a straight line</b>, it is <b>captured</b>! Sandwich the glowing black guard!', done: 'Got it! The captured piece stays on the board, leaning over — see? Its owner <b>must relocate it on the next turn</b>.' },
      { say: 'Uh-oh, a white guard was captured (the red ring). This turn is a <b>relocation</b> — no other piece may move. <b>A captured guard goes to any empty edge cell (ring 5)</b>. Put it on a glowing cell!', done: 'Welcome back! It starts again from the edge.' },
      { say: 'The queen is captured the same way, but she’s special: she may go to <b>any empty cell but the throne</b>, not only the edge. If the queen and a guard are both captured, <b>the queen goes first</b>. Relocate her!', done: 'Just like a queen — back in from wherever she likes!' },
      { say: 'You <b>may not step between two enemy pieces</b> in a line — the red cell is one. You can’t walk into a capture! Move any white piece.', done: 'That’s it! The red cell was off limits, wasn’t it?' },
      { say: 'Here’s how you win: <b>your queen on the throne and all six cells round her filled with your guards</b>! Only one to go — put a guard on the glowing cell!', done: 'Hooray, complete! A queen and her six guards: White wins, woof!' },
      { say: 'But careful! If your <b>six guards surround the throne while your queen is not on it, you lose at once</b> (so never the sixth one on the red cell). With five in place, keep the sixth back until the queen is seated.' },
      { say: 'In the new-game settings you can also start the 1842 way, <b>placing the guards one by one</b>. Three repetitions of a position, or the move limit, make a draw. Now, let’s head for the throne together!' },
    ] },
    zh: { name: '金骰子汪', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '汪，那里走不了！', stuck: '这枚棋子现在走不了哦', own: '请点击白色的棋子', wantIn: '这次往<b>内圈</b>走吧！', wantThrone: '只有<b>女王（六角形）</b>能进王座哦', wantCap: '找一个能把黑子<b>夹在一条直线上</b>的格子', wantReloc: '先把被吃的棋子放回去哦', relocOnly: '放到发光的格子吧', took: '吃子！', crown: '加冕！', s: [
      { say: '汪汪！我是<b>金骰子汪</b>，摇一摇就会掉出好运的金色小狗。今天一起学1842年诞生于伦敦、在六角格上玩的<b>阿贡（Agon）</b>吧！' },
      { say: '棋盘有<b>91个六角格</b>：中间是<b>王座</b>，周围绕着<b>6个圈</b>。开局时白棋和黑棋在最外圈<b>交替</b>排列。' },
      { say: '<b>六角形的是女王</b>，<b>圆形的是卫兵</b>（发光的是女王）。1个女王加6个卫兵组成一队。走法一样，但<b>只有女王能进王座</b>！' },
      { say: '轮到你时，把一枚棋子<b>走一步到相邻的空格</b>：可以<b>沿着同一圈</b>，或<b>往内走一圈</b>。把发光的白卫兵走进内圈试试！', desc: '', done: '很好～！一步一步靠近王座啦。' },
      { say: '重要规则！棋子<b>不能退回外圈</b>。绿色的格子能走，红色的（往外）不行，也不能跳。所以什么时候让哪枚棋子进来，就是关键。' },
      { say: '<b>只有女王</b>能坐上王座，卫兵最多走到王座旁边（第1圈）。让白女王坐上发光的<b>王座</b>吧！', done: '加冕～！女王坐上王座啦，汪！' },
      { say: '用移动的棋子和自己的另一枚棋子把对方棋子<b>夹在一条直线上</b>，就能<b>吃掉</b>它！夹住发光的黑卫兵吧！', done: '抓到了！被吃的棋子留在棋盘上，歪着身子对吧？它的主人<b>下一回合必须把它重新放置</b>。' },
      { say: '哎呀，白卫兵被吃了（红圈的那枚）。这一回合要<b>重新放置</b>，别的棋子不能动。<b>被吃的卫兵放到最外圈（第5圈）任意空格</b>。放到发光的格子吧！', done: '欢迎回来～！从外圈重新出发。' },
      { say: '女王被夹住也会被吃，但女王很特别：可以放到<b>王座以外的任意空格</b>（不一定在外圈）。女王和卫兵同时被吃时，<b>先放女王</b>！放放看吧！', done: '不愧是女王！想从哪里重新出发都行。' },
      { say: '不能<b>主动走进两枚对方棋子之间</b>（会被夹在一条直线上的位置），红色的格子就是。不能自投罗网哦！随便走一枚白棋吧。', done: '没错！红色的格子走不进去吧？' },
      { say: '获胜方法：<b>女王坐在王座上，周围6格全是自己的卫兵</b>！还差1枚，把卫兵放进发光的格子完成它吧！', done: '成功啦！女王和6名卫兵，白方获胜，汪！' },
      { say: '但要小心！女王不在王座上时，<b>用6个卫兵围住王座就会立刻输</b>（红格不能放第6枚）。凑齐5枚后，等女王进王座再放第6枚。' },
      { say: '在对局设置里，还能选1842年原版那样<b>逐个放置卫兵</b>开局的玩法。同一局面出现3次或达到步数上限就是和棋。来，一起朝王座出发吧～！' },
    ] },
    ko: { name: '킨다이슨', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '멍, 거기로는 못 가!', stuck: '그 말은 지금 못 움직여요', own: '흰 말을 탭해요', wantIn: '이번엔 <b>안쪽 고리</b>로 가 봐!', wantThrone: '왕좌에는 <b>여왕(육각형)</b>만 들어갈 수 있어', wantCap: '흑 말을 <b>한 줄로 끼울</b> 수 있는 칸을 찾아봐', wantReloc: '잡힌 말부터 다시 놓아야 해', relocOnly: '빛나는 칸에 다시 놓아 줘', took: '잡았다!', crown: '즉위!', s: [
      { say: '멍멍! 나는 <b>킨다이슨</b>, 흔들면 행운이 나오는 금빛 강아지야. 오늘은 1842년 런던에서 태어난 육각형 칸 게임 <b>아곤</b>을 같이 배워 보자!' },
      { say: '판은 <b>91칸의 육각형</b>. 가운데 <b>왕좌</b>를 <b>6개의 고리</b>가 빙 둘러싸고 있어. 처음엔 흰 말과 검은 말이 가장 바깥 고리에 <b>번갈아</b> 놓여 있어.' },
      { say: '<b>육각형 말이 여왕</b>, <b>동그란 말이 호위병</b>(빛나는 게 여왕). 여왕 1개와 호위병 6개가 한 팀이야. 움직이는 법은 같지만 <b>왕좌에는 여왕만</b> 들어갈 수 있어!' },
      { say: '차례가 되면 말 하나를 <b>옆의 빈칸으로 한 걸음</b>. <b>같은 고리 위</b>나 <b>한 칸 안쪽 고리</b>로만 갈 수 있어. 빛나는 흰 호위병을 안쪽 고리로 옮겨 봐!', done: '좋아~! 한 걸음씩 왕좌에 가까워지는 거야.' },
      { say: '중요한 규칙! 말은 <b>바깥 고리로는 돌아갈 수 없어</b>. 초록 칸은 되지만 빨간 칸(바깥쪽)은 안 돼. 뛰어넘기도 없어. 그래서 어떤 말을 언제 안으로 넣을지가 핵심이야.' },
      { say: '왕좌에는 <b>여왕만</b> 앉을 수 있어. 호위병은 왕좌 옆(1번 고리)까지야. 흰 여왕을 빛나는 <b>왕좌</b>에 앉혀 줘!', done: '즉위~! 여왕이 왕좌에 앉았어, 멍!' },
      { say: '움직인 말과 내 다른 말로 상대 말을 <b>한 줄로 끼우면 잡기</b>! 빛나는 흑 호위병을 흰 말로 끼워 봐!', done: '잡았다! 잡힌 말은 판에 남아서 살짝 기울어 있지? 주인은 <b>다음 차례에 다시 놓아야</b> 해.' },
      { say: '어라, 흰 호위병이 잡혔어(빨간 고리의 말). 이번 차례는 <b>재배치</b>! 다른 말은 못 움직여. <b>잡힌 호위병은 바깥 고리(5번)의 아무 빈칸</b>으로. 빛나는 칸에 놓아 줘!', done: '어서 와~! 바깥에서 다시 출발이야.' },
      { say: '여왕도 똑같이 끼우면 잡혀. 하지만 여왕은 특별해서 <b>왕좌 말고 아무 빈칸</b>에 놓을 수 있어(바깥 고리가 아니어도 OK). 여왕과 호위병이 같이 잡히면 <b>여왕 먼저</b>! 놓아 봐!', done: '역시 여왕님! 원하는 곳에서 다시 출발이야.' },
      { say: '상대 말 2개 <b>사이</b>(한 줄로 끼이는 자리)로는 <b>스스로 들어갈 수 없어</b>. 빨간 칸이 바로 그곳! 스스로 잡히러 갈 순 없지. 아무 흰 말이나 움직여 봐!', done: '맞아! 빨간 칸에는 못 갔지?' },
      { say: '이기는 방법은 <b>여왕이 왕좌에 앉고 주위 6칸을 모두 내 호위병</b>으로 채우는 거야! 하나 남았어. 빛나는 칸에 호위병을 넣어 완성하자!', done: '완성이야! 여왕과 호위병 6명, 백의 승리야, 멍!' },
      { say: '하지만 조심! 여왕이 왕좌에 없는데 <b>호위병 6개로 왕좌를 둘러싸면 그 자리에서 패배</b>야(빨간 칸에 6번째를 넣으면 안 돼). 5개가 모이면 여왕이 들어갈 때까지 6번째는 기다리자.' },
      { say: '대국 설정에서는 1842년 원전처럼 <b>호위병을 하나씩 놓으며 시작하는</b> 방법도 고를 수 있어. 같은 국면이 3번 나오거나 수 제한이 되면 무승부. 자, 같이 왕좌를 노려 보자~!' },
    ] },
    es: { name: 'Goldpup', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡Guau, ahí no puede ir!', stuck: 'Esa pieza no puede moverse ahora', own: 'Toca una pieza blanca', wantIn: '¡Esta vez, entra a un <b>anillo interior</b>!', wantThrone: 'Solo la <b>reina (el hexágono)</b> entra al trono', wantCap: 'Busca una casilla que <b>encierre en línea</b> una pieza negra', wantReloc: 'Primero recoloca tu pieza capturada', relocOnly: 'Ponla en una casilla que brilla', took: '¡Captura!', crown: '¡Coronada!', s: [
      { say: '¡Guau guau! Soy <b>Goldpup</b>, el cachorro dorado: ¡sacúdeme y cae buena suerte! Aprendamos juntos <b>Agon</b>, un juego de hexágonos nacido en Londres en 1842.' },
      { say: 'El tablero tiene <b>91 casillas hexagonales</b>: el <b>trono</b> en el centro y <b>seis anillos</b> a su alrededor. Al empezar, las piezas blancas y negras están en el anillo exterior, <b>alternadas</b>.' },
      { say: 'La <b>pieza hexagonal es la reina</b> y las <b>redondas son guardias</b> (las que brillan son las reinas). Una reina y seis guardias forman un equipo. Se mueven igual, ¡pero <b>solo la reina entra al trono</b>!' },
      { say: 'En tu turno mueve una pieza <b>un paso a una casilla vacía vecina</b>: <b>por su anillo</b> o <b>un anillo hacia dentro</b>. ¡Lleva el guardia blanco que brilla al anillo interior!', done: '¡Bien! Paso a paso, más cerca del trono.' },
      { say: '¡Regla importante! Una pieza <b>nunca vuelve a un anillo exterior</b>. Puede ir a las casillas verdes, nunca a las rojas (hacia fuera), y no hay saltos. Así que el secreto es qué pieza entra, y cuándo.' },
      { say: '<b>Solo la reina</b> se sienta en el trono; los guardias llegan como mucho al anillo 1, a su alrededor. ¡Sienta a la reina blanca en el <b>trono</b> que brilla!', done: '¡Coronada! La reina está en su trono, ¡guau!' },
      { say: 'Si la pieza que mueves y otra tuya <b>encierran en línea recta una pieza rival</b>, ¡queda <b>capturada</b>! ¡Encierra al guardia negro que brilla!', done: '¡La tengo! La pieza capturada se queda en el tablero, inclinada, ¿ves? Su dueño <b>debe recolocarla en el turno siguiente</b>.' },
      { say: 'Vaya, capturaron un guardia blanco (el del anillo rojo). Este turno es de <b>recolocación</b>: no se mueve ninguna otra pieza. <b>Un guardia capturado va a cualquier casilla vacía del borde (anillo 5)</b>. ¡Ponlo en una casilla que brilla!', done: '¡Bienvenido de vuelta! Vuelve a empezar desde el borde.' },
      { say: 'A la reina se la captura igual, pero es especial: puede ir a <b>cualquier casilla vacía menos el trono</b>, no solo al borde. Si caen la reina y un guardia, <b>primero la reina</b>. ¡Recolócala!', done: '¡Como buena reina, vuelve desde donde quiere!' },
      { say: '<b>No puedes meterte entre dos piezas rivales</b> en línea: la casilla roja es una. ¡No puedes caer en una captura tú solo! Mueve cualquier pieza blanca.', done: '¡Eso es! La casilla roja estaba prohibida, ¿verdad?' },
      { say: 'Así se gana: <b>tu reina en el trono y las seis casillas de alrededor con tus guardias</b>. ¡Falta uno: pon un guardia en la casilla que brilla!', done: '¡Hurra, completo! Una reina y sus seis guardias: ganan las blancas, ¡guau!' },
      { say: '¡Pero cuidado! Si tus <b>seis guardias rodean el trono sin tu reina en él, pierdes al instante</b> (nunca el sexto en la casilla roja). Con cinco, espera con el sexto hasta que la reina se siente.' },
      { say: 'En la ventana de partida también puedes empezar como en 1842, <b>colocando los guardias uno a uno</b>. Tres repeticiones de una posición o el límite de jugadas dan tablas. ¡Vamos juntos hacia el trono!' },
    ] },
    fr: { name: 'Goldpup', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Ouaf, elle ne peut pas aller là !', stuck: 'Cette pièce ne peut pas bouger pour l’instant', own: 'Touche une pièce blanche', wantIn: 'Cette fois, avance vers un <b>anneau intérieur</b> !', wantThrone: 'Seule la <b>reine (l’hexagone)</b> entre sur le trône', wantCap: 'Trouve une case qui <b>prend en tenaille</b> une pièce noire', wantReloc: 'Replace d’abord ta pièce capturée', relocOnly: 'Pose-la sur une case qui brille', took: 'Prise !', crown: 'Couronnée !', s: [
      { say: 'Ouaf ouaf ! Moi c’est <b>Goldpup</b>, le chiot doré : secoue-moi et la chance tombe ! Apprenons ensemble l’<b>Agon</b>, un jeu d’hexagones né à Londres en 1842 !' },
      { say: 'Le plateau a <b>91 cases hexagonales</b> : le <b>trône</b> au centre et <b>six anneaux</b> tout autour. Au début, les pièces blanches et noires sont sur l’anneau extérieur, <b>en alternance</b>.' },
      { say: 'La <b>pièce hexagonale est la reine</b>, les <b>rondes sont des gardes</b> (celles qui brillent sont les reines). Une reine et six gardes forment une équipe. Elles bougent pareil, mais <b>seule la reine entre sur le trône</b> !' },
      { say: 'À ton tour, déplace une pièce <b>d’un pas vers une case voisine vide</b> : <b>le long de son anneau</b> ou <b>d’un anneau vers l’intérieur</b>. Fais entrer le garde blanc qui brille dans l’anneau intérieur !', done: 'Bravo ! Pas à pas, plus près du trône.' },
      { say: 'Règle importante ! Une pièce <b>ne revient jamais vers un anneau extérieur</b>. Elle peut aller sur les cases vertes, jamais les rouges (vers l’extérieur), et rien ne saute. Tout l’art est de choisir quelle pièce entre, et quand.' },
      { say: '<b>Seule la reine</b> s’assoit sur le trône ; les gardes s’arrêtent à l’anneau 1, tout autour. Installe la reine blanche sur le <b>trône</b> qui brille !', done: 'Couronnée ! La reine est sur son trône, ouaf !' },
      { say: 'Quand la pièce jouée et une autre des tiennes <b>prennent en tenaille sur une ligne une pièce adverse</b>, elle est <b>capturée</b> ! Prends en tenaille le garde noir qui brille !', done: 'Attrapée ! La pièce capturée reste sur le plateau, penchée, tu vois ? Son propriétaire <b>doit la replacer au tour suivant</b>.' },
      { say: 'Oh oh, un garde blanc a été capturé (l’anneau rouge). Ce tour est un <b>replacement</b> : aucune autre pièce ne bouge. <b>Un garde capturé va sur n’importe quelle case vide du bord (anneau 5)</b>. Pose-le sur une case qui brille !', done: 'Bon retour ! Il repart du bord.' },
      { say: 'La reine se fait prendre de la même façon, mais elle est spéciale : elle peut aller sur <b>n’importe quelle case vide sauf le trône</b>, pas seulement au bord. Si la reine et un garde sont pris, <b>la reine d’abord</b>. Replace-la !', done: 'Une vraie reine : elle revient d’où elle veut !' },
      { say: 'Tu <b>ne peux pas te glisser entre deux pièces adverses</b> sur une ligne : la case rouge en est une. Pas question de se jeter dans une prise ! Déplace n’importe quelle pièce blanche.', done: 'Voilà ! La case rouge était interdite, hein ?' },
      { say: 'Pour gagner : <b>ta reine sur le trône et les six cases autour remplies de tes gardes</b> ! Plus qu’un : pose un garde sur la case qui brille !', done: 'Hourra, c’est complet ! Une reine et ses six gardes : les Blancs gagnent, ouaf !' },
      { say: 'Mais attention ! Si tes <b>six gardes entourent le trône sans ta reine dessus, tu perds aussitôt</b> (jamais le sixième sur la case rouge). À cinq, garde le sixième en réserve jusqu’à ce que la reine soit assise.' },
      { say: 'Dans la fenêtre de partie, tu peux aussi commencer comme en 1842, <b>en posant les gardes un par un</b>. Trois répétitions d’une position, ou la limite de coups, font nulle. Allez, en route vers le trône !' },
    ] },
    pt: { name: 'Goldpup', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Au, ela não pode ir para lá!', stuck: 'Essa peça não pode se mover agora', own: 'Toque numa peça branca', wantIn: 'Desta vez, entre num <b>anel interno</b>!', wantThrone: 'Só a <b>rainha (o hexágono)</b> entra no trono', wantCap: 'Ache uma casa que <b>cerque em linha</b> uma peça preta', wantReloc: 'Primeiro recoloque sua peça capturada', relocOnly: 'Coloque-a numa casa que brilha', took: 'Captura!', crown: 'Coroada!', s: [
      { say: 'Au au! Eu sou o <b>Goldpup</b>, o filhote dourado: me sacuda e cai sorte! Vamos aprender juntos o <b>Agon</b>, um jogo de hexágonos nascido em Londres em 1842!' },
      { say: 'O tabuleiro tem <b>91 casas hexagonais</b>: o <b>trono</b> no centro e <b>seis anéis</b> ao redor. No começo, as peças brancas e pretas ficam no anel de fora, <b>alternadas</b>.' },
      { say: 'A <b>peça hexagonal é a rainha</b>, as <b>redondas são guardas</b> (as que brilham são as rainhas). Uma rainha e seis guardas formam um time. Andam igual, mas <b>só a rainha entra no trono</b>!' },
      { say: 'Na sua vez, mova uma peça <b>um passo para uma casa vizinha vazia</b>: <b>pelo seu anel</b> ou <b>um anel para dentro</b>. Leve o guarda branco que brilha para o anel interno!', done: 'Boa! Passo a passo, mais perto do trono.' },
      { say: 'Regra importante! Uma peça <b>nunca volta para um anel de fora</b>. Pode ir para as casas verdes, nunca para as vermelhas (para fora), e não há pulos. O segredo é qual peça entra, e quando.' },
      { say: '<b>Só a rainha</b> senta no trono; os guardas param no anel 1, em volta dele. Sente a rainha branca no <b>trono</b> que brilha!', done: 'Coroada! A rainha está no trono, au!' },
      { say: 'Quando a peça que você move e outra sua <b>cercam em linha reta uma peça inimiga</b>, ela é <b>capturada</b>! Cerque o guarda preto que brilha!', done: 'Peguei! A peça capturada fica no tabuleiro, inclinada, viu? O dono <b>precisa recolocá-la no turno seguinte</b>.' },
      { say: 'Opa, um guarda branco foi capturado (o do anel vermelho). Este turno é de <b>recolocação</b>: nenhuma outra peça anda. <b>Um guarda capturado vai para qualquer casa vazia da borda (anel 5)</b>. Coloque-o numa casa que brilha!', done: 'Bem-vindo de volta! Ele recomeça da borda.' },
      { say: 'A rainha é capturada do mesmo jeito, mas é especial: pode ir para <b>qualquer casa vazia menos o trono</b>, não só a borda. Se a rainha e um guarda caírem juntos, <b>a rainha primeiro</b>. Recoloque-a!', done: 'Coisa de rainha: volta de onde quiser!' },
      { say: 'Você <b>não pode entrar entre duas peças inimigas</b> em linha: a casa vermelha é uma delas. Ninguém se entrega sozinho! Mova qualquer peça branca.', done: 'Isso! A casa vermelha estava proibida, né?' },
      { say: 'Assim se vence: <b>sua rainha no trono e as seis casas em volta com seus guardas</b>! Falta um: ponha um guarda na casa que brilha!', done: 'Eba, completo! Uma rainha e seus seis guardas: vitória das brancas, au!' },
      { say: 'Mas cuidado! Se seus <b>seis guardas cercarem o trono sem a rainha nele, você perde na hora</b> (nunca o sexto na casa vermelha). Com cinco, segure o sexto até a rainha sentar.' },
      { say: 'Na janela de partida você também pode começar como em 1842, <b>colocando os guardas um a um</b>. Três repetições de uma posição ou o limite de lances dão empate. Vamos juntos rumo ao trono!' },
    ] },
    de: { name: 'Goldpup', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Wuff, dahin geht es nicht!', stuck: 'Dieser Stein kann gerade nicht ziehen', own: 'Tippe einen weißen Stein an', wantIn: 'Diesmal geht es <b>in einen inneren Ring</b>!', wantThrone: 'Nur die <b>Königin (das Sechseck)</b> darf auf den Thron', wantCap: 'Suche ein Feld, das einen schwarzen Stein <b>in einer Linie einschließt</b>', wantReloc: 'Erst den geschlagenen Stein neu setzen', relocOnly: 'Setze ihn auf ein leuchtendes Feld', took: 'Geschlagen!', crown: 'Gekrönt!', s: [
      { say: 'Wuff wuff! Ich bin <b>Goldpup</b>, der goldene Welpe – schüttel mich, und Glück fällt heraus! Lass uns zusammen <b>Agon</b> lernen, ein Sechseck-Spiel aus dem London von 1842!' },
      { say: 'Das Brett hat <b>91 Sechseckfelder</b>: den <b>Thron</b> in der Mitte und <b>sechs Ringe</b> rundherum. Am Anfang stehen die weißen und schwarzen Steine auf dem äußersten Ring, <b>abwechselnd</b>.' },
      { say: 'Der <b>sechseckige Stein ist die Königin</b>, die <b>runden sind Wachen</b> (die leuchtenden sind die Königinnen). Eine Königin und sechs Wachen sind ein Team. Sie ziehen gleich, aber <b>nur die Königin darf auf den Thron</b>!' },
      { say: 'Am Zug ziehst du einen Stein <b>einen Schritt auf ein freies Nachbarfeld</b>: <b>auf seinem Ring</b> oder <b>einen Ring nach innen</b>. Zieh die leuchtende weiße Wache in den inneren Ring!', done: 'Klasse! Schritt für Schritt näher zum Thron.' },
      { say: 'Wichtige Regel! Ein Stein <b>geht nie zurück auf einen äußeren Ring</b>. Er darf auf die grünen Felder, nie auf die roten (nach außen), und gesprungen wird nicht. Welcher Stein wann hineingeht – darauf kommt es an.' },
      { say: '<b>Nur die Königin</b> setzt sich auf den Thron; Wachen kommen höchstens bis Ring 1, rund um ihn. Setz die weiße Königin auf den leuchtenden <b>Thron</b>!', done: 'Gekrönt! Die Königin sitzt auf ihrem Thron, wuff!' },
      { say: 'Wenn der gezogene Stein und ein anderer von dir <b>einen gegnerischen Stein in einer geraden Linie einschließen</b>, ist er <b>geschlagen</b>! Schließ die leuchtende schwarze Wache ein!', done: 'Erwischt! Der geschlagene Stein bleibt auf dem Brett und neigt sich – siehst du? Sein Besitzer <b>muss ihn im nächsten Zug neu setzen</b>.' },
      { say: 'Oh oh, eine weiße Wache wurde geschlagen (der rote Ring). Dieser Zug ist ein <b>Neusetzen</b> – kein anderer Stein darf ziehen. <b>Eine geschlagene Wache kommt auf ein beliebiges freies Randfeld (Ring 5)</b>. Setz sie auf ein leuchtendes Feld!', done: 'Willkommen zurück! Sie startet wieder vom Rand.' },
      { say: 'Die Königin wird genauso geschlagen, aber sie ist besonders: Sie darf auf <b>jedes freie Feld außer dem Thron</b>, nicht nur an den Rand. Sind Königin und Wache zugleich geschlagen, <b>kommt die Königin zuerst</b>. Setz sie neu!', done: 'Ganz Königin – sie kommt zurück, wo sie will!' },
      { say: 'Du <b>darfst nicht zwischen zwei gegnerische Steine</b> in einer Linie ziehen – das rote Feld ist so eins. Freiwillig lässt man sich nicht schlagen! Zieh irgendeinen weißen Stein.', done: 'Genau! Das rote Feld war tabu, oder?' },
      { say: 'So gewinnst du: <b>deine Königin auf dem Thron und alle sechs Felder um sie mit deinen Wachen besetzt</b>! Nur noch eine – setz eine Wache auf das leuchtende Feld!', done: 'Hurra, komplett! Eine Königin und ihre sechs Wachen: Weiß gewinnt, wuff!' },
      { say: 'Aber Vorsicht! Wenn deine <b>sechs Wachen den Thron umringen, ohne dass deine Königin darauf sitzt, verlierst du sofort</b> (also nie die sechste aufs rote Feld). Bei fünf wartet die sechste, bis die Königin sitzt.' },
      { say: 'Im Spieldialog kannst du auch wie 1842 beginnen und <b>die Wachen einzeln setzen</b>. Dreimal dieselbe Stellung oder das Zuglimit bedeuten Remis. Und jetzt: gemeinsam auf zum Thron!' },
    ] },
    hi: { name: 'गोल्डपप', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'भौं, वहाँ नहीं जा सकते!', stuck: 'यह मोहरा अभी नहीं चल सकता', own: 'सफ़ेद मोहरे पर टैप करें', wantIn: 'इस बार <b>अंदर वाले घेरे</b> में चलो!', wantThrone: 'सिंहासन पर सिर्फ़ <b>रानी (षट्कोण)</b> जा सकती है', wantCap: 'ऐसा खाना ढूँढो जो काले मोहरे को <b>एक रेखा में घेर</b> ले', wantReloc: 'पहले पकड़ा गया मोहरा दोबारा रखो', relocOnly: 'उसे चमकते खाने पर रखो', took: 'पकड़ लिया!', crown: 'राज्याभिषेक!', s: [
      { say: 'भौं भौं! मैं <b>गोल्डपप</b> हूँ, सुनहरा पिल्ला — मुझे हिलाओ तो किस्मत गिरती है! आओ साथ में <b>एगॉन</b> सीखें, 1842 में लंदन में जन्मा षट्कोण खानों का खेल!' },
      { say: 'बोर्ड में <b>91 षट्कोण खाने</b> हैं: बीच में <b>सिंहासन</b> और उसके चारों ओर <b>छह घेरे</b>। शुरू में सफ़ेद और काले मोहरे सबसे बाहरी घेरे पर <b>बारी-बारी</b> रखे होते हैं।' },
      { say: '<b>षट्कोण मोहरा रानी</b> है, <b>गोल मोहरे रक्षक</b> (चमकते वाले रानियाँ हैं)। एक रानी और छह रक्षक मिलकर टीम। चाल एक जैसी, पर <b>सिंहासन पर सिर्फ़ रानी</b> जा सकती है!' },
      { say: 'अपनी बारी में एक मोहरा <b>पास के खाली खाने में एक कदम</b> चलाओ: <b>अपने ही घेरे पर</b> या <b>एक घेरा अंदर</b>। चमकते सफ़ेद रक्षक को अंदर वाले घेरे में ले जाओ!', done: 'बढ़िया! कदम-दर-कदम सिंहासन के पास।' },
      { say: 'ज़रूरी नियम! मोहरा <b>कभी बाहरी घेरे में वापस नहीं जाता</b>। हरे खानों पर जा सकता है, लाल (बाहर की ओर) पर नहीं, और कूदना भी नहीं। इसलिए कौन-सा मोहरा कब अंदर जाए, यही राज़ है।' },
      { say: '<b>सिर्फ़ रानी</b> सिंहासन पर बैठती है; रक्षक ज़्यादा से ज़्यादा घेरा 1 तक। सफ़ेद रानी को चमकते <b>सिंहासन</b> पर बिठाओ!', done: 'राज्याभिषेक! रानी सिंहासन पर, भौं!' },
      { say: 'चला गया मोहरा और तुम्हारा दूसरा मोहरा जब <b>विरोधी मोहरे को सीधी रेखा में घेर लें</b>, वह <b>पकड़ा</b> जाता है! चमकते काले रक्षक को घेरो!', done: 'पकड़ लिया! पकड़ा गया मोहरा बोर्ड पर ही झुका रहता है, देखा? उसके मालिक को <b>अगली बारी में उसे दोबारा रखना</b> होता है।' },
      { say: 'अरे, एक सफ़ेद रक्षक पकड़ा गया (लाल घेरे वाला)। इस बारी <b>दोबारा रखना</b> है — कोई और मोहरा नहीं चलेगा। <b>पकड़ा गया रक्षक किनारे (घेरा 5) के किसी भी खाली खाने</b> पर जाता है। उसे चमकते खाने पर रखो!', done: 'वापसी मुबारक! किनारे से फिर शुरुआत।' },
      { say: 'रानी भी ऐसे ही पकड़ी जाती है, पर वह ख़ास है: <b>सिंहासन छोड़ किसी भी खाली खाने</b> पर जा सकती है, सिर्फ़ किनारे पर नहीं। रानी और रक्षक साथ पकड़े जाएँ तो <b>पहले रानी</b>। उसे रखो!', done: 'असली रानी — जहाँ चाहे वहाँ से लौटती है!' },
      { say: 'तुम <b>दो विरोधी मोहरों के बीच</b> (एक रेखा में घिरने वाली जगह) <b>ख़ुद नहीं जा सकते</b> — लाल खाना वैसा ही है। ख़ुद पकड़े जाने नहीं जाते! कोई भी सफ़ेद मोहरा चलाओ।', done: 'बिल्कुल! लाल खाने पर नहीं जा सके न?' },
      { say: 'जीत ऐसे होती है: <b>रानी सिंहासन पर और चारों ओर के छह खाने तुम्हारे रक्षकों से भरे</b>! बस एक बाक़ी — चमकते खाने पर रक्षक रखो!', done: 'हुर्रे, पूरा! रानी और उसके छह रक्षक: सफ़ेद जीता, भौं!' },
      { say: 'पर सावधान! रानी सिंहासन पर न हो और <b>छह रक्षक सिंहासन को घेर लें, तो तुरंत हार</b> (लाल खाने पर छठा कभी नहीं)। पाँच हो जाएँ तो रानी के बैठने तक छठा रुका रहे।' },
      { say: 'नए खेल की सेटिंग में 1842 की तरह <b>रक्षकों को एक-एक करके रखकर</b> शुरू भी कर सकते हो। एक ही स्थिति तीन बार या चाल सीमा हो तो ड्रॉ। चलो, साथ में सिंहासन की ओर!' },
    ] },
    ar: { name: 'غولد باب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'اضغط مكانًا يلمع', nope: 'هاو، لا يمكن الذهاب إلى هناك!', stuck: 'هذه القطعة لا تتحرك الآن', own: 'اضغط قطعة بيضاء', wantIn: 'هذه المرة، ادخل إلى <b>حلقة داخلية</b>!', wantThrone: 'وحدها <b>الملكة (السداسية)</b> تدخل العرش', wantCap: 'ابحث عن خانة <b>تحاصر</b> قطعة سوداء على خط', wantReloc: 'أعد وضع قطعتك المأسورة أولًا', relocOnly: 'ضعها على خانة تلمع', took: 'أسر!', crown: 'تتويج!', s: [
      { say: 'هاو هاو! أنا <b>غولد باب</b>، الجرو الذهبي — هزّني فيتساقط الحظ! لنتعلم معًا <b>آغون</b>، لعبة الخانات السداسية التي وُلدت في لندن عام 1842!' },
      { say: 'للرقعة <b>91 خانة سداسية</b>: <b>العرش</b> في الوسط و<b>ست حلقات</b> حوله. في البداية تقف القطع البيضاء والسوداء على الحلقة الخارجية <b>بالتناوب</b>.' },
      { say: '<b>القطعة السداسية هي الملكة</b> و<b>المستديرة حراس</b> (اللامعة هي الملكات). ملكة وستة حراس فريق واحد. تتحرك بالطريقة نفسها، لكن <b>وحدها الملكة تدخل العرش</b>!' },
      { say: 'في دورك حرّك قطعة <b>خطوة واحدة إلى خانة مجاورة فارغة</b>: <b>على حلقتها</b> أو <b>حلقة واحدة إلى الداخل</b>. أدخل الحارس الأبيض اللامع إلى الحلقة الداخلية!', done: 'رائع! خطوة بعد خطوة نحو العرش.' },
      { say: 'قاعدة مهمة! القطعة <b>لا تعود أبدًا إلى حلقة خارجية</b>. يمكنها الذهاب إلى الخانات الخضراء لا الحمراء (إلى الخارج)، ولا قفز. فالسر هو أي قطعة تدخل ومتى.' },
      { say: '<b>وحدها الملكة</b> تجلس على العرش؛ الحراس يتوقفون عند الحلقة 1 حوله. أجلس الملكة البيضاء على <b>العرش</b> اللامع!', done: 'تتويج! الملكة على عرشها، هاو!' },
      { say: 'إذا <b>حاصرت القطعةُ التي تحركها وقطعةٌ أخرى لك قطعةَ الخصم على خط مستقيم</b> فإنها <b>تُؤسر</b>! حاصر الحارس الأسود اللامع!', done: 'أمسكتها! القطعة المأسورة تبقى على الرقعة مائلة، أترى؟ وعلى مالكها <b>إعادة وضعها في دوره التالي</b>.' },
      { say: 'أوه، أُسر حارس أبيض (صاحب الحلقة الحمراء). هذا الدور <b>لإعادة الوضع</b> — لا تتحرك أي قطعة أخرى. <b>الحارس المأسور يذهب إلى أي خانة فارغة على الحافة (الحلقة 5)</b>. ضعه على خانة تلمع!', done: 'أهلًا بعودتك! يبدأ من الحافة من جديد.' },
      { say: 'تُؤسر الملكة بالطريقة نفسها، لكنها مميزة: يمكنها الذهاب إلى <b>أي خانة فارغة عدا العرش</b>، لا الحافة فقط. وإن أُسرت الملكة وحارس معًا <b>فالملكة أولًا</b>. أعد وضعها!', done: 'كما يليق بملكة — تعود من حيث تشاء!' },
      { say: '<b>لا يجوز الدخول بين قطعتين للخصم</b> على خط — الخانة الحمراء واحدة منها. لا أحد يرمي نفسه في الأسر! حرّك أي قطعة بيضاء.', done: 'بالضبط! الخانة الحمراء كانت ممنوعة، صحيح؟' },
      { say: 'هكذا تفوز: <b>ملكتك على العرش والخانات الست حولها مملوءة بحراسك</b>! بقي واحد — ضع حارسًا على الخانة اللامعة!', done: 'مرحى، اكتملت! ملكة وحراسها الستة: فوز الأبيض، هاو!' },
      { say: 'لكن احذر! إذا <b>أحاط حراسك الستة بالعرش وملكتك ليست عليه، تخسر فورًا</b> (فلا تضع السادس على الخانة الحمراء). عند الخمسة، أبقِ السادس حتى تجلس الملكة.' },
      { say: 'في نافذة اللعبة يمكنك أيضًا البدء على طريقة 1842 <b>بوضع الحراس واحدًا تلو الآخر</b>. تكرار الوضع ثلاث مرات أو حد النقلات يعني التعادل. هيا معًا نحو العرش!' },
    ] },
    ru: { name: 'Голдпап', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tap: 'Нажми на светящееся место', nope: 'Гав, туда нельзя!', stuck: 'Эта фишка сейчас не может ходить', own: 'Нажми на белую фишку', wantIn: 'На этот раз шагни <b>на внутреннее кольцо</b>!', wantThrone: 'На трон может войти только <b>королева (шестиугольник)</b>', wantCap: 'Найди клетку, которая <b>зажимает</b> чёрную фишку в линию', wantReloc: 'Сначала переставь свою взятую фишку', relocOnly: 'Поставь её на светящуюся клетку', took: 'Взято!', crown: 'На троне!', s: [{ say: 'Гав-гав! Я <b>Голдпап</b>, золотой щенок — потряси меня, и выпадет удача! Давай вместе изучим <b>агон</b> — игру на шестиугольниках, родившуюся в Лондоне в 1842 году!' }, { say: 'На доске <b>91 шестиугольная клетка</b>: <b>трон</b> в центре и <b>шесть колец</b> вокруг. В начале белые и чёрные фишки стоят на самом внешнем кольце, <b>чередуясь</b> друг с другом.' }, { say: '<b>Шестиугольная фишка — королева</b>, <b>круглые — стражи</b> (светятся королевы). Одна королева и шесть стражей — одна команда. Ходят они одинаково, но <b>на трон может войти только королева</b>!' }, { say: 'В свой ход сдвинь одну фишку <b>на один шаг на свободную соседнюю клетку</b>: <b>по своему кольцу</b> или <b>на кольцо ближе к центру</b>. Переведи светящегося белого стража на внутреннее кольцо!', done: 'Отлично! Шаг за шагом ближе к трону.' }, { say: 'Важное правило! Фишка <b>никогда не возвращается на внешнее кольцо</b>. Ей можно на зелёные клетки, но не на красные (наружу), и прыжков нет. Так что весь секрет — какую фишку и когда вводить внутрь.' }, { say: 'На трон может сесть <b>только королева</b> — стражи останавливаются на кольце 1, вокруг него. Посади белую королеву на светящийся <b>трон</b>!', done: 'На троне! Королева заняла свой трон, гав!' }, { say: 'Когда ходящая фишка и другая твоя <b>зажимают вражескую фишку в прямую линию</b>, она <b>взята</b>! Зажми светящегося чёрного стража!', done: 'Есть! Взятая фишка остаётся на доске, наклонившись — видишь? Владелец <b>обязан переставить её следующим ходом</b>.' }, { say: 'Ой-ой, белого стража взяли (красное кольцо). Этот ход — <b>перестановка</b>, другими фишками ходить нельзя. <b>Взятый страж ставится на любую свободную клетку края (кольцо 5)</b>. Поставь его на светящуюся клетку!', done: 'С возвращением! Он начинает снова с края.' }, { say: 'Королеву берут так же, но она особенная: её можно поставить на <b>любую свободную клетку, кроме трона</b>, а не только на край. Если взяты и королева, и страж, <b>королева переставляется первой</b>. Переставь её!', done: 'Как и подобает королеве — возвращается, откуда пожелает!' }, { say: '<b>Нельзя вставать между двумя вражескими фишками</b> в линию — красная клетка как раз такая. Самому под взятие идти нельзя! Сходи любой белой фишкой.', done: 'Вот так! Красная клетка была под запретом, правда?' }, { say: 'Вот как побеждают: <b>твоя королева на троне, а все шесть клеток вокруг заняты твоими стражами</b>! Осталась одна — поставь стража на светящуюся клетку!', done: 'Ура, готово! Королева и шесть её стражей: белые побеждают, гав!' }, { say: 'Но осторожно! Если <b>шесть твоих стражей окружат трон, а королевы на нём нет, ты сразу проигрываешь</b> (поэтому шестого на красную клетку — никогда). Когда пятеро на месте, держи шестого в стороне, пока королева не сядет.' }, { say: 'В настройках новой игры можно начать и по-старинному, как в 1842 году, — <b>расставляя стражей по одному</b>. Трёхкратное повторение позиции или лимит ходов дают ничью. А теперь — вместе к трону!' }] },
    'zh-TW': { name: '金骰子汪', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', tap: '點擊發光的地方', nope: '汪，那裡不能走！', stuck: '那枚棋子現在不能動', own: '請點擊白色棋子', wantIn: '這次請<b>往內環</b>走一步！', wantThrone: '只有<b>女王（六角形）</b>能進入王座', wantCap: '找出能把黑棋<b>夾</b>在一直線上的格子', wantReloc: '請先重新放置被吃的棋子', relocOnly: '放在發光的格子上', took: '吃子！', crown: '登上王座！', s: [{ say: '汪汪！我是金色小狗<b>金骰子汪</b>——搖一搖就會掉出好運喔！一起學1842年誕生於倫敦的六角形遊戲<b>阿貢棋</b>吧！' }, { say: '棋盤有<b>91個六角形格子</b>：中央的<b>王座</b>與圍繞它的<b>6層環</b>。開局時白棋和黑棋<b>交錯</b>排在最外圈。' }, { say: '<b>六角形的棋子是女王</b>，<b>圓形的是護衛</b>（發光的是女王）。1名女王和6名護衛組成一隊。走法相同，但<b>只有女王能進入王座</b>！' }, { say: '輪到你時，讓1枚棋子<b>往相鄰的空格走1步</b>：<b>沿著所在的環</b>或<b>往內一環</b>。把發光的白色護衛走進內環！', done: '很好！一步一步接近王座。' }, { say: '重要規則！棋子<b>絕不能退回外環</b>。可以走綠色格子，不能走紅色格子（往外），也不能跳。所以哪一枚、什麼時候往內走，就是全部的祕訣。' }, { say: '<b>只有女王</b>能坐上王座——護衛只能停在它周圍的第1環。讓白色女王坐上發光的<b>王座</b>！', done: '登上王座！女王坐上她的寶座了，汪！' }, { say: '移動的棋子和另一枚己方棋子<b>把敵方棋子夾在一直線上</b>時，就能<b>吃掉</b>它！夾住發光的黑色護衛！', done: '吃到了！被吃的棋子會傾斜著留在棋盤上——看到了嗎？它的主人<b>下一手必須重新放置它</b>。' }, { say: '糟了，白色護衛被吃了（紅色圈）。這一手是<b>重新放置</b>，不能移動其他棋子。<b>被吃的護衛要放到任一個外圈空格（第5環）</b>。放在發光的格子上！', done: '歡迎回來！它從外圈重新出發。' }, { say: '女王也是一樣被吃，但她很特別：可以放在<b>王座以外的任何空格</b>，不限外圈。女王和護衛都被吃時，<b>先放女王</b>。重新放置她吧！', done: '不愧是女王——想從哪裡回來都可以！' }, { say: '<b>不能走進一直線上兩枚敵棋之間</b>——紅色格子就是。不能自己走進被吃的位置！移動任一枚白棋。', done: '就是這樣！紅色格子不能走，對吧？' }, { say: '獲勝方法是：<b>你的女王坐上王座，周圍6格全部由你的護衛佔據</b>！只差1枚了——把護衛放到發光的格子！', done: '萬歲，完成了！女王與6名護衛：白方獲勝，汪！' }, { say: '但要小心！<b>女王不在王座上時，6名護衛就圍住王座，會立刻判負</b>（所以第6枚絕不能放在紅色格子）。5枚就位後，先讓第6枚等著，直到女王坐上王座。' }, { say: '在新對局設定中，也能用1842年的方式<b>一枚一枚擺放護衛</b>開局。同一局面重複3次或達到步數上限為和局。那麼，一起朝王座前進吧！' }] },
    id: { name: 'Goldpup', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tap: 'Ketuk tempat yang menyala', nope: 'Guk, tidak bisa ke sana!', stuck: 'Bidak itu tak bisa bergerak sekarang', own: 'Ketuk bidak putih', wantIn: 'Kali ini, melangkah <b>ke cincin dalam</b>!', wantThrone: 'Hanya <b>ratu (heksagon)</b> yang boleh masuk takhta', wantCap: 'Cari sel yang <b>mengapit</b> bidak hitam dalam satu garis', wantReloc: 'Pindahkan dulu bidakmu yang ditangkap', relocOnly: 'Taruh di sel yang menyala', took: 'Ditangkap!', crown: 'Bertakhta!', s: [{ say: 'Guk guk! Aku <b>Goldpup</b>, anak anjing emas — goyangkan aku dan keberuntungan pun jatuh! Ayo belajar <b>Agon</b> bersama, permainan heksagon yang lahir di London tahun 1842!' }, { say: 'Papan punya <b>91 sel heksagon</b>: <b>takhta</b> di tengah dan <b>enam cincin</b> mengelilinginya. Di awal, bidak putih dan hitam berdiri di cincin terluar, <b>berselang-seling</b>.' }, { say: '<b>Bidak heksagon adalah ratu</b>, <b>yang bulat adalah pengawal</b> (yang menyala adalah ratu). Satu ratu dan enam pengawal satu tim. Geraknya sama, tapi <b>hanya ratu yang boleh masuk takhta</b>!' }, { say: 'Di giliranmu, gerakkan satu bidak <b>satu langkah ke sel tetangga yang kosong</b>: <b>sepanjang cincinnya</b> atau <b>satu cincin ke dalam</b>. Gerakkan pengawal putih yang menyala ke cincin dalam!', done: 'Bagus! Selangkah demi selangkah, makin dekat ke takhta.' }, { say: 'Aturan penting! Bidak <b>tak pernah kembali ke cincin luar</b>. Ia boleh ke sel hijau, tidak ke yang merah (keluar), dan tak ada lompatan. Jadi bidak mana dan kapan masuk adalah seluruh rahasianya.' }, { say: '<b>Hanya ratu</b> yang boleh duduk di takhta — pengawal berhenti di cincin 1, tepat di sekelilingnya. Dudukkan ratu putih di <b>takhta</b> yang menyala!', done: 'Bertakhta! Sang ratu duduk di takhtanya, guk!' }, { say: 'Saat bidak yang kamu gerakkan dan bidakmu yang lain <b>mengapit bidak lawan dalam garis lurus</b>, bidak itu <b>ditangkap</b>! Apit pengawal hitam yang menyala!', done: 'Dapat! Bidak yang ditangkap tetap di papan, miring — lihat? Pemiliknya <b>wajib memindahkannya di giliran berikutnya</b>.' }, { say: 'Waduh, pengawal putih ditangkap (cincin merah). Giliran ini adalah <b>pemindahan</b> — bidak lain tak boleh bergerak. <b>Pengawal yang ditangkap ditaruh di sel tepi kosong mana pun (cincin 5)</b>. Taruh di sel yang menyala!', done: 'Selamat datang kembali! Ia mulai lagi dari tepi.' }, { say: 'Ratu ditangkap dengan cara yang sama, tapi ia istimewa: boleh ditaruh di <b>sel kosong mana pun kecuali takhta</b>, tak hanya di tepi. Jika ratu dan pengawal sama-sama ditangkap, <b>ratu dulu</b>. Pindahkan dia!', done: 'Seperti ratu sejati — kembali dari mana pun ia suka!' }, { say: 'Kamu <b>tak boleh melangkah ke antara dua bidak lawan</b> dalam satu garis — sel merah salah satunya. Kamu tak bisa masuk sendiri ke tangkapan! Gerakkan bidak putih mana saja.', done: 'Begitu! Sel merah terlarang, kan?' }, { say: 'Begini cara menang: <b>ratumu di takhta dan keenam sel di sekelilingnya diisi pengawalmu</b>! Tinggal satu — taruh pengawal di sel yang menyala!', done: 'Hore, lengkap! Ratu dan enam pengawalnya: Putih menang, guk!' }, { say: 'Tapi hati-hati! Jika <b>enam pengawalmu mengelilingi takhta saat ratumu tidak di sana, kamu langsung kalah</b> (jadi jangan pernah taruh yang keenam di sel merah). Saat lima sudah di tempat, tahan yang keenam sampai ratu duduk.' }, { say: 'Di pengaturan permainan baru kamu juga bisa mulai ala 1842, <b>menaruh pengawal satu per satu</b>. Posisi berulang tiga kali atau batas langkah berarti seri. Nah, ayo menuju takhta bersama!' }] },
    tr: { name: 'Goldpup', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tap: 'Parlayan yere dokun', nope: 'Hav, oraya gidemez!', stuck: 'Bu taş şu an oynayamaz', own: 'Beyaz bir taşa dokun', wantIn: 'Bu kez <b>iç halkaya</b> adım at!', wantThrone: 'Tahta yalnızca <b>kraliçe (altıgen)</b> girebilir', wantCap: 'Siyah bir taşı çizgide <b>sıkıştıran</b> hücreyi bul', wantReloc: 'Önce alınan taşını yeniden yerleştir', relocOnly: 'Parlayan bir hücreye koy', took: 'Alındı!', crown: 'Tahtta!', s: [{ say: 'Hav hav! Ben altın köpek <b>Goldpup</b> — beni salla, şans dökülsün! 1842\'de Londra\'da doğan altıgenler oyunu <b>Agon</b>\'u birlikte öğrenelim!' }, { say: 'Tahtada <b>91 altıgen hücre</b> var: ortada <b>taht</b> ve etrafında <b>altı halka</b>. Başta beyaz ve siyah taşlar en dış halkada <b>birbiriyle dönüşümlü</b> durur.' }, { say: '<b>Altıgen taş kraliçedir</b>, <b>yuvarlak olanlar muhafız</b> (parlayanlar kraliçeler). Bir kraliçe ve altı muhafız bir takımdır. Aynı şekilde hareket ederler ama <b>tahta yalnızca kraliçe girebilir</b>!' }, { say: 'Sıranda bir taşı <b>boş bir komşu hücreye bir adım</b> oynat: <b>kendi halkası boyunca</b> ya da <b>bir halka içeri</b>. Parlayan beyaz muhafızı iç halkaya götür!', done: 'Güzel! Adım adım tahta yaklaşıyorsun.' }, { say: 'Önemli kural! Bir taş <b>asla dış halkaya geri dönmez</b>. Yeşil hücrelere gidebilir, kırmızılara (dışarı) gidemez ve atlama yoktur. Yani hangi taşın ne zaman içeri gireceği bütün sırdır.' }, { say: 'Tahta <b>yalnızca kraliçe</b> oturabilir — muhafızlar hemen etrafındaki 1. halkada durur. Beyaz kraliçeyi parlayan <b>tahta</b> oturt!', done: 'Tahtta! Kraliçe tahtına kuruldu, hav!' }, { say: 'Oynattığın taş ve başka bir taşın <b>bir rakip taşı düz çizgide sıkıştırırsa</b> o taş <b>alınır</b>! Parlayan siyah muhafızı sıkıştır!', done: 'Aldın! Alınan taş eğik şekilde tahtada kalır — gördün mü? Sahibi <b>bir sonraki hamlede onu yeniden yerleştirmek zorunda</b>.' }, { say: 'Eyvah, bir beyaz muhafız alındı (kırmızı halka). Bu tur bir <b>yeniden yerleştirme</b> — başka taş oynayamaz. <b>Alınan muhafız herhangi bir boş kenar hücresine (5. halka) gider</b>. Parlayan bir hücreye koy!', done: 'Tekrar hoş geldin! Kenardan yeniden başlıyor.' }, { say: 'Kraliçe de aynı şekilde alınır ama özeldir: yalnızca kenara değil, <b>taht dışında herhangi bir boş hücreye</b> konabilir. Kraliçe ve bir muhafız birlikte alınmışsa <b>önce kraliçe</b> yerleşir. Onu yeniden yerleştir!', done: 'Tam bir kraliçe gibi — istediği yerden geri döner!' }, { say: 'Bir çizgide <b>iki rakip taşın arasına adım atamazsın</b> — kırmızı hücre öyle bir yer. Kendi kendine almaya giremezsin! Herhangi bir beyaz taşı oynat.', done: 'İşte bu! Kırmızı hücre yasaktı, değil mi?' }, { say: 'İşte kazanma yolu: <b>kraliçen tahtta ve çevresindeki altı hücrenin hepsi muhafızlarınla dolu</b>! Bir tane kaldı — parlayan hücreye bir muhafız koy!', done: 'Yaşasın, tamam! Kraliçe ve altı muhafızı: Beyaz kazandı, hav!' }, { say: 'Ama dikkat! <b>Kraliçen tahtta değilken altı muhafızın tahtı çevrelerse hemen kaybedersin</b> (yani altıncıyı asla kırmızı hücreye koyma). Beşi yerindeyken kraliçe oturana kadar altıncıyı geride tut.' }, { say: 'Yeni oyun ayarlarında 1842 usulü <b>muhafızları tek tek yerleştirerek</b> de başlayabilirsin. Bir pozisyonun üç kez tekrarı ya da hamle sınırı beraberlik getirir. Şimdi birlikte tahta doğru!' }] },
  };

  /* ---------- little sounds: turned wood / bone on a board, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const clack = () => { tone(900, 520, .07, .06, 'triangle'); tone(210, 120, .09, .14); };
    const take = () => { tone(330, 180, .16, .1, 'square'); tone(260, 140, .14, .07, 'triangle', .05); };
    const chime = () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0, .45, .065, 'triangle', i * .07));
    const blip = () => { const f = 560 + Math.random() * 260; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { clack, take, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();
  const lookOf = () => { try { const v = localStorage.getItem('atlas-agon-look3') || localStorage.getItem('atlas-agon-look'); if (v === 'folk') return 'folk'; } catch (e) {} return 'victorian'; };

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, A3 = T3.agon;
    const board = A3.board(lookOf()); T3.show('agon', board); T3.play(true);
    const U = board.userData, Y = U.top;
    if (T3.fit) T3.fit({ w: A3.B * .9, d: A3.B * 1.08, y: Y + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const idx = s => E.sqParse(s);
    const xz = i => U.pt(E.XC[i], E.YC[i]);
    const specOf = o => {
      const a = Array(E.N).fill('.');
      (o.w || []).forEach(x => { a[idx(x)] = 'w'; }); (o.b || []).forEach(x => { a[idx(x)] = 'b'; });
      if (o.W) a[idx(o.W)] = 'W'; if (o.B) a[idx(o.B)] = 'B';
      (o.x || []).forEach(x => { const i = idx(x), k = 'wWbB'.indexOf(a[i]); if (k >= 0) a[i] = 'xXyY'[k]; });
      return { b: a.join(''), side: 1, free: true };
    };

    /* ---------- pieces ---------- */
    function mk(kind) { const g = U.piece(kind), sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function lean(g, on, quick) { const a0 = g.rotation.z, a1 = on ? -.22 : 0, b0 = g.rotation.x, b1 = on ? .12 : 0; if (quick) { g.rotation.z = a1; g.rotation.x = b1; return; } anim(220, k => { const e = io(k); g.rotation.z = a0 + (a1 - a0) * e; g.rotation.x = b0 + (b1 - b0) * e; }); }
    function setBoard() {   // diff against the pieces already on the board: the same ones stay still, only new ones drop in
      const old = pcs; pcs = {};
      let n = 0;
      for (let i = 0; i < E.N; i++) {
        const k = pos.at(i); if (!k) continue;
        const o = old[i];
        if (o && o.userData.kk === k) { delete old[i]; pcs[i] = o; const [x, z] = xz(i); o.visible = true; o.position.x = x; o.position.z = z; o.scale.set(1, 1, 1); lift(o, 0); lean(o, !!pos.captured(i), true); continue; }
        const g = mk(k), [x, z] = xz(i); g.userData.kk = k; g.position.set(x, Y, z); pcs[i] = g; if (pos.captured(i)) lean(g, true, true);
        g.visible = false; const d = 40 + (n++) * 22;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); }); }, d);
      }
      Object.values(old).forEach(drop);
      return n;
    }
    function travel(g, f, t, reloc, done) {
      const [x0, z0] = xz(f), [x1, z1] = xz(t), h0 = g.userData.h0 || 0, d = Math.hypot(x1 - x0, z1 - z0), H = reloc ? Math.min(2.2, .6 + d * .22) : 0, r0x = g.rotation.x, r0z = g.rotation.z;
      anim(reloc ? 620 : 320, q => {
        const e = io(q); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        lift(g, reloc ? h0 * (1 - q) + Math.sin(q * Math.PI) * H : (h0 + (.16 - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1));
        if (reloc) { g.rotation.x = r0x * (1 - e); g.rotation.z = r0z * (1 - e); }
      }, () => { if (reloc) g.rotation.set(0, 0, 0); lift(g, 0); land(g); SFX.clack(); if (done) done(); });
    }

    /* ---------- marks: hexagons, dots and rings on the cells ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function hex(i, color, op = .45, pulse = true) {
      const g = new TH.CircleGeometry(.5, 6); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2);
      const m = new TH.Mesh(g, basic(color, op)), [x, z] = xz(i); m.position.set(x, Y + .006, z); m.userData.pulse = pulse; m.userData.flat = true; m.renderOrder = 2; marks.add(m); return m;
    }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.13, .13, .012, 24), basic(color, .9)); const [x, z] = xz(i); m.position.set(x, Y + .02, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color, pulse = true) { const m = new TH.Mesh(new TH.TorusGeometry(.47, .032, 8, 44), basic(color, .95)); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .05, z); m.userData.pulse = pulse; m.renderOrder = 2; marks.add(m); return m; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .88 + k * .24; m.scale.set(s, m.geometry.type === 'TorusGeometry' ? s : 1, s); } m.material.opacity = (m.userData.flat ? .25 : .45) + k * (m.userData.flat ? .3 : .5); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();
    // the moves the task accepts (from the engine)
    function accepted(st) {
      const all = pos.moves().filter(m => m !== E.PASS);
      if (st.act === 'in') return all.filter(m => E.mFrom(m) === idx(st.from) && E.RING[E.mTo(m)] < E.RING[E.mFrom(m)]);
      if (st.act === 'throne') return all.filter(m => E.mTo(m) === E.CENTER);
      if (st.act === 'capture') return all.filter(m => pos.capsOf(m).length);
      if (st.act === 'reloc') return all.filter(m => E.kindOfMove(pos, m) === 'reloc');
      if (st.act === 'goal') return all.filter(m => { const p = pos.clone(); p.play(m); p.free = false; const j = E.judge(p); return j.over && j.winner === 1; });
      if (st.act === 'any') return all;
      return [];
    }
    function capRings() { for (let i = 0; i < E.N; i++) if (pos.at(i) && pos.captured(i)) ring(i, 0xff5a46, false); }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.rings) for (let i = 0; i < E.N; i++) { const r = E.RING[i]; if (i === E.CENTER) hex(i, 0xffd36b, .5); else if (r === 1 || r === 3 || r === 5) hex(i, [0, 0x8fb4ff, 0, 0x8fb4ff, 0, 0x8fb4ff][r], .18, false); }
      (st.glow || []).forEach(s => hex(idx(s), 0xffc94a, .4));
      (st.ng || []).forEach(s => hex(idx(s), 0xff3b3b, .55));
      if (st.show) { const f = idx(st.show); ring(f, 0xffc94a, false); E.NB[f].forEach(t => { if (t >= 0 && !pos.at(t)) { if (E.RING[t] > E.RING[f]) hex(t, 0xff3b3b, .55); else dot(t, 0x2fd17a); } }); }
      capRings();
      if (!st.act || played) return;
      const A = accepted(st);
      if (sel != null) { ring(sel, 0xffc94a); A.filter(m => E.mFrom(m) === sel).forEach(m => dot(E.mTo(m), 0x2fd17a)); return; }
      const froms = new Set(A.map(E.mFrom));
      if (st.act === 'reloc' && froms.size === 1) { sel = [...froms][0]; liftSel(sel, true); return showTask(); }
      froms.forEach(f => ring(f, 0x2fd17a));
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
      pos = st.start ? E.Pos.from(null) : E.Pos.from(specOf(st.p));
      const cnt = setBoard();
      later(showTask, 380 + cnt * 22);
      say(L.s[step].say); buttons();
    }
    function finish(m, before) {
      played = true; busy = false; sel = null; clearMarks(); capRings();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'throne') tip('👑 ' + L.crown);
      if (st.act === 'capture') tip('✋ ' + L.took);
      if (st.act === 'goal') { tip('👑 ' + L.crown); const r = ring(E.CENTER, 0xffd36b); r.userData.pulse = true; Object.values(pcs).forEach(g => { if (g.userData.side === 1) anim(700, k => lift(g, Math.sin(k * Math.PI) * .4)); }); }
      buttons(); autoNext();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let best = -1, bd = .55; for (let i = 0; i < E.N; i++) { const [x, z] = xz(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function liftSel(i, on) { const g = pcs[i]; if (!g) return; const h0 = g.userData.h0 || 0, h1 = on ? .22 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    const why = st => st.act === 'in' ? L.wantIn : st.act === 'throne' ? L.wantThrone : st.act === 'capture' ? L.wantCap : st.act === 'reloc' ? L.relocOnly : L.nope;
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) return;
      const A = accepted(st);
      if (pos.owner(i) === 1 && !(sel != null && st.act === 'reloc' && A.some(m => E.mFrom(m) === sel && E.mTo(m) === i))) {
        if (sel === i && st.act !== 'reloc') { liftSel(i, false); sel = null; showTask(); return; }
        if (!A.some(m => E.mFrom(m) === i)) { say(st.act === 'reloc' ? L.wantReloc : pos.moves().some(m => E.mFrom(m) === i) ? why(st) : L.stuck); return; }
        if (sel != null) liftSel(sel, false);
        sel = i; liftSel(i, true); SFX.clack(); showTask(); return;
      }
      if (sel == null) { say(L.own); return; }
      const m = A.find(x => E.mFrom(x) === sel && E.mTo(x) === i);
      if (m == null) { const any = pos.moves().find(x => E.mFrom(x) === sel && E.mTo(x) === i); say(any != null ? why(st) : st.act === 'reloc' ? L.relocOnly : L.nope); return; }
      busy = true; clearMarks();
      const g = pcs[sel], f = sel, reloc = E.kindOfMove(pos, m) === 'reloc', caps = pos.capsOf(m), before = pos.clone();
      delete pcs[f]; pcs[i] = g; pos.play(m); sel = null;
      travel(g, f, i, reloc, () => {
        if (caps.length) { SFX.take(); caps.forEach(c => { if (pcs[c]) lean(pcs[c], true); }); }
        later(() => finish(m, before), 220);
      });
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
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('std'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-agon-rules-seen', '1'); } catch (e) {}
    const dbg = { marks: () => marks.children.length, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(m => E.name(pos, m)) : null, sel: () => sel, at: s => { const [x, z] = xz(typeof s === 'string' ? idx(s) : s); return T3.project(x, z, Y); }, step: () => step, steps: STEPS.length, played: () => played, go: n => go(n),
      moves: () => STEPS[step].act ? accepted(STEPS[step]).map(m => [E.mFrom(m), E.mTo(m)]) : [] };
    window.__agRules = dbg;
    return {
      stop() { stopped = true; if (window.__agRules === dbg) delete window.__agRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.agon = { start };
})();
