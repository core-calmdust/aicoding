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
  const V = 6;   // bump when the images are re-rendered
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
    s41: [1, 1024, '#f9ecee', '#fbf3f4', '#893845'],
    s42: [1, 1024, '#edf2e0', '#f7f9f2', '#708938'],
    s43: [1, 1024, '#e8f0f7', '#f3f7fb', '#386689'],
    s44: [1, 1024, '#e6e1ef', '#f4f2f8', '#553d84'],
    s45: [1, 1024, '#e1e8da', '#eef2ea', '#607b45'],
    s46: [1, 1024, '#fbf4f4', '#faf4f3', '#893a38'],
    s47: [1, 1024, '#fbfaf3', '#fbfaf3', '#7a5a2e'],
    s48: [1, 1024, '#faf9f3', '#faf9f4', '#7a5a2e'],
    s49: [1, 1024, '#e5f3ec', '#f4faf7', '#38895d'],
    s50: [1, 1024, '#fcf5d8', '#fdfbf0', '#7a5a2e'],
    s51: [1, 1024, '#e5ddf2', '#f3f0f9', '#563889'],
    s52: [1, 1024, '#f4dce2', '#faf0f2', '#89384b'],
    s53: [1, 1024, '#f5f7ec', '#f9faf4', '#7a5a2e'],
    s54: [1, 1024, '#e7f1f9', '#f2f7fc', '#386689'],
    s55: [1, 1024, '#fbe9eb', '#fcf2f3', '#893842'],
    s56: [1, 1024, '#f6eee5', '#fbf7f3', '#7a5a2e'],
    s57: [1, 1024, '#edf9f3', '#f3fbf7', '#388960'],
    s58: [1, 1024, '#faefdb', '#fdf9f1', '#7a5a2e'],
    s59: [2, 1024, '#fdf6f1', '#fdf6f1', '#895e38'],
    s60: [2, 1024, '#fbf5ee', '#fcf7f2', '#7a5a2e'],
    s61: [2, 1024, '#edf6fa', '#f2f9fb', '#387089'],
    s62: [2, 1024, '#fdf5f9', '#fcf2f8', '#893866'],
    s63: [2, 1024, '#fef6f6', '#fdf0f1', '#893839'],
    s64: [2, 1024, '#f6f4fc', '#f4f2fb', '#493889'],
    s65: [2, 1024, '#f6f2e9', '#faf8f4', '#7a5a2e'],
    s66: [2, 1024, '#faf7ef', '#fbf9f3', '#7a5a2e'],
    s67: [2, 1024, '#f7eedd', '#fcf8f2', '#7a5a2e'],
    s68: [2, 1024, '#eff5fa', '#f2f8fb', '#386789'],
    s69: [2, 1024, '#e8f4fb', '#f1f8fc', '#386c89'],
    s70: [2, 1024, '#f1eff8', '#f5f4fa', '#4a3889'],
    s71: [2, 1024, '#fdf6f5', '#fcf2f1', '#893a38'],
    s72: [2, 1024, '#fdf8eb', '#fefaf0', '#7a5a2e'],
    s73: [2, 1024, '#faf6ee', '#fbf9f3', '#7a5a2e'],
    s74: [2, 1024, '#f3f6ec', '#f8f9f4', '#718938'],
    s75: [2, 1024, '#f5f1f8', '#f7f4fa', '#663889'],
    s76: [2, 1024, '#f6e7e1', '#fbf5f3', '#895038'],
    s77: [2, 1024, '#e8d5b2', '#eee0c5', '#7a5a2e'],
    s78: [2, 1024, '#fcf7e9', '#fdfaf1', '#7a5a2e'],
    s79: [3, 'c', '#e0ece3', '#f1f8fd', '#427f53'],
    s80: [3, 'c', '#f6d6b6', '#fdf4ea', '#896138'],
    s81: [3, 'c', '#dcebde', '#f0f8fd', '#408149'],
    s82: [3, 'c', '#dedfe1', '#fcefee', '#45507b'],
    s83: [3, 'c', '#e9f1f9', '#eef5fb', '#385f89'],
    s84: [3, 'c', '#e6f0f6', '#e6f2f9', '#386a89'],
    s85: [3, 'c', '#e7eef1', '#ecf6fd', '#406c80'],
    s86: [3, 'c', '#dddaf0', '#f2f5fb', '#443889'],
    s87: [3, 1024, '#e3f0d6', '#f0f7e9', '#608938'],
    s88: [3, 'c', '#e5c9da', '#dfd4ec', '#893868'],
    s89: [3, 'c', '#cbebf2', '#e4f4fc', '#387a89'],
    s90: [3, 'c', '#273256', '#1b233c', '#ffe08a', 1],
    s91: [3, 'c', '#cfe3e4', '#e6f2fb', '#3f7f81'],
    s92: [3, 'c', '#f2dfe2', '#e5deed', '#893842'],
    s93: [4, 1024, '#f9f6ee', '#fbf9f3', '#7a5a2e'],
    s94: [4, 1024, '#f5eacf', '#f9f3e4', '#7a5a2e'],
    s95: [4, 'c', '#332654', '#231b3a', '#e6b8ff', 1],
    s96: [4, 'c', '#26242c', '#1c1b21', '#f3d7ef', 1],
    s97: [4, 1024, '#f5eeea', '#faf6f4', '#895038'],
    s98: [4, 1024, '#2e334d', '#202436', '#e8c46a', 1],
    s99: [4, 'c', '#e2f1f9', '#e3f2fd', '#386c89'],
  };
  // skins whose colours drift: a second picture cross-fades over the first (opal's play of colour, 2026-11-20)
  const ANIM = { s40: 's40b', s96: 's96b', s99: 's99b' };
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
    s41: ["和紙（さくら）", "Washi Paper (Sakura)", "和纸（樱花）", "和紙（櫻花）", "화지(벚꽃)", "Papel washi (cerezo)", "Papier washi (sakura)", "Papel washi (cerejeira)", "Washi-Papier (Sakura)", "Бумага васи (сакура)", "Washi Kâğıdı (Sakura)", "Kertas Washi (Sakura)", "वाशी काग़ज़ (साकुरा)", "ورق واشي (ساكورا)"],
    s42: ["和紙（わかば）", "Washi Paper (Sprout)", "和纸（嫩叶）", "和紙（嫩葉）", "화지(새잎)", "Papel washi (brote)", "Papier washi (pousse)", "Papel washi (broto)", "Washi-Papier (Spross)", "Бумага васи (росток)", "Washi Kâğıdı (Filiz)", "Kertas Washi (Tunas)", "वाशी काग़ज़ (कोंपल)", "ورق واشي (البرعم)"],
    s43: ["和紙（そら）", "Washi Paper (Sky)", "和纸（天空）", "和紙（天空）", "화지(하늘)", "Papel washi (cielo)", "Papier washi (ciel)", "Papel washi (céu)", "Washi-Papier (Himmel)", "Бумага васи (небо)", "Washi Kâğıdı (Gök)", "Kertas Washi (Langit)", "वाशी काग़ज़ (आसमान)", "ورق واشي (السماء)"],
    s44: ["リネン（ラベンダー）", "Linen (Lavender)", "亚麻布（薰衣草）", "亞麻布（薰衣草）", "린넨(라벤더)", "Lino (lavanda)", "Lin (lavande)", "Linho (lavanda)", "Leinen (Lavendel)", "Лён (лаванда)", "Keten (Lavanta)", "Linen (Lavender)", "लिनन (लैवेंडर)", "الكتان (اللافندر)"],
    s45: ["リネン（セージ）", "Linen (Sage)", "亚麻布（鼠尾草）", "亞麻布（鼠尾草）", "린넨(세이지)", "Lino (salvia)", "Lin (sauge)", "Linho (sálvia)", "Leinen (Salbei)", "Лён (шалфей)", "Keten (Adaçayı)", "Linen (Sage)", "लिनन (सेज)", "الكتان (المريمية)"],
    s46: ["方眼ノート（ピンク）", "Graph Paper (Pink)", "方格本（粉色）", "方格筆記本（粉色）", "모눈 노트(핑크)", "Papel cuadriculado (rosa)", "Papier quadrillé (rose)", "Papel quadriculado (rosa)", "Karopapier (Rosa)", "Тетрадь в клетку (розовая)", "Kareli Defter (Pembe)", "Kertas Berpetak (Merah Muda)", "ग्राफ़ पेपर (गुलाबी)", "ورق مربعات (وردي)"],
    s47: ["ドット方眼", "Dot Grid", "点阵纸", "點陣紙", "도트 노트", "Cuadrícula de puntos", "Papier pointillé", "Papel pontilhado", "Punktraster", "Тетрадь в точку", "Noktalı Defter", "Kertas Titik", "डॉट ग्रिड", "ورق منقّط"],
    s48: ["罫線ノート", "Ruled Notebook", "横线本", "橫線筆記本", "줄 노트", "Cuaderno de rayas", "Cahier ligné", "Caderno pautado", "Liniertes Heft", "Тетрадь в линейку", "Çizgili Defter", "Buku Bergaris", "लाइन वाली कॉपी", "دفتر مسطّر"],
    s49: ["ミントのギンガム", "Mint Gingham", "薄荷格纹", "薄荷格紋", "민트 깅엄", "Vichy menta", "Vichy menthe", "Xadrez menta", "Minz-Vichy", "Мятная клетка", "Nane Pötikare", "Gingham Mint", "पुदीना गिंगहैम", "قماش النعناع المربّع"],
    s50: ["レモンのギンガム", "Lemon Gingham", "柠檬格纹", "檸檬格紋", "레몬 깅엄", "Vichy limón", "Vichy citron", "Xadrez limão", "Zitronen-Vichy", "Лимонная клетка", "Limon Pötikare", "Gingham Lemon", "नींबू गिंगहैम", "قماش الليمون المربّع"],
    s51: ["ラベンダーのフェルト", "Lavender Felt", "薰衣草毛毡", "薰衣草毛氈", "라벤더 펠트", "Fieltro lavanda", "Feutre lavande", "Feltro lavanda", "Lavendelfilz", "Лавандовый фетр", "Lavanta Keçe", "Flanel Lavender", "लैवेंडर फ़ेल्ट", "لباد اللافندر"],
    s52: ["さくらのフェルト", "Sakura Felt", "樱花毛毡", "櫻花毛氈", "벚꽃 펠트", "Fieltro cerezo", "Feutre sakura", "Feltro cerejeira", "Sakura-Filz", "Сакуровый фетр", "Sakura Keçe", "Flanel Sakura", "साकुरा फ़ेल्ट", "لباد الساكورا"],
    s53: ["水彩のみどり", "Watercolor Green", "水彩绿意", "水彩綠意", "수채화 초록", "Verde en acuarela", "Vert aquarelle", "Verde em aquarela", "Aquarellgrün", "Акварельная зелень", "Suluboya Yeşil", "Hijau Cat Air", "जलरंग हरियाली", "أخضر مائي"],
    s54: ["ストライプ（そら）", "Stripes (Sky)", "条纹（天空）", "條紋（天空）", "스트라이프(하늘)", "Rayas (cielo)", "Rayures (ciel)", "Listras (céu)", "Streifen (Himmel)", "Полоски (небо)", "Çizgili (Gök)", "Garis (Langit)", "धारियाँ (आसमान)", "خطوط (السماء)"],
    s55: ["ストライプ（いちご）", "Stripes (Strawberry)", "条纹（草莓）", "條紋（草莓）", "스트라이프(딸기)", "Rayas (fresa)", "Rayures (fraise)", "Listras (morango)", "Streifen (Erdbeere)", "Полоски (клубника)", "Çizgili (Çilek)", "Garis (Stroberi)", "धारियाँ (स्ट्रॉबेरी)", "خطوط (الفراولة)"],
    s56: ["ココアの水玉", "Cocoa Dots", "可可圆点", "可可圓點", "코코아 물방울", "Lunares cacao", "Pois cacao", "Bolinhas cacau", "Kakao-Tupfen", "Какао в горошек", "Kakao Puantiye", "Polkadot Kakao", "कोको बिंदियाँ", "نقاط الكاكاو"],
    s57: ["ミントの水玉", "Mint Dots", "薄荷圆点", "薄荷圓點", "민트 물방울", "Lunares menta", "Pois menthe", "Bolinhas menta", "Minz-Tupfen", "Мятный горошек", "Nane Puantiye", "Polkadot Mint", "पुदीना बिंदियाँ", "نقاط النعناع"],
    s58: ["ひのきの白木", "Hinoki Wood", "扁柏白木", "扁柏白木", "히노키 원목", "Madera de hinoki", "Bois de hinoki", "Madeira hinoki", "Hinoki-Holz", "Древесина хиноки", "Hinoki Ahşabı", "Kayu Hinoki", "हिनोकी लकड़ी", "خشب الهينوكي"],
    s59: ["チューリップ", "Tulips", "郁金香", "鬱金香", "튤립", "Tulipanes", "Tulipes", "Tulipas", "Tulpen", "Тюльпаны", "Laleler", "Tulip", "ट्यूलिप", "زهور التوليب"],
    s60: ["ねこの足あと", "Cat Paw Prints", "猫咪脚印", "貓咪腳印", "고양이 발자국", "Huellas de gato", "Pattes de chat", "Patinhas de gato", "Katzenpfoten", "Кошачьи следы", "Kedi Patileri", "Jejak Kaki Kucing", "बिल्ली के पंजे", "آثار أقدام القطط"],
    s61: ["さかな", "Little Fish", "小鱼", "小魚", "물고기", "Pececitos", "Petits poissons", "Peixinhos", "Fischlein", "Рыбки", "Balıkçıklar", "Ikan Kecil", "छोटी मछलियाँ", "أسماك صغيرة"],
    s62: ["キャンディ", "Candies", "糖果", "糖果", "사탕", "Caramelos", "Bonbons", "Balas", "Bonbons", "Конфеты", "Şekerlemeler", "Permen", "टॉफ़ियाँ", "حلوى"],
    s63: ["ハート", "Hearts", "爱心", "愛心", "하트", "Corazones", "Cœurs", "Corações", "Herzen", "Сердечки", "Kalpler", "Hati", "दिल", "قلوب"],
    s64: ["おんぷ", "Music Notes", "音符", "音符", "음표", "Notas musicales", "Notes de musique", "Notas musicais", "Noten", "Ноты", "Notalar", "Not Musik", "संगीत के सुर", "نوتات موسيقية"],
    s65: ["チェスの駒", "Chess Pieces", "国际象棋棋子", "西洋棋棋子", "체스 말", "Piezas de ajedrez", "Pièces d’échecs", "Peças de xadrez", "Schachfiguren", "Шахматные фигуры", "Satranç Taşları", "Bidak Catur", "शतरंज के मोहरे", "قطع الشطرنج"],
    s66: ["サイコロ", "Dice", "骰子", "骰子", "주사위", "Dados", "Dés", "Dados", "Würfel", "Кубики", "Zarlar", "Dadu", "पासे", "نرد"],
    s67: ["碁石", "Go Stones", "围棋子", "圍棋子", "바둑돌", "Piedras de go", "Pierres de go", "Pedras de go", "Go-Steine", "Камни го", "Go Taşları", "Batu Go", "गो के पत्थर", "أحجار الغو"],
    s68: ["しずく", "Raindrops", "雨滴", "雨滴", "물방울", "Gotas de lluvia", "Gouttes de pluie", "Gotas de chuva", "Regentropfen", "Капли дождя", "Yağmur Damlaları", "Tetes Hujan", "बारिश की बूँदें", "قطرات المطر"],
    s69: ["くもの模様", "Cloud Pattern", "云朵花纹", "雲朵花紋", "구름 무늬", "Nubecitas", "Motif nuages", "Nuvenzinhas", "Wolkenmuster", "Облачка", "Bulut Deseni", "Motif Awan", "बादलों का पैटर्न", "نقش الغيوم"],
    s70: ["月と星", "Moon & Stars", "月亮与星星", "月亮與星星", "달과 별", "Luna y estrellas", "Lune et étoiles", "Lua e estrelas", "Mond und Sterne", "Луна и звёзды", "Ay ve Yıldızlar", "Bulan & Bintang", "चाँद और तारे", "القمر والنجوم"],
    s71: ["さくらんぼ", "Cherries", "樱桃", "櫻桃", "체리", "Cerezas", "Cerises", "Cerejas", "Kirschen", "Вишни", "Kirazlar", "Ceri", "चेरी", "الكرز"],
    s72: ["いちょう", "Ginkgo Leaves", "银杏叶", "銀杏葉", "은행잎", "Hojas de ginkgo", "Feuilles de ginkgo", "Folhas de ginkgo", "Ginkgoblätter", "Листья гинкго", "Ginkgo Yaprakları", "Daun Ginkgo", "जिन्कगो पत्ते", "أوراق الجنكة"],
    s73: ["りんご", "Apples", "苹果", "蘋果", "사과", "Manzanas", "Pommes", "Maçãs", "Äpfel", "Яблоки", "Elmalar", "Apel", "सेब", "تفاح"],
    s74: ["麻の葉", "Asanoha", "麻叶纹", "麻葉紋", "삼잎 무늬", "Asanoha", "Asanoha", "Asanoha", "Asanoha", "Асаноха", "Asanoha", "Asanoha", "असानोहा", "أسانوها"],
    s75: ["七宝", "Shippo Rings", "七宝纹", "七寶紋", "칠보 무늬", "Anillos shippo", "Anneaux shippo", "Anéis shippo", "Shippo-Ringe", "Кольца сиппо", "Shippo Halkaları", "Cincin Shippo", "शिप्पो छल्ले", "حلقات شيبّو"],
    s76: ["鱗", "Uroko Scales", "鳞纹", "鱗紋", "비늘 무늬", "Escamas uroko", "Écailles uroko", "Escamas uroko", "Uroko-Schuppen", "Чешуя урокo", "Uroko Pulları", "Sisik Uroko", "उरोको शल्क", "حراشف أوروكو"],
    s77: ["ヘリンボーン", "Herringbone", "人字纹", "人字紋", "헤링본", "Espiga", "Chevrons", "Espinha de peixe", "Fischgrät", "Ёлочка", "Balıksırtı", "Herringbone", "हेरिंगबोन", "عظم السمكة"],
    s78: ["ハニカム", "Honeycomb", "蜂巢", "蜂巢", "허니콤", "Panal", "Nid d’abeille", "Favo de mel", "Bienenwabe", "Соты", "Bal Peteği", "Sarang Lebah", "मधुकोश", "خلية النحل"],
    s79: ["桜並木", "Cherry Blossom Hills", "樱花林荫", "櫻花林蔭", "벚꽃길", "Colinas de cerezos", "Collines en fleurs", "Colinas de cerejeiras", "Kirschblütenhügel", "Холмы сакуры", "Kiraz Tepeleri", "Bukit Sakura", "चेरी फूलों की पहाड़ियाँ", "تلال أزهار الكرز"],
    s80: ["紅葉の山", "Autumn Mountains", "红叶山峦", "紅葉山巒", "단풍 산", "Montañas otoñales", "Montagnes d’automne", "Montanhas de outono", "Herbstberge", "Осенние горы", "Sonbahar Dağları", "Gunung Musim Gugur", "पतझड़ के पहाड़", "جبال الخريف"],
    s81: ["ひまわり畑", "Sunflower Field", "向日葵花田", "向日葵花田", "해바라기 밭", "Campo de girasoles", "Champ de tournesols", "Campo de girassóis", "Sonnenblumenfeld", "Поле подсолнухов", "Ayçiçeği Tarlası", "Ladang Bunga Matahari", "सूरजमुखी का खेत", "حقل دوّار الشمس"],
    s82: ["朝焼けの海", "Dawn Sea", "朝霞之海", "朝霞之海", "아침놀 바다", "Mar al amanecer", "Mer à l’aube", "Mar ao amanhecer", "Meer im Morgenrot", "Море на рассвете", "Şafakta Deniz", "Laut Fajar", "भोर का समुद्र", "بحر الفجر"],
    s83: ["ゆきだるまの丘", "Snowman Hill", "雪人山丘", "雪人山丘", "눈사람 언덕", "Colina de muñecos de nieve", "Colline des bonshommes", "Colina dos bonecos de neve", "Schneemannhügel", "Холм снеговиков", "Kardan Adam Tepesi", "Bukit Manusia Salju", "हिममानव की पहाड़ी", "تل رجال الثلج"],
    s84: ["ききゅうの空", "Balloon Sky", "热气球天空", "熱氣球天空", "열기구 하늘", "Cielo de globos", "Ciel de montgolfières", "Céu de balões", "Ballonhimmel", "Небо с аэростатами", "Balon Göğü", "Langit Balon", "गुब्बारों का आसमान", "سماء المناطيد"],
    s85: ["にじの空", "Rainbow Sky", "彩虹天空", "彩虹天空", "무지개 하늘", "Cielo arcoíris", "Ciel arc-en-ciel", "Céu de arco-íris", "Regenbogenhimmel", "Радужное небо", "Gökkuşağı Göğü", "Langit Pelangi", "इंद्रधनुषी आसमान", "سماء قوس قزح"],
    s86: ["ラベンダー畑", "Lavender Field", "薰衣草花田", "薰衣草花田", "라벤더 밭", "Campo de lavanda", "Champ de lavande", "Campo de lavanda", "Lavendelfeld", "Лавандовое поле", "Lavanta Tarlası", "Ladang Lavender", "लैवेंडर का खेत", "حقل اللافندر"],
    s87: ["竹林", "Bamboo Grove", "竹林", "竹林", "대나무 숲", "Bosque de bambú", "Bambouseraie", "Bambuzal", "Bambushain", "Бамбуковая роща", "Bambu Korusu", "Hutan Bambu", "बाँस का वन", "غابة الخيزران"],
    s88: ["夕暮れの町", "Twilight Town", "黄昏小镇", "黃昏小鎮", "해질녘 마을", "Pueblo al anochecer", "Ville au crépuscule", "Cidade ao entardecer", "Abendstadt", "Город в сумерках", "Alacakaranlık Kasabası", "Kota Senja", "साँझ का कस्बा", "بلدة الغسق"],
    s89: ["南の島", "Tropical Island", "南国小岛", "南國小島", "남쪽 섬", "Isla tropical", "Île tropicale", "Ilha tropical", "Tropeninsel", "Тропический остров", "Tropik Ada", "Pulau Tropis", "उष्णकटिबंधीय द्वीप", "جزيرة استوائية"],
    s90: ["月夜", "Moonlit Night", "月夜", "月夜", "달밤", "Noche de luna", "Nuit de lune", "Noite de luar", "Mondnacht", "Лунная ночь", "Mehtaplı Gece", "Malam Purnama", "चाँदनी रात", "ليلة مقمرة"],
    s91: ["富士山", "Mount Fuji", "富士山", "富士山", "후지산", "Monte Fuji", "Mont Fuji", "Monte Fuji", "Fuji", "Гора Фудзи", "Fuji Dağı", "Gunung Fuji", "माउंट फ़ूजी", "جبل فوجي"],
    s92: ["雲海", "Sea of Clouds", "云海", "雲海", "운해", "Mar de nubes", "Mer de nuages", "Mar de nuvens", "Wolkenmeer", "Море облаков", "Bulut Denizi", "Lautan Awan", "बादलों का सागर", "بحر الغيوم"],
    s93: ["宝石箱", "Jewel Box", "珠宝盒", "珠寶盒", "보석함", "Joyero", "Coffret à bijoux", "Porta-joias", "Schmuckkästchen", "Шкатулка", "Mücevher Kutusu", "Kotak Permata", "गहनों का डिब्बा", "صندوق المجوهرات"],
    s94: ["金の青海波", "Golden Seigaiha", "金色青海波", "金色青海波", "금빛 청해파", "Seigaiha dorado", "Seigaiha doré", "Seigaiha dourado", "Goldenes Seigaiha", "Золотые волны сэйгайха", "Altın Seigaiha", "Seigaiha Emas", "सुनहरी सेगाइहा", "سيغايها الذهبي"],
    s95: ["天の川", "Milky Way", "银河", "銀河", "은하수", "Vía Láctea", "Voie lactée", "Via Láctea", "Milchstraße", "Млечный Путь", "Samanyolu", "Bima Sakti", "आकाशगंगा", "درب التبانة"],
    s96: ["螺鈿", "Raden Inlay", "螺钿", "螺鈿", "자개", "Incrustación raden", "Incrustation raden", "Marchetaria raden", "Raden-Perlmutt", "Перламутр радэн", "Raden Sedef", "Hiasan Raden", "रादेन जड़ाई", "ترصيع رادن"],
    s97: ["ローズ大理石", "Rose Marble", "玫瑰大理石", "玫瑰大理石", "로즈 대리석", "Mármol rosa", "Marbre rose", "Mármore rosa", "Rosenmarmor", "Розовый мрамор", "Gül Mermer", "Marmer Mawar", "गुलाबी संगमरमर", "الرخام الوردي"],
    s98: ["金箔の夜", "Gold-Leaf Night", "金箔之夜", "金箔之夜", "금박의 밤", "Noche con pan de oro", "Nuit à la feuille d’or", "Noite de folha de ouro", "Blattgoldnacht", "Ночь с сусальным золотом", "Altın Varaklı Gece", "Malam Daun Emas", "सोने के पत्र की रात", "ليلة ورق الذهب"],
    s99: ["うつろう空", "Shifting Sky", "流转的天空", "流轉的天空", "변해 가는 하늘", "Cielo cambiante", "Ciel changeant", "Céu que muda", "Wandelnder Himmel", "Переменчивое небо", "Değişen Gök", "Langit Berganti", "बदलता आसमान", "سماء متبدّلة"],
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
  const list = [{ id: 'base', rar: 1, kind: 'skin', def: true, bg: '#fff6e2', hd: '#fff6e2', nav: '#2b3044', dark: false }]
    .concat(Object.keys(D).map(id => { const [rar, k, bg, hd, nav, dark] = D[id]; return { id, rar, kind: 'skin', cover: k === 'c', px: k === 'c' ? 0 : k, bg, hd, nav, dark: !!dark }; }));
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
      '--sk-img2': ANIM[s.id] ? `url("${url(ANIM[s.id])}")` : 'none',
      '--sk-hdr': rgba(s.hd, .94), '--sk-hdrs': s.hd,
      '--sk-line': s.dark ? 'rgba(255,255,255,.14)' : shade(s.hd, .09),
      '--sk-nav': s.nav, '--sk-nav2': s.dark ? shade(s.nav, .3) : shade(s.nav, .35),
      '--sk-navt': s.dark ? '#1b2238' : '#fff',
      '--sk-navm': s.dark ? s.nav : s.nav,
    };
  }
  const root = document.documentElement;
  function paint(id) {
    const s = map[id], st = root.style;
    Object.keys(vars(list[1])).forEach(k => st.removeProperty(k));
    if (!s || s.def) { delete root.dataset.skin; delete root.dataset.skk; delete root.dataset.ska; root.classList.remove('skdark'); return null; }
    const v = vars(s); for (const k in v) st.setProperty(k, v[k]);
    root.dataset.skin = id; root.dataset.skk = s.cover ? 'cover' : 'tile'; if (ANIM[id]) root.dataset.ska = '1'; else delete root.dataset.ska; root.classList.toggle('skdark', s.dark);
    return v;
  }
  // wear a skin ('' / unknown = the classic cream): paint now and remember it for the next first paint
  function apply(id) {
    const v = paint(id);
    try {
      if (v) { localStorage.setItem('atlas-skin', id); localStorage.setItem('atlas-skin-css', JSON.stringify({ id, v, k: map[id].cover ? 'cover' : 'tile', d: map[id].dark ? 1 : 0, a: ANIM[id] ? 1 : 0 })); }
      else { localStorage.removeItem('atlas-skin'); localStorage.removeItem('atlas-skin-css'); }
    } catch (e) {}
  }
  const owned = (id, W) => DEV_ALL || !!(W && W.owned && W.owned.includes(id));
  window.AtlasSkins = { list, byId: id => map[id], url, thumb, apply, owned, DEV_ALL, RAR, name: (s, lang) => s.def ? tx(T.def, lang) : tx(N[s.id] || [s.id], lang), t: (k, lang) => tx(T[k], lang) };
})();
