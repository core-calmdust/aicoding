/* =====================================================================
   Dots and Boxes rules — a guided tour in the spiral notebook on the 3D table
   (atlas/models/dots.js), told by the guide character (Boxchick).
   On a 3 × 3 page: drawing one line in turn (Blue answers), the fourth side
   claims a box, a claimed box means another line (a run of three), the third
   side gives a box away (find a safe line — a wrong one is snapped up by
   Blue), and the endgame: hand over the small part, not the chain of three,
   then take the chain and win 6–3.
   Every line is drawn with the table game's own pens and ink on the page's
   canvas texture (Atlas3D.dots.kit: the same strokes, hatching and initials).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Edges as in the game: horizontal h(r, c) = r·3 + c (r 0..3), vertical v(r, c) = 12 + r·4 + c (r 0..2).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-dot.webp', N = 3;
  const h = (r, c) => r * N + c, v = (r, c) => (N + 1) * N + r * (N + 1) + c;
  // a position: [edges drawn by Red], [edges drawn by Blue], boxes already owned {box: owner}
  const STEPS = [
    { p: [[], []] },
    { p: [[], []], act: 'any', reply: [h(3, 1), v(1, 0), h(0, 2), v(2, 3)] },
    { p: [[h(1, 1), v(1, 1), v(2, 3)], [h(2, 1), h(0, 0), h(3, 0)]], act: 'box' },
    { p: [[h(0, 0), h(0, 2), h(1, 1), v(0, 0), v(2, 0)], [h(0, 1), h(1, 0), h(1, 2), h(3, 2)]], act: 'run', need: 3 },
    { p: [[h(0, 0), h(1, 1), v(1, 3), h(3, 0)], [v(0, 0), h(2, 1), h(1, 2), v(2, 3)]], act: 'safe', two: true },
    { p: [[h(0, 0), h(0, 2), h(1, 0), h(1, 2), v(1, 0), v(1, 2), h(2, 2), h(3, 2), v(2, 3), h(2, 0)], [h(0, 1), h(1, 1), v(1, 1), v(1, 3), h(2, 1), h(3, 1), v(2, 1), v(2, 2)]],
      own: { 3: 0, 4: 1, 5: 0, 7: 1, 8: 0 }, act: 'end', small: [h(3, 0), v(2, 0)], chain: [0, 1, 2], single: [6], open: v(0, 0) },
    { p: [[], []], last: true },
  ];

  const TXT = {
    ja: { name: 'ハコピヨ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '点と点のあいだをタップ', nope: 'そこには引けないよ〜', box: '箱ゲット！', red: 'あなた', blue: '相手',
      more: '{n}つ目！ もう1本引けるよ。続けて取っちゃおう！', ng: 'その線では箱が完成しないよ。光っている箱の、残りの1本をさがしてね！', unsafe: 'あっ、3本目ができちゃった！ 青にパクッと取られちゃったね。もう一回、安全な線をさがしてみよう。', big: 'そこを引くと、3つの鎖をまとめて渡しちゃうよ〜。小さいほうを渡そう！', take: 'しめしめ、青が鎖をあけたよ！ つながった3つの箱を、まとめて取っちゃおう！', s: [
      { say: 'やっほー、ぼくは<b>ハコピヨ</b>！ 「<b>ドット・アンド・ボックス</b>」は、ノートの点と点を線でつないで<b>箱</b>を取りあうゲームだよ。100年以上前のフランスで紹介されて、いまも世界中の教室で遊ばれているんだ。紙とペンさえあればできるよ〜！' },
      { say: '2人で<b>交代で1本ずつ</b>、となりあう点と点を<b>タテかヨコ</b>の線で結ぶよ（ナナメはダメ）。あなたは<b>赤ペン</b>、相手は<b>青ペン</b>。好きなところをタップして、線を1本引いてみて！', done: 'いい線！ 青もすかさず1本引いたね。こんなふうに<b>交代で1本ずつ</b>引いていくんだ。' },
      { say: '小さな四角を<b>箱</b>って呼ぶよ。箱の4つの辺のうち、<b>最後の4本目</b>を引いた人がその箱をもらえるんだ。光っている箱はもう3本引かれているよ。4本目を引いてみて！', done: '取れた〜！ 箱に<b>あなたの印（R）</b>がついて<b>1点</b>。それに、箱を取った人は<b>続けてもう1本</b>引けるんだよ。' },
      { say: '箱を取ったら<b>もう1本</b>！ だから、つながった箱は<b>次々とまとめて</b>取れちゃう。上の列の3つの箱を、続けて全部取ってみよう！', done: '3つまとめてゲット〜！ 箱を取るたびにもう1本引けるから、つながった箱は一気に取れるんだ。取ったあとは<b>必ずもう1本</b>引くルールだよ。' },
      { say: 'ここで大事なコツ！ 箱に<b>3本目</b>を引くと、次の相手が4本目を引いて<b>取っちゃう</b>んだ。オレンジの箱はもう2本引かれているから要注意。どの箱にも3本目を作らない<b>安全な線</b>を1本引いてみて！', done: '正解！ どの箱にも3本目ができていないね。こういう線を<b>安全な線</b>っていうんだ。はじめのうちは安全な線をえらぼう。' },
      { say: '終わりごろは、どこに引いても3本目ができちゃう。そんなときは<b>小さいほうを渡す</b>のがコツ！ つながった箱の列（<b>鎖</b>）は、取られるときは<b>まとめて</b>取られるからね。緑の箱1つと、オレンジの3つの鎖。どっちを渡す？', done: 'ぜんぶの線が引かれたら<b>おしまい</b>。<b>箱が多いほうの勝ち</b>だよ！ <b>6対3</b>で、あなたの勝ち〜！ 小さく渡して大きくもらう、これが<b>鎖</b>のコツなんだ。' },
      { say: 'これでルールはばっちり！ 盤の大きさは<b>3×3・4×4・5×5</b>（箱の数）から選べるよ。まずは3×3で、<b>3本目を渡さない</b>ことを意識して遊んでみよう。もっと強くなりたくなったら、レッスンで鎖の作戦も学べるよ！' },
    ] },
    en: { name: 'Boxchick', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap between two dots', nope: "You can't draw there", box: 'Box!', red: 'You', blue: 'Opponent',
      more: 'Box {n}! You draw again, so keep going!', ng: "That line doesn't finish a box. Find the last side of the glowing box!", unsafe: 'Oops, that made a third side! Blue snapped the box up. Try again and find a safe line.', big: 'Drawing there hands over the whole chain of three! Give away the smaller part.', take: 'Yes! Blue had to open the chain. Take all three boxes in one go!', s: [
      { say: "Hi there, I'm <b>Boxchick</b>! In <b>Dots and Boxes</b> you join the dots on a notebook page with lines and race to claim <b>boxes</b>. It was introduced in France more than 100 years ago and is still played in classrooms all over the world. All you need is paper and a pen!" },
      { say: 'Take turns drawing <b>one line each</b>, joining two neighbouring dots <b>across or down</b> (no diagonals). You have the <b>red pen</b>, your opponent has the <b>blue</b> one. Tap between two dots to draw a line!', done: "Nice line! Blue drew one straight back. That's how it goes: <b>one line each, in turn</b>." },
      { say: 'A little square is called a <b>box</b>. Whoever draws the <b>fourth and last side</b> of a box claims it. The glowing box already has three sides. Draw the fourth one!', done: "Got it! The box gets <b>your mark (R)</b>: that's <b>1 point</b>. And whoever takes a box <b>draws another line</b> straight away." },
      { say: 'Took a box? <b>Draw again!</b> So boxes that are joined together can be taken <b>one after another</b>. Take all three boxes in the top row in one go!', done: 'All three are yours! Every box you take gives you another line, so joined boxes fall all at once. After taking a box you <b>must</b> draw one more line.' },
      { say: 'Here comes the big tip! If you draw the <b>third side</b> of a box, your opponent just adds the fourth and <b>takes it</b>. The orange boxes already have two sides, so be careful! Draw a <b>safe line</b>: one that gives no box a third side.', done: "Correct! No box has a third side. That's called a <b>safe line</b>. In the early game, pick safe lines." },
      { say: 'Near the end, every line gives away a third side. Then the trick is to <b>hand over the smaller part</b>! A row of joined boxes (a <b>chain</b>) gets taken <b>all at once</b>. Green: one box. Orange: a chain of three. Which will you give away?', done: 'When every line is drawn the game is <b>over</b>, and <b>more boxes wins</b>! <b>6 to 3</b>, you win! Give a little, get a lot: that is the secret of <b>chains</b>.' },
      { say: "That's all the rules! You can play with <b>3×3, 4×4 or 5×5</b> boxes. Start with 3×3 and try <b>never to hand over a third side</b>. When you want to get stronger, the lessons teach you clever chain tactics!" },
    ] },
    zh: { name: '方块小鸡', next: '下一步', back: '返回', start: '来下一局', again: '再来一次', tap: '点击两个点之间', nope: '那里不能画哦～', box: '拿到格子！', red: '你', blue: '对手',
      more: '第{n}个！还能再画一条，接着拿吧！', ng: '这条线围不成格子哦。找找发光格子剩下的那一条边！', unsafe: '啊，出现第3条边了！被蓝方一口拿走了。再找一次安全的线吧。', big: '画那里会把3个连成的链整个送出去哦～送小的那边吧！', take: '嘿嘿，蓝方打开了链！把连着的3个格子一口气拿下吧！', s: [
      { say: '哈喽，我是<b>方块小鸡</b>！“<b>点格棋</b>”就是用线把本子上的点连起来，抢着拿<b>格子</b>的游戏。一百多年前在法国被介绍出来，现在全世界的教室里都有人玩。有纸有笔就能玩哦～' },
      { say: '两个人<b>轮流各画一条</b>，用<b>横线或竖线</b>连起相邻的两个点（不能画斜线）。你是<b>红笔</b>，对手是<b>蓝笔</b>。点击任意两个点之间，画一条线试试！', done: '画得好！蓝方也马上画了一条。就像这样<b>轮流一人一条</b>。' },
      { say: '小方块叫作<b>格子</b>。格子4条边里，画下<b>最后第4条</b>的人就能拿到它。发光的格子已经有3条边了。画上第4条吧！', done: '拿到了～！格子里写上了<b>你的记号（R）</b>，得<b>1分</b>。而且拿到格子的人可以<b>接着再画一条</b>哦。' },
      { say: '拿到格子就<b>再画一条</b>！所以连在一起的格子可以<b>一个接一个</b>地全部拿下。把最上面一排的3个格子连续拿光吧！', done: '3个全拿到啦～！每拿一个就能再画一条，连着的格子能一口气拿完。拿完以后<b>一定要再画一条</b>，这是规则哦。' },
      { say: '重要诀窍来了！给格子画上<b>第3条边</b>，下一个人就会补上第4条把它<b>拿走</b>。橙色的格子已经有2条边，要小心。画一条不让任何格子出现第3条边的<b>安全线</b>吧！', done: '正确！没有格子出现第3条边。这样的线叫<b>安全线</b>。刚开始要多选安全线哦。' },
      { say: '快结束时，画哪里都会出现第3条边。这时的诀窍是<b>把小的送出去</b>！连在一起的一串格子（<b>链</b>）被拿的时候会被<b>整串</b>拿走。绿色的1个格子和橙色的3格链，你送哪个？', done: '所有的线都画完就<b>结束</b>，<b>格子多的一方获胜</b>！<b>6比3</b>，你赢了～！送小拿大，这就是<b>链</b>的诀窍。' },
      { say: '规则全部学会啦！棋盘大小可以选<b>3×3、4×4、5×5</b>（格子数）。先从3×3开始，注意<b>别送出第3条边</b>。想变得更强，就去课程里学习链的战术吧！' },
    ] },
    ko: { name: '상자삐약', next: '다음', back: '이전', start: '대국해 보기', again: '한 번 더', tap: '두 점 사이를 탭하세요', nope: '거기엔 그을 수 없어~', box: '상자 획득!', red: '나', blue: '상대',
      more: '{n}개째! 한 줄 더 그을 수 있어. 계속 가져가자!', ng: '그 선으로는 상자가 완성되지 않아. 빛나는 상자의 남은 한 변을 찾아봐!', unsafe: '앗, 세 번째 변이 생겼어! 파랑이 냉큼 가져갔네. 다시 한번 안전한 선을 찾아보자.', big: '거기를 그으면 3개짜리 사슬을 통째로 넘겨줘~ 작은 쪽을 넘겨주자!', take: '좋았어, 파랑이 사슬을 열었어! 이어진 상자 3개를 한꺼번에 가져가자!', s: [
      { say: '안녕, 나는 <b>상자삐약</b>! <b>도트 앤 박스</b>는 공책의 점과 점을 선으로 이어서 <b>상자</b>를 차지하는 게임이야. 100여 년 전 프랑스에서 소개되어 지금도 전 세계 교실에서 즐기고 있어. 종이와 펜만 있으면 돼~!' },
      { say: '두 사람이 <b>번갈아 한 줄씩</b>, 이웃한 두 점을 <b>가로나 세로</b> 선으로 이어(대각선은 안 돼). 너는 <b>빨간 펜</b>, 상대는 <b>파란 펜</b>이야. 두 점 사이를 탭해서 선을 하나 그어 봐!', done: '좋은 선이야! 파랑도 바로 한 줄 그었지? 이렇게 <b>번갈아 한 줄씩</b> 긋는 거야.' },
      { say: '작은 네모를 <b>상자</b>라고 해. 상자의 네 변 중 <b>마지막 네 번째 변</b>을 그은 사람이 그 상자를 가져가. 빛나는 상자는 벌써 세 변이 그어져 있어. 네 번째 변을 그어 봐!', done: '가져왔다~! 상자에 <b>네 표시(R)</b>가 생기고 <b>1점</b>이야. 그리고 상자를 가져간 사람은 <b>이어서 한 줄 더</b> 그을 수 있어.' },
      { say: '상자를 가져가면 <b>한 줄 더</b>! 그래서 이어진 상자는 <b>줄줄이 한꺼번에</b> 가져갈 수 있어. 맨 윗줄의 상자 3개를 이어서 전부 가져가 봐!', done: '3개 한꺼번에 획득~! 상자를 가져갈 때마다 한 줄 더 그을 수 있으니까 이어진 상자는 단숨에 가져갈 수 있어. 가져간 다음엔 <b>꼭 한 줄 더</b> 긋는 게 규칙이야.' },
      { say: '여기서 중요한 요령! 상자에 <b>세 번째 변</b>을 그으면 다음 상대가 네 번째를 그어서 <b>가져가 버려</b>. 주황색 상자는 벌써 두 변이 있으니 조심해. 어느 상자에도 세 번째 변을 만들지 않는 <b>안전한 선</b>을 그어 봐!', done: '정답! 어느 상자에도 세 번째 변이 없지? 이런 선을 <b>안전한 선</b>이라고 해. 처음에는 안전한 선을 고르자.' },
      { say: '끝날 무렵엔 어디에 그어도 세 번째 변이 생겨. 그럴 땐 <b>작은 쪽을 넘겨주는</b> 게 요령! 이어진 상자 줄(<b>사슬</b>)은 가져갈 때 <b>통째로</b> 가져가거든. 초록 상자 1개와 주황 사슬 3개, 어느 쪽을 넘겨줄래?', done: '모든 선이 그어지면 <b>끝</b>. <b>상자가 많은 쪽이 승리</b>야! <b>6 대 3</b>으로 네가 이겼어~! 작게 주고 크게 받기, 이게 <b>사슬</b>의 요령이야.' },
      { say: '이제 규칙은 완벽해! 판 크기는 <b>3×3·4×4·5×5</b>(상자 수) 중에서 고를 수 있어. 먼저 3×3에서 <b>세 번째 변을 넘겨주지 않기</b>를 의식하면서 놀아 봐. 더 강해지고 싶으면 레슨에서 사슬 작전도 배울 수 있어!' },
    ] },
    es: { name: 'Pollicaja', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca entre dos puntos', nope: 'Ahí no se puede trazar', box: '¡Cuadro!', red: 'Tú', blue: 'Rival',
      more: '¡Cuadro {n}! Vuelves a trazar, ¡sigue!', ng: 'Esa línea no cierra ningún cuadro. ¡Busca el último lado del cuadro que brilla!', unsafe: '¡Uy, eso hizo un tercer lado! Azul se llevó el cuadro. Inténtalo otra vez con una línea segura.', big: '¡Si trazas ahí regalas la cadena entera de tres! Entrega la parte pequeña.', take: '¡Bien! Azul tuvo que abrir la cadena. ¡Llévate los tres cuadros de golpe!', s: [
      { say: '¡Hola! Soy <b>Pollicaja</b>. En <b>Timbiriche</b> (Dots and Boxes) unes los puntos de una hoja de cuaderno con líneas y compites por quedarte <b>cuadros</b>. Se dio a conocer en Francia hace más de 100 años y todavía se juega en aulas de todo el mundo. ¡Solo necesitas papel y boli!' },
      { say: 'Por turnos, cada uno traza <b>una línea</b> que une dos puntos vecinos, <b>en horizontal o vertical</b> (nada de diagonales). Tú tienes el <b>boli rojo</b> y tu rival el <b>azul</b>. ¡Toca entre dos puntos para trazar una línea!', done: '¡Buena línea! Azul respondió enseguida. Así se juega: <b>una línea cada uno, por turnos</b>.' },
      { say: 'Cada cuadradito es un <b>cuadro</b>. Quien traza el <b>cuarto y último lado</b> de un cuadro se lo queda. El cuadro que brilla ya tiene tres lados. ¡Traza el cuarto!', done: '¡Conseguido! El cuadro lleva <b>tu marca (R)</b>: <b>1 punto</b>. Y quien se lleva un cuadro <b>traza otra línea</b> enseguida.' },
      { say: '¿Te llevaste un cuadro? ¡<b>Vuelve a trazar</b>! Por eso los cuadros unidos se pueden ganar <b>uno tras otro</b>. ¡Llévate de golpe los tres cuadros de la fila de arriba!', done: '¡Los tres son tuyos! Cada cuadro te da otra línea, así que los cuadros unidos caen todos a la vez. Tras ganar un cuadro <b>tienes que</b> trazar otra línea.' },
      { say: '¡Aquí va el gran truco! Si trazas el <b>tercer lado</b> de un cuadro, tu rival añade el cuarto y <b>se lo lleva</b>. Los cuadros naranjas ya tienen dos lados, ¡ojo! Traza una <b>línea segura</b>: una que no deje ningún cuadro con tres lados.', done: '¡Correcto! Ningún cuadro tiene tres lados. Eso es una <b>línea segura</b>. Al principio, elige líneas seguras.' },
      { say: 'Cerca del final, cualquier línea regala un tercer lado. Entonces el truco es <b>entregar la parte pequeña</b>. Una fila de cuadros unidos (una <b>cadena</b>) se gana <b>entera</b>. Verde: un cuadro. Naranja: una cadena de tres. ¿Cuál regalas?', done: 'Cuando están trazadas todas las líneas, la partida <b>termina</b> y <b>gana quien tiene más cuadros</b>. ¡<b>6 a 3</b>, ganas tú! Dar poco para ganar mucho: ese es el secreto de las <b>cadenas</b>.' },
      { say: '¡Ya sabes todas las reglas! Puedes jugar con <b>3×3, 4×4 o 5×5</b> cuadros. Empieza con 3×3 e intenta <b>no regalar nunca un tercer lado</b>. Cuando quieras mejorar, las lecciones te enseñan tácticas con cadenas.' },
    ] },
    fr: { name: 'Poussicase', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche entre deux points', nope: 'Impossible de tracer ici', box: 'Une case !', red: 'Toi', blue: 'Adversaire',
      more: 'Case n° {n} ! Tu retraces, continue !', ng: 'Ce trait ne ferme aucune case. Trouve le dernier côté de la case qui brille !', unsafe: 'Oups, ça fait un troisième côté ! Bleu a raflé la case. Réessaie avec un trait sûr.', big: 'Tracer là, c’est offrir toute la chaîne de trois ! Donne plutôt la petite partie.', take: 'Bien joué ! Bleu a dû ouvrir la chaîne. Prends les trois cases d’un coup !', s: [
      { say: 'Coucou, moi c’est <b>Poussicase</b> ! Dans le <b>jeu des petits carrés</b> (la pipopipette), on relie les points d’une page de cahier par des traits pour gagner des <b>cases</b>. Il a été présenté en France il y a plus de 100 ans et on y joue encore dans les classes du monde entier. Une feuille et un stylo suffisent !' },
      { say: 'Chacun son tour, on trace <b>un trait</b> entre deux points voisins, <b>à l’horizontale ou à la verticale</b> (pas en diagonale). Tu as le <b>stylo rouge</b>, ton adversaire le <b>bleu</b>. Touche entre deux points pour tracer un trait !', done: 'Joli trait ! Bleu a répondu aussitôt. C’est comme ça : <b>un trait chacun, à tour de rôle</b>.' },
      { say: 'Un petit carré s’appelle une <b>case</b>. Celui qui trace le <b>quatrième et dernier côté</b> d’une case la gagne. La case qui brille a déjà trois côtés. Trace le quatrième !', done: 'Gagné ! La case porte <b>ta marque (R)</b> : <b>1 point</b>. Et celui qui prend une case <b>retrace</b> tout de suite.' },
      { say: 'Une case prise ? <b>On retrace !</b> Du coup, des cases reliées se prennent <b>l’une après l’autre</b>. Prends d’un coup les trois cases de la rangée du haut !', done: 'Les trois sont à toi ! Chaque case prise te donne un trait de plus, alors les cases reliées tombent toutes ensemble. Après une prise, on <b>doit</b> tracer encore un trait.' },
      { say: 'Voici la grande astuce ! Si tu traces le <b>troisième côté</b> d’une case, l’adversaire ajoute le quatrième et <b>la prend</b>. Les cases orange ont déjà deux côtés : prudence ! Trace un <b>trait sûr</b>, qui ne donne de troisième côté à aucune case.', done: 'Bravo ! Aucune case n’a trois côtés. C’est ce qu’on appelle un <b>trait sûr</b>. En début de partie, choisis des traits sûrs.' },
      { say: 'Vers la fin, chaque trait offre un troisième côté. L’astuce, c’est alors de <b>donner la plus petite partie</b> ! Une rangée de cases reliées (une <b>chaîne</b>) se prend <b>en entier</b>. En vert : une case. En orange : une chaîne de trois. Laquelle donnes-tu ?', done: 'Quand tous les traits sont tracés, la partie est <b>finie</b> et <b>le plus de cases gagne</b> ! <b>6 à 3</b>, tu gagnes ! Donner un peu pour gagner beaucoup : c’est le secret des <b>chaînes</b>.' },
      { say: 'Tu connais toutes les règles ! On peut jouer sur <b>3×3, 4×4 ou 5×5</b> cases. Commence par 3×3 en évitant de <b>donner un troisième côté</b>. Pour progresser, les leçons t’apprennent les tactiques de chaînes !' },
    ] },
    pt: { name: 'Pintaixa', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque entre dois pontos', nope: 'Não dá para traçar aí', box: 'Quadrado!', red: 'Você', blue: 'Rival',
      more: 'Quadrado {n}! Você traça de novo, continue!', ng: 'Essa linha não fecha nenhum quadrado. Procure o último lado do quadrado que brilha!', unsafe: 'Opa, isso fez um terceiro lado! O azul pegou o quadrado. Tente de novo com uma linha segura.', big: 'Traçar aí entrega a corrente inteira de três! Entregue a parte menor.', take: 'Isso! O azul teve que abrir a corrente. Pegue os três quadrados de uma vez!', s: [
      { say: 'Oi, eu sou o <b>Pintaixa</b>! No <b>jogo dos pontinhos</b> (Dots and Boxes), você liga os pontos de uma folha de caderno com linhas e disputa <b>quadrados</b>. Ele foi apresentado na França há mais de 100 anos e ainda é jogado em salas de aula do mundo todo. Só precisa de papel e caneta!' },
      { say: 'Cada um, na sua vez, traça <b>uma linha</b> ligando dois pontos vizinhos, <b>na horizontal ou na vertical</b> (nada de diagonal). Você usa a <b>caneta vermelha</b> e o rival, a <b>azul</b>. Toque entre dois pontos para traçar uma linha!', done: 'Boa linha! O azul respondeu na hora. É assim: <b>uma linha de cada vez, alternando</b>.' },
      { say: 'Cada quadradinho é um <b>quadrado</b>. Quem traça o <b>quarto e último lado</b> de um quadrado fica com ele. O quadrado que brilha já tem três lados. Trace o quarto!', done: 'Conseguiu! O quadrado ganhou <b>a sua marca (R)</b>: <b>1 ponto</b>. E quem fecha um quadrado <b>traça outra linha</b> logo em seguida.' },
      { say: 'Fechou um quadrado? <b>Trace de novo!</b> Por isso, quadrados ligados podem ser pegos <b>um atrás do outro</b>. Pegue de uma vez os três quadrados da fileira de cima!', done: 'Os três são seus! Cada quadrado fechado dá mais uma linha, então os quadrados ligados caem todos juntos. Depois de fechar um, você <b>tem que</b> traçar mais uma linha.' },
      { say: 'Agora a grande dica! Se você traçar o <b>terceiro lado</b> de um quadrado, o rival coloca o quarto e <b>fica com ele</b>. Os quadrados laranja já têm dois lados, cuidado! Trace uma <b>linha segura</b>: uma que não deixe nenhum quadrado com três lados.', done: 'Certo! Nenhum quadrado ficou com três lados. Isso é uma <b>linha segura</b>. No começo, escolha linhas seguras.' },
      { say: 'Perto do fim, qualquer linha entrega um terceiro lado. Aí o truque é <b>entregar a parte menor</b>! Uma fileira de quadrados ligados (uma <b>corrente</b>) é pega <b>inteira</b>. Verde: um quadrado. Laranja: uma corrente de três. Qual você entrega?', done: 'Quando todas as linhas estão traçadas, o jogo <b>acaba</b> e <b>vence quem tem mais quadrados</b>! <b>6 a 3</b>, você venceu! Dar pouco para ganhar muito: esse é o segredo das <b>correntes</b>.' },
      { say: 'Pronto, você já sabe as regras! Dá para jogar com <b>3×3, 4×4 ou 5×5</b> quadrados. Comece com 3×3 e tente <b>nunca entregar um terceiro lado</b>. Quando quiser melhorar, as lições ensinam táticas de correntes!' },
    ] },
    de: { name: 'Kästchenküken', next: 'Weiter', back: 'Zurück', start: 'Los geht’s', again: 'Nochmal', tap: 'Tippe zwischen zwei Punkte', nope: 'Da kannst du keinen Strich ziehen', box: 'Kästchen!', red: 'Du', blue: 'Gegner',
      more: 'Kästchen {n}! Du ziehst noch mal, weiter so!', ng: 'Dieser Strich schließt kein Kästchen. Such die letzte Seite des leuchtenden Kästchens!', unsafe: 'Hoppla, das war eine dritte Seite! Blau hat sich das Kästchen geschnappt. Versuch es noch mal mit einem sicheren Strich.', big: 'Damit verschenkst du die ganze Dreierkette! Gib lieber den kleinen Teil ab.', take: 'Super! Blau musste die Kette öffnen. Hol dir alle drei Kästchen auf einmal!', s: [
      { say: 'Hallo, ich bin das <b>Kästchenküken</b>! Bei <b>Käsekästchen</b> verbindest du die Punkte auf einer Heftseite mit Strichen und sammelst <b>Kästchen</b>. Vorgestellt wurde das Spiel vor über 100 Jahren in Frankreich, und bis heute spielt man es in Klassenzimmern auf der ganzen Welt. Papier und Stift genügen!' },
      { say: 'Abwechselnd zieht jeder <b>einen Strich</b> zwischen zwei benachbarten Punkten, <b>waagrecht oder senkrecht</b> (nicht schräg). Du hast den <b>roten Stift</b>, dein Gegner den <b>blauen</b>. Tippe zwischen zwei Punkte und zieh einen Strich!', done: 'Schöner Strich! Blau hat sofort geantwortet. So geht’s: <b>abwechselnd ein Strich</b>.' },
      { say: 'Ein kleines Quadrat heißt <b>Kästchen</b>. Wer die <b>vierte, letzte Seite</b> eines Kästchens zieht, bekommt es. Das leuchtende Kästchen hat schon drei Seiten. Zieh die vierte!', done: 'Geschafft! Das Kästchen bekommt <b>dein Zeichen (R)</b>: <b>1 Punkt</b>. Und wer ein Kästchen schließt, <b>zieht gleich noch einen Strich</b>.' },
      { say: 'Kästchen geschlossen? <b>Noch mal ziehen!</b> Deshalb kann man zusammenhängende Kästchen <b>eins nach dem anderen</b> holen. Hol dir die drei Kästchen in der oberen Reihe in einem Rutsch!', done: 'Alle drei gehören dir! Jedes Kästchen bringt dir einen weiteren Strich, darum fallen zusammenhängende Kästchen alle auf einmal. Nach dem Schließen <b>musst</b> du noch einen Strich ziehen.' },
      { say: 'Jetzt der wichtigste Tipp! Ziehst du die <b>dritte Seite</b> eines Kästchens, setzt dein Gegner die vierte und <b>schnappt es sich</b>. Die orangen Kästchen haben schon zwei Seiten, also aufgepasst! Zieh einen <b>sicheren Strich</b>, der keinem Kästchen eine dritte Seite gibt.', done: 'Richtig! Kein Kästchen hat drei Seiten. So etwas nennt man einen <b>sicheren Strich</b>. Am Anfang wählst du am besten sichere Striche.' },
      { say: 'Gegen Ende verschenkt jeder Strich eine dritte Seite. Dann lautet der Trick: <b>den kleineren Teil abgeben</b>! Eine Reihe zusammenhängender Kästchen (eine <b>Kette</b>) wird <b>komplett</b> geholt. Grün: ein Kästchen. Orange: eine Dreierkette. Was gibst du ab?', done: 'Sind alle Striche gezogen, ist das Spiel <b>vorbei</b>, und <b>wer mehr Kästchen hat, gewinnt</b>! <b>6 zu 3</b>, du gewinnst! Wenig geben, viel bekommen: das ist das Geheimnis der <b>Ketten</b>.' },
      { say: 'Jetzt kennst du alle Regeln! Gespielt wird mit <b>3×3, 4×4 oder 5×5</b> Kästchen. Fang mit 3×3 an und versuch, <b>nie eine dritte Seite zu verschenken</b>. Wenn du besser werden willst, lernst du in den Lektionen kluge Ketten-Taktiken!' },
    ] },
    hi: { name: 'डिब्बा चूज़ा', next: 'आगे', back: 'पीछे', start: 'खेलें!', again: 'फिर से', tap: 'दो बिंदुओं के बीच टैप करें', nope: 'वहाँ रेखा नहीं खींच सकते', box: 'डिब्बा मिला!', red: 'आप', blue: 'विरोधी',
      more: '{n}वाँ डिब्बा! एक और रेखा खींचो, चलते रहो!', ng: 'इस रेखा से कोई डिब्बा पूरा नहीं होता। चमकते डिब्बे की आखिरी भुजा ढूँढो!', unsafe: 'अरे, तीसरी भुजा बन गई! नीले ने झट से डिब्बा ले लिया। फिर से कोशिश करो और एक सुरक्षित रेखा ढूँढो।', big: 'वहाँ खींचोगे तो तीन डिब्बों की पूरी कड़ी दे दोगे! छोटा हिस्सा दो।', take: 'बढ़िया! नीले को कड़ी खोलनी पड़ी। तीनों डिब्बे एक साथ ले लो!', s: [
      { say: 'नमस्ते, मैं हूँ <b>डिब्बा चूज़ा</b>! <b>डॉट्स एंड बॉक्सेस</b> में कॉपी के पन्ने पर बिंदुओं को रेखाओं से जोड़कर <b>डिब्बे</b> जीतने की होड़ होती है। यह 100 से ज़्यादा साल पहले फ़्रांस में सामने आया और आज भी दुनिया भर की कक्षाओं में खेला जाता है। बस कागज़ और पेन चाहिए!' },
      { say: 'बारी-बारी से हर कोई <b>एक रेखा</b> खींचता है जो दो पास-पास के बिंदुओं को <b>आड़ी या खड़ी</b> जोड़े (तिरछी नहीं)। आपके पास <b>लाल पेन</b> है, विरोधी के पास <b>नीला</b>। दो बिंदुओं के बीच टैप करके एक रेखा खींचो!', done: 'बढ़िया रेखा! नीले ने भी तुरंत एक खींच दी। ऐसे ही <b>बारी-बारी से एक-एक रेखा</b>।' },
      { say: 'छोटे चौकोर को <b>डिब्बा</b> कहते हैं। जो किसी डिब्बे की <b>चौथी और आखिरी भुजा</b> खींचे, डिब्बा उसका। चमकते डिब्बे की तीन भुजाएँ बन चुकी हैं। चौथी खींचो!', done: 'मिल गया! डिब्बे पर <b>आपका निशान (R)</b> लगा: <b>1 अंक</b>। और जो डिब्बा लेता है, वह <b>तुरंत एक और रेखा</b> खींचता है।' },
      { say: 'डिब्बा लिया? <b>फिर से खींचो!</b> इसलिए जुड़े हुए डिब्बे <b>एक के बाद एक</b> लिए जा सकते हैं। ऊपर की पंक्ति के तीनों डिब्बे एक ही बार में ले लो!', done: 'तीनों आपके! हर डिब्बे पर एक और रेखा मिलती है, तो जुड़े डिब्बे सब एक साथ मिल जाते हैं। डिब्बा लेने के बाद एक और रेखा खींचना <b>ज़रूरी</b> है।' },
      { say: 'अब सबसे बड़ी तरकीब! अगर आप किसी डिब्बे की <b>तीसरी भुजा</b> खींचोगे, तो विरोधी चौथी खींचकर उसे <b>ले जाएगा</b>। नारंगी डिब्बों की पहले से दो भुजाएँ हैं, सावधान! ऐसी <b>सुरक्षित रेखा</b> खींचो जिससे किसी डिब्बे की तीसरी भुजा न बने।', done: 'सही! किसी डिब्बे की तीसरी भुजा नहीं बनी। इसे <b>सुरक्षित रेखा</b> कहते हैं। शुरुआत में सुरक्षित रेखाएँ चुनो।' },
      { say: 'आख़िर के पास हर रेखा कोई तीसरी भुजा दे देती है। तब तरकीब है <b>छोटा हिस्सा देना</b>! जुड़े डिब्बों की कतार (<b>कड़ी</b>) <b>पूरी की पूरी</b> ली जाती है। हरा: एक डिब्बा। नारंगी: तीन की कड़ी। आप कौन-सा दोगे?', done: 'जब सारी रेखाएँ खिंच जाएँ, खेल <b>ख़त्म</b> और <b>ज़्यादा डिब्बों वाला जीतता है</b>! <b>6 बनाम 3</b>, आप जीत गए! थोड़ा दो, ज़्यादा पाओ: यही है <b>कड़ियों</b> का राज़।' },
      { say: 'अब सारे नियम पक्के! आप <b>3×3, 4×4 या 5×5</b> डिब्बों पर खेल सकते हो। 3×3 से शुरू करो और कोशिश करो कि <b>कभी तीसरी भुजा न दो</b>। और बेहतर बनना हो तो पाठों में कड़ियों की चालें सीखो!' },
    ] },
    ar: { name: 'كتكوت الصناديق', next: 'التالي', back: 'رجوع', start: 'هيا نلعب', again: 'مرة أخرى', tap: 'انقر بين نقطتين', nope: 'لا يمكنك الرسم هنا', box: 'صندوق!', red: 'أنت', blue: 'الخصم',
      more: 'الصندوق {n}! ترسم مرة أخرى، استمر!', ng: 'هذا الخط لا يُكمل أي صندوق. ابحث عن الضلع الأخير للصندوق المضيء!', unsafe: 'أوه، صار للصندوق ضلع ثالث! خطفه الأزرق. حاول مجددًا وابحث عن خط آمن.', big: 'الرسم هناك يهدي السلسلة الثلاثية كلها! أعطِ الجزء الأصغر.', take: 'رائع! اضطر الأزرق إلى فتح السلسلة. خذ الصناديق الثلاثة دفعة واحدة!', s: [
      { say: 'مرحبًا، أنا <b>كتكوت الصناديق</b>! في لعبة <b>النقاط والصناديق</b> تصل نقاط صفحة الدفتر بخطوط وتتسابق للفوز <b>بالصناديق</b>. عُرفت في فرنسا قبل أكثر من 100 عام وما زالت تُلعب في الفصول حول العالم. كل ما تحتاجه ورقة وقلم!' },
      { say: 'بالتناوب يرسم كل لاعب <b>خطًا واحدًا</b> يصل نقطتين متجاورتين <b>أفقيًا أو عموديًا</b> (لا خطوط مائلة). معك <b>القلم الأحمر</b> ومع خصمك <b>الأزرق</b>. انقر بين نقطتين لترسم خطًا!', done: 'خط جميل! ورسم الأزرق خطًا على الفور. هكذا تسير اللعبة: <b>خط لكل لاعب بالتناوب</b>.' },
      { say: 'المربع الصغير اسمه <b>صندوق</b>. من يرسم <b>الضلع الرابع والأخير</b> للصندوق يفوز به. الصندوق المضيء له ثلاثة أضلاع بالفعل. ارسم الرابع!', done: 'فزت به! صار على الصندوق <b>علامتك (R)</b>: <b>نقطة واحدة</b>. ومن يأخذ صندوقًا <b>يرسم خطًا آخر</b> فورًا.' },
      { say: 'أخذت صندوقًا؟ <b>ارسم مرة أخرى!</b> لذلك يمكن أخذ الصناديق المتصلة <b>واحدًا تلو الآخر</b>. خذ الصناديق الثلاثة في الصف العلوي دفعة واحدة!', done: 'الثلاثة لك! كل صندوق تأخذه يمنحك خطًا آخر، فتسقط الصناديق المتصلة كلها معًا. وبعد أخذ صندوق <b>يجب</b> أن ترسم خطًا آخر.' },
      { say: 'إليك أهم نصيحة! إذا رسمت <b>الضلع الثالث</b> لصندوق، يضيف خصمك الرابع <b>ويأخذه</b>. الصناديق البرتقالية لها ضلعان بالفعل، فانتبه! ارسم <b>خطًا آمنًا</b> لا يعطي أي صندوق ضلعًا ثالثًا.', done: 'صحيح! لا يوجد صندوق بثلاثة أضلاع. هذا ما نسميه <b>خطًا آمنًا</b>. في البداية اختر الخطوط الآمنة.' },
      { say: 'قرب النهاية يعطي كل خط ضلعًا ثالثًا. عندها الحيلة هي أن <b>تعطي الجزء الأصغر</b>! صف الصناديق المتصلة (<b>السلسلة</b>) يُؤخذ <b>كله دفعة واحدة</b>. الأخضر: صندوق واحد. البرتقالي: سلسلة من ثلاثة. أيهما ستعطي؟', done: 'عندما تُرسم كل الخطوط <b>تنتهي</b> اللعبة، و<b>يفوز صاحب الصناديق الأكثر</b>! <b>6 مقابل 3</b>، فزت! أعطِ قليلًا وخذ كثيرًا: هذا سر <b>السلاسل</b>.' },
      { say: 'أصبحت تعرف كل القواعد! يمكنك اللعب على <b>3×3 أو 4×4 أو 5×5</b> صناديق. ابدأ بـ 3×3 وحاول <b>ألا تعطي ضلعًا ثالثًا أبدًا</b>. وإذا أردت أن تصبح أقوى، فالدروس تعلّمك خطط السلاسل!' },
    ] },
    ru: { name: 'Боксчик', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tap: 'Нажми между двумя точками', nope: 'Здесь линию провести нельзя', box: 'Квадрат!', red: 'Ты', blue: 'Соперник', more: 'Квадрат {n}! Ты проводишь ещё, продолжай!', ng: 'Эта линия не закрывает квадрат. Найди последнюю сторону светящегося квадрата!', unsafe: 'Ой, это третья сторона! Синий забрал квадрат. Попробуй снова и найди безопасную линию.', big: 'Эта линия отдаёт целую цепочку из трёх! Отдай меньшую часть.', take: 'Да! Синему пришлось открыть цепочку. Забери все три квадрата за раз!', s: [{ say: 'Привет, я <b>Боксчик</b>! В <b>«Точках и квадратах»</b> ты соединяешь точки на странице тетради линиями и соревнуешься за <b>квадраты</b>. Игру представили во Франции больше 100 лет назад, и в неё до сих пор играют в школах по всему миру. Нужны только бумага и ручка!' }, { say: 'Проводите по очереди <b>по одной линии</b>, соединяя две соседние точки <b>по горизонтали или вертикали</b> (не по диагонали). У тебя <b>красная ручка</b>, у соперника — <b>синяя</b>. Нажми между двумя точками, чтобы провести линию!', done: 'Хорошая линия! Синий сразу ответил своей. Так и идёт: <b>по одной линии по очереди</b>.' }, { say: 'Маленький квадратик называется <b>квадратом</b>. Кто проводит <b>четвёртую, последнюю сторону</b>, тот его забирает. У светящегося квадрата уже три стороны. Проведи четвёртую!', done: 'Есть! На квадрате <b>твоя метка (R)</b>: это <b>1 очко</b>. А кто забрал квадрат, сразу <b>проводит ещё линию</b>.' }, { say: 'Забрал квадрат? <b>Проводи снова!</b> Поэтому соединённые квадраты можно забирать <b>один за другим</b>. Забери все три квадрата верхнего ряда за раз!', done: 'Все три твои! Каждый квадрат даёт ещё линию, поэтому соединённые квадраты забираются разом. После взятия квадрата <b>нужно</b> провести ещё одну линию.' }, { say: 'А вот главный совет! Если проведёшь <b>третью сторону</b> квадрата, соперник просто добавит четвёртую и <b>заберёт его</b>. У оранжевых квадратов уже по две стороны, так что осторожно! Проведи <b>безопасную линию</b> — ту, что не даёт ни одному квадрату третью сторону.', done: 'Верно! Ни у одного квадрата нет третьей стороны. Это <b>безопасная линия</b>. В начале игры выбирай безопасные линии.' }, { say: 'Ближе к концу любая линия даёт третью сторону. Тогда хитрость — <b>отдать меньшую часть</b>! Ряд соединённых квадратов (<b>цепочка</b>) забирается <b>целиком</b>. Зелёная: один квадрат. Оранжевая: цепочка из трёх. Что отдашь?', done: 'Когда проведены все линии, игра <b>окончена</b>, и <b>побеждает тот, у кого больше квадратов</b>! <b>6:3</b>, ты победил! Отдай немного, получи много — в этом секрет <b>цепочек</b>.' }, { say: 'Вот и все правила! Можно играть на <b>3×3, 4×4 или 5×5</b> квадратов. Начни с 3×3 и старайся <b>никогда не отдавать третью сторону</b>. А чтобы стать сильнее, в уроках есть хитрые приёмы с цепочками!' }] },
    'zh-TW': { name: '盒盒雞', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', tap: '點擊兩點之間', nope: '那裡不能畫線', box: '方格！', red: '你', blue: '對手', more: '第{n}格！你可以再畫一條，繼續吧！', ng: '這條線沒有完成方格。找出發光方格的最後一邊！', unsafe: '哎呀，畫出第3邊了！藍方搶走了方格。再試一次，找出安全的線。', big: '畫在那裡會把3格的整條鏈送出去！把小的那部分讓給對方。', take: '對！藍方只好打開鏈了。一口氣拿下3個方格！', s: [{ say: '你好，我是<b>盒盒雞</b>！<b>點格棋</b>是在筆記本上用線連接點點，搶<b>方格</b>的遊戲。100多年前在法國被介紹出來，至今仍在世界各地的教室裡流行。只要有紙和筆就能玩！' }, { say: '雙方輪流<b>各畫1條線</b>，把相鄰的兩點<b>橫向或縱向</b>連起來（不能斜著）。你拿<b>紅筆</b>，對手拿<b>藍筆</b>。點擊兩點之間畫一條線！', done: '畫得好！藍方馬上也畫了一條。就是這樣<b>一人一條輪流畫</b>。' }, { say: '小小的正方形叫做<b>方格</b>。畫上方格<b>第4條、也就是最後一邊</b>的人就能得到它。發光的方格已經有3邊了。畫上第4邊！', done: '拿到了！方格上有<b>你的記號（R）</b>：<b>1分</b>。而且拿到方格的人可以馬上<b>再畫一條線</b>。' }, { say: '拿到方格？<b>再畫一條！</b>所以相連的方格可以<b>一個接一個</b>拿下。一口氣拿下最上面那排的3個方格！', done: '3個都是你的！每拿一格就能再畫一條，所以相連的方格會被一次拿光。拿到方格後<b>一定要</b>再畫一條線。' }, { say: '重要訣竅來了！如果畫出方格的<b>第3邊</b>，對手只要補上第4邊就能<b>拿走</b>。橘色方格已經有2邊了，要小心！畫一條<b>安全的線</b>：不會讓任何方格出現第3邊的線。', done: '答對了！沒有任何方格有第3邊。這叫做<b>安全線</b>。開局時要選安全線。' }, { say: '到了尾聲，畫哪條都會出現第3邊。這時的訣竅是<b>把小的那部分讓出去</b>！相連的一排方格（<b>鏈</b>）會被<b>一次拿光</b>。綠色：1格。橘色：3格的鏈。你要讓哪一個？', done: '所有的線都畫完，遊戲就<b>結束</b>，<b>方格多的人獲勝</b>！<b>6比3</b>，你贏了！讓一點、得很多，這就是<b>鏈</b>的祕訣。' }, { say: '規則就這些！可以玩<b>3×3、4×4或5×5</b>格。先從3×3開始，盡量<b>不要讓出第3邊</b>。想變得更強，課程裡有聰明的鏈戰術喔！' }] },
    id: { name: 'Boxchick', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tap: 'Ketuk di antara dua titik', nope: 'Kamu tak bisa menggambar di sana', box: 'Kotak!', red: 'Kamu', blue: 'Lawan', more: 'Kotak {n}! Kamu menggambar lagi, terus!', ng: 'Garis itu tidak menutup kotak. Cari sisi terakhir kotak yang menyala!', unsafe: 'Ups, itu sisi ketiga! Biru langsung mengambil kotaknya. Coba lagi dan cari garis yang aman.', big: 'Menggambar di sana memberikan seluruh rantai tiga kotak! Berikan bagian yang lebih kecil.', take: 'Ya! Biru terpaksa membuka rantai. Ambil ketiga kotak sekaligus!', s: [{ say: 'Hai, aku <b>Boxchick</b>! Dalam <b>Titik dan Kotak</b> kamu menghubungkan titik-titik di halaman buku catatan dengan garis dan berlomba merebut <b>kotak</b>. Permainan ini diperkenalkan di Prancis lebih dari 100 tahun lalu dan masih dimainkan di kelas-kelas di seluruh dunia. Cukup kertas dan pena!' }, { say: 'Bergantian menggambar <b>satu garis</b>, menghubungkan dua titik bertetangga <b>mendatar atau menurun</b> (tidak diagonal). Kamu memegang <b>pena merah</b>, lawan memegang yang <b>biru</b>. Ketuk di antara dua titik untuk menggambar garis!', done: 'Garis bagus! Biru langsung membalas. Begitulah: <b>satu garis masing-masing, bergantian</b>.' }, { say: 'Persegi kecil disebut <b>kotak</b>. Siapa yang menggambar <b>sisi keempat dan terakhir</b> sebuah kotak, dialah pemiliknya. Kotak yang menyala sudah punya tiga sisi. Gambar yang keempat!', done: 'Dapat! Kotak itu mendapat <b>tandamu (R)</b>: itu <b>1 poin</b>. Dan siapa yang mengambil kotak <b>menggambar satu garis lagi</b> langsung.' }, { say: 'Dapat kotak? <b>Gambar lagi!</b> Jadi kotak yang tersambung bisa diambil <b>satu demi satu</b>. Ambil ketiga kotak di baris atas sekaligus!', done: 'Ketiganya milikmu! Setiap kotak memberimu garis lagi, jadi kotak tersambung jatuh sekaligus. Setelah mengambil kotak kamu <b>wajib</b> menggambar satu garis lagi.' }, { say: 'Ini tips pentingnya! Jika kamu menggambar <b>sisi ketiga</b> sebuah kotak, lawan cukup menambah yang keempat dan <b>mengambilnya</b>. Kotak oranye sudah punya dua sisi, jadi hati-hati! Gambar <b>garis aman</b>: garis yang tak memberi kotak mana pun sisi ketiga.', done: 'Benar! Tak ada kotak dengan sisi ketiga. Itu disebut <b>garis aman</b>. Di awal permainan, pilih garis aman.' }, { say: 'Menjelang akhir, setiap garis memberi sisi ketiga. Saat itu triknya adalah <b>memberikan bagian yang lebih kecil</b>! Deretan kotak tersambung (<b>rantai</b>) diambil <b>sekaligus</b>. Hijau: satu kotak. Oranye: rantai tiga. Mana yang akan kamu berikan?', done: 'Saat semua garis sudah digambar permainan <b>selesai</b>, dan <b>kotak terbanyak menang</b>! <b>6 lawan 3</b>, kamu menang! Beri sedikit, dapat banyak: itulah rahasia <b>rantai</b>.' }, { say: 'Itu semua aturannya! Kamu bisa main dengan <b>3×3, 4×4, atau 5×5</b> kotak. Mulai dengan 3×3 dan usahakan <b>tak pernah memberi sisi ketiga</b>. Kalau ingin lebih kuat, pelajaran mengajarkan taktik rantai yang cerdik!' }] },
    tr: { name: 'Boxchick', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tap: 'İki nokta arasına dokun', nope: 'Oraya çizemezsin', box: 'Kutu!', red: 'Sen', blue: 'Rakip', more: '{n}. kutu! Yine çiziyorsun, devam et!', ng: 'Bu çizgi kutuyu kapatmıyor. Parlayan kutunun son kenarını bul!', unsafe: 'Eyvah, bu üçüncü kenar oldu! Mavi kutuyu kaptı. Tekrar dene ve güvenli bir çizgi bul.', big: 'Oraya çizmek üçlü zincirin tamamını verir! Küçük parçayı ver.', take: 'Evet! Mavi zinciri açmak zorunda kaldı. Üç kutuyu birden al!', s: [{ say: 'Merhaba, ben <b>Boxchick</b>! <b>Noktalar ve Kutular</b>\'da defter sayfasındaki noktaları çizgilerle birleştirip <b>kutu</b> kapmak için yarışırsın. 100 yıldan uzun süre önce Fransa\'da tanıtıldı ve hâlâ dünyanın her yerinde sınıflarda oynanıyor. Sadece kâğıt ve kalem yeter!' }, { say: 'Sırayla <b>birer çizgi</b> çizerek iki komşu noktayı <b>yatay ya da dikey</b> birleştirin (çapraz yok). <b>Kırmızı kalem</b> sende, <b>mavi</b> rakipte. Çizgi çizmek için iki nokta arasına dokun!', done: 'Güzel çizgi! Mavi hemen bir tane çizdi. İşte böyle: <b>sırayla birer çizgi</b>.' }, { say: 'Küçük kareye <b>kutu</b> denir. Bir kutunun <b>dördüncü ve son kenarını</b> çizen onu alır. Parlayan kutunun zaten üç kenarı var. Dördüncüsünü çiz!', done: 'Aldın! Kutuya <b>senin işaretin (R)</b> konur: bu <b>1 puan</b>. Kutu alan da hemen <b>bir çizgi daha çizer</b>.' }, { say: 'Kutu mu aldın? <b>Yine çiz!</b> Bu yüzden birleşik kutular <b>art arda</b> alınabilir. Üst sıradaki üç kutuyu birden al!', done: 'Üçü de senin! Aldığın her kutu bir çizgi daha verir, böylece birleşik kutular bir anda düşer. Kutu aldıktan sonra bir çizgi daha çizmek <b>zorundasın</b>.' }, { say: 'İşte büyük ipucu! Bir kutunun <b>üçüncü kenarını</b> çizersen rakip dördüncüyü ekleyip <b>onu alır</b>. Turuncu kutuların zaten iki kenarı var, dikkat! <b>Güvenli bir çizgi</b> çiz: hiçbir kutuya üçüncü kenar vermeyen çizgi.', done: 'Doğru! Hiçbir kutunun üçüncü kenarı yok. Buna <b>güvenli çizgi</b> denir. Oyunun başında güvenli çizgileri seç.' }, { say: 'Sona doğru her çizgi bir üçüncü kenar verir. O zaman püf noktası <b>küçük parçayı vermek</b>! Birleşik kutu sırası (<b>zincir</b>) <b>tek seferde</b> alınır. Yeşil: bir kutu. Turuncu: üçlü zincir. Hangisini vereceksin?', done: 'Tüm çizgiler çizilince oyun <b>biter</b> ve <b>çok kutusu olan kazanır</b>! <b>6\'ya 3</b>, kazandın! Az ver, çok al: <b>zincirlerin</b> sırrı bu.' }, { say: 'Kuralların hepsi bu! <b>3×3, 4×4 ya da 5×5</b> kutuyla oynayabilirsin. 3×3 ile başla ve <b>asla üçüncü kenar vermemeye</b> çalış. Daha güçlü olmak istersen derslerde akıllıca zincir taktikleri var!' }] },
  };

  /* ---------- little sounds: a chime for a box / a solved task, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const chime = () => [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0, .45, .08, 'triangle', i * .07));
    const box = (n = 1) => { const r = Math.pow(2, Math.min(n - 1, 8) * 2 / 12); [523.25, 783.99].forEach((f, i) => tone(f * r, 0, .35, .07, 'triangle', i * .07)); };   // n: boxes in a row → a whole tone higher each
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    const boop = () => tone(320, 200, .14, .08, 'triangle');
    return { chime, box, blip, boop, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const K = window.Atlas3D.dots.kit(T3, N), { root, nb, PY, PW, PD, SP, E, B } = K;
    T3.show('dots', root); T3.play(true);
    if (T3.fit) T3.fit(K.tall ? { w: 8.3, d: 10.2, y: PY, pitch: 1.3 } : { w: 10.8, d: 10.2, y: PY, pitch: 1.2 });   // (the table game's framing)
    const marks = new TH.Group(); nb.add(marks);
    let by = new Int8Array(E).fill(-1), owner = new Int8Array(B).fill(-1), score = [0, 0], step = 0, stopped = false, busy = false, played = false, tok = 0, got = 0, phase = '', timers = [];
    let hold = false;   // (tests: no auto-advance)
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const nap = ms => new Promise(r => setTimeout(r, ms));
    const sides = bx => K.boxEdges(bx).filter(e => by[e] >= 0).length;
    const closing = e => K.edgeBoxes(e).filter(bx => owner[bx] < 0 && sides(bx) === 3);   // boxes this undrawn line would finish
    const thirds = e => K.edgeBoxes(e).some(bx => owner[bx] < 0 && sides(bx) === 2);       // would give a box its third side

    /* ---------- marks on the page: tinted boxes ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    function tint(bx, color, op = .32, pulse = true) {
      const [px, pz] = K.dotP(Math.floor(bx / N), bx % N);
      const m = new TH.Mesh(new TH.PlaneGeometry(SP * .84, SP * .84), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 }));
      m.rotation.x = -Math.PI / 2; m.position.set(px + SP / 2 - PW / 2, PY + .003, pz + SP / 2 - PD / 2); m.renderOrder = 2;
      m.userData.pulse = pulse; m.userData.op = op; marks.add(m); return m;
    }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; m.material.opacity = m.userData.op * (.45 + k * .75); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (played && phase !== 'take') return;
      if (st.act === 'box' || st.act === 'run' || phase === 'take') for (let bx = 0; bx < B; bx++) if (owner[bx] < 0 && sides(bx) === 3) tint(bx, 0xffc928, .5);
      if (st.two) for (let bx = 0; bx < B; bx++) if (owner[bx] < 0 && sides(bx) === 2) tint(bx, 0xff8a1e, .42);
      if (st.act === 'end' && !phase) { st.chain.forEach(bx => tint(bx, 0xff8a1e, .42)); st.single.forEach(bx => tint(bx, 0x3ec46d, .42)); }
    }
    const redraw = () => K.redraw(by, owner, score);

    /* ---------- one line, drawn by a pen; returns the boxes it closed (−1: cut short) ---------- */
    let combo = 0, comboPl = -1;   // boxes taken in a row (the chime climbs with it)
    async function line(e, pl) {
      const my = tok, ok = await K.drawLine(e, pl, () => my === tok && !stopped);
      if (!ok || stopped || my !== tok) return -1;
      const cl = closing(e);
      by[e] = pl; K.ribbon.visible = false;
      cl.forEach(bx => { owner[bx] = pl; score[pl]++; });
      redraw();
      if (!cl.length) combo = 0; else { if (comboPl !== pl) combo = 0; comboPl = pl; combo += cl.length; cl.forEach(bx => K.flash(bx, pl)); SFX.box(combo); }
      return cl.length;
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
    function setPos(st) {
      by = new Int8Array(E).fill(-1); owner = new Int8Array(B).fill(-1); score = [0, 0];
      st.p[0].forEach(e => { by[e] = 0; }); st.p[1].forEach(e => { by[e] = 1; });
      Object.entries(st.own || {}).forEach(([bx, o]) => { owner[bx] = o; score[o]++; });
      redraw();
    }
    function go(n, keepSay) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; got = 0; phase = ''; tok++; combo = 0;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      K.ribbon.visible = false; K.markEdge(K.preview, -1); K.penHome(0); K.penHome(1);
      setPos(st);
      later(showTask, 260);
      if (!keepSay) say(L.s[step].say);
      buttons();
    }
    function finish() {
      played = true; busy = false; phase = ''; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime(); K.penHome(0); K.penHome(1);
      if (st.act === 'end') $('.cnt').innerHTML = `<span class="sc"><i class="dk" style="background:${K.INK[0]};border-radius:4px;transform:rotate(45deg) scale(.8)"></i>${L.red} <b>${score[0]}</b></span><span class="vs">:</span><span class="sc"><b>${score[1]}</b> ${L.blue}<i class="dk" style="background:${K.INK[1]};border-radius:4px;transform:rotate(45deg) scale(.8)"></i></span>`;
      buttons(); autoNext();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30) + (STEPS[step].act === 'end' ? 600 : 0); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last && !hold) go(step + 1); }, ms); }

    /* ---------- the tasks ---------- */
    async function tapLine(e) {
      const st = STEPS[step], s0 = step, alive = () => !stopped && step === s0;
      if (st.act === 'any') {
        busy = true; clearMarks();
        if (await line(e, 0) < 0) return;
        await nap(260); if (!alive()) return;
        const r = st.reply.find(x => by[x] < 0 && !closing(x).length);
        if (r != null && await line(r, 1) < 0) return;
        if (alive()) finish();
        return;
      }
      if (st.act === 'box' || st.act === 'run' || phase === 'take') {
        if (!closing(e).length) { say(L.ng); SFX.boop(); return; }
        busy = true; clearMarks();
        const k = await line(e, 0); if (k < 0 || !alive()) return;
        got += k; busy = false;
        const need = st.act === 'end' ? 3 : st.need || 1;
        if (got >= need) { finish(); return; }
        tip('✨ ' + L.box); say(L.more.replace('{n}', got)); showTask();
        return;
      }
      if (st.act === 'safe') {
        busy = true; clearMarks();
        const bad = thirds(e);
        if (await line(e, 0) < 0) return;
        if (!bad) { finish(); return; }
        // a third side: Blue takes what it can, then the page is put back for another try
        await nap(250); if (!alive()) return;
        for (;;) { const x = [...Array(E).keys()].find(q => by[q] < 0 && closing(q).length); if (x == null) break; if (await line(x, 1) < 0 || !alive()) return; await nap(150); }
        say(L.unsafe); SFX.boop();
        later(() => go(step, true), 2600);
        return;
      }
      if (st.act === 'end') {
        if (!st.small.includes(e)) { say(L.big); SFX.boop(); return; }
        busy = true; clearMarks(); phase = 'give';
        if (await line(e, 0) < 0) return;
        await nap(300); if (!alive()) return;
        const other = st.small.find(x => by[x] < 0);   // Blue takes the single box …
        if (await line(other, 1) < 0) return;
        await nap(400); if (!alive()) return;
        if (await line(st.open, 1) < 0) return;          // … and has to open the chain
        if (!alive()) return;
        phase = 'take'; got = 0; busy = false; say(L.take); showTask();
      }
    }
    function onClick(ev) {
      if (busy || played || T3.wasDrag() || ev.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act) return;
      const e = K.edgeAt(ev, by);
      if (e < 0) return;
      K.markEdge(K.preview, -1);
      tapLine(e);
    }
    let hov = -1;
    const onMove = ev => {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const st = STEPS[step], e = !busy && !played && st.act ? K.edgeAt(ev, by) : -1;
      if (e !== hov) { hov = e; ctx.el.style.cursor = e >= 0 ? 'pointer' : ''; K.markEdge(K.preview, e); }
    };
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick); ctx.el.addEventListener('pointermove', onMove);
    // keyboard: Space / Enter / → next, ← back (an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    redraw();
    later(() => go(0), 300);
    const dbg = { at: e => { const st = K.strokeOf(e), [x, z] = K.qpt(st, .5), p = K.toRoot(x, z, PY); return T3.project(p.x, p.z, PY); }, step: () => step, steps: STEPS.length, played: () => played, busy: () => busy, phase: () => phase,
      by: () => Array.from(by), score: () => score.slice(), safe: () => [...Array(E).keys()].filter(e => by[e] < 0 && !thirds(e) && !closing(e).length), closing: () => [...Array(E).keys()].filter(e => by[e] < 0 && closing(e).length), go: n => go(n), hold: on => { hold = !!on; } };
    window.__dtRules = dbg;   // (test hook)
    return {
      stop() { stopped = true; tok++; if (window.__dtRules === dbg) delete window.__dtRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove); ctx.el.style.cursor = ''; document.removeEventListener('keydown', onKey, true); clearMarks(); K.stop(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.dots = { start };
})();
