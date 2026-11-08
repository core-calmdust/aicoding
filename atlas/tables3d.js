/* =====================================================================
   World Board Game Atlas — the places (table designs) of the 3D room
   Registers Table3D.TABLES[k] (k = 1..5; 0 is the toy room's chabudai in table3d.js):
     1 2D準拠      no room: the game's own 2D page background (its CSS layers, behind a transparent canvas), the board floats over a soft shadow
     2 木のダイニング  an oak table sized for the board in a dining room: chairs, a sideboard, a window; morning … night (food of the hour)
     3 緑のフェルト    deep green felt in a walnut rail under a billiard shade; chips, cards, dice, a rocks glass; dark club room
     4 大理石のテラス  a marble table on a terracotta terrace: stone balustrade, the house wall, the sea and a coast; morning … night
     5 夜の書斎      a matte-black desk, leather mat, banker's lamp, built-in walnut bookshelves (3D), a mesh office chair
     (2026-11-07: every place is a closed room — dragging / zooming never shows an edge; see the section 'The rooms of places 2..5')
   Each builder gets { TT, g, scene, texScale, game, css(v) } and returns
     { bg (null: transparent canvas), exp, minExp, board (the guaranteed light on the board), key (the shadow-casting light),
       env: { top, bottom, panels }, onShow(id) }.
   TABLES[k].plain: the place on the full games' pages (?skin=atlas): the board's light there;
   TABLES[k].floor(o): the page's floor ({ img, w, h } world units, + `over`: CSS layers above it, or `css`: the whole background).
   Textures are made only when a place is chosen (canvasTex caches them by key).
   The picker's names and the place-dependent labels (「ちゃぶ台へ」→「書斎へ」…) are Table3D.PLACES (10 languages).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X || !X.TABLES) return;
  const { TABLES, M, RB, canvasTex, woodTop, wood, makeNoise } = X;
  const PITCH = .52;   // the portal's showcase camera pitch (camPose)

  /* ---------- names and labels (10 languages): name = the picker, go = 「〜へ」 (today's card), play = 「〜で遊ぶ」 (the board card) ---------- */
  const PLACES = {
    name: {
      ja: ['ちゃぶ台', '2D準拠', 'ダイニング', 'フェルト卓', 'テラス', '書斎', '縁側', '山小屋', 'リヤド', 'スカイラウンジ'],
      en: ['Chabudai', 'Like 2D', 'Dining table', 'Green felt', 'Terrace', 'Study', 'Engawa', 'Mountain lodge', 'Riad', 'Sky lounge'],
      zh: ['矮桌', '2D风格', '餐桌', '绿色绒布', '露台', '书房', '缘侧', '山间小屋', '摩洛哥庭院', '空中酒廊'],
      ko: ['밥상', '2D 스타일', '식탁', '초록 펠트', '테라스', '서재', '툇마루', '산장', '리야드', '스카이 라운지'],
      es: ['Mesa baja', 'Como en 2D', 'Comedor', 'Tapete verde', 'Terraza', 'Estudio', 'Engawa', 'Refugio', 'Riad', 'Sky lounge'],
      fr: ['Table basse', 'Comme en 2D', 'Salle à manger', 'Tapis vert', 'Terrasse', 'Bureau', 'Engawa', 'Chalet', 'Riad', 'Sky lounge'],
      pt: ['Mesa baixa', 'Como no 2D', 'Sala de jantar', 'Feltro verde', 'Terraço', 'Escritório', 'Engawa', 'Chalé', 'Riad', 'Sky lounge'],
      de: ['Teetisch', 'Wie in 2D', 'Esstisch', 'Grüner Filz', 'Terrasse', 'Lesezimmer', 'Engawa', 'Berghütte', 'Riad', 'Sky-Lounge'],
      hi: ['चाबुदाई', '2D जैसा', 'डाइनिंग टेबल', 'हरा फ़ेल्ट', 'टैरेस', 'स्टडी रूम', 'एंगावा बरामदा', 'पहाड़ी कॉटेज', 'रियाद', 'स्काई लाउंज'],
      ar: ['طاولة واطئة', 'كما في 2D', 'طاولة الطعام', 'اللباد الأخضر', 'الشرفة', 'المكتب', 'إنغاوا', 'كوخ جبلي', 'رياض', 'صالة علوية'],
      ru: ['Столик', 'Как в 2D', 'Обеденный стол', 'Зелёное сукно', 'Терраса', 'Кабинет', 'Энгава', 'Горный домик', 'Риад', 'Скай-лаунж'],
      'zh-TW': ['矮桌', '同2D', '餐桌', '綠色絨布桌', '露台', '書房', '緣側', '山間小屋', '摩洛哥庭院', '空中酒廊'],
      id: ['Meja rendah', 'Seperti 2D', 'Meja makan', 'Kain hijau', 'Teras', 'Ruang baca', 'Engawa', 'Pondok gunung', 'Riad', 'Sky lounge'],
      tr: ['Alçak masa', '2D gibi', 'Yemek masası', 'Yeşil çuha', 'Teras', 'Çalışma odası', 'Engawa', 'Dağ evi', 'Riad', 'Sky lounge'],
    },
    go: {
      ja: ['ちゃぶ台へ', '盤へ', 'ダイニングへ', 'フェルト卓へ', 'テラスへ', '書斎へ', '縁側へ', '山小屋へ', 'リヤドへ', 'スカイラウンジへ'],
      en: ['To the table', 'To the board', 'To the dining table', 'To the felt table', 'To the terrace', 'To the study', 'To the engawa', 'To the lodge', 'To the riad', 'To the sky lounge'],
      zh: ['前往棋桌', '前往棋盘', '前往餐桌', '前往牌桌', '前往露台', '前往书房', '前往缘侧', '前往山间小屋', '前往庭院', '前往空中酒廊'],
      ko: ['판으로 가기', '보드로 가기', '식탁으로 가기', '펠트 테이블로 가기', '테라스로 가기', '서재로 가기', '툇마루로 가기', '산장으로 가기', '리야드로 가기', '스카이 라운지로 가기'],
      es: ['Ir a la mesa', 'Ir al tablero', 'Ir al comedor', 'Ir al tapete', 'Ir a la terraza', 'Ir al estudio', 'Ir al engawa', 'Ir al refugio', 'Ir al riad', 'Ir al sky lounge'],
      fr: ['Vers la table', 'Vers le plateau', 'Vers la salle à manger', 'Vers le tapis vert', 'Vers la terrasse', 'Vers le bureau', 'Vers l\'engawa', 'Vers le chalet', 'Vers le riad', 'Vers le sky lounge'],
      pt: ['Ir para a mesa', 'Ir para o tabuleiro', 'Ir para a sala de jantar', 'Ir para o feltro', 'Ir para o terraço', 'Ir para o escritório', 'Ir para o engawa', 'Ir para o chalé', 'Ir para o riad', 'Ir para o sky lounge'],
      de: ['Zum Tisch', 'Zum Brett', 'Zum Esstisch', 'Zum Filztisch', 'Auf die Terrasse', 'Ins Lesezimmer', 'Zur Engawa', 'Zur Berghütte', 'In den Riad', 'In die Sky-Lounge'],
      hi: ['बोर्ड पर चलें', 'बोर्ड पर चलें', 'डाइनिंग टेबल पर चलें', 'फ़ेल्ट टेबल पर चलें', 'टैरेस पर चलें', 'स्टडी रूम में चलें', 'बरामदे पर चलें', 'कॉटेज में चलें', 'रियाद में चलें', 'स्काई लाउंज में चलें'],
      ar: ['إلى الطاولة', 'إلى اللوحة', 'إلى طاولة الطعام', 'إلى طاولة اللباد', 'إلى الشرفة', 'إلى المكتب', 'إلى الإنغاوا', 'إلى الكوخ', 'إلى الرياض', 'إلى الصالة العلوية'],
      ru: ['К столику', 'К доске', 'К обеденному столу', 'К суконному столу', 'На террасу', 'В кабинет', 'На энгаву', 'В горный домик', 'В риад', 'В скай-лаунж'],
      'zh-TW': ['前往矮桌', '前往棋盤', '前往餐桌', '前往絨布桌', '前往露台', '前往書房', '前往緣側', '前往山間小屋', '前往庭院', '前往空中酒廊'],
      id: ['Ke meja', 'Ke papan', 'Ke meja makan', 'Ke meja kain', 'Ke teras', 'Ke ruang baca', 'Ke engawa', 'Ke pondok', 'Ke riad', 'Ke sky lounge'],
      tr: ['Masaya', 'Tahtaya', 'Yemek masasına', 'Çuha masaya', 'Terasa', 'Çalışma odasına', 'Engawa\'ya', 'Dağ evine', 'Riad\'a', 'Sky lounge’a'],
    },
    play: {
      ja: ['ちゃぶ台で遊ぶ', '盤で遊ぶ', 'ダイニングで遊ぶ', 'フェルト卓で遊ぶ', 'テラスで遊ぶ', '書斎で遊ぶ', '縁側で遊ぶ', '山小屋で遊ぶ', 'リヤドで遊ぶ', 'スカイラウンジで遊ぶ'],
      en: ['Play on the table', 'Play on the board', 'Play at the dining table', 'Play on the felt', 'Play on the terrace', 'Play in the study', 'Play on the engawa', 'Play in the lodge', 'Play in the riad', 'Play in the sky lounge'],
      zh: ['在矮桌上玩', '在棋盘上玩', '在餐桌上玩', '在牌桌上玩', '在露台上玩', '在书房里玩', '在缘侧上玩', '在山间小屋里玩', '在庭院里玩', '在空中酒廊里玩'],
      ko: ['밥상에서 플레이', '보드에서 플레이', '식탁에서 플레이', '펠트 테이블에서 플레이', '테라스에서 플레이', '서재에서 플레이', '툇마루에서 플레이', '산장에서 플레이', '리야드에서 플레이', '스카이 라운지에서 플레이'],
      es: ['Jugar en la mesa', 'Jugar en el tablero', 'Jugar en el comedor', 'Jugar en el tapete', 'Jugar en la terraza', 'Jugar en el estudio', 'Jugar en el engawa', 'Jugar en el refugio', 'Jugar en el riad', 'Jugar en el sky lounge'],
      fr: ['Jouer sur la table', 'Jouer sur le plateau', 'Jouer dans la salle à manger', 'Jouer sur le tapis vert', 'Jouer sur la terrasse', 'Jouer au bureau', 'Jouer sur l\'engawa', 'Jouer au chalet', 'Jouer au riad', 'Jouer au sky lounge'],
      pt: ['Jogar na mesa', 'Jogar no tabuleiro', 'Jogar na sala de jantar', 'Jogar no feltro', 'Jogar no terraço', 'Jogar no escritório', 'Jogar no engawa', 'Jogar no chalé', 'Jogar no riad', 'Jogar no sky lounge'],
      de: ['Am Tisch spielen', 'Am Brett spielen', 'Am Esstisch spielen', 'Am Filztisch spielen', 'Auf der Terrasse spielen', 'Im Lesezimmer spielen', 'Auf der Engawa spielen', 'In der Berghütte spielen', 'Im Riad spielen', 'In der Sky-Lounge spielen'],
      hi: ['मेज़ पर खेलें', 'बोर्ड पर खेलें', 'डाइनिंग टेबल पर खेलें', 'फ़ेल्ट टेबल पर खेलें', 'टैरेस पर खेलें', 'स्टडी रूम में खेलें', 'बरामदे पर खेलें', 'कॉटेज में खेलें', 'रियाद में खेलें', 'स्काई लाउंज में खेलें'],
      ar: ['العب على الطاولة', 'العب على اللوحة', 'العب على طاولة الطعام', 'العب على طاولة اللباد', 'العب في الشرفة', 'العب في المكتب', 'العب في الإنغاوا', 'العب في الكوخ', 'العب في الرياض', 'العب في الصالة العلوية'],
      ru: ['Играть на столике', 'Играть на доске', 'Играть за обеденным столом', 'Играть на сукне', 'Играть на террасе', 'Играть в кабинете', 'Играть на энгаве', 'Играть в горном домике', 'Играть в риаде', 'Играть в скай-лаунже'],
      'zh-TW': ['在矮桌上玩', '在棋盤上玩', '在餐桌上玩', '在絨布桌上玩', '在露台上玩', '在書房裡玩', '在緣側上玩', '在山間小屋裡玩', '在庭院裡玩', '在空中酒廊裡玩'],
      id: ['Main di meja', 'Main di papan', 'Main di meja makan', 'Main di kain hijau', 'Main di teras', 'Main di ruang baca', 'Main di engawa', 'Main di pondok', 'Main di riad', 'Main di sky lounge'],
      tr: ['Masada oyna', 'Tahtada oyna', 'Yemek masasında oyna', 'Çuhada oyna', 'Terasta oyna', 'Çalışma odasında oyna', 'Engawa\'da oyna', 'Dağ evinde oyna', 'Riad\'da oyna', 'Sky lounge’da oyna'],
    },
    // the updates list (shared/atlas.js) says ちゃぶ台 / chabudai for the portal's own 3D play: the word that replaces it
    news: {
      ja: ['ちゃぶ台', '盤', 'ダイニング', 'フェルト卓', 'テラス', '書斎', '縁側', '山小屋', 'リヤド', 'スカイラウンジ'],
      en: ['chabudai', 'table', 'table', 'table', 'table', 'table', 'table', 'table', 'table', 'table'],
      hi: ['चाबुदाई', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़'],
    },
    ui: {
      place: { ja: '場所', en: 'Place', zh: '场所', ko: '장소', es: 'Lugar', fr: 'Lieu', pt: 'Local', de: 'Ort', hi: 'जगह', ar: 'المكان', ru: 'Место', 'zh-TW': '場所', id: 'Tempat', tr: 'Mekân' },
      table: { ja: 'テーブル', en: 'Table', zh: '桌子', ko: '테이블', es: 'Mesa', fr: 'Table', pt: 'Mesa', de: 'Tisch', hi: 'टेबल', ar: 'الطاولة', ru: 'Стол', 'zh-TW': '桌子', id: 'Meja', tr: 'Masa' },
      bright: { ja: '明るさ', en: 'Brightness', zh: '亮度', ko: '밝기', es: 'Brillo', fr: 'Luminosité', pt: 'Brilho', de: 'Helligkeit', hi: 'रोशनी', ar: 'السطوع', ru: 'Яркость', 'zh-TW': '亮度', id: 'Kecerahan', tr: 'Parlaklık' },
      b: { ja: ['暗い', '標準', '明るい'], en: ['Dim', 'Normal', 'Bright'], zh: ['暗', '标准', '明亮'], ko: ['어둡게', '보통', '밝게'],
        es: ['Tenue', 'Normal', 'Claro'], fr: ['Tamisé', 'Normal', 'Clair'], pt: ['Suave', 'Normal', 'Claro'], de: ['Gedämpft', 'Normal', 'Hell'],
        hi: ['मंद', 'सामान्य', 'तेज़'], ar: ['خافت', 'عادي', 'ساطع'], ru: ['Приглушённая', 'Обычная', 'Яркая'], 'zh-TW': ['暗', '一般', '明亮'], id: ['Redup', 'Normal', 'Terang'], tr: ['Loş', 'Normal', 'Parlak'] },
    },
  };
  const pick = (o, l) => o[l] || o.en;
  X.PLACES = PLACES;
  X.placeText = (kind, lang, k = X.table()) => { const o = kind === 'news' ? PLACES.news[lang] : pick(PLACES[kind], lang); return o ? o[k] ?? o[0] : ''; };
  X.placeUi = (key, lang) => pick(PLACES.ui[key], lang);
  // the thumbnails (small real renders, atlas/img/place-k.webp), next to this script whichever page loads it
  const ME = (document.currentScript && document.currentScript.src) || location.href;
  X.placeThumb = k => new URL('img/place-' + k + '.webp?v=' + (k >= 2 ? 2 : 1), ME).href;

  const lin = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
  const rad = (c, x, y, r, stops) => { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
  const blur = (c, px) => c.__blur(px);
  function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); c.fill(); }
  function rng(seed) { let s = seed | 0 || 1; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }
  function dirLight(TT, col, I, pos, ext = 14) {
    const L = new TT.DirectionalLight(col, I); L.position.set(...pos);
    Object.assign(L.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 90 }); return L;
  }
  const sz = (o, n) => Math.round(n * Math.max(.5, o.texScale));
  // a rounded-rectangle path (THREE.Shape / Path)
  function rrect(p, x0, y0, x1, y1, r) {
    p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r); p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
    p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0); return p;
  }

  /* ---------- 盤: the games with more than one 3D board — chosen in the same panel as the place (portal board view) ----------
     Each entry reads / writes the very keys the full game's 3D skin uses (atlas/skin/<game>.js), so the portal and the full game
     always show the same board. Names are the design tab's own (10 languages). Games with a single 3D board are not listed. */
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const N3 = {   // the design tab's names
    lux: { ja: '高級3D', en: 'Luxury 3D', zh: '豪华3D', ko: '고급 3D', es: 'Lujo 3D', fr: 'Luxe 3D', pt: 'Luxo 3D', de: 'Luxus 3D', hi: 'लक्ज़री 3D', ar: 'فاخر ثلاثي', ru: 'Роскошная 3D', 'zh-TW': '高級3D', id: '3D mewah', tr: 'Lüks 3D' },
    wood: { ja: '木製3D', en: 'Wooden 3D', zh: '木制3D', ko: '목재 3D', es: 'Madera 3D', fr: 'Bois 3D', pt: 'Madeira 3D', de: 'Holz 3D', hi: 'लकड़ी 3D', ar: 'خشبي ثلاثي', ru: 'Деревянная 3D', 'zh-TW': '木製3D', id: '3D kayu', tr: 'Ahşap 3D' },
    kaya: { ja: '榧3D', en: 'Kaya 3D', zh: '榧木3D', ko: '비자 3D', es: 'Kaya 3D', fr: 'Kaya 3D', pt: 'Kaya 3D', de: 'Kaya 3D', hi: 'काया 3D', ar: 'كايا ثلاثي', ru: '3D из каи', 'zh-TW': '榧木3D', id: '3D kaya', tr: 'Kaya ağacı 3D' },
    lacquer: { ja: '漆・沈金3D', en: 'Lacquer 3D', zh: '漆金3D', ko: '옻칠 3D', es: 'Laca 3D', fr: 'Laque 3D', pt: 'Laca 3D', de: 'Lack 3D', hi: 'लाख 3D', ar: 'ورنيش ثلاثي', ru: 'Лаковая 3D', 'zh-TW': '漆器3D', id: '3D pernis', tr: 'Lake 3D' },
    marq: { ja: '寄木細工 3D', en: 'Marquetry 3D', zh: '镶嵌木 3D', ko: '상감 목재 3D', es: 'Marquetería 3D', fr: 'Marqueterie 3D', pt: 'Marchetaria 3D', de: 'Intarsie 3D', hi: 'मार्केट्री 3D', ar: 'تطعيم خشبي ثلاثي', ru: '3D маркетри', 'zh-TW': '拼花3D', id: '3D marketri', tr: 'Marketeri 3D' },
    scarlet: { ja: 'レザー 3D', en: 'Leather 3D', zh: '皮革 3D', ko: '가죽 3D', es: 'Cuero 3D', fr: 'Cuir 3D', pt: 'Couro 3D', de: 'Leder 3D', hi: 'लेदर 3D', ar: 'جلد ثلاثي', ru: 'Кожаная 3D', 'zh-TW': '皮革3D', id: '3D kulit', tr: 'Deri 3D' },
    victorian: { ja: '3D ヴィクトリア盤', en: '3D Victorian board', zh: '3D 维多利亚盘', ko: '3D 빅토리아 판', es: 'Tablero victoriano 3D', fr: 'Plateau victorien 3D', pt: 'Tabuleiro vitoriano 3D', de: 'Viktorianisches Brett 3D', hi: '3D विक्टोरियन बोर्ड', ar: 'رقعة فيكتورية ثلاثية الأبعاد', ru: 'Викторианская 3D-доска', 'zh-TW': '維多利亞時代3D棋盤', id: 'Papan 3D Victoria', tr: '3D Viktorya tahtası' },
    folk: { ja: '3D 民藝盤', en: '3D folk-art board', zh: '3D 民间彩绘盘', ko: '3D 민예 판', es: 'Tablero folk 3D', fr: 'Plateau folk 3D', pt: 'Tabuleiro folk 3D', de: 'Volkskunst-Brett 3D', hi: '3D लोक-कला बोर्ड', ar: 'رقعة شعبية ثلاثية الأبعاد', ru: 'Народная 3D-доска', 'zh-TW': '民藝3D棋盤', id: 'Papan 3D seni rakyat', tr: '3D halk sanatı tahtası' },
    quilt: { ja: 'ハワイアンキルト 3D', en: 'Hawaiian quilt 3D', zh: '夏威夷拼布 3D', ko: '하와이안 퀼트 3D', es: 'Colcha hawaiana 3D', fr: 'Courtepointe hawaïenne 3D', pt: 'Colcha havaiana 3D', de: 'Hawaii-Quilt 3D', hi: 'हवाईयन क्विल्ट 3D', ar: 'لحاف هاوائي ثلاثي', ru: 'Гавайское одеяло 3D', 'zh-TW': '夏威夷拼布3D', id: 'Quilt Hawaii 3D', tr: 'Hawaii yorganı 3D' },
    papamu: { ja: '石のパパムー 3D', en: 'Stone papamū 3D', zh: '石刻棋盘 3D', ko: '돌 파파무 3D', es: 'Papamū de piedra 3D', fr: 'Papamū de pierre 3D', pt: 'Papamū de pedra 3D', de: 'Stein-Papamū 3D', hi: 'पत्थर का पापामू 3D', ar: 'بابامو حجري ثلاثي', ru: 'Каменная папаму 3D', 'zh-TW': '石製帕帕穆3D', id: 'Papamū batu 3D', tr: 'Taş papamū 3D' },
    // senet (the design tab's 盤 names)
    tut: { ja: "ツタンカーメン", en: "Tutankhamun", zh: "图坦卡蒙", ko: "투탕카멘", es: "Tutankamón", fr: "Toutânkhamon", pt: "Tutancâmon", de: "Tutanchamun", hi: "तूतनख़ामुन", ar: "توت عنخ آمون", ru: "Тутанхамон", 'zh-TW': "圖坦卡門", id: "Tutankhamun", tr: "Tutankamon" },
    faience: { ja: "青いファイアンス", en: "Blue faience", zh: "蓝色釉陶", ko: "푸른 파이앙스", es: "Fayenza azul", fr: "Faïence bleue", pt: "Faiança azul", de: "Blaue Fayence", hi: "नीली फ़ायंस", ar: "القاشاني الأزرق", ru: "Синий фаянс", 'zh-TW': "藍色彩陶", id: "Fayans biru", tr: "Mavi fayans" },
    papyrus: { ja: "墓の壁画", en: "Tomb painting", zh: "墓室壁画", ko: "무덤 벽화", es: "Pintura de tumba", fr: "Peinture de tombe", pt: "Pintura de túmulo", de: "Grabmalerei", hi: "मकबरे का चित्र", ar: "رسم المقبرة", ru: "Роспись гробницы", 'zh-TW': "墓室壁畫", id: "Lukisan makam", tr: "Mezar resmi" },
    night: { ja: "ナイルの夜", en: "Nile night", zh: "尼罗之夜", ko: "나일의 밤", es: "Noche del Nilo", fr: "Nuit du Nil", pt: "Noite do Nilo", de: "Nilnacht", hi: "नील की रात", ar: "ليل النيل", ru: "Ночь на Ниле", 'zh-TW': "尼羅河之夜", id: "Malam di Sungai Nil", tr: "Nil gecesi" },
  };
  const BOARDS = {
    // atlas/skin/chess.js: 'atlas-chess-pc' = the piece set ('1' lux · 'wood' · '0' the 2D pieces), '-bd' = the board's wood
    chess: { list: ['lux', 'wood'],
      get: () => { const v = ls.get('atlas-chess-pc'); return v === 'wood' ? 'wood' : v === '0' ? (ls.get('atlas-chess-pc-bd') === 'wood' ? 'wood' : 'lux') : 'lux'; },
      set: k => { ls.set('atlas-chess-pc', k === 'wood' ? 'wood' : '1'); ls.set('atlas-chess-pc-bd', k); ls.set('atlas-chess-view', '3d'); } },
    // atlas/skin/go.js / gomoku.js: 'kaya' | 'lacquer' ('0': the 2D stones)
    go: { list: ['kaya', 'lacquer'], get: () => ls.get('atlas-go-look') === 'lacquer' ? 'lacquer' : 'kaya', set: k => ls.set('atlas-go-look', k) },
    gomoku: { list: ['lacquer', 'kaya'], get: () => ls.get('atlas-gomoku-look') === 'kaya' ? 'kaya' : 'lacquer', set: k => ls.set('atlas-gomoku-look', k) },
    // atlas/skin/backgammon.js: 'atlas-bg-look' + the game's own settings.skin (marquetry / scarlet)
    backgammon: { list: ['marq', 'scarlet'],
      get: () => { const v = ls.get('atlas-bg-look'); if (v === 'scarlet' || v === 'marq') return v; try { return (JSON.parse(ls.get('aicoding-backgammon-v2') || '{}').settings || {}).skin === 'scarlet' ? 'scarlet' : 'marq'; } catch (e) { return 'marq'; } },
      set: k => { ls.set('atlas-bg-look', k); try { const o = JSON.parse(ls.get('aicoding-backgammon-v2') || '{}') || {}; o.settings = o.settings || {}; o.settings.skin = k === 'scarlet' ? 'scarlet' : 'marquetry'; ls.set('aicoding-backgammon-v2', JSON.stringify(o)); } catch (e) {} } },
    // atlas/skin/agon.js: 'atlas-agon-look' ('victorian' | 'folk' | '2d') + 'atlas-agon-look3' (the last 3D board)
    agon: { list: ['victorian', 'folk'],
      get: () => (ls.get('atlas-agon-look3') || ls.get('atlas-agon-look')) === 'folk' ? 'folk' : 'victorian',
      set: k => { ls.set('atlas-agon-look', k); ls.set('atlas-agon-look3', k); } },
    // atlas/skin/konane.js: 'atlas-konane-look' ('papamu' the default | 'quilt')
    // senet: every design is a 3D box — the game's own settings.design ('aicoding-senet'), read by atlas/models/senet.js and the skin
    senet: { list: ['tut', 'faience', 'papyrus', 'night'],
      get: () => { try { const d = (JSON.parse(ls.get('aicoding-senet') || '{}').settings || {}).design; return ['faience', 'papyrus', 'night'].includes(d) ? d : 'tut'; } catch (e) { return 'tut'; } },
      set: k => { try { const o = JSON.parse(ls.get('aicoding-senet') || '{}') || {}; o.settings = o.settings || {}; o.settings.design = k; ls.set('aicoding-senet', JSON.stringify(o)); } catch (e) {} } },
    konane: { list: ['papamu', 'quilt'], get: () => ls.get('atlas-konane-look') === 'quilt' ? 'quilt' : 'papamu', set: k => ls.set('atlas-konane-look', k) },
  };
  X.BOARDS = BOARDS;
  X.boardName = (k, lang) => { const o = N3[k]; return o ? o[lang] || o.en : k; };
  X.boardThumb = (id, k) => new URL('img/board-' + id + '-' + k + '.webp?v=' + (id === 'senet' ? 3 : id === 'konane' ? 2 : 1), ME).href;
  // choose a board for a game: the shared key is written and the showcase board (if it is that game's) is rebuilt at once
  X.setBoard = (id, k) => { const B = BOARDS[id]; if (!B || !B.list.includes(k)) return; B.set(k); try { dispatchEvent(new CustomEvent('atlas-board', { detail: { id, look: k } })); } catch (e) {} };
  PLACES.ui.board = { ja: '盤', en: 'Board', zh: '棋盘', ko: '판', es: 'Tablero', fr: 'Plateau', pt: 'Tabuleiro', de: 'Brett', hi: 'बोर्ड', ar: 'اللوحة', ru: 'Доска', 'zh-TW': '棋盤', id: 'Papan', tr: 'Tahta' };

  /* ---------- 1 · 2D準拠: each game's own 2D page background ---------- */
  // the CSS layers that the game's 2D page (<game>/index.html) paints on its body, read from the rendered pages: [color, image layers]
  // (the canvas stays transparent and its container carries them — the very same gradients, at no texture cost)
  const BG2D = {
    chess: ["#0b0a09", "radial-gradient(1200px 700px at 28% -10%, #2a2016, transparent 60%), radial-gradient(900px 600px at 110% 110%, #1c1712, transparent 60%)"],
    shogi: ["#130d09", "radial-gradient(1200px 700px at 30% -10%, #34230f, transparent 60%), radial-gradient(900px 600px at 110% 110%, #281a0d, transparent 60%)"],
    go: ["#0b0e15", "radial-gradient(1100px 700px at 25% -10%, #1d2740, transparent 60%), radial-gradient(900px 600px at 110% 110%, #1a1f33, transparent 60%)"],
    reversi: ["#0b1110", "radial-gradient(1200px 700px at 30% -10%, #1b2b26, transparent 60%), radial-gradient(900px 600px at 110% 110%, #16231f, transparent 60%)"],
    ludo: ["#1a0f0c", "radial-gradient(1100px 650px at 20% -10%, rgba(217, 71, 59, 0.38), transparent 62%), radial-gradient(900px 600px at 110% 115%, rgba(242, 193, 46, 0.22), transparent 60%)"],
    janggi: ["#0e1416", "radial-gradient(1200px 700px at 28% -10%, #15403c, transparent 60%), radial-gradient(900px 600px at 110% 110%, #112f33, transparent 60%)"],
    xiangqi: ["#13090b", "radial-gradient(1200px 700px at 28% -10%, #461521, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3c121d, transparent 60%)"],
    backgammon: ["#0b1110", "radial-gradient(1200px 700px at 30% -10%, #1b2b26, transparent 60%), radial-gradient(900px 600px at 110% 110%, #16231f, transparent 60%)"],
    gomoku: ["#0b0a09", "radial-gradient(1200px 700px at 28% -10%, #2a2016, transparent 60%), radial-gradient(900px 600px at 110% 110%, #1c1712, transparent 60%)"],
    checkers: ["#13090b", "radial-gradient(1200px 700px at 28% -10%, #461521, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3c121d, transparent 60%)"],
    hex: ["#0b0f1c", "radial-gradient(1200px 700px at 28% -10%, #461521, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3c121d, transparent 60%)"],
    connect4: ["#061315", "radial-gradient(1200px 700px at 30% -10%, #0f2c30, transparent 60%), radial-gradient(900px 600px at 110% 110%, #0b2226, transparent 60%)"],
    mancala: ["#0a0a0b", "radial-gradient(1300px 700px at 50% -25%, #222224, transparent 62%), linear-gradient(#131314, #09090a)"],
    dots: ["#16130f", "radial-gradient(1200px 700px at 30% -10%, #3a2e1f, transparent 60%), radial-gradient(900px 600px at 110% 110%, #18202e, transparent 60%)"],
    morris: ["#0d0a17", "radial-gradient(1200px 700px at 28% -10%, #172a44, transparent 60%), radial-gradient(900px 600px at 110% 110%, #14203a, transparent 60%)"],
    tafl: ["#0b1116", "radial-gradient(1200px 700px at 28% -10%, #1b3a4c, transparent 60%), radial-gradient(900px 600px at 110% 110%, #123a34, transparent 60%)"],
    ugolki: ["#07112f", "radial-gradient(1200px 700px at 28% -10%, #1a2c6e, transparent 60%), radial-gradient(900px 600px at 110% 110%, #14235a, transparent 60%)"],
    senet: ["#130c07", "radial-gradient(1100px 620px at 18% -12%, rgba(31, 143, 168, 0.22), transparent 62%), radial-gradient(900px 600px at 110% 115%, rgba(214, 150, 60, 0.16), transparent 60%)"],
    ur: ["#080d26", "radial-gradient(1100px 620px at 18% -12%, rgba(42, 63, 158, 0.55), transparent 62%), radial-gradient(900px 600px at 110% 115%, rgba(142, 42, 28, 0.28), transparent 60%), radial-gradient(1px 1px at 12% 22%, rgba(255, 240, 200, 0.6), transparent), radial-gradient(1px 1px at 78% 12%, rgba(255, 240, 200, 0.5), transparent), radial-gradient(1.4px 1.4px at 64% 30%, rgba(255, 240, 200, 0.45), transparent), radial-gradient(1px 1px at 36% 8%, rgba(255, 240, 200, 0.5), transparent)"],
    agon: ["#0e0907", "radial-gradient(1200px 700px at 28% -10%, #3a1d12, transparent 60%), radial-gradient(900px 600px at 110% 110%, #24120b, transparent 60%)"],
    konane: ["#03201f", "radial-gradient(1200px 700px at 28% -10%, #0c5a55, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3a2414, transparent 60%)"],
    fanorona: ["#170b06", "radial-gradient(1200px 700px at 28% -10%, #4b2510, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3d1c0b, transparent 60%)"],
    alquerque: ["#14070c", "radial-gradient(1200px 700px at 28% -10%, #4b2510, transparent 60%), radial-gradient(900px 600px at 110% 110%, #3d1c0b, transparent 60%)"],
  };
  const css2d = id => { const b = BG2D[id] || BG2D.chess; return b[1] + ', ' + b[0]; };
  X.css2d = css2d;
  TABLES[1] = (o) => {
    const { TT, g, scene } = o;
    let cur = o.game || 'chess';
    const ao = canvasTex('tbl1-ao', 256, 256, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(0,0,0,.85)'], [.45, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, W); });
    ao.encoding = TT.LinearEncoding;
    const FL = -1.6;
    // a faint warm pool under the board (the 2D pages light their board the same way), so the floating shadow reads on a dark page
    const pt = canvasTex('tbl1-pool', 256, 256, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.5)'], [.75, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, 0, W, W); });
    const pool = new TT.Mesh(new TT.PlaneGeometry(30, 22), new TT.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, toneMapped: false, color: 0x2a2620, blending: TT.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, FL - .02, .5); pool.renderOrder = 0; g.add(pool);
    const blob = new TT.Mesh(new TT.PlaneGeometry(17, 15), new TT.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false, color: 0x000000, opacity: .7 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = FL; blob.renderOrder = 1; g.add(blob);
    const sc = new TT.Mesh(new TT.PlaneGeometry(40, 40), new TT.ShadowMaterial({ opacity: .35 })); sc.rotation.x = -Math.PI / 2; sc.position.y = FL + .01; sc.receiveShadow = true; sc.renderOrder = 2; g.add(sc);
    scene.add(new TT.HemisphereLight(0xf2f4ff, 0x3a3028, .55));
    const key = dirLight(TT, 0xfff8ee, 1.0, [-5, 24, 7], 10); scene.add(key);
    const fill = new TT.DirectionalLight(0xffeedd, .3); fill.position.set(8, 10, 12); scene.add(fill);
    o.css(css2d(cur));
    return {
      bg: null, exp: .84, board: .42, key,
      env: { top: '#c9cdd4', bottom: '#2a2420', panels: [[-8, 16, 6, 12, 7, '#ffffff', 1.5], [10, 10, -6, 8, 6, '#fff4e6', .7], [0, 6, 18, 18, 4, '#ffffff', .35]] },
      onShow(id) { if (id === cur) return; cur = id; o.css(css2d(id)); },
    };
  };
  TABLES[1].plain = { sun: 0xfff8ee, sunI: .78, hemi: [0xf2f4ff, 0x3a3028, .5], exp: .66 };
  TABLES[1].floor = (o) => ({ css: css2d(o.game) });

  /* =====================================================================
     The rooms of places 2..5 (2026-11-07). Each place is a closed room: painted walls (light baked in), a lit floor and a ceiling
     on every side the camera can face, so dragging the view up / down or zooming out never runs off the edge of the picture.
     The table is sized to the boards (the turning go board needs a radius of ~8.6; nothing on the table comes inside ~9.5).
     Scale: 1 unit ≈ 4.5 cm (a chess board is ~9.5). The table top is y = 0; the floor is FL.
     Triangles (PC): every room stays well under the ~60k of the portal's budget (phones: fewer segments, half-size textures).
     ===================================================================== */
  const V2 = (TT, a) => a.map(([x, y]) => new TT.Vector2(x, y));
  const lathe = (TT, pts, seg, mat) => new TT.Mesh(new TT.LatheGeometry(V2(TT, pts), seg), mat);
  // put a mesh into a group: position, an optional turn, shadows (cast by default)
  function at(G, m, x, y, z, ry = 0, cast = true) { m.position.set(x, y, z); if (ry) m.rotation.y = ry; m.castShadow = cast; m.receiveShadow = true; G.add(m); return m; }
  function grp(TT, g, x, y, z, ry = 0) { const G = new TT.Group(); G.position.set(x, y, z); G.rotation.y = ry; g.add(G); return G; }
  const SEG = (o, n) => o.COARSE || o.LITE ? Math.max(6, Math.round(n * .6)) : n;

  // a painted texture in world units: draw(c, ppu) draws with x ∈ [x0, x1] to the right and y ∈ [y0, y1] up; blur(c, px) starts a layer: what follows is drawn sharp on its own canvas and composited with ONE blur when the next layer starts (a canvas filter per small shape is minutes on a phone)
  function ptex(o, key, x0, y0, x1, y1, px, draw) {
    const w = x1 - x0, h = y1 - y0, W = Math.max(64, Math.round(px * Math.max(.5, o.texScale))), H = Math.max(32, Math.min(4096, Math.round(W * h / w)));
    const setup = (cx) => { cx.setTransform(1, 0, 0, 1, 0, 0); cx.scale(W / w, -H / h); cx.translate(-x0, -y1); };
    return canvasTex(key, W, H, (main) => {
      let layer = null, lpx = 0, target = main;
      const flush = () => { if (!layer) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.filter = `blur(${lpx}px)`; main.drawImage(layer.canvas, 0, 0); main.restore(); layer = null; target = main; };
      const P = new Proxy({}, {
        get: (_, k) => { if (k === '__blur') return (bpx) => { flush(); if (bpx > .3) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; layer = cv.getContext('2d'); lpx = bpx; setup(layer); target = layer; } };
          const v = target[k]; return typeof v === 'function' ? v.bind(target) : v; },
        set: (_, k, v) => { target[k] = v; return true; },
      });
      main.save(); setup(main); draw(P, W / w); flush(); main.restore();
    });
  }
  const flat = (TT, tex, w, h, extra) => new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial(Object.assign({ map: tex, toneMapped: false }, extra)));
  // the room's box: back wall (z = zb), left (x = xl) and right (x = xr) walls and the ceiling (y = y1), painted; they run to zf in front
  // (behind the camera at any zoom) and overlap at the corners. Painted walls carry their own light (not tone-mapped, like the old backdrops), times `wb`.
  function roomBox(o, R) {
    const { TT, g } = o, { xl, xr, zb, zf, y0, y1, key } = R, E = 1, px = R.px || 2048, wb = R.wb || 1;
    const add = (tex, w, h) => { const m = flat(TT, tex, w, h); m.material.color.setScalar(wb); g.add(m); return m; };
    if (R.back) { const m = add(ptex(o, key + '-b', xl - E, y0 - E, xr + E, y1 + E, px, R.back), xr - xl + 2 * E, y1 - y0 + 2 * E); m.position.set((xl + xr) / 2, (y0 + y1) / 2, zb); }
    if (R.left) { const m = add(ptex(o, key + '-l', -zf - E, y0 - E, -zb + E, y1 + E, R.pxs || px / 2, R.left), zf - zb + 2 * E, y1 - y0 + 2 * E); m.rotation.y = Math.PI / 2; m.position.set(xl, (y0 + y1) / 2, (zb + zf) / 2); }
    if (R.right) { const m = add(ptex(o, key + '-r', zb - E, y0 - E, zf + E, y1 + E, R.pxs || px / 2, R.right), zf - zb + 2 * E, y1 - y0 + 2 * E); m.rotation.y = -Math.PI / 2; m.position.set(xr, (y0 + y1) / 2, (zb + zf) / 2); }
    if (R.ceil) { const m = add(ptex(o, key + '-c', xl - E, zb - E, xr + E, zf + E, R.pxc || 512, R.ceil), xr - xl + 2 * E, zf - zb + 2 * E); m.rotation.x = Math.PI / 2; m.position.set((xl + xr) / 2, y1, (zb + zf) / 2); }
    if (R.floor) { const m = new TT.Mesh(new TT.PlaneGeometry(xr - xl + 2 * E, zf - zb + 2 * E), R.floor); m.rotation.x = -Math.PI / 2; m.position.set((xl + xr) / 2, y0, (zb + zf) / 2); m.receiveShadow = true; g.add(m); }
  }
  // a soft patch of window light laid on the floor: a faint warm tint (normal blending, low opacity — an additive patch read as white paper
  // on iPhone, and Safari has no canvas blur filter, so the soft edges are drawn with shadowBlur); never merged with other meshes
  function lightPatch(o, x, y, z, w, d, rz, col, panes = [2, 2], op = .14) {
    const { TT, g } = o;
    const sp = canvasTex('patch2-' + panes.join('x'), 256, 192, (c, W, H) => { const [nx, ny] = panes, gx = 14, cw = (W - 40 - gx * (nx - 1)) / nx, ch = (H - 40 - gx * (ny - 1)) / ny;
      c.clearRect(0, 0, W, H); c.shadowColor = '#fff'; c.shadowBlur = 10; c.shadowOffsetX = W; c.fillStyle = '#fff';
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) c.fillRect(20 + i * (cw + gx) - W, 20 + j * (ch + gx), cw, ch); });
    const m = new TT.Mesh(new TT.PlaneGeometry(w, d), new TT.MeshBasicMaterial({ map: sp, transparent: true, opacity: op, depthWrite: false, color: col }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = rz; m.position.set(x, y, z); m.renderOrder = 1; m.userData.keep = 1; g.add(m); return m;
  }
  // a blob of contact shadow under a piece of furniture standing on the floor
  function ao(o, x, y, z, w, d, k = .5) {
    const { TT, g } = o;
    const t = canvasTex('ao-blob', 128, 128, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(0,0,0,1)'], [.55, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, W); });
    const m = new TT.Mesh(new TT.PlaneGeometry(w, d), new TT.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: 0x000000, opacity: k }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + .03, z); m.renderOrder = 1; g.add(m); return m;
  }
  // a tiled texture of the floor: repeat it over the room
  const rep = (TT, t, u, v, rot = 0) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = TT.RepeatWrapping; c.repeat.set(u, v); if (rot) { c.center.set(.5, .5); c.rotation = rot; } return c; };

  /* ---------- the props (tableware, food, books ...) ---------- */
  const glassM = () => M({ color: 0xffffff, roughness: .04, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .26, depthWrite: false });
  function cupSaucer(o, G0, x, z, ry, china, drink = 0x3b1e0e) {
    const TT = o.TT, s = SEG(o, 30), G = grp(TT, G0, x, 0, z, ry), cap = drink === 'cap';
    at(G, lathe(TT, [[0, 0], [1.05, 0], [1.5, .12], [1.62, .24], [1.52, .26], [.9, .14], [0, .14]], s, china), 0, 0, 0);
    if (cap) {   // a wide cappuccino cup, the foam domed over the rim
      at(G, lathe(TT, [[0, .14], [.45, .14], [.52, .2], [.95, .5], [1.2, 1.1], [1.26, 1.52], [1.2, 1.53], [1.14, 1.1], [.9, .52], [0, .4]], s, china), 0, 0, 0);
      const fg = new TT.SphereGeometry(1.2, s, 6, 0, Math.PI * 2, 0, Math.PI / 2), P = fg.attributes.position, U = fg.attributes.uv;
      for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 2.4 + .5, .5 - P.getZ(i) / 2.4);   // seen from above: the picture laid flat
      const fm = new TT.Mesh(fg, M({ map: capFoam(), roughness: .85, bump: false })); fm.scale.set(1, .1, 1); at(G, fm, 0, 1.44, 0, 0, false);
      const h = new TT.Mesh(new TT.TorusGeometry(.36, .09, 6, 12, Math.PI * 1.25), china); h.rotation.z = -Math.PI * .625; at(G, h, 1.36, .9, 0);
      const sp = new TT.Mesh(RB(.14, .05, 2.2, .02, 1), M({ color: 0xd8d8d8, metalness: 1, roughness: .25 })); sp.rotation.y = .5; at(G, sp, -1.1, .3, .6);
      return G;
    }
    at(G, lathe(TT, [[0, .14], [.5, .14], [.56, .2], [.82, .5], [.95, 1.15], [.98, 1.42], [.92, 1.43], [.87, 1.15], [.75, .52], [0, .4]], s, china), 0, 0, 0);
    const lq = new TT.Mesh(new TT.CircleGeometry(.88, s), M({ color: drink, roughness: .12, clearcoat: .6 })); lq.rotation.x = -Math.PI / 2; at(G, lq, 0, 1.24, 0, 0, false);
    const h = new TT.Mesh(new TT.TorusGeometry(.33, .085, 6, 12, Math.PI * 1.25), china); h.rotation.z = -Math.PI * .625; at(G, h, 1.1, .85, 0);
    if (drink === 0x3b1e0e) { const cr = new TT.Mesh(new TT.RingGeometry(.55, .82, s), M({ color: 0xb98a5a, roughness: .5, transparent: true, opacity: .55 })); cr.rotation.x = -Math.PI / 2; at(G, cr, 0, 1.245, 0, 0, false); }   // the crema's ring
    const sp = new TT.Mesh(RB(.14, .05, 2.2, .02, 1), M({ color: 0xd8d8d8, metalness: 1, roughness: .25 })); sp.rotation.y = .5; at(G, sp, -.95, .3, .55);
    return G;
  }
  function plate(o, G, x, z, r, mat, y = 0) { const p = lathe(o.TT, [[0, 0], [r * .62, 0], [r * .66, .07], [r * .9, .14], [r, .26], [r * .97, .28], [r * .86, .2], [r * .62, .12], [0, .12]], SEG(o, 36), mat); return at(G, p, x, y, z); }
  function wineGlass(o, G0, x, z, wine) {
    const TT = o.TT, s = SEG(o, 24), G = grp(TT, G0, x, 0, z);
    at(G, lathe(TT, [[0, 0], [.95, 0], [.98, .05], [.12, .12], [.08, .2], [.08, 2.3], [.3, 2.55], [.78, 3.0], [.92, 3.6], [.8, 4.4], [.77, 4.4], [.88, 3.6], [.74, 3.02], [0, 2.62]], s, glassM()), 0, 0, 0, 0, false);
    if (wine) at(G, lathe(TT, [[0, 2.64], [.3, 2.66], [.66, 2.98], [.8, 3.4], [0, 3.4]], s, M({ color: wine, roughness: .05, clearcoat: 1, transparent: true, opacity: .9 })), 0, 0, 0, 0, false);
    return G;
  }
  function bottle(o, G0, x, z, glassCol, labelCol, ry = 0) {
    const TT = o.TT, s = SEG(o, 24), G = grp(TT, G0, x, 0, z, ry);
    at(G, lathe(TT, [[0, 0], [.85, 0], [.88, .1], [.88, 4.2], [.8, 4.7], [.38, 5.6], [.3, 6.6], [.34, 6.7], [.34, 7.3], [0, 7.3]], s, M({ color: glassCol, roughness: .08, clearcoat: 1, clearcoatRoughness: .05 })), 0, 0, 0);
    const lb = new TT.Mesh(new TT.CylinderGeometry(.895, .895, 2.2, s, 1, true, -1.3, 2.6), M({ map: canvasTex('label-' + labelCol, 256, 128, (c, W, H) => { c.fillStyle = labelCol; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(120,90,40,.8)'; c.lineWidth = 3; c.strokeRect(10, 10, W - 20, H - 20); c.fillStyle = '#5a2a20'; c.fillRect(W * .3, H * .38, W * .4, 9); c.fillStyle = 'rgba(80,60,40,.6)'; c.fillRect(W * .36, H * .58, W * .28, 5); c.fillRect(W * .4, H * .68, W * .2, 4); }), roughness: .7 }));
    at(G, lb, 0, 2.6, 0, 0, false);
    at(G, new TT.Mesh(new TT.CylinderGeometry(.36, .36, .7, s), M({ color: 0x5a1420, roughness: .5, metalness: .3 })), 0, 7.0, 0, 0, false);   // the foil
    return G;
  }
  function candle(o, G0, x, z, lit, light) {
    const TT = o.TT, s = SEG(o, 20), G = grp(TT, G0, x, 0, z), brass = M({ color: 0xc9a25a, metalness: 1, roughness: .3 });
    at(G, lathe(TT, [[0, 0], [1.05, 0], [1.1, .15], [.5, .4], [.28, .7], [.3, 2.6], [.55, 2.8], [.6, 3.0], [0, 3.0]], s, brass), 0, 0, 0);
    at(G, new TT.Mesh(new TT.CylinderGeometry(.36, .38, 4.2, s), M({ color: 0xf3ecdc, roughness: .6, emissive: new TT.Color(lit ? 0x2a1a08 : 0) })), 0, 5.1, 0);
    if (lit) {
      const f = new TT.Mesh(new TT.SphereGeometry(.16, 8, 6), new TT.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false })); f.scale.set(1, 2.4, 1); at(G, f, 0, 7.6, 0, 0, false);
      const halo = new TT.Mesh(new TT.PlaneGeometry(2.6, 2.6), new TT.MeshBasicMaterial({ map: canvasTex('flame-halo', 64, 64, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(255,214,140,.9)'], [.25, 'rgba(255,170,80,.35)'], [1, 'rgba(255,150,60,0)']]); c.fillRect(0, 0, W, W); }), transparent: true, depthWrite: false, blending: TT.AdditiveBlending, toneMapped: false }));
      halo.userData.keep = 1; at(G, halo, 0, 7.6, 0, 0, false); halo.onBeforeRender = (r, s2, cam) => { halo.quaternion.copy(cam.quaternion); };
      if (light && !o.COARSE) { const L = new TT.PointLight(0xffb062, .55, 22, 2); L.position.set(0, 8.2, 0); G.add(L); }
    }
    return G;
  }
  function croissant(o, G0, x, y, z, ry, mat) {
    const TT = o.TT, G = grp(TT, G0, x, y, z, ry), sg = new TT.SphereGeometry(1, SEG(o, 14), SEG(o, 10));
    for (let i = 0; i < 11; i++) { const t = i / 10 - .5, a = t * 2.6, r = .66 - Math.pow(Math.abs(t) * 2, 1.4) * .46; const m = new TT.Mesh(sg, mat); m.scale.set(r * .62, r * .8, r * 1.1); m.rotation.y = a; at(G, m, Math.sin(a) * 1.3, r * .7, Math.cos(a) * 1.3 - 1.3); }
    return G;
  }
  function tumbler(o, G0, x, z, fill, h = 2.6, r = .85) {
    const TT = o.TT, s = SEG(o, 24), G = grp(TT, G0, x, 0, z);
    at(G, lathe(TT, [[0, 0], [r * .92, 0], [r, .1], [r * 1.05, h], [r * .99, h], [r * .94, .32], [0, .3]], s, glassM()), 0, 0, 0, 0, false);
    if (fill) at(G, new TT.Mesh(new TT.CylinderGeometry(r * .97, r * .92, h * fill[1], s), M({ color: fill[0], roughness: .05, clearcoat: 1, transparent: true, opacity: fill[2] || .78, depthWrite: !fill[2] })), 0, .31 + h * fill[1] / 2, 0, 0, false);   // fill[2]: a see-through spirit (whisky, brandy)
    return G;
  }
  // a brandy snifter: a short stem, a wide bowl narrowing to the rim; a finger of see-through amber in the bottom
  function snifter(o, G0, x, z, col = 0xa8561a, lvl = 1) {
    const TT = o.TT, s = SEG(o, 28), G = grp(TT, G0, x, 0, z);
    at(G, lathe(TT, [[0, 0], [1.05, 0], [1.08, .06], [.14, .16], [.1, .3], [.1, .9], [.4, 1.04], [1.05, 1.5], [1.42, 2.3], [1.38, 3.1], [1.06, 3.8], [.98, 4.05], [.95, 4.05], [1.02, 3.8], [1.33, 3.1], [1.37, 2.3], [1, 1.54], [.38, 1.12], [0, 1.08]], s, glassM()), 0, 0, 0, 0, false);
    const top = 1.6 + .55 * lvl, rAt = y => y < 1.54 ? .38 + (y - 1.12) / .42 * .62 : 1 + (Math.min(y, 2.3) - 1.54) / .76 * .36;
    const liq = M({ color: col, roughness: .04, clearcoat: 1, transparent: true, opacity: .5, depthWrite: false });
    at(G, lathe(TT, [[0, 1.12], [.36, 1.13], [.95, 1.55], [rAt(top) - .05, top], [0, top]], s, liq), 0, 0, 0, 0, false);
    return G;
  }
  // a stem between two points (flowers in a vase: every stem starts inside the neck)
  function rod(TT, mat, a, b, r) { const v = new TT.Vector3().subVectors(b, a), L = v.length(), m = new TT.Mesh(new TT.CylinderGeometry(r, r * 1.25, L, 5), mat); m.position.copy(a).addScaledVector(v, .5); m.quaternion.setFromUnitVectors(new TT.Vector3(0, 1, 0), v.normalize()); return m; }
  // flowers in a vase standing at (x, 0, z) in G: stems rise from inside the neck (ny: the rim's height, nr: its inner radius) and fan out;
  // head(Gh, i) draws one bloom at the top of a stem, turned along it
  function bouquet(o, G0, x, z, ny, nr, n, len, fan, stemCol, head, seed = 3) {
    const TT = o.TT, G = grp(TT, G0, x, 0, z), st = M({ color: stemCol, roughness: .7 }), R = rng(seed), up = new TT.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      // each stem: straight up inside the neck to the mouth, then out through the mouth to its bloom (never through the vase's wall)
      const a = i * 2.4 + R() * .6, k = n > 1 ? .45 + .55 * (i % 3) / 2 : 0, rr = nr * (.25 + .5 * (i % 3) / 2);
      const b = new TT.Vector3(Math.cos(a) * rr * .5, ny - 1.6, Math.sin(a) * rr * .5), m = new TT.Vector3(Math.cos(a) * rr, ny + .05, Math.sin(a) * rr);
      const t = new TT.Vector3(Math.cos(a) * (rr + fan * k), ny + len * (.78 + R() * .3) - k * .6, Math.sin(a) * (rr + fan * k));
      G.add(rod(TT, st, b, m, .045)); G.add(rod(TT, st, m, t, .045));
      const Gh = new TT.Group(); Gh.position.copy(t); Gh.quaternion.setFromUnitVectors(up, t.clone().sub(m).normalize()); G.add(Gh); head(Gh, i);
    }
    return G;
  }
  // a cup of cappuccino: the milk foam (a heart poured into a ring of crema) domed just over the rim
  const capFoam = () => canvasTex('cappuccino-foam', 128, 128, (c, W) => {
    c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, '#f4eadb'], [.55, '#efe0c8'], [.8, '#b98656'], [1, '#8a5428']]); c.fillRect(0, 0, W, W);
    c.fillStyle = '#9a6234'; c.beginPath(); c.arc(W / 2, W / 2, W * .36, 0, 7); c.fill();
    c.fillStyle = '#fbf4e8'; c.beginPath(); c.moveTo(W / 2, W * .78); c.bezierCurveTo(W * .12, W * .5, W * .26, W * .2, W / 2, W * .4); c.bezierCurveTo(W * .74, W * .2, W * .88, W * .5, W / 2, W * .78); c.fill();
    c.strokeStyle = 'rgba(251,244,232,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, W * .3); c.lineTo(W / 2, W * .74); c.stroke();
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(110,60,25,${.15 + Math.random() * .25})`; const a = Math.random() * 6.3, r = Math.random() * W * .47; c.fillRect(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r, 1.5, 1.5); }   // a dusting of cocoa
  });
  // an antipasto board (2026-11-07, more appetising): draped prosciutto, fanned salami (fat, peppercorns), a wedge of manchego with its
  // basket-weave rind, a wedge of brie with its white bloom, olives, a bunch of grapes, figs cut open, grissini, rosemary — on an olive-wood board
  function antipasti(o, G0, x, z, ry, sc = 1) {
    const TT = o.TT, G = grp(TT, G0, x, 0, z, ry), R = rng(77); G.scale.setScalar(sc);
    at(G, new TT.Mesh(RB(6.6, .4, 4.2, .2, 2), M({ map: wood('antipasti-board', '#c9a26e', '#8a6438', 256, 256, .9), roughness: .5, clearcoat: .25 })), 0, .2, 0);
    // salami: deep red with white fat, black pepper, a thin casing
    const salT = canvasTex('salami2', 128, 128, (c, W) => { const C = W / 2, r2 = rng(5); c.fillStyle = '#8e1c24'; c.fillRect(0, 0, W, W);
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${120 + r2() * 60 | 0},${16 + r2() * 20 | 0},${24 + r2() * 20 | 0},.6)`; c.fillRect(r2() * W, r2() * W, 3, 3); }
      for (let i = 0; i < 46; i++) { const px = r2() * W, py = r2() * W, s = 2 + r2() * 4; c.fillStyle = `rgba(250,${226 + r2() * 20 | 0},${214 + r2() * 20 | 0},.95)`; c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * 1.05 + r2() * .4; c.lineTo(px + Math.cos(a) * s * (.6 + r2() * .6), py + Math.sin(a) * s * (.6 + r2() * .6)); } c.fill(); }
      c.fillStyle = '#1a1210'; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(r2() * W, r2() * W, 1.6, 0, 7); c.fill(); }
      c.globalCompositeOperation = 'destination-in'; c.beginPath(); c.arc(C, C, C - 1, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
      c.strokeStyle = '#4a1418'; c.lineWidth = 4; c.beginPath(); c.arc(C, C, C - 3, 0, 7); c.stroke(); });
    const salM = M({ map: salT, roughness: .38, clearcoat: .45, clearcoatRoughness: .3, bump: false }), salE = M({ color: 0x5a161a, roughness: .55 }), sg = new TT.CylinderGeometry(.62, .62, .08, SEG(o, 20));
    for (let i = 0; i < 7; i++) { const m = new TT.Mesh(sg, [salE, salM, salM]); m.rotation.set(.1, i * .9, -.36); at(G, m, -2.55 + i * .36, .48 + i * .06, -1.25 + Math.sin(i) * .08); }
    // prosciutto: thin rosy ribbons with a white fat edge, draped in loose folds
    const proT = canvasTex('prosciutto', 128, 64, (c, W, H) => { const r2 = rng(9); const g2 = c.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, '#f6e6dc'); g2.addColorStop(.16, '#f2d2c4'); g2.addColorStop(.24, '#d86a64'); g2.addColorStop(1, '#c4525a'); c.fillStyle = g2; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(250,${200 + r2() * 40 | 0},${200 + r2() * 30 | 0},${.25 + r2() * .3})`; c.lineWidth = .8; c.beginPath(); const y0 = H * .3 + r2() * H * .65; c.moveTo(r2() * W, y0); c.quadraticCurveTo(r2() * W, y0 + (r2() - .5) * 12, r2() * W, y0 + (r2() - .5) * 8); c.stroke(); } });
    const proM = M({ map: proT, roughness: .42, clearcoat: .35, clearcoatRoughness: .4, side: TT.DoubleSide, bump: false });
    for (let i = 0; i < 3; i++) { const geo = new TT.PlaneGeometry(2.4, .8, SEG(o, 18), 2), P = geo.attributes.position;
      for (let k = 0; k < P.count; k++) { const u = P.getX(k), v = P.getY(k); P.setZ(k, .22 * Math.sin(u * 3.4 + i) + .05 * Math.sin(v * 6 + u * 5)); P.setY(k, v * (.85 + .15 * Math.cos(u * 3.4 + i))); }
      geo.computeVertexNormals(); const m = new TT.Mesh(geo, proM); m.rotation.set(-Math.PI / 2 + .08, 0, .5 + i * .45); at(G, m, -2.05 + i * .32, .66 + i * .05, .85 + i * .28 - (i === 2 ? .2 : 0), 0, false); }
    // the cheeses: a sector of a wheel — paste on the cut faces, the rind as a band round the outside
    const sector = (px, pz, rot, r, h, ang, paste, rind, top = paste) => { const Gc = grp(TT, G, px, .4, pz, rot), sh = new TT.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, -ang / 2, ang / 2, false); sh.lineTo(0, 0);
      const m = new TT.Mesh(new TT.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 8 }), [top, paste]); m.rotation.x = -Math.PI / 2; at(Gc, m, 0, 0, 0);
      const band = new TT.Mesh(new TT.CylinderGeometry(r + .02, r + .02, h + .02, 10, 1, true, Math.PI / 2 - ang / 2, ang), rind); at(Gc, band, 0, h / 2, 0, 0, false); return Gc; };
    const manT = canvasTex('manchego', 64, 64, (c, W) => { const r2 = rng(3); c.fillStyle = '#e8c870'; c.fillRect(0, 0, W, W); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(${r2() > .5 ? '255,250,220' : '210,180,110'},.5)`; c.beginPath(); c.arc(r2() * W, r2() * W, .6 + r2() * 1.4, 0, 7); c.fill(); } });
    const rindT = canvasTex('manchego-rind', 128, 32, (c, W, H) => { c.fillStyle = '#6a5a3a'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(30,24,14,.6)'; c.lineWidth = 1.2; for (let x = -H; x < W; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); c.beginPath(); c.moveTo(x + H, 0); c.lineTo(x, H); c.stroke(); } });
    sector(.5, -.85, 2.6, 1.55, .8, .62, M({ map: manT, roughness: .62, bump: false, color: 0xf0d88a }), M({ map: rindT, roughness: .7, bumpScale: .02 }));
    const brieIn = M({ color: 0xf6e9c0, roughness: .45, clearcoat: .2 }), bloom = M({ color: 0xf8f6ee, roughness: .9 });
    sector(.95, .75, -2.4, 1.9, .55, .7, brieIn, bloom, bloom);
    for (let i = 0; i < 6; i++) { const cr = new TT.Mesh(RB(.75, .07, .75, .05, 1), M({ color: 0xe2b874, roughness: .7 })); cr.rotation.set(.05, i * .2, -.2); at(G, cr, .25 + i * .14, .44 + i * .05, 1.55); }   // crackers, leaning in a row
    // olives in a bowl, glossy
    { const Gb = grp(TT, G, 2.35, .4, -1.05); at(Gb, lathe(TT, [[0, 0], [.55, 0], [.9, .4], [.95, .62], [.85, .62], [.5, .2], [0, .18]], SEG(o, 18), M({ color: 0xf2efe8, roughness: .3, clearcoat: .5 })), 0, 0, 0);
      const ol = M({ color: 0x6a7a2a, roughness: .18, clearcoat: .9 }), ob = M({ color: 0x2a1622, roughness: .18, clearcoat: .9 }), og = new TT.SphereGeometry(.22, 10, 8); for (let i = 0; i < 10; i++) { const a = i * 2.4, r = Math.sqrt(i / 10) * .6; const m = new TT.Mesh(og, i % 3 ? ol : ob); m.scale.set(1, .85, 1.35); m.rotation.y = a; at(Gb, m, Math.cos(a) * r, .38 + (i > 6 ? .16 : 0), Math.sin(a) * r); } }
    // grapes: a bunch on its stalk, the dusty bloom on the skins
    { const gr = M({ color: 0x5a2448, roughness: .5, clearcoat: .35, clearcoatRoughness: .5, sheen: new TT.Color(0x9a8aa8) }), gg = new TT.SphereGeometry(.23, 12, 9), Gg = grp(TT, G, 2.35, .62, .85, .4);
      for (let i = 0; i < 18; i++) { const t = i / 18, r = .55 * (1 - t * .7), a = i * 2.39; at(Gg, new TT.Mesh(gg, gr), -.7 + t * 1.6, (i % 3) * .12 + (1 - t) * .1, Math.sin(a) * r); }
      const stalk = new TT.Mesh(new TT.CylinderGeometry(.03, .04, 1.4, 4), M({ color: 0x6a5a34, roughness: .8 })); stalk.rotation.z = Math.PI / 2; at(Gg, stalk, .4, .3, 0, 0, false); }
    // figs, halved: purple skin, a red heart full of seeds
    { const figIn = M({ map: canvasTex('fig-cut', 64, 64, (c, W) => { const C = W / 2, r2 = rng(4); c.fillStyle = '#f4e6c8'; c.fillRect(0, 0, W, W); c.fillStyle = rad(c, C, C * 1.05, C * .8, [[0, '#a8202e'], [.6, '#c83a3a'], [1, '#f0b0a0']]); c.beginPath(); c.ellipse(C, C * 1.05, C * .7, C * .8, 0, 0, 7); c.fill(); c.fillStyle = '#f6dca0'; for (let i = 0; i < 40; i++) { const a = r2() * 6.3, rr = r2() * C * .6; c.fillRect(C + Math.cos(a) * rr, C * 1.05 + Math.sin(a) * rr * 1.1, 1.6, 1.6); } c.strokeStyle = '#6a2a4a'; c.lineWidth = 3; c.beginPath(); c.ellipse(C, C, C - 2, C - 2, 0, 0, 7); c.stroke(); }), roughness: .4, clearcoat: .4, bump: false });
      const skin = M({ color: 0x4a2a44, roughness: .55 });
      [[-.55, 1.55, .3], [-.05, 1.7, -.5]].forEach(([px, pz, r]) => { const Gf = grp(TT, G, px, .4, pz, r); const half = new TT.Mesh(new TT.SphereGeometry(.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), skin); half.scale.set(1, .9, 1.15); half.rotation.x = -Math.PI / 2; at(Gf, half, 0, .42, 0);
        const face = new TT.Mesh(new TT.CircleGeometry(.42, 16), figIn); face.scale.set(1, 1.15, 1); face.rotation.x = -Math.PI / 2 + .9; at(Gf, face, 0, .42, .02, 0, false); }); }
    // grissini and a sprig of rosemary
    { const gT = canvasTex('grissini', 16, 64, (c, W, H) => { c.fillStyle = '#e2b26a'; c.fillRect(0, 0, W, H); for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(${Math.random() > .5 ? '170,110,50' : '250,230,190'},.6)`; c.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); } });
      const gs = M({ map: gT, roughness: .7, bump: false }); for (let i = 0; i < 3; i++) { const s = new TT.Mesh(new TT.CylinderGeometry(.07, .08, 3.6, 6), gs); s.rotation.set(0, -.12 * i, Math.PI / 2 + .03 * i); at(G, s, -1.6, .5 + (i === 2 ? .15 : 0), -1.95 + i * .16, 0, false); }
      const rl = M({ color: 0x3a5a2e, roughness: .6 }), Gr = grp(TT, G, -2.6, .45, 1.6, .7); for (let k = 0; k < 9; k++) { const l = new TT.Mesh(new TT.SphereGeometry(.12, 5, 3), rl); l.scale.set(.3, .2, 1.3); l.rotation.y = k % 2 ? .6 : -.6; at(Gr, l, -.6 + k * .14, 0, 0, 0, false); } }
    return G;
  }
  // a Neapolitan margherita (2026-11-07, more appetising): a puffed, leopard-spotted cornicione, a glossy tomato base, pools of melted
  // fior di latte browning at the edges, basil leaves, a thread of olive oil; cut in eight
  function pizza(o, G, r) {
    const TT = o.TT, S = sz(o, 512);
    const top = canvasTex('pizza2', S, S, (c, W) => { const C = W / 2, R2 = rng(21), u = W / (2 * r);
      c.fillStyle = '#e8b878'; c.fillRect(0, 0, W, W);
      c.fillStyle = rad(c, C, C, C * .86, [[0, '#a8180c'], [.75, '#9a160a'], [.95, '#8a1c0c'], [1, '#c87a3a']]); c.beginPath(); c.arc(C, C, C * .84, 0, 7); c.fill();
      for (let i = 0; i < 500; i++) { const a = R2() * 6.3, rr = Math.sqrt(R2()) * C * .82; c.fillStyle = `rgba(${R2() > .5 ? '220,70,40' : '120,16,10'},${.15 + R2() * .25})`; c.beginPath(); c.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 1 + R2() * 4, 0, 7); c.fill(); }
      for (let i = 0; i < 9; i++) { const a = i * .7 + R2(), rr = (.2 + R2() * .55) * C, x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr, s = (.11 + R2() * .07) * W;   // melted mozzarella
        c.fillStyle = rad(c, x, y, s, [[0, '#fffaf0'], [.6, '#f6ead2'], [.85, 'rgba(236,200,150,.85)'], [1, 'rgba(200,120,60,0)']]); c.beginPath(); for (let k = 0; k < 10; k++) { const b = k * .63, q = s * (.75 + R2() * .3); c.lineTo(x + Math.cos(b) * q, y + Math.sin(b) * q); } c.fill();
        c.fillStyle = 'rgba(200,140,70,.35)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (R2() - .5) * s, y + (R2() - .5) * s, s * .12, 0, 7); c.fill(); } }
      c.fillStyle = 'rgba(255,190,60,.18)'; for (let i = 0; i < 18; i++) { const a = R2() * 6.3, rr = R2() * C * .75; c.beginPath(); c.ellipse(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 6 + R2() * 10, 3 + R2() * 5, R2() * 3, 0, 7); c.fill(); }   // olive oil
      c.strokeStyle = 'rgba(70,20,10,.45)'; c.lineWidth = Math.max(1, W / 256); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4 + .2; c.beginPath(); c.moveTo(C - Math.cos(a) * C * .9, C - Math.sin(a) * C * .9); c.lineTo(C + Math.cos(a) * C * .9, C + Math.sin(a) * C * .9); c.stroke(); }
      c.fillStyle = 'rgba(30,60,20,.6)'; for (let i = 0; i < 40; i++) c.fillRect(C + (R2() - .5) * C * 1.5, C + (R2() - .5) * C * 1.5, 1.5, 1.5); });
    const base = new TT.Mesh(new TT.CylinderGeometry(r * .9, r * .9, .12, SEG(o, 40)), [M({ color: 0xe0a860, roughness: .7 }), M({ map: top, roughness: .5, bumpScale: .004 }), M({ color: 0xd89a50, roughness: .7 })]);
    at(G, base, 0, .43, 0);
    const crustT = canvasTex('cornicione', 256, 64, (c, W, H) => { const R2 = rng(13); const g2 = c.createLinearGradient(0, 0, 0, H); g2.addColorStop(0, '#d89048'); g2.addColorStop(.35, '#ecc078'); g2.addColorStop(.6, '#f2d098'); g2.addColorStop(1, '#c88440'); c.fillStyle = g2; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = R2() * W, y = H * .15 + R2() * H * .55, s = 1.5 + R2() * 4; c.fillStyle = rad(c, x, y, s * 1.6, [[0, 'rgba(30,14,6,.9)'], [.5, 'rgba(70,34,12,.6)'], [1, 'rgba(120,60,20,0)']]); c.fillRect(x - s * 2, y - s * 2, s * 4, s * 4); }   // leopard spotting
      for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,240,210,.35)'; c.fillRect(R2() * W, R2() * H, 1.5, 1.5); } });
    crustT.wrapS = TT.RepeatWrapping;
    const ringG = new TT.TorusGeometry(r * .9, .3, SEG(o, 10), SEG(o, 48)), P = ringG.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), a = Math.atan2(y, x), k = 1 + .14 * Math.sin(a * 7 + 1) * Math.sin(a * 3) + .06 * Math.sin(a * 17); const cx = Math.cos(a) * r * .9, cy = Math.sin(a) * r * .9; P.setXY(i, cx + (x - cx) * k, cy + (y - cy) * k); P.setZ(i, P.getZ(i) * k * 1.1); }
    ringG.computeVertexNormals();
    const ring = new TT.Mesh(ringG, M({ map: crustT, roughness: .6, bumpScale: .02 })); ring.rotation.x = -Math.PI / 2; ring.scale.set(1, 1, .82); at(G, ring, 0, .6, 0);
    const moz = M({ color: 0xf4e6cc, roughness: .55 }), mg = new TT.SphereGeometry(.36, SEG(o, 16), 5, 0, Math.PI * 2, 0, Math.PI / 2), R3 = rng(21);
    for (let i = 0; i < 5; i++) { const a = i * .7 + R3(), rr = (.2 + R3() * .55) * r * .84; R3(); const m = new TT.Mesh(mg, moz); m.scale.set(1.1 + R3() * .5, .13, .9 + R3() * .5); m.rotation.y = R3() * 3; at(G, m, Math.cos(a) * rr, .49, Math.sin(a) * rr); }
    const basil = M({ color: 0x2c6a24, roughness: .3, clearcoat: .7, side: TT.DoubleSide }), bg = new TT.SphereGeometry(.3, 14, 6);
    [[.4, .2, .3], [-.9, .6, 1.4], [.9, -1, 2.4], [-.4, -1.2, 4], [1.3, .8, 5]].forEach(([px, pz, a]) => { const l = new TT.Mesh(bg, basil); l.scale.set(.75, .08, 1.35); l.rotation.set(.08, a, 0); at(G, l, px, .56, pz, 0, false); });
    return G;
  }
  function ice(o, G, x, y, z, n) { const m = M({ color: 0xffffff, roughness: .05, clearcoat: 1, transparent: true, opacity: .45, depthWrite: false }); for (let i = 0; i < n; i++) { const c = new (o.TT.Mesh)(RB(.62, .62, .62, .1, 1), m); c.rotation.set(i * .7, i * 1.3, i * .4); at(G, c, x + Math.sin(i * 2.4) * .3, y + i * .22, z + Math.cos(i * 2.4) * .3, 0, false); } }
  const pageTex = () => canvasTex('pages-edge', 64, 64, (c, W, H) => { c.fillStyle = '#efe6d0'; c.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 2) { c.fillStyle = `rgba(150,130,100,${.08 + Math.random() * .14})`; c.fillRect(0, y, W, 1); } });
  // a hardback lying flat: covers, the page block, a rounded spine with gilt bands; w along x (the spine at −x), d along z, h thick
  function book(o, G0, x, y, z, ry, w, d, h, col, gilt = true) {
    const TT = o.TT, G = grp(TT, G0, x, y, z, ry), cov = M({ map: X.cloth('bookcloth-' + col, col, 22, 256), roughness: .62, bumpScale: .004 });
    // (2026-11-07) the boards overhang the page block a little on three sides; the spine is a solid rounded back joining both boards
    // (it was an open half-tube that showed as a loose flap at each end)
    const pg = M({ map: pageTex(), roughness: .85, bump: false }), T2 = .1, SQ = .16;
    at(G, new TT.Mesh(RB(w - SQ, h - 2 * T2, d - 2 * SQ, .02, 1), pg), -SQ / 2, h / 2, 0);
    [T2 / 2, h - T2 / 2].forEach(yy => at(G, new TT.Mesh(RB(w, T2, d, .03, 1), cov), 0, yy, 0));
    const sp = new TT.Mesh(new TT.CylinderGeometry(h / 2, h / 2, d, SEG(o, 14), 1, false, Math.PI, Math.PI), [M({ map: canvasTex('spine-' + col + (gilt ? 'g' : ''), 64, 256, (c, W, H) => { c.fillStyle = col; c.fillRect(0, 0, W, H); if (gilt) { c.fillStyle = '#c8a050'; [.12, .16, .84, .88].forEach(k => c.fillRect(0, H * k, W, H * .012)); c.fillRect(0, H * .44, W, H * .1); c.fillStyle = col; c.fillRect(0, H * .455, W, H * .07); } }), roughness: .6 }), cov, cov]);
    sp.rotation.x = Math.PI / 2; sp.scale.set(.42, 1, 1); at(G, sp, -w / 2 + .01, h / 2, 0);   // a gently rounded back (not a full half-round)
    return G;
  }
  // leaves on stems (a fiddle-leaf fig / an olive): textured quads, cut out
  function leafTex(key, a, b) { return canvasTex(key, 128, 128, (c, W) => { c.clearRect(0, 0, W, W); const g2 = c.createLinearGradient(0, 0, W, 0); g2.addColorStop(0, a); g2.addColorStop(1, b); c.fillStyle = g2; c.beginPath(); c.moveTo(W / 2, 4); c.bezierCurveTo(W * .98, W * .25, W * .9, W * .85, W / 2, W - 4); c.bezierCurveTo(W * .1, W * .85, W * .02, W * .25, W / 2, 4); c.fill(); c.strokeStyle = 'rgba(220,240,190,.45)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, 8); c.lineTo(W / 2, W - 8); c.stroke(); c.lineWidth = 1; for (let i = 1; i < 6; i++) { const y = W * i / 6.5; c.beginPath(); c.moveTo(W / 2, y); c.lineTo(W * .2, y - W * .1); c.moveTo(W / 2, y); c.lineTo(W * .8, y - W * .1); c.stroke(); } }); }
  function foliage(o, G, n, cx, cy, cz, rx, ry, rz, tex, s0, seed, tint = 0xffffff) {
    const TT = o.TT, R = rng(seed), mat = new TT.MeshStandardMaterial({ map: tex, alphaTest: .5, side: TT.DoubleSide, roughness: .65, color: tint }), geo = new TT.PlaneGeometry(1, 1);
    for (let i = 0; i < n; i++) { const m = new TT.Mesh(geo, mat), s = s0 * (.7 + R() * .6); m.scale.set(s * .8, s, 1); m.rotation.set((R() - .5) * 2.2, R() * 6.3, (R() - .5) * 1.2); m.position.set(cx + (R() - .5) * 2 * rx, cy + (R() - .5) * 2 * ry, cz + (R() - .5) * 2 * rz); m.castShadow = true; G.add(m); }
  }
  function potPlant(o, G0, x, z, y, s, potMat, leaf, seed) {
    const TT = o.TT, G = grp(TT, G0, x, y, z);
    at(G, lathe(TT, [[0, 0], [2.6 * s, 0], [3.2 * s, 5.2 * s], [3.45 * s, 5.3 * s], [3.45 * s, 6 * s], [3.1 * s, 6 * s], [0, 5.6 * s]], SEG(o, 24), potMat), 0, 0, 0);
    const trunk = M({ color: 0x6b5236, roughness: .8 });
    [[0, 0], [.6, -.4], [-.5, .3]].forEach(([a, b], i) => { const t = new TT.Mesh(new TT.CylinderGeometry(.12 * s, .2 * s, (16 - i * 3) * s, 6), trunk); t.rotation.set(b * .25, 0, -a * .25); at(G, t, a * 1.5 * s, (5.6 + (8 - i * 1.5)) * s, b * 1.5 * s); });
    foliage(o, G, o.COARSE ? 40 : 64, 0, 18 * s, 0, 4.6 * s, 6.5 * s, 4.6 * s, leaf, 3.4 * s, seed);
    return G;
  }

  /* ---------- the time of day of the places that follow it (ダイニング・テラス) ---------- */
  const TOD = (o) => ['morning', 'day', 'evening', 'night'].includes(o.tod) ? o.tod : 'day';

  /* ---------- 2 · ダイニング: an oak table sized for the board in a dining room, morning ... night ---------- */
  const oak = o => X.planks('tbl2-oak', '#d6b284', '#9a6c40', 5, sz(o, 2048));
  const DIN = {   // wall tint (multiply), the window's view, the key light, ambient, exposure, the board's light
    morning: { tint: '#fff3e6', glow: 'rgba(255,236,210,.55)', sky: ['#bcd8f2', '#f8e6cf'], trees: '#7d9a6a', key: [0xffe4c0, 1.5, [-34, 15, -8]], hemi: [0xe8eefa, 0xb08a62, .42], exp: .74, board: .26, patch: 0x1a150c },
    day: { tint: '#ffffff', glow: 'rgba(255,255,250,.45)', sky: ['#8cc2ee', '#e2f1fb'], trees: '#6f9a5c', key: [0xfff6ea, 1.45, [-24, 26, -4]], hemi: [0xf2f4fb, 0xb8976c, .44], exp: .72, board: .24, patch: 0x181612 },
    evening: { tint: '#f6dcc0', glow: 'rgba(255,190,120,.5)', sky: ['#e9a07a', '#ffd59a'], trees: '#5d5a3a', key: [0xffb36e, 1.35, [-36, 8, -10]], hemi: [0xffd8b8, 0x7a4c30, .38], exp: .78, board: .3, patch: 0x241406 },
    night: { tint: '#9c8a7c', glow: 'rgba(255,196,130,.55)', sky: ['#0b1328', '#1d2a4c'], trees: '#0c1418', key: [0xffd2a0, 3.6, [0, 25, 1]], hemi: [0x55607e, 0x2a1c12, .3], exp: .86, board: .44, patch: 0 },
  };
  TABLES[2] = (o) => {
    const { TT, g, scene } = o, T = TOD(o), D = DIN[T], FL = -16, Z0 = 1;
    const pk = oak(o);
    // the table: 28 × 21 (≈ 1.25 × 0.95 m: the board and a few things round it), oak top on a recessed apron and four tapered legs
    const top = M({ map: pk, roughness: .5, clearcoat: .22, clearcoatRoughness: .42, bumpScale: .0025 });
    at(g, new TT.Mesh(RB(28, 1.3, 21, .45, 3), top), 0, -.65, Z0, 0, false).receiveShadow = true;
    const legM = M({ map: wood('tbl2-leg', '#c9a070', '#8a5e34', sz(o, 256), sz(o, 512), .7), roughness: .5, clearcoat: .15 });
    at(g, new TT.Mesh(RB(23.4, 1.8, 16.4, .2, 1), legM), 0, -2.2, Z0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz2]) => { const l = new TT.Mesh(new TT.CylinderGeometry(.75, .5, 14.7, SEG(o, 10)), legM); l.rotation.set(sz2 * .03, 0, -sx * .03); at(g, l, sx * 11.8, FL + 7.35, Z0 + sz2 * 8.2); });
    // the rug under it and the floor
    const rugT = canvasTex('tbl2-rug', sz(o, 1024), sz(o, 768), (c, W, H) => { const N = makeNoise(9), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (N(x / 1.5, y / 1.5, 2) - .5) * 26 + ((x + y) % 4 < 2 ? 5 : -5), i = (y * W + x) * 4; d[i] = 214 + k; d[i + 1] = 202 + k; d[i + 2] = 182 + k; d[i + 3] = 255; }
      c.putImageData(img, 0, 0); const u = W / 46; c.strokeStyle = 'rgba(120,96,70,.55)'; c.lineWidth = u * .5; c.strokeRect(u * 2, u * 2, W - u * 4, H - u * 4); c.lineWidth = u * .18; c.strokeRect(u * 3.2, u * 3.2, W - u * 6.4, H - u * 6.4); });
    at(g, new TT.Mesh(RB(48, .25, 38, .1, 1), M({ map: rugT, roughness: .95, bumpScale: .01 })), 0, FL + .12, Z0, 0, false);
    ao(o, 0, FL + .25, Z0, 32, 25, .35);
    const flT = X.planks('tbl2-floor', '#9c7048', '#5e3c20', 6, sz(o, 1024));
    // the room: a white-plaster dining room, a steel-framed window on the left of the back wall, a sideboard and prints on the right
    const Y1 = 52, ZB = -62, XL = -74, XR = 74, ZF = 150;
    const nightish = T === 'night';
    roomBox(o, { key: 'tbl2-room-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024,
      floor: M({ map: rep(TT, flT, 6, 7, Math.PI / 2), roughness: .5, clearcoat: .2, clearcoatRoughness: .45, bumpScale: .002, color: nightish ? 0x8a7a6c : 0xe8e0d8 }),
      back: (c, ppu) => {
        const R = rng(3);
        c.fillStyle = lin(c, Y1, FL, [[0, '#f4f0ea'], [.85, '#ece6dc'], [1, '#e2dacd']]); c.fillRect(XL - 2, FL - 2, XR - XL + 4, Y1 - FL + 4);
        for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${R() > .5 ? '255,255,255' : '160,140,120'},${.02 + R() * .03})`; ell(c, XL + R() * (XR - XL), FL + R() * (Y1 - FL), 1 + R() * 4, .6 + R() * 3); }   // plaster
        c.fillStyle = '#f8f6f2'; c.fillRect(XL - 2, FL, XR - XL + 4, 1.4); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(XL - 2, FL + 1.4, XR - XL + 4, .15);   // skirting
        c.fillStyle = '#f8f6f2'; c.fillRect(XL - 2, Y1 - 1.6, XR - XL + 4, 1.6); c.fillStyle = 'rgba(0,0,0,.06)'; c.fillRect(XL - 2, Y1 - 1.8, XR - XL + 4, .2);   // cornice
        // two framed prints over the sideboard: soft abstract shapes in muted colours
        [[14, '#c9b79c', '#7f8f78', '#c27e5c'], [32, '#d9cdb8', '#4f6170', '#d4a76a']].forEach(([x, bg, a, b], i) => {
          c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(x + .5, 7.5, 14, 18); c.fillStyle = i ? '#2b2724' : '#c8a878'; c.fillRect(x, 8, 14, 18); c.fillStyle = '#f6f2ea'; c.fillRect(x + .7, 8.7, 12.6, 16.6);
          c.fillStyle = bg; c.fillRect(x + 2.4, 10.4, 9.2, 13.2); c.fillStyle = a; ell(c, x + 6, 15, 3, 3.6); c.fillStyle = b; ell(c, x + 8.6, 19.6, 2.2, 2.2); c.fillStyle = 'rgba(40,30,20,.5)'; c.fillRect(x + 3.4, 12.2, 5.5, .25); });
        // the wall's own light and shade (multiply)
        c.globalCompositeOperation = 'multiply';
        c.fillStyle = D.tint; c.fillRect(XL - 2, FL - 2, XR - XL + 4, Y1 - FL + 4);
        c.fillStyle = lin(c, FL + 8, FL, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(200,190,176,1)']]); c.fillRect(XL - 2, FL - 2, XR - XL + 4, 10);
        c.fillStyle = rad(c, XR, 20, 50, [[0, 'rgba(210,200,190,1)'], [1, 'rgba(255,255,255,1)']]); c.fillRect(XR - 50, FL - 2, 52, Y1 - FL + 4);
        if (nightish) { c.fillStyle = rad(c, 0, 30, 70, [[0, '#ffffff'], [.5, '#b8aa9a'], [1, '#6a5c50']]); c.fillRect(XL - 2, FL - 2, XR - XL + 4, Y1 - FL + 4); }
        c.globalCompositeOperation = 'source-over';
        // the window: what is outside first, then the steel frame and the sheers
        const WX0 = -50, WX1 = -16, WY0 = -11, WY1 = 38;
        c.save(); c.beginPath(); c.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); c.clip();
        c.fillStyle = lin(c, WY1, WY0, [[0, D.sky[0]], [.75, D.sky[1]], [1, D.sky[1]]]); c.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
        blur(c, 1.1 * ppu);
        if (T === 'evening') { c.fillStyle = rad(c, -40, 6, 16, [[0, 'rgba(255,240,200,.95)'], [.2, 'rgba(255,200,140,.5)'], [1, 'rgba(255,170,110,0)']]); c.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0); }
        if (T === 'night') { c.fillStyle = '#f2ead0'; ell(c, -24, 31, 1.3, 1.3); for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(255,255,255,${.3 + R() * .5})`; ell(c, WX0 + R() * 34, 18 + R() * 20, .12, .12); } }
        else { c.fillStyle = 'rgba(255,255,255,.75)'; [[-44, 30, 5, 1.6], [-30, 33, 7, 2], [-22, 27, 4, 1.2]].forEach(([x, y, w, h]) => ell(c, x, y, w, h)); }
        const tr = D.trees; c.fillStyle = tr; for (let i = 0; i < 26; i++) ell(c, WX0 - 2 + R() * 38, 2 + R() * 14, 3 + R() * 4, 3 + R() * 5);   // the garden's trees
        c.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 14; i++) ell(c, WX0 + R() * 36, 4 + R() * 8, 2 + R() * 3, 2 + R() * 3);
        c.fillStyle = T === 'night' ? '#0a120e' : T === 'evening' ? '#4e5232' : '#5f8a4a'; c.fillRect(WX0, WY0, WX1 - WX0, 7.5);   // the hedge
        c.fillStyle = T === 'night' ? '#121a14' : T === 'evening' ? '#86804a' : '#93b36a'; c.fillRect(WX0, WY0, WX1 - WX0, 3);   // the lawn
        if (T === 'night') { [[-38, 7], [-27, 9.5], [-20, 6]].forEach(([x, y]) => { c.fillStyle = rad(c, x, y, 2.5, [[0, 'rgba(255,200,120,.9)'], [1, 'rgba(255,180,100,0)']]); c.fillRect(x - 3, y - 3, 6, 6); }); c.fillStyle = rad(c, -30, 22, 9, [[0, 'rgba(255,214,160,.25)'], [1, 'rgba(255,214,160,0)']]); c.fillRect(WX0, WY0, 34, 49); }   // a reflection of the pendant
        blur(c, 0); c.restore();
        const FR = nightish ? '#18181a' : '#2a2a2c';
        c.fillStyle = FR; [WX0, -41.5, -33, -24.5, WX1].forEach(x => c.fillRect(x - .45, WY0, .9, WY1 - WY0)); [WY0, 1.5, 14, 26, WY1].forEach(y => c.fillRect(WX0 - .45, y - .45, WX1 - WX0 + .9, .9));
        c.fillStyle = 'rgba(255,255,255,.12)'; [WX0, -41.5, -33, -24.5, WX1].forEach(x => c.fillRect(x - .45, WY0, .2, WY1 - WY0));
        c.fillStyle = nightish ? '#7c7064' : '#f2eee8'; c.fillRect(WX0 - 1.4, WY0 - 1.2, WX1 - WX0 + 2.8, 1.2);   // the sill
        // linen sheers on a black rod
        c.fillStyle = '#222'; c.fillRect(-58, 41.4, 50, .4); [-58, -8].forEach(x => ell(c, x, 41.6, .5, .5));
        [[-57.5, -49], [-17, -8.5]].forEach(([x0, x1]) => { for (let x = x0; x < x1; x += .7) { const k = .5 + .5 * Math.sin((x - x0) * 2.3 + x0); c.fillStyle = nightish ? `rgba(${150 + k * 40 | 0},${136 + k * 36 | 0},${118 + k * 30 | 0},.92)` : `rgba(${238 + k * 14 | 0},${232 + k * 14 | 0},${220 + k * 14 | 0},.86)`; c.fillRect(x, FL + .4, .72, 41.2 - FL); } });
        // glows
        if (T !== 'night') { blur(c, 3 * ppu); c.fillStyle = D.glow; c.beginPath(); c.moveTo(-50, FL + 1); c.lineTo(-16, FL + 1); c.lineTo(-4, FL + 7); c.lineTo(-34, FL + 7); c.fill(); blur(c, 0); }
        else { c.fillStyle = rad(c, 30, 30, 16, [[0, 'rgba(255,200,140,.18)'], [1, 'rgba(255,200,140,0)']]); c.fillRect(14, 14, 32, 32); }
      },
      left: (c) => {   // the left wall (x = −74; seen from inside, z = +150 on the left … −62 on the right): plaster, a doorway to the hall
        c.fillStyle = '#ece6dc'; c.fillRect(-ZF - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4);
        c.fillStyle = '#f8f6f2'; c.fillRect(-ZF - 2, FL, ZF - ZB + 4, 1.4); c.fillRect(-ZF - 2, Y1 - 1.6, ZF - ZB + 4, 1.6);
        c.fillStyle = '#d8cfc0'; c.fillRect(8, FL, 18, 34); c.fillStyle = '#c4b8a6'; c.fillRect(9.2, FL, 15.6, 32.8); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(8, FL + 34, 18, .5);   // the doorway
        c.fillStyle = '#b9ad9b'; c.fillRect(12, FL, 9, 24); c.fillStyle = 'rgba(255,250,240,.35)'; c.fillRect(13, FL + 6, 7, 14);   // a glimpse of the hall
        c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(40, 12, 12, 16); c.fillStyle = '#3a342e'; c.fillRect(40.3, 12.3, 11.4, 15.4); c.fillStyle = '#e8e0d2'; c.fillRect(41.2, 13.2, 9.6, 13.6); c.fillStyle = '#8fa39a'; ell(c, 46, 18, 3, 2); c.fillStyle = '#d6b98e'; c.fillRect(42, 13.2, 8, 3);   // a framed print
        c.globalCompositeOperation = 'multiply'; c.fillStyle = D.tint; c.fillRect(-ZF - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4); c.fillStyle = lin(c, -ZB, -ZB - 50, [[0, 'rgba(225,215,205,1)'], [1, 'rgba(255,255,255,1)']]); c.fillRect(-ZB - 50, FL - 2, 52, Y1 - FL + 4); c.globalCompositeOperation = 'source-over';
      },
      right: (c) => {   // the right wall: open shelves of plates and jars (the kitchen side)
        c.fillStyle = '#efe9e0'; c.fillRect(ZB - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4);
        c.fillStyle = '#f8f6f2'; c.fillRect(ZB - 2, FL, ZF - ZB + 4, 1.4); c.fillRect(ZB - 2, Y1 - 1.6, ZF - ZB + 4, 1.6);
        const R = rng(19);
        [14, 24].forEach(y => { c.fillStyle = '#b48a5e'; c.fillRect(-54, y, 26, .9); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-54, y - .8, 26, .8);
          for (let x = -53; x < -29;) { const k = R(); if (k < .4) { c.fillStyle = '#f4f1ea'; ell(c, x + 1.3, y + 2.4, 1.3, 2.3); c.fillStyle = 'rgba(0,0,0,.06)'; ell(c, x + 1.3, y + 2.4, .8, 1.6); x += 2.9; } else if (k < .75) { c.fillStyle = ['#c9a77c', '#8fa39a', '#d8cdb8'][R() * 3 | 0]; c.fillRect(x, y + .9, 2.2, 3.2); c.fillStyle = '#5a4a3a'; c.fillRect(x + .1, y + 4.1, 2, .5); x += 3; } else { c.fillStyle = '#e8e2d6'; c.fillRect(x, y + .9, 3.2, 1.4); c.fillRect(x + .2, y + 2.3, 2.8, 1.2); x += 3.8; } } });
        c.globalCompositeOperation = 'multiply'; c.fillStyle = D.tint; c.fillRect(ZB - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4); c.fillStyle = lin(c, ZB, ZB + 40, [[0, 'rgba(200,190,180,1)'], [1, 'rgba(240,235,230,1)']]); c.fillRect(ZB - 2, FL - 2, 42, Y1 - FL + 4); c.globalCompositeOperation = 'source-over';
      },
      ceil: (c) => { c.fillStyle = nightish ? '#7c7064' : '#ece8e2'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, ZF - ZB + 4); c.fillStyle = rad(c, 0, Z0, 30, [[0, nightish ? 'rgba(255,214,160,.5)' : 'rgba(255,255,255,.4)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(XL, ZB, XR - XL, ZF - ZB);
        c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, 3); },
    });
    // furniture: two chairs across the table, a sideboard, a fig tree, the pendant over the table
    const chairM = M({ map: wood('tbl2-chair', '#c99d6c', '#93653a', sz(o, 256), sz(o, 512), .8), roughness: .48, clearcoat: .2 }), seatM = M({ map: X.cloth('tbl2-seat', '#d9cdb6', 14, sz(o, 256)), roughness: .9 });
    const bent = (w, h, d, b) => { const G2 = new TT.BoxGeometry(w, h, d, 8, 1, 1), P = G2.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, P.getZ(i) + b * (x / (w / 2)) * (x / (w / 2))); } G2.computeVertexNormals(); return G2; };
    const chair = (x, z, ry) => {
      const G = grp(TT, g, x, FL, z, ry), lg = new TT.CylinderGeometry(.34, .26, 10, SEG(o, 8));
      [[-3.3, 3.1], [3.3, 3.1]].forEach(([a, b]) => { const l = new TT.Mesh(lg, chairM); l.rotation.set(.04, 0, a > 0 ? -.03 : .03); at(G, l, a, 5, b); });
      [-3.2, 3.2].forEach(a => { const p = new TT.Mesh(new TT.CylinderGeometry(.34, .3, 19.6, SEG(o, 8)), chairM); p.rotation.x = -.1; at(G, p, a, 9.6, -3.5); });
      at(G, new TT.Mesh(RB(7.8, .7, 7.4, .3, 2), chairM), 0, 10.2, 0); at(G, new TT.Mesh(RB(7.2, .55, 6.8, .25, 2), seatM), 0, 10.8, .1);
      [[16.8, 2.2], [13.2, 1.1]].forEach(([y, h]) => { const r = new TT.Mesh(bent(7.2, h, .5, .7), chairM); r.rotation.x = -.1; at(G, r, 0, y, -3.6 - (y - 10) * .1 + .5); });
      [[0, 4.6], [0, -2.9]].forEach(([a, b]) => at(G, new TT.Mesh(RB(6.4, .6, .5, .15, 1), chairM), a, 2.6, b, 0, false));
    };
    chair(-7, -13.4, 0); chair(7, -13.4, 0);   // (the two on this side are behind the camera; chairs at the ends crowded the view's edges)
    [[-7, -13.4], [7, -13.4]].forEach(([x, z]) => ao(o, x, FL + .26, z, 10, 10, .4));
    // the sideboard (walnut, slatted doors) against the back wall, right; a lamp, vases and books on it
    const sbM = M({ map: canvasTex('tbl2-sbfront', sz(o, 512), sz(o, 192), (c, W, H) => { c.drawImage(wood('tbl2-sbw', '#8a5a36', '#4e2e18', 512, 512, 1.2).image, 0, 0, W, H); c.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 0; x < W; x += W / 48) c.fillRect(x, H * .06, Math.max(1, W / 380), H * .88); c.fillStyle = 'rgba(0,0,0,.6)'; [.25, .5, .75].forEach(k => c.fillRect(W * k - 1, 0, 2, H)); c.fillStyle = 'rgba(255,240,220,.18)'; c.fillRect(0, 0, W, H * .02); }), roughness: .45, clearcoat: .25 });
    const sbSide = M({ map: wood('tbl2-sbw', '#8a5a36', '#4e2e18', 512, 512, 1.2), roughness: .45, clearcoat: .25 });
    const SBX = 31, SBZ = ZB + 5.2, SBY = FL + 13;
    at(g, new TT.Mesh(RB(36, 10, 9, .25, 2), [sbSide, sbSide, sbSide, sbSide, sbM, sbSide]), SBX, FL + 8, SBZ);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = new TT.Mesh(new TT.CylinderGeometry(.35, .22, 3, 8), M({ color: 0x2a2018, roughness: .5 })); at(g, l, SBX + a * 16.5, FL + 1.5, SBZ + b * 3.6); });
    ao(o, SBX, FL, SBZ, 40, 12, .45);
    const cer = M({ color: 0xe9e4da, roughness: .4, clearcoat: .3 }), sage = M({ color: 0x9fb3a2, roughness: .35, clearcoat: .4 });
    { const Gl = grp(TT, g, SBX - 11, SBY, SBZ);   // the table lamp
      at(Gl, lathe(TT, [[0, 0], [1.6, 0], [1.9, 1.2], [2.1, 3.4], [1.4, 5.6], [.4, 6.4], [.3, 7.2], [0, 7.2]], SEG(o, 24), cer), 0, 0, 0);
      const lit = T === 'evening' || T === 'night';
      const sh = new TT.Mesh(new TT.CylinderGeometry(2.6, 3.4, 4.4, SEG(o, 24), 1, true), new TT.MeshStandardMaterial({ color: 0xf2ead8, roughness: .9, side: TT.DoubleSide, emissive: new TT.Color(lit ? 0xffc890 : 0), emissiveIntensity: lit ? .9 : 0 }));
      at(Gl, sh, 0, 8.6, 0, 0, false);
      if (lit) { const L = new TT.PointLight(0xffc488, .7, 40, 2); L.position.set(SBX - 11, SBY + 8, SBZ + 2); g.add(L); } }
    at(g, lathe(TT, [[0, 0], [.9, 0], [1.4, 1], [1.5, 4.5], [.7, 7.2], [.55, 8.6], [.7, 8.8], [0, 8.8]], SEG(o, 20), sage), SBX + 2, SBY, SBZ - 1);
    { const tw = M({ color: 0x8c7552, roughness: .8 }); for (let i = 0; i < 5; i++) { const s = new TT.Mesh(new TT.CylinderGeometry(.05, .07, 9, 4), tw); s.rotation.set((i - 2) * .06, 0, (i - 2) * .15); at(g, s, SBX + 2 + (i - 2) * .6, SBY + 13, SBZ - 1); } }
    book(o, g, SBX + 10, SBY, SBZ, .1, 6, 4.4, .9, '#7b8a74'); book(o, g, SBX + 10.2, SBY + .9, SBZ, -.08, 5.5, 4, .8, '#c9b48e'); at(g, lathe(TT, [[0, 0], [1.6, 0], [2.2, .6], [2.4, 1.4], [2.2, 1.45], [1.5, .7], [0, .6]], SEG(o, 22), cer), SBX + 10, SBY + 1.7, SBZ);
    // a fiddle-leaf fig in a terracotta pot, back left corner; a basket by it
    potPlant(o, g, -60, ZB + 10, FL, 1.45, M({ color: 0xc58a62, roughness: .85 }), leafTex('leaf-fig', '#4f7a3a', '#2e5527'), 4);
    ao(o, -60, FL, ZB + 10, 14, 14, .45);
    // the pendant over the table (hidden in the play view): a dome of spun brass, glowing at night
    { const Gp = grp(TT, g, 0, 0, Z0 - 1); Gp.userData.viewOnly = 1; Gp.userData.keep = 1; const lit = T === 'night' || T === 'evening';
      at(Gp, lathe(TT, [[0, 0], [5.8, 0], [5.7, .3], [4.6, 2.4], [2.2, 4.2], [.5, 4.5], [0, 4.5]], SEG(o, 32), M({ color: 0xb08850, metalness: .9, roughness: .3, side: TT.DoubleSide })), 0, 30, 0, 0, false);
      const dif = new TT.Mesh(new TT.CircleGeometry(5.6, SEG(o, 32)), new TT.MeshBasicMaterial({ color: lit ? 0xfff0d8 : 0xe8e2d8, toneMapped: !lit })); dif.rotation.x = Math.PI / 2; at(Gp, dif, 0, 30.05, 0, 0, false);
      at(Gp, new TT.Mesh(new TT.CylinderGeometry(.06, .06, Y1 - 34.5, 5), M({ color: 0x222222 })), 0, 34.5 + (Y1 - 34.5) / 2, 0, 0, false);
      at(Gp, new TT.Mesh(new TT.CylinderGeometry(1.2, 1.2, .5, 16), M({ color: 0xb08850, metalness: .9, roughness: .3 })), 0, Y1 - .25, 0, 0, false); }
    // the window's light on the floor (not at night)
    if (T !== 'night') lightPatch(o, -30, FL + .3, -16, 26, 19, .5, T === 'evening' ? 0xffc890 : 0xfff4e0, [4, 4], T === 'evening' ? .16 : .12);   // (only on the floor: on the table it read as a sheet of paper)
    // the table setting of the hour (nothing inside r ≈ 9.5 of the board's centre: the go board turns through 8.6)
    const china = M({ color: 0xf2efe8, roughness: .3, clearcoat: .5 }), bread = M({ map: canvasTex('crust', 128, 128, (c, W) => { const g2 = c.createLinearGradient(0, 0, 0, W); g2.addColorStop(0, '#c98a3e'); g2.addColorStop(.5, '#e0a95a'); g2.addColorStop(1, '#a8682a'); c.fillStyle = g2; c.fillRect(0, 0, W, W); c.fillStyle = 'rgba(110,60,20,.35)'; for (let i = 0; i < W; i += 9) c.fillRect(0, i, W, 3); }), roughness: .6, clearcoat: .25 });
    const linen = M({ map: X.cloth('tbl2-napkin', '#ece4d4', 14, 128), roughness: .9 });
    const napkin = (x, z, r) => at(g, new TT.Mesh(RB(4.2, .12, 4.2, .05, 1), linen), x, .06, z, r, false);
    // a bud vase: the stems start inside its neck and fan out (2026-11-07: they stood beside it), a small rose-like bloom on each
    const vase = (x, z, n, col) => { at(g, lathe(TT, [[0, 0], [.55, 0], [.75, .5], [.7, 1.4], [.3, 2.4], [.28, 3], [.36, 3.15], [.3, 3.15], [.22, 3], [.22, 2.4], [0, 2.3]], SEG(o, 20), sage), x, 0, z);
      const fl = M({ color: col, roughness: .55, side: TT.DoubleSide }), sep = M({ color: 0x5a7a3a, roughness: .7 }), leafM = M({ color: 0x5f8a44, roughness: .6, side: TT.DoubleSide });
      bouquet(o, g, x, z, 3.15, .24, n, 3.2, 1, 0x6d7f4c, (Gh, i) => {
        at(Gh, new TT.Mesh(new TT.ConeGeometry(.22, .3, 6), sep), 0, -.05, 0, 0, false);
        const b2 = new TT.Mesh(new TT.SphereGeometry(.36, 10, 8), fl); b2.scale.set(1, .85, 1); at(Gh, b2, 0, .3, 0);
        for (let k = 0; k < 5; k++) { const pt = new TT.Mesh(new TT.SphereGeometry(.3, 8, 6, 0, Math.PI), fl); pt.scale.set(1, 1.1, .45); pt.rotation.set(-.35, k * 1.26, 0); at(Gh, pt, Math.sin(k * 1.26) * .26, .26, Math.cos(k * 1.26) * .26, 0, false); }
        if (i % 2) { const lf = new TT.Mesh(new TT.SphereGeometry(.3, 6, 4), leafM); lf.scale.set(.45, .1, 1); lf.rotation.set(.5, i, 0); at(Gh, lf, .2, -1, .2, 0, false); } }, 11); };
    if (T === 'morning') {
      cupSaucer(o, g, -10.6, -1, .5, china, 'cap'); cupSaucer(o, g, 10, -3.2, -2.6, china, 'cap');   // cappuccino
      plate(o, g, -10.8, -6.4, 2.4, china); croissant(o, g, -11.2, .2, -6.9, .6, bread); croissant(o, g, -10, .2, -5.8, -2.2, bread);
      tumbler(o, g, -5.8, -8.2, [0xf2a12a, .78], 2.9, .78);
      { const Gj = grp(TT, g, 9, 0, -6.6); at(Gj, lathe(TT, [[0, 0], [.8, 0], [.85, 1.6], [.7, 1.75], [0, 1.75]], SEG(o, 20), glassM()), 0, 0, 0, 0, false); at(Gj, new TT.Mesh(new TT.CylinderGeometry(.76, .76, 1.4, SEG(o, 20)), M({ color: 0x8a1626, roughness: .2, clearcoat: .8 })), 0, .75, 0, 0, false); at(Gj, new TT.Mesh(new TT.CylinderGeometry(.82, .82, .4, SEG(o, 20)), M({ color: 0xd8c28a, metalness: .6, roughness: .35 })), 0, 1.95, 0); }
      plate(o, g, 12, 1.4, 1.6, china); at(g, new TT.Mesh(RB(1.6, .8, 1, .12, 1), M({ color: 0xf6e7a8, roughness: .5 })), 12, .55, 1.4, .3);
      vase(6.2, -8.2, 3, 0xf3e9d2);
    } else if (T === 'day') {
      plate(o, g, -10.8, -6.3, 2.6, china);
      // a club sandwich cut on the diagonal (2026-11-07: more real): toasted bread with a golden crust, frilly lettuce, tomato slices,
      // ham and cheese hanging over the edges, a cocktail pick through each half
      const crumb = M({ map: canvasTex('sw-crumb', 128, 128, (c, W) => { c.fillStyle = '#f2e6c8'; c.fillRect(0, 0, W, W); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${Math.random() > .5 ? '200,170,120' : '255,250,235'},${.25 + Math.random() * .4})`; c.beginPath(); c.ellipse(Math.random() * W, Math.random() * W, 1 + Math.random() * 3, .6 + Math.random() * 1.6, Math.random() * 3, 0, 7); c.fill(); } }), roughness: .9, bump: false });
      const crust = M({ map: canvasTex('sw-crust', 64, 64, (c, W) => { const g2 = c.createLinearGradient(0, 0, 0, W); g2.addColorStop(0, '#a8662a'); g2.addColorStop(.5, '#c98a44'); g2.addColorStop(1, '#9a5a22'); c.fillStyle = g2; c.fillRect(0, 0, W, W); for (let i = 0; i < 80; i++) { c.fillStyle = 'rgba(90,50,20,.3)'; c.fillRect(Math.random() * W, Math.random() * W, 2, 1); } }), roughness: .7, bump: false });
      const toast = M({ map: canvasTex('sw-toast', 128, 128, (c, W) => { c.fillStyle = '#e2b672'; c.fillRect(0, 0, W, W); for (let i = 0; i < 220; i++) { c.fillStyle = `rgba(${Math.random() > .6 ? '150,90,40' : '250,230,190'},${.2 + Math.random() * .3})`; c.beginPath(); c.arc(Math.random() * W, Math.random() * W, .8 + Math.random() * 2.4, 0, 7); c.fill(); } c.fillStyle = 'rgba(160,96,40,.25)'; for (let y = 10; y < W; y += 22) c.fillRect(0, y, W, 6); }), roughness: .8, bump: false });
      const tri = (k = 0, wob = 0, seed = 1) => { const R = rng(seed), P = [[-1.6, -1.4], [1.6, -1.4], [-1.6, 1.6]], sh = new TT.Shape();
        for (let e = 0; e < 3; e++) { const [x0, y0] = P[e], [x1, y1] = P[(e + 1) % 3], L = Math.hypot(x1 - x0, y1 - y0), nx = (y1 - y0) / L, ny = -(x1 - x0) / L, N = wob ? 14 : 1;
          for (let q = 0; q < N; q++) { const t = q / N, w = wob ? (Math.sin(t * 40 + seed) * .5 + .5) * wob + R() * wob * .4 : 0; const px = x0 + (x1 - x0) * t + nx * (k + w), py = y0 + (y1 - y0) * t + ny * (k + w); e + q ? sh.lineTo(px, py) : sh.moveTo(px, py); } }
        return sh; };
      const layer = (G, sh, h, y, mat) => { const m = new TT.Mesh(new TT.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: .05, bevelSize: .06, bevelSegments: 2, curveSegments: 4 }), mat); m.rotation.x = -Math.PI / 2; at(G, m, 0, y, 0); return m; };
      const sw = (x, z, r, seed) => { const Gs = grp(TT, g, x, .24, z, r);
        layer(Gs, tri(-.02), .42, .05, [toast, crust]);
        layer(Gs, tri(.1, .26, seed), .07, .52, M({ color: 0x86b84c, roughness: .45, clearcoat: .3 }));   // lettuce, frilly past the bread
        layer(Gs, tri(.04, .06, seed + 3), .1, .62, M({ color: 0xe8a09a, roughness: .45, clearcoat: .2 }));   // ham
        const tm = [M({ color: 0xc8281e, roughness: .35, clearcoat: .5 }), M({ map: canvasTex('tomato-slice', 64, 64, (c, W) => { c.fillStyle = '#d23a2a'; c.fillRect(0, 0, W, W); c.fillStyle = '#f07a5a'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(W / 2 + Math.cos(i * 1.57) * W * .2, W / 2 + Math.sin(i * 1.57) * W * .2, W * .12, W * .08, i * 1.57, 0, 7); c.fill(); } c.fillStyle = '#f6d07a'; for (let i = 0; i < 16; i++) { const a = i * .39; c.fillRect(W / 2 + Math.cos(a) * W * .2, W / 2 + Math.sin(a) * W * .2, 2.5, 2.5); } }), roughness: .3, clearcoat: .6, bump: false })];
        [[.5, .1], [-.55, .55], [-.3, -.6]].forEach(([a, b]) => { const t = new TT.Mesh(new TT.CylinderGeometry(.62, .62, .14, 16), [tm[0], tm[1], tm[1]]); at(Gs, t, a, .82, -b); });
        { const ch = layer(Gs, tri(.02), .05, .96, M({ color: 0xf2c440, roughness: .4, clearcoat: .3 })); ch.rotation.z = .12; }   // cheese, turned so its corners hang over
        layer(Gs, tri(-.02), .42, 1.08, [toast, crust]);
        const pick = new TT.Mesh(new TT.CylinderGeometry(.04, .04, 2.6, 5), M({ color: 0xe0c48a, roughness: .7 })); at(Gs, pick, -.6, 1.5, .3, 0, false);
        at(Gs, new TT.Mesh(new TT.SphereGeometry(.24, 10, 8), M({ color: 0x5a7a2a, roughness: .25, clearcoat: .8 })), -.6, 2.55, .3);
        const fr = new TT.Mesh(new TT.ConeGeometry(.16, .4, 8), M({ color: 0xd83a3a, roughness: .5 })); fr.rotation.x = Math.PI; at(Gs, fr, -.6, 2.95, .3, 0, false); };
      sw(-11.3, -6.8, .3, 3); sw(-10, -5.6, 2.6, 9);
      { const Gb = grp(TT, g, 10.6, 0, -6.1); Gb.scale.setScalar(.88); at(Gb, lathe(TT, [[0, 0], [1.4, 0], [2.6, .8], [3.1, 2], [2.95, 2.05], [2.4, 1], [0, .4]], SEG(o, 28), china), 0, 0, 0);
        const R = rng(5); for (let i = 0; i < 22; i++) { const a = R() * 6.3, r = R() * 2.1, l = new TT.Mesh(new TT.SphereGeometry(.7, 7, 5), M({ color: [0x6d9a3e, 0x8ab84e, 0x4f7a32, 0x9a3a5a][R() * 4 | 0], roughness: .6 })); l.scale.set(1, .3, .8); l.rotation.set(R(), R() * 3, R()); at(Gb, l, Math.cos(a) * r, 1.3 + R() * .5, Math.sin(a) * r, 0, false); }
        for (let i = 0; i < 5; i++) { const a = i * 1.3; at(Gb, new TT.Mesh(new TT.SphereGeometry(.36, 10, 8), M({ color: 0xd8302a, roughness: .25, clearcoat: .6 })), Math.cos(a) * 1.3, 1.9, Math.sin(a) * 1.3); } }
      [[-10.8, 1.4], [11, 3.8]].forEach(([x, z]) => { const Gt = tumbler(o, g, x, z, [0xb8681e, .7], 3.2, .8); ice(o, Gt, 0, 1.5, 0, 3); const sl = new TT.Mesh(new TT.CylinderGeometry(.6, .6, .1, 14, 1, false, 0, Math.PI), M({ color: 0xf2d24a, roughness: .5 })); sl.rotation.set(Math.PI / 2, 0, .2); at(Gt, sl, .7, 3.1, 0, 0, false); });
      vase(-5.8, -8.2, 4, 0xe8a0a8); cupSaucer(o, g, 11.6, .2, -2.4, china);
    } else if (T === 'evening') {
      { const Gc = grp(TT, g, 10.4, 0, -7.1, .05); Gc.scale.setScalar(.72); at(Gc, new TT.Mesh(RB(7, .5, 4.6, .2, 2), M({ map: wood('tbl2-cb2', '#7a4a2a', '#3e2412', 256, 256, .8), roughness: .4, clearcoat: .35 })), 0, .25, 0);   // a walnut board (it shows against the oak), moved in from the table's edge before the right-hand seat
        const wedge = (x, z, r, col, rind) => { const sh = new TT.Shape(); sh.moveTo(0, 0); sh.lineTo(2.2, -.7); sh.lineTo(2.2, .7); sh.lineTo(0, 0); const m = new TT.Mesh(new TT.ExtrudeGeometry(sh, { depth: 1.1, bevelEnabled: false }), [M({ color: rind, roughness: .7 }), M({ color: col, roughness: .55 })]); m.rotation.x = -Math.PI / 2; m.rotation.z = r; at(Gc, m, x, .5, z); };
        wedge(-2.6, -.6, .2, 0xf2d27a, 0xe8c262); wedge(-1.2, 1, -1, 0xf4ecd2, 0xe2d6b2);
        const gm = M({ color: 0x5a2846, roughness: .25, clearcoat: .7 }), gs = new TT.SphereGeometry(.34, 10, 8); for (let i = 0; i < 16; i++) { const a = i * 2.39, r = Math.sqrt(i) * .32; at(Gc, new TT.Mesh(gs, gm), 1.5 + Math.cos(a) * r, .8 + (i % 3) * .12 - r * .1, -.9 + Math.sin(a) * r * 1.4); }
        const sl = M({ map: canvasTex('crumb', 64, 64, (c, W) => { c.fillStyle = '#f0dcb0'; c.fillRect(0, 0, W, W); for (let i = 0; i < 60; i++) { c.fillStyle = 'rgba(160,120,60,.35)'; c.beginPath(); c.arc(Math.random() * W, Math.random() * W, 1 + Math.random() * 2.5, 0, 7); c.fill(); } c.strokeStyle = '#b8742c'; c.lineWidth = 6; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 3, 0, 7); c.stroke(); }), roughness: .8 });
        for (let i = 0; i < 4; i++) { const s = new TT.Mesh(new TT.CylinderGeometry(.8, .8, .3, 14), [M({ color: 0xc98a3e, roughness: .6 }), sl, sl]); s.rotation.set(.3, 0, .25); at(Gc, s, .6 + i * .75, .85, 1.2); } }
      bottle(o, g, -11, -6.6, 0x1e2a18, '#efe6d2'); wineGlass(o, g, -10.2, .6, 0x5a0d1c); wineGlass(o, g, 9.8, 4.8, 0x5a0d1c);   // (glasses forward, clear of the bottle and the cup)
      candle(o, g, -5.8, -8.2, false); cupSaucer(o, g, 12, -2.4, -2.4, china);
    } else {
      [[-11.2, 3.8, .4], [11.2, 3.8, -.4]].forEach(([x, z, r]) => { plate(o, g, x, z, 2.4, china); napkin(x - Math.sign(x) * .2, z + 2.2, r);
        // a steak dinner (2026-11-07: was pasta): a sirloin, sliced and fanned (pink inside, a seared crust), roast potatoes, green beans, a sprig of rosemary
        const Gm = grp(TT, g, x, .14, z, r), sear = M({ map: canvasTex('steak-sear', 128, 128, (c, W) => { c.fillStyle = '#5a2e1a'; c.fillRect(0, 0, W, W); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${Math.random() > .5 ? '30,14,8' : '140,80,40'},${.2 + Math.random() * .4})`; c.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 3, 1 + Math.random() * 2); } c.strokeStyle = 'rgba(20,8,4,.85)'; c.lineWidth = 7; for (let i = -W; i < W * 2; i += 44) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + W * .6, W); c.stroke(); } }), roughness: .45, clearcoat: .5, bump: false });
        const cut = M({ map: canvasTex('steak-cut', 64, 64, (c, W) => { c.fillStyle = '#4a2414'; c.fillRect(0, 0, W, W); c.fillStyle = '#a8503a'; c.fillRect(W * .07, W * .1, W * .86, W * .8); c.fillStyle = '#d06a62'; c.fillRect(W * .14, W * .22, W * .72, W * .56); c.fillStyle = 'rgba(240,170,160,.5)'; c.fillRect(W * .2, W * .34, W * .6, W * .3); }), roughness: .4, clearcoat: .5, bump: false });
        for (let k = 0; k < 5; k++) { const sl = new TT.Mesh(RB(.46, .7, 2.1, .08, 2), [cut, cut, sear, sear, sear, sear]); sl.rotation.set(0, 0, -.62); at(Gm, sl, -1.2 + k * .5, .4, -.2 + k * .06); }   // fanned and leaning, so the pink cut faces show
        const pot = M({ color: 0xd8a04a, roughness: .5, clearcoat: .3 }), pg = new TT.SphereGeometry(.36, 10, 8); [[1.2, .9], [1.55, .25], [.7, 1.35], [1.45, -.45]].forEach(([a, b], k) => { const m = new TT.Mesh(pg, pot); m.scale.set(1.1, .8, .9); m.rotation.y = k; at(Gm, m, a, .36, b); });
        const bean = M({ color: 0x4f8a34, roughness: .45, clearcoat: .3 }), bg = new TT.CylinderGeometry(.07, .07, 1.5, 5); for (let k = 0; k < 7; k++) { const m = new TT.Mesh(bg, bean); m.rotation.set(Math.PI / 2, 0, .9 + k * .06); at(Gm, m, -.4 + k * .16, .2 + (k % 2) * .08, 1.3 - k * .03, 0, false); }
        { const rl = M({ color: 0x3a5a2a, roughness: .6, side: TT.DoubleSide }); for (let k = 0; k < 7; k++) { const l = new TT.Mesh(new TT.SphereGeometry(.16, 6, 4), rl); l.scale.set(.35, .2, 1.4); l.rotation.y = .4 + (k % 2 ? .6 : -.6); at(Gm, l, -.3 + k * .14, .95 - k * .02, -.95 - k * .05, 0, false); } }   // a sprig of rosemary
        const sv = M({ color: 0xd8d8d8, metalness: 1, roughness: .22 }); [[-.45, 4], [.45, 3.6]].forEach(([dz, L]) => { const m = new TT.Mesh(RB(L, .06, .24, .03, 1), sv); at(g, m, x - Math.sign(x) * .2, .16, z + 2.2 + dz, r, false); }); });   // knife and fork on the napkin
      bottle(o, g, -11, -6.6, 0x1e2a18, '#efe6d2'); wineGlass(o, g, -9.6, -2, 0x5a0d1c); wineGlass(o, g, 9.6, -2, 0x5a0d1c);
      candle(o, g, -5.4, -8.2, true, true); candle(o, g, 5.4, -8.2, true, true);   // (no coffee at dinner)
      { const Gb = grp(TT, g, 10.8, 0, -6.4); const wv = M({ map: canvasTex('basket', 128, 64, (c, W, H) => { c.fillStyle = '#b48a52'; c.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) for (let x = (y / 8 % 2) * 8; x < W; x += 16) { c.fillStyle = 'rgba(90,60,30,.4)'; c.fillRect(x, y, 8, 7); } }), roughness: .8 });
        at(Gb, lathe(TT, [[0, 0], [1.8, 0], [2.4, 1.4], [2.5, 1.6], [2.3, 1.6], [1.7, .3], [0, .3]], SEG(o, 22), wv), 0, 0, 0);
        for (let i = 0; i < 4; i++) { const s = new TT.Mesh(new TT.CylinderGeometry(.9, .9, .35, 14), bread); s.rotation.set(1.2, i * .9, 0); at(Gb, s, Math.cos(i * 1.6) * .8, 1.3, Math.sin(i * 1.6) * .8); } }
    }
    // lights of the hour
    scene.add(new TT.HemisphereLight(D.hemi[0], D.hemi[1], D.hemi[2]));
    let key;
    if (T === 'night') { key = new TT.SpotLight(D.key[0], D.key[1], 80, .95, .85, 1.2); key.position.set(...D.key[2]); key.target.position.set(0, 0, 0); scene.add(key.target); key.shadow.camera.near = 8; key.shadow.camera.far = 50; key.shadow.bias = -.0002;
      const fill = new TT.DirectionalLight(0xb8c4ee, .12); fill.position.set(-20, 14, -10); scene.add(fill); }
    else { key = dirLight(TT, D.key[0], D.key[1], D.key[2], 17); const fill = new TT.DirectionalLight(0xeef2ff, T === 'evening' ? .14 : .22); fill.position.set(9, 10, 16); scene.add(fill); }
    scene.add(key);
    try { X.mergeStatic(g); } catch (e) {}
    const env = T === 'night' ? { top: '#4a3c30', bottom: '#14100c', panels: [[0, 18, 0, 10, 10, '#ffd8a8', 3], [-14, 8, -10, 8, 10, '#3a4a70', .5], [0, 8, 18, 20, 5, '#806650', .5]] }
      : { top: T === 'evening' ? '#f0d0b0' : '#f4efe6', bottom: '#b4936a', panels: [[-14, 12, -10, 14, 10, T === 'evening' ? '#ffd0a0' : '#ffffff', 1.7], [12, 8, 10, 10, 6, '#fff3e4', .6], [0, 18, 4, 20, 6, '#ffffff', .5]] };
    return { bg: T === 'night' ? '#2a221c' : '#ece6dc', exp: D.exp, board: D.board, boardCol: T === 'night' ? 0xffe8cc : undefined, key, env };
  };
  TABLES[2].plain = { sun: 0xfff1dc, sunI: .74, hemi: [0xf3f1ec, 0xb8976c, .48], exp: .64 };
  TABLES[2].floor = (o) => ({ img: oak(o).image, w: 46, h: 36, over: 'radial-gradient(120% 90% at 16% 0%, rgba(255,252,240,.38), transparent 62%), radial-gradient(140% 120% at 50% 40%, transparent 60%, rgba(90,60,30,.18))' });

  /* ---------- 3 · 緑のフェルト: felt in a walnut rail under one spotlight, in a dark club room ---------- */
  const feltTex = o => canvasTex('tbl3-felt', sz(o, 1024), sz(o, 1024), (c, W) => {
      const N = makeNoise(31), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = (Math.random() - .5) * 16 + (N(x / 1.6, y / 1.6, 2) - .5) * 20 + (N(x / 50, y / 50, 3) - .5) * 10, i = (y * W + x) * 4;
        d[i] = 12 + k * .3; d[i + 1] = 58 + k * 1.1; d[i + 2] = 38 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
  // a suit drawn in a unit box centred at (0, 0), y down (canvas)
  function suit(c, s, x, y, r, col) {
    c.save(); c.translate(x, y); c.scale(r, r); c.fillStyle = col; c.beginPath();
    if (s === 'h') { c.moveTo(0, .9); c.bezierCurveTo(-1.2, -.1, -.8, -1.1, 0, -.45); c.bezierCurveTo(.8, -1.1, 1.2, -.1, 0, .9); }
    else if (s === 'd') { c.moveTo(0, -1); c.lineTo(.7, 0); c.lineTo(0, 1); c.lineTo(-.7, 0); }
    else if (s === 's') { c.moveTo(0, -1); c.bezierCurveTo(1.3, -.1, .8, .9, .08, .35); c.lineTo(.35, 1); c.lineTo(-.35, 1); c.lineTo(-.08, .35); c.bezierCurveTo(-.8, .9, -1.3, -.1, 0, -1); }
    else { [[0, -.5], [-.48, .1], [.48, .1]].forEach(([a, b]) => { c.moveTo(a + .42, b); c.arc(a, b, .42, 0, 7); }); c.moveTo(-.1, .2); c.lineTo(.1, .2); c.lineTo(.3, 1); c.lineTo(-.3, 1); }
    c.fill(); c.restore();
  }
  const cardFace = (rank, s) => canvasTex('card-' + rank + s, 128, 180, (c, W, H) => {
    const col = s === 'h' || s === 'd' ? '#c0282e' : '#1a1a1a';
    c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(0,0,0,.12)'; c.strokeRect(1, 1, W - 2, H - 2);
    c.fillStyle = col; c.font = 'bold 26px Georgia, serif'; c.textAlign = 'center'; c.fillText(rank, 18, 30); suit(c, s, 18, 44, 8, col);
    c.save(); c.translate(W, H); c.rotate(Math.PI); c.fillText(rank, 18, 30); suit(c, s, 18, 44, 8, col); c.restore();
    suit(c, s, W / 2, H / 2, rank === 'A' ? 26 : 18, col);
    if (rank !== 'A') { c.strokeStyle = col; c.globalAlpha = .4; c.strokeRect(30, 34, W - 60, H - 68); c.globalAlpha = 1; }
  });
  // an indoor place's window by the hour (felt room, study): sky, a city or garden outside, a frame and drapes; drawn in a wall's coordinates
  const WIN = {
    morning: { sky: ['#a8c8e8', '#f4e2cc'], far: '#8a9cb0', near: '#6f8472', lights: 0, glow: 'rgba(255,236,206,.30)' },
    day: { sky: ['#6ea8e0', '#d6eaf8'], far: '#8ea4b8', near: '#5f7a5c', lights: 0, glow: 'rgba(255,252,240,.30)' },
    evening: { sky: ['#3a3f78', '#f2a67a'], far: '#4a3e5e', near: '#2a2434', lights: .5, glow: 'rgba(255,186,120,.26)' },
    night: { sky: ['#060a18', '#1a2240'], far: '#141a2a', near: '#0c1018', lights: 1, glow: 'rgba(0,0,0,0)' },
  };
  function paintWindow(c, ppu, T, W0, W1, Y0, Y1, frame, drape, seed) {
    const P = WIN[T], R = rng(seed);
    c.fillStyle = lin(c, Y1, Y0, [[0, P.sky[0]], [1, P.sky[1]]]); c.fillRect(W0, Y0, W1 - W0, Y1 - Y0);
    if (T === 'evening') { c.fillStyle = rad(c, W0 + (W1 - W0) * .3, Y0 + 6, 18, [[0, 'rgba(255,220,170,.8)'], [1, 'rgba(255,180,120,0)']]); c.fillRect(W0, Y0, W1 - W0, Y1 - Y0); }
    blur(c, .45 * ppu);
    c.fillStyle = P.far; for (let x = W0; x < W1; x += 1.6 + R() * 1.6) { const h = 4 + R() * 13; c.fillRect(x, Y0, 1.4 + R() * 1.2, h); }   // the far skyline
    c.fillStyle = P.near; for (let x = W0 - 2; x < W1; x += 3 + R() * 3) ell(c, x, Y0 + 2, 2.6 + R() * 2.4, 3 + R() * 3);   // trees in the street
    if (P.lights) for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(255,${190 + R() * 50 | 0},${110 + R() * 80 | 0},${(.35 + R() * .5) * P.lights})`; c.fillRect(W0 + R() * (W1 - W0), Y0 + 1 + R() * 15, .35, .45); }
    blur(c, 0);
    c.fillStyle = frame; [W0, (W0 + W1) / 2, W1].forEach(x => c.fillRect(x - .4, Y0, .8, Y1 - Y0)); for (let y = Y0; y <= Y1 + .01; y += (Y1 - Y0) / 3) c.fillRect(W0, y - .4, W1 - W0, .8);
    if (drape) [[W0 - 7, W0 + 1], [W1 - 1, W1 + 7]].forEach(([a, b]) => { for (let x = a; x < b; x += .6) { const k = .5 + .5 * Math.sin((x - a) * 3.1); c.fillStyle = `rgb(${drape[0] + k * 40 | 0},${drape[1] + k * 14 | 0},${drape[2] + k * 16 | 0})`; c.fillRect(x, Y0 - 4, .62, Y1 - Y0 + 6); } });
    if (T !== 'night') { blur(c, 2 * ppu); c.fillStyle = P.glow; c.fillRect(W0 - 6, Y0 - 6, W1 - W0 + 12, Y1 - Y0 + 12); blur(c, 0); }
  }
  TABLES[3] = (o) => {
    const { TT, g, scene } = o, FL = -16, T = TOD(o), day = T === 'morning' || T === 'day';
    const ft = feltTex(o);
    ft.wrapS = ft.wrapT = TT.RepeatWrapping; ft.repeat.set(3, 2.2);
    const feltM = M({ map: ft, roughness: .95, bumpScale: .006, sheen: new TT.Color(0x2c7a50) });
    const cz = 2, OX = 23, OZ = 17, RW = 2.4;
    const felt = new TT.Mesh(new TT.PlaneGeometry(2 * OX - 1, 2 * OZ - 1), feltM); felt.rotation.x = -Math.PI / 2; felt.position.set(0, 0, cz); felt.receiveShadow = true; g.add(felt);
    // the walnut rail: a rounded-rectangle ring, extruded with a generous bevel (a padded, polished look)
    const sh = rrect(new TT.Shape(), -OX, -OZ, OX, OZ, 4);
    sh.holes.push(rrect(new TT.Path(), -OX + RW, -OZ + RW, OX - RW, OZ - RW, 2));
    const rg = new TT.ExtrudeGeometry(sh, { depth: .15, bevelEnabled: true, bevelThickness: .75, bevelSize: .95, bevelSegments: 6, curveSegments: 10 });
    const wt = wood('tbl3-walnut', '#7a4a2a', '#2a160b', sz(o, 512), sz(o, 512), 1.6); wt.wrapS = wt.wrapT = TT.RepeatWrapping; wt.repeat.set(.02, .02); wt.offset.set(.5, .5);
    const railM = M({ map: wt, roughness: .45, clearcoat: .35, clearcoatRoughness: .35, bumpScale: .002 });
    const rail = new TT.Mesh(rg, railM); rail.rotation.x = -Math.PI / 2; rail.position.set(0, .05, cz); rail.castShadow = rail.receiveShadow = true; g.add(rail);
    const darkW = M({ color: 0x24140a, roughness: .5 });
    at(g, new TT.Mesh(RB(2 * OX + .6, 3, 2 * OZ + .6, 1.2, 2), darkW), 0, -1.9, cz, 0, false);
    // a heavy turned pedestal to the floor and a carpet
    at(g, lathe(TT, [[0, 0], [9, 0], [9, .6], [5, 1.6], [2.4, 3], [2, 6], [2.6, 9], [2, 12.6], [3.4, 13.2], [0, 13.2]], SEG(o, 32), darkW), 0, FL, cz);
    // chips in stacks, a deck (and a boxed one), a fan of cards, dice, the dealer button, a chip rack, a rocks glass, a score pad
    const chipG = new TT.CylinderGeometry(.82, .82, .2, SEG(o, 24)), chipC = [0xb8282e, 0xf1ece0, 0x24418c, 0x1f6b44, 0x1a1a1a];
    const chipMs = chipC.map(cl => M({ map: canvasTex('chip-edge-' + cl, 64, 16, (c, W, H) => { c.fillStyle = '#' + cl.toString(16).padStart(6, '0'); c.fillRect(0, 0, W, H); c.fillStyle = cl === 0xf1ece0 ? '#2a4a8c' : '#f4efe4'; for (let x = 0; x < W; x += 16) c.fillRect(x, 0, 5, H); }), roughness: .55, clearcoat: .2, bump: false }));
    const chipTop = chipC.map(cl => M({ map: canvasTex('chip-top-' + cl, 64, 64, (c, W) => { c.fillStyle = '#' + cl.toString(16).padStart(6, '0'); c.fillRect(0, 0, W, W); c.strokeStyle = cl === 0xf1ece0 ? '#2a4a8c' : '#f4efe4'; c.lineWidth = 5; c.setLineDash([8, 8]); c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 4, 0, 7); c.stroke(); c.setLineDash([]); c.lineWidth = 1.5; c.beginPath(); c.arc(W / 2, W / 2, W * .3, 0, 7); c.stroke(); }), roughness: .5, clearcoat: .2, bump: false }));
    const stack = (x, z, c0, n, mix = true) => { for (let i = 0; i < n; i++) { const ci = (c0 + (mix && i % 3 === 2 ? 1 : 0)) % chipC.length; const ch = new TT.Mesh(chipG, [chipMs[ci], chipTop[ci], chipTop[ci]]); at(g, ch, x + Math.sin(i * 7.1) * .05, .1 + i * .205, z + Math.cos(i * 3.3) * .05, i * .7); } };
    stack(14.5, -9.4, 0, 7); stack(16.4, -8.6, 1, 5); stack(15.1, -7.4, 2, 4); stack(17.2, -10.4, 4, 9, false); stack(-12.6, -7.2, 3, 6, false); stack(-11.2, -8.4, 0, 3, false);
    const back = canvasTex('tbl3-card', 128, 180, (c, W, H) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, W, H); c.fillStyle = '#8f1e2a'; c.fillRect(8, 8, W - 16, H - 16); c.strokeStyle = 'rgba(255,230,200,.6)'; c.lineWidth = 2; for (let i = -H; i < W + H; i += 10) { c.beginPath(); c.moveTo(i, 8); c.lineTo(i + H, H); c.stroke(); } c.strokeStyle = '#f6f2e8'; c.lineWidth = 3; c.strokeRect(14, 14, W - 28, H - 28); });
    const edge = M({ color: 0xe9e3d4, roughness: .8 });
    const deck = new TT.Mesh(RB(2.5, .5, 3.5, .1, 2), [edge, edge, M({ map: back, roughness: .5, clearcoat: .2 }), edge, edge, edge]); at(g, deck, -15.6, .25, -8.8, .28);
    { const bx = canvasTex('tbl3-box', 128, 180, (c, W, H) => { c.fillStyle = '#1e3264'; c.fillRect(0, 0, W, H); c.strokeStyle = '#d8c08a'; c.lineWidth = 3; c.strokeRect(10, 10, W - 20, H - 20); suit(c, 's', W / 2, H / 2, 22, '#d8c08a'); });
      const side = M({ color: 0x1e3264, roughness: .6 }); at(g, new TT.Mesh(RB(2.6, .95, 3.6, .08, 1), [side, side, M({ map: bx, roughness: .45, clearcoat: .2 }), side, side, side]), -18.6, .48, -7.8, -.15); }
    [['A', 's'], ['K', 'h'], ['Q', 'c'], ['J', 'd'], ['10', 's']].forEach(([r, s], i) => { const cd = new TT.Mesh(RB(2.5, .03, 3.5, .01, 1), [edge, edge, M({ map: cardFace(r, s), roughness: .45, clearcoat: .15, bump: false }), M({ map: back, roughness: .5 }), edge, edge]); const a = -.5 + i * .25; cd.rotation.set(0, a, 0); at(g, cd, -10.4 + Math.sin(a) * 2.2, .02 + i * .03, -11 + Math.cos(a) * 1.4 - 1.4, a, false); });
    { const pips = [0, 1, 2, 3, 4, 5].map(n => { const f = [1, 6, 2, 5, 3, 4][n]; return M({ map: canvasTex('die-' + f, 64, 64, (c, W) => { c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, W, W); c.fillStyle = f === 1 ? '#b8202a' : '#1a1a1a'; const P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.27, .22], [.73, .22], [.27, .5], [.73, .5], [.27, .78], [.73, .78]] }[f]; P.forEach(([a, b]) => { c.beginPath(); c.arc(a * W, b * W, f === 1 ? 9 : 6, 0, 7); c.fill(); }); }), roughness: .3, clearcoat: .6, bump: false }); });
      [[11.4, -4.4, .4], [12.9, -3, -.3]].forEach(([x, z, r]) => at(g, new TT.Mesh(RB(1.15, 1.15, 1.15, .14, 2), pips), x, .58, z, r)); }
    { const bt = canvasTex('dealer-btn', 128, 128, (c, W) => { c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, W, W); c.fillStyle = '#1a1a1a'; c.font = 'bold 22px Georgia, serif'; c.textAlign = 'center'; c.fillText('DEALER', W / 2, W / 2 + 8); c.strokeStyle = '#1a1a1a'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 8, 0, 7); c.stroke(); });
      at(g, new TT.Mesh(new TT.CylinderGeometry(1.15, 1.15, .32, SEG(o, 28)), [M({ color: 0xf6f2ea, roughness: .4 }), M({ map: bt, roughness: .35, clearcoat: .4, bump: false }), M({ color: 0xf6f2ea })]), -8.4, .16, -9.6, .4); }
    { const Gr = grp(TT, g, -17.6, 0, -1.2, Math.PI / 2 + .06); at(Gr, new TT.Mesh(RB(8.6, .7, 3.6, .2, 2), M({ color: 0x2a1a10, roughness: .35, clearcoat: .6 })), 0, .35, 0);
      const rowG = new TT.CylinderGeometry(.78, .78, 7.8, SEG(o, 18)); [0, 1, 2, 3].forEach(i => { const m = new TT.Mesh(rowG, M({ map: canvasTex('chip-row-' + i, 32, 256, (c, W, H) => { c.fillStyle = '#' + chipC[i].toString(16).padStart(6, '0'); c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < H; y += 6.6) c.fillRect(0, y, W, 1); c.fillStyle = chipC[i] === 0xf1ece0 ? 'rgba(40,70,140,.7)' : 'rgba(255,250,240,.6)'; for (let y = 0; y < H; y += 6.6) for (let x = (y / 6.6 % 2) * 8; x < W; x += 16) c.fillRect(x, y + 1, 5, 5); }), roughness: .5, clearcoat: .2, bump: false })); m.rotation.z = Math.PI / 2; at(Gr, m, 0, .9, -1.2 + i * .82); }); }
    { const Gw = grp(TT, g, 15.4, 0, 1.6); at(Gw, new TT.Mesh(new TT.CylinderGeometry(1.5, 1.5, .12, SEG(o, 24)), M({ color: 0x3a2214, roughness: .6 })), 0, .06, 0, 0, false);
      snifter(o, Gw, 0, 0, 0xa8561a, 1).position.y = .12; }   // a snifter of brandy, see-through (2026-11-07: was whisky on the rocks)
    { const Gs = grp(TT, g, 17.8, 0, -3.2, -.3); at(Gs, new TT.Mesh(RB(3.4, .25, 4.8, .05, 1), M({ map: canvasTex('scorepad', 128, 180, (c, W, H) => { c.fillStyle = '#f7f2e2'; c.fillRect(0, 0, W, H); c.fillStyle = '#7a1e2a'; c.fillRect(0, 0, W, 22); c.strokeStyle = 'rgba(60,80,140,.4)'; for (let y = 36; y < H; y += 12) { c.beginPath(); c.moveTo(6, y); c.lineTo(W - 6, y); c.stroke(); } c.strokeStyle = 'rgba(160,40,40,.5)'; c.beginPath(); c.moveTo(W / 2, 26); c.lineTo(W / 2, H - 6); c.stroke(); c.fillStyle = 'rgba(30,30,60,.75)'; for (let y = 46; y < 120; y += 12) { c.fillRect(14 + Math.random() * 8, y - 6, 18 + Math.random() * 14, 2); c.fillRect(W / 2 + 10 + Math.random() * 8, y - 6, 14 + Math.random() * 14, 2); } }), roughness: .85, bump: false })), 0, .125, 0);
      const pen = new TT.Mesh(new TT.CylinderGeometry(.13, .13, 4.4, 6), M({ color: 0xe8b830, roughness: .5 })); pen.rotation.set(0, .5, Math.PI / 2); at(Gs, pen, 2.2, .14, .5); }
    // ... and the clutter of a long game: loose chips, a toppled stack, stray cards face down, a dice cup on its side, a bowl of nuts, a second glass
    { const used = [[14.5, -9.4, 1], [16.4, -8.6, 1], [15.1, -7.4, 1], [17.2, -10.4, 1], [-12.6, -7.2, 1], [-11.2, -8.4, 1], [-15.6, -8.8, 2.2], [-18.6, -7.8, 2.3], [-10.4, -11.4, 3], [11.4, -4.4, 1], [12.9, -3, 1], [-8.4, -9.6, 1.3],
        [-17.6, -4, 2.2], [-17.6, -1.2, 2.2], [-17.6, 1.6, 2.2], [15.4, 1.6, 1.7], [17.8, -3.2, 2.9], [6.6, -10.4, 1.9], [-12.4, -3.8, 1.7], [9.6, -9.6, 1.6], [8.1, -7.4, .8]];
      const R = rng(57), free = (x, z, r) => Math.hypot(x, z) > 9.8 + r && Math.abs(x) < 20 - r && z > -12.2 + r && z < 15.8 - r && used.every(([a, b, q]) => Math.hypot(x - a, z - b) > q + r + .15);
      const place = (r, tries = 60) => { for (let i = 0; i < tries; i++) { const a = R() * Math.PI * 2, d = 10.4 + R() * 9, x = Math.cos(a) * d * 1.15, z = 1.5 + Math.sin(a) * d * .8; if (free(x, z, r)) { used.push([x, z, r]); return [x, z]; } } return null; };
      for (let i = 0; i < 26; i++) { const p = place(.85); if (!p) continue; const ci = (R() * chipC.length) | 0, n = R() < .7 ? 1 : 2 + (R() * 2 | 0);
        for (let k = 0; k < n; k++) { const ch = new TT.Mesh(chipG, [chipMs[ci], chipTop[ci], chipTop[ci]]); ch.rotation.set(n > 1 && k === n - 1 ? .12 : 0, R() * 6, 0); at(g, ch, p[0] + (R() - .5) * .25 * k, .1 + k * .205, p[1] + (R() - .5) * .25 * k); } }
      { const p = [-6.2, -10.8]; used.push([p[0], p[1], 2]); for (let k = 0; k < 5; k++) { const ch = new TT.Mesh(chipG, [chipMs[2], chipTop[2], chipTop[2]]); ch.rotation.set(Math.PI / 2 - .2, 0, .3); at(g, ch, p[0] + k * .22, .82, p[1] + k * .05); } }   // a toppled stack
      for (let i = 0; i < 6; i++) { const p = place(2.1); if (!p) continue; const cd = new TT.Mesh(RB(2.5, .03, 3.5, .01, 1), [edge, edge, M({ map: back, roughness: .5, clearcoat: .2 }), edge, edge, edge]); at(g, cd, p[0], .02 + i * .004, p[1], R() * 6, false); }
      { const Gc = grp(TT, g, 9.6, 1.25, -9.6, .7), lea = M({ map: X.cloth('tbl3-cup', '#3a2216', 16, 128), roughness: .6 }); const cup = lathe(TT, [[0, 0], [1.05, 0], [1.2, .2], [1.25, 2.9], [1.38, 3.05], [1.3, 3.15], [1.12, 3], [1.06, .25], [0, .22]], SEG(o, 20), lea); cup.material.side = TT.DoubleSide; cup.rotation.z = Math.PI / 2; at(Gc, cup, 1.4, 0, 0);
        at(Gc, new TT.Mesh(new TT.TorusGeometry(1.3, .08, 6, 20), M({ color: 0xc8a050, metalness: 1, roughness: .3 })), -1.5, 0, 0).rotation.y = Math.PI / 2; }
      { const pips2 = [1, 6, 2, 5, 3, 4].map(f => M({ map: canvasTex('die-' + f, 64, 64, () => {}), roughness: .3, clearcoat: .6, bump: false })); at(g, new TT.Mesh(RB(1.15, 1.15, 1.15, .14, 2), pips2), 8.1, .58, -7.4, 1.1); }
      { const Gb = grp(TT, g, 6.6, 0, -10.4); at(Gb, lathe(TT, [[0, 0], [.9, 0], [1.6, .6], [1.85, 1.2], [1.7, 1.25], [1.45, .7], [0, .5]], SEG(o, 24), M({ color: 0x2a1a10, roughness: .3, clearcoat: .7 })), 0, 0, 0);
        const nut = M({ color: 0xb98a54, roughness: .6 }), nut2 = M({ color: 0x7a4a22, roughness: .5 }); for (let i = 0; i < 26; i++) { const a = i * 2.39, r = Math.sqrt(i / 26) * 1.35; const m = new TT.Mesh(new TT.SphereGeometry(.24, 6, 4), i % 3 ? nut : nut2); m.scale.set(1.3, .7, .9); m.rotation.y = a; at(Gb, m, Math.cos(a) * r, .75 + (1 - r / 1.35) * .3 + (i % 2) * .1, Math.sin(a) * r, 0, false); } }
      { const Gw = grp(TT, g, -12.4, 0, -3.8); at(Gw, new TT.Mesh(new TT.CylinderGeometry(1.5, 1.5, .12, SEG(o, 24)), M({ color: 0x3a2214, roughness: .6 })), 0, .06, 0, 0, false); snifter(o, Gw, 0, 0, 0xa8561a, .3).position.y = .12; }
    }
    // the club room around it: dark panelled walls with warm sconces, a patterned carpet, a coffered ceiling
    const XL = -70, XR = 70, ZB = -60, ZF = 150, Y1 = 50;
    const carpet = canvasTex('tbl3-carpet', sz(o, 512), sz(o, 512), (c, W) => { c.fillStyle = '#3a1416'; c.fillRect(0, 0, W, W); const u = W / 8; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#4a1c1c' : '#2c1012'; c.beginPath(); c.moveTo(i * u + u / 2, j * u); c.lineTo(i * u + u, j * u + u / 2); c.lineTo(i * u + u / 2, j * u + u); c.lineTo(i * u, j * u + u / 2); c.fill(); c.fillStyle = 'rgba(190,150,80,.35)'; c.beginPath(); c.arc(i * u + u / 2, j * u + u / 2, u * .08, 0, 7); c.fill(); }
      const N = makeNoise(4), img = c.getImageData(0, 0, W, W), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 18; d[p] += k; d[p + 1] += k * .6; d[p + 2] += k * .6; } c.putImageData(img, 0, 0); });
    roomBox(o, { key: 'tbl3-room-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024,
      floor: M({ map: rep(TT, carpet, 10, 12), roughness: .95, color: 0x8a7a70, bumpScale: .006 }),
      back: (c, ppu) => {
        const R = rng(11);
        c.fillStyle = '#0d0907'; c.fillRect(XL - 2, FL - 2, XR - XL + 4, Y1 - FL + 4);
        c.fillStyle = '#17100a'; c.fillRect(XL - 2, FL - 2, XR - XL + 4, 16); c.fillStyle = 'rgba(200,160,90,.25)'; c.fillRect(XL - 2, FL + 14, XR - XL + 4, .4);   // wainscot + brass rail
        for (let x = XL; x < XR; x += 12) { c.strokeStyle = 'rgba(70,46,26,.6)'; c.lineWidth = .35; c.strokeRect(x + 1.2, FL + 2, 9.6, 10.5); c.strokeRect(x + 1.2, FL + 17, 9.6, 26); }
        blur(c, .8 * ppu);
        [[-30, 26], [30, 26], [-56, 26], [56, 26]].forEach(([x, y]) => { c.fillStyle = rad(c, x, y, 12, [[0, 'rgba(255,190,110,.55)'], [.18, 'rgba(255,170,90,.22)'], [1, 'rgba(255,150,80,0)']]); c.fillRect(x - 13, y - 13, 26, 26); });
        for (let i = 0; i < 30; i++) { const x = XL + R() * (XR - XL), y = FL + 18 + R() * 30, r = .5 + R() * 1.3, warm = R() > .3; c.fillStyle = warm ? `rgba(255,${190 + R() * 40 | 0},120,${.06 + R() * .12})` : `rgba(120,200,190,${.05 + R() * .08})`; ell(c, x, y, r, r); }
        blur(c, 0);
        [[-30, 26], [30, 26], [-56, 26], [56, 26]].forEach(([x, y]) => { c.fillStyle = 'rgba(200,160,90,.7)'; c.fillRect(x - .2, y - 3, .4, 3); c.fillStyle = 'rgba(255,226,170,.9)'; c.beginPath(); c.moveTo(x - 1.6, y + 1.6); c.lineTo(x + 1.6, y + 1.6); c.lineTo(x + 1, y - .6); c.lineTo(x - 1, y - .6); c.fill(); });
        c.fillStyle = 'rgba(190,150,80,.55)'; c.fillRect(-9, 18, 18, 14); c.fillStyle = 'rgba(30,22,16,1)'; c.fillRect(-8.2, 18.8, 16.4, 12.4); c.fillStyle = 'rgba(110,80,52,.55)'; ell(c, -2, 24.6, 4.6, 3.2); c.fillStyle = 'rgba(70,90,70,.45)'; ell(c, 3.6, 22.4, 3, 1.8);   // a gilt-framed painting
        c.fillStyle = rad(c, 0, 16, 60, [[0, 'rgba(60,44,30,.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(XL - 2, FL - 2, XR - XL + 4, Y1 - FL + 4);
      },
      left: (c, ppu) => { c.fillStyle = day ? '#1a120c' : '#0b0806'; c.fillRect(-ZF - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4); c.fillStyle = 'rgba(200,160,90,.2)'; c.fillRect(-ZF - 2, FL + 14, ZF - ZB + 4, .4); c.fillStyle = rad(c, 54, 26, 10, [[0, `rgba(255,180,100,${day ? .18 : .4})`], [1, 'rgba(255,170,90,0)']]); c.fillRect(44, 16, 20, 20);
        paintWindow(c, ppu, T, 10, 34, FL + 16, Y1 - 8, '#1a120a', [60, 20, 22], 31);   // a tall window with velvet drapes: the hour shows here
        if (day) { c.fillStyle = rad(c, 22, 14, 40, [[0, 'rgba(255,240,215,.16)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(-20, FL, 84, Y1 - FL); } },
      right: (c) => { c.fillStyle = '#0b0806'; c.fillRect(ZB - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4); c.fillStyle = 'rgba(200,160,90,.2)'; c.fillRect(ZB - 2, FL + 14, ZF - ZB + 4, .4); c.fillStyle = rad(c, -40, 26, 10, [[0, 'rgba(255,180,100,.4)'], [1, 'rgba(255,170,90,0)']]); c.fillRect(-50, 16, 20, 20); },
      ceil: (c) => { c.fillStyle = '#080605'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, ZF - ZB + 4); c.strokeStyle = 'rgba(60,40,24,.6)'; c.lineWidth = .6; for (let x = XL; x < XR; x += 14) for (let z = ZB; z < ZF; z += 14) c.strokeRect(x + 1, z + 1, 12, 12); },
    });
    // the lampshade over the table (a green-glass billiard shade; hidden in the play view)
    { const Gp = grp(TT, g, 0, 0, cz); Gp.userData.viewOnly = 1; Gp.userData.keep = 1;
      at(Gp, lathe(TT, [[0, 0], [7.2, 0], [7, .4], [5.4, 2.4], [1.4, 4.2], [.5, 4.6], [0, 4.6]], SEG(o, 32), M({ color: 0x0f4a2a, roughness: .2, clearcoat: 1, side: TT.DoubleSide, emissive: new TT.Color(0x031a0c) })), 0, 32, 0, 0, false);
      const dif = new TT.Mesh(new TT.CircleGeometry(7, SEG(o, 32)), new TT.MeshBasicMaterial({ color: 0xfff2d8, toneMapped: false })); dif.rotation.x = Math.PI / 2; at(Gp, dif, 0, 32.05, 0, 0, false);
      at(Gp, new TT.Mesh(new TT.CylinderGeometry(.08, .08, Y1 - 36.6, 5), M({ color: 0xb08850, metalness: 1, roughness: .3 })), 0, 36.6 + (Y1 - 36.6) / 2, 0, 0, false); }
    try { X.mergeStatic(g); } catch (e) {}
    scene.add(new TT.HemisphereLight(day ? 0xdde6f4 : T === 'evening' ? 0xd8a888 : 0x8a96a8, 0x0a0a0a, day ? .3 : T === 'evening' ? .17 : .1));
    if (day || T === 'evening') { const wl = new TT.DirectionalLight(day ? 0xeef2ff : 0xffb888, day ? .5 : .3); wl.position.set(-40, 20, -10); scene.add(wl); }   // daylight through the window
    const key = new TT.SpotLight(0xfff0d4, 4.4, 90, .3, .85, 1.1); key.position.set(0, 36, 3); key.target.position.set(0, 0, 0); scene.add(key); scene.add(key.target);
    key.shadow.camera.near = 10; key.shadow.camera.far = 60; key.shadow.bias = -.0002;
    const rim = new TT.DirectionalLight(0xffd7a0, .18); rim.position.set(-12, 8, -18); scene.add(rim);
    return { bg: day ? '#120d09' : '#060607', exp: day ? .86 : .95, board: .34, boardCol: 0xfff0dc, key, env: { top: '#2b2620', bottom: '#040404', panels: [[0, 22, 3, 12, 12, '#fff0d8', 4], [-16, 8, -10, 5, 9, '#ffcf96', .9], [16, 8, -10, 5, 9, '#ffcf96', .7], [0, 9, 20, 22, 5, '#d8c8b0', .55], [-18, 6, 8, 5, 8, '#ffe2b8', .5]] } };
  };
  TABLES[3].plain = { sun: 0xfff0d4, sunI: .8, hemi: [0xc8d4c8, 0x203020, .42], exp: .66 };
  TABLES[3].floor = (o) => ({ img: feltTex(o).image, w: 15, h: 15, dark: true,
    over: 'radial-gradient(60% 58% at 50% 44%, rgba(255,240,210,.14), transparent 75%), radial-gradient(125% 115% at 50% 46%, transparent 48%, rgba(0,0,0,.58))' });

  /* ---------- 4 · テラス: a marble table on a terracotta terrace over the sea, a stone balustrade, the house wall; morning ... night ---------- */
  const marbleTex = o => { const W = sz(o, 1024); return canvasTex('tbl4-marble', W, W, (c) => {
      const N = makeNoise(53), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / W;
        const w1 = N(u * 2.2, v * 2.2, 5), w2 = N(u * 4 + 9, v * 4 + 3, 4);
        const vein = Math.abs(Math.sin((u * 2.6 + v * 1.4 + w1 * 2.6) * Math.PI)), fine = Math.abs(Math.sin((u * 7 - v * 3 + w2 * 3.2) * Math.PI));
        let k = Math.pow(1 - vein, 20) * .55 + Math.pow(1 - fine, 40) * .28 + (N(u * 12, v * 12, 3) - .5) * .06;
        const cloud = (N(u * 3 + 20, v * 3, 4) - .5) * .1;
        const i = (y * W + x) * 4, L = 247 - k * 110 + cloud * 50;
        d[i] = L + 1; d[i + 1] = L - 1; d[i + 2] = L - 4 + k * 4; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }); };
  const TER = {   // sky (zenith → horizon), the sea (far → near), the sun / moon (azimuth°, height), the key light, ambient, exposure
    morning: { sky: ['#7fa8d6', '#c9dcec', '#f7e4cc'], sea: ['#8fb0c8', '#4d7f9e'], sun: [-38, 26, '#fff4dc'], hill: ['#8a9cb0', '#6f8a8a'], key: [0xffe6c4, 1.35, [-26, 14, -22]], hemi: [0xe2ecfa, 0xd8b896, .5], exp: .76, board: .26, light: 0 },
    day: { sky: ['#3f86d6', '#8cc0ea', '#dcedf8'], sea: ['#4f93c2', '#25638f'], sun: [-20, 120, '#ffffff'], hill: ['#7f97a8', '#5d7f5a'], key: [0xfff6ea, 1.45, [-10, 30, -12]], hemi: [0xf2f6ff, 0xe0c0a0, .5], exp: .72, board: .24, light: 0 },
    evening: { sky: ['#33407e', '#b06fa0', '#ffc086'], sea: ['#9a7fae', '#434b88'], sun: [-12, 8, '#fff2d0'], hill: ['#6a5788', '#4e3e66'], key: [0xffc896, 1.2, [-8, 9, -22]], hemi: [0xfbe4e0, 0xffd0b0, .48], exp: .8, board: .32, light: 1 },
    night: { sky: ['#03060f', '#0b1530', '#1d2b4e'], sea: ['#13203c', '#070d1c'], sun: [18, 60, '#f4f0dc'], hill: ['#0e1426', '#0a0f1c'], key: [0xaebce8, .55, [14, 26, -16]], hemi: [0x34405e, 0x1a1410, .34], exp: .9, board: .5, light: 2 },
  };
  TABLES[4] = (o) => {
    const { TT, g, scene } = o, T = TOD(o), D = TER[T], FL = -16, Z0 = 1;
    const mt = marbleTex(o);
    const marble = M({ map: mt, bump: false, roughness: .3, clearcoat: .35, clearcoatRoughness: .2 });
    at(g, new TT.Mesh(RB(28, 1.2, 21, .4, 3), marble), 0, -.6, Z0, 0, false).receiveShadow = true;
    // a wrought-iron base: a frame under the top, four slim legs with scrolled feet
    const iron = M({ color: 0x1c1c1e, roughness: .45, metalness: .6 });
    at(g, new TT.Mesh(RB(24, 1.2, 17, .15, 1), iron), 0, -1.8, Z0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { at(g, new TT.Mesh(new TT.CylinderGeometry(.42, .42, 14.6, SEG(o, 8)), iron), a * 11.4, FL + 7.3, Z0 + b * 7.8); const f = new TT.Mesh(new TT.TorusGeometry(.8, .22, 6, 12, Math.PI), iron); f.rotation.y = Math.atan2(b, a); at(g, f, a * 11.8, FL + .2, Z0 + b * 8.2); });
    // the terrace: terracotta tiles; the stone balustrade (back and right); the house wall (left)
    const tileT = canvasTex('tbl4-tiles', sz(o, 512), sz(o, 512), (c, W) => { const R = rng(8), u = W / 4; c.fillStyle = '#d8c8b0'; c.fillRect(0, 0, W, W);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const k = R(); c.fillStyle = `rgb(${190 + k * 30 | 0},${100 + k * 22 | 0},${66 + k * 14 | 0})`; c.fillRect(i * u + 3, j * u + 3, u - 6, u - 6); for (let n = 0; n < 40; n++) { c.fillStyle = `rgba(${R() > .5 ? '255,220,190' : '90,40,20'},${.05 + R() * .08})`; ell(c, i * u + 3 + R() * (u - 6), j * u + 3 + R() * (u - 6), 2 + R() * 9, 2 + R() * 7); } } });
    const ZB = -58, XL = -60, XR = 64, ZF = 150;
    const floorM = M({ map: rep(TT, tileT, (XR - XL) / 26, (ZF - ZB) / 26), roughness: .7, bumpScale: .006, color: T === 'night' ? 0x8090b0 : 0xffffff });
    { const m = new TT.Mesh(new TT.PlaneGeometry(XR - XL + 2, ZF - ZB + 2), floorM); m.rotation.x = -Math.PI / 2; m.position.set((XL + XR) / 2, FL, (ZB + ZF) / 2); m.receiveShadow = true; g.add(m); }
    const stoneM = M({ map: canvasTex('tbl4-stone', 256, 256, (c, W) => { const N = makeNoise(77), img = c.createImageData(W, W), d = img.data; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const k = (N(x / 4, y / 4, 3) - .5) * 30 + (Math.random() - .5) * 10, i = (y * W + x) * 4; d[i] = 226 + k; d[i + 1] = 214 + k; d[i + 2] = 192 + k; d[i + 3] = 255; } c.putImageData(img, 0, 0); }), roughness: .85, bumpScale: .01 });
    const BH = 9.8, balG = new TT.LatheGeometry(V2(TT, [[1.2, 0], [1.2, 1.1], [.6, 1.7], [1.25, 6.4], [1.28, 8.6], [.48, 13.2], [.62, 14.5], [1.1, 15.1], [1.1, 16.4]].map(([r, y]) => [r * .85, y * BH / 16.4])), o.COARSE ? 6 : 8);   // a low balustrade (≈ 60 cm): the sea shows over it from the table   // (open at both ends: the plinth and the rail cover them)
    // the sea side (back) is clear glass between stone piers, so the beach and the surf show over the table; the right side keeps stone balusters
    const glassP = M({ color: 0xdfeef0, roughness: .03, clearcoat: 1, transparent: true, opacity: .16, depthWrite: false }), capM = M({ color: 0xb8bcc0, metalness: 1, roughness: .3 });
    const run = (x0, z0, x1, z1, glass) => { const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0), n = Math.floor(L / 2.5);
      const G = grp(TT, g, (x0 + x1) / 2, 0, (z0 + z1) / 2, -ang);
      at(G, new TT.Mesh(RB(L, 2.2, 3.8, .15, 1), stoneM), 0, FL + 1.1, 0);
      if (glass) { at(G, new TT.Mesh(new TT.PlaneGeometry(L, BH + 1.8), glassP), 0, FL + 2.2 + (BH + 1.8) / 2, 0, 0, false); at(G, new TT.Mesh(RB(L, .45, .7, .2, 1), capM), 0, FL + 2.2 + BH + 1.9, 0, 0, false);
        for (let i = 0; i <= 4; i++) at(G, new TT.Mesh(RB(3.6, BH + 2.6, 4, .2, 1), stoneM), -L / 2 + i * L / 4, FL + 2.2 + (BH + 2.6) / 2, 0); return; }
      at(G, new TT.Mesh(RB(L + 1, 1.8, 4.4, .45, 2), stoneM), 0, FL + 2.2 + BH + .9, 0);
      for (let i = 0; i < n; i++) at(G, new TT.Mesh(balG, stoneM), -L / 2 + (i + .5) * L / n, FL + 2.2, 0, 0, false);
      for (let i = 0; i <= 4; i++) at(G, new TT.Mesh(RB(3.6, BH, 4, .1, 1), stoneM), -L / 2 + i * L / 4, FL + 2.2 + BH / 2, 0);   // the piers
    };
    run(XL, ZB, XR, ZB, true); run(XR, ZB, XR, 70);
    // lavender in pots along the balustrade, a lemon tree by the house
    const terra = M({ color: 0xc27a52, roughness: .85 }), lav = M({ color: 0x8a76c8, roughness: .7 }), lavG = new TT.CylinderGeometry(.1, .04, 1.5, 5), stemM = M({ color: 0x7e9468, roughness: .8 });
    [[-34, ZB + 4], [-14, ZB + 4], [18, ZB + 4], [40, ZB + 4], [XR - 4, -30]].forEach(([x, z], i) => { at(g, lathe(TT, [[0, 0], [1.8, 0], [2.4, 3.4], [2.6, 3.5], [2.6, 4], [0, 3.8]], SEG(o, 16), terra), x, FL, z); const R = rng(i + 3);
      for (let k = 0; k < 18; k++) { const a = R() * 6.3, r = R() * 1.8, h = 2.5 + R() * 2.2, s = new TT.Mesh(new TT.CylinderGeometry(.05, .05, h, 3), stemM); s.rotation.set((R() - .5) * .5, 0, (R() - .5) * .5); at(g, s, x + Math.cos(a) * r, FL + 3.8 + h / 2, z + Math.sin(a) * r, 0, false); at(g, new TT.Mesh(lavG, lav), x + Math.cos(a) * r * 1.15, FL + 3.8 + h + .5, z + Math.sin(a) * r * 1.15, 0, false); } });
    { const Gt = grp(TT, g, -50, FL, -44); at(Gt, lathe(TT, [[0, 0], [3.2, 0], [4.2, 6.4], [4.5, 6.6], [4.5, 7.4], [0, 7]], SEG(o, 24), terra), 0, 0, 0);
      at(Gt, new TT.Mesh(new TT.CylinderGeometry(.35, .55, 12, 6), M({ color: 0x6b5638, roughness: .9 })), 0, 13, 0);
      foliage(o, Gt, o.COARSE ? 70 : 120, 0, 23, 0, 6.5, 5, 6.5, leafTex('leaf-lemon', '#4f7a36', '#2f5a28'), 1.6, 12);
      const lm = M({ color: 0xf2cf3a, roughness: .42, clearcoat: .2 }), R = rng(2); for (let i = 0; i < 12; i++) { const a = R() * 6.3, r = 4 + R() * 2.4; const l = new TT.Mesh(new TT.SphereGeometry(.62, 10, 8), lm); l.scale.set(1.2, .92, .92); at(Gt, l, Math.cos(a) * r, 20 + R() * 7, Math.sin(a) * r); } }
    ao(o, -50, FL, -44, 12, 12, .4);
    // two bistro chairs across the table: black iron, woven rattan seats
    const rattan = M({ map: canvasTex('rattan', 128, 128, (c, W) => { c.fillStyle = '#c8a46c'; c.fillRect(0, 0, W, W); for (let y = 0; y < W; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) { c.fillStyle = 'rgba(110,70,30,.45)'; c.fillRect(x, y, 8, 8); c.fillStyle = 'rgba(255,240,200,.18)'; c.fillRect(x + 1, y + 1, 6, 2); } }), roughness: .75 });
    // (2026-11-07) the back is one piece now: the back legs run on up as its uprights, a curved top rail and a woven rattan panel
    // bowed between them (it was a hoop floating over the seat with a flat panel poking out of it)
    const chair = (x, z, ry) => { const G = grp(TT, g, x, FL, z, ry), lg = new TT.CylinderGeometry(.22, .22, 10.2, 6);
      [[-3, 3], [3, 3]].forEach(([a, b]) => { const l = new TT.Mesh(lg, iron); l.rotation.set(b * .015, 0, -a * .015); at(G, l, a, 5.1, b); });
      at(G, new TT.Mesh(new TT.CylinderGeometry(3.9, 3.9, .7, SEG(o, 24)), [iron, rattan, iron]), 0, 10.4, 0);
      at(G, new TT.Mesh(new TT.TorusGeometry(3.9, .18, 6, SEG(o, 28)), iron), 0, 10.4, 0, 0, false).rotation.x = Math.PI / 2;
      const bow = (xx) => -3.1 - .75 * (1 - (xx / 3.2) * (xx / 3.2));   // the back's curve (z at x)
      const lean = (y) => (y - 10.8) * .12;   // leaning back as it rises
      [-1, 1].forEach(s2 => { const a = new TT.Vector3(s2 * 3, 0, -3), b = new TT.Vector3(s2 * 3.05, 10.6, bow(3.05) - .1), c = new TT.Vector3(s2 * 3.1, 18, bow(3.1) - lean(18));
        G.add(rod(TT, iron, a, b, .22)); G.add(rod(TT, iron, b, c, .22)); at(G, new TT.Mesh(new TT.SphereGeometry(.3, 8, 6), iron), c.x, c.y + .1, c.z); });
      const railY = (k) => new TT.CatmullRomCurve3([-3.1, -1.6, 0, 1.6, 3.1].map(xx => new TT.Vector3(xx, k, bow(xx) - lean(k))));
      at(G, new TT.Mesh(new TT.TubeGeometry(railY(17.6), 24, .24, 6, false), iron), 0, 0, 0);
      at(G, new TT.Mesh(new TT.TubeGeometry(railY(12.4), 24, .16, 6, false), iron), 0, 0, 0);
      { const pg = new TT.BoxGeometry(6, 4.8, .22, 14, 1, 1), P = pg.attributes.position; for (let i = 0; i < P.count; i++) { const xx = P.getX(i), yy = P.getY(i) + 15; P.setZ(i, P.getZ(i) + bow(xx) - lean(yy)); }
        pg.computeVertexNormals(); at(G, new TT.Mesh(pg, rattan), 0, 15, 0); } };
    chair(-7, -13.6, 0); chair(7, -13.6, 0);
    // the sea, the coast and the sky: a painted band all round the view, a sky dome over it and the sea below it
    const PR = 300, DEG = PR * Math.PI / 180, AL = -75, AR = 110, BY0 = -110, BY1 = 130, HZ = 6;
    const ax = a => -a * DEG;   // the band's drawing x of an azimuth (degrees right of straight ahead)
    const skyAt = (y) => { const e = Math.atan2(y, PR) / (Math.PI / 2); const [z, m, h] = D.sky; return e > .25 ? [m, z, (e - .25) / .75] : [h, m, Math.max(0, e) / .25]; };
    const band = ptex(o, 'tbl4-pano-' + T, ax(AR), BY0, ax(AL), BY1, 3072, (c, ppu) => {
      const R = rng(5), W0 = ax(AR), W1 = ax(AL), Wd = W1 - W0;
      c.fillStyle = lin(c, BY1, HZ, [[0, D.sky[0]], [.55, D.sky[1]], [1, D.sky[2]]]); c.fillRect(W0, HZ, Wd, BY1 - HZ);
      // the sun (or the moon) and its glow
      const SX = ax(D.sun[0]), SY = HZ + D.sun[1];
      if (T !== 'night') { c.fillStyle = rad(c, SX, SY, T === 'day' ? 160 : 120, [[0, 'rgba(255,248,226,.9)'], [.08, 'rgba(255,226,180,.55)'], [.45, 'rgba(255,200,150,.16)'], [1, 'rgba(255,190,140,0)']]); c.fillRect(W0, HZ, Wd, BY1 - HZ); c.fillStyle = D.sun[2]; ell(c, SX, SY, 4.2, 4.2); }
      else { c.fillStyle = rad(c, SX, SY, 40, [[0, 'rgba(230,236,255,.35)'], [1, 'rgba(200,210,255,0)']]); c.fillRect(SX - 40, SY - 40, 80, 80); c.fillStyle = D.sun[2]; ell(c, SX, SY, 3.6, 3.6); c.fillStyle = 'rgba(180,186,170,.35)'; ell(c, SX - 1, SY + .8, 1, .8); ell(c, SX + 1.3, SY - 1.1, .7, .6);
        for (let i = 0; i < 380; i++) { const y = HZ + 8 + R() * (BY1 - HZ - 8); c.fillStyle = `rgba(255,255,${230 + R() * 25 | 0},${.25 + R() * .6 * Math.min(1, (y - HZ) / 40)})`; const r = .18 + R() * .3; ell(c, W0 + R() * Wd, y, r, r); } }
      // clouds
      blur(c, 1.6 * ppu);
      const cl = T === 'night' ? 'rgba(40,50,80,.45)' : T === 'evening' ? 'rgba(255,190,190,.55)' : 'rgba(255,255,255,.8)';
      for (let i = 0; i < 26; i++) { const x = W0 + R() * Wd, y = HZ + 14 + R() * 60, w = 14 + R() * 40; c.fillStyle = cl; ell(c, x, y, w, 2 + R() * 4); if (T !== 'night') { c.fillStyle = 'rgba(255,255,255,.2)'; ell(c, x - w * .2, y + 1.2, w * .5, 1.6); } }
      blur(c, 0);
      // the far coast: a long headland on the right with a white village, islands on the left
      const ridge = (a0, a1, h, col, seed) => { const Rr = rng(seed); c.fillStyle = col; c.beginPath(); c.moveTo(ax(a0), HZ); for (let a = a0; a <= a1; a += .5) { const t = (a - a0) / (a1 - a0), y = HZ + h * Math.sin(t * Math.PI) * (.7 + .3 * Math.sin(t * 11 + seed)) + Rr() * .6; c.lineTo(ax(a), y); } c.lineTo(ax(a1), HZ); c.fill(); };
      blur(c, .5 * ppu);
      ridge(-62, -28, 9, D.hill[0], 3); ridge(-44, -36, 4, D.hill[1], 4);
      ridge(16, 112, 30, D.hill[0], 7); ridge(30, 112, 20, D.hill[1], 9);
      blur(c, 0);
      for (let i = 0; i < 90; i++) { const a = 34 + R() * 40, y = HZ + 2 + R() * (8 + (a - 34) * .28); const x = ax(a), w = 1.4 + R() * 1.8, h = 1 + R() * .9;
        c.fillStyle = T === 'night' ? '#20283c' : T === 'evening' ? '#e6c8c0' : '#f4efe6'; c.fillRect(x, y, w, h); c.fillStyle = T === 'night' ? '#141a28' : '#b8603a'; c.fillRect(x - .1, y + h, w + .2, .35);
        if (T === 'night' && R() > .35) { c.fillStyle = 'rgba(255,200,120,.95)'; c.fillRect(x + w * .3, y + h * .3, .35, .35); } if (T === 'evening' && R() > .8) { c.fillStyle = 'rgba(255,214,150,.9)'; c.fillRect(x + w * .3, y + h * .3, .3, .3); } }
      c.fillStyle = T === 'night' ? '#060a12' : '#2c3a26'; for (let i = 0; i < 26; i++) { const a = 30 + R() * 50, y = HZ + 3 + R() * 14; ell(c, ax(a), y + 2.4, .45, 2.4); }   // cypresses
      // the sea: deeper near, glitter under the sun / the moon
      c.fillStyle = lin(c, HZ, BY0, [[0, D.sea[0]], [.35, D.sea[1]], [1, D.sea[1]]]); c.fillRect(W0, BY0, Wd, HZ - BY0);
      c.fillStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 260; i++) { const y = HZ - R() * (HZ - BY0); c.fillRect(W0 + R() * Wd, y, 2 + R() * 10 * (1 - (HZ - y) / 200), .14); }
      for (let i = 0; i < 140; i++) { const y = HZ - .3 - R() * 70, k = 1 - (HZ - y) / 80, wd = (1.5 + R() * 5) * (1.4 - k); c.fillStyle = T === 'night' ? `rgba(220,230,255,${.2 + R() * .4})` : `rgba(255,${235 + R() * 20 | 0},${200 + R() * 40 | 0},${.25 + R() * .5})`; c.fillRect(SX - wd / 2 + (R() - .5) * (4 + (1 - k) * 22), y, wd, .22); }
      if (T !== 'night') [[-28, -2.4], [8, -1.2], [52, -3]].forEach(([a, y]) => { const x = ax(a); c.fillStyle = '#fbfbf6'; c.beginPath(); c.moveTo(x, HZ + y + .6); c.lineTo(x + .1, HZ + y + 4); c.lineTo(x + 2, HZ + y + .6); c.fill(); c.fillStyle = '#5a4a3a'; c.fillRect(x - 1.2, HZ + y, 3.4, .6); });   // sails
      else [[30, -1.6], [-18, -2.2]].forEach(([a, y]) => { c.fillStyle = 'rgba(255,220,150,.9)'; ell(c, ax(a), HZ + y, .4, .4); });
      // the near shore: a sandy cove below the terrace — shallow water, surf lines breaking on the beach, rocks at both ends
      { const SAND = { morning: ['#e8d2b0', '#c9ac86', '#7fbfc0'], day: ['#f0dcb8', '#cdb088', '#5fc4c8'], evening: ['#d8b096', '#a8806e', '#8a86b0'], night: ['#3a3a48', '#24242e', '#1c2a44'] }[T];
        const shore = a => -50 + 7 * Math.sin((a + 12) / 26) + 3 * Math.sin(a / 7.3);   // (seen through the glass rail from the table: ≈ 11–20° below the eye)
        const path = (dy, close) => { c.beginPath(); c.moveTo(ax(AR), BY0 - 2); for (let a = AR; a >= AL; a -= 1) c.lineTo(ax(a), shore(a) + dy); c.lineTo(ax(AL), BY0 - 2); c.closePath(); };
        c.fillStyle = lin(c, shore(0) + 26, shore(0) - 2, [[0, 'rgba(0,0,0,0)'], [1, SAND[2]]]); path(26); c.fill();   // shallow, clear water over the sand
        blur(c, .25 * ppu);
        for (let k = 0; k < 4; k++) { const dy = 2 + k * k * 2.6 + R() * 1.2; c.strokeStyle = T === 'night' ? `rgba(200,210,240,${.28 - k * .05})` : `rgba(255,255,255,${.75 - k * .14})`; c.lineWidth = 1.1 - k * .18; c.beginPath(); for (let a = AR; a >= AL; a -= 1.5) { const y = shore(a) + dy + Math.sin(a * .9 + k) * .7; a === AR ? c.moveTo(ax(a), y) : c.lineTo(ax(a), y); } c.stroke(); }   // surf lines
        blur(c, 0);
        c.fillStyle = T === 'night' ? 'rgba(210,220,250,.35)' : 'rgba(255,255,255,.85)'; c.beginPath(); for (let a = AR; a >= AL; a -= 1) c.lineTo(ax(a), shore(a) + .9 + Math.sin(a * 2.1) * .35); for (let a = AL; a <= AR; a += 1) c.lineTo(ax(a), shore(a) - .2); c.fill();   // the foam on the edge
        c.fillStyle = SAND[1]; path(0); c.fill();   // wet sand
        c.fillStyle = lin(c, shore(0) - 2, BY0, [[0, SAND[1]], [.06, SAND[0]], [1, SAND[0]]]); path(-1.6); c.fill();   // dry sand
        for (let i = 0; i < 260; i++) { const a = AL + R() * (AR - AL), y = shore(a) - 2 - R() * 60; c.fillStyle = `rgba(${R() > .5 ? '255,250,235' : '120,96,70'},${.06 + R() * .08})`; ell(c, ax(a), y, .4 + R() * 1.4, .25 + R() * .5); }
        [[-62, 14], [74, 18]].forEach(([a0, w], j) => { for (let i = 0; i < 9; i++) { const a = a0 + (R() - .5) * w, y = shore(a) - 4 + R() * 9; c.fillStyle = T === 'night' ? '#14161e' : ['#6a6258', '#857b6e', '#4e4842'][i % 3]; ell(c, ax(a), y, 2 + R() * 4, 1.4 + R() * 2.6); } });
        if (T === 'day' || T === 'morning') [[-14, '#e2574c'], [-6, '#f2c94c'], [9, '#4f9fd8'], [21, '#f2f2ec']].forEach(([a, col], i) => { const x = ax(a), y = shore(a) - 7 - (i % 2) * 5; c.fillStyle = 'rgba(80,60,40,.25)'; ell(c, x + .6, y - .3, 2.2, .5); c.fillStyle = '#5a4a3a'; c.fillRect(x - .08, y, .16, 2.4); c.fillStyle = col; c.beginPath(); c.moveTo(x - 2.2, y + 2.3); c.quadraticCurveTo(x, y + 3.6, x + 2.2, y + 2.3); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)'; c.fillRect(x + 2.4, y - .1, 2, .5); });   // parasols and towels
      }
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = lin(c, BY1, BY1 - 34, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(W0, BY1 - 34, Wd, 34); c.globalCompositeOperation = 'source-over';   // the top fades into the dome
    });
    const th0 = Math.PI - AR * Math.PI / 180, thL = (AR - AL) * Math.PI / 180;
    const bm = new TT.Mesh(new TT.CylinderGeometry(PR, PR, BY1 - BY0, 48, 1, true, th0, thL), new TT.MeshBasicMaterial({ map: band, side: TT.BackSide, transparent: true, depthWrite: false, toneMapped: false }));
    bm.position.y = (BY0 + BY1) / 2; bm.renderOrder = -2; g.add(bm);
    { const geo = new TT.SphereGeometry(PR * 1.6, 24, 12), P = geo.attributes.position, col = [], cc = new TT.Color(), a = new TT.Color(), b = new TT.Color();
      const sandLow = { morning: '#e8d2b0', day: '#f0dcb8', evening: '#d8b096', night: '#3a3a48' }[T];
      for (let i = 0; i < P.count; i++) { const y = P.getY(i) / 1.6; if (y < HZ) { cc.set(y < -60 ? sandLow : D.sea[1]); } else { const [p, q, t] = skyAt(y); a.set(p); b.set(q); cc.copy(a).lerp(b, t); } cc.convertSRGBToLinear(); col.push(cc.r, cc.g, cc.b); }
      geo.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); const dm = new TT.Mesh(geo, new TT.MeshBasicMaterial({ vertexColors: true, side: TT.BackSide, depthWrite: false, toneMapped: false })); dm.renderOrder = -3; g.add(dm); }
    // the house wall on the left: warm stucco, a French window with shutters, bougainvillea; below the balustrade, the garden falling to the sea
    const house = ptex(o, 'tbl4-house-' + T, -ZF, FL - 1, -ZB + 1, 70, 1024, (c, ppu) => {
      c.fillStyle = '#e9d6b8'; c.fillRect(-ZF, FL - 1, ZF - ZB + 1, 71 - FL);
      const R = rng(31); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${R() > .5 ? '255,245,220' : '150,110,70'},${.04 + R() * .05})`; ell(c, -ZF + R() * (ZF - ZB), FL + R() * (70 - FL), 1 + R() * 5, 1 + R() * 4); }
      c.fillStyle = '#d8c2a0'; c.fillRect(-ZF, FL, ZF - ZB, 2);
      const fx = 16; c.fillStyle = '#3a4a4a'; c.fillRect(fx, FL + 2, 12, 30); c.fillStyle = 'rgba(255,240,210,.25)'; c.fillRect(fx + 1, FL + 3, 4.6, 27); c.fillRect(fx + 6.4, FL + 3, 4.6, 27);
      c.fillStyle = '#efe6d8'; [fx - .8, fx + 5.6, fx + 11.4].forEach(x => c.fillRect(x, FL + 2, .9, 30.6)); c.fillRect(fx - .8, FL + 31.8, 13.6, 1);
      ['#5f7f6a', '#5f7f6a'].forEach((col, i) => { const x = i ? fx + 12.6 : fx - 7; c.fillStyle = col; c.fillRect(x, FL + 2, 6.4, 30.4); c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = FL + 3; y < FL + 32; y += 1.2) c.fillRect(x + .5, y, 5.4, .45); });
      c.fillStyle = '#2a2420'; c.fillRect(36, 26, .5, 3); c.fillStyle = T === 'night' || T === 'evening' ? 'rgba(255,214,150,1)' : '#e8dcc0'; c.fillRect(35, 22.6, 2.4, 3.4); c.strokeStyle = '#2a2420'; c.lineWidth = .3; c.strokeRect(35, 22.6, 2.4, 3.4);   // a wall lantern
      if (T === 'night' || T === 'evening') { c.fillStyle = rad(c, 36.2, 24, 14, [[0, 'rgba(255,200,130,.35)'], [1, 'rgba(255,200,130,0)']]); c.fillRect(22, 10, 28, 28); }
      blur(c, .3 * ppu); for (let i = 0; i < 520; i++) { const t = R(), x = fx - 12 + t * 34 + (R() - .5) * 8, y = FL + 30 + Math.sin(t * 3) * 6 + R() * 14; c.fillStyle = R() > .3 ? `rgba(${200 + R() * 40 | 0},${40 + R() * 40 | 0},${120 + R() * 40 | 0},.95)` : `rgba(${60 + R() * 20 | 0},${100 + R() * 20 | 0},50,.95)`; ell(c, x, y, .4 + R() * .5, .35 + R() * .4); } blur(c, 0);
      c.globalCompositeOperation = 'multiply'; c.fillStyle = T === 'night' ? '#4a5470' : T === 'evening' ? '#f0c8b0' : T === 'morning' ? '#fff0e0' : '#ffffff'; c.fillRect(-ZF, FL - 1, ZF - ZB + 1, 71 - FL); c.globalCompositeOperation = 'source-over';
    });
    { const m = flat(TT, house, ZF - ZB + 1, 71 - FL); m.rotation.y = Math.PI / 2; m.position.set(XL, (FL - 1 + 70) / 2, (ZB - 1 + ZF) / 2); g.add(m); }
    { const cl = ptex(o, 'tbl4-below-' + T, -180, -120, 260, FL, 512, (c) => { c.fillStyle = T === 'night' ? '#0a0f14' : '#4a5a3a'; c.fillRect(-180, -120, 440, 120 + FL); const R = rng(41); for (let i = 0; i < 160; i++) { c.fillStyle = T === 'night' ? `rgba(20,30,30,${.5 + R() * .4})` : `rgba(${50 + R() * 40 | 0},${80 + R() * 40 | 0},${40 + R() * 20 | 0},.8)`; ell(c, -180 + R() * 440, -120 + R() * (104 + FL + 16), 3 + R() * 8, 2 + R() * 5); } });
      const m = flat(TT, cl, 440, 120 + FL); m.position.set(40, (-120 + FL) / 2, ZB - 2.4); g.add(m);
      const m2 = flat(TT, cl, 440, 120 + FL); m2.rotation.y = -Math.PI / 2; m2.position.set(XR + 2.4, (-120 + FL) / 2, 40); g.add(m2); }
    // the table of the hour
    const china = M({ color: 0xf6f3ec, roughness: .3, clearcoat: .5 }), blue = M({ color: 0x2e5f9a, roughness: .3, clearcoat: .5 });
    const bread = M({ map: canvasTex('crust', 128, 128, (c, W) => { const g2 = c.createLinearGradient(0, 0, 0, W); g2.addColorStop(0, '#c98a3e'); g2.addColorStop(.5, '#e0a95a'); g2.addColorStop(1, '#a8682a'); c.fillStyle = g2; c.fillRect(0, 0, W, W); c.fillStyle = 'rgba(110,60,20,.35)'; for (let i = 0; i < W; i += 9) c.fillRect(0, i, W, 3); }), roughness: .6, clearcoat: .25 });
    // a bud vase of lavender: every stem starts inside the neck (2026-11-07: they stood beside it), a spike of flowers at its tip
    const lavVase = (x, z) => { at(g, lathe(TT, [[0, 0], [.55, 0], [.75, .5], [.7, 1.4], [.3, 2.4], [.28, 3], [.36, 3.15], [.3, 3.15], [.22, 3], [.22, 2.4], [0, 2.3]], SEG(o, 20), blue), x, 0, z);
      bouquet(o, g, x, z, 3.15, .24, 9, 2.4, .9, 0x7e9468, (Gh) => { at(Gh, new TT.Mesh(lavG, lav), 0, .7, 0, 0, false); }, 7); };
    const fruit = (G, x, y, z, r, col) => { const m = new TT.Mesh(new TT.SphereGeometry(r, SEG(o, 14), SEG(o, 10)), M({ color: col, roughness: .4, clearcoat: .3 })); m.scale.set(1.05, .95, 1); return at(G, m, x, y, z); };
    if (T === 'morning') {
      cupSaucer(o, g, -10.2, -3.4, .6, blue, 'cap'); cupSaucer(o, g, 11, 4.4, -2.4, blue, 'cap');   // cappuccino
      plate(o, g, 10.8, -6.3, 2.4, china); croissant(o, g, 10.5, .2, -6.8, .4, bread); croissant(o, g, 11.5, .2, -5.6, 2.4, bread);
      tumbler(o, g, 12.9, -2.6, [0xf2a12a, .78], 2.9, .78); tumbler(o, g, -8.8, -7.6, [0xf2a12a, .7], 2.9, .78);   // (one juice by the croissants)
      lavVase(5.8, -8.2);
    } else if (T === 'day') {
      { const Gj = grp(TT, g, -11, 0, -6.3); at(Gj, lathe(TT, [[0, 0], [1.4, 0], [1.5, .1], [1.6, 4.8], [1.9, 5.4], [1.5, 5.4], [1.45, 4.8], [1.35, .3], [0, .3]], SEG(o, 24), glassM()), 0, 0, 0, 0, false); at(Gj, new TT.Mesh(new TT.CylinderGeometry(1.4, 1.32, 3.8, SEG(o, 24)), M({ color: 0xf6e9a0, roughness: .05, clearcoat: 1, transparent: true, opacity: .6 })), 0, 2.2, 0, 0, false); ice(o, Gj, 0, 2.6, 0, 4);
        const h = new TT.Mesh(new TT.TorusGeometry(1.1, .14, 6, 12, Math.PI), glassM()); h.rotation.z = -Math.PI / 2; at(Gj, h, 1.6, 3, 0, 0, false); }
      [[-10.6, 1.6], [10.6, 3.8]].forEach(([x, z]) => { const Gt = tumbler(o, g, x, z, [0xf6e9a0, .72], 3.2, .8); ice(o, Gt, 0, 1.5, 0, 3); const sl = new TT.Mesh(new TT.CylinderGeometry(.6, .6, .1, 14, 1, false, 0, Math.PI), M({ color: 0xf2d24a, roughness: .5 })); sl.rotation.set(Math.PI / 2, 0, .2); at(Gt, sl, .7, 3.1, 0, 0, false); });
      { const Gb = grp(TT, g, 10.7, 0, -6); Gb.scale.setScalar(.84); at(Gb, lathe(TT, [[0, 0], [1.6, 0], [2.8, 1], [3.1, 1.8], [2.9, 1.85], [2.4, 1], [0, .45]], SEG(o, 28), blue), 0, 0, 0);
        [[0, 0, 0xf2cf3a], [1.2, .6, 0xf2cf3a], [-1.1, .7, 0xf28c28], [.3, -1.2, 0xf2cf3a], [-.6, -.9, 0xf28c28], [1, -.6, 0xe24a2a]].forEach(([x, z, col], i) => fruit(Gb, x, 1.4 + (i > 3 ? .5 : 0), z, .78, col)); }
      lavVase(5.8, -8.2);
    } else if (T === 'evening') {
      [[-10.6, 1.2], [10.2, 3.4]].forEach(([x, z]) => { const Gw = wineGlass(o, g, x, z, 0xf2641e); ice(o, Gw, 0, 3, 0, 2); const sl = new TT.Mesh(new TT.CylinderGeometry(.62, .62, .1, 14), M({ color: 0xf28a28, roughness: .5 })); sl.rotation.set(Math.PI / 2, 0, 0); at(Gw, sl, .4, 3.7, 0, 0, false); });
      { const Gb = grp(TT, g, 10.8, 0, -6.2); at(Gb, lathe(TT, [[0, 0], [1, 0], [1.6, .9], [1.7, 1.2], [1.5, 1.2], [.9, .4], [0, .35]], SEG(o, 22), blue), 0, 0, 0); const ol = M({ color: 0x5a6a28, roughness: .3, clearcoat: .6 }); for (let i = 0; i < 10; i++) { const a = i * 2.3, r = .3 + (i % 3) * .3; const m = new TT.Mesh(new TT.SphereGeometry(.32, 8, 6), ol); m.scale.set(1, .8, 1.3); at(Gb, m, Math.cos(a) * r, .9 + (i > 6 ? .3 : 0), Math.sin(a) * r); } }
      { const Gg = tumbler(o, g, -11, -6.3, null, 3.6, .8); for (let i = 0; i < 6; i++) { const s = new TT.Mesh(new TT.CylinderGeometry(.09, .09, 6.4, 5), bread); s.rotation.set(Math.sin(i * 2) * .18, 0, Math.cos(i * 2) * .18); at(Gg, s, Math.sin(i * 2) * .3, 3.4, Math.cos(i * 2) * .3); } }
      bottle(o, g, 5.9, -8.2, 0x2a3a1e, '#f2ead6');
    } else {
      { const Gp = grp(TT, g, 10.8, 0, -5.6, .4); Gp.scale.setScalar(.88); at(Gp, new TT.Mesh(new TT.CylinderGeometry(3.3, 3.3, .35, SEG(o, 32)), M({ map: wood('tbl4-peel', '#c9a070', '#8a5e34', 256, 256, .7), roughness: .55 })), 0, .18, 0); at(Gp, new TT.Mesh(RB(1, .3, 4, .1, 1), M({ color: 0xb08a5a, roughness: .6 })), 0, .18, 4.6);
        pizza(o, Gp, 2.9); }
      bottle(o, g, -11, -6.5, 0x1e2a18, '#efe6d2'); wineGlass(o, g, -9.7, -2.2, 0x5a0d1c); wineGlass(o, g, 9.9, 3.9, 0x5a0d1c);   // red wine (2026-11-07: was white)
      antipasti(o, g, -10.8, 6.6, .22, .78);   // an antipasto board to go with it
      { const Gl = grp(TT, g, -6, 0, -8.2); at(Gl, new TT.Mesh(RB(2, .3, 2, .08, 1), iron), 0, .15, 0); at(Gl, new TT.Mesh(RB(1.8, 3.8, 1.8, .05, 1), glassM()), 0, 2.2, 0, 0, false); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => at(Gl, new TT.Mesh(new TT.CylinderGeometry(.07, .07, 3.9, 4), iron), a * .9, 2.2, b * .9, 0, false)); at(Gl, new TT.Mesh(new TT.ConeGeometry(1.4, 1, 4), iron), 0, 4.6, 0, Math.PI / 4); candle(o, Gl, 0, 0, true, true).scale.setScalar(.55); }
      candle(o, g, 5.8, -8.2, true, false);
    }
    // lights of the hour
    scene.add(new TT.HemisphereLight(D.hemi[0], D.hemi[1], D.hemi[2]));
    const key = dirLight(TT, D.key[0], D.key[1], D.key[2], 17); scene.add(key);
    const fill = new TT.DirectionalLight(T === 'night' ? 0xffc890 : 0xffe4dc, T === 'night' ? .2 : .32); fill.position.set(5, 12, 16); scene.add(fill);
    try { X.mergeStatic(g); } catch (e) {}
    const env = { top: D.sky[1], bottom: T === 'night' ? '#141010' : '#f0d8c0', panels: [[-12, 3, -20, 10, 4, T === 'night' ? '#c8d0f0' : '#ffe8c8', T === 'night' ? .6 : 3], [0, 16, -8, 26, 8, D.sky[1], .8], [0, 6, 18, 20, 5, '#ffe2d4', .55]] };
    return { bg: D.sky[1], exp: D.exp, board: D.board, boardCol: T === 'night' ? 0xffe6cc : 0xfff0e6, key, env };
  };
  TABLES[4].plain = { sun: 0xffd8b0, sunI: .74, hemi: [0xfbeee8, 0xffdcc4, .5], exp: .64 };
  TABLES[4].floor = (o) => ({ img: marbleTex(o).image, w: 46, h: 36, over: 'linear-gradient(160deg, rgba(255,196,156,.26), transparent 46%), linear-gradient(0deg, rgba(120,100,170,.10), transparent 40%), linear-gradient(rgba(255,252,248,.34), rgba(255,252,248,.34))' });

  /* ---------- 5 · 夜の書斎: a matte-black desk with a leather mat, a banker's lamp, built-in walnut bookshelves, a mesh office chair ---------- */
  TABLES[5] = (o) => {
    const { TT, g, scene } = o, FL = -16, MAT = .16, Z0 = 1, T = TOD(o), day = T === 'morning' || T === 'day';
    // the desk: matte black (a fine grain so it reads as a surface, not a hole), a modesty panel and two slab legs
    const blackT = canvasTex('tbl5-black', sz(o, 512), sz(o, 512), (c, W) => { const img = c.createImageData(W, W), d = img.data, N = makeNoise(5); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const k = (Math.random() - .5) * 6 + (N(x / 60, y / 8, 2) - .5) * 5, i = (y * W + x) * 4; d[i] = 26 + k; d[i + 1] = 26 + k; d[i + 2] = 27 + k; d[i + 3] = 255; } c.putImageData(img, 0, 0); });
    const black = M({ map: blackT, roughness: .82, metalness: 0, bumpScale: .0015, sheen: new TT.Color(0x30302e) });
    at(g, new TT.Mesh(RB(38, 1.3, 23, .3, 3), black), 0, -MAT - .65, Z0, 0, false).receiveShadow = true;
    const brassEdge = M({ color: 0xb8924a, metalness: 1, roughness: .35 });
    [[-1], [1]].forEach(([s]) => { at(g, new TT.Mesh(RB(1.6, FL * -1 - 1.5, 20, .2, 1), black), s * 17.4, (FL - MAT - 1.3) / 2, Z0); at(g, new TT.Mesh(RB(1.7, .25, 20.1, .05, 1), brassEdge), s * 17.4, FL + .12, Z0, 0, false); });
    at(g, new TT.Mesh(RB(33, 7, .8, .1, 1), black), 0, -MAT - 4.8, Z0 - 9.6);
    at(g, new TT.Mesh(RB(38.2, .12, .14, .03, 1), brassEdge), 0, -MAT - .7, Z0 + 11.52, 0, false);   // a thin brass inlay on the front edge
    // the desk mat: dark green leather, a tooled gold line and a stitched edge
    const LW = 24, LD = 16, LT = sz(o, 1024), LH = Math.round(LT * LD / LW);
    const lt = canvasTex('tbl5-leather', LT, LH, (c, W, H) => {
      const N = makeNoise(17), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = N(x / 2.2, y / 2.2, 2), k = (p - .5) * 22 + (N(x / 70, y / 70, 3) - .5) * 14, i = (y * W + x) * 4; d[i] = 30 + k * .5; d[i + 1] = 52 + k * .8; d[i + 2] = 40 + k * .6; d[i + 3] = 255; }
      c.putImageData(img, 0, 0);
      const u = W / LW;
      c.strokeStyle = 'rgba(214,176,96,.85)'; c.lineWidth = Math.max(1, u * .07); c.strokeRect(u * 1.1, u * 1.1, W - u * 2.2, H - u * 2.2);
      c.strokeStyle = 'rgba(214,176,96,.5)'; c.lineWidth = Math.max(1, u * .035); c.strokeRect(u * 1.35, u * 1.35, W - u * 2.7, H - u * 2.7);
      c.strokeStyle = 'rgba(190,180,150,.55)'; c.lineWidth = Math.max(1, u * .05); c.setLineDash([u * .22, u * .16]); c.strokeRect(u * .4, u * .4, W - u * .8, H - u * .8);
    });
    const matE = M({ color: 0x1c2a20, roughness: .6 });
    at(g, new TT.Mesh(RB(LW, MAT, LD, .07, 2), [matE, matE, M({ map: lt, roughness: .62, clearcoat: .15, clearcoatRoughness: .6, bumpScale: .004 }), matE, matE, matE]), 0, -MAT / 2, 0, 0, false).receiveShadow = true;
    // the desk lamp (back left, 2026-11-07: was a banker's lamp): a Bauhaus-style lamp — a round chrome base with a black glass top,
    // a knuckle joint, a chrome arm arching up and over, a glossy black dome shade, white inside, a cut-glass bulb glowing in it
    const brass = M({ color: 0xc8a050, metalness: 1, roughness: .28 }), LX = -14.2, LZ = -7.6;
    const chrome = M({ color: 0xe8eaee, metalness: 1, roughness: .12 }), lacq = M({ color: 0x0a0a0c, roughness: .1, clearcoat: 1, clearcoatRoughness: .04 });
    const lampG = grp(TT, g, LX, -MAT, LZ, -.5);   // local +x: towards the board
    at(lampG, lathe(TT, [[0, 0], [2.3, 0], [2.42, .1], [2.45, .62], [2.36, .74], [2.1, .76], [0, .76]], SEG(o, 36), chrome), 0, 0, 0);
    { const tp = new TT.Mesh(new TT.CylinderGeometry(2.08, 2.08, .05, SEG(o, 36)), lacq); at(lampG, tp, 0, .77, 0); }
    at(lampG, new TT.Mesh(new TT.CylinderGeometry(.08, .08, .3, 8), chrome), .9, .9, .9, 0, false);   // the switch
    const knuckle = new TT.Vector3(-.5, 1.55, 0);
    at(lampG, new TT.Mesh(new TT.CylinderGeometry(.22, .3, .8, 12), chrome), -.5, 1.05, 0);
    { const kn = new TT.Mesh(new TT.SphereGeometry(.42, 14, 10), chrome); at(lampG, kn, knuckle.x, knuckle.y, 0); const ax = new TT.Mesh(new TT.CylinderGeometry(.2, .2, 1.1, 12), chrome); ax.rotation.x = Math.PI / 2; at(lampG, ax, knuckle.x, knuckle.y, 0, 0, false);
      [-1, 1].forEach(s => at(lampG, new TT.Mesh(new TT.CylinderGeometry(.3, .3, .12, 14), chrome), knuckle.x, knuckle.y, s * .6, 0, false).rotation.x = Math.PI / 2); }
    const SH = new TT.Vector3(2.6, 7.4, 0);   // the shade's top (its pivot)
    { const curve = new TT.CatmullRomCurve3([knuckle.clone(), new TT.Vector3(-1.3, 3.6, 0), new TT.Vector3(-1.5, 6, 0), new TT.Vector3(-.6, 8.1, 0), new TT.Vector3(1, 8.6, 0), new TT.Vector3(SH.x - .3, SH.y + .7, 0)]);
      at(lampG, new TT.Mesh(new TT.TubeGeometry(curve, 40, .15, 10, false), chrome), 0, 0, 0); }
    const Gs = new TT.Group(); Gs.position.copy(SH); Gs.rotation.z = .62; lampG.add(Gs);   // the dome turned down towards the board
    at(Gs, new TT.Mesh(new TT.SphereGeometry(.34, 12, 8), chrome), -.1, .55, 0, 0, false);
    at(Gs, new TT.Mesh(new TT.CylinderGeometry(.5, .62, .9, 16), lacq), 0, .1, 0, 0, false);   // the socket housing
    const dome = [[.6, -.3], [1.2, -.48], [1.9, -.9], [2.35, -1.5], [2.55, -2.1], [2.6, -2.35]];
    at(Gs, lathe(TT, [[0, -.25], ...dome], SEG(o, 40), M({ color: 0x0a0a0c, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, side: TT.BackSide })), 0, 0, 0, 0, false);   // (a lathe's faces look inward: the glossy black is its back side)
    at(Gs, lathe(TT, [[0, -.32], ...dome.map(([r, y]) => [r - .06, y - .02])], SEG(o, 40), new TT.MeshStandardMaterial({ color: 0xfff6ea, roughness: .55, side: TT.FrontSide, emissive: new TT.Color(0xffe2b8), emissiveIntensity: day ? .35 : .8 })), 0, 0, 0, 0, false);
    at(Gs, new TT.Mesh(new TT.TorusGeometry(2.58, .05, 6, SEG(o, 40)), lacq), 0, -2.35, 0, 0, false).rotation.x = Math.PI / 2;
    { const bt = canvasTex('cutglass-bulb', 64, 64, (c, W) => { c.fillStyle = '#fff2d6'; c.fillRect(0, 0, W, W); c.strokeStyle = 'rgba(200,150,80,.55)'; c.lineWidth = 2; for (let i = -W; i < W * 2; i += 8) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + W, W); c.stroke(); c.beginPath(); c.moveTo(i, W); c.lineTo(i + W, 0); c.stroke(); } });
      const bulb = new TT.Mesh(new TT.SphereGeometry(.85, 16, 12), new TT.MeshBasicMaterial({ map: bt, color: 0xffe4b0, toneMapped: false })); at(Gs, bulb, 0, -1.3, 0, 0, false); }
    lampG.updateMatrixWorld(true);
    const bulbW = Gs.localToWorld(new TT.Vector3(0, -1.3, 0));
    // books: a real stack (covers, page block, rounded spine with gilt), an open book with reading glasses
    book(o, g, 15.4, -MAT, -6.6, .06, 6.8, 5, 1.2, '#5a1e1c'); book(o, g, 15.5, -MAT + 1.2, -6.6, -.1, 6.2, 4.6, 1, '#1f3a2c'); book(o, g, 15.2, -MAT + 2.2, -6.7, .14, 6.6, 4.8, 1.1, '#2a2a3c'); book(o, g, 15.4, -MAT + 3.3, -6.6, -.04, 5.6, 4.2, .8, '#6b4a24', false);   // (moved right: the inkwell stood in the stack)
    { const Go = grp(TT, g, 13.8, -MAT, 3.4, -.25), cov = M({ map: X.cloth('bookcloth-#4a1a16', '#4a1a16', 22, 256), roughness: .55 });
      at(Go, new TT.Mesh(RB(9.4, .18, 6.4, .06, 1), cov), 0, .09, 0);
      const txt = canvasTex('tbl5-text', 256, 352, (c, W, H) => { c.fillStyle = '#f2ead6'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(40,30,20,.55)'; for (let y = 34; y < H - 26; y += 10) { let x = 24; while (x < W - 24) { const w = 6 + Math.random() * 26; if (x + w > W - 24) break; c.fillRect(x, y, w, 3); x += w + 5; } } c.fillStyle = 'rgba(40,30,20,.7)'; c.fillRect(W / 2 - 30, 14, 60, 5); });
      const pgM = M({ map: txt, roughness: .85, bump: false, side: TT.DoubleSide });
      [-1, 1].forEach(s => { const geo = new TT.PlaneGeometry(4.4, 6, 12, 1), P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), t = (x + 2.2) / 4.4, tt = s < 0 ? 1 - t : t; P.setZ(i, .62 * Math.sin(Math.min(1, tt * 1.8 + .05) * Math.PI / 2) * (1 - .22 * tt) - .5 * Math.max(0, tt - .9)); } geo.computeVertexNormals();
        const m = new TT.Mesh(geo, pgM); m.rotation.x = -Math.PI / 2; at(Go, m, s * 2.3, .22, 0); at(Go, new TT.Mesh(RB(4.3, .3, 5.9, .05, 1), M({ map: pageTex(), roughness: .85, bump: false })), s * 2.3, .3, 0, 0, false); });
      const gm = M({ color: 0xc8a050, metalness: 1, roughness: .25 }), lens = new TT.TorusGeometry(.7, .06, 6, 20); [-1, 1].forEach(s => { const l = new TT.Mesh(lens, gm); l.rotation.x = -Math.PI / 2 + .25; at(Go, l, s * .85 + 1.6, 1.15, .6, 0, false); const tp = new TT.Mesh(new TT.CylinderGeometry(.04, .04, 3.2, 4), gm); tp.rotation.x = Math.PI / 2 - .15; at(Go, tp, s * 1.5 + 1.6, 1.1, -1, 0, false); }); at(Go, new TT.Mesh(new TT.TorusGeometry(.24, .05, 4, 8, Math.PI), gm), 1.6, 1.3, .6, 0, false); }
    // a fountain pen (black resin, gold clip and bands) by an inkwell (cut glass, brass cap)
    { at(g, new TT.Mesh(RB(8.4, .3, 1.9, .3, 2), M({ map: X.cloth('tbl5-tray', '#2a1810', 10, 128), roughness: .55, clearcoat: .3 })), 3.6, -MAT + .15, -9.4, -.04);
      const Gp = grp(TT, g, 3.9, -MAT + .3, -9.4, -.04), res = M({ color: 0x0c0c0e, roughness: .12, clearcoat: 1, clearcoatRoughness: .04 }), gold = M({ color: 0xd8b060, metalness: 1, roughness: .22 });
      const body = new TT.Mesh(new TT.CylinderGeometry(.24, .2, 3.4, SEG(o, 16)), res); body.rotation.z = Math.PI / 2; at(Gp, body, -.6, .24, 0);
      const capm = new TT.Mesh(new TT.CylinderGeometry(.28, .26, 2.8, SEG(o, 16)), res); capm.rotation.z = Math.PI / 2; at(Gp, capm, 2.4, .28, 0);
      [[.95, .06], [1.1, .05], [3.75, .05]].forEach(([x, w]) => { const b = new TT.Mesh(new TT.CylinderGeometry(.29, .29, w * 2, SEG(o, 16)), gold); b.rotation.z = Math.PI / 2; at(Gp, b, x, .28, 0, 0, false); });
      const tipC = new TT.Mesh(new TT.SphereGeometry(.28, 12, 8), res); tipC.scale.set(.6, 1, 1); at(Gp, tipC, 3.8, .28, 0, 0, false);
      const clip = new TT.Mesh(RB(2.1, .08, .16, .03, 1), gold); at(Gp, clip, 2.6, .58, 0, 0, false); at(Gp, new TT.Mesh(new TT.SphereGeometry(.12, 8, 6), gold), 1.6, .56, 0, 0, false);
      const sec = new TT.Mesh(new TT.CylinderGeometry(.19, .15, .7, SEG(o, 16)), res); sec.rotation.z = Math.PI / 2; at(Gp, sec, -2.6, .2, 0, 0, false);
      const nib = new TT.Mesh(new TT.ConeGeometry(.16, 1.2, 12, 1, false, 0, Math.PI), gold); nib.rotation.set(0, 0, Math.PI / 2); nib.scale.set(1, 1, .45); at(Gp, nib, -3.5, .2, 0, 0, false); }
    { const Gi = grp(TT, g, 9.6, -MAT, -9.7, .5); at(Gi, new TT.Mesh(RB(2, 1.5, 2, .25, 2), M({ color: 0xcfd8e0, roughness: .03, clearcoat: 1, transparent: true, opacity: .5, depthWrite: false })), 0, .75, 0, 0, false); at(Gi, new TT.Mesh(RB(1.6, .9, 1.6, .2, 2), M({ color: 0x0e1a3a, roughness: .1 })), 0, .5, 0, 0, false); at(Gi, lathe(TT, [[0, 0], [.55, 0], [.58, .3], [.4, .45], [.12, .6], [.18, .75], [0, .8]], SEG(o, 18), brass), 0, 1.5, 0); }
    // a crystal decanter and a tumbler of whisky on a silver tray (left), a brass carriage clock (back)
    { const Gt = grp(TT, g, -15.2, .01, -.6, .2), silver = M({ color: 0xd8dadc, metalness: 1, roughness: .2 });
      for (let k = 0; k < 4; k++) { const f = new TT.Mesh(new TT.CylinderGeometry(.16, .12, .18, 10), silver); at(Gt, f, Math.cos(k * 1.57 + .78) * 3.1, -.08, Math.sin(k * 1.57 + .78) * 3.1, 0, false); }   // little feet: the tray stands just above the desk mat (it sat in it, and the mat showed through its floor)
      at(Gt, lathe(TT, [[0, 0], [3.4, 0], [3.6, .1], [3.7, .35], [3.5, .38], [3.3, .14], [0, .14]], SEG(o, 32), silver), 0, 0, 0);
      const crys = M({ color: 0xe8f0f4, roughness: .02, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .42, depthWrite: false, envMapIntensity: 1.6 });
      at(Gt, lathe(TT, [[0, .14], [1.3, .14], [1.5, .4], [1.55, 2.6], [1.1, 3.6], [.4, 4.4], [.42, 5.2], [.5, 5.3], [0, 5.3]], SEG(o, 10), crys), -1, 0, -.6, 0, false);
      at(Gt, lathe(TT, [[0, .22], [1.2, .22], [1.36, .42], [1.4, 1.9], [1.2, 2.25], [0, 2.25]], SEG(o, 10), M({ color: 0xb8641a, roughness: .04, clearcoat: 1, transparent: true, opacity: .4, depthWrite: false })), -1, 0, -.6, 0, false);
      const st = new TT.Mesh(new TT.OctahedronGeometry(.62, 0), crys); st.scale.set(1, 1.2, 1); at(Gt, st, -1, 5.9, -.6, 0, false);
      snifter(o, Gt, 1.6, 1, 0xa8561a, .8).position.y = .14; }   // a brandy snifter, the spirit see-through (2026-11-07: was a whisky tumbler)
    // a mantel clock (2026-11-07: was a brass carriage clock): a round black-faced clock with gold Roman numerals hung in a polished
    // gold frame (two columns with ball finials, a top bar), on a black marble plinth veined with gold
    { const Gc = grp(TT, g, -4.6, -MAT, -10.2, .12); Gc.scale.setScalar(.82); const gold = M({ color: 0xe0b45a, metalness: 1, roughness: .16 });
      const mbT = canvasTex('tbl5-blackmarble', 256, 128, (c, W, H) => { c.fillStyle = '#121112'; c.fillRect(0, 0, W, H); const R = rng(71);
        for (let k = 0; k < 9; k++) { c.strokeStyle = R() > .4 ? `rgba(214,170,90,${.35 + R() * .45})` : `rgba(240,236,228,${.15 + R() * .2})`; c.lineWidth = .6 + R() * 1.4; c.beginPath(); let x = R() * W, y = R() * H; c.moveTo(x, y); for (let n = 0; n < 7; n++) { x += (R() - .3) * 40; y += (R() - .5) * 30; c.lineTo(x, y); } c.stroke(); } });
      at(Gc, new TT.Mesh(RB(6.2, 1.1, 2.4, .08, 2), M({ map: mbT, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, bump: false })), 0, .55, 0);
      const PX = 2.35, PH = 5.6, y0 = 1.1;
      [-PX, PX].forEach(x => { at(Gc, lathe(TT, [[0, 0], [.42, 0], [.42, .16], [.3, .26], [.22, .4], [.2, PH - .5], [.28, PH - .38], [.24, PH - .26], [0, PH - .26]], SEG(o, 16), gold), x, y0, 0);
        at(Gc, new TT.Mesh(new TT.SphereGeometry(.36, 16, 12), gold), x, y0 + PH + .08, 0); });
      { const bar = new TT.Mesh(new TT.CylinderGeometry(.13, .13, 2 * PX, 12), gold); bar.rotation.z = Math.PI / 2; at(Gc, bar, 0, y0 + PH - .42, 0); [-1, 1].forEach(s2 => { const cl = new TT.Mesh(new TT.CylinderGeometry(.2, .2, .26, 12), gold); cl.rotation.z = Math.PI / 2; at(Gc, cl, s2 * (PX - .38), y0 + PH - .42, 0, 0, false); }); }
      const CY = y0 + 2.75, CR = 1.7;
      at(Gc, new TT.Mesh(new TT.CylinderGeometry(.09, .09, PH - .42 - 2.75 - CR + .1, 8), gold), 0, (y0 + PH - .42 + CY + CR) / 2, 0, 0, false);   // the hanger
      at(Gc, new TT.Mesh(RB(.34, .3, .34, .08, 1), gold), 0, CY + CR + .1, 0, 0, false);
      [-1, 1].forEach(s2 => { at(Gc, new TT.Mesh(new TT.SphereGeometry(.28, 12, 8), gold), s2 * (CR + .3), CY, 0); at(Gc, new TT.Mesh(new TT.CylinderGeometry(.07, .07, PX - CR - .3, 6), gold), s2 * (CR + .3 + (PX - CR - .3) / 2), CY, 0, 0, false).rotation.z = Math.PI / 2; });   // the pivots on the columns
      { const case_ = new TT.Mesh(new TT.CylinderGeometry(CR, CR, .7, SEG(o, 40)), gold); case_.rotation.x = Math.PI / 2; at(Gc, case_, 0, CY, 0);
        const bz = new TT.Mesh(new TT.TorusGeometry(CR - .06, .14, 10, SEG(o, 48)), gold); at(Gc, bz, 0, CY, .36, 0, false); }
      const face = canvasTex('tbl5-clock2', 256, 256, (c, W) => { const C = W / 2; c.fillStyle = rad(c, C, C, C, [[0, '#1a1a1c'], [1, '#0a0a0b']]); c.fillRect(0, 0, W, W);
        c.strokeStyle = 'rgba(214,176,96,.7)'; c.lineWidth = 1.2; c.beginPath(); c.arc(C, C, C * .62, 0, 7); c.stroke();
        c.fillStyle = '#d8b062'; for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, r0 = C * .86; c.save(); c.translate(C + Math.cos(a) * r0, C + Math.sin(a) * r0); c.rotate(a); c.fillRect(-1, -1, i % 5 ? 4 : 7, i % 5 ? 1.6 : 2.6); c.restore(); }
        const RN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
        c.font = `600 ${W * .1}px "Times New Roman", Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        RN.forEach((n, i) => { const a = i * Math.PI / 6 - Math.PI / 2, r0 = C * .72; c.fillText(n, C + Math.cos(a) * r0, C + Math.sin(a) * r0); });   // upright numerals
        const hand = (a, L, w) => { c.save(); c.translate(C, C); c.rotate(a); c.beginPath(); c.moveTo(-w, 0); c.lineTo(0, -L); c.lineTo(w, 0); c.lineTo(0, L * .14); c.closePath(); c.fill(); c.restore(); };
        c.fillStyle = '#e4bc6a'; hand(-Math.PI / 6 * 2.2, C * .46, W * .022); hand(Math.PI / 6 * 1.8, C * .7, W * .016); c.beginPath(); c.arc(C, C, W * .028, 0, 7); c.fill(); });
      const fc = new TT.Mesh(new TT.CircleGeometry(CR - .1, SEG(o, 40)), M({ map: face, roughness: .25, clearcoat: 1, clearcoatRoughness: .03, bump: false })); at(Gc, fc, 0, CY, .352, 0, false);
      at(Gc, new TT.Mesh(new TT.CircleGeometry(CR - .1, SEG(o, 40)), M({ color: 0x0c0c0e, roughness: .4 })), 0, CY, -.352, Math.PI, false); }
    // the room: chevron parquet and a Persian-style rug, dark green panelled walls, built-in walnut shelves behind the desk
    const XL = -64, XR = 64, ZB = -46, ZF = 150, Y1 = 46;
    const parq = canvasTex('tbl5-parquet', sz(o, 1024), sz(o, 1024), (c, W) => { const n = 8, cw = W / n, R = rng(14), step = cw * .42;
      for (let i = 0; i < n; i++) for (let y = -cw; y < W + cw; y += step) { const k = R(), s = i % 2 ? 1 : -1; c.fillStyle = `rgb(${92 + k * 34 | 0},${58 + k * 22 | 0},${32 + k * 14 | 0})`; c.beginPath(); c.moveTo(i * cw, y); c.lineTo((i + 1) * cw, y + s * cw); c.lineTo((i + 1) * cw, y + s * cw + step); c.lineTo(i * cw, y + step); c.fill(); c.strokeStyle = 'rgba(20,10,4,.6)'; c.lineWidth = 1.5; c.stroke(); }
      const img = c.getImageData(0, 0, W, W), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 10; d[p] += k; d[p + 1] += k; d[p + 2] += k; } c.putImageData(img, 0, 0); });
    const rugT = canvasTex('tbl5-rug', sz(o, 1024), sz(o, 768), (c, W, H) => { const u = W / 60;
      c.fillStyle = '#4e1a1a'; c.fillRect(0, 0, W, H); c.fillStyle = '#26303e'; c.fillRect(u * 3, u * 3, W - u * 6, H - u * 6); c.fillStyle = '#5c1e1c'; c.fillRect(u * 6, u * 6, W - u * 12, H - u * 12);
      c.strokeStyle = '#a88a52'; c.lineWidth = u * .3; [2, 3, 6].forEach(k => c.strokeRect(u * k, u * k, W - u * k * 2, H - u * k * 2));
      for (let x = u * 4.5; x < W - u * 3; x += u * 3) [u * 4.5, H - u * 4.5].forEach(y => { c.fillStyle = '#b8a07a'; c.beginPath(); c.moveTo(x, y - u); c.lineTo(x + u, y); c.lineTo(x, y + u); c.lineTo(x - u, y); c.fill(); c.fillStyle = '#5c1e1c'; c.beginPath(); c.arc(x, y, u * .35, 0, 7); c.fill(); });
      const cx = W / 2, cy = H / 2; [[15, '#26303e'], [12.4, '#8a7048'], [11.6, '#b8a684'], [8.6, '#4e1a1a'], [5.6, '#26303e'], [2.6, '#8a7048']].forEach(([r, col]) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = (i % 2 ? .78 : 1) * r * u; c.lineTo(cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr); } c.fill(); });
      const R = rng(6); for (let i = 0; i < 70; i++) { const x = u * 8 + R() * (W - u * 16), y = u * 8 + R() * (H - u * 16); if (Math.hypot((x - cx) / 1.3, y - cy) < u * 18) continue; c.fillStyle = ['#8a7048', '#a8987a', '#26303e', '#34483e'][R() * 4 | 0]; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = (k % 2 ? .45 : 1) * u * .8; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); }
      const img = c.getImageData(0, 0, W, H), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 22; d[p] += k; d[p + 1] += k * .8; d[p + 2] += k * .8; } c.putImageData(img, 0, 0); });
    at(g, new TT.Mesh(RB(58, .25, 44, .1, 1), M({ map: rugT, roughness: .95, bumpScale: .012 })), 0, FL + .12, Z0 + 3, 0, false);
    ao(o, 0, FL + .25, Z0, 42, 28, .45);
    const panel = (c, a0, a1, lit) => { c.fillStyle = '#16231c'; c.fillRect(a0, FL - 2, a1 - a0, Y1 - FL + 4); for (let x = a0 + 2; x < a1 - 8; x += 13) { c.strokeStyle = 'rgba(70,100,80,.5)'; c.lineWidth = .4; c.strokeRect(x, FL + 2, 11, 12); c.strokeRect(x, FL + 17, 11, 22); c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeRect(x + .4, FL + 2.4, 11, 12); c.strokeRect(x + .4, FL + 17.4, 11, 22); } c.fillStyle = '#0e1612'; c.fillRect(a0, FL, a1 - a0, 1.6); c.fillStyle = 'rgba(200,170,100,.35)'; c.fillRect(a0, FL + 15.2, a1 - a0, .3); c.fillStyle = '#0e1612'; c.fillRect(a0, Y1 - 2.2, a1 - a0, 2.2); };
    roomBox(o, { key: 'tbl5-room-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024,
      floor: M({ map: rep(TT, parq, 8, 12), roughness: .45, clearcoat: .3, clearcoatRoughness: .35, bumpScale: .002 }),
      back: (c, ppu) => { panel(c, XL - 2, XR + 2);
        c.fillStyle = rad(c, -20, 10, 70, [[0, 'rgba(255,190,110,.12)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(XL, FL, XR - XL, Y1 - FL); },
      left: (c, ppu) => { panel(c, -ZF - 2, -ZB + 2);   // a tall window (the hour shows here), velvet drapes on a brass rod
        paintWindow(c, ppu, T, 4, 26, FL + 4, Y1 - 6, '#2a1e14', [40, 18, 22], 9);
        c.fillStyle = '#b8924a'; c.fillRect(-4, Y1 - 3.6, 38, .5); },
      right: (c) => { panel(c, ZB - 2, ZF + 2);   // an oil painting under a picture light
        const px = -20; c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(px + .6, 12.4, 22, 16); c.fillStyle = '#9a7a3a'; c.fillRect(px, 13, 22, 16); c.fillStyle = '#2a2a22'; c.fillRect(px + 1.2, 14.2, 19.6, 13.6);
        c.fillStyle = lin(c, 27.8, 14.2, [[0, '#4a5a6a'], [.6, '#8a8060'], [1, '#3a3a28']]); c.fillRect(px + 1.2, 14.2, 19.6, 13.6); c.fillStyle = '#2f3a24'; c.beginPath(); c.moveTo(px + 1.2, 14.2); c.quadraticCurveTo(px + 8, 21, px + 20.8, 17); c.lineTo(px + 20.8, 14.2); c.fill(); c.fillStyle = 'rgba(255,230,180,.35)'; ell(c, px + 15, 24, 2, 1.4);
        c.fillStyle = '#b8924a'; c.fillRect(px + 6, 30.2, 10, .7); c.fillStyle = rad(c, px + 11, 22, 14, [[0, 'rgba(255,214,150,.35)'], [1, 'rgba(255,214,150,0)']]); c.fillRect(px - 4, 10, 30, 22); },
      ceil: (c) => { c.fillStyle = '#0c0a08'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, ZF - ZB + 4); c.fillStyle = rad(c, -14, -6, 20, [[0, 'rgba(255,190,110,.12)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(XL, ZB, XR - XL, ZF - ZB); },
    });
    // the built-in bookshelves: walnut carcass, a warm light under each shelf, books in instanced rows (baked light, crisp — not blurred)
    { const SX0 = -52, SX1 = 52, SZ = ZB + .2, DEP = 6.2, TOP = Y1 - 3, bays = 5, bw = (SX1 - SX0) / bays, lv = [FL + 3.4, FL + 12.4, FL + 21, FL + 29.6, FL + 38.2, FL + 46.8];
      const wd = new TT.MeshBasicMaterial({ map: wood('tbl5-shelf', '#6a4026', '#2a160b', 256, 256, 1.2), color: 0x9a8070 }), bk = new TT.MeshBasicMaterial({ color: 0x1a0f08 });
      at(g, new TT.Mesh(new TT.PlaneGeometry(SX1 - SX0, TOP - FL), bk), 0, (TOP + FL) / 2, SZ, 0, false);
      for (let i = 0; i <= bays; i++) at(g, new TT.Mesh(RB(1.3, TOP - FL, DEP, .1, 1), wd), SX0 + i * bw, (TOP + FL) / 2, SZ + DEP / 2, 0, false);
      at(g, new TT.Mesh(RB(SX1 - SX0 + 2, 2.2, DEP + .8, .2, 1), wd), 0, TOP + .6, SZ + DEP / 2 + .2, 0, false);
      lv.forEach(y => { if (y > TOP - 2) return; at(g, new TT.Mesh(RB(SX1 - SX0, .9, DEP, .1, 1), wd), 0, y, SZ + DEP / 2, 0, false);
        const led = new TT.Mesh(new TT.PlaneGeometry(SX1 - SX0 - 2, .12), new TT.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false })); led.rotation.x = Math.PI / 2; at(g, led, 0, y - .46, SZ + DEP - .6, 0, false); });
      const spineT = canvasTex('tbl5-spine', 32, 128, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.4, '#e6e6e6'); gr.addColorStop(1, '#a8a8a8'); c.fillStyle = gr; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, H * .1, W, 3); c.fillRect(0, H * .86, W, 3); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(W * .2, H * .36, W * .6, H * .16); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(0, 0, 3, H); c.fillRect(W - 3, 0, 3, H); });
      const books = [], gilts = [], R = rng(23), pal = [[92, 31, 26], [42, 60, 44], [109, 74, 40], [30, 42, 60], [122, 100, 64], [61, 42, 32], [138, 58, 36], [64, 70, 58], [140, 120, 96], [28, 28, 30]];
      for (let b = 0; b < bays; b++) for (let s = 0; s < lv.length - 1; s++) { const y0 = lv[s] + .45, gap = lv[s + 1] - .45 - y0; if (lv[s + 1] > TOP - 1) continue;
        let x = SX0 + b * bw + .9; const xe = SX0 + (b + 1) * bw - .9, deco = R() < .22 ? x + R() * (bw - 8) : null;
        while (x < xe) {
          if (deco !== null && x >= deco && x < deco + 5.5) { if (R() < .5) { let yy = y0; for (let k = 0; k < 4; k++) { const h = .7 + R() * .4, w = 5 + R() * .6; books.push([x + 2.8, yy + h / 2, w, h, 4.6, 0, 0]); yy += h; } } x = deco + 6; continue; }
          const w = .5 + R() * .7, h = Math.min(gap - .4, 5 + R() * 2.2), lean = R() < .05 && x + 2 < xe ? .2 : 0, d = 4.2 + R() * 1;
          books.push([x + w / 2 + lean * h / 2, y0 + h / 2, w, h, d, lean, R()]); if (R() < .32) gilts.push([x + w / 2, y0 + h * (.78 + R() * .06), w * .9, y0 + h * .2]);
          x += w + (R() < .06 ? .8 + R() * 1.2 : .02) + lean * h;
        } }
      const n = books.length, bm = new TT.InstancedMesh(new TT.BoxGeometry(1, 1, 1), [0, 0, 0, 0, 0, 0].map((_, i) => i === 4 ? new TT.MeshBasicMaterial({ map: spineT }) : new TT.MeshBasicMaterial({ color: i === 2 ? 0xd8ccb0 : 0x8a8070 })), n);
      const mm = new TT.Matrix4(), q = new TT.Quaternion(), e = new TT.Euler(), cc = new TT.Color(), sc = new TT.Vector3(), pp = new TT.Vector3();
      books.forEach(([x, y, w, h, d, lean, k], i) => { e.set(0, 0, -lean); q.setFromEuler(e); pp.set(x, y, SZ + d / 2 + .3); sc.set(w, h, d); mm.compose(pp, q, sc); bm.setMatrixAt(i, mm);
        const p = pal[(k * pal.length) | 0] || pal[i % pal.length], lift = .72 + .5 * Math.max(0, 1 - Math.abs(x + 18) / 70); cc.setRGB(p[0] / 255 * lift, p[1] / 255 * lift, p[2] / 255 * lift); cc.convertSRGBToLinear(); bm.setColorAt(i, cc); });
      bm.frustumCulled = false; g.add(bm);
      const gm = new TT.InstancedMesh(new TT.PlaneGeometry(1, .14), new TT.MeshBasicMaterial({ color: 0xc8a050 }), gilts.length * 2);
      gilts.forEach(([x, y, w, y2], i) => { [y, y2].forEach((yy, j) => { pp.set(x, yy, SZ + 5.5); sc.set(w, 1, 1); mm.compose(pp, q.set(0, 0, 0, 1), sc); gm.setMatrixAt(i * 2 + j, mm); }); });
      gm.frustumCulled = false; g.add(gm);
      // a few objects among the books: a brass globe, a bust-like vase, framed photographs
      at(g, new TT.Mesh(new TT.SphereGeometry(2.2, 16, 12), new TT.MeshBasicMaterial({ map: canvasTex('tbl5-globe', 128, 64, (c, W, H) => { c.fillStyle = '#c8b48a'; c.fillRect(0, 0, W, H); c.fillStyle = '#8a6a3a'; [[20, 18, 14, 10], [44, 36, 10, 14], [70, 20, 16, 12], [96, 30, 12, 9], [108, 46, 8, 5]].forEach(([x, y, a, b]) => { c.beginPath(); c.ellipse(x, y, a, b, .4, 0, 7); c.fill(); }); c.strokeStyle = 'rgba(60,40,20,.3)'; for (let i = 0; i < W; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, H); c.stroke(); } }), color: 0xb0a090 })), SX0 + 2 * bw + 5, lv[3] + 2.8, SZ + 3.2, 0, false);
      at(g, lathe(TT, [[0, 0], [1, 0], [1.4, 1.2], [1, 3], [.5, 4], [.7, 4.6], [0, 4.6]], 12, new TT.MeshBasicMaterial({ color: 0x3a3a38 })), SX0 + 4 * bw - 4, lv[1] + .45, SZ + 3, 0, false);
      [[SX0 + bw + 6, lv[2] + .45], [SX0 + 3 * bw + 10, lv[4] + .45]].forEach(([x, y]) => { at(g, new TT.Mesh(RB(3, 3.8, .3, .05, 1), new TT.MeshBasicMaterial({ color: 0x8a6a2a })), x, y + 1.9, SZ + 4, 0, false); at(g, new TT.Mesh(new TT.PlaneGeometry(2.3, 3), new TT.MeshBasicMaterial({ color: 0x6a645a })), x, y + 1.9, SZ + 4.16, 0, false); });
    }
    // a leather wingback by the window (left, far) and a floor-standing globe would crowd it — one chair is enough: the mesh office chair at the front left
    { const G = grp(TT, g, -22.5, FL, 13.2, -.62), frame = M({ color: 0x1a1a1c, roughness: .42, metalness: .3 }), alu = M({ color: 0x8a8c90, metalness: 1, roughness: .32 });
      const meshT = canvasTex('tbl5-mesh', 64, 64, (c, W) => { c.clearRect(0, 0, W, W); c.strokeStyle = 'rgba(14,14,16,.92)'; c.lineWidth = 2.2; for (let i = -W; i < W * 2; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + W, W); c.stroke(); c.beginPath(); c.moveTo(i, W); c.lineTo(i + W, 0); c.stroke(); } });
      meshT.wrapS = meshT.wrapT = TT.RepeatWrapping; meshT.repeat.set(5, 6);
      const meshM = new TT.MeshStandardMaterial({ map: meshT, transparent: true, side: TT.DoubleSide, roughness: .8, depthWrite: false }), seatM = new TT.MeshStandardMaterial({ color: 0x1c1c1e, roughness: .85, side: TT.DoubleSide });
      for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5, leg = new TT.Mesh(RB(6.4, .7, 1, .25, 1), alu); leg.rotation.set(0, -a, -.08); at(G, leg, Math.cos(a) * 3.2, 1.4, Math.sin(a) * 3.2); const cs = new TT.Mesh(new TT.CylinderGeometry(.55, .55, .5, 10), frame); cs.rotation.z = Math.PI / 2; cs.rotation.y = -a; at(G, cs, Math.cos(a) * 6.2, .55, Math.sin(a) * 6.2); }
      at(G, new TT.Mesh(new TT.CylinderGeometry(.75, .75, 1.6, 12), alu), 0, 2, 0); at(G, new TT.Mesh(new TT.CylinderGeometry(.5, .5, 6, 12), frame), 0, 5.6, 0);
      at(G, new TT.Mesh(RB(3.6, 1.2, 3.6, .3, 1), frame), 0, 8.8, 0);
      const outline = (w0, w1, h, r) => { const s = new TT.Shape(); s.moveTo(-w0 / 2 + r, 0); s.lineTo(w0 / 2 - r, 0); s.quadraticCurveTo(w0 / 2, 0, w0 / 2, r); s.lineTo(w1 / 2, h - r); s.quadraticCurveTo(w1 / 2, h, w1 / 2 - r, h); s.lineTo(-w1 / 2 + r, h); s.quadraticCurveTo(-w1 / 2, h, -w1 / 2, h - r); s.lineTo(-w0 / 2, r); s.quadraticCurveTo(-w0 / 2, 0, -w0 / 2 + r, 0); return s; };
      const bendG = (geo, k) => { const P = geo.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i); P.setZ(i, P.getZ(i) - k * x * x); } geo.computeVertexNormals(); return geo; };
      { const seat = outline(9.4, 9.8, 9, 2.4), Gs = grp(TT, G, 0, 10, 4.5); const fr = new TT.Mesh(new TT.ShapeGeometry(seat, 8), seatM); fr.rotation.x = -Math.PI / 2; at(Gs, fr, 0, .1, 0, 0, false);
        const rim = new TT.Mesh(new TT.TubeGeometry(new TT.CatmullRomCurve3(seat.getSpacedPoints(36).map(p => new TT.Vector3(p.x, 0, -p.y)), true), 48, .34, 6, true), frame); at(Gs, rim, 0, .1, 0); }
      { const back = outline(7.6, 9.6, 13, 2.6), Gb = grp(TT, G, 0, 12.2, 4.8); Gb.rotation.x = .2;
        at(Gb, new TT.Mesh(bendG(new TT.ShapeGeometry(back, 8), .02), meshM), 0, 0, 0, 0, false);
        const pts = back.getSpacedPoints(48).map(p => new TT.Vector3(p.x, p.y, -.02 * p.x * p.x)); at(Gb, new TT.Mesh(new TT.TubeGeometry(new TT.CatmullRomCurve3(pts, true), 64, .36, 6, true), frame), 0, 0, 0);
        at(G, new TT.Mesh(RB(1.6, 1.2, 6.2, .3, 1), frame), 0, 10.4, 2.2); }
      [-1, 1].forEach(s => { at(G, new TT.Mesh(RB(.8, 6, 1, .2, 1), frame), s * 5.4, 13, .6); at(G, new TT.Mesh(RB(1.5, .7, 6, .3, 1), frame), s * 5.4, 16.2, -.6); at(G, new TT.Mesh(RB(1.2, .6, 3, .2, 1), frame), s * 4.8, 10.4, .6); }); }
    ao(o, -22.5, FL, 13.2, 15, 15, .45);
    try { X.mergeStatic(g); } catch (e) {}
    // the lamp carries the mood (and the one shadow); the board also gets an even warm light from above: never a dark corner on the board
    scene.add(new TT.HemisphereLight(day ? 0xe4ecf8 : T === 'evening' ? 0xd8b0a0 : 0x8a90b8, 0x2a170c, day ? .48 : T === 'evening' ? .36 : .3));
    const key = new TT.SpotLight(0xffc78a, day ? 1.6 : 2.7, 80, 1.15, 1, .9); key.position.copy(bulbW); key.target.position.set(3, 0, 4); scene.add(key); scene.add(key.target);   // (2026-11-07: softer — the lamp no longer burns a bright spot into the board's middle)
    const over = new TT.DirectionalLight(0xffdcb0, .56); over.position.set(-4, 30, 10); scene.add(over);
    key.shadow.camera.near = 1; key.shadow.camera.far = 50; key.shadow.bias = -.0003;
    const pool = new TT.PointLight(0xffb060, .9, 16, 2); pool.position.copy(bulbW).y -= .8; scene.add(pool);
    const shelfL = new TT.PointLight(0xffc890, .6, 70, 2); shelfL.position.set(0, 18, ZB + 14); scene.add(shelfL);   // the shelves' light falling on the chair, the desk's back edge
    const moon = new TT.DirectionalLight(day ? 0xfff2e0 : T === 'evening' ? 0xffb080 : 0x8090c8, day ? (T === 'morning' ? .7 : .8) : T === 'evening' ? .4 : .16); moon.position.set(-40, day ? 22 : 12, 6); scene.add(moon);   // the window's light: daylight, sunset, or the moon
    return { bg: day ? '#1a120c' : '#0d0906', exp: day ? .9 : 1.02, minExp: day ? .85 : .95, board: .5, boardCol: 0xffe6c4, key, env: { top: '#2e2218', bottom: '#080504', panels: [[-12, 6, -6, 8, 5, '#ffc070', 5], [14, 10, 6, 7, 9, '#7a88b8', .6], [0, 10, 18, 20, 5, '#5a4636', .8], [-16, 4, 10, 5, 6, '#ffb060', .8], [0, 14, -20, 30, 10, '#ffcf90', .7]] } };
  };
  TABLES[5].plain = { sun: 0xffd8a8, sunI: .78, hemi: [0xd8d0e0, 0x3a2414, .46], exp: .68 };
  // the full games' pages (?skin=atlas): the floor is the desk mat's dark green leather (2026-11-06; was the walnut desk).
  // One tile of 24 × 18 units, tileable (the fine grain is per pixel, the slow mottling a periodic wave), centred on the board.
  const leatherFloor = o => { const W = sz(o, 1024), H = Math.round(W * 18 / 24); return canvasTex('tbl5-leather-floor', W, H, (c) => {
      const N = makeNoise(17), img = c.createImageData(W, H), d = img.data, P2 = Math.PI * 2;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, slow = Math.sin(P2 * u + 1.3) * Math.cos(P2 * v * 2 + .4) * .5 + Math.sin(P2 * (u * 2 + v) + 2.1) * .5;
        const k = (N(x / 2.2, y / 2.2, 2) - .5) * 22 + slow * 6, i = (y * W + x) * 4;
        d[i] = 30 + k * .5; d[i + 1] = 52 + k * .8; d[i + 2] = 40 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }); };
  /* =====================================================================
     Places 6..9 (2026-11-07): 縁側 / 山小屋 / リヤド / スカイラウンジ — the study's level of detail, every hour of the day.
     Same rules as 2..5: a closed room (or a sky dome over an open one), a table the board fits, nothing within r ≈ 9.5 of the board.
     ===================================================================== */
  const SKY = { morning: ['#7fa8d6', '#c9dcec', '#f7e4cc'], day: ['#3f86d6', '#8cc0ea', '#dcedf8'], evening: ['#33407e', '#b06fa0', '#ffc086'], night: ['#03060f', '#0b1530', '#1d2b4e'] };
  const HOUR = {
    morning: { sun: 0xffe2c0, sI: 1.3, sky: 0xe4ecf8, a: .46, exp: .76, board: .26 },
    day: { sun: 0xfff6ea, sI: 1.4, sky: 0xf2f6ff, a: .48, exp: .72, board: .24 },
    evening: { sun: 0xffb070, sI: 1.05, sky: 0xf4cdb8, a: .4, exp: .8, board: .32 },
    night: { sun: 0xa8b8e8, sI: .34, sky: 0x3a4466, a: .28, exp: .9, board: .5 },
  };
  // the lights of an hour: sky / ground, a sun (or moon) that casts the shadows, a soft fill from the camera's side. k scales the daylight (indoors)
  function hourLights(o, T, sunPos, ground = 0x8a6a48, k = 1) {
    const { TT, scene } = o, H = HOUR[T];
    scene.add(new TT.HemisphereLight(H.sky, ground, H.a * (T === 'night' ? 1 : k)));
    const key = dirLight(TT, H.sun, H.sI * k, sunPos, 17); scene.add(key);
    const fill = new TT.DirectionalLight(T === 'night' ? 0xffc890 : 0xfff0e4, T === 'night' ? .22 : .26); fill.position.set(6, 12, 18); scene.add(fill);
    return { key, H };
  }
  // a sky dome (vertex colours: horizon → zenith) for the open places; below the horizon it takes `low`
  function skyDome(o, T, r, low, hz = 0) {
    const { TT, g } = o, [z, m, h] = SKY[T], geo = new TT.SphereGeometry(r, 32, 16), P = geo.attributes.position, col = [], cc = new TT.Color(), a = new TT.Color(), b = new TT.Color();
    for (let i = 0; i < P.count; i++) { const y = P.getY(i) - hz, e = Math.atan2(y, r) / (Math.PI / 2);
      if (y < 0) cc.set(low); else if (e > .25) { a.set(m); b.set(z); cc.copy(a).lerp(b, (e - .25) / .75); } else { a.set(h); b.set(m); cc.copy(a).lerp(b, e / .25); }
      cc.convertSRGBToLinear(); col.push(cc.r, cc.g, cc.b); }
    geo.setAttribute('color', new TT.Float32BufferAttribute(col, 3));
    const dm = new TT.Mesh(geo, new TT.MeshBasicMaterial({ vertexColors: true, side: TT.BackSide, depthWrite: false, toneMapped: false })); dm.position.y = hz; dm.renderOrder = -3; g.add(dm); return dm;
  }
  // a painted band all round the view (the far scenery): azimuths al..ar (degrees, right of straight ahead), heights y0..y1 at radius r.
  // draw(c, ppu, ax) draws with x = ax(azimuth); the band's top fades into the dome
  function panoBand(o, key, r, al, ar, y0, y1, px, draw) {
    const { TT, g } = o, DEG = r * Math.PI / 180, ax = a => -a * DEG;
    const tex = ptex(o, key, ax(ar), y0, ax(al), y1, px, (c, ppu) => { draw(c, ppu, ax);
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = lin(c, y1, y1 - (y1 - y0) * .15, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(ax(ar), y1 - (y1 - y0) * .15, ax(al) - ax(ar), (y1 - y0) * .15); c.globalCompositeOperation = 'source-over'; });
    const m = new TT.Mesh(new TT.CylinderGeometry(r, r, y1 - y0, 48, 1, true, Math.PI - ar * Math.PI / 180, (ar - al) * Math.PI / 180), new TT.MeshBasicMaterial({ map: tex, side: TT.BackSide, transparent: true, depthWrite: false, toneMapped: false }));
    m.position.y = (y0 + y1) / 2; m.renderOrder = -2; g.add(m); return m;
  }
  // a warm lamp glow (a billboard halo, no light cost)
  function halo(o, G, x, y, z, s, col = 'rgba(255,200,130,') {
    const { TT } = o, t = canvasTex('halo-' + col, 64, 64, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, col + '.85)'], [.3, col + '.3)'], [1, col + '0)']]); c.fillRect(0, 0, W, W); });
    const m = new TT.Mesh(new TT.PlaneGeometry(s, s), new TT.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: TT.AdditiveBlending, toneMapped: false }));
    m.userData.keep = 1; m.onBeforeRender = (r, sc, cam) => { m.quaternion.copy(cam.quaternion); }; m.position.set(x, y, z); G.add(m); return m;
  }
  const lampLit = T => T === 'evening' || T === 'night';
  // a teapot: body, lid with a knob, spout, handle (a lathe and two tubes)
  function teapot(o, G0, x, z, ry, mat, s = 1, side = false) {
    const TT = o.TT, G = grp(TT, G0, x, 0, z, ry); G.scale.setScalar(s);
    at(G, lathe(TT, [[0, 0], [1.2, 0], [1.75, .5], [1.95, 1.4], [1.7, 2.3], [1.05, 2.65], [0, 2.65]], SEG(o, 28), mat), 0, 0, 0);
    at(G, lathe(TT, [[0, 0], [1.05, 0], [1, .25], [.55, .45], [.2, .5], [.28, .75], [.2, .95], [0, .95]], SEG(o, 20), mat), 0, 2.6, 0);
    const sp = new TT.Mesh(new TT.TubeGeometry(new TT.CatmullRomCurve3([new TT.Vector3(1.5, .9, 0), new TT.Vector3(2.4, 1.4, 0), new TT.Vector3(2.9, 2.5, 0), new TT.Vector3(3.2, 2.9, 0)]), 10, .26, 8), mat); at(G, sp, 0, 0, 0);
    if (side) { const h = new TT.Mesh(new TT.CylinderGeometry(.2, .26, 2.6, 8), mat); h.rotation.z = Math.PI / 2 - .3; at(G, h, 0, 1.6, 2.7).rotation.y = Math.PI / 2; }
    else { const h = new TT.Mesh(new TT.TorusGeometry(.95, .2, 8, 16, Math.PI * 1.1), mat); h.rotation.z = Math.PI / 2 + .15; at(G, h, -1.9, 1.4, 0); }
    return G;
  }

  /* ---------- 6 · 縁側: a low keyaki table on the veranda of an old house; an autumn garden with a pond, a stone lantern, maples ---------- */
  const keyaki = o => X.planks('tbl6-keyaki', '#8a5a34', '#4a2a14', 3, sz(o, 1024));
  TABLES[6] = (o) => {
    const { TT, g } = o, T = TOD(o), FL = -8.4, Z0 = 1, EDGE = -27, GL = FL - 8;
    // the table: a low zataku, keyaki under a thin lacquer, short legs on the boards
    const top = M({ map: keyaki(o), roughness: .42, clearcoat: .28, clearcoatRoughness: .35, bumpScale: .002 });
    at(g, new TT.Mesh(RB(28, 1.6, 21, .5, 3), top), 0, -.8, Z0, 0, false).receiveShadow = true;
    const legM = M({ map: wood('tbl6-leg', '#6a4024', '#3a1e0c', 256, 512, 1), roughness: .4, clearcoat: .4 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => at(g, new TT.Mesh(RB(2.2, -FL - 1.6, 2.2, .3, 1), legM), a * 11.6, (FL - 1.6) / 2, Z0 + b * 8));
    at(g, new TT.Mesh(RB(24, 1.2, 1.2, .2, 1), legM), 0, -2.2, Z0 - 8); at(g, new TT.Mesh(RB(24, 1.2, 1.2, .2, 1), legM), 0, -2.2, Z0 + 8);
    // the veranda: weathered cedar boards (lengthwise), a thick edge beam, posts, the eaves above, shoji on the left
    const cedar = X.planks('tbl6-engawa', '#b48a5e', '#7a5432', 7, sz(o, 1024));
    const deck = new TT.Mesh(new TT.PlaneGeometry(150, 180), M({ map: rep(TT, cedar, 6, 7), roughness: .62, clearcoat: .2, clearcoatRoughness: .5, color: T === 'night' ? 0x8a90a8 : 0xffffff })); deck.rotation.x = -Math.PI / 2; deck.position.set(0, FL, EDGE + 90); deck.receiveShadow = true; g.add(deck);
    ao(o, 0, FL, Z0, 34, 26, .4);
    const beamM = M({ map: wood('tbl6-beam', '#7a5a3a', '#3e2a18', 256, 512, 1.4), roughness: .6 });
    at(g, new TT.Mesh(RB(150, 3, 3, .3, 1), beamM), 0, FL - 1.5, EDGE - 1.5, 0, false);
    [-60, -30, 30, 60].forEach(x => { at(g, new TT.Mesh(RB(2.6, 42, 2.6, .2, 1), beamM), x, FL + 21, EDGE + .5); at(g, new TT.Mesh(RB(2.2, FL - GL, 2.2, .1, 1), beamM), x, (FL + GL) / 2, EDGE - 1.5, 0, false); });
    const Y1 = FL + 42;
    at(g, new TT.Mesh(RB(150, 3.4, 3.4, .3, 1), beamM), 0, Y1 + 1.7, EDGE + .5);
    { const eave = new TT.Mesh(new TT.PlaneGeometry(150, 200), M({ map: rep(TT, X.planks('tbl6-eave', '#5a3e26', '#2e1e10', 9, sz(o, 512)), 5, 8), roughness: .8, color: 0x9a8a7a, side: TT.DoubleSide })); eave.rotation.x = Math.PI / 2; eave.position.set(0, Y1 + 3.4, EDGE + 90); g.add(eave);
      for (let z = EDGE + 6; z < 150; z += 10) at(g, new TT.Mesh(RB(150, 1.2, 1.2, .1, 1), beamM), 0, Y1 + 2.8, z, 0, false);
      const eaveOut = new TT.Mesh(new TT.PlaneGeometry(150, 16), M({ color: 0x4a3626, roughness: .8, side: TT.DoubleSide })); eaveOut.rotation.x = Math.PI / 2 - .32; eaveOut.position.set(0, Y1 + 1.4, EDGE - 7.4); g.add(eaveOut); }
    { const sh = ptex(o, 'tbl6-shoji-' + T, -150, FL, 30, Y1 + 4, 1024, (c) => {   // the left side: shoji, lit from the room behind at night
        const lit = lampLit(T); c.fillStyle = '#5a3e26'; c.fillRect(-150, FL, 180, Y1 + 4 - FL);
        for (let x = -148; x < 28; x += 18) { c.fillStyle = lit ? (T === 'night' ? '#f2d6a0' : '#f4e0c0') : '#ece6d8'; c.fillRect(x + 1.2, FL + 4, 15.6, Y1 - FL - 6); c.fillStyle = '#6a4a2e';
          for (let k = 1; k < 4; k++) c.fillRect(x + 1.2 + k * 3.9 - .2, FL + 4, .4, Y1 - FL - 6); for (let y = FL + 4; y < Y1 - 2; y += 6) c.fillRect(x + 1.2, y - .2, 15.6, .4); c.fillStyle = '#4a321e'; c.fillRect(x, FL, 1.2, Y1 - FL + 4); c.fillRect(x, FL, 18, 4); }
        c.fillStyle = '#4a321e'; c.fillRect(-150, Y1 - 2, 180, 6); });
      const m = flat(TT, sh, 180, Y1 + 4 - FL); m.rotation.y = Math.PI / 2; m.position.set(-62, (FL + Y1 + 4) / 2, 60); g.add(m); }
    // the garden below: raked gravel and moss (3D ground), stones, a pond, a stone lantern, two maples; the far garden painted all round
    const GR = canvasTex('tbl6-gravel', sz(o, 1024), sz(o, 1024), (c, W) => { const N = makeNoise(61), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const u = x / W, v = y / W, n = N(u * 3, v * 3, 4), m = Math.min(1, Math.max(0, (n - .6) / .08)), rake = Math.sin(v * 260 + Math.sin(u * 7) * 2.4) * .5 + .5, k = (Math.random() - .5) * 18, i = (y * W + x) * 4;
        const L = 176 + rake * 12 + k, mr = 86 + k * .4, mg = 104 + k * .7, mb = 58 + k * .3;   // raked gravel, low contrast; a few soft islands of moss
        d[i] = L + (mr - L) * m; d[i + 1] = L - 4 + (mg - L + 4) * m; d[i + 2] = L - 14 + (mb - L + 14) * m; d[i + 3] = 255; }
      c.putImageData(img, 0, 0); });
    { const gm = new TT.Mesh(new TT.PlaneGeometry(700, 560), M({ map: rep(TT, GR, 7, 5.6), roughness: .95, bumpScale: .012, color: T === 'night' ? 0x6a7898 : T === 'evening' ? 0xf0d0c0 : 0xffffff })); gm.rotation.x = -Math.PI / 2; gm.position.set(0, GL, EDGE - 280); gm.receiveShadow = true; g.add(gm); }
    const stoneM = M({ map: canvasTex('tbl6-stone', 256, 256, (c, W) => { const N = makeNoise(5), img = c.createImageData(W, W), d = img.data; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const k = (N(x / 6, y / 6, 4) - .5) * 60 + (Math.random() - .5) * 14, i = (y * W + x) * 4; d[i] = 120 + k; d[i + 1] = 118 + k; d[i + 2] = 110 + k; d[i + 3] = 255; } c.putImageData(img, 0, 0); }), roughness: .9, bumpScale: .02 });
    { const s1 = new TT.Mesh(new TT.DodecahedronGeometry(1, 1), stoneM); s1.scale.set(7, 2.6, 4); at(g, s1, 4, GL + 2.4, EDGE - 6); }   // the step stone (沓脱石)
    [[-26, -54, 5, 3.4, 4], [-14, -62, 3, 2.2, 2.6], [36, -70, 6, 4, 5], [48, -60, 3.2, 2, 3]].forEach(([x, z, a, b, c2], i) => { const st = new TT.Mesh(new TT.DodecahedronGeometry(1, 1), stoneM); st.scale.set(a, b, c2); st.rotation.y = i; at(g, st, x, GL + b * .7, z); });
    { const pond = new TT.Mesh(new TT.CircleGeometry(1, 40), M({ color: T === 'night' ? 0x060c16 : T === 'evening' ? 0x2a2838 : 0x1e3434, roughness: .12, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .4 })); pond.scale.set(30, 14, 1); pond.rotation.x = -Math.PI / 2; at(g, pond, -10, GL + .05, -86, 0, false);
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, st = new TT.Mesh(new TT.DodecahedronGeometry(1, 0), stoneM); st.scale.set(3, 1.2, 2.4); st.rotation.y = a; at(g, st, -10 + Math.cos(a) * 30.5, GL + .4, -86 + Math.sin(a) * 14.5); } }
    { const Gt = grp(TT, g, 30, GL, -50, .3), lit = lampLit(T);   // the stone lantern (yukimi / kasuga)
      at(Gt, new TT.Mesh(new TT.CylinderGeometry(2.6, 3, 1.4, 6), stoneM), 0, .7, 0); at(Gt, new TT.Mesh(new TT.CylinderGeometry(.9, 1.1, 6, 8), stoneM), 0, 4.4, 0);
      at(Gt, new TT.Mesh(new TT.CylinderGeometry(2.6, 2.2, 1.2, 6), stoneM), 0, 8, 0);
      at(Gt, new TT.Mesh(RB(3.2, 3, 3.2, .2, 1), [stoneM, stoneM, stoneM, stoneM, M({ color: lit ? 0xffc070 : 0x1a1a18, emissive: new TT.Color(lit ? 0xffa040 : 0), emissiveIntensity: 1 }), stoneM]), 0, 10.1, 0);
      at(Gt, new TT.Mesh(new TT.ConeGeometry(4.2, 2.6, 6), stoneM), 0, 12.9, 0); at(Gt, new TT.Mesh(new TT.SphereGeometry(.8, 10, 8), stoneM), 0, 14.6, 0);
      if (lit) { halo(o, Gt, 0, 10.2, 1.8, 7); const L = new TT.PointLight(0xffb060, 1.2, 40, 2); L.position.set(0, 10.2, 3); Gt.add(L); } }
    // two maples in autumn colour and a pine (3D leaves on the near side)
    const momiji = canvasTex('leaf-momiji', 128, 128, (c, W) => { c.clearRect(0, 0, W, W); c.fillStyle = '#fff'; c.beginPath(); for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 14) * Math.PI * 2, r = i % 2 ? W * .16 : W * .46; c.lineTo(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r); } c.fill(); });
    const tr = M({ color: 0x4a3426, roughness: .9 });
    [[-44, -44, 1.1, [0xd84a2a, 0xe8822a]], [52, -88, 1.3, [0xc8382a, 0xe0a030]]].forEach(([x, z, s, cols], i) => { const Gm = grp(TT, g, x, GL, z);
      const tk = new TT.Mesh(new TT.CylinderGeometry(.6 * s, 1.1 * s, 18 * s, 7), tr); tk.rotation.z = (i ? -.12 : .14); at(Gm, tk, 0, 9 * s, 0);
      [[-.6, .4], [.7, -.3], [.1, .8]].forEach(([a, b]) => { const br = new TT.Mesh(new TT.CylinderGeometry(.25 * s, .45 * s, 10 * s, 5), tr); br.rotation.set(b * .8, 0, a * 1.1); at(Gm, br, a * 3 * s, 17 * s, b * 2 * s); });
      cols.forEach((cl, j) => foliage(o, Gm, o.COARSE ? 110 : 190, 0, 21 * s, 0, 10 * s, 4.6 * s, 8 * s, momiji, 3.2 * s, 7 + i * 3 + j, T === 'night' ? new TT.Color(cl).multiplyScalar(.45).getHex() : cl)); });
    // the far garden (painted): a clipped hedge, pines, a tile-capped wall, hills, the sky of the hour
    skyDome(o, T, 520, T === 'night' ? '#0c1218' : '#5a6a48');
    panoBand(o, 'tbl6-pano-' + T, 300, -100, 110, GL - 40, 160, 3072, (c, ppu, ax) => {
      const R = rng(66), W0 = ax(110), W1 = ax(-100), HZ = GL + 46, sk = SKY[T];
      c.fillStyle = lin(c, 160, HZ, [[0, sk[0]], [.55, sk[1]], [1, sk[2]]]); c.fillRect(W0, HZ - 10, W1 - W0, 170 - HZ);
      if (T === 'night') { c.fillStyle = '#f4f0dc'; ell(c, ax(-24), HZ + 70, 4, 4); c.fillStyle = rad(c, ax(-24), HZ + 70, 40, [[0, 'rgba(230,236,255,.3)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(ax(-24) - 40, HZ + 30, 80, 80); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,240,${.2 + R() * .5})`; const r = .15 + R() * .25; ell(c, W0 + R() * (W1 - W0), HZ + 20 + R() * 130, r, r); } }
      else if (T === 'evening') { c.fillStyle = rad(c, ax(-30), HZ + 10, 120, [[0, 'rgba(255,230,190,.8)'], [.2, 'rgba(255,190,140,.3)'], [1, 'rgba(255,170,120,0)']]); c.fillRect(W0, HZ - 10, W1 - W0, 170 - HZ); }
      blur(c, .8 * ppu);
      const hill = T === 'night' ? '#0e1420' : T === 'evening' ? '#5a4a6a' : '#7d90a0'; c.fillStyle = hill; c.beginPath(); c.moveTo(W0, HZ); for (let a = 110; a >= -100; a -= 2) c.lineTo(ax(a), HZ + 14 + 10 * Math.sin(a / 23) + 6 * Math.sin(a / 7)); c.lineTo(W1, HZ); c.fill();
      blur(c, .3 * ppu);
      const tree = T === 'night' ? '#0a120e' : T === 'evening' ? '#3a3a2a' : '#3e5a34';
      for (let i = 0; i < 60; i++) { const a = -100 + R() * 210, x = ax(a), h = 10 + R() * 16; c.fillStyle = tree; for (let k = 0; k < 4; k++) ell(c, x + (R() - .5) * 6, HZ + 6 + h * (k / 4), 5 - k, 2.2); }   // pines, layered
      for (let i = 0; i < 40; i++) { const a = -100 + R() * 210; c.fillStyle = T === 'night' ? '#2a0c0c' : ['#c8402a', '#e07a2a', '#d8a030', '#a83a2a'][i % 4]; ell(c, ax(a), HZ + 8 + R() * 10, 4 + R() * 5, 3 + R() * 3); }   // maples behind
      c.fillStyle = T === 'night' ? '#141414' : '#d8d0c0'; c.fillRect(W0, HZ - 1, W1 - W0, 6); c.fillStyle = T === 'night' ? '#0a0a0c' : '#3a3a40'; c.fillRect(W0, HZ + 5, W1 - W0, 2); for (let x = W0; x < W1; x += 1.2) c.fillRect(x, HZ + 4.6, .7, .6);   // the earthen wall, tile cap
      c.fillStyle = T === 'night' ? '#0c1410' : T === 'evening' ? '#4a4a30' : '#56723e'; for (let i = 0; i < 90; i++) ell(c, W0 + R() * (W1 - W0), HZ - 2 + R() * 4, 3 + R() * 5, 2.2 + R() * 2);   // the hedge
      c.fillStyle = T === 'night' ? '#0c140e' : T === 'evening' ? '#5e5c3a' : '#6e8a48'; c.fillRect(W0, GL - 40, W1 - W0, HZ - 3 - (GL - 40));   // the ground (behind the 3D gravel)
      blur(c, 0);
    });
    // the table of the hour: tea and wagashi, a sake set at night; an andon on the boards beside the table in the evening
    const raku = M({ color: 0x3a2a22, roughness: .5, clearcoat: .4 }), celadon = M({ color: 0x9ab8a4, roughness: .25, clearcoat: .6 }), shino = M({ color: 0xeee4d4, roughness: .55, clearcoat: .3 });
    const yunomi = (x, z, mat, tea = 0x8a9a3a) => { const G = grp(TT, g, x, 0, z); at(G, lathe(TT, [[0, 0], [.7, 0], [.75, .15], [.95, 2.2], [.88, 2.25], [.82, .4], [0, .35]], SEG(o, 22), mat), 0, 0, 0); const lq = new TT.Mesh(new TT.CircleGeometry(.84, 18), M({ color: tea, roughness: .1, clearcoat: .8 })); lq.rotation.x = -Math.PI / 2; at(G, lq, 0, 1.8, 0, 0, false); return G; };
    const tray = (x, z, ry) => at(g, new TT.Mesh(RB(6.2, .4, 3.6, .4, 2), M({ color: 0x1a0e0a, roughness: .2, clearcoat: 1 })), x, .2, z, ry);
    const wagashi = (x, z) => { const G = grp(TT, g, x, 0, z); at(G, lathe(TT, [[0, 0], [1.6, 0], [1.7, .14], [1.4, .16], [0, .14]], SEG(o, 24), shino), 0, 0, 0);
      [[-.5, .1, 0xe8a8b8], [.6, -.2, 0x9ab86a]].forEach(([a, b, cl]) => { const w = new TT.Mesh(new TT.SphereGeometry(.62, 14, 10), M({ color: cl, roughness: .7 })); w.scale.set(1, .66, 1); at(G, w, a, .5, b); });
      const k = new TT.Mesh(RB(.1, .06, 2.4, .02, 1), M({ color: 0xc8a06a, roughness: .6 })); k.rotation.y = .6; at(G, k, .2, .2, .9, 0, false); };
    if (T === 'night') {
      tray(-11, -6, .2); { const Gk = grp(TT, g, -12.2, .4, -6.2); at(Gk, lathe(TT, [[0, 0], [.8, 0], [1.25, 1], [1.2, 2], [.45, 3], [.3, 3.8], [.42, 4], [0, 4]], SEG(o, 20), shino), 0, 0, 0); }
      [[-9.6, -5.4], [-9.8, -7.1]].forEach(([x, z]) => at(g, lathe(TT, [[0, 0], [.4, 0], [.7, .6], [.68, .62], [0, .55]], SEG(o, 16), shino), x, .4, z));
      wagashi(11.4, -5.8); yunomi(10.4, 3.6, raku);
    } else {
      teapot(o, g, -11.4, -6.4, -.6, T === 'evening' ? raku : M({ color: 0x9a4a2a, roughness: .45, clearcoat: .3 }), .82, true);
      yunomi(-10.4, -2.4, celadon); yunomi(10.6, 3.4, celadon); wagashi(11.4, -5.8);
      if (T === 'morning') { const fan = new TT.Mesh(RB(1, .3, 6, .1, 1), M({ color: 0xd8c8a0, roughness: .6 })); fan.rotation.y = .3; at(g, fan, 6.4, .15, -9.4, 0, false); }
    }
    if (lampLit(T)) { const Ga = grp(TT, g, -20, FL, -10.4, .2), fr = M({ color: 0x2a1a10, roughness: .4, clearcoat: .5 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => at(Ga, new TT.Mesh(RB(.4, 12, .4, .05, 1), fr), a * 2.2, 6, b * 2.2));
      at(Ga, new TT.Mesh(RB(4.2, 7, 4.2, .05, 1), new TT.MeshStandardMaterial({ color: 0xfff0d0, emissive: new TT.Color(0xffb860), emissiveIntensity: .9, roughness: .9 })), 0, 7.6, 0);
      at(Ga, new TT.Mesh(RB(4.8, .4, 4.8, .1, 1), fr), 0, 11.6, 0); at(Ga, new TT.Mesh(RB(4.8, .4, 4.8, .1, 1), fr), 0, 3.4, 0);
      halo(o, Ga, 0, 7.6, 0, 16); const L = new TT.PointLight(0xffb868, T === 'night' ? 1.4 : .8, 48, 2); L.position.set(0, 8, 1); Ga.add(L); }
    const { key, H } = hourLights(o, T, T === 'night' ? [-20, 30, -30] : T === 'evening' ? [-30, 10, -26] : [-16, 28, -22], 0x8a6a48, .92);
    try { X.mergeStatic(g); } catch (e) {}
    return { bg: SKY[T][1], exp: H.exp, board: H.board, boardCol: T === 'night' ? 0xffe2c0 : undefined, key, env: { top: SKY[T][1], bottom: '#3a2a1a', panels: [[0, 10, -24, 26, 8, T === 'night' ? '#6070a0' : '#ffffff', T === 'night' ? .5 : 1.6], [0, 18, 8, 22, 6, '#e8d8c0', .5]] } };
  };
  TABLES[6].plain = { sun: 0xfff0dc, sunI: .74, hemi: [0xeef0f4, 0x8a6a48, .5], exp: .64 };
  TABLES[6].floor = (o) => ({ img: keyaki(o).image, w: 46, h: 36, over: 'radial-gradient(140% 120% at 50% 40%, transparent 55%, rgba(40,20,8,.25))' });

  /* ---------- 7 · 山小屋: a log cabin in the snow — a stone fireplace, a thick plank table, mugs of cocoa, a lantern ---------- */
  const slab = o => X.planks('tbl7-slab', '#a8784a', '#5e3a1e', 3, sz(o, 1024));
  TABLES[7] = (o) => {
    const { TT, g, scene } = o, T = TOD(o), FL = -16, Z0 = 1, day = !lampLit(T);
    const top = M({ map: slab(o), roughness: .55, clearcoat: .2, clearcoatRoughness: .5, bumpScale: .004 });
    at(g, new TT.Mesh(RB(30, 2.4, 22, .5, 3), top), 0, -1.2, Z0, 0, false).receiveShadow = true;
    const logM = M({ map: wood('tbl7-log', '#8a5a34', '#4a2c14', 256, 512, 1.6), roughness: .7 });
    [-1, 1].forEach(s => { const Gl = grp(TT, g, s * 11, 0, Z0); const lg = new TT.Mesh(new TT.CylinderGeometry(1.2, 1.4, 15, 10), logM); lg.rotation.x = .22; at(Gl, lg, 0, FL / 2 - 1, -3.5); const lg2 = lg.clone(); lg2.rotation.x = -.22; at(Gl, lg2, 0, FL / 2 - 1, 3.5);
      const ft = new TT.Mesh(new TT.CylinderGeometry(1, 1, 16, 10), logM); ft.rotation.x = Math.PI / 2; at(Gl, ft, 0, FL + 1, 0); });
    { const st = new TT.Mesh(new TT.CylinderGeometry(.9, .9, 22, 10), logM); st.rotation.z = Math.PI / 2; at(g, st, 0, FL + 5, Z0); }
    // the cabin: log walls, a stone chimney breast with a fire, a window on the snow (right), a plaid rug on wide boards, beams
    const XL = -60, XR = 60, ZB = -46, ZF = 150, Y1 = 44;
    const logs = (c, a0, a1) => { for (let y = FL; y < Y1 + 2; y += 3.2) { const R = rng(y * 7 | 0); c.fillStyle = lin(c, y + 3.2, y, [[0, '#7a4e2c'], [.5, '#9a6a40'], [.85, '#6a4224'], [1, '#2e1a0c']]); c.fillRect(a0, y, a1 - a0, 3.2);
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(40,20,8,${.08 + R() * .12})`; c.fillRect(a0 + R() * (a1 - a0), y + R() * 3, 4 + R() * 14, .12); } c.fillStyle = 'rgba(230,220,200,.35)'; c.fillRect(a0, y - .15, a1 - a0, .3); } };
    roomBox(o, { key: 'tbl7-room-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024, wb: day ? 1 : .8,
      floor: M({ map: rep(TT, X.planks('tbl7-floor', '#9a6a40', '#5a3a1e', 5, sz(o, 1024)), 6, 8, Math.PI / 2), roughness: .6, clearcoat: .15, color: day ? 0xeee4d8 : 0xb09a88 }),
      back: (c) => { logs(c, XL - 2, XR + 2);
        c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-48, 6, 14, 18); c.fillStyle = '#e8e0d0'; c.fillRect(-47.4, 6.6, 12.8, 16.8); c.fillStyle = '#6a7e8a'; c.beginPath(); c.moveTo(-46.5, 8); c.lineTo(-41, 18); c.lineTo(-38, 13); c.lineTo(-35.5, 16); c.lineTo(-35.5, 8); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-42.6, 15.4); c.lineTo(-41, 18); c.lineTo(-39.6, 15.6); c.fill();   // a print of the peaks
        c.fillStyle = '#5a3a1e'; c.fillRect(34, -2, 1.2, 1.2); c.strokeStyle = '#8a6a4a'; c.lineWidth = .5; c.beginPath(); c.ellipse(38, -6, 3, 6, .1, 0, 7); c.stroke(); c.beginPath(); c.ellipse(45, -6, 3, 6, -.1, 0, 7); c.stroke(); for (let k = -10; k < -1; k += 1.4) { c.beginPath(); c.moveTo(35.2, k); c.lineTo(40.8, k); c.moveTo(42.2, k); c.lineTo(47.8, k); c.stroke(); } },   // snowshoes
      left: (c) => { logs(c, -ZF - 2, -ZB + 2);
        c.fillStyle = '#4a2c14'; [0, 12].forEach(y => c.fillRect(14, y, 30, 1)); const R = rng(4); for (let x = 15; x < 43;) { const w = 2 + R() * 2.4; c.fillStyle = ['#7a2a20', '#3a5a3a', '#c8a060', '#2a3a5a', '#e8e0d0'][R() * 5 | 0]; c.fillRect(x, 1, w, 3 + R() * 3); x += w + .4; } for (let x = 15; x < 43; x += 5) { c.fillStyle = '#c8b8a0'; ell(c, x + 2, 14.6, 1.6, 1.6); c.fillStyle = '#8a3a2a'; c.fillRect(x + 1, 13, 2, .6); } },   // shelves: tins and books
      right: (c, ppu) => { logs(c, ZB - 2, ZF + 2);   // the window on the snow: peaks, firs, the hour
        const W0 = -34, W1 = -6, Y0 = -2, YT = 30, sk = SKY[T], R = rng(12);
        c.fillStyle = lin(c, YT, Y0, [[0, sk[0]], [.6, sk[1]], [1, sk[2]]]); c.fillRect(W0, Y0, W1 - W0, YT - Y0);
        blur(c, .4 * ppu); const snow = T === 'night' ? '#4a5470' : T === 'evening' ? '#f0c0c8' : '#f4f6fa', rock = T === 'night' ? '#1a2030' : '#6a7484';
        c.fillStyle = rock; c.beginPath(); c.moveTo(W0, Y0 + 8); c.lineTo(W0 + 8, YT - 6); c.lineTo(W0 + 14, Y0 + 14); c.lineTo(W0 + 20, YT - 2); c.lineTo(W1, Y0 + 10); c.lineTo(W1, Y0); c.lineTo(W0, Y0); c.fill();
        c.fillStyle = snow; c.beginPath(); c.moveTo(W0 + 4.6, YT - 12); c.lineTo(W0 + 8, YT - 6); c.lineTo(W0 + 10.6, YT - 11); c.lineTo(W0 + 8, YT - 9.6); c.fill(); c.beginPath(); c.moveTo(W0 + 16.8, YT - 8); c.lineTo(W0 + 20, YT - 2); c.lineTo(W0 + 23.6, YT - 7.4); c.lineTo(W0 + 20, YT - 6); c.fill();
        c.fillStyle = T === 'night' ? '#0c1418' : '#24382c'; for (let i = 0; i < 26; i++) { const x = W0 + R() * (W1 - W0), h = 3 + R() * 5; c.beginPath(); c.moveTo(x, Y0 + 2 + h); c.lineTo(x - 1.4, Y0 + 2); c.lineTo(x + 1.4, Y0 + 2); c.fill(); }
        c.fillStyle = snow; c.fillRect(W0, Y0, W1 - W0, 2.4); blur(c, 0);
        if (T === 'night') for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.7)'; ell(c, W0 + R() * 28, YT - 10 + R() * 10, .12, .12); }
        c.fillStyle = '#3a2412'; [W0, (W0 + W1) / 2, W1].forEach(x => c.fillRect(x - .6, Y0 - .6, 1.2, YT - Y0 + 1.2)); [Y0, (Y0 + YT) / 2, YT].forEach(y => c.fillRect(W0 - .6, y - .6, W1 - W0 + 1.2, 1.2));
        c.fillStyle = '#f4f4f6'; c.fillRect(W0 - 1, Y0 - 1.6, W1 - W0 + 2, 1); [[W0 - 7, W0], [W1, W1 + 7]].forEach(([a, b]) => { for (let x = a; x < b; x += .6) { const k = .5 + .5 * Math.sin((x - a) * 2.4); c.fillStyle = (Math.floor((x - a) / 1.8) % 2) ? `rgb(${120 + k * 30 | 0},28,30)` : `rgb(${40 + k * 20 | 0},50,40)`; c.fillRect(x, Y0 - 4, .62, YT - Y0 + 8); } }); },
      ceil: (c) => { c.fillStyle = '#3a2412'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, ZF - ZB + 4); for (let x = XL; x < XR; x += 3) { c.fillStyle = `rgba(${80 + (x * 7 % 30)},${50 + (x * 3 % 20)},26,.6)`; c.fillRect(x, ZB, 2.8, ZF - ZB); } },
    });
    for (let z = -30; z < 60; z += 22) { const b = new TT.Mesh(new TT.CylinderGeometry(1.4, 1.4, XR - XL, 10), logM); b.rotation.z = Math.PI / 2; at(g, b, 0, Y1 - 2, z, 0, false); }
    // the chimney breast (stone), the firebox, a log fire, a mantel with a lantern and a clock
    const fieldstone = M({ map: canvasTex('tbl7-stones', sz(o, 512), sz(o, 512), (c, W) => { c.fillStyle = '#5a524a'; c.fillRect(0, 0, W, W); const R = rng(3); for (let y = -6; y < W; y += 30) for (let x = -(y % 60) / 2 - R() * 20; x < W; x += 34 + R() * 26) { const k = 92 + R() * 60, w = 30 + R() * 40, h = 24 + R() * 12; c.fillStyle = `rgb(${k},${k - 6 - R() * 10 | 0},${k - 14 - R() * 14 | 0})`; c.beginPath(); for (let a = 0; a < 6.28; a += .9) { const rr = .8 + R() * .22; c.lineTo(x + w / 2 + Math.cos(a) * w / 2 * rr, y + h / 2 + Math.sin(a) * h / 2 * rr); } c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(x + w / 2 - 4, y + h / 2 - 4, w / 3, h / 4, 0, 0, 7); c.fill(); } }), roughness: .9, bumpScale: .02 });
    fieldstone.map.wrapS = fieldstone.map.wrapT = TT.RepeatWrapping; fieldstone.map.repeat.set(2, 3);
    const FX = 30, FZ = ZB + 5;
    at(g, new TT.Mesh(RB(26, Y1 - FL, 10, .4, 1), fieldstone), FX, (FL + Y1) / 2, FZ, 0, false);
    at(g, new TT.Mesh(RB(14, 11, 2, .2, 1), M({ color: 0x0a0806, roughness: 1 })), FX, FL + 6.5, FZ + 4.2, 0, false);
    at(g, new TT.Mesh(RB(30, 1.8, 4.4, .3, 1), logM), FX, FL + 15, FZ + 6, 0, false);
    at(g, new TT.Mesh(RB(30, 1.2, 9, .2, 1), fieldstone), FX, FL + .6, FZ + 8, 0, false);
    { const Gf = grp(TT, g, FX, FL + 1.2, FZ + 6.4); Gf.userData.keep = 1;
      [[-2.4, .6, .3], [2.2, .6, -.4], [0, 1.6, 0]].forEach(([x, y, r]) => { const lg = new TT.Mesh(new TT.CylinderGeometry(.9, .9, 8, 8), logM); lg.rotation.set(0, r, Math.PI / 2); at(Gf, lg, x * .4, y, 0, 0, false); });
      const fl = canvasTex('tbl7-flame', 128, 128, (c, W) => { c.fillStyle = rad(c, W / 2, W * .9, W * .7, [[0, 'rgba(255,240,180,1)'], [.25, 'rgba(255,170,60,.9)'], [.6, 'rgba(220,70,20,.4)'], [1, 'rgba(160,30,10,0)']]); c.beginPath(); c.moveTo(W * .15, W); c.quadraticCurveTo(W * .2, W * .4, W * .42, W * .1); c.quadraticCurveTo(W * .5, W * .45, W * .58, W * .2); c.quadraticCurveTo(W * .8, W * .5, W * .85, W); c.fill(); });
      [[-1.6, 0], [1.4, .3], [0, -.2]].forEach(([x, z], i) => { const f = new TT.Mesh(new TT.PlaneGeometry(5 - i, 6 - i * .6), new TT.MeshBasicMaterial({ map: fl, transparent: true, depthWrite: false, blending: TT.AdditiveBlending, toneMapped: false })); at(Gf, f, x, 3.2, z + .3, 0, false); });
      halo(o, Gf, 0, 3, 1, 16, 'rgba(255,150,70,'); const L = new TT.PointLight(0xff9a50, day ? 1.2 : 2.4, 70, 2); L.position.set(0, 4, 4); Gf.add(L);
      o.roomTick && o.roomTick(t => { L.intensity = (day ? 1.2 : 2.4) * (.9 + .1 * Math.sin(t * 7) * Math.sin(t * 2.3)); }); }
    { const brass = M({ color: 0xb8924a, metalness: 1, roughness: .35 }); at(g, new TT.Mesh(RB(3, 4, 1.6, .2, 2), M({ color: 0x5a3a1e, roughness: .4, clearcoat: .5 })), FX - 8, FL + 18, FZ + 6, 0, false); at(g, new TT.Mesh(new TT.CircleGeometry(1, 18), M({ color: 0xf4ecd8, roughness: .4 })), FX - 8, FL + 18.4, FZ + 6.82, 0, false);
      [FX + 6, FX + 10].forEach(x => { at(g, lathe(TT, [[0, 0], [.8, 0], [.3, .4], [.25, 1.5], [0, 1.5]], 12, brass), x, FL + 15.9, FZ + 6, 0, false); at(g, new TT.Mesh(new TT.CylinderGeometry(.3, .3, 3, 10), M({ color: 0xf2ead8, roughness: .6 })), x, FL + 18.9, FZ + 6, 0, false); }); }
    // a plaid rug, two heavy chairs across, a basket of logs
    const plaid = canvasTex('tbl7-plaid', sz(o, 512), sz(o, 512), (c, W) => { c.fillStyle = '#7a1e1e'; c.fillRect(0, 0, W, W); const u = W / 16; for (let i = 0; i < 16; i += 4) { c.fillStyle = 'rgba(20,40,30,.75)'; c.fillRect(i * u, 0, u * 2, W); c.fillRect(0, i * u, W, u * 2); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(i * u + u * .8, 0, u * .4, W); c.fillRect(0, i * u + u * .8, W, u * .4); c.fillStyle = 'rgba(230,200,120,.5)'; c.fillRect(i * u + u * 3, 0, u * .15, W); c.fillRect(0, i * u + u * 3, W, u * .15); }
      const img = c.getImageData(0, 0, W, W), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 22; d[p] += k; d[p + 1] += k; d[p + 2] += k; } c.putImageData(img, 0, 0); });
    plaid.wrapS = plaid.wrapT = TT.RepeatWrapping; plaid.repeat.set(2, 1.6);
    at(g, new TT.Mesh(RB(52, .3, 40, .1, 1), M({ map: plaid, roughness: .95, bumpScale: .01 })), 0, FL + .15, Z0 + 2, 0, false);
    ao(o, 0, FL + .3, Z0, 36, 28, .45);
    const chairM = M({ map: wood('tbl7-chair', '#8a5a34', '#4a2c14', 256, 512, 1), roughness: .5, clearcoat: .2 });
    [-7.5, 7.5].forEach(x => { const G = grp(TT, g, x, FL, -14.2); [[-3.2, 3], [3.2, 3]].forEach(([a, b]) => at(G, new TT.Mesh(RB(1, 11, 1, .2, 1), chairM), a, 5.5, b)); [-3.2, 3.2].forEach(a => { const p = new TT.Mesh(RB(1, 21, 1, .2, 1), chairM); p.rotation.x = -.08; at(G, p, a, 10.5, -3.2); });
      at(G, new TT.Mesh(RB(8, 1.2, 7.6, .3, 1), chairM), 0, 11.4, 0); for (let k = 0; k < 4; k++) at(G, new TT.Mesh(RB(7, .9, .5, .2, 1), chairM), 0, 14 + k * 1.8, -3.2 - k * .14);
      at(G, new TT.Mesh(RB(7.2, .9, 6.8, .4, 2), M({ map: plaid, roughness: .95 })), 0, 12.4, .2); });
    { const Gb = grp(TT, g, -36, FL, -30); at(Gb, lathe(TT, [[0, 0], [4, 0], [4.6, 5], [4.8, 5.3], [4.4, 5.3], [0, .3]], SEG(o, 20), M({ map: canvasTex('basket', 128, 64, (c, W, H) => { c.fillStyle = '#b48a52'; c.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 8) for (let x = (y / 8 % 2) * 8; x < W; x += 16) { c.fillStyle = 'rgba(90,60,30,.4)'; c.fillRect(x, y, 8, 7); } }), roughness: .8 })), 0, 0, 0);
      for (let i = 0; i < 7; i++) { const lg = new TT.Mesh(new TT.CylinderGeometry(.8, .8, 9, 8), logM); lg.rotation.set(Math.PI / 2 - .3, i * .45, 0); at(Gb, lg, Math.cos(i * 2.2) * 1.8, 5 + (i % 3) * .8, Math.sin(i * 2.2) * 1.8); } }
    // the table: mugs of cocoa (marshmallows), a hurricane lantern, pine cones, a folded trail map, a tin plate of biscuits
    const enamel = M({ color: 0xece6da, roughness: .3, clearcoat: .6 }), rim = M({ color: 0x1e2a44, roughness: .3, clearcoat: .6 });
    const mug = (x, z, ry) => { const G = grp(TT, g, x, 0, z, ry); at(G, lathe(TT, [[0, 0], [1.05, 0], [1.1, .1], [1.1, 2.4], [1.02, 2.4], [1.0, .25], [0, .22]], SEG(o, 24), enamel), 0, 0, 0); at(G, new TT.Mesh(new TT.TorusGeometry(1.08, .07, 6, 24), rim), 0, 2.4, 0).rotation.x = Math.PI / 2;
      const h = new TT.Mesh(new TT.TorusGeometry(.6, .12, 6, 14, Math.PI * 1.1), enamel); h.rotation.z = -Math.PI * .55; at(G, h, 1.25, 1.3, 0);
      const lq = new TT.Mesh(new TT.CircleGeometry(1, 20), M({ color: 0x5a3020, roughness: .3 })); lq.rotation.x = -Math.PI / 2; at(G, lq, 0, 2.05, 0, 0, false);
      for (let i = 0; i < 4; i++) at(G, new TT.Mesh(RB(.5, .45, .5, .15, 1), M({ color: 0xfaf6f0, roughness: .8 })), Math.cos(i * 1.7) * .45, 2.2, Math.sin(i * 1.7) * .45, i, false); return G; };
    mug(-10.6, -3, .6); mug(10.8, 3.8, -2.4);
    { const Gl = grp(TT, g, -11.8, 0, -7.4), tin = M({ color: 0x2a3a30, roughness: .45, metalness: .5 }), lit = !day || T === 'morning';
      at(Gl, lathe(TT, [[0, 0], [1.4, 0], [1.45, .9], [.9, 1.1], [0, 1.1]], SEG(o, 20), tin), 0, 0, 0);
      at(Gl, lathe(TT, [[.7, 1.1], [1.15, 2.2], [1.15, 3.8], [.7, 4.8]], SEG(o, 20), glassM()), 0, 0, 0, 0, false);
      at(Gl, lathe(TT, [[0, 4.8], [1, 4.8], [.6, 5.6], [.2, 5.8], [0, 5.8]], SEG(o, 16), tin), 0, 0, 0); at(Gl, new TT.Mesh(new TT.TorusGeometry(.9, .06, 5, 16, Math.PI), tin), 0, 6.4, 0);
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => at(Gl, new TT.Mesh(new TT.CylinderGeometry(.05, .05, 4.6, 4), tin), a * 1.3, 3, b * 1.3, 0, false));
      if (lit) { const f = new TT.Mesh(new TT.SphereGeometry(.22, 8, 6), new TT.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false })); f.scale.set(1, 2.4, 1); at(Gl, f, 0, 2.9, 0, 0, false); halo(o, Gl, 0, 2.9, 0, 5); const L = new TT.PointLight(0xffb062, .7, 26, 2); L.position.set(0, 3, 0); Gl.add(L); } }
    { const cone = M({ color: 0x6a4424, roughness: .8 }); [[11.8, -6.4], [10.4, -7.8], [13, -8]].forEach(([x, z], i) => { const Gc = grp(TT, g, x, .9, z, i * 1.3); Gc.rotation.z = Math.PI / 2 - .1; for (let k = 0; k < 6; k++) { const sc = new TT.Mesh(new TT.ConeGeometry(.9 - k * .12, .7, 8, 1, true), cone); sc.material.side = TT.DoubleSide; at(Gc, sc, 0, k * .45 - 1, 0, k * .5); } }); }
    { const mp = canvasTex('tbl7-map', 256, 192, (c, W, H) => { c.fillStyle = '#efe4c8'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(140,110,70,.5)'; for (let r = 10; r < 160; r += 12) { c.beginPath(); c.ellipse(W * .6, H * .45, r * 1.3, r, .3, 0, 7); c.stroke(); } c.strokeStyle = '#b8402a'; c.setLineDash([5, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(20, H - 20); c.bezierCurveTo(80, 100, 120, 160, W * .6, H * .45); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(60,90,140,.6)'; c.fillRect(30, 30, 50, 20); c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1; c.beginPath(); c.moveTo(W / 2, 0); c.lineTo(W / 2, H); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke(); });
      at(g, new TT.Mesh(RB(7, .1, 5.2, .02, 1), M({ map: mp, roughness: .9, bump: false })), 6.8, .05, -10.4, -.12, false); }
    { const Gp = grp(TT, g, 12.4, 0, 0); at(Gp, lathe(TT, [[0, 0], [1.6, 0], [2.1, .3], [2.3, .4], [2.1, .45], [1.5, .15], [0, .15]], SEG(o, 24), M({ color: 0xd8dadc, metalness: .9, roughness: .4 })), 0, 0, 0);
      for (let i = 0; i < 5; i++) { const b = new TT.Mesh(new TT.CylinderGeometry(.65, .65, .2, 14), M({ color: 0xd8a860, roughness: .8 })); b.rotation.set(.2, 0, .1 * i); at(Gp, b, Math.cos(i * 1.3) * .7, .3 + i * .1, Math.sin(i * 1.3) * .7); } }
    const { key, H } = hourLights(o, T, [40, 26, 6], 0x5a3a1e, .55);
    try { X.mergeStatic(g); } catch (e) {}
    return { bg: '#24160c', exp: day ? .84 : .98, board: day ? .3 : .5, boardCol: 0xffe2c0, key, env: { top: '#5a3a24', bottom: '#140a04', panels: [[FX, 2, FZ, 10, 6, '#ff9a50', 3], [30, 10, 0, 8, 10, day ? '#ffffff' : '#506080', day ? 1.4 : .3], [0, 16, 8, 20, 6, '#d8b890', .5]] } };
  };
  TABLES[7].plain = { sun: 0xffe0c0, sunI: .76, hemi: [0xf0e4d8, 0x5a3a1e, .48], exp: .66 };
  TABLES[7].floor = (o) => ({ img: slab(o).image, w: 46, h: 36, over: 'radial-gradient(140% 120% at 50% 40%, transparent 55%, rgba(30,14,4,.3))' });
  /* ---------- 8 · リヤド: a Moroccan courtyard open to the sky — zellige, a fountain, orange trees, pierced brass lanterns, mint tea ---------- */
  const zellige = (o, key, cols, n = 6) => canvasTex(key, sz(o, 512), sz(o, 512), (c, W) => {   // an eight-pointed-star tiling in muted glazes
    const u = W / n; c.fillStyle = cols[0]; c.fillRect(0, 0, W, W);
    const star = (x, y, r, col) => { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? r * .62 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill(); };
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { star(i * u, j * u, u * .5, cols[1]); star(i * u, j * u, u * .28, cols[2]); star((i + .5) * u, (j + .5) * u, u * .2, cols[3]); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.2; for (let i = 0; i <= n * 4; i++) { c.beginPath(); c.moveTo(i * u / 4, 0); c.lineTo(i * u / 4, W); c.stroke(); c.beginPath(); c.moveTo(0, i * u / 4); c.lineTo(W, i * u / 4); c.stroke(); }
    const img = c.getImageData(0, 0, W, W), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 16; d[p] += k; d[p + 1] += k; d[p + 2] += k; } c.putImageData(img, 0, 0); });
  TABLES[8] = (o) => {
    const { TT, g } = o, T = TOD(o), FL = -16, Z0 = 1, lit = lampLit(T), night = T === 'night';
    // the table: a zellige top in a cedar frame on wrought-iron legs
    const tt = zellige(o, 'tbl8-top', ['#ece4d4', '#3a6e6a', '#c8a060', '#9a4a32'], 10);
    const cedar = M({ map: wood('tbl8-cedar', '#9a6a3e', '#5a3418', 256, 512, 1.2), roughness: .45, clearcoat: .35 });
    at(g, new TT.Mesh(RB(28, 1.1, 21, .2, 2), [cedar, cedar, M({ map: tt, roughness: .22, clearcoat: .8, clearcoatRoughness: .1, bumpScale: .002 }), cedar, cedar, cedar]), 0, -.55, Z0, 0, false).receiveShadow = true;
    at(g, new TT.Mesh(RB(29.4, 1.6, 22.4, .5, 2), cedar), 0, -1.1, Z0, 0, false);
    const iron = M({ color: 0x1c1a18, roughness: .45, metalness: .6 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = new TT.Mesh(new TT.CylinderGeometry(.4, .3, 14, 8), iron); at(g, l, a * 12, FL + 7, Z0 + b * 8.6); const sc = new TT.Mesh(new TT.TorusGeometry(1.2, .2, 6, 14, Math.PI * 1.5), iron); sc.rotation.y = Math.atan2(b, a) + Math.PI / 2; at(g, sc, a * 12.6, FL + 1.4, Z0 + b * 9.2); });
    // the courtyard: zellige floor, plaster walls with a dado, horseshoe arches, a carved band and a cedar cornice; the sky above
    const XL = -56, XR = 56, ZB = -60, ZF = 150, Y1 = 60;
    const fz = zellige(o, 'tbl8-floor', ['#d8c8b0', '#c4ae90', '#8a9e94', '#b88a6a'], 4);   // (muted: the floor stays quiet under the table)
    const wallTone = T === 'night' ? '#6a6a80' : T === 'evening' ? '#f0d2bc' : '#fff6ea';
    const wall = (c, a0, a1, arches, seed) => { const R = rng(seed);
      c.fillStyle = '#eadcc4'; c.fillRect(a0 - 2, FL - 2, a1 - a0 + 4, Y1 - FL + 4);
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(${R() > .5 ? '255,250,240' : '170,140,110'},${.03 + R() * .04})`; ell(c, a0 + R() * (a1 - a0), FL + R() * (Y1 - FL), 1 + R() * 5, 1 + R() * 4); }
      arches.forEach(x => {   // a horseshoe arch: a shaded opening, a glimpse of the room, a lantern inside at night
        c.fillStyle = night ? '#1e1410' : '#5a3e2c'; c.beginPath(); c.moveTo(x - 7, FL + 12); c.lineTo(x - 7, FL + 30); c.arc(x, FL + 31, 8, Math.PI * 1.08, -Math.PI * .08, true); c.lineTo(x + 7, FL + 12); c.fill();
        c.fillStyle = lin(c, FL + 38, FL + 12, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,.05)']]); c.fill();
        if (lit) { c.fillStyle = rad(c, x, FL + 24, 7, [[0, 'rgba(255,190,110,.75)'], [1, 'rgba(255,170,90,0)']]); c.fillRect(x - 8, FL + 14, 16, 22); c.fillStyle = '#ffd890'; c.fillRect(x - .7, FL + 22, 1.4, 2.4); }
        c.strokeStyle = '#c8a878'; c.lineWidth = .6; c.beginPath(); c.moveTo(x - 7.6, FL + 12); c.lineTo(x - 7.6, FL + 30); c.arc(x, FL + 31, 8.6, Math.PI * 1.08, -Math.PI * .08, true); c.lineTo(x + 7.6, FL + 12); c.stroke();
        for (let k = 0; k < 9; k++) { const a = Math.PI * (1.1 + k * .1); c.fillStyle = 'rgba(160,120,80,.4)'; ell(c, x + Math.cos(a) * 9.8, FL + 31 + Math.sin(a) * -9.8, .5, .5); } });
      c.drawImage(fz.image, 0, 0, fz.image.width, fz.image.height * .35, a0, FL, a1 - a0, 12);   // the zellige dado
      c.fillStyle = '#2f5a5a'; c.fillRect(a0, FL + 12, a1 - a0, .7);
      for (let x = a0; x < a1; x += 2.4) { c.fillStyle = 'rgba(140,110,80,.55)'; c.beginPath(); c.moveTo(x, Y1 - 10); c.lineTo(x + 1.2, Y1 - 12); c.lineTo(x + 2.4, Y1 - 10); c.lineTo(x + 1.2, Y1 - 8); c.fill(); }   // the carved stucco band
      c.fillStyle = '#d8c8ac'; c.fillRect(a0, Y1 - 13, a1 - a0, .5); c.fillRect(a0, Y1 - 7, a1 - a0, .5);
      c.fillStyle = '#6a4024'; c.fillRect(a0, Y1 - 5, a1 - a0, 5); for (let x = a0; x < a1; x += 1.6) { c.fillStyle = '#4a2a14'; c.fillRect(x, Y1 - 5, .7, 2.4); }   // the cedar cornice and its corbels
      c.globalCompositeOperation = 'multiply'; c.fillStyle = wallTone; c.fillRect(a0 - 2, FL - 2, a1 - a0 + 4, Y1 - FL + 4);
      c.fillStyle = lin(c, Y1, FL, [[0, 'rgba(255,255,255,1)'], [1, night ? 'rgba(150,140,150,1)' : 'rgba(225,210,195,1)']]); c.fillRect(a0 - 2, FL - 2, a1 - a0 + 4, Y1 - FL + 4); c.globalCompositeOperation = 'source-over'; };
    roomBox(o, { key: 'tbl8-court-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024,
      floor: M({ map: rep(TT, fz, (XR - XL) / 9, (ZF - ZB) / 9), roughness: .34, clearcoat: .4, clearcoatRoughness: .3, color: night ? 0x80809a : 0xe4dcd0, bumpScale: .002 }),
      back: c => wall(c, XL, XR, [-34, -12, 12, 34], 3), left: c => wall(c, -ZF, -ZB, [10, 32, 54], 5), right: c => wall(c, ZB, ZF, [-50, -28, -6], 7) });
    skyDome(o, T, 400, '#c8b8a0');
    // the fountain: an octagonal tiled basin, a carved marble bowl on a pedestal, a thin jet
    { const Gf = grp(TT, g, 0, FL, -42), side = zellige(o, 'tbl8-basin', ['#ece4d4', '#2f6a6a', '#c8a060', '#2f6a6a'], 8), marble = M({ color: 0xeee8dc, roughness: .3, clearcoat: .4 });
      at(Gf, new TT.Mesh(new TT.CylinderGeometry(9, 9.4, 3.4, 8), [M({ map: side, roughness: .25, clearcoat: .7 }), marble, marble]), 0, 1.7, 0, Math.PI / 8);
      const w = new TT.Mesh(new TT.CylinderGeometry(8.2, 8.2, .1, 8), M({ color: night ? 0x0c1a2a : 0x2a6a7a, roughness: .05, clearcoat: 1, transparent: true, opacity: .85 })); at(Gf, w, 0, 3.1, 0, Math.PI / 8, false);
      at(Gf, lathe(TT, [[0, 0], [1.6, 0], [1.1, .8], [.9, 9], [1.4, 10], [4.2, 11.4], [4.6, 12.4], [4.3, 12.5], [1.2, 12.1], [0, 12.1]], SEG(o, 24), marble), 0, 3, 0);   // (tall: the bowl and its jet show over the table)
      at(Gf, lathe(TT, [[0, 0], [.6, 0], [.4, 2], [1.6, 2.8], [1.8, 3.4], [0, 3.2]], SEG(o, 18), marble), 0, 15, 0);
      at(Gf, new TT.Mesh(new TT.CylinderGeometry(.1, .18, 3, 8), M({ color: 0xffffff, transparent: true, opacity: .45, roughness: .05 })), 0, 19.6, 0, 0, false);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, rr = new TT.Mesh(new TT.CylinderGeometry(.06, .06, 2.4, 4), new TT.MeshBasicMaterial({ color: 0xf0f8ff, transparent: true, opacity: .4 })); rr.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); at(Gf, rr, Math.cos(a) * 2.4, 17.2, Math.sin(a) * 2.4, 0, false); }
      [0, 1, 2, 3].forEach(i => { const p = new TT.Mesh(new TT.CircleGeometry(.9, 10), M({ color: 0xd84a5a, roughness: .7 })); p.rotation.x = -Math.PI / 2; at(Gf, p, Math.cos(i * 1.7) * 5.6, 3.16, Math.sin(i * 1.7) * 5.6, 0, false); });   // rose petals on the water
    }
    // orange trees in glazed pots, cushions on a low bench along the back
    const glazed = M({ color: 0x2f6a6a, roughness: .2, clearcoat: .8 }), orange = M({ color: 0xf08a24, roughness: .4, clearcoat: .3 });
    [[-44, -48, 3], [34, -44, 9]].forEach(([x, z, sd]) => { const Gp = potPlant(o, g, x, z, FL, 1.5, glazed, leafTex('leaf-orange', '#4a7a32', '#2a5222'), sd); const R = rng(sd);
      for (let i = 0; i < 14; i++) { const a = R() * 6.3, r = 3 + R() * 4; at(Gp, new TT.Mesh(new TT.SphereGeometry(.7, 10, 8), orange), Math.cos(a) * r, 22 + R() * 9, Math.sin(a) * r); } ao(o, x, FL, z, 14, 14, .4); });
    { const velvet = (col) => M({ map: X.cloth('tbl8-cush-' + col, col, 16, 128), roughness: .9, sheen: new TT.Color(0xffffff) });
      at(g, new TT.Mesh(RB(40, 4, 8, .6, 2), M({ color: 0xe2d4bc, roughness: .8 })), 0, FL + 2, ZB + 5);
      ['#8a2a2a', '#c8903a', '#2f5a5a', '#8a2a2a', '#c8903a'].forEach((col, i) => { const cu = new TT.Mesh(RB(6.4, 5.4, 2.4, 1.1, 3), velvet(col)); cu.rotation.x = -.18; at(g, cu, -16 + i * 8, FL + 6.6, ZB + 2.6); }); }
    // pierced brass lanterns hanging under the arcade (lit at dusk)
    const brass = M({ color: 0xc8a050, metalness: 1, roughness: .32 });
    const pierced = canvasTex('tbl8-pierced', 128, 128, (c, W) => { c.fillStyle = '#000'; c.fillRect(0, 0, W, W); c.fillStyle = '#fff'; for (let y = 6; y < W; y += 12) for (let x = (y / 12 % 2) * 6 + 3; x < W; x += 12) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); } });
    [[-30, 28, -24], [30, 28, -24], [-46, 30, 10], [46, 30, 10]].forEach(([x, y, z]) => { const Gl = grp(TT, g, x, y, z);
      at(Gl, lathe(TT, [[0, -3], [1.2, -2.6], [2.2, -1], [2.4, 1], [1.6, 3], [.6, 4], [.4, 5], [0, 5]], 12, M({ color: 0xb89048, metalness: 1, roughness: .35, emissive: new TT.Color(lit ? 0xffa040 : 0), emissiveMap: pierced, emissiveIntensity: lit ? 1.4 : 0 })), 0, 0, 0, 0, false);
      at(Gl, new TT.Mesh(new TT.CylinderGeometry(.05, .05, 20, 4), brass), 0, 15, 0, 0, false);
      if (lit) { halo(o, Gl, 0, 0, 0, 12); const L = new TT.PointLight(0xffb060, .9, 40, 2); Gl.add(L); } });
    // the table of the hour: mint tea in a silver pot and gilded glasses on a brass tray; dates, oranges and gazelle horns
    const silver = M({ color: 0xd8dadc, metalness: 1, roughness: .22 });
    { const Gt = grp(TT, g, -11.2, 0, -6); at(Gt, lathe(TT, [[0, 0], [3.4, 0], [3.6, .15], [3.7, .4], [3.5, .42], [3.3, .16], [0, .16]], SEG(o, 32), brass), 0, 0, 0);
      const pot = teapot(o, Gt, -.6, -.6, -.8, silver, .62); pot.position.y = .16; at(pot, new TT.Mesh(new TT.ConeGeometry(.9, 2.6, 12), silver), 0, 4.6, 0);
      [[1.6, 1.2, 0x8a3a1e], [2, -1.2, 0x2a6a3a]].forEach(([x, z, col]) => { const Gg = tumbler(o, Gt, x, z, [T === 'night' ? 0x8a4a1a : 0xa8701e, .72], 2.4, .62); Gg.position.y = .16; at(Gg, new TT.Mesh(new TT.CylinderGeometry(.66, .64, .5, 16, 1, true), M({ color: col, roughness: .1, clearcoat: 1, transparent: true, opacity: .75 })), 0, 1.4, 0, 0, false); at(Gg, new TT.Mesh(new TT.TorusGeometry(.66, .05, 4, 18), brass), 0, 2.3, 0, 0, false).rotation.x = Math.PI / 2;
        for (let k = 0; k < 3; k++) { const l = new TT.Mesh(new TT.SphereGeometry(.22, 6, 4), M({ color: 0x3a8a3a, roughness: .5 })); l.scale.set(1, .3, .6); at(Gg, l, Math.cos(k * 2) * .3, 2.2 + k * .15, Math.sin(k * 2) * .3, k, false); } }); }
    tumbler(o, g, -9.4, -2.6, [0xa8701e, .7], 2.4, .62);
    { const Gb = grp(TT, g, 11, 0, -6.4), clay = M({ color: 0xe8dcc4, roughness: .4, clearcoat: .4 }); at(Gb, lathe(TT, [[0, 0], [1.6, 0], [2.8, .9], [3.1, 1.3], [2.9, 1.35], [2.4, .9], [0, .4]], SEG(o, 28), clay), 0, 0, 0);
      const date = M({ color: 0x4a1e10, roughness: .3, clearcoat: .6 }); for (let i = 0; i < 9; i++) { const a = i * 2.4, r = Math.sqrt(i) * .6; const d = new TT.Mesh(new TT.SphereGeometry(.42, 10, 8), date); d.scale.set(1.7, .8, .9); d.rotation.y = a; at(Gb, d, Math.cos(a) * r, .8 + (i > 5 ? .35 : 0), Math.sin(a) * r); } }
    { const Gp = grp(TT, g, 11.6, 0, 1.6); plate(o, Gp, 0, 0, 2.2, M({ color: 0xf2ece0, roughness: .3, clearcoat: .5 })); [[-.7, -.3], [.6, .4], [0, .9]].forEach(([x, z], i) => { const f = new TT.Mesh(new TT.SphereGeometry(.85, 14, 10), orange); at(Gp, f, x, .95, z); if (!i) { const h = new TT.Mesh(new TT.SphereGeometry(.84, 14, 8, 0, Math.PI), M({ color: 0xf6b050, roughness: .5 })); h.rotation.x = -Math.PI / 2; at(Gp, h, 1.5, .2, -.8, 0, false); } }); }
    { const sugar = M({ color: 0xf4ece0, roughness: .9 }); [[6.6, -9.4, .3], [7.8, -8.4, 1.9]].forEach(([x, z, r]) => croissant(o, g, x, .1, z, r, sugar).scale.setScalar(.6)); }
    if (lit) { const Gc = grp(TT, g, -6.4, 0, -9); at(Gc, new TT.Mesh(new TT.CylinderGeometry(1, 1.1, .3, 8), brass), 0, .15, 0); at(Gc, lathe(TT, [[0, .3], [.9, .3], [1, 2], [.6, 2.8], [0, 3.2]], 8, M({ color: 0xc8a050, metalness: 1, roughness: .35, emissive: new TT.Color(0xffa040), emissiveMap: pierced, emissiveIntensity: 1.2 })), 0, 0, 0, 0, false); halo(o, Gc, 0, 1.6, 0, 5); }
    const { key, H } = hourLights(o, T, T === 'night' ? [10, 40, -8] : T === 'evening' ? [-34, 18, -20] : [-12, 40, -16], 0xc8a878, .95);
    try { X.mergeStatic(g); } catch (e) {}
    return { bg: SKY[T][1], exp: H.exp, board: H.board, boardCol: night ? 0xffe0b8 : undefined, key, env: { top: SKY[T][1], bottom: '#c8b090', panels: [[0, 22, -10, 22, 10, night ? '#6070a0' : '#ffffff', night ? .5 : 1.4], [-20, 8, -20, 6, 8, lit ? '#ffb060' : '#ffe8d0', lit ? 1.4 : .5], [0, 10, 18, 20, 5, '#f0dcc0', .5]] } };
  };
  TABLES[8].plain = { sun: 0xfff0dc, sunI: .76, hemi: [0xf4f0ea, 0xc8a878, .5], exp: .64 };
  TABLES[8].floor = (o) => ({ img: zellige(o, 'tbl8-floor', ['#d8c8b0', '#c4ae90', '#8a9e94', '#b88a6a'], 4).image, w: 9, h: 9, over: 'radial-gradient(140% 120% at 50% 40%, transparent 55%, rgba(60,40,20,.22)), linear-gradient(rgba(255,250,240,.2), rgba(255,250,240,.2))' });

  /* ---------- 9 · スカイラウンジ: a hotel lounge high over a city — a window wall, a black-marble table, velvet club chairs, the bar ---------- */
  const nero = o => canvasTex('tbl9-nero', sz(o, 1024), sz(o, 1024), (c, W) => {   // nero marquina: near-black with white veins
    const N = makeNoise(91), img = c.createImageData(W, W), d = img.data;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const u = x / W, v = y / W, w1 = N(u * 2, v * 2, 5), vein = Math.abs(Math.sin((u * 2.2 - v * 1.6 + w1 * 2.8) * Math.PI)), fine = Math.abs(Math.sin((u * 6 + v * 4 + N(u * 5, v * 5, 3) * 3) * Math.PI));
      const k = Math.pow(1 - vein, 44) * .5 + Math.pow(1 - fine, 70) * .22, L = 20 + k * 170 + (N(u * 14, v * 14, 2) - .5) * 8, i = (y * W + x) * 4; d[i] = L; d[i + 1] = L; d[i + 2] = L + 2; d[i + 3] = 255; }
    c.putImageData(img, 0, 0); });
  const SKYLINE = {
    morning: { sky: ['#8ab0d8', '#f0dcc8'], far: '#9aa8b8', near: '#6e7c8e', lit: 0, haze: 'rgba(255,236,214,.35)' },
    day: { sky: ['#4a8ad0', '#cfe4f4'], far: '#9aaec0', near: '#6a7e94', lit: 0, haze: 'rgba(235,245,255,.3)' },
    evening: { sky: ['#2a2e64', '#f09a6a'], far: '#4a4060', near: '#2a2438', lit: .55, haze: 'rgba(255,170,120,.22)' },
    night: { sky: ['#04060e', '#1a2244'], far: '#10141f', near: '#080a12', lit: 1, haze: 'rgba(80,90,140,.18)' },
  };
  TABLES[9] = (o) => {
    const { TT, g, scene } = o, T = TOD(o), FL = -16, Z0 = 1, S = SKYLINE[T], lit = lampLit(T), night = T === 'night';
    const top = M({ map: nero(o), roughness: .12, clearcoat: .9, clearcoatRoughness: .06, bump: false });
    at(g, new TT.Mesh(RB(28, 1.2, 21, .35, 3), top), 0, -.6, Z0, 0, false).receiveShadow = true;
    const brass = M({ color: 0xc8a050, metalness: 1, roughness: .22 });
    at(g, new TT.Mesh(RB(28.3, .16, 21.3, .08, 1), brass), 0, -1.22, Z0, 0, false);
    at(g, lathe(TT, [[0, 0], [7, 0], [7, .5], [2, 1.2], [1.4, 3], [1.2, 14.6], [4, 15], [0, 15]], SEG(o, 32), M({ color: 0x1a1a1c, roughness: .3, metalness: .6 })), 0, FL, Z0);
    // the lounge: the window wall on the city (back), the bar's backlit shelves (left), velvet drapes and a painting (right), downlights
    const XL = -60, XR = 60, ZB = -52, ZF = 150, Y1 = 40;
    const herring = canvasTex('tbl9-herring', sz(o, 1024), sz(o, 1024), (c, W) => { const R = rng(7), u = W / 12;
      for (let i = 0; i < 12; i++) for (let j = -1; j < 26; j++) { const k = R(), x = i * u, y = j * u / 2; c.fillStyle = `rgb(${46 + k * 22 | 0},${30 + k * 14 | 0},${20 + k * 10 | 0})`; c.beginPath(); if (i % 2) { c.moveTo(x, y); c.lineTo(x + u, y + u / 2); c.lineTo(x + u, y + u); c.lineTo(x, y + u / 2); } else { c.moveTo(x, y + u / 2); c.lineTo(x + u, y); c.lineTo(x + u, y + u / 2); c.lineTo(x, y + u); } c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1.2; c.stroke(); } });
    roomBox(o, { key: 'tbl9-lounge-' + T, xl: XL, xr: XR, zb: ZB, zf: ZF, y0: FL, y1: Y1, px: 2048, pxs: 1024,
      floor: M({ map: rep(TT, herring, 8, 12), roughness: .35, clearcoat: .45, clearcoatRoughness: .25 }),
      back: (c, ppu) => { const R = rng(17), W0 = XL - 2, W1 = XR + 2, HZ = FL + 4;
        c.fillStyle = lin(c, Y1, HZ, [[0, S.sky[0]], [1, S.sky[1]]]); c.fillRect(W0, HZ, W1 - W0, Y1 - HZ + 2);
        if (T === 'evening') { c.fillStyle = rad(c, -30, HZ + 6, 40, [[0, 'rgba(255,220,170,.8)'], [.3, 'rgba(255,170,120,.3)'], [1, 'rgba(255,150,100,0)']]); c.fillRect(W0, HZ, W1 - W0, Y1 - HZ); }
        if (night) for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(255,255,255,${.2 + R() * .4})`; ell(c, W0 + R() * (W1 - W0), HZ + 20 + R() * 20, .12, .12); }
        blur(c, .7 * ppu); c.fillStyle = S.far; for (let x = W0; x < W1; x += 1.2 + R() * 2) c.fillRect(x, HZ - 8, 1 + R() * 2.4, 8 + 6 + R() * 12); blur(c, 0);   // the far towers, hazy
        c.fillStyle = S.haze; c.fillRect(W0, HZ - 2, W1 - W0, 14);
        const towers = []; for (let x = W0; x < W1;) { const w = 3 + R() * 6, h = 6 + R() * 22; towers.push([x, w, h]); x += w + R() * 1.4; }
        towers.forEach(([x, w, h]) => { c.fillStyle = S.near; c.fillRect(x, FL - 2, w, h + HZ - FL); if (R() < .2) { c.fillRect(x + w * .45, HZ + h, w * .1, 3); if (lit) { c.fillStyle = '#ff3a2a'; ell(c, x + w * .5, HZ + h + 3, .25, .25); } }
          for (let y = FL; y < HZ + h - 1; y += 1.1) for (let wx = x + .4; wx < x + w - .4; wx += .9) { const on = R() < S.lit * .55; c.fillStyle = on ? `rgba(255,${200 + R() * 40 | 0},${130 + R() * 70 | 0},${.6 + R() * .4})` : (T === 'day' || T === 'morning') ? `rgba(220,235,250,${.12 + R() * .12})` : 'rgba(0,0,0,0)'; c.fillRect(wx, y, .5, .55); } });
        if (lit) { blur(c, 1.2 * ppu); c.fillStyle = 'rgba(255,190,120,.16)'; c.fillRect(W0, FL, W1 - W0, HZ - FL + 6); blur(c, 0); }
        c.fillStyle = '#121214'; for (let x = XL; x <= XR; x += 15) c.fillRect(x - .35, FL, .7, Y1 - FL); c.fillRect(W0, FL, W1 - W0, 1.4); c.fillRect(W0, Y1 - 1.6, W1 - W0, 1.6);   // mullions, sill, head
        c.fillStyle = 'rgba(255,255,255,.05)'; for (let x = XL; x < XR; x += 15) { c.beginPath(); c.moveTo(x + 2, Y1); c.lineTo(x + 6, Y1); c.lineTo(x + 1, FL); c.lineTo(x - 3, FL); c.fill(); }   // reflections on the glass
      },
      left: (c, ppu) => { c.fillStyle = '#1a120c'; c.fillRect(-ZF - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4); const R = rng(23);
        for (let x = -ZF; x < -ZB; x += 6) { c.fillStyle = `rgba(${70 + (x * 13 % 20)},${44},${26},.6)`; c.fillRect(x, FL, 5.8, Y1 - FL); }   // walnut panels
        const B0 = 6, B1 = 48;   // the bar's shelves, lit from behind
        c.fillStyle = rad(c, (B0 + B1) / 2, 8, 30, [[0, '#d8a868'], [1, '#3a2414']]); c.fillRect(B0, FL + 10, B1 - B0, 24);
        [FL + 10, FL + 18, FL + 26].forEach(y => { c.fillStyle = '#c8a050'; c.fillRect(B0, y, B1 - B0, .4); for (let x = B0 + .6; x < B1 - 1;) { const w = .9 + R() * .7, h = 3.4 + R() * 3; c.fillStyle = ['rgba(120,60,20,.85)', 'rgba(40,80,40,.85)', 'rgba(230,220,200,.7)', 'rgba(160,40,40,.85)', 'rgba(200,150,60,.8)'][R() * 5 | 0]; c.fillRect(x, y + .4, w, h); c.fillRect(x + w * .3, y + .4 + h, w * .4, 1.4); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + w * .15, y + 1, w * .15, h * .7); x += w + .25; } });
        c.fillStyle = '#0e0a08'; c.fillRect(B0 - 2, FL, B1 - B0 + 4, 10); c.fillStyle = '#c8a050'; c.fillRect(B0 - 2, FL + 9.6, B1 - B0 + 4, .5); },   // the bar counter
      right: (c) => { c.fillStyle = '#16141a'; c.fillRect(ZB - 2, FL - 2, ZF - ZB + 4, Y1 - FL + 4);
        for (let x = ZB; x < -10; x += .6) { const k = .5 + .5 * Math.sin(x * 1.9); c.fillStyle = `rgb(${20 + k * 26 | 0},${38 + k * 30 | 0},${46 + k * 30 | 0})`; c.fillRect(x, FL, .62, Y1 - FL); }   // teal velvet drapes
        c.fillStyle = '#8a6a2a'; c.fillRect(2, 2, 24, 16); c.fillStyle = '#1e1e24'; c.fillRect(3, 3, 22, 14); c.fillStyle = '#c86a3a'; ell(c, 10, 9, 4, 4); c.fillStyle = '#2a4a6a'; c.fillRect(15, 5, 7, 10); c.fillStyle = 'rgba(240,220,180,.8)'; c.fillRect(5, 13, 16, .5); },
      ceil: (c) => { c.fillStyle = '#0c0a0a'; c.fillRect(XL - 2, ZB - 2, XR - XL + 4, ZF - ZB + 4); for (let x = XL + 10; x < XR; x += 20) for (let z = ZB + 10; z < ZF; z += 20) { c.fillStyle = rad(c, x, z, 4, [[0, 'rgba(255,230,190,1)'], [.25, 'rgba(255,210,160,.5)'], [1, 'rgba(255,200,150,0)']]); c.fillRect(x - 4, z - 4, 8, 8); } },
    });
    { const rugT = canvasTex('tbl9-rug', sz(o, 512), sz(o, 384), (c, W, H) => { c.fillStyle = '#2a2a30'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(200,170,110,.5)'; c.lineWidth = W / 120; c.strokeRect(W * .05, H * .07, W * .9, H * .86); const img = c.getImageData(0, 0, W, H), d = img.data; for (let p = 0; p < d.length; p += 4) { const k = (Math.random() - .5) * 14; d[p] += k; d[p + 1] += k; d[p + 2] += k; } c.putImageData(img, 0, 0); });
      at(g, new TT.Mesh(RB(54, .3, 40, .1, 1), M({ map: rugT, roughness: .95, bumpScale: .01 })), 0, FL + .15, Z0 + 2, 0, false); ao(o, 0, FL + .3, Z0, 34, 26, .5); }
    // two velvet club chairs across the table
    const velvet = M({ map: X.cloth('tbl9-velvet', '#2a4a50', 18, 256), roughness: .85, sheen: new TT.Color(0x8ab8c0) });
    [-8, 8].forEach((x, i) => { const G = grp(TT, g, x, FL, -16, (i ? -1 : 1) * .12);
      at(G, new TT.Mesh(RB(10, 5, 9, 1.6, 3), velvet), 0, 4.6, 0); at(G, new TT.Mesh(RB(8, 2, 7.4, .9, 3), velvet), 0, 8, .6);
      at(G, new TT.Mesh(RB(10.4, 9, 2.6, 1.3, 3), velvet), 0, 11, -3.6); [-1, 1].forEach(s => at(G, new TT.Mesh(RB(2, 6.4, 9, 1, 3), velvet), s * 4.6, 9.4, 0));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => at(G, new TT.Mesh(new TT.CylinderGeometry(.3, .2, 2.2, 8), brass), a * 4, 1.1, b * 3.6)); ao(o, x, FL, -16, 13, 12, .5); });
    // the table of the hour: coffee and a cake by day, cocktails after dark
    const crystal = M({ color: 0xffffff, roughness: .02, clearcoat: 1, transparent: true, opacity: .3, depthWrite: false });
    const martini = (x, z) => { const G = grp(TT, g, x, 0, z); at(G, lathe(TT, [[0, 0], [1, 0], [1.02, .06], [.1, .14], [.08, 2.6], [1.8, 4.4], [1.76, 4.42], [0, 2.7]], SEG(o, 24), crystal), 0, 0, 0, 0, false);
      at(G, lathe(TT, [[0, 2.72], [1.5, 4.1], [0, 4.1]], SEG(o, 24), M({ color: 0xe8ecd8, roughness: .05, clearcoat: 1, transparent: true, opacity: .55, depthWrite: false })), 0, 0, 0, 0, false);
      const pk = new TT.Mesh(new TT.CylinderGeometry(.04, .04, 3.6, 4), M({ color: 0x2a2a2a })); pk.rotation.z = .6; at(G, pk, .5, 4, 0, 0, false); at(G, new TT.Mesh(new TT.SphereGeometry(.32, 10, 8), M({ color: 0x5a7a2a, roughness: .3, clearcoat: .5 })), .1, 3.5, 0); return G; };
    const coaster = (x, z) => at(g, new TT.Mesh(new TT.CylinderGeometry(1.3, 1.3, .1, 20), M({ color: 0x1a1a1c, roughness: .6 })), x, .05, z, 0, false);
    if (lit) {
      coaster(-10.4, -3); martini(-10.4, -3); coaster(10.6, 3.6);
      { const Gr = tumbler(o, g, 10.6, 3.6, [0x9a4e10, .4], 2.3, 1); Gr.position.y = .1; at(Gr, new TT.Mesh(new TT.SphereGeometry(.75, 16, 12), M({ color: 0xffffff, roughness: .05, clearcoat: 1, transparent: true, opacity: .55, depthWrite: false })), 0, 1.3, 0, 0, false); }
      { const Gs = grp(TT, g, -11.6, 0, -7.6), steel = M({ color: 0xd8dadc, metalness: 1, roughness: .16 }); at(Gs, lathe(TT, [[0, 0], [1, 0], [1.1, .2], [1.25, 4], [.9, 4.8], [.95, 5.6], [.5, 6.2], [.3, 6.8], [0, 6.8]], SEG(o, 24), steel), 0, 0, 0); }
      { const Gv = grp(TT, g, 6, 0, -9); at(Gv, lathe(TT, [[0, 0], [1.1, 0], [1.2, 2.4], [1.12, 2.4], [1.02, .2], [0, .2]], SEG(o, 20), M({ color: 0xc87a2a, roughness: .05, clearcoat: 1, transparent: true, opacity: .6, depthWrite: false })), 0, 0, 0, 0, false);
        at(Gv, new TT.Mesh(new TT.CylinderGeometry(.85, .85, 1.2, 16), M({ color: 0xf4ecdc, roughness: .6, emissive: new TT.Color(0x3a2008) })), 0, .8, 0, 0, false); const f = new TT.Mesh(new TT.SphereGeometry(.12, 8, 6), new TT.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false })); f.scale.set(1, 2.2, 1); at(Gv, f, 0, 1.75, 0, 0, false); halo(o, Gv, 0, 1.8, 0, 6); const L = new TT.PointLight(0xffb060, .6, 20, 2); L.position.set(0, 2.2, 0); Gv.add(L); }
      { const Gb = grp(TT, g, 11.4, 0, -6.4); at(Gb, lathe(TT, [[0, 0], [.9, 0], [1.6, .7], [1.7, 1.1], [1.55, 1.1], [1.4, .6], [0, .45]], SEG(o, 24), brass), 0, 0, 0); const nut = M({ color: 0xc8965a, roughness: .55 }); for (let i = 0; i < 18; i++) { const a = i * 2.39, r = Math.sqrt(i / 18) * 1.2; const m = new TT.Mesh(new TT.SphereGeometry(.24, 6, 4), nut); m.scale.set(1.3, .7, .9); at(Gb, m, Math.cos(a) * r, .7 + (1 - r / 1.2) * .25, Math.sin(a) * r, 0, false); } }
    } else {
      const china = M({ color: 0xf6f3ee, roughness: .25, clearcoat: .6 });
      cupSaucer(o, g, -10.4, -3, .5, china); cupSaucer(o, g, 10.6, 3.6, -2.5, china);
      { const Gk = grp(TT, g, 11.2, 0, -6.4); plate(o, Gk, 0, 0, 2.4, china); const sh = new TT.Shape(); sh.moveTo(0, 0); sh.lineTo(2.2, -.75); sh.absarc(0, 0, 2.32, -.33, .33, false); sh.lineTo(0, 0);
        [[.6, 0xf4e8d0], [.25, 0x7a2a2a], [.5, 0xf4e8d0]].reduce((y, [h, col]) => { const m = new TT.Mesh(new TT.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }), M({ color: col, roughness: .7 })); m.rotation.x = -Math.PI / 2; at(Gk, m, -1, y, 0); return y + h; }, .14);
        at(Gk, new TT.Mesh(new TT.SphereGeometry(.32, 10, 8), M({ color: 0xc8283a, roughness: .25, clearcoat: .8 })), .4, 1.7, 0); }
      { const Gw = tumbler(o, g, -11.6, -7.4, [0xeef4f4, .75], 3, .78); ice(o, Gw, 0, 1.4, 0, 2); const sl = new TT.Mesh(new TT.CylinderGeometry(.6, .6, .1, 14, 1, false, 0, Math.PI), M({ color: 0xd8e84a, roughness: .5 })); sl.rotation.set(Math.PI / 2, 0, .2); at(Gw, sl, .7, 3, 0, 0, false); }
      { const mn = canvasTex('tbl9-menu', 128, 180, (c, W, H) => { c.fillStyle = '#14141a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c8a050'; c.lineWidth = 2; c.strokeRect(8, 8, W - 16, H - 16); c.fillStyle = '#c8a050'; c.fillRect(W / 2 - 22, 26, 44, 4); for (let y = 50; y < H - 24; y += 14) { c.fillRect(22, y, 50 + (y % 3) * 8, 2); c.fillRect(W - 34, y, 12, 2); } });
        const card = new TT.Mesh(RB(3, 4.2, .08, .02, 1), [M({ color: 0x14141a }), M({ color: 0x14141a }), M({ color: 0x14141a }), M({ color: 0x14141a }), M({ map: mn, roughness: .6, bump: false }), M({ map: mn, roughness: .6, bump: false })]); card.rotation.x = -.2; at(g, card, 6, 2, -9.6, .2); }
    }
    // the lights: the window's daylight (or the city's glow) from the back, warm downlights over the table
    scene.add(new TT.HemisphereLight(T === 'day' || T === 'morning' ? 0xe8f0fa : night ? 0x404a70 : 0xd8b0a8, 0x1a1210, T === 'day' || T === 'morning' ? .5 : .3));
    const key = new TT.DirectionalLight(T === 'day' || T === 'morning' ? 0xf4f6ff : T === 'evening' ? 0xffb080 : 0x8090c0, T === 'day' || T === 'morning' ? 1.1 : T === 'evening' ? .8 : .3); key.position.set(-8, 22, -40); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); key.shadow.bias = -.0004; scene.add(key);
    const down = new TT.SpotLight(0xffd8a8, lit ? 2.6 : 1.2, 70, .55, .8, 1.1); down.position.set(0, Y1 - 1, Z0 + 2); down.target.position.set(0, 0, Z0); scene.add(down); scene.add(down.target);
    const bar = new TT.PointLight(0xffb070, .5, 80, 2); bar.position.set(XL + 6, 4, -24); scene.add(bar);
    try { X.mergeStatic(g); } catch (e) {}
    return { bg: S.sky[1], exp: lit ? .98 : .8, board: lit ? .46 : .28, boardCol: lit ? 0xffe4c4 : undefined, key, env: { top: '#3a3036', bottom: '#0a0808', panels: [[0, 10, -30, 40, 14, T === 'day' || T === 'morning' ? '#ffffff' : night ? '#4a5a90' : '#ff9a70', T === 'day' || T === 'morning' ? 1.6 : .7], [0, 20, 2, 6, 6, '#ffd8a8', 3], [-24, 4, -6, 6, 8, '#ffb070', .8], [0, 8, 18, 20, 5, '#6a5040', .6]] } };
  };
  TABLES[9].plain = { sun: 0xffe8cc, sunI: .76, hemi: [0xe8e4ec, 0x2a2018, .46], exp: .66 };
  TABLES[9].floor = (o) => ({ img: nero(o).image, w: 24, h: 24, dark: true, over: 'radial-gradient(60% 58% at 50% 44%, rgba(255,230,200,.12), transparent 75%), radial-gradient(125% 115% at 50% 46%, transparent 50%, rgba(0,0,0,.5))' });
  TABLES[5].floor = (o) => ({ img: leatherFloor(o).image, w: 24, h: 18, dark: true,
    over: 'radial-gradient(80% 70% at 20% 10%, rgba(255,196,120,.20), transparent 62%), radial-gradient(130% 120% at 50% 46%, transparent 52%, rgba(4,8,5,.55))' });
})();
