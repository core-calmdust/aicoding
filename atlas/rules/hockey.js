/* =====================================================================
   Table hockey — rules tour on the 3D table (atlas/models/hockey.js), told by Pucky the seal (a seal on the ice, like the puck).
   Pages: moving your mallet (to a ring), shooting the puck into the far goal (live, with the game's own physics), the edge shot
   (watch), goals and the match, the special modes (watch a few seconds of chaos), how to win.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }   ctx = { el, Table3D, lang, panel, onStart(), onExit() }
   Opening the tour sets aicoding-hockey-rules-seen. You are red, at the near end (player 0).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/seal-1.webp';
  const UI = {
    ja: { name: 'ぷっく', next: 'つぎへ', back: 'もどる', start: '対戦してみる', again: 'もういちど', tapIt: '盤の上でやってみよう', watch: 'タップしてお手本', origin: 'カナダ・アメリカ', players: '2人', time: '1試合 約3〜6分' },
    en: { name: 'Pucky', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', tapIt: 'Try it on the table', watch: 'Tap to watch', origin: 'Canada · USA', players: '2 players', time: 'about 3–6 min a game' },
    zh: { name: '噗克', next: '下一步', back: '返回', start: '开始对战', again: '再来一次', tapIt: '在桌上试试', watch: '点击看示范', origin: '加拿大・美国', players: '2人', time: '每局约3–6分钟' },
    'zh-TW': { name: '噗克', next: '下一步', back: '返回', start: '來對戰吧', again: '再一次', tapIt: '在桌上試試', watch: '點一下看示範', origin: '加拿大・美國', players: '2人', time: '每局約3–6分鐘' },
    ko: { name: '퍽키', next: '다음', back: '이전', start: '대전하기', again: '다시', tapIt: '테이블에서 해 봐', watch: '탭해서 시범 보기', origin: '캐나다·미국', players: '2명', time: '한 게임 약 3~6분' },
    es: { name: 'Pucky', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', tapIt: 'Pruébalo en la mesa', watch: 'Toca para verlo', origin: 'Canadá · EE. UU.', players: '2 jugadores', time: 'unos 3–6 min por partida' },
    fr: { name: 'Pucky', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', tapIt: 'Essaie sur la table', watch: 'Touche pour voir', origin: 'Canada · États-Unis', players: '2 joueurs', time: 'environ 3–6 min par partie' },
    pt: { name: 'Pucky', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', tapIt: 'Tente na mesa', watch: 'Toque para ver', origin: 'Canadá · EUA', players: '2 jogadores', time: 'cerca de 3–6 min por partida' },
    de: { name: 'Pucky', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', tapIt: 'Probier es am Tisch', watch: 'Tippen zum Zuschauen', origin: 'Kanada · USA', players: '2 Spieler', time: 'etwa 3–6 Min. pro Spiel' },
    ru: { name: 'Паки', next: 'Далее', back: 'Назад', start: 'Сыграем', again: 'Ещё раз', tapIt: 'Попробуй на столе', watch: 'Нажми, чтобы посмотреть', origin: 'Канада · США', players: '2 игрока', time: 'около 3–6 мин на игру' },
    tr: { name: 'Pucky', next: 'İleri', back: 'Geri', start: 'Hadi oynayalım', again: 'Tekrar', tapIt: 'Masada dene', watch: 'İzlemek için dokun', origin: 'Kanada · ABD', players: '2 oyuncu', time: 'oyun başına 3–6 dk' },
    id: { name: 'Pucky', next: 'Berikutnya', back: 'Kembali', start: 'Ayo main', again: 'Lagi', tapIt: 'Coba di meja', watch: 'Ketuk untuk melihat', origin: 'Kanada · AS', players: '2 pemain', time: 'sekitar 3–6 menit per permainan' },
    hi: { name: 'पकी', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', tapIt: 'मेज़ पर करके देखो', watch: 'देखने के लिए छुओ', origin: 'कनाडा · अमेरिका', players: '2 खिलाड़ी', time: 'एक खेल लगभग 3–6 मिनट' },
    ar: { name: 'باكي', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', tapIt: 'جرّب على الطاولة', watch: 'المس لتشاهد', origin: 'كندا · الولايات المتحدة', players: 'لاعبان', time: 'نحو 3–6 دقائق للمباراة' },
  };
  const HELLO = {
    ja: 'こんにちは！ 氷の上が大好きなアザラシの<b>ぷっく</b>です。<b>テーブルホッケー</b>は、パッドでパックを打ち合って<b>相手のゴールに入れる</b>ゲーム。先に決めた点数を取った方の勝ち！ 速い球の打ち方も教えるね。',
    en: 'Hi! I’m <b>Pucky</b>, a seal who loves the ice. In <b>table hockey</b> you knock the puck back and forth with your mallet and try to <b>get it into the far goal</b>. First to the agreed score wins! I’ll show you how to hit fast ones too.',
    zh: '你好！我是最爱冰面的海豹<b>噗克</b>。<b>桌上冰球</b>就是用球拍来回击打冰球，<b>把它打进对方球门</b>的游戏。先拿到约定分数的人获胜！我也会教你怎么打出快球。',
    'zh-TW': '你好！我是最愛冰面的海豹<b>噗克</b>。<b>桌上冰球</b>就是用球拍來回擊打冰球，<b>把它打進對方球門</b>的遊戲。先拿到約定分數的人獲勝！我也會教你怎麼打出快球。',
    ko: '안녕! 얼음 위를 좋아하는 물범 <b>퍽키</b>야. <b>테이블 하키</b>는 패드로 퍽을 주고받으며 <b>상대 골에 넣는</b> 게임이야. 정한 점수를 먼저 따면 이겨! 빠른 공 치는 법도 알려 줄게.',
    es: '¡Hola! Soy <b>Pucky</b>, una foca a la que le encanta el hielo. En el <b>hockey de mesa</b> golpeas el disco con tu mazo y tratas de <b>meterlo en la portería rival</b>. ¡Gana quien llegue primero a la puntuación acordada! También te enseñaré tiros rápidos.',
    fr: 'Salut ! Je suis <b>Pucky</b>, un phoque qui adore la glace. Au <b>hockey de table</b>, tu frappes le palet avec ton maillet pour <b>l’envoyer dans le but adverse</b>. Le premier au score convenu gagne ! Je te montrerai aussi les tirs rapides.',
    pt: 'Oi! Sou a <b>Pucky</b>, uma foca que adora gelo. No <b>hóquei de mesa</b> você rebate o disco com o taco e tenta <b>colocá-lo no gol adversário</b>. Quem chegar primeiro ao placar combinado vence! Também vou mostrar tacadas rápidas.',
    de: 'Hallo! Ich bin <b>Pucky</b>, eine Robbe, die Eis liebt. Beim <b>Tischhockey</b> schlägst du den Puck mit deinem Schläger hin und her und versuchst, <b>ihn ins gegnerische Tor zu bringen</b>. Wer zuerst die Zielzahl erreicht, gewinnt! Schnelle Schüsse zeige ich dir auch.',
    ru: 'Привет! Я тюлень <b>Паки</b>, обожаю лёд. В <b>настольном хоккее</b> вы отбиваете шайбу битой и стараетесь <b>забить её в ворота соперника</b>. Кто первым наберёт условленный счёт — побеждает! Покажу и быстрые удары.',
    tr: 'Merhaba! Ben buzu çok seven fok <b>Pucky</b>. <b>Masa hokeyinde</b> pakı raketinle karşılıklı vurur ve <b>rakip kaleye sokmaya</b> çalışırsın. Belirlenen skora ilk ulaşan kazanır! Hızlı vuruşları da göstereceğim.',
    id: 'Halo! Aku <b>Pucky</b>, anjing laut yang suka es. Di <b>hoki meja</b> kamu memukul keping bolak-balik dengan pemukul dan berusaha <b>memasukkannya ke gawang lawan</b>. Yang lebih dulu mencapai skor yang disepakati menang! Aku juga akan tunjukkan pukulan cepat.',
    hi: 'नमस्ते! मैं <b>पकी</b>, बर्फ़ पसंद करने वाली सील। <b>टेबल हॉकी</b> में तुम मैलेट से पक को आगे-पीछे मारते हो और <b>उसे विरोधी के गोल में डालने</b> की कोशिश करते हो। तय स्कोर पहले पाने वाला जीतता है! तेज़ शॉट भी सिखाऊँगी।',
    ar: 'مرحبًا! أنا <b>باكي</b>، فقمة تحب الجليد. في <b>هوكي الطاولة</b> تضرب القرص بمضربك ذهابًا وإيابًا وتحاول <b>إدخاله في مرمى الخصم</b>. من يصل أولًا إلى النتيجة المتفق عليها يفوز! سأريك الضربات السريعة أيضًا.',
  };
  // page texts: t (title), b (body), k (task), ok (done), ng (try again)
  const V = {
    ja: { 'move.t': 'パッドを動かす', 'move.b': 'パッド（マレット）は<b>自分の側の半分</b>なら自由に動かせるよ。{move}', 'move.k': '光る輪までパッドを動かそう', 'move.ok': 'ばっちり！ 中央の線から向こうへは行けないよ。',
      'hit.t': 'ゴールを狙う', 'hit.b': 'パックに当てると、<b>パッドの勢いがそのまま</b>乗るよ。向こうの端の<b>すき間がゴール</b>。', 'hit.k': 'パックを打って向こうのゴールへ入れよう', 'hit.ok': 'ゴール！ 壁に当てて跳ね返らせるのも手だよ。', 'hit.ng': 'もう一度！',
      'edge.t': 'エッジショット', 'edge.b': '速く動かしたパッドの<b>端（ふち）でかすめるように</b>当てると、パックが<b>3割増しで飛ぶ「エッジショット」</b>になるよ。真正面より、横から払うイメージ！', 'edge.k': 'お手本を見てみよう', 'edge.ok': '端で払うと、こんなに速い！',
      'goal.t': 'ゴールと試合', 'goal.b': 'パックがゴールに落ちたら1点。<b>決められた側からパックを置き直して</b>再開するよ。5・7・10点先取から長さを選べるよ。', 'goal.k': 'お手本を見てみよう', 'goal.ok': '入れられたら、次は自分からスタート！',
      'modes.t': '盤でゲームが変わる', 'modes.b': '<b>盤を選ぶと遊び方が変わる</b>よ。すべる<b>エアホッケー</b>、モンスターとアイテムの<b>ネオン</b>、バンパーの<b>ピンボール</b>、動くからくりバーの<b>からくり工房</b>、無重力とワームホールの<b>スペース</b>。ルールなしの<b>クラシック</b>もあるよ！', 'modes.k': 'にぎやかな盤をちょっと見てみよう', 'modes.ok': 'にぎやか！ 好きな盤で遊んでね。',
      'win.t': '勝ち方', 'win.b': '先に決めた点数を取った方の勝ち！ <b>守りは自分のゴールの前</b>、チャンスは<b>壁を使った斜めの一打</b>。AIは20段階、2人なら同じ画面で対戦できるよ。' },
    en: { 'move.t': 'Moving your mallet', 'move.b': 'Your mallet goes anywhere <b>in your own half</b>. {move}', 'move.k': 'Move the mallet onto the glowing ring', 'move.ok': 'Spot on! It can’t cross the middle line.',
      'hit.t': 'Aim for the goal', 'hit.b': 'When you hit the puck, <b>your mallet’s speed goes into it</b>. The <b>slot in the far end is the goal</b>.', 'hit.k': 'Hit the puck into the far goal', 'hit.ok': 'Goal! Bouncing it off a wall works too.', 'hit.ng': 'Try again!',
      'edge.t': 'The edge shot', 'edge.b': 'Catch the puck with <b>the rim of a fast-moving mallet</b>, a glancing blow, and it flies <b>30 % faster: an “edge shot”</b>. Think sweep from the side, not straight on!', 'edge.k': 'Watch how it’s done', 'edge.ok': 'Swept with the rim — that fast!',
      'goal.t': 'Goals and the match', 'goal.b': 'A puck that drops into a goal is one point. <b>The player who conceded puts the puck down again</b>. Choose a length: first to 5, 7 or 10.', 'goal.k': 'Watch a goal', 'goal.ok': 'Let one in, and you start the next rally!',
      'modes.t': 'Each board, its own game', 'modes.b': '<b>The board you pick changes the game</b>: a gliding <b>Air hockey</b>, <b>Neon</b> with monsters and items, <b>Pinball</b> with bumpers, a turning bar in <b>Clockwork</b>, zero-gravity wormholes in <b>Space</b> — or plain <b>Classic</b>!', 'modes.k': 'Take a peek at a busy board', 'modes.ok': 'Busy! Play on whichever board you like.',
      'win.t': 'How to win', 'win.b': 'First to the chosen score wins! <b>Defend in front of your goal</b>, and look for <b>an angled shot off a wall</b>. The AI has 20 levels, and two players can share one screen.' },
    zh: { 'move.t': '移动球拍', 'move.b': '球拍可以在<b>自己这一半</b>里自由移动。{move}', 'move.k': '把球拍移到发光的圈上', 'move.ok': '正好！过不了中线哦。',
      'hit.t': '瞄准球门', 'hit.b': '打到冰球时，<b>球拍的速度会传给冰球</b>。对面一端的<b>缝就是球门</b>。', 'hit.k': '把冰球打进对面的球门', 'hit.ok': '进球！借边墙反弹也可以。', 'hit.ng': '再来一次！',
      'edge.t': '边缘击球', 'edge.b': '用<b>快速移动的球拍边缘擦着</b>打，冰球会<b>快三成，这就是“边缘击球”</b>。想象从侧面扫过去，而不是正面撞！', 'edge.k': '看看示范', 'edge.ok': '用边缘一扫，就这么快！',
      'goal.t': '进球与比赛', 'goal.b': '冰球掉进球门得1分。<b>由失分的一方重新放球</b>开始。长度可选先得5、7或10分。', 'goal.k': '看一次进球', 'goal.ok': '被进球后，下一回合由你开始！',
      'modes.t': '台面决定玩法', 'modes.b': '<b>选不同的台面，玩法也不同</b>：滑行的<b>气垫球</b>、有怪物和道具的<b>霓虹</b>、有弹簧柱的<b>弹珠台</b>、旋转横杆的<b>机关工坊</b>、有虫洞的<b>太空</b>，还有没有特殊规则的<b>经典</b>！', 'modes.k': '看看热闹的台面', 'modes.ok': '好热闹！选你喜欢的台面玩吧。',
      'win.t': '怎样获胜', 'win.b': '先拿到设定分数的人获胜！<b>防守在自己球门前</b>，机会在<b>借边墙的斜线球</b>。AI有20级，两人也能在同一画面对战。' },
    'zh-TW': { 'move.t': '移動球拍', 'move.b': '球拍可以在<b>自己這一半</b>裡自由移動。{move}', 'move.k': '把球拍移到發光的圈上', 'move.ok': '正好！過不了中線喔。',
      'hit.t': '瞄準球門', 'hit.b': '打到冰球時，<b>球拍的速度會傳給冰球</b>。對面一端的<b>縫就是球門</b>。', 'hit.k': '把冰球打進對面的球門', 'hit.ok': '進球！借邊牆反彈也可以。', 'hit.ng': '再來一次！',
      'edge.t': '邊緣擊球', 'edge.b': '用<b>快速移動的球拍邊緣擦著</b>打，冰球會<b>快三成，這就是「邊緣擊球」</b>。想像從側面掃過去，而不是正面撞！', 'edge.k': '看看示範', 'edge.ok': '用邊緣一掃，就這麼快！',
      'goal.t': '進球與比賽', 'goal.b': '冰球掉進球門得1分。<b>由失分的一方重新放球</b>開始。長度可選先得5、7或10分。', 'goal.k': '看一次進球', 'goal.ok': '被進球後，下一回合由你開始！',
      'modes.t': '台面決定玩法', 'modes.b': '<b>選不同的台面，玩法也不同</b>：滑行的<b>氣墊球</b>、有怪物和道具的<b>霓虹</b>、有彈簧柱的<b>彈珠台</b>、旋轉橫桿的<b>機關工坊</b>、有蟲洞的<b>太空</b>，還有沒有特殊規則的<b>經典</b>！', 'modes.k': '看看熱鬧的台面', 'modes.ok': '好熱鬧！選你喜歡的台面玩吧。',
      'win.t': '怎樣獲勝', 'win.b': '先拿到設定分數的人獲勝！<b>防守在自己球門前</b>，機會在<b>借邊牆的斜線球</b>。AI有20級，兩人也能在同一畫面對戰。' },
    ko: { 'move.t': '패드 움직이기', 'move.b': '패드는 <b>내 쪽 절반</b> 안이라면 자유롭게 움직여. {move}', 'move.k': '빛나는 링까지 패드를 옮겨 봐', 'move.ok': '딱 맞아! 가운데 선 너머로는 못 가.',
      'hit.t': '골을 노려라', 'hit.b': '퍽을 치면 <b>패드의 속도가 그대로</b> 실려. 맞은편 끝의 <b>틈이 골</b>이야.', 'hit.k': '퍽을 쳐서 맞은편 골에 넣어 봐', 'hit.ok': '골! 벽에 튕기는 것도 방법이야.', 'hit.ng': '다시 한 번!',
      'edge.t': '엣지 샷', 'edge.b': '빠르게 움직인 패드의 <b>가장자리로 스치듯</b> 치면 퍽이 <b>30% 더 빨라지는 「엣지 샷」</b>! 정면보다 옆에서 쓸어 치는 느낌으로!', 'edge.k': '시범을 보자', 'edge.ok': '가장자리로 쓸면 이렇게 빨라!',
      'goal.t': '골과 경기', 'goal.b': '퍽이 골에 떨어지면 1점. <b>골을 먹은 쪽이 퍽을 다시 놓고</b> 시작해. 5·7·10점 선취 중에서 길이를 골라.', 'goal.k': '골 시범 보기', 'goal.ok': '골을 먹으면 다음은 내가 먼저!',
      'modes.t': '보드마다 다른 게임', 'modes.b': '<b>고른 보드에 따라 놀이가 달라져</b>. 미끄러지는 <b>에어하키</b>, 몬스터와 아이템의 <b>네온</b>, 범퍼의 <b>핀볼</b>, 도는 막대의 <b>태엽 공방</b>, 워프의 <b>스페이스</b>, 규칙 없는 <b>클래식</b>도 있어!', 'modes.k': '정신없는 보드를 잠깐 보자', 'modes.ok': '정신없지! 좋아하는 보드로 놀아.',
      'win.t': '이기는 법', 'win.b': '정한 점수를 먼저 따면 승리! <b>수비는 내 골 앞</b>, 기회는 <b>벽을 쓴 대각선 샷</b>. AI는 20단계, 둘이면 한 화면에서 대전할 수 있어.' },
    es: { 'move.t': 'Mover el mazo', 'move.b': 'Tu mazo va donde quieras <b>dentro de tu mitad</b>. {move}', 'move.k': 'Lleva el mazo al anillo brillante', 'move.ok': '¡Justo! No puede pasar la línea central.',
      'hit.t': 'Apunta a la portería', 'hit.b': 'Al golpear el disco, <b>la velocidad del mazo pasa al disco</b>. La <b>ranura del fondo es la portería</b>.', 'hit.k': 'Mete el disco en la portería del fondo', 'hit.ok': '¡Gol! Rebotar en la banda también vale.', 'hit.ng': '¡Otra vez!',
      'edge.t': 'El golpe de canto', 'edge.b': 'Roza el disco con <b>el borde de un mazo rápido</b> y sale <b>un 30 % más rápido: un «golpe de canto»</b>. ¡Barre de lado, no de frente!', 'edge.k': 'Mira cómo se hace', 'edge.ok': '¡Barrido con el borde, así de rápido!',
      'goal.t': 'Goles y partido', 'goal.b': 'Un disco que cae en la portería es un punto. <b>Quien recibe el gol vuelve a poner el disco</b>. Elige la duración: a 5, 7 o 10.', 'goal.k': 'Mira un gol', 'goal.ok': '¡Si te marcan, empiezas tú!',
      'modes.t': 'Cada tablero, su juego', 'modes.b': '<b>El tablero que elijas cambia el juego</b>: el deslizante <b>Air hockey</b>, <b>Neón</b> con monstruos y objetos, <b>Pinball</b> con rebotadores, una barra giratoria en <b>Engranajes</b>, agujeros de warp en <b>Espacio</b> o el sencillo <b>Clásico</b>.', 'modes.k': 'Echa un vistazo a un tablero animado', 'modes.ok': '¡Qué jaleo! Juega en el tablero que más te guste.',
      'win.t': 'Cómo ganar', 'win.b': '¡Gana quien llegue primero a la puntuación! <b>Defiende delante de tu portería</b> y busca <b>un tiro en ángulo contra la banda</b>. La IA tiene 20 niveles y dos personas pueden compartir pantalla.' },
    fr: { 'move.t': 'Bouger le maillet', 'move.b': 'Ton maillet va partout <b>dans ta moitié</b>. {move}', 'move.k': 'Amène le maillet sur l’anneau lumineux', 'move.ok': 'Pile ! Il ne peut pas passer la ligne du milieu.',
      'hit.t': 'Vise le but', 'hit.b': 'Quand tu frappes le palet, <b>la vitesse du maillet passe au palet</b>. La <b>fente au fond est le but</b>.', 'hit.k': 'Envoie le palet dans le but du fond', 'hit.ok': 'But ! Rebondir sur la bande marche aussi.', 'hit.ng': 'Encore une fois !',
      'edge.t': 'Le coup de tranche', 'edge.b': 'Effleure le palet avec <b>le bord d’un maillet rapide</b> : il part <b>30 % plus vite, c’est le « coup de tranche »</b>. Balaye de côté, pas de face !', 'edge.k': 'Regarde comment faire', 'edge.ok': 'Balayé avec le bord : si rapide !',
      'goal.t': 'Buts et match', 'goal.b': 'Un palet qui tombe dans le but vaut un point. <b>Celui qui a encaissé remet le palet en jeu</b>. Choisis la durée : en 5, 7 ou 10.', 'goal.k': 'Regarde un but', 'goal.ok': 'Tu encaisses ? Tu repars en premier !',
      'modes.t': 'À chaque plateau son jeu', 'modes.b': '<b>Le plateau choisi change le jeu</b> : l’<b>Air-hockey</b> qui glisse, le <b>Néon</b> avec monstres et objets, le <b>Flipper</b> avec ses bumpers, une barre tournante dans <b>Engrenages</b>, des trous de distorsion dans <b>Espace</b>, ou le simple <b>Classique</b> !', 'modes.k': 'Jette un œil à un plateau animé', 'modes.ok': 'Quelle animation ! Joue sur le plateau que tu préfères.',
      'win.t': 'Comment gagner', 'win.b': 'Le premier au score choisi gagne ! <b>Défends devant ton but</b> et cherche <b>un tir en angle contre la bande</b>. L’IA a 20 niveaux, et deux joueurs peuvent partager l’écran.' },
    pt: { 'move.t': 'Mover o taco', 'move.b': 'Seu taco vai a qualquer lugar <b>na sua metade</b>. {move}', 'move.k': 'Leve o taco até o anel brilhante', 'move.ok': 'Na mosca! Ele não passa da linha do meio.',
      'hit.t': 'Mire o gol', 'hit.b': 'Ao acertar o disco, <b>a velocidade do taco passa para ele</b>. A <b>fenda no fundo é o gol</b>.', 'hit.k': 'Acerte o disco no gol do fundo', 'hit.ok': 'Gol! Tabelar na lateral também vale.', 'hit.ng': 'De novo!',
      'edge.t': 'A tacada de quina', 'edge.b': 'Pegue o disco de raspão com <b>a borda de um taco rápido</b> e ele sai <b>30 % mais rápido: a “tacada de quina”</b>. Varra de lado, não de frente!', 'edge.k': 'Veja como se faz', 'edge.ok': 'Varrido com a borda: rapidíssimo!',
      'goal.t': 'Gols e partida', 'goal.b': 'Disco que cai no gol vale um ponto. <b>Quem sofreu o gol repõe o disco</b>. Escolha a duração: até 5, 7 ou 10.', 'goal.k': 'Veja um gol', 'goal.ok': 'Sofreu? Você recomeça!',
      'modes.t': 'Cada tabuleiro, um jogo', 'modes.b': '<b>O tabuleiro escolhido muda o jogo</b>: o deslizante <b>Air hockey</b>, <b>Neon</b> com monstros e itens, <b>Pinball</b> com bumpers, uma barra giratória em <b>Engrenagens</b>, buracos de dobra no <b>Espaço</b> ou o simples <b>Clássico</b>!', 'modes.k': 'Dê uma olhada num tabuleiro agitado', 'modes.ok': 'Que agito! Jogue no tabuleiro que preferir.',
      'win.t': 'Como vencer', 'win.b': 'Quem chegar primeiro ao placar vence! <b>Defenda na frente do seu gol</b> e procure <b>uma tacada em ângulo na lateral</b>. A IA tem 20 níveis, e duas pessoas podem dividir a tela.' },
    de: { 'move.t': 'Den Schläger bewegen', 'move.b': 'Dein Schläger kann überall <b>in deiner Hälfte</b> hin. {move}', 'move.k': 'Bring den Schläger auf den leuchtenden Ring', 'move.ok': 'Genau! Über die Mittellinie kommt er nicht.',
      'hit.t': 'Aufs Tor zielen', 'hit.b': 'Triffst du den Puck, <b>geht das Tempo des Schlägers auf ihn über</b>. Der <b>Schlitz am anderen Ende ist das Tor</b>.', 'hit.k': 'Schieß den Puck ins Tor am anderen Ende', 'hit.ok': 'Tor! Über die Bande geht es auch.', 'hit.ng': 'Nochmal!',
      'edge.t': 'Der Kantenschuss', 'edge.b': 'Streif den Puck mit <b>dem Rand eines schnellen Schlägers</b>, und er fliegt <b>30 % schneller: ein „Kantenschuss“</b>. Wisch von der Seite, nicht frontal!', 'edge.k': 'Schau zu, wie es geht', 'edge.ok': 'Mit dem Rand gewischt – so schnell!',
      'goal.t': 'Tore und Spiel', 'goal.b': 'Ein Puck im Tor ist ein Punkt. <b>Wer das Tor kassiert hat, legt den Puck neu auf</b>. Wähle die Länge: bis 5, 7 oder 10.', 'goal.k': 'Schau dir ein Tor an', 'goal.ok': 'Tor kassiert? Dann startest du!',
      'modes.t': 'Jedes Brett, sein Spiel', 'modes.b': '<b>Das gewählte Brett ändert das Spiel</b>: gleitendes <b>Airhockey</b>, <b>Neon</b> mit Monstern und Items, <b>Flipper</b> mit Bumpern, ein drehender Balken im <b>Uhrwerk</b>, Warp-Löcher im <b>Weltraum</b> – oder schlicht <b>Klassisch</b>!', 'modes.k': 'Wirf einen Blick auf ein wildes Brett', 'modes.ok': 'Was für ein Trubel! Spiel auf deinem Lieblingsbrett.',
      'win.t': 'So gewinnst du', 'win.b': 'Wer zuerst die gewählte Zahl erreicht, gewinnt! <b>Verteidige vor deinem Tor</b> und such <b>den schrägen Schuss über die Bande</b>. Die KI hat 20 Stufen, und zwei können sich einen Bildschirm teilen.' },
    ru: { 'move.t': 'Двигаем биту', 'move.b': 'Бита ходит где угодно <b>в своей половине</b>. {move}', 'move.k': 'Подведи биту к светящемуся кольцу', 'move.ok': 'Точно! За центральную линию ей нельзя.',
      'hit.t': 'Цель — ворота', 'hit.b': 'При ударе <b>скорость биты передаётся шайбе</b>. <b>Щель в дальнем борту — это ворота</b>.', 'hit.k': 'Забей шайбу в дальние ворота', 'hit.ok': 'Гол! Можно и от борта.', 'hit.ng': 'Ещё раз!',
      'edge.t': 'Удар ребром', 'edge.b': 'Задень шайбу <b>краем быстро движущейся биты</b>, по касательной, — и она полетит <b>на 30 % быстрее: «удар ребром»</b>. Смахивай сбоку, а не в лоб!', 'edge.k': 'Посмотри, как это делается', 'edge.ok': 'Смахнул краем — вот это скорость!',
      'goal.t': 'Голы и матч', 'goal.b': 'Шайба в воротах — одно очко. <b>Пропустивший снова ставит шайбу</b>. Длина матча: до 5, 7 или 10.', 'goal.k': 'Посмотри гол', 'goal.ok': 'Пропустил — начинаешь ты!',
      'modes.t': 'У каждого поля своя игра', 'modes.b': '<b>Выбранное поле меняет игру</b>: скользкий <b>Аэрохоккей</b>, <b>Неон</b> с монстрами и предметами, <b>Пинбол</b> с отбойниками, вращающаяся планка в <b>Механизме</b>, варп-дыры в <b>Космосе</b> — или простая <b>Классика</b>!', 'modes.k': 'Загляни на шумное поле', 'modes.ok': 'Весело! Играй на любимом поле.',
      'win.t': 'Как победить', 'win.b': 'Кто первым наберёт выбранный счёт — побеждает! <b>Защищайся перед своими воротами</b> и ищи <b>косой удар от борта</b>. У ИИ 20 уровней, а вдвоём можно играть на одном экране.' },
    tr: { 'move.t': 'Raketi oynatmak', 'move.b': 'Raketin <b>kendi yarında</b> her yere gider. {move}', 'move.k': 'Raketi parlayan halkaya getir', 'move.ok': 'Tam isabet! Orta çizgiyi geçemez.',
      'hit.t': 'Kaleyi hedefle', 'hit.b': 'Pakı vurunca <b>raketin hızı paka geçer</b>. Karşı uçtaki <b>yarık kaledir</b>.', 'hit.k': 'Pakı karşı kaleye sok', 'hit.ok': 'Gol! Banttan sektirmek de olur.', 'hit.ng': 'Bir daha!',
      'edge.t': 'Kenar vuruşu', 'edge.b': 'Pakı <b>hızlı bir raketin kenarıyla sıyırarak</b> vur, <b>%30 daha hızlı uçar: “kenar vuruşu”</b>. Önden değil, yandan süpür!', 'edge.k': 'Nasıl yapıldığını izle', 'edge.ok': 'Kenarla süpürünce bu kadar hızlı!',
      'goal.t': 'Goller ve maç', 'goal.b': 'Kaleye düşen pak bir sayıdır. <b>Golü yiyen pakı yeniden koyar</b>. Uzunluğu seç: 5, 7 ya da 10 gole kadar.', 'goal.k': 'Bir gol izle', 'goal.ok': 'Gol yedin mi? Sıradaki başlangıç senin!',
      'modes.t': 'Her masa ayrı oyun', 'modes.b': '<b>Seçtiğin masa oyunu değiştirir</b>: kayan <b>Hava hokeyi</b>, canavar ve eşyalı <b>Neon</b>, tamponlu <b>Pinball</b>, dönen çubuklu <b>Çark</b>, solucan delikli <b>Uzay</b> ya da sade <b>Klasik</b>!', 'modes.k': 'Hareketli bir masaya göz at', 'modes.ok': 'Ne kalabalık! Sevdiğin masada oyna.',
      'win.t': 'Nasıl kazanılır', 'win.b': 'Seçilen skora ilk ulaşan kazanır! <b>Kalenin önünde savun</b>, fırsat için <b>banttan açılı vuruş</b> ara. Yapay zekânın 20 seviyesi var, iki kişi aynı ekranı paylaşabilir.' },
    id: { 'move.t': 'Menggerakkan pemukul', 'move.b': 'Pemukulmu bisa ke mana saja <b>di setengah lapanganmu</b>. {move}', 'move.k': 'Gerakkan pemukul ke cincin yang menyala', 'move.ok': 'Pas! Pemukul tak bisa melewati garis tengah.',
      'hit.t': 'Incar gawang', 'hit.b': 'Saat memukul keping, <b>kecepatan pemukul pindah ke keping</b>. <b>Celah di ujung seberang adalah gawang</b>.', 'hit.k': 'Pukul keping ke gawang seberang', 'hit.ok': 'Gol! Memantulkan ke dinding juga bisa.', 'hit.ng': 'Coba lagi!',
      'edge.t': 'Pukulan tepi', 'edge.b': 'Sambar keping dengan <b>tepi pemukul yang bergerak cepat</b>, dan keping melesat <b>30% lebih cepat: “pukulan tepi”</b>. Sapu dari samping, jangan dari depan!', 'edge.k': 'Lihat contohnya', 'edge.ok': 'Disapu dengan tepi — secepat itu!',
      'goal.t': 'Gol dan pertandingan', 'goal.b': 'Keping yang jatuh ke gawang bernilai satu. <b>Yang kebobolan menaruh keping lagi</b>. Pilih panjangnya: sampai 5, 7, atau 10.', 'goal.k': 'Lihat sebuah gol', 'goal.ok': 'Kebobolan? Kamu yang mulai lagi!',
      'modes.t': 'Tiap papan, permainannya sendiri', 'modes.b': '<b>Papan yang kamu pilih mengubah permainan</b>: <b>Air hockey</b> yang licin, <b>Neon</b> dengan monster dan item, <b>Pinball</b> dengan bumper, palang berputar di <b>Roda gigi</b>, lubang warp di <b>Luar angkasa</b>, atau <b>Klasik</b> biasa!', 'modes.k': 'Intip papan yang ramai', 'modes.ok': 'Ramai sekali! Main di papan yang kamu suka.',
      'win.t': 'Cara menang', 'win.b': 'Yang lebih dulu mencapai skor menang! <b>Bertahanlah di depan gawangmu</b> dan cari <b>tembakan miring lewat dinding</b>. AI punya 20 tingkat, dan dua orang bisa berbagi satu layar.' },
    hi: { 'move.t': 'मैलेट चलाना', 'move.b': 'तुम्हारा मैलेट <b>अपने आधे हिस्से</b> में कहीं भी जा सकता है। {move}', 'move.k': 'मैलेट को चमकते घेरे तक लाओ', 'move.ok': 'बिल्कुल सही! वह बीच की रेखा पार नहीं कर सकता।',
      'hit.t': 'गोल पर निशाना', 'hit.b': 'पक को मारते ही <b>मैलेट की रफ़्तार पक में चली जाती है</b>। सामने के छोर की <b>दरार ही गोल है</b>।', 'hit.k': 'पक को सामने वाले गोल में डालो', 'hit.ok': 'गोल! दीवार से टकराकर भी चलता है।', 'hit.ng': 'फिर से!',
      'edge.t': 'किनारे का शॉट', 'edge.b': 'तेज़ चलते मैलेट के <b>किनारे से छूकर</b> मारो, तो पक <b>30% तेज़ उड़ता है: “किनारे का शॉट”</b>। सामने से नहीं, बगल से झाड़ो!', 'edge.k': 'करके दिखाती हूँ', 'edge.ok': 'किनारे से झाड़ा — इतना तेज़!',
      'goal.t': 'गोल और मैच', 'goal.b': 'गोल में गिरा पक एक अंक। <b>जिस पर गोल हुआ वही पक फिर रखता है</b>। लंबाई चुनो: 5, 7 या 10 तक।', 'goal.k': 'एक गोल देखो', 'goal.ok': 'गोल खाया? अगली शुरुआत तुम्हारी!',
      'modes.t': 'हर बोर्ड, अपना खेल', 'modes.b': '<b>जो बोर्ड चुनोगे, खेल वैसा बदलेगा</b>: फिसलता <b>एयर हॉकी</b>, राक्षस और आइटम वाला <b>नियॉन</b>, बंपर वाला <b>पिनबॉल</b>, घूमती छड़ वाला <b>घड़ी-कारखाना</b>, वार्प-छेद वाला <b>अंतरिक्ष</b>, या सादा <b>क्लासिक</b>!', 'modes.k': 'एक रौनक वाले बोर्ड पर नज़र डालो', 'modes.ok': 'कितनी रौनक! अपने पसंदीदा बोर्ड पर खेलो।',
      'win.t': 'कैसे जीतें', 'win.b': 'चुना स्कोर पहले पाने वाला जीतता है! <b>अपने गोल के सामने बचाव करो</b> और <b>दीवार से तिरछा शॉट</b> ढूँढो। AI के 20 स्तर हैं, और दो लोग एक ही स्क्रीन पर खेल सकते हैं।' },
    ar: { 'move.t': 'تحريك المضرب', 'move.b': 'يتحرك مضربك في أي مكان <b>داخل نصفك</b>. {move}', 'move.k': 'حرّك المضرب إلى الحلقة المضيئة', 'move.ok': 'تمامًا! لا يعبر خط المنتصف.',
      'hit.t': 'صوّب نحو المرمى', 'hit.b': 'عندما تضرب القرص <b>تنتقل سرعة المضرب إليه</b>. <b>الفتحة في الطرف البعيد هي المرمى</b>.', 'hit.k': 'أدخل القرص في المرمى البعيد', 'hit.ok': 'هدف! الارتداد عن الجدار يصلح أيضًا.', 'hit.ng': 'مرة أخرى!',
      'edge.t': 'ضربة الحافة', 'edge.b': 'المس القرص <b>بحافة مضرب سريع الحركة</b> لمسًا جانبيًا، فينطلق <b>أسرع بـ30%: «ضربة الحافة»</b>. اكنسه من الجانب لا من الأمام!', 'edge.k': 'شاهد كيف تُؤدّى', 'edge.ok': 'كنسة بالحافة — بهذه السرعة!',
      'goal.t': 'الأهداف والمباراة', 'goal.b': 'القرص الذي يسقط في المرمى نقطة. <b>من استقبل الهدف يضع القرص من جديد</b>. اختر الطول: حتى 5 أو 7 أو 10.', 'goal.k': 'شاهد هدفًا', 'goal.ok': 'استقبلت هدفًا؟ تبدأ أنت!',
      'modes.t': 'لكل لوحة لعبتها', 'modes.b': '<b>اللوحة التي تختارها تغيّر اللعبة</b>: <b>هوكي الهواء</b> المنزلق، و<b>نيون</b> بالوحوش والأدوات، و<b>بينبول</b> بالمصدات، وعارضة تدور في <b>التروس</b>، وثقوب الالتواء في <b>الفضاء</b>، أو <b>كلاسيك</b> البسيط!', 'modes.k': 'ألقِ نظرة على لوحة صاخبة', 'modes.ok': 'يا للحماس! العب على اللوحة التي تحبها.',
      'win.t': 'كيف تفوز', 'win.b': 'من يصل أولًا إلى النتيجة المختارة يفوز! <b>دافع أمام مرماك</b> وابحث عن <b>ضربة مائلة عن الجدار</b>. للذكاء الاصطناعي 20 مستوى، ويمكن لشخصين مشاركة الشاشة.' },
  };
  // how you move it, per device
  const MOVE = {
    m: { ja: 'マウスを動かすだけでついてくるよ（ボタンは押さなくていい）。キーボードならWASDか矢印キー、ゲームパッドなら左スティック。', en: 'It follows the mouse — no button needed. On a keyboard use WASD or the arrows; on a gamepad, the left stick.', zh: '鼠标一动它就跟着动（不用按键）。键盘用WASD或方向键，手柄用左摇杆。', 'zh-TW': '滑鼠一動它就跟著動（不用按鍵）。鍵盤用WASD或方向鍵，手把用左搖桿。', ko: '마우스를 움직이면 따라와 (버튼은 안 눌러도 돼). 키보드는 WASD나 방향키, 게임패드는 왼쪽 스틱.', es: 'Sigue al ratón, sin pulsar nada. Con teclado, WASD o flechas; con mando, el stick izquierdo.', fr: 'Il suit la souris, sans bouton. Au clavier, ZQSD/WASD ou les flèches ; à la manette, le stick gauche.', pt: 'Ele segue o mouse, sem botão. No teclado, WASD ou setas; no controle, o analógico esquerdo.', de: 'Er folgt der Maus – ohne Taste. Auf der Tastatur WASD oder Pfeile, am Gamepad der linke Stick.', ru: 'Бита идёт за мышью — кнопку жать не нужно. На клавиатуре WASD или стрелки, на геймпаде левый стик.', tr: 'Fareyi takip eder, tuşa basmak gerekmez. Klavyede WASD ya da oklar, oyun kolunda sol çubuk.', id: 'Ia mengikuti mouse, tanpa tombol. Di keyboard pakai WASD atau panah; di gamepad, stik kiri.', hi: 'वह माउस के साथ चलता है — बटन नहीं दबाना। कीबोर्ड पर WASD या तीर, गेमपैड पर बायाँ स्टिक।', ar: 'يتبع الفأرة بلا ضغط. على لوحة المفاتيح WASD أو الأسهم، وعلى ذراع التحكم العصا اليسرى.' },
    t: { ja: '自分の側を指でなぞると、パッドは指の少し先についてくるよ（指で隠れないように）。', en: 'Drag a finger in your half and the mallet follows just ahead of it (so your finger doesn’t hide it).', zh: '用手指在自己这边拖动，球拍会跟在手指前方一点（不会被手指挡住）。', 'zh-TW': '用手指在自己這邊拖動，球拍會跟在手指前方一點（不會被手指擋住）。', ko: '내 쪽을 손가락으로 그으면 패드가 손가락 조금 앞에서 따라와 (손가락에 가리지 않게).', es: 'Arrastra un dedo en tu mitad y el mazo lo sigue un poco por delante (para que el dedo no lo tape).', fr: 'Glisse un doigt dans ta moitié : le maillet suit juste devant (pour que ton doigt ne le cache pas).', pt: 'Arraste o dedo na sua metade e o taco segue um pouco à frente (para o dedo não cobrir).', de: 'Zieh einen Finger durch deine Hälfte, der Schläger folgt knapp davor (damit der Finger ihn nicht verdeckt).', ru: 'Веди пальцем в своей половине — бита идёт чуть впереди пальца (чтобы он её не закрывал).', tr: 'Kendi yarında parmağını sürükle; raket parmağın biraz önünde gelir (parmağın kapatmasın diye).', id: 'Geser jari di setengahmu, pemukul mengikuti sedikit di depan jari (agar tak tertutup jari).', hi: 'अपने आधे में उँगली फिराओ, मैलेट उँगली से थोड़ा आगे चलता है (ताकि उँगली उसे न ढके)।', ar: 'اسحب إصبعك في نصفك فيتبعه المضرب أمامه قليلًا (كي لا يخفيه إصبعك).' },
  };

  const PAGES = [
    { id: 'intro' },
    { id: 'move', kind: 'move', goal: [8, 16] },
    { id: 'hit', kind: 'hit' },
    { id: 'edge', kind: 'demo' },
    { id: 'goal', kind: 'demo' },
    { id: 'modes', kind: 'demo' },
    { id: 'win', last: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.HockeyEngine, D = E.DIM;
    const L = Object.assign({}, UI.en, UI[ctx.lang] || {}), VO = Object.assign({}, V.en, V[ctx.lang] || {});
    const mouse = (() => { try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return false; } })();
    const mv = (MOVE[mouse ? 'm' : 't'][ctx.lang] || MOVE[mouse ? 'm' : 't'].en);
    const T = k => VO[k] != null ? VO[k].replace('{move}', mv) : '';
    try { localStorage.setItem('aicoding-hockey-rules-seen', '1'); } catch (e) {}
    const HK = window.Atlas3D && Atlas3D.hockey, SND = (HK && HK.SND) || { hit() {}, edge() {}, wall() {}, goal() {}, boing() {}, pick() {}, warp() {}, beep() {}, click() {} };
    const board = T3.MODELS.hockey(true); T3.show('hockey', board); if (T3.play) T3.play(true);
    const U = board.userData, Y = U.top, K = U.K;
    const baseFit = () => innerHeight > innerWidth * 1.15 ? { w: U.OW * K + .3, d: U.OL * K + .8, y: Y, pitch: 1.12 } : { w: U.OW * K + .5, d: U.OL * K + .6, y: Y, pitch: 1.05 };
    if (T3.fit) T3.fit(baseFit());
    const onResizeF = () => { if (T3.fit) T3.fit(baseFit()); };
    addEventListener('resize', onResizeF);
    let step = 0, played = false, busy = false, stopped = false, timers = [], raf = 0, s = null, ctrl = null, last = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => T3.kick && T3.kick(ms || 150);
    const put = (g, x, y, h) => { const [a, b] = U.xz(x, y); g.position.set(a, Y + (h || 0), b); };

    /* ---------- the pieces of a scene ---------- */
    const mal = [U.mallet(0), U.mallet(1)]; mal.forEach(m => board.add(m));
    let pucks = new Map(), extra = [], monM = [], barM = null, ringM = null;
    function clearScene() { for (const g of pucks.values()) board.remove(g); pucks = new Map(); extra.forEach(g => board.remove(g)); extra = []; monM = []; barM = null; if (ringM) { board.remove(ringM); ringM = null; } }
    function scene(mode, puckAt) {
      clearScene();
      s = E.newMatch({ mode, target: 99, seed: 7 });
      if (puckAt) { s.pucks.length = 0; s.pucks.push({ x: puckAt[0], y: puckAt[1], vx: 0, vy: 0, fire: 0, id: 1, wait: 0 }); }
      if (E.has(s, 'block')) { barM = U.bar(); board.add(barM); extra.push(barM); }
      s.mons.forEach((m, i) => { const g = U.monster(i); board.add(g); monM.push(g); extra.push(g); });
      sync(performance.now());
    }
    function sync(now) {
      if (!s) return;
      for (let i = 0; i < 2; i++) put(mal[i], s.mal[i].x, s.mal[i].y);
      const seen = new Set();
      s.pucks.forEach(p => { let g = pucks.get(p.id); if (!g) { g = U.puck(); board.add(g); pucks.set(p.id, g); } seen.add(p.id); put(g, p.x, p.y); g.visible = !(p.wait > .45); });
      for (const [id, g] of pucks) if (!seen.has(id)) { board.remove(g); pucks.delete(id); }
      s.mons.forEach((m, i) => { if (monM[i]) { put(monM[i], m.x, m.y); monM[i].rotation.y = Math.atan2(m.vx, m.vy); } });
      if (barM) { put(barM, 0, 0); barM.rotation.y = -s.bar; }
      (s.items || []).forEach(it => { if (!it.g) { it.g = U.item(it.k); board.add(it.g); extra.push(it.g); } put(it.g, it.x, it.y); it.g.userData.coin.rotation.y = now / 500; });
      extra.forEach(g => { if (g.userData && g.userData.coin && !s.items.some(it => it.g === g)) g.visible = false; });
      kick(120);
    }
    // the simulation runs while a page needs it; ctrl(dt) gives the two mallets' targets and checks the page's goal
    function run(c) { ctrl = c; cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop); }
    function halt() { ctrl = null; cancelAnimationFrame(raf); }
    function loop(now) {
      if (stopped || !ctrl) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(.034, Math.max(0, (now - last) / 1000)); last = now;
      const inp = ctrl.input(dt); E.step(s, dt, inp);
      for (const e of s.ev) {
        if (e.k === 'hit') SND.hit(e.v); else if (e.k === 'edge') { SND.edge(); fx(e.x, e.y, HK && HK.modeName ? edgeWord() : 'Edge!'); }
        else if (e.k === 'wall') SND.wall(e.v); else if (e.k === 'block' || e.k === 'monster' || e.k === 'bumper') SND.boing(); else if (e.k === 'goal') SND.goal(); else if (e.k === 'pick') SND.pick();
      }
      sync(now);
      if (ctrl && ctrl.check) ctrl.check();
    }
    const EDGE = { ja: 'エッジショット！', en: 'Edge shot!', zh: '边缘击球！', 'zh-TW': '邊緣擊球！', ko: '엣지 샷！', es: '¡Golpe de canto!', fr: 'Coup de tranche !', pt: 'Tacada de quina!', de: 'Kantenschuss!', ru: 'Удар ребром!', tr: 'Kenar vuruşu!', id: 'Pukulan tepi!', hi: 'किनारे का शॉट!', ar: 'ضربة الحافة!' };
    const edgeWord = () => EDGE[ctx.lang] || EDGE.en;
    function fx(x, y, m) { if (!T3.project) return; const [a, b] = U.xz(x, y), p = T3.project(a, b, Y); const d = document.createElement('div'); d.className = 'hkfx'; d.textContent = m; d.style.cssText = `position:fixed;left:${p.x}px;top:${p.y}px;z-index:80;pointer-events:none;font-weight:900;font-size:16px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35),0 0 10px rgba(255,120,40,.9);transform:translate(-50%,-50%);transition:transform .8s ease-out,opacity .8s`; document.body.appendChild(d); requestAnimationFrame(() => { d.style.transform = 'translate(-50%,-180%)'; d.style.opacity = '0'; }); setTimeout(() => d.remove(), 900); }

    /* ---------- your hand: the mallet follows the pointer (mouse hover / a finger in your half, a little ahead of it) ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    let you = null;
    const onMove = e => { if (!ctrl || !ctrl.you) return; if (e.pointerType !== 'mouse' && !e.buttons && e.type === 'pointermove' && !held) return; const q = toCm(e); if (!q) return; you = { tx: q.x, ty: q.y - (e.pointerType === 'touch' ? 4.5 : 0) }; };
    let held = false;
    const onDown = e => { held = true; onMove(e); if (e.pointerType !== 'mouse') e.preventDefault(); if (!ctrl && P().kind === 'demo' && !played && !busy) demo(); };
    const onUp = () => { held = false; };
    ctx.el.addEventListener('pointermove', onMove); ctx.el.addEventListener('pointerdown', onDown); addEventListener('pointerup', onUp, true);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';

    /* ---------- the guide panel (the shared .rgd look of every tour) ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = q => el.querySelector(q);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:800}'
      + '.rgd .urt{background:#fff3c4;color:#7a4a00;border:2px solid #f0c24a;font-weight:900;box-shadow:0 3px 0 #e6b43a;animation:hkRP 1.6s ease-in-out infinite}@keyframes hkRP{50%{box-shadow:0 3px 0 #e6b43a,0 0 0 5px rgba(240,194,74,.28)}}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}}';
    document.head.appendChild(css);
    let ACx = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; ACx = ACx || window.__atlasAC || new (window.AudioContext || window.webkitAudioContext)(); if (ACx.state === 'suspended') ACx.resume(); const f = 520 + Math.random() * 240, t = ACx.currentTime, o = ACx.createOscillator(), g = ACx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(.035, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05); o.connect(g); g.connect(ACx.destination); o.start(t); o.stop(t + .06); } catch (e) {} };
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walkN(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walkN(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; });
      let ni = 0, ci = 0, bc = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 3; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, sx] = nodes[ni]; const ch = sx[ci]; nd.textContent = sx.slice(0, ++ci); if (ch && !/[\s、。,.!?！？]/.test(ch) && ++bc % 3 === 0) blip(); if (ci >= sx.length) { ni++; ci = 0; } } }, 28);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, sx]) => { nd.textContent = sx; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const cnt = html => { $('.cnt').innerHTML = html || ''; msg(''); };
    const tag = (html, bg, col) => `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block${bg ? `;background:${bg};color:${col}` : ''}">${html}</span>`;
    const task = html => `<span class="tag urt" style="white-space:normal;height:auto;line-height:1.4;display:inline-block">${html}</span>`;
    const chips = () => `<div class="urh"><div class="tg"><span>📍 ${L.origin}</span><span>👥 ${L.players}</span><span>⏱ ${L.time}</span></div></div>`;
    let msgT = 0;
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3400); }
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
    const park = { tx: -15, ty: -27 };
    const setMal = (i, x, y) => { const m = s.mal[i]; m.x = m.tx = x; m.y = m.ty = y; };   // the far mallet out of the way (the live pages)
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; halt();
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt(''); you = null;
      if (pg.id === 'intro' || pg.last) { scene('classic', [6, -4]); setMal(0, 4, 20); setMal(1, -6, -21); sync(performance.now()); say(pg.last ? `<b>${T('win.t')}</b>　${T('win.b')}` : (HELLO[ctx.lang] || HELLO.en)); if (!pg.last) cnt(chips()); buttons(); return; }
      if (pg.id === 'move') {
        scene('classic', [0, -8]);
        ringM = new TH.Mesh(new TH.TorusGeometry(D.RM * K * 1.15, .03, 8, 40), new TH.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: .95, toneMapped: false })); ringM.rotation.x = Math.PI / 2; put(ringM, pg.goal[0], pg.goal[1], .04); board.add(ringM);
        run({ you: true, input: () => [you, park], check: () => { if (!played && Math.hypot(s.mal[0].x - pg.goal[0], s.mal[0].y - pg.goal[1]) < 2) ok('move.ok'); } });
      } else if (pg.id === 'hit') {
        scene('classic', [0, 8]);
        let tries = 0, still = 0;
        run({ you: true, input: dt => { const p = s.pucks[0]; if (p && Math.hypot(p.vx, p.vy) < 8 && p.y > 0) still += dt; else still = 0; return [you, park]; },
          check: () => {
            if (played) return;
            if (s.score[0] > 0) { ok('hit.ok'); return; }
            if (s.score[1] > tries || still > 5) { tries = s.score[1]; still = 0; msg(`<span>${T('hit.ng')}</span>`); s.pucks.length = 0; s.pucks.push({ x: 0, y: 8, vx: 0, vy: 0, fire: 0, id: (s.pid = (s.pid || 1) + 1), wait: 0 }); s.pause = 0; }
          } });
      } else if (pg.id === 'edge') { scene('classic', [0, 8]); setMal(0, -14, 14); }
      else if (pg.id === 'goal') { scene('classic', [-6, 4]); setMal(0, -9, 12); }
      else if (pg.id === 'modes') { scene('chaos', [0, 9]); }
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      cnt(task(`👆 ${T(pg.id + '.k')}`));
      buttons();
    }
    function ok(key) {
      played = true; busy = false; cnt(tag(`✓ ${T(key)}`, '#e8f8ee', '#16784a')); buttons();
      if (ringM) { board.remove(ringM); ringM = null; }
      if (!P().last) {
        const s0 = step, ms = 1600 + Math.min(3200, T(key).replace(/<[^>]+>/g, '').length * 45);
        if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), ms, () => step === s0);
        later(() => { if (step === s0 && played) go(step + 1); }, ms);
      }
    }
    // the watched pages: scripted mallets, the real physics
    function demo() {
      if (busy || played) return; busy = true; cnt('');
      const pg = P(), t0 = performance.now();
      if (pg.id === 'edge') {
        // a fast sideways sweep that catches the puck with the mallet's rim (a glancing contact) — it flies into the far goal
        setMal(0, -14, 14);
        let tt = 0;
        run({ input: dt => { tt += dt; const k = Math.min(1, tt / .12); return [{ tx: -14 + k * 32, ty: 14 - k * 4 }, park]; }, check: () => { if (tt > 2.6 || s.score[0] > 0 && tt > .9) { halt(); ok('edge.ok'); } } });
      } else if (pg.id === 'goal') {
        let tt = 0;
        run({ input: dt => { tt += dt; return [{ tx: -9 + Math.min(1, tt / .2) * 9, ty: 12 - Math.min(1, tt / .2) * 14 }, park]; }, check: () => { if (s.score[0] > 0 || tt > 4) { halt(); later(() => ok('goal.ok'), 400); } } });
      } else if (pg.id === 'modes') {
        const m0 = {}, m1 = {}; let tt = 0;
        run({ input: dt => { tt += dt; return [E.aiTarget(s, 0, 12, m0, dt), E.aiTarget(s, 1, 12, m1, dt)]; }, check: () => { if (tt > 7) { halt(); ok('modes.ok'); } } });
      }
    }
    $('[data-a=next]').onclick = () => { if (P().last) ctx.onStart(); else if (P().kind === 'demo' && !played) demo(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'ArrowRight' && !$('[data-a=next]').disabled) $('[data-a=next]').click();
      else if (e.key === 'ArrowLeft') $('[data-a=back]').click();
    };
    document.addEventListener('keydown', onKey);
    go(0);
    requestAnimationFrame(() => el.classList.add('on'));
    const sess = {
      stop() { stopped = true; halt(); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('pointermove', onMove); ctx.el.removeEventListener('pointerdown', onDown); removeEventListener('pointerup', onUp, true); ctx.el.style.touchAction = prevTouch; removeEventListener('resize', lockH); removeEventListener('resize', onResizeF); document.removeEventListener('keydown', onKey); css.remove(); el.remove(); clearScene(); },
      panel: el,
      _debug: { step: () => step, played: () => played, go, st: () => s, demo },
    };
    window.__rulesSess = sess;
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.hockey = { start };
})();
