/* =====================================================================
   Alquerque rules — a guided tour on the 3D table (the Damascene inlaid board,
   atlas/models/alquerque.js), told by the guide character (Gembeetle).
   A short hands-on course on the 5 × 5 board: the board and the start, a step forwards
   or sideways along the lines, a jump over an enemy piece, compulsory capture, capture
   chains, the win, the far row and the draws.
   Every task is checked live by the game's own rules (../fanorona/engine.js, rule 'alq'):
   the player is White (the brass pieces); the steps a task accepts come from the engine.
   The positions are the 2D page's own tour (fanorona/app.js TOUR_ALQ).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Points in the game's notation ('c3': columns a–e from the left, row 1 at the bottom).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-gem.webp', ENG = '../fanorona/engine.js?v=fb4';
  const loadEngine = () => window.FanoronaEngine ? Promise.resolve(window.FanoronaEngine) : new Promise((res, rej) => { const s = document.createElement('script'); s.src = ENG; s.onload = () => window.FanoronaEngine ? res(window.FanoronaEngine) : rej(); s.onerror = rej; document.head.appendChild(s); });

  // g: rows top → bottom (row 5 … row 1); p: { w: [...], b: [...] }
  const START = ['bbbbb', 'bbbbb', 'bb.ww', 'wwwww', 'wwwww'];
  const STEPS = [
    { g: START },
    { g: START, glow: ['c3'], strong: true },
    { p: { w: ['c2', 'a1'], b: ['e5', 'a5'] }, act: 'move' },
    { p: { w: ['c2', 'a1'], b: ['c3', 'e5'] }, act: 'cap' },
    { p: { w: ['b2', 'e1'], b: ['c3', 'a5'] }, act: 'cap', must: true },
    { p: { w: ['a1', 'e1'], b: ['b2', 'c4', 'a5'] }, act: 'chain', from: 'a1' },
    { p: { w: ['c1', 'e1'], b: ['c2'] }, act: 'win' },
    { p: { w: ['b5', 'd5'], b: ['b1'] }, far: ['b5', 'd5'] },
    { g: START, last: true },
  ];

  const TXT = {
    ja: { name: 'マンカラビ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tap: '光っている所をタップ', nope: 'そこへは行けないよ〜', stuck: 'その駒は今は動かせないよ', must: '取れる駒があるときは、取らなきゃダメなんだ（光っている駒）', more: 'まだ跳べる！ 続けて跳ぼう', pick: '取る駒をタップしてね', win: '勝ち！', wantMove: '今回は取らずに1歩だけ動いてみて', wantCap: '相手の駒を跳び越えてみよう！', s: [
      { say: 'ブーン、こんにちは！ ぼくは<b>マンカラビ</b>。今日は<b>アルケルケ</b>をいっしょに覚えよう！ アラブの世界で「<b>キルカット</b>」と呼ばれた、千年以上むかしからあるゲームなんだ。この盤はダマスカスの職人さんみたいに、真珠貝や骨をはめこんで作ってあるよ〜。' },
      { say: '盤は<b>5×5の点と線</b>。白と黒が<b>12こずつ</b>並んで、<b>真ん中だけ空いて</b>いるよ（光っているところ）。ななめの線が通るのは小さく光る点だけ。手前の<b>真鍮の駒があなた</b>、<b>先手</b>だよ！' },
      { say: '駒は<b>線にそって、前か横の空いた点へ1歩</b>。<b>うしろへは戻れない</b>んだ（取るときは別だよ）。白の駒を1歩動かしてみて！', done: 'いいね〜！ ちょっとずつ前へ進むんだよ。' },
      { say: 'ここからが本番！ <b>となりの相手の駒を跳び越えて</b>、その先の空いた点に着地すると<b>取れる</b>よ。取るときは<b>どの向きでも</b>跳べるんだ。c2の駒で黒を跳び越えて！', done: 'ぴょーん、取れた！ 取った駒は手前のトレイに並ぶよ。' },
      { say: '大事なルール！ <b>取れる駒があるときは、かならず取らなきゃダメ</b>なんだ。光っている駒が取れる駒だよ。さあ、取ってみて！', done: 'そうそう！ 取りのがしはできないから、相手にわざと取らせる作戦もあるんだよ。' },
      { say: '跳んだ先でまた取れるなら、<b>同じ手番で続けて跳ばなきゃいけない</b>よ（<b>連続取り</b>）！ a1の駒で、黒を2こまとめて取っちゃおう！', done: 'ぴょんぴょーん！ 1手で2こ取れたね！' },
      { say: '勝ち方はかんたん。<b>相手の駒をぜんぶ取る</b>か、<b>相手が動けなくなったら</b>勝ち！ 最後の黒を跳び越えて、とどめをさそう！', done: 'やったー、勝ち！ 黒はもう1こも残ってないよ。' },
      { say: 'いちばん奥まで進んだ駒（光っている白）は、<b>横にしか動けない</b>んだ。それから、<b>同じ局面が3回</b>出たり、取りのない手が<b>80手</b>続いたら引き分けだよ。' },
      { say: '対局設定では、アルフォンソ10世『遊戯の書』のとおり<b>うしろにも動ける</b>遊び方も選べるよ。さあ、ブンブン遊ぼう〜！' },
    ] },
    en: { name: 'Gembeetle', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tap: 'Tap a glowing spot', nope: "It can't go there!", stuck: "That piece can't move right now", must: 'When you can capture, you must (the glowing pieces)', more: 'You can jump again — keep going!', pick: 'Tap the piece to take', win: 'You win!', wantMove: 'This time, just step without capturing', wantCap: 'Try jumping over an enemy piece!', s: [
      { say: "Bzzz, hello! I'm <b>Gembeetle</b>. Let's learn <b>Alquerque</b> together! In the Arab world it was called <b>qirkat</b>, and it is more than a thousand years old. This board is made the way Damascus craftsmen make theirs, with mother-of-pearl and bone inlaid in the wood!" },
      { say: 'The board has <b>5 × 5 points and lines</b>. White and Black have <b>12 pieces each</b>, and <b>only the centre is empty</b> (glowing). Diagonal lines pass only through the softly glowing points. The <b>brass pieces in front are yours</b>, and you <b>move first</b>!' },
      { say: 'A piece steps <b>along a line to an empty point forwards or sideways</b>, one step. It <b>never goes back</b> (except when capturing). Step a white piece!', done: 'Nice! Little by little, forwards.' },
      { say: 'Now the real thing! <b>Jump over a neighbouring enemy piece</b> to the empty point beyond it and you <b>capture</b> it. When capturing you may jump <b>in any direction</b>. Jump the c2 piece over Black!', done: 'Boing, got it! Captured pieces line up in the tray in front of you.' },
      { say: 'Important rule! <b>If you can capture, you must</b>. The glowing pieces are the ones that can. Go on, capture!', done: "That's it! You can't refuse a capture — so offering one on purpose can be a trap." },
      { say: 'If you can capture again from where you land, you <b>must keep jumping in the same turn</b> (a <b>capture chain</b>)! Take two black pieces with the a1 piece!', done: 'Boing boing! Two in one move!' },
      { say: 'Winning is simple: <b>capture all enemy pieces</b>, or leave them <b>unable to move</b>! Jump the last black piece to finish!', done: 'Hooray, you win! Not one black piece left.' },
      { say: 'A piece that reaches the far row (the glowing whites) can <b>only move sideways</b>. And the game is drawn if <b>the same position appears three times</b>, or after <b>80 moves without a capture</b>.' },
      { say: 'In the new-game settings you can also play as in Alfonso X’s <b>Book of Games</b>, where pieces <b>may step backwards too</b>. Now, let’s buzz off and play!' },
    ] },
    zh: { name: '宝石甲虫', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tap: '点击发光的地方', nope: '那里走不了哦～', stuck: '这枚棋子现在走不了哦', must: '能吃子时必须吃（发光的棋子）', more: '还能再跳，继续！', pick: '点击要吃的棋子', win: '获胜！', wantMove: '这次不吃子，只走一步', wantCap: '试着跳过对方的棋子吧！', s: [
      { say: '嗡嗡，你好！我是<b>宝石甲虫</b>。今天一起学<b>阿尔克尔克（Alquerque）</b>吧！它在阿拉伯世界叫作<b>“基尔卡特”</b>，有一千多年的历史。这块棋盘像大马士革工匠那样，镶嵌了珍珠母和骨头哦～' },
      { say: '棋盘是<b>5×5的点和线</b>。白棋和黑棋<b>各12枚</b>，<b>只有中间空着</b>（发光处）。斜线只经过微微发光的点。前面的<b>黄铜棋子是你的</b>，你<b>先走</b>！' },
      { say: '棋子<b>沿着线向前或向旁边的空点走一步</b>，<b>不能后退</b>（吃子时除外）。走一枚白棋试试！', done: '很好～！一点一点向前进。' },
      { say: '重头戏来啦！<b>跳过相邻的对方棋子</b>，落在后面的空点上，就能<b>吃掉</b>它。吃子时<b>任何方向</b>都能跳。用 c2 的棋子跳过黑棋！', done: '啵～吃到了！吃掉的棋子排在你面前的托盘里。' },
      { say: '重要规则！<b>能吃子时必须吃</b>。发光的就是能吃子的棋子。来，吃吧！', done: '没错！不能拒绝吃子，所以故意送子也是一种计谋哦。' },
      { say: '落地后还能再吃的话，<b>必须在同一回合继续跳</b>（<b>连吃</b>）！用 a1 的棋子一口气吃掉两枚黑棋！', done: '啵啵！一步吃了两枚！' },
      { say: '获胜很简单：<b>吃光对方的棋子</b>，或者让对方<b>无路可走</b>！跳过最后一枚黑棋，结束吧！', done: '太棒了，你赢了！黑棋一枚都不剩。' },
      { say: '走到最远一排的棋子（发光的白棋）<b>只能横着走</b>。另外，<b>同一局面出现3次</b>，或<b>80手没有吃子</b>，就是和棋。' },
      { say: '在对局设置里，还能选阿方索十世《游戏之书》那样<b>也能后退</b>的玩法。来，嗡嗡地玩起来吧～！' },
    ] },
    ko: { name: '만카라비', next: '다음', back: '이전', start: '대국해 보기', again: '다시 하기', tap: '빛나는 곳을 탭', nope: '거기로는 못 가요~', stuck: '그 말은 지금 못 움직여요', must: '잡을 수 있을 땐 꼭 잡아야 해요 (빛나는 말)', more: '또 뛸 수 있어! 계속 뛰자', pick: '잡을 말을 탭해요', win: '승리!', wantMove: '이번엔 잡지 말고 한 걸음만', wantCap: '상대 말을 뛰어넘어 봐!', s: [
      { say: '부웅, 안녕! 나는 <b>만카라비</b>. 오늘은 <b>알케르케</b>를 같이 배워 보자! 아랍 세계에서는 <b>"키르카트"</b>라고 불렸고, 천 년도 넘은 게임이야. 이 판은 다마스쿠스 장인처럼 자개와 뼈를 박아 만들었어~' },
      { say: '판은 <b>5×5의 점과 선</b>. 백과 흑이 <b>12개씩</b> 놓이고 <b>가운데만 비어 있어</b>(빛나는 곳). 대각선은 살짝 빛나는 점만 지나가. 앞쪽의 <b>황동 말이 너</b>, <b>먼저 둬</b>!' },
      { say: '말은 <b>선을 따라 앞이나 옆의 빈 점으로 한 걸음</b>. <b>뒤로는 못 가</b>(잡을 때는 예외). 흰 말을 한 걸음 움직여 봐!', done: '좋아~! 조금씩 앞으로 가는 거야.' },
      { say: '이제부터 진짜! <b>옆의 상대 말을 뛰어넘어</b> 그 너머 빈 점에 내리면 <b>잡을 수 있어</b>. 잡을 때는 <b>어느 방향</b>으로든 뛸 수 있어. c2 말로 흑을 뛰어넘어!', done: '폴짝, 잡았다! 잡은 말은 앞쪽 트레이에 놓여.' },
      { say: '중요한 규칙! <b>잡을 수 있으면 반드시 잡아야</b> 해. 빛나는 말이 잡을 수 있는 말이야. 자, 잡아 봐!', done: '맞아! 잡기를 거절할 수 없으니까, 일부러 잡히게 하는 작전도 있어.' },
      { say: '내린 곳에서 또 잡을 수 있으면 <b>같은 차례에 계속 뛰어야</b> 해(<b>연속 잡기</b>)! a1 말로 흑 2개를 한꺼번에 잡자!', done: '폴짝폴짝! 한 수에 2개!' },
      { say: '이기는 법은 간단해. <b>상대 말을 전부 잡거나</b>, 상대가 <b>움직일 수 없게</b> 하면 승리! 마지막 흑을 뛰어넘어 끝내자!', done: '야호, 승리! 흑은 하나도 안 남았어.' },
      { say: '가장 안쪽 줄까지 간 말(빛나는 백)은 <b>옆으로만</b> 움직일 수 있어. 그리고 <b>같은 국면이 3번</b> 나오거나 잡기 없는 수가 <b>80수</b> 이어지면 무승부야.' },
      { say: '대국 설정에서는 알폰소 10세의 『놀이의 책』처럼 <b>뒤로도 갈 수 있는</b> 방법도 고를 수 있어. 자, 부웅부웅 놀아 보자~!' },
    ] },
    es: { name: 'Gembeetle', next: 'Siguiente', back: 'Atrás', start: 'Jugar', again: 'Otra vez', tap: 'Toca un punto que brilla', nope: '¡Ahí no puede ir!', stuck: 'Esa pieza no puede moverse ahora', must: 'Si puedes capturar, debes hacerlo (las piezas que brillan)', more: '¡Puedes saltar otra vez, sigue!', pick: 'Toca la pieza que capturas', win: '¡Ganas!', wantMove: 'Esta vez, solo avanza un paso sin capturar', wantCap: '¡Prueba a saltar una pieza rival!', s: [
      { say: '¡Bzzz, hola! Soy <b>Gembeetle</b>. ¡Aprendamos juntos el <b>Alquerque</b>! En el mundo árabe se llamaba <b>qirkat</b> y tiene más de mil años. Este tablero está hecho como en los talleres de Damasco, con nácar y hueso incrustados en la madera.' },
      { say: 'El tablero tiene <b>5 × 5 puntos y líneas</b>. Blancas y negras tienen <b>12 piezas</b> cada una y <b>solo el centro está vacío</b> (brilla). Las diagonales pasan solo por los puntos que brillan suave. ¡Las <b>piezas de latón de delante son tuyas</b> y <b>empiezas tú</b>!' },
      { say: 'Una pieza avanza <b>por una línea a un punto vacío delante o al lado</b>, un paso. <b>Nunca retrocede</b> (salvo al capturar). ¡Mueve una pieza blanca!', done: '¡Bien! Poco a poco, hacia delante.' },
      { say: '¡Ahora lo bueno! <b>Salta una pieza rival vecina</b> hasta el punto vacío de detrás y la <b>capturas</b>. Al capturar puedes saltar <b>en cualquier dirección</b>. ¡Salta con la pieza de c2 sobre la negra!', done: '¡Boing, capturada! Las piezas capturadas se colocan en la bandeja de delante.' },
      { say: '¡Regla importante! <b>Si puedes capturar, debes hacerlo</b>. Las piezas que brillan son las que pueden. ¡Vamos, captura!', done: '¡Eso es! No puedes negarte a capturar, así que ofrecer una pieza puede ser una trampa.' },
      { say: 'Si desde donde caes puedes volver a capturar, <b>debes seguir saltando en el mismo turno</b> (una <b>cadena de capturas</b>). ¡Llévate dos negras con la pieza de a1!', done: '¡Boing, boing! ¡Dos de una vez!' },
      { say: 'Ganar es sencillo: <b>captura todas las piezas rivales</b> o déjalas <b>sin poder moverse</b>. ¡Salta la última negra para terminar!', done: '¡Hurra, ganas! No queda ni una negra.' },
      { say: 'Una pieza que llega a la última fila (las blancas que brillan) <b>solo puede moverse de lado</b>. Y hay tablas si <b>la misma posición aparece tres veces</b> o tras <b>80 jugadas sin captura</b>.' },
      { say: 'En la ventana de partida también puedes jugar como en el <b>Libro de los juegos</b> de Alfonso X, donde las piezas <b>también retroceden</b>. ¡A jugar, bzzz!' },
    ] },
    fr: { name: 'Gembeetle', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point qui brille', nope: 'Elle ne peut pas aller là !', stuck: 'Cette pièce ne peut pas bouger pour l’instant', must: 'Quand tu peux prendre, tu dois prendre (les pièces qui brillent)', more: 'Tu peux encore sauter, continue !', pick: 'Touche la pièce à prendre', win: 'Gagné !', wantMove: 'Cette fois, avance d’un pas sans prendre', wantCap: 'Essaie de sauter par-dessus une pièce adverse !', s: [
      { say: 'Bzzz, bonjour ! Moi c’est <b>Gembeetle</b>. Apprenons ensemble l’<b>Alquerque</b> ! Dans le monde arabe on l’appelait <b>qirkat</b>, et il a plus de mille ans. Ce plateau est fait comme dans les ateliers de Damas, avec de la nacre et de l’os incrustés dans le bois.' },
      { say: 'Le plateau a <b>5 × 5 points et lignes</b>. Blancs et Noirs ont <b>12 pièces</b> chacun, et <b>seul le centre est vide</b> (il brille). Les diagonales ne passent que par les points qui brillent doucement. Les <b>pièces en laiton devant sont à toi</b>, et <b>tu commences</b> !' },
      { say: 'Une pièce avance <b>le long d’une ligne vers un point vide devant ou sur le côté</b>, d’un pas. Elle <b>ne recule jamais</b> (sauf pour prendre). Avance une pièce blanche !', done: 'Bravo ! Petit à petit, en avant.' },
      { say: 'Le vrai jeu commence ! <b>Saute par-dessus une pièce adverse voisine</b> jusqu’au point vide derrière, et tu la <b>prends</b>. Pour prendre, tu peux sauter <b>dans tous les sens</b>. Fais sauter la pièce de c2 par-dessus la noire !', done: 'Boing, prise ! Les pièces prises s’alignent dans le plateau devant toi.' },
      { say: 'Règle importante ! <b>Si tu peux prendre, tu dois prendre</b>. Les pièces qui brillent sont celles qui peuvent. Allez, prends !', done: 'Voilà ! On ne peut pas refuser une prise : offrir une pièce exprès peut donc être un piège.' },
      { say: 'Si tu peux encore prendre depuis ton point d’arrivée, tu <b>dois continuer à sauter dans le même tour</b> (une <b>rafle</b>) ! Prends deux noires avec la pièce de a1 !', done: 'Boing, boing ! Deux d’un coup !' },
      { say: 'Pour gagner, c’est simple : <b>prends toutes les pièces adverses</b>, ou laisse-les <b>bloquées</b> ! Saute la dernière noire pour finir !', done: 'Hourra, gagné ! Plus une seule noire.' },
      { say: 'Une pièce arrivée à la dernière rangée (les blanches qui brillent) <b>ne bouge plus que sur le côté</b>. Et il y a nulle si <b>la même position revient trois fois</b>, ou après <b>80 coups sans prise</b>.' },
      { say: 'Dans la fenêtre de partie, tu peux aussi jouer comme dans le <b>Livre des jeux</b> d’Alphonse X, où les pièces <b>peuvent aussi reculer</b>. Allez, on joue, bzzz !' },
    ] },
    pt: { name: 'Gembeetle', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto que brilha', nope: 'Ela não pode ir para lá!', stuck: 'Essa peça não pode se mover agora', must: 'Quando puder capturar, é obrigatório (as peças que brilham)', more: 'Dá para pular de novo, continue!', pick: 'Toque na peça a capturar', win: 'Você venceu!', wantMove: 'Desta vez, só ande um passo sem capturar', wantCap: 'Tente pular sobre uma peça inimiga!', s: [
      { say: 'Bzzz, olá! Eu sou o <b>Gembeetle</b>. Vamos aprender juntos o <b>Alquerque</b>! No mundo árabe ele se chamava <b>qirkat</b> e tem mais de mil anos. Este tabuleiro é feito como nas oficinas de Damasco, com madrepérola e osso incrustados na madeira!' },
      { say: 'O tabuleiro tem <b>5 × 5 pontos e linhas</b>. Brancas e pretas têm <b>12 peças</b> cada, e <b>só o centro está vazio</b> (brilhando). As diagonais passam só pelos pontos que brilham de leve. As <b>peças de latão na frente são suas</b>, e <b>você começa</b>!' },
      { say: 'Uma peça anda <b>pela linha até um ponto vazio à frente ou ao lado</b>, um passo. Ela <b>nunca volta</b> (só ao capturar). Ande com uma peça branca!', done: 'Boa! Pouco a pouco, para a frente.' },
      { say: 'Agora o principal! <b>Pule uma peça inimiga vizinha</b> até o ponto vazio atrás dela e você a <b>captura</b>. Ao capturar dá para pular <b>em qualquer direção</b>. Pule com a peça de c2 sobre a preta!', done: 'Boing, capturada! As capturadas ficam na bandeja à sua frente.' },
      { say: 'Regra importante! <b>Se puder capturar, você tem que capturar</b>. As peças que brilham são as que podem. Vai, capture!', done: 'Isso! Não dá para recusar uma captura, então oferecer uma peça de propósito pode ser armadilha.' },
      { say: 'Se der para capturar de novo de onde você caiu, você <b>tem que continuar pulando no mesmo turno</b> (uma <b>captura em cadeia</b>)! Leve duas pretas com a peça de a1!', done: 'Boing, boing! Duas de uma vez!' },
      { say: 'Vencer é simples: <b>capture todas as peças inimigas</b> ou deixe-as <b>sem movimento</b>! Pule a última preta para terminar!', done: 'Eba, você venceu! Não sobrou nenhuma preta.' },
      { say: 'A peça que chega à última fileira (as brancas que brilham) <b>só anda para o lado</b>. E há empate se <b>a mesma posição aparecer três vezes</b>, ou após <b>80 lances sem captura</b>.' },
      { say: 'Na janela de partida você também pode jogar como no <b>Livro dos Jogos</b> de Afonso X, em que as peças <b>também andam para trás</b>. Vamos jogar, bzzz!' },
    ] },
    de: { name: 'Gembeetle', next: 'Weiter', back: 'Zurück', start: 'Los spielen', again: 'Nochmal', tap: 'Tippe einen leuchtenden Punkt an', nope: 'Dahin geht es nicht!', stuck: 'Dieser Stein kann gerade nicht ziehen', must: 'Wenn du schlagen kannst, musst du schlagen (die leuchtenden Steine)', more: 'Du kannst noch einmal springen – weiter!', pick: 'Tippe den Stein an, den du schlägst', win: 'Gewonnen!', wantMove: 'Diesmal nur einen Schritt, ohne zu schlagen', wantCap: 'Spring über einen gegnerischen Stein!', s: [
      { say: 'Bzzz, hallo! Ich bin <b>Gembeetle</b>. Lass uns zusammen <b>Alquerque</b> lernen! In der arabischen Welt hieß es <b>Qirkat</b> und ist über tausend Jahre alt. Dieses Brett ist gemacht wie in den Werkstätten von Damaskus, mit Perlmutt und Bein im Holz!' },
      { say: 'Das Brett hat <b>5 × 5 Punkte und Linien</b>. Weiß und Schwarz haben je <b>12 Steine</b>, und <b>nur die Mitte ist frei</b> (sie leuchtet). Diagonalen laufen nur durch die sanft leuchtenden Punkte. Die <b>Messingsteine vorne gehören dir</b>, und <b>du beginnst</b>!' },
      { say: 'Ein Stein zieht <b>entlang einer Linie auf einen freien Punkt nach vorn oder zur Seite</b>, einen Schritt. <b>Zurück geht es nie</b> (außer beim Schlagen). Zieh einen weißen Stein!', done: 'Klasse! Stück für Stück nach vorn.' },
      { say: 'Jetzt kommt’s! <b>Spring über einen benachbarten gegnerischen Stein</b> auf den freien Punkt dahinter, dann ist er <b>geschlagen</b>. Beim Schlagen darfst du <b>in jede Richtung</b> springen. Spring mit dem Stein auf c2 über Schwarz!', done: 'Boing, geschlagen! Geschlagene Steine liegen in der Schale vor dir.' },
      { say: 'Wichtige Regel! <b>Kannst du schlagen, musst du schlagen</b>. Die leuchtenden Steine können es. Los, schlag!', done: 'Genau! Einen Schlag darf man nicht ablehnen – einen Stein absichtlich anzubieten kann also eine Falle sein.' },
      { say: 'Kannst du von dort, wo du landest, wieder schlagen, <b>musst du im selben Zug weiterspringen</b> (eine <b>Schlagkette</b>)! Hol dir mit dem Stein auf a1 zwei schwarze!', done: 'Boing, boing! Zwei auf einmal!' },
      { say: 'Gewinnen ist einfach: <b>schlag alle gegnerischen Steine</b> oder lass sie <b>nicht mehr ziehen</b>! Spring über den letzten schwarzen Stein!', done: 'Hurra, gewonnen! Kein schwarzer Stein mehr übrig.' },
      { say: 'Ein Stein auf der hintersten Reihe (die leuchtenden weißen) <b>zieht nur noch zur Seite</b>. Und es ist Remis, wenn <b>dieselbe Stellung dreimal</b> vorkommt oder nach <b>80 Zügen ohne Schlag</b>.' },
      { say: 'Im Spieldialog kannst du auch wie in Alfons’ X. <b>Buch der Spiele</b> spielen, wo die Steine <b>auch rückwärts</b> ziehen dürfen. Und jetzt: los geht’s, bzzz!' },
    ] },
    hi: { name: 'जेमबीटल', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकती जगह पर टैप करें', nope: 'वहाँ नहीं जा सकते!', stuck: 'यह मोहरा अभी नहीं चल सकता', must: 'पकड़ सकते हो तो पकड़ना ज़रूरी है (चमकते मोहरे)', more: 'फिर से कूद सकते हो, जारी रखो!', pick: 'पकड़ने वाले मोहरे पर टैप करो', win: 'जीत!', wantMove: 'इस बार बिना पकड़े सिर्फ़ एक कदम', wantCap: 'विरोधी मोहरे के ऊपर से कूदो!', s: [
      { say: 'भुन्न, नमस्ते! मैं <b>जेमबीटल</b> हूँ। आओ साथ में <b>अलकर्क</b> सीखें! अरब दुनिया में इसे <b>"किरकात"</b> कहते थे, और यह हज़ार साल से भी पुराना है। यह बोर्ड दमिश्क़ के कारीगरों की तरह सीप और हड्डी जड़कर बनाया गया है!' },
      { say: 'बोर्ड में <b>5×5 बिंदु और रेखाएँ</b> हैं। सफ़ेद और काले के <b>12-12 मोहरे</b>, और <b>सिर्फ़ बीच खाली</b> (चमक रहा है)। तिरछी रेखाएँ सिर्फ़ हल्के चमकते बिंदुओं से गुज़रती हैं। आगे के <b>पीतल के मोहरे तुम्हारे</b> हैं, और <b>पहले तुम चलोगे</b>!' },
      { say: 'मोहरा <b>रेखा पर आगे या बगल के खाली बिंदु पर एक कदम</b> चलता है। <b>पीछे कभी नहीं</b> (पकड़ते समय छोड़कर)। एक सफ़ेद मोहरा चलाओ!', done: 'बढ़िया! धीरे-धीरे आगे।' },
      { say: 'अब असली मज़ा! <b>बगल के विरोधी मोहरे के ऊपर से कूदकर</b> उसके पार खाली बिंदु पर उतरो तो वह <b>पकड़ा</b> जाता है। पकड़ते समय <b>किसी भी दिशा</b> में कूद सकते हो। c2 के मोहरे से काले के ऊपर कूदो!', done: 'उछल, पकड़ लिया! पकड़े गए मोहरे सामने की ट्रे में रखे जाते हैं।' },
      { say: 'ज़रूरी नियम! <b>पकड़ सकते हो तो पकड़ना ही होगा</b>। चमकते मोहरे वही हैं जो पकड़ सकते हैं। चलो, पकड़ो!', done: 'बिल्कुल! पकड़ना मना नहीं कर सकते, इसलिए जानबूझकर मोहरा देना भी चाल हो सकती है।' },
      { say: 'उतरने के बाद फिर पकड़ सको तो <b>उसी बारी में कूदते रहना होगा</b> (<b>लगातार पकड़</b>)! a1 के मोहरे से दो काले एक साथ पकड़ो!', done: 'उछल-उछल! एक चाल में दो!' },
      { say: 'जीतना आसान है: <b>विरोधी के सारे मोहरे पकड़ लो</b>, या उसे <b>चलने लायक़ न छोड़ो</b>! आख़िरी काले के ऊपर कूदकर खेल ख़त्म करो!', done: 'हुर्रे, जीत गए! एक भी काला नहीं बचा।' },
      { say: 'सबसे आख़िरी पंक्ति तक पहुँचा मोहरा (चमकते सफ़ेद) <b>सिर्फ़ बगल में</b> चल सकता है। और <b>एक ही स्थिति तीन बार</b> आए या <b>80 चालें बिना पकड़</b> हों तो ड्रॉ।' },
      { say: 'नए खेल की सेटिंग में अल्फ़ोंसो दसवें की <b>खेलों की किताब</b> वाला तरीक़ा भी चुन सकते हो, जिसमें मोहरे <b>पीछे भी</b> चल सकते हैं। चलो, भुन्न-भुन्न खेलें!' },
    ] },
    ar: { name: 'جيم بيتل', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tap: 'اضغط نقطة تلمع', nope: 'لا يمكن الذهاب إلى هناك!', stuck: 'هذه القطعة لا تتحرك الآن', must: 'إذا استطعت الأسر فهو إلزامي (القطع اللامعة)', more: 'يمكنك القفز مجددًا، تابع!', pick: 'اضغط القطعة التي تأسرها', win: 'فزت!', wantMove: 'هذه المرة تقدّم خطوة دون أسر', wantCap: 'جرّب القفز فوق قطعة للخصم!', s: [
      { say: 'بزززز، مرحبًا! أنا <b>جيم بيتل</b>. لنتعلم معًا <b>القِرْقات</b> (ألكيركي)! هكذا سُمّيت في العالم العربي، وعمرها أكثر من ألف عام. صُنعت هذه الرقعة كما يصنعها حرفيو دمشق، بالصدف والعظم المطعّم في الخشب!' },
      { say: 'للرقعة <b>5 × 5 من النقاط والخطوط</b>. للأبيض والأسود <b>12 قطعة</b> لكلٍّ منهما، و<b>الوسط وحده فارغ</b> (يلمع). الخطوط القطرية لا تمر إلا بالنقاط اللامعة بخفة. <b>القطع النحاسية أمامك لك</b>، و<b>أنت تبدأ</b>!' },
      { say: 'تتحرك القطعة <b>على خط إلى نقطة فارغة أمامها أو بجانبها</b>، خطوة واحدة. <b>لا تعود إلى الخلف</b> (إلا عند الأسر). حرّك قطعة بيضاء!', done: 'رائع! شيئًا فشيئًا إلى الأمام.' },
      { say: 'والآن الجد! <b>اقفز فوق قطعة مجاورة للخصم</b> إلى النقطة الفارغة خلفها فـ<b>تأسرها</b>. عند الأسر يمكنك القفز <b>في أي اتجاه</b>. اقفز بقطعة c2 فوق الأسود!', done: 'هوب، أسرتها! تصطف القطع المأسورة في الصينية أمامك.' },
      { say: 'قاعدة مهمة! <b>إذا استطعت الأسر وجب عليك</b>. القطع اللامعة هي التي تستطيع. هيا، اأسر!', done: 'بالضبط! لا يمكنك رفض الأسر، لذا قد يكون تقديم قطعة عمدًا فخًّا.' },
      { say: 'إذا استطعت الأسر مجددًا من حيث هبطت، <b>يجب أن تواصل القفز في الدور نفسه</b> (<b>أسر متتابع</b>)! خذ قطعتين سوداوين بقطعة a1!', done: 'هوب هوب! اثنتان في نقلة واحدة!' },
      { say: 'الفوز سهل: <b>اأسر كل قطع الخصم</b> أو اتركه <b>عاجزًا عن الحركة</b>! اقفز فوق آخر قطعة سوداء لتنهي اللعبة!', done: 'مرحى، فزت! لم تبقَ قطعة سوداء واحدة.' },
      { say: 'القطعة التي تصل إلى الصف الأخير (البيضاء اللامعة) <b>لا تتحرك إلا جانبيًا</b>. ويكون التعادل إذا <b>تكرر الوضع نفسه ثلاث مرات</b> أو بعد <b>80 نقلة دون أسر</b>.' },
      { say: 'في نافذة اللعبة يمكنك أيضًا اللعب كما في <b>كتاب الألعاب</b> لألفونسو العاشر، حيث <b>يجوز التراجع أيضًا</b>. هيا نلعب، بززز!' },
    ] },
  };

  /* ---------- little sounds: a wooden ball on wood, a chime, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    function tone(f0, f1, dur, vol, type, d = 0) {
      const C = on && ac(); if (!C) return; const t = C.currentTime + d, o = C.createOscillator(), g = C.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g).connect(C.destination); o.start(t); o.stop(t + dur + .02);
    }
    const tok = (v = 1) => tone(260 * v, 120, .1, .18);
    const clack = () => tone(900, 420, .07, .07);
    const chime = () => [659.25, 880, 1318.5].forEach((f, i) => tone(f, 0, .45, .08, 'triangle', i * .07));
    const blip = () => { const f = 520 + Math.random() * 240; tone(f, f * (Math.random() < .5 ? 1.25 : .82), .06, .06, 'triangle'); };
    return { tok, clack, chime, blip, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, F3 = T3.alquerque, L = TXT[ctx.lang] || TXT.en;
    const board = F3.board('alq'); T3.show('alquerque', board); T3.play(true);
    const U = board.userData, Y = U.top, GS = .66;
    if (T3.fit) T3.fit({ w: U.W + 1.2, d: U.H + 1.6, y: Y + .3, pitch: 1.0 });
    const marks = new TH.Group(); board.add(marks);
    let E = null, pos = null, pcs = {}, G = [], step = 0, stopped = false, busy = false, played = false, sel = null, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const xz = i => U.pt(i % 9, 4 - ((i / 9) | 0));   // (the engine numbers the points r * 9 + c)   // White (you) at the bottom
    const P = s => (+s[1] - 1) * 9 + 'abcde'.indexOf(s[0]);
    const specOf = o => { if (Array.isArray(o)) { let b = ''; for (let r = 0; r < 5; r++) b += (o[4 - r] + '....').slice(0, 9); return { b, side: 1 }; } const a = Array(45).fill('.'); (o.w || []).forEach(s => { a[P(s)] = 'w'; }); (o.b || []).forEach(s => { a[P(s)] = 'b'; }); return { b: a.join(''), side: 1 }; };

    /* ---------- balls ---------- */
    function mk(k, scale = 1) { const g = U.piece(k, scale), sh = T3.contact(g.userData.r * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; board.add(g); return g; }
    function lift(g, h, base, surf) {
      const b = base ?? U.rest; g.position.y = b + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = (surf ?? U.top + .002) - g.position.y; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); }
    }
    const _ax = new TH.Vector3(), _q = new TH.Quaternion();
    function roll(g, dx, dz) { if (g.userData.noRoll) return; const d = Math.hypot(dx, dz); if (d < 1e-5) return; _ax.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_ax, d / g.userData.r); g.userData.ball.quaternion.premultiply(_q); }
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function bump(g) { const r = g.userData.r; anim(150, k => g.userData.ball.scale.setScalar(r * (1 + Math.sin(k * Math.PI) * .05)), () => g.userData.ball.scale.setScalar(r)); }
    function setBoard() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; G.forEach(drop); G = [];
      let n = 0;
      for (let i = 0; i < 45; i++) {
        const k = pos.at(i); if (!k) continue;
        const g = mk(k), [x, z] = xz(i); g.position.set(x, U.rest, z); pcs[i] = { g, k };
        g.visible = false; const d = 40 + (n++) * 12;
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); bump(g); }); }, d);
      }
      return n;
    }
    // one step: the ball rolls along the line; its captures pop out and hop into your groove
    function step3(stp, done) {
      const o = pcs[stp.from]; delete pcs[stp.from]; pcs[stp.to] = o;
      const g = o.g, [x0, z0] = xz(stp.from), [x1, z1] = xz(stp.to), h0 = g.userData.h0 || 0; let px = x0, pz = z0;
      anim(300, k => { const e = io(k), x = x0 + (x1 - x0) * e, z = z0 + (z1 - z0) * e; roll(g, x - px, z - pz); px = x; pz = z; g.position.x = x; g.position.z = z; lift(g, h0 * (1 - Math.min(1, k * 3))); }, () => { lift(g, 0); bump(g); SFX.tok(); });
      stp.cap.forEach((c, k) => {
        const v = pcs[c]; delete pcs[c]; if (!v) return;
        const vg = v.g, slotI = G.length; G.push(vg);
        later(() => {
          const [tx, tz] = U.groove.at(1, slotI, 12), ty = U.groove.y(GS), sx = vg.position.x, sy = vg.position.y, sz = vg.position.z, r0 = vg.userData.r, r1 = F3.R * GS; let qx = sx, qz = sz;
          SFX.clack();
          anim(560, q => {
            const e = io(q), x = sx + (tx - sx) * e, z = sz + (tz - sz) * e, y = sy + (ty - sy) * e + Math.sin(q * Math.PI) * 1.1;
            roll(vg, (x - qx) * .5, (z - qz) * .5); qx = x; qz = z; vg.position.set(x, y, z);
            const r = r0 + (r1 - r0) * e; vg.userData.ball.scale.setScalar(r); vg.userData.r = r;
            if (vg.userData.sh) { vg.userData.sh.material.opacity = .5 * Math.max(0, 1 - Math.sin(q * Math.PI) * 1.2); vg.userData.sh.position.y = (U.top + .002 + (ty - r - U.top) * e) - y; }
          }, () => { vg.userData.r = r1; lift(vg, 0, ty, ty - r1 + .002); bump(vg); SFX.tok(1.6); });
        }, 240 + k * 70);
      });
      later(done, 340 + (stp.cap.length ? 300 + stp.cap.length * 70 : 0));
    }

    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) { const m = marks.children[0]; marks.remove(m); if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); } }
    function disc(i, color, r = .13, op = .9, pulse = true) {
      const m = new TH.Mesh(new TH.CylinderGeometry(r, r, .012, 28), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      const [x, z] = xz(i); m.position.set(x, Y + .02, z); m.userData.pulse = pulse; m.renderOrder = 2; marks.add(m); return m;
    }
    function ring(i, color, r = .42) {
      const m = new TH.Mesh(new TH.TorusGeometry(r, .032, 8, 44), new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false, depthWrite: false }));
      m.rotation.x = Math.PI / 2; const [x, z] = xz(i); m.position.set(x, Y + .04, z); m.userData.pulse = true; m.renderOrder = 2; marks.add(m); return m;
    }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; const s = .88 + k * .24; m.scale.set(s, m.geometry.type === 'TorusGeometry' ? s : 1, s); m.material.opacity = .45 + k * .5; } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();
    const own = () => { const out = []; for (let i = 0; i < 45; i++) if (pos.at(i) === 1) out.push(i); return out; };
    // the steps the task accepts (from the engine), as first steps of a turn
    function accepted(st) {
      const f = pos.firstSteps();
      if (st.act === 'move') return f.filter(x => !x.cap.length);
      if (st.act === 'chain') return f.filter(x => x.cap.length && x.from === P(st.from));
      return f.filter(x => x.cap.length);
    }
    function showTask() {
      clearMarks(); const st = STEPS[step];
      if (st.strong) for (let i = 0; i < 45; i++) if (i % 9 < 5 && E.strong(i) && !pos.at(i)) disc(i, 0xffc24a, .09, .7);
      (st.far || []).forEach(s => disc(P(s), 0x5aa8ff, .2));
      (st.glow || []).forEach(s => disc(P(s), 0xffc24a, .2));
      if (st.path) st.path.forEach((s, k) => k ? disc(P(s), 0x3ee08a, .14) : ring(P(s), 0xfff0c0));
      if (!st.act || played) return;
      if (sel) {
        ring(sel.st ? sel.st.cur : sel.from, 0xfff0c0);
        if (sel.choose) { disc(sel.choose[0].to, 0x3ee08a); sel.choose.forEach(x => x.cap.forEach(v => ring(v, x.kind === 'A' ? 0xff8a2a : 0x5aa8ff, .4))); return; }
        const L2 = sel.st ? pos.capSteps(sel.st) : accepted(st).filter(x => x.from === sel.from);
        new Set(L2.map(x => x.to)).forEach(t => disc(t, L2.find(x => x.to === t).cap.length ? 0xff8a2a : 0x3ee08a));
        return;
      }
      new Set(accepted(st).map(x => x.from)).forEach(f => ring(f, st.must ? 0xffc24a : 0x3ee08a));
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
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false; sel = null;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      pos = E.Pos.from(specOf(st.g || st.p));
      const cnt = setBoard();
      later(showTask, 380 + cnt * 12);
      say(L.s[step].say); buttons();
    }
    function finish() {
      played = true; busy = false; sel = null; clearMarks();
      const st = STEPS[step];
      if (L.s[step].done) say(L.s[step].done);
      if (st.act === 'win') { SFX.chime(); tip('🏆 ' + L.win); Object.values(pcs).forEach(p => anim(700, k => lift(p.g, Math.sin(k * Math.PI) * .6))); }
      else SFX.chime();
      buttons(); autoNext();
    }
    // solved: on to the next step by itself once the reaction has been read (every rules tour)
    function autoNext() { const s0 = step, n = ((L.s[step] && L.s[step].done) || '').replace(/<[^>]+>/g, '').length; const ms = Math.min(3200, 1100 + n * 30); if (window.AtlasRgdTimer) AtlasRgdTimer(el.querySelector('[data-a="next"]'), ms, () => step === s0); later(() => { if (step === s0 && !STEPS[step].last) go(step + 1); }, ms); }
    function pointOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const dc = Math.round(p.x + 2), dr = Math.round(p.z + 2);
      if (dc < 0 || dc > 4 || dr < 0 || dr > 4 || Math.hypot(p.x + 2 - dc, p.z + 2 - dr) > .5) return -1;
      return (4 - dr) * 9 + dc;
    }
    function liftBall(i, on) { const p = pcs[i]; if (!p) return; const g = p.g, h0 = g.userData.h0 || 0, h1 = on ? .22 : 0; anim(120, k => lift(g, h0 + (h1 - h0) * io(k))); }
    function doStep(stp) {
      busy = true; clearMarks(); const st = STEPS[step];
      step3(stp, () => {
        busy = false;
        if (!stp.cap.length) { finish(); return; }
        sel.st = E.Pos.after(pos, sel.st, stp); sel.steps.push(stp); sel.choose = null;
        const more = pos.capSteps(sel.st);
        if (more.length) { say(L.more); showTask(); return; }   // (Alquerque: a capture chain must go on)
        if (st.act === 'chain' && sel.steps.length < 2) { say(L.more); return; }
        finish();
      });
    }
    function onClick(e) {
      if (busy || played || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step]; if (!st.act || !E) return;
      const i = pointOf(e), A = accepted(st);
      if (sel && sel.choose) { const pick = sel.choose.find(x => x.cap.includes(i)); if (pick) doStep(pick); else say(L.pick); return; }
      if (sel && sel.st) { const opts = pos.capSteps(sel.st).filter(x => x.to === i); if (opts.length) doStep(opts[0]); else say(L.more); return; }
      if (i < 0) return;
      if (pos.at(i) === 1) {
        if (sel && sel.from === i) { liftBall(i, false); sel = null; showTask(); return; }
        if (!A.some(x => x.from === i)) { say(pos.hasCaps() ? L.must : L.stuck); return; }
        if (sel) liftBall(sel.from, false);
        sel = { from: i, st: null, steps: [], choose: null }; liftBall(i, true); SFX.tok(1.3); showTask(); return;
      }
      if (!sel) { say(A.length && st.must ? L.must : L.tap); return; }
      const all = pos.firstSteps().filter(x => x.from === sel.from && x.to === i), opts = A.filter(x => x.from === sel.from && x.to === i);
      if (!opts.length) { say(all.length ? (st.act === 'move' ? L.wantMove : st.must ? L.must : L.wantCap) : L.nope); return; }
      if (opts.length > 1) { sel.choose = opts; say(L.pick); showTask(); return; }
      doStep(opts[0]);
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
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('alq'); later(() => go(0), 300); }).catch(() => say('⚠'));
    try { localStorage.setItem('aicoding-alquerque-rules-seen', '1'); } catch (e) {}
    const dbg = { at: s => { const [x, z] = xz(P(s)); return T3.project(x, z, Y); }, step: () => step, steps: STEPS.length, played: () => played, go: n => go(n) };
    window.__aqRules = dbg;   // (test hook)
    return {
      stop() { stopped = true; if (window.__aqRules === dbg) delete window.__aqRules; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); clearMarks(); el.remove(); },
      panel: el,
      _debug: dbg,
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.alquerque = { start };
})();
