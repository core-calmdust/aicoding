/* =====================================================================
   Kōnane rules — a guided tour on the 3D table (the papamū board — the look chosen in the portal,
   atlas/models/konane.js, on the 6×6 board), told by the guide character (Checkrab).
   A short hands-on course: the full board, Black's first removal (centre or corner), White's
   removal next to the hole (shown), a jump that captures, a double jump, no turning in a
   multiple jump, stopping early, the last jump that leaves the opponent stuck, the board sizes.
   Every task is checked live by the game's own rules (../konane/engine.js); you play Black.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Squares in the game's notation ('c2': files a–f from the left, rank 1 at the bottom).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-crab.webp', ENG = '../konane/engine.js?v=5-ab-zf1-s1', N = 6;
  const loadEngine = () => window.KonaneEngine ? Promise.resolve(window.KonaneEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.KonaneEngine ? res(window.KonaneEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  const FULL = (() => { const o = { b: [], w: [] }; for (let r = 1; r <= N; r++) for (let c = 0; c < N; c++) o[(c + r - 1) % 2 === 0 ? 'b' : 'w'].push('abcdef'[c] + r); return o; })();
  const minus = (L, x) => L.filter(s => !x.includes(s));
  // b / w: Black's and White's stones; ply: 0 / 1 in the opening (else the capturing phase); act: what the task accepts;
  // glow: soft gold squares; target: the green goal squares; path: blue dots on the way; demo: a removal shown by itself
  const STEPS = [
    { b: FULL.b, w: FULL.w, ply: 0 },
    { b: FULL.b, w: FULL.w, ply: 0, glow: ['a1', 'c3', 'd4', 'f6'] },
    { b: FULL.b, w: FULL.w, ply: 0, act: 'rm' },
    { b: minus(FULL.b, ['c3']), w: FULL.w, ply: 1, demo: 'd3', glow: ['c3'] },
    { b: ['b3', 'e5'], w: ['c3', 'e4', 'a5'], act: 'jump', target: ['d3'] },
    { b: ['a2', 'f6'], w: ['b2', 'd2', 'e6', 'a4'], act: 'double', target: ['e2'], path: ['a2', 'c2', 'e2'] },
    { b: ['b1'], w: ['b2', 'c3', 'b4', 'e5', 'f2'], act: 'straight', target: ['b5'], path: ['b1', 'b3', 'b5'] },
    { b: ['a3', 'e6'], w: ['b3', 'd3', 'f4', 'c6'], act: 'stop', target: ['c3'] },
    { b: ['b4', 'c3', 'f1'], w: ['a5', 'b5', 'c4'], act: 'win' },
    { b: FULL.b, w: FULL.w, ply: 0, last: true },
  ];

  const TXT = {
    ja: { name: 'チェッカニ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは跳べないよ〜', stuck: 'その石は今は跳べないよ', own: '黒い石をタップしてね', rmNg: 'その石は取り除けないよ。光っている石から選んでね', want: '今回はお題の跳び方をさがしてね', wantWin: 'それだと白はまだ跳べちゃう。もう一回！', win: '🏆 勝ち！', s: [
      { say: 'アロハ〜！ ぼくは<b>チェッカニ</b>。今日はハワイの浜辺で生まれた<b>コナネ</b>を、盤「<b>パパムー</b>」で覚えよう！ 練習は小さめの6×6の盤でいくよ。' },
      { say: '盤は<b>すべてのマスに黒と白の石が交互に</b>びっしり。左下のa1は黒で、<b>黒が先手</b>だよ。光っているのは中央の4マスと四隅。最初の一手で使うマスなんだ。' },
      { say: '最初の1手は<b>取り除くだけ</b>！ 黒は<b>中央か四隅</b>にある自分の石を1つ取って、盤に穴をあけるよ。光っている黒い石を1つタップしてみて！', done: 'ぽこっ！ 穴があいたね。これで跳び合いの準備ができたよ。' },
      { say: '次は白の番。白は<b>穴のすぐ隣（たて・よこ）</b>の自分の石を1つ取り除くよ。見ててね…', done: 'ほら、空きが2つ並んだ！ ここからは<b>跳んで取る</b>ゲームのはじまりだ。' },
      { say: '自分の石で、<b>たて・よこのとなりの相手の石を跳び越えて</b>、すぐ向こうの空きマスへ。跳び越えた石は<b>取れる</b>よ！ ななめはダメ。黒で白を跳び越えて、光っているマスへ！', done: 'ぴょん、ぱくっ！ 1つ取れたね。コナネでは<b>毎回かならず取る</b>んだ。' },
      { say: '跳んだ先の向こうにまた相手の石と空きがあったら、<b>同じ向きなら続けて跳べる</b>よ（<b>連続ジャンプ</b>）！ a2の石で、光っているマスまで一気に2つ取ってみて！', done: 'ぴょんぴょーん！ 1手で2つも取れたね。' },
      { say: 'でも連続ジャンプは<b>まっすぐだけ</b>。途中で曲がるのは禁止だよ。b3で右に曲がりたくなるけど、ガマン！ b1の石で、上へまっすぐ2つ取ってみて！', done: 'そう、まっすぐ！ 曲がらなければどこまでも続けられるよ。' },
      { say: '連続ジャンプは<b>途中で止まってもいい</b>んだ。たくさん取るほど良いとは限らないよ。a3の石で、<b>1つだけ</b>取って止まってみて！', done: 'ナイス判断！ どこで止まるかを選ぶのが、コナネの腕の見せどころなんだ。' },
      { say: '最後にいちばん大事なこと。<b>自分の番に跳べる手がなくなったら負け</b>！ 取った数は関係なくて、<b>最後に跳んだ人の勝ち</b>なんだ。白が二度と跳べなくなる手を見つけて！', done: '白はもう跳べない…きみの勝ち！ 相手の跳べる手を減らして、自分の手を残す。それがコツだよ。' },
      { say: '対局では<b>8×8</b>が標準。短い<b>6×6</b>、長い<b>10×10</b>も選べるよ。引き分けはないから、最後の一跳びまで気をぬかないでね。さあ、遊んでみよう〜！' },
    ] },
    en: { name: 'Checkrab', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't land there!", stuck: "That stone can't jump right now", own: 'Tap a black stone', rmNg: "That stone can't be lifted. Pick one of the glowing stones", want: "This time, find the jump I asked for", wantWin: "White could still jump after that. Try again!", win: '🏆 You win!', s: [
      { say: "Aloha! I'm <b>Checkrab</b>. Today let's learn <b>kōnane</b>, born on the beaches of Hawaiʻi, on a <b>papamū</b>, the kōnane board! We'll practise on a small 6×6 board." },
      { say: 'The board starts with <b>black and white stones in turn on every square</b>. a1, bottom left, is black, and <b>Black moves first</b>. The glowing squares are the four in the centre and the corners — the first move uses them.' },
      { say: 'The first move only <b>lifts a stone off</b>! Black takes one of its own stones from <b>the centre or a corner</b> to open a hole. Tap one of the glowing black stones!', done: 'Pop! A hole. Now the board is ready for jumping.' },
      { say: "Now it's White's turn. White lifts one of its stones <b>right next to the hole</b> (up, down, left or right). Watch…", done: 'See? Two empty squares side by side. From here on, the game is <b>jumping to capture</b>.' },
      { say: 'Jump <b>an enemy stone next to yours, up, down or sideways</b>, onto the empty square just beyond it — and the stone you jumped is <b>captured</b>! No diagonals. Jump a white stone with a black one onto the glowing square!', done: 'Hop — gotcha! In kōnane, <b>every move captures</b>.' },
      { say: 'If there is another enemy stone and an empty square beyond where you land, you can <b>keep jumping in the same direction</b> (a <b>multiple jump</b>)! Take two at once with the stone on a2, all the way to the glowing square!', done: 'Hop, hop! Two stones in one move.' },
      { say: "But a multiple jump goes <b>only straight</b> — no turning on the way. You might want to turn right at b3, but don't! Take two straight up with the stone on b1!", done: "That's it — straight! As long as you don't turn, you can keep going." },
      { say: 'You may also <b>stop partway</b> through a multiple jump. Taking more is not always better! With the stone on a3, take <b>just one</b> and stop.', done: 'Good call! Choosing where to stop is the real skill in kōnane.' },
      { say: 'And the most important rule: <b>if you have no jump on your turn, you lose</b>! Captures don\'t count — <b>the last player to jump wins</b>. Find the move that leaves White with no jump at all!', done: 'White can\'t jump any more — you win! Cut your opponent\'s jumps and keep some of your own: that\'s the trick.' },
      { say: 'In games, <b>8×8</b> is the standard; you can also pick a short <b>6×6</b> or a long <b>10×10</b>. There are no draws, so stay sharp until the very last jump. Now, let\'s play!' },
    ] },
    zh: { name: '跳棋蟹', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里跳不过去哦～', stuck: '这枚子现在跳不了哦', own: '请点击黑色的子', rmNg: '这枚子不能取下，请从发光的子里选', want: '这次请找出题目要的跳法', wantWin: '这样白方还能跳哦，再试一次！', win: '🏆 赢了！', s: [
      { say: 'Aloha～！我是<b>跳棋蟹</b>。今天在棋盘“<b>帕帕穆</b>”上，一起学夏威夷海边诞生的<b>科纳内</b>吧！先用小一点的6×6棋盘练习。' },
      { say: '开局时<b>每一格都交替摆满黑白棋子</b>。左下角a1是黑子，<b>黑方先走</b>。发光的是中央4格和四个角，第一步就要用到它们。' },
      { say: '第一步<b>只是取下一子</b>！黑方从<b>中央或四角</b>取下一枚自己的子，在棋盘上开一个洞。点一下发光的黑子吧！', desc: '', done: '啵！开了个洞。跳吃的准备完成啦。' },
      { say: '接着轮到白方。白方取下<b>紧挨洞口（上下左右）</b>的一枚白子。看好啦…', done: '你看，两个空格并排了！从这里开始就是<b>跳过去吃子</b>的游戏。' },
      { say: '用自己的子<b>跳过上下左右相邻的对方棋子</b>，落到正后方的空格，被跳过的子就<b>被吃掉</b>了！不能斜跳。用黑子跳过白子，落到发光的格子！', done: '一跳，吃掉！科纳内<b>每一步都必须吃子</b>。' },
      { say: '落点后面如果还有对方棋子和空格，<b>同一方向可以继续跳</b>（<b>连跳</b>）！用a2的子一口气吃两子，跳到发光的格子！', done: '跳跳～！一步吃了两子。' },
      { say: '不过连跳<b>只能直走</b>，中途不能拐弯。在b3会想往右拐，忍住！用b1的子向上直着吃两子！', done: '没错，直着走！只要不拐弯就能一直跳。' },
      { say: '连跳<b>也可以中途停下</b>。吃得越多不一定越好哦。用a3的子<b>只吃一子</b>就停下吧！', done: '判断得好！选择在哪里停，正是科纳内的本事。' },
      { say: '最后是最重要的规则：<b>轮到自己时跳不了就输</b>！和吃子多少无关，<b>最后跳的人赢</b>。找出让白方再也跳不了的一步！', done: '白方跳不了了……你赢了！减少对方的跳法、给自己留步，这就是诀窍。' },
      { say: '对局时标准是<b>8×8</b>，也能选短局<b>6×6</b>和长局<b>10×10</b>。没有和棋，最后一跳之前都别大意哦。来，开始玩吧～！' },
    ] },
    ko: { name: '체카니', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기로는 못 뛰어요~', stuck: '그 돌은 지금 뛸 수 없어요', own: '검은 돌을 탭해요', rmNg: '그 돌은 뺄 수 없어요. 빛나는 돌 중에서 골라요', want: '이번엔 문제에서 말한 점프를 찾아봐요', wantWin: '그러면 백이 아직 뛸 수 있어요. 다시 한번!', win: '🏆 승리!', s: [
      { say: '알로하~! 나는 <b>체카니</b>. 오늘은 하와이 바닷가에서 태어난 <b>코나네</b>를 판 「<b>파파무</b>」에서 배워 보자! 연습은 조금 작은 6×6 판으로 할게.' },
      { say: '판은 <b>모든 칸에 흑백 돌이 번갈아</b> 빽빽하게 놓여 있어. 왼쪽 아래 a1은 흑이고, <b>흑이 먼저</b> 둬. 빛나는 곳은 가운데 4칸과 네 구석. 첫 수에 쓰는 칸이야.' },
      { say: '첫 수는 <b>빼기만</b> 해! 흑은 <b>가운데나 네 구석</b>의 자기 돌을 하나 빼서 판에 구멍을 내. 빛나는 검은 돌 하나를 탭해 봐!', done: '퐁! 구멍이 생겼어. 이제 점프할 준비 완료.' },
      { say: '다음은 백 차례. 백은 <b>구멍 바로 옆(상하좌우)</b>의 자기 돌을 하나 빼. 잘 봐…', done: '봐, 빈칸 두 개가 나란히! 여기서부터 <b>뛰어넘어 잡는</b> 게임이 시작돼.' },
      { say: '내 돌로 <b>상하좌우로 이웃한 상대 돌을 뛰어넘어</b> 바로 너머 빈칸으로. 넘은 돌은 <b>잡혀</b>! 대각선은 안 돼. 검은 돌로 흰 돌을 뛰어넘어 빛나는 칸으로!', done: '폴짝, 냠! 하나 잡았어. 코나네에서는 <b>매번 반드시 잡아</b>.' },
      { say: '내려앉은 곳 너머에 또 상대 돌과 빈칸이 있으면 <b>같은 방향으로 계속 뛸 수 있어</b>(<b>연속 점프</b>)! a2의 돌로 빛나는 칸까지 한 번에 두 개 잡아 봐!', done: '폴짝폴짝! 한 수에 두 개나 잡았어.' },
      { say: '하지만 연속 점프는 <b>똑바로만</b>. 도중에 꺾는 건 금지야. b3에서 오른쪽으로 꺾고 싶겠지만 참아! b1의 돌로 위로 똑바로 두 개 잡아 봐!', done: '맞아, 똑바로! 꺾지 않으면 계속 갈 수 있어.' },
      { say: '연속 점프는 <b>도중에 멈춰도 돼</b>. 많이 잡는다고 좋은 건 아니야. a3의 돌로 <b>하나만</b> 잡고 멈춰 봐!', done: '좋은 판단! 어디서 멈출지 고르는 게 코나네의 실력이야.' },
      { say: '마지막으로 가장 중요한 것. <b>내 차례에 뛸 수가 없으면 패배</b>! 잡은 수와는 상관없이 <b>마지막에 뛴 사람이 이겨</b>. 백이 다시는 못 뛰게 되는 수를 찾아봐!', done: '백은 이제 못 뛰어… 네 승리! 상대의 점프를 줄이고 내 점프를 남기는 게 요령이야.' },
      { say: '대국에서는 <b>8×8</b>이 표준. 짧은 <b>6×6</b>, 긴 <b>10×10</b>도 고를 수 있어. 무승부가 없으니 마지막 점프까지 방심하지 마. 자, 놀아 보자~!' },
    ] },
    es: { name: 'Checkrab', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡Ahí no puede caer!', stuck: 'Esa piedra no puede saltar ahora', own: 'Toca una piedra negra', rmNg: 'Esa piedra no se puede retirar. Elige una de las que brillan', want: 'Esta vez, busca el salto que te pedí', wantWin: 'Así las blancas aún pueden saltar. ¡Otra vez!', win: '🏆 ¡Ganas!', s: [
      { say: '¡Aloha! Soy <b>Checkrab</b>. ¡Hoy aprendemos el <b>kōnane</b>, nacido en las playas de Hawái, en un <b>papamū</b>, su tablero! Practicaremos en un tablero pequeño de 6×6.' },
      { say: 'El tablero empieza con <b>piedras negras y blancas alternadas en todas las casillas</b>. a1, abajo a la izquierda, es negra, y <b>empiezan las negras</b>. Brillan las cuatro casillas centrales y las esquinas: la primera jugada las usa.' },
      { say: '¡La primera jugada solo <b>retira una piedra</b>! Las negras quitan una piedra suya del <b>centro o de una esquina</b> para abrir un hueco. ¡Toca una de las piedras negras que brillan!', done: '¡Pop! Un hueco. El tablero ya está listo para saltar.' },
      { say: 'Ahora juegan las blancas. Retiran una piedra suya <b>justo al lado del hueco</b> (arriba, abajo o a los lados). Mira…', done: '¿Ves? Dos casillas vacías juntas. Desde aquí el juego es <b>saltar para capturar</b>.' },
      { say: 'Salta <b>una piedra rival pegada a la tuya, en vertical u horizontal</b>, hasta la casilla vacía de detrás: ¡la piedra saltada queda <b>capturada</b>! Nada de diagonales. ¡Salta una blanca con una negra hasta la casilla que brilla!', done: '¡Salto y captura! En el kōnane <b>toda jugada captura</b>.' },
      { say: 'Si tras la casilla donde caes hay otra piedra rival y un hueco, puedes <b>seguir saltando en la misma dirección</b> (un <b>salto múltiple</b>). ¡Captura dos de una vez con la piedra de a2, hasta la casilla que brilla!', done: '¡Hop, hop! Dos piedras en una jugada.' },
      { say: 'Pero un salto múltiple va <b>solo en línea recta</b>: nada de girar. En b3 te dará ganas de girar a la derecha, ¡no lo hagas! ¡Captura dos hacia arriba en línea recta con la piedra de b1!', done: '¡Eso es, recto! Mientras no gires, puedes seguir.' },
      { say: 'También puedes <b>parar a medio camino</b> en un salto múltiple. ¡Capturar más no siempre es mejor! Con la piedra de a3, captura <b>solo una</b> y para.', done: '¡Buena decisión! Elegir dónde parar es el verdadero arte del kōnane.' },
      { say: 'Y la regla más importante: <b>si no tienes salto en tu turno, pierdes</b>. Las capturas no cuentan: <b>gana quien salta el último</b>. ¡Encuentra la jugada que deja a las blancas sin ningún salto!', done: 'Las blancas ya no pueden saltar: ¡ganas! Quitarle saltos al rival y guardar los tuyos: ese es el truco.' },
      { say: 'En las partidas el estándar es <b>8×8</b>; también puedes elegir un corto <b>6×6</b> o un largo <b>10×10</b>. No hay tablas, así que atento hasta el último salto. ¡A jugar!' },
    ] },
    fr: { name: 'Checkrab', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Elle ne peut pas atterrir là !', stuck: 'Cette pierre ne peut pas sauter pour l’instant', own: 'Touche une pierre noire', rmNg: 'Cette pierre ne peut pas être retirée. Choisis une pierre qui brille', want: 'Cette fois, trouve le saut demandé', wantWin: 'Les Blancs pourraient encore sauter. Réessaie !', win: '🏆 Gagné !', s: [
      { say: 'Aloha ! Moi c’est <b>Checkrab</b>. Aujourd’hui on apprend le <b>kōnane</b>, né sur les plages d’Hawaï, sur un <b>papamū</b>, son plateau ! On s’entraîne sur un petit plateau 6×6.' },
      { say: 'Au départ, <b>chaque case porte une pierre, noire et blanche en alternance</b>. a1, en bas à gauche, est noire, et <b>les Noirs commencent</b>. Les cases qui brillent sont les quatre du centre et les coins : le premier coup s’en sert.' },
      { say: 'Le premier coup <b>retire seulement une pierre</b> ! Les Noirs ôtent une de leurs pierres <b>au centre ou dans un coin</b> pour ouvrir un trou. Touche une des pierres noires qui brillent !', done: 'Pop ! Un trou. Le plateau est prêt pour les sauts.' },
      { say: 'Maintenant, les Blancs. Ils retirent une de leurs pierres <b>juste à côté du trou</b> (en haut, en bas ou sur le côté). Regarde…', done: 'Tu vois ? Deux cases vides côte à côte. Désormais, le jeu consiste à <b>sauter pour prendre</b>.' },
      { say: 'Saute <b>une pierre adverse collée à la tienne, verticalement ou horizontalement</b>, jusqu’à la case vide juste derrière : la pierre sautée est <b>prise</b> ! Pas de diagonale. Saute une blanche avec une noire jusqu’à la case qui brille !', done: 'Hop, attrapée ! Au kōnane, <b>chaque coup prend</b>.' },
      { say: 'S’il y a encore une pierre adverse et une case vide après ta case d’arrivée, tu peux <b>continuer dans la même direction</b> (un <b>saut multiple</b>) ! Prends-en deux d’un coup avec la pierre en a2, jusqu’à la case qui brille !', done: 'Hop, hop ! Deux pierres en un coup.' },
      { say: 'Mais un saut multiple va <b>tout droit</b> — pas de virage. En b3 tu auras envie de tourner à droite : non ! Prends-en deux tout droit vers le haut avec la pierre en b1 !', done: 'C’est ça, tout droit ! Tant que tu ne tournes pas, tu peux continuer.' },
      { say: 'Tu peux aussi <b>t’arrêter en chemin</b> dans un saut multiple. Prendre plus n’est pas toujours mieux ! Avec la pierre en a3, prends-en <b>une seule</b> et arrête-toi.', done: 'Bien vu ! Choisir où s’arrêter, voilà l’art du kōnane.' },
      { say: 'Et la règle la plus importante : <b>si tu n’as aucun saut à ton tour, tu perds</b> ! Les prises ne comptent pas — <b>le dernier à sauter gagne</b>. Trouve le coup qui laisse les Blancs sans aucun saut !', done: 'Les Blancs ne peuvent plus sauter : gagné ! Réduire les sauts de l’adversaire et garder les tiens, c’est le secret.' },
      { say: 'En partie, le <b>8×8</b> est la norme ; tu peux aussi choisir un court <b>6×6</b> ou un long <b>10×10</b>. Pas de nulle : reste concentré jusqu’au dernier saut. Allez, on joue !' },
    ] },
    pt: { name: 'Checkrab', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode pousar aí!', stuck: 'Essa pedra não pode saltar agora', own: 'Toque numa pedra preta', rmNg: 'Essa pedra não pode ser retirada. Escolha uma das que brilham', want: 'Desta vez, ache o salto que eu pedi', wantWin: 'Assim as brancas ainda podem saltar. De novo!', win: '🏆 Você venceu!', s: [
      { say: 'Aloha! Eu sou o <b>Checkrab</b>. Hoje vamos aprender o <b>kōnane</b>, nascido nas praias do Havaí, num <b>papamū</b>, o seu tabuleiro! Vamos treinar num tabuleiro pequeno de 6×6.' },
      { say: 'O tabuleiro começa com <b>pedras pretas e brancas alternadas em todas as casas</b>. a1, embaixo à esquerda, é preta, e <b>as pretas começam</b>. Brilham as quatro casas do centro e os cantos: o primeiro lance usa essas casas.' },
      { say: 'O primeiro lance só <b>retira uma pedra</b>! As pretas tiram uma pedra sua do <b>centro ou de um canto</b> para abrir um buraco. Toque numa das pedras pretas que brilham!', done: 'Pop! Um buraco. O tabuleiro está pronto para os saltos.' },
      { say: 'Agora é a vez das brancas. Elas retiram uma pedra sua <b>logo ao lado do buraco</b> (em cima, embaixo ou dos lados). Olha só…', done: 'Viu? Duas casas vazias juntas. Daqui em diante o jogo é <b>saltar para capturar</b>.' },
      { say: 'Salte <b>uma pedra rival encostada na sua, na vertical ou horizontal</b>, até a casa vazia logo atrás: a pedra saltada é <b>capturada</b>! Nada de diagonal. Salte uma branca com uma preta até a casa que brilha!', done: 'Pulo e captura! No kōnane, <b>todo lance captura</b>.' },
      { say: 'Se depois da casa onde você cai houver outra pedra rival e uma casa vazia, dá para <b>continuar saltando na mesma direção</b> (um <b>salto múltiplo</b>)! Capture duas de uma vez com a pedra em a2, até a casa que brilha!', done: 'Pula, pula! Duas pedras num lance.' },
      { say: 'Mas um salto múltiplo vai <b>só em linha reta</b>: nada de virar. Em b3 vai dar vontade de virar à direita — não vire! Capture duas para cima, em linha reta, com a pedra em b1!', done: 'Isso, reto! Enquanto não virar, dá para seguir.' },
      { say: 'Também dá para <b>parar no meio</b> de um salto múltiplo. Capturar mais nem sempre é melhor! Com a pedra em a3, capture <b>só uma</b> e pare.', done: 'Boa decisão! Escolher onde parar é a arte do kōnane.' },
      { say: 'E a regra mais importante: <b>se você não tiver salto na sua vez, perde</b>! Capturas não contam — <b>vence quem salta por último</b>. Ache o lance que deixa as brancas sem nenhum salto!', done: 'As brancas não podem mais saltar: você venceu! Cortar os saltos do rival e guardar os seus: esse é o truque.' },
      { say: 'Nas partidas o padrão é <b>8×8</b>; você também pode escolher um curto <b>6×6</b> ou um longo <b>10×10</b>. Não há empate, então fique atento até o último salto. Vamos jogar!' },
    ] },
    de: { name: 'Checkrab', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dort kann er nicht landen!', stuck: 'Dieser Stein kann gerade nicht springen', own: 'Tippe einen schwarzen Stein an', rmNg: 'Dieser Stein darf nicht abgenommen werden. Wähle einen leuchtenden', want: 'Diesmal suchst du den Sprung aus der Aufgabe', wantWin: 'Danach könnte Weiß noch springen. Nochmal!', win: '🏆 Gewonnen!', s: [
      { say: 'Aloha! Ich bin <b>Checkrab</b>. Heute lernen wir <b>Kōnane</b>, entstanden an den Stränden Hawaiʻis, auf einem <b>Papamū</b>, seinem Brett! Geübt wird auf einem kleinen 6×6-Brett.' },
      { say: 'Zu Beginn liegen <b>auf jedem Feld Steine, abwechselnd schwarz und weiß</b>. a1 unten links ist schwarz, und <b>Schwarz beginnt</b>. Es leuchten die vier Mittelfelder und die Ecken – die braucht der erste Zug.' },
      { say: 'Der erste Zug <b>nimmt nur einen Stein ab</b>! Schwarz nimmt einen eigenen Stein aus <b>der Mitte oder einer Ecke</b> und macht ein Loch. Tippe einen der leuchtenden schwarzen Steine an!', done: 'Plopp! Ein Loch. Jetzt ist das Brett bereit zum Springen.' },
      { say: 'Jetzt ist Weiß dran. Weiß nimmt einen eigenen Stein <b>direkt neben dem Loch</b> ab (oben, unten oder seitlich). Schau mal…', done: 'Siehst du? Zwei leere Felder nebeneinander. Ab jetzt heißt es <b>springen und schlagen</b>.' },
      { say: 'Überspringe <b>einen Gegnerstein, der senkrecht oder waagerecht neben deinem liegt</b>, auf das leere Feld direkt dahinter – der übersprungene Stein ist <b>geschlagen</b>! Nicht diagonal. Spring mit einem schwarzen über einen weißen auf das leuchtende Feld!', done: 'Hopp – erwischt! Beim Kōnane <b>schlägt jeder Zug</b>.' },
      { say: 'Liegen hinter dem Landefeld noch ein Gegnerstein und ein leeres Feld, darfst du <b>in derselben Richtung weiterspringen</b> (ein <b>Mehrfachsprung</b>)! Schlag mit dem Stein auf a2 zwei auf einmal, bis zum leuchtenden Feld!', done: 'Hopp, hopp! Zwei Steine in einem Zug.' },
      { say: 'Aber ein Mehrfachsprung geht <b>nur geradeaus</b> – kein Abbiegen unterwegs. Auf b3 möchtest du vielleicht rechts abbiegen – nicht! Schlag mit dem Stein auf b1 zwei geradeaus nach oben!', done: 'Genau – geradeaus! Solange du nicht abbiegst, geht es weiter.' },
      { say: 'Du darfst einen Mehrfachsprung auch <b>unterwegs beenden</b>. Mehr schlagen ist nicht immer besser! Schlag mit dem Stein auf a3 <b>nur einen</b> und halte an.', done: 'Gut entschieden! Den Haltepunkt zu wählen ist die wahre Kunst des Kōnane.' },
      { say: 'Und die wichtigste Regel: <b>Hast du am Zug keinen Sprung, verlierst du</b>! Schläge zählen nicht – <b>wer zuletzt springt, gewinnt</b>. Finde den Zug, nach dem Weiß gar keinen Sprung mehr hat!', done: 'Weiß kann nicht mehr springen – gewonnen! Dem Gegner Sprünge nehmen und eigene behalten: das ist der Trick.' },
      { say: 'Gespielt wird meist auf <b>8×8</b>; du kannst auch ein kurzes <b>6×6</b> oder ein langes <b>10×10</b> wählen. Remis gibt es nicht – bleib bis zum letzten Sprung wach. Los, spielen wir!' },
    ] },
    hi: { name: 'चेकरैब', next: 'आगे', back: 'पीछे', start: 'खेलकर देखें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'वहाँ नहीं उतर सकता!', stuck: 'वह पत्थर अभी नहीं कूद सकता', own: 'कोई काला पत्थर टैप करो', rmNg: 'वह पत्थर नहीं हटा सकते। चमकते पत्थरों में से चुनो', want: 'इस बार वही छलांग ढूँढो जो मैंने कही', wantWin: 'ऐसे तो सफ़ेद अब भी कूद सकता है। फिर से!', win: '🏆 जीत गए!', s: [
      { say: 'अलोहा! मैं हूँ <b>चेकरैब</b>। आज बोर्ड “<b>पापामू</b>” पर हवाई के समुद्र-तटों पर जन्मा <b>कोनाने</b> सीखते हैं! अभ्यास छोटे 6×6 बोर्ड पर करेंगे।' },
      { say: 'शुरू में <b>हर खाने पर बारी-बारी काले और सफ़ेद पत्थर</b> होते हैं। नीचे-बाएँ a1 काला है, और <b>काला पहले चलता है</b>। चमक रहे हैं बीच के चार खाने और चारों कोने — पहली चाल इन्हीं से होती है।' },
      { say: 'पहली चाल में <b>बस एक पत्थर हटाना</b> है! काला <b>बीच या कोने</b> से अपना एक पत्थर हटाकर बोर्ड में छेद बनाता है। किसी चमकते काले पत्थर पर टैप करो!', done: 'पॉप! छेद बन गया। अब बोर्ड कूदने के लिए तैयार है।' },
      { say: 'अब सफ़ेद की बारी। सफ़ेद <b>छेद के ठीक बगल (ऊपर-नीचे-दाएँ-बाएँ)</b> वाला अपना एक पत्थर हटाता है। देखो…', done: 'देखा? दो खाली खाने साथ-साथ! यहाँ से खेल है <b>कूदकर पत्थर लेना</b>।' },
      { say: 'अपने पत्थर से <b>ऊपर-नीचे या बगल वाले विरोधी पत्थर के ऊपर से कूदो</b> और ठीक पीछे के खाली खाने में उतरो — जिस पर से कूदे वह <b>ले लिया</b>! तिरछा नहीं। काले से सफ़ेद के ऊपर कूदकर चमकते खाने पर पहुँचो!', done: 'कूदे और पकड़ा! कोनाने में <b>हर चाल में पत्थर लेना ही होता है</b>।' },
      { say: 'जहाँ उतरे उसके आगे फिर विरोधी पत्थर और खाली खाना हो, तो <b>उसी दिशा में आगे कूद सकते हो</b> (<b>लगातार छलांग</b>)! a2 वाले पत्थर से एक बार में दो लेकर चमकते खाने तक जाओ!', done: 'कूद-कूद! एक चाल में दो पत्थर।' },
      { say: 'लेकिन लगातार छलांग <b>सिर्फ़ सीधी</b> होती है — बीच में मुड़ना मना। b3 पर दाएँ मुड़ने का मन करेगा, मत मुड़ना! b1 वाले पत्थर से ऊपर सीधे दो लो!', done: 'हाँ, सीधा! जब तक न मुड़ो, आगे बढ़ते रहो।' },
      { say: 'लगातार छलांग <b>बीच में रोक भी सकते हो</b>। ज़्यादा लेना हमेशा अच्छा नहीं! a3 वाले पत्थर से <b>सिर्फ़ एक</b> लेकर रुक जाओ।', done: 'बढ़िया फ़ैसला! कहाँ रुकना है, यही कोनाने की असली कला है।' },
      { say: 'और सबसे ज़रूरी नियम: <b>अपनी बारी में कूद न सको तो हार</b>! कितने लिए, इससे फ़र्क़ नहीं — <b>आख़िर में कूदने वाला जीतता है</b>। वह चाल ढूँढो जिसके बाद सफ़ेद बिल्कुल न कूद सके!', done: 'सफ़ेद अब नहीं कूद सकता — तुम जीते! विरोधी की छलाँगें घटाओ और अपनी बचाओ: यही तरकीब है।' },
      { say: 'खेल में मानक <b>8×8</b> है; छोटा <b>6×6</b> और लंबा <b>10×10</b> भी चुन सकते हो। ड्रॉ नहीं होता, इसलिए आख़िरी छलांग तक चौकन्ने रहो। चलो, खेलते हैं!' },
    ] },
    ar: { name: 'تشيكراب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'انقر نقطة متوهجة', nope: 'لا يمكنه الهبوط هناك!', stuck: 'هذا الحجر لا يستطيع القفز الآن', own: 'انقر حجرًا أسود', rmNg: 'لا يمكن نزع هذا الحجر. اختر من الأحجار المتوهجة', want: 'هذه المرة ابحث عن القفزة المطلوبة', wantWin: 'هكذا ما زال الأبيض يستطيع القفز. حاول مجددًا!', win: '🏆 فزت!', s: [
      { say: 'ألوها! أنا <b>تشيكراب</b>. اليوم نتعلّم <b>الكونانيه</b>، المولودة على شواطئ هاواي، على لوحتها «<b>بابامو</b>»! سنتدرّب على لوحة صغيرة 6×6.' },
      { say: 'تبدأ اللوحة <b>بحجر على كل مربع، أسود وأبيض بالتناوب</b>. a1 أسفل اليسار سوداء، و<b>الأسود يبدأ</b>. المتوهج هو المربعات الأربعة الوسطى والزوايا — تُستخدم في النقلة الأولى.' },
      { say: 'النقلة الأولى <b>تنزع حجرًا فقط</b>! ينزع الأسود أحد أحجاره من <b>الوسط أو من زاوية</b> ليفتح حفرة. انقر أحد الأحجار السوداء المتوهجة!', done: 'بوب! حفرة. اللوحة جاهزة للقفز الآن.' },
      { say: 'الآن دور الأبيض. ينزع أحد أحجاره <b>الملاصقة للحفرة مباشرة</b> (أعلى أو أسفل أو جانبًا). انظر…', done: 'أرأيت؟ مربعان فارغان متجاوران. من هنا تصبح اللعبة <b>القفز للأسر</b>.' },
      { say: 'اقفز <b>فوق حجر خصم ملاصق لحجرك عموديًا أو أفقيًا</b> إلى المربع الفارغ خلفه مباشرة — فيصبح الحجر <b>مأسورًا</b>! لا قطريًا. اقفز بحجر أسود فوق أبيض إلى المربع المتوهج!', done: 'قفزة وأسر! في الكونانيه <b>كل نقلة أسر</b>.' },
      { say: 'إن كان بعد مربع هبوطك حجر خصم آخر ومربع فارغ، يمكنك <b>متابعة القفز في الاتجاه نفسه</b> (<b>قفزة متعددة</b>)! أسِر حجرين دفعة واحدة بحجر a2 حتى المربع المتوهج!', done: 'قفز، قفز! حجران في نقلة واحدة.' },
      { say: 'لكن القفزة المتعددة <b>مستقيمة فقط</b> — لا انعطاف. في b3 قد ترغب في الانعطاف يمينًا، لا تفعل! أسِر حجرين صعودًا في خط مستقيم بحجر b1!', done: 'بالضبط، مستقيم! ما دمت لا تنعطف يمكنك المتابعة.' },
      { say: 'يمكنك أيضًا <b>التوقف في منتصف</b> القفزة المتعددة. أسر المزيد ليس دائمًا أفضل! بحجر a3 أسِر <b>حجرًا واحدًا فقط</b> وتوقف.', done: 'قرار جيد! اختيار مكان التوقف هو فن الكونانيه الحقيقي.' },
      { say: 'وأهم قاعدة: <b>إن لم تجد قفزة في دورك فإنك تخسر</b>! عدد الأسرى لا يهم — <b>يفوز من يقفز أخيرًا</b>. جد النقلة التي تترك الأبيض بلا أي قفزة!', done: 'لم يعد الأبيض يستطيع القفز — فزت! قلّل قفزات الخصم واحتفظ بقفزاتك: هذا هو السر.' },
      { say: 'في المباريات المعيار <b>8×8</b>؛ ويمكنك اختيار <b>6×6</b> القصيرة أو <b>10×10</b> الطويلة. لا يوجد تعادل، فابقَ يقظًا حتى آخر قفزة. هيا، لنلعب!' },
    ] },
    ru: { name: 'Чекраб', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tap: 'Нажми на светящееся место', nope: 'Туда приземлиться нельзя!', stuck: 'Этот камень сейчас не может прыгнуть', own: 'Нажми на чёрный камень', rmNg: 'Этот камень снять нельзя. Выбери один из светящихся', want: 'На этот раз найди прыжок, о котором я просил', wantWin: 'После этого белые ещё могут прыгнуть. Попробуй снова!', win: '🏆 Победа!', s: [{ say: 'Алоха! Я <b>Чекраб</b>. Сегодня давай изучим <b>конане</b>, родившуюся на пляжах Гавайев, на <b>папаму</b> — доске для конане! Потренируемся на маленькой доске 6×6.' }, { say: 'В начале <b>чёрные и белые камни через один стоят на каждой клетке</b>. a1, левая нижняя, — чёрная, и <b>чёрные ходят первыми</b>. Светятся четыре центральные клетки и углы — они нужны для первого хода.' }, { say: 'Первый ход только <b>снимает камень</b>! Чёрные снимают свой камень из <b>центра или угла</b>, чтобы открыть дыру. Нажми на один из светящихся чёрных камней!', done: 'Чпок! Дыра. Теперь доска готова к прыжкам.' }, { say: 'Теперь ход белых. Белые снимают свой камень <b>прямо рядом с дырой</b> (сверху, снизу, слева или справа). Смотри…', done: 'Видишь? Две пустые клетки рядом. Дальше игра — это <b>прыжки со взятием</b>.' }, { say: 'Перепрыгни <b>вражеский камень рядом со своим — вверх, вниз или вбок</b> — на пустую клетку сразу за ним, и перепрыгнутый камень <b>взят</b>! По диагонали нельзя. Перепрыгни чёрным через белый на светящуюся клетку!', done: 'Прыг — попался! В конане <b>каждый ход — взятие</b>.' }, { say: 'Если за местом приземления есть ещё вражеский камень и пустая клетка, можно <b>прыгать дальше в том же направлении</b> (<b>многократный прыжок</b>)! Возьми сразу два камнем с a2, до самой светящейся клетки!', done: 'Прыг, прыг! Два камня за один ход.' }, { say: 'Но многократный прыжок идёт <b>только прямо</b> — поворачивать нельзя. Тебе может захотеться свернуть направо на b3, но не надо! Возьми два прямо вверх камнем с b1!', done: 'Вот так — прямо! Пока не поворачиваешь, можно продолжать.' }, { say: 'Многократный прыжок можно <b>остановить на полпути</b>. Взять больше — не всегда лучше! Камнем с a3 возьми <b>только один</b> и остановись.', done: 'Мудро! Умение выбрать, где остановиться, — настоящее мастерство в конане.' }, { say: 'И самое важное правило: <b>если в свой ход тебе нечем прыгнуть, ты проигрываешь</b>! Взятые камни не считаются — <b>побеждает тот, кто прыгнул последним</b>. Найди ход, после которого белым вообще нечем прыгнуть!', done: 'Белым больше нечем прыгать — победа! Отрезай прыжки соперника и сохраняй свои — вот и вся хитрость.' }, { say: 'В партиях стандарт — <b>8×8</b>; можно выбрать и короткую <b>6×6</b>, и длинную <b>10×10</b>. Ничьих нет, так что будь начеку до самого последнего прыжка. А теперь — сыграем!' }] },
    'zh-TW': { name: '跳棋蟹', next: '下一步', back: '返回', start: '來玩吧', again: '再一次', tap: '點擊發光的地方', nope: '不能落在那裡！', stuck: '那顆石子現在不能跳', own: '請點擊黑色石子', rmNg: '那顆石子不能取走。請選一顆發光的石子', want: '這次請找出我說的那種跳法', wantWin: '這樣白方還能跳喔。再試一次！', win: '🏆 你贏了！', s: [{ say: 'Aloha！我是<b>跳棋蟹</b>。今天在科納內的棋盤<b>帕帕穆</b>上，一起學誕生於夏威夷海灘的<b>科納內</b>吧！先用6×6的小棋盤練習。' }, { say: '開局時<b>每一格都交替放著黑白石子</b>。左下角a1是黑色，<b>黑方先下</b>。發光的是中央4格與四角——第一手會用到它們。' }, { say: '第一手只是<b>取走一顆石子</b>！黑方從<b>中央或角落</b>取走1顆自己的石子，開出一個洞。點擊一顆發光的黑子！', done: '啵！開了一個洞。棋盤準備好可以跳了。' }, { say: '接著輪到白方。白方取走<b>緊鄰洞</b>（上下左右）的1顆自己的石子。看好囉……', done: '看到了嗎？兩個空格並排。之後的遊戲就是<b>跳吃</b>。' }, { say: '跳過<b>自己石子上下左右相鄰的敵方石子</b>，落到它正後方的空格，被跳過的石子就<b>被吃掉</b>！不能斜跳。用黑子跳過白子落到發光的格子！', done: '跳——吃到了！在科納內，<b>每一步都是吃子</b>。' }, { say: '落下的位置後面如果還有敵方石子和空格，就能<b>朝同一方向繼續跳</b>（<b>連跳</b>）！用a2的石子一次吃2顆，一路跳到發光的格子！', done: '跳、跳！一步吃2顆。' }, { say: '不過連跳<b>只能直直往前</b>——途中不能轉彎。你可能想在b3向右轉，但不可以！用b1的石子往上直直吃2顆！', done: '就是這樣——直直的！只要不轉彎，就能一直跳。' }, { say: '連跳也可以<b>在中途停下</b>。吃得多不一定比較好！用a3的石子<b>只吃1顆</b>就停下。', done: '判斷得好！選擇在哪裡停下，才是科納內真正的技巧。' }, { say: '最重要的規則：<b>輪到自己卻沒有可跳的步，就輸了</b>！吃子數不算——<b>最後跳的人獲勝</b>。找出讓白方完全無法跳的一步！', done: '白方再也不能跳了——你贏了！切斷對手的跳法，保留自己的跳法：這就是訣竅。' }, { say: '對局以<b>8×8</b>為標準，也能選短局的<b>6×6</b>或長局的<b>10×10</b>。沒有和局，所以到最後一跳都不能大意。那麼，來玩吧！' }] },
    id: { name: 'Checkrab', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tap: 'Ketuk tempat yang menyala', nope: 'Tidak bisa mendarat di sana!', stuck: 'Batu itu tak bisa melompat sekarang', own: 'Ketuk batu hitam', rmNg: 'Batu itu tak bisa diangkat. Pilih salah satu batu yang menyala', want: 'Kali ini, cari lompatan yang kuminta', wantWin: 'Putih masih bisa melompat setelah itu. Coba lagi!', win: '🏆 Kamu menang!', s: [{ say: 'Aloha! Aku <b>Checkrab</b>. Hari ini ayo belajar <b>kōnane</b>, yang lahir di pantai Hawaiʻi, di atas <b>papamū</b>, papan kōnane! Kita berlatih di papan kecil 6×6.' }, { say: 'Papan dimulai dengan <b>batu hitam dan putih berselang-seling di setiap kotak</b>. a1, kiri bawah, hitam, dan <b>Hitam jalan duluan</b>. Kotak yang menyala adalah empat di tengah dan pojok — langkah pertama memakainya.' }, { say: 'Langkah pertama hanya <b>mengangkat sebuah batu</b>! Hitam mengambil salah satu batunya dari <b>tengah atau pojok</b> untuk membuka lubang. Ketuk salah satu batu hitam yang menyala!', done: 'Pop! Sebuah lubang. Sekarang papan siap untuk melompat.' }, { say: 'Sekarang giliran Putih. Putih mengangkat salah satu batunya <b>tepat di sebelah lubang</b> (atas, bawah, kiri, atau kanan). Perhatikan…', done: 'Lihat? Dua kotak kosong bersebelahan. Mulai sekarang, permainannya adalah <b>melompat untuk menangkap</b>.' }, { say: 'Lompati <b>batu lawan di sebelah batumu, ke atas, bawah, atau samping</b>, ke kotak kosong tepat di baliknya — dan batu yang kamu lompati <b>tertangkap</b>! Tidak diagonal. Lompati batu putih dengan batu hitam ke kotak yang menyala!', done: 'Hop — kena! Dalam kōnane, <b>setiap langkah adalah tangkapan</b>.' }, { say: 'Jika ada batu lawan lagi dan kotak kosong di balik tempat mendarat, kamu bisa <b>terus melompat ke arah yang sama</b> (<b>lompatan ganda</b>)! Ambil dua sekaligus dengan batu di a2, sampai ke kotak yang menyala!', done: 'Hop, hop! Dua batu dalam satu langkah.' }, { say: 'Tapi lompatan ganda hanya <b>lurus</b> — tak boleh berbelok di tengah jalan. Mungkin kamu ingin belok kanan di b3, tapi jangan! Ambil dua lurus ke atas dengan batu di b1!', done: 'Begitu — lurus! Selama tak berbelok, kamu bisa terus.' }, { say: 'Kamu juga boleh <b>berhenti di tengah</b> lompatan ganda. Mengambil lebih banyak tak selalu lebih baik! Dengan batu di a3, ambil <b>satu saja</b> lalu berhenti.', done: 'Pilihan bagus! Memilih tempat berhenti adalah keahlian sejati dalam kōnane.' }, { say: 'Dan aturan terpenting: <b>jika tak punya lompatan di giliranmu, kamu kalah</b>! Tangkapan tak dihitung — <b>pemain terakhir yang melompat menang</b>. Cari langkah yang membuat Putih sama sekali tak bisa melompat!', done: 'Putih tak bisa melompat lagi — kamu menang! Potong lompatan lawan dan sisakan lompatanmu: itulah triknya.' }, { say: 'Dalam permainan, <b>8×8</b> adalah standarnya; kamu juga bisa memilih <b>6×6</b> yang singkat atau <b>10×10</b> yang panjang. Tak ada hasil seri, jadi tetap waspada sampai lompatan terakhir. Ayo main!' }] },
    tr: { name: 'Checkrab', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tap: 'Parlayan yere dokun', nope: 'Oraya inemez!', stuck: 'Bu taş şu an atlayamaz', own: 'Siyah bir taşa dokun', rmNg: 'Bu taş alınamaz. Parlayan taşlardan birini seç', want: 'Bu kez istediğim atlamayı bul', wantWin: 'Bundan sonra Beyaz hâlâ atlayabilir. Tekrar dene!', win: '🏆 Kazandın!', s: [{ say: 'Aloha! Ben <b>Checkrab</b>. Bugün Hawaiʻi plajlarında doğan <b>kōnane</b>\'yi, kōnane tahtası <b>papamū</b> üzerinde öğrenelim! Küçük bir 6×6 tahtada pratik yapacağız.' }, { say: 'Tahta, <b>her karede sırayla siyah ve beyaz taşlarla</b> başlar. Sol alttaki a1 siyahtır ve <b>ilk Siyah oynar</b>. Parlayan kareler ortadaki dört kare ve köşeler — ilk hamle bunları kullanır.' }, { say: 'İlk hamle yalnızca <b>bir taş kaldırır</b>! Siyah, bir boşluk açmak için <b>ortadan ya da bir köşeden</b> kendi taşlarından birini alır. Parlayan siyah taşlardan birine dokun!', done: 'Pıt! Bir boşluk. Artık tahta atlamaya hazır.' }, { say: 'Şimdi sıra Beyaz\'da. Beyaz <b>boşluğun hemen yanındaki</b> (üst, alt, sol ya da sağ) taşlarından birini alır. İzle…', done: 'Gördün mü? Yan yana iki boş kare. Bundan sonra oyun <b>atlayarak almak</b>tır.' }, { say: '<b>Taşının yanındaki bir rakip taşın üzerinden yukarı, aşağı ya da yana</b>, hemen arkasındaki boş kareye atla — üzerinden atladığın taş <b>alınır</b>! Çapraz yok. Siyah bir taşla beyaz taşın üzerinden parlayan kareye atla!', done: 'Hop — yakaladın! Kōnane\'de <b>her hamle bir almadır</b>.' }, { say: 'İndiğin yerin ötesinde başka bir rakip taş ve boş kare varsa <b>aynı yönde atlamaya devam edebilirsin</b> (<b>çoklu atlama</b>)! a2\'deki taşla parlayan kareye kadar ikisini birden al!', done: 'Hop, hop! Tek hamlede iki taş.' }, { say: 'Ama çoklu atlama <b>yalnızca düz</b> gider — yolda dönülmez. b3\'te sağa dönmek isteyebilirsin, dönme! b1\'deki taşla düz yukarı ikisini al!', done: 'İşte böyle — dümdüz! Dönmedikçe devam edebilirsin.' }, { say: 'Çoklu atlamayı <b>yarıda bırakabilirsin</b> de. Daha çok almak her zaman daha iyi değildir! a3\'teki taşla <b>yalnızca birini</b> al ve dur.', done: 'İyi karar! Nerede duracağını seçmek kōnane\'nin asıl ustalığıdır.' }, { say: 'Ve en önemli kural: <b>sıranda atlayacak hamlen yoksa kaybedersin</b>! Alınan taşlar sayılmaz — <b>son atlayan kazanır</b>. Beyaz\'a hiç atlama bırakmayan hamleyi bul!', done: 'Beyaz artık atlayamıyor — kazandın! Rakibin atlamalarını kes, kendininkileri sakla: püf noktası bu.' }, { say: 'Oyunlarda <b>8×8</b> standarttır; kısa bir <b>6×6</b> ya da uzun bir <b>10×10</b> da seçebilirsin. Beraberlik yoktur, bu yüzden son atlamaya kadar dikkatli ol. Hadi oynayalım!' }] },
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
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { clack, hop, take, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, K3 = T3.konane;
    const board = K3.board(N); T3.show('konane', board); T3.play(true);
    const U = board.userData, TOP = U.top, Y = U.top - U.sink;
    if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.2, y: TOP + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const idx = s => (N - +s.slice(1)) * N + 'abcdef'.indexOf(s[0]);
    const xz = i => U.pt(i % N, Math.floor(i / N));
    const specOf = st => { const a = Array(N * N).fill('.'); st.b.forEach(s => { a[idx(s)] = 'b'; }); st.w.forEach(s => { a[idx(s)] = 'w'; }); return { b: a.join(''), side: st.ply === 1 ? 2 : 1, n: st.ply != null ? st.ply : 2 }; };

    /* ---------- stones ---------- */
    function mk(col) { const g = U.piece(col), sh = T3.contact(K3.R * .9, .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SFX.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    function setBoard() {   // diff against the stones already on the board: the same ones stay still, only new ones drop in
      const old = pcs; pcs = {};
      let n = 0;
      for (let i = 0; i < N * N; i++) {
        const c = pos.owner(i); if (!c) continue;
        const o = old[i];
        if (o && o.userData.col === c) { delete old[i]; pcs[i] = o; const [x, z] = xz(i); o.visible = true; o.position.x = x; o.position.z = z; o.scale.set(1, 1, 1); o.rotation.z = 0; lift(o, 0); continue; }
        const g = mk(c), [x, z] = xz(i); g.position.set(x, Y, z); pcs[i] = g;
        g.visible = false; const d = 40 + (n++) * 16;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); }); }, d);
      }
      Object.values(old).forEach(drop);
      return n;
    }
    const HOP = 300;
    function travel(g, path, done) {
      const pts = path.map(xz), legs = path.length - 1, dur = legs * HOP, hopped = [], h0 = g.userData.h0 || 0;
      anim(dur, k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q = r - i, [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; SFX.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * .65 + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); land(g); SFX.clack(); if (done) done(); });
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const bm = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function tile(i, color, op = .45, pulse = true) { const g = new TH.CircleGeometry(.44, 40); g.rotateX(-Math.PI / 2); const m = new TH.Mesh(g, bm(color, op)); const [x, z] = xz(i); m.position.set(x, TOP - .015, z); m.userData.pulse = pulse; m.userData.flat = true; m.renderOrder = 2; marks.add(m); return m; }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.14, .14, .012, 28), bm(color, .9)); const [x, z] = xz(i); m.position.set(x, TOP + .02, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color) { const m = new TH.Mesh(new TH.TorusGeometry(.44, .032, 8, 44), bm(color, .95)); m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, TOP + .05, z); m.userData.pulse = true; m.userData.torus = true; m.renderOrder = 2; marks.add(m); return m; }
    // the marks' pulse runs only while something pulses (0 frames otherwise); a mark added starts it again
    let pulseOn = false;
    function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .88 + k * .24; m.scale.set(s, m.userData.torus ? s : 1, s); } m.material.opacity = (m.userData.flat ? .25 : .45) + k * (m.userData.flat ? .3 : .5); } }); if (any && T3.kick) T3.kick(60); pulseOn = any && !stopped; if (pulseOn) requestAnimationFrame(pulse); }
    { const add0 = marks.add.bind(marks), rm0 = marks.remove.bind(marks); marks.add = (...a) => { const r = add0(...a); if (T3.kick) T3.kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; marks.remove = (...a) => { if (T3.kick) T3.kick(150); return rm0(...a); }; }
    pulse();
    // the moves the task accepts (from the engine)
    function accepted(st) {
      const all = pos.moves(), T = (st.target || []).map(idx);
      if (st.act === 'rm') return all;
      if (st.act === 'jump') return all.filter(m => T.includes(E.mTo(m)));
      if (st.act === 'double' || st.act === 'straight') return all.filter(m => E.hops(m) >= 2 && T.includes(E.mTo(m)));
      if (st.act === 'stop') return all.filter(m => E.hops(m) === 1 && T.includes(E.mTo(m)));
      if (st.act === 'win') return all.filter(m => !pos.clone().play(m).moves().length);
      return [];
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      (st.glow || []).forEach(s => tile(idx(s), 0xffc94a, .4));
      if (st.path && !played) st.path.slice(1, -1).forEach(s => dot(idx(s), 0x8fd8ff));
      if (!st.act || played) return;
      if (sel != null) { ring(sel, 0xffc94a); accepted(st).filter(m => E.mFrom(m) === sel).forEach(m => dot(E.mTo(m), 0x3fe0c4)); return; }
      new Set(accepted(st).map(E.mFrom)).forEach(f => ring(f, st.act === 'rm' ? 0xff9a4a : 0x3fe0c4));
      (st.target || []).forEach(s => tile(idx(s), 0x3fe0c4, .35));
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
      later(showTask, 380 + cnt * 16);
      if (st.demo) later(() => {   // White's removal next to the hole, played by itself
        const i = idx(st.demo), g = pcs[i], m = pos.moves().find(x => E.mFrom(x) === i); if (!g || m == null) return;
        busy = true; clearMarks(); ring(i, 0xff9a4a);
        later(() => { clearMarks(); delete pcs[i]; pos.play(m); vanish(g, 0); later(() => { busy = false; played = true; SFX.chime(); if (L.s[step].done) say(L.s[step].done); buttons(); autoNext(); }, 520); }, 900);
      }, 2200 + cnt * 16);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'win') { tip(L.win); Object.values(pcs).forEach(g => { if (g.userData.col === 1) anim(700, k => lift(g, Math.sin(k * Math.PI) * .5)); }); }
      buttons(); autoNext();
    }
    function cellOf(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      const c = Math.floor(p.x + N / 2), r = Math.floor(p.z + N / 2);
      return c < 0 || c > N - 1 || r < 0 || r > N - 1 ? -1 : r * N + c;
    }
    function liftSel(i, on) { const g = pcs[i]; if (!g) return; const h0 = g.userData.h0 || 0, h1 = on ? .26 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function play(m) {
      busy = true; clearMarks();
      const f = E.mFrom(m), g = pcs[f];
      if (E.isRemove(m)) { delete pcs[f]; pos.play(m); sel = null; vanish(g, 0); later(finish, 600); return; }
      const to = E.mTo(m), path = E.path(pos, m), caps = E.captured(pos, m);
      caps.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c, k * HOP + HOP * .45); } });
      delete pcs[f]; pcs[to] = g; pos.play(m); sel = null;
      travel(g, path, () => later(finish, 200));
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) return;
      const A = accepted(st);
      if (st.act === 'rm') { const m = A.find(x => E.mFrom(x) === i); if (m != null) play(m); else say(pos.owner(i) === 1 ? L.rmNg : L.own); return; }
      if (pos.owner(i) === 1) {
        if (sel === i) { liftSel(i, false); sel = null; showTask(); return; }
        if (!A.some(m => E.mFrom(m) === i)) { say(pos.moves().some(m => E.mFrom(m) === i) ? (st.act === 'win' ? L.wantWin : L.want) : L.stuck); return; }
        if (sel != null) liftSel(sel, false);
        sel = i; liftSel(i, true); SFX.clack(); showTask(); return;
      }
      if (sel == null) { say(L.own); return; }
      const m = A.find(x => E.mFrom(x) === sel && E.mTo(x) === i);
      if (m == null) { const any = pos.moves().find(x => E.mFrom(x) === sel && E.mTo(x) === i); say(any != null ? (st.act === 'win' ? L.wantWin : L.want) : L.nope); return; }
      play(m);
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
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('s6'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-konane-rules-seen', '1'); } catch (e) {}
    const dbg = { marks: () => marks.children.length, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(m => E.name(pos, m)) : null, pa: () => STEPS[step].act ? accepted(STEPS[step]).map(m => [m, E.path(pos, m), E.N]) : null, sel: () => sel, at: s => { const [x, z] = xz(idx(s)); return T3.project(x, z, TOP); }, step: () => step, steps: STEPS.length, played: () => played, go: n => go(n) };
    window.__knRules = dbg;
    return {
      stop() { stopped = true; if (window.__knRules === dbg) delete window.__knRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); if (E) { try { E.setRule('s8'); } catch (e) {} } },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.konane = { start };
})();
