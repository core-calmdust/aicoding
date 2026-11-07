/* =====================================================================
   Ludo — rules tour on the 3D table (atlas/models/ludo.js), told by the guide character Ludy (the yo-yo monkey).
   The same pages as the full game's tutorial (ludo/tour.js, the Ludo tour): the board and the start square, a 6 to come
   out, moving by the die, capturing, the safe squares, the home column and the exact throw, how to win. Every page after
   the first has a task on the 3D board: roll the die (it comes up as staged, so the task always works) and move a piece.
   The words are Ludy's own, in all 14 languages (the tour's calm wording is not reused — common rule 2026-11-07).
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Opening the tour sets aicoding-ludo-rules-seen (as the full game's rules do). You are always red (seat 0).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/monkey-1.webp';
  const UI = {
    ja: { name: 'ルディ', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', rollK: 'サイコロをタップして振ってね', tapIt: '光るところをタップ', wrong: 'ちがうよ〜。もういちど！', nope: 'その駒は今は動けないよ〜', first: 'まずはサイコロを振ってね！', origin: 'イギリス（インドのパチーシから）', players: '2〜4人', time: '約20〜40分' },
    en: { name: 'Ludy', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', rollK: 'Tap the die to roll', tapIt: 'Tap the glowing spot', wrong: 'Not quite — try again!', nope: 'That one can’t move right now!', first: 'Roll the die first!', origin: 'England (from India’s Pachisi)', players: '2–4 players', time: 'about 20–40 min' },
    zh: { name: '鲁迪', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', rollK: '点击骰子来掷', tapIt: '点击发光的位置', wrong: '不对哦，再试一次！', nope: '那枚棋子现在走不了哦～', first: '先掷骰子吧！', origin: '英国（源自印度帕奇西）', players: '2–4人', time: '约20–40分钟' },
    'zh-TW': { name: '魯迪', next: '下一步', back: '返回', start: '來對局吧', again: '再一次', rollK: '點擊骰子來擲', tapIt: '點擊發光的位置', wrong: '不對喔～再試一次！', nope: '那枚棋子現在走不了喔～', first: '先擲骰子吧！', origin: '英國（源自印度帕奇西）', players: '2–4人', time: '約20–40分鐘' },
    ko: { name: '루디', next: '다음', back: '이전', start: '대국하기', again: '다시', rollK: '주사위를 탭해서 굴려', tapIt: '빛나는 곳을 탭해', wrong: '아니야~ 다시 해 봐!', nope: '그 말은 지금 못 움직여~', first: '먼저 주사위를 굴려 줘!', origin: '영국 (인도의 파치시에서)', players: '2~4명', time: '약 20~40분' },
    es: { name: 'Ludy', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', rollK: 'Toca el dado para tirar', tapIt: 'Toca lo que brilla', wrong: '¡Casi! Prueba otra vez', nope: '¡Esa ficha no puede moverse ahora!', first: '¡Primero tira el dado!', origin: 'Inglaterra (del Pachisi indio)', players: '2–4 jugadores', time: 'unos 20–40 min' },
    fr: { name: 'Ludy', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', rollK: 'Touche le dé pour le lancer', tapIt: 'Touche ce qui brille', wrong: 'Presque ! Réessaie', nope: 'Ce pion ne peut pas bouger pour l’instant !', first: 'Lance d’abord le dé !', origin: 'Angleterre (d’après le Pachisi indien)', players: '2 à 4 joueurs', time: 'environ 20–40 min' },
    pt: { name: 'Ludy', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', rollK: 'Toque no dado para jogar', tapIt: 'Toque no que brilha', wrong: 'Quase! Tente de novo', nope: 'Essa peça não pode andar agora!', first: 'Jogue o dado primeiro!', origin: 'Inglaterra (do Pachisi indiano)', players: '2–4 jogadores', time: 'cerca de 20–40 min' },
    de: { name: 'Ludy', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', rollK: 'Tippe auf den Würfel', tapIt: 'Tippe auf das Leuchtende', wrong: 'Fast! Versuch es noch einmal', nope: 'Die Figur kann gerade nicht ziehen!', first: 'Erst würfeln!', origin: 'England (nach dem indischen Pachisi)', players: '2–4 Spieler', time: 'etwa 20–40 Min.' },
    ru: { name: 'Луди', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', rollK: 'Нажми на кубик, чтобы бросить', tapIt: 'Нажми на светящееся место', wrong: 'Почти! Попробуй ещё', nope: 'Эта фишка сейчас не может ходить!', first: 'Сначала брось кубик!', origin: 'Англия (из индийского пачиси)', players: '2–4 игрока', time: 'около 20–40 мин' },
    tr: { name: 'Ludy', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', rollK: 'Atmak için zara dokun', tapIt: 'Parlayan yere dokun', wrong: 'Tam değil — tekrar dene!', nope: 'O taş şu an oynayamaz!', first: 'Önce zarı at!', origin: 'İngiltere (Hindistan’ın Pachisi’sinden)', players: '2–4 oyuncu', time: 'yaklaşık 20–40 dk' },
    id: { name: 'Ludy', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', rollK: 'Ketuk dadu untuk melempar', tapIt: 'Ketuk yang menyala', wrong: 'Belum tepat — coba lagi!', nope: 'Bidak itu belum bisa jalan!', first: 'Lempar dadunya dulu!', origin: 'Inggris (dari Pachisi India)', players: '2–4 pemain', time: 'sekitar 20–40 menit' },
    hi: { name: 'लूडी', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', rollK: 'पासा छूकर फेंको', tapIt: 'चमकती जगह छुओ', wrong: 'अरे, फिर कोशिश करो!', nope: 'यह गोटी अभी नहीं चल सकती!', first: 'पहले पासा फेंको!', origin: 'इंग्लैंड (भारत के पचीसी से)', players: '2–4 खिलाड़ी', time: 'लगभग 20–40 मिनट' },
    ar: { name: 'لودي', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', rollK: 'المس النرد لترميه', tapIt: 'المس المكان المضيء', wrong: 'ليس تمامًا — جرّب مجددًا!', nope: 'هذه القطعة لا تستطيع التحرك الآن!', first: 'ارمِ النرد أولًا!', origin: 'إنجلترا (من لعبة باتشيسي الهندية)', players: '2–4 لاعبين', time: 'نحو 20–40 دقيقة' },
  };
  const HELLO = {
    ja: 'やあ！ ヨーヨー名人のおサル、<b>ルディ</b>だよ。<b>ルード</b>はインドのパチーシから生まれたすごろく。サイコロで盤を一周して、<b>4つの駒を先に全部ゴールさせたら勝ち</b>！',
    en: 'Hi! I’m <b>Ludy</b>, the yo-yo monkey. <b>Ludo</b> comes from India’s Pachisi: roll the die, race once round the board and <b>bring all four pieces home first</b>!',
    zh: '嗨！我是悠悠球高手猴子<b>鲁迪</b>。<b>鲁多</b>源自印度的帕奇西：掷骰子绕棋盘一圈，<b>先让4枚棋子全部到家就赢</b>！',
    'zh-TW': '嗨！我是溜溜球高手猴子<b>魯迪</b>。<b>魯多</b>源自印度的帕奇西：擲骰子繞棋盤一圈，<b>先讓4枚棋子全部到家就贏</b>！',
    ko: '안녕! 요요 달인 원숭이 <b>루디</b>야. <b>루도</b>는 인도의 파치시에서 나왔어. 주사위로 판을 한 바퀴 돌아 <b>말 4개를 먼저 모두 골인시키면 승리</b>!',
    es: '¡Hola! Soy <b>Ludy</b>, el mono del yoyó. El <b>Ludo</b> viene del Pachisi indio: tira el dado, da la vuelta al tablero y <b>lleva tus cuatro fichas a casa primero</b>.',
    fr: 'Salut ! Moi, c’est <b>Ludy</b>, le singe au yoyo. Le <b>Ludo</b> vient du Pachisi indien : lance le dé, fais le tour du plateau et <b>ramène tes quatre pions le premier</b> !',
    pt: 'Oi! Sou o <b>Ludy</b>, o macaco do ioiô. O <b>Ludo</b> vem do Pachisi indiano: jogue o dado, dê a volta no tabuleiro e <b>leve as quatro peças para casa primeiro</b>!',
    de: 'Hallo! Ich bin <b>Ludy</b>, der Jo-Jo-Affe. <b>Ludo</b> stammt vom indischen Pachisi: würfle, lauf einmal ums Brett und <b>bring als Erster alle vier Figuren heim</b>!',
    ru: 'Привет! Я <b>Луди</b>, обезьянка с йо-йо. <b>Лудо</b> выросло из индийского пачиси: бросай кубик, обойди доску и <b>первым приведи домой все четыре фишки</b>!',
    tr: 'Selam! Ben yo-yo’cu maymun <b>Ludy</b>. <b>Ludo</b>, Hindistan’ın Pachisi’sinden gelir: zarı at, tahtayı dolaş ve <b>dört taşını herkesten önce eve getir</b>!',
    id: 'Hai! Aku <b>Ludy</b>, monyet jago yoyo. <b>Ludo</b> berasal dari Pachisi India: lempar dadu, kelilingi papan, dan <b>bawa keempat bidakmu pulang lebih dulu</b>!',
    hi: 'नमस्ते! मैं यो-यो वाला बंदर <b>लूडी</b> हूँ। <b>लूडो</b> भारत के पचीसी से निकला है: पासा फेंको, बोर्ड का चक्कर लगाओ और <b>चारों गोटियाँ सबसे पहले घर पहुँचाओ</b>!',
    ar: 'مرحبًا! أنا <b>لودي</b>، قرد اليويو. جاءت <b>لودو</b> من باتشيسي الهندية: ارمِ النرد ودُر حول اللوحة و<b>أوصل قطعك الأربع إلى البيت أولًا</b>!',
  };
  // Ludy's words for every page (t title · b body · k task · ok right · ng wrong)
  const VOICE = {
    ja: {
      'board.t': '盤と道', 'board.b': '四すみの部屋が<b>陣地</b>。きみは<b>赤いポーン</b>だよ。矢印のマスから出て、盤をぐるっと一周、最後は赤い道を通って真ん中へ！ ぼくのしっぽより長い旅だね。', 'board.k': '赤い<b>出発マス</b>（矢印のマス）をタップしてみて！', 'board.ok': 'そこそこ！ 赤い駒はみんなここからスタートだよ', 'board.ng': 'おっと、そこじゃないよ。赤い矢印のマスをさがしてね',
      'six.t': '6で出発', 'six.b': '陣地の駒は<b>6が出たときだけ</b>出発マスへ出られるんだ。じーっと待つのも作戦のうち。ぼくもバナナを待つときだけはがまん強いよ。', 'six.k': 'サイコロを振って、赤いポーンを1つ外へ出そう！', 'six.ok': '出発〜！ しかも<b>6が出たらもう1回</b>振れるんだ。ラッキー！',
      'move.t': '目の数だけ進む', 'move.b': '出た目の数だけ、道の上の駒を<b>1つ</b>進めるよ。どれを動かすかはきみが決めていいんだ。', 'move.k': '振ってから、赤いポーンを1つ進めてね！', 'move.ok': 'いいね！ 動かせるのは1回に駒1つ。ぼくも手は2本あるのに、ヨーヨーは1個しか回せないんだ',
      'cap.t': '捕まえる', 'cap.b': '相手の駒に<b>ぴったり止まる</b>と、その駒は陣地へ逆戻り！ ぼくのヨーヨーみたいにビューンと帰っちゃう。捕まえたら<b>もう1回</b>振れるよ。', 'cap.k': '振ってから、緑のポーンにぴったり止まろう！', 'cap.ok': 'つかまえた！ 緑のポーンは陣地へビューン。ちょっとかわいそうだけど、これがルードさ', 'cap.ng': 'その駒じゃ緑に届かないよ。ちょうど止まれる駒はどれかな？',
      'safe.t': '安全なマス', 'safe.b': '<b>★のマス</b>と各色の<b>出発マス</b>は安全地帯。だれも捕まらないから、相手と同じマスに仲よく並べるんだ。', 'safe.k': '振ってから、光る★のマスに駒を止めよう！', 'safe.ok': 'セーフ！ 緑のとなりでも平気だよ。木の上のぼくくらい安全さ', 'safe.ng': 'それだと★に止まれないよ。★まで届く駒をえらんでね',
      'home.t': 'ゴール', 'home.b': '一周したら<b>赤い道</b>へ。ここはもう捕まらないよ。真ん中のゴールには<b>ちょうどの目</b>で入るんだ。', 'home.k': '振ってから、ちょうどゴールに入る駒を動かそう！', 'home.ok': 'ゴール〜！ ゴールしてもまた<b>もう1回</b>振れるよ', 'home.ng': 'その駒だとゴールにぴったり入らないよ。ちょうど届く駒はどれ？',
      'win.t': '勝ち', 'win.b': '<b>4つ全部ゴール</b>させたら勝ち！ 赤はあと1つ。ビシッと決めちゃおう！', 'win.k': '振ってから、最後の赤いポーンをゴールへ！', 'win.ok': 'やったー、全部ゴール！ きみの勝ち！ うれしくてヨーヨーが月まで飛んでいきそう',
    },
    en: {
      'board.t': 'The board', 'board.b': 'The four corner rooms are the <b>yards</b>. You’re the <b>red pawns</b>! Leave from the arrow square, go all the way round, then up the red lane to the middle. A longer trip than my tail!', 'board.k': 'Tap red’s <b>start square</b> — the one with the arrow!', 'board.ok': 'That’s it! Every red piece starts right here', 'board.ng': 'Oops, not that one. Look for the red arrow square',
      'six.t': 'A 6 to start', 'six.b': 'A piece in the yard comes out <b>only on a 6</b>. Waiting is part of the game — I’m only ever patient when I’m waiting for bananas.', 'six.k': 'Roll the die and bring a red pawn out!', 'six.ok': 'And they’re off! Plus a <b>6 gives another roll</b>. Lucky!',
      'move.t': 'Move by the die', 'move.b': 'Move <b>one</b> piece on the track by the number you rolled. Which one? You choose!', 'move.k': 'Roll, then move one red pawn!', 'move.ok': 'Nice! One piece per roll. I have two hands and still can only spin one yo-yo',
      'cap.t': 'Capture', 'cap.b': 'Land <b>exactly</b> on a rival and it goes back to its yard — zooming home like my yo-yo! A capture also gives you <b>another roll</b>.', 'cap.k': 'Roll, then land right on the green pawn!', 'cap.ok': 'Got it! The green pawn zooms home. A bit sad for it, but that’s Ludo', 'cap.ng': 'That one can’t reach green. Which piece lands right on it?',
      'safe.t': 'Safe squares', 'safe.b': 'The <b>stars</b> and every colour’s <b>start square</b> are safe. Nobody gets captured there, so rivals simply share the square.', 'safe.k': 'Roll, then stop a piece on the glowing star!', 'safe.ok': 'Safe! Right next to green and totally fine — as safe as me up a tree', 'safe.ng': 'That won’t stop on the star. Which piece reaches it?',
      'home.t': 'Home', 'home.b': 'After the lap, go up the <b>red lane</b> — no captures there. You get into the middle only with the <b>exact number</b>.', 'home.k': 'Roll, then move the piece that gets home exactly!', 'home.ok': 'Home! And getting home gives <b>another roll</b> too', 'home.ng': 'That one won’t land exactly home. Which piece fits?',
      'win.t': 'Winning', 'win.b': 'Get <b>all four home</b> and you win! Red needs just one more. Finish it in style!', 'win.k': 'Roll, then bring the last red pawn home!', 'win.ok': 'Yay, all home — you win! I’m so happy my yo-yo could fly to the moon',
    },
    zh: {
      'board.t': '棋盘与道路', 'board.b': '四个角的房间是<b>营地</b>。你是<b>红色棋子</b>！从箭头格出发，绕棋盘一整圈，最后走红色通道进中央。比我的尾巴还长的旅程！', 'board.k': '点一下红色的<b>出发格</b>（有箭头的那格）！', 'board.ok': '就是这里！红色棋子都从这儿出发', 'board.ng': '哎呀，不是那格。找找红色箭头格',
      'six.t': '掷6出发', 'six.b': '营地里的棋子<b>只有掷出6</b>才能出来。耐心等待也是战术——我只有等香蕉的时候最有耐心。', 'six.k': '掷骰子，让一枚红色棋子出营地！', 'six.ok': '出发啦！而且<b>掷出6还能再掷一次</b>，真幸运！',
      'move.t': '按点数前进', 'move.b': '按掷出的点数，让道路上的<b>一枚</b>棋子前进。走哪枚由你决定！', 'move.k': '掷骰后，走一枚红色棋子！', 'move.ok': '很好！每次只能走一枚。我明明有两只手，也只能转一个悠悠球',
      'cap.t': '吃子', 'cap.b': '<b>正好停在</b>对手棋子上，它就被送回营地——像我的悠悠球一样嗖地弹回去！吃子后还能<b>再掷一次</b>。', 'cap.k': '掷骰后，正好停在绿色棋子上！', 'cap.ok': '抓到了！绿色棋子嗖地回家了。有点可怜，但这就是鲁多', 'cap.ng': '那枚够不着绿子。哪枚能正好停上去？',
      'safe.t': '安全格', 'safe.b': '<b>★格</b>和各色的<b>出发格</b>是安全区。谁都不会被吃，对手也能和你挤在同一格。', 'safe.k': '掷骰后，让棋子停在发光的★格！', 'safe.ok': '安全！就在绿子旁边也没事，跟树上的我一样安全', 'safe.ng': '那样停不到★上。哪枚能走到★？',
      'home.t': '到家', 'home.b': '绕完一圈就进<b>红色通道</b>，这里不会被吃。进中央需要<b>正好的点数</b>。', 'home.k': '掷骰后，走正好能到家的棋子！', 'home.ok': '到家啦！到家后也能<b>再掷一次</b>', 'home.ng': '那枚不能正好到家。哪枚刚刚好？',
      'win.t': '获胜', 'win.b': '<b>4枚全部到家</b>就赢！红色只差最后一枚，漂亮地收尾吧！', 'win.k': '掷骰后，让最后一枚红色棋子到家！', 'win.ok': '耶，全部到家，你赢了！我开心得悠悠球都要飞上月亮啦',
    },
    'zh-TW': {
      'board.t': '棋盤與道路', 'board.b': '四個角的房間是<b>營地</b>。你是<b>紅色棋子</b>！從箭頭格出發，繞棋盤一整圈，最後走紅色通道進中央。比我的尾巴還長的旅程！', 'board.k': '點一下紅色的<b>出發格</b>（有箭頭的那格）！', 'board.ok': '就是這裡！紅色棋子都從這兒出發', 'board.ng': '哎呀，不是那格。找找紅色箭頭格',
      'six.t': '擲6出發', 'six.b': '營地裡的棋子<b>只有擲出6</b>才能出來。耐心等待也是戰術——我只有等香蕉的時候最有耐心。', 'six.k': '擲骰子，讓一枚紅色棋子出營地！', 'six.ok': '出發囉！而且<b>擲出6還能再擲一次</b>，真幸運！',
      'move.t': '按點數前進', 'move.b': '按擲出的點數，讓道路上的<b>一枚</b>棋子前進。走哪枚由你決定！', 'move.k': '擲骰後，走一枚紅色棋子！', 'move.ok': '很好！每次只能走一枚。我明明有兩隻手，也只能轉一個溜溜球',
      'cap.t': '吃子', 'cap.b': '<b>正好停在</b>對手棋子上，它就被送回營地——像我的溜溜球一樣咻地彈回去！吃子後還能<b>再擲一次</b>。', 'cap.k': '擲骰後，正好停在綠色棋子上！', 'cap.ok': '抓到了！綠色棋子咻地回家了。有點可憐，但這就是魯多', 'cap.ng': '那枚搆不到綠子。哪枚能正好停上去？',
      'safe.t': '安全格', 'safe.b': '<b>★格</b>和各色的<b>出發格</b>是安全區。誰都不會被吃，對手也能和你擠在同一格。', 'safe.k': '擲骰後，讓棋子停在發光的★格！', 'safe.ok': '安全！就在綠子旁邊也沒事，跟樹上的我一樣安全', 'safe.ng': '那樣停不到★上。哪枚能走到★？',
      'home.t': '到家', 'home.b': '繞完一圈就進<b>紅色通道</b>，這裡不會被吃。進中央需要<b>剛好的點數</b>。', 'home.k': '擲骰後，走剛好能到家的棋子！', 'home.ok': '到家囉！到家後也能<b>再擲一次</b>', 'home.ng': '那枚不能剛好到家。哪枚剛剛好？',
      'win.t': '獲勝', 'win.b': '<b>4枚全部到家</b>就贏！紅色只差最後一枚，漂亮地收尾吧！', 'win.k': '擲骰後，讓最後一枚紅色棋子到家！', 'win.ok': '耶，全部到家，你贏了！我開心得溜溜球都要飛上月亮啦',
    },
    ko: {
      'board.t': '판과 길', 'board.b': '네 귀퉁이 방이 <b>진영</b>이야. 너는 <b>빨간 말</b>! 화살표 칸에서 나와 판을 한 바퀴 돌고, 마지막엔 빨간 길로 한가운데까지. 내 꼬리보다 긴 여행이지!', 'board.k': '빨간 <b>출발 칸</b>(화살표 칸)을 탭해 봐!', 'board.ok': '거기야! 빨간 말은 모두 여기서 출발해', 'board.ng': '앗, 거기가 아니야. 빨간 화살표 칸을 찾아 봐',
      'six.t': '6이면 출발', 'six.b': '진영의 말은 <b>6이 나와야만</b> 출발 칸으로 나올 수 있어. 기다리는 것도 작전이야. 나도 바나나 기다릴 때만큼은 참을성이 대단하거든.', 'six.k': '주사위를 굴려서 빨간 말 하나를 꺼내자!', 'six.ok': '출발~! 게다가 <b>6이 나오면 한 번 더</b> 굴릴 수 있어. 럭키!',
      'move.t': '눈만큼 전진', 'move.b': '나온 눈만큼 길 위의 말 <b>하나</b>를 움직여. 어느 말을 움직일지는 네 마음이야!', 'move.k': '굴린 다음 빨간 말 하나를 움직여 줘!', 'move.ok': '좋아! 한 번에 말 하나만. 나도 손이 두 개인데 요요는 하나밖에 못 돌려',
      'cap.t': '잡기', 'cap.b': '상대 말에 <b>딱 멈추면</b> 그 말은 진영으로 되돌아가! 내 요요처럼 휘리릭 돌아가지. 잡으면 <b>한 번 더</b> 굴릴 수 있어.', 'cap.k': '굴린 다음 초록 말에 딱 멈추자!', 'cap.ok': '잡았다! 초록 말은 진영으로 휘리릭. 좀 불쌍하지만 이게 루도야', 'cap.ng': '그 말로는 초록에 못 닿아. 딱 멈출 수 있는 말은 어느 거?',
      'safe.t': '안전한 칸', 'safe.b': '<b>★ 칸</b>과 각 색의 <b>출발 칸</b>은 안전지대야. 아무도 잡히지 않으니까 상대랑 같은 칸에 사이좋게 설 수 있어.', 'safe.k': '굴린 다음 빛나는 ★ 칸에 말을 세우자!', 'safe.ok': '세이프! 초록 바로 옆인데도 괜찮아. 나무 위의 나만큼 안전해', 'safe.ng': '그러면 ★에 못 멈춰. ★까지 닿는 말을 골라 줘',
      'home.t': '골인', 'home.b': '한 바퀴 돌면 <b>빨간 길</b>로! 여기선 이제 안 잡혀. 한가운데 골에는 <b>딱 맞는 눈</b>으로만 들어가.', 'home.k': '굴린 다음 딱 맞게 골인하는 말을 움직이자!', 'home.ok': '골인~! 골인해도 <b>한 번 더</b> 굴릴 수 있어', 'home.ng': '그 말은 골에 딱 맞게 안 들어가. 딱 닿는 말은 어느 거?',
      'win.t': '승리', 'win.b': '<b>4개 모두 골인</b>하면 승리! 빨강은 이제 하나 남았어. 멋지게 끝내자!', 'win.k': '굴린 다음 마지막 빨간 말을 골인시키자!', 'win.ok': '야호, 모두 골인! 네가 이겼어! 너무 기뻐서 요요가 달까지 날아가겠어',
    },
    es: {
      'board.t': 'El tablero', 'board.b': 'Las cuatro esquinas son las <b>casas</b>. ¡Tú llevas los <b>peones rojos</b>! Salen de la casilla con flecha, dan la vuelta entera y suben por el pasillo rojo hasta el centro. ¡Un viaje más largo que mi cola!', 'board.k': '¡Toca la <b>salida</b> roja, la casilla con flecha!', 'board.ok': '¡Esa es! Todas las fichas rojas salen de aquí', 'board.ng': 'Uy, esa no. Busca la casilla de la flecha roja',
      'six.t': 'Un 6 para salir', 'six.b': 'Una ficha de casa sale <b>solo con un 6</b>. Esperar también es estrategia; yo solo soy paciente cuando espero plátanos.', 'six.k': '¡Tira el dado y saca un peón rojo!', 'six.ok': '¡En marcha! Y además <b>un 6 da otra tirada</b>. ¡Qué suerte!',
      'move.t': 'Avanza según el dado', 'move.b': 'Mueve <b>una</b> ficha del camino tantas casillas como marque el dado. ¿Cuál? ¡Tú eliges!', 'move.k': '¡Tira y mueve un peón rojo!', 'move.ok': '¡Bien! Una ficha por tirada. Yo tengo dos manos y aun así solo hago girar un yoyó',
      'cap.t': 'Capturar', 'cap.b': 'Cae <b>justo</b> sobre un rival y vuelve a su casa, ¡zas, como mi yoyó! Capturar también te da <b>otra tirada</b>.', 'cap.k': '¡Tira y cae justo sobre el peón verde!', 'cap.ok': '¡Atrapado! El peón verde vuelve a casa volando. Pobre, pero así es el Ludo', 'cap.ng': 'Esa no llega al verde. ¿Qué ficha cae justo encima?',
      'safe.t': 'Casillas seguras', 'safe.b': 'Las <b>estrellas</b> y la <b>salida</b> de cada color son seguras: nadie es capturado y los rivales comparten la casilla.', 'safe.k': '¡Tira y para una ficha en la estrella que brilla!', 'safe.ok': '¡A salvo! Justo al lado del verde y tan tranquilo, como yo en un árbol', 'safe.ng': 'Así no paras en la estrella. ¿Qué ficha llega?',
      'home.t': 'A casa', 'home.b': 'Tras la vuelta, sube por el <b>pasillo rojo</b>: ahí nadie te captura. Al centro se entra con el <b>número exacto</b>.', 'home.k': '¡Tira y mueve la ficha que llega justo a casa!', 'home.ok': '¡En casa! Llegar también da <b>otra tirada</b>', 'home.ng': 'Esa no llega justo. ¿Qué ficha encaja?',
      'win.t': 'Ganar', 'win.b': '¡Lleva <b>las cuatro a casa</b> y ganas! Al rojo le falta una. ¡Remátalo con estilo!', 'win.k': '¡Tira y lleva a casa el último peón rojo!', 'win.ok': '¡Bien, todas en casa, ganaste! Estoy tan feliz que mi yoyó podría llegar a la luna',
    },
    fr: {
      'board.t': 'Le plateau', 'board.b': 'Les quatre coins sont les <b>écuries</b>. Toi, tu as les <b>pions rouges</b> ! On part de la case à flèche, on fait tout le tour, puis on monte l’allée rouge jusqu’au centre. Un voyage plus long que ma queue !', 'board.k': 'Touche la <b>case de départ</b> rouge, celle avec la flèche !', 'board.ok': 'C’est ça ! Tous les pions rouges partent d’ici', 'board.ng': 'Oups, pas celle-là. Cherche la case à flèche rouge',
      'six.t': 'Un 6 pour sortir', 'six.b': 'Un pion de l’écurie ne sort <b>qu’avec un 6</b>. Attendre fait partie du jeu ; moi, je ne suis patient que pour les bananes.', 'six.k': 'Lance le dé et sors un pion rouge !', 'six.ok': 'C’est parti ! Et en plus, <b>un 6 fait rejouer</b>. Quelle chance !',
      'move.t': 'Avance selon le dé', 'move.b': 'Avance <b>un</b> pion du parcours du nombre obtenu. Lequel ? C’est toi qui choisis !', 'move.k': 'Lance, puis avance un pion rouge !', 'move.ok': 'Bien ! Un pion par lancer. J’ai deux mains et pourtant je ne fais tourner qu’un yoyo',
      'cap.t': 'Prendre', 'cap.b': 'Tombe <b>pile</b> sur un rival et il retourne dans son écurie — zou, comme mon yoyo ! Une prise te fait aussi <b>rejouer</b>.', 'cap.k': 'Lance, puis tombe pile sur le pion vert !', 'cap.ok': 'Attrapé ! Le pion vert file chez lui. Un peu triste pour lui, mais c’est le Ludo', 'cap.ng': 'Celui-là n’atteint pas le vert. Lequel tombe pile dessus ?',
      'safe.t': 'Cases sûres', 'safe.b': 'Les <b>étoiles</b> et la <b>case de départ</b> de chaque couleur sont sûres : personne n’y est pris, les rivaux partagent la case.', 'safe.k': 'Lance, puis arrête un pion sur l’étoile qui brille !', 'safe.ok': 'En sécurité ! Juste à côté du vert, tranquille, comme moi dans un arbre', 'safe.ng': 'Là, tu ne t’arrêtes pas sur l’étoile. Quel pion l’atteint ?',
      'home.t': 'L’arrivée', 'home.b': 'Après le tour, monte l’<b>allée rouge</b> : là, plus de prise. On entre au centre avec le <b>nombre exact</b>.', 'home.k': 'Lance, puis avance le pion qui arrive pile !', 'home.ok': 'Arrivé ! Et arriver fait aussi <b>rejouer</b>', 'home.ng': 'Celui-là n’arrive pas pile. Lequel tombe juste ?',
      'win.t': 'Gagner', 'win.b': 'Ramène <b>les quatre</b> et tu gagnes ! Il ne manque qu’un rouge. Finis en beauté !', 'win.k': 'Lance, puis ramène le dernier pion rouge !', 'win.ok': 'Youpi, tous arrivés, tu as gagné ! Je suis si content que mon yoyo pourrait monter jusqu’à la lune',
    },
    pt: {
      'board.t': 'O tabuleiro', 'board.b': 'Os quatro cantos são as <b>casas</b>. Você é os <b>peões vermelhos</b>! Saem da casa com seta, dão a volta inteira e sobem o corredor vermelho até o centro. Uma viagem maior que o meu rabo!', 'board.k': 'Toque na <b>saída</b> vermelha, a casa com a seta!', 'board.ok': 'Essa mesmo! Todas as peças vermelhas saem daqui', 'board.ng': 'Opa, essa não. Procure a casa da seta vermelha',
      'six.t': 'Um 6 para sair', 'six.b': 'Peça da casa só sai <b>com um 6</b>. Esperar faz parte do jogo; eu só tenho paciência quando espero bananas.', 'six.k': 'Jogue o dado e tire um peão vermelho!', 'six.ok': 'Partiu! E <b>o 6 ainda dá outra jogada</b>. Que sorte!',
      'move.t': 'Ande pelo dado', 'move.b': 'Ande com <b>uma</b> peça do caminho o número que saiu. Qual? Você escolhe!', 'move.k': 'Jogue e ande com um peão vermelho!', 'move.ok': 'Boa! Uma peça por jogada. Eu tenho duas mãos e mesmo assim só giro um ioiô',
      'cap.t': 'Capturar', 'cap.b': 'Pare <b>bem em cima</b> de um rival e ele volta para casa — zum, igual ao meu ioiô! Capturar também dá <b>outra jogada</b>.', 'cap.k': 'Jogue e pare bem em cima do peão verde!', 'cap.ok': 'Peguei! O peão verde volta voando. Coitado, mas é o Ludo', 'cap.ng': 'Essa não alcança o verde. Qual peça para em cima dele?',
      'safe.t': 'Casas seguras', 'safe.b': 'As <b>estrelas</b> e a <b>saída</b> de cada cor são seguras: ninguém é capturado e os rivais dividem a casa.', 'safe.k': 'Jogue e pare uma peça na estrela que brilha!', 'safe.ok': 'Salvo! Bem ao lado do verde e tranquilo, como eu numa árvore', 'safe.ng': 'Assim não para na estrela. Qual peça chega lá?',
      'home.t': 'Chegada', 'home.b': 'Depois da volta, suba o <b>corredor vermelho</b>: ali ninguém captura. No centro só se entra com o <b>número exato</b>.', 'home.k': 'Jogue e ande com a peça que chega exato!', 'home.ok': 'Chegou! Chegar também dá <b>outra jogada</b>', 'home.ng': 'Essa não chega exato. Qual cabe certinho?',
      'win.t': 'Vencer', 'win.b': 'Leve <b>as quatro para casa</b> e vença! Falta só um vermelho. Termine com estilo!', 'win.k': 'Jogue e leve o último peão vermelho para casa!', 'win.ok': 'Oba, todas em casa, você venceu! Estou tão feliz que meu ioiô podia ir até a lua',
    },
    de: {
      'board.t': 'Das Brett', 'board.b': 'Die vier Ecken sind die <b>Häuschen</b>. Du spielst die <b>roten Figuren</b>! Raus übers Pfeilfeld, einmal rundherum, dann die rote Gasse hoch in die Mitte. Eine längere Reise als mein Schwanz!', 'board.k': 'Tippe auf Rots <b>Startfeld</b> — das mit dem Pfeil!', 'board.ok': 'Genau! Jede rote Figur startet hier', 'board.ng': 'Hoppla, das nicht. Such das rote Pfeilfeld',
      'six.t': 'Mit 6 raus', 'six.b': 'Eine Figur im Häuschen kommt <b>nur mit einer 6</b> heraus. Warten gehört dazu — ich bin nur beim Warten auf Bananen geduldig.', 'six.k': 'Würfle und bring eine rote Figur heraus!', 'six.ok': 'Los geht’s! Und <b>eine 6 gibt noch einen Wurf</b>. Glück gehabt!',
      'move.t': 'Ziehen nach Würfel', 'move.b': 'Zieh <b>eine</b> Figur auf der Bahn um die gewürfelte Zahl. Welche? Du entscheidest!', 'move.k': 'Würfle und zieh eine rote Figur!', 'move.ok': 'Gut! Eine Figur pro Wurf. Ich habe zwei Hände und kann trotzdem nur ein Jo-Jo drehen',
      'cap.t': 'Schlagen', 'cap.b': 'Landest du <b>genau</b> auf einer fremden Figur, muss sie zurück ins Häuschen — zack, wie mein Jo-Jo! Schlagen gibt auch <b>noch einen Wurf</b>.', 'cap.k': 'Würfle und lande genau auf der grünen Figur!', 'cap.ok': 'Erwischt! Die grüne Figur saust heim. Schade für sie, aber so ist Ludo', 'cap.ng': 'Die kommt nicht bis Grün. Welche landet genau darauf?',
      'safe.t': 'Sichere Felder', 'safe.b': 'Die <b>Sterne</b> und das <b>Startfeld</b> jeder Farbe sind sicher: Dort wird niemand geschlagen, man teilt sich das Feld.', 'safe.k': 'Würfle und stell eine Figur auf den leuchtenden Stern!', 'safe.ok': 'Sicher! Direkt neben Grün und ganz entspannt — so sicher wie ich im Baum', 'safe.ng': 'So landest du nicht auf dem Stern. Welche Figur kommt hin?',
      'home.t': 'Ins Ziel', 'home.b': 'Nach der Runde geht’s die <b>rote Gasse</b> hoch — dort wird nicht geschlagen. Ins Ziel kommst du nur mit der <b>genauen Zahl</b>.', 'home.k': 'Würfle und zieh die Figur, die genau ins Ziel kommt!', 'home.ok': 'Im Ziel! Und das gibt auch <b>noch einen Wurf</b>', 'home.ng': 'Die kommt nicht genau ins Ziel. Welche passt?',
      'win.t': 'Gewinnen', 'win.b': 'Bring <b>alle vier ins Ziel</b> und du gewinnst! Rot fehlt nur noch eine. Mach’s schön!', 'win.k': 'Würfle und bring die letzte rote Figur ins Ziel!', 'win.ok': 'Juhu, alle im Ziel — du gewinnst! Ich freu mich so, mein Jo-Jo fliegt gleich bis zum Mond',
    },
    ru: {
      'board.t': 'Доска', 'board.b': 'Четыре угла — это <b>домики</b>. Ты играешь <b>красными фишками</b>! Выходишь с клетки со стрелкой, делаешь круг и по красной дорожке идёшь в центр. Путь длиннее моего хвоста!', 'board.k': 'Нажми на красную <b>стартовую клетку</b> — со стрелкой!', 'board.ok': 'Она самая! Все красные фишки стартуют отсюда', 'board.ng': 'Ой, не та. Найди клетку с красной стрелкой',
      'six.t': 'Шестёрка — на старт', 'six.b': 'Фишка из домика выходит <b>только на шестёрку</b>. Ждать — тоже тактика; я терпелив, только когда жду бананы.', 'six.k': 'Брось кубик и выведи красную фишку!', 'six.ok': 'Поехали! А ещё <b>шестёрка даёт ещё бросок</b>. Везёт!',
      'move.t': 'Ход по кубику', 'move.b': 'Передвинь <b>одну</b> фишку на столько клеток, сколько выпало. Какую — решай сам!', 'move.k': 'Брось и сходи красной фишкой!', 'move.ok': 'Отлично! Одна фишка за бросок. У меня две руки, а кручу всё равно одно йо-йо',
      'cap.t': 'Взятие', 'cap.b': 'Встань <b>ровно</b> на чужую фишку — и она летит в свой домик, вжух, как моё йо-йо! За взятие тоже <b>ещё бросок</b>.', 'cap.k': 'Брось и встань ровно на зелёную фишку!', 'cap.ok': 'Попалась! Зелёная фишка летит домой. Жалко её, но такое лудо', 'cap.ng': 'Эта не достанет до зелёной. Какая встанет ровно на неё?',
      'safe.t': 'Безопасные клетки', 'safe.b': '<b>Звёзды</b> и <b>стартовые клетки</b> всех цветов безопасны: там никого не бьют, соперники просто стоят вместе.', 'safe.k': 'Брось и поставь фишку на светящуюся звезду!', 'safe.ok': 'В безопасности! Рядом с зелёной — и ничего, как я на дереве', 'safe.ng': 'Так на звезду не попасть. Какая фишка дойдёт?',
      'home.t': 'Домой', 'home.b': 'После круга — вверх по <b>красной дорожке</b>, там не бьют. В центр входят только <b>точным броском</b>.', 'home.k': 'Брось и сходи фишкой, которая точно дойдёт до дома!', 'home.ok': 'Дома! И за это тоже <b>ещё бросок</b>', 'home.ng': 'Эта не дойдёт ровно. Какая подходит?',
      'win.t': 'Победа', 'win.b': 'Приведи <b>все четыре домой</b> — и ты победил! Красным осталась одна. Красиво закончи!', 'win.k': 'Брось и приведи домой последнюю красную фишку!', 'win.ok': 'Ура, все дома — ты победил! Я так рад, что моё йо-йо улетит до луны',
    },
    tr: {
      'board.t': 'Tahta', 'board.b': 'Dört köşe <b>ahırlar</b>. Sen <b>kırmızı piyonlarsın</b>! Oklu kareden çık, tahtanın etrafını dolaş, sonra kırmızı yoldan ortaya gir. Kuyruğumdan uzun bir yolculuk!', 'board.k': 'Kırmızının <b>başlangıç karesine</b> — oklu kareye — dokun!', 'board.ok': 'İşte orası! Bütün kırmızı taşlar buradan başlar', 'board.ng': 'Hop, orası değil. Kırmızı oklu kareyi bul',
      'six.t': '6 ile çık', 'six.b': 'Ahırdaki taş <b>sadece 6 gelince</b> çıkar. Beklemek de taktik; ben sadece muz beklerken sabırlıyım.', 'six.k': 'Zarı at ve bir kırmızı piyonu çıkar!', 'six.ok': 'Yola çıktık! Üstelik <b>6 bir atış daha</b> verir. Şanslısın!',
      'move.t': 'Zar kadar ilerle', 'move.b': 'Yoldaki <b>bir</b> taşı gelen sayı kadar ilerlet. Hangisi mi? Sen seç!', 'move.k': 'At, sonra bir kırmızı piyonu ilerlet!', 'move.ok': 'Güzel! Atış başına bir taş. İki elim var ama yine de tek yo-yo çevirebiliyorum',
      'cap.t': 'Yakalama', 'cap.b': 'Rakip taşın <b>tam üstüne</b> gelirsen o taş ahırına döner — vııınn, yo-yom gibi! Yakalamak da <b>bir atış daha</b> verir.', 'cap.k': 'At, sonra yeşil piyonun tam üstüne gel!', 'cap.ok': 'Yakaladın! Yeşil piyon eve uçtu. Biraz yazık ama Ludo böyle', 'cap.ng': 'O taş yeşile yetişmez. Hangisi tam üstüne gelir?',
      'safe.t': 'Güvenli kareler', 'safe.b': '<b>Yıldızlar</b> ve her rengin <b>başlangıç karesi</b> güvenli: Orada kimse yakalanmaz, rakipler kareyi paylaşır.', 'safe.k': 'At, sonra bir taşı parlayan yıldızda durdur!', 'safe.ok': 'Güvende! Yeşilin hemen yanında, gayet rahat — ağaçtaki ben kadar güvenli', 'safe.ng': 'Böyle yıldızda duramazsın. Hangi taş oraya varır?',
      'home.t': 'Eve', 'home.b': 'Turdan sonra <b>kırmızı yola</b> gir, orada yakalanma yok. Ortaya ancak <b>tam sayıyla</b> girilir.', 'home.k': 'At, sonra tam eve giren taşı oyna!', 'home.ok': 'Evde! Eve girmek de <b>bir atış daha</b> verir', 'home.ng': 'O taş tam eve girmez. Hangisi tam oturur?',
      'win.t': 'Kazanmak', 'win.b': '<b>Dördünü de eve</b> getir, kazan! Kırmızının bir taşı kaldı. Şık bir bitiriş yap!', 'win.k': 'At, sonra son kırmızı piyonu eve getir!', 'win.ok': 'Yaşasın, hepsi evde, kazandın! O kadar mutluyum ki yo-yom aya kadar uçabilir',
    },
    id: {
      'board.t': 'Papan', 'board.b': 'Empat pojok itu <b>kandang</b>. Kamu <b>bidak merah</b>! Keluar dari kotak panah, keliling papan satu putaran, lalu naik jalur merah ke tengah. Perjalanannya lebih panjang dari ekorku!', 'board.k': 'Ketuk <b>kotak start</b> merah — yang ada panahnya!', 'board.ok': 'Betul! Semua bidak merah mulai dari sini', 'board.ng': 'Ups, bukan itu. Cari kotak panah merah',
      'six.t': 'Angka 6 untuk keluar', 'six.b': 'Bidak di kandang hanya bisa keluar <b>kalau dapat 6</b>. Menunggu juga strategi; aku cuma sabar kalau menunggu pisang.', 'six.k': 'Lempar dadu dan keluarkan satu bidak merah!', 'six.ok': 'Berangkat! Apalagi <b>angka 6 dapat lemparan lagi</b>. Untung!',
      'move.t': 'Maju sesuai dadu', 'move.b': 'Majukan <b>satu</b> bidak di jalur sebanyak angka dadu. Yang mana? Kamu yang pilih!', 'move.k': 'Lempar, lalu majukan satu bidak merah!', 'move.ok': 'Bagus! Satu bidak per lemparan. Tanganku dua, tapi tetap cuma bisa memutar satu yoyo',
      'cap.t': 'Menangkap', 'cap.b': 'Berhenti <b>tepat</b> di bidak lawan dan ia pulang ke kandang — wuus, seperti yoyoku! Menangkap juga dapat <b>lemparan lagi</b>.', 'cap.k': 'Lempar, lalu berhenti tepat di bidak hijau!', 'cap.ok': 'Tertangkap! Bidak hijau melesat pulang. Kasihan, tapi begitulah Ludo', 'cap.ng': 'Itu tidak sampai ke hijau. Bidak mana yang mendarat tepat?',
      'safe.t': 'Kotak aman', 'safe.b': '<b>Bintang</b> dan <b>kotak start</b> tiap warna itu aman: tidak ada yang ditangkap, lawan cukup berbagi kotak.', 'safe.k': 'Lempar, lalu hentikan bidak di bintang yang menyala!', 'safe.ok': 'Aman! Tepat di samping hijau pun santai — seaman aku di atas pohon', 'safe.ng': 'Begitu tidak berhenti di bintang. Bidak mana yang sampai?',
      'home.t': 'Pulang', 'home.b': 'Setelah satu putaran, naik <b>jalur merah</b> — di sana tak bisa ditangkap. Masuk ke tengah harus dengan <b>angka pas</b>.', 'home.k': 'Lempar, lalu jalankan bidak yang pas sampai rumah!', 'home.ok': 'Sampai! Sampai rumah juga dapat <b>lemparan lagi</b>', 'home.ng': 'Itu tidak pas sampai. Yang mana yang pas?',
      'win.t': 'Menang', 'win.b': 'Bawa <b>keempatnya pulang</b> dan kamu menang! Merah tinggal satu. Tutup dengan gaya!', 'win.k': 'Lempar, lalu bawa bidak merah terakhir pulang!', 'win.ok': 'Hore, semua sampai, kamu menang! Aku senang sekali sampai yoyoku bisa terbang ke bulan',
    },
    hi: {
      'board.t': 'बोर्ड', 'board.b': 'चारों कोने <b>घर</b> हैं। तुम <b>लाल गोटियाँ</b> हो! तीर वाले खाने से निकलो, पूरा चक्कर लगाओ, फिर लाल रास्ते से बीच में पहुँचो। मेरी पूँछ से भी लंबा सफ़र!', 'board.k': 'लाल का <b>शुरुआती खाना</b> — तीर वाला — छुओ!', 'board.ok': 'बिल्कुल! हर लाल गोटी यहीं से चलती है', 'board.ng': 'ओह, वह नहीं। लाल तीर वाला खाना ढूँढो',
      'six.t': '6 पर निकलो', 'six.b': 'घर की गोटी <b>सिर्फ़ 6 आने पर</b> बाहर निकलती है। इंतज़ार भी चाल है; मैं तो बस केले के इंतज़ार में ही धीरज रखता हूँ।', 'six.k': 'पासा फेंको और एक लाल गोटी बाहर निकालो!', 'six.ok': 'चल पड़े! और <b>6 पर एक बार और</b> फेंकने को मिलता है। वाह!',
      'move.t': 'पासे जितना चलो', 'move.b': 'जितना आया, रास्ते की <b>एक</b> गोटी उतना चलाओ। कौन-सी? तुम चुनो!', 'move.k': 'फेंको, फिर एक लाल गोटी चलाओ!', 'move.ok': 'बढ़िया! एक बार में एक गोटी। मेरे दो हाथ हैं, फिर भी एक ही यो-यो घुमा पाता हूँ',
      'cap.t': 'काटना', 'cap.b': 'विरोधी की गोटी पर <b>ठीक</b> रुको तो वह अपने घर लौट जाती है — सर्र, मेरे यो-यो जैसी! काटने पर <b>एक बार और</b> फेंको।', 'cap.k': 'फेंको, फिर हरी गोटी पर ठीक रुको!', 'cap.ok': 'पकड़ लिया! हरी गोटी घर उड़ गई। थोड़ा बुरा लगता है, पर यही लूडो है', 'cap.ng': 'वह हरी तक नहीं पहुँचेगी। कौन-सी ठीक उस पर रुकेगी?',
      'safe.t': 'सुरक्षित खाने', 'safe.b': '<b>तारे</b> और हर रंग का <b>शुरुआती खाना</b> सुरक्षित हैं: वहाँ कोई नहीं कटता, विरोधी साथ खड़े रह सकते हैं।', 'safe.k': 'फेंको, फिर चमकते तारे पर गोटी रोको!', 'safe.ok': 'सुरक्षित! हरी के ठीक बगल में भी आराम से — पेड़ पर बैठे मेरे जितना सुरक्षित', 'safe.ng': 'ऐसे तारे पर नहीं रुकोगे। कौन-सी गोटी पहुँचेगी?',
      'home.t': 'घर पहुँचना', 'home.b': 'चक्कर के बाद <b>लाल रास्ते</b> पर चढ़ो — वहाँ कोई नहीं काटता। बीच में <b>ठीक अंक</b> से ही जाते हैं।', 'home.k': 'फेंको, फिर ठीक घर पहुँचने वाली गोटी चलाओ!', 'home.ok': 'घर पहुँच गए! घर पहुँचने पर भी <b>एक बार और</b>', 'home.ng': 'वह ठीक घर नहीं पहुँचेगी। कौन-सी सही बैठती है?',
      'win.t': 'जीत', 'win.b': '<b>चारों गोटियाँ घर</b> पहुँचाओ और जीतो! लाल की बस एक बाकी है। शान से ख़त्म करो!', 'win.k': 'फेंको, फिर आख़िरी लाल गोटी घर ले जाओ!', 'win.ok': 'वाह, सब घर पहुँचीं — तुम जीत गए! मैं इतना खुश हूँ कि मेरा यो-यो चाँद तक उड़ जाए',
    },
    ar: {
      'board.t': 'اللوحة', 'board.b': 'الزوايا الأربع هي <b>البيوت</b>. أنت <b>القطع الحمراء</b>! تخرج من خانة السهم، وتدور حول اللوحة كلها، ثم تصعد الممر الأحمر إلى الوسط. رحلة أطول من ذيلي!', 'board.k': 'المس <b>خانة البداية</b> الحمراء — خانة السهم!', 'board.ok': 'هي بالضبط! كل القطع الحمراء تبدأ من هنا', 'board.ng': 'أوه، ليست هذه. ابحث عن خانة السهم الأحمر',
      'six.t': 'الستة للخروج', 'six.b': 'قطعة البيت لا تخرج <b>إلا بستة</b>. الانتظار جزء من اللعبة؛ أنا صبور فقط حين أنتظر الموز.', 'six.k': 'ارمِ النرد وأخرج قطعة حمراء!', 'six.ok': 'انطلقنا! و<b>الستة تمنحك رمية أخرى</b> أيضًا. يا للحظ!',
      'move.t': 'تقدّم بعدد النرد', 'move.b': 'حرّك <b>قطعة واحدة</b> على الطريق بعدد ما رميت. أيّها؟ أنت تختار!', 'move.k': 'ارمِ ثم حرّك قطعة حمراء!', 'move.ok': 'رائع! قطعة واحدة لكل رمية. عندي يدان ومع ذلك لا أدير إلا يويو واحدًا',
      'cap.t': 'الأسر', 'cap.b': 'قف <b>تمامًا</b> على قطعة منافس فتعود إلى بيتها — فوووش، مثل اليويو خاصتي! والأسر يمنحك <b>رمية أخرى</b>.', 'cap.k': 'ارمِ ثم قف تمامًا على القطعة الخضراء!', 'cap.ok': 'أمسكتها! القطعة الخضراء طارت إلى بيتها. مسكينة، لكن هذه هي لودو', 'cap.ng': 'تلك لا تصل إلى الخضراء. أي قطعة تقف عليها تمامًا؟',
      'safe.t': 'الخانات الآمنة', 'safe.b': '<b>النجوم</b> و<b>خانة البداية</b> لكل لون آمنة: لا يُؤسر أحد هناك، والمنافسون يتشاركون الخانة.', 'safe.k': 'ارمِ ثم أوقف قطعة على النجمة المضيئة!', 'safe.ok': 'في أمان! بجانب الخضراء تمامًا ولا بأس — آمن مثلي فوق شجرة', 'safe.ng': 'هكذا لن تقف على النجمة. أي قطعة تصل إليها؟',
      'home.t': 'الوصول', 'home.b': 'بعد الدورة اصعد <b>الممر الأحمر</b> — لا أسر هناك. ولا تدخل الوسط إلا <b>بالعدد المضبوط</b>.', 'home.k': 'ارمِ ثم حرّك القطعة التي تصل تمامًا!', 'home.ok': 'وصلت! والوصول يمنحك <b>رمية أخرى</b> أيضًا', 'home.ng': 'تلك لا تصل تمامًا. أيّها تناسب؟',
      'win.t': 'الفوز', 'win.b': 'أوصل <b>الأربع كلها</b> وتفوز! بقيت للأحمر قطعة واحدة. أنهِها بأناقة!', 'win.k': 'ارمِ ثم أوصل آخر قطعة حمراء!', 'win.ok': 'رائع، وصلت كلها — لقد فزت! أنا سعيد لدرجة أن اليويو قد يطير إلى القمر',
    },
  };
  /* the pages (ludo/tour.js PAGES, the Ludo tour): pos = seat → path positions (missing → yard), roll = the die that
     comes up, check(m) → text key of a wrong choice, spot = a square to light up [seat, p], ok = the right-answer key */
  const PAGES = [
    { id: 'intro' },
    { id: 'board', pos: {}, kind: 'tap' },
    { id: 'six', pos: { 1: [20] }, roll: 6 },
    { id: 'move', pos: { 0: [3, 11], 1: [30] }, roll: 4 },
    { id: 'cap', pos: { 0: [10, 2], 1: [1] }, roll: 4, spot: [0, 14, 0xff6b5b], check: m => m.cap && m.cap.length ? null : 'cap.ng' },
    { id: 'safe', pos: { 0: [5, 17], 1: [47] }, roll: 3, spot: [0, 8, 0x5ec8ff], check: m => m.to === 8 ? null : 'safe.ng' },
    { id: 'home', pos: { 0: [53, 30, 56], 2: [12] }, roll: 3, spot: [0, 56, 0xffd65a], check: m => m.home ? null : 'home.ng' },
    { id: 'win', pos: { 0: [56, 56, 56, 52], 1: [40, 7], 2: [22] }, roll: 4, check: m => m.home ? null : 'home.ng', last: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.LudoEngine, B2 = window.LudoBoard2D, rule = 'ludo';
    const L = Object.assign({}, UI.en, UI[ctx.lang] || {}), VO = Object.assign({}, VOICE.en, VOICE[ctx.lang] || {});
    const T = k => VO[k] != null ? VO[k] : '';
    try { localStorage.setItem('aicoding-ludo-rules-seen', '1'); } catch (e) {}
    const SND = (window.Atlas3D && Atlas3D.ludo && Atlas3D.ludo.SND) || { put() {}, hop() {}, take() {}, roll() {}, again() {}, home() {} };
    const board = T3.MODELS.ludo(true, rule); T3.show('ludo', board); if (T3.play) T3.play(true);
    const U = board.userData, Y = U.top, u = U.u, n = U.n, geo = B2.geometry(rule), W = n * u;
    const baseFit = () => innerHeight > innerWidth * 1.15 ? { w: W + .4, d: W + .9, y: Y + .2, pitch: 1.05 } : { w: W + .3, d: W + .6, y: Y + .2, pitch: 1.0 };
    if (T3.fit) T3.fit(baseFit());
    // phones: the camera moves in on what the page is about (red's yard and die, its pieces, where they can go) and glides from
    // page to page — as the game does for the player to move (atlas/games/ludo.js applyFocus)
    let focusPts = null;
    function applyFocus() {
      if (!T3.fit) return;
      const small = innerWidth <= 700 || innerHeight > innerWidth * 1.15;
      if (!small || !focusPts) { T3.fit(Object.assign(baseFit(), { ease: true })); return; }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      focusPts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const sw = Math.max(9, x1 - x0 + 2.8), sd = Math.max(9, y1 - y0 + 2.8);
      if (Math.max(sw, sd) > n - 2) { T3.fit(Object.assign(baseFit(), { ease: true })); return; }
      const asp = (ctx.el.clientWidth || innerWidth) / (ctx.el.clientHeight || innerHeight), vw = Math.min(n, Math.max(sw, sd * asp)), vd = Math.min(n, Math.max(sd, sw / asp * .82));
      const cl = (c, h) => Math.max(h, Math.min(n - h, c)), B0 = baseFit();
      const [cx, cz] = wx(cl((x0 + x1) / 2, vw / 2 - .4), cl((y0 + y1) / 2, vd / 2 - .4));
      T3.fit({ w: sw * u, d: sd * u + (B0.d - W), y: Y + .2, pitch: B0.pitch, cx, cz, ease: true });
    }
    function focusPage(pg) {
      if (pg.id === 'intro') { focusPts = null; applyFocus(); return; }
      const pts = [[0, 9], [6, 15]], L0 = E.lastOf(st);
      st.pos[0].forEach(p => { if (p >= 0 && p < L0) pts.push(geo.cellXY(0, p)); });
      if (pg.id === 'board') pts.push(geo.cellXY(0, 0));
      if (pg.spot) { const [seat, p] = pg.spot; pts.push(p >= L0 ? geo.home(seat, 0) : geo.cellXY(seat, p)); }
      if (pg.roll) E.legalMoves(st, Object.assign({}, E.D6[pg.roll - 1])).forEach(m => { if (!m.pass) pts.push(m.to >= L0 ? geo.home(0, m.k) : geo.cellXY(0, m.to)); });
      focusPts = pts; applyFocus();
    }
    const onResizeF = () => applyFocus();
    addEventListener('resize', onResizeF);
    let st = null, step = 0, played = false, busy = false, stopped = false, phase = '', thr = null, moves = [], selK = -1, timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(nw) { if (stopped) return; const k = Math.min(1, Math.max(0, (nw - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const animP = (dur, f) => new Promise(r => anim(dur, f, r));
    const wx = (gx, gy) => U.xz(gx, gy);
    function ST(posBy) {
      const s = E.newGame({ rule, players: 4, first: 0 });
      for (const seat of s.seats) { const a = posBy[seat] || []; s.pos[seat] = [0, 1, 2, 3].map(i => a[i] !== undefined ? a[i] : -1); s.entered[seat] = s.pos[seat].filter(p => p >= 0).length; }
      s.turn = 0; return s;
    }

    /* ---------- pieces (as atlas/games/ludo.js) ---------- */
    const pcs = {};
    const LAST = () => E.lastOf(st);
    function homeXY(seat, k, p) { return p < 0 ? geo.yard(seat, k) : p >= LAST() ? geo.home(seat, k) : geo.cellXY(seat, p); }
    function layout() {
      const out = {}, groups = {}, L0 = LAST();
      for (const seat of st.seats) st.pos[seat].forEach((p, k) => { const key = p < 0 || p >= L0 ? 'y' + seat + k : String(E.cellOf(rule, seat, p)); (groups[key] = groups[key] || []).push([seat, k, p]); });
      for (const key in groups) {
        const G = groups[key], m = G.length;
        G.forEach(([seat, k, p], i) => {
          let [x, y] = homeXY(seat, k, p), z = 1;
          if (m > 1) { const a = i / m * Math.PI * 2 - Math.PI / 2; x += Math.cos(a) * .2; y += Math.sin(a) * .2; z = .8; }
          if (p >= L0) z = .55;
          out[seat + ',' + k] = { gx: x, gy: y, z };
        });
      }
      return out;
    }
    function mk(seat, k) { const g = U.piece(rule, seat), sh = T3.contact(g.userData.r * 1.1, .45); sh.position.y = .002; g.add(sh); g.userData.key = seat + ',' + k; board.add(g); return g; }
    function place(g, gx, gy, z, h) { const [x, zz] = wx(gx, gy); g.position.set(x, Y + (h || 0), zz); g.scale.set(z, z, z); g.userData.gx = gx; g.userData.gy = gy; g.userData.z = z; }
    // a new page: the pieces that stand where they stood stay still; only the ones that changed square drop in (common rule 2026-11-06)
    function setBoard() {
      const L0 = layout(); let i = 0;
      Object.values(pcs).forEach(g => { g.visible = true; });   // (a drop-in cut short by a quick page change: it stands where it was going)
      for (const key in L0) {
        const q = L0[key]; let g = pcs[key];
        if (!g) g = pcs[key] = mk(...key.split(',').map(Number));
        const same = g.userData.gx != null && Math.abs(g.userData.gx - q.gx) < 1e-3 && Math.abs(g.userData.gy - q.gy) < 1e-3 && g.userData.z === q.z;
        g.rotation.set(0, 0, 0);
        if (same) { place(g, q.gx, q.gy, q.z); continue; }
        place(g, q.gx, q.gy, q.z); g.visible = false; const d = 60 + (i++) * 40;
        later(() => { g.visible = true; anim(260, k => { g.position.y = Y + (1 - k) * (1 - k) * 1.2; }, () => SND.put()); }, d);
      }
      if (T3.kick) T3.kick(200);
    }
    function settle() { const L0 = layout(); for (const key in L0) { const q = L0[key]; place(pcs[key], q.gx, q.gy, q.z); } if (T3.kick) T3.kick(200); }
    async function walk(m) {
      const g = pcs['0,' + m.k], L0 = LAST(), pts = [[g.userData.gx, g.userData.gy]];
      if (m.enter) pts.push(geo.cellXY(0, 0));
      else for (let p = m.from + 1; p <= m.to; p++) pts.push(p >= L0 ? geo.home(0, m.k) : geo.cellXY(0, p));
      const steps = pts.length - 1, z0 = g.userData.z, z1 = m.to >= L0 ? .55 : 1;
      for (let i = 1; i <= steps; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        await animP(140, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, z = z0 + (z1 - z0) * (i - 1 + k) / steps; place(g, ax + (bx - ax) * e, ay + (by - ay) * e, z, Math.sin(k * Math.PI) * u * .45); });
        if (stopped) return; SND.hop();
      }
      SND.put();
    }
    function flyHome(caps) {
      return Promise.all((caps || []).map(c => { const g = pcs[c.seat + ',' + c.k], [x1, y1] = geo.yard(c.seat, c.k), x0 = g.userData.gx, y0 = g.userData.gy, z0 = g.userData.z;
        return animP(620, k => { place(g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (1 - z0) * k, Math.sin(k * Math.PI) * u * 2.4); g.rotation.z = Math.sin(k * Math.PI) * .6; }).then(() => { g.rotation.z = 0; }); }));
    }

    /* ---------- the die (rests in red's yard; tapping the board rolls it) ---------- */
    const thrown = new TH.Group(); board.add(thrown);
    const SPOT = [3, 12];   // the middle of red's yard (atlas/games/ludo.js throwSpot(0))
    const FACE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };
    let dieG = null;
    function restDie(v) {
      while (thrown.children.length) thrown.remove(thrown.children[0]);
      dieG = U.die(); const [x, z] = wx(...SPOT), h = dieG.userData.size / 2;
      dieG.children[0].rotation.set(...FACE[v || 1]); dieG.position.set(x, Y + h, z); dieG.rotation.y = .5;
      const sh = T3.contact(h * 1.5, .4); sh.position.set(x, Y + .002, z); thrown.add(sh, dieG);
      if (T3.kick) T3.kick(200);
    }
    async function throwAnim(v) {
      SND.roll();
      while (thrown.children.length) thrown.remove(thrown.children[0]);
      const [cx, cz] = wx(...SPOT);
      dieG = U.die(); const h = dieG.userData.size / 2, sh = T3.contact(h * 1.5, .4); sh.position.set(cx, Y + .002, cz); thrown.add(sh, dieG);
      dieG.children[0].rotation.set(...FACE[v]);
      const sx = (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2) * Math.PI, sy = (Math.random() - .5) * 4 * Math.PI, sz = (Math.random() < .5 ? -1 : 1) * 2 * Math.PI, yaw = Math.random() * 6.28;
      const fx = cx + (Math.random() - .5) * u * .8, fz = cz + (Math.random() - .5) * u * .8;
      await animP(720, k => { const r = Math.pow(1 - k, 2), b = Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 1.3; dieG.rotation.set(sx * r, yaw + sy * r, sz * r); dieG.position.set(fx + (cx - fx) * (1 - k) * .3, Y + h + b, fz); sh.position.set(dieG.position.x, Y + .002, fz); });
    }

    /* ---------- marks ---------- */
    const mk2 = new TH.Group(); board.add(mk2);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const GEO = { ring: new TH.TorusGeometry(u * .48, u * .075, 8, 40), disc: new TH.CircleGeometry(u * .42, 32) };
    GEO.ring.rotateX(Math.PI / 2); GEO.disc.rotateX(-Math.PI / 2);
    const MAT = { can: basic(0xffa000, 1), dest: basic(0x3df59a, .8), frame: basic(0xffa000, .9) };
    let pulseT = 0;
    function ring(gx, gy, mat, s) { const m = new TH.Mesh(GEO.ring, mat), [x, z] = wx(gx, gy); m.position.set(x, Y + .02, z); m.scale.setScalar(s || 1); m.userData.s0 = s || 1; m.userData.pulse = true; m.renderOrder = 3; mk2.add(m); return m; }
    function disc(gx, gy, col, op) { const m = new TH.Mesh(GEO.disc, basic(col, op || .5)), [x, z] = wx(gx, gy); m.position.set(x, Y + .006, z); m.renderOrder = 2; mk2.add(m); return m; }
    function clearMarks() { while (mk2.children.length) mk2.remove(mk2.children[0]); if (T3.kick) T3.kick(120); }
    function marks() {
      clearMarks();
      const pg = P(); if (!st || pg.id === 'intro') return;
      if (pg.id === 'board' && played) disc(...geo.cellXY(0, 0), 0x3df59a, .55);
      if (pg.spot && !played) { const [seat, p, col] = pg.spot; disc(...(p >= LAST() ? geo.home(seat, 0) : geo.cellXY(seat, p)), col, .5); }
      if (phase === 'roll' && !busy) ring(...SPOT, MAT.frame, 1.7);   // the die to tap: a breathing ring round it
      if (phase === 'move') {
        const real = moves.filter(m => !m.pass), ks = [...new Set(real.map(m => m.k))];
        ks.forEach(k => { const g = pcs['0,' + k]; ring(g.userData.gx, g.userData.gy, MAT.can, g.userData.z); });
        real.filter(m => m.k === selK).forEach(m => disc(...(m.to >= LAST() ? geo.home(0, m.k) : geo.cellXY(0, m.to)), 0x3df59a, .75));
      }
      if (!pulseT) { const t0 = performance.now(); pulseT = setInterval(() => { if (stopped || !mk2.children.length) return; const s = 1 + Math.sin((performance.now() - t0) / 220) * .08; mk2.children.forEach(m => { if (m.userData.pulse) m.scale.setScalar(s * m.userData.s0); }); if (T3.kick) T3.kick(80); }, 60); }
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
      + '.rgd .urn{font:900 20px var(--round,inherit);color:#c9a13d;margin-inline-start:4px}.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:700}'
      + '.rgd .urt{background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a;font-weight:900;box-shadow:0 3px 0 #e6b43a;animation:urtP 1.6s ease-in-out infinite}.rgd .urt .urn{color:#b5520d}@keyframes urtP{50%{box-shadow:0 3px 0 #e6b43a,0 0 0 5px rgba(240,194,74,.28)}}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}}';
    document.head.appendChild(css);
    // Ludy's voice: a soft blip as the words type out (every guided course has it — common rule)
    let AC = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; AC = AC || window.__atlasAC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); const f = 560 + Math.random() * 260, t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (Math.random() < .5 ? 1.25 : .82), t + .06); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .07); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + .08); } catch (e) {} };
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
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3200); }
    function ng(key, html) { msg(`<span>${html || (key ? T(key) : L.wrong)}</span>`); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    const P = () => PAGES[step];
    const waiting = () => P().id !== 'intro' && !played;
    function buttons() {
      const pg = P(), wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = pg.last && played ? L.start + ' ▶' : wait ? (phase === 'roll' ? L.rollK : L.tapIt) : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${PAGES.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (pg.last && played && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!(pg.last && played) && ag) ag.remove();
    }
    // the bubble keeps one height on every page (the camera frames the board above the panel)
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), cn = $('.cnt'), w = bub.clientWidth; if (!w || w === lockW) return; lockW = w;
      const keep = [tx.innerHTML, cn.innerHTML]; bub.style.minHeight = ''; let mx = 0;
      const meas = (t, c) => { tx.innerHTML = t; cn.innerHTML = c; mx = Math.max(mx, bub.offsetHeight); };
      meas(HELLO[ctx.lang] || HELLO.en, chips());
      PAGES.forEach(pg => {
        if (pg.id === 'intro') return;
        const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`;
        [task(`🎲 ${L.rollK}`), task(`👆 ${T(pg.id + '.k')}`), task(`🎲 <span class="urn">= 6</span>　👆 ${T(pg.id + '.k')}`), tag(`✓ ${T(pg.id + '.ok')}`)].forEach(c => meas(t, c));
      });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; phase = ''; thr = null; moves = []; selK = -1;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      st = ST(pg.pos || {}); setBoard(); restDie(pg.roll === 6 ? 1 : 6);
      focusPage(pg);
      if (pg.id === 'intro') { say(HELLO[ctx.lang] || HELLO.en); cnt(chips()); marks(); buttons(); return; }
      phase = pg.kind === 'tap' ? 'tap' : 'roll';
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      cnt(task(phase === 'roll' ? `🎲 ${L.rollK}` : `👆 ${T(pg.id + '.k')}`));
      marks(); buttons();
    }
    function ok(key) {
      played = true; busy = false; phase = 'done'; selK = -1; marks(); cnt(tag(`✓ ${T(key)}`, '#e8f8ee', '#16784a')); SND.home(); buttons();
      if (!P().last) {   // solved: on to the next page by itself once Ludy's reaction has been read (common rule)
        const s0 = step, ms = 1600 + Math.min(3200, T(key).replace(/<[^>]+>/g, '').length * 45);
        if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), ms, () => step === s0);
        later(() => { if (step === s0 && played) go(step + 1); }, ms);
      }
    }
    async function roll() {
      const pg = P(); if (phase !== 'roll' || busy) return;
      busy = true; marks();
      await throwAnim(pg.roll); if (stopped) return;
      thr = Object.assign({}, E.D6[pg.roll - 1]); moves = E.legalMoves(st, thr); busy = false; phase = 'move';
      cnt(task(`🎲 <span class="urn">= ${pg.roll}</span>　👆 ${T(pg.id + '.k')}`));
      marks(); buttons();
    }
    async function play(m) {
      const pg = P();
      if (pg.check) { const bad = pg.check(m); if (bad) { ng(bad); selK = -1; marks(); return; } }
      busy = true; phase = 'anim'; selK = -1; clearMarks();
      await walk(m); if (stopped) return;
      if (m.cap && m.cap.length) { SND.take(); await flyHome(m.cap); if (stopped) return; }
      const r = E.apply(st, m, thr); st = r.state; st.turn = 0; settle();
      if (m.home) SND.home(); else if (r.again) SND.again();
      ok(pg.id + '.ok');
    }
    function gridAt(e) { const p = T3.pick(e, Y); return p ? [p.x / u + n / 2, p.z / u + n / 2] : null; }
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    function onClick(e) {
      if (stopped || busy || T3.wasDrag() || e.target.closest('.rgd')) return;
      const pg = P(); if (pg.id === 'intro' || played) return;
      const q = gridAt(e);
      if (phase === 'tap') { if (q && dist(q, geo.cellXY(0, 0)) < .62) { ok('board.ok'); return; } ng('board.ng'); return; }
      if (phase === 'roll') { roll(); return; }
      if (phase !== 'move' || !q) return;
      const real = moves.filter(m => !m.pass), L0 = LAST();
      if (selK >= 0) {   // a destination of the chosen piece
        const c = real.filter(m => m.k === selK).map(m => ({ m, d: dist(q, m.to >= L0 ? geo.home(0, m.k) : geo.cellXY(0, m.to)) })).sort((a, b) => a.d - b.d)[0];
        if (c && c.d < .7) { play(c.m); return; }
      }
      // the nearest red piece: one that can move plays its move; one that can't says why
      let best = null;
      for (let k = 0; k < 4; k++) { const g = pcs['0,' + k], d = dist(q, [g.userData.gx, g.userData.gy]); if (!best || d < best.d) best = { k, d }; }
      if (!best || best.d > .75) { const any = real.find(m => dist(q, m.to >= L0 ? geo.home(0, m.k) : geo.cellXY(0, m.to)) < .6); if (any && real.filter(m => m.to === any.to).length === 1) play(any); return; }
      let ms = real.filter(m => m.k === best.k);
      if (!ms.length && st.pos[0][best.k] < 0) ms = real.filter(m => m.enter);   // any yard piece comes out with the enter move
      if (!ms.length) { ng(null, L.nope); return; }
      if (ms.length === 1) { play(ms[0]); return; }
      selK = best.k; marks();
    }
    $('[data-a=next]').onclick = () => { if (P().last && played) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === ' ' && phase === 'roll') { e.preventDefault(); e.stopPropagation(); roll(); return; }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    say('…'); buttons();
    later(() => go(0), 300);
    const proj = (gx, gy) => { const [x, z] = wx(gx, gy); return T3.project(x, z, Y); };
    const sess = {
      stop() { stopped = true; clearInterval(typeT); clearInterval(pulseT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); removeEventListener('resize', lockH); removeEventListener('resize', onResizeF); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); },
      panel: el,
      _debug: { mk2, marks: () => mk2.children.map(m => [m.geometry.type, +m.position.x.toFixed(2), +m.position.z.toFixed(2), m.visible, m.material.opacity]), step: () => step, phase: () => phase, played: () => played, moves: () => moves, go,
        cell: p => proj(...geo.cellXY(0, p)), piece: k => { const g = pcs['0,' + k]; return proj(g.userData.gx, g.userData.gy); }, die: () => proj(...SPOT), home: k => proj(...geo.home(0, k)) },
    };
    window.__rulesSess = sess;   // (tests)
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.ludo = { start };
})();
