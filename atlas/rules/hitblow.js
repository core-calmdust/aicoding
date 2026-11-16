/* =====================================================================
   ヒット＆ブロー rules — a guided tour on the 3D table (the Midnight board, atlas/models/hitblow.js, seen straight down as in
   play), told by the Cub Detective Bunny (the Lv.1–3 Atlamo, av/boss-hitblow-1-0).
   A short course: the code under the case's lid · a first guess with the real input tray · hit (pink) and blow (white),
   explained with the lid peeked open · the pins never say which gem they mean · a guided deduction (two clue rows → the
   learner lines up the answer) · one board, two players taking turns · the five rules (a ナンバー4 board) · the daily
   puzzle and the puzzle book. Every answer is the game's own (../hitblow/engine.js feedback()).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Gems: 0 赤い炎 · 1 黄色い稲妻 · 2 緑の葉 · 3 青いしずく · 4 紫の月 · 5 ピンクのハート (ナンバー: the digit).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/boss-hitblow-1-0.webp', ENG = '../hitblow/engine.js?v=5', ROWS = 6;
  const loadEngine = () => window.HitBlowEngine ? Promise.resolve(window.HitBlowEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.HitBlowEngine ? res(window.HitBlowEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  // z: the rule (engine RULES); rows: the rows on the board ({ g, by }: by 0 = you (mint) · 1 = the rival (pink) · 2 = a clue (grey)),
  // 'mine' = the learner's first row; sec: the hidden code; lid: the case open; act: what the step waits for; mark: what is pointed at
  const STEPS = [
    { z: 1, rows: [], sec: [3, 0, 5, 1], mark: 'case', rattle: true },
    { z: 1, rows: [], act: 'row' },
    { z: 1, rows: 'mine', lid: true, mark: 'hb' },
    { z: 1, rows: 'mine', mark: 'pins' },
    { z: 1, rows: [{ g: [0, 1, 2, 3], by: 2 }, { g: [1, 0, 2, 3], by: 2 }], sec: [1, 0, 3, 2], act: 'solve', mark: 'same', rattle: true },
    { z: 1, rows: [{ g: [0, 1, 2, 3], by: 0 }, { g: [2, 0, 4, 5], by: 1 }, { g: [4, 5, 2, 0], by: 0 }, { g: [5, 2, 0, 4], by: 1 }], sec: [5, 2, 0, 4], demo: true },
    { z: 4, rows: [{ g: [0, 1, 2, 3], by: 0 }, { g: [4, 5, 6, 7], by: 1 }, { g: [9, 3, 7, 4], by: 0 }], sec: [7, 3, 9, 4] },
    { z: 1, rows: [{ g: [0, 1, 2, 3], by: 2 }, { g: [2, 4, 1, 5], by: 2 }], sec: [1, 5, 4, 0], active: true, last: true },
  ];
  const MINE0 = { g: [3, 1, 0, 2], sec: [3, 0, 5, 1] };   // (the peek's row when the learner's own is not there: 1 hit · 2 blows)

  const TXT = {
    ja: { name: 'みならい探偵ウサギ', next: 'つぎへ', back: 'もどる', start: '遊んでみる', again: 'もういちど', tap: '4つ並べてOK', dup: '同じ色は1行に1回だけだよ', tried: 'その並びはもう出てるよ', retry: 'おしい！ 光る2つはヒットじゃないから、2行目の右の2つを入れかえてみて！', reset: '行がなくなっちゃった。はじめからもう一回！',
      s: [
      { say: 'こんにちは、<b>みならい探偵ウサギ</b>だよ！ 奥のケースの<b>？の蓋の下</b>に宝石が4つ。その並びを当てるのが<b>ヒット＆ブロー</b>。耳をあてても聞こえないから、推理でいこう！' },
      { say: 'まずは予想を1行。トレイの宝石を<b>4つタップ</b>して、<b>OK</b>をタップ。同じ色は1行に1回だけ。当てずっぽうでいいの、ぼくもいつもそう！', done: 'ピンが出た！ 行の右の<b>小さなピン</b>が、ケースからの答えだよ。' },
      { say: 'ないしょでケースを開けちゃった！ <b>色も場所もぴったり</b>なら<b>ヒット</b>＝<b>ピンクのピン</b>。<b>色はあるけど場所ちがい</b>なら<b>ブロー</b>＝<b>白いピン</b>。輪っかの色でたしかめてね。' },
      { say: '本番は蓋が閉じたまま。ピンは<b>ヒットが先</b>に並ぶだけで、<b>どの宝石のことかは言わない</b>の。そこを考えるのが探偵の腕の見せどころ！ あれ、ルーペがくもってきた…' },
      { say: '推理しよう！ 1行目は<b>白いピンが4つ</b>：色はこの4つで、全部場所ちがい。2行目の<b>光る2つは1行目と同じ場所</b>だからヒットじゃない。答えを並べてOK！', done: '事件解決！ ケースの中身とぴったり。これが推理の楽しさだよ！' },
      { say: '本番は<b>1つの盤を2人で交互に</b>。相手の行も丸見えだから、<b>相手の予想も手がかり</b>になるの。先に全部ヒットで勝ち、行が尽きたら引き分け。あっ、先を越された！' },
      { say: '種目は5つ：<b>カラー</b>、同じ色もOKの<b>重複あり</b>、数字の<b>ナンバー3・4</b>、8色から5つの<b>エキスパート</b>。これはナンバー4、考え方は同じ。数はニンジンで数えてるの！' },
      { say: '<b>今日の一問</b>は灰色の<b>手がかりの行</b>つきで、決められた回数で当てるパズル。<b>問題集</b>には500問！ さあ、事件のはじまりだよ。遊んでみよう！' },
    ] },
    en: { name: 'Cub Detective Bunny', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Place 4, then OK', dup: 'Each colour only once per row!', tried: "That row's already on the board", retry: 'So close! The glowing two can\'t be hits — try row 2 with its right two swapped!', reset: 'Out of rows! Let’s start this one over',
      s: [
      { say: "Hi, I'm the <b>Cub Detective Bunny</b>! Under the <b>？ lid of the case</b> at the far end, four gems are hiding. Guess their order — that's <b>Hit & Blow</b>. Pressing my ears to it won't help, so let's use logic!" },
      { say: 'First, one guess. <b>Tap 4 gems</b> in the tray below to line them up, then tap <b>OK</b>. Each colour only once per row. A wild guess is fine — I do it all the time!', done: 'Pins popped up! The <b>little pins</b> right of the row are the case’s answer.' },
      { say: 'I peeked in the case, shh! <b>Right colour, right place</b> is a <b>hit</b> — a <b>pink pin</b>. <b>Right colour, wrong place</b> is a <b>blow</b> — a <b>white pin</b>. Check the colours of the rings!' },
      { say: 'In a real game the lid stays shut. The pins just line up, <b>hits first</b>, and <b>never say which gem they mean</b>. Working that out is the detective’s job! Hmm, my magnifier is fogging up…' },
      { say: 'Let’s deduce! Row 1 has <b>4 white pins</b>: these four colours, all in the wrong places. In row 2 the <b>two glowing gems sit where they did in row 1</b>, so the hits are the two on the left. Line up the answer and tap OK!', done: 'Case closed! It matches the case exactly. That’s the fun of deduction!' },
      { say: 'In a real game <b>two players take turns on one board</b>. You see the rival’s rows and pins too, so <b>their guesses are clues for you</b>. First to all hits wins; out of rows is a draw. Oh no, they beat me to it!' },
      { say: 'There are 5 rules: <b>Colour</b>, <b>Colour (repeats)</b> where a colour may come back, <b>Number 3 and Number 4</b> with digits, and <b>Expert</b>, 5 of 8 colours. This is Number 4 — same thinking. I count in carrots!' },
      { say: 'The <b>daily puzzle</b> starts with grey <b>clue rows</b> already on the board — crack it within the limit. The <b>puzzle book</b> has 500 more! A new case awaits. Let’s play!' },
    ] },
    zh: { name: '见习侦探兔', next: '下一步', back: '返回', start: '开始玩', again: '再来一次', tap: '放好4个再按OK', dup: '同一种颜色一行只能用一次哦', tried: '这个排列已经出现过啦', retry: '差一点！发光的2颗不是命中，试试把第2行右边2颗对调！', reset: '行用完啦，从头再来一次！',
      s: [
      { say: '你好，我是<b>见习侦探兔</b>！远处盒子的<b>“？”盖子下面</b>藏着4颗宝石。猜出它们的顺序，就是<b>Hit & Blow</b>。把耳朵贴上去也听不到，所以要靠推理！' },
      { say: '先猜一行。<b>点击下方托盘里的4颗宝石</b>排好，再点<b>OK</b>。同一种颜色一行只能用一次。随便猜也没关系，我也总是这样！', done: '小钉出来了！行右边的<b>小钉</b>就是盒子给的回答。' },
      { say: '我偷偷打开了盒子，嘘！<b>颜色和位置都对</b>是<b>命中（Hit）</b>＝<b>粉色的小钉</b>。<b>颜色对但位置不对</b>是<b>偏离（Blow）</b>＝<b>白色的小钉</b>。看看圆环的颜色吧！' },
      { say: '正式比赛时盖子一直关着。小钉只是<b>命中排在前面</b>，<b>不会告诉你是哪颗宝石</b>。想出这一点正是侦探的本事！咦，我的放大镜起雾了…' },
      { say: '来推理吧！第1行有<b>4颗白钉</b>：颜色就是这4种，但位置全错。第2行<b>发光的2颗和第1行位置相同</b>，所以命中的是左边2颗。排好答案按OK！', done: '破案啦！和盒子里的一模一样。这就是推理的乐趣！' },
      { say: '正式比赛是<b>两个人轮流用同一块盘</b>。对手的行和小钉也看得见，所以<b>对手的猜测也是你的线索</b>。先全部命中者胜，行用完就是平局。啊，被抢先了！' },
      { say: '规则有5种：<b>颜色</b>、颜色可重复的<b>颜色（可重复）</b>、用数字的<b>数字3・数字4</b>，还有8色选5个的<b>专家</b>。这是数字4，思路一样。我都用胡萝卜来数数！' },
      { say: '<b>每日一题</b>一开始盘上就有灰色的<b>提示行</b>，要在限定次数内猜中。<b>题库</b>还有500题！新案件来了，开始玩吧！' },
    ] },
    'zh-TW': { name: '見習偵探兔', next: '下一步', back: '返回', start: '開始玩', again: '再來一次', tap: '放好4個再按OK', dup: '同一種顏色一列只能用一次喔', tried: '這個排列已經出現過啦', retry: '差一點！發光的2顆不是命中，試試把第2列右邊2顆對調！', reset: '列用完啦，從頭再來一次！',
      s: [
      { say: '你好，我是<b>見習偵探兔</b>！遠處盒子的<b>「？」蓋子下面</b>藏著4顆寶石。猜出它們的順序，就是<b>Hit & Blow</b>。把耳朵貼上去也聽不到，所以要靠推理！' },
      { say: '先猜一列。<b>點擊下方托盤裡的4顆寶石</b>排好，再點<b>OK</b>。同一種顏色一列只能用一次。隨便猜也沒關係，我也總是這樣！', done: '小釘出來了！列右邊的<b>小釘</b>就是盒子給的回答。' },
      { say: '我偷偷打開了盒子，噓！<b>顏色和位置都對</b>是<b>命中（Hit）</b>＝<b>粉色的小釘</b>。<b>顏色對但位置不對</b>是<b>偏離（Blow）</b>＝<b>白色的小釘</b>。看看圓環的顏色吧！' },
      { say: '正式比賽時蓋子一直關著。小釘只是<b>命中排在前面</b>，<b>不會告訴你是哪顆寶石</b>。想出這一點正是偵探的本事！咦，我的放大鏡起霧了…' },
      { say: '來推理吧！第1列有<b>4顆白釘</b>：顏色就是這4種，但位置全錯。第2列<b>發光的2顆和第1列位置相同</b>，所以命中的是左邊2顆。排好答案按OK！', done: '破案啦！和盒子裡的一模一樣。這就是推理的樂趣！' },
      { say: '正式比賽是<b>兩個人輪流用同一塊盤</b>。對手的列和小釘也看得見，所以<b>對手的猜測也是你的線索</b>。先全部命中者勝，列用完就是平手。啊，被搶先了！' },
      { say: '規則有5種：<b>顏色</b>、顏色可重複的<b>顏色（可重複）</b>、用數字的<b>數字3・數字4</b>，還有8色選5個的<b>專家</b>。這是數字4，思路一樣。我都用紅蘿蔔來數數！' },
      { say: '<b>每日一題</b>一開始盤上就有灰色的<b>提示列</b>，要在限定次數內猜中。<b>題庫</b>還有500題！新案件來了，開始玩吧！' },
    ] },
    ko: { name: '견습탐정토끼', next: '다음', back: '이전', start: '놀아 보기', again: '다시 하기', tap: '4개 놓고 OK', dup: '같은 색은 한 줄에 한 번만!', tried: '그 배열은 이미 나왔어', retry: '아깝다! 빛나는 2개는 히트가 아니니까, 2번째 줄의 오른쪽 2개를 바꿔 봐!', reset: '줄이 다 찼어. 처음부터 다시!',
      s: [
      { say: '안녕, 나는 <b>견습탐정토끼</b>야! 저 안쪽 케이스의 <b>？ 뚜껑 아래</b>에 보석 4개가 숨어 있어. 그 순서를 맞히는 게 <b>히트 앤 블로</b>. 귀를 대도 안 들리니까 추리로 가자!' },
      { say: '먼저 예상을 한 줄. 아래 트레이의 보석을 <b>4개 탭</b>해서 늘어놓고 <b>OK</b>를 탭해. 같은 색은 한 줄에 한 번만. 찍어도 괜찮아, 나도 늘 그래!', done: '핀이 나왔어! 줄 오른쪽의 <b>작은 핀</b>이 케이스의 대답이야.' },
      { say: '몰래 케이스를 열어 버렸어, 쉿! <b>색도 자리도 딱 맞으면</b> <b>히트</b>＝<b>분홍색 핀</b>. <b>색은 있는데 자리가 다르면</b> <b>블로</b>＝<b>흰 핀</b>. 고리 색으로 확인해 봐!' },
      { say: '실전에서는 뚜껑이 닫혀 있어. 핀은 <b>히트부터 모아서</b> 놓일 뿐, <b>어느 보석 얘기인지는 안 알려 줘</b>. 그걸 알아내는 게 탐정의 실력이지! 어라, 돋보기에 김이 서렸네…' },
      { say: '추리해 보자! 1번째 줄은 <b>흰 핀 4개</b>: 색은 이 4가지인데 전부 자리가 달라. 2번째 줄의 <b>빛나는 2개는 1번째 줄과 같은 자리</b>니까 히트는 왼쪽 2개. 답을 늘어놓고 OK!', done: '사건 해결! 케이스 안과 똑같아. 이게 추리의 재미야!' },
      { say: '실전은 <b>판 하나를 둘이 번갈아</b> 써. 상대의 줄과 핀도 다 보이니까 <b>상대의 예상도 단서</b>가 돼. 먼저 전부 히트하면 승리, 줄을 다 쓰면 무승부. 앗, 선수를 뺏겼다!' },
      { say: '종목은 5가지. <b>컬러</b> 말고도 같은 색을 여러 번 쓰는 <b>컬러(중복)</b>, 숫자로 하는 <b>넘버3·넘버4</b>, 8색 중 5개인 <b>엑스퍼트</b>. 이건 넘버4, 생각하는 법은 같아. 나는 당근으로 숫자를 세!' },
      { say: '<b>오늘의 문제</b>는 회색 <b>단서 줄</b>이 처음부터 놓여 있고, 정해진 횟수 안에 맞히는 퍼즐. <b>문제집</b>에는 500문제! 자, 사건의 시작이야. 놀아 보자!' },
    ] },
    es: { name: 'Conejita detective', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Pon 4 y pulsa OK', dup: '¡Cada color solo una vez por fila!', tried: 'Esa fila ya está en el tablero', retry: '¡Casi! Las dos que brillan no pueden ser hits: prueba la fila 2 cambiando las dos de la derecha.', reset: '¡Se acabaron las filas! Empecemos de nuevo',
      s: [
      { say: '¡Hola, soy la <b>Conejita detective</b>! Bajo la <b>tapa con ？ de la caja</b>, al fondo, se esconden cuatro gemas. Adivinar su orden es <b>Hit & Blow</b>. Pegar las orejas no sirve, ¡así que a deducir!' },
      { say: 'Primero, una apuesta. <b>Toca 4 gemas</b> de la bandeja de abajo para ponerlas en fila y toca <b>OK</b>. Cada color, una vez por fila. Adivinar a lo loco vale: ¡yo lo hago siempre!', done: '¡Salieron clavijas! Las <b>clavijas pequeñas</b> a la derecha de la fila son la respuesta de la caja.' },
      { say: '¡He espiado la caja, chis! <b>Color y sitio correctos</b> es un <b>hit</b>: <b>clavija rosa</b>. <b>Color correcto en otro sitio</b> es un <b>blow</b>: <b>clavija blanca</b>. ¡Mira el color de los aros!' },
      { say: 'En la partida la tapa sigue cerrada. Las clavijas solo se ordenan, <b>hits primero</b>, y <b>nunca dicen de qué gema hablan</b>. ¡Averiguarlo es cosa de detectives! Ay, se me empaña la lupa…' },
      { say: '¡A deducir! La fila 1 tiene <b>4 clavijas blancas</b>: son estos cuatro colores, todos fuera de sitio. En la fila 2 las <b>dos gemas que brillan están donde en la fila 1</b>, así que los hits son las dos de la izquierda. ¡Ordena la respuesta y pulsa OK!', done: '¡Caso resuelto! Coincide con la caja. ¡Esa es la gracia de deducir!' },
      { say: 'En la partida, <b>dos jugadores usan un solo tablero por turnos</b>. Ves las filas y clavijas del rival, así que <b>sus intentos también son pistas</b>. Gana quien acierte todo primero; sin filas, empate. ¡Ay, se me adelantó!' },
      { say: 'Hay 5 reglas: <b>Color</b>, <b>Color (con repetición)</b>, <b>Número 3 y Número 4</b> con cifras, y <b>Experto</b>, 5 de 8 colores. Esto es Número 4: se piensa igual. ¡Yo cuento con zanahorias!' },
      { say: 'El <b>reto del día</b> empieza con <b>filas de pistas</b> grises ya en el tablero: descífralo dentro del límite. ¡Y el <b>libro de retos</b> tiene 500! Un nuevo caso nos espera. ¡A jugar!' },
    ] },
    fr: { name: 'Lapin détective', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Place 4 gemmes, puis OK', dup: 'Chaque couleur une seule fois par ligne !', tried: 'Cette ligne est déjà sur le plateau', retry: 'Presque ! Les deux qui brillent ne sont pas des hits : essaie la ligne 2 en échangeant les deux de droite.', reset: 'Plus de lignes ! On recommence celle-ci',
      s: [
      { say: 'Coucou, je suis le <b>Lapin détective</b> ! Sous le <b>couvercle ？ de l’écrin</b>, au fond, se cachent quatre gemmes. Deviner leur ordre, c’est <b>Hit & Blow</b>. Coller mes oreilles n’y fait rien : place à la logique !' },
      { say: 'D’abord, un essai. <b>Touche 4 gemmes</b> du plateau du bas pour les aligner, puis touche <b>OK</b>. Chaque couleur une fois par ligne. Au hasard, c’est permis : moi, je fais toujours ça !', done: 'Des fiches ! Les <b>petites fiches</b> à droite de la ligne sont la réponse de l’écrin.' },
      { say: 'J’ai jeté un œil dans l’écrin, chut ! <b>Bonne couleur, bonne place</b> : un <b>hit</b>, <b>fiche rose</b>. <b>Bonne couleur, mauvaise place</b> : un <b>blow</b>, <b>fiche blanche</b>. Regarde la couleur des anneaux !' },
      { say: 'En vraie partie, le couvercle reste fermé. Les fiches se rangent juste, <b>hits d’abord</b>, et <b>ne disent jamais de quelle gemme il s’agit</b>. Le trouver, c’est le métier de détective ! Oh, ma loupe s’embue…' },
      { say: 'Déduisons ! La ligne 1 a <b>4 fiches blanches</b> : ces quatre couleurs, toutes mal placées. Dans la ligne 2, les <b>deux gemmes qui brillent sont à la même place qu’en ligne 1</b>, donc les hits sont les deux de gauche. Aligne la réponse et touche OK !', done: 'Affaire résolue ! C’est exactement l’écrin. Voilà le plaisir de la déduction !' },
      { say: 'En vraie partie, <b>deux joueurs se partagent un plateau, chacun son tour</b>. On voit les lignes et fiches de l’autre : <b>ses essais sont aussi des indices</b>. Le premier à tout trouver gagne ; plus de lignes, match nul. Oh non, doublé !' },
      { say: 'Il y a 5 règles : <b>Couleur</b>, <b>Couleur (répétitions)</b>, <b>Nombre 3 et Nombre 4</b> avec des chiffres, et <b>Expert</b>, 5 couleurs sur 8. Voici Nombre 4 : même raisonnement. Moi, je compte en carottes !' },
      { say: 'Le <b>défi du jour</b> commence avec des <b>lignes d’indices</b> grises déjà posées : trouve le code dans la limite. Le <b>recueil</b> en a 500 ! Une nouvelle enquête t’attend. On joue !' },
    ] },
    pt: { name: 'Coelho detetive', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Coloque 4 e OK', dup: 'Cada cor só uma vez por linha!', tried: 'Essa linha já está no tabuleiro', retry: 'Quase! As duas que brilham não são hits: tente a linha 2 trocando as duas da direita.', reset: 'Acabaram as linhas! Vamos recomeçar esta',
      s: [
      { say: 'Oi, eu sou o <b>Coelho detetive</b>! Sob a <b>tampa com ？ do estojo</b>, lá no fundo, há quatro gemas escondidas. Adivinhar a ordem delas é o <b>Hit & Blow</b>. Encostar as orelhas não adianta, então vamos de lógica!' },
      { say: 'Primeiro, um palpite. <b>Toque em 4 gemas</b> da bandeja de baixo para enfileirá-las e toque em <b>OK</b>. Cada cor uma vez por linha. Chutar vale — eu chuto sempre!', done: 'Saíram pinos! Os <b>pininhos</b> à direita da linha são a resposta do estojo.' },
      { say: 'Espiei o estojo, psiu! <b>Cor e lugar certos</b> é um <b>hit</b>: <b>pino rosa</b>. <b>Cor certa no lugar errado</b> é um <b>blow</b>: <b>pino branco</b>. Confira a cor dos anéis!' },
      { say: 'No jogo de verdade a tampa fica fechada. Os pinos só se alinham, <b>hits primeiro</b>, e <b>nunca dizem de qual gema falam</b>. Descobrir isso é trabalho de detetive! Ih, minha lupa embaçou…' },
      { say: 'Vamos deduzir! A linha 1 tem <b>4 pinos brancos</b>: são essas quatro cores, todas fora do lugar. Na linha 2 as <b>duas gemas que brilham estão onde estavam na linha 1</b>, então os hits são as duas da esquerda. Monte a resposta e toque em OK!', done: 'Caso resolvido! Igualzinho ao estojo. Essa é a graça de deduzir!' },
      { say: 'No jogo de verdade <b>dois jogadores usam um só tabuleiro, revezando</b>. Você vê as linhas e pinos do rival, então <b>os palpites dele também são pistas</b>. Vence quem acertar tudo primeiro; sem linhas, empate. Ah, ele chegou antes!' },
      { say: 'São 5 regras: <b>Cor</b>, <b>Cor (com repetição)</b>, <b>Número 3 e Número 4</b> com dígitos, e <b>Especialista</b>, 5 de 8 cores. Este é o Número 4: mesmo raciocínio. Eu conto em cenouras!' },
      { say: 'O <b>desafio do dia</b> já começa com <b>linhas de pistas</b> cinzentas no tabuleiro: decifre dentro do limite. O <b>livro de desafios</b> tem 500! Um novo caso espera. Vamos jogar!' },
    ] },
    de: { name: 'Detektiv-Häschen', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: '4 setzen, dann OK', dup: 'Jede Farbe nur einmal pro Reihe!', tried: 'Diese Reihe liegt schon auf dem Brett', retry: 'Knapp! Die zwei leuchtenden sind keine Hits – probier Reihe 2 mit den rechten zwei vertauscht!', reset: 'Keine Reihen mehr! Wir fangen diese neu an',
      s: [
      { say: 'Hallo, ich bin das <b>Detektiv-Häschen</b>! Unter dem <b>？-Deckel des Kästchens</b> hinten liegen vier Edelsteine versteckt. Ihre Reihenfolge erraten – das ist <b>Hit & Blow</b>. Lauschen mit den Ohren hilft nicht, also: Logik!' },
      { say: 'Zuerst ein Tipp. <b>Tippe 4 Steine</b> in der Schale unten an, um sie aufzureihen, dann tippe <b>OK</b>. Jede Farbe einmal pro Reihe. Raten ist erlaubt – mache ich ständig!', done: 'Stecker! Die <b>kleinen Stecker</b> rechts der Reihe sind die Antwort des Kästchens.' },
      { say: 'Ich hab heimlich ins Kästchen geschaut, pssst! <b>Richtige Farbe, richtiger Platz</b> ist ein <b>Hit</b> – ein <b>rosa Stecker</b>. <b>Richtige Farbe, falscher Platz</b> ist ein <b>Blow</b> – ein <b>weißer Stecker</b>. Sieh dir die Ringe an!' },
      { say: 'Im echten Spiel bleibt der Deckel zu. Die Stecker liegen nur da, <b>Hits zuerst</b>, und <b>verraten nie, welcher Stein gemeint ist</b>. Das herauszufinden ist Detektivarbeit! Huch, meine Lupe beschlägt…' },
      { say: 'Kombinieren wir! Reihe 1 hat <b>4 weiße Stecker</b>: genau diese vier Farben, alle am falschen Platz. In Reihe 2 liegen die <b>zwei leuchtenden Steine wie in Reihe 1</b>, also sind die Hits die zwei links. Leg die Lösung und tippe OK!', done: 'Fall gelöst! Genau wie im Kästchen. Das ist der Spaß am Kombinieren!' },
      { say: 'Im echten Spiel <b>teilen sich zwei ein Brett und ziehen abwechselnd</b>. Du siehst die Reihen und Stecker des Gegners – <b>seine Tipps sind auch deine Hinweise</b>. Wer zuerst alles trifft, gewinnt; keine Reihen mehr: unentschieden. Oh nein, zu spät!' },
      { say: 'Es gibt 5 Regeln: <b>Farbe</b>, <b>Farbe (Wiederholung)</b>, <b>Zahl 3 und Zahl 4</b> mit Ziffern und <b>Experte</b>, 5 von 8 Farben. Das hier ist Zahl 4 – gleiches Denken. Ich zähle in Möhren!' },
      { say: 'Das <b>Tagesrätsel</b> beginnt mit grauen <b>Hinweisreihen</b> auf dem Brett – knacke es im Limit. Im <b>Rätselbuch</b> warten 500! Ein neuer Fall wartet. Los geht’s!' },
    ] },
    ru: { name: 'Зайчик-сыщик', next: 'Далее', back: 'Назад', start: 'Играть', again: 'Ещё раз', tap: 'Поставь 4 и OK', dup: 'Каждый цвет — один раз в ряду!', tried: 'Такой ряд уже есть на доске', retry: 'Почти! Два светящихся — не хиты: попробуй ряд 2, поменяв местами два правых.', reset: 'Ряды кончились! Начнём заново',
      s: [
      { say: 'Привет, я <b>Зайчик-сыщик</b>! Под <b>крышкой с «？»</b> у шкатулки в дальнем конце спрятаны четыре камня. Угадать их порядок — это и есть <b>Hit & Blow</b>. Прикладывать уши бесполезно, так что — логика!' },
      { say: 'Сначала догадка. <b>Нажми на 4 камня</b> в лотке внизу, чтобы выстроить ряд, и нажми <b>OK</b>. Каждый цвет — один раз в ряду. Наугад можно — я всегда так делаю!', done: 'Появились штырьки! <b>Маленькие штырьки</b> справа от ряда — ответ шкатулки.' },
      { say: 'Я тайком заглянул в шкатулку, тсс! <b>Цвет и место верные</b> — это <b>хит</b>, <b>розовый штырёк</b>. <b>Цвет есть, но место другое</b> — это <b>блоу</b>, <b>белый штырёк</b>. Сверь по цвету колец!' },
      { say: 'В настоящей игре крышка закрыта. Штырьки просто стоят, <b>сначала хиты</b>, и <b>никогда не говорят, о каком камне речь</b>. Догадаться — работа сыщика! Ой, лупа запотела…' },
      { say: 'Давай рассуждать! В ряду 1 <b>4 белых штырька</b>: цвета эти четыре, но все не на месте. В ряду 2 <b>два светящихся камня стоят там же, где в ряду 1</b>, значит, хиты — два слева. Выстрой ответ и нажми OK!', done: 'Дело раскрыто! Точно как в шкатулке. Вот в чём радость рассуждений!' },
      { say: 'В настоящей игре <b>двое по очереди играют на одной доске</b>. Ряды и штырьки соперника видны, так что <b>его догадки — тоже твои подсказки</b>. Кто первым угадает всё, побеждает; ряды кончились — ничья. Ой, меня опередили!' },
      { say: 'Правил 5: <b>Цвета</b>, <b>Цвета (с повтором)</b>, <b>Числа 3 и Числа 4</b> с цифрами и <b>Эксперт</b> — 5 из 8 цветов. Это Числа 4 — думать так же. А я считаю морковками!' },
      { say: '<b>Задача дня</b> начинается с серых <b>рядов-подсказок</b> на доске — разгадай код за отведённые ходы. В <b>сборнике</b> ещё 500! Новое дело ждёт. Играем!' },
    ] },
    tr: { name: 'Dedektif Tavşan', next: 'Sonraki', back: 'Geri', start: 'Oyna', again: 'Tekrar', tap: '4 koy, sonra OK', dup: 'Her renk satırda bir kez!', tried: 'Bu satır zaten tahtada', retry: 'Az kaldı! Parlayan ikisi hit olamaz: 2. satırın sağdaki ikisinin yerini değiştir!', reset: 'Satırlar bitti! Bunu baştan alalım',
      s: [
      { say: 'Merhaba, ben <b>Dedektif Tavşan</b>! En arkadaki kutunun <b>？ kapağının altında</b> dört mücevher saklı. Sıralarını bulmak: işte <b>Hit & Blow</b>. Kulağımı dayasam da duyulmuyor, o yüzden mantık!' },
      { say: 'Önce bir tahmin. Alttaki tepsiden <b>4 mücevhere dokunup</b> sıraya koy, sonra <b>OK</b>’e dokun. Her renk satırda bir kez. Rastgele de olur, ben hep öyle yapıyorum!', done: 'Pimler çıktı! Satırın sağındaki <b>küçük pimler</b> kutunun cevabı.' },
      { say: 'Gizlice kutuya baktım, şşş! <b>Renk de yer de doğru</b>ysa <b>hit</b>: <b>pembe pim</b>. <b>Renk var ama yer yanlış</b>sa <b>blow</b>: <b>beyaz pim</b>. Halkaların rengine bak!' },
      { say: 'Gerçek oyunda kapak kapalı kalır. Pimler sadece dizilir, <b>önce hitler</b>, ve <b>hangi mücevherden söz ettiğini asla söylemez</b>. Bunu çözmek dedektifin işi! Eyvah, büyütecim buğulandı…' },
      { say: 'Hadi çıkarım yapalım! 1. satırda <b>4 beyaz pim</b> var: renkler bu dördü, hepsi yanlış yerde. 2. satırda <b>parlayan iki taş 1. satırdakiyle aynı yerde</b>, yani hitler soldaki ikisi. Cevabı diz ve OK’e dokun!', done: 'Dava çözüldü! Kutudakiyle birebir aynı. İşte çıkarımın keyfi!' },
      { say: 'Gerçek oyunda <b>iki oyuncu tek tahtayı sırayla kullanır</b>. Rakibin satırları ve pimleri de görünür, yani <b>onun tahminleri de senin ipucun</b>. Önce hepsini isabet ettiren kazanır; satır biterse berabere. Eyvah, önce o buldu!' },
      { say: '5 kural var: <b>Renk</b>, <b>Renk (tekrarlı)</b>, rakamlarla <b>Sayı 3 ve Sayı 4</b> ve 8 renkten 5’lik <b>Uzman</b>. Bu Sayı 4: düşünce aynı. Ben havuçla sayarım!' },
      { say: '<b>Günün bulmacası</b>, tahtada hazır gri <b>ipucu satırlarıyla</b> başlar: sınır içinde çöz. <b>Bulmaca kitabında</b> 500 tane var! Yeni bir dava bekliyor. Haydi oynayalım!' },
    ] },
    id: { name: 'Kelinci Detektif', next: 'Lanjut', back: 'Kembali', start: 'Main', again: 'Lagi', tap: 'Pasang 4, lalu OK', dup: 'Tiap warna sekali saja per baris!', tried: 'Baris itu sudah ada di papan', retry: 'Hampir! Dua yang bersinar bukan hit — coba baris 2 dengan dua di kanan ditukar!', reset: 'Barisnya habis! Kita ulang dari awal',
      s: [
      { say: 'Halo, aku <b>Kelinci Detektif</b>! Di bawah <b>tutup ？ kotak</b> di ujung sana tersembunyi empat permata. Menebak urutannya, itulah <b>Hit & Blow</b>. Menempelkan telinga tidak membantu, jadi pakai logika!' },
      { say: 'Pertama, satu tebakan. <b>Ketuk 4 permata</b> di baki bawah untuk menyusunnya, lalu ketuk <b>OK</b>. Tiap warna sekali per baris. Asal tebak juga boleh, aku selalu begitu!', done: 'Pinnya muncul! <b>Pin kecil</b> di kanan baris adalah jawaban dari kotak.' },
      { say: 'Aku mengintip kotaknya, sst! <b>Warna dan tempat benar</b> itu <b>hit</b>: <b>pin merah muda</b>. <b>Warna ada tapi tempatnya salah</b> itu <b>blow</b>: <b>pin putih</b>. Cek warna cincinnya!' },
      { say: 'Di permainan sungguhan tutupnya tetap tertutup. Pin hanya berjajar, <b>hit dulu</b>, dan <b>tak pernah bilang permata mana yang dimaksud</b>. Memecahkannya itulah tugas detektif! Aduh, kaca pembesarku berembun…' },
      { say: 'Ayo menyimpulkan! Baris 1 punya <b>4 pin putih</b>: warnanya empat ini, semua di tempat yang salah. Di baris 2 <b>dua permata yang bersinar ada di tempat yang sama dengan baris 1</b>, jadi hitnya dua di kiri. Susun jawabannya dan ketuk OK!', done: 'Kasus terpecahkan! Persis seperti isi kotak. Itulah serunya menyimpulkan!' },
      { say: 'Di permainan sungguhan <b>dua pemain bergantian memakai satu papan</b>. Baris dan pin lawan juga terlihat, jadi <b>tebakannya juga petunjukmu</b>. Yang pertama semua hit menang; baris habis berarti seri. Yah, aku keduluan!' },
      { say: 'Ada 5 aturan: <b>Warna</b>, <b>Warna (boleh ulang)</b>, <b>Angka 3 dan Angka 4</b> dengan digit, dan <b>Ahli</b>, 5 dari 8 warna. Ini Angka 4: cara berpikirnya sama. Aku berhitung pakai wortel!' },
      { say: '<b>Teka-teki harian</b> dimulai dengan <b>baris petunjuk</b> abu-abu yang sudah ada di papan: pecahkan dalam batas. <b>Buku teka-teki</b> punya 500 lagi! Kasus baru menunggu. Ayo main!' },
    ] },
    hi: { name: 'नौसिखिया जासूस खरगोश', next: 'आगे', back: 'पीछे', start: 'खेलो', again: 'फिर से', tap: '4 रखो, फिर OK', dup: 'हर रंग एक पंक्ति में बस एक बार!', tried: 'यह पंक्ति बोर्ड पर पहले से है', retry: 'बस ज़रा सा! चमकते दो हिट नहीं हो सकते — पंक्ति 2 के दाएँ दो की जगह बदलकर देखो!', reset: 'पंक्तियाँ ख़त्म! इसे फिर से शुरू करें',
      s: [
      { say: 'नमस्ते, मैं <b>नौसिखिया जासूस खरगोश</b> हूँ! दूर वाले डिब्बे के <b>？ ढक्कन के नीचे</b> चार रत्न छिपे हैं। उनका क्रम बूझना ही <b>हिट एंड ब्लो</b> है। कान लगाने से कुछ नहीं सुनता, तो तर्क से चलें!' },
      { say: 'पहले एक अनुमान। नीचे की ट्रे के <b>4 रत्नों पर टैप</b> करके उन्हें लाइन में रखो, फिर <b>OK</b> पर टैप करो। हर रंग पंक्ति में एक बार। तुक्का भी चलेगा — मैं तो हमेशा यही करता हूँ!', done: 'पिनें निकल आईं! पंक्ति के दाईं ओर की <b>छोटी पिनें</b> डिब्बे का जवाब हैं।' },
      { say: 'मैंने चुपके से डिब्बे में झाँक लिया, श्श! <b>रंग और जगह दोनों सही</b> तो <b>हिट</b> — <b>गुलाबी पिन</b>। <b>रंग है पर जगह ग़लत</b> तो <b>ब्लो</b> — <b>सफ़ेद पिन</b>। छल्लों का रंग देखो!' },
      { say: 'असली खेल में ढक्कन बंद रहता है। पिनें बस <b>पहले हिट</b> के क्रम में लगती हैं और <b>कभी नहीं बतातीं कि बात किस रत्न की है</b>। यही पता लगाना जासूस का काम है! अरे, मेरा आवर्धक काँच धुँधला गया…' },
      { say: 'चलो सोचें! पंक्ति 1 में <b>4 सफ़ेद पिनें</b>: रंग यही चार हैं, पर सब ग़लत जगह। पंक्ति 2 के <b>चमकते दो रत्न पंक्ति 1 वाली जगह पर ही हैं</b>, तो हिट बाईं ओर के दो हैं। जवाब लगाओ और OK करो!', done: 'केस सुलझ गया! डिब्बे से हूबहू मेल। यही है तर्क का मज़ा!' },
      { say: 'असली खेल में <b>दो खिलाड़ी एक ही बोर्ड पर बारी-बारी</b> खेलते हैं। विरोधी की पंक्तियाँ और पिनें भी दिखती हैं, तो <b>उसके अनुमान भी तुम्हारे सुराग</b> हैं। पहले सब हिट करने वाला जीतता है; पंक्तियाँ ख़त्म तो ड्रॉ। अरे, वह आगे निकल गया!' },
      { say: '5 नियम हैं: <b>रंग</b>, <b>रंग (दोहराव)</b>, अंकों वाले <b>संख्या 3 और संख्या 4</b>, और 8 में से 5 रंगों वाला <b>विशेषज्ञ</b>। यह संख्या 4 है — सोचने का ढंग वही। मैं तो गाजरों से गिनता हूँ!' },
      { say: '<b>आज की पहेली</b> बोर्ड पर पहले से रखी धूसर <b>संकेत पंक्तियों</b> से शुरू होती है — सीमा के भीतर कोड खोलो। <b>पहेली पुस्तक</b> में 500 और! नया केस इंतज़ार में है। चलो खेलें!' },
    ] },
    ar: { name: 'الأرنب المحقق المبتدئ', next: 'التالي', back: 'رجوع', start: 'العب', again: 'مرة أخرى', tap: 'ضع 4 ثم OK', dup: 'كل لون مرة واحدة في الصف!', tried: 'هذا الصف موجود على اللوحة', retry: 'قريب جدًا! المضيئتان ليستا هِت: جرّب الصف 2 بعد تبديل الاثنتين على اليمين!', reset: 'انتهت الصفوف! لنبدأ من جديد',
      s: [
      { say: 'مرحبًا، أنا <b>الأرنب المحقق المبتدئ</b>! تحت <b>غطاء «？» للعلبة</b> في الطرف البعيد تختبئ أربع جواهر. تخمين ترتيبها هو <b>هِت آند بلو</b>. إلصاق أذنيّ لا يفيد، فلنستخدم المنطق!' },
      { say: 'أولًا تخمين واحد. <b>المس 4 جواهر</b> في الصينية بالأسفل لتصفّها، ثم المس <b>OK</b>. كل لون مرة واحدة في الصف. التخمين العشوائي مسموح، فأنا أفعله دائمًا!', done: 'ظهرت الأوتاد! <b>الأوتاد الصغيرة</b> يمين الصف هي جواب العلبة.' },
      { say: 'تلصصت على العلبة، صه! <b>اللون والمكان صحيحان</b> = <b>هِت</b>: <b>وتد وردي</b>. <b>اللون موجود لكن المكان خطأ</b> = <b>بلو</b>: <b>وتد أبيض</b>. انظر إلى لون الحلقات!' },
      { say: 'في اللعب الحقيقي يبقى الغطاء مغلقًا. الأوتاد تُصفّ فقط، <b>الهِت أولًا</b>، و<b>لا تخبرك أبدًا بأي جوهرة تقصد</b>. اكتشاف ذلك عمل المحقق! أوه، عدستي المكبّرة غشّاها البخار…' },
      { say: 'لنستنتج! في الصف 1 <b>4 أوتاد بيضاء</b>: الألوان هي هذه الأربعة، وكلها في غير مكانها. في الصف 2 <b>الجوهرتان المضيئتان في المكان نفسه كما في الصف 1</b>، إذن الهِت هما اللتان على اليسار. رتّب الجواب والمس OK!', done: 'حُلّت القضية! مطابق تمامًا لما في العلبة. هذه متعة الاستنتاج!' },
      { say: 'في اللعب الحقيقي <b>يتناوب لاعبان على لوحة واحدة</b>. ترى صفوف خصمك وأوتاده أيضًا، لذا <b>تخميناته أدلة لك</b>. من يصيب كل شيء أولًا يفوز، وإن نفدت الصفوف فتعادل. آه، سبقني!' },
      { say: 'هناك 5 قواعد: <b>ألوان</b>، و<b>ألوان (مع تكرار)</b>، و<b>أرقام 3 وأرقام 4</b>، و<b>خبير</b> بخمسة من ثمانية ألوان. هذه أرقام 4، والتفكير نفسه. أنا أعدّ بالجزر!' },
      { say: '<b>لغز اليوم</b> يبدأ بـ<b>صفوف تلميحات</b> رمادية على اللوحة مسبقًا: اكسر الرمز ضمن الحد. وفي <b>كتاب الألغاز</b> 500 لغز! قضية جديدة بانتظارك. هيا نلعب!' },
    ] },
  };

  /* ---------- little sounds: glass on lacquer, a tick per pin, a rattle in the case, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    return {
      clink: (d = 0) => { tone(2900, 2300, .07, .07, 'sine', d); tone(4100, 3600, .05, .03, 'sine', d + .005); },
      lift: () => tone(1200, 1700, .06, .04, 'triangle'),
      hit: () => { tone(1320, 1320, .09, .06, 'triangle'); tone(1980, 1980, .07, .025, 'sine'); },
      blow: () => tone(880, 880, .08, .05, 'sine'),
      ok: () => tone(660, 990, .1, .06, 'triangle'),
      rattle: () => { for (let k = 0; k < 9; k++) tone(2200 + (k % 3) * 400, 1800, .03, .035, 'triangle', k * .045); tone(420, 300, .08, .08, 'square', .46); },
      open: () => { tone(300, 620, .25, .06, 'triangle'); [880, 1175, 1568].forEach((f, i) => tone(f, f, .3, .05, 'sine', .2 + i * .09)); },
      nope: () => tone(300, 220, .09, .05, 'triangle'),
      chime: () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07)),
      blip: () => { const f = 620 + Math.random() * 260; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); },
      get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; },
    };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, H = T3.hitblow;
    let E = null, z = 0, cfg = null, board = null, U = null, TR = null, TU = null, Lt = null, TOP = .42, marks = null;
    let rowsOn = [], caseGems = [], secret = null, lidK = 0, mine = null, input = [], pend = [];
    let step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const ease = k => 1 - Math.pow(1 - k, 3), back = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
    const same = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);
    const GY = () => TOP - H.R * .12;

    /* ---------- the board (rebuilt when a step uses another rule) — straight down, without perspective, as in play ---------- */
    function frame() { if (T3.fit && U && TU) T3.fit({ w: U.W + .2, d: U.L + .14 + TU.D - .1, y: TOP + .25, pitch: 1.5703, cz: (TU.D + .14) / 2 }); }
    function useBoard(zz) {
      if (board && z === zz) return false;
      z = zz; cfg = Object.assign({}, E.rule(zz), { rows: ROWS }); Lt = H.layout(cfg);
      board = H.board(cfg); U = board.userData; TOP = U.top;
      TR = H.tray(cfg); TU = TR.userData; board.add(TR);
      marks = new TH.Group(); board.add(marks); addPulse();
      rowsOn = []; caseGems = []; secret = null; lidK = 0; pend = []; input = [];
      T3.show('hitblow', board); T3.play(true, { ortho: true }); frame();
      TU.off(true); TU.cursor(-1); TU.okOn(false);
      return true;
    }

    /* ---------- the hidden code in the case, the lid ---------- */
    function setSecret(sec) {
      if (same(sec, secret)) return; secret = sec.slice();
      caseGems.forEach(m => board.remove(m));
      caseGems = sec.map((v, k) => { const m = H.gem(cfg.kind, v), [x, y, zz] = U.caseSlot(k); m.position.set(x, y, zz); board.add(m); return m; });
      kick(200);
    }
    function setLid(open, quiet) {
      const to = open ? 1 : 0; if (lidK === to) return 0;
      const from = lidK; lidK = to; if (open && !quiet) SFX.open();
      anim(open ? 800 : 420, q => { U.lid.rotation.x = -1.95 * (from + (to - from) * ease(q)); });
      if (open) caseGems.forEach((m, k) => later(() => anim(380, q => { m.position.y = U.caseSlot(k)[1] + Math.sin(q * Math.PI) * .45; m.rotation.y = q * Math.PI * 2; }), 400 + k * 110));
      return open ? 0 : 460;
    }
    function rattle(done) {
      SFX.rattle(); const lid = U.lid, x0 = lid.position.x;
      anim(560, q => { const s = Math.sin(q * Math.PI * 9) * (1 - q) * .05; lid.position.x = x0 + s; lid.rotation.x = -Math.max(0, Math.sin(q * Math.PI)) * .18 * (1 - q); caseGems.forEach((m, k) => { m.position.y = U.caseSlot(k)[1] + Math.abs(Math.sin(q * Math.PI * 7 + k)) * .05 * (1 - q); }); },
        () => { lid.position.x = x0; lid.rotation.x = 0; if (done) done(); });
    }

    /* ---------- the rows: diffed against what is already there (the same rows stay, new ones drop in) ---------- */
    function dropGem(r, k, v, quiet) {
      const m = H.gem(cfg.kind, v), [x, zz] = U.slot(r, k), y1 = GY(); m.position.set(x, y1 + 1.4, zz); board.add(m);
      anim(260, q => { const e = q < .75 ? Math.pow(q / .75, 2) : 1; m.position.y = y1 + 1.4 * (1 - e) + (q > .75 ? Math.sin((q - .75) / .25 * Math.PI) * .07 : 0); });
      if (!quiet) later(() => SFX.clink(), 190);
      return m;
    }
    function fade(m) { anim(180, q => { m.scale.setScalar(Math.max(.001, 1 - q)); }, () => board.remove(m)); }
    function pins(r, f, d0) {
      const out = []; let k = 0;
      const add = (hit, i) => { const m = H.pin(hit), [x, zz] = U.pinPos(r, k++); m.position.set(x, TOP + .03, zz); m.scale.setScalar(.001); board.add(m); out.push(m);
        later(() => { (hit ? SFX.hit : SFX.blow)(); anim(220, q => m.scale.setScalar(Math.max(.001, back(q)))); }, d0 + i * 150); };
      for (let i = 0; i < f.h; i++) add(true, i);
      for (let i = 0; i < f.b; i++) add(false, f.h + i);
      return out;
    }
    const keyOf = (o, sec) => o.g.join('') + '/' + o.by + '/' + (() => { const f = E.feedback(sec, o.g); return f.h + ',' + f.b; })();
    function dropRow(r) { const o = rowsOn[r]; if (!o) return; o.gems.forEach(fade); o.pins.forEach(fade); U.rowMark(r, null); rowsOn[r] = null; }
    function addRow(r, g, by, gemsIn) {   // (gemsIn: the gems already on the board — the learner's row being committed)
      const f = E.feedback(secret, g), gems = gemsIn || g.map((v, k) => dropGem(r, k, v, k > 0));
      U.rowMark(r, by);
      const o = { g: g.slice(), by, key: keyOf({ g, by }, secret), gems, pins: pins(r, f, gemsIn ? 160 : 380), f };
      rowsOn[r] = o; return o;
    }
    function setRows(rows, gap) {   // gap: a row after another (the demo), else all at once
      for (let r = rowsOn.length - 1; r >= 0; r--) if (!rows[r] || !rowsOn[r] || rowsOn[r].key !== keyOf(rows[r], secret)) dropRow(r);
      while (rowsOn.length && !rowsOn[rowsOn.length - 1]) rowsOn.pop();
      let n = 0;
      rows.forEach((o, r) => { if (rowsOn[r]) return; const d = gap ? 250 + n++ * gap : 60 + n++ * 120; later(() => addRow(r, o.g, o.by), d); });
      return n;
    }
    function clearPend() { pend.forEach(m => { if (m) fade(m); }); pend = []; input = Array(cfg.n).fill(null); for (let k = 0; k < cfg.n; k++) TU.put(k, null); }

    /* ---------- marks: rings on gems, a frame round the case or the pins ---------- */
    function clearMarks() { if (!marks) return; while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const bm = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function ring(x, zz, color, y, r = H.R + .1) { const g = new TH.RingGeometry(r, r + .07, 40); g.rotateX(-Math.PI / 2); const m = new TH.Mesh(g, bm(color, .95)); m.position.set(x, y, zz); m.userData.pulse = true; m.renderOrder = 3; marks.add(m); return m; }
    function box(x, zz, w, d, color, y, t = .07) {   // a rectangle outline w × d
      const rr = (S, w, d) => { S.moveTo(-w / 2, -d / 2); S.lineTo(w / 2, -d / 2); S.lineTo(w / 2, d / 2); S.lineTo(-w / 2, d / 2); S.lineTo(-w / 2, -d / 2); return S; };
      const S = rr(new TH.Shape(), w, d); S.holes.push(rr(new TH.Path(), w - 2 * t, d - 2 * t));
      const g = new TH.ShapeGeometry(S); g.rotateX(Math.PI / 2);
      const m = new TH.Mesh(g, bm(color, .9)); m.material.side = TH.DoubleSide; m.position.set(x, y, zz); m.userData.pulse = true; m.userData.flat = true; m.renderOrder = 3; marks.add(m); return m;
    }
    let pulseOn = false;
    function pulse() { if (stopped || !marks) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .94 + k * .1; m.scale.set(s, 1, s); } m.material.opacity = .45 + .5 * k; } }); if (any) { kick(80); requestAnimationFrame(pulse); } else pulseOn = false; }
    function addPulse() { const add0 = marks.add.bind(marks); marks.add = (...x) => { const r = add0(...x); kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.mark === 'case') box(Lt.caseX, Lt.caseZ, Lt.caseW + .55, Lt.caseD + .2, 0x7df3d2, TOP + .02);
      if (st.mark === 'hb' && rowsOn[0]) {   // the peek: pink = hit, white = blow, on the row and on the code in the case
        rowsOn[0].g.forEach((v, k) => { const hit = secret[k] === v, j = secret.indexOf(v); if (j < 0) return; const c = hit ? 0xff5aa8 : 0xffffff, [x, zz] = U.slot(0, k); ring(x, zz, c, TOP + .02); const [cx, , cz] = U.caseSlot(j); ring(cx, cz, c, U.caseSlot(j)[1] + H.R * .9); });
      }
      if (st.mark === 'pins' && rowsOn[0]) box(Lt.fbx, U.rowZ(0), 1.02, 1.02, 0x7df3d2, TOP + .02);
      if (st.mark === 'same' && rowsOn[1] && !played) [0, 1].forEach(r => [2, 3].forEach(k => { const [x, zz] = U.slot(r, k); ring(x, zz, 0x8fd8ff, TOP + .02); }));
      if (st.last) U.active(rowsOn.length); else U.active(null);
      const inp = (st.act === 'row' || st.act === 'solve') && !played;
      TU.off(!inp); paintTray();
    }

    /* ---------- the input tray (the game's own 3D tray: tap a gem → the next empty socket · tap a socket → out · OK) ---------- */
    const cur = () => { const k = input.indexOf(null); return k; };
    const full = () => input.length === cfg.n && input.every(v => v != null);
    const inputOn = () => { const st = STEPS[step]; return !!E && !busy && !played && (st.act === 'row' || st.act === 'solve'); };
    function paintTray() {
      const on = inputOn();
      for (let k = 0; k < cfg.n; k++) TU.put(k, input[k] == null ? null : input[k]);
      TU.cursor(on && !full() ? cur() : -1); TU.okOn(on && full()); TU.off(!on);
      TU.usedAll(cfg.rep ? [] : input.filter(v => v != null)); buttons(); kick(160);
    }
    function put(v) {
      if (!inputOn()) return;
      if (!cfg.rep && input.includes(v)) { SFX.nope(); flash(L.dup); return; }
      const k = cur(); if (k < 0) { SFX.nope(); return; }
      input[k] = v; pend[k] = dropGem(rowsOn.length, k, v); paintTray();
    }
    function take(k) { if (!inputOn() || input[k] == null) return; input[k] = null; if (pend[k]) fade(pend[k]); pend[k] = null; SFX.lift(); paintTray(); }
    function submit() {
      if (!inputOn() || !full()) return;
      const st = STEPS[step], g = input.slice();
      if (rowsOn.some(o => o && same(o.g, g))) { SFX.nope(); flash(L.tried); return; }
      busy = true; SFX.ok();
      if (st.act === 'row') {   // the first guess: the case "answers" with 1 hit and 2 blows, a good row to explain on the next page
        const all = E.allCands ? Array.from(E.allCands(cfg)).map(i => E.codeOf(cfg, i)) : null;
        const ok = (all || []).filter(c => { const f = E.feedback(c, g); return f.h === 1 && f.b === 2; });
        setSecret(ok.length ? ok[Math.floor(Math.random() * ok.length)] : MINE0.sec);
        mine = { g: g.slice(), sec: secret.slice() };
      }
      const r = rowsOn.length, gems = pend.slice(); pend = []; input = Array(cfg.n).fill(null);
      for (let k = 0; k < cfg.n; k++) TU.put(k, null);
      const o = addRow(r, g, 0, gems); paintTray();
      const wait = 160 + (o.f.h + o.f.b) * 150 + 350;
      if (st.act === 'row') { later(finish, wait); return; }
      later(() => {
        if (o.f.h === cfg.n) { setLid(true); later(finish, 700); return; }
        if (rowsOn.length >= ROWS) { say(L.reset); later(() => go(step, true), 1900); return; }
        busy = false; SFX.nope(); say(L.retry); paintTray();
      }, wait);
    }
    // the tray on the screen (the flat top view: Table3D.project)
    const scr = (x, zz, y) => { const v = T3.project(x, zz, y == null ? TOP + .1 : y); return [v.x, v.y]; };
    const ppu = () => { const a = scr(0, TU.zc), b = scr(1, TU.zc); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
    function hitAt(x, y) {
      if (!TU || !T3.project) return null; const u = ppu();
      for (let k = 0; k < cfg.n; k++) { const [sx, sy] = scr(...TU.sock(k)); if (Math.hypot(x - sx, y - sy) < (H.R + .12) * u) return { k }; }
      for (let v = 0; v < cfg.c; v++) { const [sx, sy] = scr(...TU.pal(v)); if (Math.hypot(x - sx, y - sy) < Math.min(TU.pp * .5, H.R * TU.gemS * 1.2) * u) return { v }; }
      const [ox, oy] = scr(TU.ok[0], TU.ok[1], TOP + .2); if (Math.abs(x - ox) < TU.ok[2] / 2 * u + 4 && Math.abs(y - oy) < TU.ok[3] / 2 * u + 4) return { ok: 1 };
      for (let k = 0; k < cfg.n; k++) { const [sx, sy] = scr(...U.slot(rowsOn.length, k)); if (pend[k] && Math.hypot(x - sx, y - sy) < (H.R + .08) * u) return { k }; }   // (a gem of the row on the board: out too)
      return null;
    }
    function onClick(e) {
      if ((T3.wasDrag && T3.wasDrag()) || e.target.closest('.rgd')) return;
      if (!inputOn()) return;
      const h = hitAt(e.clientX, e.clientY); if (!h) return;
      if (h.ok) { if (full()) submit(); else { SFX.nope(); flash(L.tap); } return; }
      if (h.v != null) return put(h.v);
      if (h.k != null) return take(h.k);
    }

    /* ---------- guide panel ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><button type="button" class="sfx" data-a="sfx" aria-label="Sound"></button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = STEPS.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .bub.capd{display:flex;flex-direction:column;box-sizing:border-box}.rgd .bub.capd .nm,.rgd .bub.capd .cnt{flex:none}.rgd .bub.capd .tx{flex:1 1 auto;min-height:0!important;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}'
      + '@media (max-width:600px) and (max-height:900px){.rgd .tx{font-size:13.5px;line-height:1.5;min-height:0}}';
    el.appendChild(css);
    /* phones held upright: the tray (the learner's input) sits right above the panel, and a long page (en, de, ru …) grew the
       panel over it. The bubble keeps one height on every page (the tallest text in this language, capped at about a third of
       the screen — the words scroll inside it then), and the board + tray is framed above the whole panel (data-fit-whole,
       atlas/app.js fitStage), so nothing moves from page to page and the tray is never covered (as patolli). */
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), w = bub.clientWidth; if (!w || w === lockW) return; lockW = w;
      const phone = innerWidth <= 600 && innerHeight > innerWidth;
      el.dataset.fitWhole = phone ? '1' : '';
      const keep = tx.innerHTML; bub.style.minHeight = ''; bub.style.height = ''; bub.classList.remove('capd');
      if (!phone) { if (window.__fitStage) requestAnimationFrame(() => { if (!stopped) window.__fitStage(); }); return; }
      let mx = 0, fix = 0; const fx = h => window.TapWord ? TapWord.fix(h, ctx.lang) : h;
      [].concat(...L.s.map(x => [x.say, x.done || '']), [L.retry, L.reset]).forEach(t => { tx.innerHTML = fx(t); mx = Math.max(mx, bub.offsetHeight); fix = Math.max(fix, bub.offsetHeight - tx.offsetHeight); });
      tx.innerHTML = keep;
      const cap = Math.max(fix + 66, Math.round(innerHeight * .33));
      if (mx > cap) { bub.style.height = cap + 'px'; bub.classList.add('capd'); } else bub.style.minHeight = mx + 'px';
      if (window.__fitStage) requestAnimationFrame(() => { if (!stopped) window.__fitStage(); });
    }
    addEventListener('resize', lockH);
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = window.TapWord ? TapWord.fix(html, ctx.lang) : html; clearInterval(typeT);
      const nodes = []; (function walk(n) { n.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([n]) => { n.textContent = ''; });
      let ni = 0, ci = 0, said = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 34);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    let flashT = 0, toastEl = null;
    function flash(msg) {   // a short note at the top of the screen (the bubble keeps the page's explanation)
      if (toastEl) toastEl.remove(); clearTimeout(flashT);
      toastEl = document.createElement('div'); toastEl.className = 'hbtoast'; toastEl.style.cssText = 'top:calc(var(--sat,env(safe-area-inset-top)) + 70px);bottom:auto';
      toastEl.textContent = window.TapWord ? TapWord.fix(msg, ctx.lang).replace(/<[^>]+>/g, '') : msg; document.body.appendChild(toastEl);
      const t = toastEl; flashT = setTimeout(() => { t.remove(); if (toastEl === t) toastEl = null; }, 1900);
    }
    function buttons() {
      const st = STEPS[step], wait = !!st.act && !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = (window.TapWord ? x => TapWord.fix(x, ctx.lang) : x => x)(st.last ? L.start + ' ▶' : wait ? L.tap : L.next + ' ▶');
      nx.disabled = wait; nx.classList.toggle('wait', wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${STEPS.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (st.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!st.last && ag) ag.remove();
    }
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(4800, 1600 + n * 45); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && played && !STEPS[step].last) go(step + 1); }, ms); }   // (the timer only draws the fill: the move on is ours)
    function go(n, quiet) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step], fresh = useBoard(st.z);
      clearMarks(); $('.cnt').textContent = '';
      if (input.some(v => v != null) || pend.length) clearPend(); else input = Array(cfg.n).fill(null);
      let rows = st.rows, sec = st.sec;
      if (rows === 'mine') { const m = mine || MINE0; rows = [{ g: m.g, by: 0 }]; sec = m.sec; }
      if (!sec) sec = secret || MINE0.sec;
      // the lid: closed before a new code goes in (a new case: rattled first); a peek opens it after the rows are down
      const shut = lidK && (!st.lid || st.demo) ? setLid(false) : 0;
      const change = !same(sec, secret);
      const lay = () => {
        setSecret(sec);
        const n0 = setRows(rows, st.demo ? 1000 : 0);
        if (st.demo) later(() => { setLid(true); SFX.chime(); }, 250 + n0 * 1000 + 600);
        if (st.lid && !lidK) later(() => setLid(true), 300);
        later(showTask, (fresh ? 500 : 300) + (st.demo ? 0 : n0 * 120) + (st.lid ? 300 : 0));
      };
      if ((change || fresh) && st.rattle) later(() => rattle(lay), Math.max(shut, fresh ? 500 : 120));
      else if (shut) later(lay, shut); else lay();
      if (!quiet) say(L.s[step].say);
      paintTray();
    }
    function finish() {
      played = true; busy = false; clearMarks();
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime(); paintTray(); autoNext();
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' : '<path d="m23 9-6 6M17 9l6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (inputOn()) {   // the tray's keys, as in play: 1–6 a gem, Backspace takes the last out, Enter = OK
        if (/^[1-9]$/.test(e.key)) { const v = cfg.kind === 'num' ? +e.key : +e.key - 1; if (v < cfg.c) { e.preventDefault(); e.stopPropagation(); put(v); } return; }
        if (e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); for (let k = cfg.n - 1; k >= 0; k--) if (input[k] != null) { take(k); break; } return; }
        if (e.key === 'Enter' && full()) { e.preventDefault(); e.stopPropagation(); submit(); return; }
      }
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    const onResize = () => frame(); addEventListener('resize', onResize);
    requestAnimationFrame(() => { el.classList.add('on'); lockH(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!stopped) { lockW = 0; lockH(); } });
    loadEngine().then(e => { if (stopped) return; E = e; later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-hitblow-rules-seen', '1'); } catch (e) {}
    // (for the checks: hitblow/tools/test_rules.js)
    const at = (kind, i) => { if (!TU) return null; const p = kind === 'pal' ? TU.pal(i) : kind === 'ok' ? [TU.ok[0], TU.ok[1]] : TU.sock(i); const [x, y] = scr(p[0], p[1], TOP + .2); return { x, y }; };
    const dbg = { step: () => step, played: () => played, busy: () => busy, secret: () => secret && secret.slice(), rows: () => rowsOn.filter(Boolean).map(o => ({ g: o.g.slice(), by: o.by, h: o.f.h, b: o.f.b })), input: () => input.slice(), at, lid: () => lidK };
    window.__hbRules = dbg;
    return {
      stop() { stopped = true; if (window.__hbRules === dbg) delete window.__hbRules; clearInterval(typeT); clearTimeout(flashT); if (toastEl) toastEl.remove(); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize); removeEventListener('resize', lockH); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.hitblow = { start };
})();
