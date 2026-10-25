/* =====================================================================
   Hex on the portal.
   · The board card (levels, sides, modes, board size): level names / descriptions come from
     the game (hex/i18n.js: 15級 … 五段), ratings = the game's RT_LV.
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D walnut hex board (atlas/table3d.js
     MODELS.hex) with the full game's rules and AI — ../hex/engine.js on the page (rules: placing,
     the swap rule, the winning chain) and the same file as a Worker (MCTS + the connection solver,
     levels 1..20), asked exactly as hex/app.js asks it ({ type:'think', start:{ n, swap }, moves, level }).
     Boards 7 / 9 / 11 / 13, the swap rule on (a Swap button in the HUD on Blue's first move).
     ctx.mode 'pvp': two players take turns on one device (Red first).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../hex/', VER = '?v=1';   // same file / version as hex/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.HexEngine) return Promise.resolve(window.HexEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.HexEngine ? res(window.HexEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (hex/i18n.js)
  const TX = {
    ja: { n: ['赤', '青'], turn: '{p}の番', win: '{p}の勝ち', conn: '{p}が2辺をつないだ', swap: 'スワップ', swapped: '{p}がスワップ：1手目の石が青に', taken: 'そのマスにはもう石があります', size: '盤', swapOk: '石を打つか、スワップ' },
    en: { n: ['Red', 'Blue'], turn: '{p} to move', win: '{p} wins', conn: '{p} joined its edges', swap: 'Swap', swapped: '{p} swapped: the first stone is Blue\'s', taken: 'That cell is taken', size: 'Board', swapOk: 'Play a stone, or swap' },
    zh: { n: ['红', '蓝'], turn: '轮到{p}', win: '{p}胜', conn: '{p}连通了两条边', swap: '交换', swapped: '{p}交换：第一手变成蓝方', taken: '该格已有棋子', size: '棋盘', swapOk: '落子或交换' },
    ko: { n: ['빨강', '파랑'], turn: '{p} 차례', win: '{p} 승리', conn: '{p}이(가) 두 변을 이었다', swap: '스왑', swapped: '{p} 스왑: 첫 수의 돌이 파랑으로', taken: '이미 돌이 있는 칸입니다', size: '판', swapOk: '돌을 두거나 스왑' },
    es: { n: ['Rojo', 'Azul'], turn: 'Turno: {p}', win: 'Gana {p}', conn: '{p} unió sus bordes', swap: 'Cambiar', swapped: '{p} cambió: la primera piedra es azul', taken: 'Esa casilla está ocupada', size: 'Tablero', swapOk: 'Juega una piedra o cambia' },
    fr: { n: ['Rouge', 'Bleu'], turn: 'Trait : {p}', win: 'Victoire de {p}', conn: '{p} a relié ses bords', swap: 'Échanger', swapped: '{p} a échangé : la première pierre est bleue', taken: 'Cette case est prise', size: 'Plateau', swapOk: 'Posez une pierre ou échangez' },
    pt: { n: ['Vermelho', 'Azul'], turn: 'Vez: {p}', win: 'Vitória de {p}', conn: '{p} ligou suas bordas', swap: 'Trocar', swapped: '{p} trocou: a primeira pedra é azul', taken: 'Essa casa está ocupada', size: 'Tabuleiro', swapOk: 'Jogue uma pedra ou troque' },
    de: { n: ['Rot', 'Blau'], turn: '{p} am Zug', win: '{p} gewinnt', conn: '{p} hat seine Ränder verbunden', swap: 'Tauschen', swapped: '{p} hat getauscht: Der erste Stein ist blau', taken: 'Das Feld ist besetzt', size: 'Brett', swapOk: 'Stein setzen oder tauschen' },
    hi: { n: ['लाल', 'नीला'], turn: '{p} की बारी', win: '{p} की जीत', conn: '{p} ने अपने किनारे जोड़े', swap: 'स्वैप', swapped: '{p} ने स्वैप किया: पहली गोटी नीली', taken: 'वह खाना भरा है', size: 'बोर्ड', swapOk: 'गोटी रखें या स्वैप करें' },
    ar: { n: ['الأحمر', 'الأزرق'], turn: 'دور {p}', win: 'فوز {p}', conn: 'وصل {p} حافتيه', swap: 'تبديل', swapped: 'بدّل {p}: الحجر الأول صار أزرق', taken: 'هذه الخانة مشغولة', size: 'الرقعة', swapOk: 'ضع حجرًا أو بدّل' },
  };

  // a glazed stone set down on walnut: a bright "tock" (respects the portal's sound switch)
  let AC = null;
  function tock(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .04 | 0, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 5);
      n.buffer = b; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3600 * v; bp.Q.value = 1.4;
      const g = AC.createGain(); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .04); n.connect(bp).connect(g).connect(AC.destination); n.start(t);
      const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(520 * v, t); o.frequency.exponentialRampToValueAtTime(220, t + .06);
      og.gain.setValueAtTime(.2, t); og.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .1);
    } catch (e) {}
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.hxtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:hxT .2s ease-out;pointer-events:none}
@keyframes hxT{from{transform:translate(-50%,8px);opacity:0}}
.dk.hr{background:radial-gradient(circle at 35% 30%,#ff9a8a,#d2301f 55%,#7a0d07)}
.dk.hb{background:radial-gradient(circle at 35% 30%,#a5d4ff,#2463c9 55%,#0b2c6e)}
.hud .hxswap{flex:none;padding:7px 16px;font-size:14px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}
.hud .hxswap:disabled{opacity:.4;box-shadow:none}
.hud .hxswap[hidden]{display:none}
@media (max-width:560px){.hud .hxswap{padding:6px 10px;font-size:13px}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, GB = T3.goban, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const n = [7, 9, 11, 13].includes(+ctx.size) ? +ctx.size : 9;
    const board = T3.MODELS.hex(true, { n }); T3.show('hex', board);
    const U = board.userData, Y = U.top, c = U.cell;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + 1.2, d: U.D + 3.0, y: Y - .3, pitch: 1.05 } : { w: U.W + .6, d: U.D + 2.4, y: Y - .4, pitch: 1.05 });   // the whole board from the player's side
    const pvp = ctx.mode === 'pvp', human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    const pname = col => X.n[col - 1], fmt = (s, p) => s.replace('{p}', p);
    const START = { n, swap: true };
    const xz = m => U.pt(m);

    let E = null, pos = null, moves = [], stopped = false, busy = true, over = false, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintM = -1;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side - 1, { human: pvp || pos.side === human, ply }); };   // HUD pills: red (left) 0, blue 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };

    /* ---------- stones ---------- */
    const stones = new TH.Group(), marks = new TH.Group(); board.add(stones, marks);
    const st = {};   // cell → group
    function place(m, col, animate) {
      const g = new TH.Group(), s = U.stone(col), sh = T3.contact(c * .44, .5); sh.position.y = .002; g.add(sh, s); g.userData.s = s; g.userData.sh = sh;
      const [x, z] = xz(m); g.position.set(x, Y, z); stones.add(g); st[m] = g;
      if (!animate) return 0;
      const h0 = c * 1.3; s.position.y = h0; sh.material.opacity = 0;
      anim(300, k => {
        const hh = k < .7 ? h0 * (1 - Math.pow(k / .7, 2)) : 0; s.position.y = hh; sh.material.opacity = .5 * Math.min(1, k * 1.3);
        if (k > .7) { const q = (k - .7) / .3, sq = Math.sin(q * Math.PI) * .08; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); }
      }, () => { s.position.y = 0; s.scale.set(1, 1, 1); });
      later(() => tock(col === 1 ? 1 : 1.1), 210);
      return 320;
    }
    function drop(m) { const g = st[m]; if (!g) return; stones.remove(g); g.userData.sh.material.dispose(); delete st[m]; }
    function redraw() { Object.keys(st).forEach(k => drop(+k)); for (let i = 0; i < n * n; i++) if (pos.b[i]) place(i, pos.b[i], false); kick(300); }

    /* ---------- marks: the last move, the hint, the winning chain ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffffff, .95), win: basic(0xffd24a, .9) };
    const GEO = { last: new TH.CylinderGeometry(c * .1, c * .1, .01, 24), win: new TH.TorusGeometry(c * .46, c * .05, 8, 40) };
    GEO.win.rotateX(Math.PI / 2);
    const H = c * .26;   // stone height
    let pulsing = [], pulseOn = false;
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); pulsing = []; kick(); }
    function addMark(geo, mat, m, y) { const k = new TH.Mesh(geo, mat), [x, z] = xz(m); k.position.set(x, Y + y, z); k.renderOrder = 3; marks.add(k); return k; }
    function showMarks() {
      clearMarks(); hintM = -1; hintJ++;
      if (pos && pos.last >= 0 && pos.b[pos.last]) addMark(GEO.last, MAT.last, pos.last, H + .004);
    }
    function pulse() { if (stopped || !pulsing.length) { pulseOn = false; return; } const now = performance.now(); pulsing.forEach(m => m.userData.tick(now)); kick(60); requestAnimationFrame(pulse); }
    function winLine(path) {
      path.forEach((m, i) => later(() => {
        const g = st[m]; if (g) anim(380, k => { g.userData.s.position.y = Math.sin(k * Math.PI) * c * .35; });
        const r = addMark(GEO.win, MAT.win, m, .02); r.scale.setScalar(.01); anim(300, k => r.scale.setScalar(.01 + k));
        tock(1.2 + i * .05);
      }, i * 90));
    }

    /* ---------- HUD (red pill · swap · blue pill) ---------- */
    let msgNow = '';
    function hud(msg) {
      if (msg !== undefined) msgNow = msg || '';
      const side = col => `<span class="hs ${pos && pos.side === col && !over ? 'on' : ''}"><i class="dk ${col === 1 ? 'hr' : 'hb'}"></i>${pvp ? pname(col) : col === human ? L.you : L.ai}</span>`;
      const canSwap = myTurn() && pos.swapOk;
      ctx.hud(`${side(1)}<span class="hm">${msgNow}</span><button type="button" class="btn hxswap" data-hxs="swap" ${canSwap ? '' : 'hidden'}>⇄ ${X.swap}</button>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'hxtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }

    /* ---------- flow ---------- */
    const myTurn = () => !!pos && !over && !busy && (pvp || pos.side === human);
    function play(m) {   // → ms to wait for the stone to land
      const col = pos.side;
      moves.push(m); pos.play(m); ply++; onTurn();
      if (m === E.SWAP) { redraw(); toast(fmt(X.swapped, pname(col))); tock(.8); showMarks(); return 420; }
      const w = place(m, col, true); showMarks(); return w;
    }
    function next() {
      if (stopped || over) return;
      const w = pos.winner();
      if (w) return end(w);
      showMarks(); onTurn();
      if (pvp) { busy = false; hud(pos.swapOk ? X.swapOk : fmt(X.turn, pname(pos.side))); return; }
      if (pos.side === human) { busy = false; hud(pos.swapOk ? X.swapOk : L.turn); return; }
      aiMove();
    }
    function end(w) {
      over = true; busy = false; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const path = pos.path(w); if (path) winLine(path);
      const wt = fmt(X.win, pname(w)), why = fmt(X.conn, pname(w));
      if (pvp) { hud(wt); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: why, pvp: true, winnerText: wt }), 1500); return; }
      const win = w === human;
      hud(win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw: false, level: ctx.level, score: why }), 1500);
    }
    function aiMove() {
      busy = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m === undefined || m === null || m < 0) { const e = pos.moves().filter(x => x !== E.SWAP); m = e.length ? e[Math.floor(Math.random() * e.length)] : -1; }   // the worker failed: any cell
        later(() => {
          if (id !== jid || over) return;
          if (m < 0 || !pos.legal(m)) { busy = false; hud(''); return; }
          const w = play(m); later(next, w + 60);
        }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? -1 : r.move); };
      worker.onerror = () => { worker = null; reply(-1); };
      worker.postMessage({ type: 'think', id, start: START, moves: mvs, level: ctx.level });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let best = -1, bd = 1e9; for (let i = 0; i < n * n; i++) { const [x, z] = xz(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return bd < c * .58 ? best : -1;
    }
    function onClick(e) {
      if (over || busy || !pos || T3.wasDrag() || (e.target.closest && e.target.closest('.hud,.tbar'))) return;
      if (!pvp && pos.side !== human) return;
      const m = cellOf(e); if (m < 0) return;
      if (pos.at(m)) { toast(X.taken); tock(.6); return; }
      busy = true; const w = play(m); hud(''); later(next, w + 60);
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-hxs]'); if (!b || stopped) return;
      e.stopPropagation();
      if (myTurn() && pos.swapOk) { busy = true; const w = play(E.SWAP); hud(''); later(next, w + 60); }
    }
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onHud, true);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; jid++;
      Object.keys(st).forEach(k => drop(+k));
      moves = []; pos = new E.Pos(n, true); over = false; busy = true;
      hud(''); toast(`${n}×${n}`);
      later(next, 650);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; worker = new Worker(BASE + 'engine.js' + VER); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: m => { const [x, z] = xz(m); return T3.project(x, z, Y); },
      state: () => ({ n, hint: hintM, moves: moves.slice(), side: pos && pos.side, swapOk: !!(pos && pos.swapOk), human, over, busy, pvp, stones: Object.keys(st).length, winner: pos ? pos.winner() : 0 }),
    };
    window.Atlas3D.hex._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (1 red, 2 blue) loses
      if (over || !pos) return;
      over = true; busy = false; jid++; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = fmt(X.win, pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() + (pvp || human === 1 ? 0 : 1),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++;
        moves.splice(moves.length - undoN());
        pos = E.replay(START, moves).pos; ply++; redraw();
        busy = true; next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = new Worker(BASE + 'engine.js' + VER);
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move;
            if (m === E.SWAP) { toast('💡 ' + X.swap); return res(true); }
            if (!(m >= 0) || !pos.legal(m)) return res(false);
            hintM = m;
            const g = GB ? GB.tapMark(c) : new TH.Mesh(GEO.win, MAT.win), [x, z] = xz(m); g.position.set(x, Y, z); marks.add(g);   // the same vivid "here" marker as the go boards'
            if (g.userData.tick) { pulsing.push(g); if (!pulseOn) { pulseOn = true; pulse(); } later(() => { pulsing = pulsing.filter(q => q !== g); kick(); }, 2600); }
            kick(300); res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: START, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
        });
      },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.hex._dbg === dbg) delete window.Atlas3D.hex._dbg;
      },
      _debug: dbg,
    };
    css();
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {
    ja: { kyu: '{n}級', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入門：相手の狙いをよく見落とす', '初級〜中級：ブリッジを作り、直接の狙いは止める', '上級：ラダーや詰み筋を読み切る', '有段：深い読み（考える時間が長め）'] },
    en: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Novice: often misses the opponent\'s threats', 'Beginner to club: makes bridges, blocks direct threats', 'Advanced: reads ladders and forced connections', 'Expert: deep search (thinks longer)'] },
    zh: { kyu: '{n}级', dan: ['初段', '二段', '三段', '四段', '五段'], lvd: ['入门：常看漏对手的威胁', '初级～中级：会搭桥，能挡住直接威胁', '高级：能算清梯子和强制连通', '段位：深度计算（思考时间较长）'] },
    ko: { kyu: '{n}급', dan: ['초단', '2단', '3단', '4단', '5단'], lvd: ['입문: 상대의 노림을 자주 놓침', '초급~중급: 브리지를 만들고 직접적인 노림은 막음', '상급: 래더와 강제 연결을 읽음', '유단: 깊은 수읽기(생각 시간이 김)'] },
    es: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Iniciación: a menudo no ve las amenazas', 'Principiante a club: hace puentes, para amenazas directas', 'Avanzado: calcula escaleras y conexiones forzadas', 'Experto: búsqueda profunda (piensa más)'] },
    fr: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Initiation : rate souvent les menaces', 'Débutant à club : fait des ponts, pare les menaces directes', 'Avancé : calcule échelles et connexions forcées', 'Expert : recherche profonde (réfléchit plus longtemps)'] },
    pt: { kyu: '{n} kyu', dan: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], lvd: ['Iniciação: muitas vezes não vê as ameaças', 'Iniciante a clube: faz pontes, para ameaças diretas', 'Avançado: calcula escadas e conexões forçadas', 'Especialista: busca profunda (pensa mais)'] },
    de: { kyu: '{n}. Kyu', dan: ['1. Dan', '2. Dan', '3. Dan', '4. Dan', '5. Dan'], lvd: ['Einstieg: übersieht oft Drohungen', 'Anfänger bis Klub: baut Brücken, stoppt direkte Drohungen', 'Fortgeschritten: rechnet Leitern und erzwungene Verbindungen', 'Experte: tiefe Suche (denkt länger)'] },
    hi: { kyu: '{n} क्यू', dan: ['1 दान', '2 दान', '3 दान', '4 दान', '5 दान'], lvd: ['शुरुआत: अक्सर विरोधी के ख़तरे चूक जाता है', 'नौसिखिया से क्लब: ब्रिज बनाता है, सीधे ख़तरे रोकता है', 'उन्नत: सीढ़ियाँ और मजबूर कनेक्शन पढ़ता है', 'विशेषज्ञ: गहरी खोज (ज़्यादा सोचता है)'] },
    ar: { kyu: '{n} كيو', dan: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'], lvd: ['مبتدئ جدًا: يفوّت كثيرًا تهديدات الخصم', 'مبتدئ إلى نادٍ: يبني الجسور ويوقف التهديدات المباشرة', 'متقدم: يحسب السلالم والاتصالات القسرية', 'خبير: بحث عميق (يفكر وقتًا أطول)'] },
  };
  const RATING = [0, 450, 560, 670, 835, 1000, 1165, 1365, 1490, 1555, 1650, 1690, 1730, 1795, 1835, 1875, 1915, 1955, 1995, 2035, 2095];   // hex RT_LV (rated games)
  const W7 = (a, b, c, d, e, f) => [a, a, a, b, b, b, c, c, c, d, d, d, e, e, e, e, e, e, e, f];
  const WHO = {
    ja: W7('はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '上級者でも手ごわい', '最強レベル'),
    en: W7('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'tough even for experts', 'the very strongest'),
    zh: W7('适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '高手也觉得难缠', '最强等级'),
    ko: W7('처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '고수도 버거운', '최강 레벨'),
    es: W7('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'difícil incluso para expertos', 'el más fuerte'),
    fr: W7('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'coriace même pour les experts', 'le plus fort'),
    pt: W7('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'difícil até para experts', 'o mais forte'),
    de: W7('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'selbst für Profis knifflig', 'die stärkste Stufe'),
    hi: W7('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'विशेषज्ञों के लिए भी कठिन', 'सबसे मज़बूत स्तर'),
    ar: W7('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'صعب حتى على الخبراء', 'أقوى مستوى'),
  };
  function levelInfo(i, lang) {   // i = 1..20 (the game's level: 15 kyu … 5 dan)
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    const name = i <= 15 ? L.kyu.replace('{n}', 16 - i) : L.dan[i - 16];
    return { name, desc: L.lvd[i <= 4 ? 0 : i <= 9 ? 1 : i <= 15 ? 2 : 3], rating: RATING[i], who: W[i - 1] };
  }
  const SIZE_L = l => (TX[l] || TX.en).size;
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.hex = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', sizes: [9, 11, 13, 7], sizeLabel: SIZE_L, levelInfo, start };   // table: start() plays on the chabudai itself
})();
