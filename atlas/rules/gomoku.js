/* =====================================================================
   Gomoku & Renju rules — a guided tour on the 3D go board, told by the guide
   character (Stoneguin, the go-stone penguin). Hands-on and very gentle:
   stones go on the points, black first and in turn, five in a row (across,
   down, diagonal), stopping a four and an open three, the open four and the
   four-three, renju's forbidden moves for black, and how to win.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart() }
   Points are named like the game ('h8': file a–o left → right, rank 1–15 bottom → top).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-stone.webp';
  const cellOf = n => (+n.slice(1) - 1) * 15 + (n.charCodeAt(0) - 97);
  const TXT = {
    ja: {
      name: 'ゴイシペン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている点をタップ', nope: 'そこじゃないよ〜。光っている点をタップしてね', five: '五連！', forb: '黒の禁じ手', block: 'ストップ！', fourThree: '四三！',
      s: [
        { say: 'ペン！ ぼくは<b>ゴイシペン</b>。この榧（かや）の碁盤で、<b>五目並べ・連珠</b>のルールをいっしょに覚えよう。とってもかんたんだよ！' },
        { say: '盤には縦と横に<b>15本ずつ</b>線があるよ。石はマスの中じゃなく、線が<b>交わる点</b>に置くんだ。<b>黒が先</b>。光っている真ん中の点（<b>天元</b>）をタップして、最初の黒石を置いてみて！', done: 'パチッ！ いい音。置いた石は<b>動かさない</b>し、<b>取られることもない</b>よ。' },
        { say: '白が置いたよ。白と黒は<b>1手ずつ交互に</b>置いていくんだ。また黒の番。光っている点に置いてみて！', done: 'そう、それをくり返すだけ。空いている点なら、ふつうはどこに置いてもいいよ。' },
        { say: '目標はひとつ。自分の石を<b>5つ一直線</b>に並べること！ 黒が横に4つ並んでいるね。光っている端に置いて<b>五連</b>を作ろう！', done: '五連！ 先に5つ並べた方の<b>勝ち</b>だよ。' },
        { say: '<b>縦</b>でも<b>ななめ</b>でも、5つ並べば勝ち。今度はななめに4つ。光っている端のどちらかに置いてみて！', done: 'ななめの五連！ 横・縦・ななめ2つの<b>4つの向き</b>を、いつも見ておこうね。' },
        { say: 'あぶない！ 白が横に<b>4つ</b>並べた。左は黒がふさいでいるけど、右が空いてる。次に白がそこへ置いたら負けちゃう。光っている点に置いて<b>止めよう</b>！', done: 'セーフ！ 相手の<b>四</b>（あと1つで五連）は、すぐに止めないと負けだよ。' },
        { say: '白が<b>3つ</b>並べた。両はしが空いた三を<b>活三</b>（かつさん）っていうよ。放っておくと両はしの空いた四になって、もう止められない！ はしのどちらかに置いてふさごう。', done: 'ナイス！ 活三は<b>早めに止める</b>のがコツだよ。' },
        { say: '今度は黒の攻め！ 黒の活三をのばして、両はしが空いた四＝<b>活四</b>（かつし）を作ろう。光っている点に置いてみて！', mid: '白が片方をふさいだけど…反対側が空いてる！ 光っている点に置いて、とどめだ！', done: '五連！ 活四は両はしのどちらでも五連になるから、相手は<b>1手では止められない</b>んだ。' },
        { say: '強い技<b>四三</b>（しさん）を覚えよう。1手で<b>四</b>と<b>活三</b>を同時に作るんだ。光っている点に置くと、横が四、縦が三になるよ！', done: '四三！ 白は四を止めるしかない。そのすきに縦の三を活四にすれば勝ち。これが五目並べの<b>必勝パターン</b>だよ。' },
        { say: '<b>連珠</b>では先手の黒が強すぎないように、黒だけに<b>禁じ手</b>があるよ。三を2つ同時に作る<b>三三</b>、四を2つ作る<b>四四</b>、6つ以上並ぶ<b>長連</b>は打てないんだ。×の点は黒の三三。タップしてみて！', done: 'ブッブー！ そこには置けないんだ。<b>白には禁じ手がない</b>よ。黒は<b>ちょうど5つ</b>で勝ち。対局では禁じ手の点に×が出るから安心してね。' },
        { say: 'これでルールはばっちり！ <b>5つ並べたら勝ち</b>。相手の<b>四と活三は止める</b>、自分は<b>四三</b>をねらう。連珠では1手目は天元、2手目と3手目もその近くに置くよ。さあ、対局してみよう！' },
      ],
    },
    en: {
      name: 'Stoneguin', next: 'Next', back: 'Back', start: 'Let\'s play', again: 'Again', tap: 'Tap the glowing point', nope: 'Not there! Tap the glowing point', five: 'Five!', forb: 'Forbidden for Black', block: 'Blocked!', fourThree: 'Four-three!',
      s: [
        { say: 'Hi! I\'m <b>Stoneguin</b>, the go-stone penguin. Let\'s learn <b>gomoku and renju</b> together on this fine kaya board. It\'s really easy!' },
        { say: 'The board has <b>15 lines</b> each way. Stones go on the <b>points where the lines cross</b>, not inside the squares. <b>Black moves first.</b> Tap the glowing point in the middle (the <b>centre point</b>) to place the first black stone!', done: 'Click! A stone that has been placed <b>never moves</b> and is <b>never captured</b>.' },
        { say: 'White has played. Black and White take <b>turns, one stone each</b>. It\'s Black again — place a stone on the glowing point!', done: 'That\'s all there is to a turn. You can usually play on any empty point.' },
        { say: 'There\'s just one goal: get <b>five of your stones in a row</b>! Black has four across. Tap a glowing end to make <b>five</b>!', done: 'Five in a row! Whoever makes five first <b>wins</b>.' },
        { say: 'Five <b>down</b> or <b>diagonally</b> wins too. Here are four on a diagonal — tap one of the glowing ends!', done: 'A diagonal five! Always keep an eye on all <b>four directions</b>: across, down and both diagonals.' },
        { say: 'Watch out! White has <b>four</b> across. Black blocks the left end, but the right end is open — if White plays there, White wins. Tap the glowing point to <b>block it</b>!', done: 'Phew! A <b>four</b> (one away from five) must be blocked at once, or you lose.' },
        { say: 'White has made <b>three</b>. A three with both ends open is an <b>open three</b>. Left alone it becomes a four with two open ends — and that can\'t be stopped! Block one of its ends.', done: 'Nice! Stop open threes <b>early</b>.' },
        { say: 'Now Black attacks! Extend Black\'s open three into an <b>open four</b> — a four with both ends free. Tap a glowing point!', mid: 'White blocked one end… but the other end is still open! Tap the glowing point to finish!', done: 'Five! An open four can become five at either end, so it <b>can\'t be stopped with one move</b>.' },
        { say: 'Here\'s a strong trick: the <b>four-three</b>. One stone makes a <b>four</b> and an <b>open three</b> at the same time. Tap the glowing point: it makes a four across and a three down!', done: 'Four-three! White must block the four, so Black turns the three into an open four and wins. It\'s the <b>classic winning pattern</b>.' },
        { say: 'In <b>renju</b>, Black (who moves first) has <b>forbidden moves</b>, to keep the game fair: a <b>double three</b> (3-3), a <b>double four</b> (4-4) and an <b>overline</b> (six or more). The × is a 3-3 point for Black. Tap it!', done: 'Bzzt! Black can\'t play there. <b>White has no forbidden moves</b>, and Black wins with <b>exactly five</b>. In a game, the forbidden points are marked with ×.' },
        { say: 'You know the rules! <b>Five in a row wins</b>. Block your opponent\'s <b>fours and open threes</b>, and aim for a <b>four-three</b> yourself. In renju the first stone goes on the centre, and the 2nd and 3rd close to it. Let\'s play!' },
      ],
    },
    zh: {
      name: '棋石企鹅', next: '下一步', back: '返回', start: '来下一局', again: '再来一次', tap: '点击发光的点', nope: '不是那里哦～请点击发光的点', five: '五连！', forb: '黑棋禁手', block: '挡住了！', fourThree: '四三！',
      s: [
        { say: '你好！我是<b>棋石企鹅</b>。我们在这张榧木棋盘上一起学习<b>五子棋・连珠</b>的规则吧，非常简单！' },
        { say: '棋盘横竖各有<b>15条线</b>。棋子不是下在格子里，而是下在线的<b>交叉点</b>上。<b>黑棋先下</b>。点击中央发光的点（<b>天元</b>），放下第一颗黑子吧！', done: '啪！落下的棋子<b>不会移动</b>，也<b>不会被吃掉</b>。' },
        { say: '白棋下了。黑白双方<b>每次一子，轮流</b>下。又轮到黑棋了，请下在发光的点上！', done: '就是这样不断重复。一般来说，任何空点都可以下。' },
        { say: '目标只有一个：把自己的棋子<b>连成一直线的五颗</b>！黑棋横着有4颗了。点击发光的一端，连成<b>五连</b>吧！', done: '五连！先连成五颗的一方<b>获胜</b>。' },
        { say: '<b>竖</b>着或<b>斜</b>着连成五颗也能赢。这次是斜线上的4颗，点击发光的任意一端！', done: '斜线五连！横、竖和两条斜线这<b>四个方向</b>都要随时留意哦。' },
        { say: '危险！白棋横着连了<b>4颗</b>。左边被黑棋挡住了，但右边是空的。白棋下一手下在那里就输了。点击发光的点<b>挡住它</b>！', done: '安全！对手的<b>四</b>（再一颗就五连）必须马上挡住，否则会输。' },
        { say: '白棋连了<b>3颗</b>。两端都空着的三叫<b>活三</b>。如果不管，它会变成两端都空的四，就再也挡不住了！挡住它的一端吧。', done: '很好！活三要<b>尽早挡住</b>。' },
        { say: '这次轮到黑棋进攻！把黑棋的活三延长成两端都空的四，也就是<b>活四</b>。点击发光的点！', mid: '白棋挡住了一端……可另一端还空着！点击发光的点，一举获胜！', done: '五连！活四两端都能成五，对手<b>一手棋挡不住</b>。' },
        { say: '来学一招厉害的<b>四三</b>：一手棋同时做出<b>四</b>和<b>活三</b>。点击发光的点，横向成四，纵向成三！', done: '四三！白棋只能去挡四，黑棋趁机把三变成活四就赢了。这是五子棋的<b>必胜套路</b>。' },
        { say: '在<b>连珠</b>规则中，为了不让先手黑棋太有利，只有黑棋有<b>禁手</b>：一手同时做出两个三的<b>三三</b>、两个四的<b>四四</b>，以及连成六颗以上的<b>长连</b>都不能下。×是黑棋的三三点，点一下试试！', done: '不行哦！那里不能下。<b>白棋没有禁手</b>，黑棋要<b>正好五颗</b>才算赢。对局中禁手点会显示×，放心吧。' },
        { say: '规则全掌握了！<b>连成五颗就赢</b>。挡住对手的<b>四和活三</b>，自己去争取<b>四三</b>。连珠的第1手下在天元，第2、3手也下在它附近。来下一局吧！' },
      ],
    },
    ko: {
      name: '바둑돌펭', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 점을 탭', nope: '거기가 아니야~ 빛나는 점을 탭해 줘', five: '오목!', forb: '흑의 금수', block: '막았다!', fourThree: '사삼!',
      s: [
        { say: '안녕! 나는 <b>바둑돌펭</b>이야. 이 비자나무 바둑판에서 <b>오목・렌주</b> 규칙을 같이 배워 보자. 정말 쉬워!' },
        { say: '판에는 가로세로 <b>15줄</b>씩 선이 있어. 돌은 칸 안이 아니라 선이 <b>만나는 점</b>에 놓아. <b>흑이 먼저</b>야. 가운데 빛나는 점(<b>천원</b>)을 탭해서 첫 흑돌을 놓아 봐!', done: '딱! 놓은 돌은 <b>움직이지 않고</b>, <b>잡히지도 않아</b>.' },
        { say: '백이 두었어. 흑과 백은 <b>한 수씩 번갈아</b> 둬. 다시 흑 차례야. 빛나는 점에 놓아 봐!', done: '이걸 반복하면 돼. 비어 있는 점이라면 보통 어디에 둬도 괜찮아.' },
        { say: '목표는 하나! 자기 돌 <b>5개를 한 줄</b>로 놓는 거야. 흑이 가로로 4개 있지? 빛나는 끝에 놓아서 <b>오목</b>을 만들자!', done: '오목! 먼저 5개를 놓은 쪽이 <b>이겨</b>.' },
        { say: '<b>세로</b>나 <b>대각선</b>으로 5개여도 이겨. 이번엔 대각선으로 4개. 빛나는 끝 중 하나를 탭해 봐!', done: '대각선 오목! 가로・세로・대각선 두 개, <b>네 방향</b>을 늘 살펴보자.' },
        { say: '위험해! 백이 가로로 <b>4개</b>를 놓았어. 왼쪽은 흑이 막았지만 오른쪽이 비었어. 백이 거기 두면 져 버려. 빛나는 점에 놓아서 <b>막자</b>!', done: '휴, 안전! 상대의 <b>사</b>(한 개만 더 놓으면 오목)는 바로 막아야 해.' },
        { say: '백이 <b>3개</b>를 놓았어. 양 끝이 빈 삼을 <b>열린 삼</b>이라고 해. 그냥 두면 양 끝이 빈 사가 되어 더는 막을 수 없어! 한쪽 끝을 막자.', done: '좋아! 열린 삼은 <b>일찍 막는</b> 게 요령이야.' },
        { say: '이번엔 흑의 공격! 흑의 열린 삼을 늘려서 양 끝이 빈 <b>열린 사</b>를 만들자. 빛나는 점을 탭해 봐!', mid: '백이 한쪽을 막았지만… 반대쪽이 비어 있어! 빛나는 점에 놓아서 끝내자!', done: '오목! 열린 사는 양 끝 어느 쪽이든 오목이 되니까 상대는 <b>한 수로 막을 수 없어</b>.' },
        { say: '강한 기술 <b>사삼</b>을 배워 보자. 한 수로 <b>사</b>와 <b>열린 삼</b>을 동시에 만드는 거야. 빛나는 점에 두면 가로는 사, 세로는 삼이 돼!', done: '사삼! 백은 사를 막을 수밖에 없어. 그 틈에 삼을 열린 사로 만들면 승리. 오목의 <b>필승 패턴</b>이야.' },
        { say: '<b>렌주</b>에서는 먼저 두는 흑이 너무 유리하지 않도록 흑에게만 <b>금수</b>가 있어. 삼을 두 개 만드는 <b>삼삼</b>, 사를 두 개 만드는 <b>사사</b>, 6개 이상 늘어서는 <b>장목</b>은 둘 수 없어. ×는 흑의 삼삼 자리야. 탭해 봐!', done: '삐빅! 거기는 둘 수 없어. <b>백에게는 금수가 없고</b>, 흑은 <b>딱 5개</b>여야 이겨. 대국에서는 금수 자리에 ×가 표시돼.' },
        { say: '이제 규칙은 완벽해! <b>5개를 놓으면 승리</b>. 상대의 <b>사와 열린 삼은 막고</b>, 나는 <b>사삼</b>을 노리자. 렌주에서는 1수째를 천원에, 2・3수째도 그 근처에 둬. 자, 대국해 보자!' },
      ],
    },
    es: {
      name: 'Pingüipiedra', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tap: 'Toca el punto que brilla', nope: '¡Ahí no! Toca el punto que brilla', five: '¡Cinco!', forb: 'Prohibido para negras', block: '¡Bloqueado!', fourThree: '¡Cuatro-tres!',
      s: [
        { say: '¡Hola! Soy <b>Pingüipiedra</b>, el pingüino de piedra de go. Aprendamos <b>gomoku y renju</b> en este precioso tablero de kaya. ¡Es facilísimo!' },
        { say: 'El tablero tiene <b>15 líneas</b> en cada sentido. Las piedras van en los <b>puntos donde se cruzan las líneas</b>, no dentro de las casillas. <b>Empiezan las negras.</b> ¡Toca el punto que brilla en el centro para poner la primera piedra negra!', done: '¡Clac! Una piedra colocada <b>nunca se mueve</b> ni <b>se captura</b>.' },
        { say: 'Las blancas han jugado. Negras y blancas <b>se turnan, una piedra cada vez</b>. Vuelven las negras: ¡pon una piedra en el punto que brilla!', done: 'Eso es todo un turno. Normalmente puedes jugar en cualquier punto libre.' },
        { say: 'Solo hay un objetivo: ¡poner <b>cinco piedras tuyas en línea</b>! Las negras tienen cuatro en horizontal. ¡Toca un extremo brillante para hacer <b>cinco</b>!', done: '¡Cinco en línea! Quien hace cinco primero <b>gana</b>.' },
        { say: 'Cinco en <b>vertical</b> o en <b>diagonal</b> también gana. Aquí hay cuatro en diagonal: ¡toca uno de los extremos brillantes!', done: '¡Cinco en diagonal! Vigila siempre las <b>cuatro direcciones</b>: horizontal, vertical y las dos diagonales.' },
        { say: '¡Cuidado! Las blancas tienen <b>cuatro</b> en horizontal. Las negras tapan la izquierda, pero la derecha está libre: si las blancas juegan ahí, ganan. ¡Toca el punto que brilla para <b>bloquear</b>!', done: '¡Uf! Un <b>cuatro</b> (a una piedra del cinco) hay que bloquearlo enseguida, o pierdes.' },
        { say: 'Las blancas han hecho <b>tres</b>. Un tres con los dos extremos libres es un <b>tres abierto</b>. Si lo dejas, se convierte en un cuatro con dos extremos libres, ¡y eso ya no se para! Bloquea uno de sus extremos.', done: '¡Bien! Los tres abiertos hay que pararlos <b>pronto</b>.' },
        { say: '¡Ahora atacan las negras! Alarga el tres abierto negro hasta un <b>cuatro abierto</b>, con los dos extremos libres. ¡Toca un punto brillante!', mid: 'Las blancas taparon un extremo… ¡pero el otro sigue libre! ¡Toca el punto que brilla para rematar!', done: '¡Cinco! Un cuatro abierto se completa por cualquiera de los dos lados, así que <b>no se puede parar con una jugada</b>.' },
        { say: 'Un truco fuerte: el <b>cuatro-tres</b>. Una sola piedra hace un <b>cuatro</b> y un <b>tres abierto</b> a la vez. Toca el punto que brilla: ¡cuatro en horizontal y tres en vertical!', done: '¡Cuatro-tres! Las blancas tienen que tapar el cuatro, y las negras convierten el tres en cuatro abierto y ganan. Es la <b>jugada ganadora clásica</b>.' },
        { say: 'En <b>renju</b>, para que sea justo, las negras (que empiezan) tienen <b>jugadas prohibidas</b>: el <b>doble tres</b> (3-3), el <b>doble cuatro</b> (4-4) y la <b>sobrelínea</b> (seis o más). La × es un punto 3-3 para las negras. ¡Tócala!', done: '¡Bzzz! Las negras no pueden jugar ahí. <b>Las blancas no tienen prohibiciones</b> y las negras ganan con <b>cinco exactos</b>. En la partida, los puntos prohibidos se marcan con ×.' },
        { say: '¡Ya sabes las reglas! <b>Cinco en línea gana</b>. Bloquea los <b>cuatros y tres abiertos</b> del rival y busca tú el <b>cuatro-tres</b>. En renju la primera piedra va en el centro, y la 2.ª y la 3.ª cerca de él. ¡A jugar!' },
      ],
    },
    fr: {
      name: 'Pingopierre', next: 'Suivant', back: 'Retour', start: 'Jouer une partie', again: 'Encore', tap: 'Touche le point qui brille', nope: 'Pas là ! Touche le point qui brille', five: 'Cinq !', forb: 'Interdit pour Noir', block: 'Bloqué !', fourThree: 'Quatre-trois !',
      s: [
        { say: 'Salut ! Je suis <b>Pingopierre</b>, le pingouin pierre de go. Apprenons ensemble le <b>gomoku et le renju</b> sur ce beau goban en kaya. C\'est tout simple !' },
        { say: 'Le plateau a <b>15 lignes</b> dans chaque sens. Les pierres se posent sur les <b>points où les lignes se croisent</b>, pas dans les cases. <b>Noir commence.</b> Touche le point qui brille au milieu pour poser la première pierre noire !', done: 'Clac ! Une pierre posée <b>ne bouge plus</b> et <b>n\'est jamais prise</b>.' },
        { say: 'Blanc a joué. Noir et Blanc jouent <b>chacun leur tour, une pierre à la fois</b>. C\'est de nouveau à Noir : pose une pierre sur le point qui brille !', done: 'C\'est tout pour un tour. En général, on peut jouer sur n\'importe quel point libre.' },
        { say: 'Un seul but : aligner <b>cinq de tes pierres</b> ! Noir en a quatre à l\'horizontale. Touche une extrémité qui brille pour faire <b>cinq</b> !', done: 'Cinq alignés ! Le premier qui aligne cinq pierres <b>gagne</b>.' },
        { say: 'Cinq à la <b>verticale</b> ou en <b>diagonale</b>, ça gagne aussi. Voici quatre pierres en diagonale : touche une des extrémités qui brillent !', done: 'Cinq en diagonale ! Surveille toujours les <b>quatre directions</b> : horizontale, verticale et les deux diagonales.' },
        { say: 'Attention ! Blanc a <b>quatre</b> pierres à l\'horizontale. Noir bloque à gauche, mais la droite est libre : si Blanc y joue, il gagne. Touche le point qui brille pour <b>bloquer</b> !', done: 'Ouf ! Un <b>quatre</b> (à une pierre du cinq) doit être bloqué tout de suite, sinon on perd.' },
        { say: 'Blanc a fait <b>trois</b>. Un trois avec les deux bouts libres est un <b>trois ouvert</b>. Si on le laisse, il devient un quatre ouvert des deux côtés, impossible à arrêter ! Bloque un de ses bouts.', done: 'Bien ! Les trois ouverts, on les arrête <b>tôt</b>.' },
        { say: 'À Noir d\'attaquer ! Prolonge le trois ouvert noir en <b>quatre ouvert</b>, avec les deux bouts libres. Touche un point qui brille !', mid: 'Blanc a bloqué un bout… mais l\'autre est encore libre ! Touche le point qui brille pour finir !', done: 'Cinq ! Un quatre ouvert se complète d\'un côté ou de l\'autre : <b>impossible à arrêter en un coup</b>.' },
        { say: 'Un coup fort : le <b>quatre-trois</b>. Une seule pierre fait un <b>quatre</b> et un <b>trois ouvert</b> en même temps. Touche le point qui brille : quatre à l\'horizontale, trois à la verticale !', done: 'Quatre-trois ! Blanc doit bloquer le quatre, puis Noir change le trois en quatre ouvert et gagne. C\'est le <b>schéma gagnant classique</b>.' },
        { say: 'Au <b>renju</b>, pour que ce soit équitable, Noir (qui commence) a des <b>coups interdits</b> : le <b>double trois</b> (3-3), le <b>double quatre</b> (4-4) et l\'<b>overline</b> (six ou plus). Le × est un point 3-3 pour Noir. Touche-le !', done: 'Bzzz ! Noir ne peut pas jouer là. <b>Blanc n\'a pas d\'interdits</b>, et Noir gagne avec <b>exactement cinq</b>. En partie, les points interdits sont marqués d\'un ×.' },
        { say: 'Tu connais les règles ! <b>Cinq alignés, c\'est gagné</b>. Bloque les <b>quatre et les trois ouverts</b> de l\'adversaire, et vise toi-même le <b>quatre-trois</b>. Au renju, la 1re pierre va au centre, la 2e et la 3e tout près. À toi de jouer !' },
      ],
    },
    pt: {
      name: 'Pinguipedra', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque no ponto que brilha', nope: 'Aí não! Toque no ponto que brilha', five: 'Cinco!', forb: 'Proibido para as pretas', block: 'Bloqueado!', fourThree: 'Quatro-três!',
      s: [
        { say: 'Oi! Eu sou o <b>Pinguipedra</b>, o pinguim pedra de go. Vamos aprender <b>gomoku e renju</b> neste lindo tabuleiro de kaya. É bem fácil!' },
        { say: 'O tabuleiro tem <b>15 linhas</b> em cada direção. As pedras vão nos <b>pontos onde as linhas se cruzam</b>, não dentro das casas. <b>As pretas começam.</b> Toque no ponto que brilha no meio para colocar a primeira pedra preta!', done: 'Clic! Uma pedra colocada <b>nunca se move</b> e <b>nunca é capturada</b>.' },
        { say: 'As brancas jogaram. Pretas e brancas <b>se revezam, uma pedra por vez</b>. É a vez das pretas de novo: coloque uma pedra no ponto que brilha!', done: 'É só isso a cada vez. Em geral dá para jogar em qualquer ponto vazio.' },
        { say: 'Só há um objetivo: colocar <b>cinco pedras suas em linha</b>! As pretas têm quatro na horizontal. Toque numa ponta que brilha para fazer <b>cinco</b>!', done: 'Cinco em linha! Quem faz cinco primeiro <b>vence</b>.' },
        { say: 'Cinco na <b>vertical</b> ou na <b>diagonal</b> também vence. Aqui há quatro na diagonal: toque numa das pontas que brilham!', done: 'Cinco na diagonal! Fique sempre de olho nas <b>quatro direções</b>: horizontal, vertical e as duas diagonais.' },
        { say: 'Cuidado! As brancas têm <b>quatro</b> na horizontal. As pretas fecham a esquerda, mas a direita está livre: se as brancas jogarem ali, vencem. Toque no ponto que brilha para <b>bloquear</b>!', done: 'Ufa! Um <b>quatro</b> (a uma pedra do cinco) tem que ser bloqueado na hora, senão você perde.' },
        { say: 'As brancas fizeram <b>três</b>. Um três com as duas pontas livres é um <b>três aberto</b>. Se deixar, vira um quatro aberto dos dois lados, e aí não dá mais para parar! Bloqueie uma das pontas.', done: 'Boa! Pare os três abertos <b>cedo</b>.' },
        { say: 'Agora as pretas atacam! Estenda o três aberto das pretas até um <b>quatro aberto</b>, com as duas pontas livres. Toque num ponto que brilha!', mid: 'As brancas fecharam uma ponta… mas a outra ainda está livre! Toque no ponto que brilha para terminar!', done: 'Cinco! Um quatro aberto completa o cinco por qualquer lado, então <b>não dá para parar com um lance</b>.' },
        { say: 'Um truque forte: o <b>quatro-três</b>. Uma pedra faz um <b>quatro</b> e um <b>três aberto</b> ao mesmo tempo. Toque no ponto que brilha: quatro na horizontal e três na vertical!', done: 'Quatro-três! As brancas precisam fechar o quatro, e as pretas transformam o três em quatro aberto e vencem. É o <b>padrão vencedor clássico</b>.' },
        { say: 'No <b>renju</b>, para ser justo, as pretas (que começam) têm <b>lances proibidos</b>: o <b>duplo três</b> (3-3), o <b>duplo quatro</b> (4-4) e a <b>sobrelinha</b> (seis ou mais). O × é um ponto 3-3 das pretas. Toque nele!', done: 'Bzzz! As pretas não podem jogar ali. <b>As brancas não têm proibições</b>, e as pretas vencem com <b>exatamente cinco</b>. Na partida, os pontos proibidos aparecem com ×.' },
        { say: 'Você já sabe as regras! <b>Cinco em linha vence</b>. Bloqueie os <b>quatros e três abertos</b> do rival e busque o seu <b>quatro-três</b>. No renju a 1ª pedra vai no centro, e a 2ª e a 3ª bem perto dele. Vamos jogar!' },
      ],
    },
    de: {
      name: 'Steinguin', next: 'Weiter', back: 'Zurück', start: 'Los, spielen', again: 'Nochmal', tap: 'Tippe auf den leuchtenden Punkt', nope: 'Nicht dort! Tippe auf den leuchtenden Punkt', five: 'Fünf!', forb: 'Für Schwarz verboten', block: 'Geblockt!', fourThree: 'Vier-Drei!',
      s: [
        { say: 'Hallo! Ich bin <b>Steinguin</b>, der Go-Stein-Pinguin. Lass uns auf diesem edlen Kaya-Brett <b>Gomoku und Renju</b> lernen. Das ist ganz einfach!' },
        { say: 'Das Brett hat <b>15 Linien</b> in jede Richtung. Die Steine kommen auf die <b>Kreuzungspunkte</b>, nicht in die Felder. <b>Schwarz beginnt.</b> Tippe auf den leuchtenden Punkt in der Mitte, um den ersten schwarzen Stein zu setzen!', done: 'Klack! Ein gesetzter Stein <b>bewegt sich nie mehr</b> und wird <b>nie geschlagen</b>.' },
        { say: 'Weiß hat gesetzt. Schwarz und Weiß setzen <b>abwechselnd je einen Stein</b>. Jetzt ist wieder Schwarz dran: Setze auf den leuchtenden Punkt!', done: 'Mehr ist ein Zug nicht. Meist darfst du auf jeden freien Punkt setzen.' },
        { say: 'Es gibt nur ein Ziel: <b>fünf eigene Steine in einer Reihe</b>! Schwarz hat schon vier waagerecht. Tippe auf ein leuchtendes Ende und mach <b>Fünf</b>!', done: 'Fünf in einer Reihe! Wer zuerst fünf hat, <b>gewinnt</b>.' },
        { say: 'Auch <b>senkrecht</b> oder <b>diagonal</b> gewinnen fünf. Hier sind vier auf der Diagonale: Tippe auf eines der leuchtenden Enden!', done: 'Fünf diagonal! Behalte immer alle <b>vier Richtungen</b> im Blick: waagerecht, senkrecht und beide Diagonalen.' },
        { say: 'Achtung! Weiß hat <b>vier</b> waagerecht. Links blockt Schwarz, aber rechts ist frei – setzt Weiß dort, gewinnt Weiß. Tippe auf den leuchtenden Punkt und <b>blocke</b>!', done: 'Puh! Eine <b>Vier</b> (ein Stein vor der Fünf) muss sofort geblockt werden, sonst verlierst du.' },
        { say: 'Weiß hat eine <b>Drei</b>. Eine Drei mit beiden Enden frei heißt <b>offene Drei</b>. Lässt man sie, wird daraus eine offene Vier – und die ist nicht mehr aufzuhalten! Blocke eines ihrer Enden.', done: 'Gut! Offene Dreien hält man <b>früh</b> auf.' },
        { say: 'Jetzt greift Schwarz an! Verlängere die offene Drei von Schwarz zu einer <b>offenen Vier</b> mit zwei freien Enden. Tippe auf einen leuchtenden Punkt!', mid: 'Weiß hat ein Ende geblockt … aber das andere ist noch frei! Tippe auf den leuchtenden Punkt zum Sieg!', done: 'Fünf! Eine offene Vier wird an beiden Enden zur Fünf – sie ist <b>mit einem Zug nicht zu stoppen</b>.' },
        { say: 'Ein starker Trick: die <b>Vier-Drei</b>. Ein Stein macht gleichzeitig eine <b>Vier</b> und eine <b>offene Drei</b>. Tippe auf den leuchtenden Punkt: waagerecht eine Vier, senkrecht eine Drei!', done: 'Vier-Drei! Weiß muss die Vier blocken, und Schwarz macht aus der Drei eine offene Vier und gewinnt. Das ist das <b>klassische Siegesmuster</b>.' },
        { say: 'Beim <b>Renju</b> hat Schwarz (beginnt ja) zur Fairness <b>verbotene Züge</b>: die <b>Doppel-Drei</b> (3-3), die <b>Doppel-Vier</b> (4-4) und die <b>Überlänge</b> (sechs oder mehr). Das × ist ein 3-3-Punkt für Schwarz. Tippe darauf!', done: 'Bzzt! Dort darf Schwarz nicht setzen. <b>Weiß hat keine Verbote</b>, und Schwarz gewinnt mit <b>genau fünf</b>. Im Spiel sind verbotene Punkte mit × markiert.' },
        { say: 'Jetzt kennst du die Regeln! <b>Fünf in einer Reihe gewinnt</b>. Blocke <b>Vieren und offene Dreien</b> des Gegners und suche selbst eine <b>Vier-Drei</b>. Beim Renju kommt der 1. Stein in die Mitte, der 2. und 3. gleich daneben. Los geht\'s!' },
      ],
    },
    hi: {
      name: 'स्टोनगुइन', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकते बिंदु पर टैप करें', nope: 'वहाँ नहीं! चमकते बिंदु पर टैप करो', five: 'पाँच!', forb: 'काले के लिए वर्जित', block: 'रोक दिया!', fourThree: 'चार-तीन!',
      s: [
        { say: 'नमस्ते! मैं <b>स्टोनगुइन</b> हूँ, गो-पत्थर वाला पेंगुइन। चलो इस सुंदर काया बोर्ड पर <b>गोमोकू और रेंजू</b> के नियम साथ सीखें। बहुत आसान है!' },
        { say: 'बोर्ड पर हर दिशा में <b>15 रेखाएँ</b> हैं। पत्थर खानों में नहीं, रेखाओं के <b>कटान बिंदुओं</b> पर रखे जाते हैं। <b>काला पहले चलता है।</b> बीच के चमकते बिंदु पर टैप करके पहला काला पत्थर रखो!', done: 'टक! रखा हुआ पत्थर <b>कभी हिलता नहीं</b> और <b>कभी पकड़ा नहीं जाता</b>।' },
        { say: 'सफ़ेद ने चाल चली। काला और सफ़ेद <b>बारी-बारी से एक-एक पत्थर</b> रखते हैं। फिर से काले की बारी — चमकते बिंदु पर पत्थर रखो!', done: 'बस इतनी ही है एक चाल। आम तौर पर किसी भी खाली बिंदु पर खेल सकते हो।' },
        { say: 'लक्ष्य एक ही है: अपने <b>पाँच पत्थर एक सीधी पंक्ति</b> में लगाना! काले के चार पत्थर आड़े हैं। चमकते सिरे पर टैप करके <b>पाँच</b> बनाओ!', done: 'पाँच एक पंक्ति में! जो पहले पाँच बनाए, वही <b>जीतता</b> है।' },
        { say: '<b>खड़े</b> या <b>तिरछे</b> पाँच भी जीत हैं। यहाँ तिरछी रेखा पर चार हैं — किसी एक चमकते सिरे पर टैप करो!', done: 'तिरछे पाँच! हमेशा <b>चारों दिशाओं</b> पर नज़र रखो: आड़ी, खड़ी और दोनों तिरछी।' },
        { say: 'सावधान! सफ़ेद के आड़े <b>चार</b> हैं। बायाँ सिरा काले ने रोका है, पर दायाँ खुला है — सफ़ेद वहाँ खेले तो जीत जाएगा। चमकते बिंदु पर टैप करके <b>रोको</b>!', done: 'फ़ू! <b>चार</b> (पाँच से एक कम) को तुरंत रोकना ज़रूरी है, वरना हार।' },
        { say: 'सफ़ेद ने <b>तीन</b> बनाए। दोनों सिरे खुले तीन को <b>खुला तीन</b> कहते हैं। छोड़ दिया तो यह दोनों तरफ़ खुला चार बन जाएगा, जिसे रोका नहीं जा सकता! इसका एक सिरा बंद करो।', done: 'बढ़िया! खुले तीन को <b>जल्दी रोकना</b> ही तरकीब है।' },
        { say: 'अब काले का हमला! काले के खुले तीन को बढ़ाकर दोनों सिरों से खुला <b>खुला चार</b> बनाओ। चमकते बिंदु पर टैप करो!', mid: 'सफ़ेद ने एक सिरा रोका… पर दूसरा अब भी खुला है! चमकते बिंदु पर टैप करके जीतो!', done: 'पाँच! खुला चार किसी भी सिरे से पाँच बन जाता है, इसलिए उसे <b>एक चाल में रोका नहीं जा सकता</b>।' },
        { say: 'एक दमदार चाल: <b>चार-तीन</b>। एक ही पत्थर से <b>चार</b> और <b>खुला तीन</b> दोनों बनते हैं। चमकते बिंदु पर टैप करो: आड़ा चार और खड़ा तीन!', done: 'चार-तीन! सफ़ेद को चार रोकना ही पड़ेगा, फिर काला तीन को खुला चार बनाकर जीत जाता है। यही <b>जीत का क्लासिक तरीका</b> है।' },
        { say: '<b>रेंजू</b> में खेल बराबर रखने के लिए पहले चलने वाले काले की कुछ <b>वर्जित चालें</b> हैं: <b>दोहरा तीन</b> (3-3), <b>दोहरा चार</b> (4-4) और <b>ओवरलाइन</b> (छह या ज़्यादा)। × काले का 3-3 बिंदु है। उस पर टैप करो!', done: 'बज़्ज़! काला वहाँ नहीं खेल सकता। <b>सफ़ेद पर कोई रोक नहीं</b>, और काला <b>ठीक पाँच</b> से जीतता है। खेल में वर्जित बिंदुओं पर × दिखता है।' },
        { say: 'अब तुम्हें नियम आ गए! <b>पाँच एक पंक्ति में = जीत</b>। विरोधी के <b>चार और खुले तीन रोको</b>, और खुद <b>चार-तीन</b> का निशाना रखो। रेंजू में पहला पत्थर केंद्र पर, दूसरा और तीसरा उसके पास रखते हैं। चलो खेलें!' },
      ],
    },
    ar: {
      name: 'بطريق الحجر', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'اضغط النقطة المضيئة', nope: 'ليس هناك! اضغط النقطة المضيئة', five: 'خمسة!', forb: 'محظور على الأسود', block: 'تم الصد!', fourThree: 'أربعة-ثلاثة!',
      s: [
        { say: 'مرحبًا! أنا <b>بطريق الحجر</b>. لنتعلّم معًا قواعد <b>غوموكو ورينجو</b> على هذه الرقعة الفاخرة من خشب الكايا. إنها سهلة جدًا!' },
        { say: 'في الرقعة <b>15 خطًا</b> في كل اتجاه. توضع الأحجار على <b>نقاط تقاطع الخطوط</b> لا داخل المربعات. <b>الأسود يبدأ.</b> اضغط النقطة المضيئة في الوسط لتضع أول حجر أسود!', done: 'طق! الحجر الموضوع <b>لا يتحرك أبدًا</b> و<b>لا يُأسَر</b>.' },
        { say: 'لعب الأبيض. يتناوب الأسود والأبيض <b>حجرًا حجرًا</b>. الدور للأسود مجددًا: ضع حجرًا على النقطة المضيئة!', done: 'هذا كل ما في الدور. يمكنك عادةً اللعب على أي نقطة فارغة.' },
        { say: 'الهدف واحد فقط: صفّ <b>خمسة من أحجارك في خط مستقيم</b>! لدى الأسود أربعة أفقيًا. اضغط طرفًا مضيئًا لتصنع <b>خمسة</b>!', done: 'خمسة في صف! من يصنع خمسة أولًا <b>يفوز</b>.' },
        { say: 'الخمسة <b>عموديًا</b> أو <b>قطريًا</b> تفوز أيضًا. هنا أربعة على قطر: اضغط أحد الطرفين المضيئين!', done: 'خمسة قطرية! راقب دائمًا <b>الاتجاهات الأربعة</b>: الأفقي والعمودي والقطرين.' },
        { say: 'احذر! لدى الأبيض <b>أربعة</b> أفقيًا. الأسود يسد الطرف الأيسر، لكن الأيمن مفتوح؛ إن لعب الأبيض هناك فاز. اضغط النقطة المضيئة <b>لتصدّه</b>!', done: 'نجونا! يجب صدّ <b>الأربعة</b> (حجر واحد قبل الخمسة) فورًا وإلا خسرت.' },
        { say: 'صنع الأبيض <b>ثلاثة</b>. الثلاثة المفتوحة الطرفين تسمى <b>ثلاثة مفتوحة</b>. إن تُركت صارت أربعة مفتوحة الطرفين ولا يمكن إيقافها! سُدّ أحد طرفيها.', done: 'أحسنت! أوقف الثلاثات المفتوحة <b>مبكرًا</b>.' },
        { say: 'الآن يهاجم الأسود! مدّ الثلاثة المفتوحة للأسود إلى <b>أربعة مفتوحة</b> طرفاها حرّان. اضغط نقطة مضيئة!', mid: 'سدّ الأبيض طرفًا… لكن الطرف الآخر ما زال مفتوحًا! اضغط النقطة المضيئة لتنهي اللعبة!', done: 'خمسة! الأربعة المفتوحة تكتمل من أي طرف، لذا <b>لا يمكن إيقافها بنقلة واحدة</b>.' },
        { say: 'حيلة قوية: <b>أربعة-ثلاثة</b>. حجر واحد يصنع <b>أربعة</b> و<b>ثلاثة مفتوحة</b> معًا. اضغط النقطة المضيئة: أربعة أفقيًا وثلاثة عموديًا!', done: 'أربعة-ثلاثة! على الأبيض أن يسد الأربعة، فيحوّل الأسود الثلاثة إلى أربعة مفتوحة ويفوز. إنه <b>النمط الكلاسيكي للفوز</b>.' },
        { say: 'في <b>رينجو</b>، ولكي تكون اللعبة عادلة، للأسود (الذي يبدأ) <b>نقلات محظورة</b>: <b>الثلاثة المزدوجة</b> (3-3)، و<b>الأربعة المزدوجة</b> (4-4)، و<b>الخط الطويل</b> (ستة أو أكثر). علامة × نقطة 3-3 للأسود. اضغطها!', done: 'بززت! لا يستطيع الأسود اللعب هناك. <b>لا محظورات على الأبيض</b>، والأسود يفوز بـ<b>خمسة بالضبط</b>. في المباراة تُعلَّم النقاط المحظورة بـ ×.' },
        { say: 'عرفت القواعد! <b>خمسة في صف تفوز</b>. صُدّ <b>أربعات الخصم وثلاثاته المفتوحة</b>، واسعَ أنت إلى <b>أربعة-ثلاثة</b>. في رينجو يوضع الحجر الأول في المركز، والثاني والثالث قريبًا منه. هيا نلعب!' },
      ],
    },
  };
  const SHOW = [112, 127, 129, 126, 124, 114, 143, 96, 109, 157, 156, 142, 110, 111, 81, 139, 95, 123, 82, 65, 67];
  const STEPS = [
    { b: [], w: [] },
    { b: [], w: [], act: { to: ['h8'], col: 1 } },
    { b: ['h8'], w: [], auto: ['i9'], act: { to: ['i7'], col: 1 } },
    { b: ['e8', 'f8', 'g8', 'h8'], w: ['g9', 'h7', 'i9'], act: { to: ['i8', 'd8'], col: 1, five: true } },
    { b: ['f6', 'g7', 'h8', 'i9'], w: ['g8', 'h7', 'h9', 'f7'], act: { to: ['e5', 'j10'], col: 1, five: true } },
    { b: ['e10', 'g9', 'h9'], w: ['f10', 'g10', 'h10', 'i10'], danger: ['f10', 'g10', 'h10', 'i10'], act: { to: ['j10'], col: 1, block: true } },
    { b: ['h8', 'g8'], w: ['g7', 'h7', 'i7'], danger: ['g7', 'h7', 'i7'], act: { to: ['f7', 'j7'], col: 1, block: true } },
    { b: ['f8', 'g8', 'h8'], w: ['g7', 'h9', 'i9'], act: { to: ['e8', 'i8'], col: 1, reply: { e8: ['i8', 'd8'], i8: ['e8', 'j8'] } } },
    { b: ['e6', 'f6', 'g6', 'h7', 'h8'], w: ['d6', 'i8', 'g9', 'j7'], act: { to: ['h6'], col: 1, then: 'i6', lines: [['e6', 'f6', 'g6', 'h6'], ['h6', 'h7', 'h8']] } },
    { b: ['g8', 'h8', 'i9', 'i10'], w: ['f9', 'h10', 'j7'], cross: ['i8'], act: { to: ['i8'], col: 1, forbid: true } },
    { show: true, last: true },
  ];

  /* ---------- little sounds: slate on kaya ("pachi"), and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let nb = null;
    const noise = C => { if (nb) return nb; const b = C.createBuffer(1, C.sampleRate * .05 | 0, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6); return (nb = b); };
    function pachi(v = 1) {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 * v; bp.Q.value = 1.6;
      const g = C.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300 * v, t); o.frequency.exponentialRampToValueAtTime(130, t + .07);
      og.gain.setValueAtTime(.22, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .12);
    }
    function blip() {
      const C = on && ac(); if (!C) return; const t = C.currentTime, f = 560 + Math.random() * 260;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
      lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
    }
    function chime() {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.09, t + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .45); o.connect(g).connect(C.destination); o.start(t + i * .09); o.stop(t + i * .09 + .5); });
    }
    function buzz() {
      const C = on && ac(); if (!C) return; const t = C.currentTime, o = C.createOscillator(), g = C.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(170, t); o.frequency.linearRampToValueAtTime(120, t + .25); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.001, t + .3); o.connect(g).connect(C.destination); o.start(t); o.stop(t + .32);
    }
    return { pachi, blip, chime, buzz, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, GB = T3.goban, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.gomoku(true); T3.show('gomoku', board); T3.play(true);
    const U = board.userData, Y = U.top, c = U.cell;
    if (T3.fit) T3.fit({ w: U.W + .3, d: U.W + 1.6, y: Y - 1.5, pitch: 1.12 });   // the whole board, seen a little from the player's side
    const marks = new TH.Group(), stones = new TH.Group(); board.add(marks, stones);
    let st = {}, step = 0, stopped = false, busy = false, played = false, timers = [], phase = 0, targets = [], hand = null, idleT = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const xz = n => { const m = typeof n === 'number' ? n : cellOf(n); return U.pt(m % 15, 14 - Math.floor(m / 15)); };
    const H = c * .47 * GB.SH * 2;

    /* ---------- stones ---------- */
    function put(n, col, delay = 0, drop = true) {
      const g = new TH.Group(), s = GB.stone(col, c, (typeof n === 'number' ? n : cellOf(n)) * 7 + col), sh = T3.contact(c * .47, .5); sh.position.y = .002; g.add(sh, s);
      const [x, z] = xz(n); g.position.set(x, Y, z); stones.add(g); st[n] = g; g.userData.s = s;
      if (!drop) return g;
      g.visible = false;
      later(() => {
        g.visible = true; const z0 = c * .45, h0 = c * 1.1; s.position.set(0, h0, z0); s.rotation.x = -.4; sh.material.opacity = 0;
        anim(280, k => { const e = 1 - Math.pow(1 - k, 3), hh = k < .72 ? h0 * (1 - Math.pow(k / .72, 2)) : 0; s.position.y = hh; s.position.z = z0 * (1 - e); s.rotation.x = -.4 * (1 - Math.min(1, k / .72)); sh.material.opacity = .5 * Math.min(1, k * 1.3); if (k > .72) { const q = (k - .72) / .28, sq = Math.sin(q * Math.PI) * .06; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); } },
          () => { s.position.set(0, 0, 0); s.rotation.x = 0; s.scale.set(1, 1, 1); });
        later(() => SFX.pachi(col === 1 ? 1 : 1.12), 200);
      }, delay);
      return g;
    }
    function clearStones() { while (stones.children.length) stones.remove(stones.children[0]); st = {}; }
    function setBoard(S) {
      clearStones(); let i = 0;
      if (S.show) { SHOW.forEach((m, k) => put(m, k % 2 ? 2 : 1, 60 + (i++) * 45)); return i; }
      S.b.forEach(n => put(n, 1, 60 + (i++) * 70)); S.w.forEach(n => put(n, 2, 60 + (i++) * 70));
      return i;
    }
    /* ---------- marks ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function glow(n) {   // where to play: a vivid coral marker (glow, bold ring, ripple)
      const g = GB.tapMark(c), [x, z] = xz(n); g.position.set(x, Y, z); marks.add(g); return g;
    }
    function tile(n, color, op = .5, y = .005) { const m = new TH.Mesh(new TH.CircleGeometry(c * .55, 32), basic(color, op)); m.rotation.x = -Math.PI / 2; const [x, z] = xz(n); m.position.set(x, Y + y, z); marks.add(m); return m; }
    function bar(list, color, op = .45) {   // a rounded band under a line of stones (a four, a three)
      const [x0, z0] = xz(list[0]), [x1, z1] = xz(list[list.length - 1]), w = c * 1.32, L = Math.hypot(x1 - x0, z1 - z0) + w, r = w / 2, sh = new TH.Shape();
      sh.moveTo(-L / 2 + r, -r); sh.lineTo(L / 2 - r, -r); sh.absarc(L / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); sh.lineTo(-L / 2 + r, r); sh.absarc(-L / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
      const m = new TH.Mesh(new TH.ShapeGeometry(sh, 16), basic(color, op)); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
      m.position.set((x0 + x1) / 2, Y + .004, (z0 + z1) / 2); marks.add(m); return m;
    }
    function cross(n) { const g = new TH.Group(), mat = basic(0xe0281a, 1); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(c * .78, .03, c * .16), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = xz(n); g.position.set(x, Y + .01, z); g.userData.pulse = true; marks.add(g); return g; }
    function winRing(n, i) { later(() => { const m = new TH.Mesh(new TH.TorusGeometry(c * .5, c * .055, 8, 40), basic(0xffd24a, .95)); m.rotation.x = Math.PI / 2; const [x, z] = xz(n); m.position.set(x, Y + .02, z); m.scale.setScalar(.01); marks.add(m); anim(300, k => m.scale.setScalar(.01 + k)); const g = st[n]; if (g) anim(380, k => { g.userData.s.position.y = Math.sin(k * Math.PI) * c * .35; }); SFX.pachi(1.3 + i * .08); }, i * 110); }
    (function pulse() { if (stopped) return; const now = performance.now(), k = .5 + .5 * Math.sin(now / 260); let any = false; marks.children.forEach(m => { if (m.userData.tap) { any = true; m.userData.tick(now); return; } if (m.userData.pulse) { any = true; const s = .85 + k * .3; if (m.userData.ring) m.userData.ring.scale.set(s, s, s); else m.scale.set(s, 1, s); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- the ghost finger: after ~6 s without a tap it taps the right point ---------- */
    function hideHand() { if (hand) { hand.remove(); hand = null; } }
    function armIdle() { clearTimeout(idleT); hideHand(); if (targets.length) idleT = setTimeout(showHand, 6000); }
    function showHand() {
      if (stopped || busy || !targets.length || played && !phase) return;
      const [x, z] = xz(targets[0]), q = T3.project(x, z, Y + .05);
      hand = document.createElement('div');
      hand.innerHTML = '<svg viewBox="0 0 48 60" width="48" height="60"><circle cx="16" cy="6" r="5" fill="none" stroke="#ff4d4d" stroke-width="3" opacity=".8"/><path d="M12 8c0-3 2-5 4-5s4 2 4 5v17l2-1c2-1 4 0 4 2l1-1c2-1 4 0 4 2l1-1c2-1 5 0 5 3v12c0 8-6 14-14 14h-3c-5 0-8-3-10-7l-6-11c-1-2 0-4 2-5s4 0 5 2l2 3z" fill="#fff" stroke="#2b3044" stroke-width="2.6" stroke-linejoin="round"/></svg>';
      Object.assign(hand.style, { position: 'fixed', left: (q.x - 16) + 'px', top: (q.y - 4) + 'px', zIndex: 9999, pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))', opacity: 0 });
      document.body.appendChild(hand);
      if (hand.animate) hand.animate([{ transform: 'translate(46px,60px) scale(1)', opacity: .5 }, { transform: 'translate(0,0) scale(1)', opacity: .95, offset: .4 }, { transform: 'translate(0,0) scale(.82)', opacity: .95, offset: .55 }, { transform: 'translate(0,0) scale(1)', opacity: .95, offset: .7 }, { transform: 'translate(0,0) scale(1)', opacity: 0 }], { duration: 1600, iterations: 3, fill: 'forwards' });
      idleT = setTimeout(() => { hideHand(); showHand(); }, 6500);
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function line(html, warn) { $('.cnt').innerHTML = html; const t = $('.cnt').lastElementChild; if (warn && t && t.animate) t.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 320 }); }
    const tapLine = () => line(`<b class="tapl" style="color:#e0452b;font-size:1.04em">👉 ${L.tap}</b>`);
    function buttons() {
      const S = STEPS[step], wait = S.act && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = S.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (S.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!S.last && ag) ag.remove();
    }
    function arm(list) { targets = list.slice(); clearMarks(); const S = STEPS[step]; if (S.danger) bar(S.danger, 0xff4a3a, .38); (S.cross || []).forEach(cross); list.forEach(n => { if (!(S.act && S.act.forbid)) glow(n); }); armIdle(); }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; phase = 0; targets = [];
      timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); hideHand();
      const S = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(S);
      let wait = 200 + cnt * 70;
      if (S.auto) { S.auto.forEach((m, i) => put(m, 2, wait + 300 + i * 300)); wait += 300 + S.auto.length * 300; }
      if (S.act) { busy = true; later(() => { busy = false; arm(S.act.to); tapLine(); }, wait + 150); }
      say(L.s[step].say); buttons();
    }
    function pickCell(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      const fi = p.x / c + 7, fj = p.z / c + 7, i = Math.round(fi), j = Math.round(fj);
      if (i < 0 || i > 14 || j < 0 || j > 14 || Math.hypot(fi - i, fj - j) > .62) return null;
      return 'abcdefghijklmno'[i] + (15 - j);
    }
    function finish(extra) { busy = false; targets = []; clearTimeout(idleT); hideHand(); if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const S = STEPS[step], q = pickCell(e); if (!q || !S.act || !targets.length) return;
      if (!targets.includes(q)) { SFX.buzz(); line(`<b class="tapl" style="color:#e0452b;font-size:1.04em">👉 ${L.nope}</b>`, true); marks.children.forEach(m => { if (m.userData.tap) anim(380, k => m.scale.setScalar(1.5 - .5 * k)); }); armIdle(); return; }
      clearTimeout(idleT); hideHand();
      const a = S.act, stepNow = step;
      if (a.forbid) {   // the forbidden point: the stone hovers, shakes and is taken back
        busy = true; played = true; SFX.buzz();
        const g = put(q, 1, 0, false), s = g.userData.s; s.position.y = c * .5;
        anim(700, k => { s.position.x = Math.sin(k * Math.PI * 7) * c * .12 * (1 - k); s.position.y = c * .5 + Math.sin(k * Math.PI) * c * .1; }, () => anim(220, k => { s.position.y = c * .5 + k * c; s.scale.setScalar(1 - k); }, () => { stones.remove(g); delete st[q]; if (step === stepNow) finish(() => line(`<span class="tag">${L.forb}</span>`)); }));
        return;
      }
      busy = true; played = true; clearMarks(); targets = [];
      put(q, a.col, 0);
      if (a.reply && phase === 0) {   // the open four: White blocks one end, then the other end wins
        const [wq, win] = a.reply[q]; phase = 1;
        later(() => { put(wq, 2, 0); later(() => { if (step !== stepNow) return; busy = false; played = false; say(L.s[step].mid); arm([win]); tapLine(); buttons(); }, 500); }, 650);
        return;
      }
      if (a.reply && phase === 1) { phase = 2; later(() => { SFX.chime(); five(q); finish(() => line(`<span class="tag">${L.five}</span>`)); }, 420); return; }
      if (a.five) { later(() => { SFX.chime(); five(q); finish(() => line(`<span class="tag">${L.five}</span>`)); }, 420); return; }
      if (a.block) { later(() => { SFX.chime(); if (S.danger) bar(S.danger, 0x3a8cff, .32); tile(q, 0x2fd17a, .5); finish(() => line(`<span class="tag">${L.block}</span>`)); }, 420); return; }
      if (a.then) {   // four-three: both lines light up, White has to block the four
        later(() => { a.lines.forEach((ln, k) => bar(ln, k ? 0x2fd17a : 0xffb020, .55)); }, 380);
        later(() => { put(a.then, 2, 0); }, 900);
        later(() => { SFX.chime(); finish(() => line(`<span class="tag">${L.fourThree}</span>`)); }, 1400);
        return;
      }
      later(() => finish(), 420);
    }
    // the five through point q (the stones of the same colour in a line with it)
    function five(q) {
      const m = cellOf(q), col = m % 15, row = Math.floor(m / 15), black = new Set([m]);
      Object.keys(st).forEach(k => { const g = st[k]; if (g && g.userData.s && g.userData.s.userData.stone === 1) black.add(typeof k === 'number' ? k : /^\d+$/.test(k) ? +k : cellOf(k)); });
      for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        const ln = [m]; let cc = col + dc, rr = row + dr; while (cc >= 0 && cc < 15 && rr >= 0 && rr < 15 && black.has(rr * 15 + cc)) { ln.push(rr * 15 + cc); cc += dc; rr += dr; }
        cc = col - dc; rr = row - dr; while (cc >= 0 && cc < 15 && rr >= 0 && rr < 15 && black.has(rr * 15 + cc)) { ln.unshift(rr * 15 + cc); cc -= dc; rr -= dr; }
        if (ln.length >= 5) { ln.forEach((n, i) => winRing('abcdefghijklmno'[n % 15] + (Math.floor(n / 15) + 1), i)); return; }
      }
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
    later(() => go(0), 350);
    const api = {
      stop() { stopped = true; clearInterval(typeT); clearTimeout(idleT); hideHand(); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); if (window.AtlasRules.gomoku._s === api) delete window.AtlasRules.gomoku._s; },
      panel: el,
      _debug: { pt: n => { const [x, z] = xz(n); return T3.project(x, z, Y); }, step: () => step, targets: () => targets.slice(), busy: () => busy },
    };
    window.AtlasRules.gomoku._s = api;   // test hook
    return api;
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.gomoku = { start };
})();
