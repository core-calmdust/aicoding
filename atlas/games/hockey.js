/* =====================================================================
   Table hockey on the portal — table play (3D only, like carrom: no 2D page). Real time.
   · Physics, modes and AI: ../hockey/engine.js (HockeyEngine).  Board and pieces: Table3D.MODELS.hockey (atlas/models/hockey.js).
   · Start → a menu of modes (classic, block, monster, items, bumper, warp, multi, chaos; the last one remembered) → 3-2-1 → play.
   · You are player 0 (the near end, red). Two players on one device: phones keep the table upright (each player takes an end:
     a finger in your own half moves your mallet), wide screens turn it sideways (you on the left, the second player on the
     right).
   · Controls: mouse (the mallet follows the pointer, no button), touch (drag in your half; the mallet sits a little ahead of
     the finger), keys (WASD / arrows; in two-player games WASD = left player, arrows = right player), gamepads (left stick or
     d-pad; the first pad plays the near / left mallet, a second pad the far / right one — with a single pad in a two-player
     game it takes the far / right mallet).
   · Game length (the size select): first to 5, 7 or 10 goals.
   ===================================================================== */
(function () {
  'use strict';
  const LG = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // [ja, en, zh, zh-TW, ko, es, fr, pt, de, ru, tr, id, hi, ar]
  const S = {
    len: ['ゲームの長さ', 'Game length', '对局长度', '對局長度', '게임 길이', 'Duración', 'Durée', 'Duração', 'Spiellänge', 'Длина игры', 'Oyun uzunluğu', 'Panjang permainan', 'खेल की लंबाई', 'طول اللعبة'],
    first: ['{n}点先取', 'First to {n}', '先得{n}分', '先得{n}分', '{n}점 선취', 'A {n} goles', 'En {n} buts', 'Até {n} gols', 'Bis {n} Tore', 'До {n} голов', '{n} gole kadar', 'Sampai {n} gol', '{n} गोल तक', 'حتى {n} أهداف'],
    pick: ['モードを選ぶ', 'Choose a mode', '选择模式', '選擇模式', '모드 선택', 'Elige un modo', 'Choisis un mode', 'Escolha um modo', 'Modus wählen', 'Выбери режим', 'Mod seç', 'Pilih mode', 'मोड चुनो', 'اختر نمطًا'],
    play: ['スタート', 'Start', '开始', '開始', '시작', 'Empezar', 'Jouer', 'Começar', 'Los', 'Старт', 'Başla', 'Mulai', 'शुरू', 'ابدأ'],
    you: ['あなた', 'You', '你', '你', '나', 'Tú', 'Toi', 'Você', 'Du', 'Вы', 'Sen', 'Kamu', 'आप', 'أنت'],
    ai: ['AI', 'AI', 'AI', 'AI', 'AI', 'IA', 'IA', 'IA', 'KI', 'ИИ', 'YZ', 'AI', 'AI', 'الذكاء'],
    p1: ['赤', 'Red', '红', '紅', '빨강', 'Rojo', 'Rouge', 'Vermelho', 'Rot', 'Красный', 'Kırmızı', 'Merah', 'लाल', 'الأحمر'],
    p2: ['黄', 'Yellow', '黄', '黃', '노랑', 'Amarillo', 'Jaune', 'Amarelo', 'Gelb', 'Жёлтый', 'Sarı', 'Kuning', 'पीला', 'الأصفر'],
    goal: ['ゴール！', 'GOAL!', '进球！', '進球！', '골！', '¡GOL!', 'BUT !', 'GOL!', 'TOR!', 'ГОЛ!', 'GOL!', 'GOL!', 'गोल!', 'هدف!'],
    edge: ['エッジショット！', 'Edge shot!', '边缘击球！', '邊緣擊球！', '엣지 샷！', '¡Golpe de canto!', 'Coup de tranche !', 'Tacada de quina!', 'Kantenschuss!', 'Удар ребром!', 'Kenar vuruşu!', 'Pukulan tepi!', 'किनारे का शॉट!', 'ضربة الحافة!'],
    score: ['{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}', '{a} − {b}'],
    to: ['{n}点先取', 'to {n}', '先得{n}分', '先得{n}分', '{n}점 선취', 'a {n}', 'en {n}', 'até {n}', 'bis {n}', 'до {n}', '{n} gole', 'sampai {n}', '{n} तक', 'حتى {n}'],
    win: ['{p}の勝ち', '{p} wins', '{p}获胜', '{p}獲勝', '{p} 승리', 'Gana {p}', '{p} gagne', '{p} vence', '{p} gewinnt', 'Победа: {p}', '{p} kazandı', '{p} menang', '{p} जीता', 'فاز {p}'],
    'it.speed': ['スピードアップ！', 'Speed up!', '加速！', '加速！', '스피드 업！', '¡Más rápido!', 'Accélération !', 'Mais rápido!', 'Tempo!', 'Ускорение!', 'Hızlan!', 'Makin cepat!', 'तेज़!', 'تسريع!'],
    'it.split': ['パックが分裂！', 'The puck splits!', '冰球分裂！', '冰球分裂！', '퍽이 분열！', '¡El disco se divide!', 'Le palet se divise !', 'O disco se divide!', 'Der Puck teilt sich!', 'Шайба делится!', 'Pak bölündü!', 'Keping terbelah!', 'पक बँट गया!', 'القرص ينقسم!'],
    'it.giant': ['{p}のパッドが巨大化！', '{p}: giant mallet!', '{p}的球拍变大！', '{p}的球拍變大！', '{p}의 패드가 거대화！', '{p}: ¡mazo gigante!', '{p} : maillet géant !', '{p}: taco gigante!', '{p}: Riesenschläger!', '{p}: гигантская бита!', '{p}: dev raket!', '{p}: pemukul raksasa!', '{p}: बड़ा मैलेट!', '{p}: مضرب عملاق!'],
    'it.shield': ['{p}のゴールにシールド！', '{p}: goal shield!', '{p}的球门有护盾！', '{p}的球門有護盾！', '{p}의 골에 실드！', '{p}: ¡escudo en la portería!', '{p} : bouclier au but !', '{p}: escudo no gol!', '{p}: Torschild!', '{p}: щит у ворот!', '{p}: kale kalkanı!', '{p}: perisai gawang!', '{p}: गोल पर ढाल!', '{p}: درع للمرمى!'],
    'it.freeze': ['相手のパッドが凍った！', 'Opponent frozen!', '对手被冻住！', '對手被凍住！', '상대 패드가 얼었다！', '¡Rival congelado!', 'Adversaire gelé !', 'Rival congelado!', 'Gegner eingefroren!', 'Соперник заморожен!', 'Rakip dondu!', 'Lawan membeku!', 'विरोधी जम गया!', 'تجمّد الخصم!'],
    paused: ['一時停止中（クリックで再開）', 'Paused (click to resume)', '已暂停（点击继续）', '已暫停（點擊繼續）', '일시 정지 (클릭하면 재개)', 'En pausa (clic para seguir)', 'En pause (clic pour reprendre)', 'Pausado (clique para continuar)', 'Pause (Klick zum Weiterspielen)', 'Пауза (нажми, чтобы продолжить)', 'Duraklatıldı (devam için tıkla)', 'Dijeda (klik untuk lanjut)', 'रुका (जारी रखने के लिए क्लिक)', 'متوقف (انقر للمتابعة)'],
  };
  // the modes: [name, one line]
  const M = {
    classic: [['クラシック', '特別なルールなし。腕だけで勝負'], ['Classic', 'No tricks: skill only'], ['经典', '没有特殊规则，只拼技术'], ['經典', '沒有特殊規則，只拼技術'], ['클래식', '특수 규칙 없이 실력 승부'], ['Clásico', 'Sin trucos: solo habilidad'], ['Classique', 'Sans gadget : que du talent'], ['Clássico', 'Sem truques: só habilidade'], ['Klassisch', 'Keine Tricks, nur Können'], ['Классика', 'Без хитростей — только умение'], ['Klasik', 'Hile yok, sadece beceri'], ['Klasik', 'Tanpa trik, murni kemampuan'], ['क्लासिक', 'कोई चाल नहीं, सिर्फ़ हुनर'], ['كلاسيكي', 'بلا حيل: المهارة فقط']],
    block: [['センターブロック', '中央で回るバーに当たると跳ね返って加速'], ['Center block', 'A turning bar in the middle bounces the puck back faster'], ['中央挡板', '中间旋转的横杆会把冰球加速弹回'], ['中央擋板', '中間旋轉的橫桿會把冰球加速彈回'], ['센터 블록', '가운데서 도는 막대에 맞으면 빨라져서 튕겨 나옴'], ['Bloque central', 'Una barra giratoria en el centro devuelve el disco más rápido'], ['Bloc central', 'Une barre tournante au centre renvoie le palet plus vite'], ['Bloco central', 'Uma barra giratória no meio rebate o disco mais rápido'], ['Mittelblock', 'Ein drehender Balken in der Mitte schleudert den Puck schneller zurück'], ['Центральный блок', 'Вращающаяся планка в центре отбивает шайбу быстрее'], ['Orta blok', 'Ortada dönen çubuk pakı hızlandırarak geri sektirir'], ['Blok tengah', 'Palang berputar di tengah memantulkan keping lebih cepat'], ['सेंटर ब्लॉक', 'बीच में घूमती छड़ पक को तेज़ी से लौटाती है'], ['الحاجز الأوسط', 'عارضة تدور في الوسط تعيد القرص أسرع']],
    monster: [['モンスター', '真ん中をうろつくモンスターがパックをはじく'], ['Monsters', 'Monsters roam the middle and knock the puck about'], ['怪兽', '在中间游荡的怪兽会把冰球撞开'], ['怪獸', '在中間遊蕩的怪獸會把冰球撞開'], ['몬스터', '가운데를 돌아다니는 몬스터가 퍽을 튕긴다'], ['Monstruos', 'Monstruos que deambulan por el centro desvían el disco'], ['Monstres', 'Des monstres errent au milieu et dévient le palet'], ['Monstros', 'Monstros vagam pelo meio e desviam o disco'], ['Monster', 'Monster laufen durch die Mitte und lenken den Puck ab'], ['Монстры', 'Монстры бродят по центру и отбивают шайбу'], ['Canavarlar', 'Ortada dolaşan canavarlar pakı saptırır'], ['Monster', 'Monster berkeliaran di tengah dan memantulkan keping'], ['राक्षस', 'बीच में घूमते राक्षस पक को उछालते हैं'], ['وحوش', 'وحوش تتجول في الوسط وتصدم القرص']],
    items: [['アイテム', 'パックで取るとスピードアップ・分裂・巨大化・シールド・凍結'], ['Items', 'Hit them with the puck: speed, split, giant, shield, freeze'], ['道具', '用冰球碰到：加速、分裂、变大、护盾、冻结'], ['道具', '用冰球碰到：加速、分裂、變大、護盾、凍結'], ['아이템', '퍽으로 먹으면 스피드·분열·거대화·실드·동결'], ['Objetos', 'Tócalos con el disco: velocidad, división, gigante, escudo, hielo'], ['Objets', 'Touche-les avec le palet : vitesse, division, géant, bouclier, gel'], ['Itens', 'Pegue com o disco: velocidade, divisão, gigante, escudo, congelar'], ['Items', 'Mit dem Puck einsammeln: Tempo, Teilung, Riese, Schild, Frost'], ['Предметы', 'Собери шайбой: скорость, деление, гигант, щит, заморозка'], ['Eşyalar', 'Pakla al: hız, bölünme, dev, kalkan, dondurma'], ['Item', 'Ambil dengan keping: cepat, belah, raksasa, perisai, beku'], ['आइटम', 'पक से छुओ: तेज़, बँटवारा, विशाल, ढाल, जमाव'], ['عناصر', 'التقطها بالقرص: سرعة، انقسام، عملاق، درع، تجميد']],
    bumper: [['バンパー', '4つのバンパーがパックを強くはじき返す'], ['Bumpers', 'Four bumpers kick the puck back hard'], ['弹射柱', '四根弹射柱会把冰球猛力弹回'], ['彈射柱', '四根彈射柱會把冰球猛力彈回'], ['범퍼', '범퍼 4개가 퍽을 세게 튕겨낸다'], ['Rebotadores', 'Cuatro rebotadores devuelven el disco con fuerza'], ['Bumpers', 'Quatre bumpers renvoient le palet fort'], ['Rebatedores', 'Quatro rebatedores devolvem o disco com força'], ['Bumper', 'Vier Bumper schleudern den Puck kräftig zurück'], ['Отбойники', 'Четыре отбойника сильно отбивают шайбу'], ['Tamponlar', 'Dört tampon pakı sertçe geri iter'], ['Bumper', 'Empat bumper memantulkan keping dengan keras'], ['बम्पर', 'चार बम्पर पक को ज़ोर से लौटाते हैं'], ['مصدّات', 'أربع مصدّات تعيد القرص بقوة']],
    warp: [['ワープ', '左右の穴に入ったパックは反対側から飛び出す'], ['Warp', 'A puck that enters one side portal shoots out of the other'], ['传送', '冰球进入一侧传送门会从另一侧飞出'], ['傳送', '冰球進入一側傳送門會從另一側飛出'], ['워프', '한쪽 구멍에 들어간 퍽이 반대쪽에서 튀어나온다'], ['Teletransporte', 'El disco que entra por un portal sale por el otro'], ['Téléport', 'Le palet qui entre dans un portail ressort par l’autre'], ['Teletransporte', 'O disco que entra num portal sai pelo outro'], ['Warp', 'Ein Puck im einen Portal schießt aus dem anderen'], ['Варп', 'Шайба, влетевшая в один портал, вылетает из другого'], ['Işınlanma', 'Bir portala giren pak diğerinden çıkar'], ['Warp', 'Keping yang masuk satu portal keluar dari portal lain'], ['वार्प', 'एक तरफ़ के द्वार में गया पक दूसरी तरफ़ से निकलता है'], ['انتقال', 'القرص الذي يدخل بوابة يخرج من الأخرى']],
    multi: [['マルチパック', 'パックが2つ。同時に目を配れ'], ['Multi-puck', 'Two pucks at once: watch both'], ['多球', '两个冰球，同时注意'], ['多球', '兩個冰球，同時注意'], ['멀티 퍽', '퍽이 두 개. 동시에 살펴라'], ['Multidisco', 'Dos discos a la vez: vigila los dos'], ['Multi-palet', 'Deux palets à la fois : surveille les deux'], ['Multidisco', 'Dois discos de uma vez: fique de olho nos dois'], ['Multi-Puck', 'Zwei Pucks gleichzeitig: behalte beide im Blick'], ['Мультишайба', 'Две шайбы сразу — следи за обеими'], ['Çoklu pak', 'Aynı anda iki pak: ikisine de dikkat'], ['Multi keping', 'Dua keping sekaligus: awasi keduanya'], ['मल्टी पक', 'एक साथ दो पक: दोनों पर नज़र'], ['أقراص متعددة', 'قرصان معًا: راقب الاثنين']],
    chaos: [['カオス', 'センターブロック＋モンスター＋アイテム、全部入り'], ['Chaos', 'Center block + monsters + items, all at once'], ['混沌', '中央挡板＋怪兽＋道具，全部都有'], ['混沌', '中央擋板＋怪獸＋道具，全部都有'], ['카오스', '센터 블록＋몬스터＋아이템 전부'], ['Caos', 'Bloque central + monstruos + objetos, todo junto'], ['Chaos', 'Bloc central + monstres + objets, tout à la fois'], ['Caos', 'Bloco central + monstros + itens, tudo junto'], ['Chaos', 'Mittelblock + Monster + Items, alles zusammen'], ['Хаос', 'Центральный блок + монстры + предметы — всё сразу'], ['Kaos', 'Orta blok + canavarlar + eşyalar, hepsi bir arada'], ['Kacau', 'Blok tengah + monster + item, semuanya'], ['अराजकता', 'सेंटर ब्लॉक + राक्षस + आइटम, सब एक साथ'], ['فوضى', 'الحاجز + الوحوش + العناصر معًا']],
  };
  const ICON = { classic: '🏒', block: '🔄', monster: '👾', items: '🎁', bumper: '🔴', warp: '🌀', multi: '<span style="font-size:16px;letter-spacing:-4px">⚪⚪</span>', chaos: '💥' };
  // controls card (shown once; can be turned off)
  const HOW = {
    ja: ['パッドを動かしてパックを相手のゴールへ', 'マウス：動かすだけ（ボタン不要）／スマホ：自分の側を指でなぞる', 'キー：WASD・矢印／ゲームパッド：左スティック', '速く動かしたパッドの端でかすめるように打つと「エッジショット」で高速に！'],
    en: ['Move your mallet and send the puck into the far goal', 'Mouse: just move it (no button) · Phone: drag in your half', 'Keys: WASD / arrows · Gamepad: left stick', 'Catch the puck with the side of a fast mallet for a speedy "edge shot"!'],
    zh: ['移动球拍，把冰球打进对方球门', '鼠标：直接移动（不用按键）／手机：在自己这边拖动', '键盘：WASD・方向键／手柄：左摇杆', '快速移动球拍用边缘擦着打，就是高速的“边缘击球”！'],
    'zh-TW': ['移動球拍，把冰球打進對方球門', '滑鼠：直接移動（不用按鍵）／手機：在自己這邊拖動', '鍵盤：WASD・方向鍵／手把：左搖桿', '快速移動球拍用邊緣擦著打，就是高速的「邊緣擊球」！'],
    ko: ['패드를 움직여 퍽을 상대 골에 넣어라', '마우스: 움직이기만(버튼 불필요) · 폰: 내 쪽을 드래그', '키: WASD·방향키 · 게임패드: 왼쪽 스틱', '빠르게 움직인 패드 가장자리로 스치듯 치면 고속 「엣지 샷」!'],
    es: ['Mueve tu mazo y mete el disco en la portería rival', 'Ratón: solo muévelo (sin botón) · Móvil: arrastra en tu mitad', 'Teclas: WASD / flechas · Mando: stick izquierdo', '¡Golpea el disco con el canto de un mazo rápido para un tiro veloz!'],
    fr: ['Bouge ton maillet et envoie le palet dans le but adverse', 'Souris : bouge-la (sans bouton) · Mobile : glisse dans ta moitié', 'Touches : ZQSD/WASD / flèches · Manette : stick gauche', 'Frappe avec la tranche d’un maillet rapide pour un tir fulgurant !'],
    pt: ['Mova o taco e mande o disco no gol adversário', 'Mouse: só mover (sem botão) · Celular: arraste na sua metade', 'Teclas: WASD / setas · Controle: analógico esquerdo', 'Acerte com a quina de um taco rápido para uma tacada veloz!'],
    de: ['Bewege deinen Schläger und schieß den Puck ins gegnerische Tor', 'Maus: einfach bewegen (ohne Taste) · Handy: in deiner Hälfte ziehen', 'Tasten: WASD / Pfeile · Gamepad: linker Stick', 'Triff den Puck mit der Kante eines schnellen Schlägers: ein Blitzschuss!'],
    ru: ['Двигай биту и забей шайбу в ворота соперника', 'Мышь: просто двигай (без кнопки) · Телефон: веди пальцем в своей половине', 'Клавиши: WASD / стрелки · Геймпад: левый стик', 'Задень шайбу краем быстрой биты — получится скоростной удар!'],
    tr: ['Raketini oynat, pakı rakip kaleye gönder', 'Fare: sadece oynat (tuşsuz) · Telefon: kendi yarında sürükle', 'Tuşlar: WASD / oklar · Oyun kolu: sol çubuk', 'Hızlı raketin kenarıyla sürterek vur: süper hızlı kenar vuruşu!'],
    id: ['Gerakkan pemukul dan masukkan keping ke gawang lawan', 'Mouse: cukup gerakkan (tanpa tombol) · Ponsel: geser di setengahmu', 'Tombol: WASD / panah · Gamepad: stik kiri', 'Sambar keping dengan tepi pemukul yang cepat untuk pukulan kilat!'],
    hi: ['मैलेट चलाओ और पक को विरोधी के गोल में डालो', 'माउस: बस चलाओ (बटन नहीं) · फ़ोन: अपने आधे में खींचो', 'कुंजियाँ: WASD / तीर · गेमपैड: बायाँ स्टिक', 'तेज़ मैलेट के किनारे से छूकर मारो: तेज़ "किनारे का शॉट"!'],
    ar: ['حرّك مضربك وأدخل القرص في مرمى الخصم', 'الفأرة: حرّكها فقط (بلا زر) · الهاتف: اسحب في نصفك', 'المفاتيح: WASD / الأسهم · ذراع التحكم: العصا اليسرى', 'المس القرص بحافة مضرب سريع لضربة خاطفة!'],
  };
  const HOWK = { title: ['遊び方', 'How to play', '玩法', '玩法', '하는 법', 'Cómo jugar', 'Comment jouer', 'Como jogar', 'So spielst du', 'Как играть', 'Nasıl oynanır', 'Cara bermain', 'कैसे खेलें', 'طريقة اللعب'], ok: ['OK', 'OK', '好的', '好的', '확인', 'Vale', 'OK', 'OK', 'OK', 'Понятно', 'Tamam', 'Oke', 'ठीक', 'حسنًا'], never: ['もう表示しない', 'Don’t show again', '不再显示', '不再顯示', '다시 보지 않기', 'No volver a mostrar', 'Ne plus afficher', 'Não mostrar de novo', 'Nicht mehr zeigen', 'Больше не показывать', 'Bir daha gösterme', 'Jangan tampilkan lagi', 'फिर मत दिखाना', 'لا تعرض مرة أخرى'] };
  const LVD = {
    ja: ['入門：ゆっくり守るだけ', '初級：打ち返してくる', '中級：狙って打つ・素早く守る', '上級：壁を使ったバンクショットも'], en: ['Beginner: slow, mostly defends', 'Novice: hits back', 'Intermediate: aims its shots, quick defence', 'Expert: bank shots off the walls too'],
    zh: ['入门：慢慢防守', '初级：会打回来', '中级：会瞄准、防守快', '高级：还会利用边墙反弹'], 'zh-TW': ['入門：慢慢防守', '初級：會打回來', '中級：會瞄準、防守快', '高級：還會利用邊牆反彈'],
    ko: ['입문: 느리게 막기만', '초급: 받아친다', '중급: 노려 치고 빨리 막는다', '고급: 벽을 쓰는 뱅크 샷까지'], es: ['Principiante: lento, solo defiende', 'Novato: devuelve el disco', 'Intermedio: apunta y defiende rápido', 'Experto: también tiros a banda'],
    fr: ['Débutant : lent, défend surtout', 'Novice : renvoie le palet', 'Intermédiaire : vise, défend vite', 'Expert : joue aussi la bande'], pt: ['Iniciante: lento, só defende', 'Básico: rebate', 'Intermediário: mira e defende rápido', 'Especialista: tabelas nas laterais também'],
    de: ['Einsteiger: langsam, verteidigt meist', 'Anfänger: schlägt zurück', 'Mittel: zielt, verteidigt schnell', 'Experte: auch Bandenschüsse'], ru: ['Начальный: медленно, в основном защищается', 'Новичок: отбивает', 'Средний: целится, быстро защищается', 'Эксперт: бьёт и от бортов'],
    tr: ['Başlangıç: yavaş, çoğu zaman savunur', 'Acemi: geri vurur', 'Orta: nişan alır, hızlı savunur', 'Uzman: banttan vuruş da yapar'], id: ['Pemula: lambat, lebih banyak bertahan', 'Dasar: memukul balik', 'Menengah: membidik, bertahan cepat', 'Ahli: juga pukulan pantul dinding'],
    hi: ['शुरुआती: धीमा, ज़्यादातर बचाव', 'नौसिखिया: वापस मारता है', 'मध्यम: निशाना लगाता है, तेज़ बचाव', 'माहिर: दीवार से बैंक शॉट भी'], ar: ['مبتدئ: بطيء، يدافع غالبًا', 'مبتدئ: يرد الضربة', 'متوسط: يصوّب ويدافع بسرعة', 'خبير: يستخدم الجدران أيضًا'],
  };
  const WHO = { ja: ['はじめて', 'ルールを覚えた人', '慣れた人', '強い人'], en: ['First game', 'Knows the rules', 'Regular player', 'Strong player'] };
  const li = l => Math.max(0, LG.indexOf(l)), tr = (k, l) => { const a = S[k]; return a ? (a[li(l)] || a[1]) : k; };
  const modeName = (m, l) => ((M[m] || M.classic)[li(l)] || M[m][1]);
  function levelInfo(n, lang) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return { name: 'Lv.' + n, desc: (LVD[lang] || LVD.en)[b], who: (WHO[lang] || WHO.en)[b] }; }
  const SIZES = [5, 7, 10];
  const sizeName = (z, l) => tr('first', l).replace('{n}', z);
  const sizeLabel = l => tr('len', l);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- sounds (WebAudio, the portal's sound switch) ---------- */
  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f, q) => { const n = a.createBufferSource(), b = a.createBuffer(1, Math.max(1, a.sampleRate * dur | 0), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q || 1; const g = a.createGain(); g.gain.value = vol; n.connect(bp); bp.connect(g); g.connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    let last = {};
    const lim = (k, ms) => { const now = performance.now(); if (now - (last[k] || 0) < ms) return false; last[k] = now; return true; };
    return {
      hit: v => { if (lim('hit', 30)) at((a, t) => { const k = Math.min(1, v / 300); noise(a, t, .02, .15 + k * .45, 2600 + k * 1800, 2.5); tone(a, t, 520 + k * 300, 260, .05, .05 + k * .06, 'triangle'); }); },
      edge: () => at((a, t) => { noise(a, t, .03, .5, 4200, 3); tone(a, t, 900, 1800, .12, .1, 'square'); tone(a, t + .05, 1400, 2400, .1, .06, 'triangle'); }),
      wall: v => { if (lim('wall', 40)) at((a, t) => { const k = Math.min(1, v / 300); noise(a, t, .03, .08 + k * .2, 900, 1.3); tone(a, t, 180, 110, .06, .04 + k * .05); }); },
      goal: () => at((a, t) => { noise(a, t, .08, .3, 700, 1); [523, 659, 784, 1047].forEach((f, i) => tone(a, t + .08 + i * .08, f, 0, .22, .09, 'triangle')); }),
      lose: () => at((a, t) => { [392, 330, 262].forEach((f, i) => tone(a, t + i * .1, f, 0, .2, .08, 'triangle')); }),
      boing: () => { if (lim('boing', 60)) at((a, t) => { tone(a, t, 300, 900, .14, .09, 'sine'); }); },
      pick: () => at((a, t) => { [880, 1175, 1568].forEach((f, i) => tone(a, t + i * .05, f, 0, .12, .08, 'triangle')); }),
      warp: () => at((a, t) => { tone(a, t, 200, 1600, .22, .08, 'sawtooth'); }),
      beep: hi => at((a, t) => { tone(a, t, hi ? 1320 : 660, 0, hi ? .3 : .14, .1, 'square'); }),
      click: () => at((a, t) => { noise(a, t, .015, .2, 3000, 2); }),
    };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, E = window.HockeyEngine, D = E.DIM, lang = ctx.lang;
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6)), target = SIZES.includes(+ctx.size) ? +ctx.size : 7;
    const board = T3.MODELS.hockey(true); T3.show('hockey', board);
    const U = board.userData, Y = U.top, K = U.K, TH = window.THREE;
    const port = () => innerHeight > innerWidth * 1.05;
    const sideways = () => pvp && !port();   // two players on a wide screen: the table across the screen, red on the left
    const fitNow = () => {
      if (!T3.fit) return;
      if (sideways()) { if (T3.turn) T3.turn(-Math.PI / 2); T3.fit({ w: U.OL * K + .4, d: U.OW * K + .6, y: Y, pitch: 1.18 }); }
      else { if (T3.turn) T3.turn(null); T3.fit(port() ? { w: U.OW * K + .3, d: U.OL * K * .92, y: Y, pitch: 1.05 } : { w: U.OW * K + .6, d: U.OL * K + .4, y: Y, pitch: .98 }); }
    };
    fitNow();
    const onResize = () => fitNow(); addEventListener('resize', onResize);
    const kick = ms => { if (T3.kick) T3.kick(ms); };
    let s = null, mode = null, stopped = false, over = false, phase = 'menu', raf = 0, last = 0, cdT = 0, paused = false;
    const timers = []; const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const names = pvp ? [tr('p1', lang), tr('p2', lang)] : [tr('you', lang), tr('ai', lang)];

    /* ---------- CSS (HUD, menu, toasts) ---------- */
    const css = document.createElement('style');
    css.textContent = `.hud .hkp{display:inline-flex;align-items:center;gap:7px;padding:4px 12px;border-radius:99px;font-weight:900;font-size:14px;white-space:nowrap}.hud .hkp i{width:15px;height:15px;border-radius:50%;display:inline-block;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.25)}.hud .hkp b{font-size:20px;min-width:1ch;text-align:center}
.hud .hkm{display:flex;flex-direction:column;align-items:center;font-weight:800;font-size:12px;line-height:1.25;opacity:.8;white-space:nowrap}
.hkmenu{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.55);padding:14px;-webkit-user-select:none;user-select:none}
.hkmenu-c{background:#fffdf7;border-radius:26px;box-shadow:0 0 0 4px #2f6fd0,0 18px 50px rgba(0,0,0,.45);padding:18px 18px 16px;width:min(620px,100%);max-height:100%;overflow:auto;color:#1d2133}
.hkmenu h2{margin:2px 0 14px;text-align:center;font-size:22px;font-weight:900;color:#2f6fd0}
.hkmodes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hkmodes button{display:flex;align-items:center;gap:10px;text-align:left;border:2px solid #e6dcc6;border-radius:16px;background:#fff;padding:10px 12px;font:inherit;cursor:pointer;color:inherit;box-shadow:0 3px 0 #e6dcc6;transition:transform .12s}
.hkmodes button:hover{transform:translateY(-2px)}.hkmodes button[aria-pressed=true]{border-color:#2f6fd0;box-shadow:0 3px 0 #2f6fd0;background:#eef5ff}
.hkmodes .ic{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:24px;background:#f2ecdf}.hkmodes button[aria-pressed=true] .ic{background:#d6e6ff}
.hkmodes b{display:block;font-size:15px;font-weight:900}.hkmodes small{display:block;font-size:12px;font-weight:700;color:#5b6074;line-height:1.35;margin-top:2px}
.hkmenu .go{display:block;width:100%;margin-top:14px;padding:13px;border:0;border-radius:99px;background:#ff5d5d;color:#fff;font:inherit;font-size:19px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #c94040}
.hkmenu .how{margin:12px 2px 0;padding:10px 12px;border-radius:14px;background:#f4efe3;font-size:12.5px;font-weight:700;color:#4a4f63;line-height:1.5}

.hkmenu .sel{display:none;margin:10px 2px 0;font-size:13px;font-weight:800;color:#2f6fd0;text-align:center;min-height:2.6em}
@media (max-width:560px){.hkmenu-c{padding:14px 12px 12px}.hkmodes{gap:6px}.hkmodes button{padding:7px 8px;gap:7px}.hkmodes .ic{width:32px;height:32px;font-size:18px;border-radius:10px}.hkmodes b{font-size:13.5px}.hkmodes small{display:none}.hkmenu h2{font-size:19px;margin-bottom:10px}.hkmenu .sel{display:block}.hkmenu .how{font-size:11.5px;padding:8px 10px}}
.hkmenu .go{position:sticky;bottom:0}
.hktoast{position:fixed;left:50%;top:calc(80px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;padding:9px 20px;border-radius:99px;background:#fff;color:#1d2133;font-weight:900;font-size:16px;box-shadow:0 0 0 2.5px #2f6fd0,0 8px 20px rgba(0,0,0,.3);pointer-events:none;white-space:nowrap;-webkit-user-select:none;user-select:none}
.hkbig{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:90;font-weight:900;font-size:min(16vw,92px);color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.25),0 0 24px rgba(255,255,255,.6);pointer-events:none;animation:hkPop .6s cubic-bezier(.2,1.6,.4,1);-webkit-user-select:none;user-select:none;white-space:nowrap}
.hkbig.g{color:#ffd23a;-webkit-text-stroke:2px #b5651d}@keyframes hkPop{from{transform:translate(-50%,-50%) scale(.3);opacity:0}}
.hkfx{position:fixed;z-index:80;pointer-events:none;font-weight:900;font-size:15px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35),0 0 10px rgba(255,120,40,.9);transform:translate(-50%,-50%);animation:hkUp .8s ease-out forwards;white-space:nowrap;-webkit-user-select:none;user-select:none}@keyframes hkUp{to{transform:translate(-50%,-180%);opacity:0}}`;
    document.head.appendChild(css);
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'hktoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 1600); }
    function big(m, cls, ms) { const el = document.createElement('div'); el.className = 'hkbig' + (cls ? ' ' + cls : ''); el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), ms || 800); }
    function fxAt(x, y, m) { if (!T3.project) return; const [a, b] = U.xz(x, y), p = T3.project(a, b, Y); const el = document.createElement('div'); el.className = 'hkfx'; el.textContent = m; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 850); }

    /* ---------- HUD ---------- */
    const pill = p => `<span class="hkp"><i style="background:${U.dot(p)}"></i><span>${esc(names[p])}</span><b>${s ? s.score[p] : 0}</b></span>`;
    function hud() { if (stopped) return; const sw = sideways(); ctx.hud(pill(sw ? 0 : 1) + `<span class="hkm"><span>${esc(mode ? modeName(mode, lang)[0] : '')}</span><span>${esc(tr('to', lang).replace('{n}', target))}</span></span>` + pill(sw ? 1 : 0)); }
    hud();

    /* ---------- meshes ---------- */
    const mal = [U.mallet(0), U.mallet(1)]; mal.forEach(m => board.add(m));
    const pk = new Map();   // puck id → mesh
    let extra = [];         // the mode's own pieces
    const monM = [], itemM = new Map(); let barM = null, shieldM = [null, null];
    const put = (g, x, y, h) => { const [a, b] = U.xz(x, y); g.position.set(a, Y + (h || 0), b); };
    function setupMode() {
      extra.forEach(g => board.remove(g)); extra = []; monM.length = 0; barM = null;
      if (E.has(s, 'block')) { barM = U.bar(); put(barM, 0, 0); board.add(barM); extra.push(barM); }
      s.mons.forEach((m, i) => { const g = U.monster(i); board.add(g); monM.push(g); extra.push(g); });
      if (s.mode === 'bumper') E.BUMPERS.forEach(([x, y]) => { const g = U.bumper(); put(g, x, y); board.add(g); extra.push(g); });
      if (s.mode === 'warp') E.PORTAL.forEach(([x, y], k) => { const g = U.portal(k); put(g, x, y); board.add(g); extra.push(g); });
      for (const side of [0, 1]) { const g = U.shield(); put(g, 0, (side === 0 ? 1 : -1) * (D.L / 2 - .4)); g.visible = false; board.add(g); extra.push(g); shieldM[side] = g; }
    }
    function sync(now) {
      for (let i = 0; i < 2; i++) { const m = s.mal[i], g = mal[i]; put(g, m.x, m.y); const sc = m.r / D.RM; g.scale.set(sc, 1, sc); }
      const seen = new Set();
      for (const p of s.pucks) { let g = pk.get(p.id); if (!g) { g = U.puck(); board.add(g); pk.set(p.id, g); } seen.add(p.id); put(g, p.x, p.y); g.visible = !(p.wait > .45); const f = p.fire > 0; g.children[0].scale.set(f ? 1.06 : 1, 1, f ? 1.06 : 1); }
      for (const [id, g] of pk) if (!seen.has(id)) { board.remove(g); pk.delete(id); }
      s.mons.forEach((m, i) => { const g = monM[i]; if (!g) return; put(g, m.x, m.y); g.rotation.y = Math.atan2(m.vx, m.vy); const b = g.userData.body; b.scale.y = .8 + Math.sin(now / 120 + i) * .06; });
      if (barM) barM.rotation.y = -s.bar;
      const ids = new Set();
      s.items.forEach(it => { const key = it.k + ':' + it.x.toFixed(2) + ':' + it.y.toFixed(2); ids.add(key); let g = itemM.get(key); if (!g) { g = U.item(it.k); board.add(g); itemM.set(key, g); } put(g, it.x, it.y, Math.sin(now / 300) * .03); g.userData.coin.rotation.y = now / 500; g.visible = !(it.t > 10.5 && Math.floor(now / 120) % 2); });
      for (const [k, g] of itemM) if (!ids.has(k)) { board.remove(g); itemM.delete(k); }
      for (const side of [0, 1]) if (shieldM[side]) shieldM[side].visible = s.shield[side] > 0;
    }

    /* ---------- input ---------- */
    const toCm = e => { const q = T3.pick(e, Y + .03); return q ? { x: q.x / K, y: q.z / K } : null; };
    const tgt = [null, null];
    const ptr = new Map();   // pointerId → side
    const touchLead = 4.5;   // cm: on touch the mallet sits a little ahead of the finger (toward the far goal)
    function sideOf(q) { return !pvp ? 0 : q.y > 0 ? 0 : 1; }
    function onDown(e) {
      if (phase !== 'play') { if (paused) resume(); return; }
      const q = toCm(e); if (!q) return; const side = sideOf(q); if (!pvp && side !== 0) return;
      ptr.set(e.pointerId, side); try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      onMove(e); if (e.pointerType !== 'mouse') e.preventDefault();
    }
    function onMove(e) {
      if (phase !== 'play') return;
      const q = toCm(e); if (!q) return;
      let side = ptr.get(e.pointerId);
      if (side == null) { if (e.pointerType !== 'mouse') return; side = 0; }   // the mouse plays the near / left player by hovering
      const lead = e.pointerType === 'touch' ? (side === 0 ? -touchLead : touchLead) : 0;
      tgt[side] = { tx: q.x, ty: q.y + lead }; src[side] = 'ptr';
    }
    function onUp(e) { ptr.delete(e.pointerId); }
    ctx.el.addEventListener('pointerdown', onDown); ctx.el.addEventListener('pointermove', onMove); addEventListener('pointerup', onUp, true); addEventListener('pointercancel', onUp, true);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';
    const keys = new Set(), keyUsed = [false, false], src = ['', ''];
    const KEYMAP = pvp ? { KeyW: [0, 0, -1], KeyS: [0, 0, 1], KeyA: [0, -1, 0], KeyD: [0, 1, 0], ArrowUp: [1, 0, -1], ArrowDown: [1, 0, 1], ArrowLeft: [1, -1, 0], ArrowRight: [1, 1, 0] }
      : { KeyW: [0, 0, -1], KeyS: [0, 0, 1], KeyA: [0, -1, 0], KeyD: [0, 1, 0], ArrowUp: [0, 0, -1], ArrowDown: [0, 0, 1], ArrowLeft: [0, -1, 0], ArrowRight: [0, 1, 0] };
    const onKey = e => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (KEYMAP[e.code]) { if (e.type === 'keydown') keys.add(e.code); else keys.delete(e.code); e.preventDefault(); return; }
      if (e.type === 'keydown' && (e.code === 'KeyP' || e.code === 'Escape') && phase === 'play') { paused ? resume() : pause(); }
    };
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);
    // the screen's directions → field directions (sideways: screen right = field −y for … see fitNow's turn)
    // screen directions → field directions (the sideways table is turned a quarter: SW = the turn's sign, set by a test)
    const SW = 1;
    function scr2field(dx, dy) { return sideways() ? [SW * dy, -SW * dx] : [dx, dy]; }
    function axes(dt) {
      const sp = 60;   // (the target leads the mallet by sp·dt·6 cm: about 360 cm/s at full deflection)
      const vel = [[0, 0], [0, 0]];
      keys.forEach(c => { const [side, dx, dy] = KEYMAP[c]; vel[side][0] += dx; vel[side][1] += dy; });
      let pads = []; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); } catch (e) {}
      pads.forEach((gp, i) => {
        const side = pvp ? (pads.length === 1 ? 1 : i % 2) : 0;
        let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; const dz = .16; if (Math.hypot(ax, ay) < dz) { ax = 0; ay = 0; }
        const b = gp.buttons || []; if (b[14] && b[14].pressed) ax = -1; if (b[15] && b[15].pressed) ax = 1; if (b[12] && b[12].pressed) ay = -1; if (b[13] && b[13].pressed) ay = 1;
        if (ax || ay) { vel[side][0] += ax; vel[side][1] += ay; }
      });
      for (let side = 0; side < 2; side++) {
        const [vx, vy] = vel[side]; if (!vx && !vy) continue;
        keyUsed[side] = true; src[side] = 'key';
        const m = s.mal[side], [fx, fy] = scr2field(vx, vy), l = Math.max(1, Math.hypot(fx, fy)), k = sp * dt * 6;
        tgt[side] = { tx: m.x + fx / l * k, ty: m.y + fy / l * k };
      }
    }
    // the mode menu with a gamepad: stick / d-pad to choose, A (or Start) to begin
    let padHeld = true, padNav = 0, padRaf = 0;
    function padMenu() {
      if (stopped || phase !== 'menu' || !menuEl) return;
      padRaf = requestAnimationFrame(padMenu);
      let pads = []; try { pads = [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean); } catch (e) { return; }
      let ax = 0, ay = 0, go = false;
      pads.forEach(gp => { const b = gp.buttons || []; let x = gp.axes[0] || 0, y = gp.axes[1] || 0; if (b[14] && b[14].pressed) x = -1; if (b[15] && b[15].pressed) x = 1; if (b[12] && b[12].pressed) y = -1; if (b[13] && b[13].pressed) y = 1; if (Math.abs(x) > Math.abs(ax)) ax = x; if (Math.abs(y) > Math.abs(ay)) ay = y; if ((b[0] && b[0].pressed) || (b[9] && b[9].pressed)) go = true; });
      if (!go) padHeld = false; else if (!padHeld) { padHeld = true; begin(); return; }
      if ((Math.abs(ay) > .6 || Math.abs(ax) > .6) && performance.now() - padNav > 220) { padNav = performance.now(); const i0 = E.MODES.indexOf(menuSel), n = E.MODES.length, d = Math.abs(ay) > .6 ? (ay > 0 ? 2 : -2) : (ax > 0 ? 1 : -1); pickMode(E.MODES[(i0 + d + n) % n]); }
    }

    /* ---------- the mode menu ---------- */
    let menuEl = null, menuSel = (() => { try { const v = localStorage.getItem('atlas-hockey-mode'); return E.MODES.includes(v) ? v : 'classic'; } catch (e) { return 'classic'; } })();
    let howOff = false; try { howOff = localStorage.getItem('atlas-hockey-howto') === 'off'; } catch (e) {}
    function pickMode(m) { menuSel = m; if (menuEl) { menuEl.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); const d = menuEl.querySelector('.sel'); if (d) d.textContent = modeName(m, lang)[1]; } SND.click(); }
    function showMenu() {
      phase = 'menu';
      const el = document.createElement('div'); el.className = 'hkmenu'; menuEl = el;
      const how = howOff ? '' : `<div class="how">${(HOW[lang] || HOW.en).map(esc).join('<br>')}<label style="display:flex;gap:6px;align-items:center;margin-top:6px;cursor:pointer"><input type="checkbox" id="hkNever"> ${esc((HOWK.never[li(lang)]) || HOWK.never[1])}</label></div>`;
      el.innerHTML = `<div class="hkmenu-c" role="dialog" aria-label="${esc(tr('pick', lang))}"><h2>${esc(tr('pick', lang))}</h2><div class="hkmodes">${E.MODES.map(m => { const [n, d] = modeName(m, lang); return `<button type="button" data-m="${m}" aria-pressed="${m === menuSel}"><span class="ic">${ICON[m]}</span><span><b>${esc(n)}</b><small>${esc(d)}</small></span></button>`; }).join('')}</div><div class="sel">${esc(modeName(menuSel, lang)[1])}</div>${how}<button type="button" class="go">${esc(tr('play', lang))} ▶</button></div>`;
      document.body.appendChild(el);
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => pickMode(b.dataset.m); b.ondblclick = () => { pickMode(b.dataset.m); begin(); }; });
      el.querySelector('.go').onclick = begin;
      padHeld = true; padRaf = requestAnimationFrame(padMenu);
    }
    function begin() {
      if (!menuEl) return;
      const nv = menuEl.querySelector('#hkNever'); if (nv && nv.checked) { howOff = true; try { localStorage.setItem('atlas-hockey-howto', 'off'); } catch (e) {} }
      menuEl.remove(); menuEl = null; mode = menuSel; try { localStorage.setItem('atlas-hockey-mode', mode); } catch (e) {}
      s = E.newMatch({ mode, target, first: 0 }); setupMode(); hud(); sync(performance.now()); kick(300);
      phase = 'count'; let n = 3;
      const tick = () => { if (stopped) return; if (n > 0) { big(String(n)); SND.beep(false); n--; later(tick, 600); } else { big('GO!', 'g', 600); SND.beep(true); phase = 'play'; last = performance.now(); loop(last); } };
      tick();
    }
    showMenu();

    /* ---------- AI ---------- */
    const mem = {};
    /* ---------- the loop ---------- */
    function pause() { if (phase !== 'play' || paused) return; paused = true; toast(tr('paused', lang)); }
    function resume() { if (!paused) return; paused = false; last = performance.now(); if (toastEl) toastEl.remove(); }
    const onVis = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVis); addEventListener('blur', onVis);
    function loop(now) {
      if (stopped || over) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(.034, Math.max(0, (now - last) / 1000)); last = now;
      if (paused || document.hidden) return;
      axes(dt);
      const inp = [tgt[0], pvp ? tgt[1] : E.aiTarget(s, 1, level, mem, dt)];
      E.step(s, dt, inp);
      for (const e of s.ev) onEvent(e);
      sync(now); kick(120);
      if (s.over >= 0) end();
    }
    function onEvent(e) {
      if (e.k === 'hit') SND.hit(e.v);
      else if (e.k === 'edge') { SND.edge(); fxAt(e.x, e.y, tr('edge', lang)); }
      else if (e.k === 'wall' || e.k === 'shield') SND.wall(e.v || 100);
      else if (e.k === 'block' || e.k === 'bumper' || e.k === 'monster') SND.boing();
      else if (e.k === 'warp') SND.warp();
      else if (e.k === 'goal') { const mine = pvp || e.side === 0; (mine ? SND.goal : SND.lose)(); big(tr('goal', lang), 'g', 900); hud(); }
      else if (e.k === 'pick') { SND.pick(); toast(tr('it.' + e.what, lang).replace('{p}', names[e.side])); }
    }
    function end() {
      over = true; phase = 'over'; cancelAnimationFrame(raf);
      const w = s.over, score = `${s.score[0]} − ${s.score[1]}`;
      hud();
      later(() => ctx.onEnd(pvp ? { win: false, draw: false, level, score, pvp: true, winnerText: tr('win', lang).replace('{p}', names[w]) } : { win: w === 0, draw: false, level, score }), 700);
    }

    const api = {
      human: 0,
      canUndo: () => false, undo() {},
      canHint: () => false, hint() { return Promise.resolve(false); },
      canResign: () => !stopped && !over,
      resign() { if (over) return; over = true; cancelAnimationFrame(raf); if (menuEl) { menuEl.remove(); menuEl = null; } const sc = s ? `${s.score[0]} − ${s.score[1]}` : '0 − 0'; ctx.onEnd(pvp ? { win: false, draw: false, level, score: sc, pvp: true, winnerText: tr('win', lang).replace('{p}', names[1]) } : { win: false, draw: false, level, score: sc }); },
      timeout() {},
      stop() {
        stopped = true; cancelAnimationFrame(raf); cancelAnimationFrame(padRaf); timers.forEach(clearTimeout);
        ctx.el.removeEventListener('pointerdown', onDown); ctx.el.removeEventListener('pointermove', onMove); removeEventListener('pointerup', onUp, true); removeEventListener('pointercancel', onUp, true);
        removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); removeEventListener('blur', onVis);
        ctx.el.style.touchAction = prevTouch; css.remove(); if (toastEl) toastEl.remove(); if (menuEl) menuEl.remove(); document.querySelectorAll('.hkbig,.hkfx').forEach(e => e.remove());
        if (T3.turn) T3.turn(null);
      },
      _debug: { st: () => s, phase: () => phase, begin: m => { if (m) pickMode(m); begin(); }, at: (x, y) => { const [a, b] = U.xz(x, y); return T3.project(a, b, Y); } },
    };
    window.__hockeyTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.hockey = { levels: 20, sides: false, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 7, sizeLabel, sizeName, levelInfo, start, MODE_TXT: M, ICON, modeName, SND };
})();
