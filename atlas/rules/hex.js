/* =====================================================================
   Hex rules — a guided tour on the 3D walnut hex board (5 × 5), told by the guide
   character (Stoneguin, as in go and gomoku). Hands-on and gentle: placing a stone,
   joining your two edges, blocking, the bridge, the edge template, no draws, the swap rule.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Cells are written 'c3' (column letter a–e from the left, row 1–5 from the far side).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-stone.webp', N = 5;
  const ix = s => (+s.slice(1) - 1) * N + 'abcde'.indexOf(s[0]);
  const nm = i => 'abcde'[i % N] + (Math.floor(i / N) + 1);
  const TXT = {
 ja: { name: 'ゴイシペン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っているマスをタップ', nope: 'そこじゃないよ〜。光っているマスをタップしてね', win: 'つながった！', block: '止めた！', save: 'つながったまま！', swap: 'スワップ！', r: '赤', b: '青',
  s: [
   { say: 'ペン！ ぼくは<b>ゴイシペン</b>。きょうは<b>ヘックス</b>のルールを教えるね。六角形のマスが並んだ小さな盤で、ひとつずつやってみよう！' },
   { say: 'ヘックスでは、自分の番に<b>空いているマスならどこにでも</b>石を1つ置くよ。<b>赤が先</b>。光っている真ん中のマスに赤い石を置いてみて！', done: 'コトッ！ 置いた石は動かないし、取られることもないんだ。' },
   { say: '赤は<b>手前と奥の赤い辺</b>を、青は<b>左右の青い辺</b>をつなげたら勝ち。となり合ったマスの石はつながっているよ。光っているマスで、赤の列を辺から辺までつなごう！', done: '<b>つながった！</b> これで赤の勝ちだよ。' },
   { say: 'こんどは青があと1つでつながりそう！ 置いた石は相手の道も<b>ふさぐ</b>んだ。光っているマスに打って止めよう！', done: '<b>止めた！</b> 青の列はそのマスを通れない。守ることも大事だよ。' },
   { say: '間に<b>空きマスが2つ</b>ある2つの石を<b>ブリッジ</b>っていうよ。片方に打たれても、もう片方に打てばつながったまま。いま青がブリッジに割り込んできた！ もう1つのマスに打とう！', done: '受けた！ ブリッジはほとんど「つながっている」のと同じなんだ。' },
   { say: '辺から2段目の石は、下の<b>2マス</b>のどちらかで辺につながる（<b>辺のテンプレート</b>）。青が片方に打ってきたよ。もう片方に打とう！', done: '<b>つながった！</b> 2段目の石は、もう辺についているのと同じなんだ。' },
   { say: 'ヘックスには<b>引き分けがない</b>よ。盤が全部うまると、つながっているのは<b>必ずどちらか一方</b>。相手を完全に止めるには、自分がつながるしかないんだ。' },
   { say: '先手はとても有利。だから<b>スワップルール</b>があるよ。青は赤の1手目のかわりに、その石を<b>自分のもの</b>にできるんだ（盤の長い対角線で折り返した位置へ）。光っている赤い石をタップしてスワップしよう！', done: '<b>スワップ！</b> 赤は強すぎない1手目を考えるようになって、勝負が公平になるよ。' },
   { say: 'これでルールはばっちり！ ブリッジでつなぎながら、自分の2辺を目指そう。小さい盤から始めるのがおすすめだよ。さあ、対局してみよう！' },
  ] },
 en: { name: 'Stoneguin', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap the glowing cell', nope: 'Not there! Tap the glowing cell', win: 'Connected!', block: 'Blocked!', save: 'Still connected!', swap: 'Swap!', r: 'Red', b: 'Blue',
  s: [
   { say: "Hi! I'm <b>Stoneguin</b>. Today let's learn the rules of <b>Hex</b>, one step at a time, on a small board of hexagons!" },
   { say: 'On your turn, put one stone on <b>any empty cell</b>. <b>Red plays first</b>. Tap the glowing centre cell to place a red stone!', done: 'Tock! Stones never move and are never captured.' },
   { say: 'Red wins by joining its <b>near and far red edges</b>, Blue its <b>left and right blue edges</b>. Stones on touching cells are connected. Tap the glowing cell to join the red chain from edge to edge!', done: '<b>Connected!</b> That is a win for Red.' },
   { say: 'Now Blue is one stone from connecting! Your stone also <b>blocks</b> the opponent. Tap the glowing cell to stop Blue!', done: '<b>Blocked!</b> Blue cannot pass through your stone. Defending matters too.' },
   { say: 'Two stones with <b>two empty cells</b> between them form a <b>bridge</b>: if one cell is taken, take the other and stay connected. Blue just intruded into your bridge — take the other cell!', done: 'Saved! A bridge is as good as connected.' },
   { say: 'A stone on the <b>2nd row</b> reaches the edge through either of the <b>two cells</b> below it (an <b>edge template</b>). Blue took one — take the other!', done: '<b>Connected!</b> A 2nd-row stone is as good as on the edge.' },
   { say: 'Hex has <b>no draws</b>. When the board is full, <b>exactly one</b> player is connected: to stop your opponent completely, you must connect yourself.' },
   { say: 'Moving first is a big advantage, so there is the <b>swap rule</b>: instead of playing, Blue may <b>take over</b> Red\'s first stone (it moves to the mirror cell across the long diagonal). Tap the glowing red stone to swap it!', done: '<b>Swap!</b> So Red opens with a move that is not too strong — and the game is fair.' },
   { say: "That's all the rules! Link your stones with bridges and head for your two edges. Start on a small board. Let's play!" },
  ] },
 zh: { name: 'Stoneguin', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的格子', nope: '不是那里哦！点击发光的格子', win: '连通了！', block: '挡住了！', save: '依然相连！', swap: '交换！', r: '红', b: '蓝',
  s: [
   { say: '你好！我是<b>Stoneguin</b>。今天在六边形小棋盘上，一步一步学习<b>六贯棋</b>的规则吧！' },
   { say: '轮到你时，在<b>任意空格</b>放一枚棋子。<b>红方先手</b>。点击发光的中央格子放下红子！', done: '嗒！棋子放下后不会移动，也不会被吃掉。' },
   { say: '红方要连接<b>前后两条红边</b>，蓝方要连接<b>左右两条蓝边</b>。相邻格子的棋子是相连的。点击发光的格子，把红子从一边连到另一边！', done: '<b>连通了！</b>红方获胜。' },
   { say: '现在蓝方再下一子就要连通了！棋子也能<b>挡住</b>对手。点击发光的格子阻止蓝方！', done: '<b>挡住了！</b>蓝方无法穿过你的棋子。防守也很重要。' },
   { say: '中间隔着<b>两个空格</b>的两枚棋子叫<b>桥</b>：对方占一个，你就占另一个，依然相连。蓝方刚插入了你的桥——占住另一个格子！', done: '守住了！桥几乎等于已经相连。' },
   { say: '<b>第二行</b>的棋子可以通过下面<b>两个格子</b>中的任意一个连到边（<b>边模板</b>）。蓝方占了一个——占另一个！', done: '<b>连通了！</b>第二行的棋子几乎等于已经在边上。' },
   { say: '六贯棋<b>没有和棋</b>。棋盘下满时，<b>恰好有一方</b>是连通的：要完全挡住对手，你自己就必须连通。' },
   { say: '先手优势很大，所以有<b>交换规则</b>：蓝方可以不下子，而是<b>拿走</b>红方的第一手（移到沿长对角线对称的格子）。点击发光的红子进行交换！', done: '<b>交换！</b>这样红方会选择不太强的第一手，对局就公平了。' },
   { say: '规则就是这些！用桥连接棋子，朝自己的两条边前进。建议从小棋盘开始。来下一局吧！' },
  ] },
 ko: { name: 'Stoneguin', next: '다음', back: '뒤로', start: '대국해 보기', again: '다시', tap: '빛나는 칸을 탭', nope: '거기가 아니야! 빛나는 칸을 탭해 줘', win: '이어졌다!', block: '막았다!', save: '이어진 채!', swap: '스왑!', r: '빨강', b: '파랑',
  s: [
   { say: '안녕! 나는 <b>Stoneguin</b>. 오늘은 육각형 칸이 놓인 작은 판에서 <b>헥스</b> 규칙을 하나씩 배워 보자!' },
   { say: '자기 차례에는 <b>빈 칸 어디든</b> 돌을 하나 놓아. <b>빨강이 먼저</b>야. 빛나는 가운데 칸에 빨간 돌을 놓아 봐!', done: '톡! 놓은 돌은 움직이지 않고 잡히지도 않아.' },
   { say: '빨강은 <b>앞뒤의 빨간 변</b>을, 파랑은 <b>좌우의 파란 변</b>을 이으면 이겨. 이웃한 칸의 돌은 이어져 있어. 빛나는 칸으로 빨간 줄을 변에서 변까지 이어 봐!', done: '<b>이어졌다!</b> 빨강의 승리야.' },
   { say: '이번엔 파랑이 한 수면 이어질 것 같아! 놓은 돌은 상대의 길도 <b>막아</b>. 빛나는 칸에 두어 막아 보자!', done: '<b>막았다!</b> 파랑은 네 돌을 지나갈 수 없어. 수비도 중요해.' },
   { say: '사이에 <b>빈 칸 두 개</b>가 있는 두 돌을 <b>브리지</b>라고 해. 한쪽을 빼앗겨도 다른 쪽에 두면 이어진 채야. 지금 파랑이 브리지에 끼어들었어 — 다른 칸에 두자!', done: '지켰다! 브리지는 이어진 것과 거의 같아.' },
   { say: '<b>두 번째 줄</b>의 돌은 아래 <b>두 칸</b> 중 하나로 변에 이어져 (<b>변 템플릿</b>). 파랑이 한쪽에 뒀어 — 다른 쪽에 두자!', done: '<b>이어졌다!</b> 두 번째 줄의 돌은 이미 변에 붙은 것과 같아.' },
   { say: '헥스에는 <b>무승부가 없어</b>. 판이 다 차면 이어진 쪽은 <b>반드시 한쪽</b>뿐. 상대를 완전히 막으려면 내가 이어질 수밖에 없거든.' },
   { say: '선수가 아주 유리해서 <b>스왑 규칙</b>이 있어. 파랑은 두는 대신 빨강의 첫 돌을 <b>자기 것</b>으로 만들 수 있어(긴 대각선으로 접은 위치로). 빛나는 빨간 돌을 탭해서 스왑해 봐!', done: '<b>스왑!</b> 그래서 빨강은 너무 강하지 않은 첫 수를 두게 되고, 승부가 공평해져.' },
   { say: '규칙은 이게 다야! 브리지로 이으면서 자기 두 변을 향해 가자. 작은 판부터 추천해. 자, 대국해 보자!' },
  ] },
 es: { name: 'Stoneguin', next: 'Siguiente', back: 'Atrás', start: '¡A jugar!', again: 'Otra vez', tap: 'Toca la casilla que brilla', nope: '¡Ahí no! Toca la casilla que brilla', win: '¡Conectado!', block: '¡Bloqueado!', save: '¡Sigue unido!', swap: '¡Cambio!', r: 'Rojo', b: 'Azul',
  s: [
   { say: '¡Hola! Soy <b>Stoneguin</b>. Hoy aprenderemos las reglas del <b>Hex</b> paso a paso, en un pequeño tablero de hexágonos.' },
   { say: 'En tu turno pon una piedra en <b>cualquier casilla vacía</b>. <b>Rojo empieza</b>. ¡Toca la casilla central que brilla para poner una piedra roja!', done: '¡Toc! Las piedras nunca se mueven ni se capturan.' },
   { say: 'Rojo gana uniendo sus <b>bordes rojos de delante y de detrás</b>; Azul, sus <b>bordes azules de los lados</b>. Las piedras en casillas vecinas están unidas. ¡Toca la casilla que brilla para unir la cadena roja de borde a borde!', done: '<b>¡Conectado!</b> Gana Rojo.' },
   { say: '¡Ahora a Azul le falta una piedra para conectar! Tu piedra también <b>bloquea</b>. ¡Toca la casilla que brilla para detener a Azul!', done: '<b>¡Bloqueado!</b> Azul no puede pasar por tu piedra. Defender también cuenta.' },
   { say: 'Dos piedras con <b>dos casillas vacías</b> entre ellas forman un <b>puente</b>: si te quitan una, toma la otra y sigues unido. Azul acaba de meterse en tu puente: ¡toma la otra casilla!', done: '¡Salvado! Un puente vale tanto como estar unido.' },
   { say: 'Una piedra en la <b>2.ª fila</b> llega al borde por cualquiera de las <b>dos casillas</b> de debajo (una <b>plantilla de borde</b>). Azul tomó una: ¡toma la otra!', done: '<b>¡Conectado!</b> Una piedra en la 2.ª fila ya vale como si estuviera en el borde.' },
   { say: 'En Hex <b>no hay tablas</b>. Con el tablero lleno, <b>exactamente uno</b> está conectado: para frenar del todo al rival, tienes que conectar tú.' },
   { say: 'Empezar da mucha ventaja, por eso existe la <b>regla de cambio</b>: en vez de jugar, Azul puede <b>quedarse</b> la primera piedra roja (pasa a la casilla simétrica por la diagonal larga). ¡Toca la piedra roja que brilla para cambiarla!', done: '<b>¡Cambio!</b> Así Rojo abre con una jugada no demasiado fuerte y la partida es justa.' },
   { say: '¡Esas son todas las reglas! Une tus piedras con puentes y ve hacia tus dos bordes. Empieza en un tablero pequeño. ¡A jugar!' },
  ] },
 fr: { name: 'Stoneguin', next: 'Suivant', back: 'Retour', start: 'On joue !', again: 'Encore', tap: 'Touche la case qui brille', nope: 'Pas là ! Touche la case qui brille', win: 'Relié !', block: 'Bloqué !', save: 'Toujours relié !', swap: 'Échange !', r: 'Rouge', b: 'Bleu',
  s: [
   { say: 'Salut ! Je suis <b>Stoneguin</b>. Aujourd\'hui, apprenons les règles du <b>Hex</b> pas à pas, sur un petit plateau d\'hexagones !' },
   { say: 'À ton tour, pose une pierre sur <b>n\'importe quelle case vide</b>. <b>Rouge commence</b>. Touche la case centrale qui brille pour poser une pierre rouge !', done: 'Toc ! Les pierres ne bougent jamais et ne sont jamais prises.' },
   { say: 'Rouge gagne en reliant ses <b>bords rouges avant et arrière</b>, Bleu ses <b>bords bleus gauche et droit</b>. Des pierres sur des cases voisines sont reliées. Touche la case qui brille pour relier la chaîne rouge d\'un bord à l\'autre !', done: '<b>Relié !</b> Rouge gagne.' },
   { say: 'Maintenant, il manque une seule pierre à Bleu ! Ta pierre <b>bloque</b> aussi l\'adversaire. Touche la case qui brille pour arrêter Bleu !', done: '<b>Bloqué !</b> Bleu ne peut pas traverser ta pierre. Défendre compte aussi.' },
   { say: 'Deux pierres séparées par <b>deux cases vides</b> forment un <b>pont</b> : si on te prend une case, prends l\'autre et tu restes relié. Bleu vient de s\'inviter dans ton pont : prends l\'autre case !', done: 'Sauvé ! Un pont vaut une liaison.' },
   { say: 'Une pierre sur la <b>2e rangée</b> rejoint le bord par l\'une des <b>deux cases</b> en dessous (un <b>gabarit de bord</b>). Bleu en a pris une : prends l\'autre !', done: '<b>Relié !</b> Une pierre en 2e rangée vaut une pierre au bord.' },
   { say: 'Au Hex, <b>pas de partie nulle</b>. Plateau plein, <b>un seul</b> joueur est relié : pour bloquer complètement l\'adversaire, il faut se relier soi-même.' },
   { say: 'Commencer est un gros avantage, d\'où la <b>règle d\'échange</b> : au lieu de jouer, Bleu peut <b>prendre</b> la première pierre rouge (elle passe sur la case symétrique par la grande diagonale). Touche la pierre rouge qui brille pour l\'échanger !', done: '<b>Échange !</b> Rouge ouvre alors avec un coup pas trop fort, et la partie est équitable.' },
   { say: 'Voilà toutes les règles ! Relie tes pierres par des ponts et file vers tes deux bords. Commence sur un petit plateau. On joue !' },
  ] },
 pt: { name: 'Stoneguin', next: 'Próximo', back: 'Voltar', start: 'Vamos jogar!', again: 'De novo', tap: 'Toque a casa que brilha', nope: 'Aí não! Toque a casa que brilha', win: 'Ligado!', block: 'Bloqueado!', save: 'Ainda ligado!', swap: 'Troca!', r: 'Vermelho', b: 'Azul',
  s: [
   { say: 'Oi! Eu sou o <b>Stoneguin</b>. Hoje vamos aprender as regras do <b>Hex</b> passo a passo, num tabuleirinho de hexágonos!' },
   { say: 'Na sua vez, coloque uma pedra em <b>qualquer casa vazia</b>. <b>Vermelho começa</b>. Toque a casa central que brilha para pôr uma pedra vermelha!', done: 'Toc! As pedras nunca se movem nem são capturadas.' },
   { say: 'Vermelho vence ligando suas <b>bordas vermelhas da frente e do fundo</b>; Azul, suas <b>bordas azuis dos lados</b>. Pedras em casas vizinhas estão ligadas. Toque a casa que brilha para ligar a corrente vermelha de borda a borda!', done: '<b>Ligado!</b> Vitória do Vermelho.' },
   { say: 'Agora falta uma pedra para o Azul ligar! Sua pedra também <b>bloqueia</b>. Toque a casa que brilha para parar o Azul!', done: '<b>Bloqueado!</b> O Azul não passa pela sua pedra. Defender também importa.' },
   { say: 'Duas pedras com <b>duas casas vazias</b> entre elas formam uma <b>ponte</b>: se tomarem uma, pegue a outra e continue ligado. O Azul acabou de invadir sua ponte — pegue a outra casa!', done: 'Salvo! Uma ponte vale como ligação.' },
   { say: 'Uma pedra na <b>2.ª fileira</b> chega à borda por qualquer das <b>duas casas</b> abaixo (um <b>modelo de borda</b>). O Azul pegou uma — pegue a outra!', done: '<b>Ligado!</b> Uma pedra na 2.ª fileira vale como se já estivesse na borda.' },
   { say: 'No Hex <b>não há empate</b>. Com o tabuleiro cheio, <b>exatamente um</b> jogador está ligado: para parar o rival de vez, você precisa se ligar.' },
   { say: 'Começar dá muita vantagem, por isso existe a <b>regra de troca</b>: em vez de jogar, o Azul pode <b>ficar</b> com a primeira pedra vermelha (ela vai para a casa simétrica pela diagonal longa). Toque a pedra vermelha que brilha para trocá-la!', done: '<b>Troca!</b> Assim o Vermelho abre com um lance não muito forte, e o jogo fica justo.' },
   { say: 'Essas são todas as regras! Ligue suas pedras com pontes e vá para as suas duas bordas. Comece num tabuleiro pequeno. Vamos jogar!' },
  ] },
 de: { name: 'Stoneguin', next: 'Weiter', back: 'Zurück', start: 'Los geht\'s!', again: 'Nochmal', tap: 'Tippe auf das leuchtende Feld', nope: 'Nicht dort! Tippe auf das leuchtende Feld', win: 'Verbunden!', block: 'Geblockt!', save: 'Noch verbunden!', swap: 'Tausch!', r: 'Rot', b: 'Blau',
  s: [
   { say: 'Hallo! Ich bin <b>Stoneguin</b>. Heute lernen wir Schritt für Schritt die Regeln von <b>Hex</b> – auf einem kleinen Brett aus Sechsecken!' },
   { say: 'Wenn du dran bist, setzt du einen Stein auf <b>ein beliebiges freies Feld</b>. <b>Rot beginnt</b>. Tippe auf das leuchtende Feld in der Mitte und setze einen roten Stein!', done: 'Tock! Steine ziehen nie und werden nie geschlagen.' },
   { say: 'Rot gewinnt, wenn es seine <b>roten Ränder vorne und hinten</b> verbindet, Blau seine <b>blauen Ränder links und rechts</b>. Steine auf benachbarten Feldern sind verbunden. Tippe auf das leuchtende Feld und verbinde die rote Kette von Rand zu Rand!', done: '<b>Verbunden!</b> Rot gewinnt.' },
   { say: 'Jetzt fehlt Blau nur ein Stein! Dein Stein <b>blockt</b> auch den Gegner. Tippe auf das leuchtende Feld und halte Blau auf!', done: '<b>Geblockt!</b> Blau kommt nicht durch deinen Stein. Verteidigen zählt auch.' },
   { say: 'Zwei Steine mit <b>zwei freien Feldern</b> dazwischen bilden eine <b>Brücke</b>: Nimmt der Gegner eins, nimmst du das andere und bleibst verbunden. Blau ist gerade in deine Brücke eingedrungen – nimm das andere Feld!', done: 'Gerettet! Eine Brücke ist so gut wie verbunden.' },
   { say: 'Ein Stein in der <b>2. Reihe</b> erreicht den Rand über eines der <b>zwei Felder</b> darunter (eine <b>Randschablone</b>). Blau hat eins genommen – nimm das andere!', done: '<b>Verbunden!</b> Ein Stein in der 2. Reihe ist so gut wie am Rand.' },
   { say: 'Hex kennt <b>kein Remis</b>. Ist das Brett voll, ist <b>genau einer</b> verbunden: Wer den Gegner ganz aufhalten will, muss sich selbst verbinden.' },
   { say: 'Anzuziehen ist ein großer Vorteil, darum gibt es die <b>Tauschregel</b>: Statt zu setzen, darf Blau den ersten roten Stein <b>übernehmen</b> (er wandert auf das Spiegelfeld an der langen Diagonale). Tippe auf den leuchtenden roten Stein, um zu tauschen!', done: '<b>Tausch!</b> Darum eröffnet Rot mit einem nicht zu starken Zug – und die Partie ist fair.' },
   { say: 'Das sind alle Regeln! Verbinde deine Steine mit Brücken und strebe zu deinen zwei Rändern. Fang auf einem kleinen Brett an. Los geht\'s!' },
  ] },
 hi: { name: 'Stoneguin', next: 'आगे', back: 'पीछे', start: 'खेलें!', again: 'फिर से', tap: 'चमकते खाने को टैप करें', nope: 'वहाँ नहीं! चमकते खाने को टैप करें', win: 'जुड़ गया!', block: 'रोक दिया!', save: 'अब भी जुड़ा!', swap: 'स्वैप!', r: 'लाल', b: 'नीला',
  s: [
   { say: 'नमस्ते! मैं <b>Stoneguin</b> हूँ। आज षट्कोणों के छोटे बोर्ड पर <b>हेक्स</b> के नियम एक-एक करके सीखें!' },
   { say: 'अपनी बारी में <b>किसी भी खाली खाने</b> पर एक गोटी रखें। <b>लाल पहले</b> खेलता है। चमकते बीच वाले खाने पर लाल गोटी रखें!', done: 'टक! गोटियाँ कभी नहीं हिलतीं और न ही पकड़ी जाती हैं।' },
   { say: 'लाल अपने <b>आगे और पीछे के लाल किनारे</b> जोड़कर जीतता है, नीला अपने <b>बाएँ-दाएँ नीले किनारे</b>। पास-पास के खानों की गोटियाँ जुड़ी होती हैं। चमकते खाने को टैप करके लाल कड़ी को किनारे से किनारे तक जोड़ें!', done: '<b>जुड़ गया!</b> लाल की जीत।' },
   { say: 'अब नीले को जुड़ने के लिए बस एक गोटी चाहिए! आपकी गोटी विरोधी को <b>रोकती</b> भी है। चमकते खाने को टैप करके नीले को रोकें!', done: '<b>रोक दिया!</b> नीला आपकी गोटी से होकर नहीं जा सकता। बचाव भी ज़रूरी है।' },
   { say: 'जिन दो गोटियों के बीच <b>दो खाली खाने</b> हों, वे <b>ब्रिज</b> बनाती हैं: एक खाना लिया जाए तो दूसरा ले लें, जुड़े रहेंगे। नीले ने अभी आपके ब्रिज में घुसपैठ की — दूसरा खाना लें!', done: 'बच गया! ब्रिज जुड़े होने जितना ही अच्छा है।' },
   { say: '<b>दूसरी पंक्ति</b> की गोटी नीचे के <b>दो खानों</b> में से किसी से भी किनारे तक पहुँचती है (<b>किनारे का टेम्पलेट</b>)। नीले ने एक ले लिया — दूसरा लें!', done: '<b>जुड़ गया!</b> दूसरी पंक्ति की गोटी किनारे पर होने जितनी ही अच्छी है।' },
   { say: 'हेक्स में <b>ड्रॉ नहीं होता</b>। बोर्ड भरने पर <b>ठीक एक</b> खिलाड़ी जुड़ा होता है: विरोधी को पूरी तरह रोकने के लिए आपको ख़ुद जुड़ना पड़ता है।' },
   { say: 'पहले खेलना बड़ा फ़ायदा है, इसलिए <b>स्वैप नियम</b> है: खेलने की जगह नीला लाल की पहली गोटी <b>अपनी</b> बना सकता है (वह लंबे विकर्ण के सामने वाले खाने पर चली जाती है)। चमकती लाल गोटी को टैप करके स्वैप करें!', done: '<b>स्वैप!</b> इसलिए लाल बहुत मज़बूत नहीं ऐसी पहली चाल चलता है — और खेल बराबर रहता है।' },
   { say: 'बस इतने ही नियम! ब्रिज से गोटियाँ जोड़ते हुए अपने दो किनारों की ओर बढ़ें। छोटे बोर्ड से शुरू करें। चलिए खेलें!' },
  ] },
 ar: { name: 'Stoneguin', next: 'التالي', back: 'رجوع', start: 'لنلعب!', again: 'مرة أخرى', tap: 'اضغط الخانة المضيئة', nope: 'ليس هناك! اضغط الخانة المضيئة', win: 'اتصل!', block: 'تم السد!', save: 'ما زال متصلًا!', swap: 'تبديل!', r: 'الأحمر', b: 'الأزرق',
  s: [
   { say: 'مرحبًا! أنا <b>Stoneguin</b>. لنتعلّم اليوم قواعد <b>هيكس</b> خطوة بخطوة على رقعة صغيرة من السداسيات!' },
   { say: 'في دورك، ضع حجرًا واحدًا على <b>أي خانة فارغة</b>. <b>الأحمر يبدأ</b>. اضغط الخانة الوسطى المضيئة لتضع حجرًا أحمر!', done: 'طق! الأحجار لا تتحرك ولا تُؤسر أبدًا.' },
   { say: 'يفوز الأحمر بوصل <b>حافتيه الحمراوين الأمامية والخلفية</b>، والأزرق بوصل <b>حافتيه الزرقاوين يمينًا ويسارًا</b>. الأحجار في خانات متجاورة متصلة. اضغط الخانة المضيئة لتصل السلسلة الحمراء من حافة إلى حافة!', done: '<b>اتصل!</b> فاز الأحمر.' },
   { say: 'الآن ينقص الأزرق حجر واحد ليتصل! حجرك أيضًا <b>يسدّ</b> الطريق. اضغط الخانة المضيئة لإيقاف الأزرق!', done: '<b>تم السد!</b> لا يستطيع الأزرق المرور عبر حجرك. الدفاع مهم أيضًا.' },
   { say: 'حجران بينهما <b>خانتان فارغتان</b> يشكّلان <b>جسرًا</b>: إن أُخذت خانة فخذ الأخرى وتبقى متصلًا. تدخّل الأزرق للتو في جسرك — خذ الخانة الأخرى!', done: 'أُنقذ! الجسر بمثابة الاتصال.' },
   { say: 'الحجر في <b>الصف الثاني</b> يصل إلى الحافة عبر أيٍّ من <b>الخانتين</b> تحته (<b>قالب الحافة</b>). أخذ الأزرق واحدة — خذ الأخرى!', done: '<b>اتصل!</b> حجر الصف الثاني بمثابة حجر على الحافة.' },
   { say: 'لا يوجد <b>تعادل</b> في هيكس. حين تمتلئ الرقعة يكون <b>لاعب واحد فقط</b> متصلًا: لكي توقف خصمك تمامًا يجب أن تتصل أنت.' },
   { say: 'البدء ميزة كبيرة، لذا توجد <b>قاعدة التبديل</b>: بدل اللعب يستطيع الأزرق أن <b>يأخذ</b> حجر الأحمر الأول (ينتقل إلى الخانة المقابلة عبر القطر الطويل). اضغط الحجر الأحمر المضيء لتبديله!', done: '<b>تبديل!</b> لذا يفتتح الأحمر بنقلة ليست قوية جدًا — وتصبح المباراة عادلة.' },
   { say: 'هذه كل القواعد! صِل أحجارك بالجسور واتجه نحو حافتيك. ابدأ برقعة صغيرة. هيا نلعب!' },
  ] },
};
  // the opening picture: a small game in progress
  const SHOW = { r: ['c2', 'b3', 'd4', 'c5'], b: ['d2', 'c3', 'b4'] };
  const STEPS = [
    { show: true },
    { r: [], b: [], act: { to: ['c3'] } },
    { r: ['c1', 'c2', 'b3', 'b5'], b: ['d2', 'c4', 'e3'], act: { to: ['b4'], tag: 'win', path: ['c1', 'c2', 'b3', 'b4', 'b5'] } },
    { r: ['c2', 'b4'], b: ['a3', 'b3', 'c3', 'e3'], act: { to: ['d3'], tag: 'block' } },
    { r: ['c1', 'c2', 'b4', 'a5'], b: ['e3'], drop: ['b3'], dots: ['b3', 'c3'], act: { to: ['c3'], tag: 'win', path: ['c1', 'c2', 'c3', 'b4', 'a5'] } },
    { r: ['c1', 'c2', 'c3', 'b4'], b: ['d3', 'e2'], drop: ['b5'], dots: ['a5', 'b5'], act: { to: ['a5'], tag: 'win', path: ['c1', 'c2', 'c3', 'b4', 'a5'] } },
    { full: true },
    { r: ['d2'], b: [], act: { to: ['d2'], swap: true } },
    { last: true, r: ['c3'], b: ['c4', 'b2'] },
  ];
  // the full board of the "no draws" step: Red is connected (c1 c2 b3 c3 c4 c5 …)
  const FULL = 'rbbrb' + 'rrbbr' + 'brrbb' + 'bbrrb' + 'rbrbb';

  /* ---------- little sounds: a glazed stone on walnut ("tock"), and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let nb = null;
    const noise = C => { if (nb) return nb; const b = C.createBuffer(1, C.sampleRate * .04 | 0, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5); return (nb = b); };
    function tock(v = 1) {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3600 * v; bp.Q.value = 1.4;
      const g = C.createGain(); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(520 * v, t); o.frequency.exponentialRampToValueAtTime(220, t + .06);
      og.gain.setValueAtTime(.2, t); og.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .1);
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
    return { tock, blip, chime, buzz, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, GB = T3.goban, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.hex(true, { n: N, W: 8.4 }); T3.show('hex', board); T3.play(true);
    const U = board.userData, Y = U.top, c = U.cell;
    if (T3.fit) T3.fit({ w: U.W + .4, d: U.D + 2.4, y: Y - .6, pitch: 1.1 });   // the whole board, seen a little from the player's side
    const marks = new TH.Group(), stones = new TH.Group(); board.add(marks, stones);
    let st = {}, step = 0, stopped = false, busy = false, played = false, timers = [], targets = [], hand = null, idleT = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const xz = q => U.pt(ix(q));
    const H = c * .26;

    /* ---------- stones ---------- */
    function put(q, col, delay = 0, drop = true) {
      const g = new TH.Group(), s = U.stone(col), sh = T3.contact(c * .44, .5); sh.position.y = .002; g.add(sh, s);
      const [x, z] = xz(q); g.position.set(x, Y, z); stones.add(g); st[q] = g; g.userData.s = s; g.userData.sh = sh; g.userData.col = col;
      if (!drop) return g;
      g.visible = false;
      later(() => {
        g.visible = true; const h0 = c * 1.3; s.position.y = h0; sh.material.opacity = 0;
        anim(280, k => { const hh = k < .7 ? h0 * (1 - Math.pow(k / .7, 2)) : 0; s.position.y = hh; sh.material.opacity = .5 * Math.min(1, k * 1.3); if (k > .7) { const q2 = (k - .7) / .3, sq = Math.sin(q2 * Math.PI) * .08; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); } },
          () => { s.position.y = 0; s.scale.set(1, 1, 1); });
        later(() => SFX.tock(col === 1 ? 1 : 1.1), 190);
      }, delay);
      return g;
    }
    function clearStones() { while (stones.children.length) stones.remove(stones.children[0]); st = {}; }
    function setBoard(S) {
      clearStones(); let i = 0;
      if (S.full) { for (let k = 0; k < N * N; k++) put(nm(k), FULL[k] === 'r' ? 1 : 2, 40 + (i++) * 30); return i; }
      const P = S.show ? SHOW : S;
      (P.r || []).forEach(q => put(q, 1, 60 + (i++) * 70)); (P.b || []).forEach(q => put(q, 2, 60 + (i++) * 70));
      return i;
    }
    /* ---------- marks ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); }
    function glow(q) { const g = GB ? GB.tapMark(c) : new TH.Mesh(new TH.TorusGeometry(c * .4, c * .06, 8, 36), basic(0xffc928, .95)), [x, z] = xz(q); if (!GB) g.rotation.x = Math.PI / 2; g.position.set(x, Y + (GB ? 0 : .03), z); marks.add(g); return g; }
    function dot(q, color, r = .2) { const m = new TH.Mesh(new TH.CircleGeometry(c * r, 28), basic(color, .9)); m.rotation.x = -Math.PI / 2; const [x, z] = xz(q); m.position.set(x, Y + .006, z); m.userData.pulse = true; marks.add(m); return m; }
    function ring(q, delay) { later(() => { const m = new TH.Mesh(new TH.TorusGeometry(c * .46, c * .05, 8, 40), basic(0xffd24a, .9)); m.rotation.x = Math.PI / 2; const [x, z] = xz(q); m.position.set(x, Y + .02, z); m.scale.setScalar(.01); marks.add(m); anim(260, k => m.scale.setScalar(.01 + k * .99)); const g = st[q]; if (g) anim(380, k => { g.userData.s.position.y = Math.sin(k * Math.PI) * c * .3; }); SFX.tock(1.2); }, delay); }
    (function pulse() { if (stopped) return; const now = performance.now(), k = .5 + .5 * Math.sin(now / 260); let any = false; marks.children.forEach(m => { if (m.userData.tap) { any = true; m.userData.tick(now); return; } if (m.userData.pulse) { any = true; m.scale.setScalar(.85 + k * .3); } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- the ghost finger: after ~6 s without a tap it taps the right cell ---------- */
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
      (S.dots || []).forEach(q => { if (!st[q]) dot(q, 0x2fd17a); });
      list.forEach(q => glow(q));
      armIdle();
    }
    function go(n) {
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; targets = [];
      timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); hideHand();
      const S = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(S); let wait = 200 + cnt * 70;
      if (S.dots && S.drop) { later(() => S.dots.forEach(q => dot(q, 0x2fd17a)), wait); wait += 900; S.drop.forEach(q => put(q, 2, wait)); wait += 450; }
      if (S.act) { busy = true; later(() => { busy = false; arm(S.act.to); tapLine(); }, wait + 150); }
      say(L.s[step].say); buttons();
    }
    function pickCell(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      let best = -1, bd = 1e9; for (let i = 0; i < N * N; i++) { const [x, z] = U.pt(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return bd < c * .58 ? nm(best) : null;
    }
    function finish(extra) { busy = false; targets = []; clearTimeout(idleT); hideHand(); if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    const tag = s => line(`<span class="tag">${s}</span>`);
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const S = STEPS[step], q = pickCell(e); if (!q || !S.act || !targets.length) return;
      if (!targets.includes(q)) { SFX.buzz(); line(`<b class="tapl" style="color:#e0452b;font-size:1.04em">👉 ${L.nope}</b>`, true); marks.children.forEach(m => { if (m.userData.tap) anim(380, k => m.scale.setScalar(1.5 - .5 * k)); }); armIdle(); return; }
      clearTimeout(idleT); hideHand();
      const a = S.act;
      busy = true; played = true; clearMarks(); targets = [];
      if (a.swap) {   // the red stone lifts, turns blue and lands on the mirrored cell
        const g = st[q], s = g.userData.s, i = ix(q), to = nm((i % N) * N + Math.floor(i / N)), [x0, z0] = xz(q), [x1, z1] = xz(to);
        SFX.tock(.8);
        anim(700, k => { const e2 = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; g.position.set(x0 + (x1 - x0) * e2, Y + Math.sin(k * Math.PI) * c * 1.4, z0 + (z1 - z0) * e2); s.rotation.x = k * Math.PI * 2; },
          () => { stones.remove(g); delete st[q]; const ng = put(to, 2, 0, false); ng.userData.s.position.y = 0; SFX.chime(); finish(() => tag(L.swap)); });
        return;
      }
      put(q, 1, 0);
      later(() => {
        SFX.chime();
        if (a.path) a.path.forEach((pq, k) => ring(pq, k * 90));
        finish(() => tag(a.tag === 'block' ? L.block : L.win));
      }, 420);
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
    const api = {
      stop() { stopped = true; clearInterval(typeT); clearTimeout(idleT); hideHand(); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); if (window.AtlasRules.hex._s === api) delete window.AtlasRules.hex._s; },
      panel: el,
      _debug: { pt: q => { const [x, z] = xz(q); return T3.project(x, z, Y); }, step: () => step, targets: () => targets.slice(), busy: () => busy, stones: () => Object.keys(st).sort() },
    };
    window.AtlasRules.hex._s = api;   // test hook
    return api;
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.hex = { start };
})();
