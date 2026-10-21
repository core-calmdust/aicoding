/* =====================================================================
   World Board Game Atlas — collectible items (avatar icons, backgrounds,
   frames) drawn as inline SVG. Everything is generated from small tables,
   so adding an item = adding one line to a list below.
     AtlasArt.items          [{ id, kind:'icon'|'bg'|'frame', rar:0..4, name:{ja,en,zh,ko,es,fr,pt,de,hi,ar} }]
     AtlasArt.byId(id)
     AtlasArt.svg(id)        SVG markup for the item alone
     AtlasArt.avatar({icon,bg,frame}, size)  composed avatar
     AtlasArt.bgCss(id)      CSS background for a profile card
   Rarity: 0 N · 1 R · 2 SR · 3 SSR · 4 UR
   ===================================================================== */
(function () {
  'use strict';
  const RAR = ['N', 'R', 'SR', 'SSR', 'UR'];

  /* ---------- avatars: 3D plush creatures, pre-rendered (atlas/avatars3d.js → images/atlas/av/<species>-<tier>.webp) ----------
     50 species × 4 tiers. tier 0 N · 1 R · 2 SR · 3 SSR (UR for the species marked ur). */
  const BASE = (() => { try { return new URL('../images/atlas/', document.currentScript.src).href; } catch (e) { return '../images/atlas/'; } })();
  const AVV = 1;   // bump when the avatar images are re-rendered
  // [species, ur, names {ja,en,zh,ko,es,fr,pt,de,hi,ar}]
  const AV = [
    ['shogi', 0, {"ja": "ショウギツネ", "en": "Shogitsune", "zh": "将棋狐", "ko": "쇼기츠네", "hi": "शोगित्सुने", "ar": "شوغيتسوني"}],
    ['knight', 0, {"ja": "ナイトン", "en": "Knighton", "zh": "骑士驹", "ko": "나이톤", "hi": "नाइटन", "ar": "نايتون"}],
    ['disc', 0, {"ja": "リバガメ", "en": "Flipturtle", "zh": "翻翻龟", "ko": "리바가메", "hi": "फ्लिपटर्टल", "ar": "فليبترتل"}],
    ['tile', 0, {"ja": "スウボ", "en": "Numbot", "zh": "数独宝", "ko": "스우보", "hi": "नमबॉट", "ar": "نامبوت"}],
    ['stone', 0, {"ja": "ゴイシペン", "en": "Stoneguin", "zh": "棋子企鹅", "ko": "고이시펭", "hi": "स्टोनगुइन", "ar": "ستونغوين"}],
    ['dot', 0, {"ja": "ハコピヨ", "en": "Boxchick", "zh": "盒盒鸡", "ko": "하코피요", "hi": "बॉक्सचिक", "ar": "بوكستشيك"}],
    ['plop', 0, {"ja": "ポトンウサ", "en": "Plopbun", "zh": "叮咚兔", "ko": "포통우사", "hi": "प्लॉपबन", "ar": "بلوب بن"}],
    ['gem', 0, {"ja": "マンカラビ", "en": "Gembeetle", "zh": "宝石甲虫", "ko": "만카라비", "hi": "जेमबीटल", "ar": "جيم بيتل"}],
    ['dice', 1, {"ja": "ダイスン", "en": "Dicepup", "zh": "骰子汪", "ko": "다이슨", "hi": "डाइसपप", "ar": "دايس باب"}],
    ['owl', 0, {"ja": "モリフク", "en": "Millowl", "zh": "方阵猫头鹰", "ko": "모리후쿠", "hi": "मिलआउल", "ar": "ميل أول"}],
    ['crab', 0, {"ja": "チェッカニ", "en": "Checkrab", "zh": "跳棋蟹", "ko": "체카니", "hi": "चेकरैब", "ar": "تشيكراب"}],
    ['rook', 1, {"ja": "ルークゾウ", "en": "Rookephant", "zh": "城堡象", "ko": "루크조우", "hi": "रूकेफ़ैंट", "ar": "روكيفانت"}],
    ['bishop', 0, {"ja": "ビショップアルパカ", "en": "Bishpaca", "zh": "主教羊驼", "ko": "비숍알파카", "hi": "बिशपाका", "ar": "بيشباكا"}],
    ['pawn', 0, {"ja": "ポーンひつじ", "en": "Pawnlamb", "zh": "小兵羊", "ko": "폰양", "hi": "पॉनलैंब", "ar": "باون لامب"}],
    ['ryuou', 1, {"ja": "リュウオウ", "en": "Ryuoh", "zh": "龙王宝宝", "ko": "류오", "hi": "र्यूओ", "ar": "ريوو"}],
    ['keima', 0, {"ja": "ケイマウス", "en": "Keimouse", "zh": "桂马鼠", "ko": "케이마우스", "hi": "केइमाउस", "ar": "كيماوس"}],
    ['flippanda', 0, {"ja": "ウラオモテパンダ", "en": "Flipanda", "zh": "黑白熊猫", "ko": "우라오모테판다", "hi": "फ्लिपांडा", "ar": "فليباندا"}],
    ['goke', 0, {"ja": "ゴケタヌキ", "en": "Gokenuki", "zh": "棋罐狸", "ko": "고케타누키", "hi": "गोकेनुकी", "ar": "غوكينوكي"}],
    ['renju', 0, {"ja": "レンジュリス", "en": "Renjirrel", "zh": "连珠松鼠", "ko": "렌주다람쥐", "hi": "रेंजिरल", "ar": "رينجيريل"}],
    ['camel', 0, {"ja": "スナドケイラクダ", "en": "Sandglass Camel", "zh": "沙漏骆驼", "ko": "모래시계낙타", "hi": "रेतघड़ी ऊँट", "ar": "جمل الساعة الرملية"}],
    ['ringsnake', 0, {"ja": "チエノワヘビ", "en": "Puzzlesnake", "zh": "九连环蛇", "ko": "지혜의고리뱀", "hi": "पज़लस्नेक", "ar": "أفعى الألغاز"}],
    ['joker', 1, {"ja": "ジョーカーネコ", "en": "Jesterkit", "zh": "小丑猫", "ko": "조커냥이", "hi": "जेस्टरकिट", "ar": "جيستركيت"}],
    ['hedgehog', 0, {"ja": "ハートハリネズミ", "en": "Hearthog", "zh": "红心刺猬", "ko": "하트고슴도치", "hi": "हार्टहॉग", "ar": "هارتهوغ"}],
    ['momonga', 0, {"ja": "スペードモモンガ", "en": "Spadeglider", "zh": "黑桃鼯鼠", "ko": "스페이드날다람쥐", "hi": "स्पेडग्लाइडर", "ar": "سبيد غلايدر"}],
    ['koala', 0, {"ja": "クローバーコアラ", "en": "Clubkoala", "zh": "梅花考拉", "ko": "클로버코알라", "hi": "क्लबकोआला", "ar": "كلوب كوالا"}],
    ['otter', 0, {"ja": "ラッコパイ", "en": "Tileotter", "zh": "麻将海獭", "ko": "마작해달", "hi": "टाइलऑटर", "ar": "تايل أوتر"}],
    ['deer', 0, {"ja": "ハナフダシカ", "en": "Fudafawn", "zh": "花札小鹿", "ko": "하나후다사슴", "hi": "फ़ुडाफ़ॉन", "ar": "فودا فاون"}],
    ['seal', 0, {"ja": "メンコアザラシ", "en": "Menkoseal", "zh": "画片海豹", "ko": "딱지물범", "hi": "मेंकोसील", "ar": "مينكو سيل"}],
    ['duck', 0, {"ja": "ドミノダック", "en": "Dominoduck", "zh": "多米诺鸭", "ko": "도미노오리", "hi": "डोमिनोडक", "ar": "دومينو دك"}],
    ['hamster', 1, {"ja": "コインハム", "en": "Coinhammy", "zh": "金币仓鼠", "ko": "코인햄", "hi": "कॉइनहैमी", "ar": "كوين هامي"}],
    ['piglet', 0, {"ja": "もじブタ", "en": "Wordpig", "zh": "字母小猪", "ko": "글자돼지", "hi": "वर्डपिग", "ar": "ورد بيغ"}],
    ['beaver', 0, {"ja": "ツミキビーバー", "en": "Blockbeaver", "zh": "积木河狸", "ko": "쌓기나무비버", "hi": "ब्लॉकबीवर", "ar": "بلوك بيفر"}],
    ['snail', 1, {"ja": "タワーカタツムリ", "en": "Towersnail", "zh": "汉诺塔蜗牛", "ko": "타워달팽이", "hi": "टावरस्नेल", "ar": "تاور سنيل"}],
    ['hippo', 0, {"ja": "キューブカバ", "en": "Cubehippo", "zh": "魔方河马", "ko": "큐브하마", "hi": "क्यूबहिप्पो", "ar": "كيوب هيبو"}],
    ['mole', 0, {"ja": "メイロモグラ", "en": "Mazemole", "zh": "迷宫鼹鼠", "ko": "미로두더지", "hi": "मेज़मोल", "ar": "ميز مول"}],
    ['crane', 0, {"ja": "オリガミツル", "en": "Origrane", "zh": "折纸鹤", "ko": "종이학", "hi": "ओरिग्रेन", "ar": "أوريغرين"}],
    ['goat', 0, {"ja": "アヤトリヤギ", "en": "Cradlegoat", "zh": "翻花绳山羊", "ko": "실뜨기염소", "hi": "क्रेडलगोट", "ar": "كريدل غوت"}],
    ['dragonfly', 0, {"ja": "タケトンボ", "en": "Coptrafly", "zh": "竹蜻蜓", "ko": "대나무잠자리", "hi": "कॉप्टराफ़्लाई", "ar": "كوبترافلاي"}],
    ['butterfly', 1, {"ja": "マンゲキョウチョウ", "en": "Kaleidofly", "zh": "万花筒蝶", "ko": "만화경나비", "hi": "कैलिडोफ़्लाई", "ar": "كاليدوفلاي"}],
    ['monkey', 0, {"ja": "ヨーヨーサル", "en": "Yoyomonk", "zh": "悠悠球猴", "ko": "요요원숭이", "hi": "योयोमंक", "ar": "يويومنك"}],
    ['teddy', 1, {"ja": "テディクマ", "en": "Teddybear", "zh": "泰迪熊", "ko": "테디곰", "hi": "टेडीबेयर", "ar": "تيدي بير"}],
    ['bee', 0, {"ja": "ヘックスビー", "en": "Hexbee", "zh": "六角蜜蜂", "ko": "헥스벌", "hi": "हेक्सबी", "ar": "هيكس بي"}],
    ['marble', 1, {"ja": "ビーだまスライム", "en": "Marblob", "zh": "弹珠史莱姆", "ko": "구슬슬라임", "hi": "मार्बलॉब", "ar": "ماربلوب"}],
    ['jelly', 0, {"ja": "オハジキクラゲ", "en": "Chiplyfish", "zh": "玻璃片水母", "ko": "오하지키해파리", "hi": "चिपलीफ़िश", "ar": "تشيبلي فيش"}],
    ['redpanda', 0, {"ja": "ケンダマレッサー", "en": "Kendamapanda", "zh": "剑玉小熊猫", "ko": "켄다마레서판다", "hi": "केंडामापांडा", "ar": "كيندامابندا"}],
    ['frog', 0, {"ja": "スゴロクカエル", "en": "Sugorofrog", "zh": "双六青蛙", "ko": "주사위놀이개구리", "hi": "सुगोरोफ़्रॉग", "ar": "سوغوروفروغ"}],
    ['ghost', 0, {"ja": "フクワライおばけ", "en": "Fukuboo", "zh": "福笑幽灵", "ko": "복웃음유령", "hi": "फ़ुकुबू", "ar": "فوكوبو"}],
    ['daruma', 1, {"ja": "ダルマオトシ", "en": "Darumadrop", "zh": "达摩积木", "ko": "다루마오토시", "hi": "दारुमाड्रॉप", "ar": "داروما دروب"}],
    ['sealion', 0, {"ja": "ボールアシカ", "en": "Bingopup", "zh": "宾果海狮", "ko": "빙고강치", "hi": "बिंगोपप", "ar": "بينغو باب"}],
    ['hermit', 0, {"ja": "ハコヤドカリ", "en": "Boxhermit", "zh": "盒子寄居蟹", "ko": "상자소라게", "hi": "बॉक्सहर्मिट", "ar": "بوكس هيرميت"}],
  ];
  const TIER_NAME = {
    ja: ['', 'カラフル', 'おしゃれ', 'キラキラ', 'ゴールド'], en: ['', 'Pop', 'Chic', 'Sparkle', 'Golden'], zh: ['', '缤纷', '时髦', '闪亮', '黄金'],
    ko: ['', '컬러풀', '멋쟁이', '반짝반짝', '골든'], es: ['', 'Pop', 'Chic', 'Brillante', 'Dorado'], fr: ['', 'Pop', 'Chic', 'Scintillant', 'Doré'],
    pt: ['', 'Pop', 'Chique', 'Brilhante', 'Dourado'], de: ['', 'Pop', 'Schick', 'Glitzer', 'Gold'], hi: ['', 'रंगीन', 'स्टाइलिश', 'चमकीला', 'सुनहरा'], ar: ['', 'ملوّن', 'أنيق', 'لامع', 'ذهبي'],
  };
  const avUrl = id => BASE + 'av/' + id.slice(3) + '.webp?v=' + AVV;
  // backgrounds: 3D-rendered images (atlas/bg3d.js → images/atlas/bg/<id>.webp). Skies are one picture, the rest seamless tiles.
  const BGV = 1, COVER_PAT = { sky: 1, meadow: 1, sea: 1, snowscape: 1, toytown: 1, space: 1 }, DARK_COL = { night: 1, forest: 1, ocean: 1, berry: 1 }, COVER = {};
  const bgUrl = id => BASE + 'bg/' + id + '.webp?v=' + BGV;
  // frames: 3D-rendered rings (atlas/frame3d.js → images/atlas/frame/<key>.webp), drawn over the whole 100×100 avatar
  const FRV = 1, frameImg = k => `<image href="${BASE}frame/${k}.webp?v=${FRV}" x="0" y="0" width="100" height="100"/>`;

  /* ---------- backgrounds (patterns) ---------- */
  const pat = (id, w, body) => `<pattern id="${id}" width="${w}" height="${w}" patternUnits="userSpaceOnUse">${body}</pattern>`;
  const BG = {
    plain: (a, b) => ({ p: '', fill: a }),
    dots: (a, b, u) => ({ p: pat(u, 20, `<rect width="20" height="20" fill="${a}"/><circle cx="10" cy="10" r="3.2" fill="${b}"/>`), fill: `url(#${u})` }),
    stripe: (a, b, u) => ({ p: pat(u, 20, `<rect width="20" height="20" fill="${a}"/><path d="M-5 5l10-10M0 20L20 0M15 25l10-10" stroke="${b}" stroke-width="5"/>`), fill: `url(#${u})` }),
    checker: (a, b, u) => ({ p: pat(u, 24, `<rect width="24" height="24" fill="${a}"/><rect width="12" height="12" fill="${b}"/><rect x="12" y="12" width="12" height="12" fill="${b}"/>`), fill: `url(#${u})` }),
    goban: (a, b, u) => ({ p: pat(u, 16, `<rect width="16" height="16" fill="${a}"/><path d="M8 0v16M0 8h16" stroke="${b}" stroke-width="1.2"/>`), fill: `url(#${u})` }),
    wave: (a, b, u) => ({ p: pat(u, 28, `<rect width="28" height="28" fill="${a}"/><path d="M0 14q7-8 14 0t14 0" stroke="${b}" stroke-width="3" fill="none"/>`), fill: `url(#${u})` }),
    star: (a, b, u) => ({ p: pat(u, 30, `<rect width="30" height="30" fill="${a}"/><path d="M15 6l2.4 5.6l6 .6l-4.6 4l1.4 6l-5.2-3.2l-5.2 3.2l1.4-6l-4.6-4l6-.6z" fill="${b}"/>`), fill: `url(#${u})` }),
    heart: (a, b, u) => ({ p: pat(u, 26, `<rect width="26" height="26" fill="${a}"/><path d="M13 19s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.4a3.6 3.6 0 0 1 7 1.4c0 4.6-7 9-7 9z" fill="${b}"/>`), fill: `url(#${u})` }),
    hex: (a, b, u) => ({ p: pat(u, 24, `<rect width="24" height="24" fill="${a}"/><path d="M12 2l9 5v10l-9 5l-9-5V7z" fill="none" stroke="${b}" stroke-width="2"/>`), fill: `url(#${u})` }),
    pip: (a, b, u) => ({ p: pat(u, 30, `<rect width="30" height="30" fill="${a}"/><path d="M3 0l6 14l6-14M15 30l6-14l6 14" fill="${b}"/>`), fill: `url(#${u})` }),
    sakura: (a, b, u) => ({ p: pat(u, 34, `<rect width="34" height="34" fill="${a}"/><g fill="${b}" transform="translate(17 17)">${[0, 72, 144, 216, 288].map(r => `<ellipse cx="0" cy="-5" rx="3.2" ry="5" transform="rotate(${r})"/>`).join('')}<circle r="2" fill="#fff"/></g>`), fill: `url(#${u})` }),
    sky: (a, b, u) => ({ p: `<linearGradient id="${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`, fill: `url(#${u})` }),
  };
  const BG_NAME = {
    plain: ['むじ', 'Plain'], dots: ['ドット', 'Dots'], stripe: ['ストライプ', 'Stripes'], checker: ['チェッカー', 'Checker'], goban: ['碁盤', 'Go board'], wave: ['なみ', 'Waves'],
    star: ['ほしぞら', 'Stars'], heart: ['ハート', 'Hearts'], hex: ['ヘックス', 'Hex'], pip: ['バックギャモン', 'Points'], sakura: ['さくら', 'Sakura'], sky: ['グラデーション', 'Gradient'],
    cloud: ['くも', 'Clouds'], bubble: ['あわ', 'Bubbles'], flower: ['おはな', 'Flowers'], leaf: ['はっぱ', 'Leaves'], argyle: ['アーガイル', 'Argyle'], plaid: ['タータン', 'Tartan'], scale: ['うろこ', 'Scales'], moon: ['つき', 'Moons'], dice: ['サイコロ', 'Dice'], chess: ['チェス', 'Chess'], cards: ['トランプ', 'Cards'], stones: ['碁石', 'Go stones'], shogi: ['将棋の駒', 'Shogi pieces'], candy: ['キャンディ', 'Candy'], meadow: ['はらっぱ', 'Meadow'], sea: ['うみ', 'Sea'], snowscape: ['ゆきげしき', 'Snowscape'], toytown: ['おもちゃの町', 'Toy town'], space: ['うちゅう', 'Space'],
  };
  const BGCOL = {
    cream: ['#fff6df', '#ffe7a8', 'クリーム', 'Cream'], mint: ['#e3fbef', '#a8ecc9', 'ミント', 'Mint'], sky: ['#e2f4ff', '#a9dcff', 'そら', 'Sky'],
    rose: ['#ffe6ef', '#ffb5cf', 'ローズ', 'Rose'], lilac: ['#efe8ff', '#cdb8ff', 'ライラック', 'Lilac'], night: ['#26304f', '#43517f', 'よる', 'Night'],
    sunset: ['#ffd27a', '#ff7f9e', 'ゆうやけ', 'Sunset'], wood: ['#f2d49b', '#d9ae67', 'もくめ', 'Wood'], gold: ['#fff1b8', '#ffc93d', 'ゴールド', 'Gold'],
    peach: ['#ffe9dc', '#ffbe9c', 'ピーチ', 'Peach'], lemon: ['#fffbd6', '#fff08a', 'レモン', 'Lemon'], snow: ['#f7f9fc', '#dbe4f0', 'スノー', 'Snow'], coral: ['#ffe2dc', '#ff9a8a', 'コーラル', 'Coral'], forest: ['#23402f', '#3d6b4c', 'フォレスト', 'Forest'], ocean: ['#1f3b55', '#2f6a8f', 'オーシャン', 'Ocean'], berry: ['#4a2340', '#8a3f74', 'ベリー', 'Berry'], cocoa: ['#e8d5c4', '#b98a66', 'ココア', 'Cocoa'], rainbow: ['#ffe1ef', '#bfe6ff', 'にじいろ', 'Rainbow'],
  };

  /* ---------- frames ---------- */
  const FRAME = {
    none: { r: 0, n: ['なし', 'None'], d: () => '' },
    white: { r: 0, n: ['しろ', 'White'], d: () => ring('#fff', 7) },
    coral: { r: 0, n: ['コーラル', 'Coral'], d: () => ring('#ff6b6b', 7) },
    sky: { r: 0, n: ['スカイ', 'Sky'], d: () => ring('#4cc3ff', 7) },
    mint: { r: 1, n: ['ミント', 'Mint'], d: () => ring('#4fd8a0', 7) + ring('#fff', 2, 44) },
    candy: { r: 1, n: ['キャンディ', 'Candy'], d: () => `<circle cx="50" cy="50" r="46.5" fill="none" stroke="#fff" stroke-width="7"/><circle cx="50" cy="50" r="46.5" fill="none" stroke="#ff8fc7" stroke-width="7" stroke-dasharray="9 9"/>` },
    board: { r: 2, n: ['チェッカー', 'Checker'], d: () => `<circle cx="50" cy="50" r="46.5" fill="none" stroke="#2b3044" stroke-width="7"/><circle cx="50" cy="50" r="46.5" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="7.3 7.3"/>` },
    rainbow: { r: 2, n: ['にじ', 'Rainbow'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset=".3" stop-color="#ffd23f"/><stop offset=".6" stop-color="#4fd8a0"/><stop offset="1" stop-color="#a17cff"/></linearGradient></defs><circle cx="50" cy="50" r="46.5" fill="none" stroke="url(#${u})" stroke-width="7"/>` },
    laurel: { r: 3, n: ['月桂冠', 'Laurel'], d: () => ring('#4fd8a0', 5) + Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return `<ellipse cx="${50 + 46 * Math.cos(a)}" cy="${50 + 46 * Math.sin(a)}" rx="3.2" ry="6.5" fill="#22aa74" transform="rotate(${a * 180 / Math.PI + 30} ${50 + 46 * Math.cos(a)} ${50 + 46 * Math.sin(a)})"/>`; }).join('') },
    gold: { r: 3, n: ['ゴールド', 'Gold'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#ffc93d"/><stop offset="1" stop-color="#d48a00"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="none" stroke="url(#${u})" stroke-width="8"/>` + [0, 90, 180, 270].map(r => `<circle cx="50" cy="4" r="3.6" fill="#fff" transform="rotate(${r} 50 50)"/>`).join('') },
    // added later (all frames are 3D images now; d() is only the SVG fallback ring)
    cream: { r: 0, n: ['クリーム', 'Cream'], d: () => ring('#fff', 7) },
    lemon: { r: 0, n: ['レモン', 'Lemon'], d: () => ring('#fff', 7) },
    lilac: { r: 0, n: ['ライラック', 'Lilac'], d: () => ring('#fff', 7) },
    peach: { r: 0, n: ['ピーチ', 'Peach'], d: () => ring('#fff', 7) },
    rose: { r: 0, n: ['ローズ', 'Rose'], d: () => ring('#fff', 7) },
    ink: { r: 0, n: ['インク', 'Ink'], d: () => ring('#fff', 7) },
    dots: { r: 0, n: ['ドット', 'Dots'], d: () => ring('#fff', 7) },
    stitch: { r: 0, n: ['ステッチ', 'Stitch'], d: () => ring('#fff', 7) },
    ribbon: { r: 0, n: ['リボン', 'Ribbon'], d: () => ring('#fff', 7) },
    cloud: { r: 0, n: ['くも', 'Cloud'], d: () => ring('#fff', 7) },
    bubble: { r: 1, n: ['あわ', 'Bubbles'], d: () => ring('#fff', 7) },
    daisy: { r: 1, n: ['デイジー', 'Daisy'], d: () => ring('#fff', 7) },
    vine: { r: 1, n: ['つる', 'Vine'], d: () => ring('#fff', 7) },
    hearts: { r: 1, n: ['ハート', 'Hearts'], d: () => ring('#fff', 7) },
    stars: { r: 1, n: ['ほし', 'Stars'], d: () => ring('#fff', 7) },
    beads: { r: 1, n: ['ビーズ', 'Beads'], d: () => ring('#fff', 7) },
    donut: { r: 1, n: ['ドーナツ', 'Donut'], d: () => ring('#fff', 7) },
    twotone: { r: 1, n: ['ツートン', 'Two-tone'], d: () => ring('#fff', 7) },
    pearl: { r: 1, n: ['パール', 'Pearl'], d: () => ring('#fff', 7) },
    paw: { r: 1, n: ['にくきゅう', 'Paws'], d: () => ring('#fff', 7) },
    cookie: { r: 1, n: ['クッキー', 'Cookie'], d: () => ring('#fff', 7) },
    dice: { r: 2, n: ['サイコロ', 'Dice'], d: () => ring('#fff', 7) },
    go: { r: 2, n: ['碁石', 'Go stones'], d: () => ring('#fff', 7) },
    reversi: { r: 2, n: ['リバーシ', 'Reversi'], d: () => ring('#fff', 7) },
    chess: { r: 2, n: ['チェス', 'Chess'], d: () => ring('#fff', 7) },
    shogi: { r: 2, n: ['将棋', 'Shogi'], d: () => ring('#fff', 7) },
    cards: { r: 2, n: ['トランプ', 'Cards'], d: () => ring('#fff', 7) },
    sakura: { r: 2, n: ['さくら', 'Sakura'], d: () => ring('#fff', 7) },
    mancala: { r: 2, n: ['マンカラ', 'Mancala'], d: () => ring('#fff', 7) },
    sudoku: { r: 2, n: ['数独', 'Sudoku'], d: () => ring('#fff', 7) },
    jewel: { r: 3, n: ['ジュエル', 'Jewel'], d: () => ring('#fff', 7) },
    moon: { r: 3, n: ['つきよ', 'Moonlight'], d: () => ring('#fff', 7) },
    ocean: { r: 3, n: ['うみ', 'Ocean'], d: () => ring('#fff', 7) },
    autumn: { r: 3, n: ['もみじ', 'Autumn'], d: () => ring('#fff', 7) },
    snow: { r: 3, n: ['ゆき', 'Snow'], d: () => ring('#fff', 7) },
    sunflower: { r: 3, n: ['ひまわり', 'Sunflower'], d: () => ring('#fff', 7) },
    galaxy: { r: 4, n: ['ぎんが', 'Galaxy'], d: () => ring('#fff', 7) },
    prism: { r: 4, n: ['プリズム', 'Prism'], d: () => ring('#fff', 7) },
    royal: { r: 4, n: ['ロイヤル', 'Royal'], d: () => ring('#fff', 7) },
    atlas: { r: 4, n: ['アトラス', 'Atlas'], d: u => `<defs><linearGradient id="${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4cc3ff"/><stop offset=".5" stop-color="#a17cff"/><stop offset="1" stop-color="#ff8fc7"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="none" stroke="url(#${u})" stroke-width="8"/>` + Array.from({ length: 8 }, (_, i) => `<path d="M50 0l2.6 5.4l5.4 2.6l-5.4 2.6L50 16l-2.6-5.4L42 8l5.4-2.6z" fill="#fff" transform="rotate(${i * 45} 50 50)"/>`).join('') },
  };
  function ring(col, w, r = 46.5) { return `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="${w}"/>`; }

  /* ---------- catalog ---------- */
  const BGS = []; // [pattern, colour, rarity]
  const bg = (p, c, r) => BGS.push({ p, c, r });
  [['plain', 'cream'], ['plain', 'mint'], ['plain', 'sky'], ['plain', 'rose'], ['plain', 'lilac'], ['dots', 'cream'], ['dots', 'sky'], ['stripe', 'mint'], ['stripe', 'rose']].forEach(([p, c]) => bg(p, c, 0));
  [['checker', 'cream'], ['checker', 'lilac'], ['goban', 'wood'], ['wave', 'sky'], ['wave', 'mint'], ['heart', 'rose'], ['hex', 'lilac'], ['dots', 'night']].forEach(([p, c]) => bg(p, c, 1));
  [['pip', 'wood'], ['star', 'night'], ['sakura', 'rose'], ['hex', 'night'], ['checker', 'night'], ['star', 'lilac']].forEach(([p, c]) => bg(p, c, 2));
  [['sky', 'sunset'], ['sakura', 'night'], ['star', 'sunset'], ['goban', 'gold']].forEach(([p, c]) => bg(p, c, 3));
  [['sky', 'night'], ['star', 'gold']].forEach(([p, c]) => bg(p, c, 4));
  // b030…b100 (added later; appended so the older ids never move)
  [["cloud", "sky", 0], ["cloud", "rose", 0], ["bubble", "mint", 0], ["bubble", "lilac", 0], ["flower", "cream", 0], ["flower", "peach", 0], ["leaf", "mint", 0], ["leaf", "lemon", 0], ["plain", "peach", 0], ["plain", "lemon", 0], ["plain", "snow", 0], ["dots", "peach", 0], ["dots", "lemon", 0], ["stripe", "sky", 0], ["stripe", "lilac", 0], ["checker", "mint", 0], ["checker", "peach", 0], ["wave", "rose", 0], ["heart", "lilac", 0], ["argyle", "cream", 0], ["scale", "sky", 0], ["argyle", "rose", 1], ["plaid", "coral", 1], ["plaid", "forest", 1], ["scale", "mint", 1], ["moon", "lilac", 1], ["dice", "cream", 1], ["dice", "sky", 1], ["chess", "cream", 1], ["chess", "mint", 1], ["cards", "rose", 1], ["cards", "snow", 1], ["stones", "wood", 1], ["stones", "snow", 1], ["shogi", "wood", 1], ["candy", "rose", 1], ["candy", "lemon", 1], ["flower", "night", 1], ["leaf", "forest", 1], ["bubble", "ocean", 1], ["heart", "coral", 1], ["dice", "night", 2], ["chess", "night", 2], ["cards", "night", 2], ["shogi", "cocoa", 2], ["stones", "night", 2], ["moon", "night", 2], ["scale", "ocean", 2], ["plaid", "berry", 2], ["argyle", "berry", 2], ["candy", "berry", 2], ["sakura", "peach", 2], ["hex", "mint", 2], ["star", "ocean", 2], ["wave", "ocean", 2], ["cloud", "sunset", 2], ["meadow", "lemon", 2], ["sea", "sky", 3], ["meadow", "mint", 3], ["snowscape", "snow", 3], ["toytown", "cream", 3], ["sky", "peach", 3], ["chess", "gold", 3], ["cards", "gold", 3], ["dice", "gold", 3], ["star", "berry", 3], ["space", "night", 4], ["sky", "rainbow", 4], ["toytown", "night", 4], ["sea", "sunset", 4], ["star", "rainbow", 4]].forEach(([p, c, r]) => bg(p, c, r));

  const items = [];
  AV.forEach(([sp, ur, nm]) => {
    for (let t = 0; t < 4; t++) {
      const rar = t < 3 ? t : (ur ? 4 : 3), name = {};
      Object.keys(TIER_NAME).forEach(l => { const n = nm[l] || nm.en, w = TIER_NAME[l][rar === 4 ? 4 : t]; name[l] = w ? (l === 'ja' ? `${n}（${w}）` : `${n} (${w})`) : n; });
      items.push({ id: `av-${sp}-${t}`, kind: 'icon', rar, d: { sp, t }, name });
    }
  });
  BGS.forEach((o, i) => {
    const pn = BG_NAME[o.p], c = BGCOL[o.c];
    items.push({ id: 'b' + String(i + 1).padStart(3, '0'), kind: 'bg', rar: o.r, d: o, name: { ja: c[2] + 'の' + pn[0], en: c[3] + ' ' + pn[1] } });
  });
  Object.keys(FRAME).forEach(k => items.push({ id: 'f-' + k, kind: 'frame', rar: FRAME[k].r, d: { k }, name: { ja: FRAME[k].n[0], en: FRAME[k].n[1] } }));
  /* ---------- item names in the other 8 languages (ja / en are built above) ---------- */
  // per language: critters, accessories, bg patterns, bg colours, frames (same key order as the tables above), and how they combine
  const BPK = Object.keys(BG_NAME), BCK = Object.keys(BGCOL), FRK = Object.keys(FRAME);
  const NAMES = {
    zh: {
      bp: '纯色|圆点|条纹|格子|棋盘格|波浪|星空|爱心|六边形|双陆棋|樱花|渐变|云朵|泡泡|小花|叶子|菱格|格纹|鳞片|月亮|骰子|国际象棋|扑克|围棋子|将棋子|糖果|草原|大海|雪景|玩具小镇|宇宙', bc: '奶油|薄荷|天空|玫瑰|丁香|夜晚|晚霞|木纹|金色|蜜桃|柠檬|雪白|珊瑚|森林|海洋|莓果|可可|彩虹', fr: '无|白色|珊瑚|天空|薄荷|糖果|棋盘|彩虹|月桂冠|金色|奶油|柠檬|丁香|蜜桃|玫瑰|墨色|圆点|缝线|丝带|云朵|泡泡|雏菊|藤蔓|爱心|星星|串珠|甜甜圈|双色|珍珠|肉球|饼干|骰子|围棋子|黑白棋|国际象棋|将棋|扑克|樱花|播棋|数独|宝石|月夜|海洋|红叶|雪花|向日葵|银河|棱镜|皇家|阿特拉斯',
      bg: (p, c) => c + p },
    ko: {
      bp: '무지|도트|스트라이프|체크|바둑판|물결|별하늘|하트|헥스|백개먼|벚꽃|그라데이션|구름|거품|꽃|나뭇잎|아가일|타탄|비늘|달|주사위|체스|트럼프|바둑돌|쇼기 말|사탕|들판|바다|설경|장난감 마을|우주', bc: '크림|민트|하늘|로즈|라일락|밤|노을|나뭇결|골드|피치|레몬|스노우|코랄|숲|오션|베리|코코아|무지개', fr: '없음|화이트|코랄|스카이|민트|캔디|체크|무지개|월계관|골드|크림|레몬|라일락|피치|로즈|잉크|도트|스티치|리본|구름|거품|데이지|덩굴|하트|별|비즈|도넛|투톤|진주|발바닥|쿠키|주사위|바둑돌|리버시|체스|쇼기|트럼프|벚꽃|만칼라|스도쿠|주얼|달밤|바다|단풍|눈꽃|해바라기|은하|프리즘|로열|아틀라스',
      bg: (p, c) => c + ' ' + p },
    es: {
      bp: 'Liso|Lunares|Rayas|Cuadros|Tablero de go|Olas|Estrellas|Corazones|Hexágonos|Backgammon|Sakura|Degradado|Nubes|Burbujas|Flores|Hojas|Rombos|Escocés|Escamas|Lunas|Dados|Ajedrez|Naipes|Piedras de go|Piezas de shogi|Caramelos|Pradera|Mar|Paisaje nevado|Pueblo de juguete|Espacio', bc: 'crema|menta|cielo|rosa|lila|noche|atardecer|madera|oro|melocotón|limón|nieve|coral|bosque|océano|frutos rojos|cacao|arcoíris', fr: 'Ninguno|Blanco|Coral|Cielo|Menta|Caramelo|Cuadros|Arcoíris|Laurel|Oro|Crema|Limón|Lila|Melocotón|Rosa|Tinta|Lunares|Costura|Lazo|Nube|Burbujas|Margarita|Enredadera|Corazones|Estrellas|Cuentas|Dónut|Bicolor|Perla|Huellitas|Galleta|Dados|Piedras de go|Reversi|Ajedrez|Shogi|Naipes|Sakura|Mancala|Sudoku|Joya|Luna|Océano|Otoño|Nieve|Girasol|Galaxia|Prisma|Real|Atlas',
      bg: (p, c) => p + ' color ' + c },
    fr: {
      bp: 'Uni|Pois|Rayures|Damier|Goban|Vagues|Étoiles|Cœurs|Hexagones|Backgammon|Sakura|Dégradé|Nuages|Bulles|Fleurs|Feuilles|Losanges|Tartan|Écailles|Lunes|Dés|Échecs|Cartes|Pierres de go|Pièces de shogi|Bonbons|Prairie|Mer|Paysage enneigé|Ville jouet|Espace', bc: 'crème|menthe|ciel|rose|lilas|nuit|couchant|bois|or|pêche|citron|neige|corail|forêt|océan|baies|cacao|arc-en-ciel', fr: 'Aucun|Blanc|Corail|Ciel|Menthe|Bonbon|Damier|Arc-en-ciel|Laurier|Or|Crème|Citron|Lilas|Pêche|Rose|Encre|Pois|Couture|Ruban|Nuage|Bulles|Marguerite|Liane|Cœurs|Étoiles|Perles|Donut|Bicolore|Nacre|Pattes|Biscuit|Dés|Pierres de go|Reversi|Échecs|Shogi|Cartes|Sakura|Mancala|Sudoku|Joyau|Clair de lune|Océan|Automne|Neige|Tournesol|Galaxie|Prisme|Royal|Atlas',
      bg: (p, c) => p + ' ' + c },
    pt: {
      bp: 'Liso|Bolinhas|Listras|Xadrez|Goban|Ondas|Estrelas|Corações|Hexágonos|Gamão|Sakura|Degradê|Nuvens|Bolhas|Flores|Folhas|Losangos|Xadrez escocês|Escamas|Luas|Dados|Xadrez|Cartas|Pedras de go|Peças de shogi|Balas|Campo|Mar|Paisagem de neve|Cidade de brinquedo|Espaço', bc: 'creme|menta|céu|rosa|lilás|noite|pôr do sol|madeira|ouro|pêssego|limão|neve|coral|floresta|oceano|frutas vermelhas|cacau|arco-íris', fr: 'Nenhuma|Branca|Coral|Céu|Menta|Doce|Xadrez|Arco-íris|Louros|Ouro|Creme|Limão|Lilás|Pêssego|Rosa|Tinta|Bolinhas|Costura|Fita|Nuvem|Bolhas|Margarida|Trepadeira|Corações|Estrelas|Contas|Rosquinha|Bicolor|Pérola|Patinhas|Biscoito|Dados|Pedras de go|Reversi|Xadrez|Shogi|Cartas|Sakura|Mancala|Sudoku|Joia|Luar|Oceano|Outono|Neve|Girassol|Galáxia|Prisma|Real|Atlas',
      bg: (p, c) => p + ' cor de ' + c },
    de: {
      bp: 'Uni|Punkte|Streifen|Karo|Goban|Wellen|Sterne|Herzen|Waben|Backgammon|Sakura|Verlauf|Wolken|Blasen|Blumen|Blätter|Rauten|Schottenkaro|Schuppen|Monde|Würfel|Schach|Karten|Go-Steine|Shogi-Steine|Bonbons|Wiese|Meer|Schneelandschaft|Spielzeugstadt|Weltall', bc: 'Creme|Minz|Himmel|Rosé|Flieder|Nacht|Abendrot|Holz|Gold|Pfirsich|Zitronen|Schnee|Korallen|Wald|Ozean|Beeren|Kakao|Regenbogen', fr: 'Keiner|Weiß|Koralle|Himmel|Minze|Bonbon|Karo|Regenbogen|Lorbeer|Gold|Creme|Zitrone|Flieder|Pfirsich|Rosé|Tinte|Punkte|Naht|Schleife|Wolke|Blasen|Gänseblümchen|Ranke|Herzen|Sterne|Perlen|Donut|Zweifarbig|Perlmutt|Pfötchen|Keks|Würfel|Go-Steine|Reversi|Schach|Shogi|Karten|Sakura|Mancala|Sudoku|Juwel|Mondschein|Ozean|Herbst|Schnee|Sonnenblume|Galaxie|Prisma|Königlich|Atlas',
      bg: (p, c) => c + '-' + p },
    hi: {
      bp: 'सादा|बिंदियाँ|धारियाँ|चेकर|गो बोर्ड|लहरें|तारे|दिल|षट्कोण|बैकगैमन|साकुरा|ग्रेडिएंट|बादल|बुलबुले|फूल|पत्तियाँ|आर्गाइल|टार्टन|शल्क|चाँद|पासे|शतरंज|ताश|गो पत्थर|शोगी मोहरे|टॉफ़ी|घास का मैदान|समुद्र|बर्फ़ीला नज़ारा|खिलौना नगर|अंतरिक्ष', bc: 'क्रीम|मिंट|आसमानी|गुलाबी|बकाइनी|रात|शाम|लकड़ी|सुनहरा|आड़ू|नींबू|बर्फ़ीला|कोरल|जंगल|सागर|बेरी|कोको|इंद्रधनुषी', fr: 'कोई नहीं|सफ़ेद|कोरल|आसमानी|पुदीना|कैंडी|चेकर|इंद्रधनुष|लॉरेल|सुनहरा|क्रीम|नींबू|बकाइनी|आड़ू|गुलाबी|स्याही|बिंदियाँ|सिलाई|रिबन|बादल|बुलबुले|डेज़ी|बेल|दिल|तारे|मनके|डोनट|दो-रंगी|मोती|पंजे|कुकी|पासे|गो पत्थर|रिवर्सी|शतरंज|शोगी|ताश|साकुरा|मनकाला|सुडोकू|रत्न|चाँदनी|सागर|पतझड़|बर्फ़|सूरजमुखी|आकाशगंगा|प्रिज़्म|शाही|एटलस',
      bg: (p, c) => p + ' (' + c + ')' },
    ar: {
      bp: 'سادة|نقاط|خطوط|مربعات|رقعة غو|أمواج|نجوم|قلوب|سداسيات|طاولة الزهر|ساكورا|تدرّج|غيوم|فقاعات|زهور|أوراق|معيّنات|مربعات اسكتلندية|حراشف|أقمار|نرد|شطرنج|ورق اللعب|أحجار غو|قطع شوغي|حلوى|مرج|بحر|منظر ثلجي|مدينة الألعاب|فضاء', bc: 'الكريم|النعناع|السماء|الورد|الليلك|الليل|الغروب|الخشب|الذهب|الخوخ|الليمون|الثلج|المرجان|الغابة|المحيط|التوت|الكاكاو|قوس قزح', fr: 'بلا|أبيض|مرجاني|سماوي|نعناعي|حلوى|مربعات|قوس قزح|إكليل غار|ذهبي|كريمي|ليموني|ليلكي|خوخي|وردي|حبري|نقاط|غرزة|شريطة|غيمة|فقاعات|أقحوان|كرمة|قلوب|نجوم|خرز|دونات|ثنائي اللون|لؤلؤي|كفوف|بسكويت|نرد|أحجار غو|ريفرسي|شطرنج|شوغي|ورق اللعب|ساكورا|مانكالا|سودوكو|جوهرة|ضوء القمر|محيط|خريف|ثلج|دوار الشمس|مجرة|منشور|ملكي|أطلس',
      bg: (p, c) => p + ' بلون ' + c },
  };
  Object.keys(NAMES).forEach(l => {
    const N = NAMES[l], tab = (keys, s) => Object.fromEntries(s.split('|').map((v, i) => [keys[i], v]));
    const bp = tab(BPK, N.bp), bc = tab(BCK, N.bc), fr = tab(FRK, N.fr);
    items.forEach(it => {
      const d = it.d;
      if (it.kind === 'icon') return;
      it.name[l] = it.kind === 'bg' ? N.bg(bp[d.p], bc[d.c]) : fr[d.k];
    });
  });
  const map = Object.fromEntries(items.map(it => [it.id, it]));
  items.forEach(it => { if (it.kind === 'bg' && COVER_PAT[it.d.p]) COVER[it.id] = 1; });

  // starter set everyone owns
  const STARTER = ['av-dice-0', 'av-plop-0', 'av-stone-0', 'b001', 'b003', 'f-none', 'f-white'];
  const DEFAULT_ICON = 'av-dice-0';

  /* ---------- renderers ---------- */
  let uid = 0;
  const U = p => p + (++uid).toString(36);
  function bgFill(it) {
    const u = U('p'), id = it.id, url = bgUrl(id);
    if (COVER[id]) return { p: `<pattern id="${u}" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="${url}" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern>`, fill: `url(#${u})` };
    return { p: `<pattern id="${u}" width="50" height="50" patternUnits="userSpaceOnUse"><image href="${url}" width="50" height="50"/></pattern>`, fill: `url(#${u})` };
  }
  function svg(id, size = 96) {
    const it = map[id]; if (!it) return '';
    const vb = `viewBox="0 0 100 100" width="${size}" height="${size}"`;
    if (it.kind === 'icon') return `<svg ${vb} aria-hidden="true"><image href="${avUrl(id)}" x="0" y="0" width="100" height="100"/></svg>`;
    if (it.kind === 'bg') { const f = bgFill(it); return `<svg ${vb} aria-hidden="true"><defs>${f.p}</defs><rect width="100" height="100" rx="18" fill="${f.fill}"/></svg>`; }   // bgFill = the 3D image
    const fu = U('f');
    return `<svg ${vb} aria-hidden="true"><circle cx="50" cy="50" r="44" fill="#eef2f8"/>${it.d.k === 'none' ? '' : frameImg(it.d.k)}</svg>`;
  }
  // o.pop: the character may leave the circle upwards (used where it is animated: the dress-up preview)
  function avatar(a = {}, size = 72, o = {}) {
    const ic = map[a.icon] || map[DEFAULT_ICON], b = map[a.bg] || map.b001, fr = map[a.frame] || map['f-none'];
    const f = bgFill(b), cid = U('c'), pid = U('c'), fu = U('f');
    const ch = ic ? `<image class="av-ch" href="${avUrl(ic.id)}" x="6" y="9" width="88" height="88"/>` : '';
    return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="av-svg" aria-hidden="true" style="overflow:visible"><defs>${f.p}<clipPath id="${cid}"><circle cx="50" cy="50" r="46"/></clipPath>${o.pop ? `<clipPath id="${pid}"><circle cx="50" cy="50" r="41"/><rect x="-40" y="-80" width="180" height="130"/></clipPath>` : ''}</defs>
<g clip-path="url(#${cid})">${o.clear ? '' : `<rect width="100" height="100" fill="${f.fill}"/>`}${o.pop ? '' : ch}</g>${fr.d.k === 'none' ? '<circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="2"/>' : frameImg(fr.d.k)}${o.pop ? `<g clip-path="url(#${pid})">${ch}</g>` : ''}</svg>`;
  }
  function bgDataUri(id) {   // CSS background value for a profile card
    const it = map[id] || map.b001;
    return COVER[it.id] ? `url('${bgUrl(it.id)}') center/cover no-repeat` : `url('${bgUrl(it.id)}') 0 0/112px repeat`;
  }
  function isDark(id) { const it = map[id]; return !!it && it.kind === 'bg' && (DARK_COL[it.d.c] || (COVER_PAT[it.d.p] && it.d.c === 'night')); }

  window.AtlasArt = { RAR, items, byId: id => map[id], STARTER, DEFAULT_ICON, avUrl, svg, avatar, bgDataUri, isDark };
})();
