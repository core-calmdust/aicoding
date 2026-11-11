/* =====================================================================
   World Board Game Atlas — AI bosses & table talk: the roster
   One boss per 3 AI levels of every game (Lv.1–3, 4–6, …), modelled on the
   game's homeland or a person from its history; the strongest is UR.
     AtlasNPC.LEVELS[game]   the game's AI levels (as on the portal's board card)
     AtlasNPC.BOSSES[game]   [{ v: voice, m: 3D model spec (avatars/sp-boss.js), n: names }]
     AtlasNPC.band(game, lv) → index of the boss for that level (0 = Lv.1–3)
     AtlasNPC.tier(game, lv) → the avatar a win gives: 0 N / 1 R / 2 SR (Lv.1 N, Lv.2 R, Lv.3 SR, Lv.4 N …)
     AtlasNPC.VOICE[species] the voice of the 50 gacha creatures when they talk at the table
   Titles, lines and trivia (14 languages) live in npc/t/<lang>.js; the talk itself in npc/npc.js.
   Names: 'ja|en|zh|zh-TW|ko|ru|hi|ar' (es fr pt de id tr use the English name).
   ===================================================================== */
(function () {
  'use strict';
  const A = window.AtlasNPC = window.AtlasNPC || {};
  A.LEVELS = { chess: 25, shogi: 26, go: 32, reversi: 25, gomoku: 20, checkers: 20, xiangqi: 20, janggi: 20, tafl: 25, ur: 20, senet: 20, morris: 10,
    connect4: 8, dots: 10, mancala: 10, backgammon: 10, hex: 20, fanorona: 20, ugolki: 23, agon: 23, konane: 23, ludo: 20, carrom: 20, crokinole: 20, hockey: 20, alquerque: 20, amazons: 23 };
  const N = s => { const p = s.split('|'), k = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'ru', 'hi', 'ar'], o = {}; k.forEach((l, i) => { o[l] = p[i] || p[1]; }); ['es', 'fr', 'pt', 'de', 'id', 'tr'].forEach(l => { o[l] = o.en; }); return o; };
  const b = (v, m, n) => ({ v, m, n: N(n) });
  // colours: [body, belly / face, accent]
  A.BOSSES = {
    chess: [
      b('sleepy', { a: 'elephant', c: [0xc4c8e8, 0xfff4ea, 0xff8f5a], hat: 'turban', hc: [0xff8f5a, 0xffd65a], held: 'piece' }, 'チャトラゾウ|Chaturaphant|恰图象|恰圖象|차투라코끼리|Чатурслон|चतुरहाथी|فيل الشطرنج'),
      b('merchant', { a: 'cat', c: [0xecd6b4, 0xfff6ea, 0x3a8ad8], hat: 'fez', hc: [0xc83a4a], held: 'piece', ex: ['scarf'] }, 'シャトランニャ|Shatranjcat|沙特兰猫|沙特蘭貓|샤트란냥|Шатранджкот|शतरंजबिल्ली|قط الشطرنج'),
      b('scholar', { a: 'owl', c: [0xb08a68, 0xf6e6cc, 0x2a8a8a], hat: 'turban', hc: [0x2a8a8a, 0xffd65a], held: 'book', ex: ['glasses'] }, 'アドリフクロウ|Adliowl|阿德利猫头鹰|阿德利貓頭鷹|아들리부엉이|Адли-сова|अदलीउल्लू|بومة العدلي'),
      b('priest', { a: 'bull', c: [0x9a6a48, 0xf4e2c8, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'book', ex: ['robe'], rc: 0x2a2a38 }, 'ロペスうし|Lopez Bull|洛佩斯牛|洛佩斯牛|로페스소|Бык Лопес|लोपेज़ बैल|ثور لوبيث'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x3a9a5a], hat: 'beret', hc: [0xd83a4a], held: 'piece', ex: ['mustache'] }, 'グレコギツネ|Grecofox|格雷科狐|格雷科狐|그레코여우|Греко-лис|ग्रेकोलोमड़ी|ثعلب غريكو'),
      b('cool', { a: 'bird', c: [0x9a7056, 0xff9a6a, 0x3a4ad8], hat: 'tricorne', hc: [0x2a3a6a, 0xffd65a], held: 'quill', ex: ['ruff'] }, 'フィリドリ|Philidorbin|菲利多鸟|菲利多鳥|필리도새|Филидрозд|फ़िलिडोर चिड़िया|طائر فيليدور'),
      b('hothead', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xc8702a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'piece', ex: ['cape?'] }, 'モーフィーライオン|Morphion|莫菲狮|莫菲獅|모피사자|Морфи-лев|मॉर्फ़ी शेर|أسد مورفي'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0x6a3ad8], hat: 'crown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0xd8d0c8, cape: 0x6a3ad8 }, 'シュタイニッツグマ|Steinbear|斯坦尼茨熊|斯坦尼茨熊|슈타이니츠곰|Штейниц-медведь|स्टाइनित्ज़ भालू|دب شتاينتس'),
      b('lady', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0xff8fb0], beak: 0xff9a3a, hat: 'laurel', hc: [0x8ad87a], hat2: 'halo', held: 'orb', ex: ['necklace', 'cape'], cape: 0xb88aff }, 'カイッサ白鳥|Caissa Swan|卡伊莎天鹅|卡伊莎天鵝|카이사백조|Лебедь Каисса|कैसा हंस|بجعة كايسا'),
    ],
    shogi: [
      b('sleepy', { a: 'cat', c: [0xf8e8d0, 0xffffff, 0xff8fb0], hat: 'eboshi', held: 'shogi' }, '平安こねこ|Heian Kitten|平安小猫|平安小貓|헤이안새끼고양이|Котёнок Хэйан|हेयान बिलौटा|قطيطة هييان'),
      b('priest', { a: 'deer', c: [0xc8945a, 0xfff4e6, 0x46a0a0], hat: 'antlers', held: 'shogi', ex: ['necklace'] }, '興福寺シカ|Kofukuji Deer|兴福寺鹿|興福寺鹿|고후쿠지사슴|Олень Кофукудзи|कोफ़ुकुजी हिरण|غزال كوفوكوجي'),
      b('merchant', { a: 'monkey', c: [0xb07a50, 0xffe0c8, 0xd83a4a], hat: 'kasa', held: 'fan' }, '中将棋ザル|Chu-shogi Monkey|中将棋猴|中將棋猴|주쇼기원숭이|Обезьяна тю-сёги|चू-शोगी बंदर|قرد تشو شوغي'),
      b('samurai', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x3a6ad8], hat: 'eboshi', held: 'fan', ex: ['robe'], rc: 0x3a6ad8 }, '宗桂ギツネ|Sokeifox|宗桂狐|宗桂狐|소케이여우|Лис Сокэй|सोकेई लोमड़ी|ثعلب سوكيه'),
      b('scholar', { a: 'rabbit', c: [0xfaf4ee, 0xffffff, 0x6a5ad8], hat: 'eboshi', held: 'scroll', ex: ['robe'], rc: 0x6a5ad8 }, '看寿ウサギ|Kanju Bunny|看寿兔|看壽兔|간주토끼|Кролик Кандзю|कांजू खरगोश|أرنب كانجو'),
      b('cool', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0x2a2a38], beak: 0xffc040, held: 'shogi', ex: ['robe'], rc: 0x2a2a38 }, '宗歩タカ|Soho Hawk|宗步鹰|宗步鷹|소호매|Сокол Сохо|सोहो बाज़|صقر سوهو'),
      b('king', { a: 'tanuki', c: [0x9a7a5a, 0xf4e6d0, 0x8a3ad8], hat: 'kabuto', hc: [0x2a2a38, 0xffd65a], held: 'fan', ex: ['cape'], cape: 0x8a3ad8 }, '家康ダヌキ|Ieyasu Tanuki|家康狸|家康狸|이에야스너구리|Тануки Иэясу|इएयासु तानुकी|تانوكي إيياسو'),
      b('samurai', { a: 'wolf', c: [0x8a8aa0, 0xf0f0f6, 0xc83a4a], hat: 'kabuto', hc: [0xc83a4a, 0xffd65a], held: 'katana', ex: ['armor'], ac: 0xc83a4a }, '御城将棋オオカミ|Castle-Game Wolf|御城将棋狼|御城將棋狼|오시로쇼기늑대|Волк замковых игр|महल-खेल भेड़िया|ذئب شوغي القلعة'),
      b('villain', { a: 'dragon', c: [0x6a3ad8, 0xe8d8ff, 0xffd65a], hat: 'bigcrown', held: 'shogi', ex: ['cape'], cape: 0x2a1a4a }, '玉将ドラゴン|Gyokusho Dragon|玉将龙|玉將龍|교쿠쇼드래곤|Дракон Гёкусё|ग्योकुशो ड्रैगन|تنين غيوكوشو'),
    ],
    go: [
      b('sleepy', { a: 'panda', c: [0xfbfaf4, 0xffffff, 0xff8fb0], held: 'stone', ex: ['scarf'], sc: 0xff8fb0 }, '丹朱パンダ|Danzhu Panda|丹朱熊猫|丹朱熊貓|단주판다|Панда Даньчжу|दानझू पांडा|باندا دانتشو'),
      b('hothead', { a: 'squirrel', c: [0xc8783a, 0xfff0dc, 0x3a9a5a], hat: 'bandana', hc: [0x3a9a5a], held: 'stone' }, '爛柯リス|Lanke Squirrel|烂柯松鼠|爛柯松鼠|난가다람쥐|Белка Ланькэ|लानके गिलहरी|سنجاب لانكه'),
      b('scholar', { a: 'crane', c: [0xfbfaf4, 0xffffff, 0xe83a3a], beak: 0x5a5a6a, hat: 'mortar', held: 'book' }, '琴棋書画ツル|Four-Arts Crane|琴棋书画鹤|琴棋書畫鶴|금기서화학|Журавль четырёх искусств|चार कला सारस|كركي الفنون الأربعة'),
      b('sage', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x6a9a5a], hat: 'eboshi', held: 'scroll', ex: ['beard'] }, '吉備真備ガメ|Kibi Turtle|吉备真备龟|吉備真備龜|기비거북|Черепаха Киби|किबी कछुआ|سلحفاة كيبي'),
      b('priest', { a: 'cat', c: [0xb8b8c0, 0xf4f4f8, 0x2a2a38], held: 'stone', ex: ['robe'], rc: 0x3a3040 }, '算砂ネコ|Sansa Cat|算砂猫|算砂貓|산사고양이|Кот Санса|सान्सा बिल्ली|قط سانسا'),
      b('cool', { a: 'owl', c: [0x7a6a5a, 0xf4e6d0, 0x2a2a38], hat: 'eboshi', held: 'stone' }, '道策フクロウ|Dosaku Owl|道策猫头鹰|道策貓頭鷹|도사쿠부엉이|Сова Досаку|दोसाकू उल्लू|بومة دوساكو'),
      b('knight', { a: 'rabbit', c: [0xfffaf6, 0xffffff, 0xe83a3a], held: 'stone', ex: ['scarf'], sc: 0xe83a3a }, '秀策ウサギ|Shusaku Bunny|秀策兔|秀策兔|슈사쿠토끼|Кролик Сюсаку|शूसाकू खरगोश|أرنب شوساكو'),
      b('hothead', { a: 'bear', c: [0x6a5446, 0xf0dcc8, 0x2a2a38], hat: 'eboshi', held: 'stone' }, '丈和グマ|Jowa Bear|丈和熊|丈和熊|조와곰|Медведь Дзёва|जोवा भालू|دب جووا'),
      b('king', { a: 'lion', c: [0xf0c870, 0xfff4e0, 0xffc030], hat: 'bigcrown', held: 'orb', ex: ['robe'], rc: 0xffc030 }, '尭帝ライオン|Emperor Yao Lion|尧帝狮|堯帝獅|요제사자|Лев императора Яо|सम्राट याओ शेर|أسد الإمبراطور ياو'),
      b('sage', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x2a2a38], hat: 'halo', held: 'staff', ex: ['longbeard'] }, '天元トラ|Tengen Tiger|天元虎|天元虎|천원호랑이|Тигр Тэнгэн|तेंगेन बाघ|نمر تنغن'),
      b('villain', { a: 'dragon', c: [0x26262e, 0xfbfaf4, 0xfbfaf4], hat: 'bigcrown', held: 'orb', ex: ['cape'], cape: 0xfbfaf4 }, '黒白大仙ドラゴン|Black-White Immortal|黑白大仙龙|黑白大仙龍|흑백대선드래곤|Чёрно-белый бессмертный|श्याम-श्वेत अमर|الخالد الأبيض والأسود'),
    ],
    reversi: [
      b('trickster', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x3a9a5a], hat: 'beret', hc: [0x3a9a5a], held: 'disc' }, 'ロンドンひつじ|London Lamb|伦敦小羊|倫敦小羊|런던양|Лондонский ягнёнок|लंदन मेमना|حمل لندن'),
      b('merchant', { a: 'beaver', c: [0xa0703a, 0xf4dcc0, 0xc83a4a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'disc' }, 'ウォーターマンビーバー|Waterman Beaver|沃特曼河狸|沃特曼河狸|워터맨비버|Бобр Уотермен|वॉटरमैन बीवर|قندس ووترمان'),
      b('scholar', { a: 'bird', c: [0xa8b0c8, 0xe8ecf6, 0x6a5ad8], hat: 'tophat', hc: [0x3a3a48, 0x6a5ad8], held: 'book', ex: ['monocle'] }, 'モレットバト|Mollett Pigeon|莫利特鸽|莫利特鴿|몰렛비둘기|Голубь Моллетт|मॉलेट कबूतर|حمامة موليت'),
      b('hothead', { a: 'rabbit', c: [0xffcad8, 0xffffff, 0xe83a5a], hat: 'bandana', hc: [0xe83a5a], held: 'disc' }, '水戸の梅ウサギ|Mito Plum Bunny|水户梅兔|水戶梅兔|미토매화토끼|Сливовый кролик Мито|मितो बेर खरगोश|أرنب برقوق ميتو'),
      b('lady', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0xff8fb0], beak: 0xff9a3a, hat: 'tiara', held: 'fan', ex: ['necklace'] }, 'デズデモーナ白鳥|Desdemona Swan|苔丝狄蒙娜天鹅|苔絲狄蒙娜天鵝|데스데모나백조|Лебедь Дездемона|देसदेमोना हंस|بجعة ديدمونة'),
      b('knight', { a: 'lion', c: [0x7a5236, 0xf0dcc0, 0x3a3020], hat: 'helmet', hc: [0xc83a4a, 0xc8ccd8], held: 'sword', ex: ['armor', 'cape?'] }, 'オセロ将軍ライオン|General Othello Lion|奥赛罗将军狮|奧賽羅將軍獅|오셀로장군사자|Лев генерал Отелло|सेनापति ओथेलो शेर|أسد القائد عطيل'),
      b('trickster', { a: 'fox', c: [0x6a5a7a, 0xe8e0f0, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'disc', mouth: 'w' }, 'イアーゴギツネ|Iago Fox|伊阿古狐|伊阿古狐|이아고여우|Лис Яго|इआगो लोमड़ी|ثعلب ياغو'),
      b('scholar', { a: 'cat', c: [0xd8b890, 0xfff4e6, 0x2a2a38], held: 'quill', ex: ['ruff', 'mustache'] }, 'シェイクスピアネコ|Shakespurr|莎士比猫|莎士比貓|셰익스피어냥|Кот Шекспир|शेक्सपियर बिल्ली|قط شكسبير'),
      b('villain', { a: 'bird', c: [0x26262e, 0xfbfaf4, 0x3a6ad8], beak: 0x3a3a48, hat: 'bigcrown', held: 'disc', ex: ['cape'], cape: 0x26262e }, '四隅の覇王カササギ|Corner-Lord Magpie|四角霸王喜鹊|四角霸王喜鵲|네모서리패왕까치|Сорока — владыка углов|कोनों का स्वामी मैगपाई|العقعق سيد الزوايا'),
    ],
    gomoku: [
      b('sleepy', { a: 'mouse', c: [0xd8d0c8, 0xfff4ee, 0x3a8ad8], hat: 'bandana', hc: [0x3a8ad8], held: 'stone' }, '寺子屋ネズミ|Terakoya Mouse|寺子屋鼠|寺子屋鼠|데라코야쥐|Мышка из тэракоя|तेराकोया चूहा|فأر تيراكويا'),
      b('merchant', { a: 'frog', c: [0x7ad070, 0xf4ffe0, 0xd8a040], hat: 'kasa', held: 'stone' }, '縁台ガエル|Porch-Bench Frog|檐台蛙|簷台蛙|엔다이개구리|Лягушка у скамейки|बरामदे का मेंढक|ضفدع المصطبة'),
      b('scholar', { a: 'dog', c: [0x3a3a44, 0xd8d8e0, 0xc83a4a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'book', ex: ['mustache'], bc: 0x1a1a22 }, '涙香イヌ|Ruiko Dog|泪香犬|淚香犬|루이코개|Пёс Руйко|रुइको कुत्ता|كلب رويكو'),
      b('knight', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xc83a4a], held: 'stone', ex: ['scarf'], sc: 0xc83a4a }, '禁じ手ヤギ|Foul-Rule Goat|禁手山羊|禁手山羊|금수염소|Козёл запретных ходов|निषिद्ध चाल बकरी|ماعز الحركات المحظورة'),
      b('cool', { a: 'cat', c: [0x2a2a33, 0x4a4a55, 0xffd65a], held: 'stone', ex: ['scarf'], sc: 0xffd65a }, '珠型クロネコ|Opening Black Cat|珠型黑猫|珠型黑貓|주형검은고양이|Чёрный кот дебютов|ओपनिंग काली बिल्ली|القط الأسود للافتتاحيات'),
      b('samurai', { a: 'wolf', c: [0x9a9ab0, 0xf0f0f6, 0x2a2a38], hat: 'kabuto', hc: [0x2a2a38, 0xffd65a], held: 'katana', ex: ['armor'], ac: 0x3a3a48 }, '五連サムライオオカミ|Five-Row Samurai Wolf|五连武士狼|五連武士狼|오련사무라이늑대|Волк-самурай пяти в ряд|पाँच-पंक्ति समुराई भेड़िया|ذئب الساموراي الخماسي'),
      b('villain', { a: 'dragon', c: [0xfbfaf4, 0xffffff, 0x26262e], hat: 'bigcrown', held: 'stone', ex: ['cape'], cape: 0x26262e }, '連珠大龍|Grand Renju Dragon|连珠大龙|連珠大龍|연주대룡|Великий дракон рэндзю|महान रेंजू ड्रैगन|تنين الرينجو الأعظم'),
    ],
    checkers: [
      b('sleepy', { a: 'otter', c: [0xa07a5a, 0xf4e6d0, 0x3a9a5a], hat: 'cap', hc: [0x3a9a5a], held: 'piece' }, 'パブのカワウソ|Pub Otter|酒馆水獭|酒館水獺|펍수달|Выдра из паба|पब ऊदबिलाव|قضاعة الحانة'),
      b('merchant', { a: 'dog', c: [0xe0c8a8, 0xfff6ea, 0x3a6ad8], hat: 'beret', hc: [0x3a6ad8], held: 'piece', ex: ['scarf'] }, 'フィエルジュいぬ|Fierges Pup|菲尔热小狗|菲爾熱小狗|피에르주강아지|Щенок ферж|फ़िएर्ज पिल्ला|جرو الفيرج'),
      b('scholar', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x2a3a6a], hat: 'tricorne', held: 'book', ex: ['glasses'] }, 'ペインひつじ|Payne Sheep|佩恩羊|佩恩羊|페인양|Овца Пейн|पेन भेड़|خروف باين'),
      b('hothead', { a: 'bull', c: [0xc8703a, 0xf4dcc0, 0xc83a4a], hat: 'beret', hc: [0xc83a4a], held: 'piece', ex: ['scarf'] }, 'ハイランドうし|Highland Cow|高地牛|高地牛|하일랜드소|Хайлендская корова|हाइलैंड गाय|بقرة المرتفعات'),
      b('knight', { a: 'horse', c: [0xc8a070, 0xf4e6d0, 0x3a6ad8], hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'shield', ex: ['armor'] }, '100マスのウマ|Hundred-Square Horse|百格马|百格馬|백칸말|Конь ста клеток|सौ-खाना घोड़ा|حصان المئة مربع'),
      b('cool', { a: 'owl', c: [0x9a8a7a, 0xf4ece0, 0x2a2a38], held: 'piece', ex: ['glasses', 'scarf'] }, 'ティンズリーフクロウ|Tinsley Owl|廷斯利猫头鹰|廷斯利貓頭鷹|틴슬리부엉이|Сова Тинсли|टिंसली उल्लू|بومة تينزلي'),
      b('villain', { a: 'lizard', c: [0x6a8ad8, 0xe0e8ff, 0x46e0c8], hat: 'helmet', hc: [0x46e0c8, 0xc8ccd8], held: 'orb', ex: ['cape'], cape: 0x2a3a6a }, 'チヌーク竜|Chinook Drake|奇努克龙|奇努克龍|치누크용|Дракон Чинук|चिनूक ड्रेक|تنين شينوك'),
    ],
    xiangqi: [
      b('sleepy', { a: 'panda', c: [0xfbfaf4, 0xffffff, 0xe83a3a], hat: 'straw', hc: [0xf0d080, 0xe83a3a], held: 'disc' }, '楚河パンダ|Riverbank Panda|楚河熊猫|楚河熊貓|초하판다|Панда у реки|नदी किनारे का पांडा|باندا ضفة النهر'),
      b('merchant', { a: 'monkey', c: [0xc8945a, 0xffe6cc, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'tea' }, '茶館ザル|Teahouse Monkey|茶馆猴|茶館猴|찻집원숭이|Обезьяна из чайной|चायघर बंदर|قرد المقهى'),
      b('scholar', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xff9a3a], hat: 'mortar', held: 'book' }, '橘中秘ヤギ|Orange-Secret Goat|橘中秘山羊|橘中祕山羊|귤중비염소|Козёл «Тайн апельсина»|नारंगी रहस्य बकरी|ماعز سرّ البرتقالة'),
      b('knight', { a: 'horse', c: [0xe8d8c0, 0xfff6ea, 0xe83a3a], hat: 'helmet', hc: [0xe83a3a, 0xc8ccd8], held: 'sword' }, '馬跳びウマ|Leaping Horse|跳日马|跳日馬|일자마|Скачущий конь|छलांगी घोड़ा|الحصان القافز'),
      b('cool', { a: 'tiger', c: [0xf6f2ea, 0xffffff, 0x2a2a38], held: 'flag', ex: ['armor'], ac: 0xe83a3a }, '韓信トラ|Han Xin Tiger|韩信虎|韓信虎|한신호랑이|Тигр Хань Синь|हान शिन बाघ|نمر هان شين'),
      b('hothead', { a: 'bear', c: [0x4a3a3a, 0xe8d8d0, 0xc83a4a], hat: 'helmet', hc: [0xc83a4a, 0x3a3a48], held: 'sword', ex: ['armor', 'cape?'], ac: 0x3a3a48 }, '項羽グマ|Xiang Yu Bear|项羽熊|項羽熊|항우곰|Медведь Сян Юй|शियांग यू भालू|دب شيانغ يو'),
      b('king', { a: 'dragon', c: [0xe83a3a, 0xffe0c8, 0xffd65a], hat: 'bigcrown', held: 'orb', ex: ['robe'], rc: 0xffc030 }, '劉邦ドラゴン|Liu Bang Dragon|刘邦龙|劉邦龍|유방드래곤|Дракон Лю Бан|लियू बांग ड्रैगन|تنين ليو بانغ'),
    ],
    janggi: [
      b('sleepy', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x3a6ad8], held: 'disc', ex: ['scarf'], sc: 0x3a6ad8 }, 'トラの子ホランイ|Horangi Cub|小老虎霍朗伊|小老虎霍朗伊|아기호랑이|Тигрёнок Хоранъи|होरांगी शावक|شبل هورانغي'),
      b('merchant', { a: 'rabbit', c: [0xfaf6f2, 0xffffff, 0xe83a5a], hat: 'straw', hc: [0xe8c878, 0xe83a5a], held: 'disc' }, '市場ウサギ|Market Bunny|市场兔|市場兔|장터토끼|Рыночный кролик|बाज़ार खरगोश|أرنب السوق'),
      b('scholar', { a: 'crane', c: [0xfbfaf4, 0xffffff, 0xe83a3a], beak: 0x5a5a6a, hat: 'gat', held: 'book', ex: ['robe'], rc: 0xfbfaf4 }, 'ソンビ鶴|Seonbi Crane|书生鹤|書生鶴|선비학|Журавль-сонби|सोनबी सारस|كركي السونبي'),
      b('knight', { a: 'dog', c: [0xf0e0c8, 0xfff8ee, 0x3a6ad8], hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'sword' }, '珍島ケン|Jindo Hound|珍岛犬|珍島犬|진돗개|Пёс чиндо|जिंदो कुत्ता|كلب جيندو'),
      b('cool', { a: 'bird', c: [0x26262e, 0xfbfaf4, 0x3a6ad8], beak: 0x3a3a48, held: 'scroll', ex: ['scarf'], sc: 0x3a6ad8 }, 'カササギ使者|Magpie Messenger|喜鹊信使|喜鵲信使|까치전령|Сорока-вестница|मैगपाई संदेशवाहक|العقعق الرسول'),
      b('priest', { a: 'bear', c: [0x7a5a46, 0xf0dcc8, 0xffd65a], hat: 'crown', held: 'staff', ex: ['necklace'] }, '檀君グマ|Dangun Bear|檀君熊|檀君熊|단군곰|Медведь Тангун|दांगुन भालू|دب دانغون'),
      b('king', { a: 'lion', c: [0x5ac8a0, 0xf0fff6, 0x3a6ad8], hat: 'bigcrown', held: 'orb', ex: ['horns', 'cape'], cape: 0x3a6ad8 }, 'ヘチ大王|Haechi the Great|獬豸大王|獬豸大王|해치대왕|Великий Хэчхи|महान हैची|هايتشي العظيم'),
    ],
    tafl: [
      b('sleepy', { a: 'seal', c: [0xb8c0cc, 0xf0f4fa, 0x3a6ad8], held: 'piece', ex: ['scarf'], sc: 0x3a6ad8 }, 'フィヨルドアザラシ|Fjord Seal|峡湾海豹|峽灣海豹|피오르물범|Фьордовый тюлень|फ़्योर्ड सील|فقمة المضيق'),
      b('merchant', { a: 'fox', c: [0xfaf8f6, 0xffffff, 0x3a9a5a], hat: 'hood', hc: [0x3a9a5a], held: 'goblet' }, '交易キツネ|Trader Fox|商人狐|商人狐|교역여우|Лис-торговец|व्यापारी लोमड़ी|الثعلب التاجر'),
      b('scholar', { a: 'deer', c: [0xa07a50, 0xf4e6d0, 0x3a6ad8], hat: 'antlers', held: 'book', ex: ['glasses'] }, 'リンネトナカイ|Linnaeus Reindeer|林奈驯鹿|林奈馴鹿|린네순록|Северный олень Линнея|लिनियस रेंडियर|رنة لينيوس'),
      b('pirate', { a: 'boar', c: [0x9a6a4a, 0xf0d8c0, 0xff8a3a], hat: 'viking', held: 'sword', ex: ['beard'], bc: 0xff8a3a }, 'ロングシップイノシシ|Longship Boar|长船野猪|長船野豬|롱십멧돼지|Кабан с драккара|लॉन्गशिप सूअर|خنزير السفينة الطويلة'),
      b('knight', { a: 'wolf', c: [0x9aa0b0, 0xf0f2f8, 0xc83a4a], hat: 'helmet', hc: [0xc83a4a, 0xc8ccd8], held: 'shield' }, '盾持ちオオカミ|Shield Wolf|持盾狼|持盾狼|방패늑대|Волк со щитом|ढाल भेड़िया|ذئب الدرع'),
      b('cool', { a: 'bird', c: [0x2a2a38, 0x4a4a5a, 0xffd65a], beak: 0x3a3a48, held: 'orb', ex: ['necklace'] }, 'フギン・ガラス|Huginn Raven|福金渡鸦|福金渡鴉|후긴까마귀|Ворон Хугин|हुगिन कौवा|الغراب هوغين'),
      b('hothead', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xffd65a], hat: 'viking', held: 'hammer' }, 'トールヤギ|Thor Goat|雷神山羊|雷神山羊|토르염소|Козёл Тора|थॉर बकरा|ماعز ثور'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xc83a4a], hat: 'crown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0xe8a060, cape: 0xc83a4a }, 'フネフィ王グマ|King Hnefi Bear|赫内菲熊王|赫內菲熊王|흐네피왕곰|Медведь-король Хнефи|राजा ह्नेफ़ी भालू|الملك هنيفي الدب'),
      b('sage', { a: 'hawk', c: [0x8a7a6a, 0xf4ece0, 0x3a3a68], beak: 0xffc040, hat: 'helmet', hc: [0xfff4dc, 0xc8ccd8], held: 'staff', ex: ['cape', 'longbeard'], cape: 0x3a3a68 }, 'オーディンワシ|Allfather Eagle|奥丁鹰|奧丁鷹|오딘독수리|Орёл Всеотец|सर्वपिता गरुड़|نسر الأب الأكبر'),
    ],
    ur: [
      b('sleepy', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x3a6ad8], held: 'pyramid', ex: ['necklace'] }, 'シュメールのこひつじ|Sumer Lamb|苏美尔小羊|蘇美小羊|수메르아기양|Шумерский ягнёнок|सुमेर मेमना|حمل سومر'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0xd83a4a], hat: 'turban', hc: [0xd83a4a, 0xffd65a], held: 'pyramid' }, '交易ラクダ|Caravan Camel|商队骆驼|商隊駱駝|대상낙타|Караванный верблюд|कारवां ऊँट|جمل القافلة'),
      b('scholar', { a: 'owl', c: [0xb89a78, 0xf6eadc, 0x3a6ad8], held: 'book', c2: 0 }, '粘土板フクロウ|Clay-Tablet Owl|泥板猫头鹰|泥板貓頭鷹|점토판부엉이|Сова глиняных табличек|मिट्टी-पट्टी उल्लू|بومة الألواح الطينية'),
      b('hothead', { a: 'dog', c: [0xe8c890, 0xfff6e6, 0x8a6a3a], hat: 'cap', hc: [0xd8c098], held: 'book', ex: ['scarf'], sc: 0xc83a4a }, 'ウーリー探検イヌ|Woolley Explorer Pup|伍利探险犬|伍利探險犬|울리탐험개|Пёс-исследователь Вулли|वूली खोजी पिल्ला|جرو المستكشف وولي'),
      b('lady', { a: 'deer', c: [0xd8a070, 0xfff4e6, 0x3a6ad8], hat: 'laurel', held: 'goblet', ex: ['necklace'] }, 'プアビ女王ジカ|Queen Puabi Doe|普阿比女王鹿|普阿比女王鹿|푸아비여왕사슴|Лань царица Пуаби|रानी पुआबी हिरणी|ظبية الملكة بوابي'),
      b('cool', { a: 'bull', c: [0xffc848, 0xfff0cc, 0x2a4ad8], held: 'none', ex: ['beard', 'necklace'], bc: 0x2a4ad8 }, '竪琴の牡牛|Lyre Bull|竖琴金牛|豎琴金牛|수금황소|Бык с лиры|वीणा बैल|ثور القيثارة'),
      b('king', { a: 'lion', c: [0xe8b060, 0xfff0d8, 0x3a3a68], hat: 'bigcrown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0x3a3040, cape: 0x3a6ad8 }, 'ウル・ナンムライオン|Ur-Nammu Lion|乌尔纳姆狮|烏爾納姆獅|우르남무사자|Лев Ур-Намму|उर-नम्मू शेर|أسد أور نمو'),
    ],
    senet: [
      b('sleepy', { a: 'cat', c: [0xe8c890, 0xfff6e6, 0x3a6ad8], held: 'sticks', ex: ['necklace'] }, 'ナイルのこねこ|Nile Kitten|尼罗小猫|尼羅小貓|나일새끼고양이|Нильский котёнок|नील बिलौटा|قطيطة النيل'),
      b('merchant', { a: 'hippo', c: [0x9ac0d8, 0xe8f4ff, 0x3a9a8a], held: 'sticks', ex: ['necklace'] }, 'ナイルカバ|Nile Hippo|尼罗河马|尼羅河馬|나일하마|Нильский бегемот|नील दरियाई घोड़ा|فرس نهر النيل'),
      b('scholar', { a: 'ibis', c: [0xfbfaf4, 0xffffff, 0x3a6ad8], beak: 0x2a2a38, held: 'scroll', ex: ['collar'] }, 'トト・トキ|Thoth Ibis|托特朱鹭|托特朱鷺|토트따오기|Ибис Тот|थोथ आइबिस|أبو منجل تحوت'),
      b('lady', { a: 'cat', c: [0x3a3a44, 0x5a5a66, 0xffd65a], hat: 'tiara', held: 'sticks', ex: ['collar'], cc: 0x3a6ad8 }, 'ネフェルタリネコ|Nefertari Cat|奈费尔塔利猫|奈費爾塔利貓|네페르타리고양이|Кошка Нефертари|नेफ़र्तारी बिल्ली|قطة نفرتاري'),
      b('priest', { a: 'jackal', c: [0x2a2a33, 0x4a4a55, 0xffd65a], held: 'staff', ex: ['collar'], cc: 0x3a6ad8 }, 'アヌビスジャッカル|Anubis Jackal|阿努比斯胡狼|阿努比斯胡狼|아누비스자칼|Шакал Анубис|अनुबिस गीदड़|ابن آوى أنوبيس'),
      b('cool', { a: 'croc', c: [0x6aa870, 0xe8f4d8, 0xffd65a], hat: 'nemes', hc: [0x3a6ad8, 0xffd65a], held: 'staff' }, 'セベクワニ|Sobek Croc|索贝克鳄|索貝克鱷|소베크악어|Крокодил Себек|सोबेक मगर|تمساح سوبك'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x3a6ad8], hat: 'nemes', hc: [0x3a6ad8, 0xffd65a], held: 'sticks', ex: ['collar', 'cape'], cc: 0x3a6ad8, cape: 0x3a6ad8 }, 'ツタンカーメンスフィンクス|Tut Sphinx|图坦卡蒙狮身人面|圖坦卡門獅身人面|투탕카멘스핑크스|Сфинкс Тутанхамон|तूतनख़ामुन स्फ़िंक्स|أبو الهول توت'),
    ],
    morris: [
      b('sleepy', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x6ad37a], hat: 'straw', hc: [0xf0d080, 0x6ad37a], held: 'piece' }, '村の芝ひつじ|Village-Green Sheep|村庄草地羊|村莊草地羊|마을잔디양|Овечка с деревенской лужайки|गाँव का मेमना|خروف المرج'),
      b('priest', { a: 'mouse', c: [0xc8c0b8, 0xfff4ee, 0x7a5a3a], hat: 'hood', hc: [0x7a5a3a], held: 'book', ex: ['robe'], rc: 0x7a5a3a }, '回廊ネズミ|Cloister Mouse|回廊鼠|迴廊鼠|회랑쥐|Мышь из галереи|मठ चूहा|فأر الرواق'),
      b('hothead', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xc83a4a], hat: 'viking', held: 'shield', ex: ['beard'], bc: 0xd8902a }, 'ゴクスタ船クマ|Gokstad Bear|戈克斯塔熊|戈克斯塔熊|곡스타곰|Медведь из Гокстада|गोक्स्टाड भालू|دب غوكستاد'),
      b('villain', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0xc83a4a], beak: 0xffc040, hat: 'laurel', held: 'sword', ex: ['cape', 'armor'], cape: 0xc83a4a }, 'ローマ皇帝ワシ|Caesar Eagle|罗马皇帝鹰|羅馬皇帝鷹|로마황제독수리|Орёл-цезарь|सीज़र गरुड़|نسر القيصر'),
    ],
    connect4: [
      b('sleepy', { a: 'penguin', c: [0x3a4a6a, 0xfbfaf4, 0xffd65a], hat: 'cap', hc: [0xe83a3a], held: 'disc' }, 'おもちゃ屋ペンギン|Toy-Shop Penguin|玩具店企鹅|玩具店企鵝|장난감가게펭귄|Пингвин из магазина игрушек|खिलौना-दुकान पेंगुइन|بطريق متجر الألعاب'),
      b('pirate', { a: 'bird', c: [0x46c870, 0xf0ffe8, 0xe83a3a], beak: 0xffb03a, hat: 'tricorne', held: 'disc', ex: ['scarf'], sc: 0xe83a3a }, 'キャプテンオウム|Captain Parrot|船长鹦鹉|船長鸚鵡|캡틴앵무새|Капитан-попугай|कप्तान तोता|الببغاء القبطان'),
      b('villain', { a: 'lizard', c: [0x8a5ad8, 0xe8dcff, 0xffd65a], hat: 'helmet', hc: [0xffd65a, 0xc8ccd8], held: 'orb', ex: ['cape', 'glasses'], cape: 0x2a1a4a }, '完全解析リザード|Solver Lizard|解谜蜥蜴|解謎蜥蜴|완전해석도마뱀|Ящер-решатель|हल करने वाली छिपकली|سحلية الحل الكامل'),
    ],
    dots: [
      b('sleepy', { a: 'mouse', c: [0xe0d8d0, 0xfff6f0, 0x3a8ad8], held: 'book', ex: ['scarf'], sc: 0x3a8ad8 }, 'ノートのはじっこネズミ|Notebook Mouse|笔记本角落鼠|筆記本角落鼠|공책구석쥐|Мышь с полей тетради|नोटबुक चूहा|فأر الدفتر'),
      b('trickster', { a: 'cat', c: [0xffb8a0, 0xfff4ee, 0x3a6ad8], hat: 'beret', hc: [0x2a3a6a], held: 'quill', ex: ['scarf'], sc: 0xe83a3a }, 'ピポピペットネコ|Pipopipette Cat|皮波皮佩特猫|皮波皮佩特貓|피포피페트고양이|Кот Пипопипетт|पिपोपिपेट बिल्ली|قط بيبوبيبيت'),
      b('scholar', { a: 'goat', c: [0xf0ece0, 0xffffff, 0x2a2a38], hat: 'tophat', held: 'book', ex: ['mustache'], bc: 0x5a4030 }, 'リュカヤギ|Lucas Goat|卢卡斯山羊|盧卡斯山羊|뤼카염소|Козёл Люка|लूका बकरी|ماعز لوكا'),
      b('sage', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x5a7ad8], hat: 'wizard', hc: [0x5a7ad8, 0xffd65a], held: 'staff', ex: ['longbeard'] }, '長鎖の大賢者カメ|Long-Chain Sage Turtle|长链大贤龟|長鏈大賢龜|긴사슬대현자거북|Черепаха-мудрец длинных цепей|लंबी कड़ी ऋषि कछुआ|سلحفاة حكيم السلاسل الطويلة'),
    ],
    mancala: [
      b('sleepy', { a: 'goat', c: [0xe8d8c0, 0xfff6ea, 0x46a070], held: 'seeds', ex: ['scarf'], sc: 0x46a070 }, 'サバンナこやぎ|Savanna Kid|草原小山羊|草原小山羊|사바나아기염소|Козлёнок саванны|सवाना मेमना|جدي السافانا'),
      b('merchant', { a: 'boar', c: [0x9a7a6a, 0xf0dcd0, 0xff9a3a], hat: 'straw', hc: [0xf0d080, 0xff9a3a], held: 'seeds' }, 'イボイノシシ商人|Warthog Trader|疣猪商人|疣豬商人|혹멧돼지상인|Бородавочник-торговец|वॉर्टहॉग व्यापारी|تاجر الخنزير الثؤلولي'),
      b('cool', { a: 'cat', c: [0xf0c060, 0xfff4e0, 0x2a8a4a], held: 'seeds', ex: ['scarf', 'necklace'], sc: 0xffc030 }, 'アシャンティヒョウ|Ashanti Leopard|阿散蒂豹|阿散蒂豹|아샨티표범|Леопард ашанти|अशांति तेंदुआ|فهد الأشانتي'),
      b('king', { a: 'lion', c: [0xe8b060, 0xfff0d8, 0x2a8a4a], hat: 'bigcrown', held: 'seeds', ex: ['robe', 'cape'], rc: 0xffc030, cape: 0x2a8a4a }, 'バオ大王ライオン|Bao King Lion|巴奥狮王|巴奧獅王|바오대왕사자|Лев — король бао|बाओ राजा शेर|الأسد ملك الباو'),
    ],
    backgammon: [
      b('sleepy', { a: 'rabbit', c: [0xe8d0a8, 0xfff6ea, 0xd8a040], hat: 'turban', hc: [0xd8a040, 0xffd65a], held: 'die' }, '焼けた町のウサギ|Burnt-City Hare|焚城野兔|焚城野兔|불탄도시토끼|Заяц Сожжённого города|जले शहर का खरगोश|أرنب المدينة المحروقة'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0x3a6ad8], hat: 'turban', hc: [0x3a6ad8, 0xffd65a], held: 'die' }, 'ナルドラクダ|Nard Camel|纳尔德骆驼|納爾德駱駝|나르드낙타|Верблюд нардов|नर्द ऊँट|جمل النرد'),
      b('scholar', { a: 'owl', c: [0x9a8070, 0xf4eadc, 0x46a0a0], hat: 'turban', hc: [0x46a0a0, 0xffd65a], held: 'die', ex: ['longbeard'] }, 'ボゾルグメフルフクロウ|Bozorgmehr Owl|博佐尔格梅尔猫头鹰|博佐爾格梅爾貓頭鷹|보조르그메르부엉이|Сова Бозоргмехр|बोज़ोर्गमेहर उल्लू|بومة بزرجمهر'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xfbfaf4], hat: 'laurel', held: 'die', ex: ['robe', 'cape'], rc: 0xfbfaf4, cape: 0x8a3ad8 }, 'クラウディウスライオン|Claudius Lion|克劳狄狮|克勞狄獅|클라우디우스사자|Лев Клавдий|क्लॉडियस शेर|أسد كلوديوس'),
    ],
    hex: [
      b('sleepy', { a: 'bear', c: [0xe8b060, 0xfff0d8, 0xffd65a], held: 'hex', ex: ['scarf'], sc: 0xff8a3a }, 'はちみつコグマ|Honey Cub|蜂蜜小熊|蜂蜜小熊|꿀아기곰|Медовый медвежонок|शहद भालू|دبدوب العسل'),
      b('trickster', { a: 'cat', c: [0xfaf6f0, 0xffffff, 0xe83a3a], hat: 'beret', hc: [0xe83a3a], held: 'hex', ex: ['scarf'], sc: 0xe83a3a }, 'コペンハーゲンネコ|Copenhagen Cat|哥本哈根猫|哥本哈根貓|코펜하겐고양이|Копенгагенский кот|कोपेनहेगन बिल्ली|قطة كوبنهاغن'),
      b('scholar', { a: 'owl', c: [0x8a7a6a, 0xf4ece0, 0x3a6ad8], held: 'quill', ex: ['glasses'] }, 'ピート・ハインフクロウ|Piet Hein Owl|皮特海因猫头鹰|皮特海因貓頭鷹|피트하인부엉이|Сова Пит Хейн|पीट हाइन उल्लू|بومة بيت هاين'),
      b('merchant', { a: 'dog', c: [0xd8b890, 0xfff6ea, 0x3a6ad8], hat: 'cap', hc: [0x3a6ad8], held: 'scroll' }, 'ポリティケン新聞イヌ|Politiken Pup|政治报小狗|政治報小狗|폴리티켄강아지|Щенок из «Политикен»|पोलिटिकन पिल्ला|جرو بوليتيكن'),
      b('cool', { a: 'cat', c: [0x8a8a9a, 0xe8e8f0, 0xff8a3a], held: 'book', ex: ['scarf'], sc: 0xff8a3a }, 'ナッシュネコ|Nash Cat|纳什猫|納許貓|내시고양이|Кот Нэш|नैश बिल्ली|قط ناش'),
      b('knight', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0x3a6ad8], beak: 0xffc040, hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'shield' }, '六角の騎士タカ|Hex Knight Hawk|六角骑士鹰|六角騎士鷹|육각기사매|Ястреб-рыцарь гексов|हेक्स शूरवीर बाज़|صقر فارس السداسيات'),
      b('villain', { a: 'dragon', c: [0xe83a3a, 0xffe0d8, 0x3a6ad8], hat: 'bigcrown', held: 'hex', ex: ['cape'], cape: 0x3a6ad8 }, '先手必勝ドラゴン|Strategy-Stealer Dragon|先手必胜龙|先手必勝龍|선수필승드래곤|Дракон кражи стратегии|रणनीति-चोर ड्रैगन|تنين سرقة الاستراتيجية'),
    ],
    fanorona: [
      b('sleepy', { a: 'monkey', c: [0xb8b8c0, 0xffffff, 0x2a2a38], held: 'stone', ex: ['scarf'], sc: 0xff8a3a }, 'ワオキツネザルの子|Ring-Tail Lemur Kid|环尾狐猴宝宝|環尾狐猴寶寶|아기호랑꼬리여우원숭이|Детёныш кошачьего лемура|रिंग-टेल लेमूर शिशु|صغير الليمور حلقي الذيل'),
      b('merchant', { a: 'bull', c: [0xe8e0d8, 0xffffff, 0xd83a4a], held: 'stone', ex: ['hump', 'scarf'], sc: 0xd83a4a }, 'ゼブ牛商人|Zebu Trader|瘤牛商人|瘤牛商人|제부소상인|Зебу-торговец|ज़ेबू व्यापारी|تاجر الزيبو'),
      b('trickster', { a: 'lizard', c: [0x6ad070, 0xf0ffe0, 0xff6b9a], held: 'stone', eyes: 'bead' }, 'カメレオンいたずら|Chameleon Trickster|变色龙捣蛋鬼|變色龍搗蛋鬼|카멜레온장난꾸러기|Хамелеон-проказник|गिरगिट नटखट|الحرباء المشاغبة'),
      b('scholar', { a: 'mouse', c: [0x5a4a40, 0xc8b8a8, 0xffd65a], held: 'book', ex: ['glasses'] }, 'アイアイ博士|Aye-Aye Professor|指猴博士|指猴博士|아이아이박사|Профессор ай-ай|आय-आय प्रोफ़ेसर|البروفيسور آي آي'),
      b('cool', { a: 'cat', c: [0xb07040, 0xf0d8c0, 0x2a2a38], held: 'stone', ex: ['scarf'], sc: 0x2a2a38 }, 'フォッサ|Fossa|马岛獴|馬島獴|포사|Фосса|फ़ोसा|الفوسا'),
      b('hothead', { a: 'bird', c: [0x8a7a60, 0xf0e6d0, 0x6a9a5a], beak: 0x8a8a8a, held: 'stone', ex: ['crest'] }, 'ゾウチョウ|Elephant Bird|象鸟|象鳥|코끼리새|Эпиорнис|हाथी पक्षी|الطائر الفيل'),
      b('king', { a: 'monkey', c: [0x2a2a33, 0xfbfaf4, 0xffd65a], hat: 'bigcrown', held: 'staff', ex: ['robe', 'cape'], rc: 0xfbfaf4, cape: 0xd83a4a }, 'インドリ王|King Indri|大狐猴王|大狐猴王|인드리왕|Король индри|राजा इंद्री|الملك إندري'),
    ],
    ugolki: [
      b('sleepy', { a: 'bear', c: [0x9a7a5a, 0xf4e6d0, 0xd83a4a], hat: 'ushanka', hc: [0x6a5040, 0xfff4e6], held: 'piece' }, 'ウシャンカこぐま|Ushanka Cub|护耳帽小熊|護耳帽小熊|우샨카아기곰|Медвежонок в ушанке|उशांका भालू|دبدوب الأوشانكا'),
      b('merchant', { a: 'fox', c: [0xff8a3a, 0xfff4e6, 0xd83a4a], hat: 'ushanka', hc: [0xd83a4a, 0xfff4e6], held: 'tea' }, 'サモワールギツネ|Samovar Fox|茶炊狐|茶炊狐|사모바르여우|Лиса с самоваром|समोवर लोमड़ी|ثعلب السماور'),
      b('lady', { a: 'rabbit', c: [0xfaf6f2, 0xffffff, 0xd83a4a], hat: 'kokoshnik', hc: [0xd83a4a], held: 'fan', ex: ['necklace'] }, 'マトリョーシカうさぎ|Matryoshka Bunny|套娃兔|套娃兔|마트료시카토끼|Кролик-матрёшка|मात्र्योश्का खरगोश|أرنبة الماتريوشكا'),
      b('scholar', { a: 'dog', c: [0xd8c0a0, 0xfff6ea, 0x3a6ad8], hat: 'tophat', held: 'book', ex: ['glasses', 'mustache'] }, 'モンクス博士イヌ|Dr. Monks Pup|蒙克斯博士犬|蒙克斯博士犬|몽크스박사개|Пёс доктор Монкс|डॉ. मॉन्क्स पिल्ला|جرو الدكتور مونكس'),
      b('hothead', { a: 'horse', c: [0xfbfaf4, 0xffffff, 0x3a6ad8], held: 'flag', ex: ['horsemane', 'scarf'], sc: 0x3a6ad8 }, 'トロイカうま|Troika Horse|三驾马车马|三駕馬車馬|트로이카말|Конь-тройка|ट्रोइका घोड़ा|حصان الترويكا'),
      b('trickster', { a: 'cat', c: [0x3a3440, 0x5a5466, 0x8a3ad8], hat: 'hood', hc: [0x8a3ad8], held: 'broom', mouth: 'w' }, 'ババヤガネコ|Baba Yaga Cat|雅加婆婆猫|雅加婆婆貓|바바야가고양이|Кот Бабы-яги|बाबा यागा बिल्ली|قط بابا ياغا'),
      b('knight', { a: 'bear', c: [0x7a5a46, 0xf0dcc8, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffd65a], held: 'sword', ex: ['armor', 'cape'], cape: 0xd83a4a }, 'ボガトィーリグマ|Bogatyr Bear|勇士熊|勇士熊|보가티리곰|Медведь-богатырь|बोगातिर भालू|دب البوغاتير'),
      b('villain', { a: 'wolf', c: [0x5a5a6a, 0xc8c8d8, 0x46e0a0], hat: 'bigcrown', held: 'orb', ex: ['cape'], cape: 0x2a2a38 }, 'コシチェイ狼|Koschei Wolf|不死科谢伊狼|不死科謝伊狼|코셰이늑대|Волк Кощей|कोश्चेई भेड़िया|ذئب كوشي'),
    ],
    agon: [
      b('sleepy', { a: 'mouse', c: [0xe0d8d0, 0xfff6f0, 0xff8fb0], hat: 'bonnet', hc: [0xfff4f8, 0xff8fb0], held: 'piece' }, 'ボンネットねずみ|Bonnet Mouse|软帽鼠|軟帽鼠|보닛쥐|Мышка в чепце|बोनट चूहा|فأر القلنسوة'),
      b('merchant', { a: 'dog', c: [0xd8b890, 0xfff6ea, 0x2a2a38], hat: 'tophat', held: 'goblet', ex: ['monocle'] }, '紳士イヌ|Gentleman Dog|绅士犬|紳士犬|신사개|Пёс-джентльмен|सज्जन कुत्ता|الكلب النبيل'),
      b('lady', { a: 'cat', c: [0xfaf6f2, 0xffffff, 0x8a5ad8], hat: 'tiara', held: 'fan', ex: ['necklace'] }, '貴婦人ネコ|Lady Cat|贵妇猫|貴婦貓|귀부인고양이|Кошка-леди|कुलीन बिल्ली|القطة السيدة'),
      b('scholar', { a: 'owl', c: [0x8a7a6a, 0xf4ece0, 0x2a2a38], hat: 'mortar', held: 'book', ex: ['monocle'] }, '博物館フクロウ|Museum Owl|博物馆猫头鹰|博物館貓頭鷹|박물관부엉이|Музейная сова|संग्रहालय उल्लू|بومة المتحف'),
      b('knight', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xd83a4a], hat: 'bearskin', hc: [0x1e1e26, 0xffd65a], held: 'sword', ex: ['armor'], ac: 0xd83a4a }, '近衛兵グマ|Queen\'s Guard Bear|御林军熊|御林軍熊|근위병곰|Медведь-гвардеец|शाही रक्षक भालू|دب الحرس الملكي'),
      b('cool', { a: 'bird', c: [0x2a8ad8, 0xc8e8ff, 0x46c890], beak: 0x5a5a6a, held: 'fan', ex: ['crest'] }, '水晶宮クジャク|Crystal Palace Peacock|水晶宫孔雀|水晶宮孔雀|수정궁공작|Павлин Хрустального дворца|क्रिस्टल पैलेस मोर|طاووس القصر البلوري'),
      b('hothead', { a: 'bull', c: [0xc8703a, 0xf4dcc0, 0x3a6ad8], hat: 'tophat', hc: [0x3a3a48, 0xd83a4a], held: 'flag', ex: ['scarf'], sc: 0x3a6ad8 }, 'ジョン・ブル|John Bull|约翰牛|約翰牛|존불|Джон Булль|जॉन बुल|جون بول'),
      b('lady', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x6a3ad8], hat: 'bigcrown', held: 'staff', ex: ['cape', 'necklace'], cape: 0x6a3ad8 }, 'ヴィクトリア女王ライオン|Queen Victoria Lion|维多利亚女王狮|維多利亞女王獅|빅토리아여왕사자|Львица королева Виктория|महारानी विक्टोरिया शेरनी|اللبؤة الملكة فيكتوريا'),
    ],
    // amazons (2026-11-11 the user: the Amazon feel up front) — the rainforest of the Amazon and the Amazon warriors of the Greek
    // myths: bows and the game's fire arrows; the top two are the myths' queens Penthesilea and Hippolyta
    amazons: [
      b('sleepy', { a: 'otter', c: [0x7a5238, 0xf0d8b8, 0x3aa86a], held: 'arrow', ex: ['necklace'] }, 'オオカワウソ|Giant Otter|大水獭|大水獺|큰수달|Гигантская выдра|विशाल ऊदबिलाव|ثعلب الماء العملاق'),
      b('trickster', { a: 'monkey', c: [0xd8a048, 0xfff0d8, 0x3aa86a], hat: 'feathers', hc: [0x3aa86a, 0xffd65a], held: 'bow', mouth: 'w' }, 'リスザルの射手|Squirrel Monkey Archer|松鼠猴射手|松鼠猴射手|다람쥐원숭이궁수|Беличья обезьяна-лучник|गिलहरी बंदर तीरंदाज़|قرد السنجاب الرامي'),
      b('merchant', { a: 'bird', c: [0x2a2a30, 0xfff2d0, 0xff8a2a], beak: 0xff8a2a, hat: 'feathers', hc: [0xff8a2a, 0x3aa86a], held: 'arrow', ex: ['necklace'] }, 'オオハシ商人|Toucan Trader|巨嘴鸟商人|巨嘴鳥商人|큰부리새상인|Тукан-торговец|टूकेन व्यापारी|الطوقان التاجر'),
      b('lady', { a: 'frog', c: [0x2a7ae8, 0xbfe4ff, 0xffd030], hat: 'flowers', held: 'bow', ex: ['necklace'] }, 'ヤドクガエル|Dart Frog|箭毒蛙|箭毒蛙|독화살개구리|Древолаз|डार्ट मेंढक|ضفدع السهم'),
      b('cool', { a: 'hawk', c: [0x8a8e96, 0xf4f4f0, 0x2a2a30], beak: 0x2a2a30, hat: 'feathers', hc: [0x2a2a30, 0xc8ccd8], held: 'bow', ex: ['crest'] }, 'オウギワシ|Harpy Eagle|角雕|角鵰|부채머리수리|Гарпия|हार्पी ईगल|عقاب الهاربي'),
      b('knight', { a: 'jaguar', c: [0xe8b058, 0xfff2d8, 0xc83a3a], hat: 'helmet', hc: [0xc83a3a, 0xd8c8a0], held: 'bow', ex: ['armor', 'necklace'] }, 'ジャガー戦士|Jaguar Warrior|美洲豹战士|美洲豹戰士|재규어전사|Ягуар-воин|जगुआर योद्धा|المحارب الجاغوار'),
      b('hothead', { a: 'horse', c: [0xf4f0e8, 0xfffaf2, 0xb83a3a], hat: 'helmet', hc: [0xb83a3a, 0xd8b048], held: 'shield', ex: ['armor', 'cape'], cape: 0xb83a3a, brow: 1 }, 'ペンテシレイア|Penthesilea|彭忒西勒亚|彭忒西勒亞|펜테실레이아|Пентесилея|पेंथेसिलिया|بنثيسيليا'),
      b('king', { a: 'jaguar', c: [0xf0b850, 0xfff4dc, 0xd8a020], hat: 'crown', held: 'bow', ex: ['cape', 'necklace', 'armor'], cape: 0x2a8a5a }, '女王ヒッポリュテ|Queen Hippolyta|希波吕忒女王|希波呂忒女王|히폴리테여왕|Царица Ипполита|रानी हिप्पोलिटा|الملكة هيبوليتا'),
    ],
    konane: [
      b('sleepy', { a: 'seal', c: [0x9aa0aa, 0xe8ecf0, 0xff8fb0], hat: 'flowers', held: 'stone' }, 'モンクアザラシ|Monk Seal|僧海豹|僧海豹|몽크물범|Тюлень-монах|मंक सील|فقمة الراهب'),
      b('merchant', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x5a8a5a], held: 'stone', ex: ['necklace'] }, 'ホヌ|Honu|霍努海龟|霍努海龜|호누|Хону|होनू|هونو'),
      b('trickster', { a: 'bird', c: [0xc8b8a0, 0xf6eee0, 0x2a2a38], beak: 0x2a2a38, held: 'stone' }, 'ネネ|Nene|夏威夷雁|夏威夷雁|네네|Нене|नेने|نيني'),
      b('hothead', { a: 'boar', c: [0x6a5a5a, 0xd8c8c8, 0xffd65a], held: 'stone', ex: ['necklace'] }, 'カマプアア|Kamapua\'a|卡玛普阿阿|卡瑪普阿阿|카마푸아아|Камапуаа|कामापुआ|كاماپوعا'),
      b('lady', { a: 'rabbit', c: [0xfaf2ea, 0xffffff, 0xff8fb0], hat: 'flowers', held: 'fan', ex: ['necklace'] }, 'フラうさぎ|Hula Bunny|草裙舞兔|草裙舞兔|훌라토끼|Кролик хула|हुला खरगोश|أرنبة الهولا'),
      b('cool', { a: 'hawk', c: [0x6a5a4a, 0xe8dcc8, 0xffd65a], beak: 0xffc040, held: 'stone' }, 'イオ鷹|\'Io Hawk|夏威夷鹰|夏威夷鷹|이오매|Ястреб ио|इओ बाज़|صقر إيو'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xffd030], hat: 'helmet', hc: [0xffd030, 0xe83a3a], held: 'staff', ex: ['cape'], cape: 0xe83a3a }, 'カメハメハ大王グマ|Kamehameha Bear|卡美哈梅哈熊|卡美哈梅哈熊|카메하메하곰|Медведь Камехамеха|कामेहामेहा भालू|دب كاميهاميها'),
      b('priest', { a: 'lizard', c: [0xe84a3a, 0xffe0c8, 0xffc030], hat: 'flowers', held: 'orb', ex: ['cape', 'necklace'], cape: 0x2a2a38 }, '火の女神ペレ|Pele Fire Spirit|火之女神佩蕾|火之女神佩蕾|불의여신펠레|Огненная Пеле|अग्नि देवी पेले|روح النار بيليه'),
    ],
    ludo: [
      b('sleepy', { a: 'monkey', c: [0xc8c0b8, 0xfff4ee, 0xff8a3a], held: 'die', ex: ['scarf'], sc: 0xff8a3a }, 'ラングールのこざる|Langur Kid|叶猴宝宝|葉猴寶寶|랑구르아기원숭이|Детёныш лангура|लंगूर शिशु|صغير اللانغور'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0xe83a5a], hat: 'turban', hc: [0xe83a5a, 0xffd65a], held: 'die' }, 'ラジャスタンラクダ|Rajasthan Camel|拉贾斯坦骆驼|拉賈斯坦駱駝|라자스탄낙타|Раджастханский верблюд|राजस्थानी ऊँट|جمل راجستان'),
      b('trickster', { a: 'cat', c: [0xf0b060, 0xfff4e0, 0x3a9a5a], held: 'die', ex: ['scarf'], sc: 0x3a9a5a, mouth: 'w' }, 'チョウパルネコ|Chaupar Cat|乔帕尔猫|喬帕爾貓|초파르고양이|Кот чаупар|चौपड़ बिल्ली|قط الشوبار'),
      b('scholar', { a: 'dog', c: [0xd8c0a0, 0xfff6ea, 0x3a6ad8], hat: 'tophat', held: 'book', ex: ['monocle'] }, '特許イヌ|Patent Pup|专利小狗|專利小狗|특허강아지|Патентный щенок|पेटेंट पिल्ला|جرو براءة الاختراع'),
      b('cool', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x2a2a38], held: 'die', ex: ['necklace'] }, 'ベンガルトラ|Bengal Tiger|孟加拉虎|孟加拉虎|벵골호랑이|Бенгальский тигр|बंगाल टाइगर|نمر البنغال'),
      b('knight', { a: 'elephant', c: [0xb8bcd0, 0xf0f2fa, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffd65a], held: 'shield', ex: ['armor'], ac: 0xd83a4a }, '戦象|War Elephant|战象|戰象|전투코끼리|Боевой слон|युद्ध हाथी|فيل الحرب'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xe83a5a], hat: 'turban', hc: [0xfbfaf4, 0xffd65a], held: 'die', ex: ['cape', 'necklace', 'longbeard'], bc: 0x3a3040, cape: 0x2a8a4a }, 'アクバル大帝ライオン|Akbar the Great Lion|阿克巴大帝狮|阿克巴大帝獅|아크바르대제사자|Лев Акбар Великий|अकबर महान शेर|أسد أكبر العظيم'),
    ],
    carrom: [
      b('sleepy', { a: 'squirrel', c: [0xb89a7a, 0xfff0dc, 0x2a2a38], held: 'striker' }, 'ヤシリス|Palm Squirrel|棕榈松鼠|棕櫚松鼠|야자다람쥐|Пальмовая белка|गिलहरी|سنجاب النخيل'),
      b('merchant', { a: 'bird', c: [0x46c870, 0xf0ffe8, 0xe83a3a], beak: 0xe83a3a, held: 'striker', ex: ['necklace'] }, 'ベランダオウム|Veranda Parrot|阳台鹦鹉|陽台鸚鵡|베란다앵무새|Попугай с веранды|बरामदे का तोता|ببغاء الشرفة'),
      b('trickster', { a: 'monkey', c: [0xb07a50, 0xffe0c8, 0xffd65a], hat: 'cap', hc: [0xff8a3a], held: 'striker', mouth: 'w' }, 'はじきザル|Flick Monkey|弹指猴|彈指猴|튕기기원숭이|Обезьяна-щелчок|फ़्लिक बंदर|قرد النقرة'),
      b('hothead', { a: 'bull', c: [0xfbfaf4, 0xffffff, 0xff8a3a], held: 'striker', ex: ['hump', 'necklace'] }, 'ストライカーうし|Striker Bull|击球牛|擊球牛|스트라이커소|Бык-биток|स्ट्राइकर बैल|ثور الضارب'),
      b('cool', { a: 'cat', c: [0xf0c060, 0xfff4e0, 0x2a2a38], held: 'striker', ex: ['scarf'], sc: 0x2a2a38 }, 'ヒョウの名手|Leopard Ace|豹子高手|豹子高手|표범고수|Леопард-ас|तेंदुआ उस्ताद|الفهد البارع'),
      b('lady', { a: 'bird', c: [0x2a6ad8, 0xc8e0ff, 0x46c890], beak: 0x5a5a6a, hat: 'tiara', held: 'fan', ex: ['crest', 'necklace'] }, 'クイーンクジャク|Queen Peacock|女王孔雀|女王孔雀|여왕공작|Павлиниха-королева|रानी मोरनी|الطاووسة الملكة'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xd83a4a], hat: 'turban', hc: [0xd83a4a, 0xffd65a], held: 'striker', ex: ['cape', 'necklace'], cape: 0x6a3ad8 }, 'マハラジャライオン|Maharaja Lion|王公狮|王公獅|마하라자사자|Лев-махараджа|महाराजा शेर|أسد المهراجا'),
    ],
    hockey: [
      b('sleepy', { a: 'penguin', c: [0x2a2f3a, 0xffffff, 0x2f6fd0], held: 'disc', ex: ['scarf'], sc: 0x2f6fd0 }, 'リンクのペンギン|Rink Penguin|冰场企鹅|冰場企鵝|링크펭귄|Пингвин с катка|रिंक पेंगुइन|بطريق الحلبة'),
      b('merchant', { a: 'otter', c: [0x9a6a48, 0xf4e2c8, 0xff6b3a], hat: 'cap', hc: [0xff6b3a], held: 'disc' }, 'ゲーセンのカワウソ|Arcade Otter|游戏厅水獭|遊樂場水獺|오락실수달|Выдра из автоматов|आर्केड ऊदबिलाव|ثعلب الماء في الصالة'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x2f6fd0], hat: 'cap', hc: [0x2f6fd0], held: 'disc', mouth: 'w' }, 'パックさばきギツネ|Puckhandler Fox|控球狐|控球狐|퍽다루기여우|Лис-дриблёр|पक लोमड़ी|ثعلب القرص'),
      b('cool', { a: 'wolf', c: [0x8a94a8, 0xeef0f6, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffffff], held: 'shield' }, 'ゴーリーウルフ|Goalie Wolf|守门狼|守門狼|골리늑대|Волк-вратарь|गोलकीपर भेड़िया|الذئب الحارس'),
      b('hothead', { a: 'bull', c: [0x6a4a3a, 0xf0dcc8, 0xd83a4a], hat: 'helmet', hc: [0x2f6fd0, 0xffffff], held: 'disc', ex: ['necklace'] }, 'スラップショットうし|Slapshot Bull|大力抽射牛|大力抽射牛|슬랩샷소|Бык-щелчок|स्लैपशॉट बैल|ثور الضربة'),
      b('scholar', { a: 'owl', c: [0xb08a68, 0xf6e6cc, 0x2f6fd0], held: 'book', ex: ['glasses'] }, 'エアテーブル博士|Dr. Air-Table|空气台博士|空氣台博士|에어테이블박사|Доктор Аэростол|डॉ. एयर-टेबल|الدكتور طاولة الهواء'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xd83a4a], hat: 'crown', held: 'disc', ex: ['cape', 'scarf'], cape: 0xd83a4a, sc: 0xffffff }, 'マンロー大王グマ|Munro the Great Bear|芒罗大王熊|芒羅大王熊|먼로대왕곰|Медведь Манро Великий|महान मुनरो भालू|الدب مونرو العظيم'),
    ],
    crokinole: [
      b('sleepy', { a: 'beaver', c: [0x8a5a3a, 0xf0dcc0, 0xc8282e], hat: 'cap', hc: [0xc8282e], held: 'disc' }, 'ログハウスビーバー|Cabin Beaver|小木屋河狸|小木屋河狸|통나무집비버|Бобр из хижины|केबिन ऊदबिलाव|قندس الكوخ'),
      b('merchant', { a: 'rabbit', c: [0xf4f0ea, 0xffffff, 0x2a6ad8], held: 'disc', ex: ['scarf'], sc: 0xc8282e }, 'カンジキウサギ|Snowshoe Hare|雪鞋兔|雪鞋兔|눈신토끼|Заяц-беляк|स्नोशू खरगोश|أرنب الثلج'),
      b('trickster', { a: 'fox', c: [0xe8742a, 0xfff4e6, 0xc8282e], hat: 'cap', hc: [0xc8282e], held: 'disc', mouth: 'w' }, 'メープルギツネ|Maple Fox|枫叶狐|楓葉狐|단풍여우|Кленовый лис|मेपल लोमड़ी|ثعلب القيقب'),
      b('scholar', { a: 'owl', c: [0xf4f4f0, 0xffffff, 0x2a2a38], held: 'book', ex: ['glasses'] }, 'シロフクロウ審判|Snowy Owl Referee|雪鸮裁判|雪鴞裁判|흰올빼미심판|Полярная сова-судья|हिम उल्लू रेफ़री|البومة الثلجية الحكم'),
      b('hothead', { a: 'deer', c: [0x6a4a30, 0xd8c0a0, 0x3a2a1a], hat: 'antlers', held: 'disc' }, 'ヘラジカ|Moose|驼鹿|駝鹿|무스|Лось|मूस|الموظ'),
      b('cool', { a: 'bird', c: [0x1a1a22, 0xf4f4f4, 0xc8282e], beak: 0x2a2a30, held: 'disc', ex: ['necklace'] }, 'ハシグロアビ|Common Loon|普通潜鸟|普通潛鳥|아비|Полярная гагара|लून पक्षी|الغواص'),
      b('king', { a: 'bear', c: [0x7a5a3a, 0xf0dcc0, 0xc8282e], hat: 'tophat', hc: [0x2a2a38, 0xc8282e], held: 'hammer', ex: ['longbeard', 'cape'], bc: 0xd8d0c8, cape: 0xc8282e }, 'ウェットラウファーグマ|Wettlaufer Bear|韦特劳弗熊|韋特勞弗熊|베틀라우퍼곰|Медведь Ветлауфер|वेटलॉफ़र भालू|دب فيتلاوفر'),
    ],
    alquerque: [
      b('sleepy', { a: 'cat', c: [0xf0dcc0, 0xfff8ee, 0x3a6ad8], held: 'piece', ex: ['scarf'], sc: 0x3a6ad8 }, '中庭のこねこ|Courtyard Kitten|庭院小猫|庭院小貓|안뜰새끼고양이|Котёнок из патио|आँगन का बिलौटा|قطيطة الفناء'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0x9a2a24], hat: 'turban', hc: [0x9a2a24, 0xffd65a], held: 'scroll' }, 'じゅうたん商ラクダ|Carpet Camel|地毯骆驼|地毯駱駝|양탄자낙타|Ковровый верблюд|कालीन ऊँट|جمل السجاد'),
      b('scholar', { a: 'owl', c: [0x9a8070, 0xf4eadc, 0x2a6a6a], hat: 'turban', hc: [0x2a6a6a, 0xffd65a], held: 'book', ex: ['longbeard'] }, 'イスファハーニーフクロウ|Isfahani Owl|伊斯法哈尼猫头鹰|伊斯法哈尼貓頭鷹|이스파하니부엉이|Сова Исфахани|इस्फ़हानी उल्लू|بومة الأصفهاني'),
      b('cool', { a: 'hawk', c: [0x9a7a5a, 0xf4e6d0, 0x2a2a38], beak: 0xffc040, held: 'none', ex: ['scarf'], sc: 0x9a2a24 }, '鷹匠のハヤブサ|Falconer\'s Falcon|驯鹰人的隼|馴鷹人的隼|매사냥송골매|Сокол сокольника|बाज़दार का शाहीन|صقر الصقّار'),
      b('knight', { a: 'horse', c: [0xe8d8c0, 0xfff6ea, 0xd8a040], hat: 'helmet', hc: [0xd8a040, 0xc8ccd8], held: 'sword', ex: ['armor', 'horsemane'] }, 'カスティーリャ騎士ウマ|Castilian Knight Horse|卡斯蒂利亚骑士马|卡斯提亞騎士馬|카스티야기사말|Кастильский конь-рыцарь|कास्टिलियन शूरवीर घोड़ा|حصان الفارس القشتالي'),
      b('lady', { a: 'deer', c: [0xe0b080, 0xfff4e6, 0x3a6ad8], hat: 'tiara', held: 'fan', ex: ['necklace'] }, 'アルハンブラのガゼル|Alhambra Gazelle|阿尔罕布拉羚羊|阿爾罕布拉羚羊|알함브라가젤|Газель Альгамбры|अलहम्ब्रा हिरणी|غزالة الحمراء'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x9a2a24], hat: 'crown', held: 'book', ex: ['cape', 'longbeard'], bc: 0x6a4a3a, cape: 0x9a2a24 }, 'アルフォンソ賢王ライオン|Alfonso the Wise Lion|智者阿方索狮|智者阿方索獅|현왕알폰소사자|Лев Альфонсо Мудрый|बुद्धिमान अल्फ़ोंसो शेर|أسد ألفونسو الحكيم'),
    ],
  };
  // a game's boss for an AI level (levels beyond the roster count as the last boss)
  A.band = (g, lv) => { const L = A.BOSSES[g]; if (!L) return -1; return Math.max(0, Math.min(L.length - 1, Math.floor((Math.max(1, lv | 0) - 1) / 3))); };
  A.bossId = (g, i) => `boss-${g}-${i + 1}`;
  // the avatar tier a win at this level gives: 0 = N, 1 = R, 2 = SR (Lv.1 N, 2 R, 3 SR, 4 N …; levels past the roster: SR)
  A.tier = (g, lv) => { const i = A.band(g, lv); return i < 0 ? 2 : Math.max(0, Math.min(2, (Math.max(1, lv | 0) - 1) - i * 3)); };
  A.range = (g, i) => { const lo = i * 3 + 1, hi = Math.min((A.LEVELS[g] || 20), i * 3 + 3); return lo === hi ? 'Lv.' + lo : `Lv.${lo}–${hi}`; };
  // the 50 gacha creatures: how they talk when they come to watch (default: cute)
  A.VOICE = { shogi: 'samurai', knight: 'knight', disc: 'sleepy', tile: 'scholar', stone: 'cool', dot: 'cute', plop: 'cute', gem: 'merchant', dice: 'hothead', owl: 'trickster', crab: 'pirate',
    rook: 'sleepy', bishop: 'priest', pawn: 'cute', ryuou: 'king', keima: 'trickster', flippanda: 'sleepy', goke: 'merchant', renju: 'cute', camel: 'sage', ringsnake: 'cool', joker: 'trickster',
    hedgehog: 'cute', momonga: 'cool', koala: 'sleepy', otter: 'cute', deer: 'lady', seal: 'cute', duck: 'hothead', hamster: 'merchant', piglet: 'cute', beaver: 'hothead', snail: 'sleepy',
    hippo: 'sleepy', mole: 'scholar', crane: 'lady', goat: 'sage', dragonfly: 'hothead', butterfly: 'lady', monkey: 'trickster', teddy: 'cute', bee: 'hothead', marble: 'cute', jelly: 'sleepy',
    redpanda: 'cute', frog: 'cute', ghost: 'trickster', daruma: 'samurai', sealion: 'pirate', hermit: 'scholar' };
})();
