/* =====================================================================
   Backgammon rules — a guided tour on the 3D table, told by the guide
   character (Dicepup). A short hands-on scenario on the marquetry board:
   setup and direction, rolling, moving by each die, doubles, hitting and
   entering from the bar, making points / a prime, bearing off, winning
   (gammon / backgammon) and the doubling cube.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart() }
   Points are given in the gold player's numbering (24 → 1, home = 1–6 bottom right).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-dice.webp';
  const TXT = {
    ja: {
      name: 'ダイスン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', roll: '盤をタップして振る', nope: 'そこには動けないよ〜', gammon: 'ギャモン ×2', bg: 'バックギャモン ×3', take: '受ける', drop: '降りる',
      s: [
        { say: 'ワン！ ぼくは<b>ダイスン</b>、サイコロの子犬だよ。この寄木細工の豪華な盤で、バックギャモンのルールをいっしょに覚えよう！' },
        { say: '盤には三角の<b>ポイント</b>が24本、駒は1人<b>15個</b>。金のふちの駒が<b>きみ</b>、プラチナのふちの黒い駒が<b>相手</b>だよ。光っている右下の6本が<b>きみのインナー（ホーム）</b>。全部の駒をここへ集めて、先に<b>盤の外へ上げきったら勝ち</b>！' },
        { say: '進む向きは決まっていて、きみは<b>24 → 1</b>へ。上の段を右から左へ、下の段に降りて左から右へ、ぐるっとU字に回るよ。相手はその<b>逆向き</b>に進むんだ。' },
        { say: '番が来たら、まず<b>サイコロを2個振る</b>。盤をタップして振ってみて！', done: '<b>5</b>と<b>3</b>！ 1個の駒を5と3で合わせて8つ進めても、2個の駒を別々に5と3進めてもいいよ。' },
        { say: '目は<b>1個ずつ別の動き</b>になる。<b>3</b>の目で、8の駒を3つ先の<b>5</b>へ動かしてみて！', done: 'つぎに<b>1</b>の目で6の駒も5へ。<b>2個以上</b>そろったポイントには相手が止まれない。これが<b>ポイントを作る</b>ってこと！' },
        { say: '同じ目が2つ出たら<b>ゾロ目</b>。その目で<b>4回</b>動けるんだ！ 2のゾロ目で、13の駒を5まで進めよう！', done: 'ピョン、ピョン、ピョン、ピョン！ 2×4で8つ進んだね。' },
        { say: '1個だけの駒は<b>ブロット</b>。相手のブロットに止まると<b>ヒット</b>して、その駒を真ん中の<b>バー</b>へ追い出せるよ。3の目で10の黒い駒をヒットしよう！', done: 'ヒット！ 黒い駒はバーに乗って、スタートからやり直しだ。' },
        { say: 'バーに駒があると、それを<b>相手のインナーへ入れ直す（エンター）</b>まで、ほかの駒は動かせない。6の目の19は黒が2個で<b>ふさがれて</b>いるから、4の目で<b>21</b>へ入れよう！', done: '入った！ 相手の駒が2個以上あるポイントには、入ることも止まることもできないんだ。' },
        { say: 'ポイントを並べて作ると、相手の通り道を<b>ふさげる</b>。8の駒を3の目で5へ動かして、4〜9の<b>6連続の壁（プライム）</b>を完成させよう！', done: '完成！ 6つ続いた壁は飛び越えられないから、うしろの黒い駒は出られないよ。' },
        { say: '15個ぜんぶがインナーに入ったら、<b>ベアオフ</b>（駒を盤の外へ上げる）ができる。6の目で、6の駒を右の<b>トレイ</b>へ上げてみて！', done: 'カタン！ いちばん遠い駒より大きい目が出たときは、その駒を上げてもいいんだ。' },
        { say: '先に15個を上げきったら勝ち！ 相手が1個も上げていなければ<b>ギャモン</b>で2倍、さらに相手の駒がバーかきみのインナーに残っていたら<b>バックギャモン</b>で3倍の勝ちだよ。' },
        { say: '<b>ダブリングキューブ</b>は賭け点を倍にする道具。自分の番でサイコロを振る前に「ダブル」と申し込めて、相手は<b>受ける</b>（点が2倍、キューブは相手のもの）か、<b>降りる</b>（今の点で負け）かを選ぶんだ。' },
        { say: 'これでルールはばっちり！ コツは、ブロットをなるべく残さず、ポイントをつなげて壁を作ること。くわしい作戦はレッスンで覚えよう。さあ、サイコロを振って対局だ！' },
      ],
    },
    en: {
      name: 'Dicepup', next: 'Next', back: 'Back', start: 'Let\'s play', again: 'Again', tap: 'Tap the glowing spot', roll: 'Tap the board to roll', nope: 'It can\'t go there!', gammon: 'Gammon ×2', bg: 'Backgammon ×3', take: 'Take', drop: 'Drop',
      s: [
        { say: 'Woof! I\'m <b>Dicepup</b>, the dice puppy. Let\'s learn backgammon together on this fine marquetry board!' },
        { say: 'The board has 24 triangles called <b>points</b>, and each player has <b>15 checkers</b>. The gold-rimmed ones are <b>yours</b>, the black ones with platinum rims are your <b>opponent\'s</b>. The six glowing points at the bottom right are <b>your home board</b>. Bring every checker home, then be the first to <b>bear them all off</b> to win!' },
        { say: 'Everyone moves one way: you go from <b>24 to 1</b> — right to left along the top, then down and left to right along the bottom, in a U. Your opponent moves the <b>opposite way</b>.' },
        { say: 'On your turn you first <b>roll two dice</b>. Tap the board to roll!', done: '<b>5</b> and <b>3</b>! Move one checker 5 and then 3 (8 in all), or move two checkers, one 5 and one 3.' },
        { say: 'Each die is <b>a separate move</b>. Use the <b>3</b> to move a checker from 8 three points on to <b>5</b>!', done: 'Now the <b>1</b> brings a checker from 6 to 5 too. With <b>two or more</b> checkers there, your opponent can\'t land on it — you\'ve <b>made a point</b>!' },
        { say: 'Rolling the same number twice is a <b>double</b>: you play that number <b>four times</b>! With double 2s, move the checker from 13 all the way to 5!', done: 'Hop, hop, hop, hop! Four 2s — eight points.' },
        { say: 'A lone checker is a <b>blot</b>. Land on an opposing blot to <b>hit</b> it and send it to the <b>bar</b> in the middle. Hit the black checker on 10 with your 3!', done: 'Hit! The black checker goes to the bar and must start over.' },
        { say: 'With a checker on the bar you must first <b>enter it into your opponent\'s home board</b> before moving anything else. Point 19 (your 6) is <b>blocked</b> by two black checkers, so enter with the 4 on <b>21</b>!', done: 'In! You can never land on a point held by two or more opposing checkers.' },
        { say: 'Points in a row <b>block</b> your opponent\'s path. Move the checker from 8 to 5 with the 3 and finish a wall of <b>six points in a row — a prime</b> — from 4 to 9!', done: 'Done! A six-point prime can\'t be jumped, so the black checker behind it is trapped.' },
        { say: 'Once all 15 checkers are in your home board you may <b>bear off</b> — take them off the board. Bear the checker on 6 off into the <b>tray</b> with the 6!', done: 'Clack! If a die is higher than your farthest checker, you may bear that one off too.' },
        { say: 'Bear off all 15 first and you win! If your opponent hasn\'t borne off a single checker it\'s a <b>gammon</b> (double), and if one is still on the bar or in your home board it\'s a <b>backgammon</b> (triple)!' },
        { say: 'The <b>doubling cube</b> raises the stakes. Before rolling on your turn you may offer a double: your opponent either <b>takes</b> (the game is worth twice as much and they own the cube) or <b>drops</b> (and loses at the current value).' },
        { say: 'That\'s all the rules! Tips: leave as few blots as you can and build points next to each other. The lessons show you more strategy. Now roll the dice and play!' },
      ],
    },
    zh: {
      name: '骰子汪', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的位置', roll: '点击棋盘掷骰子', nope: '那里走不了哦！', gammon: '全胜 ×2', bg: '完胜 ×3', take: '接受', drop: '认输',
      s: [
        { say: '汪！我是<b>骰子汪</b>，一只骰子小狗。一起在这张精美的镶嵌木棋盘上学习双陆棋规则吧！' },
        { say: '棋盘上有24个三角形，叫作<b>点</b>；每人有<b>15枚棋子</b>。金色边的是<b>你</b>的，铂金边的黑棋是<b>对手</b>的。右下角发光的6个点是<b>你的内盘（主场）</b>。把所有棋子集中到这里，先把它们<b>全部移出棋盘</b>的一方获胜！' },
        { say: '移动方向是固定的：你从<b>24走向1</b>——上排从右往左，再到下排从左往右，绕一个U形。对手朝<b>相反方向</b>走。' },
        { say: '轮到你时，先<b>掷两颗骰子</b>。点击棋盘掷一下吧！', done: '<b>5</b>和<b>3</b>！可以让一枚棋子先走5再走3（共8步），也可以让两枚棋子分别走5和3。' },
        { say: '每颗骰子是<b>一次独立的移动</b>。用<b>3</b>把8点的棋子向前走3步到<b>5点</b>吧！', done: '接着用<b>1</b>把6点的棋子也走到5点。同一个点有<b>两枚以上</b>棋子，对手就不能停在那里——这就是<b>做点</b>！' },
        { say: '两颗骰子点数相同叫<b>双骰</b>，可以按这个点数走<b>四次</b>！用双2把13点的棋子一路走到5点！', done: '跳、跳、跳、跳！四个2，一共8步。' },
        { say: '单独一枚的棋子叫<b>孤子</b>。停到对手的孤子上就能<b>打掉</b>它，把它送到中间的<b>横栏</b>上。用3打掉10点的黑棋！', done: '打中了！黑棋上了横栏，要从头开始。' },
        { say: '横栏上有棋子时，必须先把它<b>重新放进对手的内盘</b>，才能走别的棋子。19点（你的6）被两枚黑棋<b>封住</b>了，所以用4进到<b>21点</b>吧！', done: '进来了！有两枚以上对手棋子的点，既不能进入也不能停留。' },
        { say: '连成一排的点能<b>挡住</b>对手的路。用3把8点的棋子走到5点，完成4到9点<b>连续六个点的墙（封锁）</b>！', done: '完成！六连点无法跳过，后面的黑棋出不来了。' },
        { say: '15枚棋子全部进入内盘后，就可以<b>移出</b>棋子了。用6把6点的棋子移到右边的<b>托盘</b>里！', done: '咔嗒！骰子点数比你最远的棋子还大时，也可以把那枚棋子移出。' },
        { say: '先移出全部15枚就赢了！如果对手一枚都没移出是<b>全胜</b>（2倍），如果对手还有棋子在横栏或你的内盘里，就是<b>完胜</b>（3倍）！' },
        { say: '<b>加倍骰</b>用来把赌注翻倍。轮到你掷骰前可以提出加倍，对手选择<b>接受</b>（分值翻倍，加倍骰归对方）或<b>认输</b>（按当前分值输掉）。' },
        { say: '规则就这些！诀窍：尽量少留孤子，把点连在一起做成墙。更多战术在课程里学习。来，掷骰子开始对局吧！' },
      ],
    },
    ko: {
      name: '다이슨', next: '다음', back: '이전', start: '대국하기', again: '다시', tap: '빛나는 곳을 탭하세요', roll: '판을 탭해서 굴리기', nope: '거기로는 갈 수 없어!', gammon: '개먼 ×2', bg: '백개먼 ×3', take: '받기', drop: '포기',
      s: [
        { say: '멍! 나는 주사위 강아지 <b>다이슨</b>이야. 이 멋진 상감 목재 판에서 백개먼 규칙을 함께 배워 보자!' },
        { say: '판에는 <b>포인트</b>라는 삼각형이 24개, 말은 한 사람당 <b>15개</b>. 금테 말이 <b>너</b>, 플래티넘 테두리의 검은 말이 <b>상대</b>야. 오른쪽 아래 빛나는 6개가 <b>너의 홈 보드</b>. 모든 말을 여기 모은 뒤 먼저 <b>판 밖으로 다 빼내면 승리</b>!' },
        { say: '움직이는 방향은 정해져 있어. 너는 <b>24 → 1</b>로, 윗줄을 오른쪽에서 왼쪽으로, 아랫줄을 왼쪽에서 오른쪽으로 U자로 돌아. 상대는 <b>반대 방향</b>이야.' },
        { say: '차례가 오면 먼저 <b>주사위 2개를 굴려</b>. 판을 탭해서 굴려 봐!', done: '<b>5</b>와 <b>3</b>! 말 하나를 5와 3으로 모두 8칸 움직여도 되고, 말 두 개를 각각 5와 3 움직여도 돼.' },
        { say: '주사위 하나하나가 <b>따로따로의 이동</b>이야. <b>3</b>으로 8의 말을 3칸 앞 <b>5</b>로 옮겨 봐!', done: '이어서 <b>1</b>로 6의 말도 5로. 말이 <b>2개 이상</b> 있는 포인트에는 상대가 멈출 수 없어. 이게 <b>포인트 만들기</b>야!' },
        { say: '같은 눈이 두 개 나오면 <b>더블</b>. 그 눈으로 <b>4번</b> 움직일 수 있어! 2 더블로 13의 말을 5까지 옮기자!', done: '깡총, 깡총, 깡총, 깡총! 2를 네 번, 8칸 갔네.' },
        { say: '혼자 있는 말은 <b>블롯</b>. 상대의 블롯에 멈추면 <b>히트</b>해서 가운데 <b>바</b>로 보낼 수 있어. 3으로 10의 검은 말을 히트하자!', done: '히트! 검은 말은 바에 올라가 처음부터 다시 시작해야 해.' },
        { say: '바에 말이 있으면 먼저 그 말을 <b>상대의 홈 보드에 다시 넣어야(엔터)</b> 다른 말을 움직일 수 있어. 19(너의 6)는 검은 말 2개로 <b>막혀</b> 있으니 4로 <b>21</b>에 넣자!', done: '들어갔다! 상대 말이 2개 이상 있는 포인트에는 들어갈 수도 멈출 수도 없어.' },
        { say: '포인트를 나란히 만들면 상대의 길을 <b>막을</b> 수 있어. 3으로 8의 말을 5로 옮겨 4~9의 <b>6연속 벽(프라임)</b>을 완성하자!', done: '완성! 6개가 이어진 벽은 뛰어넘을 수 없어서 뒤의 검은 말은 나올 수 없어.' },
        { say: '15개 말이 모두 홈 보드에 들어오면 <b>베어오프</b>(말을 판 밖으로 빼기)를 할 수 있어. 6으로 6의 말을 오른쪽 <b>트레이</b>로 빼 봐!', done: '딸깍! 가장 먼 말보다 큰 눈이 나오면 그 말을 빼도 돼.' },
        { say: '15개를 먼저 다 빼면 승리! 상대가 하나도 못 뺐으면 <b>개먼</b>으로 2배, 상대 말이 바나 너의 홈 보드에 남아 있으면 <b>백개먼</b>으로 3배 승리야!' },
        { say: '<b>더블링 큐브</b>는 판돈을 두 배로 만드는 도구야. 자기 차례에 주사위를 굴리기 전에 더블을 제안할 수 있고, 상대는 <b>받기</b>(점수 2배, 큐브는 상대 것) 또는 <b>포기</b>(현재 점수로 패배)를 골라.' },
        { say: '규칙은 이걸로 끝! 요령은 블롯을 되도록 남기지 않고, 포인트를 이어서 벽을 만드는 것. 자세한 작전은 레슨에서 배우자. 자, 주사위를 굴려 대국하자!' },
      ],
    },
    es: {
      name: 'Dicepup', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tap: 'Toca el punto brillante', roll: 'Toca el tablero para tirar', nope: '¡No puede ir ahí!', gammon: 'Gammon ×2', bg: 'Backgammon ×3', take: 'Aceptar', drop: 'Rechazar',
      s: [
        { say: '¡Guau! Soy <b>Dicepup</b>, el perrito dado. ¡Aprendamos juntos el backgammon en este precioso tablero de marquetería!' },
        { say: 'El tablero tiene 24 triángulos llamados <b>puntos</b> y cada jugador tiene <b>15 fichas</b>. Las de borde dorado son <b>tuyas</b>; las negras de borde platino, de tu <b>rival</b>. Los seis puntos que brillan abajo a la derecha son <b>tu casa</b>. Lleva allí todas tus fichas y ¡gana quien <b>las saque todas</b> primero!' },
        { say: 'Cada uno avanza en un sentido: tú vas del <b>24 al 1</b>: arriba de derecha a izquierda y luego abajo de izquierda a derecha, en U. Tu rival va en <b>sentido contrario</b>.' },
        { say: 'En tu turno, primero <b>tiras dos dados</b>. ¡Toca el tablero para tirar!', done: '¡<b>5</b> y <b>3</b>! Mueve una ficha 5 y luego 3 (8 en total), o dos fichas, una 5 y otra 3.' },
        { say: 'Cada dado es <b>un movimiento aparte</b>. ¡Usa el <b>3</b> para llevar una ficha del 8 al <b>5</b>!', done: 'Ahora el <b>1</b> lleva otra ficha del 6 al 5. Con <b>dos o más</b> fichas ahí, tu rival no puede caer en él: ¡has <b>hecho un punto</b>!' },
        { say: 'Si sacas el mismo número en los dos dados es un <b>doble</b>: ¡juegas ese número <b>cuatro veces</b>! Con doble 2, lleva la ficha del 13 hasta el 5.', done: '¡Salto, salto, salto, salto! Cuatro doses: ocho puntos.' },
        { say: 'Una ficha sola es una <b>ficha descubierta</b>. Si caes sobre una del rival la <b>golpeas</b> y la mandas a la <b>barra</b> del centro. ¡Golpea la ficha negra del 10 con tu 3!', done: '¡Golpe! La ficha negra va a la barra y tiene que empezar de nuevo.' },
        { say: 'Con una ficha en la barra, primero debes <b>meterla en la casa de tu rival</b> antes de mover otra. El 19 (tu 6) está <b>bloqueado</b> por dos negras, así que entra con el 4 en el <b>21</b>.', done: '¡Dentro! Nunca puedes caer en un punto con dos o más fichas rivales.' },
        { say: 'Los puntos seguidos <b>cierran el paso</b> a tu rival. Lleva la ficha del 8 al 5 con el 3 y completa un muro de <b>seis puntos seguidos —un prime—</b> del 4 al 9.', done: '¡Listo! Un prime de seis no se puede saltar: la ficha negra de detrás está atrapada.' },
        { say: 'Cuando tus 15 fichas están en casa puedes <b>sacarlas</b> del tablero. ¡Saca la ficha del 6 a la <b>bandeja</b> con el 6!', done: '¡Clac! Si un dado es mayor que tu ficha más lejana, también puedes sacar esa.' },
        { say: '¡Quien saque primero las 15 gana! Si tu rival no ha sacado ninguna es un <b>gammon</b> (doble), y si aún tiene una en la barra o en tu casa es un <b>backgammon</b> (triple).' },
        { say: 'El <b>cubo doblador</b> sube la apuesta. Antes de tirar en tu turno puedes ofrecer doblar: tu rival <b>acepta</b> (la partida vale el doble y el cubo es suyo) o <b>rechaza</b> (y pierde el valor actual).' },
        { say: '¡Ya sabes todas las reglas! Consejos: deja las menos fichas descubiertas posibles y haz puntos seguidos. En las lecciones verás más estrategia. ¡Tira los dados y a jugar!' },
      ],
    },
    fr: {
      name: 'Dicepup', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche la case lumineuse', roll: 'Touche le plateau pour lancer', nope: 'Elle ne peut pas aller là !', gammon: 'Gammon ×2', bg: 'Backgammon ×3', take: 'Accepter', drop: 'Refuser',
      s: [
        { say: 'Ouaf ! Je suis <b>Dicepup</b>, le chiot-dé. Apprenons ensemble le backgammon sur ce superbe plateau en marqueterie !' },
        { say: 'Le plateau a 24 triangles appelés <b>flèches</b> et chaque joueur a <b>15 dames</b>. Celles cerclées d\'or sont <b>à toi</b>, les noires cerclées de platine à ton <b>adversaire</b>. Les six flèches qui brillent en bas à droite forment <b>ton jan intérieur</b>. Ramène-y toutes tes dames, puis sois le premier à <b>toutes les sortir</b> pour gagner !' },
        { say: 'Chacun avance dans un sens : toi du <b>24 vers le 1</b> — en haut de droite à gauche, puis en bas de gauche à droite, en U. Ton adversaire va dans le <b>sens inverse</b>.' },
        { say: 'À ton tour, tu <b>lances deux dés</b>. Touche le plateau pour lancer !', done: '<b>5</b> et <b>3</b> ! Avance une dame de 5 puis de 3 (8 en tout), ou deux dames, l\'une de 5 et l\'autre de 3.' },
        { say: 'Chaque dé est <b>un déplacement à part</b>. Avec le <b>3</b>, avance une dame du 8 jusqu\'au <b>5</b> !', done: 'Puis le <b>1</b> amène aussi une dame du 6 au 5. Avec <b>deux dames ou plus</b>, l\'adversaire ne peut pas s\'y poser : tu as <b>fait une case</b> !' },
        { say: 'Deux dés identiques, c\'est un <b>doublé</b> : tu joues ce nombre <b>quatre fois</b> ! Avec un double 2, amène la dame du 13 jusqu\'au 5 !', done: 'Hop, hop, hop, hop ! Quatre 2 : huit flèches.' },
        { say: 'Une dame seule est une <b>dame découverte</b>. En t\'y posant, tu la <b>frappes</b> et l\'envoies sur la <b>barre</b> au milieu. Frappe la dame noire du 10 avec ton 3 !', done: 'Frappée ! La dame noire va sur la barre et doit tout recommencer.' },
        { say: 'Avec une dame sur la barre, tu dois d\'abord la <b>faire rentrer dans le jan de ton adversaire</b> avant de bouger autre chose. Le 19 (ton 6) est <b>bloqué</b> par deux noires : rentre avec le 4 sur le <b>21</b> !', done: 'Rentrée ! On ne peut jamais se poser sur une flèche tenue par deux dames adverses ou plus.' },
        { say: 'Des cases côte à côte <b>barrent la route</b>. Amène la dame du 8 au 5 avec le 3 et termine un mur de <b>six cases d\'affilée — un prime —</b> du 4 au 9 !', done: 'Terminé ! Un prime de six ne se saute pas : la dame noire derrière est enfermée.' },
        { say: 'Quand tes 15 dames sont dans ton jan intérieur, tu peux les <b>sortir</b>. Sors la dame du 6 dans le <b>plateau de sortie</b> avec le 6 !', done: 'Clac ! Si un dé dépasse ta dame la plus éloignée, tu peux aussi sortir celle-ci.' },
        { say: 'Sors tes 15 dames en premier et tu gagnes ! Si l\'adversaire n\'en a sorti aucune, c\'est un <b>gammon</b> (double), et s\'il en reste une sur la barre ou dans ton jan, un <b>backgammon</b> (triple) !' },
        { say: 'Le <b>videau</b> double l\'enjeu. Avant de lancer à ton tour, tu peux proposer de doubler : l\'adversaire <b>accepte</b> (la partie vaut le double et le videau est à lui) ou <b>refuse</b> (et perd la valeur actuelle).' },
        { say: 'Tu connais toutes les règles ! Astuces : laisse le moins de dames découvertes possible et fais des cases côte à côte. Les leçons t\'apprendront la stratégie. Lance les dés et joue !' },
      ],
    },
    pt: {
      name: 'Dicepup', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque no ponto brilhante', roll: 'Toque no tabuleiro para lançar', nope: 'Não pode ir para lá!', gammon: 'Gammon ×2', bg: 'Backgammon ×3', take: 'Aceitar', drop: 'Recusar',
      s: [
        { say: 'Au! Eu sou o <b>Dicepup</b>, o cachorrinho-dado. Vamos aprender gamão juntos neste lindo tabuleiro de marchetaria!' },
        { say: 'O tabuleiro tem 24 triângulos chamados <b>pontos</b>, e cada jogador tem <b>15 peças</b>. As de aro dourado são <b>suas</b>; as pretas de aro platinado, do <b>adversário</b>. Os seis pontos brilhando embaixo à direita são <b>a sua casa</b>. Leve todas as peças para lá e vença quem <b>tirar todas</b> primeiro!' },
        { say: 'Cada um anda num sentido: você vai do <b>24 ao 1</b> — em cima da direita para a esquerda, depois embaixo da esquerda para a direita, em U. O adversário vai no <b>sentido oposto</b>.' },
        { say: 'Na sua vez, primeiro <b>lance dois dados</b>. Toque no tabuleiro para lançar!', done: '<b>5</b> e <b>3</b>! Mova uma peça 5 e depois 3 (8 no total), ou duas peças, uma 5 e outra 3.' },
        { say: 'Cada dado é <b>um movimento separado</b>. Use o <b>3</b> para levar uma peça do 8 ao <b>5</b>!', done: 'Agora o <b>1</b> leva outra peça do 6 ao 5. Com <b>duas ou mais</b> peças ali, o adversário não pode parar nele: você <b>fez um ponto</b>!' },
        { say: 'Números iguais nos dois dados são uma <b>dupla</b>: você joga esse número <b>quatro vezes</b>! Com dupla de 2, leve a peça do 13 até o 5!', done: 'Pula, pula, pula, pula! Quatro 2: oito pontos.' },
        { say: 'Uma peça sozinha é uma <b>peça exposta</b>. Parando nela você a <b>acerta</b> e a manda para a <b>barra</b> no meio. Acerte a peça preta do 10 com o seu 3!', done: 'Acertou! A peça preta vai para a barra e tem de recomeçar.' },
        { say: 'Com uma peça na barra, você precisa primeiro <b>fazê-la entrar na casa do adversário</b> antes de mover outra. O 19 (seu 6) está <b>bloqueado</b> por duas pretas, então entre com o 4 no <b>21</b>!', done: 'Entrou! Nunca dá para parar num ponto com duas ou mais peças adversárias.' },
        { say: 'Pontos lado a lado <b>bloqueiam</b> o caminho do adversário. Leve a peça do 8 ao 5 com o 3 e complete um muro de <b>seis pontos seguidos — um prime —</b> do 4 ao 9!', done: 'Pronto! Um prime de seis não pode ser pulado: a peça preta de trás está presa.' },
        { say: 'Quando as 15 peças estão na sua casa, você pode <b>retirá-las</b> do tabuleiro. Retire a peça do 6 para a <b>bandeja</b> com o 6!', done: 'Clac! Se um dado for maior que a sua peça mais distante, você pode retirar essa também.' },
        { say: 'Quem retirar as 15 primeiro vence! Se o adversário não retirou nenhuma é um <b>gammon</b> (dobro), e se ainda tem peça na barra ou na sua casa é um <b>backgammon</b> (triplo)!' },
        { say: 'O <b>cubo de dobra</b> aumenta a aposta. Antes de lançar na sua vez você pode propor dobrar: o adversário <b>aceita</b> (a partida vale o dobro e o cubo fica com ele) ou <b>recusa</b> (e perde o valor atual).' },
        { say: 'Agora você sabe as regras! Dicas: deixe poucas peças expostas e faça pontos lado a lado. As lições ensinam mais estratégia. Lance os dados e jogue!' },
      ],
    },
    de: {
      name: 'Dicepup', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tap: 'Tippe auf die leuchtende Stelle', roll: 'Tippe aufs Brett zum Würfeln', nope: 'Dorthin geht es nicht!', gammon: 'Gammon ×2', bg: 'Backgammon ×3', take: 'Annehmen', drop: 'Aufgeben',
      s: [
        { say: 'Wuff! Ich bin <b>Dicepup</b>, der Würfelwelpe. Lass uns Backgammon zusammen auf diesem edlen Intarsienbrett lernen!' },
        { say: 'Das Brett hat 24 Dreiecke, die <b>Zungen</b> (Points), und jeder hat <b>15 Steine</b>. Die mit Goldrand sind <b>deine</b>, die schwarzen mit Platinrand gehören dem <b>Gegner</b>. Die sechs leuchtenden Zungen unten rechts sind <b>dein Heimfeld</b>. Bring alle Steine dorthin – wer zuerst <b>alle hinauswürfelt</b>, gewinnt!' },
        { say: 'Jeder zieht in eine Richtung: du von <b>24 nach 1</b> – oben von rechts nach links, dann unten von links nach rechts, im U. Dein Gegner zieht <b>andersherum</b>.' },
        { say: 'Am Zug <b>würfelst du zuerst mit zwei Würfeln</b>. Tippe aufs Brett zum Würfeln!', done: '<b>5</b> und <b>3</b>! Zieh einen Stein 5 und dann 3 (zusammen 8) oder zwei Steine, einen 5 und einen 3.' },
        { say: 'Jeder Würfel ist <b>ein eigener Zug</b>. Zieh mit der <b>3</b> einen Stein von 8 auf die <b>5</b>!', done: 'Mit der <b>1</b> kommt noch ein Stein von 6 auf die 5. Mit <b>zwei oder mehr</b> Steinen darf der Gegner dort nicht hin – du hast <b>einen Punkt gebaut</b>!' },
        { say: 'Zwei gleiche Würfel sind ein <b>Pasch</b>: du ziehst die Zahl <b>viermal</b>! Zieh mit dem 2er-Pasch den Stein von 13 bis auf die 5!', done: 'Hopp, hopp, hopp, hopp! Viermal 2 – acht Zungen.' },
        { say: 'Ein einzelner Stein ist ein <b>Blot</b>. Ziehst du auf einen gegnerischen Blot, <b>schlägst</b> du ihn auf die <b>Bar</b> in der Mitte. Schlag den schwarzen Stein auf 10 mit deiner 3!', done: 'Geschlagen! Der schwarze Stein kommt auf die Bar und muss von vorn beginnen.' },
        { say: 'Steht ein Stein auf der Bar, musst du ihn erst <b>im Heimfeld des Gegners einwürfeln</b>, bevor du etwas anderes ziehst. Die 19 (deine 6) ist durch zwei schwarze Steine <b>blockiert</b>, also komm mit der 4 auf der <b>21</b> herein!', done: 'Drin! Auf eine Zunge mit zwei oder mehr gegnerischen Steinen darfst du nie ziehen.' },
        { say: 'Punkte nebeneinander <b>versperren</b> dem Gegner den Weg. Zieh den Stein von 8 mit der 3 auf die 5 und vollende eine Mauer aus <b>sechs Punkten am Stück – eine Prime –</b> von 4 bis 9!', done: 'Fertig! Eine Sechser-Prime kann man nicht überspringen – der schwarze Stein dahinter sitzt fest.' },
        { say: 'Sind alle 15 Steine in deinem Heimfeld, darfst du sie <b>hinauswürfeln</b>. Würfle den Stein auf 6 mit der 6 in die <b>Ablage</b>!', done: 'Klack! Ist ein Würfel höher als dein entferntester Stein, darfst du diesen hinauswürfeln.' },
        { say: 'Wer zuerst alle 15 hinauswürfelt, gewinnt! Hat der Gegner noch keinen Stein draußen, ist es ein <b>Gammon</b> (doppelt), steht noch einer auf der Bar oder in deinem Heimfeld, ein <b>Backgammon</b> (dreifach)!' },
        { say: 'Der <b>Dopplerwürfel</b> erhöht den Einsatz. Vor deinem Wurf darfst du doppeln: Der Gegner <b>nimmt an</b> (das Spiel zählt doppelt, ihm gehört der Würfel) oder <b>gibt auf</b> (und verliert den jetzigen Wert).' },
        { say: 'Jetzt kennst du alle Regeln! Tipps: Lass möglichst wenige Blots stehen und baue Punkte nebeneinander. In den Lektionen lernst du mehr Strategie. Los, würfle und spiel!' },
      ],
    },
    hi: {
      name: 'डाइसपप', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', roll: 'पासे फेंकने के लिए बोर्ड पर टैप करें', nope: 'वहाँ नहीं जा सकता!', gammon: 'गैमन ×2', bg: 'बैकगैमन ×3', take: 'स्वीकार', drop: 'छोड़ें',
      s: [
        { say: 'भौं! मैं <b>डाइसपप</b> हूँ, पासे वाला पिल्ला। आओ इस शानदार मार्केट्री बोर्ड पर मिलकर बैकगैमन सीखें!' },
        { say: 'बोर्ड पर 24 त्रिकोण हैं जिन्हें <b>पॉइंट</b> कहते हैं, और हर खिलाड़ी के पास <b>15 गोटियाँ</b> हैं। सुनहरे किनारे वाली <b>आपकी</b> हैं, प्लैटिनम किनारे वाली काली <b>विरोधी</b> की। नीचे दाईं ओर चमकते छह पॉइंट <b>आपका होम बोर्ड</b> हैं। सारी गोटियाँ यहाँ लाकर जो पहले <b>सब बाहर निकाल</b> दे, वह जीतता है!' },
        { say: 'चलने की दिशा तय है: आप <b>24 से 1</b> की ओर — ऊपर दाएँ से बाएँ, फिर नीचे बाएँ से दाएँ, U आकार में। विरोधी <b>उलटी दिशा</b> में चलता है।' },
        { say: 'अपनी बारी में पहले <b>दो पासे फेंकें</b>। बोर्ड पर टैप करके फेंकिए!', done: '<b>5</b> और <b>3</b>! एक गोटी को 5 और फिर 3 (कुल 8) चलाएँ, या दो गोटियाँ, एक 5 और एक 3।' },
        { say: 'हर पासा <b>अलग चाल</b> है। <b>3</b> से 8 वाली गोटी को <b>5</b> पर ले जाइए!', done: 'अब <b>1</b> से 6 वाली गोटी भी 5 पर। जहाँ <b>दो या ज़्यादा</b> गोटियाँ हों, विरोधी वहाँ नहीं रुक सकता — आपने <b>पॉइंट बना</b> लिया!' },
        { say: 'दोनों पासों पर एक ही अंक आए तो <b>डबल</b>: वह अंक <b>चार बार</b> चलिए! डबल 2 से 13 वाली गोटी को 5 तक ले जाइए!', done: 'कूद, कूद, कूद, कूद! चार बार 2 — आठ पॉइंट।' },
        { say: 'अकेली गोटी <b>ब्लॉट</b> कहलाती है। विरोधी के ब्लॉट पर रुकें तो उसे <b>हिट</b> करके बीच की <b>बार</b> पर भेज देते हैं। 3 से 10 वाली काली गोटी को हिट कीजिए!', done: 'हिट! काली गोटी बार पर गई और उसे शुरू से चलना होगा।' },
        { say: 'बार पर गोटी हो तो बाकी कुछ चलाने से पहले उसे <b>विरोधी के होम बोर्ड में वापस लाना</b> ज़रूरी है। 19 (आपका 6) दो काली गोटियों से <b>बंद</b> है, इसलिए 4 से <b>21</b> पर अंदर आइए!', done: 'अंदर! जिस पॉइंट पर विरोधी की दो या ज़्यादा गोटियाँ हों, वहाँ कभी नहीं रुक सकते।' },
        { say: 'लगातार पॉइंट विरोधी का रास्ता <b>रोक</b> देते हैं। 3 से 8 वाली गोटी को 5 पर लाकर 4 से 9 तक <b>लगातार छह पॉइंट की दीवार — प्राइम —</b> पूरी कीजिए!', done: 'पूरी! छह की प्राइम लाँघी नहीं जा सकती, पीछे वाली काली गोटी फँस गई।' },
        { say: 'जब सभी 15 गोटियाँ होम बोर्ड में आ जाएँ, आप उन्हें <b>बेयर ऑफ</b> (बाहर) कर सकते हैं। 6 से 6 वाली गोटी को दाईं <b>ट्रे</b> में निकालिए!', done: 'खट! अगर पासा आपकी सबसे दूर की गोटी से बड़ा हो, तो उसे भी निकाल सकते हैं।' },
        { say: 'जो पहले 15 निकाले, वह जीता! विरोधी ने एक भी न निकाली हो तो <b>गैमन</b> (दोगुना), और उसकी गोटी अभी बार पर या आपके होम में हो तो <b>बैकगैमन</b> (तिगुना)!' },
        { say: '<b>डबलिंग क्यूब</b> दाँव बढ़ाता है। अपनी बारी में पासा फेंकने से पहले डबल का प्रस्ताव दे सकते हैं: विरोधी <b>स्वीकार</b> करे (खेल दोगुने का, क्यूब उसका) या <b>छोड़</b> दे (मौजूदा अंक से हार)।' },
        { say: 'नियम पूरे हुए! सुझाव: कम से कम ब्लॉट छोड़ें और पास-पास पॉइंट बनाएँ। पाठों में और रणनीति सीखें। चलिए, पासे फेंकें और खेलें!' },
      ],
    },
    ar: {
      name: 'دايس باب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'اضغط المكان المضيء', roll: 'اضغط اللوحة لرمي النرد', nope: 'لا يمكنها الذهاب إلى هناك!', gammon: 'غامون ×2', bg: 'باكغامون ×3', take: 'قبول', drop: 'انسحاب',
      s: [
        { say: 'هاو! أنا <b>دايس باب</b>، جرو النرد. لنتعلّم الطاولة معًا على هذه اللوحة الفاخرة المطعّمة بالخشب!' },
        { say: 'على اللوحة 24 مثلثًا تُسمّى <b>النقاط</b>، ولكل لاعب <b>15 قطعة</b>. القطع ذات الحافة الذهبية <b>لك</b>، والسوداء ذات الحافة البلاتينية <b>لخصمك</b>. النقاط الست المضيئة أسفل اليمين هي <b>بيتك</b>. اجمع فيها كل قطعك، ومن <b>يُخرجها كلها</b> أولًا يفوز!' },
        { say: 'لكل لاعب اتجاه: أنت تتحرك من <b>24 إلى 1</b> — في الأعلى من اليمين إلى اليسار، ثم في الأسفل من اليسار إلى اليمين، على شكل U. وخصمك يتحرك <b>بالاتجاه المعاكس</b>.' },
        { say: 'في دورك <b>ترمي نردين</b> أولًا. اضغط اللوحة لترمي!', done: '<b>5</b> و<b>3</b>! حرّك قطعة 5 ثم 3 (8 معًا)، أو قطعتين: واحدة 5 وأخرى 3.' },
        { say: 'كل نرد <b>حركة مستقلة</b>. استخدم <b>3</b> لتنقل قطعة من 8 إلى <b>5</b>!', done: 'والآن ينقل <b>1</b> قطعة من 6 إلى 5 أيضًا. مع <b>قطعتين أو أكثر</b> لا يستطيع خصمك النزول هناك — لقد <b>صنعت نقطة</b>!' },
        { say: 'الرقم نفسه على النردين يسمّى <b>دوبل</b>: تلعب الرقم <b>أربع مرات</b>! بدوبل 2 انقل القطعة من 13 حتى 5!', done: 'قفزة، قفزة، قفزة، قفزة! أربع مرات 2 — ثماني نقاط.' },
        { say: 'القطعة الوحيدة تُسمّى <b>مكشوفة</b>. إذا نزلت على مكشوفة لخصمك <b>تضربها</b> وترسلها إلى <b>الحاجز</b> في الوسط. اضرب القطعة السوداء على 10 بالرقم 3!', done: 'ضربة! ذهبت القطعة السوداء إلى الحاجز وعليها أن تبدأ من جديد.' },
        { say: 'إذا كانت لك قطعة على الحاجز فعليك أولًا <b>إدخالها إلى بيت خصمك</b> قبل تحريك أي شيء آخر. النقطة 19 (6 لك) <b>مغلقة</b> بقطعتين سوداوين، فادخل بالرقم 4 على <b>21</b>!', done: 'دخلت! لا يمكنك أبدًا النزول على نقطة فيها قطعتان أو أكثر للخصم.' },
        { say: 'النقاط المتجاورة <b>تسدّ</b> طريق خصمك. انقل القطعة من 8 إلى 5 بالرقم 3 وأكمل جدارًا من <b>ست نقاط متتالية — برايم —</b> من 4 إلى 9!', done: 'اكتمل! لا يمكن القفز فوق برايم من ست نقاط، فالقطعة السوداء خلفه محبوسة.' },
        { say: 'عندما تصل قطعك الخمس عشرة كلها إلى بيتك يمكنك <b>إخراجها</b> من اللوحة. أخرج القطعة من 6 إلى <b>الصينية</b> بالرقم 6!', done: 'طَق! إذا كان النرد أكبر من أبعد قطعة لك، يمكنك إخراجها أيضًا.' },
        { say: 'من يُخرج قطعه الخمس عشرة أولًا يفوز! إذا لم يُخرج خصمك أي قطعة فهو <b>غامون</b> (ضعفان)، وإذا بقيت له قطعة على الحاجز أو في بيتك فهو <b>باكغامون</b> (ثلاثة أضعاف)!' },
        { say: '<b>مكعب المضاعفة</b> يرفع الرهان. قبل أن ترمي في دورك يمكنك عرض المضاعفة: فإما أن <b>يقبل</b> خصمك (تُحسب اللعبة ضعفين ويصبح المكعب له) أو <b>ينسحب</b> (ويخسر بالقيمة الحالية).' },
        { say: 'عرفت القواعد كلها! نصائح: اترك أقل عدد ممكن من القطع المكشوفة وابنِ نقاطًا متجاورة. تعلّم المزيد من الخطط في الدروس. هيا، ارمِ النرد والعب!' },
      ],
    },
  };

  // the guided move: which checker, where, how far (merged into TXT)
  const EX = {
    ja: { tapCk: 'この駒をタップ', tapDest: '光っている場所をタップ', hintPick: '光っている駒をタップしてね', hintDest: '光っている場所をタップしてね', dieMove: '{n}の目 → {n}マス進む', mid: 'いいね！ つぎは<b>1</b>の目。6の駒を1つ進めて<b>5</b>へ動かそう！', done4: '5に<b>2個</b>そろった！ 2個以上あるポイントには相手が止まれない。これが<b>ポイントを作る</b>ってこと！' },
    en: { tapCk: 'Tap this checker', tapDest: 'Tap the glowing spot', hintPick: 'Tap the glowing checker', hintDest: 'Tap the glowing spot', dieMove: '{n} on the die → move {n} points', mid: 'Nice! Now the <b>1</b>: move a checker from 6 one point on to <b>5</b>!', done4: 'Two checkers on 5! With <b>two or more</b> there, your opponent can\'t land on it — you\'ve <b>made a point</b>!' },
    zh: { tapCk: '点击这枚棋子', tapDest: '点击发光的位置', hintPick: '请点击发光的棋子', hintDest: '请点击发光的位置', dieMove: '骰子{n} → 前进{n}格', mid: '很好！接下来用<b>1</b>：把6点的棋子前进1格到<b>5点</b>！', done4: '5点有<b>两枚</b>了！有两枚以上棋子的点，对手不能停留——这就是<b>做点</b>！' },
    ko: { tapCk: '이 말을 탭하세요', tapDest: '빛나는 곳을 탭하세요', hintPick: '빛나는 말을 탭해 줘', hintDest: '빛나는 곳을 탭해 줘', dieMove: '주사위 {n} → {n}칸 이동', mid: '좋아! 다음은 <b>1</b>. 6의 말을 1칸 움직여 <b>5</b>로!', done4: '5에 <b>2개</b>가 모였어! 말이 2개 이상 있는 포인트에는 상대가 멈출 수 없어. 이게 <b>포인트 만들기</b>야!' },
    es: { tapCk: 'Toca esta ficha', tapDest: 'Toca el punto brillante', hintPick: 'Toca la ficha que brilla', hintDest: 'Toca el punto que brilla', dieMove: 'Dado {n} → avanza {n} puntos', mid: '¡Bien! Ahora el <b>1</b>: avanza una ficha del 6 al <b>5</b>.', done4: '¡Dos fichas en el 5! Con <b>dos o más</b>, tu rival no puede caer ahí: ¡has <b>hecho un punto</b>!' },
    fr: { tapCk: 'Touche cette dame', tapDest: 'Touche la case lumineuse', hintPick: 'Touche la dame qui brille', hintDest: 'Touche la case qui brille', dieMove: 'Dé {n} → avance de {n} flèches', mid: 'Bien ! Maintenant le <b>1</b> : avance une dame du 6 jusqu\'au <b>5</b> !', done4: 'Deux dames sur le 5 ! Avec <b>deux dames ou plus</b>, l\'adversaire ne peut pas s\'y poser : tu as <b>fait une case</b> !' },
    pt: { tapCk: 'Toque nesta peça', tapDest: 'Toque no ponto brilhante', hintPick: 'Toque na peça que brilha', hintDest: 'Toque no ponto que brilha', dieMove: 'Dado {n} → ande {n} pontos', mid: 'Boa! Agora o <b>1</b>: ande uma peça do 6 até o <b>5</b>!', done4: 'Duas peças no 5! Com <b>duas ou mais</b>, o adversário não pode parar ali: você <b>fez um ponto</b>!' },
    de: { tapCk: 'Tippe auf diesen Stein', tapDest: 'Tippe auf die leuchtende Stelle', hintPick: 'Tippe auf den leuchtenden Stein', hintDest: 'Tippe auf die leuchtende Stelle', dieMove: 'Würfel {n} → {n} Zungen weit', mid: 'Gut! Jetzt die <b>1</b>: Zieh einen Stein von 6 auf die <b>5</b>!', done4: 'Zwei Steine auf der 5! Mit <b>zwei oder mehr</b> Steinen darf der Gegner dort nicht hin – du hast <b>einen Punkt gebaut</b>!' },
    hi: { tapCk: 'इस गोटी पर टैप करें', tapDest: 'चमकती जगह पर टैप करें', hintPick: 'चमकती गोटी पर टैप कीजिए', hintDest: 'चमकती जगह पर टैप कीजिए', dieMove: 'पासा {n} → {n} पॉइंट आगे', mid: 'बढ़िया! अब <b>1</b>: 6 वाली गोटी को एक पॉइंट आगे <b>5</b> पर ले जाइए!', done4: '5 पर <b>दो</b> गोटियाँ! जहाँ दो या ज़्यादा गोटियाँ हों, विरोधी वहाँ नहीं रुक सकता — आपने <b>पॉइंट बना</b> लिया!' },
    ar: { tapCk: 'اضغط هذه القطعة', tapDest: 'اضغط المكان المضيء', hintPick: 'اضغط القطعة المضيئة', hintDest: 'اضغط المكان المضيء', dieMove: 'النرد {n} ← تقدّم {n} نقاط', mid: 'أحسنت! والآن الرقم <b>1</b>: انقل قطعة من 6 خطوة واحدة إلى <b>5</b>!', done4: 'قطعتان على 5! مع <b>قطعتين أو أكثر</b> لا يستطيع خصمك النزول هناك — لقد <b>صنعت نقطة</b>!' },
  };
  /* positions: g / b = { point: count } in gold's numbering (24 → 1); bar / off counts
     glow: points that pulse gold · acts: guided single-die moves { from (point | 'bar'), to (point | 'off'), d = index of the die used } · dice: shown at the start */
  const INIT = { g: { 24: 2, 13: 5, 8: 3, 6: 5 }, b: { 1: 2, 12: 5, 17: 3, 19: 5 } };
  const STEPS = [
    { pos: INIT },
    { pos: INIT, glow: [1, 2, 3, 4, 5, 6], tray: true },
    { pos: INIT, sweep: true },
    { pos: INIT, roll: [5, 3] },
    { pos: INIT, dice: [3, 1], acts: [{ from: 8, to: 5, d: 0 }, { from: 6, to: 5, d: 1, mid: true }] },
    { pos: { g: { 13: 1, 6: 3, 8: 2, 24: 2 }, b: { 1: 2, 12: 3, 19: 4, 17: 2 } }, dice: [2, 2, 2, 2], acts: [{ from: 13, to: 11, d: 0 }, { from: 11, to: 9, d: 1 }, { from: 9, to: 7, d: 2 }, { from: 7, to: 5, d: 3 }] },
    { pos: { g: { 13: 3, 6: 4, 8: 2 }, b: { 10: 1, 1: 2, 19: 4, 12: 3 } }, dice: [3, 5], acts: [{ from: 13, to: 10, d: 0 }] },
    { pos: { g: { bar: 1, 6: 4, 8: 3, 13: 3 }, b: { 19: 2, 20: 2, 22: 2, 12: 4 } }, dice: [6, 4], acts: [{ from: 'bar', to: 21, d: 1 }], cross: [19] },
    { pos: { g: { 9: 2, 8: 3, 7: 2, 6: 4, 5: 1, 4: 2 }, b: { 2: 1, 19: 4, 17: 3, 12: 3 } }, dice: [3, 1], acts: [{ from: 8, to: 5, d: 0 }], prime: [4, 5, 6, 7, 8, 9] },
    { pos: { g: { 6: 2, 5: 3, 4: 3, 3: 2, 2: 3, 1: 2 }, b: { 19: 4, 20: 3, 21: 3, 17: 3, 13: 2 } }, dice: [6, 4], acts: [{ from: 6, to: 'off', d: 0 }] },
    { pos: { g: { off: 15 }, b: { 19: 4, 20: 3, 21: 3, 22: 2, 3: 1, bar: 0, 17: 2 } }, tray: true, glow: [3], win: true },
    { pos: { g: { 13: 4, 8: 3, 6: 5, 4: 2, 24: 1 }, b: { 1: 2, 12: 4, 17: 3, 19: 4, 20: 2 } }, cube: true },
    { pos: INIT, last: true },
  ];

  /* ---------- little sounds ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1, t0 = 0) {   // a metal-rimmed checker set down on wood: a soft thock + a bright click
      const C = on && ac(); if (!C) return; const t = C.currentTime + t0;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400 * pitch; bp.Q.value = 1.4;
      const g = C.createGain(); g.gain.setValueAtTime(.32 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .035); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(240 * pitch, t); o.frequency.exponentialRampToValueAtTime(110 * pitch, t + .08);
      og.gain.setValueAtTime(.32 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .14);
    }
    function rattle() { for (let i = 0; i < 5; i++) tok(.45 + Math.random() * .3, 1.6 + Math.random() * .6, i * .07 + Math.random() * .03); }
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
    return { tok, rattle, blip, chime, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, BG = T3.backgammon, L0 = TXT[ctx.lang] || TXT.en, X0 = EX[ctx.lang] || EX.en;
    const L = Object.assign({}, L0, X0, { s: L0.s.map((t, i) => i === 4 ? Object.assign({}, t, { done: X0.done4 }) : t) });
    const board = T3.MODELS.backgammon(true, { look: 'marq' }); T3.show('backgammon', board); T3.play(true);
    const g = BG.geom(12), Y = board.userData.top, W2 = g.W / 2, H2 = g.H / 2, SC = .62;   // shown at about the other boards' size (the camera stays below the room's lamp)
    board.scale.setScalar(SC);
    const FR = BG.frameOn ? BG.frameOn(board, T3, { SC, Y, g, rotate: false, legacy: true }) : null;   // the whole case, large, seen a little from the player's side (not turned: the guide's words say left / right / top / bottom)
    if (!FR && T3.fit) T3.fit({ w: (g.W + 1) * SC, d: (g.H + .6) * SC, y: Y * SC, pitch: 1.18 });
    const prj = (x, y, z) => { if (!FR) return T3.project(x * SC, z * SC, y * SC); const v = FR.toCur(x, y, z); return T3.project(v.x, v.z, v.y); };
    const curXYZ = (x, y, z) => { if (!FR) return [x * SC, z * SC, y * SC]; const v = FR.toCur(x, y, z); return [v.x, v.z, v.y]; };
    // the wide case needs a high camera on phones: the room's ceiling lamp (night) would hang in front of it — hidden during the tour
    const hidden = [];
    try { let sc = board; while (sc.parent) sc = sc.parent; sc.children.forEach(o => { if (o.isMesh && o.position.y > 10 && o.material && o.material.isMeshBasicMaterial && o.visible) { o.visible = false; hidden.push(o); } }); } catch (e) {}
    const marks = new TH.Group(); board.add(marks);
    let cks = [], dice = [], cubeM = null, step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const vpOf = (side, p) => p;   // positions are written in gold's numbering = the board's view numbering (gold at the bottom)

    /* ---------- checkers: where the k-th of n sits ---------- */
    function spot(c) {   // c = { side 0 gold | 1 black, at: point | 'bar' | 'off', k, n }
      if (c.at === 'bar') { const st = c.n <= 1 ? g.C : Math.min(g.C, (g.MID - g.TOP - 1.6 - g.C) / (c.n - 1)); const uy = c.side ? g.MID + 1.02 + c.k * st : g.MID - 1.02 - c.k * st; return { x: g.BX + g.B / 2 - W2, y: Y, z: uy - H2, edge: false }; }
      if (c.at === 'off') { const st = Math.min(.28, (g.MID - g.TOP - .55) / 15), uy = c.side ? g.TOP + .17 + c.k * st + .125 : g.BOT - .17 - c.k * st - .125; return { x: g.TX + g.TW / 2 - W2, y: Y + BG.CK_R, z: uy - H2, edge: true }; }
      const [x, z] = BG.stackXZ(vpOf(c.side, c.at), c.k, c.n, g); return { x, y: Y, z, edge: false };
    }
    function place(c, p) { p = p || spot(c); c.m.position.set(p.x, p.y, p.z + (p.edge ? -BG.CK_H / 2 : 0)); c.m.rotation.set(p.edge ? Math.PI / 2 : 0, 0, 0); }
    function mk(side) { const m = BG.checker(side ? 'black' : 'gold'); const sh = T3.contact(.47, .45); sh.position.y = .002; sh.userData.contact = true; m.add(sh); board.add(m); return m; }
    function restack() {   // recompute k / n of every checker per location
      const grp = {}; cks.forEach(c => { const key = c.side + ':' + c.at; (grp[key] = grp[key] || []).push(c); });
      Object.values(grp).forEach(a => a.forEach((c, i) => { c.k = i; c.n = a.length; }));
    }
    function setBoard(pos) {   // diff against the checkers already on the board: keep the same ones, slide the moved ones, drop in only new ones
      const want = [];
      [['g', 0], ['b', 1]].forEach(([key, side]) => { const P = pos[key] || {}; Object.keys(P).forEach(at => { for (let i = 0; i < P[at]; i++) want.push({ side, at: isNaN(+at) ? at : +at }); }); });
      const pool = {}; cks.forEach(c => { const k = c.side + ':' + c.at; (pool[k] = pool[k] || []).push(c); });
      const next = [], miss = [];
      want.forEach(w => { const a = pool[w.side + ':' + w.at]; if (a && a.length) { const c = a.shift(); c.mode = 'keep'; next.push(c); } else miss.push(w); });
      const left = [].concat(...Object.values(pool));
      miss.forEach(w => { const i = left.findIndex(c => c.side === w.side); if (i >= 0) { const c = left.splice(i, 1)[0]; c.at = w.at; c.mode = 'move'; next.push(c); } else next.push({ side: w.side, at: w.at, m: mk(w.side), mode: 'new' }); });
      left.forEach(c => board.remove(c.m));
      cks = next; restack();
      let nNew = 0, moved = false;
      cks.forEach((c, i) => {
        c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = c.at !== 'off'; });
        const p = spot(c), tz = p.z + (p.edge ? -BG.CK_H / 2 : 0), m = c.m;
        if (c.mode === 'new') { const j = nNew++; place(c, p); const y0 = m.position.y; m.visible = false; later(() => { m.visible = true; anim(240, k => { m.position.y = y0 + (1 - k) * (1 - k) * 1.2; }, () => { m.position.y = y0; if (j % 4 === 0) SFX.tok(.3, 1.2); }); }, 30 + j * 14); }
        else {
          m.visible = true;
          const f = m.position.clone(), d = Math.hypot(f.x - p.x, f.z - tz), rx0 = m.rotation.x, rx1 = p.edge ? Math.PI / 2 : 0;
          if (d < 1e-3 && Math.abs(rx0 - rx1) < 1e-3) { place(c, p); }
          else { moved = true; const lift = c.mode === 'move' ? Math.min(1.4, .35 + d * .12) : 0;
            anim(c.mode === 'move' ? 420 : 220, k => { const e = io(k); m.position.set(f.x + (p.x - f.x) * e, f.y + (p.y - f.y) * e + Math.sin(Math.PI * k) * lift, f.z + (tz - f.z) * e); m.rotation.x = rx0 + (rx1 - rx0) * e; }, () => { place(c, p); }); }
        }
        delete c.mode;
      });
      return Math.max(nNew, moved ? 24 : 0);
    }
    const topOf = (side, at) => { let t = null; cks.forEach(c => { if (c.side === side && c.at === at && (!t || c.k > t.k)) t = c; }); return t; };

    /* ---------- dice ---------- */
    function clearDice() { dice.forEach(d => board.remove(d)); dice = []; }
    function diceAt(vals) {   // resting dice of the gold player, in the right half
      clearDice(); const cx = g.RX + 3 - W2, dbl = vals.length === 4, xs = dbl ? [-1.38, -.46, .46, 1.38] : [-.55, .55];
      vals.forEach((v, i) => { const d = BG.die('gold', dbl ? .7 : .8); BG.dieRot(d, v, (i ? -.25 : .3) * (dbl ? .2 : 1)); d.position.set(cx + xs[i], Y + (dbl ? .35 : .4), (dbl ? 0 : (i ? .25 : -.2))); board.add(d); dice.push(d); });
    }
    function rollDice(vals, done) {   // thrown in from the right, tumbling, two bounces, then at rest
      diceAt(vals); SFX.rattle();
      const ends = dice.map(d => ({ p: d.position.clone(), r: d.rotation.clone() })), spin = dice.map(() => [6 + Math.random() * 4, 5 + Math.random() * 4, 3 + Math.random() * 3]);
      anim(900, k => {
        dice.forEach((d, i) => {
          const e = ends[i], kk = Math.min(1, k * 1.05 + i * .02), r = 1 - io(kk);
          const hop = Math.abs(Math.sin(kk * Math.PI * 2.5)) * (1 - kk) * 1.6;
          d.position.set(e.p.x + r * 3.2, e.p.y + hop, e.p.z + r * (i ? .8 : -.9));
          d.rotation.set(e.r.x + r * spin[i][0], e.r.y + r * spin[i][1], e.r.z + r * spin[i][2], 'YXZ');
        });
      }, () => { dice.forEach((d, i) => { d.position.copy(ends[i].p); d.rotation.copy(ends[i].r); }); SFX.tok(.6, 1.8); if (done) done(); });
    }
    function setCube(v, onBar = true) {
      if (cubeM) board.remove(cubeM);
      cubeM = BG.cube(v); cubeM.position.set(g.BX + g.B / 2 - W2, BG.FY + BG.RH + .43, 0); cubeM.rotation.y = .1; cubeM.visible = onBar; board.add(cubeM);
    }

    /* ---------- marks ---------- */
    const triGeo = (() => { const s = new TH.Shape(); s.moveTo(-.46, 0); s.lineTo(.46, 0); s.lineTo(0, g.PL); s.closePath(); return new TH.ShapeGeometry(s); })();
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); cks.forEach(c => { c.bob = false; }); }
    function glowPt(p, color = 0xffc928, op = .45, pulse = true) {   // a point lit up (gold's numbering)
      const vp = vpOf(0, p), ux = BG.slotX(vp, g), top = vp >= 13;
      const m = new TH.Mesh(triGeo, new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false, side: TH.DoubleSide }));
      m.rotation.x = -Math.PI / 2; if (top) m.rotation.z = Math.PI;   // shape y → −z; the top row points down the board
      m.position.set(ux - W2, Y + .006, (top ? g.TOP : g.BOT) - H2); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function ring(x, z, color = 0x2fd17a) { const m = new TH.Mesh(new TH.TorusGeometry(.3, .045, 10, 40), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .9, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, Y + .03, z); m.userData.pulse = true; m.userData.ring = true; marks.add(m); return m; }
    function cross(x, z) { const gg = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(.6, .04, .1), mat); b.rotation.y = s * Math.PI / 4; gg.add(b); }); gg.position.set(x, Y + .3, z); marks.add(gg); return gg; }
    function trayGlow(side = 0) { const h = g.MID - g.TOP - .15, m = new TH.Mesh(new TH.PlaneGeometry(g.TW - .1, h), new TH.MeshBasicMaterial({ color: 0xffc928, transparent: true, opacity: .35, toneMapped: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(g.TX + g.TW / 2 - W2, Y + .006, (side ? g.TOP + h / 2 + .05 : g.MID + .1 + h / 2) - H2); m.userData.pulse = true; marks.add(m); return m; }
    // the landing spot of the next checker on a point
    function landXZ(side, p) {
      if (p === 'off') { const n = cks.filter(c => c.side === side && c.at === 'off').length, s = spot({ side, at: 'off', k: n, n: n + 1 }); return [s.x, s.z]; }
      const n = cks.filter(c => c.side === side && c.at === p).length; const s = spot({ side, at: p, k: n, n: n + 1 }); return [s.x, s.z];
    }
    let sweepT = 0;
    function pulse() {
      if (stopped) return; const now = performance.now(), k = .5 + .5 * Math.sin(now / 260); let any = false;
      marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.userData.ring) m.scale.setScalar(.85 + k * .3); if (m.material) m.material.opacity = (m.userData.ring ? .5 : .2) + k * .35; } });
      cks.forEach(c => { if (c.bob) { any = true; c.m.position.y = Y + .05 + .18 * k; } });
      guide.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.userData.ring) m.scale.setScalar(.85 + k * .3); if (m.material) m.material.opacity = (m.userData.ring ? .5 : .2) + k * .35; } if (m.userData.follow) { m.position.x = m.userData.follow.m.position.x; m.position.z = m.userData.follow.m.position.z; } });
      if (arrow.visible) { any = true; arrow.position.set(arrowAt.x, arrowAt.y + Math.abs(Math.sin(now / 230)) * .35, arrowAt.z); }
      else if (phase === 'pick' && cur && !busy) { arrow.visible = true; }
      if (phase === 'pick' && cur) { arrowAt.x = cur.m.position.x; arrowAt.z = cur.m.position.z; arrowAt.y = Y + 1.05; }
      if (STEPS[step] && STEPS[step].sweep && !busy) {   // the direction of play: a light runs 24 → 1
        any = true; const i = Math.floor(now / 140) % 30;
        if (i !== sweepT) { sweepT = i; clearMarks(); for (let j = 0; j < 4; j++) { const p = 24 - i + j; if (p >= 1 && p <= 24) glowPt(p, 0xffc928, .15 + j * .12, false); } }
      }
      if (any) T3.kick(60); requestAnimationFrame(pulse);
    }
    requestAnimationFrame(pulse);   // first frame after start() has set everything up

    /* ---------- moves ---------- */
    function moveTo(c, at, done, hopH) {   // lifted, carried and set down
      const p0 = c.m.position.clone(), r0 = c.m.rotation.x; c.at = at; restack();
      const s = spot(c), p1 = new TH.Vector3(s.x, s.y, s.z + (s.edge ? -BG.CK_H / 2 : 0)), d = p0.distanceTo(p1), dur = 300 + d * 55, lift = hopH || Math.min(1.4, .35 + d * .12);
      c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = false; });
      anim(dur, k => { const e = io(k); c.m.position.lerpVectors(p0, p1, e); c.m.position.y += Math.sin(k * Math.PI) * lift; c.m.rotation.x = r0 + ((s.edge ? Math.PI / 2 : 0) - r0) * e; },
        () => { place(c); c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = at !== 'off'; }); SFX.tok(1, at === 'off' ? 1.3 : 1); land(c); cks.filter(o => o !== c).forEach(o => place(o)); if (done) done(); });
    }
    function land(c) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .07; c.m.scale.set(s, 1 / s, s); }, () => c.m.scale.set(1, 1, 1)); }
    function hopPath(c, path, done) { let i = 0; const nx = () => { if (i >= path.length) { if (done) done(); return; } const p = path[i++]; moveTo(c, p, () => later(nx, 60), .7); }; nx(); }
    function dimDie(i) { const d = dice[i]; if (!d || d.userData.dim) return; d.userData.dim = true; d.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = .35; } }); }

    /* ---------- the guided move: which checker → where, counted point by point ---------- */
    const guide = new TH.Group(); board.add(guide);
    // the pointing arrow: a DOM overlay over the projected 3D spot (it reads the same from any camera angle, on PC and phones)
    const arrowEl = document.createElement('div'); arrowEl.className = 'bgt-arrow';
    arrowEl.innerHTML = '<svg viewBox="0 0 52 64" width="52" height="64"><path d="M16 3h20v28h13L26 61 3 31h13z" fill="#ff4d4d" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>';
    Object.assign(arrowEl.style, { position: 'fixed', left: 0, top: 0, zIndex: 9999, pointerEvents: 'none', display: 'none', filter: 'drop-shadow(0 4px 5px rgba(0,0,0,.35))', willChange: 'transform' });
    document.body.appendChild(arrowEl);
    const arrow = { _v: false, sc: 1, get visible() { return this._v; }, set visible(v) { this._v = v; arrowEl.style.display = v ? '' : 'none'; },
      scale: { setScalar: k => { arrow.sc = k; } },
      position: { set: (x, y, z) => { const q = prj(x, y, z); arrowEl.style.transform = `translate(${(q.x - 26).toFixed(1)}px,${(q.y - 62).toFixed(1)}px) scale(${arrow.sc})`; } } };
    const arrowAt = { x: 0, y: 0, z: 0 };
    const numTex = {};
    function numSprite(n) {
      if (!numTex[n]) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 9; x.strokeStyle = '#ff4d4d'; x.stroke(); x.fillStyle = '#2b3044'; x.font = '900 74px Fredoka, "Zen Maru Gothic", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 70); numTex[n] = new TH.CanvasTexture(c); numTex[n].encoding = TH.sRGBEncoding; }
      const sp = new TH.Sprite(new TH.SpriteMaterial({ map: numTex[n], depthTest: false, toneMapped: false })); sp.scale.set(.62, .62, 1); sp.renderOrder = 5; return sp;
    }
    let ai = 0, phase = '', cur = null, sel = null, idleT = 0, hand = null;
    const act = () => (STEPS[step].acts || [])[ai];
    const startN = a => a.from === 'bar' ? 25 : a.from, endN = a => a.to === 'off' ? 0 : a.to;
    const pathOf = a => { const o = []; for (let v = startN(a) - 1; v >= endN(a); v--) o.push(v === 0 ? 'off' : v); return o; };
    function clearGuide() { while (guide.children.length) guide.remove(guide.children[0]); arrow.visible = false; hideHand(); }
    function pointArrow(x, y, z) { arrowAt.x = x; arrowAt.y = y; arrowAt.z = z; arrow.visible = true; }
    function line(html, cls) { $('.cnt').innerHTML = html; if (cls) { const t = $('.cnt').lastElementChild; if (t && t.animate) t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 360 }); } }
    function dieTag(a) { const st = STEPS[step], v = st.dice[a.d], n = st.acts.length > 1 && st.dice.length === 4 ? ` (${ai + 1}/${st.acts.length})` : ''; return `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block">🎲 ${X0.dieMove.replace(/\{n\}/g, v)}${n}</span>`; }
    function dieGlow(a) { const d = dice[a.d]; if (!d) return; const r = new TH.Mesh(new TH.TorusGeometry(.55, .06, 10, 40), new TH.MeshBasicMaterial({ color: 0xffc928, transparent: true, opacity: .9, toneMapped: false })); r.rotation.x = -Math.PI / 2; r.position.set(d.position.x, Y + .03, d.position.z); r.userData.pulse = true; r.userData.ring = true; guide.add(r); }
    function startAct() {   // phase 1: show the checker to take
      const a = act(); if (!a) return;
      clearGuide(); phase = 'pick'; sel = null;
      cur = a.from === 'bar' ? topOf(0, 'bar') : topOf(0, a.from); if (!cur) return;
      cur.bob = true; dieGlow(a);
      const r = ring(cur.m.position.x, cur.m.position.z, 0xffc928); marks.remove(r); guide.add(r); r.userData.follow = cur;
      if (a.mid) say(X0.mid);
      line(`${dieTag(a)}<br><b class="tapl" style="color:#e0452b;display:inline-block;margin-top:6px;font-size:1.06em">👆 ${X0.tapCk}</b>`); buttons(); armIdle();
    }
    function pickCk() {   // phase 2: the checker is lifted, the way is counted out, the destination glows
      const a = act(); phase = 'dest'; cur.bob = false; sel = cur; arrow.visible = false; SFX.tok(.7, 1.6);
      const y0 = cur.m.position.y; anim(200, k => { cur.m.position.y = y0 + (Y + .45 - y0) * io(k); });
      const P = pathOf(a), last = P[P.length - 1];
      P.forEach((p, i) => later(() => {   // numbered markers on every point it passes, one by one
        const [x, z] = landXZ(0, p), sp = numSprite(i + 1); sp.position.set(x, Y + .75, z); sp.userData.n = i; guide.add(sp);
        sp.scale.set(.01, .01, 1); anim(180, k => { const s = .62 * (k < .7 ? k / .7 * 1.15 : 1.15 - (k - .7) / .3 * .15); sp.scale.set(s, s, 1); });
        SFX.blip();
      }, 160 + i * 170));
      if (last === 'off') { const t = trayGlow(0); marks.remove(t); guide.add(t); } else { const t = glowPt(last, 0x2fd17a, .45); marks.remove(t); guide.add(t); }
      const [x, z] = landXZ(0, last), r = ring(x, z); marks.remove(r); guide.add(r);
      later(() => pointArrow(x, Y + 1.25, z), 160 + P.length * 170);
      line(`${dieTag(a)}<br><b class="tapl" style="color:#e0452b;display:inline-block;margin-top:6px;font-size:1.06em">👆 ${X0.tapDest}</b>`); buttons(); armIdle();
    }
    function hopAlong(c, P, done) {   // point by point, counting, a tick at every point
      let i = 0;
      const nx = () => {
        if (i >= P.length) return done();
        const p = P[i], fin = i === P.length - 1; i++;
        const mk = guide.children.find(o => o.isSprite && o.userData.n === i - 1);
        if (fin) { moveTo(c, p, () => { if (mk) mk.visible = false; done(); }, .55); SFX.tok(.5, 1 + i * .08); return; }
        const [x, z] = landXZ(0, p), p0 = c.m.position.clone(), p1 = new TH.Vector3(x, Y + .3, z);
        anim(230, k => { c.m.position.lerpVectors(p0, p1, io(k)); c.m.position.y += Math.sin(k * Math.PI) * .45; }, () => {
          SFX.tok(.45, 1 + i * .08); if (mk) anim(160, k => { const s = .62 * (1 + Math.sin(k * Math.PI) * .45); mk.scale.set(s, s, 1); }); later(nx, 40);
        });
      };
      nx();
    }
    function doMove() {   // phase 3
      const a = act(), c = sel, stepNow = step; phase = 'move'; busy = true; arrow.visible = false; hideHand();
      guide.children.filter(o => !o.isSprite).forEach(o => guide.remove(o));
      const victim = typeof a.to === 'number' ? cks.find(o => o.side === 1 && o.at === a.to) : null;
      hopAlong(c, pathOf(a), () => {
        if (step !== stepNow) return;
        const next = () => {
          if (step !== stepNow) return;
          dimDie(a.d); clearGuide(); ai++; busy = false;
          if (ai < STEPS[step].acts.length) { later(startAct, 350); return; }
          const st = STEPS[step]; played = true;
          if (st.prime) { st.prime.forEach(p => glowPt(p, 0xffc928, .4)); const bl = cks.find(o => o.side === 1 && o.at === 2); if (bl) { const sp = spot(bl); later(() => { cross(sp.x, sp.z); }, 300); } }
          SFX.chime(); later(() => finish(), 300);
        };
        if (victim) later(() => moveTo(victim, 'bar', next, 1.2), 80); else next();
      });
    }
    // after ~6 s without a tap: a ghost finger taps the right spot
    function hideHand() { if (hand) { hand.remove(); hand = null; } }
    function armIdle() { clearTimeout(idleT); hideHand(); idleT = setTimeout(showHand, 6000); }
    function handTarget() {
      if (phase === 'pick' && cur) return [cur.m.position.x, cur.m.position.z, cur.m.position.y + .2];
      if (phase === 'dest') { const P = pathOf(act()), [x, z] = landXZ(0, P[P.length - 1]); return [x, z, Y + .1]; }
      return null;
    }
    function showHand() {
      if (stopped || busy || (phase !== 'pick' && phase !== 'dest')) return;
      const t = handTarget(); if (!t) return;
      const q = prj(t[0], t[2], t[1]);
      hand = document.createElement('div'); hand.className = 'bgt-hand';
      hand.innerHTML = '<svg viewBox="0 0 48 60" width="48" height="60"><circle cx="16" cy="6" r="5" fill="none" stroke="#ff4d4d" stroke-width="3" opacity=".8"/><path d="M12 8c0-3 2-5 4-5s4 2 4 5v17l2-1c2-1 4 0 4 2l1-1c2-1 4 0 4 2l1-1c2-1 5 0 5 3v12c0 8-6 14-14 14h-3c-5 0-8-3-10-7l-6-11c-1-2 0-4 2-5s4 0 5 2l2 3z" fill="#fff" stroke="#2b3044" stroke-width="2.6" stroke-linejoin="round"/></svg>';
      Object.assign(hand.style, { position: 'fixed', left: (q.x - 16) + 'px', top: (q.y - 4) + 'px', zIndex: 9999, pointerEvents: 'none', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.35))', opacity: 0 });
      document.body.appendChild(hand);
      if (hand.animate) hand.animate([{ transform: 'translate(46px,60px) scale(1)', opacity: .5 }, { transform: 'translate(0,0) scale(1)', opacity: .95, offset: .4 }, { transform: 'translate(0,0) scale(.82)', opacity: .95, offset: .55 }, { transform: 'translate(0,0) scale(1)', opacity: .95, offset: .7 }, { transform: 'translate(0,0) scale(1)', opacity: 0 }], { duration: 1600, iterations: 3, fill: 'forwards' });
      const flash = guide.children.find(o => o.userData.ring); if (flash) anim(600, k => flash.scale.setScalar(1 + Math.sin(k * Math.PI * 3) * .3));
      idleT = setTimeout(() => { hideHand(); showHand(); }, 6500);
    }
    function nudge() {   // a wrong tap: the right checker gives a little shake, the hint is repeated
      if (phase === 'pick' && cur) { const c = cur, x0 = c.m.position.x; anim(420, k => { c.m.position.x = x0 + Math.sin(k * Math.PI * 6) * .09 * (1 - k); }, () => { c.m.position.x = x0; }); line(`${dieTag(act())}<br><b class="tapl" style="color:#e0452b;display:inline-block;margin-top:6px;font-size:1.06em">👉 ${X0.hintPick}</b>`, 1); }
      else if (phase === 'dest') { arrow.scale.setScalar(1.35); anim(380, k => arrow.scale.setScalar(1.35 - .35 * k)); line(`${dieTag(act())}<br><b class="tapl" style="color:#e0452b;display:inline-block;margin-top:6px;font-size:1.06em">👉 ${X0.hintDest}</b>`, 1); }
      armIdle();
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const waiting = () => { const st = STEPS[step]; return (st.acts || st.roll) && !played; };
    function buttons() {
      const st = STEPS[step], wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = st.last ? L.start + ' ▶' : wait ? (st.roll ? L.roll : phase === 'dest' ? X0.tapDest : X0.tapCk) : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; ai = 0; phase = ''; cur = sel = null; clearTimeout(idleT); clearGuide();
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(st.pos); clearDice(); setCube(64, !!(st.cube || st.last || st === STEPS[0]));
      if (st.dice) diceAt(st.dice);
      later(() => {
        (st.glow || []).forEach(p => glowPt(p));
        if (st.tray) trayGlow(0);
        (st.prime || []).forEach(p => glowPt(p, 0xffc928, .3, false));
        (st.cross || []).forEach(p => { const [x, z] = landXZ(0, p); cross(x, z); });
        if (st.acts) startAct();
        if (st.win) { $('.cnt').innerHTML = `<span class="tag">${L.gammon}</span> <span class="tag">${L.bg}</span>`; SFX.chime(); }
        if (st.cube) later(cubeShow, 700);
      }, 380 + cnt * 14);
      say(L.s[step].say); buttons();
    }
    function cubeShow() {   // the cube is offered: it turns to 2, then slides over to the opponent, who takes it
      if (!cubeM) return; busy = true;
      const p0 = cubeM.position.clone();
      anim(520, k => { cubeM.position.y = p0.y + Math.sin(k * Math.PI) * 1.2; cubeM.rotation.x = io(k) * Math.PI / 2; }, () => {
        setCube(2); const c2 = cubeM, q0 = c2.position.clone(), q1 = new TH.Vector3(g.TX + g.TW / 2 - W2, BG.FY + BG.RH + .43, -.75);
        SFX.tok(.8, 1.5);
        later(() => anim(700, k => { const e = io(k); c2.position.lerpVectors(q0, q1, e); c2.position.y += Math.sin(k * Math.PI) * .8; c2.rotation.y = .1 + e * Math.PI * .5; }, () => { SFX.tok(.9, 1.3); busy = false; $('.cnt').innerHTML = `<span class="tag">×2 · ${L.take}</span>`; }), 350);
      });
    }
    // which point / bar / tray was tapped (board units → gold's numbering)
    function hitOf(e) {
      const p0 = T3.pick(e, Y * SC); if (!p0) return null;
      const p = FR ? FR.toBoard(p0) : { x: p0.x / SC, z: p0.z / SC }, ux = p.x + W2, uy = p.z + H2;
      if (ux >= g.TX - .15 && ux <= g.TX + g.TW + .3) return 'off';
      if (ux >= g.BX && ux < g.RX) return 'bar';
      if (uy < g.TOP - .3 || uy > g.BOT + .3) return null;
      const top = uy < g.MID;
      if (ux >= g.LX && ux < g.BX) { const col = Math.floor(ux - g.LX); return top ? 13 + col : 12 - col; }
      if (ux >= g.RX && ux < g.RE) { const col = Math.floor(ux - g.RX); return top ? 19 + col : 6 - col; }
      return null;
    }
    function finish(extra) { busy = false; if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (played) return;
      if (st.roll) { played = true; busy = true; rollDice(st.roll, () => later(() => finish(), 200)); return; }
      const a = act(); if (!a || !phase) return;
      const q = hitOf(e);
      if (phase === 'pick') { if (q === a.from) pickCk(); else nudge(); return; }
      if (phase === 'dest') { const P = pathOf(a); if (q === P[P.length - 1]) doMove(); else if (q !== a.from) nudge(); return; }
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
    return {
      stop() { stopped = true; if (FR) FR.stop(); clearTimeout(idleT); hideHand(); arrowEl.remove(); hidden.forEach(o => { o.visible = true; }); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); },
      panel: el,
      _debug: { pt: (p, side = 0) => { const [x, z] = landXZ(side, p); return curXYZ(x, Y, z); }, ck: () => cur ? curXYZ(cur.m.position.x, Y, cur.m.position.z) : null, act: () => { const a = act(); if (!a) return null; const P = pathOf(a); return { from: a.from, dest: P[P.length - 1], phase }; }, step: () => step },
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.backgammon = { start, SFX };   // SFX: shared with the table play (atlas/games/backgammon.js)
})();
