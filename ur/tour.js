/* ur/tour.js — ウル王朝のゲーム：ルールのチュートリアル（shared/ruletour.js の枠）
 * 本物の盤（UrBoard2D.mount、対局と同じ絵）で実際にサイコロを振り（UrBoard2D.dice）、駒をタップして動かす。
 * サイコロの出目はページごとに仕込んである（課題が必ず成立する）。
 * 入口：UrTour.open({ mount, lang, design, pieces, speed, page, onPlay, onLessons, onClose, sound })
 *       UrTour.render() / setDesign(d, p) / stop() / visible() / progress() / PAGES
 * 形式と使い方は ur/LEARN-FORMAT.md。依存：shared/ruletour.js, ur/engine.js, ur/board2d.js
 */
(function () {
  'use strict';
  const BASE = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : 'ur/'; })();
  const E = () => window.UrEngine, B = () => window.UrBoard2D;
  const mqV = matchMedia('(pointer: coarse) and (max-width: 760px) and (orientation: portrait)');
  // like the game (ur/app.js orient()): stand the board up only when its squares come out at least as big as lying across —
  // on a short phone (e.g. 375×667) the board lies across. ~438 px of the height go to the tabs, steps, text, task, dice and buttons
  const vert = () => mqV.matches && (innerHeight - 438) / 8.96 >= (innerWidth - 40) / 9.24;

  /* ---------------- texts (10 languages) ---------------- */
  const TX = {
    ja: {
      'intro.t': 'ウル王朝のゲーム', 'intro.origin': 'メソポタミア（現イラク）', 'intro.players': '2人', 'intro.time': '約15分',
      'intro.hist': '約4500年前（紀元前2600〜2400年頃）の盤ゲーム。1922〜34年にウーリーがウルの王墓を発掘して盤が見つかり、その1つを大英博物館が所蔵しています。ルールは同館のフィンケルが、紀元前177年のバビロニアの粘土板から復元しました。',
      'intro.win': '2人で各7枚。4個のサイコロで出た数だけ進み、14マスの道を通って、7枚すべてを先にゴールさせた方の勝ちです。',
      'intro.cult': '盤はイラクのほか、イラン・シリア・エジプト、地中海のキプロス・クレタ、スリランカなどで見つかっています。インド・コーチのユダヤ人社会では、20世紀半ば（1950年代）まで遊ばれていました。',
      roll: '振る', pass: 'パス', first: 'まず［振る］を押そう', die: '出目 {n}', pick: '動かす駒をタップ', again: 'もう一度振れます！',
      noMove: 'その駒は動かせません', own: 'その先には自分の駒がいて止まれません', over: '{n}ではゴールを越えてしまいます（ちょうどの目だけ）', safeNo: '相手の駒は中央のロゼットで守られていて、止まれません', notMine: 'あなたの駒は手前の列の駒です',
      'board.t': '盤と自分の道', 'board.b': 'あなたの駒は手前の列から入り、光る矢印の順に14マス進んでゴールします。中央の列は相手と共有です。', 'board.k': '道の最後のマス（14マス目）をタップしよう', 'board.ok': 'そこが最後のマス。次の一歩でゴールです！', 'board.ng': '矢印の先、いちばん最後のマスです',
      'dice.t': 'サイコロ', 'dice.b': '四面体のサイコロを4個振り、上を向いた白い印の数だけ進みます。0〜4が出て、2がいちばん多く出ます。', 'dice.k': '［振る］を押して、白い印の数を答えよう', 'dice.k2': '白い印はいくつ？', 'dice.ok': '正解！{n}マス進めます', 'dice.ng': '上を向いた白い印を数えてみよう',
      'enter.t': '駒を入れる', 'enter.b': '盤の外の駒は、出た目の数だけ道を進んだマスに入ります。1回に動かせるのは1枚だけです。', 'enter.k': '振ってから、盤の外の駒を入れよう', 'enter.ok': '入りました！手前の列を進んでいきます',
      'move.t': '進む', 'move.b': '盤上の駒も、出た目の数だけ道に沿って進めます。どの駒を動かすかは自分で選べます。', 'move.k': '振ってから、盤上の駒を進めよう', 'move.ok': '道に沿って進みました', 'move.ng': '今回は盤上の駒を進めてみよう',
      'own.t': '自分の駒には止まれない', 'own.b': '自分の駒がいるマスには止まれません。止まれない駒は動かせないので、ほかの駒を選びます。', 'own.k': '振ってから、動かせる駒を動かそう', 'own.ok': '正解！動かせるのはその駒だけでした',
      'cap.t': '相手の駒を取る', 'cap.b': '中央の列で相手の駒がいるマスに止まると、その駒を取れます。取られた駒は盤の外に戻ってやり直しです。', 'cap.k': '振ってから、相手の駒を取ろう', 'cap.ok': '取りました！相手の駒は最初からやり直しです', 'cap.ng': '相手の駒にちょうど止まる駒を選ぼう',
      'ros.t': 'ロゼットでもう一度', 'ros.b': '花の模様のマス（ロゼット）に止まると、もう一度振れます。道の4・8・14マス目がロゼットです。', 'ros.k': 'ロゼットに止まって、もう一度振ろう', 'ros.k2': 'もう一度振れます！振って、どれか動かそう', 'ros.ok': '1回の番で2回動かせました', 'ros.ng': 'ロゼット（光るマス）に止まる駒を選ぼう',
      'safe.t': '中央のロゼットは安全', 'safe.b': '中央の列のロゼットにいる駒は取られません。相手の駒がいれば、そこには止まれません。', 'safe.k': '振ってから、ねらわれた駒を中央のロゼットへ', 'safe.ok': 'これで安全！ロゼットなのでもう一度振れます', 'safe.ng': 'ねらわれている（赤い印の）駒を中央のロゼットへ',
      'goal.t': 'ちょうどの目でゴール', 'goal.b': 'ゴールは道の14マス目の次です。ちょうどの目が出たときだけゴールでき、越える目では動けません。', 'goal.k': '振ってから、駒をゴールさせよう', 'goal.ok': 'ゴール！右下の列に並びます', 'goal.ng': 'ちょうどゴールに届く駒を選ぼう',
      'pass.t': '0の目とパス', 'pass.b': '白い印が0個なら進めません。動かせる駒が1枚もないときもパスして、相手の番になります。', 'pass.k': '振ってみよう', 'pass.k2': '0が出ました。［パス］を押そう', 'pass.ok': '相手の番になります',
      'win.t': '勝ち方', 'win.b': '7枚すべてを先にゴールさせた方の勝ちです。あなたはあと1枚！', 'win.k': '振ってから、最後の駒をゴールさせよう', 'win.ok': '7枚ゴール、あなたの勝ち！', 'win.ng': 'ゴールに届くのは最後の駒です',
    },
    en: {
      'intro.t': 'The Royal Game of Ur', 'intro.origin': 'Mesopotamia (Iraq)', 'intro.players': '2', 'intro.time': 'about 15 min',
      'intro.hist': 'A board game from about 4,500 years ago (c. 2600–2400 BC). Leonard Woolley found boards while excavating the Royal Cemetery at Ur in 1922–34; one is in the British Museum. Its curator Irving Finkel reconstructed the rules from a Babylonian clay tablet of 177 BC.',
      'intro.win': 'Two players, seven pieces each. Move by the roll of four dice along a 14-square track; the first to bring all seven pieces home wins.',
      'intro.cult': 'Boards have been found in Iraq, Iran, Syria, Egypt, Cyprus and Crete in the Mediterranean, and Sri Lanka. The Jewish community of Kochi in India still played it until the mid-20th century (the 1950s).',
      roll: 'Roll', pass: 'Pass', first: 'Press “Roll” first', die: 'Roll {n}', pick: 'Tap a piece to move', again: 'Roll again!',
      noMove: 'That piece cannot move', own: 'Your own piece is there — you cannot land on it', over: 'A {n} would go past home (exact rolls only)', safeNo: 'The rival piece is safe on the middle rosette — you cannot land there', notMine: 'Your pieces are the ones on the near row',
      'board.t': 'The board and your track', 'board.b': 'Your pieces enter on the near row and follow the glowing arrows for 14 squares, then go home. The middle row is shared with your rival.', 'board.k': 'Tap the last square of the track (square 14)', 'board.ok': 'That is the last square. One more step and you are home!', 'board.ng': 'Follow the arrows to the very last square',
      'dice.t': 'The dice', 'dice.b': 'Roll four pyramid dice and move as many squares as white tips point up: 0 to 4, and 2 is the most common.', 'dice.k': 'Press “Roll” and count the white tips', 'dice.k2': 'How many white tips?', 'dice.ok': 'Correct! You may move {n} squares', 'dice.ng': 'Count the dice with a white tip on top',
      'enter.t': 'Entering a piece', 'enter.b': 'A piece off the board enters on the square the roll counts to along the track. You move only one piece per roll.', 'enter.k': 'Roll, then bring a piece onto the board', 'enter.ok': 'It is in! It runs along your near row first',
      'move.t': 'Moving', 'move.b': 'Pieces on the board also move by the roll along the track. You choose which piece to move.', 'move.k': 'Roll, then move a piece on the board', 'move.ok': 'It moved along the track', 'move.ng': 'This time, move a piece that is on the board',
      'own.t': 'Not onto your own piece', 'own.b': 'You cannot land on a square with your own piece. A piece that cannot land cannot move, so pick another.', 'own.k': 'Roll, then move a piece that can move', 'own.ok': 'Right! That was the only piece that could move',
      'cap.t': 'Capturing', 'cap.b': 'Land on a rival piece in the middle row to capture it. It goes back off the board and must start again.', 'cap.k': 'Roll, then capture the rival piece', 'cap.ok': 'Captured! That piece must start over', 'cap.ng': 'Pick the piece that lands exactly on the rival',
      'ros.t': 'Rosettes: roll again', 'ros.b': 'Land on a flower square (rosette) and you roll again. Squares 4, 8 and 14 of your track are rosettes.', 'ros.k': 'Land on a rosette and roll again', 'ros.k2': 'Roll again! Roll and move any piece', 'ros.ok': 'Two moves in one turn', 'ros.ng': 'Pick the piece that lands on a rosette (glowing square)',
      'safe.t': 'The middle rosette is safe', 'safe.b': 'A piece on the rosette in the middle row cannot be captured. If a rival sits there, you cannot land on it.', 'safe.k': 'Roll, then save the red piece on the middle rosette', 'safe.ok': 'Safe now! And a rosette means you roll again', 'safe.ng': 'Move the threatened (red) piece to the middle rosette',
      'goal.t': 'Exact roll to go home', 'goal.b': 'Home is the step after square 14. You go home only with the exact roll; a roll that goes past it cannot be used.', 'goal.k': 'Roll, then bring a piece home', 'goal.ok': 'Home! It joins the row at the lower right', 'goal.ng': 'Pick the piece that reaches home exactly',
      'pass.t': 'Zero and passing', 'pass.b': 'If no white tip is up you cannot move. If no piece can move, you also pass and it is your rival’s turn.', 'pass.k': 'Roll the dice', 'pass.k2': 'A zero. Press “Pass”', 'pass.ok': 'Now it is your rival’s turn',
      'win.t': 'How to win', 'win.b': 'The first to bring all seven pieces home wins. You need just one more!', 'win.k': 'Roll, then bring your last piece home', 'win.ok': 'All seven home — you win!', 'win.ng': 'Only your last piece can reach home',
    },
    zh: {
      'intro.t': '乌尔王族局戏', 'intro.origin': '美索不达米亚（今伊拉克）', 'intro.players': '2人', 'intro.time': '约15分钟',
      'intro.hist': '约4500年前（约公元前2600–前2400年）的棋盘游戏。伍利于1922–34年发掘乌尔王陵时发现了棋盘，其中一件藏于大英博物馆。该馆的芬克尔根据公元前177年的巴比伦泥板复原了规则。',
      'intro.win': '两人各7枚棋子。掷4枚骰子按点数沿14格的路线前进，先让7枚全部到达终点者获胜。',
      'intro.cult': '除伊拉克外，伊朗、叙利亚、埃及、地中海的塞浦路斯和克里特以及斯里兰卡都发现过棋盘。印度科钦的犹太人社区一直玩到20世纪中叶（1950年代）。',
      roll: '掷骰', pass: '跳过', first: '先按“掷骰”', die: '点数 {n}', pick: '点击要走的棋子', again: '再掷一次！',
      noMove: '这枚棋子不能走', own: '那里有自己的棋子，不能停', over: '{n}会越过终点（必须正好）', safeNo: '对方棋子在中央花格受到保护，不能停在那里', notMine: '你的棋子在靠近你的一行',
      'board.t': '棋盘与你的路线', 'board.b': '你的棋子从靠近你的一行进入，按发光箭头走14格后到达终点。中间一行与对手共用。', 'board.k': '点击路线的最后一格（第14格）', 'board.ok': '那是最后一格，再走一步就到终点！', 'board.ng': '沿箭头找到最后一格',
      'dice.t': '骰子', 'dice.b': '掷4枚四面体骰子，朝上的白点有几个就走几格。点数0–4，2最常出现。', 'dice.k': '按“掷骰”，数一数白点', 'dice.k2': '有几个白点？', 'dice.ok': '正确！可以走{n}格', 'dice.ng': '数一数顶端是白点的骰子',
      'enter.t': '棋子入场', 'enter.b': '盘外的棋子按点数沿路线进入相应的格子。每次只能走一枚。', 'enter.k': '掷骰后，让盘外的棋子入场', 'enter.ok': '入场了！先沿靠近你的一行前进',
      'move.t': '前进', 'move.b': '盘上的棋子也按点数沿路线前进。走哪一枚由你决定。', 'move.k': '掷骰后，走盘上的棋子', 'move.ok': '沿路线前进了', 'move.ng': '这次请走盘上的棋子',
      'own.t': '不能停在自己的棋子上', 'own.b': '有自己棋子的格子不能停。不能停的棋子就不能走，请选别的棋子。', 'own.k': '掷骰后，走一枚能走的棋子', 'own.ok': '对！只有那枚能走',
      'cap.t': '吃子', 'cap.b': '在中间一行停到对方棋子所在的格子就能吃掉它。被吃的棋子回到盘外重新开始。', 'cap.k': '掷骰后，吃掉对方的棋子', 'cap.ok': '吃掉了！对方棋子要从头开始', 'cap.ng': '选正好停在对方棋子上的那一枚',
      'ros.t': '花格再掷一次', 'ros.b': '停在花纹格（花格）上可以再掷一次。路线的第4、8、14格是花格。', 'ros.k': '停到花格上，再掷一次', 'ros.k2': '再掷一次！掷骰后任选一枚走', 'ros.ok': '一回合走了两次', 'ros.ng': '选能停到花格（发光格）的棋子',
      'safe.t': '中央花格是安全的', 'safe.b': '中间一行的花格上的棋子不会被吃。对方棋子在那里时，你不能停上去。', 'safe.k': '掷骰后，把被盯上的棋子逃到中央花格', 'safe.ok': '安全了！又是花格，可以再掷一次', 'safe.ng': '把被盯上的（红色标记）棋子移到中央花格',
      'goal.t': '正好的点数才能到终点', 'goal.b': '终点在第14格之后。只有点数正好才能到达，超过的点数不能用。', 'goal.k': '掷骰后，让一枚棋子到达终点', 'goal.ok': '到达终点！排在右下方', 'goal.ng': '选正好能到终点的棋子',
      'pass.t': '0点与跳过', 'pass.b': '没有白点朝上就不能走。没有任何棋子能走时也要跳过，轮到对手。', 'pass.k': '掷骰看看', 'pass.k2': '掷出了0。按“跳过”', 'pass.ok': '轮到对手了',
      'win.t': '胜利条件', 'win.b': '先让7枚棋子全部到达终点者获胜。你只差最后一枚！', 'win.k': '掷骰后，让最后一枚到达终点', 'win.ok': '7枚全部到达，你赢了！', 'win.ng': '能到终点的是最后那一枚',
    },
    ko: {
      'intro.t': '우르 왕실 게임', 'intro.origin': '메소포타미아(현 이라크)', 'intro.players': '2명', 'intro.time': '약 15분',
      'intro.hist': '약 4500년 전(기원전 2600~2400년경)의 보드게임. 1922~34년 울리가 우르 왕릉을 발굴하며 판을 발견했고, 그중 하나를 대영박물관이 소장하고 있습니다. 규칙은 같은 박물관의 핀켈이 기원전 177년 바빌로니아 점토판에서 복원했습니다.',
      'intro.win': '두 사람이 각 7개. 주사위 4개로 나온 수만큼 14칸의 길을 따라 나아가, 7개를 모두 먼저 골인시키면 승리합니다.',
      'intro.cult': '이라크 외에 이란·시리아·이집트, 지중해의 키프로스·크레타, 스리랑카 등에서 판이 발견되었습니다. 인도 코치의 유대인 공동체는 20세기 중반(1950년대)까지 이 게임을 했습니다.',
      roll: '굴리기', pass: '패스', first: '먼저 [굴리기]를 누르세요', die: '눈 {n}', pick: '움직일 말을 탭', again: '한 번 더 굴릴 수 있어요!',
      noMove: '그 말은 움직일 수 없어요', own: '그곳에는 내 말이 있어 멈출 수 없어요', over: '{n}이면 골을 넘어 버려요(딱 맞는 눈만)', safeNo: '상대 말은 가운데 로제트에서 보호되어 멈출 수 없어요', notMine: '내 말은 앞쪽 줄의 말이에요',
      'board.t': '판과 나의 길', 'board.b': '내 말은 앞쪽 줄에서 들어와 빛나는 화살표를 따라 14칸을 간 뒤 골인합니다. 가운데 줄은 상대와 함께 씁니다.', 'board.k': '길의 마지막 칸(14번째)을 탭하세요', 'board.ok': '거기가 마지막 칸. 한 걸음 더 가면 골인!', 'board.ng': '화살표 끝, 맨 마지막 칸이에요',
      'dice.t': '주사위', 'dice.b': '사면체 주사위 4개를 굴려, 위를 향한 흰 표시의 수만큼 나아갑니다. 0~4가 나오며 2가 가장 많이 나옵니다.', 'dice.k': '[굴리기]를 누르고 흰 표시를 세어 보세요', 'dice.k2': '흰 표시는 몇 개?', 'dice.ok': '정답! {n}칸 갈 수 있어요', 'dice.ng': '위에 흰 표시가 있는 주사위를 세어 보세요',
      'enter.t': '말 들여놓기', 'enter.b': '판 밖의 말은 나온 눈만큼 길을 따라간 칸으로 들어갑니다. 한 번에 1개만 움직입니다.', 'enter.k': '굴린 다음, 판 밖의 말을 들여놓으세요', 'enter.ok': '들어왔어요! 먼저 앞쪽 줄을 나아갑니다',
      'move.t': '나아가기', 'move.b': '판 위의 말도 나온 눈만큼 길을 따라 나아갑니다. 어느 말을 움직일지는 내가 고릅니다.', 'move.k': '굴린 다음, 판 위의 말을 움직이세요', 'move.ok': '길을 따라 나아갔어요', 'move.ng': '이번에는 판 위의 말을 움직여 보세요',
      'own.t': '내 말 위에는 멈출 수 없다', 'own.b': '내 말이 있는 칸에는 멈출 수 없습니다. 멈출 수 없는 말은 움직일 수 없으니 다른 말을 고릅니다.', 'own.k': '굴린 다음, 움직일 수 있는 말을 움직이세요', 'own.ok': '정답! 움직일 수 있는 말은 그것뿐이었어요',
      'cap.t': '상대 말 잡기', 'cap.b': '가운데 줄에서 상대 말이 있는 칸에 멈추면 그 말을 잡습니다. 잡힌 말은 판 밖으로 돌아가 처음부터 다시 시작합니다.', 'cap.k': '굴린 다음, 상대 말을 잡으세요', 'cap.ok': '잡았어요! 상대 말은 처음부터 다시', 'cap.ng': '상대 말에 딱 멈추는 말을 고르세요',
      'ros.t': '로제트에서 한 번 더', 'ros.b': '꽃무늬 칸(로제트)에 멈추면 한 번 더 굴립니다. 길의 4·8·14번째 칸이 로제트입니다.', 'ros.k': '로제트에 멈추고 한 번 더 굴리세요', 'ros.k2': '한 번 더! 굴려서 아무 말이나 움직이세요', 'ros.ok': '한 차례에 두 번 움직였어요', 'ros.ng': '로제트(빛나는 칸)에 멈추는 말을 고르세요',
      'safe.t': '가운데 로제트는 안전', 'safe.b': '가운데 줄의 로제트에 있는 말은 잡히지 않습니다. 상대 말이 있으면 그 칸에는 멈출 수 없습니다.', 'safe.k': '굴린 다음, 노려지는 말을 가운데 로제트로 피하세요', 'safe.ok': '이제 안전! 로제트라 한 번 더 굴립니다', 'safe.ng': '노려지는(빨간 표시) 말을 가운데 로제트로',
      'goal.t': '딱 맞는 눈으로 골인', 'goal.b': '골은 14번째 칸의 다음입니다. 딱 맞는 눈이 나왔을 때만 골인하며, 넘는 눈으로는 움직일 수 없습니다.', 'goal.k': '굴린 다음, 말을 골인시키세요', 'goal.ok': '골인! 오른쪽 아래 줄에 놓입니다', 'goal.ng': '딱 골에 닿는 말을 고르세요',
      'pass.t': '0과 패스', 'pass.b': '흰 표시가 0개면 나아갈 수 없습니다. 움직일 말이 하나도 없을 때도 패스하고 상대 차례가 됩니다.', 'pass.k': '굴려 보세요', 'pass.k2': '0이 나왔어요. [패스]를 누르세요', 'pass.ok': '상대 차례가 됩니다',
      'win.t': '이기는 법', 'win.b': '7개를 모두 먼저 골인시킨 쪽이 이깁니다. 이제 1개 남았어요!', 'win.k': '굴린 다음, 마지막 말을 골인시키세요', 'win.ok': '7개 모두 골인, 승리!', 'win.ng': '골에 닿는 것은 마지막 말이에요',
    },
    es: {
      'intro.t': 'El Juego Real de Ur', 'intro.origin': 'Mesopotamia (Irak)', 'intro.players': '2', 'intro.time': 'unos 15 min',
      'intro.hist': 'Un juego de tablero de hace unos 4500 años (c. 2600–2400 a. C.). Leonard Woolley halló tableros al excavar el Cementerio Real de Ur en 1922–34; uno está en el Museo Británico. Su conservador Irving Finkel reconstruyó las reglas a partir de una tablilla babilónica del 177 a. C.',
      'intro.win': 'Dos jugadores, siete fichas cada uno. Se avanza según cuatro dados por un recorrido de 14 casillas; gana quien saque antes sus siete fichas.',
      'intro.cult': 'Se han hallado tableros en Irak, Irán, Siria, Egipto, Chipre y Creta en el Mediterráneo, y Sri Lanka. La comunidad judía de Kochi (India) aún lo jugaba a mediados del siglo XX (años 50).',
      roll: 'Tirar', pass: 'Pasar', first: 'Pulsa «Tirar» primero', die: 'Tirada {n}', pick: 'Toca la ficha que mueves', again: '¡Vuelves a tirar!',
      noMove: 'Esa ficha no puede moverse', own: 'Ahí hay una ficha tuya: no puedes caer en ella', over: 'Con {n} te pasarías de la meta (solo tirada exacta)', safeNo: 'La ficha rival está a salvo en la roseta central: no puedes caer ahí', notMine: 'Tus fichas son las de la fila cercana',
      'board.t': 'El tablero y tu recorrido', 'board.b': 'Tus fichas entran por la fila cercana y siguen las flechas 14 casillas hasta la meta. La fila central se comparte con el rival.', 'board.k': 'Toca la última casilla del recorrido (la 14)', 'board.ok': 'Esa es la última casilla. ¡Un paso más y a la meta!', 'board.ng': 'Sigue las flechas hasta la última casilla',
      'dice.t': 'Los dados', 'dice.b': 'Tira cuatro dados piramidales y avanza tantas casillas como puntas blancas queden arriba: de 0 a 4; el 2 es el más frecuente.', 'dice.k': 'Pulsa «Tirar» y cuenta las puntas blancas', 'dice.k2': '¿Cuántas puntas blancas?', 'dice.ok': '¡Correcto! Avanzas {n} casillas', 'dice.ng': 'Cuenta los dados con punta blanca arriba',
      'enter.t': 'Meter una ficha', 'enter.b': 'Una ficha de fuera entra en la casilla a la que llega la tirada por el recorrido. Solo mueves una ficha por tirada.', 'enter.k': 'Tira y mete una ficha en el tablero', 'enter.ok': '¡Dentro! Primero recorre tu fila cercana',
      'move.t': 'Avanzar', 'move.b': 'Las fichas del tablero también avanzan según la tirada por el recorrido. Tú eliges qué ficha mover.', 'move.k': 'Tira y mueve una ficha del tablero', 'move.ok': 'Ha avanzado por el recorrido', 'move.ng': 'Esta vez mueve una ficha del tablero',
      'own.t': 'No sobre una ficha tuya', 'own.b': 'No puedes caer en una casilla con una ficha tuya. Si no puede caer, no se mueve: elige otra.', 'own.k': 'Tira y mueve una ficha que pueda moverse', 'own.ok': '¡Bien! Era la única ficha que podía moverse',
      'cap.t': 'Capturar', 'cap.b': 'Si caes en una ficha rival en la fila central, la capturas. Vuelve fuera del tablero y empieza de nuevo.', 'cap.k': 'Tira y captura la ficha rival', 'cap.ok': '¡Capturada! Esa ficha empieza de nuevo', 'cap.ng': 'Elige la ficha que cae justo en la rival',
      'ros.t': 'Rosetas: vuelves a tirar', 'ros.b': 'Si caes en una casilla de flor (roseta) vuelves a tirar. Las casillas 4, 8 y 14 de tu recorrido son rosetas.', 'ros.k': 'Cae en una roseta y vuelve a tirar', 'ros.k2': '¡Otra tirada! Tira y mueve cualquier ficha', 'ros.ok': 'Dos movimientos en un turno', 'ros.ng': 'Elige la ficha que cae en una roseta (casilla brillante)',
      'safe.t': 'La roseta central es segura', 'safe.b': 'Una ficha en la roseta de la fila central no puede ser capturada. Si hay una rival allí, no puedes caer en ella.', 'safe.k': 'Tira y salva la ficha roja en la roseta central', 'safe.ok': '¡A salvo! Y en roseta vuelves a tirar', 'safe.ng': 'Lleva la ficha amenazada (roja) a la roseta central',
      'goal.t': 'Tirada exacta para la meta', 'goal.b': 'La meta es el paso tras la casilla 14. Solo se entra con la tirada exacta; una que se pase no se puede usar.', 'goal.k': 'Tira y lleva una ficha a la meta', 'goal.ok': '¡Meta! Se coloca en la fila de abajo a la derecha', 'goal.ng': 'Elige la ficha que llega justo a la meta',
      'pass.t': 'El cero y pasar', 'pass.b': 'Sin puntas blancas arriba no avanzas. Si ninguna ficha puede moverse también pasas, y le toca al rival.', 'pass.k': 'Tira los dados', 'pass.k2': 'Un cero. Pulsa «Pasar»', 'pass.ok': 'Ahora le toca al rival',
      'win.t': 'Cómo ganar', 'win.b': 'Gana quien lleve antes sus siete fichas a la meta. ¡Te falta solo una!', 'win.k': 'Tira y lleva tu última ficha a la meta', 'win.ok': '¡Las siete en la meta: ganas!', 'win.ng': 'Solo tu última ficha llega a la meta',
    },
    fr: {
      'intro.t': 'Le Jeu royal d’Ur', 'intro.origin': 'Mésopotamie (Irak)', 'intro.players': '2', 'intro.time': 'env. 15 min',
      'intro.hist': 'Un jeu de plateau vieux d’environ 4 500 ans (v. 2600–2400 av. J.-C.). Leonard Woolley en trouva au cimetière royal d’Ur (fouilles 1922–34) ; l’un est au British Museum. Son conservateur Irving Finkel a reconstitué les règles d’après une tablette babylonienne de 177 av. J.-C.',
      'intro.win': 'Deux joueurs, sept pions chacun. On avance selon quatre dés sur un parcours de 14 cases ; le premier à sortir ses sept pions gagne.',
      'intro.cult': 'Des plateaux ont été trouvés en Irak, Iran, Syrie, Égypte, à Chypre et en Crète en Méditerranée, et au Sri Lanka. La communauté juive de Kochi (Inde) y jouait encore au milieu du XXᵉ siècle (années 1950).',
      roll: 'Lancer', pass: 'Passer', first: 'Appuyez d’abord sur « Lancer »', die: 'Jet {n}', pick: 'Touchez le pion à jouer', again: 'Relancez !',
      noMove: 'Ce pion ne peut pas bouger', own: 'Un de vos pions y est déjà : impossible de s’y arrêter', over: 'Avec {n}, vous dépasseriez l’arrivée (jet exact seulement)', safeNo: 'Le pion adverse est protégé sur la rosace centrale : impossible de s’y arrêter', notMine: 'Vos pions sont ceux de la rangée proche',
      'board.t': 'Le plateau et votre parcours', 'board.b': 'Vos pions entrent par la rangée proche et suivent les flèches sur 14 cases jusqu’à l’arrivée. La rangée du milieu est partagée avec l’adversaire.', 'board.k': 'Touchez la dernière case du parcours (la 14ᵉ)', 'board.ok': 'C’est la dernière case. Encore un pas et c’est l’arrivée !', 'board.ng': 'Suivez les flèches jusqu’à la toute dernière case',
      'dice.t': 'Les dés', 'dice.b': 'Lancez quatre dés pyramidaux et avancez d’autant de cases que de pointes blanches en haut : de 0 à 4, le 2 étant le plus fréquent.', 'dice.k': 'Lancez et comptez les pointes blanches', 'dice.k2': 'Combien de pointes blanches ?', 'dice.ok': 'Exact ! Vous avancez de {n} cases', 'dice.ng': 'Comptez les dés dont la pointe blanche est en haut',
      'enter.t': 'Entrer un pion', 'enter.b': 'Un pion hors du plateau entre sur la case atteinte par le jet le long du parcours. On ne joue qu’un pion par jet.', 'enter.k': 'Lancez, puis entrez un pion', 'enter.ok': 'Il est entré ! Il parcourt d’abord votre rangée',
      'move.t': 'Avancer', 'move.b': 'Les pions sur le plateau avancent aussi selon le jet le long du parcours. Vous choisissez lequel jouer.', 'move.k': 'Lancez, puis avancez un pion du plateau', 'move.ok': 'Il a avancé sur le parcours', 'move.ng': 'Cette fois, avancez un pion déjà sur le plateau',
      'own.t': 'Pas sur votre propre pion', 'own.b': 'On ne peut pas s’arrêter sur une case occupée par son propre pion. Ce pion ne bouge pas : choisissez-en un autre.', 'own.k': 'Lancez, puis jouez un pion qui peut bouger', 'own.ok': 'Bien vu ! C’était le seul pion jouable',
      'cap.t': 'Prendre', 'cap.b': 'En vous arrêtant sur un pion adverse dans la rangée du milieu, vous le prenez. Il retourne hors du plateau et recommence.', 'cap.k': 'Lancez, puis prenez le pion adverse', 'cap.ok': 'Pris ! Ce pion doit tout recommencer', 'cap.ng': 'Choisissez le pion qui tombe pile sur l’adversaire',
      'ros.t': 'Rosaces : on rejoue', 'ros.b': 'En vous arrêtant sur une case fleurie (rosace), vous relancez. Les cases 4, 8 et 14 de votre parcours sont des rosaces.', 'ros.k': 'Arrêtez-vous sur une rosace et relancez', 'ros.k2': 'Relancez ! Puis jouez n’importe quel pion', 'ros.ok': 'Deux coups en un seul tour', 'ros.ng': 'Choisissez le pion qui s’arrête sur une rosace (case lumineuse)',
      'safe.t': 'La rosace centrale protège', 'safe.b': 'Un pion sur la rosace de la rangée du milieu ne peut pas être pris. Si un adversaire y est, vous ne pouvez pas vous y arrêter.', 'safe.k': 'Lancez, puis abritez le pion rouge au centre', 'safe.ok': 'À l’abri ! Et sur une rosace, on relance', 'safe.ng': 'Mettez le pion menacé (rouge) sur la rosace centrale',
      'goal.t': 'Jet exact pour sortir', 'goal.b': 'L’arrivée est juste après la case 14. On ne sort qu’avec le jet exact ; un jet trop fort ne peut pas servir.', 'goal.k': 'Lancez, puis sortez un pion', 'goal.ok': 'Arrivé ! Il se range en bas à droite', 'goal.ng': 'Choisissez le pion qui atteint l’arrivée pile',
      'pass.t': 'Le zéro et passer', 'pass.b': 'Sans pointe blanche en haut, vous n’avancez pas. Si aucun pion ne peut bouger, vous passez aussi : à l’adversaire.', 'pass.k': 'Lancez les dés', 'pass.k2': 'Zéro. Appuyez sur « Passer »', 'pass.ok': 'C’est au tour de l’adversaire',
      'win.t': 'Comment gagner', 'win.b': 'Le premier à sortir ses sept pions gagne. Il ne vous en reste qu’un !', 'win.k': 'Lancez, puis sortez votre dernier pion', 'win.ok': 'Sept pions sortis : vous gagnez !', 'win.ng': 'Seul votre dernier pion peut sortir',
    },
    pt: {
      'intro.t': 'O Jogo Real de Ur', 'intro.origin': 'Mesopotâmia (Iraque)', 'intro.players': '2', 'intro.time': 'cerca de 15 min',
      'intro.hist': 'Um jogo de tabuleiro de cerca de 4.500 anos (c. 2600–2400 a.C.). Leonard Woolley os achou no Cemitério Real de Ur (1922–34); um está no Museu Britânico. O curador Irving Finkel reconstruiu as regras a partir de uma tábua babilônica de 177 a.C.',
      'intro.win': 'Dois jogadores, sete peças cada. Avança-se pelo resultado de quatro dados num percurso de 14 casas; vence quem levar primeiro as sete peças à chegada.',
      'intro.cult': 'Há tabuleiros achados no Iraque, Irã, Síria, Egito, em Chipre e Creta no Mediterrâneo, e no Sri Lanka. A comunidade judaica de Kochi (Índia) ainda o jogava em meados do século XX (anos 1950).',
      roll: 'Lançar', pass: 'Passar', first: 'Toque em “Lançar” primeiro', die: 'Lance {n}', pick: 'Toque a peça a mover', again: 'Lance de novo!',
      noMove: 'Essa peça não pode se mover', own: 'Há uma peça sua lá: não pode parar nela', over: 'Com {n} passaria da chegada (só lance exato)', safeNo: 'A peça rival está protegida na roseta central: não pode parar lá', notMine: 'Suas peças são as da fileira próxima',
      'board.t': 'O tabuleiro e seu percurso', 'board.b': 'Suas peças entram pela fileira próxima e seguem as setas por 14 casas até a chegada. A fileira do meio é compartilhada com o rival.', 'board.k': 'Toque a última casa do percurso (a 14ª)', 'board.ok': 'Essa é a última casa. Mais um passo e chega!', 'board.ng': 'Siga as setas até a última casa',
      'dice.t': 'Os dados', 'dice.b': 'Lance quatro dados piramidais e ande tantas casas quantas pontas brancas ficarem para cima: de 0 a 4; o 2 é o mais comum.', 'dice.k': 'Toque em “Lançar” e conte as pontas brancas', 'dice.k2': 'Quantas pontas brancas?', 'dice.ok': 'Certo! Você anda {n} casas', 'dice.ng': 'Conte os dados com a ponta branca para cima',
      'enter.t': 'Entrar com uma peça', 'enter.b': 'Uma peça fora do tabuleiro entra na casa a que o lance chega pelo percurso. Só se move uma peça por lance.', 'enter.k': 'Lance e coloque uma peça no tabuleiro', 'enter.ok': 'Entrou! Primeiro ela percorre sua fileira',
      'move.t': 'Avançar', 'move.b': 'As peças no tabuleiro também avançam pelo lance ao longo do percurso. Você escolhe qual mover.', 'move.k': 'Lance e mova uma peça do tabuleiro', 'move.ok': 'Avançou pelo percurso', 'move.ng': 'Desta vez, mova uma peça que já está no tabuleiro',
      'own.t': 'Não sobre a sua peça', 'own.b': 'Não se pode parar numa casa com peça sua. A peça que não pode parar não se move: escolha outra.', 'own.k': 'Lance e mova uma peça que possa se mover', 'own.ok': 'Isso! Era a única peça que podia se mover',
      'cap.t': 'Capturar', 'cap.b': 'Parando numa peça rival na fileira do meio, você a captura. Ela volta para fora do tabuleiro e recomeça.', 'cap.k': 'Lance e capture a peça rival', 'cap.ok': 'Capturada! Essa peça recomeça', 'cap.ng': 'Escolha a peça que cai exatamente na rival',
      'ros.t': 'Rosetas: lance de novo', 'ros.b': 'Parando numa casa de flor (roseta), você lança de novo. As casas 4, 8 e 14 do percurso são rosetas.', 'ros.k': 'Pare numa roseta e lance de novo', 'ros.k2': 'Lance de novo! Depois mova qualquer peça', 'ros.ok': 'Dois movimentos num só turno', 'ros.ng': 'Escolha a peça que para numa roseta (casa brilhante)',
      'safe.t': 'A roseta central é segura', 'safe.b': 'Uma peça na roseta da fileira do meio não pode ser capturada. Se houver uma rival lá, você não pode parar nela.', 'safe.k': 'Lance e leve a peça ameaçada à roseta central', 'safe.ok': 'Segura! E na roseta você lança de novo', 'safe.ng': 'Leve a peça ameaçada (vermelha) à roseta central',
      'goal.t': 'Lance exato para chegar', 'goal.b': 'A chegada é o passo após a casa 14. Só se chega com o lance exato; um lance que passe não pode ser usado.', 'goal.k': 'Lance e leve uma peça à chegada', 'goal.ok': 'Chegou! Ela fica na fileira de baixo à direita', 'goal.ng': 'Escolha a peça que chega exatamente',
      'pass.t': 'O zero e passar', 'pass.b': 'Sem pontas brancas para cima, você não anda. Se nenhuma peça puder se mover, também passa, e é a vez do rival.', 'pass.k': 'Lance os dados', 'pass.k2': 'Deu zero. Toque em “Passar”', 'pass.ok': 'Agora é a vez do rival',
      'win.t': 'Como vencer', 'win.b': 'Vence quem levar primeiro as sete peças à chegada. Falta só uma!', 'win.k': 'Lance e leve sua última peça à chegada', 'win.ok': 'Sete peças na chegada: você venceu!', 'win.ng': 'Só a sua última peça chega',
    },
    de: {
      'intro.t': 'Das Königliche Spiel von Ur', 'intro.origin': 'Mesopotamien (Irak)', 'intro.players': '2', 'intro.time': 'ca. 15 Min.',
      'intro.hist': 'Ein Brettspiel von vor rund 4500 Jahren (ca. 2600–2400 v. Chr.). Leonard Woolley fand Bretter im Königsfriedhof von Ur (Grabung 1922–34); eines besitzt das British Museum. Dessen Kurator Irving Finkel rekonstruierte die Regeln nach einer babylonischen Tontafel von 177 v. Chr.',
      'intro.win': 'Zwei Spieler mit je sieben Steinen. Man zieht nach vier Würfeln auf einer Bahn von 14 Feldern; wer zuerst alle sieben Steine ins Ziel bringt, gewinnt.',
      'intro.cult': 'Bretter fand man im Irak, Iran, in Syrien, Ägypten, auf Zypern, Kreta und in Sri Lanka. Die jüdische Gemeinde von Kochi (Indien) spielte es bis in die 1950er-Jahre.',
      roll: 'Würfeln', pass: 'Passen', first: 'Zuerst „Würfeln“ drücken', die: 'Wurf {n}', pick: 'Tippe den Stein, den du ziehst', again: 'Nochmal würfeln!',
      noMove: 'Dieser Stein kann nicht ziehen', own: 'Dort steht dein eigener Stein – darauf darfst du nicht', over: 'Mit {n} gingst du übers Ziel hinaus (nur genauer Wurf)', safeNo: 'Der gegnerische Stein ist auf der mittleren Rosette sicher – dort darfst du nicht hin', notMine: 'Deine Steine sind die in der vorderen Reihe',
      'board.t': 'Das Brett und deine Bahn', 'board.b': 'Deine Steine ziehen in der vorderen Reihe ein und folgen den leuchtenden Pfeilen 14 Felder bis ins Ziel. Die mittlere Reihe teilst du mit dem Gegner.', 'board.k': 'Tippe das letzte Feld der Bahn (Feld 14)', 'board.ok': 'Das ist das letzte Feld. Noch ein Schritt, und du bist im Ziel!', 'board.ng': 'Folge den Pfeilen bis zum allerletzten Feld',
      'dice.t': 'Die Würfel', 'dice.b': 'Wirf vier Pyramidenwürfel und ziehe so viele Felder, wie weiße Spitzen oben sind: 0 bis 4, am häufigsten 2.', 'dice.k': 'Drücke „Würfeln“ und zähle die weißen Spitzen', 'dice.k2': 'Wie viele weiße Spitzen?', 'dice.ok': 'Richtig! Du ziehst {n} Felder', 'dice.ng': 'Zähle die Würfel mit weißer Spitze oben',
      'enter.t': 'Einen Stein einsetzen', 'enter.b': 'Ein Stein von außen kommt auf das Feld, bis zu dem der Wurf entlang der Bahn reicht. Pro Wurf ziehst du nur einen Stein.', 'enter.k': 'Würfle und setze einen Stein ein', 'enter.ok': 'Drin! Er läuft zuerst durch deine vordere Reihe',
      'move.t': 'Ziehen', 'move.b': 'Auch Steine auf dem Brett ziehen um den Wurf entlang der Bahn. Welchen Stein du ziehst, entscheidest du.', 'move.k': 'Würfle und ziehe einen Stein auf dem Brett', 'move.ok': 'Er ist die Bahn entlang gezogen', 'move.ng': 'Ziehe diesmal einen Stein, der schon auf dem Brett steht',
      'own.t': 'Nicht auf den eigenen Stein', 'own.b': 'Auf einem Feld mit deinem eigenen Stein darfst du nicht landen. Dieser Stein kann dann nicht ziehen – nimm einen anderen.', 'own.k': 'Würfle und ziehe einen Stein, der ziehen kann', 'own.ok': 'Richtig! Nur dieser Stein konnte ziehen',
      'cap.t': 'Schlagen', 'cap.b': 'Landest du in der mittleren Reihe auf einem gegnerischen Stein, schlägst du ihn. Er muss vom Brett und von vorn beginnen.', 'cap.k': 'Würfle und schlage den gegnerischen Stein', 'cap.ok': 'Geschlagen! Dieser Stein beginnt von vorn', 'cap.ng': 'Wähle den Stein, der genau auf dem Gegner landet',
      'ros.t': 'Rosetten: nochmal würfeln', 'ros.b': 'Landest du auf einem Blumenfeld (Rosette), würfelst du nochmal. Die Felder 4, 8 und 14 deiner Bahn sind Rosetten.', 'ros.k': 'Lande auf einer Rosette und würfle nochmal', 'ros.k2': 'Nochmal! Würfle und ziehe einen beliebigen Stein', 'ros.ok': 'Zwei Züge in einem Zug', 'ros.ng': 'Wähle den Stein, der auf einer Rosette (leuchtendes Feld) landet',
      'safe.t': 'Die mittlere Rosette ist sicher', 'safe.b': 'Ein Stein auf der Rosette der mittleren Reihe kann nicht geschlagen werden. Steht dort ein Gegner, darfst du nicht dorthin.', 'safe.k': 'Würfle und rette den roten Stein in die Mitte', 'safe.ok': 'In Sicherheit! Und auf der Rosette würfelst du nochmal', 'safe.ng': 'Bring den bedrohten (roten) Stein auf die mittlere Rosette',
      'goal.t': 'Genauer Wurf ins Ziel', 'goal.b': 'Das Ziel ist der Schritt nach Feld 14. Ins Ziel kommt man nur mit dem genauen Wurf; ein zu hoher Wurf geht nicht.', 'goal.k': 'Würfle und bring einen Stein ins Ziel', 'goal.ok': 'Im Ziel! Er reiht sich unten rechts ein', 'goal.ng': 'Wähle den Stein, der das Ziel genau erreicht',
      'pass.t': 'Die Null und Passen', 'pass.b': 'Zeigt keine weiße Spitze nach oben, ziehst du nicht. Kann kein Stein ziehen, passt du auch – der Gegner ist dran.', 'pass.k': 'Würfle', 'pass.k2': 'Eine Null. Drücke „Passen“', 'pass.ok': 'Jetzt ist der Gegner dran',
      'win.t': 'So gewinnt man', 'win.b': 'Wer zuerst alle sieben Steine ins Ziel bringt, gewinnt. Dir fehlt nur noch einer!', 'win.k': 'Würfle und bring deinen letzten Stein ins Ziel', 'win.ok': 'Alle sieben im Ziel – du gewinnst!', 'win.ng': 'Nur dein letzter Stein erreicht das Ziel',
    },
    hi: {
      'intro.t': 'उर का शाही खेल', 'intro.origin': 'मेसोपोटामिया (इराक)', 'intro.players': '2', 'intro.time': 'लगभग 15 मिनट',
      'intro.hist': 'लगभग 4500 साल पुराना (लगभग 2600–2400 ई.पू.) बोर्ड खेल। 1922–34 में लियोनार्ड वूली को उर के शाही क़ब्रिस्तान की खुदाई में बोर्ड मिले; उनमें से एक ब्रिटिश संग्रहालय में है। वहाँ के इरविंग फ़िंकेल ने 177 ई.पू. की बेबीलोनी मिट्टी की पटिया से नियम फिर से तैयार किए।',
      'intro.win': 'दो खिलाड़ी, हर एक के 7 मोहरे। चार पासों के अंक जितना 14 खानों के रास्ते पर चलें; जो पहले सातों मोहरे घर पहुँचाए, वह जीतता है।',
      'intro.cult': 'इराक के अलावा ईरान, सीरिया, मिस्र, भूमध्य सागर के साइप्रस और क्रीट, और श्रीलंका में भी बोर्ड मिले हैं। भारत के कोच्चि के यहूदी समुदाय में यह 20वीं सदी के मध्य (1950 के दशक) तक खेला जाता था।',
      roll: 'पासा फेंकें', pass: 'पास', first: 'पहले “पासा फेंकें” दबाएँ', die: 'अंक {n}', pick: 'चलाने वाला मोहरा छुएँ', again: 'फिर से फेंकें!',
      noMove: 'यह मोहरा नहीं चल सकता', own: 'वहाँ आपका अपना मोहरा है, वहाँ नहीं रुक सकते', over: '{n} से घर से आगे निकल जाएँगे (केवल ठीक अंक)', safeNo: 'विरोधी का मोहरा बीच के रोज़ेट पर सुरक्षित है, वहाँ नहीं रुक सकते', notMine: 'आपके मोहरे पास वाली पंक्ति के हैं',
      'board.t': 'बोर्ड और आपका रास्ता', 'board.b': 'आपके मोहरे पास वाली पंक्ति से आते हैं और चमकते तीरों के क्रम में 14 खाने चलकर घर पहुँचते हैं। बीच की पंक्ति विरोधी के साथ साझा है।', 'board.k': 'रास्ते का आख़िरी खाना (14वाँ) छुएँ', 'board.ok': 'यही आख़िरी खाना है। एक क़दम और, फिर घर!', 'board.ng': 'तीरों के साथ बिल्कुल आख़िरी खाने तक जाएँ',
      'dice.t': 'पासे', 'dice.b': 'चार पिरामिड पासे फेंकें; जितनी सफ़ेद नोकें ऊपर हों उतने खाने चलें। 0 से 4 आते हैं, 2 सबसे ज़्यादा।', 'dice.k': '“पासा फेंकें” दबाएँ और सफ़ेद नोकें गिनें', 'dice.k2': 'कितनी सफ़ेद नोकें?', 'dice.ok': 'सही! आप {n} खाने चल सकते हैं', 'dice.ng': 'जिन पासों की सफ़ेद नोक ऊपर है उन्हें गिनें',
      'enter.t': 'मोहरा अंदर लाना', 'enter.b': 'बोर्ड के बाहर का मोहरा रास्ते पर अंक जितना आगे वाले खाने में आता है। एक बार में एक ही मोहरा चलता है।', 'enter.k': 'पासा फेंकें, फिर एक मोहरा बोर्ड पर लाएँ', 'enter.ok': 'अंदर आ गया! पहले यह पास वाली पंक्ति में चलेगा',
      'move.t': 'आगे बढ़ना', 'move.b': 'बोर्ड के मोहरे भी अंक जितना रास्ते पर आगे बढ़ते हैं। कौन-सा मोहरा चलाना है, आप चुनते हैं।', 'move.k': 'पासा फेंकें, फिर बोर्ड का मोहरा चलाएँ', 'move.ok': 'रास्ते पर आगे बढ़ गया', 'move.ng': 'इस बार बोर्ड पर रखा मोहरा चलाएँ',
      'own.t': 'अपने मोहरे पर नहीं', 'own.b': 'जिस खाने में आपका मोहरा हो वहाँ नहीं रुक सकते। ऐसा मोहरा नहीं चलता, कोई और चुनें।', 'own.k': 'पासा फेंकें, फिर चल सकने वाला मोहरा चलाएँ', 'own.ok': 'सही! केवल वही मोहरा चल सकता था',
      'cap.t': 'मोहरा मारना', 'cap.b': 'बीच की पंक्ति में विरोधी के मोहरे वाले खाने पर रुकें तो वह मारा जाता है। वह बोर्ड से बाहर जाकर फिर से शुरू करता है।', 'cap.k': 'पासा फेंकें, फिर विरोधी का मोहरा मारें', 'cap.ok': 'मार दिया! वह मोहरा फिर से शुरू करेगा', 'cap.ng': 'वह मोहरा चुनें जो ठीक विरोधी पर रुके',
      'ros.t': 'रोज़ेट पर फिर से', 'ros.b': 'फूल वाले खाने (रोज़ेट) पर रुकें तो फिर से पासा फेंकते हैं। रास्ते के 4, 8 और 14वें खाने रोज़ेट हैं।', 'ros.k': 'रोज़ेट पर रुकें और फिर फेंकें', 'ros.k2': 'फिर से! फेंकें और कोई भी मोहरा चलाएँ', 'ros.ok': 'एक बारी में दो चालें', 'ros.ng': 'वह मोहरा चुनें जो रोज़ेट (चमकते खाने) पर रुके',
      'safe.t': 'बीच का रोज़ेट सुरक्षित है', 'safe.b': 'बीच की पंक्ति के रोज़ेट पर रखा मोहरा मारा नहीं जा सकता। वहाँ विरोधी हो तो आप वहाँ नहीं रुक सकते।', 'safe.k': 'पासा फेंकें, फिर ख़तरे वाले मोहरे को बीच के रोज़ेट पर बचाएँ', 'safe.ok': 'अब सुरक्षित! रोज़ेट है, तो फिर से फेंकें', 'safe.ng': 'ख़तरे वाले (लाल) मोहरे को बीच के रोज़ेट पर ले जाएँ',
      'goal.t': 'ठीक अंक से घर', 'goal.b': 'घर 14वें खाने के बाद है। केवल ठीक अंक आने पर घर पहुँचते हैं; आगे निकलने वाला अंक काम नहीं आता।', 'goal.k': 'पासा फेंकें, फिर एक मोहरा घर पहुँचाएँ', 'goal.ok': 'घर! यह नीचे दाईं पंक्ति में लगता है', 'goal.ng': 'वह मोहरा चुनें जो ठीक घर तक पहुँचे',
      'pass.t': 'शून्य और पास', 'pass.b': 'कोई सफ़ेद नोक ऊपर न हो तो नहीं चलते। कोई भी मोहरा न चल सके तब भी पास, फिर विरोधी की बारी।', 'pass.k': 'पासा फेंकें', 'pass.k2': 'शून्य आया। “पास” दबाएँ', 'pass.ok': 'अब विरोधी की बारी है',
      'win.t': 'जीत कैसे', 'win.b': 'जो पहले सातों मोहरे घर पहुँचाए, वह जीतता है। आपका बस एक बाकी है!', 'win.k': 'पासा फेंकें, फिर आख़िरी मोहरा घर पहुँचाएँ', 'win.ok': 'सातों घर पहुँचे, आप जीते!', 'win.ng': 'घर तक केवल आख़िरी मोहरा पहुँचता है',
    },
    ar: {
      'intro.t': 'لعبة أور الملكية', 'intro.origin': 'بلاد الرافدين (العراق)', 'intro.players': '2', 'intro.time': 'نحو 15 دقيقة',
      'intro.hist': 'لعبة لوحية عمرها نحو 4500 عام (حوالي 2600–2400 ق.م). عثر ليونارد وولي على ألواحها أثناء تنقيب المقبرة الملكية في أور بين 1922 و1934، وأحدها في المتحف البريطاني. أعاد أمينه إيرفينغ فينكل بناء القواعد من لوح طيني بابلي يعود إلى 177 ق.م.',
      'intro.win': 'لاعبان، لكل منهما سبع قطع. تتحرك بحسب أربعة نرود على مسار من 14 مربعًا، والفائز أول من يُوصل قطعه السبع إلى النهاية.',
      'intro.cult': 'وُجدت ألواحها في العراق وإيران وسوريا ومصر وقبرص وكريت في المتوسط وسريلانكا. وظلّ يهود كوتشي في الهند يلعبونها حتى منتصف القرن العشرين (الخمسينيات).',
      roll: 'ارمِ', pass: 'تمرير', first: 'اضغط «ارمِ» أولاً', die: 'الرمية {n}', pick: 'المس القطعة التي تحركها', again: 'ارمِ مرة أخرى!',
      noMove: 'لا يمكن تحريك هذه القطعة', own: 'هناك قطعة لك، لا يمكنك التوقف عليها', over: 'بـ {n} تتجاوز النهاية (الرمية المضبوطة فقط)', safeNo: 'قطعة الخصم آمنة على الوردة الوسطى، لا يمكنك التوقف هناك', notMine: 'قطعك هي التي في الصف القريب منك',
      'board.t': 'اللوحة ومسارك', 'board.b': 'تدخل قطعك من الصف القريب وتتبع الأسهم المضيئة 14 مربعًا ثم تصل إلى النهاية. الصف الأوسط مشترك مع الخصم.', 'board.k': 'المس آخر مربع في المسار (المربع 14)', 'board.ok': 'هذا آخر مربع. خطوة أخرى وتصل!', 'board.ng': 'اتبع الأسهم حتى آخر مربع',
      'dice.t': 'النرود', 'dice.b': 'ارمِ أربعة نرود هرمية وتقدّم بعدد الرؤوس البيضاء المتجهة للأعلى: من 0 إلى 4، و2 هو الأكثر.', 'dice.k': 'اضغط «ارمِ» وعُدّ الرؤوس البيضاء', 'dice.k2': 'كم رأسًا أبيض؟', 'dice.ok': 'صحيح! تتقدم {n} مربعات', 'dice.ng': 'عُدّ النرود التي رأسها الأبيض للأعلى',
      'enter.t': 'إدخال قطعة', 'enter.b': 'تدخل القطعة من خارج اللوحة إلى المربع الذي تبلغه الرمية على المسار. تحرّك قطعة واحدة فقط في كل رمية.', 'enter.k': 'ارمِ ثم أدخل قطعة إلى اللوحة', 'enter.ok': 'دخلت! تسير أولاً في صفك القريب',
      'move.t': 'التقدم', 'move.b': 'القطع على اللوحة تتقدم أيضًا بحسب الرمية على المسار، وأنت تختار أي قطعة تحرك.', 'move.k': 'ارمِ ثم حرّك قطعة على اللوحة', 'move.ok': 'تقدمت على المسار', 'move.ng': 'هذه المرة حرّك قطعة موجودة على اللوحة',
      'own.t': 'لا تتوقف على قطعتك', 'own.b': 'لا يمكنك التوقف على مربع فيه قطعة لك. القطعة التي لا تستطيع التوقف لا تتحرك، فاختر غيرها.', 'own.k': 'ارمِ ثم حرّك قطعة يمكنها الحركة', 'own.ok': 'صحيح! كانت هي القطعة الوحيدة القادرة على الحركة',
      'cap.t': 'الأسر', 'cap.b': 'إذا توقفت على قطعة للخصم في الصف الأوسط تأسرها، فتعود إلى خارج اللوحة وتبدأ من جديد.', 'cap.k': 'ارمِ ثم أسِر قطعة الخصم', 'cap.ok': 'أُسرت! تبدأ تلك القطعة من جديد', 'cap.ng': 'اختر القطعة التي تقع تمامًا على قطعة الخصم',
      'ros.t': 'الوردة: ارمِ مرة أخرى', 'ros.b': 'إذا توقفت على مربع الزهرة (الوردة) ترمي مرة أخرى. المربعات 4 و8 و14 في مسارك ورود.', 'ros.k': 'توقّف على وردة وارمِ مرة أخرى', 'ros.k2': 'مرة أخرى! ارمِ وحرّك أي قطعة', 'ros.ok': 'حركتان في دور واحد', 'ros.ng': 'اختر القطعة التي تتوقف على وردة (مربع مضيء)',
      'safe.t': 'الوردة الوسطى آمنة', 'safe.b': 'لا يمكن أسر قطعة على وردة الصف الأوسط. وإن كانت عليها قطعة للخصم فلا يمكنك التوقف هناك.', 'safe.k': 'ارمِ ثم انقل القطعة المهددة إلى الوردة الوسطى', 'safe.ok': 'صارت آمنة! وعلى الوردة ترمي مرة أخرى', 'safe.ng': 'انقل القطعة المهددة (الحمراء) إلى الوردة الوسطى',
      'goal.t': 'رمية مضبوطة للوصول', 'goal.b': 'النهاية هي الخطوة بعد المربع 14. لا تصل إلا بالرمية المضبوطة، والرمية التي تتجاوزها لا تُستخدم.', 'goal.k': 'ارمِ ثم أوصِل قطعة إلى النهاية', 'goal.ok': 'وصلت! تصطف في الأسفل يمينًا', 'goal.ng': 'اختر القطعة التي تبلغ النهاية تمامًا',
      'pass.t': 'الصفر والتمرير', 'pass.b': 'إن لم يتجه أي رأس أبيض للأعلى فلا تتقدم. وإن لم تستطع أي قطعة الحركة تمرّر أيضًا ويأتي دور الخصم.', 'pass.k': 'ارمِ النرود', 'pass.k2': 'صفر. اضغط «تمرير»', 'pass.ok': 'الآن دور الخصم',
      'win.t': 'طريقة الفوز', 'win.b': 'يفوز أول من يُوصل قطعه السبع إلى النهاية. بقيت لك قطعة واحدة!', 'win.k': 'ارمِ ثم أوصِل قطعتك الأخيرة', 'win.ok': 'وصلت السبع كلها، فزت!', 'win.ng': 'قطعتك الأخيرة وحدها تبلغ النهاية',
    },
  };

  // upright phones: the board stands with your lane (Light) on the right — the texts that say where things are
  const TXV = {
    ja: { 'board.b': 'あなたの駒は右の列から入り、光る矢印の順に14マス進んでゴールします。中央の列は相手と共有です。', 'enter.ok': '入りました！右の列を進んでいきます', 'goal.ok': 'ゴール！盤の外の右上に並びます', notMine: 'あなたの駒は右の列の駒です' },
    en: { 'board.b': 'Your pieces enter on the right-hand column and follow the glowing arrows for 14 squares, then go home. The middle column is shared with your rival.', 'enter.ok': 'It is in! It runs up your right-hand column first', 'goal.ok': 'Home! It waits at the top right, off the board', notMine: 'Your pieces are the ones in the right-hand column' },
    zh: { 'board.b': '你的棋子从右边一列进入，按发光箭头走14格后到达终点。中间一列与对手共用。', 'enter.ok': '入场了！先沿右边一列前进', 'goal.ok': '到达终点！排在盘外右上方', notMine: '你的棋子在右边一列' },
    ko: { 'board.b': '내 말은 오른쪽 줄에서 들어와 빛나는 화살표를 따라 14칸을 간 뒤 골인합니다. 가운데 줄은 상대와 함께 씁니다.', 'enter.ok': '들어왔어요! 먼저 오른쪽 줄을 나아갑니다', 'goal.ok': '골인! 판 밖 오른쪽 위에 놓입니다', notMine: '내 말은 오른쪽 줄의 말이에요' },
    es: { 'board.b': 'Tus fichas entran por la columna derecha y siguen las flechas 14 casillas hasta la meta. La columna central se comparte con el rival.', 'enter.ok': '¡Dentro! Primero recorre tu columna derecha', 'goal.ok': '¡Meta! Se coloca arriba a la derecha, fuera del tablero', notMine: 'Tus fichas son las de la columna derecha' },
    fr: { 'board.b': 'Vos pions entrent par la colonne de droite et suivent les flèches sur 14 cases jusqu’à l’arrivée. La colonne du milieu est partagée avec l’adversaire.', 'enter.ok': 'Il est entré ! Il parcourt d’abord votre colonne de droite', 'goal.ok': 'Arrivé ! Il se range en haut à droite, hors du plateau', notMine: 'Vos pions sont ceux de la colonne de droite' },
    pt: { 'board.b': 'Suas peças entram pela coluna da direita e seguem as setas por 14 casas até a chegada. A coluna do meio é compartilhada com o rival.', 'enter.ok': 'Entrou! Primeiro ela percorre sua coluna da direita', 'goal.ok': 'Chegou! Ela fica no alto à direita, fora do tabuleiro', notMine: 'Suas peças são as da coluna da direita' },
    de: { 'board.b': 'Deine Steine ziehen in der rechten Spalte ein und folgen den leuchtenden Pfeilen 14 Felder bis ins Ziel. Die mittlere Spalte teilst du mit dem Gegner.', 'enter.ok': 'Drin! Er läuft zuerst durch deine rechte Spalte', 'goal.ok': 'Im Ziel! Er wartet oben rechts neben dem Brett', notMine: 'Deine Steine sind die in der rechten Spalte' },
    hi: { 'board.b': 'आपके मोहरे दाईं कतार से आते हैं और चमकते तीरों के क्रम में 14 खाने चलकर घर पहुँचते हैं। बीच की कतार विरोधी के साथ साझा है।', 'enter.ok': 'अंदर आ गया! पहले यह दाईं कतार में चलेगा', 'goal.ok': 'घर! यह बोर्ड के बाहर ऊपर दाईं ओर लगता है', notMine: 'आपके मोहरे दाईं कतार के हैं' },
    ar: { 'board.b': 'تدخل قطعك من العمود الأيمن وتتبع الأسهم المضيئة 14 مربعًا ثم تصل إلى النهاية. العمود الأوسط مشترك مع الخصم.', 'enter.ok': 'دخلت! تسير أولاً في عمودك الأيمن', 'goal.ok': 'وصلت! تصطف أعلى اليمين خارج اللوحة', notMine: 'قطعك هي التي في العمود الأيمن' },
  };
  /* ---------------- state ---------------- */
  const O = { lang: 'ja', design: 'museum', pieces: 'orig', speed: 1 };
  const lang = () => { const l = typeof O.lang === 'function' ? O.lang() : O.lang; return TX[l] ? l : 'en'; };
  const T = (k, v) => { let s = (vert() && TXV[lang()] && TXV[lang()][k]) || TX[lang()][k]; if (s == null) s = TX.en[k]; if (s == null) s = k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] != null ? v[x] : ''); return s; };
  const snd = k => { try { O.sound && O.sound(k); } catch (e) {} };
  let tour = null, mountEl = null;
  const PH = {};   // page-local phase (task text) — reset in setup

  const PAT = { 0: [0, 0, 0, 0], 1: [0, 0, 1, 0], 2: [1, 0, 0, 1], 3: [1, 1, 0, 1], 4: [1, 1, 1, 1] };
  const full = a => { const r = a.slice(); while (r.length < 7) r.push(0); return r; };
  const ST = (p0, p1) => ({ rule: 'finkel', pos: [full(p0), full(p1)], turn: 0, winner: -1 });
  const rcOf = (side, i) => { const q = E().coords('finkel', side, i); return q ? { r: q[0], c: q[1] } : null; };
  const idxAt = (side, r, c) => { const P = E().pathOf('finkel', side); for (let i = 0; i < P.length; i++) if (P[i][0] === r && P[i][1] === c) return i + 1; return -1; };

  // phones held upright: the board stands up, turned half round like the game (big block at the bottom, your lane on the right;
  // ur/app.js mqV + orient()); otherwise it lies across as on PC
  const ASPECT = () => vert() ? 0.56 : 924 / 690;
  /* ---------------- CSS ---------------- */
  const CSS = `
.rt-intro-hero img[src*="img/board-"]{width:min(240px,42vw);height:auto;aspect-ratio:904/426}
.urt{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;gap:2%;direction:ltr}
.urt-b{flex:1 1 auto;min-height:0;display:flex;justify-content:center}
.urt-b > svg{width:100%;height:100%}
.urt-dr{flex:0 0 19%;min-height:0;display:flex;align-items:center;justify-content:center;gap:12px}
.urt-d{height:100%;aspect-ratio:450/120;max-width:58%}
.urt-btn{flex:none;white-space:nowrap;padding:7px 18px;border-radius:10px;border:0;background:linear-gradient(180deg,#e9cf8e,#c9a961);color:#14100a;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.urt-btn:disabled{opacity:.35;cursor:default}
.urt-btn.urt-pass{background:linear-gradient(180deg,#9fb6ff,#5f78d6);color:#0a1030}
.urt-n{flex:none;min-width:2.2em;direction:ltr;unicode-bidi:isolate;font:700 22px/1 'Cormorant Garamond',Georgia,serif;color:var(--accent,#e2c275);text-align:center}
.urt-choice{display:flex;gap:8px;justify-content:center;margin:6px 0 0;flex-wrap:wrap}
.rt-row .urt-choice{justify-content:flex-start}
.urt-choice button{min-width:44px;padding:6px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.2));background:rgba(255,255,255,.06);color:var(--text,#eee);font:700 16px/1.2 inherit;cursor:pointer}
.urt-choice button:hover{background:rgba(255,255,255,.12)}
/* upright phones: the tall board fills the box above a slim dice row */
.urt.urt-v{gap:6px}
.urt.urt-v .urt-dr{flex:0 0 52px;gap:8px}
.urt.urt-v .urt-d{height:100%;max-width:62%}
@media (hover: hover) and (pointer: fine) and (min-width: 820px){.urt-btn{font-size:16px;padding:9px 22px}.urt-n{font-size:28px}}
@media (max-width: 520px){
.rt .rt-intro{gap:6px}.rt .rt-intro-hero{gap:10px}.rt .rt-intro-hero img[src*="img/board-"]{width:34vw}
  .rt .rt-intro-facts{gap:4px}.rt .rt-intro-facts span{padding:3px 8px;font-size:12px;border-radius:9px}.rt .rt-intro-facts small{font-size:10px}
  .rt .rt-intro-sec{padding:6px 10px;gap:0 8px;border-radius:11px}.rt .rt-intro-sec i{font-size:16px}.rt .rt-intro-sec b{font-size:12px}.rt .rt-intro-sec p{font-size:12.5px;line-height:1.45}
  .rt .rt-main:has(.rt-intro) h2.rt-title{margin-bottom:4px}
}
@media (max-width: 520px){.urt-btn{padding:6px 12px;font-size:13.5px}.urt-n{font-size:19px}.urt-dr{gap:8px}}
`;
  function injectCss() { if (!document.getElementById('urtCss')) { const s = document.createElement('style'); s.id = 'urtCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------------- a small interactive turn on the real board ---------------- */
  // cfg: { s, rolls:[n,...] (the dice that will come up, in order), marks(s, ctl) → marks, noDice, onMove(m, again, ctl) , onPass(ctl) }
  function game(api, cfg) {
    const host = api.board;
    const V = vert();
    host.innerHTML = `<div class="urt${V ? ' urt-v' : ''}" dir="ltr"><div class="urt-b"></div><div class="urt-dr"${cfg.noDice ? ' style="visibility:hidden"' : ''}><div class="urt-d"></div><span class="urt-n"></span><button type="button" class="urt-btn">${T('roll')}</button></div></div>`;
    const view = B().mount(host.querySelector('.urt-b'), V ? { orient: 'v', flip: true, notch: true, design: O.design, pieces: O.pieces, speed: O.speed } : { orient: 'h', design: O.design, pieces: O.pieces, speed: O.speed });
    const dc = B().dice(host.querySelector('.urt-d'), { style: O.pieces });
    const btn = host.querySelector('.urt-btn'), nEl = host.querySelector('.urt-n');
    const ctl = { s: E().clone(cfg.s), n: null, phase: cfg.noDice ? 'none' : 'roll', k: 0, busy: false, view, extra: [] };
    ctl.s.turn = 0;
    const moves = () => ctl.n ? E().legalMoves(ctl.s, ctl.n) : [];
    const draw = (opt = {}) => {
      const marks = (cfg.marks ? cfg.marks(ctl.s, ctl) : []).concat(ctl.extra);
      view.render(ctl.s, Object.assign({ marks, last: ctl.last || null }, opt));
      btn.textContent = ctl.phase === 'pass' ? T('pass') : T('roll');
      btn.classList.toggle('urt-pass', ctl.phase === 'pass');
      btn.disabled = !(ctl.phase === 'roll' || ctl.phase === 'pass');
      btn.style.visibility = ctl.phase === 'none' || ctl.phase === 'done' ? 'hidden' : '';
    };
    ctl.draw = draw;
    dc.show([0, 0, 0, 0]);
    async function roll() {
      if (ctl.phase !== 'roll' || ctl.busy || !api.alive()) return;
      ctl.busy = true; btn.disabled = true; nEl.textContent = ''; snd('roll');
      const n = cfg.rolls[Math.min(ctl.k, cfg.rolls.length - 1)]; ctl.k++;
      await dc.roll(PAT[n].slice(), { speed: O.speed });
      if (!api.alive()) return;
      ctl.busy = false; ctl.n = n; nEl.textContent = '= ' + n;
      if (cfg.onRoll && cfg.onRoll(n, ctl) === false) { draw(); return; }
      ctl.phase = moves().length ? 'move' : 'pass';
      api.say(ctl.phase === 'move' ? T('pick') : '', '');
      draw();
    }
    ctl.roll = roll;
    btn.onclick = () => { if (ctl.phase === 'pass') { if (cfg.onPass) cfg.onPass(ctl); } else roll(); };
    // why a piece at path index `from` cannot move with the current roll
    const why = from => {
      const to = from + ctl.n, s = ctl.s;
      if (to > 15) return T('over', { n: ctl.n });
      if (to < 15 && s.pos[0].includes(to)) return T('own');
      const q = rcOf(0, to); if (q && to < 15 && E().isRosette('finkel', 0, to) && s.pos[1].some(p => p >= 1 && p <= 14 && (() => { const o = rcOf(1, p); return o.r === q.r && o.c === q.c; })())) return T('safeNo');
      return T('noMove');
    };
    async function tryFrom(from) {
      if (ctl.busy || !api.alive()) return;
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (ctl.phase !== 'move') return;
      const m = moves().find(x => x.from === from);
      if (!m) { api.ng(why(from), { reset: false }); return; }
      if (cfg.check) { const bad = cfg.check(m, ctl); if (bad) { api.ng(bad, { reset: false }); return; } }
      ctl.busy = true; api.say('');
      snd(m.capture ? 'cap' : 'move');
      await view.animateMove(0, m.from, m.to, { capture: m.capture, speed: O.speed });
      if (!api.alive()) return;
      const r = E().apply(ctl.s, m); ctl.s = r.state; ctl.s.turn = 0; ctl.busy = false; ctl.n = null;
      const tq = m.finish ? { tray: 'goal', side: 0 } : rcOf(0, m.to);
      ctl.last = { from: m.enter ? null : rcOf(0, m.from), to: tq && tq.r != null ? tq : null };
      ctl.phase = r.again ? 'roll' : 'done';
      draw();
      cfg.onMove(m, r.again, ctl);
    }
    view.on('cell', ({ r, c }) => {
      if (cfg.onCell) { cfg.onCell(r, c, ctl); return; }
      const i = idxAt(0, r, c);
      if (i > 0 && ctl.s.pos[0].includes(i)) { tryFrom(i); return; }
      // tapping the destination square: the one move that ends there
      if (ctl.phase === 'move') { const m = moves().find(x => { const q = rcOf(0, x.to); return q && q.r === r && q.c === c; }); if (m) { tryFrom(m.from); return; } }
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (ctl.phase === 'move' && idxAt(1, r, c) > 0 && ctl.s.pos[1].includes(idxAt(1, r, c)) && r !== 1) api.ng(T('notMine'), { reset: false });
    });
    view.on('tray', ({ side, kind }) => {
      if (cfg.onCell) return;
      if (side !== 0) { if (ctl.phase === 'move') api.ng(T('notMine'), { reset: false }); return; }
      if (kind === 'start' && ctl.s.pos[0].includes(0)) tryFrom(0);
      else if (kind === 'goal' && ctl.phase === 'move') { const m = moves().find(x => x.finish); if (m) tryFrom(m.from); }
    });
    // space = roll / pass (while this page is shown)
    const key = e => {
      if (e.key !== ' ' || e.repeat || !api.alive() || !host.isConnected) return;
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '') && e.target !== btn) return;
      e.preventDefault(); btn.click();
    };
    document.addEventListener('keydown', key);
    ctl.off = () => document.removeEventListener('keydown', key);
    draw();
    return ctl;
  }
  let curCtl = null;
  const run = (api, cfg) => { if (curCtl && curCtl.off) curCtl.off(); curCtl = game(api, cfg); return curCtl; };
  const teardown = () => { if (curCtl && curCtl.off) curCtl.off(); curCtl = null; };

  /* ---------------- pages ---------------- */
  const ros0 = () => [4, 8, 14].map(i => Object.assign(rcOf(0, i), { type: 'glow' }));
  const PAGES = [
    // ② the board and your track
    { id: 'board', setup(api) {
        const nums = [];
        for (let i = 1; i <= 14; i++) nums.push(Object.assign(rcOf(0, i), { type: 'text', text: String(i), size: 26, color: '#fff6cf' }));
        let done = false;
        run(api, { s: ST([], [0, 0, 0, 0, 0, 0, 0]), noDice: true, rolls: [0],
          marks: () => [{ type: 'path', side: 0, from: 0, to: 14 }].concat(done ? [Object.assign(rcOf(0, 14), { type: 'glow', color: '#3df59a' })] : []).concat(nums),
          onCell(r, c, ctl) {
            if (done) return;
            if (idxAt(0, r, c) === 14) { done = true; ctl.draw(); api.ok(T('board.ok')); }
            else api.ng(T('board.ng'), { reset: false });
          } });
      } },
    // ③ the dice: roll, then say how many white tips
    { id: 'dice', setup(api) {
        PH.dice = 0;
        const ctl = run(api, { s: ST([], []), rolls: [3],
          onRoll(n) {
            PH.dice = 1;
            api.setTask(`<div class="urt-choice" data-noswipe>${[0, 1, 2, 3, 4].map(k => `<button type="button" data-urt-n="${k}">${k}</button>`).join('')}</div>`);
            const tk = api.board.closest('.rt').querySelector('.rt-task');
            tk.onclick = e => {
              const b = e.target.closest('[data-urt-n]'); if (!b || !api.alive() || PH.dice === 2) return;
              if (+b.dataset.urtN === n) { PH.dice = 2; api.setTask(''); api.ok(T('dice.ok', { n })); }
              else api.ng(T('dice.ng'), { reset: false });
            };
            ctl.phase = 'shown';
            return false;
          } });
      } },
    // ④ entering
    { id: 'enter', setup(api) {
        run(api, { s: ST([], [0, 0, 0, 0, 0, 0, 0]), rolls: [3],
          onMove(m) { if (m.enter) api.ok(T('enter.ok')); } });
      } },
    // ⑤ moving a piece on the board
    { id: 'move', setup(api) {
        run(api, { s: ST([5], [3]), rolls: [2],
          check: m => m.enter ? T('move.ng') : null,
          onMove() { api.ok(T('move.ok')); } });
      } },
    // ⑥ cannot land on your own piece: 2 and 4 on the board, roll 2 → only 4→6
    { id: 'own', setup(api) {
        run(api, { s: ST([2, 4], [2]), rolls: [2],
          onMove() { api.ok(T('own.ok')); } });
      } },
    // ⑦ capturing: own 6 (1,1) + 2, rival at its 9 = (1,4); roll 3 → 6→9 captures
    { id: 'cap', setup(api) {
        run(api, { s: ST([6, 2], [9, 3]), rolls: [3],
          check: m => m.capture ? null : T('cap.ng'),
          onMove() { api.ok(T('cap.ok')); } });
      } },
    // ⑧ rosette: own 2 and 5, roll 2 → 2→4 rosette, roll again (1)
    { id: 'ros', setup(api) {
        PH.ros = 0;
        run(api, { s: ST([2, 5], [11]), rolls: [2, 1],
          marks: () => ros0(),
          check: (m, ctl) => ctl.k === 1 && !m.rosette ? T('ros.ng') : null,
          onMove(m, again) {
            if (again) { PH.ros = 1; api.setTask(''); api.say(T('again'), 'ok'); snd('ok'); }
            else api.ok(T('ros.ok'));
          } });
      } },
    // ⑨ middle rosette is safe: own 6 (1,1) threatened by rival at its 4 (0,0) and 3; roll 2 → 6→8
    { id: 'safe', setup(api) {
        let moved = false;
        run(api, { s: ST([6, 1], [4, 3]), rolls: [2],
          marks: s => moved ? [Object.assign(rcOf(0, 8), { type: 'safe' })] : [Object.assign(rcOf(0, 6), { type: 'danger' }), Object.assign(rcOf(0, 8), { type: 'glow' })],
          check: m => m.from === 6 ? null : T('safe.ng'),
          onMove() { moved = true; curCtl.phase = 'done'; curCtl.draw(); api.ok(T('safe.ok')); } });
      } },
    // ⑩ exact roll to go home: own 14 and 13, roll 2 → 13→15 (14 would overshoot)
    { id: 'goal', setup(api) {
        run(api, { s: ST([14, 13, 15, 15, 9], [10, 2]), rolls: [2],
          check: m => m.finish ? null : T('goal.ng'),
          onMove() { api.ok(T('goal.ok')); } });
      } },
    // ⑪ zero: pass
    { id: 'pass', setup(api) {
        PH.pass = 0;
        run(api, { s: ST([3, 7], [5, 1]), rolls: [0],
          onRoll(n, ctl) { PH.pass = 1; ctl.phase = 'pass'; api.setTask(''); api.say(''); return false; },
          onPass(ctl) { ctl.phase = 'done'; ctl.draw(); api.ok(T('pass.ok')); } });
      } },
    // ⑫ how to win: six home, the last one on 12, roll 3
    { id: 'win', setup(api) {
        run(api, { s: ST([12, 15, 15, 15, 15, 15, 15], [11, 6, 15, 15, 0, 0, 0]), rolls: [3],
          check: m => m.finish ? null : T('win.ng'),
          onMove() { api.ok(T('win.ok')); } });
      } },
  ];
  const taskOf = id => () => {
    if (id === 'dice') return PH.dice === 1 ? T('dice.k2') : T('dice.k');
    if (id === 'ros') return PH.ros ? T('ros.k2') : T('ros.k');
    if (id === 'pass') return PH.pass ? T('pass.k2') : T('pass.k');
    return T(id + '.k');
  };
  const ALL = PAGES.map(P => Object.assign({ title: () => T(P.id + '.t'), body: () => `<p>${T(P.id + '.b')}</p>`, task: taskOf(P.id), teardown }, P));
  ALL.unshift({ id: 'intro', title: () => T('intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), img: BASE + 'img/board-' + (O.design || 'museum') + '-h-s.webp', origin: T('intro.origin'), players: T('intro.players'), time: T('intro.time'), history: T('intro.hist'), win: T('intro.win'), culture: T('intro.cult') }) });

  /* ---------------- entry ---------------- */
  function ensure(mount) {
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (tour && el === mountEl) return tour;
    injectCss(); mountEl = el;
    tour = RuleTour.create({
      mount: el, store: 'aicoding-ur-rules', lang, pages: ALL, aspect: ASPECT,
      close: () => { teardown(); O.onClose && O.onClose(); },
      play: O.onPlay ? () => { teardown(); O.onPlay(); } : null,
      lessons: O.onLessons ? () => { teardown(); O.onLessons(); } : null,
      sound: k => snd(k),
    });
    return tour;
  }
  // turning the phone: build the page again with the board the other way round
  let lastV = vert();
  const reorient = () => { const v = vert(); if (v === lastV) return; lastV = v; if (tour && tour.visible()) { teardown(); tour.open(tour.page); } };
  if (mqV.addEventListener) mqV.addEventListener('change', reorient); addEventListener('resize', reorient);
  let opened = false;
  const UrTour = {
    open(o = {}) {
      Object.assign(O, o);
      if (!o.onPlay && !O.onPlay) O.onPlay = null;
      const t = ensure(o.mount || mountEl || '#rulesBody');
      t.open(o.page != null ? o.page : opened ? t.page : 0); opened = true;
      return t;
    },
    render() { if (tour && tour.visible()) tour.open(tour.page); },
    setDesign(d, p) { if (d) O.design = d; if (p) O.pieces = p; UrTour.render(); },
    stop() { teardown(); if (tour) tour.stop(); },
    visible() { return !!(tour && tour.visible()); },
    progress() { return tour ? tour.progress() : { done: 0, total: ALL.length + 1 }; },
    PAGES: ALL.map(p => p.id).concat(['_finish']),
    _T: T, _TX: TX,
  };
  window.UrTour = UrTour;
})();
