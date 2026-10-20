/* =====================================================================
   Shogi rules — a guided tour on the 3D table, told by the guide
   character (Shogitsune). Built from the full game's illustrated rules
   (shogi/rules.js + rules-i18n.js), turned into a short hands-on scenario.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart() }
   Board coordinates: c = 0 left column on screen (file 9), r = 0 top row (rank 一).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-shogi.webp';
  const SC = .8;                               // the legged board is life-size: a little smaller, like the showcase one
  const FU = 1, KY = 2, KE = 3, GI = 4, KA = 5, HI = 6, KI = 7, OU = 8, NG = 12, UM = 13;
  const BASE = { 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6 };   // promoted → original (when captured)
  const INIT = (() => {
    const p = [], back = [KY, KE, GI, KI, OU, KI, GI, KE, KY];
    back.forEach((t, c) => { p.push([t, c, 0, 1], [t, c, 8, 0]); });
    for (let c = 0; c < 9; c++) p.push([FU, c, 2, 1], [FU, c, 6, 0]);
    p.push([HI, 1, 1, 1], [KA, 7, 1, 1], [HI, 7, 7, 0], [KA, 1, 7, 0]);
    return p;
  })();
  const around = (c, r, d) => d.map(([dc, dr]) => [c + dc, r + dr]);
  const K8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  const G6 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]];
  const S5 = [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1]];
  const ray = (c, r, dc, dr, stop) => { const o = []; for (let x = c + dc, y = r + dr; x >= 0 && x < 9 && y >= 0 && y < 9 && !stop.some(s => s[0] === x && s[1] === y); x += dc, y += dr) o.push([x, y]); return o; };

  /* the scenario. say = before, done = after the player's move (interactive steps) */
  const TXT = {
    ja: {
      name: 'ショウギツネ', title: '将棋のルール', next: 'つぎへ', back: 'もどる', skip: 'とじる', start: '指してみる', again: 'もういちど',
      tap: '光っているマスをタップ', nope: 'そこには打てないよ〜。反則になっちゃう！', mate: '詰み！',
      s: [
        { say: 'こんにちは、わたしは<b>ショウギツネ</b>！ 将棋のルールを、この盤でいっしょにたしかめていこうね。' },
        { say: '盤は縦9×横9の<b>81マス</b>。おたがい<b>20枚</b>の駒をこう並べるよ。駒のとがった方が相手を向いていて、手前が自分（<b>先手</b>）。先手から交互に1手ずつ指すんだ。' },
        { say: '目的はただひとつ、<b>相手の玉（王）を詰ませること</b>！ 光っているのがおたがいの玉。玉を取られたら負けだから、大事に守ってね。' },
        { say: '<b>玉</b>はまわり8方向に1マス。<b>金</b>は斜め後ろ以外の6方向、<b>銀</b>は前と斜めの5方向に、1マスずつ動けるよ。光っているマスが行ける場所。' },
        { say: '<b>飛車</b>は縦横に、<b>角</b>は斜め（青いマス）に、何マスでもまっすぐ進める。でも駒は飛び越えられないよ。光っているマスをタップして、飛車を動かしてみて！', done: 'スーッと一直線！ 角も同じように、斜めにどこまでも進めるよ。' },
        { say: '<b>桂馬</b>は2つ前の左右に<b>ピョンと跳ぶ</b>、駒を飛び越えられる唯一の駒。<b>香車</b>はまっすぐ前へ何マスでも、<b>歩</b>は前に1マス。桂馬を跳ばせてみよう！', done: 'ピョーン！ 前の歩を飛び越えたね。桂・香・歩は前にしか進めないんだ。' },
        { say: '相手の駒がいるマスに動くと、その駒を<b>取れる</b>よ。銀で相手の<b>馬</b>を取ってみて！', done: '取った駒は<b>持ち駒</b>として駒台へ。成っていた馬は、元の<b>角</b>に戻るんだ。' },
        { say: '持ち駒は、自分の番に<b>空いているマスに打てる</b>（置ける）よ。これで1手。光っているマスのどこかに、持ち駒の金を打ってみて！', done: 'ピタッ！ 取った駒をまた使えるのが、将棋のいちばんおもしろいところだよ。' },
        { say: '上の3段（赤いところ）は<b>敵陣</b>。駒が敵陣に入る・中で動く・出るとき、裏返して<b>成れる</b>んだ。銀を敵陣に進めてみよう！', done: 'クルッ！ 赤い面の<b>成銀</b>になって、金と同じ動きに。成るかは自分で選べて、<b>金と玉は成れない</b>よ。' },
        { say: '打つときの反則をふたつ。歩のある縦の列にもう1枚歩を打つ<b>二歩</b>（左の赤い列）と、歩を打って詰ませる<b>打ち歩詰め</b>（右上）はダメなんだ。' },
        { say: '次に玉を取るぞ、という手が<b>王手</b>。どう逃げても防げなければ<b>詰み</b>で勝ち！ 金を光るマスに動かして、玉を詰ませてみて！', done: 'やったー、<b>詰み</b>！ 玉はどこへ逃げても金に取られ、金を取っても歩に取り返されるよ。これが「頭金」。' },
        { say: 'さいごにコツ。<b>玉は金と銀で囲って</b>守り、持ち駒はここぞという所に打とう。これでルールはばっちり！ さっそく指してみよう。' },
      ],
    },
    en: {
      name: 'Shogitsune', title: 'Shogi rules', next: 'Next', back: 'Back', skip: 'Close', start: 'Let\'s play', again: 'Again',
      tap: 'Tap a glowing square', nope: 'You can\'t drop there — that\'s a foul!', mate: 'Checkmate!',
      s: [
        { say: 'Hi, I\'m <b>Shogitsune</b>! Let\'s go through the rules of shogi together, right here on the board.' },
        { say: 'The board has <b>81 squares</b> (9×9). Each side sets out <b>20 pieces</b> like this. Pieces point at the opponent; you\'re on the near side (<b>Sente</b>). Sente moves first, then you take turns.' },
        { say: 'There\'s just one goal: <b>checkmate the opponent\'s king</b>! The glowing pieces are the two kings. Lose yours and you lose the game, so guard it well.' },
        { say: 'The <b>king</b> steps one square in any of 8 directions. The <b>gold</b> steps in 6 (not diagonally back), the <b>silver</b> in 5 (forward and diagonals). The glowing squares show where they can go.' },
        { say: 'The <b>rook</b> moves any distance straight, the <b>bishop</b> any distance diagonally (blue squares) — but neither can jump over pieces. Tap a glowing square to move the rook!', done: 'Whoosh, all the way! The bishop slides just the same, only diagonally.' },
        { say: 'The <b>knight</b> jumps two forward and one to the side — the only piece that <b>leaps over</b> others. The <b>lance</b> runs straight forward, the <b>pawn</b> steps one forward. Make the knight jump!', done: 'Boing! Right over the pawns. Knights, lances and pawns can only go forward.' },
        { say: 'Move onto an enemy piece to <b>capture</b> it. Take the opponent\'s <b>horse</b> (promoted bishop) with your silver!', done: 'Captured pieces go to your stand as <b>pieces in hand</b>. The promoted horse turns back into a <b>bishop</b>.' },
        { say: 'On your turn you can <b>drop</b> a piece from your hand onto <b>any empty square</b> instead of moving — that\'s your move. Drop the gold on a glowing square!', done: 'Plonk! Reusing captured pieces is what makes shogi so special.' },
        { say: 'The far three ranks (red) are the <b>enemy camp</b>. When a piece moves into, within or out of it, it may turn over and <b>promote</b>. Move the silver into the camp!', done: 'Flip! It\'s now a red-sided <b>promoted silver</b> that moves like a gold. Promoting is your choice, and <b>gold and king never promote</b>.' },
        { say: 'Two drop fouls: <b>nifu</b> — a second pawn on a file that already has your pawn (red files, left) — and <b>pawn-drop mate</b>, giving mate by dropping a pawn (top right).' },
        { say: 'A move that threatens the king is <b>check</b>. If the king can\'t escape, it\'s <b>checkmate</b> and you win! Move the gold to the glowing square to mate the king!', done: 'Hooray, <b>checkmate</b>! Wherever the king goes the gold takes it, and if it takes the gold, the pawn takes back.' },
        { say: 'One last tip: <b>wall your king in with golds and silvers</b>, and save your pieces in hand for the perfect moment. That\'s all the rules — let\'s play!' },
      ],
    },
    zh: {
      name: '将棋狐', title: '将棋规则', next: '下一步', back: '返回', skip: '关闭', start: '来下棋吧', again: '再来一次',
      tap: '点击发光的格子', nope: '那里不能打哦～会犯规的！', mate: '将死！',
      s: [
        { say: '你好，我是<b>将棋狐</b>！一起在这个棋盘上看看将棋的规则吧。' },
        { say: '棋盘是9×9共<b>81格</b>。双方各把<b>20枚</b>棋子这样摆好。棋子尖的一头朝向对方，靠近你的这边是自己（<b>先手</b>）。先手先走，然后轮流各走一步。' },
        { say: '目标只有一个：<b>将死对方的玉（王）</b>！发光的就是双方的玉。玉被吃掉就输了，要好好保护哦。' },
        { say: '<b>玉</b>可以向周围8个方向走1格。<b>金</b>是除了斜后方的6个方向，<b>银</b>是前方和斜向的5个方向，各走1格。发光的格子就是能走的地方。' },
        { say: '<b>飞车</b>可以横竖、<b>角行</b>可以斜向（蓝色格子）走任意格，但不能跳过棋子。点击发光的格子，走一下飞车吧！', done: '嗖地一条直线！角行也一样，可以斜着一直走。' },
        { say: '<b>桂马</b>跳到前方两格的左右，是唯一能<b>跳过</b>棋子的棋子。<b>香车</b>向前直走任意格，<b>步兵</b>向前走1格。让桂马跳一下吧！', done: '嘣！跳过了前面的步。桂、香、步都只能向前走哦。' },
        { say: '走到对方棋子所在的格子，就能<b>吃掉</b>它。用银吃掉对方的<b>马</b>吧！', done: '吃掉的棋子会作为<b>持驹</b>放到驹台上。升变过的马会变回原来的<b>角行</b>。' },
        { say: '轮到自己时，可以把持驹<b>打到任意空格</b>上，这算一步。把持驹的金打到发光的格子上吧！', done: '啪！能再次使用吃掉的棋子，是将棋最有趣的地方。' },
        { say: '最上面3行（红色）是<b>敌阵</b>。棋子进入、在其中移动或离开敌阵时，可以翻过来<b>升变</b>。把银走进敌阵吧！', done: '翻！变成红色一面的<b>成银</b>，走法和金一样。升不升变由你决定，<b>金和玉不能升变</b>。' },
        { say: '打驹时有两个犯规：在已有自己步兵的竖列再打一枚步的<b>二步</b>（左边的红列），以及打步兵将死对方的<b>打步诘</b>（右上）。' },
        { say: '下一步就要吃玉的走法叫<b>王手</b>（将军）。玉无论如何都逃不掉就是<b>将死</b>，你就赢了！把金走到发光的格子，将死对方的玉吧！', done: '太好了，<b>将死</b>！玉往哪逃都会被金吃掉，吃掉金又会被步吃回来。这叫“头金”。' },
        { say: '最后教你个窍门：<b>用金和银把玉围起来</b>保护，持驹留到关键时刻再打。规则全都懂啦！马上来下一盘吧。' },
      ],
    },
    ko: {
      name: '쇼기여우', title: '쇼기 규칙', next: '다음', back: '이전', skip: '닫기', start: '두어 보기', again: '한 번 더',
      tap: '빛나는 칸을 탭하세요', nope: '거기는 놓을 수 없어~. 반칙이야!', mate: '외통!',
      s: [
        { say: '안녕, 나는 <b>쇼기여우</b>! 이 판에서 쇼기 규칙을 같이 알아보자.' },
        { say: '판은 9×9, <b>81칸</b>이야. 서로 <b>20개</b>의 말을 이렇게 놓아. 말의 뾰족한 쪽이 상대를 향하고, 앞쪽이 나(<b>선수</b>)야. 선수부터 한 수씩 번갈아 둬.' },
        { say: '목표는 단 하나, <b>상대의 왕을 외통으로 몰기</b>! 빛나는 게 서로의 왕이야. 왕을 잡히면 지니까 잘 지켜야 해.' },
        { say: '<b>왕</b>은 주위 8방향으로 1칸. <b>금장</b>은 대각선 뒤를 뺀 6방향, <b>은장</b>은 앞과 대각선 5방향으로 1칸씩 움직여. 빛나는 칸이 갈 수 있는 곳이야.' },
        { say: '<b>비차</b>는 가로세로로, <b>각행</b>은 대각선(파란 칸)으로 몇 칸이든 곧장 가. 하지만 말을 뛰어넘을 순 없어. 빛나는 칸을 탭해서 비차를 움직여 봐!', done: '쭉 한 줄로! 각행도 똑같이 대각선으로 끝까지 갈 수 있어.' },
        { say: '<b>계마</b>는 두 칸 앞의 좌우로 <b>폴짝 뛰어</b>. 말을 뛰어넘는 유일한 말이야. <b>향차</b>는 앞으로 몇 칸이든, <b>보</b>는 앞으로 1칸. 계마를 뛰게 해 보자!', done: '폴짝! 앞의 보를 뛰어넘었지. 계마・향차・보는 앞으로만 갈 수 있어.' },
        { say: '상대 말이 있는 칸으로 가면 그 말을 <b>잡을</b> 수 있어. 은장으로 상대의 <b>용마</b>를 잡아 봐!', done: '잡은 말은 <b>잡은 말</b>(모치고마)로 말 받침에 올라가. 승격했던 용마는 원래의 <b>각행</b>으로 돌아가.' },
        { say: '내 차례에 잡은 말을 <b>빈칸 아무 데나 놓을</b> 수 있어. 이게 한 수야. 빛나는 칸 중 하나에 금장을 놓아 봐!', done: '착! 잡은 말을 다시 쓸 수 있는 게 쇼기의 가장 큰 재미야.' },
        { say: '위쪽 3줄(빨간 곳)은 <b>적진</b>. 말이 적진에 들어가거나, 안에서 움직이거나, 나올 때 뒤집어서 <b>승격</b>할 수 있어. 은장을 적진으로 보내 봐!', done: '휙! 빨간 면의 <b>성은</b>이 되어 금장과 같은 움직임이 됐어. 승격은 내가 고를 수 있고, <b>금장과 왕은 승격하지 않아</b>.' },
        { say: '놓을 때의 반칙 두 가지. 내 보가 있는 세로줄에 보를 하나 더 놓는 <b>니후</b>(이보, 왼쪽 빨간 줄)와, 보를 놓아서 외통으로 만드는 <b>우치후즈메</b>(오른쪽 위)는 안 돼.' },
        { say: '다음에 왕을 잡겠다는 수가 <b>장군</b>. 어떻게 해도 피할 수 없으면 <b>외통</b>, 내 승리야! 금장을 빛나는 칸으로 움직여서 외통을 만들어 봐!', done: '해냈다, <b>외통</b>! 왕이 어디로 도망가도 금장에게 잡히고, 금장을 잡으면 보가 다시 잡아. 이게 \'머리금\'이야.' },
        { say: '마지막 요령. <b>왕은 금장과 은장으로 감싸서</b> 지키고, 잡은 말은 결정적인 순간에 놓자. 이제 규칙은 완벽해! 바로 둬 보자.' },
      ],
    },
    es: {
      name: 'Shogizorro', title: 'Reglas del shogi', next: 'Siguiente', back: 'Atrás', skip: 'Cerrar', start: '¡A jugar!', again: 'Otra vez',
      tap: 'Toca una casilla brillante', nope: '¡Ahí no puedes lanzarla, sería falta!', mate: '¡Jaque mate!',
      s: [
        { say: '¡Hola, soy <b>Shogizorro</b>! Vamos a ver juntos las reglas del shogi aquí mismo, en el tablero.' },
        { say: 'El tablero tiene <b>81 casillas</b> (9×9). Cada bando coloca <b>20 piezas</b> así. Las piezas apuntan al rival; tú estás en el lado cercano (<b>Sente</b>). Sente mueve primero y luego se alterna.' },
        { say: 'Solo hay un objetivo: <b>dar jaque mate al rey rival</b>. Las piezas que brillan son los dos reyes. Si pierdes el tuyo, pierdes la partida: ¡protégelo bien!' },
        { say: 'El <b>rey</b> avanza una casilla en las 8 direcciones. El <b>oro</b>, una en 6 (no en diagonal hacia atrás) y la <b>plata</b>, una en 5 (adelante y diagonales). Las casillas que brillan muestran adónde pueden ir.' },
        { say: 'La <b>torre</b> se mueve en línea recta y el <b>alfil</b> en diagonal (casillas azules), tantas casillas como quieran, pero sin saltar piezas. ¡Toca una casilla brillante para mover la torre!', done: '¡Zas, hasta el fondo! El alfil se desliza igual, pero en diagonal.' },
        { say: 'El <b>caballo</b> salta dos adelante y una al lado: es la única pieza que <b>salta por encima</b> de otras. La <b>lanza</b> avanza recto lo que quiera y el <b>peón</b>, una casilla. ¡Haz saltar al caballo!', done: '¡Boing! Justo por encima de los peones. Caballos, lanzas y peones solo van hacia adelante.' },
        { say: 'Si mueves a una casilla con una pieza rival, la <b>capturas</b>. ¡Captura con tu plata el <b>caballo dragón</b> (alfil promocionado) del rival!', done: 'Las piezas capturadas van a tu soporte como <b>piezas en mano</b>. El caballo dragón vuelve a ser un <b>alfil</b>.' },
        { say: 'En tu turno, en vez de mover, puedes <b>lanzar</b> una pieza de tu mano en <b>cualquier casilla vacía</b>: esa es tu jugada. ¡Lanza el oro en una casilla brillante!', done: '¡Plof! Reutilizar las piezas capturadas es lo que hace tan especial al shogi.' },
        { say: 'Las tres filas del fondo (rojas) son el <b>campo enemigo</b>. Cuando una pieza entra, se mueve dentro o sale de él, puede darse la vuelta y <b>promocionar</b>. ¡Mete la plata en el campo enemigo!', done: '¡Vuelta! Ahora es una <b>plata promocionada</b> de cara roja que mueve como un oro. Promocionar es opcional, y <b>el oro y el rey nunca promocionan</b>.' },
        { say: 'Dos faltas al lanzar: el <b>nifu</b>, un segundo peón en una columna donde ya tienes uno (columnas rojas, a la izquierda), y el <b>mate con peón lanzado</b> (arriba a la derecha).' },
        { say: 'Una jugada que amenaza al rey es <b>jaque</b>. Si el rey no puede escapar, es <b>jaque mate</b> y ganas. ¡Mueve el oro a la casilla brillante y da mate!', done: '¡Bien, <b>jaque mate</b>! Vaya donde vaya, el oro captura al rey, y si el rey captura el oro, el peón lo recupera.' },
        { say: 'Un último truco: <b>rodea a tu rey con oros y platas</b> y guarda las piezas en mano para el momento justo. ¡Ya sabes todas las reglas, vamos a jugar!' },
      ],
    },
    fr: {
      name: 'Shogirenard', title: 'Règles du shogi', next: 'Suivant', back: 'Retour', skip: 'Fermer', start: 'On joue !', again: 'Encore',
      tap: 'Touche une case qui brille', nope: 'Impossible de parachuter là, ce serait une faute !', mate: 'Échec et mat !',
      s: [
        { say: 'Salut, moi c’est <b>Shogirenard</b> ! Découvrons ensemble les règles du shogi, directement sur le plateau.' },
        { say: 'Le plateau compte <b>81 cases</b> (9×9). Chaque camp place <b>20 pièces</b> comme ceci. Les pièces pointent vers l’adversaire ; toi, tu es du côté proche (<b>Sente</b>). Sente joue en premier, puis chacun son tour.' },
        { say: 'Un seul but : <b>mater le roi adverse</b> ! Les pièces qui brillent sont les deux rois. Si tu perds le tien, tu perds la partie : protège-le bien.' },
        { say: 'Le <b>roi</b> avance d’une case dans les 8 directions. L’<b>or</b> d’une case dans 6 directions (pas en diagonale arrière), l’<b>argent</b> dans 5 (devant et diagonales). Les cases qui brillent montrent où ils peuvent aller.' },
        { say: 'La <b>tour</b> va tout droit et le <b>fou</b> en diagonale (cases bleues), d’autant de cases qu’ils veulent, sans sauter de pièces. Touche une case qui brille pour déplacer la tour !', done: 'Fiou, jusqu’au bout ! Le fou glisse pareil, mais en diagonale.' },
        { say: 'Le <b>cavalier</b> saute deux cases en avant et une sur le côté : c’est la seule pièce qui <b>saute par-dessus</b> les autres. La <b>lance</b> file tout droit, le <b>pion</b> avance d’une case. Fais sauter le cavalier !', done: 'Boing ! Par-dessus les pions. Cavaliers, lances et pions ne vont que vers l’avant.' },
        { say: 'Va sur une case occupée par une pièce adverse pour la <b>capturer</b>. Prends le <b>cheval-dragon</b> (fou promu) adverse avec ton argent !', done: 'Les pièces capturées vont sur ton support : ce sont des <b>pièces en réserve</b>. Le cheval-dragon redevient un simple <b>fou</b>.' },
        { say: 'À ton tour, au lieu de bouger, tu peux <b>parachuter</b> une pièce de ta réserve sur <b>n’importe quelle case vide</b> : c’est ton coup. Parachute l’or sur une case qui brille !', done: 'Hop ! Réutiliser les pièces capturées, c’est ce qui rend le shogi si spécial.' },
        { say: 'Les trois rangées du fond (en rouge) sont le <b>camp adverse</b>. Quand une pièce y entre, s’y déplace ou en sort, elle peut se retourner et <b>être promue</b>. Avance l’argent dans le camp adverse !', done: 'Retournée ! C’est maintenant un <b>argent promu</b> à face rouge, qui se déplace comme un or. La promotion est au choix, et <b>l’or et le roi ne sont jamais promus</b>.' },
        { say: 'Deux fautes au parachutage : le <b>nifu</b>, un deuxième pion sur une colonne où tu as déjà un pion (colonnes rouges, à gauche), et le <b>mat par parachutage de pion</b> (en haut à droite).' },
        { say: 'Un coup qui menace le roi est un <b>échec</b>. Si le roi ne peut pas s’échapper, c’est <b>échec et mat</b> et tu gagnes ! Mets l’or sur la case qui brille pour mater le roi !', done: 'Bravo, <b>échec et mat</b> ! Où que le roi aille, l’or le prend, et s’il prend l’or, le pion reprend.' },
        { say: 'Une dernière astuce : <b>entoure ton roi d’ors et d’argents</b>, et garde tes pièces en réserve pour le bon moment. Tu connais toutes les règles — on joue !' },
      ],
    },
    pt: {
      name: 'Shogiraposa', title: 'Regras do shogi', next: 'Próximo', back: 'Voltar', skip: 'Fechar', start: 'Vamos jogar', again: 'De novo',
      tap: 'Toque numa casa brilhante', nope: 'Não dá para lançar aí — seria falta!', mate: 'Xeque-mate!',
      s: [
        { say: 'Oi, eu sou a <b>Shogiraposa</b>! Vamos ver juntos as regras do shogi, aqui mesmo no tabuleiro.' },
        { say: 'O tabuleiro tem <b>81 casas</b> (9×9). Cada lado arruma <b>20 peças</b> assim. As peças apontam para o adversário; você fica do lado de perto (<b>Sente</b>). Sente joga primeiro e depois cada um na sua vez.' },
        { say: 'Só existe um objetivo: <b>dar xeque-mate no rei adversário</b>! As peças que brilham são os dois reis. Se perder o seu, perde o jogo — proteja-o bem.' },
        { say: 'O <b>rei</b> anda uma casa em qualquer das 8 direções. O <b>ouro</b> anda uma casa em 6 (não na diagonal para trás) e a <b>prata</b> em 5 (frente e diagonais). As casas brilhantes mostram aonde podem ir.' },
        { say: 'A <b>torre</b> anda em linha reta e o <b>bispo</b> na diagonal (casas azuis), quantas casas quiser, mas sem pular peças. Toque numa casa brilhante para mover a torre!', done: 'Zum, até o fim! O bispo desliza do mesmo jeito, só que na diagonal.' },
        { say: 'O <b>cavalo</b> pula duas casas para frente e uma para o lado — é a única peça que <b>pula por cima</b> das outras. A <b>lança</b> vai reto para frente e o <b>peão</b> anda uma casa. Faça o cavalo pular!', done: 'Boing! Bem por cima dos peões. Cavalos, lanças e peões só andam para frente.' },
        { say: 'Ao ir para uma casa com peça adversária, você a <b>captura</b>. Capture com a sua prata o <b>cavalo-dragão</b> (bispo promovido) do adversário!', done: 'As peças capturadas vão para o seu suporte como <b>peças na mão</b>. O cavalo-dragão volta a ser um <b>bispo</b>.' },
        { say: 'Na sua vez, em vez de mover, você pode <b>lançar</b> uma peça da mão em <b>qualquer casa vazia</b> — essa é a sua jogada. Lance o ouro numa casa brilhante!', done: 'Plof! Reaproveitar as peças capturadas é o que deixa o shogi tão especial.' },
        { say: 'As três fileiras do fundo (vermelhas) são o <b>campo inimigo</b>. Quando uma peça entra, anda dentro ou sai dele, pode virar e <b>ser promovida</b>. Leve a prata para o campo inimigo!', done: 'Virou! Agora é uma <b>prata promovida</b> de face vermelha, que anda como um ouro. Promover é opcional, e <b>ouro e rei nunca são promovidos</b>.' },
        { say: 'Duas faltas ao lançar: o <b>nifu</b>, um segundo peão numa coluna que já tem um peão seu (colunas vermelhas, à esquerda), e o <b>mate com peão lançado</b> (no alto à direita).' },
        { say: 'Uma jogada que ameaça o rei é <b>xeque</b>. Se o rei não tiver como escapar, é <b>xeque-mate</b> e você vence! Leve o ouro para a casa brilhante e dê o mate!', done: 'Eba, <b>xeque-mate</b>! Para onde o rei for, o ouro o captura, e se ele capturar o ouro, o peão recaptura.' },
        { say: 'Uma última dica: <b>proteja o rei com ouros e pratas</b> ao redor, e guarde as peças na mão para a hora certa. Pronto, você já sabe as regras — vamos jogar!' },
      ],
    },
    de: {
      name: 'Shogifuchs', title: 'Shogi-Regeln', next: 'Weiter', back: 'Zurück', skip: 'Schließen', start: 'Los geht’s', again: 'Nochmal',
      tap: 'Tippe auf ein leuchtendes Feld', nope: 'Da darfst du nicht einsetzen – das wäre ein Regelverstoß!', mate: 'Schachmatt!',
      s: [
        { say: 'Hallo, ich bin <b>Shogifuchs</b>! Lass uns die Shogi-Regeln gemeinsam direkt hier auf dem Brett anschauen.' },
        { say: 'Das Brett hat <b>81 Felder</b> (9×9). Jede Seite stellt <b>20 Steine</b> so auf. Die Spitzen zeigen zum Gegner; du sitzt vorne (<b>Sente</b>). Sente beginnt, dann wird abwechselnd gezogen.' },
        { say: 'Es gibt nur ein Ziel: <b>den gegnerischen König mattsetzen</b>! Die leuchtenden Steine sind die beiden Könige. Verlierst du deinen, ist die Partie verloren – also gut beschützen!' },
        { say: 'Der <b>König</b> zieht ein Feld in alle 8 Richtungen. Das <b>Gold</b> ein Feld in 6 Richtungen (nicht schräg zurück), das <b>Silber</b> in 5 (nach vorn und schräg). Die leuchtenden Felder zeigen, wohin sie dürfen.' },
        { say: 'Der <b>Turm</b> zieht beliebig weit gerade, der <b>Läufer</b> beliebig weit schräg (blaue Felder) – aber keiner kann über Steine springen. Tippe auf ein leuchtendes Feld und ziehe den Turm!', done: 'Zisch, ganz durch! Der Läufer gleitet genauso, nur schräg.' },
        { say: 'Der <b>Springer</b> springt zwei Felder vor und eins zur Seite – als einziger Stein <b>über andere hinweg</b>. Die <b>Lanze</b> fährt beliebig weit geradeaus, der <b>Bauer</b> geht ein Feld vor. Lass den Springer springen!', done: 'Hopp! Direkt über die Bauern. Springer, Lanzen und Bauern ziehen nur nach vorn.' },
        { say: 'Ziehst du auf ein Feld mit einem gegnerischen Stein, <b>schlägst</b> du ihn. Schlag mit deinem Silber das gegnerische <b>Pferd</b> (beförderter Läufer)!', done: 'Geschlagene Steine kommen auf deine Ablage – als <b>Steine in der Hand</b>. Das Pferd wird wieder ein normaler <b>Läufer</b>.' },
        { say: 'Statt zu ziehen kannst du einen Stein aus der Hand auf <b>ein beliebiges leeres Feld</b> <b>einsetzen</b> – das ist dein Zug. Setze das Gold auf ein leuchtendes Feld!', done: 'Plopp! Geschlagene Steine wiederzuverwenden – das macht Shogi so besonders.' },
        { say: 'Die hinteren drei Reihen (rot) sind das <b>gegnerische Lager</b>. Zieht ein Stein hinein, darin oder heraus, darf er sich umdrehen und wird <b>befördert</b>. Ziehe das Silber ins Lager!', done: 'Umgedreht! Jetzt ist es ein rotes <b>befördertes Silber</b>, das wie ein Gold zieht. Befördern ist freiwillig, und <b>Gold und König werden nie befördert</b>.' },
        { say: 'Zwei Fouls beim Einsetzen: <b>Nifu</b> – ein zweiter Bauer in einer Linie, in der schon dein Bauer steht (rote Linien, links) – und <b>Bauernabwurf-Matt</b>, also Matt durch einen eingesetzten Bauern (oben rechts).' },
        { say: 'Ein Zug, der den König bedroht, ist <b>Schach</b>. Kann der König nicht entkommen, ist es <b>Schachmatt</b> – du gewinnst! Ziehe das Gold aufs leuchtende Feld und setze matt!', done: 'Juhu, <b>Schachmatt</b>! Wohin der König auch flieht, das Gold schlägt ihn, und schlägt er das Gold, schlägt der Bauer zurück.' },
        { say: 'Noch ein Tipp zum Schluss: <b>Schütze deinen König mit Gold und Silber</b> und hebe Steine in der Hand für den richtigen Moment auf. Jetzt kennst du alle Regeln – los geht’s!' },
      ],
    },
    hi: {
      name: 'शोगी लोमड़ी', title: 'शोगी के नियम', next: 'आगे', back: 'पीछे', skip: 'बंद करें', start: 'खेलें!', again: 'फिर से',
      tap: 'चमकते खाने पर टैप करें', nope: 'वहाँ मोहरा नहीं रख सकते — यह फ़ाउल है!', mate: 'मात!',
      s: [
        { say: 'नमस्ते, मैं हूँ <b>शोगी लोमड़ी</b>! चलो, इसी बोर्ड पर मिलकर शोगी के नियम देखते हैं।' },
        { say: 'बोर्ड में 9×9 यानी <b>81 खाने</b> हैं। दोनों तरफ़ <b>20-20 मोहरे</b> ऐसे सजाए जाते हैं। मोहरों की नोक विरोधी की ओर होती है; पास वाली तरफ़ तुम हो (<b>सेंते</b>)। पहली चाल सेंते चलता है, फिर बारी-बारी से।' },
        { say: 'लक्ष्य बस एक है: <b>विरोधी के राजा को मात देना</b>! चमकते मोहरे दोनों राजा हैं। अपना राजा गया तो बाज़ी हार गए, इसलिए उसे अच्छे से बचाओ।' },
        { say: '<b>राजा</b> आठों दिशाओं में एक खाना चलता है। <b>सोना जनरल</b> 6 दिशाओं में (तिरछा पीछे नहीं), <b>चाँदी जनरल</b> 5 दिशाओं में (आगे और तिरछे) एक-एक खाना। चमकते खाने बताते हैं कि वे कहाँ जा सकते हैं।' },
        { say: '<b>रथ</b> सीधा और <b>ऊँट</b> तिरछा (नीले खाने) कितने भी खाने चल सकते हैं — पर किसी मोहरे को लाँघ नहीं सकते। चमकते खाने पर टैप करके रथ चलाओ!', done: 'सर्र से आख़िर तक! ऊँट भी ऐसे ही चलता है, बस तिरछा।' },
        { say: '<b>घोड़ा</b> दो आगे और एक बगल में कूदता है — यही अकेला मोहरा है जो दूसरों के <b>ऊपर से कूद</b> सकता है। <b>भाला</b> सीधा आगे कितना भी जाता है, <b>प्यादा</b> एक खाना आगे। घोड़े को कुदाओ!', done: 'छलाँग! प्यादों के ठीक ऊपर से। घोड़ा, भाला और प्यादा सिर्फ़ आगे ही जाते हैं।' },
        { say: 'विरोधी के मोहरे वाले खाने पर जाओ तो उसे <b>पकड़</b> लेते हो। अपनी चाँदी से विरोधी का <b>घोड़ा-ड्रैगन</b> (प्रमोटेड ऊँट) पकड़ो!', done: 'पकड़े गए मोहरे तुम्हारे स्टैंड पर <b>हाथ के मोहरे</b> बन जाते हैं। घोड़ा-ड्रैगन फिर से सादा <b>ऊँट</b> बन जाता है।' },
        { say: 'अपनी बारी में चाल चलने की जगह, हाथ का मोहरा <b>किसी भी ख़ाली खाने पर रख</b> सकते हो — यही तुम्हारी चाल है। सोना जनरल को किसी चमकते खाने पर रखो!', done: 'ठप! पकड़े गए मोहरों को दोबारा इस्तेमाल करना ही शोगी को इतना ख़ास बनाता है।' },
        { say: 'आख़िरी तीन पंक्तियाँ (लाल) <b>दुश्मन का क्षेत्र</b> हैं। मोहरा इसमें घुसे, इसके अंदर चले या बाहर निकले, तो पलटकर <b>प्रमोट</b> हो सकता है। चाँदी को दुश्मन के क्षेत्र में ले चलो!', done: 'पलट! अब यह लाल तरफ़ वाली <b>प्रमोटेड चाँदी</b> है, जो सोने की तरह चलती है। प्रमोट करना तुम्हारी मर्ज़ी है, और <b>सोना व राजा कभी प्रमोट नहीं होते</b>।' },
        { say: 'मोहरा रखने के दो फ़ाउल: <b>निफ़ु</b> — जिस खड़ी पंक्ति में तुम्हारा प्यादा पहले से है, उसमें दूसरा प्यादा रखना (बाईं ओर लाल पंक्तियाँ) — और <b>उचिफ़ुज़ुमे</b>, यानी प्यादा रखकर मात देना (ऊपर दाईं ओर)।' },
        { say: 'जो चाल राजा को ख़तरे में डाले वह <b>शह</b> है। अगर राजा बच न सके तो <b>मात</b> — तुम जीत गए! सोना जनरल को चमकते खाने पर ले जाकर मात दो!', done: 'वाह, <b>मात</b>! राजा जहाँ भी जाए सोना उसे पकड़ लेता है, और अगर राजा सोने को पकड़े तो प्यादा वापस पकड़ लेता है।' },
        { say: 'आख़िरी टिप: <b>अपने राजा को सोने और चाँदी से घेरकर</b> बचाओ, और हाथ के मोहरे सही मौक़े के लिए रखो। अब तुम्हें सारे नियम आ गए — चलो खेलें!' },
      ],
    },
    ar: {
      name: 'ثعلب الشوغي', title: 'قواعد الشوغي', next: 'التالي', back: 'رجوع', skip: 'إغلاق', start: 'هيا نلعب', again: 'مرة أخرى',
      tap: 'انقر على مربع مضيء', nope: 'لا يمكنك الإسقاط هنا — هذا خطأ!', mate: 'كش مات!',
      s: [
        { say: 'مرحبًا، أنا <b>ثعلب الشوغي</b>! هيا نتعرّف معًا على قواعد الشوغي هنا على اللوحة.' },
        { say: 'في اللوحة <b>81 مربعًا</b> (9×9). يرتّب كل طرف <b>20 قطعة</b> هكذا. رؤوس القطع تتجه نحو الخصم، وأنت في الجهة القريبة (<b>سينتي</b>). يبدأ سينتي أولًا ثم يتناوب اللاعبان.' },
        { say: 'الهدف واحد فقط: <b>كش مات لملك الخصم</b>! القطعتان المضيئتان هما الملكان. إذا خسرت ملكك خسرت المباراة، فاحمِه جيدًا.' },
        { say: 'يتحرك <b>الملك</b> مربعًا واحدًا في الاتجاهات الثمانية، و<b>الجنرال الذهبي</b> مربعًا في 6 اتجاهات (ليس قطريًا إلى الخلف)، و<b>الجنرال الفضي</b> في 5 (إلى الأمام وقطريًا). المربعات المضيئة تُظهر أين يمكنها الذهاب.' },
        { say: 'يتحرك <b>الرخ</b> مستقيمًا و<b>الفيل</b> قطريًا (المربعات الزرقاء) أي عدد من المربعات، لكن لا يمكنهما القفز فوق القطع. انقر على مربع مضيء لتحريك الرخ!', done: 'ووووش، حتى النهاية! والفيل ينزلق بالطريقة نفسها لكن قطريًا.' },
        { say: 'يقفز <b>الحصان</b> مربعين إلى الأمام ومربعًا إلى الجانب، وهو القطعة الوحيدة التي <b>تقفز فوق</b> غيرها. و<b>الرمح</b> يندفع إلى الأمام مستقيمًا، و<b>البيدق</b> يتقدم مربعًا واحدًا. اجعل الحصان يقفز!', done: 'قفزة! فوق البيادق تمامًا. الحصان والرمح والبيدق لا تتحرك إلا إلى الأمام.' },
        { say: 'إذا تحركت إلى مربع فيه قطعة للخصم <b>تأسرها</b>. استخدم جنرالك الفضي لأسر <b>الحصان التنين</b> (الفيل المترقّي) الخاص بالخصم!', done: 'تنتقل القطع المأسورة إلى حاملك لتصبح <b>قطعًا في اليد</b>. والحصان التنين يعود <b>فيلًا</b> عاديًا.' },
        { say: 'في دورك، بدلًا من التحريك، يمكنك <b>إسقاط</b> قطعة من يدك على <b>أي مربع فارغ</b>، وهذه نقلتك. أسقِط الجنرال الذهبي على مربع مضيء!', done: 'طَق! إعادة استخدام القطع المأسورة هي ما يجعل الشوغي مميزًا جدًا.' },
        { say: 'الصفوف الثلاثة البعيدة (الحمراء) هي <b>معسكر الخصم</b>. عندما تدخله قطعة أو تتحرك داخله أو تخرج منه، يمكنها أن تنقلب و<b>تترقّى</b>. حرّك الجنرال الفضي إلى معسكر الخصم!', done: 'انقلبت! صارت الآن <b>فضيًا مترقّيًا</b> بوجه أحمر يتحرك مثل الذهبي. الترقية اختيارية، و<b>الذهبي والملك لا يترقّيان أبدًا</b>.' },
        { say: 'خطآن عند الإسقاط: <b>نيفو</b> — إسقاط بيدق ثانٍ في عمود فيه بيدق لك (الأعمدة الحمراء على اليسار) — و<b>المات بإسقاط بيدق</b> (أعلى اليمين).' },
        { say: 'النقلة التي تهدد الملك هي <b>كش</b>. إذا لم يستطع الملك الهرب فهو <b>كش مات</b> وتفوز! حرّك الجنرال الذهبي إلى المربع المضيء لتُميت الملك!', done: 'رائع، <b>كش مات</b>! أينما ذهب الملك يأسره الذهبي، وإذا أسر الملكُ الذهبيَّ استرده البيدق.' },
        { say: 'نصيحة أخيرة: <b>أحِط ملكك بالجنرالات الذهبية والفضية</b>، واحتفظ بالقطع التي في يدك للحظة المناسبة. صرت تعرف كل القواعد — هيا نلعب!' },
      ],
    },
  };

  /* board, marks and interactivity of each step.
     pos: [type, c, r, gote]   hand: sente's pieces in hand   glow: pulsing tiles   blue: static blue tiles
     zone: tint the enemy camp   bad: red tiles (a tap there = foul)   xs: crosses   ghost: [type, c, r, gote]
     sel: the piece that moves ([c, r] or 'hand')   act: { to: [[c, r]…] | 'empty', kind: slide|hop|drop, promote, mate } */
  const NIFU_OWN = [[FU, 0, 6, 0], [FU, 1, 5, 0]];
  const nifuBad = []; for (const f of [0, 1]) for (let r = 0; r < 9; r++) if (!NIFU_OWN.some(p => p[1] === f && p[2] === r)) nifuBad.push([f, r]);
  const STEPS = [
    { pos: INIT },
    { pos: INIT },
    { pos: INIT, glow: [[4, 0], [4, 8]] },
    { pos: [[OU, 1, 4, 0], [KI, 4, 4, 0], [GI, 7, 4, 0]], glow: [...around(1, 4, K8), ...around(4, 4, G6), ...around(7, 4, S5)] },
    { pos: [[HI, 2, 5, 0], [FU, 2, 2, 0], [KA, 6, 7, 0], [FU, 6, 2, 1], [KI, 4, 0, 1]], sel: [2, 5],
      blue: [...ray(6, 7, -1, -1, []), ...ray(6, 7, 1, -1, []), ...ray(6, 7, -1, 1, []), ...ray(6, 7, 1, 1, [])],
      act: { to: [...ray(2, 5, 0, -1, [[2, 2]]), ...ray(2, 5, 0, 1, []), ...ray(2, 5, -1, 0, []), ...ray(2, 5, 1, 0, [])], kind: 'slide' } },
    { pos: [[KE, 4, 7, 0], [FU, 3, 6, 0], [FU, 4, 6, 0], [FU, 5, 6, 0], [KY, 0, 8, 0], [FU, 8, 6, 0], [FU, 0, 1, 1], [KI, 4, 1, 1]], sel: [4, 7],
      glow: [...ray(0, 8, 0, -1, [[0, 1]]), [8, 5]], act: { to: [[3, 5], [5, 5]], kind: 'hop' } },
    { pos: [[GI, 4, 6, 0], [UM, 3, 5, 1], [KI, 5, 2, 1], [FU, 6, 6, 0], [FU, 2, 6, 0], [OU, 4, 8, 0]], sel: [4, 6], act: { to: [[3, 5]], kind: 'slide' } },
    { pos: [[FU, 1, 2, 1], [GI, 3, 1, 1], [OU, 4, 0, 1], [FU, 0, 6, 0], [KY, 8, 8, 0], [OU, 4, 8, 0], [KA, 2, 5, 1]], hand: [KI], sel: 'hand', act: { to: 'empty', kind: 'drop' } },
    { pos: [[GI, 4, 3, 0], [KI, 2, 0, 1], [FU, 7, 2, 1], [OU, 6, 0, 1], [FU, 1, 3, 0]], sel: [4, 3], zone: true, act: { to: [[3, 2], [4, 2], [5, 2]], kind: 'slide', promote: NG } },
    { pos: [...NIFU_OWN, [OU, 8, 0, 1], [KE, 7, 0, 1], [GI, 7, 1, 1], [KY, 8, 3, 0], [FU, 4, 2, 1], [OU, 4, 8, 0]], hand: [FU],
      bad: [...nifuBad, [8, 1]], xs: [[0, 0], [1, 0], [8, 1]], ghost: [FU, 8, 1, 0] },
    { pos: [[OU, 4, 0, 1], [FU, 4, 2, 0], [KI, 5, 2, 0], [KY, 0, 0, 1], [KE, 1, 0, 1], [FU, 0, 2, 1], [OU, 4, 8, 0]], sel: [5, 2], act: { to: [[4, 1]], kind: 'slide', mate: [[3, 0], [5, 0], [3, 1], [5, 1]] } },
    { pos: INIT, last: true },
  ];

  /* ---------- little sounds: the wooden "pachi" of a piece, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1) {   // boxwood on kaya: a bright knock + a hollow body
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600 * pitch; bp.Q.value = 1.8;
      const g = C.createGain(); g.gain.setValueAtTime(.6 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(320 * pitch, t); o.frequency.exponentialRampToValueAtTime(150 * pitch, t + .07);
      og.gain.setValueAtTime(.32 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .12);
    }
    function blip() {   // one syllable of the guide's voice
      const C = on && ac(); if (!C) return; const t = C.currentTime, f = 600 + Math.random() * 280;
      const o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .05);
      lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + .06);
      o.connect(lp).connect(g).connect(C.destination); o.start(t); o.stop(t + .07);
    }
    function chime() {   // checkmate!
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => { const o = C.createOscillator(), g = C.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, t + i * .09); g.gain.linearRampToValueAtTime(.09, t + i * .09 + .01); g.gain.exponentialRampToValueAtTime(.001, t + i * .09 + .45); o.connect(g).connect(C.destination); o.start(t + i * .09); o.stop(t + i * .09 + .5); });
    }
    return { tok, blip, chime, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, SG = T3.shogi, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.shogi(true); board.scale.setScalar(SC); T3.show('shogi', board); T3.play(true);
    if (T3.fit) T3.fit({ w: 16.6 * SC, d: 12.6 * SC, y: board.userData.top * SC, pitch: 1.53 });   // the board and both piece stands in view
    const Y = board.userData.top, CW = SG.CW, CH = SG.CH, FW = SG.FW, FH = SG.FH;
    const marks = new TH.Group(); board.add(marks);
    let pcs = {}, hand = [], step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const key = (c, r) => c + ',' + r;

    /* ---------- piece stands (駒台): yours at the bottom right, the opponent's at the top left ---------- */
    const KH = board.userData.top, STAND = [{ x: FW / 2 + 1.95, z: 3.9 }, { x: -FW / 2 - 1.95, z: -3.9 }];
    const wood = T3.M({ map: T3.wood('kayaLeg', '#e0b06a', '#a87232', 256, 256, 2), roughness: .5, bumpScale: .002 });
    STAND.forEach(s => { const k = SG.komadai(wood, KH); k.position.set(s.x, 0, s.z); board.add(k); });
    const slot = i => [STAND[0].x + (i % 2 ? .55 : -.55), STAND[0].z - .85 + (i >> 1) * 1.05];

    function mk(type, gote) { const g = SG.piece(type, !!gote, !!gote && type === OU); g.userData.gote = !!gote; return g; }
    function swapType(g, type) { const n = SG.piece(type, g.userData.gote, g.userData.gote && type === OU); const m = n.children[0]; g.remove(g.children[0]); g.add(m); g.userData.type = type; }
    function clearPieces() { Object.values(pcs).forEach(g => board.remove(g)); hand.forEach(g => board.remove(g)); pcs = {}; hand = []; }
    function fall(g, y, delay, h = 1.4) { g.visible = false; later(() => { g.visible = true; anim(260, k => { g.position.y = y + (1 - k) * (1 - k) * h; }); }, delay); }
    function setBoard(st) {   // swap the position: the pieces drop in one by one
      clearPieces(); let i = 0;
      st.pos.forEach(([t, c, r, gote]) => { const g = mk(t, gote), [x, z] = SG.cell(c, r); g.position.set(x, Y, z); board.add(g); pcs[key(c, r)] = g; fall(g, Y, 40 + (i++) * 16); });
      (st.hand || []).forEach((t, j) => { const g = mk(t, 0), [x, z] = slot(j); g.position.set(x, KH, z); board.add(g); hand.push(g); fall(g, KH, 60 + (i++) * 16); });
      return i;
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function tile(c, r, color, op = .5, pulse = false) {
      const m = new TH.Mesh(new TH.BoxGeometry(CW * .92, .02, CH * .92), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      const [x, z] = SG.cell(c, r); m.position.set(x, Y + .012, z); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function ring(x, z, y) { const m = new TH.Mesh(new TH.CylinderGeometry(.2, .2, .02, 24), new TH.MeshBasicMaterial({ color: 0xd8321c, transparent: true, opacity: .85, toneMapped: false })); m.position.set(x, y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    const ringAt = (c, r) => { const [x, z] = SG.cell(c, r); return ring(x, z, Y); };
    function cross(c, r) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(.66, .03, .09), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = SG.cell(c, r); g.position.set(x, Y + .5, z); marks.add(g); return g; }
    function ghost(t, c, r, gote) {
      const g = mk(t, gote); g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.material = o.material.map(x => { const y = x.clone(); y.transparent = true; y.opacity = .45; y.depthWrite = false; return y; }); } });
      const [x, z] = SG.cell(c, r); g.position.set(x, Y, z); marks.add(g); return g;
    }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); marks.children.forEach(m => { if (m.userData.pulse) { if (m.geometry.type === 'CylinderGeometry') m.scale.set(.85 + k * .3, 1, .85 + k * .3); m.material.opacity = .4 + k * .5; } }); Object.values(pcs).forEach(p => { if (p.userData.bob) p.position.y = Y + .08 + .28 * k; }); requestAnimationFrame(pulse); })();
    const empties = () => { const o = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!pcs[key(c, r)]) o.push([c, r]); return o; };
    const targets = st => !st.act ? [] : st.act.to === 'empty' ? empties() : st.act.to;
    const selPiece = st => st.sel === 'hand' ? hand[0] : st.sel ? pcs[key(...st.sel)] : null;

    /* ---------- moves ---------- */
    function moveTo(g, c, r, kind, done) {   // slide (low glide) or hop (an arc), then the "pachi"
      const x0 = g.position.x, y0 = g.position.y, z0 = g.position.z, [x1, z1] = SG.cell(c, r), d = Math.hypot(x1 - x0, z1 - z0);
      const hop = kind !== 'slide', H = kind === 'drop' ? 2.2 : 1.8, dur = kind === 'slide' ? 240 + d * 55 : 560;
      anim(dur, k => { const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; g.position.y = (hop ? Y + Math.sin(k * Math.PI) * H : Y + Math.sin(k * Math.PI) * .25) + (y0 - Y) * (1 - e); },
        () => { g.position.y = Y; SFX.tok(1, 1); land(g); if (done) done(); });
    }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .07; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function flipTo(g, type, done) {   // promotion: lift, roll over, the red side lands face up
      const y0 = g.position.y; let swapped = false;
      anim(620, k => { g.position.y = y0 + Math.sin(k * Math.PI) * 1.1; g.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5 && !swapped) { swapped = true; swapType(g, type); } },
        () => { g.rotation.z = 0; g.position.y = y0; SFX.tok(.9, 1.15); land(g); if (done) done(); });
    }
    function toHand(g, done) {   // a captured piece flies to your stand, turning to face the opponent (and back to its unpromoted side)
      const i = hand.length; hand.push(g); g.userData.gote = false;
      const x0 = g.position.x, z0 = g.position.z, [x1, z1] = slot(i), r0 = g.rotation.y, base = BASE[g.userData.type]; let swapped = !base;
      anim(720, k => { const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; g.position.y = Y + (KH - Y) * e + Math.sin(k * Math.PI) * 2.2; g.rotation.y = r0 * (1 - e);
        if (base) g.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5 && !swapped) { swapped = true; swapType(g, base); } },
        () => { g.rotation.set(0, 0, 0); g.position.y = KH; SFX.tok(.6, 1.3); land(g); if (done) done(); });
    }
    function shake(g, done) { const r0 = g.rotation.y; anim(700, k => { g.rotation.y = r0 + Math.sin(k * Math.PI * 7) * .16 * (1 - k); }, () => { g.rotation.y = r0; if (done) done(); }); }

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
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(st);
      later(() => {
        if (st.zone) for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) tile(c, r, 0xff4a3a, .3);
        (st.blue || []).forEach(([c, r]) => tile(c, r, 0x1f6fe8, .5));
        (st.glow || []).forEach(([c, r]) => { tile(c, r, 0xe0501e, .5, true); const p = pcs[key(c, r)]; if (p) p.userData.bob = true; });
        (st.bad || []).forEach(([c, r]) => tile(c, r, 0xff4040, .3));
        (st.xs || []).forEach(([c, r]) => cross(c, r));
        if (st.ghost) ghost(...st.ghost);
        const sp = selPiece(st);
        if (sp) {   // the piece to move: lifted a little, with a glowing ring under it
          if (st.sel === 'hand') { const m = tile(0, 0, 0x2fd17a, .6, true); m.position.set(sp.position.x, KH + .012, sp.position.z); }
          else tile(...st.sel, 0x2fd17a, .6, true);
          const y0 = st.sel === 'hand' ? KH : Y; anim(240, k => { sp.position.y = y0 + .22 * io(k); });
        }
        targets(st).forEach(([c, r]) => { if (pcs[key(c, r)]) tile(c, r, 0xd8321c, .5, true); else ringAt(c, r); });
      }, 420 + cnt * 16);
      say(L.s[step].say); buttons();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y * SC); if (!p) return null;
      const x = p.x / SC, z = p.z / SC, c = Math.floor((x + FW / 2) / CW), r = Math.floor((z + FH / 2) / CH);
      return c < 0 || c > 8 || r < 0 || r > 8 ? null : [c, r];
    }
    function finish(extra) { busy = false; if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step], q = cellOf(e); if (!q) return;
      const [c, r] = q, has = list => (list || []).some(([a, b]) => a === c && b === r);
      if (has(st.bad)) { say(L.nope); return; }
      if (!st.act || played || !has(targets(st))) return;
      busy = true; played = true; clearMarks();
      const g = selPiece(st), stepNow = step;
      if (st.act.kind === 'drop') {
        hand.splice(hand.indexOf(g), 1); pcs[key(c, r)] = g;
        moveTo(g, c, r, 'drop', () => later(() => finish(), 250));
        return;
      }
      const from = key(...st.sel), victim = pcs[key(c, r)];
      delete pcs[from]; pcs[key(c, r)] = g;
      moveTo(g, c, r, st.act.kind, () => {
        if (step !== stepNow) return;
        if (victim) { toHand(victim, () => later(() => finish(), 200)); return; }
        if (st.act.promote) { later(() => flipTo(g, st.act.promote, () => later(() => finish(), 250)), 120); return; }
        if (st.act.mate) {
          const king = Object.values(pcs).find(p => p.userData.type === OU && p.userData.gote);
          shake(king, () => { SFX.chime(); finish(() => { st.act.mate.forEach(([a, b]) => cross(a, b)); $('.cnt').innerHTML = `<span class="tag">${L.mate}</span>`; }); });
          return;
        }
        later(() => finish(), 250);
      });
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => go(step - 1);
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / → next, ← back (the next button's rules apply: an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); el.remove(); },
      panel: el,
      _debug: { cell: (c, r) => { const [x, z] = SG.cell(c, r); return [x * SC, z * SC, Y * SC]; } },
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.shogi = { start };
})();
