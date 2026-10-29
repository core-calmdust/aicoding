/* ソリティア — hands-on rules tutorial (solitaire/rules.js)
   One RuleTour per game type, switched by tabs on top of the dialog (common spec: rule variants → tabs).
   New game type: add RULES[<id>] (intro facts + pages) and its texts to RT[lang][<id>]. Each page builds a small
   table with mk() — the real rules engine judges the moves, the page's check() decides when the task is done. */
(function () {
'use strict';
const S = window.SOL, A = window.SolApp, $ = s => document.querySelector(s);
const C = s => { const r = 'A23456789TJQK'.indexOf(s[0]) + 1, su = 'SHDC'.indexOf(s[1]); return su * 13 + r - 1 + (s[2] === '+' ? 52 : 0); };
const G = S.GAP + 1, R2 = S.ROW2;
function mk(v, o, piles) {   // piles: [{ k, x, y, fan, c:['AS', …], d }]
  const L = piles.map((p, i) => ({ k: p.k, x: p.x, y: p.y, fan: p.fan || (p.k === 'tab' ? 'v' : 'n'), n: i, stack: p.stack, z: p.z, discard: p.discard }));
  return { v, o: Object.assign(S.defaults(v), o || {}), L, p: piles.map(p => ({ c: (p.c || []).map(C), d: p.d || 0 })), pass: 0, runs: 0, sc: 0, mv: 0, no: 0 };
}
/* ---------- texts ---------- */
const RT = {
ja: {
  klondike: { origin: '北アメリカ', players: '1人', time: '5〜15分',
    hist: '名前はカナダ・ユーコンの「クロンダイク・ゴールドラッシュ」（1896年〜）にちなむと言われます。1990年のWindows 3.0に「ソリティア」として入り、世界一有名なひとり遊びになりました。',
    win: '52枚すべてを、マークごとにA→2→…→Kの順で4つの組札（右上）へ積み上げれば勝ちです。',
    cult: 'イギリスでは「ペイシェンス（忍耐）」と呼ばれる、ひとりでじっくり楽しむトランプ遊びの代表です。',
    p: [
      { t: '組札はAから', b: '右上の4つの組札には、同じマークをA→2→3…の順に積みます。最初に置けるのはAだけです。', task: 'A♠を組札へドラッグ（またはダブルクリック）しましょう', ok: 'A♠が組札に乗りました！' },
      { t: '場札は色ちがいで1つ小さく', b: '下の7列では、赤と黒を交互にして、数字が1つ小さいカードを重ねます（黒の8には赤の7）。', task: '赤の7を、黒の8に重ねましょう', ok: '色ちがいで1つ小さい数。これが基本です！' },
      { t: '裏のカードをめくる', b: '列のいちばん上のカードを動かすと、下にあった裏向きのカードが表になります。全部表にするのが勝負のカギです。', task: 'J♦をQ♠に重ねて、裏のカードを表にしましょう', ok: '裏のカードが表になりました！' },
      { t: '空いた列にはK', b: '列が空になったら、そこにはK（または Kから始まる並び）だけを置けます。', task: 'K♦を空いている列へ動かしましょう', ok: '空いた列にKが入りました！' },
      { t: '山札をめくる', b: '左上の山札をクリックすると1枚めくれて、捨て札から場札や組札へ出せます。山札がなくなったら、捨て札を裏返してもう一度使えます。', task: '山札をめくって、出てきた4♥を5♠に重ねましょう', ok: '山札のカードも使えます！' },
    ] },
  spider: { origin: 'イギリス・アメリカ', players: '1人', time: '10〜30分',
    hist: 'トランプ2組を使うペイシェンスの古典です。Windows（Me以降）に標準で入り、クロンダイクと並ぶ人気になりました。',
    win: '同じマークのK→Q→…→Aの13枚を列の中でそろえると、その13枚は場から消えます。8組そろえれば勝ちです。',
    cult: 'マークの数（1・2・4）で難しさが大きく変わり、初心者から上級者まで楽しめます。',
    p: [
      { t: '1つ小さい数を重ねる', b: '列には、数字が1つ小さいカードならマークに関係なく重ねられます（9には8）。', task: 'どちらかの8を、9♠に重ねましょう', ok: 'マークがちがっても重ねられます！' },
      { t: '同じマークはまとめて動く', b: '同じマークで続いている並び（9♠8♠7♠など）は、まとめて動かせます。', task: '9♠8♠7♠をまとめて10♠に重ねましょう', ok: 'まとめて動かせました！' },
      { t: 'K〜Aがそろうと消える', b: '同じマークのKからAまで13枚がそろうと、その列から外れて完成になります。', task: 'A♠を2♠に重ねて、K〜Aを完成させましょう', ok: '1組完成！ これを8組そろえます。' },
      { t: '山札から配る', b: '動かせなくなったら右上の山札をクリック。全部の列に1枚ずつ配られます。空いている列があると配れません。', task: '山札をクリックして配りましょう', ok: '全部の列に1枚ずつ配られました！' },
    ] },
  freecell: { origin: 'アメリカ', players: '1人', time: '5〜15分',
    hist: '1978年にポール・アルフィルが大学のコンピューター（PLATO）向けに作り、のちにWindowsに入って有名になりました。',
    win: '52枚すべてを、マークごとにA→Kの順で右上の4つの組札へ積み上げれば勝ちです。',
    cult: 'Windows版の1〜32000番の配りのうち、解けないのは11982番ただ1つだけとして知られています。',
    p: [
      { t: 'フリーセルに1枚', b: '左上のフリーセル（空きマス）には、どのカードでも1枚ずつ置いておけます。', task: 'K♠をフリーセルに置いて、3♦を出しましょう', ok: 'フリーセルを使えました！' },
      { t: '組札はAから', b: '右上の組札には、同じマークをA→2→3…の順に積みます。', task: 'A♦を組札へ動かしましょう', ok: 'A♦が組札に乗りました！' },
      { t: '色ちがいで1つ小さく', b: '列には、赤と黒を交互にして、数字が1つ小さいカードを重ねます。', task: '赤の8を、黒の9に重ねましょう', ok: 'その調子です！' },
      { t: '何枚かまとめて動かす', b: '空きマスがあれば並びをまとめて動かせます。動かせる枚数は（空いたフリーセル＋1）× 2^(空いた列)。', task: '9♥8♠をまとめて10♠に重ねましょう', ok: '2枚まとめて動かせました！' },
    ] },
},
en: {
  klondike: { origin: 'North America', players: '1', time: '5–15 min',
    hist: 'The name is said to come from the Klondike Gold Rush in Canada’s Yukon (from 1896). It shipped as “Solitaire” with Windows 3.0 in 1990 and became the world’s best-known card game for one.',
    win: 'Build all 52 cards onto the four foundations (top right), each suit from Ace up to King.',
    cult: 'In Britain these games are called “patience” — card games you enjoy quietly on your own.',
    p: [
      { t: 'Foundations start with Aces', b: 'The four foundations (top right) take one suit each, from Ace up: A, 2, 3… Only an Ace can start one.', task: 'Drag (or double-click) the A♠ to a foundation', ok: 'The A♠ is on a foundation!' },
      { t: 'Build down in alternate colors', b: 'In the seven columns, put a card one lower and of the other color (a red 7 on a black 8).', task: 'Put the red 7 on the black 8', ok: 'One lower, other color — that is the key rule!' },
      { t: 'Turn over hidden cards', b: 'Move the top card of a column and the face-down card under it turns up. Uncovering them all is how you win.', task: 'Move the J♦ onto the Q♠ to turn up the hidden card', ok: 'The hidden card is face up!' },
      { t: 'Kings go to empty columns', b: 'An empty column can only take a King (or a run that starts with a King).', task: 'Move the K♦ to the empty column', ok: 'A King filled the empty column!' },
      { t: 'Turn the stock', b: 'Click the stock (top left) to turn a card onto the waste, then play it. When the stock runs out, the waste turns over to be used again.', task: 'Turn the stock, then put the 4♥ on the 5♠', ok: 'Stock cards can be played too!' },
    ] },
  spider: { origin: 'Britain / USA', players: '1', time: '10–30 min',
    hist: 'A classic patience played with two decks. It came with Windows from Windows Me on and became as popular as Klondike.',
    win: 'Gather King down to Ace of one suit (13 cards) in a column and they leave the table. Clear 8 such runs to win.',
    cult: 'The number of suits (1, 2 or 4) changes the difficulty a lot, so it suits beginners and experts alike.',
    p: [
      { t: 'Build down one lower', b: 'On a column you may put any card one rank lower, whatever its suit (an 8 on a 9).', task: 'Put either 8 on the 9♠', ok: 'Suits do not matter for building!' },
      { t: 'Same-suit runs move together', b: 'A run in one suit (like 9♠ 8♠ 7♠) can be moved as a group.', task: 'Move 9♠ 8♠ 7♠ together onto the 10♠', ok: 'Moved as one!' },
      { t: 'King to Ace clears', b: 'When a column holds King down to Ace in one suit, those 13 cards are completed and removed.', task: 'Put the A♠ on the 2♠ to complete King to Ace', ok: 'One run done! Complete eight of them.' },
      { t: 'Deal from the stock', b: 'Stuck? Click the stock (top right) to deal one card onto every column. You cannot deal while a column is empty.', task: 'Click the stock to deal', ok: 'Every column got a new card!' },
    ] },
  freecell: { origin: 'USA', players: '1', time: '5–15 min',
    hist: 'Paul Alfille wrote FreeCell in 1978 for the PLATO computer system; it later became famous through Windows.',
    win: 'Build all 52 cards onto the four foundations (top right), each suit from Ace up to King.',
    cult: 'Of the Windows deals numbered 1 to 32,000, only one — deal 11982 — is known to be unsolvable.',
    p: [
      { t: 'One card per free cell', b: 'Each free cell (top left) can hold any single card for later.', task: 'Put the K♠ in a free cell to free the 3♦', ok: 'You used a free cell!' },
      { t: 'Foundations start with Aces', b: 'The foundations (top right) take one suit each, from Ace up.', task: 'Move the A♦ to a foundation', ok: 'The A♦ is on a foundation!' },
      { t: 'Build down in alternate colors', b: 'In the columns, put a card one lower and of the other color.', task: 'Put the red 8 on the black 9', ok: 'Well done!' },
      { t: 'Moving several cards', b: 'Free spaces let you move a run at once: (free cells + 1) × 2^(empty columns) cards.', task: 'Move 9♥ 8♠ together onto the 10♠', ok: 'Two cards moved at once!' },
    ] },
},
zh: {
  klondike: { origin: '北美', players: '1人', time: '5〜15分钟',
    hist: '据说名字来自加拿大育空的克朗代克淘金热（1896年起）。1990年作为“纸牌”收录于Windows 3.0，成为世界上最有名的单人纸牌游戏。',
    win: '把52张牌按花色从A到K依次收到右上的4个基础堆即可获胜。',
    cult: '在英国这类游戏叫“Patience（耐心）”，是一个人静静享受的纸牌游戏。',
    p: [
      { t: '基础堆从A开始', b: '右上的4个基础堆按同花色A→2→3…叠放，第一张只能放A。', task: '把A♠拖到（或双击）基础堆', ok: 'A♠进入基础堆了！' },
      { t: '红黑相间、小1点叠放', b: '下面7列要红黑交替，叠上小1点的牌（黑8上放红7）。', task: '把红7叠到黑8上', ok: '红黑交替、小1点，这是基本规则！' },
      { t: '翻开背面的牌', b: '移走一列最上面的牌，下面的背面牌就会翻开。全部翻开是取胜的关键。', task: '把J♦叠到Q♠上，翻开背面的牌', ok: '背面的牌翻开了！' },
      { t: '空列只能放K', b: '列空出来后，只能放K（或以K开头的一串）。', task: '把K♦移到空列', ok: 'K放进空列了！' },
      { t: '翻开牌堆', b: '点击左上的牌堆翻1张，可以从废牌堆打出。牌堆用完后，废牌堆可翻回再用。', task: '翻开牌堆，把4♥叠到5♠上', ok: '牌堆的牌也能用！' },
    ] },
  spider: { origin: '英国・美国', players: '1人', time: '10〜30分钟',
    hist: '用两副牌的经典单人纸牌。自Windows Me起成为标准游戏，人气与克朗代克并列。',
    win: '在一列中凑齐同花色K→A的13张，这13张就会消去。凑齐8组即获胜。',
    cult: '花色数（1・2・4）大大改变难度，新手和高手都能享受。',
    p: [
      { t: '叠放小1点的牌', b: '只要小1点，不论花色都可以叠放（9上放8）。', task: '把任意一张8叠到9♠上', ok: '花色不同也能叠！' },
      { t: '同花色可整体移动', b: '同花色连续的一串（如9♠8♠7♠）可以一起移动。', task: '把9♠8♠7♠一起移到10♠上', ok: '整体移动成功！' },
      { t: 'K到A凑齐就消去', b: '同花色K到A的13张凑齐后，会从该列移走完成。', task: '把A♠叠到2♠上，完成K到A', ok: '完成1组！共需8组。' },
      { t: '从牌堆发牌', b: '无法移动时点击右上的牌堆，每列各发1张。有空列时不能发牌。', task: '点击牌堆发牌', ok: '每列都发到1张牌了！' },
    ] },
  freecell: { origin: '美国', players: '1人', time: '5〜15分钟',
    hist: '1978年保罗·阿尔菲尔为PLATO计算机系统编写，后来随Windows闻名。',
    win: '把52张牌按花色从A到K依次收到右上的4个基础堆即可获胜。',
    cult: 'Windows版1〜32000号牌局中，已知只有11982号无解。',
    p: [
      { t: '空当可放1张', b: '左上的空当可以暂放任意1张牌。', task: '把K♠放进空当，露出3♦', ok: '用上空当了！' },
      { t: '基础堆从A开始', b: '右上的基础堆按同花色从A开始叠放。', task: '把A♦移到基础堆', ok: 'A♦进入基础堆了！' },
      { t: '红黑相间、小1点', b: '列中要红黑交替，叠上小1点的牌。', task: '把红8叠到黑9上', ok: '很好！' },
      { t: '多张一起移动', b: '有空位就能整串移动，张数为（空当数＋1）×2^(空列数)。', task: '把9♥8♠一起移到10♠上', ok: '两张一起移动了！' },
    ] },
},
ko: {
  klondike: { origin: '북아메리카', players: '1명', time: '5~15분',
    hist: '이름은 캐나다 유콘의 클론다이크 골드러시(1896년~)에서 왔다고 합니다. 1990년 Windows 3.0에 「솔리테어」로 들어가 세계에서 가장 유명한 1인 카드 게임이 되었습니다.',
    win: '52장 모두를 무늬별로 A→K 순서대로 오른쪽 위 4개의 조합 더미에 쌓으면 승리입니다.',
    cult: '영국에서는 「페이션스(인내)」라고 불리는, 혼자 차분히 즐기는 카드 놀이의 대표입니다.',
    p: [
      { t: '조합 더미는 A부터', b: '오른쪽 위 4개의 조합 더미에는 같은 무늬를 A→2→3… 순으로 쌓습니다. 처음엔 A만 놓을 수 있습니다.', task: 'A♠를 조합 더미로 드래그(또는 더블클릭)하세요', ok: 'A♠가 조합 더미에 올라갔습니다!' },
      { t: '색을 번갈아 1 작은 수', b: '아래 7열에는 빨강과 검정을 번갈아 1 작은 카드를 겹칩니다(검은 8에 빨간 7).', task: '빨간 7을 검은 8에 겹치세요', ok: '색은 번갈아, 숫자는 1 작게. 이것이 기본입니다!' },
      { t: '뒷면 카드 뒤집기', b: '열의 맨 위 카드를 옮기면 아래의 뒷면 카드가 앞면이 됩니다. 모두 뒤집는 것이 승부의 열쇠입니다.', task: 'J♦를 Q♠에 겹쳐 뒷면 카드를 뒤집으세요', ok: '뒷면 카드가 앞면이 되었습니다!' },
      { t: '빈 열에는 K', b: '빈 열에는 K(또는 K로 시작하는 줄)만 놓을 수 있습니다.', task: 'K♦를 빈 열로 옮기세요', ok: '빈 열에 K가 들어갔습니다!' },
      { t: '더미 넘기기', b: '왼쪽 위 더미를 클릭하면 1장이 넘겨지고, 버림 더미에서 내놓을 수 있습니다. 더미가 다 떨어지면 버림 더미를 뒤집어 다시 씁니다.', task: '더미를 넘기고, 나온 4♥를 5♠에 겹치세요', ok: '더미의 카드도 쓸 수 있습니다!' },
    ] },
  spider: { origin: '영국・미국', players: '1명', time: '10~30분',
    hist: '카드 2벌로 하는 페이션스의 고전입니다. Windows Me부터 기본으로 들어가 클론다이크와 나란히 인기를 얻었습니다.',
    win: '같은 무늬 K→A 13장을 한 열에 맞추면 그 13장이 사라집니다. 8벌을 맞추면 승리입니다.',
    cult: '무늬 수(1・2・4)에 따라 난이도가 크게 바뀌어 초보자부터 고수까지 즐길 수 있습니다.',
    p: [
      { t: '1 작은 수를 겹치기', b: '숫자가 1 작으면 무늬에 상관없이 겹칠 수 있습니다(9에 8).', task: '아무 8이나 9♠에 겹치세요', ok: '무늬가 달라도 겹칠 수 있습니다!' },
      { t: '같은 무늬는 한꺼번에', b: '같은 무늬로 이어진 줄(9♠8♠7♠ 등)은 한꺼번에 옮길 수 있습니다.', task: '9♠8♠7♠를 한꺼번에 10♠에 겹치세요', ok: '한꺼번에 옮겼습니다!' },
      { t: 'K~A가 모이면 사라짐', b: '같은 무늬 K부터 A까지 13장이 모이면 그 열에서 빠져 완성됩니다.', task: 'A♠를 2♠에 겹쳐 K~A를 완성하세요', ok: '1벌 완성! 8벌을 모읍니다.' },
      { t: '더미에서 배분', b: '막히면 오른쪽 위 더미를 클릭. 모든 열에 1장씩 배분됩니다. 빈 열이 있으면 배분할 수 없습니다.', task: '더미를 클릭해 배분하세요', ok: '모든 열에 1장씩 배분되었습니다!' },
    ] },
  freecell: { origin: '미국', players: '1명', time: '5~15분',
    hist: '1978년 폴 알피유가 PLATO 컴퓨터 시스템용으로 만들었고, 이후 Windows로 유명해졌습니다.',
    win: '52장 모두를 무늬별로 A→K 순서대로 오른쪽 위 4개의 조합 더미에 쌓으면 승리입니다.',
    cult: 'Windows판 1~32000번 배분 중 풀 수 없는 것은 11982번 하나뿐인 것으로 알려져 있습니다.',
    p: [
      { t: '프리셀에 1장', b: '왼쪽 위 프리셀(빈칸)에는 아무 카드나 1장씩 놓아 둘 수 있습니다.', task: 'K♠를 프리셀에 놓아 3♦를 꺼내세요', ok: '프리셀을 썼습니다!' },
      { t: '조합 더미는 A부터', b: '오른쪽 위 조합 더미에는 같은 무늬를 A부터 쌓습니다.', task: 'A♦를 조합 더미로 옮기세요', ok: 'A♦가 조합 더미에 올라갔습니다!' },
      { t: '색을 번갈아 1 작게', b: '열에는 빨강과 검정을 번갈아 1 작은 카드를 겹칩니다.', task: '빨간 8을 검은 9에 겹치세요', ok: '좋아요!' },
      { t: '여러 장 한꺼번에', b: '빈칸이 있으면 줄을 한꺼번에 옮길 수 있습니다. 장수는 (빈 프리셀＋1)×2^(빈 열).', task: '9♥8♠를 한꺼번에 10♠에 겹치세요', ok: '2장을 한꺼번에 옮겼습니다!' },
    ] },
},
es: {
  klondike: { origin: 'Norteamérica', players: '1', time: '5–15 min',
    hist: 'Se dice que el nombre viene de la fiebre del oro del Klondike, en el Yukón canadiense (desde 1896). Llegó como «Solitario» con Windows 3.0 en 1990 y se volvió el juego de cartas individual más famoso.',
    win: 'Sube las 52 cartas a las cuatro bases (arriba a la derecha), cada palo del As al Rey.',
    cult: 'En Gran Bretaña se llaman «patience» (paciencia): juegos de cartas para disfrutar a solas y con calma.',
    p: [
      { t: 'Las bases empiezan con el As', b: 'Las cuatro bases (arriba a la derecha) se llenan por palo: A, 2, 3… Solo un As puede empezarlas.', task: 'Arrastra (o doble clic) el A♠ a una base', ok: '¡El A♠ está en una base!' },
      { t: 'Baja alternando colores', b: 'En las siete columnas pon una carta un número menor y de otro color (un 7 rojo sobre un 8 negro).', task: 'Pon el 7 rojo sobre el 8 negro', ok: 'Uno menos y otro color: ¡la regla clave!' },
      { t: 'Destapa las cartas ocultas', b: 'Al mover la carta de arriba, la que estaba boca abajo se gira. Destaparlas todas es la clave.', task: 'Mueve la J♦ sobre la Q♠ para destapar la carta', ok: '¡La carta oculta está boca arriba!' },
      { t: 'Reyes a las columnas vacías', b: 'Una columna vacía solo admite un Rey (o una escalera que empiece por Rey).', task: 'Mueve el K♦ a la columna vacía', ok: '¡Un Rey ocupó el hueco!' },
      { t: 'Gira el mazo', b: 'Toca el mazo (arriba a la izquierda) para girar una carta y jugarla. Al acabarse, el descarte se vuelve a usar.', task: 'Gira el mazo y pon el 4♥ sobre el 5♠', ok: '¡También se juegan las del mazo!' },
    ] },
  spider: { origin: 'Reino Unido / EE. UU.', players: '1', time: '10–30 min',
    hist: 'Un clásico de paciencia con dos barajas. Viene con Windows desde Windows Me y es tan popular como Klondike.',
    win: 'Reúne del Rey al As de un palo (13 cartas) en una columna y se retiran. Completa 8 para ganar.',
    cult: 'El número de palos (1, 2 o 4) cambia mucho la dificultad: sirve para principiantes y expertos.',
    p: [
      { t: 'Un número menor', b: 'En una columna puedes poner cualquier carta un número menor, sea del palo que sea (un 8 sobre un 9).', task: 'Pon cualquiera de los 8 sobre el 9♠', ok: '¡El palo no importa para apilar!' },
      { t: 'Escaleras del mismo palo', b: 'Una escalera de un solo palo (como 9♠ 8♠ 7♠) se mueve entera.', task: 'Mueve 9♠ 8♠ 7♠ juntos sobre el 10♠', ok: '¡Movidas de una vez!' },
      { t: 'Del Rey al As se retira', b: 'Cuando una columna tiene del Rey al As de un palo, esas 13 cartas se completan y salen.', task: 'Pon el A♠ sobre el 2♠ para completar', ok: '¡Una completa! Faltan siete.' },
      { t: 'Reparte del mazo', b: '¿Atascado? Toca el mazo (arriba a la derecha) para dar una carta a cada columna. No se puede con columnas vacías.', task: 'Toca el mazo para repartir', ok: '¡Cada columna recibió una carta!' },
    ] },
  freecell: { origin: 'EE. UU.', players: '1', time: '5–15 min',
    hist: 'Paul Alfille creó FreeCell en 1978 para el sistema PLATO; luego se hizo famoso gracias a Windows.',
    win: 'Sube las 52 cartas a las cuatro bases (arriba a la derecha), cada palo del As al Rey.',
    cult: 'De los repartos 1 a 32 000 de Windows, solo uno —el 11982— se sabe que no tiene solución.',
    p: [
      { t: 'Una carta por celda', b: 'Cada celda libre (arriba a la izquierda) guarda una carta cualquiera.', task: 'Pon el K♠ en una celda para liberar el 3♦', ok: '¡Usaste una celda libre!' },
      { t: 'Las bases empiezan con el As', b: 'Las bases (arriba a la derecha) se llenan por palo desde el As.', task: 'Mueve el A♦ a una base', ok: '¡El A♦ está en una base!' },
      { t: 'Baja alternando colores', b: 'En las columnas pon una carta un número menor y de otro color.', task: 'Pon el 8 rojo sobre el 9 negro', ok: '¡Muy bien!' },
      { t: 'Mover varias cartas', b: 'Los huecos libres permiten mover escaleras: (celdas libres + 1) × 2^(columnas vacías) cartas.', task: 'Mueve 9♥ 8♠ juntos sobre el 10♠', ok: '¡Dos cartas de una vez!' },
    ] },
},
fr: {
  klondike: { origin: 'Amérique du Nord', players: '1', time: '5–15 min',
    hist: 'Son nom viendrait de la ruée vers l’or du Klondike, au Yukon canadien (dès 1896). Livré sous le nom « Solitaire » avec Windows 3.0 en 1990, il est devenu le jeu de cartes solo le plus connu.',
    win: 'Montez les 52 cartes sur les quatre fondations (en haut à droite), chaque couleur de l’As au Roi.',
    cult: 'Les Britanniques appellent ces jeux « patience » : des jeux de cartes à savourer seul, tranquillement.',
    p: [
      { t: 'Les fondations commencent par l’As', b: 'Chaque fondation (en haut à droite) reçoit une couleur : A, 2, 3… Seul un As peut la commencer.', task: 'Glissez (ou double-cliquez) l’A♠ vers une fondation', ok: 'L’A♠ est sur une fondation !' },
      { t: 'Descendre en alternant les couleurs', b: 'Dans les sept colonnes, posez une carte d’une valeur en dessous et de l’autre couleur (un 7 rouge sur un 8 noir).', task: 'Posez le 7 rouge sur le 8 noir', ok: 'Une de moins, autre couleur : la règle clé !' },
      { t: 'Retourner les cartes cachées', b: 'Déplacez la carte du dessus : celle face cachée se retourne. Toutes les découvrir, c’est gagner.', task: 'Posez le V♦ sur la D♠ pour retourner la carte cachée', ok: 'La carte cachée est retournée !' },
      { t: 'Les Rois dans les colonnes vides', b: 'Une colonne vide n’accepte qu’un Roi (ou une suite commençant par un Roi).', task: 'Déplacez le R♦ dans la colonne vide', ok: 'Un Roi occupe la colonne vide !' },
      { t: 'Retourner le talon', b: 'Touchez le talon (en haut à gauche) pour retourner une carte et la jouer. Une fois vide, la défausse se réutilise.', task: 'Retournez le talon, puis posez le 4♥ sur le 5♠', ok: 'Les cartes du talon se jouent aussi !' },
    ] },
  spider: { origin: 'Royaume-Uni / États-Unis', players: '1', time: '10–30 min',
    hist: 'Une patience classique à deux jeux. Fournie avec Windows depuis Windows Me, elle est aussi populaire que Klondike.',
    win: 'Réunissez du Roi à l’As d’une même couleur (13 cartes) dans une colonne : elles quittent la table. Huit suites et c’est gagné.',
    cult: 'Le nombre de couleurs (1, 2 ou 4) change beaucoup la difficulté : idéal du débutant à l’expert.',
    p: [
      { t: 'Une valeur en dessous', b: 'Sur une colonne, posez n’importe quelle carte d’une valeur inférieure, quelle que soit sa couleur (un 8 sur un 9).', task: 'Posez l’un des 8 sur le 9♠', ok: 'La couleur ne compte pas pour empiler !' },
      { t: 'Les suites d’une couleur bougent ensemble', b: 'Une suite d’une seule couleur (9♠ 8♠ 7♠) se déplace d’un bloc.', task: 'Déplacez 9♠ 8♠ 7♠ ensemble sur le 10♠', ok: 'Déplacées d’un coup !' },
      { t: 'Du Roi à l’As, c’est retiré', b: 'Quand une colonne réunit Roi→As d’une couleur, ces 13 cartes sont complétées et retirées.', task: 'Posez l’A♠ sur le 2♠ pour compléter', ok: 'Une suite faite ! Il en faut huit.' },
      { t: 'Distribuer depuis le talon', b: 'Bloqué ? Touchez le talon (en haut à droite) : une carte va sur chaque colonne. Impossible s’il y a une colonne vide.', task: 'Touchez le talon pour distribuer', ok: 'Chaque colonne a reçu une carte !' },
    ] },
  freecell: { origin: 'États-Unis', players: '1', time: '5–15 min',
    hist: 'Paul Alfille a programmé FreeCell en 1978 sur le système PLATO ; Windows l’a ensuite rendu célèbre.',
    win: 'Montez les 52 cartes sur les quatre fondations (en haut à droite), chaque couleur de l’As au Roi.',
    cult: 'Parmi les donnes Windows 1 à 32 000, une seule — la 11982 — est connue comme insoluble.',
    p: [
      { t: 'Une carte par case libre', b: 'Chaque case libre (en haut à gauche) garde n’importe quelle carte.', task: 'Posez le R♠ dans une case pour libérer le 3♦', ok: 'Vous avez utilisé une case libre !' },
      { t: 'Les fondations commencent par l’As', b: 'Les fondations (en haut à droite) se montent par couleur depuis l’As.', task: 'Déplacez l’A♦ vers une fondation', ok: 'L’A♦ est sur une fondation !' },
      { t: 'Descendre en alternant les couleurs', b: 'Dans les colonnes, posez une carte d’une valeur inférieure et de l’autre couleur.', task: 'Posez le 8 rouge sur le 9 noir', ok: 'Bravo !' },
      { t: 'Déplacer plusieurs cartes', b: 'Les espaces libres permettent de bouger une suite : (cases libres + 1) × 2^(colonnes vides) cartes.', task: 'Déplacez 9♥ 8♠ ensemble sur le 10♠', ok: 'Deux cartes d’un coup !' },
    ] },
},
pt: {
  klondike: { origin: 'América do Norte', players: '1', time: '5–15 min',
    hist: 'Diz-se que o nome vem da corrida do ouro do Klondike, no Yukon canadense (a partir de 1896). Veio como “Paciência” no Windows 3.0 em 1990 e virou o jogo de cartas solo mais famoso.',
    win: 'Leve as 52 cartas às quatro fundações (no alto à direita), cada naipe do Ás ao Rei.',
    cult: 'Na Grã-Bretanha esses jogos se chamam “patience” (paciência): cartas para curtir sozinho, com calma.',
    p: [
      { t: 'Fundações começam pelo Ás', b: 'Cada fundação (no alto à direita) recebe um naipe: A, 2, 3… Só um Ás pode começar.', task: 'Arraste (ou clique duas vezes) o A♠ para uma fundação', ok: 'O A♠ está numa fundação!' },
      { t: 'Desça alternando cores', b: 'Nas sete colunas, ponha uma carta um número menor e de outra cor (um 7 vermelho sobre um 8 preto).', task: 'Ponha o 7 vermelho sobre o 8 preto', ok: 'Um a menos, outra cor: a regra-chave!' },
      { t: 'Vire as cartas escondidas', b: 'Mova a carta de cima e a que estava virada para baixo se revela. Revelar todas é a chave.', task: 'Mova o J♦ para a Q♠ e revele a carta', ok: 'A carta escondida foi revelada!' },
      { t: 'Reis nas colunas vazias', b: 'Uma coluna vazia só aceita um Rei (ou uma sequência que comece com Rei).', task: 'Mova o K♦ para a coluna vazia', ok: 'Um Rei ocupou a coluna vazia!' },
      { t: 'Vire o monte', b: 'Toque no monte (no alto à esquerda) para virar uma carta e jogá-la. Quando acabar, o descarte é reaproveitado.', task: 'Vire o monte e ponha o 4♥ sobre o 5♠', ok: 'As cartas do monte também valem!' },
    ] },
  spider: { origin: 'Reino Unido / EUA', players: '1', time: '10–30 min',
    hist: 'Uma paciência clássica com dois baralhos. Vem no Windows desde o Windows Me e é tão popular quanto o Klondike.',
    win: 'Junte do Rei ao Ás de um naipe (13 cartas) numa coluna e elas saem da mesa. Complete 8 para vencer.',
    cult: 'O número de naipes (1, 2 ou 4) muda muito a dificuldade: serve para iniciantes e experientes.',
    p: [
      { t: 'Um número menor', b: 'Numa coluna você pode pôr qualquer carta um número menor, de qualquer naipe (um 8 sobre um 9).', task: 'Ponha qualquer um dos 8 sobre o 9♠', ok: 'O naipe não importa para empilhar!' },
      { t: 'Sequências do mesmo naipe', b: 'Uma sequência de um naipe só (9♠ 8♠ 7♠) se move inteira.', task: 'Mova 9♠ 8♠ 7♠ juntos para o 10♠', ok: 'Movidas de uma vez!' },
      { t: 'Do Rei ao Ás sai', b: 'Quando a coluna tem do Rei ao Ás de um naipe, as 13 cartas se completam e saem.', task: 'Ponha o A♠ sobre o 2♠ para completar', ok: 'Uma completa! Faltam sete.' },
      { t: 'Distribua do monte', b: 'Travou? Toque no monte (no alto à direita) para dar uma carta a cada coluna. Não dá com coluna vazia.', task: 'Toque no monte para distribuir', ok: 'Cada coluna recebeu uma carta!' },
    ] },
  freecell: { origin: 'EUA', players: '1', time: '5–15 min',
    hist: 'Paul Alfille criou o FreeCell em 1978 para o sistema PLATO; depois ficou famoso com o Windows.',
    win: 'Leve as 52 cartas às quatro fundações (no alto à direita), cada naipe do Ás ao Rei.',
    cult: 'Das mãos 1 a 32.000 do Windows, só uma — a 11982 — é conhecida por não ter solução.',
    p: [
      { t: 'Uma carta por célula', b: 'Cada célula livre (no alto à esquerda) guarda uma carta qualquer.', task: 'Ponha o K♠ numa célula para liberar o 3♦', ok: 'Você usou uma célula livre!' },
      { t: 'Fundações começam pelo Ás', b: 'As fundações (no alto à direita) sobem por naipe a partir do Ás.', task: 'Mova o A♦ para uma fundação', ok: 'O A♦ está numa fundação!' },
      { t: 'Desça alternando cores', b: 'Nas colunas, ponha uma carta um número menor e de outra cor.', task: 'Ponha o 8 vermelho sobre o 9 preto', ok: 'Muito bem!' },
      { t: 'Mover várias cartas', b: 'Espaços livres permitem mover sequências: (células livres + 1) × 2^(colunas vazias) cartas.', task: 'Mova 9♥ 8♠ juntos para o 10♠', ok: 'Duas cartas de uma vez!' },
    ] },
},
de: {
  klondike: { origin: 'Nordamerika', players: '1', time: '5–15 Min.',
    hist: 'Der Name soll vom Klondike-Goldrausch im kanadischen Yukon (ab 1896) stammen. Als „Solitaire“ kam es 1990 mit Windows 3.0 und wurde zum bekanntesten Kartenspiel für eine Person.',
    win: 'Lege alle 52 Karten auf die vier Ablagen (oben rechts), jede Farbe vom Ass bis zum König.',
    cult: 'In Großbritannien heißen diese Spiele „Patience“ – Kartenspiele, die man in Ruhe allein genießt.',
    p: [
      { t: 'Ablagen beginnen mit dem Ass', b: 'Jede der vier Ablagen (oben rechts) nimmt eine Farbe: A, 2, 3 … Nur ein Ass kann beginnen.', task: 'Ziehe (oder doppelklicke) das A♠ auf eine Ablage', ok: 'Das A♠ liegt auf einer Ablage!' },
      { t: 'Absteigend mit Farbwechsel', b: 'In den sieben Spalten legst du eine Karte, die um eins niedriger ist und die andere Farbe hat (rote 7 auf schwarze 8).', task: 'Lege die rote 7 auf die schwarze 8', ok: 'Eins niedriger, andere Farbe – die Grundregel!' },
      { t: 'Verdeckte Karten aufdecken', b: 'Ziehst du die oberste Karte weg, wird die verdeckte darunter umgedreht. Alle aufzudecken ist der Schlüssel.', task: 'Lege den B♦ auf die D♠ und decke die Karte auf', ok: 'Die verdeckte Karte ist offen!' },
      { t: 'Könige in leere Spalten', b: 'Eine leere Spalte nimmt nur einen König (oder eine Folge, die mit einem König beginnt).', task: 'Ziehe den K♦ in die leere Spalte', ok: 'Ein König füllt die Lücke!' },
      { t: 'Den Stapel aufdecken', b: 'Tippe auf den Stapel (oben links), um eine Karte aufzudecken und zu spielen. Ist er leer, wird der Abwurf wieder verwendet.', task: 'Decke den Stapel auf und lege die 4♥ auf die 5♠', ok: 'Auch Stapelkarten sind spielbar!' },
    ] },
  spider: { origin: 'Großbritannien / USA', players: '1', time: '10–30 Min.',
    hist: 'Eine klassische Patience mit zwei Decks. Seit Windows Me ist sie dabei und so beliebt wie Klondike.',
    win: 'Sammle König bis Ass einer Farbe (13 Karten) in einer Spalte – sie verlassen den Tisch. Acht solche Folgen gewinnen.',
    cult: 'Die Zahl der Farben (1, 2 oder 4) ändert die Schwierigkeit stark – für Anfänger wie Profis.',
    p: [
      { t: 'Eins niedriger anlegen', b: 'Auf eine Spalte darfst du jede Karte legen, die um eins niedriger ist – egal welche Farbe (eine 8 auf eine 9).', task: 'Lege eine der 8en auf die 9♠', ok: 'Die Farbe ist beim Anlegen egal!' },
      { t: 'Gleichfarbige Folgen ziehen zusammen', b: 'Eine Folge in einer Farbe (9♠ 8♠ 7♠) lässt sich als Ganzes ziehen.', task: 'Ziehe 9♠ 8♠ 7♠ zusammen auf die 10♠', ok: 'Auf einmal gezogen!' },
      { t: 'König bis Ass wird abgelegt', b: 'Liegt in einer Spalte König bis Ass einer Farbe, sind die 13 Karten fertig und verschwinden.', task: 'Lege das A♠ auf die 2♠ und vervollständige', ok: 'Eine Folge fertig! Acht werden gebraucht.' },
      { t: 'Vom Stapel geben', b: 'Festgefahren? Tippe auf den Stapel (oben rechts): Jede Spalte bekommt eine Karte. Mit leerer Spalte geht das nicht.', task: 'Tippe zum Geben auf den Stapel', ok: 'Jede Spalte hat eine Karte bekommen!' },
    ] },
  freecell: { origin: 'USA', players: '1', time: '5–15 Min.',
    hist: 'Paul Alfille schrieb FreeCell 1978 für das PLATO-System; bekannt wurde es später durch Windows.',
    win: 'Lege alle 52 Karten auf die vier Ablagen (oben rechts), jede Farbe vom Ass bis zum König.',
    cult: 'Von den Windows-Spielen 1 bis 32.000 gilt nur eines – Nr. 11982 – als unlösbar.',
    p: [
      { t: 'Eine Karte je Zelle', b: 'Jede freie Zelle (oben links) hält eine beliebige Karte.', task: 'Lege den K♠ in eine Zelle, um die 3♦ freizulegen', ok: 'Du hast eine freie Zelle genutzt!' },
      { t: 'Ablagen beginnen mit dem Ass', b: 'Die Ablagen (oben rechts) werden je Farbe ab dem Ass aufgebaut.', task: 'Ziehe das A♦ auf eine Ablage', ok: 'Das A♦ liegt auf einer Ablage!' },
      { t: 'Absteigend mit Farbwechsel', b: 'In den Spalten legst du eine Karte eins niedriger und in der anderen Farbe an.', task: 'Lege die rote 8 auf die schwarze 9', ok: 'Gut gemacht!' },
      { t: 'Mehrere Karten ziehen', b: 'Freie Plätze erlauben ganze Folgen: (freie Zellen + 1) × 2^(leere Spalten) Karten.', task: 'Ziehe 9♥ 8♠ zusammen auf die 10♠', ok: 'Zwei Karten auf einmal!' },
    ] },
},
hi: {
  klondike: { origin: 'उत्तरी अमेरिका', players: '1', time: '5–15 मिनट',
    hist: 'कहा जाता है कि नाम कनाडा के युकॉन की क्लोंडाइक गोल्ड रश (1896 से) से आया। 1990 में Windows 3.0 के साथ “सॉलिटेयर” के रूप में आया और दुनिया का सबसे प्रसिद्ध अकेले खेलने वाला ताश का खेल बना।',
    win: 'सभी 52 पत्ते चार नींव ढेरों (ऊपर दाएँ) पर रखें, हर रंग इक्के से बादशाह तक।',
    cult: 'ब्रिटेन में इन्हें “पेशेंस” (धैर्य) कहते हैं — अकेले आराम से खेले जाने वाले ताश के खेल।',
    p: [
      { t: 'नींव इक्के से शुरू', b: 'ऊपर दाएँ के चार नींव ढेर एक-एक रंग लेते हैं: A, 2, 3… शुरुआत केवल इक्का कर सकता है।', task: 'A♠ को नींव पर खींचें (या डबल-क्लिक करें)', ok: 'A♠ नींव पर पहुँच गया!' },
      { t: 'बारी-बारी रंग, एक कम', b: 'नीचे के सात कॉलम में दूसरे रंग का एक कम अंक वाला पत्ता रखें (काले 8 पर लाल 7)।', task: 'लाल 7 को काले 8 पर रखें', ok: 'एक कम, दूसरा रंग — यही मूल नियम!' },
      { t: 'उल्टे पत्ते खोलें', b: 'कॉलम का ऊपरी पत्ता हटाने पर नीचे का उल्टा पत्ता सीधा हो जाता है। सबको खोलना ही जीत की कुंजी है।', task: 'J♦ को Q♠ पर रखकर उल्टा पत्ता खोलें', ok: 'उल्टा पत्ता खुल गया!' },
      { t: 'खाली कॉलम में बादशाह', b: 'खाली कॉलम में केवल बादशाह (या बादशाह से शुरू कतार) रख सकते हैं।', task: 'K♦ को खाली कॉलम में ले जाएँ', ok: 'बादशाह ने खाली जगह भर दी!' },
      { t: 'गड्डी पलटें', b: 'ऊपर बाएँ गड्डी पर क्लिक करें, एक पत्ता पलटेगा जिसे खेल सकते हैं। गड्डी खत्म होने पर फेंके पत्ते दोबारा काम आते हैं।', task: 'गड्डी पलटें और 4♥ को 5♠ पर रखें', ok: 'गड्डी के पत्ते भी खेले जा सकते हैं!' },
    ] },
  spider: { origin: 'ब्रिटेन / अमेरिका', players: '1', time: '10–30 मिनट',
    hist: 'दो गड्डियों वाला क्लासिक पेशेंस। Windows Me से यह Windows में शामिल है और क्लोंडाइक जितना लोकप्रिय है।',
    win: 'एक कॉलम में एक ही रंग के बादशाह से इक्का (13 पत्ते) जुटाएँ, वे हट जाते हैं। 8 पूरे करें और जीतें।',
    cult: 'रंगों की संख्या (1, 2 या 4) से कठिनाई बहुत बदलती है — नए और अनुभवी दोनों के लिए।',
    p: [
      { t: 'एक कम अंक रखें', b: 'कॉलम पर कोई भी एक कम अंक वाला पत्ता रख सकते हैं, रंग कोई भी हो (9 पर 8)।', task: 'किसी भी 8 को 9♠ पर रखें', ok: 'जमाने में रंग मायने नहीं रखता!' },
      { t: 'एक रंग की कतार साथ चलती है', b: 'एक ही रंग की कतार (9♠ 8♠ 7♠) एक साथ चलाई जा सकती है।', task: '9♠ 8♠ 7♠ को एक साथ 10♠ पर ले जाएँ', ok: 'एक साथ चल गए!' },
      { t: 'बादशाह से इक्का हटता है', b: 'जब कॉलम में एक रंग का बादशाह से इक्का तक हो जाए, वे 13 पत्ते पूरे होकर हट जाते हैं।', task: 'A♠ को 2♠ पर रखकर पूरा करें', ok: 'एक पूरा! कुल आठ चाहिए।' },
      { t: 'गड्डी से बाँटें', b: 'अटक गए? ऊपर दाएँ गड्डी पर क्लिक करें, हर कॉलम को एक पत्ता मिलेगा। खाली कॉलम हो तो नहीं बाँट सकते।', task: 'बाँटने के लिए गड्डी पर क्लिक करें', ok: 'हर कॉलम को एक पत्ता मिला!' },
    ] },
  freecell: { origin: 'अमेरिका', players: '1', time: '5–15 मिनट',
    hist: 'पॉल अल्फ़ील ने 1978 में PLATO कंप्यूटर प्रणाली के लिए फ्रीसेल बनाया; बाद में Windows से यह प्रसिद्ध हुआ।',
    win: 'सभी 52 पत्ते चार नींव ढेरों (ऊपर दाएँ) पर रखें, हर रंग इक्के से बादशाह तक।',
    cult: 'Windows के 1 से 32,000 बाँटों में केवल एक — 11982 — को हल न होने वाला माना जाता है।',
    p: [
      { t: 'हर खाने में एक पत्ता', b: 'ऊपर बाएँ हर खाली खाना कोई भी एक पत्ता रख सकता है।', task: 'K♠ को खाने में रखकर 3♦ खोलें', ok: 'आपने खाली खाना इस्तेमाल किया!' },
      { t: 'नींव इक्के से शुरू', b: 'ऊपर दाएँ की नींव एक-एक रंग में इक्के से बनती है।', task: 'A♦ को नींव पर ले जाएँ', ok: 'A♦ नींव पर पहुँच गया!' },
      { t: 'बारी-बारी रंग, एक कम', b: 'कॉलम में दूसरे रंग का एक कम अंक वाला पत्ता रखें।', task: 'लाल 8 को काले 9 पर रखें', ok: 'बहुत बढ़िया!' },
      { t: 'कई पत्ते साथ', b: 'खाली जगहों से पूरी कतार चल सकती है: (खाली खाने + 1) × 2^(खाली कॉलम) पत्ते।', task: '9♥ 8♠ को एक साथ 10♠ पर ले जाएँ', ok: 'दो पत्ते एक साथ!' },
    ] },
},
ar: {
  klondike: { origin: 'أمريكا الشمالية', players: '1', time: '5–15 دقيقة',
    hist: 'يقال إن الاسم مأخوذ من حمّى ذهب كلونديك في يوكون الكندية (منذ 1896). صدرت باسم «سوليتير» مع ويندوز 3.0 عام 1990 فأصبحت أشهر لعبة ورق فردية.',
    win: 'انقل الأوراق الـ52 كلها إلى الأساسات الأربعة (أعلى اليمين)، كل نوع من الآص إلى الملك.',
    cult: 'تُسمّى هذه الألعاب في بريطانيا «الصبر»: ألعاب ورق يستمتع بها المرء وحده بهدوء.',
    p: [
      { t: 'الأساسات تبدأ بالآص', b: 'كل أساس من الأربعة (أعلى اليمين) يأخذ نوعاً واحداً: آص، 2، 3… ولا يبدأه إلا الآص.', task: 'اسحب الآص ♠ (أو انقر مرتين) إلى أساس', ok: 'الآص ♠ على أساس!' },
      { t: 'تنازلياً بألوان متناوبة', b: 'في الأعمدة السبعة ضع ورقة أقل بواحد ومن اللون الآخر (7 حمراء على 8 سوداء).', task: 'ضع الـ7 الحمراء على الـ8 السوداء', ok: 'أقل بواحد ولون مختلف: القاعدة الأساسية!' },
      { t: 'اكشف الأوراق المقلوبة', b: 'حرّك الورقة العليا فتنقلب الورقة المخفية تحتها. كشفها كلها مفتاح الفوز.', task: 'ضع الولد ♦ على البنت ♠ لتكشف الورقة', ok: 'انكشفت الورقة المخفية!' },
      { t: 'الملوك للأعمدة الفارغة', b: 'العمود الفارغ لا يقبل إلا ملكاً (أو متتالية تبدأ بملك).', task: 'انقل الملك ♦ إلى العمود الفارغ', ok: 'ملأ الملك العمود الفارغ!' },
      { t: 'اقلب الكومة', b: 'المس الكومة (أعلى اليسار) لتقلب ورقة وتلعبها. عند نفادها تُستعمل أوراق المهملات من جديد.', task: 'اقلب الكومة ثم ضع 4♥ على 5♠', ok: 'أوراق الكومة تُلعب أيضاً!' },
    ] },
  spider: { origin: 'بريطانيا / أمريكا', players: '1', time: '10–30 دقيقة',
    hist: 'لعبة صبر كلاسيكية بمجموعتين. تأتي مع ويندوز منذ ويندوز Me وشعبيتها كشعبية كلونديك.',
    win: 'اجمع من الملك إلى الآص من نوع واحد (13 ورقة) في عمود فتغادر الطاولة. أكمل 8 لتفوز.',
    cult: 'عدد الأنواع (1 أو 2 أو 4) يغيّر الصعوبة كثيراً، فهي تناسب المبتدئ والخبير.',
    p: [
      { t: 'ورقة أقل بواحد', b: 'يمكنك وضع أي ورقة أقل بواحد على العمود مهما كان نوعها (8 على 9).', task: 'ضع أي ورقة 8 على 9♠', ok: 'النوع لا يهم في الرصّ!' },
      { t: 'متتاليات النوع الواحد تتحرك معاً', b: 'المتتالية من نوع واحد (9♠ 8♠ 7♠) تُنقل دفعة واحدة.', task: 'انقل 9♠ 8♠ 7♠ معاً إلى 10♠', ok: 'نُقلت دفعة واحدة!' },
      { t: 'من الملك إلى الآص تُزال', b: 'إذا اكتمل في العمود من الملك إلى الآص بنوع واحد، تكتمل الأوراق الـ13 وتُزال.', task: 'ضع الآص ♠ على 2♠ لتكمل', ok: 'اكتملت واحدة! المطلوب ثمانٍ.' },
      { t: 'التوزيع من الكومة', b: 'علقت؟ المس الكومة (أعلى اليمين) لتنال كل الأعمدة ورقة. لا يجوز مع عمود فارغ.', task: 'المس الكومة للتوزيع', ok: 'نالت كل الأعمدة ورقة!' },
    ] },
  freecell: { origin: 'الولايات المتحدة', players: '1', time: '5–15 دقيقة',
    hist: 'كتب بول ألفيل لعبة فري سيل عام 1978 لنظام PLATO الحاسوبي، ثم اشتهرت مع ويندوز.',
    win: 'انقل الأوراق الـ52 كلها إلى الأساسات الأربعة (أعلى اليمين)، كل نوع من الآص إلى الملك.',
    cult: 'من توزيعات ويندوز 1 إلى 32000، يُعرف أن توزيعاً واحداً فقط — رقم 11982 — بلا حل.',
    p: [
      { t: 'ورقة لكل خانة', b: 'كل خانة حرة (أعلى اليسار) تحفظ أي ورقة واحدة.', task: 'ضع الملك ♠ في خانة لتحرر 3♦', ok: 'استخدمت خانة حرة!' },
      { t: 'الأساسات تبدأ بالآص', b: 'الأساسات (أعلى اليمين) تُبنى لكل نوع بدءاً من الآص.', task: 'انقل الآص ♦ إلى أساس', ok: 'الآص ♦ على أساس!' },
      { t: 'تنازلياً بألوان متناوبة', b: 'في الأعمدة ضع ورقة أقل بواحد ومن اللون الآخر.', task: 'ضع الـ8 الحمراء على الـ9 السوداء', ok: 'أحسنت!' },
      { t: 'نقل عدة أوراق', b: 'الأماكن الفارغة تتيح نقل متتالية: (الخانات الحرة + 1) × 2^(الأعمدة الفارغة) ورقة.', task: 'انقل 9♥ 8♠ معاً إلى 10♠', ok: 'ورقتان دفعة واحدة!' },
    ] },
},
};
/* texts for Golf, TriPeaks, Pyramid */
RT.ja.golf = {"origin": "イギリス", "players": "1人", "time": "3〜5分", "hist": "19世紀末から遊ばれているペイシェンスで、ホールを回るように1ゲームずつ点数を数えることから「ゴルフ」と呼ばれます。", "win": "7列のカードを全部捨て札に出せば勝ちです。山札は1周しか使えません。", "cult": "9ゲームを1ラウンドとして、残ったカードの枚数をスコアにする遊び方もあります（少ないほど良い）。", "p": [{"t": "1つ上か下を出す", "b": "列のいちばん下（手前）のカードを、捨て札より1つ大きいか小さい数なら捨て札に出せます。マークは関係ありません。", "task": "捨て札の7♥に、8か6を出しましょう", "ok": "1つちがいなら出せます！"}, {"t": "続けて出す", "b": "出したカードが新しい捨て札になります。6→7→8のように、上がったり下がったりしながら続けられます。", "task": "カードを2枚続けて出しましょう", "ok": "連続で出せました！"}, {"t": "Kの上と山札", "b": "標準ルールでは捨て札がKのとき、その上には何も出せません。出せないときは山札をめくって新しい捨て札にします。", "task": "山札をめくって、出せるカードを出しましょう", "ok": "山札で流れを変えられます！"}]};
RT.ja.tripeaks = {"origin": "アメリカ", "players": "1人", "time": "3〜5分", "hist": "1989年にロバート・ホーガンが考案したと言われる新しめのソリティアで、ゴルフの仲間です。3つの山の形が名前の由来です。", "win": "3つの山の28枚を全部捨て札に出せば勝ちです。", "cult": "標準ではKとAがつながるので、Q→K→A→2…と途切れずに続けられます。長い連続が高得点のコツ。", "p": [{"t": "1つ上か下を出す", "b": "上に何も重なっていない表のカードを、捨て札と1つちがいの数なら出せます。", "task": "捨て札の6♥に、5か7を出しましょう", "ok": "その調子です！"}, {"t": "上のカードがめくれる", "b": "重なっていた2枚がどちらもなくなると、その上のカードが表になります。", "task": "カードを続けて出して、裏のカードを表にしましょう", "ok": "裏のカードが表になりました！"}, {"t": "山札をめくる", "b": "出せるカードがなければ山札をクリック。めくったカードが新しい捨て札になり、連続はリセットされます。", "task": "山札をめくって、出せるカードを出しましょう", "ok": "山札をうまく使えました！"}]};
RT.ja.pyramid = {"origin": "イギリス・アメリカ", "players": "1人", "time": "5〜10分", "hist": "古くから遊ばれるペイシェンスで、28枚を三角形に並べる形がエジプトのピラミッドに似ていることからこう呼ばれます。", "win": "ピラミッドの28枚を全部取り除けば勝ちです。", "cult": "J=11、Q=12、K=13として数えます。6と7、5と8のように合計13の組を探すのがコツです。", "p": [{"t": "合計13で取り除く", "b": "上に何も重なっていない2枚の合計が13なら、重ねて一緒に取り除けます（J=11、Q=12）。", "task": "8と5を重ねて取り除きましょう", "ok": "合計13で取り除けました！"}, {"t": "Kは1枚で", "b": "Kは13なので、1枚だけで取り除けます。右の捨て場にドラッグするか、ダブルクリック。", "task": "K♦を取り除きましょう", "ok": "Kは1枚で取れます！"}, {"t": "山札と組む", "b": "山札をめくったカード（捨て札のいちばん上）もピラミッドのカードと組にできます。", "task": "7♠と捨て札の6♦を組にして取り除きましょう", "ok": "山札のカードも使えます！"}]};
RT.en.golf = {"origin": "Britain", "players": "1", "time": "3–5 min", "hist": "A patience played since the late 19th century. It is called Golf because each deal is scored like a hole.", "win": "Play every card from the seven columns onto the waste. You only get one pass through the stock.", "cult": "Some play nine deals as a round and score the cards left over each time — the lower, the better.", "p": [{"t": "One up or one down", "b": "The front card of a column can go on the waste if it is one rank higher or lower. Suits do not matter.", "task": "Play an 8 or a 6 on the 7♥", "ok": "One rank apart is all it takes!"}, {"t": "Keep the run going", "b": "The card you play becomes the new waste card, so you can go up and down: 6, 7, 8…", "task": "Play two cards in a row", "ok": "A run of two!"}, {"t": "Kings and the stock", "b": "Under the standard rules nothing goes on a King. When you are stuck, turn the stock for a new waste card.", "task": "Turn the stock, then play a card", "ok": "The stock gets you going again!"}]};
RT.en.tripeaks = {"origin": "USA", "players": "1", "time": "3–5 min", "hist": "A newer solitaire, said to have been invented by Robert Hogan in 1989, and a relative of Golf. The three peaks give it its name.", "win": "Play all 28 cards of the three peaks onto the waste.", "cult": "King and Ace normally connect, so a run can go Q, K, A, 2… Long runs are the key to a high score.", "p": [{"t": "One up or one down", "b": "A face-up card with nothing on it can go on the waste if it is one rank apart.", "task": "Play a 5 or a 7 on the 6♥", "ok": "Well done!"}, {"t": "Uncover the cards above", "b": "When both cards overlapping a card are gone, it turns face up.", "task": "Play cards in a row to turn up the hidden card", "ok": "The hidden card is face up!"}, {"t": "Turn the stock", "b": "If nothing can be played, click the stock. Its card becomes the new waste card and your run starts over.", "task": "Turn the stock, then play a card", "ok": "Nicely done!"}]};
RT.en.pyramid = {"origin": "Britain / USA", "players": "1", "time": "5–10 min", "hist": "An old patience. The 28 cards dealt in a triangle look like an Egyptian pyramid.", "win": "Remove all 28 cards of the pyramid.", "cult": "J counts 11, Q 12 and K 13. Look for pairs like 6 and 7 or 5 and 8.", "p": [{"t": "Pairs that make 13", "b": "Two uncovered cards that add up to 13 can be removed together — drop one on the other (J = 11, Q = 12).", "task": "Put the 8 and the 5 together", "ok": "13 — removed!"}, {"t": "A King goes alone", "b": "A King counts 13, so it goes on its own: drag it to the discard pile or double-click it.", "task": "Remove the K♦", "ok": "Kings go by themselves!"}, {"t": "Pair with the stock", "b": "The top card of the waste (turned from the stock) can pair with a pyramid card too.", "task": "Pair the 7♠ with the 6♦ on the waste", "ok": "Stock cards count too!"}]};
RT.zh.golf = {"origin": "英国", "players": "1人", "time": "3〜5分钟", "hist": "19世纪末就有人玩的接龙。每局像打一洞那样计分，因此叫“高尔夫”。", "win": "把7列的牌全部打到废牌堆即胜。牌堆只能用一轮。", "cult": "也有以9局为一轮、按剩余张数计分的玩法（越少越好）。", "p": [{"t": "大1或小1", "b": "每列最前面的牌，只要比废牌堆顶大1或小1就能打出，与花色无关。", "task": "在7♥上打出8或6", "ok": "相差1就能出！"}, {"t": "连续出牌", "b": "打出的牌成为新的废牌堆顶，可以像6→7→8这样上下连续出。", "task": "连续打出两张牌", "ok": "连出成功！"}, {"t": "K与牌堆", "b": "标准规则下，废牌堆顶为K时不能再出牌。出不了时就翻开牌堆。", "task": "翻开牌堆，再打出一张牌", "ok": "牌堆可以扭转局面！"}]};
RT.zh.tripeaks = {"origin": "美国", "players": "1人", "time": "3〜5分钟", "hist": "据说由罗伯特·霍根于1989年发明，是高尔夫的同类。名字来自三座山峰的形状。", "win": "把三峰的28张牌全部打到废牌堆即胜。", "cult": "标准规则下K与A相连，可以Q→K→A→2…一路连下去。长连是高分的关键。", "p": [{"t": "大1或小1", "b": "没有被压住的正面牌，只要与废牌堆顶相差1就能打出。", "task": "在6♥上打出5或7", "ok": "很好！"}, {"t": "翻开上面的牌", "b": "压住某张牌的两张都没了，它就会翻开。", "task": "连续出牌，翻开背面的牌", "ok": "背面的牌翻开了！"}, {"t": "翻牌堆", "b": "没有可出的牌时点击牌堆。翻出的牌成为新的废牌堆顶，连击重置。", "task": "翻开牌堆，再打出一张牌", "ok": "用得好！"}]};
RT.zh.pyramid = {"origin": "英国・美国", "players": "1人", "time": "5〜10分钟", "hist": "历史悠久的接龙。28张牌排成三角形，像埃及金字塔。", "win": "移除金字塔的全部28张牌即胜。", "cult": "J=11、Q=12、K=13。寻找6和7、5和8这样合计13的组合。", "p": [{"t": "合计13即可移除", "b": "两张未被压住的牌合计13时，把一张放到另一张上即可一起移除（J=11、Q=12）。", "task": "把8和5放在一起", "ok": "合计13，移除！"}, {"t": "K单独移除", "b": "K等于13，可单独移除：拖到右边的弃牌处或双击。", "task": "移除K♦", "ok": "K可以单独移除！"}, {"t": "与牌堆配对", "b": "从牌堆翻出的废牌堆顶也能与金字塔的牌配对。", "task": "把7♠和废牌堆的6♦配对", "ok": "牌堆的牌也能用！"}]};
RT.ko.golf = {"origin": "영국", "players": "1명", "time": "3~5분", "hist": "19세기 말부터 즐겨 온 페이션스로, 한 판을 홀처럼 점수 매겨서 ‘골프’라고 부릅니다.", "win": "7열의 카드를 모두 버림 더미에 내면 승리. 덱은 한 바퀴만.", "cult": "9판을 한 라운드로 하고 남은 장수를 점수로 삼는 방법도 있습니다(적을수록 좋음).", "p": [{"t": "1 크거나 작게", "b": "열의 맨 앞 카드는 버림 더미보다 1 크거나 작으면 낼 수 있습니다. 무늬는 상관없습니다.", "task": "7♥ 위에 8이나 6을 내세요", "ok": "1 차이면 낼 수 있습니다!"}, {"t": "이어서 내기", "b": "낸 카드가 새 버림 카드가 되어 6→7→8처럼 오르내리며 이어 갈 수 있습니다.", "task": "카드를 두 장 연속으로 내세요", "ok": "연속으로 냈습니다!"}, {"t": "K와 덱", "b": "표준 규칙에서는 버림 카드가 K이면 아무것도 낼 수 없습니다. 막히면 덱을 넘기세요.", "task": "덱을 넘기고 카드를 내세요", "ok": "덱으로 흐름을 바꿀 수 있어요!"}]};
RT.ko.tripeaks = {"origin": "미국", "players": "1명", "time": "3~5분", "hist": "1989년 로버트 호건이 고안했다고 하는 비교적 새로운 솔리테어로, 골프의 친척입니다. 세 봉우리 모양에서 이름이 왔습니다.", "win": "세 봉우리의 28장을 모두 버림 더미에 내면 승리.", "cult": "보통 K와 A가 이어져 Q→K→A→2…로 계속 이을 수 있습니다. 긴 연속이 고득점의 비결.", "p": [{"t": "1 크거나 작게", "b": "위에 아무것도 겹치지 않은 앞면 카드는 버림 카드와 1 차이면 낼 수 있습니다.", "task": "6♥ 위에 5나 7을 내세요", "ok": "좋아요!"}, {"t": "위 카드가 뒤집힘", "b": "겹쳐 있던 두 장이 모두 없어지면 그 위 카드가 앞면이 됩니다.", "task": "연속으로 내서 뒷면 카드를 뒤집으세요", "ok": "뒷면 카드가 앞면이 됐습니다!"}, {"t": "덱 넘기기", "b": "낼 카드가 없으면 덱을 클릭. 넘긴 카드가 새 버림 카드가 되고 연속은 초기화됩니다.", "task": "덱을 넘기고 카드를 내세요", "ok": "잘했어요!"}]};
RT.ko.pyramid = {"origin": "영국・미국", "players": "1명", "time": "5~10분", "hist": "오래된 페이션스로, 28장을 삼각형으로 놓은 모양이 이집트 피라미드를 닮았습니다.", "win": "피라미드의 28장을 모두 제거하면 승리.", "cult": "J=11, Q=12, K=13. 6과 7, 5와 8처럼 합 13인 짝을 찾는 것이 요령.", "p": [{"t": "합 13으로 제거", "b": "위가 비어 있는 두 장의 합이 13이면 겹쳐서 함께 제거합니다(J=11, Q=12).", "task": "8과 5를 겹치세요", "ok": "합 13, 제거!"}, {"t": "K는 혼자", "b": "K는 13이라 혼자 제거됩니다. 오른쪽 버림 칸으로 끌거나 더블클릭.", "task": "K♦를 제거하세요", "ok": "K는 혼자 제거됩니다!"}, {"t": "덱과 짝짓기", "b": "덱에서 넘긴 버림 더미 맨 위 카드도 피라미드 카드와 짝지을 수 있습니다.", "task": "7♠과 버림 더미의 6♦를 짝지으세요", "ok": "덱 카드도 쓸 수 있어요!"}]};
RT.es.golf = {"origin": "Reino Unido", "players": "1", "time": "3–5 min", "hist": "Un solitario jugado desde finales del siglo XIX. Se llama Golf porque cada reparto se puntúa como un hoyo.", "win": "Juega todas las cartas de las siete columnas al descarte. Solo hay una pasada por el mazo.", "cult": "Hay quien juega nueve repartos por ronda y suma las cartas que quedan: cuantas menos, mejor.", "p": [{"t": "Una más o una menos", "b": "La carta delantera de una columna va al descarte si es un punto más alta o más baja. El palo no importa.", "task": "Juega un 8 o un 6 sobre el 7♥", "ok": "¡Basta con un punto de diferencia!"}, {"t": "Encadena", "b": "La carta jugada pasa a ser el nuevo descarte: puedes subir y bajar, 6, 7, 8…", "task": "Juega dos cartas seguidas", "ok": "¡Racha de dos!"}, {"t": "Reyes y mazo", "b": "Con las reglas estándar no se juega nada sobre un Rey. Si te atascas, voltea el mazo.", "task": "Voltea el mazo y juega una carta", "ok": "¡El mazo te saca del atasco!"}]};
RT.es.tripeaks = {"origin": "EE. UU.", "players": "1", "time": "3–5 min", "hist": "Un solitario moderno, atribuido a Robert Hogan (1989), pariente del Golf. Debe su nombre a sus tres picos.", "win": "Juega al descarte las 28 cartas de los tres picos.", "cult": "Normalmente Rey y As se enlazan, así que la racha puede seguir Q, K, A, 2… Las rachas largas dan muchos puntos.", "p": [{"t": "Una más o una menos", "b": "Una carta descubierta y libre va al descarte si se diferencia en un punto.", "task": "Juega un 5 o un 7 sobre el 6♥", "ok": "¡Muy bien!"}, {"t": "Descubre las de arriba", "b": "Cuando desaparecen las dos cartas que tapan otra, esta se pone boca arriba.", "task": "Juega cartas seguidas para descubrir la oculta", "ok": "¡La carta oculta está boca arriba!"}, {"t": "Voltea el mazo", "b": "Si no puedes jugar, pulsa el mazo. Su carta es el nuevo descarte y la racha vuelve a empezar.", "task": "Voltea el mazo y juega una carta", "ok": "¡Bien hecho!"}]};
RT.es.pyramid = {"origin": "Reino Unido / EE. UU.", "players": "1", "time": "5–10 min", "hist": "Un solitario antiguo: las 28 cartas en triángulo parecen una pirámide egipcia.", "win": "Quita las 28 cartas de la pirámide.", "cult": "J vale 11, Q 12 y K 13. Busca parejas como 6 y 7 o 5 y 8.", "p": [{"t": "Parejas que suman 13", "b": "Dos cartas libres que suman 13 se quitan juntas: suelta una sobre la otra (J = 11, Q = 12).", "task": "Junta el 8 y el 5", "ok": "¡13, fuera!"}, {"t": "El Rey va solo", "b": "El Rey vale 13 y sale solo: arrástralo al descarte de la derecha o haz doble clic.", "task": "Quita el K♦", "ok": "¡Los Reyes salen solos!"}, {"t": "Parejas con el mazo", "b": "La carta superior del descarte (sacada del mazo) también puede emparejarse.", "task": "Empareja el 7♠ con el 6♦ del descarte", "ok": "¡Las cartas del mazo también cuentan!"}]};
RT.fr.golf = {"origin": "Royaume-Uni", "players": "1", "time": "3–5 min", "hist": "Une patience jouée depuis la fin du XIXe siècle. On l’appelle Golf car chaque donne se compte comme un trou.", "win": "Posez toutes les cartes des sept colonnes sur la défausse. Un seul passage dans la pioche.", "cult": "Certains jouent neuf donnes par partie et comptent les cartes restantes : moins il y en a, mieux c’est.", "p": [{"t": "Un au-dessus ou au-dessous", "b": "La carte de devant d’une colonne va sur la défausse si elle est d’un rang au-dessus ou au-dessous. La couleur ne compte pas.", "task": "Posez un 8 ou un 6 sur le 7♥", "ok": "Un rang d’écart suffit !"}, {"t": "Enchaînez", "b": "La carte posée devient la nouvelle défausse : on peut monter et descendre, 6, 7, 8…", "task": "Posez deux cartes de suite", "ok": "Série de deux !"}, {"t": "Rois et pioche", "b": "En règle standard, rien sur un Roi. Si vous êtes bloqué, retournez la pioche.", "task": "Retournez la pioche, puis posez une carte", "ok": "La pioche relance la partie !"}]};
RT.fr.tripeaks = {"origin": "États-Unis", "players": "1", "time": "3–5 min", "hist": "Une patience récente, attribuée à Robert Hogan (1989), cousine du Golf. Elle doit son nom à ses trois pics.", "win": "Posez sur la défausse les 28 cartes des trois pics.", "cult": "Roi et As se suivent normalement : la série peut continuer D, R, A, 2… Les longues séries rapportent gros.", "p": [{"t": "Un au-dessus ou au-dessous", "b": "Une carte visible et libre va sur la défausse si elle a un rang d’écart.", "task": "Posez un 5 ou un 7 sur le 6♥", "ok": "Bravo !"}, {"t": "Découvrez celles du dessus", "b": "Quand les deux cartes qui en couvrent une autre sont parties, elle se retourne.", "task": "Enchaînez pour retourner la carte cachée", "ok": "La carte cachée est visible !"}, {"t": "Retournez la pioche", "b": "Rien à jouer ? Cliquez la pioche. Sa carte devient la défausse et la série repart de zéro.", "task": "Retournez la pioche, puis posez une carte", "ok": "Bien joué !"}]};
RT.fr.pyramid = {"origin": "Royaume-Uni / États-Unis", "players": "1", "time": "5–10 min", "hist": "Une patience ancienne : les 28 cartes en triangle évoquent une pyramide d’Égypte.", "win": "Retirez les 28 cartes de la pyramide.", "cult": "V vaut 11, D 12 et R 13. Cherchez des paires comme 6 et 7 ou 5 et 8.", "p": [{"t": "Des paires qui font 13", "b": "Deux cartes libres qui font 13 se retirent ensemble : posez l’une sur l’autre (V = 11, D = 12).", "task": "Réunissez le 8 et le 5", "ok": "13 — retirées !"}, {"t": "Le Roi part seul", "b": "Le Roi vaut 13 et part seul : glissez-le vers la défausse à droite ou double-cliquez.", "task": "Retirez le R♦", "ok": "Les Rois partent seuls !"}, {"t": "Avec la pioche", "b": "La carte du dessus de la défausse (tirée de la pioche) peut aussi former une paire.", "task": "Associez le 7♠ au 6♦ de la défausse", "ok": "Les cartes de la pioche comptent aussi !"}]};
RT.pt.golf = {"origin": "Reino Unido", "players": "1", "time": "3–5 min", "hist": "Uma paciência jogada desde o fim do século XIX. Chama-se Golfe porque cada mão é pontuada como um buraco.", "win": "Jogue todas as cartas das sete colunas no descarte. O monte só passa uma vez.", "cult": "Há quem jogue nove mãos por rodada e some as cartas que sobram — quanto menos, melhor.", "p": [{"t": "Um acima ou abaixo", "b": "A carta da frente de uma coluna vai ao descarte se for um valor acima ou abaixo. O naipe não importa.", "task": "Jogue um 8 ou um 6 sobre o 7♥", "ok": "Basta um de diferença!"}, {"t": "Continue a sequência", "b": "A carta jogada vira o novo descarte: dá para subir e descer, 6, 7, 8…", "task": "Jogue duas cartas seguidas", "ok": "Sequência de duas!"}, {"t": "Reis e monte", "b": "Nas regras padrão nada vai sobre o Rei. Se travar, vire o monte.", "task": "Vire o monte e jogue uma carta", "ok": "O monte destrava o jogo!"}]};
RT.pt.tripeaks = {"origin": "EUA", "players": "1", "time": "3–5 min", "hist": "Uma paciência moderna, atribuída a Robert Hogan (1989), parente do Golfe. O nome vem dos três picos.", "win": "Jogue no descarte as 28 cartas dos três picos.", "cult": "Normalmente Rei e Ás se ligam: a sequência pode seguir Q, K, A, 2… Sequências longas valem muitos pontos.", "p": [{"t": "Um acima ou abaixo", "b": "Uma carta aberta e livre vai ao descarte se tiver um de diferença.", "task": "Jogue um 5 ou um 7 sobre o 6♥", "ok": "Muito bem!"}, {"t": "Revele as de cima", "b": "Quando as duas cartas que cobrem outra somem, ela vira para cima.", "task": "Jogue cartas seguidas para revelar a carta escondida", "ok": "A carta escondida está aberta!"}, {"t": "Vire o monte", "b": "Sem jogada? Clique no monte. A carta vira o novo descarte e a sequência recomeça.", "task": "Vire o monte e jogue uma carta", "ok": "Boa!"}]};
RT.pt.pyramid = {"origin": "Reino Unido / EUA", "players": "1", "time": "5–10 min", "hist": "Uma paciência antiga: as 28 cartas em triângulo lembram uma pirâmide egípcia.", "win": "Remova as 28 cartas da pirâmide.", "cult": "J vale 11, Q 12 e K 13. Procure pares como 6 e 7 ou 5 e 8.", "p": [{"t": "Pares que somam 13", "b": "Duas cartas livres que somam 13 saem juntas: solte uma sobre a outra (J = 11, Q = 12).", "task": "Junte o 8 e o 5", "ok": "13 — removidas!"}, {"t": "O Rei sai sozinho", "b": "O Rei vale 13 e sai sozinho: arraste para o descarte à direita ou dê dois cliques.", "task": "Remova o K♦", "ok": "Reis saem sozinhos!"}, {"t": "Par com o monte", "b": "A carta de cima do descarte (virada do monte) também forma par com a pirâmide.", "task": "Forme par com o 7♠ e o 6♦ do descarte", "ok": "As cartas do monte também valem!"}]};
RT.de.golf = {"origin": "Großbritannien", "players": "1", "time": "3–5 Min.", "hist": "Eine Patience aus dem späten 19. Jahrhundert. Sie heißt Golf, weil jedes Spiel wie ein Loch gezählt wird.", "win": "Lege alle Karten der sieben Spalten auf den Ablagestapel. Der Talon geht nur einmal durch.", "cult": "Manche spielen neun Spiele als Runde und zählen die Restkarten – je weniger, desto besser.", "p": [{"t": "Eins höher oder tiefer", "b": "Die vorderste Karte einer Spalte darf auf den Ablagestapel, wenn sie eins höher oder tiefer ist. Die Farbe ist egal.", "task": "Lege eine 8 oder 6 auf die 7♥", "ok": "Eins Unterschied genügt!"}, {"t": "Weiter in Serie", "b": "Die gelegte Karte ist die neue Ablagekarte – rauf und runter: 6, 7, 8…", "task": "Lege zwei Karten hintereinander", "ok": "Eine Zweierserie!"}, {"t": "Könige und Talon", "b": "Nach Standardregeln darf nichts auf einen König. Steckst du fest, deck den Talon auf.", "task": "Deck den Talon auf und lege eine Karte", "ok": "Der Talon bringt dich weiter!"}]};
RT.de.tripeaks = {"origin": "USA", "players": "1", "time": "3–5 Min.", "hist": "Eine neuere Patience, angeblich 1989 von Robert Hogan erfunden, verwandt mit Golf. Benannt nach den drei Gipfeln.", "win": "Lege alle 28 Karten der drei Gipfel auf den Ablagestapel.", "cult": "Meist sind König und Ass verbunden, also geht es D, K, A, 2… weiter. Lange Serien bringen viele Punkte.", "p": [{"t": "Eins höher oder tiefer", "b": "Eine offene, freie Karte darf auf den Ablagestapel, wenn sie eins abweicht.", "task": "Lege eine 5 oder 7 auf die 6♥", "ok": "Gut gemacht!"}, {"t": "Obere Karten aufdecken", "b": "Sind beide Karten weg, die eine Karte überdecken, wird sie aufgedeckt.", "task": "Lege Karten in Serie, um die verdeckte aufzudecken", "ok": "Die verdeckte Karte liegt offen!"}, {"t": "Talon aufdecken", "b": "Nichts spielbar? Klicke den Talon. Seine Karte wird die neue Ablagekarte, die Serie beginnt neu.", "task": "Deck den Talon auf und lege eine Karte", "ok": "Prima!"}]};
RT.de.pyramid = {"origin": "Großbritannien / USA", "players": "1", "time": "5–10 Min.", "hist": "Eine alte Patience: Die 28 Karten im Dreieck erinnern an eine ägyptische Pyramide.", "win": "Entferne alle 28 Karten der Pyramide.", "cult": "B zählt 11, D 12, K 13. Suche Paare wie 6 und 7 oder 5 und 8.", "p": [{"t": "Paare mit Summe 13", "b": "Zwei freie Karten mit der Summe 13 werden zusammen entfernt – lege eine auf die andere (B = 11, D = 12).", "task": "Bring die 8 und die 5 zusammen", "ok": "13 – entfernt!"}, {"t": "Der König geht allein", "b": "Ein König zählt 13 und geht allein: zieh ihn auf den Abwurf rechts oder doppelklicke.", "task": "Entferne den K♦", "ok": "Könige gehen allein!"}, {"t": "Paar mit dem Talon", "b": "Die oberste Karte des Ablagestapels (vom Talon) bildet auch mit Pyramidenkarten Paare.", "task": "Paare die 7♠ mit der 6♦ des Ablagestapels", "ok": "Auch Talonkarten zählen!"}]};
RT.hi.golf = {"origin": "ब्रिटेन", "players": "1", "time": "3–5 मिनट", "hist": "19वीं सदी के अंत से खेला जाने वाला पेशेंस। हर बाँट को गोल्फ़ के होल की तरह गिनते हैं, इसलिए नाम गोल्फ़।", "win": "सातों कॉलम के सब पत्ते वेस्ट पर डाल दें। स्टॉक केवल एक बार।", "cult": "कुछ लोग 9 बाँट का एक राउंड खेलते हैं और बचे पत्तों को स्कोर मानते हैं — कम हो तो बेहतर।", "p": [{"t": "एक बड़ा या छोटा", "b": "कॉलम का सबसे आगे का पत्ता, वेस्ट से एक बड़ा या छोटा हो तो डाल सकते हैं। रंग मायने नहीं रखता।", "task": "7♥ पर 8 या 6 डालें", "ok": "एक का अंतर काफ़ी है!"}, {"t": "लड़ी जारी रखें", "b": "डाला गया पत्ता नया वेस्ट बनता है: 6, 7, 8… ऊपर-नीचे चलते रहें।", "task": "लगातार दो पत्ते डालें", "ok": "दो की लड़ी!"}, {"t": "बादशाह और स्टॉक", "b": "मानक नियम में बादशाह पर कुछ नहीं डलता। अटकें तो स्टॉक पलटें।", "task": "स्टॉक पलटें और एक पत्ता डालें", "ok": "स्टॉक से खेल आगे बढ़ा!"}]};
RT.hi.tripeaks = {"origin": "अमेरिका", "players": "1", "time": "3–5 मिनट", "hist": "एक नया सॉलिटेयर, कहा जाता है कि 1989 में रॉबर्ट होगन ने बनाया; गोल्फ़ का रिश्तेदार। नाम तीन चोटियों से।", "win": "तीनों चोटियों के 28 पत्ते वेस्ट पर डाल दें।", "cult": "आमतौर पर बादशाह-इक्का जुड़े होते हैं, तो लड़ी बेगम, बादशाह, इक्का, 2… चल सकती है। लंबी लड़ी से ज़्यादा अंक।", "p": [{"t": "एक बड़ा या छोटा", "b": "खुला और खाली पत्ता, एक के अंतर पर हो तो वेस्ट पर डाल सकते हैं।", "task": "6♥ पर 5 या 7 डालें", "ok": "बढ़िया!"}, {"t": "ऊपर के पत्ते खोलें", "b": "किसी पत्ते को ढकने वाले दोनों पत्ते हटते ही वह खुल जाता है।", "task": "लगातार पत्ते डालकर छिपा पत्ता खोलें", "ok": "छिपा पत्ता खुल गया!"}, {"t": "स्टॉक पलटें", "b": "कुछ न चले तो स्टॉक दबाएँ। उसका पत्ता नया वेस्ट बनता है और लड़ी फिर से शुरू।", "task": "स्टॉक पलटें और एक पत्ता डालें", "ok": "शाबाश!"}]};
RT.hi.pyramid = {"origin": "ब्रिटेन / अमेरिका", "players": "1", "time": "5–10 मिनट", "hist": "पुराना पेशेंस: त्रिकोण में रखे 28 पत्ते मिस्र के पिरामिड जैसे लगते हैं।", "win": "पिरामिड के सभी 28 पत्ते हटा दें।", "cult": "गुलाम 11, बेगम 12, बादशाह 13। 6-7 या 5-8 जैसे जोड़े खोजें।", "p": [{"t": "13 का जोड़ा", "b": "दो खुले पत्तों का जोड़ 13 हो तो एक को दूसरे पर रखकर दोनों हटाएँ (गुलाम 11, बेगम 12)।", "task": "8 और 5 को मिलाएँ", "ok": "13 — हट गए!"}, {"t": "बादशाह अकेला", "b": "बादशाह 13 है, अकेला हटता है: दाईं ओर फेंकने की जगह पर खींचें या डबल-क्लिक करें।", "task": "K♦ हटाएँ", "ok": "बादशाह अकेले हटते हैं!"}, {"t": "स्टॉक से जोड़ा", "b": "वेस्ट का ऊपरी पत्ता (स्टॉक से पलटा) भी पिरामिड के पत्ते से जोड़ा बना सकता है।", "task": "7♠ को वेस्ट के 6♦ से जोड़ें", "ok": "स्टॉक के पत्ते भी चलते हैं!"}]};
RT.ar.golf = {"origin": "بريطانيا", "players": "1", "time": "3–5 دقائق", "hist": "لعبة صبر تُلعب منذ أواخر القرن التاسع عشر، وسُمّيت الغولف لأن كل توزيعة تُحسب كحفرة.", "win": "العب كل أوراق الأعمدة السبعة على المهملات. للرصيد جولة واحدة فقط.", "cult": "يلعب البعض تسع توزيعات كجولة ويحسبون الأوراق المتبقية — الأقل أفضل.", "p": [{"t": "أعلى أو أدنى بواحد", "b": "الورقة الأمامية في العمود تُلعب على المهملات إن كانت أعلى أو أدنى بواحد. النوع لا يهم.", "task": "العب 8 أو 6 على 7♥", "ok": "فارق واحد يكفي!"}, {"t": "واصل السلسلة", "b": "الورقة الملعوبة تصبح ورقة المهملات الجديدة، فيمكنك الصعود والنزول: 6، 7، 8…", "task": "العب ورقتين متتاليتين", "ok": "سلسلة من ورقتين!"}, {"t": "الملك والرصيد", "b": "في القواعد القياسية لا يُلعب شيء على الملك. إن تعثرت فاقلب الرصيد.", "task": "اقلب الرصيد ثم العب ورقة", "ok": "الرصيد يعيدك إلى اللعب!"}]};
RT.ar.tripeaks = {"origin": "الولايات المتحدة", "players": "1", "time": "3–5 دقائق", "hist": "لعبة سوليتير حديثة يُقال إن روبرت هوغان ابتكرها عام 1989، وهي قريبة من الغولف. اسمها من القمم الثلاث.", "win": "العب أوراق القمم الثلاث الـ28 كلها على المهملات.", "cult": "عادةً يتصل الملك بالآس فتستمر السلسلة: ملكة، ملك، آس، 2… السلاسل الطويلة تعني نقاطًا أكثر.", "p": [{"t": "أعلى أو أدنى بواحد", "b": "الورقة المكشوفة الحرة تُلعب على المهملات إن اختلفت بواحد.", "task": "العب 5 أو 7 على 6♥", "ok": "أحسنت!"}, {"t": "اكشف الأوراق العليا", "b": "عندما تختفي الورقتان اللتان تغطيان ورقة، تنقلب مكشوفة.", "task": "العب أوراقًا متتالية لتكشف الورقة المخفية", "ok": "انكشفت الورقة المخفية!"}, {"t": "اقلب الرصيد", "b": "لا توجد حركة؟ انقر الرصيد. تصبح ورقته ورقة المهملات الجديدة وتبدأ السلسلة من جديد.", "task": "اقلب الرصيد ثم العب ورقة", "ok": "رائع!"}]};
RT.ar.pyramid = {"origin": "بريطانيا / أمريكا", "players": "1", "time": "5–10 دقائق", "hist": "لعبة صبر قديمة: الأوراق الـ28 المرتبة في مثلث تشبه هرمًا مصريًا.", "win": "أزل أوراق الهرم الـ28 كلها.", "cult": "الشاب 11 والملكة 12 والملك 13. ابحث عن أزواج مثل 6 و7 أو 5 و8.", "p": [{"t": "أزواج مجموعها 13", "b": "ورقتان حرتان مجموعهما 13 تُزالان معًا: ضع إحداهما على الأخرى (الشاب 11، الملكة 12).", "task": "اجمع الـ8 والـ5", "ok": "13 — أُزيلتا!"}, {"t": "الملك وحده", "b": "الملك يساوي 13 فيُزال وحده: اسحبه إلى كومة الإزالة يمينًا أو انقر نقرًا مزدوجًا.", "task": "أزل الملك ♦", "ok": "الملوك تُزال وحدها!"}, {"t": "زوج مع الرصيد", "b": "الورقة العليا في المهملات (المقلوبة من الرصيد) تشكّل زوجًا مع ورقة الهرم أيضًا.", "task": "زاوج 7♠ مع 6♦ في المهملات", "ok": "أوراق الرصيد تُحتسب أيضًا!"}]};
/* ---------- pages (layouts + checks) ---------- */
const top = (st, i) => S.top(st.p[i]);
const RULES = {
  klondike: { aspect: 1.25, pages: [
    () => mk('klondike', {}, [{ k: 'found', x: 0, y: 0 }, { k: 'found', x: G, y: 0, c: ['AH', '2H'] }, { k: 'tab', x: 0, y: R2, c: ['9C', 'AS'], d: 1 }, { k: 'tab', x: G, y: R2, c: ['4D'] }, { k: 'tab', x: 2 * G, y: R2, c: ['7C', '6S', 'QD'], d: 2 }]),
    () => mk('klondike', {}, [{ k: 'tab', x: 0, y: 0, c: ['8S'] }, { k: 'tab', x: G, y: 0, c: ['KC', '7H'], d: 1 }, { k: 'tab', x: 2 * G, y: 0, c: ['7C'] }]),
    () => mk('klondike', {}, [{ k: 'tab', x: 0, y: 0, c: ['2C', 'JD'], d: 1 }, { k: 'tab', x: G, y: 0, c: ['QS'] }, { k: 'tab', x: 2 * G, y: 0, c: ['5H', '9D'], d: 1 }]),
    () => mk('klondike', {}, [{ k: 'tab', x: 0, y: 0, c: ['5C', 'KD'], d: 1 }, { k: 'tab', x: G, y: 0 }, { k: 'tab', x: 2 * G, y: 0, c: ['9H'] }]),
    () => mk('klondike', {}, [{ k: 'stock', x: 0, y: 0, c: ['9S', '4H'], d: 2 }, { k: 'waste', x: G, y: 0 }, { k: 'tab', x: 0, y: R2, c: ['5S'] }, { k: 'tab', x: G, y: R2, c: ['JC'] }, { k: 'tab', x: 2 * G, y: R2, c: ['8D'] }]),
  ], checks: [
    st => [0, 1].some(i => st.p[i].c.includes(C('AS'))),
    st => S.RANK(top(st, 0)) === 7,
    (st, ev) => ev.flips.length > 0,
    st => st.p[1].c.length > 0,
    st => S.RANK(top(st, 2)) === 4,
  ] },
  spider: { aspect: 1.25, pages: [
    () => mk('spider', { suits: 2 }, [{ k: 'tab', x: 0, y: 0, c: ['9S'] }, { k: 'tab', x: G, y: 0, c: ['8H'] }, { k: 'tab', x: 2 * G, y: 0, c: ['8S'] }]),
    () => mk('spider', { suits: 2 }, [{ k: 'tab', x: 0, y: 0, c: ['TS'] }, { k: 'tab', x: G, y: 0, c: ['4H', '9S', '8S', '7S'], d: 1 }, { k: 'tab', x: 2 * G, y: 0, c: ['JH'] }]),
    () => mk('spider', { suits: 1 }, [{ k: 'found', x: 2 * G, y: 0, stack: 1 }, { k: 'tab', x: 0, y: 0, c: ['KS', 'QS', 'JS', 'TS', '9S', '8S', '7S', '6S', '5S', '4S', '3S', '2S'] }, { k: 'tab', x: G, y: 0, c: ['5H', 'AS'], d: 1 }]),
    () => mk('spider', { suits: 2 }, [{ k: 'stock', x: 2 * G, y: 0, c: ['3H', '6S', 'QH'], d: 3 }, { k: 'tab', x: 0, y: R2, c: ['8H', '4S'], d: 1 }, { k: 'tab', x: G, y: R2, c: ['TH'] }, { k: 'tab', x: 2 * G, y: R2, c: ['2S', 'KS'], d: 1 }]),
  ], checks: [
    st => S.RANK(top(st, 0)) === 8,
    st => st.p[0].c.length === 4,
    st => st.runs >= 1,
    st => !st.p[0].c.length,
  ] },
  freecell: { aspect: 1.25, pages: [
    () => mk('freecell', { cells: 2 }, [{ k: 'cell', x: 0, y: 0 }, { k: 'cell', x: G, y: 0 }, { k: 'tab', x: 0, y: R2, c: ['3D', 'KS'] }, { k: 'tab', x: G, y: R2, c: ['6C'] }, { k: 'tab', x: 2 * G, y: R2, c: ['TH'] }]),
    () => mk('freecell', {}, [{ k: 'found', x: G, y: 0 }, { k: 'found', x: 2 * G, y: 0, c: ['AC'] }, { k: 'tab', x: 0, y: R2, c: ['5S', 'AD'] }, { k: 'tab', x: G, y: R2, c: ['QH'] }, { k: 'tab', x: 2 * G, y: R2, c: ['4C'] }]),
    () => mk('freecell', {}, [{ k: 'tab', x: 0, y: 0, c: ['9C'] }, { k: 'tab', x: G, y: 0, c: ['2S', '8D'] }, { k: 'tab', x: 2 * G, y: 0, c: ['8S'] }]),
    () => mk('freecell', { cells: 2 }, [{ k: 'cell', x: 0, y: 0 }, { k: 'cell', x: G, y: 0, c: ['JD'] }, { k: 'tab', x: 0, y: R2, c: ['TS'] }, { k: 'tab', x: G, y: R2, c: ['3C', '9H', '8S'] }, { k: 'tab', x: 2 * G, y: R2, c: ['6D'] }]),
  ], checks: [
    st => st.p[0].c.length + st.p[1].c.length > 0,
    st => st.p[0].c.length > 0,
    st => top(st, 0) === C('8D'),
    st => st.p[2].c.length === 3,
  ] },
  golf: { aspect: 1.25, pages: [
    () => mk('golf', {}, [{ k: 'tab', x: 0, y: 0, c: ['2D', '8C'] }, { k: 'tab', x: G, y: 0, c: ['QH', '3S'] }, { k: 'tab', x: 2 * G, y: 0, c: ['9D', '6S'] }, { k: 'waste', x: G, y: 2.4, c: ['7H'] }]),
    () => mk('golf', {}, [{ k: 'tab', x: 0, y: 0, c: ['KS', '6C'] }, { k: 'tab', x: G, y: 0, c: ['2H', '7H'] }, { k: 'tab', x: 2 * G, y: 0, c: ['2C', 'JD'] }, { k: 'waste', x: G, y: 2.4, c: ['5D'] }]),
    () => mk('golf', {}, [{ k: 'tab', x: 0, y: 0, c: ['4H', 'QH'] }, { k: 'tab', x: G, y: 0, c: ['8S', 'AC'] }, { k: 'tab', x: 2 * G, y: 0, c: ['5S', 'JD'] }, { k: 'stock', x: 0.5, y: 2.4, c: ['3D', 'TC'], d: 2 }, { k: 'waste', x: 0.5 + G, y: 2.4, c: ['KS'] }]),
  ], checks: [
    st => st.p[3].c.length >= 2,
    st => st.p[3].c.length >= 3,
    st => S.RANK(top(st, 4)) === 11,
  ] },
  tripeaks: { aspect: 1.25, pages: [
    () => mk('tripeaks', {}, [{ k: 'pk', x: 1.06, y: 0, c: ['QC'], d: 1, z: 100 }, { k: 'pk', x: .53, y: .6, c: ['2S'], d: 1, z: 104 }, { k: 'pk', x: 1.59, y: .6, c: ['9H'], d: 1, z: 104 }, { k: 'pk', x: 0, y: 1.2, c: ['5C'], z: 108 }, { k: 'pk', x: 1.06, y: 1.2, c: ['KD'], z: 108 }, { k: 'pk', x: 2.12, y: 1.2, c: ['9S'], z: 108 }, { k: 'waste', x: 1.06, y: 3.1, c: ['6H'] }]),
    () => mk('tripeaks', {}, [{ k: 'pk', x: 1.06, y: 0, c: ['QC'], d: 1, z: 100 }, { k: 'pk', x: .53, y: .6, c: ['4S'], d: 1, z: 104 }, { k: 'pk', x: 1.59, y: .6, c: ['JH'], d: 1, z: 104 }, { k: 'pk', x: 0, y: 1.2, c: ['8C'], z: 108 }, { k: 'pk', x: 1.06, y: 1.2, c: ['9D'], z: 108 }, { k: 'pk', x: 2.12, y: 1.2, c: ['2C'], z: 108 }, { k: 'waste', x: 1.06, y: 3.1, c: ['7H'] }]),
    () => mk('tripeaks', {}, [{ k: 'pk', x: 1.06, y: 0, c: ['QC'], d: 1, z: 100 }, { k: 'pk', x: .53, y: .6, c: ['4S'], d: 1, z: 104 }, { k: 'pk', x: 1.59, y: .6, c: ['JH'], d: 1, z: 104 }, { k: 'pk', x: 0, y: 1.2, c: ['5C'], z: 108 }, { k: 'pk', x: 1.06, y: 1.2, c: ['9D'], z: 108 }, { k: 'pk', x: 2.12, y: 1.2, c: ['QS'], z: 108 }, { k: 'stock', x: .4, y: 3.1, c: ['3H', '8H'], d: 2 }, { k: 'waste', x: .4 + G, y: 3.1, c: ['2D'] }]),
  ], checks: [
    st => st.p[6].c.length >= 2,
    (st, ev) => ev.flips.length > 0,
    st => st.p[7].c.length >= 3,
  ] },
  pyramid: { aspect: 1.25, pages: [
    () => mk('pyramid', {}, [{ k: 'pk', x: .53, y: 0, c: ['2H'], z: 100 }, { k: 'pk', x: 0, y: .55, c: ['8C'], z: 104 }, { k: 'pk', x: 1.06, y: .55, c: ['5S'], z: 104 }, { k: 'found', x: 2.7, y: 0, discard: 1 }]),
    () => mk('pyramid', {}, [{ k: 'pk', x: .53, y: 0, c: ['9C'], z: 100 }, { k: 'pk', x: 0, y: .55, c: ['KD'], z: 104 }, { k: 'pk', x: 1.06, y: .55, c: ['3H'], z: 104 }, { k: 'found', x: 2.7, y: 0, discard: 1 }]),
    () => mk('pyramid', {}, [{ k: 'stock', x: 0, y: 0, c: ['2C', 'JH'], d: 2 }, { k: 'waste', x: 0, y: S.ROW2, c: ['6D'] }, { k: 'pk', x: 1.5, y: 0, c: ['7S'], z: 100 }, { k: 'found', x: 2.9, y: 0, discard: 1 }]),
  ], checks: [
    st => st.p[3].c.length >= 2,
    st => st.p[3].c.includes(C('KD')),
    st => st.p[3].c.length >= 2,
  ] },
};
const IMG = '../images/icons/solitaire.svg';
const L = () => A.LANG, T = v => (RT[L()] || RT.en)[v] || RT.en[v];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let cur = null; const tours = {}, mounts = {};
function build(v) {
  if (tours[v]) return tours[v];
  const m = document.createElement('div'); m.className = 'rt-mount'; m.dataset.v = v; $('#rulesBody').appendChild(m); mounts[v] = m;
  const R = RULES[v], pages = [{ id: 'intro', title: () => esc(A.vName(v)), body: () => '', html: () => RuleTour.intro({ img: IMG, origin: esc(T(v).origin), players: esc(T(v).players), time: esc(T(v).time), history: esc(T(v).hist), win: esc(T(v).win), culture: esc(T(v).cult), lang: L() }) }];
  R.pages.forEach((mkSt, j) => {
    pages.push({ id: 'p' + j, title: () => esc(T(v).p[j].t), body: () => esc(T(v).p[j].b), task: () => esc(T(v).p[j].task),
      setup(api) {
        api.board.classList.add('felt-bg');
        const host = document.createElement('div'); host.style.cssText = 'position:absolute;inset:0'; api.board.appendChild(host);
        const st = mkSt(); let tb = null, done = false;
        const act = mv => {
          if (done || !S.legal(st, mv)) { A.sfx('bad'); return false; }
          const ev = S.apply(st, mv); A.sfx(ev.runs.length ? 'run' : ev.tk === 'found' ? 'found' : ev.flips.length ? 'flip' : 'place'); tb.set(st);
          if (R.checks[j](st, ev)) { done = true; api.ok(esc(T(v).p[j].ok)); }
          return true;
        };
        const best = (pi, ci) => { const V = S.VARIANTS[v]; const ds = []; for (let t = 0; t < st.p.length; t++) if (t !== pi && V.canDrop(st, pi, ci, t)) ds.push(t); ds.sort((a, b) => (st.L[b].k === 'found') - (st.L[a].k === 'found') || (st.p[b].c.length > 0) - (st.p[a].c.length > 0)); return ds[0]; };
        tb = new Table(host, { mini: true, maxU: 120, canAct: () => !done,
          onMove: mv => act(mv), onStock: () => act({ s: 1 }),
          onTap: (pi, ci) => { const t = best(pi, ci); if (t == null) { tb.shake(pi, ci); A.sfx('bad'); } else act({ f: pi, i: ci, t }); },
          onDouble: (pi, ci) => { const t = best(pi, ci); if (t != null) act({ f: pi, i: ci, t }); },
          onBad: () => A.sfx('bad') });
        requestAnimationFrame(() => tb.set(st, { anim: false }));
        api.tb = tb;
      },
      teardown() {},
    });
  });
  const tour = RuleTour.create({ mount: m, store: 'aicoding-solitaire-rules-' + v, lang: L, aspect: R.aspect, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    play: () => { A.closeOv('#rulesOverlay'); const p = A.prefOf(v); A.startGame(v, { o: p.o, diff: p.diff, deal: p.deal, undo: p.undo }); },
    pages });
  tours[v] = tour; return tour;
}
function tabs() {
  $('#rulesTabs').innerHTML = S.ORDER.filter(v => RULES[v]).map(v => `<button type="button" data-v="${v}" class="${v === cur ? 'sel' : ''}">${esc(A.vName(v))}</button>`).join('');
  document.querySelectorAll('#rulesTabs [data-v]').forEach(b => b.onclick = () => show(b.dataset.v, 0));
}
function show(v, page) {
  if (!RULES[v]) v = 'klondike';
  if (cur && tours[cur]) tours[cur].stop();
  cur = v; tabs();
  const tour = build(v);
  Object.keys(mounts).forEach(k => { mounts[k].style.display = k === v ? '' : 'none'; });
  tour.open(page || 0);
}
function open(v) {
  try { localStorage.setItem('aicoding-solitaire-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => show(v || 'klondike', 0));
}
document.getElementById('btnRules').onclick = () => open(cur || (window.SolApp && SolApp.set.v));
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (cur && tours[cur]) tours[cur].stop(); A.closeOv('#rulesOverlay'); } });
window.SolRules = { open, relang() { if (document.getElementById('rulesOverlay').classList.contains('show') && cur) { tabs(); tours[cur].render(); } } };
})();
