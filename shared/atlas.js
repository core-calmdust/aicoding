/* =====================================================================
   World Board Game Atlas — shared core  (shared/atlas.js)
   One file that every 世界のボドゲ大全 page can load. It holds:
     • GAMES      the series registry (names in 10 languages, icon, dates)
     • UPDATES    the changelog — newest first; the portal shows the games
                  whose latest entry is newest at the top
     • TAGS / badges()   the common badge & tag rules (see claude/atlas-portal-spec.md)
     • progress() reads each game's own localStorage records (read-only)
     • achievements()    achievement list + which are unlocked
     • wallet / profile  coins, owned items, gacha (key: 'atlas-v1')
   HOW TO ADD A GAME: add one entry to GAMES, a reader to READ, and an
   UPDATES line. Achievements are generated from the reader's numbers.
   ===================================================================== */
(function () {
  'use strict';
  const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
  const N = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });

  /* ---------------- registry ---------------- */
  // tags: ai online rated daily lessons puzzles openings variants netrank mobile
  const GAMES = [
    { id: 'shogi', cat: 'chess', store: ['shogi-kaya-', 'shogi-rated-v1', 'shogi-online-name'], href: 'shogi/', color: '#e8a33d', released: '2026-10-18', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 613, ls: 15 },
      name: N('将棋', 'Shogi', '将棋', '쇼기', 'Shogi', 'Shogi', 'Shogi', 'Shogi', 'शोगी', 'شوغي') },
    { id: 'chess', cat: 'chess', store: ['aicoding-chess', 'chess-online-name'], href: 'chess/', color: '#5a6b8c', released: '2026-10-19', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 445, ls: 20 },
      name: N('チェス', 'Chess', '国际象棋', '체스', 'Ajedrez', 'Échecs', 'Xadrez', 'Schach', 'शतरंज', 'الشطرنج') },
    { id: 'reversi', cat: 'line', store: ['reversi-emerald-', 'reversi-rated-v1', 'reversi-online-name'], href: 'reversi/', color: '#22aa74', released: '2026-10-17', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 1000, ls: 9 },
      name: N('リバーシ', 'Reversi', '黑白棋', '리버시', 'Reversi', 'Reversi', 'Reversi', 'Reversi', 'रिवर्सी', 'ريفيرسي') },
    { id: 'sudoku', cat: 'puzzle', store: ['mainichi-sudoku-v1'], href: 'sudoku/', color: '#ff8fc7', released: '2025-06-10', premium: 1, tags: ['daily', 'puzzles', 'variants', 'netrank', 'mobile'], total: { pz: 1300 },
      name: N('まいにち数独', 'Daily Sudoku', '每日数独', '매일 스도쿠', 'Sudoku Diario', 'Sudoku du jour', 'Sudoku Diário', 'Tägliches Sudoku', 'रोज़ का सुडोकू', 'سودوكو كل يوم') },
    { id: 'speedsudoku', cat: 'puzzle', store: ['mainichi-sudoku-v1'], href: 'speed-sudoku/', color: '#ff7a3d', released: '2026-10-21', premium: 1, tags: ['daily', 'puzzles', 'variants', 'netrank', 'mobile'], total: { pz: 500 },
      name: N('すぴーど数独', 'Speed Sudoku', '速度数独', '스피드 스도쿠', 'Sudoku Veloz', 'Sudoku Express', 'Sudoku Veloz', 'Speed-Sudoku', 'स्पीड सुडोकू', 'سودوكو السرعة') },
    { id: 'samegame', cat: 'puzzle', store: ['samegame-pop-v1'], href: 'samegame/', color: '#2e6f8e', released: '2026-10-21', premium: 1, tags: ['daily', 'puzzles', 'netrank', 'mobile'], total: { pz: 400 },
      name: N('さめが〜め POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!', 'SameGame POP!') },
    { id: 'checkers', cat: 'chess', store: ['aicoding-checkers', 'checkers-online-name'], href: 'checkers/', color: '#8e2a3c', released: '2026-10-21', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 500, ls: 13 },
      name: N('チェッカー', 'Checkers', '跳棋（国际跳棋·英式）', '체커', 'Damas', 'Dames anglaises', 'Damas', 'Dame', 'चेकर्स', 'الداما') },
    { id: 'gomoku', cat: 'line', store: ['aicoding-gomoku', 'gomoku-online-name'], href: 'gomoku/', color: '#c48a4a', released: '2026-10-19', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 500, ls: 12 },
      name: N('五目並べ・連珠', 'Gomoku & Renju', '五子棋・连珠', '오목・렌주', 'Gomoku y Renju', 'Gomoku et Renju', 'Gomoku e Renju', 'Gomoku & Renju', 'गोमोकु और रेंजू', 'غوموكو ورينجو') },
    { id: 'dots', cat: 'line', store: ['dots-puzzles-', 'dots-lessons-', 'dots-openings-', 'dots-daily-', 'dots-rated-v1', 'dots-rules-', 'dots-online-name'], href: 'dots/', color: '#4cc3ff', released: '2026-10-18', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 450, ls: 15 },
      name: N('ドット・アンド・ボックス', 'Dots and Boxes', '点格棋', '도트 앤 박스', 'Puntos y cajas', 'Pipopipette', 'Pontinhos', 'Käsekästchen', 'डॉट्स एंड बॉक्सेज़', 'النقاط والمربعات') },
    { id: 'connect4', cat: 'line', store: ['aicoding-connect4-v2', 'c4-rated-v1'], href: 'connect4/', color: '#ff6b6b', released: '2026-10-18', premium: 1, tags: ['ai', 'rated', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 306, ls: 23 },
      name: N('コネクトフォー', 'Connect Four', '四子棋', '커넥트 포', 'Conecta 4', 'Puissance 4', 'Lig 4', 'Vier gewinnt', 'कनेक्ट फ़ोर', 'أربعة في صف') },
    { id: 'mancala', cat: 'race', store: ['aicoding-mancala-v1'], href: 'mancala/', color: '#b98663', released: '2026-10-18', premium: 1, tags: ['ai', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 500, ls: 29 },
      name: N('マンカラ', 'Mancala', '播棋', '만칼라', 'Mancala', 'Mancala', 'Mancala', 'Mancala', 'मंकाला', 'مانكالا') },
    { id: 'backgammon', cat: 'race', store: ['aicoding-backgammon-v2'], href: 'backgammon/', color: '#a17cff', released: '2026-10-18', premium: 1, tags: ['ai', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 500, ls: 23 },
      name: N('バックギャモン', 'Backgammon', '西洋双陆棋', '백개먼', 'Backgammon', 'Backgammon', 'Gamão', 'Backgammon', 'बैकगैमन', 'طاولة الزهر') },
    { id: 'morris', cat: 'line', store: ['aicoding-morris', 'morris-online-name'], href: 'morris/', color: '#7552e0', released: '2026-10-18', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 1781, ls: 41 },
      name: N('ナイン・メンズ・モリス', "Nine Men's Morris", '九子棋', '나인 멘스 모리스', 'Molino', 'Jeu du moulin', 'Trilha', 'Mühle', 'नाइन मेन्स मोरिस', 'الطاحونة') },
  ];
  GAMES.forEach(g => { g.icon = 'images/icons/' + (g.id === 'speedsudoku' ? 'speed-sudoku' : g.id) + '.svg'; });
  // cat: home-grid category chip — chess (shogi/chess-like) · line (line-up & territory) · race (dice race & sowing) · puzzle
  const CATS = ['chess', 'line', 'race', 'puzzle'];
  // sound effects on/off for every page of the series (localStorage 'atlas-sfx': '0' = off)
  const sfxOn = () => { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } };
  // store: localStorage key prefixes that belong to the game. The shared account (shared/atlas-account.js)
  // syncs every key starting with one of them, plus each game's '-rules-seen' flag — so a new game only
  // has to list its prefixes here. Keys holding an in-progress game or device settings sync too (newest wins).

  /* ---------------- changelog (newest first) ---------------- */
  // Add a line whenever a game gets a visible update: [date, gameId, ja, en, { zh, ko, es, fr, pt, de, hi, ar }].
  // The 5th element is optional; missing languages fall back to en. Read the text with updText(u, lang).
  const UPDATES = [
    ['2026-10-21', 'samegame', "新作！同じ色のブロックをまとめて消す「さめが〜め POP!」。3段階のデイリーとデイリーBLITZ、8テーマ400ステージ、BLITZ・RISE・ORDER・FUSE・DIVEのアクションモード、ミッション30、オンラインランキング", "New! SameGame POP!: clear groups of same-coloured blocks. Daily puzzles in 3 difficulties plus a daily BLITZ, 400 stages in 8 themes, action modes (BLITZ, RISE, ORDER, FUSE, DIVE), 30 missions and online rankings", {"zh": "新作！消除同色方块组的「SameGame POP!」：三种难度的每日谜题与每日BLITZ、8个主题400关、BLITZ・RISE・ORDER・FUSE・DIVE动作模式、30个任务和在线排行榜", "ko": "신작! 같은 색 블록을 한꺼번에 지우는 「SameGame POP!」. 3단계 데일리와 데일리 BLITZ, 8테마 400스테이지, BLITZ·RISE·ORDER·FUSE·DIVE 액션 모드, 미션 30, 온라인 랭킹", "es": "¡Nuevo! SameGame POP!: elimina grupos de bloques del mismo color. Retos diarios en 3 dificultades y BLITZ diario, 400 fases en 8 temas, modos de acción (BLITZ, RISE, ORDER, FUSE, DIVE), 30 misiones y rankings en línea", "fr": "Nouveau ! SameGame POP! : fais disparaître les groupes de blocs de même couleur. Défis du jour en 3 niveaux et BLITZ du jour, 400 niveaux en 8 thèmes, modes action (BLITZ, RISE, ORDER, FUSE, DIVE), 30 missions et classements en ligne", "pt": "Novo! SameGame POP!: elimine grupos de blocos da mesma cor. Desafios diários em 3 dificuldades e BLITZ diário, 400 fases em 8 temas, modos de ação (BLITZ, RISE, ORDER, FUSE, DIVE), 30 missões e rankings online", "de": "Neu! SameGame POP!: Gruppen gleichfarbiger Blöcke abräumen. Tagesrätsel in 3 Stufen plus Tages-BLITZ, 400 Level in 8 Themen, Action-Modi (BLITZ, RISE, ORDER, FUSE, DIVE), 30 Missionen und Online-Ranglisten", "hi": "नया! SameGame POP!: एक ही रंग के ब्लॉकों के समूह हटाएँ। 3 कठिनाई वाली दैनिक पहेलियाँ और दैनिक BLITZ, 8 थीम में 400 स्टेज, एक्शन मोड (BLITZ, RISE, ORDER, FUSE, DIVE), 30 मिशन और ऑनलाइन रैंकिंग", "ar": "جديد! SameGame POP!: أزل مجموعات المكعبات ذات اللون الواحد. ألغاز يومية بثلاثة مستويات وBLITZ يومي، و400 مرحلة في 8 مواضيع، وأوضاع حركة (BLITZ وRISE وORDER وFUSE وDIVE)، و30 مهمة وتصنيفات عبر الإنترنت"}],
    ['2026-10-21', 'checkers', "チェッカーが新登場。学習型評価と終盤データベースのAI（15級〜五段の20段階）、Googleログインのレーティング戦、レッスン・定跡・パズル", "Checkers is here: an AI with a learned evaluation and endgame database (20 levels, 15 kyu to 5 dan), rated online games with Google sign-in, lessons, openings and puzzles", {"zh": "跳棋上线：学习型评估与残局库的AI（15级至五段共20级）、Google登录的等级分对战、课程、开局与谜题", "ko": "체커 등장: 학습형 평가와 엔드게임 DB를 갖춘 AI(15급~5단 20단계), Google 로그인 레이팅전, 레슨·정석·퍼즐", "es": "Llegan las damas: IA con evaluación aprendida y base de finales (20 niveles), partidas puntuadas en línea con Google, lecciones, aperturas y problemas", "fr": "Les dames anglaises arrivent : IA à évaluation apprise et base de finales (20 niveaux), parties classées en ligne avec Google, leçons, ouvertures et problèmes", "pt": "Chegaram as damas: IA com avaliação aprendida e base de finais (20 níveis), partidas ranqueadas online com Google, lições, aberturas e problemas", "de": "Dame ist da: KI mit gelernter Bewertung und Endspieldatenbank (20 Stufen), gewertete Online-Partien mit Google-Anmeldung, Lektionen, Eröffnungen und Aufgaben", "hi": "चेकर्स आ गया: सीखे हुए मूल्यांकन और एंडगेम डेटाबेस वाली AI (20 स्तर), Google साइन-इन से रेटेड ऑनलाइन खेल, पाठ, ओपनिंग और पहेलियाँ", "ar": "وصلت الداما: ذكاء اصطناعي بتقييم مُتعلَّم وقاعدة نهايات (20 مستوى)، مباريات مصنّفة عبر الإنترنت بتسجيل Google، دروس وافتتاحيات وألغاز"}],
    ['2026-10-21', 'mancala', "レッスンをルール別の攻略（カラハ・ノーマル・イージー・スンカ、29ステップ）に拡充。パズルは500問に、ステージ・★・メダル・称号つき", "Lessons expanded into strategy for each rule set (Kalah, Normal, Easy, Sunka; 29 steps). Puzzles grow to 500 with stages, stars, medals and titles", {"zh": "课程扩充为各规则攻略（卡拉哈・普通・简单・松卡，共29步）。谜题增至500道，附关卡・★・奖牌・称号", "ko": "레슨을 규칙별 공략(칼라・노멀・이지・숭카, 29단계)으로 확충. 퍼즐은 500문제로, 스테이지・★・메달・칭호 포함", "es": "Lecciones ampliadas con estrategia para cada regla (Kalah, Normal, Fácil, Sunka; 29 pasos). 500 problemas con fases, estrellas, medallas y títulos", "fr": "Leçons enrichies d’une stratégie pour chaque règle (Kalah, Normale, Facile, Sunka ; 29 étapes). 500 problèmes avec étapes, étoiles, médailles et titres", "pt": "Lições ampliadas com estratégia para cada regra (Kalah, Normal, Fácil, Sunka; 29 etapas). 500 problemas com fases, estrelas, medalhas e títulos", "de": "Lektionen mit Strategie für jede Regel (Kalah, Normal, Einfach, Sunka; 29 Schritte). 500 Rätsel mit Stufen, Sternen, Medaillen und Titeln", "hi": "हर नियम (कलाह, नॉर्मल, ईज़ी, सुंका) की रणनीति वाले 29 पाठ। 500 पहेलियाँ — स्टेज, ★, पदक और उपाधियों के साथ", "ar": "دروس موسّعة باستراتيجية كل قاعدة (كالاه، العادية، السهلة، سونكا؛ 29 خطوة). 500 لغز بمراحل ونجوم وميداليات وألقاب"}],
    ['2026-10-21', 'connect4', "レッスンを9コース23ステップに、パズルを306問に拡充。テーマ別・星とメダル・今日の一問", "Lessons grow to 23 steps in 9 courses and puzzles to 306, with themes, stars, medals and a daily puzzle", {"zh": "课程扩充到9门23步，谜题增至306道：主题分类、星级与奖牌、每日一题", "ko": "레슨을 9코스 23단계로, 퍼즐을 306문제로 확충. 테마별・별과 메달・오늘의 문제", "es": "Las lecciones crecen a 23 pasos en 9 cursos y los problemas a 306, con temas, estrellas, medallas y problema diario", "fr": "Leçons portées à 23 étapes en 9 parcours et problèmes à 306, avec thèmes, étoiles, médailles et problème du jour", "pt": "Lições ampliadas para 23 etapas em 9 cursos e problemas para 306, com temas, estrelas, medalhas e desafio diário", "de": "Lektionen auf 23 Schritte in 9 Kursen und Aufgaben auf 306 erweitert – mit Themen, Sternen, Medaillen und Tagesaufgabe", "hi": "पाठ 9 कोर्स में 23 चरणों तक और पहेलियाँ 306 तक बढ़ीं — थीम, सितारे, पदक और आज की पहेली", "ar": "توسيع الدروس إلى 23 خطوة في 9 مسارات والألغاز إلى 306، مع مواضيع ونجوم وميداليات ولغز اليوم"}],
    ['2026-10-21', 'backgammon', "PCは盤を横幅いっぱいに。振り返りに局面の特徴から選ぶ解説、駒の色も金・黒・赤・白から選べる", "Full-width board on PC, review commentary picked from the position, and checker colours (gold, black, red, white)", {"zh": "电脑上棋盘占满宽度。复盘中加入根据局面特点挑选的讲解，棋子颜色可选金・黑・红・白", "ko": "PC에서는 판을 가로 가득. 복기에 국면 특징에 맞춘 해설, 말 색도 금·검정·빨강·흰색 중 선택", "es": "Tablero a todo el ancho en PC, comentarios de repaso según la posición y colores de fichas (oro, negro, rojo, blanco)", "fr": "Plateau pleine largeur sur PC, commentaires de revue selon la position et couleurs des pions (or, noir, rouge, blanc)", "pt": "Tabuleiro em largura total no PC, comentários da revisão conforme a posição e cores das peças (ouro, preto, vermelho, branco)", "de": "Brett in voller Breite am PC, Analyse-Kommentare passend zur Stellung und Steinfarben (Gold, Schwarz, Rot, Weiß)", "hi": "PC पर पूरी चौड़ाई का बोर्ड, स्थिति के हिसाब से समीक्षा टिप्पणी, और मोहरों के रंग (सुनहरा, काला, लाल, सफ़ेद)", "ar": "لوحة بعرض الشاشة على الكمبيوتر، وتعليقات مراجعة حسب الوضع، وألوان للقطع (ذهبي، أسود، أحمر، أبيض)"}],
    ['2026-10-21', 'connect4', "振り返り解説が登場。完全読みで勝ち・負けの分かれ目、見逃した勝ちや奇数段・偶数段のコツを説明", "New review commentary: the perfect solver explains turning points, missed wins and odd/even-row tricks", {"zh": "新增复盘讲解：用完全计算说明胜负分歧点、错过的胜着和奇数行・偶数行的诀窍", "ko": "복기 해설 등장. 완전 읽기로 승패의 갈림길, 놓친 승리, 홀수 줄·짝수 줄 요령을 설명", "es": "Nuevos comentarios de repaso: el solucionador perfecto explica momentos clave, victorias perdidas y trucos de filas pares/impares", "fr": "Nouveaux commentaires de revue : le solveur parfait explique les tournants, les gains manqués et les astuces de rangées paires/impaires", "pt": "Novos comentários de revisão: o solucionador perfeito explica viradas, vitórias perdidas e truques de linhas pares/ímpares", "de": "Neue Analyse-Kommentare: der perfekte Löser erklärt Wendepunkte, verpasste Gewinne und Tricks mit geraden/ungeraden Reihen", "hi": "नई समीक्षा टिप्पणी: परफ़ेक्ट सॉल्वर निर्णायक मोड़, छूटी जीत और सम/विषम पंक्ति की तरकीबें समझाता है", "ar": "تعليقات مراجعة جديدة: الحلّال المثالي يشرح نقاط التحول والانتصارات الفائتة وحيل الصفوف الفردية والزوجية"}],
    ['2026-10-21', 'morris', "振り返り解説を1手ごとに（最善・疑問手・悪手の理由とコツ）。オンライン対戦にも対応", "Move-by-move review commentary (why a move is best, dubious or a mistake, with tips); online play too", {"zh": "逐手复盘讲解（最佳・疑问手・坏棋的理由和诀窍）。也支持在线对战", "ko": "한 수마다 복기 해설(최선·의문수·악수의 이유와 요령). 온라인 대전도 지원", "es": "Comentarios de repaso jugada a jugada (por qué es la mejor, dudosa o un error, con consejos); también juego en línea", "fr": "Commentaires de revue coup par coup (meilleur, douteux ou erreur, avec conseils) ; jeu en ligne aussi", "pt": "Comentários de revisão lance a lance (por que é o melhor, duvidoso ou erro, com dicas); jogo online também", "de": "Analyse-Kommentare Zug für Zug (warum bester Zug, zweifelhaft oder Fehler, mit Tipps); auch online spielbar", "hi": "हर चाल पर समीक्षा टिप्पणी (सबसे अच्छी, संदिग्ध या ग़लती क्यों, सुझावों के साथ); ऑनलाइन खेल भी", "ar": "تعليقات مراجعة لكل نقلة (لماذا هي الأفضل أو مشكوك فيها أو خطأ، مع نصائح)؛ واللعب عبر الإنترنت أيضًا"}],
    ['2026-10-21', 'mancala', "ルールをレッスン画面に統合し、ゲーム紹介ページも。レッスン・パズル一覧はミニ盤つきのカードに", "Rules merged into Lessons with a game intro page; lesson and puzzle lists as cards with mini boards", {"zh": "规则并入课程界面，并新增游戏介绍页。课程・谜题列表变成带迷你棋盘的卡片", "ko": "규칙을 레슨 화면에 통합하고 게임 소개 페이지도. 레슨·퍼즐 목록은 미니 보드가 있는 카드로", "es": "Reglas integradas en Lecciones con página de presentación; listas de lecciones y puzles como tarjetas con minitablero", "fr": "Règles intégrées aux Leçons avec page de présentation ; listes de leçons et de puzzles en cartes avec mini-plateau", "pt": "Regras integradas às Lições com página de apresentação; listas de lições e quebra-cabeças em cartões com minitabuleiro", "de": "Regeln in die Lektionen integriert, mit Einführungsseite; Lektionen- und Rätsellisten als Karten mit Mini-Brett", "hi": "नियम पाठों में, साथ में खेल परिचय पेज; पाठ और पहेली सूचियाँ अब मिनी बोर्ड वाले कार्ड", "ar": "دُمجت القواعد في الدروس مع صفحة تعريف باللعبة؛ وقوائم الدروس والألغاز بطاقات بلوحات مصغّرة"}],
    ['2026-10-21', 'shogi', "定跡をカテゴリ別に大幅拡充（初心者・中級・上級・特殊・流行・囲い・駒落ち）。CPUの戦型も指定できる", "Openings greatly expanded in category tabs (beginner to advanced, surprise, trending, castles, handicap); choose the CPU's strategy", {"zh": "定式按类别大幅扩充（初学・中级・高级・奇袭・流行・围法・让子）。还可指定电脑的战法", "ko": "정석을 카테고리별로 대폭 확충(초심자·중급·상급·특수·유행·성곽·접바둑). CPU 전법도 지정 가능", "es": "Aperturas muy ampliadas por categorías (de principiante a avanzado, sorpresa, de moda, castillos, hándicap); elige la estrategia de la CPU", "fr": "Ouvertures très enrichies par catégories (débutant à avancé, surprise, tendance, châteaux, handicap) ; choix de la stratégie du CPU", "pt": "Aberturas muito ampliadas por categorias (iniciante a avançado, surpresa, em alta, castelos, handicap); escolha a estratégia da CPU", "de": "Eröffnungen stark erweitert in Kategorien (Anfänger bis Fortgeschritten, Überraschung, Trend, Burgen, Vorgabe); Strategie der CPU wählbar", "hi": "शुरुआती चालें श्रेणियों में काफ़ी बढ़ीं (शुरुआती से उन्नत, सरप्राइज़, ट्रेंडिंग, किले, हैंडीकैप); CPU की रणनीति भी चुनो", "ar": "توسيع كبير للافتتاحيات في تبويبات (من المبتدئ إلى المتقدم، مفاجآت، رائجة، قلاع، أفضلية)؛ واختر استراتيجية الكمبيوتر"}],
    ['2026-10-21', 'dots', "振り返り解説が見やすく（スクロール式・スマホは簡易形勢つき）。ルールはゲーム紹介ページつきのチュートリアルに", "Easier-to-read review commentary (scrolling, compact eval on phones); rules as a tutorial with a game intro page", {"zh": "复盘讲解更易读（滚动式・手机上附简易形势）。规则变成附游戏介绍页的教程", "ko": "복기 해설이 보기 쉽게(스크롤식·스마트폰은 간이 형세). 규칙은 게임 소개 페이지가 있는 튜토리얼로", "es": "Comentarios de repaso más legibles (con desplazamiento y evaluación compacta en móvil); reglas como tutorial con presentación", "fr": "Commentaires de revue plus lisibles (défilement, évaluation compacte sur mobile) ; règles en tutoriel avec présentation", "pt": "Comentários de revisão mais legíveis (rolagem, avaliação compacta no celular); regras como tutorial com apresentação", "de": "Besser lesbare Analyse-Kommentare (scrollbar, kompakte Bewertung am Handy); Regeln als Tutorial mit Einführungsseite", "hi": "पढ़ने में आसान समीक्षा टिप्पणी (स्क्रॉल, फ़ोन पर छोटा मूल्यांकन); नियम खेल परिचय वाले ट्यूटोरियल में", "ar": "تعليقات مراجعة أسهل قراءة (تمرير، وتقييم مختصر على الهاتف)؛ والقواعد درس تفاعلي مع صفحة تعريف"}],
    ['2026-10-21', 'gomoku', "オンライン対戦にGoogleログインと進捗のクラウド同期。詰め連珠は★・メダル式に、AIは15級〜五段の20段階", "Google sign-in and cloud sync for online play; renju puzzles with stars and medals; 20 AI ranks from 15-kyu to 5-dan", {"zh": "在线对战支持Google登录和进度云同步。连珠谜题改为星级・奖牌制，AI分为15级到五段共20档", "ko": "온라인 대전에 Google 로그인과 진행 상황 클라우드 동기화. 렌주 퍼즐은 별·메달 방식, AI는 15급~5단의 20단계", "es": "Inicio de sesión con Google y sincronización en la nube para jugar en línea; puzles de renju con estrellas y medallas; 20 niveles de IA de 15 kyu a 5 dan", "fr": "Connexion Google et synchronisation cloud pour le jeu en ligne ; puzzles de renju avec étoiles et médailles ; 20 rangs d'IA du 15e kyu au 5e dan", "pt": "Login com Google e sincronização na nuvem no jogo online; quebra-cabeças de renju com estrelas e medalhas; 20 níveis de IA de 15 kyu a 5 dan", "de": "Google-Anmeldung und Cloud-Sync fürs Online-Spiel; Renju-Rätsel mit Sternen und Medaillen; 20 KI-Stufen von 15. Kyu bis 5. Dan", "hi": "ऑनलाइन खेल के लिए Google साइन-इन और क्लाउड सिंक; रेंजू पहेलियाँ सितारों और पदकों के साथ; 15 क्यू से 5 दान तक AI के 20 स्तर", "ar": "تسجيل الدخول بحساب Google ومزامنة سحابية للعب عبر الإنترنت؛ ألغاز رينجو بالنجوم والميداليات؛ 20 مستوى للذكاء الاصطناعي من 15 كيو إلى 5 دان"}],
    ['2026-10-21', 'reversi', "ルールがゲーム紹介ページつきのチュートリアルに。レッスン・定石一覧はミニ盤つきのカードに", "Rules as a hands-on tutorial with a game intro page; lesson and opening lists as cards with mini boards", {"zh": "规则变成附游戏介绍页的动手教程。课程・定式列表变成带迷你棋盘的卡片", "ko": "규칙이 게임 소개 페이지가 있는 튜토리얼로. 레슨·정석 목록은 미니 보드가 있는 카드로", "es": "Reglas como tutorial práctico con presentación; listas de lecciones y aperturas como tarjetas con minitablero", "fr": "Règles en tutoriel pratique avec présentation ; listes de leçons et d'ouvertures en cartes avec mini-plateau", "pt": "Regras como tutorial prático com apresentação; listas de lições e aberturas em cartões com minitabuleiro", "de": "Regeln als Mitmach-Tutorial mit Einführungsseite; Lektionen- und Eröffnungslisten als Karten mit Mini-Brett", "hi": "नियम खेल परिचय वाले ट्यूटोरियल में; पाठ और ओपनिंग सूचियाँ मिनी बोर्ड वाले कार्ड", "ar": "القواعد درس تفاعلي مع صفحة تعريف؛ وقوائم الدروس والافتتاحيات بطاقات بلوحات مصغّرة"}],
    ['2026-10-21', 'sudoku', 'ホームのタブにゲーム選択（すうどく／すぴーど）を追加。すぴーどでは「デイリー・コレクション・ミックス」になり、ボタンは青に', 'Pick the game (Sudoku / Speed) from a menu in the home tabs; in Speed the tabs become Daily, Collection and Mix, with blue buttons', {"zh": "每日数独：在主页标签中用下拉菜单选择游戏（数独／速度）。速度模式下标签为「每日・合集・混合」，按钮变为蓝色", "ko": "매일 스도쿠: 홈 탭의 풀다운에서 게임(스도쿠/스피드) 선택. 스피드 모드는 「데일리・컬렉션・믹스」 탭, 버튼은 파란색", "es": "Sudoku diario: elige el juego (Sudoku / Veloz) en el menú de las pestañas; en Veloz las pestañas son Diario, Colección y Mezcla, con botones azules", "fr": "Sudoku du jour : choisis le jeu (Sudoku / Vitesse) dans le menu des onglets ; en Vitesse, onglets Quotidien, Collection et Mix, boutons bleus", "pt": "Sudoku diário: escolha o jogo (Sudoku / Veloz) no menu das abas; no Veloz as abas são Diário, Coleção e Mistura, com botões azuis", "de": "Tägliches Sudoku: Spiel (Sudoku / Tempo) im Menü der Tabs wählen; im Tempo-Modus Tabs Täglich, Sammlung und Mix, blaue Knöpfe", "hi": "रोज़ का सुडोकू: टैब के मेनू से खेल (सुडोकू / स्पीड) चुनो; स्पीड में टैब डेली, कलेक्शन और मिक्स, नीले बटन", "ar": "سودوكو يومي: اختر اللعبة (سودوكو / السرعة) من قائمة التبويبات؛ في وضع السرعة التبويبات يومي ومجموعة ومزيج بأزرار زرقاء"}],
    ['2026-10-21', 'speedsudoku', "新作！4×4数独のタイムアタック。30・60・90秒のデイリーランキング、500ステージのコース、25種類の特殊ルール", "New! A 4×4 sudoku time attack: 30/60/90-second daily rankings, 500 course stages and 25 special rules", {"zh": "新作！4×4数独限时挑战。30/60/90秒每日排行榜、500关课程与25种特殊规则", "ko": "신작! 4×4 스도쿠 타임어택. 30·60·90초 데일리 랭킹, 500스테이지 코스, 25가지 특수 규칙", "es": "¡Nuevo! Contrarreloj de sudoku 4×4: rankings diarios de 30/60/90 s, 500 etapas y 25 reglas especiales", "fr": "Nouveau ! Contre-la-montre de sudoku 4×4 : classements 30/60/90 s, 500 étapes et 25 règles spéciales", "pt": "Novo! Contra o relógio de sudoku 4×4: rankings diários de 30/60/90 s, 500 fases e 25 regras especiais", "de": "Neu! 4×4-Sudoku auf Zeit: tägliche 30/60/90-Sekunden-Ranglisten, 500 Etappen und 25 Sonderregeln", "hi": "नया! 4×4 सुडोकू टाइम अटैक: 30/60/90 सेकंड की रोज़ की रैंकिंग, 500 स्टेज और 25 खास नियम", "ar": "جديد! سباق سودوكو 4×4 مع الوقت: تصنيفات يومية 30/60/90 ثانية و500 مرحلة و25 قاعدة خاصة"}],
    ['2026-10-21', 'chess', "AIが20段階に（目安レートは実測値）。対局設定でCPUの戦型を指定、ルールにゲーム紹介ページ", "AI now has 20 levels (measured ratings); choose the CPU's opening in the new-game dialog; game intro page in the rules", {"zh": "AI升级为20档（参考等级分为实测值）。对局设置中可指定电脑的开局，规则中新增游戏介绍页", "ko": "AI가 20단계로(기준 레이팅은 실측값). 대국 설정에서 CPU 전법 지정, 규칙에 게임 소개 페이지", "es": "La IA ahora tiene 20 niveles (ratings medidos); elige la apertura de la CPU al crear partida; página de presentación en las reglas", "fr": "L'IA a désormais 20 niveaux (classements mesurés) ; choix de l'ouverture du CPU en nouvelle partie ; page de présentation dans les règles", "pt": "A IA agora tem 20 níveis (ratings medidos); escolha a abertura da CPU ao criar a partida; página de apresentação nas regras", "de": "Die KI hat jetzt 20 Stufen (gemessene Wertungen); Eröffnung der CPU im Neue-Partie-Dialog wählbar; Einführungsseite in den Regeln", "hi": "AI में अब 20 स्तर (मापी गई रेटिंग); नए खेल में CPU की ओपनिंग चुनो; नियमों में खेल परिचय पेज", "ar": "أصبح للذكاء الاصطناعي 20 مستوى (تصنيفات مقيسة)؛ اختر افتتاحية الكمبيوتر عند بدء مباراة؛ وصفحة تعريف في القواعد"}],
  ];

  /* ---------------- common tag & badge rules ---------------- */
  // tag order = display order. c = colour, i = small icon (svg path d)
  const TAGS = {
    ai:       { c: '#7552e0', i: 'M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V7a4 4 0 0 1 4-4z' },
    online:   { c: '#22aa74', i: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
    rated:    { c: '#e09a00', i: 'M12 3l2.7 5.6l6.1.9l-4.4 4.3l1 6.1L12 17l-5.4 2.9l1-6.1l-4.4-4.3l6.1-.9z' },
    netrank:  { c: '#e09a00', i: 'M5 20V12M12 20V5M19 20v-9' },
    daily:    { c: '#ff6b6b', i: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    lessons:  { c: '#2196e0', i: 'M3 6l9-3l9 3l-9 3zM7 8v6c3 2 7 2 10 0V8' },
    puzzles:  { c: '#e85a9f', i: 'M9 4h4v3a2 2 0 1 0 4 0V4h3v6h-3a2 2 0 1 0 0 4h3v6H4V4z' },
    openings: { c: '#8a5a3b', i: 'M4 5h7v14H4zM13 5h7v14h-7' },
    variants: { c: '#2b9fb3', i: 'M4 7h12l-3-3M20 17H8l3 3' },
    mobile:   { c: '#4a5068', i: 'M8 3h8v18H8zM11 18h2' },
  };
  const DAY = 864e5;
  const ymd = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const daysSince = s => Math.floor((Date.parse(ymd(Date.now())) - Date.parse(s)) / DAY);
  const updText = (u, l) => l === 'ja' ? u[2] : l === 'en' ? u[3] : (u[4] && u[4][l]) || u[3];
  const lastUpdate = id => (UPDATES.find(u => u[1] === id) || [])[0] || null;
  // Badges (max 2 shown, in this priority):
  //   NEW     released within 14 days
  //   UPDATE  changelog entry within 7 days (and not NEW)
  //   BETA    g.beta
  //   PREMIUM g.premium
  function badges(g) {
    const out = [];
    if (g.released && daysSince(g.released) <= 14) out.push('new');
    else { const u = lastUpdate(g.id); if (u && daysSince(u) <= 7) out.push('update'); }
    if (g.beta) out.push('beta');
    if (g.premium) out.push('premium');
    return out.slice(0, 2);
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
    gomoku: () => ({ pz: cntPos(J('aicoding-gomoku-puzzles')), ls: cntClear(J('aicoding-gomoku-lessons')), op: cntClear(J('aicoding-gomoku-open'), 'pass'), dl: daily('aicoding-gomoku-daily'), rt: rated('aicoding-gomoku-rated'), ru: rules('gomoku') }),
    checkers: () => { const pz = J('aicoding-checkers-puzzles'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-checkers-lessons')), op: cntClear(J('aicoding-checkers-open'), 'pass'), dl: daily('aicoding-checkers-daily'), rt: rated('aicoding-checkers-rated'), ru: rules('checkers') }; },
    morris: () => { const pz = J('aicoding-morris-puzzles2'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-morris-lessons')), op: cntClear(J('aicoding-morris-open'), 'pass'), dl: daily('aicoding-morris-daily'), rt: rated('aicoding-morris-rated'), ru: rules('morris') }; },
    mancala: () => ({ pz: cntPos(J('aicoding-mancala-v1-puzzles')), ls: cntClear(J('aicoding-mancala-v1-lessons')), dl: daily('aicoding-mancala-v1-daily'), ru: rules('mancala') }),
    backgammon: () => ({ pz: cntPos(J('aicoding-backgammon-v2-puzzles')), ls: cntClear(J('aicoding-backgammon-v2-lessons'), 'pass'), dl: daily('aicoding-backgammon-v2-daily'), ru: rules('backgammon') }),
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
  function achievements(P, W) {
    P = P || allProgress(); W = W || load();
    const A = [];
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
      if (g.total.ls) { add(id, 'ls1', null, 0, r.ls, 1); add(id, 'lsAll', null, 2, r.ls, g.total.ls); }
      if (g.tags.includes('openings')) ladder(id, 'op', r.op || 0, [1, 10]);
      if (g.tags.includes('daily')) { ladder(id, 'dd', r.dl.days, [1, 7, 30]); add(id, 'st', 7, 2, r.dl.best, 7); }
      if (window.Atlas3D && window.Atlas3D[id]) {          // played on the portal's 3D table
        ladder(id, 'pw', r.p3.w, [1, 10]);
        const L = window.Atlas3D[id].levels; [Math.ceil(L / 2), L - 2, L].forEach((lv, i) => add(id, 'pv', lv, i + 1, r.p3.best >= lv ? 1 : 0, 1));
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
    ladder(null, 'gi', owned, [10, 30, 60], window.AtlasArt ? AtlasArt.items.length : 0, 'giAll');
    ladder(null, 'gp', W.pulls || 0, [1, 10, 50, 100]);
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
    p.n++; if (res.win) { p.w++; p.best = Math.max(p.best, res.level || 0); }
    save(d);
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  // coins are derived, so nothing can be earned twice: achievements + login bonus + duplicate refunds − spent
  function coins(W, A) {
    const ach = A.filter(a => a.done).reduce((s, a) => s + TIER_COINS[a.tier], 0);
    return { earned: ach + W.bonus, balance: ach + W.bonus - W.spent };
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
      const pool = AtlasArt.items.filter(it => it.rar === rar && it.id !== 'f-none');
      const it = pool[Math.floor(Math.random() * pool.length)];
      const dup = W.owned.includes(it.id);
      if (dup) W.bonus += GACHA.refund[rar]; else W.owned.push(it.id);
      res.push({ id: it.id, rar, dup, refund: dup ? GACHA.refund[rar] : 0 });
    }
    W.spent += cost; W.pulls += count; save(W);
    return res;
  }
  // today's shop: 6 items picked from what you don't own, seeded by date (same for the whole day)
  function shop(W) {
    const t = ymd(Date.now()); let s = 0; for (const ch of t) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
    const pool = AtlasArt.items.filter(it => it.rar <= 3 && it.id !== 'f-none').slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const kinds = { icon: 3, bg: 2, frame: 1 }, out = [];
    for (const it of pool) if (kinds[it.kind] > 0) { kinds[it.kind]--; out.push({ id: it.id, price: SHOP_PRICE[it.rar] }); }
    return out;
  }
  function buy(W, id, price) { if (W.owned.includes(id)) return false; W.owned.push(id); W.spent += price; save(W); return true; }

  window.Atlas = { LANGS, GAMES, CATS, sfxOn, UPDATES, updText, TAGS, TIER_COINS, GACHA, SHOP_PRICE, badges, byUpdate, recordPlay, lastUpdate, progress, allProgress, achievements, load, save, coins, claimLogin, pull, shop, buy, ymd, daysSince };
})();

/* =====================================================================
   Achievement banners (Steam-style) on every page that loads this file —
   the games and the portal. Progress is read from localStorage as the
   games write it; anything newly completed slides in at the corner.
   The first run only records what is already done (no flood of old ones).
   ===================================================================== */
(function () {
  'use strict';
  const A = window.Atlas; if (!A || typeof document === 'undefined') return;
  const QUIET = /\/atlas\/(index\.html)?$/.test(location.pathname);
  const SEEN = 'atlas-ach-seen', BASE = (document.currentScript && document.currentScript.src) || location.href;
  const getSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch (e) { return null; } };
  const setSeen = a => { try { localStorage.setItem(SEEN, JSON.stringify(a)); } catch (e) {} };
  const doneIds = () => { try { return A.achievements().filter(a => a.done); } catch (e) { return []; } };
  let I18N = window.ATLAS_I18N, loading = null;
  const needText = () => I18N ? Promise.resolve() : (loading || (loading = new Promise(res => {
    const s = document.createElement('script'); s.src = new URL('../atlas/i18n.js?v=6', BASE).href; s.onload = s.onerror = () => { I18N = window.ATLAS_I18N; res(); }; document.head.appendChild(s);
  })));
  const lang = () => { const l = (document.documentElement.lang || localStorage.getItem('aicoding-lang') || 'ja').slice(0, 2); return A.LANGS && A.LANGS.includes(l) ? l : (l in (I18N || {}) ? l : 'en'); };
  const tr = (k, v) => { const L = I18N || {}, l = lang(); let s = (L[l] && L[l][k]) ?? (L.en && L.en[k]) ?? k; if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]); return s; };
  const MEDAL = [['#e8a46a', '#b8703a'], ['#e3e8f0', '#9aa6b8'], ['#ffd84d', '#d79a1c'], ['#c9f1ff', '#7f8cff']];
  const medal = tier => { const c = MEDAL[tier] || MEDAL[0]; return `<svg viewBox="0 0 46 46" width="46" height="46"><path d="M14 2h7l4 14h-7zM32 2h-7l-4 14h7z" fill="${tier === 3 ? '#a17cff' : '#ff6b6b'}"/><circle cx="23" cy="28" r="15" fill="${c[1]}"/><circle cx="23" cy="27" r="13" fill="${c[0]}"/><path d="M23 19l2.4 5l5.4.6-4 3.7 1.1 5.3-4.9-2.7-4.9 2.7 1.1-5.3-4-3.7 5.4-.6z" fill="#fff" opacity=".85"/></svg>`; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const UNLOCK = { ja: '実績解除！', en: 'Achievement unlocked!', zh: '成就解锁！', ko: '업적 달성!', es: '¡Logro desbloqueado!', fr: 'Succès débloqué !', pt: 'Conquista desbloqueada!', de: 'Erfolg freigeschaltet!', hi: 'उपलब्धि अनलॉक!', ar: 'تم فتح إنجاز!' };

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
