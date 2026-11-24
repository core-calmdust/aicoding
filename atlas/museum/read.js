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
    { id: 'ur', color: '#2f5f9e', cover: { ex: 'ur' }, mins: 3, figs: { m0: { ex: 'ur' }, m1: [{ svg: 'urBoard' }, { svg: 'tetraOdds' }] }, refs: ['British Museum, “The Royal Game of Ur” (ME 120834) and tablet BM 33333B', 'I. L. Finkel, “On the Rules for the Royal Game of Ur”, in Ancient Board Games in Perspective (British Museum Press, 2007)', 'C. L. Woolley, Ur Excavations II: The Royal Cemetery (1934)'], sec: [null, null, null, null, null], links: [{ g: 'ur' }, { ex: 'ur' }] },
    { id: 'liubo', color: '#8a3a26', cover: { paint: 'liubo' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'tlv' }, m1: { paint: 'liubo' }, m2: { ex: 'liubo' } }, refs: ['『楚辞』「招魂」 (Chu Ci, “Zhao Hun”)', '連雲港市博物館ほか編『尹湾漢墓簡牘』（中華書局, 1997）', 'Hunan Museum, the liubo set from Mawangdui tomb 3', 'Zhu Fenghan on liubo and the Haihun slips (Archaeology, archaeology.org)'], links: [{ ex: 'liubo' }, { paint: 'liubo' }] },
    { id: 'zeno', color: '#5b4a2e', cover: { ex: 'pyrgus' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'tabula' }, m1: { ex: 'pyrgus' } }, refs: ['Agathias, epigram in the Greek Anthology 9.482', 'L. Becq de Fouquières, Les jeux des anciens (1869)', 'R. G. Austin, “Zeno’s Game of τάβλη”, Journal of Hellenic Studies 54 (1934)', 'Suetonius, Life of Claudius 33', 'LVR-LandesMuseum Bonn, the Vettweiß-Froitzheim dice tower'], links: [{ g: 'backgammon' }, { ex: 'pyrgus' }, { room: 'chance' }] },
    { id: 'sugoroku', color: '#7a2e3a', cover: { ex: 'sugoroku' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { ex: 'sugoroku' }, m1: { svg: 'bansugo' }, m2: { paint: 'sugoroku' } }, refs: ['『日本書紀』持統天皇三年十二月条', '養老律令「僧尼令」', '『平家物語』巻一「願立」', '宮内庁正倉院事務所「木画紫檀双六局」', '増川宏一『盤上遊戯』（ものと人間の文化史, 法政大学出版局, 1978）'], links: [{ ex: 'sugoroku' }, { paint: 'sugoroku' }, { g: 'backgammon' }] },
    { id: 'queen', color: '#2a3a52', cover: { paint: 'shahnama' }, mins: 3, sec: [null, { ex: 'nishapur' }, null, null, null], figs: { m0: { svg: 'queenMoves' }, m1: { paint: 'liberale' }, m2: { ex: 'lewis' } }, refs: ['Francesc de Castellví, Narcís Vinyoles, Bernat Fenollar, Scachs d’amor (c. 1475)', 'Luis Ramírez de Lucena, Repetición de amores y arte de ajedrez (1497)', 'Pedro Damiano, Questo libro e da imparare giocare a scachi (1512)', 'H. J. R. Murray, A History of Chess (1913)', 'Marilyn Yalom, Birth of the Chess Queen (2004)'], links: [{ g: 'chess' }, { ex: 'lewis' }, { ex: 'nishapur' }, { paint: 'liberale' }] },
    // (2026-11-24: four more)
    { id: 'senet', color: '#7a5a1e', cover: { ex: 'senet' }, mins: 3, sec: [null, null, { paint: 'nefertari' }, null, null], figs: { m0: { svg: 'senet' }, m2: { ex: 'senet' } }, refs: ['The Metropolitan Museum of Art, “Ancient Egyptian board games” (Heilbrunn Timeline)', 'P. A. Piccione, “In Search of the Meaning of Senet”, Archaeology 33 (1980)', 'T. Kendall, Passing Through the Netherworld: The Meaning and Play of Senet (1978)', 'Griffith Institute, Tutankhamun: Anatomy of an Excavation (Carter objects 345, 393, 580, 585)'], links: [{ g: 'senet' }, { ex: 'senet' }, { paint: 'nefertari' }] },
    { id: 'lewis', color: '#3e4a5c', cover: { ex: 'lewis' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: [{ ex: 'lewis' }, { svg: 'lewisCount' }] }, refs: ['British Museum, “The Lewis Chessmen” (1831,1101.78–159)', 'National Museums Scotland, the Lewis chessmen', 'J. Robinson, The Lewis Chessmen (British Museum Press, 2004)', 'D. H. Caldwell, M. A. Hall, C. M. Wilkinson, “The Lewis Hoard of Gaming Pieces”, Medieval Archaeology 53 (2009)', 'Sotheby’s, 2 July 2019, lot: a Lewis chessman warder'], links: [{ ex: 'lewis' }, { g: 'chess' }, { room: 'paint' }] },
    { id: 'tafl', color: '#2f4f3a', cover: { ex: 'ballinderry' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'brandubh' }, m1: { svg: 'tablut' }, m2: { ex: 'lewis' } }, refs: ['Carl Linnaeus, Iter Lapponicum (1732)', 'J. E. Smith (tr.), Lachesis Lapponica, or a Tour in Lapland (1811)', 'H. J. R. Murray, A History of Chess (1913)', 'H. O’N. Hencken, “Ballinderry Crannog No. 1”, Proceedings of the Royal Irish Academy 43 C (1936)', 'Corpus Christi College, Oxford, MS 122 (Alea Evangelii)', 'National Museum of Ireland, the Ballinderry gaming board'], links: [{ g: 'tafl' }, { ex: 'ballinderry' }] },
    { id: 'goose', color: '#5a6e2a', cover: { ex: 'goose' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'gooseSpiral' }, m1: { svg: 'gooseNine' } }, refs: ['Stationers’ Register, London, 1597 (entry by John Wolfe)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'David Parlett, The Oxford History of Board Games (1999)', 'Adrian Seville, The Cultural Legacy of the Royal Game of the Goose (Amsterdam University Press, 2019)', 'The Metropolitan Museum of Art, double-sided game board (the Game of the Goose and chess)'], links: [{ ex: 'goose' }, { room: 'chance' }, { g: 'backgammon' }] },
    { id: 'shogi', color: '#6b4a24', cover: { ex: 'kofukuji' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'shogiPieces' }, m1: { svg: 'shogiSizes' }, m2: { paint: 'shogi' } }, refs: ['『二中歴』（鎌倉時代初め / early Kamakura period）', 'Nara Prefectural Kashihara Archaeological Institute, excavation of the former Kōfukuji precinct (1993)', '増川宏一『将棋』（ものと人間の文化史, 法政大学出版局, 1977） / Masukawa Kōichi, Shōgi', '伊藤看寿『将棋図巧』(1755) / Itō Kanju, Shōgi Zukō', 'H. J. R. Murray, A History of Chess (1913)', 'The Metropolitan Museum of Art, Suzuki Harunobu, JP2773'], links: [{ g: 'shogi' }, { ex: 'kofukuji' }, { paint: 'shogi' }] },
    { id: 'pachisi', color: '#a0482a', cover: { paint: 'chaupar' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'pachisiBoard' }, m1: { svg: 'cowrieOdds' } }, refs: ['Stewart Culin, Chess and Playing-Cards (1898)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'R. C. Bell, Board and Table Games from Many Civilizations (1960)', 'Irving Finkel, “Round and Round the Houses: The Game of Pachisi”, in Asian Games: The Art of Contest (2004)', 'The Metropolitan Museum of Art, Shiva and Parvati Playing Chaupar (1694–95), 57.185.2'], links: [{ g: 'ludo' }, { paint: 'chaupar' }, { room: 'chance' }] },
    { id: 'go', color: '#33404a', cover: { ex: 'shosoin' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'goLiberty' }, m1: { svg: 'goGrid' }, m2: { paint: 'weiqi' } }, refs: ['『孟子』告子上 / Mencius, Gaozi I', '宮内庁正倉院事務所「木画紫檀棊局」 / Shōsōin, go board of sandalwood with marquetry', 'Peter Shotwell, Go! More Than a Game (2003)', '川端康成『名人』(1954) / Kawabata Yasunari, The Master of Go', 'D. Silver et al., “Mastering the game of Go with deep neural networks and tree search”, Nature 529 (2016)', 'J. Tromp, “The number of legal Go positions” (2016)', 'The Metropolitan Museum of Art, carved lacquer dish with immortals playing weiqi (Xuande period)'], links: [{ g: 'go' }, { ex: 'shosoin' }, { ex: 'sugoroku' }] },
    { id: 'draughts', color: '#7a2a2a', cover: { g: 'checkers', s: 'draughts' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'alquerqueBoard' }, m1: { svg: 'draughtsJump' } }, refs: ['Alfonso X, Libro de los juegos (1283)', 'Antonio de Torquemada, El ingenio, o juego de marro, de punta o damas (1547)', 'H. J. R. Murray, A History of Board-Games Other Than Chess (1952)', 'Arie van der Stoep, A History of Draughts (1984)', 'Jonathan Schaeffer, One Jump Ahead: Challenging Human Supremacy in Checkers (1997)', 'J. Schaeffer et al., “Checkers Is Solved”, Science 317 (2007)'], links: [{ g: 'checkers' }, { g: 'alquerque' }, { paint: 'shahnama' }] },
    { id: 'reversi', color: '#23603e', cover: { g: 'reversi', s: 'reversi' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'reversiFlip' }, m1: { svg: 'reversiStart' } }, refs: ['David Parlett, The Oxford History of Board Games (1999)', 'Michael Buro, “The Othello Match of the Year: Takeshi Murakami vs. Logistello”, ICCA Journal 20 (1997)', 'World Othello Federation, World Othello Championship results (1977–)', 'Hiroki Takizawa, “Othello is Solved”, arXiv (2023)'], links: [{ g: 'reversi' }] },
    { id: 'mancala', color: '#8a6a2a', cover: { g: 'mancala', s: 'mancala' }, mins: 3, sec: [null, null, null, null, null], figs: { m0: { svg: 'sowing' }, m1: { svg: 'mancalaRows' } }, refs: ['Thomas Hyde, De Ludis Orientalibus (1694)', 'Edward William Lane, An Account of the Manners and Customs of the Modern Egyptians (1836)', 'Alex de Voogt, Mancala Board Games (British Museum Press, 1997)', 'Laurence Russ, The Complete Mancala Games Book (2000)', 'G. Irving, H. H. L. M. Donkers, J. W. H. M. Uiterwijk, “Solving Kalah”, ICGA Journal 23 (2000)'], links: [{ g: 'mancala' }, { room: 'map' }] },
    { id: 'morris', color: '#5a4632', cover: { g: 'morris', s: 'morris' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'morris' }, { room: 'map' }] },
    { id: 'patolli', color: '#8a3a2a', cover: { g: 'patolli', s: 'patolli' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'patolli' }, { g: 'ludo' }, { paint: 'chaupar' }] },
    { id: 'xiangqi', color: '#8a1e1e', cover: { g: 'xiangqi', s: 'xiangqi' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'xiangqi' }, { g: 'janggi' }, { g: 'chess' }] },
    { id: 'backgammon', color: '#5c2f1f', cover: { g: 'backgammon', s: 'backgammon' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'backgammon' }, { paint: 'webb' }, { ex: 'pyrgus' }] },
    { id: 'hex', color: '#2e4a6e', cover: { g: 'hex', s: 'hex' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'hex' }, { g: 'gomoku' }] },
    { id: 'foxgeese', color: '#7a4a1e', cover: { g: 'foxgeese', s: 'foxgeese' }, mins: 3, sec: [null, null, null, null, null], links: [{ g: 'foxgeese' }, { g: 'peg' }, { g: 'tafl' }] },
  ];
  const src = p => p.s ? `../images/atlas/museum-story/${p.s}.webp?v=1` : p.g ? `../images/atlas/${p.g}.webp` : p.ex ? `../images/atlas/ex/${p.ex}.webp` : `../images/atlas/paint/${p.paint}-t.webp?v=1`;
  const ga = p => p && p.g && !p.s ? ' ga' : '';   // (a cover from the game's own art: a transparent icon, shown whole on the story's colour)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let host = null, ctx = null, lang = 'ja', cur = null, qs = null;
  const T = () => window.MUSEUM_READ_T || {};
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const st = id => tx()[id] || (T().en || {})[id] || {};
  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
  const stamps = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } };
  const MK = ids => { try { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark('read', ids, STORIES.length); } catch (e) {} };   // (館内スタンプ帳)
  const setStamp = id => { const s = stamps(); s[id] = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} MK(id); };
  const nm = (k, id) => (tx()[k] || {})[id] || ((T().en || {})[k] || {})[id] || id;
  const exName = id => nm('ex', id), paintName = id => nm('paint', id);
  const gName = id => { const g = ((ctx && ctx.games) || []).find(q => q.id === id); return g && ctx.gname ? ctx.gname(g) : id; };
  // a painting: open the paintings room, then the work in its viewer
  function openPaint(id) { if (!ctx.goRoom) return; ctx.goRoom('paint'); let n = 0; const t = () => { if (window.AtlasPaint && document.querySelector('.muroom[data-r="paint"] .ptc')) AtlasPaint.open(id); else if (++n < 100) setTimeout(t, 100); }; t(); }
  function linkHtml(L) {
    if (L.g) { const g = (ctx.games || []).find(q => q.id === L.g); return g ? `<button type="button" class="chlk" data-g="${L.g}"><i>${esc(u('game'))}</i>${esc(ctx.gname ? ctx.gname(g) : L.g)}</button>` : ''; }
    if (L.ex) return `<button type="button" class="chlk ex" data-ex="${L.ex}"><i>${esc(u('exhibit'))}</i>${esc(exName(L.ex))}</button>`;
    if (L.paint) return `<button type="button" class="chlk pt" data-paint="${L.paint}"><i>${esc(u('art'))}</i>${esc(paintName(L.paint))}</button>`;
    return `<button type="button" class="chlk rm" data-room="${L.room}"><i>${esc(u('room'))}</i>${esc(u('room_' + L.room))}</button>`;
  }
  /* ---------- (2026-11-24 ユーザー: 画像なども使って読みやすく) figures inside an article: a museum piece, a painting, a story picture,
     or a diagram drawn here (svg) — each with its caption from the language's more[k].cap ---------- */
  const DIAG = {
    // the twenty squares, the five rosettes, and one player's road (1 → 14) as the reconstructed rules run it
    urBoard: () => { const C = 46, X0 = 12, Y0 = 12, ex = (r, c) => r === 1 || c < 4 || c > 5, ros = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
      const road = [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 7], [2, 6]], cx = c => X0 + c * C + C / 2, cy = r => Y0 + r * C + C / 2;
      let g = '';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (ex(r, c)) { const R = ros.some(([a, b]) => a === r && b === c);
        g += `<rect x="${X0 + c * C + 1.5}" y="${Y0 + r * C + 1.5}" width="${C - 3}" height="${C - 3}" rx="6" fill="${R ? '#f4e2b8' : '#fbf6ea'}" stroke="#2f4a6e" stroke-width="2"/>`;
        if (R) { let f = ''; for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; f += `<ellipse cx="${cx(c) + Math.cos(t) * 9}" cy="${cy(r) + Math.sin(t) * 9}" rx="7" ry="3.6" transform="rotate(${k * 45} ${cx(c) + Math.cos(t) * 9} ${cy(r) + Math.sin(t) * 9})" fill="#c0503a"/>`; } g += f + `<circle cx="${cx(c)}" cy="${cy(r)}" r="4.5" fill="#2f4a6e"/>`; } }
      g += `<defs><marker id="urA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#2f7d4a"/></marker></defs><polyline points="${road.map(([r, c]) => cx(c) + ',' + cy(r)).join(' ')}" fill="none" stroke="#2f7d4a" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" opacity=".7" marker-end="url(#urA)"/>`;
      g += road.map(([r, c], i) => `<circle cx="${X0 + c * C + 12}" cy="${Y0 + r * C + 12}" r="9" fill="#2f7d4a" stroke="#fff" stroke-width="1.5"/><text x="${X0 + c * C + 12}" y="${Y0 + r * C + 16.2}" font-size="11.5" font-weight="800" fill="#fff" text-anchor="middle">${i + 1}</text>`).join('');
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
        g += sp ? `<text x="${x + C / 2}" y="${y + C / 2 + 5}" font-size="${n === 26 ? 15 : 13}" font-weight="800" fill="#5a3a12" text-anchor="middle">${mark[n]}</text>` : `<text x="${x + 5}" y="${y + 12}" font-size="9" fill="#9a8460">${n}</text>`; }
      const pts = []; for (let n = 1; n <= 30; n++) { const [x, y] = pos(n); pts.push((x + C / 2) + ',' + (y + C / 2 + (n >= 26 || n === 15 ? 10 : 6))); }
      g += `<defs><marker id="snA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#b0402a"/></marker></defs><polyline points="${pts.slice(0, 26).join(' ')}" fill="none" stroke="#b0402a" stroke-width="2.5" stroke-linejoin="round" opacity=".6" marker-end="url(#snA)"/>`;
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // the Lewis chessmen by kind (kings, queens, bishops, knights, warders, pawns), with the chess letters as labels
    lewisCount: () => { const n = [['K', 8], ['Q', 8], ['B', 16], ['N', 15], ['R', 12], ['P', 19]], W = 320, H = 150, bw = 36, gap = (W - 30 - bw * 6) / 5; let g = '';
      n.forEach(([k, v], i) => { const x = 15 + i * (bw + gap), h = v / 19 * 96, y = 112 - h;
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="#3e4a5c"/><text x="${x + bw / 2}" y="${y - 6}" font-size="13" font-weight="800" fill="#2b2a28" text-anchor="middle">${v}</text><text x="${x + bw / 2}" y="134" font-size="20" fill="#2b2a28" text-anchor="middle">${'♔♕♗♘♖♙'[i]}</text>`; });
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
        g += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${C - 3}" height="${C - 3}" rx="4" fill="${col(n)}"${n === 63 ? ' stroke="#fff3cf" stroke-width="2"' : ''}/><text x="${x + C / 2}" y="${y + C / 2 + 4.5}" font-size="${n === 63 ? 14 : 12}" font-weight="800" fill="${n === 63 ? '#fff' : '#2b2a1c'}" text-anchor="middle">${n}</text>`; });
      return `<svg viewBox="0 0 ${W} ${H}" role="img" style="font-family:inherit">${g}</svg>`; },
    // why the first throw of 9 is special: geese every 9 squares (in steps of 4 and 5), so a 9 would chain straight to 63
    gooseNine: () => { const W = 340, H = 120, x0 = 14, sx = (W - 28) / 63, y = 78, X = n => x0 + n * sx; let g = `<line x1="${X(0)}" y1="${y}" x2="${X(63)}" y2="${y}" stroke="#8a7a5a" stroke-width="2"/>`;
      const gz = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59];
      for (let n = 0; n <= 63; n++) if (n % 9 === 0 || n === 63) g += `<text x="${X(n)}" y="${y + 24}" font-size="12" font-weight="800" fill="#2b2a28" text-anchor="middle">${n}</text>`;
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
      v.forEach(([n, p, f], i) => { const y = o + 14 + i * 40, lx = o + B + 18; g += `<rect x="${lx}" y="${y - 12}" width="18" height="18" rx="3" fill="${f}" stroke="#5a3c1c" stroke-width="1.2"/><text x="${lx + 26}" y="${y + 2}" font-size="14" font-weight="800" fill="#2b2a28">${n}×${n}</text><text x="${lx + 26}" y="${y + 19}" font-size="12" fill="#5a4430">${p}</text>`; });
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
        g += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${hi ? '#a0482a' : '#d8a68a'}"/><text x="${x + bw / 2}" y="${y - 5}" font-size="11" font-weight="700" fill="#2b2a28" text-anchor="middle">${v}/64</text>`;
        g += `<text x="${x + bw / 2}" y="124" font-size="12" fill="#5a4a3a" text-anchor="middle">${i}</text><rect x="${x + 1}" y="134" width="${bw - 2}" height="24" rx="5" fill="${hi ? '#a0482a' : '#f2e3c6'}"/><text x="${x + bw / 2}" y="151" font-size="14" font-weight="800" fill="${hi ? '#fff' : '#3a2a1a'}" text-anchor="middle">${sc[i]}</text>`; });
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
    el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => ctx.goEx && ctx.goEx(b.dataset.ex));
    el.querySelectorAll('[data-paint]').forEach(b => b.onclick = () => openPaint(b.dataset.paint));
    el.querySelectorAll('[data-room]').forEach(b => b.onclick = () => ctx.goRoom && ctx.goRoom(b.dataset.room));
  }

  /* ---------- the shelf: the stamp card and the stories ---------- */
  function shelf() {
    cur = null; const S = stamps(), n = STORIES.filter(s => S[s.id]).length;
    host.innerHTML = `<div class="rdx"><p class="chlead">${esc(fmt(u('lead'), { n: STORIES.length }))}</p>
      <div class="rdlist">${STORIES.map((s, i) => { const x = st(s.id);
        return `<button type="button" class="rdc" data-s="${s.id}" style="--c:${s.color}"><span class="rdci${ga(s.cover)}"><img src="${src(s.cover)}" alt="" loading="lazy"></span>
          <span class="rdct2"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(s) }))}${S[s.id] ? ` · <b class="rdok">✓ ${esc(u('stamped'))}</b>` : ''}</em><b>${esc(x.title)}</b><small>${esc(x.lead)}</small></span></button>`; }).join('')}</div></div>`;
    host.querySelectorAll('[data-s]').forEach(b => b.onclick = () => story(b.dataset.s, true));
    if (window.AtlasMuseum && AtlasMuseum.pager) AtlasMuseum.pager(host.querySelector('.rdlist'), 'read', { rows: { pc: 3, phone: 6 } });
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
    host.innerHTML = `<article class="rda" style="--c:${S.color}">
      <button type="button" class="btn ghost sm rdback">← ${esc(u('back'))}</button>
      <div class="rdh"><button type="button" class="rdhimg${ga(S.cover)}" ${S.cover.g ? `data-g="${S.cover.g}"` : S.cover.ex ? `data-ex="${S.cover.ex}"` : `data-paint="${S.cover.paint}"`}><img src="${src(S.cover)}" alt=""><span>${esc(S.cover.g ? u('game') : S.cover.ex ? u('exhibit') : u('art'))} · ${esc(S.cover.g ? gName(S.cover.g) : S.cover.ex ? exName(S.cover.ex) : paintName(S.cover.paint))} ›</span></button>
        <div class="rdht"><em>${esc(fmt(u('no'), { n: i + 1 }))} · ${esc(fmt(u('mins'), { n: mins(S) }))}</em><h3>${esc(x.title)}</h3><p>${esc(x.lead)}</p></div></div>
      ${x.kf && x.kf.length ? `<aside class="rdkf"><h4>${esc(u('kfH'))}</h4><ul>${x.kf.map(k => `<li>${esc(k)}</li>`).join('')}</ul></aside>` : ''}
      ${(x.s || []).map((p, k) => { const im = S.sec[k], flip = im && S.sec.slice(0, k).filter(Boolean).length % 2;
        return `<section class="rds${im ? '' : ' np'}${flip ? ' fl' : ''}">${im ? `<button type="button" class="rdimg" ${im.ex ? `data-ex="${im.ex}"` : `data-paint="${im.paint}"`} aria-label="${esc(im.ex ? exName(im.ex) : paintName(im.paint))}"><img src="${src(im)}" alt="" loading="lazy"><span>${esc(im.ex ? exName(im.ex) : paintName(im.paint))} ›</span></button>` : ''}<p>${esc(p)}</p></section>`; }).join('')}
      ${(x.more || []).map((m, k) => { const F = [].concat((S.figs || {})['m' + k] || []), cap = m.cap || [];
        return `<section class="rdm${F.length ? ' hf' : ''}"><h4>${esc(m.h)}</h4>${F.length ? `<div class="rdfigs n${F.length}">${F.map((f, j) => figHtml(f, cap[j])).join('')}</div>` : ''}${m.p.map(p => `<p>${esc(p)}</p>`).join('')}</section>`; }).join('')}
      ${x.tl && x.tl.length ? `<section class="rdtl"><h4>${esc(u('tlH'))}</h4><ol>${x.tl.map(([y, t]) => `<li><b>${esc(y)}</b><span>${esc(t)}</span></li>`).join('')}</ol></section>` : ''}
      <section class="rdq"><h4>${esc(u('quiz'))}</h4><div class="rdqs"></div></section>
      <div class="rdlinks"><h4>${esc(u('links'))}</h4><div>${S.links.map(linkHtml).join('')}</div></div>
      ${S.refs ? `<section class="rdref"><h4>${esc(u('refH'))}</h4><ul>${S.refs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>` : ''}
      <nav class="rdnav">${i > 0 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i - 1].id}">‹ ${esc(st(STORIES[i - 1].id).title)}</button>` : '<span></span>'}${i < STORIES.length - 1 ? `<button type="button" class="btn ghost sm" data-go="${STORIES[i + 1].id}">${esc(st(STORIES[i + 1].id).title)} ›</button>` : ''}</nav>
    </article>`;
    host.querySelector('.rdback').onclick = () => { shelf(); top(); };
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
  window.AtlasRead = { render, STORIES, V, open: id => story(id, true), _stamps: stamps };
})();
