/* =====================================================================
   World Board Game Atlas — the places (table designs) of the 3D room
   Registers Table3D.TABLES[k] (k = 1..5; 0 is the toy room's chabudai in table3d.js):
     1 2D準拠      no room: the game's own 2D page background (its CSS layers, behind a transparent canvas), the board floats over a soft shadow
     2 木のダイニング  light oak dining table, a blurred white wall with a house plant, soft daylight
     3 緑のフェルト    deep green felt in a walnut rail, one overhead spotlight, dark club room
     4 大理石のテラス  white marble top, an evening sky over the sea, balustrade silhouettes
     5 夜の書斎      walnut desk with a leather desk mat, a banker's lamp, a blurred bookshelf behind
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
      ja: ['ちゃぶ台', '2D準拠', 'ダイニング', 'フェルト卓', 'テラス', '書斎'],
      en: ['Chabudai', 'Like 2D', 'Dining table', 'Green felt', 'Terrace', 'Study'],
      zh: ['矮桌', '2D风格', '餐桌', '绿色绒布', '露台', '书房'],
      ko: ['밥상', '2D 스타일', '식탁', '초록 펠트', '테라스', '서재'],
      es: ['Mesa baja', 'Como en 2D', 'Comedor', 'Tapete verde', 'Terraza', 'Estudio'],
      fr: ['Table basse', 'Comme en 2D', 'Salle à manger', 'Tapis vert', 'Terrasse', 'Bureau'],
      pt: ['Mesa baixa', 'Como no 2D', 'Sala de jantar', 'Feltro verde', 'Terraço', 'Escritório'],
      de: ['Teetisch', 'Wie in 2D', 'Esstisch', 'Grüner Filz', 'Terrasse', 'Lesezimmer'],
      hi: ['चाबुदाई', '2D जैसा', 'डाइनिंग टेबल', 'हरा फ़ेल्ट', 'टैरेस', 'स्टडी रूम'],
      ar: ['طاولة واطئة', 'كما في 2D', 'طاولة الطعام', 'اللباد الأخضر', 'الشرفة', 'المكتب'],
    },
    go: {
      ja: ['ちゃぶ台へ', '盤へ', 'ダイニングへ', 'フェルト卓へ', 'テラスへ', '書斎へ'],
      en: ['To the table', 'To the board', 'To the dining table', 'To the felt table', 'To the terrace', 'To the study'],
      zh: ['前往棋桌', '前往棋盘', '前往餐桌', '前往牌桌', '前往露台', '前往书房'],
      ko: ['판으로 가기', '보드로 가기', '식탁으로 가기', '펠트 테이블로 가기', '테라스로 가기', '서재로 가기'],
      es: ['Ir a la mesa', 'Ir al tablero', 'Ir al comedor', 'Ir al tapete', 'Ir a la terraza', 'Ir al estudio'],
      fr: ['Vers la table', 'Vers le plateau', 'Vers la salle à manger', 'Vers le tapis vert', 'Vers la terrasse', 'Vers le bureau'],
      pt: ['Ir para a mesa', 'Ir para o tabuleiro', 'Ir para a sala de jantar', 'Ir para o feltro', 'Ir para o terraço', 'Ir para o escritório'],
      de: ['Zum Tisch', 'Zum Brett', 'Zum Esstisch', 'Zum Filztisch', 'Auf die Terrasse', 'Ins Lesezimmer'],
      hi: ['बोर्ड पर चलें', 'बोर्ड पर चलें', 'डाइनिंग टेबल पर चलें', 'फ़ेल्ट टेबल पर चलें', 'टैरेस पर चलें', 'स्टडी रूम में चलें'],
      ar: ['إلى الطاولة', 'إلى اللوحة', 'إلى طاولة الطعام', 'إلى طاولة اللباد', 'إلى الشرفة', 'إلى المكتب'],
    },
    play: {
      ja: ['ちゃぶ台で遊ぶ', '盤で遊ぶ', 'ダイニングで遊ぶ', 'フェルト卓で遊ぶ', 'テラスで遊ぶ', '書斎で遊ぶ'],
      en: ['Play on the table', 'Play on the board', 'Play at the dining table', 'Play on the felt', 'Play on the terrace', 'Play in the study'],
      zh: ['在矮桌上玩', '在棋盘上玩', '在餐桌上玩', '在牌桌上玩', '在露台上玩', '在书房里玩'],
      ko: ['밥상에서 플레이', '보드에서 플레이', '식탁에서 플레이', '펠트 테이블에서 플레이', '테라스에서 플레이', '서재에서 플레이'],
      es: ['Jugar en la mesa', 'Jugar en el tablero', 'Jugar en el comedor', 'Jugar en el tapete', 'Jugar en la terraza', 'Jugar en el estudio'],
      fr: ['Jouer sur la table', 'Jouer sur le plateau', 'Jouer dans la salle à manger', 'Jouer sur le tapis vert', 'Jouer sur la terrasse', 'Jouer au bureau'],
      pt: ['Jogar na mesa', 'Jogar no tabuleiro', 'Jogar na sala de jantar', 'Jogar no feltro', 'Jogar no terraço', 'Jogar no escritório'],
      de: ['Am Tisch spielen', 'Am Brett spielen', 'Am Esstisch spielen', 'Am Filztisch spielen', 'Auf der Terrasse spielen', 'Im Lesezimmer spielen'],
      hi: ['मेज़ पर खेलें', 'बोर्ड पर खेलें', 'डाइनिंग टेबल पर खेलें', 'फ़ेल्ट टेबल पर खेलें', 'टैरेस पर खेलें', 'स्टडी रूम में खेलें'],
      ar: ['العب على الطاولة', 'العب على اللوحة', 'العب على طاولة الطعام', 'العب على طاولة اللباد', 'العب في الشرفة', 'العب في المكتب'],
    },
    // the updates list (shared/atlas.js) says ちゃぶ台 / chabudai for the portal's own 3D play: the word that replaces it
    news: {
      ja: ['ちゃぶ台', '盤', 'ダイニング', 'フェルト卓', 'テラス', '書斎'],
      en: ['chabudai', 'table', 'table', 'table', 'table', 'table'],
      hi: ['चाबुदाई', 'मेज़', 'मेज़', 'मेज़', 'मेज़', 'मेज़'],
    },
    ui: {
      place: { ja: '場所', en: 'Place', zh: '场所', ko: '장소', es: 'Lugar', fr: 'Lieu', pt: 'Local', de: 'Ort', hi: 'जगह', ar: 'المكان' },
      table: { ja: 'テーブル', en: 'Table', zh: '桌子', ko: '테이블', es: 'Mesa', fr: 'Table', pt: 'Mesa', de: 'Tisch', hi: 'टेबल', ar: 'الطاولة' },
      bright: { ja: '明るさ', en: 'Brightness', zh: '亮度', ko: '밝기', es: 'Brillo', fr: 'Luminosité', pt: 'Brilho', de: 'Helligkeit', hi: 'रोशनी', ar: 'السطوع' },
      b: { ja: ['標準', '明るい', 'とても明るい'], en: ['Normal', 'Bright', 'Very bright'], zh: ['标准', '明亮', '非常明亮'], ko: ['보통', '밝게', '아주 밝게'],
        es: ['Normal', 'Claro', 'Muy claro'], fr: ['Normal', 'Clair', 'Très clair'], pt: ['Normal', 'Claro', 'Muito claro'], de: ['Normal', 'Hell', 'Sehr hell'],
        hi: ['सामान्य', 'तेज़', 'बहुत तेज़'], ar: ['عادي', 'ساطع', 'ساطع جدًا'] },
    },
  };
  const pick = (o, l) => o[l] || o.en;
  X.PLACES = PLACES;
  X.placeText = (kind, lang, k = X.table()) => { const o = kind === 'news' ? PLACES.news[lang] : pick(PLACES[kind], lang); return o ? o[k] ?? o[0] : ''; };
  X.placeUi = (key, lang) => pick(PLACES.ui[key], lang);
  // the thumbnails (small real renders, atlas/img/place-k.webp), next to this script whichever page loads it
  const ME = (document.currentScript && document.currentScript.src) || location.href;
  X.placeThumb = k => new URL('img/place-' + k + '.webp?v=1', ME).href;

  // painted backdrop: plane coords x ∈ [−w/2, w/2], v ∈ [−h/2, h/2] (v up); the table's back edge hides v < ~9..12
  function backdrop(o, key, draw, opt = {}) {
    const TT = o.TT, w = opt.w || 110, h = opt.h || 76, D = opt.D || 60, W = Math.round((opt.px || 1024) * Math.max(.5, o.texScale)), H = Math.round(W * h / w);
    // blur(c, px) starts a layer: what follows is drawn sharp on its own canvas and composited with ONE blur when the next
    // layer starts (a canvas filter on every small shape blurs a full-size layer per shape: minutes on a phone)
    const run = (main, fn) => {
      let layer = null, lpx = 0, target = main;
      const setup = (cx) => { cx.setTransform(1, 0, 0, 1, 0, 0); cx.translate(W / 2, H / 2); cx.scale(W / w, -H / h); };
      const flush = () => { if (!layer) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.filter = `blur(${lpx}px)`; main.drawImage(layer.canvas, 0, 0); main.restore(); layer = null; target = main; };
      const P = new Proxy({}, {
        get: (_, k) => { if (k === '__blur') return (px) => { flush(); if (px > .3) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; layer = cv.getContext('2d'); lpx = px; setup(layer); target = layer; } };
          const v = target[k]; return typeof v === 'function' ? v.bind(target) : v; },
        set: (_, k, v) => { target[k] = v; return true; },
      });
      main.save(); setup(main); fn(P, W / w); flush(); main.restore();
    };
    const tex = canvasTex(key, W, H, (c) => run(c, draw));
    const m = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ map: tex, toneMapped: false, depthWrite: false }));
    m.position.set(0, -D * Math.sin(PITCH), -D * Math.cos(PITCH)); m.rotation.x = -PITCH; m.renderOrder = -1; o.g.add(m);
    m.userData.repaint = (fn) => { const c = tex.image.getContext('2d'); c.clearRect(0, 0, W, H); run(c, fn); tex.needsUpdate = true; };
    return m;
  }
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
    lux: { ja: '高級3D', en: 'Luxury 3D', zh: '豪华3D', ko: '고급 3D', es: 'Lujo 3D', fr: 'Luxe 3D', pt: 'Luxo 3D', de: 'Luxus 3D', hi: 'लक्ज़री 3D', ar: 'فاخر ثلاثي' },
    wood: { ja: '木製3D', en: 'Wooden 3D', zh: '木制3D', ko: '목재 3D', es: 'Madera 3D', fr: 'Bois 3D', pt: 'Madeira 3D', de: 'Holz 3D', hi: 'लकड़ी 3D', ar: 'خشبي ثلاثي' },
    kaya: { ja: '榧3D', en: 'Kaya 3D', zh: '榧木3D', ko: '비자 3D', es: 'Kaya 3D', fr: 'Kaya 3D', pt: 'Kaya 3D', de: 'Kaya 3D', hi: 'काया 3D', ar: 'كايا ثلاثي' },
    lacquer: { ja: '漆・沈金3D', en: 'Lacquer 3D', zh: '漆金3D', ko: '옻칠 3D', es: 'Laca 3D', fr: 'Laque 3D', pt: 'Laca 3D', de: 'Lack 3D', hi: 'लाख 3D', ar: 'ورنيش ثلاثي' },
    marq: { ja: '寄木細工 3D', en: 'Marquetry 3D', zh: '镶嵌木 3D', ko: '상감 목재 3D', es: 'Marquetería 3D', fr: 'Marqueterie 3D', pt: 'Marchetaria 3D', de: 'Intarsie 3D', hi: 'मार्केट्री 3D', ar: 'تطعيم خشبي ثلاثي' },
    scarlet: { ja: 'レザー 3D', en: 'Leather 3D', zh: '皮革 3D', ko: '가죽 3D', es: 'Cuero 3D', fr: 'Cuir 3D', pt: 'Couro 3D', de: 'Leder 3D', hi: 'लेदर 3D', ar: 'جلد ثلاثي' },
    victorian: { ja: '3D ヴィクトリア盤', en: '3D Victorian board', zh: '3D 维多利亚盘', ko: '3D 빅토리아 판', es: 'Tablero victoriano 3D', fr: 'Plateau victorien 3D', pt: 'Tabuleiro vitoriano 3D', de: 'Viktorianisches Brett 3D', hi: '3D विक्टोरियन बोर्ड', ar: 'رقعة فيكتورية ثلاثية الأبعاد' },
    folk: { ja: '3D 民藝盤', en: '3D folk-art board', zh: '3D 民间彩绘盘', ko: '3D 민예 판', es: 'Tablero folk 3D', fr: 'Plateau folk 3D', pt: 'Tabuleiro folk 3D', de: 'Volkskunst-Brett 3D', hi: '3D लोक-कला बोर्ड', ar: 'رقعة شعبية ثلاثية الأبعاد' },
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
  };
  X.BOARDS = BOARDS;
  X.boardName = (k, lang) => { const o = N3[k]; return o ? o[lang] || o.en : k; };
  X.boardThumb = (id, k) => new URL('img/board-' + id + '-' + k + '.webp?v=1', ME).href;
  // choose a board for a game: the shared key is written and the showcase board (if it is that game's) is rebuilt at once
  X.setBoard = (id, k) => { const B = BOARDS[id]; if (!B || !B.list.includes(k)) return; B.set(k); try { dispatchEvent(new CustomEvent('atlas-board', { detail: { id, look: k } })); } catch (e) {} };
  PLACES.ui.board = { ja: '盤', en: 'Board', zh: '棋盘', ko: '판', es: 'Tablero', fr: 'Plateau', pt: 'Tabuleiro', de: 'Brett', hi: 'बोर्ड', ar: 'اللوحة' };

  /* ---------- 1 · 2D準拠: each game's own 2D page background ---------- */
  // the CSS layers that the game's 2D page (<game>/index.html) paints on its body, read from the rendered pages: [color, image layers]
  // (the canvas stays transparent and its container carries them — the very same gradients, at no texture cost)
  const BG2D = {
    chess: ["#0b0a09", "radial-gradient(1200px 700px at 28% -10%, #2a2016, transparent 60%), radial-gradient(900px 600px at 110% 110%, #1c1712, transparent 60%)"],
    shogi: ["#130d09", "radial-gradient(1200px 700px at 30% -10%, #34230f, transparent 60%), radial-gradient(900px 600px at 110% 110%, #281a0d, transparent 60%)"],
    go: ["#0b0e15", "radial-gradient(1100px 700px at 25% -10%, #1d2740, transparent 60%), radial-gradient(900px 600px at 110% 110%, #1a1f33, transparent 60%)"],
    reversi: ["#0b1110", "radial-gradient(1200px 700px at 30% -10%, #1b2b26, transparent 60%), radial-gradient(900px 600px at 110% 110%, #16231f, transparent 60%)"],
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
    ur: ["#080d26", "radial-gradient(1100px 620px at 18% -12%, rgba(42, 63, 158, 0.55), transparent 62%), radial-gradient(900px 600px at 110% 115%, rgba(142, 42, 28, 0.28), transparent 60%), radial-gradient(1px 1px at 12% 22%, rgba(255, 240, 200, 0.6), transparent), radial-gradient(1px 1px at 78% 12%, rgba(255, 240, 200, 0.5), transparent), radial-gradient(1.4px 1.4px at 64% 30%, rgba(255, 240, 200, 0.45), transparent), radial-gradient(1px 1px at 36% 8%, rgba(255, 240, 200, 0.5), transparent)"],
    agon: ["#0e0907", "radial-gradient(1200px 700px at 28% -10%, #3a1d12, transparent 60%), radial-gradient(900px 600px at 110% 110%, #24120b, transparent 60%)"],
    konane: ["#0c0806", "radial-gradient(1200px 700px at 28% -10%, #3a1a0c, transparent 60%), radial-gradient(900px 600px at 110% 110%, #0b3a36, transparent 60%)"],
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

  /* ---------- 2 · 木のダイニング: light oak, white wall, a plant, daylight ---------- */
  const oak = o => X.planks('tbl2-oak', '#d6b284', '#9a6c40', 5, sz(o, 2048));
  TABLES[2] = (o) => {
    const { TT, g, scene } = o;
    const pk = oak(o);
    const top = M({ map: pk, roughness: .52, clearcoat: .2, clearcoatRoughness: .45, bumpScale: .0025 });
    const t = new TT.Mesh(RB(46, 1.6, 36, .55, 3), top); t.position.set(0, -.8, 5); t.receiveShadow = true; g.add(t);
    // a stoneware mug and a little bud vase at the far corners
    const mugM = M({ color: 0xe9e4da, roughness: .38, clearcoat: .4 }), inM = M({ color: 0x3a2214, roughness: .2 });
    const mugP = [[0, 0], [.95, 0], [1.05, .1], [1.1, 1.8], [1.02, 1.82], [.95, .2], [0, .2]].map(([x, y]) => new TT.Vector2(x, y));
    const mug = new TT.Mesh(new TT.LatheGeometry(mugP, 28), mugM); mug.position.set(-12.5, 0, -7.5); mug.castShadow = mug.receiveShadow = true; g.add(mug);
    const cof = new TT.Mesh(new TT.CircleGeometry(.96, 24), inM); cof.rotation.x = -Math.PI / 2; cof.position.set(-12.5, 1.45, -7.5); g.add(cof);
    const hdl = new TT.Mesh(new TT.TorusGeometry(.5, .13, 8, 16, Math.PI * 1.3), mugM); hdl.position.set(-11.35, .95, -7.5); hdl.rotation.z = -Math.PI * .65; hdl.castShadow = true; g.add(hdl);
    const vaseP = [[0, 0], [.55, 0], [.75, .5], [.7, 1.4], [.3, 2.4], [.28, 3], [.36, 3.15], [0, 3.15]].map(([x, y]) => new TT.Vector2(x, y));
    const vase = new TT.Mesh(new TT.LatheGeometry(vaseP, 24), M({ color: 0x9fb3a2, roughness: .3, clearcoat: .5 })); vase.position.set(12.5, 0, -9); vase.castShadow = true; g.add(vase);
    const twigM = M({ color: 0x6d7f4c, roughness: .7 });
    [[-.2, .25], [.25, -.15], [0, -.35]].forEach(([a, b], i) => { const s = new TT.Mesh(new TT.CylinderGeometry(.035, .05, 4.2 - i * .6, 5), twigM); s.position.set(12.5 + a * 1.8, 3.1 + (2.1 - i * .3), -9 + b * 1.4); s.rotation.set(b * .5, 0, -a * .6); s.castShadow = true; g.add(s);
      const lf = new TT.Mesh(new TT.SphereGeometry(.42, 8, 6), M({ color: 0x7e9a5a, roughness: .6 })); lf.scale.set(1, .35, .6); lf.position.set(12.5 + a * 4, 3.1 + 4.1 - i * .9, -9 + b * 3); g.add(lf); });
    // a linen runner along the far side and a wooden bowl of lemons on it
    const linen = M({ map: X.cloth('tbl2-linen', '#ece4d4', 14, sz(o, 256)), roughness: .9 });
    const run = new TT.Mesh(RB(30, .05, 5.2, .02, 1), linen); run.position.set(0, .025, -9.6); run.receiveShadow = true; g.add(run);
    const bowlP = [[0, 0], [.9, 0], [1.6, .25], [2.3, .9], [2.45, 1.2], [2.3, 1.22], [1.5, .6], [0, .45]].map(([x, y]) => new TT.Vector2(x, y));
    const bowl = new TT.Mesh(new TT.LatheGeometry(bowlP, 28), M({ map: wood('tbl2-bowl', '#b98a58', '#7a522c', sz(o, 256), sz(o, 256), .8), roughness: .45, clearcoat: .3 })); bowl.position.set(5.5, .05, -10); bowl.castShadow = bowl.receiveShadow = true; g.add(bowl);
    const lemM = M({ color: 0xf2cf3a, roughness: .42, clearcoat: .2 });
    [[4.7, -9.6, .1], [6.1, -10.4, -.4], [5.4, -10.6, .8], [6.2, -9.5, .3]].forEach(([x, z, r], i) => { const l = new TT.Mesh(new TT.SphereGeometry(.62, 14, 10), lemM); l.scale.set(1.18, .92, .92); l.rotation.y = r; l.position.set(x, .75 + (i === 3 ? .5 : 0), z); l.castShadow = true; g.add(l); });
    // the window's light falling across the table (left, from the key light's side): four soft panes, no light cost
    const sp = canvasTex('tbl2-sun', 256, 192, (c, W, H) => { c.filter = 'blur(6px)'; c.fillStyle = '#fff'; [[24, 18], [136, 18], [24, 102], [136, 102]].forEach(([x, y]) => c.fillRect(x, y, 96, 72)); c.filter = 'none'; });
    const sun = new TT.Mesh(new TT.PlaneGeometry(17, 12.75), new TT.MeshBasicMaterial({ map: sp, transparent: true, depthWrite: false, toneMapped: false, color: 0x2a2418, blending: TT.AdditiveBlending }));
    sun.rotation.x = -Math.PI / 2; sun.rotation.z = -.32; sun.position.set(-13.5, .02, 6); sun.renderOrder = 1; g.add(sun);
    // (visible: PC v 16..26 over x ±39; phone v 11..33 over x ±13 — the table hides what is below)
    backdrop(o, 'tbl2-bd', (c, ppu) => {
      const R = rng(7);
      c.fillStyle = lin(c, 40, 10, [[0, '#d9d2c6'], [1, '#f3efe8']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, -34, 26, 50, [[0, 'rgba(255,254,250,.95)'], [1, 'rgba(255,254,250,0)']]); c.fillRect(-60, -40, 120, 80);
      // window light on the wall: four soft panes
      blur(c, 1.4 * ppu); c.fillStyle = 'rgba(255,249,235,.6)';
      [[1, 19.5], [6.6, 19.5], [1, 26], [6.6, 26]].forEach(([x, y]) => { c.save(); c.translate(x, y); c.transform(1, 0, .45, 1, 0, 0); c.fillRect(0, 0, 4.8, 5.8); c.restore(); });
      // floor and skirting, far behind the table
      blur(c, .6 * ppu);
      c.fillStyle = lin(c, 14, 6, [[0, '#d6bd96'], [1, '#c2a47a']]); c.fillRect(-60, -40, 120, 54);
      c.fillStyle = '#f7f4ee'; c.fillRect(-60, 14, 120, .8);
      // a low oak sideboard on the right, with a vase of pampas and a few books
      c.fillStyle = '#d4b385'; c.fillRect(12, 14.3, 30, 6.2); c.fillStyle = '#c5a273'; c.fillRect(12, 20.2, 30, .5);
      c.fillStyle = 'rgba(90,64,40,.28)'; [19.5, 27, 34.5].forEach(x => c.fillRect(x, 14.8, .2, 5));
      c.fillStyle = '#3b3632'; c.fillRect(13, 13.6, .5, .8); c.fillRect(41, 13.6, .5, .8);
      c.fillStyle = '#ece6dc'; c.beginPath(); c.moveTo(15.4, 20.7); c.quadraticCurveTo(14.2, 23.2, 15.7, 25.3); c.lineTo(16.9, 25.3); c.quadraticCurveTo(18.4, 23.2, 17.2, 20.7); c.fill();
      c.strokeStyle = '#b89c74'; c.lineWidth = .12; for (let i = 0; i < 9; i++) { const a = -.7 + i * .17; c.beginPath(); c.moveTo(16.3, 25); c.quadraticCurveTo(16.3 + a * 3, 28, 16.3 + a * 6, 30 + R() * 2); c.stroke(); }
      c.fillStyle = 'rgba(232,214,180,.8)'; for (let i = 0; i < 9; i++) { const a = -.7 + i * .17; ell(c, 16.3 + a * 6.2, 30.6 + R() * 2, .9, 1.9, -a * .6); }
      [['#8a9a86', 1.1], ['#d9c9a8', .8], ['#b06a4c', .9]].reduce((y, [col, h]) => { c.fillStyle = col; c.fillRect(22, y, 5.2, h); return y + h; }, 20.7);
      c.fillStyle = '#efe7da'; ell(c, 31.5, 22, 1.6, 1.6); c.fillStyle = '#d8a46c'; c.fillRect(31.3, 20.7, .4, 1);   // a little globe lamp
      // a framed print above it
      c.fillStyle = '#e8e0d2'; c.fillRect(25, 22.5, 9, 11); c.fillStyle = '#c9cfbd'; c.fillRect(26, 23.5, 7, 9); c.fillStyle = '#a6b39a'; ell(c, 29.5, 28, 2.2, 2.8); c.fillStyle = '#d9a982'; ell(c, 28.3, 26, 1.1, 1.1);
      // a pendant lamp hanging over the room (phones see it)
      c.fillStyle = '#4a4744'; c.fillRect(3.93, 31, .14, 10); c.fillStyle = '#e8e2d8'; c.beginPath(); c.moveTo(1.6, 29); c.quadraticCurveTo(4, 33.4, 6.4, 29); c.fill();
      c.fillStyle = 'rgba(255,240,205,.95)'; ell(c, 4, 29, 2.4, .32);
      // two oak chairs on the far side of the table, their spindle backs just above the edge
      [[-21, 1], [19.5, -1]].forEach(([x, s]) => { c.fillStyle = '#b99064'; c.fillRect(x - 3.6, 19.2, 7.2, .9); c.fillRect(x - 3.4, 13.5, .55, 6); c.fillRect(x + 2.85, 13.5, .55, 6);
        c.fillStyle = '#c9a274'; for (let i = 0; i < 5; i++) c.fillRect(x - 2.3 + i * 1.15, 14, .32, 5.3); c.fillStyle = 'rgba(255,248,230,.35)'; c.fillRect(x - 3.6, 20, 7.2, .15); });
      // the plant: a terracotta pot and a fiddle-leaf fig
      blur(c, .45 * ppu);
      c.fillStyle = '#c98c62'; c.beginPath(); c.moveTo(-12.4, 14.2); c.lineTo(-5.6, 14.2); c.lineTo(-5.1, 19.6); c.lineTo(-12.9, 19.6); c.fill();
      c.fillStyle = '#b77a52'; c.fillRect(-13.1, 19.3, 8.2, .7); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-12.4, 14.2, 2, 5.1);
      c.strokeStyle = '#6b5638'; c.lineWidth = .32; c.beginPath(); c.moveTo(-9, 19.6); c.bezierCurveTo(-8.6, 23, -9.8, 26, -9.2, 31); c.stroke();
      c.lineWidth = .18; [[-9.1, 23, -12.5, 25.5], [-9.3, 25, -5.8, 27.4], [-9.4, 27.5, -12.2, 30.2], [-9.2, 29, -6.4, 31.4]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + x) / 2, b + .3, x, y); c.stroke(); });
      for (let i = 0; i < 34; i++) {
        const t = i / 34, y = 21 + t * 12 + (R() - .5) * 1.4, side = i % 2 ? 1 : -1, x = -9.2 + side * (1 + R() * (2.5 + 2.5 * Math.sin(t * Math.PI))), s = 1.15 + R() * .7;
        const sh = R(); c.fillStyle = `rgb(${46 + sh * 30 | 0},${88 + sh * 40 | 0},${40 + sh * 18 | 0})`;
        const ang = side * (.5 + R() * .6) + (R() - .5) * .3;
        c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, -s); c.bezierCurveTo(s * .9, -s * .6, s * .8, s * .9, 0, s * 1.15); c.bezierCurveTo(-s * .8, s * .9, -s * .9, -s * .6, 0, -s); c.fill();
        c.strokeStyle = 'rgba(190,220,150,.35)'; c.lineWidth = .07; c.beginPath(); c.moveTo(0, -s * .9); c.lineTo(0, s); c.stroke(); c.restore();
      }
      blur(c, 0);
      c.fillStyle = 'rgba(243,239,232,.12)'; c.fillRect(-60, -40, 120, 80);   // a breath of haze (depth)
    }, { px: 2048 });
    scene.add(new TT.HemisphereLight(0xf3f1ec, 0xb8976c, .36));
    const key = dirLight(TT, 0xfff1dc, 1.55, [-19, 15, -5], 16); scene.add(key);
    const fill = new TT.DirectionalLight(0xeef2ff, .22); fill.position.set(9, 10, 16); scene.add(fill);
    return { bg: '#ece6dc', exp: .72, board: .24, key, env: { top: '#f4efe6', bottom: '#b4936a', panels: [[-14, 12, -10, 14, 10, '#ffffff', 1.7], [12, 8, 10, 10, 6, '#fff3e4', .6], [0, 18, 4, 20, 6, '#ffffff', .5]] } };
  };
  TABLES[2].plain = { sun: 0xfff1dc, sunI: .74, hemi: [0xf3f1ec, 0xb8976c, .48], exp: .64 };
  TABLES[2].floor = (o) => ({ img: oak(o).image, w: 46, h: 36, over: 'radial-gradient(120% 90% at 16% 0%, rgba(255,252,240,.38), transparent 62%), radial-gradient(140% 120% at 50% 40%, transparent 60%, rgba(90,60,30,.18))' });

  /* ---------- 3 · 緑のフェルト: felt in a walnut rail, an overhead spotlight, a dark club room ---------- */
  const feltTex = o => canvasTex('tbl3-felt', sz(o, 1024), sz(o, 1024), (c, W) => {
      const N = makeNoise(31), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = (Math.random() - .5) * 16 + (N(x / 1.6, y / 1.6, 2) - .5) * 20 + (N(x / 50, y / 50, 3) - .5) * 10, i = (y * W + x) * 4;
        d[i] = 12 + k * .3; d[i + 1] = 58 + k * 1.1; d[i + 2] = 38 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
  TABLES[3] = (o) => {
    const { TT, g, scene } = o;
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
    const apron = new TT.Mesh(RB(2 * OX + .6, 3, 2 * OZ + .6, 1.2, 2), M({ color: 0x24140a, roughness: .5 })); apron.position.set(0, -1.9, cz); g.add(apron);
    // a few clay chips in stacks and a deck of cards by the far right corner (just inside the rail)
    const chipG = new TT.CylinderGeometry(.82, .82, .2, 24), chipC = [0xb8282e, 0xf1ece0, 0x24418c, 0x1f6b44];
    [[14.5, -9.4, 0, 7], [16.4, -8.6, 1, 5], [15.1, -7.4, 2, 4]].forEach(([x, z, c0, n]) => { for (let i = 0; i < n; i++) { const ch = new TT.Mesh(chipG, M({ color: chipC[(c0 + (i % 3 === 2 ? 1 : 0)) % 4], roughness: .55, clearcoat: .2 })); ch.position.set(x + (Math.sin(i * 7.1) * .05), .1 + i * .205, z + Math.cos(i * 3.3) * .05); ch.castShadow = ch.receiveShadow = true; g.add(ch); } });
    const back = canvasTex('tbl3-card', 128, 180, (c, W, H) => { c.fillStyle = '#f6f2e8'; c.fillRect(0, 0, W, H); c.fillStyle = '#8f1e2a'; c.fillRect(8, 8, W - 16, H - 16); c.strokeStyle = 'rgba(255,230,200,.6)'; c.lineWidth = 2; for (let i = -H; i < W + H; i += 10) { c.beginPath(); c.moveTo(i, 8); c.lineTo(i + H, H); c.stroke(); } c.strokeStyle = '#f6f2e8'; c.lineWidth = 3; c.strokeRect(14, 14, W - 28, H - 28); });
    const deck = new TT.Mesh(RB(2.5, .5, 3.5, .1, 2), [M({ color: 0xe9e3d4, roughness: .8 }), M({ color: 0xe9e3d4, roughness: .8 }), M({ map: back, roughness: .5, clearcoat: .2 }), M({ color: 0xe9e3d4, roughness: .8 }), M({ color: 0xe9e3d4, roughness: .8 }), M({ color: 0xe9e3d4, roughness: .8 })]);
    deck.position.set(-15.6, .25, -8.8); deck.rotation.y = .28; deck.castShadow = deck.receiveShadow = true; g.add(deck);
    backdrop(o, 'tbl3-bd', (c, ppu) => {
      const R = rng(11);
      c.fillStyle = '#060607'; c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, 0, 16, 40, [[0, '#1d1a14'], [1, 'rgba(10,10,10,0)']]); c.fillRect(-60, -40, 120, 80);
      // the far wall: dark panelling, picked out by a few warm sconces; out-of-focus lights as bokeh
      c.fillStyle = 'rgba(40,30,20,.5)'; for (let x = -54; x < 56; x += 9) c.fillRect(x, 10, .25, 30);
      blur(c, 1.5 * ppu);
      [[-26, 22], [26, 22], [-8, 24], [9, 24]].forEach(([x, y]) => { c.fillStyle = rad(c, x, y, 7, [[0, 'rgba(255,190,110,.55)'], [.15, 'rgba(255,170,90,.25)'], [1, 'rgba(255,150,80,0)']]); c.fillRect(x - 8, y - 8, 16, 16); });
      for (let i = 0; i < 26; i++) {
        const x = (R() - .5) * 100, y = 12 + R() * 24, r = .5 + R() * 1.4, warm = R() > .25;
        c.fillStyle = warm ? `rgba(255,${190 + R() * 40 | 0},120,${.08 + R() * .16})` : `rgba(120,200,190,${.06 + R() * .1})`; ell(c, x, y, r, r);
      }
      // a gilt frame on the far wall and a brass rail along the panelling
      c.fillStyle = 'rgba(190,150,80,.35)'; c.fillRect(-6, 25, 12, 9); c.fillStyle = 'rgba(40,30,22,.9)'; c.fillRect(-5.2, 25.8, 10.4, 7.4); c.fillStyle = 'rgba(120,90,60,.35)'; ell(c, -1, 29.4, 3.4, 2.2);
      c.fillStyle = 'rgba(200,160,90,.28)'; c.fillRect(-60, 18.2, 120, .35);
      // a neighbouring table's lamp glow, far left
      c.fillStyle = rad(c, -40, 14, 14, [[0, 'rgba(70,140,90,.22)'], [1, 'rgba(70,140,90,0)']]); c.fillRect(-60, 0, 40, 30);
      blur(c, 0);
    });
    scene.add(new TT.HemisphereLight(0x8a96a8, 0x0a0a0a, .1));
    const key = new TT.SpotLight(0xfff0d4, 4.4, 90, .3, .85, 1.1); key.position.set(0, 36, 3); key.target.position.set(0, 0, 0); scene.add(key); scene.add(key.target);
    key.shadow.camera.near = 10; key.shadow.camera.far = 60; key.shadow.bias = -.0002;
    const rim = new TT.DirectionalLight(0xffd7a0, .18); rim.position.set(-12, 8, -18); scene.add(rim);
    return { bg: '#060607', exp: .95, board: .34, boardCol: 0xfff0dc, key, env: { top: '#2b2620', bottom: '#040404', panels: [[0, 22, 3, 12, 12, '#fff0d8', 4], [-16, 8, -10, 5, 9, '#ffcf96', .9], [16, 8, -10, 5, 9, '#ffcf96', .7], [0, 9, 20, 22, 5, '#d8c8b0', .55], [-18, 6, 8, 5, 8, '#ffe2b8', .5]] } };
  };

  TABLES[3].plain = { sun: 0xfff0d4, sunI: .8, hemi: [0xc8d4c8, 0x203020, .42], exp: .66 };
  TABLES[3].floor = (o) => ({ img: feltTex(o).image, w: 15, h: 15, dark: true,
    over: 'radial-gradient(60% 58% at 50% 44%, rgba(255,240,210,.14), transparent 75%), radial-gradient(125% 115% at 50% 46%, transparent 48%, rgba(0,0,0,.58))' });

  /* ---------- 4 · 大理石のテラス: white marble, an evening sky over the sea, a balustrade ---------- */
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
  TABLES[4] = (o) => {
    const { TT, g, scene } = o;
    const mt = marbleTex(o);
    const marble = M({ map: mt, bump: false, roughness: .3, clearcoat: .35, clearcoatRoughness: .2 });
    const t = new TT.Mesh(RB(46, 1.4, 36, .5, 3), marble); t.position.set(0, -.7, 5); t.receiveShadow = true; g.add(t);
    // a glass of lemonade with a slice on the rim (back left) and a small terracotta pot of rosemary (back right)
    const glP = [[0, 0], [.95, 0], [1, .12], [1.12, 3.2], [1.06, 3.2], [.9, .2], [0, .2]].map(([x, y]) => new TT.Vector2(x, y));
    const gl = new TT.Mesh(new TT.LatheGeometry(glP, 28), M({ color: 0xffffff, roughness: .05, clearcoat: 1, transparent: true, opacity: .32, depthWrite: false })); gl.position.set(-13, 0, -8); g.add(gl);
    const drink = new TT.Mesh(new TT.CylinderGeometry(1.0, .9, 2.2, 24), M({ color: 0xffe9a0, roughness: .1, transparent: true, opacity: .72, emissive: new TT.Color(0x3a2a08) })); drink.position.set(-13, 1.3, -8); g.add(drink);
    const slice = new TT.Mesh(new TT.CylinderGeometry(.7, .7, .12, 18, 1, false, 0, Math.PI), M({ color: 0xf6d348, roughness: .5 })); slice.rotation.set(Math.PI / 2, 0, .3); slice.position.set(-12.05, 3.15, -8); g.add(slice);
    const potP = [[0, 0], [1.1, 0], [1.45, 2], [1.6, 2.05], [1.6, 2.4], [0, 2.4]].map(([x, y]) => new TT.Vector2(x, y));
    const pot = new TT.Mesh(new TT.LatheGeometry(potP, 22), M({ color: 0xc27a52, roughness: .8 })); pot.position.set(14, 0, -9); pot.castShadow = pot.receiveShadow = true; g.add(pot);
    const herbM = M({ color: 0x5f7d4f, roughness: .8 });
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = .25 + (i % 3) * .3, h = 2.2 + (i % 4) * .5; const st = new TT.Mesh(new TT.CylinderGeometry(.05, .09, h, 5), herbM); st.position.set(14 + Math.cos(a) * r, 2.3 + h / 2, -9 + Math.sin(a) * r); st.rotation.set(Math.sin(a) * .25, 0, Math.cos(a) * .25); st.castShadow = true; g.add(st); }
    backdrop(o, 'tbl4-bd', (c, ppu) => {
      const R = rng(5), HZ = 22.6, SX = -9;
      c.fillStyle = lin(c, 40, HZ, [[0, '#33407e'], [.3, '#7a5fa8'], [.6, '#e38ba0'], [.85, '#ffb07c'], [1, '#ffd69c']]); c.fillRect(-60, HZ, 120, 40);
      c.fillStyle = rad(c, SX, HZ + 1, 28, [[0, 'rgba(255,244,210,.95)'], [.1, 'rgba(255,216,160,.7)'], [.45, 'rgba(255,170,130,.22)'], [1, 'rgba(255,150,120,0)']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = '#fff8e2'; ell(c, SX, HZ + 1.1, 1.3, 1.3);
      blur(c, 1.2 * ppu);
      c.fillStyle = 'rgba(255,196,196,.5)'; [[16, 28, 9, .8], [25, 26.6, 6, .55], [-32, 30, 11, .7], [6, 32, 8, .55], [-18, 26.4, 6, .4]].forEach(([x, y, w, h]) => ell(c, x, y, w, h));
      blur(c, .3 * ppu);
      c.fillStyle = lin(c, HZ, 12, [[0, '#9a7fae'], [.25, '#6e639c'], [1, '#434b88']]); c.fillRect(-60, -40, 120, HZ + 40);
      c.fillStyle = '#6a5788'; c.beginPath(); c.moveTo(14, HZ); c.quadraticCurveTo(26, HZ + 2.6, 38, HZ + 1.8); c.quadraticCurveTo(48, HZ + 1, 60, HZ + 2.4); c.lineTo(60, HZ); c.fill();
      c.fillStyle = '#7a6694'; c.beginPath(); c.moveTo(-60, HZ); c.quadraticCurveTo(-48, HZ + 1.4, -38, HZ + .6); c.lineTo(-30, HZ); c.fill();
      for (let i = 0; i < 46; i++) { const y = HZ - .2 - R() * 6.5, k = 1 - (HZ - y) / 8, wd = (1.2 + R() * 3) * k; c.fillStyle = `rgba(255,${205 + R() * 40 | 0},160,${.3 + R() * .5})`; c.fillRect(SX - wd / 2 + (R() - .5) * 2.2 * (1.5 - k), y, wd, .13); }
      // the balustrade, close behind the table: silhouettes against the light
      blur(c, .2 * ppu);
      const SIL = '#3f2b40', B0 = 13.4, B1 = 19.8, bh = (B1 - B0) / 9.2, by = v => B0 + (v - 9.5) * bh;
      c.fillStyle = SIL; c.fillRect(-60, -40, 120, B0 + 40);           // the parapet below (mostly hidden behind the table)
      c.fillRect(-60, B1, 120, 1.3); c.fillStyle = '#4a3249'; c.fillRect(-60, B1 - .3, 120, .45);
      c.fillStyle = SIL;
      for (let x = -59; x < 60; x += 2.7) {   // slim vase-shaped balusters with clear gaps between them
        c.beginPath(); c.moveTo(x - .3, by(9.5)); c.lineTo(x - .4, by(10.4)); c.bezierCurveTo(x - .95, by(11.6), x - .9, by(14.4), x - .3, by(15.6)); c.lineTo(x - .22, by(17.3)); c.lineTo(x - .45, by(18.7));
        c.lineTo(x + .45, by(18.7)); c.lineTo(x + .22, by(17.3)); c.lineTo(x + .3, by(15.6)); c.bezierCurveTo(x + .9, by(14.4), x + .95, by(11.6), x + .4, by(10.4)); c.lineTo(x + .3, by(9.5)); c.fill();
      }
      c.fillStyle = 'rgba(255,196,150,.5)'; c.fillRect(-60, B1 + 1.2, 120, .1);   // the rail's sunlit edge
      // bougainvillea trailing over the rail and in from the corners, out of focus
      blur(c, .9 * ppu);
      const flower = (x, y, n, sx, sy) => { for (let i = 0; i < n; i++) { const fx = x + (R() - .5) * sx, fy = y + (R() - .5) * sy; c.fillStyle = R() > .28 ? `rgba(${205 + R() * 40 | 0},${48 + R() * 40 | 0},${128 + R() * 40 | 0},.9)` : `rgba(${58 + R() * 20 | 0},${92 + R() * 20 | 0},${52},.9)`; ell(c, fx, fy, .45 + R() * .6, .4 + R() * .45); } };
      flower(-26, 21.8, 60, 16, 3.2); flower(-33, 18.5, 26, 6, 5); flower(30, 21.8, 40, 12, 2.6); flower(-28, 30, 70, 26, 9); flower(36, 30, 40, 22, 7); flower(-9, 34, 30, 14, 4);
      blur(c, 0);
    }, { px: 2048 });
    scene.add(new TT.HemisphereLight(0xfbeee8, 0xffdcc4, .5));
    const key = dirLight(TT, 0xffc896, 1.15, [-8, 9, -22], 15); scene.add(key);
    const fill = new TT.DirectionalLight(0xffe4dc, .38); fill.position.set(5, 12, 16); scene.add(fill);
    return { bg: '#4a3249', exp: .8, board: .32, boardCol: 0xfff0e6, key, env: { top: '#d8bcc4', bottom: '#f6dcc8', panels: [[-12, 3, -20, 10, 4, '#ffcf9a', 3], [0, 16, -8, 26, 8, '#c8b6f0', .8], [0, 6, 18, 20, 5, '#ffe2d4', .55]] } };
  };

  TABLES[4].plain = { sun: 0xffd8b0, sunI: .74, hemi: [0xfbeee8, 0xffdcc4, .5], exp: .64 };
  TABLES[4].floor = (o) => ({ img: marbleTex(o).image, w: 46, h: 36, over: 'linear-gradient(160deg, rgba(255,196,156,.26), transparent 46%), linear-gradient(0deg, rgba(120,100,170,.10), transparent 40%), linear-gradient(rgba(255,252,248,.34), rgba(255,252,248,.34))' });

  /* ---------- 5 · 夜の書斎: walnut desk, leather desk mat, a banker's lamp, a blurred bookshelf ---------- */
  const walnut = o => woodTop('tbl5-walnut', '#80502f', '#3a1f10', sz(o, 2048), sz(o, 2048));
  TABLES[5] = (o) => {
    const { TT, g, scene } = o;
    const MAT = .16;
    const desk = M({ map: walnut(o), roughness: .4, clearcoat: .45, clearcoatRoughness: .3, bumpScale: .002 });
    const t = new TT.Mesh(RB(48, 1.6, 36, .5, 3), desk); t.position.set(0, -MAT - .8, 5); t.receiveShadow = true; g.add(t);
    // the desk mat: dark green leather, a tooled gold line and a stitched edge
    const LW = 24, LD = 16, LT = sz(o, 1024), LH = Math.round(LT * LD / LW);
    const lt = canvasTex('tbl5-leather', LT, LH, (c, W, H) => {
      const N = makeNoise(17), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = N(x / 2.2, y / 2.2, 2), k = (p - .5) * 22 + (N(x / 70, y / 70, 3) - .5) * 14, i = (y * W + x) * 4;
        d[i] = 30 + k * .5; d[i + 1] = 52 + k * .8; d[i + 2] = 40 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      const u = W / LW;
      c.strokeStyle = 'rgba(214,176,96,.85)'; c.lineWidth = Math.max(1, u * .07); c.strokeRect(u * 1.1, u * 1.1, W - u * 2.2, H - u * 2.2);
      c.strokeStyle = 'rgba(214,176,96,.5)'; c.lineWidth = Math.max(1, u * .035); c.strokeRect(u * 1.35, u * 1.35, W - u * 2.7, H - u * 2.7);
      c.strokeStyle = 'rgba(190,180,150,.55)'; c.lineWidth = Math.max(1, u * .05); c.setLineDash([u * .22, u * .16]); c.strokeRect(u * .4, u * .4, W - u * .8, H - u * .8);
    });
    const mat = new TT.Mesh(RB(LW, MAT, LD, .07, 2), [M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 }), M({ map: lt, roughness: .62, clearcoat: .15, clearcoatRoughness: .6, bumpScale: .004 }), M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 })]);
    mat.position.set(0, -MAT / 2, 0); mat.receiveShadow = true; g.add(mat);
    // banker's lamp (back left): brass base and stem, a green glass shade glowing underneath
    const brass = M({ color: 0xc8a050, metalness: 1, roughness: .28 }), LX = -12.5, LZ = -8.5;
    const base = new TT.Mesh(new TT.CylinderGeometry(1.5, 1.8, .45, 32), brass); base.position.set(LX, .22 - MAT, LZ); base.castShadow = true; g.add(base);
    const stem = new TT.Mesh(new TT.CylinderGeometry(.16, .16, 3.4, 12), brass); stem.position.set(LX, 2.1 - MAT, LZ); g.add(stem);
    const arm = new TT.Mesh(new TT.CylinderGeometry(.12, .12, 2.2, 10), brass); arm.rotation.x = Math.PI / 2; arm.position.set(LX, 3.75 - MAT, LZ + 1.1); g.add(arm);
    const glass = M({ color: 0x0f5a2c, roughness: .15, clearcoat: 1, clearcoatRoughness: .05, emissive: new TT.Color(0x05200d) });
    const shade = new TT.Mesh(new TT.CylinderGeometry(1.25, 1.25, 6.2, 28, 1, true, 0, Math.PI), glass); shade.rotation.set(0, 0, Math.PI / 2); shade.rotation.order = 'ZYX'; shade.position.set(LX, 4.1 - MAT, LZ + 2.1);
    shade.material.side = TT.DoubleSide; shade.castShadow = true; g.add(shade);
    const capM = M({ color: 0xc8a050, metalness: 1, roughness: .3 });
    [-3.1, 3.1].forEach(dx => { const cp = new TT.Mesh(new TT.CircleGeometry(1.27, 20, 0, Math.PI), capM); cp.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2; cp.rotation.order = 'YXZ'; cp.position.set(LX + dx, 4.1 - MAT, LZ + 2.1); g.add(cp); });
    const glow = new TT.Mesh(new TT.PlaneGeometry(6, 2.2), new TT.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); glow.rotation.x = Math.PI / 2; glow.position.set(LX, 3.95 - MAT, LZ + 2.1); g.add(glow);
    // a stack of books (back right)
    [[0x5a2420, 7, 5, 1.1, .05], [0x23392c, 6.4, 4.6, .9, -.08], [0x6b4a24, 6.8, 4.8, 1, .12]].reduce((y, [col, w, d, h, r]) => {
      const b = new TT.Mesh(RB(w, h, d, .08, 2), M({ color: col, roughness: .6 })); b.position.set(15, y + h / 2, -7.5); b.rotation.y = r; b.castShadow = b.receiveShadow = true; g.add(b);
      const pg = new TT.Mesh(RB(w - .3, h - .25, d - .1, .04, 1), M({ color: 0xe8dcc0, roughness: .8 })); pg.position.set(15 + .17, y + h / 2, -7.5); pg.rotation.y = r; g.add(pg);
      return y + h;
    }, -MAT);
    // an inkwell (cut glass, brass cap) and a fountain pen lying beside the mat
    const ink = new TT.Mesh(RB(1.7, 1.3, 1.7, .22, 2), M({ color: 0x1c2430, roughness: .08, clearcoat: 1, clearcoatRoughness: .05, metalness: .1 })); ink.position.set(9.5, .65 - MAT, -10); ink.rotation.y = .5; ink.castShadow = true; g.add(ink);
    const cap = new TT.Mesh(new TT.CylinderGeometry(.48, .52, .45, 18), brass); cap.position.set(9.5, 1.5 - MAT, -10); g.add(cap);
    const pen = new TT.Mesh(new TT.CylinderGeometry(.16, .16, 4.4, 12), M({ color: 0x14100c, roughness: .2, clearcoat: 1 })); pen.rotation.set(0, .35, Math.PI / 2); pen.position.set(13.6, .17 - MAT, 1.5); pen.castShadow = true; g.add(pen);
    const nib = new TT.Mesh(new TT.ConeGeometry(.16, .7, 12), brass); nib.rotation.set(0, .35, -Math.PI / 2); nib.position.set(13.6 + Math.cos(.35) * 2.55, .17 - MAT, 1.5 - Math.sin(.35) * 2.55); g.add(nib);
    backdrop(o, 'tbl5-bd', (c, ppu) => {
      const R = rng(23);
      c.fillStyle = '#100a06'; c.fillRect(-60, -40, 120, 80);
      // the bookshelf: dark shelves full of spines, in the warm falloff of the lamp
      const SH = [10, 16.2, 23.4, 30.6, 37.8];
      blur(c, 1.2 * ppu);
      for (let s = 0; s < SH.length - 1; s++) {
        let x = -58; const y0 = SH[s] + .6, top = SH[s + 1];
        while (x < 58) {
          const w = .55 + R() * .75, h = Math.min(top - y0 - .4, 3.6 + R() * 2.4), pal = ['#5c1f1a', '#2a3c2c', '#6d4a28', '#1e2a3c', '#7a6440', '#3d2a20', '#8a3a24', '#40463a'];
          const lean = R() < .06 ? .25 : 0;
          c.fillStyle = pal[R() * pal.length | 0]; c.save(); c.translate(x, y0); c.transform(1, 0, lean, 1, 0, 0); c.fillRect(0, 0, w, h);
          if (R() > .4) { c.fillStyle = 'rgba(210,170,90,.55)'; c.fillRect(0, h * .78, w, .18); c.fillRect(0, h * .2, w, .12); }
          c.restore(); x += w + (R() < .08 ? 1.5 + R() * 2 : .04);
        }
      }
      c.fillStyle = '#2a1a0f'; SH.forEach(y => c.fillRect(-60, y, 120, .7));
      c.fillStyle = '#1c1108'; [-40, -14, 12, 38].forEach(x => c.fillRect(x, 0, .9, 40));
      // the lamp's warm light falls on the left of the shelf; the right sinks into the dark
      blur(c, 0);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = rad(c, -16, 16, 46, [[0, '#ffffff'], [.45, '#c4a68e'], [1, '#3a2c26']]); c.fillRect(-60, -40, 120, 80);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = rad(c, -16, 14, 22, [[0, 'rgba(255,170,90,.22)'], [1, 'rgba(255,150,70,0)']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = lin(c, 9, 4, [[0, 'rgba(10,6,4,0)'], [1, 'rgba(10,6,4,.9)']]); c.fillRect(-60, -40, 120, 49);
    });
    // the lamp still carries the mood (and the one shadow), but the board itself gets an even warm light from above as well:
    // a dark corner of the board is the one thing the study must never have
    scene.add(new TT.HemisphereLight(0x8a90b8, 0x2a170c, .3));
    const key = new TT.SpotLight(0xffc78a, 4.2, 80, 1.05, .95, .9); key.position.set(LX, 3.7 - MAT, LZ + 2.1); key.target.position.set(3, 0, 4); scene.add(key); scene.add(key.target);
    const over = new TT.DirectionalLight(0xffdcb0, .38); over.position.set(-4, 30, 10); scene.add(over);
    key.shadow.camera.near = 1; key.shadow.camera.far = 50; key.shadow.bias = -.0003;
    const pool = new TT.PointLight(0xffb060, .9, 16, 2); pool.position.set(LX, 3.1, LZ + 2.1); scene.add(pool);
    const moon = new TT.DirectionalLight(0x8090c8, .16); moon.position.set(14, 12, 12); scene.add(moon);
    return { bg: '#0d0906', exp: 1.02, minExp: .95, board: .5, boardCol: 0xffe6c4, key, env: { top: '#2e2218', bottom: '#080504', panels: [[-12, 6, -6, 8, 5, '#ffc070', 5], [14, 10, 6, 7, 9, '#7a88b8', .6], [0, 10, 18, 20, 5, '#5a4636', .8], [-16, 4, 10, 5, 6, '#ffb060', .8]] } };
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
  TABLES[5].floor = (o) => ({ img: leatherFloor(o).image, w: 24, h: 18, dark: true,
    over: 'radial-gradient(80% 70% at 20% 10%, rgba(255,196,120,.20), transparent 62%), radial-gradient(130% 120% at 50% 46%, transparent 52%, rgba(4,8,5,.55))' });
})();
