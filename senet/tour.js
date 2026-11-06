/* senet/tour.js — セネト：ルールのチュートリアル（shared/ruletour.js の枠）
 * 本物の盤（SenetBoard2D.mount、対局と同じ絵）で実際に投げ棒を投げ、駒をタップして動かす。投げの目はページごとに仕込んである。
 * 入口：SenetTour.open({ mount, lang, design, pieces, speed, page, onPlay, onLessons, onClose, sound })
 *       SenetTour.render() / setDesign(d, p) / stop() / visible() / progress() / PAGES
 * 依存：shared/ruletour.js, senet/engine.js, senet/board2d.js
 */
(function () {
  'use strict';
  const E = () => window.SenetEngine, B = () => window.SenetBoard2D;
  const mqV = matchMedia('(pointer: coarse) and (max-width: 760px) and (orientation: portrait)');
  const vert = () => mqV.matches && (innerHeight - 430) / 11.04 >= (innerWidth - 40) / 11.04 * 1.15;

  /* ---------------- texts (10 languages) ---------------- */
  const TX = {
    ja: {
      'intro.t': 'セネト', 'intro.origin': '古代エジプト', 'intro.players': '2人', 'intro.time': '約20分',
      'intro.hist': '名前は古代エジプト語で「通過」。第1王朝（紀元前3100年頃）の墓から盤の断片が、紀元前2600年頃のヘシの墓には確実な最古の絵が見つかっています。ツタンカーメンの墓にも盤が納められていました。',
      'intro.win': '2人で各5枚。投げ棒の数だけ30マスの逆S字の道を進み、先に全部の駒を盤から上げた方の勝ちです。',
      'intro.cult': '新王国時代には、死者が冥界を通り抜ける旅と重ねられ、『死者の書』第17章には見えない相手と遊ぶ死者が描かれます。正確なルールは残っておらず、ここではケンドールの復元で遊びます。',
      roll: '投げる', pass: 'パス', first: 'まず［投げる］を押そう', pick: '動かす駒をタップ', again: 'もう一度投げられます！',
      noMove: 'その駒は動かせません', own: 'その先には自分の駒がいて止まれません', guard: '2枚並んだ相手の駒は守られていて、入れ替えられません', wall: '3枚並んだ相手の壁は跳び越せません', over26: '26の美の家はちょうどの目で止まる必要があり、越えられません', exitNeed: 'このマスからは決まった目でしか上がれません', notMine: 'それは相手の駒です。手前の糸巻きを動かそう',
      'board.t': '盤と道', 'board.b': '3段×10マスの盤を、1から逆S字に30まで進みます。上段は右へ、中段は左へ、下段はまた右へ。道は2人で共通です。', 'board.k': '道のいちばん最後のマス（30）をタップしよう', 'board.ok': 'そのとおり！30の先が「上がり」です', 'board.ng': '光る道をたどって、最後のマスを探そう',
      'sticks.t': '投げ棒', 'sticks.b': '片面が白い平たい棒を4本投げ、白い面の数だけ進みます（1〜4）。4本とも黒なら 5 です。', 'sticks.k': '［投げる］を押そう', 'sticks.k2': '何マス進めますか？', 'sticks.ok': '正解！全部黒は 5 です', 'sticks.ng': '白い面は0本。全部黒のときは…？',
      'move.t': '駒を進める', 'move.b': 'あなたは糸巻きの駒。出た目の数だけ、1枚を道に沿って進めます。どの駒を動かすかは自分で選べます。', 'move.k': '投げてから、糸巻きを1枚進めよう', 'move.ok': 'いいですね！1回に動かすのは1枚だけです',
      'own.t': '自分の駒には止まれない', 'own.b': '自分の駒がいるマスには止まれません。ほかの駒は跳び越えて進んでかまいません。', 'own.k': '投げてから、動かせる駒を探して進めよう', 'own.ok': 'そのとおり！止まれる駒を選びます',
      'swap.t': '入れ替え', 'swap.b': '相手の駒が1枚だけいるマスに止まると、その駒と入れ替わります。相手はあなたが元いたマスへ下がります。', 'swap.k': '投げてから、相手の円錐と入れ替えよう', 'swap.ok': '入れ替え成功！相手は後ろへ下がりました', 'swap.ng': 'この課題では入れ替えをねらおう',
      'guard.t': '2枚並ぶと守られる', 'guard.b': '同じ色の駒が道の上で2枚以上並んでいると、どちらも入れ替えられません。そのマスには止まれません。', 'guard.k': '投げてから、動かせる駒を進めよう', 'guard.ok': 'そのとおり！並んだ駒には手が出せません',
      'wall.t': '3枚並ぶと壁', 'wall.b': '3枚以上並んだ駒は壁になり、相手はその先へ跳び越せません。自分の壁は跳び越えられます。', 'wall.k': '投げてから、壁にじゃまされない駒を進めよう', 'wall.ok': '正解！壁の手前で足止めされる駒もあります',
      'again.t': '1・4・5 はもう一度', 'again.b': '1・4・5 が出たら、動かしたあとにもう一度投げられます。2・3 なら相手の番です。', 'again.k': '投げて進め、もう一度投げてまた進めよう', 'again.k2': 'もう一度［投げる］！', 'again.ok': 'よくできました！続けて動けると大きく前進できます',
      'beauty.t': '26 美の家', 'beauty.b': 'すべての駒は 26 の美の家に、ちょうどの目で止まってからでないと先へ進めません。美の家の駒は入れ替えられません。', 'beauty.k': '投げてから、美の家へ入ろう', 'beauty.ok': '美の家に到着！ここから出口をめざします',
      'water.t': '27 水の家', 'water.b': '美の家から 1 で進むと水の家に落ち、15 の再生の家（アンクの印）へ戻されます。15 がふさがっていれば、その手前の空きマスへ。', 'water.k': '投げてから、26 の駒を動かしてみよう', 'water.ok': '水に落ちて 15 へ戻りました。1 が出たらできれば別の駒で！', 'water.ng': 'この課題では 26 の駒を動かしてみよう',
      'exit.t': '出口の目で上がる', 'exit.b': '上がりの目は、26 から 5、28 から 3、29 から 2、30 から 1。28〜30 の駒はほかには動けません。', 'exit.k': '投げてから、駒を盤から上げよう', 'exit.ok': '上がり！29 からは 2 で上がれます', 'exit.ng': 'この課題では駒を上げよう',
      'pass.t': '動けなければパス', 'pass.b': '動かせる駒が1枚もなければパスです。ただし 1・4・5 の目なら、パスでももう一度投げられます。', 'pass.k': '投げてみよう', 'pass.k2': '動かせる駒がありません。［パス］を押そう', 'pass.ok': 'パス！28 の駒は 3 が出るまで待ちます',
      'win.t': '勝ち方', 'win.b': '先に自分の駒を全部上げた方の勝ちです。最後の1枚を上げよう！', 'win.k': '投げてから、最後の駒を上げよう', 'win.ok': '全部上がって勝ち！これで遊べます', 'win.ng': '上がれる駒を動かそう',
    },
    en: {
      'intro.t': 'Senet', 'intro.origin': 'Ancient Egypt', 'intro.players': '2', 'intro.time': 'about 20 min',
      'intro.hist': 'Its name means “passing” in ancient Egyptian. Fragments of boards come from First Dynasty tombs (c. 3100 BC), and the earliest certain picture is in the tomb of Hesy (c. 2600 BC). Tutankhamun was buried with senet boards.',
      'intro.win': 'Two players with five pieces each. Move along the 30-square reverse-S track by the throw of the sticks; the first to bear all pieces off wins.',
      'intro.cult': 'By the New Kingdom the game stood for the soul’s passage through the underworld; the Book of the Dead (chapter 17) shows the dead playing an unseen opponent. The exact rules are lost; here you play Kendall’s reconstruction.',
      roll: 'Throw', pass: 'Pass', first: 'Press Throw first', pick: 'Tap a piece to move', again: 'You throw again!',
      noMove: 'That piece cannot move', own: 'Your own piece is there: you cannot stop on it', guard: 'Two rival pieces side by side are protected: no swap', wall: 'Three rival pieces in a row are a wall you cannot jump', over26: 'You must stop exactly on 26, the House of Beauty: no passing it', exitNeed: 'From this square only one throw bears off', notMine: 'That is a rival piece. Move your spools',
      'board.t': 'The board and the track', 'board.b': 'Three rows of ten. You go from 1 to 30 in a reverse S: right on the top row, left in the middle, right again at the bottom. Both players share the track.', 'board.k': 'Tap the last square of the track (30)', 'board.ok': 'Right! Past 30 the pieces go off the board', 'board.ng': 'Follow the glowing track to its last square',
      'sticks.t': 'The throw sticks', 'sticks.b': 'Throw four flat sticks, white on one side. Count the white sides (1–4). If all four are dark, it is 5.', 'sticks.k': 'Press Throw', 'sticks.k2': 'How many squares do you move?', 'sticks.ok': 'Correct! All dark counts as 5', 'sticks.ng': 'No white sides at all. All dark means…?',
      'move.t': 'Moving a piece', 'move.b': 'You play the spools. Move one piece along the track by the number thrown. You choose which piece.', 'move.k': 'Throw, then move one spool', 'move.ok': 'Nice! You move only one piece per throw',
      'own.t': 'Not on your own piece', 'own.b': 'You cannot stop on a square with your own piece. Jumping over pieces on the way is fine.', 'own.k': 'Throw, then find a piece that can move', 'own.ok': 'Right! Choose a piece that can land',
      'swap.t': 'Swapping', 'swap.b': 'Land on a square with a single rival piece and you swap places: it goes back to the square you came from.', 'swap.k': 'Throw, then swap with a rival cone', 'swap.ok': 'Swapped! The rival piece went back', 'swap.ng': 'Go for the swap in this task',
      'guard.t': 'Pairs are protected', 'guard.b': 'Two or more pieces of one colour side by side on the track cannot be swapped. You cannot land on them.', 'guard.k': 'Throw, then move a piece that can move', 'guard.ok': 'Right! A pair is out of reach',
      'wall.t': 'Three make a wall', 'wall.b': 'Three or more in a row make a wall your rival cannot jump past. You may jump your own walls.', 'wall.k': 'Throw, then move a piece the wall does not stop', 'wall.ok': 'Correct! Some pieces are held up behind a wall',
      'again.t': '1, 4 and 5 throw again', 'again.b': 'After a 1, 4 or 5 you move and then throw again. After a 2 or 3 it is your rival’s turn.', 'again.k': 'Throw and move, then throw and move again', 'again.k2': 'Throw again!', 'again.ok': 'Well done! Extra throws carry you far',
      'beauty.t': '26: the House of Beauty', 'beauty.b': 'Every piece must stop exactly on 26, the House of Beauty, before going on. Pieces there cannot be swapped.', 'beauty.k': 'Throw, then enter the House of Beauty', 'beauty.ok': 'In the House of Beauty! Now head for the exits',
      'water.t': '27: the House of Water', 'water.b': 'A 1 from the House of Beauty drops into the water and sends the piece back to 15, the House of Rebirth (the ankh) — or the first free square before it.', 'water.k': 'Throw, then move the piece on 26', 'water.ok': 'Into the water and back to 15. With a 1, move another piece if you can!', 'water.ng': 'Move the piece on 26 in this task',
      'exit.t': 'Bearing off', 'exit.b': 'Bear off from 26 with a 5, from 28 with a 3, from 29 with a 2, from 30 with a 1. Pieces on 28–30 cannot move otherwise.', 'exit.k': 'Throw, then bear a piece off', 'exit.ok': 'Off! From 29 a 2 bears off', 'exit.ng': 'Bear a piece off in this task',
      'pass.t': 'No move: pass', 'pass.b': 'If no piece can move, you pass. But a 1, 4 or 5 still lets you throw again.', 'pass.k': 'Throw', 'pass.k2': 'No piece can move. Press Pass', 'pass.ok': 'Passed! The piece on 28 waits for a 3',
      'win.t': 'How to win', 'win.b': 'The first to bear off all their pieces wins. Bear off your last one!', 'win.k': 'Throw, then bear off your last piece', 'win.ok': 'All off — you win! You are ready to play', 'win.ng': 'Move the piece that can bear off',
    },
    zh: {
      'intro.t': '塞尼特', 'intro.origin': '古埃及', 'intro.players': '2人', 'intro.time': '约20分钟',
      'intro.hist': '名字在古埃及语中意为“通过”。第一王朝（约公元前3100年）墓中发现了棋盘残片，约公元前2600年赫西墓中的壁画是最早确定的图像。图坦卡蒙的墓中也随葬了棋盘。',
      'intro.win': '两人各5枚。按木棒的点数沿30格的反S形道路前进，先把全部棋子移出棋盘者获胜。',
      'intro.cult': '新王国时期，它被视为亡灵穿越冥界之旅；《亡灵书》第17章描绘了亡者与看不见的对手对弈。确切规则已失传，这里采用肯德尔的复原。',
      roll: '投掷', pass: '跳过', first: '先按［投掷］', pick: '点击要走的棋子', again: '可以再投一次！',
      noMove: '这枚棋子不能走', own: '那里有自己的棋子，不能停', guard: '对手两枚相邻的棋子受到保护，不能互换', wall: '对手三枚连成的墙无法越过', over26: '必须恰好停在26美之屋，不能越过', exitNeed: '从这一格只能用特定点数移出', notMine: '那是对手的棋子。请走你的线轴',
      'board.t': '棋盘与道路', 'board.b': '3行×10格，从1到30走反S形：上行向右，中行向左，下行再向右。道路双方共用。', 'board.k': '点击道路的最后一格（30）', 'board.ok': '没错！30之后就是移出', 'board.ng': '沿着发光的道路找最后一格',
      'sticks.t': '投掷木棒', 'sticks.b': '投4根一面白色的扁木棒，白面朝上的数量就是步数（1〜4）。4根全黑则为5。', 'sticks.k': '按［投掷］', 'sticks.k2': '走几格？', 'sticks.ok': '正确！全黑是5', 'sticks.ng': '白面一根也没有。全黑时是…？',
      'move.t': '走棋', 'move.b': '你执线轴。按点数沿道路走一枚棋子，走哪一枚由你决定。', 'move.k': '投掷后，走一枚线轴', 'move.ok': '很好！每次只走一枚',
      'own.t': '不能停在自己的棋子上', 'own.b': '不能停在有自己棋子的格子上。途中越过棋子没有问题。', 'own.k': '投掷后，找出能走的棋子', 'own.ok': '没错！选能落脚的棋子',
      'swap.t': '互换', 'swap.b': '停在只有一枚对手棋子的格子上，就和它互换位置：对手退到你原来的格子。', 'swap.k': '投掷后，与对手的圆锥互换', 'swap.ok': '互换成功！对手退后了', 'swap.ng': '这道题请尝试互换',
      'guard.t': '成对受保护', 'guard.b': '同色棋子在道路上相邻两枚以上时，都不能被互换，也不能停在那里。', 'guard.k': '投掷后，走能走的棋子', 'guard.ok': '没错！成对的棋子碰不得',
      'wall.t': '三枚成墙', 'wall.b': '三枚以上相连成为墙，对手无法越过。自己的墙可以越过。', 'wall.k': '投掷后，走不被墙挡住的棋子', 'wall.ok': '正确！有的棋子会被墙挡住',
      'again.t': '1・4・5 再投', 'again.b': '掷出1、4、5时，走完后还能再投一次。2、3则轮到对手。', 'again.k': '投掷并走棋，再投一次再走', 'again.k2': '再按［投掷］！', 'again.ok': '做得好！连续行动能大步前进',
      'beauty.t': '26 美之屋', 'beauty.b': '所有棋子都必须恰好停在26美之屋后才能继续前进。美之屋的棋子不能被互换。', 'beauty.k': '投掷后，进入美之屋', 'beauty.ok': '到达美之屋！接下来前往出口',
      'water.t': '27 水之屋', 'water.b': '从美之屋走1会落入水中，退回15再生之屋（生命符号）；若15有子，则退到它前面的空格。', 'water.k': '投掷后，走26上的棋子', 'water.ok': '落水退回15。掷出1时尽量走别的棋子！', 'water.ng': '这道题请走26上的棋子',
      'exit.t': '用出口点数移出', 'exit.b': '移出点数：26用5、28用3、29用2、30用1。28〜30的棋子不能做其他移动。', 'exit.k': '投掷后，把棋子移出', 'exit.ok': '移出！29用2就能移出', 'exit.ng': '这道题请移出棋子',
      'pass.t': '无棋可走就跳过', 'pass.b': '没有可走的棋子就跳过。但掷出1、4、5时，跳过后仍可再投。', 'pass.k': '投掷看看', 'pass.k2': '没有可走的棋子。按［跳过］', 'pass.ok': '跳过！28上的棋子要等3',
      'win.t': '胜利条件', 'win.b': '先把自己的棋子全部移出者获胜。移出最后一枚吧！', 'win.k': '投掷后，移出最后一枚', 'win.ok': '全部移出，你赢了！可以开始玩了', 'win.ng': '走能移出的棋子',
    },
    ko: {
      'intro.t': '세네트', 'intro.origin': '고대 이집트', 'intro.players': '2명', 'intro.time': '약 20분',
      'intro.hist': '이름은 고대 이집트어로 “지나감”. 제1왕조(기원전 3100년경) 무덤에서 판의 조각이, 기원전 2600년경 헤시의 무덤에서 가장 오래된 확실한 그림이 발견되었습니다. 투탕카멘의 무덤에도 판이 묻혀 있었습니다.',
      'intro.win': '두 사람이 각 5개. 막대의 수만큼 30칸의 역S자 길을 나아가, 먼저 모든 말을 판에서 내보내면 승리.',
      'intro.cult': '신왕국 시대에는 죽은 이의 영혼이 저승을 지나는 여정으로 여겨졌고, 『사자의 서』 17장에는 보이지 않는 상대와 두는 죽은 이가 그려져 있습니다. 정확한 규칙은 전해지지 않아 켄들의 복원으로 즐깁니다.',
      roll: '던지기', pass: '패스', first: '먼저 ［던지기］를 누르세요', pick: '움직일 말을 탭', again: '한 번 더 던질 수 있어요!',
      noMove: '그 말은 움직일 수 없습니다', own: '그곳엔 내 말이 있어 멈출 수 없습니다', guard: '나란히 선 상대의 말 2개는 보호되어 교체할 수 없습니다', wall: '3개로 이어진 상대의 벽은 넘을 수 없습니다', over26: '26 미의 집에는 정확히 멈춰야 하며 넘을 수 없습니다', exitNeed: '이 칸에서는 정해진 눈으로만 나갈 수 있습니다', notMine: '상대의 말입니다. 실패를 움직이세요',
      'board.t': '판과 길', 'board.b': '3줄×10칸. 1부터 30까지 역S자로 갑니다: 윗줄은 오른쪽, 가운데는 왼쪽, 아랫줄은 다시 오른쪽. 길은 두 사람이 함께 씁니다.', 'board.k': '길의 마지막 칸(30)을 탭하세요', 'board.ok': '맞아요! 30 다음이 “나감”입니다', 'board.ng': '빛나는 길을 따라 마지막 칸을 찾아보세요',
      'sticks.t': '던지는 막대', 'sticks.b': '한쪽이 흰 납작한 막대 4개를 던져 흰 면의 수만큼 나아갑니다(1~4). 모두 검으면 5.', 'sticks.k': '［던지기］를 누르세요', 'sticks.k2': '몇 칸 갈까요?', 'sticks.ok': '정답! 모두 검으면 5', 'sticks.ng': '흰 면이 하나도 없어요. 모두 검으면…?',
      'move.t': '말 움직이기', 'move.b': '당신은 실패 말입니다. 나온 수만큼 말 하나를 길을 따라 움직입니다. 어느 말을 움직일지는 자유.', 'move.k': '던진 뒤 실패 하나를 움직이세요', 'move.ok': '좋아요! 한 번에 하나만 움직입니다',
      'own.t': '내 말 위엔 멈출 수 없음', 'own.b': '내 말이 있는 칸에는 멈출 수 없습니다. 도중에 말을 넘어가는 것은 괜찮습니다.', 'own.k': '던진 뒤 움직일 수 있는 말을 찾으세요', 'own.ok': '맞아요! 멈출 수 있는 말을 고릅니다',
      'swap.t': '교체', 'swap.b': '상대 말이 하나만 있는 칸에 멈추면 자리를 바꿉니다. 상대는 내가 있던 칸으로 물러납니다.', 'swap.k': '던진 뒤 상대 원뿔과 교체하세요', 'swap.ok': '교체 성공! 상대가 뒤로 물러났습니다', 'swap.ng': '이 과제에서는 교체를 노리세요',
      'guard.t': '둘이 나란히면 보호', 'guard.b': '같은 색 말이 길 위에 2개 이상 나란히 있으면 교체할 수 없고, 그 칸에 멈출 수도 없습니다.', 'guard.k': '던진 뒤 움직일 수 있는 말을 움직이세요', 'guard.ok': '맞아요! 짝을 이룬 말은 건드릴 수 없습니다',
      'wall.t': '셋이면 벽', 'wall.b': '3개 이상 나란히 서면 벽이 되어 상대는 넘어갈 수 없습니다. 내 벽은 넘을 수 있습니다.', 'wall.k': '던진 뒤 벽에 막히지 않는 말을 움직이세요', 'wall.ok': '정답! 벽 앞에서 막히는 말도 있습니다',
      'again.t': '1·4·5는 한 번 더', 'again.b': '1·4·5가 나오면 움직인 뒤 한 번 더 던집니다. 2·3이면 상대 차례입니다.', 'again.k': '던져서 움직이고, 다시 던져 또 움직이세요', 'again.k2': '다시 ［던지기］!', 'again.ok': '잘했어요! 연속으로 움직이면 크게 나아갑니다',
      'beauty.t': '26 미의 집', 'beauty.b': '모든 말은 26 미의 집에 정확히 멈춘 뒤에야 앞으로 갈 수 있습니다. 미의 집의 말은 교체할 수 없습니다.', 'beauty.k': '던진 뒤 미의 집으로 들어가세요', 'beauty.ok': '미의 집 도착! 이제 출구로',
      'water.t': '27 물의 집', 'water.b': '미의 집에서 1로 가면 물에 빠져 15 재생의 집(앙크)으로 돌아갑니다. 15가 막혀 있으면 그 앞의 빈칸으로.', 'water.k': '던진 뒤 26의 말을 움직여 보세요', 'water.ok': '물에 빠져 15로! 1이 나오면 되도록 다른 말로', 'water.ng': '이 과제에서는 26의 말을 움직이세요',
      'exit.t': '출구의 눈으로 나가기', 'exit.b': '나가는 눈: 26은 5, 28은 3, 29는 2, 30은 1. 28~30의 말은 다른 곳으로 움직일 수 없습니다.', 'exit.k': '던진 뒤 말을 판에서 내보내세요', 'exit.ok': '나감! 29에서는 2로 나갑니다', 'exit.ng': '이 과제에서는 말을 내보내세요',
      'pass.t': '움직일 수 없으면 패스', 'pass.b': '움직일 말이 없으면 패스. 단 1·4·5라면 패스해도 다시 던집니다.', 'pass.k': '던져 보세요', 'pass.k2': '움직일 말이 없습니다. ［패스］를 누르세요', 'pass.ok': '패스! 28의 말은 3이 나올 때까지 기다립니다',
      'win.t': '승리 조건', 'win.b': '먼저 자기 말을 모두 내보내면 승리. 마지막 하나를 내보내세요!', 'win.k': '던진 뒤 마지막 말을 내보내세요', 'win.ok': '모두 나가서 승리! 이제 즐길 수 있어요', 'win.ng': '나갈 수 있는 말을 움직이세요',
    },
    es: {
      'intro.t': 'Senet', 'intro.origin': 'Antiguo Egipto', 'intro.players': '2', 'intro.time': 'unos 20 min',
      'intro.hist': 'Su nombre significa «paso» en egipcio antiguo. Hay fragmentos de tableros en tumbas de la I dinastía (h. 3100 a. C.), y la imagen segura más antigua está en la tumba de Hesy (h. 2600 a. C.). Tutankamón fue enterrado con tableros de senet.',
      'intro.win': 'Dos jugadores con cinco piezas. Avanza por la pista en S invertida de 30 casillas según los palos; gana quien saque antes todas sus piezas.',
      'intro.cult': 'En el Reino Nuevo representaba el paso del alma por el inframundo; el Libro de los Muertos (cap. 17) muestra al difunto jugando contra un rival invisible. Las reglas exactas se perdieron: aquí juegas la reconstrucción de Kendall.',
      roll: 'Lanzar', pass: 'Pasar', first: 'Primero pulsa Lanzar', pick: 'Toca una pieza', again: '¡Vuelves a lanzar!',
      noMove: 'Esa pieza no puede moverse', own: 'Ahí hay una pieza tuya: no puedes parar', guard: 'Dos piezas rivales juntas están protegidas', wall: 'Tres piezas rivales seguidas son un muro infranqueable', over26: 'Debes parar justo en la 26, la Casa de la Belleza', exitNeed: 'Desde esta casilla solo sale una tirada', notMine: 'Es una pieza rival. Mueve tus carretes',
      'board.t': 'El tablero y la pista', 'board.b': 'Tres filas de diez. Vas de 1 a 30 en S invertida: derecha arriba, izquierda en medio, derecha abajo. La pista es común.', 'board.k': 'Toca la última casilla (30)', 'board.ok': '¡Bien! Tras la 30 las piezas salen', 'board.ng': 'Sigue la pista brillante hasta el final',
      'sticks.t': 'Los palos', 'sticks.b': 'Lanza cuatro palos planos, blancos por un lado. Cuenta los lados blancos (1–4). Si los cuatro son oscuros, es 5.', 'sticks.k': 'Pulsa Lanzar', 'sticks.k2': '¿Cuántas casillas avanzas?', 'sticks.ok': '¡Correcto! Todo oscuro vale 5', 'sticks.ng': 'Ningún lado blanco. Todo oscuro es…',
      'move.t': 'Mover una pieza', 'move.b': 'Juegas con los carretes. Mueve una pieza por la pista tantas casillas como la tirada. Tú eliges cuál.', 'move.k': 'Lanza y mueve un carrete', 'move.ok': '¡Bien! Solo una pieza por tirada',
      'own.t': 'No sobre tu pieza', 'own.b': 'No puedes parar donde tienes una pieza. Saltar piezas por el camino sí está permitido.', 'own.k': 'Lanza y busca una pieza que pueda moverse', 'own.ok': '¡Eso es! Elige una que pueda parar',
      'swap.t': 'Intercambio', 'swap.b': 'Si paras sobre una pieza rival sola, intercambiáis: ella vuelve a tu casilla de salida.', 'swap.k': 'Lanza e intercambia con un cono', 'swap.ok': '¡Intercambio! La pieza rival retrocedió', 'swap.ng': 'En esta tarea busca el intercambio',
      'guard.t': 'Las parejas se protegen', 'guard.b': 'Dos o más piezas de un color juntas en la pista no se pueden intercambiar. No puedes parar en ellas.', 'guard.k': 'Lanza y mueve una pieza que pueda', 'guard.ok': '¡Sí! Una pareja está a salvo',
      'wall.t': 'Tres hacen un muro', 'wall.b': 'Tres o más seguidas forman un muro que el rival no puede saltar. Tus propios muros sí se saltan.', 'wall.k': 'Lanza y mueve una pieza que el muro no frene', 'wall.ok': '¡Correcto! Algunas piezas quedan frenadas',
      'again.t': '1, 4 y 5 repiten', 'again.b': 'Con 1, 4 o 5 mueves y vuelves a lanzar. Con 2 o 3 le toca al rival.', 'again.k': 'Lanza y mueve, luego lanza y mueve otra vez', 'again.k2': '¡Lanza otra vez!', 'again.ok': '¡Bien! Las tiradas extra te llevan lejos',
      'beauty.t': '26: Casa de la Belleza', 'beauty.b': 'Toda pieza debe parar justo en la 26 antes de seguir. Allí no se puede intercambiar.', 'beauty.k': 'Lanza y entra en la Casa de la Belleza', 'beauty.ok': '¡En la Casa de la Belleza! Ahora a las salidas',
      'water.t': '27: Casa del Agua', 'water.b': 'Un 1 desde la 26 cae al agua y devuelve la pieza a la 15, la Casa del Renacer (el anj), o a la primera libre antes.', 'water.k': 'Lanza y mueve la pieza de la 26', 'water.ok': 'Al agua y de vuelta a la 15. ¡Con un 1, mejor mueve otra!', 'water.ng': 'En esta tarea mueve la pieza de la 26',
      'exit.t': 'Sacar piezas', 'exit.b': 'Se sale desde la 26 con 5, la 28 con 3, la 29 con 2 y la 30 con 1. Las piezas en 28–30 no se mueven de otro modo.', 'exit.k': 'Lanza y saca una pieza', 'exit.ok': '¡Fuera! Desde la 29 sale con 2', 'exit.ng': 'En esta tarea saca una pieza',
      'pass.t': 'Sin jugada: pasa', 'pass.b': 'Si ninguna pieza puede moverse, pasas. Pero con 1, 4 o 5 vuelves a lanzar igualmente.', 'pass.k': 'Lanza', 'pass.k2': 'Ninguna pieza puede moverse. Pulsa Pasar', 'pass.ok': '¡Pasas! La pieza de la 28 espera un 3',
      'win.t': 'Cómo ganar', 'win.b': 'Gana quien saque antes todas sus piezas. ¡Saca la última!', 'win.k': 'Lanza y saca tu última pieza', 'win.ok': '¡Todas fuera, ganas! Ya puedes jugar', 'win.ng': 'Mueve la pieza que puede salir',
    },
    fr: {
      'intro.t': 'Senet', 'intro.origin': 'Égypte ancienne', 'intro.players': '2', 'intro.time': 'env. 20 min',
      'intro.hist': 'Son nom signifie « passer » en égyptien ancien. Des fragments de plateaux viennent de tombes de la Ire dynastie (v. 3100 av. J.-C.) et la plus ancienne image sûre est dans la tombe de Hesy (v. 2600 av. J.-C.). Toutânkhamon fut enterré avec des plateaux de senet.',
      'intro.win': 'Deux joueurs, cinq pions chacun. Avancez sur la piste en S inversé de 30 cases selon les bâtonnets ; le premier à sortir tous ses pions gagne.',
      'intro.cult': 'Au Nouvel Empire, le jeu figurait le passage de l’âme dans l’au-delà ; le Livre des Morts (chap. 17) montre le défunt jouant contre un adversaire invisible. Les règles exactes sont perdues : on joue ici la reconstitution de Kendall.',
      roll: 'Lancer', pass: 'Passer', first: 'Appuyez d’abord sur Lancer', pick: 'Touchez un pion', again: 'Vous relancez !',
      noMove: 'Ce pion ne peut pas bouger', own: 'Votre propre pion est là : impossible de s’y arrêter', guard: 'Deux pions adverses côte à côte sont protégés', wall: 'Trois pions adverses alignés forment un mur infranchissable', over26: 'Il faut s’arrêter pile sur 26, la Maison de la Beauté', exitNeed: 'Depuis cette case, un seul lancer fait sortir', notMine: 'C’est un pion adverse. Jouez vos bobines',
      'board.t': 'Le plateau et la piste', 'board.b': 'Trois rangées de dix. On va de 1 à 30 en S inversé : à droite en haut, à gauche au milieu, à droite en bas. La piste est commune.', 'board.k': 'Touchez la dernière case (30)', 'board.ok': 'Oui ! Après 30, les pions sortent', 'board.ng': 'Suivez la piste lumineuse jusqu’au bout',
      'sticks.t': 'Les bâtonnets', 'sticks.b': 'Lancez quatre bâtonnets plats, blancs d’un côté. Comptez les faces blanches (1–4). Si les quatre sont sombres, c’est 5.', 'sticks.k': 'Appuyez sur Lancer', 'sticks.k2': 'De combien de cases avancez-vous ?', 'sticks.ok': 'Exact ! Tout sombre vaut 5', 'sticks.ng': 'Aucune face blanche. Tout sombre, c’est…',
      'move.t': 'Avancer un pion', 'move.b': 'Vous jouez les bobines. Avancez un pion sur la piste du nombre lancé. Vous choisissez lequel.', 'move.k': 'Lancez, puis avancez une bobine', 'move.ok': 'Bien ! Un seul pion par lancer',
      'own.t': 'Pas sur son propre pion', 'own.b': 'On ne s’arrête pas sur une case occupée par son pion. Sauter des pions en route est permis.', 'own.k': 'Lancez, puis trouvez un pion qui peut bouger', 'own.ok': 'Oui ! Choisissez un pion qui peut se poser',
      'swap.t': 'L’échange', 'swap.b': 'Arrêtez-vous sur un pion adverse seul et vous échangez : il recule sur votre case de départ.', 'swap.k': 'Lancez, puis échangez avec un cône', 'swap.ok': 'Échange réussi ! Le pion adverse a reculé', 'swap.ng': 'Cherchez l’échange dans cet exercice',
      'guard.t': 'Les paires sont protégées', 'guard.b': 'Deux pions ou plus d’une couleur côte à côte ne peuvent pas être échangés. On ne peut pas s’y poser.', 'guard.k': 'Lancez, puis jouez un pion qui peut bouger', 'guard.ok': 'Oui ! Une paire est hors d’atteinte',
      'wall.t': 'Trois font un mur', 'wall.b': 'Trois pions ou plus alignés forment un mur que l’adversaire ne peut pas franchir. Ses propres murs se sautent.', 'wall.k': 'Lancez, puis jouez un pion que le mur n’arrête pas', 'wall.ok': 'Exact ! Certains pions restent bloqués',
      'again.t': '1, 4 et 5 : on relance', 'again.b': 'Après un 1, 4 ou 5, on joue puis on relance. Après 2 ou 3, c’est à l’adversaire.', 'again.k': 'Lancez et jouez, puis relancez et jouez encore', 'again.k2': 'Relancez !', 'again.ok': 'Bravo ! Les lancers en plus mènent loin',
      'beauty.t': '26 : Maison de la Beauté', 'beauty.b': 'Chaque pion doit s’arrêter pile sur 26 avant d’aller plus loin. Là, aucun échange n’est possible.', 'beauty.k': 'Lancez, puis entrez dans la Maison de la Beauté', 'beauty.ok': 'Dans la Maison de la Beauté ! Visez les sorties',
      'water.t': '27 : Maison de l’Eau', 'water.b': 'Un 1 depuis 26 tombe à l’eau et renvoie le pion en 15, la Maison de la Renaissance (l’ânkh), ou à la première case libre avant.', 'water.k': 'Lancez, puis jouez le pion en 26', 'water.ok': 'À l’eau, retour en 15. Avec un 1, jouez plutôt un autre pion !', 'water.ng': 'Jouez le pion en 26 dans cet exercice',
      'exit.t': 'Sortir les pions', 'exit.b': 'On sort de 26 avec 5, de 28 avec 3, de 29 avec 2, de 30 avec 1. Les pions en 28–30 ne bougent pas autrement.', 'exit.k': 'Lancez, puis sortez un pion', 'exit.ok': 'Sorti ! Depuis 29, un 2 suffit', 'exit.ng': 'Sortez un pion dans cet exercice',
      'pass.t': 'Aucun coup : on passe', 'pass.b': 'Si aucun pion ne peut bouger, on passe. Mais un 1, 4 ou 5 fait quand même relancer.', 'pass.k': 'Lancez', 'pass.k2': 'Aucun pion ne peut bouger. Appuyez sur Passer', 'pass.ok': 'Passé ! Le pion en 28 attend un 3',
      'win.t': 'Comment gagner', 'win.b': 'Le premier à sortir tous ses pions gagne. Sortez le dernier !', 'win.k': 'Lancez, puis sortez votre dernier pion', 'win.ok': 'Tous sortis : gagné ! Vous pouvez jouer', 'win.ng': 'Jouez le pion qui peut sortir',
    },
    pt: {
      'intro.t': 'Senet', 'intro.origin': 'Egito Antigo', 'intro.players': '2', 'intro.time': 'cerca de 20 min',
      'intro.hist': 'O nome significa “passagem” em egípcio antigo. Há fragmentos de tabuleiros em túmulos da I dinastia (c. 3100 a.C.), e a imagem segura mais antiga está no túmulo de Hesy (c. 2600 a.C.). Tutancâmon foi enterrado com tabuleiros de senet.',
      'intro.win': 'Dois jogadores, cinco peças cada. Avance pela pista em S invertido de 30 casas conforme os bastões; vence quem tirar todas as peças primeiro.',
      'intro.cult': 'No Império Novo o jogo representava a passagem da alma pelo mundo inferior; o Livro dos Mortos (cap. 17) mostra o morto jogando contra um oponente invisível. As regras exatas se perderam: aqui se joga a reconstrução de Kendall.',
      roll: 'Lançar', pass: 'Passar', first: 'Primeiro toque em Lançar', pick: 'Toque numa peça', again: 'Você lança de novo!',
      noMove: 'Essa peça não pode mover', own: 'Há uma peça sua ali: não pode parar', guard: 'Duas peças rivais lado a lado estão protegidas', wall: 'Três peças rivais em fila são um muro intransponível', over26: 'É preciso parar exatamente na 26, a Casa da Beleza', exitNeed: 'Desta casa só um lance faz sair', notMine: 'É uma peça rival. Mova seus carretéis',
      'board.t': 'O tabuleiro e a pista', 'board.b': 'Três fileiras de dez. Vai-se de 1 a 30 em S invertido: direita em cima, esquerda no meio, direita embaixo. A pista é comum.', 'board.k': 'Toque na última casa (30)', 'board.ok': 'Isso! Depois da 30 as peças saem', 'board.ng': 'Siga a pista brilhante até o fim',
      'sticks.t': 'Os bastões', 'sticks.b': 'Lance quatro bastões planos, brancos de um lado. Conte os lados brancos (1–4). Se os quatro forem escuros, vale 5.', 'sticks.k': 'Toque em Lançar', 'sticks.k2': 'Quantas casas você anda?', 'sticks.ok': 'Certo! Tudo escuro vale 5', 'sticks.ng': 'Nenhum lado branco. Tudo escuro é…',
      'move.t': 'Mover uma peça', 'move.b': 'Você joga com os carretéis. Mova uma peça pela pista conforme o lance. Você escolhe qual.', 'move.k': 'Lance e mova um carretel', 'move.ok': 'Boa! Só uma peça por lance',
      'own.t': 'Não sobre sua peça', 'own.b': 'Não se pode parar numa casa com peça sua. Pular peças no caminho é permitido.', 'own.k': 'Lance e encontre uma peça que possa mover', 'own.ok': 'Isso! Escolha uma que possa parar',
      'swap.t': 'Troca', 'swap.b': 'Parando sobre uma peça rival sozinha, vocês trocam de lugar: ela volta para a casa de onde você saiu.', 'swap.k': 'Lance e troque com um cone', 'swap.ok': 'Troca feita! A peça rival recuou', 'swap.ng': 'Nesta tarefa busque a troca',
      'guard.t': 'Pares são protegidos', 'guard.b': 'Duas ou mais peças de uma cor lado a lado não podem ser trocadas. Não se pode parar nelas.', 'guard.k': 'Lance e mova uma peça que possa', 'guard.ok': 'Isso! Um par está protegido',
      'wall.t': 'Três fazem um muro', 'wall.b': 'Três ou mais em fila formam um muro que o rival não pode pular. Os próprios muros podem ser pulados.', 'wall.k': 'Lance e mova uma peça que o muro não pare', 'wall.ok': 'Certo! Algumas peças ficam presas',
      'again.t': '1, 4 e 5 repetem', 'again.b': 'Com 1, 4 ou 5 você move e lança de novo. Com 2 ou 3 é a vez do rival.', 'again.k': 'Lance e mova, depois lance e mova outra vez', 'again.k2': 'Lance de novo!', 'again.ok': 'Muito bem! Lances extras levam longe',
      'beauty.t': '26: Casa da Beleza', 'beauty.b': 'Toda peça deve parar exatamente na 26 antes de seguir. Ali não há troca.', 'beauty.k': 'Lance e entre na Casa da Beleza', 'beauty.ok': 'Na Casa da Beleza! Agora rumo às saídas',
      'water.t': '27: Casa da Água', 'water.b': 'Um 1 a partir da 26 cai na água e manda a peça de volta à 15, a Casa do Renascimento (o ankh), ou à primeira livre antes.', 'water.k': 'Lance e mova a peça da 26', 'water.ok': 'Na água, de volta à 15. Com um 1, mova outra se puder!', 'water.ng': 'Nesta tarefa mova a peça da 26',
      'exit.t': 'Tirar peças', 'exit.b': 'Sai-se da 26 com 5, da 28 com 3, da 29 com 2, da 30 com 1. Peças em 28–30 não se movem de outro jeito.', 'exit.k': 'Lance e tire uma peça', 'exit.ok': 'Fora! Da 29 sai com 2', 'exit.ng': 'Nesta tarefa tire uma peça',
      'pass.t': 'Sem jogada: passe', 'pass.b': 'Se nenhuma peça pode mover, você passa. Mas com 1, 4 ou 5 ainda lança de novo.', 'pass.k': 'Lance', 'pass.k2': 'Nenhuma peça pode mover. Toque em Passar', 'pass.ok': 'Passou! A peça da 28 espera um 3',
      'win.t': 'Como vencer', 'win.b': 'Vence quem tirar todas as peças primeiro. Tire a última!', 'win.k': 'Lance e tire sua última peça', 'win.ok': 'Todas fora: vitória! Você já pode jogar', 'win.ng': 'Mova a peça que pode sair',
    },
    de: {
      'intro.t': 'Senet', 'intro.origin': 'Altes Ägypten', 'intro.players': '2', 'intro.time': 'ca. 20 Min.',
      'intro.hist': 'Der Name bedeutet im Altägyptischen „Vorübergehen“. Brettfragmente stammen aus Gräbern der 1. Dynastie (um 3100 v. Chr.), das älteste sichere Bild aus dem Grab des Hesy (um 2600 v. Chr.). Tutanchamun wurde mit Senet-Brettern bestattet.',
      'intro.win': 'Zwei Spieler mit je fünf Figuren. Je nach Stabwurf geht es über die 30 Felder lange umgekehrte S-Bahn; wer zuerst alle Figuren hinausbringt, gewinnt.',
      'intro.cult': 'Im Neuen Reich stand das Spiel für die Reise der Seele durch die Unterwelt; das Totenbuch (Kap. 17) zeigt den Toten beim Spiel gegen einen unsichtbaren Gegner. Die genauen Regeln sind verloren – hier gilt Kendalls Rekonstruktion.',
      roll: 'Werfen', pass: 'Passen', first: 'Zuerst Werfen drücken', pick: 'Figur antippen', again: 'Du wirfst noch einmal!',
      noMove: 'Diese Figur kann nicht ziehen', own: 'Dort steht deine eigene Figur', guard: 'Zwei gegnerische Figuren nebeneinander sind geschützt', wall: 'Drei gegnerische Figuren in Reihe sind eine unüberwindbare Mauer', over26: 'Auf Feld 26, dem Haus der Schönheit, muss man genau halten', exitNeed: 'Von diesem Feld führt nur ein Wurf hinaus', notMine: 'Das ist eine gegnerische Figur. Ziehe deine Spulen',
      'board.t': 'Brett und Bahn', 'board.b': 'Drei Reihen zu zehn. Es geht von 1 bis 30 im umgekehrten S: oben nach rechts, Mitte nach links, unten wieder rechts. Beide teilen die Bahn.', 'board.k': 'Tippe das letzte Feld der Bahn (30) an', 'board.ok': 'Richtig! Nach 30 geht es hinaus', 'board.ng': 'Folge der leuchtenden Bahn bis zum Ende',
      'sticks.t': 'Die Wurfstäbe', 'sticks.b': 'Wirf vier flache Stäbe, einseitig weiß. Zähle die weißen Seiten (1–4). Sind alle vier dunkel, zählt es 5.', 'sticks.k': 'Werfen drücken', 'sticks.k2': 'Wie viele Felder ziehst du?', 'sticks.ok': 'Richtig! Alles dunkel zählt 5', 'sticks.ng': 'Keine weiße Seite. Alles dunkel heißt…',
      'move.t': 'Eine Figur ziehen', 'move.b': 'Du spielst die Spulen. Ziehe eine Figur so viele Felder wie geworfen. Welche, entscheidest du.', 'move.k': 'Werfen, dann eine Spule ziehen', 'move.ok': 'Gut! Pro Wurf zieht nur eine Figur',
      'own.t': 'Nicht auf die eigene Figur', 'own.b': 'Auf einem Feld mit eigener Figur darfst du nicht halten. Unterwegs Figuren überspringen ist erlaubt.', 'own.k': 'Werfen, dann eine ziehbare Figur finden', 'own.ok': 'Genau! Wähle eine Figur, die halten kann',
      'swap.t': 'Tauschen', 'swap.b': 'Hältst du auf einer einzelnen gegnerischen Figur, tauscht ihr: Sie geht auf dein Ausgangsfeld zurück.', 'swap.k': 'Werfen, dann mit einem Kegel tauschen', 'swap.ok': 'Getauscht! Die gegnerische Figur ging zurück', 'swap.ng': 'Suche in dieser Aufgabe den Tausch',
      'guard.t': 'Paare sind geschützt', 'guard.b': 'Zwei oder mehr gleichfarbige Figuren nebeneinander können nicht getauscht werden. Dort darf man nicht halten.', 'guard.k': 'Werfen, dann eine ziehbare Figur ziehen', 'guard.ok': 'Genau! Ein Paar ist unangreifbar',
      'wall.t': 'Drei sind eine Mauer', 'wall.b': 'Drei oder mehr in Reihe bilden eine Mauer, die der Gegner nicht überspringen kann. Eigene Mauern darf man überspringen.', 'wall.k': 'Werfen, dann eine Figur ziehen, die die Mauer nicht aufhält', 'wall.ok': 'Richtig! Manche Figuren hängen hinter der Mauer fest',
      'again.t': '1, 4 und 5: nochmal', 'again.b': 'Nach 1, 4 oder 5 ziehst du und wirfst noch einmal. Nach 2 oder 3 ist der Gegner dran.', 'again.k': 'Werfen und ziehen, dann noch einmal werfen und ziehen', 'again.k2': 'Noch einmal werfen!', 'again.ok': 'Gut gemacht! Extrawürfe bringen dich weit',
      'beauty.t': '26: Haus der Schönheit', 'beauty.b': 'Jede Figur muss genau auf 26 halten, bevor sie weiterzieht. Dort kann nicht getauscht werden.', 'beauty.k': 'Werfen, dann ins Haus der Schönheit ziehen', 'beauty.ok': 'Im Haus der Schönheit! Jetzt zu den Ausgängen',
      'water.t': '27: Haus des Wassers', 'water.b': 'Eine 1 von 26 fällt ins Wasser und schickt die Figur zurück auf 15, das Haus der Wiedergeburt (Anch), oder das erste freie Feld davor.', 'water.k': 'Werfen, dann die Figur auf 26 ziehen', 'water.ok': 'Ins Wasser, zurück auf 15. Bei einer 1 lieber eine andere Figur ziehen!', 'water.ng': 'Ziehe in dieser Aufgabe die Figur auf 26',
      'exit.t': 'Hinausziehen', 'exit.b': 'Hinaus geht es von 26 mit 5, von 28 mit 3, von 29 mit 2, von 30 mit 1. Figuren auf 28–30 ziehen sonst nicht.', 'exit.k': 'Werfen, dann eine Figur hinausziehen', 'exit.ok': 'Draußen! Von 29 reicht eine 2', 'exit.ng': 'Ziehe in dieser Aufgabe eine Figur hinaus',
      'pass.t': 'Kein Zug: passen', 'pass.b': 'Kann keine Figur ziehen, passt du. Bei 1, 4 oder 5 wirfst du trotzdem noch einmal.', 'pass.k': 'Werfen', 'pass.k2': 'Keine Figur kann ziehen. Passen drücken', 'pass.ok': 'Gepasst! Die Figur auf 28 wartet auf eine 3',
      'win.t': 'So gewinnt man', 'win.b': 'Wer zuerst alle Figuren hinausbringt, gewinnt. Bring die letzte hinaus!', 'win.k': 'Werfen, dann die letzte Figur hinausziehen', 'win.ok': 'Alle draußen – gewonnen! Jetzt kannst du spielen', 'win.ng': 'Ziehe die Figur, die hinaus kann',
    },
    hi: {
      'intro.t': 'सेनेट', 'intro.origin': 'प्राचीन मिस्र', 'intro.players': '2', 'intro.time': 'लगभग 20 मिनट',
      'intro.hist': 'प्राचीन मिस्री में नाम का अर्थ है “पार होना”। पहले राजवंश (लगभग 3100 ई.पू.) की कब्रों से पटल के टुकड़े, और लगभग 2600 ई.पू. हेसी की कब्र में सबसे पुराना निश्चित चित्र मिला है। तूतनख़ामुन के साथ भी सेनेट पटल दफ़नाए गए थे।',
      'intro.win': 'दो खिलाड़ी, हर ओर 5 गोटियाँ। डंडियों के अंक से 30 खानों के उल्टे-S रास्ते पर बढ़ें; जो पहले सारी गोटियाँ बाहर निकाले वह जीतता है।',
      'intro.cult': 'नए राज्य काल में इसे आत्मा की पाताल-यात्रा से जोड़ा गया; मृतकों की पुस्तक (अध्याय 17) में मृतक अदृश्य प्रतिद्वंद्वी से खेलता दिखता है। असली नियम खो गए हैं; यहाँ केंडल का पुनर्निर्माण खेला जाता है।',
      roll: 'फेंकें', pass: 'पास', first: 'पहले फेंकें दबाएँ', pick: 'चलाने के लिए गोटी पर टैप करें', again: 'आप फिर फेंकेंगे!',
      noMove: 'यह गोटी नहीं चल सकती', own: 'वहाँ आपकी अपनी गोटी है, वहाँ नहीं रुक सकते', guard: 'साथ-साथ खड़ी दो विरोधी गोटियाँ सुरक्षित हैं', wall: 'लगातार तीन विरोधी गोटियाँ दीवार हैं, पार नहीं कर सकते', over26: '26, सौंदर्य के घर पर ठीक-ठीक रुकना ज़रूरी है', exitNeed: 'इस खाने से केवल एक ख़ास अंक से बाहर निकलते हैं', notMine: 'यह विरोधी गोटी है। अपनी फिरकी चलाएँ',
      'board.t': 'पटल और रास्ता', 'board.b': 'दस-दस की तीन पंक्तियाँ। 1 से 30 तक उल्टा-S: ऊपर दाएँ, बीच में बाएँ, नीचे फिर दाएँ। रास्ता दोनों का साझा है।', 'board.k': 'रास्ते के आख़िरी खाने (30) पर टैप करें', 'board.ok': 'सही! 30 के बाद गोटी बाहर जाती है', 'board.ng': 'चमकते रास्ते के अंत तक जाएँ',
      'sticks.t': 'फेंकने की डंडियाँ', 'sticks.b': 'एक ओर सफ़ेद चार चपटी डंडियाँ फेंकें। सफ़ेद पक्ष गिनें (1–4)। चारों काली हों तो 5।', 'sticks.k': 'फेंकें दबाएँ', 'sticks.k2': 'कितने खाने चलेंगे?', 'sticks.ok': 'सही! सब काली = 5', 'sticks.ng': 'एक भी सफ़ेद नहीं। सब काली मतलब…',
      'move.t': 'गोटी चलाना', 'move.b': 'आप फिरकी वाली गोटियाँ हैं। फेंक के अंक जितना एक गोटी रास्ते पर चलाएँ। कौन-सी, यह आप चुनें।', 'move.k': 'फेंकें, फिर एक फिरकी चलाएँ', 'move.ok': 'बढ़िया! हर फेंक पर केवल एक गोटी',
      'own.t': 'अपनी गोटी पर नहीं', 'own.b': 'अपनी गोटी वाले खाने पर नहीं रुक सकते। रास्ते में गोटियाँ लाँघना ठीक है।', 'own.k': 'फेंकें, फिर चल सकने वाली गोटी ढूँढें', 'own.ok': 'सही! रुक सकने वाली गोटी चुनें',
      'swap.t': 'अदला-बदली', 'swap.b': 'अकेली विरोधी गोटी वाले खाने पर रुकें तो जगह बदल जाती है: वह आपके पुराने खाने पर लौटती है।', 'swap.k': 'फेंकें, फिर शंकु से अदला-बदली करें', 'swap.ok': 'अदला-बदली! विरोधी पीछे गया', 'swap.ng': 'इस काम में अदला-बदली करें',
      'guard.t': 'जोड़ी सुरक्षित', 'guard.b': 'एक रंग की दो या अधिक गोटियाँ साथ-साथ हों तो अदला-बदली नहीं हो सकती। वहाँ रुक नहीं सकते।', 'guard.k': 'फेंकें, फिर चल सकने वाली गोटी चलाएँ', 'guard.ok': 'सही! जोड़ी पहुँच से बाहर है',
      'wall.t': 'तीन से दीवार', 'wall.b': 'लगातार तीन या अधिक गोटियाँ दीवार बनाती हैं जिसे विरोधी लाँघ नहीं सकता। अपनी दीवार लाँघ सकते हैं।', 'wall.k': 'फेंकें, फिर ऐसी गोटी चलाएँ जिसे दीवार न रोके', 'wall.ok': 'सही! कुछ गोटियाँ दीवार के पीछे रुक जाती हैं',
      'again.t': '1, 4, 5 पर फिर फेंक', 'again.b': '1, 4 या 5 पर चाल के बाद फिर फेंकें। 2 या 3 पर विरोधी की बारी।', 'again.k': 'फेंककर चलें, फिर फेंककर फिर चलें', 'again.k2': 'फिर फेंकें!', 'again.ok': 'शाबाश! अतिरिक्त फेंक दूर तक ले जाती है',
      'beauty.t': '26: सौंदर्य का घर', 'beauty.b': 'हर गोटी को आगे जाने से पहले 26 पर ठीक-ठीक रुकना होता है। वहाँ अदला-बदली नहीं होती।', 'beauty.k': 'फेंकें, फिर सौंदर्य के घर में जाएँ', 'beauty.ok': 'सौंदर्य के घर पहुँचे! अब निकास की ओर',
      'water.t': '27: जल का घर', 'water.b': '26 से 1 पर गोटी पानी में गिरकर 15, पुनर्जन्म के घर (आंख) पर लौटती है — या उससे पहले के पहले खाली खाने पर।', 'water.k': 'फेंकें, फिर 26 की गोटी चलाएँ', 'water.ok': 'पानी में गिरी, 15 पर लौटी। 1 पर हो सके तो दूसरी गोटी चलाएँ!', 'water.ng': 'इस काम में 26 की गोटी चलाएँ',
      'exit.t': 'बाहर निकालना', 'exit.b': '26 से 5, 28 से 3, 29 से 2, 30 से 1 पर बाहर। 28–30 की गोटियाँ और कहीं नहीं चलतीं।', 'exit.k': 'फेंकें, फिर एक गोटी बाहर निकालें', 'exit.ok': 'बाहर! 29 से 2 पर निकलती है', 'exit.ng': 'इस काम में गोटी बाहर निकालें',
      'pass.t': 'चाल नहीं तो पास', 'pass.b': 'कोई गोटी न चल सके तो पास। पर 1, 4 या 5 पर फिर भी दोबारा फेंकते हैं।', 'pass.k': 'फेंकें', 'pass.k2': 'कोई गोटी नहीं चल सकती। पास दबाएँ', 'pass.ok': 'पास! 28 की गोटी 3 का इंतज़ार करती है',
      'win.t': 'जीत कैसे', 'win.b': 'जो पहले सारी गोटियाँ बाहर निकाले वह जीतता है। आख़िरी गोटी निकालें!', 'win.k': 'फेंकें, फिर आख़िरी गोटी निकालें', 'win.ok': 'सब बाहर — आप जीते! अब खेल सकते हैं', 'win.ng': 'बाहर निकल सकने वाली गोटी चलाएँ',
    },
    ar: {
      'intro.t': 'سينيت', 'intro.origin': 'مصر القديمة', 'intro.players': '2', 'intro.time': 'نحو 20 دقيقة',
      'intro.hist': 'يعني الاسم «العبور» بالمصرية القديمة. وُجدت أجزاء ألواح في مقابر الأسرة الأولى (نحو 3100 ق.م)، وأقدم صورة مؤكدة في مقبرة حسي (نحو 2600 ق.م). ودُفنت ألواح سينيت مع توت عنخ آمون.',
      'intro.win': 'لاعبان لكل منهما خمس قطع. تتقدم على مسار من 30 مربعًا على شكل S معكوس بحسب العصيّ؛ يفوز من يُخرج كل قطعه أولًا.',
      'intro.cult': 'في الدولة الحديثة صارت اللعبة رمزًا لعبور الروح العالم السفلي؛ ويصوّر كتاب الموتى (الفصل 17) الميت يلعب ضد خصم غير مرئي. القواعد الدقيقة مفقودة، ونلعب هنا إعادة بناء كيندال.',
      roll: 'ارمِ', pass: 'تمرير', first: 'اضغط «ارمِ» أولًا', pick: 'المس قطعة لتحريكها', again: 'ترمي مرة أخرى!',
      noMove: 'لا يمكن تحريك هذه القطعة', own: 'هناك قطعة لك، لا يمكنك التوقف عليها', guard: 'قطعتان متجاورتان للخصم محميتان', wall: 'ثلاث قطع متتالية للخصم جدار لا يُعبر', over26: 'يجب التوقف تمامًا على 26، بيت الجمال', exitNeed: 'من هذا المربع رمية واحدة فقط تُخرج القطعة', notMine: 'هذه قطعة الخصم. حرّك بكراتك',
      'board.t': 'اللوح والمسار', 'board.b': 'ثلاثة صفوف من عشرة. من 1 إلى 30 على شكل S معكوس: يمينًا في الأعلى، يسارًا في الوسط، يمينًا في الأسفل. المسار مشترك.', 'board.k': 'المس آخر مربع في المسار (30)', 'board.ok': 'صحيح! بعد 30 تخرج القطع', 'board.ng': 'اتبع المسار المضيء حتى نهايته',
      'sticks.t': 'عصيّ الرمي', 'sticks.b': 'ارمِ أربع عصيّ مسطحة بيضاء من جهة. عُدّ الوجوه البيضاء (1–4). إن كانت الأربع داكنة فهي 5.', 'sticks.k': 'اضغط «ارمِ»', 'sticks.k2': 'كم مربعًا تتقدم؟', 'sticks.ok': 'صحيح! الكل داكن يساوي 5', 'sticks.ng': 'لا وجه أبيض. الكل داكن يعني…',
      'move.t': 'تحريك قطعة', 'move.b': 'أنت تلعب بالبكرات. حرّك قطعة واحدة على المسار بعدد الرمية. أنت تختار أيها.', 'move.k': 'ارمِ ثم حرّك بكرة', 'move.ok': 'أحسنت! قطعة واحدة في كل رمية',
      'own.t': 'ليس على قطعتك', 'own.b': 'لا يمكنك التوقف على مربع فيه قطعتك. القفز فوق القطع في الطريق مسموح.', 'own.k': 'ارمِ ثم ابحث عن قطعة يمكنها التحرك', 'own.ok': 'صحيح! اختر قطعة يمكنها التوقف',
      'swap.t': 'التبادل', 'swap.b': 'إذا توقفت على قطعة منفردة للخصم تتبادلان المكان: تعود إلى المربع الذي جئت منه.', 'swap.k': 'ارمِ ثم بادل مخروطًا', 'swap.ok': 'تم التبادل! عادت قطعة الخصم', 'swap.ng': 'ابحث عن التبادل في هذه المهمة',
      'guard.t': 'الأزواج محمية', 'guard.b': 'قطعتان أو أكثر من لون واحد متجاورتان على المسار لا تُبادلان، ولا يمكن التوقف عليهما.', 'guard.k': 'ارمِ ثم حرّك قطعة يمكنها التحرك', 'guard.ok': 'صحيح! الزوج بعيد المنال',
      'wall.t': 'ثلاث تصنع جدارًا', 'wall.b': 'ثلاث قطع أو أكثر متتالية تصنع جدارًا لا يعبره الخصم. يمكنك عبور جدرانك.', 'wall.k': 'ارمِ ثم حرّك قطعة لا يوقفها الجدار', 'wall.ok': 'صحيح! بعض القطع تعلق خلف الجدار',
      'again.t': '1 و4 و5 رمية إضافية', 'again.b': 'بعد 1 أو 4 أو 5 تتحرك ثم ترمي مجددًا. بعد 2 أو 3 يأتي دور الخصم.', 'again.k': 'ارمِ وتحرك، ثم ارمِ وتحرك ثانية', 'again.k2': 'ارمِ مجددًا!', 'again.ok': 'أحسنت! الرميات الإضافية تأخذك بعيدًا',
      'beauty.t': '26: بيت الجمال', 'beauty.b': 'يجب أن تتوقف كل قطعة تمامًا على 26 قبل أن تتابع. لا تبادل هناك.', 'beauty.k': 'ارمِ ثم ادخل بيت الجمال', 'beauty.ok': 'في بيت الجمال! الآن نحو المخارج',
      'water.t': '27: بيت الماء', 'water.b': 'الرمية 1 من 26 تُسقط القطعة في الماء وتعيدها إلى 15، بيت البعث (العنخ)، أو أول مربع فارغ قبله.', 'water.k': 'ارمِ ثم حرّك القطعة على 26', 'water.ok': 'سقطت في الماء وعادت إلى 15. مع 1 حرّك قطعة أخرى إن أمكن!', 'water.ng': 'حرّك القطعة على 26 في هذه المهمة',
      'exit.t': 'إخراج القطع', 'exit.b': 'تخرج من 26 بـ5، ومن 28 بـ3، ومن 29 بـ2، ومن 30 بـ1. قطع 28–30 لا تتحرك بغير ذلك.', 'exit.k': 'ارمِ ثم أخرج قطعة', 'exit.ok': 'خرجت! من 29 تكفي 2', 'exit.ng': 'أخرج قطعة في هذه المهمة',
      'pass.t': 'لا حركة: تمرير', 'pass.b': 'إن لم تتحرك أي قطعة تمرّر. لكن مع 1 أو 4 أو 5 ترمي مجددًا مع ذلك.', 'pass.k': 'ارمِ', 'pass.k2': 'لا قطعة تتحرك. اضغط «تمرير»', 'pass.ok': 'تمرير! قطعة 28 تنتظر 3',
      'win.t': 'طريقة الفوز', 'win.b': 'يفوز من يُخرج كل قطعه أولًا. أخرج الأخيرة!', 'win.k': 'ارمِ ثم أخرج قطعتك الأخيرة', 'win.ok': 'خرجت كلها — فزت! أنت جاهز للعب', 'win.ng': 'حرّك القطعة التي يمكنها الخروج',
    },
  };
  let O = { lang: 'ja', design: 'tut', pieces: 'tut', speed: 1 };
  const lang = () => { const l = typeof O.lang === 'function' ? O.lang() : O.lang; return TX[l] ? l : 'en'; };
  const T = (k, v) => { let x = (TX[lang()] || TX.en)[k]; if (x === undefined) x = TX.en[k]; if (x === undefined) return k; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
  const snd = k => { try { O.sound && O.sound(k); } catch (e) {} };
  const ST = (a, b) => ({ rule: 'std', pos: [a.slice(), b.slice()], turn: 0, winner: -1 });
  const sq = i => { const [r, c] = B().sqRC(i); return { r, c }; };
  const PAT = n => { const a = [0, 0, 0, 0]; if (n < 5) { const ix = [0, 1, 2, 3].sort(() => Math.random() - .5); for (let i = 0; i < n; i++) a[ix[i]] = 1; } return a; };
  const ASPECT = () => vert() ? 0.44 : 2.25;

  const CSS = `
.rt-intro-hero img.snt-hero{width:min(260px,44vw);height:auto;aspect-ratio:1080/380;border-radius:8px}
.snt{width:100%;height:100%;display:flex;flex-direction:column;align-items:stretch;gap:2%;direction:ltr}
.snt-b{flex:1 1 auto;min-height:0;display:flex;justify-content:center}
.snt-b > svg{width:100%;height:100%}
.snt-dr{flex:0 0 18%;min-height:0;display:flex;align-items:center;justify-content:center;gap:12px}
.snt-d{height:100%;aspect-ratio:260/140;max-width:46%}
.snt-btn{flex:none;white-space:nowrap;padding:7px 18px;border-radius:10px;border:0;background:linear-gradient(180deg,#e9cf8e,#c9a961);color:#14100a;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
.snt-btn:disabled{opacity:.35;cursor:default}
.snt-btn.snt-pass{background:linear-gradient(180deg,#8fd6e2,#3d9fb0);color:#06222a}
.snt-n{flex:none;min-width:2.2em;direction:ltr;unicode-bidi:isolate;font:700 22px/1 'Cormorant Garamond',Georgia,serif;color:var(--accent,#e2c275);text-align:center}
.snt-choice{display:flex;gap:8px;justify-content:center;margin:6px 0 0;flex-wrap:wrap}
.rt-row .snt-choice{justify-content:flex-start}
.snt-choice button{min-width:44px;padding:6px 12px;border-radius:10px;border:1px solid var(--line,rgba(255,255,255,.2));background:rgba(255,255,255,.06);color:var(--text,#eee);font:700 16px/1.2 inherit;cursor:pointer}
.snt-choice button:hover{background:rgba(255,255,255,.12)}
.snt.snt-v{gap:6px}.snt.snt-v .snt-dr{flex:0 0 52px;gap:8px}
@media (hover: hover) and (pointer: fine) and (min-width: 820px){.snt-btn{font-size:16px;padding:9px 22px}.snt-n{font-size:28px}}
@media (max-width: 520px){.snt-btn{padding:6px 12px;font-size:13.5px}.snt-n{font-size:19px}.snt-dr{gap:8px}}
`;
  function injectCss() { if (!document.getElementById('sntCss')) { const s = document.createElement('style'); s.id = 'sntCss'; s.textContent = CSS; document.head.appendChild(s); } }

  /* ---------------- a small interactive turn on the real board ---------------- */
  // cfg: { s, rolls:[n,…], marks(s, ctl), noDice, check(m, ctl) → message|null, onMove(m, again, ctl), onRoll(n, ctl) → false (stop), onPass(ctl), onCell(sq, ctl) }
  function game(api, cfg) {
    const host = api.board, V = vert();
    host.innerHTML = `<div class="snt${V ? ' snt-v' : ''}" dir="ltr"><div class="snt-b"></div><div class="snt-dr"${cfg.noDice ? ' style="visibility:hidden"' : ''}><div class="snt-d"></div><span class="snt-n"></span><button type="button" class="snt-btn">${T('roll')}</button></div></div>`;
    const view = B().mount(host.querySelector('.snt-b'), { orient: V ? 'v' : 'h', design: O.design, pieces: O.pieces, speed: O.speed, trays: !!cfg.trays, trayLabel: () => '' });
    const dc = B().dice(host.querySelector('.snt-d'), { style: O.pieces });
    const btn = host.querySelector('.snt-btn'), nEl = host.querySelector('.snt-n');
    const ctl = { s: E().clone(cfg.s), n: null, phase: cfg.noDice ? 'none' : 'roll', k: 0, busy: false, view, extra: [] };
    ctl.s.turn = 0;
    const moves = () => ctl.n ? E().legalMoves(ctl.s, ctl.n) : [];
    const draw = (opt = {}) => {
      const marks = (cfg.marks ? cfg.marks(ctl.s, ctl) : []).concat(ctl.extra);
      const targets = ctl.phase === 'move' ? moves().map(m => m.finish ? null : Object.assign(sq(m.to), { capture: m.capture, water: m.water })).filter(Boolean) : [];
      view.render(ctl.s, Object.assign({ marks, last: ctl.last || null, targets }, opt));
      btn.textContent = ctl.phase === 'pass' ? T('pass') : T('roll');
      btn.classList.toggle('snt-pass', ctl.phase === 'pass');
      btn.disabled = !(ctl.phase === 'roll' || ctl.phase === 'pass');
      btn.style.visibility = ctl.phase === 'none' || ctl.phase === 'done' ? 'hidden' : '';
    };
    ctl.draw = draw;
    dc.show([0, 0, 0, 0]);
    async function roll() {
      if (ctl.phase !== 'roll' || ctl.busy || !api.alive()) return;
      ctl.busy = true; btn.disabled = true; nEl.textContent = ''; snd('roll');
      const n = cfg.rolls[Math.min(ctl.k, cfg.rolls.length - 1)]; ctl.k++;
      await dc.roll(PAT(n), { speed: O.speed });
      if (!api.alive()) return;
      ctl.busy = false; ctl.n = n; nEl.textContent = '= ' + n;
      if (cfg.onRoll && cfg.onRoll(n, ctl) === false) { draw(); return; }
      ctl.phase = moves().length ? 'move' : 'pass';
      api.say(ctl.phase === 'move' ? T('pick') : '', '');
      draw();
    }
    ctl.roll = roll;
    btn.onclick = () => { if (ctl.phase === 'pass') { if (cfg.onPass) cfg.onPass(ctl); } else roll(); };
    const why = from => {
      const s = ctl.s, n = ctl.n, to = from + n, b = E().board(s);
      if (from >= 28 || (from === 26 && n !== 5 && n !== 1 && b[26 + n] >= 0 && b[26 + n] !== 0)) return T('exitNeed');
      if (from < 26 && to > 26) return T('over26');
      for (let q = from + 1; q < to; q++) if (b[q] === 1) { let a = q, z = q; while (b[a - 1] === 1) a--; while (b[z + 1] === 1) z++; if (z - a + 1 >= 3) return T('wall'); }
      if (b[to] === 0) return T('own');
      if (b[to] === 1) return T('guard');
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
      await view.animateMove(0, m.from, m.to, { capture: m.capture, dest: m.water ? m.dest : undefined, speed: O.speed });
      if (!api.alive()) return;
      const r = E().apply(ctl.s, m); ctl.s = r.state; ctl.s.turn = 0; ctl.busy = false; ctl.n = null;
      ctl.last = { from: sq(m.from), to: m.finish ? null : sq(m.water ? m.dest : m.to) };
      ctl.phase = r.again && r.state.winner < 0 ? 'roll' : 'done';
      draw();
      cfg.onMove(m, r.again, ctl);
    }
    view.on('cell', ({ sq: i }) => {
      if (cfg.onCell) { cfg.onCell(i, ctl); return; }
      if (ctl.s.pos[0].includes(i)) { tryFrom(i); return; }
      if (ctl.phase === 'move') { const m = moves().find(x => x.to === i); if (m) { tryFrom(m.from); return; } }
      if (ctl.phase === 'roll') { api.ng(T('first'), { reset: false }); return; }
      if (ctl.phase === 'move' && ctl.s.pos[1].includes(i)) api.ng(T('notMine'), { reset: false });
    });
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
  const glow = (i, color) => Object.assign(sq(i), { type: 'glow', color });

  /* ---------------- pages ---------------- */
  const PH = {};
  const PAGES = [
    { id: 'board', setup(api) {
        let done = false;
        run(api, { s: ST([], []), noDice: true, rolls: [1],
          marks: () => [{ type: 'path', from: 1, to: 30 }].concat(done ? [glow(30, '#3df59a')] : []),
          onCell(i, ctl) { if (done) return; if (i === 30) { done = true; ctl.draw(); api.ok(T('board.ok')); } else api.ng(T('board.ng'), { reset: false }); } });
      } },
    { id: 'sticks', setup(api) {
        PH.sticks = 0;
        const ctl = run(api, { s: ST([1, 3, 5], [2, 4, 6]), rolls: [5],
          onRoll(n) {
            PH.sticks = 1;
            api.setTask(`<div class="snt-choice" data-noswipe>${[1, 2, 3, 4, 5].map(k => `<button type="button" data-snt-n="${k}">${k}</button>`).join('')}</div>`);
            const tk = api.board.closest('.rt').querySelector('.rt-task');
            tk.onclick = e => {
              const b = e.target.closest('[data-snt-n]'); if (!b || !api.alive() || PH.sticks === 2) return;
              if (+b.dataset.sntN === n) { PH.sticks = 2; api.setTask(''); api.ok(T('sticks.ok')); }
              else api.ng(T('sticks.ng'), { reset: false });
            };
            ctl.phase = 'shown';
            return false;
          } });
      } },
    { id: 'move', setup(api) { run(api, { s: ST([1, 3, 5], [12, 20]), rolls: [3], onMove() { api.ok(T('move.ok')); } }); } },
    { id: 'own', setup(api) { run(api, { s: ST([4, 6, 8], [15]), rolls: [2], onMove() { api.ok(T('own.ok')); } }); } },
    { id: 'swap', setup(api) {
        run(api, { s: ST([5, 2], [8, 14]), rolls: [3], check: m => m.capture ? null : T('swap.ng'), onMove() { api.ok(T('swap.ok')); } });
      } },
    { id: 'guard', setup(api) {
        run(api, { s: ST([3, 9], [6, 7, 20]), rolls: [3], marks: () => [Object.assign(sq(6), { type: 'safe' }), Object.assign(sq(7), { type: 'safe' })], onMove() { api.ok(T('guard.ok')); } });
      } },
    { id: 'wall', setup(api) {
        run(api, { s: ST([4, 11], [6, 7, 8, 25]), rolls: [5], marks: () => [6, 7, 8].map(i => glow(i, '#ff9b7a')), onMove() { api.ok(T('wall.ok')); } });
      } },
    { id: 'again', setup(api) {
        PH.again = 0;
        run(api, { s: ST([3, 12], [20]), rolls: [4, 2],
          onMove(m, again) { if (again) { PH.again = 1; api.setTask(T('again.k2')); api.say(T('again'), 'ok'); snd('ok'); } else api.ok(T('again.ok')); } });
      } },
    { id: 'beauty', setup(api) {
        run(api, { s: ST([23, 24], [10]), rolls: [3], marks: () => [glow(26)], onMove() { api.ok(T('beauty.ok')); } });
      } },
    { id: 'water', setup(api) {
        run(api, { s: ST([26, 20], [12]), rolls: [1], marks: () => [glow(27, '#4da3ff'), glow(15, '#ffe27a')],
          check: m => m.from === 26 ? null : T('water.ng'), onMove() { curCtl.phase = 'done'; curCtl.draw(); api.ok(T('water.ok')); } });
      } },
    { id: 'exit', setup(api) {
        run(api, { s: ST([29, 28], [18]), rolls: [2], trays: true, marks: () => [glow(28), glow(29), glow(30)], check: m => m.finish ? null : T('exit.ng'), onMove() { api.ok(T('exit.ok')); } });
      } },
    { id: 'pass', setup(api) {
        PH.pass = 0;
        run(api, { s: ST([28], [18]), rolls: [2], trays: true,
          onRoll(n, ctl) { PH.pass = 1; ctl.phase = 'pass'; api.setTask(T('pass.k2')); api.say(''); return false; },
          onPass(ctl) { ctl.phase = 'done'; ctl.draw(); api.ok(T('pass.ok')); } });
      } },
    { id: 'win', setup(api) {
        run(api, { s: ST([30, 31, 31, 31, 31], [12, 22, 31, 31, 31]), rolls: [1], trays: true, check: m => m.finish ? null : T('win.ng'), onMove() { api.ok(T('win.ok')); } });
      } },
  ];
  const taskOf = id => () => {
    if (id === 'sticks') return PH.sticks === 1 ? T('sticks.k2') : T('sticks.k');
    if (id === 'again') return PH.again ? T('again.k2') : T('again.k');
    if (id === 'pass') return PH.pass ? T('pass.k2') : T('pass.k');
    return T(id + '.k');
  };
  const ALL = PAGES.map(P => Object.assign({ title: () => T(P.id + '.t'), body: () => `<p>${T(P.id + '.b')}</p>`, task: taskOf(P.id), teardown }, P));
  ALL.unshift({ id: 'intro', title: () => T('intro.t'), body: '', html: () => RuleTour.intro({ lang: lang(), img: B().boardHref(O.design || 'tut', 'h'), origin: T('intro.origin'), players: T('intro.players'), time: T('intro.time'), history: T('intro.hist'), win: T('intro.win'), culture: T('intro.cult') }).replace('<img ', '<img class="snt-hero" ') });

  /* ---------------- entry ---------------- */
  let tour = null, mountEl = null;
  function ensure(mount) {
    const el = typeof mount === 'string' ? document.querySelector(mount) : mount;
    if (tour && el === mountEl) return tour;
    injectCss(); mountEl = el;
    tour = RuleTour.create({
      mount: el, store: 'aicoding-senet-rules', lang, pages: ALL, aspect: ASPECT,
      close: () => { teardown(); O.onClose && O.onClose(); },
      play: O.onPlay ? () => { teardown(); O.onPlay(); } : null,
      lessons: O.onLessons ? () => { teardown(); O.onLessons(); } : null,
      sound: k => snd(k),
    });
    return tour;
  }
  let lastV = vert();
  const reorient = () => { const v = vert(); if (v === lastV) return; lastV = v; if (tour && tour.visible()) { teardown(); tour.open(tour.page); } };
  if (mqV.addEventListener) mqV.addEventListener('change', reorient); addEventListener('resize', reorient);
  let opened = false;
  const SenetTour = {
    open(o = {}) {
      Object.assign(O, o);
      if (!o.onPlay && !O.onPlay) O.onPlay = null;
      const t = ensure(o.mount || mountEl || '#rulesBody');
      t.open(o.page != null ? o.page : opened ? t.page : 0); opened = true;
      return t;
    },
    render() { if (tour && tour.visible()) tour.open(tour.page); },
    setDesign(d, p) { if (d) O.design = d; if (p) O.pieces = p; SenetTour.render(); },
    stop() { teardown(); if (tour) tour.stop(); },
    visible() { return !!(tour && tour.visible()); },
    progress() { return tour ? tour.progress() : { done: 0, total: ALL.length + 1 }; },
    PAGES: ALL.map(p => p.id).concat(['_finish']),
    _T: T, _TX: TX,
  };
  window.SenetTour = SenetTour;
})();
