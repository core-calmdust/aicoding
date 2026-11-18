/* =====================================================================
   Fox and Geese rules — a guided tour on the 3D table (the board and the pieces chosen in the portal,
   atlas/models/foxgeese.js), told by the guide character (Dominoduck).
   A short hands-on course of the default game (15 geese that never step back): the board, the fox's step, the jump
   that takes a goose, two jumps in one move, the geese's step (forward, sideways or diagonally forward only), guarding
   the goose in front of the fox, shutting the fox in (the geese win), five geese or fewer (the fox wins), the four rules.
   Every task is checked live by the game's own rules (../foxgeese/engine.js); you play the side that is to move.
   The board has no coordinates, so the texts never name a point: the guide says "the glowing point".
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/duck-0.webp', ENG = '../foxgeese/engine.js?v=11', N = 7;
  const loadEngine = () => window.FoxEngine ? Promise.resolve(window.FoxEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.FoxEngine ? res(window.FoxEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const G13 = ['a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'c2', 'd2', 'e2', 'c1', 'd1', 'e1'], G15 = G13.concat(['a4', 'g4']);   // (the start of the default rules, g15)
  // f: the fox's point · g: the geese ('a1' … 'g7': files from the left, rank 1 nearest) · side: 2 = the geese are to move ·
  // act: what the task accepts · target: the green goal points · path: the points of the move asked for · warn: a goose in danger
  const STEPS = [
    { f: 'd4', g: G15 },
    { f: 'd4', g: G15 },
    { f: 'd4', g: G15, act: 'fstep' },
    { f: 'd4', g: ['e4', 'c2', 'd2', 'e2', 'c1', 'd1', 'e1'], act: 'jump', target: ['f4'] },
    { f: 'c3', g: ['d3', 'e4', 'c1', 'd1', 'e1', 'g5'], act: 'double', target: ['e5'], path: ['c3', 'e3', 'e5'] },
    { f: 'd5', g: G13, side: 2, act: 'gstep' },
    { f: 'd5', g: ['d4', 'c3', 'e3', 'c2', 'd2', 'e2', 'c1', 'd1', 'e1'], side: 2, act: 'guard', warn: ['d4'], target: ['d3'] },
    { f: 'd7', g: ['c7', 'e7', 'd5', 'c6', 'c5', 'e5', 'd4'], side: 2, act: 'trap', target: ['d6'] },
    { f: 'd4', g: ['c2', 'd2', 'e2', 'c1', 'd1'] },
    { f: 'd4', g: G15, last: true },
  ];

  const TXT = {
    ja: {"name": "ドミダック", "next": "つぎへ", "back": "もどる", "start": "対局してみる", "again": "もういちど", "tap": "光っている所をタップ", "nope": "そこへは動かせないよ", "ownF": "狐をタップしてね", "ownG": "ガチョウをタップしてね", "want": "今回はお題の手をさがしてね", "more": "まだ続けて跳べるよ。次の光っている点をタップ！", "s":[{"say": "クワッ！ わたしは<b>ドミダック</b>。ヨーロッパで何百年も遊ばれてきた狩りのゲーム、<b>狐とガチョウ</b>を案内するよ。1匹の狐と、たくさんのガチョウの勝負なんだ。"},{"say": "盤は十字の形で、<b>点が33個</b>。駒は線の上を点から点へ動くよ。狐は真ん中、ガチョウ15羽は手前に並んで始めるんだ。先に動くのは<b>狐</b>だよ。"},{"say": "狐は、線でつながった<b>となりの空いた点</b>へ1歩動けるよ。前後左右、線があればななめにも。狐をタップして、1歩動かしてみて！", "done": "そのとおり！"},{"say": "となりにガチョウがいて、<b>その真後ろの点が空いていれば</b>、狐は跳び越えて取れるよ。取るかどうかは自由なんだ。ガチョウを跳び越えて、光っている点へ！", "done": "ぱくっ！ 1羽取ったね。"},{"say": "着地した先でまた跳べるなら、<b>1手のうちに続けて</b>取れるよ。向きを変えてもいいんだ。光っている点まで、2羽続けて取ってみて！", "done": "2羽取った！ 途中で止まりたいときは、止まる点をもう一度タップすればいいよ。"},{"say": "今度はガチョウの番。ガチョウも、線でつながった<b>となりの空いた点</b>へ1歩動くよ。進めるのは<b>前・横・ななめ前</b>だけで、後ろには下がれないんだ。ガチョウは跳べないし、狐を取ることもできないよ。ガチョウを1羽、1歩動かしてみて！", "done": "いいね！"},{"say": "真後ろに仲間がいるガチョウは、<b>跳び越されない</b>よ。いま狐の前のガチョウは、後ろが空いていて狙われているんだ。狐に跳ばれないように守ってみて！", "done": "これで狐は跳べないね。"},{"say": "狐が<b>1歩も動けず、跳ぶこともできなくなったら</b>、ガチョウの勝ち！ ふさぐ駒の真後ろにも仲間を置くのがコツだよ。光っている点にガチョウを動かして、狐を閉じ込めて！", "done": "狐は動けない。ガチョウの勝ち！"},{"say": "ガチョウが<b>5羽以下</b>になったら、もう狐を囲めないから狐の勝ちだよ。引き分けはないよ。同じ局面が3回出るか、取り合いのないまま40手ずつ進んでも狐の勝ちなんだ。"},{"say": "ふだん遊ぶのは<b>15羽</b>のルール。ほかに、前と横にしか進めない<b>17羽</b>、後ろにも下がれるいちばん古い<b>13羽（伝統）</b>、13羽で後ろに下がれない<b>13羽（改変）</b>もあるよ。さあ、対局してみよう！"}]},
    en: {"name": "Dominoduck", "next": "Next", "back": "Back", "start": "Let's play", "again": "Again", "tap": "Tap a glowing spot", "nope": "It can't go there!", "ownF": "Tap the fox", "ownG": "Tap a goose", "want": "This time, find the move I asked for", "more": "It can jump on! Tap the next glowing point", "s":[{"say": "Quack! I'm <b>Dominoduck</b>. Let me show you <b>Fox and Geese</b>, a hunt game played in Europe for hundreds of years: one fox against a flock of geese."},{"say": "The board is a cross with <b>33 points</b>, and the pieces move along the lines from point to point. The fox starts in the middle, the 15 geese on the near side. <b>The fox</b> moves first."},{"say": "The fox moves one step to <b>an empty point next to it</b> along a line — forward, back, sideways, and diagonally where there is a line. Tap the fox and move it one step!", "done": "That's it!"},{"say": "When a goose is next to the fox and <b>the point straight behind it is empty</b>, the fox can jump over it and take it. Capturing is never compulsory. Jump over the goose onto the glowing point!", "done": "Gulp! One goose taken."},{"say": "If the fox can jump again from where it lands, it takes them all <b>in the same move</b> — changing direction is fine. Take two geese in a row, all the way to the glowing point!", "done": "Two geese! To stop partway, just tap the point where you stop once more."},{"say": "Now the geese. A goose also moves one step to <b>an empty point next to it</b> along a line — but only <b>forward, sideways or diagonally forward</b>; it never steps back. Geese cannot jump, and they cannot take the fox. Move one goose one step!", "done": "Nice!"},{"say": "A goose with a friend straight behind it <b>cannot be jumped</b>. Right now the goose in front of the fox has an empty point behind it — it is in danger. Keep the fox from jumping!", "done": "Now the fox has no jump."},{"say": "When the fox <b>cannot step and cannot jump</b>, the geese win! The trick is to back up every goose that blocks it. Move a goose onto the glowing point and shut the fox in!", "done": "The fox cannot move. The geese win!"},{"say": "With <b>five geese or fewer</b> left, they can no longer surround the fox, so the fox wins. There are no draws: the fox also wins if the same position comes up three times, or after 40 moves each without a capture."},{"say": "The usual game has <b>15 geese</b>. There are also <b>17 geese</b> that move only forward or sideways, the oldest form with <b>13 geese (traditional)</b> that may step back, and <b>13 geese (no retreat)</b>. Now, let’s play!"}]},
    zh: {"name": "骨牌鸭鸭", "next": "下一步", "back": "返回", "start": "开始对局", "again": "再来一次", "tap": "点击发光的地方", "nope": "不能走到那里哦", "ownF": "请轻点狐狸", "ownG": "请轻点一只鹅", "want": "这次请找出题目要的那一步", "more": "还能继续跳！轻点下一个发光的点", "s":[{"say": "嘎！我是<b>骨牌鸭鸭</b>。带你认识在欧洲玩了几百年的狩猎游戏——<b>狐狸与鹅</b>：一只狐狸对一群鹅。"},{"say": "棋盘是十字形，共有<b>33个点</b>，棋子沿着线从一个点走到另一个点。狐狸在正中间，15只鹅排在靠近自己的一侧。先走的是<b>狐狸</b>。"},{"say": "狐狸可以沿着线走到<b>相邻的空点</b>，前后左右都行，有线的地方还能斜走。轻点狐狸，让它走一步吧！", "done": "就是这样！"},{"say": "旁边有鹅，而且<b>它正后方的点是空的</b>，狐狸就能跳过去把它吃掉。吃不吃由你决定。跳过那只鹅，落到发光的点上！", "done": "啊呜！吃掉一只。"},{"say": "落地后如果还能再跳，可以<b>在同一步里连续</b>吃，转弯也没关系。一直跳到发光的点，连吃两只吧！", "done": "吃掉两只！想中途停下时，再点一次停下的那个点就行。"},{"say": "现在轮到鹅。鹅也是沿着线走到<b>相邻的空点</b>，一次一步，但只能<b>向前、向两侧或斜前方</b>走，不能后退。鹅不能跳，也吃不了狐狸。让一只鹅走一步吧！", "done": "很好！"},{"say": "正后方有同伴的鹅<b>不会被跳过</b>。现在狐狸面前那只鹅身后是空的，正被盯着呢。别让狐狸跳过去！", "done": "这下狐狸跳不了了。"},{"say": "狐狸<b>一步也走不了，也跳不了</b>时，鹅就赢了！诀窍是在挡路的鹅正后方也放上同伴。把鹅走到发光的点，把狐狸关起来！", "done": "狐狸动不了了，鹅获胜！"},{"say": "鹅只剩<b>5只或更少</b>时，就围不住狐狸了，狐狸获胜。这里没有和棋：同一局面出现三次，或双方各40步都没有吃子，也算狐狸获胜。"},{"say": "平时玩的是<b>15只鹅</b>的规则。另外还有只能向前或向两侧走的<b>17只鹅</b>、能后退的最古老的<b>13只鹅（传统）</b>，以及不能后退的<b>13只鹅（不后退）</b>。来，下一盘吧！"}]},
    ko: {"name": "도미닥", "next": "다음", "back": "이전", "start": "대국해 보기", "again": "다시 하기", "tap": "빛나는 곳을 탭", "nope": "거기로는 갈 수 없어", "ownF": "여우를 탭해 줘", "ownG": "거위를 탭해 줘", "want": "이번에는 문제에서 말한 수를 찾아봐", "more": "더 뛸 수 있어! 다음 빛나는 점을 탭해 줘", "s":[{"say": "꽥! 나는 <b>도미닥</b>이야. 유럽에서 수백 년 동안 즐겨 온 사냥 게임 <b>여우와 거위</b>를 안내할게. 여우 한 마리와 거위 떼의 승부야."},{"say": "판은 십자 모양이고 <b>점이 33개</b>. 말은 선을 따라 점에서 점으로 움직여. 여우는 한가운데, 거위 15마리는 가까운 쪽에 늘어서서 시작해. 먼저 움직이는 건 <b>여우</b>야."},{"say": "여우는 선으로 이어진 <b>옆의 빈 점</b>으로 한 칸 갈 수 있어. 앞뒤좌우, 선이 있으면 대각선으로도. 여우를 탭해서 한 칸 움직여 봐!", "done": "바로 그거야!"},{"say": "옆에 거위가 있고 <b>그 바로 뒤의 점이 비어 있으면</b>, 여우는 뛰어넘어 잡을 수 있어. 잡을지 말지는 자유야. 거위를 뛰어넘어 빛나는 점으로!", "done": "냠! 한 마리 잡았어."},{"say": "내려앉은 곳에서 또 뛸 수 있으면 <b>한 수 안에 이어서</b> 잡을 수 있어. 방향을 바꿔도 돼. 빛나는 점까지 두 마리를 연달아 잡아 봐!", "done": "두 마리 잡았어! 도중에 멈추고 싶으면 멈출 점을 한 번 더 탭하면 돼."},{"say": "이번엔 거위 차례. 거위도 선으로 이어진 <b>옆의 빈 점</b>으로 한 칸 가. 갈 수 있는 건 <b>앞·옆·대각선 앞</b>뿐이고 뒤로는 물러날 수 없어. 거위는 뛸 수 없고 여우를 잡을 수도 없어. 거위 한 마리를 한 칸 움직여 봐!", "done": "좋아!"},{"say": "바로 뒤에 동료가 있는 거위는 <b>뛰어넘을 수 없어</b>. 지금 여우 앞의 거위는 뒤가 비어서 노려지고 있어. 여우가 뛰지 못하게 지켜 봐!", "done": "이제 여우는 뛸 수 없어."},{"say": "여우가 <b>한 칸도 못 가고 뛰지도 못하게 되면</b> 거위의 승리! 막는 거위 바로 뒤에도 동료를 두는 게 요령이야. 빛나는 점으로 거위를 옮겨 여우를 가둬 봐!", "done": "여우가 움직일 수 없어. 거위의 승리!"},{"say": "거위가 <b>5마리 이하</b>가 되면 더는 여우를 에워쌀 수 없어서 여우의 승리야. 무승부는 없어. 같은 국면이 세 번 나오거나 잡기 없이 40수씩 진행돼도 여우의 승리야."},{"say": "보통은 <b>15마리</b> 규칙으로 놀아. 그 밖에 앞과 옆으로만 가는 <b>17마리</b>, 뒤로도 물러날 수 있는 가장 오래된 <b>13마리(전통)</b>, 13마리로 뒤로 못 가는 <b>13마리(후퇴 없음)</b>도 있어. 자, 대국해 보자!"}]},
    es: {"name": "Dominoduck", "next": "Siguiente", "back": "Atrás", "start": "Jugar", "again": "Otra vez", "tap": "Toca un punto que brilla", "nope": "¡Ahí no puede ir!", "ownF": "Toca el zorro", "ownG": "Toca una oca", "want": "Esta vez busca la jugada que te pedí", "more": "¡Puede seguir saltando! Toca el siguiente punto que brilla", "s":[{"say": "¡Cuac! Soy <b>Dominoduck</b>. Te presento <b>El zorro y las ocas</b>, un juego de caza que se juega en Europa desde hace siglos: un zorro contra una bandada de ocas."},{"say": "El tablero es una cruz con <b>33 puntos</b>, y las piezas van por las líneas de punto en punto. El zorro empieza en el centro y las 15 ocas en el lado cercano. Empieza <b>el zorro</b>."},{"say": "El zorro da un paso a <b>un punto vacío vecino</b> siguiendo una línea: adelante, atrás, a los lados y en diagonal donde haya línea. ¡Toca el zorro y muévelo un paso!", "done": "¡Eso es!"},{"say": "Si hay una oca junto al zorro y <b>el punto justo detrás de ella está vacío</b>, el zorro puede saltarla y capturarla. Capturar nunca es obligatorio. ¡Salta la oca hasta el punto que brilla!", "done": "¡Ñam! Una oca menos."},{"say": "Si desde donde cae puede volver a saltar, las captura <b>en la misma jugada</b>, incluso cambiando de dirección. ¡Captura dos ocas seguidas hasta el punto que brilla!", "done": "¡Dos ocas! Para detenerte a mitad de camino, toca otra vez el punto donde paras."},{"say": "Ahora las ocas. Una oca también da un paso a <b>un punto vacío vecino</b> por una línea, pero solo <b>hacia delante, de lado o en diagonal hacia delante</b>; nunca retrocede. Las ocas no saltan ni pueden capturar al zorro. ¡Mueve una oca un paso!", "done": "¡Bien!"},{"say": "Una oca con una compañera justo detrás <b>no puede ser saltada</b>. Ahora mismo la oca que está frente al zorro tiene un punto vacío detrás: está en peligro. ¡Evita que el zorro salte!", "done": "Ahora el zorro no tiene salto."},{"say": "Cuando el zorro <b>no puede dar un paso ni saltar</b>, ganan las ocas. El truco es respaldar a cada oca que le cierra el paso. ¡Lleva una oca al punto que brilla y encierra al zorro!", "done": "El zorro no puede moverse. ¡Ganan las ocas!"},{"say": "Si quedan <b>cinco ocas o menos</b>, ya no pueden rodear al zorro, así que gana el zorro. No hay tablas: el zorro también gana si la misma posición se repite tres veces o tras 40 jugadas por bando sin capturas."},{"say": "Lo normal es jugar con <b>15 ocas</b>. También están <b>17 ocas</b>, que solo avanzan o van de lado; la forma más antigua, <b>13 ocas (tradicional)</b>, en la que pueden retroceder; y <b>13 ocas (sin retroceso)</b>. ¡Ahora, a jugar!"}]},
    fr: {"name": "Dominoduck", "next": "Suivant", "back": "Retour", "start": "Jouer", "again": "Encore", "tap": "Touche un point qui brille", "nope": "Il ne peut pas aller là !", "ownF": "Touche le renard", "ownG": "Touche une oie", "want": "Cette fois, cherche le coup demandé", "more": "Il peut encore sauter ! Touche le prochain point qui brille", "s":[{"say": "Coin ! Je suis <b>Dominoduck</b>. Voici <b>Le renard et les oies</b>, un jeu de chasse pratiqué en Europe depuis des siècles : un renard contre un troupeau d’oies."},{"say": "Le plateau est une croix de <b>33 points</b>, et les pièces suivent les lignes de point en point. Le renard part du centre, les 15 oies du côté proche. C’est <b>le renard</b> qui commence."},{"say": "Le renard avance d’un pas vers <b>un point vide voisin</b> le long d’une ligne : devant, derrière, sur les côtés, et en diagonale là où il y a une ligne. Touche le renard et avance-le d’un pas !", "done": "C’est ça !"},{"say": "Si une oie est à côté du renard et que <b>le point juste derrière elle est vide</b>, le renard peut sauter par-dessus et la prendre. La prise n’est jamais obligatoire. Saute l’oie jusqu’au point qui brille !", "done": "Miam ! Une oie de prise."},{"say": "Si, là où il atterrit, il peut sauter de nouveau, il les prend <b>dans le même coup</b>, même en changeant de direction. Prends deux oies d’affilée jusqu’au point qui brille !", "done": "Deux oies ! Pour t’arrêter en chemin, touche une fois de plus le point où tu t’arrêtes."},{"say": "Au tour des oies. Une oie avance aussi d’un pas vers <b>un point vide voisin</b> le long d’une ligne, mais seulement <b>vers l’avant, sur le côté ou en diagonale vers l’avant</b> : elle ne recule jamais. Les oies ne sautent pas et ne peuvent pas prendre le renard. Avance une oie d’un pas !", "done": "Bien !"},{"say": "Une oie qui a une amie juste derrière elle <b>ne peut pas être sautée</b>. En ce moment, l’oie devant le renard a un point vide derrière elle : elle est en danger. Empêche le renard de sauter !", "done": "Maintenant, le renard n’a plus de saut."},{"say": "Quand le renard <b>ne peut ni avancer ni sauter</b>, les oies gagnent ! L’astuce : soutenir chaque oie qui lui barre la route. Amène une oie sur le point qui brille et enferme le renard !", "done": "Le renard ne peut plus bouger. Les oies gagnent !"},{"say": "S’il reste <b>cinq oies ou moins</b>, elles ne peuvent plus cerner le renard : il gagne. Pas de partie nulle : le renard gagne aussi si la même position revient trois fois, ou après 40 coups chacun sans prise."},{"say": "D’habitude, on joue à <b>15 oies</b>. Il existe aussi <b>17 oies</b>, qui ne vont que vers l’avant ou de côté, la forme la plus ancienne à <b>13 oies (tradition)</b>, où elles peuvent reculer, et <b>13 oies (sans recul)</b>. Allez, jouons !"}]},
    pt: {"name": "Dominoduck", "next": "Próximo", "back": "Voltar", "start": "Jogar", "again": "De novo", "tap": "Toque num ponto que brilha", "nope": "Não pode ir para aí!", "ownF": "Toque na raposa", "ownG": "Toque num ganso", "want": "Desta vez, procure o lance que eu pedi", "more": "Ela pode continuar saltando! Toque no próximo ponto que brilha", "s":[{"say": "Quá! Eu sou o <b>Dominoduck</b>. Vou te mostrar <b>A raposa e os gansos</b>, um jogo de caça jogado na Europa há centenas de anos: uma raposa contra um bando de gansos."},{"say": "O tabuleiro é uma cruz com <b>33 pontos</b>, e as peças andam pelas linhas, de ponto em ponto. A raposa começa no meio e os 15 gansos no lado de cá. Quem começa é <b>a raposa</b>."},{"say": "A raposa dá um passo para <b>um ponto vazio vizinho</b> seguindo uma linha: para a frente, para trás, para os lados e na diagonal onde houver linha. Toque na raposa e mova-a um passo!", "done": "Isso mesmo!"},{"say": "Se há um ganso ao lado da raposa e <b>o ponto logo atrás dele está vazio</b>, a raposa pode saltar sobre ele e capturá-lo. Capturar nunca é obrigatório. Salte o ganso até o ponto que brilha!", "done": "Nhac! Um ganso capturado."},{"say": "Se de onde ela pousa dá para saltar de novo, ela captura todos <b>no mesmo lance</b>, mesmo mudando de direção. Capture dois gansos seguidos até o ponto que brilha!", "done": "Dois gansos! Para parar no meio do caminho, toque mais uma vez no ponto onde você para."},{"say": "Agora os gansos. Um ganso também dá um passo para <b>um ponto vazio vizinho</b> por uma linha, mas só <b>para a frente, para o lado ou na diagonal para a frente</b>; ele nunca recua. Gansos não saltam nem capturam a raposa. Mova um ganso um passo!", "done": "Boa!"},{"say": "Um ganso com um companheiro logo atrás <b>não pode ser saltado</b>. Agora o ganso diante da raposa tem um ponto vazio atrás: está em perigo. Não deixe a raposa saltar!", "done": "Agora a raposa não tem salto."},{"say": "Quando a raposa <b>não consegue andar nem saltar</b>, os gansos vencem! O truque é dar cobertura a cada ganso que fecha a passagem. Leve um ganso ao ponto que brilha e prenda a raposa!", "done": "A raposa não pode se mover. Os gansos vencem!"},{"say": "Com <b>cinco gansos ou menos</b>, eles já não conseguem cercar a raposa, e ela vence. Não há empate: a raposa também vence se a mesma posição aparecer três vezes ou após 40 lances de cada lado sem captura."},{"say": "O jogo normal tem <b>15 gansos</b>. Também há <b>17 gansos</b>, que só andam para a frente ou para os lados, a forma mais antiga, <b>13 gansos (tradicional)</b>, em que eles podem recuar, e <b>13 gansos (sem recuo)</b>. Agora, vamos jogar!"}]},
    de: {"name": "Dominoduck", "next": "Weiter", "back": "Zurück", "start": "Los spielen", "again": "Nochmal", "tap": "Tippe einen leuchtenden Punkt an", "nope": "Dorthin geht es nicht!", "ownF": "Tippe den Fuchs an", "ownG": "Tippe eine Gans an", "want": "Such diesmal den Zug, um den ich gebeten habe", "more": "Er kann weiterspringen! Tippe den nächsten leuchtenden Punkt an", "s":[{"say": "Quak! Ich bin <b>Dominoduck</b>. Ich zeige dir <b>Fuchs und Gänse</b>, ein Jagdspiel, das in Europa seit Jahrhunderten gespielt wird: ein Fuchs gegen eine Schar Gänse."},{"say": "Das Brett ist ein Kreuz mit <b>33 Punkten</b>, und die Figuren ziehen auf den Linien von Punkt zu Punkt. Der Fuchs beginnt in der Mitte, die 15 Gänse auf der nahen Seite. <b>Der Fuchs</b> zieht zuerst."},{"say": "Der Fuchs zieht einen Schritt auf <b>einen freien Nachbarpunkt</b> entlang einer Linie – vor, zurück, seitwärts und diagonal, wo eine Linie ist. Tippe den Fuchs an und zieh ihn einen Schritt!", "done": "Genau so!"},{"say": "Steht eine Gans neben dem Fuchs und ist <b>der Punkt direkt hinter ihr frei</b>, kann der Fuchs über sie springen und sie schlagen. Schlagen ist nie Pflicht. Spring über die Gans auf den leuchtenden Punkt!", "done": "Happs! Eine Gans geschlagen."},{"say": "Kann er von dort, wo er landet, gleich wieder springen, schlägt er alle <b>im selben Zug</b> – auch mit Richtungswechsel. Schlag zwei Gänse nacheinander, bis zum leuchtenden Punkt!", "done": "Zwei Gänse! Willst du unterwegs anhalten, tippe den Punkt, auf dem du stehen bleibst, noch einmal an."},{"say": "Jetzt die Gänse. Auch eine Gans zieht einen Schritt auf <b>einen freien Nachbarpunkt</b> entlang einer Linie – aber nur <b>vorwärts, seitwärts oder schräg vorwärts</b>; zurück geht es nie. Gänse springen nicht und können den Fuchs nicht schlagen. Zieh eine Gans einen Schritt!", "done": "Schön!"},{"say": "Eine Gans mit einer Freundin direkt hinter sich <b>kann nicht übersprungen werden</b>. Gerade hat die Gans vor dem Fuchs einen freien Punkt hinter sich – sie ist in Gefahr. Verhindere den Sprung des Fuchses!", "done": "Jetzt hat der Fuchs keinen Sprung mehr."},{"say": "Kann der Fuchs <b>weder ziehen noch springen</b>, gewinnen die Gänse! Der Trick: jede Gans, die ihm den Weg versperrt, von hinten decken. Zieh eine Gans auf den leuchtenden Punkt und sperr den Fuchs ein!", "done": "Der Fuchs kann nicht mehr ziehen. Die Gänse gewinnen!"},{"say": "Sind nur noch <b>fünf Gänse oder weniger</b> übrig, können sie den Fuchs nicht mehr einkreisen – der Fuchs gewinnt. Ein Remis gibt es nicht: Der Fuchs gewinnt auch, wenn dieselbe Stellung dreimal entsteht oder nach je 40 Zügen ohne Schlag."},{"say": "Normalerweise spielt man mit <b>15 Gänsen</b>. Es gibt auch <b>17 Gänse</b>, die nur vorwärts oder seitwärts ziehen, die älteste Form mit <b>13 Gänsen (traditionell)</b>, die auch zurück dürfen, und <b>13 Gänse (kein Rückzug)</b>. Und jetzt: spielen wir!"}]},
    hi: {"name": "डोमिनोडक", "next": "आगे", "back": "पीछे", "start": "खेलकर देखें", "again": "फिर से", "tap": "चमकती जगह पर टैप करें", "nope": "वहाँ नहीं जा सकते!", "ownF": "लोमड़ी पर टैप करो", "ownG": "किसी कलहंस पर टैप करो", "want": "इस बार वही चाल ढूँढो जो मैंने कही थी", "more": "लोमड़ी और कूद सकती है! अगले चमकते बिंदु पर टैप करो", "s":[{"say": "क्वैक! मैं <b>डोमिनोडक</b> हूँ। आओ <b>लोमड़ी और कलहंस</b> सीखें — यूरोप में सैकड़ों सालों से खेला जाने वाला शिकार का खेल: एक लोमड़ी बनाम कलहंसों का झुंड।"},{"say": "बोर्ड क्रॉस के आकार का है और उसमें <b>33 बिंदु</b> हैं। मोहरे रेखाओं पर एक बिंदु से दूसरे बिंदु तक चलते हैं। लोमड़ी बीच में और 15 कलहंस पास वाली तरफ़ से शुरू करते हैं। पहले <b>लोमड़ी</b> चलती है।"},{"say": "लोमड़ी रेखा के साथ <b>बगल के खाली बिंदु</b> पर एक कदम चलती है — आगे, पीछे, बगल में, और जहाँ रेखा हो वहाँ तिरछे भी। लोमड़ी पर टैप करो और उसे एक कदम चलाओ!", "done": "बिल्कुल सही!"},{"say": "अगर लोमड़ी के बगल में कलहंस हो और <b>उसके ठीक पीछे का बिंदु खाली हो</b>, तो लोमड़ी उसके ऊपर से कूदकर उसे ले सकती है। लेना कभी ज़रूरी नहीं। कलहंस के ऊपर से कूदकर चमकते बिंदु पर जाओ!", "done": "गप्प! एक कलहंस ले लिया।"},{"say": "जहाँ उतरे वहाँ से फिर कूद सकती हो तो <b>उसी चाल में लगातार</b> ले सकती है, दिशा बदलकर भी। चमकते बिंदु तक लगातार दो कलहंस लो!", "done": "दो कलहंस! बीच में रुकना हो तो जिस बिंदु पर रुकना है उस पर एक बार और टैप करो।"},{"say": "अब कलहंसों की बारी। कलहंस भी रेखा के साथ <b>बगल के खाली बिंदु</b> पर एक कदम चलता है, पर सिर्फ़ <b>आगे, बगल में या तिरछे आगे</b>; पीछे कभी नहीं। कलहंस कूद नहीं सकते और लोमड़ी को ले भी नहीं सकते। एक कलहंस को एक कदम चलाओ!", "done": "शाबाश!"},{"say": "जिस कलहंस के ठीक पीछे साथी हो, उसके <b>ऊपर से कूदा नहीं जा सकता</b>। अभी लोमड़ी के सामने वाले कलहंस के पीछे का बिंदु खाली है — वह ख़तरे में है। लोमड़ी को कूदने से रोको!", "done": "अब लोमड़ी के पास कोई छलाँग नहीं।"},{"say": "जब लोमड़ी <b>न चल सके और न कूद सके</b>, तो कलहंस जीत जाते हैं! तरकीब यह है कि रास्ता रोकने वाले हर कलहंस के ठीक पीछे भी साथी रखो। कलहंस को चमकते बिंदु पर ले जाओ और लोमड़ी को बंद कर दो!", "done": "लोमड़ी हिल नहीं सकती। कलहंस जीत गए!"},{"say": "<b>पाँच या कम कलहंस</b> बचें तो वे लोमड़ी को घेर नहीं सकते, इसलिए लोमड़ी जीतती है। यहाँ खेल बराबर नहीं होता: वही स्थिति तीन बार आए, या दोनों की 40-40 चालें बिना किसी कब्ज़े के निकल जाएँ, तो भी लोमड़ी जीतती है।"},{"say": "आम तौर पर <b>15 कलहंसों</b> से खेला जाता है। इसके अलावा सिर्फ़ आगे या बगल में चलने वाले <b>17 कलहंस</b>, पीछे भी हट सकने वाला सबसे पुराना <b>13 कलहंस (पारंपरिक)</b>, और <b>13 कलहंस (पीछे नहीं)</b> भी हैं। चलो, खेलते हैं!"}]},
    ar: {"name": "دومينو دك", "next": "التالي", "back": "رجوع", "start": "لنلعب", "again": "مرة أخرى", "tap": "انقر نقطة متوهجة", "nope": "لا يمكن الذهاب إلى هناك!", "ownF": "المس الثعلب", "ownG": "المس إوزة", "want": "ابحث هذه المرة عن النقلة التي طلبتها", "more": "يستطيع متابعة القفز! المس النقطة المضيئة التالية", "s":[{"say": "كواك! أنا <b>دومينو دك</b>. سأعرّفك على <b>الثعلب والإوز</b>، لعبة صيد تُلعب في أوروبا منذ مئات السنين: ثعلب واحد أمام سرب من الإوز."},{"say": "اللوحة على شكل صليب فيه <b>33 نقطة</b>، والقطع تتحرك على الخطوط من نقطة إلى نقطة. يبدأ الثعلب في الوسط، والإوزات الخمس عشرة في الجهة القريبة. <b>الثعلب</b> يتحرك أولًا."},{"say": "يتحرك الثعلب خطوة واحدة إلى <b>نقطة فارغة مجاورة</b> على خط: إلى الأمام والخلف والجانبين، وقُطريًّا حيث يوجد خط. المس الثعلب وحرّكه خطوة!", "done": "أحسنت!"},{"say": "إذا كانت بجوار الثعلب إوزة و<b>النقطة التي خلفها مباشرة فارغة</b> استطاع أن يقفز فوقها ويأخذها. الأخذ ليس إلزاميًّا أبدًا. اقفز فوق الإوزة إلى النقطة المضيئة!", "done": "هَم! أُخذت إوزة."},{"say": "إذا استطاع القفز مرة أخرى من حيث هبط أخذها كلها <b>في النقلة نفسها</b>، ولو غيّر اتجاهه. خذ إوزتين متتاليتين حتى النقطة المضيئة!", "done": "إوزتان! إذا أردت التوقف في الطريق فالمس نقطة التوقف مرة أخرى."},{"say": "الآن دور الإوز. تتحرك الإوزة أيضًا خطوة إلى <b>نقطة فارغة مجاورة</b> على خط، لكن فقط <b>إلى الأمام أو إلى الجانب أو قُطريًّا إلى الأمام</b>؛ ولا تتراجع أبدًا. الإوز لا يقفز ولا يستطيع أخذ الثعلب. حرّك إوزة خطوة واحدة!", "done": "جميل!"},{"say": "الإوزة التي خلفها مباشرة رفيقة <b>لا يمكن القفز فوقها</b>. الآن الإوزة التي أمام الثعلب خلفها نقطة فارغة، فهي في خطر. امنع الثعلب من القفز!", "done": "الآن لا قفزة للثعلب."},{"say": "حين <b>لا يستطيع الثعلب أن يخطو ولا أن يقفز</b> يفوز الإوز! والحيلة أن تسند كل إوزة تسدّ طريقه بأخرى خلفها. حرّك إوزة إلى النقطة المضيئة واحبس الثعلب!", "done": "الثعلب لا يستطيع الحركة. فاز الإوز!"},{"say": "إذا بقيت <b>خمس إوزات أو أقل</b> لم تعد قادرة على تطويق الثعلب، فيفوز الثعلب. ولا تعادل هنا: يفوز الثعلب أيضًا إذا تكرر الوضع نفسه ثلاث مرات، أو بعد 40 نقلة لكل طرف بلا أخذ."},{"say": "اللعب المعتاد بـ<b>15 إوزة</b>. وهناك أيضًا <b>17 إوزة</b> لا تتحرك إلا إلى الأمام أو إلى الجانب، وأقدم الأشكال <b>13 إوزة (تقليدية)</b> التي يمكنها التراجع، و<b>13 إوزة (بلا تراجع)</b>. هيا نلعب!"}]},
    ru: {"name": "Доминоутка", "next": "Далее", "back": "Назад", "start": "Сыграем", "again": "Ещё раз", "tap": "Нажми на светящееся место", "nope": "Туда пойти нельзя!", "ownF": "Коснись лисы", "ownG": "Коснись гуся", "want": "На этот раз найди ход, о котором я просила", "more": "Можно прыгать дальше! Коснись следующей светящейся точки", "s":[{"say": "Кря! Я <b>Доминоутка</b>. Покажу тебе <b>«Лису и гусей»</b> — охотничью игру, в которую в Европе играют сотни лет: одна лиса против стаи гусей."},{"say": "Доска — крест из <b>33 точек</b>, фигуры ходят по линиям от точки к точке. Лиса начинает в центре, 15 гусей — на ближней стороне. Первой ходит <b>лиса</b>."},{"say": "Лиса делает шаг на <b>соседнюю свободную точку</b> по линии: вперёд, назад, вбок, а где есть линия — и по диагонали. Коснись лисы и сделай шаг!", "done": "Именно так!"},{"say": "Если рядом с лисой гусь и <b>точка прямо за ним свободна</b>, лиса может перепрыгнуть через него и взять. Брать не обязательно. Перепрыгни через гуся на светящуюся точку!", "done": "Ам! Один гусь взят."},{"say": "Если с места приземления можно прыгнуть снова, лиса берёт всех <b>за один ход</b> — можно и менять направление. Возьми двух гусей подряд, до светящейся точки!", "done": "Два гуся! Чтобы остановиться по пути, коснись ещё раз точки, где останавливаешься."},{"say": "Теперь гуси. Гусь тоже делает шаг на <b>соседнюю свободную точку</b> по линии — но только <b>вперёд, вбок или по диагонали вперёд</b>, назад никогда. Гуси не прыгают и взять лису не могут. Сходи одним гусем на один шаг!", "done": "Отлично!"},{"say": "Через гуся, за которым прямо стоит товарищ, <b>перепрыгнуть нельзя</b>. Сейчас у гуся перед лисой за спиной пусто — он под ударом. Не дай лисе прыгнуть!", "done": "Теперь у лисы нет прыжка."},{"say": "Когда лиса <b>не может ни шагнуть, ни прыгнуть</b>, побеждают гуси! Секрет — прикрывать сзади каждого гуся, который закрывает ей путь. Поставь гуся на светящуюся точку и запри лису!", "done": "Лиса не может ходить. Гуси победили!"},{"say": "Если гусей осталось <b>пять или меньше</b>, окружить лису уже нельзя — побеждает лиса. Ничьих здесь нет: лиса побеждает и при троекратном повторении позиции, и после 40 ходов каждой стороны без взятий."},{"say": "Обычно играют с <b>15 гусями</b>. Есть ещё <b>17 гусей</b>, которые ходят только вперёд или вбок, самый старый вариант — <b>13 гусей (традиционные)</b>, где можно ходить назад, и <b>13 гусей (без отступления)</b>. Ну что, сыграем!"}]},
    "zh-TW": {"name": "骨牌鴨鴨", "next": "下一步", "back": "返回", "start": "來玩吧", "again": "再一次", "tap": "點擊發光的地方", "nope": "不能走到那裡喔", "ownF": "請輕點狐狸", "ownG": "請輕點一隻鵝", "want": "這次請找出題目要的那一步", "more": "還能繼續跳！輕點下一個發光的點", "s":[{"say": "嘎！我是<b>骨牌鴨鴨</b>。帶你認識在歐洲玩了幾百年的狩獵遊戲——<b>狐狸與鵝</b>：一隻狐狸對一群鵝。"},{"say": "棋盤是十字形，共有<b>33個點</b>，棋子沿著線從一個點走到另一個點。狐狸在正中間，15隻鵝排在靠近自己的一側。先走的是<b>狐狸</b>。"},{"say": "狐狸可以沿著線走到<b>相鄰的空點</b>，前後左右都行，有線的地方還能斜走。輕點狐狸，讓牠走一步吧！", "done": "就是這樣！"},{"say": "旁邊有鵝，而且<b>牠正後方的點是空的</b>，狐狸就能跳過去把牠吃掉。吃不吃由你決定。跳過那隻鵝，落到發光的點上！", "done": "啊嗚！吃掉一隻。"},{"say": "落地後如果還能再跳，可以<b>在同一步裡連續</b>吃，轉彎也沒關係。一直跳到發光的點，連吃兩隻吧！", "done": "吃掉兩隻！想中途停下時，再點一次停下的那個點就行。"},{"say": "現在輪到鵝。鵝也是沿著線走到<b>相鄰的空點</b>，一次一步，但只能<b>向前、向兩側或斜前方</b>走，不能後退。鵝不能跳，也吃不了狐狸。讓一隻鵝走一步吧！", "done": "很好！"},{"say": "正後方有同伴的鵝<b>不會被跳過</b>。現在狐狸面前那隻鵝身後是空的，正被盯著呢。別讓狐狸跳過去！", "done": "這下狐狸跳不了了。"},{"say": "狐狸<b>一步也走不了，也跳不了</b>時，鵝就贏了！訣竅是在擋路的鵝正後方也放上同伴。把鵝走到發光的點，把狐狸關起來！", "done": "狐狸動不了了，鵝獲勝！"},{"say": "鵝只剩<b>5隻或更少</b>時，就圍不住狐狸了，狐狸獲勝。這裡沒有和棋：同一局面出現三次，或雙方各40步都沒有吃子，也算狐狸獲勝。"},{"say": "平時玩的是<b>15隻鵝</b>的規則。另外還有只能向前或向兩側走的<b>17隻鵝</b>、能後退的最古老的<b>13隻鵝（傳統）</b>，以及不能後退的<b>13隻鵝（不後退）</b>。來，下一盤吧！"}]},
    id: {"name": "Dominoduck", "next": "Berikutnya", "back": "Kembali", "start": "Ayo main", "again": "Lagi", "tap": "Ketuk tempat yang menyala", "nope": "Tidak bisa ke sana!", "ownF": "Ketuk rubah", "ownG": "Ketuk seekor angsa", "want": "Kali ini, cari langkah yang kuminta", "more": "Masih bisa melompat! Ketuk titik bersinar berikutnya", "s":[{"say": "Kwek! Aku <b>Dominoduck</b>. Ayo kenalan dengan <b>Rubah dan Angsa</b>, permainan berburu yang sudah dimainkan di Eropa selama ratusan tahun: seekor rubah melawan sekawanan angsa."},{"say": "Papannya berbentuk salib dengan <b>33 titik</b>, dan bidak bergerak di sepanjang garis dari titik ke titik. Rubah mulai di tengah, 15 angsa di sisi dekat. <b>Rubah</b> melangkah lebih dulu."},{"say": "Rubah melangkah satu kali ke <b>titik kosong di sebelahnya</b> mengikuti garis: maju, mundur, menyamping, dan diagonal bila ada garisnya. Ketuk rubah dan gerakkan satu langkah!", "done": "Betul!"},{"say": "Kalau ada angsa di sebelah rubah dan <b>titik tepat di belakangnya kosong</b>, rubah bisa melompatinya dan mengambilnya. Menangkap tidak pernah wajib. Lompati angsa itu ke titik yang bersinar!", "done": "Hap! Satu angsa ditangkap."},{"say": "Kalau dari tempat mendaratnya rubah bisa melompat lagi, semuanya diambil <b>dalam satu langkah</b> — berganti arah pun boleh. Tangkap dua angsa berturut-turut sampai titik yang bersinar!", "done": "Dua angsa! Kalau ingin berhenti di tengah jalan, ketuk sekali lagi titik tempat kamu berhenti."},{"say": "Sekarang giliran angsa. Angsa juga melangkah satu kali ke <b>titik kosong di sebelahnya</b> mengikuti garis, tetapi hanya <b>maju, ke samping, atau diagonal maju</b>; tidak pernah mundur. Angsa tidak bisa melompat dan tidak bisa mengambil rubah. Gerakkan seekor angsa satu langkah!", "done": "Bagus!"},{"say": "Angsa yang punya teman tepat di belakangnya <b>tidak bisa dilompati</b>. Saat ini angsa di depan rubah punya titik kosong di belakangnya — ia terancam. Jangan biarkan rubah melompat!", "done": "Sekarang rubah tidak punya lompatan."},{"say": "Kalau rubah <b>tidak bisa melangkah dan tidak bisa melompat</b>, angsa menang! Kuncinya: beri teman di belakang setiap angsa yang menghalangi jalannya. Pindahkan angsa ke titik yang bersinar dan kurung rubah!", "done": "Rubah tidak bisa bergerak. Angsa menang!"},{"say": "Kalau angsa tinggal <b>lima atau kurang</b>, mereka tidak bisa lagi mengepung rubah, jadi rubah menang. Tidak ada seri: rubah juga menang jika posisi yang sama muncul tiga kali, atau setelah 40 langkah masing-masing tanpa tangkapan."},{"say": "Biasanya dimainkan dengan <b>15 angsa</b>. Ada juga <b>17 angsa</b> yang hanya maju atau menyamping, bentuk tertua <b>13 angsa (tradisional)</b> yang boleh mundur, dan <b>13 angsa (tanpa mundur)</b>. Nah, ayo bermain!"}]},
    tr: {"name": "Dominoduck", "next": "İleri", "back": "Geri", "start": "Hadi oynayalım", "again": "Tekrar", "tap": "Parlayan yere dokun", "nope": "Oraya gidemez!", "ownF": "Tilkiye dokun", "ownG": "Bir kaza dokun", "want": "Bu sefer istediğim hamleyi bul", "more": "Atlamaya devam edebilir! Sıradaki parlayan noktaya dokun", "s":[{"say": "Vak! Ben <b>Dominoduck</b>. Sana Avrupa’da yüzyıllardır oynanan bir av oyununu, <b>Tilki ve Kazlar</b>’ı tanıtacağım: bir tilki bir kaz sürüsüne karşı."},{"say": "Tahta <b>33 noktalı</b> bir haç biçiminde; taşlar çizgiler boyunca noktadan noktaya gider. Tilki ortada, 15 kaz yakın tarafta başlar. İlk hamleyi <b>tilki</b> yapar."},{"say": "Tilki, bir çizgi boyunca <b>yanındaki boş noktaya</b> bir adım atar: ileri, geri, yana, çizgi varsa çapraz da. Tilkiye dokun ve bir adım oynat!", "done": "İşte böyle!"},{"say": "Tilkinin yanında bir kaz varsa ve <b>hemen arkasındaki nokta boşsa</b>, tilki üzerinden atlayıp onu alabilir. Almak hiçbir zaman zorunlu değil. Kazın üzerinden parlayan noktaya atla!", "done": "Ham! Bir kaz alındı."},{"say": "İndiği yerden yeniden atlayabiliyorsa hepsini <b>aynı hamlede</b> alır; yön değiştirmek de serbest. Parlayan noktaya kadar art arda iki kaz al!", "done": "İki kaz! Yolda durmak istersen, duracağın noktaya bir kez daha dokun."},{"say": "Şimdi kazlar. Kaz da bir çizgi boyunca <b>yanındaki boş noktaya</b> bir adım atar; ama yalnızca <b>ileri, yana ya da çapraz ileri</b>, asla geri değil. Kazlar atlayamaz ve tilkiyi alamaz. Bir kazı bir adım oynat!", "done": "Güzel!"},{"say": "Hemen arkasında arkadaşı olan bir kazın <b>üzerinden atlanamaz</b>. Şu anda tilkinin önündeki kazın arkası boş; tehlikede. Tilkinin atlamasını engelle!", "done": "Artık tilkinin atlayışı yok."},{"say": "Tilki <b>ne adım atabiliyor ne de atlayabiliyorsa</b> kazlar kazanır! Püf noktası: yolu kapatan her kazın arkasına da bir arkadaş koymak. Bir kazı parlayan noktaya götür ve tilkiyi kapat!", "done": "Tilki hareket edemiyor. Kazlar kazandı!"},{"say": "<b>Beş ya da daha az kaz</b> kalırsa artık tilkiyi kuşatamazlar; tilki kazanır. Beraberlik yok: aynı konum üç kez oluşursa ya da iki tarafın da 40’ar hamlesi taş alınmadan geçerse de tilki kazanır."},{"say": "Genellikle <b>15 kazla</b> oynanır. Ayrıca yalnızca ileri ya da yana giden <b>17 kaz</b>, geriye de gidebilen en eski biçim <b>13 kaz (geleneksel)</b> ve <b>13 kaz (geri adım yok)</b> da var. Hadi oynayalım!"}]},
  };

  /* ---------- little sounds: stone clacks, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const clack = () => { tone(900, 420, .09, .07, 'triangle'); tone(210, 110, .1, .14); };
    const hop = () => tone(1400, 1100, .06, .035, 'triangle');
    const take = () => tone(620, 1240, .12, .05, 'triangle');
    const flip = () => { tone(880, 440, .14, .05, 'triangle'); tone(300, 150, .08, .12, 'sine', .16); };
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { clack, hop, take, flip, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, F3 = T3.foxgeese;
    const board = F3.board(); T3.show('foxgeese', board); T3.play(true);
    const U = board.userData, TOP = U.top, Y = U.top - U.sink;
    if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.2, y: TOP + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const idx = s => (N - +s.slice(1)) * N + 'abcdefg'.indexOf(s[0]);
    const xz = i => U.pt(i % N, Math.floor(i / N));
    const specOf = st => { const a = Array(N * N).fill('.'); st.g.forEach(s => { a[idx(s)] = 'g'; }); a[idx(st.f)] = 'f'; return { b: a.join(''), side: st.side === 2 ? 2 : 1 }; };

    /* ---------- pieces ---------- */
    function mk(col) { const g = U.piece(col), sh = T3.contact(F3.R * (col === 1 ? 1.2 : .95), .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SFX.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    function setBoard() {   // diff against the pieces already on the board: the same ones stay still, only new ones drop in
      const old = pcs; pcs = {};
      let n = 0;
      for (const i of E.POINTS) {
        const c = pos.owner(i); if (!c) continue;
        const o = old[i];
        if (o && o.userData.col === c) { delete old[i]; pcs[i] = o; const [x, z] = xz(i); o.visible = true; o.position.x = x; o.position.z = z; o.scale.set(1, 1, 1); o.rotation.z = 0; lift(o, 0); continue; }
        const g = mk(c), [x, z] = xz(i); g.position.set(x, Y, z); pcs[i] = g;
        g.visible = false; const d = 40 + (n++) * 24;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); }); }, d);
      }
      Object.values(old).forEach(drop);
      return n;
    }
    const HOP = 320;
    function travel(g, path, done) {
      const pts = path.map(xz), legs = path.length - 1, h0 = g.userData.h0 || 0, hopped = [];
      const far = k => { const a = E.RC[path[k]], b = E.RC[path[k + 1]]; return Math.abs(a[0] - b[0]) === 2 || Math.abs(a[1] - b[1]) === 2; };
      anim(legs * (far(0) ? HOP : 240), k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q0 = r - i, jump = far(i), q = jump ? q0 : io(q0), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; if (jump) SFX.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * (jump ? .7 : .07) + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); land(g); SFX.clack(); if (done) done(); });
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const bm = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function tile(i, color, op = .45, pulse = true) { const g = new TH.CircleGeometry(.38, 40); g.rotateX(-Math.PI / 2); const m = new TH.Mesh(g, bm(color, op)); const [x, z] = xz(i); m.position.set(x, TOP + .004, z); m.userData.pulse = pulse; m.userData.flat = true; m.renderOrder = 2; marks.add(m); return m; }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.14, .14, .012, 28), bm(color, .9)); const [x, z] = xz(i); m.position.set(x, TOP + .02, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color) { const m = new TH.Mesh(new TH.TorusGeometry(.42, .032, 8, 44), bm(color, .95)); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, TOP + .05, z); m.userData.pulse = true; m.userData.torus = true; m.renderOrder = 2; marks.add(m); return m; }
    // the marks' pulse runs only while something pulses (0 frames otherwise); a mark added starts it again
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .88 + k * .24; m.scale.set(s, m.userData.torus ? s : 1, s); } m.material.opacity = (m.userData.flat ? .25 : .45) + k * (m.userData.flat ? .3 : .5); } }); if (any && T3.kick) T3.kick(60); pulseOn = any && !stopped; if (pulseOn) requestAnimationFrame(pulse); }
    { const add0 = marks.add.bind(marks), rm0 = marks.remove.bind(marks); marks.add = (...a) => { const r = add0(...a); if (T3.kick) T3.kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; marks.remove = (...a) => { if (T3.kick) T3.kick(150); return rm0(...a); }; }
    pulse();
    // the moves the task accepts (from the engine)
    const same = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    function accepted(st) {
      const all = pos.moves();
      if (st.act === 'fstep' || st.act === 'gstep') return all.filter(m => !E.jumped(m).length);
      if (st.act === 'jump') return all.filter(m => E.jumped(m).length === 1);
      if (st.act === 'double') return all.filter(m => same(E.path(m), st.path.map(idx)));
      if (st.act === 'guard') return all.filter(m => !pos.clone().play(m).foxJumps());
      if (st.act === 'trap') return all.filter(m => { const j = E.judge(pos.clone().play(m)); return j.over && j.winner === 2; });
      return [];
    }
    const startsWith = (m, pre) => { const p = E.path(m); return p.length >= pre.length && pre.every((x, k) => p[k] === x); };
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (!st.act || played) return;
      (st.warn || []).forEach(s => ring(idx(s), 0xff9a4a));
      if (sel) {
        const k = sel.length; ring(sel[k - 1], 0xffc94a);
        new Set(accepted(st).filter(m => startsWith(m, sel) && E.path(m).length > k).map(m => E.path(m)[k])).forEach(i => dot(i, 0x3fe0c4));
        return;
      }
      new Set(accepted(st).map(E.mFrom)).forEach(f => ring(f, 0x3fe0c4));
      (st.target || []).forEach(s => tile(idx(s), 0x3fe0c4, .4));
      if (st.path) st.path.slice(1, -1).forEach(s => dot(idx(s), 0x8fd8ff));
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
      const st = STEPS[step], wait = (st.act || st.demo) && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = (window.TapWord ? TapWord.fix : x => x)(st.last ? L.start + ' ▶' : wait && st.act ? L.tap : L.next + ' ▶');
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
      pos = E.Pos.from(specOf(st));
      const cnt = setBoard();
      later(showTask, 380 + cnt * 24);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (STEPS[step].act === 'trap') Object.values(pcs).forEach(g => { if (g.userData.col === 2) anim(700, k => lift(g, Math.sin(k * Math.PI) * .4)); });
      buttons(); autoNext();
    }
    function pointOf(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      const c = Math.round(p.x + (N - 1) / 2), r = Math.round(p.z + (N - 1) / 2);
      if (c < 0 || c > N - 1 || r < 0 || r > N - 1) return -1;
      const i = r * N + c; return E.ON[i] ? i : -1;
    }
    function liftSel(i, on) { const g = pcs[i]; if (!g) return; const h0 = g.userData.h0 || 0, h1 = on ? .2 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function play(m) {
      busy = true; clearMarks();
      const path = E.path(m), f = path[0], to = path[path.length - 1], caps = pos.owner(f) === 1 ? E.jumped(m) : [], g = pcs[f];
      caps.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c, k * HOP + HOP * .45); } });
      delete pcs[f]; pcs[to] = g; pos.play(m); sel = null;
      travel(g, path, () => later(finish, 260));
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = pointOf(e); if (i < 0) return;
      const A = accepted(st), me = pos.side + 1;
      if (sel) {
        const k = sel.length, go = A.filter(m => startsWith(m, sel) && E.path(m).length > k && E.path(m)[k] === i);
        if (go.length) {
          if (go.some(m => E.path(m).length === k + 1)) { play(go.find(m => E.path(m).length === k + 1)); return; }
          sel.push(i); SFX.clack(); showTask(); say(L.more); return;   // the landing point of the first jump: on to the next
        }
        if (k > 1) { say(L.more); return; }
      }
      if (pos.owner(i) === me) {
        if (sel && sel[0] === i) { liftSel(i, false); sel = null; showTask(); return; }
        if (!A.some(m => E.mFrom(m) === i)) { say(L.want); return; }
        if (sel) liftSel(sel[0], false);
        sel = [i]; liftSel(i, true); SFX.clack(); showTask(); return;
      }
      if (!sel) { say(me === 1 ? L.ownF : L.ownG); return; }
      const any = pos.moves().some(x => E.mFrom(x) === sel[0] && E.mTo(x) === i);
      say(any ? L.want : L.nope);
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
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule(E.DEFAULT_RULE || 'g15'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-foxgeese-rules-seen', '1'); } catch (e) {}
    const dbg = { marks: () => marks.children.length, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(m => ({ from: E.mFrom(m), to: E.mTo(m), path: E.path(m), name: E.name(pos, m) })) : null, sel: () => sel, at: i => { const [x, z] = xz(i); return T3.project(x, z, TOP); }, step: () => step, steps: STEPS.length, act: () => STEPS[step].act || null, played: () => played, busy: () => busy, go: n => go(n) };
    window.__fgRules = dbg;
    return {
      stop() { stopped = true; if (window.__fgRules === dbg) delete window.__fgRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.foxgeese = { start };
})();
