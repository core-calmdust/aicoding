/* =====================================================================
   Peg Solitaire rules — a guided tour on the 3D table (the wooden board chosen in the portal, atlas/models/peg.js),
   told by the guide character (Bille, the marble with a beret, av/marble-2).
   A short hands-on course: the full board, a jump that takes, no diagonals, jumps in a row, the last marble on ◎
   (the Latin cross), the triangle's slanted lines, and the classic problem. Every task is checked by the game's own rules
   (../peg/engine.js, window.PegEngine).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Holes as [row, col] of the engine's boards (the English board: 7×7 with the corners cut off, the middle is [3,3]).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/marble-2.webp', ENG = '../peg/engine.js?v=1';
  const loadEngine = () => window.PegEngine ? Promise.resolve(window.PegEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.PegEngine ? res(window.PegEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });
  // b: the board; p: the marbles ('full' = every hole but the middle); act: what the task accepts; glow: soft gold holes; goal: the ◎ hole
  const STEPS = [
    { b: 'english', p: 'full' },
    { b: 'english', p: [[3, 1], [3, 2], [2, 4], [4, 4]], act: 'jump', from: [3, 1], to: [3, 3] },
    { b: 'english', p: [[2, 2], [3, 3], [3, 4]], act: 'any' },
    { b: 'english', p: [[3, 0], [3, 1], [2, 2]], act: 'clear', glow: [[3, 0]] },
    { b: 'english', p: [[1, 3], [2, 2], [2, 3], [2, 4], [3, 3], [4, 3]], act: 'goal', goal: [3, 3] },
    { b: 'triangle', p: [[2, 0], [3, 1], [3, 0], [1, 0]], act: 'slant' },
    { b: 'english', p: 'full', goal: [3, 3], last: true },
  ];

  const TXT = {
    ja: { name: 'ビーユ', next: 'つぎへ', back: 'もどる', start: '遊んでみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは跳べないよ', sel: 'まず跳ぶ玉をタップしてね', stuck: 'その玉は今は跳べないよ', diag: 'ななめには跳べないよ。縦か横だけ！', want: '今回は課題のとおりに跳んでみてね', retry: 'おしい！ もう一度やってみよう',
      s: [
      { say: 'ボンジュール！ わたしは<b>ビーユ</b>、フランス生まれのビー玉だよ。今日は17世紀のフランスの宮廷で流行ったひとり遊び、<b>ペグソリテール</b>を覚えよう！ 真ん中の1つだけが空いた、この33穴の盤から始めるよ。' },
      { say: '玉は、縦か横の<b>隣の玉を跳び越えて</b>、その向こうの<b>空いた穴</b>へ移るの。跳び越えた玉は取られちゃう。左の光っている玉をタップして、光る穴へ跳ばしてみて！', done: 'コロン！ 跳び越えられた玉は、盤のふちの<b>溝</b>へ転がっていったね。' },
      { say: '穴が縦横に並ぶ盤では、跳べるのは<b>縦と横だけ</b>。ななめには跳べないよ。跳べる手を1つ見つけて、跳んでみて！', done: 'そのとおり！ まっすぐ縦か横だけだよ。' },
      { say: '1回跳んだら1手。でも同じ玉で<b>続けて何回でも</b>跳べるよ。うまくつなげると一気に減らせるの。玉が<b>1つになるまで</b>跳んでみて！', done: '2回続けて跳んで、残り1つ！ 跳べる玉がなくなったら、そこでおしまいだよ。' },
      { say: '目標は<b>最後に1つだけ残す</b>こと。金の輪の<b>◎の穴</b>に残せたら<b>完璧</b>！ これは昔からある「十字架」の形。跳ぶ順番を考えてね。', done: 'パーフェクト！ ◎の穴にぴったり1つ。順番を考えるのがこのパズルの楽しさだよ。' },
      { say: '三角の盤では、<b>ななめの線</b>にも沿って跳べるの（6方向）。ななめの線に沿って跳んでみて！', done: 'ななめにも跳べたね！ 盤の形が変わると、考え方もがらりと変わるよ。' },
      { say: 'これでルールはばっちり！ 定番はこの英国式33穴、<b>真ん中を空けて真ん中に1つ残す</b>問題。うまくつなげれば<b>最短18手</b>で解けるんだ。5種類の盤、パズル集、今日の問題も待ってるよ。さあ、遊んでみよう！' },
    ] },
    en: { name: 'Bille', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't jump there", sel: 'First tap the marble that jumps', stuck: "That marble can't jump right now", diag: 'No diagonal jumps — straight up, down or sideways only!', want: 'This time, follow the task', retry: 'So close! Try once more',
      s: [
      { say: "Bonjour! I'm <b>Bille</b>, a marble from France. Today let's learn <b>peg solitaire</b>, the puzzle for one that was the rage at the French court in the 1600s. We start on this 33-hole board with only the middle hole empty." },
      { say: 'A marble <b>jumps over the marble next to it</b>, up, down or sideways, into the <b>empty hole</b> just beyond. The one jumped over is taken. Tap the glowing marble on the left and jump it into the glowing hole!', done: 'Clack! The taken marble rolled into the <b>groove</b> round the rim.' },
      { say: 'On boards with the holes in rows and columns, a marble jumps <b>only up, down or sideways</b> — never diagonally. Find a jump that works and make it!', done: "That's it! Only straight up, down or sideways." },
      { say: 'Each jump is one move, but the same marble may <b>keep jumping</b> — link jumps to clear the board fast. Jump until <b>only one marble</b> is left!', done: 'Two jumps in a row, one marble left! When no marble can jump, the game is over.' },
      { say: 'The aim is to <b>leave just one marble</b>. On the <b>◎ hole</b> in the gold ring it is <b>perfect</b>! This is the old “cross” shape — think about the order.', done: 'Perfect! Exactly one marble on ◎. Working out the order is the whole fun of it.' },
      { say: 'On the triangle board marbles also jump <b>along the slanted lines</b> (six directions). Make a jump along a slanted line!', done: 'Slanted jumps work here! A new board shape changes how you think.' },
      { say: 'Now you know the rules! The classic is this English 33-hole board: <b>empty the middle and finish in the middle</b>. Linked well, it takes just <b>18 moves</b>. Five boards, a puzzle book and a daily puzzle are waiting. Let’s play!' },
    ] },
    zh: { name: '小珠', next: '下一步', back: '返回', start: '开始玩', again: '再来一次', tap: '点击发光的地方', nope: '跳不到那里哦', sel: '先点击要跳的弹珠', stuck: '这颗弹珠现在跳不了', diag: '不能斜着跳，只能横或竖！', want: '这次请按题目来跳', retry: '差一点！再试一次吧',
      s: [
      { say: 'Bonjour！我是<b>小珠</b>，来自法国的弹珠。今天来学17世纪法国宫廷流行的单人游戏<b>孔明棋</b>吧！我们从这块只有中央空着的33孔棋盘开始。' },
      { say: '弹珠沿横或竖<b>跳过相邻的弹珠</b>，落到后面的<b>空孔</b>。被跳过的弹珠会被拿走。点击左边发光的弹珠，跳进发光的孔吧！', done: '咕噜！被吃掉的弹珠滚进了棋盘边缘的<b>槽</b>里。' },
      { say: '孔排成横竖方格的棋盘上只能<b>横跳或竖跳</b>，不能斜着跳。找一步能跳的，跳跳看！', done: '没错！只能直着横跳或竖跳。' },
      { say: '每跳一次算一步，但同一颗弹珠<b>可以一直跳下去</b>，连起来就能一口气减少。跳到<b>只剩1颗</b>吧！', done: '连跳两次，只剩1颗！没有弹珠能跳时，游戏就结束了。' },
      { say: '目标是<b>最后只剩1颗</b>。留在金环里的<b>◎孔</b>就是<b>完美</b>！这是传统的“十字架”形，想想跳的顺序吧。', done: '完美！◎孔里正好1颗。思考顺序正是这个谜题的乐趣。' },
      { say: '三角形棋盘上，还可以沿<b>斜线</b>跳（6个方向）。沿斜线跳一次吧！', done: '斜着也能跳！棋盘形状一变，思路也完全不同。' },
      { say: '规则都学会了！经典题是这块英式33孔棋盘：<b>中央空出、最后留在中央</b>。连得好的话<b>最短18步</b>就能解开。5种棋盘、谜题集和每日一题都在等你。来，开始玩吧！' },
    ] },
    'zh-TW': { name: '小珠', next: '下一步', back: '返回', start: '開始玩', again: '再來一次', tap: '點擊發光的地方', nope: '跳不到那裡喔', sel: '先點擊要跳的彈珠', stuck: '這顆彈珠現在跳不了', diag: '不能斜著跳，只能橫或直！', want: '這次請照題目來跳', retry: '差一點！再試一次吧',
      s: [
      { say: 'Bonjour！我是<b>小珠</b>，來自法國的彈珠。今天來學17世紀法國宮廷流行的單人遊戲<b>孔明棋</b>吧！我們從這塊只有中央空著的33孔棋盤開始。' },
      { say: '彈珠沿橫或直<b>跳過相鄰的彈珠</b>，落到後面的<b>空孔</b>。被跳過的彈珠會被拿走。點擊左邊發光的彈珠，跳進發光的孔吧！', done: '咕嚕！被吃掉的彈珠滾進了棋盤邊緣的<b>槽</b>裡。' },
      { say: '孔排成橫直方格的棋盤上只能<b>橫跳或直跳</b>，不能斜著跳。找一步能跳的，跳跳看！', done: '沒錯！只能直著橫跳或直跳。' },
      { say: '每跳一次算一步，但同一顆彈珠<b>可以一直跳下去</b>，連起來就能一口氣減少。跳到<b>只剩1顆</b>吧！', done: '連跳兩次，只剩1顆！沒有彈珠能跳時，遊戲就結束了。' },
      { say: '目標是<b>最後只剩1顆</b>。留在金環裡的<b>◎孔</b>就是<b>完美</b>！這是傳統的「十字架」形，想想跳的順序吧。', done: '完美！◎孔裡正好1顆。思考順序正是這個謎題的樂趣。' },
      { say: '三角形棋盤上，還可以沿<b>斜線</b>跳（6個方向）。沿斜線跳一次吧！', done: '斜著也能跳！棋盤形狀一變，思路也完全不同。' },
      { say: '規則都學會了！經典題是這塊英式33孔棋盤：<b>中央空出、最後留在中央</b>。連得好的話<b>最短18步</b>就能解開。5種棋盤、謎題集和每日一題都在等你。來，開始玩吧！' },
    ] },
    ko: { name: '비유', next: '다음', back: '이전', start: '놀아 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기로는 못 뛰어', sel: '먼저 뛸 구슬을 탭해 줘', stuck: '그 구슬은 지금 못 뛰어', diag: '대각선으로는 못 뛰어. 가로나 세로만!', want: '이번엔 과제대로 뛰어 봐', retry: '아깝다! 한 번 더 해 보자',
      s: [
      { say: '봉주르! 나는 <b>비유</b>, 프랑스에서 온 구슬이야. 오늘은 17세기 프랑스 궁정에서 유행한 혼자 하는 놀이, <b>페그 솔리테르</b>를 배워 보자! 가운데 하나만 비어 있는 이 33구멍 판에서 시작해.' },
      { say: '구슬은 가로나 세로로 <b>이웃 구슬을 뛰어넘어</b> 그 너머의 <b>빈 구멍</b>으로 가. 넘은 구슬은 잡혀. 왼쪽의 빛나는 구슬을 탭해서 빛나는 구멍으로 뛰어 봐!', done: '또르르! 잡힌 구슬은 판 가장자리의 <b>홈</b>으로 굴러갔어.' },
      { say: '구멍이 가로세로로 늘어선 판에서는 <b>가로와 세로로만</b> 뛸 수 있어. 대각선은 안 돼. 뛸 수 있는 수를 하나 찾아서 뛰어 봐!', done: '맞아! 곧게 가로나 세로로만.' },
      { say: '한 번 뛰면 한 수. 하지만 같은 구슬로 <b>계속 몇 번이든</b> 뛸 수 있어. 잘 이으면 한꺼번에 줄일 수 있지. 구슬이 <b>하나만 남을 때까지</b> 뛰어 봐!', done: '두 번 연속으로 뛰어서 하나 남았어! 뛸 구슬이 없으면 거기서 끝이야.' },
      { say: '목표는 <b>마지막에 하나만 남기기</b>. 금색 고리의 <b>◎ 구멍</b>에 남기면 <b>완벽</b>! 이건 옛날부터 있는 "십자가" 모양이야. 뛰는 순서를 생각해 봐.', done: '퍼펙트! ◎ 구멍에 딱 하나. 순서를 생각하는 게 이 퍼즐의 재미야.' },
      { say: '삼각형 판에서는 <b>대각선</b>을 따라서도 뛸 수 있어(6방향). 대각선을 따라 뛰어 봐!', done: '대각선으로도 뛰었네! 판 모양이 바뀌면 생각하는 법도 확 달라져.' },
      { say: '이제 규칙은 완벽해! 기본은 이 영국식 33구멍 판, <b>가운데를 비우고 가운데에 하나 남기기</b>. 잘 이으면 <b>최단 18수</b>로 풀 수 있어. 5가지 판, 퍼즐집, 오늘의 문제도 기다리고 있어. 자, 놀아 보자!' },
    ] },
    es: { name: 'Bille', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: 'No puede saltar ahí', sel: 'Primero toca la canica que salta', stuck: 'Esa canica no puede saltar ahora', diag: '¡No se salta en diagonal: solo vertical u horizontal!', want: 'Esta vez, sigue la tarea', retry: '¡Casi! Prueba otra vez',
      s: [
      { say: '¡Bonjour! Soy <b>Bille</b>, una canica de Francia. Hoy aprendemos el <b>solitario</b>, el rompecabezas para uno que hizo furor en la corte francesa del siglo XVII. Empezamos en este tablero de 33 huecos con solo el centro vacío.' },
      { say: 'Una canica <b>salta sobre la vecina</b>, en vertical u horizontal, hasta el <b>hueco vacío</b> de detrás. La saltada se retira. ¡Toca la canica que brilla a la izquierda y hazla saltar al hueco que brilla!', done: '¡Clac! La canica capturada rodó a la <b>ranura</b> del borde.' },
      { say: 'En los tableros con los huecos en filas y columnas solo se salta <b>en vertical u horizontal</b>, nunca en diagonal. ¡Busca un salto posible y hazlo!', done: '¡Eso es! Solo en línea recta.' },
      { say: 'Cada salto es un movimiento, pero la misma canica puede <b>seguir saltando</b>: encadena saltos para vaciar rápido. ¡Salta hasta que quede <b>una sola canica</b>!', done: '¡Dos saltos seguidos y queda una! Cuando ninguna canica puede saltar, se acaba la partida.' },
      { say: 'El objetivo es <b>dejar una sola canica</b>. ¡En el <b>hueco ◎</b> del aro dorado es <b>perfecto</b>! Es la vieja figura de la “cruz”: piensa en el orden.', done: '¡Perfecto! Una canica justo en ◎. Pensar el orden es toda la gracia.' },
      { say: 'En el tablero triangular también se salta <b>por las líneas inclinadas</b> (seis direcciones). ¡Haz un salto en diagonal!', done: '¡Aquí sí se salta en diagonal! Otro tablero, otra forma de pensar.' },
      { say: '¡Ya sabes las reglas! El clásico es este tablero inglés de 33: <b>vaciar el centro y terminar en el centro</b>. Bien encadenado, se resuelve en solo <b>18 movimientos</b>. Te esperan cinco tableros, un libro de problemas y el problema del día. ¡A jugar!' },
    ] },
    fr: { name: 'Bille', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Elle ne peut pas sauter là', sel: 'Touche d’abord la bille qui saute', stuck: 'Cette bille ne peut pas sauter pour l’instant', diag: 'Pas de saut en diagonale : en ligne ou en colonne seulement !', want: 'Cette fois, suis la consigne', retry: 'Presque ! Essaie encore',
      s: [
      { say: 'Bonjour ! Moi, c’est <b>Bille</b>, une bille française. Aujourd’hui on apprend le <b>solitaire</b>, le casse-tête pour une personne qui faisait fureur à la cour de France au XVIIe siècle. On commence sur ce plateau de 33 trous dont seul le centre est vide.' },
      { say: 'Une bille <b>saute par-dessus sa voisine</b>, en ligne ou en colonne, jusqu’au <b>trou vide</b> juste derrière. La bille sautée est prise. Touche la bille qui brille à gauche et fais-la sauter dans le trou lumineux !', done: 'Clac ! La bille prise a roulé dans la <b>rainure</b> du bord.' },
      { say: 'Sur les plateaux aux trous en lignes et colonnes, on saute <b>seulement en ligne ou en colonne</b>, jamais en diagonale. Trouve un saut possible et joue-le !', done: 'Exactement ! Tout droit seulement.' },
      { say: 'Chaque saut est un coup, mais la même bille peut <b>continuer à sauter</b> : enchaîne pour vider vite. Saute jusqu’à ce qu’il ne reste <b>qu’une bille</b> !', done: 'Deux sauts d’affilée, une seule bille ! Quand plus aucune bille ne peut sauter, la partie est finie.' },
      { say: 'Le but : <b>laisser une seule bille</b>. Sur le <b>trou ◎</b> de l’anneau doré, c’est <b>parfait</b> ! Voici la vieille figure de la « croix » : réfléchis à l’ordre.', done: 'Parfait ! Une bille pile sur ◎. Trouver l’ordre, c’est tout le plaisir du jeu.' },
      { say: 'Sur le plateau triangulaire, on saute aussi <b>le long des lignes obliques</b> (six directions). Fais un saut en oblique !', done: 'Ici, on saute aussi en oblique ! Nouveau plateau, nouvelle façon de penser.' },
      { say: 'Tu connais les règles ! Le classique, c’est ce plateau anglais de 33 trous : <b>vider le centre et finir au centre</b>. Bien enchaîné, il se résout en <b>18 coups</b> seulement. Cinq plateaux, un recueil de problèmes et le problème du jour t’attendent. Allez, on joue !' },
    ] },
    pt: { name: 'Bille', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode saltar aí', sel: 'Primeiro toque na bolinha que salta', stuck: 'Essa bolinha não pode saltar agora', diag: 'Não se salta na diagonal: só vertical ou horizontal!', want: 'Desta vez, siga a tarefa', retry: 'Quase! Tente de novo',
      s: [
      { say: 'Bonjour! Eu sou a <b>Bille</b>, uma bolinha de gude da França. Hoje vamos aprender o <b>Resta Um</b>, o quebra-cabeça para uma pessoa que virou febre na corte francesa no século XVII. Começamos neste tabuleiro de 33 buracos com só o centro vazio.' },
      { say: 'Uma bolinha <b>salta sobre a vizinha</b>, na vertical ou horizontal, até o <b>buraco vazio</b> logo atrás. A saltada sai. Toque na bolinha que brilha à esquerda e salte até o buraco que brilha!', done: 'Clac! A bolinha capturada rolou para o <b>sulco</b> da borda.' },
      { say: 'Nos tabuleiros com os buracos em linhas e colunas só se salta <b>na vertical ou horizontal</b>, nunca na diagonal. Ache um salto possível e faça-o!', done: 'Isso! Só em linha reta.' },
      { say: 'Cada salto é um lance, mas a mesma bolinha pode <b>continuar saltando</b>: encadeie para esvaziar rápido. Salte até sobrar <b>uma só bolinha</b>!', done: 'Dois saltos seguidos, resta uma! Quando nenhuma bolinha pode saltar, o jogo acaba.' },
      { say: 'O objetivo é <b>deixar uma só bolinha</b>. No <b>buraco ◎</b> do anel dourado é <b>perfeito</b>! Esta é a velha figura da “cruz”: pense na ordem.', done: 'Perfeito! Uma bolinha bem no ◎. Pensar na ordem é toda a graça.' },
      { say: 'No tabuleiro triangular também se salta <b>pelas linhas inclinadas</b> (seis direções). Faça um salto na diagonal!', done: 'Aqui dá para saltar na diagonal! Outro tabuleiro, outro jeito de pensar.' },
      { say: 'Agora você sabe as regras! O clássico é este tabuleiro inglês de 33: <b>esvaziar o centro e terminar no centro</b>. Bem encadeado, sai em apenas <b>18 lances</b>. Cinco tabuleiros, um livro de problemas e o desafio do dia estão esperando. Vamos jogar!' },
    ] },
    de: { name: 'Bille', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dorthin kann sie nicht springen', sel: 'Tippe zuerst die Murmel an, die springt', stuck: 'Diese Murmel kann gerade nicht springen', diag: 'Diagonal geht nicht – nur senkrecht oder waagerecht!', want: 'Diesmal bitte genau die Aufgabe', retry: 'Knapp! Versuch es noch einmal',
      s: [
      { say: 'Bonjour! Ich bin <b>Bille</b>, eine Murmel aus Frankreich. Heute lernen wir <b>Solitär</b>, das Geduldspiel für eine Person, das im 17. Jahrhundert am französischen Hof in Mode war. Wir beginnen auf diesem Brett mit 33 Löchern, nur die Mitte ist frei.' },
      { say: 'Eine Murmel <b>springt über ihre Nachbarin</b>, senkrecht oder waagerecht, ins <b>leere Loch</b> dahinter. Die übersprungene wird geschlagen. Tippe die leuchtende Murmel links an und lass sie ins leuchtende Loch springen!', done: 'Klack! Die geschlagene Murmel ist in die <b>Rille</b> am Rand gerollt.' },
      { say: 'Auf Brettern mit Löchern in Reihen und Spalten springt man <b>nur senkrecht oder waagerecht</b>, nie diagonal. Finde einen möglichen Sprung und mach ihn!', done: 'Genau! Nur geradeaus.' },
      { say: 'Jeder Sprung ist ein Zug, aber dieselbe Murmel darf <b>weiterspringen</b> – verkette Sprünge, um schnell abzuräumen. Springe, bis <b>nur eine Murmel</b> übrig ist!', done: 'Zwei Sprünge hintereinander, eine Murmel übrig! Kann keine Murmel mehr springen, ist das Spiel vorbei.' },
      { say: 'Ziel: <b>nur eine Murmel übrig lassen</b>. Im <b>Loch ◎</b> mit dem goldenen Ring ist es <b>perfekt</b>! Das ist die alte Figur „Kreuz“ – denk an die Reihenfolge.', done: 'Perfekt! Genau eine Murmel auf ◎. Die Reihenfolge zu finden, macht den ganzen Reiz aus.' },
      { say: 'Auf dem Dreiecksbrett springt man auch <b>entlang der schrägen Linien</b> (sechs Richtungen). Mach einen schrägen Sprung!', done: 'Hier geht es auch schräg! Ein neues Brett, ein neues Denken.' },
      { say: 'Jetzt kennst du die Regeln! Der Klassiker ist dieses englische Brett mit 33 Löchern: <b>Mitte frei, Ende in der Mitte</b>. Gut verkettet geht es in nur <b>18 Zügen</b>. Fünf Bretter, ein Rätselbuch und die Tagesaufgabe warten. Los geht’s!' },
    ] },
    ru: { name: 'Бийе', next: 'Далее', back: 'Назад', start: 'Играть', again: 'Ещё раз', tap: 'Нажми на светящееся место', nope: 'Туда прыгнуть нельзя', sel: 'Сначала нажми на шарик, который прыгает', stuck: 'Этот шарик сейчас не может прыгнуть', diag: 'По диагонали нельзя — только по вертикали или горизонтали!', want: 'На этот раз — точно по заданию', retry: 'Почти! Попробуй ещё раз',
      s: [
      { say: 'Бонжур! Я <b>Бийе</b>, шарик из Франции. Сегодня учимся <b>солитеру</b> — головоломке для одного, модной при французском дворе в XVII веке. Начнём с этой доски на 33 лунки, где пуст только центр.' },
      { say: 'Шарик <b>перепрыгивает соседний</b> по вертикали или горизонтали в <b>пустую лунку</b> за ним. Перепрыгнутый снимается. Нажми на светящийся шарик слева и прыгни в светящуюся лунку!', done: 'Щёлк! Снятый шарик скатился в <b>желобок</b> по краю.' },
      { say: 'На досках с лунками рядами и столбцами прыгают <b>только по вертикали и горизонтали</b>, по диагонали нельзя. Найди возможный прыжок и сделай его!', done: 'Верно! Только прямо.' },
      { say: 'Каждый прыжок — один ход, но тот же шарик может <b>прыгать дальше</b>: связывай прыжки, чтобы быстро расчистить доску. Прыгай, пока не останется <b>один шарик</b>!', done: 'Два прыжка подряд — остался один! Когда прыгать больше некому, игра окончена.' },
      { say: 'Цель — <b>оставить один шарик</b>. В <b>лунке ◎</b> с золотым кольцом — <b>идеально</b>! Это старинная фигура «крест»: подумай о порядке.', done: 'Идеально! Ровно один шарик на ◎. Найти порядок — в этом вся прелесть.' },
      { say: 'На треугольной доске прыгают и <b>вдоль наклонных линий</b> (шесть направлений). Сделай наклонный прыжок!', done: 'Здесь можно и наискосок! Другая доска — другое мышление.' },
      { say: 'Теперь ты знаешь правила! Классика — эта английская доска на 33 лунки: <b>освободить центр и закончить в центре</b>. Если хорошо связывать прыжки, хватит <b>18 ходов</b>. Пять досок, сборник задач и задача дня уже ждут. Играем!' },
    ] },
    tr: { name: 'Bille', next: 'Sonraki', back: 'Geri', start: 'Oyna', again: 'Tekrar', tap: 'Parlayan yere dokun', nope: 'Oraya atlayamaz', sel: 'Önce atlayacak bilyeye dokun', stuck: 'Bu bilye şu an atlayamaz', diag: 'Çapraz atlanmaz — yalnızca dikey ya da yatay!', want: 'Bu sefer göreve uy', retry: 'Az kaldı! Bir daha dene',
      s: [
      { say: 'Bonjour! Ben <b>Bille</b>, Fransa’dan bir bilye. Bugün 17. yüzyıl Fransız sarayında moda olan tek kişilik bulmaca <b>peg solitaire</b>’i öğrenelim! Yalnızca ortası boş bu 33 delikli tahtayla başlıyoruz.' },
      { say: 'Bilye dikey ya da yatay olarak <b>komşu bilyenin üzerinden</b> hemen arkadaki <b>boş deliğe</b> atlar. Atlanan bilye alınır. Soldaki parlayan bilyeye dokun ve parlayan deliğe atlat!', done: 'Tık! Alınan bilye kenardaki <b>oluğa</b> yuvarlandı.' },
      { say: 'Delikleri satır ve sütun hâlinde dizili tahtalarda yalnızca <b>dikey ve yatay</b> atlanır, çapraz asla. Mümkün bir atlayış bul ve yap!', done: 'Aynen! Yalnızca düz.' },
      { say: 'Her atlayış bir hamledir ama aynı bilye <b>atlamaya devam edebilir</b>: atlayışları zincirleyip hızla temizle. <b>Tek bilye</b> kalana kadar atla!', done: 'Art arda iki atlayış, tek bilye kaldı! Hiçbir bilye atlayamazsa oyun biter.' },
      { say: 'Amaç <b>tek bilye bırakmak</b>. Altın halkadaki <b>◎ deliğinde</b> bırakırsan <b>kusursuz</b>! Bu eski “haç” şekli — sırayı düşün.', done: 'Kusursuz! ◎ deliğinde tam bir bilye. Sırayı bulmak bu bulmacanın asıl keyfi.' },
      { say: 'Üçgen tahtada <b>eğik çizgiler boyunca</b> da atlanır (altı yön). Eğik bir atlayış yap!', done: 'Burada eğik de atlanıyor! Yeni tahta, yeni düşünme biçimi.' },
      { say: 'Artık kuralları biliyorsun! Klasik olan bu 33 delikli İngiliz tahtası: <b>ortayı boşalt, ortada bitir</b>. İyi zincirlenirse yalnızca <b>18 hamlede</b> çözülür. Beş tahta, bulmaca kitabı ve günün bulmacası seni bekliyor. Haydi oynayalım!' },
    ] },
    id: { name: 'Bille', next: 'Lanjut', back: 'Kembali', start: 'Main', again: 'Lagi', tap: 'Ketuk titik yang bersinar', nope: 'Tidak bisa melompat ke sana', sel: 'Ketuk dulu kelereng yang melompat', stuck: 'Kelereng itu belum bisa melompat', diag: 'Tidak bisa diagonal — hanya vertikal atau horizontal!', want: 'Kali ini, ikuti tugasnya', retry: 'Hampir! Coba sekali lagi',
      s: [
      { say: 'Bonjour! Aku <b>Bille</b>, kelereng dari Prancis. Hari ini kita belajar <b>peg solitaire</b>, teka-teki untuk satu orang yang populer di istana Prancis abad ke-17. Kita mulai di papan 33 lubang ini, hanya bagian tengahnya yang kosong.' },
      { say: 'Kelereng <b>melompati kelereng di sebelahnya</b>, vertikal atau horizontal, ke <b>lubang kosong</b> di baliknya. Yang dilompati diambil. Ketuk kelereng yang bersinar di kiri dan lompatkan ke lubang yang bersinar!', done: 'Klak! Kelereng yang diambil menggelinding ke <b>alur</b> di tepi papan.' },
      { say: 'Di papan dengan lubang berbaris lurus, lompatan hanya <b>vertikal atau horizontal</b>, tidak pernah diagonal. Cari satu lompatan yang bisa lalu lakukan!', done: 'Betul! Hanya lurus.' },
      { say: 'Setiap lompatan satu langkah, tapi kelereng yang sama boleh <b>terus melompat</b>: rangkai lompatan untuk mengosongkan papan dengan cepat. Lompatlah sampai tinggal <b>satu kelereng</b>!', done: 'Dua lompatan beruntun, tinggal satu! Kalau tak ada kelereng yang bisa melompat, permainan selesai.' },
      { say: 'Tujuannya <b>menyisakan satu kelereng</b>. Di <b>lubang ◎</b> bercincin emas itu <b>sempurna</b>! Ini bentuk kuno “salib” — pikirkan urutannya.', done: 'Sempurna! Tepat satu kelereng di ◎. Mencari urutannya itulah serunya.' },
      { say: 'Di papan segitiga, kelereng juga melompat <b>sepanjang garis miring</b> (enam arah). Lakukan lompatan miring!', done: 'Di sini bisa miring juga! Papan baru, cara berpikir baru.' },
      { say: 'Sekarang kamu tahu aturannya! Yang klasik adalah papan Inggris 33 lubang ini: <b>kosongkan tengah, selesaikan di tengah</b>. Kalau dirangkai dengan baik, cukup <b>18 langkah</b>. Lima papan, buku teka-teki, dan soal harian menunggumu. Ayo main!' },
    ] },
    hi: { name: 'बीये', next: 'आगे', back: 'पीछे', start: 'खेलो', again: 'फिर से', tap: 'चमकती जगह पर टैप करो', nope: 'वहाँ नहीं कूद सकती', sel: 'पहले कूदने वाली गोली पर टैप करो', stuck: 'यह गोली अभी नहीं कूद सकती', diag: 'तिरछा नहीं — सिर्फ़ ऊपर-नीचे या दाएँ-बाएँ!', want: 'इस बार काम के हिसाब से कूदो', retry: 'बस ज़रा सा! एक बार और',
      s: [
      { say: 'बोंजूर! मैं <b>बीये</b> हूँ, फ़्रांस की एक कंचे की गोली। आज सीखते हैं <b>पेग सॉलिटेयर</b>, अकेले की वह पहेली जो 17वीं सदी में फ़्रांसीसी दरबार में बहुत चली। हम इस 33 छेदों वाले बोर्ड से शुरू करेंगे, जिसमें सिर्फ़ बीच का छेद ख़ाली है।' },
      { say: 'गोली ऊपर-नीचे या दाएँ-बाएँ <b>पड़ोसी गोली के ऊपर से</b> ठीक आगे के <b>ख़ाली छेद</b> में कूदती है। जिसके ऊपर से कूदी, वह हट जाती है। बाईं ओर की चमकती गोली पर टैप करो और चमकते छेद में कुदाओ!', done: 'खट! हटी हुई गोली किनारे की <b>नाली</b> में लुढ़क गई।' },
      { say: 'पंक्तियों-स्तंभों में छेदों वाले बोर्डों पर <b>सिर्फ़ ऊपर-नीचे या दाएँ-बाएँ</b> कूदते हैं, तिरछा कभी नहीं। एक संभव छलाँग ढूँढो और लगाओ!', done: 'बिल्कुल! सिर्फ़ सीधा।' },
      { say: 'हर छलाँग एक चाल है, पर वही गोली <b>लगातार कूद सकती है</b>: छलाँगें जोड़कर जल्दी साफ़ करो। तब तक कूदो जब तक <b>एक ही गोली</b> न बचे!', done: 'लगातार दो छलाँगें, एक गोली बची! जब कोई गोली न कूद सके, खेल ख़त्म।' },
      { say: 'लक्ष्य है <b>सिर्फ़ एक गोली छोड़ना</b>। सुनहरे छल्ले वाले <b>◎ छेद</b> में बचे तो <b>परफ़ेक्ट</b>! यह पुराना “क्रॉस” आकार है — क्रम सोचो।', done: 'परफ़ेक्ट! ◎ पर ठीक एक गोली। क्रम ढूँढना ही इस पहेली का मज़ा है।' },
      { say: 'त्रिकोण बोर्ड पर <b>तिरछी रेखाओं के साथ</b> भी कूद सकते हैं (छह दिशाएँ)। एक तिरछी छलाँग लगाओ!', done: 'यहाँ तिरछा भी चलता है! नया बोर्ड, सोचने का नया ढंग।' },
      { say: 'अब तुम नियम जानते हो! क्लासिक है यह 33 छेदों वाला अंग्रेज़ी बोर्ड: <b>बीच ख़ाली करो, बीच में ख़त्म करो</b>। अच्छे से जोड़ो तो सिर्फ़ <b>18 चालों</b> में हल। पाँच बोर्ड, पहेलियों की किताब और रोज़ की पहेली इंतज़ार में हैं। चलो खेलें!' },
    ] },
    ar: { name: 'بييه', next: 'التالي', back: 'رجوع', start: 'العب', again: 'مرة أخرى', tap: 'المس مكانًا مضيئًا', nope: 'لا تستطيع القفز إلى هناك', sel: 'المس أولًا الكرة التي تقفز', stuck: 'هذه الكرة لا تستطيع القفز الآن', diag: 'لا قفز قطري — عموديًا أو أفقيًا فقط!', want: 'هذه المرة اتبع المهمة', retry: 'قريب جدًا! حاول مرة أخرى',
      s: [
      { say: 'بونجور! أنا <b>بييه</b>، كرة زجاجية من فرنسا. اليوم نتعلم <b>سوليتير الأوتاد</b>، لغز اللاعب الواحد الذي انتشر في البلاط الفرنسي في القرن السابع عشر. نبدأ على هذه اللوحة ذات الـ33 حفرة، والوسط وحده فارغ.' },
      { say: 'تقفز الكرة <b>فوق جارتها</b> عموديًا أو أفقيًا إلى <b>الحفرة الفارغة</b> خلفها مباشرة، وتُرفع الكرة التي قُفز فوقها. المس الكرة المضيئة على اليسار واقفز بها إلى الحفرة المضيئة!', done: 'طَق! تدحرجت الكرة المأخوذة إلى <b>المجرى</b> على الحافة.' },
      { say: 'على اللوحات ذات الحفر المصفوفة صفوفًا وأعمدة يكون القفز <b>عموديًا أو أفقيًا فقط</b>، وليس قطريًا أبدًا. جد قفزة ممكنة ونفّذها!', done: 'تمامًا! مستقيمًا فقط.' },
      { say: 'كل قفزة نقلة، لكن الكرة نفسها تستطيع <b>مواصلة القفز</b>: صِل القفزات لتُفرغ اللوحة بسرعة. اقفز حتى تبقى <b>كرة واحدة</b>!', done: 'قفزتان متتاليتان وبقيت واحدة! حين لا تستطيع أي كرة القفز تنتهي اللعبة.' },
      { say: 'الهدف <b>إبقاء كرة واحدة</b>. وعلى <b>الحفرة ◎</b> ذات الحلقة الذهبية تكون <b>مثاليًا</b>! هذا شكل «الصليب» القديم — فكّر في الترتيب.', done: 'مثالي! كرة واحدة تمامًا على ◎. إيجاد الترتيب هو متعة هذا اللغز.' },
      { say: 'على اللوحة المثلثة يمكن القفز أيضًا <b>على الخطوط المائلة</b> (ست جهات). نفّذ قفزة مائلة!', done: 'هنا يجوز القفز المائل أيضًا! لوحة جديدة وطريقة تفكير جديدة.' },
      { say: 'صرت تعرف القواعد! الكلاسيكية هي هذه اللوحة الإنجليزية ذات الـ33 حفرة: <b>أفرغ الوسط وانتهِ في الوسط</b>. بالوصل الجيد تُحل في <b>18 نقلة</b> فقط. خمس لوحات وكتاب ألغاز ولغز اليوم بانتظارك. هيا نلعب!' },
    ] },
  };

  /* ---------- little sounds: a clack, a roll, a chime, and a chirpy voice ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const lift = () => tone(620, 900, .06, .05, 'triangle');
    const clack = () => { tone(2400, 1800, .04, .08, 'triangle'); tone(1300, 900, .05, .05, 'sine', .01); };
    const roll = () => { for (let k = 0; k < 6; k++) tone(900 - k * 60, 0, .03, .03, 'triangle', k * .05); };
    const chime = () => [1046.5, 1318.5, 1568].forEach((f, i) => tone(f, 0, .45, .07, 'triangle', i * .07));
    const blip = () => { const f = 620 + Math.random() * 260; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { lift, clack, roll, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en, P3 = T3.peg;
    let E = null, B = null, board = null, U = null, TOP = .5, marks = null;
    let a = null, pcs = {}, taken = [], step = 0, stopped = false, busy = false, played = false, sel = -1, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const hole = rc => B.at[rc[0] + ',' + rc[1]];
    const count = () => a.reduce((s, v) => s + v, 0);

    /* ---------- the board (rebuilt when a step uses another one) ---------- */
    function useBoard(id) {
      if (B && B.id === id && board) return false;
      B = E.BOARDS[id]; board = P3.board(id); U = board.userData; TOP = U.top;
      marks = new TH.Group(); board.add(marks); addPulse();
      pcs = {}; taken = [];
      T3.show('peg', board); T3.play(true);
      if (T3.fit) T3.fit({ w: U.W + .6, d: U.H + 1.6, y: TOP + .4, pitch: 1.0 });
      return true;
    }
    function mkMarble(i) { const m = P3.marble(i), sh = T3.contact(P3.R * 1.05, .5); sh.position.y = .004; m.add(sh); m.userData.sh = sh; board.add(m); return m; }
    function lift(g, h) { g.position.y = TOP + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .004 - h; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); } }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setBoard(spec) {   // diff against what is already there: the same marbles stay, new ones drop in
      const want = new Array(B.n).fill(0);
      if (spec === 'full') { for (let i = 0; i < B.n; i++) want[i] = 1; want[B.center] = 0; } else spec.forEach(rc => { want[hole(rc)] = 1; });
      a = want; const old = pcs; pcs = {}; let n = 0; const tot = want.reduce((s, v) => s + v, 0), gap = Math.min(70, 1400 / Math.max(1, tot));
      taken.forEach(drop); taken = [];
      for (let i = 0; i < B.n; i++) {
        if (!want[i]) continue;
        if (old[i]) { pcs[i] = old[i]; delete old[i]; const [x, z] = U.pt(i); pcs[i].position.x = x; pcs[i].position.z = z; pcs[i].visible = true; lift(pcs[i], 0); continue; }
        const g = mkMarble(i), [x, z] = U.pt(i); g.position.set(x, TOP, z); pcs[i] = g; g.visible = false; const d = 40 + (n++) * gap;
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.4), () => { lift(g, 0); land(g); if (n < 12 || Math.random() < .3) SFX.clack(); }); }, d);
      }
      Object.values(old).forEach(drop);
      kick(300);
      return Math.min(n, 1400 / 70);
    }

    /* ---------- marks ---------- */
    function clearMarks() { if (!marks) return; while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    const bm = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function disc(i, color, op = .45) { const g = new TH.CircleGeometry(.4, 32); g.rotateX(-Math.PI / 2); const m = new TH.Mesh(g, bm(color, op)); const [x, z] = U.pt(i); m.position.set(x, TOP + .008, z); m.userData.pulse = true; m.userData.flat = true; m.userData.op = op; m.renderOrder = 2; marks.add(m); return m; }
    function ring(i, color, pulse = true, r = .44) { const m = new TH.Mesh(new TH.TorusGeometry(r, .05, 8, 44), bm(color, .95)); m.rotation.x = Math.PI / 2; const [x, z] = U.pt(i); m.position.set(x, TOP + .05, z); m.userData.pulse = pulse; m.userData.torus = true; m.renderOrder = 2; marks.add(m); return m; }
    function dot(i, color) { const m = new TH.Mesh(new TH.CylinderGeometry(.12, .12, .012, 24), bm(color, .9)); const [x, z] = U.pt(i); m.position.set(x, TOP + .03, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m; }
    let pulseOn = false;
    function pulse() { if (stopped || !marks) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (!m.userData.flat) { const s = .88 + k * .24; m.scale.set(s, m.userData.torus ? s : 1, s); } m.material.opacity = (m.userData.op || .9) * (.55 + .45 * k); } }); if (any) { kick(80); requestAnimationFrame(pulse); } else pulseOn = false; }
    function addPulse() { const add0 = marks.add.bind(marks); marks.add = (...x) => { const r = add0(...x); kick(150); if (!pulseOn && !stopped) { pulseOn = true; requestAnimationFrame(pulse); } return r; }; }

    // the jumps the task accepts
    const slanted = j => B.cells[j[0]][0] !== B.cells[j[2]][0];   // the triangle: every line but the rows reads as slanted
    function accepted(st) {
      const all = E.moves(B, a);
      if (st.act === 'jump') return all.filter(j => j[0] === hole(st.from) && j[2] === hole(st.to));
      if (st.act === 'slant') return all.filter(slanted);
      return all;
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.goal) ring(hole(st.goal), 0xf1c879, false, .4);
      (st.glow || []).forEach(rc => disc(hole(rc), 0xffc94a, .4));
      if (!st.act || played) return;
      const A = accepted(st);
      if (sel >= 0) {
        ring(sel, 0xffc94a);
        E.moves(B, a).filter(j => j[0] === sel).forEach(j => dot(j[2], A.includes(j) ? 0x3fe0c4 : 0xc8f07a));
        return;
      }
      new Set(A.map(j => j[0])).forEach(f => ring(f, 0x3fe0c4));
      if (st.act === 'jump') disc(hole(st.to), 0x3fe0c4, .35);
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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 34);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
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
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && played && !STEPS[step].last) go(step + 1); }, ms); }   // (the timer only draws the fill: the move on is ours)
    function go(n, quiet) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; sel = -1;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step], fresh = useBoard(st.b);
      clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(st.p);
      later(showTask, (fresh ? 600 : 380) + cnt * 60);
      if (!quiet) say(L.s[step].say);
      buttons();
    }
    function finish() {
      played = true; busy = false; sel = -1; clearMarks();
      const st = STEPS[step];
      if (st.goal) ring(hole(st.goal), 0xf1c879, false, .4);
      if (L.s[step].done) say(L.s[step].done);
      SFX.chime();
      if (st.act === 'goal' || st.act === 'clear') Object.values(pcs).forEach(g => anim(700, k => lift(g, Math.sin(k * Math.PI) * .7)));
      buttons(); autoNext();
    }
    function fail() { busy = true; say(L.retry); later(() => go(step, true), 1700); }
    function cellOf(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      let best = -1, bd = .5; for (let i = 0; i < B.n; i++) { const [x, z] = U.pt(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return best;
    }

    /* ---------- a jump: the marble hops over in an arc, the one jumped over rolls off into the groove ---------- */
    function select(i) {
      deselect(true); sel = i; const g = pcs[i]; if (g) anim(130, k => lift(g, .22 * io(k)));
      SFX.lift(); showTask();
    }
    function deselect(quiet) { if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = g.userData.h0 || 0; if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = -1; if (!quiet) showTask(); }
    function jump(j) {
      busy = true; clearMarks(); const [f, o, t] = j, g = pcs[f], v = pcs[o]; sel = -1;
      delete pcs[f]; delete pcs[o]; pcs[t] = g; a = E.apply(a, j);
      const [x0, z0] = U.pt(f), [x1, z1] = U.pt(t), h0 = g.userData.h0 || 0;
      anim(420, k => { const q = io(k); g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q; lift(g, Math.sin(k * Math.PI) * .95 + h0 * (1 - k)); g.rotation.z = -q * Math.PI * 1.2 * Math.sign(x1 - x0 || 1); },
        () => { g.rotation.z = 0; lift(g, 0); land(g); SFX.clack(); });
      if (v) later(() => {   // the jumped marble: a little hop out of its cup, then a roll along to the groove
        const [vx, vz] = U.pt(o), [gx, gy, gz] = U.groove(taken.length); taken.push(v); SFX.roll();
        const sh = v.userData.sh; if (sh) { v.remove(sh); sh.material.dispose(); v.userData.sh = null; }
        anim(620, k => { const q = io(k); v.position.x = vx + (gx - vx) * q; v.position.z = vz + (gz - vz) * q; v.position.y = TOP + (gy - P3.R * .78 - TOP) * q + Math.sin(k * Math.PI) * .45; const s = 1 - .15 * q; v.scale.set(s, s, s); v.rotation.x = q * 6; });
      }, 260);
      later(after, 700);
    }
    function after() {
      busy = false; const st = STEPS[step], n = count(), more = E.moves(B, a).length > 0;
      if (st.act === 'clear') { if (n === 1) return finish(); if (!more) return fail(); return showTask(); }
      if (st.act === 'goal') { if (n === 1) return a[hole(st.goal)] ? finish() : fail(); if (!more) return fail(); return showTask(); }
      finish();
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = cellOf(e); if (i < 0) { if (sel >= 0) deselect(); return; }
      if (a[i]) {
        if (sel === i) { deselect(); return; }
        if (!E.moves(B, a).some(j => j[0] === i)) { say(L.stuck); return; }
        select(i); return;
      }
      if (sel < 0) { say(L.sel); return; }
      const j = E.moves(B, a).find(m => m[0] === sel && m[2] === i);
      if (!j) { const [r0, c0] = B.cells[sel], [r1, c1] = B.cells[i]; say(!B.tri && Math.abs(r1 - r0) === 2 && Math.abs(c1 - c0) === 2 ? L.diag : L.nope); return; }
      if (!accepted(st).includes(j)) { say(L.want); return; }
      jump(j);
    }
    $('[data-a=next]').onclick = () => { if (STEPS[step].last) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (STEPS[step].last && ctx.onExit) ctx.onExit(); else go(step - 1); };
    const sfxBtn = $('[data-a=sfx]'), paintSfx = () => { sfxBtn.classList.toggle('off', !SFX.on); sfxBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/>${SFX.on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>' : '<path d="m23 9-6 6M17 9l6 6"/>'}</svg>`; };
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
    loadEngine().then(e => { if (stopped) return; E = e; later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-peg-rules-seen', '1'); } catch (e) {}
    const dbg = { step: () => step, acc: () => STEPS[step].act ? accepted(STEPS[step]).map(j => j.map(i => B.cells[i].join(','))) : null,
      at: rc => { const [x, z] = U.pt(hole(rc)); return T3.project ? T3.project(x, z, TOP) : null; }, sel: () => sel, played: () => played, count };
    window.__pgRules = dbg;
    return {
      stop() { stopped = true; if (window.__pgRules === dbg) delete window.__pgRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.peg = { start };
})();
