/* World Board Game Atlas — 博物館の「系統樹」 (family tree room, 2026-11-21).
   Every game of the Atlas — and the lost or uncollected games between them (チャトランガ, パチーシ, ハルマ …) — on one time line,
   one lane per family. Lines join a game to the games it came from: solid = an accepted line of descent, dashed = a theory,
   an influence or a shared board. Tapping a node lights its whole lineage and opens its card (遊ぶ / ヒストリア for the Atlas's games).
   Facts follow each game's Historia (atlas/historia/<lang>/<id>.json, origin chapter) plus a few checked sources for the
   uncollected games (Murray, Parlett, The World of Playing Cards …). Texts: museum/tree-<lang>.js (MUSEUM_TREE_T[lang]);
   ja and en are always loaded, the page language on top.
   Layout: x = a piecewise time scale (ancient centuries narrow, the busy 19th–20th centuries wide), each lane packs its nodes
   into as few rows as fit. Native scrolling (both axes) with the ruler stuck on top and the lane names stuck at the start;
   a mouse can also drag the canvas. */
(function () {
  'use strict';
  const V = 1;
  /* ---------- the families (lanes), top to bottom ---------- */
  const FAM = [
    { k: 'race', c: '#c27a2c', i: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.4" fill="currentColor"/><circle cx="15" cy="15" r="1.4" fill="currentColor"/><circle cx="15" cy="9" r="1.4" fill="currentColor"/><circle cx="9" cy="15" r="1.4" fill="currentColor"/>' },
    { k: 'line', c: '#2f8a5a', i: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/><circle cx="16" cy="16" r="2.2"/>' },
    { k: 'hunt', c: '#3f6f8f', i: '<path d="M12 3.5l2.2 3.5H9.8z" fill="currentColor"/><circle cx="12" cy="12" r="3"/><circle cx="5" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>' },
    { k: 'war', c: '#b03a3a', i: '<path d="M9 20h6M10 20l.6-6h2.8l.6 6M8.5 9.5h7l-1.5 4.5h-4zM12 9.5V6M10.5 4.5h3"/>' },
    { k: 'jump', c: '#8e2a5c', i: '<circle cx="7" cy="16" r="3"/><circle cx="17" cy="16" r="3" fill="currentColor"/><path d="M7 11.5c1.5-5 8.5-5 10 0"/><path d="M15.5 10.2l1.6 1.4.4-2"/>' },
    { k: 'card', c: '#5b4bb5', i: '<rect x="4" y="6" width="10" height="14" rx="2" transform="rotate(-8 9 13)"/><rect x="10" y="4" width="10" height="14" rx="2" transform="rotate(8 15 11)"/>' },
    { k: 'puzzle', c: '#1f8a9a', i: '<path d="M5 9h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3H5z"/>' },
    { k: 'flick', c: '#c2446e', i: '<circle cx="9" cy="14" r="5"/><circle cx="9" cy="14" r="2"/><path d="M15 9l5-5M17 4h3v3"/>' },
  ];
  /* ---------- the nodes: [id, family, year on the axis, label, flags]
     label: { y } a year · { c } a century (negative = BC) · { c: [a, b] } centuries · { d } a decade · { k } a word (rome, edo, unk)
     modifiers: ca (circa) · early · late · by (遅くとも) · rec (…の記録) · q (?)   flags: g = an Atlas game (id = its game id), o = ORIGINAL */
  const N = [
    ['senet', 'race', -3100, { y: -3100, ca: 1 }, 'g'],
    ['ur', 'race', -2600, { y: -2600, ca: 1 }, 'g'],
    ['tabula', 'race', 100, { k: 'rome' }],
    ['nard', 'race', 550, { c: 6, ca: 1 }],
    ['mancala', 'race', 650, { c: [6, 7], ca: 1 }, 'g'],
    ['sugoroku', 'race', 689, { c: 7 }],
    ['patolli', 'race', 1520, { c: 16, rec: 1 }, 'g'],
    ['pachisi', 'race', 1570, { c: 16 }],
    ['backgammon', 'race', 1645, { y: 1645 }, 'g'],
    ['ludo', 'race', 1896, { y: 1896 }, 'g'],

    ['go', 'line', -400, { c: -4, ca: 1 }, 'g'],
    ['morris', 'line', 50, { c: 1, ca: 1 }, 'g'],
    ['gomoku', 'line', 1700, { k: 'edo' }, 'g'],
    ['annexation', 'line', 1875, { d: 1870 }],
    ['reversi', 'line', 1885, { d: 1880 }, 'g'],
    ['dots', 'line', 1889, { y: 1889 }, 'g'],
    ['hex', 'line', 1942, { y: 1942 }, 'g'],
    ['connect4', 'line', 1974, { y: 1974 }, 'g'],
    ['amazons', 'line', 1988, { y: 1988 }, 'g'],

    ['latrunculi', 'hunt', -100, { c: -1 }, 'g'],
    ['tafl', 'hunt', 350, { c: 4, ca: 1 }, 'g'],
    ['foxgeese', 'hunt', 1300, { c: 14, by: 1 }, 'g'],
    ['agon', 'hunt', 1842, { y: 1842 }, 'g'],

    ['chaturanga', 'war', 550, { c: 6, ca: 1 }],
    ['shatranj', 'war', 650, { c: 7 }],
    ['xiangqi', 'war', 760, { c: 8, ca: 1 }, 'g'],
    ['makruk', 'war', 900, { k: 'unk' }],
    ['shogi', 'war', 1050, { c: 11 }, 'g'],
    ['janggi', 'war', 1400, { c: 15 }, 'g'],
    ['chess', 'war', 1475, { c: 15, late: 1 }, 'g'],

    ['alquerque', 'jump', 950, { c: 10 }, 'g'],
    ['checkers', 'jump', 1150, { c: 12, ca: 1 }, 'g'],
    ['fanorona', 'jump', 1650, { c: 17, ca: 1, q: 1 }, 'g'],
    ['konane', 'jump', 1778, { y: 1778, rec: 1 }, 'g'],
    ['halma', 'jump', 1883, { y: 1883, ca: 1 }],
    ['sternhalma', 'jump', 1892, { y: 1892 }],
    ['ugolki', 'jump', 1910, { c: 20 }, 'g'],

    ['leaf', 'card', 868, { y: 868 }],
    ['cards', 'card', 1370, { d: 1370 }],
    ['ventiuna', 'card', 1613, { y: 1613 }],
    ['poque', 'card', 1750, { c: 18 }],
    ['solitaire', 'card', 1783, { y: 1783 }, 'g'],
    ['poker', 'card', 1829, { y: 1829, ca: 1 }, 'g'],
    ['baccarat', 'card', 1835, { c: 19 }, 'g'],
    ['blackjack', 'card', 1860, { c: 19 }, 'g'],
    ['mahjong', 'card', 1875, { d: 1870 }],
    ['shanghai', 'card', 1981, { y: 1981 }, 'g'],

    ['peg', 'puzzle', 1697, { y: 1697 }, 'g'],
    ['latin', 'puzzle', 1782, { y: 1782 }],
    ['fifteen', 'puzzle', 1875, { d: 1870 }],
    ['pennant', 'puzzle', 1909, { y: 1909 }],
    ['bulls', 'puzzle', 1920, { c: 20, ca: 1 }],
    ['hitblow', 'puzzle', 1970, { y: 1970 }, 'g'],
    ['numberplace', 'puzzle', 1979, { y: 1979 }],
    ['sudoku', 'puzzle', 1984, { y: 1984 }, 'g'],
    ['chainshot', 'puzzle', 1985, { y: 1985 }],
    ['speedsudoku', 'puzzle', 2026, { y: 2026 }, 'go'],
    ['jailbreak', 'puzzle', 2026, { y: 2026 }, 'go'],
    ['samegame', 'puzzle', 2026, { y: 2026 }, 'go'],

    ['crokinole', 'flick', 1876, { y: 1876 }, 'g'],
    ['gombfoci', 'flick', 1905, { c: 20, early: 1 }],
    ['carrom', 'flick', 1910, { c: 20, early: 1 }, 'g'],
    ['botao', 'flick', 1930, { y: 1930 }, 'g'],
    ['hockey', 'flick', 1932, { y: 1932 }, 'g'],
    ['airhockey', 'flick', 1972, { y: 1972 }],
  ];
  /* ---------- the lines: [from, to, sure] (sure 0 = a theory / an influence / a shared board: dashed) ---------- */
  const E = [
    ['tabula', 'backgammon', 1], ['nard', 'backgammon', 0], ['nard', 'sugoroku', 0], ['pachisi', 'ludo', 1],
    ['go', 'gomoku', 1], ['annexation', 'reversi', 1],
    ['latrunculi', 'tafl', 0], ['tafl', 'foxgeese', 0],
    ['chaturanga', 'shatranj', 1], ['chaturanga', 'xiangqi', 0], ['chaturanga', 'makruk', 1], ['makruk', 'shogi', 0], ['xiangqi', 'shogi', 0],
    ['xiangqi', 'janggi', 1], ['shatranj', 'chess', 1],
    ['alquerque', 'checkers', 1], ['shatranj', 'checkers', 0], ['alquerque', 'fanorona', 1], ['halma', 'sternhalma', 1], ['halma', 'ugolki', 0],
    ['leaf', 'cards', 0], ['cards', 'ventiuna', 1], ['ventiuna', 'blackjack', 1], ['cards', 'poque', 1], ['poque', 'poker', 1],
    ['cards', 'solitaire', 1], ['cards', 'baccarat', 1], ['leaf', 'mahjong', 0], ['mahjong', 'shanghai', 1],
    ['latin', 'numberplace', 0], ['numberplace', 'sudoku', 1], ['sudoku', 'speedsudoku', 1], ['fifteen', 'pennant', 0], ['pennant', 'jailbreak', 1],
    ['chainshot', 'samegame', 1], ['bulls', 'hitblow', 1],
    ['gombfoci', 'botao', 0], ['hockey', 'airhockey', 1],
  ];
  /* ---------- the time scale: [from year, to year, px at zoom 1] ---------- */
  const SEG = [[-3300, -1000, 250], [-1000, 500, 420], [500, 1500, 760], [1500, 1850, 760], [1850, 1950, 600], [1950, 2040, 360]];
  const ERAS = [['anc', -3300, 500], ['med', 500, 1500], ['early', 1500, 1800], ['mod', 1800, 1945], ['cont', 1945, 2040]];
  const TICKS = [-3000, -2000, -1000, -500, 1, 500, 1000, 1200, 1400, 1600, 1700, 1800, 1850, 1900, 1950, 2000];

  /* ---------- year labels in 14 languages ---------- */
  const ROM = n => { const r = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, c] of r) while (n >= v) { s += c; n -= v; } return s; };
  const enOrd = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
  const hiOrd = n => ({ 1: 'पहली', 2: 'दूसरी', 3: 'तीसरी', 4: 'चौथी', 6: 'छठी' }[n] || n + 'वीं');
  const AR = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون'];
  const YF = {
    ja: { y: n => n + '年', bc: n => '紀元前' + n + '年', c: n => n + '世紀', bcc: n => '紀元前' + n + '世紀', cr: (a, b) => a + '〜' + b + '世紀', d: n => n + '年代', ca: x => x + '頃', early: x => x + '初め', late: x => x + '末', by: x => '遅くとも' + x, rec: x => x + 'の記録', tick: n => n < 0 ? '前' + -n : String(n) },
    en: { y: n => String(n), bc: n => n + ' BC', c: n => enOrd(n) + ' c.', bcc: n => enOrd(n) + ' c. BC', cr: (a, b) => enOrd(a) + '–' + enOrd(b) + ' c.', d: n => n + 's', ca: x => 'c. ' + x, early: x => 'early ' + x, late: x => 'late ' + x, by: x => 'by the ' + x, rec: x => 'recorded ' + x, tick: n => n < 0 ? -n + ' BC' : String(n) },
    zh: { y: n => n + '年', bc: n => '公元前' + n + '年', c: n => n + '世纪', bcc: n => '公元前' + n + '世纪', cr: (a, b) => a + '～' + b + '世纪', d: n => n + '年代', ca: x => '约' + x, early: x => x + '初', late: x => x + '末', by: x => '最迟' + x, rec: x => x + '的记载', tick: n => n < 0 ? '前' + -n : String(n) },
    'zh-TW': { y: n => n + '年', bc: n => '西元前' + n + '年', c: n => n + '世紀', bcc: n => '西元前' + n + '世紀', cr: (a, b) => a + '～' + b + '世紀', d: n => n + '年代', ca: x => '約' + x, early: x => x + '初', late: x => x + '末', by: x => '最遲' + x, rec: x => x + '的記載', tick: n => n < 0 ? '前' + -n : String(n) },
    ko: { y: n => n + '년', bc: n => '기원전 ' + n + '년', c: n => n + '세기', bcc: n => '기원전 ' + n + '세기', cr: (a, b) => a + '~' + b + '세기', d: n => n + '년대', ca: x => x + '경', early: x => x + ' 초', late: x => x + ' 말', by: x => '늦어도 ' + x, rec: x => x + ' 기록', tick: n => n < 0 ? '전' + -n : String(n) },
    es: { y: n => String(n), bc: n => n + ' a. C.', c: n => 'siglo ' + ROM(n), bcc: n => 'siglo ' + ROM(n) + ' a. C.', cr: (a, b) => 'siglos ' + ROM(a) + '–' + ROM(b), d: n => 'década de ' + n, ca: x => 'h. ' + x, early: x => 'inicios del ' + x, late: x => 'fines del ' + x, by: x => 'antes del ' + x, rec: x => 'registro del ' + x, tick: n => n < 0 ? -n + ' a. C.' : String(n) },
    fr: { y: n => String(n), bc: n => n + ' av. J.-C.', c: n => ROM(n) + (n === 1 ? 'er' : 'e') + ' s.', bcc: n => ROM(n) + (n === 1 ? 'er' : 'e') + ' s. av. J.-C.', cr: (a, b) => ROM(a) + 'e–' + ROM(b) + 'e s.', d: n => 'années ' + n, ca: x => 'v. ' + x, early: x => 'début ' + x, late: x => 'fin ' + x, by: x => 'dès le ' + x, rec: x => 'attesté ' + x, tick: n => n < 0 ? -n + ' av. J.-C.' : String(n) },
    pt: { y: n => String(n), bc: n => n + ' a.C.', c: n => 'séc. ' + ROM(n), bcc: n => 'séc. ' + ROM(n) + ' a.C.', cr: (a, b) => 'séc. ' + ROM(a) + '–' + ROM(b), d: n => 'década de ' + n, ca: x => 'c. ' + x, early: x => 'início do ' + x, late: x => 'fim do ' + x, by: x => 'até o ' + x, rec: x => 'registro do ' + x, tick: n => n < 0 ? -n + ' a.C.' : String(n) },
    de: { y: n => String(n), bc: n => n + ' v. Chr.', c: n => n + '. Jh.', bcc: n => n + '. Jh. v. Chr.', cr: (a, b) => a + '.–' + b + '. Jh.', d: n => n + 'er', ca: x => 'um ' + x, early: x => 'frühes ' + x, late: x => 'spätes ' + x, by: x => 'spätestens ' + x, rec: x => 'belegt ' + x, tick: n => n < 0 ? -n + ' v. Chr.' : String(n) },
    ru: { y: n => n + ' г.', bc: n => n + ' г. до н. э.', c: n => ROM(n) + ' в.', bcc: n => ROM(n) + ' в. до н. э.', cr: (a, b) => ROM(a) + '–' + ROM(b) + ' вв.', d: n => n + '-е', ca: x => 'ок. ' + x, early: x => 'нач. ' + x, late: x => 'кон. ' + x, by: x => 'не позднее ' + x, rec: x => 'упом. ' + x, tick: n => n < 0 ? -n + ' до н. э.' : String(n) },
    tr: { y: n => String(n), bc: n => 'MÖ ' + n, c: n => n + '. yy.', bcc: n => 'MÖ ' + n + '. yy.', cr: (a, b) => a + '–' + b + '. yy.', d: n => n + "'ler", ca: x => x + ' civarı', early: x => x + ' başı', late: x => x + ' sonu', by: x => 'en geç ' + x, rec: x => x + ' kaydı', tick: n => n < 0 ? 'MÖ ' + -n : String(n) },
    id: { y: n => String(n), bc: n => n + ' SM', c: n => 'abad ke-' + n, bcc: n => 'abad ke-' + n + ' SM', cr: (a, b) => 'abad ke-' + a + '–' + b, d: n => 'tahun ' + n + '-an', ca: x => 'sekitar ' + x, early: x => 'awal ' + x, late: x => 'akhir ' + x, by: x => 'paling lambat ' + x, rec: x => 'tercatat ' + x, tick: n => n < 0 ? -n + ' SM' : String(n) },
    hi: { y: n => String(n), bc: n => n + ' ई.पू.', c: n => hiOrd(n) + ' सदी', bcc: n => hiOrd(n) + ' सदी ई.पू.', cr: (a, b) => a + '–' + b + 'वीं सदी', d: n => n + ' का दशक', ca: x => 'लगभग ' + x, early: x => x + ' की शुरुआत', late: x => x + ' का अंत', by: x => 'कम से कम ' + x, rec: x => x + ' का उल्लेख', tick: n => n < 0 ? -n + ' ई.पू.' : String(n) },
    ar: { y: n => String(n), bc: n => n + ' ق.م', c: n => 'القرن ' + (AR[n] || n), bcc: n => 'القرن ' + (AR[n] || n) + ' ق.م', cr: (a, b) => 'القرنان ' + (AR[a] || a) + ' و' + (AR[b] || b), d: n => 'عقد ' + n, ca: x => 'نحو ' + x, early: x => 'أوائل ' + x, late: x => 'أواخر ' + x, by: x => 'منذ ' + x + ' على الأقل', rec: x => 'مُسجّل في ' + x, tick: n => n < 0 ? -n + ' ق.م' : String(n) },
  };
  function yl(L, lang) {
    const F = YF[lang] || YF.en, T = tx(lang);
    let s;
    if (L.k) s = (T.kw && T.kw[L.k]) || (tx('en').kw || {})[L.k] || '';
    else if (L.d != null) s = F.d(L.d);
    else if (Array.isArray(L.c)) s = F.cr(L.c[0], L.c[1]);
    else if (L.c != null) s = L.c < 0 ? F.bcc(-L.c) : F.c(L.c);
    else s = L.y < 0 ? F.bc(-L.y) : F.y(L.y);
    if (L.early) s = F.early(s); if (L.late) s = F.late(s); if (L.by) s = F.by(s); if (L.rec) s = F.rec(s);
    if (L.ca) s = F.ca(s); if (L.q) s += '?';
    return s;
  }

  /* ---------- texts ---------- */
  const tx = l => (window.MUSEUM_TREE_T && (MUSEUM_TREE_T[l] || MUSEUM_TREE_T.en)) || {};
  const TT = (l, k) => { const a = tx(l).ui || {}, b = tx('en').ui || {}; return a[k] != null ? a[k] : (b[k] != null ? b[k] : k); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const loaded = {};
  const load = src => loaded[src] || (loaded[src] = new Promise(res => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  const textsFor = l => Promise.all([...new Set(['ja', 'en', l])].map(x => (window.MUSEUM_TREE_T && MUSEUM_TREE_T[x]) ? 0 : load('museum/tree-' + x + '.js?v=' + V)));

  /* ---------- module state ---------- */
  let ctx = null, lang = 'ja', host = null, el = {}, sel = null, fam = 'all', zoom = 1, built = null;
  const node = id => built && built.byId[id];
  const gameOf = id => ctx.games.find(g => g.id === id);
  const nodeName = n => n.g ? ctx.gname(n.g).replace(/\s*V\d+$/, '') : ((tx(lang).n || {})[n.id] || (tx('en').n || {})[n.id] || [n.id])[0];
  const nodeTx = (n, i) => { const a = (tx(lang).n || {})[n.id], b = (tx('en').n || {})[n.id]; return (a && a[i]) || (b && b[i]) || ''; };

  const famC = k => (FAM.find(f => f.k === k) || FAM[0]).c;
  const X = y => { let x = 0; for (const [a, b, w] of SEG) { if (y >= b) { x += w; continue; } if (y > a) x += (y - a) / (b - a) * w; break; } return x * zoom; };
  const phone = () => innerWidth < 820;

  let mctx = null;
  function textW(s, px, w) { if (!mctx) mctx = document.createElement('canvas').getContext('2d'); mctx.font = `${w} ${px}px ${getComputedStyle(document.body).getPropertyValue('--font') || 'sans-serif'}`; return mctx.measureText(s).width; }

  /* ---------- layout: nodes into lanes and rows ---------- */
  function layout() {
    const P = phone(), ROW = P ? 56 : 64, NH = P ? 44 : 50, LP = P ? 8 : 12, PAD = P ? 90 : 150;
    const famList = FAM.filter(f => fam === 'all' || f.k === fam);
    const nodes = N.map(([id, f, y, L, fl = '']) => ({ id, fam: f, y, L, g: fl.includes('g') ? gameOf(id) : null, orig: fl.includes('o') }));
    const byId = {}; nodes.forEach(n => byId[n.id] = n);
    const lanes = []; let top = 0;
    famList.forEach(f => {
      const L = nodes.filter(n => n.fam === f.k).sort((a, b) => a.y - b.y);
      const rows = [];
      L.forEach(n => {
        n.label = yl(n.L, lang); n.name = nodeName(n);
        const nm = textW(n.name, P ? 13.5 : 14.5, 900), yw = textW(n.label, P ? 11.5 : 12, 700);
        n.w = Math.ceil(Math.max(nm, yw) * 1.04 + (n.g ? (P ? 52 : 58) : (P ? 30 : 34)) + 18);
        n.x = PAD + X(n.y);   // the node starts on its year
        // the first row where it fits on its year — or nudged a little later (a short slide reads better than another row)
        const SL = P ? 26 : 34; let r = rows.findIndex(end => end + 10 <= n.x);
        if (r < 0) { const k = rows.findIndex(end => end + 10 <= n.x + SL); if (k >= 0) { r = k; n.x = rows[k] + 10; } }
        if (r < 0) { r = rows.length; rows.push(0); }
        rows[r] = n.x + n.w; n.row = r;
      });
      const h = Math.max(1, rows.length) * ROW + LP * 2;
      L.forEach(n => { n.top = top + LP + n.row * ROW + (ROW - NH) / 2; n.h = NH; n.lane = f.k; });
      lanes.push({ f, top, h, n: L }); top += h;
    });
    const vis = new Set(lanes.flatMap(l => l.n.map(n => n.id)));
    const W = PAD + X(SEG[SEG.length - 1][1]) + 60;
    return { lanes, nodes: nodes.filter(n => vis.has(n.id)), byId, H: top, W, PAD, vis };
  }

  /* ---------- lineage (all ancestors and descendants of a node) ---------- */
  function lineage(id) {
    const up = new Set([id]), dn = new Set([id]);
    let ch = true; while (ch) { ch = false; E.forEach(([a, b]) => { if (up.has(b) && !up.has(a)) { up.add(a); ch = true; } }); }
    ch = true; while (ch) { ch = false; E.forEach(([a, b]) => { if (dn.has(a) && !dn.has(b)) { dn.add(b); ch = true; } }); }
    return new Set([...up, ...dn]);
  }

  /* ---------- drawing ---------- */
  function draw() {
    const B = built = layout(), P = phone();
    el.canvas.style.width = B.W + 'px'; el.canvas.style.height = B.H + 'px';
    // the era bands and the ruler (inside the scroller, stuck at its top)
    el.ruler.style.width = B.W + 'px';
    el.ruler.innerHTML = ERAS.map(([k, a, b]) => `<span class="trera e-${k}" style="left:${B.PAD + X(a)}px;width:${X(b) - X(a)}px"><b>${esc((tx(lang).era || tx('en').era || {})[k] || '')}</b></span>`).join('')
      + TICKS.map(y => `<span class="trtick" dir="auto" style="left:${B.PAD + X(y)}px">${esc((YF[lang] || YF.en).tick(y))}</span>`).join('');
    // the lane backgrounds, the lane names (stuck at the start), the grid lines of the ticks
    el.lanes.innerHTML = B.lanes.map((l, i) => `<div class="trlane${i % 2 ? ' odd' : ''}" style="top:${l.top}px;height:${l.h}px;--c:${l.f.c}"></div>`).join('')
      + TICKS.map(y => `<i class="trgrid" style="left:${B.PAD + X(y)}px"></i>`).join('');
    el.names.style.height = B.H + 'px';
    el.names.innerHTML = B.lanes.map(l => { const T = (tx(lang).fam || {})[l.f.k] || (tx('en').fam || {})[l.f.k] || [l.f.k];
      return `<div class="trname" style="top:${l.top}px;height:${l.h}px;--c:${l.f.c}"><span><i><svg viewBox="0 0 24 24" aria-hidden="true">${l.f.i}</svg></i><b dir="auto">${esc(T[0])}</b></span></div>`; }).join('');
    // the nodes
    el.nodes.innerHTML = B.nodes.map(n => {
      const c = famC(n.fam);
      return `<button type="button" class="trn${n.g ? ' g' : ' x'}${n.orig ? ' o' : ''}" data-id="${n.id}" style="left:${n.x}px;top:${n.top}px;min-width:${n.w}px;height:${n.h}px;--c:${n.g ? n.g.color : c};--f:${c}" aria-label="${esc(n.name + ' · ' + n.label)}">`
        + (n.g ? `<span class="tra">${ctx.art(n.g)}</span>` : `<span class="trd"></span>`)
        + `<span class="trt" dir="auto"><b>${esc(n.name)}</b><small>${esc(n.label)}${n.orig ? ' <em>ORIGINAL</em>' : ''}</small></span></button>`;
    }).join('');
    el.nodes.querySelectorAll('.trn').forEach(b => b.onclick = () => { if (dragged) return; select(b.dataset.id === sel ? null : b.dataset.id); });
    lines();
    chips(); legend();
    if (sel && !B.vis.has(sel)) sel = null;
    mark(); info();
  }
  function lines() {
    const B = built; let s = '';
    E.forEach(([a, b, sure]) => {
      const A = B.byId[a], C = B.byId[b]; if (!A || !C || !B.vis.has(a) || !B.vis.has(b)) return;
      const ax = A.x + A.w, ay = A.top + A.h / 2, cy = C.top + C.h / 2;
      let d;
      if (C.x >= ax + 14) { const mx = (ax + C.x) / 2; d = `M${ax} ${ay}C${mx} ${ay} ${mx} ${cy} ${C.x} ${cy}`; }
      else { const x0 = A.x + Math.min(A.w - 12, 26), x1 = C.x + 6, y0 = ay + (cy > ay ? A.h / 2 : -A.h / 2); d = `M${x0} ${y0}C${x0} ${(y0 + cy) / 2} ${x1 - 24} ${cy} ${x1} ${cy}`; }
      s += `<path class="tre${sure ? '' : ' maybe'}" data-a="${a}" data-b="${b}" d="${d}" style="--c:${famC(C.fam)}"/>`;
    });
    el.svg.setAttribute('width', B.W); el.svg.setAttribute('height', B.H); el.svg.setAttribute('viewBox', `0 0 ${B.W} ${B.H}`);
    el.svg.innerHTML = `<defs><marker id="trArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1.5 8.5 5 1 8.5" fill="none" stroke="context-stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>` + s;
  }
  function mark() {
    const L = sel ? lineage(sel) : null;
    el.nodes.querySelectorAll('.trn').forEach(b => { const id = b.dataset.id; b.classList.toggle('on', id === sel); b.classList.toggle('dim', !!L && !L.has(id)); b.classList.toggle('kin', !!L && L.has(id) && id !== sel); });
    el.svg.querySelectorAll('.tre').forEach(p => { const on = !!L && L.has(p.dataset.a) && L.has(p.dataset.b); p.classList.toggle('on', on); p.classList.toggle('dim', !!L && !on); });
    el.wrap.classList.toggle('picking', !!sel);
  }

  /* ---------- the card under the tree ---------- */
  function rel(id, dir) {
    return E.filter(e => (dir ? e[0] : e[1]) === id).map(e => ({ id: dir ? e[1] : e[0], sure: e[2] })).filter(r => built.byId[r.id]);
  }
  function chipHtml(r) { const n = built.byId[r.id]; return `<button type="button" class="trc${r.sure ? '' : ' maybe'}" data-id="${r.id}" style="--c:${n.g ? n.g.color : famC(n.fam)}">${n.g ? `<span class="tra">${ctx.art(n.g)}</span>` : '<span class="trd"></span>'}${esc(nodeName(n))}${r.sure ? '' : `<em>${esc(TT(lang, 'maybe'))}</em>`}</button>`; }
  function info() {
    const n = sel && built.byId[sel];
    if (!n) { el.info.innerHTML = `<div class="trempty"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M8.4 6h2.1c1.6 0 2.5.8 2.5 2.4v1.2c0 1.6.9 2.4 2.5 2.4h.1M8.4 18h2.1c1.6 0 2.5-.8 2.5-2.4v-1.2c0-1.6.9-2.4 2.5-2.4"/></svg><p>${esc(TT(lang, 'pick'))}</p></div>`; return; }
    const g = n.g, c = g ? g.color : famC(n.fam), F = (tx(lang).fam || {})[n.fam] || (tx('en').fam || {})[n.fam] || [n.fam];
    const up = rel(n.id, 0), dn = rel(n.id, 1);
    el.info.innerHTML = `<div class="trhd" style="--c:${c}">${g ? `<span class="tra big">${ctx.art(g)}</span>` : `<span class="trd big" style="--f:${famC(n.fam)}"><svg viewBox="0 0 24 24" aria-hidden="true">${FAM.find(f => f.k === n.fam).i}</svg></span>`}
        <div><small>${esc(F[0])}${g ? '' : ` · ${esc(TT(lang, 'notin'))}`}</small><b>${esc(nodeName(n))}</b><span class="trfacts"><span><i>${esc(TT(lang, 'when'))}</i>${esc(n.label)}</span><span><i>${esc(TT(lang, 'where'))}</i>${esc(nodeTx(n, 1))}</span></span></div></div>
      <p class="trdesc">${esc(nodeTx(n, 2))}</p>
      <div class="trrel">${up.length ? `<div><i>${esc(TT(lang, 'from'))}</i><span>${up.map(chipHtml).join('')}</span></div>` : ''}${dn.length ? `<div><i>${esc(TT(lang, 'to'))}</i><span>${dn.map(chipHtml).join('')}</span></div>` : ''}${!up.length && !dn.length ? `<div class="solo"><i>${esc(TT(lang, 'solo'))}</i></div>` : ''}</div>
      ${g ? `<div class="tracts"><button type="button" class="amplay" style="--c:${g.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>${esc(TT(lang, 'play'))}</button>${window.Historia && Historia.has && Historia.has(g.id) ? `<button type="button" class="amhist" style="--c:${g.color}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5z"/></svg>${esc(TT(lang, 'hist'))}</button>` : ''}</div>` : ''}`;
    el.info.querySelectorAll('.trc').forEach(b => b.onclick = () => { select(b.dataset.id); });
    const pb = el.info.querySelector('.amplay'); if (pb) pb.onclick = () => { const im = el.info.querySelector('.trhd .tra img'); ctx.open(g.id, im); };
    const hb = el.info.querySelector('.amhist'); if (hb) hb.onclick = () => window.Historia.open(g.id);
  }
  function select(id, scroll = true) {
    sel = id; mark(); info();
    if (id && scroll) reveal(id);
    if (id && phone()) {   // phones: keep the card's top in view under the tree
      const r = el.info.getBoundingClientRect(), lim = innerHeight - 90; if (r.top > lim - 120) scrollBy({ top: r.top - (lim - 220), behavior: 'smooth' }); }
  }
  // bring a node to the middle of the scroller (smoothly), unless it is already well inside; when its whole lineage fits,
  // frame the lineage instead (its roots and descendants show with it)
  function reveal(id) {
    const n = built.byId[id]; if (!n) return;
    const s = el.scroll, nameW = el.names.offsetWidth, vw = s.clientWidth - nameW, vh = s.clientHeight - el.ruler.offsetHeight;
    const kin = [...lineage(id)].map(k => built.byId[k]).filter(m => m && built.vis.has(m.id));
    const box = A => ({ x0: Math.min(...A.map(m => m.x)), x1: Math.max(...A.map(m => m.x + m.w)), y0: Math.min(...A.map(m => m.top)), y1: Math.max(...A.map(m => m.top + m.h)) });
    let b = box(kin); if (b.x1 - b.x0 > vw - 40) b = box([n]);
    const inX = b.x0 - nameW >= s.scrollLeft + 16 && b.x1 - nameW <= s.scrollLeft + vw - 16, inY = b.y0 >= s.scrollTop + 8 && b.y1 <= s.scrollTop + vh - 8;
    const fy = b.y1 - b.y0 > vh - 20 ? n.top + n.h / 2 : (b.y0 + b.y1) / 2;
    if (!inX || !inY) s.scrollTo({ left: inX ? s.scrollLeft : Math.max(0, (b.x0 + b.x1) / 2 - nameW - vw / 2), top: inY ? s.scrollTop : Math.max(0, fy - vh / 2), behavior: 'smooth' });
  }

  /* ---------- the family chips and the legend ---------- */
  function chips() {
    el.chips.innerHTML = [['all']].concat(FAM.map(f => [f.k, f])).map(([k, f]) => {
      const T = f ? ((tx(lang).fam || {})[k] || (tx('en').fam || {})[k] || [k])[0] : TT(lang, 'all');
      return `<button type="button" class="chip cat" data-f="${k}" aria-pressed="${fam === k}"${f ? ` style="--c:${f.c}"` : ''}>${f ? `<i class="trfc"></i>` : ''}${esc(T)}</button>`; }).join('');
    el.chips.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (fam === b.dataset.f) return; fam = b.dataset.f; draw(); el.scroll.scrollTo({ left: 0, top: 0 }); if (sel && built.vis.has(sel)) reveal(sel); });
  }
  function legend() {
    el.legend.innerHTML = `<span><svg viewBox="0 0 30 10"><path d="M1 5h28"/></svg>${esc(TT(lang, 'sure'))}</span><span><svg viewBox="0 0 30 10"><path class="maybe" d="M1 5h28"/></svg>${esc(TT(lang, 'maybeL'))}</span>`
      + `<span><i class="lg g"></i>${esc(TT(lang, 'inAtlas'))}</span><span><i class="lg x"></i>${esc(TT(lang, 'notin'))}</span>`;
  }

  /* ---------- input: drag to scroll with a mouse; zoom buttons; arrow keys walk the lines ---------- */
  let dragged = false;
  function bind() {
    const s = el.scroll; let st = null;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; st = { x: e.clientX, y: e.clientY, l: s.scrollLeft, t: s.scrollTop, id: e.pointerId }; dragged = false; });
    s.addEventListener('pointermove', e => { if (!st || e.pointerId !== st.id) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; if (!dragged && Math.hypot(dx, dy) > 5) { dragged = true; s.classList.add('grab'); try { s.setPointerCapture(e.pointerId); } catch (x) {} } if (dragged) { s.scrollLeft = st.l - dx; s.scrollTop = st.t - dy; } });
    const end = () => { if (!st) return; st = null; s.classList.remove('grab'); setTimeout(() => { dragged = false; }, 0); };
    s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end);
    // a plain wheel scrolls sideways when the tree has nothing more to scroll down (the time line is the long way)
    s.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, e); return; }
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && s.scrollHeight <= s.clientHeight + 1) { e.preventDefault(); s.scrollLeft += e.deltaY; } }, { passive: false });
    el.zoom.querySelector('[data-z="in"]').onclick = () => zoomBy(1.35);
    el.zoom.querySelector('[data-z="out"]').onclick = () => zoomBy(1 / 1.35);
    el.zoom.querySelector('[data-z="all"]').onclick = () => { zoom = fitZoom(); draw(); s.scrollTo({ left: 0, top: 0, behavior: 'smooth' }); };
  }
  const fitZoom = () => { const w = el.scroll.clientWidth - el.names.offsetWidth - 20, full = SEG.reduce((a, s) => a + s[2], 0) + 180; return Math.max(.35, Math.min(1, w / full)); };
  function zoomBy(k, e) {
    const s = el.scroll, nz = Math.max(.35, Math.min(2.2, zoom * k)); if (Math.abs(nz - zoom) < .001) return;
    const r = s.getBoundingClientRect(), px = e ? e.clientX - r.left : s.clientWidth / 2, wx = s.scrollLeft + px, PADX = built ? built.PAD : 150;
    const yr = (wx - PADX) / zoom;   // the pixel under the pointer stays put (in zoom-1 units)
    zoom = nz; draw(); s.scrollLeft = PADX + yr * zoom - px;
  }
  function walk(dx, dy) {
    if (!built || !built.nodes.length) return;
    if (!sel) { select(built.nodes[0].id); return; }
    const n = built.byId[sel];
    let pool;
    if (dx > 0) pool = rel(sel, 1).map(r => built.byId[r.id]);
    else if (dx < 0) pool = rel(sel, 0).map(r => built.byId[r.id]);
    if (!pool || !pool.length) pool = built.nodes.filter(m => m !== n && (dx ? Math.sign(m.x - n.x) === dx : Math.sign(m.top - n.top) === dy));
    if (!pool.length) return;
    const d = m => Math.hypot((m.x - n.x) / (dx ? 1 : 3), (m.top - n.top) / (dy ? 1 : 2));
    pool.sort((a, b) => d(a) - d(b)); select(pool[0].id);
  }
  document.addEventListener('keydown', e => {
    if (!host || !host.isConnected || !host.classList.contains('on') || !el.scroll || !document.getElementById('pg-museum').classList.contains('on')) return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const bv = document.getElementById('bv'); if ((bv && bv.classList.contains('on')) || (window.Historia && Historia.on)) return;
    const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable]')) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (d) { e.preventDefault(); walk(d[0], d[1]); }
    else if (e.key === 'Escape' && sel) select(null, false);
    else if (e.key === 'Enter' && sel && !(t && t.closest && t.closest('button,a'))) { const b = el.info.querySelector('.amplay'); if (b) { e.preventDefault(); b.click(); } }
  });

  /* ---------- entry ---------- */
  function render(sec, c) {
    ctx = c; lang = YF[c.lang] ? c.lang : 'en';
    if (host !== sec || !sec.querySelector('.trwrap')) {
      host = sec;
      sec.innerHTML = `<p class="trsub" id="trSub"></p><div class="chips cats trfam" id="trFam"></div>
        <div class="card trwrap" id="trWrap" dir="ltr"><div class="trscroll" id="trScroll" tabindex="0">
          <div class="trruler" id="trRuler"></div>
          <div class="trbody"><div class="trnames" id="trNames"></div><div class="trcanvas" id="trCanvas"><div class="trlanes"></div><svg class="trsvg" aria-hidden="true"></svg><div class="trnodes"></div></div></div>
        </div>
        <div class="amzoom trzoom"><button type="button" data-z="in" aria-label="+">+</button><button type="button" data-z="out" aria-label="−">−</button><button type="button" data-z="all"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>
        <p class="trload" id="trLoad"></p></div>
        <div class="trlegend" id="trLeg"></div>
        <aside class="card trinfo" id="trInfo" aria-live="polite"></aside>`;
      el = { wrap: sec.querySelector('#trWrap'), scroll: sec.querySelector('#trScroll'), ruler: sec.querySelector('#trRuler'), names: sec.querySelector('#trNames'), canvas: sec.querySelector('#trCanvas'),
        lanes: sec.querySelector('.trlanes'), svg: sec.querySelector('.trsvg'), nodes: sec.querySelector('.trnodes'), info: sec.querySelector('#trInfo'), chips: sec.querySelector('#trFam'),
        legend: sec.querySelector('#trLeg'), zoom: sec.querySelector('.trzoom'), load: sec.querySelector('#trLoad') };
      bind();
      // a new width: lay out again (phones and PCs use different sizes), only while the room is on screen
      let rw = innerWidth; addEventListener('resize', () => { if (!host || !host.isConnected || !built || Math.abs(innerWidth - rw) < 2) return; rw = innerWidth;
        clearTimeout(render.t); render.t = setTimeout(() => { if (el.scroll.offsetParent) draw(); }, 120); });
    }
    el.load.textContent = TT(lang, 'load'); el.load.hidden = false;
    textsFor(lang).then(() => {
      if (!host || !host.isConnected) return;
      el.load.hidden = true;
      host.querySelector('#trSub').textContent = TT(lang, 'sub');
      el.zoom.querySelector('[data-z="all"]').title = TT(lang, 'fit'); el.zoom.querySelector('[data-z="all"]').setAttribute('aria-label', TT(lang, 'fit'));
      const first = !built;
      if (first) zoom = phone() ? .7 : 1;
      draw();
      if (first && !sel) { const s = el.scroll; s.scrollLeft = 0; }
      // the node widths are measured with the page font: lay out again once the web fonts have arrived
      if (first && document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (host && host.isConnected && el.scroll.offsetParent) draw(); });
    });
  }
  window.AtlasTree = { render, N, E, FAM, yl };
})();
