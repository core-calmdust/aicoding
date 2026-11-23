/* =====================================================================
   World Board Game Atlas — AI bosses & table talk: the roster
   One boss per 3 AI levels of every game (Lv.1–3, 4–6, …), modelled on the
   game's homeland or a person from its history; the strongest is UR.
     AtlasNPC.LEVELS[game]   the game's AI levels (as on the portal's board card)
     AtlasNPC.BOSSES[game]   [{ v: voice, m: 3D model spec (avatars/sp-boss.js), n: names }]
     AtlasNPC.band(game, lv) → index of the boss for that level (0 = Lv.1–3)
     AtlasNPC.tier(game, lv) → the avatar a win gives: 0 N / 1 R / 2 SR (Lv.1 N, Lv.2 R, Lv.3 SR, Lv.4 N …), −1 = nothing
     AtlasNPC.CEL[game]      the last level people play; the levels above are celestial (no rewards; their boss is a gacha-only UR)
     AtlasNPC.VOICE[species] the voice of the 50 gacha creatures when they talk at the table
   Titles, lines and trivia (14 languages) live in npc/t/<lang>.js; the talk itself in npc/npc.js.
   Names: 'ja|en|zh|zh-TW|ko|ru|hi|ar' (es fr pt de id tr use the English name).
   ===================================================================== */
(function () {
  'use strict';
  const A = window.AtlasNPC = window.AtlasNPC || {};
  A.LEVELS = { chess: 33, shogi: 30, go: 37, reversi: 36, gomoku: 20, checkers: 20, xiangqi: 20, janggi: 23, tafl: 30, ur: 20, senet: 20, morris: 11,
    connect4: 9, dots: 12, mancala: 11, backgammon: 10, hex: 20, fanorona: 20, ugolki: 28, agon: 28, konane: 26, latrunculi: 26, foxgeese: 20, patolli: 20, ludo: 20, carrom: 20, crokinole: 20, hockey: 20, botao: 20, alquerque: 20, amazons: 28, hitblow: 20, sugoroku: 20, goose: 20 };
  const N = s => { const p = s.split('|'), k = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'ru', 'hi', 'ar'], o = {}; k.forEach((l, i) => { o[l] = p[i] || p[1]; }); ['es', 'fr', 'pt', 'de', 'id', 'tr'].forEach(l => { o[l] = o.en; }); return o; };
  const b = (v, m, n) => ({ v, m, n: N(n) });
  // colours: [body, belly / face, accent]
  A.BOSSES = {
    chess: [
      b('sleepy', { a: 'elephant', c: [0xc4c8e8, 0xfff4ea, 0xff8f5a], hat: 'turban', hc: [0xff8f5a, 0xffd65a], held: 'piece' }, 'チャトラゾウ|Chaturaphant|恰图象|恰圖象|차투라코끼리|Чатурслон|चतुरहाथी|فيل الشطرنج'),
      b('merchant', { a: 'cat', c: [0xecd6b4, 0xfff6ea, 0x3a8ad8], hat: 'fez', hc: [0xc83a4a], held: 'piece', ex: ['scarf'] }, 'シャトランニャ|Shatranjcat|沙特兰猫|沙特蘭貓|샤트란냥|Шатранджкот|शतरंजबिल्ली|قط الشطرنج'),
      b('scholar', { a: 'owl', c: [0xb08a68, 0xf6e6cc, 0x2a8a8a], hat: 'turban', hc: [0x2a8a8a, 0xffd65a], held: 'book', ex: ['glasses'] }, 'アドリホー|Adlihoot|阿德咕|阿德咕|아들리호|Адлихут|अदलीहूट|أدليهوت'),
      b('priest', { a: 'bull', c: [0x9a6a48, 0xf4e2c8, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'book', ex: ['robe'], rc: 0x2a2a38 }, 'ロペモー|Lopemoo|洛佩哞|洛佩哞|로페모|Лопему|लोपेमू|لوبيمو'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x3a9a5a], hat: 'beret', hc: [0xd83a4a], held: 'piece', ex: ['mustache'] }, 'グレコンコ|Grecofox|格雷狐仔|格雷狐仔|그레콘코|Грекофокс|ग्रेकोफ़ॉक्स|غريكوفوكس'),
      b('cool', { a: 'bird', c: [0x9a7056, 0xff9a6a, 0x3a4ad8], hat: 'tricorne', hc: [0x2a3a6a, 0xffd65a], held: 'quill', ex: ['ruff'] }, 'フィリドリ|Philidorbin|菲利多鸟|菲利多鳥|필리도새|Филидрозд|फ़िलिडोर चिड़िया|طائر فيليدور'),
      b('hothead', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xc8702a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'piece', ex: ['cape?'] }, 'モーフィオン|Morphion|莫菲昂|莫菲昂|모피온|Морфион|मॉर्फ़ियन|مورفيون'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0x6a3ad8], hat: 'crown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0xd8d0c8, cape: 0x6a3ad8 }, 'シュタベア|Steinbear|斯坦熊熊|斯坦熊熊|슈타베어|Штайнбер|स्टाइनबेयर|شتاينبير'),
      b('lady', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0xff8fb0], beak: 0xff9a3a, hat: 'laurel', hc: [0x8ad87a], hat2: 'halo', held: 'orb', ex: ['necklace', 'cape'], cape: 0xb88aff }, 'カイッスワン|Caisswan|凯莎鹅|凱莎鵝|카이스완|Кайсвон|कैस्वान|كايسوان'),
      // (2026-11-19: the celestial levels — Pegasus, the winged horse — the knight that leaps, given wings. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'horse', c: [0xdfe4ff, 0xffffff, 0xffc84a], hat: 'laurel', hc: [0xffd65a], hat2: 'halo', held: 'piece', ex: ['horsemane', 'angelwings', 'robe'], rc: 0xfffdf6 }, 'ペガナイト|Pegaknight|天马骑士|天馬騎士|페가나이트|Пеганайт|पेगानाइट|بيغانايت'), { cel: 1 }),
    ],
    shogi: [
      b('sleepy', { a: 'cat', c: [0xf8e8d0, 0xffffff, 0xff8fb0], hat: 'eboshi', held: 'shogi' }, 'ヘイアンニャ|Heiankit|平安喵|平安喵|헤이안냐|Хэйанкит|हेयानकिट|هيانكيت'),
      b('priest', { a: 'deer', c: [0xc8945a, 0xfff4e6, 0x46a0a0], hat: 'antlers', held: 'shogi', ex: ['necklace'] }, 'コウフクジカ|Kofukudeer|兴福鹿鹿|興福鹿鹿|고후쿠지카|Кофукудир|कोफ़ुकुडियर|كوفوكوديير'),
      b('merchant', { a: 'monkey', c: [0xb07a50, 0xffe0c8, 0xd83a4a], hat: 'kasa', held: 'fan' }, 'チュウキッキー|Chukikki|中棋猴宝|中棋猴寶|추킷키|Чукикки|चुकिक्की|تشوكيكي'),
      b('samurai', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x3a6ad8], hat: 'eboshi', held: 'fan', ex: ['robe'], rc: 0x3a6ad8 }, 'ソウケイツネ|Sokeifox|宗桂狐狐|宗桂狐狐|소케이츠네|Сокейфокс|सोकेइफ़ॉक्स|سوكيفوكس'),
      b('scholar', { a: 'rabbit', c: [0xfaf4ee, 0xffffff, 0x6a5ad8], hat: 'eboshi', held: 'scroll', ex: ['robe'], rc: 0x6a5ad8 }, 'カンジュピョン|Kanjubun|看寿兔兔|看壽兔兔|칸주퐁|Канджубан|कांजुबन|كانجوبن'),
      b('cool', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0x2a2a38], beak: 0xffc040, held: 'shogi', ex: ['robe'], rc: 0x2a2a38 }, 'ソウホーク|Sohawk|宗步隼|宗步隼|소호크|Сохок|सोहॉक|سوهوك'),
      b('king', { a: 'tanuki', c: [0x9a7a5a, 0xf4e6d0, 0x8a3ad8], hat: 'kabuto', hc: [0x2a2a38, 0xffd65a], held: 'fan', ex: ['cape'], cape: 0x8a3ad8 }, 'イエヤスヌキ|Ieyasunuki|家康狸狸|家康狸狸|이에야스누키|Иэясунуки|इएयासुनुकी|إيياسونوكي'),
      b('samurai', { a: 'wolf', c: [0x8a8aa0, 0xf0f0f6, 0xc83a4a], hat: 'kabuto', hc: [0xc83a4a, 0xffd65a], held: 'katana', ex: ['armor'], ac: 0xc83a4a }, 'オシロガミ|Shirowolf|御城嗷|御城嗷|오시로가미|Шировулф|शिरोवुल्फ़|شيرووولف'),
      b('villain', { a: 'dragon', c: [0x6a3ad8, 0xe8d8ff, 0xffd65a], hat: 'bigcrown', held: 'shogi', ex: ['cape'], cape: 0x2a1a4a }, 'ギョクドラ|Gyokudra|玉龙宝|玉龍寶|교쿠도라|Гёкудра|ग्योकुड्रा|غيوكودرا'),
      // (2026-11-19: the celestial levels — the moon rabbit of the moon palace (Tsukuyomi, the moon god). Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'rabbit', c: [0xfbfaf4, 0xffffff, 0xffd65a], hat: 'tiara', hc: [0xffd65a], hat2: 'halo', held: 'shogi', ex: ['angelwings', 'robe', 'necklace'], rc: 0xe8e0ff }, 'ツクヨミウサ|Tsukuyobun|月读兔兔|月讀兔兔|쓰쿠요미우사|Цукуёбан|त्सुकुयोबन|تسوكويوبن'), { cel: 1 }),
    ],
    go: [
      b('sleepy', { a: 'panda', c: [0xfbfaf4, 0xffffff, 0xff8fb0], held: 'stone', ex: ['scarf'], sc: 0xff8fb0 }, 'タンシュパン|Danzhupan|丹朱团团|丹朱團團|단슈판|Даньчжупан|दानझूपैन|دانجوبان'),
      b('hothead', { a: 'squirrel', c: [0xc8783a, 0xfff0dc, 0x3a9a5a], hat: 'bandana', hc: [0x3a9a5a], held: 'stone' }, 'ランカリン|Lankirrel|烂柯栗栗|爛柯栗栗|란카린|Ланкирел|लांकिरल|لانكيريل'),
      b('scholar', { a: 'crane', c: [0xfbfaf4, 0xffffff, 0xe83a3a], beak: 0x5a5a6a, hat: 'mortar', held: 'book' }, 'キンキヅル|Kinkizuru|琴棋鹤鹤|琴棋鶴鶴|긴키즈루|Кинкидзуру|किंकिज़ुरु|كينكيزورو'),
      b('sage', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x6a9a5a], hat: 'eboshi', held: 'scroll', ex: ['beard'] }, 'キビコウラ|Kibishell|吉备龟龟|吉備龜龜|키비코라|Кибишелл|किबीशेल|كيبيشيل'),
      b('priest', { a: 'cat', c: [0xb8b8c0, 0xf4f4f8, 0x2a2a38], held: 'stone', ex: ['robe'], rc: 0x3a3040 }, 'サンサニャン|Sansanyan|算砂喵|算砂喵|산사냥|Сансанян|सान्सान्यान|سانسانيان'),
      b('cool', { a: 'owl', c: [0x7a6a5a, 0xf4e6d0, 0x2a2a38], hat: 'eboshi', held: 'stone' }, 'ドウサクロウ|Dosakowl|道策咕咕|道策咕咕|도사쿠로|Досакоул|दोसाकाउल|دوساكاول'),
      b('knight', { a: 'rabbit', c: [0xfffaf6, 0xffffff, 0xe83a3a], held: 'stone', ex: ['scarf'], sc: 0xe83a3a }, 'シュウサギ|Shusabun|秀策兔兔|秀策兔兔|슈사기|Шусабан|शुसाबन|شوسابن'),
      b('hothead', { a: 'bear', c: [0x6a5446, 0xf0dcc8, 0x2a2a38], hat: 'eboshi', held: 'stone' }, 'ジョワベア|Jowabear|丈和熊熊|丈和熊熊|조와베어|Джовабер|जोवाबेयर|جوابير'),
      b('king', { a: 'lion', c: [0xf0c870, 0xfff4e0, 0xffc030], hat: 'bigcrown', held: 'orb', ex: ['robe'], rc: 0xffc030 }, 'ギョウテイオン|Yaolion|尧帝狮宝|堯帝獅寶|교테이온|Яолион|याओलायन|ياوليون'),
      b('sage', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x2a2a38], hat: 'halo', held: 'staff', ex: ['longbeard'] }, 'テントラ|Tentiger|天元虎虎|天元虎虎|덴토라|Тентайгер|टेनटाइगर|تينتايغر'),
      b('villain', { a: 'dragon', c: [0x26262e, 0xfbfaf4, 0xfbfaf4], hat: 'bigcrown', held: 'orb', ex: ['cape'], cape: 0xfbfaf4 }, 'ハクコクリュウ|Yinyangon|黑白龙仙|黑白龍仙|하쿠코쿠류|Иньянгон|यिनयांगॉन|يينيانغون'),
      // (2026-11-19: the celestial levels — a white dove in a black robe, alighting on tengen (the centre point). Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0x2b2b36], beak: 0xff9a7a, hat: 'laurel', hc: [0x8ad87a], hat2: 'halo', held: 'stone', ex: ['angelwings', 'robe'], rc: 0x2b2b36 }, 'テンゲンバト|Tengendove|天元鸽鸽|天元鴿鴿|덴겐바토|Тэнгендав|टेंगेनडव|تينغيندوف'), { cel: 1 }),
    ],
    reversi: [
      b('trickster', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x3a9a5a], hat: 'beret', hc: [0x3a9a5a], held: 'disc' }, 'ロンドメェ|Londolamb|伦敦咩|倫敦咩|론도메|Лондолэмб|लंदोलैम्ब|لوندولامب'),
      b('merchant', { a: 'beaver', c: [0xa0703a, 0xf4dcc0, 0xc83a4a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'disc' }, 'ウォタビー|Watabeave|沃特狸|沃特狸|워타비|Уотабив|वाटाबीव|واتابيف'),
      b('scholar', { a: 'bird', c: [0xa8b0c8, 0xe8ecf6, 0x6a5ad8], hat: 'tophat', hc: [0x3a3a48, 0x6a5ad8], held: 'book', ex: ['monocle'] }, 'モレポッポ|Molletpeep|莫雷咕|莫雷咕|모레폿포|Моллетпип|मॉलेटपीप|موليتبيب'),
      b('hothead', { a: 'rabbit', c: [0xffcad8, 0xffffff, 0xe83a5a], hat: 'bandana', hc: [0xe83a5a], held: 'disc' }, 'ウメピョン|Plumbun|梅梅兔|梅梅兔|우메퐁|Пламбан|प्लमबन|بلامبن'),
      b('lady', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0xff8fb0], beak: 0xff9a3a, hat: 'tiara', held: 'fan', ex: ['necklace'] }, 'デズデスワン|Desdeswan|黛丝鹅|黛絲鵝|데즈데스완|Дездесвон|डेज़्डेस्वान|ديزديسوان'),
      b('knight', { a: 'lion', c: [0x7a5236, 0xf0dcc0, 0x3a3020], hat: 'helmet', hc: [0xc83a4a, 0xc8ccd8], held: 'sword', ex: ['armor', 'cape?'] }, 'オセライオン|Othellion|奥赛狮|奧賽獅|오세라이온|Отеллион|ओथेलियन|أوثيليون'),
      b('trickster', { a: 'fox', c: [0x6a5a7a, 0xe8e0f0, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'disc', mouth: 'w' }, 'イアゴンコ|Iagox|伊阿狐|伊阿狐|이아곤코|Иагокс|इआगॉक्स|إياغوكس'),
      b('scholar', { a: 'cat', c: [0xd8b890, 0xfff4e6, 0x2a2a38], held: 'quill', ex: ['ruff', 'mustache'] }, 'シェイクスピャー|Shakespurr|莎士喵|莎士喵|셰익스퍄|Шекспурр|शेक्सपर|شيكسبر'),
      b('villain', { a: 'bird', c: [0x26262e, 0xfbfaf4, 0x3a6ad8], beak: 0x3a3a48, hat: 'bigcrown', held: 'disc', ex: ['cape'], cape: 0x26262e }, 'カドカササ|Cornerpie|角霸鹊|角霸鵲|카도카사사|Корнерпай|कॉर्नरपाई|كورنرباي'),
      // (2026-11-11: the 10th, for Lv.28 when the AI went to 28 levels — Logistello, the program that beat world champion Takeshi Murakami 6–0 in 1997)
      b('king', { a: 'owl', c: [0x5a6aa8, 0xf6f4ff, 0x3ad8c8], beak: 0xffc040, hat: 'bigcrown', held: 'orb', ex: ['glasses', 'cape'], cape: 0x26305a }, 'ロジステロウ|Logistowl|逻辑咕|邏輯咕|로지스테로|Логистоул|लॉजिस्टाउल|لوجيستاول'),
      // (2026-11-13: the celestial levels Lv.29–36 — beyond what people play; no rewards for a win, the only avatar is a gacha-only UR.
      //  Janus, the Roman god with two faces: one black side, one white, like a disc)
      Object.assign(b('god', { a: 'cat', c: [0xfbfaf4, 0xffffff, 0xffd65a], split: 0x2b2b36, hat: 'laurel', hat2: 'halo', held: 'disc', ex: ['robe', 'belt', 'angelwings'], rc: 0xfffdf6 }, 'ヤヌスニャ|Janupurr|雅努喵|雅努喵|야누스냐|Янупурр|जैनुपर|جانوبر'), { cel: 1 }),
    ],
    gomoku: [
      b('sleepy', { a: 'mouse', c: [0xd8d0c8, 0xfff4ee, 0x3a8ad8], hat: 'bandana', hc: [0x3a8ad8], held: 'stone' }, 'テラコチュー|Terakochu|寺子吱吱|寺子吱吱|데라코추|Теракотю|तेराकोचू|تيراكوتشو'),
      b('merchant', { a: 'frog', c: [0x7ad070, 0xf4ffe0, 0xd8a040], hat: 'kasa', held: 'stone' }, 'エンダイケロ|Endaikero|缘台呱呱|緣台呱呱|엔다이케로|Эндайкеро|एंडाइकेरो|إندايكيرو'),
      b('scholar', { a: 'dog', c: [0x3a3a44, 0xd8d8e0, 0xc83a4a], hat: 'tophat', hc: [0x2a2a38, 0xc83a4a], held: 'book', ex: ['mustache'], bc: 0x1a1a22 }, 'ルイコワン|Ruikopup|泪香汪|淚香汪|루이코왕|Руикопап|रुइकोपप|رويكوباب'),
      b('knight', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xc83a4a], held: 'stone', ex: ['scarf'], sc: 0xc83a4a }, 'キンジメェ|Kinjimeh|禁手咩|禁手咩|긴지메|Кинджимэ|किंजीमे|كينجيميه'),
      b('cool', { a: 'cat', c: [0x2a2a33, 0x4a4a55, 0xffd65a], held: 'stone', ex: ['scarf'], sc: 0xffd65a }, 'タマクロ|Tamakuro|珠珠黑喵|珠珠黑喵|다마쿠로|Тамакуро|तामाकुरो|تاماكورو'),
      b('samurai', { a: 'wolf', c: [0x9a9ab0, 0xf0f0f6, 0x2a2a38], hat: 'kabuto', hc: [0x2a2a38, 0xffd65a], held: 'katana', ex: ['armor'], ac: 0x3a3a48 }, 'ゴレンロウ|Gorenwolf|五连狼侍|五連狼侍|고렌로|Горенвулф|गोरेनवुल्फ़|غورينولف'),
      b('villain', { a: 'dragon', c: [0xfbfaf4, 0xffffff, 0x26262e], hat: 'bigcrown', held: 'stone', ex: ['cape'], cape: 0x26262e }, 'レンジュドラ|Renjudra|珠珠龙|珠珠龍|렌주도라|Рэндзюдра|रेंजुड्रा|رينجودرا'),
    ],
    checkers: [
      b('sleepy', { a: 'otter', c: [0xa07a5a, 0xf4e6d0, 0x3a9a5a], hat: 'cap', hc: [0x3a9a5a], held: 'piece' }, 'パブッター|Pubotter|酒馆獭獭|酒館獺獺|파붓타|Паботтер|पबऑटर|بابوتر'),
      b('merchant', { a: 'dog', c: [0xe0c8a8, 0xfff6ea, 0x3a6ad8], hat: 'beret', hc: [0x3a6ad8], held: 'piece', ex: ['scarf'] }, 'フィエルワン|Fierpup|菲耶汪|菲耶汪|피에루완|Фиерпап|फ़ियरपप|فييرباب'),
      b('scholar', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x2a3a6a], hat: 'tricorne', held: 'book', ex: ['glasses'] }, 'ペインメェ|Paynebaa|佩恩咩|佩恩咩|페인메|Пейнбэ|पेनबा|بينبا'),
      b('hothead', { a: 'bull', c: [0xc8703a, 0xf4dcc0, 0xc83a4a], hat: 'beret', hc: [0xc83a4a], held: 'piece', ex: ['scarf'] }, 'ハイモー|Highmoo|高地哞|高地哞|하이모|Хайму|हाइमू|هايمو'),
      b('knight', { a: 'horse', c: [0xc8a070, 0xf4e6d0, 0x3a6ad8], hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'shield', ex: ['armor'] }, 'ヒャクマヒヒン|Hundrahoof|百格驹驹|百格駒駒|햐쿠마히힌|Хандрахуф|हंड्राहूफ़|هاندراهوف'),
      b('cool', { a: 'owl', c: [0x9a8a7a, 0xf4ece0, 0x2a2a38], held: 'piece', ex: ['glasses', 'scarf'] }, 'ティンズリホー|Tinsowl|廷斯咕|廷斯咕|틴즈리호|Тинзоул|टिंसाउल|تينزاول'),
      b('villain', { a: 'lizard', c: [0x6a8ad8, 0xe0e8ff, 0x46e0c8], hat: 'helmet', hc: [0x46e0c8, 0xc8ccd8], held: 'orb', ex: ['cape'], cape: 0x2a3a6a }, 'チヌードラ|Chinudrake|奇努龙|奇努龍|치누도라|Чинудрейк|चिनूड्रेक|تشينودريك'),
    ],
    xiangqi: [
      b('sleepy', { a: 'panda', c: [0xfbfaf4, 0xffffff, 0xe83a3a], hat: 'straw', hc: [0xf0d080, 0xe83a3a], held: 'disc' }, 'ソガパン|Chuhepan|楚河团团|楚河團團|소가판|Чухэпан|चूहेपैन|تشوهيبان'),
      b('merchant', { a: 'monkey', c: [0xc8945a, 0xffe6cc, 0x2a2a38], hat: 'beret', hc: [0x2a2a38], held: 'tea' }, 'チャカンキー|Teamonk|茶馆叽叽|茶館叽叽|자칸키|Тимонк|टीमंक|تيمونك'),
      b('scholar', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xff9a3a], hat: 'mortar', held: 'book' }, 'キッチュウメェ|Kitchumeh|橘秘咩|橘秘咩|깃추메|Китчумэ|किचुमे|كيتشوميه'),
      b('knight', { a: 'horse', c: [0xe8d8c0, 0xfff6ea, 0xe83a3a], hat: 'helmet', hc: [0xe83a3a, 0xc8ccd8], held: 'sword' }, 'ウマトビン|Leapony|跳跳马|跳跳馬|우마토빈|Липони|लीपोनी|ليبوني'),
      b('cool', { a: 'tiger', c: [0xf6f2ea, 0xffffff, 0x2a2a38], held: 'flag', ex: ['armor'], ac: 0xe83a3a }, 'カンシンガー|Hanxinger|韩信虎虎|韓信虎虎|간신가|Ханьсингер|हानशिंगर|هانشينغر'),
      b('hothead', { a: 'bear', c: [0x4a3a3a, 0xe8d8d0, 0xc83a4a], hat: 'helmet', hc: [0xc83a4a, 0x3a3a48], held: 'sword', ex: ['armor', 'cape?'], ac: 0x3a3a48 }, 'コウウベア|Xiangbear|项羽熊熊|項羽熊熊|고우베어|Сянбер|शियांगबेयर|شيانغبير'),
      b('king', { a: 'dragon', c: [0xe83a3a, 0xffe0c8, 0xffd65a], hat: 'bigcrown', held: 'orb', ex: ['robe'], rc: 0xffc030 }, 'リュウホウドラ|Liubangon|刘邦龙龙|劉邦龍龍|류호도라|Любангон|ल्युबैंगॉन|ليوبانغون'),
    ],
    janggi: [
      b('sleepy', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x3a6ad8], held: 'disc', ex: ['scarf'], sc: 0x3a6ad8 }, 'ホランギー|Horangee|虎朗仔|虎朗仔|호랑기|Хоранги|होरांगी|هورانغي'),
      b('merchant', { a: 'rabbit', c: [0xfaf6f2, 0xffffff, 0xe83a5a], hat: 'straw', hc: [0xe8c878, 0xe83a5a], held: 'disc' }, 'シジャンピョン|Sijangbun|集市兔兔|市集兔兔|시장퐁|Сиджанбан|सिजांगबन|سيجانغبن'),
      b('scholar', { a: 'crane', c: [0xfbfaf4, 0xffffff, 0xe83a3a], beak: 0x5a5a6a, hat: 'gat', held: 'book', ex: ['robe'], rc: 0xfbfaf4 }, 'ソンビヅル|Seonbirdie|书生鹤鹤|書生鶴鶴|선비두루|Сонбёрди|सनबर्डी|سونبيردي'),
      b('knight', { a: 'dog', c: [0xf0e0c8, 0xfff8ee, 0x3a6ad8], hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'sword' }, 'チンドワン|Jindowoof|珍岛汪|珍島汪|진도멍|Чиндовуф|जिंदोवूफ़|جيندووف'),
      b('cool', { a: 'bird', c: [0x26262e, 0xfbfaf4, 0x3a6ad8], beak: 0x3a3a48, held: 'scroll', ex: ['scarf'], sc: 0x3a6ad8 }, 'カッチー|Kachee|鹊信宝|鵲信寶|까치동이|Качи|काची|كاتشي'),
      b('priest', { a: 'bear', c: [0x7a5a46, 0xf0dcc8, 0xffd65a], hat: 'crown', held: 'staff', ex: ['necklace'] }, 'タングンベア|Dangubear|檀君熊熊|檀君熊熊|단군곰돌|Данбер|डांगुबेयर|دانغوبير'),
      b('king', { a: 'lion', c: [0x5ac8a0, 0xf0fff6, 0x3a6ad8], hat: 'bigcrown', held: 'orb', ex: ['horns', 'cape'], cape: 0x3a6ad8 }, 'ヘチオー|Haechio|獬豸豸|獬豸豸|해치오|Хэчио|हेचियो|هيتشيو'),
    ],
    tafl: [
      b('sleepy', { a: 'seal', c: [0xb8c0cc, 0xf0f4fa, 0x3a6ad8], held: 'piece', ex: ['scarf'], sc: 0x3a6ad8 }, 'フィヨザラシ|Fjorseal|峡湾豹豹|峽灣豹豹|피요자라시|Фьорсил|फ़्योरसील|فيورسيل'),
      b('merchant', { a: 'fox', c: [0xfaf8f6, 0xffffff, 0x3a9a5a], hat: 'hood', hc: [0x3a9a5a], held: 'goblet' }, 'コウエキツネ|Tradox|商狐狐|商狐狐|고에키츠네|Трейдокс|ट्रेडॉक्स|تريدوكس'),
      b('scholar', { a: 'deer', c: [0xa07a50, 0xf4e6d0, 0x3a6ad8], hat: 'antlers', held: 'book', ex: ['glasses'] }, 'リンネトナ|Linnadeer|林奈驯驯|林奈馴馴|린네토나|Линнадир|लिनाडियर|ليناديير'),
      b('pirate', { a: 'boar', c: [0x9a6a4a, 0xf0d8c0, 0xff8a3a], hat: 'viking', held: 'sword', ex: ['beard'], bc: 0xff8a3a }, 'ロングシシ|Longboar|长船猪猪|長船豬豬|롱구시시|Лонгбор|लॉन्गबोर|لونغبور'),
      b('knight', { a: 'wolf', c: [0x9aa0b0, 0xf0f2f8, 0xc83a4a], hat: 'helmet', hc: [0xc83a4a, 0xc8ccd8], held: 'shield' }, 'タテガミ|Shieldolf|盾盾狼|盾盾狼|다테가미|Шилдольф|शील्डॉल्फ़|شيلدولف'),
      b('cool', { a: 'bird', c: [0x2a2a38, 0x4a4a5a, 0xffd65a], beak: 0x3a3a48, held: 'orb', ex: ['necklace'] }, 'フギン|Huginn|福金|福金|후긴|Хугин|हुगिन|هوغين'),
      b('hothead', { a: 'goat', c: [0xf0ece0, 0xffffff, 0xffd65a], hat: 'viking', held: 'hammer' }, 'トールメェ|Thorbaa|雷神咩|雷神咩|토르메|Торбэ|थॉरबा|ثوربا'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xc83a4a], hat: 'crown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0xe8a060, cape: 0xc83a4a }, 'フネフィベア|Hnefibear|赫尼熊熊|赫尼熊熊|흐네피베어|Хнефибер|ह्नेफ़ीबेयर|هنيفيبير'),
      b('sage', { a: 'hawk', c: [0x8a7a6a, 0xf4ece0, 0x3a3a68], beak: 0xffc040, hat: 'helmet', hc: [0xfff4dc, 0xc8ccd8], held: 'staff', ex: ['cape', 'longbeard'], cape: 0x3a3a68 }, 'オーディグル|Odeagle|奥丁鹰鹰|奧丁鷹鷹|오디구루|Одигл|ओडीगल|أوديغل'),
      // (2026-11-19: the celestial levels — a Valkyrie (the swan maidens of Norse myth) who leads the king to the heavens. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'bird', c: [0xfbfaf4, 0xffffff, 0x6ab0ff], beak: 0xffa040, hat: 'viking', hc: [0xc8ccd8, 0xffd65a], hat2: 'halo', held: 'shield', ex: ['angelwings', 'armor'], ac: 0xc8ccd8 }, 'ヴァルキスワン|Valkyswan|女武神鹅|女武神鵝|발키스완|Валкисвон|वाल्कीस्वान|فالكيسوان'), { cel: 1 }),
    ],
    ur: [
      b('sleepy', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x3a6ad8], held: 'pyramid', ex: ['necklace'] }, 'シュメメェ|Sumelamb|苏美咩|蘇美咩|슈메메|Сумелэмб|सुमेलैम्ब|سوميلامب'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0xd83a4a], hat: 'turban', hc: [0xd83a4a, 0xffd65a], held: 'pyramid' }, 'キャララクダ|Caracamel|驼驼商|駝駝商|캬라라쿠다|Каракэмел|कैराकैमल|كاراكاميل'),
      b('scholar', { a: 'owl', c: [0xb89a78, 0xf6eadc, 0x3a6ad8], held: 'book', c2: 0 }, 'ネンドホー|Clayowl|泥板咕咕|泥板咕咕|넨도호|Клейоул|क्लेआउल|كلياول'),
      b('hothead', { a: 'dog', c: [0xe8c890, 0xfff6e6, 0x8a6a3a], hat: 'cap', hc: [0xd8c098], held: 'book', ex: ['scarf'], sc: 0xc83a4a }, 'ウーリーワン|Woolleypup|伍利汪汪|伍利汪汪|우리완|Вуллипап|वूलीपप|وولليباب'),
      b('lady', { a: 'deer', c: [0xd8a070, 0xfff4e6, 0x3a6ad8], hat: 'laurel', held: 'goblet', ex: ['necklace'] }, 'プアビンビ|Puabambi|普阿比鹿鹿|普阿比鹿鹿|푸아빈비|Пуабамби|पुआबांबी|بوابامبي'),
      b('cool', { a: 'bull', c: [0xffc848, 0xfff0cc, 0x2a4ad8], held: 'none', ex: ['beard', 'necklace'], bc: 0x2a4ad8 }, 'タテゴモー|Lyremoo|竖琴哞|豎琴哞|다테고모|Лайрму|लायरमू|لايرمو'),
      b('king', { a: 'lion', c: [0xe8b060, 0xfff0d8, 0x3a3a68], hat: 'bigcrown', held: 'staff', ex: ['longbeard', 'cape'], bc: 0x3a3040, cape: 0x3a6ad8 }, 'ウルナンムオン|Urnammion|乌纳狮宝|烏納獅寶|우루난무온|Урнаммион|उरनम्मियन|أورناميون'),
    ],
    senet: [
      b('sleepy', { a: 'cat', c: [0xe8c890, 0xfff6e6, 0x3a6ad8], held: 'sticks', ex: ['necklace'] }, 'ナイニャン|Nilekit|尼罗喵|尼羅喵|나이냥|Найлкит|नाइलकिट|نايلكيت'),
      b('merchant', { a: 'hippo', c: [0x9ac0d8, 0xe8f4ff, 0x3a9a8a], held: 'sticks', ex: ['necklace'] }, 'ナイポタ|Nilepo|罗河宝|羅河寶|나이포타|Найлпо|नाइलपो|نايلبو'),
      b('scholar', { a: 'ibis', c: [0xfbfaf4, 0xffffff, 0x3a6ad8], beak: 0x2a2a38, held: 'scroll', ex: ['collar'] }, 'トトキ|Thothbis|托托鹮|托托䴉|토토키|Тотбис|थॉथबिस|ثوثبيس'),
      b('lady', { a: 'cat', c: [0x3a3a44, 0x5a5a66, 0xffd65a], hat: 'tiara', held: 'sticks', ex: ['collar'], cc: 0x3a6ad8 }, 'ネフェルタニャ|Nefertabby|妮菲喵|妮菲喵|네페르타냐|Нефертабби|नेफ़र्टैबी|نيفيرتابي'),
      b('priest', { a: 'jackal', c: [0x2a2a33, 0x4a4a55, 0xffd65a], held: 'staff', ex: ['collar'], cc: 0x3a6ad8 }, 'アヌビッカル|Anubijack|阿努比汪|阿努比汪|아누빗카루|Анубиджек|अनुबीजैक|أنوبيجاك'),
      b('cool', { a: 'croc', c: [0x6aa870, 0xe8f4d8, 0xffd65a], hat: 'nemes', hc: [0x3a6ad8, 0xffd65a], held: 'staff' }, 'セベクロコ|Sobekroc|索贝鳄鳄|索貝鱷鱷|세베쿠로코|Собекрок|सोबेक्रॉक|سوبيكروك'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x3a6ad8], hat: 'nemes', hc: [0x3a6ad8, 0xffd65a], held: 'sticks', ex: ['collar', 'cape'], cc: 0x3a6ad8, cape: 0x3a6ad8 }, 'ツタンクス|Tutankhinx|图坦斯芬|圖坦斯芬|츠탄쿠스|Тутанкинкс|टुटनखिंक्स|توتانخينكس'),
    ],
    morris: [
      b('sleepy', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0x6ad37a], hat: 'straw', hc: [0xf0d080, 0x6ad37a], held: 'piece' }, 'シバメェ|Greenbaa|草坪咩|草坪咩|시바메|Гринбэ|ग्रीनबा|غرينبا'),
      b('priest', { a: 'mouse', c: [0xc8c0b8, 0xfff4ee, 0x7a5a3a], hat: 'hood', hc: [0x7a5a3a], held: 'book', ex: ['robe'], rc: 0x7a5a3a }, 'カイロウチュー|Cloistchu|回廊吱吱|回廊吱吱|가이로추|Клойсчу|क्लॉइस्चू|كلويستشو'),
      b('hothead', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xc83a4a], hat: 'viking', held: 'shield', ex: ['beard'], bc: 0xd8902a }, 'ゴクスタベア|Gokstabear|戈克熊熊|戈克熊熊|고쿠스타베어|Гокстабер|गोक्स्टाबेयर|غوكستابير'),
      b('villain', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0xc83a4a], beak: 0xffc040, hat: 'laurel', held: 'sword', ex: ['cape', 'armor'], cape: 0xc83a4a }, 'カエサーグル|Caesagle|凯撒鹰鹰|凱撒鷹鷹|가에사구루|Цезигл|सीज़ीगल|سيزيغل'),
      // (2026-11-19: the celestial levels — Mercury, the swift messenger of the Roman gods. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'fox', c: [0xffb060, 0xfff4e6, 0x6ab0ff], hat: 'feathers', hc: [0xffffff, 0xffd65a], hat2: 'halo', held: 'piece', ex: ['angelwings', 'scarf'], sc: 0x6ab0ff }, 'メルクリンコ|Mercurfox|墨丘狐狐|墨丘狐狐|메르쿠린코|Меркурфокс|मर्करफ़ॉक्स|ميركورفوكس'), { cel: 1 }),
    ],
    connect4: [
      b('sleepy', { a: 'penguin', c: [0x3a4a6a, 0xfbfaf4, 0xffd65a], hat: 'cap', hc: [0xe83a3a], held: 'disc' }, 'オモチャペン|Toyguin|玩具企企|玩具企企|오모차펜|Тойгвин|टॉयग्विन|تويغوين'),
      b('pirate', { a: 'bird', c: [0x46c870, 0xf0ffe8, 0xe83a3a], beak: 0xffb03a, hat: 'tricorne', held: 'disc', ex: ['scarf'], sc: 0xe83a3a }, 'キャプロット|Captarrot|船长鹦鹦|船長鸚鸚|캬푸롯토|Каптаррот|कैप्टारॉट|كابتاروت'),
      b('villain', { a: 'lizard', c: [0x8a5ad8, 0xe8dcff, 0xffd65a], hat: 'helmet', hc: [0xffd65a, 0xc8ccd8], held: 'orb', ex: ['cape', 'glasses'], cape: 0x2a1a4a }, 'カイセキザード|Solvizard|解析蜥蜥|解析蜥蜥|가이세키자도|Солвизард|सॉल्विज़र्ड|سولفيزارد'),
      // (2026-11-19: the celestial levels — the Great Bear in the night sky, linking four stars into a constellation. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'bear', c: [0x3a4a8a, 0xe8ecff, 0xffd65a], hat: 'crown', hc: [0xffd65a], hat2: 'halo', held: 'disc', ex: ['angelwings', 'necklace'] }, 'オオグマセイザ|Ursangel|大熊星宝|大熊星寶|오오구마세이자|Урсанжел|उर्सेंजेल|أورسانجل'), { cel: 1 }),
    ],
    dots: [
      b('sleepy', { a: 'mouse', c: [0xe0d8d0, 0xfff6f0, 0x3a8ad8], held: 'book', ex: ['scarf'], sc: 0x3a8ad8 }, 'ハジッコチュー|Notechu|本子吱吱|本子吱吱|하짓코추|Ноутчу|नोटचू|نوتتشو'),
      b('trickster', { a: 'cat', c: [0xffb8a0, 0xfff4ee, 0x3a6ad8], hat: 'beret', hc: [0x2a3a6a], held: 'quill', ex: ['scarf'], sc: 0xe83a3a }, 'ピポピニャン|Pipopurr|皮波喵|皮波喵|피포피냥|Пипопурр|पिपोपर|بيبوبر'),
      b('scholar', { a: 'goat', c: [0xf0ece0, 0xffffff, 0x2a2a38], hat: 'tophat', held: 'book', ex: ['mustache'], bc: 0x5a4030 }, 'リュカメェ|Lucabaa|卢卡咩|盧卡咩|류카메|Люкабэ|लूकाबा|لوكابا'),
      b('sage', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x5a7ad8], hat: 'wizard', hc: [0x5a7ad8, 0xffd65a], held: 'staff', ex: ['longbeard'] }, 'クサリコウラ|Chainshell|长链龟仙|長鏈龜仙|구사리코라|Чейншелл|चेनशेल|تشينشيل'),
      // (2026-11-19: the celestial levels — a cupid who draws the lines that close the boxes. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'squirrel', c: [0xffa8b8, 0xfff4f6, 0xff5a8a], hat: 'flowers', hc: [0xff8fb0, 0xffd65a], hat2: 'halo', held: 'quill', ex: ['angelwings'] }, 'キューピリン|Cupirrel|丘比栗栗|丘比栗栗|큐피린|Купирел|क्यूपिरल|كيوبيريل'), { cel: 1 }),
    ],
    mancala: [
      b('sleepy', { a: 'goat', c: [0xe8d8c0, 0xfff6ea, 0x46a070], held: 'seeds', ex: ['scarf'], sc: 0x46a070 }, 'サバンメェ|Savabaa|草原咩|草原咩|사반메|Савабэ|सवाबा|سافابا'),
      b('merchant', { a: 'boar', c: [0x9a7a6a, 0xf0dcd0, 0xff9a3a], hat: 'straw', hc: [0xf0d080, 0xff9a3a], held: 'seeds' }, 'イボシシ|Warthie|疣猪猪|疣豬豬|이보시시|Уорти|वॉर्थी|وورثي'),
      b('cool', { a: 'cat', c: [0xf0c060, 0xfff4e0, 0x2a8a4a], held: 'seeds', ex: ['scarf', 'necklace'], sc: 0xffc030 }, 'アシャンティピョウ|Ashantipard|阿散豹豹|阿散豹豹|아샨티효|Ашантипард|अशांतीपार्ड|أشانتيبارد'),
      b('king', { a: 'lion', c: [0xe8b060, 0xfff0d8, 0x2a8a4a], hat: 'bigcrown', held: 'seeds', ex: ['robe', 'cape'], rc: 0xffc030, cape: 0x2a8a4a }, 'バオラオン|Baolion|巴奥狮宝|巴奧獅寶|바오라온|Баолион|बाओलायन|باوليون'),
      // (2026-11-19: the celestial levels — Thoth, the ibis-headed god of wisdom and counting. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'ibis', c: [0xfbfaf4, 0xffffff, 0x2a6ad8], beak: 0x2a2a38, hat: 'nemes', hc: [0x2a6ad8, 0xffd65a], hat2: 'halo', held: 'seeds', ex: ['angelwings', 'collar'], cc: 0x2a6ad8 }, 'トトイビス|Thothibis|托特鹮鹮|托特䴉䴉|토토이비스|Тотибис|थोथिबिस|تحوتيبس'), { cel: 1 }),
    ],
    backgammon: [
      b('sleepy', { a: 'rabbit', c: [0xe8d0a8, 0xfff6ea, 0xd8a040], hat: 'turban', hc: [0xd8a040, 0xffd65a], held: 'die' }, 'ヤケマチピョン|Burnbun|焦城兔兔|焦城兔兔|야케마치퐁|Бёрнбан|बर्नबन|بيرنبن'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0x3a6ad8], hat: 'turban', hc: [0x3a6ad8, 0xffd65a], held: 'die' }, 'ナルドラク|Nardrome|纳德驼驼|納德駝駝|나루도라쿠|Нардром|नार्ड्रोम|ناردروم'),
      b('scholar', { a: 'owl', c: [0x9a8070, 0xf4eadc, 0x46a0a0], hat: 'turban', hc: [0x46a0a0, 0xffd65a], held: 'die', ex: ['longbeard'] }, 'ボゾルホー|Bozorgowl|博佐咕|博佐咕|보조루호|Бозоргоул|बोज़ोर्गाउल|بوزورغاول'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xfbfaf4], hat: 'laurel', held: 'die', ex: ['robe', 'cape'], rc: 0xfbfaf4, cape: 0x8a3ad8 }, 'クラウディオン|Claudion|克劳狮宝|克勞獅寶|구라우디온|Клаудион|क्लॉडियन|كلوديون'),
    ],
    hex: [
      b('sleepy', { a: 'bear', c: [0xe8b060, 0xfff0d8, 0xffd65a], held: 'hex', ex: ['scarf'], sc: 0xff8a3a }, 'ハニクマ|Honeybo|蜜蜜熊|蜜蜜熊|하니쿠마|Ханибо|हनीबो|هانيبو'),
      b('trickster', { a: 'cat', c: [0xfaf6f0, 0xffffff, 0xe83a3a], hat: 'beret', hc: [0xe83a3a], held: 'hex', ex: ['scarf'], sc: 0xe83a3a }, 'コペンニャーゲン|Copurrhagen|哥本喵|哥本喵|코펜냐겐|Копуррхаген|कोपरहेगन|كوبيرهاغن'),
      b('scholar', { a: 'owl', c: [0x8a7a6a, 0xf4ece0, 0x3a6ad8], held: 'quill', ex: ['glasses'] }, 'ピートホー|Pietowl|皮特咕|皮特咕|피토호|Питоул|पीटाउल|بيتاول'),
      b('merchant', { a: 'dog', c: [0xd8b890, 0xfff6ea, 0x3a6ad8], hat: 'cap', hc: [0x3a6ad8], held: 'scroll' }, 'ポリティワン|Politipup|报报汪|報報汪|폴리티완|Политипап|पॉलिटिपप|بوليتيباب'),
      b('cool', { a: 'cat', c: [0x8a8a9a, 0xe8e8f0, 0xff8a3a], held: 'book', ex: ['scarf'], sc: 0xff8a3a }, 'ナッシュニャ|Nashkit|纳什喵|納許喵|낫슈냐|Нэшкит|नैशकिट|ناشكيت'),
      b('knight', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0x3a6ad8], beak: 0xffc040, hat: 'helmet', hc: [0x3a6ad8, 0xc8ccd8], held: 'shield' }, 'ロッカクホーク|Hexhawk|六角鹰鹰|六角鷹鷹|롯카쿠호크|Хексхок|हेक्सहॉक|هيكسهوك'),
      b('villain', { a: 'dragon', c: [0xe83a3a, 0xffe0d8, 0x3a6ad8], hat: 'bigcrown', held: 'hex', ex: ['cape'], cape: 0x3a6ad8 }, 'センテドラ|Stratogon|先手龙龙|先手龍龍|센테도라|Стратогон|स्ट्रैटोगॉन|ستراتوغون'),
    ],
    fanorona: [
      b('sleepy', { a: 'monkey', c: [0xb8b8c0, 0xffffff, 0x2a2a38], held: 'stone', ex: ['scarf'], sc: 0xff8a3a }, 'ワオッコ|Ringtailee|环尾猴仔|環尾猴仔|와옷코|Рингтейли|रिंगटेली|رينغتيلي'),
      b('merchant', { a: 'bull', c: [0xe8e0d8, 0xffffff, 0xd83a4a], held: 'stone', ex: ['hump', 'scarf'], sc: 0xd83a4a }, 'ゼブモー|Zebumoo|瘤牛哞|瘤牛哞|제부모|Зебуму|ज़ेबूमू|زيبومو'),
      b('trickster', { a: 'lizard', c: [0x6ad070, 0xf0ffe0, 0xff6b9a], held: 'stone', eyes: 'bead' }, 'イタズラメレオン|Trickleon|变色龙皮皮|變色龍皮皮|이타즈라메레온|Трикклеон|ट्रिकलियन|تريكليون'),
      b('scholar', { a: 'mouse', c: [0x5a4a40, 0xc8b8a8, 0xffd65a], held: 'book', ex: ['glasses'] }, 'アイアイン|Ayeinstein|指猴博博|指猴博博|아이아인|Айнштейн|आयइंस्टाइन|آيينشتاين'),
      b('cool', { a: 'cat', c: [0xb07040, 0xf0d8c0, 0x2a2a38], held: 'stone', ex: ['scarf'], sc: 0x2a2a38 }, 'フォッサンン|Fossan|福萨萨|福薩薩|포산|Фоссан|फ़ॉसन|فوسان'),
      b('hothead', { a: 'bird', c: [0x8a7a60, 0xf0e6d0, 0x6a9a5a], beak: 0x8a8a8a, held: 'stone', ex: ['crest'] }, 'エピオルン|Aepyorn|象鸟宝|象鳥寶|에피오른|Эпиорн|एपियोर्न|إيبيورن'),
      b('king', { a: 'monkey', c: [0x2a2a33, 0xfbfaf4, 0xffd65a], hat: 'bigcrown', held: 'staff', ex: ['robe', 'cape'], rc: 0xfbfaf4, cape: 0xd83a4a }, 'インドリオ|Indrio|因德里奥|因德里奧|인도리오|Индрио|इंड्रियो|إندريو'),
    ],
    ugolki: [
      b('sleepy', { a: 'bear', c: [0x9a7a5a, 0xf4e6d0, 0xd83a4a], hat: 'ushanka', hc: [0x6a5040, 0xfff4e6], held: 'piece' }, 'ウシャンクマ|Ushankub|毛帽熊仔|毛帽熊仔|우샨쿠마|Ушанкуб|उशांकब|أوشانكوب'),
      b('merchant', { a: 'fox', c: [0xff8a3a, 0xfff4e6, 0xd83a4a], hat: 'ushanka', hc: [0xd83a4a, 0xfff4e6], held: 'tea' }, 'サモワツネ|Samovox|茶炊狐狐|茶炊狐狐|사모와츠네|Самовокс|समोवॉक्स|ساموفوكس'),
      b('lady', { a: 'rabbit', c: [0xfaf6f2, 0xffffff, 0xd83a4a], hat: 'kokoshnik', hc: [0xd83a4a], held: 'fan', ex: ['necklace'] }, 'マトリョピョン|Matryoshbun|套娃兔兔|套娃兔兔|마트료퐁|Матрёшбан|मात्र्योशबन|ماتريوشبن'),
      b('scholar', { a: 'dog', c: [0xd8c0a0, 0xfff6ea, 0x3a6ad8], hat: 'tophat', held: 'book', ex: ['glasses', 'mustache'] }, 'モンクスワン|Monkspup|蒙克汪|蒙克汪|몽쿠스완|Монкспап|मंक्सपप|مونكسباب'),
      b('hothead', { a: 'horse', c: [0xfbfaf4, 0xffffff, 0x3a6ad8], held: 'flag', ex: ['horsemane', 'scarf'], sc: 0x3a6ad8 }, 'トロイカッポ|Troikapony|三驾驹驹|三駕駒駒|도로이캇포|Тройкапони|ट्रोइकापोनी|ترويكابوني'),
      b('trickster', { a: 'cat', c: [0x3a3440, 0x5a5466, 0x8a3ad8], hat: 'hood', hc: [0x8a3ad8], held: 'broom', mouth: 'w' }, 'ババヤニャン|Babayagat|芭芭喵|芭芭喵|바바야냥|Бабаягат|बाबायागैट|باباياغات'),
      b('knight', { a: 'bear', c: [0x7a5a46, 0xf0dcc8, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffd65a], held: 'sword', ex: ['armor', 'cape'], cape: 0xd83a4a }, 'ボガトベア|Bogatbear|勇士熊熊|勇士熊熊|보가토베어|Богатбер|बोगाटबेयर|بوغاتبير'),
      b('villain', { a: 'wolf', c: [0x5a5a6a, 0xc8c8d8, 0x46e0a0], hat: 'bigcrown', held: 'orb', ex: ['cape'], cape: 0x2a2a38 }, 'コシェルフ|Koscholf|科西狼狼|科西狼狼|고셰루프|Кощольф|कोशोल्फ़|كوشولف'),
      // (2026-11-19: the celestial levels — the Firebird (Zhar-ptitsa) of Russian tales, flying corner to corner. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'bird', c: [0xff7a3a, 0xffd65a, 0xff3d3d], beak: 0xffd65a, hat: 'kokoshnik', hc: [0xffd65a, 0xff3d6e], hat2: 'halo', held: 'piece', ex: ['angelwings', 'crest'] }, 'ジャルプティ|Zharbird|火鸟鸟|火鳥鳥|자르프티|Жарптах|ज़ारबर्ड|زاربيرد'), { cel: 1 }),
    ],
    agon: [
      b('sleepy', { a: 'mouse', c: [0xe0d8d0, 0xfff6f0, 0xff8fb0], hat: 'bonnet', hc: [0xfff4f8, 0xff8fb0], held: 'piece' }, 'ボンネチュー|Bonnetchu|软帽吱吱|軟帽吱吱|본네추|Боннетчу|बॉनेटचू|بونيتشو'),
      b('merchant', { a: 'dog', c: [0xd8b890, 0xfff6ea, 0x2a2a38], hat: 'tophat', held: 'goblet', ex: ['monocle'] }, 'ジェントワン|Gentlewoof|绅士汪|紳士汪|젠토완|Джентлвуф|जेंटलवूफ़|جنتلووف'),
      b('lady', { a: 'cat', c: [0xfaf6f2, 0xffffff, 0x8a5ad8], hat: 'tiara', held: 'fan', ex: ['necklace'] }, 'レディニャン|Ladypurr|淑女喵|淑女喵|레디냥|Лейдипурр|लेडीपर|ليديبر'),
      b('scholar', { a: 'owl', c: [0x8a7a6a, 0xf4ece0, 0x2a2a38], hat: 'mortar', held: 'book', ex: ['monocle'] }, 'ミュージホー|Museowl|博物咕|博物咕|뮤지호|Мьюзоул|म्यूज़ाउल|ميوزاول'),
      b('knight', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xd83a4a], hat: 'bearskin', hc: [0x1e1e26, 0xffd65a], held: 'sword', ex: ['armor'], ac: 0xd83a4a }, 'ベアスキン|Bearskin|卫兵熊熊|衛兵熊熊|베아스킨|Беарскин|बेयरस्किन|بيرسكين'),
      b('cool', { a: 'bird', c: [0x2a8ad8, 0xc8e8ff, 0x46c890], beak: 0x5a5a6a, held: 'fan', ex: ['crest'] }, 'クリスタジャク|Crystafan|水晶孔孔|水晶孔孔|구리스타자쿠|Кристафан|क्रिस्टाफ़ैन|كريستافان'),
      b('hothead', { a: 'bull', c: [0xc8703a, 0xf4dcc0, 0x3a6ad8], hat: 'tophat', hc: [0x3a3a48, 0xd83a4a], held: 'flag', ex: ['scarf'], sc: 0x3a6ad8 }, 'ジョン・ブル|John Bull|约翰牛|約翰牛|존불|Джон Булль|जॉन बुल|جون بول'),
      b('lady', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x6a3ad8], hat: 'bigcrown', held: 'staff', ex: ['cape', 'necklace'], cape: 0x6a3ad8 }, 'ヴィクトリオン|Victorion|维多狮宝|維多獅寶|빅토리온|Викторион|विक्टोरियन|فيكتوريون'),
      // (2026-11-19: the celestial levels — a seraph seated at the heart of the hexagon board. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'sheep', c: [0xfffaf2, 0xffffff, 0xb88aff], hat: 'tiara', hc: [0xffd65a], hat2: 'halo', held: 'hex', ex: ['wool', 'angelwings', 'robe'], rc: 0xf0e8ff }, 'ヘクセラフ|Hexeraph|六角天咩|六角天咩|헥세라프|Гексераф|हेक्सेराफ़|هيكسيراف'), { cel: 1 }),
    ],
    // amazons (2026-11-11 the user: the Amazon feel up front) — the rainforest of the Amazon and the Amazon warriors of the Greek
    // myths: bows and the game's fire arrows; the top two are the myths' queens Penthesilea and Hippolyta
    amazons: [
      b('sleepy', { a: 'otter', c: [0x7a5238, 0xf0d8b8, 0x3aa86a], held: 'arrow', ex: ['necklace'] }, 'ジャイオッタ|Giotter|大獭獭|大獺獺|자이옷타|Джайоттер|जायऑटर|جايوتر'),
      b('trickster', { a: 'monkey', c: [0xd8a048, 0xfff0d8, 0x3aa86a], hat: 'feathers', hc: [0x3aa86a, 0xffd65a], held: 'bow', mouth: 'w' }, 'ユミザル|Bowmonk|弓弓猴|弓弓猴|유미자루|Боумонк|बोमंक|بومونك'),
      b('merchant', { a: 'bird', c: [0x2a2a30, 0xfff2d0, 0xff8a2a], beak: 0xff8a2a, hat: 'feathers', hc: [0xff8a2a, 0x3aa86a], held: 'arrow', ex: ['necklace'] }, 'オオハシャン|Toucash|巨嘴商商|巨嘴商商|오하샨|Тукэш|टूकैश|توكاش'),
      b('lady', { a: 'frog', c: [0x2a7ae8, 0xbfe4ff, 0xffd030], hat: 'flowers', held: 'bow', ex: ['necklace'] }, 'ヤドクケロ|Dartlet|毒箭呱呱|毒箭呱呱|야도쿠케로|Дартлет|डार्टलेट|دارتليت'),
      b('cool', { a: 'hawk', c: [0x8a8e96, 0xf4f4f0, 0x2a2a30], beak: 0x2a2a30, hat: 'feathers', hc: [0x2a2a30, 0xc8ccd8], held: 'bow', ex: ['crest'] }, 'オウギーグル|Harpyx|角雕雕|角雕雕|오기구루|Гарпикс|हार्पिक्स|هاربيكس'),
      b('knight', { a: 'jaguar', c: [0xe8b058, 0xfff2d8, 0xc83a3a], hat: 'helmet', hc: [0xc83a3a, 0xd8c8a0], held: 'bow', ex: ['armor', 'necklace'] }, 'ジャガウォー|Jaguarrior|豹勇勇|豹勇勇|자가워|Джагуаррио|जगुआरियर|جاغواريور'),
      b('hothead', { a: 'horse', c: [0xf4f0e8, 0xfffaf2, 0xb83a3a], hat: 'helmet', hc: [0xb83a3a, 0xd8b048], held: 'shield', ex: ['armor', 'cape'], cape: 0xb83a3a, brow: 1 }, 'ペンテシレイア|Penthesilea|彭忒西勒亚|彭忒西勒亞|펜테실레이아|Пентесилея|पेंथेसिलिया|بنثيسيليا'),
      b('king', { a: 'jaguar', c: [0xf0b850, 0xfff4dc, 0xd8a020], hat: 'crown', held: 'bow', ex: ['cape', 'necklace', 'armor'], cape: 0x2a8a5a }, 'ヒッポリュテ|Hippolyta|希波吕忒|希波呂忒|히폴리테|Ипполита|हिप्पोलिटा|هيبوليتا'),
      // (2026-11-19: the celestial levels — Artemis, the hunting goddess with her sacred deer — the arrows. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'deer', c: [0xe8c8a0, 0xfff4e6, 0x8ad8ff], hat: 'laurel', hc: [0xffd65a], hat2: 'halo', held: 'bow', ex: ['angelwings', 'robe'], rc: 0xf4f0ff }, 'アルテミジカ|Artemideer|阿尔忒鹿|阿爾忒鹿|아르테미지카|Артемидир|आर्टेमिडियर|أرتيميدير'), { cel: 1 }),
    ],
    konane: [
      b('sleepy', { a: 'seal', c: [0x9aa0aa, 0xe8ecf0, 0xff8fb0], hat: 'flowers', held: 'stone' }, 'モンザラシ|Monkseel|僧海豹豹|僧海豹豹|몬자라시|Монксил|मंकसील|مونكسيل'),
      b('merchant', { a: 'turtle', c: [0x9ad0a0, 0xfff4dc, 0x5a8a5a], held: 'stone', ex: ['necklace'] }, 'ホヌッピ|Honupi|霍努努|霍努努|호눗피|Хонупи|होनुपी|هونوبي'),
      b('trickster', { a: 'bird', c: [0xc8b8a0, 0xf6eee0, 0x2a2a38], beak: 0x2a2a38, held: 'stone' }, 'ネネリン|Nenelin|妮妮雁|妮妮雁|네네린|Ненелин|नेनेलिन|نينيلين'),
      b('hothead', { a: 'boar', c: [0x6a5a5a, 0xd8c8c8, 0xffd65a], held: 'stone', ex: ['necklace'] }, 'カマプアア|Kamapua\'a|卡玛普阿阿|卡瑪普阿阿|카마푸아아|Камапуаа|कामापुआ|كاماپوعا'),
      b('lady', { a: 'rabbit', c: [0xfaf2ea, 0xffffff, 0xff8fb0], hat: 'flowers', held: 'fan', ex: ['necklace'] }, 'フラピョン|Hulabun|草裙兔兔|草裙兔兔|후라퐁|Хулабан|हुलाबन|هولابن'),
      b('cool', { a: 'hawk', c: [0x6a5a4a, 0xe8dcc8, 0xffd65a], beak: 0xffc040, held: 'stone' }, 'イオホーク|Iohawk|伊奥鹰鹰|伊奧鷹鷹|이오호크|Иохок|इओहॉक|إيوهوك'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xffd030], hat: 'helmet', hc: [0xffd030, 0xe83a3a], held: 'staff', ex: ['cape'], cape: 0xe83a3a }, 'カメハメベア|Kamehabear|卡美熊熊|卡美熊熊|가메하메베어|Камехабер|कामेहाबेयर|كاميهابير'),
      b('priest', { a: 'lizard', c: [0xe84a3a, 0xffe0c8, 0xffc030], hat: 'flowers', held: 'orb', ex: ['cape', 'necklace'], cape: 0x2a2a38 }, 'ペレ|Pele|佩蕾|佩蕾|펠레|Пеле|पेले|بيليه'),
      // (2026-11-19: the celestial levels — the pueo owl, a Hawaiian guardian spirit (ʻaumakua), with a lei. Gacha-only UR, no rewards for a win)
      Object.assign(b('angel', { a: 'owl', c: [0xc8a070, 0xfff4e2, 0x2a2a38], hat: 'flowers', hc: [0xff8fb0, 0xffd65a], hat2: 'halo', held: 'stone', ex: ['angelwings', 'necklace'] }, 'プエオカミ|Pueowl|普埃奥咕|普埃奧咕|푸에오카미|Пуэоул|पुएओउल|بويوول'), { cel: 1 }),
    ],
    latrunculi: [   // ancient Rome: the game of the soldiers (mercenaries); Varro's record, the poets, the master of the Laus Pisonis (claude/latrunculi-spec.md)
      b('sleepy', { a: 'sheep', c: [0xf2ece0, 0xfff8ee, 0x8a2f72], held: 'stone', ex: ['scarf'], sc: 0x8a2f72 }, 'ロマメェ|Romabaa|罗马咩|羅馬咩|로마메|Ромабэ|रोमाबा|رومابا'),
      b('merchant', { a: 'cat', c: [0xd8b890, 0xfff4e4, 0x3a8ad8], held: 'disc', ex: ['necklace'] }, 'ガラスニャン|Glasspurr|琉璃喵|琉璃喵|가라스냥|Глассапурр|ग्लासपर|غلاسبر'),
      b('trickster', { a: 'fox', c: [0xe8843a, 0xfff2e0, 0x6a2358], hat: 'bandana', hc: [0x6a2358], held: 'sword' }, 'ヨウヘイツネ|Mercenfox|佣兵狐狐|傭兵狐狐|요헤이츠네|Мерценфокс|मर्सेनफ़ॉक्स|ميرسينفوكس'),
      b('scholar', { a: 'owl', c: [0x9a7a5a, 0xf4e6cc, 0x6a2358], held: 'scroll', ex: ['glasses', 'robe'], rc: 0xf4f0e6 }, 'ウァロホー|Varrowl|瓦罗咕|瓦羅咕|와로호|Варроул|वैराउल|فاراول'),
      b('lady', { a: 'bird', c: [0xd8c8e8, 0xfff6fa, 0xc83a7a], hat: 'laurel', held: 'quill', ex: ['robe'], rc: 0xfaf4ea }, 'シジンチュン|Poetweet|诗诗鸟|詩詩鳥|시진춘|Поэтвит|पोएट्वीट|بويتويت'),
      b('knight', { a: 'wolf', c: [0x8a8a92, 0xf0ece6, 0xc83a3a], hat: 'helmet', hc: [0xc8a040, 0xc83a3a], held: 'shield', ex: ['armor', 'cape'], cape: 0xc83a3a }, 'レギオガミ|Legiolf|军团狼狼|軍團狼狼|레기오가미|Легиольф|लेजियोल्फ़|ليجيولف'),
      b('king', { a: 'lion', c: [0xe8b860, 0xfff4dc, 0x6a2358], hat: 'laurel', held: 'disc', ex: ['cape', 'necklace', 'robe'], cape: 0x6a2358, rc: 0xfaf4ea }, 'ピソオン|Pision|皮索狮宝|皮索獅寶|피소온|Пизион|पिसियन|بيسيون'),
    ],
    foxgeese: [   // northern Europe's hunt game: geese and hens, the Icelandic saga, Edward IV's hounds, the wolf of "wolf and sheep", Queen Victoria (claude/foxgeese-spec.md)
      b('sleepy', { a: 'bird', c: [0xf6f2e8, 0xffffff, 0xe9902a], beak: 0xe9902a, held: 'none' }, 'ネボガチョ|Snoozegoose|瞌睡鹅鹅|瞌睡鵝鵝|네보가초|Снузгус|स्नूज़गूज़|سنوزغوز'),
      b('merchant', { a: 'bird', c: [0xc87a3a, 0xf6e2c0, 0xd83a3a], beak: 0xf0b030, hat: 'bonnet', held: 'seeds' }, 'ハタケッコ|Farmcluck|农场咯咯|農場咯咯|하타켓코|Фармклак|फ़ार्मक्लक|فارمكلاك'),
      b('sage', { a: 'sheep', c: [0xe8e2d4, 0xfff8ee, 0x3a6a9a], held: 'book', ex: ['scarf'], sc: 0x3a6a9a }, 'サガメェ|Sagabaa|萨迦咩|薩迦咩|사가메|Сагабэ|सागाबा|ساغابا'),
      b('knight', { a: 'dog', c: [0xc8a070, 0xfff2de, 0xc83a3a], held: 'none', ex: ['collar'] }, 'ロイヤルワン|Royalwoof|御猎汪|御獵汪|로이야루완|Ройалвуф|रॉयलवूफ़|رويالووف'),
      b('villain', { a: 'wolf', c: [0x6a6a74, 0xe6e2dc, 0x2a2a38], hat: 'ushanka', hc: [0x5a4030, 0xe8dcc8], held: 'none', brow: 1 }, 'オイカケガミ|Chasolf|追追狼|追追狼|오이카케가미|Чейсольф|चेसोल्फ़|تشيسولف'),
      b('lady', { a: 'bird', c: [0xfaf6ee, 0xffffff, 0x8a5ac8], beak: 0xe9902a, hat: 'tiara', held: 'fan', ex: ['necklace', 'cape'], cape: 0x8a5ac8 }, 'マジェスグース|Majesgoose|陛下鹅鹅|陛下鵝鵝|마제스구스|Мажесгус|मैजेसगूज़|ماجيسغوز'),
      b('king', { a: 'fox', c: [0xe07a30, 0xfff2e0, 0xd8a020], hat: 'bigcrown', held: 'orb', ex: ['cape', 'necklace'], cape: 0xb02a3a }, 'エドワツネ|Edwox|爱德狐狐|愛德狐狐|에도와츠네|Эдвокс|एडवॉक्स|إدوكس'),
    ],
    patolli: [   // the Aztec game of beans and stakes: the beans, the reed mat, the red and blue pebbles, the two chroniclers (Sahagún, Durán), R. C. Bell's reconstruction of 1960, Macuilxochitl the god of games (claude/patolli-spec.md §0 — nothing beyond it)
      b('sleepy', { a: 'bird', c: [0xc9a46a, 0xfff4dc, 0x12a4b8], beak: 0xe9902a, held: 'seeds' }, 'マメヒロチュン|Beanpeep|拾豆啾|拾豆啾|마메히로춘|Бинпип|बीनपीप|بينبيب'),
      b('merchant', { a: 'rabbit', c: [0xe8d8b8, 0xfff8ea, 0xd8452c], hat: 'straw', hc: [0xd8bd7c, 0x1b120d], held: 'none', ex: ['scarf'], sc: 0xd8452c }, 'ゴザアミピョン|Matbun|编席兔兔|編蓆兔兔|고자아미퐁|Матбан|मैटबन|ماتبن'),
      b('trickster', { a: 'monkey', c: [0x8a6a4a, 0xf4e2c4, 0x2f6fb8], hat: 'bandana', hc: [0xc8402c], held: 'stone' }, 'コイシキッキ|Pebblemonk|石子叽叽|石子叽叽|고이시킷키|Пебблмонк|पेबलमंक|بيبلمونك'),
      b('scholar', { a: 'deer', c: [0xc89a64, 0xfff2dc, 0x12a4b8], held: 'book', ex: ['robe'], rc: 0x6a5a4a }, 'キロクジカ|Chronideer|记录鹿鹿|記錄鹿鹿|기로쿠지카|Хронидир|क्रोनीडियर|كرونيديير'),
      b('scholar', { a: 'owl', c: [0x7a6a5a, 0xf4e6cc, 0xd8452c], held: 'quill', ex: ['glasses', 'robe'], rc: 0x3a3430 }, 'カキカキホー|Scribowl|书记咕|書記咕|가키가키호|Скрайбоул|स्क्राइबाउल|سكرايباول'),
      b('sage', { a: 'bear', c: [0x9a7a5a, 0xf6e6cc, 0x12a4b8], hat: 'cap', hc: [0x5a4a3a], held: 'book', ex: ['glasses', 'scarf'], sc: 0x12a4b8 }, 'フクゲンベア|Restorbear|复原熊熊|復原熊熊|후쿠겐베어|Ресторбер|रेस्टोरबेयर|ريستوربير'),
      b('king', { a: 'jaguar', c: [0xe8b450, 0xfff4dc, 0x12a4b8], hat: 'flowers', held: 'orb', ex: ['cape', 'necklace'], cape: 0xd8452c }, 'マクイルショチトル|Macuilxochitl|五花神|五花神|마쿠일쇼치틀|Макуильшочитль|माकुइलशोचित्ल|ماكويلشوتشيتل'),
    ],
    ludo: [
      b('sleepy', { a: 'monkey', c: [0xc8c0b8, 0xfff4ee, 0xff8a3a], held: 'die', ex: ['scarf'], sc: 0xff8a3a }, 'ラングッキー|Languree|叶猴仔|葉猴仔|랑굿키|Лангури|लंगूरी|لانغوري'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0xe83a5a], hat: 'turban', hc: [0xe83a5a, 0xffd65a], held: 'die' }, 'ラジャクダ|Rajcamel|拉贾驼驼|拉賈駝駝|라자쿠다|Раджкэмел|राजकैमल|راجكاميل'),
      b('trickster', { a: 'cat', c: [0xf0b060, 0xfff4e0, 0x3a9a5a], held: 'die', ex: ['scarf'], sc: 0x3a9a5a, mouth: 'w' }, 'チョウパルニャ|Chaupurr|乔帕喵|喬帕喵|조파루냐|Чаупурр|चौपर|تشاوبر'),
      b('scholar', { a: 'dog', c: [0xd8c0a0, 0xfff6ea, 0x3a6ad8], hat: 'tophat', held: 'book', ex: ['monocle'] }, 'トッキョワン|Patenpup|专利汪|專利汪|돗쿄완|Патенпап|पेटेनपप|باتينباب'),
      b('cool', { a: 'tiger', c: [0xffa040, 0xfff4e6, 0x2a2a38], held: 'die', ex: ['necklace'] }, 'ベンガルガー|Bengalgar|孟加虎虎|孟加虎虎|벵가루가|Бенгалгар|बंगालगर|بنغالغار'),
      b('knight', { a: 'elephant', c: [0xb8bcd0, 0xf0f2fa, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffd65a], held: 'shield', ex: ['armor'], ac: 0xd83a4a }, 'イクサゾウ|Warphant|战象象|戰象象|이쿠사조|Уорфант|वॉरफ़ैंट|وورفانت'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xe83a5a], hat: 'turban', hc: [0xfbfaf4, 0xffd65a], held: 'die', ex: ['cape', 'necklace', 'longbeard'], bc: 0x3a3040, cape: 0x2a8a4a }, 'アクバライオン|Akbarion|阿克巴狮宝|阿克巴獅寶|아쿠바라이온|Акбарион|अकबरियन|أكباريون'),
    ],
    carrom: [
      b('sleepy', { a: 'squirrel', c: [0xb89a7a, 0xfff0dc, 0x2a2a38], held: 'striker' }, 'ヤシリン|Palmirrel|椰栗栗|椰栗栗|야시린|Палмирел|पामिरल|باميريل'),
      b('merchant', { a: 'bird', c: [0x46c870, 0xf0ffe8, 0xe83a3a], beak: 0xe83a3a, held: 'striker', ex: ['necklace'] }, 'ベランパロ|Verandarrot|阳台鹦鹦|陽台鸚鸚|베란파로|Верандаррот|वेरांडारॉट|فيرانداروت'),
      b('trickster', { a: 'monkey', c: [0xb07a50, 0xffe0c8, 0xffd65a], hat: 'cap', hc: [0xff8a3a], held: 'striker', mouth: 'w' }, 'ハジキッキ|Flickmonk|弹弹猴|彈彈猴|하지킷키|Фликмонк|फ़्लिकमंक|فليكمونك'),
      b('hothead', { a: 'bull', c: [0xfbfaf4, 0xffffff, 0xff8a3a], held: 'striker', ex: ['hump', 'necklace'] }, 'ストライモー|Strikemoo|击球哞|擊球哞|스토라이모|Страйкму|स्ट्राइकमू|سترايكمو'),
      b('cool', { a: 'cat', c: [0xf0c060, 0xfff4e0, 0x2a2a38], held: 'striker', ex: ['scarf'], sc: 0x2a2a38 }, 'エースパード|Acepard|王牌豹豹|王牌豹豹|에스파도|Эйспард|ऐसपार्ड|إيسبارد'),
      b('lady', { a: 'bird', c: [0x2a6ad8, 0xc8e0ff, 0x46c890], beak: 0x5a5a6a, hat: 'tiara', held: 'fan', ex: ['crest', 'necklace'] }, 'クジャクイーン|Peaqueen|孔雀后后|孔雀后后|구자쿠인|Пиквин|पीक्वीन|بيكويين'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0xd83a4a], hat: 'turban', hc: [0xd83a4a, 0xffd65a], held: 'striker', ex: ['cape', 'necklace'], cape: 0x6a3ad8 }, 'マハラジャイオン|Maharajion|大君狮宝|大君獅寶|마하라자이온|Махараджион|महाराजियन|مهاراجيون'),
    ],
    hockey: [
      b('sleepy', { a: 'penguin', c: [0x2a2f3a, 0xffffff, 0x2f6fd0], held: 'disc', ex: ['scarf'], sc: 0x2f6fd0 }, 'リンクペン|Rinkguin|冰场企企|冰場企企|린쿠펜|Ринкгвин|रिंकग्विन|رينكغوين'),
      b('merchant', { a: 'otter', c: [0x9a6a48, 0xf4e2c8, 0xff6b3a], hat: 'cap', hc: [0xff6b3a], held: 'disc' }, 'ゲーセンオッタ|Arcotter|电玩獭獭|電玩獺獺|게센옷타|Аркоттер|आर्कऑटर|أركوتر'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x2f6fd0], hat: 'cap', hc: [0x2f6fd0], held: 'disc', mouth: 'w' }, 'パックツネ|Puckfox|控球狐狐|控球狐狐|팟쿠츠네|Пакфокс|पकफ़ॉक्स|باكفوكس'),
      b('cool', { a: 'wolf', c: [0x8a94a8, 0xeef0f6, 0xd83a4a], hat: 'helmet', hc: [0xd83a4a, 0xffffff], held: 'shield' }, 'ゴーリーガミ|Goalolf|守门狼狼|守門狼狼|고리가미|Гоулольф|गोलोल्फ़|غولولف'),
      b('hothead', { a: 'bull', c: [0x6a4a3a, 0xf0dcc8, 0xd83a4a], hat: 'helmet', hc: [0x2f6fd0, 0xffffff], held: 'disc', ex: ['necklace'] }, 'スラップモー|Slapmoo|猛射哞|猛射哞|스랏푸모|Слэпму|स्लैपमू|سلابمو'),
      b('scholar', { a: 'owl', c: [0xb08a68, 0xf6e6cc, 0x2f6fd0], held: 'book', ex: ['glasses'] }, 'エアホッホー|Airhoot|气垫咕咕|氣墊咕咕|에아홋호|Эйрхут|एयरहूट|إيرهوت'),
      b('king', { a: 'bear', c: [0x8a6a50, 0xf4e2cc, 0xd83a4a], hat: 'crown', held: 'disc', ex: ['cape', 'scarf'], cape: 0xd83a4a, sc: 0xffffff }, 'マンローベア|Munrobear|曼罗熊熊|曼羅熊熊|만로베어|Манробер|मनरोबेयर|مونروبير'),
    ],
    botao: [
      b('sleepy', { a: 'turtle', c: [0x5a9a5a, 0xe8f0c8, 0xf5c518], hat: 'straw', held: 'disc', ex: ['scarf'], sc: 0x1d8a3c }, 'ハマコウラ|Beachshell|沙滩龟龟|沙灘龜龜|하마코라|Бичшелл|बीचशेल|بيتششيل'),
      b('merchant', { a: 'monkey', c: [0xf0a030, 0xffe8c0, 0x1d8a3c], hat: 'cap', hc: [0x1d8a3c], held: 'disc', ex: ['necklace'] }, 'タマリーノ|Tamarino|小绢绢|小絹絹|다마리노|Тамарино|तामारिनो|تامارينو'),
      b('trickster', { a: 'frog', c: [0x2a8ae8, 0xc8e8ff, 0xffd23c], hat: 'bandana', hc: [0xffd23c], held: 'disc', mouth: 'w' }, 'ドリブケロ|Dribbit|运球呱呱|運球呱呱|도리부케로|Дриббит|ड्रिबिट|دريبيت'),
      b('cool', { a: 'croc', c: [0x4a7a3a, 0xd8e8b0, 0xf5c518], hat: 'cap', hc: [0xf5c518], held: 'shield', ex: ['glasses'] }, 'ワニーパー|Caikeeper|鳄鳄门神|鱷鱷門神|와니파|Кайкипер|काइकीपर|كايكيبر'),
      b('hothead', { a: 'bull', c: [0xfbfaf4, 0xffffff, 0xe83a6a], hat: 'flowers', held: 'disc', ex: ['necklace', 'cape'], cape: 0x2a6ad8 }, 'ブンバ・メウ・ボイ|Bumba-meu-boi|彩牛|彩牛|붐바 메우 보이|Бумба-меу-бой|बुम्बा मेउ बोई|بومبا ميو بوي'),
      b('scholar', { a: 'bird', c: [0x2a6ad8, 0xffe060, 0xe83a3a], beak: 0x2a2a30, held: 'book', ex: ['glasses', 'crest'] }, 'マカウリン|Macawlin|金刚鹦鹦|金剛鸚鸚|마카우린|Макаулин|मकॉलिन|ماكاولين'),
      b('king', { a: 'jaguar', c: [0xe8b048, 0xfff0d0, 0x1d8a3c], hat: 'beret', hc: [0x2a2a38], held: 'disc', ex: ['cape', 'scarf'], cape: 0x1d8a3c, sc: 0xf5c518 }, 'ジャガルティスタ|Jaguartist|画豹豹|畫豹豹|자가루티스타|Джагуартист|जगुआर्टिस्ट|جاغوارتيست'),
    ],
    crokinole: [
      b('sleepy', { a: 'beaver', c: [0x8a5a3a, 0xf0dcc0, 0xc8282e], hat: 'cap', hc: [0xc8282e], held: 'disc' }, 'ログビバー|Cabeaver|木屋狸狸|木屋狸狸|로구비바|Кабивер|कैबीवर|كابيفر'),
      b('merchant', { a: 'rabbit', c: [0xf4f0ea, 0xffffff, 0x2a6ad8], held: 'disc', ex: ['scarf'], sc: 0xc8282e }, 'カンジキピョン|Snowshoebun|雪鞋兔兔|雪鞋兔兔|간지키퐁|Сноушубан|स्नोशूबन|سنوشوبن'),
      b('trickster', { a: 'fox', c: [0xe8742a, 0xfff4e6, 0xc8282e], hat: 'cap', hc: [0xc8282e], held: 'disc', mouth: 'w' }, 'メプルコン|Mapleko|枫叶狐狐|楓葉狐狐|메푸루콘|Мейплко|मेपलको|مابلكو'),
      b('scholar', { a: 'owl', c: [0xf4f4f0, 0xffffff, 0x2a2a38], held: 'book', ex: ['glasses'] }, 'ジャッジホー|Refowl|裁判咕咕|裁判咕咕|잣지호|Рефоул|रेफ़ाउल|ريفاول'),
      b('hothead', { a: 'deer', c: [0x6a4a30, 0xd8c0a0, 0x3a2a1a], hat: 'antlers', held: 'disc' }, 'ムースケ|Moosley|驼鹿鹿|駝鹿鹿|무스케|Музли|मूज़ली|موزلي'),
      b('cool', { a: 'bird', c: [0x1a1a22, 0xf4f4f4, 0xc8282e], beak: 0x2a2a30, held: 'disc', ex: ['necklace'] }, 'ルーニー|Loonie|鲁尼|魯尼|루니|Луни|लूनी|لوني'),
      b('king', { a: 'bear', c: [0x7a5a3a, 0xf0dcc0, 0xc8282e], hat: 'tophat', hc: [0x2a2a38, 0xc8282e], held: 'hammer', ex: ['longbeard', 'cape'], bc: 0xd8d0c8, cape: 0xc8282e }, 'ウェットラベア|Wettlabear|韦特熊熊|韋特熊熊|웻토라베어|Ветлабер|वेटलाबेयर|ويتلابير'),
    ],
    alquerque: [
      b('sleepy', { a: 'cat', c: [0xf0dcc0, 0xfff8ee, 0x3a6ad8], held: 'piece', ex: ['scarf'], sc: 0x3a6ad8 }, 'パティオニャン|Patiokit|庭院喵|庭院喵|파티오냥|Патиокит|पैटियोकिट|باتيوكيت'),
      b('merchant', { a: 'camel', c: [0xd8b080, 0xfff0dc, 0x9a2a24], hat: 'turban', hc: [0x9a2a24, 0xffd65a], held: 'scroll' }, 'ジュータンダ|Carpamel|地毯驼驼|地毯駝駝|주탄다|Карпамел|कार्पामेल|كارباميل'),
      b('scholar', { a: 'owl', c: [0x9a8070, 0xf4eadc, 0x2a6a6a], hat: 'turban', hc: [0x2a6a6a, 0xffd65a], held: 'book', ex: ['longbeard'] }, 'イスファホー|Isfahowl|伊斯咕|伊斯咕|이스파호|Исфахоул|इस्फ़हाउल|إسفهاول'),
      b('cool', { a: 'hawk', c: [0x9a7a5a, 0xf4e6d0, 0x2a2a38], beak: 0xffc040, held: 'none', ex: ['scarf'], sc: 0x9a2a24 }, 'ファルコネロ|Falconero|鹰匠隼隼|鷹匠隼隼|파루코네로|Фальконеро|फ़ाल्कोनेरो|فالكونيرو'),
      b('knight', { a: 'horse', c: [0xe8d8c0, 0xfff6ea, 0xd8a040], hat: 'helmet', hc: [0xd8a040, 0xc8ccd8], held: 'sword', ex: ['armor', 'horsemane'] }, 'カバジェリート|Caballerito|骑士驹驹|騎士駒駒|가바예리토|Кабальерито|कबायेरितो|كاباييريتو'),
      b('lady', { a: 'deer', c: [0xe0b080, 0xfff4e6, 0x3a6ad8], hat: 'tiara', held: 'fan', ex: ['necklace'] }, 'アルハンゼル|Alhazelle|红宫羚羚|紅宮羚羚|아루한제루|Альхазель|अलहाज़ेल|ألهازيل'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x9a2a24], hat: 'crown', held: 'book', ex: ['cape', 'longbeard'], bc: 0x6a4a3a, cape: 0x9a2a24 }, 'アルフォンレオ|Alfonleo|阿方狮宝|阿方獅寶|아루폰레오|Альфонлео|अल्फ़ोनलियो|ألفونليو'),
    ],
    // ヒット＆ブロー (2026-11-16): code-breakers — a cub detective, the bull of the old pencil game Bulls & Cows, a fox who hides
    // the pins, a Bletchley Park falcon, a wild-guess frog, Knuth's owl (any code in five guesses, 1977), and Meirowitz, the
    // postmaster who made Mastermind (1970).
    hitblow: [
      b('sleepy', { a: 'rabbit', c: [0xf4ece4, 0xffffff, 0x2b3683], hat: 'beret', hc: [0x6a5a48], held: 'book', ex: ['scarf'], sc: 0x2b3683 }, 'ピョンロック|Bunlock|侦探兔兔|偵探兔兔|퐁록|Банлок|बनलॉक|بنلوك'),
      b('merchant', { a: 'bull', c: [0x9a6a48, 0xf4e2c8, 0xd83a4a], hat: 'cap', hc: [0xd83a4a], held: 'quill', ex: ['scarf'] }, 'ブルカウ|Bullcow|牛牛猜|牛牛猜|부루카우|Булкау|बुलकाउ|بولكاو'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x7a4ad8], hat: 'tophat', hc: [0x2a2a38, 0x7a4ad8], held: 'piece', mouth: 'w' }, 'ピンカクコン|Pinsly|藏针狐狐|藏針狐狐|핀카쿠콘|Пинсли|पिनस्ली|بينسلي'),
      b('cool', { a: 'hawk', c: [0x8a7a6a, 0xf4e6d0, 0x2b3683], beak: 0xffc040, held: 'scroll', ex: ['scarf', 'glasses'], sc: 0x2b3683 }, 'ブレッチブサ|Bletchcon|布莱隼隼|布萊隼隼|부렛치부사|Блетчкон|ब्लेचकॉन|بليتشكون'),
      b('hothead', { a: 'frog', c: [0x3ac85a, 0xd8f8c8, 0xf5c518], hat: 'bandana', hc: [0xf5c518], held: 'piece', mouth: 'w' }, 'アテズッケロ|Ribbiguess|瞎猜呱呱|瞎猜呱呱|아테즛케로|Риббигесс|रिबीगेस|ريبيغيس'),
      b('scholar', { a: 'owl', c: [0x9a8a7a, 0xf4eadc, 0x2b3683], held: 'book', ex: ['glasses', 'longbeard'], bc: 0xe8e0d8 }, 'クヌースホー|Knuthowl|克努咕|克努咕|구누스호|Кнутоул|क्नूथाउल|كنوثاول'),
      b('king', { a: 'lion', c: [0xf0c070, 0xfff4e0, 0x2b3683], hat: 'cap', hc: [0x2b3683, 0xffd65a], held: 'scroll', ex: ['mustache', 'cape'], cape: 0x2b3683 }, 'メイロヴィオン|Meirowion|梅罗狮宝|梅羅獅寶|메이로비온|Мейровион|मेइरोवियन|ميروفيون'),
    ],
    // 本双六 (2026-11-23, the museum's 木画紫檀双六局): Nara and Heian Japan — the deer of Nara, the envoys who brought the game from Tang China,
    // Sei Shōnagon (枕草子: 碁・双六 for idle hours), Emperor Shirakawa's dice he could not command, the Shōsōin's guards, the Tenpyō court.
    // the Game of the Goose (2026-11-23, the museum's chess and goose board, The Met 62.14): the game's own signs and its early history — a gosling,
    // a merchant from Gujarat where the board was made, the London printer who registered the game in 1597, the well (31), the one who waits at 58,
    // the king of Spain to whom the Medici sent the game, and the grand duke who sent it (a golden goose).
    goose: [
      b('sleepy', { a: 'bird', c: [0xffe07a, 0xfff8e0, 0xff9a3a], beak: 0xff9a3a, hat: 'straw', held: 'die' }, 'ガーピヨ|Gosling|小鹅啾|小鵝啾|꽥삐약|Гусёнок|गॉसलिंग|غوسلينغ'),
      b('merchant', { a: 'camel', c: [0xd8b078, 0xfff0d8, 0x2f7a4c], hat: 'turban', held: 'piece', ex: ['necklace'] }, 'グジャラクダ|Gujacamel|古吉驼驼|古吉駝駝|구자낙타|Гуджаверблюд|गुजाकैमल|غوجاجمل'),
      b('scholar', { a: 'owl', c: [0x8a7460, 0xf4eadc, 0x2a2a38], hat: 'beret', held: 'quill', ex: ['ruff'] }, 'ハンモトホー|Printowl|版元咕|版元咕|판모토호|Принтаул|प्रिंटाउल|برينتاول'),
      b('trickster', { a: 'frog', c: [0x6ab85a, 0xe8f8d8, 0x3a6ad8], hat: 'straw', held: 'die', ex: ['scarf'], sc: 0x3a6ad8 }, 'イドケロ|Wellfrog|井蛙呱|井蛙呱|우물개굴|Колодеквак|वेलफ़्रॉग|ويلفروغ'),
      b('villain', { a: 'wolf', c: [0xe8e4dc, 0xffffff, 0x2a2a38], hat: 'hood', held: 'staff', ex: ['robe'], rc: 0x2a2a38 }, 'ゴジュウハチ|Fiftyeight|五十八狼|五十八狼|오십팔랑|Пятьдесятвосемь|फ़िफ़्टीएट|فيفتي‌إيت'),
      b('king', { a: 'lion', c: [0xd8a04a, 0xfff0d0, 0x8a2a2a], hat: 'crown', held: 'scroll', ex: ['ruff'] }, 'フェリペオン|Felipeon|腓力狮王|腓力獅王|펠리페온|Фелипеон|फ़ेलिपियन|فيليبيون'),
      b('king', { a: 'bird', c: [0xffd65a, 0xfff8e0, 0xa8472c], beak: 0xff9a3a, hat: 'bigcrown', held: 'die', ex: ['cape'], cape: 0xa8472c }, 'メディチガチョウ|Medigoose|美第奇金鹅|梅迪奇金鵝|메디치거위|Медигусь|मेडिगूस|ميديغوس'),
    ],
    sugoroku: [
      b('sleepy', { a: 'cat', c: [0xf6ead6, 0xffffff, 0x2f6a44], hat: 'eboshi', held: 'die' }, 'ナラニャン|Narakit|奈良喵|奈良喵|나라냥|Наракит|नाराकिट|ناراكيت'),
      b('merchant', { a: 'deer', c: [0xc8945a, 0xfff4e6, 0xb8923a], hat: 'antlers', held: 'die', ex: ['necklace'] }, 'スゴロクジカ|Sugodeer|双六鹿鹿|雙六鹿鹿|스고로쿠지카|Сугодир|सुगोडियर|سوغودير'),
      b('scholar', { a: 'owl', c: [0x9a8070, 0xf4eadc, 0x8a3a3a], hat: 'eboshi', held: 'scroll', ex: ['robe'], rc: 0x8a3a3a }, 'ケントウホー|Kentowl|遣唐咕|遣唐咕|겐토호|Кентоул|केंटाउल|كينتاول'),
      b('lady', { a: 'rabbit', c: [0xfbfaf4, 0xffffff, 0xd8607a], hat: 'flowers', held: 'fan', ex: ['robe'], rc: 0xd8607a }, 'ショウナゴピョン|Shonagobun|少纳兔兔|少納兔兔|쇼나고퐁|Шонагобан|शोनागोबन|شوناغوبن'),
      b('trickster', { a: 'fox', c: [0xff9a4a, 0xfff4e6, 0x3a6ad8], hat: 'kasa', held: 'die', ex: ['scarf'], sc: 0x3a6ad8 }, 'サイノメコン|Dicefox|骰子狐狐|骰子狐狐|사이노메콘|Дайсфокс|डाइसफ़ॉक्स|دايسفوكس'),
      b('cool', { a: 'hawk', c: [0x8a6a4a, 0xf4e6d0, 0x2a2a38], beak: 0xffc040, hat: 'eboshi', held: 'die', ex: ['robe'], rc: 0x2a2a38 }, 'ショウソウタカ|Shosohawk|正仓隼|正倉隼|쇼소타카|Шосохок|शोसोहॉक|شوسوهوك'),
      b('king', { a: 'dragon', c: [0x2f6a44, 0xe0f4e0, 0xffd65a], hat: 'bigcrown', held: 'die', ex: ['cape'], cape: 0x6a3a8a }, 'テンピョウドラ|Tempyodra|天平龙宝|天平龍寶|덴표도라|Тэмпёдра|टेम्प्योड्रा|تيمبيودرا'),
    ],
    // peg solitaire (2026-11-14): no AI — the two Atlamo come with the goals of a game without hints (atlas/games/peg.js):
    // N 3 or fewer left · R one left · SR one left on ◎. The flat boards give the princess's, the pyramid Kepler's (UR in the gacha).
    peg: [
      b('lady', { a: 'squirrel', c: [0xc8865a, 0xfff2e2, 0x6a5ad8], hat: 'tiara', held: 'orb', ex: ['necklace', 'ruff'] }, 'スービリン|Soubirrel|苏比栗栗|蘇比栗栗|스비린|Субирел|सूबिरल|سوبيريل'),
      b('scholar', { a: 'owl', c: [0x9a8a7a, 0xf4eadc, 0x2a3a8a], hat: 'wizard', hc: [0x2a3a8a, 0xffd65a], held: 'orb', ex: ['ruff', 'glasses'] }, 'ケプラホー|Keplowl|开普咕|克卜咕|게푸라호|Кеплоул|केप्लाउल|كيبلاول'),
    ],
  };
  // celestial levels (2026-11-13): the levels above CEL[game] are beyond what people play — no rewards for a win. Their boss is the
  // last of the roster (cel: 1), whose only avatar is a gacha-only UR. The bosses before it keep their bands of three.
  A.CEL = { reversi: 28, konane: 23, ugolki: 23, agon: 23, amazons: 23, janggi: 20, latrunculi: 20, tafl: 25, chess: 25, shogi: 26, go: 32, connect4: 8, mancala: 10, dots: 10, morris: 10 };   // (2026-11-17: every game with 天上 levels)
  A.isCel = (g, lv) => !!A.CEL[g] && (lv | 0) > A.CEL[g];
  const nb = g => { const L = A.BOSSES[g] || []; return L.length - (L.length && L[L.length - 1].cel ? 1 : 0); };   // the bosses people play
  // a game's boss for an AI level (levels beyond the roster count as the last boss)
  A.band = (g, lv) => { const L = A.BOSSES[g]; if (!L) return -1; if (A.isCel(g, lv)) return L.length - 1; return Math.max(0, Math.min(nb(g) - 1, Math.floor((Math.max(1, lv | 0) - 1) / 3))); };
  A.bossId = (g, i) => `boss-${g}-${i + 1}`;
  // the strongest boss people play, and the celestial one: UR (the image is tier 3)
  A.top = (g, i) => { const L = A.BOSSES[g]; return !!L && (i === nb(g) - 1 || !!(L[i] && L[i].cel)); };
  // the avatar tier a win at this level gives: 0 = N, 1 = R, 2 = SR (Lv.1 N, 2 R, 3 SR, 4 N …; levels past the roster: SR); −1 = nothing (celestial)
  A.tier = (g, lv) => { if (A.isCel(g, lv)) return -1; const i = A.band(g, lv); return i < 0 ? 2 : Math.max(0, Math.min(2, (Math.max(1, lv | 0) - 1) - i * 3)); };
  A.range = (g, i) => {
    const L = A.BOSSES[g], top = A.LEVELS[g] || 20, human = A.CEL[g] || top;
    if (L && L[i] && L[i].cel) return human + 1 >= top ? 'Lv.' + top : `Lv.${human + 1}–${top}`;
    const lo = i * 3 + 1, hi = Math.min(human, i * 3 + 3); return lo === hi ? 'Lv.' + lo : `Lv.${lo}–${hi}`; };
  // the 50 gacha creatures: how they talk when they come to watch (default: cute)
  A.VOICE = { shogi: 'samurai', knight: 'knight', disc: 'sleepy', tile: 'scholar', stone: 'cool', dot: 'cute', plop: 'cute', gem: 'merchant', dice: 'hothead', owl: 'trickster', crab: 'pirate',
    rook: 'sleepy', bishop: 'priest', pawn: 'cute', ryuou: 'king', keima: 'trickster', flippanda: 'sleepy', goke: 'merchant', renju: 'cute', camel: 'sage', ringsnake: 'cool', joker: 'trickster',
    hedgehog: 'cute', momonga: 'cool', koala: 'sleepy', otter: 'cute', deer: 'lady', seal: 'cute', duck: 'hothead', hamster: 'merchant', piglet: 'cute', beaver: 'hothead', snail: 'sleepy',
    hippo: 'sleepy', mole: 'scholar', crane: 'lady', goat: 'sage', dragonfly: 'hothead', butterfly: 'lady', monkey: 'trickster', teddy: 'cute', bee: 'hothead', marble: 'cute', jelly: 'sleepy',
    redpanda: 'cute', frog: 'cute', ghost: 'trickster', daruma: 'samurai', sealion: 'pirate', hermit: 'scholar' };
})();
