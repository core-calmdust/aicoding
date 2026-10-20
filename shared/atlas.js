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
    { id: 'shogi', store: ['shogi-kaya-', 'shogi-rated-v1', 'shogi-online-name'], href: 'shogi/', color: '#e8a33d', released: '2026-10-18', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 613, ls: 14 },
      name: N('将棋', 'Shogi', '将棋', '쇼기', 'Shogi', 'Shogi', 'Shogi', 'Shogi', 'शोगी', 'شوغي') },
    { id: 'chess', store: ['aicoding-chess', 'chess-online-name'], href: 'chess/', color: '#5a6b8c', released: '2026-10-19', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 445, ls: 20 },
      name: N('チェス', 'Chess', '国际象棋', '체스', 'Ajedrez', 'Échecs', 'Xadrez', 'Schach', 'शतरंज', 'الشطرنج') },
    { id: 'reversi', store: ['reversi-emerald-', 'reversi-rated-v1', 'reversi-online-name'], href: 'reversi/', color: '#22aa74', released: '2026-10-17', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 170, ls: 9 },
      name: N('リバーシ', 'Reversi', '黑白棋', '리버시', 'Reversi', 'Reversi', 'Reversi', 'Reversi', 'रिवर्सी', 'ريفيرسي') },
    { id: 'sudoku', store: ['mainichi-sudoku-v1'], href: 'sudoku/', color: '#ff8fc7', released: '2025-06-10', premium: 1, tags: ['daily', 'puzzles', 'netrank', 'mobile'], total: { pz: 1300 },
      name: N('まいにち数独', 'Daily Sudoku', '每日数独', '매일 스도쿠', 'Sudoku Diario', 'Sudoku du jour', 'Sudoku Diário', 'Tägliches Sudoku', 'रोज़ का सुडोकू', 'سودوكو كل يوم') },
    { id: 'gomoku', store: ['aicoding-gomoku', 'gomoku-online-name'], href: 'gomoku/', color: '#c48a4a', released: '2026-10-19', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 500, ls: 12 },
      name: N('五目並べ・連珠', 'Gomoku & Renju', '五子棋・连珠', '오목・렌주', 'Gomoku y Renju', 'Gomoku et Renju', 'Gomoku e Renju', 'Gomoku & Renju', 'गोमोकु और रेंजू', 'غوموكو ورينجو') },
    { id: 'dots', store: ['dots-puzzles-', 'dots-lessons-', 'dots-openings-', 'dots-daily-', 'dots-rated-v1', 'dots-rules-', 'dots-online-name'], href: 'dots/', color: '#4cc3ff', released: '2026-10-18', premium: 1, tags: ['ai', 'online', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'mobile'], total: { pz: 450, ls: 15 },
      name: N('ドット・アンド・ボックス', 'Dots and Boxes', '点格棋', '도트 앤 박스', 'Puntos y cajas', 'Pipopipette', 'Pontinhos', 'Käsekästchen', 'डॉट्स एंड बॉक्सेज़', 'النقاط والمربعات') },
    { id: 'connect4', store: ['aicoding-connect4-v2', 'c4-rated-v1'], href: 'connect4/', color: '#ff6b6b', released: '2026-10-18', premium: 1, tags: ['ai', 'rated', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 45, ls: 5 },
      name: N('コネクトフォー', 'Connect Four', '四子棋', '커넥트 포', 'Conecta 4', 'Puissance 4', 'Lig 4', 'Vier gewinnt', 'कनेक्ट फ़ोर', 'أربعة في صف') },
    { id: 'mancala', store: ['aicoding-mancala-v1'], href: 'mancala/', color: '#b98663', released: '2026-10-18', premium: 1, tags: ['ai', 'daily', 'lessons', 'puzzles', 'variants', 'mobile'], total: { pz: 100, ls: 6 },
      name: N('マンカラ', 'Mancala', '播棋', '만칼라', 'Mancala', 'Mancala', 'Mancala', 'Mancala', 'मंकाला', 'مانكالا') },
    { id: 'backgammon', store: ['aicoding-backgammon-v2'], href: 'backgammon/', color: '#a17cff', released: '2026-10-18', premium: 1, tags: ['ai', 'daily', 'lessons', 'puzzles', 'mobile'], total: { pz: 16, ls: 7 },
      name: N('バックギャモン', 'Backgammon', '西洋双陆棋', '백개먼', 'Backgammon', 'Backgammon', 'Gamão', 'Backgammon', 'बैकगैमन', 'طاولة الزهر') },
    { id: 'morris', store: ['aicoding-morris'], href: 'morris/', color: '#7552e0', released: '2026-10-18', premium: 1, tags: ['ai', 'rated', 'daily', 'lessons', 'puzzles', 'openings', 'variants', 'mobile'], total: { pz: 600, ls: 21 },
      name: N('ナイン・メンズ・モリス', "Nine Men's Morris", '九子棋', '나인 멘스 모리스', 'Molino', 'Jeu du moulin', 'Trilha', 'Mühle', 'नाइन मेन्स मोरिस', 'الطاحونة') },
  ];
  GAMES.forEach(g => { g.icon = 'images/icons/' + g.id + '.svg'; });
  // store: localStorage key prefixes that belong to the game. The shared account (shared/atlas-account.js)
  // syncs every key starting with one of them, plus each game's '-rules-seen' flag — so a new game only
  // has to list its prefixes here. Keys holding an in-progress game or device settings sync too (newest wins).

  /* ---------------- changelog (newest first) ---------------- */
  // Add a line whenever a game gets a visible update. ja / en; other languages fall back to en.
  const UPDATES = [
    ['2026-10-20', 'reversi', 'ポータルの3D盤でレッスン・定石・詰め・オンライン対戦まで全部遊べるように。キャラが案内するルール説明も', 'Lessons, openings, puzzles and online play on the portal\'s 3D board, plus a rules tour told by a character'],
    ['2026-10-20', 'gomoku', 'AIが15級〜五段の20段階に。レートも級・段位で表示、連珠の評価も強化', '20 AI ranks from 15-kyu to 5-dan, ratings shown as kyu/dan, stronger renju evaluation'],
    ['2026-10-20', 'shogi', 'Googleログインで進捗をクラウド同期。レート戦の予備選（3戦でレート決定）', 'Google sign-in with cloud sync, and placement games for rated play'],
    ['2026-10-20', 'chess', 'Googleログインで進捗をクラウド同期。定跡解説の自動再生', 'Google sign-in with cloud sync, and autoplay for opening studies'],
    ['2026-10-20', 'morris', 'オンライン対戦が登場（レート戦・ルーム・チャット・観戦）', 'Online play: rated matchmaking, rooms, chat and spectating'],
    ['2026-10-20', 'backgammon', '2つのサイコロがそれぞれ別々に転がるように。図解ルールも追加', 'The two dice now roll independently; illustrated rules added'],
    ['2026-10-20', 'dots', '5×5のLv9・Lv10が大幅に強化（終盤の完全読み）。オンライン対戦に対応', '5×5 Lv9/Lv10 much stronger with an exact solver; online play'],
    ['2026-10-20', 'connect4', 'AIとのレート戦が登場。Lv8は1手目から完全プレイ', 'Rated games vs AI; Lv8 now plays perfectly from move 1'],
    ['2026-10-19', 'sudoku', '変わり種数独に5ルール追加、ランキングとキャラガチャ', '5 new variant rules, rankings and a character gacha'],
    ['2026-10-19', 'mancala', 'スマホではメニューを盤の上に配置', 'Menu moved above the board on phones'],
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
    morris: () => { const pz = J('aicoding-morris-puzzles2'); return { pz: cntPos(pz), st: starsOf(pz), ls: cntClear(J('aicoding-morris-lessons')), op: cntClear(J('aicoding-morris-open'), 'pass'), dl: daily('aicoding-morris-daily'), rt: rated('aicoding-morris-rated'), ru: rules('morris') }; },
    mancala: () => ({ pz: cntPos(J('aicoding-mancala-v1-puzzles')), ls: cntClear(J('aicoding-mancala-v1-lessons')), dl: daily('aicoding-mancala-v1-daily'), ru: rules('mancala') }),
    backgammon: () => ({ pz: cntPos(J('aicoding-backgammon-v2-puzzles')), ls: cntClear(J('aicoding-backgammon-v2-lessons'), 'pass'), dl: daily('aicoding-backgammon-v2-daily'), ru: rules('backgammon') }),
    connect4: () => ({ pz: cntPos(J('aicoding-connect4-v2-puzzles2')), ls: cntClear(J('aicoding-connect4-v2-lessons')), dl: daily('aicoding-connect4-v2-daily'), rt: rated('c4-rated-v1'), ru: rules('connect4') }),
    dots: () => { const pz = J('dots-puzzles-v2'); return { pz: cntPos(pz), st: pz ? Object.values(pz).reduce((s, v) => s + (v >= 1 ? 3 : v >= .5 ? 2 : v > 0 ? 1 : 0), 0) : 0, ls: cntClear(J('dots-lessons-v2')), op: J('dots-openings-v1') ? Object.keys(J('dots-openings-v1')).length : 0, dl: daily('dots-daily-v1'), rt: rated('dots-rated-v1'), ru: rules('dots') || !!J('dots-rules-v1') }; },
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
    d.av = d.av || { icon: 'i001', bg: 'b001', frame: 'f-none' };
    if (window.AtlasArt) AtlasArt.STARTER.forEach(id => { if (!d.owned.includes(id)) d.owned.push(id); });
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

  window.Atlas = { LANGS, GAMES, UPDATES, TAGS, TIER_COINS, GACHA, SHOP_PRICE, badges, byUpdate, recordPlay, lastUpdate, progress, allProgress, achievements, load, save, coins, claimLogin, pull, shop, buy, ymd, daysSince };
})();
