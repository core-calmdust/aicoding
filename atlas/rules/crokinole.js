/* =====================================================================
   Crokinole — rules tour on the 3D table (atlas/models/crokinole.js), told by Maple the beaver (a Canadian, like the game).
   Pages: the board (the rings and the 20 hole), placing the disc on the shooting line, an open shot to the 15 circle, a shot
   that has to hit (an opponent's disc on the board), a 20, a miss is a foul (watch), the score of a disc (lines count the
   lower value), how a game is won. The shots use the game's own hand (Atlas3D.carrom.Hand), so the tour is also the
   controls tutorial; they are helped a little (an aim within 9° of the right line is set on it, the power too).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }. Opening the tour sets aicoding-crokinole-rules-seen.
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/beaver-1.webp';
  const UI = {
    ja: { name: 'メイプル', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tapIt: '盤の上でやってみよう', watch: 'タップしてお手本', origin: 'カナダ', players: '2人（4人のペアも）', time: '1ゲーム 約15〜25分' },
    en: { name: 'Maple', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tapIt: 'Try it on the board', watch: 'Tap to watch', origin: 'Canada', players: '2 players (or 4 in pairs)', time: 'about 15–25 min a game' },
    zh: { name: '枫枫', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tapIt: '在棋盘上试试', watch: '点击看示范', origin: '加拿大', players: '2人（也可4人组队）', time: '每局约15–25分钟' },
    'zh-TW': { name: '楓楓', next: '下一步', back: '返回', start: '來對局吧', again: '再一次', tapIt: '在棋盤上試試', watch: '點一下看示範', origin: '加拿大', players: '2人（也可4人組隊）', time: '每局約15–25分鐘' },
    ko: { name: '메이플', next: '다음', back: '이전', start: '대국하기', again: '다시', tapIt: '판 위에서 해 봐', watch: '탭해서 시범 보기', origin: '캐나다', players: '2명 (4명 짝도)', time: '한 게임 약 15~25분' },
    es: { name: 'Maple', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tapIt: 'Pruébalo en el tablero', watch: 'Toca para verlo', origin: 'Canadá', players: '2 jugadores (o 4 en parejas)', time: 'unos 15–25 min por partida' },
    fr: { name: 'Érable', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tapIt: 'Essaie sur le plateau', watch: 'Touche pour voir', origin: 'Canada', players: '2 joueurs (ou 4 en équipes)', time: 'environ 15–25 min par partie' },
    pt: { name: 'Maple', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tapIt: 'Tente no tabuleiro', watch: 'Toque para ver', origin: 'Canadá', players: '2 jogadores (ou 4 em duplas)', time: 'cerca de 15–25 min por partida' },
    de: { name: 'Maple', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tapIt: 'Probier es auf dem Brett', watch: 'Tippen zum Zuschauen', origin: 'Kanada', players: '2 Spieler (oder 4 im Doppel)', time: 'etwa 15–25 Min. pro Spiel' },
    ru: { name: 'Мейпл', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tapIt: 'Попробуй на доске', watch: 'Нажми, чтобы посмотреть', origin: 'Канада', players: '2 игрока (или 4 в парах)', time: 'около 15–25 мин на игру' },
    tr: { name: 'Maple', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tapIt: 'Tahtada dene', watch: 'İzlemek için dokun', origin: 'Kanada', players: '2 oyuncu (ya da 4 kişilik çiftler)', time: 'oyun başına 15–25 dk' },
    id: { name: 'Maple', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tapIt: 'Coba di papan', watch: 'Ketuk untuk melihat', origin: 'Kanada', players: '2 pemain (atau 4 berpasangan)', time: 'sekitar 15–25 menit per permainan' },
    hi: { name: 'मेपल', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tapIt: 'बोर्ड पर करके देखो', watch: 'देखने के लिए छुओ', origin: 'कनाडा', players: '2 खिलाड़ी (या 4 जोड़ियों में)', time: 'एक खेल लगभग 15–25 मिनट' },
    ar: { name: 'مابل', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tapIt: 'جرّب على اللوحة', watch: 'المس لتشاهد', origin: 'كندا', players: 'لاعبان (أو 4 في فريقين)', time: 'نحو 15–25 دقيقة للعبة' },
  };
  const HELLO = {
    ja: 'こんにちは！ カナダ生まれのビーバー、<b>メイプル</b>です。<b>クロキノール</b>はカナダのおはじき。丸い盤の外側から指で駒をはじいて、<b>真ん中に近いほど高得点</b>。ど真ん中の穴に入れば<b>20点</b>！',
    en: 'Hello! I’m <b>Maple</b>, a beaver from Canada. <b>Crokinole</b> is Canada’s flicking game: flick your discs in from the edge of a round board — <b>the nearer the middle, the more they score</b>, and the hole in the very centre is <b>20</b>!',
    zh: '你好！我是加拿大的河狸<b>枫枫</b>。<b>克罗基诺</b>是加拿大的弹子游戏：从圆盘外侧用手指把棋子弹进来，<b>越靠近中心分越高</b>，正中间的洞是<b>20分</b>！',
    'zh-TW': '你好！我是加拿大的河狸<b>楓楓</b>。<b>克羅基諾</b>是加拿大的彈子遊戲：從圓盤外側用手指把棋子彈進來，<b>越靠近中心分越高</b>，正中間的洞是<b>20分</b>！',
    ko: '안녕! 캐나다에서 온 비버 <b>메이플</b>이야. <b>크로키놀</b>은 캐나다의 알까기야. 둥근 판 바깥에서 손가락으로 말을 튕겨서, <b>가운데에 가까울수록 높은 점수</b>. 한가운데 구멍에 들어가면 <b>20점</b>!',
    es: '¡Hola! Soy <b>Maple</b>, una castora de Canadá. El <b>crokinole</b> es el juego de dedo canadiense: lanza tus discos desde el borde de un tablero redondo; <b>cuanto más cerca del centro, más puntos</b>, ¡y el agujero central vale <b>20</b>!',
    fr: 'Bonjour ! Je suis <b>Érable</b>, une castor du Canada. Le <b>crokinole</b> est le jeu de pichenette canadien : lance tes palets depuis le bord d’un plateau rond — <b>plus près du centre, plus de points</b>, et le trou du milieu vaut <b>20</b> !',
    pt: 'Olá! Sou a <b>Maple</b>, uma castora do Canadá. O <b>crokinole</b> é o jogo de peteleco canadense: lance seus discos da borda de um tabuleiro redondo — <b>quanto mais perto do centro, mais pontos</b>, e o buraco do meio vale <b>20</b>!',
    de: 'Hallo! Ich bin <b>Maple</b>, ein Biber aus Kanada. <b>Crokinole</b> ist Kanadas Schnippspiel: Schnipp deine Scheiben vom Rand eines runden Bretts herein — <b>je näher an der Mitte, desto mehr Punkte</b>, und das Loch ganz in der Mitte zählt <b>20</b>!',
    ru: 'Привет! Я <b>Мейпл</b>, бобриха из Канады. <b>Крокинол</b> — канадская игра в щелчки: щёлкай шайбы с края круглой доски — <b>чем ближе к центру, тем больше очков</b>, а лунка в самом центре — <b>20</b>!',
    tr: 'Merhaba! Ben Kanadalı kunduz <b>Maple</b>. <b>Crokinole</b> Kanada’nın fiske oyunu: pullarını yuvarlak tahtanın kenarından fiskele — <b>merkeze ne kadar yakınsa o kadar puan</b>, tam ortadaki delik <b>20</b>!',
    id: 'Halo! Aku <b>Maple</b>, berang-berang dari Kanada. <b>Crokinole</b> adalah permainan sentil Kanada: sentil kepingmu dari tepi papan bundar — <b>makin dekat ke tengah, makin besar poinnya</b>, dan lubang di tengah bernilai <b>20</b>!',
    hi: 'नमस्ते! मैं कनाडा की ऊदबिलाव <b>मेपल</b> हूँ। <b>क्रोकिनोल</b> कनाडा का खेल है: गोल बोर्ड के किनारे से डिस्क मारो — <b>बीच के जितने पास, उतने ज़्यादा अंक</b>, और ठीक बीच का छेद <b>20</b> का!',
    ar: 'مرحبًا! أنا <b>مابل</b>، قندس من كندا. <b>الكروكينول</b> لعبة النقر الكندية: انقر أقراصك من حافة لوحة مستديرة — <b>كلما اقتربت من الوسط زادت النقاط</b>، والحفرة في المنتصف تساوي <b>20</b>!',
  };
  const VOICE = {
    ja: {
      'board.t': '盤と点数', 'board.b': '円の内側ほど高得点：外から<b>5・10・15点</b>。15点の円には<b>8本のペグ</b>が立って、真ん中の<b>穴が20点</b>。外の溝に落ちた駒は0点だよ。', 'board.k': '20点の穴をタップしてね', 'board.ok': 'そこ！ 狙うのはいつも真ん中', 'board.ng': '20点は、ど真ん中の小さな穴だよ',
      'slide.t': '位置を決める', 'slide.b': '駒は<b>手前の一番外の線（5の線）の上</b>、自分の区画（斜めの線の間）ならどこからでも打てるよ。{place}、動かしてみて。', 'slide.k': '駒を光る印まで動かそう', 'slide.ok': 'ぴったり！ ダムづくりも位置が大事',
      'open.t': '15の円まで', 'open.b': '盤に<b>相手の駒がない時</b>は、<b>15点の円（ペグの輪）に入るか触れる</b>まで届かせないと反則。{pull}、{rel}打とう。強すぎると反対の溝へ！', 'open.k': '駒を15点の円の中で止めよう', 'open.ok': 'いい止まり方！ 15点ゲット', 'open.ng': '惜しい！ 力をもう少し調整してみて',
      'hit.t': '当てるのがルール', 'hit.b': '<b>相手の駒が盤にある時</b>は、<b>必ず相手の駒に当てる</b>（自分の駒を押して当ててもOK）。当てて外に出せれば大チャンス！', 'hit.k': '黒い駒に当てよう', 'hit.ok': 'カツン！ ナイスヒット', 'hit.ng': '当たらなかった… 輪を黒い駒に合わせてみて',
      'twenty.t': '20点を狙う', 'twenty.b': '真ん中の穴に<b>ぴたっと入れば20点</b>。入った駒はすぐ取り出して、ラウンドの終わりに数えるよ。速すぎると穴を飛び越えちゃう。そーっとね。', 'twenty.k': '駒を真ん中の穴に入れよう', 'twenty.ok': 'ストン！ 20点だ！', 'twenty.ng': 'あとちょっと！ やさしく真ん中へ',
      'foul.t': '当たらないと反則', 'foul.b': '相手の駒があるのに<b>当たらなかったら反則</b>。打った駒は<b>溝に取り除かれる</b>（その時動いた自分の駒も）。', 'foul.k': 'タップしてお手本を見てね', 'foul.ok': 'ね、外れた駒は溝へ。当てるのが大事！',
      'score.t': '線の上は低い方', 'score.b': '駒が<b>線に触れていたら低い方の点</b>。外の線（5の線）に触れて止まった駒は溝へ行って0点。', 'score.k': '15点になる駒をタップしてね', 'score.ok': '正解！ 線に触れていないのが15点', 'score.ng': 'それは線に触れているか外側だよ',
      'win.t': 'これで遊べるよ！', 'win.b': '1ラウンドはお互い<b>8枚</b>を交互に。ラウンドの点数が多い方が勝ち：大会式は<b>4ラウンドで勝ち2点・引き分け1点</b>、「100点先取」は差を足していくよ。さあ、ビーバーと一勝負！',
    },
    en: {
      'board.t': 'The board and the points', 'board.b': 'The further in, the more it scores: <b>5, 10 and 15</b> from the outside. <b>Eight pegs</b> guard the 15 circle, and the <b>hole in the middle is 20</b>. A disc in the ditch round the edge scores nothing.', 'board.k': 'Tap the 20 hole', 'board.ok': 'That’s it! Always aim for the middle', 'board.ng': 'The 20 is the little hole right in the centre',
      'slide.t': 'Placing your disc', 'slide.b': 'You shoot from <b>the outer (5) line nearest you</b>, anywhere in your own quarter (between the diagonal lines). {place} to move it.', 'slide.k': 'Move the disc to the glowing mark', 'slide.ok': 'Spot on! Dams need good placing too',
      'open.t': 'Reach the 15 circle', 'open.b': 'With <b>no opponent’s disc on the board</b>, your shot must <b>end in or touching the 15 circle</b> (the ring of pegs) — otherwise it’s a foul. {pull} and {rel}. Too hard and it rolls into the far ditch!', 'open.k': 'Stop your disc inside the 15 circle', 'open.ok': 'Nicely stopped! That’s 15', 'open.ng': 'Close! Try a little more or less power',
      'hit.t': 'You must hit', 'hit.b': 'With <b>an opponent’s disc on the board</b>, your shot <b>must hit one</b> (pushing one of yours into it counts too). Knock it into the ditch and you’re laughing!', 'hit.k': 'Hit the black disc', 'hit.ok': 'Clack! Nice hit', 'hit.ng': 'Missed… put the ring on the black disc',
      'twenty.t': 'Going for 20', 'twenty.b': 'A disc that <b>drops flat into the hole scores 20</b>. It comes out at once and is counted at the end of the round. Too fast and it skips over — gently does it.', 'twenty.k': 'Drop your disc into the hole', 'twenty.ok': 'Plop! A 20!', 'twenty.ng': 'So close! Softly to the middle',
      'foul.t': 'A miss is a foul', 'foul.b': 'If an opponent’s disc is on the board and you <b>don’t hit it, it’s a foul</b>: your shot disc goes <b>into the ditch</b> (and any of yours it moved).', 'foul.k': 'Tap to watch', 'foul.ok': 'See? The miss goes to the ditch. Hitting matters!',
      'score.t': 'On a line? The lower score', 'score.b': 'A disc <b>touching a line scores the lower value</b>. One that stops touching the outer (5) line goes to the ditch: nothing.', 'score.k': 'Tap the disc that scores 15', 'score.ok': 'Right! It doesn’t touch a line: 15', 'score.ng': 'That one touches a line or lies further out',
      'win.t': 'You’re ready!', 'win.b': 'In a round you take turns with <b>8 discs</b> each. The higher round score wins: tournament style is <b>4 rounds, 2 points a win, 1 a tie</b>; “first to 100” adds up the difference. Let’s play, beaver style!',
    },
    zh: {
      'board.t': '棋盘与分数', 'board.b': '越往里分越高：从外到内是<b>5、10、15分</b>。15分圈上立着<b>8根柱子</b>，正中间的<b>洞是20分</b>。掉进外圈沟里的子是0分。', 'board.k': '点一下20分的洞', 'board.ok': '对！永远瞄准中间', 'board.ng': '20分是正中间的小洞哦',
      'slide.t': '摆放棋子', 'slide.b': '棋子要放在<b>靠近你的最外圈线（5分线）上</b>，在自己的区域（两条斜线之间）哪里都行。{place}来移动吧。', 'slide.k': '把棋子移到发光的记号', 'slide.ok': '刚刚好！筑坝也讲究位置',
      'open.t': '弹进15分圈', 'open.b': '盘上<b>没有对方棋子时</b>，必须让棋子<b>停在15分圈（柱子圈）内或压线</b>，否则犯规。{pull}，{rel}就弹出去。太用力会掉进对面的沟！', 'open.k': '让棋子停在15分圈里', 'open.ok': '停得漂亮！拿到15分', 'open.ng': '可惜！再调一下力度',
      'hit.t': '必须碰到', 'hit.b': '盘上<b>有对方棋子时</b>，<b>一定要碰到对方的子</b>（推着自己的子去碰也行）。把它撞进沟里就太棒了！', 'hit.k': '碰到黑色棋子', 'hit.ok': '咔！打得好', 'hit.ng': '没碰到…把圈对准黑子',
      'twenty.t': '瞄准20分', 'twenty.b': '棋子<b>平平地落进洞里就是20分</b>，马上取出来，到回合结束再算。太快会跳过洞，要轻轻地。', 'twenty.k': '把棋子弹进中间的洞', 'twenty.ok': '咚！20分！', 'twenty.ng': '差一点！轻轻地送到中间',
      'foul.t': '没碰到就犯规', 'foul.b': '有对方的子却<b>没碰到就犯规</b>，弹出的棋子要<b>移进沟里</b>（被它推动的自己的子也一样）。', 'foul.k': '点击看示范', 'foul.ok': '看，没碰到的子进沟了。碰到才重要！',
      'score.t': '压线算低分', 'score.b': '棋子<b>压到线就算较低的分</b>。停在最外圈线（5分线）上的子要进沟，算0分。', 'score.k': '点一下得15分的棋子', 'score.ok': '答对了！没压线就是15分', 'score.ng': '那个压线了，或者在更外面',
      'win.t': '可以开始玩啦！', 'win.b': '一回合双方各<b>8枚</b>轮流弹。回合分数高的一方获胜：比赛式是<b>4回合，赢得2分、平局1分</b>；“先到100分”则累计分差。来和河狸比一场吧！',
    },
    'zh-TW': {
      'board.t': '棋盤與分數', 'board.b': '越往裡分越高：由外到內是<b>5、10、15分</b>。15分圈上立著<b>8根柱子</b>，正中間的<b>洞是20分</b>。掉進外圈溝裡的子是0分。', 'board.k': '點一下20分的洞', 'board.ok': '對！永遠瞄準中間', 'board.ng': '20分是正中間的小洞喔',
      'slide.t': '擺放棋子', 'slide.b': '棋子要放在<b>靠近你的最外圈線（5分線）上</b>，在自己的區域（兩條斜線之間）哪裡都行。{place}來移動吧。', 'slide.k': '把棋子移到發光的記號', 'slide.ok': '剛剛好！築壩也講究位置',
      'open.t': '彈進15分圈', 'open.b': '盤上<b>沒有對方棋子時</b>，必須讓棋子<b>停在15分圈（柱子圈）內或壓線</b>，否則犯規。{pull}，{rel}就彈出去。太用力會掉進對面的溝！', 'open.k': '讓棋子停在15分圈裡', 'open.ok': '停得漂亮！拿到15分', 'open.ng': '可惜！再調一下力道',
      'hit.t': '一定要碰到', 'hit.b': '盤上<b>有對方棋子時</b>，<b>一定要碰到對方的子</b>（推著自己的子去碰也行）。把它撞進溝裡就太棒了！', 'hit.k': '碰到黑色棋子', 'hit.ok': '喀！打得好', 'hit.ng': '沒碰到…把圈對準黑子',
      'twenty.t': '瞄準20分', 'twenty.b': '棋子<b>平平地落進洞裡就是20分</b>，馬上取出，到回合結束再算。太快會跳過洞，要輕輕地。', 'twenty.k': '把棋子彈進中間的洞', 'twenty.ok': '咚！20分！', 'twenty.ng': '差一點！輕輕地送到中間',
      'foul.t': '沒碰到就犯規', 'foul.b': '有對方的子卻<b>沒碰到就犯規</b>，彈出的棋子要<b>移進溝裡</b>（被它推動的自己的子也一樣）。', 'foul.k': '點一下看示範', 'foul.ok': '看，沒碰到的子進溝了。碰到才重要！',
      'score.t': '壓線算低分', 'score.b': '棋子<b>壓到線就算較低的分</b>。停在最外圈線（5分線）上的子要進溝，算0分。', 'score.k': '點一下得15分的棋子', 'score.ok': '答對了！沒壓線就是15分', 'score.ng': '那個壓線了，或在更外面',
      'win.t': '可以開始玩啦！', 'win.b': '一回合雙方各<b>8枚</b>輪流彈。回合分數高的一方獲勝：比賽式是<b>4回合，贏得2分、平手1分</b>；「先到100分」則累計分差。來和河狸比一場吧！',
    },
    ko: {
      'board.t': '판과 점수', 'board.b': '안쪽일수록 높은 점수: 바깥부터 <b>5·10·15점</b>. 15점 원에는 <b>페그 8개</b>가 서 있고, 한가운데 <b>구멍은 20점</b>. 바깥 도랑에 떨어진 말은 0점이야.', 'board.k': '20점 구멍을 탭해 봐', 'board.ok': '거기! 언제나 가운데를 노려', 'board.ng': '20점은 한가운데 작은 구멍이야',
      'slide.t': '위치 정하기', 'slide.b': '말은 <b>내 쪽 가장 바깥 선(5점 선) 위</b>, 내 구역(대각선 사이)이면 어디서든 칠 수 있어. {place} 움직여 봐.', 'slide.k': '말을 빛나는 표시까지 옮기자', 'slide.ok': '딱 맞아! 댐 짓기도 위치가 중요해',
      'open.t': '15점 원까지', 'open.b': '판에 <b>상대 말이 없을 때</b>는 <b>15점 원(페그 고리) 안에 들어가거나 닿아야</b> 해. 아니면 반칙. {pull}, {rel} 쳐. 너무 세면 반대편 도랑으로!', 'open.k': '말을 15점 원 안에 멈추자', 'open.ok': '잘 멈췄어! 15점', 'open.ng': '아깝다! 힘을 조금 조절해 봐',
      'hit.t': '맞혀야 하는 규칙', 'hit.b': '판에 <b>상대 말이 있을 때</b>는 <b>꼭 상대 말을 맞혀야</b> 해 (내 말을 밀어서 맞혀도 OK). 도랑으로 날려 버리면 대성공!', 'hit.k': '검은 말을 맞히자', 'hit.ok': '딱! 나이스 히트', 'hit.ng': '못 맞혔어… 고리를 검은 말에 맞춰 봐',
      'twenty.t': '20점 노리기', 'twenty.b': '가운데 구멍에 <b>쏙 들어가면 20점</b>. 들어간 말은 바로 꺼내서 라운드가 끝날 때 세. 너무 빠르면 구멍을 넘어가니까 살살.', 'twenty.k': '말을 가운데 구멍에 넣자', 'twenty.ok': '쏙! 20점!', 'twenty.ng': '조금만 더! 살살 가운데로',
      'foul.t': '못 맞히면 반칙', 'foul.b': '상대 말이 있는데 <b>못 맞히면 반칙</b>. 친 말은 <b>도랑으로 치워져</b> (그때 움직인 내 말도).', 'foul.k': '탭해서 시범을 봐', 'foul.ok': '봐, 빗나간 말은 도랑으로. 맞히는 게 중요해!',
      'score.t': '선 위는 낮은 점수', 'score.b': '말이 <b>선에 닿아 있으면 낮은 쪽 점수</b>. 바깥 선(5점 선)에 닿아 멈춘 말은 도랑으로 가서 0점.', 'score.k': '15점이 되는 말을 탭해 봐', 'score.ok': '정답! 선에 안 닿은 게 15점', 'score.ng': '그건 선에 닿았거나 더 바깥이야',
      'win.t': '이제 할 수 있어!', 'win.b': '한 라운드는 서로 <b>8개</b>씩 번갈아. 라운드 점수가 높은 쪽이 이겨: 대회식은 <b>4라운드, 이기면 2점·비기면 1점</b>, "100점 선취"는 차이를 더해 가. 비버랑 한판!',
    },
    es: {
      'board.t': 'El tablero y los puntos', 'board.b': 'Cuanto más adentro, más puntos: <b>5, 10 y 15</b> desde fuera. <b>Ocho postes</b> rodean el círculo del 15 y el <b>agujero central vale 20</b>. Un disco en la zanja del borde no puntúa.', 'board.k': 'Toca el agujero del 20', 'board.ok': '¡Eso! Apunta siempre al centro', 'board.ng': 'El 20 es el agujerito justo en el centro',
      'slide.t': 'Colocar tu disco', 'slide.b': 'Tiras desde <b>la línea exterior (la del 5) más cercana</b>, en cualquier punto de tu cuarto (entre las líneas diagonales). {place} para moverlo.', 'slide.k': 'Lleva el disco a la marca brillante', 'slide.ok': '¡Exacto! Para las presas también importa el sitio',
      'open.t': 'Llega al círculo del 15', 'open.b': 'Si <b>no hay discos rivales</b>, tu tiro debe <b>quedar dentro o tocando el círculo del 15</b> (el de los postes); si no, es falta. {pull} y {rel}. ¡Muy fuerte y cae a la zanja de enfrente!', 'open.k': 'Para tu disco dentro del círculo del 15', 'open.ok': '¡Bien parado! Son 15', 'open.ng': '¡Casi! Ajusta un poco la fuerza',
      'hit.t': 'Hay que tocar', 'hit.b': 'Si <b>hay un disco rival</b>, tu tiro <b>debe tocar uno</b> (empujando uno tuyo contra él también vale). ¡Si lo mandas a la zanja, genial!', 'hit.k': 'Toca el disco negro', 'hit.ok': '¡Clac! Buen golpe', 'hit.ng': 'No tocaste… pon el anillo sobre el disco negro',
      'twenty.t': 'A por el 20', 'twenty.b': 'Un disco que <b>cae plano en el agujero vale 20</b>. Se saca enseguida y se cuenta al final de la ronda. Muy rápido y salta por encima: con suavidad.', 'twenty.k': 'Mete tu disco en el agujero', 'twenty.ok': '¡Plof! ¡Un 20!', 'twenty.ng': '¡Casi! Suave hacia el centro',
      'foul.t': 'Fallar es falta', 'foul.b': 'Si hay un disco rival y <b>no lo tocas, es falta</b>: tu disco va <b>a la zanja</b> (y los tuyos que movió).', 'foul.k': 'Toca para verlo', 'foul.ok': '¿Ves? El fallo va a la zanja. ¡Hay que tocar!',
      'score.t': 'En la línea, el valor menor', 'score.b': 'Un disco que <b>toca una línea vale lo menor</b>. Si se para tocando la línea exterior (la del 5), va a la zanja: nada.', 'score.k': 'Toca el disco que vale 15', 'score.ok': '¡Bien! No toca ninguna línea: 15', 'score.ng': 'Ese toca una línea o está más afuera',
      'win.t': '¡Ya puedes jugar!', 'win.b': 'En una ronda se alternan <b>8 discos</b> cada uno. Gana la ronda quien suma más: en torneo, <b>4 rondas, 2 puntos por ganar y 1 por empatar</b>; en «a 100» se suma la diferencia. ¡A jugar con la castora!',
    },
    fr: {
      'board.t': 'Le plateau et les points', 'board.b': 'Plus on est au centre, plus ça rapporte : <b>5, 10 et 15</b> de l’extérieur vers l’intérieur. <b>Huit poteaux</b> gardent le cercle des 15, et le <b>trou du milieu vaut 20</b>. Un palet dans la rigole ne marque rien.', 'board.k': 'Touche le trou des 20', 'board.ok': 'C’est ça ! Vise toujours le centre', 'board.ng': 'Le 20, c’est le petit trou tout au centre',
      'slide.t': 'Placer ton palet', 'slide.b': 'Tu tires depuis <b>la ligne extérieure (celle des 5) de ton côté</b>, n’importe où dans ton quart (entre les lignes en diagonale). {place} pour le déplacer.', 'slide.k': 'Amène le palet sur la marque lumineuse', 'slide.ok': 'Pile ! Pour un barrage aussi, tout est dans la place',
      'open.t': 'Jusqu’au cercle des 15', 'open.b': 'S’il n’y a <b>aucun palet adverse</b>, ton tir doit <b>finir dans le cercle des 15 ou le toucher</b> (l’anneau de poteaux), sinon c’est une faute. {pull} et {rel}. Trop fort, il file dans la rigole d’en face !', 'open.k': 'Arrête ton palet dans le cercle des 15', 'open.ok': 'Bien arrêté ! 15 points', 'open.ng': 'Presque ! Ajuste un peu la force',
      'hit.t': 'Il faut toucher', 'hit.b': 'S’il y a <b>un palet adverse</b>, ton tir <b>doit en toucher un</b> (en poussant un des tiens dessus, ça compte). L’envoyer dans la rigole, c’est le top !', 'hit.k': 'Touche le palet noir', 'hit.ok': 'Clac ! Joli coup', 'hit.ng': 'Raté… mets l’anneau sur le palet noir',
      'twenty.t': 'Viser le 20', 'twenty.b': 'Un palet qui <b>tombe à plat dans le trou vaut 20</b>. On le sort tout de suite et on le compte en fin de manche. Trop vite, il saute par-dessus : tout en douceur.', 'twenty.k': 'Fais tomber ton palet dans le trou', 'twenty.ok': 'Plop ! Un 20 !', 'twenty.ng': 'Presque ! Doucement vers le centre',
      'foul.t': 'Rater, c’est une faute', 'foul.b': 'S’il y a un palet adverse et que tu <b>ne le touches pas, c’est une faute</b> : ton palet part <b>dans la rigole</b> (et les tiens qu’il a bougés).', 'foul.k': 'Touche pour voir', 'foul.ok': 'Tu vois ? Le raté file dans la rigole. Il faut toucher !',
      'score.t': 'Sur une ligne : la valeur basse', 'score.b': 'Un palet qui <b>touche une ligne vaut la valeur la plus basse</b>. S’il s’arrête sur la ligne extérieure (des 5), il va dans la rigole : zéro.', 'score.k': 'Touche le palet qui vaut 15', 'score.ok': 'Oui ! Il ne touche aucune ligne : 15', 'score.ng': 'Celui-là touche une ligne ou est plus loin',
      'win.t': 'Tu es prêt !', 'win.b': 'Dans une manche, chacun joue <b>8 palets</b> à tour de rôle. Le plus haut total gagne la manche : en tournoi, <b>4 manches, 2 points la victoire, 1 l’égalité</b> ; « en 100 points » on cumule l’écart. On joue avec la castor ?',
    },
    pt: {
      'board.t': 'O tabuleiro e os pontos', 'board.b': 'Quanto mais para dentro, mais pontos: <b>5, 10 e 15</b> de fora para dentro. <b>Oito pinos</b> cercam o círculo do 15 e o <b>buraco do meio vale 20</b>. Um disco na canaleta da borda não pontua.', 'board.k': 'Toque no buraco do 20', 'board.ok': 'Isso! Mire sempre no meio', 'board.ng': 'O 20 é o buraquinho bem no centro',
      'slide.t': 'Posicionar o disco', 'slide.b': 'Você lança da <b>linha externa (a do 5) do seu lado</b>, em qualquer ponto do seu quarto (entre as linhas diagonais). {place} para movê-lo.', 'slide.k': 'Leve o disco até a marca brilhante', 'slide.ok': 'Na mosca! Até represa precisa de bom lugar',
      'open.t': 'Até o círculo do 15', 'open.b': 'Sem <b>discos do rival no tabuleiro</b>, seu lance deve <b>parar dentro ou tocando o círculo do 15</b> (o dos pinos); senão é falta. {pull} e {rel}. Forte demais e cai na canaleta do outro lado!', 'open.k': 'Pare o disco dentro do círculo do 15', 'open.ok': 'Parou bonito! São 15', 'open.ng': 'Quase! Ajuste um pouco a força',
      'hit.t': 'Tem que acertar', 'hit.b': 'Com <b>um disco do rival no tabuleiro</b>, seu lance <b>tem de acertar um</b> (empurrar um seu contra ele também vale). Mandá-lo para a canaleta é ótimo!', 'hit.k': 'Acerte o disco preto', 'hit.ok': 'Tac! Boa!', 'hit.ng': 'Errou… ponha o anel sobre o disco preto',
      'twenty.t': 'Atrás do 20', 'twenty.b': 'Um disco que <b>cai deitado no buraco vale 20</b>. Sai na hora e conta no fim da rodada. Rápido demais, ele pula por cima: com jeitinho.', 'twenty.k': 'Ponha o disco no buraco', 'twenty.ok': 'Plim! Um 20!', 'twenty.ng': 'Quase! Suave até o meio',
      'foul.t': 'Errar é falta', 'foul.b': 'Se há disco do rival e você <b>não acerta, é falta</b>: seu disco vai <b>para a canaleta</b> (e os seus que ele moveu).', 'foul.k': 'Toque para ver', 'foul.ok': 'Viu? O erro vai para a canaleta. Acertar é o que importa!',
      'score.t': 'Na linha, vale o menor', 'score.b': 'Um disco que <b>toca uma linha vale o valor menor</b>. Se parar tocando a linha externa (do 5), vai para a canaleta: zero.', 'score.k': 'Toque no disco que vale 15', 'score.ok': 'Certo! Não toca nenhuma linha: 15', 'score.ng': 'Esse toca uma linha ou está mais para fora',
      'win.t': 'Pronto para jogar!', 'win.b': 'Numa rodada cada um joga <b>8 discos</b>, alternando. Vence a rodada quem soma mais: no torneio, <b>4 rodadas, 2 pontos a vitória e 1 o empate</b>; em “até 100” soma-se a diferença. Vamos jogar com a castora!',
    },
    de: {
      'board.t': 'Brett und Punkte', 'board.b': 'Je weiter innen, desto mehr Punkte: <b>5, 10 und 15</b> von außen nach innen. <b>Acht Pfosten</b> bewachen den 15er-Kreis, und das <b>Loch in der Mitte zählt 20</b>. Eine Scheibe im Graben am Rand zählt nichts.', 'board.k': 'Tippe auf das 20er-Loch', 'board.ok': 'Genau! Immer auf die Mitte zielen', 'board.ng': 'Die 20 ist das kleine Loch ganz in der Mitte',
      'slide.t': 'Deine Scheibe setzen', 'slide.b': 'Du schießt von <b>der äußeren (5er-)Linie auf deiner Seite</b>, überall in deinem Viertel (zwischen den Diagonalen). {place}, um sie zu verschieben.', 'slide.k': 'Schieb die Scheibe zur leuchtenden Marke', 'slide.ok': 'Genau richtig! Auch beim Dammbau zählt der Platz',
      'open.t': 'Bis in den 15er-Kreis', 'open.b': 'Liegt <b>keine gegnerische Scheibe</b> auf dem Brett, muss dein Schuss <b>im 15er-Kreis (dem Pfostenring) liegen bleiben oder ihn berühren</b> – sonst Foul. {pull} und {rel}. Zu fest, und sie rollt in den Graben gegenüber!', 'open.k': 'Bring die Scheibe im 15er-Kreis zum Stehen', 'open.ok': 'Schön gestoppt! Das sind 15', 'open.ng': 'Fast! Ein bisschen mehr oder weniger Kraft',
      'hit.t': 'Treffen ist Pflicht', 'hit.b': 'Liegt <b>eine gegnerische Scheibe</b> auf dem Brett, <b>muss dein Schuss eine treffen</b> (auch über eine eigene). Schießt du sie in den Graben – super!', 'hit.k': 'Triff die schwarze Scheibe', 'hit.ok': 'Klack! Schöner Treffer', 'hit.ng': 'Daneben… leg den Ring auf die schwarze Scheibe',
      'twenty.t': 'Auf die 20', 'twenty.b': 'Eine Scheibe, die <b>flach ins Loch fällt, zählt 20</b>. Sie wird gleich herausgenommen und am Rundenende gezählt. Zu schnell springt sie darüber – ganz sanft.', 'twenty.k': 'Lass deine Scheibe ins Loch fallen', 'twenty.ok': 'Plopp! Eine 20!', 'twenty.ng': 'Fast! Sanft zur Mitte',
      'foul.t': 'Verfehlen ist ein Foul', 'foul.b': 'Liegt eine gegnerische Scheibe da und du <b>triffst sie nicht, ist es ein Foul</b>: deine Scheibe kommt <b>in den Graben</b> (und eigene, die sie bewegt hat).', 'foul.k': 'Tippen zum Zuschauen', 'foul.ok': 'Siehst du? Der Fehlschuss landet im Graben. Treffen zählt!',
      'score.t': 'Auf der Linie: der kleinere Wert', 'score.b': 'Eine Scheibe, die <b>eine Linie berührt, zählt den kleineren Wert</b>. Bleibt sie auf der äußeren (5er-)Linie liegen, kommt sie in den Graben: null.', 'score.k': 'Tippe auf die Scheibe, die 15 zählt', 'score.ok': 'Richtig! Sie berührt keine Linie: 15', 'score.ng': 'Die berührt eine Linie oder liegt weiter außen',
      'win.t': 'Los geht’s!', 'win.b': 'In einer Runde spielt ihr abwechselnd je <b>8 Scheiben</b>. Die höhere Rundensumme gewinnt: im Turnier <b>4 Runden, 2 Punkte für den Sieg, 1 fürs Remis</b>; bei „bis 100“ zählt der Unterschied. Auf eine Partie mit dem Biber!',
    },
    ru: {
      'board.t': 'Доска и очки', 'board.b': 'Чем ближе к центру, тем больше очков: <b>5, 10 и 15</b> снаружи внутрь. Круг «15» охраняют <b>восемь штырьков</b>, а <b>лунка в центре — 20</b>. Шайба в канавке по краю — ноль.', 'board.k': 'Нажми на лунку «20»', 'board.ok': 'Точно! Всегда целься в центр', 'board.ng': '«20» — это маленькая лунка в самом центре',
      'slide.t': 'Ставим шайбу', 'slide.b': 'Бьёшь с <b>внешней линии («5») со своей стороны</b>, из любого места своей четверти (между диагоналями). {place}, чтобы сдвинуть.', 'slide.k': 'Сдвинь шайбу к светящейся метке', 'slide.ok': 'В точку! Для плотины тоже важно место',
      'open.t': 'До круга «15»', 'open.b': 'Если <b>шайб соперника нет</b>, твоя должна <b>остановиться в круге «15» (кольцо штырьков) или касаться его</b> — иначе фол. {pull} и {rel}. Слишком сильно — улетит в дальнюю канавку!', 'open.k': 'Останови шайбу в круге «15»', 'open.ok': 'Отличная остановка! 15 очков', 'open.ng': 'Почти! Чуть поправь силу',
      'hit.t': 'Нужно попасть', 'hit.b': 'Если <b>шайба соперника на доске</b>, ты <b>обязан задеть хоть одну</b> (и через свою шайбу тоже можно). Выбить её в канавку — то, что надо!', 'hit.k': 'Задень чёрную шайбу', 'hit.ok': 'Щёлк! Отличный удар', 'hit.ng': 'Мимо… наведи кольцо на чёрную шайбу',
      'twenty.t': 'Идём на 20', 'twenty.b': 'Шайба, <b>легшая в лунку, — 20 очков</b>. Её сразу достают и считают в конце раунда. Слишком быстро — перескочит: мягко.', 'twenty.k': 'Опусти шайбу в лунку', 'twenty.ok': 'Плюх! 20!', 'twenty.ng': 'Почти! Мягко к центру',
      'foul.t': 'Промах — фол', 'foul.b': 'Если шайба соперника есть, а ты <b>её не задел — фол</b>: твоя шайба <b>уходит в канавку</b> (и свои, что она сдвинула).', 'foul.k': 'Нажми, чтобы посмотреть', 'foul.ok': 'Видишь? Промах — в канавку. Главное попасть!',
      'score.t': 'На линии — меньшее', 'score.b': 'Шайба, <b>касающаяся линии, даёт меньшее значение</b>. Остановилась на внешней линии («5») — в канавку, ноль.', 'score.k': 'Нажми на шайбу, что даёт 15', 'score.ok': 'Верно! Не касается линии — 15', 'score.ng': 'Эта касается линии или лежит дальше',
      'win.t': 'Можно играть!', 'win.b': 'В раунде вы по очереди бьёте по <b>8 шайб</b>. Раунд выигрывает тот, у кого больше: в турнире <b>4 раунда, победа 2 очка, ничья 1</b>; «до 100» — складывается разница. Сыграем с бобрихой!',
    },
    tr: {
      'board.t': 'Tahta ve puanlar', 'board.b': 'İçe gittikçe puan artar: dıştan içe <b>5, 10 ve 15</b>. 15 dairesini <b>sekiz direk</b> korur, <b>ortadaki delik 20</b>. Kenardaki oluğa düşen pul 0 puan.', 'board.k': '20 deliğine dokun', 'board.ok': 'İşte orası! Hep ortayı hedefle', 'board.ng': '20, tam ortadaki küçük delik',
      'slide.t': 'Pulu yerleştir', 'slide.b': 'Atış, <b>senin taraftaki dış (5) çizginin üstünden</b>, kendi çeyreğinde (çaprazlar arasında) her yerden yapılır. {place} ve kaydır.', 'slide.k': 'Pulu parlayan işarete götür', 'slide.ok': 'Tam yerinde! Baraj kurarken de yer önemli',
      'open.t': '15 dairesine kadar', 'open.b': 'Tahtada <b>rakip pul yoksa</b>, atışın <b>15 dairesinin (direk halkası) içinde ya da ona değerek</b> durmalı, yoksa faul. {pull} ve {rel}. Fazla sert olursa karşı oluğa gider!', 'open.k': 'Pulunu 15 dairesinde durdur', 'open.ok': 'Güzel durdu! 15 puan', 'open.ng': 'Az kaldı! Gücü biraz ayarla',
      'hit.t': 'Değmek şart', 'hit.b': 'Tahtada <b>rakip pul varsa</b>, atışın <b>mutlaka birine değmeli</b> (kendi pulunu iterek de olur). Onu oluğa gönderirsen harika!', 'hit.k': 'Siyah pula vur', 'hit.ok': 'Tak! Güzel vuruş', 'hit.ng': 'Değmedi… halkayı siyah pula getir',
      'twenty.t': '20’ye oyna', 'twenty.b': 'Deliğe <b>düz düşen pul 20 puan</b>. Hemen çıkarılır, tur sonunda sayılır. Hızlıysa üstünden atlar: yavaşça.', 'twenty.k': 'Pulunu deliğe düşür', 'twenty.ok': 'Tık! 20!', 'twenty.ng': 'Az kaldı! Yavaşça ortaya',
      'foul.t': 'Iska faul', 'foul.b': 'Rakip pul varken <b>ona değmezsen faul</b>: atılan pul <b>oluğa alınır</b> (oynattığı kendi pulların da).', 'foul.k': 'İzlemek için dokun', 'foul.ok': 'Gördün mü? Iska oluğa gider. Değmek önemli!',
      'score.t': 'Çizgideyse düşük olan', 'score.b': '<b>Çizgiye değen pul düşük değeri</b> alır. Dış (5) çizgiye değerek duran pul oluğa gider: sıfır.', 'score.k': '15 puanlık pula dokun', 'score.ok': 'Doğru! Hiçbir çizgiye değmiyor: 15', 'score.ng': 'O bir çizgiye değiyor ya da daha dışarıda',
      'win.t': 'Hazırsın!', 'win.b': 'Bir turda sırayla <b>8’er pul</b> atılır. Tur puanı yüksek olan kazanır: turnuvada <b>4 tur, galibiyet 2, beraberlik 1 puan</b>; “100’e” modunda fark toplanır. Kunduzla bir el!',
    },
    id: {
      'board.t': 'Papan dan poin', 'board.b': 'Makin ke dalam, makin besar: <b>5, 10, dan 15</b> dari luar. <b>Delapan pasak</b> menjaga lingkaran 15, dan <b>lubang di tengah bernilai 20</b>. Keping di parit tepi bernilai nol.', 'board.k': 'Ketuk lubang 20', 'board.ok': 'Betul! Selalu incar tengah', 'board.ng': '20 adalah lubang kecil tepat di tengah',
      'slide.t': 'Menaruh keping', 'slide.b': 'Kamu menyentil dari <b>garis luar (garis 5) di sisimu</b>, di mana saja dalam kuadranmu (di antara garis diagonal). {place} untuk menggesernya.', 'slide.k': 'Geser keping ke tanda yang menyala', 'slide.ok': 'Pas! Bikin bendungan juga soal posisi',
      'open.t': 'Sampai lingkaran 15', 'open.b': 'Jika <b>tak ada keping lawan</b>, sentilanmu harus <b>berhenti di dalam atau menyentuh lingkaran 15</b> (cincin pasak); kalau tidak, pelanggaran. {pull} lalu {rel}. Terlalu kuat, masuk parit seberang!', 'open.k': 'Hentikan keping di dalam lingkaran 15', 'open.ok': 'Berhenti pas! Dapat 15', 'open.ng': 'Hampir! Atur sedikit tenaganya',
      'hit.t': 'Wajib kena', 'hit.b': 'Jika <b>ada keping lawan</b>, sentilanmu <b>harus mengenai satu</b> (mendorong kepingmu ke sana juga sah). Menyingkirkannya ke parit, mantap!', 'hit.k': 'Kenai keping hitam', 'hit.ok': 'Tak! Kena!', 'hit.ng': 'Meleset… arahkan cincin ke keping hitam',
      'twenty.t': 'Mengincar 20', 'twenty.b': 'Keping yang <b>jatuh rata ke lubang bernilai 20</b>. Langsung diambil dan dihitung di akhir ronde. Terlalu cepat malah melompatinya — pelan saja.', 'twenty.k': 'Jatuhkan keping ke lubang', 'twenty.ok': 'Plung! Angka 20!', 'twenty.ng': 'Hampir! Pelan ke tengah',
      'foul.t': 'Meleset itu pelanggaran', 'foul.b': 'Ada keping lawan tapi <b>tidak kena, itu pelanggaran</b>: kepingmu <b>diangkat ke parit</b> (juga kepingmu yang ikut bergeser).', 'foul.k': 'Ketuk untuk melihat', 'foul.ok': 'Lihat? Yang meleset masuk parit. Yang penting kena!',
      'score.t': 'Di garis, nilai terendah', 'score.b': 'Keping yang <b>menyentuh garis bernilai lebih rendah</b>. Yang berhenti menyentuh garis luar (garis 5) masuk parit: nol.', 'score.k': 'Ketuk keping yang bernilai 15', 'score.ok': 'Benar! Tak menyentuh garis: 15', 'score.ng': 'Itu menyentuh garis atau lebih di luar',
      'win.t': 'Siap main!', 'win.b': 'Dalam satu ronde, bergantian <b>8 keping</b> masing-masing. Total ronde tertinggi menang: gaya turnamen <b>4 ronde, menang 2 poin, seri 1</b>; “sampai 100” menjumlahkan selisihnya. Ayo main dengan si berang-berang!',
    },
    hi: {
      'board.t': 'बोर्ड और अंक', 'board.b': 'अंदर जितना, अंक उतने: बाहर से <b>5, 10 और 15</b>। 15 के घेरे पर <b>आठ खूँटियाँ</b> हैं, और <b>बीच का छेद 20</b> का। किनारे की खाई में गिरी डिस्क के 0 अंक।', 'board.k': '20 वाले छेद को छुओ', 'board.ok': 'वही! हमेशा बीच पर निशाना', 'board.ng': '20 ठीक बीच वाला छोटा छेद है',
      'slide.t': 'डिस्क रखना', 'slide.b': 'डिस्क <b>अपनी तरफ़ की बाहरी (5 वाली) रेखा पर</b>, अपने चौथाई हिस्से (तिरछी रेखाओं के बीच) में कहीं से भी मारी जाती है। {place}, खिसकाओ।', 'slide.k': 'डिस्क को चमकते निशान तक ले जाओ', 'slide.ok': 'बिल्कुल सही! बाँध बनाने में भी जगह ज़रूरी',
      'open.t': '15 के घेरे तक', 'open.b': 'बोर्ड पर <b>विरोधी की डिस्क न हो</b> तो तुम्हारी डिस्क <b>15 के घेरे (खूँटियों वाले) के अंदर या उसे छूती हुई</b> रुकनी चाहिए, वरना फ़ाउल। {pull}, फिर {rel}। ज़्यादा ज़ोर से तो सामने की खाई में!', 'open.k': 'डिस्क को 15 के घेरे में रोको', 'open.ok': 'बढ़िया रुकी! 15 अंक', 'open.ng': 'क़रीब! ताक़त थोड़ी बदलो',
      'hit.t': 'छूना ज़रूरी', 'hit.b': 'बोर्ड पर <b>विरोधी की डिस्क हो</b> तो <b>उसे छूना ही होगा</b> (अपनी डिस्क से धकेलकर भी चलेगा)। उसे खाई में भेज दो तो वाह!', 'hit.k': 'काली डिस्क को मारो', 'hit.ok': 'टक! बढ़िया', 'hit.ng': 'चूक गए… घेरा काली डिस्क पर रखो',
      'twenty.t': '20 का निशाना', 'twenty.b': 'छेद में <b>सीधी गिरी डिस्क 20 की</b>। उसे तुरंत निकालकर राउंड के अंत में गिनते हैं। तेज़ हो तो ऊपर से कूद जाती है — धीरे से।', 'twenty.k': 'डिस्क को छेद में गिराओ', 'twenty.ok': 'टप! 20!', 'twenty.ng': 'बस थोड़ा! धीरे से बीच में',
      'foul.t': 'चूकना फ़ाउल है', 'foul.b': 'विरोधी की डिस्क हो और तुम <b>उसे न छुओ तो फ़ाउल</b>: तुम्हारी डिस्क <b>खाई में चली जाती है</b> (और उसकी हिलाई तुम्हारी डिस्कें भी)।', 'foul.k': 'देखने के लिए छुओ', 'foul.ok': 'देखा? चूकी डिस्क खाई में। छूना ही ज़रूरी!',
      'score.t': 'रेखा पर तो कम वाला', 'score.b': '<b>रेखा छूती डिस्क को कम अंक</b> मिलते हैं। बाहरी (5 वाली) रेखा छूकर रुकी डिस्क खाई में: शून्य।', 'score.k': '15 अंक वाली डिस्क छुओ', 'score.ok': 'सही! कोई रेखा नहीं छूती: 15', 'score.ng': 'वह रेखा छूती है या और बाहर है',
      'win.t': 'अब खेल सकते हो!', 'win.b': 'एक राउंड में बारी-बारी से <b>8-8 डिस्क</b>। राउंड में ज़्यादा अंक वाला जीतता है: टूर्नामेंट में <b>4 राउंड, जीत 2 अंक, बराबरी 1</b>; “100 तक” में अंतर जुड़ता है। ऊदबिलाव के साथ एक बाज़ी!',
    },
    ar: {
      'board.t': 'اللوحة والنقاط', 'board.b': 'كلما اقتربت للداخل زادت النقاط: <b>5 و10 و15</b> من الخارج. <b>ثمانية أوتاد</b> تحرس دائرة الـ15، و<b>الحفرة في الوسط تساوي 20</b>. القرص في الخندق عند الحافة لا يحسب.', 'board.k': 'المس حفرة الـ20', 'board.ok': 'هذا هو! صوّب دائمًا نحو الوسط', 'board.ng': 'الـ20 هي الحفرة الصغيرة في المنتصف تمامًا',
      'slide.t': 'وضع القرص', 'slide.b': 'تنقر من <b>الخط الخارجي (خط الـ5) في جهتك</b>، من أي مكان في ربعك (بين الخطين المائلين). {place} لتحريكه.', 'slide.k': 'حرّك القرص إلى العلامة المضيئة', 'slide.ok': 'تمامًا! حتى السدود تحتاج مكانًا جيدًا',
      'open.t': 'حتى دائرة الـ15', 'open.b': 'إن <b>لم يكن للخصم قرص</b> على اللوحة، يجب أن <b>يتوقف قرصك داخل دائرة الـ15 (حلقة الأوتاد) أو يلمسها</b>، وإلا فهو خطأ. {pull} ثم {rel}. بقوة زائدة يسقط في الخندق المقابل!', 'open.k': 'أوقف قرصك داخل دائرة الـ15', 'open.ok': 'توقف رائع! 15 نقطة', 'open.ng': 'قريب! عدّل القوة قليلًا',
      'hit.t': 'يجب أن تصيب', 'hit.b': 'إن كان <b>للخصم قرص على اللوحة</b>، <b>يجب أن تصيب واحدًا</b> (ولو بدفع قرصك إليه). وإن أسقطته في الخندق فرائع!', 'hit.k': 'أصب القرص الأسود', 'hit.ok': 'طق! إصابة جميلة', 'hit.ng': 'أخطأت… ضع الحلقة على القرص الأسود',
      'twenty.t': 'نحو الـ20', 'twenty.b': 'القرص الذي <b>يسقط مستويًا في الحفرة يساوي 20</b>. يُخرج فورًا ويُحسب في نهاية الجولة. إن كان سريعًا قفز فوقها — بلطف.', 'twenty.k': 'أسقط قرصك في الحفرة', 'twenty.ok': 'بُلب! 20!', 'twenty.ng': 'قريب جدًا! بلطف إلى الوسط',
      'foul.t': 'عدم الإصابة خطأ', 'foul.b': 'إن كان للخصم قرص و<b>لم تصبه فهو خطأ</b>: يُرفع قرصك <b>إلى الخندق</b> (وأقراصك التي حرّكها).', 'foul.k': 'المس لتشاهد', 'foul.ok': 'أرأيت؟ القرص المخطئ إلى الخندق. الإصابة هي المهم!',
      'score.t': 'على الخط: القيمة الأقل', 'score.b': 'القرص الذي <b>يلمس خطًا يأخذ القيمة الأقل</b>. وإن توقف لامسًا الخط الخارجي (خط الـ5) يذهب إلى الخندق: صفر.', 'score.k': 'المس القرص الذي يساوي 15', 'score.ok': 'صحيح! لا يلمس أي خط: 15', 'score.ng': 'ذاك يلمس خطًا أو أبعد إلى الخارج',
      'win.t': 'أنت جاهز!', 'win.b': 'في الجولة يتناوب كل لاعب على <b>8 أقراص</b>. الأعلى في الجولة يفوز: في البطولات <b>4 جولات، 2 للفوز و1 للتعادل</b>؛ وفي «حتى 100» يُجمع الفرق. لنلعب مع القندس!',
    },
  };
  // the pages: discs staged on the board (cm; c, x, y), the disc's start, the task
  const PAGES = [
    { id: 'intro' },
    { id: 'board', kind: 'tap' },
    { id: 'slide', kind: 'slide', sx: -10, goal: 9 },
    { id: 'open', kind: 'open', sx: 0 },
    { id: 'hit', kind: 'hit', sx: 0, discs: [[1, .6, -6.5], [0, -13, 5]] },
    { id: 'twenty', kind: 'twenty', sx: 0 },
    { id: 'foul', kind: 'demo', sx: -8, discs: [[1, 15, -6]] },
    { id: 'score', kind: 'score', discs: [[0, 6.2, -3], [0, -9.1, 0], [0, 4, 14.5], [0, -2, -19.5]] },
    { id: 'win', last: true, discs: [[0, 2.2, -5.4], [1, -12.4, 9.1], [0, 11.1, 12.4], [1, 5.5, -21]] },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.CrokinoleEngine, D = E.DIM;
    const L = Object.assign({}, UI.en, UI[ctx.lang] || {}), VO = Object.assign({}, VOICE.en, VOICE[ctx.lang] || {});
    const AC = window.Atlas3D && Atlas3D.carrom, CK = window.Atlas3D && Atlas3D.crokinole;
    const HW = CK && CK.howFor ? CK.howFor(ctx.lang) : { place: '', pull: '', lr: '', rel: '' };
    const T = k => { if (VO[k] == null) return ''; let s = VO[k].replace(/\{(place|pull|lr|rel)\}/g, (m, w) => HW[w] || ''); if (k === 'open.b' && HW.pad) s += '<br><small>💻 ' + HW.pad + '</small>'; return s; };   // (a mouse: the laptop touchpad's click mode)
    try { localStorage.setItem('aicoding-crokinole-rules-seen', '1'); } catch (e) {}
    const SND = (AC && AC.SND) || { flick() {}, hit() {}, cush() {}, pocket() {}, place() {}, good() {}, bad() {}, win() {} };
    const board = T3.MODELS.crokinole(true); T3.show('crokinole', board); if (T3.play) T3.play(true);
    const U = board.userData, Y = U.top, K = U.K, W = 2 * U.RO;
    const baseFit = () => innerHeight > innerWidth * 1.15 ? { w: W + .3, d: W + 1.6, y: Y, pitch: 1.3 } : { w: W + .3, d: W + 1.1, y: Y, pitch: 1.26 };
    if (T3.fit) T3.fit(baseFit());
    const onResizeF = () => { if (T3.fit) T3.fit(baseFit()); };
    addEventListener('resize', onResizeF);
    let st = null, step = 0, played = false, busy = false, stopped = false, timers = [], sx = 0, drag = null, aimAng = -Math.PI / 2, aimPow = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const wx = (x, y) => U.xz(x, y), kick = ms => T3.kick && T3.kick(ms || 150);
    const by = x => E.baseY(0, x);
    const vOf = pw => 20 + (E.VMAX - 20) * pw * pw;

    /* ---------- the discs: kept from page to page; only the new ones drop in ---------- */
    let meshes = [];   // { c, x, y, id, g }
    let hand1 = null;
    function mk(c) { const g = U.piece(c), sh = T3.contact(D.RD * K * 1.15, .42); sh.position.y = .004; g.add(sh); board.add(g); return g; }
    function put(g, x, y, h) { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); }
    function stage0(pg) { const s = E.newRound({ first: 0 }); s.pcs = (pg.discs || []).map(([c, x, y], i) => ({ id: i, c, x, y, on: true })); return s; }
    function setBoard() {
      const want = st.pcs.filter(m => m.on).map(m => ({ c: m.c, x: m.x, y: m.y, id: m.id }));
      const keep = [], newOnes = [], pool = meshes.slice();
      want.forEach(w => { const j = pool.findIndex(o => o.c === w.c && Math.abs(o.x - w.x) < .05 && Math.abs(o.y - w.y) < .05); if (j >= 0) { const o = pool.splice(j, 1)[0]; o.id = w.id; keep.push(o); } else newOnes.push(w); });
      pool.forEach(o => board.remove(o.g));
      const added = newOnes.map(w => { const g = mk(w.c); put(g, w.x, w.y, 1.4); return { c: w.c, x: w.x, y: w.y, id: w.id, g }; });
      meshes = keep.concat(added);
      if (added.length) { const t0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, now - t0) / 420), e = 1 - Math.pow(1 - k, 3); added.forEach(o => put(o.g, o.x, o.y, (1 - e) * 1.4)); kick(120); if (k < 1) requestAnimationFrame(s); else SND.place(); })(t0); }
      kick(200);
    }
    const meshOf = id => (meshes.find(o => o.id === id) || {}).g;

    /* ---------- guides ---------- */
    const gd = new TH.Group(); board.add(gd);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { arrow: basic(0xffffff, .95), path: basic(0xffffff, .85), man: basic(0x3df59a, .95), base: basic(0x3df59a, .35), ring: basic(0xffd34d, .95), goal: basic(0xffd34d, .9) };
    const GEO = { bar: new TH.BoxGeometry(1, .006, 1), ring: new TH.TorusGeometry(D.RD * K, .012, 6, 40), hole: new TH.TorusGeometry(D.RH * K * 1.9, .02, 6, 40), r15: new TH.TorusGeometry(D.R15 * K, .02, 6, 96), cone: new TH.ConeGeometry(.08, .2, 3) };
    [GEO.ring, GEO.hole, GEO.r15].forEach(g => g.rotateX(Math.PI / 2)); GEO.cone.rotateX(Math.PI / 2);
    function clearGuides() { while (gd.children.length) { const c = gd.children[0]; gd.remove(c); if (c.userData.own) c.geometry.dispose(); } kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) { const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return; const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(a, Y + (lift || .03), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); }
    function dots(x0, y0, x1, y1, mat) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 1.6); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .55) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, .32, mat); } }
    function ring(x, y, geo, mat, s, pul) { const m = new TH.Mesh(geo, mat), [a, b] = wx(x, y); m.position.set(a, Y + .035, b); m.scale.setScalar(s || 1); m.renderOrder = 4; m.userData.pulse = pul ? (s || 1) : 0; gd.add(m); return m; }
    function arcBand() { const a0 = Math.PI / 4, wid = matchMedia('(pointer: coarse)').matches ? 2 * D.RD + 2.6 : 2 * D.RD + .4; const g = new TH.RingGeometry((D.R5 - wid / 2) * K, (D.R5 + wid / 2) * K, 40, 1, Math.PI / 2 - a0, 2 * a0); g.rotateX(Math.PI / 2); const m = new TH.Mesh(g, MAT.base); m.userData.own = true; m.position.y = Y + .012; m.renderOrder = 4; gd.add(m); }
    const aims = () => ['slide', 'open', 'hit', 'twenty'].includes(P().kind);
    function guides() {
      clearGuides();
      const pg = P();
      if (pg.kind === 'tap' && !played) ring(0, 0, GEO.hole, MAT.goal, 1, true);
      if (aims() && !played && !busy) {
        arcBand();
        if (pg.kind === 'slide') ring(pg.goal, by(pg.goal), GEO.ring, MAT.ring, 1.3, true);
        else {
          if (pg.kind === 'open') ring(0, 0, GEO.r15, MAT.goal, 1);
          if (pg.kind === 'twenty') ring(0, 0, GEO.hole, MAT.goal, 1, true);
          if (drag && drag.kind === 'aim') {
            const y0 = by(sx), tr = E.aimTrace(st, 0, sx, aimAng);
            dots(sx, y0, tr.gx, tr.gy, MAT.path); ring(tr.gx, tr.gy, GEO.ring, MAT.path);
            if (tr.man >= 0) { const m = st.pcs[tr.man]; bar(m.x, m.y, m.x + tr.ox * 9, m.y + tr.oy * 9, .5, MAT.man); }
            const L0 = D.RD + 2 + aimPow * 18, ex = sx + Math.cos(aimAng) * L0, ey = y0 + Math.sin(aimAng) * L0;
            MAT.arrow.color.setHSL(.33 - aimPow * .33, .9, .55);
            bar(sx + Math.cos(aimAng) * D.RD, y0 + Math.sin(aimAng) * D.RD, ex, ey, .9, MAT.arrow, .045);
            const c = new TH.Mesh(GEO.cone, MAT.arrow), [a, b] = wx(ex, ey); c.position.set(a, Y + .05, b); c.rotation.y = -aimAng + Math.PI / 2; c.renderOrder = 5; gd.add(c);
          } else ring(sx, by(sx), GEO.ring, MAT.ring, 1.25, true);
        }
      }
      kick(120);
    }
    let pulseT = 0;
    { const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || document.hidden || !document.hasFocus()) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(m.userData.pulse * (1.06 + Math.sin((performance.now() - t0) / 230) * .08)); any = true; } }); if (any) kick(80); }, 60); }

    /* ---------- a shot: simulate and play it back (the hole drops, the edge drops into the ditch) ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, N = sim.shooter, t0 = performance.now(), gone = {}, sunk = new Set(sim.sunk.map(e => e.i));
        let ev = 0, last = t0, el = 0;
        (function stp(now) {
          if (stopped) return done();
          now = performance.now(); el += Math.max(0, now - last) / 1000; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi];
          for (let i = 0; i <= N; i++) {
            const g = i === N ? hand1 : meshOf(i); if (!g) continue;
            if (f[i * 3 + 2]) { put(g, f[i * 3], f[i * 3 + 1]); g.visible = true; continue; }
            if (!g.visible) continue;
            if (!gone[i]) gone[i] = { t: el, x: f[i * 3], y: f[i * 3 + 1], hole: sunk.has(i) };
            const s = gone[i], k = Math.min(1, (el - s.t) / .25);
            if (s.hole) { put(g, s.x * (1 - k), s.y * (1 - k), -k * k * .25); if (k >= 1) g.visible = false; }
            else { const d = Math.hypot(s.x, s.y) || 1, r = D.RB + (U.RDITCH / K - D.RB) * k; put(g, s.x / d * r, s.y / d * r, -k * (Y - U.DITCHY)); }
          }
          while (ev < sim.events.length && sim.events[ev].t <= el) { const e = sim.events[ev++]; if (e.k === 'hit' && e.v > 8) SND.hit(e.v); else if (e.k === 'peg' && e.v > 15) SND.cush(e.v * .6); else if (e.k === 'hole') SND.pocket(); }
          kick(120);
          if (fi < F.length - 1 || Object.values(gone).some(s => el - s.t < .25)) requestAnimationFrame(stp); else done();
        })(t0);
      });
    }
    async function shoot(shot) {
      busy = true; clearGuides(); SND.flick();
      const sim = E.simulate(st, 0, shot, { frames: true });
      await playback(sim); if (stopped) return null;
      const r = E.resolve(st, sim); busy = false;
      return { sim, r };
    }
    // the help: an aim within 9° of the page's line is set on it; the power is brought into the window that works
    const near = (a, b) => { let d = Math.abs(a - b); if (d > Math.PI) d = 2 * Math.PI - d; return d < 9 * Math.PI / 180; };
    function assisted(shot) {
      const pg = P(), y0 = by(shot.x);
      if (pg.kind === 'hit') {
        const m = st.pcs.find(x => x.on && x.c === 1); if (!m) return shot;
        const a = Math.atan2(m.y - y0, m.x - shot.x); return near(a, shot.ang) ? { x: shot.x, ang: a, v: Math.max(shot.v, Math.sqrt(2 * E.DECEL * (Math.hypot(m.x - shot.x, m.y - y0) + 6))) } : shot;
      }
      const a = Math.atan2(-y0, -shot.x), dc = Math.hypot(shot.x, y0); if (!near(a, shot.ang)) return shot;
      // try speeds round the one the player gave, keep the nearest that does the page's job
      const good = v => { const sim = E.simulate(st, 0, { x: shot.x, ang: a, v }); if (pg.kind === 'twenty') return sim.sunk.length > 0; const f = sim.fin[sim.shooter]; return f.on && Math.hypot(f.x, f.y) - D.RD <= D.R15; };
      let best = null; for (let v = Math.sqrt(2 * E.DECEL * Math.max(1, dc - 14)); v <= Math.sqrt(2 * E.DECEL * (dc + 14)); v += .5) if (good(v) && (!best || Math.abs(v - shot.v) < Math.abs(best - shot.v))) best = v;
      if (best == null) return shot;
      const lim = pg.kind === 'twenty' ? 1.5 : 1.7;   // (a pull far off — twice too hard, say — still misses)
      return shot.v < best * lim && shot.v > best / lim ? { x: shot.x, ang: a, v: best } : shot;
    }

    /* ---------- the guide panel (the shared .rgd look of every tour) ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:700}'
      + '.rgd .urt{background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a;font-weight:900;box-shadow:0 3px 0 #e6b43a;animation:ckP 1.6s ease-in-out infinite}@keyframes ckP{50%{box-shadow:0 3px 0 #e6b43a,0 0 0 5px rgba(240,194,74,.28)}}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}}';
    document.head.appendChild(css);
    // Maple's voice: a soft blip as the words type out (every guided course has it — common rule)
    let ACx = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; ACx = ACx || window.__atlasAC || new (window.AudioContext || window.webkitAudioContext)(); if (ACx.state === 'suspended') ACx.resume(); const f = 470 + Math.random() * 220, t = ACx.currentTime, o = ACx.createOscillator(), g = ACx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .06); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .07); o.connect(g); g.connect(ACx.destination); o.start(t); o.stop(t + .08); } catch (e) {} };
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
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
      nx.textContent = pg.last ? L.start + ' ▶' : wait ? (pg.kind === 'demo' ? L.watch : L.tapIt) : L.next + ' ▶';
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
      meas(HELLO[ctx.lang] || HELLO.en, chips());
      PAGES.forEach(pg => { if (pg.id === 'intro') return; const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`; [task(`👆 ${T(pg.id + '.k')}`), tag(`✓ ${T(pg.id + '.ok')}`)].forEach(c => meas(t, c)); });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; drag = null;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      st = stage0(pg); setBoard();
      if (hand1) { board.remove(hand1); hand1 = null; }
      if (aims() || pg.kind === 'demo') { hand1 = mk(0); sx = pg.sx || 0; put(hand1, sx, by(sx)); }
      if (pg.id === 'intro') { say(HELLO[ctx.lang] || HELLO.en); cnt(chips()); guides(); buttons(); return; }
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      if (!pg.last) cnt(task(`👆 ${T(pg.id + '.k')}`));
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
    function shotDone(res) {
      if (!res || stopped) return;
      const pg = P(), { sim } = res, f = sim.fin[sim.shooter];
      if (pg.kind === 'open') { if (sim.sunk.length || (f.on && Math.hypot(f.x, f.y) - D.RD <= D.R15)) return ok('open.ok'); }
      else if (pg.kind === 'hit') { if (sim.hitOpp) return ok('hit.ok'); }
      else if (pg.kind === 'twenty') { if (sim.sunk.length) return ok('twenty.ok'); }
      ng(pg.id + '.ng'); later(() => go(step), 1500);
    }
    async function demo() {
      if (busy || played) return;
      cnt('');
      // a shot that misses the opponent's disc: it comes off into the ditch
      const res = await shoot({ x: sx, ang: Math.atan2(-6 - by(sx), -14 - sx), v: Math.sqrt(2 * E.DECEL * 32) }); if (!res || stopped) return;
      const g = hand1, sim = res.sim, f = sim.fin[sim.shooter];
      if (g && f.on) await new Promise(rs => { const t0 = performance.now(), d = Math.hypot(f.x, f.y) || 1; (function s(now) { if (stopped) return rs(); const k = Math.min(1, Math.max(0, now - t0) / 520), e = k * k, r = d + (U.RDITCH / K - d) * e; put(g, f.x / d * r, f.y / d * r, Math.sin(k * Math.PI) * .3 - e * (Y - U.DITCHY)); kick(120); if (k < 1) requestAnimationFrame(s); else { SND.place(); rs(); } })(t0); });
      ok('foul.ok');
    }

    /* ---------- the hand: the game's own controls (Atlas3D.carrom.Hand along the arc) ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    function slideTo(x) {
      sx = E.nearestFree(st, 0, x); put(hand1, sx, by(sx)); kick(100);
      const pg = P();
      if (pg.kind === 'slide' && Math.abs(sx - pg.goal) < 1.3) { sx = pg.goal; put(hand1, sx, by(sx)); drag = null; if (hand) hand.cancel(); ok('slide.ok'); }
    }
    const hand = AC && AC.Hand ? AC.Hand({
      el: ctx.el, toCm, sign: () => 1, striker: () => sx, home: () => ({ x: sx, y: by(sx) }),
      canAim: () => !stopped && !busy && !played && aims() && !!hand1,
      place: x => { slideTo(x); if (!played) guides(); },
      aim: a => { if (!a || P().kind === 'slide') { drag = null; guides(); return; } drag = { kind: 'aim' }; aimAng = a.ang; aimPow = a.pow; guides(); },
      shoot: async (ang, pw) => { if (P().kind === 'slide' || busy || played) return; shotDone(await shoot(assisted({ x: sx, ang, v: vOf(pw) }))); },
      tap: e => {
        if (stopped || busy || played) return;
        const pg = P();
        if (pg.kind === 'demo') { demo(); return; }
        const q = toCm(e); if (!q) return;
        if (pg.kind === 'tap') { if (Math.hypot(q.x, q.y) < 3.2) ok('board.ok'); else ng('board.ng'); return; }
        if (pg.kind === 'score') {
          const hit = st.pcs.find(m => m.on && Math.hypot(q.x - m.x, q.y - m.y) < D.RD + 1);
          if (!hit) return;
          if (E.value(hit.x, hit.y) === 15) ok('score.ok'); else ng('score.ng');
        }
      },
    }) : null;
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';
    $('[data-a=next]').onclick = () => { if (P().last) ctx.onStart(); else if (P().kind === 'demo' && !played) demo(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    say('…'); buttons();
    later(() => go(0), 300);
    const sess = {
      stop() { stopped = true; clearInterval(typeT); clearInterval(pulseT); timers.forEach(clearTimeout); if (hand) hand.stop(); ctx.el.style.touchAction = prevTouch; removeEventListener('resize', lockH); removeEventListener('resize', onResizeF); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose()); },
      panel: el,
      _debug: { step: () => step, played: () => played, go, st: () => st, at: (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); }, sx: () => sx, shoot: async (ang, pw) => shotDone(await shoot(assisted({ x: sx, ang, v: vOf(pw) }))), by },
    };
    window.__rulesSess = sess;
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.crokinole = { start };
})();
