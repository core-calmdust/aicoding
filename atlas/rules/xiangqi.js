/* =====================================================================
   Xiangqi rules — a guided tour on the 3D table, told by the guide
   character (Shogitsune, visiting shogi's cousin). Built from the full
   game's hands-on rules (xiangqi/app.js: shared/ruletour.js pages),
   turned into a short scenario on the boxwood board.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Points are given in ICCS notation ('e0' = Red's general; files a–i from
   Red's left, ranks 0–9 from Red's side). Red is at the bottom.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-shogi.webp';
  const FILES = 'abcdefghi';
  const ij = n => [FILES.indexOf(n[0]), 9 - (+n[1])];   // 'e0' → [file 0..8 left → right, row 0 = top (rank 9)]
  const INIT = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR';
  // FEN board part → [[code, 'e0'], ...] (code: 1 帥 … 7 兵, +8 black)
  function parse(fen) {
    const out = []; fen.split('/').forEach((row, r) => { let c = 0; for (const ch of row) { if (/\d/.test(ch)) { c += +ch; continue; } const blk = ch === ch.toLowerCase(), t = ' kabnrcp'.indexOf(ch.toLowerCase()); out.push([t | (blk ? 8 : 0), FILES[c] + (9 - r)]); c++; } });
    return out;
  }
  const line = (from, df, dr, stop = []) => { const [f0, r0] = [FILES.indexOf(from[0]), +from[1]], o = []; for (let f = f0 + df, r = r0 + dr; f >= 0 && f < 9 && r >= 0 && r <= 9; f += df, r += dr) { const n = FILES[f] + r; if (stop.includes(n)) break; o.push(n); } return o; };

  const TXT = {
    ja: {
      name: 'ショウギツネ', next: 'つぎへ', back: 'もどる', start: '指してみる', again: 'もういちど', tap: '光っている点をタップ', nope: 'そこへは動けないよ〜', mate: '詰み！',
      s: [
        { say: 'やあ、<b>ショウギツネ</b>だよ！ きょうは将棋のいとこ、<b>シャンチー（中国象棋）</b>をいっしょに見てみよう。' },
        { say: '駒はマスではなく<b>線の交わる点</b>に置くよ。真ん中の<b>川（楚河・漢界）</b>で陣地が分かれ、×印の枠が<b>九宮</b>。手前の<b>赤</b>がきみで、<b>赤が先手</b>だよ。' },
        { say: '目的は相手の<b>帥（將）を詰ませること</b>！ 光っているのがおたがいの大将。帥は九宮の中を1歩ずつしか動けないんだ。' },
        { say: '<b>俥（車）</b>はタテ・ヨコに何点でも進めるいちばん強い駒。光っている点をタップして、黒の駒を取ってみて！', done: 'ズバッ！ 相手の駒がいる点に動くと、その駒を取れるよ。' },
        { say: '<b>傌（馬）</b>は1歩まっすぐ進んでから1歩ナナメへ（「日」の字）。馬で黒の卒を取ってみて！', done: 'パカッ！ チェスのナイトと同じ形だね。' },
        { say: 'でも馬は飛び越えられない！ 最初に進む点に駒があると、その方向へは行けない（<b>馬の足をしばる</b>）。動ける方向へ馬を動かしてみて。', done: 'そう！ 足がしばられていない方向にだけ跳べるんだ。' },
        { say: '<b>相（象）</b>はナナメに2歩で<b>川を渡れない</b>守りの駒（左）。<b>仕（士）</b>は九宮の中をナナメに1歩（右）。どちらも帥を守るんだ。' },
        { say: '<b>炮（砲）</b>はふだんは俥と同じ動き。でも<b>取るときは駒を1つ（炮台）飛び越えて</b>取るよ。炮で黒の車を取ってみて！', done: 'ドーン！ 卒が炮台になったね。' },
        { say: '<b>兵（卒）</b>は前に1歩だけ。でも<b>川を渡るとヨコにも</b>動けるようになる。兵で横の黒の馬を取ってみて！', done: 'やった！ 川を渡った兵は強いよ。' },
        { say: '帥と將は、同じ筋で間に駒がないと<b>向かい合えない</b>（対面禁止）。だから帥も攻めに使える！ 俥を動かして、黒の將が動けない形にしてみて。', done: '勝ち！ 將は帥と向かい合う点へは逃げられないんだ。' },
        { say: '帥をねらう手が<b>王手（将軍）</b>。どう受けても防げなければ<b>詰み</b>で勝ち！ 俥を光る点へ動かして、黒の將を詰ませて！', done: 'やったー、<b>詰み</b>！' },
        { say: 'シャンチーでは<b>指せる手がなくなった側も負け</b>。同じ局面が3回なら引き分けだけど、<b>王手をかけ続けたり、駒を追い続けたりした側は負け</b>だよ。さあ、指してみよう！' },
      ],
    },
    en: {
      name: 'Shogitsune', next: 'Next', back: 'Back', start: 'Let\'s play', again: 'Again', tap: 'Tap a glowing point', nope: 'It can\'t go there!', mate: 'Checkmate!',
      s: [
        { say: 'Hi, I\'m <b>Shogitsune</b>! Today let\'s visit shogi\'s cousin: <b>xiangqi</b>, Chinese chess.' },
        { say: 'Pieces stand on the <b>points where lines cross</b>. The <b>river</b> splits the camps, and the boxes with an × are the <b>palaces</b>. You are <b>Red</b> at the near side, and <b>Red moves first</b>.' },
        { say: 'The goal: <b>checkmate the enemy general</b>! The glowing pieces are the two generals. A general only steps one point at a time inside its palace.' },
        { say: 'The <b>rook</b> (chariot) goes any distance straight — the strongest piece. Tap a glowing point and capture a black piece!', done: 'Wham! Moving onto an enemy piece captures it.' },
        { say: 'The <b>horse</b> steps one point straight, then one diagonally — like a chess knight. Take the black pawn with it!', done: 'Clip-clop! Same shape as the knight.' },
        { say: 'But the horse can\'t jump! If the point it first steps onto is occupied, it can\'t go that way (a <b>hobbled leg</b>). Move the horse in a free direction.', done: 'Right! It only goes where its leg is free.' },
        { say: 'The <b>elephant</b> moves two points diagonally and <b>never crosses the river</b> (left). The <b>advisor</b> steps one point diagonally inside the palace (right). Both guard the general.' },
        { say: 'The <b>cannon</b> moves like a rook, but <b>captures by jumping over exactly one piece</b> (the screen). Take the black rook!', done: 'Boom! The pawn was the screen.' },
        { say: 'The <b>pawn</b> steps one point forward — and <b>once across the river</b> it may also step sideways. Take the black horse beside it!', done: 'Yes! A pawn across the river is strong.' },
        { say: 'The two generals may <b>never face each other</b> on an open file. So your general helps attack! Move the rook so the black general has no move.', done: 'You win! The black general can\'t step onto the file facing yours.' },
        { say: 'Threatening the general is <b>check</b>. If it can\'t be answered, it\'s <b>checkmate</b> and you win! Move the rook to the glowing point and mate!', done: 'Hooray, <b>checkmate</b>!' },
        { say: 'In xiangqi a side with <b>no legal move also loses</b>. A threefold repetition is a draw — but <b>perpetual check or perpetual chasing loses</b>. Let\'s play!' },
      ],
    },
    zh: {
      name: '将棋狐', next: '下一步', back: '返回', start: '开始下棋', again: '再来一次', tap: '点击发光的点', nope: '那里走不了哦！', mate: '将死！',
      s: [
        { say: '你好，我是<b>将棋狐</b>！今天一起来看看将棋的亲戚——<b>中国象棋</b>。' },
        { say: '棋子放在<b>线的交叉点</b>上。中间的<b>楚河汉界</b>分开两方，画“×”的方框是<b>九宫</b>。靠近你的<b>红方</b>就是你，<b>红方先走</b>。' },
        { say: '目标是<b>将死对方的将（帅）</b>！发光的就是双方主帅，帅只能在九宫里一步一步走。' },
        { say: '<b>车</b>直线任意走，是最强的棋子。点击发光的点，吃掉一个黑子吧！', done: '吃掉了！走到对方棋子的位置就能吃掉它。' },
        { say: '<b>马</b>先直走一步再斜走一步（走“日”字）。用马吃掉黑卒吧！', done: '哒哒！和国际象棋的马一样。' },
        { say: '但是马不能越子！先走的那一点有棋子就不能往那边走（<b>蹩马腿</b>）。把马走向可以走的方向。', done: '对！只能走没有蹩腿的方向。' },
        { say: '<b>相（象）</b>斜走两步，<b>不能过河</b>（左）。<b>仕（士）</b>在九宫里斜走一步（右）。它们都保护主帅。' },
        { say: '<b>炮</b>平时走法和车一样，<b>吃子时要隔一个子（炮架）</b>。用炮打掉黑车！', done: '轰！卒当了炮架。' },
        { say: '<b>兵（卒）</b>只能向前一步，<b>过河后还能横走</b>。用兵吃掉旁边的黑马！', done: '好！过河兵很厉害。' },
        { say: '将帅在同一直线上且中间无子时<b>不能照面</b>，所以帅也能参与进攻！走车，让黑将无路可走。', done: '胜利！黑将不能走到与帅照面的位置。' },
        { say: '攻击主帅叫<b>将军</b>，无法应将就是<b>将死</b>！把车走到发光的点，将死黑将！', done: '太好了，<b>将死</b>！' },
        { say: '象棋里<b>无子可动也算输</b>。同一局面出现三次为和棋，但<b>长将、长捉的一方判负</b>。来下一盘吧！' },
      ],
    },
    ko: {
      name: '쇼기츠네', next: '다음', back: '이전', start: '두어 보기', again: '다시', tap: '빛나는 점을 탭하세요', nope: '거기로는 갈 수 없어!', mate: '외통!',
      s: [
        { say: '안녕, 나는 <b>쇼기츠네</b>! 오늘은 쇼기의 사촌, <b>샹치(중국 장기)</b>를 함께 살펴보자.' },
        { say: '기물은 칸이 아니라 <b>선이 만나는 점</b>에 놓아. 가운데 <b>강</b>이 진영을 나누고, ×표가 있는 칸이 <b>궁성</b>이야. 앞쪽의 <b>홍</b>이 너, <b>홍이 먼저</b> 둬.' },
        { say: '목표는 상대 <b>장(將)을 외통시키는 것</b>! 빛나는 것이 서로의 대장이야. 장은 궁성 안에서 한 칸씩만 움직여.' },
        { say: '<b>차</b>는 가로·세로로 몇 점이든 가는 가장 강한 기물. 빛나는 점을 탭해서 흑의 기물을 잡아 봐!', done: '잡았다! 상대 기물이 있는 점으로 가면 잡을 수 있어.' },
        { say: '<b>마</b>는 직선 한 칸 뒤 대각선 한 칸(日 자). 마로 흑의 졸을 잡아 봐!', done: '따각! 체스의 나이트와 같은 모양이지.' },
        { say: '하지만 마는 뛰어넘지 못해! 먼저 가는 점에 기물이 있으면 그쪽으로 못 가(<b>마의 다리</b>가 막힘). 갈 수 있는 쪽으로 마를 움직여 봐.', done: '맞아! 다리가 막히지 않은 쪽으로만 가.' },
        { say: '<b>상</b>은 대각선 두 칸, <b>강을 못 건너</b>(왼쪽). <b>사</b>는 궁성 안에서 대각선 한 칸(오른쪽). 둘 다 장을 지켜.' },
        { say: '<b>포</b>는 평소엔 차처럼 움직이지만 <b>잡을 때는 기물 하나(포대)를 넘어서</b> 잡아. 포로 흑의 차를 잡아 봐!', done: '쾅! 졸이 포대가 됐어.' },
        { say: '<b>병</b>은 앞으로 한 칸만. 하지만 <b>강을 건너면 옆으로도</b> 갈 수 있어. 병으로 옆의 흑 마를 잡아 봐!', done: '좋아! 강을 건넌 병은 강해.' },
        { say: '두 장은 같은 줄에서 사이에 기물이 없으면 <b>마주볼 수 없어</b>. 그래서 장도 공격에 쓸 수 있지! 차를 움직여 흑 장이 움직일 수 없게 해 봐.', done: '승리! 흑 장은 내 장과 마주보는 점으로 갈 수 없어.' },
        { say: '장을 노리는 수가 <b>장군</b>. 막을 수 없으면 <b>외통</b>으로 승리! 차를 빛나는 점으로 옮겨 외통시켜 봐!', done: '야호, <b>외통</b>!' },
        { say: '샹치에서는 <b>둘 수가 없는 쪽도 패배</b>야. 같은 국면이 3번이면 무승부지만 <b>계속 장군을 부르거나 계속 쫓은 쪽은 패배</b>. 자, 둬 보자!' },
      ],
    },
    es: {
      name: 'Shogitsune', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tap: 'Toca un punto brillante', nope: '¡No puede ir ahí!', mate: '¡Mate!',
      s: [
        { say: '¡Hola, soy <b>Shogitsune</b>! Hoy visitamos al primo del shogi: el <b>xiangqi</b>, ajedrez chino.' },
        { say: 'Las piezas van en los <b>cruces de las líneas</b>. El <b>río</b> separa los campos y los recuadros con × son los <b>palacios</b>. Tú eres el <b>Rojo</b>, abajo, y <b>empieza el Rojo</b>.' },
        { say: 'El objetivo: <b>dar mate al general</b> rival. Las piezas que brillan son los generales; solo se mueven un punto dentro de su palacio.' },
        { say: 'El <b>carro</b> avanza cualquier distancia en línea recta: la pieza más fuerte. ¡Toca un punto brillante y captura una pieza negra!', done: '¡Zas! Moverse a una pieza rival la captura.' },
        { say: 'El <b>caballo</b> da un paso recto y otro en diagonal, como en el ajedrez. ¡Captura el peón negro!', done: '¡Cataplán! Igual que el caballo del ajedrez.' },
        { say: 'Pero el caballo no salta: si el punto de su primer paso está ocupado, no puede ir por ahí (<b>caballo trabado</b>). Muévelo hacia un lado libre.', done: '¡Eso! Solo va donde su pata está libre.' },
        { say: 'El <b>elefante</b> va dos puntos en diagonal y <b>no cruza el río</b> (izquierda). El <b>consejero</b> da un paso diagonal en el palacio (derecha). Ambos protegen al general.' },
        { say: 'El <b>cañón</b> se mueve como el carro, pero <b>captura saltando exactamente una pieza</b> (la pantalla). ¡Captura el carro negro!', done: '¡Bum! El peón hizo de pantalla.' },
        { say: 'El <b>peón</b> avanza un punto y, <b>al cruzar el río</b>, también va de lado. ¡Captura el caballo negro de al lado!', done: '¡Bien! El peón que cruza el río es fuerte.' },
        { say: 'Los generales <b>no pueden enfrentarse</b> en una columna abierta, ¡así que el tuyo también ataca! Mueve el carro para que el general negro no tenga jugadas.', done: '¡Ganas! El general negro no puede ponerse frente al tuyo.' },
        { say: 'Amenazar al general es dar <b>jaque</b>; sin defensa es <b>mate</b> y ganas. ¡Lleva el carro al punto brillante y da mate!', done: '¡Bien, <b>mate</b>!' },
        { say: 'En xiangqi quien <b>no tiene jugadas también pierde</b>. Tres repeticiones son tablas, pero <b>el jaque o la persecución perpetuos pierden</b>. ¡A jugar!' },
      ],
    },
    fr: {
      name: 'Shogitsune', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tap: 'Touche un point lumineux', nope: 'Impossible d’aller là !', mate: 'Mat !',
      s: [
        { say: 'Salut, je suis <b>Shogitsune</b> ! Aujourd’hui, découvrons le cousin du shogi : le <b>xiangqi</b>, les échecs chinois.' },
        { say: 'Les pièces se posent sur les <b>intersections</b>. La <b>rivière</b> sépare les camps et les carrés marqués d’une × sont les <b>palais</b>. Tu es <b>Rouge</b>, en bas, et <b>Rouge commence</b>.' },
        { say: 'Le but : <b>mater le général</b> adverse ! Les pièces qui brillent sont les deux généraux ; ils avancent d’un point dans leur palais.' },
        { say: 'Le <b>char</b> va aussi loin qu’il veut en ligne droite : la pièce la plus forte. Touche un point lumineux et prends une pièce noire !', done: 'Vlan ! Aller sur une pièce adverse la capture.' },
        { say: 'Le <b>cheval</b> fait un pas droit puis un en diagonale, comme aux échecs. Prends le pion noir !', done: 'Tagada ! Comme le cavalier.' },
        { say: 'Mais il ne saute pas : si le point de son premier pas est occupé, il ne peut pas aller par là (<b>cheval entravé</b>). Joue-le vers un côté libre.', done: 'Oui ! Il ne va que là où sa jambe est libre.' },
        { say: 'L’<b>éléphant</b> fait deux points en diagonale et <b>ne traverse pas la rivière</b> (à gauche). Le <b>conseiller</b> fait un pas en diagonale dans le palais (à droite). Ils protègent le général.' },
        { say: 'Le <b>canon</b> se déplace comme le char, mais <b>prend en sautant exactement une pièce</b> (l’écran). Prends le char noir !', done: 'Boum ! Le pion servait d’écran.' },
        { say: 'Le <b>pion</b> avance d’un point et, <b>après la rivière</b>, va aussi de côté. Prends le cheval noir à côté !', done: 'Bravo ! Un pion passé est fort.' },
        { say: 'Les généraux <b>ne peuvent pas se faire face</b> sur une colonne ouverte : ton général attaque aussi ! Joue le char pour que le général noir n’ait plus de coup.', done: 'Gagné ! Le général noir ne peut pas se placer face au tien.' },
        { say: 'Menacer le général, c’est faire <b>échec</b> ; sans parade, c’est <b>mat</b> ! Mets le char sur le point lumineux et mate !', done: 'Hourra, <b>mat</b> !' },
        { say: 'Au xiangqi, un camp <b>sans coup légal perd aussi</b>. Trois répétitions font nulle, mais <b>l’échec ou la chasse perpétuels perdent</b>. À toi de jouer !' },
      ],
    },
    pt: {
      name: 'Shogitsune', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tap: 'Toque num ponto brilhante', nope: 'Não pode ir para lá!', mate: 'Mate!',
      s: [
        { say: 'Oi, eu sou a <b>Shogitsune</b>! Hoje vamos conhecer o primo do shogi: o <b>xiangqi</b>, xadrez chinês.' },
        { say: 'As peças ficam nos <b>cruzamentos das linhas</b>. O <b>rio</b> separa os campos e os quadros com × são os <b>palácios</b>. Você é o <b>Vermelho</b>, embaixo, e <b>o Vermelho começa</b>.' },
        { say: 'O objetivo: <b>dar mate no general</b> rival! As peças que brilham são os generais; eles andam um ponto dentro do palácio.' },
        { say: 'O <b>carro</b> anda qualquer distância em linha reta: a peça mais forte. Toque num ponto brilhante e capture uma peça preta!', done: 'Pá! Ir até uma peça rival a captura.' },
        { say: 'O <b>cavalo</b> anda um passo reto e um na diagonal, como no xadrez. Capture o peão preto!', done: 'Pocotó! Igual ao cavalo do xadrez.' },
        { say: 'Mas o cavalo não pula: se o ponto do primeiro passo estiver ocupado, ele não vai por ali (<b>cavalo travado</b>). Mova-o para um lado livre.', done: 'Isso! Só vai aonde a pata está livre.' },
        { say: 'O <b>elefante</b> anda dois pontos na diagonal e <b>não cruza o rio</b> (esquerda). O <b>conselheiro</b> anda um passo diagonal no palácio (direita). Ambos protegem o general.' },
        { say: 'O <b>canhão</b> anda como o carro, mas <b>captura pulando exatamente uma peça</b> (o anteparo). Capture o carro preto!', done: 'Bum! O peão serviu de anteparo.' },
        { say: 'O <b>peão</b> anda um ponto à frente e, <b>depois do rio</b>, também de lado. Capture o cavalo preto ao lado!', done: 'Boa! Peão depois do rio é forte.' },
        { say: 'Os generais <b>não podem se encarar</b> numa coluna aberta, então o seu também ataca! Mova o carro para o general preto ficar sem lances.', done: 'Vitória! O general preto não pode ficar de frente para o seu.' },
        { say: 'Ameaçar o general é dar <b>xeque</b>; sem defesa é <b>mate</b>! Leve o carro ao ponto brilhante e dê mate!', done: 'Eba, <b>mate</b>!' },
        { say: 'No xiangqi quem <b>não tem lance legal também perde</b>. Três repetições são empate, mas <b>xeque ou perseguição perpétuos perdem</b>. Vamos jogar!' },
      ],
    },
    de: {
      name: 'Shogitsune', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tap: 'Tippe auf einen leuchtenden Punkt', nope: 'Dorthin geht es nicht!', mate: 'Matt!',
      s: [
        { say: 'Hallo, ich bin <b>Shogitsune</b>! Heute besuchen wir den Cousin des Shogi: <b>Xiangqi</b>, das chinesische Schach.' },
        { say: 'Die Steine stehen auf den <b>Schnittpunkten der Linien</b>. Der <b>Fluss</b> trennt die Lager, die Felder mit × sind die <b>Paläste</b>. Du bist <b>Rot</b> unten, und <b>Rot beginnt</b>.' },
        { say: 'Das Ziel: <b>den gegnerischen General mattsetzen</b>! Die leuchtenden Steine sind die Generäle; sie ziehen nur einen Punkt im Palast.' },
        { say: 'Der <b>Wagen</b> zieht beliebig weit gerade — der stärkste Stein. Tippe auf einen leuchtenden Punkt und schlage einen schwarzen Stein!', done: 'Zack! Zieht man auf einen gegnerischen Stein, wird er geschlagen.' },
        { say: 'Das <b>Pferd</b> geht einen Schritt gerade, dann einen diagonal — wie der Springer. Schlage den schwarzen Soldaten!', done: 'Klapp-klapp! Wie der Springer.' },
        { say: 'Aber das Pferd springt nicht: Ist der Punkt seines ersten Schritts besetzt, kann es nicht dorthin (<b>gehemmtes Pferd</b>). Ziehe es in eine freie Richtung.', done: 'Genau! Es geht nur dorthin, wo sein Bein frei ist.' },
        { say: 'Der <b>Elefant</b> zieht zwei Punkte diagonal und <b>überquert nie den Fluss</b> (links). Der <b>Berater</b> zieht einen Punkt diagonal im Palast (rechts). Beide schützen den General.' },
        { say: 'Die <b>Kanone</b> zieht wie der Wagen, <b>schlägt aber über genau einen Stein</b> hinweg (den Schirm). Schlage den schwarzen Wagen!', done: 'Bumm! Der Soldat war der Schirm.' },
        { say: 'Der <b>Soldat</b> zieht einen Punkt vorwärts — <b>nach dem Fluss</b> auch seitwärts. Schlage das schwarze Pferd daneben!', done: 'Super! Ein Soldat jenseits des Flusses ist stark.' },
        { say: 'Die Generäle dürfen sich <b>nie auf offener Linie gegenüberstehen</b> — dein General greift also mit an! Ziehe den Wagen so, dass der schwarze General keinen Zug hat.', done: 'Gewonnen! Der schwarze General kann nicht gegenüber deinem stehen.' },
        { say: 'Den General anzugreifen ist <b>Schach</b>; ohne Abwehr ist es <b>Matt</b>! Ziehe den Wagen auf den leuchtenden Punkt und setze matt!', done: 'Hurra, <b>Matt</b>!' },
        { say: 'Im Xiangqi verliert auch, wer <b>keinen legalen Zug</b> hat. Dreifache Wiederholung ist remis — aber <b>Dauerschach oder Dauerjagd verliert</b>. Los geht’s!' },
      ],
    },
    hi: {
      name: 'शोगित्सुने', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tap: 'चमकते बिंदु पर टैप करें', nope: 'वहाँ नहीं जा सकता!', mate: 'मात!',
      s: [
        { say: 'नमस्ते, मैं <b>शोगित्सुने</b> हूँ! आज शोगी के चचेरे भाई <b>शियांगची</b> (चीनी शतरंज) को देखते हैं।' },
        { say: 'मोहरे <b>रेखाओं के कटाव बिंदुओं</b> पर रखे जाते हैं। बीच की <b>नदी</b> खेमों को बाँटती है और × वाले खाने <b>महल</b> हैं। आप नीचे <b>लाल</b> हैं, और <b>लाल पहले</b> चलता है।' },
        { say: 'लक्ष्य: विरोधी <b>सेनापति को मात देना</b>! चमकते मोहरे दोनों सेनापति हैं; वे महल के अंदर एक-एक बिंदु चलते हैं।' },
        { say: '<b>रथ</b> सीधा कितनी भी दूर चलता है — सबसे ताक़तवर मोहरा। चमकते बिंदु पर टैप करें और काला मोहरा पकड़ें!', done: 'वाह! विरोधी के मोहरे पर जाने से वह पकड़ा जाता है।' },
        { say: '<b>घोड़ा</b> एक कदम सीधा फिर एक तिरछा चलता है, शतरंज के घोड़े जैसा। काला सिपाही पकड़ें!', done: 'टप-टप! शतरंज के घोड़े जैसा।' },
        { say: 'पर घोड़ा कूद नहीं सकता! पहले कदम वाला बिंदु भरा हो तो उधर नहीं जा सकता (<b>पैर बँधा</b>)। घोड़े को खुली दिशा में चलाएँ।', done: 'सही! वह वहीं जाता है जहाँ पैर खुला हो।' },
        { say: '<b>हाथी</b> दो बिंदु तिरछा चलता है और <b>नदी पार नहीं करता</b> (बाएँ)। <b>सलाहकार</b> महल में एक बिंदु तिरछा (दाएँ)। दोनों सेनापति की रक्षा करते हैं।' },
        { say: '<b>तोप</b> रथ जैसी चलती है, पर <b>पकड़ते समय ठीक एक मोहरे के ऊपर से</b> पकड़ती है। काला रथ पकड़ें!', done: 'धड़ाम! सिपाही पर्दा बना।' },
        { say: '<b>सिपाही</b> एक बिंदु आगे चलता है — <b>नदी पार करके</b> बगल में भी। बगल का काला घोड़ा पकड़ें!', done: 'शाबाश! नदी पार सिपाही ताक़तवर है।' },
        { say: 'दोनों सेनापति खुली फ़ाइल पर <b>आमने-सामने नहीं आ सकते</b> — इसलिए आपका सेनापति भी हमला करता है! रथ चलाएँ ताकि काले सेनापति के पास कोई चाल न रहे।', done: 'जीत! काला सेनापति आपके सामने नहीं आ सकता।' },
        { say: 'सेनापति पर हमला <b>शह</b> है; बचाव न हो तो <b>मात</b>! रथ को चमकते बिंदु पर ले जाएँ और मात दें!', done: 'हुर्रे, <b>मात</b>!' },
        { say: 'शियांगची में <b>कोई वैध चाल न हो तो भी हार</b> है। तीन बार दोहराव ड्रॉ है, पर <b>लगातार शह या लगातार पीछा करने वाला हारता है</b>। चलिए खेलें!' },
      ],
    },
    ar: {
      name: 'شوغيتسوني', next: 'التالي', back: 'رجوع', start: 'العب', again: 'مرة أخرى', tap: 'انقر على نقطة مضيئة', nope: 'لا يمكنها الذهاب إلى هناك!', mate: 'كش مات!',
      s: [
        { say: 'مرحبًا، أنا <b>شوغيتسوني</b>! اليوم نزور ابن عم الشوغي: <b>شيانغ تشي</b>، الشطرنج الصيني.' },
        { say: 'توضع القطع على <b>نقاط تقاطع الخطوط</b>. يفصل <b>النهر</b> المعسكرين، والمربعان المعلّمان بـ× هما <b>القصران</b>. أنت <b>الأحمر</b> في الأسفل، و<b>يبدأ الأحمر</b>.' },
        { say: 'الهدف: <b>كش مات جنرال الخصم</b>! القطع المضيئة هي الجنرالان، ويتحرك كل منهما نقطة واحدة داخل قصره.' },
        { say: '<b>العربة</b> تتحرك أي مسافة بخط مستقيم، وهي أقوى قطعة. انقر على نقطة مضيئة وخذ قطعة سوداء!', done: 'رائع! الانتقال إلى قطعة الخصم يأسرها.' },
        { say: '<b>الحصان</b> يخطو خطوة مستقيمة ثم قطرية، كحصان الشطرنج. خذ الجندي الأسود!', done: 'طق طق! مثل حصان الشطرنج.' },
        { say: 'لكن الحصان لا يقفز: إذا كانت نقطة خطوته الأولى مشغولة لا يذهب إلى هناك (<b>حصان معرقل</b>). حرّكه في اتجاه حر.', done: 'صحيح! يتحرك فقط حيث تكون ساقه حرة.' },
        { say: '<b>الفيل</b> يتحرك نقطتين قطريًا و<b>لا يعبر النهر</b> (يسارًا). <b>المستشار</b> يخطو نقطة قطرية داخل القصر (يمينًا). كلاهما يحمي الجنرال.' },
        { say: '<b>المدفع</b> يتحرك كالعربة، لكنه <b>يأسر بالقفز فوق قطعة واحدة بالضبط</b> (الحاجز). خذ العربة السوداء!', done: 'بوم! كان الجندي هو الحاجز.' },
        { say: '<b>الجندي</b> يتقدم نقطة واحدة، و<b>بعد عبور النهر</b> يتحرك جانبيًا أيضًا. خذ الحصان الأسود بجانبه!', done: 'أحسنت! الجندي بعد النهر قوي.' },
        { say: 'لا يجوز أن <b>يتواجه الجنرالان</b> على عمود مفتوح، لذا جنرالك يهاجم أيضًا! حرّك العربة بحيث لا يجد الجنرال الأسود نقلة.', done: 'فزت! لا يستطيع الجنرال الأسود الوقوف أمام جنرالك.' },
        { say: 'تهديد الجنرال هو <b>الكش</b>، وإذا لم يُصد فهو <b>كش مات</b>! انقل العربة إلى النقطة المضيئة وأنهِ اللعبة!', done: 'هيا، <b>كش مات</b>!' },
        { say: 'في شيانغ تشي <b>من لا يملك نقلة قانونية يخسر أيضًا</b>. التكرار الثلاثي تعادل، لكن <b>تكرار الكش أو المطاردة يخسر</b>. هيا نلعب!' },
      ],
    },
  };

  /* board, marks and interactivity of each step.
     fen: the position (board part)   glow: pulsing points (+ the pieces there bob)   blue: static blue points   gold: soft gold points
     sel: the piece that moves   act: { to: [points], kind: slide|hop, mate } */
  const STEPS = [
    { fen: INIT },
    { fen: INIT, gold: ['d0', 'e0', 'f0', 'd1', 'e1', 'f1', 'd2', 'e2', 'f2', 'd9', 'e9', 'f9', 'd8', 'e8', 'f8', 'd7', 'e7', 'f7'] },
    { fen: INIT, glow: ['e0', 'e9'] },
    { fen: '3k5/9/9/1n7/9/9/1R5p1/9/9/4K4', sel: 'b3', act: { to: ['b6', 'h3'], kind: 'slide' }, blue: [...line('b3', 0, 1, ['b6']), ...line('b3', 0, -1), ...line('b3', -1, 0), ...line('b3', 1, 0, ['h3'])] },
    { fen: '3k5/9/9/9/9/9/3p5/9/4H4/4K4', sel: 'e1', act: { to: ['d3'], kind: 'hop' }, blue: ['f3', 'c2', 'g2', 'c0', 'g0'] },
    { fen: '3k5/9/9/9/9/9/2r6/3P5/3H5/4K4', sel: 'd1', act: { to: ['b2', 'f2', 'b0', 'f0'], kind: 'hop' }, gold: ['d2'] },
    { fen: '3k5/9/9/9/9/9/9/9/4A4/2B1K4', blue: ['a2', 'e2'], gold: ['d0', 'f0', 'd2', 'f2'], glow: ['c0', 'e1'] },
    { fen: '3k5/9/1r7/9/9/1p7/9/1C7/9/4K4', sel: 'b2', act: { to: ['b7'], kind: 'slide' }, gold: ['b4'] },
    { fen: '3k5/9/9/9/3nP4/9/9/9/9/4K4', sel: 'e5', act: { to: ['d5'], kind: 'slide' }, blue: ['e6', 'f5'] },
    { fen: '3k5/9/9/9/9/9/9/9/7R1/4K4', sel: 'h1', act: { to: ['d1', 'h8'], kind: 'slide', mate: true }, gold: ['e9', 'e8', 'e7'] },
    { fen: '3k5/9/9/9/9/9/9/9/2R6/2R1K4', sel: 'c1', act: { to: ['d1'], kind: 'slide', mate: true } },
    { fen: INIT, last: true },
  ];

  /* ---------- little sounds: a wooden disc on boxwood, and a chirpy voice while the guide talks ---------- */
  const SFX = (() => {
    let on = true; try { on = localStorage.getItem('atlas-sfx') !== '0'; } catch (e) {}
    const ac = () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    let noiseBuf = null;
    const noise = C => { if (noiseBuf) return noiseBuf; const b = C.createBuffer(1, C.sampleRate * .08, C.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); return (noiseBuf = b); };
    function tok(vol = 1, pitch = 1) {
      const C = on && ac(); if (!C) return; const t = C.currentTime;
      const n = C.createBufferSource(); n.buffer = noise(C); const bp = C.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900 * pitch; bp.Q.value = 1.3;
      const g = C.createGain(); g.gain.setValueAtTime(.4 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); n.connect(bp).connect(g).connect(C.destination); n.start(t);
      const o = C.createOscillator(), og = C.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(260 * pitch, t); o.frequency.exponentialRampToValueAtTime(120 * pitch, t + .08);
      og.gain.setValueAtTime(.35 * vol, t); og.gain.exponentialRampToValueAtTime(.001, t + .12); o.connect(og).connect(C.destination); o.start(t); o.stop(t + .14);
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
    return { tok, blip, chime, get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('atlas-sfx', on ? '1' : '0'); } catch (e) {} if (on) ac(); return on; } };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, L = TXT[ctx.lang] || TXT.en;
    const board = T3.MODELS.xiangqi(true); T3.show('xiangqi', board); T3.play(true);
    const U = board.userData, Y = U.top, u = U.u;
    if (T3.fit) T3.fit({ w: U.W + .2, d: U.D + .5, y: Y + .2, pitch: 1.0 });   // the whole board, large, from the player's side
    const marks = new TH.Group(); board.add(marks);
    let pcs = {}, step = 0, stopped = false, busy = false, played = false, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick && T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const xz = n => U.pt(...ij(n));

    function mk(code) { const g = U.piece(code); const sh = T3.contact(u * .44, .5); sh.position.y = .002; g.add(sh); return g; }
    function clearPieces() { Object.values(pcs).forEach(g => board.remove(g)); pcs = {}; }
    function fall(g, delay, h = 1.3) { g.visible = false; later(() => { g.visible = true; anim(260, k => { g.position.y = Y + (1 - k) * (1 - k) * h; }); }, delay); }
    function setBoard(st) {
      clearPieces(); let i = 0;
      parse(st.fen).forEach(([code, n]) => { const g = mk(code), [x, z] = xz(n); g.position.set(x, Y, z); board.add(g); pcs[n] = g; fall(g, 40 + (i++) * 14); });
      return i;
    }
    /* ---------- marks ---------- */
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); Object.values(pcs).forEach(p => { p.userData.bob = false; }); }
    function spot(n, color, op = .5, pulse = false, r = .46) {
      const m = new TH.Mesh(new TH.CircleGeometry(u * r, 32), new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; const [x, z] = xz(n); m.position.set(x, Y + .012, z); m.userData.pulse = pulse; marks.add(m); return m;
    }
    function ring(n) { const m = new TH.Mesh(new TH.CylinderGeometry(u * .16, u * .16, .02, 28), new TH.MeshBasicMaterial({ color: 0x2fd17a, transparent: true, opacity: .85, toneMapped: false })); const [x, z] = xz(n); m.position.set(x, Y + .02, z); m.userData.pulse = true; marks.add(m); return m; }
    function cross(n) { const g = new TH.Group(), mat = new TH.MeshBasicMaterial({ color: 0xff3b3b, toneMapped: false }); [1, -1].forEach(s => { const b = new TH.Mesh(new TH.BoxGeometry(u * .6, .03, u * .09), mat); b.rotation.y = s * Math.PI / 4; g.add(b); }); const [x, z] = xz(n); g.position.set(x, Y + .05, z); marks.add(g); return g; }
    (function pulse() { if (stopped) return; const k = .5 + .5 * Math.sin(performance.now() / 260); let any = false; marks.children.forEach(m => { if (m.userData.pulse) { any = true; if (m.geometry.type === 'CylinderGeometry') m.scale.set(.85 + k * .3, 1, .85 + k * .3); m.material.opacity = .35 + k * .5; } }); Object.values(pcs).forEach(p => { if (p.userData.bob) { any = true; p.position.y = Y + .05 + .2 * k; } }); if (any && T3.kick) T3.kick(60); requestAnimationFrame(pulse); })();

    /* ---------- moves ---------- */
    function moveTo(g, n, kind, done) {
      const x0 = g.position.x, y0 = g.position.y, z0 = g.position.z, [x1, z1] = xz(n), d = Math.hypot(x1 - x0, z1 - z0);
      const hop = kind === 'hop', dur = hop ? 560 : 240 + d * 55;
      anim(dur, k => { const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; g.position.y = (hop ? Y + Math.sin(k * Math.PI) * 1.2 : Y + Math.sin(k * Math.PI) * .25) + (y0 - Y) * (1 - e); },
        () => { g.position.y = Y; SFX.tok(1, 1); land(g); if (done) done(); });
    }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .06; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function capture(g, done) {   // the taken piece hops off the board and shrinks away
      const x0 = g.position.x, z0 = g.position.z, x1 = x0 + (x0 > 0 ? 1 : -1) * 1.2, z1 = z0 - .4;
      anim(520, k => { g.position.x = x0 + (x1 - x0) * k; g.position.z = z0 + (z1 - z0) * k; g.position.y = Y + Math.sin(k * Math.PI) * 1.3; g.scale.setScalar(Math.max(.01, 1 - k * k)); g.rotation.z = k * 1.2; }, () => { board.remove(g); if (done) done(); });
    }
    function shake(g, done) { const r0 = g.rotation.z; anim(700, k => { g.rotation.z = r0 + Math.sin(k * Math.PI * 7) * .14 * (1 - k); }, () => { g.rotation.z = r0; if (done) done(); }); }

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
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let k = 0; k < 2; k++) { if (ni >= nodes.length) return clearInterval(typeT); const [n, s] = nodes[ni]; n.textContent = s.slice(0, ++ci); const ch = s[ci - 1]; if (ch && !/[\s、。！？!?,.：:（）()「」—–・]/.test(ch) && (said++ % 3 === 0)) SFX.blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 24);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([n, s]) => { n.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
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
      step = Math.max(0, Math.min(STEPS.length - 1, n)); played = false; busy = false;
      timers.forEach(clearTimeout); timers = [];
      const st = STEPS[step]; clearMarks(); $('.cnt').innerHTML = '';
      const cnt = setBoard(st);
      later(() => {
        (st.blue || []).forEach(q => spot(q, 0x1f6fe8, .42, false, .3));
        (st.gold || []).forEach(q => spot(q, 0xffb020, .45, true, .3));
        (st.glow || []).forEach(q => { const p = pcs[q]; if (p) p.userData.bob = true; spot(q, p ? 0xffc928 : 0xe0501e, .5, true); });
        if (st.sel) { spot(st.sel, 0x2fd17a, .6, true); const sp = pcs[st.sel]; anim(240, k => { sp.position.y = Y + .2 * io(k); }); }
        if (st.act) st.act.to.forEach(q => { if (pcs[q]) spot(q, 0xd8321c, .55, true); else ring(q); });
      }, 420 + cnt * 14);
      say(L.s[step].say); buttons();
    }
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return null;
      const i = Math.round(p.x / u + 4), j = Math.round(p.z / u + 4.5);
      if (i < 0 || i > 8 || j < 0 || j > 9) return null;
      return FILES[i] + (9 - j);
    }
    function finish(extra) { busy = false; if (L.s[step].done) say(L.s[step].done); if (extra) extra(); buttons(); }
    function onClick(e) {
      if (busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const st = STEPS[step], q = cellOf(e); if (!q || !st.act || played) return;
      if (!st.act.to.includes(q)) { if (q !== st.sel) say(L.nope); return; }
      busy = true; played = true; clearMarks();
      const g = pcs[st.sel], victim = pcs[q], stepNow = step;
      delete pcs[st.sel]; pcs[q] = g;
      const after = () => {
        if (step !== stepNow) return;
        if (st.act.mate) {
          const king = Object.entries(pcs).find(([, p]) => p.userData.type === 'K' && p.userData.black);
          if (king) spot(king[0], 0xff3030, .6, true);
          shake(king[1], () => { SFX.chime(); finish(() => { $('.cnt').innerHTML = `<span class="tag">${L.mate}</span>`; }); });
          return;
        }
        later(() => finish(), 250);
      };
      if (victim) { moveTo(g, q, st.act.kind, () => {}); later(() => capture(victim, after), 180); return; }
      moveTo(g, q, st.act.kind, after);
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
    // test hook: screen point of a board point, the current step and its expected move
    window.AtlasRules.xiangqi._dbg = { at: n => { const [x, z] = xz(n); return T3.project(x, z, Y); }, step: () => step, act: () => STEPS[step].act || null, last: () => !!STEPS[step].last, busy: () => busy };
    return {
      stop() { stopped = true; clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); },
      panel: el,
      _debug: { sq: n => { const [x, z] = xz(n); return [x, z, Y]; }, step: () => step, go },
    };
  }

  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.xiangqi = { start };
})();
