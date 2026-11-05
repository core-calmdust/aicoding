/* =====================================================================
   Mancala rules — a guided tour on the 3D table (the piano-black board,
   atlas/models/mancala.js), told by the guide character (Gembeetle).
   The site's default rules, Kalah: the pits and the stores, sowing counter-
   clockwise, your store yes / theirs no, the extra turn, the capture (and a
   little quiz), the end of the game and the count, the other rule sets.
   Every move is played by the game's own rules (../mancala/engine.js: trace)
   and shown with the table game's own sowing animation (Atlas3D.mancala.kit:
   the hand of gems, the gold counts, the capture rings).
   The player owns pits 0..5 (the near row) and store 6, as in the engine.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-gem.webp', ENG = '../mancala/engine.js?v=20261028B10';   // (the same engine file and cache key as the table game)
  const loadEngine = () => window.MancalaEngine ? Promise.resolve(window.MancalaEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.MancalaEngine ? res(window.MancalaEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });

  // a position: your pits left → right, your store, the far row as you see it (left → right), their store
  const B = (mine, ms, far, os) => { const b = new Int8Array(14); mine.forEach((v, i) => { b[i] = v; }); b[6] = ms; far.forEach((v, i) => { b[12 - i] = v; }); b[13] = os; return b; };
  const INIT = B([4, 4, 4, 4, 4, 4], 0, [4, 4, 4, 4, 4, 4], 0);
  const STEPS = [
    { b: INIT },
    { b: INIT, mine: true },
    { b: INIT, act: 'sow', ok: [0, 1, 3, 4, 5], arrows: true },
    { b: B([2, 3, 1, 2, 0, 9], 8, [2, 3, 1, 4, 2, 3], 8), act: 'store', ok: [5], skip: true, arrows: true },
    { b: B([1, 2, 0, 3, 1, 2], 12, [3, 2, 4, 1, 2, 3], 12), act: 'extra', ok: [3], all: true },
    { b: B([0, 2, 2, 0, 3, 2], 13, [2, 3, 1, 5, 2, 1], 12), act: 'cap', ok: [1] },
    { b: B([3, 1, 2, 0, 3, 2], 13, [1, 2, 3, 4, 1, 2], 11), act: 'capq', ok: [0], all: true },
    { b: B([0, 0, 0, 0, 0, 1], 24, [1, 1, 3, 0, 1, 2], 15), act: 'end', ok: [5] },
    { b: INIT },
    { b: INIT, last: true },
  ];

  const TXT = {
    ja: { name: 'マンカラビ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている穴をタップ', nope: 'その穴は今はえらべないよ〜', cap: '横取り！', extra: 'もう一回！', you: 'あなた', opp: '相手', win: '勝ち！',
      wrong: { extra: 'その穴だと、最後の1粒がストアにぴったり入らないよ〜。穴の横の数字を見てね！', capq: 'うーん、その穴だと横取りにならないよ。最後の1粒がどこに止まるか、数えてみて！' }, s: [
      { say: 'やっほー、わたしは<b>マンカラビ</b>！ 背中のくぼみに宝石の種をためるのが大好きなんだ〜。<b>マンカラ</b>は、アフリカや中東で何千年も前から遊ばれてきた「<b>種まきゲーム</b>」のなかま。いっしょに遊びながら覚えようね！' },
      { say: '盤には<b>小さな穴が6つずつ</b>2列と、両はしに<b>大きなストア</b>があるよ。光っている6つの穴と光っているストアが<b>あなたのもの</b>。はじめは穴に種が<b>4粒ずつ</b>（6粒も選べるよ）。<b>ストアに種を多く集めた人の勝ち</b>なんだ！' },
      { say: '自分の穴を1つえらぶと、中の種を<b>ぜんぶつかんで</b>、となりの穴から<b>1粒ずつ</b>落としていくよ。向きは<b>反時計回り</b>（矢印の方向）。光っている穴をどれかタップしてみて！', done: 'ぽとん、ぽとん…！ 1粒ずつ順番に入っていったね。これが<b>種まき</b>だよ。' },
      { say: 'まいている途中で<b>自分のストア</b>を通るときは、ストアにも1粒入れるよ。でも<b>相手のストア</b>（赤く光っているところ）は<b>とばす</b>んだ。種がたくさん入った穴をタップして、ぐるっと1周まいてみよう！', done: '自分のストアには1粒ポトン、相手のストアはピョンととばして、また自分の列まで戻ってきたね！' },
      { say: '<b>最後の1粒</b>が自分のストアにぴったり入ったら、<b>もう一回</b>あなたの番！ ストアまでの距離と<b>同じ数の種</b>が入った穴をさがしてタップしてね。穴の横の数字がヒントだよ。', done: 'ぴったりゴール！ <b>もう一回</b>まけるよ。ストアに近い穴から順に使うと、何回も続けてまけることもあるんだ〜。' },
      { say: 'こんどは<b>横取り</b>！ 最後の1粒が<b>自分の側の空っぽの穴</b>に止まったら、<b>向かいの相手の穴の種</b>とその<b>最後の1粒</b>を、まとめて自分のストアに入れられるよ。光っている穴をタップ！', done: '横取り成功〜！ 向かいの5粒と最後の1粒で、<b>6粒</b>もゲットだよ！' },
      { say: 'もう1問！ この中で<b>横取りできる穴</b>はどれかな？ 最後の1粒が自分の側の<b>空っぽの穴</b>に止まって、その向かいに種がある穴をさがしてね。', done: '大正解！ 4粒＋1粒をいただき〜！ 向かいが空っぽのときは横取りにならないから、気をつけてね。' },
      { say: 'どちらかの<b>6つの穴がぜんぶ空っぽ</b>になったら<b>おしまい</b>。そのとき残っている種は、その列の持ち主のストアに入るよ。最後の1粒をまいて、ゲームを終わらせちゃおう！', done: 'あなたの列が空っぽになって終局！ 相手の残りの種は相手のストアへ。ストアをくらべて…<b>25対23</b>で、あなたの勝ち〜！' },
      { say: 'じつはマンカラには、世界中に<b>たくさんのルール</b>があるんだ。ここで遊ぶのは、いちばん人気の「<b>カラハ</b>」。フル機能版では、横取りなしの「<b>イージー</b>」、相手の種だけ取る「<b>ノーマル</b>」、リレーでまき続ける「<b>スンカ</b>」も選べるよ。アフリカの「オワリ」みたいな仲間もいるんだ〜。' },
      { say: 'これでルールはばっちり！ コツは、<b>ストアにぴったりの穴</b>で「もう一回」をねらうことと、相手に<b>横取りされそうな穴</b>を空けっぱなしにしないこと。さあ、さっそく対局してみよう！' },
    ] },
    en: { name: 'Gembeetle', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing pit', nope: "You can't pick that pit right now", cap: 'Capture!', extra: 'Extra turn!', you: 'You', opp: 'Opponent', win: 'You win!',
      wrong: { extra: "From that pit, the last seed won't land right in your store. Check the numbers beside the pits!", capq: "Hmm, that pit doesn't capture. Count where the last seed stops!" }, s: [
      { say: "Hi there, I'm <b>Gembeetle</b>! I love keeping gem seeds in the hollow on my back. <b>Mancala</b> is one of the <b>sowing games</b>, played in Africa and the Middle East for thousands of years. Let's learn it by playing together!" },
      { say: 'The board has <b>two rows of six small pits</b> and a <b>big store</b> at each end. The six glowing pits and the glowing store are <b>yours</b>. Every pit starts with <b>4 seeds</b> (you can choose 6 too), and whoever <b>gathers the most seeds in their store wins</b>!' },
      { say: 'Pick one of your pits: you <b>scoop up all its seeds</b> and drop them <b>one by one</b> into the next pits, going <b>counter-clockwise</b> (follow the arrows). Tap any glowing pit!', done: "Plip, plop! One seed into each pit, in order. That's <b>sowing</b>." },
      { say: "When you pass <b>your own store</b>, drop a seed in it too. But your <b>opponent's store</b> (glowing red) is <b>skipped</b>. Tap the pit with lots of seeds and sow all the way round!", done: 'One seed in your store, a little hop over theirs, and all the way back to your own row!' },
      { say: 'If your <b>last seed</b> lands right in your store, you get <b>another turn</b>! Find the pit whose number of seeds <b>matches its distance</b> to your store. The numbers beside the pits will help.', done: 'Bullseye! You get to <b>go again</b>. Using the pits closest to your store first can give you several turns in a row.' },
      { say: 'Now a <b>capture</b>! If your last seed lands in an <b>empty pit on your side</b>, you take <b>the seeds in the pit opposite</b> plus that <b>last seed</b>, straight into your store. Tap the glowing pit!', done: 'Got them! Five seeds from across the board plus your last one: <b>six</b> in one go!' },
      { say: 'One more! Which pit gives you a <b>capture</b> here? Look for the one whose last seed stops in an <b>empty pit</b> on your side, with seeds across from it.', done: "Exactly right! Four plus one, all yours. If the pit across is empty, there's no capture, so watch out." },
      { say: "When either player's <b>six pits are all empty</b>, the game is <b>over</b>. Any seeds still on the board go to the store of the player whose row they're in. Sow your last seed and finish the game!", done: "Your row is empty, so that's the end! Their leftover seeds go to their store. Counting up... <b>25 to 23</b>, you win!" },
      { say: "Mancala actually has <b>lots of rule sets</b> around the world. Here we play the most popular one, <b>Kalah</b>. In the full game you can also pick <b>Easy</b> (no captures), <b>Normal</b> (take only the opponent's seeds) or <b>Sunka</b> (keep sowing in a relay). There are cousins like <b>Oware</b> from Africa, too!" },
      { say: "That's all the rules! Tips: aim for the pit that lands <b>right in your store</b> for an extra turn, and don't leave empty pits your opponent can <b>capture</b> into. Now let's play a real game!" },
    ] },
    zh: { name: '宝石甲虫', next: '下一步', back: '返回', start: '来下一局', again: '再来一次', tap: '点击发光的坑', nope: '现在不能选这个坑哦～', cap: '吃子！', extra: '再走一次！', you: '你', opp: '对手', win: '你赢了！',
      wrong: { extra: '从这个坑开始，最后一颗种子进不了仓哦～看看坑旁边的数字吧！', capq: '嗯……这个坑吃不到子。数一数最后一颗种子会停在哪里！' }, s: [
      { say: '哈喽，我是<b>宝石甲虫</b>！最喜欢把宝石种子存在背上的小窝里啦～<b>播棋（曼卡拉）</b>是在非洲和中东流传了几千年的“<b>播种游戏</b>”家族的一员。一起边玩边学吧！' },
      { say: '棋盘上有<b>两排各6个小坑</b>，两头各有一个<b>大仓</b>。发光的6个坑和发光的仓都是<b>你的</b>。开始时每个坑有<b>4颗种子</b>（也可以选6颗）。<b>仓里种子最多的人获胜</b>！' },
      { say: '选自己的一个坑，把里面的种子<b>全部抓起来</b>，从下一个坑开始<b>一颗一颗</b>放下去。方向是<b>逆时针</b>（跟着箭头）。点一个发光的坑试试！', done: '叮咚、叮咚……一颗一颗按顺序放进去了。这就是<b>播种</b>！' },
      { say: '播种途中经过<b>自己的仓</b>时，也要放一颗进去。但是<b>对手的仓</b>（红色发光的地方）要<b>跳过</b>。点种子很多的那个坑，绕一整圈播播看！', done: '自己的仓里放一颗，对手的仓轻轻跳过，又绕回到自己这一排了！' },
      { say: '<b>最后一颗</b>刚好落进自己的仓，就能<b>再走一次</b>！找出种子数<b>正好等于</b>到仓的距离的那个坑吧。坑旁边的数字就是提示哦。', done: '正中目标！可以<b>再走一次</b>。先用离仓近的坑，有时能连续走好几次呢～' },
      { say: '接下来是<b>吃子</b>！最后一颗落在<b>自己这边的空坑</b>里时，就能把<b>对面坑里的种子</b>和这<b>最后一颗</b>一起放进自己的仓。点发光的坑！', done: '吃子成功～！对面的5颗加上最后1颗，一下拿到<b>6颗</b>！' },
      { say: '再来一题！这里<b>能吃子的坑</b>是哪个？找出最后一颗会停在自己这边<b>空坑</b>、而且对面有种子的那个坑吧。', done: '答对了！4颗加1颗，全归你啦～对面是空的话就吃不到哦，要注意。' },
      { say: '任何一方的<b>6个坑全空</b>时，游戏就<b>结束</b>。剩下的种子归那一排主人的仓。播下最后一颗，结束这局吧！', done: '你这排空了，终局！对手剩下的种子进对手的仓。比一比仓……<b>25比23</b>，你赢了～！' },
      { say: '其实播棋在世界各地有<b>很多种规则</b>。这里玩的是最受欢迎的“<b>卡拉</b>”。在完整版里还能选没有吃子的“<b>简单</b>”、只吃对手种子的“<b>普通</b>”、接力播种的“<b>松卡</b>”。还有非洲的“奥瓦里”等好多亲戚哦～' },
      { say: '规则全部学会啦！诀窍是：用<b>刚好进仓</b>的坑争取“再走一次”，别留下会被对手<b>吃子</b>的空坑。来，马上下一局吧！' },
    ] },
    ko: { name: '보석풍뎅이', next: '다음', back: '이전', start: '대국해 보기', again: '한 번 더', tap: '빛나는 구멍을 탭하세요', nope: '그 구멍은 지금 고를 수 없어~', cap: '가져오기!', extra: '한 번 더!', you: '나', opp: '상대', win: '승리!',
      wrong: { extra: '그 구멍이면 마지막 씨앗이 창고에 딱 안 들어가~ 구멍 옆 숫자를 봐!', capq: '음, 그 구멍은 가져오기가 안 돼. 마지막 씨앗이 어디서 멈출지 세어 봐!' }, s: [
      { say: '안녕, 나는 <b>보석풍뎅이</b>! 등에 있는 홈에 보석 씨앗을 모으는 걸 좋아해~ <b>만칼라</b>는 아프리카와 중동에서 수천 년 동안 즐겨 온 <b>씨뿌리기 게임</b>의 한 종류야. 같이 놀면서 배워 보자!' },
      { say: '판에는 <b>작은 구멍 6개씩 두 줄</b>, 양 끝에 <b>큰 창고</b>가 있어. 빛나는 구멍 6개와 빛나는 창고가 <b>네 거</b>야. 처음엔 구멍마다 씨앗이 <b>4개씩</b>(6개도 고를 수 있어). <b>창고에 씨앗을 가장 많이 모은 사람이 승리</b>!' },
      { say: '내 구멍 하나를 고르면 씨앗을 <b>전부 집어서</b> 다음 구멍부터 <b>하나씩</b> 떨어뜨려. 방향은 <b>반시계 방향</b>(화살표 쪽)이야. 빛나는 구멍 아무거나 탭해 봐!', done: '톡, 톡…! 하나씩 차례로 들어갔지? 이게 <b>씨뿌리기</b>야.' },
      { say: '뿌리다가 <b>내 창고</b>를 지나면 창고에도 하나 넣어. 하지만 <b>상대 창고</b>(빨갛게 빛나는 곳)는 <b>건너뛰어</b>. 씨앗이 많은 구멍을 탭해서 한 바퀴 빙 돌려 봐!', done: '내 창고엔 하나 톡, 상대 창고는 폴짝 건너뛰고, 다시 내 줄까지 돌아왔네!' },
      { say: '<b>마지막 씨앗</b>이 내 창고에 딱 들어가면 <b>한 번 더</b> 내 차례! 창고까지 거리와 <b>같은 수의 씨앗</b>이 든 구멍을 찾아 탭해. 구멍 옆 숫자가 힌트야.', done: '딱 골인! <b>한 번 더</b> 뿌릴 수 있어. 창고에 가까운 구멍부터 쓰면 여러 번 연속으로 둘 수도 있어~' },
      { say: '이번엔 <b>가져오기</b>! 마지막 씨앗이 <b>내 쪽의 빈 구멍</b>에서 멈추면, <b>맞은편 상대 구멍의 씨앗</b>과 그 <b>마지막 씨앗</b>을 한꺼번에 내 창고에 넣을 수 있어. 빛나는 구멍을 탭!', done: '가져오기 성공~! 맞은편 5개와 마지막 1개로 <b>6개</b>나 얻었어!' },
      { say: '한 문제 더! 여기서 <b>가져오기를 할 수 있는 구멍</b>은 어디일까? 마지막 씨앗이 내 쪽 <b>빈 구멍</b>에서 멈추고, 맞은편에 씨앗이 있는 구멍을 찾아봐.', done: '정답! 4개+1개 다 네 거야~ 맞은편이 비어 있으면 가져오기가 안 되니까 조심해.' },
      { say: '어느 한쪽의 <b>구멍 6개가 모두 비면</b> <b>게임 끝</b>. 그때 남은 씨앗은 그 줄 주인의 창고로 가. 마지막 씨앗을 뿌려서 게임을 끝내 보자!', done: '네 줄이 비어서 종국! 상대의 남은 씨앗은 상대 창고로. 창고를 비교하면… <b>25 대 23</b>으로 네 승리~!' },
      { say: '사실 만칼라에는 세계 곳곳에 <b>여러 가지 규칙</b>이 있어. 여기서 하는 건 가장 인기 있는 <b>칼라</b>야. 풀 버전에서는 가져오기가 없는 <b>이지</b>, 상대 씨앗만 가져오는 <b>노멀</b>, 릴레이로 계속 뿌리는 <b>숭카</b>도 고를 수 있어. 아프리카의 오와레 같은 친척도 있단다~' },
      { say: '이제 규칙은 완벽해! 요령은 <b>창고에 딱 맞는 구멍</b>으로 한 번 더를 노리는 것, 그리고 상대에게 <b>가져오기 당할 빈 구멍</b>을 남기지 않는 것. 자, 바로 대국해 보자!' },
    ] },
    es: { name: 'Escarabajoya', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca un hoyo que brille', nope: 'Ese hoyo no se puede elegir ahora', cap: '¡Captura!', extra: '¡Turno extra!', you: 'Tú', opp: 'Rival', win: '¡Ganas!',
      wrong: { extra: 'Desde ese hoyo, la última semilla no cae justo en tu almacén. ¡Mira los números junto a los hoyos!', capq: 'Mmm, ese hoyo no captura. ¡Cuenta dónde se detiene la última semilla!' }, s: [
      { say: '¡Hola! Soy <b>Escarabajoya</b> y me encanta guardar semillas de gema en el huequito de mi espalda. El <b>mancala</b> es de la familia de los <b>juegos de siembra</b>, que se juegan en África y Oriente Medio desde hace miles de años. ¡Vamos a aprenderlo jugando!' },
      { say: 'El tablero tiene <b>dos filas de seis hoyos</b> y un <b>gran almacén</b> en cada extremo. Los seis hoyos que brillan y el almacén que brilla son <b>tuyos</b>. Cada hoyo empieza con <b>4 semillas</b> (también puedes elegir 6), y <b>gana quien reúne más semillas en su almacén</b>.' },
      { say: 'Elige uno de tus hoyos: <b>coges todas sus semillas</b> y las vas dejando <b>de una en una</b> en los hoyos siguientes, en <b>sentido antihorario</b> (sigue las flechas). ¡Toca cualquier hoyo que brille!', done: '¡Plic, ploc! Una semilla en cada hoyo, por orden. Eso es <b>sembrar</b>.' },
      { say: 'Si al sembrar pasas por <b>tu almacén</b>, deja una semilla también ahí. Pero el <b>almacén del rival</b> (el que brilla en rojo) <b>se salta</b>. Toca el hoyo con muchas semillas y siembra dando toda la vuelta.', done: 'Una semilla en tu almacén, un saltito sobre el suyo, ¡y de vuelta a tu fila!' },
      { say: 'Si tu <b>última semilla</b> cae justo en tu almacén, ¡tienes <b>otro turno</b>! Busca el hoyo cuyas semillas <b>coinciden con la distancia</b> hasta tu almacén. Los números junto a los hoyos te ayudan.', done: '¡En el blanco! Puedes <b>volver a jugar</b>. Si usas primero los hoyos más cercanos al almacén, a veces encadenas varios turnos.' },
      { say: '¡Ahora una <b>captura</b>! Si tu última semilla cae en un <b>hoyo vacío de tu lado</b>, te llevas <b>las semillas del hoyo de enfrente</b> y esa <b>última semilla</b>, directo a tu almacén. ¡Toca el hoyo que brilla!', done: '¡Captura! Cinco semillas de enfrente más tu última: ¡<b>seis</b> de golpe!' },
      { say: '¡Una más! ¿Qué hoyo te da una <b>captura</b> aquí? Busca aquel cuya última semilla se detiene en un <b>hoyo vacío</b> de tu lado, con semillas enfrente.', done: '¡Exacto! Cuatro más una, todas tuyas. Si el hoyo de enfrente está vacío no hay captura, ojo.' },
      { say: 'Cuando los <b>seis hoyos</b> de cualquiera de los dos se quedan <b>vacíos</b>, la partida <b>termina</b>. Las semillas que queden van al almacén del dueño de esa fila. ¡Siembra tu última semilla y acaba la partida!', done: '¡Tu fila está vacía, fin de la partida! Sus semillas restantes van a su almacén. Contamos... <b>25 a 23</b>, ¡ganas tú!' },
      { say: 'El mancala tiene en realidad <b>muchísimas reglas</b> por todo el mundo. Aquí jugamos la más popular, <b>Kalah</b>. En el juego completo también puedes elegir <b>Fácil</b> (sin capturas), <b>Normal</b> (solo te llevas las semillas del rival) o <b>Sunka</b> (siembra en relevos). ¡Y hay primos como el <b>Oware</b> de África!' },
      { say: '¡Ya conoces todas las reglas! Trucos: busca el hoyo que cae <b>justo en tu almacén</b> para repetir turno, y no dejes hoyos vacíos donde el rival pueda <b>capturar</b>. ¡Vamos a jugar una partida!' },
    ] },
    fr: { name: 'Scarabijou', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche un trou qui brille', nope: 'Tu ne peux pas choisir ce trou pour l’instant', cap: 'Capture !', extra: 'Tour en plus !', you: 'Toi', opp: 'Adversaire', win: 'Gagné !',
      wrong: { extra: 'Depuis ce trou, la dernière graine ne tombe pas pile dans ton grenier. Regarde les nombres à côté des trous !', capq: 'Hmm, ce trou ne capture rien. Compte où s’arrête la dernière graine !' }, s: [
      { say: 'Coucou, moi c’est <b>Scarabijou</b> ! J’adore garder des graines-bijoux dans le creux de mon dos. Le <b>mancala</b> fait partie des <b>jeux de semailles</b>, joués en Afrique et au Moyen-Orient depuis des milliers d’années. Apprenons-le en jouant !' },
      { say: 'Le plateau a <b>deux rangées de six petits trous</b> et un <b>grand grenier</b> à chaque bout. Les six trous qui brillent et le grenier qui brille sont <b>à toi</b>. Chaque trou commence avec <b>4 graines</b> (tu peux aussi choisir 6), et <b>celui qui a le plus de graines dans son grenier gagne</b> !' },
      { say: 'Choisis un de tes trous : tu <b>prends toutes ses graines</b> et tu les déposes <b>une par une</b> dans les trous suivants, dans le <b>sens antihoraire</b> (suis les flèches). Touche un trou qui brille !', done: 'Plic, ploc ! Une graine dans chaque trou, dans l’ordre. Ça, c’est <b>semer</b>.' },
      { say: 'Quand tu passes devant <b>ton grenier</b>, tu y mets aussi une graine. Mais le <b>grenier adverse</b> (celui qui brille en rouge) est <b>sauté</b>. Touche le trou plein de graines et sème tout le tour !', done: 'Une graine dans ton grenier, un petit saut par-dessus le sien, et retour dans ta rangée !' },
      { say: 'Si ta <b>dernière graine</b> tombe pile dans ton grenier, tu as <b>un tour en plus</b> ! Trouve le trou dont le nombre de graines <b>égale sa distance</b> au grenier. Les nombres à côté des trous t’aident.', done: 'En plein dans le mille ! Tu <b>rejoues</b>. En jouant d’abord les trous les plus proches du grenier, on peut enchaîner plusieurs tours.' },
      { say: 'Place à la <b>capture</b> ! Si ta dernière graine tombe dans un <b>trou vide de ton côté</b>, tu prends <b>les graines du trou d’en face</b> et cette <b>dernière graine</b>, direction ton grenier. Touche le trou qui brille !', done: 'Capturé ! Cinq graines d’en face plus ta dernière : <b>six</b> d’un coup !' },
      { say: 'Encore une ! Quel trou te donne une <b>capture</b> ici ? Cherche celui dont la dernière graine s’arrête dans un <b>trou vide</b> de ton côté, avec des graines en face.', done: 'Exactement ! Quatre plus une, tout pour toi. Si le trou d’en face est vide, pas de capture : attention.' },
      { say: 'Dès que les <b>six trous</b> d’un joueur sont <b>vides</b>, la partie est <b>finie</b>. Les graines qui restent vont dans le grenier du propriétaire de la rangée. Sème ta dernière graine pour terminer !', done: 'Ta rangée est vide : fin de partie ! Ses graines restantes vont dans son grenier. On compte… <b>25 à 23</b>, tu gagnes !' },
      { say: 'Le mancala a en fait <b>plein de règles</b> à travers le monde. Ici, on joue la plus populaire, le <b>Kalah</b>. Dans le jeu complet, tu peux aussi choisir <b>Facile</b> (sans capture), <b>Normale</b> (on ne prend que les graines adverses) ou <b>Sunka</b> (semis en relais). Il existe aussi des cousins comme l’<b>awalé</b> d’Afrique !' },
      { say: 'Tu connais toutes les règles ! Astuces : vise le trou qui tombe <b>pile dans ton grenier</b> pour rejouer, et ne laisse pas de trou vide où l’adversaire pourrait <b>capturer</b>. Allez, une vraie partie !' },
    ] },
    pt: { name: 'Besourojoia', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar', again: 'De novo', tap: 'Toque numa casa brilhante', nope: 'Não dá para escolher essa casa agora', cap: 'Captura!', extra: 'Jogada extra!', you: 'Você', opp: 'Rival', win: 'Você venceu!',
      wrong: { extra: 'Dessa casa, a última semente não cai certinho no seu depósito. Veja os números ao lado das casas!', capq: 'Hmm, essa casa não captura. Conte onde a última semente para!' }, s: [
      { say: 'Oi, eu sou o <b>Besourojoia</b>! Adoro guardar sementes de joia no buraquinho das minhas costas. O <b>mancala</b> é da família dos <b>jogos de semeadura</b>, jogados na África e no Oriente Médio há milhares de anos. Vamos aprender jogando!' },
      { say: 'O tabuleiro tem <b>duas fileiras de seis casinhas</b> e um <b>grande depósito</b> em cada ponta. As seis casas brilhantes e o depósito brilhante são <b>seus</b>. Cada casa começa com <b>4 sementes</b> (dá para escolher 6 também), e <b>vence quem juntar mais sementes no depósito</b>!' },
      { say: 'Escolha uma das suas casas: você <b>pega todas as sementes</b> e vai soltando <b>uma por uma</b> nas casas seguintes, no <b>sentido anti-horário</b> (siga as setas). Toque numa casa brilhante!', done: 'Plim, plom! Uma semente em cada casa, em ordem. Isso é <b>semear</b>.' },
      { say: 'Ao passar pelo <b>seu depósito</b>, coloque uma semente nele também. Mas o <b>depósito do rival</b> (o que brilha em vermelho) é <b>pulado</b>. Toque na casa com muitas sementes e semeie dando a volta toda!', done: 'Uma semente no seu depósito, um pulinho por cima do dele, e de volta à sua fileira!' },
      { say: 'Se a <b>última semente</b> cair certinho no seu depósito, você ganha <b>outra jogada</b>! Procure a casa cujo número de sementes <b>é igual à distância</b> até o depósito. Os números ao lado das casas ajudam.', done: 'Na mosca! Você <b>joga de novo</b>. Usando primeiro as casas mais perto do depósito, dá até para emendar várias jogadas.' },
      { say: 'Agora uma <b>captura</b>! Se a última semente cair numa <b>casa vazia do seu lado</b>, você leva <b>as sementes da casa em frente</b> e essa <b>última semente</b> direto para o depósito. Toque na casa brilhante!', done: 'Capturou! Cinco sementes da frente mais a sua última: <b>seis</b> de uma vez!' },
      { say: 'Mais uma! Qual casa dá uma <b>captura</b> aqui? Procure aquela cuja última semente para numa <b>casa vazia</b> do seu lado, com sementes em frente.', done: 'Isso mesmo! Quatro mais uma, tudo seu. Se a casa da frente estiver vazia, não há captura, cuidado.' },
      { say: 'Quando as <b>seis casas</b> de qualquer jogador ficam <b>vazias</b>, o jogo <b>acaba</b>. As sementes que sobrarem vão para o depósito do dono daquela fileira. Semeie a última semente e termine o jogo!', done: 'Sua fileira esvaziou: fim de jogo! As sementes que sobraram vão para o depósito dele. Contando… <b>25 a 23</b>, você venceu!' },
      { say: 'Na verdade, o mancala tem <b>muitas regras</b> pelo mundo. Aqui jogamos a mais popular, o <b>Kalah</b>. No jogo completo você também pode escolher <b>Fácil</b> (sem capturas), <b>Normal</b> (só leva as sementes do rival) ou <b>Sunka</b> (semeadura em revezamento). E há primos como o <b>Oware</b>, da África!' },
      { say: 'Pronto, você já sabe as regras! Dicas: mire na casa que cai <b>certinho no depósito</b> para jogar de novo, e não deixe casas vazias onde o rival possa <b>capturar</b>. Vamos jogar uma partida!' },
    ] },
    de: { name: 'Juwelkäfer', next: 'Weiter', back: 'Zurück', start: 'Los geht’s', again: 'Nochmal', tap: 'Tippe auf eine leuchtende Mulde', nope: 'Diese Mulde kannst du gerade nicht wählen', cap: 'Gefangen!', extra: 'Extrazug!', you: 'Du', opp: 'Gegner', win: 'Gewonnen!',
      wrong: { extra: 'Von dieser Mulde landet der letzte Samen nicht genau in deinem Speicher. Schau auf die Zahlen neben den Mulden!', capq: 'Hmm, mit dieser Mulde fängst du nichts. Zähl nach, wo der letzte Samen liegen bleibt!' }, s: [
      { say: 'Hallo, ich bin der <b>Juwelkäfer</b>! Ich sammle so gern Edelstein-Samen in der Mulde auf meinem Rücken. <b>Mancala</b> gehört zu den <b>Säspielen</b>, die man in Afrika und im Nahen Osten seit Jahrtausenden spielt. Lernen wir es zusammen beim Spielen!' },
      { say: 'Das Brett hat <b>zwei Reihen mit je sechs Mulden</b> und an jedem Ende einen <b>großen Speicher</b>. Die sechs leuchtenden Mulden und der leuchtende Speicher gehören <b>dir</b>. In jeder Mulde liegen am Anfang <b>4 Samen</b> (6 gehen auch), und <b>wer die meisten Samen im Speicher hat, gewinnt</b>!' },
      { say: 'Wähle eine deiner Mulden: Du <b>nimmst alle Samen heraus</b> und legst sie <b>einzeln</b> in die nächsten Mulden, <b>gegen den Uhrzeigersinn</b> (den Pfeilen nach). Tippe auf eine leuchtende Mulde!', done: 'Plipp, plopp! Ein Samen in jede Mulde, schön der Reihe nach. Das ist <b>Säen</b>.' },
      { say: 'Kommst du beim Säen an <b>deinem Speicher</b> vorbei, legst du auch dort einen Samen hinein. Der <b>Speicher des Gegners</b> (rot leuchtend) wird aber <b>übersprungen</b>. Tippe auf die Mulde mit vielen Samen und säe einmal rundherum!', done: 'Ein Samen in deinen Speicher, ein kleiner Hüpfer über seinen, und zurück in deine Reihe!' },
      { say: 'Landet dein <b>letzter Samen</b> genau in deinem Speicher, bekommst du einen <b>Extrazug</b>! Such die Mulde, deren Samenzahl <b>genau ihrem Abstand</b> zum Speicher entspricht. Die Zahlen neben den Mulden helfen dir.', done: 'Volltreffer! Du darfst <b>noch einmal</b>. Wer zuerst die Mulden nah am Speicher spielt, schafft manchmal mehrere Extrazüge hintereinander.' },
      { say: 'Jetzt wird <b>gefangen</b>! Landet dein letzter Samen in einer <b>leeren Mulde auf deiner Seite</b>, holst du <b>die Samen aus der Mulde gegenüber</b> und diesen <b>letzten Samen</b> direkt in deinen Speicher. Tippe auf die leuchtende Mulde!', done: 'Erwischt! Fünf Samen von gegenüber plus dein letzter: <b>sechs</b> auf einmal!' },
      { say: 'Noch eine! Mit welcher Mulde kannst du hier <b>fangen</b>? Such die, deren letzter Samen in einer <b>leeren Mulde</b> auf deiner Seite liegen bleibt, mit Samen gegenüber.', done: 'Genau richtig! Vier plus einer, alle für dich. Ist die Mulde gegenüber leer, wird nichts gefangen, pass auf.' },
      { say: 'Sind die <b>sechs Mulden</b> eines Spielers <b>alle leer</b>, ist das Spiel <b>vorbei</b>. Übrige Samen kommen in den Speicher dessen, in dessen Reihe sie liegen. Säe deinen letzten Samen und beende die Partie!', done: 'Deine Reihe ist leer, Spielende! Seine restlichen Samen kommen in seinen Speicher. Gezählt wird… <b>25 zu 23</b>, du gewinnst!' },
      { say: 'Mancala hat übrigens <b>ganz viele Regelvarianten</b> auf der Welt. Hier spielen wir die beliebteste, <b>Kalah</b>. Im vollen Spiel kannst du auch <b>Einfach</b> (ohne Fangen), <b>Normal</b> (nur die gegnerischen Samen) oder <b>Sunka</b> (Staffel-Säen) wählen. Und es gibt Verwandte wie <b>Oware</b> aus Afrika!' },
      { say: 'Jetzt kennst du alle Regeln! Tipps: Ziel auf die Mulde, die <b>genau im Speicher</b> landet, für einen Extrazug, und lass keine leeren Mulden, in denen der Gegner <b>fangen</b> kann. Los, eine echte Partie!' },
    ] },
    hi: { name: 'रत्नू भौंरा', next: 'आगे', back: 'पीछे', start: 'खेलें!', again: 'फिर से', tap: 'चमकते गड्ढे पर टैप करें', nope: 'यह गड्ढा अभी नहीं चुन सकते', cap: 'पकड़!', extra: 'अतिरिक्त चाल!', you: 'आप', opp: 'विरोधी', win: 'आप जीते!',
      wrong: { extra: 'इस गड्ढे से आखिरी बीज ठीक भंडार में नहीं गिरेगा। गड्ढों के पास लिखी संख्याएँ देखो!', capq: 'हम्म, इस गड्ढे से पकड़ नहीं होगी। गिनो कि आखिरी बीज कहाँ रुकता है!' }, s: [
      { say: 'नमस्ते, मैं हूँ <b>रत्नू भौंरा</b>! मुझे अपनी पीठ के गड्ढे में रत्न-बीज जमा करना बहुत पसंद है। <b>मनकाला</b> उन <b>बुवाई वाले खेलों</b> में से है जो अफ़्रीका और मध्य-पूर्व में हज़ारों साल से खेले जा रहे हैं। चलो, खेलते-खेलते सीखें!' },
      { say: 'बोर्ड पर <b>छह-छह छोटे गड्ढों की दो पंक्तियाँ</b> हैं और दोनों सिरों पर एक-एक <b>बड़ा भंडार</b>। चमकते छह गड्ढे और चमकता भंडार <b>आपके</b> हैं। शुरू में हर गड्ढे में <b>4 बीज</b> होते हैं (6 भी चुन सकते हो), और <b>जिसके भंडार में सबसे ज़्यादा बीज हों, वही जीतता है</b>!' },
      { say: 'अपना एक गड्ढा चुनो: उसके <b>सारे बीज उठाओ</b> और अगले गड्ढों में <b>एक-एक करके</b> डालो, <b>घड़ी की उल्टी दिशा</b> में (तीरों के साथ)। कोई भी चमकता गड्ढा टैप करो!', done: 'टप, टप…! हर गड्ढे में एक-एक बीज, बारी-बारी से। यही है <b>बुवाई</b>।' },
      { say: 'बोते समय <b>अपने भंडार</b> से गुज़रो तो उसमें भी एक बीज डालो। पर <b>विरोधी का भंडार</b> (लाल चमक वाला) <b>छोड़ दिया जाता है</b>। ज़्यादा बीजों वाला गड्ढा टैप करो और पूरा चक्कर लगाकर बोओ!', done: 'अपने भंडार में एक बीज, उसके भंडार के ऊपर से छलाँग, और फिर अपनी पंक्ति तक वापस!' },
      { say: 'अगर <b>आखिरी बीज</b> ठीक आपके भंडार में गिरे, तो <b>एक और चाल</b> मिलती है! वह गड्ढा ढूँढो जिसमें बीजों की गिनती भंडार तक की <b>दूरी के बराबर</b> हो। गड्ढों के पास की संख्याएँ मदद करेंगी।', done: 'एकदम निशाने पर! आप <b>फिर से चल सकते हो</b>। भंडार के पास वाले गड्ढे पहले चलाओ तो कई बार लगातार चाल मिल सकती है।' },
      { say: 'अब <b>पकड़</b>! अगर आखिरी बीज <b>आपकी तरफ़ के खाली गड्ढे</b> में रुके, तो <b>सामने वाले गड्ढे के बीज</b> और वह <b>आखिरी बीज</b>, दोनों सीधे आपके भंडार में। चमकता गड्ढा टैप करो!', done: 'पकड़ लिया! सामने के 5 बीज और आपका आखिरी 1: एक बार में <b>6</b>!' },
      { say: 'एक और! यहाँ किस गड्ढे से <b>पकड़</b> होगी? वह ढूँढो जिसका आखिरी बीज आपकी तरफ़ के <b>खाली गड्ढे</b> में रुके और सामने बीज हों।', done: 'बिल्कुल सही! 4 और 1, सब आपके। सामने का गड्ढा खाली हो तो पकड़ नहीं होती, ध्यान रखना।' },
      { say: 'जब किसी भी खिलाड़ी के <b>छहों गड्ढे खाली</b> हो जाएँ, खेल <b>ख़त्म</b>। बचे हुए बीज उस पंक्ति के मालिक के भंडार में जाते हैं। आखिरी बीज बोकर खेल पूरा करो!', done: 'आपकी पंक्ति खाली, खेल ख़त्म! उसके बचे बीज उसके भंडार में। गिनती… <b>25 बनाम 23</b>, आप जीत गए!' },
      { say: 'दरअसल दुनिया भर में मनकाला के <b>बहुत सारे नियम</b> हैं। यहाँ हम सबसे लोकप्रिय <b>कलाह</b> खेलते हैं। पूरे खेल में आप <b>आसान</b> (बिना पकड़), <b>नॉर्मल</b> (सिर्फ़ विरोधी के बीज) या <b>सुंका</b> (रिले बुवाई) भी चुन सकते हो। अफ़्रीका का <b>ओवारे</b> जैसे रिश्तेदार भी हैं!' },
      { say: 'अब सारे नियम पक्के! तरकीब: एक और चाल के लिए वह गड्ढा चुनो जो <b>ठीक भंडार में</b> गिरे, और ऐसे खाली गड्ढे मत छोड़ो जहाँ विरोधी <b>पकड़</b> कर सके। चलो, एक असली बाज़ी खेलें!' },
    ] },
    ar: { name: 'خنفوس الجواهر', next: 'التالي', back: 'رجوع', start: 'هيا نلعب', again: 'مرة أخرى', tap: 'انقر على حفرة مضيئة', nope: 'لا يمكنك اختيار هذه الحفرة الآن', cap: 'أسر!', extra: 'دور إضافي!', you: 'أنت', opp: 'الخصم', win: 'فزت!',
      wrong: { extra: 'من هذه الحفرة لن تسقط البذرة الأخيرة في مخزنك تمامًا. انظر إلى الأرقام بجانب الحفر!', capq: 'همم، هذه الحفرة لا تأسر شيئًا. عُدّ أين تتوقف البذرة الأخيرة!' }, s: [
      { say: 'مرحبًا، أنا <b>خنفوس الجواهر</b>! أحب جمع بذور الجواهر في التجويف الذي على ظهري. <b>المنقلة</b> من عائلة <b>ألعاب البذر</b> التي تُلعب في أفريقيا والشرق الأوسط منذ آلاف السنين. هيا نتعلمها ونحن نلعب!' },
      { say: 'على اللوحة <b>صفّان في كل منهما ست حفر صغيرة</b>، وفي كل طرف <b>مخزن كبير</b>. الحفر الست المضيئة والمخزن المضيء <b>لك</b>. في البداية في كل حفرة <b>4 بذور</b> (ويمكنك اختيار 6)، و<b>يفوز من يجمع أكثر البذور في مخزنه</b>!' },
      { say: 'اختر إحدى حفرك: <b>تأخذ كل بذورها</b> وتضعها <b>واحدة واحدة</b> في الحفر التالية، <b>عكس اتجاه عقارب الساعة</b> (اتبع الأسهم). انقر على أي حفرة مضيئة!', done: 'طق، طق…! بذرة في كل حفرة بالترتيب. هذا هو <b>البذر</b>.' },
      { say: 'إذا مررت <b>بمخزنك</b> أثناء البذر فضع فيه بذرة أيضًا. لكن <b>مخزن الخصم</b> (المضيء بالأحمر) <b>يُتخطّى</b>. انقر على الحفرة الممتلئة بالبذور وابذر دورة كاملة!', done: 'بذرة في مخزنك، وقفزة صغيرة فوق مخزنه، ثم عودة إلى صفّك!' },
      { say: 'إذا سقطت <b>البذرة الأخيرة</b> في مخزنك تمامًا، تحصل على <b>دور إضافي</b>! ابحث عن الحفرة التي <b>يساوي عدد بذورها مسافتها</b> إلى المخزن. الأرقام بجانب الحفر ستساعدك.', done: 'في الهدف تمامًا! يمكنك <b>اللعب مرة أخرى</b>. إذا بدأت بالحفر القريبة من المخزن فقد تحصل على عدة أدوار متتالية.' },
      { say: 'والآن <b>الأسر</b>! إذا توقفت بذرتك الأخيرة في <b>حفرة فارغة في جهتك</b>، تأخذ <b>بذور الحفرة المقابلة</b> مع تلك <b>البذرة الأخيرة</b> إلى مخزنك مباشرة. انقر على الحفرة المضيئة!', done: 'أسرتها! خمس بذور من الجهة المقابلة وبذرتك الأخيرة: <b>ست</b> دفعة واحدة!' },
      { say: 'سؤال آخر! أي حفرة تمنحك <b>أسرًا</b> هنا؟ ابحث عن التي تتوقف بذرتها الأخيرة في <b>حفرة فارغة</b> في جهتك وأمامها بذور.', done: 'إجابة صحيحة! أربع وواحدة، كلها لك. إذا كانت الحفرة المقابلة فارغة فلا أسر، انتبه.' },
      { say: 'عندما تصبح <b>الحفر الست</b> لأي لاعب <b>فارغة كلها</b>، <b>تنتهي</b> المباراة. البذور الباقية تذهب إلى مخزن صاحب الصف الذي هي فيه. ابذر بذرتك الأخيرة وأنهِ المباراة!', done: 'صفّك فارغ، انتهت المباراة! بذوره الباقية تذهب إلى مخزنه. لنعدّ… <b>25 مقابل 23</b>، فزت!' },
      { say: 'في الحقيقة للمنقلة <b>قواعد كثيرة</b> حول العالم. هنا نلعب أشهرها، <b>كالاه</b>. في اللعبة الكاملة يمكنك أيضًا اختيار <b>سهلة</b> (بلا أسر) أو <b>عادية</b> (تأخذ بذور الخصم فقط) أو <b>سونكا</b> (البذر بالتتابع). ولها أقارب مثل <b>الأواري</b> من أفريقيا!' },
      { say: 'أصبحت تعرف كل القواعد! نصائح: اختر الحفرة التي تسقط <b>تمامًا في مخزنك</b> لتحصل على دور إضافي، ولا تترك حفرًا فارغة يستطيع الخصم <b>الأسر</b> فيها. هيا نلعب مباراة حقيقية!' },
    ] },
  };

  /* ---------- little sounds: a chime when a task is solved, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const chime = () => [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0, .45, .08, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    const boop = () => tone(320, 200, .14, .08, 'triangle');
    return { chime, blip, boop, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, MC = T3.mancala, G = MC.G, TOP = G.TOP, L = TXT[ctx.lang] || TXT.en;
    const K = window.Atlas3D.mancala.kit(T3, 0), board = K.board;
    T3.show('mancala', board); T3.play(true);
    if (T3.fit) T3.fit(K.tall ? { w: 6.4, d: 13.4, y: TOP, pitch: 1.5, roll: true } : { w: 12.2, d: 5.8, y: TOP, pitch: 1.05 });   // (the table game's framing)
    const marks = new TH.Group(); board.add(marks);
    let E = null, b = INIT, step = 0, stopped = false, busy = false, played = false, tok = 0, timers = [];
    let hold = false;   // (tests: no auto-advance)
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));

    /* ---------- marks: glowing rings round pits / stores, the sowing arrows ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const mat = (color, op = .9) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function ringAt(i, color) {   // a glowing ring round a pit, or round a store (a stadium)
      const [x, z, Ls, r] = K.hollow(i), R = r + .085;
      let m;
      if (!Ls) { const g = new TH.TorusGeometry(R, .034, 8, 44); g.rotateX(Math.PI / 2); m = new TH.Mesh(g, mat(color)); m.position.set(x, TOP - .004, z); }
      else {
        const pts = [], n = 48, per = 2 * Math.PI * R + 4 * Ls;
        for (let k = 0; k < n; k++) {
          let s = k / n * per; const arc = Math.PI * R;
          if (s < arc) { const a = Math.PI + s / R; pts.push(new TH.Vector3(x + Math.cos(a) * R, 0, z - Ls + Math.sin(a) * R)); continue; } s -= arc;
          if (s < 2 * Ls) { pts.push(new TH.Vector3(x + R, 0, z - Ls + s)); continue; } s -= 2 * Ls;
          if (s < arc) { const a = s / R; pts.push(new TH.Vector3(x + Math.cos(a) * R, 0, z + Ls + Math.sin(a) * R)); continue; } s -= arc;
          pts.push(new TH.Vector3(x - R, 0, z + Ls - s));
        }
        m = new TH.Mesh(new TH.TubeGeometry(new TH.CatmullRomCurve3(pts, true), 64, .034, 6, true), mat(color)); m.position.y = TOP - .004;
      }
      m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m;
    }
    // little arrowheads along the sowing path: your row → your store → their row → (their store is hopped) → your row
    function arrows() {
      const path = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0];
      for (let k = 0; k < path.length - 1; k++) {
        const [x0, z0] = K.hollow(path[k]), [x1, z1] = K.hollow(path[k + 1]);
        const sh = new TH.Shape(); sh.moveTo(.13, 0); sh.lineTo(-.09, .1); sh.lineTo(-.04, 0); sh.lineTo(-.09, -.1); sh.closePath();
        const g = new TH.ShapeGeometry(sh); g.rotateX(-Math.PI / 2);
        const m = new TH.Mesh(g, mat(0xfff0c0, .85));
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
        m.position.set(mx, TOP + .01, mz); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
        m.userData.pulse = true; m.userData.flat = true; m.renderOrder = 3; marks.add(m);
      }
    }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; const s = m.userData.flat ? .9 + k * .25 : .97 + k * .06; m.scale.set(s, 1, s); m.material.opacity = .4 + k * .55; } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();
    const okPits = st => st.all ? [0, 1, 2, 3, 4, 5].filter(i => b[i] > 0) : (st.ok || []);
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.mine) { for (let i = 0; i < 6; i++) ringAt(i, 0xffd36b); ringAt(6, 0xffd36b); }
      if (st.arrows) arrows();
      if (st.skip) ringAt(13, 0xff5d5d);
      if (st.act && !played) okPits(st).forEach(i => ringAt(i, 0xffd36b));
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・〜~]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const tip = h => { $('.cnt').innerHTML = `<span class="tag">${h}</span>`; };
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
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; tok++;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      while (K.hand.children.length) K.hand.remove(K.hand.children[0]);   // (gems still in the hand of a move that was cut short)
      K.capRings.forEach(m => { m.visible = false; });
      b = Int8Array.from(st.b); K.rebuild(b);
      later(showTask, 260);
      say(L.s[step].say); buttons();
    }
    function score() {   // the two stores, counted up
      $('.cnt').innerHTML = `<span class="sc">${L.you} <b data-n="${b[6]}">0</b></span><span class="vs">:</span><span class="sc"><b data-n="${b[13]}">0</b> ${L.opp}</span>`;
      $('.cnt').querySelectorAll('b').forEach(x => { const N = +x.dataset.n, t0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, (now - t0) / 900); x.textContent = Math.round(N * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(s); })(t0); });
    }
    function finish() {
      played = true; busy = false; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'end') score();
      buttons(); autoNext();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30) + (STEPS[step].act === 'end' ? 600 : 0); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last && !hold) go(step + 1); }, ms); }
    async function sow(i) {
      busy = true; clearMarks(); const my = ++tok, s0 = step;
      const tr = E.trace(b, 0, i, 'kalah');
      await K.animate(tr, b, () => my === tok && !stopped, { cap: n => tip('✨ ' + L.cap + ' +' + n), extra: () => tip('⭐ ' + L.extra) });
      if (stopped || my !== tok || step !== s0) return;
      b = Int8Array.from(tr.board); for (let k = 0; k < 14; k++) K.setCount(k, b[k]);
      finish();
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = K.pitAt(e, 0); if (i < 0) return;
      if (!b[i]) { say(L.nope); SFX.boop(); return; }
      if (!okPits(st).includes(i) || (st.all && !st.ok.includes(i))) { say((L.wrong && L.wrong[st.act]) || L.nope); SFX.boop(); return; }
      sow(i);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>' : '<path d="M16 9l6 6M22 9l-6 6"/>'}</svg>`; };
    sfxBtn.onclick = () => { SFX.toggle(); paintSfx(); }; paintSfx();
    ctx.el.addEventListener('click', onClick);
    // pointer over one of your pits (mouse): the hand cursor
    const onMove = e => { if (e.pointerType && e.pointerType !== 'mouse') return; const st = STEPS[step], i = !busy && !played && st.act && E ? K.pitAt(e, 0) : -1; ctx.el.style.cursor = i >= 0 && b[i] ? 'pointer' : ''; };
    ctx.el.addEventListener('pointermove', onMove);
    // keyboard: Space / Enter / → next, ← back (an interactive step waits for the move)
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (document.activeElement && document.activeElement !== document.body && (e.key === 'Enter' || e.key === ' ')) document.activeElement.blur();
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (nx.disabled || (e.key === 'ArrowRight' && STEPS[step].last)) return; nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    K.rebuild(b);
    loadEngine().then(e => { if (stopped) return; E = e; later(() => go(0), 300); }).catch(() => say('⚠'));
    const dbg = { at: i => { const [x, z] = K.hollow(i); return T3.project(x, z, TOP); }, step: () => step, steps: STEPS.length, played: () => played, busy: () => busy, b: () => Array.from(b), go: n => go(n), hold: on => { hold = !!on; } };
    window.__mcRules = dbg;   // (test hook)
    return {
      stop() { stopped = true; tok++; if (window.__mcRules === dbg) delete window.__mcRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove); ctx.el.style.cursor = ''; document.removeEventListener('keydown', onKey, true); clearMarks(); K.stop(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.mancala = { start };
})();
