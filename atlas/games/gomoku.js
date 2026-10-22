/* =====================================================================
   Gomoku & Renju on the portal.
   · The board card (levels, sides, modes): level names / descriptions come from
     the game (gomoku/i18n.js: 15級 … 五段), ratings = the game's RT_LV.
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D go board itself with the
     full game's rules and AI — ../gomoku/engine.js on the page (renju rules: the
     opening, black's forbidden 3-3 / 4-4 / overline, exactly five) and the same file
     as a Worker (alpha-beta + threat search + the neural evaluation, levels 1..20),
     asked exactly as gomoku/app.js asks it ({ type:'think', rule, moves, level }).
     ctx.mode 'pvp': two players take turns on one device (black first).
     Board: atlas/models/goban.js (look as chosen in the game's 3D skin, 'atlas-gomoku-look').
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../gomoku/', VER = '?v=20261021nn4';   // same file / version as gomoku/index.html → shared cache
  const RULE = 'renju';
  let engP = null;
  function loadEngine() {
    if (window.RenjuEngine) return Promise.resolve(window.RenjuEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.RenjuEngine ? res(window.RenjuEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (gomoku/i18n.js): forbidden points, the renju opening, the colours
  const TX = {"ja":{"f":"そこは黒の禁手（{k}）なので打てません。","k":["三三","四四","長連"],"o":["連珠ルールの1手目は天元（中央の h8）に打ちます。","連珠ルールの2手目は、天元のすぐ隣（8か所）に打ちます。","連珠ルールの3手目は、天元から2路以内に打ちます。"],"n":["黒","白"],"turn":"{p}の番","win":"{p}の勝ち","five":"五連","full":"盤が埋まって引き分け"},"en":{"f":"That point is forbidden for Black ({k}).","k":["3-3","4-4","overline"],"o":["In renju the first move goes on the centre point (h8).","In renju the second move goes right next to the centre (one of 8 points).","In renju the third move goes within two lines of the centre."],"n":["Black","White"],"turn":"{p} to move","win":"{p} wins","five":"Five in a row","full":"Board full: draw"},"zh":{"f":"该点是黑棋的禁手（{k}），不能下。","k":["三三","四四","长连"],"o":["连珠规则的第1手下在天元（中央的 h8）。","连珠规则的第2手下在天元紧邻的8个点之一。","连珠规则的第3手下在距天元2路以内。"],"n":["黑","白"],"turn":"轮到{p}","win":"{p}胜","five":"五连","full":"棋盘下满，和棋"},"ko":{"f":"그곳은 흑의 금수({k})라서 둘 수 없습니다.","k":["삼삼","사사","장목"],"o":["렌주 규칙의 1수째는 천원(중앙의 h8)에 둡니다.","렌주 규칙의 2수째는 천원 바로 옆(8곳)에 둡니다.","렌주 규칙의 3수째는 천원에서 2줄 이내에 둡니다."],"n":["흑","백"],"turn":"{p} 차례","win":"{p} 승리","five":"오목","full":"판이 가득 차 무승부"},"es":{"f":"Ese punto está prohibido para las negras ({k}).","k":["3-3","4-4","sobrelínea"],"o":["En renju la primera jugada va en el punto central (h8).","En renju la segunda jugada va justo al lado del centro (uno de 8 puntos).","En renju la tercera jugada va a dos líneas del centro como máximo."],"n":["Negras","Blancas"],"turn":"Turno: {p}","win":"Ganan {p}","five":"Cinco en línea","full":"Tablero lleno: tablas"},"fr":{"f":"Ce point est interdit pour Noir ({k}).","k":["3-3","4-4","overline"],"o":["Au renju, le premier coup se joue au point central (h8).","Au renju, le deuxième coup se joue juste à côté du centre (l'un des 8 points).","Au renju, le troisième coup se joue à deux lignes au plus du centre."],"n":["Noir","Blanc"],"turn":"Trait : {p}","win":"Victoire de {p}","five":"Cinq alignés","full":"Plateau plein : nulle"},"pt":{"f":"Esse ponto é proibido para as pretas ({k}).","k":["3-3","4-4","sobrelinha"],"o":["No renju o primeiro lance vai no ponto central (h8).","No renju o segundo lance vai logo ao lado do centro (um de 8 pontos).","No renju o terceiro lance vai a no máximo duas linhas do centro."],"n":["Pretas","Brancas"],"turn":"Vez: {p}","win":"Vitória das {p}","five":"Cinco em linha","full":"Tabuleiro cheio: empate"},"de":{"f":"Dieser Punkt ist für Schwarz verboten ({k}).","k":["3-3","4-4","Überlänge"],"o":["Bei Renju kommt der erste Zug auf den Mittelpunkt (h8).","Bei Renju kommt der zweite Zug direkt neben die Mitte (einer von 8 Punkten).","Bei Renju kommt der dritte Zug höchstens zwei Linien von der Mitte entfernt."],"n":["Schwarz","Weiß"],"turn":"{p} am Zug","win":"{p} gewinnt","five":"Fünf in einer Reihe","full":"Brett voll: Remis"},"hi":{"f":"वह बिंदु काले के लिए वर्जित है ({k})।","k":["3-3","4-4","ओवरलाइन"],"o":["रेंजू में पहली चाल केंद्र बिंदु (h8) पर होती है।","रेंजू में दूसरी चाल केंद्र के ठीक बगल में होती है (8 बिंदुओं में से एक)।","रेंजू में तीसरी चाल केंद्र से दो रेखाओं के भीतर होती है।"],"n":["काला","सफ़ेद"],"turn":"{p} की बारी","win":"{p} की जीत","five":"पाँच एक पंक्ति में","full":"बोर्ड भर गया: ड्रॉ"},"ar":{"f":"هذه النقطة محظورة على الأسود ({k}).","k":["3-3","4-4","خط طويل"],"o":["في رينجو تُلعب النقلة الأولى على نقطة المركز (h8).","في رينجو تُلعب النقلة الثانية بجوار المركز مباشرة (إحدى 8 نقاط).","في رينجو تُلعب النقلة الثالثة ضمن خطين من المركز."],"n":["الأسود","الأبيض"],"turn":"دور {p}","win":"فوز {p}","five":"خمسة في صف","full":"امتلأت الرقعة: تعادل"}};

  // a slate / shell stone set down on kaya: a sharp "pachi" and a short woody thud (respects the portal's sound switch)
  let AC = null;
  function pachi(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .05 | 0, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      n.buffer = b; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 * v; bp.Q.value = 1.6;
      const g = AC.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); n.connect(bp).connect(g).connect(AC.destination); n.start(t);
      const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300 * v, t); o.frequency.exponentialRampToValueAtTime(130, t + .07);
      og.gain.setValueAtTime(.22, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .12);
    } catch (e) {}
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.gmtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:gmT .2s ease-out;pointer-events:none}
@keyframes gmT{from{transform:translate(-50%,8px);opacity:0}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, GB = T3.goban, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.gomoku(true); T3.show('gomoku', board);
    const U = board.userData, Y = U.top, c = U.cell;
    const tall = innerHeight > innerWidth * 1.15;   // phones held upright: the width decides, so frame a little wider and keep the board centred
    if (T3.fit) T3.fit(tall ? { w: U.W + 1.9, d: U.W + 3.4, y: Y - 1.3, pitch: 1.0 } : { w: U.W + .6, d: U.W + 3.4, y: Y - 2.4, pitch: 1.0 });   // the whole board from the player's side: the near side and the legs show
    const pvp = ctx.mode === 'pvp', human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    const pname = col => X.n[col - 1], fmt = (s, p) => s.replace('{p}', p);
    const xz = m => U.pt(m % 15, 14 - Math.floor(m / 15));

    let E = null, pos = null, moves = [], stopped = false, busy = true, over = false, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0, hintM = -1;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side - 1, { human: pvp || pos.side === human, ply }); };   // HUD pills: black (left) 0, white 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };

    /* ---------- stones ---------- */
    const stones = new TH.Group(), marks = new TH.Group(); board.add(stones, marks);
    const st = {};   // cell → group
    function place(m, col, animate) {
      const g = new TH.Group(), s = GB.stone(col, c, m * 7 + col), sh = T3.contact(c * .47, .5); sh.position.y = .002; g.add(sh, s);
      const [x, z] = xz(m); g.position.set(x, Y, z); stones.add(g); st[m] = g;
      if (!animate) return 0;
      const z0 = c * .45, h0 = c * 1.1; s.position.set(0, h0, z0); s.rotation.x = -.4; sh.material.opacity = 0;
      anim(300, k => {
        const e = 1 - Math.pow(1 - k, 3), hh = k < .72 ? h0 * (1 - Math.pow(k / .72, 2)) : 0;
        s.position.y = hh; s.position.z = z0 * (1 - e); s.rotation.x = -.4 * (1 - Math.min(1, k / .72)); sh.material.opacity = .5 * Math.min(1, k * 1.3);
        if (k > .72) { const q = (k - .72) / .28, sq = Math.sin(q * Math.PI) * .06; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); }
      }, () => { s.position.set(0, 0, 0); s.rotation.x = 0; s.scale.set(1, 1, 1); });
      later(() => pachi(col === 1 ? 1 : 1.12), 215);
      return 320;
    }
    /* ---------- marks: the last move, black's forbidden points, the opening area, the winning five ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xff3b2b, .95), forb: basic(0xe0301e, .85), area: basic(0xff2e5b, .16), ring: basic(0xffc928, .9), win: basic(0xffd24a, .9) };
    const GEO = { last: new TH.CylinderGeometry(c * .1, c * .1, .01, 24), bar: new TH.BoxGeometry(c * .42, .012, c * .07), area: new TH.PlaneGeometry(1, 1), ring: new TH.TorusGeometry(c * .3, c * .045, 8, 36), win: new TH.TorusGeometry(c * .5, c * .05, 8, 40) };
    GEO.ring.rotateX(Math.PI / 2); GEO.win.rotateX(Math.PI / 2); GEO.area.rotateX(-Math.PI / 2);
    const H = c * .47 * GB.SH * 2;   // stone height
    let pulsing = [], pulseOn = false;
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); pulsing = []; kick(); }
    function addMark(geo, mat, m, y) { const k = new TH.Mesh(geo, mat), [x, z] = xz(m); k.position.set(x, Y + y, z); k.renderOrder = 3; marks.add(k); return k; }
    function showMarks() {
      clearMarks(); hintM = -1; hintJ++;
      if (moves.length) addMark(GEO.last, MAT.last, moves[moves.length - 1], H + .004);
      if (over) return;
      const blackTurn = pos.side === 1, mine = pvp || pos.side === human;
      if (!mine) return;
      if (pos.renju && blackTurn) pos.forbiddenList().forEach(f => { [1, -1].forEach(sg => { const b = addMark(GEO.bar, MAT.forb, f.m, .01); b.rotation.y = sg * Math.PI / 4; }); });
      if (pos.renju && pos.fresh && pos.ply <= 2) {   // the renju opening: where the next stone may go
        const r = pos.ply, a = addMark(GEO.area, MAT.area, 112, .006); a.scale.set((2 * r + 1) * c, 1, (2 * r + 1) * c);
        if (r === 0) { const g = GB.tapMark(c), [x, z] = xz(112); g.position.set(x, Y, z); marks.add(g); pulsing.push(g); }   // the first stone: here
      }
      if (pulsing.length && !pulseOn) { pulseOn = true; pulse(); }
    }
    function pulse() { if (stopped || !pulsing.length) { pulseOn = false; return; } const now = performance.now(); pulsing.forEach(m => m.userData.tick(now)); kick(60); requestAnimationFrame(pulse); }
    function winLine(line) {
      line.forEach((m, i) => later(() => {
        const g = st[m]; if (g) anim(380, k => { g.children[1].position.y = Math.sin(k * Math.PI) * c * .35; });
        const r = addMark(GEO.win, MAT.win, m, .02); r.scale.setScalar(.01); anim(300, k => r.scale.setScalar(.01 + k));
        pachi(1.3 + i * .08);
      }, i * 110));
    }

    /* ---------- HUD ---------- */
    function hud(msg) {
      const side = col => `<span class="hs ${pos && pos.side === col && !over ? 'on' : ''}"><i class="dk ${col === 1 ? 'b' : 'w'}"></i>${pvp ? pname(col) : col === human ? L.you : L.ai}</span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'gmtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }

    /* ---------- flow ---------- */
    function status() {
      let s = pos.status();
      if (!s.over && pos.side === 1 && pos.renju && !pos.legal().length) s = { over: true, winner: 2, why: 'nomove' };
      return s;
    }
    function play(m, col) {
      moves.push(m); pos.make(m); ply++; onTurn();
      const wait = place(m, col, true); showMarks(); return wait;
    }
    function next() {
      if (stopped) return;
      const s = status();
      if (s.over) return end(s);
      showMarks(); onTurn();
      if (pvp) { hud(fmt(X.turn, pname(pos.side))); busy = false; return; }
      if (pos.side === human) { hud(L.turn); busy = false; return; }
      aiMove();
    }
    function end(s) {
      over = true; busy = false; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      if (s.line) winLine(s.line);
      const draw = !s.winner, wt = draw ? '' : fmt(X.win, pname(s.winner));
      if (pvp) { hud(wt || L.draw); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: draw ? X.full : X.five, pvp: true, winnerText: wt }), 1300); return; }
      const win = s.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: draw ? X.full : X.five }), s.line ? 1300 : 400);
    }
    function aiMove() {
      busy = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m === undefined || m === null || m < 0) { try { m = E.think(RULE, mvs, ctx.level).move; } catch (e) { m = -1; } }   // the worker failed: the same search on the page
        later(() => {
          if (id !== jid || over) return;
          if (m < 0 || !pos.isLegal(m)) { busy = false; hud(''); return; }
          const w = play(m, ai); later(next, w + 60);
        }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? -1 : r.move); };
      worker.onerror = () => { worker = null; reply(-1); };
      worker.postMessage({ type: 'think', id, rule: RULE, start: null, moves: mvs, level: ctx.level });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const fi = p.x / c + 7, fj = p.z / c + 7, i = Math.round(fi), j = Math.round(fj);
      if (i < 0 || i > 14 || j < 0 || j > 14 || Math.hypot(fi - i, fj - j) > .6) return -1;
      return (14 - j) * 15 + i;
    }
    function onClick(e) {
      if (over || busy || !pos || T3.wasDrag()) return;
      if (!pvp && pos.side !== human) return;
      const m = cellOf(e); if (m < 0 || pos.at(m)) return;
      if (!pos.isLegal(m)) {
        if (pos.renju && pos.fresh && pos.ply <= 2 && !pos.openingOk(E.M2I[m])) toast(X.o[pos.ply]);
        else { const f = pos.side === 1 ? pos.forbidden(m) : 0; if (f) toast(X.f.replace('{k}', X.k[f - 1])); }
        pachi(.6); return;
      }
      busy = true; const w = play(m, pos.side); hud(''); later(next, w + 60);
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; jid++;
      Object.values(st).forEach(g => stones.remove(g)); for (const k in st) delete st[k];
      moves = []; pos = E.replay(RULE, []); over = false; busy = true;
      hud(''); later(next, 650);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; worker = new Worker(BASE + 'engine.js' + VER); begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: m => { const [x, z] = xz(m); return T3.project(x, z, Y); },
      state: () => ({ hint: hintM, moves: moves.slice(), side: pos && pos.side, human, over, busy, pvp, stones: Object.keys(st).length }),
    };
    window.Atlas3D.gomoku._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!pos && !over && !busy && (pvp || pos.side === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (1 black, 2 white) loses
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
        moves.splice(moves.length - undoN()).forEach(m => { const g = st[m]; if (g) { stones.remove(g); delete st[m]; } });
        pos = E.replay(RULE, moves); ply++; kick(300);
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
            const m = r.error ? -1 : r.move; if (!(m >= 0) || !pos.isLegal(m)) return res(false);
            hintM = m;
            const g = GB.tapMark(c), [x, z] = xz(m); g.position.set(x, Y, z); marks.add(g);   // the same vivid "here" marker as the first move's
            pulsing.push(g); if (!pulseOn) { pulseOn = true; pulse(); }
            later(() => { pulsing = pulsing.filter(q => q !== g); kick(); }, 2600);   // it pulses a few times, then stays lit (no idle loop)
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, rule: RULE, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)) });
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
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.gomoku._dbg === dbg) delete window.Atlas3D.gomoku._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {"ja":{"kyu":"{n}級","dan":["初段","二段","三段","四段","五段"],"lvd":["入門：四や三を見落とすことがある","初級：数手先まで読む","中級：四追い・三の攻めを読み切る","有段：深い読みと形勢判断（考える時間が長め）"]},"en":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"lvd":["Beginner: sometimes misses fours and threes","Novice: reads a few moves ahead","Intermediate: solves attacks with fours and threes","Dan: deep search and judgement (thinks longer)"]},"zh":{"kyu":"{n}级","dan":["初段","二段","三段","四段","五段"],"lvd":["入门：有时会漏看冲四和活三","初级：会往后算几步","中级：能算清连续冲四和活三的进攻","段位：深入计算与形势判断（思考时间较长）"]},"ko":{"kyu":"{n}급","dan":["초단","2단","3단","4단","5단"],"lvd":["입문: 사·삼을 가끔 놓침","초급: 몇 수 앞을 읽음","중급: 사와 삼의 공격을 끝까지 읽음","유단: 깊은 수읽기와 형세 판단(생각 시간이 김)"]},"es":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"lvd":["Iniciación: a veces no ve cuatros y treses","Principiante: calcula unas jugadas","Intermedio: resuelve ataques con cuatros y treses","Dan: cálculo profundo y buen criterio (piensa más)"]},"fr":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"lvd":["Initiation : rate parfois des quatre et des trois","Débutant : calcule quelques coups","Intermédiaire : résout les attaques par quatre et trois","Dan : calcul profond et jugement (réfléchit plus longtemps)"]},"pt":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"lvd":["Iniciação: às vezes não vê quatros e três","Iniciante: calcula alguns lances","Intermediário: resolve ataques com quatros e três","Dan: cálculo profundo e avaliação (pensa mais)"]},"de":{"kyu":"{n}. Kyu","dan":["1. Dan","2. Dan","3. Dan","4. Dan","5. Dan"],"lvd":["Einstieg: übersieht manchmal Vieren und Dreien","Anfänger: rechnet ein paar Züge","Mittel: löst Angriffe mit Vieren und Dreien","Dan: tiefe Suche und Bewertung (denkt länger)"]},"hi":{"kyu":"{n} क्यू","dan":["1 दान","2 दान","3 दान","4 दान","5 दान"],"lvd":["शुरुआत: कभी-कभी चार और तीन चूक जाता है","नौसिखिया: कुछ चालें आगे सोचता है","मध्यम: चार और तीन के हमले पूरी तरह पढ़ता है","दान: गहरी गणना और आकलन (ज़्यादा सोचता है)"]},"ar":{"kyu":"{n} كيو","dan":["1 دان","2 دان","3 دان","4 دان","5 دان"],"lvd":["مبتدئ جدًا: يفوّت أحيانًا الرباعيات والثلاثيات","مبتدئ: يحسب بضع نقلات","متوسط: يحل هجمات الرباعيات والثلاثيات","دان: حساب عميق وتقدير جيد (يفكر وقتًا أطول)"]}};
  const RATING = [0, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 2000, 2200, 2400, 2600, 2800];   // gomoku RT_LV (rated games)
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
  function levelInfo(n, lang) {   // n = 1..20 (the game's level: 15 kyu … 5 dan)
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    const name = n <= 15 ? L.kyu.replace('{n}', 16 - n) : L.dan[n - 16];
    return { name, desc: L.lvd[n <= 3 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.gomoku = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };   // table: start() plays on the chabudai itself
})();
