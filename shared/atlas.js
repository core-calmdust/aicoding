/* =====================================================================
   World Board Game Atlas — shared core  (shared/atlas.js)
   One file that every 世界のボドゲ大百科 page can load. It holds:
     • GAMES      the series registry (names in 14 languages, icon, dates)
     • UPDATES    the changelog — newest first (its lines are in shared/atlas-updates.js,
                  loaded by the top page and the portal only)
     • TAGS / badges()   the common badge & tag rules (see claude/atlas-portal-spec.md)
     • progress() reads each game's own localStorage records (read-only)
     • achievements()    achievement list + which are unlocked
     • wallet / profile  coins, owned items, gacha (key: 'atlas-v1')
   HOW TO ADD A GAME: add one entry to GAMES, a reader to READ, and an
   UPDATES line (shared/atlas-updates.js). Achievements are generated from the reader's numbers.
   ===================================================================== */
(function () {
  'use strict';
  const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar', 'ru', 'zh-TW', 'id', 'tr'];
  const N = (ja, en, zh, ko, es, fr, pt, de, hi, ar, ru, zhTW, id, tr) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar, ru: ru || en, 'zh-TW': zhTW || zh, id: id || en, tr: tr || en });

  /* ---------------- registry ---------------- */
  // tags: classic card ai online rated daily lessons puzzles openings variants netrank mobile
  // 定番 rule: 'classic' (定番) goes on every traditional, well-known game (shogi, chess, go, backgammon,
  // mancala, hex…), listed first so it shows on every card. Puzzles (sudoku, SameGame, sliders…) and
  // original games invented for this site (e.g. the hex-deck original) NEVER get it.
  const GAMES = [
    { id: 'shogi', cat: 'chess', store: ['shogi-kaya-', 'shogi-rated-v1', 'shogi-online-name'], href: 'shogi/', color: '#e8a33d', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 613, ls: 15 },
      name: N('将棋', 'Shogi', '将棋', '쇼기', 'Shogi', 'Shogi', 'Shogi', 'Shogi', 'शोगी', 'شوغي', 'Сёги', '將棋', 'Shogi', 'Shogi') },
    { id: 'chess', cat: 'chess', store: ['aicoding-chess', 'chess-online-name'], href: 'chess/', color: '#5a6b8c', released: '2026-10-19', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 445, ls: 20 },
      name: N('チェス', 'Chess', '国际象棋', '체스', 'Ajedrez', 'Échecs', 'Xadrez', 'Schach', 'शतरंज', 'الشطرنج', 'Шахматы', '西洋棋', 'Catur', 'Satranç') },
    { id: 'reversi', cat: 'line', store: ['reversi-emerald-', 'reversi-rated-v1', 'reversi-online-name'], href: 'reversi/', color: '#22aa74', released: '2026-10-17', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 1000, ls: 9 },
      name: N('リバーシ V4', 'Reversi V4', '黑白棋 V4', '리버시 V4', 'Reversi V4', 'Reversi V4', 'Reversi V4', 'Reversi V4', 'रिवर्सी V4', 'ريفيرسي V4', 'Реверси V4', '黑白棋 V4', 'Reversi V4', 'Reversi V4') },
    { id: 'sudoku', cat: 'puzzle', store: ['mainichi-sudoku-v1'], href: 'sudoku/', color: '#ff8fc7', released: '2025-06-10', tags: ['daily', 'puzzles', 'variants', 'netrank', 'mobile'], total: { pz: 1300 },
      name: N('まいにち数独', 'Daily Sudoku', '每日数独', '매일 스도쿠', 'Sudoku Diario', 'Sudoku du jour', 'Sudoku Diário', 'Tägliches Sudoku', 'रोज़ का सुडोकू', 'سودوكو كل يوم', 'Судоку дня', '每日數獨', 'Sudoku Harian', 'Günlük Sudoku') },
    { id: 'speedsudoku', original: true, cat: 'puzzle', store: ['mainichi-sudoku-v1'], href: 'speed-sudoku/', color: '#ff7a3d', released: '2026-10-21', tags: ['daily', 'puzzles', 'variants', 'netrank', 'mobile'], total: { pz: 500 },
      name: N('すぴーど数独', 'Speed Sudoku', '速度数独', '스피드 스도쿠', 'Sudoku Veloz', 'Sudoku Express', 'Sudoku Veloz', 'Speed-Sudoku', 'स्पीड सुडोकू', 'سودوكو السرعة', 'Скоростное судоку', '極速數獨', 'Sudoku Kilat', 'Hızlı Sudoku') },
    { id: 'samegame', original: true, cat: 'puzzle', store: ['samegame-pop-v1'], href: 'samegame/', color: '#2e6f8e', released: '2026-10-21', tags: ['daily', 'puzzles', 'netrank', 'mobile'], total: { pz: 750 },
      name: N('さめが〜め POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!') },
    { id: 'jailbreak', original: true, cat: 'puzzle', store: ['jailbreak-slide-v1'], href: 'jailbreak/', color: '#f26b1d', released: '2026-10-25', tags: ['daily', 'puzzles', 'variants', 'netrank', 'mobile'], total: { pz: 1000 },
      name: N('だつごくスライダー！', 'Jailbreak Slider!', '越狱滑块！', '탈옥 슬라이더!', '¡Fuga Slider!', 'Évasion Slider !', 'Fuga Slider!', 'Ausbruch-Slider!', 'जेलब्रेक स्लाइडर!', 'الهروب سلايدر!', 'Побег-слайдер!', '越獄滑塊！', 'Slider Kabur!', 'Firar Kaydırmaca!') },
    { id: 'poker', cat: 'card', store: ['aicoding-poker'], href: 'poker/', color: '#b9b4aa', released: '2026-10-29', tags: ['classic', 'card', 'ai', 'lessons', 'variants', 'mobile'], total: { ls: 18 },
      name: N('ポーカー', 'Poker', '扑克', '포커', 'Póker', 'Poker', 'Pôquer', 'Poker', 'पोकर', 'بوكر', 'Покер', '撲克', 'Poker', 'Poker') },
    { id: 'baccarat', cat: 'card', store: ['aicoding-baccarat'], href: 'baccarat/', color: '#c9a44c', released: '2026-11-01', tags: ['classic', 'card', 'lessons', 'variants', 'mobile'], total: { ls: 17 },
      name: N('バカラ', 'Baccarat', '百家乐', '바카라', 'Baccarat', 'Baccara', 'Bacará', 'Baccara', 'बैकारेट', 'باكارا', 'Баккара', '百家樂', 'Bakarat', 'Bakara') },
    { id: 'blackjack', cat: 'card', store: ['aicoding-blackjack'], href: 'blackjack/', color: '#d4a54a', released: '2026-11-04', tags: ['classic', 'card', 'lessons', 'variants', 'mobile'], total: { ls: 16 },
      name: N('ブラックジャック', 'Blackjack', '21点', '블랙잭', 'Blackjack', 'Blackjack', 'Blackjack', 'Blackjack', 'ब्लैकजैक', 'بلاك جاك', 'Блэкджек', '21點', 'Blackjack', 'Blackjack') },
    { id: 'solitaire', cat: 'puzzle', store: ['aicoding-solitaire'], href: 'solitaire/', color: '#2f6b4f', released: '2026-10-28', tags: ['classic', 'card', 'daily', 'variants', 'mobile'], total: {},
      name: N('ソリティア', 'Solitaire', '纸牌接龙', '솔리테어', 'Solitario', 'Solitaire', 'Paciência', 'Solitär', 'सॉलिटेयर', 'سوليتير', 'Пасьянс', '接龍', 'Solitaire', 'Solitaire') },
    { id: 'peg', cat: 'puzzle', store: ['aicoding-peg'], href: 'atlas/#games/peg', only3d: true, color: '#7d5ba6', released: '2026-11-11', tags: ['classic', 'daily', 'puzzles', 'variants', 'mobile'], total: { pz: 497 },
      name: N('ペグソリテール', 'Peg Solitaire', '孔明棋', '페그 솔리테르', 'Solitario de clavijas', 'Solitaire', 'Resta Um', 'Solitär', 'पेग सॉलिटेयर', 'سوليتير الأوتاد', 'Солитер', '孔明棋', 'Peg Solitaire', 'Peg Solitaire') },
    { id: 'shanghai', cat: 'puzzle', store: ['aicoding-shanghai'], href: 'atlas/#games/shanghai', only3d: true, color: '#1f6a4c', released: '2026-11-13', tags: ['classic', 'puzzles', 'variants', 'mobile'], total: { pz: 720 },
      name: N('上海', 'Shanghai', '上海麻将', '상하이', 'Shanghái', 'Shanghai', 'Xangai', 'Shanghai', 'शंघाई', 'شنغهاي', 'Шанхай', '上海麻將', 'Shanghai', 'Şanghay') },
    { id: 'hitblow', cat: 'deduce', store: ['aicoding-hitblow'], href: 'atlas/#games/hitblow', only3d: true, color: '#2b3683', released: '2026-11-16', tags: ['classic', 'ai', 'rated', 'daily', 'variants', 'mobile'], total: {}, alpha: true,
      name: N('ヒット＆ブロー', 'Hit & Blow', '猜数字·猜颜色', '히트 앤 블로', 'Hit & Blow', 'Hit & Blow', 'Hit & Blow', 'Hit & Blow', 'हिट एंड ब्लो', 'هِت آند بلو', 'Быки и коровы', '猜數字·猜顏色', 'Hit & Blow', 'Hit & Blow') },
    { id: 'checkers', cat: 'chess', store: ['aicoding-checkers', 'checkers-online-name'], href: 'checkers/', color: '#8e2a3c', released: '2026-10-21', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 500, ls: 13 },
      name: N('チェッカー V2', 'Checkers V2', '跳棋（国际跳棋·英式） V2', '체커 V2', 'Damas V2', 'Dames anglaises V2', 'Damas V2', 'Dame V2', 'चेकर्स V2', 'الداما V2', 'Шашки V2', '西洋跳棋（英式） V2', 'Dam V2', 'Dama V2') },
    { id: 'ugolki', cat: 'chess', store: ['aicoding-ugolki', 'ugolki-online-name'], href: 'ugolki/', color: '#1d3f9a', released: '2026-11-04', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 144, ls: 11 },
      name: N("ウゴルキ", "Ugolki", "角棋", "우골키", "Ugolki", "Ougolki", "Ugolki", "Ugolki", "उगोल्की", "أوغولكي", "Уголки", "角棋", "Ugolki", "Ugolki") },
    { id: 'fanorona', cat: 'chess', store: ['aicoding-fanorona'], href: 'fanorona/', color: '#b5743a', released: '2026-11-01', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 200, ls: 12 },
      name: N("ファノロナ", "Fanorona", "法诺罗纳", "파노로나", "Fanorona", "Fanorona", "Fanorona", "Fanorona", "फ़ानोरोना", "فانورونا", "Фанорона", "法諾羅納", "Fanorona", "Fanorona") },
    { id: 'alquerque', cat: 'chess', store: ['aicoding-alquerque'], href: 'alquerque/', color: '#9a2a24', released: '2026-11-01', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 240, ls: 11 },
      name: N("アルケルケ", "Alquerque", "阿尔凯尔凯", "알케르케", "Alquerque", "Alquerque", "Alquerque", "Alquerque", "अलकेरके", "القِرْقة", "Алькерк", "阿爾凱爾凱", "Alquerque", "Alquerque") },
    { id: 'konane', cat: 'hist', also: ['chess'], store: ['aicoding-konane', 'konane-online-name'], href: 'konane/', color: '#0f8a7e', released: '2026-11-06', tags: ['historical', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 226, ls: 9 },
      name: N("コナネ", "Kōnane", "科纳内", "코나네", "Kōnane", "Kōnane", "Kōnane", "Kōnane", "कोनाने", "كونانيه", "Конане", "科納內", "Kōnane", "Kōnane") },
    { id: 'agon', cat: 'chess', store: ['aicoding-agon', 'agon-online-name'], href: 'agon/', color: '#6c1a1c', released: '2026-11-04', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 152, ls: 12 },
      name: N("アゴン", "Agon", "阿贡棋", "아곤", "Agon", "Agon", "Agon", "Agon", "अगोन", "أغون", "Агон", "阿貢棋", "Agon", "Agon") },
    { id: 'xiangqi', cat: 'chess', store: ['aicoding-xiangqi', 'xiangqi-online-name'], href: 'xiangqi/', color: '#c0392b', released: '2026-10-25', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 543, ls: 16 },
      name: N('シャンチー（中国象棋）', 'Xiangqi', '中国象棋', '샹치(중국 장기)', 'Xiangqi (ajedrez chino)', 'Xiangqi (échecs chinois)', 'Xiangqi (xadrez chinês)', 'Xiangqi (Chinesisches Schach)', 'शियांगची (चीनी शतरंज)', 'شيانغ تشي (الشطرنج الصيني)', 'Сянци (китайские шахматы)', '象棋', 'Xiangqi (catur Tiongkok)', 'Xiangqi (Çin satrancı)') },
    { id: 'janggi', cat: 'chess', store: ['aicoding-janggi', 'janggi-online-name'], href: 'janggi/', color: '#4aa58f', beta: true, released: '2026-11-07', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 289, ls: 15 },
      name: N('チャンギ（韓国将棋）', 'Janggi', '韩国将棋', '장기', 'Janggi (ajedrez coreano)', 'Janggi (échecs coréens)', 'Janggi (xadrez coreano)', 'Janggi (Koreanisches Schach)', 'जांग्गी (कोरियाई शतरंज)', 'جانغي (الشطرنج الكوري)', 'Чанги (корейские шахматы)', '韓國將棋', 'Janggi (catur Korea)', 'Janggi (Kore satrancı)') },
    { id: 'tafl', cat: 'chess', store: ['aicoding-tafl', 'tafl-online-name'], href: 'tafl/', color: '#3f6f8f', released: '2026-10-25', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 390, ls: 16 },
      name: N('ネファタフル', 'Hnefatafl', '维京棋（Hnefatafl）', '흐네파타플', 'Hnefatafl', 'Hnefatafl', 'Hnefatafl', 'Hnefatafl', 'ह्नेफ़ाटाफ़ल', 'هنفتافل', 'Хнефатафл', '維京棋（Hnefatafl）', 'Hnefatafl', 'Hnefatafl') },
    { id: 'amazons', cat: 'line', also: ['chess'], store: ['aicoding-amazons', 'amazons-online-name'], href: 'amazons/', color: '#3f8a5c', released: '2026-11-10', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 163, ls: 8 },
      name: N("アマゾンズ", "Amazons", "亚马逊棋", "아마존스", "Amazons", "Amazons", "Amazons", "Amazons", "अमेज़न्स", "الأمازونات", "Амазонки", "亞馬遜棋", "Amazons", "Amazons") },
    { id: 'go', cat: 'line', store: ['aicoding-go', 'go-online-name'], href: 'go/', color: '#b8893f', released: '2026-10-22', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 500, ls: 21 },
      name: N('囲碁', 'Go', '围棋', '바둑', 'Go', 'Go', 'Go', 'Go', 'गो', 'غو', 'Го', '圍棋', 'Go', 'Go') },
    { id: 'gomoku', cat: 'line', store: ['aicoding-gomoku', 'gomoku-online-name'], href: 'gomoku/', color: '#c48a4a', released: '2026-10-19', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 500, ls: 12 },
      name: N('五目並べ・連珠', 'Gomoku & Renju', '五子棋・连珠', '오목・렌주', 'Gomoku y Renju', 'Gomoku et Renju', 'Gomoku e Renju', 'Gomoku & Renju', 'गोमोकु और रेंजू', 'غوموكو ورينجو', 'Гомоку и рэндзю', '五子棋・連珠', 'Gomoku & Renju', 'Gomoku ve Renju') },
    { id: 'dots', cat: 'line', store: ['dots-puzzles-', 'dots-lessons-', 'dots-openings-', 'dots-daily-', 'dots-rated-v1', 'dots-rules-', 'dots-online-name'], href: 'dots/', color: '#4cc3ff', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 450, ls: 15 },
      name: N('ドット・アンド・ボックス', 'Dots and Boxes', '点格棋', '도트 앤 박스', 'Puntos y cajas', 'Pipopipette', 'Pontinhos', 'Käsekästchen', 'डॉट्स एंड बॉक्सेज़', 'النقاط والمربعات', 'Точки и квадраты', '點格棋', 'Titik dan Kotak', 'Noktalar ve Kutular') },
    { id: 'connect4', cat: 'line', store: ['aicoding-connect4-v2', 'c4-rated-v1', 'connect4-online-name'], href: 'connect4/', color: '#ff6b6b', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 306, ls: 23 },
      name: N('コネクトフォー', 'Connect Four', '四子棋', '커넥트 포', 'Conecta 4', 'Puissance 4', 'Lig 4', 'Vier gewinnt', 'कनेक्ट फ़ोर', 'أربعة في صف', 'Четыре в ряд', '四子棋', 'Connect Four', 'Dört Bağla') },
    { id: 'mancala', cat: 'race', store: ['aicoding-mancala-v1', 'mancala-online-name'], href: 'mancala/', color: '#b98663', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 500, ls: 29 },
      name: N('マンカラ', 'Mancala', '播棋', '만칼라', 'Mancala', 'Mancala', 'Mancala', 'Mancala', 'मंकाला', 'مانكالا', 'Манкала', '播棋（Mancala）', 'Mancala (congklak)', 'Mangala') },
    { id: 'backgammon', cat: 'race', store: ['aicoding-backgammon-v2', 'backgammon-online-name'], href: 'backgammon/', color: '#a17cff', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 500, ls: 23 },
      name: N('バックギャモン V2', 'Backgammon V2', '西洋双陆棋 V2', '백개먼 V2', 'Backgammon V2', 'Backgammon V2', 'Gamão V2', 'Backgammon V2', 'बैकगैमन V2', 'طاولة الزهر V2', 'Нарды V2', '西洋雙陸棋 V2', 'Backgammon V2', 'Tavla V2') },
    { id: 'ur', cat: 'hist', also: ['race'], store: ['aicoding-ur', 'ur-online-name'], href: 'ur/', color: '#2a3f9e', released: '2026-11-04', tags: ['historical', 'ai', 'online', 'rated', 'lessons', 'puzzles', 'variants', 'mobile'], total: {},
      name: N('ウル王朝のゲーム', 'The Royal Game of Ur', '乌尔王族局戏', '우르 왕실 게임', 'El Juego Real de Ur', 'Le Jeu royal d’Ur', 'O Jogo Real de Ur', 'Das Königliche Spiel von Ur', 'उर का शाही खेल', 'لعبة أور الملكية', 'Царская игра Ура', '烏爾王族局戲', 'Permainan Kerajaan Ur', 'Ur Kraliyet Oyunu') },
    { id: 'senet', cat: 'hist', also: ['race'], store: ['aicoding-senet', 'senet-online-name'], href: 'senet/', color: '#8c9a2e', released: '2026-11-07', tags: ['historical', 'ai', 'online', 'rated', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 178, ls: 9 },
      name: N('セネト', 'Senet', '塞尼特', '세네트', 'Senet', 'Senet', 'Senet', 'Senet', 'सेनेट', 'سينيت', 'Сенет', '塞尼特', 'Senet', 'Senet') },
    { id: 'latrunculi', cat: 'hist', also: ['chess'], store: ['aicoding-latrunculi', 'latrunculi-online-name'], href: 'latrunculi/', color: '#6a2358', alpha: true, released: '2026-11-16', tags: ['historical', 'ai', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 250, ls: 7 },
      name: N("ルドゥス・ラトルンクロルム", "Ludus Latrunculorum", "罗马兵棋", "루두스 라트룬쿨로룸", "Ludus latrunculorum", "Ludus latrunculorum", "Ludus latrunculorum", "Ludus latrunculorum", "लूडुस लात्रुंकुलोरुम", "لودوس لاترونكولوروم", "Латрункули", "羅馬兵棋", "Ludus Latrunculorum", "Ludus Latrunculorum") },
    { id: 'foxgeese', cat: 'hist', also: ['chess'], store: ['aicoding-foxgeese', 'foxgeese-online-name'], href: 'foxgeese/', color: '#5d6a1f', alpha: true, released: '2026-11-16', tags: ['historical', 'ai', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 250, ls: 6 },
      name: N("狐とガチョウ", "Fox and Geese", "狐狸与鹅", "여우와 거위", "El zorro y las ocas", "Le renard et les oies", "A raposa e os gansos", "Fuchs und Gänse", "लोमड़ी और कलहंस", "الثعلب والإوز", "Лиса и гуси", "狐狸與鵝", "Rubah dan Angsa", "Tilki ve Kazlar") },
    { id: 'patolli', cat: 'hist', also: ['race'], store: ['aicoding-patolli', 'patolli-online-name'], href: 'patolli/', color: '#12a4b8', alpha: true, released: '2026-11-16', tags: ['historical', 'ai', 'rated', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 200, ls: 9 },
      name: N("パトリ", "Patolli", "帕托利", "파톨리", "Patolli", "Patolli", "Patolli", "Patolli", "पटोली", "باتولي", "Патолли", "帕托利", "Patolli", "Patolli") },
    { id: 'ludo', cat: 'race', also: ['hist'], store: ['aicoding-ludo', 'ludo-online-name'], href: 'ludo/', color: '#d9473b', released: '2026-11-08', tags: ['classic', 'ai', 'online', 'rated', 'lessons', 'variants', 'mobile'], total: { ls: 10 },
      name: N('ルドー・パチーシ', 'Ludo & Pachisi', '鲁多与帕棋西', '루도 & 파치시', 'Ludo y Pachisi', 'Ludo et Pachisi', 'Ludo e Pachisi', 'Ludo & Pachisi', 'लूडो और पचीसी', 'لودو وباتشيسي', 'Лудо и Пачиси', '魯多與帕奇西', 'Ludo & Pachisi', 'Ludo ve Pachisi') },
    { id: 'carrom', cat: 'action', store: ['aicoding-carrom'], href: 'atlas/#games/carrom', only3d: true, color: '#c23a7a', released: '2026-11-09', tags: ['classic', 'ai', 'mobile'], total: {},
      name: N('キャロム', 'Carrom', '克朗棋', '캐롬', 'Carrom', 'Carrom', 'Carrom', 'Carrom', 'कैरम', 'كيرم', 'Карром', '克朗棋', 'Karambol', 'Carrom') },
    { id: 'crokinole', cat: 'action', store: ['aicoding-crokinole'], href: 'atlas/#games/crokinole', only3d: true, color: '#b8742a', released: '2026-11-09', tags: ['classic', 'ai', 'mobile'], total: {},
      name: N('クロキノール', 'Crokinole', '克罗基诺', '크로키놀', 'Crokinole', 'Crokinole', 'Crokinole', 'Crokinole', 'क्रोकिनोल', 'كروكينول', 'Крокинол', '克羅基諾', 'Crokinole', 'Crokinole') },
    { id: 'hockey', cat: 'action', store: ['aicoding-hockey'], href: 'atlas/#games/hockey', only3d: true, color: '#2f6fd0', released: '2026-11-09', tags: ['ai', 'mobile'], total: {},
      name: N('テーブルホッケー', 'Table Hockey', '桌上冰球', '테이블 하키', 'Hockey de mesa', 'Hockey de table', 'Hóquei de mesa', 'Tischhockey', 'टेबल हॉकी', 'هوكي الطاولة', 'Настольный хоккей', '桌上冰球', 'Hoki meja', 'Masa hokeyi') },
    { id: 'botao', cat: 'action', store: ['aicoding-botao'], href: 'atlas/#games/botao', only3d: true, color: '#5f9e1a', released: '2026-11-15', tags: ['classic', 'ai', 'mobile'], total: {}, beta: true,
      name: N('フチボウ・ジ・ボタン', 'Futebol de Botão', '纽扣足球', '푸치보우 지 보탕', 'Fútbol de botones', 'Football de boutons', 'Futebol de botão', 'Knopffußball', 'बटन फ़ुटबॉल', 'كرة القدم بالأزرار', 'Пуговичный футбол', '鈕扣足球', 'Sepak bola kancing', 'Düğme futbolu') },
    { id: 'morris', cat: 'line', store: ['aicoding-morris', 'morris-online-name'], href: 'morris/', color: '#7552e0', released: '2026-10-18', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 1781, ls: 41 },
      name: N('ナイン・メンズ・モリス', "Nine Men's Morris", '九子棋', '나인 멘스 모리스', 'Molino', 'Jeu du moulin', 'Trilha', 'Mühle', 'नाइन मेन्स मोरिस', 'الطاحونة', 'Мельница', '九子棋', 'Nine Men\'s Morris', 'Dokuz Taş') },
    { id: 'hex', cat: 'line', store: ['aicoding-hex', 'hex-online-name'], href: 'hex/', color: '#4f86e8', released: '2026-10-25', tags: ['classic', 'ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 403, ls: 13 },
      name: N('ヘックス', 'Hex', '六贯棋', '헥스', 'Hex', 'Hex', 'Hex', 'Hex', 'हेक्स', 'هيكس', 'Гекс', '六貫棋', 'Hex', 'Hex') },
  ];
  GAMES.forEach(g => { g.icon = 'images/icons/' + (g.id === 'speedsudoku' ? 'speed-sudoku' : g.id) + '.svg'; });
  // cat: home-grid category chip — chess (shogi/chess-like) · line (line-up & territory) · race (dice race & sowing) · hist (historical: ancient games recreated) · puzzle
  const CATS = ['chess', 'line', 'race', 'hist', 'action', 'puzzle', 'deduce', 'card'];   // (deduce 推理・数あて: ヒット＆ブロー, 2026-11-16)
  // sound effects on/off for every page of the series (localStorage 'atlas-sfx': '0' = off)
  const sfxOn = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
  // store: localStorage key prefixes that belong to the game. The shared account (shared/atlas-account.js)
  // syncs every key starting with one of them, plus each game's '-rules-seen' flag — so a new game only
  // has to list its prefixes here. Keys holding an in-progress game or device settings sync too (newest wins).

  /* ---------------- changelog (newest first) ---------------- */
  // The lines live in shared/atlas-updates.js (window.ATLAS_UPDATES, 2026-11-15): add new ones THERE, not here. Only the top page
  // and the portal load that file (before this one); on the game pages UPDATES is empty (they show no news or badges).
  // Read a line's text with updText(u, lang).
  const UPDATES = window.ATLAS_UPDATES || [];

  /* ---------------- common tag & badge rules ---------------- */
  // tag order = display order. c = colour, i = small icon (svg path d)
  const TAGS = {
    historical: { c: '#8a6a2e', i: 'M4 21h16M5 18h14M7 18v-8M12 18v-8M17 18v-8M4 10h16M12 3l8 5H4z' },
    classic:  { c: '#b5532f', i: 'M4 20h16M6 20v-3h12v3M8 17l1-6h6l1 6M8 11h8M12 4l2 3h-4zM12 7v4' },
    ai:       { c: '#7552e0', i: 'M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V7a4 4 0 0 1 4-4z' },
    online:   { c: '#22aa74', i: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
    rated:    { c: '#e09a00', i: 'M12 3l2.7 5.6l6.1.9l-4.4 4.3l1 6.1L12 17l-5.4 2.9l1-6.1l-4.4-4.3l6.1-.9z' },
    netrank:  { c: '#e09a00', i: 'M5 20V12M12 20V5M19 20v-9' },
    daily:    { c: '#ff6b6b', i: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    lessons:  { c: '#2196e0', i: 'M3 6l9-3l9 3l-9 3zM7 8v6c3 2 7 2 10 0V8' },
    puzzles:  { c: '#e85a9f', i: 'M9 4h4v3a2 2 0 1 0 4 0V4h3v6h-3a2 2 0 1 0 0 4h3v6H4V4z' },
    openings: { c: '#8a5a3b', i: 'M4 5h7v14H4zM13 5h7v14h-7' },
    variants: { c: '#2b9fb3', i: 'M4 7h12l-3-3M20 17H8l3 3' },
    card:     { c: '#9a6b1f', i: 'M7 4h9a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM11.5 9l-2 3l2 3l2-3z' },
    mobile:   { c: '#4a5068', i: 'M8 3h8v18H8zM11 18h2' },
  };
  const DAY = 864e5;
  const ymd = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const daysSince = s => Math.floor((Date.parse(ymd(Date.now())) - Date.parse(s)) / DAY);
  // the portal's own 3D play is named after the place chosen for it (localStorage 'atlas-table', atlas/tables3d.js):
  // the changelog's ちゃぶ台 / chabudai become that place (ja) or a plain "table" (the other languages)
  const PLACE_JA = ['ちゃぶ台', '盤', 'ダイニング', 'フェルト卓', 'テラス', '書斎', '縁側', '山小屋', 'ゲーセン', 'スカイラウンジ', 'キャンプ場', '茶館', '和室'];
  const PLACE_W = { en: [/chabudai/g, 'table'], hi: [/चाबुदाई/g, 'मेज़'], zh: [/矮桌/g, '棋桌'], ko: [/밥상/g, '테이블'], 'zh-TW': [/矮桌/g, '棋桌'] };
  const placeK = () => { try { const k = +localStorage.getItem('atlas-table'); return k >= 1 && k <= 12 && k !== 8 ? k | 0 : 0; } catch (e) { return 0; } };
  function placeWord(s, l) {
    const k = placeK(); if (!k || !s) return s;
    if (l === 'ja') return s.replace(/ちゃぶ台の3D盤/g, k === 1 ? '3D盤' : PLACE_JA[k] + 'の3D盤').replace(/ちゃぶ台/g, PLACE_JA[k]);
    const w = PLACE_W[l]; return w ? s.replace(w[0], w[1]) : s;
  }
  const updText = (u, l) => placeWord(l === 'ja' ? u[2] : l === 'en' ? u[3] : (u[4] && u[4][l]) || u[3], l);
  const lastUpdate = id => (UPDATES.find(u => u[1] === id) || [])[0] || null;
  // Badges — at most 2, in this priority (common rules 2026-11-08, claude/game-conventions-addendum.md):
  //   ALPHA    g.alpha (alone, like BETA; new titles start as alpha from 2026-11-15, then beta, until the owner says)
  //   BETA     g.beta (alone: it takes the place of NEW, ORIGINAL and UPDATE)
  //   NEW      released within NEW_DAYS (14) days (alone)
  //   ORIGINAL g.original (our own titles — ORIGINAL on the top page) once the NEW days are over
  //   UPDATE   the game's latest UPDATES line is an update, not the release, and is within UPDATE_DAYS (14) days.
  //            A line dated on or before g.released counts as the release, so no line needs a label.
  //   (no PREMIUM badge any more: nearly every title had it, so it told players nothing)
  const NEW_DAYS = 14, UPDATE_DAYS = 14;
  const updatedOn = g => { const d = lastUpdate(g.id); return d && (!g.released || d > g.released) ? d : null; };
  function badges(g) {
    if (g.alpha) return ['alpha'];
    if (g.beta) return ['beta'];
    if (g.released && daysSince(g.released) <= NEW_DAYS) return ['new'];
    const out = [];
    if (g.original) out.push('original');   // an original title: NEW at first, then ORIGINAL (common rule 2026-11-08)
    const u = updatedOn(g); if (u && daysSince(u) <= UPDATE_DAYS) out.push('update');
    return out;
  }
  // badge labels: NEW, BETA and ORIGINAL read the same in every language; UPDATE is localized (14 languages)
  const BADGE_TEXT = {
    new: 'NEW', alpha: 'ALPHA', beta: 'BETA', original: 'ORIGINAL',
    update: 'UPDATE',
  };
  const badgeText = (b, l) => { const t = BADGE_TEXT[b]; return !t ? '' : typeof t === 'string' ? t : t[l] || t.en; };
  // the news (portal updates row + phone ticker): one line per game/feature, newest first — except the lead (the first,
  // biggest slot) always goes to the newest NEW title (released within NEW_DAYS, BETA included) while there is one
  // (common rule 2026-11-08: NEWで一番大きく取り上げるのは新作タイトル)
  function news() {
    const seen = new Set(), ups = UPDATES.filter(u => !seen.has(u[1]) && seen.add(u[1]));
    let lead = -1, best = '';
    ups.forEach((u, i) => { const g = GAMES.find(x => x.id === u[1]); if (g && g.released && daysSince(g.released) <= NEW_DAYS && g.released > best) { best = g.released; lead = i; } });
    return lead > 0 ? [ups[lead], ...ups.slice(0, lead), ...ups.slice(lead + 1)] : ups;
  }
  // games ordered by the changelog (UPDATES is newest first); games without entries keep registry order
  function byUpdate() {
    const rank = id => { const k = UPDATES.findIndex(u => u[1] === id); return k < 0 ? 1e9 : k; };
    return GAMES.map((g, i) => ({ g, i, k: rank(g.id) })).sort((a, b) => a.k - b.k || a.i - b.i).map(x => x.g);
  }

  /* ---------------- progress readers (read-only) ---------------- */
  const J = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
  const cntPos = o => o ? Object.entries(o).filter(([k, v]) => k !== '_v' && (v === true || v > 0)).length : 0;
  const starsOf = o => o ? Object.entries(o).reduce((s, [k, v]) => k === '_v' ? s : s + (v === true ? 3 : v > 0 && v <= 3 ? v : 0), 0) : 0;
  const cntClear = (o, f = 'clear') => o ? Object.values(o).filter(x => x && (x[f] || x.pass || x.clear)).length : 0;
  const daily = k => { const d = J(k) || {}; const live = d.last && daysSince(d.last) <= 1; return { days: Object.keys(d.days || {}).length, streak: live ? d.streak || 0 : 0, best: d.best || d.streak || 0 }; };
  const rated = k => { const s = J(k); if (!s) return null; return { n: s.n || 0, w: s.w || 0, r: Math.round(s.r || 0), placed: !!(s.pl && s.pl.done) || (s.n || 0) >= 3 }; };
  const rules = id => { try { return localStorage.getItem('aicoding-' + id + '-rules-seen') === '1'; } catch (e) { return false; } };
  const mergeDaily = (a, b) => ({ days: a.days + b.days, streak: Math.max(a.streak, b.streak), best: Math.max(a.best, b.best) });

  const READ = {
    shogi: () => { const pz = J('shogi-kaya-tsume-v2') || J('shogi-kaya-tsume-v1'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('shogi-kaya-lessons-v1'), 'pass'), op: cntClear(J('shogi-kaya-open-v1'), 'pass'), dl: mergeDaily(daily('shogi-kaya-daily'), daily('shogi-kaya-daily-easy')), rt: rated('shogi-rated-v1'), ru: rules('shogi') || !!J('shogi-kaya-rules-v1') }; },
    chess: () => { const pz = J('aicoding-chess-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-chess-lessons')), op: cntClear(J('aicoding-chess-open'), 'pass'), dl: daily('aicoding-chess-daily'), rt: rated('aicoding-chess-rated'), ru: rules('chess') }; },
    reversi: () => { const pz = J('reversi-emerald-puzzles'), l = J('reversi-emerald-lessons') || {}; return { pz: cntPos(pz), st: starsOf(pz), ls: Object.entries(l).filter(([k, v]) => !k.startsWith('drill:') && v && v.clear).length, op: Object.keys(l).filter(k => k.startsWith('drill:')).length, dl: daily('reversi-emerald-daily'), rt: rated('reversi-rated-v1'), ru: rules('reversi') }; },
    go: () => { const pz = J('aicoding-go-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-go-lessons')), op: cntClear(J('aicoding-go-open'), 'pass'), dl: daily('aicoding-go-daily'), rt: rated('aicoding-go-rated'), ru: rules('go') }; },
    gomoku: () => ({ pz: cntPos(J('aicoding-gomoku-puzzles')), ls: cntClear(J('aicoding-gomoku-lessons')), op: cntClear(J('aicoding-gomoku-open'), 'pass'), dl: daily('aicoding-gomoku-daily'), rt: rated('aicoding-gomoku-rated'), ru: rules('gomoku') }),
    checkers: () => { const pz = J('aicoding-checkers-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-checkers-lessons')), op: cntClear(J('aicoding-checkers-open'), 'pass'), dl: daily('aicoding-checkers-daily'), rt: rated('aicoding-checkers-rated'), ru: rules('checkers') }; },
    hex: () => { const pz = J('aicoding-hex-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-hex-lessons')), op: cntClear(J('aicoding-hex-open'), 'pass'), dl: daily('aicoding-hex-daily'), rt: rated('aicoding-hex-rated'), ru: rules('hex') }; },
    fanorona: () => { const pz = J('aicoding-fanorona-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-fanorona-lessons')), op: cntClear(J('aicoding-fanorona-open'), 'pass'), dl: daily('aicoding-fanorona-daily'), rt: rated('aicoding-fanorona-rated'), ru: rules('fanorona') }; },
    alquerque: () => { const pz = J('aicoding-alquerque-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-alquerque-lessons')), dl: daily('aicoding-alquerque-daily'), rt: rated('aicoding-alquerque-rated'), ru: rules('alquerque') }; },
    shanghai: () => { const d = J('aicoding-shanghai') || {}, cs = Object.values(d.cs || {}); return { pz: cntPos(d.st) + cs.reduce((a, c) => a + cntPos(c.st), 0), st: starsOf(d.st) + cs.reduce((a, c) => a + starsOf(c.st), 0), ru: rules('shanghai') }; },   // (2026-11-14: + the 10 scene courses, cs[<id>])
    hitblow: () => ({ dl: daily('aicoding-hitblow-daily'), rt: rated('atlas-rated-hitblow') }),   // (3D only, 2026-11-16: 今日の一問 EASY / HARD — a day counts when either is solved)
    peg: () => { const pz = J('aicoding-peg-pz'), g = (J('aicoding-peg') || {}).goal || {}, b = Object.values(g);   // goal: { board: { b: fewest left (no hint), pf } } (2026-11-14)
      return { pz: cntPos(pz), st: starsOf(pz), dl: daily('aicoding-peg-daily'), ru: rules('peg'), pg: { g3: b.filter(x => x.b <= 3).length, g1: b.filter(x => x.b === 1).length, pf: b.filter(x => x.pf).length } }; },
    amazons: () => { const pz = J('aicoding-amazons-puzzles2'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-amazons-lessons')), dl: daily('aicoding-amazons-daily'), rt: rated('aicoding-amazons-rated'), ru: rules('amazons') }; },
    ludo: () => { const ls = J('aicoding-ludo-lessons') || {}; return { ls: Object.keys(ls).filter(k => typeof ls[k] === 'number' ? ls[k] >= 75 : !!(ls[k] && ls[k].pass)).length, rt: rated('aicoding-ludo-rated'), ru: rules('ludo') || !!J('aicoding-ludo-rules-ludo') || !!J('aicoding-ludo-rules-pachisi') }; },
    senet: () => { const pz = J('aicoding-senet-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-senet-lessons')), rt: rated('aicoding-senet-rated'), ru: rules('senet') }; },
    ur: () => { const pz = J('aicoding-ur-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-ur-lessons')), rt: rated('aicoding-ur-rated'), ru: rules('ur') }; },
    agon: () => { const pz = J('aicoding-agon-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-agon-lessons')), op: cntClear(J('aicoding-agon-open'), 'pass'), dl: daily('aicoding-agon-daily'), rt: rated('aicoding-agon-rated'), ru: rules('agon') }; },
    ugolki: () => { const pz = J('aicoding-ugolki-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-ugolki-lessons')), op: cntClear(J('aicoding-ugolki-open'), 'pass'), dl: daily('aicoding-ugolki-daily'), rt: rated('aicoding-ugolki-rated'), ru: rules('ugolki') }; },
    konane: () => { const pz = J('aicoding-konane-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-konane-lessons')), dl: daily('aicoding-konane-daily'), rt: rated('aicoding-konane-rated'), ru: rules('konane') }; },
    latrunculi: () => { const pz = J('aicoding-latrunculi-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-latrunculi-lessons')), dl: daily('aicoding-latrunculi-daily'), rt: rated('aicoding-latrunculi-rated'), ru: rules('latrunculi') }; },
    foxgeese: () => { const pz = J('aicoding-foxgeese-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-foxgeese-lessons')), dl: daily('aicoding-foxgeese-daily'), rt: rated('aicoding-foxgeese-rated'), ru: rules('foxgeese') }; },
    patolli: () => { const pz = J('aicoding-patolli-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-patolli-lessons')), dl: daily('aicoding-patolli-daily'), rt: rated('aicoding-patolli-rated'), ru: rules('patolli') }; },
    tafl: () => { const pz = J('aicoding-tafl-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-tafl-lessons')), op: cntClear(J('aicoding-tafl-open'), 'pass'), dl: daily('aicoding-tafl-daily'), rt: rated('aicoding-tafl-rated'), ru: rules('tafl') }; },
    janggi: () => { const pz = J('aicoding-janggi-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-janggi-lessons')), dl: daily('aicoding-janggi-daily'), rt: rated('aicoding-janggi-rated'), ru: rules('janggi') }; },
    xiangqi: () => { const pz = J('aicoding-xiangqi-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-xiangqi-lessons')), op: cntClear(J('aicoding-xiangqi-open'), 'pass'), dl: daily('aicoding-xiangqi-daily'), rt: rated('aicoding-xiangqi-rated'), ru: rules('xiangqi') }; },
    morris: () => { const pz = J('aicoding-morris-puzzles2'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-morris-lessons')), op: cntClear(J('aicoding-morris-open'), 'pass'), dl: daily('aicoding-morris-daily'), rt: rated('aicoding-morris-rated'), ru: rules('morris') }; },
    mancala: () => ({ pz: cntPos(J('aicoding-mancala-v1-puzzles')), ls: cntClear(J('aicoding-mancala-v1-lessons')), dl: daily('aicoding-mancala-v1-daily'), rt: rated('aicoding-mancala-v1-online'), ru: rules('mancala') }),
    backgammon: () => ({ pz: cntPos(J('aicoding-backgammon-v2-puzzles')), ls: cntClear(J('aicoding-backgammon-v2-lessons'), 'pass'), op: cntClear(J('aicoding-backgammon-v2-open'), 'pass'), dl: daily('aicoding-backgammon-v2-daily'), rt: rated('aicoding-backgammon-v2-online'), ru: rules('backgammon') }),
    connect4: () => { const pz = J('aicoding-connect4-v2-puzzles2'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-connect4-v2-lessons')), dl: daily('aicoding-connect4-v2-daily'), rt: rated('c4-rated-v1'), ru: rules('connect4') }; },
    dots: () => { const pz = J('dots-puzzles-v2'); return { pz: cntPos(pz), st: pz ? Object.values(pz).reduce((s, v) => s + (v >= 1 ? 3 : v >= .5 ? 2 : v > 0 ? 1 : 0), 0) : 0, ls: cntClear(J('dots-lessons-v2')), op: J('dots-openings-v1') ? Object.keys(J('dots-openings-v1')).length : 0, dl: daily('dots-daily-v1'), rt: rated('dots-rated-v1'), ru: rules('dots') || !!J('dots-rules-v1') }; },
    samegame: () => {
      const D = J('samegame-pop-v1') || {}, st = D.st || {}, dl = D.dl || {};   // st: 'theme.j' → stars 1-3; dl: date → { pe, p, ph: { left ≥ 0 once played }, b/o/f/v: { a: plays } }
      const played = r => !!r && (['pe', 'p', 'ph'].some(k => r[k] && r[k].left >= 0) || ['b', 'o', 'f', 'v'].some(k => r[k] && r[k].a > 0));
      const days = Object.keys(dl).filter(ds => played(dl[ds])).sort();
      let best = 0, run = 0, prev = null;
      for (const ds of days) { const p = prev && new Date(Date.parse(prev) + 864e5).toISOString().slice(0, 10); run = p === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
      return { pz: Object.values(st).filter(v => v > 0).length, st: Object.values(st).reduce((a, v) => a + (v || 0), 0), dl: { days: days.length, streak: prev && daysSince(prev) <= 1 ? run : 0, best }, ru: rules('samegame') || !!(D.tut && D.tut.basic) };
    },
    jailbreak: () => {
      const D = J('jailbreak-slide-v1') || {}, st = D.st || {}, dl = D.dl || {};   // st: 'c<idx>' / '<mode>.<j>' → stars 1-3; dl: date → { e, m, h: { md > 0 once escaped }, sl: { a: plays } }
      const played = r => !!r && (['e', 'm', 'h'].some(k => r[k] && r[k].md > 0) || (r.sl && r.sl.a > 0));
      const days = Object.keys(dl).filter(ds => played(dl[ds])).sort();
      let best = 0, run = 0, prev = null;
      for (const ds of days) { const p = prev && new Date(Date.parse(prev) + 864e5).toISOString().slice(0, 10); run = p === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
      return { pz: Object.values(st).filter(v => v > 0).length, st: Object.values(st).reduce((a, v) => a + (v || 0), 0), dl: { days: days.length, streak: prev && daysSince(prev) <= 1 ? run : 0, best }, ru: rules('jailbreak') || !!(D.tut && D.tut.basic) };
    },
    blackjack: () => {   // rounds played (all variants), lessons passed
      const D = J('aicoding-blackjack') || {}, st = D.stats || {};
      const hands = Object.values(st).reduce((a, v) => a + ((v && v.hands) || 0), 0);
      return { hd: hands, ls: cntClear(J('aicoding-blackjack-lessons'), 'pass'), ru: rules('blackjack') };
    },
    baccarat: () => {   // coups played (all variants), lessons passed
      const D = J('aicoding-baccarat') || {}, st = D.stats || {};
      const hands = Object.values(st).reduce((a, v) => a + ((v && v.hands) || 0), 0);
      return { hd: hands, ls: cntClear(J('aicoding-baccarat-lessons'), 'pass'), ru: rules('baccarat') };
    },
    poker: () => {   // hands played (all games), lessons passed
      const D = J('aicoding-poker') || {}, st = D.stats || {};
      const hands = Object.values(st).reduce((a, v) => a + ((v && v.hands) || 0), 0);
      return { hd: hands, ls: cntClear(J('aicoding-poker-lessons'), 'pass'), ru: rules('poker') };
    },
    solitaire: () => {   // daily deals won (date → { variant: { t, m } }), total wins across variants and difficulties
      const D = J('aicoding-solitaire') || {}, dl = D.daily || {}, st = D.stats || {};
      const days = Object.keys(dl).filter(ds => dl[ds] && Object.keys(dl[ds]).length).sort();
      let best = 0, run = 0, prev = null;
      for (const ds of days) { const p = prev && new Date(Date.parse(prev) + 864e5).toISOString().slice(0, 10); run = p === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
      const won = Object.values(st).reduce((a, v) => a + Object.values(v || {}).reduce((b, r) => b + ((r && r.w) || 0), 0), 0);
      return { dl: { days: days.length, streak: prev && daysSince(prev) <= 1 ? run : 0, best }, sw: won, ru: rules('solitaire') };
    },
    speedsudoku: () => {
      const D = (J('mainichi-sudoku-v1') || {}).sp || {}, d = D.d || {}, c = Object.fromEntries(Object.entries(D.cc || {}).filter(([k]) => k[0] === 's'));   // course records v2 (sp.cc, keys start with the course id)
      const days = Object.keys(d).filter(ds => ['30', '60', '90'].some(k => d[ds][k] && d[ds][k].m)).sort();
      let best = 0, run = 0, prev = null;
      for (const ds of days) { const p = prev && new Date(new Date(prev).getTime() + 864e5).toISOString().slice(0, 10); run = p === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
      return { pz: Object.keys(c).length, st: Object.values(c).reduce((a, v) => a + (v.s || 0), 0), dl: { days: days.length, streak: run, best } };
    },
    sudoku: () => {
      const D = J('mainichi-sudoku-v1') || {}, dly = D.daily || {};
      const medals = Object.keys(dly).filter(ds => ['e', 'm', 'h'].some(k => dly[ds][k] && !dly[ds][k].late)).length;
      const col = Object.keys(D.col || {}).length, vcol = Object.keys(D.vcol || {}).length;
      return { pz: col + vcol, st: Object.values(D.col || {}).reduce((s, v) => s + (v.s || 0), 0), sdm: medals, sdc: col, sdv: vcol, sdi: Object.keys(D.icons || {}).length, dl: { days: medals, streak: 0, best: 0 } };
    },
  };

  function progress(id) {
    const g = GAMES.find(x => x.id === id), r = (READ[id] || (() => ({})))();
    const pp = (J(KEY) || {}).plays || {}; r.p3 = pp[id] || { n: 0, w: 0, best: 0 };
    const parts = [];
    if (g.total.pz) parts.push(Math.min(1, (r.pz || 0) / g.total.pz));
    if (g.total.ls) parts.push(Math.min(1, (r.ls || 0) / g.total.ls));
    const play = (r.dl ? r.dl.days : 0) + (r.rt ? r.rt.n : 0) + r.p3.n;
    parts.push(Math.min(1, play / 30));
    r.pct = Math.round(100 * parts.reduce((a, b) => a + b, 0) / parts.length);
    r.touched = !!((r.pz || 0) + (r.ls || 0) + (r.op || 0) + play || r.ru);
    return r;
  }
  function allProgress() { const o = {}; GAMES.forEach(g => { o[g.id] = progress(g.id); }); return o; }

  /* ---------------- achievements ---------------- */
  // tier 0 bronze · 1 silver · 2 gold · 3 platinum  → coins
  const TIER_COINS = [50, 120, 300, 800];
  // what only the portal loads (the 3D-table adapters' level counts, the gacha's item count) is remembered in 'atlas-ach-meta', so a
  // game page builds the same achievement list — and shows the same coins — as the portal (2026-11-09)
  function achMeta() {
    let m = {}; try { m = JSON.parse(localStorage.getItem('atlas-ach-meta') || '{}') || {}; } catch (e) {}
    m.l3 = m.l3 || {}; let ch = false;
    if (window.Atlas3D) GAMES.forEach(g => { const a = window.Atlas3D[g.id], L = a && (a.reward || a.levels); if (L && m.l3[g.id] !== L) { m.l3[g.id] = L; ch = true; } });   // (reward: the top level that counts for the awards — reversi's 天上 levels are a benchmark, outside them, 2026-11-14)
    if (window.AtlasArt && AtlasArt.items && m.art !== AtlasArt.items.length) { m.art = AtlasArt.items.length; ch = true; }
    if (ch) try { localStorage.setItem('atlas-ach-meta', JSON.stringify(m)); } catch (e) {}
    m.art = m.art || 0; return m;
  }
  function achievements(P, W) {
    P = P || allProgress(); W = W || load();
    const A = [], META = achMeta();
    const add = (gid, key, n, tier, have, need) => A.push({ id: (gid || 'all') + ':' + key + (n != null ? ':' + n : ''), gid, key, n, tier, have: Math.min(have, need), need, done: have >= need });
    const ladder = (gid, key, have, steps, all, allKey) => {
      steps.filter(s => !all || s < all).forEach((s, i) => add(gid, key, s, Math.min(i, 2), have, s));
      if (all) add(gid, allKey, null, 3, have, all);
    };
    GAMES.forEach(g => {
      const r = P[g.id], id = g.id;
      add(id, 'ru', null, 0, r.ru ? 1 : 0, 1);
      if (id === 'sudoku') {
        ladder(id, 'sdm', r.sdm, [1, 7, 30, 100]);
        ladder(id, 'sdc', r.sdc, [1, 50, 300], 1000, 'sdcAll');
        ladder(id, 'sdv', r.sdv, [1, 50], 300, 'sdvAll');
        ladder(id, 'sdi', r.sdi, [10, 100, 300]);
        return;
      }
      if (g.total.pz) ladder(id, 'pz', r.pz, [1, 10, 50, 100, 300], g.total.pz, 'pzAll');
      if (r.pg) {   // peg solitaire's goals, per board (6 with the pyramid; a game without hints): 3 or fewer left · one left · ◎ perfect
        const q = r.pg; add(id, 'pg3', 1, 0, q.g3, 1); add(id, 'pg3', 6, 1, q.g3, 6); add(id, 'pg1', 1, 1, q.g1, 1); add(id, 'pg1', 6, 2, q.g1, 6); add(id, 'pgpf', 1, 2, q.pf, 1); add(id, 'pgpf', 6, 3, q.pf, 6);
      }
      if (g.total.ls) { add(id, 'ls1', null, 0, r.ls, 1); add(id, 'lsAll', null, 2, r.ls, g.total.ls); }
      if (g.tags.includes('openings')) ladder(id, 'op', r.op || 0, [1, 10]);
      if (g.tags.includes('daily')) { ladder(id, 'dd', r.dl.days, [1, 7, 30]); add(id, 'st', 7, 2, r.dl.best, 7); }
      if (META.l3[id]) {          // played on the portal's 3D table (the level count: the portal's adapter, or remembered from it)
        ladder(id, 'pw', r.p3.w + (r.p3.sw || 0), [1, 10]);
        const L = META.l3[id]; [Math.ceil(L / 2), L - 2, L].forEach((lv, i) => add(id, 'pv', lv, i + 1, r.p3.best >= lv ? 1 : 0, 1));
      }
      if (g.tags.includes('rated')) {
        const rt = r.rt || { n: 0, w: 0, r: 0, placed: false };
        add(id, 'pl', null, 0, rt.placed ? 1 : 0, 1);
        ladder(id, 'rw', rt.w, [1, 10, 50]);
        add(id, 'rr', 1500, 2, rt.r, 1500);
        add(id, 'rr', 1800, 3, rt.r, 1800);
      }
    });
    const touched = GAMES.filter(g => P[g.id].touched).length;
    ladder(null, 'gg', touched, [1, 3, 5], GAMES.length, 'ggAll');
    const owned = (W.owned || []).length;
    ladder(null, 'gi', owned, [10, 30, 60], META.art, 'giAll');
    ladder(null, 'gp', W.pulls || 0, [1, 10, 50, 100]);
    [[1, 0], [10, 0], [50, 1], [100, 2], [300, 3]].forEach(([n, tier]) => add(null, 'tk', n, tier, W.talks || 0, n));   // talking with your Atlamo (the profile / dress-up talk, atlas/avtalk.js — 2026-11-15)
    const doneN = A.filter(a => a.done).length;
    ladder(null, 'ga', doneN, [10, 30, 60, 100]);
    return A;
  }

  /* ---------------- profile & wallet ---------------- */
  const KEY = 'atlas-v1';
  function load() {
    const d = J(KEY) || {};
    d.name = d.name || ''; d.owned = d.owned || []; d.spent = d.spent || 0; d.bonus = d.bonus || 0; d.pulls = d.pulls || 0;
    d.seen = d.seen || {}; d.plays = d.plays || {}; d.login = d.login || { last: '', streak: 0, total: 0 };
    d.av = d.av || { icon: 'av-dice-0', bg: 'b001', frame: 'f-none' };
    // the old 2D critter icons (i001…) were retired for the 3D avatars: everyone starts again from the starter creatures
    d.owned = d.owned.filter(id => !/^i\d{3}$/.test(id));
    if (!/^av-/.test(d.av.icon || '')) d.av.icon = window.AtlasArt ? AtlasArt.DEFAULT_ICON : 'av-dice-0';
    if (window.AtlasArt) AtlasArt.STARTER.forEach(id => { if (!d.owned.includes(id)) d.owned.push(id); });
    // one-time gift when the 3D avatars replaced the 2D icons (removed icons also lowered the item-collection awards)
    d.gifts = d.gifts || {};
    if (!d.gifts.av3d) { d.gifts.av3d = 1; d.bonus += 2000; save(d); }
    return d;
  }
  // record a finished game played on the portal's 3D table
  function recordPlay(d, id, res) {
    d.plays = d.plays || {}; const p = d.plays[id] = d.plays[id] || { n: 0, w: 0, best: 0 };
    // a solo game's win (a puzzle, a stage, peg solitaire …) is not a win over the AI (2026-11-16): kept apart (sw), so the
    // missions' "beat the AI" counts only real AI games; the 3D-win achievements still count both (w + sw)
    p.n++; if (res.win) { if (res.solo) p.sw = (p.sw || 0) + 1; else { p.w++; p.best = Math.max(p.best, res.level || 0); } }
    save(d);
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  // coins are derived, so nothing can be earned twice: achievements + login bonus + duplicate refunds − spent
  // (2026-11-14) a game's own play rewards, also derived: 上海 pays ¢10 for every ★ won on its stages (atlas/games/shanghai.js)
  // (2026-11-16) ヒット＆ブローのステージ: ¢10 for every ★ (atlas/games/hitblow.js, 'aicoding-hitblow-pz3d' { set: { i: ★ } })
  const hbStars = () => { const d = J('aicoding-hitblow-pz3d') || {}; let n = 0; for (const k in d) if (k[0] !== '_' && d[k] && typeof d[k] === 'object') for (const i in d[k]) n += +d[k][i] || 0; return n; };
  const PLAY_COINS = { hitblow: () => hbStars() * 10, shanghai: () => { const d = J('aicoding-shanghai') || {}; return (starsOf(d.st) + Object.values(d.cs || {}).reduce((a, c) => a + starsOf(c.st), 0)) * 10; } };
  const playCoins = () => Object.values(PLAY_COINS).reduce((s, f) => s + (f() || 0), 0);
  function coins(W, A) {
    const ach = A.filter(a => a.done).reduce((s, a) => s + TIER_COINS[a.tier], 0), pc = playCoins();
    return { earned: ach + W.bonus + pc, balance: ach + W.bonus + pc - W.spent, play: pc };
  }
  const LOGIN_DAY = 30, LOGIN_WEEK = 150;
  function claimLogin(W) {
    const t = ymd(Date.now());
    if (W.login.last === t) return null;
    const y = ymd(Date.now() - DAY);
    W.login.streak = W.login.last === y ? W.login.streak + 1 : 1;
    W.login.last = t; W.login.total++;
    const amt = LOGIN_DAY + (W.login.streak % 7 === 0 ? LOGIN_WEEK : 0);
    W.bonus += amt; save(W);
    return { amt, streak: W.login.streak };
  }

  /* ---------------- gacha & shop ---------------- */
  const GACHA = { one: 100, ten: 900, rates: [0.58, 0.28, 0.10, 0.035, 0.005], refund: [5, 15, 40, 120, 400] };
  const SHOP_PRICE = [80, 200, 500, 1500, 4000];
  function rollRarity(min = 0) {
    let x = Math.random(), r = 0;
    for (; r < 4; r++) { if (x < GACHA.rates[r]) break; x -= GACHA.rates[r]; }
    return Math.max(r, min);
  }
  function pull(W, count) {
    const cost = count === 10 ? GACHA.ten : GACHA.one * count;
    const res = [];
    for (let i = 0; i < count; i++) {
      const rar = rollRarity(count === 10 && i === 9 ? 2 : 0);   // 10-pull: last one SR or better
      const pool = AtlasArt.items.filter(it => it.rar === rar && it.id !== 'f-none' && !it.nogacha);   // (nogacha: the AI bosses' SR — won by beating them)
      const it = pool[Math.floor(Math.random() * pool.length)];
      const dup = W.owned.includes(it.id);
      if (dup) W.bonus += GACHA.refund[rar]; else W.owned.push(it.id);
      res.push({ id: it.id, rar, dup, refund: dup ? GACHA.refund[rar] : 0 });
    }
    W.spent += cost; W.pulls += count; save(W);
    return res;
  }
  // today's shop: 6 items (icons 3 · backgrounds 2 · a frame; one full row on PC, two rows of 3 on phones, 2026-11-06) picked from what you don't own, seeded by date (same for the whole day)
  function shop(W) {
    const t = ymd(Date.now()); let s = 0; for (const ch of t) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    const pool = AtlasArt.items.filter(it => it.rar <= 3 && it.id !== 'f-none' && !it.boss && !it.earn).slice();   // (the AI bosses: gacha / beating them only)
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const kinds = { icon: 3, bg: 2, frame: 1 }, out = [];
    for (const it of pool) if (kinds[it.kind] > 0) { kinds[it.kind]--; out.push({ id: it.id, price: SHOP_PRICE[it.rar] }); }
    return out;
  }
  function buy(W, id, price) { if (W.owned.includes(id)) return false; W.owned.push(id); W.spent += price; save(W); return true; }


  /* ---------------- one player name for every game ----------------
     The portal's profile name is used as the player name in all games: the online games' name keys
     ('<id>-online-name', pushed to their server when the online panel starts) and the daily-ranking
     names of Daily Sudoku / Speed Sudoku / SameGame POP!. A name changed inside a game comes back to the portal. */
  const NAME_GAMES = ['shogi', 'chess', 'reversi', 'checkers', 'go', 'gomoku', 'dots', 'morris', 'backgammon', 'connect4', 'mancala', 'hex', 'tafl', 'xiangqi', 'janggi'];
  const cleanName = (n, max) => String(n || '').replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, max || 16);
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  // apps: also the JSON save files of the sudoku / SameGame apps — only from the portal (never while that app is open)
  const TAG = '＠PORTAL';   // online games entered from the portal (3D skin) show the player as "name＠PORTAL"
  const untag = n => String(n || '').replace(/[＠@]PORTAL$/i, '');
  function shareName(name, apps, here) {
    name = cleanName(untag(name)); if (!name) return;
    NAME_GAMES.forEach(g => { const v = g === here && /[?&]skin=atlas/.test(location.search) ? cleanName(name, 16 - TAG.length) + TAG : name; if (lsGet(g + '-online-name') !== v) lsSet(g + '-online-name', v); });
    if (!apps) return;
    const n12 = name.slice(0, 12);
    const sd = J('mainichi-sudoku-v1'); if (sd && typeof sd === 'object') { sd.prof = sd.prof || {}; if (sd.prof.name !== n12) { sd.prof.name = n12; lsSet('mainichi-sudoku-v1', JSON.stringify(sd)); } }
    const sg = J('samegame-pop-v1'); if (sg && typeof sg === 'object' && sg.name !== n12) { sg.name = n12; lsSet('samegame-pop-v1', JSON.stringify(sg)); }
    const jb = J('jailbreak-slide-v1'); if (jb && typeof jb === 'object' && jb.name !== n12) { jb.name = n12; lsSet('jailbreak-slide-v1', JSON.stringify(jb)); }
  }
  // on a game page: take the portal name now; when the player renames themselves in this game, keep it for the portal too
  (function () {
    const here = (location.pathname.match(/\/([a-z0-9-]+)\/(?:index\.html)?$/) || [])[1];
    if (!here || here === 'atlas' || !NAME_GAMES.includes(here)) return;
    const W0 = J(KEY) || {}, start = cleanName(W0.name);
    if (start) shareName(start, false, here);
    const key = here + '-online-name', seen = lsGet(key);
    const back = () => {
      if (lsGet(key) === seen) return;
      const now = cleanName(untag(lsGet(key))); if (!now) return;
      const d = J(KEY) || {}; if (d.name === now) return;
      d.name = now; lsSet(KEY, JSON.stringify(d)); shareName(now, false, here);
    };
    addEventListener('pagehide', back); document.addEventListener('visibilitychange', () => { if (document.hidden) back(); });
  })();
  window.Atlas = { LANGS, GAMES, CATS, sfxOn, UPDATES, updText, TAGS, TIER_COINS, GACHA, SHOP_PRICE, badges, badgeText, updatedOn, news, byUpdate, recordPlay, shareName, lastUpdate, progress, allProgress, achievements, load, save, coins, claimLogin, pull, shop, buy, ymd, daysSince };
})();

/* =====================================================================
   Achievement banners (Steam-style) on every page that loads this file —
   the games and the portal. Progress is read from localStorage as the
   games write it; anything newly completed slides in at the corner.
   The first run only records what is already done (no flood of old ones).
   ===================================================================== */
(function () {
  'use strict';
  const A = window.Atlas; if (!A || typeof document === 'undefined' || window.ATLAS_NO_ACH) return;   // ATLAS_NO_ACH: pages that only read the registry (the site's top page)
  const QUIET = /\/atlas\/(index\.html)?$/.test(location.pathname);
  const SEEN = 'atlas-ach-seen', BASE = (document.currentScript && document.currentScript.src) || location.href;
  const getSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch (e) { return null; } };
  const setSeen = a => { try { localStorage.setItem(SEEN, JSON.stringify(a)); } catch (e) {} };
  const doneIds = () => { try { return A.achievements().filter(a => a.done); } catch (e) { return []; } };
  let I18N = window.ATLAS_I18N, loading = null;
  const needText = () => I18N ? Promise.resolve() : (loading || (loading = new Promise(res => {
    const s = document.createElement('script'); s.src = new URL('../atlas/i18n.js?v=11nn', BASE).href; s.onload = s.onerror = () => { I18N = window.ATLAS_I18N; res(); }; document.head.appendChild(s);
  })));
  const lang = () => { const raw = document.documentElement.lang || localStorage.getItem('aicoding-lang') || 'ja', lo = raw.toLowerCase(); const l = /^zh-(tw|hk|mo|hant)/.test(lo) ? 'zh-TW' : lo.slice(0, 2); return A.LANGS && A.LANGS.includes(l) ? l : (l in (I18N || {}) ? l : 'en'); };
  const tr = (k, v) => { const L = I18N || {}, l = lang(); let s = (L[l] && L[l][k]) ?? (L.en && L.en[k]) ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const MEDAL = [['#e8a46a', '#b8703a'], ['#e3e8f0', '#9aa6b8'], ['#ffd84d', '#d79a1c'], ['#c9f1ff', '#7f8cff']];
  const medal = tier => { const c = MEDAL[tier] || MEDAL[0]; return `<svg viewBox="0 0 46 46" width="46" height="46"><path d="M14 2h7l4 14h-7zM32 2h-7l-4 14h7z" fill="${tier === 3 ? '#a17cff' : '#ff6b6b'}"/><circle cx="23" cy="28" r="15" fill="${c[1]}"/><circle cx="23" cy="27" r="13" fill="${c[0]}"/><path d="M23 19l2.4 5l5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" opacity=".85"/></svg>`; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const UNLOCK = { ja: '実績解除！', en: 'Achievement unlocked!', zh: '成就解锁！', ko: '업적 달성!', es: '¡Logro desbloqueado!', fr: 'Succès débloqué !', pt: 'Conquista desbloqueada!', de: 'Erfolg freigeschaltet!', hi: 'उपलब्धि अनलॉक!', ar: 'تم فتح إنجاز!', ru: 'Достижение получено!', 'zh-TW': '解鎖成就！', id: 'Pencapaian terbuka!', tr: 'Başarım açıldı!' };

  let host = null, queue = [], showing = false;
  function css() {
    const st = document.createElement('style');
    st.textContent = `.atlas-ach{position:fixed;z-index:2147483000;right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;pointer-events:none;font-family:'Zen Maru Gothic','Fredoka','Noto Sans Devanagari','Noto Sans Arabic',system-ui,sans-serif}
.atlas-ach .b{pointer-events:auto;display:flex;align-items:center;gap:12px;width:min(360px,calc(100vw - 32px));padding:10px 14px 10px 10px;border-radius:20px;background:#fffdf7;border:2px solid #fff;box-shadow:0 5px 0 #efe3c8,0 18px 34px -14px rgba(60,30,0,.55);color:#2b3044;text-decoration:none;transform:translateX(120%);opacity:0;transition:transform .5s cubic-bezier(.3,1.35,.5,1),opacity .3s;overflow:hidden;position:relative}
.atlas-ach .b.on{transform:none;opacity:1}
.atlas-ach .b.out{transform:translateX(120%);opacity:0;transition:transform .35s ease-in,opacity .35s}
.atlas-ach .b::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.85) 45%,transparent 60%);transform:translateX(-120%);animation:atlasShine 1.1s .45s ease-out forwards;pointer-events:none}
@keyframes atlasShine{to{transform:translateX(120%)}}
.atlas-ach .md{flex:none;width:46px;height:46px;animation:atlasPop .6s .25s cubic-bezier(.3,1.6,.5,1) both}
@keyframes atlasPop{from{transform:scale(.3) rotate(-30deg)}to{transform:none}}
.atlas-ach .tx{flex:1;min-width:0;line-height:1.3}
.atlas-ach .k{font-size:11px;font-weight:900;letter-spacing:.08em;color:#e09a00}
.atlas-ach .n{font-size:15px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.atlas-ach .g{display:flex;align-items:center;gap:5px;font-size:11.5px;color:#6a7088;font-weight:700}
.atlas-ach .g img{width:16px;height:16px;border-radius:4px}
.atlas-ach .c{flex:none;display:flex;align-items:center;gap:4px;font:700 15px 'Fredoka',sans-serif;color:#a66a00;background:#fff3c4;border-radius:99px;padding:4px 10px 4px 5px}
.atlas-ach .c i{width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3a8,#ffc928 45%,#e09a00)}
[dir=rtl] .atlas-ach{right:auto;left:max(16px,env(safe-area-inset-left))}[dir=rtl] .atlas-ach .b{transform:translateX(-120%)}[dir=rtl] .atlas-ach .b.on{transform:none}
@media (max-width:600px){.atlas-ach{right:50%;bottom:auto;top:max(10px,env(safe-area-inset-top));transform:translateX(50%)}.atlas-ach .b{transform:translateY(-140%)}.atlas-ach .b.out{transform:translateY(-140%)}}`;
    document.head.appendChild(st);
  }
  function chime() {   // a soft two-note chime; skipped silently where audio isn't allowed yet
    try {
      if (A.sfxOn && !A.sfxOn()) return;
      const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state !== 'running') return;
      [[784, 0], [1175, .11]].forEach(([f, d]) => { const o = C.createOscillator(), g = C.createGain(), t = C.currentTime + d; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .5); o.connect(g).connect(C.destination); o.start(t); o.stop(t + .55); });
    } catch (e) {}
  }
  addEventListener('pointerdown', () => { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); } catch (e) {} }, { once: true, capture: true });
  function next() {
    if (showing || !queue.length) return;
    showing = true;
    const a = queue.shift();
    needText().then(() => {
      if (!host) { css(); host = document.createElement('div'); host.className = 'atlas-ach'; document.body.appendChild(host); }
      const g = a.gid && A.GAMES.find(x => x.id === a.gid), l = lang();
      const portal = new URL('../atlas/#ach', BASE).href;
      const b = document.createElement('a'); b.className = 'b'; b.href = portal; b.setAttribute('role', 'status');
      b.innerHTML = `<span class="md">${medal(a.tier)}</span><span class="tx"><span class="k">${UNLOCK[l] || UNLOCK.en}</span><div class="n">${esc(tr('a.' + a.key, { n: a.n != null ? a.n.toLocaleString() : '' }))}</div>${g ? `<span class="g"><img src="${new URL('../' + g.icon, BASE).href}" alt="">${esc(g.name[l] || g.name.en)}</span>` : ''}</span><span class="c"><i></i>+${A.TIER_COINS[a.tier]}</span>`;
      host.appendChild(b); chime();
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add('on')));
      const hide = () => { b.classList.add('out'); setTimeout(() => { b.remove(); showing = false; next(); }, 380); };
      const tm = setTimeout(hide, 4600); b.onmouseenter = () => clearTimeout(tm);
      b.onmouseleave = () => setTimeout(hide, 1200);
    });
  }
  function check() {
    if (document.hidden) return;
    const done = doneIds(), seen = getSeen();
    if (!seen) { setSeen(done.map(a => a.id)); return; }          // first run on this device: just remember
    const S = new Set(seen), fresh = done.filter(a => !S.has(a.id));
    if (!fresh.length) return;
    fresh.forEach(a => S.add(a.id)); setSeen([...S]);
    if (QUIET) return;                                              // the portal shows its own "new achievements" sheet
    fresh.sort((x, y) => y.tier - x.tier).slice(0, 4).forEach(a => queue.push(a));
    next();
  }
  window.AtlasAchievements = { check };
  const start = () => { check(); setInterval(check, 2500); addEventListener('storage', e => { if (!e.key || e.key !== SEEN) setTimeout(check, 50); }); document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(check, 300); }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 800)); else setTimeout(start, 800);
})();
