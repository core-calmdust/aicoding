/* =====================================================================
   Go rules — a guided tour on the 3D go board (9 × 9), told by the guide
   character (Stoneguin, the go-stone penguin, as in gomoku). Hands-on and gentle:
   stones go on the points, liberties and atari, capturing, connected stones
   share liberties, no suicide, ko, two eyes = alive, passing and counting
   (territory, komi), and who wins.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart() }
   Points are written 'xy' (x = column 0–8 from the left, y = row 0–8 from the top).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-stone.webp', N = 9;
  const ix = s => +s[1] * N + +s[0];
  const TXT = {
 "ja": {
  "name": "ゴイシペン",
  "next": "つぎへ",
  "back": "もどる",
  "start": "対局してみる",
  "again": "もういちど",
  "tap": "光っている点をタップ",
  "nope": "そこじゃないよ〜。光っている点をタップしてね",
  "atari": "アタリ！",
  "cap": "取った！",
  "ko": "コウ",
  "alive": "生き！",
  "forb": "着手禁止点",
  "b": "黒",
  "w": "白",
  "komi": "コミ",
  "s": [
   {
    "say": "ペン！ ぼくは<b>ゴイシペン</b>。きょうは<b>囲碁</b>のルールを教えるね。小さな9路の碁盤で、ひとつずつやってみよう！"
   },
   {
    "say": "石は線が<b>交わる点</b>に置くよ。<b>黒が先</b>で、白と1手ずつ交互に打つんだ。光っている真ん中の点に黒石を置いてみて！",
    "done": "パチッ！ 置いた石は動かさないよ。でも囲碁では、石が<b>取られる</b>ことがあるんだ。"
   },
   {
    "say": "石の上下左右のとなりの空いた点を<b>呼吸点</b>（ダメ）っていうよ。真ん中の白石の呼吸点は緑の2つ。光っている点に黒を置いて、1つふさごう！",
    "done": "白の呼吸点は残り<b>1つ</b>。次の1手で取られる状態を<b>アタリ</b>っていうよ。"
   },
   {
    "say": "白はアタリ！ 最後の呼吸点（光っている点）に黒を置いて、白石を<b>取って</b>みよう！",
    "done": "取れた！ 呼吸点がなくなった石は盤から取りのぞかれて、取った人の<b>アゲハマ</b>になるよ。"
   },
   {
    "say": "たて・よこに<b>つながった石</b>は、呼吸点をみんなで<b>共有</b>するよ。白の2つの石の呼吸点は、光っている1点だけ。まとめて取ろう！",
    "done": "2つまとめて取れた！ ななめはつながっていないから気をつけてね。"
   },
   {
    "say": "×の点は白に囲まれているね。ここに黒を置くと、置いたとたんに呼吸点が0になっちゃう。タップしてみて！",
    "done": "ブッブー！ 自分から取られる手（<b>自殺手</b>）は打てないよ。でも、それで相手の石が取れるときは打てるんだ。"
   },
   {
    "say": "光っている点に黒を打つと、白石を1つ取れるよ。打ってみて！",
    "done": "取った！ でも白は、すぐに×の点で取り返せない。取り合いが続くこの形を<b>コウ</b>といって、一度ほかに打ってからでないと取り返せないんだ。"
   },
   {
    "say": "石に囲まれた中の空き点を<b>目</b>っていうよ。光っている点に打って、黒の陣地を2つに分けてみて！",
    "done": "<b>目が2つ</b>できた！ 白はどちらの目にも打てないから、この黒はもう絶対に取られない。これを<b>生き</b>っていうよ。"
   },
   {
    "say": "打つところがなくなったら<b>パス</b>。2人続けてパスしたら<b>終局</b>だよ。自分の石で囲んだ空き点が<b>地</b>（陣地）。黒の地は35目、白は28目。後から打つ白は<b>コミ</b>6目半をもらえるよ。"
   },
   {
    "say": "<b>地＋アゲハマ</b>（取った石）の多いほうが<b>勝ち</b>！ いまのは黒35目、白は 28＋6.5＝34.5 で、黒の<b>半目勝ち</b>。コミがあるから、ほんの少しの差で勝ち負けが決まるんだ。取られない形を作りながら、広く囲もう。さあ、対局してみよう！"
   }
  ]
 },
 "en": {
  "name": "Stoneguin",
  "next": "Next",
  "back": "Back",
  "start": "Let's play",
  "again": "Again",
  "tap": "Tap the glowing point",
  "nope": "Not there! Tap the glowing point",
  "atari": "Atari!",
  "cap": "Captured!",
  "ko": "Ko",
  "alive": "Alive!",
  "forb": "Illegal (suicide)",
  "b": "Black",
  "w": "White",
  "komi": "komi",
  "s": [
   {
    "say": "Hi! I'm <b>Stoneguin</b>. Today let's learn the rules of <b>Go</b>, one step at a time, on a small 9×9 board!"
   },
   {
    "say": "Stones go on the <b>points where the lines cross</b>. <b>Black plays first</b>, then Black and White take turns. Tap the glowing centre point to place a black stone!",
    "done": "Click! Stones never move once placed — but in Go, stones can be <b>captured</b>."
   },
   {
    "say": "The empty points right next to a stone (up, down, left, right) are its <b>liberties</b>. The white stone in the middle has two (green). Tap the glowing point to fill one!",
    "done": "White has only <b>one</b> liberty left. A stone that can be captured on the next move is in <b>atari</b>."
   },
   {
    "say": "White is in atari! Play Black on its last liberty (the glowing point) and <b>capture</b> it!",
    "done": "Captured! Stones without liberties are taken off the board and become your <b>prisoners</b>."
   },
   {
    "say": "Stones <b>connected</b> up, down, left or right <b>share</b> their liberties. These two white stones have just one: the glowing point. Capture them both!",
    "done": "Two at once! Stones touching only diagonally are not connected — watch out."
   },
   {
    "say": "The × point is surrounded by White. A black stone there would have no liberties at all. Tap it!",
    "done": "Bzzt! You can't play a move that leaves your own stone without liberties (<b>suicide</b>) — unless it captures enemy stones."
   },
   {
    "say": "If Black plays the glowing point, it captures one white stone. Try it!",
    "done": "Captured! But White may not retake at × right away. This back-and-forth is called <b>ko</b>: White must play elsewhere first."
   },
   {
    "say": "Empty points enclosed by your stones are called <b>eyes</b>. Tap the glowing point to split Black's space in two!",
    "done": "<b>Two eyes!</b> White can never fill both, so this black group can never be captured. It is <b>alive</b>."
   },
   {
    "say": "When there's nothing useful left to play, you <b>pass</b>. Two passes in a row <b>end the game</b>. The empty points you surround are your <b>territory</b>: Black 35, White 28. White moved second, so White gets <b>komi</b>: 6.5 points."
   },
   {
    "say": "The bigger total of <b>territory + prisoners</b> <b>wins</b>! Here Black has 35 and White 28 + 6.5 = 34.5, so Black wins by <b>half a point</b>. Thanks to komi, games are often that close. Make shapes that can't be captured and surround plenty. Let's play!"
   }
  ]
 },
 "zh": {
  "name": "棋石企鹅",
  "next": "下一步",
  "back": "返回",
  "start": "来下一局",
  "again": "再来一次",
  "tap": "点击发光的点",
  "nope": "不是那里哦～请点击发光的点",
  "atari": "叫吃！",
  "cap": "提子！",
  "ko": "打劫",
  "alive": "活棋！",
  "forb": "禁着点",
  "b": "黑",
  "w": "白",
  "komi": "贴目",
  "s": [
   {
    "say": "你好！我是<b>棋石企鹅</b>。今天在小小的9路棋盘上，一步一步来学<b>围棋</b>的规则吧！"
   },
   {
    "say": "棋子下在线的<b>交叉点</b>上。<b>黑棋先下</b>，之后黑白轮流各下一手。点击中央发光的点，放下黑子吧！",
    "done": "啪！棋子下了就不再移动。不过在围棋里，棋子可能会被<b>提掉</b>。"
   },
   {
    "say": "棋子上下左右相邻的空点叫作<b>气</b>。中间这颗白子有2口气（绿色）。点击发光的点，堵住其中一口！",
    "done": "白棋只剩<b>1口气</b>了。下一手就会被提掉的状态叫作<b>叫吃</b>。"
   },
   {
    "say": "白棋被叫吃了！在它最后一口气（发光的点）下黑子，把白子<b>提掉</b>吧！",
    "done": "提掉了！没有气的棋子要从棋盘上拿走，成为你的<b>提子</b>。"
   },
   {
    "say": "上下左右<b>相连的棋子</b>会<b>共用</b>它们的气。这两颗白子只剩发光的1口气，一起提掉吧！",
    "done": "一次提两颗！只是斜着相邻的棋子不算相连，要注意哦。"
   },
   {
    "say": "×的点被白棋围住了。黑棋下在那里，一下子就没有气了。点一下试试！",
    "done": "不行哦！让自己的棋子没有气的<b>自杀</b>手是禁止的——除非这手能提掉对方的子。"
   },
   {
    "say": "黑棋下在发光的点，就能提掉一颗白子。下下看！",
    "done": "提掉了！但白棋不能马上在×处提回来。这种来回互提的形状叫<b>打劫</b>，白棋要先在别处下一手才能提回。"
   },
   {
    "say": "被自己棋子围住的空点叫作<b>眼</b>。点击发光的点，把黑棋的空间分成两块！",
    "done": "<b>两只眼</b>做成了！白棋不可能同时填满两只眼，所以这块黑棋永远不会被提掉，这叫<b>活棋</b>。"
   },
   {
    "say": "没有有用的地方可下时就<b>停一手</b>。双方连续停一手，<b>对局结束</b>。自己的棋子围住的空点就是<b>地</b>：黑35目，白28目。后下的白棋能得到<b>贴目</b>6目半。"
   },
   {
    "say": "<b>地＋提子</b>多的一方<b>获胜</b>！这里黑棋35目，白棋 28＋6.5＝34.5，黑棋<b>胜半目</b>。因为有贴目，胜负常常只差一点点。一边做出不会被提的形，一边多围地吧。来下一局！"
   }
  ]
 },
 "ko": {
  "name": "바둑돌펭",
  "next": "다음",
  "back": "이전",
  "start": "대국해 보기",
  "again": "다시 하기",
  "tap": "빛나는 점을 탭",
  "nope": "거기가 아니야~ 빛나는 점을 탭해 줘",
  "atari": "단수!",
  "cap": "따냈다!",
  "ko": "패",
  "alive": "삶!",
  "forb": "착수 금지",
  "b": "흑",
  "w": "백",
  "komi": "덤",
  "s": [
   {
    "say": "안녕! 나는 <b>바둑돌펭</b>이야. 오늘은 작은 9줄 바둑판에서 <b>바둑</b> 규칙을 하나씩 배워 보자!"
   },
   {
    "say": "돌은 선이 <b>만나는 점</b>에 놓아. <b>흑이 먼저</b> 두고, 흑과 백이 한 수씩 번갈아 둬. 가운데 빛나는 점에 흑돌을 놓아 봐!",
    "done": "딱! 놓은 돌은 움직이지 않아. 하지만 바둑에서는 돌이 <b>잡힐</b> 수 있어."
   },
   {
    "say": "돌의 상하좌우에 붙은 빈 점을 <b>활로</b>라고 해. 가운데 백돌의 활로는 초록색 2개. 빛나는 점에 흑을 놓아 하나를 막자!",
    "done": "백의 활로는 이제 <b>1개</b>. 다음 수에 잡히는 상태를 <b>단수</b>라고 해."
   },
   {
    "say": "백이 단수야! 마지막 활로(빛나는 점)에 흑을 놓아 백돌을 <b>잡아</b> 보자!",
    "done": "잡았다! 활로가 없어진 돌은 판에서 들어내고, 잡은 사람의 <b>사석</b>이 돼."
   },
   {
    "say": "상하좌우로 <b>이어진 돌</b>은 활로를 <b>함께 써</b>. 백 두 돌의 활로는 빛나는 1개뿐. 한꺼번에 잡자!",
    "done": "두 개를 한 번에! 대각선으로만 닿은 돌은 이어진 게 아니니까 조심해."
   },
   {
    "say": "×는 백에게 둘러싸인 점이야. 흑을 두면 두자마자 활로가 0이 돼. 탭해 봐!",
    "done": "삐빅! 내 돌의 활로를 없애는 <b>자충수</b>(자살수)는 둘 수 없어. 단, 그 수로 상대 돌을 잡을 수 있다면 둘 수 있어."
   },
   {
    "say": "흑이 빛나는 점에 두면 백돌 하나를 잡을 수 있어. 둬 봐!",
    "done": "잡았다! 하지만 백은 바로 ×에서 되따낼 수 없어. 서로 계속 따내는 이 모양을 <b>패</b>라고 하고, 다른 곳에 한 번 둔 뒤에야 되따낼 수 있어."
   },
   {
    "say": "내 돌로 둘러싼 빈 점을 <b>눈</b>이라고 해. 빛나는 점에 둬서 흑의 공간을 둘로 나눠 봐!",
    "done": "<b>눈이 두 개</b>! 백은 두 눈을 모두 메울 수 없으니 이 흑은 절대 잡히지 않아. 이걸 <b>삶</b>이라고 해."
   },
   {
    "say": "더 둘 곳이 없으면 <b>패스</b>. 두 사람이 연달아 패스하면 <b>대국 종료</b>야. 내 돌로 둘러싼 빈 점이 <b>집</b>이야. 흑 35집, 백 28집. 나중에 두는 백은 <b>덤</b> 6집 반을 받아."
   },
   {
    "say": "<b>집＋사석</b>이 많은 쪽이 <b>승리</b>! 여기서는 흑 35집, 백 28＋6.5＝34.5라서 흑의 <b>반집승</b>. 덤이 있어서 아주 작은 차이로 승부가 갈리기도 해. 잡히지 않는 모양을 만들면서 넓게 둘러싸자. 자, 대국해 보자!"
   }
  ]
 },
 "es": {
  "name": "Pingüipiedra",
  "next": "Siguiente",
  "back": "Atrás",
  "start": "A jugar",
  "again": "Otra vez",
  "tap": "Toca el punto que brilla",
  "nope": "¡Ahí no! Toca el punto que brilla",
  "atari": "¡Atari!",
  "cap": "¡Capturada!",
  "ko": "Ko",
  "alive": "¡Vivo!",
  "forb": "Prohibido (suicidio)",
  "b": "Negras",
  "w": "Blancas",
  "komi": "komi",
  "s": [
   {
    "say": "¡Hola! Soy <b>Pingüipiedra</b>. Hoy aprendemos las reglas del <b>go</b> paso a paso, en un pequeño tablero de 9×9."
   },
   {
    "say": "Las piedras van en los <b>puntos donde se cruzan las líneas</b>. <b>Empiezan las negras</b> y luego se juega por turnos. ¡Toca el punto central que brilla para poner una piedra negra!",
    "done": "¡Clac! Las piedras no se mueven, pero en el go sí se pueden <b>capturar</b>."
   },
   {
    "say": "Los puntos libres justo al lado de una piedra (arriba, abajo, izquierda, derecha) son sus <b>libertades</b>. La piedra blanca del centro tiene dos (en verde). ¡Toca el punto que brilla para tapar una!",
    "done": "A la blanca le queda <b>una</b> libertad. Una piedra que se puede capturar en la siguiente jugada está en <b>atari</b>."
   },
   {
    "say": "¡La blanca está en atari! Juega en su última libertad (el punto que brilla) y <b>captúrala</b>.",
    "done": "¡Capturada! Las piedras sin libertades salen del tablero y pasan a ser tus <b>prisioneros</b>."
   },
   {
    "say": "Las piedras <b>conectadas</b> en vertical u horizontal <b>comparten</b> sus libertades. Estas dos blancas solo tienen una: el punto que brilla. ¡Captura las dos!",
    "done": "¡Dos de golpe! Las piedras que solo se tocan en diagonal no están conectadas, ojo."
   },
   {
    "say": "El punto × está rodeado por las blancas. Una negra ahí no tendría ninguna libertad. ¡Tócalo!",
    "done": "¡Bzzz! No puedes hacer una jugada que deje a tu propia piedra sin libertades (<b>suicidio</b>), salvo que capture piedras rivales."
   },
   {
    "say": "Si las negras juegan en el punto que brilla, capturan una piedra blanca. ¡Pruébalo!",
    "done": "¡Capturada! Pero las blancas no pueden recapturar en × enseguida. Este ir y venir se llama <b>ko</b>: antes hay que jugar en otro sitio."
   },
   {
    "say": "Los puntos vacíos encerrados por tus piedras se llaman <b>ojos</b>. ¡Toca el punto que brilla para dividir el espacio negro en dos!",
    "done": "¡<b>Dos ojos</b>! Las blancas nunca pueden llenar ambos, así que este grupo negro no se puede capturar: está <b>vivo</b>."
   },
   {
    "say": "Cuando no quedan jugadas útiles, se <b>pasa</b>. Dos pases seguidos <b>terminan la partida</b>. Los puntos vacíos que rodeas son tu <b>territorio</b>: negras 35, blancas 28. Las blancas juegan segundas y reciben <b>komi</b>: 6,5 puntos."
   },
   {
    "say": "¡Gana quien sume más <b>territorio + prisioneros</b>! Aquí las negras tienen 35 y las blancas 28 + 6,5 = 34,5: ganan las negras por <b>medio punto</b>. Gracias al komi, las partidas suelen ser así de reñidas. Forma grupos que no se puedan capturar y rodea mucho. ¡A jugar!"
   }
  ]
 },
 "fr": {
  "name": "Pingopierre",
  "next": "Suivant",
  "back": "Retour",
  "start": "Jouer une partie",
  "again": "Encore",
  "tap": "Touche le point qui brille",
  "nope": "Pas là ! Touche le point qui brille",
  "atari": "Atari !",
  "cap": "Capturée !",
  "ko": "Ko",
  "alive": "Vivant !",
  "forb": "Interdit (suicide)",
  "b": "Noir",
  "w": "Blanc",
  "komi": "komi",
  "s": [
   {
    "say": "Salut ! Je suis <b>Pingopierre</b>. Aujourd'hui, apprenons les règles du <b>go</b> pas à pas, sur un petit goban 9×9 !"
   },
   {
    "say": "Les pierres se posent sur les <b>intersections</b> des lignes. <b>Noir commence</b>, puis chacun joue à son tour. Touche le point central qui brille pour poser une pierre noire !",
    "done": "Clac ! Une pierre posée ne bouge plus — mais au go, les pierres peuvent être <b>capturées</b>."
   },
   {
    "say": "Les points libres juste à côté d'une pierre (haut, bas, gauche, droite) sont ses <b>libertés</b>. La pierre blanche du centre en a deux (en vert). Touche le point qui brille pour en boucher une !",
    "done": "Il ne reste à Blanc qu'<b>une</b> liberté. Une pierre capturable au coup suivant est en <b>atari</b>."
   },
   {
    "say": "Blanc est en atari ! Joue sur sa dernière liberté (le point qui brille) et <b>capture-la</b> !",
    "done": "Capturée ! Les pierres sans liberté sont retirées du plateau et deviennent tes <b>prisonniers</b>."
   },
   {
    "say": "Les pierres <b>reliées</b> verticalement ou horizontalement <b>partagent</b> leurs libertés. Ces deux pierres blanches n'en ont qu'une : le point qui brille. Capture-les toutes les deux !",
    "done": "Deux d'un coup ! Des pierres qui ne se touchent qu'en diagonale ne sont pas reliées : attention."
   },
   {
    "say": "Le point × est entouré par Blanc. Une pierre noire là n'aurait aucune liberté. Touche-le !",
    "done": "Bzzz ! Interdit de jouer un coup qui laisse ta propre pierre sans liberté (<b>suicide</b>), sauf s'il capture des pierres adverses."
   },
   {
    "say": "Si Noir joue le point qui brille, il capture une pierre blanche. Essaie !",
    "done": "Capturée ! Mais Blanc ne peut pas reprendre en × tout de suite. Ce va-et-vient s'appelle le <b>ko</b> : Blanc doit d'abord jouer ailleurs."
   },
   {
    "say": "Les points vides entourés par tes pierres sont des <b>yeux</b>. Touche le point qui brille pour couper l'espace noir en deux !",
    "done": "<b>Deux yeux</b> ! Blanc ne pourra jamais remplir les deux : ce groupe noir est imprenable. Il est <b>vivant</b>."
   },
   {
    "say": "Quand il n'y a plus rien d'utile à jouer, on <b>passe</b>. Deux passes de suite <b>terminent la partie</b>. Les points vides que tu entoures sont ton <b>territoire</b> : Noir 35, Blanc 28. Blanc joue en second et reçoit le <b>komi</b> : 6,5 points."
   },
   {
    "say": "Le plus grand total <b>territoire + prisonniers</b> <b>gagne</b> ! Ici Noir a 35 et Blanc 28 + 6,5 = 34,5 : Noir gagne d'<b>un demi-point</b>. Grâce au komi, les parties sont souvent aussi serrées. Fais des formes imprenables et entoure beaucoup. À toi de jouer !"
   }
  ]
 },
 "pt": {
  "name": "Pinguipedra",
  "next": "Próximo",
  "back": "Voltar",
  "start": "Vamos jogar",
  "again": "De novo",
  "tap": "Toque no ponto que brilha",
  "nope": "Aí não! Toque no ponto que brilha",
  "atari": "Atari!",
  "cap": "Capturada!",
  "ko": "Ko",
  "alive": "Vivo!",
  "forb": "Proibido (suicídio)",
  "b": "Pretas",
  "w": "Brancas",
  "komi": "komi",
  "s": [
   {
    "say": "Oi! Eu sou o <b>Pinguipedra</b>. Hoje vamos aprender as regras do <b>go</b> passo a passo, num pequeno tabuleiro 9×9!"
   },
   {
    "say": "As pedras vão nos <b>pontos onde as linhas se cruzam</b>. <b>As pretas começam</b> e depois se joga em turnos. Toque no ponto central que brilha para colocar uma pedra preta!",
    "done": "Clic! A pedra não se move mais — mas no go as pedras podem ser <b>capturadas</b>."
   },
   {
    "say": "Os pontos vazios logo ao lado de uma pedra (em cima, embaixo, à esquerda, à direita) são as suas <b>liberdades</b>. A pedra branca do meio tem duas (em verde). Toque no ponto que brilha para fechar uma!",
    "done": "A branca ficou com só <b>uma</b> liberdade. Uma pedra que pode ser capturada no próximo lance está em <b>atari</b>."
   },
   {
    "say": "A branca está em atari! Jogue na última liberdade dela (o ponto que brilha) e <b>capture</b>!",
    "done": "Capturada! Pedras sem liberdades saem do tabuleiro e viram seus <b>prisioneiros</b>."
   },
   {
    "say": "Pedras <b>ligadas</b> na vertical ou na horizontal <b>compartilham</b> as liberdades. Estas duas brancas só têm uma: o ponto que brilha. Capture as duas!",
    "done": "Duas de uma vez! Pedras que só se tocam na diagonal não estão ligadas, cuidado."
   },
   {
    "say": "O ponto × está cercado pelas brancas. Uma preta ali ficaria sem nenhuma liberdade. Toque nele!",
    "done": "Bzzz! Não pode jogar um lance que deixa sua própria pedra sem liberdades (<b>suicídio</b>), a não ser que ele capture pedras do rival."
   },
   {
    "say": "Se as pretas jogarem no ponto que brilha, capturam uma pedra branca. Experimente!",
    "done": "Capturada! Mas as brancas não podem recapturar em × na hora. Esse vaivém se chama <b>ko</b>: primeiro é preciso jogar em outro lugar."
   },
   {
    "say": "Os pontos vazios cercados pelas suas pedras se chamam <b>olhos</b>. Toque no ponto que brilha para dividir o espaço preto em dois!",
    "done": "<b>Dois olhos</b>! As brancas nunca conseguem preencher os dois, então este grupo preto não pode ser capturado: está <b>vivo</b>."
   },
   {
    "say": "Quando não há mais lances úteis, você <b>passa</b>. Dois passes seguidos <b>encerram a partida</b>. Os pontos vazios que você cerca são o seu <b>território</b>: pretas 35, brancas 28. As brancas jogam em segundo e recebem <b>komi</b>: 6,5 pontos."
   },
   {
    "say": "Vence quem somar mais <b>território + prisioneiros</b>! Aqui as pretas têm 35 e as brancas 28 + 6,5 = 34,5: as pretas vencem por <b>meio ponto</b>. Graças ao komi, as partidas costumam ser apertadas assim. Faça formas que não podem ser capturadas e cerque bastante. Vamos jogar!"
   }
  ]
 },
 "de": {
  "name": "Steinguin",
  "next": "Weiter",
  "back": "Zurück",
  "start": "Los, spielen",
  "again": "Nochmal",
  "tap": "Tippe auf den leuchtenden Punkt",
  "nope": "Nicht dort! Tippe auf den leuchtenden Punkt",
  "atari": "Atari!",
  "cap": "Geschlagen!",
  "ko": "Ko",
  "alive": "Lebt!",
  "forb": "Verboten (Selbstmord)",
  "b": "Schwarz",
  "w": "Weiß",
  "komi": "Komi",
  "s": [
   {
    "say": "Hallo! Ich bin <b>Steinguin</b>. Heute lernen wir Schritt für Schritt die Regeln von <b>Go</b> – auf einem kleinen 9×9-Brett!"
   },
   {
    "say": "Steine kommen auf die <b>Kreuzungspunkte</b> der Linien. <b>Schwarz beginnt</b>, dann wird abwechselnd gesetzt. Tippe auf den leuchtenden Mittelpunkt und setze einen schwarzen Stein!",
    "done": "Klack! Gesetzte Steine bewegen sich nicht – aber beim Go können Steine <b>geschlagen</b> werden."
   },
   {
    "say": "Die freien Punkte direkt neben einem Stein (oben, unten, links, rechts) sind seine <b>Freiheiten</b>. Der weiße Stein in der Mitte hat zwei (grün). Tippe auf den leuchtenden Punkt und nimm ihm eine!",
    "done": "Weiß hat nur noch <b>eine</b> Freiheit. Ein Stein, der im nächsten Zug geschlagen werden kann, steht im <b>Atari</b>."
   },
   {
    "say": "Weiß steht im Atari! Setze auf seine letzte Freiheit (der leuchtende Punkt) und <b>schlage</b> ihn!",
    "done": "Geschlagen! Steine ohne Freiheiten werden vom Brett genommen und sind deine <b>Gefangenen</b>."
   },
   {
    "say": "Senkrecht oder waagerecht <b>verbundene</b> Steine <b>teilen</b> sich ihre Freiheiten. Diese zwei weißen Steine haben nur eine: den leuchtenden Punkt. Schlage beide!",
    "done": "Zwei auf einmal! Steine, die sich nur diagonal berühren, sind nicht verbunden – pass auf."
   },
   {
    "say": "Der Punkt × ist von Weiß umzingelt. Ein schwarzer Stein dort hätte keine einzige Freiheit. Tippe darauf!",
    "done": "Bzzt! Ein Zug, der den eigenen Stein ohne Freiheiten lässt (<b>Selbstmord</b>), ist verboten – außer er schlägt gegnerische Steine."
   },
   {
    "say": "Setzt Schwarz auf den leuchtenden Punkt, schlägt es einen weißen Stein. Probier es!",
    "done": "Geschlagen! Aber Weiß darf bei × nicht sofort zurückschlagen. Dieses Hin und Her heißt <b>Ko</b>: Weiß muss erst woanders spielen."
   },
   {
    "say": "Leere Punkte, die deine Steine umschließen, heißen <b>Augen</b>. Tippe auf den leuchtenden Punkt und teile den schwarzen Raum in zwei!",
    "done": "<b>Zwei Augen</b>! Weiß kann nie beide füllen, also kann diese schwarze Gruppe nie geschlagen werden. Sie <b>lebt</b>."
   },
   {
    "say": "Gibt es nichts Sinnvolles mehr zu spielen, <b>passt</b> man. Zweimal Passen hintereinander <b>beendet die Partie</b>. Die leeren Punkte, die du umschließt, sind dein <b>Gebiet</b>: Schwarz 35, Weiß 28. Weiß zieht als Zweiter und bekommt <b>Komi</b>: 6,5 Punkte."
   },
   {
    "say": "Wer mehr <b>Gebiet + Gefangene</b> hat, <b>gewinnt</b>! Hier hat Schwarz 35 und Weiß 28 + 6,5 = 34,5 – Schwarz gewinnt mit <b>einem halben Punkt</b>. Dank Komi sind Partien oft so knapp. Bilde Formen, die nicht geschlagen werden können, und umschließe viel. Los geht's!"
   }
  ]
 },
 "hi": {
  "name": "स्टोनगुइन",
  "next": "आगे",
  "back": "पीछे",
  "start": "खेलकर देखें",
  "again": "फिर से",
  "tap": "चमकते बिंदु पर टैप करें",
  "nope": "वहाँ नहीं! चमकते बिंदु पर टैप करो",
  "atari": "अटारी!",
  "cap": "पकड़ लिया!",
  "ko": "को",
  "alive": "जीवित!",
  "forb": "वर्जित (आत्मघाती)",
  "b": "काला",
  "w": "सफ़ेद",
  "komi": "कोमी",
  "s": [
   {
    "say": "नमस्ते! मैं <b>स्टोनगुइन</b> हूँ। आज छोटे 9×9 बोर्ड पर एक-एक कदम करके <b>गो</b> के नियम सीखते हैं!"
   },
   {
    "say": "पत्थर रेखाओं के <b>कटान बिंदुओं</b> पर रखे जाते हैं। <b>काला पहले चलता है</b>, फिर बारी-बारी से। बीच के चमकते बिंदु पर टैप करके काला पत्थर रखो!",
    "done": "टक! रखा पत्थर हिलता नहीं — पर गो में पत्थर <b>पकड़े</b> जा सकते हैं।"
   },
   {
    "say": "किसी पत्थर के ठीक बगल (ऊपर, नीचे, बाएँ, दाएँ) के खाली बिंदु उसकी <b>स्वतंत्रताएँ</b> हैं। बीच वाले सफ़ेद पत्थर की दो हैं (हरी)। चमकते बिंदु पर टैप करके एक बंद करो!",
    "done": "सफ़ेद की अब सिर्फ़ <b>एक</b> स्वतंत्रता बची। जो पत्थर अगली चाल में पकड़ा जा सकता है, वह <b>अटारी</b> में होता है।"
   },
   {
    "say": "सफ़ेद अटारी में है! उसकी आख़िरी स्वतंत्रता (चमकता बिंदु) पर काला रखकर उसे <b>पकड़ो</b>!",
    "done": "पकड़ लिया! बिना स्वतंत्रता वाले पत्थर बोर्ड से हटा दिए जाते हैं और तुम्हारे <b>बंदी</b> बन जाते हैं।"
   },
   {
    "say": "ऊपर-नीचे या दाएँ-बाएँ <b>जुड़े पत्थर</b> अपनी स्वतंत्रताएँ <b>साझा</b> करते हैं। इन दो सफ़ेद पत्थरों की बस एक है: चमकता बिंदु। दोनों को पकड़ो!",
    "done": "एक साथ दो! सिर्फ़ तिरछे छूते पत्थर जुड़े नहीं माने जाते, ध्यान रखो।"
   },
   {
    "say": "× बिंदु सफ़ेद से घिरा है। वहाँ काला पत्थर रखते ही उसकी कोई स्वतंत्रता नहीं बचेगी। टैप करके देखो!",
    "done": "बज़्ज़! अपने ही पत्थर को बिना स्वतंत्रता छोड़ने वाली चाल (<b>आत्मघाती चाल</b>) मना है — जब तक उससे विरोधी के पत्थर न पकड़े जाएँ।"
   },
   {
    "say": "काला चमकते बिंदु पर खेले तो एक सफ़ेद पत्थर पकड़ लेगा। खेलकर देखो!",
    "done": "पकड़ लिया! पर सफ़ेद तुरंत × पर वापस नहीं पकड़ सकता। इस आगे-पीछे को <b>को</b> कहते हैं: सफ़ेद को पहले कहीं और खेलना होगा।"
   },
   {
    "say": "अपने पत्थरों से घिरे खाली बिंदु <b>आँखें</b> कहलाते हैं। चमकते बिंदु पर टैप करके काले की जगह को दो हिस्सों में बाँटो!",
    "done": "<b>दो आँखें</b>! सफ़ेद दोनों को कभी नहीं भर सकता, इसलिए यह काला समूह कभी नहीं पकड़ा जाएगा। यह <b>जीवित</b> है।"
   },
   {
    "say": "जब कोई काम की चाल न बचे, तो <b>पास</b> करो। लगातार दो पास से <b>खेल ख़त्म</b> होता है। अपने पत्थरों से घेरे खाली बिंदु तुम्हारा <b>क्षेत्र</b> हैं: काला 35, सफ़ेद 28। सफ़ेद बाद में चलता है, इसलिए उसे <b>कोमी</b> के 6.5 अंक मिलते हैं।"
   },
   {
    "say": "<b>क्षेत्र + बंदी</b> का जोड़ जिसका ज़्यादा हो, वही <b>जीतता</b> है! यहाँ काले के 35 और सफ़ेद के 28 + 6.5 = 34.5 हैं, इसलिए काला <b>आधे अंक</b> से जीता। कोमी के कारण खेल अक्सर इतने क़रीबी होते हैं। न पकड़े जा सकने वाले आकार बनाओ और खूब घेरो। चलो खेलें!"
   }
  ]
 },
 "ar": {
  "name": "بطريق الحجر",
  "next": "التالي",
  "back": "رجوع",
  "start": "لنلعب",
  "again": "مرة أخرى",
  "tap": "اضغط النقطة المضيئة",
  "nope": "ليس هناك! اضغط النقطة المضيئة",
  "atari": "أتاري!",
  "cap": "أُسر!",
  "ko": "كو",
  "alive": "حيّة!",
  "forb": "ممنوع (انتحار)",
  "b": "الأسود",
  "w": "الأبيض",
  "komi": "كومي",
  "s": [
   {
    "say": "مرحبًا! أنا <b>بطريق الحجر</b>. لنتعلّم اليوم قواعد <b>الغو</b> خطوة بخطوة على رقعة صغيرة 9×9!"
   },
   {
    "say": "توضع الأحجار على <b>نقاط تقاطع الخطوط</b>. <b>الأسود يبدأ</b>، ثم يتناوب اللاعبان. اضغط النقطة المضيئة في المركز لتضع حجرًا أسود!",
    "done": "طق! الحجر لا يتحرك بعد وضعه، لكن في الغو يمكن <b>أسر</b> الأحجار."
   },
   {
    "say": "النقاط الفارغة الملاصقة للحجر (أعلى، أسفل، يمين، يسار) هي <b>حرّياته</b>. للحجر الأبيض في الوسط حرّيتان (باللون الأخضر). اضغط النقطة المضيئة لتسدّ إحداهما!",
    "done": "بقيت للأبيض حرّية <b>واحدة</b>. الحجر الذي يمكن أسره في النقلة التالية يكون في <b>أتاري</b>."
   },
   {
    "say": "الأبيض في أتاري! ضع الأسود على حرّيته الأخيرة (النقطة المضيئة) و<b>أسِرْه</b>!",
    "done": "أُسر! الأحجار التي لا حرّيات لها تُرفع عن الرقعة وتصبح <b>أسراك</b>."
   },
   {
    "say": "الأحجار <b>المتصلة</b> عموديًا أو أفقيًا <b>تتشارك</b> حرّياتها. لهذين الحجرين الأبيضين حرّية واحدة فقط: النقطة المضيئة. أسِرهما معًا!",
    "done": "اثنان دفعة واحدة! الأحجار التي تتلامس قطريًا فقط ليست متصلة، انتبه."
   },
   {
    "say": "النقطة × محاطة بالأبيض. لو وضعت الأسود هناك لما بقيت له أي حرّية. اضغطها!",
    "done": "بززت! لا يجوز لعب نقلة تترك حجرك بلا حرّيات (<b>انتحار</b>)، إلا إذا أسرت بها أحجار الخصم."
   },
   {
    "say": "إن لعب الأسود على النقطة المضيئة أسر حجرًا أبيض. جرّب!",
    "done": "أُسر! لكن لا يستطيع الأبيض الاستعادة عند × فورًا. يسمّى هذا الأخذ المتبادل <b>كو</b>: على الأبيض أن يلعب في مكان آخر أولًا."
   },
   {
    "say": "النقاط الفارغة التي تحيطها أحجارك تسمّى <b>عيونًا</b>. اضغط النقطة المضيئة لتقسم مساحة الأسود إلى قسمين!",
    "done": "<b>عينان</b>! لا يستطيع الأبيض ملء الاثنتين أبدًا، فلن تُؤسر هذه المجموعة السوداء. إنها <b>حيّة</b>."
   },
   {
    "say": "حين لا تبقى نقلات مفيدة <b>تمرّر</b>. تمريران متتاليان <b>ينهيان المباراة</b>. النقاط الفارغة التي تحيطها هي <b>أرضك</b>: الأسود 35، الأبيض 28. الأبيض يلعب ثانيًا فيحصل على <b>كومي</b>: 6.5 نقاط."
   },
   {
    "say": "يفوز صاحب المجموع الأكبر من <b>الأرض + الأسرى</b>! هنا للأسود 35 وللأبيض 28 + 6.5 = 34.5، فيفوز الأسود <b>بنصف نقطة</b>. بفضل الكومي تكون المباريات متقاربة هكذا غالبًا. اصنع أشكالًا لا تُؤسر وأحِط بمساحة كبيرة. هيا نلعب!"
   }
  ]
 }
};
  // the opening picture: a small 9 × 9 game in progress
  const SHOW = { b: ['22', '62', '44', '25', '36', '63', '54'], w: ['66', '26', '64', '35', '55', '65', '46'] };
  // the counted game (step 8): black walls at x = BX[y], white walls just right of them → Black 35, White 28 points
  const BX = [4, 4, 4, 4, 3, 4, 4, 4, 4];
  const END = { b: BX.map((x, y) => '' + x + y), w: BX.map((x, y) => '' + (x + 1) + y) };
  const STEPS = [
    { show: true },
    { b: [], w: [], act: { to: ['44'] } },
    { b: ['34', '54'], w: ['44'], libs: ['43', '45'], act: { to: ['45'], atari: ['43'] } },
    { b: ['34', '54', '45'], w: ['44'], libs: ['43'], act: { to: ['43'], take: ['44'] } },
    { b: ['34', '54', '33', '53', '45'], w: ['44', '43'], group: ['43', '44'], libs: ['42'], act: { to: ['42'], take: ['44', '43'] } },
    { b: [], w: ['43', '34', '54', '45'], cross: ['44'], act: { to: ['44'], forbid: true } },
    { b: ['43', '34', '45'], w: ['53', '64', '55', '44'], act: { to: ['54'], take: ['44'], ko: '44' } },
    { b: ['07', '17', '27', '37', '47', '48', '38'], w: ['06', '16', '26', '36', '46', '56', '57', '58'], act: { to: ['18'], eyes: ['08', '28'] } },
    { b: END.b, w: END.w, count: true },
    { last: true, b: END.b, w: END.w, count: true },
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
    const board = T3.MODELS.go(true, { n: N }); T3.show('go', board); T3.play(true);
    const U = board.userData, Y = U.top, c = U.cell;
    if (T3.fit) T3.fit({ w: U.W + .3, d: U.W + 1.6, y: Y - 1.5, pitch: 1.12 });   // the whole board, seen a little from the player's side
    const marks = new TH.Group(), stones = new TH.Group(); board.add(marks, stones);
    let st = {}, step = 0, stopped = false, busy = false, played = false, timers = [], targets = [], hand = null, idleT = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const xz = q => U.pt(+q[0], +q[1]);
    const H = c * .47 * GB.SH * 2;

    /* ---------- stones ---------- */
    function put(q, col, delay = 0, drop = true) {
      const g = new TH.Group(), s = GB.stone(col, c, ix(q) * 7 + col), sh = T3.contact(c * .47, .5); sh.position.y = .002; g.add(sh, s);
      const [x, z] = xz(q); g.position.set(x, Y, z); stones.add(g); st[q] = g; g.userData.s = s; g.userData.sh = sh;
      if (!drop) return g;
      g.visible = false;
      later(() => {
        g.visible = true; const z0 = c * .45, h0 = c * 1.1; s.position.set(0, h0, z0); s.rotation.x = -.4; sh.material.opacity = 0;
        anim(280, k => { const e = 1 - Math.pow(1 - k, 3), hh = k < .72 ? h0 * (1 - Math.pow(k / .72, 2)) : 0; s.position.y = hh; s.position.z = z0 * (1 - e); s.rotation.x = -.4 * (1 - Math.min(1, k / .72)); sh.material.opacity = .5 * Math.min(1, k * 1.3); if (k > .72) { const q2 = (k - .72) / .28, sq = Math.sin(q2 * Math.PI) * .06; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); } },
          () => { s.position.set(0, 0, 0); s.rotation.x = 0; s.scale.set(1, 1, 1); });
        later(() => SFX.pachi(col === 1 ? 1 : 1.12), 200);
      }, delay);
      return g;
    }
    function take(list, delay) {   // captured stones are lifted off the board
      list.forEach((q, i) => later(() => {
        const g = st[q]; if (!g) return; delete st[q];
        const s = g.userData.s, sh = g.userData.sh;
        anim(300, k => { s.position.y = c * .7 * k; s.scale.setScalar(Math.max(.01, 1 - k)); sh.material.opacity = .5 * (1 - k); }, () => stones.remove(g));
        SFX.pachi(1.5 + i * .1);
      }, delay + i * 90));
    }
    function clearStones() { while (stones.children.length) stones.remove(stones.children[0]); st = {}; }
    function setBoard(S) {
      clearStones(); let i = 0;
      const P = S.show ? SHOW : S;
      (P.b || []).forEach(q => put(q, 1, 60 + (i++) * 55)); (P.w || []).forEach(q => put(q, 2, 60 + (i++) * 55));
      return i;
    }
    /* ---------- marks ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function glow(q) { const g = GB.tapMark(c), [x, z] = xz(q); g.position.set(x, Y, z); marks.add(g); return g; }
    function dot(q, color, r = .2, pulse = true) {   // a liberty: a soft coloured dot that breathes a little
      const m = new TH.Mesh(new TH.CircleGeometry(c * r, 28), basic(color, .9)); m.rotation.x = -Math.PI / 2; const [x, z] = xz(q); m.position.set(x, Y + .006, z); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function square(q, col, delay) {   // a point of territory: a small square of its owner's colour
      const m = new TH.Mesh(new TH.BoxGeometry(c * .36, .012, c * .36), basic(col === 1 ? 0x15161a : 0xfaf7ee, col === 1 ? .88 : .95)); const [x, z] = xz(q); m.position.set(x, Y + .008, z); m.scale.setScalar(.01); marks.add(m);
      later(() => anim(220, k => m.scale.setScalar(.01 + k * .99)), delay);
    }
    function bar(list, color, op = .45) {   // a rounded band under connected stones
      const [x0, z0] = xz(list[0]), [x1, z1] = xz(list[list.length - 1]), w = c * 1.32, Ln = Math.hypot(x1 - x0, z1 - z0) + w, r = w / 2, sh = new TH.Shape();
      sh.moveTo(-Ln / 2 + r, -r); sh.lineTo(Ln / 2 - r, -r); sh.absarc(Ln / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); sh.lineTo(-Ln / 2 + r, r); sh.absarc(-Ln / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5);
      const m = new TH.Mesh(new TH.ShapeGeometry(sh, 16), basic(color, op)); m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0);
      m.position.set((x0 + x1) / 2, Y + .004, (z0 + z1) / 2); marks.add(m); return m;
    }
    function cross(q) { const g = new TH.Group(), mat = basic(0xe0281a, 1); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(c * .62, .03, c * .13), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = xz(q); g.position.set(x, Y + .01, z); g.userData.pulse = true; marks.add(g); return g; }
    function eye(q, delay) { later(() => { const m = new TH.Mesh(new TH.RingGeometry(c * .2, c * .3, 32), basic(0x2f8cff, .9)); m.rotation.x = -Math.PI / 2; const [x, z] = xz(q); m.position.set(x, Y + .006, z); m.scale.setScalar(.01); marks.add(m); anim(260, k => m.scale.setScalar(.01 + k * .99)); }, delay); }
    // territory of the counted game: flood fill from every empty point (borders all one colour → that colour's point)
    function territory(S) {
      const bd = new Array(N * N).fill(0); S.b.forEach(q => { bd[ix(q)] = 1; }); S.w.forEach(q => { bd[ix(q)] = 2; });
      const own = new Array(N * N).fill(0), seen = new Uint8Array(N * N);
      for (let i = 0; i < N * N; i++) {
        if (bd[i] || seen[i]) continue;
        const stk = [i], reg = []; seen[i] = 1; let tb = false, tw = false;
        while (stk.length) { const p = stk.pop(); reg.push(p); const x = p % N, y = (p / N) | 0; [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([a, b]) => { if (a < 0 || b < 0 || a >= N || b >= N) return; const k = b * N + a; if (bd[k] === 1) tb = true; else if (bd[k] === 2) tw = true; else if (!seen[k]) { seen[k] = 1; stk.push(k); } }); }
        const o = tb && !tw ? 1 : tw && !tb ? 2 : 0; reg.forEach(p => { own[p] = o; });
      }
      return own;
    }
    // a gentle pulse for the tap marker / liberties / the × while they are shown (only kicks frames while something pulses)
    (function pulse() { if (stopped) return; const now = performance.now(), k = .5 + .5 * Math.sin(now / 260); let any = false; marks.children.forEach(m => { if (m.userData.tap) { any = true; m.userData.tick(now); return; } if (m.userData.pulse) { any = true; const s = .85 + k * .3; m.scale.setScalar(s); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- the ghost finger: after ~6 s without a tap it taps the right point ---------- */
    function hideHand() { if (hand) { hand.remove(); hand = null; } }
    function armIdle() { clearTimeout(idleT); hideHand(); if (targets.length) idleT = setTimeout(showHand, 6000); }
    function showHand() {
      if (stopped || busy || !targets.length || played) return;
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
      const nodes = []; (function walk(n) { n.childNodes.forEach(ch => { if (ch.nodeType === 3) nodes.push([ch, ch.textContent]); else walk(ch); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    function line(html, warn) { $('.cnt').innerHTML = html; const t = $('.cnt').lastElementChild; if (warn && t && t.animate) t.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'none' }], { duration: 320 }); }
    const tapLine = () => line(`<b class="tapl" style="color:#e0452b;font-size:1.04em">👉 ${L.tap}</b>`);
    const dec = v => /^(es|fr|pt|de)$/.test(ctx.lang) ? String(v).replace('.', ',') : String(v);
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
    function arm(list) {
      targets = list.slice(); clearMarks(); const S = STEPS[step];
      if (S.group) bar(S.group, 0xff4a3a, .32);
      (S.libs || []).forEach(q => dot(q, 0x2fd17a));
      (S.cross || []).forEach(cross);
      list.forEach(q => { if (!(S.act && S.act.forbid)) glow(q); });
      armIdle();
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; targets = [];
      timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); hideHand();
      const S = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(S), wait = 200 + cnt * 55;
      if (S.act) { busy = true; later(() => { busy = false; arm(S.act.to); tapLine(); }, wait + 150); }
      if (S.count) {   // the finished game: its territory appears point by point, then the score
        const own = territory(S); let k = 0;
        own.forEach((o, i) => { if (o) square('' + (i % N) + ((i / N) | 0), o, wait + 200 + (k++) * 22); });
        const b = own.filter(o => o === 1).length, w = own.filter(o => o === 2).length, km = 6.5;   // GoRules.defaultKomi(9, 'jp')
        later(() => { line(`<span class="tag"><i class="dk b"></i> ${L.b} ${b}</span> <span class="tag"><i class="dk w"></i> ${L.w} ${w} + ${L.komi} ${dec(km)} = ${dec(w + km)}</span>`); }, wait + 300 + k * 22);
      }
      say(L.s[step].say); buttons();
    }
    function pickPoint(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      const h = (N - 1) / 2, fi = p.x / c + h, fj = p.z / c + h, i = Math.round(fi), j = Math.round(fj);
      if (i < 0 || i >= N || j < 0 || j >= N || Math.hypot(fi - i, fj - j) > .62) return null;
      return '' + i + j;
    }
    function finish(extra) { busy = false; targets = []; clearTimeout(idleT); hideHand(); if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    const tag = s => line(`<span class="tag">${s}</span>`);
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const S = STEPS[step], q = pickPoint(e); if (!q || !S.act || !targets.length) return;
      if (!targets.includes(q)) { SFX.buzz(); line(`<b class="tapl" style="color:#e0452b;font-size:1.04em">👉 ${L.nope}</b>`, true); marks.children.forEach(m => { if (m.userData.tap) anim(380, k => m.scale.setScalar(1.5 - .5 * k)); }); armIdle(); return; }
      clearTimeout(idleT); hideHand();
      const a = S.act, stepNow = step;
      if (a.forbid) {   // suicide: the stone hovers, shakes and is taken back
        busy = true; played = true; SFX.buzz();
        const g = put(q, 1, 0, false), s = g.userData.s; s.position.y = c * .5;
        anim(700, k => { s.position.x = Math.sin(k * Math.PI * 7) * c * .12 * (1 - k); s.position.y = c * .5 + Math.sin(k * Math.PI) * c * .1; }, () => anim(220, k => { s.position.y = c * .5 + k * c; s.scale.setScalar(1 - k); }, () => { stones.remove(g); delete st[q]; if (step === stepNow) finish(() => tag(L.forb)); }));
        return;
      }
      busy = true; played = true; clearMarks(); targets = [];
      put(q, 1, 0);
      if (a.take) {   // a capture (and the ko mark where White may not retake at once)
        take(a.take, 380);
        later(() => {
          SFX.chime();
          if (a.ko) cross(a.ko);
          finish(() => tag(a.ko ? L.ko : L.cap));
        }, 420 + a.take.length * 90 + 200);
        return;
      }
      if (a.atari) { later(() => { a.atari.forEach(lq => dot(lq, 0xff3b2b, .24)); SFX.chime(); finish(() => tag(L.atari)); }, 420); return; }
      if (a.eyes) { later(() => { a.eyes.forEach((eq, i) => eye(eq, i * 60)); SFX.chime(); finish(() => tag(L.alive)); }, 420); return; }
      later(() => finish(), 420);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => go(step - 1);
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
      stop() { stopped = true; clearInterval(typeT); clearTimeout(idleT); hideHand(); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); if (window.AtlasRules.go._s === api) delete window.AtlasRules.go._s; },
      panel: el,
      _debug: { pt: q => { const [x, z] = xz(q); return T3.project(x, z, Y); }, step: () => step, targets: () => targets.slice(), busy: () => busy, stones: () => Object.keys(st).sort() },
    };
    window.AtlasRules.go._s = api;   // test hook
    return api;
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.go = { start };
})();
