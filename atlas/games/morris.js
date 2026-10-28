/* =====================================================================
   Nine Men's Morris on the portal.
   · The board card (levels, sides, modes): level names / descriptions come from
     the game (morris/i18n.js: 入門 … 最強), ratings = the game's RT_LV.
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the jeweller's board itself
     (atlas/models/morris.js, live pieces: atlas/games/morris-pieces.js) with the full
     game's rules and AI — ../morris/engine.js on the page (placing, moving, flying,
     mills and removal, the 50-move and repetition draws) and the same file as a Worker
     (WebAssembly search + the learned evaluation, levels 1..10), asked exactly as
     morris/index.html asks it ({ type:'think', variant, start, moves, level }).
     The table plays the standard rule (nine men's morris: 24 points, flying with three);
     the twelve / six men's variants are played in the full game.
     ctx.mode 'pvp': two players take turns on one device (gold first).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../morris/', VER = '?v=20261028rb';   // same file / version as morris/index.html → shared cache
  const RULE = 'nine';
  let engP = null;
  function loadEngine() {
    if (window.MorrisEngine) return Promise.resolve(window.MorrisEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.MorrisEngine ? res(window.MorrisEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (morris/i18n.js)
  const TX = {"ja": {"n": ["金", "銀"], "mill": "ミル！", "rm": "取る駒を選んでください", "cantRm": "ミルの中の駒は取れません", "own": "動かす駒を選んでください", "cantMv": "そこへは動かせません", "stuck": "その駒は動けません", "empty": "空いている点に置いてください", "fly": "3枚なので、好きな空き点へ飛べます", "ph": ["配置", "移動", "飛び"], "why": {"count": "駒が2枚になりました", "block": "動かせる駒がなくなりました", "full": "盤が埋まって動けなくなりました", "quiet": "ミルのないまま50手が過ぎました", "rep": "同じ局面が3回現れました"}, "win": "{p}の勝ち"}, "en": {"n": ["Gold", "Silver"], "mill": "MILL!", "rm": "Choose a piece to remove", "cantRm": "Pieces in a mill cannot be removed", "own": "Choose a piece to move", "cantMv": "It cannot move there", "stuck": "That piece cannot move", "empty": "Place on an empty point", "fly": "Three pieces left: fly to any empty point", "ph": ["placing", "moving", "flying"], "why": {"count": "A player was reduced to two pieces", "block": "A player had no legal move", "full": "The board filled up", "quiet": "50 moves passed without a mill", "rep": "The same position occurred three times"}, "win": "{p} wins"}, "zh": {"n": ["金", "银"], "mill": "成三！", "rm": "请选择要吃掉的棋子", "cantRm": "成三中的棋子不能吃", "own": "请选择要移动的棋子", "cantMv": "不能走到那里", "stuck": "这枚棋子无法移动", "empty": "请放在空点上", "fly": "只剩3枚：可以飞到任意空点", "ph": ["布子", "走子", "飞子"], "why": {"count": "一方只剩两枚棋子", "block": "一方无子可走", "full": "棋盘已被填满", "quiet": "连续50步没有成三", "rep": "同一局面出现了三次"}, "win": "{p}获胜"}, "ko": {"n": ["금", "은"], "mill": "밀!", "rm": "잡을 말을 고르세요", "cantRm": "밀 안의 말은 잡을 수 없습니다", "own": "움직일 말을 고르세요", "cantMv": "그곳으로는 움직일 수 없습니다", "stuck": "그 말은 움직일 수 없습니다", "empty": "빈 점에 놓으세요", "fly": "3개뿐이라 아무 빈 점으로 날 수 있습니다", "ph": ["놓기", "이동", "날기"], "why": {"count": "말이 2개가 되었습니다", "block": "움직일 수 있는 말이 없어졌습니다", "full": "판이 가득 찼습니다", "quiet": "밀 없이 50수가 지났습니다", "rep": "같은 국면이 3번 나왔습니다"}, "win": "{p} 승리"}, "es": {"n": ["Oro", "Plata"], "mill": "¡MOLINO!", "rm": "Elige la ficha que quitas", "cantRm": "No se pueden quitar fichas de un molino", "own": "Elige la ficha que mueves", "cantMv": "No puede ir ahí", "stuck": "Esa ficha no puede moverse", "empty": "Coloca en un punto libre", "fly": "Quedan tres: vuela a cualquier punto libre", "ph": ["colocar", "mover", "volar"], "why": {"count": "Un jugador quedó con dos fichas", "block": "Un jugador no pudo mover", "full": "El tablero se llenó", "quiet": "Pasaron 50 jugadas sin molino", "rep": "La misma posición se repitió tres veces"}, "win": "Gana {p}"}, "fr": {"n": ["Or", "Argent"], "mill": "MOULIN !", "rm": "Choisissez le pion à prendre", "cantRm": "Un pion dans un moulin ne peut pas être pris", "own": "Choisissez le pion à déplacer", "cantMv": "Impossible d'aller là", "stuck": "Ce pion ne peut pas bouger", "empty": "Posez sur un point libre", "fly": "Trois pions : volez vers n'importe quel point libre", "ph": ["pose", "déplacement", "vol"], "why": {"count": "Un joueur n'a plus que deux pions", "block": "Un joueur ne pouvait plus bouger", "full": "Le plateau s'est rempli", "quiet": "50 coups sans moulin", "rep": "La même position est apparue trois fois"}, "win": "{p} gagne"}, "pt": {"n": ["Ouro", "Prata"], "mill": "MOINHO!", "rm": "Escolha a peça a remover", "cantRm": "Peças num moinho não podem ser removidas", "own": "Escolha a peça a mover", "cantMv": "Não pode ir para lá", "stuck": "Essa peça não pode mover", "empty": "Coloque num ponto livre", "fly": "Três peças: voe para qualquer ponto livre", "ph": ["colocar", "mover", "voar"], "why": {"count": "Um jogador ficou com duas peças", "block": "Um jogador não pôde mover", "full": "O tabuleiro encheu", "quiet": "50 lances sem moinho", "rep": "A mesma posição se repetiu três vezes"}, "win": "{p} venceu"}, "de": {"n": ["Gold", "Silber"], "mill": "MÜHLE!", "rm": "Wähle den Stein zum Entfernen", "cantRm": "Steine in einer Mühle dürfen nicht entfernt werden", "own": "Wähle den Stein zum Ziehen", "cantMv": "Dorthin kann er nicht", "stuck": "Dieser Stein kann nicht ziehen", "empty": "Setze auf einen freien Punkt", "fly": "Drei Steine: springe auf jeden freien Punkt", "ph": ["Setzen", "Ziehen", "Springen"], "why": {"count": "Ein Spieler hat nur noch zwei Steine", "block": "Ein Spieler konnte nicht mehr ziehen", "full": "Das Brett war voll", "quiet": "50 Züge ohne Mühle", "rep": "Dieselbe Stellung kam dreimal vor"}, "win": "{p} gewinnt"}, "hi": {"n": ["सुनहरा", "चाँदी"], "mill": "मिल!", "rm": "हटाने के लिए गोटी चुनें", "cantRm": "मिल की गोटी नहीं हटाई जा सकती", "own": "चलाने के लिए गोटी चुनें", "cantMv": "वहाँ नहीं जा सकती", "stuck": "यह गोटी चल नहीं सकती", "empty": "खाली बिंदु पर रखें", "fly": "तीन गोटियाँ: किसी भी खाली बिंदु पर उड़ें", "ph": ["रखना", "चलना", "उड़ना"], "why": {"count": "एक खिलाड़ी के पास दो गोटियाँ बचीं", "block": "एक खिलाड़ी चल नहीं सका", "full": "बोर्ड भर गया", "quiet": "बिना मिल के 50 चालें बीतीं", "rep": "एक ही स्थिति तीन बार आई"}, "win": "{p} जीता"}, "ar": {"n": ["الذهبي", "الفضي"], "mill": "طاحونة!", "rm": "اختر القطعة التي تزيلها", "cantRm": "لا يمكن إزالة قطعة داخل طاحونة", "own": "اختر القطعة التي تحرّكها", "cantMv": "لا يمكنها الذهاب إلى هناك", "stuck": "هذه القطعة لا تستطيع الحركة", "empty": "ضع القطعة في نقطة فارغة", "fly": "ثلاث قطع: يمكنك الطيران إلى أي نقطة فارغة", "ph": ["وضع", "تحريك", "طيران"], "why": {"count": "بقي لدى لاعب قطعتان فقط", "block": "لم يعد لدى لاعب نقلة", "full": "امتلأ اللوح", "quiet": "مرّت 50 نقلة بلا طاحونة", "rep": "تكرر الوضع نفسه ثلاث مرات"}, "win": "فاز {p}"}};
  const TURN = { ja: '{p}の番', en: '{p} to move', zh: '轮到{p}', ko: '{p} 차례', es: 'Turno: {p}', fr: 'Trait : {p}', pt: 'Vez: {p}', de: '{p} am Zug', hi: '{p} की बारी', ar: 'دور {p}' };
  const DOT = ['', 'background:radial-gradient(circle at 35% 30%,#fff2c4,#f0c66c 45%,#a8772a)', 'background:radial-gradient(circle at 35% 30%,#ffffff,#d9dde3 45%,#8d939c)'];

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.mmtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:mmT .2s ease-out;pointer-events:none}
.mmtoast.big{background:linear-gradient(135deg,#f6d77a,#d9a23a);color:#3a2606;font-size:17px;font-weight:900}
@keyframes mmT{from{transform:translate(-50%,8px);opacity:0}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, t = ctx.t, X = TX[ctx.lang] || TX.en, TN = TURN[ctx.lang] || TURN.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.morris(true); T3.show('morris', board);
    const set = T3.morrisSet(board, { sfx: true }), Y = set.top;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: 10.6, d: 9.6, y: Y - .4, pitch: 1.18 } : { w: 10.2, d: 9.4, y: Y - .6, pitch: 1.14 });   // the whole board with both channels, from the player's side
    const pvp = ctx.mode === 'pvp', human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    const pname = c => X.n[c - 1], fmt = (s, p) => s.replace('{p}', p);
    const NONE = 31, mFrom = m => m & 31, mTo = m => (m >> 5) & 31, mRm = m => (m >> 10) & 31;

    let E = null, G = null, pos = null, hashes = [], moves = [], stopped = false, busy = true, over = false, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintMv = -1, sel = null;   // sel: { from, to, stage: 'pick' | 'remove', cands }
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side - 1, { human: pvp || pos.side === human, ply }); };   // HUD pills: gold (left) 0, platinum 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));

    /* ---------- board state → the 3D set ---------- */
    function stateOf(p, tent) {   // tent: { at, c } a piece already put down while its owner picks the piece to take
      const b = Array.from(p.b);
      const hand = [0, p.hand[1], p.hand[2]], caps = [0, G.pieces - p.cnt[2] - p.hand[2], G.pieces - p.cnt[1] - p.hand[1]];
      if (tent) { if (tent.from >= 0 && tent.from !== NONE) b[tent.from] = 0; else hand[tent.c]--; b[tent.at] = tent.c; }
      return { b, hand, caps };
    }
    const lastMove = () => moves.length ? moves[moves.length - 1] : -1;
    function showMarks() {
      const m = lastMove(), o = {};
      if (m >= 0 && !sel) o.last = [mFrom(m) === NONE ? -1 : mFrom(m), mTo(m)];
      if (sel && sel.stage === 'pick') { o.sel = sel.from; o.dests = [...new Set(sel.cands.map(mTo))]; }
      if (sel && sel.stage === 'remove') o.rm = [...new Set(sel.cands.map(mRm))];
      if (hintMv >= 0 && !sel) o.hint = [mFrom(hintMv) === NONE ? -1 : mFrom(hintMv), mTo(hintMv)];
      set.marks(o);
    }
    function millOf(b, at) { const c = b[at]; return c ? G.mills.filter(ml => ml.includes(at) && ml.every(i => b[i] === c)) : []; }

    /* ---------- HUD ---------- */
    function hud(msg) {
      const side = c => {
        const n = pos ? pos.cnt[c] + pos.hand[c] : 9;
        return `<span class="hs ${pos && pos.side === c && !over ? 'on' : ''}"><i class="dk" style="${DOT[c]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${n}</b></span>`;
      };
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg, big) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'mmtoast' + (big ? ' big' : ''); toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, big ? 1100 : 2400);
    }
    const phase = (p, c) => p.hand[c] > 0 ? X.ph[0] : p.flying(c) ? X.ph[2] : X.ph[1];

    /* ---------- flow ---------- */
    function status() {
      const st = pos.status();
      if (st === -1) return { over: true, winner: 3 - pos.side, why: pos.cnt[pos.side] + pos.hand[pos.side] < 3 ? 'count' : 'block' };
      if (st === 2) return { over: true, winner: 0, why: pos.cnt[1] + pos.cnt[2] === G.n && !pos.placing() ? 'full' : 'quiet' };
      let c = 0; for (const h of hashes) if (h === pos.h1) c++;
      if (c >= 3) return { over: true, winner: 0, why: 'rep' };
      return { over: false };
    }
    function replay() { const r = E.replay(RULE, null, moves); pos = r.pos; hashes = r.hashes; }
    function play(m) {   // returns the ms until the pieces have landed
      const before = pos, mover = before.side, fly = mFrom(m) !== NONE && before.flying(mover);
      moves.push(m); pos.play(m); hashes.push(pos.h1); ply++; hintMv = -1; sel = null; hintJ++;
      const w = set.sync(Object.assign(stateOf(pos), { fly }));
      showMarks(); onTurn();
      if (mRm(m) !== NONE) { const ml = millOf(pos.b, mTo(m)); later(() => set.mill([...new Set(ml.flat())]), Math.min(w, 420)); }
      else later(() => set.mill(null), 200);
      return w;
    }
    function next() {
      if (stopped) return;
      const s = status();
      if (s.over) return end(s);
      showMarks(); onTurn();
      const ph = phase(pos, pos.side);
      if (pvp) { hud(fmt(TN, pname(pos.side)) + ' · ' + ph); busy = false; return; }
      if (pos.side === human) { hud(L.turn + ' · ' + ph); busy = false; if (pos.flying(human) && !pos.placing()) toast(X.fly); return; }
      aiMove();
    }
    function end(s) {
      over = true; busy = false; sel = null; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !s.winner, wt = draw ? '' : fmt(X.win, pname(s.winner)), why = X.why[s.why] || '';
      if (pvp) { hud(wt || L.draw); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt }), 1100); return; }
      const win = s.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: why }), 1100);
    }
    function aiMove() {
      busy = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m === undefined || m === null || m < 0) { try { m = E.think(RULE, null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }   // the worker failed: a quick search on the page
        later(() => {
          if (id !== jid || over) return;
          if (!(m >= 0) || !pos.moves().includes(m)) { busy = false; hud(''); return; }
          const w = play(m); later(next, w + 120);
        }, Math.max(0, 480 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? -1 : r.move); };
      worker.onerror = () => { worker = null; reply(-1); };
      worker.postMessage({ type: 'think', id, variant: RULE, start: null, moves: mvs, level: ctx.level });
    }

    /* ---------- input: tap a point (placing), a piece then a point (moving / flying), then the piece to take ---------- */
    function pointOf(e) { const p = T3.pick(e, Y); return p ? set.pointAt(p.x, p.z) : -1; }
    function cancelSel() {
      if (!sel) return;
      if (sel.stage === 'pick') set.lift(sel.from, false);
      sel = null; set.mill(null); set.sync(stateOf(pos)); showMarks();
    }
    function commit(m) {
      busy = true; const w = play(m); hud(''); later(next, w + 120);
    }
    function onClick(e) {
      if (over || busy || !pos || T3.wasDrag()) return;
      if (!pvp && pos.side !== human) return;
      const i = pointOf(e), p = pos.side, legal = pos.moves();
      if (i < 0) { cancelSel(); return; }
      if (sel && sel.stage === 'remove') {
        const m = sel.cands.find(x => mRm(x) === i);
        if (m !== undefined) { commit(m); return; }
        toast(pos.b[i] === 3 - p ? X.cantRm : X.rm); return;
      }
      if (pos.hand[p] > 0) {
        if (pos.b[i]) { toast(X.empty); set.clack('board'); return; }
        const c = legal.filter(m => mFrom(m) === NONE && mTo(m) === i);
        if (!c.length) return;
        if (c.length === 1) { if (mRm(c[0]) !== NONE) toast(X.mill, true); commit(c[0]); return; }
        sel = { from: NONE, to: i, stage: 'remove', cands: c };   // a mill: the piece goes down, then pick the one to take
        set.sync(stateOf(pos, { at: i, c: p, from: NONE }));
        later(() => { if (sel && sel.to === i) { set.mill(millOf(Object.assign(Array.from(pos.b), { [i]: p }), i).flat()); } }, 380);
        toast(X.mill, true); showMarks(); return;
      }
      if (pos.b[i] === p) {
        if (sel && sel.from === i) { cancelSel(); return; }
        const c = legal.filter(m => mFrom(m) === i);
        if (!c.length) { toast(X.stuck); return; }
        if (sel) set.lift(sel.from, false);
        sel = { from: i, stage: 'pick', cands: c }; set.lift(i, true); set.clack('felt'); showMarks(); return;
      }
      if (!sel) { toast(X.own); return; }
      if (pos.b[i]) { cancelSel(); return; }
      const c = sel.cands.filter(m => mTo(m) === i);
      if (!c.length) { toast(X.cantMv); return; }
      if (c.length === 1) { if (mRm(c[0]) !== NONE) toast(X.mill, true); commit(c[0]); return; }
      const from = sel.from;   // closes a mill: the piece moves there, then pick the one to take
      set.lift(from, false);
      sel = { from, to: i, stage: 'remove', cands: c };
      set.sync(Object.assign(stateOf(pos, { at: i, c: p, from }), { fly: pos.flying(p) }));
      later(() => { if (sel && sel.to === i) { const b = Array.from(pos.b); b[from] = 0; b[i] = p; set.mill(millOf(b, i).flat()); } }, 380);
      toast(X.mill, true); showMarks();
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; jid++;
      G = E.geom(RULE); moves = []; replay(); over = false; busy = true; sel = null;
      set.sync(stateOf(pos), false); showMarks();
      hud(''); later(next, 650);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; worker = new Worker(BASE + 'engine.js' + VER); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: i => { const [x, z] = set.xz(i); return T3.project(x, z, Y); },
      state: () => ({ moves: moves.slice(), side: pos && pos.side, human, over, busy, pvp, sel: sel && { stage: sel.stage, from: sel.from, to: sel.to, rm: sel.cands.map(mRm) }, b: pos && Array.from(pos.b), hand: pos && [pos.hand[1], pos.hand[2]], onBoard: set.count(), hint: hintMv }),
      legal: () => pos ? pos.moves().map(m => ({ f: mFrom(m), t: mTo(m), r: mRm(m) })) : [],
      set,
    };
    window.Atlas3D.morris._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!pos && !over && !busy && (pvp || pos.side === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` loses
      if (over || !pos) return;
      over = true; busy = false; jid++; sel = null; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = fmt(X.win, pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() + (pvp || human === 1 ? 0 : 1),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++; hintJ++; hintMv = -1;
        if (sel && sel.stage === 'pick') set.lift(sel.from, false);
        sel = null; moves.splice(moves.length - undoN()); replay(); ply++;
        set.mill(null); set.sync(stateOf(pos));
        busy = true; next();
      },
      canHint: () => myTurn() && !sel,
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = new Worker(BASE + 'engine.js' + VER);
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (!(m >= 0) || !pos.moves().includes(m)) return res(false);
            hintMv = m; showMarks();
            later(() => { if (hintMv === m && j === hintJ) { hintMv = -1; showMarks(); } }, 4200);
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, variant: RULE, start: null, moves: mvs, level: Math.max(8, Math.min(9, ctx.level + 2)) });
        });
      },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        set.dispose();
        if (window.Atlas3D.morris._dbg === dbg) delete window.Atlas3D.morris._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {"ja":{"lv":["","入門","初級","初級+","中級","中級+","上級","上級+","達人","名人","最強"],"lvd":["","ときどき見落とす","1手読み","2手読み","3手読み","4手読み","5手読み","6手読み","約0.7秒・8手読み","約1.5秒・深読み","約3秒・最深読み"]},"en":{"lv":["","Novice","Beginner","Beginner+","Intermediate","Intermediate+","Advanced","Advanced+","Expert","Master","Strongest"],"lvd":["","misses things now and then","1-ply","2-ply","3-ply","4-ply","5-ply","6-ply","≈0.7 s, 8-ply","≈1.5 s, deep search","≈3 s, deepest search"]},"zh":{"lv":["","入门","初级","初级+","中级","中级+","高级","高级+","专家","大师","最强"],"lvd":["","偶尔会看漏","1步","2步","3步","4步","5步","6步","约0.7秒・8步","约1.5秒・深度计算","约3秒・最深计算"]},"ko":{"lv":["","입문","초급","초급+","중급","중급+","상급","상급+","달인","명인","최강"],"lvd":["","가끔 놓친다","1수 읽기","2수 읽기","3수 읽기","4수 읽기","5수 읽기","6수 읽기","약 0.7초・8수 읽기","약 1.5초・깊은 읽기","약 3초・가장 깊은 읽기"]},"es":{"lv":["","Novato","Principiante","Principiante+","Intermedio","Intermedio+","Avanzado","Avanzado+","Experto","Maestro","Máximo"],"lvd":["","a veces se le escapan cosas","1 jugada","2 jugadas","3 jugadas","4 jugadas","5 jugadas","6 jugadas","≈0,7 s, 8 jugadas","≈1,5 s, búsqueda profunda","≈3 s, la más profunda"]},"fr":{"lv":["","Novice","Débutant","Débutant+","Intermédiaire","Intermédiaire+","Avancé","Avancé+","Expert","Maître","Maximal"],"lvd":["","laisse parfois passer des choses","1 coup","2 coups","3 coups","4 coups","5 coups","6 coups","≈0,7 s, 8 coups","≈1,5 s, recherche profonde","≈3 s, la plus profonde"]},"pt":{"lv":["","Novato","Iniciante","Iniciante+","Intermediário","Intermediário+","Avançado","Avançado+","Especialista","Mestre","Máximo"],"lvd":["","às vezes deixa passar","1 lance","2 lances","3 lances","4 lances","5 lances","6 lances","≈0,7 s, 8 lances","≈1,5 s, busca profunda","≈3 s, a mais profunda"]},"de":{"lv":["","Neuling","Anfänger","Anfänger+","Mittel","Mittel+","Fortgeschritten","Fortgeschritten+","Experte","Meister","Maximal"],"lvd":["","übersieht manchmal etwas","1 Halbzug","2 Halbzüge","3 Halbzüge","4 Halbzüge","5 Halbzüge","6 Halbzüge","≈0,7 s, 8 Halbzüge","≈1,5 s, tiefe Suche","≈3 s, tiefste Suche"]},"hi":{"lv":["","नौसिखिया","शुरुआती","शुरुआती+","मध्यम","मध्यम+","उन्नत","उन्नत+","विशेषज्ञ","उस्ताद","सबसे मज़बूत"],"lvd":["","कभी-कभी चूक जाता है","1 चाल","2 चालें","3 चालें","4 चालें","5 चालें","6 चालें","≈0.7 से, 8 चालें","≈1.5 से, गहरी खोज","≈3 से, सबसे गहरी खोज"]},"ar":{"lv":["","مبتدئ جدًا","مبتدئ","مبتدئ+","متوسط","متوسط+","متقدم","متقدم+","خبير","أستاذ","الأقوى"],"lvd":["","يغفل أحيانًا","نقلة واحدة","نقلتان","3 نقلات","4 نقلات","5 نقلات","6 نقلات","≈0.7 ث، 8 نقلات","≈1.5 ث، بحث عميق","≈3 ث، أعمق بحث"]}};
  const RATING = [0, 350, 550, 1000, 1400, 1650, 1750, 1900, 2350, 2500, 2550];   // morris RT_LV (rated games)
  const W6 = (a, b, c, d, e, f) => [a, a, b, b, c, c, d, d, e, f];
  const WHO = {
    ja: W6('はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '上級者でも手ごわい', '最強レベル'),
    en: W6('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'tough even for experts', 'the very strongest'),
    zh: W6('适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '高手也觉得难缠', '最强等级'),
    ko: W6('처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '고수도 버거운', '최강 레벨'),
    es: W6('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'difícil incluso para expertos', 'el más fuerte'),
    fr: W6('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'coriace même pour les experts', 'le plus fort'),
    pt: W6('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'difícil até para experts', 'o mais forte'),
    de: W6('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'selbst für Profis knifflig', 'die stärkste Stufe'),
    hi: W6('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'विशेषज्ञों के लिए भी कठिन', 'सबसे मज़बूत स्तर'),
    ar: W6('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'صعب حتى على الخبراء', 'أقوى مستوى'),
  };
  function levelInfo(n, lang) {   // n = 1..10
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    return { name: L.lv[n], desc: L.lvd[n], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.morris = { levels: 10, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
