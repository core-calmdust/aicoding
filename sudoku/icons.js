/* まいにち数独 — 500 collectible character icons (procedural, deterministic SVG)
 * window.SudokuIcons = { COUNT, RARITIES, info(id), svg(id, opts), silhouette(id, opts), byRarity(r) }
 * ids: 0-249 N, 250-399 R, 400-469 SR, 470-494 SSR, 495-499 UR
 */
(function () {
'use strict';
const f = n => Math.round(n * 10) / 10;
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ---------- data ---------- */
const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'];
const START = { N: 0, R: 250, SR: 400, SSR: 470, UR: 495 }, CNT = { N: 250, R: 150, SR: 70, SSR: 25, UR: 5 };
const SPECIES = ['cat', 'bunny', 'bear', 'panda', 'frog', 'chick', 'penguin', 'fox', 'hamster', 'puppy', 'sheep', 'owl', 'octopus', 'dinosaur', 'whale', 'ghost', 'slime', 'unicorn', 'dragon', 'axolotl', 'alpaca', 'hedgehog'];
// m main, l light, d deep, ln line, in inner(ear)
const PAL = [
  { k: 'strawberry', m: '#ffb3c7', l: '#fff0f4', d: '#f48aa6', ln: '#d76f8c', in: '#ff8fab' },
  { k: 'mint', m: '#a8e6cf', l: '#effbf5', d: '#6fcfaa', ln: '#58a888', in: '#ffbfd0' },
  { k: 'lemon', m: '#ffe58a', l: '#fffbe6', d: '#f7c948', ln: '#cf9f26', in: '#ffb3a3' },
  { k: 'soda', m: '#a6d8ff', l: '#eef8ff', d: '#6fb8f0', ln: '#5895ca', in: '#ffc0da' },
  { k: 'cocoa', m: '#cfa88a', l: '#f7ede4', d: '#a77b5c', ln: '#86603f', in: '#f4b6a6' },
  { k: 'lavender', m: '#cdb8f6', l: '#f6f1ff', d: '#a98ae8', ln: '#8a6dc6', in: '#ffbfe0' },
  { k: 'peach', m: '#ffc8a2', l: '#fff3ea', d: '#ffa673', ln: '#dd875a', in: '#ff9f9f' },
  { k: 'midnight', m: '#8f97e6', l: '#e6e8ff', d: '#6168c4', ln: '#474e9e', in: '#f7a8d0' },
  { k: 'snow', m: '#f8f6fc', l: '#ffffff', d: '#dcd5ec', ln: '#ada3c6', in: '#ffc4d4' },
  { k: 'cherry', m: '#ff98ab', l: '#ffe8ec', d: '#f0607e', ln: '#cc4c68', in: '#ffd1da' },
  { k: 'matcha', m: '#bddc90', l: '#f5fbe9', d: '#8fbf5a', ln: '#6f9842', in: '#ffbdb4' },
  { k: 'caramel', m: '#f6c27c', l: '#fff4e3', d: '#dc9a45', ln: '#b57a30', in: '#ffb3a0' },
];
const BGC = ['#ffe4ec', '#dcf5ea', '#fff4c7', '#dceeff', '#efe6ff', '#ffe7d6', '#e6f6d6', '#fde3f4', '#d6f2f4', '#fff0d9', '#e6e4ff', '#f2f8dc'];
const SRBG = ['#c9dcff', '#e2d1ff', '#ffd1e3', '#c9f0de', '#ffeab5'];
const ACCS = ['ribbon', 'flower', 'beret', 'sprout', 'phones', 'glasses', 'starclip', 'chef', 'witch', 'party', 'scarf', 'bowtie'];
const ACOL = ['#ff7096', '#6cb8ff', '#ffc94a', '#a982ff', '#4fcf9e', '#ff9150'];
const JEWEL = [['#ff7aa2', '#9c1446', '#4f0723'], ['#78b4ff', '#2433a0', '#0f1550'], ['#5fe6b4', '#0f7a62', '#053b33'], ['#cf8dff', '#5a1fa0', '#260a4f'], ['#ffcf6b', '#b05410', '#5a2205']];
const INK = '#4a3846';
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];

/* ---------- words (10 languages) ---------- */
const W = {
  sp: {
    ja: ['ねこ', 'うさぎ', 'くま', 'パンダ', 'かえる', 'ひよこ', 'ペンギン', 'きつね', 'ハムスター', 'いぬ', 'ひつじ', 'ふくろう', 'たこ', 'きょうりゅう', 'くじら', 'おばけ', 'スライム', 'ユニコーン', 'ドラゴン', 'ウーパールーパー', 'アルパカ', 'ハリネズミ'],
    en: ['Kitty', 'Bunny', 'Bear', 'Panda', 'Frog', 'Chick', 'Penguin', 'Fox', 'Hamster', 'Puppy', 'Sheep', 'Owl', 'Octopus', 'Dino', 'Whale', 'Ghost', 'Slime', 'Unicorn', 'Dragon', 'Axolotl', 'Alpaca', 'Hedgehog'],
    zh: ['猫咪', '兔兔', '小熊', '熊猫', '青蛙', '小鸡', '企鹅', '狐狸', '仓鼠', '小狗', '绵羊', '猫头鹰', '章鱼', '恐龙', '鲸鱼', '幽灵', '史莱姆', '独角兽', '小龙', '六角恐龙', '羊驼', '刺猬'],
    ko: ['고양이', '토끼', '곰돌이', '판다', '개구리', '병아리', '펭귄', '여우', '햄스터', '강아지', '양', '부엉이', '문어', '공룡', '고래', '유령', '슬라임', '유니콘', '드래곤', '우파루파', '알파카', '고슴도치'],
    es: ['Gatito', 'Conejito', 'Osito', 'Panda', 'Ranita', 'Pollito', 'Pingüino', 'Zorrito', 'Hámster', 'Perrito', 'Ovejita', 'Búho', 'Pulpo', 'Dino', 'Ballena', 'Fantasmita', 'Slime', 'Unicornio', 'Dragoncito', 'Ajolote', 'Alpaca', 'Erizo'],
    fr: ['Chaton', 'Lapin', 'Ourson', 'Panda', 'Grenouille', 'Poussin', 'Pingouin', 'Renard', 'Hamster', 'Chiot', 'Mouton', 'Hibou', 'Poulpe', 'Dino', 'Baleine', 'Fantôme', 'Slime', 'Licorne', 'Dragon', 'Axolotl', 'Alpaga', 'Hérisson'],
    pt: ['Gatinho', 'Coelhinho', 'Ursinho', 'Panda', 'Sapinho', 'Pintinho', 'Pinguim', 'Raposinha', 'Hamster', 'Cachorrinho', 'Ovelhinha', 'Corujinha', 'Polvo', 'Dino', 'Baleia', 'Fantasminha', 'Slime', 'Unicórnio', 'Dragãozinho', 'Axolote', 'Alpaca', 'Ouriço'],
    de: ['Kätzchen', 'Häschen', 'Bärchen', 'Panda', 'Frosch', 'Küken', 'Pinguin', 'Füchschen', 'Hamster', 'Hündchen', 'Schäfchen', 'Eule', 'Krake', 'Dino', 'Wal', 'Gespenst', 'Schleim', 'Einhorn', 'Drache', 'Axolotl', 'Alpaka', 'Igel'],
    hi: ['बिल्ली', 'खरगोश', 'भालू', 'पांडा', 'मेंढक', 'चूज़ा', 'पेंगुइन', 'लोमड़ी', 'हैम्स्टर', 'पिल्ला', 'भेड़', 'उल्लू', 'ऑक्टोपस', 'डायनो', 'व्हेल', 'भूत', 'स्लाइम', 'यूनिकॉर्न', 'ड्रैगन', 'एक्सोलोटल', 'अल्पाका', 'साही'],
    ar: ['قطة', 'أرنب', 'دبدوب', 'باندا', 'ضفدع', 'كتكوت', 'بطريق', 'ثعلب', 'هامستر', 'جرو', 'خروف', 'بومة', 'أخطبوط', 'ديناصور', 'حوت', 'شبح', 'سلايم', 'يونيكورن', 'تنين', 'أكسولوتل', 'ألباكا', 'قنفذ'],
  },
  pal: {
    ja: ['いちご', 'ミント', 'レモン', 'ソーダ', 'ココア', 'ラベンダー', 'ピーチ', 'ミッドナイト', 'スノー', 'チェリー', 'まっちゃ', 'キャラメル'],
    en: ['Strawberry', 'Mint', 'Lemon', 'Soda', 'Cocoa', 'Lavender', 'Peach', 'Midnight', 'Snow', 'Cherry', 'Matcha', 'Caramel'],
    zh: ['草莓', '薄荷', '柠檬', '汽水', '可可', '薰衣草', '蜜桃', '午夜', '雪白', '樱桃', '抹茶', '焦糖'],
    ko: ['딸기', '민트', '레몬', '소다', '코코아', '라벤더', '복숭아', '미드나잇', '스노우', '체리', '말차', '캐러멜'],
    es: ['Fresa', 'Menta', 'Limón', 'Soda', 'Cacao', 'Lavanda', 'Melocotón', 'Medianoche', 'Nieve', 'Cereza', 'Matcha', 'Caramelo'],
    fr: ['Fraise', 'Menthe', 'Citron', 'Soda', 'Cacao', 'Lavande', 'Pêche', 'Minuit', 'Neige', 'Cerise', 'Matcha', 'Caramel'],
    pt: ['Morango', 'Menta', 'Limão', 'Soda', 'Cacau', 'Lavanda', 'Pêssego', 'Meia-Noite', 'Neve', 'Cereja', 'Matcha', 'Caramelo'],
    de: ['Erdbeer', 'Minz', 'Zitronen', 'Soda', 'Kakao', 'Lavendel', 'Pfirsich', 'Mitternachts', 'Schnee', 'Kirsch', 'Matcha', 'Karamell'],
    hi: ['स्ट्रॉबेरी', 'पुदीना', 'नींबू', 'सोडा', 'कोको', 'लैवेंडर', 'आड़ू', 'आधी रात', 'स्नो', 'चेरी', 'माचा', 'कैरमल'],
    ar: ['الفراولة', 'النعناع', 'الليمون', 'الصودا', 'الكاكاو', 'الخزامى', 'الخوخ', 'منتصف الليل', 'الثلج', 'الكرز', 'الماتشا', 'الكراميل'],
  },
  acc: {
    ja: ['リボン', 'おはな', 'ベレー', 'ふたば', 'ヘッドホン', 'めがね', 'ほしピン', 'コック', 'まじょ', 'パーティー', 'マフラー', 'ちょうネクタイ'],
    en: ['Ribbon', 'Blossom', 'Beret', 'Sprout', 'DJ', 'Bookish', 'Starry', 'Chef', 'Witchy', 'Party', 'Cozy', 'Dapper'],
    zh: ['蝴蝶结', '小花', '贝雷帽', '嫩芽', '耳机', '眼镜', '星星发夹', '厨师', '魔女', '派对', '围巾', '领结'],
    ko: ['리본', '꽃', '베레모', '새싹', '헤드폰', '안경', '별핀', '셰프', '마녀', '파티', '목도리', '나비넥타이'],
    es: ['con lazo', 'con flor', 'con boina', 'con brote', 'con cascos', 'con gafas', 'con estrella', 'chef', 'brujita', 'de fiesta', 'con bufanda', 'con pajarita'],
    fr: ['au ruban', 'à fleur', 'au béret', 'à pousse', 'au casque', 'à lunettes', 'étoilé', 'chef', 'sorcier', 'de fête', 'à écharpe', 'à nœud pap'],
    pt: ['de laço', 'de flor', 'de boina', 'de broto', 'de fones', 'de óculos', 'estrelado', 'chef', 'bruxinho', 'festeiro', 'de cachecol', 'de gravatinha'],
    de: ['Schleife', 'Blume', 'Baskenmütze', 'Spross', 'Kopfhörern', 'Brille', 'Sternspange', 'Kochmütze', 'Hexenhut', 'Partyhut', 'Schal', 'Fliege'],
    hi: ['रिबन', 'फूल', 'बेरे', 'अंकुर', 'हेडफ़ोन', 'चश्मा', 'सितारा', 'शेफ़', 'जादुई', 'पार्टी', 'मफ़लर', 'बो-टाई'],
    ar: ['بالشريطة', 'بالزهرة', 'بالبيريه', 'بالبرعم', 'بالسماعات', 'بالنظارة', 'بالنجمة', 'الطاهي', 'الساحر', 'الاحتفالي', 'بالوشاح', 'بالبابيون'],
  },
  adj: {
    ja: ['きらきら', 'ゆめみる', 'ほしくず', 'ふわふわ', 'ひだまり', 'にじいろ', 'つきよの', 'はなさく', 'しゃぼん', 'きらめき'],
    en: ['Twinkle', 'Dreamy', 'Stardust', 'Fluffy', 'Sunny', 'Rainbow', 'Moonlit', 'Blossom', 'Bubbly', 'Glimmer'],
    zh: ['闪闪', '梦幻', '星尘', '软绵绵', '暖阳', '彩虹', '月夜', '花开', '泡泡', '微光'],
    ko: ['반짝반짝', '꿈꾸는', '별가루', '몽글몽글', '햇살', '무지개', '달밤의', '꽃피는', '비눗방울', '은빛'],
    es: ['Brillante', 'de Ensueño', 'de Estrellas', 'de Algodón', 'de Sol', 'Arcoíris', 'de Luna', 'de Flores', 'de Burbujas', 'de Destellos'],
    fr: ['Étincelle', 'de Rêve', "d'Étoiles", 'Nuage', 'Soleil', 'Arc-en-ciel', 'de Lune', 'en Fleur', 'Bulle', 'Paillette'],
    pt: ['Brilhante', 'dos Sonhos', 'Estelar', 'de Algodão', 'Solar', 'Arco-Íris', 'Lunar', 'das Flores', 'de Bolhas', 'Cintilante'],
    de: ['Funkel', 'Traum', 'Sternen', 'Flausch', 'Sonnen', 'Regenbogen', 'Mond', 'Blüten', 'Seifenblasen', 'Glitzer'],
    hi: ['चमकीला', 'सपनीला', 'तारों वाला', 'रुई-सा', 'धूप-सा', 'इंद्रधनुषी', 'चाँदनी', 'फूलों वाला', 'बुलबुला', 'झिलमिल'],
    ar: ['متلألئ', 'حالم', 'نجمي', 'ناعم', 'مشمس', 'ملوّن', 'قمري', 'مزهر', 'فقاعي', 'برّاق'],
  },
  ttl: {
    ja: ['ロイヤル', 'コズミック', 'プリンセス', 'ナイト', 'エンペラー', 'セレスティアル', 'ジュエル', 'オーロラ'],
    en: ['Royal', 'Cosmic', 'Princess', 'Knight', 'Emperor', 'Celestial', 'Jewel', 'Aurora'],
    zh: ['皇家', '宇宙', '公主', '骑士', '帝王', '天空', '宝石', '极光'],
    ko: ['로열', '코스믹', '프린세스', '나이트', '엠퍼러', '셀레스티얼', '쥬얼', '오로라'],
    es: ['Real', 'Cósmico', 'Princesa', 'Caballero', 'Emperador', 'Celestial', 'Joya', 'Aurora'],
    fr: ['Royal', 'Cosmique', 'Princesse', 'Chevalier', 'Empereur', 'Céleste', 'Joyau', 'Aurore'],
    pt: ['Real', 'Cósmico', 'Princesa', 'Cavaleiro', 'Imperador', 'Celestial', 'Joia', 'Aurora'],
    de: ['Königs', 'Kosmos', 'Prinzessinnen', 'Ritter', 'Kaiser', 'Himmels', 'Juwelen', 'Polarlicht'],
    hi: ['शाही', 'ब्रह्मांडीय', 'राजकुमारी', 'योद्धा', 'सम्राट', 'दिव्य', 'रत्न', 'ध्रुवज्योति'],
    ar: ['ملكي', 'كوني', 'أميري', 'فارس', 'إمبراطور', 'سماوي', 'جوهري', 'شفقي'],
  },
  ur: {
    ja: ['星詠みドラゴン', '虹のユニコーン', '月の女王ねこ', '太陽の守護神フェニックス', '銀河くじら'],
    en: ['Stargazer Dragon', 'Rainbow Unicorn', 'Moon Queen Kitty', 'Sun Guardian Phoenix', 'Galaxy Whale'],
    zh: ['星咏之龙', '彩虹独角兽', '月之女王猫', '太阳守护神凤凰', '银河鲸鱼'],
    ko: ['별을 읊는 드래곤', '무지개 유니콘', '달의 여왕 고양이', '태양의 수호신 피닉스', '은하 고래'],
    es: ['Dragón Lector de Estrellas', 'Unicornio Arcoíris', 'Gata Reina de la Luna', 'Fénix Guardián del Sol', 'Ballena Galáctica'],
    fr: ["Dragon Liseur d'Étoiles", 'Licorne Arc-en-ciel', 'Chatte Reine de la Lune', 'Phénix Gardien du Soleil', 'Baleine Galactique'],
    pt: ['Dragão Leitor de Estrelas', 'Unicórnio Arco-Íris', 'Gata Rainha da Lua', 'Fênix Guardiã do Sol', 'Baleia Galáctica'],
    de: ['Sternenseher-Drache', 'Regenbogen-Einhorn', 'Mondkönigin-Kätzchen', 'Sonnenwächter-Phönix', 'Galaxie-Wal'],
    hi: ['तारा-वाचक ड्रैगन', 'इंद्रधनुषी यूनिकॉर्न', 'चंद्र-रानी बिल्ली', 'सूर्य-रक्षक फ़ीनिक्स', 'आकाशगंगा व्हेल'],
    ar: ['تنين قارئ النجوم', 'يونيكورن قوس قزح', 'قطة ملكة القمر', 'العنقاء حارسة الشمس', 'حوت المجرة'],
  },
};
const word = (cat, lang, i) => { const t = W[cat]; return (t[lang] || t.en || t.ja)[i] || t.en[i] || t.ja[i]; };
const FMT = { // N: p+s ; R: a+p+s ; SR/SSR: a+s
  ja: [(p, s) => `${p}の${s}`, (a, p, s) => `${a}の${p}${s}`, (a, s) => `${a}${s}`],
  en: [(p, s) => `${p} ${s}`, (a, p, s) => `${a} ${p} ${s}`, (a, s) => `${a} ${s}`],
  zh: [(p, s) => `${p}${s}`, (a, p, s) => `${a}${p}${s}`, (a, s) => `${a}${s}`],
  ko: [(p, s) => `${p} ${s}`, (a, p, s) => `${a} ${p} ${s}`, (a, s) => `${a} ${s}`],
  es: [(p, s) => `${s} ${p}`, (a, p, s) => `${s} ${p} ${a}`, (a, s) => `${s} ${a}`],
  fr: [(p, s) => `${s} ${p}`, (a, p, s) => `${s} ${p} ${a}`, (a, s) => `${s} ${a}`],
  pt: [(p, s) => `${s} ${p}`, (a, p, s) => `${s} ${p} ${a}`, (a, s) => `${s} ${a}`],
  de: [(p, s) => `${p}-${s}`, (a, p, s) => `${p}-${s} mit ${a}`, (a, s) => `${a}-${s}`],
  hi: [(p, s) => `${p} ${s}`, (a, p, s) => `${a} ${p} ${s}`, (a, s) => `${a} ${s}`],
  ar: [(p, s) => `${s} ${p}`, (a, p, s) => `${s} ${p} ${a}`, (a, s) => `${s} ${a}`],
};

/* ---------- speed reward characters ---------- */
const SPX = [
  [0, 11, 'net', '#d9f5c9', '#9fe0b4', 1], [2, 5, 'paint', '#efe2ff', '#c7a8ff', 2], [6, 3, 'swirl', '#d7f1fc', '#8fd3f5', 3], [7, 6, 'spot', '#3a3478', '#6a5cc8', 1],
  [8, 0, 'fruit', '#ffe2ec', '#ffb3c9', 1], [11, 7, 'tophat', '#d6f5e2', '#8fdcb0', 2], [15, 8, 'sparkle', '#ece8ff', '#c9c2f5', 4], [14, 3, 'icecrown', '#e6f6ff', '#a6d8ff', 1],
  [1, 1, 'headband', '#e0f8ea', '#9fe0bd', 1], [9, 2, 'goggles', '#dceeff', '#9cc8ff', 2], [18, 9, 'helmet', '#f0e2ff', '#c39bff', 3], [17, 5, 'champion', '#ffe9c2', '#ffb3d6', 1],
  [5, 2, 'watch', '#fff0d6', '#ffc98a', 3], [8, 11, 'bronze', '#ffeede', '#f5c79e', 1], [3, 8, 'gold', '#fff6c8', '#ffd96b', 1], [13, 10, 'flame', '#ffe6d6', '#ff9f7a', 2],
  [19, 0, 'sneak', '#ffe6f2', '#ffb0d0', 1], [21, 4, 'wind', '#fff0dc', '#ffc58a', 2], [12, 9, 'nums', '#dcecff', '#a6c8ff', 3], [20, 2, 'bolt', '#fffbd6', '#ffe36b', 1],
];

/* ---------- id → traits ---------- */
const TR = [];
(function () {
  for (let i = 0; i < 250; i++) { const sp = i % 22, g = (i / 22) | 0; TR.push({ r: 'N', sp, pal: (g + sp * 5) % 12, acc: -1, bg: (sp * 7 + g * 5 + 2) % 12, ex: (i * 3 + g) % 5 }); }
  for (let j = 0; j < 150; j++) { const sp = j % 22, g = (j / 22) | 0; TR.push({ r: 'R', sp, pal: (j * 7 + g) % 12, acc: j % 12, bg: (j * 5 + 3) % 12, pat: (j + g) % 4, ex: (j * 2 + g) % 5 }); }
  for (let k = 0; k < 70; k++) { const sp = (k * 13) % 22, g = (k / 22) | 0; TR.push({ r: 'SR', sp, pal: (k * 5 + g + 3) % 12, acc: (k * 7 + 4) % 12, bg: k % 5, adj: k % 10, ex: (k + g) % 5 }); }
  for (let m = 0; m < 25; m++) { const sp = (m * 9 + 4) % 22; TR.push({ r: 'SSR', sp, pal: (m * 7 + 2) % 12, acc: -1, bg: m % 5, ttl: m % 8, cos: m % 3, ex: (m * 3) % 5 }); }
  const urSp = [18, 17, 0, 5, 14];
  for (let u = 0; u < 5; u++) TR.push({ r: 'UR', sp: urSp[u], pal: -1, acc: -1, bg: u, ur: u, ex: 0 });
  // すぴーど数独 rewards (not in the gacha): [species, palette, prop, bg1, bg2, expression]
  SPX.forEach((x, k) => TR.push({ r: 'SP', sp: x[0], pal: x[1], prop: x[2], c1: x[3], c2: x[4], ex: x[5], k }));
})();

function info(id) {
  const t = TR[id]; if (!t) return null;
  return {
    id, rarity: t.r, species: id === 498 ? 'phoenix' : SPECIES[t.sp],
    name: lang => {
      if (t.r === 'SP') { const I = (typeof window !== 'undefined' && window.I18N) || {}, key = 'spi.' + t.k; return (I[lang] && I[lang][key]) || (I.en && I.en[key]) || (I.ja && I.ja[key]) || 'SP'; }
      const L = FMT[lang] ? lang : 'en', F = FMT[L], s = word('sp', L, t.sp);
      if (t.r === 'UR') return word('ur', L, t.ur);
      if (t.r === 'N') return F[0](word('pal', L, t.pal), s);
      if (t.r === 'R') return F[1](word('acc', L, t.acc), word('pal', L, t.pal), s);
      if (t.r === 'SR') return F[2](word('adj', L, t.adj), s);
      return F[2](word('ttl', L, t.ttl), s);
    },
  };
}

/* ---------- primitives ---------- */
const e = (x, y, rx, ry, fl, a = '') => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fl}"${a}/>`;
const c = (x, y, r, fl, a = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fl}"${a}/>`;
const p = (d, fl, a = '') => `<path d="${d}" fill="${fl}"${a}/>`;
const rot = (a, x, y) => ` transform="rotate(${a} ${f(x)} ${f(y)})"`;
const ln = (d, s, w, a = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${a}/>`;
const star4 = (x, y, s) => { const q = s * .22; return `M${f(x)} ${f(y - s)}Q${f(x + q)} ${f(y - q)} ${f(x + s)} ${f(y)}Q${f(x + q)} ${f(y + q)} ${f(x)} ${f(y + s)}Q${f(x - q)} ${f(y + q)} ${f(x - s)} ${f(y)}Q${f(x - q)} ${f(y - q)} ${f(x)} ${f(y - s)}Z`; };
const star5 = (x, y, s, inner = .48) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * inner : s; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * r) + ' ' + f(y + Math.sin(a) * r); } return d + 'Z'; };
const mirror = d => d.replace(/([MLQTCHVAZmlqtchvaz])|(-?\d*\.?\d+)/g, (() => { let cmd = '', k = 0; return (m, op, num) => { if (op) { cmd = op; k = 0; return op; } const n = +num; let out = n; if ('MLQTC'.includes(cmd)) { if (k % 2 === 0) out = 100 - n; } else if (cmd === 'H') out = 100 - n; k++; return String(f(out)); }; })()).replace(/(\d)-/g, '$1 -');
const BODY = 'M21 104Q22 82 50 81Q78 82 79 104Z';

/* ---------- species ---------- */
// returns { sh (outlined silhouette shapes), det (details), face anchors, accessory anchors }
function species(si, P, o = {}) {
  const m = P.m, L = P.l, D = P.d, I = P.in;
  const A = { ey: 57, ex: 10.5, my: null, mouth: 's', bx: 18, by: null, ty: 33, sx: 70, sy: 36, hw: 29, hy: 56, ny: 81, body: true, cheek: true };
  let back = '', head = e(50, 56, 29, 24.5, m), front = '', det = '';
  const BELLY = e(50, 98, 13, 10, L);
  switch (SPECIES[si]) {
    case 'cat': {
      const ear = 'M22 50Q19 25 27 19Q31 16 46 33Z', inr = 'M27 41Q25.5 27 30 24Q33 23 40 32Z';
      back = p(ear, m) + p(mirror(ear), m); det = p(inr, I) + p(mirror(inr), I) + ln('M14 59.5l7 .8M15 65l6.5-2M86 59.5l-7 .8M85 65l-6.5-2', P.ln, 1.3, ' opacity=".55"');
      A.mouth = 'w'; A.ty = 34; break;
    }
    case 'bunny': {
      back = e(38, 23, 7.5, 18, m, rot(-10, 38, 23)) + e(62, 23, 7.5, 18, m, rot(10, 62, 23));
      det = e(38, 24.5, 3.5, 12.5, I, rot(-10, 38, 24.5)) + e(62, 24.5, 3.5, 12.5, I, rot(10, 62, 24.5));
      head = e(50, 58, 28, 23.5, m); A.ey = 59; A.mouth = 'w'; A.ty = 36; A.sx = 69; A.sy = 39; A.hy = 58; break;
    }
    case 'bear': {
      back = c(26, 36, 9.5, m) + c(74, 36, 9.5, m); det = c(26, 36, 5, I) + c(74, 36, 5, I) + e(50, 65.5, 10.5, 7.5, L) + e(50, 62.3, 3.4, 2.4, INK);
      head = e(50, 57, 29, 25, m); A.ey = 55; A.ex = 11; A.my = 66.5; A.mouth = 'w'; A.by = 61; A.bx = 20; break;
    }
    case 'panda': {
      const pc = P.k === 'snow' ? '#c9c0db' : m;
      back = c(26, 35, 9.5, pc) + c(74, 35, 9.5, pc); head = e(50, 57, 29, 25, '#fffdfb');
      det = e(39.5, 57, 6.8, 8.4, pc, rot(28, 39.5, 57)) + e(60.5, 57, 6.8, 8.4, pc, rot(-28, 60.5, 57)) + e(50, 64, 2.8, 2, INK);
      A.ey = 57; A.my = 67; A.by = 64; A.bx = 20; A.bodyFill = pc; break;
    }
    case 'frog': {
      back = c(33, 40, 11, m) + c(67, 40, 11, m); head = e(50, 61, 32, 21.5, m);
      det = c(33, 40, 7, '#fff') + c(67, 40, 7, '#fff');
      A.ey = 40.5; A.ex = 17; A.my = 66; A.mouth = 'wide'; A.by = 62; A.bx = 21; A.ty = 31; A.hy = 60; A.hw = 31; A.sx = 76; A.sy = 34; break;
    }
    case 'chick': {
      front = p('M49 35Q43 26 48 21Q49 27 52 30Q54 23 60 24Q55 28 53 35Z', m); head = e(50, 59, 28, 26, m);
      det = p('M45 64.5L50 61L55 64.5L50 68.5Z', '#ff9f43') + p('M45 64.5L55 64.5L50 68.5Z', '#f08227');
      A.ey = 57.5; A.mouth = 'none'; A.ty = 34; A.by = 63; A.hy = 59; break;
    }
    case 'penguin': {
      head = e(50, 57, 29, 25, m);
      det = p('M50 51Q42 42 34 46Q24 52 28 65Q33 78 50 79Q67 78 72 65Q76 52 66 46Q58 42 50 51Z', '#fffaf7') + p('M46 64Q50 60.5 54 64Q50 68.5 46 64Z', '#ff9f43');
      A.ey = 58; A.mouth = 'none'; A.by = 63; A.bellyFill = '#fffaf7'; break;
    }
    case 'fox': {
      const ear = 'M21 52Q16 26 23 15Q30 17 45 34Z', inr = 'M25 44Q22 28 25 21Q30 24 38 33Z';
      back = p(ear, m) + p(mirror(ear), m); head = e(50, 58, 29, 23, m);
      det = p(inr, L) + p(mirror(inr), L) + p('M21 59Q34 55 50 66Q66 55 79 59Q75 77 50 81Q25 77 21 59Z', L) + e(50, 64.5, 2.9, 2.1, INK);
      A.ey = 56; A.my = 68.5; A.mouth = 'w'; A.by = 62; A.ty = 35; break;
    }
    case 'hamster': {
      back = c(30, 36, 7, m) + c(70, 36, 7, m); head = e(50, 58, 30, 25, m);
      det = c(30, 36, 4, I) + c(70, 36, 4, I) + p('M21 63Q36 54 50 62Q64 54 79 63Q75 81 50 83Q25 81 21 63Z', L) + e(50, 61.5, 1.8, 1.3, '#ff8fab');
      A.ey = 56; A.my = 64.5; A.mouth = 'w'; A.by = 62; A.bx = 20; A.ty = 34; break;
    }
    case 'puppy': {
      head = e(50, 56, 27, 24, m); front = e(23, 55, 8, 15, D, rot(22, 23, 55)) + e(77, 55, 8, 15, D, rot(-22, 77, 55));
      det = e(50, 66, 10, 7, L) + e(50, 62.5, 3.6, 2.6, INK);
      A.ey = 55; A.ex = 10; A.my = 67; A.mouth = 'w'; A.by = 61; A.bx = 17; A.ty = 32; A.sx = 66; A.sy = 34; A.hw = 27; break;
    }
    case 'sheep': {
      const wool = P.k === 'snow' ? '#ffffff' : L; let ring = '';
      for (let k = 0; k < 11; k++) { const a = Math.PI * 2 * k / 11 - Math.PI / 2; ring += c(50 + Math.cos(a) * 25, 57 + Math.sin(a) * 23, 10, wool); }
      back = e(23, 62, 8, 4.6, m, rot(-20, 23, 62)) + e(77, 62, 8, 4.6, m, rot(20, 77, 62));
      head = ring + c(50, 57, 24, wool);
      det = e(50, 61, 17, 16, m, ` stroke="${P.ln}" stroke-width="1.4"`) + c(43, 44, 5, wool) + c(50, 42, 5.5, wool) + c(57, 44, 5, wool);
      A.ey = 61; A.ex = 7.5; A.my = 67; A.bx = 12; A.by = 66; A.ty = 27; A.sx = 72; A.sy = 34; A.hw = 33; A.hy = 58; A.bodyFill = wool; A.cheekR = .75; break;
    }
    case 'owl': {
      head = p('M22 60Q20 36 27 24L36 33Q50 28 64 33L73 24Q80 36 78 60Q76 82 50 82Q24 82 22 60Z', m);
      det = c(39, 57, 10, L) + c(61, 57, 10, L) + p('M46.5 64H53.5L50 69.5Z', '#ff9f43') + ln('M44 40l3 3 3-3 3 3 3-3', P.ln, 1.3, ' opacity=".45"');
      A.ey = 57; A.ex = 11; A.mouth = 'none'; A.by = 66; A.bx = 21; A.ty = 32; break;
    }
    case 'octopus': {
      head = c(26, 79, 7, m) + c(37, 84, 7, m) + c(50, 86, 7, m) + c(63, 84, 7, m) + c(74, 79, 7, m) + e(50, 54, 28, 28, m);
      det = c(38, 36, 3.4, D, ' opacity=".5"') + c(61, 33, 2.4, D, ' opacity=".5"') + c(66, 40, 1.6, D, ' opacity=".5"');
      A.body = false; A.ey = 58; A.my = 66; A.ty = 28; A.sx = 72; A.sy = 34; A.hy = 54; A.ny = 78; break;
    }
    case 'dinosaur': {
      back = p('M29 39L32 25L42 33ZM41 31L50 17L59 31ZM58 33L68 25L71 39Z', D); head = e(50, 58, 29, 24, m);
      det = c(46, 64.5, 1.1, P.ln) + c(54, 64.5, 1.1, P.ln) + c(70, 48, 2.2, D, ' opacity=".6"') + c(74, 54, 1.5, D, ' opacity=".6"');
      A.ey = 56; A.my = 68; A.ty = 35; break;
    }
    case 'whale': {
      back = p('M70 50Q80 28 90 26Q87 33 84 42Q92 40 96 46Q86 54 74 56Z', m); head = e(50, 62, 31, 24, m);
      det = p('M21 68Q50 92 79 68Q73 84 50 86Q27 84 21 68Z', L) + ln('M36 76.5v4M43 79v4.5M50 80v4.5M57 79v4.5M64 76.5v4', P.d, 1.2, ' opacity=".5"');
      if (!o.hat) det += ln('M50 37Q47 30 40 29M50 37Q53 30 60 29M50 37V27', '#7ec8ff', 2.2) + c(39, 28, 2, '#9fd8ff') + c(61, 28, 2, '#9fd8ff') + c(50, 25, 2, '#9fd8ff');
      A.body = false; A.ey = 59; A.ex = 11; A.my = 66; A.by = 64; A.bx = 20; A.ty = 39; A.sx = 70; A.sy = 43; A.hy = 60; A.hw = 30; A.ny = 82; break;
    }
    case 'ghost': {
      head = e(22, 66, 5, 4, L) + e(78, 66, 5, 4, L) + p('M24 84V54A26 26 0 0 1 76 54V84Q71.7 90 67.3 84T58.7 84T50 84T41.3 84T32.7 84T24 84Z', L);
      det = c(64, 38, 3, '#fff', ' opacity=".8"');
      A.body = false; A.ey = 55; A.my = 62; A.by = 61; A.ty = 30; A.sx = 67; A.sy = 33; A.hy = 52; A.hw = 26; A.ny = 74; break;
    }
    case 'slime': {
      head = e(50, 87, 28, 4, D, ' opacity=".55"') + p('M50 24Q57 40 72 51Q85 63 79 78Q73 89 50 89Q27 89 21 78Q15 63 28 51Q43 40 50 24Z', m);
      det = e(35, 58, 4, 8, '#fff', ' opacity=".6"' + rot(30, 35, 58)) + c(39, 47, 2, '#fff', ' opacity=".8"');
      A.body = false; A.ey = 66; A.my = 73; A.by = 71; A.ty = 36; A.sx = 66; A.sy = 46; A.hy = 66; A.hw = 30; A.ny = 86; break;
    }
    case 'unicorn': {
      const ear = 'M31 40Q27 25 33 21Q38 27 41 35Z', mc = [D, '#ffb3d9', '#b5ddff', '#fff1a8'];
      back = c(24, 50, 8.5, mc[0]) + c(25, 39, 8, mc[1]) + c(32, 30, 7, mc[2]) + p(ear, m) + p(mirror(ear), m);
      front = p('M45.5 35L50 13L54.5 35Z', '#ffd76b');
      head = e(50, 58, 27, 25, m);
      det = ln('M46.5 29L53 27M47.5 23L52 21.5', '#e8a93a', 1.2) + c(40, 36, 5.5, mc[3]) + c(46, 34, 4.5, mc[1]) + e(50, 70, 11, 7, L);
      A.ey = 56; A.my = 70.5; A.by = 62; A.bx = 19; A.ty = 35; A.sx = 69; A.sy = 37; break;
    }
    case 'dragon': {
      const wing = 'M27 74Q7 66 8 44Q14 50 20 48Q16 57 30 64Z', horn = 'M35 37Q30 25 36 19Q37 28 42 33Z';
      back = p(wing, D) + p(mirror(wing), D) + p(horn, '#ffe7a8') + p(mirror(horn), '#ffe7a8');
      head = e(50, 58, 28, 24, m);
      det = c(46.5, 65, 1.1, P.ln) + c(53.5, 65, 1.1, P.ln) + p('M50 34l3 4h-6Z', D);
      A.ey = 56; A.my = 68.5; A.ty = 35; A.bellyStripes = true; break;
    }
    case 'axolotl': {
      const g = (x, y, a) => e(x, y, 8, 3.4, I, rot(a, x, y));
      back = g(17, 46, -30) + g(15, 56, 0) + g(17, 66, 30) + g(83, 46, 30) + g(85, 56, 0) + g(83, 66, -30);
      head = e(50, 59, 30, 22, m); det = c(50, 46, 1.5, D, ' opacity=".5"');
      A.ey = 57; A.ex = 13; A.my = 64; A.mouth = 'wide'; A.by = 63; A.bx = 21; A.ty = 37; A.hw = 30; A.hy = 59; break;
    }
    case 'alpaca': {
      back = e(31, 31, 4.5, 10, m, rot(-20, 31, 31)) + e(69, 31, 4.5, 10, m, rot(20, 69, 31));
      head = e(50, 60, 24, 23, m); front = c(38, 39, 8, L) + c(50, 34, 9, L) + c(62, 39, 8, L) + c(44, 42, 6, L) + c(56, 42, 6, L);
      det = e(50, 70, 10, 7, L) + p('M48 67.5h4l-2 2z', INK);
      A.ey = 59; A.ex = 9; A.my = 71.5; A.by = 65; A.bx = 15; A.ty = 28; A.sx = 68; A.sy = 34; A.hw = 25; A.hy = 60; A.alpacaBody = true; break;
    }
    case 'hedgehog': {
      let d = ''; const N = 13;
      for (let k = 0; k <= N; k++) { const a = Math.PI * (1.03 + k / N * .94), r = k % 2 ? 26 : 36; d += (k ? 'L' : 'M') + f(50 + Math.cos(a) * r * 1.05) + ' ' + f(60 + Math.sin(a) * r); }
      back = p(d + 'Z', D) + p('M14 62Q20 72 26 70L30 60Z', D) + p(mirror('M14 62Q20 72 26 70L30 60Z'), D);
      head = e(50, 61, 26, 21, m);
      det = c(31, 47, 3.5, I) + c(69, 47, 3.5, I) + e(50, 66, 8, 5.5, L) + c(50, 63.5, 2.2, INK);
      A.ey = 58; A.ex = 10; A.my = 68.5; A.mouth = 'w'; A.by = 63; A.bx = 17; A.ty = 31; A.sx = 70; A.sy = 32; A.hy = 60; A.hw = 33; break;
    }
  }
  if (A.my == null) A.my = A.ey + 7.5;
  if (A.by == null) A.by = A.ey + 5;
  let body = '';
  if (A.body) {
    const bf = A.bodyFill || m;
    body = p(A.alpacaBody ? 'M29 104Q29 82 50 80Q71 82 71 104Z' : BODY, bf);
    det = (A.bellyFill ? e(50, 99, 15, 12, A.bellyFill) : BELLY) + (A.bellyStripes ? ln('M42 92h16M41 97h18', P.d, 1.2, ' opacity=".6"') : '') + det;
  }
  A.sh = (o.extraBack || '') + back + body + head + front + (o.extraFront || '');
  A.det = det;
  return A;
}

/* ---------- face ---------- */
function face(A, ex, ink = INK, hl = '#fff') {
  const L = 50 - A.ex, R = 50 + A.ex, y = A.ey, my = A.my;
  const dot = (x, big) => e(x, y, big ? 3.5 : 3.1, big ? 4.3 : 3.7, ink) + c(x + 1.1, y - 1.4, big ? 1.4 : 1.15, hl);
  const hap = x => ln(`M${f(x - 3.4)} ${f(y + 1)}Q${f(x)} ${f(y - 4)} ${f(x + 3.4)} ${f(y + 1)}`, ink, 2.1);
  const slp = x => ln(`M${f(x - 3.4)} ${f(y - .3)}Q${f(x)} ${f(y + 3)} ${f(x + 3.4)} ${f(y - .3)}`, ink, 2.1);
  let eyes, mouth = '';
  const mt = A.mouth;
  const smile = () => mt === 'w' ? ln(`M46.3 ${f(my - .6)}Q48.2 ${f(my + 2)} 50 ${f(my - .3)}Q51.8 ${f(my + 2)} 53.7 ${f(my - .6)}`, ink, 1.7)
    : mt === 'wide' ? ln(`M42 ${f(my - 1)}Q50 ${f(my + 5)} 58 ${f(my - 1)}`, ink, 1.8) : ln(`M47.2 ${f(my - .6)}Q50 ${f(my + 2.4)} 52.8 ${f(my - .6)}`, ink, 1.8);
  switch (ex) {
    case 1: eyes = hap(L) + hap(R); mouth = mt === 'none' ? '' : p(`M46.4 ${f(my - 1)}Q50 ${f(my - 1.6)} 53.6 ${f(my - 1)}Q53 ${f(my + 4.6)} 50 ${f(my + 4.6)}Q47 ${f(my + 4.6)} 46.4 ${f(my - 1)}Z`, ink) + e(50, my + 2.8, 2, 1.3, '#ff7d95'); break;
    case 2: eyes = dot(L) + hap(R); mouth = mt === 'none' ? '' : smile() + e(51.2, my + 1.6, 1.4, 1.2, '#ff7d95'); break;
    case 3: eyes = dot(L, 1) + dot(R, 1); mouth = mt === 'none' ? '' : e(50, my + .6, 1.9, 2.3, ink); break;
    case 4: eyes = slp(L) + slp(R); mouth = mt === 'none' ? '' : e(50, my + .2, 1.5, 1.1, ink); break;
    default: eyes = dot(L) + dot(R); mouth = mt === 'none' ? '' : smile();
  }
  const k = A.cheekR || 1;
  const blush = e(50 - A.bx, A.by, 4.6 * k, 2.8 * k, '#ff7d9c', ' opacity=".45"') + e(50 + A.bx, A.by, 4.6 * k, 2.8 * k, '#ff7d9c', ' opacity=".45"');
  return blush + eyes + mouth;
}

/* ---------- accessories ---------- */
function accessory(a, A, col, P) {
  const s = ` stroke="${P.ln}" stroke-width="1.6" stroke-linejoin="round"`, ty = A.ty;
  switch (ACCS[a]) {
    case 'ribbon': return `<g transform="translate(${A.sx} ${A.sy}) rotate(-15)"${s}>${p('M0 0L-10-6.5Q-12.5 0-10 6.5ZM0 0L10-6.5Q12.5 0 10 6.5Z', col)}${c(0, 0, 2.8, col)}</g>`;
    case 'flower': { let g = ''; for (let k = 0; k < 5; k++) { const t = k * 1.2566 - 1.57; g += c(Math.cos(t) * 4.4, Math.sin(t) * 4.4, 3.6, '#fff'); } return `<g transform="translate(${A.sx} ${A.sy})"${s}>${g}${c(0, 0, 2.8, col)}</g>`; }
    case 'beret': return `<g transform="translate(50 ${ty + 1}) rotate(-10)"${s}>${c(0, -7.5, 2.2, col)}${e(0, 0, 19, 6.8, col)}</g>`;
    case 'sprout': return ln(`M50 ${ty + 2}V${ty - 7}`, '#59a84a', 2) + `<g${s.replace(P.ln, '#59a84a')}>${e(44.5, ty - 8.5, 5.5, 2.8, '#8fd16f', rot(-25, 44.5, ty - 8.5))}${e(55.5, ty - 8.5, 5.5, 2.8, '#8fd16f', rot(25, 55.5, ty - 8.5))}</g>`;
    case 'phones': { const x1 = 50 - A.hw, x2 = 50 + A.hw, y = A.hy; return ln(`M${f(x1 + 1)} ${f(y - 4)}C${f(x1 + 1)} ${f(ty - 14)} ${f(x2 - 1)} ${f(ty - 14)} ${f(x2 - 1)} ${f(y - 4)}`, P.ln, 5.2) + ln(`M${f(x1 + 1)} ${f(y - 4)}C${f(x1 + 1)} ${f(ty - 14)} ${f(x2 - 1)} ${f(ty - 14)} ${f(x2 - 1)} ${f(y - 4)}`, col, 2.6) + `<g${s}><rect x="${f(x1 - 5)}" y="${f(y - 9)}" width="10" height="17" rx="5" fill="${col}"/><rect x="${f(x2 - 5)}" y="${f(y - 9)}" width="10" height="17" rx="5" fill="${col}"/></g>`; }
    case 'glasses': { const L = 50 - A.ex, R = 50 + A.ex, y = A.ey, r = Math.min(7.2, A.ex - 2); return `<g fill="#fff" fill-opacity=".25" stroke="#5b4663" stroke-width="1.7">${c(L, y, r, '#fff')}${c(R, y, r, '#fff')}</g>` + ln(`M${f(L + r)} ${f(y - 1)}Q50 ${f(y - 3)} ${f(R - r)} ${f(y - 1)}`, '#5b4663', 1.7); }
    case 'starclip': return `<path d="${star5(A.sx, A.sy, 6.5, .5)}" fill="#ffd34d"${s}/>` + c(A.sx - 1.4, A.sy - 1.4, 1.1, '#fff', ' opacity=".8"');
    case 'chef': return `<g transform="translate(50 ${ty + 1})"${s}>${c(-9, -12, 7, '#fff')}${c(9, -12, 7, '#fff')}${c(0, -16, 8.5, '#fff')}<rect x="-12" y="-8" width="24" height="9" rx="2.5" fill="#fff"/></g>`;
    case 'witch': return `<g transform="translate(50 ${ty + 1}) rotate(-8)"${s}>${e(0, 0, 21, 5, '#6b4c9a')}${p('M-12-2Q-7-17 3-30Q6-31 7-28Q8-14 12-2Z', '#7d5bb0')}${p('M-11.3-5.5Q0-8 11.3-5.5L11.8-2Q0-4.5-11.8-2Z', col)}</g>` + `<path d="${star5(55, ty - 12, 2.6)}" fill="#ffd34d"/>`;
    case 'party': return `<g transform="translate(57 ${ty + 1}) rotate(16)"${s}>${p('M-9 0L0-24L9 0Q0 3-9 0Z', col)}${ln('M-5.5-9L3.5-12M-3-17L2-18.5', '#fff', 1.6)}${c(0, -25, 3.3, '#fff')}</g>`;
    case 'scarf': { const y = A.ny; return `<g${s}>${p(`M27 ${y - 4}Q50 ${y + 6} 73 ${y - 4}L74 ${y + 3}Q50 ${y + 13} 26 ${y + 3}Z`, col)}${p(`M60 ${y + 3}L67 ${y + 2}L70 ${y + 16}L62 ${y + 17}Z`, col)}</g>` + ln(`M30 ${y + .5}Q50 ${y + 9} 70 ${y + .5}`, '#fff', 1.2, ' opacity=".6" stroke-dasharray="2 3"'); }
    case 'bowtie': return `<g transform="translate(50 ${A.ny + 1})"${s}>${p('M0 0L-9-5.5Q-10.5 0-9 5.5ZM0 0L9-5.5Q10.5 0 9 5.5Z', col)}${c(0, 0, 2.4, col)}</g>`;
  }
  return '';
}
const HAT = { beret: 1, sprout: 1, chef: 1, witch: 1, party: 1, phones: 1 };

/* ---------- regal pieces ---------- */
const crown = (x, y, s, gold, gem) => `<g transform="translate(${f(x)} ${f(y)}) scale(${s})"><path d="M-14 0L-16-15L-7-7L0-19L7-7L16-15L14 0Z" fill="${gold}" stroke="#b07a12" stroke-width="1.4" stroke-linejoin="round"/><rect x="-14" y="-3" width="28" height="4" rx="1.5" fill="${gold}" stroke="#b07a12" stroke-width="1.2"/>${c(0, -8, 2.6, gem || '#ff5c8a', ' stroke="#fff" stroke-width=".8"')}${c(-8.5, -4.5, 1.6, '#6cc4ff')}${c(8.5, -4.5, 1.6, '#6cc4ff')}${c(-16, -15, 1.7, '#fff6c8')}${c(16, -15, 1.7, '#fff6c8')}${c(0, -19.5, 1.9, '#fff6c8')}</g>`;
const tiara = (x, y, gold, gem) => `<g transform="translate(${f(x)} ${f(y)})"><path d="M-15 2Q0-6 15 2L13 4Q0-2-13 4Z" fill="${gold}" stroke="#b07a12" stroke-width="1"/><path d="M-9-1L-7-8L-4-2.5L0-12L4-2.5L7-8L9-1Q0-4-9-1Z" fill="${gold}" stroke="#b07a12" stroke-width="1" stroke-linejoin="round"/>${p('M0-9.5L2.4-6L0-2.5L-2.4-6Z', gem)}${c(-7, -8, 1.3, '#fff')}${c(7, -8, 1.3, '#fff')}</g>`;
const cape = (col, dk, gold) => p('M12 106Q14 76 50 76Q86 76 88 106Z', col, ` stroke="${dk}" stroke-width="1.6"`) + p('M28 84Q50 96 72 84L74 90Q50 102 26 90Z', gold, ' stroke="#b07a12" stroke-width="1"') + c(50, 93, 3, '#ff5c8a', ' stroke="#fff6c8" stroke-width="1"');

/* ---------- animation helpers ---------- */
const twk = (x, y, s, col, still, dur, beg) => still ? `<path d="${star4(x, y, s)}" fill="${col}"/>`
  : `<g transform="translate(${f(x)} ${f(y)})"><path d="${star4(0, 0, s)}" fill="${col}"><animateTransform attributeName="transform" type="scale" values="1;.25;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.2;1" dur="${dur}s" begin="-${beg}s" repeatCount="indefinite"/></path></g>`;

/* ---------- character assembly ---------- */
function charLayer(A, P, faceStr, acc, outlineW = 4.4) {
  return `<use href="#@@c" stroke="${P.ln}" stroke-width="${outlineW}" stroke-linejoin="round"/><g id="@@c">${A.sh}</g>${A.det}${faceStr}${acc}`;
}
const svgOpen = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">`;

function buildStd(id, still) {
  const t = TR[id], P = PAL[t.pal], r = t.r, rng = mulberry(id * 7919 + 13);
  const hat = t.acc >= 0 && HAT[ACCS[t.acc]];
  const A = species(t.sp, P, { hat: hat || r === 'SSR' });
  const col = ACOL[(id * 5 + t.sp) % ACOL.length];
  const acc = t.acc >= 0 ? accessory(t.acc, A, col, P) : '';
  const fc = face(A, t.ex);
  let bg = '', defs = '', frame = '', pre = '', post = '';
  if (r === 'N') {
    bg = `<rect width="100" height="100" rx="24" fill="#fffafc"/>${c(50, 50, 46, BGC[t.bg])}${c(50, 50, 37, '#fff', ' opacity=".35"')}`;
  } else if (r === 'R') {
    const pc = '#fff', pats = [
      `<pattern id="@@p" width="12" height="12" patternUnits="userSpaceOnUse">${c(3, 3, 1.9, pc)}${c(9, 9, 1.9, pc)}</pattern>`,
      `<pattern id="@@p" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="4.5" height="10" fill="${pc}"/></pattern>`,
      `<pattern id="@@p" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${pc}"/><rect x="8" y="8" width="8" height="8" fill="${pc}"/></pattern>`,
      `<pattern id="@@p" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M4 6.5C4 4.5 1 4.5 1 6.6C1 8.5 4 10 4 10S7 8.5 7 6.6C7 4.5 4 4.5 4 6.5ZM12 14.5C12 12.5 9 12.5 9 14.6C9 16.5 12 18 12 18S15 16.5 15 14.6C15 12.5 12 12.5 12 14.5Z" fill="${pc}"/></pattern>`];
    defs = pats[t.pat];
    bg = `<rect width="100" height="100" rx="24" fill="${BGC[t.bg]}"/><rect width="100" height="100" rx="24" fill="url(#@@p)" opacity=".55"/>${c(50, 54, 36, '#fff', ' opacity=".4"')}`;
  } else if (r === 'SR') {
    const b = SRBG[t.bg];
    defs = `<radialGradient id="@@g" cx=".5" cy=".45" r=".6"><stop offset=".25" stop-color="#fff"/><stop offset="1" stop-color="${b}"/></radialGradient><linearGradient id="@@s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#b9c2d9"/><stop offset=".55" stop-color="#f4f6ff"/><stop offset="1" stop-color="#8f9ab8"/></linearGradient><clipPath id="@@k"><circle cx="50" cy="50" r="44.5"/></clipPath>`;
    bg = `<rect width="100" height="100" rx="24" fill="${b}"/>${c(50, 50, 46, 'url(#@@g)')}`;
    const spots = [[17, 26, 5.5], [83, 22, 4.6], [87, 60, 5], [13, 62, 3.8], [27, 12, 3], [72, 11, 3.2], [50, 9, 2.4], [20, 44, 2.2], [80, 42, 2.4]];
    for (const [x, y, s] of spots) bg += `<path d="${star4(x, y, s)}" fill="${rng() < .5 ? '#fff' : '#ffd54a'}" stroke="#fff" stroke-width=".6"/>`;
    for (let k = 0; k < 8; k++) bg += c(8 + rng() * 84, 8 + rng() * 50, .7 + rng() * .7, '#fff');
    pre = '<g clip-path="url(#@@k)">'; post = '</g>';
    frame = `<circle cx="50" cy="50" r="45.5" fill="none" stroke="url(#@@s)" stroke-width="3"/><circle cx="50" cy="50" r="43.4" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/>` + `<path d="${star4(50, 4.6, 3.2)}" fill="#fff" stroke="#9aa5c4" stroke-width=".6"/>`;
  } else { // SSR
    const J = JEWEL[t.bg];
    defs = `<radialGradient id="@@g" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="${J[0]}"/><stop offset=".6" stop-color="${J[1]}"/><stop offset="1" stop-color="${J[2]}"/></radialGradient><linearGradient id="@@o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset=".3" stop-color="#e9b530"/><stop offset=".5" stop-color="#fff3b8"/><stop offset=".75" stop-color="#c88a12"/><stop offset="1" stop-color="#ffe58a"/></linearGradient><clipPath id="@@k"><rect x="5" y="5" width="90" height="90" rx="19"/></clipPath>`;
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@g)"/>` + c(50, 52, 34, '#fff', ' opacity=".14"') + c(50, 52, 25, '#fff', ' opacity=".14"');
    for (let k = 0; k < 12; k++) { const x = 9 + rng() * 82, y = 9 + rng() * 60; bg += k < 5 ? twk(x, y, 1.6 + rng() * 2.4, k % 2 ? '#fff' : '#ffe58a', still, 1.6 + rng() * 1.6, f(rng() * 2)) : c(x, y, .5 + rng() * .8, '#fff', ' opacity=".8"'); }
    pre = '<g clip-path="url(#@@k)">' + cape(J[1], J[2], 'url(#@@o)'); post = '</g>';
    const gem = (x, y, col, s = 3) => p(`M${x} ${y - s}L${x + s * .8} ${y}L${x} ${y + s}L${x - s * .8} ${y}Z`, col, ' stroke="#fff6c8" stroke-width=".9"');
    frame = `<rect x="3.2" y="3.2" width="93.6" height="93.6" rx="21" fill="none" stroke="url(#@@o)" stroke-width="4.4"/><rect x="6.6" y="6.6" width="86.8" height="86.8" rx="18" fill="none" stroke="#ffe9a3" stroke-width=".7"/>`
      + gem(50, 3.4, '#ff4f86', 3.6) + gem(50, 96.6, '#ff4f86', 3.2) + gem(3.4, 50, '#5cc0ff') + gem(96.6, 50, '#5cc0ff') + c(10, 10, 2.2, '#7af0c6', ' stroke="#fff6c8" stroke-width=".8"') + c(90, 10, 2.2, '#7af0c6', ' stroke="#fff6c8" stroke-width=".8"') + c(10, 90, 2.2, '#c99bff', ' stroke="#fff6c8" stroke-width=".8"') + c(90, 90, 2.2, '#c99bff', ' stroke="#fff6c8" stroke-width=".8"');
    const head = t.cos === 1 ? tiara(50, A.ty + 1, 'url(#@@o)', J[0]) : crown(50, A.ty + 2, t.cos === 2 ? .8 : .95, 'url(#@@o)', J[0]);
    return `${defs ? '<defs>' + defs + '</defs>' : ''}${bg}${pre}${charLayer(A, P, fc, head)}${post}${frame}`;
  }
  return `${defs ? '<defs>' + defs + '</defs>' : ''}${bg}${pre}${charLayer(A, P, fc, acc)}${post}${frame}`;
}

/* ---------- speed reward builder ---------- */
const medalP = (y, fill, rim, rib) => `<g>${p(`M43 ${y - 12}L47 ${y}L53 ${y}L57 ${y - 12}L52 ${y - 12}L50 ${y - 6}L48 ${y - 12}Z`, rib, ' stroke="#fff" stroke-width=".8"')}${c(50, y + 5, 7.2, fill, ` stroke="${rim}" stroke-width="1.6"`)}<path d="${star5(50, y + 5, 3.6)}" fill="#fff" opacity=".9"/></g>`;
const boltP = (x, y, s) => `<path transform="translate(${f(x)} ${f(y)}) scale(${s})" d="M2-12-7 2h6l-2 10 9-14H0z" fill="#ffd23d" stroke="#e08a12" stroke-width="1.2" stroke-linejoin="round"/>`;
function spProp(t, A, P, still) {
  const ty = A.ty, ny = A.ny, hw = A.hw;
  const band = (col, y = ty + 9) => p(`M${f(50 - hw + 1)} ${f(y + 3)}Q50 ${f(y - 5)} ${f(50 + hw - 1)} ${f(y + 3)}L${f(50 + hw - 1.5)} ${f(y + 9)}Q50 ${f(y + 1)} ${f(50 - hw + 1.5)} ${f(y + 9)}Z`, col, ` stroke="${P.ln}" stroke-width="1.4"`);
  switch (t.prop) {
    case 'net': return { front: ln('M74 98L90 46', '#b07a4a', 3) + c(91, 33, 11, '#fff', ' fill-opacity=".55" stroke="#8a8aa8" stroke-width="1.8"') + ln('M82 30h18M85 24l12 12M84 39l13-13M91 22v22', '#b9b9cf', .9) + `<g transform="translate(91 34) scale(.42)">${e(0, 2, 7, 6.5, '#ff6b6b')}${c(0, -5, 3.6, '#43385a')}${c(-2.6, 1, 1.6, '#7a2a3a')}${c(2.6, 3, 1.4, '#7a2a3a')}</g>` };
    case 'paint': return { front: `<g transform="translate(50 ${ty + 1}) rotate(-10)" stroke="${P.ln}" stroke-width="1.6">${c(0, -7.5, 2.2, '#7a5cff')}${e(0, 0, 19, 6.8, '#7a5cff')}</g>` + p('M8 92Q6 80 18 80Q30 80 28 90Q26 96 20 94Q16 92 14 96Q10 99 8 92Z', '#fff4e0', ' stroke="#c99a5a" stroke-width="1.4"') + c(14, 85, 2.4, '#ff6b9a') + c(20, 84, 2.4, '#4fb6ff') + c(25, 88, 2.2, '#ffd23d') + c(18, 90, 2, '#7ad67a') };
    case 'swirl': return { front: ln('M86 98V66', '#fff', 3) + c(86, 56, 11, '#ff8fb6', ' stroke="#fff" stroke-width="1.5"') + ln('M86 56m-7 0a7 7 0 1 1 7 7a4.5 4.5 0 1 1-4.5-4.5a2.4 2.4 0 1 1 2.4 2.4', '#fff', 2.2) };
    case 'spot': return { back: p('M38 -4L62 -4L92 100L8 100Z', '#fff8c8', ' opacity=".35"'), front: twk(16, 30, 3.6, '#fff6c9', still, 1.8, .2) + twk(84, 22, 3, '#fff', still, 2.2, .7) + twk(80, 70, 2.6, '#ffe58a', still, 1.6, 1.1) };
    case 'fruit': return { front: `<g transform="translate(50 ${f(ty - 3)}) scale(.62)">${p('M0-7c7-4 14 1 13 9-1 8-7 14-13 16-6-2-12-8-13-16-1-8 6-13 13-9z', '#ff5a6e', ` stroke="${P.ln}" stroke-width="2"`)}${p('M-7-11c3 1 4 3 7 4 3-1 4-3 7-4-1 4-4 6-7 6s-6-2-7-6z', '#4fbf6a')}${c(-4, 1, 1.2, '#ffe08a')}${c(3, 0, 1.2, '#ffe08a')}${c(0, 6, 1.2, '#ffe08a')}</g>` };
    case 'tophat': return { front: `<g transform="translate(50 ${ty + 2})" stroke="${P.ln}" stroke-width="1.5">${e(0, 0, 17, 4.5, '#3a3150')}<rect x="-10" y="-20" width="20" height="20" rx="3" fill="#3a3150"/><rect x="-10" y="-7" width="20" height="4" fill="#ff6b9a"/></g>` + `<g transform="translate(80 86) rotate(14)">${['#fff', '#fff', '#fff'].map((col, k) => `<rect x="-6" y="-9" width="12" height="17" rx="2" fill="${col}" stroke="#c8bfe0" stroke-width="1" transform="rotate(${-20 + k * 20} 0 8)"/>`).join('')}<text x="0" y="3" font-size="9" font-family="Fredoka,Arial" font-weight="700" fill="#ff5a7a" text-anchor="middle" transform="rotate(20 0 8)">4</text></g>` };
    case 'sparkle': return { front: [[14, 24, 4], [86, 20, 3.4], [88, 66, 3], [12, 70, 2.6], [70, 10, 2.4]].map(([x, y, z], k) => twk(x, y, z, k % 2 ? '#fff' : '#e8e2ff', still, 1.6 + k * .3, k * .4)).join('') };
    case 'icecrown': return { front: `<g transform="translate(50 ${ty + 2})">${p('M-14 0L-15-12L-7-6L0-16L7-6L15-12L14 0Z', '#dff4ff', ' stroke="#5aa8e8" stroke-width="1.4" stroke-linejoin="round"')}${c(0, -6, 2.4, '#8fd3ff')}</g>` + ln('M14 30l6 6M14 36l6-6M17 29v8M84 70l6 6M84 76l6-6M87 69v8', '#fff', 1.4) };
    case 'headband': return { front: band('#ff5a6e') + ln(`M${f(50 - hw + 3)} ${f(ty + 13)}Q50 ${f(ty + 6)} ${f(50 + hw - 3)} ${f(ty + 13)}`, '#fff', 1.6) + p(`M${f(50 + hw - 2)} ${f(ty + 12)}l10 -3l-3 7z`, '#ff5a6e', ` stroke="${P.ln}" stroke-width="1.2"`) };
    case 'goggles': return { front: band('#4f6bd8', ty + 6) + `<g stroke="${P.ln}" stroke-width="1.4">${c(41, ty + 11, 6.5, '#bfe8ff')}${c(59, ty + 11, 6.5, '#bfe8ff')}</g>` + c(39, ty + 9, 1.8, '#fff') + c(57, ty + 9, 1.8, '#fff') };
    case 'helmet': return { front: p(`M${f(50 - hw - 1)} ${f(ty + 16)}Q${f(50 - hw)} ${f(ty - 10)} 50 ${f(ty - 11)}Q${f(50 + hw)} ${f(ty - 10)} ${f(50 + hw + 1)} ${f(ty + 16)}Z`, '#ff5a6e', ` stroke="${P.ln}" stroke-width="1.6"`) + p(`M${f(50 - hw)} ${f(ty + 12)}H${f(50 + hw)}V${f(ty + 17)}H${f(50 - hw)}Z`, '#fff', ` stroke="${P.ln}" stroke-width="1.2"`) + ln(`M50 ${f(ty - 10)}V${f(ty + 12)}`, '#fff', 3.2) + boltP(64, ty, .55) };
    case 'champion': return { back: p('M14 106Q16 74 50 74Q84 74 86 106Z', '#ff8fc7', ' stroke="#d05a9a" stroke-width="1.6"') + boltP(18, 86, .7) + boltP(82, 86, .7), front: medalP(ny + 2, '#ffd23d', '#d4920f', '#ff5a7a') };
    case 'watch': return { front: `<g transform="translate(80 84)">${c(0, 0, 10, '#fff', ' stroke="#ff8a3d" stroke-width="2.4"')}<rect x="-2.5" y="-15" width="5" height="4" rx="1.4" fill="#ff8a3d"/>${ln('M0 0V-6M0 0l4 2', '#43385a', 1.6)}${c(0, 0, 1.4, '#43385a')}</g>` };
    case 'bronze': return { front: medalP(ny + 2, '#e8a56a', '#a95f2e', '#5aa0e6') };
    case 'gold': return { front: medalP(ny + 2, '#ffd23d', '#d4920f', '#e85d75') + twk(68, ny + 2, 2.6, '#fff', still, 1.6, .3) };
    case 'flame': return { front: band('#ff7a3d') + `<path transform="translate(50 ${f(ty - 1)})" d="M0-14c4 4 7 7 7 11a7 7 0 0 1-14 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 2-8z" fill="#ff8a4c" stroke="${P.ln}" stroke-width="1.2"/><path transform="translate(50 ${f(ty - 1)})" d="M0-4c1.8 1.8 3 3 3 5a3 3 0 0 1-6 0c0-1.3.8-2.4 1.4-2.9z" fill="#ffd36b"/>` };
    case 'sneak': return { back: ln('M2 60h14M0 70h12M4 80h12', '#fff', 3, ' opacity=".8"'), front: `<g transform="translate(78 92) scale(.5)">${SHOE_P}</g>` + `<g transform="translate(20 92) scale(.5) scale(-1 1)">${SHOE_P}</g>` };
    case 'wind': return { back: ln('M0 46h20M0 56h14M2 66h18', '#fff', 3, ' opacity=".85"'), front: p(`M30 ${ny - 3}Q50 ${ny + 6} 70 ${ny - 3}L71 ${ny + 3}Q50 ${ny + 12} 29 ${ny + 3}Z`, '#ff5a6e', ` stroke="${P.ln}" stroke-width="1.4"`) + p(`M31 ${ny + 1}Q14 ${ny - 2} 4 ${ny - 10}L6 ${ny - 2}Q16 ${ny + 6} 30 ${ny + 5}Z`, '#ff5a6e', ` stroke="${P.ln}" stroke-width="1.2"`) };
    case 'nums': return { front: [[16, 28, 1, '#ff8fb6'], [80, 38, 2, '#ffd23d'], [86, 64, 3, '#8fd3ff'], [14, 66, 4, '#9fe0b4']].map(([x, y, n, col]) => `<g>${c(x, y, 7, col, ' stroke="#fff" stroke-width="1.5"')}<text x="${x}" y="${y + 3.4}" font-size="10" font-family="Fredoka,Arial" font-weight="700" fill="#fff" text-anchor="middle">${n}</text>${still ? '' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" dur="${1.4 + n * .2}s" repeatCount="indefinite"/>`}</g>`).join('') };
    case 'bolt': return { front: boltP(84, 26, 1) + boltP(16, 70, .7) };
  }
  return {};
}
const SHOE_P = '<path d="M-20 4c0-8 4-14 8-18l6 4 6-10c6 2 10 8 14 12 6 2 12 4 12 10v4h-46z" fill="#ff8f6b" stroke="#c45a3a" stroke-width="2"/><path d="M-20 8h46v4a4 4 0 0 1-4 4h-38a4 4 0 0 1-4-4z" fill="#fff" stroke="#c45a3a" stroke-width="2"/>';
function buildSP(id, still) {
  const t = TR[id], P = PAL[t.pal];
  const A = species(t.sp, P, { hat: 1 });
  const pr = spProp(t, A, P, still);
  const defs = `<linearGradient id="@@g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient><linearGradient id="@@o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb84d"/><stop offset=".5" stop-color="#ff6b8a"/><stop offset="1" stop-color="#a77be0"/></linearGradient><clipPath id="@@k"><rect x="4" y="4" width="92" height="92" rx="20"/></clipPath>`;
  let bg = `<rect width="100" height="100" rx="24" fill="url(#@@g)"/>` + c(50, 54, 38, '#fff', ' opacity=".28"');
  for (let k = 0; k < 6; k++) { const y = 14 + k * 14; bg += ln(`M${4 + (k % 3) * 4} ${y}h${10 + (k * 7) % 12}`, '#fff', 2.2, ' opacity=".6"'); }
  const frame = `<rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#@@o)" stroke-width="4.4"/>` + `<g transform="translate(86 14)">${c(0, 0, 8.5, '#fff', ' stroke="#ff8a3d" stroke-width="1.6"')}${boltP(0, .5, .62)}</g>`;
  return `<defs>${defs}</defs>${bg}<g clip-path="url(#@@k)">${pr.back || ''}${charLayer(A, P, face(A, t.ex), pr.front || '')}</g>${frame}`;
}

/* ---------- UR compositions ---------- */
const HOLO = ['#ff7eb6', '#ffd36e', '#8cffc1', '#7ed8ff', '#b78cff', '#ff7eb6'];
function urCommon(still, rng, cfg) {
  const holo = `<linearGradient id="@@h" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">${HOLO.map((h, i) => `<stop offset="${f(i / 5)}" stop-color="${h}"/>`).join('')}${still ? '' : '<animateTransform attributeName="gradientTransform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite"/>'}</linearGradient>`
    + `<radialGradient id="@@w"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="${cfg.glow}" stop-opacity=".55"/><stop offset="1" stop-color="${cfg.glow}" stop-opacity="0"/></radialGradient>`
    + `<linearGradient id="@@o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8d0"/><stop offset=".35" stop-color="#f2be3a"/><stop offset=".55" stop-color="#fff4c0"/><stop offset="1" stop-color="#d0901a"/></linearGradient>`
    + `<clipPath id="@@k"><rect x="5" y="5" width="90" height="90" rx="19"/></clipPath>`;
  const glow = `<circle cx="50" cy="${cfg.gy || 54}" r="40" fill="url(#@@w)">${still ? '' : '<animate attributeName="opacity" values=".75;1;.75" dur="2.4s" repeatCount="indefinite"/>'}</circle>`;
  let parts = '';
  for (let k = 0; k < (cfg.np || 9); k++) { const x = 10 + rng() * 80, y = 10 + rng() * 80; parts += twk(x, y, 1.6 + rng() * 2.6, k % 3 ? '#fff' : '#ffe9a0', still, 1.4 + rng() * 1.8, f(rng() * 2.5)); }
  const gem = (x, y, col) => `<path d="M${x} ${y - 3.4}L${x + 2.8} ${y}L${x} ${y + 3.4}L${x - 2.8} ${y}Z" fill="${col}" stroke="#fff" stroke-width=".9"/>`;
  const frame = `<rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#@@o)" stroke-width="5.2"/><rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#@@h)" stroke-width="3.2"/><rect x="6.8" y="6.8" width="86.4" height="86.4" rx="17.5" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/>`
    + gem(50, 3, '#ff4f86') + gem(50, 97, '#7a5cff') + gem(3, 50, '#3ec6ff') + gem(97, 50, '#3ec6ff')
    + [[9, 9], [91, 9], [9, 91], [91, 91]].map(([x, y]) => `<path d="${star4(x, y, 4.6)}" fill="#fff" stroke="#f2be3a" stroke-width=".7"/>`).join('');
  return { holo, glow, parts, frame };
}
const spin = (still, dur, cx = 50, cy = 50, rev) => still ? '' : `<animateTransform attributeName="transform" type="rotate" from="${rev ? 360 : 0} ${cx} ${cy}" to="${rev ? 0 : 360} ${cx} ${cy}" dur="${dur}s" repeatCount="indefinite"/>`;
const bob = (still, amp = 1.6, dur = 3) => still ? '' : `<animateTransform attributeName="transform" type="translate" values="0 0;0 -${amp};0 0" dur="${dur}s" repeatCount="indefinite"/>`;
const rays = (n, col, op, len = 70, w = .12) => { let d = ''; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = a + w; d += `M50 50L${f(50 + Math.cos(a) * len)} ${f(50 + Math.sin(a) * len)}L${f(50 + Math.cos(b) * len)} ${f(50 + Math.sin(b) * len)}Z`; } return p(d, col, ` opacity="${op}"`); };
const featherWing = (side, col, ln) => { // feathered angel wing; side -1 left
  const m = d => side < 0 ? d : mirror(d);
  return p(m('M34 70Q14 74 6 58Q4 46 10 34Q14 42 20 44Q16 36 18 26Q24 36 30 40Q30 32 34 26Q38 40 40 58Z'), col);
};

function buildUR(u, still) {
  const rng = mulberry(9001 + u * 77);
  let defs = '', bg = '', back = '', out = '';
  if (u === 0) { // 星詠みドラゴン
    const P = { k: 'ur', m: '#9a98f7', l: '#ecebff', d: '#6b63d6', ln: '#3e388f', in: '#ffb8e0' };
    const C = urCommon(still, rng, { glow: '#b9a8ff', np: 10 });
    defs = C.holo + `<radialGradient id="@@b" cx=".5" cy=".38" r=".8"><stop offset="0" stop-color="#6a4ccf"/><stop offset=".55" stop-color="#2a1a6e"/><stop offset="1" stop-color="#0d0a2e"/></radialGradient><radialGradient id="@@n" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8fd6" stop-opacity=".55"/><stop offset="1" stop-color="#ff8fd6" stop-opacity="0"/></radialGradient><linearGradient id="@@v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7b8ff"/><stop offset="1" stop-color="#7a6cf0"/></linearGradient><radialGradient id="@@m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6ff0ff" stop-opacity=".45"/><stop offset="1" stop-color="#6ff0ff" stop-opacity="0"/></radialGradient>`;
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@b)"/>` + e(26, 30, 30, 18, 'url(#@@n)', rot(-20, 26, 30)) + e(76, 70, 28, 16, 'url(#@@m)', rot(-20, 76, 70));
    for (let k = 0; k < 26; k++) bg += c(6 + rng() * 88, 6 + rng() * 88, .35 + rng() * .7, '#fff', ` opacity="${f(.4 + rng() * .6)}"`);
    bg += ln('M14 22L24 16L32 24L28 34M70 14L80 20L88 16M78 34L86 40', '#d9d2ff', .6, ' opacity=".7"') + [[14, 22], [24, 16], [32, 24], [28, 34], [70, 14], [80, 20], [88, 16], [78, 34], [86, 40]].map(([x, y]) => c(x, y, 1.1, '#fff')).join('');
    // star halo ring
    let ring = ''; for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; ring += `<path d="${star5(50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38, k % 3 ? 2 : 3.2)}" fill="${k % 3 ? '#fff4c0' : '#ffd24d'}"/>`; }
    back = C.glow + `<g opacity=".95">${ring}${spin(still, 30)}</g>` + `<circle cx="50" cy="50" r="38" fill="none" stroke="#ffe79a" stroke-width=".5" stroke-dasharray="1.5 2.5" opacity=".8"/>`;
    const wing = 'M30 72Q4 70 2 40Q8 46 12 44Q6 34 10 22Q18 34 22 34Q20 26 24 20Q30 34 34 46Q40 58 38 68Z';
    const vein = 'M10 42Q18 50 28 58M10 24Q18 38 27 50M24 22Q27 34 31 44';
    const wings = p(wing, 'url(#@@v)') + p(mirror(wing), 'url(#@@v)') + ln(vein, '#ffe39a', 1.1) + ln(mirror(vein), '#ffe39a', 1.1);
    const A = species(18, P, { extraBack: wings, hat: 1 });
    A.det = A.det
      + `<path d="${star5(50, 96, 4.5)}" fill="#ffd24d" stroke="#fff" stroke-width=".6"/>` + c(42, 88, .9, '#fff') + c(58, 90, 1.1, '#fff') + c(62, 84, .7, '#fff');
    const fc = face(A, 1, '#2d2366');
    const cr = crown(50, A.ty + 1, .95, 'url(#@@o)', '#6ff0ff');
    // star-tipped wand floating at right
    const wand = `<g>${ln('M90 94L81 74', '#ffe08a', 2.2)}<path d="${star5(80, 70, 5.5)}" fill="#ffd24d" stroke="#fff" stroke-width="1"/>${bob(still, 2, 2.6)}</g>`;
    out = `<g clip-path="url(#@@k)">${back}<g>${charLayer(A, P, fc, cr)}${bob(still, 1.2, 3.4)}</g>${wand}${C.parts}</g>${C.frame}`;
  } else if (u === 1) { // 虹のユニコーン
    const P = { k: 'ur', m: '#fff3f9', l: '#ffffff', d: '#ffd3ea', ln: '#a774cf', in: '#ffb3d1' };
    const C = urCommon(still, rng, { glow: '#ffd6f2', np: 9 });
    defs = C.holo + `<linearGradient id="@@b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8fca"/><stop offset=".5" stop-color="#b28cff"/><stop offset="1" stop-color="#6fc2ff"/></linearGradient><linearGradient id="@@v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e3d2ff"/></linearGradient><linearGradient id="@@a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8cffd9" stop-opacity="0"/><stop offset=".5" stop-color="#8cffd9" stop-opacity=".7"/><stop offset="1" stop-color="#8cffd9" stop-opacity="0"/>${still ? '' : '<animate attributeName="x1" values="-1;0;-1" dur="6s" repeatCount="indefinite"/>'}</linearGradient>`;
    const rb = ['#ff8a9e', '#ffc46b', '#fff27a', '#8ef0a8', '#7ec8ff', '#b89aff'];
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@b)"/>` + p('M-5 30Q30 10 60 26T110 22V40Q80 30 55 44T-5 46Z', 'url(#@@a)');
    bg += rb.map((col, i) => ln(`M${4 + i * 3.4} 74A${46 - i * 3.4} ${46 - i * 3.4} 0 0 1 ${96 - i * 3.4} 74`, col, 3.4, ' opacity=".85"')).join('');
    bg += `<g fill="#fff">${c(12, 88, 10, '#fff')}${c(24, 92, 9, '#fff')}${c(80, 90, 11, '#fff')}${c(92, 84, 8, '#fff')}</g>`;
    back = C.glow + `<ellipse cx="50" cy="13" rx="15" ry="4" fill="none" stroke="#ffe27a" stroke-width="2.4"/><ellipse cx="50" cy="13" rx="15" ry="4" fill="none" stroke="#fff" stroke-width=".8"/>` + `<g opacity=".7">${rays(16, '#fff', .35, 70, .1)}${spin(still, 24)}</g>`;
    const uv = 'M10 36Q18 46 28 52M18 28Q23 40 31 46';
    const wings = featherWing(-1, 'url(#@@v)') + featherWing(1, 'url(#@@v)') + ln(uv, '#c9a8ff', 1.1) + ln(mirror(uv), '#c9a8ff', 1.1);
    const A = species(17, P, { extraBack: wings, hat: 1 });
    // rainbow mane override
    A.sh = A.sh.replace(/fill="#ffd3ea"/, 'fill="#ff9fc0"').replace(/fill="#ffb3d9"/, 'fill="#ffd27a"').replace(/fill="#b5ddff"/, 'fill="#8fd8ff"');
    A.det = A.det.replace('fill="#fff1a8"', 'fill="#b89aff"');
    const fc = face(A, 2, '#4a2f63');
    const fl = (x, y, col) => { let g = ''; for (let k = 0; k < 5; k++) { const t = k * 1.2566 - 1.57; g += c(x + Math.cos(t) * 2.8, y + Math.sin(t) * 2.8, 2.3, col); } return g + c(x, y, 1.6, '#ffe27a'); };
    const fcrown = `<g stroke="#b58ad6" stroke-width=".8">${fl(34, 38, '#ffb3d1')}${fl(41, 33.5, '#b5ddff')}${fl(59, 33.5, '#fff27a')}${fl(66, 38, '#c9b3ff')}</g>` + `<path d="M48 36L50 32L52 36L50 38Z" fill="#ff5c8a" stroke="#fff" stroke-width=".6"/>`;
    out = `<g clip-path="url(#@@k)">${back}<g>${charLayer(A, P, fc, fcrown)}${bob(still, 1.6, 3)}</g>${C.parts}</g>${C.frame}`;
  } else if (u === 2) { // 月の女王ねこ
    const P = { k: 'ur', m: '#e7defe', l: '#fbf9ff', d: '#b8a2f0', ln: '#6f58b0', in: '#ffb8d6' };
    const C = urCommon(still, rng, { glow: '#d8c8ff', np: 10, gy: 56 });
    defs = C.holo + `<radialGradient id="@@b" cx=".5" cy=".3" r=".85"><stop offset="0" stop-color="#7b58c9"/><stop offset=".6" stop-color="#3a2477"/><stop offset="1" stop-color="#170c38"/></radialGradient><radialGradient id="@@m" cx=".4" cy=".4" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset="1" stop-color="#ffd977"/></radialGradient>`;
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@b)"/>`;
    for (let k = 0; k < 24; k++) bg += c(6 + rng() * 88, 6 + rng() * 88, .3 + rng() * .7, '#fff', ` opacity="${f(.4 + rng() * .6)}"`);
    // giant crescent moon behind
    const moon = `<g><path d="M50 8A42 42 0 1 0 92 50A34 34 0 1 1 50 8Z" fill="url(#@@m)" opacity=".95"/>${still ? '' : '<animate attributeName="opacity" values=".85;1;.85" dur="3s" repeatCount="indefinite"/>'}</g>`;
    back = moon + C.glow + `<g fill="#fff" opacity=".85">${e(14, 84, 12, 5, '#fff')}${e(86, 86, 13, 5, '#fff')}</g>`;
    const A = species(0, P, { hat: 1 });
    A.det += p('M47 44A4 4 0 1 0 53 44A3.2 3.2 0 1 1 47 44Z', '#ffd24d');
    const fc = face(A, 0, '#3b2a6b');
    const capeS = p('M10 106Q12 74 50 75Q88 74 90 106Z', '#5b3aa6', ' stroke="#3a2477" stroke-width="1.6"') + p('M22 82Q50 92 78 82L80 90Q50 101 20 90Z', '#fff') + [26, 34, 42, 50, 58, 66, 74].map(x => c(x, 88 + Math.abs(50 - x) * -.08, .9, '#3a2477')).join('') + c(50, 92, 3.2, '#9be7ff', ' stroke="url(#@@o)" stroke-width="1.4"');
    const cr = crown(50, A.ty + 2, 1.1, 'url(#@@o)', '#c99bff') + `<path d="M48 ${A.ty - 22}A3 3 0 1 0 52 ${A.ty - 22}A2.4 2.4 0 1 1 48 ${A.ty - 22}Z" fill="#fffbe6"/>`;
    out = `<g clip-path="url(#@@k)">${back}${capeS}<g>${charLayer(A, P, fc, cr)}</g>${C.parts}</g>${C.frame}`;
  } else if (u === 3) { // 太陽の守護神フェニックス
    const P = { k: 'ur', m: '#ffc94d', l: '#fff3c4', d: '#ff8a3d', ln: '#c2531a', in: '#ff9a8a' };
    const C = urCommon(still, rng, { glow: '#fff1a0', np: 9 });
    defs = C.holo + `<radialGradient id="@@b" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#fff4b8"/><stop offset=".45" stop-color="#ffab4a"/><stop offset="1" stop-color="#b8204f"/></radialGradient><radialGradient id="@@s"><stop offset="0" stop-color="#fffbe0"/><stop offset=".7" stop-color="#ffd84d"/><stop offset="1" stop-color="#ff9e2c"/></radialGradient><linearGradient id="@@f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff4d4d"/><stop offset=".5" stop-color="#ff9a2e"/><stop offset="1" stop-color="#ffe066"/></linearGradient>`;
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@b)"/>`;
    back = `<g>${rays(18, '#fff6c8', .45, 75, .14)}${spin(still, 18)}</g>` + `<g>${rays(9, '#ffd24d', .35, 75, .2)}${spin(still, 26, 50, 50, 1)}</g>` + `<circle cx="50" cy="52" r="33" fill="url(#@@s)" stroke="#fff3b0" stroke-width="1.5"/>` + C.glow;
    const wing = 'M32 74Q10 76 2 60Q8 60 10 56Q2 52 2 42Q10 46 14 44Q8 36 10 26Q18 38 24 40Q24 32 28 26Q34 42 38 56Z';
    const pv = 'M8 56Q18 62 30 66M8 42Q18 50 30 58M12 28Q20 40 30 50';
    const wings = p(wing, 'url(#@@f)') + p(mirror(wing), 'url(#@@f)') + ln(pv, '#fff3a0', 1.2) + ln(mirror(pv), '#fff3a0', 1.2);
    const P2 = Object.assign({}, P, { ln: '#c2411a' });
    const A = species(5, P2, { extraBack: wings, hat: 1 });
    A.sh = A.sh.replace(/<path d="M49 35[^>]*>/, ''); // replace tuft with flame crest
    A.det = A.det
      + p('M38 96Q42 86 50 84Q58 86 62 96Z', '#ff9a2e', ' opacity=".8"');
    const flame = `<g>${p('M50 36Q40 26 46 12Q48 22 52 22Q50 14 56 6Q60 20 56 30Q62 26 62 20Q68 30 58 37Z', 'url(#@@f)', ' stroke="#c2411a" stroke-width="1.4" stroke-linejoin="round"')}${p('M51 35Q46 28 50 20Q52 26 55 27Q57 31 54 35Z', '#fff6b0')}${still ? '' : '<animateTransform attributeName="transform" type="scale" values="1 1;1.03 .94;1 1" dur=".9s" repeatCount="indefinite" additive="sum"/>'}</g>`;
    const flameWrap = `<g transform="translate(50 37)"><g transform="translate(-50 -37)">${flame}</g></g>`;
    const fc = face(A, 1, '#5a2410');
    const cr = crown(50, 36.5, .7, 'url(#@@o)', '#ff3d6e');
    out = `<g clip-path="url(#@@k)">${back}<g>${flameWrap}${charLayer(A, P2, fc, cr)}${bob(still, 1.4, 2.6)}</g>${C.parts}</g>${C.frame}`;
  } else { // 銀河くじら
    const P = { k: 'ur', m: 'url(#@@x)', l: '#d9ecff', d: '#3b46b0', ln: '#24296e', in: '#ffb3e6' };
    const C = urCommon(still, rng, { glow: '#8fe3ff', np: 10, gy: 60 });
    defs = C.holo + `<radialGradient id="@@b" cx=".5" cy=".5" r=".8"><stop offset="0" stop-color="#2c6aa8"/><stop offset=".55" stop-color="#1d2a78"/><stop offset="1" stop-color="#0b0b2e"/></radialGradient><linearGradient id="@@x" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fa4ff"/><stop offset=".5" stop-color="#8a6cf0"/><stop offset="1" stop-color="#d07cf0"/>${still ? '' : '<animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;25 .5 .5;0 .5 .5" dur="6s" repeatCount="indefinite"/>'}</linearGradient><radialGradient id="@@g2" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6d6"/><stop offset=".3" stop-color="#ffb3e6" stop-opacity=".7"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></radialGradient>`;
    bg = `<rect width="100" height="100" rx="24" fill="url(#@@b)"/>`;
    for (let k = 0; k < 30; k++) bg += c(6 + rng() * 88, 6 + rng() * 88, .3 + rng() * .7, '#fff', ` opacity="${f(.4 + rng() * .6)}"`);
    bg += `<g>${e(26, 26, 20, 7, 'url(#@@g2)', rot(-25, 26, 26))}${ln('M10 30Q22 16 40 22M14 34Q30 36 42 22', '#ffd6f4', .8, ' opacity=".6"')}${spin(still, 40, 26, 26)}</g>`;
    bg += c(82, 22, 6, '#ffb38a') + e(82, 22, 11, 2.6, 'none', ` stroke="#ffe6a8" stroke-width="1.2"${rot(-20, 82, 22)}`) + c(80, 20.5, 1.6, '#fff', ' opacity=".5"');
    back = C.glow + `<ellipse cx="50" cy="31" rx="17" ry="4.4" fill="none" stroke="#ffe27a" stroke-width="2.4"/><ellipse cx="50" cy="31" rx="17" ry="4.4" fill="none" stroke="#fff" stroke-width=".7"/>`;
    const A = species(14, P, { hat: 1 });
    A.ty = 40;
    let specks = ''; for (let k = 0; k < 9; k++) specks += c(26 + rng() * 48, 44 + rng() * 12, .5 + rng() * .8, '#fff', ' opacity=".9"');
    A.det = A.det.replace(/fill="#d9ecff"/, 'fill="#cfe6ff" opacity=".9"') + specks + `<path d="${star4(66, 48, 2.4)}" fill="#fff"/>` + `<path d="${star4(34, 50, 1.8)}" fill="#ffe9a0"/>`;
    const fc = face(A, 0, '#141038');
    let spout = '';
    for (let k = 0; k < 6; k++) {
      const x = 50 + (k - 2.5) * 5, s = 1.6 + (k % 3) * .7;
      spout += still ? `<path d="${star4(x, 22 - (k % 2) * 6, s)}" fill="${k % 2 ? '#ffe9a0' : '#fff'}"/>`
        : `<path d="${star4(0, 0, s)}" fill="${k % 2 ? '#ffe9a0' : '#fff'}"><animateTransform attributeName="transform" type="translate" values="50 36;${f(x + (k - 2.5) * 2)} ${12 - (k % 2) * 4}" dur="2.4s" begin="-${f(k * .4)}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin="-${f(k * .4)}s" repeatCount="indefinite"/></path>`;
    }
    const cr = crown(62, 40, .55, 'url(#@@o)', '#6ff0ff');
    out = `<g clip-path="url(#@@k)">${back}${spout}<g>${charLayer(A, P, fc, `<g transform="rotate(14 62 40)">${cr}</g>`)}${bob(still, 1.8, 3.6)}</g>${C.parts}</g>${C.frame}`;
  }
  return `<defs>${defs}</defs>${bg}${out}`;
}

/* ---------- silhouette ---------- */
function buildSil(id) {
  const t = TR[id]; let A, extra = '';
  if (t.r === 'UR') {
    const P = PAL[0];
    if (t.ur === 0) { const w = 'M30 72Q4 70 2 40Q8 46 12 44Q6 34 10 22Q18 34 22 34Q20 26 24 20Q30 34 34 46Q40 58 38 68Z'; A = species(18, P, { extraBack: p(w, '#000') + p(mirror(w), '#000'), hat: 1 }); }
    else if (t.ur === 1) A = species(17, P, { extraBack: featherWing(-1, '#000') + featherWing(1, '#000'), hat: 1 });
    else if (t.ur === 3) { const w = 'M32 74Q10 76 2 60Q8 60 10 56Q2 52 2 42Q10 46 14 44Q8 36 10 26Q18 38 24 40Q24 32 28 26Q34 42 38 56Z'; A = species(5, P, { extraBack: p(w, '#000') + p(mirror(w), '#000'), hat: 1 }); }
    else A = species(t.sp, P, { hat: 1 });
    extra = crown(50, A.ty + 2, .95, '#000', '#000');
  } else if (t.r === 'SP') {
    const P = PAL[t.pal]; A = species(t.sp, P, { hat: 1 });
    extra = (spProp(t, A, P, true).front || '').replace(/<text[^>]*>[^<]*<\/text>/g, '');
  } else {
    const P = PAL[t.pal]; A = species(t.sp, P, { hat: 1 });
    if (t.acc >= 0) extra = accessory(t.acc, A, '#000', P);
    if (t.r === 'SSR') extra = t.cos === 1 ? tiara(50, A.ty + 1, '#000', '#000') : crown(50, A.ty + 2, .95, '#000', '#000');
  }
  const strip = s => s.replace(/ (fill|stroke|fill-opacity|opacity|stroke-width|stroke-dasharray)="[^"]*"/g, '');
  const G = '#d6cfe4';
  return `<rect width="100" height="100" rx="24" fill="#f3f0f8"/>${c(50, 50, 44, '#ebe6f3')}<g fill="${G}" stroke="${G}" stroke-width="4.4" stroke-linejoin="round" stroke-linecap="round">${strip(A.sh)}${strip(extra)}</g><text x="50" y="${f(A.ey + 10)}" font-size="24" font-weight="800" font-family="system-ui,sans-serif" text-anchor="middle" fill="#fff">?</text>`;
}

/* ---------- public API ---------- */
const cache = new Map(), scache = new Map();
const byR = {}; for (const r of RARITIES) byR[r] = Array.from({ length: CNT[r] }, (_, i) => START[r] + i);
byR.SP = Array.from({ length: SPX.length }, (_, i) => 500 + i);   // speed rewards (never drawn from the gacha)
function svg(id, opts = {}) {
  id = id | 0; if (!TR[id]) return '';
  const still = !!opts.still, key = id * 2 + (still ? 1 : 0);
  let s = cache.get(key);
  if (!s) { s = TR[id].r === 'UR' ? buildUR(TR[id].ur, still) : TR[id].r === 'SP' ? buildSP(id, still) : buildStd(id, still); cache.set(key, s); }
  const uid = String(opts.uid || ('si' + id)).replace(/[^\w-]/g, '_');
  return svgOpen(opts.size || 96) + s.split('@@').join(uid) + '</svg>';
}
function silhouette(id, opts = {}) {
  id = id | 0; if (!TR[id]) return '';
  let s = scache.get(id); if (!s) { s = buildSil(id); scache.set(id, s); }
  return svgOpen(opts.size || 96) + s + '</svg>';
}
const API = {
  COUNT: 500, COUNT_ALL: 500 + SPX.length, RARITIES: RARITIES.slice(), LANGS,
  info, svg, silhouette,
  byRarity: r => (byR[r] || []).slice(),
  _traits: id => TR[id] && Object.assign({}, TR[id]),
};
if (typeof window !== 'undefined') window.SudokuIcons = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
