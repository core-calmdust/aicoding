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
  const V = 1;   // bump when the images are re-rendered
  const DEV_ALL = true;
  const RAR = ['N', 'R', 'SR', 'SSR', 'UR'];
  // id: [rarity, kind (tile px | 'c' = cover), page colour, header colour, selected-tab colour, dark]
  const D = {
    s01: [1, 768, '#f6eddb', '#fbf5e8', '#6b5a3e'], s02: [1, 768, '#e6dece', '#f3eee4', '#5c5446'], s03: [1, 768, '#d8c19b', '#efe2c8', '#6e4f2a'],
    s04: [1, 768, '#cae7d9', '#e6f4ed', '#2e6b52'], s05: [1, 1024, '#e5efef', '#f1f7fa', '#3b6f9a'], s06: [1, 768, '#f6f5ee', '#fbfaf5', '#3f5f8f'],
    s07: [1, 768, '#fbe7eb', '#fdf3f5', '#b9506e'], s08: [1, 768, '#d7b685', '#efdfc4', '#6b4524'], s09: [1, 1024, '#f3e8ec', '#f8f1f6', '#7a5aa8'],
    s10: [1, 1024, '#efece4', '#f8f6f1', '#4f5b6e'], s11: [1, 768, '#f3e3bd', '#faf0da', '#7a5426'], s12: [1, 768, '#fbf6d2', '#fdfae6', '#a07a00'],
    s13: [2, 768, '#fbecef', '#fdf4f6', '#c25478'], s14: [2, 768, '#f9eddc', '#fcf5ea', '#b4532a'], s15: [2, 768, '#ebf3f9', '#f5f9fc', '#3d6e9e'],
    s16: [2, 768, '#e0ebf0', '#eef4f7', '#2f5a78'], s17: [2, 768, '#f7eedf', '#fbf6ec', '#2b3044'], s18: [2, 768, '#ebf4ee', '#f4f9f5', '#2f6a52'],
    s19: [2, 768, '#eee4d3', '#f7f1e7', '#4a3f30'], s20: [2, 768, '#eee9f8', '#f6f3fc', '#5b47a8'], s21: [2, 768, '#e8f4fb', '#f3f9fd', '#2c7fb8'],
    s22: [2, 768, '#eef4e0', '#f6f9ee', '#4f7a2e'], s23: [2, 768, '#edd5ac', '#f7ead2', '#6b4524'], s24: [2, 768, '#337355', '#1f4a36', '#e9c46a', 1],
    s25: [3, 'c', '#e2f0f8', '#eef7fd', '#2c7fb8'], s26: [3, 'c', '#efc6b0', '#fbe6d6', '#a14d5e'], s27: [3, 'c', '#d8e8e9', '#eef7fb', '#1f7a96'],
    s28: [3, 'c', '#e4edf6', '#f2f6fb', '#4a6f96'], s29: [3, 'c', '#dbecdc', '#eef7f0', '#4b8a3e'], s30: [3, 'c', '#f6dbb8', '#fcefdf', '#a5622a'],
    s31: [3, 'c', '#d0e1e2', '#edf4f6', '#3e6b6a'], s32: [3, 1024, '#f2f0ec', '#faf9f7', '#3a3a40'], s33: [3, 'c', '#222f55', '#1b2547', '#ffd56a', 1],
    s34: [3, 1024, '#f9ead5', '#fcf3e6', '#c0613a'],
    s35: [4, 'c', '#d4cab0', '#efe5cc', '#6b4a22'], s36: [4, 'c', '#2d4969', '#14223b', '#6fe3bd', 1], s37: [4, 'c', '#1b2954', '#16224a', '#e6c77a', 1],
    s38: [4, 768, '#f4ead9', '#faf4ea', '#a67c1f'], s39: [4, 1024, '#f3f1eb', '#faf9f5', '#a67c1f'], s40: [4, 1024, '#f1ebef', '#faf6fa', '#7d5cc4'],
  };
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
      '--sk-size': s.cover ? 'cover' : `${Math.round(s.px / 1.5)}px ${Math.round(s.px / 1.5)}px`,
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
    if (!s || s.def) { delete root.dataset.skin; delete root.dataset.skk; root.classList.remove('skdark'); return null; }
    const v = vars(s); for (const k in v) st.setProperty(k, v[k]);
    root.dataset.skin = id; root.dataset.skk = s.cover ? 'cover' : 'tile'; root.classList.toggle('skdark', s.dark);
    return v;
  }
  // wear a skin ('' / unknown = the classic cream): paint now and remember it for the next first paint
  function apply(id) {
    const v = paint(id);
    try {
      if (v) { localStorage.setItem('atlas-skin', id); localStorage.setItem('atlas-skin-css', JSON.stringify({ id, v, k: map[id].cover ? 'cover' : 'tile', d: map[id].dark ? 1 : 0 })); }
      else { localStorage.removeItem('atlas-skin'); localStorage.removeItem('atlas-skin-css'); }
    } catch (e) {}
  }
  const owned = (id, W) => DEV_ALL || !!(W && W.owned && W.owned.includes(id));
  window.AtlasSkins = { list, byId: id => map[id], url, thumb, apply, owned, DEV_ALL, RAR, name: (s, lang) => s.def ? tx(T.def, lang) : tx(N[s.id] || [s.id], lang), t: (k, lang) => tx(T[k], lang) };
})();
