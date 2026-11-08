/* =====================================================================
   Carrom — rules tour on the 3D table (atlas/models/carrom.js), told by the guide character Otto (the otter who slides on his
   belly like a carrom man). Pages: the board and the pockets, placing the striker, flicking a man in, your colour and striking
   again (a cut), the queen and covering it, the striker in a pocket (a foul), how a board is won. Every page after the first
   has a task on the 3D board; the flicks are helped a little (an aim close to the right line is set on it, the power too),
   so a first-timer gets them in. The words are Otto's own, in all 14 languages.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Opening the tour sets aicoding-carrom-rules-seen. You are white, at the near side (player 0).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/otter-1.webp';
  const UI = {
    ja: { name: 'オットー', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', tapIt: '盤の上でやってみよう', watch: 'タップしてお手本', origin: 'インド', players: '2人（4人のダブルスも）', time: '1ボード 約10〜20分' },
    en: { name: 'Otto', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tapIt: 'Try it on the board', watch: 'Tap to watch', origin: 'India', players: '2 players (or 4 in doubles)', time: 'about 10–20 min a board' },
    zh: { name: '奥托', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', tapIt: '在棋盘上试试', watch: '点击看示范', origin: '印度', players: '2人（也可4人双打）', time: '每局约10–20分钟' },
    'zh-TW': { name: '奧托', next: '下一步', back: '返回', start: '來對局吧', again: '再一次', tapIt: '在棋盤上試試', watch: '點一下看示範', origin: '印度', players: '2人（也可4人雙打）', time: '每局約10–20分鐘' },
    ko: { name: '오토', next: '다음', back: '이전', start: '대국하기', again: '다시', tapIt: '판 위에서 해 봐', watch: '탭해서 시범 보기', origin: '인도', players: '2명 (4명 복식도)', time: '보드당 약 10~20분' },
    es: { name: 'Otto', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tapIt: 'Pruébalo en el tablero', watch: 'Toca para verlo', origin: 'India', players: '2 jugadores (o 4 en dobles)', time: 'unos 10–20 min por tablero' },
    fr: { name: 'Otto', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tapIt: 'Essaie sur le plateau', watch: 'Touche pour voir', origin: 'Inde', players: '2 joueurs (ou 4 en double)', time: 'environ 10–20 min par plateau' },
    pt: { name: 'Otto', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tapIt: 'Tente no tabuleiro', watch: 'Toque para ver', origin: 'Índia', players: '2 jogadores (ou 4 em duplas)', time: 'cerca de 10–20 min por tabuleiro' },
    de: { name: 'Otto', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tapIt: 'Probier es auf dem Brett', watch: 'Tippen zum Zuschauen', origin: 'Indien', players: '2 Spieler (oder 4 im Doppel)', time: 'etwa 10–20 Min. pro Board' },
    ru: { name: 'Отто', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tapIt: 'Попробуй на доске', watch: 'Нажми, чтобы посмотреть', origin: 'Индия', players: '2 игрока (или 4 в парах)', time: 'около 10–20 мин на доску' },
    tr: { name: 'Otto', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tapIt: 'Tahtada dene', watch: 'İzlemek için dokun', origin: 'Hindistan', players: '2 oyuncu (ya da 4 kişilik çiftler)', time: 'tahta başına 10–20 dk' },
    id: { name: 'Otto', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tapIt: 'Coba di papan', watch: 'Ketuk untuk melihat', origin: 'India', players: '2 pemain (atau 4 ganda)', time: 'sekitar 10–20 menit per papan' },
    hi: { name: 'ओट्टो', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tapIt: 'बोर्ड पर करके देखो', watch: 'देखने के लिए छुओ', origin: 'भारत', players: '2 खिलाड़ी (या 4 डबल्स में)', time: 'एक बोर्ड लगभग 10–20 मिनट' },
    ar: { name: 'أوتو', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tapIt: 'جرّب على اللوحة', watch: 'المس لتشاهد', origin: 'الهند', players: 'لاعبان (أو 4 زوجيًا)', time: 'نحو 10–20 دقيقة للوحة' },
  };
  const HELLO = {
    ja: 'やあ！ おなかで滑るのが得意なカワウソ、<b>オットー</b>だよ。<b>キャロム</b>はインド生まれのおはじき。指で<b>ストライカー</b>をはじいて、<b>自分の色の駒を全部ポケットに入れたら勝ち</b>！',
    en: 'Hi! I’m <b>Otto</b>, the otter who slides on his tummy. <b>Carrom</b> is India’s flicking game: flick the <b>striker</b> with a finger and <b>sink all the men of your colour</b> to win!',
    zh: '嗨！我是最会用肚子滑行的水獭<b>奥托</b>。<b>克朗棋</b>是印度的弹子游戏：用手指弹<b>击子</b>，<b>把自己颜色的子全部打进袋就赢</b>！',
    'zh-TW': '嗨！我是最會用肚子滑行的水獺<b>奧托</b>。<b>克朗棋</b>是印度的彈子遊戲：用手指彈<b>擊子</b>，<b>把自己顏色的子全部打進袋就贏</b>！',
    ko: '안녕! 배로 미끄러지기 선수인 수달 <b>오토</b>야. <b>캐롬</b>은 인도의 알까기 게임이야. 손가락으로 <b>스트라이커</b>를 튕겨서 <b>내 색 말을 전부 포켓에 넣으면 승리</b>!',
    es: '¡Hola! Soy <b>Otto</b>, la nutria que se desliza sobre la barriga. El <b>carrom</b> es el juego de dedo de la India: lanza el <b>striker</b> y <b>mete todas las fichas de tu color</b> para ganar.',
    fr: 'Salut ! Moi, c’est <b>Otto</b>, la loutre qui glisse sur le ventre. Le <b>carrom</b> est le jeu de pichenette de l’Inde : chasse le <b>striker</b> du doigt et <b>empoche tous les pions de ta couleur</b> pour gagner !',
    pt: 'Oi! Sou o <b>Otto</b>, a lontra que desliza de barriga. O <b>carrom</b> é o jogo de peteleco da Índia: dê um peteleco no <b>striker</b> e <b>encaçape todas as peças da sua cor</b> para vencer!',
    de: 'Hallo! Ich bin <b>Otto</b>, der Otter, der auf dem Bauch rutscht. <b>Carrom</b> ist Indiens Schnippspiel: Schnipp den <b>Striker</b> mit dem Finger und <b>versenk alle Steine deiner Farbe</b>!',
    ru: 'Привет! Я <b>Отто</b>, выдра, которая катается на пузе. <b>Карром</b> — индийская игра в щелчки: щёлкай пальцем <b>страйкер</b> и <b>забей все фишки своего цвета</b>, чтобы победить!',
    tr: 'Merhaba! Ben <b>Otto</b>, karnının üstünde kayan su samuru. <b>Carrom</b> Hindistan’ın fiske oyunu: <b>vurucuyu</b> parmağınla fiskele ve <b>kendi rengindeki tüm taşları cebe sok</b>!',
    id: 'Hai! Aku <b>Otto</b>, berang-berang yang jago meluncur pakai perut. <b>Karambol</b> adalah permainan sentil dari India: sentil <b>striker</b> dan <b>masukkan semua biji warnamu</b> untuk menang!',
    hi: 'नमस्ते! मैं <b>ओट्टो</b> हूँ, पेट के बल फिसलने वाला ऊदबिलाव। <b>कैरम</b> भारत का खेल है: उँगली से <b>स्ट्राइकर</b> मारो और <b>अपने रंग की सारी गोटियाँ पॉकेट में डालकर</b> जीतो!',
    ar: 'مرحبًا! أنا <b>أوتو</b>، القضاعة التي تنزلق على بطنها. <b>الكيرم</b> لعبة النقر الهندية: انقر <b>الضارب</b> بإصبعك و<b>أدخل كل قطع لونك في الجيوب</b> لتفوز!',
  };
  const VOICE = {
    ja: {
      'board.t': '盤とポケット', 'board.b': '四すみの穴が<b>ポケット</b>。手前の2本線が、きみがストライカーを置く<b>ベースライン</b>だよ。ぼくのおへそより大事な線！', 'board.k': 'ポケットをどれかタップしてね', 'board.ok': 'そう！ そこに駒を落とすんだ', 'board.ng': 'ポケットは四すみの丸い穴だよ〜',
      'slide.t': 'ストライカーを置く', 'slide.b': 'ストライカーは<b>ベースラインの2本線の間</b>なら左右どこでもOK。いい角度を探そう。ぼくもお昼寝の場所はよ〜く探すよ。', 'slide.k': 'ストライカーを光る印まで動かしてね', 'slide.ok': 'ぴったり！ 位置決めは名人の第一歩',
      'flick.t': 'はじいて入れる', 'flick.b': 'ストライカーを<b>押さえて後ろへ引っぱり、離すと</b>はじけるよ。引くほど強い！ 点線で、どこに当たるか見えるんだ。', 'flick.k': '白い駒をポケットに入れてね', 'flick.ok': 'スポーン！ ナイスショット！', 'flick.ng': '惜しい！ 点線の先の輪を白い駒に合わせてみて',
      'cut.t': '自分の色で、もう一回', 'cut.b': 'きみは<b>白</b>。白を入れたら<b>もう一回</b>はじける。黒を入れたら交代だよ。斜めに当てる「カット」なら、横の駒も入るんだ。', 'cut.k': '斜めに当てて白を入れよう', 'cut.ok': 'カット成功！ 続けて入れるのがコツ', 'cut.ng': 'あとちょっと！ 緑の線がポケットを向くように',
      'queen.t': '赤いクイーン', 'queen.b': '赤は<b>クイーン</b>（3点）。入れたら<b>次の一打で白を入れて「カバー」</b>しよう。できないと真ん中に戻っちゃう。女王さまはわがまま！', 'queen.k': 'クイーンをポケットに入れてね', 'queen.k2': 'カバー！ 次は白い駒を入れよう', 'queen.ok': 'カバー成功！ クイーンはきみのもの', 'queen.ng': '惜しい！ 輪を赤い駒に合わせてみて', 'queen.ng2': 'カバーできず… もう一度クイーンから！',
      'foul.t': 'ストライカーが落ちたら', 'foul.b': '<b>ストライカーがポケットに落ちたら反則</b>。入れた白が<b>1枚、真ん中に戻る</b>よ。ぼくも川に落ちたら、ずぶぬれで戻るんだ。', 'foul.k': 'タップしてお手本を見てね', 'foul.ok': 'ね、白が1枚戻ったでしょ。強すぎに注意！',
      'win.t': 'これで遊べるよ！', 'win.b': '<b>白9枚を全部入れて、クイーンもカバー済み</b>ならボードの勝ち。相手の残りの駒が点数で、自分でカバーしたクイーンは+3点。さあ、ぼくと一緒に滑りに行こう！',
    },
    en: {
      'board.t': 'The board and pockets', 'board.b': 'The holes in the corners are the <b>pockets</b>. The two near lines are your <b>base line</b>, where the striker sits. More important than my belly button!', 'board.k': 'Tap any pocket', 'board.ok': 'Yes! That’s where the men go', 'board.ng': 'The pockets are the round holes in the corners!',
      'slide.t': 'Placing the striker', 'slide.b': 'The striker can go anywhere <b>between the two base lines</b>. Hunt for a good angle — I hunt for nap spots the same way.', 'slide.k': 'Slide the striker to the glowing mark', 'slide.ok': 'Spot on! Placing is a master’s first step',
      'flick.t': 'Flick it in', 'flick.b': '<b>Press the striker, pull it back and let go</b> to flick. Pull further for more power! The dotted line shows what you’ll hit.', 'flick.k': 'Sink the white man', 'flick.ok': 'Plop! Nice shot!', 'flick.ng': 'Close! Put the ring at the end of the line on the white man',
      'cut.t': 'Your colour, again', 'cut.b': 'You’re <b>white</b>. Sink a white and you <b>strike again</b>; sink a black and the turn passes. Hit a man on its side — a <b>cut</b> — and it goes off at an angle.', 'cut.k': 'Cut the white man in', 'cut.ok': 'Great cut! Keep them coming', 'cut.ng': 'Nearly! Make the green line point at the pocket',
      'queen.t': 'The red queen', 'queen.b': 'Red is the <b>queen</b> (3 points). Sink her, then <b>cover</b> her: sink a white with the very next shot. If not, she goes back to the middle. Queens are fussy!', 'queen.k': 'Sink the queen', 'queen.k2': 'Now cover her: sink a white', 'queen.ok': 'Covered! The queen is yours', 'queen.ng': 'Close! Put the ring on the red queen', 'queen.ng2': 'Not covered… start again from the queen!',
      'foul.t': 'If the striker drops', 'foul.b': '<b>A striker in a pocket is a foul</b>: one of your sunk whites <b>goes back to the middle</b>. When I fall in the river, I come back soggy too.', 'foul.k': 'Tap to watch', 'foul.ok': 'See? One white came back. Don’t hit too hard!',
      'win.t': 'You’re ready!', 'win.b': '<b>Sink all nine whites with the queen covered</b> and the board is yours. You score the men your opponent still has, +3 for a queen you covered. Let’s go sliding!',
    },
    zh: {
      'board.t': '棋盘与球袋', 'board.b': '四个角的洞是<b>球袋</b>。靠近你的两条线是放击子的<b>底线</b>，比我的肚脐还重要！', 'board.k': '点任意一个球袋', 'board.ok': '对！棋子就落在那里', 'board.ng': '球袋是四个角的圆洞哦～',
      'slide.t': '摆放击子', 'slide.b': '击子只要在<b>两条底线之间</b>，左右都行。找个好角度吧，我找午睡的地方也很认真。', 'slide.k': '把击子移到发光的记号', 'slide.ok': '刚刚好！摆位是高手的第一步',
      'flick.t': '弹进去', 'flick.b': '<b>按住击子往后拉，放开</b>就弹出去，拉得越远越有力！虚线会告诉你会碰到哪里。', 'flick.k': '把白子打进袋', 'flick.ok': '扑通！好球！', 'flick.ng': '可惜！把虚线前端的圈对准白子',
      'cut.t': '自己的颜色，再来一次', 'cut.b': '你是<b>白方</b>。打进白子就能<b>再弹一次</b>，打进黑子就换人。斜着碰子的“切球”，能把旁边的子送进去。', 'cut.k': '用切球把白子打进去', 'cut.ok': '切球成功！连续打进是诀窍', 'cut.ng': '差一点！让绿线指向球袋',
      'queen.t': '红色皇后', 'queen.b': '红子是<b>皇后</b>（3分）。打进后，<b>下一杆要打进白子来“掩护”</b>，否则她会回到中央。皇后很任性！', 'queen.k': '把皇后打进袋', 'queen.k2': '掩护！接着打进白子', 'queen.ok': '掩护成功！皇后归你了', 'queen.ng': '可惜！把圈对准红色皇后', 'queen.ng2': '没掩护成功…从皇后重来！',
      'foul.t': '击子掉进去时', 'foul.b': '<b>击子掉进球袋算犯规</b>，你打进的白子要<b>放回1枚到中央</b>。我掉进河里也会湿漉漉地回来。', 'foul.k': '点击看示范', 'foul.ok': '看，白子回来了1枚。别太用力！',
      'win.t': '可以开始玩啦！', 'win.b': '<b>把9枚白子全打进，皇后也已掩护</b>，这一局就赢了。对方剩下的子就是你的分数，自己掩护的皇后再+3分。一起去滑行吧！',
    },
    'zh-TW': {
      'board.t': '棋盤與球袋', 'board.b': '四個角的洞是<b>球袋</b>。靠近你的兩條線是放擊子的<b>底線</b>，比我的肚臍還重要！', 'board.k': '點任一個球袋', 'board.ok': '對！棋子就落在那裡', 'board.ng': '球袋是四個角的圓洞喔～',
      'slide.t': '擺放擊子', 'slide.b': '擊子只要在<b>兩條底線之間</b>，左右都可以。找個好角度吧，我找午睡的地方也很認真。', 'slide.k': '把擊子移到發光的記號', 'slide.ok': '剛剛好！擺位是高手的第一步',
      'flick.t': '彈進去', 'flick.b': '<b>按住擊子往後拉，放開</b>就彈出去，拉得越遠越有力！虛線會告訴你會碰到哪裡。', 'flick.k': '把白子打進袋', 'flick.ok': '噗通！好球！', 'flick.ng': '可惜！把虛線前端的圈對準白子',
      'cut.t': '自己的顏色，再來一次', 'cut.b': '你是<b>白方</b>。打進白子就能<b>再彈一次</b>，打進黑子就換人。斜著碰子的「切球」，能把旁邊的子送進去。', 'cut.k': '用切球把白子打進去', 'cut.ok': '切球成功！連續打進是訣竅', 'cut.ng': '差一點！讓綠線指向球袋',
      'queen.t': '紅色皇后', 'queen.b': '紅子是<b>皇后</b>（3分）。打進後，<b>下一桿要打進白子來「掩護」</b>，不然她會回到中央。皇后很任性！', 'queen.k': '把皇后打進袋', 'queen.k2': '掩護！接著打進白子', 'queen.ok': '掩護成功！皇后歸你了', 'queen.ng': '可惜！把圈對準紅色皇后', 'queen.ng2': '沒掩護成功…從皇后重來！',
      'foul.t': '擊子掉進去時', 'foul.b': '<b>擊子掉進球袋算犯規</b>，你打進的白子要<b>放回1枚到中央</b>。我掉進河裡也會濕答答地回來。', 'foul.k': '點一下看示範', 'foul.ok': '看，白子回來了1枚。別太用力！',
      'win.t': '可以開始玩囉！', 'win.b': '<b>把9枚白子全打進，皇后也已掩護</b>，這一局就贏了。對方剩下的子就是你的分數，自己掩護的皇后再+3分。一起去滑行吧！',
    },
    ko: {
      'board.t': '판과 포켓', 'board.b': '네 귀퉁이의 구멍이 <b>포켓</b>이야. 가까운 두 줄은 스트라이커를 놓는 <b>베이스라인</b>. 내 배꼽보다 중요한 선!', 'board.k': '포켓 아무거나 탭해 봐', 'board.ok': '맞아! 거기에 말을 떨어뜨리는 거야', 'board.ng': '포켓은 네 귀퉁이의 둥근 구멍이야~',
      'slide.t': '스트라이커 놓기', 'slide.b': '스트라이커는 <b>베이스라인 두 줄 사이</b>라면 좌우 어디든 OK. 좋은 각도를 찾아봐. 나도 낮잠 자리는 꼼꼼히 찾거든.', 'slide.k': '스트라이커를 빛나는 표시까지 옮겨', 'slide.ok': '딱이야! 자리 잡기는 명인의 첫걸음',
      'flick.t': '튕겨서 넣기', 'flick.b': '<b>스트라이커를 누르고 뒤로 당겼다 놓으면</b> 튕겨 나가. 많이 당길수록 세게! 점선으로 어디에 맞을지 보여.', 'flick.k': '흰 말을 포켓에 넣어 봐', 'flick.ok': '퐁! 나이스 샷!', 'flick.ng': '아깝다! 점선 끝의 고리를 흰 말에 맞춰 봐',
      'cut.t': '내 색이면 한 번 더', 'cut.b': '너는 <b>흰색</b>. 흰 말을 넣으면 <b>한 번 더</b>, 검은 말을 넣으면 교대야. 비스듬히 맞히는 <b>컷</b>으로 옆의 말도 넣을 수 있어.', 'cut.k': '비스듬히 맞혀서 흰 말을 넣자', 'cut.ok': '컷 성공! 연속으로 넣는 게 요령', 'cut.ng': '조금만 더! 초록 선이 포켓을 향하게',
      'queen.t': '빨간 퀸', 'queen.b': '빨강은 <b>퀸</b>(3점). 넣은 다음 <b>바로 다음 샷에 흰 말을 넣어 커버</b>해야 해. 못 하면 가운데로 돌아가. 여왕님은 까다로워!', 'queen.k': '퀸을 포켓에 넣어 봐', 'queen.k2': '커버! 이제 흰 말을 넣자', 'queen.ok': '커버 성공! 퀸은 네 거야', 'queen.ng': '아깝다! 고리를 빨간 퀸에 맞춰 봐', 'queen.ng2': '커버 실패… 퀸부터 다시!',
      'foul.t': '스트라이커가 빠지면', 'foul.b': '<b>스트라이커가 포켓에 빠지면 반칙</b>. 넣었던 흰 말 <b>1개가 가운데로 돌아가</b>. 나도 강에 빠지면 흠뻑 젖어서 돌아오지.', 'foul.k': '탭해서 시범을 봐', 'foul.ok': '봐, 흰 말이 1개 돌아왔지? 너무 세게는 금물!',
      'win.t': '이제 할 수 있어!', 'win.b': '<b>흰 말 9개를 모두 넣고 퀸도 커버됐다면</b> 그 보드는 승리. 상대에게 남은 말이 점수, 내가 커버한 퀸은 +3점. 같이 미끄러지러 가자!',
    },
    es: {
      'board.t': 'El tablero y las troneras', 'board.b': 'Los agujeros de las esquinas son las <b>troneras</b>. Las dos líneas cercanas son tu <b>línea base</b>, donde va el striker. ¡Más importante que mi ombligo!', 'board.k': 'Toca cualquier tronera', 'board.ok': '¡Sí! Ahí caen las fichas', 'board.ng': '¡Las troneras son los agujeros redondos de las esquinas!',
      'slide.t': 'Colocar el striker', 'slide.b': 'El striker puede ir donde quieras <b>entre las dos líneas base</b>. Busca un buen ángulo: yo busco así mi sitio para la siesta.', 'slide.k': 'Desliza el striker hasta la marca brillante', 'slide.ok': '¡Justo ahí! Colocarse es el primer paso del maestro',
      'flick.t': 'Lánzala dentro', 'flick.b': '<b>Pulsa el striker, tira hacia atrás y suelta</b> para lanzar. ¡Cuanto más tiras, más fuerza! La línea de puntos muestra qué tocarás.', 'flick.k': 'Mete la ficha blanca', 'flick.ok': '¡Plop! ¡Buen tiro!', 'flick.ng': '¡Casi! Pon el aro del final de la línea sobre la ficha blanca',
      'cut.t': 'Tu color, otra vez', 'cut.b': 'Eres <b>blancas</b>. Si metes una blanca, <b>tiras otra vez</b>; si metes una negra, cambia el turno. Golpéala de lado —un <b>corte</b>— y sale en diagonal.', 'cut.k': 'Mete la blanca con un corte', 'cut.ok': '¡Gran corte! Sigue así', 'cut.ng': '¡Casi! Que la línea verde apunte a la tronera',
      'queen.t': 'La reina roja', 'queen.b': 'La roja es la <b>reina</b> (3 puntos). Métela y luego <b>cúbrela</b>: mete una blanca en el siguiente tiro. Si no, vuelve al centro. ¡Las reinas son exigentes!', 'queen.k': 'Mete la reina', 'queen.k2': 'Ahora cúbrela: mete una blanca', 'queen.ok': '¡Cubierta! La reina es tuya', 'queen.ng': '¡Casi! Pon el aro sobre la reina roja', 'queen.ng2': 'Sin cubrir… ¡otra vez desde la reina!',
      'foul.t': 'Si cae el striker', 'foul.b': '<b>Meter el striker es falta</b>: una de tus blancas metidas <b>vuelve al centro</b>. Cuando me caigo al río, yo también vuelvo empapado.', 'foul.k': 'Toca para verlo', 'foul.ok': '¿Ves? Volvió una blanca. ¡No tires tan fuerte!',
      'win.t': '¡Ya puedes jugar!', 'win.b': '<b>Mete las nueve blancas con la reina cubierta</b> y el tablero es tuyo. Sumas las fichas que le quedan al rival, +3 por la reina que cubriste. ¡Vamos a deslizarnos!',
    },
    fr: {
      'board.t': 'Le plateau et les poches', 'board.b': 'Les trous des coins sont les <b>poches</b>. Les deux lignes proches sont ta <b>ligne de base</b>, où se pose le striker. Plus importante que mon nombril !', 'board.k': 'Touche une poche', 'board.ok': 'Oui ! C’est là que tombent les pions', 'board.ng': 'Les poches sont les trous ronds des coins !',
      'slide.t': 'Placer le striker', 'slide.b': 'Le striker peut aller partout <b>entre les deux lignes de base</b>. Cherche un bon angle — moi, je cherche ma place de sieste pareil.', 'slide.k': 'Glisse le striker jusqu’à la marque', 'slide.ok': 'Pile poil ! Bien se placer, c’est la base',
      'flick.t': 'Pichenette !', 'flick.b': '<b>Appuie sur le striker, tire-le en arrière et lâche</b> pour tirer. Plus tu tires, plus c’est fort ! Les pointillés montrent ce que tu vas toucher.', 'flick.k': 'Empoche le pion blanc', 'flick.ok': 'Plouf ! Joli coup !', 'flick.ng': 'Presque ! Mets l’anneau au bout de la ligne sur le pion blanc',
      'cut.t': 'Ta couleur, et on rejoue', 'cut.b': 'Tu es <b>blanc</b>. Un blanc empoché et tu <b>rejoues</b> ; un noir et la main passe. Touche un pion sur le côté — une <b>coupe</b> — et il part en biais.', 'cut.k': 'Empoche le blanc en coupe', 'cut.ok': 'Belle coupe ! Continue', 'cut.ng': 'Presque ! La ligne verte doit viser la poche',
      'queen.t': 'La reine rouge', 'queen.b': 'La rouge est la <b>reine</b> (3 points). Empoche-la, puis <b>couvre-la</b> : un blanc au coup suivant. Sinon, retour au centre. Les reines sont capricieuses !', 'queen.k': 'Empoche la reine', 'queen.k2': 'Couvre-la : empoche un blanc', 'queen.ok': 'Couverte ! La reine est à toi', 'queen.ng': 'Presque ! Mets l’anneau sur la reine rouge', 'queen.ng2': 'Pas couverte… on reprend avec la reine !',
      'foul.t': 'Si le striker tombe', 'foul.b': '<b>Le striker dans une poche, c’est une faute</b> : un de tes blancs <b>revient au centre</b>. Quand je tombe dans la rivière, je reviens trempé aussi.', 'foul.k': 'Touche pour voir', 'foul.ok': 'Tu vois ? Un blanc est revenu. Pas trop fort !',
      'win.t': 'Tu es prêt !', 'win.b': '<b>Empoche les neuf blancs, la reine couverte</b>, et le plateau est à toi. Tu marques les pions qu’il reste à l’adversaire, +3 pour une reine que tu as couverte. Allez, on glisse !',
    },
    pt: {
      'board.t': 'O tabuleiro e as caçapas', 'board.b': 'Os buracos dos cantos são as <b>caçapas</b>. As duas linhas perto de você são a <b>linha de base</b>, onde fica o striker. Mais importante que meu umbigo!', 'board.k': 'Toque em qualquer caçapa', 'board.ok': 'Isso! É ali que as peças caem', 'board.ng': 'As caçapas são os buracos redondos dos cantos!',
      'slide.t': 'Colocar o striker', 'slide.b': 'O striker pode ficar em qualquer lugar <b>entre as duas linhas de base</b>. Procure um bom ângulo — eu procuro assim meu lugar de soneca.', 'slide.k': 'Deslize o striker até a marca brilhante', 'slide.ok': 'Na mosca! Posicionar é o primeiro passo do mestre',
      'flick.t': 'Peteleco!', 'flick.b': '<b>Segure o striker, puxe para trás e solte</b> para tacar. Quanto mais puxa, mais forte! A linha pontilhada mostra o que você vai acertar.', 'flick.k': 'Encaçape a peça branca', 'flick.ok': 'Plop! Bela tacada!', 'flick.ng': 'Quase! Ponha o anel do fim da linha na peça branca',
      'cut.t': 'Sua cor, de novo', 'cut.b': 'Você é <b>branco</b>. Encaçapou uma branca, <b>joga de novo</b>; uma preta, passa a vez. Bata de lado — um <b>corte</b> — e a peça sai na diagonal.', 'cut.k': 'Encaçape a branca com um corte', 'cut.ok': 'Que corte! Continue', 'cut.ng': 'Quase! A linha verde tem que apontar para a caçapa',
      'queen.t': 'A rainha vermelha', 'queen.b': 'A vermelha é a <b>rainha</b> (3 pontos). Encaçape-a e depois <b>cubra</b>: uma branca na tacada seguinte. Se não, ela volta ao centro. Rainhas são exigentes!', 'queen.k': 'Encaçape a rainha', 'queen.k2': 'Agora cubra: encaçape uma branca', 'queen.ok': 'Coberta! A rainha é sua', 'queen.ng': 'Quase! Ponha o anel na rainha vermelha', 'queen.ng2': 'Não cobriu… de novo a partir da rainha!',
      'foul.t': 'Se o striker cair', 'foul.b': '<b>Striker na caçapa é falta</b>: uma das suas brancas <b>volta ao centro</b>. Quando caio no rio, também volto encharcado.', 'foul.k': 'Toque para ver', 'foul.ok': 'Viu? Uma branca voltou. Não bata forte demais!',
      'win.t': 'Pronto para jogar!', 'win.b': '<b>Encaçape as nove brancas com a rainha coberta</b> e o tabuleiro é seu. Você marca as peças que sobraram ao rival, +3 pela rainha que cobriu. Vamos deslizar!',
    },
    de: {
      'board.t': 'Brett und Löcher', 'board.b': 'Die Löcher in den Ecken sind die <b>Taschen</b>. Die zwei nahen Linien sind deine <b>Grundlinie</b> für den Striker. Wichtiger als mein Bauchnabel!', 'board.k': 'Tippe auf eine Tasche', 'board.ok': 'Genau! Da fallen die Steine hinein', 'board.ng': 'Die Taschen sind die runden Löcher in den Ecken!',
      'slide.t': 'Den Striker setzen', 'slide.b': 'Der Striker darf überall <b>zwischen den zwei Grundlinien</b> liegen. Such einen guten Winkel — so suche ich mir auch meinen Schlafplatz.', 'slide.k': 'Schieb den Striker zur leuchtenden Marke', 'slide.ok': 'Genau richtig! Gut gesetzt ist halb gewonnen',
      'flick.t': 'Hineinschnippen', 'flick.b': '<b>Drück auf den Striker, zieh ihn zurück und lass los</b>. Je weiter, desto kräftiger! Die Punktlinie zeigt, was du triffst.', 'flick.k': 'Versenk den weißen Stein', 'flick.ok': 'Plopp! Schöner Stoß!', 'flick.ng': 'Knapp! Setz den Ring am Linienende auf den weißen Stein',
      'cut.t': 'Deine Farbe, nochmal', 'cut.b': 'Du bist <b>Weiß</b>. Versenkst du Weiß, <b>darfst du nochmal</b>; Schwarz, und es wird gewechselt. Triffst du einen Stein seitlich — ein <b>Schnitt</b> —, läuft er schräg.', 'cut.k': 'Schneid den weißen Stein hinein', 'cut.ok': 'Toller Schnitt! Weiter so', 'cut.ng': 'Fast! Die grüne Linie muss auf die Tasche zeigen',
      'queen.t': 'Die rote Königin', 'queen.b': 'Rot ist die <b>Königin</b> (3 Punkte). Versenk sie und <b>decke</b> sie dann: gleich im nächsten Stoß ein Weißer. Sonst kommt sie zurück. Königinnen sind wählerisch!', 'queen.k': 'Versenk die Königin', 'queen.k2': 'Jetzt decken: versenk einen Weißen', 'queen.ok': 'Gedeckt! Die Königin gehört dir', 'queen.ng': 'Knapp! Setz den Ring auf die rote Königin', 'queen.ng2': 'Nicht gedeckt… nochmal ab der Königin!',
      'foul.t': 'Wenn der Striker fällt', 'foul.b': '<b>Der Striker in der Tasche ist ein Foul</b>: einer deiner Weißen <b>kommt in die Mitte zurück</b>. Wenn ich in den Fluss falle, komme ich auch tropfnass zurück.', 'foul.k': 'Tippen zum Zuschauen', 'foul.ok': 'Siehst du? Ein Weißer kam zurück. Nicht zu fest!',
      'win.t': 'Du bist bereit!', 'win.b': '<b>Alle neun Weißen versenkt und die Königin gedeckt</b> — das Board gehört dir. Du bekommst die Steine, die der Gegner noch hat, +3 für eine Königin, die du gedeckt hast. Auf zum Rutschen!',
    },
    ru: {
      'board.t': 'Доска и лузы', 'board.b': 'Дыры в углах — это <b>лузы</b>. Две ближние линии — твоя <b>базовая линия</b> для страйкера. Важнее моего пупка!', 'board.k': 'Нажми на любую лузу', 'board.ok': 'Да! Туда и падают фишки', 'board.ng': 'Лузы — это круглые дыры в углах!',
      'slide.t': 'Ставим страйкер', 'slide.b': 'Страйкер можно ставить где угодно <b>между двумя базовыми линиями</b>. Ищи хороший угол — я так же ищу место для сна.', 'slide.k': 'Сдвинь страйкер к светящейся отметке', 'slide.ok': 'Точно! Хорошая позиция — первый шаг мастера',
      'flick.t': 'Щелчок', 'flick.b': '<b>Нажми на страйкер, оттяни назад и отпусти</b>. Чем дальше тянешь, тем сильнее! Пунктир показывает, во что попадёшь.', 'flick.k': 'Забей белую фишку', 'flick.ok': 'Бульк! Отличный удар!', 'flick.ng': 'Почти! Наведи кольцо на конце линии на белую фишку',
      'cut.t': 'Свой цвет — ещё удар', 'cut.b': 'Ты играешь <b>белыми</b>. Забил белую — <b>бей ещё</b>; забил чёрную — ход переходит. Удар по краю фишки — <b>срезка</b> — отправит её наискосок.', 'cut.k': 'Забей белую срезкой', 'cut.ok': 'Отличная срезка! Продолжай', 'cut.ng': 'Чуть-чуть! Зелёная линия должна смотреть в лузу',
      'queen.t': 'Красная королева', 'queen.b': 'Красная — <b>королева</b> (3 очка). Забей её, а потом <b>прикрой</b>: следующим же ударом забей белую. Иначе она вернётся в центр. Королевы капризны!', 'queen.k': 'Забей королеву', 'queen.k2': 'Теперь прикрой: забей белую', 'queen.ok': 'Прикрыта! Королева твоя', 'queen.ng': 'Почти! Наведи кольцо на красную королеву', 'queen.ng2': 'Не прикрыта… снова с королевы!',
      'foul.t': 'Если страйкер упал', 'foul.b': '<b>Страйкер в лузе — это фол</b>: одна из забитых белых <b>возвращается в центр</b>. Когда я падаю в реку, тоже возвращаюсь мокрым.', 'foul.k': 'Нажми, чтобы посмотреть', 'foul.ok': 'Видишь? Одна белая вернулась. Не бей слишком сильно!',
      'win.t': 'Можно играть!', 'win.b': '<b>Забей все девять белых при прикрытой королеве</b> — и доска твоя. Очки — фишки, оставшиеся у соперника, +3 за королеву, которую прикрыл ты. Поехали кататься!',
    },
    tr: {
      'board.t': 'Tahta ve cepler', 'board.b': 'Köşelerdeki delikler <b>ceplerdir</b>. Sana yakın iki çizgi, vurucuyu koyduğun <b>taban çizgisi</b>. Göbeğimden bile önemli!', 'board.k': 'Herhangi bir cebe dokun', 'board.ok': 'Evet! Taşlar oraya düşer', 'board.ng': 'Cepler köşelerdeki yuvarlak deliklerdir!',
      'slide.t': 'Vurucuyu koymak', 'slide.b': 'Vurucu <b>iki taban çizgisinin arasında</b> her yere konabilir. İyi bir açı ara — ben de uyku yerimi böyle ararım.', 'slide.k': 'Vurucuyu parlayan işarete kaydır', 'slide.ok': 'Tam yerinde! İyi yerleşmek ustalığın ilk adımı',
      'flick.t': 'Fiskeyle sok', 'flick.b': '<b>Vurucuya bas, geri çek ve bırak</b>. Ne kadar çekersen o kadar güçlü! Noktalı çizgi neye çarpacağını gösterir.', 'flick.k': 'Beyaz taşı cebe sok', 'flick.ok': 'Plop! Güzel atış!', 'flick.ng': 'Az kaldı! Çizginin ucundaki halkayı beyaz taşa getir',
      'cut.t': 'Kendi rengin, bir daha', 'cut.b': 'Sen <b>beyazsın</b>. Beyaz sokarsan <b>bir daha</b> atarsın; siyah sokarsan sıra geçer. Taşa yandan vurursan — bir <b>kesme</b> — çapraz gider.', 'cut.k': 'Beyazı kesmeyle sok', 'cut.ok': 'Harika kesme! Devam', 'cut.ng': 'Neredeyse! Yeşil çizgi cebe baksın',
      'queen.t': 'Kırmızı kraliçe', 'queen.b': 'Kırmızı <b>kraliçedir</b> (3 puan). Onu sok, sonra <b>kapat</b>: hemen sonraki atışta bir beyaz sok. Yoksa ortaya döner. Kraliçeler nazlıdır!', 'queen.k': 'Kraliçeyi sok', 'queen.k2': 'Şimdi kapat: bir beyaz sok', 'queen.ok': 'Kapatıldı! Kraliçe senin', 'queen.ng': 'Az kaldı! Halkayı kırmızı kraliçeye getir', 'queen.ng2': 'Kapatılamadı… kraliçeden baştan!',
      'foul.t': 'Vurucu düşerse', 'foul.b': '<b>Vurucu cebe düşerse faul</b>: soktuğun beyazlardan biri <b>ortaya geri döner</b>. Ben de nehre düşünce sırılsıklam dönerim.', 'foul.k': 'İzlemek için dokun', 'foul.ok': 'Gördün mü? Bir beyaz geri geldi. Çok sert vurma!',
      'win.t': 'Artık oynayabilirsin!', 'win.b': '<b>Dokuz beyazın hepsini sok, kraliçe de kapatılmış olsun</b>, tahta senin. Rakibin kalan taşları puanın olur, kapattığın kraliçe +3. Hadi kaymaya gidelim!',
    },
    id: {
      'board.t': 'Papan dan lubang', 'board.b': 'Lubang di sudut adalah <b>kantong</b>. Dua garis dekatmu adalah <b>garis dasar</b> tempat striker. Lebih penting dari pusarku!', 'board.k': 'Ketuk kantong mana saja', 'board.ok': 'Betul! Di situ biji jatuh', 'board.ng': 'Kantong itu lubang bundar di sudut!',
      'slide.t': 'Menaruh striker', 'slide.b': 'Striker boleh di mana saja <b>di antara dua garis dasar</b>. Cari sudut yang bagus — aku juga begitu mencari tempat tidur siang.', 'slide.k': 'Geser striker ke tanda yang menyala', 'slide.ok': 'Pas! Posisi bagus itu langkah pertama sang jagoan',
      'flick.t': 'Sentil masuk', 'flick.b': '<b>Tekan striker, tarik ke belakang, lalu lepas</b>. Makin jauh ditarik, makin kuat! Garis titik menunjukkan apa yang akan kena.', 'flick.k': 'Masukkan biji putih', 'flick.ok': 'Plung! Tembakan bagus!', 'flick.ng': 'Hampir! Taruh cincin di ujung garis pada biji putih',
      'cut.t': 'Warnamu, sekali lagi', 'cut.b': 'Kamu <b>putih</b>. Masukkan putih, kamu <b>main lagi</b>; masukkan hitam, giliran pindah. Kena di sisi biji — <b>potongan</b> — dan biji meluncur miring.', 'cut.k': 'Masukkan putih dengan potongan', 'cut.ok': 'Potongan hebat! Lanjutkan', 'cut.ng': 'Hampir! Garis hijau harus mengarah ke kantong',
      'queen.t': 'Ratu merah', 'queen.b': 'Merah adalah <b>ratu</b> (3 poin). Masukkan dia, lalu <b>tutup</b>: masukkan putih di sentilan berikutnya. Kalau tidak, dia kembali ke tengah. Ratu itu rewel!', 'queen.k': 'Masukkan ratu', 'queen.k2': 'Sekarang tutup: masukkan putih', 'queen.ok': 'Tertutup! Ratu milikmu', 'queen.ng': 'Hampir! Taruh cincin pada ratu merah', 'queen.ng2': 'Tidak tertutup… ulang dari ratu!',
      'foul.t': 'Kalau striker jatuh', 'foul.b': '<b>Striker masuk kantong itu pelanggaran</b>: satu biji putihmu <b>kembali ke tengah</b>. Kalau aku jatuh ke sungai, aku juga pulang basah kuyup.', 'foul.k': 'Ketuk untuk melihat', 'foul.ok': 'Lihat? Satu putih kembali. Jangan terlalu keras!',
      'win.t': 'Kamu siap main!', 'win.b': '<b>Masukkan sembilan putih dengan ratu sudah tertutup</b>, papan jadi milikmu. Poinmu adalah biji lawan yang tersisa, +3 untuk ratu yang kamu tutup. Ayo meluncur!',
    },
    hi: {
      'board.t': 'बोर्ड और पॉकेट', 'board.b': 'कोनों के छेद <b>पॉकेट</b> हैं। पास की दो रेखाएँ तुम्हारी <b>बेस लाइन</b> हैं, जहाँ स्ट्राइकर रखते हैं। मेरी नाभि से भी ज़रूरी!', 'board.k': 'कोई भी पॉकेट छुओ', 'board.ok': 'हाँ! गोटियाँ वहीं गिरती हैं', 'board.ng': 'पॉकेट कोनों के गोल छेद हैं!',
      'slide.t': 'स्ट्राइकर रखना', 'slide.b': 'स्ट्राइकर <b>दोनों बेस लाइनों के बीच</b> कहीं भी रख सकते हो। अच्छा कोण ढूँढो — मैं भी सोने की जगह ऐसे ही ढूँढता हूँ।', 'slide.k': 'स्ट्राइकर को चमकते निशान तक खिसकाओ', 'slide.ok': 'बिल्कुल सही! सही जगह ही उस्ताद की पहली सीढ़ी',
      'flick.t': 'मारकर डालो', 'flick.b': '<b>स्ट्राइकर दबाओ, पीछे खींचो और छोड़ दो</b>। जितना खींचोगे, उतना ज़ोर! बिंदुदार रेखा बताती है कि क्या लगेगा।', 'flick.k': 'सफ़ेद गोटी पॉकेट में डालो', 'flick.ok': 'टप! बढ़िया शॉट!', 'flick.ng': 'करीब! रेखा के सिरे का छल्ला सफ़ेद गोटी पर रखो',
      'cut.t': 'अपना रंग, फिर से', 'cut.b': 'तुम <b>सफ़ेद</b> हो। सफ़ेद डाली तो <b>फिर मारो</b>; काली डाली तो बारी बदली। गोटी को किनारे से मारो — <b>कट</b> — तो वह तिरछी जाती है।', 'cut.k': 'कट से सफ़ेद गोटी डालो', 'cut.ok': 'शानदार कट! ऐसे ही चलो', 'cut.ng': 'बस थोड़ा! हरी रेखा पॉकेट की ओर हो',
      'queen.t': 'लाल रानी', 'queen.b': 'लाल गोटी <b>रानी</b> है (3 अंक)। उसे डालो, फिर <b>कवर</b> करो: अगले ही शॉट में सफ़ेद डालो। नहीं तो वह बीच में लौट जाती है। रानियाँ नखरीली होती हैं!', 'queen.k': 'रानी को पॉकेट में डालो', 'queen.k2': 'अब कवर करो: सफ़ेद डालो', 'queen.ok': 'कवर! रानी तुम्हारी', 'queen.ng': 'करीब! छल्ला लाल रानी पर रखो', 'queen.ng2': 'कवर नहीं हुई… रानी से फिर!',
      'foul.t': 'अगर स्ट्राइकर गिरे', 'foul.b': '<b>स्ट्राइकर पॉकेट में गया तो फ़ाउल</b>: तुम्हारी डाली हुई एक सफ़ेद <b>बीच में लौटती है</b>। मैं भी नदी में गिरूँ तो भीगकर लौटता हूँ।', 'foul.k': 'देखने के लिए छुओ', 'foul.ok': 'देखा? एक सफ़ेद लौट आई। बहुत ज़ोर से मत मारो!',
      'win.t': 'अब खेल सकते हो!', 'win.b': '<b>नौ सफ़ेद गोटियाँ डालो और रानी कवर हो</b> तो बोर्ड तुम्हारा। विरोधी की बची गोटियाँ तुम्हारे अंक, खुद कवर की रानी +3। चलो फिसलने चलें!',
    },
    ar: {
      'board.t': 'اللوحة والجيوب', 'board.b': 'الثقوب في الزوايا هي <b>الجيوب</b>. والخطان القريبان منك هما <b>خط القاعدة</b> حيث تضع الضارب. أهم من سُرّتي!', 'board.k': 'المس أي جيب', 'board.ok': 'نعم! هناك تسقط القطع', 'board.ng': 'الجيوب هي الثقوب المستديرة في الزوايا!',
      'slide.t': 'وضع الضارب', 'slide.b': 'يمكن وضع الضارب في أي مكان <b>بين خطَّي القاعدة</b>. ابحث عن زاوية جيدة — هكذا أبحث أنا عن مكان قيلولتي.', 'slide.k': 'حرّك الضارب إلى العلامة المضيئة', 'slide.ok': 'تمامًا! الموضع الجيد أول خطوة للمحترف',
      'flick.t': 'انقر لتُدخل', 'flick.b': '<b>اضغط على الضارب واسحبه للخلف ثم أفلته</b>. كلما سحبت أكثر زادت القوة! الخط المنقّط يريك ما ستصيب.', 'flick.k': 'أدخل القطعة البيضاء', 'flick.ok': 'بلوب! ضربة رائعة!', 'flick.ng': 'قريب! ضع الحلقة في نهاية الخط على القطعة البيضاء',
      'cut.t': 'لونك، ومرة أخرى', 'cut.b': 'أنت <b>الأبيض</b>. إن أدخلت بيضاء <b>تضرب مجددًا</b>، وإن أدخلت سوداء ينتقل الدور. اضرب القطعة من جانبها — <b>قطع</b> — فتنطلق بزاوية.', 'cut.k': 'أدخل البيضاء بضربة قطع', 'cut.ok': 'قطع رائع! تابع', 'cut.ng': 'تقريبًا! اجعل الخط الأخضر يشير إلى الجيب',
      'queen.t': 'الملكة الحمراء', 'queen.b': 'الحمراء هي <b>الملكة</b> (3 نقاط). أدخلها ثم <b>غطِّها</b>: أدخل بيضاء في الضربة التالية مباشرة، وإلا عادت إلى الوسط. الملكات صعبات المزاج!', 'queen.k': 'أدخل الملكة', 'queen.k2': 'والآن غطِّها: أدخل بيضاء', 'queen.ok': 'غُطيت! الملكة لك', 'queen.ng': 'قريب! ضع الحلقة على الملكة الحمراء', 'queen.ng2': 'لم تُغطَّ… من الملكة مجددًا!',
      'foul.t': 'إذا سقط الضارب', 'foul.b': '<b>سقوط الضارب في جيب خطأ</b>: تعود واحدة من بيضاتك <b>إلى الوسط</b>. وأنا حين أسقط في النهر أعود مبتلًّا أيضًا.', 'foul.k': 'المس لتشاهد', 'foul.ok': 'أرأيت؟ عادت بيضاء. لا تضرب بقوة زائدة!',
      'win.t': 'أنت جاهز!', 'win.b': '<b>أدخل البيضات التسع والملكة مغطاة</b> فتكون اللوحة لك. تحسب قطع الخصم الباقية، و+3 لملكة غطيتها أنت. هيا ننزلق!',
    },
  };
  // the pages: the men staged on the board (cm; c, x, y), the striker's place, the task
  const PAGES = [
    { id: 'intro' },
    { id: 'board', kind: 'tap', open: true },
    { id: 'slide', kind: 'slide', open: true, sx: -8, goal: 14 },
    { id: 'flick', kind: 'shot', sx: 8, men: [['w', 22.7, -7.8], ['b', -10, -5], ['b', -21, 9], ['w', -15, -20], ['b', 6, -26]], need: 'w' },
    { id: 'cut', kind: 'shot', sx: 0, men: [['w', -28.5, -24.5], ['b', 5, -10], ['b', 20, 4], ['w', 14, -24]], need: 'w' },
    { id: 'queen', kind: 'queen', sx: -6, men: [['q', -20.4, -4.8], ['w', 22.7, -7.8], ['b', 3, -14], ['b', -2, 8]], pk: 1 },
    { id: 'foul', kind: 'demo', sx: 20, men: [['b', -12, -10], ['w', 6, -16], ['b', -26, 12]], pk: 2 },
    { id: 'win', last: true, men: [['b', -14, -12], ['b', 9, 5], ['b', 24, -22]], won: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.CarromEngine, D = E.DIM;
    const L = Object.assign({}, UI.en, UI[ctx.lang] || {}), VO = Object.assign({}, VOICE.en, VOICE[ctx.lang] || {});
    const T = k => VO[k] != null ? VO[k] : '';
    try { localStorage.setItem('aicoding-carrom-rules-seen', '1'); } catch (e) {}
    const SND = (window.Atlas3D && Atlas3D.carrom && Atlas3D.carrom.SND) || { flick() {}, hit() {}, cush() {}, pocket() {}, place() {}, good() {}, bad() {}, win() {} };
    const board = T3.MODELS.carrom(true); T3.show('carrom', board); if (T3.play) T3.play(true);
    const U = board.userData, Y = U.top, K = U.K, W = 2 * (U.S + 7 * K);
    const baseFit = () => innerHeight > innerWidth * 1.15 ? { w: W + .3, d: W + 1.6, y: Y, pitch: 1.3 } : { w: W + .3, d: W + 1.1, y: Y, pitch: 1.26 };
    if (T3.fit) T3.fit(baseFit());
    const onResizeF = () => { if (T3.fit) T3.fit(baseFit()); };
    addEventListener('resize', onResizeF);
    let st = null, step = 0, played = false, busy = false, stopped = false, phase = '', stage = 0, timers = [], sx = 0, drag = null, aimAng = -Math.PI / 2, aimPow = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const wx = (x, y) => U.xz(x, y), kick = ms => T3.kick && T3.kick(ms || 150);
    const BY = E.baseY(0);

    /* ---------- the men: kept from page to page; only the new ones drop in ---------- */
    let meshes = [];   // { c, x, y, g }
    let striker = null;
    function mk(c) { const g = c === 's' ? U.striker() : U.piece(c), sh = T3.contact((c === 's' ? U.RS : U.R) * 1.15, .42); sh.position.y = .004; g.add(sh); board.add(g); return g; }
    function put(g, x, y, h) { const [a, b] = wx(x, y); g.position.set(a, Y + (h || 0), b); }
    function stage0(pg) {   // the engine state for the page
      const s = E.newBoard(); s.brk.done = true;
      if (pg.open || !pg.men) return s;
      s.pcs = pg.men.map(([c, x, y], i) => ({ id: i, c, x, y, on: true }));
      if (pg.won) { s.pk.w = 9; s.pk.b = 6; s.queen = { st: 'cov', by: 0 }; }
      else { s.pk.w = pg.pk || 0; s.pk.b = 0; }
      // the men already pocketed (pk) are kept off the board
      for (let i = 0; i < (s.pk.w || 0) && !pg.won; i++) s.pcs.push({ id: s.pcs.length, c: 'w', x: 0, y: 0, on: false });
      s.pcs.forEach((m, i) => { m.id = i; });
      return s;
    }
    function setBoard() {
      const want = st.pcs.filter(m => m.on).map(m => ({ c: m.c, x: m.x, y: m.y, id: m.id }));
      const keep = [], newOnes = [];
      const pool = meshes.slice();
      want.forEach(w => { const j = pool.findIndex(o => o.c === w.c && Math.abs(o.x - w.x) < .05 && Math.abs(o.y - w.y) < .05); if (j >= 0) { const o = pool.splice(j, 1)[0]; o.id = w.id; keep.push(o); } else newOnes.push(w); });
      pool.forEach(o => board.remove(o.g));   // gone: taken off quietly
      const added = newOnes.map(w => { const g = mk(w.c); put(g, w.x, w.y, 1.4); return { c: w.c, x: w.x, y: w.y, id: w.id, g }; });
      meshes = keep.concat(added);
      if (added.length) { const t0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, now - t0) / 420), e = 1 - Math.pow(1 - k, 3); added.forEach(o => put(o.g, o.x, o.y, (1 - e) * 1.4)); kick(120); if (k < 1) requestAnimationFrame(s); else SND.place(); })(t0); }
      kick(200);
    }
    const meshOf = id => (meshes.find(o => o.id === id) || {}).g;

    /* ---------- guides (as the game: the dotted line to the first man, the green line where it goes, the power arrow) ---------- */
    const gd = new TH.Group(); board.add(gd);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { arrow: basic(0xffffff, .95), path: basic(0xffffff, .85), man: basic(0x3df59a, .95), base: basic(0x3df59a, .35), ring: basic(0xffd34d, .95), pocket: basic(0xffd34d, .9) };
    const GEO = { bar: new TH.BoxGeometry(1, .006, 1), ring: new TH.TorusGeometry(D.RS * K, .012, 6, 40), pring: new TH.TorusGeometry(D.RP * K * 1.35, .02, 6, 40), cone: new TH.ConeGeometry(.08, .2, 3) };
    GEO.ring.rotateX(Math.PI / 2); GEO.pring.rotateX(Math.PI / 2); GEO.cone.rotateX(Math.PI / 2);
    function clearGuides() { while (gd.children.length) gd.remove(gd.children[0]); kick(100); }
    function bar(x0, y0, x1, y1, wid, mat, lift) { const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy); if (len < .05) return; const m = new TH.Mesh(GEO.bar, mat), [a, b] = wx((x0 + x1) / 2, (y0 + y1) / 2); m.position.set(a, Y + (lift || .03), b); m.scale.set(len * K, 1, wid * K); m.rotation.y = -Math.atan2(dy, dx); m.renderOrder = 4; gd.add(m); }
    function dots(x0, y0, x1, y1, mat) { const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 1.6); for (let i = 0; i < n; i++) { const a = (i + .15) / n, b = (i + .55) / n; bar(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, x0 + (x1 - x0) * b, y0 + (y1 - y0) * b, .32, mat); } }
    function ring(x, y, geo, mat, s, pul) { const m = new TH.Mesh(geo, mat), [a, b] = wx(x, y); m.position.set(a, Y + .035, b); m.scale.setScalar(s || 1); m.renderOrder = 4; m.userData.pulse = pul ? (s || 1) : 0; gd.add(m); return m; }
    function guides() {
      clearGuides();
      const pg = P();
      if (pg.kind === 'tap' && !played) D.POCKETS.forEach(([x, y]) => ring(x, y, GEO.pring, MAT.pocket, 1, true));
      if ((pg.kind === 'slide' || pg.kind === 'shot' || pg.kind === 'queen') && !played && !busy) {
        bar(-D.BX, BY, D.BX, BY, D.LINE + .4, MAT.base, .012);
        if (pg.kind === 'slide') ring(pg.goal, BY, GEO.ring, MAT.ring, 1.25, true);
        else {
          if (drag && drag.kind === 'aim') {
            const tr = E.aimTrace(st, 0, sx, aimAng);
            dots(sx, BY, tr.gx, tr.gy, MAT.path); ring(tr.gx, tr.gy, GEO.ring, MAT.path);
            if (tr.man >= 0) { const m = st.pcs[tr.man]; bar(m.x, m.y, m.x + tr.ox * 9, m.y + tr.oy * 9, .5, MAT.man); }
            const L0 = D.RS + 2 + aimPow * 18, ex = sx + Math.cos(aimAng) * L0, ey = BY + Math.sin(aimAng) * L0;
            MAT.arrow.color.setHSL(.33 - aimPow * .33, .9, .55);
            bar(sx + Math.cos(aimAng) * D.RS, BY + Math.sin(aimAng) * D.RS, ex, ey, .9, MAT.arrow, .045);
            const c = new TH.Mesh(GEO.cone, MAT.arrow), [a, b] = wx(ex, ey); c.position.set(a, Y + .05, b); c.rotation.y = -aimAng + Math.PI / 2; c.renderOrder = 5; gd.add(c);
          } else ring(sx, BY, GEO.ring, MAT.ring, 1.18, true);
        }
      }
      kick(120);
    }
    let pulseT = 0;
    { const t0 = performance.now(); pulseT = setInterval(() => { if (stopped) return; let any = false; gd.children.forEach(m => { if (m.userData.pulse) { m.scale.setScalar(m.userData.pulse * (1.06 + Math.sin((performance.now() - t0) / 230) * .08)); any = true; } }); if (any) kick(80); }, 60); }

    /* ---------- a stroke: simulate and play it back ---------- */
    function playback(sim) {
      return new Promise(done => {
        const F = sim.frames, N = st.pcs.length, t0 = performance.now(), sinks = {}, pocketOf = {};
        sim.pocketed.forEach(e => { pocketOf[e.id] = e.q; });
        let ev = 0, last = t0, el = 0;
        (function stp(now) {
          if (stopped) return done();
          now = performance.now(); el += Math.max(0, now - last) / 1000; last = now;
          const fi = Math.min(F.length - 1, Math.floor(el * 60)), f = F[fi];
          for (let i = 0; i <= N; i++) {
            const g = i === N ? striker : meshOf(i); if (!g) continue;
            if (f[i * 3 + 2]) { put(g, f[i * 3], f[i * 3 + 1]); g.visible = true; continue; }
            if (!g.visible) continue;
            if (!sinks[i]) { let q = pocketOf[i]; if (q == null) { let bd = 1e9; D.POCKETS.forEach((P2, j) => { const d = Math.hypot(P2[0] - f[i * 3], P2[1] - f[i * 3 + 1]); if (d < bd) { bd = d; q = j; } }); } sinks[i] = { t: el, x: g.position.x, z: g.position.z, q }; }
            const s = sinks[i], k = Math.min(1, (el - s.t) / .22), [px, pz] = wx(...D.POCKETS[s.q || 0]);
            g.position.set(s.x + (px - s.x) * k, Y - k * k * .2, s.z + (pz - s.z) * k); if (k >= 1) g.visible = false;
          }
          while (ev < sim.events.length && sim.events[ev].t <= el) { const e = sim.events[ev++]; if (e.k === 'hit' && e.v > 8) SND.hit(e.v); else if (e.k === 'cush' && e.v > 25) SND.cush(e.v); else if (e.k === 'pocket') SND.pocket(); }
          kick(120);
          if (fi < F.length - 1 || Object.values(sinks).some(s => el - s.t < .22)) requestAnimationFrame(stp); else done();
        })(t0);
      });
    }
    // the help: an aim close to a clean pot of the page's man is set right on it, with a power that sinks it
    function assisted(shot, want) {
      const tg = st.pcs.filter(m => m.on && m.c === want);
      let best = null;
      for (const m of tg) for (const [qx, qy] of D.POCKETS) {
        const dm = Math.hypot(qx - m.x, qy - m.y), ux = (qx - m.x) / dm, uy = (qy - m.y) / dm, gx = m.x - ux * (D.RS + D.RM), gy = m.y - uy * (D.RS + D.RM);
        const ang = Math.atan2(gy - BY, gx - shot.x); let da = Math.abs(ang - shot.ang); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > 9 * Math.PI / 180 || (best && da >= best.da)) continue;
        // a power that sinks it (and not the striker)
        const ok = []; for (let v = 90; v <= E.VMAX; v += 18) { const sim = E.simulate(st, 0, { x: shot.x, ang, v }); if (!sim.strikerIn && sim.pocketed.some(e => e.id === m.id)) ok.push(v); }
        if (ok.length) best = { da, ang, v: ok[Math.min(ok.length - 1, Math.floor(ok.length * .35))] };
      }
      return best ? { x: shot.x, ang: best.ang, v: best.v } : shot;
    }
    async function strike(shot) {
      busy = true; clearGuides(); SND.flick();
      const sim = E.simulate(st, 0, shot, { frames: true });
      await playback(sim); if (stopped) return null;
      const r = E.resolve(st, sim); busy = false;
      return { sim, r };
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
      + '.rgd .urt{background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a;font-weight:900;box-shadow:0 3px 0 #e6b43a;animation:crtP 1.6s ease-in-out infinite}@keyframes crtP{50%{box-shadow:0 3px 0 #e6b43a,0 0 0 5px rgba(240,194,74,.28)}}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}}';
    document.head.appendChild(css);
    // Otto's voice: a soft blip as the words type out (every guided course has it — common rule)
    let AC = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; AC = AC || window.__atlasAC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const f = 520 + Math.random() * 240, t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .06); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .07); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .08); } catch (e) {} };
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
    // the bubble keeps one height on every page
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), cn = $('.cnt'), w = bub.clientWidth; if (!w || w === lockW) return; lockW = w;
      const keep = [tx.innerHTML, cn.innerHTML]; bub.style.minHeight = ''; let mx = 0;
      const meas = (t, c) => { tx.innerHTML = t; cn.innerHTML = c; mx = Math.max(mx, bub.offsetHeight); };
      meas(HELLO[ctx.lang] || HELLO.en, chips());
      PAGES.forEach(pg => { if (pg.id === 'intro') return; const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`; [task(`👆 ${T(pg.id + '.k')}`), task(`👆 ${T(pg.id + '.k2')}`), tag(`✓ ${T(pg.id + '.ok')}`)].forEach(c => meas(t, c)); });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; phase = ''; stage = 0; drag = null;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      st = stage0(pg); setBoard();
      if (!striker) striker = mk('s');
      sx = pg.sx != null ? pg.sx : 0; striker.visible = !!(pg.kind && pg.kind !== 'tap') || pg.open; put(striker, sx, BY);
      if (pg.id === 'intro') { say(HELLO[ctx.lang] || HELLO.en); cnt(chips()); guides(); buttons(); return; }
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      if (!pg.last) cnt(task(`👆 ${T(pg.id + '.k')}`));
      phase = pg.kind || '';
      guides(); buttons();
    }
    function ok(key) {
      played = true; busy = false; phase = 'done'; clearGuides(); cnt(tag(`✓ ${T(key)}`, '#e8f8ee', '#16784a')); SND.good(); buttons();
      if (!P().last) {   // solved: on to the next page once Otto's reaction has been read (common rule)
        const s0 = step, ms = 1600 + Math.min(3200, T(key).replace(/<[^>]+>/g, '').length * 45);
        if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), ms, () => step === s0);
        later(() => { if (step === s0 && played) go(step + 1); }, ms);
      }
    }
    async function shotDone(res) {
      if (!res || stopped) return;
      const pg = P(), { sim, r } = res;
      const inIds = sim.pocketed.map(e => st.pcs[e.id].c);
      if (pg.kind === 'shot') {
        if (!sim.strikerIn && inIds.includes(pg.need)) { st = r.s; ok(pg.id + '.ok'); return; }
        ng(pg.id + '.ng'); later(() => go(step), 1500); return;
      }
      if (pg.kind === 'queen') {
        if (stage === 0) {
          if (!sim.strikerIn && inIds.includes('q')) { st = r.s; stage = 1; sx = -2; put(striker, sx, BY); striker.visible = true; cnt(task(`👆 ${T('queen.k2')}`)); SND.good(); guides(); return; }
          ng('queen.ng'); later(() => go(step), 1500); return;
        }
        if (!sim.strikerIn && inIds.includes('w')) { st = r.s; ok('queen.ok'); return; }
        ng('queen.ng2'); later(() => go(step), 1700); return;
      }
    }
    async function demo() {
      if (busy || played) return;
      cnt('');
      // the striker straight into the far right pocket, nothing in its way: a foul, one white comes back to the middle
      const P2 = D.POCKETS[1], ang = Math.atan2(P2[1] - BY, P2[0] - sx);
      const res = await strike({ x: sx, ang, v: 330 }); if (!res || stopped) return;
      st = res.r.s;
      const back = st.pcs.map((m, i) => m.on && !meshOf(i) ? i : -1).filter(i => i >= 0);
      back.forEach(i => { const g = mk(st.pcs[i].c); meshes.push({ c: st.pcs[i].c, x: st.pcs[i].x, y: st.pcs[i].y, id: i, g }); put(g, st.pcs[i].x, st.pcs[i].y, 1.4); });
      if (back.length) await new Promise(rs => { const t0 = performance.now(); (function s(now) { if (stopped) return rs(); const k = Math.min(1, Math.max(0, now - t0) / 480), e = 1 - Math.pow(1 - k, 3); back.forEach(i => { const m = st.pcs[i]; put(meshOf(i), m.x, m.y, (1 - e) * 1.4); }); kick(120); if (k < 1) requestAnimationFrame(s); else { SND.place(); rs(); } })(t0); });
      ok('foul.ok');
    }

    /* ---------- the hand ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    function down(e) {
      if (stopped || busy || played || e.target.closest('.rgd')) return;
      const pg = P(); if (pg.id === 'intro' || pg.last) return;
      const q = toCm(e); if (!q) return;
      if (pg.kind === 'tap') { if (D.POCKETS.some(([x, y]) => Math.hypot(q.x - x, q.y - y) < 5.5)) ok('board.ok'); else ng('board.ng'); return; }
      if (pg.kind === 'demo') { demo(); return; }
      const dS = Math.hypot(q.x - sx, q.y - BY);
      if (pg.kind !== 'slide' && dS < D.RS + 2.6) drag = { kind: 'aim', id: e.pointerId };
      else if (Math.abs(q.y - BY) < 6) { drag = { kind: 'slide', id: e.pointerId }; slideTo(q.x); }
      else return;
      try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault(); guides();
    }
    function slideTo(x) {
      sx = E.nearestFree(st, 0, x); put(striker, sx, BY); kick(100);
      const pg = P();
      if (pg.kind === 'slide' && Math.abs(sx - pg.goal) < 1.3) { sx = pg.goal; put(striker, sx, BY); drag = null; ok('slide.ok'); }
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id || stopped) return;
      const q = toCm(e); if (!q) return;
      if (drag.kind === 'slide') { slideTo(q.x); if (drag) guides(); return; }
      const dx = sx - q.x, dy = BY - q.y, d = Math.hypot(dx, dy);
      if (d < 1.2) { aimPow = 0; guides(); return; }
      aimAng = Math.atan2(dy, dx); aimPow = Math.min(1, Math.max(0, (d - 1.2) / 22)); guides();
    }
    async function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const k = drag.kind; drag = null;
      try { ctx.el.releasePointerCapture(e.pointerId); } catch (er) {}
      if (k === 'aim' && aimPow >= .04 && !busy && !played) {
        const pg = P(), want = pg.kind === 'queen' ? (stage === 0 ? 'q' : 'w') : pg.need;
        const shot = assisted({ x: sx, ang: aimAng, v: 40 + aimPow * (E.VMAX - 40) }, want);
        shotDone(await strike(shot)); return;
      }
      guides();
    }
    ctx.el.addEventListener('pointerdown', down);
    ctx.el.addEventListener('pointermove', move);
    ctx.el.addEventListener('pointerup', up); ctx.el.addEventListener('pointercancel', up);
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
      stop() { stopped = true; clearInterval(typeT); clearInterval(pulseT); timers.forEach(clearTimeout); ctx.el.removeEventListener('pointerdown', down); ctx.el.removeEventListener('pointermove', move); ctx.el.removeEventListener('pointerup', up); ctx.el.removeEventListener('pointercancel', up); ctx.el.style.touchAction = prevTouch; removeEventListener('resize', lockH); removeEventListener('resize', onResizeF); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose()); },
      panel: el,
      _debug: { step: () => step, played: () => played, stage: () => stage, go, st: () => st, at: (x, y) => { const [a, b] = wx(x, y); return T3.project(a, b, Y); }, shoot: async (ang, pw) => { const pg = P(), want = pg.kind === 'queen' ? (stage === 0 ? 'q' : 'w') : pg.need; shotDone(await strike(assisted({ x: sx, ang, v: 40 + pw * (E.VMAX - 40) }, want))); }, sx: () => sx },
    };
    window.__rulesSess = sess;   // (tests)
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.carrom = { start };
})();
