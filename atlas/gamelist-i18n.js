/* Games tab: one-line taglines under each card's name ('tl.<id>') and the ヒストリア button label, 10 languages: ja en zh ko es fr pt de hi ar */
(function (L) {
  'use strict';
  const LG = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
  const TL = {   // short enough for one line on a card (≈13 full-width characters in ja)
    shogi: ['持ち駒を打てる日本の将棋', 'Japanese chess with drops', '可打入吃子的日本将棋', '잡은 말을 쓰는 일본 장기', 'Ajedrez japonés', 'Échecs japonais', 'Xadrez japonês', 'Japanisches Schach', 'जापानी शतरंज', 'الشطرنج الياباني'],
    chess: ['世界で愛される王様の遊び', 'The royal game of the world', '风靡世界的王者之棋', '세계가 사랑한 왕의 게임', 'El juego de los reyes', 'Le jeu des rois', 'O jogo dos reis', 'Das königliche Spiel', 'राजाओं का खेल', 'لعبة الملوك'],
    reversi: ['石を挟んでひっくり返す', 'Flank and flip the discs', '夹住对方棋子翻面', '사이에 끼워 뒤집기', 'Encierra y voltea', 'Encadrez et retournez', 'Cerque e vire', 'Einschließen und wenden', 'घेरो और पलटो', 'حاصر واقلب'],
    sudoku: ['毎日届く、かわいい数独', 'Cute sudoku every day', '每天一题的可爱数独', '매일 귀여운 스도쿠', 'Sudoku bonito a diario', 'Un sudoku mignon par jour', 'Sudoku fofo todo dia', 'Süßes Sudoku täglich', 'रोज़ प्यारा सुडोकू', 'سودوكو لطيف كل يوم'],
    speedsudoku: ['4×4数独のタイムアタック', '4×4 sudoku time attack', '4×4数独计时挑战', '4×4 스도쿠 타임어택', 'Sudoku 4×4 contrarreloj', 'Sudoku 4×4 chrono', 'Sudoku 4×4 contra o tempo', '4×4-Sudoku auf Zeit', '4×4 सुडोकू टाइम अटैक', 'سودوكو 4×4 ضد الوقت'],
    samegame: ['同じ色をまとめて消す', 'Pop same-color groups', '消除相连同色方块', '같은 색 묶어서 터뜨리기', 'Explota grupos de color', 'Éclatez les couleurs', 'Estoure grupos de cor', 'Farbgruppen abräumen', 'एक रंग के समूह फोड़ो', 'فجّر مجموعات اللون'],
    jailbreak: ['ブロックをずらして脱獄', 'Slide blocks, break out', '滑动方块越狱', '블록을 밀어 탈옥', 'Desliza y escapa', 'Glissez et évadez-vous', 'Deslize e fuja', 'Schieben und ausbrechen', 'ब्लॉक खिसकाओ, भागो', 'حرّك الكتل واهرب'],
    poker: ['ホールデムなど6種', "Hold'em and five more", '德州扑克等6种玩法', '홀덤 등 6가지 포커', "Hold'em y cinco más", "Hold'em et cinq autres", "Hold'em e mais cinco", "Hold'em und fünf weitere", 'होल्डेम समेत 6 खेल', 'هولدم وخمس ألعاب أخرى'],
    baccarat: ['9に近いのはどっち？', 'Who gets closer to 9?', '谁更接近9点？', '누가 9에 가까울까?', '¿Quién se acerca a 9?', 'Qui frôle le 9 ?', 'Quem chega perto de 9?', 'Wer kommt näher an 9?', '9 के क़रीब कौन?', 'من الأقرب إلى 9؟'],
    blackjack: ['21を超えずに勝て', 'Beat the dealer to 21', '不超21点赢庄家', '21을 넘기지 말고 승리', 'Gana sin pasarte de 21', 'Gagnez sans dépasser 21', 'Vença sem passar de 21', 'Gewinne ohne über 21', '21 पार किए बिना जीतो', 'افز دون تجاوز 21'],
    solitaire: ['クロンダイクなど6種', 'Klondike and five more', '空当接龙等6种', '클론다이크 등 6가지', 'Klondike y cinco más', 'Klondike et cinq autres', 'Klondike e mais cinco', 'Klondike und fünf weitere', 'क्लोंडाइक समेत 6 खेल', 'كلوندايك وخمس أخرى'],
    checkers: ['斜めに跳んで駒を取る', 'Jump diagonally to capture', '斜跳吃子', '대각선으로 뛰어 잡기', 'Salta en diagonal', 'Prenez en sautant', 'Salte na diagonal', 'Diagonal springen', 'तिरछा कूदकर मारो', 'اقفز قطريًا لتأسر'],
    ugolki: ['ロシア発の陣地入れ替え', 'A Russian corner race', '源自俄罗斯的换角棋', '러시아의 진지 바꾸기', 'Carrera rusa de esquinas', 'Course russe des coins', 'Corrida russa de cantos', 'Russisches Eckenrennen', 'कोनों की रूसी दौड़', 'سباق الزوايا الروسي'],
    konane: ['ハワイの跳び越えゲーム', 'The Hawaiian jumping game', '夏威夷跳吃棋', '하와이의 점프 게임', 'El juego hawaiano de saltos', 'Le jeu de sauts hawaïen', 'O jogo havaiano de saltos', 'Hawaiis Sprungspiel', 'हवाई का छलांग खेल', 'لعبة القفز الهاوايية'],
    fanorona: ['マダガスカルの国民的遊戯', "Madagascar's national game", '马达加斯加国民棋', '마다가스카르 국민 게임', 'Juego nacional malgache', 'Jeu national malgache', 'Jogo nacional malgaxe', 'Madagaskars Nationalspiel', 'मेडागास्कर का खेल', 'لعبة مدغشقر الوطنية'],
    ur: ['4500年前の王家の盤', 'A 4,500-year-old royal board', '4500年前的王家棋盘', '4500년 전 왕가의 판', 'Tablero real de 4.500 años', 'Plateau royal vieux de 4 500 ans', 'Tabuleiro real de 4.500 anos', 'Königliches Brett, 4.500 Jahre alt', '4,500 साल पुराना शाही बोर्ड', 'لوحة ملكية عمرها 4500 عام'],
    alquerque: ['チェッカーの祖先', 'The ancestor of checkers', '跳棋的鼻祖', '체커의 조상', 'Antepasado de las damas', 'Ancêtre des dames', 'Ancestral das damas', 'Vorfahr des Damespiels', 'चेकर्स का पूर्वज', 'سلف الداما'],
    agon: ['女王と近衛兵で王座を囲む', 'Ring the throne with your guards', '用卫兵围住王座', '호위병으로 왕좌를 둘러싸기', 'Rodea el trono con tus guardias', 'Entourez le trône de vos gardes', 'Cerque o trono com seus guardas', 'Umringe den Thron mit Wachen', 'रक्षकों से सिंहासन घेरो', 'أحط العرش بحراسك'],
    xiangqi: ['川をはさむ中国の象棋', 'Chinese chess by the river', '隔河对弈的中国象棋', '강을 둔 중국 장기', 'Ajedrez chino', 'Échecs chinois', 'Xadrez chinês', 'Chinesisches Schach', 'चीनी शतरंज', 'الشطرنج الصيني'],
    tafl: ['王を逃がすヴァイキング盤', 'Help the Viking king escape', '护王突围的维京棋', '왕을 탈출시키는 바이킹', 'Salva al rey vikingo', 'Sauvez le roi viking', 'Salve o rei viking', 'Rette den Wikingerkönig', 'वाइकिंग राजा को बचाओ', 'هرّب ملك الفايكنغ'],
    go: ['石で囲んで陣地を取る', 'Surround territory', '围出更大的地盘', '돌로 집을 둘러싸기', 'Rodea territorio', 'Encerclez le territoire', 'Cerque território', 'Gebiet umzingeln', 'इलाक़ा घेरो', 'طوّق الأراضي'],
    gomoku: ['先に5つ並べたら勝ち', 'First to five in a row', '先连成五子者胜', '먼저 다섯 개 잇기', 'Gana quien alinee cinco', 'Alignez-en cinq', 'Alinhe cinco primeiro', 'Zuerst fünf in Reihe', 'पहले पाँच की कतार', 'من يصفّ خمسة يفوز'],
    dots: ['線を引いて箱を取り合う', 'Draw lines, claim boxes', '画线抢格子', '선을 그어 상자 차지', 'Traza líneas, gana cajas', 'Traits et cases', 'Trace linhas, ganhe caixas', 'Linien ziehen, Kästchen', 'रेखाएँ खींचो, डिब्बे लो', 'ارسم واستحوذ على المربعات'],
    connect4: ['落として4つ並べる', 'Drop discs, connect four', '投子连成四个', '떨어뜨려 4개 잇기', 'Deja caer y une cuatro', 'Lâchez et alignez quatre', 'Solte e ligue quatro', 'Einwerfen, vier verbinden', 'गिराओ, चार जोड़ो', 'أسقط وصِل أربعة'],
    mancala: ['種をまくアフリカの遊び', 'Sow seeds, from Africa', '源自非洲的播子棋', '씨앗을 뿌리는 아프리카 놀이', 'Siembra africana', 'Semailles africaines', 'Semeadura africana', 'Säen – aus Afrika', 'बीज बोने का अफ़्रीकी खेल', 'زرع البذور من أفريقيا'],
    backgammon: ['最古級のサイコロ競走', 'An ancient dice race', '古老的骰子竞速棋', '가장 오래된 주사위 경주', 'Antigua carrera de dados', 'Antique course aux dés', 'Antiga corrida de dados', 'Uraltes Würfelrennen', 'प्राचीन पासा दौड़', 'سباق نرد عريق'],
    morris: ['3つ並べて駒を取る', 'Make mills to capture', '连成三子即吃子', '세 개 이어 잡기', 'Haz molinos y captura', 'Formez des moulins', 'Faça moinhos', 'Mühlen bilden', 'तीन जोड़ो, मोहरे मारो', 'كوّن ثلاثية لتأسر'],
    agon: ['女王を盤の中心へ', 'Bring your queen to the center', '把女王送到中心', '여왕을 중앙으로', 'Lleva tu reina al centro', 'Menez votre reine au centre', 'Leve sua rainha ao centro', 'Bring die Königin zur Mitte', 'रानी को केंद्र तक ले जाओ', 'أوصل ملكتك إلى المركز'],
    ur: ['古代メソポタミアの双六', 'A race from ancient Mesopotamia', '古美索不达米亚的竞速棋', '고대 메소포타미아의 경주', 'Carrera de la antigua Mesopotamia', 'Course de l’antique Mésopotamie', 'Corrida da antiga Mesopotâmia', 'Rennspiel aus Mesopotamien', 'प्राचीन मेसोपोटामिया की दौड़', 'سباق من بلاد الرافدين'],
    senet: ['古代エジプトの「通過」の遊び', 'Ancient Egypt’s game of passing', '古埃及的“通过”之戏', '고대 이집트의 “지나감” 놀이', 'El juego egipcio del paso', 'Le jeu égyptien du passage', 'O jogo egípcio da passagem', 'Ägyptens Spiel des Vorübergehens', 'प्राचीन मिस्र का “पार” खेल', 'لعبة العبور المصرية القديمة'],
    hex: ['向かいの辺をつなげ', 'Connect your two sides', '连通己方两边', '마주 보는 변 잇기', 'Une tus dos lados', 'Reliez vos deux bords', 'Ligue seus dois lados', 'Verbinde deine Seiten', 'दोनों किनारे जोड़ो', 'صِل ضلعيك'],
  };
  const HI = ['ヒストリア', 'Historia', '历史', '히스토리아', 'Historia', 'Historia', 'Historia', 'Historia', 'हिस्टोरिया', 'هيستوريا'];   // the Historia viewer's button (same names as atlas/historia.js)
  HI.forEach((s, i) => { (L[LG[i]] = L[LG[i]] || {})['gl.historia'] = s; });
  const HS = ['ヒストリアを見る', 'Open the Historia', '查看历史', '히스토리아 보기', 'Ver la Historia', 'Voir l’Historia', 'Ver a Historia', 'Historia ansehen', 'हिस्टोरिया देखें', 'افتح هيستوريا'];   // today's game card
  HS.forEach((s, i) => { L[LG[i]]['gl.histSee'] = s; });
  for (const id in TL) TL[id].forEach((s, i) => { (L[LG[i]] = L[LG[i]] || {})['tl.' + id] = s; });
})(window.ATLAS_I18N);
