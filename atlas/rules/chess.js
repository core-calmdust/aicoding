/* =====================================================================
   Chess rules — a guided tour on the 3D table, told by the guide
   character (Knighton). Built from the full game's illustrated rules
   (chess/rules.js: shared/ruletour.js pages), turned into a short
   hands-on scenario on the luxury board.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart() }
   Squares are given in algebraic notation ('e4'); White is at the bottom.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-knight.webp';
  const at = n => [n.charCodeAt(0) - 97, 8 - (+n[1])];   // 'e4' → [file 0..7 = left→right, row 0 = top (rank 8)]
  const INIT = (() => { const p = [], back = 'RNBQKBNR'; [...back].forEach((t, f) => { const c = 'abcdefgh'[f]; p.push([t, c + '1', 'w'], [t, c + '8', 'b'], ['P', c + '2', 'w'], ['P', c + '7', 'b']); }); return p; })();
  const sqs = (f0, r0, df, dr, stop = []) => { const o = []; for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 8 && r >= 1 && r <= 8; f += df, r += dr) { const n = 'abcdefgh'[f] + r; if (stop.includes(n)) break; o.push(n); } return o; };
  const rays = (n, dirs, stop) => { const f = n.charCodeAt(0) - 97, r = +n[1]; return dirs.flatMap(([a, b]) => sqs(f, r, a, b, stop)); };
  const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const near = (n, d) => { const f = n.charCodeAt(0) - 97, r = +n[1]; return d.map(([a, b]) => [f + a, r + b]).filter(([x, y]) => x >= 0 && x < 8 && y >= 1 && y <= 8).map(([x, y]) => 'abcdefgh'[x] + y); };

  const TXT = {
    ja: {
      name: 'ナイトン', next: 'つぎへ', back: 'もどる', start: '指してみる', again: 'もういちど', tap: '光っているマスをタップ', nope: 'そこへは動けないよ〜', mate: 'チェックメイト！',
      s: [
        { say: 'やあ、ぼくは<b>ナイトン</b>！ チェスのルールを、このピカピカの盤でいっしょにたしかめよう。' },
        { say: '盤は8×8の<b>64マス</b>。手前の右すみが<b>白いマス</b>になるように置くよ。銀色が<b>白</b>（きみ）、金色が<b>黒</b>。<b>白が先手</b>で、1手ずつ交互に指すんだ。' },
        { say: '目的は<b>相手のキングをチェックメイトすること</b>！ 光っているのがおたがいのキング。キングは取られる前に詰んだら負けだよ。' },
        { say: '<b>ルーク</b>はタテ・ヨコに何マスでも進める。でも駒は飛び越えられないよ。光っているマスをタップして、ルークを動かしてみて！', done: 'スーッ！ 味方の駒の手前でちゃんと止まったね。' },
        { say: '<b>ビショップ</b>はナナメに何マスでも（青いマス）。相手の駒がいるマスに進むと、その駒を<b>取れる</b>よ。ビショップで黒のナイトを取ってみて！', done: '取った！ 取られた駒は盤から消えるんだ。' },
        { say: '<b>クイーン</b>はタテ・ヨコ・ナナメどこへでも何マスでも進める最強の駒（左）。<b>キング</b>はまわり8方向に1マスだけ（右）。キングは取られるマスへは動けないよ。' },
        { say: 'ぼくの仲間、<b>ナイト</b>は「L字」に跳ぶ。2マス進んで1マス横。<b>駒を飛び越えられる</b>唯一の駒だよ。ナイトを跳ばせてみて！', done: 'ピョーン！ 前のポーンをひょいっと飛び越えたね。' },
        { say: '<b>ポーン</b>は前に1マス（最初だけ2マスも可）。でも<b>取るときはナナメ前</b>なんだ。ポーンで黒のポーンを取ってみて！', done: 'ナナメにパクッ！ ポーンは後ろには戻れないよ。' },
        { say: 'ポーンがいちばん奥まで進むと、クイーン・ルーク・ビショップ・ナイトのどれかに<b>昇格（プロモーション）</b>できる。ポーンを進めてみて！', done: 'キラーン！ クイーンに変身！ ふつうはいちばん強いクイーンを選ぶよ。' },
        { say: '<b>キャスリング</b>は、キングを2マス横へ動かし、ルークがその反対側へ回りこむ特別な手。キングもルークもまだ動いていなくて、間に駒がなく、チェックを通らないときだけできるよ。キングを光るマスへ！', done: 'ガチャン！ キングが安全な隅へ、ルークが真ん中へ出てきたね。' },
        { say: 'キングを取りにいく手が<b>チェック</b>。どう逃げても防げなければ<b>チェックメイト</b>で勝ち！ ルークを光るマスへ動かして、黒のキングを詰ませて！', done: 'やったー、<b>チェックメイト</b>！ キングは自分のポーンにふさがれて逃げられないんだ。' },
        { say: '動ける手がないのにチェックされていない<b>ステイルメイト</b>は<b>引き分け</b>。ほかに「アンパッサン」という特別なポーンの取り方もあるよ（レッスンで覚えよう）。コツは、真ん中を取って駒を早く出し、キングはキャスリングで守ること。さあ、指してみよう！' },
      ],
    },
    en: {
      name: 'Knighton', next: 'Next', back: 'Back', start: 'Let\'s play', again: 'Again', tap: 'Tap a glowing square', nope: 'It can\'t go there!', mate: 'Checkmate!',
      s: [
        { say: 'Hi, I\'m <b>Knighton</b>! Let\'s go through the rules of chess together on this shiny board.' },
        { say: 'The board has <b>64 squares</b> (8×8), set so the near right-hand corner is a <b>light square</b>. Silver is <b>White</b> (you), gold is <b>Black</b>. <b>White moves first</b>, then you take turns.' },
        { say: 'The goal: <b>checkmate the opponent\'s king</b>! The glowing pieces are the two kings. If your king is checkmated, you lose.' },
        { say: 'The <b>rook</b> moves any distance straight along ranks and files — but it can\'t jump over pieces. Tap a glowing square to move the rook!', done: 'Whoosh! It stopped right before your own pawn.' },
        { say: 'The <b>bishop</b> moves any distance diagonally (blue squares). Move onto an enemy piece to <b>capture</b> it. Take Black\'s knight with your bishop!', done: 'Got it! A captured piece leaves the board.' },
        { say: 'The <b>queen</b> moves any distance straight or diagonally — the strongest piece (left). The <b>king</b> steps one square in any direction (right), and may never move into check.' },
        { say: 'My friend the <b>knight</b> jumps in an "L": two squares one way, then one to the side. It\'s the only piece that <b>jumps over others</b>. Make the knight jump!', done: 'Boing! Right over the pawns.' },
        { say: 'A <b>pawn</b> moves one square forward (two on its first move) but <b>captures diagonally</b> forward. Capture Black\'s pawn with yours!', done: 'Chomp, diagonally! Pawns never move backwards.' },
        { say: 'A pawn that reaches the far end is <b>promoted</b> to a queen, rook, bishop or knight. Push the pawn!', done: 'Sparkle! It became a queen — usually the best choice.' },
        { say: '<b>Castling</b>: the king moves two squares sideways and the rook jumps over to its other side. Only if neither has moved, nothing stands between them and the king doesn\'t pass through check. Move the king to the glowing square!', done: 'Clunk! The king is tucked into the corner and the rook comes to the centre.' },
        { say: 'Attacking the king is <b>check</b>. If there\'s no way out, it\'s <b>checkmate</b> and you win! Move the rook to the glowing square to mate Black\'s king!', done: 'Yay, <b>checkmate</b>! The king is boxed in by its own pawns.' },
        { say: 'No legal move but not in check? That\'s <b>stalemate</b> — a <b>draw</b>. There\'s also a special pawn capture, <b>en passant</b> (see the lessons). Tips: take the centre, develop your pieces early and castle your king to safety. Let\'s play!' },
      ],
    },
    zh: {
      name: '奈顿', next: '下一步', back: '返回', start: '开始下棋', again: '再来一次', tap: '点击发光的格子', nope: '那里走不了哦！', mate: '将杀！',
      s: [
        { say: '你好，我是<b>奈顿</b>！一起在这张闪亮的棋盘上看看国际象棋的规则吧。' },
        { say: '棋盘有<b>64格</b>（8×8），放置时右下角是<b>浅色格</b>。银色是<b>白方</b>（你），金色是<b>黑方</b>。<b>白方先走</b>，然后轮流各走一步。' },
        { say: '目标是<b>将杀对方的王</b>！发光的就是双方的王。自己的王被将杀就输了。' },
        { say: '<b>车</b>可以横竖走任意格，但不能越过棋子。点击发光的格子，走一步车吧！', done: '嗖！正好停在自己的兵前面。' },
        { say: '<b>象</b>斜着走任意格（蓝色格）。走到对方棋子所在的格子就能<b>吃掉</b>它。用象吃掉黑方的马吧！', done: '吃掉了！被吃的棋子离开棋盘。' },
        { say: '<b>后</b>横、竖、斜都能走任意格，是最强的棋子（左）。<b>王</b>向任意方向走1格（右），而且不能走到被攻击的格子。' },
        { say: '我的伙伴<b>马</b>走"L"形：先走两格再横一格。它是唯一能<b>越过其他棋子</b>的棋子。让马跳一下吧！', done: '嘣！从兵上面跳过去了。' },
        { say: '<b>兵</b>向前走1格（第一步可走2格），但<b>吃子要斜着向前</b>。用你的兵吃掉黑方的兵！', done: '斜着吃掉！兵不能后退。' },
        { say: '兵走到最底线时可以<b>升变</b>为后、车、象或马。把兵推上去吧！', done: '闪闪发光！变成了后——通常这是最好的选择。' },
        { say: '<b>王车易位</b>：王横向走两格，车跳到王的另一侧。条件是王和车都没动过、中间没有棋子、王不经过被将军的格子。把王走到发光的格子！', done: '咔嚓！王躲进了角落，车来到了中间。' },
        { say: '攻击对方的王叫<b>将军</b>。如果无路可逃就是<b>将杀</b>，你就赢了！把车走到发光的格子，将杀黑王！', done: '太棒了，<b>将杀</b>！黑王被自己的兵挡住了退路。' },
        { say: '没有合法着法但也没被将军，叫<b>逼和</b>，算<b>和棋</b>。兵还有一种特殊吃法叫<b>吃过路兵</b>（在课程里学习）。诀窍：占领中心、尽早出子、易位保护王。开始下棋吧！' },
      ],
    },
    ko: {
      name: '나이톤', next: '다음', back: '이전', start: '두어 보기', again: '다시', tap: '빛나는 칸을 탭하세요', nope: '거기로는 갈 수 없어!', mate: '체크메이트!',
      s: [
        { say: '안녕, 나는 <b>나이톤</b>! 이 반짝이는 판에서 체스 규칙을 함께 알아보자.' },
        { say: '판은 8×8 <b>64칸</b>이고, 오른쪽 아래 구석이 <b>밝은 칸</b>이 되게 놓아. 은색이 <b>백</b>(너), 금색이 <b>흑</b>이야. <b>백이 먼저</b> 두고 한 수씩 번갈아 둬.' },
        { say: '목표는 <b>상대 킹을 체크메이트하는 것</b>! 빛나는 말이 양쪽의 킹이야. 내 킹이 체크메이트되면 져.' },
        { say: '<b>룩</b>은 가로·세로로 몇 칸이든 갈 수 있지만 말을 뛰어넘을 수는 없어. 빛나는 칸을 탭해서 룩을 움직여 봐!', done: '슝! 우리 편 폰 앞에서 딱 멈췄네.' },
        { say: '<b>비숍</b>은 대각선으로 몇 칸이든(파란 칸). 상대 말이 있는 칸으로 가면 그 말을 <b>잡을</b> 수 있어. 비숍으로 흑의 나이트를 잡아 봐!', done: '잡았다! 잡힌 말은 판에서 사라져.' },
        { say: '<b>퀸</b>은 가로·세로·대각선 어디로든 몇 칸이든 가는 가장 강한 말(왼쪽). <b>킹</b>은 모든 방향으로 한 칸(오른쪽)이고, 공격받는 칸으로는 갈 수 없어.' },
        { say: '내 친구 <b>나이트</b>는 "L"자로 뛰어: 두 칸 가고 옆으로 한 칸. <b>다른 말을 뛰어넘는</b> 유일한 말이야. 나이트를 뛰게 해 봐!', done: '폴짝! 폰들을 훌쩍 넘었네.' },
        { say: '<b>폰</b>은 앞으로 한 칸(처음에는 두 칸도 가능), 하지만 <b>잡을 때는 대각선 앞</b>이야. 폰으로 흑의 폰을 잡아 봐!', done: '대각선으로 냠! 폰은 뒤로 못 가.' },
        { say: '폰이 끝까지 가면 퀸·룩·비숍·나이트 중 하나로 <b>승진(프로모션)</b>해. 폰을 밀어 봐!', done: '반짝! 퀸이 됐어. 보통 가장 강한 퀸을 골라.' },
        { say: '<b>캐슬링</b>은 킹이 옆으로 두 칸 가고 룩이 킹 반대편으로 넘어오는 특별한 수야. 둘 다 안 움직였고, 사이에 말이 없고, 킹이 체크를 지나지 않을 때만 돼. 킹을 빛나는 칸으로!', done: '철컥! 킹은 안전한 구석으로, 룩은 가운데로.' },
        { say: '킹을 공격하는 수가 <b>체크</b>. 피할 방법이 없으면 <b>체크메이트</b>로 승리! 룩을 빛나는 칸으로 옮겨 흑 킹을 메이트해 봐!', done: '야호, <b>체크메이트</b>! 킹이 자기 폰에 막혀 도망갈 수 없어.' },
        { say: '둘 수 있는 수가 없는데 체크도 아니면 <b>스테일메이트</b>, <b>무승부</b>야. <b>앙파상</b>이라는 특별한 폰 잡기도 있어(레슨에서 배우자). 요령: 중앙을 차지하고, 말을 빨리 꺼내고, 캐슬링으로 킹을 지켜. 자, 둬 보자!' },
      ],
    },
    es: {
      name: 'Caballón', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tap: 'Toca una casilla brillante', nope: '¡No puede ir ahí!', mate: '¡Jaque mate!',
      s: [
        { say: '¡Hola, soy <b>Caballón</b>! Repasemos juntos las reglas del ajedrez en este tablero reluciente.' },
        { say: 'El tablero tiene <b>64 casillas</b> (8×8), con una <b>casilla clara</b> en la esquina inferior derecha. Plata son las <b>blancas</b> (tú), oro las <b>negras</b>. <b>Empiezan las blancas</b> y se juega por turnos.' },
        { say: 'El objetivo: <b>dar jaque mate al rey rival</b>. Las piezas que brillan son los dos reyes. Si te dan mate, pierdes.' },
        { say: 'La <b>torre</b> se mueve en línea recta las casillas que quiera, pero no salta piezas. ¡Toca una casilla brillante para mover la torre!', done: '¡Zas! Se paró justo antes de tu peón.' },
        { say: 'El <b>alfil</b> se mueve en diagonal (casillas azules). Al llegar a una pieza rival, la <b>captura</b>. ¡Captura el caballo negro con tu alfil!', done: '¡Capturado! La pieza sale del tablero.' },
        { say: 'La <b>dama</b> va en línea recta o diagonal las casillas que quiera: la pieza más fuerte (izquierda). El <b>rey</b> avanza una casilla en cualquier dirección (derecha) y nunca puede ponerse en jaque.' },
        { say: 'Mi amigo el <b>caballo</b> salta en "L": dos casillas y una al lado. Es la única pieza que <b>salta sobre otras</b>. ¡Haz saltar al caballo!', done: '¡Boing! Por encima de los peones.' },
        { say: 'El <b>peón</b> avanza una casilla (dos en su primer movimiento), pero <b>captura en diagonal</b>. ¡Captura el peón negro con el tuyo!', done: '¡Ñam, en diagonal! Los peones nunca retroceden.' },
        { say: 'Un peón que llega al final se <b>corona</b>: se convierte en dama, torre, alfil o caballo. ¡Avanza el peón!', done: '¡Brillo! Ahora es una dama, casi siempre la mejor opción.' },
        { say: 'El <b>enroque</b>: el rey se mueve dos casillas a un lado y la torre salta al otro lado del rey. Solo si ninguno se ha movido, no hay piezas en medio y el rey no pasa por jaque. ¡Lleva el rey a la casilla brillante!', done: '¡Clac! El rey queda a salvo en la esquina y la torre sale al centro.' },
        { say: 'Atacar al rey es dar <b>jaque</b>. Si no tiene escapatoria, es <b>jaque mate</b> y ganas. ¡Mueve la torre a la casilla brillante y da mate al rey negro!', done: '¡Bien, <b>jaque mate</b>! Sus propios peones encierran al rey.' },
        { say: 'Sin jugadas legales y sin estar en jaque: <b>ahogado</b>, es <b>tablas</b>. También existe una captura especial de peón, <b>al paso</b> (en las lecciones). Consejos: domina el centro, desarrolla pronto y enroca. ¡A jugar!' },
      ],
    },
    fr: {
      name: 'Chevalou', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche une case lumineuse', nope: 'Elle ne peut pas aller là !', mate: 'Échec et mat !',
      s: [
        { say: 'Salut, je suis <b>Chevalou</b> ! Découvrons ensemble les règles des échecs sur ce bel échiquier brillant.' },
        { say: 'L\'échiquier a <b>64 cases</b> (8×8), posé avec une <b>case claire</b> dans le coin en bas à droite. L\'argent, ce sont les <b>Blancs</b> (toi), l\'or les <b>Noirs</b>. <b>Les Blancs commencent</b>, puis on joue chacun son tour.' },
        { say: 'Le but : <b>mettre le roi adverse échec et mat</b> ! Les pièces lumineuses sont les deux rois. Si ton roi est mat, tu perds.' },
        { say: 'La <b>tour</b> se déplace en ligne droite d\'autant de cases qu\'elle veut, sans sauter par-dessus les pièces. Touche une case lumineuse pour la déplacer !', done: 'Zoum ! Elle s\'arrête juste devant ton pion.' },
        { say: 'Le <b>fou</b> se déplace en diagonale (cases bleues). En arrivant sur une pièce adverse, il la <b>prend</b>. Prends le cavalier noir avec ton fou !', done: 'Pris ! La pièce capturée quitte l\'échiquier.' },
        { say: 'La <b>dame</b> va tout droit ou en diagonale aussi loin qu\'elle veut : la pièce la plus forte (à gauche). Le <b>roi</b> avance d\'une case dans toutes les directions (à droite) et ne peut jamais se mettre en échec.' },
        { say: 'Mon ami le <b>cavalier</b> saute en « L » : deux cases puis une sur le côté. C\'est la seule pièce qui <b>saute par-dessus les autres</b>. Fais sauter le cavalier !', done: 'Boing ! Par-dessus les pions.' },
        { say: 'Le <b>pion</b> avance d\'une case (deux au premier coup) mais <b>prend en diagonale</b>. Prends le pion noir avec le tien !', done: 'Croc, en diagonale ! Les pions ne reculent jamais.' },
        { say: 'Un pion qui atteint le bout est <b>promu</b> en dame, tour, fou ou cavalier. Avance le pion !', done: 'Scintillement ! Il devient dame — en général le meilleur choix.' },
        { say: 'Le <b>roque</b> : le roi se déplace de deux cases et la tour saute de l\'autre côté du roi. Seulement si aucun des deux n\'a bougé, que rien ne les sépare et que le roi ne traverse pas d\'échec. Mets le roi sur la case lumineuse !', done: 'Clac ! Le roi est à l\'abri dans le coin, la tour arrive au centre.' },
        { say: 'Attaquer le roi, c\'est faire <b>échec</b>. S\'il ne peut pas s\'en sortir, c\'est <b>échec et mat</b> : tu gagnes ! Mets la tour sur la case lumineuse pour mater le roi noir !', done: 'Bravo, <b>échec et mat</b> ! Le roi est enfermé par ses propres pions.' },
        { say: 'Aucun coup légal mais pas en échec : c\'est le <b>pat</b>, une <b>partie nulle</b>. Il existe aussi une prise spéciale du pion, <b>en passant</b> (voir les leçons). Astuces : occupe le centre, développe vite tes pièces et roque. À toi de jouer !' },
      ],
    },
    pt: {
      name: 'Cavalinho', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque numa casa brilhante', nope: 'Não pode ir para lá!', mate: 'Xeque-mate!',
      s: [
        { say: 'Oi, eu sou o <b>Cavalinho</b>! Vamos ver juntos as regras do xadrez neste tabuleiro brilhante.' },
        { say: 'O tabuleiro tem <b>64 casas</b> (8×8), com uma <b>casa clara</b> no canto inferior direito. Prata são as <b>brancas</b> (você), ouro as <b>pretas</b>. <b>As brancas começam</b> e depois cada um joga na sua vez.' },
        { say: 'O objetivo: <b>dar xeque-mate no rei adversário</b>! As peças que brilham são os dois reis. Se o seu rei levar mate, você perde.' },
        { say: 'A <b>torre</b> anda em linha reta quantas casas quiser, mas não pula peças. Toque numa casa brilhante para mover a torre!', done: 'Zum! Parou bem antes do seu peão.' },
        { say: 'O <b>bispo</b> anda na diagonal (casas azuis). Ao chegar numa peça adversária, ele a <b>captura</b>. Capture o cavalo preto com o seu bispo!', done: 'Capturado! A peça sai do tabuleiro.' },
        { say: 'A <b>dama</b> anda em linha reta ou diagonal quantas casas quiser: a peça mais forte (esquerda). O <b>rei</b> anda uma casa em qualquer direção (direita) e nunca pode ficar em xeque.' },
        { say: 'Meu amigo, o <b>cavalo</b>, pula em "L": duas casas e uma para o lado. É a única peça que <b>pula sobre outras</b>. Faça o cavalo pular!', done: 'Boing! Por cima dos peões.' },
        { say: 'O <b>peão</b> anda uma casa para a frente (duas no primeiro lance), mas <b>captura na diagonal</b>. Capture o peão preto com o seu!', done: 'Nhac, na diagonal! Peões nunca voltam.' },
        { say: 'Um peão que chega ao fim é <b>promovido</b> a dama, torre, bispo ou cavalo. Avance o peão!', done: 'Brilho! Virou dama — quase sempre a melhor escolha.' },
        { say: 'O <b>roque</b>: o rei anda duas casas para o lado e a torre pula para o outro lado dele. Só se nenhum dos dois se mexeu, não há peças entre eles e o rei não passa por xeque. Leve o rei à casa brilhante!', done: 'Clac! O rei fica seguro no canto e a torre vai para o centro.' },
        { say: 'Atacar o rei é dar <b>xeque</b>. Se não houver saída, é <b>xeque-mate</b> e você vence! Leve a torre à casa brilhante e dê mate no rei preto!', done: 'Isso, <b>xeque-mate</b>! O rei ficou preso pelos próprios peões.' },
        { say: 'Sem lances legais e sem estar em xeque: <b>afogamento</b>, é <b>empate</b>. Há também uma captura especial de peão, <b>en passant</b> (nas lições). Dicas: domine o centro, desenvolva cedo e faça o roque. Vamos jogar!' },
      ],
    },
    de: {
      name: 'Springolin', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tap: 'Tippe auf ein leuchtendes Feld', nope: 'Dorthin geht es nicht!', mate: 'Schachmatt!',
      s: [
        { say: 'Hallo, ich bin <b>Springolin</b>! Lass uns die Schachregeln zusammen auf diesem glänzenden Brett anschauen.' },
        { say: 'Das Brett hat <b>64 Felder</b> (8×8), unten rechts liegt ein <b>helles Feld</b>. Silber ist <b>Weiß</b> (du), Gold ist <b>Schwarz</b>. <b>Weiß beginnt</b>, dann zieht man abwechselnd.' },
        { say: 'Das Ziel: <b>den gegnerischen König mattsetzen</b>! Die leuchtenden Figuren sind die beiden Könige. Wird dein König matt gesetzt, verlierst du.' },
        { say: 'Der <b>Turm</b> zieht beliebig weit gerade — aber er kann nicht über Figuren springen. Tippe auf ein leuchtendes Feld, um den Turm zu ziehen!', done: 'Zisch! Er hält direkt vor deinem Bauern.' },
        { say: 'Der <b>Läufer</b> zieht beliebig weit diagonal (blaue Felder). Zieht man auf eine gegnerische Figur, wird sie <b>geschlagen</b>. Schlag den schwarzen Springer mit deinem Läufer!', done: 'Geschlagen! Die Figur verlässt das Brett.' },
        { say: 'Die <b>Dame</b> zieht beliebig weit gerade oder diagonal — die stärkste Figur (links). Der <b>König</b> zieht ein Feld in jede Richtung (rechts) und darf nie ins Schach ziehen.' },
        { say: 'Mein Freund, der <b>Springer</b>, springt im „L“: zwei Felder, dann eins zur Seite. Er ist die einzige Figur, die <b>über andere springt</b>. Lass ihn springen!', done: 'Hopp! Glatt über die Bauern.' },
        { say: 'Der <b>Bauer</b> zieht ein Feld vorwärts (beim ersten Zug auch zwei), <b>schlägt aber schräg</b> nach vorn. Schlag den schwarzen Bauern mit deinem!', done: 'Happs, schräg! Bauern ziehen nie zurück.' },
        { say: 'Ein Bauer, der die letzte Reihe erreicht, wird <b>umgewandelt</b> — in Dame, Turm, Läufer oder Springer. Schieb den Bauern vor!', done: 'Funkel! Er ist jetzt eine Dame — meist die beste Wahl.' },
        { say: '<b>Rochade</b>: Der König zieht zwei Felder zur Seite und der Turm springt auf seine andere Seite. Nur wenn beide noch nicht gezogen haben, nichts dazwischen steht und der König kein Schachfeld überquert. Zieh den König aufs leuchtende Feld!', done: 'Klack! Der König sitzt sicher in der Ecke, der Turm kommt in die Mitte.' },
        { say: 'Ein Angriff auf den König ist <b>Schach</b>. Gibt es keinen Ausweg, ist es <b>Schachmatt</b> — du gewinnst! Zieh den Turm aufs leuchtende Feld und setz den schwarzen König matt!', done: 'Juhu, <b>Schachmatt</b>! Der König ist von seinen eigenen Bauern eingesperrt.' },
        { say: 'Kein legaler Zug, aber kein Schach? Das ist <b>Patt</b> — <b>remis</b>. Es gibt auch einen besonderen Bauernschlag, <b>en passant</b> (in den Lektionen). Tipps: Zentrum besetzen, Figuren früh entwickeln, rochieren. Los geht\'s!' },
      ],
    },
    hi: {
      name: 'नाइटन', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकते खाने पर टैप करें', nope: 'वहाँ नहीं जा सकता!', mate: 'शह और मात!',
      s: [
        { say: 'नमस्ते, मैं <b>नाइटन</b> हूँ! आओ इस चमकीले बोर्ड पर मिलकर शतरंज के नियम देखें।' },
        { say: 'बोर्ड में <b>64 खाने</b> (8×8) हैं; नीचे दाएँ कोने में <b>हल्का खाना</b> होना चाहिए। चाँदी वाले <b>सफ़ेद</b> (आप) हैं, सुनहरे <b>काले</b>। <b>सफ़ेद पहले चलता है</b>, फिर बारी-बारी से।' },
        { say: 'लक्ष्य: <b>विरोधी राजा को शह-मात देना</b>! चमकते मोहरे दोनों राजा हैं। आपके राजा को मात हुई तो आप हारेंगे।' },
        { say: '<b>हाथी</b> सीधी रेखा में कितने भी खाने चलता है, पर मोहरों के ऊपर से नहीं कूद सकता। चमकते खाने पर टैप करके हाथी चलाइए!', done: 'सर्र! अपने प्यादे के ठीक पहले रुक गया।' },
        { say: '<b>ऊँट</b> तिरछा कितने भी खाने चलता है (नीले खाने)। विरोधी मोहरे के खाने पर जाकर उसे <b>मार</b> सकते हैं। ऊँट से काले घोड़े को मारिए!', done: 'मार दिया! मारा गया मोहरा बोर्ड से हट जाता है।' },
        { say: '<b>वज़ीर</b> सीधा या तिरछा कितने भी खाने चलता है — सबसे ताक़तवर मोहरा (बाएँ)। <b>राजा</b> किसी भी दिशा में एक खाना चलता है (दाएँ) और कभी शह वाले खाने में नहीं जा सकता।' },
        { say: 'मेरा दोस्त <b>घोड़ा</b> "L" आकार में कूदता है: दो खाने, फिर एक बगल में। वही अकेला मोहरा है जो <b>दूसरों के ऊपर से कूदता</b> है। घोड़े को कुदाइए!', done: 'उछल! प्यादों के ऊपर से निकल गया।' },
        { say: '<b>प्यादा</b> एक खाना आगे चलता है (पहली चाल में दो भी), पर <b>मारता तिरछा</b> आगे है। अपने प्यादे से काले प्यादे को मारिए!', done: 'तिरछा वार! प्यादे कभी पीछे नहीं जाते।' },
        { say: 'आख़िरी पंक्ति पर पहुँचा प्यादा वज़ीर, हाथी, ऊँट या घोड़ा <b>बन जाता है (प्रमोशन)</b>। प्यादा आगे बढ़ाइए!', done: 'चमक! वज़ीर बन गया — आमतौर पर यही सबसे अच्छा है।' },
        { say: '<b>कैसलिंग</b>: राजा बगल में दो खाने चलता है और हाथी उसकी दूसरी तरफ़ आ जाता है। तभी, जब दोनों न चले हों, बीच में कोई मोहरा न हो और राजा शह से न गुज़रे। राजा को चमकते खाने पर ले जाइए!', done: 'खट! राजा कोने में सुरक्षित, हाथी बीच में आ गया।' },
        { say: 'राजा पर हमला <b>शह</b> है। बचने का रास्ता न हो तो <b>शह-मात</b> और आप जीते! हाथी को चमकते खाने पर ले जाकर काले राजा को मात दीजिए!', done: 'वाह, <b>शह-मात</b>! राजा अपने ही प्यादों में फँस गया।' },
        { say: 'कोई वैध चाल नहीं पर शह भी नहीं — यह <b>स्टेलमेट</b> है, यानी <b>ड्रॉ</b>। प्यादे का एक ख़ास वार <b>आँ पासाँ</b> भी है (पाठों में सीखें)। सुझाव: केंद्र लें, मोहरे जल्दी निकालें और कैसलिंग करें। चलिए खेलें!' },
      ],
    },
    ar: {
      name: 'فارسون', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'اضغط مربعًا مضيئًا', nope: 'لا يمكنها الذهاب إلى هناك!', mate: 'كش مات!',
      s: [
        { say: 'مرحبًا، أنا <b>فارسون</b>! لنتعرّف معًا على قواعد الشطرنج على هذه الرقعة اللامعة.' },
        { say: 'الرقعة فيها <b>64 مربعًا</b> (8×8)، ويكون المربع في الزاوية اليمنى القريبة <b>فاتحًا</b>. الفضي هو <b>الأبيض</b> (أنت) والذهبي هو <b>الأسود</b>. <b>الأبيض يبدأ</b> ثم يتناوب اللاعبان.' },
        { say: 'الهدف: <b>إماتة ملك الخصم (كش مات)</b>! القطعتان المضيئتان هما الملكان. إذا أُميت ملكك تخسر.' },
        { say: '<b>الرخ</b> يتحرك أفقيًا أو رأسيًا أي عدد من المربعات، لكنه لا يقفز فوق القطع. اضغط مربعًا مضيئًا لتحريك الرخ!', done: 'ووش! توقف أمام بيدقك تمامًا.' },
        { say: '<b>الفيل</b> يتحرك قطريًا أي عدد من المربعات (المربعات الزرقاء). إذا وصل إلى قطعة للخصم <b>أسرها</b>. اأسر الحصان الأسود بالفيل!', done: 'أسرته! القطعة المأسورة تغادر الرقعة.' },
        { say: '<b>الوزير</b> يتحرك مستقيمًا أو قطريًا أي مسافة — أقوى قطعة (يسارًا). <b>الملك</b> يتحرك مربعًا واحدًا في أي اتجاه (يمينًا) ولا يجوز أن يدخل في كش أبدًا.' },
        { say: 'صديقي <b>الحصان</b> يقفز على شكل حرف L: مربعان ثم واحد جانبًا. إنه القطعة الوحيدة التي <b>تقفز فوق غيرها</b>. اجعل الحصان يقفز!', done: 'هوب! فوق البيادق مباشرة.' },
        { say: '<b>البيدق</b> يتقدم مربعًا واحدًا (أو مربعين في أول نقلة)، لكنه <b>يأسر قطريًا</b> للأمام. اأسر البيدق الأسود ببيدقك!', done: 'قضمة قطرية! البيادق لا تعود للخلف أبدًا.' },
        { say: 'البيدق الذي يصل إلى الصف الأخير <b>يترقّى</b> إلى وزير أو رخ أو فيل أو حصان. ادفع البيدق!', done: 'لمعة! صار وزيرًا — وهو غالبًا الخيار الأفضل.' },
        { say: '<b>التبييت</b>: يتحرك الملك مربعين جانبًا ويقفز الرخ إلى جهته الأخرى. يجوز فقط إن لم يتحرك أيٌّ منهما، ولا قطع بينهما، ولا يمر الملك بمربع مهدَّد. حرّك الملك إلى المربع المضيء!', done: 'طق! صار الملك آمنًا في الزاوية وخرج الرخ إلى الوسط.' },
        { say: 'مهاجمة الملك تُسمّى <b>كش</b>. إن لم يجد مخرجًا فهو <b>كش مات</b> وتفوز! حرّك الرخ إلى المربع المضيء لتُميت الملك الأسود!', done: 'رائع، <b>كش مات</b>! بيادق الملك نفسها تحبسه.' },
        { say: 'لا نقلة قانونية ولا كش؟ هذا <b>تعادل بالجمود</b>. وهناك أيضًا أسر خاص للبيدق اسمه <b>الأخذ بالمرور</b> (في الدروس). نصائح: سيطر على الوسط، وأخرج قطعك مبكرًا، وبيّت ملكك. هيا نلعب!' },
      ],
    },
  };

  /* board, marks and interactivity of each step.
     pos: [type, square, color]   glow: pulsing tiles (+ the pieces there bob)   blue: static blue tiles   gold: soft gold tiles
     sel: the piece that moves   act: { to: [squares], kind: slide|hop, capture, promote, castle, mate } */
  const STEPS = [
    { pos: INIT },
    { pos: INIT, glow: ['h1'] },
    { pos: INIT, glow: ['e1', 'e8'] },
    { pos: [['R', 'd4', 'w'], ['P', 'd7', 'w'], ['P', 'b4', 'w'], ['K', 'g1', 'w'], ['K', 'g8', 'b']], sel: 'd4', act: { to: rays('d4', ORTHO, ['d7', 'b4']), kind: 'slide' } },
    { pos: [['B', 'c1', 'w'], ['N', 'g5', 'b'], ['P', 'b2', 'w'], ['K', 'e1', 'w'], ['K', 'e8', 'b']], sel: 'c1', blue: rays('c1', DIAG, ['b2', 'g5']), act: { to: ['g5'], kind: 'slide', capture: true } },
    { pos: [['Q', 'b3', 'w'], ['K', 'g5', 'w'], ['K', 'h8', 'b']], glow: rays('b3', [...ORTHO, ...DIAG], []), gold: near('g5', [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]]) },
    { pos: [['N', 'g1', 'w'], ['P', 'f2', 'w'], ['P', 'g2', 'w'], ['P', 'h2', 'w'], ['P', 'e2', 'w'], ['K', 'e1', 'w'], ['K', 'e8', 'b']], sel: 'g1', act: { to: ['f3', 'h3'], kind: 'hop' } },
    { pos: [['P', 'e4', 'w'], ['P', 'd5', 'b'], ['P', 'e5', 'b'], ['K', 'e1', 'w'], ['K', 'e8', 'b']], sel: 'e4', act: { to: ['d5'], kind: 'slide', capture: true } },
    { pos: [['P', 'b7', 'w'], ['K', 'e1', 'w'], ['K', 'g7', 'b']], sel: 'b7', act: { to: ['b8'], kind: 'slide', promote: 'Q' } },
    { pos: [['K', 'e1', 'w'], ['R', 'h1', 'w'], ['P', 'f2', 'w'], ['P', 'g2', 'w'], ['P', 'h2', 'w'], ['K', 'e8', 'b']], sel: 'e1', act: { to: ['g1'], kind: 'slide', castle: ['h1', 'f1'] } },
    { pos: [['R', 'a1', 'w'], ['K', 'g1', 'w'], ['K', 'g8', 'b'], ['P', 'f7', 'b'], ['P', 'g7', 'b'], ['P', 'h7', 'b'], ['P', 'f2', 'w'], ['P', 'g2', 'w'], ['P', 'h2', 'w']], sel: 'a1', act: { to: ['a8'], kind: 'slide', mate: ['f8', 'h8'] } },
    { pos: INIT, last: true },
  ];

  /* ---------- little sounds: a felted piece on lacquer, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1) {   // a weighted, felted piece set down: a soft low thock + a little click
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 * pitch; bp.Q.value = 1.2;
      const g = C.createGain(); g.gain.setValueAtTime(.35 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(210 * pitch, t); o.frequency.exponentialRampToValueAtTime(95 * pitch, t + .09);
      og.gain.setValueAtTime(.4 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .13); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .15);
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
    return { tok, blip, chime, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, CS = T3.chess, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.chess(true); T3.show('chess', board); T3.play(true);
    const Y = board.userData.top;
    if (T3.fit) T3.fit({ w: CS.OW + .2, d: CS.OW + .7, y: Y + .35, pitch: 1.0 });   // the whole board, large, seen from the player's side (pieces stand up)
    const marks = new TH.Group(); board.add(marks);
    let pcs = {}, step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const xz = n => CS.cell(...at(n));

    function mk(t, col) { const g = CS.piece(t, col, { reflect: true }); if (t === 'N') g.rotation.y = col === 'w' ? Math.PI / 2 - .5 : -Math.PI / 2 + .5; const sh = T3.contact(.34, .5); sh.position.y = .002; g.add(sh); return g; }
    function clearPieces() { Object.values(pcs).forEach(g => board.remove(g)); pcs = {}; }
    function fall(g, delay, h = 1.4) { g.visible = false; later(() => { g.visible = true; anim(260, k => { g.position.y = Y + (1 - k) * (1 - k) * h; }); }, delay); }
    function setBoard(st) {
      clearPieces(); let i = 0;
      st.pos.forEach(([t, n, col]) => { const g = mk(t, col), [x, z] = xz(n); g.position.set(x, Y, z); board.add(g); pcs[n] = g; fall(g, 40 + (i++) * 16); });
      return i;
    }
    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); Object.values(pcs).forEach(p => { p.userData.bob = false; }); }
    function tile(n, color, op = .5, pulse = false) {
      const m = new TH.Mesh(new TH.BoxGeometry(.92, .02, .92), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      const [x, z] = xz(n); m.position.set(x, Y + .012, z); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function ring(n) { const m = new TH.Mesh(new TH.CylinderGeometry(.18, .18, .02, 28), new TH.MeshBasicMaterial({ color: 0x2fd17a, transparent: true, opacity: .85, toneMapped: false })); const [x, z] = xz(n); m.position.set(x, Y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    function cross(n) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(.62, .03, .09), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = xz(n); g.position.set(x, Y + .05, z); marks.add(g); return g; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.geometry.type === 'CylinderGeometry') m.scale.set(.85 + k * .3, 1, .85 + k * .3); m.material.opacity = .4 + k * .5; } }); Object.values(pcs).forEach(p => { if (p.userData.bob) { any = true; p.position.y = Y + .06 + .22 * k; } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- moves ---------- */
    function moveTo(g, n, kind, done) {
      const x0 = g.position.x, y0 = g.position.y, z0 = g.position.z, [x1, z1] = xz(n), d = Math.hypot(x1 - x0, z1 - z0);
      const hop = kind === 'hop', dur = hop ? 560 : 240 + d * 60;
      anim(dur, k => { const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; g.position.y = (hop ? Y + Math.sin(k * Math.PI) * 1.6 : Y + Math.sin(k * Math.PI) * .3) + (y0 - Y) * (1 - e); },
        () => { g.position.y = Y; SFX.tok(1, 1); land(g); if (done) done(); });
    }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .06; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function capture(g, done) {   // the taken piece hops off the board and shrinks away
      const x0 = g.position.x, z0 = g.position.z, x1 = x0 + (x0 > 0 ? 1 : -1) * 1.2, z1 = z0 - .4;
      anim(520, k => { g.position.x = x0 + (x1 - x0) * k; g.position.z = z0 + (z1 - z0) * k; g.position.y = Y + Math.sin(k * Math.PI) * 1.4; g.scale.setScalar(Math.max(.01, 1 - k * k)); g.rotation.z = k * 1.2; }, () => { board.remove(g); if (done) done(); });
    }
    function promote(g, t, done) {   // spin up, swap into a queen, land
      let swapped = false;
      anim(700, k => { g.position.y = Y + Math.sin(k * Math.PI) * 1.2; g.rotation.y = k * Math.PI * 2; if (k >= .5 && !swapped) { swapped = true; const q = mk(t, g.userData.color); while (g.children.length) g.remove(g.children[0]); q.children.slice().forEach(c => g.add(c)); g.userData.type = t; } },
        () => { g.rotation.y = 0; g.position.y = Y; SFX.tok(.9, 1.2); land(g); if (done) done(); });
    }
    function shake(g, done) { const r0 = g.rotation.z; anim(700, k => { g.rotation.z = r0 + Math.sin(k * Math.PI * 7) * .14 * (1 - k); }, () => { g.rotation.z = r0; if (done) done(); }); }

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
        (st.blue || []).forEach(q => tile(q, 0x1f6fe8, .45));
        (st.gold || []).forEach(q => tile(q, 0xffb020, .55, true));
        (st.glow || []).forEach(q => { const p = pcs[q]; if (p) p.userData.bob = true; tile(q, p ? 0xffc928 : 0xe0501e, .5, true); });
        if (st.sel) { tile(st.sel, 0x2fd17a, .6, true); const sp = pcs[st.sel]; anim(240, k => { sp.position.y = Y + .2 * io(k); }); }
        if (st.act) st.act.to.forEach(q => { if (pcs[q]) tile(q, 0xd8321c, .55, true); else ring(q); });
      }, 420 + cnt * 16);
      say(L.s[step].say); buttons();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      const f = Math.floor(p.x + 4), r = Math.floor(p.z + 4);
      return f < 0 || f > 7 || r < 0 || r > 7 ? null : 'abcdefgh'[f] + (8 - r);
    }
    function finish(extra) { busy = false; if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step], q = cellOf(e); if (!q || !st.act || played) return;
      if (!st.act.to.includes(q)) { if (q !== st.sel) say(L.nope); return; }
      busy = true; played = true; clearMarks();
      const g = pcs[st.sel], victim = pcs[q], stepNow = step;
      delete pcs[st.sel]; pcs[q] = g;
      const after = () => {
        if (step !== stepNow) return;
        if (st.act.promote) { later(() => promote(g, st.act.promote, () => later(() => finish(), 250)), 120); return; }
        if (st.act.castle) { const [a, b] = st.act.castle, r = pcs[a]; delete pcs[a]; pcs[b] = r; later(() => moveTo(r, b, 'hop', () => later(() => finish(), 250)), 80); return; }
        if (st.act.mate) {
          const king = Object.entries(pcs).find(([, p]) => p.userData.type === 'K' && p.userData.color === 'b');
          if (king) tile(king[0], 0xff3030, .6, true);
          shake(king[1], () => { SFX.chime(); finish(() => { st.act.mate.forEach(cross); $('.cnt').innerHTML = `<span class="tag">${L.mate}</span>`; }); });
          return;
        }
        later(() => finish(), 250);
      };
      if (victim) { moveTo(g, q, st.act.kind, () => {}); later(() => capture(victim, after), 180); return; }
      moveTo(g, q, st.act.kind, after);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => go(step - 1);
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // keyboard: Space / Enter / → next, ← back (an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();   // must not re-press a focused button (e.g. the Rules button → restart)
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    later(() => go(0), 350);
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); },
      panel: el,
      _debug: { sq: n => { const [x, z] = xz(n); return [x, z, Y]; }, step: () => step },
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.chess = { start };
})();
