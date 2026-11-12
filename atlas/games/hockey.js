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
    len: ['何点先取', 'Goals to win', '先得分数', '先得分數', '선취 점수', 'Goles para ganar', 'Buts pour gagner', 'Gols para vencer', 'Tore zum Sieg', 'Голов до победы', 'Kazanmak için gol', 'Gol untuk menang', 'जीत के लिए गोल', 'أهداف للفوز'],
    npt: ['{n}点', '{n}', '{n}分', '{n}分', '{n}점', '{n}', '{n}', '{n}', '{n}', '{n}', '{n}', '{n}', '{n}', '{n}'],
    first: ['{n}点先取', 'First to {n}', '先得{n}分', '先得{n}分', '{n}점 선취', 'A {n} goles', 'En {n} buts', 'Até {n} gols', 'Bis {n} Tore', 'До {n} голов', '{n} gole kadar', 'Sampai {n} gol', '{n} गोल तक', 'حتى {n} أهداف'],
    pickB: ['盤を選ぶ', 'Choose a board', '选择台面', '選擇台面', '보드 선택', 'Elige un tablero', 'Choisis un plateau', 'Escolha um tabuleiro', 'Brett wählen', 'Выбери поле', 'Masa seç', 'Pilih papan', 'बोर्ड चुनें', 'اختر اللوحة'],
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
    'it.worm': ['{p}がワームホールを広げた！', '{p} widened the wormholes!', '{p}扩大了虫洞！', '{p}擴大了蟲洞！', '{p}이(가) 웜홀을 넓혔다!', '¡{p} agrandó los agujeros de gusano!', '{p} élargit les trous de ver !', '{p} alargou os buracos de minhoca!', '{p} vergrößert die Wurmlöcher!', '{p} расширил червоточины!', '{p} solucan deliklerini büyüttü!', '{p} memperbesar lubang cacing!', '{p} ने वर्महोल बड़े किए!', '{p} وسّع الثقوب الدودية!'],
    paused: ['一時停止中（クリックで再開）', 'Paused (click to resume)', '已暂停（点击继续）', '已暫停（點擊繼續）', '일시 정지 (클릭하면 재개)', 'En pausa (clic para seguir)', 'En pause (clic pour reprendre)', 'Pausado (clique para continuar)', 'Pause (Klick zum Weiterspielen)', 'Пауза (нажми, чтобы продолжить)', 'Duraklatıldı (devam için tıkla)', 'Dijeda (klik untuk lanjut)', 'रुका (जारी रखने के लिए क्लिक)', 'متوقف (انقر للمتابعة)'],
  };
  // (2026-11-10) the boards: each one plays differently (hockey/engine.js BOARDS) — [name, one line], in LG order
  const BT = {
    classic: [['クラシック', '特別なルールなし。腕だけで勝負'], ['Classic', 'No tricks: skill only'], ['经典', '没有特殊规则，只拼技术'], ['經典', '沒有特殊規則，只拼技術'], ['클래식', '특수 규칙 없이 실력 승부'], ['Clásico', 'Sin trucos: solo habilidad'], ['Classique', 'Sans gadget : que du talent'], ['Clássico', 'Sem truques: só habilidade'], ['Klassisch', 'Keine Tricks, nur Können'], ['Классика', 'Без хитростей — только умение'], ['Klasik', 'Hile yok, sadece beceri'], ['Klasik', 'Tanpa trik, murni keterampilan'], ['क्लासिक', 'कोई चाल नहीं, सिर्फ़ हुनर'], ['كلاسيك', 'بلا حيل: المهارة فقط']],
    air: [['エアホッケー', '空気でパックがすべる。止まりにくく、よく跳ねる'], ['Air hockey', 'The puck glides on air: it hardly slows and bounces well'], ['气垫球', '冰球在气垫上滑行，不易停下，反弹有力'], ['氣墊球', '冰球在氣墊上滑行，不易停下，反彈有力'], ['에어하키', '공기 위를 미끄러지는 퍽. 잘 멈추지 않고 잘 튄다'], ['Air hockey', 'El disco se desliza sobre aire: casi no frena'], ['Air-hockey', 'Le palet glisse sur l’air : il ralentit à peine'], ['Air hockey', 'O disco desliza no ar: quase não desacelera'], ['Airhockey', 'Der Puck gleitet auf Luft und wird kaum langsamer'], ['Аэрохоккей', 'Шайба скользит на воздухе и почти не тормозит'], ['Hava hokeyi', 'Pul havada kayar: zor yavaşlar, iyi seker'], ['Air hockey', 'Keping meluncur di atas udara, nyaris tak melambat'], ['एयर हॉकी', 'पक हवा पर फिसलता है: मुश्किल से धीमा होता है'], ['هوكي الهواء', 'القرص ينزلق على الهواء ولا يكاد يتباطأ']],
    neon: [['ネオン', 'モンスターがうろつき、アイテムが出るゲーミング盤'], ['Neon', 'A gaming board: monsters roam and items pop up'], ['霓虹', '电竞台面：怪物游荡，道具出现'], ['霓虹', '電競台面：怪物遊蕩，道具出現'], ['네온', '몬스터가 돌아다니고 아이템이 나오는 게이밍 보드'], ['Neón', 'Tablero gamer: monstruos y objetos'], ['Néon', 'Plateau gaming : monstres et objets'], ['Neon', 'Tabuleiro gamer: monstros e itens'], ['Neon', 'Gaming-Brett: Monster und Items'], ['Неон', 'Игровое поле: монстры и предметы'], ['Neon', 'Oyuncu masası: canavarlar ve eşyalar'], ['Neon', 'Papan gaming: monster dan item'], ['नियॉन', 'गेमिंग बोर्ड: राक्षस घूमते हैं, आइटम आते हैं'], ['نيون', 'لوحة ألعاب: وحوش تتجول وأدوات تظهر']],
    pinball: [['ピンボール', '4つのバンパーがパックを強くはじき返す'], ['Pinball', 'Four bumpers kick the puck back hard'], ['弹珠台', '四个弹簧柱把冰球用力弹回'], ['彈珠台', '四個彈簧柱把冰球用力彈回'], ['핀볼', '범퍼 4개가 퍽을 세게 튕겨 낸다'], ['Pinball', 'Cuatro rebotadores devuelven el disco con fuerza'], ['Flipper', 'Quatre bumpers renvoient le palet avec force'], ['Pinball', 'Quatro bumpers rebatem o disco com força'], ['Flipper', 'Vier Bumper schlagen den Puck kräftig zurück'], ['Пинбол', 'Четыре отбойника сильно отбивают шайбу'], ['Pinball', 'Dört tampon pulu sertçe geri sektirir'], ['Pinball', 'Empat bumper memantulkan keping dengan keras'], ['पिनबॉल', 'चार बंपर पक को ज़ोर से लौटाते हैं'], ['بينبول', 'أربعة مصدات ترد القرص بقوة']],
    gear: [['からくり工房', 'からくり仕掛けのバーが回りながら左右にゆっくり動く'], ['Clockwork', 'A clockwork bar turns and slowly drifts side to side'], ['机关工坊', '机关横杆一边旋转一边缓缓左右移动'], ['機關工坊', '機關橫桿一邊旋轉一邊緩緩左右移動'], ['태엽 공방', '태엽 막대가 돌면서 좌우로 천천히 움직인다'], ['Engranajes', 'Una barra de engranajes gira y se desplaza despacio de lado a lado'], ['Engrenages', 'Une barre à engrenages tourne et glisse lentement de gauche à droite'], ['Engrenagens', 'Uma barra de engrenagens gira e desliza devagar de um lado ao outro'], ['Uhrwerk', 'Ein Zahnrad-Balken dreht sich und wandert langsam hin und her'], ['Механизм', 'Шестерёнчатая планка вращается и медленно ходит из стороны в сторону'], ['Çark', 'Çarklı çubuk döner ve yavaşça sağa sola kayar'], ['Roda gigi', 'Palang roda gigi berputar sambil bergeser pelan ke kiri-kanan'], ['घड़ी-कारखाना', 'घड़ी-जैसी छड़ घूमती है और धीरे-धीरे दाएँ-बाएँ चलती है'], ['التروس', 'عارضة تروس تدور وتنزلق ببطء يمينًا ويسارًا']],
    space: [['スペース', '無重力ですべるパック。ワープホールと、それを広げるアイテム'], ['Space', 'Zero gravity: the puck glides. Warp holes, and items that make them grow'], ['太空', '失重中冰球滑行。有虫洞，还有让虫洞变大的道具'], ['太空', '失重中冰球滑行。有蟲洞，還有讓蟲洞變大的道具'], ['스페이스', '무중력이라 퍽이 미끄러진다. 워프홀과 그것을 키우는 아이템'], ['Espacio', 'Sin gravedad: el disco se desliza. Agujeros de warp y objetos que los agrandan'], ['Espace', 'Apesanteur : le palet glisse. Des trous de distorsion et des objets qui les agrandissent'], ['Espaço', 'Gravidade zero: o disco desliza. Buracos de dobra e itens que os aumentam'], ['Weltraum', 'Schwerelos: der Puck gleitet. Warp-Löcher und Items, die sie vergrößern'], ['Космос', 'Невесомость: шайба скользит. Варп-дыры и предметы, что их расширяют'], ['Uzay', 'Yerçekimsiz: pul kayar. Solucan delikleri ve onları büyüten eşyalar'], ['Luar angkasa', 'Tanpa gravitasi: keping meluncur. Lubang warp dan item yang membesarkannya'], ['अंतरिक्ष', 'शून्य गुरुत्व: पक फिसलता है। वार्प-छेद और उन्हें बड़ा करने वाले आइटम'], ['الفضاء', 'انعدام الجاذبية: القرص ينزلق. ثقوب التواء وأدوات تكبّرها']],
  };
  const boardTxt = (b, l) => (BT[b] || BT.classic)[li(l)] || (BT[b] || BT.classic)[1];
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
  const sizeName = (z, l) => tr('npt', l).replace('{n}', z);
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
    // the touchpad note on the controls card (PCs): a heading line, then how — like carrom / crokinole
    const PADT = [['ノートPCのタッチパッドなら：', '指をすべらせるだけでパッドが動く（クリック不要）'], ['On a laptop touchpad:', 'just glide a finger and the mallet follows (no clicking)'], ['笔记本触控板：', '手指滑动即可移动球拍（不用点击）'], ['筆電觸控板：', '手指滑動即可移動球拍（不用點擊）'], ['노트북 터치패드라면:', '손가락을 미끄러뜨리기만 하면 패드가 움직인다 (클릭 불필요)'], ['Con el panel táctil del portátil:', 'desliza el dedo y el mazo te sigue (sin clic)'], ['Sur le pavé tactile d’un portable :', 'glisse le doigt, le maillet suit (sans clic)'], ['No touchpad do notebook:', 'deslize o dedo e o batedor acompanha (sem clicar)'], ['Mit dem Touchpad am Laptop:', 'einfach den Finger gleiten lassen, der Schläger folgt (ohne Klick)'], ['На тачпаде ноутбука:', 'просто веди пальцем — бита следует (без щелчка)'], ['Dizüstü dokunmatik yüzeyde:', 'parmağını kaydır, tokmak takip eder (tıklama yok)'], ['Dengan touchpad laptop:', 'cukup geser jari, pemukul mengikuti (tanpa klik)'], ['लैपटॉप टचपैड पर:', 'बस उँगली फिसलाओ, मैलेट पीछे-पीछे चलेगा (क्लिक नहीं)'], ['على لوحة لمس الحاسوب المحمول:', 'مرّر إصبعك فقط وتتبعه المضرب (بلا نقر)']];
    const BKT = ['もどる', 'Back', '返回', '返回', '돌아가기', 'Volver', 'Retour', 'Voltar', 'Zurück', 'Назад', 'Geri', 'Kembali', 'वापस', 'رجوع'];
    const BL = Object.keys(E.BOARDS), lookNow = () => { const v = T3.BOARDS && T3.BOARDS.hockey ? T3.BOARDS.hockey.get() : 'classic'; return BL.includes(v) ? v : 'classic'; };
    let look = lookNow(), board = T3.MODELS.hockey(true, look); T3.show('hockey', board);
    let modelKids = new Set(board.children);   // (the parts the board model came with: swapped when another board is picked)
    document.documentElement.classList.add('hk-on');
    const barFit = () => { const b = document.getElementById('tbar'); if (b && b.offsetHeight) { const r = b.getBoundingClientRect(); const D = document.documentElement.style; D.setProperty('--hk-bar', Math.round(innerHeight - r.top + 6) + 'px'); D.setProperty('--hk-barb', Math.max(0, Math.round(innerHeight - r.bottom)) + 'px'); D.setProperty('--hk-barh', Math.round(r.height) + 'px'); } };
    setTimeout(barFit, 400); addEventListener('resize', barFit);
    let U = board.userData; const Y = U.top, K = U.K, TH = window.THREE;
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
.hkmodes .ic.th{width:66px;height:46px;padding:0;overflow:hidden;background:#e9dfca}.hkmodes .ic.th img{width:100%;height:100%;object-fit:cover;transform:scale(1.3);display:block}
.hkmodes b{display:block;font-size:15px;font-weight:900}.hkmodes small{display:block;font-size:12px;font-weight:700;color:#5b6074;line-height:1.35;margin-top:2px}
.hkmenu .hkft{display:flex;gap:10px;margin-top:14px}.hkmenu .hkft .go{flex:1;margin-top:0}.hkmenu .bk{flex:1;padding:13px;border:0;border-radius:99px;background:#ece6d8;color:#3a3f52;font:inherit;font-size:17px;font-weight:900;cursor:pointer;box-shadow:0 3px 0 #d4ccb8}
.hkhw{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;background:rgba(10,12,22,.55);padding:16px;-webkit-user-select:none;user-select:none}
.hkhw-c{background:#fff;color:#1d2133;border-radius:24px;box-shadow:0 0 0 4px #2f6fd0,0 18px 50px rgba(0,0,0,.45);padding:22px 22px 18px;width:min(440px,100%);max-height:100%;overflow:auto}
.hkhw h2{margin:0 0 14px;font-size:24px;font-weight:900;text-align:center;color:#2f6fd0}
.hkhw ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.hkhw li{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:800;line-height:1.35}
.hkhw li i{flex:none;width:40px;height:40px;border-radius:50%;background:#e3edfb;color:#2f6fd0;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:20px;font-weight:900}
.hkhw li span{white-space:normal}html .hkhw li{white-space:normal!important}
.hkhw .u{margin:14px 0 0;font-size:14px;font-weight:700;color:#5b6074;text-align:center;line-height:1.7}
.hkhw label{display:flex;align-items:center;justify-content:center;gap:8px;margin:16px 0 14px;font-size:16px;font-weight:800;cursor:pointer}
.hkhw label input{width:20px;height:20px;accent-color:#2f6fd0}
.hkhw button{display:block;width:100%;padding:13px;border:0;border-radius:99px;background:#2f6fd0;color:#fff;font:inherit;font-size:18px;font-weight:900;cursor:pointer}
.hkmenu .go{display:block;width:100%;margin-top:14px;padding:13px;border:0;border-radius:99px;background:#ff5d5d;color:#fff;font:inherit;font-size:19px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 #c94040}
.hkmenu .how{margin:12px 2px 0;padding:10px 12px;border-radius:14px;background:#f4efe3;font-size:12.5px;font-weight:700;color:#4a4f63;line-height:1.5}

.hkmenu .sel{display:none;margin:10px 2px 0;font-size:13px;font-weight:800;color:#2f6fd0;text-align:center;min-height:2.6em}
@media (min-width:900px) and (min-height:600px) and (hover:hover){   /* (2026-11-10) PCs: the board picker uses the width — three big cards with large pictures */
.hkmenu-c{width:min(1120px,82vw);padding:26px 30px 24px;border-radius:30px}.hkmenu h2{font-size:28px;margin-bottom:18px}
.hkmodes{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.hkmodes button{flex-direction:column;align-items:stretch;gap:10px;padding:10px 10px 14px;border-radius:20px}
.hkmodes .ic.th{width:100%;height:auto;aspect-ratio:16/9;border-radius:14px}.hkmodes .ic.th img{transform:scale(1.3)}
.hkmodes b{font-size:20px;padding:0 6px}.hkmodes small{font-size:14px;padding:0 6px;margin-top:4px}
.hkmenu .go{font-size:22px;padding:15px}.hkmenu .hkft{max-width:680px;margin:18px auto 0}.hkmenu .bk{font-size:22px;padding:15px}
}
@media (min-width:900px) and (max-height:820px) and (hover:hover){.hkmodes .ic.th{aspect-ratio:2/1}.hkmodes{gap:12px}.hkmenu h2{margin-bottom:12px}}
@media (max-width:560px){.hkmenu-c{padding:14px 12px 12px}.hkmodes{gap:6px}.hkmodes button{padding:7px 8px;gap:7px}.hkmodes .ic{width:32px;height:32px;font-size:18px;border-radius:10px}.hkmodes b{font-size:13.5px}.hkmodes small{display:none}.hkmenu h2{font-size:19px;margin-bottom:10px}.hkmenu .sel{display:block}.hkmenu .how{font-size:11.5px;padding:8px 10px}}
.hkmenu .go{position:sticky;bottom:0}
.hktoast{position:fixed;left:50%;top:calc(80px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;padding:9px 20px;border-radius:99px;background:#fff;color:#1d2133;font-weight:900;font-size:16px;box-shadow:0 0 0 2.5px #2f6fd0,0 8px 20px rgba(0,0,0,.3);pointer-events:none;white-space:nowrap;-webkit-user-select:none;user-select:none}
.hkbig{position:fixed;left:50%;top:42%;transform:translate(-50%,-50%);z-index:90;font-weight:900;font-size:min(16vw,92px);color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.25),0 0 24px rgba(255,255,255,.6);pointer-events:none;animation:hkPop .6s cubic-bezier(.2,1.6,.4,1);-webkit-user-select:none;user-select:none;white-space:nowrap}
.hkbig.g{color:#ffd23a;-webkit-text-stroke:2px #b5651d}@keyframes hkPop{from{transform:translate(-50%,-50%) scale(.3);opacity:0}}
/* the boss / watcher talk: kept down in the action bar's row, never over the rink (PC: beside the bar; phones (2026-11-11): over the bar itself — the taps still reach its buttons) */
html.hk-on #bv > .npc-float{left:calc(50% + 145px)!important;right:auto!important;width:min(440px,calc(50% - 165px))!important;bottom:calc(14px + env(safe-area-inset-bottom))!important;transform:translateY(10px);gap:8px!important;align-items:center!important}
html.hk-on #bv > .npc-float.on{transform:none}
html.hk-on #bv > .npc-float .npc-pic{width:58px!important;height:58px!important}
html.hk-on #bv > .npc-float .npc-bub{padding:6px 12px 7px!important;border-radius:16px!important;max-height:74px;overflow:hidden}
html.hk-on #bv > .npc-float .npc-bub::before,html.hk-on #bv > .npc-float .npc-bub::after{bottom:auto!important;top:50%;margin-top:-9px}
html.hk-on #bv > .npc-float .npc-nm b{font-size:13px!important}html.hk-on #bv > .npc-float .npc-tag{font-size:10.5px!important}html.hk-on #bv > .npc-float .npc-ttl{display:none}
html.hk-on #bv > .npc-float .npc-tx{font-size:14px!important;line-height:1.4!important;min-height:0!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
@media (max-width:760px){html.hk-on #bv > .npc-float{left:10px!important;right:10px!important;width:auto!important;bottom:var(--hk-barb,14px)!important;min-height:var(--hk-barh,61px);z-index:60!important;pointer-events:none}
html.hk-on #bv > .npc-float .npc-pic{width:46px!important;height:46px!important}html.hk-on #bv > .npc-float .npc-bub{padding:4px 12px 5px!important;max-height:none;min-height:var(--hk-barh,61px);box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;flex:1}html.hk-on #bv > .npc-float .npc-nm{display:flex;margin-bottom:1px}html.hk-on #bv > .npc-float .npc-nm b{font-size:12px!important}html.hk-on #bv > .npc-float .npc-tag{font-size:10px!important}html.hk-on #bv > .npc-float .npc-tx{font-size:12.5px!important;line-height:1.35!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.hkfx{position:fixed;z-index:80;pointer-events:none;font-weight:900;font-size:15px;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35),0 0 10px rgba(255,120,40,.9);transform:translate(-50%,-50%);animation:hkUp .8s ease-out forwards;white-space:nowrap;-webkit-user-select:none;user-select:none}@keyframes hkUp{to{transform:translate(-50%,-180%);opacity:0}}`;
    document.head.appendChild(css);
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'hktoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 1600); }
    function big(m, cls, ms) { const el = document.createElement('div'); el.className = 'hkbig' + (cls ? ' ' + cls : ''); el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), ms || 800); }
    function fxAt(x, y, m) { if (!T3.project) return; const [a, b] = U.xz(x, y), p = T3.project(a, b, Y); const el = document.createElement('div'); el.className = 'hkfx'; el.textContent = m; el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 850); }

    /* ---------- HUD ---------- */
    const pill = p => `<span class="hkp"><i style="background:${U.dot(p)}"></i><span>${esc(names[p])}</span><b>${s ? s.score[p] : 0}</b></span>`;
    function hud() { if (stopped) return; const sw = sideways(); ctx.hud(pill(sw ? 0 : 1) + `<span class="hkm"><span>${esc(boardTxt(look, lang)[0])}</span><span>${esc(tr('to', lang).replace('{n}', target))}</span></span>` + pill(sw ? 1 : 0)); }
    hud();

    /* ---------- meshes ---------- */
    let mal = [U.mallet(0), U.mallet(1)]; mal.forEach(m => board.add(m));
    const pk = new Map();   // puck id → mesh
    let extra = [];         // the mode's own pieces
    const monM = [], itemM = new Map(), portM = []; let barM = null, shieldM = [null, null];
    const put = (g, x, y, h) => { const [a, b] = U.xz(x, y); g.position.set(a, Y + (h || 0), b); };
    // (2026-11-10) before the match (the mode menu) the mallets wait at their own ends — they were both at the centre spot, where
    // the yellow one's ball read as a puck — and a puck sits on the centre spot
    put(mal[0], 0, D.L / 2 - 8); put(mal[1], 0, -(D.L / 2 - 8));
    let prePuck = U.puck(); put(prePuck, 0, 0); board.add(prePuck);
    // (2026-11-10) board effects. Neon: a gaming board — the markings and the rim light cycle through the colours, the puck
    // leaves a glowing trail, every hit sends out a ring of light and a goal flashes the table. Pinball: the rim lights
    // flash when a bumper kicks.
    const fx = (() => {
      let trail = [], rings = [], flash = 0, hist = [], stars = [], shoot = null, shootT = 2;
      const neon = () => look === 'neon';
      function reset() { stars.forEach(m => m.parent && m.parent.remove(m)); stars = []; if (shoot && shoot.parent) shoot.parent.remove(shoot); shoot = null; trail.forEach(m => m.parent && m.parent.remove(m)); rings.forEach(r => r.m.parent && r.m.parent.remove(r.m)); trail = []; rings = []; hist = []; flash = 0; }
      function ensureTrail() {
        if (trail.length || !TH) return;
        for (let i = 0; i < 12; i++) { const m = new TH.Mesh(new TH.CircleGeometry(D.RP * K * (1 - i / 16), 20), new TH.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TH.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; board.add(m); trail.push(m); }
      }
      function ring(x, y, big) {
        if (!TH || !neon()) return;
        const m = new TH.Mesh(new TH.RingGeometry(D.RP * K * .9, D.RP * K * 1.25, 32), new TH.MeshBasicMaterial({ color: new TH.Color().setHSL((performance.now() / 1600) % 1, 1, .6), transparent: true, opacity: .95, blending: TH.AdditiveBlending, depthWrite: false, side: TH.DoubleSide }));
        m.rotation.x = -Math.PI / 2; put(m, x, y, .02); board.add(m); rings.push({ m, t: 0, big: big ? 2.4 : 1 });
      }
      function frame(now, dt) {
        const M = U.mats || {};
        if (neon()) {
          const h = (now / 2600) % 1, c = new TH.Color().setHSL(h, 1, .55);
          if (M.strip) M.strip.emissive.copy(c);
          if (M.field) { const w = new TH.Color(1, 1, 1).lerp(c, .55).multiplyScalar(.8 + flash * 1.2); M.field.emissive.copy(w); }
          ensureTrail();
          const p = s && s.pucks[0]; if (p && !(p.wait > 0)) { hist.unshift([p.x, p.y, Math.hypot(p.vx, p.vy)]); } else hist.unshift(null); hist.length = Math.min(hist.length, 24);
          trail.forEach((m, i) => { const q = hist[i * 2 + 1]; if (!q || q[2] < 25) { m.material.opacity = 0; return; } put(m, q[0], q[1], .012); m.material.color.setHSL((h + i * .04) % 1, 1, .6); m.material.opacity = .5 * (1 - i / 12) * Math.min(1, q[2] / 90); });
        } else if (look === 'space') {
          // twinkling stars over the field (three layers blinking out of step) and now and then a shooting star
          if (!stars.length && TH) {
            const R = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(4242);
            for (let l = 0; l < 3; l++) {
              const pos = [], n = 46; for (let i = 0; i < n; i++) { const [a, b] = U.xz((R() - .5) * (D.W - 2), (R() - .5) * (D.L - 2)); pos.push(a, Y + .006 + l * .002, b); }
              const gm = new TH.BufferGeometry(); gm.setAttribute('position', new TH.Float32BufferAttribute(pos, 3));
              const pm = new TH.Points(gm, new TH.PointsMaterial({ color: [0xffffff, 0xc9b8ff, 0x9fe8ff][l], size: [.05, .035, .07][l], transparent: true, opacity: .8, blending: TH.AdditiveBlending, depthWrite: false }));
              board.add(pm); stars.push(pm);
            }
          }
          stars.forEach((pm, l) => { pm.material.opacity = .25 + .75 * Math.pow(.5 + .5 * Math.sin(now / (380 + l * 170) + l * 2.1), 2); });
          if (M.strip) M.strip.emissive.setHSL(.72 + Math.sin(now / 1400) * .06, 1, .55);
          if (M.field) M.field.emissive.setScalar(.72 + Math.sin(now / 900) * .06 + flash);
          shootT -= dt;
          if (shootT <= 0 && !shoot && TH) {
            shoot = new TH.Mesh(new TH.PlaneGeometry(D.RP * K * 4, D.RP * K * .25), new TH.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, blending: TH.AdditiveBlending, depthWrite: false }));
            shoot.rotation.x = -Math.PI / 2; const a = Math.random() * Math.PI * 2; shoot.rotation.z = a; shoot.userData = { t: 0, x: (Math.random() - .5) * 20, y: (Math.random() - .5) * 40, dx: Math.cos(a) * 60, dy: -Math.sin(a) * 60 }; board.add(shoot);
          }
          if (shoot) { const u2 = shoot.userData; u2.t += dt; put(shoot, u2.x + u2.dx * u2.t, u2.y + u2.dy * u2.t, .015); shoot.material.opacity = .9 * Math.max(0, 1 - u2.t / .45); if (u2.t > .45) { board.remove(shoot); shoot = null; shootT = 2 + Math.random() * 4; } }
        } else if (look === 'pinball' && M.strip) { M.strip.emissiveIntensity = 1.6 + flash * 3; }
        flash = Math.max(0, flash - dt * 3);
        for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; const k = r.t / .4; r.m.scale.setScalar(1 + k * 2.2 * r.big); r.m.material.opacity = .95 * (1 - k); if (k >= 1) { r.m.parent && r.m.parent.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); } }
      }
      return { reset, frame, ring, flash: v => { flash = Math.max(flash, v || 1); } };
    })();
    // another board picked in the start menu: the table is rebuilt at once (before the match only)
    function setLook(v) {
      if (v === look || s) return; look = v;
      try { if (T3.setBoard) T3.setBoard('hockey', v); else if (T3.BOARDS && T3.BOARDS.hockey) T3.BOARDS.hockey.set(v); } catch (e) {}
      // (the new board's pieces move into the group already on the table: T3.show() would put the camera back to the room view)
      const nb = T3.MODELS.hockey(true, v); modelKids.forEach(c => board.remove(c)); modelKids = new Set(nb.children); [...nb.children].forEach(c => board.add(c)); board.userData = nb.userData; U = board.userData;   // (only the board's own parts: the guides, pieces etc. added since stay)
      mal.forEach(m => board.remove(m)); if (prePuck) board.remove(prePuck);
      mal = [U.mallet(0), U.mallet(1)]; mal.forEach(m => board.add(m)); put(mal[0], 0, D.L / 2 - 8); put(mal[1], 0, -(D.L / 2 - 8));
      prePuck = U.puck(); put(prePuck, 0, 0); board.add(prePuck);
      pk.clear(); fitNow(); kick(500); hud(); fx.reset();
    }
    function setupMode() {
      extra.forEach(g => board.remove(g)); extra = []; monM.length = 0; portM.length = 0; barM = null;
      if (E.has(s, 'block')) { barM = U.bar(); put(barM, 0, 0); board.add(barM); extra.push(barM); }
      s.mons.forEach((m, i) => { const g = U.monster(i); board.add(g); monM.push(g); extra.push(g); });
      if (E.has(s, 'bumper')) E.BUMPERS.forEach(([x, y]) => { const g = U.bumper(); put(g, x, y); board.add(g); extra.push(g); });
      if (E.has(s, 'warp')) E.PORTAL.forEach(([x, y], k) => { const g = U.portal(k); put(g, x, y); board.add(g); extra.push(g); portM.push(g); });
      for (const side of [0, 1]) { const g = U.shield(); put(g, 0, (side === 0 ? 1 : -1) * (D.L / 2 - .4)); g.visible = false; board.add(g); extra.push(g); shieldM[side] = g; }
    }
    let fxLast = 0;
    function sync(now) {
      fx.frame(now, Math.min(.05, Math.max(0, (now - (fxLast || now)) / 1000))); fxLast = now;
      for (let i = 0; i < 2; i++) { const m = s.mal[i], g = mal[i]; put(g, m.x, m.y); const sc = m.r / D.RM; g.scale.set(sc, 1, sc); }
      const seen = new Set();
      if (prePuck.parent) board.remove(prePuck);
      for (const p of s.pucks) { let g = pk.get(p.id); if (!g) { g = U.puck(); board.add(g); pk.set(p.id, g); } seen.add(p.id); put(g, p.x, p.y); g.visible = true; const f = p.fire > 0; g.children[0].scale.set(f ? 1.06 : 1, 1, f ? 1.06 : 1); }
      for (const [id, g] of pk) if (!seen.has(id)) { board.remove(g); pk.delete(id); }
      s.mons.forEach((m, i) => { const g = monM[i]; if (!g) return; put(g, m.x, m.y); g.rotation.y = Math.atan2(m.vx, m.vy); const b = g.userData.body; b.scale.y = .8 + Math.sin(now / 120 + i) * .06; });
      if (barM) { barM.rotation.y = -s.bar; if (s.barMove) put(barM, s.barX || 0, 0); const cg = barM.userData.cogs; if (cg) cg.forEach(c => { c.rotation.y = now / 400; }); }
      // the wormholes grow while the 'worm' item lasts (eased)
      portM.forEach(g => { const want = (s.pr || E.PR) / E.PR, k = g.scale.x + (want - g.scale.x) * .12; g.scale.set(k, 1, k); g.rotation.y = now / 900 * (g === portM[0] ? 1 : -1); });
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
      if (phase !== 'play') { if (paused) { resume(); if (e.pointerType === 'mouse') lock(); } return; }
      if (e.pointerType === 'mouse' && !pvp) { lock(); return; }   // (the mouse steers by its moves alone: a click changes nothing — it takes the pointer back if Esc let it go)
      const q = toCm(e); if (!q) return; const side = sideOf(q); if (!pvp && side !== 0) return;
      ptr.set(e.pointerId, side); try { ctx.el.setPointerCapture(e.pointerId); } catch (er) {}
      onMove(e); if (e.pointerType !== 'mouse') e.preventDefault();
    }
    // (2026-11-12) the mouse / touchpad moves the mallet by how far it moves (relative), anywhere in the window — with the
    // absolute mapping, a pointer that had wandered off the table (below it, over the dock …) left the mallet pinned at the
    // edge until it came back over the field. The move's length is measured on the table's plane (the view's perspective and
    // the sideways table come with it). Touch stays absolute (the mallet under the finger).
    let lastM = null;
    // (2026-11-12) the pointer is locked while a match is on (Pointer Lock): the moves keep coming at the screen's edge too — a
    // touchpad stroke that reached the bottom of the monitor left the mallet unable to go further back. Esc frees it (and pauses).
    const canLock = !pvp && !!ctx.el.requestPointerLock && matchMedia('(hover:hover) and (pointer:fine)').matches;
    const locked = () => document.pointerLockElement === ctx.el;
    const lock = () => { if (!canLock || locked()) return; try { const r = ctx.el.requestPointerLock({ unadjustedMovement: false }); if (r && r.catch) r.catch(() => {}); } catch (e) {} };
    const unlock = () => { if (locked()) try { document.exitPointerLock(); } catch (e) {} };
    const ESCB = { ja: 'Esc：一時停止', en: 'Esc: pause', zh: 'Esc：暂停', 'zh-TW': 'Esc：暫停', ko: 'Esc: 일시 정지', es: 'Esc: pausa', fr: 'Échap : pause', pt: 'Esc: pausa', de: 'Esc: Pause', ru: 'Esc: пауза', tr: 'Esc: duraklat', id: 'Esc: jeda', hi: 'Esc: रोकें', ar: 'Esc: إيقاف مؤقت' };
    let escB = null;
    const escBadge = on => {   // (2026-11-12) beside the portal's × during a match (a mouse): Esc pauses (only this kind of game)
      if (on && !escB) { escB = document.createElement('div'); escB.className = 'hk-escb'; escB.textContent = ESCB[ctx.lang] || ESCB.en;
        escB.style.cssText = 'position:fixed;top:14px;right:70px;z-index:1000;padding:8px 14px;border-radius:99px;background:rgba(255,253,247,.96);border:2px solid #efe3c8;color:#4a5068;font:800 13px/1 system-ui,sans-serif;box-shadow:0 2px 0 #efe3c8;pointer-events:none;white-space:nowrap';
        document.body.appendChild(escB); }
      else if (!on && escB) { escB.remove(); escB = null; }
      if (escB) { const x = document.getElementById('bvClose'), r = x && x.getClientRects().length ? x.getBoundingClientRect() : null;   // (level with the ×, just left of it)
        if (r) { escB.style.top = Math.round(r.top + r.height / 2 - escB.offsetHeight / 2) + 'px'; escB.style.right = Math.round(innerWidth - r.left + 8) + 'px'; } }
    };
    // shown for the whole match with a mouse (not only while the pointer is held: some browsers refuse the lock), gone when paused / over
    const escTimer = setInterval(() => { if (stopped) { clearInterval(escTimer); escBadge(false); return; } escBadge(canLock && phase === 'play' && !paused && !over); }, 250);
    const onLockChange = () => { escBadge(locked()); if (!locked() && phase === 'play' && !paused && !stopped) pause(); lastM = null; };
    document.addEventListener('pointerlockchange', onLockChange);
    let rawT = 0;
    function onLocked(e) {
      if (e.type === 'pointerrawupdate') rawT = e.timeStamp; else if (e.timeStamp - rawT < 120) return;   // (raw updates carry the moves; the frame's pointermove would count them twice)
      const dx = e.movementX || 0, dy = e.movementY || 0; if (!dx && !dy) return;
      const m = s.mal[0], base = tgt[0] || { tx: m.x, ty: m.y };
      let p = null; try { const [a, b] = U.xz(base.tx, base.ty); p = T3.project(a, b, Y); } catch (er) {}
      const r = ctx.el.getBoundingClientRect(); if (!p || !(p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom)) p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      const a = toCm({ clientX: p.x, clientY: p.y }), b = toCm({ clientX: p.x + dx, clientY: p.y + dy }); if (!a || !b) return;
      tgt[0] = E.clampXY ? E.clampXY(s, 0, base.tx + (b.x - a.x), base.ty + (b.y - a.y)) : { tx: base.tx + (b.x - a.x), ty: base.ty + (b.y - a.y) }; src[0] = 'ptr';
    }
    function onMove(e) {
      if (phase !== 'play') { lastM = null; return; }
      if (locked() && !pvp) { if (e.pointerType === 'mouse' || !e.pointerType) onLocked(e); return; }
      if (e.pointerType === 'mouse' && !ptr.has(e.pointerId) && !pvp) {
        const prev = lastM; lastM = { clientX: e.clientX, clientY: e.clientY };
        if (!prev || (prev.clientX === e.clientX && prev.clientY === e.clientY)) return;
        const a = toCm(prev), b = toCm(e); if (!a || !b) return;
        const m = s.mal[0], base = tgt[0] || { tx: m.x, ty: m.y };
        tgt[0] = E.clampXY ? E.clampXY(s, 0, base.tx + (b.x - a.x), base.ty + (b.y - a.y)) : { tx: base.tx + (b.x - a.x), ty: base.ty + (b.y - a.y) }; src[0] = 'ptr';
        return;
      }
      const q = toCm(e); if (!q) return;
      let side = ptr.get(e.pointerId);
      if (side == null) { if (e.pointerType !== 'mouse') return; side = 0; }   // the mouse plays the near / left player by hovering
      const lead = e.pointerType === 'touch' ? (side === 0 ? -touchLead : touchLead) : 0;
      tgt[side] = { tx: q.x, ty: q.y + lead }; src[side] = 'ptr';
    }
    const onMoveW = e => { if (e.pointerType === 'mouse' && e.target !== ctx.el && !ctx.el.contains(e.target)) onMove(e); };   // (the pointer over the dock / the HUD: still steers)
    const onOutW = e => { if (!e.relatedTarget) lastM = null; };   // (out of the window: no jump when it comes back elsewhere)
    function onUp(e) { ptr.delete(e.pointerId); }
    ctx.el.addEventListener('pointerdown', onDown); ctx.el.addEventListener('pointermove', onMove);
    // (2026-11-10, lower latency) Chrome's pointerrawupdate arrives as soon as the mouse moves, not once per frame
    const raw = 'onpointerrawupdate' in window; if (raw) ctx.el.addEventListener('pointerrawupdate', onMove); addEventListener('pointerup', onUp, true); addEventListener('pointercancel', onUp, true);
    addEventListener('pointermove', onMoveW, true); addEventListener('mouseout', onOutW);
    const prevTouch = ctx.el.style.touchAction; ctx.el.style.touchAction = 'none';
    // (2026-11-10) no zooming with the mouse wheel (it was set off by accident mid-game), and no pointer drawn over the
    // table while a match is on (the mallet is the pointer)
    const noWheel = e => { if (e.ctrlKey) return; if (ctx.el.contains(e.target) || e.target === ctx.el) { e.preventDefault(); e.stopImmediatePropagation(); } };
    addEventListener('wheel', noWheel, { capture: true, passive: false });
    const curCss = document.createElement('style'); curCss.textContent = 'html.hk-play #gl,html.hk-play #gl *,html.hk-play #bv canvas{cursor:none!important}'; document.head.appendChild(curCss);
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
      if ((Math.abs(ay) > .6 || Math.abs(ax) > .6) && performance.now() - padNav > 220) { padNav = performance.now(); const i0 = BL.indexOf(look), n = BL.length, d = Math.abs(ay) > .6 ? (ay > 0 ? 2 : -2) : (ax > 0 ? 1 : -1); pickMode(BL[(i0 + d + n) % n]); }
    }

    /* ---------- the mode menu ---------- */
    let menuEl = null;
    let howOff = false; try { howOff = localStorage.getItem('atlas-hockey-howto') === 'off'; } catch (e) {}
    function pickMode(m) { setLook(m); if (menuEl) { menuEl.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m)); const d = menuEl.querySelector('.sel'); if (d) d.textContent = boardTxt(m, lang)[1]; } SND.click(); }
    function showMenu() {
      phase = 'menu';
      const el = document.createElement('div'); el.className = 'hkmenu'; menuEl = el;
      const how = '';   // (2026-11-10: the controls now come first, on a card of their own — see howFirst)
      el.innerHTML = `<div class="hkmenu-c" role="dialog" aria-label="${esc(tr('pickB', lang))}"><h2>${esc(tr('pickB', lang))}</h2><div class="hkmodes">${BL.map(m => { const [n, d] = boardTxt(m, lang); return `<button type="button" data-m="${m}" aria-pressed="${m === look}"><span class="ic th"><img src="${new URL('img/pick/hockey-' + m + '.webp?v=1', location.href).href}" alt="" loading="lazy"></span><span><b>${esc(n)}</b><small>${esc(d)}</small></span></button>`; }).join('')}</div><div class="sel">${esc(boardTxt(look, lang)[1])}</div>${how}<div class="hkft"><button type="button" class="bk">${esc(BKT[li(lang)] || BKT[1])}</button><button type="button" class="go">${esc(tr('play', lang))} ▶</button></div></div>`;
      document.body.appendChild(el);
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => pickMode(b.dataset.m); b.ondblclick = () => { pickMode(b.dataset.m); begin(); }; });
      el.querySelector('.go').onclick = begin;
      el.querySelector('.bk').onclick = () => { const q = document.getElementById('bvQuit'); if (q) q.click(); };
      padHeld = true; padRaf = requestAnimationFrame(padMenu);
    }
    function begin() {
      lock();   // (the 試合開始 click: the pointer is held for the match)
      if (!menuEl) return;
      const nv = menuEl.querySelector('#hkNever'); if (nv && nv.checked) { howOff = true; try { localStorage.setItem('atlas-hockey-howto', 'off'); } catch (e) {} }
      menuEl.remove(); menuEl = null; mode = look;
      // (the pace grows with the AI level; 2 players: a little brisker)
      s = E.newMatch({ board: look, target, first: 0, speed: pvp ? 1.2 : 1 + .4 * (level - 1) / 19 }); setupMode(); hud(); sync(performance.now()); kick(300); barFit();
      phase = 'count'; let n = 3;
      const tick = () => { if (stopped) return; if (n > 0) { big(String(n)); SND.beep(false); n--; later(tick, 600); } else { big('GO!', 'g', 600); SND.beep(true); phase = 'play'; document.documentElement.classList.add('hk-play'); last = performance.now(); loop(last); } };
      tick();
    }
    // (2026-11-12) the pointer lock: told on the controls card (mouse)
    const ESCT = ["Escで一時停止、クリックで再開。", "Esc pauses, a click resumes.", "按 Esc 暂停，点击继续。", "按 Esc 暫停，點擊繼續。", "Esc로 일시 정지, 클릭하면 재개.", "Esc pausa; clic para seguir.", "Échap met en pause ; clic pour reprendre.", "Esc pausa; clique para continuar.", "Esc pausiert, Klick setzt fort.", "Esc — пауза, щелчок — продолжить.", "Esc duraklatır; devam için tıkla.", "Esc menjeda; klik untuk lanjut.", "Esc से रुकता है; जारी रखने के लिए क्लिक करें।", "Esc للإيقاف المؤقت، وانقر للمتابعة."];   // (2026-11-13: only what to do — no note about the cursor)
    // (2026-11-10) the controls first (until 'don't show again'), then the board menu
    function howFirst() {
      if (howOff) { showMenu(); return; }
      // (2026-11-10) the same card as carrom / crokinole: title, the steps with round icons, 'don't show again', OK
      const H = HOW[lang] || HOW.en, mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;
      const dev = (H[1].split(/[／·・|]/).map(x => x.trim()).filter(Boolean)[mouse ? 0 : 1] || H[1]).trim();
      const steps = [['🏒', H[0]], [mouse ? '🖱' : '👆', dev]].concat(mouse ? [['⌨', H[2]], ['⎋', ESCT[li(lang)] || ESCT[1]]] : []).concat([['⚡', H[3]]]);
      const el = document.createElement('div'); el.className = 'hkhw'; el.dir = lang === 'ar' ? 'rtl' : 'ltr'; menuEl = null;
      el.innerHTML = `<div class="hkhw-c" role="dialog" aria-modal="true"><h2>${esc(HOWK.title[li(lang)] || HOWK.title[1])}</h2><ol>${steps.map(([ic, x]) => `<li><i>${ic}</i><span>${esc(x)}</span></li>`).join('')}</ol>${mouse ? `<p class="u pad">💻 <b>${esc((PADT[li(lang)] || PADT[1])[0])}</b><br>${esc((PADT[li(lang)] || PADT[1])[1])}</p>` : ''}<label><input type="checkbox" id="hkNever"> ${esc(HOWK.never[li(lang)] || HOWK.never[1])}</label><button type="button" class="ok">${esc(HOWK.ok[li(lang)] || HOWK.ok[1])}</button></div>`;
      ['pointerdown', 'pointermove', 'pointerup'].forEach(k => el.addEventListener(k, e => e.stopPropagation()));
      document.body.appendChild(el); howEl = el;
      el.querySelector('.ok').onclick = () => { if (el.querySelector('#hkNever').checked) { howOff = true; try { localStorage.setItem('atlas-hockey-howto', 'off'); } catch (e) {} } el.remove(); howEl = null; if (!stopped) showMenu(); };
    }
    let howEl = null;
    howFirst();

    /* ---------- AI ---------- */
    const mem = {};
    /* ---------- the loop ---------- */
    function pause() { if (phase !== 'play' || paused) return; paused = true; unlock(); document.documentElement.classList.remove('hk-play'); toast(tr('paused', lang)); }
    function resume() { if (!paused) return; paused = false; document.documentElement.classList.add('hk-play'); last = performance.now(); if (toastEl) toastEl.remove(); }
    const onVis = () => { if (document.hidden) pause(); else if (document.hasFocus()) resume(); };
    const onBlur = () => pause();   // (2026-11-10) the window losing focus (another window / app in front) pauses too, not only a hidden tab
    const onFocus = () => { if (!document.hidden) resume(); };   // and coming back resumes by itself
    document.addEventListener('visibilitychange', onVis); addEventListener('blur', onBlur); addEventListener('focus', onFocus);
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
      if (T3.drawNow) T3.drawNow();   // (2026-11-12) drawn right after the step, every frame of the screen: the mallet follows a touchpad's fine moves without lag
      if (s.over >= 0) end();
    }
    function onEvent(e) {
      if (e.k === 'hit' || e.k === 'edge') fx.ring(e.x, e.y, e.k === 'edge');
      if (e.k === 'bumper') fx.flash(.8);
      if (e.k === 'hit') SND.hit(e.v);
      else if (e.k === 'edge') { SND.edge(); fxAt(e.x, e.y, tr('edge', lang)); }
      else if (e.k === 'wall' || e.k === 'shield') SND.wall(e.v || 100);
      else if (e.k === 'block' || e.k === 'bumper' || e.k === 'monster') SND.boing();
      else if (e.k === 'warp') SND.warp();
      else if (e.k === 'goal') { fx.flash(1.5); const mine = pvp || e.side === 0; (mine ? SND.goal : SND.lose)(); big(tr('goal', lang), 'g', 900); hud(); }
      else if (e.k === 'pick') { SND.pick(); toast(tr('it.' + e.what, lang).replace('{p}', names[e.side])); }
    }
    function end() {
      document.documentElement.classList.remove('hk-play');
      over = true; phase = 'over'; cancelAnimationFrame(raf); unlock();
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
        unlock(); escBadge(false); document.removeEventListener('pointerlockchange', onLockChange); ctx.el.removeEventListener('pointerdown', onDown); ctx.el.removeEventListener('pointermove', onMove); removeEventListener('pointermove', onMoveW, true); removeEventListener('mouseout', onOutW); if (raw) ctx.el.removeEventListener('pointerrawupdate', onMove); removeEventListener('pointerup', onUp, true); removeEventListener('pointercancel', onUp, true);
        removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVis); removeEventListener('blur', onBlur); removeEventListener('focus', onFocus);
        ctx.el.style.touchAction = prevTouch; css.remove(); if (toastEl) toastEl.remove(); if (menuEl) menuEl.remove(); if (howEl) howEl.remove(); document.querySelectorAll('.hkbig,.hkfx').forEach(e => e.remove());
        if (T3.turn) T3.turn(null);
        document.documentElement.classList.remove('hk-on', 'hk-play'); removeEventListener('resize', barFit); removeEventListener('wheel', noWheel, { capture: true }); curCss.remove();
      },
      _debug: { st: () => s, phase: () => phase, begin: m => { if (m) pickMode(m); begin(); }, at: (x, y) => { const [a, b] = U.xz(x, y); return T3.project(a, b, Y); } },
    };
    window.__hockeyTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.hockey = { levels: 20, sides: false, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 7, sizeLabel, sizeName, levelInfo, start, MODE_TXT: M, ICON, modeName, SND };
})();
