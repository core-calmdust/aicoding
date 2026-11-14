/* =====================================================================
   Futebol de Botão — rules course on the 3D table (atlas/models/botao.js), told by Tampinha (the little creature riding a
   disc: "tampinha" = a bottle cap, what the first Brazilian players flicked before buttons).
   Pages: the ball (tap it), a flick (pick your button, pull, let go — the game's own hand), the touches (12 a possession,
   3 in a row a button: pass to a team-mate's zone), losing the ball (watch: a flick into an opponent's button first is a
   foul), the shot (declare, then score past the keeper), defending (set your keeper on the shot's line), restarts (watch:
   over the side line = a throw-in), how a match is won.
   Flicks are helped a little (an aim within 12° of the page's line is set on it, the power too).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }   ctx = { el, Table3D, lang, panel, onStart(), onExit() }
   Opening the course sets aicoding-botao-rules-seen.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/disc-1.webp';
  const UI = {
    ja: { name: 'タンピーニャ', next: 'つぎへ', back: 'もどる', start: '試合してみる', again: 'もういちど', tapIt: '盤の上でやってみよう', watch: 'タップしてお手本', origin: 'ブラジル', players: '2人', time: '公式は前後半 各10分', ready: '構えOK' },
    en: { name: 'Tampinha', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tapIt: 'Try it on the table', watch: 'Tap to watch', origin: 'Brazil', players: '2 players', time: 'officially 2 × 10 min', ready: 'Ready' },
    zh: { name: '小瓶盖', next: '下一步', back: '返回', start: '来比一场', again: '再来一次', tapIt: '在球台上试试', watch: '点击看示范', origin: '巴西', players: '2人', time: '正式比赛上下半场各10分钟', ready: '准备好了' },
    'zh-TW': { name: '小瓶蓋', next: '下一步', back: '返回', start: '來比一場', again: '再一次', tapIt: '在球台上試試', watch: '點一下看示範', origin: '巴西', players: '2人', time: '正式比賽上下半場各10分鐘', ready: '準備好了' },
    ko: { name: '탐피냐', next: '다음', back: '이전', start: '시합하기', again: '다시', tapIt: '테이블에서 해 봐', watch: '탭해서 시범 보기', origin: '브라질', players: '2명', time: '공식은 전후반 각 10분', ready: '준비 완료' },
    es: { name: 'Tampinha', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tapIt: 'Pruébalo en la mesa', watch: 'Toca para verlo', origin: 'Brasil', players: '2 jugadores', time: 'oficial: 2 × 10 min', ready: 'Listo' },
    fr: { name: 'Tampinha', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tapIt: 'Essaie sur la table', watch: 'Touche pour voir', origin: 'Brésil', players: '2 joueurs', time: 'officiel : 2 × 10 min', ready: 'Prêt' },
    pt: { name: 'Tampinha', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tapIt: 'Tente na mesa', watch: 'Toque para ver', origin: 'Brasil', players: '2 jogadores', time: 'oficial: 2 × 10 min', ready: 'Pronto' },
    de: { name: 'Tampinha', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tapIt: 'Probier es am Tisch', watch: 'Tippen zum Zuschauen', origin: 'Brasilien', players: '2 Spieler', time: 'offiziell 2 × 10 Min.', ready: 'Bereit' },
    ru: { name: 'Тампинья', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tapIt: 'Попробуй на столе', watch: 'Нажми, чтобы посмотреть', origin: 'Бразилия', players: '2 игрока', time: 'официально 2 тайма по 10 мин', ready: 'Готово' },
    tr: { name: 'Tampinha', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tapIt: 'Masada dene', watch: 'İzlemek için dokun', origin: 'Brezilya', players: '2 oyuncu', time: 'resmî maç 2 × 10 dk', ready: 'Hazır' },
    id: { name: 'Tampinha', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tapIt: 'Coba di meja', watch: 'Ketuk untuk melihat', origin: 'Brasil', players: '2 pemain', time: 'resminya 2 × 10 menit', ready: 'Siap' },
    hi: { name: 'टैम्पिन्या', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tapIt: 'मेज़ पर करके देखो', watch: 'देखने के लिए छुओ', origin: 'ब्राज़ील', players: '2 खिलाड़ी', time: 'आधिकारिक: 2 × 10 मिनट', ready: 'तैयार' },
    ar: { name: 'تامبينيا', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tapIt: 'جرّب على الطاولة', watch: 'المس لتشاهد', origin: 'البرازيل', players: 'لاعبان', time: 'رسميًا شوطان × 10 دقائق', ready: 'جاهز' },
  };
  const HELLO = {
    ja: 'オラ！ びんのフタに乗ってきた<b>タンピーニャ</b>だよ。<b>フチボウ・ジ・ボタン</b>はブラジル生まれの<b>ボタンのサッカー</b>。ボタンを指ではじいてボールを運び、<b>相手のゴールに入れたら1点</b>。昔はびんのフタやシャツのボタンで遊んだんだ！',
    en: 'Olá! I’m <b>Tampinha</b> — I rode in on a bottle cap. <b>Futebol de botão</b> is Brazil’s <b>button football</b>: flick your buttons to move the ball and <b>score in the far goal</b>. Long ago it was played with bottle caps and shirt buttons!',
    zh: 'Olá！我是坐着瓶盖来的<b>小瓶盖</b>。<b>纽扣足球</b>是巴西诞生的<b>用纽扣踢的足球</b>：用手指弹纽扣带球，<b>把球送进对方球门得1分</b>。以前人们用瓶盖和衬衫纽扣来玩呢！',
    'zh-TW': 'Olá！我是坐著瓶蓋來的<b>小瓶蓋</b>。<b>鈕扣足球</b>是巴西誕生的<b>用鈕扣踢的足球</b>：用手指彈鈕扣帶球，<b>把球送進對方球門得1分</b>。以前大家用瓶蓋和襯衫鈕扣來玩喔！',
    ko: '올라! 병뚜껑을 타고 온 <b>탐피냐</b>야. <b>푸치보우 지 보탕</b>은 브라질에서 태어난 <b>단추 축구</b>. 단추를 손가락으로 튕겨 공을 몰고, <b>상대 골에 넣으면 1점</b>. 옛날엔 병뚜껑이나 셔츠 단추로 놀았대!',
    es: '¡Olá! Soy <b>Tampinha</b> y llegué montada en una chapita. El <b>futebol de botão</b> es el <b>fútbol de botones</b> de Brasil: golpea tus botones para llevar la pelota y <b>mete gol en la portería rival</b>. ¡Antes se jugaba con chapas y botones de camisa!',
    fr: 'Olá ! Je suis <b>Tampinha</b>, arrivée sur une capsule. Le <b>futebol de botão</b> est le <b>football de boutons</b> du Brésil : pichenette tes boutons pour mener la balle et <b>marque dans le but adverse</b>. Autrefois on jouait avec des capsules et des boutons de chemise !',
    pt: 'Olá! Eu sou a <b>Tampinha</b> — cheguei montada numa tampinha de garrafa. O <b>futebol de botão</b> é o futebol jogado com botões: toque os botões para levar a bola e <b>faça gol no adversário</b>. Antigamente era com tampinhas e botões de camisa!',
    de: 'Olá! Ich bin <b>Tampinha</b> und kam auf einem Kronkorken angeritten. <b>Futebol de botão</b> ist Brasiliens <b>Knopffußball</b>: Schnipp deine Knöpfe, treib den Ball und <b>triff ins gegnerische Tor</b>. Früher spielte man mit Kronkorken und Hemdknöpfen!',
    ru: 'Ола! Я <b>Тампинья</b>, прикатила на крышечке от бутылки. <b>Футебол ди ботан</b> — бразильский <b>пуговичный футбол</b>: щёлкай пуговицы, веди мяч и <b>забей в чужие ворота</b>. Раньше играли крышечками и пуговицами от рубашек!',
    tr: 'Olá! Ben bir şişe kapağına binip gelen <b>Tampinha</b>. <b>Futebol de botão</b> Brezilya’nın <b>düğme futbolu</b>: düğmelerine fiske vurup topu taşı ve <b>rakip kaleye gol at</b>. Eskiden şişe kapakları ve gömlek düğmeleriyle oynanırmış!',
    id: 'Olá! Aku <b>Tampinha</b>, datang naik tutup botol. <b>Futebol de botão</b> adalah <b>sepak bola kancing</b> dari Brasil: sentil kancingmu untuk membawa bola dan <b>cetak gol ke gawang lawan</b>. Dulu dimainkan dengan tutup botol dan kancing baju!',
    hi: 'ओला! मैं <b>टैम्पिन्या</b> हूँ, बोतल के ढक्कन पर सवार होकर आई। <b>फ़ुतेबोल जी बोताओ</b> ब्राज़ील का <b>बटन फ़ुटबॉल</b> है: बटन मारकर गेंद आगे बढ़ाओ और <b>विरोधी के गोल में डालो</b>। पहले लोग ढक्कनों और कमीज़ के बटनों से खेलते थे!',
    ar: 'أولا! أنا <b>تامبينيا</b>، جئت راكبة غطاء زجاجة. <b>فوتيبول دي بوتاو</b> هي <b>كرة القدم بالأزرار</b> من البرازيل: انقر أزرارك لتقود الكرة <b>وسجّل في مرمى الخصم</b>. قديمًا كانوا يلعبونها بأغطية الزجاجات وأزرار القمصان!',
  };
  // page texts: t (title), b (body), k (task), ok (done), ng (try again)
  const V = {
    ja: {
      'ball.t': 'ボールとボタン', 'ball.b': '自分のボタンは手前の<b>10個</b>、ゴールには<b>キーパー</b>（四角いブロック）。ボールは小さなフェルトの玉だよ。', 'ball.k': 'ボールをタップしてね', 'ball.ok': 'それ！ 主役はこの小さなボール', 'ball.ng': 'ボールは金色の目印の下にある白い玉だよ',
      'flick.t': 'はじいてみよう', 'flick.b': 'ボタンを選んで、<b>ボールを飛ばしたい向きと反対に引っぱって離す</b>。<b>緑の線</b>がボールの通り道。引くほど強くはじけるよ。', 'flick.k': '光るボタンでボールをはじこう', 'flick.ok': 'ナイスタッチ！ これが1タッチ', 'flick.ng': 'ボールに当たらなかった… 緑の線を見ながらもう一回',
      'touch.t': '12タッチと3回まで', 'touch.b': 'ボールを持つ間は<b>全部で12タッチ</b>まで、<b>同じボタンは3回続けて</b>まで。だから<b>パスでつなぐ</b>のがコツ。', 'touch.k': 'ボールを光る輪の中へパスしよう', 'touch.ok': 'つながった！ 次はそのボタンで打てるね', 'touch.ng': '惜しい！ 輪をめがけてもう一度',
      'foul.t': '相手に先に当てたら反則', 'foul.b': 'はじいたボタンが<b>ボールより先に相手のボタンに当たると反則</b>。相手のフリーキックになるよ。ボールが相手に当たったら相手ボールに。', 'foul.k': 'タップしてお手本を見てね', 'foul.ok': 'ね、ピーッと笛。ボールを先に触るのが大事！',
      'shoot.t': 'シュート宣言', 'shoot.b': 'ボールが<b>相手側の半分</b>に入ったら、<b>「シュート宣言」</b>をしてからシュート。宣言のないゴールは無効だよ。相手がキーパーを構えたら、すき間を狙おう！', 'shoot.k': 'キーパーの横のすき間へシュート！', 'shoot.ok': 'ゴーーール！', 'shoot.ng': '止められた！ キーパーのいない側を狙って',
      'keep.t': 'キーパーで守る', 'keep.b': '相手がシュート宣言したら、<b>キーパーをゴール前の小さな枠の中で動かして</b>構えるよ。点線がボールの通り道。', 'keep.k': 'キーパーを点線の上に動かして「構えOK」', 'keep.ok': 'ナイスセーブ！ 守りは位置取りが命', 'keep.ng': '入っちゃった… 点線をふさぐように置こう',
      'out.t': '外に出たら', 'out.b': '横の線から出たら<b>スローイン</b>、ゴールの線から出たら<b>ゴールキック</b>か<b>コーナーキック</b>。最後に触った人の<b>相手</b>のボールになるよ。', 'out.k': 'タップしてお手本を見てね', 'out.ok': 'スローイン！ 相手のボールで再開',
      'win.t': 'これで遊べるよ！', 'win.b': '前後半の時間内で<b>点の多い方が勝ち</b>（「3点先取」も選べるよ）。タッチを数えながらパスをつないで、チャンスで宣言！ さあ、キックオフ！',
    },
    en: {
      'ball.t': 'The ball and the buttons', 'ball.b': 'Your <b>10 buttons</b> are at the near end, with a <b>goalkeeper</b> (the square block) in each goal. The ball is a little felt ball.', 'ball.k': 'Tap the ball', 'ball.ok': 'That’s it! This little ball is the star', 'ball.ng': 'The ball is the little white one under the gold marker',
      'flick.t': 'Give it a flick', 'flick.b': 'Pick a button and <b>pull back away from where you want the ball to go</b>, then let go. The <b>green line</b> is the ball’s path — pull further for a harder flick.', 'flick.k': 'Flick the glowing button into the ball', 'flick.ok': 'Nice touch! That’s one touch', 'flick.ng': 'It missed the ball… watch the green line and try again',
      'touch.t': '12 touches, 3 in a row', 'touch.b': 'While you have the ball you get <b>12 touches in all</b>, and <b>no more than 3 in a row with one button</b>. So the trick is to <b>pass</b>.', 'touch.k': 'Pass the ball into the glowing ring', 'touch.ok': 'Connected! Now that button can play it', 'touch.ng': 'Close! Aim for the ring again',
      'foul.t': 'Hit them first: a foul', 'foul.b': 'If your button <b>hits an opponent’s button before the ball, it’s a foul</b> — a free kick to them. And a ball that comes off their button is their ball.', 'foul.k': 'Tap to watch', 'foul.ok': 'Hear the whistle? Always touch the ball first!',
      'shoot.t': 'Calling a shot', 'shoot.b': 'Once the ball is <b>in their half</b>, <b>call a shot</b> before you shoot — a goal without a call doesn’t count. They set their keeper, then you aim for the gap!', 'shoot.k': 'Shoot into the gap beside the keeper!', 'shoot.ok': 'GOOOOL!', 'shoot.ng': 'Saved! Aim for the side the keeper isn’t',
      'keep.t': 'Defending with the keeper', 'keep.b': 'When they call a shot, <b>move your keeper inside the small box in front of the goal</b>. The dotted line is the ball’s path.', 'keep.k': 'Put the keeper on the dotted line, then Ready', 'keep.ok': 'Great save! Defending is all about position', 'keep.ng': 'It went in… block the dotted line',
      'out.t': 'Out of play', 'out.b': 'Over a side line: a <b>throw-in</b>. Over an end line: a <b>goal kick</b> or a <b>corner</b>. The ball goes to <b>the other side</b> from whoever touched it last.', 'out.k': 'Tap to watch', 'out.ok': 'Throw-in! Their ball to restart',
      'win.t': 'You’re ready!', 'win.b': '<b>More goals by the end of the two halves wins</b> (or pick “first to 3”). Count your touches, pass it around and call your shot when it’s on. Kick-off!',
    },
    zh: {
      'ball.t': '球和纽扣', 'ball.b': '你的<b>10颗纽扣</b>在靠近你的一边，每个球门前有一个<b>守门员</b>（方块）。球是一颗小小的毛毡球。', 'ball.k': '点一下球', 'ball.ok': '对！主角就是这颗小球', 'ball.ng': '球是金色标记下面那颗白色小球哦',
      'flick.t': '弹弹看', 'flick.b': '选一颗纽扣，<b>朝想让球去的反方向拉，然后松开</b>。<b>绿线</b>就是球的路线，拉得越远越用力。', 'flick.k': '用发光的纽扣把球弹出去', 'flick.ok': '漂亮！这就是1次触球', 'flick.ng': '没碰到球…看着绿线再来一次',
      'touch.t': '12次触球，连续3次', 'touch.b': '控球期间<b>总共12次触球</b>，<b>同一颗纽扣最多连续3次</b>。所以诀窍是<b>传球</b>。', 'touch.k': '把球传进发光的圈里', 'touch.ok': '传到了！现在那颗纽扣可以出球了', 'touch.ng': '可惜！再瞄准圈试试',
      'foul.t': '先碰对方就犯规', 'foul.b': '你的纽扣<b>先碰到对方纽扣再碰球，就是犯规</b>，对方得到任意球。球碰到对方纽扣后就是对方的球。', 'foul.k': '点击看示范', 'foul.ok': '听到哨声了吧？一定要先碰球！',
      'shoot.t': '宣布射门', 'shoot.b': '球进入<b>对方半场</b>后，先<b>宣布射门</b>再射。没宣布的进球不算。对方摆好守门员后，瞄准空隙！', 'shoot.k': '把球射进守门员旁的空隙！', 'shoot.ok': '球进啦——！', 'shoot.ng': '被扑出了！瞄准守门员不在的那边',
      'keep.t': '用守门员防守', 'keep.b': '对方宣布射门时，<b>在球门前的小框里移动守门员</b>摆好位置。虚线就是球的路线。', 'keep.k': '把守门员移到虚线上，再按“准备好了”', 'keep.ok': '好球！防守靠站位', 'keep.ng': '被进了…挡住虚线吧',
      'out.t': '出界了', 'out.b': '从边线出界是<b>界外球</b>，从底线出界是<b>球门球</b>或<b>角球</b>。球归<b>最后碰球一方的对手</b>。', 'out.k': '点击看示范', 'out.ok': '界外球！由对方开球',
      'win.t': '可以开始玩啦！', 'win.b': '上下半场结束时<b>进球多的一方获胜</b>（也可选“先进3球”）。数着触球次数传球，有机会就宣布射门！开球！',
    },
    'zh-TW': {
      'ball.t': '球和鈕扣', 'ball.b': '你的<b>10顆鈕扣</b>在靠近你的一邊，每個球門前有一個<b>守門員</b>（方塊）。球是一顆小小的毛氈球。', 'ball.k': '點一下球', 'ball.ok': '對！主角就是這顆小球', 'ball.ng': '球是金色標記下面那顆白色小球喔',
      'flick.t': '彈彈看', 'flick.b': '選一顆鈕扣，<b>朝想讓球去的反方向拉，然後放開</b>。<b>綠線</b>就是球的路線，拉得越遠越用力。', 'flick.k': '用發光的鈕扣把球彈出去', 'flick.ok': '漂亮！這就是1次觸球', 'flick.ng': '沒碰到球…看著綠線再來一次',
      'touch.t': '12次觸球，連續3次', 'touch.b': '控球期間<b>總共12次觸球</b>，<b>同一顆鈕扣最多連續3次</b>。所以訣竅是<b>傳球</b>。', 'touch.k': '把球傳進發光的圈裡', 'touch.ok': '傳到了！現在那顆鈕扣可以出球了', 'touch.ng': '可惜！再瞄準圈試試',
      'foul.t': '先碰對方就犯規', 'foul.b': '你的鈕扣<b>先碰到對方鈕扣再碰球，就是犯規</b>，對方得到自由球。球碰到對方鈕扣後就是對方的球。', 'foul.k': '點一下看示範', 'foul.ok': '聽到哨聲了吧？一定要先碰球！',
      'shoot.t': '宣告射門', 'shoot.b': '球進入<b>對方半場</b>後，先<b>宣告射門</b>再射。沒宣告的進球不算。對方擺好守門員後，瞄準空隙！', 'shoot.k': '把球射進守門員旁的空隙！', 'shoot.ok': '球進啦——！', 'shoot.ng': '被撲出了！瞄準守門員不在的那邊',
      'keep.t': '用守門員防守', 'keep.b': '對方宣告射門時，<b>在球門前的小框裡移動守門員</b>擺好位置。虛線就是球的路線。', 'keep.k': '把守門員移到虛線上，再按「準備好了」', 'keep.ok': '好球！防守靠站位', 'keep.ng': '被進了…擋住虛線吧',
      'out.t': '出界了', 'out.b': '從邊線出界是<b>界外球</b>，從底線出界是<b>球門球</b>或<b>角球</b>。球歸<b>最後碰球一方的對手</b>。', 'out.k': '點一下看示範', 'out.ok': '界外球！由對方開球',
      'win.t': '可以開始玩啦！', 'win.b': '上下半場結束時<b>進球多的一方獲勝</b>（也可選「先進3球」）。數著觸球次數傳球，有機會就宣告射門！開球！',
    },
    ko: {
      'ball.t': '공과 단추', 'ball.b': '내 단추는 앞쪽의 <b>10개</b>, 골문엔 <b>골키퍼</b>(네모난 블록)가 있어. 공은 작은 펠트 공이야.', 'ball.k': '공을 탭해 봐', 'ball.ok': '그거! 주인공은 이 작은 공', 'ball.ng': '공은 금색 표시 아래의 하얀 작은 공이야',
      'flick.t': '튕겨 보자', 'flick.b': '단추를 고르고 <b>공을 보내고 싶은 방향의 반대로 당겼다가 놓아</b>. <b>초록 선</b>이 공이 가는 길이야. 많이 당길수록 세게.', 'flick.k': '빛나는 단추로 공을 튕기자', 'flick.ok': '나이스 터치! 이게 1터치야', 'flick.ng': '공에 안 맞았어… 초록 선을 보며 다시',
      'touch.t': '12터치와 연속 3번', 'touch.b': '공을 가진 동안 <b>모두 12터치</b>까지, <b>같은 단추는 연속 3번</b>까지. 그래서 <b>패스로 잇는</b> 게 요령이야.', 'touch.k': '공을 빛나는 고리 안으로 패스하자', 'touch.ok': '연결됐어! 이제 그 단추로 칠 수 있어', 'touch.ng': '아깝다! 고리를 노려 다시',
      'foul.t': '상대에 먼저 맞으면 반칙', 'foul.b': '튕긴 단추가 <b>공보다 먼저 상대 단추에 맞으면 반칙</b>. 상대 프리킥이야. 공이 상대 단추에 맞으면 상대 공.', 'foul.k': '탭해서 시범을 봐', 'foul.ok': '삐익! 공을 먼저 건드리는 게 중요해!',
      'shoot.t': '슛 선언', 'shoot.b': '공이 <b>상대 진영</b>에 들어가면 <b>「슛 선언」</b>을 하고 슛. 선언 없는 골은 무효야. 상대가 골키퍼를 세우면 빈틈을 노려!', 'shoot.k': '골키퍼 옆 빈틈으로 슛!', 'shoot.ok': '고오오올!', 'shoot.ng': '막혔어! 골키퍼가 없는 쪽을 노려',
      'keep.t': '골키퍼로 지키기', 'keep.b': '상대가 슛 선언을 하면 <b>골 앞 작은 칸 안에서 골키퍼를 움직여</b> 자리 잡아. 점선이 공이 지나갈 길이야.', 'keep.k': '골키퍼를 점선 위로 옮기고 「준비 완료」', 'keep.ok': '나이스 세이브! 수비는 위치가 생명', 'keep.ng': '들어가 버렸어… 점선을 막도록 놓자',
      'out.t': '밖으로 나가면', 'out.b': '옆줄 밖이면 <b>스로인</b>, 골라인 밖이면 <b>골킥</b>이나 <b>코너킥</b>. 마지막에 건드린 쪽의 <b>상대</b> 공이야.', 'out.k': '탭해서 시범을 봐', 'out.ok': '스로인! 상대 공으로 재개',
      'win.t': '이제 할 수 있어!', 'win.b': '전후반 시간 안에 <b>골이 많은 쪽이 승리</b>(「3골 선취」도 골라). 터치를 세며 패스를 잇고, 기회가 오면 선언! 킥오프!',
    },
    es: {
      'ball.t': 'La pelota y los botones', 'ball.b': 'Tus <b>10 botones</b> están en tu lado y en cada arco hay un <b>portero</b> (el bloque cuadrado). La pelota es una bolita de fieltro.', 'ball.k': 'Toca la pelota', 'ball.ok': '¡Eso! La estrella es esta bolita', 'ball.ng': 'La pelota es la bolita blanca bajo la marca dorada',
      'flick.t': 'Dale un toque', 'flick.b': 'Elige un botón y <b>tira en sentido contrario a donde quieres mandar la pelota</b>; luego suelta. La <b>línea verde</b> es el camino de la pelota: cuanto más tiras, más fuerte.', 'flick.k': 'Golpea la pelota con el botón brillante', 'flick.ok': '¡Buen toque! Eso es un toque', 'flick.ng': 'No tocó la pelota… mira la línea verde e inténtalo otra vez',
      'touch.t': '12 toques, 3 seguidos', 'touch.b': 'Mientras tienes la pelota, <b>12 toques en total</b> y <b>no más de 3 seguidos con un botón</b>. El truco es <b>pasar</b>.', 'touch.k': 'Pasa la pelota al anillo brillante', 'touch.ok': '¡Conectado! Ahora ese botón puede jugarla', 'touch.ng': '¡Casi! Apunta otra vez al anillo',
      'foul.t': 'Tocar primero al rival es falta', 'foul.b': 'Si tu botón <b>toca un botón rival antes que la pelota, es falta</b>: tiro libre para ellos. Y si la pelota rebota en un rival, es suya.', 'foul.k': 'Toca para verlo', 'foul.ok': '¿Oíste el silbato? ¡Primero la pelota!',
      'shoot.t': 'Anunciar el tiro', 'shoot.b': 'Con la pelota <b>en su campo</b>, <b>anuncia el tiro</b> antes de tirar: un gol sin anunciar no vale. Ellos colocan al portero y tú buscas el hueco.', 'shoot.k': '¡Tira al hueco junto al portero!', 'shoot.ok': '¡GOOOOL!', 'shoot.ng': '¡Atajada! Apunta al lado libre',
      'keep.t': 'Defender con el portero', 'keep.b': 'Cuando anuncian un tiro, <b>mueve a tu portero dentro del área chica</b>. La línea de puntos es el camino de la pelota.', 'keep.k': 'Pon al portero sobre la línea y pulsa Listo', 'keep.ok': '¡Gran atajada! Defender es colocarse', 'keep.ng': 'Entró… tapa la línea de puntos',
      'out.t': 'Fuera de juego', 'out.b': 'Por la banda: <b>saque de banda</b>. Por la línea de fondo: <b>saque de puerta</b> o <b>córner</b>. La pelota es para <b>el otro equipo</b> del último que la tocó.', 'out.k': 'Toca para verlo', 'out.ok': '¡Saque de banda! Reanuda el rival',
      'win.t': '¡Ya puedes jugar!', 'win.b': '<b>Gana quien marque más al final de los dos tiempos</b> (o elige «al primero en 3»). Cuenta tus toques, combina pases y anuncia el tiro cuando lo veas. ¡Saque inicial!',
    },
    fr: {
      'ball.t': 'La balle et les boutons', 'ball.b': 'Tes <b>10 boutons</b> sont de ton côté, et un <b>gardien</b> (le bloc carré) garde chaque but. La balle est une petite boule de feutre.', 'ball.k': 'Touche la balle', 'ball.ok': 'C’est ça ! La vedette, c’est cette petite balle', 'ball.ng': 'La balle, c’est la petite boule blanche sous le repère doré',
      'flick.t': 'Une pichenette', 'flick.b': 'Choisis un bouton et <b>tire dans le sens opposé à là où tu veux envoyer la balle</b>, puis lâche. La <b>ligne verte</b> montre le trajet de la balle : plus tu tires, plus c’est fort.', 'flick.k': 'Frappe la balle avec le bouton lumineux', 'flick.ok': 'Belle touche ! Ça fait une touche', 'flick.ng': 'Raté… suis la ligne verte et recommence',
      'touch.t': '12 touches, 3 de suite', 'touch.b': 'Quand tu as la balle, <b>12 touches en tout</b>, et <b>pas plus de 3 de suite avec un bouton</b>. L’astuce : <b>faire des passes</b>.', 'touch.k': 'Passe la balle dans l’anneau lumineux', 'touch.ok': 'Reçue ! Ce bouton peut jouer maintenant', 'touch.ng': 'Presque ! Vise l’anneau encore',
      'foul.t': 'Toucher l’adversaire d’abord : faute', 'foul.b': 'Si ton bouton <b>touche un bouton adverse avant la balle, c’est une faute</b> : coup franc pour eux. Une balle qui rebondit sur un adversaire est à lui.', 'foul.k': 'Touche pour voir', 'foul.ok': 'Tu entends le sifflet ? La balle d’abord !',
      'shoot.t': 'Annoncer le tir', 'shoot.b': 'Une fois la balle <b>dans leur moitié</b>, <b>annonce le tir</b> avant de tirer : un but non annoncé ne compte pas. Ils placent leur gardien, puis tu vises le trou !', 'shoot.k': 'Tire dans l’espace à côté du gardien !', 'shoot.ok': 'BUUUT !', 'shoot.ng': 'Arrêté ! Vise le côté sans gardien',
      'keep.t': 'Défendre avec le gardien', 'keep.b': 'Quand ils annoncent un tir, <b>déplace ton gardien dans la petite surface</b>. La ligne pointillée, c’est le chemin de la balle.', 'keep.k': 'Mets le gardien sur les pointillés, puis Prêt', 'keep.ok': 'Superbe arrêt ! Défendre, c’est se placer', 'keep.ng': 'C’est rentré… bouche la ligne pointillée',
      'out.t': 'Sortie', 'out.b': 'Par une ligne de touche : <b>touche</b>. Par la ligne de but : <b>six mètres</b> ou <b>corner</b>. La balle va à <b>l’équipe adverse</b> du dernier à l’avoir touchée.', 'out.k': 'Touche pour voir', 'out.ok': 'Touche ! Ballon à l’adversaire',
      'win.t': 'Tu es prêt !', 'win.b': '<b>Le plus de buts à la fin des deux mi-temps gagne</b> (ou choisis « premier à 3 »). Compte tes touches, fais tourner et annonce ton tir au bon moment. Coup d’envoi !',
    },
    pt: {
      'ball.t': 'A bola e os botões', 'ball.b': 'Seus <b>10 botões</b> ficam do seu lado e cada gol tem um <b>goleiro</b> (o bloco retangular). A bola é uma bolinha de feltro.', 'ball.k': 'Toque na bola', 'ball.ok': 'Isso! A estrela é essa bolinha', 'ball.ng': 'A bola é a bolinha branca embaixo da marca dourada',
      'flick.t': 'Dê um toque', 'flick.b': 'Escolha um botão e <b>puxe para o lado contrário de onde quer mandar a bola</b>; depois solte. A <b>linha verde</b> é o caminho da bola: quanto mais puxar, mais forte.', 'flick.k': 'Toque na bola com o botão brilhante', 'flick.ok': 'Belo toque! Isso é um toque', 'flick.ng': 'Não pegou na bola… olhe a linha verde e tente de novo',
      'touch.t': '12 toques, 3 seguidos', 'touch.b': 'Com a bola, você tem <b>12 toques ao todo</b> e <b>no máximo 3 seguidos com o mesmo botão</b>. O segredo é <b>tocar a bola</b> de botão em botão.', 'touch.k': 'Passe a bola para dentro do anel', 'touch.ok': 'Chegou! Agora aquele botão pode jogar', 'touch.ng': 'Quase! Mire no anel de novo',
      'foul.t': 'Bateu antes no adversário: falta', 'foul.b': 'Se o seu botão <b>bate num botão adversário antes da bola, é falta</b>: tiro livre para eles. E bola que bate no adversário fica com ele.', 'foul.k': 'Toque para ver', 'foul.ok': 'Ouviu o apito? Sempre a bola primeiro!',
      'shoot.t': 'Avisar o chute', 'shoot.b': 'Com a bola <b>no campo de ataque</b>, <b>avise o chute</b> antes de chutar — gol sem aviso não vale. Eles arrumam o goleiro e você mira no canto!', 'shoot.k': 'Chute no espaço ao lado do goleiro!', 'shoot.ok': 'GOOOOL!', 'shoot.ng': 'Defendeu! Mire no lado sem goleiro',
      'keep.t': 'Defender com o goleiro', 'keep.b': 'Quando avisam o chute, <b>mova seu goleiro dentro da pequena área</b>. O pontilhado é o caminho da bola.', 'keep.k': 'Ponha o goleiro no pontilhado e toque em Pronto', 'keep.ok': 'Que defesa! Defender é se posicionar', 'keep.ng': 'Entrou… tape o pontilhado',
      'out.t': 'Bola fora', 'out.b': 'Pela linha lateral: <b>lateral</b>. Pela linha de fundo: <b>tiro de meta</b> ou <b>escanteio</b>. A bola fica com <b>o adversário</b> de quem tocou por último.', 'out.k': 'Toque para ver', 'out.ok': 'Lateral! Bola do adversário',
      'win.t': 'Pronto para jogar!', 'win.b': '<b>Vence quem fizer mais gols nos dois tempos</b> (ou escolha “quem fizer 3”). Conte os toques, troque passes e avise o chute na hora certa. Saída de bola!',
    },
    de: {
      'ball.t': 'Ball und Knöpfe', 'ball.b': 'Deine <b>10 Knöpfe</b> stehen auf deiner Seite, in jedem Tor ein <b>Torwart</b> (der eckige Block). Der Ball ist eine kleine Filzkugel.', 'ball.k': 'Tippe auf den Ball', 'ball.ok': 'Genau! Der Star ist diese kleine Kugel', 'ball.ng': 'Der Ball ist die kleine weiße Kugel unter der goldenen Markierung',
      'flick.t': 'Schnipp mal', 'flick.b': 'Wähle einen Knopf und <b>zieh ihn entgegen der Richtung, in die der Ball soll</b>, dann loslassen. Die <b>grüne Linie</b> ist der Weg des Balls – je weiter du ziehst, desto kräftiger.', 'flick.k': 'Spiel den Ball mit dem leuchtenden Knopf', 'flick.ok': 'Schöne Berührung! Das ist eine Berührung', 'flick.ng': 'Ball verfehlt… achte auf die grüne Linie und versuch es nochmal',
      'touch.t': '12 Berührungen, 3 am Stück', 'touch.b': 'Solange du am Ball bist: <b>12 Berührungen insgesamt</b>, <b>höchstens 3 am Stück mit einem Knopf</b>. Der Trick: <b>Pässe spielen</b>.', 'touch.k': 'Pass den Ball in den leuchtenden Ring', 'touch.ok': 'Angekommen! Jetzt darf dieser Knopf spielen', 'touch.ng': 'Fast! Zieh nochmal auf den Ring',
      'foul.t': 'Erst den Gegner treffen: Foul', 'foul.b': 'Trifft dein Knopf <b>einen gegnerischen Knopf vor dem Ball, ist es ein Foul</b> – Freistoß für sie. Prallt der Ball vom Gegner ab, gehört er ihm.', 'foul.k': 'Tippen zum Zuschauen', 'foul.ok': 'Hörst du die Pfeife? Immer zuerst den Ball!',
      'shoot.t': 'Schuss ansagen', 'shoot.b': 'Ist der Ball <b>in ihrer Hälfte</b>, <b>sag den Schuss an</b>, bevor du schießt – ein Tor ohne Ansage zählt nicht. Sie stellen den Torwart, dann zielst du auf die Lücke!', 'shoot.k': 'Schieß in die Lücke neben dem Torwart!', 'shoot.ok': 'TOOOOR!', 'shoot.ng': 'Gehalten! Ziel auf die freie Seite',
      'keep.t': 'Mit dem Torwart verteidigen', 'keep.b': 'Sagen sie einen Schuss an, <b>schieb deinen Torwart im Torraum</b> zurecht. Die gepunktete Linie ist der Weg des Balls.', 'keep.k': 'Stell den Torwart auf die Punktlinie, dann Bereit', 'keep.ok': 'Klasse Parade! Verteidigen heißt richtig stehen', 'keep.ng': 'Drin… versperr die Punktlinie',
      'out.t': 'Im Aus', 'out.b': 'Über die Seitenlinie: <b>Einwurf</b>. Über die Torlinie: <b>Abstoß</b> oder <b>Ecke</b>. Der Ball geht an <b>die andere Seite</b> als die, die ihn zuletzt berührt hat.', 'out.k': 'Tippen zum Zuschauen', 'out.ok': 'Einwurf! Ball für den Gegner',
      'win.t': 'Los geht’s!', 'win.b': '<b>Wer nach zwei Halbzeiten mehr Tore hat, gewinnt</b> (oder wähle „Wer zuerst 3“). Zähl deine Berührungen, spiel Pässe und sag den Schuss im richtigen Moment an. Anstoß!',
    },
    ru: {
      'ball.t': 'Мяч и пуговицы', 'ball.b': 'Твои <b>10 пуговиц</b> на твоей стороне, в каждых воротах — <b>вратарь</b> (прямоугольный брусок). Мяч — маленький фетровый шарик.', 'ball.k': 'Нажми на мяч', 'ball.ok': 'Да! Главный герой — этот шарик', 'ball.ng': 'Мяч — маленький белый шарик под золотой меткой',
      'flick.t': 'Щёлкни', 'flick.b': 'Выбери пуговицу и <b>оттяни её в сторону, противоположную той, куда должен полететь мяч</b>, затем отпусти. <b>Зелёная линия</b> — путь мяча: чем дальше оттянешь, тем сильнее удар.', 'flick.k': 'Ударь по мячу светящейся пуговицей', 'flick.ok': 'Отличное касание! Это одно касание', 'flick.ng': 'Мимо мяча… смотри на зелёную линию и попробуй снова',
      'touch.t': '12 касаний, 3 подряд', 'touch.b': 'Пока мяч у тебя — <b>всего 12 касаний</b>, и <b>не больше 3 подряд одной пуговицей</b>. Секрет — <b>пасовать</b>.', 'touch.k': 'Отдай пас в светящееся кольцо', 'touch.ok': 'Пас дошёл! Теперь бьёт та пуговица', 'touch.ng': 'Почти! Целься в кольцо ещё раз',
      'foul.t': 'Задел соперника первым — фол', 'foul.b': 'Если твоя пуговица <b>задела пуговицу соперника раньше мяча — это фол</b>, штрафной сопернику. А мяч, отскочивший от соперника, — его.', 'foul.k': 'Нажми, чтобы посмотреть', 'foul.ok': 'Слышишь свисток? Сначала — мяч!',
      'shoot.t': 'Объявить удар', 'shoot.b': 'Когда мяч <b>на их половине</b>, <b>объяви удар</b> и только потом бей — гол без объявления не засчитают. Они ставят вратаря, а ты целься в просвет!', 'shoot.k': 'Бей в просвет рядом с вратарём!', 'shoot.ok': 'ГОООЛ!', 'shoot.ng': 'Отбил! Целься туда, где нет вратаря',
      'keep.t': 'Защита вратарём', 'keep.b': 'Когда объявлен удар, <b>передвинь вратаря в вратарской площади</b>. Пунктир — путь мяча.', 'keep.k': 'Поставь вратаря на пунктир и нажми «Готово»', 'keep.ok': 'Отличный сейв! Защита — это позиция', 'keep.ng': 'Пропустил… перекрой пунктир',
      'out.t': 'Мяч за линией', 'out.b': 'За боковой — <b>аут</b>. За лицевой — <b>удар от ворот</b> или <b>угловой</b>. Мяч получает <b>соперник</b> того, кто коснулся последним.', 'out.k': 'Нажми, чтобы посмотреть', 'out.ok': 'Аут! Мяч у соперника',
      'win.t': 'Можно играть!', 'win.b': '<b>Побеждает тот, кто забил больше за два тайма</b> (или выбери «до 3 голов»). Считай касания, пасуй и объявляй удар вовремя. Начальный удар!',
    },
    tr: {
      'ball.t': 'Top ve düğmeler', 'ball.b': '<b>10 düğmen</b> senin tarafında, her kalede bir <b>kaleci</b> (dikdörtgen blok) var. Top küçük bir keçe top.', 'ball.k': 'Topa dokun', 'ball.ok': 'İşte o! Yıldız bu küçük top', 'ball.ng': 'Top, altın işaretin altındaki küçük beyaz top',
      'flick.t': 'Bir fiske', 'flick.b': 'Bir düğme seç, <b>topun gitmesini istediğin yönün tersine çek ve bırak</b>. <b>Yeşil çizgi</b> topun yolu: ne kadar çekersen o kadar sert.', 'flick.k': 'Parlayan düğmeyle topa vur', 'flick.ok': 'Güzel dokunuş! Bu bir dokunuş', 'flick.ng': 'Topa değmedi… yeşil çizgiye bakıp tekrar dene',
      'touch.t': '12 dokunuş, art arda 3', 'touch.b': 'Top sendeyken <b>toplam 12 dokunuş</b>, <b>bir düğmeyle art arda en fazla 3</b>. Püf noktası <b>pas yapmak</b>.', 'touch.k': 'Topu parlayan halkaya pasla', 'touch.ok': 'Ulaştı! Şimdi o düğme oynayabilir', 'touch.ng': 'Az kaldı! Halkayı tekrar hedefle',
      'foul.t': 'Önce rakibe çarpmak faul', 'foul.b': 'Düğmen <b>toptan önce rakip düğmeye çarparsa faul</b> olur, serbest vuruş onlara. Rakipten seken top da onundur.', 'foul.k': 'İzlemek için dokun', 'foul.ok': 'Düdüğü duydun mu? Önce top!',
      'shoot.t': 'Şut ilan etmek', 'shoot.b': 'Top <b>rakip yarı sahadayken</b> önce <b>şut ilan et</b>, sonra vur — ilansız gol geçersiz. Onlar kaleciyi yerleştirir, sen boşluğu hedeflersin!', 'shoot.k': 'Kalecinin yanındaki boşluğa vur!', 'shoot.ok': 'GOOOL!', 'shoot.ng': 'Kurtardı! Kalecinin olmadığı tarafı hedefle',
      'keep.t': 'Kaleciyle savunma', 'keep.b': 'Şut ilan edilince <b>kalecini kale önündeki küçük alanda kaydır</b>. Noktalı çizgi topun yolu.', 'keep.k': 'Kaleciyi noktalı çizgiye koy, sonra Hazır', 'keep.ok': 'Harika kurtarış! Savunma pozisyon işi', 'keep.ng': 'Gol oldu… noktalı çizgiyi kapat',
      'out.t': 'Top dışarıda', 'out.b': 'Yan çizgiden: <b>taç</b>. Kale çizgisinden: <b>kale vuruşu</b> ya da <b>korner</b>. Top, son dokunanın <b>rakibine</b> geçer.', 'out.k': 'İzlemek için dokun', 'out.ok': 'Taç! Top rakipte',
      'win.t': 'Hazırsın!', 'win.b': '<b>İki yarı sonunda daha çok gol atan kazanır</b> (ya da “3 gole ilk ulaşan”ı seç). Dokunuşlarını say, pas yap ve doğru anda şut ilan et. Başlama vuruşu!',
    },
    id: {
      'ball.t': 'Bola dan kancing', 'ball.b': '<b>10 kancingmu</b> ada di sisimu, dan tiap gawang dijaga <b>kiper</b> (balok persegi). Bolanya bola kecil dari kain flanel.', 'ball.k': 'Ketuk bolanya', 'ball.ok': 'Betul! Bintangnya bola kecil ini', 'ball.ng': 'Bolanya bola putih kecil di bawah penanda emas',
      'flick.t': 'Coba sentil', 'flick.b': 'Pilih kancing, lalu <b>tarik ke arah kebalikan tujuan bola</b> dan lepaskan. <b>Garis hijau</b> adalah jalur bola — makin jauh ditarik, makin kuat.', 'flick.k': 'Sentil bola dengan kancing yang bersinar', 'flick.ok': 'Sentuhan bagus! Itu satu sentuhan', 'flick.ng': 'Meleset dari bola… lihat garis hijau dan coba lagi',
      'touch.t': '12 sentuhan, 3 berturut-turut', 'touch.b': 'Selama menguasai bola: <b>12 sentuhan total</b>, <b>maksimal 3 berturut-turut dengan satu kancing</b>. Kuncinya <b>mengoper</b>.', 'touch.k': 'Oper bola ke dalam cincin bersinar', 'touch.ok': 'Sampai! Kini kancing itu bisa main', 'touch.ng': 'Hampir! Bidik cincinnya lagi',
      'foul.t': 'Kena lawan dulu: pelanggaran', 'foul.b': 'Kalau kancingmu <b>mengenai kancing lawan sebelum bola, itu pelanggaran</b> — tendangan bebas untuk mereka. Bola yang memantul dari lawan jadi milik lawan.', 'foul.k': 'Ketuk untuk melihat', 'foul.ok': 'Dengar peluitnya? Selalu bola dulu!',
      'shoot.t': 'Mengumumkan tembakan', 'shoot.b': 'Saat bola <b>di separuh lawan</b>, <b>umumkan tembakan</b> dulu baru menembak — gol tanpa pengumuman tak sah. Mereka mengatur kiper, lalu kamu bidik celahnya!', 'shoot.k': 'Tembak ke celah di samping kiper!', 'shoot.ok': 'GOOOL!', 'shoot.ng': 'Ditepis! Bidik sisi yang kosong',
      'keep.t': 'Bertahan dengan kiper', 'keep.b': 'Saat lawan mengumumkan tembakan, <b>geser kipermu di dalam kotak kecil depan gawang</b>. Garis titik-titik adalah jalur bola.', 'keep.k': 'Taruh kiper di garis titik-titik, lalu Siap', 'keep.ok': 'Penyelamatan hebat! Bertahan itu soal posisi', 'keep.ng': 'Kebobolan… tutup garis titik-titiknya',
      'out.t': 'Bola keluar', 'out.b': 'Lewat garis samping: <b>lemparan ke dalam</b>. Lewat garis gawang: <b>tendangan gawang</b> atau <b>tendangan sudut</b>. Bola jadi milik <b>lawan</b> dari yang terakhir menyentuh.', 'out.k': 'Ketuk untuk melihat', 'out.ok': 'Lemparan ke dalam! Bola lawan',
      'win.t': 'Kamu siap!', 'win.b': '<b>Yang mencetak gol terbanyak dalam dua babak menang</b> (atau pilih “duluan 3 gol”). Hitung sentuhanmu, alirkan bola, dan umumkan tembakan saat peluang tiba. Sepak mula!',
    },
    hi: {
      'ball.t': 'गेंद और बटन', 'ball.b': 'तुम्हारे <b>10 बटन</b> तुम्हारी तरफ़ हैं, हर गोल में एक <b>गोलकीपर</b> (चौकोर ब्लॉक)। गेंद एक छोटी फ़ेल्ट की गेंद है।', 'ball.k': 'गेंद को छुओ', 'ball.ok': 'हाँ! असली सितारा यही छोटी गेंद है', 'ball.ng': 'गेंद सुनहरे निशान के नीचे वाली छोटी सफ़ेद गेंद है',
      'flick.t': 'मारकर देखो', 'flick.b': 'एक बटन चुनो और <b>जिधर गेंद भेजनी है उसकी उलटी ओर खींचकर छोड़ दो</b>। <b>हरी रेखा</b> गेंद का रास्ता है — जितना खींचोगे, उतनी ज़ोर से।', 'flick.k': 'चमकते बटन से गेंद मारो', 'flick.ok': 'बढ़िया टच! यह एक टच हुआ', 'flick.ng': 'गेंद नहीं लगी… हरी रेखा देखकर फिर कोशिश करो',
      'touch.t': '12 टच, लगातार 3', 'touch.b': 'गेंद तुम्हारे पास हो तो <b>कुल 12 टच</b>, और <b>एक बटन से लगातार 3 से ज़्यादा नहीं</b>। तरकीब है <b>पास देना</b>।', 'touch.k': 'गेंद को चमकते घेरे में पास करो', 'touch.ok': 'पहुँच गई! अब वह बटन खेल सकता है', 'touch.ng': 'लगभग! घेरे पर फिर निशाना लगाओ',
      'foul.t': 'पहले विरोधी से टकराना फ़ाउल', 'foul.b': 'तुम्हारा बटन <b>गेंद से पहले विरोधी बटन से टकराए तो फ़ाउल</b> — उन्हें फ़्री किक। और विरोधी से टकराकर लौटी गेंद उन्हीं की।', 'foul.k': 'देखने के लिए छुओ', 'foul.ok': 'सीटी सुनी? पहले गेंद, हमेशा!',
      'shoot.t': 'शॉट की घोषणा', 'shoot.b': 'गेंद <b>उनके आधे हिस्से</b> में हो तो पहले <b>शॉट घोषित करो</b>, फिर मारो — बिना घोषणा का गोल नहीं गिना जाता। वे कीपर सेट करते हैं, फिर तुम ख़ाली जगह पर निशाना लगाओ!', 'shoot.k': 'कीपर के बगल की ख़ाली जगह में शॉट!', 'shoot.ok': 'गोओओल!', 'shoot.ng': 'बचा लिया! जिधर कीपर नहीं, उधर मारो',
      'keep.t': 'कीपर से बचाव', 'keep.b': 'जब वे शॉट घोषित करें, <b>गोल के सामने छोटे बॉक्स में अपना कीपर खिसकाओ</b>। बिंदुदार रेखा गेंद का रास्ता है।', 'keep.k': 'कीपर को बिंदुदार रेखा पर रखो, फिर तैयार', 'keep.ok': 'शानदार बचाव! बचाव मतलब सही जगह', 'keep.ng': 'गोल हो गया… बिंदुदार रेखा रोक दो',
      'out.t': 'गेंद बाहर', 'out.b': 'साइड लाइन से बाहर: <b>थ्रो-इन</b>। गोल लाइन से बाहर: <b>गोल किक</b> या <b>कॉर्नर</b>। गेंद आख़िरी बार छूने वाले के <b>विरोधी</b> को मिलती है।', 'out.k': 'देखने के लिए छुओ', 'out.ok': 'थ्रो-इन! गेंद विरोधी की',
      'win.t': 'अब खेल सकते हो!', 'win.b': '<b>दोनों हाफ़ के बाद ज़्यादा गोल करने वाला जीतता है</b> (या "पहले 3 गोल" चुनो)। टच गिनो, पास दो और मौक़ा मिलते ही शॉट घोषित करो। किक-ऑफ़!',
    },
    ar: {
      'ball.t': 'الكرة والأزرار', 'ball.b': 'أزرارك <b>العشرة</b> في جهتك، وفي كل مرمى <b>حارس</b> (القطعة المستطيلة). الكرة كرة لبّاد صغيرة.', 'ball.k': 'المس الكرة', 'ball.ok': 'هذه هي! النجمة هي هذه الكرة الصغيرة', 'ball.ng': 'الكرة هي الكرة البيضاء الصغيرة تحت العلامة الذهبية',
      'flick.t': 'انقر الزر', 'flick.b': 'اختر زرًا و<b>اسحبه عكس الاتجاه الذي تريد أن تذهب إليه الكرة</b> ثم اتركه. <b>الخط الأخضر</b> هو طريق الكرة، وكلما سحبت أكثر كانت الضربة أقوى.', 'flick.k': 'اضرب الكرة بالزر المضيء', 'flick.ok': 'لمسة جميلة! هذه لمسة واحدة', 'flick.ng': 'لم يلمس الكرة… انظر إلى الخط الأخضر وأعد المحاولة',
      'touch.t': '12 لمسة و3 متتالية', 'touch.b': 'ما دامت الكرة معك لك <b>12 لمسة إجمالًا</b>، و<b>3 متتالية فقط بالزر نفسه</b>. السر هو <b>التمرير</b>.', 'touch.k': 'مرّر الكرة إلى الحلقة المضيئة', 'touch.ok': 'وصلت! الآن يلعبها ذلك الزر', 'touch.ng': 'قريب! صوّب نحو الحلقة مرة أخرى',
      'foul.t': 'لمس الخصم أولًا خطأ', 'foul.b': 'إذا <b>لمس زرك زر الخصم قبل الكرة فهو خطأ</b> — ركلة حرة لهم. والكرة التي ترتد من الخصم تصبح له.', 'foul.k': 'المس لتشاهد', 'foul.ok': 'سمعت الصافرة؟ الكرة أولًا دائمًا!',
      'shoot.t': 'إعلان التسديد', 'shoot.b': 'حين تصبح الكرة <b>في نصف ملعبهم</b>، <b>أعلن التسديد</b> ثم سدّد — الهدف بلا إعلان لا يُحتسب. يضعون حارسهم ثم تصوّب نحو الفراغ!', 'shoot.k': 'سدّد في الفراغ بجانب الحارس!', 'shoot.ok': 'جووول!', 'shoot.ng': 'تصدّى لها! صوّب إلى الجهة الخالية',
      'keep.t': 'الدفاع بالحارس', 'keep.b': 'عندما يعلنون التسديد، <b>حرّك حارسك داخل المنطقة الصغيرة أمام المرمى</b>. الخط المنقط هو طريق الكرة.', 'keep.k': 'ضع الحارس على الخط المنقط ثم «جاهز»', 'keep.ok': 'تصدٍّ رائع! الدفاع هو التمركز', 'keep.ng': 'دخلت… أغلق الخط المنقط',
      'out.t': 'خارج الملعب', 'out.b': 'من خط التماس: <b>رمية تماس</b>. من خط المرمى: <b>ركلة مرمى</b> أو <b>ركلة ركنية</b>. تذهب الكرة إلى <b>خصم</b> آخر من لمسها.', 'out.k': 'المس لتشاهد', 'out.ok': 'رمية تماس! الكرة للخصم',
      'win.t': 'أنت جاهز!', 'win.b': '<b>يفوز صاحب الأهداف الأكثر بعد الشوطين</b> (أو اختر «أول من يسجل 3»). عدّ لمساتك ومرّر الكرة وأعلن التسديد في الوقت المناسب. ركلة البداية!',
    },
  };
  // the pages: buttons staged (index, x, y; index 0–9 yours, 10–19 theirs), the ball, the keepers, the task
  const OFF = [9999, 9999];
  const PAGES = [
    { id: 'intro', show: 'all' },
    { id: 'ball', kind: 'tap', show: 'all', cam: [0, 4], near: true },
    { id: 'flick', kind: 'flick', b: [[8, 0, 12]], ball: [0, 6], sel: 8, cam: [0, 4] },
    { id: 'touch', kind: 'pass', b: [[8, 6, 16], [7, -26, -12]], ball: [0, 10.5], sel: 8, ring: [-18, -3, 5], cam: [-8, 4] },
    { id: 'foul', kind: 'demo', demo: 'foul', b: [[8, 4, 22], [15, 4, 13]], ball: [-3, 10], sel: 8, cam: [0, 14] },
    { id: 'shoot', kind: 'shoot', b: [[8, 3, -48], [13, -12, -60]], ball: [2, -53], keep: [1, [-3.2, -79]], sel: 8, cam: [0, -64] },
    { id: 'keep', kind: 'keep', b: [[14, -10, 46]], ball: [-8, 52], keep: [0, [8, 79.6]], cam: [0, 64], camP: [0, 58] },
    { id: 'out', kind: 'demo', demo: 'out', b: [[3, 34, 15], [11, 44, 2]], ball: [39, 14], sel: 3, cam: [34, 10] },
    { id: 'win', last: true, show: 'all' },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.BotaoEngine, D = E.DIM, lang = ctx.lang;
    const L = Object.assign({}, UI.en, UI[lang] || {}), VO = Object.assign({}, V.en, V[lang] || {});
    const T = k => VO[k] == null ? '' : VO[k];
    try { localStorage.setItem('aicoding-botao-rules-seen', '1'); } catch (e) {}
    const AC = window.Atlas3D && Atlas3D.carrom, BT = window.Atlas3D && Atlas3D.botao;
    const SND = (AC && AC.SND) || { flick() {}, hit() {}, cush() {}, pocket() {}, place() {}, good() {}, bad() {}, win() {} };
    const SX = (BT && BT.SX) || { whistle() {}, goal() {}, net() {}, ooh() {} };
    const board = T3.MODELS.botao(true); T3.show('botao', board); if (T3.play) T3.play(true);
    const U = board.userData, Y = U.top, K = U.K;
    const port = () => innerHeight > innerWidth * 1.05;
    let camC = [0, 0], wholeV = true;
    function frame() { if (!T3.fit) return; if (wholeV) { T3.fit(port() ? { w: U.W, d: U.L * 1.02, y: Y, pitch: 1.4, up: .6 } : { w: U.W, d: U.L * 1.04, y: Y, pitch: 1.3, up: .8 }); return; } const [cx, cz] = U.xz(camC[0], camC[1]); T3.fit({ w: (port() ? 46 : 96) * K, d: (port() ? 56 : 66) * K, y: Y, pitch: port() ? 1.08 : 1.0, cx, cz, ease: true, ek: .08, up: port() ? .25 : .5 }); }
    const onResizeF = () => frame();
    addEventListener('resize', onResizeF);
    let st = null, step = 0, played = false, busy = false, stopped = false, timers = [], sel = -1, drag = null, aim = null;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const wx = (x, y) => U.xz(x, y), kick = ms => T3.kick && T3.kick(ms || 150);
    const vOf = pw => E.VMIN + (E.VMAX - E.VMIN) * pw * pw;

    /* ---------- the pieces ---------- */
    const bt = [], kp = []; let ballG = null;
    for (let i = 0; i < 20; i++) { const g = U.button(i < 10 ? 0 : 1, (i % 10) + 2), sh = T3.contact(D.RB * K * 1.18, .4); sh.position.y = .003; g.add(sh); board.add(g); bt.push(g); }
    ballG = U.ball(); { const sh = T3.contact(D.RBALL * K * 1.5, .45); sh.position.y = .003; ballG.add(sh); } board.add(ballG);
    for (let s = 0; s < 2; s++) { const g = U.keeper(s); board.add(g); kp.push(g); }
    const put = (g, x, y, h) => { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); };
    function stage(pg) {
      const s = E.newMatch({ first: 0 });
      if (pg.show !== 'all') {
        s.b.forEach(b => { b.x = OFF[0]; b.y = OFF[1]; });
        (pg.b || []).forEach(([i, x, y]) => { s.b[i] = { x, y }; });
        s.ball = { x: pg.ball[0], y: pg.ball[1] };
        if (pg.keep) s.k[pg.keep[0]] = { x: pg.keep[1][0], y: pg.keep[1][1] };
        s.k.forEach((k, t) => { if (!pg.keep || pg.keep[0] !== t) { k.x = OFF[0]; k.y = OFF[1]; } });
      }
      s.pos = 0; s.rem = 12; s.noShot = 0;
      return s;
    }
    function syncAll(drop) {
      st.b.forEach((b, i) => { const off = b.x > 999; bt[i].visible = !off; if (!off) put(bt[i], b.x, b.y, drop ? 1.2 : 0); });
      put(ballG, st.ball.x, st.ball.y, drop ? 1.2 : 0);
      st.k.forEach((k, t) => { const off = k.x > 999; kp[t].visible = !off; if (!off) put(kp[t], k.x, k.y, drop ? 1.2 : 0); });
      if (drop) { const t0 = performance.now(); (function s() { if (stopped) return; const k = Math.min(1, (performance.now() - t0) / 420), e = 1 - Math.pow(1 - k, 3); st.b.forEach((b, i) => { if (b.x < 999) put(bt[i], b.x, b.y, (1 - e) * 1.2); }); put(ballG, st.ball.x, st.ball.y, (1 - e) * 1.2); st.k.forEach((q, t) => { if (q.x < 999) put(kp[t], q.x, q.y, (1 - e) * 1.2); }); kick(120); if (k < 1) requestAnimationFrame(s); else SND.place(); })(); }
      kick(200);
    }

    /* ---------- guides ---------- */
    const gd = new TH.Group(); board.add(gd);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { path: basic(0xffffff, .9), ball: basic(0x3df59a, .95), sel: basic(0xffd34d, .95), goal: basic(0x3df59a, .95), goalF: basic(0x3df59a, .22), arrow: basic(0xffffff, .95), box: basic(0x3df59a, .2), shot: basic(0xff5a5a, .95), no: basic(0xff5a5a, .8) };
    const GEO = { bar: new TH.BoxGeometry(1, .004, 1), ring: new TH.TorusGeometry(1, .07, 6, 40), cone: new TH.ConeGeometry(.06, .16, 3), disc: new TH.CircleGeometry(1, 36) };
    GEO.ring.rotateX(Math.PI / 2); GEO.cone.rotateX(Math.PI / 2); GEO.disc.rotateX(-Math.PI / 2);
    function clearGuides() { while (gd.children.length) gd.remove(gd.children[0]); kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) { const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return; const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(a, Y + (lift || .02), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); }
    function dots(x0, y0, x1, y1, mat, w) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(len / 2.2)); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .6) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, w || .45, mat); } }
    // a ring on the cloth (h 0) or round a button at half its height (h BMID: it sits round the piece as you see it)
    const BMID = .7;   // at the height of the button's top face: the ring reads as a halo round the number you look at
    function ring(x, y, r, mat, pul, h) { const m = new TH.Mesh(GEO.ring, mat), [a, b] = wx(x, y); m.position.set(a, Y + (h ? h * K : .012), b); m.scale.set(r * K, 1, r * K); m.userData.pulse = pul ? r : 0; m.renderOrder = 4; gd.add(m); return m; }
    function disc(x, y, r, mat) { const m = new TH.Mesh(GEO.disc, mat), [a, b] = wx(x, y); m.position.set(a, Y + .006, b); m.scale.set(r * K, 1, r * K); m.renderOrder = 3; gd.add(m); return m; }
    function pathLine(pts, mat, w) { if (!pts || pts.length < 2) return; let px = pts[0][0], py = pts[0][1]; for (let k = 1; k < pts.length; k++) { const [x, y] = pts[k], d = Math.hypot(x - px, y - py); if (d < .9 && k < pts.length - 1) continue; bar(px, py, x, y, w || .8, mat, .025); px = x; py = y; } }
    // the ball's marker: a gold cone over the ball (the ball is small)
    const beacon = new TH.Mesh(new TH.ConeGeometry(1.15 * K, 2.2 * K, 18), new TH.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .95, toneMapped: false, depthTest: false, depthWrite: false }));
    beacon.rotation.x = Math.PI; beacon.renderOrder = 9; board.add(beacon);
    const beaconPut = () => { if (!st) return; const [a, b] = wx(st.ball.x, st.ball.y), sc = wholeV ? 1.8 : 1; beacon.scale.setScalar(sc); beacon.position.set(a, Y + (D.RBALL * 2 + 2.6 * sc + Math.sin(performance.now() / 260) * .5) * K, b); };
    function boxArea(B) { const m = new TH.Mesh(GEO.bar, MAT.box), [a, b] = wx((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2); m.position.set(a, Y + .006, b); m.scale.set((B.x1 - B.x0 + 2 * D.KHW) * K, 1, (B.y1 - B.y0 + 2 * D.KHD) * K); gd.add(m); }
    const SHOT = { from: [-8, 52], to: [3.2, D.H + 1] };   // the keeper page: the shot that comes at your goal
    // your pull points where the BALL goes; this is the flick it makes (as in the game)
    const distOf = pw => 2 + pw * 150, aimMove = a => { const c = E.ballAim(st, sel, a.ang, distOf(a.pow)); return c ? { i: sel, ang: c.ang, v: c.v } : { i: sel, ang: Math.atan2(st.ball.y - st.b[sel].y, st.ball.x - st.b[sel].x), v: vOf(a.pow) }; };
    function guides() {
      clearGuides();
      const pg = P();
      if (pg.kind === 'pass' && !played) { disc(pg.ring[0], pg.ring[1], pg.ring[2], MAT.goalF); ring(pg.ring[0], pg.ring[1], pg.ring[2], MAT.goal, true); }
      if (pg.kind === 'keep' && !played) { boxArea(E.keeperBox(0, false)); dots(SHOT.from[0], SHOT.from[1], SHOT.to[0], SHOT.to[1], MAT.shot, .6); }
      if (['flick', 'pass', 'shoot'].includes(pg.kind) && !played && !busy && sel >= 0) {
        const b = st.b[sel];
        if (!aim) ring(b.x, b.y, D.RB + .9, MAT.sel, true, BMID);
        else {
          const mv = aimMove(aim), tr = E.aimTrace(st, sel, mv.ang);
          dots(b.x, b.y, tr.gx, tr.gy, MAT.path, .35);
          if (tr.what === 'ball') { ring(tr.gx, tr.gy, D.RB, MAT.path, false, BMID); const pv = E.ballPath(st, mv); if (pv.path) pathLine(pv.path, MAT.ball, .85); }
          else if (tr.what != null) ring(tr.gx, tr.gy, D.RB, MAT.no, false, BMID);
          // the pull: a band from the button back toward the finger, its colour the strength
          const L0 = D.RB + 1.5 + aim.pow * 13, back = aim.ang + Math.PI;
          MAT.arrow.color.setHSL(.33 - aim.pow * .33, .9, .55);
          bar(b.x + Math.cos(back) * D.RB, b.y + Math.sin(back) * D.RB, b.x + Math.cos(back) * L0, b.y + Math.sin(back) * L0, 1.2, MAT.arrow, .03);
          ring(b.x + Math.cos(back) * L0, b.y + Math.sin(back) * L0, .9, MAT.arrow);
        }
      }
      kick(120);
    }
    let pulseT = 0;
    { const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || document.hidden || !document.hasFocus()) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { const s = m.userData.pulse * K * (1.06 + Math.sin((performance.now() - t0) / 230) * .08); m.scale.set(s, 1, s); any = true; } }); if (beacon.visible) { beaconPut(); any = true; } if (any) kick(80); }, 60); }

    /* ---------- a flick: simulate and play it back ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, t0 = performance.now(); let ev = 0, el = 0, last = t0;
        (function stp() {
          if (stopped) return done();
          const now = performance.now(); el += Math.max(0, now - last) / 1000; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi];
          for (let i = 0; i < 20; i++) if (bt[i].visible) put(bt[i], f[i * 2], f[i * 2 + 1]);
          put(ballG, f[40], f[41]); beacon.visible = false;
          while (ev < sim.events.length && sim.events[ev].t <= el) { const e = sim.events[ev++]; if ((e.k === 'hit' || e.k === 'ball') && e.v > 6) SND.hit(e.v * .6); else if ((e.k === 'rim' || e.k === 'keep' || e.k === 'post') && e.v > 10) SND.cush(e.v * .6); else if (e.k === 'goal') SX.net(); }
          kick(120);
          if (fi < F.length - 1) requestAnimationFrame(stp); else done();
        })();
      });
    }
    async function flick(mv) {
      busy = true; clearGuides(); SND.flick();
      const sim = E.simulate(st, mv, { frames: true });
      await playback(sim); if (stopped) return null;
      busy = false; st.ball = { x: sim.fin.ball.x, y: sim.fin.ball.y };
      return sim;
    }
    // the help: an aim within 12° of the page's line is set on it, the power into the window that works
    const near = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; return d < 12 * Math.PI / 180; };
    // the help: a ball direction within 12° of the page's line is set on it, the strength into the window that works
    function assisted(mv, a) {
      const pg = P(), good = m => judge(pg, E.simulate(st, m));
      let target = null;
      if (pg.kind === 'flick') target = [st.ball.x, st.ball.y - 30];
      else if (pg.kind === 'pass') target = [pg.ring[0], pg.ring[1]];
      else if (pg.kind === 'shoot') { const k = st.k[1]; target = [k.x > 0 ? -4.2 : 4.2, -D.H - 2]; }
      if (!target || !a) return mv;
      const th = Math.atan2(target[1] - st.ball.y, target[0] - st.ball.x);
      if (!near(th, a.ang)) return mv;
      const want = distOf(a.pow), c = E.ballAim(st, mv.i, th, want); if (!c) return mv;
      if (good({ i: mv.i, ang: c.ang, v: c.v })) return { i: mv.i, ang: c.ang, v: c.v };
      let best = null; for (let d = 3; d <= 150; d += 1.5) { const q = E.ballAim(st, mv.i, th, d); if (q && good({ i: mv.i, ang: q.ang, v: q.v }) && (!best || Math.abs(d - want) < Math.abs(best.d - want))) best = { d, q }; }
      if (!best || want > best.d * 2.2 + 8 || want < best.d / 2.2) return mv;
      return { i: mv.i, ang: best.q.ang, v: best.q.v };
    }
    function judge(pg, sim) {
      if (pg.kind === 'flick') return !!sim.first && sim.first.what === 'ball';
      if (pg.kind === 'pass') { const f = sim.fin.ball; return sim.first && sim.first.what === 'ball' && Math.hypot(f.x - pg.ring[0], f.y - pg.ring[1]) < pg.ring[2] + 1; }
      if (pg.kind === 'shoot') return !!sim.goal && sim.goal.side === 1 && sim.first && sim.first.what === 'ball';
      return false;
    }

    /* ---------- the guide panel (the shared .rgd look of every course) ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#eef6e0;border:1.5px solid #cfe2ae;font-size:12.5px;font-weight:700}'
      + '.rgd .urt{background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a;font-weight:900;box-shadow:0 3px 0 #e6b43a;animation:btP 1.6s ease-in-out infinite}@keyframes btP{50%{box-shadow:0 3px 0 #e6b43a,0 0 0 5px rgba(240,194,74,.28)}}'
      + '.rgd .btok{margin-inline-start:8px;border:0;border-radius:99px;padding:6px 16px;font:inherit;font-weight:900;background:#5f9e1a;color:#fff;cursor:pointer;box-shadow:0 3px 0 #456f12}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}}';
    document.head.appendChild(css);
    let ACx = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; ACx = ACx || window.__atlasAC || new (window.AudioContext || window.webkitAudioContext)(); if (ACx.state === 'suspended') ACx.resume(); const f = 520 + Math.random() * 240, t = ACx.currentTime, o = ACx.createOscillator(), g = ACx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .06); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .07); o.connect(g); g.connect(ACx.destination); o.start(t); o.stop(t + .08); } catch (e) {} };
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = window.TapWord ? TapWord.fix(html) : html; clearInterval(typeT);
      const nodes = []; (function walkN(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walkN(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; });
      let ni = 0, ci = 0, bc = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 3; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, s] = nodes[ni]; const ch = s[ci]; nd.textContent = s.slice(0, ++ci); if (ch && !/[\s、。，．,.!?！？…—「」（）()]/.test(ch) && ++bc % 3 === 0) blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 22);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, s]) => { nd.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const cnt = html => { $('.cnt').innerHTML = html || ''; msg(''); };
    const tag = (html, bg, col) => `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block${bg ? `;background:${bg};color:${col}` : ''}">${html}</span>`;
    const task = html => `<span class="tag urt" style="white-space:normal;height:auto;line-height:1.4;display:inline-block;background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a">${html}</span>`;
    const chips = () => `<div class="urh"><div class="tg"><span>📍 ${L.origin}</span><span>👥 ${L.players}</span><span>⏱ ${L.time}</span></div></div>`;
    let msgT = 0;
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3400); }
    function ng(key) { msg(`<span>${T(key)}</span>`); SND.bad(); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    const P = () => PAGES[step];
    const waiting = () => P().id !== 'intro' && !P().last && !played;
    function buttons() {
      const pg = P(), wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = (window.TapWord ? TapWord.fix : x => x)(pg.last ? L.start + ' ▶' : wait ? (pg.kind === 'demo' ? L.watch : L.tapIt) : L.next + ' ▶');
      const hold = wait && pg.kind !== 'demo'; nx.disabled = hold; nx.classList.toggle('wait', hold);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${PAGES.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (pg.last && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!pg.last && ag) ag.remove();
    }
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), cn = $('.cnt'), w = bub.clientWidth; if (!w || w === lockW) return; lockW = w;
      const keep = [tx.innerHTML, cn.innerHTML]; bub.style.minHeight = ''; let mx = 0;
      const meas = (t, c) => { tx.innerHTML = t; cn.innerHTML = c; mx = Math.max(mx, bub.offsetHeight); };
      meas(HELLO[lang] || HELLO.en, chips());
      PAGES.forEach(pg => { if (pg.id === 'intro') return; const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`; [task(`👆 ${T(pg.id + '.k')}`), tag(`✓ ${T(pg.id + '.ok')}`)].forEach(c => meas(t, c)); });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; drag = null; aim = null;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      const prev = st; st = stage(pg); sel = pg.sel != null ? pg.sel : -1;
      syncAll(!prev || pg.show === 'all' || true); beacon.visible = pg.kind !== 'keep'; beaconPut();
      wholeV = (pg.show === 'all' && !pg.near) || !pg.cam; if (pg.cam) camC = (port() && pg.camP) || pg.cam; frame();
      if (pg.id === 'intro') { say(HELLO[lang] || HELLO.en); cnt(chips()); guides(); buttons(); return; }
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      if (!pg.last) cnt(task(`👆 ${T(pg.id + '.k')}`) + (pg.kind === 'keep' ? `<button type="button" class="btok">🧤 ${L.ready}</button>` : ''));
      const okb = el.querySelector('.btok'); if (okb) okb.onclick = keepShot;
      guides(); buttons();
    }
    function ok(key) {
      played = true; busy = false; clearGuides(); cnt(tag(`✓ ${T(key)}`, '#e8f8ee', '#16784a')); SND.good(); buttons();
      if (!P().last) {
        const s0 = step, ms = 1600 + Math.min(3200, T(key).replace(/<[^>]+>/g, '').length * 45);
        if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), ms, () => step === s0);
        later(() => { if (step === s0 && played) go(step + 1); }, ms);
      }
    }
    async function flickDone(sim) {
      if (!sim || stopped) return;
      const pg = P();
      if (judge(pg, sim)) { if (pg.kind === 'shoot') { SX.goal(); } return ok(pg.id + '.ok'); }
      if (pg.kind === 'shoot' && sim.touches.some(w => w === 'k1')) SX.ooh();
      ng(pg.id + '.ng'); later(() => go(step), 1500);
    }
    async function demo() {
      if (busy || played) return;
      const pg = P(); cnt('');
      if (pg.demo === 'foul') {   // the button goes straight into the opponent's button: the whistle
        const b = st.b[8], o = st.b[15], sim = await flick({ i: 8, ang: Math.atan2(o.y - b.y, o.x - b.x), v: 70 }); if (!sim || stopped) return;
        SX.whistle(2, .2); ok('foul.ok'); return;
      }
      if (pg.demo === 'out') {   // a flick that runs the ball over the side line: a throw-in to them
        const c = E.aimAt(st, 3, 0, 75) || { i: 3, ang: 0, v: 70 }, sim = await flick({ i: 3, ang: c.ang, v: 70 }); if (!sim || stopped) return;
        SX.whistle(1, .22);
        const r = E.resolve(st, sim); st = r.s; syncAll(false); ok('out.ok'); return;
      }
    }
    async function keepShot() {   // the keeper page: the shot comes along the dotted line at the keeper you set
      if (busy || played || P().kind !== 'keep') return;
      busy = true; clearGuides(); const okb = el.querySelector('.btok'); if (okb) okb.remove();
      // the opponent's button 14 shoots: a straight hit along the line
      const th = Math.atan2(SHOT.to[1] - SHOT.from[1], SHOT.to[0] - SHOT.from[0]);
      st.ball = { x: SHOT.from[0], y: SHOT.from[1] }; st.b[14] = { x: SHOT.from[0] - Math.cos(th) * (D.RB + D.RBALL + 3), y: SHOT.from[1] - Math.sin(th) * (D.RB + D.RBALL + 3) }; syncAll(false);
      await new Promise(r => later(r, 350));
      const sim = await flick({ i: 14, ang: th, v: 150 }); if (!sim || stopped) return;
      if (sim.goal) { SX.ooh(); ng('keep.ng'); later(() => go(step), 1600); }
      else { SX.whistle(1, .2); ok('keep.ok'); }
    }

    /* ---------- the hand: pick your button, pull back, let go (as in the game) ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .02); return q ? { x: q.x / K, y: q.z / K } : null; };
    const scr = (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); };
    const aims = () => ['flick', 'pass', 'shoot'].includes(P().kind);
    const DEAD = 14, PULL = () => Math.max(110, Math.min(230, Math.min(innerWidth, innerHeight) * .3));
    let kdrag = false;
    function pd(e) {
      if (stopped || busy || played) return;
      const pg = P(), q = toCm(e); if (!q) return;
      if (pg.kind === 'demo') { demo(); return; }
      if (pg.kind === 'tap') { const p = scr(st.ball.x, st.ball.y), px = p ? Math.hypot(p.x - e.clientX, p.y - e.clientY) : 1e9; if (Math.hypot(q.x - st.ball.x, q.y - st.ball.y) < 6 || px < 48) ok('ball.ok'); else ng('ball.ng'); return; }
      if (pg.kind === 'keep') { kdrag = true; moveKeeper(q); try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); return; }
      if (!aims() || sel < 0) return;
      let i = -1; for (let j = 0; j < 10; j++) if (st.b[j].x < 999 && Math.hypot(st.b[j].x - q.x, st.b[j].y - q.y) < D.RB + (e.pointerType === 'mouse' ? 1 : 3)) i = j;
      if (i >= 0) { sel = i; const p = scr(st.b[i].x, st.b[i].y); drag = { id: e.pointerId, anchor: p }; }
      else drag = { id: e.pointerId, anchor: { x: e.clientX, y: e.clientY } };
      try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      document.documentElement.classList.add('hand-drag'); guides(); e.preventDefault();
    }
    function pm(e) {
      if (kdrag) { const q = toCm(e); if (q) moveKeeper(q); return; }
      if (!drag || e.pointerId !== drag.id) return;
      const p0 = drag.anchor, dx = p0.x - e.clientX, dy = p0.y - e.clientY, len = Math.hypot(dx, dy);
      if (len < DEAD) aim = null;
      else { const a = toCm(e), b = toCm({ clientX: p0.x, clientY: p0.y }); if (a && b) aim = { ang: Math.atan2(b.y - a.y, b.x - a.x), pow: Math.max(0, Math.min(1, (len - DEAD) / PULL())) }; }
      guides();
    }
    async function pu(e) {
      if (kdrag) { kdrag = false; return; }
      if (!drag || e.pointerId !== drag.id) return;
      try { ctx.el.releasePointerCapture(drag.id); } catch (er) {}
      document.documentElement.classList.remove('hand-drag');
      const a = aim; drag = null; aim = null;
      if (a && a.pow >= .04 && !busy && !played && aims()) { flickDone(await flick(assisted(aimMove(a), a))); return; }
      guides();
    }
    function moveKeeper(q) { E.setKeeper(st, 0, q.x, q.y); put(kp[0], st.k[0].x, st.k[0].y); kick(100); }
    const wu = e => { if ((drag && e.pointerId === drag.id) || kdrag) pu(e); };
    const wm = e => { if ((drag && e.pointerId === drag.id) || kdrag) { if (e.target !== ctx.el && !ctx.el.contains(e.target)) pm(e); } };
    ctx.el.addEventListener('pointerdown', pd); ctx.el.addEventListener('pointermove', pm); ctx.el.addEventListener('pointerup', pu); ctx.el.addEventListener('pointercancel', pu);
    addEventListener('pointermove', wm, true); addEventListener('pointerup', wu, true); addEventListener('pointercancel', wu, true);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';
    $('[data-a=next]').onclick = () => { if (P().last) ctx.onStart(); else if (P().kind === 'demo' && !played) demo(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); if (P().kind === 'keep' && !played && e.key === 'Enter') { keepShot(); return; } const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    say('…'); buttons();
    later(() => go(0), 300);
    const sess = {
      stop() { stopped = true; clearInterval(typeT); clearInterval(pulseT); timers.forEach(clearTimeout); ctx.el.removeEventListener('pointerdown', pd); ctx.el.removeEventListener('pointermove', pm); ctx.el.removeEventListener('pointerup', pu); ctx.el.removeEventListener('pointercancel', pu); removeEventListener('pointermove', wm, true); removeEventListener('pointerup', wu, true); removeEventListener('pointercancel', wu, true); document.documentElement.classList.remove('hand-drag'); ctx.el.style.touchAction = prevTouch; removeEventListener('resize', lockH); removeEventListener('resize', onResizeF); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose()); board.remove(beacon); beacon.geometry.dispose(); beacon.material.dispose(); },
      panel: el,
      _debug: { step: () => step, played: () => played, go, st: () => st, at: (x, y) => scr(x, y), flick: async (i, ang, pw) => { sel = i; const a = { ang, pow: pw }; return flickDone(await flick(assisted(aimMove(a), a))); }, keepShot, demo, setKeeper: (x, y) => moveKeeper({ x, y }) },
    };
    window.__rulesSess = sess;
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.botao = { start };
})();
