/* atlas/skins.js — portal skins (きせかえ → スキン, 2026-11-20).
   A skin re-dresses the portal page itself: the page background (a seamless tile or one full picture), the header and
   sticky bars' tint and the selected menu tab's colour. Cards, sheets and the 3D view keep their own look.
   Images: images/atlas/skin/<id>.webp (+ t/<id>.webp thumbnails), made by atlas/tools/skins.py.
   Rarity R…UR (no N). While in development every skin can be worn (DEV_ALL); they are not in the gacha / shop yet —
   when they are, owned skins come from W.owned like the other items and DEV_ALL goes false.
   The worn skin: W.av.skin (synced with the account), mirrored to localStorage 'atlas-skin' (+ its CSS variables in
   'atlas-skin-css') so the inline script in index.html paints it before the first frame. */
(function () {
  'use strict';
  const BASE = (() => { try { return new URL('../images/atlas/skin/', document.currentScript.src).href; } catch (e) { return '../images/atlas/skin/'; } })();
  const V = 9;   // bump when the images are re-rendered
  const DEV_ALL = true;
  const RAR = ['N', 'R', 'SR', 'SSR', 'UR'];
  // id: [rarity, kind (tile px | 'c' = cover), page colour, header colour, selected-tab colour, dark]
  const D = {
    s01: [1, 1024, '#f6eddc', '#fbf5e8', '#6b5a3e'], s02: [1, 1024, '#e7dfcf', '#f3eee4', '#5c5446'], s03: [1, 1024, '#dbc6a2', '#efe2c8', '#6e4f2a'],
    s04: [1, 1024, '#d3ebe0', '#e6f4ed', '#2e6b52'], s05: [1, 1024, '#f4f6f3', '#f1f7fa', '#3b6f9a'], s06: [1, 1024, '#f7f6ee', '#fbfaf5', '#3f5f8f'],
    s07: [1, 1024, '#fbebef', '#fdf3f5', '#b9506e'], s08: [1, 1024, '#cca878', '#efdfc4', '#6b4524'], s09: [1, 1024, '#f8f4f2', '#f8f1f6', '#7a5aa8'],
    s10: [1, 1024, '#f0ebe3', '#f8f6f1', '#4f5b6e'], s11: [1, 1024, '#f3e2bd', '#faf0da', '#7a5426'], s12: [1, 1024, '#fefbe3', '#fdfae6', '#a07a00'],
    s13: [2, 1024, '#fef5f7', '#fdf4f6', '#c25478'], s14: [2, 1024, '#fcf6ec', '#fcf5ea', '#b4532a'], s15: [2, 1024, '#f0f6fb', '#f5f9fc', '#3d6e9e'],
    s16: [2, 1024, '#e3edf1', '#eef4f7', '#2f5a78'], s17: [2, 1024, '#fbf4e9', '#fbf6ec', '#2b3044'], s18: [2, 1024, '#f1f8f3', '#f4f9f5', '#2f6a52'],
    s19: [2, 1024, '#eee5d6', '#f7f1e7', '#4a3f30'], s20: [2, 1024, '#f4effa', '#f6f3fc', '#5b47a8'], s21: [2, 1024, '#ecf6fc', '#f3f9fd', '#2c7fb8'],
    s22: [2, 1024, '#f3f8e8', '#f6f9ee', '#4f7a2e'], s23: [2, 1024, '#edd5ac', '#f7ead2', '#6b4524'], s24: [2, 1024, '#2f6c51', '#1f4a36', '#e9c46a', 1],
    s25: [3, 'c', '#e2f0f8', '#eef7fd', '#2c7fb8'], s26: [3, 'c', '#efc6b0', '#fbe6d6', '#a14d5e'], s27: [3, 'c', '#d8e8e9', '#eef7fb', '#1f7a96'],
    s28: [3, 'c', '#e4edf6', '#f2f6fb', '#4a6f96'], s29: [3, 'c', '#dbecdc', '#eef7f0', '#4b8a3e'], s30: [3, 'c', '#f6dbb8', '#fcefdf', '#a5622a'],
    s31: [3, 'c', '#d0e1e2', '#edf4f6', '#3e6b6a'], s32: [3, 1024, '#f2f0ec', '#faf9f7', '#3a3a40'], s33: [3, 'c', '#222f55', '#1b2547', '#ffd56a', 1],
    s34: [3, 1024, '#faf3e7', '#fcf3e6', '#c0613a'],
    s35: [4, 'c', '#d4cab0', '#efe5cc', '#6b4a22'], s36: [4, 'c', '#2d4969', '#14223b', '#6fe3bd', 1], s37: [4, 'c', '#1b2954', '#16224a', '#e6c77a', 1],
    s38: [4, 1024, '#f3e9d5', '#faf4ea', '#a67c1f'], s39: [4, 1024, '#f3f1eb', '#faf9f5', '#a67c1f'], s40: [4, 'c', '#f1ebf2', '#faf6fa', '#7d5cc4'],
    s41: [1, 1024, '#b6cae0', '#c5d5e6', '#395e88'],
    s42: [1, 1024, '#dbdbb1', '#e1e1bf', '#7a5a2e'],
    s43: [1, 1024, '#ede3d0', '#f2ecde', '#7a5a2e'],
    s44: [1, 1024, '#e8dece', '#efe7dc', '#7a5a2e'],
    s45: [1, 1024, '#f5f0e5', '#fbf8f3', '#7a5a2e'],
    s46: [1, 1024, '#d9d4c8', '#e2ddd4', '#7a5a2e'],
    s47: [1, 1024, '#ece8e1', '#f4f2ed', '#7a5a2e'],
    s48: [1, 1024, '#f7f8f8', '#f6f7f7', '#487079'],
    s49: [1, 1024, '#314c40', '#243930', '#f3e6a8', 1],
    s50: [1, 1024, '#e0cea5', '#e5d6b5', '#7a5a2e'],
    s51: [1, 1024, '#f2e6ce', '#f6eede', '#7a5a2e'],
    s52: [1, 1024, '#e7cec7', '#eddad6', '#884839'],
    s53: [1, 1024, '#e5ebdd', '#eff2ea', '#627948'],
    s54: [1, 1024, '#e5ded0', '#ece7dd', '#7a5a2e'],
    s55: [1, 1024, '#eed4bd', '#f2dfce', '#895d38'],
    s56: [1, 1024, '#e4d3b2', '#e9dcc1', '#7a5a2e'],
    s57: [1, 1024, '#e5eef6', '#f3f7fb', '#386489'],
    s58: [1, 1024, '#e2d1aa', '#e7d9ba', '#7a5a2e'],
    s59: [2, 1024, '#f4f6f2', '#f7f9f5', '#5c7948'],
    s60: [2, 1024, '#f9f1e4', '#fcf8f2', '#7a5a2e'],
    s61: [2, 1024, '#f6f3f7', '#f8f5f9', '#6e4879'],
    s62: [2, 1024, '#f7f4eb', '#faf9f3', '#7a5a2e'],
    s63: [2, 1024, '#f5f6fa', '#f4f6fa', '#3e5483'],
    s64: [2, 1024, '#f8f0ea', '#fbf6f3', '#895938'],
    s65: [2, 1024, '#f8f1ed', '#faf6f3', '#895b38'],
    s66: [2, 1024, '#f7f4eb', '#faf8f3', '#7a5a2e'],
    s67: [2, 1024, '#eae3d8', '#f1ece5', '#7a5a2e'],
    s68: [2, 1024, '#ecf2f8', '#f3f7fb', '#386489'],
    s69: [2, 1024, '#f8f2ee', '#faf7f4', '#895d38'],
    s70: [2, 1024, '#f6f2eb', '#faf8f4', '#7a5a2e'],
    s71: [2, 1024, '#f1f3f7', '#f5f6f9', '#47577a'],
    s72: [2, 1024, '#fbf5ee', '#fcf7f2', '#896138'],
    s73: [2, 1024, '#f3f7f9', '#f4f7fa', '#3e6883'],
    s74: [2, 1024, '#f3f1e9', '#f9f8f4', '#7a5a2e'],
    s75: [2, 1024, '#f6f7ef', '#f8faf4', '#75843d'],
    s76: [2, 1024, '#f3f4f6', '#f6f7f8', '#485d79'],
    s77: [2, 1024, '#f1eef3', '#f7f5f8', '#614879'],
    s78: [2, 1024, '#faf4ee', '#fbf7f3', '#896138'],
    s79: [3, 'c', '#e6e4eb', '#f3f4fa', '#594879'],
    s80: [3, 'c', '#dce4e1', '#ebf4f9', '#487964'],
    s81: [3, 'c', '#d5e7f2', '#e6f2fb', '#386a89'],
    s82: [3, 'c', '#e8e1d9', '#fbf3ee', '#796047'],
    s83: [3, 'c', '#d6e1e3', '#ecf4f9', '#487079'],
    s84: [3, 'c', '#f0e1c7', '#faeddc', '#7a5a2e'],
    s85: [3, 'c', '#e2edec', '#ebf4fc', '#487976'],
    s86: [3, 'c', '#d4e8e7', '#c6e5eb', '#427f7a'],
    s87: [3, 'c', '#e3d2bb', '#f2eade', '#7a5a2e'],
    s88: [3, 'c', '#dce6e2', '#e9f4fa', '#487965'],
    s89: [4, 'c', '#f2ecf0', '#f8f6f8', '#794867'],
    s90: [4, 'c', '#f2e7e8', '#faf4f4', '#7d4348'],
    s91: [4, 1024, '#e4c8a9', '#e9d2b9', '#896338'],
    s92: [4, 1024, '#ebebe1', '#f3f3ed', '#7a5a2e'],
    s93: [4, 'c', '#2b2f59', '#202343', '#ffe9a6', 1],
    s94: [4, 'c', '#2c2527', '#211c1d', '#e8c46a', 1],
    s95: [4, 1024, '#f1e6cb', '#f5eedb', '#7a5a2e'],
    s96: [3, 'c', '#f3dab6', '#fcebd8', '#7a5a2e'],
    s97: [3, 'c', '#d9e8f4', '#eef4fb', '#386589'],
    s98: [3, 'c', '#f3dacd', '#f8eaef', '#895438'],
    s99: [3, 'c', '#e2e3e0', '#e5edf1', '#637948'],
  };
  // skins whose colours drift: a second picture cross-fades over the first (opal's play of colour, 2026-11-20)
  // one-picture skins on any window (2026-11-20 ユーザー：いろんなブラウザサイズに対応): the picture sits on the bottom edge
  // (only the sky is cut or grows); windows narrower than 6:5 use the portrait version <id>-p (1800 more units of sky,
  // atlas/tools/skins_tall.py); POS = the picture's horizontal focus (where its landmark is) when the sides are cut
  const TALLS = new Set(['s25', 's26', 's27', 's28', 's29', 's30', 's31', 's33', 's35', 's36', 's37', 's79', 's80', 's81', 's82', 's83', 's84', 's85', 's86', 's87', 's88', 's89', 's93', 's94', 's96', 's97', 's98', 's99']);
  const POS = { s79: 74, s81: 28, s82: 30, s84: 62, s85: 72, s93: 76, s94: 30, s97: 35, s35: 70 }, MID = { s40: 1, s90: 1 };
  const ANIM = { s40: 's40b', s89: 's89b', s93: 's93b', s94: 's94b' };
  const L = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  // names, in the order of L
  const N = {
    s01: ['和紙（きなり）', 'Washi Paper', '和纸（本色）', '和紙（本色）', '화지(생지)', 'Papel washi', 'Papier washi', 'Papel washi', 'Washi-Papier', 'Бумага васи', 'Washi Kâğıdı', 'Kertas Washi', 'वाशी काग़ज़', 'ورق واشي'],
    s02: ['リネン', 'Linen', '亚麻布', '亞麻布', '린넨', 'Lino', 'Lin', 'Linho', 'Leinen', 'Лён', 'Keten', 'Linen', 'लिनन', 'الكتان'],
    s03: ['クラフト紙', 'Kraft Paper', '牛皮纸', '牛皮紙', '크라프트지', 'Papel kraft', 'Papier kraft', 'Papel kraft', 'Kraftpapier', 'Крафт-бумага', 'Kraft Kâğıt', 'Kertas Kraft', 'क्राफ़्ट काग़ज़', 'ورق الكرافت'],
    s04: ['ミントのフェルト', 'Mint Felt', '薄荷毛毡', '薄荷毛氈', '민트 펠트', 'Fieltro menta', 'Feutre menthe', 'Feltro menta', 'Minzfilz', 'Мятный фетр', 'Nane Keçe', 'Flanel Mint', 'पुदीना फ़ेल्ट', 'لباد النعناع'],
    s05: ['水彩のそら', 'Watercolor Sky', '水彩天空', '水彩天空', '수채화 하늘', 'Cielo en acuarela', 'Ciel aquarelle', 'Céu em aquarela', 'Aquarellhimmel', 'Акварельное небо', 'Suluboya Gök', 'Langit Cat Air', 'जलरंग आसमान', 'سماء مائية'],
    s06: ['方眼ノート', 'Graph Paper', '方格本', '方格筆記本', '모눈 노트', 'Papel cuadriculado', 'Papier quadrillé', 'Papel quadriculado', 'Karopapier', 'Тетрадь в клетку', 'Kareli Defter', 'Kertas Berpetak', 'ग्राफ़ पेपर', 'ورق مربعات'],
    s07: ['さくらのギンガム', 'Sakura Gingham', '樱花格纹', '櫻花格紋', '벚꽃 깅엄', 'Vichy cerezo', 'Vichy sakura', 'Xadrez cerejeira', 'Sakura-Vichy', 'Сакуровая клетка', 'Sakura Pötikare', 'Gingham Sakura', 'साकुरा गिंगहैम', 'قماش ساكورا المربّع'],
    s08: ['コルクボード', 'Corkboard', '软木板', '軟木板', '코르크 보드', 'Tablero de corcho', 'Tableau de liège', 'Quadro de cortiça', 'Korkwand', 'Пробковая доска', 'Mantar Pano', 'Papan Gabus', 'कॉर्क बोर्ड', 'لوح الفلين'],
    s09: ['水彩のゆめ', 'Watercolor Dream', '水彩之梦', '水彩之夢', '수채화 꿈', 'Sueño en acuarela', 'Rêve aquarelle', 'Sonho em aquarela', 'Aquarelltraum', 'Акварельный сон', 'Suluboya Düş', 'Mimpi Cat Air', 'जलरंग सपना', 'حلم مائي'],
    s10: ['テラゾー', 'Terrazzo', '水磨石', '磨石子', '테라조', 'Terrazo', 'Terrazzo', 'Granilite', 'Terrazzo', 'Терраццо', 'Terrazzo', 'Teraso', 'टेराज़ो', 'التيرازو'],
    s11: ['榧の木目', 'Kaya Wood', '榧木纹', '榧木紋', '비자나무 결', 'Madera de kaya', 'Bois de kaya', 'Madeira kaya', 'Kaya-Holz', 'Древесина кая', 'Kaya Ahşabı', 'Kayu Kaya', 'काया लकड़ी', 'خشب الكايا'],
    s12: ['レモンの水玉', 'Lemon Dots', '柠檬圆点', '檸檬圓點', '레몬 물방울', 'Lunares limón', 'Pois citron', 'Bolinhas limão', 'Zitronentupfen', 'Лимонный горошек', 'Limon Puantiye', 'Polkadot Lemon', 'नींबू बिंदियाँ', 'نقاط الليمون'],
    s13: ['桜吹雪', 'Cherry Blossom Shower', '樱吹雪', '櫻吹雪', '벚꽃 눈보라', 'Lluvia de cerezos', 'Pluie de sakura', 'Chuva de cerejeiras', 'Kirschblütenregen', 'Сакуровый дождь', 'Kiraz Çiçeği Yağmuru', 'Hujan Sakura', 'चेरी फूलों की बौछार', 'مطر أزهار الكرز'],
    s14: ['もみじ', 'Autumn Maple', '红叶', '紅葉', '단풍', 'Arce otoñal', 'Érable d’automne', 'Bordo de outono', 'Herbstahorn', 'Осенний клён', 'Sonbahar Akçaağacı', 'Maple Musim Gugur', 'पतझड़ का मेपल', 'قيقب الخريف'],
    s15: ['雪の結晶', 'Snowflakes', '雪花', '雪花', '눈 결정', 'Copos de nieve', 'Flocons', 'Flocos de neve', 'Schneeflocken', 'Снежинки', 'Kar Taneleri', 'Kepingan Salju', 'बर्फ़ के फाहे', 'رقاقات الثلج'],
    s16: ['青海波', 'Seigaiha Waves', '青海波', '青海波', '청해파', 'Olas seigaiha', 'Vagues seigaiha', 'Ondas seigaiha', 'Seigaiha-Wellen', 'Волны сэйгайха', 'Seigaiha Dalgaları', 'Ombak Seigaiha', 'सेगाइहा लहरें', 'أمواج سيغايها'],
    s17: ['駒あそび', 'Game Pieces', '棋子游戏', '棋子遊戲', '말 놀이', 'Fichas de juego', 'Pions de jeu', 'Peças de jogo', 'Spielfiguren', 'Игровые фишки', 'Oyun Taşları', 'Bidak Permainan', 'खेल की गोटियाँ', 'قطع اللعب'],
    s18: ['トランプ', 'Card Suits', '扑克花色', '撲克花色', '트럼프', 'Palos de cartas', 'Couleurs de cartes', 'Naipes', 'Kartenfarben', 'Карточные масти', 'Kart Takımları', 'Simbol Kartu', 'ताश के रंग', 'رموز الورق'],
    s19: ['市松', 'Ichimatsu Check', '市松格', '市松格', '이치마쓰 체크', 'Cuadros ichimatsu', 'Damier ichimatsu', 'Xadrez ichimatsu', 'Ichimatsu-Karo', 'Клетка итимацу', 'Ichimatsu Dama', 'Kotak Ichimatsu', 'इचिमात्सु चेक', 'مربعات إيتشيماتسو'],
    s20: ['星くず', 'Stardust', '星尘', '星塵', '별가루', 'Polvo de estrellas', 'Poussière d’étoiles', 'Poeira de estrelas', 'Sternenstaub', 'Звёздная пыль', 'Yıldız Tozu', 'Debu Bintang', 'तारों की धूल', 'غبار النجوم'],
    s21: ['しゃぼん玉', 'Soap Bubbles', '肥皂泡', '肥皂泡', '비눗방울', 'Pompas de jabón', 'Bulles de savon', 'Bolhas de sabão', 'Seifenblasen', 'Мыльные пузыри', 'Sabun Köpükleri', 'Gelembung Sabun', 'साबुन के बुलबुले', 'فقاعات الصابون'],
    s22: ['クローバー', 'Clover', '三叶草', '三葉草', '클로버', 'Trébol', 'Trèfle', 'Trevo', 'Klee', 'Клевер', 'Yonca', 'Semanggi', 'तिपतिया', 'البرسيم'],
    s23: ['メープルの床', 'Maple Floor', '枫木地板', '楓木地板', '메이플 마루', 'Suelo de arce', 'Parquet d’érable', 'Piso de bordo', 'Ahornboden', 'Кленовый пол', 'Akçaağaç Zemin', 'Lantai Maple', 'मेपल का फ़र्श', 'أرضية القيقب'],
    s24: ['カードテーブル', 'Card Table', '牌桌', '牌桌', '카드 테이블', 'Mesa de cartas', 'Table de cartes', 'Mesa de cartas', 'Kartentisch', 'Карточный стол', 'Kart Masası', 'Meja Kartu', 'ताश की मेज़', 'طاولة الورق'],
    s25: ['青空', 'Blue Sky', '蓝天', '藍天', '푸른 하늘', 'Cielo azul', 'Ciel bleu', 'Céu azul', 'Blauer Himmel', 'Голубое небо', 'Mavi Gök', 'Langit Biru', 'नीला आसमान', 'السماء الزرقاء'],
    s26: ['夕焼けの丘', 'Sunset Hills', '晚霞山丘', '晚霞山丘', '노을 언덕', 'Colinas al atardecer', 'Collines au couchant', 'Colinas ao pôr do sol', 'Abendrothügel', 'Холмы на закате', 'Gün Batımı Tepeleri', 'Bukit Senja', 'सूर्यास्त की पहाड़ियाँ', 'تلال الغروب'],
    s27: ['なぎさ', 'Seaside', '海滨', '海濱', '물가', 'Orilla del mar', 'Bord de mer', 'Beira-mar', 'Meeresufer', 'Морской берег', 'Sahil', 'Tepi Pantai', 'समुद्र किनारा', 'شاطئ البحر'],
    s28: ['雪原', 'Snowfield', '雪原', '雪原', '설원', 'Campo nevado', 'Plaine enneigée', 'Campo nevado', 'Schneefeld', 'Снежная равнина', 'Kar Ovası', 'Padang Salju', 'हिमक्षेत्र', 'السهل الثلجي'],
    s29: ['花畑', 'Flower Meadow', '花田', '花田', '꽃밭', 'Prado de flores', 'Pré fleuri', 'Campo florido', 'Blumenwiese', 'Цветочный луг', 'Çiçekli Çayır', 'Padang Bunga', 'फूलों का मैदान', 'مرج الزهور'],
    s30: ['砂丘', 'Sand Dunes', '沙丘', '沙丘', '사구', 'Dunas', 'Dunes', 'Dunas', 'Sanddünen', 'Песчаные дюны', 'Kum Tepeleri', 'Bukit Pasir', 'रेत के टीले', 'الكثبان الرملية'],
    s31: ['湖と山', 'Mountain Lake', '湖光山色', '湖光山色', '호수와 산', 'Lago de montaña', 'Lac de montagne', 'Lago na montanha', 'Bergsee', 'Горное озеро', 'Dağ Gölü', 'Danau Gunung', 'पहाड़ी झील', 'بحيرة الجبل'],
    s32: ['白大理石', 'White Marble', '白色大理石', '白色大理石', '흰 대리석', 'Mármol blanco', 'Marbre blanc', 'Mármore branco', 'Weißer Marmor', 'Белый мрамор', 'Beyaz Mermer', 'Marmer Putih', 'सफ़ेद संगमरमर', 'الرخام الأبيض'],
    s33: ['夜空', 'Night Sky', '夜空', '夜空', '밤하늘', 'Cielo nocturno', 'Ciel nocturne', 'Céu noturno', 'Nachthimmel', 'Ночное небо', 'Gece Göğü', 'Langit Malam', 'रात का आसमान', 'سماء الليل'],
    s34: ['水彩の夕映え', 'Watercolor Glow', '水彩晚照', '水彩晚照', '수채화 저녁놀', 'Resplandor en acuarela', 'Lueur aquarelle', 'Brilho em aquarela', 'Aquarellglühen', 'Акварельный закат', 'Suluboya Işıltı', 'Cahaya Cat Air', 'जलरंग की आभा', 'وهج مائي'],
    s35: ['大航海の古地図', 'Voyager’s Map', '大航海古地图', '大航海古地圖', '대항해의 옛 지도', 'Mapa del navegante', 'Carte du navigateur', 'Mapa do navegador', 'Karte der Entdecker', 'Карта мореплавателя', 'Kâşifin Haritası', 'Peta Penjelajah', 'नाविक का नक़्शा', 'خريطة الرحّالة'],
    s36: ['オーロラ', 'Aurora', '极光', '極光', '오로라', 'Aurora', 'Aurore', 'Aurora', 'Polarlicht', 'Северное сияние', 'Kutup Işıkları', 'Aurora', 'ध्रुवीय ज्योति', 'الشفق القطبي'],
    s37: ['天球図', 'Celestial Chart', '天球图', '天球圖', '천구도', 'Carta celeste', 'Carte céleste', 'Carta celeste', 'Himmelskarte', 'Небесная карта', 'Gök Haritası', 'Peta Langit', 'खगोलीय मानचित्र', 'خريطة السماء'],
    s38: ['金箔の和紙', 'Gold-Leaf Washi', '金箔和纸', '金箔和紙', '금박 화지', 'Washi con pan de oro', 'Washi à la feuille d’or', 'Washi com folha de ouro', 'Washi mit Blattgold', 'Васи с сусальным золотом', 'Altın Varaklı Washi', 'Washi Daun Emas', 'सोने के पत्र वाला वाशी', 'واشي بورق الذهب'],
    s39: ['金と大理石', 'Gold & Marble', '金与大理石', '金與大理石', '금과 대리석', 'Oro y mármol', 'Or et marbre', 'Ouro e mármore', 'Gold und Marmor', 'Золото и мрамор', 'Altın ve Mermer', 'Emas & Marmer', 'सोना और संगमरमर', 'الذهب والرخام'],
    s40: ['オパール', 'Opal', '欧泊', '蛋白石', '오팔', 'Ópalo', 'Opale', 'Opala', 'Opal', 'Опал', 'Opal', 'Opal', 'ओपल', 'الأوبال'],
    s41: ["デニム", "Denim", "牛仔布", "丹寧布", "데님", "Mezclilla", "Denim", "Jeans", "Denim", "Деним", "Kot", "Denim", "डेनिम", "الدنيم"],
    s42: ["たたみ", "Tatami", "榻榻米", "榻榻米", "다다미", "Tatami", "Tatami", "Tatame", "Tatami", "Татами", "Tatami", "Tatami", "तातामी", "التاتامي"],
    s43: ["帆布", "Canvas", "帆布", "帆布", "캔버스", "Lona", "Toile", "Lona", "Segeltuch", "Холст", "Kanvas", "Kanvas", "कैनवास", "القماش المشمّع"],
    s44: ["ニット", "Knit", "针织", "針織", "니트", "Punto", "Tricot", "Tricô", "Strick", "Вязаное полотно", "Örgü", "Rajutan", "बुनाई", "الحياكة"],
    s45: ["障子", "Shoji Screen", "障子纸窗", "障子紙窗", "쇼지", "Biombo shoji", "Shoji", "Shoji", "Shoji", "Сёдзи", "Shoji Paravan", "Shoji", "शोजी", "شوجي"],
    s46: ["石だたみ", "Cobblestones", "石板路", "石板路", "돌길", "Adoquines", "Pavés", "Paralelepípedos", "Kopfsteinpflaster", "Брусчатка", "Arnavut Kaldırımı", "Batu Jalan", "पत्थर की सड़क", "حجارة الرصف"],
    s47: ["白レンガ", "White Bricks", "白砖墙", "白磚牆", "흰 벽돌", "Ladrillo blanco", "Briques blanches", "Tijolos brancos", "Weiße Ziegel", "Белый кирпич", "Beyaz Tuğla", "Bata Putih", "सफ़ेद ईंटें", "الطوب الأبيض"],
    s48: ["サブウェイタイル", "Subway Tiles", "地铁砖", "地鐵磚", "서브웨이 타일", "Azulejo metro", "Carrelage métro", "Azulejo metrô", "Metrofliesen", "Плитка кабанчик", "Metro Fayansı", "Ubin Subway", "सबवे टाइलें", "بلاط المترو"],
    s49: ["黒板", "Chalkboard", "黑板", "黑板", "칠판", "Pizarra", "Tableau noir", "Lousa", "Tafel", "Школьная доска", "Kara Tahta", "Papan Tulis", "ब्लैकबोर्ड", "السبورة"],
    s50: ["すだれ", "Bamboo Blind", "竹帘", "竹簾", "발", "Persiana de bambú", "Store en bambou", "Persiana de bambu", "Bambusrollo", "Бамбуковая штора", "Bambu Perde", "Kerai Bambu", "बाँस की चिक", "ستارة الخيزران"],
    s51: ["籐あみ", "Cane Webbing", "藤编", "藤編", "등나무 엮음", "Rejilla de ratán", "Cannage", "Palhinha", "Wiener Geflecht", "Венское плетение", "Hasır Örgü", "Anyaman Rotan", "बेंत की बुनाई", "نسيج الخيزران"],
    s52: ["コーデュロイ", "Corduroy", "灯芯绒", "燈芯絨", "코듀로이", "Pana", "Velours côtelé", "Veludo cotelê", "Cord", "Вельвет", "Kadife", "Korduroi", "कॉरडरॉय", "القطيفة المضلعة"],
    s53: ["タータン", "Tartan", "格子呢", "格子呢", "타탄", "Tartán", "Tartan", "Tartã", "Tartan", "Тартан", "Ekose", "Tartan", "टार्टन", "الترتان"],
    s54: ["ツイード", "Tweed", "粗花呢", "粗花呢", "트위드", "Tweed", "Tweed", "Tweed", "Tweed", "Твид", "Tüvit", "Tweed", "ट्वीड", "التويد"],
    s55: ["テラコッタ", "Terracotta", "陶土砖", "陶土磚", "테라코타", "Terracota", "Terre cuite", "Terracota", "Terrakotta", "Терракота", "Pişmiş Toprak", "Terakota", "टेराकोटा", "التيراكوتا"],
    s56: ["麻袋", "Burlap", "麻布", "麻布", "마대", "Arpillera", "Toile de jute", "Juta", "Jute", "Мешковина", "Çuval Bezi", "Goni", "टाट", "الخيش"],
    s57: ["シアサッカー", "Seersucker", "泡泡纱", "泡泡紗", "시어서커", "Seersucker", "Seersucker", "Seersucker", "Seersucker", "Сирсакер", "Seersucker", "Seersucker", "सीरसकर", "السيرساكر"],
    s58: ["網代", "Ajiro Weave", "网代编", "網代編", "아지로 엮음", "Trenzado ajiro", "Tressage ajiro", "Trançado ajiro", "Ajiro-Geflecht", "Плетение адзиро", "Ajiro Örgü", "Anyaman Ajiro", "अजीरो बुनाई", "نسج أجيرو"],
    s59: ["麻雀牌", "Mahjong Tiles", "麻将牌", "麻將牌", "마작패", "Fichas de mahjong", "Tuiles de mahjong", "Peças de mahjong", "Mahjongsteine", "Кости маджонга", "Mahjong Taşları", "Ubin Mahjong", "महजोंग टाइलें", "قطع الماهجونغ"],
    s60: ["将棋の駒", "Shogi Pieces", "将棋棋子", "將棋棋子", "쇼기 말", "Piezas de shogi", "Pièces de shogi", "Peças de shogi", "Shogi-Steine", "Фигуры сёги", "Shogi Taşları", "Bidak Shogi", "शोगी के मोहरे", "قطع الشوغي"],
    s61: ["パズルピース", "Puzzle Pieces", "拼图块", "拼圖塊", "퍼즐 조각", "Piezas de puzle", "Pièces de puzzle", "Peças de quebra-cabeça", "Puzzleteile", "Пазлы", "Yapboz Parçaları", "Kepingan Puzzle", "पहेली के टुकड़े", "قطع الأحجية"],
    s62: ["つみき", "Building Blocks", "积木", "積木", "블록", "Bloques", "Cubes en bois", "Blocos de montar", "Bauklötze", "Кубики", "Yapı Blokları", "Balok Mainan", "बिल्डिंग ब्लॉक", "مكعبات البناء"],
    s63: ["折り鶴", "Paper Cranes", "纸鹤", "紙鶴", "종이학", "Grullas de papel", "Grues en papier", "Tsurus de papel", "Papierkraniche", "Бумажные журавлики", "Kâğıt Turnalar", "Burung Bangau Kertas", "काग़ज़ के सारस", "طيور الكركي الورقية"],
    s64: ["だるま", "Daruma", "达摩", "達摩", "달마", "Daruma", "Daruma", "Daruma", "Daruma", "Дарума", "Daruma", "Daruma", "दारुमा", "داروما"],
    s65: ["マトリョーシカ", "Matryoshka", "套娃", "俄羅斯娃娃", "마트료시카", "Matrioska", "Matriochka", "Matrioska", "Matrjoschka", "Матрёшка", "Matruşka", "Matryoshka", "मात्र्योश्का", "ماتريوشكا"],
    s66: ["北欧の花", "Nordic Flowers", "北欧花朵", "北歐花朵", "북유럽 꽃", "Flores nórdicas", "Fleurs nordiques", "Flores nórdicas", "Nordische Blumen", "Северные цветы", "İskandinav Çiçekleri", "Bunga Nordik", "नॉर्डिक फूल", "زهور شمالية"],
    s67: ["ゼリージュ", "Zellige", "摩洛哥瓷砖", "摩洛哥瓷磚", "젤리주", "Zellige", "Zellige", "Zellige", "Zellige", "Зеллидж", "Zellige", "Zellige", "ज़ेलिज", "الزليج"],
    s68: ["アズレージョ", "Azulejo", "葡萄牙瓷砖", "葡萄牙瓷磚", "아줄레주", "Azulejo", "Azulejo", "Azulejo", "Azulejo", "Азулежу", "Azulejo", "Azulejo", "अज़ुलेज़ो", "الأزوليجو"],
    s69: ["ペイズリー", "Paisley", "佩斯利花纹", "佩斯利花紋", "페이즐리", "Cachemira", "Paisley", "Paisley", "Paisley", "Пейсли", "Şal Deseni", "Paisley", "पैस्ले", "البيزلي"],
    s70: ["切手", "Postage Stamps", "邮票", "郵票", "우표", "Sellos", "Timbres", "Selos", "Briefmarken", "Почтовые марки", "Pullar", "Prangko", "डाक टिकट", "طوابع البريد"],
    s71: ["金魚", "Goldfish", "金鱼", "金魚", "금붕어", "Peces dorados", "Poissons rouges", "Peixinhos-dourados", "Goldfische", "Золотые рыбки", "Japon Balıkları", "Ikan Mas Koki", "सुनहरी मछलियाँ", "الأسماك الذهبية"],
    s72: ["おやつ", "Sweet Treats", "甜点", "甜點", "간식", "Dulces", "Gourmandises", "Docinhos", "Naschereien", "Сладости", "Tatlılar", "Camilan Manis", "मिठाइयाँ", "حلويات"],
    s73: ["紙ひこうき", "Paper Planes", "纸飞机", "紙飛機", "종이비행기", "Aviones de papel", "Avions en papier", "Aviões de papel", "Papierflieger", "Бумажные самолётики", "Kâğıt Uçaklar", "Pesawat Kertas", "काग़ज़ के हवाई जहाज़", "طائرات ورقية"],
    s74: ["旅のしたく", "Travel Kit", "旅行用品", "旅行用品", "여행 준비", "Equipaje de viaje", "Valise de voyage", "Kit de viagem", "Reisegepäck", "В дорогу", "Seyahat Hazırlığı", "Perlengkapan Jalan", "यात्रा की तैयारी", "عدّة السفر"],
    s75: ["ハーブ", "Herb Sprigs", "香草", "香草", "허브", "Hierbas", "Brins d’herbes", "Ervas", "Kräuterzweige", "Травы", "Otlar", "Daun Herbal", "जड़ी-बूटियाँ", "أعشاب"],
    s76: ["貝がら", "Seashells", "贝壳", "貝殼", "조개껍데기", "Conchas", "Coquillages", "Conchas", "Muscheln", "Ракушки", "Deniz Kabukları", "Kerang", "सीपियाँ", "أصداف"],
    s77: ["うちゅう", "Outer Space", "宇宙", "宇宙", "우주", "Espacio", "Espace", "Espaço", "Weltraum", "Космос", "Uzay", "Luar Angkasa", "अंतरिक्ष", "الفضاء"],
    s78: ["手芸", "Handicraft", "手工艺", "手工藝", "수예", "Costura", "Mercerie", "Artesanato", "Handarbeit", "Рукоделие", "El İşi", "Kerajinan", "दस्तकारी", "أشغال يدوية"],
    s79: ["パリ", "Paris", "巴黎", "巴黎", "파리", "París", "Paris", "Paris", "Paris", "Париж", "Paris", "Paris", "पेरिस", "باريس"],
    s80: ["ヴェネツィア", "Venice", "威尼斯", "威尼斯", "베네치아", "Venecia", "Venise", "Veneza", "Venedig", "Венеция", "Venedik", "Venesia", "वेनिस", "البندقية"],
    s81: ["サントリーニ", "Santorini", "圣托里尼", "聖托里尼", "산토리니", "Santorini", "Santorin", "Santorini", "Santorin", "Санторини", "Santorini", "Santorini", "सेंटोरिनी", "سانتوريني"],
    s82: ["京都", "Kyoto", "京都", "京都", "교토", "Kioto", "Kyoto", "Quioto", "Kyoto", "Киото", "Kyoto", "Kyoto", "क्योटो", "كيوتو"],
    s83: ["北欧の港町", "Nordic Harbour", "北欧港町", "北歐港町", "북유럽 항구", "Puerto nórdico", "Port nordique", "Porto nórdico", "Nordischer Hafen", "Северная гавань", "İskandinav Limanı", "Pelabuhan Nordik", "नॉर्डिक बंदरगाह", "الميناء الشمالي"],
    s84: ["ピラミッド", "Pyramids", "金字塔", "金字塔", "피라미드", "Pirámides", "Pyramides", "Pirâmides", "Pyramiden", "Пирамиды", "Piramitler", "Piramida", "पिरामिड", "الأهرامات"],
    s85: ["ゆうえんち", "Amusement Park", "游乐园", "遊樂園", "놀이공원", "Parque de atracciones", "Parc d’attractions", "Parque de diversões", "Freizeitpark", "Парк аттракционов", "Lunapark", "Taman Hiburan", "मनोरंजन पार्क", "مدينة الملاهي"],
    s86: ["すいぞくかん", "Aquarium", "水族馆", "水族館", "수족관", "Acuario", "Aquarium", "Aquário", "Aquarium", "Аквариум", "Akvaryum", "Akuarium", "मछलीघर", "حوض الأسماك"],
    s87: ["としょかん", "Library", "图书馆", "圖書館", "도서관", "Biblioteca", "Bibliothèque", "Biblioteca", "Bibliothek", "Библиотека", "Kütüphane", "Perpustakaan", "पुस्तकालय", "المكتبة"],
    s88: ["汽車の旅", "Train Journey", "火车之旅", "火車之旅", "기차 여행", "Viaje en tren", "Voyage en train", "Viagem de trem", "Zugreise", "Путешествие на поезде", "Tren Yolculuğu", "Perjalanan Kereta", "रेल यात्रा", "رحلة القطار"],
    s89: ["ステンドグラス", "Stained Glass", "彩色玻璃", "彩繪玻璃", "스테인드글라스", "Vitral", "Vitrail", "Vitral", "Buntglasfenster", "Витраж", "Vitray", "Kaca Patri", "रंगीन काँच", "الزجاج المعشّق"],
    s90: ["万華鏡", "Kaleidoscope", "万花筒", "萬花筒", "만화경", "Caleidoscopio", "Kaléidoscope", "Caleidoscópio", "Kaleidoskop", "Калейдоскоп", "Kaleydoskop", "Kaleidoskop", "बहुरूपदर्शी", "المشكال"],
    s91: ["寄木細工", "Yosegi Marquetry", "寄木细工", "寄木細工", "요세기 세공", "Marquetería yosegi", "Marqueterie yosegi", "Marchetaria yosegi", "Yosegi-Intarsie", "Маркетри ёсэги", "Yosegi Kakma", "Marquetry Yosegi", "योसेगी जड़ाई", "ترصيع يوسيغي"],
    s92: ["七宝焼", "Cloisonné", "景泰蓝", "景泰藍", "칠보", "Esmalte cloisonné", "Émail cloisonné", "Esmalte cloisonné", "Cloisonné", "Перегородчатая эмаль", "Kloazone Mine", "Kloisone", "क्लॉइज़ोन", "المينا المقسّمة"],
    s93: ["夜のゆうえんち", "Night Fair", "夜游乐园", "夜遊樂園", "밤의 놀이공원", "Feria nocturna", "Fête foraine de nuit", "Parque à noite", "Nachtkirmes", "Ночной парк", "Gece Lunaparkı", "Pasar Malam", "रात का मेला", "الملاهي ليلًا"],
    s94: ["蒔絵と螺鈿", "Maki-e & Raden", "莳绘螺钿", "蒔繪螺鈿", "마키에와 자개", "Maki-e y raden", "Maki-e et raden", "Maki-e e raden", "Maki-e und Raden", "Макиэ и радэн", "Maki-e ve Raden", "Maki-e & Raden", "माकी-ए और रादेन", "ماكي-إي ورادن"],
    s95: ["アールデコ", "Art Deco Fans", "装饰艺术扇纹", "裝飾藝術扇紋", "아르데코", "Abanicos art déco", "Éventails Art déco", "Leques art déco", "Art-déco-Fächer", "Веера ар-деко", "Art Deco Yelpazeler", "Kipas Art Deco", "आर्ट डेको पंखे", "مراوح آرت ديكو"],
    s96: ["サバンナ", "Savanna", "热带草原", "熱帶草原", "사바나", "Sabana", "Savane", "Savana", "Savanne", "Саванна", "Savan", "Sabana", "सवाना", "السافانا"],
    s97: ["南極", "Antarctica", "南极", "南極", "남극", "Antártida", "Antarctique", "Antártida", "Antarktis", "Антарктида", "Antarktika", "Antartika", "अंटार्कटिका", "القارة القطبية الجنوبية"],
    s98: ["カッパドキア", "Cappadocia", "卡帕多奇亚", "卡帕多奇亞", "카파도키아", "Capadocia", "Cappadoce", "Capadócia", "Kappadokien", "Каппадокия", "Kapadokya", "Kapadokia", "कप्पादोकिया", "كابادوكيا"],
    s99: ["メキシコの広場", "Mexican Plaza", "墨西哥广场", "墨西哥廣場", "멕시코 광장", "Plaza mexicana", "Place mexicaine", "Praça mexicana", "Mexikanische Plaza", "Мексиканская площадь", "Meksika Meydanı", "Alun-alun Meksiko", "मैक्सिकन चौक", "ساحة مكسيكية"],
  };
  // UI words (the きせかえ tab, the default skin, the development note)
  const T = {
    kind: ['スキン', 'Skin', '皮肤', '外觀', '스킨', 'Aspecto', 'Thème', 'Visual', 'Skin', 'Оформление', 'Tema', 'Tema', 'स्किन', 'المظهر'],
    def: ['クリーム', 'Cream', '奶油色', '奶油色', '크림', 'Crema', 'Crème', 'Creme', 'Creme', 'Кремовый', 'Krem', 'Krem', 'क्रीम', 'الكريمي'],
    defSub: ['デフォルト', 'Default', '默认', '預設', '기본', 'Predeterminado', 'Par défaut', 'Padrão', 'Standard', 'По умолчанию', 'Varsayılan', 'Bawaan', 'डिफ़ॉल्ट', 'الافتراضي'],
    dev: ['開発中：すべてのスキンをお試しで着せかえできます（のちにガチャの景品になります）', 'In development: every skin can be tried for now (they will become gacha prizes later)', '开发中：目前可试用所有皮肤（之后将成为扭蛋奖品）', '開發中：目前可試用所有外觀（之後將成為扭蛋獎品）', '개발 중: 지금은 모든 스킨을 체험할 수 있어요 (나중에 가챠 경품이 됩니다)', 'En desarrollo: por ahora puedes probar todos los aspectos (luego serán premios del gacha)', 'En développement : tous les thèmes sont à l’essai pour l’instant (ils deviendront des lots du gacha)', 'Em desenvolvimento: por enquanto, todos os visuais podem ser testados (depois serão prêmios do gacha)', 'In Entwicklung: Alle Skins sind vorerst zum Ausprobieren frei (später gibt es sie im Gacha)', 'В разработке: пока можно примерить любое оформление (позже оно станет призами гачи)', 'Geliştirme aşamasında: şimdilik tüm temalar denenebilir (sonra gacha ödülü olacak)', 'Dalam pengembangan: semua tema bisa dicoba dulu (nanti menjadi hadiah gacha)', 'विकास जारी: अभी सभी स्किन आज़माई जा सकती हैं (बाद में ये गाचा इनाम बनेंगी)', 'قيد التطوير: يمكن تجربة كل المظاهر الآن (ستصبح جوائز في الغاتشا لاحقًا)'],
  };
  const li = lang => Math.max(0, L.indexOf(lang));
  const tx = (row, lang) => row[li(lang)] || row[1];
  // 'base' = the classic cream (no image; the portal's own colours) — counted as an R (2026-11-20)
  // (2026-11-20) s41… are being remade: only the ids in SHOW are listed until they pass review
  const HOLD = () => false;
  const list = [{ id: 'base', rar: 1, kind: 'skin', def: true, bg: '#fff6e2', hd: '#fff6e2', nav: '#2b3044', dark: false }]
    .concat(Object.keys(D).filter(id => !HOLD(id)).map(id => { const [rar, k, bg, hd, nav, dark] = D[id]; return { id, rar, kind: 'skin', cover: k === 'c', px: k === 'c' ? 0 : k, bg, hd, nav, dark: !!dark }; }));
  const map = Object.fromEntries(list.map(s => [s.id, s]));
  const url = id => BASE + id + '.webp?v=' + V, thumb = id => BASE + 't/' + id + '.webp?v=' + V;
  const rgba = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
  const mixW = (h, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - k) + 255 * k).toString(16).padStart(2, '0')).join('');
  const shade = (h, k) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - k)).toString(16).padStart(2, '0')).join('');
  // the CSS variables of a skin (read by the rules in index.html under html[data-skin])
  function vars(s) {
    return {
      '--sk-bg': s.bg,
      '--sk-img': `url("${url(s.id)}")`,
      '--sk-size': s.cover ? 'cover' : `${s.px / 2}px ${s.px / 2}px`,   // (tiles: 2× pixels, sharp on retina)
      '--sk-pos': `${POS[s.id] ?? 50}% ${MID[s.id] ? 50 : 82}%`,   // (82 %: on very wide windows a little sky goes and a little ground)
      '--sk-imgp': TALLS.has(s.id) ? `url("${BASE + s.id}-p.webp?v=${V}")` : 'none',
      '--sk-img2p': TALLS.has(s.id) && ANIM[s.id] ? `url("${BASE + ANIM[s.id]}-p.webp?v=${V}")` : 'none',
      '--sk-img2': ANIM[s.id] ? `url("${url(ANIM[s.id])}")` : 'none',
      '--sk-hdr': rgba(s.hd, .94), '--sk-hdrs': s.hd,
      '--sk-line': s.dark ? 'rgba(255,255,255,.14)' : shade(s.hd, .09),
      '--sk-nav': s.nav, '--sk-nav2': s.dark ? shade(s.nav, .3) : shade(s.nav, .35),
      '--sk-navt': s.dark ? '#1b2238' : '#fff',
      '--sk-navm': s.dark ? s.nav : s.nav,
    };
  }

  /* ---------- UR effects (2026-11-20 ユーザー：URは実際に動く感じに) ----------
     A fixed layer behind the page (#skfx) with light CSS-animated pieces: only transform / opacity are animated (the
     compositor draws them; no script runs per frame). Pieces tied to a spot of a one-picture skin (the Ferris wheel, the
     compass rose) are placed in the picture's 1920×1200 grid and re-placed on resize (background-size: cover maths).
     Paused while the 3D view, Historia or a sheet covers the page (index.html). Runs whatever the OS motion setting, as
     the other reward effects do. */
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TW = c => `<svg viewBox="-10 -10 20 20"><path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill="${c}"/></svg>`;
  const PETAL = c => `<svg viewBox="-12 -16 24 32"><path d="M0 14 C-12 4 -11 -10 -4 -15 C-2 -12 2 -12 4 -15 C11 -10 12 4 0 14 Z" fill="${c}"/></svg>`;
  const FLAKE = c => `<svg viewBox="-10 -10 20 20"><path d="M-6 -8 L5 -9 L9 2 L1 9 L-8 4 Z" fill="${c}"/></svg>`;
  function glints(n, cols, seed, y0 = 0, y1 = 100, size = [10, 22]) {
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]);
      h += `<i class="fx-tw" style="left:${(r() * 100).toFixed(2)}%;top:${(y0 + r() * (y1 - y0)).toFixed(2)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;animation-duration:${(2.6 + r() * 3).toFixed(2)}s;animation-delay:${(-r() * 6).toFixed(2)}s">${TW(cols[i % cols.length])}</i>`; }
    return h;
  }
  function fall(n, shape, cols, seed, size = [14, 26], dur = [16, 30]) {
    const r = rnd(seed); let h = '';
    for (let i = 0; i < n; i++) { const s = size[0] + r() * (size[1] - size[0]), d = dur[0] + r() * (dur[1] - dur[0]);
      h += `<i class="fx-fall" style="left:${(r() * 100).toFixed(2)}%;--sw:${(30 + r() * 60).toFixed(0)}px;--rt:${(r() < .5 ? -1 : 1) * (240 + r() * 300) | 0}deg;animation-duration:${d.toFixed(1)}s;animation-delay:${(-r() * d).toFixed(1)}s"><b style="width:${s.toFixed(0)}px;height:${(s * 1.3).toFixed(0)}px;animation-duration:${(3 + r() * 3).toFixed(1)}s">${shape(cols[i % cols.length])}</b></i>`; }
    return h;
  }
  const sheen = (c, dur = 9, ang = -20) => `<i class="fx-sheen" style="--c:${c};--a:${ang}deg;animation-duration:${dur}s"></i>`;
  const shoot = (n, seed) => { const r = rnd(seed); let h = ''; for (let i = 0; i < n; i++) h += `<i class="fx-shoot" style="left:${(20 + r() * 70).toFixed(1)}%;top:${(r() * 35).toFixed(1)}%;animation-delay:${(i * 4.3 + r() * 2).toFixed(1)}s;animation-duration:${(9 + r() * 5).toFixed(1)}s"></i>`; return h; };
  const motes = (n, c, seed) => { const r = rnd(seed); let h = ''; for (let i = 0; i < n; i++) h += `<i class="fx-mote" style="left:${(r() * 100).toFixed(1)}%;top:${(r() * 100).toFixed(1)}%;--c:${c};animation-duration:${(10 + r() * 12).toFixed(1)}s;animation-delay:${(-r() * 20).toFixed(1)}s"></i>`; return h; };
  // pieces tied to the picture: [x, y, size] in the 1920×1200 grid → placed by place()
  const at = (x, y, w, cls, inner) => `<i class="fx-at ${cls}" data-x="${x}" data-y="${y}" data-w="${w}">${inner}</i>`;
  const ROSE = (() => { let p = ''; for (let j = 0; j < 8; j++) { const a = -Math.PI / 2 + j * Math.PI / 4, L = j % 2 ? 60 : 100;
      for (const [h, c] of [[1, '#e2c08c'], [-1, '#a8794a']]) { const sx = 14 * Math.cos(a + h * .32), sy = 14 * Math.sin(a + h * .32);
        p += `<path d="M${(L * Math.cos(a)).toFixed(1)} ${(L * Math.sin(a)).toFixed(1)} L${sx.toFixed(1)} ${sy.toFixed(1)} L0 0 Z" fill="${c}"/>`; } }
    return `<svg viewBox="-110 -110 220 220">${p}<circle r="9" fill="#a8794a"/><circle r="4" fill="#efe0c0"/></svg>`; })();
  const WHEEL = (() => { const R = 300; let g = `<circle r="${R}" fill="none" stroke="#5a5f92" stroke-width="8"/><circle r="${R - 46}" fill="none" stroke="#4d5288" stroke-width="3"/>`;
    for (let k = 0; k < 16; k++) { const t = k * Math.PI / 8; g += `<line x1="0" y1="0" x2="${(R * Math.cos(t)).toFixed(0)}" y2="${(R * Math.sin(t)).toFixed(0)}" stroke="#5a5f92" stroke-width="4"/>`; }
    let b = ''; const cols = ['#ffe9a6', '#ffc6d4', '#c9e6ff'];
    for (let k = 0; k < 48; k++) { const t = k * Math.PI / 24, x = (R * Math.cos(t)).toFixed(0), y = (R * Math.sin(t)).toFixed(0);
      b += `<g class="fx-bulb" style="animation-delay:${(-(k % 6) * .25).toFixed(2)}s"><circle cx="${x}" cy="${y}" r="20" fill="${cols[k % 3]}" opacity=".22"/><circle cx="${x}" cy="${y}" r="7" fill="${cols[k % 3]}"/></g>`; }
    let c = ''; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + .2, x = (R * Math.cos(t)).toFixed(0), y = (R * Math.sin(t)).toFixed(0);
      c += `<g transform="translate(${x} ${y})"><g class="fx-cab"><path d="M-24 6 L24 6 L20 42 L-20 42 Z" fill="#6a6fa6"/><path d="M-28 8 C-28 -12 28 -12 28 8 Z" fill="#7a5f9a"/><rect x="-13" y="14" width="26" height="14" rx="3" fill="#ffe9a6"/></g></g>`; }
    return `<svg viewBox="-340 -340 680 680"><g class="fx-turn">${g}${b}${c}<circle r="26" fill="#6a6fa6"/></g></svg>`; })();
  const FW = c => { let p = ''; for (let k = 0; k < 16; k++) { const t = k * Math.PI / 8; p += `<line x1="${(18 * Math.cos(t)).toFixed(1)}" y1="${(18 * Math.sin(t)).toFixed(1)}" x2="${(46 * Math.cos(t)).toFixed(1)}" y2="${(46 * Math.sin(t)).toFixed(1)}" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/><circle cx="${(52 * Math.cos(t)).toFixed(1)}" cy="${(52 * Math.sin(t)).toFixed(1)}" r="3" fill="${c}"/>`; }
    return `<svg viewBox="-60 -60 120 120">${p}</svg>`; };
  const fireworks = seed => { const r = rnd(seed), cols = ['#ffc6d4', '#ffe9a6', '#c9e6ff', '#d9c8ff']; let h = '';
    for (let i = 0; i < 5; i++) h += `<i class="fx-boom" style="left:${(18 + r() * 50).toFixed(1)}%;top:${(6 + r() * 26).toFixed(1)}%;width:${(110 + r() * 90) | 0}px;height:${(110 + r() * 90) | 0}px;animation-delay:${(i * 1.9).toFixed(1)}s">${FW(cols[i % 4])}</i>`; return h; };
  const aurora = () => [['#5fe0b6', 30, 0], ['#7fb8ff', 22, -6], ['#c79bff', 16, -12]].map(([c, t, d]) => `<i class="fx-aur" style="--c:${c};top:${t}%;animation-delay:${d}s"></i>`).join('');
  const rays = c => [8, 30, 56, 78].map((x, i) => `<i class="fx-ray" style="left:${x}%;--c:${c};animation-delay:${-i * 3.1}s"></i>`).join('');
  const FX = {
    s35: () => at(1517, 912, 230, 'fx-rose', ROSE) + motes(14, '#fff6dc', 35) + sheen('rgba(255,236,190,.35)', 12),
    s36: () => aurora() + glints(26, ['#fff6dc', '#dff4ff'], 36, 0, 70, [6, 14]) + shoot(3, 36),
    s37: () => glints(30, ['#fff3cf', '#ffe7a8'], 37, 0, 100, [8, 18]) + shoot(3, 37) + at(960, 1500, 3000, 'fx-orbit', '<svg viewBox="-1500 -1500 3000 3000">' + [380, 720, 1060, 1400].map((r, i) => `<circle r="${r}" fill="none" stroke="#e6c77a" stroke-width="3" stroke-dasharray="${4 + i * 4} ${18 + i * 10}" opacity=".45"/>`).join('') + '</svg>'),
    s38: () => fall(18, FLAKE, ['#e2bd6a', '#f3d993', '#c99a45'], 38, [10, 20], [20, 34]) + glints(16, ['#f3d993'], 38) + sheen('rgba(255,236,170,.45)', 10),
    s39: () => sheen('rgba(255,232,170,.55)', 8) + glints(18, ['#f3d993', '#fff6dc'], 39),
    s40: () => sheen('rgba(255,255,255,.55)', 7, -30) + glints(22, ['#ffffff', '#ffe1f0', '#dff4ff'], 40, 0, 100, [8, 16]),
    s89: () => rays('rgba(255,250,235,.6)') + motes(24, '#fffaf0', 89),
    s90: () => '<i class="fx-kal"></i>',
    s91: () => sheen('rgba(255,240,205,.5)', 10) + glints(10, ['#fff6dc'], 91, 0, 100, [8, 14]),
    s92: () => sheen('rgba(255,255,255,.55)', 9) + glints(22, ['#f3d993', '#ffffff'], 92, 0, 100, [8, 16]),
    s93: () => at(1540, 600, 680, 'fx-wheel', WHEEL) + fireworks(93) + glints(20, ['#fff6dc'], 93, 0, 50, [5, 10]),
    s94: () => fall(16, PETAL, ['#f6dff2', '#dff1ff', '#e2fff4', '#fff4d6'], 94, [14, 24], [18, 32]) + glints(18, ['#e2bd6a', '#f3d993'], 94, 0, 100, [8, 16]),
    s95: () => sheen('rgba(255,236,180,.5)', 8) + glints(16, ['#f3d993', '#fffaf0'], 95),
  };
  let fxEl = null, fxId = '';
  function place() {
    if (!fxEl) return;
    // the same maths as background-size: cover with the skin's position (bottom edge, its focus across)
    const w = innerWidth, h = fxEl.getBoundingClientRect().height || innerHeight, tall = TALLS.has(fxId) && matchMedia('(max-aspect-ratio: 6/5)').matches, ih = tall ? 3000 : 1200, y0 = tall ? 1800 : 0;
    const k = Math.max(w / 1920, h / ih), ox = (w - 1920 * k) * (POS[fxId] ?? 50) / 100, oy = (h - ih * k) * (MID[fxId] ? .5 : tall ? 1 : .82);
    fxEl.querySelectorAll('.fx-at').forEach(e => { const W = +e.dataset.w * k; e.style.cssText = `width:${W}px;height:${W}px;left:${ox + +e.dataset.x * k - W / 2}px;top:${oy + (+e.dataset.y + y0) * k - W / 2}px`; });
    const kal = fxEl.querySelector('.fx-kal'); if (kal) { const d = Math.hypot(w, h) * 1.05; kal.style.cssText = `width:${d}px;height:${d}px;left:${(w - d) / 2}px;top:${(h - d) / 2}px;background-image:url("${url('s90')}")`; }
  }
  function effects(id) {
    if (id === fxId) return; fxId = id;
    if (fxEl) { fxEl.remove(); fxEl = null; }
    const f = FX[id]; if (!f || !document.body) return;
    fxEl = document.createElement('div'); fxEl.id = 'skfx'; fxEl.setAttribute('aria-hidden', 'true'); fxEl.className = 'fx-' + id;
    fxEl.innerHTML = (ANIM[id] ? '<i class="fx-x"></i>' : '') + f();
    document.body.prepend(fxEl); place();
  }
  addEventListener('resize', () => { clearTimeout(place.t); place.t = setTimeout(place, 120); });
  const root = document.documentElement;
  function paint(id) {
    const s = map[id], st = root.style;
    Object.keys(vars(list[1])).forEach(k => st.removeProperty(k));
    effects(s && !s.def ? s.id : '');
    if (!s || s.def) { delete root.dataset.skin; delete root.dataset.skk; delete root.dataset.ska; delete root.dataset.skp; root.classList.remove('skdark'); return null; }
    const v = vars(s); for (const k in v) st.setProperty(k, v[k]);
    root.dataset.skin = id; root.dataset.skk = s.cover ? 'cover' : 'tile'; if (ANIM[id]) root.dataset.ska = '1'; else delete root.dataset.ska; if (TALLS.has(id)) root.dataset.skp = '1'; else delete root.dataset.skp; root.classList.toggle('skdark', s.dark);
    return v;
  }
  // wear a skin ('' / unknown = the classic cream): paint now and remember it for the next first paint
  function apply(id) {
    const v = paint(id);
    try {
      if (v) { localStorage.setItem('atlas-skin', id); localStorage.setItem('atlas-skin-css', JSON.stringify({ id, v, k: map[id].cover ? 'cover' : 'tile', d: map[id].dark ? 1 : 0, a: ANIM[id] ? 1 : 0, p: TALLS.has(id) ? 1 : 0 })); }
      else { localStorage.removeItem('atlas-skin'); localStorage.removeItem('atlas-skin-css'); }
    } catch (e) {}
  }
  const owned = (id, W) => DEV_ALL || !!(W && W.owned && W.owned.includes(id));
  if (!document.body) addEventListener('DOMContentLoaded', () => { const id = root.dataset.skin; fxId = ''; if (id) effects(id); });
  window.AtlasSkins = { list, byId: id => map[id], url, thumb, apply, owned, DEV_ALL, RAR, name: (s, lang) => s.def ? tx(T.def, lang) : tx(N[s.id] || [s.id], lang), t: (k, lang) => tx(T[k], lang) };
})();
