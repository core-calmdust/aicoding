/* =====================================================================
   Connect Four on the portal.
   · The board card (levels, sides, modes): level names / descriptions come from
     the game (connect4/i18n.js: 入門 … 完全読み), ratings = the game's RT_LV (rated.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the leather & walnut tile tower
     itself (atlas/models/connect4.js, live tiles: atlas/games/connect4-tiles.js) with
     the full game's AI — ../connect4/engine.js as a Worker (bitboard negamax + exact
     solver, the opening book and the Lv8 perfect-play tree), asked exactly as
     connect4/index.html asks it ({ type:'think', moves, level }).
     Tap (or click) a column: the tile drops in from above the open rail tops and falls
     between the rails; four in a row step forward under a gold bar.
     ctx.mode 'pvp': two players take turns on one device (gold first).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../connect4/', VER = '?v=20261028rb';   // same file / version as connect4/index.html → shared cache
  const COLS = 7, ROWS = 6;
  let BOOK = null, TREE = null, dataP = null;
  const loadData = () => dataP || (dataP = Promise.all([
    fetch(BASE + 'book.json').then(r => r.ok ? r.json() : null).catch(() => null).then(b => (BOOK = b)),
    fetch(BASE + 'tree.bin').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null).then(b => (TREE = b)),
  ]));
  function makeWorker() {
    const w = new Worker(BASE + 'engine.js' + VER);
    loadData().then(() => { try { if (BOOK) w.postMessage({ type: 'book', book: BOOK }); if (TREE) w.postMessage({ type: 'tree', buf: TREE.slice(0) }); } catch (e) {} });
    return w;
  }
  // the game's own words (connect4/i18n.js)
  const TX = {"ja":{"n":["金","銀"],"win":"{p}の勝ち","drawSub":"盤がすべて埋まりました","sub":"{n}手で決着","full":"その列はいっぱいです"},"en":{"n":["Gold","Silver"],"win":"{p} wins","drawSub":"The board is full","sub":"Decided in {n} moves","full":"That column is full"},"zh":{"n":["金","银"],"win":"{p}方获胜","drawSub":"棋盘已经下满","sub":"{n}手分出胜负","full":"这一列已满"},"ko":{"n":["금","은"],"win":"{p} 승리","drawSub":"판이 모두 찼습니다","sub":"{n}수 만에 결판","full":"그 열은 가득 찼습니다"},"es":{"n":["Oro","Plata"],"win":"Gana {p}","drawSub":"El tablero está lleno","sub":"Decidida en {n} jugadas","full":"Esa columna está llena"},"fr":{"n":["Or","Argent"],"win":"{p} gagne","drawSub":"Le plateau est plein","sub":"Décidée en {n} coups","full":"Cette colonne est pleine"},"pt":{"n":["Ouro","Prata"],"win":"{p} venceu","drawSub":"O tabuleiro está cheio","sub":"Decidida em {n} jogadas","full":"Essa coluna está cheia"},"de":{"n":["Gold","Silber"],"win":"{p} gewinnt","drawSub":"Das Brett ist voll","sub":"Entschieden in {n} Zügen","full":"Diese Spalte ist voll"},"hi":{"n":["सोना","चाँदी"],"win":"{p} जीता","drawSub":"बोर्ड भर गया","sub":"{n} चालों में फ़ैसला","full":"वह कॉलम भर गया है"},"ar":{"n":["الذهبي","الفضي"],"win":"فاز {p}","drawSub":"امتلأت اللوحة","sub":"حُسمت في {n} نقلة","full":"هذا العمود ممتلئ"}};
  const TURN = { ja: '{p}の番', en: '{p} to move', zh: '轮到{p}', ko: '{p} 차례', es: 'Turno: {p}', fr: 'Trait : {p}', pt: 'Vez: {p}', de: '{p} am Zug', hi: '{p} की बारी', ar: 'دور {p}' };
  const DOT = ['', 'background:radial-gradient(circle at 35% 30%,#ffe2a0,#d39a34 50%,#8a5a1c);border-radius:5px', 'background:radial-gradient(circle at 35% 30%,#ffffff,#e8e3d8 50%,#a8a294);border-radius:5px'];

  const gridOf = mv => { const g = Array.from({ length: COLS }, () => []); for (let i = 0; i < mv.length; i++) g[mv.charCodeAt(i) - 49].push(i & 1 ? 2 : 1); return g; };
  const cellAt = (g, c, r) => (c >= 0 && c < COLS && r >= 0 && r < g[c].length) ? g[c][r] : 0;
  function lineThrough(g, c, r, p) {
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [[c, r]];
      for (const s of [1, -1]) { let x = c + dc * s, y = r + dr * s; while (cellAt(g, x, y) === p) { cells.push([x, y]); x += dc * s; y += dr * s; } }
      if (cells.length >= 4) return cells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
    return null;
  }
  function statusOf(mv) {
    if (!mv.length) return { over: false };
    const g = gridOf(mv), c = mv.charCodeAt(mv.length - 1) - 49, r = g[c].length - 1, p = g[c][r], line = lineThrough(g, c, r, p);
    if (line) return { over: true, winner: p, line };
    if (mv.length === COLS * ROWS) return { over: true, winner: 0 };
    return { over: false };
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.c4toast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:c4T .2s ease-out;pointer-events:none}
@keyframes c4T{from{transform:translate(-50%,8px);opacity:0}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, t = ctx.t, X = TX[ctx.lang] || TX.en, TN = TURN[ctx.lang] || TURN.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const stand = T3.MODELS.connect4(true); T3.show('connect4', stand);
    const set = T3.c4Set(stand, { sfx: true });
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: 9.7, d: 8.2, y: 3.05, pitch: .36 } : { w: 10.2, d: 7.4, y: 3.2, pitch: .34 });   // the tower seen from the front, a little from above
    const pvp = ctx.mode === 'pvp', human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    const pname = c => X.n[c - 1], fmt = (s, p) => s.replace('{p}', p);
    let moves = '', stopped = false, busy = true, over = false, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintC = -1, hover = -1;
    const side = () => moves.length & 1 ? 2 : 1;
    const onTurn = () => { if (ctx.onTurn) ctx.onTurn(side() - 1, { human: pvp || side() === human, ply }); };   // HUD pills: gold (left) 0, pearl 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const myTurn = () => !over && !busy && (pvp || side() === human);

    function showMarks() {
      const o = {};
      if (moves.length && !over) { const c = moves.charCodeAt(moves.length - 1) - 49; o.last = [c, gridOf(moves)[c].length - 1]; }
      if (hintC >= 0) o.hint = hintC;
      if (hover >= 0 && myTurn() && gridOf(moves)[hover].length < ROWS) o.ghost = { c: hover, p: side() };
      set.marks(o);
    }
    function hud(msg) {
      const pill = c => `<span class="hs ${side() === c && !over ? 'on' : ''}"><i class="dk" style="${DOT[c]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}</span>`;
      ctx.hud(`${pill(1)}<span class="hm">${msg || ''}</span>${pill(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'c4toast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2000);
    }

    function play(c) {
      const g0 = gridOf(moves), r = g0[c].length;
      moves += String(c + 1); ply++; hintC = -1; hintJ++; hover = -1;
      const w = set.sync(gridOf(moves), c + ',' + r, true);
      onTurn(); showMarks();
      return w;
    }
    function next() {
      if (stopped) return;
      const s = statusOf(moves);
      if (s.over) return end(s);
      showMarks(); onTurn();
      if (pvp) { hud(fmt(TN, pname(side()))); busy = false; showMarks(); return; }
      if (side() === human) { hud(L.turn); busy = false; showMarks(); return; }
      aiMove();
    }
    function end(s) {
      over = true; busy = false; hover = -1; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      if (s.line) set.win(s.line);
      const draw = !s.winner, wt = draw ? '' : fmt(X.win, pname(s.winner)), sub = draw ? X.drawSub : X.sub.replace('{n}', moves.length);
      const wait = s.line ? 1500 : 500;
      if (pvp) { hud(wt || L.draw); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: sub, pvp: true, winnerText: wt }), wait); return; }
      const win = s.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: sub }), wait);
    }
    function aiMove() {
      busy = true; hud(L.think); showMarks();
      if (!worker) worker = makeWorker();
      const id = ++jid, t0 = Date.now(), mv = moves;
      const reply = c => {
        if (stopped || id !== jid || over) return;
        const g = gridOf(moves);
        if (!(c >= 0 && c < COLS) || g[c].length >= ROWS) { c = [3, 2, 4, 1, 5, 0, 6].find(x => g[x].length < ROWS); }   // the worker failed: any open column (centre first)
        later(() => {
          if (id !== jid || over) return;
          const w = play(c); later(next, w + 80);
        }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.move); };
      worker.onerror = () => { worker = null; reply(-1); };
      worker.postMessage({ type: 'think', id, moves: mv, level: ctx.level });
    }

    /* ---------- input: a column ---------- */
    function onClick(e) {
      if (!myTurn() || T3.wasDrag()) return;
      const c = set.colAt(e.clientX, e.clientY); if (c < 0) return;
      if (gridOf(moves)[c].length >= ROWS) { toast(X.full); set.knock(0, true); return; }
      busy = true; hud(''); const w = play(c); later(next, w + 80);
    }
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const c = myTurn() ? set.colAt(e.clientX, e.clientY) : -1;
      if (c !== hover) { hover = c; showMarks(); }
    }
    ctx.el.addEventListener('click', onClick);
    ctx.el.addEventListener('pointermove', onMove);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; jid++;
      moves = ''; over = false; busy = true; set.sync(gridOf(''), null, false); set.win(null); showMarks();
      hud(''); later(next, 600);
    }
    hud('');
    worker = makeWorker(); begin();

    // test hooks (positions on screen, state)
    const dbg = {
      col: c => { const [x, y] = set.cellXY(c, 3); return T3.project(x, 0, y); },
      state: () => ({ moves, side: side(), human, over, busy, pvp, tiles: set.count(), hint: hintC }),
    };
    window.Atlas3D.connect4._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {
      if (over) return;
      over = true; busy = false; jid++; hover = -1; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = fmt(X.win, pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() + (pvp || human === 1 ? 0 : 1),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++; hintJ++; hintC = -1;
        moves = moves.slice(0, moves.length - undoN()); ply++;
        set.sync(gridOf(moves), null, true);
        busy = true; next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mv = moves;
        return new Promise(res => {
          if (!hintW) hintW = makeWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves !== mv) return res(true);
            const c = r.move; if (!(c >= 0 && c < COLS) || gridOf(moves)[c].length >= ROWS) return res(false);
            hintC = c; showMarks();
            later(() => { if (hintC === c && j === hintJ) { hintC = -1; showMarks(); } }, 4200);
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, moves: mv, level: Math.max(6, Math.min(7, ctx.level + 2)) });
        });
      },
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? side() : human, 'resign'); },
      timeout(s) { finish(s + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        set.dispose();
        if (window.Atlas3D.connect4._dbg === dbg) delete window.Atlas3D.connect4._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {"ja":{"lv":["","入門","初級","初級+","中級","中級+","上級","達人","完全読み"],"lvd":["","ときどき見落とす","2手読み","4手読み","6手読み","8手読み","12手読み・終盤は読み切り","約1秒・勝敗を読み切る","完全プレイ（1手目から最善・先手なら必勝）"]},"en":{"lv":["","Beginner","Novice","Novice+","Intermediate","Intermediate+","Advanced","Expert","Perfect"],"lvd":["","sometimes misses things","2-ply search","4-ply search","6-ply search","8-ply search","12-ply, solves the endgame","~1 s, solves win/loss","perfect play from move 1 (unbeatable as first)"]},"zh":{"lv":["","入门","初级","初级+","中级","中级+","高级","达人","完全计算"],"lvd":["","偶尔会看漏","搜索2步","搜索4步","搜索6步","搜索8步","搜索12步・残局完全计算","约1秒・算清胜负","完美对弈（从第1步起最优・先手必胜）"]},"ko":{"lv":["","입문","초급","초급+","중급","중급+","상급","달인","완전 해석"],"lvd":["","가끔 놓침","2수 읽기","4수 읽기","6수 읽기","8수 읽기","12수 읽기・종반 완전 해석","약 1초・승패 해석","완전 플레이 (1수부터 최선・선수면 필승)"]},"es":{"lv":["","Principiante","Novato","Novato+","Intermedio","Intermedio+","Avanzado","Experto","Perfecto"],"lvd":["","a veces se le escapan cosas","búsqueda a 2 plies","búsqueda a 4 plies","búsqueda a 6 plies","búsqueda a 8 plies","12 plies, resuelve el final","~1 s, resuelve victoria/derrota","juego perfecto desde la 1.ª jugada (imbatible como primero)"]},"fr":{"lv":["","Débutant","Novice","Novice+","Intermédiaire","Intermédiaire+","Avancé","Expert","Parfait"],"lvd":["","rate parfois des choses","recherche à 2 demi-coups","recherche à 4 demi-coups","recherche à 6 demi-coups","recherche à 8 demi-coups","12 demi-coups, résout la finale","~1 s, résout gain/perte","jeu parfait dès le 1er coup (imbattable en premier)"]},"pt":{"lv":["","Iniciante","Novato","Novato+","Intermediário","Intermediário+","Avançado","Expert","Perfeito"],"lvd":["","às vezes deixa passar coisas","busca de 2 lances","busca de 4 lances","busca de 6 lances","busca de 8 lances","12 lances, resolve o final","~1 s, resolve vitória/derrota","jogo perfeito desde o 1º lance (imbatível jogando primeiro)"]},"de":{"lv":["","Anfänger","Neuling","Neuling+","Mittel","Mittel+","Fortgeschritten","Experte","Perfekt"],"lvd":["","übersieht manchmal etwas","2 Halbzüge Suche","4 Halbzüge Suche","6 Halbzüge Suche","8 Halbzüge Suche","12 Halbzüge, löst das Endspiel","~1 s, löst Sieg/Niederlage","perfektes Spiel ab dem 1. Zug (als Anziehender unschlagbar)"]},"hi":{"lv":["","शुरुआती","नौसिखिया","नौसिखिया+","मध्यम","मध्यम+","उन्नत","विशेषज्ञ","परफ़ेक्ट"],"lvd":["","कभी-कभी चूक जाता है","2-प्लाई खोज","4-प्लाई खोज","6-प्लाई खोज","8-प्लाई खोज","12-प्लाई, एंडगेम हल करता है","~1 से., जीत/हार हल करता है","पहली चाल से परफ़ेक्ट खेल (पहले खेलकर अजेय)"]},"ar":{"lv":["","مبتدئ","مستجد","مستجد+","متوسط","متوسط+","متقدم","خبير","مثالي"],"lvd":["","يفوّت أشياء أحياناً","بحث بعمق 2","بحث بعمق 4","بحث بعمق 6","بحث بعمق 8","عمق 12، يحل النهاية","~1 ث، يحسم الفوز/الخسارة","لعب مثالي من النقلة الأولى (لا يُهزم إذا بدأ)"]}};
  const RATING = [0, 400, 780, 900, 1110, 1150, 1190, 1300, 1480];   // connect4 RT_LV (rated.js)
  const W5 = (a, b, c, d, e) => [a, a, b, b, c, c, d, e];
  const WHO = {
    ja: W5('はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '最強レベル（完全読み）'),
    en: W5('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'the very strongest (perfect play)'),
    zh: W5('适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '最强等级（完美计算）'),
    ko: W5('처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '최강 레벨 (완전 해석)'),
    es: W5('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'el más fuerte (juego perfecto)'),
    fr: W5('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'le plus fort (jeu parfait)'),
    pt: W5('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'o mais forte (jogo perfeito)'),
    de: W5('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'die stärkste Stufe (perfektes Spiel)'),
    hi: W5('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'सबसे मज़बूत स्तर (परफ़ेक्ट खेल)'),
    ar: W5('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'أقوى مستوى (لعب مثالي)'),
  };
  function levelInfo(n, lang) {   // n = 1..8
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    return { name: L.lv[n], desc: L.lvd[n], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.connect4 = { levels: 8, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
