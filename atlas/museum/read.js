/* World Board Game Atlas — 博物館の「読み物」 (stories room, 2026-11-24).
   Short illustrated stories about how games were found, lost, read and changed; each ends with a three-question quiz, and a quiz
   answered without a miss stamps the visitor's card (localStorage 'atlas-museum-stamps'). Pictures are the museum's own: the
   collection's photographs (images/atlas/ex) and the paintings room's (images/atlas/paint); tapping one opens the piece.
   Texts: museum/read-i18n.js (MUSEUM_READ_T[lang]: ui, and per story: title, lead, s[] (one per section), quiz[[q, right, wrong, wrong, wrong]]).
   Facts and sources: claude/museum-spec.md (読み物).
   AtlasRead.render(box, ctx); ctx.open(game), ctx.goEx(exhibit), ctx.goRoom(room). */
(function () {
  'use strict';
  const V = 1, KEY = 'atlas-museum-stamps';
  // cover: the picture at the head of the story (and on its card and stamp); sec: a picture beside each paragraph after it
  // (ex: a piece of the collection / paint: a work of the paintings room / null: none). Tapping a picture opens the piece.
  const STORIES = [
    { id: 'ur', region: 'mea', color: '#2f5f9e', cover: { ex: 'ur' }, mins: 3, figs: { m0: { ex: 'ur' }, m1: [{ svg: 'urBoard' }, { svg: 'tetraOdds' }] }, refs: ['British Museum, “The Royal Game of Ur” (ME 120834) and tablet BM 33333B', 'I. L. Finkel, “On the Rules for the Royal Game of Ur”, in Ancient Board Games in Perspective (British Museum Press, 2007)', 'C. L. Woolley, Ur Excavations II: The Royal Cemetery (1934)'], sec: [null, null, null, null, null], links: [{ g: 'ur' }, { ex: 'ur' }] },
    { id: 'liubo', region: 'asia', color: '#8a3a26', cover: { paint: 'liubo' }, mins: 3, sec: [null, null, { pic: 'tlvmirror' }, null, null], figs: { m0: { svg: 'tlv' }, m1: { paint: 'liubo' }, m2: { ex: 'liubo' } }, refs: ['『楚辞』「招魂」 (Chu Ci, “Zhao Hun”)', '連雲港市博物館ほか編『尹湾漢墓簡牘』（中華書局, 1997）', 'Hunan Museum, the liubo set from Mawangdui tomb 3', 'Zhu Fenghan on liubo and the Haihun slips (Archaeology, archaeology.org)'], links: [{ ex: 'liubo' }, { paint: 'liubo' }] },
    { id: 'zeno', region: 'europe', color: '#5b4a2e', cover: { ex: 'pyrgus' }, mins: 3, sec: [{ paint: 'hydria' }, null, null, null, null], figs: { m0: { svg: 'tabula' }, m1: { ex: 'pyrgus' } }, refs: ['Agathias, epigram in the Greek Anthology 9.482', 'L. Becq de Fouquières, Les jeux des anciens (1869)', 'R. G. Austin, “Zeno’s Game of τάβλη”, Journal of Hellenic Studies 54 (1934)', 'Suetonius, Life of Claudius 33', 'LVR-LandesMuseum Bonn, the Vettweiß-Froitzheim dice tower'], links: [{ g: 'backgammon' }, { ex: 'pyrgus' }, { room: 'chance' }] },
    { id: 'sugoroku', region: 'asia', color: '#7a2e3a', cover: { ex: 'sugoroku' }, mins: 3, sec: [null, null, null, null, { paint: 'kiyohiro' }], figs: { m0: { ex: 'sugoroku' }, m1: { svg: 'bansugo' }, m2: { paint: 'sugoroku' } }, refs: ['『日本書紀』持統天皇三年十二月条', '養老律令「僧尼令」', '『平家物語』巻一「願立」', '宮内庁正倉院事務所「木画紫檀双六局」', '増川宏一『盤上遊戯』（ものと人間の文化史, 法政大学出版局, 1978）'], links: [{ ex: 'sugoroku' }, { paint: 'sugoroku' }, { g: 'backgammon' }] },
    { id: 'queen', region: 'europe', color: '#2a3a52', cover: { paint: 'shahnama' }, mins: 3, sec: [null, { ex: 'nishapur' }, { paint: 'mirror' }, null, null], figs: { m0: { svg: 'queenMoves' }, m1: { paint: 'liberale' }, m2: { ex: 'lewis' } }, refs: ['Francesc de Castellví, Narcís Vinyoles, Bernat Fenollar, Scachs d’amor (c. 1475)', 'Luis Ramírez de Lucena, Repetición de amores y arte de ajedrez (1497)', 'Pedro Damiano, Questo libro e da imparare giocare a scachi (1512)', 'H. J. R. Murray, A History of Chess (1913)', 'Marilyn Yalom, Birth of the Chess Queen (2004)'], links: [{ g: 'chess' }, { ex: 'lewis' }, { ex: 'nishapur' }, { paint: 'liberale' }] },
    // (2026-11-24: four more)
    { id: 'senet', region: 'mea', color: '#7a5a1e', cover: { ex: 'senet' }, mins: 3, sec: [null, null, { paint: 'nefertari' }, null, null], figs: { m0: { svg: 'senet' }, m2: { ex: 'senet' } }, refs: ['The Metropolitan Museum of Art, “Ancient Egyptian board games” (Heilbrunn Timeline)', 'P. A. Piccione, “In Search of the Meaning of Senet”, Archaeology 33 (1980)', 'T. Kendall, Passing Through the Netherworld: The Meaning and Play of Senet (1978)', 'Griffith Institute, Tutankhamun: Anatomy of an Excavation (Carter objects 345, 393, 580, 585)'], links: [{ g: 'senet' }, { ex: 'senet' }, { paint: 'nefertari' }] },
    { id: 'lewis', region: 'europe', color: '#3e4a5c', cover: { ex: 'lewis' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: [{ ex: 'lewis' }, { svg: 'lewisCount' }] }, refs: ['British Museum, “The Lewis Chessmen” (1831,1101.78–159)', 'National Museums Scotland, the Lewis chessmen', 'J. Robinson, The Lewis Chessmen (British Museum Press, 2004)', 'D. H. Caldwell, M. A. Hall, C. M. Wilkinson, “The Lewis Hoard of Gaming Pieces”, Medieval Archaeology 53 (2009)', 'Sotheby’s, 2 July 2019, lot: a Lewis chessman warder'], links: [{ ex: 'lewis' }, { g: 'chess' }, { room: 'paint' }] },
    { id: 'tafl', region: 'europe', color: '#2f4f3a', cover: { ex: 'ballinderry' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'brandubh' }, m1: { svg: 'tablut' }, m2: { ex: 'lewis' } }, refs: ['Carl Linnaeus, Iter Lapponicum (1732)', 'J. E. Smith (tr.), Lachesis Lapponica, or a Tour in Lapland (1811)', 'H. J. R. Murray, A History of Chess (1913)', 'H. O’N. Hencken, “Ballinderry Crannog No. 1”, Proceedings of the Royal Irish Academy 43 C (1936)', 'Corpus Christi College, Oxford, MS 122 (Alea Evangelii)', 'National Museum of Ireland, the Ballinderry gaming board'], links: [{ g: 'tafl' }, { ex: 'ballinderry' }] },
    { id: 'goose', region: 'europe', color: '#5a6e2a', cover: { ex: 'goose' }, mins: 3, sec: [null, null, { paint: 'posada' }, { paint: 'leifeng' }, null], figs: { m0: { svg: 'gooseSpiral' }, m1: { svg: 'gooseNine' } }, refs: ['Stationers’ Register, London, 1597 (entry by John Wolfe)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'David Parlett, The Oxford History of Board Games (1999)', 'Adrian Seville, The Cultural Legacy of the Royal Game of the Goose (Amsterdam University Press, 2019)', 'The Metropolitan Museum of Art, double-sided game board (the Game of the Goose and chess)'], links: [{ ex: 'goose' }, { room: 'chance' }, { g: 'backgammon' }] },
    { id: 'shogi', region: 'asia', color: '#6b4a24', cover: { ex: 'kofukuji' }, mins: 3, sec: [null, null, { paint: 'umaya' }, null, null], figs: { m0: { svg: 'shogiPieces' }, m1: { svg: 'shogiSizes' }, m2: { paint: 'shogi' } }, refs: ['『二中歴』（鎌倉時代初め / early Kamakura period）', 'Nara Prefectural Kashihara Archaeological Institute, excavation of the former Kōfukuji precinct (1993)', '増川宏一『将棋』（ものと人間の文化史, 法政大学出版局, 1977） / Masukawa Kōichi, Shōgi', '伊藤看寿『将棋図巧』(1755) / Itō Kanju, Shōgi Zukō', 'H. J. R. Murray, A History of Chess (1913)', 'The Metropolitan Museum of Art, Suzuki Harunobu, JP2773'], links: [{ g: 'shogi' }, { ex: 'kofukuji' }, { paint: 'shogi' }] },
    { id: 'pachisi', region: 'asia', color: '#a0482a', cover: { paint: 'chaupar' }, mins: 3, sec: [{ paint: 'kangra' }, { pic: 'kota' }, { paint: 'tutinama' }, null, null], figs: { m0: { svg: 'pachisiBoard' }, m1: { svg: 'cowrieOdds' } }, refs: ['Stewart Culin, Chess and Playing-Cards (1898)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'R. C. Bell, Board and Table Games from Many Civilizations (1960)', 'Irving Finkel, “Round and Round the Houses: The Game of Pachisi”, in Asian Games: The Art of Contest (2004)', 'The Metropolitan Museum of Art, Shiva and Parvati Playing Chaupar (1694–95), 57.185.2'], links: [{ g: 'ludo' }, { paint: 'chaupar' }, { room: 'chance' }] },
    { id: 'go', region: 'asia', color: '#33404a', cover: { ex: 'shosoin' }, mins: 3, sec: [{ paint: 'shoei' }, null, { paint: 'imari' }, null, { pic: 'kotoboard' }], figs: { m0: { svg: 'goLiberty' }, m1: { svg: 'goGrid' }, m2: { paint: 'weiqi' } }, refs: ['『孟子』告子上 / Mencius, Gaozi I', '宮内庁正倉院事務所「木画紫檀棊局」 / Shōsōin, go board of sandalwood with marquetry', 'Peter Shotwell, Go! More Than a Game (2003)', '川端康成『名人』(1954) / Kawabata Yasunari, The Master of Go', 'D. Silver et al., “Mastering the game of Go with deep neural networks and tree search”, Nature 529 (2016)', 'J. Tromp, “The number of legal Go positions” (2016)', 'The Metropolitan Museum of Art, carved lacquer dish with immortals playing weiqi (Xuande period)'], links: [{ g: 'go' }, { ex: 'shosoin' }, { ex: 'sugoroku' }] },
    { id: 'draughts', region: 'europe', color: '#7a2a2a', cover: { g: 'checkers', s: 'draughts' }, mins: 3, sec: [null, null, null, { pic: 'gametable' }, { paint: 'vuillard' }], figs: { m0: { svg: 'alquerqueBoard' }, m1: { svg: 'draughtsJump' } }, refs: ['Alfonso X, Libro de los juegos (1283)', 'Antonio de Torquemada, El ingenio, o juego de marro, de punta o damas (1547)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'Arie van der Stoep, A History of Draughts (1984)', 'Jonathan Schaeffer, One Jump Ahead: Challenging Human Supremacy in Checkers (1997)', 'J. Schaeffer et al., “Checkers Is Solved”, Science 317 (2007)'], links: [{ g: 'checkers' }, { g: 'alquerque' }, { paint: 'shahnama' }] },
    { id: 'reversi', region: 'europe', color: '#23603e', cover: { g: 'reversi', s: 'reversi' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'reversiFlip' }, m1: { svg: 'reversiStart' } }, refs: ['David Parlett, The Oxford History of Board Games (1999)', 'Michael Buro, “The Othello Match of the Year: Takeshi Murakami vs. Logistello”, ICCA Journal 20 (1997)', 'World Othello Federation, World Othello Championship results (1977–)', 'Hiroki Takizawa, “Othello is Solved”, arXiv (2023)'], links: [{ g: 'reversi' }] },
    { id: 'mancala', region: 'mea', color: '#8a6a2a', cover: { g: 'mancala', s: 'mancala' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'sowing' }, m1: { svg: 'mancalaRows' } }, refs: ['Thomas Hyde, De Ludis Orientalibus (1694)', 'Edward William Lane, An Account of the Manners and Customs of the Modern Egyptians (1836)', 'Alex de Voogt, Mancala Board Games (British Museum Press, 1997)', 'Laurence Russ, The Complete Mancala Games Book (2000)', 'G. Irving, H. H. L. M. Donkers, J. W. H. M. Uiterwijk, “Solving Kalah”, ICGA Journal 23 (2000)'], links: [{ g: 'mancala' }, { room: 'map' }] },
    { id: 'morris', region: 'europe', color: '#5a4632', cover: { g: 'morris', s: 'morris' }, mins: 3, sec: [null, null, null, { paint: 'morris' }, null], figs: { m0: { svg: 'morrisBoard' }, m1: { svg: 'morrisFamily' } }, refs: ['Alfonso X, Libro de los juegos (1283)', 'William Shakespeare, A Midsummer Night’s Dream, Act II, Scene 1', 'Emanuel Lasker, Brettspiele der Völker (1931)', 'R. C. Bell, Board and Table Games from Many Civilizations (1960)', 'Friedrich Berger, “From circle and square to the image of the world: a possible interpretation for some petroglyphs of merels boards”, Rock Art Research 21 (2004)', 'Ralph Gasser, “Solving Nine Men’s Morris”, in Games of No Chance (1996)'], links: [{ g: 'morris' }, { room: 'map' }] },
    { id: 'patolli', region: 'americas', color: '#8a3a2a', cover: { g: 'patolli', s: 'patolli' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'patolliBoard' }, m1: { svg: 'beanOdds' }, m2: { paint: 'chaupar' } }, refs: ['Diego Durán, Historia de las Indias de Nueva España e islas de la tierra firme (c. 1581)', 'Bernardino de Sahagún, Florentine Codex, Book 8 (c. 1577)', 'Codex Magliabechiano (16th century)', 'E. B. Tylor, “On the Game of Patolli in Ancient Mexico, and its Probably Asiatic Origin”, Journal of the Anthropological Institute 8 (1879)', 'Stewart Culin, Chess and Playing-Cards (1898)'], links: [{ g: 'patolli' }, { g: 'ludo' }, { paint: 'chaupar' }] },
    { id: 'xiangqi', region: 'asia', color: '#8a1e1e', cover: { g: 'xiangqi', s: 'xiangqi' }, mins: 3, sec: [null, null, null, { paint: 'ingram' }, null], figs: { m0: { svg: 'xiangqiBoard' }, m1: { svg: 'cannonJump' } }, refs: ['牛僧孺『玄怪錄』（9世紀） / Niu Sengru, Xuanguai lu (9th c.)', '『適情雅趣』(1570) / Shiqing yaqu', '朱晉楨『橘中秘』(1632) / Zhu Jinzhen, Juzhong mi', 'H. J. R. Murray, A History of Chess (1913)', 'H. T. Lau, Chinese Chess (1985)', 'David H. Li, The Genealogy of Chess (1998)'], links: [{ g: 'xiangqi' }, { g: 'janggi' }, { g: 'chess' }] },
    { id: 'backgammon', region: 'mea', color: '#5c2f1f', cover: { g: 'backgammon', s: 'backgammon' }, mins: 3, sec: [null, { paint: 'shahnama' }, { pic: 'trictrac' }, { paint: 'teniers' }, { pic: 'homerbg' }], figs: { m0: { svg: 'bgBoard' }, m1: { svg: 'bgShots' }, m2: { paint: 'webb' } }, refs: ['Wizārišn ī čatrang ud nihišn ī nēw-ardaxšīr (Middle Persian, c. 6th–9th c.)', 'Edmond Hoyle, A Short Treatise on the Game of Back-Gammon (1743)', 'Oswald Jacoby & John R. Crawford, The Backgammon Book (1970)', 'Hans Berliner, “Backgammon Computer Program Beats World Champion”, Artificial Intelligence 14 (1980)', 'Gerald Tesauro, “Temporal Difference Learning and TD-Gammon”, Communications of the ACM 38 (1995)', 'The Metropolitan Museum of Art, The Backgammon Players (cabinet, 1861), 26.54'], links: [{ g: 'backgammon' }, { paint: 'webb' }, { ex: 'pyrgus' }] },
    { id: 'hex', region: 'europe', color: '#2e4a6e', cover: { g: 'hex', s: 'hex' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'hexWin' }, m1: { svg: 'hexBridge' } }, refs: ['Piet Hein, “Polygon”, Politiken, 26 December 1942', 'Martin Gardner, “Mathematical Games”, Scientific American (July 1957)', 'David Gale, “The Game of Hex and the Brouwer Fixed-Point Theorem”, American Mathematical Monthly 86 (1979)', 'Cameron Browne, Hex Strategy: Making the Right Connections (2000)', 'Ryan B. Hayward & Bjarne Toft, Hex: The Full Story (2019)'], links: [{ g: 'hex' }, { g: 'gomoku' }] },
    { id: 'foxgeese', region: 'europe', color: '#7a4a1e', cover: { g: 'foxgeese', s: 'foxgeese' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'foxGeeseBoard' }, m1: { svg: 'huntFamily' } }, refs: ['Grettis saga Ásmundarsonar (14th c.)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'R. C. Bell, Board and Table Games from Many Civilizations (1960)', 'Claude-Auguste Berey, the Princesse de Soubise playing solitaire (engraving, 1697)', 'John D. Beasley, The Ins and Outs of Peg Solitaire (1985)', 'Lim Yew Jin & Jürg Nievergelt, “Computing Tigers and Goats”, ICGA Journal 27 (2004)'], links: [{ g: 'foxgeese' }, { g: 'peg' }, { g: 'tafl' }] },
    { id: 'latrunculi', region: 'europe', color: '#6a4a2a', cover: { g: 'latrunculi', s: 'latrunculi' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'latCapture' }, m1: { svg: 'latTwoSided' }, m2: { ex: 'pyrgus' } }, refs: ['Varro, De lingua Latina 10.22', 'Laus Pisonis, lines 190–208 (1st c.)', 'Seneca, De tranquillitate animi 14.7', 'Martial, Epigrams 14.17', 'P. Crummy et al., Stanway: An Élite Burial Site at Camulodunum (2007)', 'U. Schädler, „Latrunculi – ein verlorenes strategisches Brettspiel der Römer“, Homo Ludens 4 (1994)'], links: [{ g: 'latrunculi' }, { g: 'tafl' }, { ex: 'pyrgus' }] },
    { id: 'amazons', region: 'americas', color: '#7a3a22', cover: { g: 'amazons', s: 'amazons' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'amazonTurn' }, m1: { svg: 'amazonRooms' } }, refs: ['Walter Zamkauskas, El Juego de las Amazonas, El Acertijo (1988)', 'Elwyn Berlekamp, “Sums of N×2 Amazons”, in Game Theory, Optimal Stopping, Probability and Statistics (2000)', 'Patrick Hensgens, A Knowledge-Based Approach of the Game of Amazons (master’s thesis, Maastricht, 2001)', 'ICGA, Computer Olympiad results: Amazons'], links: [{ g: 'amazons' }, { g: 'chess' }, { g: 'go' }] },
    // (2026-11-24) Lines of Action is not in the Atlas yet (its own page loa/, ja / en): the cover and the link go there (href), named by the story's own text (game)
    { id: 'loa', region: 'americas', color: '#4a2a4e', cover: { g: 'loa', s: 'loa', href: '../loa/' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'loaMove' }, m1: { svg: 'loaConnect' } }, refs: ['Sid Sackson, A Gamut of Games (1969) — the game by Claude Soucie', 'Mark H. M. Winands, Informed Search in Complex Games (PhD thesis, Universiteit Maastricht, 2004)', 'Mark H. M. Winands, “6×6 LOA is Solved”, ICGA Journal 31(4) (2008)', 'Maastricht University, Games and AI Group: Lines of Action (MIA, MC-LOA; Computer Olympiad 2003, 2004, 2006, 2009, 2013, 2015)', 'Mind Sports Olympiad, Lines of Action World Championship'], links: [{ g: 'loa', href: '../loa/' }, { g: 'checkers' }, { g: 'go' }] },
    { id: 'konane', region: 'americas', color: '#2f5a56', cover: { g: 'konane', s: 'konane' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'konaneJump' }, m1: { svg: 'konaneStart' }, m2: { svg: 'konaneSizes' } }, refs: ['James Cook, James King, A Voyage to the Pacific Ocean, vol. III (1784)', 'Stewart Culin, “Hawaiian Games”, American Anthropologist 1 (1899)', 'Michael D. Ernst, “Playing Konane Mathematically: A Combinatorial Game-Theoretic Analysis”, UMAP Journal 16(2) (1995); an earlier version with Elwyn Berlekamp (1993)', 'Alice Chan, Alice Tsai, “1×n Konane: A Summary of Results”, in More Games of No Chance (2002)', 'Robert A. Hearn, Games, Puzzles, and Computation (PhD thesis, MIT, 2006)', 'National Park Service, Puʻuhonua o Hōnaunau National Historical Park (papamū)'], links: [{ g: 'konane' }, { g: 'checkers' }, { g: 'peg' }] },
    { id: 'peg', region: 'europe', color: '#5a3e78', cover: { g: 'peg', s: 'peg' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'pegJump' }, m1: { svg: 'pegBoards' }, m2: { svg: 'pegColors' } }, refs: ['Mercure galant, August 1697', 'Claude-Auguste Berey, engraving of Anne de Rohan-Chabot, princesse de Soubise, with a solitaire board (late 17th century)', 'G. W. Leibniz, a note on the game of solitaire (1710), as quoted in Winning Ways', 'E. R. Berlekamp, J. H. Conway, R. K. Guy, Winning Ways for your Mathematical Plays, vol. 2 (1982)', 'John D. Beasley, The Ins and Outs of Peg Solitaire (1985)', 'University of Waterloo, Elliott Avedon Virtual Museum of Games: Solitaire'], links: [{ g: 'peg' }, { g: 'foxgeese' }, { g: 'konane' }] },
    { id: 'fanorona', region: 'mea', color: '#7a4a1e', cover: { g: 'fanorona', s: 'fanorona' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'fanoronaCapture' }, m1: { svg: 'fanoronaBoard' }, m2: { svg: 'fanoronaChain' } }, refs: ['Maarten P. D. Schadd, Mark H. M. Winands, Jos W. H. M. Uiterwijk, H. Jaap van den Herik, Maurice H. J. Bergsma, “Best Play in Fanorona Leads to Draw”, New Mathematics and Natural Computation 4(3) (2008)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'Robert C. Bell, Board and Table Games from Many Civilizations (1960)', 'Maastricht University, Games and AI Group: Fanorona', 'Wikipedia, “Fanorona” (the legend of Ralambo and his sons)'], links: [{ g: 'fanorona' }, { g: 'alquerque' }, { g: 'checkers' }] },
    { id: 'janggi', region: 'asia', color: '#1f5e52', cover: { g: 'janggi', s: 'janggi' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'janggiBoard' }, m1: { svg: 'janggiElephant' }, m2: { svg: 'janggiCannon' } }, refs: ['Stewart Culin, Korean Games, with Notes on the Corresponding Games of China and Japan (1895)', '한국민족문화대백과사전 「장기」 / Encyclopedia of Korean Culture, “Janggi”', 'H. J. R. Murray, A History of Chess (1913)', 'University of Waterloo, Elliott Avedon Virtual Museum of Games: Changgi', 'Wikipedia, “Janggi” (setups, bikjang, scoring)'], links: [{ g: 'janggi' }, { g: 'xiangqi' }, { g: 'chess' }] },
    // (2026-11-24) mahjong is a page of its own (mahjong/, not in the Atlas's GAMES): the cover and the first link go there (href), named by the story's text (game)
    { id: 'mahjong', region: 'asia', color: '#1d6a4a', cover: { g: 'mahjong', s: 'mahjong', href: '../mahjong/' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'mahjongTiles' }, m1: { svg: 'mahjongHand' }, m2: { svg: 'mahjongSpread' } }, refs: ['沈一帆『圖畫麻雀牌譜』(1914) / Yifan Shen, Illustrated Mahjong Guide', 'William Henry Wilkinson, “Chinese Origin of Playing Cards”, American Anthropologist (1895)', 'Joseph Park Babcock, Rules of Mah-Jongg (1920)', '天野大三「報知ルール」（報知新聞、1952）', '中国国家体育总局『中国麻将竞赛规则』(1998) / Mahjong Competition Rules', 'Wikipedia, “Mahjong”, “Japanese mahjong”'], links: [{ g: 'mahjong', href: '../mahjong/' }, { g: 'shanghai' }, { g: 'xiangqi' }] },
    { id: 'gomoku', region: 'asia', color: '#5a3a24', cover: { g: 'gomoku', s: 'gomoku' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'gomokuFive' }, m1: { svg: 'renjuForbidden' }, m2: { svg: 'gomokuSolved' } }, refs: ['黒岩涙香『萬朝報』（1899年12月6日） / Ruikō Kuroiwa, Yorozu chōhō (1899)', '『五目定石集』（1856） / Gomoku Jōseki Collection', 'L. Victor Allis, Searching for Solutions in Games and Artificial Intelligence (PhD thesis, University of Limburg, 1994)', 'János Wágner, István Virág, “Solving Renju”, ICGA Journal 24(1) (2001)', 'Renju International Federation (RIF), rules and history'], links: [{ g: 'gomoku' }, { g: 'go' }, { g: 'connect4' }] },
    { id: 'carrom', region: 'asia', color: '#8a4a22', cover: { g: 'carrom', s: 'carrom' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'carromBoard' }, m1: { svg: 'carromStrike' }, m2: { svg: 'carromFamily' } }, refs: ['International Carrom Federation, Laws of Carrom', 'Wikipedia, “Carrom” (Patiala palace board; early tournaments in India and Sri Lanka; North American carrom)', 'Wikipedia, “International Carrom Federation” (founded 1988, Chennai; world championships from 1991)', 'Wikipedia, “Novuss”', 'tradgames.org.uk, “Carrom: History and Information”'], links: [{ g: 'carrom' }, { g: 'crokinole' }, { g: 'ludo' }] },
    { id: 'crokinole', region: 'americas', color: '#6a4424', cover: { g: 'crokinole', s: 'crokinole' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'crokinoleBoard' }, m1: { svg: 'crokinoleShot' }, m2: { svg: 'crokinoleTime' } }, refs: ['Joseph Schneider Haus, Kitchener, Ontario: the Wettlaufer crokinole board (1876)', 'Joshua K. Ingalls, US Patent No. 226,615 (20 April 1880)', 'World Crokinole Championship, Tavistock, Ontario (since 1999)', 'National Crokinole Association (NCA)', 'Wikipedia, “Crokinole” (name, rules, origins)'], links: [{ g: 'crokinole' }, { g: 'carrom' }, { g: 'hockey' }] },
    { id: 'ugolki', region: 'europe', color: '#1f4e9a', cover: { g: 'ugolki', s: 'ugolki' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'halmaJump' }, m1: { svg: 'ugolkiCorner' }, m2: { svg: 'halmaStar' } }, refs: ['George Howard Monks, US Patent No. 383,653 (Halma, 1888)', 'Bruce Whitehill, on the origins of Halma (as cited by tradgames.org.uk, “Halma”)', 'tradgames.org.uk, “Halma” (Hoppity, Thomas Hill, Stern-Halma 1892, J. Pressman & Co. 1928)', 'Wikipedia, “Halma”, “Chinese checkers”, “Ugolki”', 'И. Троицкий, учебник классических уголков / I. Troitsky, a textbook of classic ugolki (the 40/80-move rules)'], links: [{ g: 'ugolki' }, { g: 'checkers' }, { g: 'peg' }] },
    { id: 'agon', region: 'europe', color: '#7a2a22', cover: { g: 'agon', s: 'agon' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'agonBoard' }, m1: { svg: 'agonMove' }, m2: { svg: 'agonCapture' } }, refs: ['Thos Sherwin, Agon, or the Queen’s Guards (London, 1842)', 'David Parlett, The Oxford History of Board Games (1999)', 'Jack Botermans, The Book of Games: Strategy, Tactics & History (2008)', 'Ludii Portal, “Agon” (rules and starting layout)', 'Wikipedia, “Agon (game)”'], links: [{ g: 'agon' }, { g: 'hex' }, { g: 'ugolki' }] },
    { id: 'dots', region: 'europe', color: '#2a4a7a', cover: { g: 'dots', s: 'dots' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'dotsChain' }, m1: { svg: 'connect4Gravity' }, m2: { svg: 'solvedTimeline' } }, refs: ['Édouard Lucas, La Pipopipette (1889); also in L’Arithmétique amusante (1895)', 'Elwyn Berlekamp, The Dots and Boxes Game: Sophisticated Child’s Play (2000)', 'E. R. Berlekamp, J. H. Conway, R. K. Guy, Winning Ways for your Mathematical Plays, vol. 2 (1982), ch. 16', 'L. Victor Allis, A Knowledge-based Approach of Connect-Four (master’s thesis, Vrije Universiteit Amsterdam, 1988)', 'tradgames.org.uk, “Four in a Row” (Milton Bradley 1974; the Captain’s Mistress story)', 'Wikipedia, “Dots and boxes”, “Connect Four”'], links: [{ g: 'dots' }, { g: 'connect4' }, { g: 'gomoku' }] },
    { id: 'hitblow', region: 'europe', color: '#2b3683', cover: { g: 'hitblow', s: 'hitblow' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'hitblowFeedback' }, m1: { svg: 'hitblowSearch' }, m2: { svg: 'hitblowFive' } }, refs: ['Donald E. Knuth, “The Computer as Master Mind”, Journal of Recreational Mathematics 9(1) (1976–77)', 'Kenji Koyama, Tony W. Lai, “An Optimal Mastermind Strategy”, Journal of Recreational Mathematics 25(4) (1993)', 'Jerrold M. Grochow, “MOO in Multics”, Software: Practice and Experience 2(3) (1972)', 'Invicta Plastics, Mastermind (1971–72)', 'Wikipedia, “Mastermind (board game)”, “Bulls and cows”'], links: [{ g: 'hitblow' }, { g: 'sudoku' }, { g: 'dots' }] },
    { id: 'botao', region: 'americas', color: '#2f7a2a', cover: { g: 'botao', s: 'botao' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'botaoFlick' }, m1: { svg: 'botaoRules' }, m2: { svg: 'botaoFamily' } }, refs: ['Geraldo Décourt, rules of “Foot-Ball Celotex” (1929/1930)', 'Conselho Nacional de Desportos, Resolução n.º 14 (29 September 1988)', 'Confederação Brasileira de Futebol de Mesa (CBFM), Regra 12 Toques', 'Peter Adolph, Subbuteo (patent 1946–47)', 'Wikipedia, “Button football”, “Subbuteo”, “Table football”'], links: [{ g: 'botao' }, { g: 'hockey' }, { g: 'carrom' }] },
  ];
  // pictures shown only beside a story's paragraph (not in another room): a museum's open-access photo (CC0), linked to the museum's page.
  // The name, in each language, is MUSEUM_READ_T[lang].pic[id]. Files images/atlas/museum-story/pic/<id>.webp (≤ 960 px).
  const PIC = { tlvmirror: { cma: '1995.296' }, kotoboard: { cma: '1985.269' }, homerbg: { cma: '1942.1484' }, trictrac: { cma: '1958.373' }, gametable: { cma: '1953.284' }, kota: { cma: '1978.71' } };
  const picUrl = id => { const P = PIC[id] || {}; return P.cma ? 'https://www.clevelandart.org/art/' + P.cma : 'https://www.metmuseum.org/art/collection/search/' + P.met; };
  const src = p => p.pic ? `../images/atlas/museum-story/pic/${p.pic}.webp?v=1` : p.s ? `../images/atlas/museum-story/${p.s}.webp?v=1` : p.g ? `../images/atlas/${p.g}.webp` : p.ex ? `../images/atlas/ex/${p.ex}.webp` : `../images/atlas/paint/${p.paint}-t.webp?v=1`;
  const ga = p => p && p.g && !p.s ? ' ga' : '';   // (a cover from the game's own art: a transparent icon, shown whole on the story's colour)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let host = null, ctx = null, lang = 'ja', cur = null, qs = null, region = (() => { try { return localStorage.getItem('atlas-read-region') || 'all'; } catch (e) { return 'all'; } })();
  const T = () => window.MUSEUM_READ_T || {};
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const st = id => tx()[id] || (T().en || {})[id] || {};
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
  const stamps = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const MK = ids => { try { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark('read', ids, STORIES.length); } catch (e) {} };   // (館内スタンプ帳)
  const setStamp = id => { const s = stamps(); s[id] = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} MK(id); };
  const nm = (k, id) => (tx()[k] || {})[id] || ((T().en || {})[k] || {})[id] || id;
  const exName = id => nm('ex', id), paintName = id => nm('paint', id), picName = id => nm('pic', id);
  const gName = id => { const g = ((ctx && ctx.games) || []).find(q => q.id === id); return g && ctx.gname ? ctx.gname(g) : (cur && st(cur.id).game) || id; };
  // a painting: open the paintings room, then the work in its viewer
  // (2026-11-24 audit: a figure opened from a story brings the reader back) closing the painting or the case returns to the read room, the same
  // place in the story and the button that opened it
  function backTo(btn) { const y = scrollY, k = btn && (btn.dataset.paint ? `[data-paint="${btn.dataset.paint}"]` : btn.dataset.ex ? `[data-ex="${btn.dataset.ex}"]` : ''), cls = btn && btn.className.split(' ')[0];
    return () => { if (ctx.goRoom) ctx.goRoom('read', { replace: 1 }); setTimeout(() => { scrollTo(0, y); const b = btn && btn.isConnected ? btn : k && (document.querySelector(`.muroom[data-r="read"] .${cls}${k}`) || document.querySelector(`.muroom[data-r="read"] ${k}`)); if (b) b.focus({ preventScroll: true }); }, 60); }; }
  function openPaint(id, btn) { if (!ctx.goRoom) return; const back = backTo(btn); ctx.goRoom('paint', { replace: 1 }); let n = 0; const t = () => { if (window.AtlasPaint && document.querySelector('.muroom[data-r="paint"] .ptc')) { AtlasPaint.onClose = back; AtlasPaint.open(id); } else if (++n < 100) setTimeout(t, 100); }; t(); }
  function openEx(id, btn) { if (!ctx.goEx) return; const back = backTo(btn); ctx.goEx(id); let n = 0; const t = () => { if (window.AtlasGallery) AtlasGallery.onClose = back; else if (++n < 100) setTimeout(t, 100); }; t(); }
  // (2026-11-24 ユーザー: 地図や系統樹とのつながり) the story's game on the map and in the tree, when they have it
  function pickHtml(S) {
    const g = (S.links[0] || {}).g, M = window.AtlasMuseum; if (!g || !M || !M.pickIn || !(ctx.games || []).some(q => q.id === g)) return '';
    const inMap = window.ATLAS_MAP_DATA ? !!ATLAS_MAP_DATA[g] : true, inTree = window.AtlasTree ? AtlasTree.N.some(n => n[0] === g) : true;
    return [inMap && 'map', inTree && 'tree'].filter(Boolean).map(r => `<button type="button" class="chlk rm" data-pick="${r}" data-pg="${g}"><i>${esc(M.rname(r))}</i>${esc(gName(g))}</button>`).join('');
  }
  function linkHtml(L) {
    if (L.g) { const g = (ctx.games || []).find(q => q.id === L.g); if (!g && L.href) return `<button type="button" class="chlk" data-href="${L.href}"><i>${esc(u('game'))}</i>${esc(gName(L.g))}</button>`; return g ? `<button type="button" class="chlk" data-g="${L.g}"><i>${esc(u('game'))}</i>${esc(ctx.gname ? ctx.gname(g) : L.g)}</button>` : ''; }
    if (L.ex) return `<button type="button" class="chlk ex" data-ex="${L.ex}"><i>${esc(u('exhibit'))}</i>${esc(exName(L.ex))}</button>`;
    if (L.paint) return `<button type="button" class="chlk pt" data-paint="${L.paint}"><i>${esc(u('art'))}</i>${esc(paintName(L.paint))}</button>`;
    return `<button type="button" class="chlk rm" data-room="${L.room}"><i>${esc(u('room'))}</i>${esc(u('room_' + L.room))}</button>`;
  }
  /* ---------- (2026-11-24 ユーザー: 画像なども使って読みやすく) figures inside an article: a museum piece, a painting, a story picture,
     or a diagram drawn here (svg) — each with its caption from the language's more[k].cap ---------- */
  // (2026-11-24, story 29) a mahjong tile in plain SVG: kind m (characters) / p (dots) / s (bamboo) / z (an honour or flower, n = its character)
  const MJ_NUM = '一二三四五六七八九', MJ_PAT = [[[.5, .5]], [[.5, .27], [.5, .73]], [[.25, .2], [.5, .5], [.75, .8]], [[.3, .27], [.7, .27], [.3, .73], [.7, .73]], [[.3, .22], [.7, .22], [.5, .5], [.3, .78], [.7, .78]],
    [[.3, .2], [.7, .2], [.3, .5], [.7, .5], [.3, .8], [.7, .8]], [[.2, .14], [.5, .26], [.8, .38], [.3, .62], [.7, .62], [.3, .86], [.7, .86]], [[.3, .14], [.7, .14], [.3, .38], [.7, .38], [.3, .62], [.7, .62], [.3, .86], [.7, .86]],
    [[.2, .18], [.5, .18], [.8, .18], [.2, .5], [.5, .5], [.8, .5], [.2, .82], [.5, .82], [.8, .82]]];
  function mjTile(x, y, w, h, kind, n, col) {
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3.5" fill="#fbf8ee" stroke="#9a9280" stroke-width="1"/><rect x="${x}" y="${y + h - 4}" width="${w}" height="4" rx="2" fill="#1d7a52"/>`;
    const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 9;
    if (kind === 'm') g += `<text x="${x + w / 2}" y="${y + h * .4}" font-size="13" font-weight="800" fill="#1d1b22" text-anchor="middle">${MJ_NUM[n - 1]}</text><text x="${x + w / 2}" y="${y + h * .78}" font-size="13" font-weight="800" fill="#c62828" text-anchor="middle">萬</text>`;
    else if (kind === 'p' || kind === 's') { const P = MJ_PAT[n - 1], r = n === 1 ? iw * .32 : n <= 4 ? iw * .17 : iw * .13;
      P.forEach(([u, v], q) => { const cx = ix + u * iw, cy = iy + v * ih, c = kind === 'p' ? (n === 5 && q === 2 || n === 1 ? '#c62828' : q % 2 ? '#c62828' : '#1b4fa0') : (n === 1 || (n === 5 || n === 9) && q === 4 || n === 7 && q === 0 ? '#c62828' : '#14864a');
        g += kind === 'p' ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${n === 1 ? 2.2 : 1.5}"/><circle cx="${cx}" cy="${cy}" r="${r * .35}" fill="${c}"/>` : `<rect x="${cx - r * .55}" y="${cy - r * 1.15}" width="${r * 1.1}" height="${r * 2.3}" rx="${r * .4}" fill="${c}"/>`; }); }
    else g += `<text x="${x + w / 2}" y="${y + h * .62}" font-size="${w > 25 ? 16 : 14}" font-weight="800" fill="${col || '#1d1b22'}" text-anchor="middle">${n}</text>`;
    return g;
  }
  const mjL = k => ((st('mahjong').figL || {})[k]) || [];
  // agon: the 91-cell board (a hexagon of side 6: the throne and five rings round it), pointy-top cells at axial (q, r) — the cells, the rings' colours, the throne's star, and P(q, r) → [x, y]
  const agonHex = (u, ox, oy, fade) => { const R = u / Math.sqrt(3), P = (q, r) => [ox + (q + r / 2) * u, oy + r * u * Math.sqrt(3) / 2], ring = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    const hx = (x, y, rr) => 'M' + [0, 1, 2, 3, 4, 5].map(k => { const a = (-90 + 60 * k) * Math.PI / 180; return `${(x + rr * Math.cos(a)).toFixed(1)} ${(y + rr * Math.sin(a)).toFixed(1)}`; }).join('L') + 'Z';
    let g = `<path d="${hx(ox, oy, u * 5.68)}" transform="rotate(30 ${ox} ${oy})" fill="#5a1e14"/>`;
    for (let r = -5; r <= 5; r++) for (let q = Math.max(-5, -5 - r); q <= Math.min(5, 5 - r); q++) { const k = ring(q, r), [x, y] = P(q, r);
      g += `<path d="${hx(x, y, R - .6)}" fill="${k === 0 ? '#1f5a3a' : k % 2 ? (fade ? '#d8a49a' : '#a8322a') : (fade ? '#f8f1e4' : '#efe3c8')}" stroke="#c9a24a" stroke-width=".8"/>`; }
    const [cx, cy] = P(0, 0); g += `<path d="M${cx} ${cy - R * .62}L${cx + R * .54} ${cy + R * .31}L${cx - R * .54} ${cy + R * .31}ZM${cx} ${cy + R * .62}L${cx + R * .54} ${cy - R * .31}L${cx - R * .54} ${cy - R * .31}Z" fill="#d9b04a"/>`;
    const pc = (q, r, kind, op) => { const [x, y] = P(q, r), w = kind === 1 || kind === 2, f = w ? '#f4ecd8' : '#2a2220', s = w ? '#8a7a5a' : '#000', o = op ? ` opacity="${op}"` : '';
      if (kind === 2 || kind === 4) return `<path d="${hx(x, y, R * .82)}" fill="${f}" stroke="${s}" stroke-width="1.4"${o}/><path d="M${x - R * .42} ${y + R * .22}L${x - R * .48} ${y - R * .3}L${x - R * .2} ${y - R * .05}L${x} ${y - R * .4}L${x + R * .2} ${y - R * .05}L${x + R * .48} ${y - R * .3}L${x + R * .42} ${y + R * .22}Z" fill="${w ? '#2a2220' : '#f4ecd8'}"${o}/>`;
      return `<circle cx="${x}" cy="${y}" r="${R * .72}" fill="${f}" stroke="${s}" stroke-width="1.4"${o}/><circle cx="${x}" cy="${y}" r="${R * .4}" fill="none" stroke="${w ? '#c8b88f' : '#4a3e38'}" stroke-width="1"${o}/>`; };
    return { g, P, R, pc, hx, ring }; };
  const DIAG = {
    // the twenty squares, the five rosettes, and one player's road (1 → 14) as the reconstructed rules run it
    urBoard: () => { const C = 46, X0 = 12, Y0 = 12, ex = (r, c) => r === 1 || c < 4 || c > 5, ros = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
      const road = [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 7], [2, 6]], cx = c => X0 + c * C + C / 2, cy = r => Y0 + r * C + C / 2;
      let g = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (ex(r, c)) { const R = ros.some(([a, b]) => a === r && b === c);
        g += `<rect x="${X0 + c * C + 1.5}" y="${Y0 + r * C + 1.5}" width="${C - 3}" height="${C - 3}" rx="6" fill="${R ? '#f4e2b8' : '#fbf6ea'}" stroke="#2f4a6e" stroke-width="2"/>`;
        if (R) { let f = ''; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; f += `<ellipse cx="${cx(c) + Math.cos(t) * 9}" cy="${cy(r) + Math.sin(t) * 9}" rx="7" ry="3.6" transform="rotate(${k * 45} ${cx(c) + Math.cos(t) * 9} ${cy(r) + Math.sin(t) * 9})" fill="#c0503a"/>`; } g += f + `<circle cx="${cx(c)}" cy="${cy(r)}" r="4.5" fill="#2f4a6e"/>`; } }
      g += `<defs><marker id="urA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2f7d4a"/></marker></defs><polyline points="${road.map(([r, c]) => cx(c) + ',' + cy(r)).join(' ')}" fill="none" stroke="#2f7d4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" opacity=".7" marker-end="url(#urA)"/>`;
      g += road.map(([r, c], i) => `<circle cx="${X0 + c * C + 13}" cy="${Y0 + r * C + 13}" r="11.5" fill="#2f7d4a" stroke="#fff" stroke-width="1.5"/><text x="${X0 + c * C + 13}" y="${Y0 + r * C + 18.6}" font-size="15.5" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text>`).join('');
      return `<svg viewBox="0 0 ${X0 * 2 + C * 8} ${Y0 * 2 + C * 3}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the liubo board's lines: a square in the middle with a T on each side, an L facing each T from the edge, a V in each corner
    tlv: () => { const S = 240, m = S / 2, k = 34, st = 'stroke="#5a2a18" stroke-width="5" fill="none" stroke-linecap="square"'; let g = `<rect x="6" y="6" width="${S - 12}" height="${S - 12}" rx="10" fill="#e9d3a6" stroke="#5a2a18" stroke-width="3"/><rect x="${m - k}" y="${m - k}" width="${k * 2}" height="${k * 2}" ${st}/>`;
      for (let q = 0; q < 4; q++) { const R = `transform="rotate(${q * 90} ${m} ${m})"`;
        g += `<path d="M${m} ${m - k}V${m - k - 18}M${m - 16} ${m - k - 18}H${m + 16}" ${st} ${R}/>`;   // T
        g += `<path d="M${m - 16} ${20}V${36}H${m + 16}" ${st} ${R}/>`;   // L
        g += `<path d="M${22} ${48}L${22} ${22}L${48} ${22}" ${st} ${R}/>`; }   // V
      g += `<circle cx="${m}" cy="${m}" r="9" fill="#5a2a18"/>`;
      return `<svg viewBox="0 0 ${S} ${S}" role="img" style="font-family:inherit;max-width:300px;margin:0 auto">${g}</svg>`; },
    // a tabula board: 24 points in two rows of 12, a bar in the middle; both players run the same road (the arrow)
    tabula: () => { const W = 360, H = 220, x0 = 14, w = (W - 28 - 16) / 12, t = 82; let g = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="10" fill="#e8d2a6" stroke="#5b4a2e" stroke-width="3"/><rect x="${W / 2 - 8}" y="8" width="16" height="${H - 16}" fill="#5b4a2e"/>`;
      for (let i = 0; i < 12; i++) { const x = x0 + i * w + (i >= 6 ? 16 : 0), c = i % 2 ? '#7a3a2a' : '#2f4a3a';
        g += `<path d="M${x + 1} 12L${x + w / 2} ${12 + t}L${x + w - 1} 12Z" fill="${c}"/><path d="M${x + 1} ${H - 12}L${x + w / 2} ${H - 12 - t}L${x + w - 1} ${H - 12}Z" fill="${i % 2 ? '#2f4a3a' : '#7a3a2a'}"/>`; }
      g += `<defs><marker id="tbA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c98a1a"/></marker></defs><path d="M${x0 + 4} ${H / 2 - 18}H${W - x0 - 22}Q${W - x0 - 4} ${H / 2} ${W - x0 - 22} ${H / 2 + 18}H${x0 + 14}" fill="none" stroke="#c98a1a" stroke-width="5" stroke-linecap="round" marker-end="url(#tbA)"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // a ban-sugoroku board: 12 points a side and the middle divider; white and black run opposite ways round it
    bansugo: () => { const W = 360, H = 210, x0 = 14, w = (W - 28 - 16) / 12; let g = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="8" fill="#5a2e1c" stroke="#3a1c10" stroke-width="3"/><rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="4" fill="#ecd3a2"/><rect x="${W / 2 - 8}" y="10" width="16" height="${H - 20}" fill="#5a2e1c"/>`;
      for (let i = 0; i < 12; i++) { const x = x0 + i * w + (i >= 6 ? 16 : 0) + w / 2; g += `<rect x="${x - 7}" y="16" width="14" height="44" rx="7" fill="#c9a06a"/><rect x="${x - 7}" y="${H - 60}" width="14" height="44" rx="7" fill="#c9a06a"/>`; }
      const arr = (y, rev, c) => `<path d="${rev ? `M${W - 30} ${y}H40` : `M30 ${y}H${W - 40}`}" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" marker-end="url(#bs${c === '#fff' ? 'W' : 'B'})"/>`;
      g += `<defs><marker id="bsW" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff"/></marker><marker id="bsB" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>`;
      g += `<rect x="24" y="${H / 2 - 30}" width="${W - 48}" height="60" rx="10" fill="rgba(90,46,28,.55)"/>` + arr(H / 2 - 13, false, '#fff') + arr(H / 2 + 13, true, '#222');
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // two 5×5 boards: the fers's reach (one square diagonally) and the modern queen's (any distance in eight directions)
    queenMoves: () => { const C = 26, N = 7, pad = 10, B = C * N, W = pad * 3 + B * 2, H = pad * 2 + B + 26; let g = '';
      const board = (ox, full) => { let s = ''; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) s += `<rect x="${ox + c * C}" y="${pad + r * C}" width="${C}" height="${C}" fill="${(r + c) % 2 ? '#c9a77a' : '#f2e3c6'}"/>`;
        const m = 3; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const dr = r - m, dc = c - m, ok = (dr || dc) && (full ? (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) : (Math.abs(dr) === 1 && Math.abs(dc) === 1));
          if (ok) s += `<circle cx="${ox + c * C + C / 2}" cy="${pad + r * C + C / 2}" r="6" fill="#2a3a52" opacity=".75"/>`; }
        s += `<circle cx="${ox + m * C + C / 2}" cy="${pad + m * C + C / 2}" r="10" fill="#b0402a" stroke="#fff" stroke-width="2"/>`;
        return s + `<rect x="${ox}" y="${pad}" width="${B}" height="${B}" fill="none" stroke="#5a4632" stroke-width="2"/>`; };
      g += board(pad, false) + board(pad * 2 + B, true);
      return `<svg viewBox="0 0 ${W} ${H - 26}" role="img" style="font-family:inherit">${g}</svg>`; },
    // a senet board: 3 × 10, the S-shaped road, squares 26–30 marked
    senet: () => { const C = 34, x0 = 10, y0 = 10, W = x0 * 2 + C * 10, H = y0 * 2 + C * 3; let g = `<rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="8" fill="#3a2a16"/>`;
      const pos = n => { const r = Math.floor((n - 1) / 10), k = (n - 1) % 10, c = r === 1 ? 9 - k : k; return [x0 + c * C, y0 + r * C]; };
      const mark = { 15: '☥', 26: '⌂', 27: '≈', 28: 'III', 29: 'II', 30: '☉' };
      for (let n = 1; n <= 30; n++) { const [x, y] = pos(n), sp = n >= 26 || n === 15; g += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${C - 3}" height="${C - 3}" rx="3" fill="${n === 27 ? '#8fb6d8' : sp ? '#f2d98a' : '#ead7b0'}"/>`;
        g += sp ? `<text x="${x + C / 2}" y="${y + C / 2 + 6}" font-size="${n === 26 ? 18 : 15}" font-weight="800" fill="#5a3a12" text-anchor="middle">${mark[n]}</text>` : (n === 1 || n % 5 === 0) ? `<text x="${x + 4}" y="${y + 15}" font-size="14.5" font-weight="700" fill="#8a7450">${n}</text>` : ''; }
      const pts = []; for (let n = 1; n <= 30; n++) { const [x, y] = pos(n); pts.push((x + C / 2) + ',' + (y + C / 2 + (n >= 26 || n === 15 ? 10 : 6))); }
      g += `<defs><marker id="snA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b0402a"/></marker></defs><polyline points="${pts.slice(0, 26).join(' ')}" fill="none" stroke="#b0402a" stroke-width="2.5" stroke-linejoin="round" opacity=".6" marker-end="url(#snA)"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the Lewis chessmen by kind (kings, queens, bishops, knights, warders, pawns), with the chess letters as labels
    lewisCount: () => { const n = [['K', 8], ['Q', 8], ['B', 16], ['N', 15], ['R', 12], ['P', 19]], W = 320, H = 150, bw = 36, gap = (W - 30 - bw * 6) / 5; let g = '';
      n.forEach(([k, v], i) => { const x = 15 + i * (bw + gap), h = v / 19 * 96, y = 112 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="#3e4a5c"/><text x="${x + bw / 2}" y="${y - 6}" font-size="14.5" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}</text><text x="${x + bw / 2}" y="134" font-size="20" fill="#2b2a28" text-anchor="middle">${'♔♕♗♘♖♙'[i]}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><line x1="8" y1="112.5" x2="${W - 8}" y2="112.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
    // the Ballinderry board as holes (7 × 7, centre and corners marked) with a brandubh start: king, 4 defenders, 8 attackers
    brandubh: () => { const C = 30, N = 7, o = 14, W = o * 2 + C * N; let g = `<rect x="3" y="3" width="${W - 6}" height="${W - 6}" rx="10" fill="#7a5530"/><rect x="9" y="9" width="${W - 18}" height="${W - 18}" rx="7" fill="none" stroke="#5a3c20" stroke-width="2"/>`;
      const at = (r, c) => [o + c * C + C / 2, o + r * C + C / 2], m = 3, k = (r, c) => r + ',' + c;
      const def = new Set([k(2, 3), k(4, 3), k(3, 2), k(3, 4)]), att = new Set([k(0, 3), k(1, 3), k(5, 3), k(6, 3), k(3, 0), k(3, 1), k(3, 5), k(3, 6)]);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const [x, y] = at(r, c), sp = (r === m && c === m) || ((r === 0 || r === 6) && (c === 0 || c === 6));
        if (sp) g += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="#f2d98a" stroke-width="2.5"/>`;
        g += `<circle cx="${x}" cy="${y}" r="4" fill="#3a2410"/>`;
        if (r === m && c === m) g += `<circle cx="${x}" cy="${y}" r="9" fill="#f6ecd2" stroke="#3a2410" stroke-width="1.5"/><text x="${x}" y="${y + 4.5}" font-size="12" font-weight="800" fill="#3a2410" text-anchor="middle">♔</text>`;
        else if (def.has(k(r, c))) g += `<circle cx="${x}" cy="${y}" r="8" fill="#f6ecd2" stroke="#3a2410" stroke-width="1.5"/>`;
        else if (att.has(k(r, c))) g += `<circle cx="${x}" cy="${y}" r="8" fill="#1f1a16" stroke="#e8d7b0" stroke-width="1.2"/>`; }
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // tablut as Linnaeus noted it: 9 × 9, the king on the throne, 8 Swedes, 16 Muscovites; the king wins on any edge square
    tablut: () => { const C = 26, N = 9, o = 8, W = o * 2 + C * N; let g = '';
      const k = (r, c) => r + ',' + c, def = new Set(), att = new Set();
      [2, 3, 5, 6].forEach(i => { def.add(k(i, 4)); def.add(k(4, i)); });
      [3, 4, 5].forEach(i => { att.add(k(0, i)); att.add(k(8, i)); att.add(k(i, 0)); att.add(k(i, 8)); }); [k(1, 4), k(7, 4), k(4, 1), k(4, 7)].forEach(x => att.add(x));
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = o + c * C, y = o + r * C, edge = r === 0 || c === 0 || r === 8 || c === 8, th = r === 4 && c === 4;
        g += `<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${th ? '#e2b85c' : edge ? '#d9e6c8' : '#f2e3c6'}" stroke="#a88c62" stroke-width="1"/>`;
        const cx = x + C / 2, cy = y + C / 2;
        if (th) g += `<circle cx="${cx}" cy="${cy}" r="10" fill="#fff8e6" stroke="#3a2a16" stroke-width="1.6"/><text x="${cx}" y="${cy + 5}" font-size="13" font-weight="800" fill="#3a2a16" text-anchor="middle">♔</text>`;
        else if (def.has(k(r, c))) g += `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#fff8e6" stroke="#3a2a16" stroke-width="1.6"/>`;
        else if (att.has(k(r, c))) g += `<circle cx="${cx}" cy="${cy}" r="8.5" fill="#2f4f3a" stroke="#f2e3c6" stroke-width="1.2"/>`; }
      g += `<rect x="${o}" y="${o}" width="${C * N}" height="${C * N}" fill="none" stroke="#5a4632" stroke-width="2.5"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the 63 squares of the Game of the Goose as a 9 × 7 spiral, outside in: geese green, bridge blue, hold-ups amber, setbacks red, 63 gold
    gooseSpiral: () => { const C = 34, X = 9, Y = 7, o = 6, W = o * 2 + C * X, H = o * 2 + C * Y, cells = []; let t = 0, b = Y - 1, l = 0, r = X - 1;
      while (t <= b && l <= r) { for (let c = l; c <= r; c++) cells.push([t, c]); t++; for (let q = t; q <= b; q++) cells.push([q, r]); r--; if (t <= b) { for (let c = r; c >= l; c--) cells.push([b, c]); b--; } if (l <= r) { for (let q = b; q >= t; q--) cells.push([q, l]); l++; } }
      const gz = new Set([5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]), col = n => n === 63 ? '#a8741c' : gz.has(n) ? '#9cc27a' : n === 6 ? '#8fb6d8' : [19, 31, 52].includes(n) ? '#efc98a' : [42, 58].includes(n) ? '#e59a86' : '#f4ead2';
      let g = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="#5a6e2a"/>`, pts = [];
      cells.forEach(([q, c], i) => { const n = i + 1, x = o + c * C, y = o + q * C; pts.push((x + C / 2) + ',' + (y + C / 2));
        g += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${C - 3}" height="${C - 3}" rx="4" fill="${col(n)}"${n === 63 ? ' stroke="#fff3cf" stroke-width="2"' : ''}/><text x="${x + C / 2}" y="${y + C / 2 + 4.5}" font-size="${n === 63 ? 15 : 13.5}" font-weight="800" fill="${n === 63 ? '#fff' : '#2b2a1c'}" text-anchor="middle">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // why the first throw of 9 is special: geese every 9 squares (in steps of 4 and 5), so a 9 would chain straight to 63
    gooseNine: () => { const W = 340, H = 120, x0 = 14, sx = (W - 28) / 63, y = 78, X = n => x0 + n * sx; let g = `<line x1="${X(0)}" y1="${y}" x2="${X(63)}" y2="${y}" stroke="#8a7a5a" stroke-width="2"/>`;
      const gz = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
      for (let n = 0; n <= 63; n++) if (n % 9 === 0 || n === 63) g += `<text x="${X(n)}" y="${y + 26}" font-size="14" font-weight="800" fill="#2b2a28" text-anchor="middle">${n}</text>`;
      gz.forEach(n => { g += `<circle cx="${X(n)}" cy="${y}" r="5.5" fill="${n % 9 ? '#c9dcb4' : '#5a8a3a'}" stroke="#3a5a24" stroke-width="1.2"/>`; });
      for (let n = 0; n < 63; n += 9) g += `<path d="M${X(n)} ${y - 7} Q${X(n + 4.5)} ${y - 46} ${X(n + 9)} ${y - 7}" fill="none" stroke="#b0402a" stroke-width="2.2" marker-end="url(#gnA)"/>`;
      g += `<circle cx="${X(63)}" cy="${y}" r="8" fill="#e2b85c" stroke="#7a5a1a" stroke-width="1.5"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="gnA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b0402a"/></marker></defs>${g}</svg>`; },
    // shogi pieces: one colour for both sides, told apart by which way the point faces; the back of a pawn shows its promotion (と)
    shogiPieces: () => { const W = 330, H = 150; let g = '';
      const pc = (cx, cy, up, ch, red, s) => { const w = 54 * s, h = 64 * s, d = up ? 1 : -1, t = cy - d * h / 2, b = cy + d * h / 2, sh = cy - d * h * .22;
        const pts = [[cx, t], [cx + w * .4, sh], [cx + w / 2, b], [cx - w / 2, b], [cx - w * .4, sh]].map(p => p.join(',')).join(' ');
        return `<polygon points="${pts}" fill="#e8c98a" stroke="#7a5428" stroke-width="2" stroke-linejoin="round"/><text x="${cx}" y="${cy + d * 6 + 10 * s}" font-size="${28 * s}" font-weight="800" fill="${red ? '#b0302a' : '#2b1a0a'}" text-anchor="middle" transform="rotate(${up ? 0 : 180} ${cx} ${cy + 3})">${ch}</text>`; };
      g += pc(60, 76, true, '歩', false, 1) + pc(140, 76, false, '歩', false, 1);
      g += `<path d="M190 76h34" stroke="#8a7a5a" stroke-width="2.5" marker-end="url(#spA)"/>` + pc(270, 76, true, 'と', true, 1);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="spA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a7a5a"/></marker></defs>${g}</svg>`; },
    // the big shogi variants drawn to scale from one corner: 9×9 (40 pieces), 12×12 (92), 15×15 (130), 25×25 (354), 36×36 (804)
    shogiSizes: () => { const u = 6, o = 8, B = 36 * u, W = o * 2 + B + 128, H = o * 2 + B; const v = [[36, 804, '#efe2c4'], [25, 354, '#e2cc9c'], [15, 130, '#cfae72'], [12, 92, '#b88c4e'], [9, 40, '#6b4a24']]; let g = '';
      v.forEach(([n, p, f]) => { const s = n * u; g += `<rect x="${o}" y="${H - o - s}" width="${s}" height="${s}" fill="${f}" stroke="#5a3c1c" stroke-width="1.5"/>`; });
      v.forEach(([n, p, f], i) => { const y = o + 14 + i * 40, lx = o + B + 18; g += `<rect x="${lx}" y="${y - 12}" width="18" height="18" rx="3" fill="${f}" stroke="#5a3c1c" stroke-width="1.2"/><text x="${lx + 26}" y="${y + 3}" font-size="15.5" font-weight="800" fill="#2b2a28">${n}×${n}</text><text x="${lx + 26}" y="${y + 21}" font-size="14.5" fill="#5a4430">${p}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // a pachisi cross: four arms of 3 × 8 around the home square; one player's road: down the middle of their arm, round anticlockwise, back up the middle
    pachisiBoard: () => { const C = 14, o = 6, N = 19, W = o * 2 + C * N; let g = `<rect x="${o + C * 8}" y="${o + C * 8}" width="${C * 3}" height="${C * 3}" fill="#a0482a"/>`;
      const sq = (c, r) => `<rect x="${o + c * C}" y="${o + r * C}" width="${C}" height="${C}" fill="#f2e3c6" stroke="#b08a5a" stroke-width="1"/>`;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const inV = c >= 8 && c <= 10, inH = r >= 8 && r <= 10; if ((inV && (r < 8 || r > 10)) || (inH && (c < 8 || c > 10))) g += sq(c, r); }
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2], pts = [];
      for (let r = 11; r <= 18; r++) pts.push(P(9, r));
      for (let r = 18; r >= 11; r--) pts.push(P(10, r)); for (let c = 11; c <= 18; c++) pts.push(P(c, 10)); pts.push(P(18, 9));
      for (let c = 18; c >= 11; c--) pts.push(P(c, 8)); for (let r = 7; r >= 0; r--) pts.push(P(10, r)); pts.push(P(9, 0));
      for (let r = 0; r <= 7; r++) pts.push(P(8, r)); for (let c = 7; c >= 0; c--) pts.push(P(c, 8)); pts.push(P(0, 9));
      for (let c = 0; c <= 7; c++) pts.push(P(c, 10)); for (let r = 11; r <= 18; r++) pts.push(P(8, r)); pts.push(P(9, 18));
      for (let r = 17; r >= 11; r--) pts.push(P(9, r));
      g += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#2a5a8a" stroke-width="2.4" stroke-linejoin="round" opacity=".85" marker-end="url(#pcA)"/><circle cx="${P(9, 11)[0]}" cy="${P(9, 11)[1] + 2}" r="4.5" fill="#2a5a8a"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="pcA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // six cowries: how many land mouth up (0–6) and what that scores; chances out of 64 if each falls either way equally
    cowrieOdds: () => { const n = [1, 6, 15, 20, 15, 6, 1], sc = [25, 10, 2, 3, 4, 5, 6], W = 330, H = 170, bw = 32, gap = (W - 30 - bw * 7) / 6; let g = '';
      n.forEach((v, i) => { const x = 15 + i * (bw + gap), h = v / 20 * 90, y = 106 - h, hi = i < 2 || i === 6;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${hi ? '#a0482a' : '#d8a68a'}"/><text x="${x + bw / 2}" y="${y - 5}" font-size="13" font-weight="700" fill="#2b2a28" text-anchor="middle">${v}/64</text>`;
        g += `<text x="${x + bw / 2}" y="125" font-size="13.5" fill="#5a4a3a" text-anchor="middle">${i}</text><rect x="${x + 1}" y="134" width="${bw - 2}" height="24" rx="5" fill="${hi ? '#a0482a' : '#f2e3c6'}"/><text x="${x + bw / 2}" y="151" font-size="14" font-weight="800" fill="${hi ? '#fff' : '#3a2a1a'}" text-anchor="middle">${sc[i]}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><line x1="8" y1="106.5" x2="${W - 8}" y2="106.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
    // capture in go: a black stone with four liberties, then down to its last one, then taken
    goLiberty: () => { const C = 22, N = 5, pw = C * (N - 1), gap = 34, o = 14, W = o * 2 + pw * 3 + gap * 2, H = o * 2 + pw; let g = '';
      const st = (ox, c, r, w, op) => `<circle cx="${ox + c * C}" cy="${o + r * C}" r="9.5" fill="${w ? '#f7f4ec' : '#1d1d1f'}" stroke="${w ? '#6a665c' : '#000'}" stroke-width="1.2"${op ? ` opacity="${op}"` : ''}/>`;
      const lib = (ox, c, r) => `<circle cx="${ox + c * C}" cy="${o + r * C}" r="4" fill="#c0392b"/>`;
      [0, 1, 2].forEach(i => { const ox = o + i * (pw + gap); g += `<rect x="${ox - 10}" y="${o - 10}" width="${pw + 20}" height="${pw + 20}" rx="4" fill="#dcb46c"/>`;
        for (let k = 0; k < N; k++) g += `<line x1="${ox}" y1="${o + k * C}" x2="${ox + pw}" y2="${o + k * C}" stroke="#6b4e22" stroke-width="1"/><line x1="${ox + k * C}" y1="${o}" x2="${ox + k * C}" y2="${o + pw}" stroke="#6b4e22" stroke-width="1"/>`;
        if (i === 0) g += st(ox, 2, 2) + lib(ox, 1, 2) + lib(ox, 3, 2) + lib(ox, 2, 1) + lib(ox, 2, 3);
        if (i === 1) g += st(ox, 2, 2) + st(ox, 1, 2, 1) + st(ox, 3, 2, 1) + st(ox, 2, 1, 1) + lib(ox, 2, 3);
        if (i === 2) g += st(ox, 2, 2, 0, .18) + st(ox, 1, 2, 1) + st(ox, 3, 2, 1) + st(ox, 2, 1, 1) + st(ox, 2, 3, 1); });
      [0, 1].forEach(i => { const x = o + pw + 10 + i * (pw + gap) + gap / 2 - 10; g += `<path d="M${x - 6} ${o + pw / 2}h12" stroke="#8a7a5a" stroke-width="2.5" marker-end="url(#glA)"/>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="glA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a7a5a"/></marker></defs>${g}</svg>`; },
    // the 17-line board of the Han tombs beside today's 19-line board: 289 points against 361
    goGrid: () => { const C = 8, o = 12, gap = 30, a = C * 16, b = C * 18, W = o * 2 + a + b + gap + 20, H = o * 2 + b + 30; let g = '';
      const grid = (ox, n) => { const L = C * (n - 1), oy = o + (b - L); let s = `<rect x="${ox - 8}" y="${oy - 8}" width="${L + 16}" height="${L + 16}" rx="3" fill="#dcb46c"/>`;
        for (let k = 0; k < n; k++) s += `<line x1="${ox}" y1="${oy + k * C}" x2="${ox + L}" y2="${oy + k * C}" stroke="#6b4e22" stroke-width=".8"/><line x1="${ox + k * C}" y1="${oy}" x2="${ox + k * C}" y2="${oy + L}" stroke="#6b4e22" stroke-width=".8"/>`;
        if (n === 19) [3, 9, 15].forEach(x => [3, 9, 15].forEach(y => { s += `<circle cx="${ox + x * C}" cy="${oy + y * C}" r="2.4" fill="#3a2a10"/>`; }));
        return s + `<text x="${ox + L / 2}" y="${o + b + 28}" font-size="14" font-weight="800" fill="#2b2a28" text-anchor="middle">${n}×${n} = ${n * n}</text>`; };
      g += grid(o + 10, 17) + grid(o + 10 + a + gap + 8, 19);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // alquerque: 5 × 5 points joined by lines and diagonals, 12 pieces a side, the centre empty
    alquerqueBoard: () => { const C = 46, o = 22, L = C * 4, W = o * 2 + L; let g = `<rect x="4" y="4" width="${W - 8}" height="${W - 8}" rx="10" fill="#e9d6ae"/>`;
      for (let k = 0; k < 5; k++) g += `<line x1="${o}" y1="${o + k * C}" x2="${o + L}" y2="${o + k * C}" stroke="#7a5a32" stroke-width="2"/><line x1="${o + k * C}" y1="${o}" x2="${o + k * C}" y2="${o + L}" stroke="#7a5a32" stroke-width="2"/>`;
      [[0, 0, 4, 4], [4, 0, 0, 4], [2, 0, 4, 2], [4, 2, 2, 4], [2, 4, 0, 2], [0, 2, 2, 0]].forEach(([a, b, c, d]) => { g += `<line x1="${o + a * C}" y1="${o + b * C}" x2="${o + c * C}" y2="${o + d * C}" stroke="#7a5a32" stroke-width="2"/>`; });
      for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) { const i = r * 5 + c; if (i === 12) continue; const x = o + c * C, y = o + r * C, blk = r < 2 || (r === 2 && c > 2);
        g += `<circle cx="${x}" cy="${y}" r="13" fill="${blk ? '#7a2a2a' : '#f7f1e3'}" stroke="${blk ? '#3a1010' : '#7a6a50'}" stroke-width="1.6"/>`; }
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // draughts on the dark squares: a man jumps twice in one turn, then reaches the far row and is crowned (a second piece on top)
    draughtsJump: () => { const C = 30, o = 8, N = 8, W = o * 2 + C * N; let g = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g += `<rect x="${o + c * C}" y="${o + r * C}" width="${C}" height="${C}" fill="${(r + c) % 2 ? '#6b4a2e' : '#ead7b0'}"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2], pc = (c, r, red, op, king) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y + (king ? 3 : 0)}" r="11" fill="${red ? '#b0302a' : '#f4ecd8'}" stroke="${red ? '#5a1010' : '#7a6a50'}" stroke-width="1.5"${op ? ` opacity="${op}"` : ''}/>` + (king ? `<circle cx="${x}" cy="${y - 2}" r="11" fill="#b0302a" stroke="#5a1010" stroke-width="1.5"/><text x="${x}" y="${y + 2}" font-size="11" fill="#ffd77a" text-anchor="middle">♛</text>` : ''); };
      g += pc(1, 6, 1, .35) + pc(2, 5, 0, .35) + pc(4, 3, 0, .35) + pc(5, 2, 1, .35) + pc(7, 0, 1, 0, 1);
      const path = [P(1, 6), P(3, 4), P(5, 2)].map(p => p.join(',')).join(' ');
      g += `<polyline points="${path}" fill="none" stroke="#2a5a8a" stroke-width="3" stroke-linejoin="round" marker-end="url(#djA)"/>`;
      const [ax, ay] = P(5, 2), [bx, by] = P(7, 0); g += `<path d="M${ax + 6} ${ay - 6}L${bx - 9} ${by + 9}" stroke="#2a5a8a" stroke-width="3" stroke-dasharray="4 4" marker-end="url(#djA)"/>`;
      [[2, 5], [4, 3]].forEach(([c, r]) => { const [x, y] = P(c, r); g += `<path d="M${x - 7} ${y - 7}L${x + 7} ${y + 7}M${x + 7} ${y - 7}L${x - 7} ${y + 7}" stroke="#c0392b" stroke-width="3"/>`; });
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="djA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // reversi: a disc placed on the marked square brackets white discs in three directions, and all of them turn black
    reversiFlip: () => { const C = 30, N = 8, o = 8, W = o * 2 + C * N; let g = `<rect x="${o}" y="${o}" width="${C * N}" height="${C * N}" fill="#23603e"/>`;
      for (let k = 0; k <= N; k++) g += `<line x1="${o}" y1="${o + k * C}" x2="${o + C * N}" y2="${o + k * C}" stroke="#103a24" stroke-width="1.2"/><line x1="${o + k * C}" y1="${o}" x2="${o + k * C}" y2="${o + C * N}" stroke="#103a24" stroke-width="1.2"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2], d = (c, r, b, ring) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="11.5" fill="${b ? '#141414' : '#f7f7f2'}" stroke="${ring ? '#ffcf4a' : b ? '#000' : '#9a9a90'}" stroke-width="${ring ? 3 : 1}"/>`; };
      const black = [[3, 1], [6, 4], [2, 5], [1, 3]], flip = [[5, 1], [4, 1], [6, 2], [6, 3], [5, 2], [4, 3], [3, 4]], white = [[2, 3], [4, 2], [3, 3]];
      black.forEach(([c, r]) => g += d(c, r, 1)); white.forEach(([c, r]) => g += d(c, r, 0));
      flip.forEach(([c, r]) => { g += d(c, r, 1, 1); });
      g += d(6, 1, 1); const [px, py] = P(6, 1); g += `<circle cx="${px}" cy="${py}" r="14.5" fill="none" stroke="#e8453c" stroke-width="2.5"/>`;
      [[3, 1], [6, 4], [2, 5]].forEach(([c, r]) => { const [x, y] = P(c, r); g += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="#e8453c" stroke-width="2" stroke-dasharray="5 4" opacity=".9"/>`; });
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the first four discs: placed freely in early reversi (here side by side), fixed crosswise in othello
    reversiStart: () => { const C = 30, o = 10, gap = 40, B = C * 4, W = o * 2 + B * 2 + gap, H = o * 2 + B; let g = '';
      const bd = (ox, pat) => { let s = `<rect x="${ox}" y="${o}" width="${B}" height="${B}" fill="#23603e"/>`;
        for (let k = 0; k <= 4; k++) s += `<line x1="${ox}" y1="${o + k * C}" x2="${ox + B}" y2="${o + k * C}" stroke="#103a24" stroke-width="1.2"/><line x1="${ox + k * C}" y1="${o}" x2="${ox + k * C}" y2="${o + B}" stroke="#103a24" stroke-width="1.2"/>`;
        pat.forEach(([c, r, b]) => { s += `<circle cx="${ox + c * C + C / 2}" cy="${o + r * C + C / 2}" r="11.5" fill="${b ? '#141414' : '#f7f7f2'}" stroke="${b ? '#000' : '#9a9a90'}"/>`; }); return s; };
      g += bd(o, [[1, 1, 1], [2, 1, 1], [1, 2, 0], [2, 2, 0]]) + bd(o + B + gap, [[1, 1, 0], [2, 1, 1], [1, 2, 1], [2, 2, 0]]);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // oware sowing: the three seeds of the ringed pit go one by one, anticlockwise; the last makes 3 in an opponent's pit, so those 3 are taken
    sowing: () => { const C = 48, o = 12, W = o * 2 + C * 6, H = o * 2 + C * 2 + 4; let g = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="18" fill="#8a6a2a"/>`;
      const top = [4, 4, 2, 4, 4, 4], bot = [4, 4, 4, 0, 5, 5], P = (c, r) => [o + c * C + C / 2, o + 2 + r * C + C / 2];
      const pit = (c, r, n, cls) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="19" fill="#5a4218" stroke="${cls === 'src' ? '#ffd77a' : cls === 'cap' ? '#e8453c' : '#3a2a0e'}" stroke-width="${cls ? 3.5 : 1.5}"/><text x="${x}" y="${y + 6}" font-size="17" font-weight="800" fill="#fff4dc" text-anchor="middle">${n}</text>`; };
      top.forEach((n, i) => { g += pit(5 - i, 0, i === 0 ? 3 : n, i === 0 ? 'cap' : ''); }); bot.forEach((n, i) => { g += pit(i, 1, n, i === 3 ? 'src' : ''); });
      const pts = [P(3, 1), P(4, 1), P(5, 1), P(5, 0)].map(([x, y]) => [x, y]);
      for (let i = 0; i < 3; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1]; g += `<path d="M${x1 + (x2 > x1 ? 20 : 0)} ${y1 - (y2 < y1 ? 20 : 0)}L${x2 - (x2 > x1 ? 20 : 0)} ${y2 + (y2 < y1 ? 20 : 0)}" stroke="#ffd77a" stroke-width="3" marker-end="url(#swA)"/>`; }
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="swA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffd77a"/></marker></defs>${g}</svg>`; },
    // three shapes of mancala board: 2 × 6 (oware), 2 × 7 with two stores (congkak), 4 × 8 (bao)
    mancalaRows: () => { const W = 340, H = 262; let g = '';
      const board = (x, y, cols, rows, stores, lab) => { const c = 21, bw = cols * c + (stores ? 2 * c : 0) + 12, bh = rows * c + 12; let s = `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="9" fill="#8a6a2a"/>`;
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) s += `<circle cx="${x + 6 + (stores ? c : 0) + k * c + c / 2}" cy="${y + 6 + r * c + c / 2}" r="8" fill="#4a3410"/>`;
        if (stores) [x + 6 + c / 2, x + bw - 6 - c / 2].forEach(cx => { s += `<ellipse cx="${cx}" cy="${y + bh / 2}" rx="8" ry="${rows * c / 2 - 3}" fill="#4a3410"/>`; });
        return s + `<text x="${x + bw + 12}" y="${y + bh / 2 + 5}" font-size="14" font-weight="800" fill="#2b2a28">${lab}</text>`; };
      g += board(6, 6, 6, 2, 0, '2 × 6') + board(6, 74, 7, 2, 1, '2 × 7 + 2') + board(6, 148, 8, 4, 0, '4 × 8');
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // nine men's morris: 24 points on three squares; White has just closed a mill (gold) and may take a black piece (red cross)
    morrisBoard: () => { const o = 16, S = 228, W = o * 2 + S; let g = `<rect x="4" y="4" width="${W - 8}" height="${W - 8}" rx="10" fill="#e3cfa4"/>`;
      const sq = k => { const a = o + k * S / 6, b = o + S - k * S / 6; return `<rect x="${a}" y="${a}" width="${b - a}" height="${b - a}" fill="none" stroke="#5a4632" stroke-width="2.4"/>`; };
      g += sq(0) + sq(1) + sq(2); const m = o + S / 2; g += `<path d="M${m} ${o}V${o + S / 3}M${m} ${o + S}V${o + S * 2 / 3}M${o} ${m}H${o + S / 3}M${o + S} ${m}H${o + S * 2 / 3}" stroke="#5a4632" stroke-width="2.4"/>`;
      const pt = (k, i) => { const a = o + k * S / 6, b = o + S - k * S / 6, c = (a + b) / 2; return [[a, a], [c, a], [b, a], [b, c], [b, b], [c, b], [a, b], [a, c]][i]; };
      for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) { const [x, y] = pt(k, i); g += `<circle cx="${x}" cy="${y}" r="4" fill="#5a4632"/>`; }
      const st = (k, i, w, ring) => { const [x, y] = pt(k, i); return `<circle cx="${x}" cy="${y}" r="12" fill="${w ? '#f7f1e3' : '#2a2420'}" stroke="${ring ? '#e0a52a' : w ? '#7a6a50' : '#000'}" stroke-width="${ring ? 3.5 : 1.4}"/>`; };
      const [x1, y1] = pt(0, 0), [x2] = pt(0, 2); g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" stroke="#e0a52a" stroke-width="4" opacity=".55"/>`;
      [[0, 0], [0, 1], [0, 2]].forEach(([k, i]) => g += st(k, i, 1, 1)); [[1, 6], [2, 3]].forEach(([k, i]) => g += st(k, i, 1));
      [[1, 1], [2, 5], [1, 3], [0, 6]].forEach(([k, i]) => g += st(k, i, 0));
      const [cx, cy] = pt(1, 3); g += `<path d="M${cx - 8} ${cy - 8}L${cx + 8} ${cy + 8}M${cx + 8} ${cy - 8}L${cx - 8} ${cy + 8}" stroke="#e8453c" stroke-width="3.5"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the morris family by board: three, six, nine and twelve men's morris
    morrisFamily: () => { const s = 70, gap = 14, o = 8, W = o * 2 + s * 4 + gap * 3, H = o * 2 + s + 26; let g = '';
      [3, 6, 9, 12].forEach((n, j) => { const x0 = o + j * (s + gap), y0 = o, line = (a, b, c, d) => `<line x1="${x0 + a}" y1="${y0 + b}" x2="${x0 + c}" y2="${y0 + d}" stroke="#5a4632" stroke-width="1.8"/>`; let t = `<rect x="${x0 - 4}" y="${y0 - 4}" width="${s + 8}" height="${s + 8}" rx="6" fill="#e3cfa4"/>`;
        const sqs = n === 3 ? [0] : n === 6 ? [0, 1] : [0, 1, 2], step = n === 3 ? 0 : n === 6 ? s / 4 : s / 6;
        sqs.forEach(k => { const a = k * step, b = s - k * step; t += `<rect x="${x0 + a}" y="${y0 + a}" width="${b - a}" height="${b - a}" fill="none" stroke="#5a4632" stroke-width="1.8"/>`; });
        const inner = sqs.length > 1 ? step * (sqs.length - 1) : s / 2; t += line(s / 2, 0, s / 2, n === 3 ? s : inner) + line(s / 2, s, s / 2, n === 3 ? 0 : s - inner) + line(0, s / 2, n === 3 ? s : inner, s / 2) + line(s, s / 2, n === 3 ? 0 : s - inner, s / 2);
        if (n === 3) t += line(0, 0, s, s) + line(s, 0, 0, s); if (n === 12) t += line(0, 0, inner, inner) + line(s, 0, s - inner, inner) + line(0, s, inner, s - inner) + line(s, s, s - inner, s - inner);
        g += t + `<text x="${x0 + s / 2}" y="${y0 + s + 24}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="middle">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // a patolli board as often reconstructed: a cross of four arms, two lanes of six squares each, around four centre squares — 52 in all
    patolliBoard: () => { const C = 21, o = -12, N = 16, W = o * 2 + C * N; let g = `<rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="10" fill="#efe0bf"/>`;
      const sq = (c, r, f) => `<rect x="${o + c * C + 1}" y="${o + r * C + 1}" width="${C - 2}" height="${C - 2}" rx="2" fill="${f || '#f8efd9'}" stroke="#8a3a2a" stroke-width="1.3"/>`;
      for (let k = 1; k <= 6; k++) [7, 8].forEach(j => { const end = k === 1; g += sq(j, k, end ? '#e2a58a' : 0) + sq(j, 15 - k, end ? '#e2a58a' : 0) + sq(k, j, end ? '#e2a58a' : 0) + sq(15 - k, j, end ? '#e2a58a' : 0); });
      [[7, 7], [8, 7], [7, 8], [8, 8]].forEach(([c, r]) => { g += sq(c, r, '#c9a24a'); });
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // five beans marked on one side: how often 0–5 marks land up (out of 32), if each falls either way equally
    beanOdds: () => { const n = [1, 5, 10, 10, 5, 1], W = 320, H = 150, bw = 38, gap = (W - 30 - bw * 6) / 5; let g = '';
      n.forEach((v, i) => { const x = 15 + i * (bw + gap), h = v / 10 * 90, y = 108 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${i === 5 ? '#8a3a2a' : '#d9a58e'}"/><text x="${x + bw / 2}" y="${y - 6}" font-size="13.5" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}/32</text>`;
        for (let b = 0; b < 5; b++) g += `<ellipse cx="${x + 5 + b * 7}" cy="128" rx="3.2" ry="5" fill="${b < i ? '#8a3a2a' : '#e9d3b8'}" stroke="#6a2a1a" stroke-width=".8"/>`;
        g += `<text x="${x + bw / 2}" y="149" font-size="13.5" font-weight="800" fill="#2b2a28" text-anchor="middle">${i}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H + 4}" role="img" style="font-family:inherit"><line x1="8" y1="108.5" x2="${W - 8}" y2="108.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
    // the xiangqi board in its starting position: 9 × 10 lines, the river across the middle, the two palaces with their diagonals
    xiangqiBoard: () => { const C = 30, o = 22, W = o * 2 + C * 8, H = o * 2 + C * 9, X = c => o + c * C, Y = r => o + r * C; let g = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="8" fill="#f1d9a6"/>`;
      for (let r = 0; r < 10; r++) g += `<line x1="${X(0)}" y1="${Y(r)}" x2="${X(8)}" y2="${Y(r)}" stroke="#7a4a1e" stroke-width="1.3"/>`;
      for (let c = 0; c < 9; c++) { if (c === 0 || c === 8) g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(9)}" stroke="#7a4a1e" stroke-width="1.3"/>`; else g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(4)}" stroke="#7a4a1e" stroke-width="1.3"/><line x1="${X(c)}" y1="${Y(5)}" x2="${X(c)}" y2="${Y(9)}" stroke="#7a4a1e" stroke-width="1.3"/>`; }
      [[0, 2], [7, 9]].forEach(([a, b]) => { g += `<line x1="${X(3)}" y1="${Y(a)}" x2="${X(5)}" y2="${Y(b)}" stroke="#7a4a1e" stroke-width="1.3"/><line x1="${X(5)}" y1="${Y(a)}" x2="${X(3)}" y2="${Y(b)}" stroke="#7a4a1e" stroke-width="1.3"/>`; });
      g += `<text x="${X(2)}" y="${Y(4.5) + 6}" font-size="15" fill="#7a4a1e" text-anchor="middle">楚 河</text><text x="${X(6)}" y="${Y(4.5) + 6}" font-size="15" fill="#7a4a1e" text-anchor="middle">漢 界</text>`;
      const pc = (c, r, ch, red) => `<circle cx="${X(c)}" cy="${Y(r)}" r="12.5" fill="#fbf1dc" stroke="${red ? '#b0201e' : '#1e1e1e'}" stroke-width="1.8"/><text x="${X(c)}" y="${Y(r) + 5}" font-size="14" font-weight="800" fill="${red ? '#b0201e' : '#1e1e1e'}" text-anchor="middle">${ch}</text>`;
      '車馬象士將士象馬車'.split('').forEach((ch, c) => { g += pc(c, 0, ch, 0); }); '俥傌相仕帥仕相傌俥'.split('').forEach((ch, c) => { g += pc(c, 9, ch, 1); });
      g += pc(1, 2, '砲', 0) + pc(7, 2, '砲', 0) + pc(1, 7, '炮', 1) + pc(7, 7, '炮', 1);
      [0, 2, 4, 6, 8].forEach(c => { g += pc(c, 3, '卒', 0) + pc(c, 6, '兵', 1); });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the cannon: it slides like a chariot, but captures only by jumping exactly one piece (the screen)
    cannonJump: () => { const C = 34, o = 20, W = o * 2 + C * 8, H = o * 2 + C * 2, X = c => o + c * C, Y = r => o + r * C; let g = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="8" fill="#f1d9a6"/>`;
      for (let r = 0; r < 3; r++) g += `<line x1="${X(0)}" y1="${Y(r)}" x2="${X(8)}" y2="${Y(r)}" stroke="#7a4a1e" stroke-width="1.3"/>`; for (let c = 0; c < 9; c++) g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(2)}" stroke="#7a4a1e" stroke-width="1.3"/>`;
      const pc = (c, r, ch, red, op) => `<circle cx="${X(c)}" cy="${Y(r)}" r="14" fill="#fbf1dc" stroke="${red ? '#b0201e' : '#1e1e1e'}" stroke-width="2"${op ? ` opacity="${op}"` : ''}/><text x="${X(c)}" y="${Y(r) + 5.5}" font-size="15" font-weight="800" fill="${red ? '#b0201e' : '#1e1e1e'}" text-anchor="middle"${op ? ` opacity="${op}"` : ''}>${ch}</text>`;
      g += pc(1, 1, '炮', 1) + pc(4, 1, '馬', 0) + pc(7, 1, '車', 0);
      g += `<path d="M${X(1) + 8} ${Y(1) - 15} Q${X(4)} ${Y(0) - 22} ${X(7) - 8} ${Y(1) - 15}" fill="none" stroke="#b0201e" stroke-width="2.6" marker-end="url(#cjA)"/>`;
      const [cx, cy] = [X(7), Y(1)]; g += `<path d="M${cx - 9} ${cy - 9}L${cx + 9} ${cy + 9}M${cx + 9} ${cy - 9}L${cx - 9} ${cy + 9}" stroke="#e8453c" stroke-width="3"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="cjA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b0201e"/></marker></defs>${g}</svg>`; },
    // the backgammon starting position: 24 points, the bar in the middle; White (light) runs anticlockwise from 24 down to its home board 1–6
    bgBoard: () => { const pw = 24, o = 10, bar = 18, H = 268, W = o * 2 + pw * 12 + bar; let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="8" fill="#5c2f1f"/><rect x="${o}" y="${o}" width="${pw * 12 + bar}" height="${H - o * 2}" fill="#e9d6b0"/><rect x="${o + pw * 6}" y="${o}" width="${bar}" height="${H - o * 2}" fill="#5c2f1f"/>`;
      const px = i => o + (i < 6 ? i * pw : i * pw + bar), th = 92;
      for (let i = 0; i < 12; i++) { const x = px(i), c1 = i % 2 ? '#b0402a' : '#3a5a3a', c2 = i % 2 ? '#3a5a3a' : '#b0402a';
        g += `<path d="M${x} ${o}L${x + pw / 2} ${o + th}L${x + pw} ${o}Z" fill="${c1}"/><path d="M${x} ${H - o}L${x + pw / 2} ${H - o - th}L${x + pw} ${H - o}Z" fill="${c2}"/>`; }
      const ck = (pt, n, light) => { const top = pt > 12, i = top ? pt - 13 : 12 - pt, cx = px(i) + pw / 2; let s = '';
        for (let k = 0; k < n; k++) { const cy = top ? o + 11 + k * 19 : H - o - 11 - k * 19; s += `<circle cx="${cx}" cy="${cy}" r="10" fill="${light ? '#f7f1e3' : '#2a2420'}" stroke="${light ? '#7a6a50' : '#000'}" stroke-width="1.2"/>`; } return s; };
      [[24, 2], [13, 5], [8, 3], [6, 5]].forEach(([p, n]) => g += ck(p, n, 1)); [[1, 2], [12, 5], [17, 3], [19, 5]].forEach(([p, n]) => g += ck(p, n, 0));
      [1, 6, 12, 13, 18, 24].forEach(p => { const top = p > 12, i = top ? p - 13 : 12 - p; g += `<text x="${px(i) + pw / 2}" y="${top ? o + th + 16 : H - o - th - 6}" font-size="13.5" font-weight="800" fill="#5c2f1f" text-anchor="middle">${p}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // direct shots: of 36 rolls of two dice, how many can hit a lone checker 1–12 points away (no blocking)
    bgShots: () => { const n = [11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3], W = 330, H = 160, bw = 21, gap = (W - 24 - bw * 12) / 11; let g = '';
      n.forEach((v, i) => { const x = 12 + i * (bw + gap), h = v / 17 * 100, y = 124 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${i < 6 ? '#b0402a' : '#d9a58e'}"/><text x="${x + bw / 2}" y="${y - 5}" font-size="13.5" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}</text><text x="${x + bw / 2}" y="143" font-size="13.5" font-weight="700" fill="#5a4a3a" text-anchor="middle">${i + 1}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><line x1="6" y1="124.5" x2="${W - 6}" y2="124.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
    // a 7 × 7 hex board: Red joins top and bottom, Blue left and right; here a red chain has joined its two edges
    hexWin: () => { const N = 7, r = 15, dx = r * Math.sqrt(3), dy = r * 1.5, o = 26, W = Math.ceil(o * 2 + dx * (N + (N - 1) / 2)), H = Math.ceil(o * 2 + dy * (N - 1) + r * 2); let g = '';
      const cen = (q, k) => [o + dx / 2 + q * dx + k * dx / 2, o + r + k * dy], hex = (cx, cy, f, st) => { let p = ''; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); p += (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1) + ' '; } return `<polygon points="${p}" fill="${f}" stroke="${st || '#8a7a5a'}" stroke-width="1.2"/>`; };
      const [ax, ay] = cen(0, 0), [bx, by] = cen(N - 1, 0), [cx2, cy2] = cen(0, N - 1), [ex, ey] = cen(N - 1, N - 1);
      g += `<path d="M${ax - dx / 2} ${ay - r - 6}L${bx + dx / 2} ${by - r - 6}" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/><path d="M${cx2 - dx / 2} ${cy2 + r + 6}L${ex + dx / 2} ${ey + r + 6}" stroke="#c0392b" stroke-width="6" stroke-linecap="round"/>`;
      g += `<path d="M${ax - dx / 2 - 6} ${ay}L${cx2 - dx / 2 - 6} ${cy2}" stroke="#2e6ab0" stroke-width="6" stroke-linecap="round"/><path d="M${bx + dx / 2 + 6} ${by}L${ex + dx / 2 + 6} ${ey}" stroke="#2e6ab0" stroke-width="6" stroke-linecap="round"/>`;
      const red = new Set(['3,0', '3,1', '2,2', '2,3', '3,3', '1,4', '2,4', '1,5', '1,6', '5,2', '4,5']), blue = new Set(['4,1', '4,2', '3,2', '1,3', '0,4', '3,4', '4,4', '2,5', '0,6', '5,1', '6,3']), path = new Set(['3,0', '3,1', '2,2', '2,3', '2,4', '1,5', '1,6']);
      for (let k = 0; k < N; k++) for (let q = 0; q < N; q++) { const [x, y] = cen(q, k), key = q + ',' + k; g += hex(x, y, '#f3ead6');
        if (red.has(key)) g += `<circle cx="${x}" cy="${y}" r="10" fill="#c0392b" stroke="${path.has(key) ? '#ffd77a' : '#7a1a10'}" stroke-width="${path.has(key) ? 3 : 1.2}"/>`; else if (blue.has(key)) g += `<circle cx="${x}" cy="${y}" r="10" fill="#2e6ab0" stroke="#163a66" stroke-width="1.2"/>`; }
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the bridge: two red stones share two empty cells (marked); if Blue takes one, Red takes the other and stays joined
    hexBridge: () => { const r = 20, dx = r * Math.sqrt(3), dy = r * 1.5, W = 330, H = 130; let g = '';
      const hex = (cx, cy, f) => { let p = ''; for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); p += (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1) + ' '; } return `<polygon points="${p}" fill="${f}" stroke="#8a7a5a" stroke-width="1.2"/>`; };
      const panel = (ox, step) => { let s = ''; const c = (q, k) => [ox + q * dx + k * dx / 2, 30 + k * dy];
        [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2]].forEach(([q, k]) => { const [x, y] = c(q, k); s += hex(x, y, '#f3ead6'); });
        const st = (q, k, col) => { const [x, y] = c(q, k); return `<circle cx="${x}" cy="${y}" r="13" fill="${col}" stroke="#00000055" stroke-width="1"/>`; };
        s += st(1, 0, '#c0392b') + st(0, 2, '#c0392b');
        if (step === 0) [[0, 1], [1, 1]].forEach(([q, k]) => { const [x, y] = c(q, k); s += `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#c0392b" stroke-width="2.5" stroke-dasharray="3 3"/>`; });
        else s += st(0, 1, '#2e6ab0') + st(1, 1, '#c0392b');
        return s; };
      g += panel(80, 0) + `<path d="M150 60h30" stroke="#8a7a5a" stroke-width="2.5" marker-end="url(#hbA)"/>` + panel(240, 1);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="hbA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a7a5a"/></marker></defs>${g}</svg>`; },
    // fox and geese: 33 points on a cross, 13 geese at the top, the fox in the middle jumping a goose that has an empty point behind it
    foxGeeseBoard: () => { const C = 36, o = 18, W = o * 2 + C * 6, X = c => o + c * C; let g = `<rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="10" fill="#ecdcbc"/>`;
      const on = (c, r) => (c >= 2 && c <= 4) || (r >= 2 && r <= 4), L = (a, b, c, d) => `<line x1="${X(a)}" y1="${X(b)}" x2="${X(c)}" y2="${X(d)}" stroke="#7a5a32" stroke-width="1.8"/>`;
      for (let k = 2; k <= 4; k++) g += L(0, k, 6, k) + L(k, 0, k, 6);
      [0, 1, 5, 6].forEach(k => { g += L(2, k, 4, k) + L(k, 2, k, 4); });
      g += L(2, 0, 4, 2) + L(4, 0, 2, 2) + L(2, 4, 4, 6) + L(4, 4, 2, 6) + L(0, 2, 2, 4) + L(0, 4, 2, 2) + L(4, 2, 6, 4) + L(4, 4, 6, 2) + L(2, 2, 4, 4) + L(4, 2, 2, 4);
      for (let r = 0; r <= 6; r++) for (let c = 0; c <= 6; c++) if (on(c, r)) g += `<circle cx="${X(c)}" cy="${X(r)}" r="3.5" fill="#7a5a32"/>`;
      const goose = (c, r, op) => `<circle cx="${X(c)}" cy="${X(r)}" r="12" fill="#fbf7ee" stroke="#8a7a5a" stroke-width="1.6"${op ? ` opacity="${op}"` : ''}/>`;
      const geese = []; for (let r = 0; r <= 1; r++) for (let c = 2; c <= 4; c++) geese.push([c, r]); for (let c = 0; c <= 6; c++) geese.push([c, 2]);
      geese.pop(); geese.forEach(([c, r]) => { g += goose(c, r); });
      g += goose(3, 4) + `<path d="M${X(3) - 7} ${X(4) - 7}L${X(3) + 7} ${X(4) + 7}M${X(3) + 7} ${X(4) - 7}L${X(3) - 7} ${X(4) + 7}" stroke="#e8453c" stroke-width="3"/>` + `<circle cx="${X(3)}" cy="${X(5)}" r="12.5" fill="#c4622d" stroke="#6a2a10" stroke-width="1.8"/>`;
      g += `<path d="M${X(3) + 14} ${X(5) - 6}Q${X(3) + 40} ${X(4)} ${X(3) + 14} ${X(3) + 4}" fill="none" stroke="#c4622d" stroke-width="2.6" marker-end="url(#fgA)"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="fgA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c4622d"/></marker></defs>${g}</svg>`; },
    // hunt games side by side: hunters (dark) against prey (light): fox and geese 1:13 and 1:17, bagh-chal 4:20, asalto 2:24
    huntFamily: () => { const rows = [[1, 13], [1, 17], [4, 20], [2, 24]], W = 330, H = 30 + rows.length * 44; let g = '';
      rows.forEach(([a, b], i) => { const y = 26 + i * 44; let x = 10;
        for (let k = 0; k < a; k++) { g += `<circle cx="${x + 7}" cy="${y}" r="7" fill="#c4622d"/>`; x += 16; }
        g += `<text x="80" y="${y + 5}" font-size="15" font-weight="800" fill="#2b2a28">${a}:${b}</text>`; x = 136;
        for (let k = 0; k < b; k++) g += `<circle cx="${x + (k % 12) * 15}" cy="${y - 7 + Math.floor(k / 12) * 14}" r="6" fill="#fbf7ee" stroke="#8a7a5a" stroke-width="1"/>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // latrunculi: a piece caught between two enemies on a line is taken; on the right, a lone piece walled in so it cannot move
    latCapture: () => { const C = 32, o = 10, N = 6, B = C * N, gap = 30, W = o * 2 + B * 2 + gap, H = o * 2 + B; let g = '';
      const bd = ox => { let s = `<rect x="${ox}" y="${o}" width="${B}" height="${B}" fill="#e7d8b8"/>`; for (let k = 0; k <= N; k++) s += `<line x1="${ox}" y1="${o + k * C}" x2="${ox + B}" y2="${o + k * C}" stroke="#7a6446" stroke-width="1.4"/><line x1="${ox + k * C}" y1="${o}" x2="${ox + k * C}" y2="${o + B}" stroke="#7a6446" stroke-width="1.4"/>`; return s; };
      const pc = (ox, c, r, w, x) => { const cx = ox + c * C + C / 2, cy = o + r * C + C / 2; return `<circle cx="${cx}" cy="${cy}" r="11" fill="${w ? '#f5efe2' : '#2b2622'}" stroke="${w ? '#8a7a5a' : '#000'}" stroke-width="1.4"/>` + (x ? `<path d="M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}" stroke="#e8453c" stroke-width="3"/>` : ''); };
      const L = o, R = o + B + gap;
      g += bd(L) + pc(L, 1, 2, 0) + pc(L, 2, 2, 1, 1) + pc(L, 3, 4, 0);
      g += `<path d="M${L + 3 * C + C / 2} ${o + 4 * C + 4}V${o + 3 * C - 2}" stroke="#2a5a8a" stroke-width="2.6" marker-end="url(#lcA)"/>`;
      g += `<circle cx="${L + 3 * C + C / 2}" cy="${o + 2 * C + C / 2}" r="11" fill="none" stroke="#2a5a8a" stroke-width="2" stroke-dasharray="3 3"/>`;
      g += bd(R) + pc(R, 0, 0, 1) + pc(R, 1, 0, 0) + pc(R, 0, 1, 0) + pc(R, 3, 3, 1) + pc(R, 2, 3, 0) + pc(R, 4, 3, 0) + pc(R, 3, 2, 0) + pc(R, 3, 4, 0);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="lcA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // a two-sided Roman board as Martial describes: the race game of twelve lines on one face, the soldiers' grid on the other
    latTwoSided: () => { const W = 340, H = 170; let g = '';
      g += `<rect x="8" y="14" width="150" height="120" rx="6" fill="#d9c49a" stroke="#6a5232" stroke-width="2"/>`;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) g += `<circle cx="${20 + c * 11.5 + (c >= 6 ? 4 : 0)}" cy="${40 + r * 34}" r="3.6" fill="#6a5232"/>`;
      g += `<path d="M${84} 22V126" stroke="#6a5232" stroke-width="1.2" stroke-dasharray="3 3"/>`;
      [[30, 74], [62, 108], [110, 40]].forEach(([x, y], i) => { g += `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="#fbf7ee" stroke="#3a2a14" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="1.6" fill="#3a2a14"/>`; });
      g += `<path d="M168 74h24" stroke="#8a7a5a" stroke-width="2.5" marker-end="url(#ltA)" marker-start="url(#ltB)"/>`;
      g += `<rect x="202" y="14" width="130" height="120" rx="6" fill="#d9c49a" stroke="#6a5232" stroke-width="2"/>`;
      for (let k = 0; k <= 8; k++) g += `<line x1="${210 + k * 14.25}" y1="22" x2="${210 + k * 14.25}" y2="126" stroke="#6a5232" stroke-width="1.1"/><line x1="210" y1="${22 + k * 13}" x2="324" y2="${22 + k * 13}" stroke="#6a5232" stroke-width="1.1"/>`;
      [[1, 1, 0], [2, 1, 0], [4, 5, 1], [5, 5, 1], [3, 3, 0], [4, 3, 1]].forEach(([c, r, w]) => { g += `<circle cx="${210 + c * 14.25 + 7}" cy="${22 + r * 13 + 6.5}" r="5.2" fill="${w ? '#f5efe2' : '#2b6aa0'}" stroke="#3a2a14" stroke-width=".8"/>`; });
      g += `<text x="83" y="158" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="middle">XII</text><text x="267" y="158" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="middle">⚔</text>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="ltA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a7a5a"/></marker><marker id="ltB" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8a7a5a"/></marker></defs>${g}</svg>`; },
    // a turn in the game of the amazons: the amazon moves like a chess queen (blue), then from where it lands shoots an arrow the same way (red); the arrow's square is burnt for good
    amazonTurn: () => { const C = 30, N = 8, o = 8, W = o * 2 + C * N; let g = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g += `<rect x="${o + c * C}" y="${o + r * C}" width="${C}" height="${C}" fill="${(r + c) % 2 ? '#c9a77a' : '#f2e3c6'}"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2], q = (c, r, w, op) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="11" fill="${w ? '#f7f1e3' : '#2b2622'}" stroke="${w ? '#8a7a5a' : '#000'}" stroke-width="1.5"${op ? ` opacity="${op}"` : ''}/><text x="${x}" y="${y + 5}" font-size="14" font-weight="800" fill="${w ? '#2b2622' : '#f7f1e3'}" text-anchor="middle"${op ? ` opacity="${op}"` : ''}>♛</text>`; };
      const burnt = (c, r) => { const [x, y] = P(c, r); return `<rect x="${x - C / 2 + 2}" y="${y - C / 2 + 2}" width="${C - 4}" height="${C - 4}" rx="3" fill="#3a2a1e"/><path d="M${x - 6} ${y + 6}L${x + 6} ${y - 6}" stroke="#e8a24a" stroke-width="2.4"/>`; };
      g += burnt(5, 1) + burnt(2, 6) + q(1, 6, 1, .3) + q(6, 2, 0) + q(2, 0, 0);
      const [ax, ay] = P(1, 6), [bx, by] = P(5, 2); g += `<path d="M${ax + 8} ${ay - 8}L${bx - 9} ${by + 9}" stroke="#2a5a8a" stroke-width="3" marker-end="url(#amA)"/>` + q(5, 2, 1);
      const [cx, cy] = P(5, 6); g += `<path d="M${bx} ${by + 12}L${cx} ${cy - 10}" stroke="#c0392b" stroke-width="2.6" stroke-dasharray="5 4" marker-end="url(#amB)"/>` + burnt(5, 6).replace('#3a2a1e', '#c0392b');
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="amA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker><marker id="amB" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c0392b"/></marker></defs>${g}</svg>`; },
    // late in the game the board falls apart into closed rooms: each player counts the empty squares only they can reach (here 7 against 5)
    amazonRooms: () => { const C = 30, N = 8, o = 8, W = o * 2 + C * N; let g = '';
      const zone = (c, r) => c === 3 || r === 4 ? 'x' : (c < 3) === (r < 4) ? 'w' : 'b';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const z = zone(c, r), x = o + c * C, y = o + r * C;
        g += `<rect x="${x}" y="${y}" width="${C}" height="${C}" fill="${z === 'x' ? '#3a2a1e' : z === 'w' ? '#e4eed4' : '#d6deec'}" stroke="#c9b48e" stroke-width=".8"/>`; }
      const q = (c, r, w) => { const x = o + c * C + C / 2, y = o + r * C + C / 2; return `<circle cx="${x}" cy="${y}" r="11" fill="${w ? '#f7f1e3' : '#2b2622'}" stroke="${w ? '#8a7a5a' : '#000'}" stroke-width="1.5"/><text x="${x}" y="${y + 5}" font-size="14" font-weight="800" fill="${w ? '#2b2622' : '#f7f1e3'}" text-anchor="middle">♛</text>`; };
      g += q(1, 1, 1) + q(5, 6, 1) + q(5, 1, 0) + q(1, 6, 0);
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // lines of action: the black piece on c4 moves exactly as many squares as there are pieces on the line — 3 along the rank (over its own
    // piece: blue), 2 up the file (onto a white piece: a capture, red); along the diagonal the 3 squares would pass a white piece (×)
    loaMove: () => { const C = 30, N = 8, o = 8, W = o * 2 + C * N; let g = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g += `<rect x="${o + c * C}" y="${o + r * C}" width="${C}" height="${C}" fill="${(r + c) % 2 ? '#b98f62' : '#ead6b4'}"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2], pc = (c, r, w) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="11" fill="${w ? '#f7f1e3' : '#2b2622'}" stroke="${w ? '#8a7a5a' : '#000'}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${w ? '#c9bb9a' : '#4a423a'}" stroke-width="1.2"/>`; };
      const band = (c1, r1, c2, r2) => { const [a, b] = P(c1, r1), [x, y] = P(c2, r2); return `<line x1="${a}" y1="${b}" x2="${x}" y2="${y}" stroke="#e8c25a" stroke-width="14" stroke-linecap="round" opacity=".38"/>`; };
      g += band(2, 0, 2, 7) + band(0, 4, 7, 4) + band(0, 2, 5, 7);
      g += pc(2, 4, 0) + pc(3, 4, 0) + pc(6, 4, 1) + pc(2, 2, 1) + pc(3, 5, 1) + pc(1, 3, 0) + pc(6, 1, 1) + pc(5, 6, 0);
      const [sx, sy] = P(2, 4), arr = (c, r, col, id, dash) => { const [x, y] = P(c, r), L = Math.hypot(x - sx, y - sy), ux = (x - sx) / L, uy = (y - sy) / L; return `<path d="M${sx + ux * 12} ${sy + uy * 12}L${x - ux * 15} ${y - uy * 15}" stroke="${col}" stroke-width="3"${dash ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#${id})"/>`; };
      const num = (c, r, n, col) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="11" fill="${col}" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 5}" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`; };
      g += arr(5, 4, '#2a5a8a', 'lmA') + num(5, 4, 3, '#2a5a8a');
      g += arr(2, 2, '#c0392b', 'lmB'); { const [x, y] = P(2, 2); g += `<circle cx="${x}" cy="${y}" r="13.5" fill="none" stroke="#c0392b" stroke-width="3"/><circle cx="${x + 11}" cy="${y - 11}" r="9" fill="#c0392b" stroke="#fff" stroke-width="1.2"/><text x="${x + 11}" y="${y - 6.5}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">2</text>`; }
      g += arr(5, 7, '#6a6258', 'lmC', 1); { const [x, y] = P(5, 7); g += `<circle cx="${x}" cy="${y}" r="10" fill="#4a423a"/><path d="M${x - 4.5} ${y - 4.5}l9 9M${x + 4.5} ${y - 4.5}l-9 9" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`; }
      const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs>${mk('lmA', '#2a5a8a')}${mk('lmB', '#c0392b')}${mk('lmC', '#6a6258')}</defs>${g}</svg>`; },
    // lines of action: the goal — every white piece touches another (diagonals count), so White is one group and wins; Black is still in three
    loaConnect: () => { const C = 30, N = 8, o = 8, W = o * 2 + C * N; let g = '';
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) g += `<rect x="${o + c * C}" y="${o + r * C}" width="${C}" height="${C}" fill="${(r + c) % 2 ? '#b98f62' : '#ead6b4'}"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2];
      const Wp = [[2, 2], [3, 3], [3, 4], [4, 4], [5, 3], [4, 5], [2, 5], [5, 5]], Bp = [[1, 6], [0, 7], [1, 7], [6, 1], [7, 2], [6, 6], [7, 6]];
      const links = (A, col, w) => { let h = ''; A.forEach((a, i) => A.slice(i + 1).forEach(b => { if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) === 1) { const [x1, y1] = P(...a), [x2, y2] = P(...b); h += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; } })); return h; };
      const hull = (A) => { const xs = A.map(a => P(...a)[0]), ys = A.map(a => P(...a)[1]); return `<rect x="${Math.min(...xs) - 15}" y="${Math.min(...ys) - 15}" width="${Math.max(...xs) - Math.min(...xs) + 30}" height="${Math.max(...ys) - Math.min(...ys) + 30}" rx="15" fill="none" stroke="#4a423a" stroke-width="2" stroke-dasharray="5 4"/>`; };
      g += hull([[1, 6], [0, 7], [1, 7]]) + hull([[6, 1], [7, 2]]) + hull([[6, 6], [7, 6]]);
      g += links(Wp, '#e0a52a', 7) + links(Bp, '#6a6258', 5);
      const pc = (c, r, w) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="11" fill="${w ? '#f7f1e3' : '#2b2622'}" stroke="${w ? (w === 2 ? '#e0a52a' : '#8a7a5a') : '#000'}" stroke-width="${w === 2 ? 3 : 1.5}"/><circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${w ? '#c9bb9a' : '#4a423a'}" stroke-width="1.2"/>`; };
      Wp.forEach(a => g += pc(a[0], a[1], 2)); Bp.forEach(a => g += pc(a[0], a[1], 0));
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit">${g}</svg>`; },
    // kōnane on a stone board (papamū): a white stone jumps twice to the right in one turn, taking two black stones (blue); it may not
    // turn on the way (the jump down from where it lands: ×)
    konaneJump: () => { const C = 40, N = 6, o = 10, W = o * 2 + C * N; let g = `<rect x="2" y="2" width="${W - 4}" height="${W - 4}" rx="14" fill="#8f8a82" stroke="#5e5a54" stroke-width="2"/>`;
      const P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const [x, y] = P(c, r); g += `<circle cx="${x}" cy="${y}" r="13" fill="#6f6a63"/><circle cx="${x}" cy="${y + 1.5}" r="11.5" fill="#7c776f"/>`; }
      const st = (c, r, w, op) => { const [x, y] = P(c, r); return `<ellipse cx="${x}" cy="${y}" rx="14" ry="12.5" fill="${w ? '#f3efe6' : '#24211f'}" stroke="${w ? '#b9b2a2' : '#000'}" stroke-width="1.5"${op ? ` opacity="${op}"` : ''}/>`; };
      const gone = (c, r) => { const [x, y] = P(c, r); return st(c, r, 0, .28) + `<path d="M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`; };
      g += st(5, 0, 0) + st(4, 1, 1) + st(0, 4, 0) + st(1, 5, 1) + st(3, 5, 0) + st(5, 4, 1) + st(4, 3, 0);
      g += st(0, 2, 1, .3) + gone(1, 2) + gone(3, 2) + st(4, 2, 1);
      const hop = (c1, c2, r) => { const [a, y] = P(c1, r), [b] = P(c2, r); return `<path d="M${a + 6} ${y - 14}Q${(a + b) / 2} ${y - 46} ${b - 6} ${y - 14}" fill="none" stroke="#2a5a8a" stroke-width="3.2" marker-end="url(#knA)"/>`; };
      g += hop(0, 2, 2) + hop(2, 4, 2);
      { const [x, y] = P(4, 2), [, y2] = P(4, 4); g += `<path d="M${x + 18} ${y + 8}Q${x + 34} ${(y + y2) / 2} ${x + 14} ${y2 - 4}" fill="none" stroke="#6a6258" stroke-width="2.6" stroke-dasharray="5 4"/><circle cx="${x}" cy="${y2}" r="11" fill="#4a423a"/><path d="M${x - 5} ${y2 - 5}l10 10M${x + 5} ${y2 - 5}l-10 10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`; }
      [[1, '1'], [3, '2']].forEach(([c, n]) => { const [x, y] = P(c, 2); g += `<circle cx="${x}" cy="${y - 30}" r="10" fill="#2a5a8a" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y - 25}" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="knA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // the two ways to open: Black lifts one of its stones from the centre four or a corner (1), White an orthogonal neighbour (2)
    konaneStart: () => { const N = 6, C = 24, o = 8, B = o * 2 + C * N, W = B * 2 + 16; let g = '';
      const bd = (ox, holes) => { let h = `<rect x="${ox + 1}" y="1" width="${B - 2}" height="${B - 2}" rx="10" fill="#8f8a82" stroke="#5e5a54" stroke-width="2"/>`;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const x = ox + o + c * C + C / 2, y = o + r * C + C / 2, k = holes.findIndex(q => q[0] === c && q[1] === r);
          if (k >= 0) h += `<circle cx="${x}" cy="${y}" r="10.6" fill="${k ? '#2a5a8a' : '#c0392b'}" stroke="#fff" stroke-width="1.2"/><text x="${x}" y="${y + 5}" font-size="14" font-weight="800" fill="#fff" text-anchor="middle">${k + 1}</text>`;
          else h += `<ellipse cx="${x}" cy="${y}" rx="9.4" ry="8.4" fill="${(r + c) % 2 ? '#f3efe6' : '#24211f'}" stroke="${(r + c) % 2 ? '#b9b2a2' : '#000'}" stroke-width="1"/>`; }
        return h; };
      g += bd(0, [[2, 2], [3, 2]]) + bd(B + 16, [[0, 0], [1, 0]]);
      g += `<rect x="${o + 2 * C - 2}" y="${o + 2 * C - 2}" width="${2 * C + 4}" height="${2 * C + 4}" rx="6" fill="none" stroke="#e0a52a" stroke-width="2.2" stroke-dasharray="4 3"/>`;
      return `<svg viewBox="0 0 ${W} ${B}" role="img" style="font-family:inherit">${g}</svg>`; },
    // board sizes: the 14 × 17 board (238 places) in the account of Cook's voyage, and the 10 × 10, 8 × 8 and 6 × 6 boards of this Atlas
    konaneSizes: () => { const d = 8, W = 380, H = 182, bot = 146; let g = '';
      const grid = (x0, cols, rows, lab) => { const y0 = bot - rows * d; let h = `<rect x="${x0 - 5}" y="${y0 - 5}" width="${cols * d + 10}" height="${rows * d + 10}" rx="5" fill="#8f8a82" stroke="#5e5a54" stroke-width="1.5"/>`;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) h += `<circle cx="${x0 + c * d + d / 2}" cy="${y0 + r * d + d / 2}" r="${d * .38}" fill="${(r + c) % 2 ? '#f3efe6' : '#24211f'}"/>`;
        return h + `<text x="${x0 + cols * d / 2}" y="${bot + 27}" font-size="16" font-weight="800" fill="#2b2a28" text-anchor="middle">${lab}</text>`; };
      g += grid(10, 14, 17, '14×17 = 238') + grid(146, 10, 10, '10×10') + grid(242, 8, 8, '8×8') + grid(322, 6, 6, '6×6');
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // peg solitaire: the first move on the English board — a peg jumps over its neighbour into the empty centre (blue); the jumped peg is taken (×)
    pegJump: () => { const C = 30, o = 20, W = o * 2 + C * 7; let g = `<circle cx="${W / 2}" cy="${W / 2}" r="${W / 2 - 2}" fill="#b07a48" stroke="#6e4422" stroke-width="2.5"/><circle cx="${W / 2}" cy="${W / 2}" r="${W / 2 - 14}" fill="none" stroke="#e0b878" stroke-width="1.5"/>`;
      const L = ['..ooo..', '..ooo..', 'ooooooo', 'ooooooo', 'ooooooo', '..ooo..', '..ooo..'], P = (c, r) => [o + c * C + C / 2, o + r * C + C / 2];
      const peg = (c, r, op, ring) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="10.5" fill="#efe6d2" stroke="${ring ? '#2a5a8a' : '#8a7a5a'}" stroke-width="${ring ? 3 : 1.3}"${op ? ` opacity="${op}"` : ''}/><circle cx="${x - 3}" cy="${y - 3.5}" r="3" fill="#fff" opacity="${op ? op * .8 : .8}"/>`; };
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (L[r][c] === 'o') { const [x, y] = P(c, r); g += `<circle cx="${x}" cy="${y}" r="8" fill="#6e4422"/>`; if (!(c === 3 && r >= 1 && r <= 3)) g += peg(c, r); }
      g += peg(3, 1, .3) + peg(3, 3, 0, 1);
      { const [x, y] = P(3, 2); g += `<circle cx="${x}" cy="${y}" r="10.5" fill="#efe6d2" opacity=".3"/><path d="M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14" stroke="#c0392b" stroke-width="3.2" stroke-linecap="round"/>`; }
      { const [x, y1] = P(3, 1), [, y2] = P(3, 3); const d = `M${x + 10} ${y1 + 4}Q${x + 26} ${(y1 + y2) / 2} ${x + 11} ${y2 - 7}`; g += `<path d="${d}" fill="none" stroke="#fff" stroke-width="6.5" opacity=".85"/><path d="${d}" fill="none" stroke="#2a5a8a" stroke-width="3.2" marker-end="url(#pgA)"/>`; }
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit"><defs><marker id="pgA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // the two classic boards: English (33 holes, the centre empty) and European / French (37 holes, its usual starting hole empty)
    pegBoards: () => { const C = 19, o = 12, B = o * 2 + C * 7, W = B * 2 + 20, H = B + 30; let g = '';
      const bd = (ox, L, e) => { let h = `<circle cx="${ox + B / 2}" cy="${B / 2}" r="${B / 2 - 1}" fill="#b07a48" stroke="#6e4422" stroke-width="2"/>`, n = 0;
        for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (L[r][c] === 'o') { n++; const x = ox + o + c * C + C / 2, y = o + r * C + C / 2; h += `<circle cx="${x}" cy="${y}" r="5.5" fill="#6e4422"/>`; if (r !== e[0] || c !== e[1]) h += `<circle cx="${x}" cy="${y}" r="7" fill="#efe6d2" stroke="#8a7a5a" stroke-width="1"/>`; }
        return h + `<text x="${ox + B / 2}" y="${B + 24}" font-size="17" font-weight="800" fill="#2b2a28" text-anchor="middle">${n}</text>`; };
      g += bd(0, ['..ooo..', '..ooo..', 'ooooooo', 'ooooooo', 'ooooooo', '..ooo..', '..ooo..'], [3, 3]) + bd(B + 20, ['..ooo..', '.ooooo.', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..'], [1, 3]);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the rule of three: colour the European board's holes along the diagonals in three colours; with the centre empty each colour has 12 pegs.
    // a jump takes one peg from two colours and adds one to the third, so the three counts flip between all even and all odd — never 1, 0, 0
    pegColors: () => { const C = 30, o = 20, B = o * 2 + C * 7, H = B + 40; let g = `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 2}" fill="#d9c49a" stroke="#6e4422" stroke-width="2.5"/>`;
      const L = ['..ooo..', '.ooooo.', 'ooooooo', 'ooooooo', 'ooooooo', '.ooooo.', '..ooo..'], K = ['#c0392b', '#2a8a7a', '#d8a020'], n = [0, 0, 0];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (L[r][c] === 'o') { const x = o + c * C + C / 2, y = o + r * C + C / 2, k = (r + c) % 3;
        g += `<circle cx="${x}" cy="${y}" r="8" fill="#8a6a44"/>`;
        if (r === 3 && c === 3) g += `<circle cx="${x}" cy="${y}" r="11.5" fill="none" stroke="#2b2a28" stroke-width="2" stroke-dasharray="4 3"/>`; else { n[k]++; g += `<circle cx="${x}" cy="${y}" r="11" fill="${K[k]}" stroke="#00000055" stroke-width="1"/>`; } }
      n.forEach((v, k) => { const x = B / 2 + (k - 1) * 70; g += `<circle cx="${x - 14}" cy="${B + 22}" r="9" fill="${K[k]}"/><text x="${x + 4}" y="${B + 28}" font-size="17" font-weight="800" fill="#2b2a28">${v}</text>`; });
      return `<svg viewBox="0 0 ${B} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // fanorona's two captures on one line: by approach (top: moving up to the first black takes it and every black behind it in a row) and
    // by withdrawal (bottom: moving away from a black takes it and the blacks behind it)
    fanoronaCapture: () => { const C = 36, o = 26, W = o * 2 + C * 8, RH = 78, H = RH * 2 + 4; let g = '';
      const row = (y, pcs, from, to, caps) => { let h = `<line x1="${o}" y1="${y}" x2="${o + 8 * C}" y2="${y}" stroke="#5a3a1e" stroke-width="2.5"/>`;
        for (let c = 0; c < 9; c++) h += `<circle cx="${o + c * C}" cy="${y}" r="3.5" fill="#5a3a1e"/>`;
        pcs.forEach(([c, w]) => { const x = o + c * C, cap = caps.includes(c); h += `<circle cx="${x}" cy="${y}" r="13" fill="${w ? '#f2e6cc' : '#3a2418'}" stroke="${w ? '#a08860' : '#000'}" stroke-width="1.5"${cap ? ' opacity=".32"' : ''}/>`;
          if (cap) h += `<path d="M${x - 7} ${y - 7}l14 14M${x + 7} ${y - 7}l-14 14" stroke="#c0392b" stroke-width="3.2" stroke-linecap="round"/>`; });
        const x1 = o + from * C, x2 = o + to * C, s = Math.sign(x2 - x1); h += `<circle cx="${x1}" cy="${y}" r="13" fill="#f2e6cc" opacity=".3"/><circle cx="${x2}" cy="${y}" r="13" fill="#f2e6cc" stroke="#2a5a8a" stroke-width="3"/><path d="M${x1 + s * 6} ${y - 22}Q${(x1 + x2) / 2} ${y - 36} ${x2 - s * 6} ${y - 22}" fill="none" stroke="#2a5a8a" stroke-width="3" marker-end="url(#fnA)"/>`;
        return h; };
      g += `<rect x="2" y="2" width="${W - 4}" height="${RH - 4}" rx="10" fill="#d8b07a"/><rect x="2" y="${RH + 2}" width="${W - 4}" height="${RH - 4}" rx="10" fill="#d8b07a"/>`;
      g += row(RH / 2 + 10, [[4, 0], [5, 0], [6, 0], [8, 1]], 2, 3, [4, 5, 6]);
      g += row(RH * 1.5 + 12, [[0, 0], [1, 0], [7, 0]], 2, 3, [0, 1]);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="fnA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // the 9 × 5 board at the start (22 pieces a side, the centre empty); the two dashed squares are alquerque boards side by side
    fanoronaBoard: () => { const C = 35, o = 30, W = o * 2 + C * 8, H = o * 2 + C * 4; let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="#d8b07a" stroke="#8a5a2a" stroke-width="2"/>`;
      const X = c => o + c * C, Y = r => o + r * C;
      g += `<rect x="${X(0) - 20}" y="${Y(0) - 20}" width="${4 * C + 34}" height="${4 * C + 40}" rx="10" fill="#2a8a7a" fill-opacity=".16" stroke="#1f6e62" stroke-width="3" stroke-dasharray="7 4"/><rect x="${X(4) - 14}" y="${Y(0) - 14}" width="${4 * C + 34}" height="${4 * C + 28}" rx="10" fill="#c0392b" fill-opacity=".13" stroke="#a83224" stroke-width="3" stroke-dasharray="7 4"/>`;
      for (let r = 0; r < 5; r++) g += `<line x1="${X(0)}" y1="${Y(r)}" x2="${X(8)}" y2="${Y(r)}" stroke="#5a3a1e" stroke-width="2"/>`;
      for (let c = 0; c < 9; c++) g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(4)}" stroke="#5a3a1e" stroke-width="2"/>`;
      for (let c = 0; c < 8; c += 2) for (let r = 0; r < 4; r += 2) g += `<path d="M${X(c)} ${Y(r)}L${X(c + 2)} ${Y(r + 2)}M${X(c + 2)} ${Y(r)}L${X(c)} ${Y(r + 2)}" stroke="#5a3a1e" stroke-width="2"/>`;
      const mid = [0, 1, 0, 1, -1, 0, 1, 0, 1];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 9; c++) { const w = r < 2 ? 0 : r > 2 ? 1 : mid[c]; if (w < 0) { g += `<circle cx="${X(c)}" cy="${Y(r)}" r="5" fill="#5a3a1e"/>`; continue; }
        g += `<circle cx="${X(c)}" cy="${Y(r)}" r="10.5" fill="${w ? '#f2e6cc' : '#3a2418'}" stroke="${w ? '#a08860' : '#000'}" stroke-width="1.4"/>`; }
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // a capturing chain: (1) approach to the right, (2) withdrawal upward, (3) approach to the left. Each step must change direction and may not
    // return to a point already visited: going on to the right after (1) is not allowed (×)
    fanoronaChain: () => { const C = 36, o = 26, W = o * 2 + C * 8, H = o * 2 + C * 4; let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="12" fill="#d8b07a" stroke="#8a5a2a" stroke-width="2"/>`;
      const X = c => o + c * C, Y = r => o + r * C;
      for (let r = 0; r < 5; r++) g += `<line x1="${X(0)}" y1="${Y(r)}" x2="${X(8)}" y2="${Y(r)}" stroke="#7a5a3a" stroke-width="1.6"/>`;
      for (let c = 0; c < 9; c++) g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(4)}" stroke="#7a5a3a" stroke-width="1.6"/>`;
      for (let c = 0; c < 8; c += 2) for (let r = 0; r < 4; r += 2) g += `<path d="M${X(c)} ${Y(r)}L${X(c + 2)} ${Y(r + 2)}M${X(c + 2)} ${Y(r)}L${X(c)} ${Y(r + 2)}" stroke="#7a5a3a" stroke-width="1.6"/>`;
      const pc = (c, r, w, op) => `<circle cx="${X(c)}" cy="${Y(r)}" r="11" fill="${w ? '#f2e6cc' : '#3a2418'}" stroke="${w ? '#a08860' : '#000'}" stroke-width="1.4"${op ? ` opacity="${op}"` : ''}/>`;
      const cap = (c, r) => pc(c, r, 0, .3) + `<path d="M${X(c) - 7} ${Y(r) - 7}l14 14M${X(c) + 7} ${Y(r) - 7}l-14 14" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`;
      g += [[6, 0], [7, 1], [8, 0]].map(([c, r]) => pc(c, r, 0)).join('') + [[6, 3], [7, 4], [1, 4]].map(([c, r]) => pc(c, r, 1)).join('');
      g += cap(4, 2) + cap(5, 2) + cap(3, 3) + cap(3, 4) + cap(1, 1) + cap(0, 1);
      g += pc(2, 2, 1, .3) + pc(3, 2, 1, .3) + pc(3, 1, 1, .3) + `<circle cx="${X(2)}" cy="${Y(1)}" r="11" fill="#f2e6cc" stroke="#2a5a8a" stroke-width="3"/>`;
      const leg = (c1, r1, c2, r2) => { const x1 = X(c1), y1 = Y(r1), x2 = X(c2), y2 = Y(r2), L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L; return `<path d="M${x1 + ux * 8} ${y1 + uy * 8}L${x2 - ux * 15} ${y2 - uy * 15}" stroke="#2a5a8a" stroke-width="3.4" marker-end="url(#fcA)"/>`; };
      g += leg(2, 2, 3, 2) + leg(3, 2, 3, 1) + leg(3, 1, 2, 1);
      g += `<path d="M${X(3) + 14} ${Y(2) + 2}L${X(4) - 4} ${Y(2) + 2}" stroke="#6a6258" stroke-width="2.6" stroke-dasharray="4 3"/><circle cx="${X(3) + 26}" cy="${Y(2) + 22}" r="9" fill="#4a423a"/><path d="M${X(3) + 22} ${Y(2) + 18}l8 8M${X(3) + 30} ${Y(2) + 18}l-8 8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
      [[2.5, 2, '1', -6, 19], [3, 1.5, '2', 19, 0], [2.5, 1, '3', 0, -19]].forEach(([c, r, n, dx, dy]) => { const x = X(c) + dx, y = Y(r) + dy; g += `<circle cx="${x}" cy="${y}" r="10" fill="#2a5a8a" stroke="#fff" stroke-width="1.5"/><text x="${x}" y="${y + 5}" font-size="15" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><defs><marker id="fcA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // janggi: the 9 × 10 board without a river, the two palaces with their diagonals, the opening position. The dashed rings: the horse and
    // elephant points each side may swap (four setups); here Han (top) and Cho (bottom) chose different ones
    janggiBoard: () => { const C = 30, o = 22, W = o * 2 + C * 8, H = o * 2 + C * 9; let g = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="8" fill="#ecd9ae" stroke="#9a7a48" stroke-width="2"/>`;
      const X = c => o + c * C, Y = r => o + r * C;
      for (let r = 0; r < 10; r++) g += `<line x1="${X(0)}" y1="${Y(r)}" x2="${X(8)}" y2="${Y(r)}" stroke="#5a4428" stroke-width="1.3"/>`;
      for (let c = 0; c < 9; c++) g += `<line x1="${X(c)}" y1="${Y(0)}" x2="${X(c)}" y2="${Y(9)}" stroke="#5a4428" stroke-width="1.3"/>`;
      [0, 7].forEach(r => { g += `<path d="M${X(3)} ${Y(r)}L${X(5)} ${Y(r + 2)}M${X(5)} ${Y(r)}L${X(3)} ${Y(r + 2)}" stroke="#5a4428" stroke-width="1.3"/>`; });
      [[1, 0], [2, 0], [6, 0], [7, 0], [1, 9], [2, 9], [6, 9], [7, 9]].forEach(([c, r]) => { g += `<circle cx="${X(c)}" cy="${Y(r)}" r="14.6" fill="none" stroke="#2a5a8a" stroke-width="2" stroke-dasharray="4 3"/>`; });
      const oct = (c, r, ch, han, R) => { const x = X(c), y = Y(r); let d = ''; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; d += `${k ? 'L' : 'M'}${(x + R * Math.cos(a)).toFixed(1)} ${(y + R * Math.sin(a)).toFixed(1)}`; }
        const col = han ? '#b8322a' : '#1f6e5a'; return `<path d="${d}Z" fill="#fbf3e2" stroke="${col}" stroke-width="1.6"/><text x="${x}" y="${y + R * .42}" font-size="${(R * 1.18).toFixed(1)}" font-weight="700" fill="${col}" text-anchor="middle">${ch}</text>`; };
      const side = (han, back, setup) => { const r0 = han ? 0 : 9, f = han ? 1 : -1; let h = '';
        h += oct(0, r0, '車', han, 12.5) + oct(8, r0, '車', han, 12.5) + oct(3, r0, '士', han, 10.5) + oct(5, r0, '士', han, 10.5) + oct(4, r0 + f, han ? '漢' : '楚', han, 14.5);
        setup.forEach((ch, k) => { h += oct([1, 2, 6, 7][k], r0, ch, han, 12.5); });
        h += oct(1, r0 + 2 * f, '包', han, 12.5) + oct(7, r0 + 2 * f, '包', han, 12.5);
        [0, 2, 4, 6, 8].forEach(c => { h += oct(c, r0 + 3 * f, han ? '兵' : '卒', han, 10.5); }); return h; };
      g += side(1, 0, ['馬', '象', '象', '馬']) + side(0, 9, ['象', '馬', '象', '馬']);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the horse (left: one step straight, one diagonal) and the elephant (right: one straight, two diagonal); a piece on a point along the way
    // blocks that direction (×)
    janggiElephant: () => { const C = 21, o = 12, P = o * 2 + C * 6, W = P * 2 + 14; let g = '';
      const panel = (ox, el) => { const X = c => ox + o + c * C, Y = r => o + r * C; let h = `<rect x="${ox + 1}" y="1" width="${P - 2}" height="${P - 2}" rx="8" fill="#ecd9ae" stroke="#9a7a48" stroke-width="1.6"/>`;
        for (let k = 0; k < 7; k++) h += `<line x1="${X(0)}" y1="${Y(k)}" x2="${X(6)}" y2="${Y(k)}" stroke="#8a6a44" stroke-width="1"/><line x1="${X(k)}" y1="${Y(0)}" x2="${X(k)}" y2="${Y(6)}" stroke="#8a6a44" stroke-width="1"/>`;
        const oct = (c, r, ch, col, R) => { const x = X(c), y = Y(r); let d = ''; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; d += `${k ? 'L' : 'M'}${(x + R * Math.cos(a)).toFixed(1)} ${(y + R * Math.sin(a)).toFixed(1)}`; } return `<path d="${d}Z" fill="${ch ? '#fbf3e2' : col}" stroke="${col}" stroke-width="1.5"/>` + (ch ? `<text x="${x}" y="${y + R * .42}" font-size="${(R * 1.2).toFixed(1)}" font-weight="700" fill="${col}" text-anchor="middle">${ch}</text>` : ''); };
        const a = el ? 2 : 1, b = el ? 3 : 2, T = []; [[a, b], [b, a]].forEach(([dx, dy]) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => T.push([3 + sx * dx, 3 + sy * dy])));
        const blk = el ? [4, 1] : [3, 2], bad = el ? [[5, 0]] : [[2, 1], [4, 1]];
        if (el) h += `<path d="M${X(3)} ${Y(3)}L${X(3)} ${Y(2)}L${X(4)} ${Y(1)}L${X(5)} ${Y(0)}" fill="none" stroke="#2a5a8a" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M${X(3)} ${Y(3)}L${X(4)} ${Y(3)}L${X(5)} ${Y(4)}L${X(6)} ${Y(5)}" fill="none" stroke="#2a5a8a" stroke-width="2.6"/>`;
        else h += `<path d="M${X(3)} ${Y(3)}L${X(3)} ${Y(2)}L${X(2)} ${Y(1)}" fill="none" stroke="#2a5a8a" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M${X(3)} ${Y(3)}L${X(4)} ${Y(3)}L${X(5)} ${Y(4)}" fill="none" stroke="#2a5a8a" stroke-width="2.6"/>`;
        T.forEach(([c, r]) => { if (bad.some(q => q[0] === c && q[1] === r)) h += `<circle cx="${X(c)}" cy="${Y(r)}" r="7.5" fill="#4a423a"/><path d="M${X(c) - 3.5} ${Y(r) - 3.5}l7 7M${X(c) + 3.5} ${Y(r) - 3.5}l-7 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`; else h += `<circle cx="${X(c)}" cy="${Y(r)}" r="6" fill="#2a5a8a"/>`; });
        h += oct(blk[0], blk[1], '', '#1f6e5a', 8) + oct(3, 3, el ? '象' : '馬', '#b8322a', 11.2);
        return h; };
      g += panel(0, 0) + panel(P + 14, 1);
      return `<svg viewBox="0 0 ${W} ${P}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the cannon: it moves and captures only over exactly one screen piece (top: over the soldier to any empty point beyond, or onto the chariot);
    // a cannon cannot be the screen (middle) and cannot be captured by a cannon (bottom)
    janggiCannon: () => { const C = 30, o = 22, W = o * 2 + C * 8, RS = 46, H = 18 + RS * 3; let g = '';
      const X = c => o + c * C;
      const oct = (c, y, ch, han, R) => { const x = X(c); let d = ''; for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; d += `${k ? 'L' : 'M'}${(x + R * Math.cos(a)).toFixed(1)} ${(y + R * Math.sin(a)).toFixed(1)}`; } const col = han ? '#b8322a' : '#1f6e5a'; return `<path d="${d}Z" fill="#fbf3e2" stroke="${col}" stroke-width="1.6"/><text x="${x}" y="${y + R * .42}" font-size="${(R * 1.18).toFixed(1)}" font-weight="700" fill="${col}" text-anchor="middle">${ch}</text>`; };
      const no = (c, y) => `<circle cx="${X(c)}" cy="${y}" r="9" fill="#4a423a"/><path d="M${X(c) - 4} ${y - 4}l8 8M${X(c) + 4} ${y - 4}l-8 8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
      const row = (k, pcs, dots, caps, nos) => { const y = 14 + RS * k + RS / 2; let h = `<rect x="2" y="${y - RS / 2 + 3}" width="${W - 4}" height="${RS - 6}" rx="8" fill="#ecd9ae"/><line x1="${X(0)}" y1="${y}" x2="${X(8)}" y2="${y}" stroke="#5a4428" stroke-width="1.4"/>`;
        for (let c = 0; c < 9; c++) h += `<line x1="${X(c)}" y1="${y - 8}" x2="${X(c)}" y2="${y + 8}" stroke="#5a4428" stroke-width="1.2"/>`;
        dots.forEach(c => { h += `<circle cx="${X(c)}" cy="${y}" r="6" fill="#2a5a8a"/>`; });
        pcs.forEach(([c, ch, han]) => { h += oct(c, y, ch, han, 12); });
        caps.forEach(c => { h += `<circle cx="${X(c)}" cy="${y}" r="15" fill="none" stroke="#2a5a8a" stroke-width="2.6"/>`; });
        nos.forEach(c => { h += no(c, y + (pcs.some(p => p[0] === c) ? -16 : 0)); }); return h; };
      g += row(0, [[0, '包', 0], [2, '卒', 0], [6, '車', 1]], [3, 4, 5], [6], []);
      g += row(1, [[0, '包', 0], [2, '包', 1], [6, '車', 1]], [], [], [3]);
      g += row(2, [[0, '包', 0], [2, '卒', 0], [5, '包', 1]], [3, 4], [], [5]);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // mahjong's tiles: three suits 1–9 (characters, dots, bamboo), the winds and dragons — four of each (136) — and eight flowers (144)
    mahjongTiles: () => { const w = 26, h = 36, gx = 3, o = 6, W = o * 2 + 9 * (w + gx) + 34, RH = h + 7; let g = '';
      ['m', 'p', 's'].forEach((k, r) => { for (let n = 1; n <= 9; n++) g += mjTile(o + (n - 1) * (w + gx), o + r * RH, w, h, k, n); });
      const hz = [['東'], ['南'], ['西'], ['北'], [''], ['白'], ['發', '#14864a'], ['中', '#c62828']];
      hz.forEach(([c, col], q) => { if (c) g += mjTile(o + q * (w + gx), o + 3 * RH, w, h, 'z', c === '白' ? '' : c, col); });
      ['梅', '蘭', '菊', '竹', '春', '夏', '秋', '冬'].forEach((c, q) => { g += mjTile(o + q * (w + gx) + (q > 3 ? 6 : 0), o + 4 * RH, w, h, 'z', c, q > 3 ? '#1b4fa0' : '#c62828'); });
      ['×4', '×4', '×4', '×4', '×1'].forEach((t, r) => { g += `<text x="${W - 4}" y="${o + r * RH + h * .64}" font-size="15" font-weight="800" fill="${r === 4 ? '#8a7a5a' : '#2b2a28'}" text-anchor="end">${t}</text>`; });
      g += `<line x1="${o}" y1="${o + 4 * RH - 3.5}" x2="${W - o}" y2="${o + 4 * RH - 3.5}" stroke="#b8ad98" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      return `<svg viewBox="0 0 ${W} ${o * 2 + 5 * RH - 7}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // a winning hand: four sets and a pair — a run (chow), a triplet (pung), a quad (kong), another run, and the pair
    mahjongHand: () => { const w = 24, h = 33, gx = 1.5, gg = 14, o = 8, L = mjL('hand'); let g = '', x = o;
      const grp = (tiles, y, lab) => { const x0 = x; tiles.forEach(([k, n, col]) => { g += mjTile(x, y, w, h, k, n, col); x += w + gx; }); const x1 = x - gx;
        g += `<path d="M${x0 + 2} ${y + h + 5}v4H${x1 - 2}v-4" fill="none" stroke="#2a5a8a" stroke-width="1.6"/><text x="${(x0 + x1) / 2}" y="${y + h + 24}" font-size="14" font-weight="800" fill="#2a5a8a" text-anchor="middle">${esc(lab || '')}</text>`; x += gg; };
      grp([['m', 1], ['m', 2], ['m', 3]], o, L[0]); grp([['p', 5], ['p', 5], ['p', 5]], o, L[1]); grp([['z', '東'], ['z', '東'], ['z', '東'], ['z', '東']], o, L[2]);
      const W = x - gg + o; x = o + 40; grp([['s', 7], ['s', 8], ['s', 9]], o + h + 34, L[3]); grp([['z', '中', '#c62828'], ['z', '中', '#c62828']], o + h + 34, L[4]);
      return `<svg viewBox="0 0 ${W} ${o + 2 * (h + 34)}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // how mahjong spread: China (c. 1870) → the United States (1920s) → Japan (1920s; riichi rules 1952) → official Chinese rules (1998)
    mahjongSpread: () => { const R = mjL('spread'), W = 300, RH = 46, o = 14, H = o * 2 + RH * (R.length - 1) + 20, xn = 96; let g = '';
      const C = ['#c62828', '#1b4fa0', '#14864a', '#14864a', '#c62828'];
      g += `<line x1="${xn}" y1="${o + 8}" x2="${xn}" y2="${o + 8 + RH * (R.length - 1)}" stroke="#b8ad98" stroke-width="3"/>`;
      R.forEach(([yr, pl, ds], k) => { const y = o + 8 + RH * k;
        g += `<circle cx="${xn}" cy="${y}" r="8" fill="${C[k % C.length]}" stroke="#fff" stroke-width="2"/><text x="${xn - 14}" y="${y + 5}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="end">${esc(yr)}</text>`;
        g += `<text x="${xn + 16}" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(pl)}</text><text x="${xn + 16}" y="${y + 19}" font-size="13" fill="#5a544a">${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // gomoku: five in a row wins (left); a four-three (right): the starred stone makes a four across and an open three down at once — White can stop only one
    gomokuFive: () => { const C = 18, o = 14, N = 8, P = o * 2 + C * (N - 1), W = P * 2 + 14; let g = '';
      const panel = (ox, B, Wt, star, marks, line) => { const X = c => ox + o + c * C, Y = r => o + r * C; let h = `<rect x="${ox + 1}" y="1" width="${P - 2}" height="${P - 2}" rx="7" fill="#e6c27f" stroke="#a07a3a" stroke-width="1.5"/>`;
        for (let k = 0; k < N; k++) h += `<line x1="${X(0)}" y1="${Y(k)}" x2="${X(N - 1)}" y2="${Y(k)}" stroke="#5a3a1a" stroke-width="1"/><line x1="${X(k)}" y1="${Y(0)}" x2="${X(k)}" y2="${Y(N - 1)}" stroke="#5a3a1a" stroke-width="1"/>`;
        if (line) h += `<line x1="${X(line[0])}" y1="${Y(line[1])}" x2="${X(line[2])}" y2="${Y(line[3])}" stroke="#e0a52a" stroke-width="13" stroke-linecap="round" opacity=".55"/>`;
        marks.forEach(([c, r, t]) => { h += `<circle cx="${X(c)}" cy="${Y(r)}" r="8" fill="#2a5a8a"/><text x="${X(c)}" y="${Y(r) + 5}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${t}</text>`; });
        B.forEach(([c, r]) => { h += `<circle cx="${X(c)}" cy="${Y(r)}" r="7.6" fill="#1d1b1b"/>`; }); Wt.forEach(([c, r]) => { h += `<circle cx="${X(c)}" cy="${Y(r)}" r="7.6" fill="#f7f4ec" stroke="#7a7466" stroke-width="1"/>`; });
        if (star) h += `<circle cx="${X(star[0])}" cy="${Y(star[1])}" r="7.6" fill="#1d1b1b"/><circle cx="${X(star[0])}" cy="${Y(star[1])}" r="10.5" fill="none" stroke="#c0392b" stroke-width="2.4"/>`;
        return h; };
      g += panel(0, [[1, 6], [2, 5], [3, 4], [4, 3], [5, 2]], [[2, 4], [3, 5], [5, 3], [4, 1]], null, [], [1, 6, 5, 2]);
      g += panel(P + 14, [[2, 4], [3, 4], [4, 4], [5, 2], [5, 3]], [[1, 4], [3, 2], [6, 6]], [5, 4], [[6, 4, '4'], [5, 1, '3'], [5, 5, '3']]);
      return `<svg viewBox="0 0 ${W} ${P}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // renju: Black may not play a double three, a double four or an overline (six or more); the forbidden points are marked ×
    renjuForbidden: () => { const C = 13, o = 9, N = 7, P = o * 2 + C * (N - 1), gap = 10, W = P * 3 + gap * 2, H = P + 26; let g = '';
      const panel = (ox, B, x, lab) => { const X = c => ox + o + c * C, Y = r => o + r * C; let h = `<rect x="${ox + 1}" y="1" width="${P - 2}" height="${P - 2}" rx="6" fill="#e6c27f" stroke="#a07a3a" stroke-width="1.3"/>`;
        for (let k = 0; k < N; k++) h += `<line x1="${X(0)}" y1="${Y(k)}" x2="${X(N - 1)}" y2="${Y(k)}" stroke="#5a3a1a" stroke-width=".9"/><line x1="${X(k)}" y1="${Y(0)}" x2="${X(k)}" y2="${Y(N - 1)}" stroke="#5a3a1a" stroke-width=".9"/>`;
        B.forEach(([c, r]) => { h += `<circle cx="${X(c)}" cy="${Y(r)}" r="5.6" fill="#1d1b1b"/>`; });
        h += `<circle cx="${X(x[0])}" cy="${Y(x[1])}" r="6.2" fill="#c0392b"/><path d="M${X(x[0]) - 3.2} ${Y(x[1]) - 3.2}l6.4 6.4M${X(x[0]) + 3.2} ${Y(x[1]) - 3.2}l-6.4 6.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`;
        return h + `<text x="${ox + P / 2}" y="${P + 19}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="middle">${lab}</text>`; };
      g += panel(0, [[2, 4], [3, 4], [4, 2], [4, 3]], [4, 4], '3 · 3');
      g += panel(P + gap, [[2, 4], [3, 4], [4, 4], [5, 1], [5, 2], [5, 3]], [5, 4], '4 · 4');
      g += panel((P + gap) * 2, [[0, 3], [1, 3], [2, 3], [4, 3], [5, 3]], [3, 3], '6+');
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // gomoku and renju in time: Edo gomoku → the name renju (1899) → RIF (1988) → Allis (1994) → free renju solved (2001) (text: the story's figL.time)
    gomokuSolved: () => { const R = ((st('gomoku').figL || {}).time) || [], W = 300, RH = 42, o = 14, H = o * 2 + RH * Math.max(0, R.length - 1) + 20, xn = 96; let g = '';
      const C = ['#8a5a24', '#8a5a24', '#c0392b', '#2a5a8a', '#14864a', '#14864a'];
      g += `<line x1="${xn}" y1="${o + 8}" x2="${xn}" y2="${o + 8 + RH * Math.max(0, R.length - 1)}" stroke="#b8ad98" stroke-width="3"/>`;
      R.forEach(([yr, pl, ds], k) => { const y = o + 8 + RH * k;
        g += `<circle cx="${xn}" cy="${y}" r="8" fill="${C[k % C.length]}" stroke="#fff" stroke-width="2"/><text x="${xn - 14}" y="${y + 5}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="end">${esc(yr)}</text>`;
        g += `<text x="${xn + 16}" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(pl)}</text><text x="${xn + 16}" y="${y + 19}" font-size="13" fill="#5a544a">${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // carrom: the board — four netted pockets, a double baseline on each side, the corner arrows — and the opening rosette: the red queen in the
    // middle, 18 men (9 white, 9 black) round it; the striker on the near baseline
    carromBoard: () => { const W = 300, f = 18, I = W - 2 * f, cx = W / 2; let g = `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="10" fill="#7a3e1e" stroke="#4a220e" stroke-width="2"/><rect x="${f}" y="${f}" width="${I}" height="${I}" fill="#f1dfb8"/>`;
      [[f, f], [W - f, f], [f, W - f], [W - f, W - f]].forEach(([x, y]) => { g += `<circle cx="${x + (x < cx ? 12 : -12)}" cy="${y + (y < cx ? 12 : -12)}" r="12" fill="#1d1410"/>`; });
      const bl = (a, b, c, d) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#3a2a1a" stroke-width="1.4"/>`, L = 66, R = W - 66, n1 = W - 50, n2 = W - 60;
      [[n1, n2], [50, 60]].forEach(([p, q]) => { g += bl(L, p, R, p) + bl(L, q, R, q) + bl(p, L, p, R) + bl(q, L, q, R); [L, R].forEach(x => { g += `<circle cx="${x}" cy="${(p + q) / 2}" r="5" fill="#c0392b"/><circle cx="${(p + q) / 2}" cy="${x}" r="5" fill="#c0392b"/>`; }); });
      [[f + 30, f + 30, 1, 1], [W - f - 30, f + 30, -1, 1], [f + 30, W - f - 30, 1, -1], [W - f - 30, W - f - 30, -1, -1]].forEach(([x, y, sx, sy]) => { g += `<line x1="${x}" y1="${y}" x2="${x + sx * 52}" y2="${y + sy * 52}" stroke="#3a2a1a" stroke-width="1.2"/>`; });
      g += `<circle cx="${cx}" cy="${cx}" r="40" fill="none" stroke="#3a2a1a" stroke-width="1.4"/>`;
      const pc = (x, y, k) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${k === 2 ? '#c0392b' : k ? '#1d1b1b' : '#f7f1e3'}" stroke="${k === 1 ? '#000' : '#8a7a5a'}" stroke-width="1"/>`;
      g += pc(cx, cx, 2);
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g += pc(cx + 14.5 * Math.cos(a), cx + 14.5 * Math.sin(a), k % 2); }
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + Math.PI / 12, r = 28; g += pc(cx + r * Math.cos(a), cx + r * Math.sin(a), (k + 1) % 2); }
      g += `<circle cx="${cx}" cy="${W - 55}" r="9.5" fill="#fbf8ee" stroke="#2a5a8a" stroke-width="2.4"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // a carrom shot: the striker flicked from the baseline (blue) rebounds off the right cushion, hits a white man, which runs into the top-right pocket (red)
    carromStrike: () => { const W = 300, f = 18, cx = W / 2; let g = `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="10" fill="#7a3e1e" stroke="#4a220e" stroke-width="2"/><rect x="${f}" y="${f}" width="${W - 2 * f}" height="${W - 2 * f}" fill="#f1dfb8"/>`;
      [[f, f], [W - f, f], [f, W - f], [W - f, W - f]].forEach(([x, y]) => { g += `<circle cx="${x + (x < cx ? 12 : -12)}" cy="${y + (y < cx ? 12 : -12)}" r="12" fill="#1d1410"/>`; });
      g += `<line x1="66" y1="${W - 50}" x2="${W - 66}" y2="${W - 50}" stroke="#3a2a1a" stroke-width="1.4"/><line x1="66" y1="${W - 60}" x2="${W - 66}" y2="${W - 60}" stroke="#3a2a1a" stroke-width="1.4"/>`;
      const sx = 120, sy = W - 55, bx = W - f - 9, by = 150, hx = 232, hy = 88, mx = 244, my = 74, px = W - f - 12, py = f + 12;
      g += `<path d="M${sx} ${sy}L${bx} ${by}L${hx + 6} ${hy + 9}" fill="none" stroke="#2a5a8a" stroke-width="3" stroke-dasharray="6 4" marker-end="url(#crA)"/>`;
      g += `<path d="M${mx + 4} ${my - 4}L${px - 12} ${py + 12}" fill="none" stroke="#c0392b" stroke-width="3" marker-end="url(#crB)"/>`;
      g += `<circle cx="${mx}" cy="${my}" r="7.5" fill="#f7f1e3" stroke="#8a7a5a" stroke-width="1"/><circle cx="${hx}" cy="${hy}" r="9.5" fill="#fbf8ee" stroke="#2a5a8a" stroke-width="2" opacity=".45"/><circle cx="${sx}" cy="${sy}" r="9.5" fill="#fbf8ee" stroke="#2a5a8a" stroke-width="2.4"/>`;
      [[100, 120, 1], [150, 160, 0], [80, 200, 1], [170, 175, 0], [60, 90, 0]].forEach(([x, y, k]) => { g += `<circle cx="${x}" cy="${y}" r="7.5" fill="${k ? '#1d1b1b' : '#f7f1e3'}" stroke="${k ? '#000' : '#8a7a5a'}" stroke-width="1"/>`; });
      g += `<circle cx="${bx}" cy="${by}" r="5" fill="none" stroke="#2a5a8a" stroke-width="2"/>`;
      const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit;direction:ltr"><defs>${mk('crA', '#2a5a8a')}${mk('crB', '#c0392b')}</defs>${g}</svg>`; },
    // carrom's cousins: flicking games of other lands (names and places: the story's figL.family — [carrom, place], then the cousins)
    carromFamily: () => { const F = ((st('carrom').figL || {}).family) || [], W = 300, RH = 46, top = 66; if (!F.length) return `<svg viewBox="0 0 ${W} 40" role="img"></svg>`;
      const [c0, ...rest] = F, K = ['#2a5a8a', '#14864a', '#8a5a24', '#6a3a8a'], H = top + 14 + RH * rest.length; let g = '';
      g += `<rect x="6" y="6" width="${W - 12}" height="50" rx="10" fill="#8a4a22"/><text x="${W / 2}" y="28" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">${esc(c0[0])}</text><text x="${W / 2}" y="46" font-size="13" fill="#f3e2c8" text-anchor="middle">${esc(c0[1])}</text>`;
      g += `<line x1="26" y1="56" x2="26" y2="${top + 14 + RH * (rest.length - 1) + 6}" stroke="#b8ad98" stroke-width="2.4"/>`;
      rest.forEach((r, k) => { const y = top + 14 + RH * k + 6; g += `<path d="M26 ${y}H44" stroke="#b8ad98" stroke-width="2.4"/><circle cx="52" cy="${y}" r="7" fill="${K[k % K.length]}"/><text x="66" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(r[0])}</text><text x="66" y="${y + 19}" font-size="13" fill="#5a544a">${esc(r[1])}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // crokinole: the round board — the 5, 10 and 15 rings, the 20 hole in the middle, eight pegs on the 15 ring, the quarter lines, the ditch round it
    crokinoleBoard: () => { const W = 300, c = W / 2; let g = `<circle cx="${c}" cy="${c}" r="148" fill="#5a3418"/><circle cx="${c}" cy="${c}" r="140" fill="#2e1a0c"/><circle cx="${c}" cy="${c}" r="122" fill="#e8cf9e" stroke="#7a5228" stroke-width="2"/>`;
      g += `<circle cx="${c}" cy="${c}" r="84" fill="#efd9ad" stroke="#3a2614" stroke-width="1.6"/><circle cx="${c}" cy="${c}" r="44" fill="#f4e2bd" stroke="#3a2614" stroke-width="1.6"/><circle cx="${c}" cy="${c}" r="9" fill="#1d1410"/>`;
      [45, 135, 225, 315].forEach(a => { const t = a * Math.PI / 180; g += `<line x1="${c + 84 * Math.cos(t)}" y1="${c + 84 * Math.sin(t)}" x2="${c + 122 * Math.cos(t)}" y2="${c + 122 * Math.sin(t)}" stroke="#3a2614" stroke-width="1.4"/>`; });
      for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4 + Math.PI / 8; g += `<circle cx="${c + 44 * Math.cos(t)}" cy="${c + 44 * Math.sin(t)}" r="4.2" fill="#c9a24a" stroke="#5a3a14" stroke-width="1.2"/>`; }
      [['20', c, c - 20], ['15', c, c + 30], ['10', c, c - 64], ['5', c, c - 103]].forEach(([t, x, y]) => { g += `<text x="${x}" y="${y + 6}" font-size="16" font-weight="800" fill="#2a5a8a" text-anchor="middle">${t}</text>`; });
      g += `<circle cx="${c + 30}" cy="${c + 96}" r="9" fill="#c0392b" stroke="#6a1a12" stroke-width="1.2"/><circle cx="${c - 58}" cy="${c + 20}" r="9" fill="#1d1b1b"/><circle cx="${c + 128}" cy="${c + 52}" r="8" fill="#1d1b1b" opacity=".85"/>`;
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // the crokinole shot rule: with an opponent's disc on the board, your shot must hit one (left ✓); miss, and your disc is taken off (right ×)
    crokinoleShot: () => { const R = 72, P = R * 2 + 8, W = P * 2 + 16, H = P + 6; let g = '';
      const bd = (ox, ok) => { const c = ox + P / 2, cy = P / 2; let h = `<circle cx="${c}" cy="${cy}" r="${R + 2}" fill="#5a3418"/><circle cx="${c}" cy="${cy}" r="${R - 6}" fill="#e8cf9e"/><circle cx="${c}" cy="${cy}" r="${R * .48}" fill="none" stroke="#3a2614" stroke-width="1.2"/><circle cx="${c}" cy="${cy}" r="${R * .25}" fill="none" stroke="#3a2614" stroke-width="1.2"/><circle cx="${c}" cy="${cy}" r="4.5" fill="#1d1410"/>`;
        const sx = c - 14, sy = cy + R - 14, bx = c + 20, by = cy - 18;
        if (ok) { h += `<path d="M${sx} ${sy}L${bx - 6} ${by + 9}" stroke="#2a5a8a" stroke-width="3" marker-end="url(#ckA)"/><path d="M${bx + 5} ${by - 7}L${bx + 30} ${by - 34}" stroke="#6a6258" stroke-width="2.4" stroke-dasharray="4 3"/>`;
          h += `<circle cx="${bx}" cy="${by}" r="7.5" fill="#1d1b1b"/><circle cx="${c + 6}" cy="${cy + 6}" r="7.5" fill="#c0392b" opacity=".35"/><circle cx="${sx}" cy="${sy}" r="7.5" fill="#c0392b"/>`;
          h += `<circle cx="${c + R - 18}" cy="${16}" r="11" fill="#14864a"/><path d="M${c + R - 23} 16l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`; }
        else { const ex = c - 30, ey = cy - 36; h += `<path d="M${sx} ${sy}L${ex} ${ey + 10}" stroke="#2a5a8a" stroke-width="3" stroke-dasharray="6 4" marker-end="url(#ckA)"/>`;
          h += `<circle cx="${bx}" cy="${by}" r="7.5" fill="#1d1b1b"/><circle cx="${ex}" cy="${ey}" r="7.5" fill="#c0392b" opacity=".4"/><path d="M${ex - 5} ${ey - 5}l10 10M${ex + 5} ${ey - 5}l-10 10" stroke="#c0392b" stroke-width="2.8" stroke-linecap="round"/><circle cx="${sx}" cy="${sy}" r="7.5" fill="#c0392b" opacity=".35"/>`;
          h += `<circle cx="${c + R - 18}" cy="${16}" r="11" fill="#c0392b"/><path d="M${c + R - 23} 11l10 10M${c + R - 13} 11l-10 10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`; }
        return h; };
      g += bd(0, 1) + bd(P + 16, 0);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs><marker id="ckA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2a5a8a"/></marker></defs>${g}</svg>`; },
    // crokinole in time (text: the story's figL.time)
    crokinoleTime: () => { const R = ((st('crokinole').figL || {}).time) || [], W = 300, RH = 42, o = 14, H = o * 2 + RH * Math.max(0, R.length - 1) + 20, xn = 96; let g = '';
      const C = ['#8a5a24', '#c0392b', '#2a5a8a', '#14864a', '#6a3a8a'];
      g += `<line x1="${xn}" y1="${o + 8}" x2="${xn}" y2="${o + 8 + RH * Math.max(0, R.length - 1)}" stroke="#b8ad98" stroke-width="3"/>`;
      R.forEach(([yr, pl, ds], k) => { const y = o + 8 + RH * k;
        g += `<circle cx="${xn}" cy="${y}" r="8" fill="${C[k % C.length]}" stroke="#fff" stroke-width="2"/><text x="${xn - 14}" y="${y + 5}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="end">${esc(yr)}</text>`;
        g += `<text x="${xn + 16}" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(pl)}</text><text x="${xn + 16}" y="${y + 19}" font-size="13" fill="#5a544a">${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // halma and its family: a chain of hops — the white piece hops over a black, a white, a black and a white piece in turn (none is taken)
    halmaJump: () => { const S = 44, o = 6, N = 6, W = S * N + o * 2; let g = `<rect x="${o}" y="${o}" width="${S * N}" height="${S * N}" fill="#f4f1ea" stroke="#1f4e9a" stroke-width="2"/>`;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) g += `<rect x="${o + c * S}" y="${o + r * S}" width="${S}" height="${S}" fill="#c9d6ee"/>`;
      const P = (c, r) => [o + c * S + S / 2, o + r * S + S / 2], path = [[0, 5], [0, 3], [2, 3], [2, 1], [4, 1]], over = [[0, 4, 2], [1, 3, 1], [2, 2, 2], [3, 1, 1]];
      const pc = (c, r, col, op) => { const [x, y] = P(c, r); return `<circle cx="${x}" cy="${y}" r="${S * .36}" fill="${col === 1 ? '#fff' : '#1f4e9a'}" stroke="${col === 1 ? '#1f4e9a' : '#0e2a5c'}" stroke-width="2.4"${op ? ` opacity="${op}"` : ''}/>`; };
      over.forEach(([c, r, col]) => { g += pc(c, r, col); });
      g += pc(0, 5, 1, .35);
      for (let k = 1; k < path.length; k++) { const [x0, y0] = P(...path[k - 1]), [x1, y1] = P(...path[k]), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = dx ? 0 : -1, ny = dx ? -1 : 0, mx = (x0 + x1) / 2 + nx * 40, my = (y0 + y1) / 2 + ny * 40;
        g += `<path d="M${x0 + ux * 10 + nx * 10} ${y0 + uy * 10 + ny * 10}Q${mx} ${my} ${x1 - ux * 12 + nx * 12} ${y1 - uy * 12 + ny * 12}" fill="none" stroke="#c0392b" stroke-width="3" marker-end="url(#hjA)"/>`; }
      path.slice(1, -1).forEach(([c, r]) => { const [x, y] = P(c, r); g += `<circle cx="${x}" cy="${y}" r="${S * .36}" fill="none" stroke="#c0392b" stroke-width="2" stroke-dasharray="4 3"/>`; });
      g += pc(4, 1, 1);
      path.slice(1).forEach(([c, r], k) => { const [x, y] = P(c, r); g += `<circle cx="${x + 13}" cy="${y + 13}" r="9" fill="#c0392b"/><text x="${x + 13}" y="${y + 17.5}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${k + 1}</text>`; });
      return `<svg viewBox="0 0 ${W} ${W}" role="img" style="font-family:inherit;direction:ltr"><defs><marker id="hjA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c0392b"/></marker></defs>${g}</svg>`; },
    // ugolki: the 8 × 8 board with the 3 × 4 corner camps — white starts bottom left (a1–d3), black top right (e6–h8), and each must fill the other's corner
    ugolkiCorner: () => { const S = 34, ox = 22, oy = 6, W = ox + S * 8 + 8, H = oy + S * 8 + 22; let g = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const wc = r >= 5 && c <= 3, bc = r <= 2 && c >= 4; g += `<rect x="${ox + c * S}" y="${oy + r * S}" width="${S}" height="${S}" fill="${wc ? '#f2dcc0' : bc ? '#cfdcf2' : (r + c) % 2 ? '#e6e2d8' : '#f7f5ef'}"/>`; }
      g += `<rect x="${ox}" y="${oy + 5 * S}" width="${S * 4}" height="${S * 3}" fill="none" stroke="#c0392b" stroke-width="2.6"/><rect x="${ox + 4 * S}" y="${oy}" width="${S * 4}" height="${S * 3}" fill="none" stroke="#1f4e9a" stroke-width="2.6"/><rect x="${ox}" y="${oy}" width="${S * 8}" height="${S * 8}" fill="none" stroke="#3a3428" stroke-width="1.6"/>`;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const wc = r >= 5 && c <= 3, bc = r <= 2 && c >= 4; if (!wc && !bc) continue; const x = ox + c * S + S / 2, y = oy + r * S + S / 2;
        g += `<circle cx="${x}" cy="${y}" r="${S * .36}" fill="${wc ? '#fff' : '#1f4e9a'}" stroke="${wc ? '#1f4e9a' : '#0e2a5c'}" stroke-width="2"/>`; }
      g += `<path d="M${ox + 4 * S + 6} ${oy + 5 * S - 6}L${ox + 5.4 * S} ${oy + 3.6 * S}" stroke="#c0392b" stroke-width="3" marker-end="url(#ucA)"/><path d="M${ox + 4 * S - 6} ${oy + 3 * S + 6}L${ox + 2.6 * S} ${oy + 4.4 * S}" stroke="#1f4e9a" stroke-width="3" marker-end="url(#ucB)"/>`;
      for (let k = 0; k < 8; k++) g += `<text x="${ox + k * S + S / 2}" y="${oy + S * 8 + 16}" font-size="12" fill="#5a544a" text-anchor="middle">${'abcdefgh'[k]}</text><text x="${ox - 8}" y="${oy + k * S + S / 2 + 4}" font-size="12" fill="#5a544a" text-anchor="middle">${8 - k}</text>`;
      const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs>${mk('ucA', '#c0392b')}${mk('ucB', '#1f4e9a')}</defs>${g}</svg>`; },
    // the halma family: a small board for each — halma's square board, the star board (Stern-Halma, then "Chinese checkers"), ugolki's 8 × 8 (text: the story's figL.fam — [year, name, place and board])
    halmaStar: () => { const F = ((st('ugolki').figL || {}).fam) || [], W = 300, RH = 64, o = 8, H = o * 2 + RH * F.length; let g = '';
      const sq = (x, y, s, n, k, col) => { let h = `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#f7f5ef" stroke="#3a3428" stroke-width="1.2"/>`; const q = s / n;
        for (let i = 1; i < n; i++) h += `<path d="M${x + i * q} ${y}V${y + s}M${x} ${y + i * q}H${x + s}" stroke="#cfc8b8" stroke-width=".6"/>`;
        const rows = k === 5 ? [5, 5, 4, 3, 2] : [k, k, k];
        rows.forEach((w, i) => { h += `<rect x="${x}" y="${y + s - (i + 1) * q}" width="${w * q}" height="${q}" fill="${col}" opacity=".85"/><rect x="${x + s - w * q}" y="${y + i * q}" width="${w * q}" height="${q}" fill="#1f4e9a" opacity=".85"/>`; }); return h; };
      const star = (cx, cy, R, cols) => { const pt = a => [cx + R * Math.cos(a), cy + R * Math.sin(a)], tri = (a, col) => { const p = [pt(a), pt(a + 2 * Math.PI / 3), pt(a + 4 * Math.PI / 3)]; return `<path d="M${p.map(v => v.map(n => n.toFixed(1)).join(' ')).join('L')}Z" fill="${col}" stroke="#3a3428" stroke-width="1"/>`; };
        let h = tri(-Math.PI / 2, '#f7f5ef') + tri(Math.PI / 2, '#f7f5ef'); const hx = R / 2;
        for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3, tip = pt(a), b1 = [cx + R / Math.sqrt(3) * Math.cos(a - Math.PI / 6), cy + R / Math.sqrt(3) * Math.sin(a - Math.PI / 6)], b2 = [cx + R / Math.sqrt(3) * Math.cos(a + Math.PI / 6), cy + R / Math.sqrt(3) * Math.sin(a + Math.PI / 6)];
          h += `<path d="M${tip.map(n => n.toFixed(1)).join(' ')}L${b1.map(n => n.toFixed(1)).join(' ')}L${b2.map(n => n.toFixed(1)).join(' ')}Z" fill="${cols[k]}" stroke="#3a3428" stroke-width="1"/>`; }
        return h; };
      const SC = ['#c0392b', '#e0a020', '#14864a', '#1f4e9a', '#6a3a8a', '#2b2a28'];
      g += `<line x1="30" y1="${o + RH / 2}" x2="30" y2="${o + RH * (F.length - .5)}" stroke="#b8ad98" stroke-width="2.4" stroke-dasharray="4 4"/>`;
      F.forEach(([yr, nm, ds], k) => { const y = o + RH * k, cy = y + RH / 2;
        g += `<rect x="4" y="${cy - 26}" width="52" height="52" rx="8" fill="#fff" stroke="#d8d0c0"/>`;
        if (k === 0) g += sq(9, cy - 21, 42, 16, 5, '#c0392b');
        else if (k === F.length - 1) g += sq(9, cy - 21, 42, 8, 4, '#d9a066');
        else g += star(30, cy + 1, 24, k === 1 ? SC.map((c, i) => i % 2 ? '#f7f5ef' : c) : SC);
        g += `<text x="68" y="${cy - 6}" font-size="15" font-weight="800" fill="#2b2a28">${esc(nm)}</text><text x="68" y="${cy + 14}" font-size="13" fill="#5a544a"><tspan font-weight="800" fill="#c0392b">${esc(yr)}</tspan> · ${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // agon: the 91-cell hexagonal board — the throne in the middle, five rings round it (red and ivory in turn), and the starting layout: each side's queen and six guards alternating round the edge
    agonBoard: () => { const u = 26, W = 300, H = 262, A = agonHex(u, W / 2, H / 2); let g = A.g;
      [[0, -5, 4], [2, -5, 1], [4, -5, 3], [5, -4, 1], [-2, -3, 1], [-4, -1, 3], [5, -1, 3], [-5, 1, 1], [4, 1, 1], [2, 3, 3], [-5, 4, 3], [-4, 5, 1], [-2, 5, 3], [0, 5, 2]].forEach(([q, r, k]) => { g += A.pc(q, r, k); });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // agon: a step goes along the same ring or one ring inwards (green ✓), never outwards (red ×)
    agonMove: () => { const u = 26, W = 300, H = 262, A = agonHex(u, W / 2, H / 2, 1); let g = A.g;
      const me = [1, -3];
      [[2, -3], [1, -2], [0, -2], [0, -3], [1, -4], [2, -4]].forEach(([q, r]) => { const [x, y] = A.P(q, r), ok = A.ring(q, r) <= 3;
        g += `<path d="${A.hx(x, y, A.R - 1.5)}" fill="${ok ? '#8fd0a8' : '#f0a49a'}"/>`;
        g += ok ? `<path d="M${x - 6} ${y}l4 4.5 8-9" fill="none" stroke="#0e6a38" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`; });
      g += A.pc(...me, 1);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // agon: capture by sandwiching — (1) the white guard steps in, the black guard is caught between two white ones in a line; (2) its owner moves it out to the edge ring
    agonCapture: () => { const u = 26, W = 300, H = 262, A = agonHex(u, W / 2, H / 2, 1); let g = A.g;
      const arr = (a, b, col, dash, id) => { const [x0, y0] = A.P(...a), [x1, y1] = A.P(...b), dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L; return `<path d="M${x0 + ux * 11} ${y0 + uy * 11}L${x1 - ux * 12} ${y1 - uy * 12}" stroke="${col}" stroke-width="3"${dash ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#${id})"/>`; };
      const [bx, by] = A.P(0, -2), [ax, ay] = A.P(-1, -2), [cx, cy] = A.P(1, -2);
      g += `<path d="M${ax} ${ay}L${cx} ${cy}" stroke="#d9b04a" stroke-width="5" opacity=".9" stroke-linecap="round"/>`;
      g += A.pc(-2, -1, 1, .35) + A.pc(1, -2, 1) + A.pc(-1, -2, 1) + A.pc(0, -2, 3, .55);
      g += `<circle cx="${bx}" cy="${by}" r="${A.R * .9}" fill="none" stroke="#c0392b" stroke-width="2.4" stroke-dasharray="4 3"/>`;
      g += arr([-2, -1], [-1, -2], '#2a5a8a', 0, 'acA') + arr([0, -2], [2, -5], '#c0392b', 1, 'acB') + A.pc(2, -5, 3);
      const badge = (q, r, n, col, dx, dy) => { const [x, y] = A.P(q, r); return `<circle cx="${x + dx}" cy="${y + dy}" r="9" fill="${col}"/><text x="${x + dx}" y="${y + dy + 4.5}" font-size="12" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`; };
      g += badge(-2, -1, 1, '#2a5a8a', -14, 10) + badge(2, -5, 2, '#c0392b', 14, -8);
      const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs>${mk('acA', '#2a5a8a')}${mk('acB', '#c0392b')}</defs>${g}</svg>`; },
    // dots and boxes: a long chain and the double-cross — (1) B opens a chain of five; A takes three, then (2) gives the last two away with the end line; (3) B takes both with one line and must move again
    dotsChain: () => { const S = 50, ox = 25, W = ox * 2 + S * 5, top = 24, H = top + S + 30; let g = '';
      const ln = (x1, y1, x2, y2, col, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="4" stroke-linecap="round"${dash ? ' stroke-dasharray="7 5"' : ''}/>`;
      const X = i => ox + i * S, y0 = top, y1 = top + S, A = '#2a5a8a', B = '#c0392b';
      for (let i = 0; i < 5; i++) { const own = i < 3 ? 'A' : 'B', col = i < 3 ? A : B; g += `<rect x="${X(i) + 3}" y="${y0 + 3}" width="${S - 6}" height="${S - 6}" fill="${col}" opacity=".12"/><text x="${X(i) + S / 2}" y="${y0 + S / 2 + 8}" font-size="22" font-weight="800" fill="${col}" text-anchor="middle">${own}</text>`; }
      g += ln(X(0), y0, X(5), y0, '#8a8478') + ln(X(0), y1, X(5), y1, '#8a8478');
      g += ln(X(0), y0, X(0), y1, B) + ln(X(1), y0, X(1), y1, A) + ln(X(2), y0, X(2), y1, A) + ln(X(3), y0, X(3), y1, A) + ln(X(5), y0, X(5), y1, A) + ln(X(4), y0, X(4), y1, B, 1);
      for (let i = 0; i <= 5; i++) g += `<circle cx="${X(i)}" cy="${y0}" r="4.5" fill="#2b2a28"/><circle cx="${X(i)}" cy="${y1}" r="4.5" fill="#2b2a28"/>`;
      const bd = (x, y, n, col) => `<circle cx="${x}" cy="${y}" r="10" fill="${col}"/><text x="${x}" y="${y + 4.5}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">${n}</text>`;
      g += bd(X(0), y1 + 18, 1, B) + bd(X(5), y1 + 18, 2, A) + bd(X(4), y1 + 18, 3, B);
      g += `<path d="M${X(1)} ${y0 - 12}H${X(3)}" stroke="${A}" stroke-width="2" marker-end="url(#dcA)"/><path d="M${X(1)} ${y0 - 17}v10" stroke="${A}" stroke-width="2"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs><marker id="dcA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${A}"/></marker></defs>${g}</svg>`; },
    // connect four: the 7 × 6 frame, a disc dropping to the lowest empty hole, and red's threat on the third row (odd) — the hole under it is empty, so whoever fills that hole hands red the win
    connect4Gravity: () => { const S = 38, ox = 26, oy = 34, W = ox + S * 7 + 10, H = oy + S * 6 + 14, R = '#d0352b', Y = '#e8b820'; let g = `<rect x="${ox - 6}" y="${oy - 6}" width="${S * 7 + 12}" height="${S * 6 + 12}" rx="10" fill="#1f4e9a"/>`;
      const C = [['Y', 'R', 'Y'], ['Y', 'R', 'R'], ['R', 'Y', 'R'], ['Y', 'Y', 'R'], ['R'], [], []];
      const cx = c => ox + c * S + S / 2, cy = r => oy + (5 - r) * S + S / 2;
      for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) { const p = C[c][r]; g += `<circle cx="${cx(c)}" cy="${cy(r)}" r="${S * .38}" fill="${p === 'R' ? R : p === 'Y' ? Y : '#f4f1ea'}" stroke="${p ? 'rgba(0,0,0,.25)' : '#16386f'}" stroke-width="1.5"/>`; }
      for (let r = 0; r < 6; r++) g += `<text x="${ox - 15}" y="${cy(r) + 5}" font-size="13" font-weight="800" fill="${r % 2 ? '#8a8478' : '#c0392b'}" text-anchor="middle">${r + 1}</text>`;
      g += `<rect x="${ox - 3}" y="${cy(2) - S / 2 + 2}" width="${S * 7 + 6}" height="${S - 4}" rx="6" fill="none" stroke="#c0392b" stroke-width="1.6" stroke-dasharray="3 3" opacity=".7"/>`;
      g += `<circle cx="${cx(4)}" cy="${cy(2)}" r="${S * .38}" fill="none" stroke="${R}" stroke-width="3" stroke-dasharray="5 3"/><circle cx="${cx(4)}" cy="${cy(1)}" r="${S * .38}" fill="none" stroke="#2b2a28" stroke-width="2.5"/><path d="M${cx(4) - 6} ${cy(1) - 6}l12 12M${cx(4) + 6} ${cy(1) - 6}l-12 12" stroke="#2b2a28" stroke-width="2.5" stroke-linecap="round"/>`;
      g += `<circle cx="${cx(6)}" cy="${oy - 20}" r="${S * .36}" fill="${Y}" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/><path d="M${cx(6)} ${oy - 4}V${cy(0) - S * .5}" stroke="${Y}" stroke-width="3" stroke-dasharray="5 4" marker-end="url(#cgA)"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs><marker id="cgA" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c8960a"/></marker></defs>${g}</svg>`; },
    // solved games in time: Lucas's pipopipette, Connect Four, its solution, Berlekamp's book (text: the story's figL.time — [year, name, note])
    solvedTimeline: () => { const R = ((st('dots').figL || {}).time) || [], W = 300, RH = 50, o = 14, H = o * 2 + RH * Math.max(0, R.length - 1) + 24, xn = 70; let g = '';
      const C = ['#2a5a8a', '#d0352b', '#14864a', '#6a3a8a', '#8a5a24'];
      g += `<line x1="${xn}" y1="${o + 8}" x2="${xn}" y2="${o + 8 + RH * Math.max(0, R.length - 1)}" stroke="#b8ad98" stroke-width="3"/>`;
      R.forEach(([yr, nm, ds], k) => { const y = o + 8 + RH * k;
        g += `<circle cx="${xn}" cy="${y}" r="8" fill="${C[k % C.length]}" stroke="#fff" stroke-width="2"/><text x="${xn - 14}" y="${y + 5}" font-size="15" font-weight="800" fill="#2b2a28" text-anchor="end">${esc(yr)}</text>`;
        g += `<text x="${xn + 16}" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(nm)}</text><text x="${xn + 16}" y="${y + 20}" font-size="13" fill="#5a544a">${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // hit & blow: one guess and its answer — the hidden code above, the guess below: same colour in the same place = a hit (pink pin), the right colour in another place = a blow (white pin)
    hitblowFeedback: () => { const K = ['#e0453a', '#f0a020', '#e8d040', '#3aa860', '#3a78d8', '#9a5ad0'], W = 300, H = 210, x0 = 34, dx = 52, ya = 46, yg = 156, r = 17; let g = '';
      g += `<rect x="${x0 - 26}" y="${ya - 30}" width="${dx * 3 + 52}" height="60" rx="12" fill="#1c2340"/><rect x="${x0 - 26}" y="${yg - 30}" width="${dx * 3 + 52}" height="60" rx="12" fill="#2b3683"/>`;
      const ans = [0, 1, 2, 3], gs = [0, 2, 4, 1], X = i => x0 + i * dx;
      const peg = (x, y, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K[c]}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><circle cx="${x - 5}" cy="${y - 6}" r="4.5" fill="#fff" opacity=".45"/>`;
      ans.forEach((c, i) => { g += peg(X(i), ya, c); }); gs.forEach((c, i) => { g += peg(X(i), yg, c); });
      g += `<path d="M${X(0)} ${ya + r + 3}V${yg - r - 3}" stroke="#e8458a" stroke-width="4"/>`;
      g += `<path d="M${X(1)} ${yg - r - 3}L${X(2)} ${ya + r + 3}" stroke="#8a8478" stroke-width="3" stroke-dasharray="6 4"/><path d="M${X(3)} ${yg - r - 3}L${X(1)} ${ya + r + 3}" stroke="#8a8478" stroke-width="3" stroke-dasharray="6 4"/>`;
      g += `<path d="M${X(2) - 7} ${yg - r - 16}l14 14M${X(2) + 7} ${yg - r - 16}l-14 14" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`;
      const px = x0 + dx * 3 + 56, pin = (x, y, f) => `<circle cx="${x}" cy="${y}" r="8" fill="${f || '#1c2340'}" stroke="${f ? 'rgba(0,0,0,.35)' : '#4a5490'}" stroke-width="1.5"/>`;
      g += `<rect x="${px - 6}" y="${yg - 30}" width="${W - px}" height="60" rx="12" fill="#2b3683"/>` + pin(px + 14, yg - 12, '#e8458a') + pin(px + 38, yg - 12, '#f4f1ea') + pin(px + 14, yg + 12, '#f4f1ea') + pin(px + 38, yg + 12);
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // how the answers shrink the field: 6 colours × 4 holes = 1296 codes; Knuth's method on one code — 256, 41, 6, 1 left, found at the 5th guess (bars on a log scale)
    hitblowSearch: () => { const K = ['#e0453a', '#f0a020', '#e8d040', '#3aa860', '#3a78d8', '#9a5ad0'], W = 300, RH = 40, o = 30, H = o + RH * 5 + 8; let g = '';
      const rows = [[[0, 0, 1, 1], 0, 1, 256], [[1, 2, 3, 3], 0, 2, 41], [[2, 1, 2, 4], 1, 1, 6], [[2, 3, 0, 2], 0, 1, 1], [[3, 1, 4, 5], 4, 0, 1]];
      const bx = 120, bw = W - bx - 8, L = n => Math.max(6, Math.log(n) / Math.log(1296) * bw);
      g += `<rect x="${bx}" y="4" width="${bw}" height="18" rx="4" fill="#8a94c8"/><text x="${bx + bw - 6}" y="18" font-size="13" font-weight="800" fill="#fff" text-anchor="end">1296</text>`;
      rows.forEach(([cs, h, b, n], k) => { const y = o + RH * k + RH / 2;
        cs.forEach((c, i) => { g += `<circle cx="${14 + i * 21}" cy="${y}" r="9" fill="${K[c]}" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>`; });
        for (let j = 0; j < 4; j++) { const f = j < h ? '#e8458a' : j < h + b ? '#f4f1ea' : '#2b3683'; g += `<circle cx="${96 + (j % 2) * 11}" cy="${y - 5.5 + (j >> 1) * 11}" r="4.3" fill="${f}" stroke="#2b3683" stroke-width="1"/>`; }
        const done = k === rows.length - 1, w = done ? 26 : L(n);
        g += `<rect x="${bx}" y="${y - 10}" width="${w}" height="20" rx="4" fill="${done ? '#14864a' : '#2b3683'}"/>`;
        g += done ? `<path d="M${bx + 7} ${y}l4.5 5 9-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : `<text x="${bx + w + 6}" y="${y + 5}" font-size="14" font-weight="800" fill="#2b2a28">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // the code-breaking games in time (text: the story's figL.time — [year, name, note])
    hitblowFive: () => { const R = ((st('hitblow').figL || {}).time) || [], W = 300, RH = 50, o = 14, H = o * 2 + RH * Math.max(0, R.length - 1) + 24, xn = 84; let g = '';
      const C = ['#8a5a24', '#2a5a8a', '#c0392b', '#14864a', '#6a3a8a'];
      g += `<line x1="${xn}" y1="${o + 8}" x2="${xn}" y2="${o + 8 + RH * Math.max(0, R.length - 1)}" stroke="#b8ad98" stroke-width="3"/>`;
      R.forEach(([yr, nm, ds], k) => { const y = o + 8 + RH * k;
        g += `<circle cx="${xn}" cy="${y}" r="8" fill="${C[k % C.length]}" stroke="#fff" stroke-width="2"/><text x="${xn - 14}" y="${y + 5}" font-size="14" font-weight="800" fill="#2b2a28" text-anchor="end">${esc(yr)}</text>`;
        g += `<text x="${xn + 16}" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(nm)}</text><text x="${xn + 16}" y="${y + 20}" font-size="13" fill="#5a544a">${esc(ds)}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // futebol de botão: the flick — the palheta presses the button's edge (1), the button strikes the ball, and the ball flies past the keeper into the goal (2)
    botaoFlick: () => { const W = 300, H = 300; let g = `<rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#2f8a3a"/>`;
      for (let i = 0; i < 6; i++) g += `<rect x="0" y="${i * 50}" width="${W}" height="25" fill="#fff" opacity=".05"/>`;
      g += `<path d="M30 0V70H270V0" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/><path d="M95 0V32H205V0" fill="none" stroke="#fff" stroke-width="2" opacity=".85"/>`;
      g += `<rect x="112" y="0" width="76" height="8" fill="#f4f1ea" stroke="#8a8478"/><path d="M112 8h76" stroke="#d8d4c8" stroke-width="2"/>`;
      g += `<rect x="128" y="12" width="34" height="14" rx="2" fill="#2a4a8a" stroke="#14264a" stroke-width="1.5"/>`;
      const bx = 112, by = 236, ox = 142, oy = 150;
      g += `<path d="M${bx + 6} ${by - 22}L${ox - 5} ${oy + 11}" stroke="#f0c020" stroke-width="3.2" marker-end="url(#bfA)"/>`;
      g += `<path d="M${ox + 4} ${oy - 8}Q${172} ${80} ${178} ${14}" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 5" marker-end="url(#bfB)"/>`;
      g += `<circle cx="${ox}" cy="${oy}" r="6.5" fill="#f4f1ea" stroke="#2b2a28" stroke-width="1.4"/>`;
      g += `<circle cx="${bx}" cy="${by}" r="22" fill="#d0352b" stroke="#7a1a12" stroke-width="2"/><circle cx="${bx}" cy="${by}" r="13" fill="none" stroke="#f4d0c8" stroke-width="1.6"/>`;
      g += `<path d="M${bx - 18} ${by + 34}L${bx + 2} ${by + 14}L${bx + 14} ${by + 26}L${bx - 6} ${by + 46}Z" fill="#3a3430" stroke="#14110f" stroke-width="1.5"/>`;
      g += `<circle cx="${bx - 26}" cy="${by + 40}" r="10" fill="#c0392b"/><text x="${bx - 26}" y="${by + 44.5}" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">1</text>`;
      g += `<circle cx="${190}" cy="${60}" r="10" fill="#c0392b"/><text x="190" y="64.5" font-size="13" font-weight="800" fill="#fff" text-anchor="middle">2</text>`;
      [[200, 200, '#d0352b'], [60, 150, '#d0352b'], [230, 120, '#f4f1ea'], [90, 90, '#f4f1ea']].forEach(([x, y, c]) => { g += `<circle cx="${x}" cy="${y}" r="18" fill="${c}" stroke="${c === '#f4f1ea' ? '#8a8478' : '#7a1a12'}" stroke-width="2" opacity=".9"/>`; });
      const mk = (id, col) => `<marker id="${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr"><defs>${mk('bfA', '#f0c020')}${mk('bfB', '#fff')}</defs>${g}</svg>`; },
    // futebol de botão: a team (ten buttons and the keeper's block) and Brazil's three classic rule sets by the number of touches (text: the story's figL.rules — [touches, name])
    botaoRules: () => { const R = ((st('botao').figL || {}).rules) || [], W = 300, H = 262; let g = `<rect x="0" y="0" width="${W}" height="112" rx="10" fill="#2f8a3a"/><path d="M10 104H290M110 104V84H190V104" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/><path d="M128 112V106H172V112" fill="none" stroke="#fff" stroke-width="2"/>`;
      g += `<rect x="134" y="90" width="32" height="12" rx="2" fill="#2a4a8a" stroke="#14264a" stroke-width="1.4"/>`;
      [[40, 70], [100, 72], [200, 72], [260, 70], [70, 46], [150, 52], [230, 46], [110, 24], [190, 24], [150, 14]].forEach(([x, y]) => { g += `<circle cx="${x}" cy="${y}" r="10" fill="#d0352b" stroke="#7a1a12" stroke-width="1.5"/>`; });
      R.forEach(([n, nm], k) => { const cw = 92, x = 4 + k * (cw + 6), y = 126;
        g += `<rect x="${x}" y="${y}" width="${cw}" height="132" rx="10" fill="#f4efe2" stroke="#d8cfb8"/><text x="${x + cw / 2}" y="${y + 46}" font-size="38" font-weight="800" fill="#2f8a3a" text-anchor="middle">${esc(n)}</text>`;
        const t = +n || 0; for (let i = 0; i < t; i++) { const row = Math.floor(i / 6), m = Math.min(6, t - row * 6); g += `<circle cx="${x + cw / 2 - (m - 1) * 6 + (i % 6) * 12}" cy="${y + 64 + row * 11}" r="4" fill="#d0352b"/>`; }
        const words = String(nm).split(/\n/); words.forEach((w, j) => { g += `<text x="${x + cw / 2}" y="${y + 104 + j * 17}" font-size="13" font-weight="800" fill="#2b2a28" text-anchor="middle">${esc(w)}</text>`; }); });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // the flicking-football family (names and notes: the story's figL.family — [botão, note], then the cousins)
    botaoFamily: () => { const F = ((st('botao').figL || {}).family) || [], W = 300, RH = 46, top = 66; if (!F.length) return `<svg viewBox="0 0 ${W} 40" role="img"></svg>`;
      const [c0, ...rest] = F, K = ['#2a5a8a', '#c0392b', '#8a5a24', '#6a3a8a'], H = top + 14 + RH * rest.length; let g = '';
      g += `<rect x="6" y="6" width="${W - 12}" height="50" rx="10" fill="#2f8a3a"/><text x="${W / 2}" y="28" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">${esc(c0[0])}</text><text x="${W / 2}" y="46" font-size="13" fill="#e8f4d8" text-anchor="middle">${esc(c0[1])}</text>`;
      g += `<line x1="26" y1="56" x2="26" y2="${top + 14 + RH * (rest.length - 1) + 6}" stroke="#b8ad98" stroke-width="2.4"/>`;
      rest.forEach((r, k) => { const y = top + 14 + RH * k + 6; g += `<path d="M26 ${y}H44" stroke="#b8ad98" stroke-width="2.4"/><circle cx="52" cy="${y}" r="7" fill="${K[k % K.length]}"/><text x="66" y="${y + 1}" font-size="15" font-weight="800" fill="#2b2a28">${esc(r[0])}</text><text x="66" y="${y + 19}" font-size="13" fill="#5a544a">${esc(r[1])}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit;direction:ltr">${g}</svg>`; },
    // four tetrahedral dice: how often each score comes (out of 16)
    tetraOdds: () => { const n = [1, 4, 6, 4, 1], W = 300, H = 150, bw = 40, gap = (W - 40 - bw * 5) / 4; let g = '';
      n.forEach((v, i) => { const x = 20 + i * (bw + gap), h = v / 6 * 96, y = 112 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${i === 2 ? '#2f4a6e' : '#8aa3c4'}"/><text x="${x + bw / 2}" y="${y - 6}" font-size="12" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}/16</text><text x="${x + bw / 2}" y="132" font-size="14" font-weight="800" fill="#2b2a28" text-anchor="middle">${i}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit"><line x1="10" y1="112.5" x2="${W - 10}" y2="112.5" stroke="#b8ad98" stroke-width="1.5"/>${g}</svg>`; },
  };
  function figHtml(f, cap) {
    const c = cap ? `<figcaption>${esc(cap)}</figcaption>` : '';
    if (f.svg && DIAG[f.svg]) return `<figure class="rdfig dg">${DIAG[f.svg]().replace('role="img"', `role="img" aria-label="${esc(cap || '')}"`)}${c}</figure>`;
    const tag = f.ex ? `data-ex="${f.ex}"` : f.paint ? `data-paint="${f.paint}"` : '', name = f.ex ? exName(f.ex) : f.paint ? paintName(f.paint) : '';
    const img = `<img src="${src(f)}" alt="${esc(cap || name)}" loading="lazy">`;
    return `<figure class="rdfig">${tag ? `<button type="button" class="rdfb" ${tag} aria-label="${esc(name)}">${img}<span>${esc(name)} ›</span></button>` : img}${c}</figure>`;
  }
  function wire(el) {
    el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => ctx.open && ctx.open(b.dataset.g));
    el.querySelectorAll('[data-href]').forEach(b => b.onclick = () => { location.href = b.dataset.href; });   // (a game with its own page outside the Atlas)
    el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => openEx(b.dataset.ex, b));
    el.querySelectorAll('[data-paint]').forEach(b => b.onclick = () => openPaint(b.dataset.paint, b));
    el.querySelectorAll('[data-room]').forEach(b => b.onclick = () => ctx.goRoom && ctx.goRoom(b.dataset.room));
    el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => window.AtlasMuseum.pickIn(b.dataset.pick, b.dataset.pg));
  }

  /* ---------- the shelf: the stamp card and the stories ---------- */
  function shelf() {
    cur = null; const S = stamps(), n = STORIES.filter(s => S[s.id]).length;
    // (2026-11-24 ユーザー: 地域別で) the map's regions as chips; a chosen region keeps only its stories (the numbers stay the stories' own)
    const RG = ['all', ...((window.AtlasMap && AtlasMap.REG) || ['all', 'asia', 'europe', 'mea', 'americas']).filter(k => k !== 'all')], rl = k => window.AtlasMap && AtlasMap.label ? AtlasMap.label(k, lang) : k;
    const cnt = k => STORIES.filter(s => k === 'all' || s.region === k).length;
    host.innerHTML = `<div class="rdx"><p class="chlead">${esc(fmt(u('lead'), { n: STORIES.length }))}</p>
      <div class="chips cats rdreg" role="group">${RG.filter(k => cnt(k)).map(k => `<button type="button" class="chip cat" data-reg="${k}" aria-pressed="${k === region}">${esc(rl(k))}<em>${cnt(k)}</em></button>`).join('')}</div>
      <div class="rdlist">${STORIES.filter(s => region === 'all' || s.region === region).map(s => { const i = STORIES.indexOf(s), x = st(s.id);
        return `<button type="button" class="rdc" data-s="${s.id}" style="--c:${s.color}"><span class="rdci${ga(s.cover)}"><img src="${src(s.cover)}" alt="" loading="lazy"></span>
          <span class="rdct2"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(s) }))}${S[s.id] ? ` · <b class="rdok">✓ ${esc(u('stamped'))}</b>` : ''}</em><b>${esc(x.title)}</b><small>${esc(x.lead)}</small></span></button>`; }).join('')}</div></div>`;
    host.querySelectorAll('[data-s]').forEach(b => b.onclick = () => story(b.dataset.s, true));
    host.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { region = b.dataset.reg; try { localStorage.setItem('atlas-read-region', region); } catch (e) {} shelf(); const c = host.querySelector(`[data-reg="${region}"]`); if (c) c.focus(); });
    if (window.AtlasMuseum && AtlasMuseum.pager) AtlasMuseum.pager(host.querySelector('.rdlist'), 'read' + (region === 'all' ? '' : '-' + region), { rows: { pc: 3, phone: 6 }, extra: host.querySelector('.rdreg') });
  }

  /* ---------- a story ---------- */
  // (2026-11-24) the minutes a story takes, from its own text: ~500 characters a minute (CJK) or ~200 words (others)
  function mins(S) {
    const x = st(S.id), t = [x.lead, ...(x.s || []), ...(x.kf || []), ...((x.more || []).flatMap(m => [m.h, ...m.p])), ...((x.tl || []).map(r => r.join(' ')))].join(' ');
    const cjk = (t.match(/[\u3000-\u9fff\uac00-\ud7af]/g) || []).length, words = t.replace(/[\u3000-\u9fff\uac00-\ud7af]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(S.mins || 1, Math.round(cjk / 500 + words / 200));
  }
  function story(id, user) {
    const S = STORIES.find(s => s.id === id); if (!S) return; cur = S; const x = st(id), i = STORIES.indexOf(S);
    if (user && ctx.hist) ctx.hist({ room: 'read', story: id });
    host.innerHTML = `<article class="rda" style="--c:${S.color}">
      <button type="button" class="btn ghost sm rdback">← ${esc(u('back'))}</button>
      <div class="rdh"><button type="button" class="rdhimg${ga(S.cover)}" ${S.cover.href && !((ctx.games || []).some(q => q.id === S.cover.g)) ? `data-href="${S.cover.href}"` : S.cover.g ? `data-g="${S.cover.g}"` : S.cover.ex ? `data-ex="${S.cover.ex}"` : `data-paint="${S.cover.paint}"`}><img src="${src(S.cover)}" alt=""><span>${esc(S.cover.g ? u('game') : S.cover.ex ? u('exhibit') : u('art'))} · ${esc(S.cover.g ? gName(S.cover.g) : S.cover.ex ? exName(S.cover.ex) : paintName(S.cover.paint))} ›</span></button>
        <div class="rdht"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(S) }))}</em><h3>${esc(x.title)}</h3><p>${esc(x.lead)}</p></div></div>
      ${x.kf && x.kf.length ? `<aside class="rdkf"><h4>${esc(u('kfH'))}</h4><ul>${x.kf.map(k => `<li>${esc(k)}</li>`).join('')}</ul></aside>` : ''}
      ${(x.s || []).map((p, k) => { const im = S.sec[k], flip = im && S.sec.slice(0, k).filter(Boolean).length % 2;
        return `<section class="rds${im ? '' : ' np'}${flip ? ' fl' : ''}">${im && im.pic ? `<a class="rdimg" href="${picUrl(im.pic)}" target="_blank" rel="noopener" aria-label="${esc(picName(im.pic) + ' — ' + u('picLink'))}"><img src="${src(im)}" alt="" loading="lazy"><span>${esc(picName(im.pic))} ↗</span></a>` : im ? `<button type="button" class="rdimg" ${im.ex ? `data-ex="${im.ex}"` : `data-paint="${im.paint}"`} aria-label="${esc(im.ex ? exName(im.ex) : paintName(im.paint))}"><img src="${src(im)}" alt="" loading="lazy"><span>${esc(im.ex ? exName(im.ex) : paintName(im.paint))} ›</span></button>` : ''}<p>${esc(p)}</p></section>`; }).join('')}
      ${(x.more || []).map((m, k) => { const F = [].concat((S.figs || {})['m' + k] || []), cap = m.cap || [];
        return `<section class="rdm${F.length ? ' hf' : ''}"><h4>${esc(m.h)}</h4>${F.length ? `<div class="rdfigs n${F.length}">${F.map((f, j) => figHtml(f, cap[j])).join('')}</div>` : ''}${m.p.map(p => `<p>${esc(p)}</p>`).join('')}</section>`; }).join('')}
      ${x.tl && x.tl.length ? `<section class="rdtl"><h4>${esc(u('tlH'))}</h4><ol>${x.tl.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol></section>` : ''}
      <section class="rdq"><h4>${esc(u('quiz'))}</h4><div class="rdqs"></div></section>
      <div class="rdlinks"><h4>${esc(u('links'))}</h4><div>${S.links.map(linkHtml).join('')}${pickHtml(S)}</div></div>
      ${S.refs ? `<section class="rdref"><h4>${esc(u('refH'))}</h4><ul>${S.refs.map(r => `<li><bdi>${esc(r)}</bdi></li>`).join('')}</ul></section>` : ''}
      <nav class="rdnav">${i > 0 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i - 1].id}">‹ ${esc(st(STORIES[i - 1].id).title)}</button>` : '<span></span>'}${i < STORIES.length - 1 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i + 1].id}">${esc(st(STORIES[i + 1].id).title)} ›</button>` : ''}</nav>
    </article>`;
    host.querySelector('.rdback').onclick = () => { shelf(); top(); if (ctx.hist) ctx.hist({ room: 'read' }); };
    host.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { story(b.dataset.go, true); top(); });
    wire(host.querySelector('.rda'));
    quiz(S);
    if (user) top();
  }
  const top = () => { const r = host.getBoundingClientRect(), y = r.top + scrollY - (innerWidth < 820 ? 70 : 90); if (Math.abs(scrollY - y) > 40 && scrollY > y) scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); };

  /* ---------- the quiz: three questions, the answers shuffled; all right → a stamp ---------- */
  function quiz(S) {
    const Q = st(S.id).quiz || [], box = host.querySelector('.rdqs');
    qs = { S, i: 0, miss: 0, order: Q.map(q => shuffle([1, 2, 3, 4].slice(0, q.length - 1))) };
    const show = () => {
      if (qs.i >= Q.length) {
        const ok = !qs.miss, had = !!stamps()[S.id]; if (ok) setStamp(S.id);
        box.innerHTML = `<div class="rdend ${ok ? 'ok' : ''}">${ok ? `<span class="rdstamp on big${ga(S.cover)}" style="--c:${S.color}"><img src="${src(S.cover)}" alt=""><i>✓</i></span>` : ''}<p><b>${esc(ok ? (had ? u('again') : u('got')) : fmt(u('missed'), { n: qs.miss }))}</b>${esc(ok ? u('gotSub') : u('retrySub'))}</p>
          <button type="button" class="btn ${ok ? 'ghost' : 'sun'} sm" data-k="retry">${esc(u('retry'))}</button></div>`;
        box.querySelector('[data-k="retry"]').onclick = () => quiz(S);
        if (ok && !had && ctx.confetti) try { ctx.confetti(40); } catch (e) {}
        return;
      }
      const q = Q[qs.i], ord = qs.order[qs.i];
      box.innerHTML = `<p class="rdqn">${esc(fmt(u('qn'), { n: qs.i + 1, of: Q.length }))}</p><p class="rdqq">${esc(q[0])}</p>
        <div class="rdqa">${ord.map(k => `<button type="button" data-a="${k}">${esc(q[k])}</button>`).join('')}</div><p class="rdqf" aria-live="polite"></p>`;
      box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        if (box.dataset.lock) return; const right = +b.dataset.a === 1; box.dataset.lock = 1;
        b.classList.add(right ? 'ok' : 'ng'); if (!right) { qs.miss++; box.querySelector('[data-a="1"]').classList.add('ok'); }
        box.querySelector('.rdqf').textContent = right ? u('right') : u('wrong');
        setTimeout(() => { delete box.dataset.lock; qs.i++; show(); }, right ? 900 : 1700);
      });
    };
    show();
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function render(box, c) {
    ctx = c; lang = T()[c.lang] ? c.lang : 'en'; MK(Object.keys(stamps()).filter(k => STORIES.some(s => s.id === k)));
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('read', STORIES.map(s => ({ id: s.id, img: src(s.cover), t: st(s.id).title })));
    if (host !== box) { host = box; cur = null; }
    if (cur) story(cur.id, false); else shelf();
  }
  window.AtlasRead = { render, STORIES, V, open: id => story(id, true), show: id => { story(id, false); top(); }, showShelf: () => { shelf(); top(); }, current: () => (host && host.querySelector('.rda') && cur ? cur.id : null), _stamps: stamps };
})();
